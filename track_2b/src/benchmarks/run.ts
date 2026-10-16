// ============================================================================
// REDRESS × Apertus benchmark — runner
//
//   npm run benchmark:apertus                  (both Apertus 1.5 models, 1 run)
//   npm run benchmark:apertus -- --runs 2 --concurrency 4
//   npm run benchmark:apertus -- --models swiss-ai/Apertus-v1.5-8B --cases de-
//
// Calls the OpenAI-compatible endpoint directly (APERTUS_BASE_URL, default the
// Hack Apertus CSCS endpoint) with the same inputs and the same REDRESS
// pipeline the app uses: translation (non-English notices) → deterministic
// analysis → explanation, letter and free-form answer → Receipts.
//
// Writes the raw per-case results (every sentence, verdict and reason) and a
// Markdown summary to data/benchmark_results/. The API key is read from
// APERTUS_API_KEY if set (or injected by the environment) and is never
// written to disk or logs.
// ============================================================================

import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { analyzeNotice, generateGrounded, translateNotice } from '@/apertus/pipeline';
import { buildFactSheet, letterRequestsFromBody } from '@/apertus/factSheet';
import { generateChallengeLetter } from '@/lib/challengeGenerator';
import type { ApertusClient, ChatMessage, CompletionOptions, GroundedOutput } from '@/apertus/types';
import type { GenerationTask } from '@/apertus/prompts';
import { CASES, type BenchmarkCase } from './fixtures/cases';
import {
  categorizeReason,
  claims,
  explainCompleteness,
  groundingRate,
  languageMatches,
  letterCoverage,
} from './metrics';
import { renderSummary, type BenchmarkFile, type CaseResult, type TaskResult } from './summary';

const DEFAULT_MODELS = ['swiss-ai/Apertus-v1.5-8B', 'swiss-ai/Apertus-v1.5-70B'];
const BASE_URL = (process.env.LLM_BASE_URL || process.env.APERTUS_BASE_URL || 'https://api.inference.cscs.ch/v1').replace(/\/+$/, '');
const API_KEY = process.env.LLM_API_KEY || process.env.APERTUS_API_KEY;
const CALL_TIMEOUT_MS = 120_000;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Talks to the endpoint directly for one fixed model, recording latency and token usage. */
class BenchmarkClient implements ApertusClient {
  readonly kind = 'apertus' as const;
  readonly label: string;
  calls: { ms: number; ok: boolean; completionTokens?: number }[] = [];
  /** The last raw response, kept so fallbacks can be inspected in the results file. */
  lastContent = '';

  constructor(readonly model: string) {
    this.label = `Apertus (${model})`;
  }

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<string> {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
        },
        body: JSON.stringify({ model: this.model, messages, temperature: options.temperature ?? 0.2, max_tokens: options.maxTokens ?? 1500 }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[]; usage?: { completion_tokens?: number } };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new Error('empty response');
      this.calls.push({ ms: Date.now() - started, ok: true, completionTokens: data.usage?.completion_tokens });
      this.lastContent = content;
      return content;
    } catch (err) {
      this.calls.push({ ms: Date.now() - started, ok: false });
      throw err instanceof Error && err.name === 'AbortError' ? new Error('timed out') : err;
    } finally {
      clearTimeout(timer);
    }
  }
}

function taskResult(
  task: GenerationTask,
  out: GroundedOutput,
  ms: number,
  c: BenchmarkCase,
  sheet: ReturnType<typeof buildFactSheet>,
  rawContent: string,
): TaskResult {
  const ok = out.producedBy !== 'rule_based_fallback';
  const blockCategories: Record<string, number> = {};
  for (const s of out.sentences.filter((x) => x.verdict === 'blocked')) {
    for (const r of s.reasons) {
      const cat = categorizeReason(r);
      blockCategories[cat] = (blockCategories[cat] ?? 0) + 1;
    }
  }
  return {
    task,
    ok,
    parseQuality: out.parseQuality,
    fallbackReason: out.fallbackReason,
    rawResponseOnFallback: ok ? undefined : rawContent.slice(0, 4000),
    ms,
    claims: ok ? claims(out.sentences).length : 0,
    verified: ok ? out.summary.verified : 0,
    blocked: ok ? out.summary.blocked : 0,
    groundingRate: ok ? groundingRate(out.sentences) : null,
    blockCategories,
    languageMatch: ok ? languageMatches(out.sentences, c.language) : null,
    completeness: ok ? (task === 'explain' ? explainCompleteness(out.sentences, sheet) : task === 'letter' ? letterCoverage(out.sentences, sheet) : null) : null,
    sentences: out.sentences.map((s) => ({ text: s.text, verdict: s.verdict, cites: s.cites, framing: s.framing === true, reasons: s.reasons })),
  };
}

async function runCase(model: string, c: BenchmarkCase, run: number): Promise<CaseResult> {
  const client = new BenchmarkClient(model);
  let translation: CaseResult['translation'] = null;
  let tr = null;
  if (c.language !== 'en') {
    const t0 = Date.now();
    try {
      tr = await translateNotice(client, c.notice);
      translation = { ok: true, ms: Date.now() - t0, droppedSentences: tr?.droppedSentences ?? 0, parseQuality: tr?.parseQuality };
    } catch (err) {
      translation = { ok: false, ms: Date.now() - t0, droppedSentences: 0, error: (err as Error).message };
    }
  }
  const { extracted, automation } = analyzeNotice(c.notice, tr);
  const letter = generateChallengeLetter({ extracted, automation, jurisdiction: c.jurisdiction, userName: 'Test User', caseId: 'RP-BENCH' }).body;
  const sheet = buildFactSheet({ extracted, automation, jurisdiction: c.jurisdiction, letterRequests: letterRequestsFromBody(letter) });

  const tasks: TaskResult[] = [];
  for (const task of ['explain', 'letter', 'answer'] as GenerationTask[]) {
    const t0 = Date.now();
    client.lastContent = '';
    const out = await generateGrounded({
      client,
      task,
      language: c.language,
      sheet,
      extracted,
      automation,
      jurisdiction: c.jurisdiction,
      ruleBasedLetter: letter,
      userName: 'Test User',
      question: task === 'answer' ? c.question : undefined,
    });
    tasks.push(taskResult(task, out, Date.now() - t0, c, sheet, client.lastContent));
  }

  return {
    model,
    run,
    caseId: c.id,
    language: c.language,
    jurisdiction: c.jurisdiction,
    expectedStatus: c.expectedStatus,
    status: automation.status,
    statusMatch: automation.status === c.expectedStatus,
    translation,
    tasks,
    calls: client.calls.length,
    failedCalls: client.calls.filter((x) => !x.ok).length,
    completionTokens: client.calls.reduce((a, x) => a + (x.completionTokens ?? 0), 0),
  };
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function main() {
  const models = (arg('models') ?? DEFAULT_MODELS.join(',')).split(',').map((m) => m.trim()).filter(Boolean);
  const runs = Number(arg('runs') ?? 1);
  const concurrency = Number(arg('concurrency') ?? 4);
  const filter = arg('cases');
  const cases = CASES.filter((c) => !filter || c.id.startsWith(filter));

  let commit = 'unknown';
  try {
    commit = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    // not a git checkout
  }

  console.log(`REDRESS benchmark: ${cases.length} cases × ${models.length} models × ${runs} run(s), concurrency ${concurrency}`);
  const started = new Date();
  const results: CaseResult[] = [];
  for (const model of models) {
    for (let run = 1; run <= runs; run++) {
      const t0 = Date.now();
      const r = await pool(cases, concurrency, async (c) => {
        const res = await runCase(model, c, run);
        const t = res.tasks.map((x) => `${x.task}:${x.ok ? `${x.verified}/${x.claims}` : 'FALLBACK'}`).join(' ');
        console.log(`  ${model} run ${run} ${c.id} status=${res.statusMatch ? 'ok' : 'MISMATCH'} ${t}`);
        return res;
      });
      results.push(...r);
      console.log(`${model} run ${run} done in ${Math.round((Date.now() - t0) / 1000)}s`);
    }
  }

  const file: BenchmarkFile = {
    meta: {
      startedAt: started.toISOString(),
      finishedAt: new Date().toISOString(),
      endpointHost: new URL(BASE_URL).host,
      models,
      runs,
      cases: cases.length,
      commit,
      settings: 'translation temperature 0, generation temperature 0.2, max_tokens 3000 (translation) / 2000 (generation), per-call timeout 120 s',
    },
    results,
  };

  const dir = join(process.cwd(), '..', 'data', 'benchmark_results');
  mkdirSync(dir, { recursive: true });
  const stamp = started.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  writeFileSync(join(dir, `${stamp}.json`), JSON.stringify(file, null, 1));
  const summary = renderSummary(file);
  writeFileSync(join(dir, `${stamp}-summary.md`), summary);
  writeFileSync(join(dir, 'latest-summary.md'), summary);
  console.log(`\nWrote data/benchmark_results/${stamp}.json and ${stamp}-summary.md\n`);
  console.log(summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
