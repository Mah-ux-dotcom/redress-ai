// ============================================================================
// REDRESS — Challenge Letter Generator
//
// Generates a professional, editable challenge/review request letter.
// CRITICAL: Every factual statement originates from the extracted data or
// explicit user input. No facts are invented.
// ============================================================================

import type { AutomationAnalysis, ChallengeLetter, ExtractedData, JurisdictionCode } from '@/types';

interface GenerateParams {
  extracted: ExtractedData;
  automation: AutomationAnalysis;
  jurisdiction: JurisdictionCode | null;
  userName: string;
  caseId: string;
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function generateChallengeLetter(params: GenerateParams): ChallengeLetter {
  const { extracted, automation, jurisdiction, userName, caseId } = params;
  const today = formatDate();
  const lines: string[] = [];

  // --- Header ---
  lines.push(`Date: ${today}`);
  lines.push('');
  if (extracted.organization) {
    lines.push(`To: ${extracted.organization}`);
  } else {
    lines.push('To: [Organization name]');
  }
  lines.push('');
  lines.push(`Subject: Request for Review of Decision — Reference ${caseId}`);
  lines.push('');
  lines.push('Dear Sir or Madam,');
  lines.push('');

  // --- Opening — identify the decision ---
  lines.push(`My name is ${userName}. I am writing to request a review of a decision that you communicated to me${extracted.date ? ` on ${extracted.date}` : ''}.`);
  lines.push('');

  // --- State the decision ---
  if (extracted.decisionOutcome || extracted.decisionType) {
    const outcome = extracted.decisionOutcome ?? 'a decision';
    const dtype = extracted.decisionType ?? 'an application';
    lines.push(`The decision in question is: ${outcome} regarding ${dtype}.`);
  } else {
    lines.push('The decision in question is the one referenced in the original communication I received from you.');
  }
  lines.push('');

  // --- State the reason given ---
  if (extracted.statedReason) {
    lines.push(`The reason provided was: "${extracted.statedReason}".`);
    lines.push('');
  }

  // --- Reference numbers ---
  if (extracted.evidenceReferences.length > 0) {
    lines.push(`The following reference(s) appear on the decision: ${extracted.evidenceReferences.join(', ')}.`);
    lines.push('');
  }

  // --- Automation status — factual, from the text ---
  lines.push('I would like to clarify the following about the decision:');
  lines.push('');

  const requests: string[] = [];

  if (automation.status === 'confirmed_automated') {
    requests.push(
      'Your communication references automated processing. Please confirm whether this decision was made solely by an automated system or whether a human reviewed it.',
    );
  } else if (automation.status === 'possibly_automated') {
    requests.push(
      'Your communication appears to reference automated or algorithmic processing. Please clarify whether automated or AI-based processing was used in this decision.',
    );
  } else if (automation.status === 'not_established') {
    requests.push(
      'Please confirm whether any automated, algorithmic, or AI-based processing was used in making this decision.',
    );
  } else {
    requests.push(
      'Please confirm the role of any automated or AI-based processing in this decision, if applicable.',
    );
  }

  requests.push('Please provide the specific reasons and factors that led to the decision, including any information or data about me that was used.');
  requests.push('Please confirm whether I am entitled to human review of this decision and, if so, how I may request it.');

  if (jurisdiction) {
    const jurisdictionLabel: Record<JurisdictionCode, string> = {
      UK: 'the UK GDPR and Data Protection Act 2018',
      EU: 'the GDPR and the EU AI Act',
      US: 'applicable federal and state consumer protection laws',
      GENERAL: 'applicable data protection and consumer protection laws',
    };
    requests.push(
      `Please also provide the information I am entitled to request under ${jurisdictionLabel[jurisdiction]}, including meaningful information about the logic of any automated processing involved.`,
    );
  }

  requests.push('If any factual information used in the decision appears to be incorrect, please correct it and reconsider the decision.');

  for (const r of requests) {
    lines.push(`1. ${r}`);
  }
  lines.push('');

  // --- Response request ---
  lines.push('I would appreciate a response within 14 days of the date of this letter.');
  lines.push('');

  if (extracted.deadline) {
    lines.push(`I note that your communication referenced a deadline of ${extracted.deadline}. I request that this be extended while my review is processed.`);
    lines.push('');
  }

  // --- Closing ---
  lines.push('I have retained the original decision and all supporting evidence. I look forward to your response.');
  lines.push('');
  lines.push('Yours faithfully,');
  lines.push('');
  lines.push(userName);
  lines.push('');
  lines.push(`REDRESS Case Reference: ${caseId}`);

  return {
    subject: `Request for Review of Decision — Reference ${caseId}`,
    body: lines.join('\n'),
    recipientOrganization: extracted.organization,
    generatedAt: new Date().toISOString(),
    caseId,
  };
}

/** Generate a case ID in the format RP-XXXXX */
export function generateCaseId(): string {
  const num = Math.floor(10000 + Math.random() * 89999);
  return `RP-${num}`;
}
