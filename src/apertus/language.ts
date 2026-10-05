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
  en: ['the', 'and', 'your', 'you', 'has', 'been', 'with', 'this', 'that', 'our', 'for', 'have', 'was', 'not', 'we', 'i', 'my', 'can', 'did', 'what', 'who', 'why', 'is', 'it', 'of', 'to'],
  de: ['der', 'die', 'das', 'und', 'ihr', 'ihre', 'ihren', 'sie', 'wurde', 'nicht', 'mit', 'wir', 'ist', 'den', 'eine', 'auf', 'für', 'ich', 'dass', 'ein', 'einen', 'kann', 'mein', 'meine', 'meinen', 'mir', 'mich', 'oder', 'wie', 'was', 'hat', 'habe', 'wurden', 'zu', 'von', 'warum'],
  fr: ['le', 'la', 'les', 'et', 'votre', 'vous', 'nous', 'été', 'pas', 'une', 'des', 'pour', 'est', 'avec', 'que', 'du', 'je', 'mon', 'ma', 'mes', 'qui', 'quoi', 'ont', 'puis', 'peux', 'il', 'elle', 'sur', 'pourquoi', 'ce', 'cette'],
  it: ['il', 'la', 'le', 'e', 'sua', 'suo', 'stata', 'stato', 'non', 'una', 'per', 'con', 'che', 'del', 'della', 'gentile', 'posso', 'io', 'mio', 'mia', 'i', 'gli', 'un', 'è', 'ho', 'come', 'cosa', 'chi', 'di', 'mi', 'perché', 'sono', 'ha'],
};

/**
 * Best-guess language of a text by stopword frequency. When the text gives no
 * clear signal (for example a very short question), returns `fallback`.
 */
export function detectLanguage(text: string, fallback: LanguageCode = 'en'): LanguageCode {
  const words = text.toLowerCase().match(/[a-zà-öø-ÿ]+/g) ?? [];
  if (words.length === 0) return fallback;
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
  return bestScore < 0.04 ? fallback : best;
}

/**
 * The language a model output appears to be written in, ignoring quoted text
 * (which may legitimately be in the notice's language). Returns null when the
 * text gives no clear signal.
 */
export function detectOutputLanguage(sentences: string[]): LanguageCode | null {
  const text = sentences
    .join(' ')
    .replace(/"[^"]*"|\u201C[^\u201D]*\u201D|\u201E[^\u201C\u201D]*[\u201C\u201D]|\u00AB[^\u00BB]*\u00BB/g, ' ');
  const a = detectLanguage(text, 'en');
  const b = detectLanguage(text, 'de');
  return a === b ? a : null;
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

/**
 * General statements about what a law covers ("for automated decisions that…")
 * describe a category of decisions; they do not claim this decision was automated.
 */
const LAW_SCOPE_PHRASES =
  /\b(?:for|about|regarding|on|in case of|in the case of)\s+(?:\w+\s+){0,3}(?:automated|AI)[\w-]*\s+(?:individual\s+)?decisions?\b|\b(?:bei|für|im Fall(?:e)? von)\s+(?:\w+\s+){0,2}automatisierten\s+(?:Einzel)?[Ee]ntscheid\w*|\b(?:en cas de|pour les|pour des)\s+(?:\w+\s+){0,2}décisions?\s+(?:\S+\s+){0,6}automatis\S*|\b(?:in caso di|per le|per decisioni)\s+(?:\w+\s+){0,2}decision\w*\s+(?:\S+\s+){0,6}automatizzat\S*/gi;

/** Text with neutral status and law-scope phrases removed, before checking for assertions. */
export function withoutScopePhrases(text: string): string {
  return text.replace(STATUS_PHRASES, '').replace(LAW_SCOPE_PHRASES, '');
}

export function assertsAutomation(text: string): boolean {
  const t = withoutScopePhrases(text);
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
  /\?|\bwhere applicable\b|\bif applicable\b|\bif so\b|\ble cas échéant\b|\bsi tel est le cas\b|\bgegebenenfalls\b|\bggf\.|\bfalls\b|\bwenn\b|\bsofern\b|\bsoweit\b|\bse del caso\b|\bove applicabile\b|\bin tal caso\b|\beventualmente\b|\bwhether\b|\bif\b|\bmay\b|\bmight\b|\bnot (?:established|stated|say|said|show|prove)|\bdoes not\b|\bdo not know\b|\bunclear\b|\bask\b|\bob\b|\bfalls\b|\bnicht\b|\bweder\b|\bkein(?:e|en)?\b|\bkönnte\b|\bunklar\b|\bfragen\b|\bsi\b|\bpas\b|\bne\b|\bni\b|\bn['’]|\bné\b|\bpeut-être\b|\bpourrait\b|\bdemander\b|\bse\b|\bnon\b|\bpotrebbe\b|\bchiedere\b|\bforse\b/i;

/**
 * Statements that the facts do NOT say something ("the notice does not state
 * whether…"). Made without citations, they are statements of absence, not
 * factual claims, and are treated like framing lines (shown, not counted).
 */
const NON_CLAIM: RegExp[] = [
  /\b(?:do|does|did)\s+not\s+(?:say|state|show|establish|prove|specify|mention|indicate|explain|cover|tell)\b|\bnot\s+(?:stated|established|specified|mentioned|known|clear)\b|\bthere is no information\b/i,
  /\b(?:sagt|sagen|nennt|nennen|zeigt|zeigen|belegt|belegen|beweist|beweisen|erwähnt|erwähnen|geht|lässt|lassen|ergibt|ergeben)\b.{0,80}\b(?:nicht|keine?n?)\b|\bnicht\s+(?:bekannt|angegeben|ersichtlich|klar|festgestellt|belegt)\b/i,
  /\b(?:ne|n['’])\s*(?:\S+\s+){0,3}?(?:dit|disent|précise\w*|prouve\w*|permet\w*|indique\w*|mentionne\w*|montre\w*|établi\w*|sait|savons)\b.{0,40}\b(?:pas|ni)\b/i,
  /\bnon\b.{0,40}\b(?:dic\w+|indic\w+|precis\w+|dimostr\w+|stabilisc\w+|menzion\w+|specific\w+|prov\w+|permett\w+|chiar\w+)/i,
];

export function isNonClaim(text: string): boolean {
  return NON_CLAIM.some((re) => re.test(text));
}

/** Legal conclusions, guarantees and certainty REDRESS never states as fact. */
export const OVERCLAIM: RegExp =
  /\bunlawful\b|\billegal\b|\bguarantee|\bdefinitely\b|\bcertainly\b|\byou will win\b|\bmust reverse\b|\bentitled to compensation\b|rechtswidrig|\bunzulässig|\bgarantiert|\bsicher gewinnen|\billégal|\billicite|\bcertainement\b|\bvous gagnerez\b|\billegittim|\billecit|\bsicuramente\b|\bgarantit|\bvincerà\b/i;

/** Statute / framework names that count as legal references. */
export const LAW_NAMES: RegExp =
  /\b(?:UK GDPR|GDPR|DSGVO|RGPD|FADP|revFADP|nFADP|DSG|nDSG|revDSG|LPD|nLPD|AI Act|KI-Verordnung|FCRA|ECOA|Regulation B|Reg\. B|DPA 2018|Data Protection Act|CCPA|Colorado AI Act)\b/g;

/** Article / section numbers, e.g. "Art. 22", "Article 15(1)(h)", "§ 1002.9". */
export const ARTICLE_REFS: RegExp = /\b(?:Art(?:icle|ikel|icolo)?\.?\s*\d+[A-Za-z]?|§\s*\d+(?:\.\d+)?|s\.\s*\d+)/gi;
