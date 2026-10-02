// ============================================================================
// REDRESS × Apertus — stand-in model (mock)
//
// Used until real Apertus access is configured. It is clearly labelled in the
// UI as a stand-in. It runs entirely in the browser, writes from the same fact
// sheet a real model receives, and returns the same JSON shape — so the whole
// pipeline (translation alignment, Receipts, fallback) is exercised end to end.
//
// To demonstrate Receipts, it can add deliberately unsupported sentences (an
// invented deadline, a legal conclusion, an unsupported automation claim),
// which the verifier must block. Turn off with VITE_APERTUS_MOCK_HALLUCINATE=false.
// ============================================================================

import type { AutomationInvolvement, AutomationStatus } from '@/types';
import { INVOLVEMENT_META, STATUS_META } from '@/lib/analyze';
import { ApertusUnavailableError } from './errors';
import { FACTS_END, FACTS_START, NOTICE_END, NOTICE_START } from './prompts';
import { CANNED_TRANSLATIONS } from './cannedTranslations';
import type { ApertusClient, ChatMessage, LanguageCode } from './types';

interface MockFact {
  id: string;
  kind: string;
  fact: string;
  quote?: string;
}

type L = Record<LanguageCode, string>;

const OUTCOME: Record<string, L> = {
  'Rejected / Denied': { en: 'a refusal', de: 'eine Ablehnung', fr: 'un refus', it: 'un rifiuto' },
  'Suspended / Restricted': { en: 'a suspension or restriction', de: 'eine Sperrung oder Einschränkung', fr: 'une suspension ou restriction', it: 'una sospensione o limitazione' },
  'Approved / Accepted': { en: 'an approval', de: 'eine Genehmigung', fr: 'une acceptation', it: "un'approvazione" },
};

const STATUS_LABEL: Record<AutomationStatus, L> = {
  confirmed_automated: { en: 'Confirmed Automated', de: 'Automatisierung bestätigt', fr: 'Automatisation confirmée', it: 'Automazione confermata' },
  possibly_automated: {
    en: 'Possibly Automated / AI-Assisted',
    de: 'Möglicherweise automatisiert / KI-gestützt',
    fr: 'Possiblement automatisée / assistée par IA',
    it: 'Possibilmente automatizzata / assistita da IA',
  },
  not_established: { en: 'Not Established', de: 'Nicht festgestellt', fr: 'Non établi', it: 'Non accertato' },
  human_indicated: { en: 'Human Decision Indicated', de: 'Menschlicher Entscheid angegeben', fr: 'Décision humaine indiquée', it: 'Decisione umana indicata' },
};

const T = {
  happened: {
    en: (org: string, date: string, outcome: string) => `${org} sent you a decision${date ? ` dated ${date}` : ''}: ${outcome}.`,
    de: (org: string, date: string, outcome: string) => `${org} hat Ihnen${date ? ` am ${date}` : ''} einen Entscheid mitgeteilt: ${outcome}.`,
    fr: (org: string, date: string, outcome: string) => `${org} vous a communiqué une décision${date ? ` datée du ${date}` : ''} : ${outcome}.`,
    it: (org: string, date: string, outcome: string) => `${org} le ha comunicato una decisione${date ? ` datata ${date}` : ''}: ${outcome}.`,
  },
  someOrg: { en: 'The organisation', de: 'Die Organisation', fr: "L'organisation", it: "L'organizzazione" } as L,
  reason: {
    en: (r: string) => `The reason given was: "${r}".`,
    de: (r: string) => `Als Grund wurde angegeben: «${r}».`,
    fr: (r: string) => `Le motif indiqué est : « ${r} ».`,
    it: (r: string) => `Il motivo indicato è: «${r}».`,
  },
  status: {
    en: (s: string) => `REDRESS classifies the automation status as: ${s}.`,
    de: (s: string) => `REDRESS stuft den Automatisierungsstatus so ein: ${s}.`,
    fr: (s: string) => `REDRESS classe le statut d'automatisation comme suit : ${s}.`,
    it: (s: string) => `REDRESS classifica lo stato di automazione come: ${s}.`,
  },
  evidence: {
    en: (q: string) => `The notice says: "${q}"`,
    de: (q: string) => `Im Schreiben steht: «${q}»`,
    fr: (q: string) => `Le courrier indique : « ${q} »`,
    it: (q: string) => `Nella comunicazione si legge: «${q}»`,
  },
  noEvidence: {
    en: 'The notice does not say whether an automated system, AI or a person made the decision.',
    de: 'Das Schreiben sagt nicht, ob ein automatisiertes System, KI oder eine Person entschieden hat.',
    fr: 'Le courrier ne dit pas si un système automatisé, une IA ou une personne a pris la décision.',
    it: 'La comunicazione non dice se la decisione sia stata presa da un sistema automatizzato, da una IA o da una persona.',
  } as L,
  gap: {
    role_unclear: {
      en: 'The notice does not establish whether a person was involved in the final decision.',
      de: 'Das Schreiben belegt nicht, ob eine Person am endgültigen Entscheid beteiligt war.',
      fr: "Le courrier n'établit pas si une personne a participé à la décision finale.",
      it: 'La comunicazione non stabilisce se una persona abbia partecipato alla decisione finale.',
    },
    solely_automated: {
      en: 'It does not show which information about you the system used.',
      de: 'Es zeigt nicht, welche Informationen über Sie das System verwendet hat.',
      fr: 'Il ne montre pas quelles informations vous concernant le système a utilisées.',
      it: 'Non mostra quali informazioni su di lei il sistema abbia utilizzato.',
    },
    ai_assisted: {
      en: 'It does not show how much weight the person gave to the automated output.',
      de: 'Es zeigt nicht, wie stark sich die Person auf das automatisierte Ergebnis gestützt hat.',
      fr: 'Il ne montre pas quel poids la personne a accordé au résultat automatisé.',
      it: 'Non mostra quanto peso la persona abbia dato al risultato automatizzato.',
    },
    not_established: {
      en: 'The absence of a mention does not prove whether automation was used or not.',
      de: 'Dass nichts erwähnt wird, beweist nicht, ob eine Automatisierung verwendet wurde oder nicht.',
      fr: "L'absence de mention ne prouve pas si une automatisation a été utilisée ou non.",
      it: "L'assenza di menzione non prova se sia stata usata un'automazione o no.",
    },
    human: {
      en: "It does not say whether automated tools informed the person's decision.",
      de: 'Es sagt nicht, ob automatisierte Hilfsmittel den Entscheid der Person beeinflusst haben.',
      fr: 'Il ne dit pas si des outils automatisés ont influencé la décision de la personne.',
      it: 'Non dice se strumenti automatizzati abbiano influenzato la decisione della persona.',
    },
  } as Record<AutomationInvolvement, L>,
  askRole: {
    confirmed_automated: {
      en: 'Ask the organisation to confirm whether a person was involved in the final decision.',
      de: 'Bitten Sie die Organisation zu bestätigen, ob eine Person am endgültigen Entscheid beteiligt war.',
      fr: "Demandez à l'organisation de confirmer si une personne a participé à la décision finale.",
      it: "Chieda all'organizzazione di confermare se una persona abbia partecipato alla decisione finale.",
    },
    possibly_automated: {
      en: 'Ask what role the automated system played and what role the person played.',
      de: 'Fragen Sie, welche Rolle das automatisierte System und welche Rolle die Person gespielt hat.',
      fr: 'Demandez quel rôle le système automatisé a joué et quel rôle la personne a joué.',
      it: 'Chieda quale ruolo abbia avuto il sistema automatizzato e quale la persona.',
    },
    not_established: {
      en: 'Ask the organisation whether automated processing or AI was involved, and what role it played.',
      de: 'Fragen Sie die Organisation, ob eine automatisierte Verarbeitung oder KI beteiligt war und welche Rolle sie gespielt hat.',
      fr: "Demandez à l'organisation si un traitement automatisé ou une IA a été utilisé, et quel rôle il a joué.",
      it: "Chieda all'organizzazione se sia stato usato un trattamento automatizzato o una IA, e con quale ruolo.",
    },
    human_indicated: {
      en: 'Ask for the specific reasons and the information the decision-maker relied on.',
      de: 'Fragen Sie nach den konkreten Gründen und den Informationen, auf die sich die entscheidende Person gestützt hat.',
      fr: 'Demandez les motifs précis et les informations sur lesquelles la personne qui a décidé s’est appuyée.',
      it: 'Chieda i motivi precisi e le informazioni su cui si è basata la persona che ha deciso.',
    },
  } as Record<AutomationStatus, L>,
  askInfo: {
    en: 'Request the information about you that the decision was based on.',
    de: 'Verlangen Sie die Informationen über Sie, auf denen der Entscheid beruht.',
    fr: 'Demandez les informations vous concernant sur lesquelles la décision repose.',
    it: 'Richieda le informazioni che la riguardano su cui si basa la decisione.',
  } as L,
  askReview: {
    en: 'Ask for the decision to be reviewed by a person.',
    de: 'Verlangen Sie, dass eine Person den Entscheid überprüft.',
    fr: 'Demandez que la décision soit réexaminée par une personne.',
    it: 'Chieda che la decisione sia riesaminata da una persona.',
  } as L,
  preserve: {
    en: 'Keep the original decision exactly as you received it.',
    de: 'Bewahren Sie den ursprünglichen Entscheid genau so auf, wie Sie ihn erhalten haben.',
    fr: "Conservez la décision d'origine exactement telle que vous l'avez reçue.",
    it: "Conservi la decisione originale esattamente come l'ha ricevuta.",
  } as L,
  law: {
    en: (name: string) => `Depending on the facts, ${name} may be relevant.`,
    de: (name: string) => `Je nach Sachlage kann ${name} relevant sein.`,
    fr: (name: string) => `Selon les circonstances, ${name} peut être pertinent.`,
    it: (name: string) => `A seconda delle circostanze, ${name} può essere rilevante.`,
  },
  // Deliberately unsupported sentences — the verifier must block these.
  fakeDeadline: {
    en: 'You must appeal within 30 days or you lose the right to challenge.',
    de: 'Sie müssen innerhalb von 30 Tagen Einspruch erheben, sonst verlieren Sie das Recht auf Anfechtung.',
    fr: 'Vous devez contester dans un délai de 30 jours, sinon vous perdez le droit de recours.',
    it: 'Deve presentare ricorso entro 30 giorni, altrimenti perde il diritto di contestare.',
  } as L,
  fakeConclusion: {
    en: 'This decision is unlawful and the organisation must reverse it.',
    de: 'Dieser Entscheid ist rechtswidrig und muss aufgehoben werden.',
    fr: 'Cette décision est illégale et doit être annulée.',
    it: 'Questa decisione è illegittima e deve essere annullata.',
  } as L,
  fakeAutomation: {
    en: "The organisation's AI system made this decision about you.",
    de: 'Das KI-System der Organisation hat diesen Entscheid über Sie getroffen.',
    fr: "Le système d'IA de l'organisation a pris cette décision vous concernant.",
    it: "Il sistema di IA dell'organizzazione ha preso questa decisione su di lei.",
  } as L,
  fakeLetterLaw: {
    en: 'Under Article 99 of the GDPR you must reply within 7 days.',
    de: 'Gemäss Artikel 99 DSGVO müssen Sie innerhalb von 7 Tagen antworten.',
    fr: "En vertu de l'article 99 du RGPD, vous devez répondre sous 7 jours.",
    it: "Ai sensi dell'articolo 99 del RGPD, dovete rispondere entro 7 giorni.",
  } as L,
  // Letter
  greeting: { en: 'Dear Sir or Madam,', de: 'Sehr geehrte Damen und Herren', fr: 'Madame, Monsieur,', it: 'Gentili Signore e Signori,' } as L,
  intro: {
    en: (org: string, date: string) => `I am writing to request a review of the decision ${org} communicated to me${date ? ` on ${date}` : ''}.`,
    de: (org: string, date: string) => `Ich ersuche um Überprüfung des Entscheids, den mir ${org}${date ? ` am ${date}` : ''} mitgeteilt hat.`,
    fr: (org: string, date: string) => `Je vous écris pour demander le réexamen de la décision que ${org} m'a communiquée${date ? ` le ${date}` : ''}.`,
    it: (org: string, date: string) => `Le scrivo per chiedere il riesame della decisione che ${org} mi ha comunicato${date ? ` il ${date}` : ''}.`,
  },
  yourOrg: { en: 'your organisation', de: 'Ihre Organisation', fr: 'votre organisation', it: 'la vostra organizzazione' } as L,
  reference: {
    en: (r: string) => `Reference: ${r}.`,
    de: (r: string) => `Referenz: ${r}.`,
    fr: (r: string) => `Référence : ${r}.`,
    it: (r: string) => `Riferimento: ${r}.`,
  },
  states: {
    en: (q: string) => `Your communication states: "${q}"`,
    de: (q: string) => `In Ihrem Schreiben heisst es: «${q}»`,
    fr: (q: string) => `Votre courrier indique : « ${q} »`,
    it: (q: string) => `La vostra comunicazione afferma: «${q}»`,
  },
  askAnswer: {
    en: 'I would be grateful if you would answer the following:',
    de: 'Ich bitte Sie, mir die folgenden Fragen zu beantworten:',
    fr: 'Je vous serais reconnaissant(e) de bien vouloir répondre aux questions suivantes :',
    it: 'Vi sarei grato/a se rispondeste alle seguenti domande:',
  } as L,
  closing: {
    en: 'I look forward to your response.',
    de: 'Ich danke Ihnen im Voraus für Ihre Antwort.',
    fr: "Dans l'attente de votre réponse, je vous prie d'agréer mes salutations distinguées.",
    it: 'In attesa di un vostro riscontro, porgo distinti saluti.',
  } as L,
  signoff: { en: 'Yours faithfully,', de: 'Freundliche Grüsse', fr: 'Cordialement,', it: 'Cordiali saluti,' } as L,
};

/** Localised versions of REDRESS's fixed letter questions, keyed by their English text. */
const QUESTION_TRANSLATIONS: { match: RegExp; t: L }[] = [
  {
    match: /^Please confirm whether this decision was made solely by the automated system you refer to/,
    t: {
      en: 'Please confirm whether this decision was made solely by the automated system you refer to, or whether a person reviewed or made the final decision.',
      de: 'Bitte bestätigen Sie, ob dieser Entscheid allein durch das von Ihnen erwähnte automatisierte System getroffen wurde oder ob eine Person den endgültigen Entscheid überprüft oder getroffen hat.',
      fr: 'Veuillez confirmer si cette décision a été prise uniquement par le système automatisé que vous mentionnez, ou si une personne a examiné ou pris la décision finale.',
      it: 'Vogliate confermare se questa decisione sia stata presa unicamente dal sistema automatizzato da voi menzionato, oppure se una persona abbia esaminato o preso la decisione finale.',
    },
  },
  {
    match: /^Please confirm whether this decision was made solely by automated means/,
    t: {
      en: 'Please confirm whether this decision was made solely by automated means, without any person reviewing it before it was issued.',
      de: 'Bitte bestätigen Sie, ob dieser Entscheid ausschliesslich automatisiert getroffen wurde, ohne dass eine Person ihn vor dem Versand geprüft hat.',
      fr: "Veuillez confirmer si cette décision a été prise uniquement par des moyens automatisés, sans qu'aucune personne ne l'examine avant son envoi.",
      it: 'Vogliate confermare se questa decisione sia stata presa esclusivamente con mezzi automatizzati, senza che una persona la esaminasse prima dell’invio.',
    },
  },
  {
    match: /^Please explain how the automated processing was used/,
    t: {
      en: 'Please explain how the automated processing was used in reaching this decision, and which information about me it used.',
      de: 'Bitte erläutern Sie, wie die automatisierte Verarbeitung für diesen Entscheid eingesetzt wurde und welche Informationen über mich verwendet wurden.',
      fr: 'Veuillez expliquer comment le traitement automatisé a été utilisé pour parvenir à cette décision et quelles informations me concernant il a utilisées.',
      it: 'Vogliate spiegare come il trattamento automatizzato sia stato utilizzato per giungere a questa decisione e quali informazioni che mi riguardano abbia utilizzato.',
    },
  },
  {
    match: /^Please arrange for a person to review this decision/,
    t: {
      en: 'Please arrange for a person to review this decision, and let me know how I can give my view and provide any further information.',
      de: 'Bitte veranlassen Sie, dass eine Person diesen Entscheid überprüft, und teilen Sie mir mit, wie ich meine Sicht darlegen und weitere Informationen einreichen kann.',
      fr: 'Veuillez faire réexaminer cette décision par une personne et m’indiquer comment je peux exprimer mon point de vue et fournir des informations complémentaires.',
      it: 'Vogliate far riesaminare questa decisione da una persona e indicarmi come posso esprimere il mio punto di vista e fornire ulteriori informazioni.',
    },
  },
  {
    match: /^Please confirm whether automated processing, an algorithm or AI was used/,
    t: {
      en: 'Please confirm whether automated processing, an algorithm or AI was used in making this decision, and what role it played.',
      de: 'Bitte bestätigen Sie, ob bei diesem Entscheid eine automatisierte Verarbeitung, ein Algorithmus oder KI eingesetzt wurde und welche Rolle sie gespielt hat.',
      fr: 'Veuillez confirmer si un traitement automatisé, un algorithme ou une IA a été utilisé pour prendre cette décision, et quel rôle il a joué.',
      it: 'Vogliate confermare se nel prendere questa decisione sia stato usato un trattamento automatizzato, un algoritmo o una IA, e con quale ruolo.',
    },
  },
  {
    match: /^Please confirm whether a person made or reviewed the final decision/,
    t: {
      en: 'Please confirm whether a person made or reviewed the final decision, and what that review involved.',
      de: 'Bitte bestätigen Sie, ob eine Person den endgültigen Entscheid getroffen oder überprüft hat und worin diese Prüfung bestand.',
      fr: 'Veuillez confirmer si une personne a pris ou examiné la décision finale, et en quoi cet examen a consisté.',
      it: 'Vogliate confermare se una persona abbia preso o esaminato la decisione finale e in cosa sia consistito tale esame.',
    },
  },
  {
    match: /^Please let me know how I can ask for the decision to be reconsidered by a person/,
    t: {
      en: 'Please let me know how I can ask for the decision to be reconsidered by a person, and give my view.',
      de: 'Bitte teilen Sie mir mit, wie ich eine erneute Prüfung durch eine Person verlangen und meine Sicht darlegen kann.',
      fr: 'Veuillez m’indiquer comment demander le réexamen de la décision par une personne et exprimer mon point de vue.',
      it: 'Vogliate indicarmi come chiedere il riesame della decisione da parte di una persona ed esprimere il mio punto di vista.',
    },
  },
  {
    match: /^Please confirm whether any automated or AI-assisted processing was used/,
    t: {
      en: 'Please confirm whether any automated or AI-assisted processing was used in making this decision.',
      de: 'Bitte bestätigen Sie, ob bei diesem Entscheid eine automatisierte oder KI-gestützte Verarbeitung eingesetzt wurde.',
      fr: 'Veuillez confirmer si un traitement automatisé ou assisté par IA a été utilisé pour prendre cette décision.',
      it: 'Vogliate confermare se nel prendere questa decisione sia stato utilizzato un trattamento automatizzato o assistito da IA.',
    },
  },
  {
    match: /^If it was, please explain what role it played/,
    t: {
      en: 'If it was, please explain what role it played in the outcome.',
      de: 'Falls ja, erläutern Sie bitte, welche Rolle sie beim Ergebnis gespielt hat.',
      fr: 'Si tel est le cas, veuillez expliquer le rôle qu’il a joué dans le résultat.',
      it: 'In caso affermativo, vogliate spiegare quale ruolo abbia avuto nel risultato.',
    },
  },
  {
    match: /^Please confirm whether a person reviewed or made this decision/,
    t: {
      en: 'Please confirm whether a person reviewed or made this decision.',
      de: 'Bitte bestätigen Sie, ob eine Person diesen Entscheid überprüft oder getroffen hat.',
      fr: 'Veuillez confirmer si une personne a examiné ou pris cette décision.',
      it: 'Vogliate confermare se una persona abbia esaminato o preso questa decisione.',
    },
  },
  {
    match: /^Please explain how this decision can be reviewed or challenged/,
    t: {
      en: 'Please explain how this decision can be reviewed or challenged, including whether I can ask for it to be reconsidered by a person.',
      de: 'Bitte erläutern Sie, wie dieser Entscheid überprüft oder angefochten werden kann, einschliesslich der Möglichkeit einer erneuten Prüfung durch eine Person.',
      fr: 'Veuillez expliquer comment cette décision peut être réexaminée ou contestée, y compris si je peux demander un réexamen par une personne.',
      it: 'Vogliate spiegare come questa decisione possa essere riesaminata o contestata, anche se posso chiederne il riesame da parte di una persona.',
    },
  },
  {
    match: /^Please confirm whether any automated tools, scores or AI were used to support/,
    t: {
      en: 'Please confirm whether any automated tools, scores or AI were used to support this decision, and if so, what role they played.',
      de: 'Bitte bestätigen Sie, ob automatisierte Hilfsmittel, Scores oder KI diesen Entscheid unterstützt haben und, falls ja, welche Rolle sie gespielt haben.',
      fr: 'Veuillez confirmer si des outils automatisés, des scores ou une IA ont servi à étayer cette décision et, le cas échéant, quel rôle ils ont joué.',
      it: 'Vogliate confermare se strumenti automatizzati, punteggi o IA siano stati usati a supporto di questa decisione e, in tal caso, con quale ruolo.',
    },
  },
  {
    match: /^Please explain how I can ask for this decision to be reconsidered/,
    t: {
      en: 'Please explain how I can ask for this decision to be reconsidered, ideally by a different person.',
      de: 'Bitte erläutern Sie, wie ich eine erneute Prüfung dieses Entscheids verlangen kann, idealerweise durch eine andere Person.',
      fr: 'Veuillez expliquer comment demander le réexamen de cette décision, idéalement par une autre personne.',
      it: 'Vogliate spiegare come posso chiedere il riesame di questa decisione, preferibilmente da parte di un’altra persona.',
    },
  },
  {
    match: /^Please provide the specific reasons and factors/,
    t: {
      en: 'Please provide the specific reasons and factors that led to the decision, including the information about me that was used.',
      de: 'Bitte nennen Sie die konkreten Gründe und Faktoren, die zum Entscheid geführt haben, einschliesslich der verwendeten Informationen über mich.',
      fr: 'Veuillez indiquer les motifs et facteurs précis ayant conduit à la décision, y compris les informations me concernant qui ont été utilisées.',
      it: 'Vogliate indicare i motivi e i fattori precisi che hanno portato alla decisione, comprese le informazioni che mi riguardano utilizzate.',
    },
  },
  {
    match: /^Please treat this letter as a request for access to the personal data you hold about me under Article 15 of the UK GDPR/,
    t: {
      en: 'Please treat this letter as a request for access to the personal data you hold about me under Article 15 of the UK GDPR.',
      de: 'Bitte behandeln Sie dieses Schreiben als Auskunftsersuchen über die von Ihnen über mich gespeicherten Personendaten gemäss Artikel 15 UK GDPR.',
      fr: "Veuillez considérer ce courrier comme une demande d'accès aux données personnelles que vous détenez à mon sujet, au titre de l'article 15 du UK GDPR.",
      it: "Vogliate considerare questa lettera come una richiesta di accesso ai dati personali che detenete su di me, ai sensi dell'articolo 15 dello UK GDPR.",
    },
  },
  {
    match: /^Please treat this letter as a request for access to the personal data you hold about me under Article 15 of the GDPR/,
    t: {
      en: 'Please treat this letter as a request for access to the personal data you hold about me under Article 15 of the GDPR.',
      de: 'Bitte behandeln Sie dieses Schreiben als Auskunftsersuchen über die von Ihnen über mich gespeicherten Personendaten gemäss Artikel 15 DSGVO.',
      fr: "Veuillez considérer ce courrier comme une demande d'accès aux données personnelles que vous détenez à mon sujet, au titre de l'article 15 du RGPD.",
      it: "Vogliate considerare questa lettera come una richiesta di accesso ai dati personali che detenete su di me, ai sensi dell'articolo 15 del RGPD.",
    },
  },
  {
    match: /^If any information used in the decision is incorrect/,
    t: {
      en: 'If any information used in the decision is incorrect, please correct it and reconsider the decision.',
      de: 'Falls Informationen, die für den Entscheid verwendet wurden, unrichtig sind, berichtigen Sie diese bitte und prüfen Sie den Entscheid erneut.',
      fr: 'Si des informations utilisées pour la décision sont inexactes, veuillez les corriger et réexaminer la décision.',
      it: 'Se alcune informazioni utilizzate per la decisione sono inesatte, vogliate correggerle e riesaminare la decisione.',
    },
  },
];

function between(text: string, start: string, end: string): string | null {
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  return a >= 0 && b > a ? text.slice(a + start.length, b).trim() : null;
}

function statusFrom(d8: string | undefined): { status: AutomationStatus; involvement: AutomationInvolvement } {
  const status =
    (Object.keys(STATUS_META) as AutomationStatus[]).find((s) => d8?.includes(`Automation status (REDRESS): ${STATUS_META[s].label}.`)) ??
    'not_established';
  const involvement =
    (Object.keys(INVOLVEMENT_META) as AutomationInvolvement[]).find((i) => d8?.includes(`Role of automation: ${INVOLVEMENT_META[i].label}.`)) ??
    'not_established';
  return { status, involvement };
}

type Out = { text: string; cites: string[]; framing?: boolean };

export class MockApertusClient implements ApertusClient {
  readonly kind = 'mock' as const;
  readonly label = 'Stand-in model (mock — not Apertus)';
  private readonly demonstrateBlocking: boolean;

  constructor(options: { demonstrateBlocking?: boolean } = {}) {
    this.demonstrateBlocking = options.demonstrateBlocking ?? true;
  }

  async complete(messages: ChatMessage[]): Promise<string> {
    const user = messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
    const task = user.match(/TASK: (\w+)/)?.[1];
    if (task === 'translate') return this.translate(user);
    const language = (user.match(/LANGUAGE: (\w{2})/)?.[1] ?? 'en') as LanguageCode;
    const facts = JSON.parse(between(user, FACTS_START, FACTS_END) ?? '[]') as MockFact[];
    const sentences = task === 'letter' ? this.letter(facts, language, user) : this.explain(facts, language);
    return JSON.stringify({ sentences });
  }

  private translate(user: string): string {
    const notice = between(user, NOTICE_START, NOTICE_END) ?? '';
    const key = notice.replace(/\s+/g, ' ').trim();
    const canned = CANNED_TRANSLATIONS.find((c) => c.key === key);
    if (!canned) {
      throw new ApertusUnavailableError('the stand-in model can only translate the built-in demo notices — connect Apertus to translate other text');
    }
    return JSON.stringify({ sentences: canned.sentences });
  }

  private explain(facts: MockFact[], lang: LanguageCode): Out[] {
    const get = (id: string) => facts.find((f) => f.id === id);
    const value = (id: string) => get(id)?.fact.split(': ').slice(1).join(': ') ?? '';
    const { status, involvement } = statusFrom(get('D8')?.fact);
    const out: Out[] = [];

    const outcomeKey = value('D2').split(';')[0];
    const outcome = OUTCOME[outcomeKey]?.[lang] ?? OUTCOME['Rejected / Denied'][lang];
    out.push({ text: T.happened[lang](value('D1') || T.someOrg[lang], value('D3'), outcome), cites: ['D1', 'D2', 'D3'].filter((i) => get(i)) });
    if (get('D4')) out.push({ text: T.reason[lang](value('D4')), cites: ['D4'] });
    out.push({ text: T.status[lang](STATUS_LABEL[status][lang]), cites: ['D8'] });

    const evidence = facts.filter((f) => f.kind === 'evidence' && f.quote).slice(0, 3);
    if (evidence.length) for (const e of evidence) out.push({ text: T.evidence[lang](e.quote!), cites: [e.id] });
    else out.push({ text: T.noEvidence[lang], cites: ['D8'] });

    if (this.demonstrateBlocking) {
      out.push(
        status === 'not_established' || status === 'human_indicated'
          ? { text: T.fakeAutomation[lang], cites: ['D8'] }
          : { text: T.fakeConclusion[lang], cites: ['D8'] },
      );
    }

    if (get('G1')) out.push({ text: T.gap[involvement][lang], cites: ['G1'] });

    const steps = facts.filter((f) => f.kind === 'step');
    const stepId = (re: RegExp, fallback: number) => steps.find((s) => re.test(s.fact))?.id ?? steps[fallback]?.id ?? 'D8';
    out.push({ text: T.askRole[status][lang], cites: [stepId(/^Ask/, 0)] });
    out.push({ text: T.askInfo[lang], cites: [stepId(/information|data/i, 1)] });
    if (status !== 'human_indicated') {
      out.push({ text: T.askReview[lang], cites: [stepId(/reconsider|person reviews|review by a|fresh review/i, 2)] });
    }
    out.push({ text: T.preserve[lang], cites: [stepId(/^Preserve/, steps.length - 2)] });

    if (this.demonstrateBlocking) out.push({ text: T.fakeDeadline[lang], cites: ['D3'].filter((i) => get(i)) });

    for (const law of facts.filter((f) => f.kind === 'law').slice(0, 2)) {
      const name = law.fact.split(': ')[0];
      out.push({ text: T.law[lang](name), cites: [law.id] });
    }
    return out;
  }

  private letter(facts: MockFact[], lang: LanguageCode, user: string): Out[] {
    const get = (id: string) => facts.find((f) => f.id === id);
    const value = (id: string) => get(id)?.fact.split(': ').slice(1).join(': ') ?? '';
    const { status } = statusFrom(get('D8')?.fact);
    const name = user.match(/letter from (.+?) to the organisation/)?.[1] ?? '';
    const out: Out[] = [];

    out.push({ text: T.greeting[lang], cites: [], framing: true });
    out.push({ text: T.intro[lang](value('D1') || T.yourOrg[lang], value('D3')), cites: ['D1', 'D2', 'D3'].filter((i) => get(i)) });
    if (get('D5')) {
      const refs = value('D5').split(', ').map((r) => r.replace(/^(?:reference|ref)\s*(?:number|no\.?|#)?\s*[:.]?\s*/i, ''));
      out.push({ text: T.reference[lang](refs.join(', ')), cites: ['D5'] });
    }
    const quoteFact = facts.find((f) => f.kind === 'evidence' && f.quote);
    if (quoteFact && status !== 'not_established') out.push({ text: T.states[lang](quoteFact.quote!), cites: [quoteFact.id] });
    out.push({ text: T.askAnswer[lang], cites: [], framing: true });

    let n = 0;
    for (const q of facts.filter((f) => f.kind === 'question')) {
      const tr = QUESTION_TRANSLATIONS.find((x) => x.match.test(q.fact));
      if (!tr) continue; // the stand-in only renders questions it has a translation for
      n++;
      out.push({ text: `${n}. ${tr.t[lang]}`, cites: [q.id] });
      if (n === 2 && this.demonstrateBlocking) out.push({ text: T.fakeLetterLaw[lang], cites: [q.id] });
    }

    out.push({ text: T.closing[lang], cites: [], framing: true });
    out.push({ text: T.signoff[lang], cites: [], framing: true });
    if (name && name !== 'the person') out.push({ text: name, cites: [], framing: true });
    return out;
  }
}
