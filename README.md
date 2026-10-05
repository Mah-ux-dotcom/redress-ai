# redress-ai

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-pxamsb9p)

## Apertus (Explain It To Me)

Questions in **Explain It To Me** that match a suggested topic are answered deterministically. Any other question is sent to [Apertus](https://www.swiss-ai.org/apertus), the open Swiss LLM hosted at CSCS. Apertus only gets the extracted decision data, the automation analysis and the selected jurisdiction's reference material, and is told to answer from that alone. If Apertus can't be reached, the fixed help text is shown instead.

The browser calls `/api/apertus/chat`, a Vite dev/preview middleware (`server/apertusProxy.ts`). The middleware fixes the model, caps output at 800 tokens and adds the API key on the server, so the key never ends up in the client bundle.

```bash
cp .env.example .env.local   # set APERTUS_API_KEY (no VITE_ prefix)
npm run dev
```

Behind an HTTP(S) egress proxy, start Node with `NODE_USE_ENV_PROXY=1` so the middleware's `fetch` uses `HTTPS_PROXY`. A static deploy (e.g. Bolt hosting) has no middleware: there the route returns 404 and the app uses the fallback text. Production needs an equivalent serverless function at the same path.
