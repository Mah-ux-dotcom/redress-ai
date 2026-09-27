import { useState, useCallback, useMemo } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import type {
  ActionStep,
  AutomationAnalysis,
  CaseMilestone,
  ChallengeLetter,
  ChallengeStatus,
  EvidenceItem,
  ExtractedData,
  FlowStage,
  InputMethod,
  JurisdictionCode,
  RightsOption,
} from '@/types';
import { extractDecision, analyzeAutomation, STATUS_META } from '@/lib/analyze';
import { generateRightsOptions } from '@/lib/rightsGenerator';
import { generateActionPlan } from '@/lib/actionPlan';
import { generateChallengeLetter, generateCaseId } from '@/lib/challengeGenerator';
import { DEMO_CASE } from '@/data/demoCase';

import { Header } from '@/components/Header';
import { InputPanel } from '@/components/InputPanel';
import { StatusCard } from '@/components/StatusCard';
import { JurisdictionSelector } from '@/components/JurisdictionSelector';
import { RightsOptions } from '@/components/RightsOptions';
import { ActionPlanTimeline } from '@/components/ActionPlanTimeline';
import { ChallengeLetterView } from '@/components/ChallengeLetterView';
import { EvidenceVault } from '@/components/EvidenceVault';
import { ExplainMode } from '@/components/ExplainMode';
import { CaseTracker } from '@/components/CaseTracker';

const STAGE_ORDER: FlowStage[] = [
  'input',
  'analysis',
  'jurisdiction',
  'rights',
  'action_plan',
  'challenge',
  'evidence',
  'explain',
];

const STAGE_LABELS: Record<FlowStage, string> = {
  input: 'Decision received',
  analysis: 'Automation identified',
  jurisdiction: 'Jurisdiction selected',
  rights: 'Rights/options explained',
  action_plan: 'Action plan built',
  challenge: 'Challenge generated',
  evidence: 'Evidence organized',
  explain: 'Explained',
};

export default function App() {
  const [stage, setStage] = useState<FlowStage>('input');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<InputMethod>('paste');
  const [rawText, setRawText] = useState('');  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [automation, setAutomation] = useState<AutomationAnalysis | null>(null);
  const [jurisdiction, setJurisdiction] = useState<JurisdictionCode | null>(null);
  const [rightsOptions, setRightsOptions] = useState<RightsOption[]>([]);
  const [actionPlan, setActionPlan] = useState<ActionStep[]>([]);
  const [challenge, setChallenge] = useState<ChallengeLetter | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>('draft');
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [isDemo, setIsDemo] = useState(false);

  // --- Milestones for the case tracker ---
  const milestones: CaseMilestone[] = useMemo(() => {
    const now = () => new Date().toISOString();
    return STAGE_ORDER.slice(1).map((s) => ({
      id: s,
      label: STAGE_LABELS[s],
      completed: STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(s),
      timestamp: STAGE_ORDER.indexOf(stage) > STAGE_ORDER.indexOf(s) ? now() : null,
    }));
  }, [stage]);

  // --- Handlers ---
  const handleInputSubmit = useCallback(
    (text: string, method: InputMethod) => {
      const id = generateCaseId();
      const extractedData = extractDecision(text);
      const automationResult = analyzeAutomation(extractedData);

      setCaseId(id);
      setRawText(text);
      setInputMethod(method);
      setExtracted(extractedData);
      setAutomation(automationResult);
      setIsDemo(text === DEMO_CASE.decisionText);

      // Auto-add decision to evidence
      const decisionEvidence: EvidenceItem = {
        id: `ev-${Date.now()}`,
        type: 'decision',
        label: 'Original decision received',
        description: `${extractedData.organization ?? 'Organization'} — ${extractedData.decisionOutcome ?? 'Decision'}`,
        timestamp: new Date().toISOString(),
      };
      setEvidence([decisionEvidence]);
      setStage('analysis');
    },
    [],
  );

  const handleJurisdictionSelect = useCallback((code: JurisdictionCode) => {
    setJurisdiction(code);
  }, []);

  const handleJurisdictionContinue = useCallback(() => {
    if (!jurisdiction || !extracted || !automation) return;
    const options = generateRightsOptions(automation, jurisdiction, extracted);
    setRightsOptions(options);
    setStage('rights');
  }, [jurisdiction, extracted, automation]);

  const handleRightsContinue = useCallback(() => {
    if (!extracted || !automation || !jurisdiction) return;
    const plan = generateActionPlan(extracted, automation, jurisdiction);
    setActionPlan(plan);
    setStage('action_plan');
  }, [extracted, automation, jurisdiction]);

  const handleActionPlanContinue = useCallback(() => {
    if (!extracted || !automation || !caseId) return;
    const letter = generateChallengeLetter({
      extracted,
      automation,
      jurisdiction,
      userName: isDemo ? DEMO_CASE.userName : '[Your Name]',
      caseId,
    });
    setChallenge(letter);
    setStage('challenge');
  }, [extracted, automation, jurisdiction, caseId, isDemo]);

  const handleChallengeContinue = useCallback(() => {
    if (challenge) {
      // Add challenge to evidence
      const challengeEvidence: EvidenceItem = {
        id: `ev-${Date.now()}`,
        type: 'challenge',
        label: 'Challenge letter generated',
        description: `Draft challenge for ${challenge.recipientOrganization ?? 'organization'}`,
        timestamp: new Date().toISOString(),
      };
      setEvidence((prev) => [...prev, challengeEvidence]);
    }
    setStage('evidence');
  }, [challenge]);

  const handleAddEvidence = useCallback((item: Omit<EvidenceItem, 'id' | 'timestamp'>) => {
    const newItem: EvidenceItem = {
      ...item,
      id: `ev-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setEvidence((prev) => [...prev, newItem]);
  }, []);

  const handleRemoveEvidence = useCallback((id: string) => {
    setEvidence((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleEvidenceContinue = useCallback(() => {
    setStage('explain');
  }, []);

  const handleReset = useCallback(() => {
    setStage('input');
    setCaseId(null);
    setRawText('');
    setExtracted(null);
    setAutomation(null);
    setJurisdiction(null);
    setRightsOptions([]);
    setActionPlan([]);
    setChallenge(null);
    setChallengeStatus('draft');
    setEvidence([]);
    setIsDemo(false);
  }, []);

  const handleBackToHome = useCallback(() => {
    handleReset();
  }, [handleReset]);

  // --- Render ---
  return (
    <div className="min-h-screen bg-ink-50">
      <Header caseId={caseId} onReset={handleBackToHome} />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {stage === 'input' && <InputPanel onSubmit={handleInputSubmit} />}

        {stage !== 'input' && extracted && automation && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            {/* Main content */}
            <div className="min-w-0">
              {/* Demo banner */}
              {isDemo && (
                <div className="mb-5 flex items-center gap-2 rounded-lg border border-accent-200 bg-accent-50 px-4 py-2.5 text-sm text-accent-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Fictional demo case.</strong> {DEMO_CASE.fictionalNotice}
                  </span>
                </div>
              )}

              {/* Raw decision text — collapsible */}
              <details className="card mb-5 overflow-hidden">
                  <summary className="cursor-pointer select-none px-5 py-3 text-sm font-semibold text-ink-600 transition-colors hover:bg-ink-50">
                    View original decision text
                  </summary>
                  <div className="border-t border-ink-100 bg-ink-50/50 p-4">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink-600">
                      {rawText}
                    </pre>
                  </div>
                </details>

              {stage === 'analysis' && (
                <StatusCard
                  analysis={automation}
                  extracted={extracted}
                  onContinue={() => setStage('jurisdiction')}
                />
              )}

              {stage === 'jurisdiction' && (
                <JurisdictionSelector
                  selected={jurisdiction}
                  onSelect={handleJurisdictionSelect}
                  onContinue={handleJurisdictionContinue}
                />
              )}

              {stage === 'rights' && (
                <RightsOptions
                  options={rightsOptions}
                  jurisdiction={jurisdiction}
                  onContinue={handleRightsContinue}
                />
              )}

              {stage === 'action_plan' && (
                <ActionPlanTimeline steps={actionPlan} onContinue={handleActionPlanContinue} />
              )}

              {stage === 'challenge' && challenge && (
                <ChallengeLetterView letter={challenge} onContinue={handleChallengeContinue} />
              )}

              {stage === 'evidence' && (
                <EvidenceVault
                  evidence={evidence}
                  challengeStatus={challengeStatus}
                  onAddEvidence={handleAddEvidence}
                  onRemoveEvidence={handleRemoveEvidence}
                  onStatusChange={setChallengeStatus}
                  onContinue={handleEvidenceContinue}
                />
              )}

              {stage === 'explain' && (
                <ExplainMode
                  extracted={extracted}
                  automation={automation}
                  jurisdiction={jurisdiction}
                  onRestart={handleReset}
                />
              )}
            </div>

            {/* Sidebar — Case tracker + quick facts */}
            <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              {caseId && (
                <CaseTracker
                  caseId={caseId}
                  milestones={milestones}
                  currentStage={STAGE_LABELS[stage]}
                />
              )}

              {/* Quick reference */}
              <div className="card overflow-hidden">
                <div className="border-b border-ink-200 bg-ink-50 px-4 py-2.5">
                  <div className="section-title">Quick Reference</div>
                </div>
                <div className="space-y-2 p-4 text-xs">
                  <QuickFact label="Status" value={STATUS_META[automation.status].label} />
                  <QuickFact label="Organization" value={extracted.organization} />
                  <QuickFact label="Input method" value={inputMethod} />
                  <QuickFact label="Jurisdiction" value={jurisdiction ?? 'Not selected'} />
                  <QuickFact label="Challenge status" value={challengeStatus.replace(/_/g, ' ')} />
                  <QuickFact label="Evidence items" value={String(evidence.length)} />
                </div>
              </div>

              {/* Trust badge */}
              <div className="card p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-ink-500">
                  <ShieldCheck className="h-4 w-4 text-success-500" />
                  Deterministic analysis · No facts invented
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-2 text-xs text-ink-400 sm:flex-row">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-ink-500">REDRESS</span>
              <span>· LexHack 2026 · AI Safety, Ethics & Governance</span>
            </div>
            <div>Not legal advice. General information only. Verify with relevant authorities.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function QuickFact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-400">{label}</span>
      <span className="font-medium capitalize text-ink-700">{value ?? '—'}</span>
    </div>
  );
}
