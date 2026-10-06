// ============================================================================
// REDRESS — Action Plan Generator
// Produces a deterministic, 5-step action plan based on the analysis.
// ============================================================================

import type { ActionStep, AutomationAnalysis, ExtractedData, JurisdictionCode } from '@/types';
import { INVOLVEMENT_META, STATUS_META } from '@/lib/analyze';

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
  knownItems.push(`Automation status: ${STATUS_META[automation.status].label} — ${INVOLVEMENT_META[automation.involvement].label}`);
  for (const sig of automation.signals.filter((x) => x.type !== 'neutral')) {
    knownItems.push(`Evidence: "${sig.quote}"`);
  }
  for (const gap of automation.notEstablished) {
    knownItems.push(`Not established: ${gap}`);
  }

  steps.push({
    step: 2,
    title: 'Identify what is known about the decision',
    description:
      'Review the structured information REDRESS extracted. Note what is known and — just as importantly — what is missing.',
    actions: knownItems.length > 0 ? knownItems : ['Review the extracted information above'],
  });

  // Step 3 — Request clarification / human review (driven by the evidence status)
  const clarificationActions: string[] = automation.nextSteps.filter(
    (a) => !a.startsWith('Preserve') && !a.startsWith('If the organisation does not resolve'),
  );
  if (jurisdiction === 'UK' || jurisdiction === 'EU') {
    clarificationActions.push(
      `Consider including a request for a copy of your personal data (Article 15 ${jurisdiction === 'UK' ? 'UK GDPR' : 'GDPR'})`,
    );
  } else if (jurisdiction === 'CH') {
    clarificationActions.push('Consider including a request for access to your personal data, including any automated individual decision and its logic (Art. 25 FADP)');
  } else if (jurisdiction === 'US' && extracted.decisionType === 'Loan / Credit Application') {
    clarificationActions.push('Ask for the statement of specific reasons for the credit decision (ECOA / Regulation B)');
  } else if (!jurisdiction || jurisdiction === 'GENERAL') {
    clarificationActions.push('Check which rights apply where you are — they may differ from the general guidance here');
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
    escalationActions.push('If your data protection concern is not resolved, you may complain to the Information Commissioner\u2019s Office (ICO)');
    if (extracted.decisionType === 'Loan / Credit Application' || extracted.decisionType === 'Insurance Claim') {
      escalationActions.push('For a financial services decision, you may be able to refer the complaint to the Financial Ombudsman Service after the firm\u2019s final response or after 8 weeks');
    }
  } else if (jurisdiction === 'EU') {
    escalationActions.push('If you do not receive a satisfactory response, you may complain to your national Data Protection Authority');
  } else if (jurisdiction === 'CH') {
    escalationActions.push('If it is not resolved, you may report it to the Federal Data Protection and Information Commissioner (FDPIC / EDÖB); for cantonal or communal authorities, contact the cantonal data protection authority');
  } else if (jurisdiction === 'US') {
    escalationActions.push('If the decision involves credit, you may file a complaint with the CFPB');
    escalationActions.push('You may also contact your state Attorney General\u2019s office or relevant state agency');
  } else {
    escalationActions.push('If it is not resolved, identify the data protection, consumer or financial regulator or ombudsman where you live — the right body depends on your jurisdiction');
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
