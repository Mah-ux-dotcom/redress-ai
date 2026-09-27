// ============================================================================
// REDRESS — Core Type System
// Strongly typed schemas for the entire application.
// ============================================================================

/** How the user provided the decision to REDRESS. */
export type InputMethod = 'paste' | 'screenshot' | 'pdf' | 'manual';

/** The four possible automation statuses. */
export type AutomationStatus =
  | 'confirmed_automated'
  | 'possibly_automated'
  | 'not_established'
  | 'human_indicated';

/** Jurisdictions supported by the MVP. */
export type JurisdictionCode = 'UK' | 'EU' | 'US' | 'GENERAL';

/** Challenge lifecycle status. */
export type ChallengeStatus =
  | 'draft'
  | 'submitted'
  | 'awaiting_response'
  | 'human_review_received'
  | 'resolved'
  | 'escalated';

/** Structured data extracted from the decision text. */
export interface ExtractedData {
  organization: string | null;
  decisionType: string | null;
  decisionOutcome: string | null;
  date: string | null;
  statedReason: string | null;
  automatedMentioned: boolean;
  aiMentioned: boolean;
  algorithmMentioned: boolean;
  /** A human made or reviewed the decision (not merely offered as a route). */
  humanReviewMentioned: boolean;
  /** Human review / reconsideration is offered as a route the user can request. */
  humanReviewOffered: boolean;
  /** Traceable automation-related evidence found in the text (verbatim quotes). */
  automationEvidence: StatusSignal[];
  appealInstructions: string | null;
  deadline: string | null;
  contactMethod: string | null;
  evidenceReferences: string[];
}

/**
 * A single evidence signal that contributed to the automation status.
 * Every signal is traceable: `quote` is the verbatim sentence from the
 * user's decision text in which the signal was found.
 */
export interface StatusSignal {
  /** Plain-language description of what was found. */
  text: string;
  /** Verbatim excerpt from the decision text that the signal is based on. */
  quote: string;
  /**
   * automated     — explicit automated processing / system
   * ai            — explicit AI / machine learning
   * solely        — text states no human involvement / decision made by an automated system
   * algorithm     — algorithm or scoring system mentioned
   * score         — a score is mentioned (weak: scores can be used by people too)
   * human         — a human made or reviewed the decision
   * human_route   — human review is offered as a route (not evidence of who decided)
   * neutral       — noted but not counted (e.g. "automated email")
   */
  type: 'automated' | 'ai' | 'solely' | 'algorithm' | 'score' | 'human' | 'human_route' | 'neutral';
  weight: 'strong' | 'moderate' | 'weak';
}

/**
 * The role automation appears to have played, as far as the evidence shows.
 * Kept separate from AutomationStatus so "solely automated" is never
 * collapsed into "AI-assisted" or "unknown".
 */
export type AutomationInvolvement =
  | 'solely_automated'
  | 'role_unclear'
  | 'ai_assisted'
  | 'human'
  | 'not_established';

/** Result of the automation-status analysis. */
export interface AutomationAnalysis {
  status: AutomationStatus;
  involvement: AutomationInvolvement;
  signals: StatusSignal[];
  explanation: string;
  /** WHAT IT SUGGESTS — careful inferences drawn only from the signals. */
  suggests: string[];
  /** WHAT IT DOES NOT ESTABLISH — the important uncertainty. */
  notEstablished: string[];
  /** Practical next steps that follow from this evidence status. */
  nextSteps: string[];
}

/** A right or option the user may have, with context. */
export interface RightsOption {
  id: string;
  title: string;
  explanation: string;
  whyItMatters: string;
  confidence: 'high' | 'medium' | 'low';
  jurisdictionContext?: string;
  source?: string;
}

/** A single step in the action plan. */
export interface ActionStep {
  step: number;
  title: string;
  description: string;
  actions: string[];
}

/** A generated challenge letter. */
export interface ChallengeLetter {
  subject: string;
  body: string;
  recipientOrganization: string | null;
  generatedAt: string;
  caseId: string;
}

/** An evidence item in the vault timeline. */
export interface EvidenceItem {
  id: string;
  type: 'decision' | 'screenshot' | 'document' | 'email' | 'note' | 'challenge';
  label: string;
  description: string;
  timestamp: string;
}

/** A case tracked through the REDRESS pipeline. */
export interface RedressCase {
  id: string;
  createdAt: string;
  inputMethod: InputMethod;
  rawText: string;
  extracted: ExtractedData;
  automation: AutomationAnalysis;
  jurisdiction: JurisdictionCode | null;
  rightsOptions: RightsOption[];
  actionPlan: ActionStep[];
  challenge: ChallengeLetter | null;
  challengeStatus: ChallengeStatus;
  evidence: EvidenceItem[];
}

/** Legal reference material for a jurisdiction. */
export interface LegalReference {
  code: JurisdictionCode;
  label: string;
  flag: string;
  frameworks: LegalFramework[];
  disclaimer: string;
}

/**
 * What kind of decision a framework is about. Used to avoid presenting,
 * e.g., a solely-automated-decision safeguard as if it applied to any decision.
 */
export type FrameworkScope =
  | 'solely_automated'
  | 'ai_system'
  | 'data_rights'
  | 'credit'
  | 'complaints'
  | 'general';

export interface LegalFramework {
  name: string;
  shortName: string;
  description: string;
  rights: string[];
  source: string;
  applicableWhen: string;
  scope: FrameworkScope;
  /** Conditions and limitations that must be met before it applies. */
  limitations: string;
  /** Whether human review is required, available on request, or not provided by this framework. */
  humanReview: string;
  /** Currency note — commencement, amendments or uncertainty about status. */
  currency: string;
}

/** An AI explanation response with provenance. */
export interface ExplainResponse {
  question: string;
  answer: string;
  sources: string[];
  caveats: string[];
}

/** The overall app flow stage. */
export type FlowStage =
  | 'input'
  | 'analysis'
  | 'jurisdiction'
  | 'rights'
  | 'action_plan'
  | 'challenge'
  | 'evidence'
  | 'explain';

/** The visual case tracker milestones. */
export interface CaseMilestone {
  id: string;
  label: string;
  completed: boolean;
  timestamp: string | null;
}
