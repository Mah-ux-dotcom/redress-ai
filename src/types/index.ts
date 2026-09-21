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
  humanReviewMentioned: boolean;
  appealInstructions: string | null;
  deadline: string | null;
  contactMethod: string | null;
  evidenceReferences: string[];
}

/** A single evidence signal that contributed to the automation status. */
export interface StatusSignal {
  text: string;
  type: 'automated' | 'ai' | 'algorithm' | 'human' | 'neutral';
  weight: 'strong' | 'moderate' | 'weak';
}

/** Result of the automation-status analysis. */
export interface AutomationAnalysis {
  status: AutomationStatus;
  signals: StatusSignal[];
  explanation: string;
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

export interface LegalFramework {
  name: string;
  shortName: string;
  description: string;
  rights: string[];
  source: string;
  applicableWhen: string;
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
