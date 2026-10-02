// ============================================================================
// REDRESS × Apertus — shared types
//
// Apertus is used ONLY as a language layer (translate, explain, draft).
// The deterministic REDRESS engine stays the source of truth for facts,
// automation status and legal references. Every sentence Apertus writes is
// checked by the Receipts verifier before it is shown as verified.
// ============================================================================

/** Languages REDRESS can explain and draft in. */
export type LanguageCode = 'en' | 'de' | 'fr' | 'it';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  /** Abort after this many milliseconds. */
  timeoutMs?: number;
}

/** Anything that can complete a chat — the real Apertus proxy or the stand-in. */
export interface ApertusClient {
  /** Shown in the UI so users always know what produced the text. */
  readonly label: string;
  readonly kind: 'apertus' | 'mock';
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<string>;
}

/** A single verifiable fact the model may cite, keyed by a short ID. */
export interface Fact {
  id: string;
  kind: 'decision' | 'evidence' | 'gap' | 'step' | 'law' | 'question';
  /** The fact as REDRESS established it (English). */
  text: string;
  /** For evidence facts: the verbatim sentence from the original notice. */
  sourceQuote?: string;
  /** For evidence facts: which kind of signal it is. */
  signalType?: import('@/types').StatusSignal['type'];
}

export interface FactSheet {
  facts: Fact[];
  /** Fast lookup by ID. */
  byId: Record<string, Fact>;
}

/** A sentence as written by the model, with the fact IDs it claims to rely on. */
export interface DraftSentence {
  text: string;
  cites: string[];
  /** Courtesy / structure lines in letters (greeting, sign-off) — no claims allowed. */
  framing?: boolean;
}

export type ReceiptVerdict = 'verified' | 'blocked';

export interface ReceiptSentence extends DraftSentence {
  verdict: ReceiptVerdict;
  /** Why it was blocked (empty when verified). */
  reasons: string[];
}

export interface ReceiptsSummary {
  checked: number;
  verified: number;
  blocked: number;
}

export interface GroundedOutput {
  language: LanguageCode;
  sentences: ReceiptSentence[];
  summary: ReceiptsSummary;
  /** What produced the text. */
  producedBy: 'apertus' | 'mock' | 'rule_based_fallback';
  modelLabel: string;
  /** Present when the model failed and REDRESS fell back. */
  fallbackReason?: string;
}

/** One aligned sentence of a translated notice. */
export interface AlignedSentence {
  source: string;
  english: string;
}

export interface NoticeTranslation {
  sourceLanguage: LanguageCode;
  sentences: AlignedSentence[];
  /** English text the deterministic engine analyses. */
  englishText: string;
  producedBy: 'apertus' | 'mock';
  modelLabel: string;
  /** Model sentences dropped because they did not match the original notice. */
  droppedSentences: number;
}
