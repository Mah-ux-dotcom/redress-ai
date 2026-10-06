// ============================================================================
// REDRESS — Legal reference & decision-status audit tests
// ============================================================================

import { describe, expect, it } from 'vitest';
import { analyzeAutomation, extractDecision } from '@/lib/analyze';
import { generateRightsOptions } from '@/lib/rightsGenerator';
import { generateActionPlan } from '@/lib/actionPlan';
import { generateChallengeLetter } from '@/lib/challengeGenerator';
import { explain, explainFourPart, SUGGESTED_QUESTIONS } from '@/ai/explainEngine';
import { JURISDICTIONS, getJurisdiction } from '@/legal/jurisdictions';
import { DEMO_CASE, DEMO_PRESET_TEXTS } from '@/data/demoCase';
import type { JurisdictionCode } from '@/types';

const run = (text: string) => {
  const extracted = extractDecision(text);
  const automation = analyzeAutomation(extracted);
  return { extracted, automation };
};

const letterFor = (text: string, jurisdiction: JurisdictionCode | null) => {
  const { extracted, automation } = run(text);
  return generateChallengeLetter({ extracted, automation, jurisdiction, userName: 'Test User', caseId: 'RP-12345' }).body;
};

const CONFIRMED = DEMO_CASE.decisionText;

const SOLELY = `Dear Customer,
Your application for a credit card has been declined.
This decision was made solely by automated means, without human review.
Regards,
Example Bank`;

const POSSIBLY_ALGORITHM = `Dear Applicant,
Your tenancy application has been declined.
Our algorithm assessed the information you provided against our criteria.
Regards,
Lettings Co`;

const AI_ASSISTED = `Dear Sam,
Your loan application has been declined.
Your application was scored by our AI risk model and then reviewed by an underwriter.
Regards,
Lender Ltd`;

const NOT_ESTABLISHED = `Dear Candidate,
Thank you for applying. Unfortunately, your application was not successful at this stage.
We received a large number of applications and made our decision quickly.
This is an automated email, please do not reply.
Recruitment Team`;

const HUMAN = DEMO_PRESET_TEXTS[2].text;

// Wording that would falsely assert a legal conclusion as fact.
const UNSUPPORTED_CLAIMS = [
  /you have (?:a|the) right to (?:human|obtain human)/i,
  /definitely/i,
  /this company used ai/i,
  /is unlawful/i,
  /you are entitled to human review/i,
  /\bwill win\b/i,
];

describe('1. Confirmed automated decision', () => {
  it('classifies the NovaCredit demo as confirmed automated, human role not established', () => {
    const { automation } = run(CONFIRMED);
    expect(automation.status).toBe('confirmed_automated');
    expect(automation.involvement).toBe('role_unclear');
    expect(automation.notEstablished.join(' ')).toMatch(/solely automated/i);
  });

  it('marks solely automated only when the notice says so', () => {
    const { automation } = run(SOLELY);
    expect(automation.status).toBe('confirmed_automated');
    expect(automation.involvement).toBe('solely_automated');
  });
});

describe('2. Possibly automated / AI-assisted decision', () => {
  it('algorithmic language alone is "possibly", not confirmed', () => {
    const { automation } = run(POSSIBLY_ALGORITHM);
    expect(automation.status).toBe('possibly_automated');
    expect(automation.involvement).toBe('role_unclear');
  });

  it('AI plus a human decision-maker is AI-assisted, not solely automated', () => {
    const { automation } = run(AI_ASSISTED);
    expect(automation.status).toBe('possibly_automated');
    expect(automation.involvement).toBe('ai_assisted');
    expect(automation.explanation).toMatch(/does not establish that the final decision was made solely/i);
  });
});

describe('3. Automation not established', () => {
  it('does not infer automation from speed, generic wording or digital delivery', () => {
    const { automation, extracted } = run(NOT_ESTABLISHED);
    expect(automation.status).toBe('not_established');
    expect(automation.involvement).toBe('not_established');
    expect(extracted.automatedMentioned).toBe(false);
    // The "automated email" line is recorded but not counted as evidence.
    expect(automation.signals.every((s) => s.type === 'neutral')).toBe(true);
  });

  it('does not treat "ai" inside ordinary words as an AI mention', () => {
    const { extracted, automation } = run(
      'Dear Chris, we have considered your claim and the details you said were in the email. Your claim is declined. Regards, Insurer Ltd',
    );
    expect(extracted.aiMentioned).toBe(false);
    expect(automation.status).toBe('not_established');
  });

  it('a credit score alone does not establish automation', () => {
    const { automation } = run('Dear Pat, your application was declined. We checked your credit score. Regards, Bank');
    expect(automation.status).toBe('not_established');
    expect(automation.suggests.join(' ')).toMatch(/score alone does not show/i);
  });

  it('is actionable — asks about automation, human review, information, reconsideration and preservation', () => {
    const { automation } = run(NOT_ESTABLISHED);
    const steps = automation.nextSteps.join(' ');
    expect(steps).toMatch(/whether automated processing or AI was involved/i);
    expect(steps).toMatch(/what role/i);
    expect(steps).toMatch(/person reviewed/i);
    expect(steps).toMatch(/information the decision was based on/i);
    expect(steps).toMatch(/reconsidered by a person/i);
    expect(steps).toMatch(/Preserve the original decision/i);
    expect(steps).toMatch(/escalation route/i);
    expect(automation.notEstablished.join(' ')).toMatch(/not evidence that no automation was used/i);
  });
});

describe('4. Human decision indicated', () => {
  it('classifies a notice reviewed by a claims team as human-indicated', () => {
    const { automation, extracted } = run(HUMAN);
    expect(automation.status).toBe('human_indicated');
    expect(automation.involvement).toBe('human');
    expect(extracted.humanReviewOffered).toBe(true);
  });

  it('an offered human review route is not evidence that a human decided', () => {
    const { automation } = run(
      'Dear Lee, your application has been declined. If you disagree, you may request a human review within 30 days. Regards, Firm',
    );
    expect(automation.status).toBe('not_established');
    expect(automation.signals.some((s) => s.type === 'human_route')).toBe(true);
    expect(automation.signals.some((s) => s.type === 'human')).toBe(false);
  });

  it('"without human review" is not counted as human involvement', () => {
    const { automation } = run(SOLELY);
    expect(automation.signals.some((s) => s.type === 'human')).toBe(false);
  });
});

describe('5. Unknown jurisdiction', () => {
  for (const jurisdiction of [null, 'GENERAL'] as const) {
    it(`gives general procedural guidance without jurisdiction-specific law (${jurisdiction})`, () => {
      const { extracted, automation } = run(CONFIRMED);
      const options = generateRightsOptions(automation, jurisdiction, extracted);
      const text = JSON.stringify(options);
      expect(text).not.toMatch(/GDPR|ICO|FCRA|ECOA|AI Act|CFPB|Ombudsman/);
      expect(text).toMatch(/rights where you are may differ/i);

      const plan = JSON.stringify(generateActionPlan(extracted, automation, jurisdiction));
      expect(plan).not.toMatch(/GDPR|ICO|FCRA|ECOA|AI Act|CFPB/);

      const letter = letterFor(CONFIRMED, jurisdiction);
      expect(letter).not.toMatch(/GDPR|ECOA|Regulation B|AI Act/);

      const rights = explain({ question: 'What rights do I have?', extracted, automation, jurisdiction });
      expect(rights.answer).toMatch(/cannot say which legal rights apply/i);
    });
  }

  it('general reference is phrased as procedural guidance, not legal rights', () => {
    const general = getJurisdiction('GENERAL');
    expect(general.disclaimer).toMatch(/not legal rights/i);
    for (const f of general.frameworks) {
      expect(f.source).toMatch(/General procedural guidance/);
      for (const r of f.rights) expect(r).not.toMatch(/^Right to/);
    }
  });
});

describe('6. UK guidance', () => {
  it('references UK GDPR conditionally and escalation to the ICO / Financial Ombudsman', () => {
    const { extracted, automation } = run(CONFIRMED);
    const options = generateRightsOptions(automation, 'UK', extracted);
    const human = options.find((o) => o.id === 'request_human_review')!;
    expect(human.source).toMatch(/UK GDPR Art\. 22/);
    expect(human.explanation).toMatch(/only for decisions based solely on automated processing/i);
    expect(human.explanation).toMatch(/does not establish that this decision was solely automated/i);
    const escalate = options.find((o) => o.id === 'escalate')!;
    expect(escalate.explanation).toMatch(/ICO/);
    expect(escalate.explanation).toMatch(/Financial Ombudsman Service/);
    expect(options.find((o) => o.id === 'request_info')!.title).toMatch(/subject access request/i);
  });

  it('records the Data (Use and Access) Act 2025 changes', () => {
    const art22 = getJurisdiction('UK').frameworks.find((f) => f.scope === 'solely_automated')!;
    expect(art22.source).toMatch(/22A–22D/);
    expect(art22.currency).toMatch(/Data \(Use and Access\) Act 2025/);
  });
});

describe('7. EU guidance', () => {
  it('references GDPR Art. 22 conditionally and the AI Act only as possibly relevant', () => {
    const { extracted, automation } = run(AI_ASSISTED);
    const options = generateRightsOptions(automation, 'EU', extracted);
    expect(options.find((o) => o.id === 'request_human_review')!.source).toMatch(/GDPR/);
    const aiAct = options.find((o) => o.id === 'ai_act_explanation')!;
    expect(aiAct.confidence).toBe('low');
    expect(aiAct.explanation).toMatch(/depends on the system’s classification/i);
    expect(options.find((o) => o.id === 'escalate')!.explanation).toMatch(/Data Protection Authority/);
  });

  it('does not present AI Act human oversight as an individual right', () => {
    const aiAct = getJurisdiction('EU').frameworks.find((f) => f.scope === 'ai_system')!;
    expect(aiAct.rights.join(' ')).not.toMatch(/right to human oversight/i);
    expect(aiAct.humanReview).toMatch(/not an individual right/i);
  });

  it('does not suggest the AI Act when automation is not established', () => {
    const { extracted, automation } = run(NOT_ESTABLISHED);
    const options = generateRightsOptions(automation, 'EU', extracted);
    expect(options.some((o) => o.id === 'ai_act_explanation')).toBe(false);
  });
});

describe('8. US guidance', () => {
  it('uses ECOA / FCRA for credit and does not claim a general human-review right', () => {
    const { extracted, automation } = run(CONFIRMED);
    const options = generateRightsOptions(automation, 'US', extracted);
    expect(options.find((o) => o.id === 'request_info')!.source).toMatch(/ECOA/);
    const human = options.find((o) => o.id === 'request_human_review')!;
    expect(human.explanation).toMatch(/no general federal right to human review/i);
    expect(human.confidence).toBe('low');
    expect(options.find((o) => o.id === 'escalate')!.explanation).toMatch(/CFPB/);
  });

  it('corrects previously overstated US references', () => {
    const us = JSON.stringify(getJurisdiction('US'));
    expect(us).not.toMatch(/Right to know if a credit scoring system was used/);
    expect(us).not.toMatch(/Right to know if a complex algorithm or AI model was used/);
    expect(us).toMatch(/1002\.9/);
  });
});

describe('9. Challenge letter — automation confirmed', () => {
  it('quotes the stated automated process and asks about human involvement', () => {
    const letter = letterFor(CONFIRMED, 'UK');
    expect(letter).toContain('Your communication states: "Unfortunately, your application has been unsuccessful following our automated eligibility assessment."');
    expect(letter).toMatch(/solely by the automated system you refer to, or whether a person reviewed/);
    expect(letter).toMatch(/Article 15 of the UK GDPR/);
    expect(letter).toMatch(/If this decision was based solely on automated processing/);
  });

  it('numbers requests sequentially', () => {
    const letter = letterFor(CONFIRMED, 'UK');
    expect(letter).toMatch(/^1\. /m);
    expect(letter).toMatch(/^2\. /m);
    expect(letter).toMatch(/^3\. /m);
  });
});

describe('10. Challenge letter — automation not established', () => {
  it('asks the questions and never asserts that AI was used', () => {
    const letter = letterFor(NOT_ESTABLISHED, null);
    expect(letter).toMatch(/whether any automated or AI-assisted processing was used/i);
    expect(letter).toMatch(/what role it played/i);
    expect(letter).toMatch(/whether a person reviewed or made this decision/i);
    expect(letter).toMatch(/how this decision can be reviewed or challenged/i);
    expect(letter).not.toMatch(/Your communication states/);
    expect(letter).not.toMatch(/references automated processing/i);
    expect(letter).not.toMatch(/your (?:AI|automated) (?:system|model)/i);
  });
});

describe('11. No unsupported legal claims', () => {
  const texts = [CONFIRMED, SOLELY, POSSIBLY_ALGORITHM, AI_ASSISTED, NOT_ESTABLISHED, HUMAN];
  const jurisdictions: (JurisdictionCode | null)[] = ['UK', 'EU', 'US', 'GENERAL', null];

  it('no generated output asserts a legal conclusion as fact', () => {
    for (const text of texts) {
      for (const j of jurisdictions) {
        const { extracted, automation } = run(text);
        const outputs = [
          JSON.stringify(automation),
          JSON.stringify(generateRightsOptions(automation, j, extracted)),
          JSON.stringify(generateActionPlan(extracted, automation, j)),
          letterFor(text, j),
          ...SUGGESTED_QUESTIONS.map((q) => explain({ question: q, extracted, automation, jurisdiction: j }).answer),
        ].join('\n');
        for (const re of UNSUPPORTED_CLAIMS) expect(outputs, `${re} for ${j}`).not.toMatch(re);
      }
    }
  });

  it('every legal framework records scope, conditions, human-review position and currency', () => {
    for (const jur of JURISDICTIONS) {
      for (const f of jur.frameworks) {
        expect(f.applicableWhen.length).toBeGreaterThan(10);
        expect(f.limitations.length).toBeGreaterThan(5);
        expect(f.humanReview.length).toBeGreaterThan(5);
        expect(f.currency.length).toBeGreaterThan(5);
      }
    }
  });

  it('transparency "logic involved" is tied to solely automated decisions, not all automation', () => {
    for (const code of ['UK', 'EU'] as const) {
      const access = getJurisdiction(code).frameworks.find((f) => f.scope === 'data_rights')!;
      expect(access.applicableWhen).not.toMatch(/regardless of whether it is solely automated/);
      expect(access.limitations + access.applicableWhen).toMatch(/solely automated|Article 22-type/);
    }
  });
});

describe('12. Evidence remains traceable', () => {
  it('every signal quotes a sentence that appears verbatim in the decision text', () => {
    for (const text of [CONFIRMED, SOLELY, POSSIBLY_ALGORITHM, AI_ASSISTED, NOT_ESTABLISHED, HUMAN]) {
      const { automation } = run(text);
      for (const s of automation.signals) {
        expect(s.quote.length).toBeGreaterThan(0);
        expect(text).toContain(s.quote);
      }
    }
  });

  it('non-established classifications have no automation signals', () => {
    const { automation } = run(NOT_ESTABLISHED);
    expect(automation.signals.filter((s) => s.type !== 'neutral')).toHaveLength(0);
  });

  it('Explain It To Me answers the four questions from the evidence', () => {
    const { extracted, automation } = run(CONFIRMED);
    const res = explainFourPart({ question: 'Explain it to me', extracted, automation, jurisdiction: 'UK' });
    expect(res.answer).toMatch(/WHAT HAPPENED/);
    expect(res.answer).toMatch(/WHAT EVIDENCE WE HAVE ABOUT AUTOMATION/);
    expect(res.answer).toMatch(/WHAT THIS DOES NOT PROVE/);
    expect(res.answer).toMatch(/WHAT YOU CAN DO NEXT/);
    expect(res.answer).toContain('"Your application was assessed using our automated scoring system."');
    expect(explain({ question: SUGGESTED_QUESTIONS[0], extracted, automation, jurisdiction: 'UK' }).answer).toBe(res.answer);
  });

  it('every suggested question gets a specific answer (no fallback)', () => {
    const { extracted, automation } = run(CONFIRMED);
    for (const q of SUGGESTED_QUESTIONS) {
      expect(explain({ question: q, extracted, automation, jurisdiction: 'UK' }).answer).not.toMatch(/^I can help you understand/);
    }
  });
});

describe('Regression — demo extraction', () => {
  it('extracts NovaCredit facts', () => {
    const { extracted } = run(CONFIRMED);
    expect(extracted.organization).toBe('NovaCredit Loan Services');
    expect(extracted.decisionType).toBe('Loan / Credit Application');
    expect(extracted.decisionOutcome).toBe('Rejected / Denied');
    expect(extracted.date).toBe('15 September 2026');
    expect(extracted.statedReason).toBe('did not meet the minimum eligibility threshold at this time');
    expect(extracted.evidenceReferences.join(' ')).toMatch(/NC-2026-08847/);
  });

  it('classifies all demo presets', () => {
    expect(DEMO_PRESET_TEXTS.map((p) => run(p.text).automation.status)).toEqual([
      'confirmed_automated',
      'confirmed_automated',
      'human_indicated',
      'not_established',
      // German preset: analysed directly by the English-only rule engine it is not
      // established; the Apertus flow translates it first (see apertus.test.ts).
      'not_established',
    ]);
  });
});
