import { useMemo, useState } from 'react';
import { Languages, RefreshCw, Sparkles } from 'lucide-react';
import type { AutomationAnalysis, ExtractedData, JurisdictionCode } from '@/types';
import type { ApertusClient, GroundedOutput, LanguageCode } from '@/apertus/types';
import { LANGUAGES, LANGUAGE_CODES } from '@/apertus/language';
import { buildFactSheet, letterRequestsFromBody } from '@/apertus/factSheet';
import { generateGrounded } from '@/apertus/pipeline';
import type { GenerationTask } from '@/apertus/prompts';
import { ReceiptsView } from '@/components/ReceiptsView';

type PanelTask = Exclude<GenerationTask, 'answer'>;

interface ApertusPanelProps {
  task: PanelTask;
  client: ApertusClient | null;
  rawText: string;
  extracted: ExtractedData;
  automation: AutomationAnalysis;
  jurisdiction: JurisdictionCode | null;
  /** REDRESS's rule-based letter — source of the letter questions and the fallback. */
  ruleBasedLetter: string;
  userName?: string;
  defaultLanguage?: LanguageCode;
}

const COPY: Record<PanelTask, { title: string; subtitle: string; button: string }> = {
  explain: {
    title: 'Explain it to me — in your language',
    subtitle:
      'Apertus writes the explanation. REDRESS checks every sentence against the facts it established and blocks anything unsupported.',
    button: 'Explain with Receipts',
  },
  letter: {
    title: 'Draft this letter in another language',
    subtitle:
      'Apertus writes the letter from REDRESS’s verified requests. Every sentence is checked before you can use it.',
    button: 'Draft with Receipts',
  },
};

export function ApertusPanel(props: ApertusPanelProps) {
  const { task, client, rawText, extracted, automation, jurisdiction, ruleBasedLetter, userName } = props;
  const [language, setLanguage] = useState<LanguageCode>(props.defaultLanguage ?? 'en');
  const [output, setOutput] = useState<GroundedOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const copy = COPY[task];

  const sheet = useMemo(
    () => buildFactSheet({ extracted, automation, jurisdiction, letterRequests: letterRequestsFromBody(ruleBasedLetter) }),
    [extracted, automation, jurisdiction, ruleBasedLetter],
  );

  const run = async () => {
    setLoading(true);
    try {
      const result = await generateGrounded({
        client,
        task,
        language,
        sheet,
        extracted,
        automation,
        jurisdiction,
        ruleBasedLetter,
        userName,
      });
      setOutput(result);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-lg overflow-hidden" data-testid={`apertus-panel-${task}`}>
      <div className="flex items-center gap-2 border-b border-ink-200 bg-brand-50 px-5 py-3">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <div>
          <div className="text-sm font-bold text-ink-900">{copy.title}</div>
          <div className="text-xs text-ink-500">{copy.subtitle}</div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Languages className="h-4 w-4 text-ink-400" />
          <label htmlFor={`lang-${task}`} className="text-xs font-semibold text-ink-600">
            Language
          </label>
          <select
            id={`lang-${task}`}
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-sm text-ink-800"
          >
            {LANGUAGE_CODES.map((code) => (
              <option key={code} value={code}>
                {LANGUAGES[code].native}
              </option>
            ))}
          </select>
          <button onClick={run} disabled={loading} className="btn-primary">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Writing and checking…' : copy.button}
          </button>
        </div>
        {!client && (
          <p className="text-xs text-ink-500">Language-model features are turned off. REDRESS will show its rule-based output.</p>
        )}
        {output && <ReceiptsView output={output} sheet={sheet} rawText={rawText} />}
      </div>
    </div>
  );
}
