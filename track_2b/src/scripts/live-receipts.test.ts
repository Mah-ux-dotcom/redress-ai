// Live check against a running proxy (npm run proxy). Skipped unless LIVE_APERTUS=1.
import { it } from 'vitest';
import { HttpApertusClient } from '@/apertus/client';
import { analyzeNotice, generateGrounded, translateNotice } from '@/apertus/pipeline';
import { buildFactSheet, letterRequestsFromBody } from '@/apertus/factSheet';
import { generateChallengeLetter } from '@/lib/challengeGenerator';
import { DEMO_CASE, DEMO_CASE_DE, DEMO_PRESET_TEXTS } from '@/data/demoCase';
import type { JurisdictionCode } from '@/types';
import type { LanguageCode } from '@/apertus/types';

const live = process.env.LIVE_APERTUS === '1' ? it : it.skip;

live('live Apertus through Receipts', async () => {
  const client = new HttpApertusClient('http://127.0.0.1:8787/api/apertus');
  const runs: [string, string, JurisdictionCode | null, LanguageCode, 'explain' | 'letter'][] = [
    ['NovaCredit EN', DEMO_CASE.decisionText, 'UK', 'en', 'explain'],
    ['NovaCredit EN', DEMO_CASE.decisionText, 'UK', 'de', 'letter'],
    ['Job (not established)', DEMO_PRESET_TEXTS[3].text, null, 'fr', 'explain'],
    ['NovaCredit Schweiz DE', DEMO_CASE_DE.decisionText, 'EU', 'en', 'explain'],
    ['NovaCredit Schweiz DE', DEMO_CASE_DE.decisionText, 'EU', 'de', 'letter'],
    ['Insurance (human)', DEMO_PRESET_TEXTS[2].text, 'UK', 'it', 'explain'],
  ];
  for (const [name, text, j, lang, task] of runs) {
    const t0 = Date.now();
    let translation = null;
    try {
      translation = await translateNotice(client, text);
    } catch (e) {
      console.log(name, 'TRANSLATION FAILED', (e as Error).message);
    }
    const { extracted, automation } = analyzeNotice(text, translation);
    const letter = generateChallengeLetter({ extracted, automation, jurisdiction: j, userName: 'Test User', caseId: 'RP-1' }).body;
    const sheet = buildFactSheet({ extracted, automation, jurisdiction: j, letterRequests: letterRequestsFromBody(letter) });
    const out = await generateGrounded({ client, task, language: lang, sheet, extracted, automation, jurisdiction: j, ruleBasedLetter: letter, userName: 'Test User' });
    console.log(`\n=== ${name} | ${task} in ${lang} | status ${automation.status} | translated: ${!!translation} | ${out.producedBy} ${out.modelLabel} | ${JSON.stringify(out.summary)} | ${Date.now() - t0}ms`);
    if (out.fallbackReason) console.log('FALLBACK:', out.fallbackReason);
    for (const s of out.sentences) console.log(s.verdict === 'verified' ? '  OK ' : '  XX ', s.text, `[${s.cites.join(',')}]`, s.reasons.join(' | '));
  }
}, 600_000);
