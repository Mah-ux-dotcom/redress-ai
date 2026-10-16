import { ChevronRight, FileText, Search, MessageSquare, Send, TrendingUp, Check } from 'lucide-react';
import type { ActionStep } from '@/types';

interface ActionPlanTimelineProps {
  steps: ActionStep[];
  onContinue: () => void;
}

const STEP_ICONS = [FileText, Search, MessageSquare, Send, TrendingUp];

export function ActionPlanTimeline({ steps, onContinue }: ActionPlanTimelineProps) {
  return (
    <div className="animate-slide-up">
      <div className="mb-5">
        <div className="section-title mb-1">Redress Action Plan</div>
        <h2 className="text-lg font-bold text-ink-900">Your step-by-step timeline</h2>
        <p className="text-sm text-ink-500">
          Follow these steps in order. Each step is actionable and builds on the previous one.
        </p>
      </div>

      {/* Vertical timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-ink-200" />

        <div className="space-y-4">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Check;
            return (
              <div key={step.step} className="relative flex gap-4 animate-slide-in" style={{ animationDelay: `${i * 80}ms` }}>
                {/* Step number circle */}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border-2 border-brand-500 text-brand-600 shadow-sm">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>

                {/* Step content */}
                <div className="card flex-1 p-4">
                  <div className="flex items-center gap-2">
                    <span className="label-tag bg-brand-50 text-brand-700">Step {step.step}</span>
                    <h3 className="font-semibold text-ink-900">{step.title}</h3>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.description}</p>
                  <div className="mt-3 space-y-1.5">
                    {step.actions.map((action, j) => (
                      <div key={j} className="flex items-start gap-2 text-sm text-ink-700">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <button onClick={onContinue} className="btn-primary">
          Generate Challenge Letter
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
