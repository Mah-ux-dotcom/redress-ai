// ============================================================================
// REDRESS — Apertus proxy (Node, no dependencies)
//
// Keeps the Apertus API key on the server. The browser only ever talks to
// /api/apertus/*. Works with any OpenAI-compatible chat-completions endpoint
// serving Apertus: a hosted endpoint, Hugging Face, or self-hosted vLLM/Ollama.
//
// Configure via environment variables or a .env file in the project root:
//   APERTUS_BASE_URL   e.g. https://example-host/v1   (no trailing /chat/completions)
//   APERTUS_API_KEY    the access key (optional for local servers)
//   APERTUS_MODEL      the model name the endpoint expects
//   APERTUS_PROXY_PORT default 8787
//
// Run: npm run proxy   (Vite's dev server forwards /api to it)
// ============================================================================

import http from 'node:http';
import { pathToFileURL } from 'node:url';

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

/** Build the request handler. Exported for tests. */
export function createHandler({ baseUrl, apiKey, model, fetchImpl = fetch } = {}) {
  const configured = Boolean(baseUrl && model);

  return async function handler(req, res) {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (req.method === 'GET' && url.pathname === '/api/apertus/health') {
      return sendJson(res, 200, { configured, model: configured ? model : null });
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
        const upstream = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ model, messages: payload.messages, temperature, max_tokens: maxTokens }),
        });
        if (!upstream.ok) {
          // Never echo upstream bodies: they can contain account details.
          return sendJson(res, 502, { error: `Apertus endpoint returned HTTP ${upstream.status}` });
        }
        const data = await upstream.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content !== 'string') return sendJson(res, 502, { error: 'Apertus returned no content' });
        return sendJson(res, 200, { content, model: data?.model ?? model });
      } catch {
        return sendJson(res, 502, { error: 'Apertus endpoint could not be reached' });
      }
    }

    return sendJson(res, 404, { error: 'Not found' });
  };
}

// Start the server only when run directly (not when imported by tests).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    process.loadEnvFile?.();
  } catch {
    // no .env file — environment variables only
  }
  const port = Number(process.env.APERTUS_PROXY_PORT ?? 8787);
  const handler = createHandler({
    baseUrl: process.env.APERTUS_BASE_URL,
    apiKey: process.env.APERTUS_API_KEY,
    model: process.env.APERTUS_MODEL,
  });
  http.createServer(handler).listen(port, '127.0.0.1', () => {
    const ready = process.env.APERTUS_BASE_URL && process.env.APERTUS_MODEL;
    console.log(`REDRESS Apertus proxy on http://127.0.0.1:${port} — ${ready ? `model ${process.env.APERTUS_MODEL}` : 'NOT CONFIGURED (set APERTUS_BASE_URL and APERTUS_MODEL)'}`);
  });
}
