// ============================================================================
// REDRESS × Apertus — prompts
//
// Prompts carry the fact sheet as JSON between explicit markers. The model is
// asked for JSON only. Whatever it returns is parsed defensively and then
// checked sentence-by-sentence by the Receipts verifier — the prompt rules are
// a first line of defence, never the only one.
// ============================================================================

import type { ChatMessage, FactSheet, LanguageCode } from './types';
import { LANGUAGES } from './language';

export const FACTS_START = '<<<REDRESS_FACTS>>>';
export const FACTS_END = '<<<END_REDRESS_FACTS>>>';
export const NOTICE_START = '<<<NOTICE>>>';
export const NOTICE_END = '<<<END_NOTICE>>>';

export type GenerationTask = 'explain' | 'letter';

const RULES = `Rules you must follow:
- Use ONLY the facts provided. Do not add facts, deadlines, numbers, laws, article numbers or organisation details.
- Every sentence must list the IDs of the facts it relies on in "cites".
- Only mention a law or article if it appears in a cited L* or Q* fact.
- Never say automation or AI was used unless you cite an E* fact showing it. If the facts do not establish it, say so.
- Never state legal conclusions (e.g. "unlawful", "illegal"), guarantees or predictions of outcome.
- Quote the notice only by copying text exactly from an E* fact's "quote".
- Write in plain, calm language a non-lawyer understands.
- Output JSON only, no commentary.`;

function factsBlock(sheet: FactSheet): string {
  const facts = sheet.facts.map((f) => ({ id: f.id, kind: f.kind, fact: f.text, ...(f.sourceQuote ? { quote: f.sourceQuote } : {}) }));
  return `${FACTS_START}\n${JSON.stringify(facts, null, 1)}\n${FACTS_END}`;
}

export function buildGenerationMessages(
  task: GenerationTask,
  language: LanguageCode,
  sheet: FactSheet,
  extra: { userName?: string } = {},
): ChatMessage[] {
  const lang = `${LANGUAGES[language].label} (${LANGUAGES[language].native})`;
  const instruction =
    task === 'explain'
      ? `Explain this decision to the person who received it, in ${lang}. Cover, in order: what happened; what evidence there is about automation (quote it); what that evidence does NOT prove; what they can do next. 8 to 14 short sentences.`
      : `Write a formal, polite request-for-review letter from ${extra.userName || 'the person'} to the organisation, in ${lang}. Include a greeting, the decision it concerns, the quoted evidence if any, then each Q* question as its own numbered sentence, and a sign-off. Mark greeting and sign-off lines with "framing": true and empty "cites".`;

  return [
    {
      role: 'system',
      content: `You are the language layer of REDRESS, a tool that helps people respond to automated and AI-assisted decisions. A deterministic engine has already established the facts. You only explain and write.\n\n${RULES}`,
    },
    {
      role: 'user',
      content: `TASK: ${task}\nLANGUAGE: ${language}\n${instruction}\n\n${factsBlock(sheet)}\n\nReturn exactly this JSON shape:\n{"sentences":[{"text":"...","cites":["D1","E1"]}]}`,
    },
  ];
}

export function buildTranslationMessages(notice: string, sourceLanguage: LanguageCode): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You translate official letters into English for analysis. Translate faithfully and literally. Do not add, remove, soften or strengthen anything — in particular, never add or remove words about automation, algorithms, AI or human review. Output JSON only.',
    },
    {
      role: 'user',
      content: `TASK: translate\nSOURCE LANGUAGE: ${sourceLanguage}\nSplit the notice into its lines/sentences. For each, copy the original text EXACTLY into "source" and give the English translation in "english".\n\n${NOTICE_START}\n${notice}\n${NOTICE_END}\n\nReturn exactly this JSON shape:\n{"sentences":[{"source":"...","english":"..."}]}`,
    },
  ];
}

/** Extract the first JSON object from a model response (tolerates code fences / chatter). */
export function parseJsonObject(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : content;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in model response');
  return JSON.parse(candidate.slice(start, end + 1));
}
