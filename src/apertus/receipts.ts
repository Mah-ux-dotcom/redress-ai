// ============================================================================
// REDRESS × Apertus — Receipts verifier
//
// Deterministic checks on every sentence a language model writes. A sentence
// is VERIFIED only if it cites existing facts and passes every check below;
// otherwise it is BLOCKED and shown struck through with the reason.
//
//   1. Citations   — must cite at least one known fact (framing lines excepted)
//   2. Numbers     — every number must appear in a cited fact
//   3. Quotes      — quoted text must appear verbatim in a cited fact / quote
//   4. Law         — statute names and article numbers must appear in a cited
//                    legal reference for the selected jurisdiction
//   5. Automation  — asserting automation / AI requires cited evidence of it
//   6. Solely      — asserting a solely automated decision requires the
//                    engine to have found that
//   7. Overclaims  — legal conclusions and guarantees are never allowed
//
// Limits (stated in the UI too): this checks facts, numbers, quotes, law and
// automation claims. It cannot judge tone or every nuance of meaning.
// ============================================================================

import type { AutomationAnalysis } from '@/types';
import { automationSupportIds } from './factSheet';
import {
  ARTICLE_REFS,
  assertsAutomation,
  HEDGE_MARKERS,
  LAW_NAMES,
  OVERCLAIM,
  SOLELY_ASSERTION,
} from './language';
import type { DraftSentence, FactSheet, ReceiptSentence, ReceiptsSummary } from './types';

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Quoted spans in any of the quote styles used in EN/DE/FR/IT. */
function quotedSpans(text: string): string[] {
  const spans: string[] = [];
  const re = /"([^"]{4,})"|“([^”]{4,})”|„([^“”]{4,})[“”]|«\s?([^»]{4,}?)\s?»/g;
  for (const m of text.matchAll(re)) spans.push((m[1] ?? m[2] ?? m[3] ?? m[4]).trim());
  return spans;
}

/** Numbers in a sentence, ignoring a leading list marker such as "1." or "2)". */
function numbersIn(text: string): string[] {
  const body = text.replace(/^\s*\d+[.)]\s+/, '');
  return body.match(/\d+/g) ?? [];
}

export function verifySentence(
  sentence: DraftSentence,
  sheet: FactSheet,
  automation: AutomationAnalysis,
): ReceiptSentence {
  const reasons: string[] = [];
  const text = sentence.text.trim();
  const cited = (sentence.cites ?? []).map((c) => c.trim().toUpperCase()).filter(Boolean);
  const known = cited.filter((c) => sheet.byId[c]);
  const unknown = cited.filter((c) => !sheet.byId[c]);
  const citedText = known.map((id) => `${sheet.byId[id].text} ${sheet.byId[id].sourceQuote ?? ''}`).join(' \n ');
  const citedNorm = norm(citedText);
  const hedged = HEDGE_MARKERS.test(text);

  // 1. Citations
  if (unknown.length) reasons.push(`Cites sources that do not exist: ${unknown.join(', ')}`);
  if (sentence.framing) {
    if (text.length > 140) reasons.push('Too long for a greeting or sign-off line');
  } else if (known.length === 0) {
    reasons.push('No source cited — the sentence is not backed by the evidence');
  }

  // 2. Numbers
  const citedNumbers = new Set(citedText.match(/\d+/g) ?? []);
  const badNumbers = [...new Set(numbersIn(text))].filter((n) => !citedNumbers.has(n));
  if (badNumbers.length) reasons.push(`Contains numbers not found in the cited sources: ${badNumbers.join(', ')}`);

  // 3. Quotes
  for (const q of quotedSpans(text)) {
    if (!citedNorm.includes(norm(q))) reasons.push(`Quotes text that does not appear in the cited sources: "${q}"`);
  }

  // 4. Law
  const laws = [...new Set(text.match(LAW_NAMES) ?? [])];
  const lawFactText = norm(known.filter((id) => /^[LQ]/.test(id)).map((id) => sheet.byId[id].text).join(' '));
  for (const law of laws) {
    if (!lawFactText.includes(norm(law))) {
      reasons.push(`Mentions ${law} without citing a verified legal reference for the selected jurisdiction`);
    }
  }
  for (const ref of new Set(text.match(ARTICLE_REFS) ?? [])) {
    const num = ref.match(/\d+(?:\.\d+)?/)?.[0];
    const lawNums = new Set(lawFactText.match(/\d+(?:\.\d+)?/g) ?? []);
    if (!num || !lawNums.has(num)) reasons.push(`Cites "${ref}", which is not in a cited legal reference`);
  }

  // 5. Automation assertions
  if (assertsAutomation(text) && !hedged) {
    const support = automationSupportIds(sheet, automation);
    if (!known.some((id) => support.has(id))) {
      reasons.push('States that automation or AI was used, but cites no evidence of it');
    }
  }

  // 6. Solely automated
  if (SOLELY_ASSERTION.test(text) && !hedged && automation.involvement !== 'solely_automated') {
    reasons.push('Claims the decision was solely automated — the evidence does not establish that');
  }

  // 7. Overclaims
  const over = text.match(OVERCLAIM);
  if (over) reasons.push(`States a legal conclusion or guarantee ("${over[0].trim()}") — REDRESS never does this`);

  return { ...sentence, text, cites: known, verdict: reasons.length ? 'blocked' : 'verified', reasons };
}

export function verifyAll(
  sentences: DraftSentence[],
  sheet: FactSheet,
  automation: AutomationAnalysis,
): { sentences: ReceiptSentence[]; summary: ReceiptsSummary } {
  const checked = sentences.map((s) => verifySentence(s, sheet, automation));
  const verified = checked.filter((s) => s.verdict === 'verified').length;
  return { sentences: checked, summary: { checked: checked.length, verified, blocked: checked.length - verified } };
}
