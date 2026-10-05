// ============================================================================
// REDRESS — Apertus integration tests (proxy validation, grounding, fallback)
// ============================================================================

import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeAutomation, extractDecision } from '@/lib/analyze';
import { buildApertusMessages, buildGroundingContext, toPlainText } from '@/ai/apertusClient';
import { explain, explainWithApertus } from '@/ai/explainEngine';
import { DEMO_CASE } from '@/data/demoCase';
import { buildUpstreamBody, readApertusConfig, DEFAULT_APERTUS_MODEL } from '../../server/apertusProxy';

const extracted = extractDecision(DEMO_CASE.decisionText);
const automation = analyzeAutomation(extracted);
const FREE_FORM = 'Can I ask them to delete my application?';

const mockFetch = (impl: (...args: unknown[]) => Promise<unknown>) => {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Apertus proxy', () => {
  const config = readApertusConfig({});

  it('defaults to the CSCS endpoint and Apertus model', () => {
    expect(config.baseUrl).toBe('https://api.inference.cscs.ch/v1');
    expect(config.model).toBe(DEFAULT_APERTUS_MODEL);
    expect(config.apiKey).toBeUndefined();
  });

  it('pins the model and caps tokens regardless of client input', () => {
    const body = buildUpstreamBody(
      { model: 'something-else', max_tokens: 100000, temperature: 5, messages: [{ role: 'user', content: 'hi' }] },
      config,
    );
    expect(body).toMatchObject({ model: DEFAULT_APERTUS_MODEL, max_tokens: 800, temperature: 1, stream: false });
  });

  it('rejects malformed messages', () => {
    expect(typeof buildUpstreamBody({ messages: [] }, config)).toBe('string');
    expect(typeof buildUpstreamBody({ messages: [{ role: 'tool', content: 'x' }] }, config)).toBe('string');
    expect(typeof buildUpstreamBody(null, config)).toBe('string');
  });
});

describe('Apertus grounding', () => {
  it('includes the extracted decision, automation limits and no laws without a jurisdiction', () => {
    const ctx = buildGroundingContext({ extracted, automation, jurisdiction: null });
    expect(ctx).toContain(extracted.organization!);
    expect(ctx).toContain('What it does NOT establish');
    expect(ctx).toContain('Do not name specific laws');
  });

  it('includes the selected jurisdiction frameworks', () => {
    const ctx = buildGroundingContext({ extracted, automation, jurisdiction: 'UK' });
    expect(ctx).toMatch(/UK GDPR/);
  });

  it('puts the rules in the system message and the question after the context', () => {
    const [system, user] = buildApertusMessages(FREE_FORM, { extracted, automation, jurisdiction: null });
    expect(system.role).toBe('system');
    expect(system.content).toMatch(/Do not invent/);
    expect(user.content.indexOf('CONTEXT')).toBeLessThan(user.content.indexOf(FREE_FORM));
  });
});

describe('toPlainText', () => {
  it('strips markdown emphasis, headings and bullets', () => {
    expect(toPlainText('## Steps\n**Next steps:**\n1.  Ask them\n* Keep records')).toBe('Steps\nNext steps:\n1. Ask them\n\u2022 Keep records');
  });
});

describe('explainWithApertus', () => {
  const params = { question: FREE_FORM, extracted, automation, jurisdiction: null };

  it('answers recognised questions deterministically without calling the model', async () => {
    const fetchFn = mockFetch(async () => ({}));
    const res = await explainWithApertus({ ...params, question: 'What rights do I have?' });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(res).toEqual(explain({ ...params, question: 'What rights do I have?' }));
  });

  it('sends unrecognised questions to Apertus and labels the answer', async () => {
    const fetchFn = mockFetch(async () => ({
      ok: true,
      json: async () => ({ model: 'swiss-ai/Apertus-v1.5-70B', content: 'You can ask them.' }),
    }));
    const res = await explainWithApertus(params);
    expect(fetchFn).toHaveBeenCalledWith('/api/apertus/chat', expect.objectContaining({ method: 'POST' }));
    expect(res.answer).toBe('You can ask them.');
    expect(res.sources.join(' ')).toMatch(/Apertus/);
    expect(res.caveats[0]).toMatch(/AI-generated/);
  });

  it('falls back to the fixed response when the proxy fails', async () => {
    mockFetch(async () => ({ ok: false, status: 502, json: async () => ({}) }));
    expect(await explainWithApertus(params)).toEqual(explain(params));
  });

  it('falls back on network errors and empty answers', async () => {
    mockFetch(async () => {
      throw new TypeError('network');
    });
    expect(await explainWithApertus(params)).toEqual(explain(params));
    mockFetch(async () => ({ ok: true, json: async () => ({ content: '  ' }) }));
    expect(await explainWithApertus(params)).toEqual(explain(params));
  });

  it('skips the model when VITE_APERTUS_ENABLED=false', async () => {
    vi.stubEnv('VITE_APERTUS_ENABLED', 'false');
    const fetchFn = mockFetch(async () => ({}));
    expect(await explainWithApertus(params)).toEqual(explain(params));
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
