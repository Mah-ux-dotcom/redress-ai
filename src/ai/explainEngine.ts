// ============================================================================
// REDRESS — AI Explanation Engine (Boundary Layer)
//
// This module provides explanations for the "Explain It To Me" feature.
// It answers only from:
//   - the provided decision text
//   - extracted structured data
//   - selected jurisdiction information
//   - approved legal/reference material
//
// It must NOT invent law, deadlines, organizations, or evidence.
// All answers are generated deterministically from the structured data.
// ============================================================================

import type { AutomationAnalysis, ExplainResponse, ExtractedData, JurisdictionCode } from '@/types';
import { getJurisdiction, isSpecificJurisdiction } from '@/legal/jurisdictions';
import { INVOLVEMENT_META, STATUS_META } from '@/lib/analyze';

interface ExplainParams {
  question: string;
  extracted: ExtractedData;
  automation: AutomationAnalysis;
  jurisdiction: JurisdictionCode | null;
}

/**
 * The core four-part explanation:
 *   1. What happened?
 *   2. What evidence do we have about automation?
 *   3. What does that evidence NOT prove?
 *   4. What can I do next?
 * Built only from the extracted data and the traceable automation signals.
 */
export function explainFourPart({ extracted, automation, jurisdiction }: ExplainParams): ExplainResponse {
  const sources: string[] = ['Provided decision text'];
  const caveats: string[] = [];

  // 1. What happened?
  const happened: string[] = [];
  happened.push(
    `${extracted.organization ?? 'An organisation'} sent you a decision${extracted.date ? ` dated ${extracted.date}` : ''}` +
      (extracted.decisionOutcome
        ? `: ${extracted.decisionOutcome.toLowerCase()}${extracted.decisionType ? ` (${extracted.decisionType.toLowerCase()})` : ''}.`
        : '.'),
  );
  happened.push(
    extracted.statedReason
      ? `The reason given: "${extracted.statedReason}".`
      : 'No clear reason was found in the text.',
  );

  // 2. What evidence do we have about automation?
  const evidence = automation.signals.filter((sig) => sig.type !== 'neutral');
  const evidenceLines =
    evidence.length > 0
      ? evidence.map((sig) => `• ${sig.text}: "${sig.quote}"`)
      : ['• The notice does not mention automated processing, algorithms, AI, or a person reviewing the decision.'];
  const neutral = automation.signals.filter((sig) => sig.type === 'neutral');
  for (const sig of neutral) evidenceLines.push(`• Not counted as evidence: "${sig.quote}" (${sig.text.toLowerCase()})`);

  // 3. What does that evidence NOT prove?
  const notProven = automation.notEstablished.map((n) => `• ${n}`);

  // 4. What can I do next?
  const next = automation.nextSteps.map((n, i) => `${i + 1}. ${n}`);

  const answer = [
    'WHAT HAPPENED',
    happened.join(' '),
    '',
    `WHAT EVIDENCE WE HAVE ABOUT AUTOMATION — ${STATUS_META[automation.status].label} (${INVOLVEMENT_META[automation.involvement].label})`,
    ...evidenceLines,
    '',
    'WHAT THIS DOES NOT PROVE',
    ...notProven,
    '',
    'WHAT YOU CAN DO NEXT',
    ...next,
  ].join('\n');

  if (isSpecificJurisdiction(jurisdiction)) {
    caveats.push(getJurisdiction(jurisdiction).disclaimer);
  } else {
    caveats.push('No specific jurisdiction selected — the steps above are general. Rights where you are may differ.');
  }
  caveats.push('Based only on the text you provided. REDRESS is an information tool, not legal advice.');

  return { question: '', answer, sources, caveats };
}

const QUESTION_PATTERNS: { keywords: string[]; handler: (p: ExplainParams) => ExplainResponse }[] = [
  {
    keywords: ['explain it to me', 'actually mean', 'what happened', 'about automation', 'not prove', 'what can i do'],
    handler: explainFourPart,
  },
  {
    keywords: ['what does this decision mean', 'what does it mean', 'explain the decision', 'what is the decision'],
    handler: ({ extracted, automation }) => {
      const parts: string[] = [];
      const sources: string[] = ['Provided decision text'];
      const caveats: string[] = [];

      if (extracted.organization) {
        parts.push(`${extracted.organization} communicated a decision to you${extracted.date ? ` on ${extracted.date}` : ''}.`);
      } else {
        parts.push('An organization communicated a decision to you.');
      }

      if (extracted.decisionOutcome && extracted.decisionType) {
        parts.push(`The outcome is: ${extracted.decisionOutcome.toLowerCase()} — regarding ${extracted.decisionType.toLowerCase()}.`);
      } else if (extracted.decisionOutcome) {
        parts.push(`The outcome is: ${extracted.decisionOutcome.toLowerCase()}.`);
      }

      if (extracted.statedReason) {
        parts.push(`The reason they gave is: "${extracted.statedReason}".`);
      } else {
        parts.push('No specific reason was provided in the text you shared.');
        caveats.push('No explicit reason was found in the decision text. You may want to request one.');
      }

      const statusLabel = STATUS_META[automation.status].label;
      parts.push(`Based on the text, the automation status is: ${statusLabel}.`);

      parts.push(automation.explanation);
      if (automation.status === 'not_established') {
        parts.push('You can ask the organisation whether automated processing or AI was used and whether a person reviewed the decision.');
      }
      caveats.push('Automation status is based solely on the text provided. It may not reflect the full process.');

      return { question: '', answer: parts.join(' '), sources, caveats };
    },
  },
  {
    keywords: ['human review', 'why request human', 'why human', 'should i request human'],
    handler: ({ automation, jurisdiction }) => {
      const sources: string[] = ['Provided decision text'];
      const caveats: string[] = [];

      let answer: string;
      if (automation.status === 'confirmed_automated') {
        answer =
          'The notice says automated processing was used. Asking for a person to review it means someone can consider your circumstances and any information the system may have missed or weighted differently. ';
      } else if (automation.status === 'possibly_automated') {
        answer =
          'Requesting human review is worth doing because the decision may have involved automated processing. Even if a human was involved, asking for (additional) human review ensures your circumstances are considered individually. ';
      } else if (automation.status === 'not_established') {
        answer =
          'Your notice does not say whether automation was used or whether a person decided. Asking for a review by a person is still worthwhile: it gives you a fresh assessment either way. Ask them to confirm how the decision was made at the same time. ';
      } else {
        answer =
          'The text indicates a human was involved, but you can still request that a different person reviews the decision, especially if you believe relevant information was not considered. ';
      }

      if (isSpecificJurisdiction(jurisdiction)) {
        const jur = getJurisdiction(jurisdiction);
        const art22 = jur.frameworks.find((f) => f.scope === 'solely_automated');
        if (art22) {
          answer +=
            automation.involvement === 'solely_automated'
              ? `If the decision was based solely on automated processing and significantly affects you, ${art22.shortName} requires safeguards including human intervention. `
              : `${art22.shortName} requires human intervention only for decisions based solely on automated processing that significantly affect you. Your notice does not establish that this decision was solely automated, so ask the organisation to confirm. `;
          sources.push(art22.source);
        } else {
          answer += 'There is no general federal right to human review of an automated decision in the US; some state laws provide one in limited cases. You can still ask whether a review is offered. ';
        }
        caveats.push(jur.disclaimer);
      } else {
        caveats.push('No specific jurisdiction selected. Whether human review must be provided depends on where you are.');
      }

      return { question: '', answer, sources, caveats };
    },
  },
  {
    keywords: ['evidence', 'what evidence', 'keep', 'preserve', 'what should i keep'],
    handler: ({ extracted }) => {
      const sources: string[] = ['REDRESS Evidence Vault'];
      const items: string[] = [
        'The original decision notification — exactly as you received it (email, letter, or screenshot). Do not edit it.',
        'Any reference numbers or case numbers from the decision.',
        'The date and time you received the decision.',
        'Any supporting documents you submitted with your original application.',
        'All correspondence with the organization (emails, letters, chat logs).',
        'Your challenge letter and proof that you sent it (e.g., email confirmation, recorded delivery).',
        'Any responses you receive from the organization.',
      ];

      if (extracted.evidenceReferences.length > 0) {
        items.splice(2, 0, `These reference numbers from the decision: ${extracted.evidenceReferences.join(', ')}.`);
      }

      if (extracted.date) {
        items.splice(2, 0, `The decision is dated ${extracted.date}.`);
      }

      const answer = `Keep the following evidence:\n\n${items.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\nYou can organize all of this in your Evidence Vault in REDRESS.`;

      return { question: '', answer, sources, caveats: [] };
    },
  },
  {
    keywords: ['what should i ask', 'ask the company', 'questions to ask', 'what to ask'],
    handler: ({ automation, jurisdiction }) => {
      const sources: string[] = ['Provided decision text'];
      const caveats: string[] = [];
      const questions: string[] = [];

      if (automation.status === 'not_established') {
        questions.push('Was any automated, algorithmic, or AI-based processing used in making this decision?');
        questions.push('If so, what role did it play, and did a person review the decision?');
      } else if (automation.status === 'confirmed_automated') {
        questions.push('Was this decision made solely by the automated system, or did a person review or make the final decision?');
        questions.push('How did the automated processing reach this outcome, and what information about me did it use?');
      } else if (automation.status === 'possibly_automated') {
        questions.push('What role did the automated system or algorithm play, and what role did a person play?');
      } else {
        questions.push('Were any automated tools, scores or AI used to support the decision-maker?');
      }

      questions.push('What specific reasons and factors led to the decision?');
      questions.push('What information or data about me was used in the decision?');
      questions.push('Is human review available, and if so, how do I request it?');
      questions.push('If any information used was incorrect, how can I correct it?');
      questions.push('What is the deadline for requesting a review or appeal?');

      if (isSpecificJurisdiction(jurisdiction)) {
        const jur = getJurisdiction(jurisdiction);
        const transparencyFramework = jur.frameworks.find((f) => f.scope === 'data_rights');
        if (transparencyFramework) {
          questions.push('Can I have a copy of the personal data you hold about me? If the decision was solely automated, please also give me meaningful information about the logic involved.');
          sources.push(transparencyFramework.source);
        }
        caveats.push(jur.disclaimer);
      } else {
        caveats.push('No specific jurisdiction selected — whether the organisation must answer depends on where you are.');
      }

      const answer = `Here are the key questions to ask the organization:\n\n${questions.map((q, idx) => `${idx + 1}. ${q}`).join('\n')}`;

      return { question: '', answer, sources, caveats };
    },
  },
  {
    keywords: ['deadline', 'time limit', 'how long', 'how much time', 'when do i need'],
    handler: ({ extracted, jurisdiction }) => {
      const sources: string[] = ['Provided decision text'];
      const caveats: string[] = [];

      if (extracted.deadline) {
        const answer = `The decision text mentions a deadline of "${extracted.deadline}". You should act before this deadline. If you need more time, you can request an extension in your challenge letter.`;
        return { question: '', answer, sources, caveats: ['Deadlines from the decision text should be verified. Do not rely on REDRESS alone for deadline calculations.'] };
      }

      const answer =
        'No explicit deadline was found in the decision text you provided. As a general principle, you should act as soon as possible. Many frameworks expect challenges to be made promptly. ' +
        (isSpecificJurisdiction(jurisdiction)
          ? `Time limits for complaints to regulators or ombudsmen in your selected jurisdiction (${jurisdiction}) vary — check the relevant body.`
          : 'Time limits depend on your jurisdiction and the organisation\u2019s own process.');
      caveats.push('No deadline was found in the text. Do not assume there is no deadline — act promptly.');

      return { question: '', answer, sources, caveats };
    },
  },
  {
    keywords: ['rights', 'what rights', 'what are my rights', 'do i have rights', 'my rights'],
    handler: ({ automation, jurisdiction }) => {
      const sources: string[] = [];
      const caveats: string[] = [];

      if (!isSpecificJurisdiction(jurisdiction)) {
        return {
          question: '',
          answer:
            'No specific jurisdiction is selected, so REDRESS cannot say which legal rights apply to you. In general, you can ask whether automation was used and what role it played, ask for the reasons and the information used, and ask for a review by a person. Whether the organisation must provide these depends on where you are.',
          sources: ['General procedural guidance'],
          caveats: ['Rights where you are may differ. This is not legal advice.'],
        };
      }

      const jur = getJurisdiction(jurisdiction);
      const lines: string[] = [];
      for (const framework of jur.frameworks) {
        lines.push(`${framework.name} (${framework.source})`);
        lines.push(`  Applies when: ${framework.applicableWhen}`);
        for (const right of framework.rights) lines.push(`  \u2022 ${right}`);
        lines.push(`  Human review: ${framework.humanReview}`);
        lines.push(`  Limits: ${framework.limitations}`);
        lines.push(`  Status: ${framework.currency}`);
        lines.push('');
        sources.push(framework.source);
      }

      const statusNote =
        automation.involvement === 'solely_automated'
          ? 'Your notice indicates a solely automated decision, so the safeguards for solely automated decisions may be relevant — depending on the effect of the decision.'
          : automation.status === 'confirmed_automated'
            ? 'Your notice confirms automated processing was used, but not whether the decision was solely automated. Rules for solely automated decisions may or may not apply — ask the organisation to confirm.'
            : automation.status === 'possibly_automated'
              ? 'Your notice does not establish that the decision was solely automated. Rules for solely automated decisions may not apply; data access and complaint routes still may.'
              : automation.status === 'human_indicated'
                ? 'Your notice indicates a person made the decision, so rules for solely automated decisions are unlikely to apply. Data access and complaint routes may still apply.'
                : 'Your notice does not establish whether automation was used. Ask the organisation first; the answer affects which of these may apply.';

      const answer = `Frameworks that may be relevant in ${jur.label} \u2014 each applies only in the circumstances described:\n\n${lines.join('\n')}\n${statusNote}`;
      caveats.push(jur.disclaimer);

      return { question: '', answer, sources, caveats };
    },
  },
];

const FALLBACK_RESPONSE: ExplainResponse = {
  question: '',
  answer:
    'I can help you understand:\n\n\u2022 Explain it to me (what happened, the evidence, what it does not prove, what to do next)\n\u2022 What this decision means\n\u2022 Why you should request human review\n\u2022 What evidence you should keep\n\u2022 What you should ask the company\n\u2022 What rights you may have\n\u2022 Whether there is a deadline\n\nTry asking one of these questions, or use the suggested questions below.',
  sources: ['REDRESS knowledge base'],
  caveats: ['This assistant answers only from your decision, extracted data, and selected jurisdiction. It does not provide legal advice.'],
};

/** True when the question matches one of REDRESS's fixed, rule-based topics. */
export function matchesKnownTopic(question: string): boolean {
  const lowerQ = question.toLowerCase();
  return QUESTION_PATTERNS.some(({ keywords }) => keywords.some((k) => lowerQ.includes(k)));
}

/** The help text shown when a question cannot be answered. */
export function fallbackHelpText(): string {
  return FALLBACK_RESPONSE.answer;
}

export function explain(params: ExplainParams): ExplainResponse {
  const lowerQ = params.question.toLowerCase();

  for (const { keywords, handler } of QUESTION_PATTERNS) {
    if (keywords.some((k) => lowerQ.includes(k))) {
      const response = handler(params);
      response.question = params.question;
      return response;
    }
  }

  return { ...FALLBACK_RESPONSE, question: params.question };
}

export const SUGGESTED_QUESTIONS = [
  'Explain it to me',
  'What does this decision mean?',
  'Why should I request human review?',
  'What evidence should I keep?',
  'What should I ask the company?',
  'What rights do I have?',
  'Is there a deadline?',
];
