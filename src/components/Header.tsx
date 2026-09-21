import { Shield, Scale } from 'lucide-react';

interface HeaderProps {
  caseId: string | null;
  onReset: () => void;
}

export function Header({ caseId, onReset }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <button onClick={onReset} className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Scale className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div className="text-left">
            <div className="text-lg font-bold tracking-tight text-ink-900">REDRESS</div>
            <div className="hidden text-[10px] font-medium uppercase tracking-wider text-ink-400 sm:block">
              AI Accountability & Challenge
            </div>
          </div>
        </button>

        <div className="flex items-center gap-3">
          {caseId && (
            <div className="hidden items-center gap-1.5 rounded-md bg-ink-100 px-3 py-1.5 font-mono text-xs font-medium text-ink-600 sm:flex">
              <Shield className="h-3.5 w-3.5 text-brand-600" />
              Case {caseId}
            </div>
          )}
          <div className="label-tag bg-brand-50 text-brand-700">
            LexHack 2026 · AI Safety
          </div>
        </div>
      </div>
    </header>
  );
}
