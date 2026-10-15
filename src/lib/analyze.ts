// ============================================================================
// REDRESS — Deterministic Analysis Engine
//
// This module extracts structured data from decision text and determines
// the automation status. It is deliberately deterministic — no AI calls.
// It only looks for explicit textual signals and never infers automation
// from phrasing alone.
// ============================================================================

import type {
  AutomationAnalysis,
  AutomationInvolvement,
  AutomationStatus,
  ExtractedData,
  StatusSignal,
} from '@/types';

// ---------------------------------------------------------------------------
// Signal patterns — explicit textual markers only, matched per sentence so
// every signal can be traced back to a verbatim quote.
//
// Deliberately NOT treated as evidence of automation: speed, standard or
// generic wording, digital delivery ("this is an automated email"), or
// phrases like "screening process" / "our review".
// ---------------------------------------------------------------------------

type Pattern = { re: RegExp; text: string };

/** Explicit statements that automated processing was used in the decision. */
const AUTOMATED_PATTERNS: Pattern[] = [
  {
    re: /\bautomated\s+(?:[\w-]+\s+){0,2}(?:decision(?:-making)?|decisioning|processing|assessment|screening|system|review|evaluation|process|tool|model|moderation|check)s?\b/i,
    text: 'The notice states that automated processing or an automated system was used',
  },
  {
    re: /\bautomatic(?:ally)?\s+(?:declined|rejected|refused|assessed|decided|suspended|denied|scored|flagged)\b/i,
    text: 'The notice states that the outcome was produced automatically',
  },
];

/** Explicit references to AI / machine learning. Case-sensitive "AI" as a whole word only. */
const AI_PATTERNS: Pattern[] = [
  { re: /\bartificial intelligence\b/i, text: 'The notice refers to artificial intelligence' },
  { re: /\bmachine[- ]learning\b/i, text: 'The notice refers to machine learning' },
  { re: /(?:^|[^A-Za-z])(?:AI|A\.I\.)(?=$|[^A-Za-z])/, text: 'The notice refers to AI' },
];

/** Statements that the decision was made by a system without a person. */
const SOLELY_PATTERNS: Pattern[] = [
  {
    re: /\b(?:solely|fully|entirely|wholly|purely|completely)\s+(?:by\s+)?(?:automated|automatic|by\s+(?:an?|our|the)\s+(?:automated\s+)?system)/i,
    text: 'The notice states the decision was made solely / fully by automated means',
  },
  {
    re: /\b(?:without|no)\s+(?:any\s+)?(?:(?:human|manual|staff)\s+(?:review|involvement|intervention|input|oversight|assessment|decision)|human|a person)\b/i,
    text: 'The notice states there was no human involvement',
  },
  {
    re: /\bdecision\s+(?:was|has been)\s+(?:made|taken|reached|generated)\s+(?:by|using)\s+(?:an?|our|the)\s+(?:[\w-]+\s+){0,2}(?:automated|automatic|ai|algorithmic)\b/i,
    text: 'The notice states the decision was made by an automated system',
  },
];

/** Algorithmic / scoring language — suggests automated tools, does not confirm them. */
const ALGORITHM_PATTERNS: Pattern[] = [
  { re: /\balgorithm(?:s|ic|ically)?\b/i, text: 'The notice refers to an algorithm or algorithmic process' },
  { re: /\bscoring\s+(?:system|model|engine|tool)\b/i, text: 'The notice refers to a scoring system or model' },
  { re: /\bprofiling\b/i, text: 'The notice refers to profiling' },
  {
    re: /\bour\s+systems?\s+(?:identified|detected|flagged|determined|calculated)\b/i,
    text: 'The notice says "our system" identified or determined something',
  },
];

/** Scores alone are weak evidence — people use scores too. */
const SCORE_PATTERNS: Pattern[] = [
  {
    re: /\b(?:credit|risk|eligibility|fraud|affordability)\s+scor(?:e|es|ing)\b/i,
    text: 'The notice refers to a score (e.g. credit or risk score)',
  },
];

/** A human made, reviewed or assessed the decision. */
const HUMAN_PATTERNS: Pattern[] = [
  {
    re: /\b(?:reviewed|review|assessed|considered|decided|made|examined|evaluated|checked|determined)\s+(?:individually\s+|manually\s+|carefully\s+|personally\s+)?by\s+(?:a|an|our|the|one of our)\s+(?:[\w-]+\s+){0,3}(?:specialists?|officers?|team|underwriters?|person|people|staff|caseworkers?|case workers?|advisers?|advisors?|managers?|assessors?|panel|humans?|reviewers?|colleagues?|members? of (?:staff|our team))\b/i,
    text: 'The notice states that a person or team reviewed or made the decision',
  },
  { re: /\bmanual(?:ly)?\s+(?:review(?:ed)?|assess(?:ed|ment)|check(?:ed)?)\b/i, text: 'The notice refers to a manual review or assessment' },
  { re: /\bhuman\s+(?:review(?:er)?|decision(?:-maker)?|assessor|consideration)\b/i, text: 'The notice refers to a human review or human decision-maker' },
  { re: /\b(?:underwriter|case\s*(?:officer|worker|manager)|caseworker)s?\b/i, text: 'The notice refers to an underwriter or case officer' },
];

/** Words that, appearing before a human-review phrase, make it an offered route rather than evidence. */
const ROUTE_MARKERS =
  /\b(?:request|ask|asking|appeal|if you|you may|you can|you could|you have the right|entitled|option|contact us|wish to|would like)\b/i;

/** Digital-delivery wording — never counted as evidence of automated decision-making. */
const DELIVERY_ONLY = /\bautomated\s+(?:e-?mail|message|notification|response|reply|letter|text|sms)\b|\bdo not reply\b/i;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function findFirst(sentence: string, patterns: Pattern[]): { pattern: Pattern; index: number } | null {
  for (const pattern of patterns) {
    const m = pattern.re.exec(sentence);
    if (m) return { pattern, index: m.index };
  }
  return null;
}

/**
 * Scan the decision text sentence by sentence and return every automation-
 * or human-related signal together with the verbatim sentence it came from.
 */
export function findAutomationEvidence(rawText: string): StatusSignal[] {
  const signals: StatusSignal[] = [];
  const add = (sig: StatusSignal) => {
    if (!signals.some((s) => s.type === sig.type && s.quote === sig.quote)) signals.push(sig);
  };

  for (const sentence of splitSentences(rawText)) {
    const solely = findFirst(sentence, SOLELY_PATTERNS);
    const automated = findFirst(sentence, AUTOMATED_PATTERNS);
    const ai = findFirst(sentence, AI_PATTERNS);
    const deliveryOnly = DELIVERY_ONLY.test(sentence);

    if (deliveryOnly && !solely && !ai) {
      // e.g. "This is an automated email — please do not reply."
      add({
        text: 'The notice was sent automatically — this is about delivery, not about how the decision was made',
        quote: sentence,
        type: 'neutral',
        weight: 'weak',
      });
    } else {
      if (automated) add({ text: automated.pattern.text, quote: sentence, type: 'automated', weight: 'strong' });
      if (ai) add({ text: ai.pattern.text, quote: sentence, type: 'ai', weight: 'strong' });
    }

    // "Solely" statements only count when the sentence is not an offered route
    // (e.g. "you have the right not to be subject to a decision made without human review").
    if (solely) {
      const before = sentence.slice(0, solely.index);
      if (!ROUTE_MARKERS.test(before)) {
        add({ text: solely.pattern.text, quote: sentence, type: 'solely', weight: 'strong' });
      }
    }

    const algorithm = findFirst(sentence, ALGORITHM_PATTERNS);
    if (algorithm && !automated && !ai) {
      add({ text: algorithm.pattern.text, quote: sentence, type: 'algorithm', weight: 'moderate' });
    }

    const score = findFirst(sentence, SCORE_PATTERNS);
    if (score && !automated && !ai && !algorithm) {
      add({ text: score.pattern.text, quote: sentence, type: 'score', weight: 'weak' });
    }

    const human = findFirst(sentence, HUMAN_PATTERNS);
    if (human && !solely) {
      const before = sentence.slice(0, human.index);
      if (ROUTE_MARKERS.test(before)) {
        add({
          text: 'The notice offers a review by a person as a route you can request',
          quote: sentence,
          type: 'human_route',
          weight: 'weak',
        });
      } else {
        add({ text: human.pattern.text, quote: sentence, type: 'human', weight: 'strong' });
      }
    }
  }

  return signals;
}

const APPEAL_PHRASES = [
  'appeal',
  'request a review',
  'request review',
  'challenge this decision',
  'contact us within',
  'you may request',
  'complaints procedure',
  'complaints process',
  'escalate',
  'reconsider',
  'ask us to review',
];

const DEADLINE_PATTERNS = [
  /within\s+(\d+)\s+days/gi,
  /within\s+(\d+)\s+weeks/gi,
  /(\d+)\s+days\s+from/gi,
  /by\s+the\s+end\s+of\s+the\s+(next|following)\s+business\s+day/gi,
  /no\s+later\s+than\s+(\d+)\s+days/gi,
];

const CONTACT_PATTERNS = [
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,
  /(?:phone|tel|call)\s*[:.]?\s*([+\d][\d\s\-()]{7,})/gi,
  /www\.[\w.-]+/g,
  /https?:\/\/[\w.-]+/g,
];

// ---------------------------------------------------------------------------
// Date extraction — looks for common date formats in the text.
// ---------------------------------------------------------------------------

const DATE_PATTERNS = [
  /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i,
  /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,
  /\b(\d{4}-\d{2}-\d{2})\b/,
  /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\b/i,
];

// ---------------------------------------------------------------------------
// Organization extraction — looks for company-name patterns.
// ---------------------------------------------------------------------------

const ORG_PATTERNS = [
  /(?:Regards|Sincerely|Best wishes|Yours faithfully|Yours sincerely),?[ \t]*\n[ \t]*([A-Z][A-Za-z0-9&' ]{2,40})/,
  /(?:from|by|at)\s+([A-Z][a-zA-Z0-9&'\s]{2,30}(?:Ltd|Limited|Inc|LLC|Corp|Corporation|Bank|Financial|Credit|Insurance|Services|Group|Capital|Trust)?)\b/g,
  /^([A-Z][a-zA-Z0-9&'\s]{2,30}(?:Ltd|Limited|Inc|LLC|Corp|Corporation))$/m,
  /Dear\s+(?:Mr|Ms|Mrs|Miss|Dr)\s+\w+,?\s*\n\s*(?:.*?\n){0,2}?\s*(?:Regards|Sincerely|Best),?\s*\n\s*([A-Z][a-zA-Z0-9&'\s]{2,40})/i,
];

// ---------------------------------------------------------------------------
// Decision-type detection
// ---------------------------------------------------------------------------

const DECISION_TYPES: { keywords: string[]; type: string }[] = [
  { keywords: ['loan', 'credit', 'mortgage', 'finance', 'lending'], type: 'Loan / Credit Application' },
  { keywords: ['insurance', 'claim', 'policy', 'coverage'], type: 'Insurance Claim' },
  { keywords: ['account', 'suspended', 'ban', 'restricted', 'locked'], type: 'Account Suspension' },
  { keywords: ['application', 'unsuccessful', 'declined', 'rejected', 'denied'], type: 'Application Decision' },
  { keywords: ['eligibility', 'eligible', 'not eligible'], type: 'Eligibility Assessment' },
  { keywords: ['employment', 'job', 'hiring', 'candidate', 'screening'], type: 'Employment Screening' },
  { keywords: ['tenancy', 'tenant', 'rental', 'housing'], type: 'Tenancy Application' },
  { keywords: ['benefit', 'welfare', 'universal credit', 'social security'], type: 'Benefits Decision' },
  { keywords: ['visa', 'immigration', 'asylum'], type: 'Immigration Decision' },
];

const OUTCOME_KEYWORDS: { keywords: string[]; outcome: string }[] = [
  { keywords: ['rejected', 'declined', 'unsuccessful', 'not successful', 'denied', 'refused'], outcome: 'Rejected / Denied' },
  { keywords: ['suspended', 'restricted', 'locked', 'banned', 'terminated'], outcome: 'Suspended / Restricted' },
  { keywords: ['approved', 'accepted', 'successful', 'granted'], outcome: 'Approved / Accepted' },
];

// ---------------------------------------------------------------------------
// Core extraction function
// ---------------------------------------------------------------------------

export function extractDecision(rawText: string): ExtractedData {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // --- Automation signals (sentence-level, with verbatim quotes) ---
  const automationEvidence = findAutomationEvidence(text);
  const has = (type: StatusSignal['type']) => automationEvidence.some((s) => s.type === type);
  const automatedMentioned = has('automated') || has('solely');
  const aiMentioned = has('ai');
  const algorithmMentioned = has('algorithm');
  const humanReviewMentioned = has('human');
  const humanReviewOffered = has('human_route');

  // --- Organization ---
  let organization: string | null = null;
  for (const pattern of ORG_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      organization = match[1].trim().replace(/\s+/g, ' ');
      break;
    }
  }

  // --- Decision type ---
  let decisionType: string | null = null;
  for (const { keywords, type } of DECISION_TYPES) {
    if (keywords.some((k) => lower.includes(k))) {
      decisionType = type;
      break;
    }
  }

  // --- Decision outcome ---
  let decisionOutcome: string | null = null;
  for (const { keywords, outcome } of OUTCOME_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) {
      decisionOutcome = outcome;
      break;
    }
  }

  // --- Date ---
  let date: string | null = null;
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      date = match[1];
      break;
    }
  }

  // --- Stated reason — look for reason-bearing sentences ---
  let statedReason: string | null = null;
  const reasonPatterns = [
    /\b((?:did not|does not|do not|failed to) meet\s.{5,120}?)(?:\.|$)/i,
    /(?:based on|due to|because of|as a result of)\s+(.{10,120}?)(?:\.|$)/i,
    /(?:reason|basis)\s*[:.]\s*(.{10,120}?)(?:\.|$)/i,
    /(?:unfortunately|regrettably)[,.]\s+(.{10,120}?)(?:\.|$)/i,
  ];
  for (const pattern of reasonPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      statedReason = match[1].trim().replace(/\s+/g, ' ');
      break;
    }
  }

  // --- Appeal instructions ---
  let appealInstructions: string | null = null;
  for (const phrase of APPEAL_PHRASES) {
    const idx = lower.indexOf(phrase);
    if (idx >= 0) {
      const snippet = text.substring(idx, Math.min(idx + 200, text.length));
      const endIdx = snippet.search(/[.\n]/);
      appealInstructions = endIdx > 0 ? snippet.substring(0, endIdx).trim() : snippet.trim();
      break;
    }
  }

  // --- Deadline ---
  let deadline: string | null = null;
  for (const pattern of DEADLINE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      deadline = match[0].trim();
      break;
    }
  }

  // --- Contact method ---
  let contactMethod: string | null = null;
  for (const pattern of CONTACT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      contactMethod = match[0].trim();
      break;
    }
  }

  // --- Evidence / document references ---
  const evidenceReferences: string[] = [];
  const docPatterns = [
    /reference\s+(?:number|no\.?|#)\s*[:.]?\s*([A-Z0-9\-/]{4,30})/gi,
    /case\s+(?:number|no\.?|#)\s*[:.]?\s*([A-Z0-9\-/]{4,30})/gi,
    /application\s+(?:number|no\.?|#)\s*[:.]?\s*([A-Z0-9\-/]{4,30})/gi,
    /(?:ref|reference)\s*[:.]\s*([A-Z0-9\-/]{4,30})/gi,
  ];
  for (const pattern of docPatterns) {
    const matches = text.matchAll(pattern);
    for (const m of matches) {
      if (m[0] && !evidenceReferences.includes(m[0])) {
        evidenceReferences.push(m[0]);
      }
    }
  }

  return {
    organization,
    decisionType,
    decisionOutcome,
    date,
    statedReason,
    automatedMentioned,
    aiMentioned,
    algorithmMentioned,
    humanReviewMentioned,
    humanReviewOffered,
    automationEvidence,
    appealInstructions,
    deadline,
    contactMethod,
    evidenceReferences,
  };
}

// ---------------------------------------------------------------------------
// Automation status determination — purely rule-based.
//
//   confirmed_automated — the text explicitly states automated processing / AI
//                         was used, and no human decision-maker is mentioned.
//   possibly_automated  — automation is mentioned alongside a human decision-
//                         maker (AI-assisted), or only algorithmic / scoring
//                         language appears.
//   human_indicated     — the text states a person made or reviewed it, with
//                         no automation mentioned.
//   not_established     — the text does not say either way.
// ---------------------------------------------------------------------------

export function analyzeAutomation(extracted: ExtractedData): AutomationAnalysis {
  const signals = extracted.automationEvidence ?? [];
  const of = (...types: StatusSignal['type'][]) => signals.filter((s) => types.includes(s.type));

  const explicit = of('automated', 'ai', 'solely');
  const solely = of('solely');
  const algorithmic = of('algorithm');
  const scores = of('score');
  const human = of('human');
  const routes = of('human_route');

  let status: AutomationStatus;
  let involvement: AutomationInvolvement;
  let explanation: string;
  const suggests: string[] = [];
  const notEstablished: string[] = [];
  const nextSteps: string[] = [];

  if (explicit.length > 0 && human.length === 0) {
    status = 'confirmed_automated';
    involvement = solely.length > 0 ? 'solely_automated' : 'role_unclear';
    explanation =
      involvement === 'solely_automated'
        ? 'The notice explicitly says automated processing was used and indicates the decision was made without a person. On the face of the notice, this appears to be a solely automated decision.'
        : 'The notice explicitly says automated processing or AI was used in reaching the decision. It does not say whether a person was also involved in making the final decision.';
    suggests.push('Automated processing was used as part of this decision — the organisation says so itself.');
    if (involvement === 'solely_automated') {
      suggests.push('The decision may have been made without meaningful human involvement. If so, rules on solely automated decisions may be relevant, depending on your jurisdiction and the effect of the decision.');
      notEstablished.push('Whether anyone checked the outcome before it was sent to you — ask the organisation to confirm.');
    } else {
      notEstablished.push('Whether the decision was made solely by the automated system, or whether a person reviewed or made the final decision (the "solely automated" vs "AI-assisted" question).');
    }
    notEstablished.push('Which information about you the system used, and how each factor affected the outcome.');
    notEstablished.push('Whether any legal right specific to automated decisions applies — that depends on your jurisdiction, the effect of the decision and the organisation’s legal basis.');
    nextSteps.push('Ask the organisation to confirm whether a person was involved in the final decision, and if so, what their role was.');
    nextSteps.push('Ask for meaningful information about how the automated system reached this outcome and which data about you it used.');
    nextSteps.push('Request that a person reviews the decision and that you are given a chance to explain your circumstances.');
  } else if (explicit.length > 0 && human.length > 0) {
    status = 'possibly_automated';
    involvement = 'ai_assisted';
    explanation =
      'The notice mentions automated processing or AI, and also says a person reviewed or made the decision. This points to an AI-assisted decision: automated tools may have contributed, but the evidence does not establish that the final decision was made solely by an automated system.';
    suggests.push('Automated tools contributed to the process in some way.');
    suggests.push('A person appears to have been involved in the decision.');
    notEstablished.push('How much weight the person gave to the automated output, and whether their review was meaningful or a formality.');
    notEstablished.push('Which information about you the automated tools used.');
    notEstablished.push('Whether rules on solely automated decisions apply — the human involvement mentioned may mean they do not, but that depends on how meaningful it was.');
    nextSteps.push('Ask what role the automated system played and what role the person played.');
    nextSteps.push('Ask for the specific reasons and factors, including what the automated system contributed.');
    nextSteps.push('Ask for a fresh review by a different person, and provide any information you think was missed.');
  } else if (algorithmic.length > 0) {
    status = 'possibly_automated';
    involvement = human.length > 0 ? 'ai_assisted' : 'role_unclear';
    explanation =
      human.length > 0
        ? 'The notice refers to an algorithm or scoring system and also to a person reviewing the decision. Automated tools may have assisted a human decision-maker; the notice does not establish the role each played.'
        : 'The notice refers to an algorithm, scoring system or "our system". This may indicate automated processing, but the notice does not state that the decision itself was automated or whether a person was involved.';
    suggests.push('An algorithm or scoring system appears to have been used somewhere in the process.');
    if (human.length > 0) suggests.push('A person appears to have been involved in the decision.');
    notEstablished.push('Whether the algorithm made the decision or only informed a person who made it.');
    notEstablished.push('Whether any AI or machine learning was involved — the notice does not say so.');
    notEstablished.push('Which information about you was used.');
    nextSteps.push('Ask whether the decision was made by an automated system, and whether a person reviewed it.');
    nextSteps.push('Ask what the algorithm or score measured and which data about you it used.');
    nextSteps.push('Request human review or reconsideration of the decision.');
  } else if (human.length > 0) {
    status = 'human_indicated';
    involvement = 'human';
    explanation =
      'The notice states that a person or team reviewed or made the decision. It does not mention automated processing or AI.';
    suggests.push('A human decision-maker was involved.');
    notEstablished.push('Whether automated tools (for example a score or risk flag) informed the person’s decision — the notice does not say either way.');
    notEstablished.push('Whether the reviewer considered all the information you provided.');
    nextSteps.push('Ask for the specific reasons and the information the decision-maker relied on.');
    nextSteps.push('Ask whether any automated tools or scores were used to support the decision.');
    nextSteps.push('Use the organisation’s appeal or review route to ask for reconsideration, ideally by a different person.');
  } else {
    status = 'not_established';
    involvement = 'not_established';
    explanation =
      'The notice does not say whether automated processing or AI was used, or whether a person made the decision. This does not mean automation was not used — only that the evidence you provided does not establish it either way.';
    notEstablished.push('Whether any automated system, algorithm or AI was involved.');
    notEstablished.push('Whether a person made or reviewed the decision.');
    notEstablished.push('The absence of a mention is not evidence that no automation was used — nor that it was.');
    nextSteps.push('Ask the organisation whether automated processing or AI was involved in the decision.');
    nextSteps.push('Ask what role any automated system played, and whether a person reviewed the decision.');
    nextSteps.push('Request the information the decision was based on — in many jurisdictions you can request a copy of the personal data an organisation holds about you.');
    nextSteps.push('Ask for the decision to be reconsidered by a person, if a review route is available.');
  }

  if (scores.length > 0) {
    suggests.push('The notice mentions a score. Scores are often calculated by automated systems, but a score alone does not show who or what made the decision.');
  }
  if (routes.length > 0) {
    suggests.push('The organisation offers a review by a person as a route you can request.');
    if (status !== 'human_indicated') {
      notEstablished.push('Offering a human review later does not tell us whether a person was involved in the original decision.');
    }
  }
  if (!extracted.statedReason) {
    notEstablished.push('The specific reason for the decision — no clear reason was found in the notice.');
  }

  nextSteps.push('Preserve the original decision exactly as you received it, plus any related emails or documents.');
  nextSteps.push('If the organisation does not resolve it, identify the escalation route for your jurisdiction (select it in the next step).');

  return { status, involvement, signals, explanation, suggests, notEstablished, nextSteps };
}

/** Labels for the solely-automated vs AI-assisted distinction. */
export const INVOLVEMENT_META: Record<AutomationInvolvement, { label: string; description: string }> = {
  solely_automated: {
    label: 'Solely automated (indicated)',
    description: 'The decision appears to have been made without meaningful human involvement.',
  },
  role_unclear: {
    label: 'Automation involved — human role not established',
    description: 'Automated processing was used, but the evidence does not show whether a person made or reviewed the final decision.',
  },
  ai_assisted: {
    label: 'AI-assisted',
    description: 'Automated tools may have contributed, but the evidence does not establish that the final decision was made solely by an automated system.',
  },
  human: {
    label: 'Human decision indicated',
    description: 'The evidence indicates a human decision-maker was involved.',
  },
  not_established: {
    label: 'Not established',
    description: 'The evidence does not establish what role, if any, automation or AI played.',
  },
};

// ---------------------------------------------------------------------------
// Status metadata for UI rendering
// ---------------------------------------------------------------------------

export const STATUS_META: Record<
  AutomationStatus,
  { label: string; shortLabel: string; color: string; bgColor: string; borderColor: string; icon: string }
> = {
  confirmed_automated: {
    label: 'Confirmed Automated',
    shortLabel: 'AUTOMATED',
    color: 'text-error-700',
    bgColor: 'bg-error-50',
    borderColor: 'border-error-200',
    icon: 'alert',
  },
  possibly_automated: {
    label: 'Possibly Automated / AI-Assisted',
    shortLabel: 'POSSIBLY',
    color: 'text-warning-700',
    bgColor: 'bg-warning-50',
    borderColor: 'border-warning-200',
    icon: 'warn',
  },
  not_established: {
    label: 'Not Established',
    shortLabel: 'UNKNOWN',
    color: 'text-ink-600',
    bgColor: 'bg-ink-100',
    borderColor: 'border-ink-200',
    icon: 'question',
  },
  human_indicated: {
    label: 'Human Decision Indicated',
    shortLabel: 'HUMAN',
    color: 'text-success-700',
    bgColor: 'bg-success-50',
    borderColor: 'border-success-200',
    icon: 'check',
  },
};
