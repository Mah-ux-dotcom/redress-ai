// ============================================================================
// REDRESS — Demo Case Data
//
// A fictional but realistic demo case for the hackathon presentation.
// "NovaCredit" is a fictional financial service. All data is synthetic.
// ============================================================================

export const DEMO_CASE = {
  isDemo: true,
  fictionalNotice: 'This is a fictional demo case. NovaCredit is not a real organization.',
  inputMethod: 'paste' as const,
  decisionText: `Dear Alex Morgan,

Thank you for your application for a NovaCredit personal loan.

Unfortunately, your application has been unsuccessful following our automated eligibility assessment.

Your application was assessed using our automated scoring system. Unfortunately, it did not meet the minimum eligibility threshold at this time.

Reference: NC-2026-08847

If you have any questions, you may contact our customer service team at support@novacredit.example.

Regards,
NovaCredit Loan Services
Date: 15 September 2026`,
  userName: 'Alex Morgan',
  jurisdiction: 'UK' as const,
};

export const DEMO_PRESET_TEXTS: { label: string; text: string }[] = [
  {
    label: 'NovaCredit loan rejection (demo)',
    text: DEMO_CASE.decisionText,
  },
  {
    label: 'Account suspension',
    text: `Dear User,

Your account has been suspended following a review of your account activity.

Our system identified patterns that violate our terms of service. This decision was made by our automated moderation system.

If you believe this is an error, please contact support within 14 days.

Reference: ACC-SUSP-55291

Support Team`,
  },
  {
    label: 'Insurance claim denied (human review mentioned)',
    text: `Dear Jamie Lee,

We have reviewed your insurance claim reference INS-2026-4471.

After careful consideration, your claim has been denied. The decision was reviewed by our claims specialist team. We have determined that the incident falls outside the scope of your policy coverage.

If you wish to appeal this decision, you may request a review by a senior claims officer within 21 days.

Regards,
Safeguard Insurance`,
  },
  {
    label: 'Job application rejected',
    text: `Dear Candidate,

Thank you for your interest in the Software Engineer position.

Unfortunately, your application was not successful at this stage. Your application was evaluated using our screening process.

We wish you the best in your job search.

Recruitment Team
TechCorp`,
  },
];
