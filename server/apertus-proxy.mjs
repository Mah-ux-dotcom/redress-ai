// ============================================================================
// REDRESS — Apertus proxy (Node, no dependencies)
//
// Keeps the Apertus API key on the server. The browser only ever talks to
// /api/apertus/*. Works with any OpenAI-compatible chat-completions endpoint
// serving Apertus: a hosted endpoint, Hugging Face, or self-hosted vLLM/Ollama.
//
// Configure via environment variables or a .env file in the project root:
//   APERTUS_API_KEY    the access key (optional for local servers, or when the
//                      environment injects the credential for the endpoint host)
//   APERTUS_BASE_URL   default https://api.inference.cscs.ch/v1 (the Hack Apertus
//                      CSCS endpoint); any OpenAI-compatible /v1 address works
//   APERTUS_MODEL      optional; if unset, the proxy asks the endpoint's /models
//                      list and picks an Apertus model
//   APERTUS_PROXY_PORT default 8787
//
// Run: npm run proxy   (Vite's dev server forwards /api to it)
// ============================================================================

import http from 'node:http';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const DEFAULT_BASE_URL = 'https://api.inference.cscs.ch/v1';

const MAX_BODY_BYTES = 1_000_000;

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('too_large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function validMessages(messages) {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= 20 &&
    messages.every(
      (m) => m && ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length <= 200_000,
    )
  );
}

/** Choose an Apertus model from an OpenAI-style /models list (instruct variants first). */
export function pickApertusModel(ids) {
  const apertus = ids.filter((id) => /apertus/i.test(id));
  const pool = apertus.length ? apertus : ids;
  return pool.find((id) => /instruct/i.test(id)) ?? pool[0] ?? null;
}

/** Build the request handler. Exported for tests. */
export function createHandler({ baseUrl, apiKey, model, fetchImpl = fetch } = {}) {
  const configured = Boolean(baseUrl);
  const root = (baseUrl ?? '').replace(/\/+$/, '');
  const authHeaders = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  let resolvedModel = model || null;

  /** The configured model, or one discovered from the endpoint's /models list. */
  async function resolveModel() {
    if (resolvedModel) return resolvedModel;
    const res = await fetchImpl(`${root}/models`, { headers: authHeaders });
    if (!res.ok) throw new Error(`model list returned HTTP ${res.status}`);
    const data = await res.json();
    const ids = Array.isArray(data?.data) ? data.data.map((m) => m?.id).filter((id) => typeof id === 'string') : [];
    resolvedModel = pickApertusModel(ids);
    if (!resolvedModel) throw new Error('model list is empty');
    return resolvedModel;
  }

  return async function handler(req, res) {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/api/apertus/health') {
      if (!configured) return sendJson(res, 200, { configured: false, model: null });
      try {
        return sendJson(res, 200, { configured: true, model: await resolveModel() });
      } catch (err) {
        return sendJson(res, 200, { configured: true, model: null, error: `Could not reach the Apertus endpoint (${err?.message ?? 'unknown error'})` });
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/apertus/chat') {
      if (!configured) return sendJson(res, 503, { error: 'Apertus is not configured on the server' });

      let payload;
      try {
        payload = JSON.parse(await readBody(req));
      } catch (err) {
        return sendJson(res, err?.message === 'too_large' ? 413 : 400, { error: 'Invalid request body' });
      }
      if (!validMessages(payload?.messages)) return sendJson(res, 400, { error: 'Invalid messages' });

      const temperature = Math.min(Math.max(Number(payload.temperature ?? 0.2), 0), 1);
      const maxTokens = Math.min(Math.max(Number(payload.max_tokens ?? 1500), 1), 4000);

      try {
        const chosenModel = await resolveModel();
        const upstream = await fetchImpl(`${root}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ model: chosenModel, messages: payload.messages, temperature, max_tokens: maxTokens }),
        });
        if (!upstream.ok) {
          // Never echo upstream bodies: they can contain account details.
          return sendJson(res, 502, { error: `Apertus endpoint returned HTTP ${upstream.status}` });
        }
        const data = await upstream.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== 'string') return sendJson(res, 502, { error: 'Apertus returned no content' });
        return sendJson(res, 200, { content, model: data?.model ?? chosenModel });
      } catch {
        return sendJson(res, 502, { error: 'Apertus endpoint could not be reached' });
      }
    }

    return sendJson(res, 404, { error: 'Not found' });
  };
}

// Start the server only when run directly (not when imported by tests).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const behindProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (behindProxy && !process.env.NODE_USE_ENV_PROXY) {
    // Node's built-in fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY=1 is set
    // at startup (Node >= 22.21). Re-launch with it so outbound calls use the proxy.
    const child = spawn(process.execPath, process.argv.slice(1), {
      env: { ...process.env, NODE_USE_ENV_PROXY: '1' },
      stdio: 'inherit',
    });
    child.on('exit', (code) => process.exit(code ?? 0));
  } else {
    try {
      process.loadEnvFile?.();
    } catch {
      // no .env file — environment variables only
    }
    const port = Number(process.env.APERTUS_PROXY_PORT ?? 8787);
    const baseUrl = process.env.APERTUS_BASE_URL || DEFAULT_BASE_URL;
    const handler = createHandler({
      baseUrl,
      apiKey: process.env.APERTUS_API_KEY,
      model: process.env.APERTUS_MODEL,
    });
    http.createServer(handler).listen(port, '127.0.0.1', () => {
      const model = process.env.APERTUS_MODEL || 'auto (from the endpoint\'s model list)';
      const key = process.env.APERTUS_API_KEY ? 'set' : 'not set (relying on the environment to supply it)';
      console.log(`REDRESS Apertus proxy on http://127.0.0.1:${port} — endpoint ${baseUrl}, model ${model}, key ${key}`);
    });
  }
}
