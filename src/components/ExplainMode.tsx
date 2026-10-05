import { useMemo, useState } from 'react';
import { MessageCircle, Send, BookOpen, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import type { AutomationAnalysis, ExplainResponse, ExtractedData, JurisdictionCode } from '@/types';
import { explain, matchesKnownTopic, SUGGESTED_QUESTIONS } from '@/ai/explainEngine';
import type { ApertusClient, GroundedOutput, LanguageCode } from '@/apertus/types';
import { buildFactSheet, letterRequestsFromBody } from '@/apertus/factSheet';
import { generateGrounded } from '@/apertus/pipeline';
import { detectLanguage } from '@/apertus/language';
import { ApertusPanel } from '@/components/ApertusPanel';
import { ReceiptsView } from '@/components/ReceiptsView';

interface ExplainModeProps {
  extracted: ExtractedData;
  automation: AutomationAnalysis;
  jurisdiction: JurisdictionCode | null;
  onRestart: () => void;
  apertusClient: ApertusClient | null;
  rawText: string;
  ruleBasedLetter: string;
  defaultLanguage: LanguageCode;
}

export function ExplainMode(props: ExplainModeProps) {
  const { extracted, automation, jurisdiction, onRestart } = props;
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<ExplainResponse | null>(null);
  const [grounded, setGrounded] = useState<{ question: string; output: GroundedOutput } | null>(null);
  const [loading, setLoading] = useState(false);

  const sheet = useMemo(
    () => buildFactSheet({ extracted, automation, jurisdiction, letterRequests: letterRequestsFromBody(props.ruleBasedLetter) }),
    [extracted, automation, jurisdiction, props.ruleBasedLetter],
  );

  const handleAsk = async (q?: string) => {
    const query = q ?? question;
    if (!query.trim()) return;
    if (q) setQuestion(q);
    setLoading(true);
    setResponse(null);
    setGrounded(null);

    // Known topics keep REDRESS's fixed, rule-based answers.
    // Anything else goes to Apertus, and every sentence passes through Receipts.
    if (matchesKnownTopic(query) || !props.apertusClient) {
      setTimeout(() => {
        setResponse(explain({ question: query, extracted, automation, jurisdiction }));
        setLoading(false);
      }, 300);
      return;
    }
    try {
      const output = await generateGrounded({
        client: props.apertusClient,
        task: 'answer',
        language: detectLanguage(query),
        question: query,
        sheet,
        extracted,
        automation,
        jurisdiction,
        ruleBasedLetter: props.ruleBasedLetter,
      });
      setGrounded({ question: query, output });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="mb-5">
        <div className="section-title mb-1">Explain It To Me</div>
        <h2 className="text-lg font-bold text-ink-900">Ask a question about your decision</h2>
        <p className="text-sm text-ink-500">
          REDRESS answers only from your decision, the extracted data, and the selected jurisdiction. It does not invent law or facts.
        </p>
      </div>

      {/* Apertus explanation with Receipts */}
      <div className="mb-5">
        <ApertusPanel
          task="explain"
          client={props.apertusClient}
          rawText={props.rawText}
          extracted={extracted}
          automation={automation}
          jurisdiction={jurisdiction}
          ruleBasedLetter={props.ruleBasedLetter}
          defaultLanguage={props.defaultLanguage}
        />
      </div>

      <div className="section-title mb-2">Or ask REDRESS a specific question (rule-based)</div>

      {/* Suggested questions */}
      <div className="mb-4 flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handleAsk(q)}
            className="rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-brand-100 hover:text-brand-700"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="card-lg mb-4 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-ink-200 bg-ink-50 px-4 py-2.5">
          <MessageCircle className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-semibold text-ink-700">Ask REDRESS</span>
        </div>
        <div className="flex gap-2 p-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Type your question..."
            className="flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <button onClick={() => handleAsk()} disabled={loading || !question.trim()} className="btn-primary">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Ask
          </button>
        </div>
      </div>

      {/* Free-form answer, checked by Receipts */}
      {grounded && (
        <div className="card-lg animate-fade-in overflow-hidden" data-testid="freeform-answer">
          <div className="border-b border-ink-200 bg-brand-50 px-5 py-3">
            <div className="text-xs font-medium text-brand-700">Your question</div>
            <div className="text-sm font-semibold text-ink-900">{grounded.question}</div>
          </div>
          <div className="p-5">
            <ReceiptsView output={grounded.output} sheet={sheet} rawText={props.rawText} />
          </div>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="card-lg animate-fade-in overflow-hidden">
          <div className="border-b border-ink-200 bg-brand-50 px-5 py-3">
            <div className="text-xs font-medium text-brand-700">Your question</div>
            <div className="text-sm font-semibold text-ink-900">{response.question}</div>
          </div>
          <div className="p-5">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{response.answer}</div>

            {response.sources.length > 0 && (
              <div className="mt-4 border-t border-ink-100 pt-3">
                <div className="mb-1.5 flex items-center gap-1.5 section-title">
                  <BookOpen className="h-3.5 w-3.5" />
                  Sources
                </div>
                <div className="space-y-1">
                  {response.sources.map((src, i) => (
                    <div key={i} className="text-xs text-ink-500">
                      {src}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {response.caveats.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {response.caveats.map((caveat, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-ink-400">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {caveat}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Start over */}
      <div className="mt-6 flex items-center justify-between border-t border-ink-200 pt-5">
        <div className="text-sm text-ink-500">
          You've completed the full REDRESS workflow.
        </div>
        <button onClick={onRestart} className="btn-primary">
          Start New Case
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
