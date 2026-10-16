// ============================================================================
// REDRESS × Apertus benchmark — fixtures
//
// 20 synthetic decision notices, 5 per language (EN, DE, FR, IT). Every
// organisation, person, reference number and address is fictional; e-mail
// addresses use the reserved .example domain. No real personal data.
//
// For each case:
//   expectedStatus     the automation status a faithful reading should give
//                      (hand-labelled; see benchmarks/README.md)
//   referenceEnglish   for non-English notices: a faithful English rendering,
//                      used by a unit test to confirm that REDRESS's engine
//                      yields expectedStatus from a correct translation — so
//                      the labels are checked before any model is run.
//   question           a free-form question in the notice's language
// ============================================================================

import type { AutomationStatus, JurisdictionCode } from '@/types';
import type { LanguageCode } from '@/apertus/types';

export interface BenchmarkCase {
  id: string;
  language: LanguageCode;
  jurisdiction: JurisdictionCode;
  expectedStatus: AutomationStatus;
  notice: string;
  referenceEnglish?: string;
  question: string;
}

export const CASES: BenchmarkCase[] = [
  // ------------------------------------------------------------------ English
  {
    id: 'en-01-credit-automated',
    language: 'en',
    jurisdiction: 'UK',
    expectedStatus: 'confirmed_automated',
    notice: `Dear Sam Taylor,

Thank you for applying for a Brightwater Example Bank credit card.

Your application was assessed by our automated system and has been declined.

Reason: your income did not meet our affordability criteria.

Reference: BWE-2026-1182

Regards,
Brightwater Example Bank
Date: 2 October 2026`,
    question: 'Can Brightwater change its decision later if my income goes up?',
  },
  {
    id: 'en-02-account-solely',
    language: 'en',
    jurisdiction: 'US',
    expectedStatus: 'confirmed_automated',
    notice: `Hello,

Your seller account has been suspended.

This decision was made by our automated risk system without human involvement.

If you believe this is a mistake, contact appeals@marketplace.example within 14 days.

Case number: MKT-77120

Marketplace Example Inc.`,
    question: 'Is a 14-day limit normal for an appeal like this?',
  },
  {
    id: 'en-03-tenancy-algorithm',
    language: 'en',
    jurisdiction: 'GENERAL',
    expectedStatus: 'possibly_automated',
    notice: `Dear Applicant,

We are unable to offer you the flat at 12 Example Road.

Our algorithm compared your application with our letting criteria.

Reference: LET-5531

Regards,
Example Lettings Ltd`,
    question: 'What did the algorithm look at?',
  },
  {
    id: 'en-04-insurance-human',
    language: 'en',
    jurisdiction: 'EU',
    expectedStatus: 'human_indicated',
    notice: `Dear Robin Meyer,

Your claim INS-4471-EX has been rejected.

Your claim was reviewed by our claims specialist team, who found that the damage is not covered by your policy.

You may request a review by a senior claims officer within 30 days.

Regards,
Example Mutual Insurance`,
    question: 'Who actually decided on my claim?',
  },
  {
    id: 'en-05-job-not-established',
    language: 'en',
    jurisdiction: 'UK',
    expectedStatus: 'not_established',
    notice: `Dear Candidate,

Thank you for applying for the Data Analyst role.

Unfortunately, your application was not successful on this occasion.

We wish you every success in your search.

Recruitment Team
Example Analytics Ltd`,
    question: 'Did a computer reject my CV?',
  },

  // ------------------------------------------------------------------- German
  {
    id: 'de-01-credit-automated',
    language: 'de',
    jurisdiction: 'CH',
    expectedStatus: 'confirmed_automated',
    notice: `Sehr geehrter Herr Brunner

Ihr Antrag auf einen Privatkredit bei der Beispiel Kreditbank AG wurde abgelehnt.

Ihr Antrag wurde von unserem automatisierten System geprüft.

Referenz: BKB-2026-3301

Freundliche Grüsse
Beispiel Kreditbank AG
Datum: 30. September 2026`,
    referenceEnglish: `Dear Mr Brunner

Your application for a personal loan from Beispiel Kreditbank AG was rejected.

Your application was checked by our automated system.

Reference: BKB-2026-3301

Regards,
Beispiel Kreditbank AG
Date: 30 September 2026`,
    question: 'Kann ich verlangen, dass ein Mensch meinen Antrag nochmals prüft?',
  },
  {
    id: 'de-02-insurance-solely',
    language: 'de',
    jurisdiction: 'CH',
    expectedStatus: 'confirmed_automated',
    notice: `Sehr geehrte Frau Weber

Ihr Antrag auf eine Zusatzversicherung wurde abgelehnt.

Der Entscheid wurde von unserem automatisierten System ohne menschliche Beteiligung getroffen.

Referenz: VERS-88214

Freundliche Grüsse
Beispiel Versicherung AG`,
    referenceEnglish: `Dear Ms Weber

Your application for supplementary insurance was rejected.

The decision was made by our automated system without human involvement.

Reference: VERS-88214

Regards,
Beispiel Versicherung AG`,
    question: 'Muss die Versicherung mir erklären, wie das System entschieden hat?',
  },
  {
    id: 'de-03-tenancy-algorithm',
    language: 'de',
    jurisdiction: 'EU',
    expectedStatus: 'possibly_automated',
    notice: `Sehr geehrte Damen und Herren

Leider können wir Ihnen die Wohnung an der Beispielstrasse 4 nicht vermieten.

Unser Algorithmus hat Ihre Bewerbung mit unseren Vermietungskriterien verglichen.

Referenz: WOH-2219

Freundliche Grüsse
Beispiel Immobilien GmbH`,
    referenceEnglish: `Dear Sir or Madam

Unfortunately we cannot let the flat at Beispielstrasse 4 to you.

Our algorithm compared your application with our letting criteria.

Reference: WOH-2219

Regards,
Beispiel Immobilien GmbH`,
    question: 'Welche Daten hat der Algorithmus verwendet?',
  },
  {
    id: 'de-04-benefit-ai-assisted',
    language: 'de',
    jurisdiction: 'CH',
    expectedStatus: 'possibly_automated',
    notice: `Sehr geehrter Herr Meier

Ihr Antrag auf eine Prämienverbilligung wurde abgelehnt.

Ihr Dossier wurde von einem KI-Werkzeug vorsortiert und anschliessend von unserer Sachbearbeiterin geprüft.

Referenz: PV-2026-0457

Freundliche Grüsse
Beispiel Ausgleichskasse`,
    referenceEnglish: `Dear Mr Meier

Your application for a premium reduction was rejected.

Your file was pre-sorted by an AI tool and then reviewed by our case officer.

Reference: PV-2026-0457

Regards,
Beispiel Ausgleichskasse`,
    question: 'Hat die KI oder die Sachbearbeiterin entschieden?',
  },
  {
    id: 'de-05-job-not-established',
    language: 'de',
    jurisdiction: 'GENERAL',
    expectedStatus: 'not_established',
    notice: `Guten Tag

Vielen Dank für Ihre Bewerbung als Projektleiterin.

Leider müssen wir Ihnen mitteilen, dass wir Ihre Bewerbung nicht berücksichtigen können.

Wir wünschen Ihnen viel Erfolg.

Freundliche Grüsse
Beispiel Consulting AG`,
    referenceEnglish: `Hello

Thank you for your application as a project manager.

Unfortunately, your application was not successful.

We wish you every success.

Regards,
Beispiel Consulting AG`,
    question: 'Wurde meine Bewerbung automatisch aussortiert?',
  },

  // ------------------------------------------------------------------- French
  {
    id: 'fr-01-credit-automated',
    language: 'fr',
    jurisdiction: 'CH',
    expectedStatus: 'confirmed_automated',
    notice: `Madame Dubois,

Votre demande de crédit auprès de la Banque Exemple SA a été refusée.

Votre demande a été évaluée par notre système automatisé.

Référence : BEX-2026-6610

Avec nos salutations distinguées,
Banque Exemple SA
Date : 29 septembre 2026`,
    referenceEnglish: `Dear Ms Dubois,

Your credit application with Banque Exemple SA was rejected.

Your application was evaluated by our automated system.

Reference: BEX-2026-6610

Regards,
Banque Exemple SA
Date: 29 September 2026`,
    question: 'Puis-je demander à une personne de revoir ma demande ?',
  },
  {
    id: 'fr-02-platform-solely',
    language: 'fr',
    jurisdiction: 'EU',
    expectedStatus: 'confirmed_automated',
    notice: `Bonjour,

Votre compte de livreur a été désactivé.

Cette décision a été prise par notre système automatisé, sans intervention humaine.

Référence : LIV-30981

L'équipe Livraison Exemple`,
    referenceEnglish: `Hello,

Your courier account has been deactivated.

This decision was made by our automated system, without human involvement.

Reference: LIV-30981

Regards,
Livraison Exemple`,
    question: 'Ont-ils le droit de désactiver mon compte sans humain ?',
  },
  {
    id: 'fr-03-insurance-algorithm',
    language: 'fr',
    jurisdiction: 'EU',
    expectedStatus: 'possibly_automated',
    notice: `Monsieur Laurent,

Nous ne pouvons pas vous proposer de contrat d'assurance habitation.

Notre algorithme a évalué le risque lié à votre logement.

Référence : HAB-1145

Cordialement,
Assurances Exemple SA`,
    referenceEnglish: `Dear Mr Laurent,

We cannot offer you a home insurance contract.

Our algorithm assessed the risk for your home.

Reference: HAB-1145

Regards,
Assurances Exemple SA`,
    question: "Sur quelles données l'algorithme s'est-il basé ?",
  },
  {
    id: 'fr-04-loan-human',
    language: 'fr',
    jurisdiction: 'CH',
    expectedStatus: 'human_indicated',
    notice: `Madame Rochat,

Votre demande de leasing a été refusée.

Votre dossier a été examiné par notre conseiller crédit, qui a estimé que vos revenus étaient insuffisants.

Référence : LEA-2026-0912

Avec nos salutations distinguées,
Leasing Exemple SA`,
    referenceEnglish: `Dear Ms Rochat,

Your leasing application was rejected.

Your file was reviewed by our credit adviser, who considered that your income was insufficient.

Reference: LEA-2026-0912

Regards,
Leasing Exemple SA`,
    question: 'Qui a pris la décision ?',
  },
  {
    id: 'fr-05-school-not-established',
    language: 'fr',
    jurisdiction: 'GENERAL',
    expectedStatus: 'not_established',
    notice: `Madame, Monsieur,

Nous avons le regret de vous informer que votre candidature au programme de master n'a pas été retenue.

Nous vous remercions de l'intérêt porté à notre école.

Le service des admissions
École Exemple`,
    referenceEnglish: `Dear Sir or Madam,

We regret to inform you that your application to the master's programme was not successful.

Thank you for your interest in our school.

Admissions office
École Exemple`,
    question: 'Ma candidature a-t-elle été triée par un logiciel ?',
  },

  // ------------------------------------------------------------------ Italian
  {
    id: 'it-01-credit-automated',
    language: 'it',
    jurisdiction: 'CH',
    expectedStatus: 'confirmed_automated',
    notice: `Gentile signor Bernasconi,

la sua richiesta di credito presso la Banca Esempio SA è stata respinta.

La sua richiesta è stata valutata dal nostro sistema automatizzato.

Riferimento: BES-2026-2207

Distinti saluti
Banca Esempio SA
Data: 1 ottobre 2026`,
    referenceEnglish: `Dear Mr Bernasconi,

your credit application with Banca Esempio SA was rejected.

Your application was assessed by our automated system.

Reference: BES-2026-2207

Regards,
Banca Esempio SA
Date: 1 October 2026`,
    question: 'Posso chiedere che una persona riesamini la decisione?',
  },
  {
    id: 'it-02-telecom-solely',
    language: 'it',
    jurisdiction: 'EU',
    expectedStatus: 'confirmed_automated',
    notice: `Gentile cliente,

la sua richiesta di abbonamento con pagamento rateale non è stata accolta.

La decisione è stata presa dal nostro sistema automatizzato senza intervento umano.

Riferimento: TEL-44190

Cordiali saluti
Telefonia Esempio SpA`,
    referenceEnglish: `Dear customer,

your request for a subscription with instalment payments was refused.

The decision was made by our automated system without human involvement.

Reference: TEL-44190

Regards,
Telefonia Esempio SpA`,
    question: 'Che cosa posso fare adesso?',
  },
  {
    id: 'it-03-insurance-algorithm',
    language: 'it',
    jurisdiction: 'CH',
    expectedStatus: 'possibly_automated',
    notice: `Gentile signora Rossi,

non possiamo offrirle una polizza vita alle condizioni richieste.

Il nostro algoritmo ha valutato il suo profilo di rischio.

Riferimento: VITA-3378

Distinti saluti
Assicurazioni Esempio SA`,
    referenceEnglish: `Dear Ms Rossi,

we cannot offer you a life insurance policy on the requested terms.

Our algorithm assessed your risk profile.

Reference: VITA-3378

Regards,
Assicurazioni Esempio SA`,
    question: "Che cosa ha valutato l'algoritmo?",
  },
  {
    id: 'it-04-benefit-human',
    language: 'it',
    jurisdiction: 'EU',
    expectedStatus: 'human_indicated',
    notice: `Gentile signor Ferrari,

la sua domanda di contributo è stata respinta.

La sua pratica è stata esaminata dal nostro team di valutazione, che ha rilevato documenti mancanti.

Riferimento: CON-2026-1189

Distinti saluti
Ente Esempio`,
    referenceEnglish: `Dear Mr Ferrari,

your grant application was rejected.

Your file was reviewed by our assessment team, which found missing documents.

Reference: CON-2026-1189

Regards,
Ente Esempio`,
    question: 'Posso inviare i documenti mancanti?',
  },
  {
    id: 'it-05-job-not-established',
    language: 'it',
    jurisdiction: 'GENERAL',
    expectedStatus: 'not_established',
    notice: `Gentile candidata,

la ringraziamo per l'interesse dimostrato verso la nostra azienda.

Purtroppo la sua candidatura non è stata selezionata.

Cordiali saluti
Ufficio del personale
Esempio Srl`,
    referenceEnglish: `Dear candidate,

thank you for your interest in our company.

Unfortunately, your application was not successful.

Regards,
Human resources office
Esempio Srl`,
    question: 'La mia candidatura è stata scartata da un computer?',
  },
];
