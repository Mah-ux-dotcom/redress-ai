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

  // --- Automation status — factual, from the text, never an accusation ---
  const quoted = automation.signals.find((s) => s.type === 'solely')
    ?? automation.signals.find((s) => s.type === 'automated' || s.type === 'ai')
    ?? automation.signals.find((s) => s.type === 'algorithm');
  const humanQuote = automation.signals.find((s) => s.type === 'human');

  if (automation.status === 'confirmed_automated' && quoted) {
    lines.push(`Your communication states: "${quoted.quote}"`);
    lines.push('');
  } else if (automation.status === 'possibly_automated' && quoted) {
    lines.push(`Your communication refers to the following: "${quoted.quote}"${humanQuote ? ` It also states: "${humanQuote.quote}"` : ''}`);
    lines.push('');
  } else if (automation.status === 'human_indicated' && humanQuote) {
    lines.push(`Your communication states: "${humanQuote.quote}"`);
    lines.push('');
  }

  lines.push('I would be grateful if you would answer the following:');
  lines.push('');

  const requests: string[] = [];

  if (automation.status === 'confirmed_automated') {
    requests.push(
      automation.involvement === 'solely_automated'
        ? 'Please confirm whether this decision was made solely by automated means, without any person reviewing it before it was issued.'
        : 'Please confirm whether this decision was made solely by the automated system you refer to, or whether a person reviewed or made the final decision — and if so, what their role was.',
    );
    requests.push('Please explain how the automated processing was used in reaching this decision, and which information about me it used.');
    requests.push('Please arrange for a person to review this decision, and let me know how I can give my view and provide any further information.');
  } else if (automation.status === 'possibly_automated') {
    requests.push('Please confirm whether automated processing, an algorithm or AI was used in making this decision, and what role it played.');
    requests.push('Please confirm whether a person made or reviewed the final decision, and what that review involved.');
    requests.push('Please let me know how I can ask for the decision to be reconsidered by a person, and give my view.');
  } else if (automation.status === 'not_established') {
    requests.push('Please confirm whether any automated or AI-assisted processing was used in making this decision.');
    requests.push('If it was, please explain what role it played in the outcome.');
    requests.push('Please confirm whether a person reviewed or made this decision.');
    requests.push('Please explain how this decision can be reviewed or challenged, including whether I can ask for it to be reconsidered by a person.');
  } else {
    requests.push('Please confirm whether any automated tools, scores or AI were used to support this decision, and if so, what role they played.');
    requests.push('Please explain how I can ask for this decision to be reconsidered, ideally by a different person.');
  }

  requests.push('Please provide the specific reasons and factors that led to the decision, including the information about me that was used.');

  // Jurisdiction references — conditional, and only where a specific jurisdiction is known.
  if (jurisdiction === 'UK' || jurisdiction === 'EU') {
    const law = jurisdiction === 'UK' ? 'the UK GDPR' : 'the GDPR';
    requests.push(
      `Please treat this letter as a request for access to the personal data you hold about me under Article 15 of ${law}.`,
    );
    if (automation.status === 'confirmed_automated') {
      requests.push(
        `If this decision was based solely on automated processing and has a legal or similarly significant effect on me, please provide meaningful information about the logic involved, and the safeguards available under ${law} — including the ability to obtain human intervention, to express my point of view and to contest the decision.`,
      );
    } else {
      requests.push(
        `If this decision was based solely on automated processing, please tell me so, and provide the information and safeguards that apply to such decisions under ${law}.`,
      );
    }
  } else if (jurisdiction === 'US') {
    if (extracted.decisionType === 'Loan / Credit Application') {
      requests.push(
        'If this is an adverse action on a credit application, please provide the statement of specific reasons required by the Equal Credit Opportunity Act and Regulation B.',
      );
    }
    requests.push(
      'If a consumer report was used in this decision, please identify the consumer reporting agency so that I can obtain a copy and dispute any inaccurate information.',
    );
  }

  requests.push('If any information used in the decision is incorrect, please correct it and reconsider the decision.');

  requests.forEach((r, i) => {
    lines.push(`${i + 1}. ${r}`);
  });
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
