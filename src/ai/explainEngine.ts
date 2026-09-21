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
import { getJurisdiction } from '@/legal/jurisdictions';
import { STATUS_META } from '@/lib/analyze';

interface ExplainParams {
  question: string;
  extracted: ExtractedData;
  automation: AutomationAnalysis;
  jurisdiction: JurisdictionCode | null;
}

const QUESTION_PATTERNS: { keywords: string[]; handler: (p: ExplainParams) => ExplainResponse }[] = [
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

      if (automation.status === 'not_established') {
        parts.push('This means automated decision-making was not confirmed from what you provided. It does not mean automation was not used — only that it was not stated.');
        caveats.push('Automation status is based solely on the text provided. It may not reflect the full process.');
      } else if (automation.status === 'confirmed_automated') {
        parts.push('The text explicitly references automated or AI-based processing.');
      } else if (automation.status === 'possibly_automated') {
        parts.push('The text contains signals that suggest automation may have been used, but it is not fully confirmed.');
      }

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
          'Requesting human review is important because the decision was made (or appears to have been made) by an automated system. A human reviewer can consider context, circumstances, and information that the automated system may have missed or weighted differently. ';
      } else if (automation.status === 'possibly_automated') {
        answer =
          'Requesting human review is worth doing because the decision may have involved automated processing. Even if a human was involved, asking for (additional) human review ensures your circumstances are considered individually. ';
      } else if (automation.status === 'not_established') {
        answer =
          'Even though automation was not confirmed, requesting human review is still worthwhile. If any automated processing was used (which you can ask about), human review gives you a fresh assessment. If the decision was already made by a person, you can request a review by a different person. ';
      } else {
        answer =
          'The text indicates a human was involved, but you can still request that a different person reviews the decision, especially if you believe relevant information was not considered. ';
      }

      if (jurisdiction) {
        const jur = getJurisdiction(jurisdiction);
        const humanRight = jur.frameworks.find((f) => f.rights.some((r) => r.includes('human')));
        if (humanRight) {
          answer += `Under ${humanRight.source}, you may have a right to obtain human intervention for automated decisions. `;
          sources.push(humanRight.source);
        }
        caveats.push(jur.disclaimer);
      } else {
        caveats.push('Select a jurisdiction to see potentially relevant legal frameworks.');
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
      } else if (automation.status === 'confirmed_automated' || automation.status === 'possibly_automated') {
        questions.push('Can you confirm the specific automated system or process that was used?');
      }

      questions.push('What specific reasons and factors led to the decision?');
      questions.push('What information or data about me was used in the decision?');
      questions.push('Is human review available, and if so, how do I request it?');
      questions.push('If any information used was incorrect, how can I correct it?');
      questions.push('What is the deadline for requesting a review or appeal?');

      if (jurisdiction) {
        const jur = getJurisdiction(jurisdiction);
        const transparencyFramework = jur.frameworks.find((f) => f.shortName.includes('Arts. 13'));
        if (transparencyFramework) {
          questions.push(`Please provide meaningful information about the logic involved in any automated processing, as I may be entitled to request under ${transparencyFramework.source}.`);
          sources.push(transparencyFramework.source);
        }
        caveats.push(jur.disclaimer);
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
        (jurisdiction
          ? `Under your selected jurisdiction (${jurisdiction}), check the relevant framework for any applicable time limits.`
          : 'Select a jurisdiction to check for potentially applicable time limits.');
      caveats.push('No deadline was found in the text. Do not assume there is no deadline — act promptly.');
      if (jurisdiction) {
        sources.push(getJurisdiction(jurisdiction).frameworks[0]?.source ?? 'Jurisdiction reference');
      }

      return { question: '', answer, sources, caveats };
    },
  },
  {
    keywords: ['rights', 'what rights', 'what are my rights', 'do i have rights', 'my rights'],
    handler: ({ automation, jurisdiction }) => {
      const sources: string[] = [];
      const caveats: string[] = [];

      if (!jurisdiction) {
        return {
          question: '',
          answer:
            'Select a jurisdiction to see potentially relevant rights. In general, you may have the right to ask whether automation was used, request information about the decision, and request human review.',
          sources: ['General principles'],
          caveats: ['Select a jurisdiction for more specific information. This is not legal advice.'],
        };
      }

      const jur = getJurisdiction(jurisdiction);
      const rights: string[] = [];

      for (const framework of jur.frameworks) {
        for (const right of framework.rights) {
          rights.push(`${right} — ${framework.source}`);
        }
        sources.push(framework.source);
      }

      const answer = `Based on the selected jurisdiction (${jur.label}), you may have the following rights:\n\n${rights.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n${automation.status === 'confirmed_automated' || automation.status === 'possibly_automated' ? 'Since automation may have been involved, rights related to human review and information about automated processing are particularly relevant.' : 'Even though automation was not confirmed, you may still ask whether it was used and request information.'}`;
      caveats.push(jur.disclaimer);

      return { question: '', answer, sources, caveats };
    },
  },
];

const FALLBACK_RESPONSE: ExplainResponse = {
  question: '',
  answer:
    'I can help you understand:\n\n\u2022 What this decision means\n\u2022 Why you should request human review\n\u2022 What evidence you should keep\n\u2022 What you should ask the company\n\u2022 What rights you may have\n\u2022 Whether there is a deadline\n\nTry asking one of these questions, or use the suggested questions below.',
  sources: ['REDRESS knowledge base'],
  caveats: ['This assistant answers only from your decision, extracted data, and selected jurisdiction. It does not provide legal advice.'],
};

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
  'What does this decision actually mean?',
  'Why should I request human review?',
  'What evidence should I keep?',
  'What should I ask the company?',
  'What rights do I have?',
  'Is there a deadline?',
];
