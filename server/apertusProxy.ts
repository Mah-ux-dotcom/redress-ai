// ============================================================================
// REDRESS — Apertus proxy (server side, Vite dev + preview)
//
// The browser never talks to the CSCS inference API directly and never sees
// the API key. It POSTs an OpenAI-style `{ messages }` body to
// `/api/apertus/chat`; this middleware pins the model, caps the output size,
// attaches the key from the server environment and forwards the request to
// `${APERTUS_BASE_URL}/chat/completions`.
//
// Environment (read from the shell or a non-VITE_ entry in .env.local):
//   APERTUS_API_KEY   bearer token for the CSCS endpoint (optional when an
//                     egress proxy injects it)
//   APERTUS_BASE_URL  defaults to https://api.inference.cscs.ch/v1
//   APERTUS_MODEL     defaults to swiss-ai/Apertus-v1.5-70B
// ============================================================================

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

export const APERTUS_ROUTE = '/api/apertus/chat';
export const DEFAULT_APERTUS_BASE_URL = 'https://api.inference.cscs.ch/v1';
export const DEFAULT_APERTUS_MODEL = 'swiss-ai/Apertus-v1.5-70B';

const MAX_BODY_BYTES = 64 * 1024;
const MAX_TOKENS = 800;
const UPSTREAM_TIMEOUT_MS = 30_000;

export interface ApertusProxyConfig {
  apiKey?: string;
  baseUrl: string;
  model: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function readApertusConfig(env: Record<string, string | undefined>): ApertusProxyConfig {
  return {
    apiKey: env.APERTUS_API_KEY || undefined,
    baseUrl: (env.APERTUS_BASE_URL || DEFAULT_APERTUS_BASE_URL).replace(/\/+$/, ''),
    model: env.APERTUS_MODEL || DEFAULT_APERTUS_MODEL,
  };
}

/** Validates the client body and builds the upstream request body. Returns an error string on bad input. */
export function buildUpstreamBody(raw: unknown, config: ApertusProxyConfig): Record<string, unknown> | string {
  if (!raw || typeof raw !== 'object') return 'Body must be a JSON object.';
  const { messages, temperature } = raw as { messages?: unknown; temperature?: unknown };
  if (!Array.isArray(messages) || messages.length === 0) return '`messages` must be a non-empty array.';
  const clean: ChatMessage[] = [];
  for (const m of messages) {
    if (
      !m ||
      typeof m !== 'object' ||
      !['system', 'user', 'assistant'].includes((m as ChatMessage).role) ||
      typeof (m as ChatMessage).content !== 'string'
    ) {
      return 'Each message needs a role (system/user/assistant) and string content.';
    }
    clean.push({ role: (m as ChatMessage).role, content: (m as ChatMessage).content });
  }
  return {
    model: config.model,
    messages: clean,
    max_tokens: MAX_TOKENS,
    temperature: typeof temperature === 'number' ? Math.min(Math.max(temperature, 0), 1) : 0.2,
    stream: false,
  };
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error('too_large');
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function createApertusHandler(config: ApertusProxyConfig) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(await readBody(req));
    } catch (err) {
      const tooLarge = err instanceof Error && err.message === 'too_large';
      return sendJson(res, tooLarge ? 413 : 400, { error: tooLarge ? 'Request too large' : 'Invalid JSON' });
    }

    const body = buildUpstreamBody(parsed, config);
    if (typeof body === 'string') return sendJson(res, 400, { error: body });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

    try {
      const upstream = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
      const text = await upstream.text();
      if (!upstream.ok) {
        return sendJson(res, 502, { error: `Apertus upstream returned ${upstream.status}`, detail: text.slice(0, 500) });
      }
      const data = JSON.parse(text) as {
        model?: string;
        choices?: { message?: { content?: string | null }; finish_reason?: string }[];
      };
      const choice = data.choices?.[0];
      return sendJson(res, 200, {
        model: data.model ?? config.model,
        content: choice?.message?.content ?? '',
        finishReason: choice?.finish_reason ?? null,
      });
    } catch (err) {
      return sendJson(res, 502, { error: 'Apertus request failed', detail: err instanceof Error ? err.message : String(err) });
    }
  };
}

/** Vite plugin mounting the Apertus proxy on the dev and preview servers. */
export function apertusProxy(env: Record<string, string | undefined>): Plugin {
  const handler = createApertusHandler(readApertusConfig(env));
  return {
    name: 'redress-apertus-proxy',
    configureServer(server) {
      server.middlewares.use(APERTUS_ROUTE, handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(APERTUS_ROUTE, handler);
    },
  };
}
