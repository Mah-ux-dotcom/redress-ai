// ============================================================================
// REDRESS × Apertus — language detection and multilingual lexicons
//
// Deterministic. Used to (a) decide whether a notice needs translating,
// (b) cross-check translated evidence against the original wording, and
// (c) let the Receipts verifier recognise risky claims in any output language.
// ============================================================================

import type { LanguageCode } from './types';

export const LANGUAGES: Record<LanguageCode, { label: string; native: string }> = {
  en: { label: 'English', native: 'English' },
  de: { label: 'German', native: 'Deutsch' },
  fr: { label: 'French', native: 'Français' },
  it: { label: 'Italian', native: 'Italiano' },
};

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

const STOPWORDS: Record<LanguageCode, string[]> = {
  en: ['the', 'and', 'your', 'you', 'has', 'been', 'with', 'this', 'that', 'our', 'for', 'have', 'was', 'not', 'we'],
  de: ['der', 'die', 'das', 'und', 'ihr', 'ihre', 'ihren', 'sie', 'wurde', 'nicht', 'mit', 'wir', 'ist', 'den', 'eine', 'auf', 'für'],
  fr: ['le', 'la', 'les', 'et', 'votre', 'vous', 'nous', 'été', 'pas', 'une', 'des', 'pour', 'est', 'avec', 'que', 'du'],
  it: ['il', 'la', 'le', 'e', 'la', 'sua', 'suo', 'stata', 'stato', 'non', 'una', 'per', 'con', 'che', 'del', 'della', 'gentile'],
};

/** Best-guess language of a text by stopword frequency. Defaults to English. */
export function detectLanguage(text: string): LanguageCode {
  const words = text.toLowerCase().match(/[a-zà-öø-ÿ]+/g) ?? [];
  if (words.length === 0) return 'en';
  let best: LanguageCode = 'en';
  let bestScore = 0;
  for (const code of LANGUAGE_CODES) {
    const set = new Set(STOPWORDS[code]);
    const score = words.filter((w) => set.has(w)).length / words.length;
    if (score > bestScore) {
      best = code;
      bestScore = score;
    }
  }
  return bestScore < 0.04 ? 'en' : best;
}

// ---------------------------------------------------------------------------
// Cross-lingual evidence cues.
// When a notice is translated, any automation / human signal the engine finds
// in the English translation must also have a matching cue in the original
// sentence. Otherwise the signal depends on the translation alone and is not
// counted — the model cannot "translate in" evidence of automation.
// ---------------------------------------------------------------------------

/** AI acronyms are matched case-sensitively: "ai" is a common word in Italian ("ai sensi"). */
const ACRONYM: Record<LanguageCode, RegExp> = {
  en: /(?:^|[^A-Za-z])A\.?I\.?(?=$|[^A-Za-z])/,
  de: /(?:^|[^A-Za-zÄÖÜäöü])KI(?=$|[^A-Za-zÄÖÜäöü])/,
  fr: /(?:^|[^A-Za-zÀ-ÿ])IA(?=$|[^A-Za-zÀ-ÿ])/,
  it: /(?:^|[^A-Za-zÀ-ÿ])IA(?=$|[^A-Za-zÀ-ÿ])/,
};

const AUTOMATION_CUE_WORDS: Record<LanguageCode, RegExp> = {
  en: /\bautomat|\balgorithm|\bartificial intelligence\b|machine[- ]learning|\bscor/i,
  de: /automati|maschinell|algorithm|künstliche[nr]? intelligenz|maschinelles lernen|scoring|bewertungssystem|\bsystem/i,
  fr: /automati|algorithm|intelligence artificielle|apprentissage automatique|scor|notation|\bsystème/i,
  it: /automati|algoritm|intelligenza artificiale|apprendimento automatico|scor|punteggio|\bsistema/i,
};

/** True when the ORIGINAL-language sentence contains wording about automation / AI. */
export function hasAutomationCue(lang: LanguageCode, text: string): boolean {
  return AUTOMATION_CUE_WORDS[lang].test(text) || ACRONYM[lang].test(text);
}

export const HUMAN_CUES: Record<LanguageCode, RegExp> = {
  en: /\bhuman|\bmanual|\bperson|\bteam|\bofficer|\bunderwriter|\bspecialist|\bstaff|\bcase ?worker|\breviewer|\bmanager|\badvis/i,
  de: /mensch|manuell|person|sachbearbeit|mitarbeit|team|fachstelle|spezialist|prüfer|berater|geprüft von/i,
  fr: /humain|manuel|personne|équipe|conseill|agent|spécialiste|gestionnaire|examiné par|collaborat/i,
  it: /uman|manual|persona|team|squadra|operatore|consulente|specialista|incaricat|esaminat|collaborat/i,
};

// ---------------------------------------------------------------------------
// Receipts lexicons (all output languages).
// ---------------------------------------------------------------------------

/** Words that assert automation / AI involvement (acronyms checked case-sensitively). */
const AUTOMATION_WORDS =
  /automat|algorithm|algorithme|algoritm|artificial intelligence|künstliche intelligenz|intelligence artificielle|intelligenza artificiale|machine learning|maschinell/i;
const AUTOMATION_ACRONYMS = /(?:^|[^A-Za-zÀ-ÿ])(?:AI|A\.I\.|KI|IA)(?=$|[^A-Za-zÀ-ÿ])/;

/** Neutral phrases that name the classification itself rather than claim automation was used. */
const STATUS_PHRASES = /automation status|automatisierungsstatus|statut d['’]automatisation|stato di automazione/gi;

export function assertsAutomation(text: string): boolean {
  const t = text.replace(STATUS_PHRASES, '');
  return AUTOMATION_WORDS.test(t) || AUTOMATION_ACRONYMS.test(t);
}

/**
 * Statements that a PERSON made or reviewed the decision (past tense / passive).
 * Requests ("ask for a person to review") are not matched.
 */
const HUMAN_ASSERTION: RegExp[] = [
  /\b(?:was|were|has been|had been)\s+(?:\w+\s+){0,2}(?:reviewed|decided|made|assessed|checked|taken)\s+(?:\w+\s+){0,2}by\s+(?:a|an|our|the|one of)\s+(?:\w+\s+){0,2}(?:person|human|member of staff|employee|officer|underwriter|team|specialist|caseworker|reviewer)/i,
  /\b(?:a|the)\s+(?:person|human|member of staff|caseworker|underwriter)\s+(?:reviewed|made|decided|checked|assessed)\b/i,
  /\bmanually\s+(?:reviewed|assessed|decided|checked)\b/i,
  /\b(?:wurde|wurden|ist|hat)\b.{0,60}\bvon\s+(?:einer|einem|unserer|unserem|der|dem)\s+(?:\w+\s+)?(?:Person|Mensch|Mitarbeiter\w*|Sachbearbeiter\w*|Fachperson|Team|Spezialist\w*)\b.{0,40}\b(?:geprüft|getroffen|entschieden|bewertet|überprüft)/i,
  /\bmanuell\s+(?:geprüft|überprüft|bewertet|entschieden)\b/i,
  /\b(?:a|ont)\s+été\s+(?:\w+\s+){0,2}(?:examinée?s?|prise?s?|décidée?s?|vérifiée?s?|évaluée?s?)\s+par\s+(?:une?|notre|nos|le|la)\s+(?:\w+\s+)?(?:personne|humain|collaborat\w+|agent|conseill\w+|équipe|spécialiste)/i,
  /\bmanuellement\s+(?:examinée?|vérifiée?|évaluée?)\b/i,
  /(?:^|\s)(?:è|sono)\s+stat[aoie]\s+(?:\w+\s+){0,2}(?:esaminat\w|pres\w|decis\w|verificat\w|valutat\w)\s+da\s+(?:una?|uno|il|la|il nostro|la nostra|un nostro|una nostra)\s+(?:\w+\s+)?(?:persona|operatore|collaborat\w+|consulente|team|specialista|incaricat\w)/i,
  /\bmanualmente\s+(?:esaminat\w|verificat\w|valutat\w)\b/i,
];

export function assertsHumanDecision(text: string): boolean {
  return HUMAN_ASSERTION.some((re) => re.test(text));
}

/** Words that assert the decision was SOLELY automated. */
export const SOLELY_ASSERTION: RegExp =
  /solely|fully automat|entirely automat|without (?:any )?human|ausschliesslich|ausschließlich|vollautomati|ohne menschlich|uniquement|exclusivement|entièrement automati|sans intervention humaine|esclusivamente|unicamente|interamente automati|senza intervento umano/i;

/**
 * Markers that a sentence is asking, hedging or negating rather than asserting.
 * A sentence containing one of these is not treated as a factual assertion.
 */
export const HEDGE_MARKERS: RegExp =
  /\?|\bwhether\b|\bif\b|\bmay\b|\bmight\b|\bnot (?:established|stated|say|said|show|prove)|\bdoes not\b|\bdo not know\b|\bunclear\b|\bask\b|\bob\b|\bfalls\b|\bnicht\b|\bweder\b|\bkein(?:e|en)?\b|\bkönnte\b|\bunklar\b|\bfragen\b|\bsi\b|\bpas\b|\bne\b|\bni\b|\bn['’]|\bné\b|\bpeut-être\b|\bpourrait\b|\bdemander\b|\bse\b|\bnon\b|\bpotrebbe\b|\bchiedere\b|\bforse\b/i;

/** Legal conclusions, guarantees and certainty REDRESS never states as fact. */
export const OVERCLAIM: RegExp =
  /\bunlawful\b|\billegal\b|\bguarantee|\bdefinitely\b|\bcertainly\b|\byou will win\b|\bmust reverse\b|\bentitled to compensation\b|rechtswidrig|\bunzulässig|\bgarantiert|\bsicher gewinnen|\billégal|\billicite|\bcertainement\b|\bvous gagnerez\b|\billegittim|\billecit|\bsicuramente\b|\bgarantit|\bvincerà\b/i;

/** Statute / framework names that count as legal references. */
export const LAW_NAMES: RegExp =
  /\b(?:UK GDPR|GDPR|DSGVO|RGPD|FADP|revFADP|nFADP|DSG|nDSG|revDSG|LPD|nLPD|AI Act|KI-Verordnung|FCRA|ECOA|Regulation B|Reg\. B|DPA 2018|Data Protection Act|CCPA|Colorado AI Act)\b/g;

/** Article / section numbers, e.g. "Art. 22", "Article 15(1)(h)", "§ 1002.9". */
export const ARTICLE_REFS: RegExp = /\b(?:Art(?:icle|ikel|icolo)?\.?\s*\d+[A-Za-z]?|§\s*\d+(?:\.\d+)?|s\.\s*\d+)/gi;
