// ============================================================================
// REDRESS × Apertus — fact sheet
//
// Turns the deterministic REDRESS analysis into a numbered list of facts.
// This is the ONLY material Apertus may use, and every sentence it writes
// must cite the fact IDs it relies on:
//
//   D*  decision facts (organisation, outcome, date, reason, references…)
//   E*  automation / human evidence (verbatim quotes from the notice)
//   G*  what the evidence does NOT establish
//   S*  next steps REDRESS recommends
//   L*  legal references for the selected jurisdiction (with conditions)
//   Q*  the questions in REDRESS's rule-based challenge letter
// ============================================================================

import type { AutomationAnalysis, ExtractedData, JurisdictionCode, StatusSignal } from '@/types';
import { INVOLVEMENT_META, STATUS_META } from '@/lib/analyze';
import { getJurisdiction, isSpecificJurisdiction } from '@/legal/jurisdictions';
import type { Fact, FactSheet } from './types';

/** Local-language names for frameworks, so a cited fact also covers its translation. */
function withAliases(text: string): string {
  const aliases: string[] = [];
  if (/\bGDPR\b/.test(text) && !/UK GDPR/.test(text)) aliases.push('DSGVO', 'RGPD');
  if (/AI Act/.test(text)) aliases.push('KI-Verordnung');
  if (/\bFADP\b/.test(text)) aliases.push('revFADP', 'nFADP', 'DSG', 'nDSG', 'revDSG', 'LPD', 'nLPD');
  return aliases.length ? `${text} [also: ${aliases.join(', ')}]` : text;
}

const AUTOMATION_SIGNAL_TYPES: StatusSignal['type'][] = ['automated', 'ai', 'solely', 'algorithm'];

export interface FactSheetInput {
  extracted: ExtractedData;
  automation: AutomationAnalysis;
  jurisdiction: JurisdictionCode | null;
  /** Numbered requests from REDRESS's rule-based challenge letter. */
  letterRequests?: string[];
}

/** Fact IDs that may support a sentence asserting that a person made or reviewed the decision. */
export function humanSupportIds(sheet: FactSheet, automation: AutomationAnalysis): Set<string> {
  const ids = new Set<string>();
  for (const f of sheet.facts) if (f.kind === 'evidence' && f.signalType === 'human') ids.add(f.id);
  if (automation.status === 'human_indicated' || automation.involvement === 'ai_assisted') ids.add('D8');
  return ids;
}

/** Fact IDs that may support a sentence asserting automation was used. */
export function automationSupportIds(sheet: FactSheet, automation: AutomationAnalysis): Set<string> {
  const ids = new Set<string>();
  for (const f of sheet.facts) {
    if (f.kind === 'evidence' && f.signalType && AUTOMATION_SIGNAL_TYPES.includes(f.signalType)) ids.add(f.id);
  }
  if (automation.status === 'confirmed_automated' || automation.status === 'possibly_automated') {
    // The status itself, and the rule-based letter questions — which REDRESS only
    // phrases this way when the evidence shows automation — may support the claim.
    ids.add('D8');
    // REDRESS's own next steps (S*) and letter requests (Q*) are only phrased
    // in terms of an automated system when the evidence shows one.
    for (const f of sheet.facts) if (f.kind === 'question' || f.kind === 'step') ids.add(f.id);
  }
  return ids;
}

export function buildFactSheet({ extracted, automation, jurisdiction, letterRequests = [] }: FactSheetInput): FactSheet {
  const facts: Fact[] = [];
  const add = (f: Fact) => facts.push(f);

  if (extracted.organization) add({ id: 'D1', kind: 'decision', text: `Organisation: ${extracted.organization}` });
  if (extracted.decisionOutcome || extracted.decisionType) {
    add({
      id: 'D2',
      kind: 'decision',
      text: `Outcome: ${extracted.decisionOutcome ?? 'unknown'}; decision type: ${extracted.decisionType ?? 'unknown'}`,
    });
  }
  if (extracted.date) add({ id: 'D3', kind: 'decision', text: `Date of the decision: ${extracted.date}` });
  if (extracted.statedReason) add({ id: 'D4', kind: 'decision', text: `Stated reason: ${extracted.statedReason}` });
  if (extracted.evidenceReferences.length) {
    add({ id: 'D5', kind: 'decision', text: `Reference numbers on the notice: ${extracted.evidenceReferences.join(', ')}` });
  }
  if (extracted.deadline) add({ id: 'D6', kind: 'decision', text: `Deadline stated in the notice: ${extracted.deadline}` });
  if (extracted.contactMethod) add({ id: 'D7', kind: 'decision', text: `Contact given in the notice: ${extracted.contactMethod}` });
  add({
    id: 'D8',
    kind: 'decision',
    text: `Automation status (REDRESS): ${STATUS_META[automation.status].label}. Role of automation: ${
      INVOLVEMENT_META[automation.involvement].label
    }. ${automation.explanation}`,
  });

  automation.signals
    .filter((s) => s.type !== 'neutral')
    .forEach((s, i) =>
      add({
        id: `E${i + 1}`,
        kind: 'evidence',
        text: s.text,
        sourceQuote: s.originalQuote ?? s.quote,
        signalType: s.type,
      }),
    );

  automation.notEstablished.forEach((t, i) => add({ id: `G${i + 1}`, kind: 'gap', text: t }));
  automation.nextSteps.forEach((t, i) => add({ id: `S${i + 1}`, kind: 'step', text: t }));

  if (isSpecificJurisdiction(jurisdiction)) {
    getJurisdiction(jurisdiction).frameworks.forEach((f, i) =>
      add({
        id: `L${i + 1}`,
        kind: 'law',
        text: withAliases(
          `${f.shortName}: ${f.name} — ${f.source}. Applies when: ${f.applicableWhen} Human review: ${f.humanReview} Limits: ${f.limitations}`,
        ),
      }),
    );
  }

  letterRequests.forEach((t, i) => add({ id: `Q${i + 1}`, kind: 'question', text: withAliases(t) }));

  const byId: Record<string, Fact> = {};
  for (const f of facts) byId[f.id] = f;
  return { facts, byId };
}

/** Extract the numbered requests ("1. …") from a rule-based letter body. */
export function letterRequestsFromBody(body: string): string[] {
  return body
    .split('\n')
    .map((l) => l.match(/^\d+\.\s+(.*)$/)?.[1])
    .filter((l): l is string => !!l);
}
