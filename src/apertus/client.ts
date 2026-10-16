// ============================================================================
// REDRESS × Apertus — client
//
// HttpApertusClient talks to the REDRESS server proxy (server/apertus-proxy.mjs),
// which forwards to any OpenAI-compatible chat-completions endpoint serving
// Apertus (hosted, Hugging Face, or self-hosted vLLM / Ollama). Swapping the
// endpoint is a server-side environment change only.
// ============================================================================

import type { ApertusClient, ChatMessage, CompletionOptions } from './types';
import { APERTUS_CONFIG, type ApertusMode } from './config';
import { MockApertusClient } from './mockClient';
import { ApertusUnavailableError } from './errors';

export { ApertusUnavailableError };

export class HttpApertusClient implements ApertusClient {
  readonly kind = 'apertus' as const;
  label = 'Apertus';

  constructor(
    private readonly basePath: string = APERTUS_CONFIG.proxyPath,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {}

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? APERTUS_CONFIG.timeoutMs);
    try {
      const res = await this.fetchImpl(`${this.basePath}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 1500,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new ApertusUnavailableError(`Apertus proxy returned HTTP ${res.status}`);
      const data = (await res.json()) as { content?: unknown; model?: unknown };
      if (typeof data.content !== 'string' || data.content.trim() === '') {
        throw new ApertusUnavailableError('Apertus returned an empty response');
      }
      if (typeof data.model === 'string' && data.model) this.label = `Apertus (${data.model})`;
      return data.content;
    } catch (err) {
      if (err instanceof ApertusUnavailableError) throw err;
      const reason = err instanceof Error && err.name === 'AbortError' ? 'timed out' : 'could not be reached';
      throw new ApertusUnavailableError(`Apertus ${reason}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** The client for the configured mode, or null when language-model features are off. */
export function createApertusClient(mode: ApertusMode = APERTUS_CONFIG.mode): ApertusClient | null {
  if (mode === 'off') return null;
  if (mode === 'apertus') return new HttpApertusClient();
  return new MockApertusClient({ demonstrateBlocking: APERTUS_CONFIG.mockDemonstrateBlocking });
}
