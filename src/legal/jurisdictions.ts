// ============================================================================
// REDRESS — Legal Reference Data
//
// Curated reference information about frameworks relevant to automated and
// AI-assisted decisions. It is NOT legal advice.
//
// Every framework records:
//   - scope          what kind of decision it is about (solely automated,
//                    high-risk AI system, data rights, credit, complaints)
//   - applicableWhen the conditions that must be met
//   - limitations    what it does NOT cover
//   - humanReview    whether human review is required, available or absent
//   - currency       commencement / amendment status as last reviewed
//
// Rights are phrased conditionally ("may", "where") — never as definitive
// legal conclusions about the user's case.
//
// Last reviewed: September 2026. Law in this area changes quickly; each
// entry's `currency` note says what to check.
// ============================================================================

import type { JurisdictionCode, LegalReference } from '@/types';

export const LEGAL_REFERENCE_LAST_REVIEWED = 'September 2026';

export const JURISDICTIONS: LegalReference[] = [
  {
    code: 'UK',
    label: 'United Kingdom',
    flag: '🇬🇧',
    disclaimer:
      'Based on UK data protection law. Whether any of it applies depends on the facts of your decision. It is not legal advice — check ICO guidance or a qualified adviser.',
    frameworks: [
      {
        name: 'UK GDPR — automated decision-making safeguards (Art. 22 / Arts. 22A–22D)',
        shortName: 'UK GDPR Art. 22 / 22A–22D',
        description:
          'Safeguards for significant decisions based solely on automated processing — that is, with no meaningful human involvement. The Data (Use and Access) Act 2025 replaces Article 22 with Articles 22A–22D; the core safeguards for individuals continue.',
        rights: [
          'Where a significant decision about you is based solely on automated processing, the organisation must provide safeguards, including telling you about the decision',
          'Those safeguards include enabling you to make representations (give your side)',
          'Those safeguards include enabling you to obtain human intervention',
          'Those safeguards include enabling you to contest the decision',
        ],
        source: 'UK GDPR Art. 22; Arts. 22A–22D as inserted by the Data (Use and Access) Act 2025',
        applicableWhen:
          'The decision was based solely on automated processing (no meaningful human involvement) and has a legal or similarly significant effect on you.',
        scope: 'solely_automated',
        limitations:
          'Does not apply where a person meaningfully made or reviewed the decision. Whether an effect is "similarly significant" depends on the facts. Stricter limits apply where special category data is used.',
        humanReview:
          'Human intervention is a required safeguard for qualifying solely automated decisions. It is not a general right to human review of every decision.',
        currency:
          'The Data (Use and Access) Act 2025 received Royal Assent on 19 June 2025 and is being brought into force in stages. Which version applies can depend on the date of your decision — check current ICO guidance.',
      },
      {
        name: 'UK GDPR — right of access and transparency (Arts. 13–15)',
        shortName: 'UK GDPR Arts. 13–15',
        description:
          'You can ask an organisation for a copy of the personal data it holds about you. Where qualifying solely automated decision-making is used, you are also entitled to be told it exists and to receive meaningful information about the logic involved.',
        rights: [
          'You can request a copy of the personal data the organisation holds about you (a subject access request) — whether or not automation was used',
          'Where qualifying solely automated decision-making is used, you can ask to be told that it exists',
          'In that case, you can also ask for meaningful information about the logic involved and its significance and likely consequences for you',
        ],
        source: 'UK GDPR Arts. 13(2)(f), 14(2)(g), 15(1)(h) and 15(3)',
        applicableWhen:
          'The right of access applies to any organisation processing your personal data. The "logic involved" information applies to qualifying solely automated decisions.',
        scope: 'data_rights',
        limitations:
          'Exemptions apply (for example, other people’s data). Organisations usually have one month to respond, which can be extended in some cases. The "logic involved" information is tied to qualifying solely automated decisions, not to every use of automated tools.',
        humanReview: 'Does not itself provide human review.',
        currency: 'In force. Cross-references updated by the Data (Use and Access) Act 2025.',
      },
      {
        name: 'Complaint to the Information Commissioner’s Office (ICO)',
        shortName: 'ICO complaint',
        description:
          'The ICO is the UK regulator for data protection. You can complain to it about how an organisation has used your personal data, including in automated decisions.',
        rights: ['You can complain to the ICO about how your personal data was used'],
        source: 'UK GDPR Art. 77; Data Protection Act 2018, s. 165',
        applicableWhen: 'You have a concern about how your personal data was used and the organisation has not resolved it.',
        scope: 'complaints',
        limitations:
          'The ICO usually expects you to raise the concern with the organisation first. It looks at data protection compliance; it does not usually overturn the underlying decision.',
        humanReview: 'Not applicable.',
        currency:
          'In force. The Data (Use and Access) Act 2025 adds a requirement for organisations to handle data protection complaints themselves first (commenced in stages).',
      },
      {
        name: 'Financial Ombudsman Service (financial services decisions)',
        shortName: 'Financial Ombudsman',
        description:
          'For decisions by UK-regulated financial businesses (for example lenders and insurers), you can complain to the business and then, if unresolved, to the Financial Ombudsman Service.',
        rights: [
          'You can refer an unresolved complaint to the Financial Ombudsman Service after the firm’s final response, or once 8 weeks have passed',
        ],
        source: 'Financial Services and Markets Act 2000, Part XVI; FCA Handbook DISP',
        applicableWhen: 'The decision was made by a UK-regulated financial services business.',
        scope: 'complaints',
        limitations:
          'You must complain to the business first. Time limits apply — generally 6 months from the firm’s final response.',
        humanReview: 'The Ombudsman reviews the complaint independently; it is not a review by the organisation.',
        currency: 'In force.',
      },
    ],
  },
  {
    code: 'EU',
    label: 'European Union',
    flag: '🇪🇺',
    disclaimer:
      'Based on EU law. National rules and the facts of your decision affect whether any of it applies. It is not legal advice — check your national Data Protection Authority or a qualified adviser.',
    frameworks: [
      {
        name: 'GDPR — Article 22 (solely automated decisions)',
        shortName: 'GDPR Art. 22',
        description:
          'Gives you the right not to be subject to a decision based solely on automated processing, including profiling, that produces legal or similarly significant effects — subject to exceptions.',
        rights: [
          'Right not to be subject to a decision based solely on automated processing that has legal or similarly significant effects — unless an exception applies (contract, authorised by law, or explicit consent)',
          'Where the contract or consent exception is relied on, the organisation must at least let you obtain human intervention',
          'In that case, you can also express your point of view and contest the decision',
        ],
        source: 'GDPR (Regulation (EU) 2016/679), Art. 22',
        applicableWhen:
          'The decision was based solely on automated processing (no meaningful human involvement) and has a legal or similarly significant effect on you.',
        scope: 'solely_automated',
        limitations:
          'Only covers decisions "based solely" on automated processing with legal or similarly significant effects. The Court of Justice has held that a credit score produced by a third party can itself count as such a decision where it plays a determining role (SCHUFA, C-634/21, 2023).',
        humanReview:
          'Human intervention is a required safeguard for qualifying decisions (Art. 22(3)). It is not a general right to human review of every decision.',
        currency:
          'In force. Amendments to the GDPR, including Article 22, were proposed in the EU "Digital Omnibus" (November 2025) — check whether any changes have taken effect.',
      },
      {
        name: 'GDPR — right of access and transparency (Arts. 13–15)',
        shortName: 'GDPR Arts. 13–15',
        description:
          'You can ask for a copy of your personal data. Where Article 22-type automated decision-making is used, you are also entitled to meaningful information about the logic involved.',
        rights: [
          'You can request access to, and a copy of, the personal data the organisation holds about you — whether or not automation was used',
          'Where Article 22-type automated decision-making is used, you can ask for meaningful information about the logic involved and its significance and likely consequences for you',
        ],
        source: 'GDPR Arts. 13(2)(f), 14(2)(g), 15(1)(h) and 15(3)',
        applicableWhen:
          'Access applies to any organisation processing your personal data. The "logic involved" information applies to Article 22-type decisions.',
        scope: 'data_rights',
        limitations:
          'Organisations usually have one month to respond (extendable by two months in some cases). The Court of Justice has said the explanation must describe the procedure and principles actually applied (Dun & Bradstreet Austria, C-203/22, 2025); trade secrets may limit what is disclosed directly to you.',
        humanReview: 'Does not itself provide human review.',
        currency: 'In force.',
      },
      {
        name: 'EU AI Act (Regulation (EU) 2024/1689) — high-risk AI systems',
        shortName: 'EU AI Act',
        description:
          'Regulates AI systems. For decisions based on output from certain high-risk AI systems (for example creditworthiness assessment, employment, access to essential services), it gives individuals some information and explanation rights.',
        rights: [
          'Where a decision based on output from a listed (Annex III) high-risk AI system has legal or similarly significant effects on you, you may be entitled to a clear and meaningful explanation of the AI system’s role (Art. 86)',
          'Organisations using certain high-risk AI systems to make or assist decisions about people must inform those people (Art. 26(11))',
          'You may complain to a market surveillance authority (Art. 85)',
        ],
        source: 'Regulation (EU) 2024/1689, Arts. 26, 85, 86 and Annex III',
        applicableWhen: 'The decision involved a high-risk AI system as defined in the AI Act.',
        scope: 'ai_system',
        limitations:
          'Only applies to high-risk AI systems as defined in the Act; many automated tools are not high-risk. Art. 86 does not apply where other EU law already provides the right.',
        humanReview:
          'The Act requires organisations to ensure human oversight of high-risk systems (Arts. 14, 26). That is an obligation on the organisation, not an individual right to demand human review.',
        currency:
          'Applies in stages. Most high-risk obligations were scheduled to apply from 2 August 2026, but postponement was proposed in the Digital Omnibus (November 2025) — check which provisions are in force for your decision date.',
      },
      {
        name: 'Complaint to a Data Protection Authority',
        shortName: 'DPA complaint',
        description:
          'Each EU member state has a Data Protection Authority that handles complaints about the use of personal data.',
        rights: ['You can complain to a Data Protection Authority, for example in the country where you live or work'],
        source: 'GDPR Art. 77',
        applicableWhen: 'You believe your personal data was used unlawfully, including in an automated decision.',
        scope: 'complaints',
        limitations: 'Authorities look at data protection compliance; they do not usually overturn the underlying decision.',
        humanReview: 'Not applicable.',
        currency: 'In force.',
      },
    ],
  },
  {
    code: 'US',
    label: 'United States',
    flag: '🇺🇸',
    disclaimer:
      'The US has no single federal law on automated decisions. Rights depend on the sector (for example credit) and your state. It is not legal advice — check the relevant agency or a qualified attorney.',
    frameworks: [
      {
        name: 'Fair Credit Reporting Act (FCRA)',
        shortName: 'FCRA',
        description:
          'Applies where a decision about credit, insurance, employment or housing is based in whole or in part on a consumer report (for example a credit report or background check).',
        rights: [
          'If an adverse action is based on a consumer report, you should receive an adverse action notice identifying the reporting agency',
          'You can get a free copy of that report if you ask within 60 days',
          'You can dispute inaccurate or incomplete information with the reporting agency',
          'If a credit score was used, the notice should disclose the score and the key factors that adversely affected it',
        ],
        source: '15 U.S.C. § 1681 et seq. (FCRA), including §§ 1681i, 1681j and 1681m',
        applicableWhen: 'The decision was based in whole or in part on a consumer report.',
        scope: 'credit',
        limitations:
          'Only applies where a consumer report was used. It does not address whether the decision was automated.',
        humanReview: 'No right to human review.',
        currency: 'In force.',
      },
      {
        name: 'Equal Credit Opportunity Act (ECOA) and Regulation B',
        shortName: 'ECOA / Reg. B',
        description:
          'Prohibits discrimination in credit and requires creditors to give specific reasons when they deny credit or take other adverse action.',
        rights: [
          'If credit is denied, you are entitled to a statement of specific reasons — or to be told you can ask for them within 60 days',
          'The reasons must be specific and accurate. The CFPB has said this applies even where complex algorithms or AI models are used',
        ],
        source: '15 U.S.C. § 1691 et seq. (ECOA); 12 C.F.R. § 1002.9 (Regulation B); CFPB Circulars 2022-03 and 2023-03',
        applicableWhen: 'The decision is a credit denial or other adverse credit action.',
        scope: 'credit',
        limitations:
          'Credit decisions only. Where you are told you can ask for reasons, the creditor has 30 days from your request to provide them.',
        humanReview: 'No right to human review.',
        currency:
          'ECOA and Regulation B are in force. The status of CFPB guidance documents has changed since 2025 — rely on Regulation B itself.',
      },
      {
        name: 'State automated decision-making and privacy laws',
        shortName: 'State laws',
        description:
          'Some states regulate automated decisions or profiling. Coverage, thresholds and rights vary significantly, and many states have no such law.',
        rights: [
          'Under some state privacy laws, you may be able to opt out of profiling used for significant decisions',
          'Under the Colorado AI Act, consequential decisions made using high-risk AI systems may come with notice, explanation, correction and appeal rights',
          'Human review is available only where a specific state law provides it (for example, the Colorado AI Act provides an appeal that allows human review where technically feasible)',
        ],
        source:
          'e.g. Colorado AI Act (SB 24-205, as amended); Colorado Privacy Act; California CCPA regulations on automated decision-making technology',
        applicableWhen: 'You are in a state with applicable law and the organisation is covered by it.',
        scope: 'ai_system',
        limitations:
          'Varies by state, sector and business size. Many states have no automated decision-making law.',
        humanReview: 'Varies — available only where a specific state law provides it.',
        currency:
          'Changing quickly. The Colorado AI Act’s effective date was delayed to 30 June 2026 and further amendments have been proposed. California’s automated decision-making regulations phase in from 2027. Check current state law.',
      },
      {
        name: 'Complaints to federal and state agencies',
        shortName: 'Agency complaints',
        description:
          'The Consumer Financial Protection Bureau (CFPB) accepts complaints about consumer financial products. State Attorneys General handle consumer protection complaints.',
        rights: [
          'You can submit a complaint to the CFPB about credit and other consumer financial products',
          'You can contact your state Attorney General’s consumer protection office',
        ],
        source: 'CFPB consumer complaint process (12 U.S.C. § 5534); state consumer protection law',
        applicableWhen: 'The organisation has not resolved your concern.',
        scope: 'complaints',
        limitations: 'Agencies may forward complaints to the company. They do not always resolve individual disputes.',
        humanReview: 'Not applicable.',
        currency: 'In force.',
      },
    ],
  },
  {
    code: 'GENERAL',
    label: 'General / Not sure',
    flag: '🌐',
    disclaimer:
      'No specific jurisdiction selected. The steps below are general procedural guidance, not legal rights — rights in your jurisdiction may be different. Identify your local jurisdiction and check with the relevant authority.',
    frameworks: [
      {
        name: 'Ask about automation and the reasons',
        shortName: 'Transparency request',
        description:
          'Many data protection laws require organisations to tell people when automated decision-making is used. Whether yours does depends on where you are.',
        rights: [
          'You can ask whether automated processing or AI was used, and what role it played',
          'You can ask for the reasons and the information the decision was based on',
        ],
        source: 'General procedural guidance (not a specific law)',
        applicableWhen: 'Always a reasonable first step — asking does not depend on a particular law.',
        scope: 'general',
        limitations: 'Whether the organisation must answer depends on your jurisdiction.',
        humanReview: 'Not applicable.',
        currency: 'Not applicable.',
      },
      {
        name: 'Ask for a review by a person',
        shortName: 'Review request',
        description:
          'Some frameworks require human intervention for certain solely automated decisions. Elsewhere, organisations often offer a review or appeal process voluntarily.',
        rights: [
          'You can ask whether a review by a person is available, and how to request it',
          'You can give your side and any information you think was missed',
        ],
        source: 'General procedural guidance (not a specific law)',
        applicableWhen: 'Useful whenever you think the decision is wrong or incomplete.',
        scope: 'general',
        limitations: 'Whether human review must be provided depends on your jurisdiction and the type of decision.',
        humanReview: 'Can be requested. Whether it must be provided depends on your jurisdiction.',
        currency: 'Not applicable.',
      },
      {
        name: 'Complain and escalate',
        shortName: 'Complaints',
        description:
          'Most jurisdictions have a regulator or ombudsman for data protection, consumer or financial complaints.',
        rights: [
          'You can use the organisation’s complaints process',
          'You can escalate to a relevant regulator or ombudsman if the complaint is not resolved',
        ],
        source: 'General procedural guidance (not a specific law)',
        applicableWhen: 'Once the organisation’s own process has been tried.',
        scope: 'complaints',
        limitations: 'Which body is relevant depends on your jurisdiction and the sector.',
        humanReview: 'Not applicable.',
        currency: 'Not applicable.',
      },
    ],
  },
];

export function getJurisdiction(code: JurisdictionCode): LegalReference {
  return JURISDICTIONS.find((j) => j.code === code) ?? JURISDICTIONS[3];
}

/** True when a specific jurisdiction's law can be referenced (not unknown/general). */
export function isSpecificJurisdiction(code: JurisdictionCode | null): code is 'UK' | 'EU' | 'US' {
  return code === 'UK' || code === 'EU' || code === 'US';
}
