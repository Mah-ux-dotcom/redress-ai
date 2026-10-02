import { describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { createHandler } from './apertus-proxy.mjs';

async function withServer(handler, fn) {
  const server = http.createServer(handler);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

const chat = (base, body) =>
  fetch(`${base}/api/apertus/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('Apertus proxy', () => {
  it('reports not configured and refuses chat without an endpoint', async () => {
    await withServer(createHandler({}), async (base) => {
      expect(await (await fetch(`${base}/api/apertus/health`)).json()).toEqual({ configured: false, model: null });
      expect((await chat(base, { messages: [{ role: 'user', content: 'x' }] })).status).toBe(503);
    });
  });

  it('forwards to the OpenAI-compatible endpoint with the key, and returns only the content', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ model: 'apertus-70b', choices: [{ message: { content: '{"sentences":[]}' } }] })));
    const handler = createHandler({ baseUrl: 'https://host.example/v1/', apiKey: 'secret-key', model: 'apertus-70b', fetchImpl });
    await withServer(handler, async (base) => {
      const res = await chat(base, { messages: [{ role: 'user', content: 'hello' }], temperature: 5, max_tokens: 99999 });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ content: '{"sentences":[]}', model: 'apertus-70b' });
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://host.example/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer secret-key');
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe('apertus-70b');
    expect(sent.temperature).toBe(1); // clamped
    expect(sent.max_tokens).toBe(4000); // clamped
  });

  it('rejects invalid messages and never leaks upstream error bodies', async () => {
    const fetchImpl = vi.fn(async () => new Response('account 1234 over quota, key secret-key', { status: 429 }));
    const handler = createHandler({ baseUrl: 'https://host.example/v1', apiKey: 'secret-key', model: 'm', fetchImpl });
    await withServer(handler, async (base) => {
      expect((await chat(base, { messages: [{ role: 'hacker', content: 'x' }] })).status).toBe(400);
      const res = await chat(base, { messages: [{ role: 'user', content: 'x' }] });
      expect(res.status).toBe(502);
      const text = await res.text();
      expect(text).not.toMatch(/secret-key|1234/);
    });
  });
});
