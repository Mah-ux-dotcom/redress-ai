// ============================================================================
// Canned translations for the stand-in model ONLY.
//
// The stand-in cannot translate arbitrary text. For the built-in demo notices
// it returns these sentence-aligned translations so the multilingual flow can
// be demonstrated before real Apertus access is configured. Real Apertus
// translates any notice through the same pipeline.
// ============================================================================

import { DEMO_CASE_DE } from '@/data/demoCase';
import type { AlignedSentence } from './types';

const key = (s: string) => s.replace(/\s+/g, ' ').trim();

export const CANNED_TRANSLATIONS: { key: string; sentences: AlignedSentence[] }[] = [
  {
    key: key(DEMO_CASE_DE.decisionText),
    sentences: [
      { source: 'Sehr geehrte Frau Keller', english: 'Dear Ms Keller' },
      {
        source: 'Vielen Dank für Ihren Antrag auf einen Privatkredit bei NovaCredit (Schweiz) AG.',
        english: 'Thank you for your application for a personal loan with NovaCredit (Schweiz) AG.',
      },
      {
        source: 'Leider müssen wir Ihnen mitteilen, dass Ihr Antrag nach unserer automatisierten Bonitätsprüfung abgelehnt wurde.',
        english: 'Unfortunately, we must inform you that your application was rejected following our automated creditworthiness assessment.',
      },
      {
        source: 'Ihr Antrag wurde mit unserem automatisierten Scoring-System bewertet und erreichte die erforderliche Mindestpunktzahl nicht.',
        english: 'Your application was assessed using our automated scoring system and did not meet the required minimum score.',
      },
      { source: 'Referenz: NCS-2026-11402', english: 'Reference: NCS-2026-11402' },
      {
        source: 'Bei Fragen wenden Sie sich bitte an kundendienst@novacredit-schweiz.example.',
        english: 'If you have any questions, please contact kundendienst@novacredit-schweiz.example.',
      },
      { source: 'Freundliche Grüsse', english: 'Regards,' },
      { source: 'Datum: 28. September 2026', english: 'Date: 28 September 2026' },
    ],
  },
];
