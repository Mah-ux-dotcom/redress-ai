import { useState } from 'react';
import { ClipboardPaste, FileText, ImageIcon, PenLine, Sparkles, AlertCircle } from 'lucide-react';
import type { InputMethod } from '@/types';
import { DEMO_PRESET_TEXTS, DEMO_CASE } from '@/data/demoCase';

interface InputPanelProps {
  onSubmit: (text: string, method: InputMethod) => void;
  /** True while a non-English notice is being translated. */
  busy?: boolean;
  apertusMode?: 'mock' | 'apertus' | 'off';
}

const METHODS: { id: InputMethod; label: string; icon: typeof ClipboardPaste; desc: string }[] = [
  { id: 'paste', label: 'Paste Text', icon: ClipboardPaste, desc: 'Paste the decision notification' },
  { id: 'screenshot', label: 'Screenshot', icon: ImageIcon, desc: 'Upload a screenshot image' },
  { id: 'pdf', label: 'Document', icon: FileText, desc: 'Upload a PDF or document' },
  { id: 'manual', label: 'Enter Manually', icon: PenLine, desc: 'Type the details yourself' },
];

export function InputPanel({ onSubmit, busy = false, apertusMode = 'mock' }: InputPanelProps) {
  const [method, setMethod] = useState<InputMethod>('paste');
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) {
      setError('Please paste or enter the decision text to continue.');
      return;
    }
    setError('');
    onSubmit(text.trim(), method);
  };

  const loadDemo = () => {
    setText(DEMO_CASE.decisionText);
    setMethod('paste');
    setError('');
  };

  return (
    <div className="mx-auto max-w-3xl animate-slide-up">
      {/* Hero */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          <Sparkles className="h-3.5 w-3.5" />
          AI Accountability & Challenge Workflow
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          When an AI makes a decision about you,
          <br className="hidden sm:block" />
          <span className="text-brand-600"> know what to do next.</span>
        </h1>
        <p className="mx-auto max-w-xl text-base text-ink-500">
          Paste a decision you received. REDRESS will analyze it, explain what happened,
          identify your options, and help you prepare a challenge.
        </p>
      </div>

      <div className="card-lg overflow-hidden">
        {/* Method selector */}
        <div className="grid grid-cols-2 gap-px border-b border-ink-200 bg-ink-200 sm:grid-cols-4">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`flex flex-col items-center gap-1.5 px-3 py-4 transition-colors ${
                  active ? 'bg-white' : 'bg-ink-50 hover:bg-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-brand-600' : 'text-ink-400'}`} strokeWidth={2} />
                <span className={`text-xs font-semibold ${active ? 'text-ink-900' : 'text-ink-500'}`}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Input area */}
        <div className="p-5">
          {(method === 'paste' || method === 'manual') && (
            <>
              <label className="mb-2 block section-title">
                {method === 'paste' ? 'Decision Text' : 'Enter Decision Details'}
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste the decision notification you received here..."
                className="h-48 w-full resize-none rounded-lg border border-ink-200 bg-ink-50/50 p-4 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </>
          )}

          {method === 'screenshot' && (
            <div className="rounded-lg border-2 border-dashed border-ink-200 bg-ink-50/50 p-8 text-center">
              <ImageIcon className="mx-auto mb-3 h-10 w-10 text-ink-300" />
              <p className="mb-1 text-sm font-medium text-ink-600">Upload a screenshot of the decision</p>
              <p className="text-xs text-ink-400">PNG, JPG up to 10MB</p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Or paste the text from the screenshot..."
                className="mt-4 h-32 w-full resize-none rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          )}

          {method === 'pdf' && (
            <div className="rounded-lg border-2 border-dashed border-ink-200 bg-ink-50/50 p-8 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-ink-300" />
              <p className="mb-1 text-sm font-medium text-ink-600">Upload a PDF or document</p>
              <p className="text-xs text-ink-400">PDF, DOCX up to 10MB</p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Or paste the text from the document..."
                className="mt-4 h-32 w-full resize-none rounded-lg border border-ink-200 bg-white p-4 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-error-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Preset buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            {DEMO_PRESET_TEXTS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setText(preset.text);
                  setMethod('paste');
                  setError('');
                }}
                className="rounded-md bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-200"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              onClick={loadDemo}
              className="btn-ghost text-brand-600 hover:bg-brand-50"
            >
              <Sparkles className="h-4 w-4" />
              Load Demo Case
            </button>
            <button onClick={handleSubmit} disabled={busy} className="btn-primary">
              {busy ? 'Translating with Apertus…' : 'Analyze Decision'}
            </button>
          </div>
        </div>
      </div>

      {/* Trust notice */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-400">
        <AlertCircle className="h-3.5 w-3.5" />
        {apertusMode === 'apertus'
          ? 'Analysis runs in your browser. Translation and drafting send the notice to the configured Apertus endpoint via the REDRESS proxy.'
          : 'Your text is processed locally in your browser. REDRESS does not send your data to external AI services in this mode.'}
      </div>
    </div>
  );
}
