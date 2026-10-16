// ============================================================================
// REDRESS × Apertus benchmark — metric functions (pure, unit-tested)
// ============================================================================

import { detectLanguage } from '@/apertus/language';
import type { FactSheet, LanguageCode, ReceiptSentence } from '@/apertus/types';

/** Why Receipts blocked a sentence, as a stable category name. */
export type BlockCategory =
  | 'fabricated_citation'
  | 'no_citation'
  | 'unsupported_number'
  | 'unsupported_quote'
  | 'unsupported_law'
  | 'unsupported_automation_claim'
  | 'unsupported_human_claim'
  | 'unsupported_solely_claim'
  | 'legal_conclusion'
  | 'framing_too_long'
  | 'malformed_output'
  | 'other';

const REASON_PATTERNS: [RegExp, BlockCategory][] = [
  [/^Cites sources that do not exist/, 'fabricated_citation'],
  [/^No source cited/, 'no_citation'],
  [/^Contains numbers not found/, 'unsupported_number'],
  [/^Quotes text that does not appear/, 'unsupported_quote'],
  [/^Mentions .* without citing a verified legal reference|^Cites ".*", which is not in a cited legal reference/, 'unsupported_law'],
  [/^States that automation or AI was used/, 'unsupported_automation_claim'],
  [/^States that a person made or reviewed/, 'unsupported_human_claim'],
  [/^Claims the decision was solely automated/, 'unsupported_solely_claim'],
  [/^States a legal conclusion or guarantee/, 'legal_conclusion'],
  [/^Too long for a greeting/, 'framing_too_long'],
  [/^Malformed model output/, 'malformed_output'],
];

export function categorizeReason(reason: string): BlockCategory {
  return REASON_PATTERNS.find(([re]) => re.test(reason))?.[1] ?? 'other';
}

/** Non-framing sentences — the factual claims Receipts actually checks. */
export function claims(sentences: ReceiptSentence[]): ReceiptSentence[] {
  return sentences.filter((s) => !(s.framing && s.verdict === 'verified'));
}

/**
 * Share of checked claims whose citations all exist (whether or not another
 * check blocked them). Measures whether the model grounds claims in real sources.
 */
export function groundingRate(sentences: ReceiptSentence[]): number | null {
  const c = claims(sentences);
  if (c.length === 0) return null;
  const grounded = c.filter((s) => s.cites.length > 0 && !s.reasons.some((r) => /^Cites sources that do not exist/.test(r)));
  return grounded.length / c.length;
}

/**
 * Explanation completeness: which of the four parts REDRESS asks for are
 * covered by at least one VERIFIED sentence — what happened (D*), automation
 * evidence (E* or the status D8), what is not established (G*), next steps (S*).
 */
export function explainCompleteness(sentences: ReceiptSentence[], sheet: FactSheet): number {
  const verifiedCites = sentences.filter((s) => s.verdict === 'verified' && !s.framing).flatMap((s) => s.cites);
  const has = (re: RegExp) => verifiedCites.some((id) => re.test(id));
  const hasEvidence = sheet.facts.some((f) => f.kind === 'evidence');
  const parts = [has(/^D[1-7]$/), hasEvidence ? has(/^E\d+$|^D8$/) : has(/^D8$|^G\d+$/), has(/^G\d+$/), has(/^S\d+$/)];
  return parts.filter(Boolean).length / parts.length;
}

/** Letter completeness: share of REDRESS's letter requests (Q*) covered by a verified sentence. */
export function letterCoverage(sentences: ReceiptSentence[], sheet: FactSheet): number | null {
  const qIds = sheet.facts.filter((f) => f.kind === 'question').map((f) => f.id);
  if (qIds.length === 0) return null;
  const covered = new Set(sentences.filter((s) => s.verdict === 'verified').flatMap((s) => s.cites).filter((id) => id.startsWith('Q')));
  return qIds.filter((id) => covered.has(id)).length / qIds.length;
}

/**
 * Whether the output is in the requested language. Quoted spans (which may
 * legitimately be in the notice's language) are removed first; an unclear
 * result counts as a mismatch.
 */
export function languageMatches(sentences: ReceiptSentence[], requested: LanguageCode): boolean {
  const text = sentences
    .map((s) => s.text)
    .join(' ')
    .replace(/"[^"]*"|“[^”]*”|„[^“”]*[“”]|«[^»]*»/g, ' ');
  const sentinel: LanguageCode = requested === 'en' ? 'de' : 'en';
  return detectLanguage(text, sentinel) === requested;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
}

export function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}
