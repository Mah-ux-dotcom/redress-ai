import { Check, ChevronRight, BookOpen, AlertCircle } from 'lucide-react';
import type { JurisdictionCode, RightsOption } from '@/types';
import { CONFIDENCE_META } from '@/lib/rightsGenerator';
import { getJurisdiction, isSpecificJurisdiction, LEGAL_REFERENCE_LAST_REVIEWED } from '@/legal/jurisdictions';

interface RightsOptionsProps {
  options: RightsOption[];
  jurisdiction: JurisdictionCode | null;
  onContinue: () => void;
}

export function RightsOptions({ options, jurisdiction, onContinue }: RightsOptionsProps) {
  const jur = jurisdiction ? getJurisdiction(jurisdiction) : null;

  return (
    <div className="animate-slide-up">
      <div className="mb-5">
        <div className="section-title mb-1">Possible Next Steps</div>
        <h2 className="text-lg font-bold text-ink-900">
          Potentially relevant options
        </h2>
        <p className="text-sm text-ink-500">
          {isSpecificJurisdiction(jurisdiction)
            ? `Based on the selected jurisdiction (${jur?.label}) and what your notice actually shows. Legal rights are described only where their conditions may be met.`
            : 'General procedural guidance — no specific jurisdiction selected, so rights where you are may differ.'}
        </p>
      </div>

      <div className="space-y-3">
        {options.map((opt) => {
          const conf = CONFIDENCE_META[opt.confidence];
          return (
            <div key={opt.id} className="card p-4 transition-shadow hover:shadow-card-lg">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-100 text-success-600">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink-900">{opt.title}</h3>
                    <span className={`text-xs font-medium ${conf.color}`}>{conf.label}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{opt.explanation}</p>
                  <div className="mt-2 rounded-md bg-ink-50 px-3 py-2 text-xs text-ink-500">
                    <span className="font-semibold text-ink-600">Why it matters: </span>
                    {opt.whyItMatters}
                  </div>
                  {opt.source && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-400">
                      <BookOpen className="h-3.5 w-3.5" />
                      Source: {opt.source}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legal references with their conditions and limits */}
      {jur && isSpecificJurisdiction(jurisdiction) && (
        <details className="card mt-4 overflow-hidden">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink-700 hover:bg-ink-50">
            Legal references for {jur.label} — when they apply and their limits
          </summary>
          <div className="space-y-3 border-t border-ink-100 p-4 text-xs text-ink-600">
            {jur.frameworks.map((f) => (
              <div key={f.shortName}>
                <div className="font-semibold text-ink-800">{f.name}</div>
                <div className="text-ink-400">{f.source}</div>
                <div className="mt-1"><span className="font-semibold">Applies when: </span>{f.applicableWhen}</div>
                <div><span className="font-semibold">Human review: </span>{f.humanReview}</div>
                <div><span className="font-semibold">Limits: </span>{f.limitations}</div>
                <div><span className="font-semibold">Status: </span>{f.currency}</div>
              </div>
            ))}
            <div className="text-ink-400">References last reviewed {LEGAL_REFERENCE_LAST_REVIEWED}.</div>
          </div>
        </details>
      )}

      {/* Jurisdiction disclaimer */}
      {jur && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs text-warning-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{jur.disclaimer}</span>
        </div>
      )}

      <div className="mt-5">
        <button onClick={onContinue} className="btn-primary">
          Build My Action Plan
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
