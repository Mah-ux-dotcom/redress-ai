// ============================================================================
// REDRESS — Action Plan Generator
// Produces a deterministic, 5-step action plan based on the analysis.
// ============================================================================

import type { ActionStep, AutomationAnalysis, ExtractedData, JurisdictionCode } from '@/types';

export function generateActionPlan(
  extracted: ExtractedData,
  automation: AutomationAnalysis,
  jurisdiction: JurisdictionCode | null,
): ActionStep[] {
  const steps: ActionStep[] = [];

  // Step 1 — Preserve the original decision
  steps.push({
    step: 1,
    title: 'Preserve the original decision',
    description:
      'Save the original decision notification exactly as you received it. This is your primary evidence.',
    actions: [
      extracted.date
        ? `Save the decision dated ${extracted.date}`
        : 'Save the decision with the date you received it',
      'Keep the original email, letter, or screenshot — do not edit it',
      extracted.evidenceReferences.length > 0
        ? `Record these reference numbers: ${extracted.evidenceReferences.join(', ')}`
        : 'Record any reference or case numbers shown',
      'Add it to your Evidence Vault in REDRESS',
    ],
  });

  // Step 2 — Identify what is known
  const knownItems: string[] = [];
  if (extracted.organization) knownItems.push(`Organization: ${extracted.organization}`);
  if (extracted.decisionType) knownItems.push(`Decision type: ${extracted.decisionType}`);
  if (extracted.statedReason) knownItems.push(`Stated reason: ${extracted.statedReason}`);
  if (automation.status === 'confirmed_automated')
    knownItems.push('Automated decision-making: confirmed from the text');
  else if (automation.status === 'possibly_automated')
    knownItems.push('Automated decision-making: possibly involved');
  else if (automation.status === 'not_established')
    knownItems.push('Automated decision-making: not confirmed from the text');
  else knownItems.push('Human review: indicated in the text');

  steps.push({
    step: 2,
    title: 'Identify what is known about the decision',
    description:
      'Review the structured information REDRESS extracted. Note what is known and — just as importantly — what is missing.',
    actions: knownItems.length > 0 ? knownItems : ['Review the extracted information above'],
    ...(extracted.humanReviewMentioned ? {} : { missing: 'Human review was not mentioned in the decision.' }),
  } as ActionStep & { missing?: string });

  // Step 3 — Request clarification / human review
  const clarificationActions: string[] = [];
  if (automation.status === 'confirmed_automated' || automation.status === 'possibly_automated') {
    clarificationActions.push(
      'Ask whether automated or AI-based processing was used to make the decision',
    );
    clarificationActions.push('Request human review of the decision if available');
  } else if (automation.status === 'not_established') {
    clarificationActions.push(
      'Ask whether any automated or AI-based processing was involved in the decision',
    );
    clarificationActions.push('Request human review if it was an automated decision');
  }
  clarificationActions.push('Ask for the specific reasons or factors that led to the decision');
  if (jurisdiction) {
    clarificationActions.push(
      `Reference your right to information under the selected jurisdiction (${jurisdiction})`,
    );
  }
  if (extracted.deadline) {
    clarificationActions.push(`Act before the stated deadline: ${extracted.deadline}`);
  }

  steps.push({
    step: 3,
    title: 'Request clarification / human review',
    description:
      'Contact the organization to ask for more information and request human review if available. This is your first formal step.',
    actions: clarificationActions,
  });

  // Step 4 — Submit formal challenge
  steps.push({
    step: 4,
    title: 'Submit a formal challenge',
    description:
      'Use the challenge letter REDRESS generated. Customize it with your details, then send it through the organization\u2019s official channel.',
    actions: [
      'Review and edit the generated challenge letter',
      `Send it to ${extracted.contactMethod ?? 'the organization\u2019s official contact address'}`,
      extracted.deadline
        ? `Ensure it is sent before: ${extracted.deadline}`
        : 'Send it as soon as possible',
      'Keep a copy of what you send — add it to your Evidence Vault',
      'Mark your challenge status as "Submitted" in REDRESS',
    ],
  });

  // Step 5 — Escalate if unresolved
  const escalationActions: string[] = [];
  if (jurisdiction === 'UK') {
    escalationActions.push('If you do not receive a satisfactory response, you may complain to the Information Commissioner\u2019s Office (ICO)');
  } else if (jurisdiction === 'EU') {
    escalationActions.push('If you do not receive a satisfactory response, you may complain to your national Data Protection Authority');
  } else if (jurisdiction === 'US') {
    escalationActions.push('If the decision involves credit, you may file a complaint with the CFPB');
    escalationActions.push('You may also contact your state Attorney General\u2019s office or relevant state agency');
  } else {
    escalationActions.push('If you do not receive a satisfactory response, contact your local data protection or consumer protection authority');
  }
  escalationActions.push('Update your challenge status to "Escalated" in REDRESS');
  escalationActions.push('Keep all correspondence in your Evidence Vault');

  steps.push({
    step: 5,
    title: 'Escalate if unresolved',
    description:
      'If the organization does not respond or the response is unsatisfactory, you may escalate to an independent regulator or authority.',
    actions: escalationActions,
  });

  return steps;
}
