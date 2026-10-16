// ============================================================================
// REDRESS × Apertus benchmark — result types and Markdown summary
// ============================================================================

import type { AutomationStatus, JurisdictionCode } from '@/types';
import type { LanguageCode } from '@/apertus/types';
import type { GenerationTask } from '@/apertus/prompts';
import { mean, median, percentile } from './metrics';

export interface TaskResult {
  task: GenerationTask;
  ok: boolean;
  /** How the model's JSON was read (only for model output). */
  parseQuality?: 'valid' | 'repaired' | 'salvaged';
  fallbackReason?: string;
  /** First 4000 characters of the model's raw response when it could not be used. */
  rawResponseOnFallback?: string;
  ms: number;
  claims: number;
  verified: number;
  blocked: number;
  groundingRate: number | null;
  blockCategories: Record<string, number>;
  languageMatch: boolean | null;
  completeness: number | null;
  sentences: { text: string; verdict: string; cites: string[]; framing: boolean; reasons: string[] }[];
}

export interface CaseResult {
  model: string;
  run: number;
  caseId: string;
  language: LanguageCode;
  jurisdiction: JurisdictionCode;
  expectedStatus: AutomationStatus;
  status: AutomationStatus;
  statusMatch: boolean;
  translation: { ok: boolean; ms: number; droppedSentences: number; error?: string; parseQuality?: 'valid' | 'repaired' | 'salvaged' } | null;
  tasks: TaskResult[];
  calls: number;
  failedCalls: number;
  completionTokens: number;
}

export interface BenchmarkFile {
  meta: {
    startedAt: string;
    finishedAt: string;
    endpointHost: string;
    models: string[];
    runs: number;
    cases: number;
    commit: string;
    settings: string;
  };
  results: CaseResult[];
}

const pct = (n: number | null) => (n === null ? '—' : `${(n * 100).toFixed(1)}%`);
const sec = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)} s`);
const ratio = (a: number, b: number) => (b === 0 ? null : a / b);

export interface ModelStats {
  model: string;
  tasks: number;
  taskSuccess: number | null;
  /** Share of all model calls (translation + tasks) whose JSON was valid as returned / needed the narrow repair / was salvaged. */
  jsonValid: number | null;
  jsonRepaired: number | null;
  jsonSalvaged: number | null;
  claims: number;
  verifiedRate: number | null;
  blockedRate: number | null;
  groundingRate: number | null;
  languageMatch: number | null;
  explainCompleteness: number | null;
  letterCoverage: number | null;
  translationSuccess: number | null;
  statusAgreementTranslated: number | null;
  medianMs: number | null;
  p90Ms: number | null;
  meanTokensPerCase: number | null;
  blockCategories: Record<string, number>;
  byTask: Record<string, { success: number | null; claims: number; verifiedRate: number | null; blockedRate: number | null; medianMs: number | null }>;
  byLanguage: Record<string, { success: number | null; verifiedRate: number | null; languageMatch: number | null }>;
}

export function modelStats(file: BenchmarkFile, model: string): ModelStats {
  const rs = file.results.filter((r) => r.model === model);
  const tasks = rs.flatMap((r) => r.tasks);
  const ok = tasks.filter((t) => t.ok);
  const claims = ok.reduce((a, t) => a + t.claims, 0);
  const verified = ok.reduce((a, t) => a + t.verified, 0);
  const blocked = ok.reduce((a, t) => a + t.blocked, 0);
  const grounding = ok.map((t) => t.groundingRate).filter((x): x is number => x !== null);
  const lang = ok.map((t) => t.languageMatch).filter((x): x is boolean => x !== null);
  const translated = rs.filter((r) => r.translation);
  const blockCategories: Record<string, number> = {};
  for (const t of ok) for (const [k, v] of Object.entries(t.blockCategories)) blockCategories[k] = (blockCategories[k] ?? 0) + v;

  const byTask: ModelStats['byTask'] = {};
  for (const task of ['explain', 'letter', 'answer']) {
    const tt = tasks.filter((t) => t.task === task);
    const tok = tt.filter((t) => t.ok);
    const c = tok.reduce((a, t) => a + t.claims, 0);
    byTask[task] = {
      success: ratio(tok.length, tt.length),
      claims: c,
      verifiedRate: ratio(tok.reduce((a, t) => a + t.verified, 0), c),
      blockedRate: ratio(tok.reduce((a, t) => a + t.blocked, 0), c),
      medianMs: median(tok.map((t) => t.ms)),
    };
  }
  const byLanguage: ModelStats['byLanguage'] = {};
  for (const language of ['en', 'de', 'fr', 'it']) {
    const tt = rs.filter((r) => r.language === language).flatMap((r) => r.tasks);
    const tok = tt.filter((t) => t.ok);
    const c = tok.reduce((a, t) => a + t.claims, 0);
    const lm = tok.map((t) => t.languageMatch).filter((x): x is boolean => x !== null);
    byLanguage[language] = {
      success: ratio(tok.length, tt.length),
      verifiedRate: ratio(tok.reduce((a, t) => a + t.verified, 0), c),
      languageMatch: ratio(lm.filter(Boolean).length, lm.length),
    };
  }

  const qualities = [...tasks.map((t) => t.parseQuality), ...rs.map((r) => r.translation?.parseQuality)].filter(
    (q): q is NonNullable<TaskResult['parseQuality']> => q !== undefined,
  );
  const outputs = tasks.length + translated.length;
  return {
    model,
    tasks: tasks.length,
    taskSuccess: ratio(ok.length, tasks.length),
    jsonValid: ratio(qualities.filter((q) => q === 'valid').length, outputs),
    jsonRepaired: ratio(qualities.filter((q) => q === 'repaired').length, outputs),
    jsonSalvaged: ratio(qualities.filter((q) => q === 'salvaged').length, outputs),
    claims,
    verifiedRate: ratio(verified, claims),
    blockedRate: ratio(blocked, claims),
    groundingRate: mean(grounding),
    languageMatch: ratio(lang.filter(Boolean).length, lang.length),
    explainCompleteness: mean(ok.filter((t) => t.task === 'explain').map((t) => t.completeness).filter((x): x is number => x !== null)),
    letterCoverage: mean(ok.filter((t) => t.task === 'letter').map((t) => t.completeness).filter((x): x is number => x !== null)),
    translationSuccess: ratio(translated.filter((r) => r.translation!.ok).length, translated.length),
    statusAgreementTranslated: ratio(translated.filter((r) => r.statusMatch).length, translated.length),
    medianMs: median(ok.map((t) => t.ms)),
    p90Ms: percentile(ok.map((t) => t.ms), 90),
    meanTokensPerCase: mean(rs.map((r) => r.completionTokens).filter((n) => n > 0)),
    blockCategories,
    byTask,
    byLanguage,
  };
}

export function renderSummary(file: BenchmarkFile): string {
  const stats = file.meta.models.map((m) => modelStats(file, m));
  const header = `| Metric | ${stats.map((s) => `\`${s.model}\``).join(' | ')} |\n|---|${stats.map(() => '---|').join('')}`;
  const row = (label: string, f: (s: ModelStats) => string) => `| ${label} | ${stats.map(f).join(' | ')} |`;

  const lines: string[] = [];
  lines.push('# REDRESS × Apertus benchmark — results');
  lines.push('');
  lines.push(
    `Run ${file.meta.startedAt} → ${file.meta.finishedAt} · endpoint \`${file.meta.endpointHost}\` · commit \`${file.meta.commit}\` · ${file.meta.cases} cases × ${file.meta.runs} run(s) per model.`,
  );
  lines.push(`Settings: ${file.meta.settings}.`);
  lines.push('');
  lines.push('All numbers below are automated measurements produced by `benchmarks/run.ts`. Methodology and limitations: `benchmarks/README.md`.');
  lines.push('');
  lines.push('## Overall');
  lines.push('');
  lines.push(header);
  lines.push(row('Task success (model output usable, no fallback)', (s) => pct(s.taskSuccess)));
  lines.push(row('JSON valid as returned (all model outputs)', (s) => pct(s.jsonValid)));
  lines.push(row('JSON usable only after the narrow repair', (s) => pct(s.jsonRepaired)));
  lines.push(row('JSON salvaged item by item', (s) => pct(s.jsonSalvaged)));
  lines.push(row('Claims checked by Receipts', (s) => String(s.claims)));
  lines.push(row('Verified claims', (s) => pct(s.verifiedRate)));
  lines.push(row('Blocked (unsupported) claims', (s) => pct(s.blockedRate)));
  lines.push(row('Source grounding (claims citing only real facts)', (s) => pct(s.groundingRate)));
  lines.push(row('Output in the requested language', (s) => pct(s.languageMatch)));
  lines.push(row('Explanation completeness (4 required parts)', (s) => pct(s.explainCompleteness)));
  lines.push(row('Letter coverage (REDRESS requests included)', (s) => pct(s.letterCoverage)));
  lines.push(row('Translation success (non-English notices)', (s) => pct(s.translationSuccess)));
  lines.push(row('Automation status correct after translation', (s) => pct(s.statusAgreementTranslated)));
  lines.push(row('Median latency per task', (s) => sec(s.medianMs)));
  lines.push(row('90th percentile latency per task', (s) => sec(s.p90Ms)));
  lines.push(row('Mean completion tokens per case', (s) => (s.meanTokensPerCase === null ? '—' : String(Math.round(s.meanTokensPerCase)))));
  lines.push('');

  lines.push('## By task');
  lines.push('');
  for (const task of ['explain', 'letter', 'answer']) {
    lines.push(`**${task}**`);
    lines.push('');
    lines.push(header);
    lines.push(row('Success', (s) => pct(s.byTask[task].success)));
    lines.push(row('Claims', (s) => String(s.byTask[task].claims)));
    lines.push(row('Verified', (s) => pct(s.byTask[task].verifiedRate)));
    lines.push(row('Blocked', (s) => pct(s.byTask[task].blockedRate)));
    lines.push(row('Median latency', (s) => sec(s.byTask[task].medianMs)));
    lines.push('');
  }

  lines.push('## By notice language');
  lines.push('');
  for (const language of ['en', 'de', 'fr', 'it']) {
    lines.push(`**${language}**`);
    lines.push('');
    lines.push(header);
    lines.push(row('Task success', (s) => pct(s.byLanguage[language].success)));
    lines.push(row('Verified', (s) => pct(s.byLanguage[language].verifiedRate)));
    lines.push(row('Output in requested language', (s) => pct(s.byLanguage[language].languageMatch)));
    lines.push('');
  }

  lines.push('## Why claims were blocked');
  lines.push('');
  const cats = [...new Set(stats.flatMap((s) => Object.keys(s.blockCategories)))].sort();
  if (cats.length === 0) {
    lines.push('No claims were blocked.');
  } else {
    lines.push(header.replace('Metric', 'Reason (count; a claim can have several)'));
    for (const c of cats) lines.push(row(c, (s) => String(s.blockCategories[c] ?? 0)));
  }
  lines.push('');

  const mismatches = file.results.filter((r) => !r.statusMatch);
  lines.push('## Automation-status mismatches');
  lines.push('');
  if (mismatches.length === 0) lines.push('None.');
  for (const r of mismatches) {
    lines.push(
      `- \`${r.model}\` run ${r.run}, \`${r.caseId}\`: expected ${r.expectedStatus}, got ${r.status}${r.translation && !r.translation.ok ? ` (translation failed: ${r.translation.error})` : ''}`,
    );
  }
  lines.push('');

  const fallbacks = file.results.flatMap((r) => r.tasks.filter((t) => !t.ok).map((t) => ({ r, t })));
  lines.push('## Fallbacks (model output not usable)');
  lines.push('');
  if (fallbacks.length === 0) lines.push('None.');
  for (const { r, t } of fallbacks) lines.push(`- \`${r.model}\` run ${r.run}, \`${r.caseId}\` ${t.task}: ${t.fallbackReason}`);
  lines.push('');
  return lines.join('\n');
}
