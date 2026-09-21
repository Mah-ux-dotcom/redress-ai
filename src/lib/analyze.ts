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
  AutomationStatus,
  ExtractedData,
  StatusSignal,
} from '@/types';

// ---------------------------------------------------------------------------
// Signal dictionaries — explicit textual markers only.
// ---------------------------------------------------------------------------

const AUTOMATED_PHRASES = [
  'automated eligibility assessment',
  'automated assessment',
  'automated decision',
  'automated processing',
  'automated screening',
  'automated system',
  'automated review',
  'automated evaluation',
  'automated process',
  'automated tool',
  'algorithmic assessment',
  'algorithmic decision',
  'machine learning',
  'ml model',
  'scoring system',
  'risk score',
  'credit score',
  'eligibility score',
  'automated eligibility',
];

const AI_PHRASES = [
  'ai',
  'a.i.',
  'artificial intelligence',
  'ai model',
  'ai system',
  'ai-assisted',
  'ai driven',
  'ai-powered',
  'powered by ai',
];

const ALGORITHM_PHRASES = [
  'algorithm',
  'algorithmic',
  'algorithmically',
  'scoring algorithm',
  'ranking algorithm',
];

const HUMAN_PHRASES = [
  'human review',
  'manual review',
  'reviewed by a person',
  'reviewed by our team',
  'reviewed by a human',
  'reviewed by a specialist',
  'underwriter',
  'case officer',
  'case manager',
  'human decision',
  'manually assessed',
  'reviewed individually',
  'human appeal',
  'human consideration',
];

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
  { keywords: ['rejected', 'declined', 'unsuccessful', 'denied', 'refused'], outcome: 'Rejected / Denied' },
  { keywords: ['suspended', 'restricted', 'locked', 'banned', 'terminated'], outcome: 'Suspended / Restricted' },
  { keywords: ['approved', 'accepted', 'successful', 'granted'], outcome: 'Approved / Accepted' },
];

// ---------------------------------------------------------------------------
// Core extraction function
// ---------------------------------------------------------------------------

export function extractDecision(rawText: string): ExtractedData {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // --- Automation signals ---
  const automatedMentioned = AUTOMATED_PHRASES.some((p) => lower.includes(p));
  const aiMentioned = AI_PHRASES.some(
    (p) => lower.includes(p) || lower.includes(p.toLowerCase()),
  );
  const algorithmMentioned = ALGORITHM_PHRASES.some((p) => lower.includes(p));
  const humanReviewMentioned = HUMAN_PHRASES.some((p) => lower.includes(p));

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
    appealInstructions,
    deadline,
    contactMethod,
    evidenceReferences,
  };
}

// ---------------------------------------------------------------------------
// Automation status determination — purely rule-based.
// ---------------------------------------------------------------------------

export function analyzeAutomation(extracted: ExtractedData): AutomationAnalysis {
  const signals: StatusSignal[] = [];

  if (extracted.automatedMentioned) {
    signals.push({
      text: 'Explicit mention of "automated" processing',
      type: 'automated',
      weight: 'strong',
    });
  }
  if (extracted.aiMentioned) {
    signals.push({
      text: 'Explicit mention of AI / artificial intelligence',
      type: 'ai',
      weight: 'strong',
    });
  }
  if (extracted.algorithmMentioned) {
    signals.push({
      text: 'Explicit mention of an algorithm / algorithmic process',
      type: 'algorithm',
      weight: 'moderate',
    });
  }
  if (extracted.humanReviewMentioned) {
    signals.push({
      text: 'Human review or manual assessment is mentioned',
      type: 'human',
      weight: 'strong',
    });
  }

  const strongAutomated = signals.filter(
    (s) => (s.type === 'automated' || s.type === 'ai') && s.weight === 'strong',
  );
  const moderateAutomated = signals.filter(
    (s) => s.type === 'algorithm' && s.weight === 'moderate',
  );
  const humanSignals = signals.filter((s) => s.type === 'human');

  let status: AutomationStatus;
  let explanation: string;

  if (strongAutomated.length > 0 && humanSignals.length === 0) {
    status = 'confirmed_automated';
    explanation =
      'The decision text explicitly references automated processing, AI, or an algorithmic system, with no indication of human review. This strongly suggests an automated decision was made.';
  } else if (strongAutomated.length > 0 && humanSignals.length > 0) {
    status = 'possibly_automated';
    explanation =
      'The text references automated or AI-based processing but also mentions human review. The decision may have been automated with human oversight, or automated with a human appeal pathway.';
  } else if (moderateAutomated.length > 0 && humanSignals.length === 0) {
    status = 'possibly_automated';
    explanation =
      'The text references an algorithm or algorithmic process, which may indicate automated decision-making, but does not explicitly confirm AI or a fully automated system.';
  } else if (humanSignals.length > 0 && strongAutomated.length === 0) {
    status = 'human_indicated';
    explanation =
      'The text indicates that a human reviewed or made the decision. No explicit references to automated or AI-based processing were found.';
  } else {
    status = 'not_established';
    explanation =
      'Automated decision-making was not confirmed from the material provided. The text does not explicitly mention AI, algorithms, or automated processing. This does not mean automation was not used — only that it was not stated.';
  }

  return { status, signals, explanation };
}

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
    label: 'Possibly Automated',
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
