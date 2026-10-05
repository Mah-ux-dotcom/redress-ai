// ============================================================================
// REDRESS — Apertus client (browser side)
//
// Free-form questions that the deterministic explain engine cannot match are
// sent to Apertus (Swiss AI, hosted at CSCS) through the server-side proxy at
// /api/apertus/chat. The model only sees a grounding pack built from the
// user's extracted decision data, the traceable automation analysis and the
// selected jurisdiction's approved reference material, and is told to answer
// from that pack alone.
// ============================================================================

import type { AutomationAnalysis, ExtractedData, JurisdictionCode } from '@/types';
import { getJurisdiction, isSpecificJurisdiction } from '@/legal/jurisdictions';
import { INVOLVEMENT_META, STATUS_META } from '@/lib/analyze';

export const APERTUS_ENDPOINT = '/api/apertus/chat';
const CLIENT_TIMEOUT_MS = 35_000;

export interface ApertusContext {
  extracted: ExtractedData;
  automation: AutomationAnalysis;
  jurisdiction: JurisdictionCode | null;
}

export interface ApertusAnswer {
  model: string;
  content: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function isApertusEnabled(): boolean {
  return import.meta.env.VITE_APERTUS_ENABLED !== 'false';
}

export const APERTUS_SYSTEM_PROMPT = [
  'You are the "Explain It To Me" assistant inside REDRESS, a tool that helps people understand and challenge decisions that may have been made by automated systems.',
  'Answer ONLY from the CONTEXT provided in the user message. Rules:',
  '1. Do not invent laws, articles, deadlines, organisations, contact details, amounts or facts. If the CONTEXT does not contain the answer, say so plainly and suggest asking the organisation.',
  '2. Do not state that a decision was automated, solely automated or made by a person unless the CONTEXT says so. Respect the automation status and the "does not establish" list.',
  '3. Only mention legal frameworks listed in the CONTEXT, and only with the conditions and limitations given there. If no jurisdiction is selected, do not name specific laws.',
  '4. You are not a lawyer and this is not legal advice. Do not predict outcomes.',
  '5. Use plain, calm language. Keep the answer under 200 words. Use short paragraphs or a short numbered list. No markdown headings.',
].join('\n');

/** Builds the grounding pack the model is allowed to answer from. */
export function buildGroundingContext({ extracted, automation, jurisdiction }: ApertusContext): string {
  const lines: string[] = ['DECISION (extracted from the user’s text)'];
  const field = (label: string, value: string | null) => lines.push(`- ${label}: ${value ?? 'not found in the text'}`);
  field('Organisation', extracted.organization);
  field('Decision type', extracted.decisionType);
  field('Outcome', extracted.decisionOutcome);
  field('Date', extracted.date);
  field('Stated reason', extracted.statedReason);
  field('Appeal instructions', extracted.appealInstructions);
  field('Deadline', extracted.deadline);
  field('Contact method', extracted.contactMethod);
  field('Reference numbers', extracted.evidenceReferences.length ? extracted.evidenceReferences.join(', ') : null);
  lines.push(`- Human review offered as a route: ${extracted.humanReviewOffered ? 'yes' : 'not mentioned'}`);

  lines.push('', 'AUTOMATION ANALYSIS');
  lines.push(`- Status: ${STATUS_META[automation.status].label}`);
  lines.push(`- Involvement: ${INVOLVEMENT_META[automation.involvement].label}`);
  lines.push(`- Summary: ${automation.explanation}`);
  if (automation.signals.length) {
    lines.push('- Signals (verbatim quotes from the decision):');
    for (const sig of automation.signals) lines.push(`  • [${sig.type}] ${sig.text}: "${sig.quote}"`);
  }
  if (automation.suggests.length) {
    lines.push('- What it suggests:');
    for (const s of automation.suggests) lines.push(`  • ${s}`);
  }
  if (automation.notEstablished.length) {
    lines.push('- What it does NOT establish:');
    for (const s of automation.notEstablished) lines.push(`  • ${s}`);
  }
  if (automation.nextSteps.length) {
    lines.push('- Next steps:');
    for (const s of automation.nextSteps) lines.push(`  • ${s}`);
  }

  lines.push('', 'JURISDICTION');
  if (isSpecificJurisdiction(jurisdiction)) {
    const jur = getJurisdiction(jurisdiction);
    lines.push(`- Selected: ${jur.label}`);
    for (const f of jur.frameworks) {
      lines.push(`- ${f.name} (${f.source})`);
      lines.push(`  Applies when: ${f.applicableWhen}`);
      lines.push(`  Rights: ${f.rights.join('; ')}`);
      lines.push(`  Human review: ${f.humanReview}`);
      lines.push(`  Limits: ${f.limitations}`);
      lines.push(`  Status: ${f.currency}`);
    }
    lines.push(`- Disclaimer: ${jur.disclaimer}`);
  } else {
    lines.push('- None selected. Do not name specific laws; give general procedural guidance only.');
  }

  return lines.join('\n');
}

export function buildApertusMessages(question: string, context: ApertusContext): ChatMessage[] {
  return [
    { role: 'system', content: APERTUS_SYSTEM_PROMPT },
    { role: 'user', content: `CONTEXT\n${buildGroundingContext(context)}\n\nQUESTION\n${question.trim()}` },
  ];
}

/** The answer panel renders plain text, so drop the markdown emphasis and headings the model sometimes adds. */
export function toPlainText(content: string): string {
  return content
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^(\s*)[*-]\s+/gm, '$1\u2022 ')
    .replace(/^(\d+\.)\s+/gm, '$1 ')
    .trim();
}

/** Asks Apertus a grounded question. Throws on network, proxy or empty-answer errors. */
export async function askApertus(question: string, context: ApertusContext, signal?: AbortSignal): Promise<ApertusAnswer> {
  const timeout = AbortSignal.timeout(CLIENT_TIMEOUT_MS);
  const res = await fetch(APERTUS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: buildApertusMessages(question, context), temperature: 0.2 }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!res.ok) throw new Error(`Apertus proxy returned ${res.status}`);
  const data = (await res.json()) as { model?: string; content?: string };
  const content = data.content ? toPlainText(data.content) : '';
  if (!content) throw new Error('Apertus returned an empty answer');
  return { model: data.model ?? 'Apertus', content };
}
