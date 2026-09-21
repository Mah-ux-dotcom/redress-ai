// ============================================================================
// REDRESS — Legal Reference Data
//
// This module contains curated, factual reference information about rights
// frameworks relevant to automated decision-making. It is NOT legal advice.
// Every right is phrased as "may have a right to" — never as a definitive
// legal conclusion.
// ============================================================================

import type { JurisdictionCode, LegalReference } from '@/types';

export const JURISDICTIONS: LegalReference[] = [
  {
    code: 'UK',
    label: 'United Kingdom',
    flag: '🇬🇧',
    disclaimer:
      'This information is based on UK data protection law and is potentially relevant. It is not legal advice. Verify with the ICO or a qualified advisor.',
    frameworks: [
      {
        name: 'UK GDPR — Article 22',
        shortName: 'UK GDPR Art. 22',
        description:
          'Provides protections for individuals regarding decisions based solely on automated processing, including profiling, that produce legal or similarly significant effects.',
        rights: [
          'Right to not be subject to a decision based solely on automated processing (with exceptions)',
          'Right to obtain human intervention',
          'Right to express your point of view',
          'Right to contest the decision',
        ],
        source: 'UK GDPR, Article 22',
        applicableWhen: 'The decision is based solely on automated processing and has legal or similarly significant effects.',
      },
      {
        name: 'UK GDPR — Articles 13–15',
        shortName: 'UK GDPR Arts. 13–15',
        description:
          'Provides transparency rights — the right to be informed about automated decision-making and the right to access the logic involved.',
        rights: [
          'Right to be informed about the existence of automated decision-making',
          'Right to access meaningful information about the logic involved',
          'Right to access the significance and envisaged consequences of the processing',
        ],
        source: 'UK GDPR, Articles 13(2)(f), 14(2)(g), 15(1)(h)',
        applicableWhen: 'Automated processing is used to make decisions about you, regardless of whether it is solely automated.',
      },
      {
        name: 'Data Protection Act 2018',
        shortName: 'DPA 2018',
        description:
          'The UK legislation that supplements the UK GDPR, providing additional safeguards and the role of the Information Commissioner.',
        rights: [
          'Right to lodge a complaint with the Information Commissioner\u2019s Office (ICO)',
          'Additional safeguards for automated decisions in specific contexts',
        ],
        source: 'Data Protection Act 2018',
        applicableWhen: 'You have concerns about how your data was used in an automated decision.',
      },
    ],
  },
  {
    code: 'EU',
    label: 'European Union',
    flag: '🇪🇺',
    disclaimer:
      'This information is based on EU data protection law and is potentially relevant. It is not legal advice. Verify with your national Data Protection Authority or a qualified advisor.',
    frameworks: [
      {
        name: 'GDPR — Article 22',
        shortName: 'GDPR Art. 22',
        description:
          'Provides protections against decisions based solely on automated processing, including profiling, that produce legal or similarly significant effects.',
        rights: [
          'Right to not be subject to a decision based solely on automated processing (with exceptions)',
          'Right to obtain human intervention',
          'Right to express your point of view',
          'Right to contest the decision',
        ],
        source: 'GDPR, Article 22',
        applicableWhen: 'The decision is based solely on automated processing and has legal or similarly significant effects.',
      },
      {
        name: 'GDPR — Articles 13–15',
        shortName: 'GDPR Arts. 13–15',
        description:
          'Transparency rights — the right to be informed about and to access information about automated decision-making.',
        rights: [
          'Right to be informed about the existence of automated decision-making',
          'Right to access meaningful information about the logic involved',
          'Right to access the significance and envisaged consequences',
        ],
        source: 'GDPR, Articles 13(2)(f), 14(2)(g), 15(1)(h)',
        applicableWhen: 'Automated processing is used to make decisions about you.',
      },
      {
        name: 'AI Act (Regulation 2024/1689)',
        shortName: 'EU AI Act',
        description:
          'Regulates AI systems in the EU, classifying certain uses as high-risk and imposing transparency and human oversight requirements.',
        rights: [
          'Right to be informed when interacting with an AI system (transparency obligation)',
          'Right to human oversight for high-risk AI systems',
          'Right to lodge a complaint with a national supervisory authority',
        ],
        source: 'Regulation (EU) 2024/1689 (AI Act)',
        applicableWhen: 'The decision involves an AI system classified as high-risk under the AI Act.',
      },
    ],
  },
  {
    code: 'US',
    label: 'United States',
    flag: '🇺🇸',
    disclaimer:
      'The US has no single federal automated decision-making law. Rights vary by state and sector. This information is potentially relevant. It is not legal advice. Verify with the relevant agency or a qualified attorney.',
    frameworks: [
      {
        name: 'Fair Credit Reporting Act (FCRA)',
        shortName: 'FCRA',
        description:
          'Regulates consumer reporting agencies and gives consumers rights when adverse actions are taken based on credit reports or consumer reports.',
        rights: [
          'Right to a notice of adverse action (if denied based on a consumer report)',
          'Right to obtain a copy of the consumer report used',
          'Right to dispute inaccurate information',
          'Right to a free copy of your report within 60 days of an adverse action',
        ],
        source: '15 U.S.C. \u00a7 1681 et seq. (FCRA)',
        applicableWhen: 'The decision involves credit, insurance, employment, or other decisions based on a consumer report.',
      },
      {
        name: 'Equal Credit Opportunity Act (ECOA)',
        shortName: 'ECOA',
        description:
          'Prohibits discrimination in credit transactions and requires creditors to provide specific reasons for adverse credit decisions.',
        rights: [
          'Right to a statement of specific reasons for credit denial within 30 days',
          'Right to know if a credit scoring system was used',
          'Right to a free credit report if denied credit',
        ],
        source: '15 U.S.C. \u00a7 1691 et seq. (ECOA)',
        applicableWhen: 'The decision is a credit denial or adverse credit decision.',
      },
      {
        name: 'State-level AI and Automated Decision Laws',
        shortName: 'State AI Laws',
        description:
          'Several US states have enacted laws governing automated decision-making, AI transparency, and consumer rights. These vary significantly.',
        rights: [
          'Right to opt out of profiling under certain state laws (e.g., Colorado AI Act)',
          'Right to be informed about automated decision-making (varies by state)',
          'Right to request human review (varies by state and sector)',
        ],
        source: 'e.g., Colorado AI Act (SB 24-205), California Consumer Privacy Act (as amended)',
        applicableWhen: 'You are in a state with applicable AI or automated decision-making protections.',
      },
      {
        name: 'CFPB — Adverse Action Notice Requirements',
        shortName: 'CFPB Rules',
        description:
          'The Consumer Financial Protection Bureau has clarified that adverse action notices must disclose when AI or automated models contributed to a denial.',
        rights: [
          'Right to receive an adverse action notice that accurately describes the reasons for denial',
          'Right to know if a complex algorithm or AI model was used',
        ],
        source: 'CFPB Circular 2022-03; Regulation B (\u00a71002.9)',
        applicableWhen: 'The decision is a credit denial and a creditor used AI or automated models.',
      },
    ],
  },
  {
    code: 'GENERAL',
    label: 'General / Other',
    flag: '🌐',
    disclaimer:
      'No specific jurisdiction selected. The following are general principles that may be relevant in many jurisdictions. This is not legal advice. Identify your local jurisdiction and verify with the relevant authority.',
    frameworks: [
      {
        name: 'General Transparency Principle',
        shortName: 'Transparency',
        description:
          'Many jurisdictions require organizations to inform individuals when automated processing is used to make decisions about them.',
        rights: [
          'Right to ask whether automated decision-making was used',
          'Right to request information about the logic and factors involved',
          'Right to ask whether human review is available',
        ],
        source: 'General data protection principles (various jurisdictions)',
        applicableWhen: 'Always potentially relevant — transparency is a widely recognized principle.',
      },
      {
        name: 'General Human Review Principle',
        shortName: 'Human Review',
        description:
          'Many frameworks provide a right to human intervention when decisions are made by automated systems, particularly if they have significant effects.',
        rights: [
          'Right to request human review of an automated decision',
          'Right to express your point of view',
          'Right to contest the decision',
        ],
        source: 'General data protection principles (various jurisdictions)',
        applicableWhen: 'When an automated decision has been made and human review may be available.',
      },
      {
        name: 'General Complaint / Escalation Principle',
        shortName: 'Complaints',
        description:
          'Most jurisdictions have a regulatory body or ombudsman that handles complaints about organizations, data processing, or unfair decisions.',
        rights: [
          'Right to lodge a complaint with a relevant regulator',
          'Right to escalate to an independent body if the organization does not resolve your complaint',
        ],
        source: 'General consumer protection principles (various jurisdictions)',
        applicableWhen: 'When you have exhausted the organization\u2019s internal complaints process.',
      },
    ],
  },
];

export function getJurisdiction(code: JurisdictionCode): LegalReference {
  return JURISDICTIONS.find((j) => j.code === code) ?? JURISDICTIONS[3];
}
