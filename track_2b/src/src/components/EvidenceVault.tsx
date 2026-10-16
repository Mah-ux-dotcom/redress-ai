import { useState } from 'react';
import { Plus, Clock, FileText, ImageIcon, Mail, StickyNote, Send, Trash2, ChevronRight } from 'lucide-react';
import type { ChallengeStatus, EvidenceItem } from '@/types';

interface EvidenceVaultProps {
  evidence: EvidenceItem[];
  challengeStatus: ChallengeStatus;
  onAddEvidence: (item: Omit<EvidenceItem, 'id' | 'timestamp'>) => void;
  onRemoveEvidence: (id: string) => void;
  onStatusChange: (status: ChallengeStatus) => void;
  onContinue: () => void;
}

const STATUS_OPTIONS: { value: ChallengeStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-ink-100 text-ink-600' },
  { value: 'submitted', label: 'Submitted', color: 'bg-brand-100 text-brand-700' },
  { value: 'awaiting_response', label: 'Awaiting response', color: 'bg-warning-100 text-warning-700' },
  { value: 'human_review_received', label: 'Human review received', color: 'bg-success-100 text-success-700' },
  { value: 'resolved', label: 'Resolved', color: 'bg-success-100 text-success-700' },
  { value: 'escalated', label: 'Escalated', color: 'bg-error-100 text-error-700' },
];

const TYPE_ICONS = {
  decision: FileText,
  screenshot: ImageIcon,
  document: FileText,
  email: Mail,
  note: StickyNote,
  challenge: Send,
};

const TYPE_COLORS: Record<EvidenceItem['type'], string> = {
  decision: 'bg-brand-100 text-brand-600',
  screenshot: 'bg-accent-100 text-accent-700',
  document: 'bg-ink-100 text-ink-600',
  email: 'bg-success-100 text-success-600',
  note: 'bg-warning-100 text-warning-600',
  challenge: 'bg-brand-100 text-brand-600',
};

const TYPE_LABELS: Record<EvidenceItem['type'], string> = {
  decision: 'Decision',
  screenshot: 'Screenshot',
  document: 'Document',
  email: 'Email',
  note: 'Note',
  challenge: 'Challenge',
};

export function EvidenceVault({
  evidence,
  challengeStatus,
  onAddEvidence,
  onRemoveEvidence,
  onStatusChange,
  onContinue,
}: EvidenceVaultProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<EvidenceItem['type']>('note');

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    onAddEvidence({
      type: newType,
      label: newLabel.trim(),
      description: newDesc.trim() || '—',
    });
    setNewLabel('');
    setNewDesc('');
    setShowAdd(false);
  };

  return (
    <div className="animate-slide-up">
      <div className="mb-5">
        <div className="section-title mb-1">Evidence Vault</div>
        <h2 className="text-lg font-bold text-ink-900">Your evidence timeline</h2>
        <p className="text-sm text-ink-500">
          Everything related to your case, in chronological order. Add items as you collect them.
        </p>
      </div>

      {/* Challenge status tracker */}
      <div className="card mb-5 p-4">
        <div className="mb-3 section-title">Challenge Status</div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const active = challengeStatus === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onStatusChange(opt.value)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  active
                    ? `${opt.color} ring-2 ring-offset-1 ring-current`
                    : 'bg-ink-50 text-ink-400 hover:bg-ink-100'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="card-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50 px-5 py-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-ink-500" />
            <span className="text-sm font-semibold text-ink-700">Timeline</span>
            <span className="text-xs text-ink-400">({evidence.length} items)</span>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="btn-ghost text-xs text-brand-600 hover:bg-brand-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="border-b border-ink-200 bg-brand-50/50 p-4 animate-slide-down">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-ink-500">Type</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TYPE_LABELS) as EvidenceItem['type'][]).map((t) => {
                    const Icon = TYPE_ICONS[t];
                    return (
                      <button
                        key={t}
                        onClick={() => setNewType(t)}
                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          newType === t ? 'bg-brand-600 text-white' : 'bg-white text-ink-500 border border-ink-200'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {TYPE_LABELS[t]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-ink-500">Label</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g., Response from NovaCredit"
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-ink-500">Description</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief description..."
                  className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <button onClick={handleAdd} className="btn-primary text-xs">
                  Add to Timeline
                </button>
                <button onClick={() => setShowAdd(false)} className="btn-secondary text-xs">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Evidence list */}
        <div className="divide-y divide-ink-100">
          {evidence.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-ink-400">
              No evidence items yet. Click "Add Item" to start building your timeline.
            </div>
          ) : (
            evidence.map((item) => {
              const Icon = TYPE_ICONS[item.type];
              const date = new Date(item.timestamp);
              return (
                <div key={item.id} className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-ink-50/50">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TYPE_COLORS[item.type]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink-800">{item.label}</span>
                      <span className="label-tag bg-ink-100 text-ink-500">{TYPE_LABELS[item.type]}</span>
                    </div>
                    <div className="text-xs text-ink-500">{item.description}</div>
                    <div className="mt-0.5 text-xs text-ink-400">
                      {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} —{' '}
                      {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveEvidence(item.id)}
                    className="btn-ghost text-ink-300 hover:text-error-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-5">
        <button onClick={onContinue} className="btn-primary">
          Explain It To Me
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
