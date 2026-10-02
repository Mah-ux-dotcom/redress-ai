import { useMemo, useState } from 'react';
import { ShieldCheck, ShieldX, Copy, Check, Info, AlertTriangle } from 'lucide-react';
import type { FactSheet, GroundedOutput, ReceiptSentence } from '@/apertus/types';

interface ReceiptsViewProps {
  output: GroundedOutput;
  sheet: FactSheet;
  /** The decision notice exactly as the user provided it. */
  rawText: string;
}

const KIND_LABEL: Record<string, string> = {
  decision: 'Decision fact',
  evidence: 'Evidence from the notice',
  gap: 'Not established',
  step: 'REDRESS next step',
  law: 'Legal reference',
  question: 'REDRESS letter request',
};

/** The notice with one quoted sentence highlighted. */
function HighlightedNotice({ rawText, quote }: { rawText: string; quote: string }) {
  const idx = rawText.indexOf(quote);
  if (idx < 0) return <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-500">{rawText}</pre>;
  return (
    <pre className="max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-500">
      {rawText.slice(0, idx)}
      <mark className="rounded bg-success-100 px-0.5 text-ink-900">{quote}</mark>
      {rawText.slice(idx + quote.length)}
    </pre>
  );
}

export function ReceiptsView({ output, sheet, rawText }: ReceiptsViewProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showBlocked, setShowBlocked] = useState(true);
  const [copied, setCopied] = useState(false);
  const isFallback = output.producedBy === 'rule_based_fallback';

  const verifiedText = useMemo(
    () => output.sentences.filter((s) => s.verdict === 'verified').map((s) => s.text).join('\n'),
    [output],
  );

  const handleCopy = () => {
    navigator.clipboard?.writeText(verifiedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const active: ReceiptSentence | null = selected !== null ? output.sentences[selected] ?? null : null;

  return (
    <div className="space-y-3" data-testid="receipts">
      {/* Header: who wrote it + the Receipts counter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            output.producedBy === 'apertus'
              ? 'bg-brand-100 text-brand-700'
              : output.producedBy === 'mock'
              ? 'bg-warning-100 text-warning-700'
              : 'bg-ink-100 text-ink-600'
          }`}
          data-testid="receipts-model"
        >
          Written by: {output.modelLabel}
        </span>
        {!isFallback && (
          <div className="flex items-center gap-2 text-xs font-semibold" data-testid="receipts-summary">
            <span className="rounded-full bg-ink-100 px-2.5 py-1 text-ink-700">{output.summary.checked} claims checked</span>
            <span className="flex items-center gap-1 rounded-full bg-success-100 px-2.5 py-1 text-success-700">
              <ShieldCheck className="h-3.5 w-3.5" /> {output.summary.verified} verified
            </span>
            <span className="flex items-center gap-1 rounded-full bg-error-100 px-2.5 py-1 text-error-700">
              <ShieldX className="h-3.5 w-3.5" /> {output.summary.blocked} blocked
            </span>
          </div>
        )}
      </div>

      {isFallback && output.fallbackReason && (
        <div className="flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs text-warning-700" data-testid="receipts-fallback">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{output.fallbackReason}</span>
        </div>
      )}

      {/* Sentences */}
      <div className="space-y-1.5 rounded-lg border border-ink-200 bg-white p-4">
        {output.sentences.map((s, i) => {
          if (isFallback) {
            return (
              <p key={i} className="whitespace-pre-wrap text-sm text-ink-700">
                {s.text}
              </p>
            );
          }
          if (s.verdict === 'blocked' && !showBlocked) return null;
          const isActive = selected === i;
          if (s.verdict === 'blocked') {
            return (
              <button
                key={i}
                onClick={() => setSelected(isActive ? null : i)}
                className={`block w-full rounded-md border px-2.5 py-1.5 text-left text-sm ${
                  isActive ? 'border-error-400 bg-error-100' : 'border-error-200 bg-error-50'
                }`}
                data-verdict="blocked"
              >
                <span className="flex items-start gap-1.5">
                  <ShieldX className="mt-0.5 h-3.5 w-3.5 shrink-0 text-error-600" />
                  <span className="text-error-700 line-through decoration-error-500">{s.text}</span>
                </span>
                <span className="mt-1 block pl-5 text-xs font-medium text-error-700">
                  Blocked: {s.reasons.join(' · ')}
                </span>
              </button>
            );
          }
          if (s.framing) {
            return (
              <p key={i} className="px-2.5 text-sm text-ink-600" data-verdict="framing">
                {s.text}
              </p>
            );
          }
          return (
            <button
              key={i}
              onClick={() => setSelected(isActive ? null : i)}
              className={`block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-ink-800 transition-colors ${
                isActive ? 'bg-success-100 ring-1 ring-success-400' : 'hover:bg-success-50'
              }`}
              data-verdict="verified"
            >
              <span className="flex items-start gap-1.5">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600" />
                <span className="underline decoration-success-300 decoration-2 underline-offset-4">{s.text}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Receipts for the selected sentence */}
      {active && !isFallback && (
        <div className="rounded-lg border border-ink-200 bg-ink-50 p-4" data-testid="receipt-detail">
          <div className="section-title mb-2">Receipts for this sentence</div>
          {active.cites.length === 0 && <p className="text-xs text-ink-500">No sources cited.</p>}
          <div className="space-y-3">
            {active.cites.map((id) => {
              const fact = sheet.byId[id];
              if (!fact) return null;
              return (
                <div key={id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{id}</span>
                    <span className="font-semibold text-ink-700">{KIND_LABEL[fact.kind] ?? fact.kind}</span>
                  </div>
                  <p className="mt-1 text-ink-600">{fact.text}</p>
                  {fact.sourceQuote && (
                    <div className="mt-2 rounded-md border border-ink-200 bg-white p-2">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-400">In your original notice</div>
                      <HighlightedNotice rawText={rawText} quote={fact.sourceQuote} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {active.verdict === 'blocked' && (
            <p className="mt-3 text-xs font-medium text-error-700">Why it was blocked: {active.reasons.join(' · ')}</p>
          )}
        </div>
      )}

      {/* Actions + limits */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!isFallback ? (
          <label className="flex items-center gap-2 text-xs text-ink-500">
            <input type="checkbox" checked={showBlocked} onChange={(e) => setShowBlocked(e.target.checked)} />
            Show blocked sentences
          </label>
        ) : (
          <span />
        )}
        <button onClick={handleCopy} className="btn-ghost text-xs">
          {copied ? <Check className="h-3.5 w-3.5 text-success-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : isFallback ? 'Copy text' : 'Copy verified text only'}
        </button>
      </div>
      {!isFallback && (
        <p className="flex items-start gap-1.5 text-[11px] text-ink-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Receipts checks citations, numbers, quotes, legal references, automation claims and legal conclusions against the facts
          REDRESS established. It cannot judge tone or every nuance — read the text before you use it. Click a sentence to see its sources.
        </p>
      )}
    </div>
  );
}
