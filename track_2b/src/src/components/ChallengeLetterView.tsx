import { useState } from 'react';
import { FileText, Copy, Check, Download, User, ChevronRight, AlertCircle } from 'lucide-react';
import type { AutomationAnalysis, ChallengeLetter, ExtractedData, JurisdictionCode } from '@/types';
import type { ApertusClient, LanguageCode } from '@/apertus/types';
import { ApertusPanel } from '@/components/ApertusPanel';

interface ChallengeLetterViewProps {
  letter: ChallengeLetter;
  onContinue: () => void;
  /** Context for drafting the letter in another language with Apertus + Receipts. */
  apertus?: {
    client: ApertusClient | null;
    rawText: string;
    extracted: ExtractedData;
    automation: AutomationAnalysis;
    jurisdiction: JurisdictionCode | null;
    defaultLanguage: LanguageCode;
    userName?: string;
  };
}

export function ChallengeLetterView({ letter, onContinue, apertus }: ChallengeLetterViewProps) {
  const [editedBody, setEditedBody] = useState(letter.body);
  const [userName, setUserName] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const full = `Subject: ${letter.subject}\n\n${editedBody}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const full = `Subject: ${letter.subject}\n\n${editedBody}`;
    const blob = new Blob([full], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redress-challenge-${letter.caseId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-slide-up">
      <div className="mb-5">
        <div className="section-title mb-1">Challenge Letter</div>
        <h2 className="text-lg font-bold text-ink-900">Your editable challenge document</h2>
        <p className="text-sm text-ink-500">
          Review and customize the letter below. Every fact comes from your decision or your input — nothing is invented.
        </p>
      </div>

      {/* User name input */}
      <div className="card mb-4 p-4">
        <label className="mb-1.5 block section-title">Your Name (for the letter)</label>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-ink-400" />
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your full name"
            className="flex-1 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <p className="mt-1.5 text-xs text-ink-400">
          This will replace the placeholder name in the letter. Your name is kept locally and not sent anywhere.
        </p>
      </div>

      {/* Letter preview */}
      <div className="card-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-brand-600" />
            <span className="font-mono text-xs font-semibold text-ink-600">{letter.caseId}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className="btn-ghost text-xs">
              {copied ? <Check className="h-3.5 w-3.5 text-success-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={handleDownload} className="btn-ghost text-xs">
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-3 rounded-md bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
            Subject: {letter.subject}
          </div>
          <textarea
            value={editedBody}
            onChange={(e) => setEditedBody(e.target.value)}
            className="h-96 w-full resize-none rounded-lg border border-ink-200 bg-ink-50/30 p-4 font-mono text-xs leading-relaxed text-ink-800 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {/* Multilingual draft with Receipts */}
      {apertus && (
        <div className="mt-4">
          <ApertusPanel
            task="letter"
            client={apertus.client}
            rawText={apertus.rawText}
            extracted={apertus.extracted}
            automation={apertus.automation}
            jurisdiction={apertus.jurisdiction}
            ruleBasedLetter={letter.body}
            userName={userName || apertus.userName}
            defaultLanguage={apertus.defaultLanguage}
          />
        </div>
      )}

      {/* Safety note */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-ink-50 p-3 text-xs text-ink-400">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          This letter was generated from the extracted facts in your decision. Review it carefully before sending.
          Do not include sensitive information (e.g., national ID numbers) unless you are comfortable sending it to the organization.
        </span>
      </div>

      <div className="mt-5">
        <button onClick={onContinue} className="btn-primary">
          Add to Evidence Timeline
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
