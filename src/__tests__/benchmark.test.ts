// ============================================================================
// Benchmark machinery: fixture labels, metric functions, summary rendering.
// (The benchmark itself calls the live model and is run with
// `npm run benchmark:apertus`, not as part of the test suite.)
// ============================================================================

import { describe, expect, it } from 'vitest';
import { CASES } from '../../benchmarks/fixtures/cases';
import { categorizeReason, explainCompleteness, groundingRate, languageMatches, letterCoverage, median, percentile } from '../../benchmarks/metrics';
import { modelStats, renderSummary, type BenchmarkFile, type CaseResult } from '../../benchmarks/summary';
import { analyzeAutomation, extractDecision } from '@/lib/analyze';
import { detectLanguage } from '@/apertus/language';
import { buildFactSheet, letterRequestsFromBody } from '@/apertus/factSheet';
import { generateChallengeLetter } from '@/lib/challengeGenerator';
import type { ReceiptSentence } from '@/apertus/types';

describe('Benchmark fixtures', () => {
  it('has 20 cases, 5 per language, unique ids', () => {
    expect(CASES).toHaveLength(20);
    for (const lang of ['en', 'de', 'fr', 'it']) expect(CASES.filter((c) => c.language === lang)).toHaveLength(5);
    expect(new Set(CASES.map((c) => c.id)).size).toBe(20);
  });

  it('covers every automation status and every jurisdiction', () => {
    expect(new Set(CASES.map((c) => c.expectedStatus))).toEqual(new Set(['confirmed_automated', 'possibly_automated', 'not_established', 'human_indicated']));
    expect(new Set(CASES.map((c) => c.jurisdiction))).toEqual(new Set(['UK', 'EU', 'CH', 'US', 'GENERAL']));
  });

  it('every hand label is what REDRESS derives from the notice (EN) or its faithful reference translation', () => {
    for (const c of CASES) {
      if (c.language !== 'en') expect(c.referenceEnglish, c.id).toBeDefined();
      const status = analyzeAutomation(extractDecision(c.referenceEnglish ?? c.notice)).status;
      expect(status, c.id).toBe(c.expectedStatus);
    }
  });

  it('notices and questions are detected in their own language', () => {
    for (const c of CASES) {
      expect(detectLanguage(c.notice), c.id).toBe(c.language);
      expect(detectLanguage(c.question), c.id).toBe(c.language);
    }
  });

  it('contains no real-looking e-mail domains or credentials', () => {
    const all = JSON.stringify(CASES);
    for (const email of all.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? []) expect(email).toMatch(/\.example$/);
    expect(all).not.toMatch(/Bearer|api[_-]?key|sk-/i);
  });
});

const s = (text: string, cites: string[], verdict: 'verified' | 'blocked' = 'verified', reasons: string[] = [], framing = false): ReceiptSentence => ({
  text,
  cites,
  verdict,
  reasons,
  framing,
});

describe('Benchmark metrics', () => {
  const extracted = extractDecision(CASES[0].notice);
  const automation = analyzeAutomation(extracted);
  const letter = generateChallengeLetter({ extracted, automation, jurisdiction: 'UK', userName: 'T', caseId: 'RP-1' }).body;
  const sheet = buildFactSheet({ extracted, automation, jurisdiction: 'UK', letterRequests: letterRequestsFromBody(letter) });

  it('categorises every Receipts reason', () => {
    expect(categorizeReason('Cites sources that do not exist: G9')).toBe('fabricated_citation');
    expect(categorizeReason('No source cited — the sentence is not backed by the evidence')).toBe('no_citation');
    expect(categorizeReason('Contains numbers not found in the cited sources: 30')).toBe('unsupported_number');
    expect(categorizeReason('Quotes text that does not appear in the cited sources: "x"')).toBe('unsupported_quote');
    expect(categorizeReason('Mentions GDPR without citing a verified legal reference for the selected jurisdiction')).toBe('unsupported_law');
    expect(categorizeReason('Cites "Art. 99", which is not in a cited legal reference')).toBe('unsupported_law');
    expect(categorizeReason('States that automation or AI was used, but cites no evidence of it')).toBe('unsupported_automation_claim');
    expect(categorizeReason('States that a person made or reviewed the decision, but cites no evidence of it')).toBe('unsupported_human_claim');
    expect(categorizeReason('Claims the decision was solely automated — the evidence does not establish that')).toBe('unsupported_solely_claim');
    expect(categorizeReason('States a legal conclusion or guarantee ("unlawful") — REDRESS never does this')).toBe('legal_conclusion');
  });

  it('grounding rate ignores framing lines and counts fabricated citations as ungrounded', () => {
    expect(groundingRate([s('Hi', [], 'verified', [], true), s('a', ['D1']), s('b', ['G9'], 'blocked', ['Cites sources that do not exist: G9'])])).toBe(0.5);
    expect(groundingRate([s('Hi', [], 'verified', [], true)])).toBeNull();
  });

  it('explanation completeness counts the four parts from verified sentences only', () => {
    expect(explainCompleteness([s('a', ['D1']), s('b', ['E1']), s('c', ['G1']), s('d', ['S1'])], sheet)).toBe(1);
    expect(explainCompleteness([s('a', ['D1']), s('b', ['E1'], 'blocked', ['x'])], sheet)).toBe(0.25);
  });

  it('letter coverage is the share of REDRESS requests included', () => {
    const qs = sheet.facts.filter((f) => f.kind === 'question').map((f) => f.id);
    expect(letterCoverage([s('a', [qs[0]])], sheet)).toBeCloseTo(1 / qs.length);
  });

  it('language match ignores quoted notice text and treats unclear output as a mismatch', () => {
    expect(languageMatches([s('Das Schreiben sagt nicht, ob eine Person entschieden hat.', ['G1'])], 'de')).toBe(true);
    expect(languageMatches([s('The notice says: «Ihr Antrag wurde von unserem automatisierten System geprüft und abgelehnt.»', ['E1'])], 'en')).toBe(true);
    expect(languageMatches([s('The notice does not say whether a person decided.', ['G1'])], 'de')).toBe(false);
    expect(languageMatches([s('OK.', [])], 'de')).toBe(false);
  });

  it('median and percentile', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 90)).toBe(9);
    expect(median([])).toBeNull();
  });
});

describe('Benchmark summary', () => {
  it('aggregates per model and never reports a model that was not run', () => {
    const file: BenchmarkFile = {
      meta: { startedAt: 't0', finishedAt: 't1', endpointHost: 'host', models: ['m8', 'm70'], runs: 1, cases: 1, commit: 'abc', settings: 's' },
      results: ['m8', 'm70'].map((model, i) => ({
        model,
        run: 1,
        caseId: 'de-01',
        language: 'de' as const,
        jurisdiction: 'CH' as const,
        expectedStatus: 'confirmed_automated' as const,
        status: i === 0 ? ('not_established' as const) : ('confirmed_automated' as const),
        statusMatch: i === 1,
        translation: { ok: true, ms: 1000, droppedSentences: 0 },
        tasks: [
          { task: 'explain' as const, ok: true, parseQuality: i === 0 ? ('repaired' as const) : ('valid' as const), ms: 2000, claims: 4, verified: 3, blocked: 1, groundingRate: 1, blockCategories: { legal_conclusion: 1 }, languageMatch: true, completeness: 1, sentences: [] },
          { task: 'letter' as const, ok: i === 1, parseQuality: i === 1 ? ('valid' as const) : undefined, ms: 3000, claims: i === 1 ? 5 : 0, verified: i === 1 ? 5 : 0, blocked: 0, groundingRate: null, blockCategories: {}, languageMatch: null, completeness: null, sentences: [], fallbackReason: i === 0 ? 'bad JSON' : undefined },
        ],
        calls: 3,
        failedCalls: 0,
        completionTokens: 900,
      })) as CaseResult[],
    };
    const m8 = modelStats(file, 'm8');
    expect(m8.taskSuccess).toBe(0.5);
    expect(m8.verifiedRate).toBe(0.75);
    expect(m8.statusAgreementTranslated).toBe(0);
    expect(m8.jsonValid).toBe(0);
    // 3 model outputs (translation + 2 tasks): 1 repaired, 1 fallback, translation quality not recorded.
    expect(m8.jsonRepaired).toBeCloseTo(1 / 3);
    expect(modelStats(file, 'm70').verifiedRate).toBeCloseTo(8 / 9);
    const md = renderSummary(file);
    expect(md).toContain('`m8`');
    expect(md).toContain('expected confirmed_automated, got not_established');
    expect(md).toContain('bad JSON');
    expect(md).not.toContain('`m3`');
  });
});
