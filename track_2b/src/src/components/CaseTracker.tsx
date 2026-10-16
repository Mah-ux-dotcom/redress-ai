import { CheckCircle2, Circle } from 'lucide-react';
import type { CaseMilestone } from '@/types';

interface CaseTrackerProps {
  caseId: string;
  milestones: CaseMilestone[];
  currentStage: string;
}

export function CaseTracker({ caseId, milestones, currentStage }: CaseTrackerProps) {
  const completedCount = milestones.filter((m) => m.completed).length;
  const progress = (completedCount / milestones.length) * 100;

  return (
    <div className="card-lg overflow-hidden">
      {/* Case header */}
      <div className="flex items-center justify-between border-b border-ink-200 bg-ink-950 px-5 py-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-ink-400">Redress Case</div>
          <div className="font-mono text-lg font-bold text-white">#{caseId}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-400">Progress</div>
          <div className="text-sm font-semibold text-brand-400">{completedCount}/{milestones.length} steps</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-ink-100">
        <div
          className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Milestone flow */}
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {milestones.map((m, i) => (
            <div key={m.id} className="flex items-center gap-1.5">
              <div className="flex items-center gap-1.5">
                {m.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-success-500" />
                ) : (
                  <Circle className={`h-4 w-4 ${m.label === currentStage ? 'text-brand-500 animate-pulse-soft' : 'text-ink-300'}`} />
                )}
                <span
                  className={`text-xs font-medium ${
                    m.completed ? 'text-ink-700' : m.label === currentStage ? 'text-brand-600' : 'text-ink-400'
                  }`}
                >
                  {m.label}
                </span>
              </div>
              {i < milestones.length - 1 && (
                <span className={`text-xs ${m.completed ? 'text-brand-400' : 'text-ink-200'}`}>→</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
