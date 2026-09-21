import { Globe, ChevronRight, ShieldAlert } from 'lucide-react';
import type { JurisdictionCode } from '@/types';
import { JURISDICTIONS } from '@/legal/jurisdictions';

interface JurisdictionSelectorProps {
  selected: JurisdictionCode | null;
  onSelect: (code: JurisdictionCode) => void;
  onContinue: () => void;
}

export function JurisdictionSelector({ selected, onSelect, onContinue }: JurisdictionSelectorProps) {
  return (
    <div className="animate-slide-up">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Globe className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-ink-900">Where did this decision affect you?</h2>
          <p className="text-sm text-ink-500">
            Legal frameworks vary by region. Select your jurisdiction to see potentially relevant rights.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {JURISDICTIONS.map((jur) => {
          const active = selected === jur.code;
          return (
            <button
              key={jur.code}
              onClick={() => onSelect(jur.code)}
              className={`card flex items-start gap-3 p-4 text-left transition-all ${
                active ? 'border-2 border-brand-500 ring-2 ring-brand-100' : 'hover:border-ink-300'
              }`}
            >
              <div className="text-2xl">{jur.flag}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-900">{jur.label}</span>
                  {active && <ChevronRight className="h-4 w-4 text-brand-600" />}
                </div>
                <div className="mt-1 text-xs text-ink-500">
                  {jur.frameworks.length} framework{jur.frameworks.length > 1 ? 's' : ''} referenced
                </div>
                {active && (
                  <div className="mt-2 text-xs text-ink-400">{jur.disclaimer}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={onContinue}
          disabled={!selected}
          className="btn-primary"
        >
          See My Rights & Options
          <ChevronRight className="h-4 w-4" />
        </button>
        {!selected && (
          <span className="text-sm text-ink-400">Select a jurisdiction to continue</span>
        )}
      </div>

      {/* Trust label */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-ink-50 p-3 text-xs text-ink-400">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
        <span>
          REDRESS provides general legal information, not legal advice. Rights are labeled as
          "potentially relevant" based on the selected jurisdiction. Always verify with the relevant authority.
        </span>
      </div>
    </div>
  );
}
