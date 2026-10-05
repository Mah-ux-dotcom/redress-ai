// ============================================================================
// REDRESS × Apertus — pipeline
//
//   translateNotice   non-English notice → aligned English (model), keeping
//                     only sentences that really appear in the original
//   analyzeNotice     runs the deterministic REDRESS engine on the English
//                     text, then cross-checks every automation / human signal
//                     against the ORIGINAL wording
//   generateGrounded  explanation / letter in any language (model) →
//                     Receipts verification → or rule-based fallback
// ============================================================================

import type { AutomationAnalysis, ExtractedData, JurisdictionCode, StatusSignal } from '@/types';
import { analyzeAutomation, extractDecision } from '@/lib/analyze';
import { explainFourPart } from '@/ai/explainEngine';
import { HUMAN_CUES, detectLanguage, hasAutomationCue } from './language';
import { buildGenerationMessages, buildTranslationMessages, parseSentences, type GenerationTask } from './prompts';
import { verifyAll } from './receipts';
import type {
  AlignedSentence,
  ApertusClient,
  DraftSentence,
  FactSheet,
  GroundedOutput,
  LanguageCode,
  NoticeTranslation,
} from './types';

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

export async function translateNotice(client: ApertusClient, rawText: string): Promise<NoticeTranslation | null> {
  const sourceLanguage = detectLanguage(rawText);
  if (sourceLanguage === 'en') return null;

  const content = await client.complete(buildTranslationMessages(rawText, sourceLanguage), { temperature: 0, maxTokens: 3000 });
  const { items } = parseSentences(content);

  const original = squash(rawText);
  const sentences: AlignedSentence[] = [];
  let dropped = 0;
  for (const item of items as { source?: unknown; english?: unknown }[]) {
    const source = typeof item?.source === 'string' ? item.source.trim() : '';
    const english = typeof item?.english === 'string' ? item.english.trim() : '';
    // Only keep sentences the model copied faithfully from the original notice.
    if (source && english && original.includes(squash(source))) sentences.push({ source, english });
    else dropped++;
  }
  if (sentences.length === 0) throw new Error('No usable translation in the model response');

  // Rebuild the notice in English, preserving its line structure.
  let englishText = rawText;
  for (const s of sentences) englishText = englishText.replace(s.source, s.english);

  return { sourceLanguage, sentences, englishText, producedBy: client.kind, modelLabel: client.label, droppedSentences: dropped };
}

// ---------------------------------------------------------------------------
// Deterministic analysis with cross-lingual evidence check
// ---------------------------------------------------------------------------

const AUTOMATION_TYPES: StatusSignal['type'][] = ['automated', 'ai', 'solely', 'algorithm', 'score'];

export function analyzeNotice(
  rawText: string,
  translation: NoticeTranslation | null,
): { extracted: ExtractedData; automation: AutomationAnalysis } {
  if (!translation) {
    const extracted = extractDecision(rawText);
    return { extracted, automation: analyzeAutomation(extracted) };
  }

  const extracted = extractDecision(translation.englishText);
  const lang = translation.sourceLanguage;
  const checked: StatusSignal[] = extracted.automationEvidence.map((sig) => {
    const pair = translation.sentences.find(
      (p) => squash(p.english).includes(squash(sig.quote)) || squash(sig.quote).includes(squash(p.english)),
    );
    if (!pair) return sig;
    const withOriginal = { ...sig, originalQuote: pair.source };
    if (sig.type === 'neutral' || sig.type === 'human_route') return withOriginal;
    const cueFound = AUTOMATION_TYPES.includes(sig.type) ? hasAutomationCue(lang, pair.source) : HUMAN_CUES[lang].test(pair.source);
    if (cueFound) return withOriginal;
    // Evidence that exists only in the translation is never counted.
    return {
      ...withOriginal,
      type: 'neutral' as const,
      weight: 'weak' as const,
      text: `Found only in the translation, not in the original wording — not counted (${sig.text.toLowerCase()})`,
    };
  });

  const has = (t: StatusSignal['type']) => checked.some((s) => s.type === t);
  const crossChecked: ExtractedData = {
    ...extracted,
    automationEvidence: checked,
    automatedMentioned: has('automated') || has('solely'),
    aiMentioned: has('ai'),
    algorithmMentioned: has('algorithm'),
    humanReviewMentioned: has('human'),
    humanReviewOffered: has('human_route'),
  };
  return { extracted: crossChecked, automation: analyzeAutomation(crossChecked) };
}

// ---------------------------------------------------------------------------
// Grounded generation with Receipts and fallback
// ---------------------------------------------------------------------------

export interface GenerateParams {
  client: ApertusClient | null;
  task: GenerationTask;
  language: LanguageCode;
  sheet: FactSheet;
  extracted: ExtractedData;
  automation: AutomationAnalysis;
  jurisdiction: JurisdictionCode | null;
  /** Rule-based letter body, used as the fallback for the letter task. */
  ruleBasedLetter?: string;
  userName?: string;
}

function parseDraft(content: string): DraftSentence[] {
  const { items } = parseSentences(content);
  const out: DraftSentence[] = [];
  for (const s of items as { text?: unknown; cites?: unknown; framing?: unknown }[]) {
    if (typeof s?.text !== 'string' || !s.text.trim()) continue;
    out.push({
      text: s.text.trim(),
      cites: Array.isArray(s.cites) ? s.cites.filter((c): c is string => typeof c === 'string') : [],
      framing: s.framing === true,
    });
  }
  if (out.length === 0) throw new Error('Response has no usable sentences');
  return out;
}

function ruleBasedFallback(params: GenerateParams, reason: string): GroundedOutput {
  const text =
    params.task === 'letter'
      ? params.ruleBasedLetter ?? ''
      : explainFourPart({ question: '', extracted: params.extracted, automation: params.automation, jurisdiction: params.jurisdiction }).answer;
  const sentences = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => ({ text: l, cites: ['REDRESS'], verdict: 'verified' as const, reasons: [] }));
  return {
    language: 'en',
    sentences,
    summary: { checked: 0, verified: 0, blocked: 0 },
    producedBy: 'rule_based_fallback',
    modelLabel: 'REDRESS rule-based engine',
    fallbackReason: reason,
  };
}

export async function generateGrounded(params: GenerateParams): Promise<GroundedOutput> {
  const { client, task, language, sheet, automation } = params;
  if (!client) return ruleBasedFallback(params, 'Language-model features are turned off.');
  try {
    const content = await client.complete(buildGenerationMessages(task, language, sheet, { userName: params.userName }), {
      temperature: 0.2,
      maxTokens: 2000,
    });
    const { sentences, summary } = verifyAll(parseDraft(content), sheet, automation);
    return { language, sentences, summary, producedBy: client.kind, modelLabel: client.label };
  } catch (err) {
    const why = err instanceof Error ? err.message : 'unknown error';
    return ruleBasedFallback(params, `${client.label} was unavailable (${why}). Showing REDRESS's rule-based output in English instead.`);
  }
}
