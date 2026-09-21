// ============================================================================
// REDRESS — Rights & Options Generator
//
// Produces a concise list of potentially relevant options based on the
// automation status and selected jurisdiction. Every option is phrased
// carefully — "may have a right to" — never as a definitive legal conclusion.
// ============================================================================

import type {
  AutomationAnalysis,
  AutomationStatus,
  JurisdictionCode,
  RightsOption,
} from '@/types';
import { getJurisdiction } from '@/legal/jurisdictions';

export function generateRightsOptions(
  automation: AutomationAnalysis,
  jurisdiction: JurisdictionCode | null,
): RightsOption[] {
  const options: RightsOption[] = [];
  const status = automation.status;

  // --- Option 1: Ask whether automated decision-making was used ---
  if (status === 'not_established' || status === 'possibly_automated') {
    options.push({
      id: 'ask_automation',
      title: 'Ask whether automated decision-making was used',
      explanation:
        'You can ask the organization to confirm whether an automated system, algorithm, or AI was involved in the decision. They are required to inform you in many jurisdictions.',
      whyItMatters:
        'If automation was used, additional rights may apply — including the right to human review and the right to information about the logic involved.',
      confidence: status === 'possibly_automated' ? 'high' : 'medium',
      jurisdictionContext: jurisdiction ?? undefined,
      source: jurisdiction ? getJurisdiction(jurisdiction).frameworks[0]?.source : undefined,
    });
  }

  // --- Option 2: Request information about the decision ---
  options.push({
    id: 'request_info',
    title: 'Request information about the decision',
    explanation:
      'You may ask for the specific reasons, factors, and data used to make the decision. This includes meaningful information about the logic of any automated processing.',
    whyItMatters:
      'Without knowing what information was used, you cannot assess whether the decision was fair or whether incorrect data was involved.',
    confidence: 'high',
    jurisdictionContext: jurisdiction ?? undefined,
    source: jurisdiction
      ? getJurisdiction(jurisdiction).frameworks.find((f) => f.shortName.includes('Arts. 13'))?.source ??
        getJurisdiction(jurisdiction).frameworks[0]?.source
      : 'General transparency principle',
  });

  // --- Option 3: Ask whether human review is available ---
  if (status !== 'human_indicated') {
    options.push({
      id: 'request_human_review',
      title: 'Ask whether human review is available',
      explanation:
        'You may request that a person reviews the decision instead of (or in addition to) an automated system. Many frameworks provide a right to human intervention for automated decisions.',
      whyItMatters:
        'A human reviewer can consider context and circumstances that an automated system may have missed. This is one of the most effective ways to challenge an automated decision.',
      confidence: status === 'confirmed_automated' ? 'high' : 'medium',
      jurisdictionContext: jurisdiction ?? undefined,
      source: jurisdiction ? getJurisdiction(jurisdiction).frameworks[0]?.source : undefined,
    });
  }

  // --- Option 4: Ask for the reasons or factors considered ---
  options.push({
    id: 'request_reasons',
    title: 'Ask for the reasons or factors considered',
    explanation:
      'You may ask the organization to provide the specific criteria, factors, or scoring elements that led to the decision.',
    whyItMatters:
      'Understanding the factors helps you identify whether any incorrect or outdated information was used, and whether the criteria were fair.',
    confidence: 'high',
    jurisdictionContext: jurisdiction ?? undefined,
    source: jurisdiction
      ? getJurisdiction(jurisdiction).frameworks.find((f) => f.shortName.includes('Arts. 13'))?.source
      : 'General transparency principle',
  });

  // --- Option 5: Submit a formal challenge ---
  options.push({
    id: 'submit_challenge',
    title: 'Submit a formal challenge',
    explanation:
      'You may submit a formal written challenge requesting that the decision be reviewed, reversed, or reconsidered.',
    whyItMatters:
      'A formal challenge creates a written record, establishes a timeline, and is often a prerequisite for escalation to a regulator.',
    confidence: 'high',
    jurisdictionContext: jurisdiction ?? undefined,
  });

  // --- Option 6: Preserve the original decision and supporting evidence ---
  options.push({
    id: 'preserve_evidence',
    title: 'Preserve the original decision and supporting evidence',
    explanation:
      'Keep the original decision notification, any related emails or documents, and records of your communications with the organization.',
    whyItMatters:
      'Evidence is essential if you need to escalate to a regulator or take further action. REDRESS provides an Evidence Vault to help you organize it.',
    confidence: 'high',
  });

  // --- Option 7: Escalate to a regulator (if unresolved) ---
  if (jurisdiction) {
    const jur = getJurisdiction(jurisdiction);
    let escalateText = 'If the organization does not resolve your complaint, you may escalate to an independent regulator or authority.';
    if (jurisdiction === 'UK') {
      escalateText = 'If the organization does not resolve your complaint, you may complain to the Information Commissioner\u2019s Office (ICO).';
    } else if (jurisdiction === 'EU') {
      escalateText = 'If the organization does not resolve your complaint, you may complain to your national Data Protection Authority.';
    } else if (jurisdiction === 'US') {
      escalateText = 'If the decision involves credit, you may file a complaint with the CFPB. You may also contact your state Attorney General.';
    }

    options.push({
      id: 'escalate',
      title: 'Escalate if the organization does not respond',
      explanation: escalateText,
      whyItMatters:
        'Regulators can investigate, require the organization to respond, and in some cases enforce compliance. Escalation is a last resort after the organization\u2019s own process is exhausted.',
      confidence: 'medium',
      jurisdictionContext: jurisdiction,
      source: jur.frameworks[jur.frameworks.length - 1]?.source,
    });
  }

  return options;
}

/** Confidence metadata for UI */
export const CONFIDENCE_META: Record<RightsOption['confidence'], { label: string; color: string }> = {
  high: { label: 'High confidence', color: 'text-success-600' },
  medium: { label: 'Medium confidence', color: 'text-warning-600' },
  low: { label: 'Low confidence', color: 'text-ink-500' },
};

/** Status-to-options summary for the demo card */
export function getStatusOptionsSummary(status: AutomationStatus): string[] {
  switch (status) {
    case 'confirmed_automated':
      return [
        'Ask how automated processing was used',
        'Request human review',
        'Challenge inaccurate information',
        'Request the specific factors considered',
      ];
    case 'possibly_automated':
      return [
        'Ask whether automation was used',
        'Request human review if available',
        'Request the specific factors considered',
        'Submit a formal challenge',
      ];
    case 'not_established':
      return [
        'Ask whether automation was used',
        'Request the specific reasons for the decision',
        'Request human review',
        'Preserve all evidence',
      ];
    case 'human_indicated':
      return [
        'Request the specific reasons for the decision',
        'Ask for a second human review',
        'Challenge any incorrect information',
        'Submit a formal challenge',
      ];
  }
}
