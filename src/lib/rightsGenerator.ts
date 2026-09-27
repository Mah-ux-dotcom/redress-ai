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
  ExtractedData,
  JurisdictionCode,
  LegalFramework,
  RightsOption,
} from '@/types';
import { getJurisdiction, isSpecificJurisdiction } from '@/legal/jurisdictions';

const FINANCIAL_TYPES = ['Loan / Credit Application', 'Insurance Claim'];

function findFramework(jurisdiction: JurisdictionCode, predicate: (f: LegalFramework) => boolean) {
  return getJurisdiction(jurisdiction).frameworks.find(predicate);
}

export function generateRightsOptions(
  automation: AutomationAnalysis,
  jurisdiction: JurisdictionCode | null,
  extracted?: ExtractedData | null,
): RightsOption[] {
  const options: RightsOption[] = [];
  const { status, involvement } = automation;
  const specific = isSpecificJurisdiction(jurisdiction) ? jurisdiction : null;
  const isCredit = extracted?.decisionType === 'Loan / Credit Application';
  const isFinancial = !!extracted?.decisionType && FINANCIAL_TYPES.includes(extracted.decisionType);
  const unknownJurisdictionNote = 'No specific jurisdiction selected — rights where you are may differ.';

  // --- Option 1: Clarify the role of automation ---
  if (status === 'not_established' || status === 'possibly_automated') {
    options.push({
      id: 'ask_automation',
      title: 'Ask whether automated processing or AI was used — and what role it played',
      explanation:
        status === 'not_established'
          ? 'The notice does not say how the decision was made. Ask the organisation whether any automated system, algorithm or AI was involved, what it did, and whether a person reviewed the outcome.'
          : 'The notice suggests automated tools were involved but does not establish their role. Ask whether the system made the decision or only informed a person, and what that person did.',
      whyItMatters:
        'Some rights depend on how the decision was made — in particular whether it was solely automated. The answer tells you which routes may be open to you.',
      confidence: status === 'possibly_automated' ? 'high' : 'medium',
      jurisdictionContext: jurisdiction ?? undefined,
      source: specific ? findFramework(specific, (f) => f.scope === 'data_rights')?.source : 'General procedural guidance',
    });
  } else if (status === 'confirmed_automated') {
    options.push({
      id: 'ask_human_involvement',
      title: 'Ask whether a person was involved in the final decision',
      explanation:
        involvement === 'solely_automated'
          ? 'The notice indicates the decision was made without a person. Ask the organisation to confirm this in writing.'
          : 'The notice confirms automated processing was used but does not say whether a person made or reviewed the final decision. Ask them to confirm.',
      whyItMatters:
        'Whether a decision was solely automated or AI-assisted can affect which safeguards apply.',
      confidence: 'high',
      jurisdictionContext: jurisdiction ?? undefined,
      source: specific ? findFramework(specific, (f) => f.scope === 'solely_automated')?.source : undefined,
    });
  } else {
    options.push({
      id: 'ask_automation',
      title: 'Ask whether automated tools supported the decision',
      explanation:
        'The notice says a person was involved. You can still ask whether any score, risk flag or automated tool informed their decision.',
      whyItMatters: 'Knowing what information the decision-maker relied on helps you respond to it.',
      confidence: 'low',
      jurisdictionContext: jurisdiction ?? undefined,
    });
  }

  // --- Option 2: Request the information the decision was based on ---
  if (specific === 'UK' || specific === 'EU') {
    const access = findFramework(specific, (f) => f.scope === 'data_rights');
    options.push({
      id: 'request_info',
      title: 'Request a copy of your personal data (subject access request)',
      explanation:
        'You can ask for a copy of the personal data the organisation holds about you, whether or not automation was used. ' +
        (status === 'confirmed_automated'
          ? 'If the decision turns out to be solely automated and significant, you can also ask for meaningful information about the logic involved.'
          : 'If the organisation confirms the decision was solely automated and significant, you can also ask for meaningful information about the logic involved.'),
      whyItMatters:
        'You can check whether the information used about you was accurate and complete. Organisations usually have one month to respond.',
      confidence: 'high',
      jurisdictionContext: specific,
      source: access?.source,
    });
  } else if (specific === 'US') {
    options.push({
      id: 'request_info',
      title: isCredit ? 'Get the reasons and any consumer report used' : 'Ask what information the decision was based on',
      explanation: isCredit
        ? 'For a credit denial, the creditor must give specific reasons, or tell you how to ask for them within 60 days. If a consumer report was used, you can get a free copy if you ask within 60 days and dispute any errors.'
        : 'There is no general federal right to see the information behind every decision. If a consumer report (for example a background or credit check) was used, the FCRA gives you notice and dispute rights. Some state privacy laws give access rights.',
      whyItMatters: 'Inaccurate data is one of the most common and most fixable reasons for an unfair decision.',
      confidence: isCredit ? 'high' : 'medium',
      jurisdictionContext: 'US',
      source: isCredit
        ? findFramework('US', (f) => f.shortName === 'ECOA / Reg. B')?.source
        : findFramework('US', (f) => f.shortName === 'FCRA')?.source,
    });
  } else {
    options.push({
      id: 'request_info',
      title: 'Ask for the information the decision was based on',
      explanation:
        'Ask the organisation what information about you it used. In many jurisdictions you can also ask for a copy of the personal data an organisation holds about you.',
      whyItMatters: 'You cannot check whether the decision was fair without knowing what it was based on.',
      confidence: 'medium',
      jurisdictionContext: jurisdiction ?? undefined,
      source: `General procedural guidance. ${unknownJurisdictionNote}`,
    });
  }

  // --- Option 3: Human review ---
  if (status !== 'human_indicated') {
    let explanation: string;
    let source: string | undefined;
    let confidence: RightsOption['confidence'] = 'medium';
    if (specific === 'UK' || specific === 'EU') {
      const art22 = findFramework(specific, (f) => f.scope === 'solely_automated');
      source = art22?.source;
      if (involvement === 'solely_automated') {
        confidence = 'high';
        explanation =
          'The notice indicates the decision was made without a person. If it was based solely on automated processing and has a legal or similarly significant effect on you, the law requires safeguards that include being able to obtain human intervention, give your view and contest the decision.';
      } else {
        explanation =
          'Human intervention is a legal safeguard only for decisions based solely on automated processing that significantly affect you. The notice does not establish that this decision was solely automated, so ask for a review by a person and ask the organisation to confirm how the decision was made.';
      }
    } else if (specific === 'US') {
      source = findFramework('US', (f) => f.shortName === 'State laws')?.source;
      confidence = 'low';
      explanation =
        'There is no general federal right to human review of an automated decision. Some state laws provide an appeal with human review in limited cases. You can still ask whether the organisation offers a review by a person.';
    } else {
      source = `General procedural guidance. ${unknownJurisdictionNote}`;
      explanation =
        'You can ask for a person to review the decision. Whether the organisation has to provide this depends on your jurisdiction and the type of decision.';
    }
    options.push({
      id: 'request_human_review',
      title: 'Request review of the decision by a person',
      explanation,
      whyItMatters:
        'A person can consider your circumstances and any information that was missed or wrong.',
      confidence,
      jurisdictionContext: jurisdiction ?? undefined,
      source,
    });
  } else {
    options.push({
      id: 'request_reconsideration',
      title: 'Ask for reconsideration, ideally by a different person',
      explanation:
        'Use the organisation’s appeal or review process and explain what you think was missed or wrong.',
      whyItMatters: 'A fresh review can correct mistakes, especially if you provide new or clarifying information.',
      confidence: 'medium',
      jurisdictionContext: jurisdiction ?? undefined,
    });
  }

  // --- Option 4: EU AI Act explanation (only where automation/AI is at least possible) ---
  if (specific === 'EU' && (status === 'confirmed_automated' || status === 'possibly_automated')) {
    const aiAct = findFramework('EU', (f) => f.scope === 'ai_system');
    options.push({
      id: 'ai_act_explanation',
      title: 'Ask whether a high-risk AI system was used',
      explanation:
        'If the decision was based on output from a high-risk AI system (for example creditworthiness assessment or employment screening) and significantly affects you, the AI Act may give you a right to an explanation of the AI system’s role. This depends on the system’s classification and on which provisions are in force.',
      whyItMatters: 'This could give you an explanation route in addition to data protection law.',
      confidence: 'low',
      jurisdictionContext: 'EU',
      source: aiAct?.source,
    });
  }

  // --- Option 5: Ask for the reasons or factors considered ---
  options.push({
    id: 'request_reasons',
    title: 'Ask for the specific reasons and factors considered',
    explanation:
      'Ask the organisation which criteria or factors led to the decision and how they applied to you.',
    whyItMatters:
      'This helps you spot incorrect or outdated information and respond to the actual reasons.',
    confidence: 'high',
    jurisdictionContext: jurisdiction ?? undefined,
    source:
      specific === 'US' && isCredit
        ? findFramework('US', (f) => f.shortName === 'ECOA / Reg. B')?.source
        : undefined,
  });

  // --- Option 6: Submit a formal challenge ---
  options.push({
    id: 'submit_challenge',
    title: 'Submit a formal written challenge',
    explanation:
      'Send a written request for review that sets out the questions above. REDRESS drafts one for you based only on what the notice says.',
    whyItMatters:
      'A written request creates a record and a timeline, and is usually required before a regulator or ombudsman will look at a complaint.',
    confidence: 'high',
    jurisdictionContext: jurisdiction ?? undefined,
  });

  // --- Option 7: Preserve the original decision and supporting evidence ---
  options.push({
    id: 'preserve_evidence',
    title: 'Preserve the original decision and supporting evidence',
    explanation:
      'Keep the original decision notice, any related emails or documents, and records of your communications with the organisation.',
    whyItMatters:
      'Evidence matters if you need to escalate. REDRESS provides an Evidence Vault to help you organise it.',
    confidence: 'high',
  });

  // --- Option 8: Escalate (if unresolved) ---
  let escalateText: string;
  let escalateSource: string | undefined;
  if (specific === 'UK') {
    escalateText =
      'If the organisation does not resolve your concern about how your data was used, you can complain to the Information Commissioner’s Office (ICO).';
    escalateSource = findFramework('UK', (f) => f.shortName === 'ICO complaint')?.source;
    if (isFinancial) {
      escalateText +=
        ' Because this appears to be a financial services decision, you may also be able to refer a complaint to the Financial Ombudsman Service after the firm’s final response or after 8 weeks.';
      escalateSource += `; ${findFramework('UK', (f) => f.shortName === 'Financial Ombudsman')?.source}`;
    }
  } else if (specific === 'EU') {
    escalateText =
      'If the organisation does not resolve your concern, you can complain to a Data Protection Authority — for example, in the country where you live or work.';
    escalateSource = findFramework('EU', (f) => f.shortName === 'DPA complaint')?.source;
  } else if (specific === 'US') {
    escalateText = isFinancial
      ? 'If the organisation does not resolve it, you can submit a complaint to the CFPB (for consumer financial products) or your state Attorney General.'
      : 'If the organisation does not resolve it, you can contact your state Attorney General’s consumer protection office or the relevant sector regulator.';
    escalateSource = findFramework('US', (f) => f.shortName === 'Agency complaints')?.source;
  } else {
    escalateText =
      'If the organisation does not resolve it, look for the data protection, consumer or financial regulator or ombudsman where you live. Which one applies depends on your jurisdiction.';
    escalateSource = `General procedural guidance. ${unknownJurisdictionNote}`;
  }
  options.push({
    id: 'escalate',
    title: 'Escalate if the organisation does not resolve it',
    explanation: escalateText,
    whyItMatters:
      'Regulators and ombudsmen are independent of the organisation. They usually expect you to use the organisation’s own process first.',
    confidence: 'medium',
    jurisdictionContext: jurisdiction ?? undefined,
    source: escalateSource,
  });

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
        'Ask whether a person was involved in the final decision',
        'Ask how the automated processing was used',
        'Request review by a person',
        'Challenge inaccurate information',
        'Request the specific factors considered',
      ];
    case 'possibly_automated':
      return [
        'Ask what role the automated tools played',
        'Request review by a person, if available',
        'Request the specific factors considered',
        'Submit a formal challenge',
      ];
    case 'not_established':
      return [
        'Ask whether automated processing or AI was used, and what role it played',
        'Ask whether a person reviewed the decision',
        'Request the information and reasons the decision was based on',
        'Ask for reconsideration by a person, if available',
        'Preserve the original decision and all evidence',
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
