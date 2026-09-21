import { AlertTriangle, HelpCircle, CheckCircle2, Zap, Info } from 'lucide-react';
import type { AutomationAnalysis, ExtractedData } from '@/types';
import { STATUS_META } from '@/lib/analyze';
import { getStatusOptionsSummary } from '@/lib/rightsGenerator';

interface StatusCardProps {
  analysis: AutomationAnalysis;
  extracted: ExtractedData;
}

const ICONS = {
  alert: AlertTriangle,
  warn: Zap,
  question: HelpCircle,
  check: CheckCircle2,
};

export function StatusCard({ analysis, extracted }: StatusCardProps) {
  const meta = STATUS_META[analysis.status];
  const Icon = ICONS[meta.icon as keyof typeof ICONS] ?? Info;
  const optionsSummary = getStatusOptionsSummary(analysis.status);

  return (
    <div className="animate-slide-up space-y-4">
      {/* Main status card */}
      <div className={`card-lg overflow-hidden border-2 ${meta.borderColor}`}>
        <div className={`${meta.bgColor} ${meta.borderColor} border-b px-5 py-4`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white ${meta.color}`}>
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <div className="section-title text-ink-400">Decision Status</div>
              <div className={`text-lg font-bold ${meta.color}`}>{meta.label}</div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <p className="text-sm leading-relaxed text-ink-600">{analysis.explanation}</p>

          {/* Signals */}
          {analysis.signals.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="section-title">Signals detected in the text</div>
              {analysis.signals.map((signal, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span
                    className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                      signal.type === 'human'
                        ? 'bg-success-500'
                        : signal.weight === 'strong'
                        ? 'bg-error-500'
                        : 'bg-warning-500'
                    }`}
                  />
                  <span className="text-ink-600">{signal.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Demo summary card */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 bg-ink-50 px-5 py-3">
          <div className="section-title">Key Facts</div>
        </div>
        <div className="grid grid-cols-1 gap-px bg-ink-200 sm:grid-cols-2">
          <FactRow label="Organization" value={extracted.organization} />
          <FactRow label="Decision Type" value={extracted.decisionType} />
          <FactRow label="Outcome" value={extracted.decisionOutcome} />
          <FactRow label="Date" value={extracted.date} />
          <FactRow label="Stated Reason" value={extracted.statedReason} fullWidth />
          <FactRow
            label="Human Review"
            value={extracted.humanReviewMentioned ? 'Mentioned' : 'Not mentioned'}
            highlight={!extracted.humanReviewMentioned}
          />
          <FactRow label="Deadline" value={extracted.deadline} highlight={!!extracted.deadline} />
        </div>
      </div>

      {/* User options summary — demo-style */}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 bg-brand-50 px-5 py-3">
          <div className="section-title text-brand-700">User Options</div>
        </div>
        <div className="p-5">
          <div className="space-y-2.5">
            {optionsSummary.map((opt, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm text-ink-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-xs font-bold">
                  →
                </span>
                {opt}
              </div>
            ))}
          </div>
        </div>
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
