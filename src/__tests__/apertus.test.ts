// ============================================================================
// REDRESS × Apertus — language layer, Receipts and fallback tests
// ============================================================================

import { describe, expect, it, vi } from 'vitest';
import { analyzeAutomation, extractDecision } from '@/lib/analyze';
import { generateChallengeLetter } from '@/lib/challengeGenerator';
import { buildFactSheet, letterRequestsFromBody } from '@/apertus/factSheet';
import { verifySentence } from '@/apertus/receipts';
import { analyzeNotice, generateGrounded, translateNotice } from '@/apertus/pipeline';
import { MockApertusClient } from '@/apertus/mockClient';
import { HttpApertusClient, ApertusUnavailableError, createApertusClient } from '@/apertus/client';
import { detectLanguage, LANGUAGE_CODES } from '@/apertus/language';
import { buildGenerationMessages } from '@/apertus/prompts';
import { DEMO_CASE, DEMO_CASE_DE, DEMO_PRESET_TEXTS } from '@/data/demoCase';
import type { ApertusClient, ChatMessage } from '@/apertus/types';
import type { JurisdictionCode } from '@/types';

const NOT_ESTABLISHED = DEMO_PRESET_TEXTS[3].text; // job application, no automation evidence
const HUMAN = DEMO_PRESET_TEXTS[2].text;

function setup(text: string, jurisdiction: JurisdictionCode | null = 'UK') {
  const extracted = extractDecision(text);
  const automation = analyzeAutomation(extracted);
  const letter = generateChallengeLetter({ extracted, automation, jurisdiction, userName: 'Test User', caseId: 'RP-1' }).body;
  const sheet = buildFactSheet({ extracted, automation, jurisdiction, letterRequests: letterRequestsFromBody(letter) });
  return { extracted, automation, letter, sheet, jurisdiction };
}

/** A fake model that returns a fixed response. */
function fakeClient(content: string | (() => Promise<string>)): ApertusClient {
  return {
    kind: 'apertus',
    label: 'Fake Apertus',
    complete: typeof content === 'string' ? async () => content : content,
  };
}

describe('Language detection', () => {
  it('detects the four supported languages', () => {
    expect(detectLanguage(DEMO_CASE.decisionText)).toBe('en');
    expect(detectLanguage(DEMO_CASE_DE.decisionText)).toBe('de');
    expect(detectLanguage("Madame, votre demande de crédit a été refusée. Nous vous remercions pour votre confiance et restons à votre disposition.")).toBe('fr');
    expect(detectLanguage('Gentile cliente, la sua richiesta di credito non è stata accolta. Per domande la preghiamo di contattare il servizio clienti.')).toBe('it');
  });
});

describe('Receipts verifier — each check', () => {
  const { sheet, automation } = setup(DEMO_CASE.decisionText);
  const v = (text: string, cites: string[], framing = false) => verifySentence({ text, cites, framing }, sheet, automation);

  it('verifies a sentence that cites real facts', () => {
    expect(v('NovaCredit Loan Services sent you a decision dated 15 September 2026.', ['D1', 'D3']).verdict).toBe('verified');
  });
  it('blocks sentences with no citation or with invented citations', () => {
    expect(v('Your application was rejected.', []).reasons.join()).toMatch(/No source cited/);
    expect(v('Your application was rejected.', ['Z9']).reasons.join()).toMatch(/do not exist: Z9/);
  });
  it('blocks numbers that are not in the cited facts', () => {
    expect(v('You have 30 days to appeal.', ['D3']).reasons.join()).toMatch(/numbers not found.*30/);
    expect(v('1. Ask for the reasons.', ['S2']).verdict).toBe('verified'); // list markers are ignored
  });
  it('blocks quotes that do not appear in the cited evidence', () => {
    expect(v('The notice says: "Your application was assessed using our automated scoring system."', ['E2']).verdict).toBe('verified');
    expect(v('The notice says: "We used a neural network to reject you."', ['E2']).reasons.join()).toMatch(/Quotes text that does not appear/);
  });
  it('blocks laws and articles not in a cited legal reference', () => {
    expect(v('Depending on the facts, UK GDPR Art. 22 may be relevant.', ['L1']).verdict).toBe('verified');
    expect(v('Under the FCRA you may get a free report.', ['L1']).reasons.join()).toMatch(/Mentions FCRA/);
    expect(v('Article 99 of the UK GDPR may be relevant.', ['L1']).reasons.join()).toMatch(/Article 99/);
  });
  it('blocks solely-automated claims the engine did not establish', () => {
    expect(v('This decision was made solely by a machine.', ['D8']).reasons.join()).toMatch(/solely automated/);
    expect(v('It is not established whether this decision was made solely by a machine.', ['G1']).verdict).toBe('verified');
  });
  it('blocks legal conclusions in every language', () => {
    for (const t of [
      'This decision is unlawful.',
      'Dieser Entscheid ist rechtswidrig.',
      'Cette décision est illégale.',
      'Questa decisione è illegittima.',
      'You will win this case.',
    ]) {
      expect(v(t, ['D8']).reasons.join(), t).toMatch(/legal conclusion or guarantee/);
    }
  });
  it('framing lines need no citation but cannot carry claims', () => {
    expect(v('Dear Sir or Madam,', [], true).verdict).toBe('verified');
    expect(v('Please reply within 7 days.', [], true).reasons.join()).toMatch(/numbers/);
  });

  it('blocks automation claims when automation is not established — and allows the question', () => {
    const ne = setup(NOT_ESTABLISHED);
    const check = (text: string) => verifySentence({ text, cites: ['D8'] }, ne.sheet, ne.automation);
    for (const t of [
      "The organisation's AI system made this decision.",
      'Das KI-System der Organisation hat entschieden.',
      "Le système d'IA a pris cette décision.",
      'Un algoritmo ha preso questa decisione.',
    ]) {
      expect(check(t).reasons.join(), t).toMatch(/cites no evidence/);
    }
    expect(check('The notice does not say whether an automated system or AI was used.').verdict).toBe('verified');
    expect(check('Fragen Sie, ob ein automatisiertes System verwendet wurde.').verdict).toBe('verified');
    expect(check('REDRESS classifies the automation status as: Not Established.').verdict).toBe('verified');
    // "ai" is an ordinary Italian word ("ai sensi") — not an AI claim.
    expect(check("Vogliate rispondere ai sensi della procedura interna.").verdict).toBe('verified');
  });
});

describe('Stand-in model end to end', () => {
  const cases: [string, string, JurisdictionCode | null][] = [
    ['confirmed (UK)', DEMO_CASE.decisionText, 'UK'],
    ['not established (unknown jurisdiction)', NOT_ESTABLISHED, null],
    ['human indicated (EU)', HUMAN, 'EU'],
  ];
  for (const [name, text, jurisdiction] of cases) {
    for (const lang of LANGUAGE_CODES) {
      it(`explain + letter: ${name} in ${lang} — only the planted sentences are blocked`, async () => {
        const ctx = setup(text, jurisdiction);
        const client = new MockApertusClient({ demonstrateBlocking: true });
        for (const task of ['explain', 'letter'] as const) {
          const out = await generateGrounded({ client, task, language: lang, ...ctx, ruleBasedLetter: ctx.letter });
          expect(out.producedBy).toBe('mock');
          expect(out.summary.verified).toBeGreaterThan(4);
          const blocked = out.sentences.filter((s) => s.verdict === 'blocked');
          expect(blocked.length).toBe(task === 'explain' ? 2 : 1);
          for (const b of blocked) expect(b.reasons.length).toBeGreaterThan(0);
        }
      });
    }
  }

  it('with blocking demonstration off, everything verifies', async () => {
    const ctx = setup(DEMO_CASE.decisionText, 'EU');
    const client = new MockApertusClient({ demonstrateBlocking: false });
    for (const task of ['explain', 'letter'] as const) {
      const out = await generateGrounded({ client, task, language: 'it', ...ctx, ruleBasedLetter: ctx.letter });
      expect(out.summary.blocked).toBe(0);
    }
  });

  it('is clearly labelled as a stand-in, never as Apertus', () => {
    expect(new MockApertusClient().label).toMatch(/Stand-in.*not Apertus/);
  });
});

describe('Multilingual notice translation', () => {
  it('translates the German demo and keeps the engine as source of truth', async () => {
    const client = new MockApertusClient();
    const tr = await translateNotice(client, DEMO_CASE_DE.decisionText);
    expect(tr?.sourceLanguage).toBe('de');
    const { extracted, automation } = analyzeNotice(DEMO_CASE_DE.decisionText, tr);
    expect(automation.status).toBe('confirmed_automated');
    expect(extracted.organization).toBe('NovaCredit (Schweiz) AG');
    expect(extracted.evidenceReferences.join()).toMatch(/NCS-2026-11402/);
    // Every evidence signal points back to a verbatim German sentence.
    for (const s of automation.signals) {
      expect(s.originalQuote).toBeDefined();
      expect(DEMO_CASE_DE.decisionText).toContain(s.originalQuote!);
    }
  });

  it('does not translate English notices', async () => {
    const spy = vi.fn();
    expect(await translateNotice(fakeClient(spy as never), DEMO_CASE.decisionText)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('a translation cannot add automation evidence that is not in the original', async () => {
    const notice = 'Sehr geehrte Frau Muster\n\nIhr Antrag wurde leider abgelehnt.\n\nFreundliche Grüsse\nBeispiel AG';
    const client = fakeClient(
      JSON.stringify({
        sentences: [
          { source: 'Sehr geehrte Frau Muster', english: 'Dear Ms Muster' },
          // The model "translates in" automation that the German does not say.
          { source: 'Ihr Antrag wurde leider abgelehnt.', english: 'Unfortunately your application was rejected by our automated decision system.' },
          { source: 'Freundliche Grüsse', english: 'Regards,' },
        ],
      }),
    );
    const tr = await translateNotice(client, notice);
    const { automation } = analyzeNotice(notice, tr);
    expect(automation.status).toBe('not_established');
    const neutral = automation.signals.find((s) => s.type === 'neutral');
    expect(neutral?.text).toMatch(/only in the translation/);
  });

  it('discards translated sentences whose source is not in the original notice', async () => {
    const notice = 'Sehr geehrte Frau Muster\n\nIhr Antrag wurde leider abgelehnt.';
    const client = fakeClient(
      JSON.stringify({
        sentences: [
          { source: 'Ihr Antrag wurde leider abgelehnt.', english: 'Unfortunately your application was rejected.' },
          { source: 'Wir haben KI verwendet.', english: 'We used AI.' },
        ],
      }),
    );
    const tr = await translateNotice(client, notice);
    expect(tr?.droppedSentences).toBe(1);
    expect(tr?.englishText).not.toMatch(/We used AI/);
  });

  it('the stand-in refuses to translate notices it has no translation for', async () => {
    await expect(translateNotice(new MockApertusClient(), 'Sehr geehrter Herr Muster, Ihr Antrag wurde abgelehnt. Wir danken Ihnen für die Geduld.')).rejects.toThrow(
      /stand-in model can only translate/,
    );
  });
});

describe('Fallback to rule-based REDRESS', () => {
  const ctx = setup(DEMO_CASE.decisionText);

  it('falls back when the model throws', async () => {
    const client = fakeClient(async () => {
      throw new ApertusUnavailableError('Apertus timed out');
    });
    const out = await generateGrounded({ client, task: 'explain', language: 'de', ...ctx, ruleBasedLetter: ctx.letter });
    expect(out.producedBy).toBe('rule_based_fallback');
    expect(out.fallbackReason).toMatch(/timed out/);
    expect(out.sentences.map((s) => s.text).join('\n')).toMatch(/WHAT HAPPENED/);
  });

  it('falls back when the model returns something that is not JSON', async () => {
    const out = await generateGrounded({ client: fakeClient('Sure! Here is your letter…'), task: 'letter', language: 'fr', ...ctx, ruleBasedLetter: ctx.letter });
    expect(out.producedBy).toBe('rule_based_fallback');
    expect(out.sentences.map((s) => s.text).join('\n')).toContain('Request for Review of Decision');
  });

  it('falls back when language-model features are off', async () => {
    expect(createApertusClient('off')).toBeNull();
    const out = await generateGrounded({ client: null, task: 'explain', language: 'en', ...ctx, ruleBasedLetter: ctx.letter });
    expect(out.producedBy).toBe('rule_based_fallback');
  });

  it('a real model response is parsed and verified the same way', async () => {
    const content = '```json\n{"sentences":[{"text":"NovaCredit Loan Services refused your loan.","cites":["D1","D2"]},{"text":"This is illegal.","cites":["D8"]}]}\n```';
    const out = await generateGrounded({ client: fakeClient(content), task: 'explain', language: 'en', ...ctx, ruleBasedLetter: ctx.letter });
    expect(out.producedBy).toBe('apertus');
    expect(out.summary).toEqual({ checked: 2, verified: 1, blocked: 1 });
  });
});

describe('HttpApertusClient (talks to the REDRESS proxy)', () => {
  const messages: ChatMessage[] = [{ role: 'user', content: 'hi' }];

  it('posts to the proxy and returns content', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ content: 'hello', model: 'apertus-8b' }), { status: 200 }));
    const client = new HttpApertusClient('/api/apertus', fetchImpl as unknown as typeof fetch);
    expect(await client.complete(messages)).toBe('hello');
    expect(fetchImpl).toHaveBeenCalledWith('/api/apertus/chat', expect.objectContaining({ method: 'POST' }));
    expect(client.label).toBe('Apertus (apertus-8b)');
  });

  it('throws ApertusUnavailableError on HTTP errors and network failures', async () => {
    const bad = new HttpApertusClient('/api/apertus', (async () => new Response('{}', { status: 503 })) as unknown as typeof fetch);
    await expect(bad.complete(messages)).rejects.toBeInstanceOf(ApertusUnavailableError);
    const down = new HttpApertusClient('/api/apertus', (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch);
    await expect(down.complete(messages)).rejects.toThrow(/could not be reached/);
  });
});

describe('Prompts carry only the fact sheet', () => {
  it('includes rules, the facts and the requested language', () => {
    const ctx = setup(DEMO_CASE.decisionText, 'UK');
    const msgs = buildGenerationMessages('explain', 'it', ctx.sheet);
    const all = msgs.map((m) => m.content).join('\n');
    expect(all).toMatch(/Use ONLY the facts provided/);
    expect(all).toMatch(/Italian/);
    expect(all).toContain('"id": "E1"');
  });
});
