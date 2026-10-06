import { AlertTriangle, HelpCircle, CheckCircle2, Zap, Info, ChevronRight, Quote } from 'lucide-react';
import type { AutomationAnalysis, ExtractedData } from '@/types';
import { INVOLVEMENT_META, STATUS_META } from '@/lib/analyze';

interface StatusCardProps {
  analysis: AutomationAnalysis;
  extracted: ExtractedData;
  onContinue: () => void;
}

const ICONS = {
  alert: AlertTriangle,
  warn: Zap,
  question: HelpCircle,
  check: CheckCircle2,
};

export function StatusCard({ analysis, extracted, onContinue }: StatusCardProps) {
  const meta = STATUS_META[analysis.status];
  const involvement = INVOLVEMENT_META[analysis.involvement];
  const Icon = ICONS[meta.icon as keyof typeof ICONS] ?? Info;
  const evidence = analysis.signals.filter((s) => s.type !== 'neutral');
  const notCounted = analysis.signals.filter((s) => s.type === 'neutral');

  return (
    <div className="animate-slide-up space-y-4">
      {/* DECISION — what happened */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 bg-ink-50 px-5 py-3">
          <div className="section-title">Decision — what happened</div>
        </div>
        <div className="grid grid-cols-1 gap-px bg-ink-200 sm:grid-cols-2">
          <FactRow label="Organization" value={extracted.organization} />
          <FactRow label="Decision Type" value={extracted.decisionType} />
          <FactRow label="Outcome" value={extracted.decisionOutcome} />
          <FactRow label="Date" value={extracted.date} />
          <FactRow label="Stated Reason" value={extracted.statedReason} fullWidth />
          <FactRow
            label="Human Involvement"
            value={
              extracted.humanReviewMentioned
                ? 'Stated in the notice'
                : extracted.humanReviewOffered
                ? 'Not stated — review by a person offered as a route'
                : 'Not stated'
            }
            highlight={!extracted.humanReviewMentioned}
          />
          <FactRow label="Deadline" value={extracted.deadline} highlight={!!extracted.deadline} />
        </div>
      </div>

      {/* AUTOMATION STATUS */}
      <div className={`card-lg overflow-hidden border-2 ${meta.borderColor}`}>
        <div className={`${meta.bgColor} ${meta.borderColor} border-b px-5 py-4`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white ${meta.color}`}>
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <div className="section-title text-ink-400">Automation Status</div>
              <div className={`text-lg font-bold ${meta.color}`} data-testid="automation-status">{meta.label}</div>
              <div className="text-xs font-medium text-ink-600" data-testid="automation-involvement">
                Role of automation: {involvement.label}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <p className="text-sm leading-relaxed text-ink-600">{analysis.explanation}</p>

          {/* WHAT THE EVIDENCE SHOWS */}
          <div>
            <div className="section-title mb-2">What the evidence shows</div>
            {evidence.length > 0 ? (
              <div className="space-y-2.5">
                {evidence.map((signal, i) => (
                  <div key={i} className="text-sm">
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          signal.type === 'human' || signal.type === 'human_route'
                            ? 'bg-success-500'
                            : signal.weight === 'strong'
                            ? 'bg-error-500'
                            : 'bg-warning-500'
                        }`}
                      />
                      <span className="text-ink-700">{signal.text}</span>
                    </div>
                    <div className="ml-4 mt-1 flex items-start gap-1.5 rounded-md bg-ink-50 px-3 py-1.5 text-xs italic text-ink-500">
                      <Quote className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        {signal.originalQuote ?? signal.quote}
                        {signal.originalQuote && (
                          <span className="mt-0.5 block not-italic text-ink-400">Translation: {signal.quote}</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">
                No statement about automated processing, algorithms, AI, or a person reviewing the decision was found in the text.
              </p>
            )}
            {notCounted.map((signal, i) => (
              <p key={i} className="mt-2 text-xs text-ink-400">
                Not counted as evidence: “{signal.originalQuote ?? signal.quote}” — {signal.text.toLowerCase()}.
              </p>
            ))}
          </div>

          {analysis.suggests.length > 0 && (
            <div>
              <div className="section-title mb-2">What it suggests</div>
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-600">
                {analysis.suggests.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {/* WHAT WE CANNOT ESTABLISH */}
          <div>
            <div className="section-title mb-2">What we cannot establish</div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-600">
              {analysis.notEstablished.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* YOUR OPTIONS */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 bg-brand-50 px-5 py-3">
          <div className="section-title text-brand-700">Your options</div>
        </div>
        <div className="p-5">
          <div className="space-y-2.5">
            {analysis.nextSteps.map((opt, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-ink-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-xs font-bold">
                  {i + 1}
                </span>
                {opt}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <button onClick={onContinue} className="btn-primary">
          Choose Jurisdiction
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function FactRow({
  label,
  value,
  fullWidth,
  highlight,
}: {
  label: string;
  value: string | null;
  fullWidth?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white px-5 py-3 ${fullWidth ? 'sm:col-span-2' : ''}`}>
      <div className="section-title mb-0.5">{label}</div>
      {value ? (
        <div className={`text-sm font-medium ${highlight ? 'text-brand-700' : 'text-ink-800'}`}>{value}</div>
      ) : (
        <div className="flex items-center gap-1.5 text-sm italic text-ink-400">
          <HelpCircle className="h-3.5 w-3.5" />
          Not found in text
        </div>
      )}
    </div>
  );
}
