# REDRESS × Apertus — language layer and Receipts

## What Apertus does (and does not do)

The deterministic REDRESS engine remains the **source of truth**. It decides:

- the facts extracted from the decision (organisation, outcome, date, reason, references)
- the automation status and the role of automation, with verbatim evidence quotes
- which legal references are shown, with their conditions and limits
- the questions in the rule-based challenge letter

Apertus is used only as a **language layer**:

1. **Translate** a non-English notice (German, French, Italian) into English so the engine can analyse it.
2. **Explain** the result in the user's language (English, German, French, Italian).
3. **Draft** the challenge letter in another language.

## Receipts

Every sentence Apertus writes must cite the IDs of the facts it relies on (`D*` decision facts, `E*` evidence, `G*` what is not established, `S*` next steps, `L*` legal references, `Q*` letter requests). `src/apertus/receipts.ts` then checks each sentence deterministically:

| Check | Blocks a sentence that… |
|---|---|
| Citations | cites nothing, or cites IDs that do not exist |
| Numbers | contains a number not present in the cited facts (invented deadlines, amounts, articles) |
| Quotes | quotes text that does not appear in the cited evidence |
| Law | names a statute or article not in a cited legal reference for the selected jurisdiction |
| Automation | says automation or AI was used without citing evidence of it |
| Solely automated | claims a solely automated decision the engine did not establish |
| Overclaims | states a legal conclusion or guarantee ("unlawful", "rechtswidrig", "illégal", "illegittimo"…) |

Verified sentences are shown in green and can be clicked to see their sources. For evidence, the exact sentence is highlighted in the original notice. Blocked sentences are struck through, with the reason.

**Limits:** Receipts checks facts, numbers, quotes, law and automation claims. It cannot judge tone or every nuance of meaning.

## Translation safeguards

- The model must copy each source sentence verbatim. Pairs whose source is not in the original notice are discarded.
- Every automation or human signal the engine finds in the English translation must have matching wording in the **original** sentence. Evidence that exists only in the translation is shown but **not counted**, so a translation cannot "add" automation.

## Fallback

If the model is unavailable, times out or returns something unusable, REDRESS shows its own rule-based output instead, with a notice explaining why. If translation fails, the original text is analysed directly, with a warning.

## Modes

Set `VITE_APERTUS_MODE` (see `.env.example`):

| Mode | What happens |
|---|---|
| `mock` (default) | In-browser **stand-in model**, labelled "Stand-in model (mock — not Apertus)". Nothing leaves the browser. It can only translate the built-in demo notices. By default it adds deliberately unsupported sentences so you can see Receipts block them (`VITE_APERTUS_MOCK_HALLUCINATE=false` turns that off). |
| `apertus` | Real Apertus via the REDRESS proxy. |
| `off` | No language model; rule-based REDRESS only. |

## Plugging in the real Apertus endpoint

The proxy (`server/apertus-proxy.mjs`) works with any **OpenAI-compatible** chat-completions endpoint: a hosted endpoint, Hugging Face, or a self-hosted vLLM or Ollama server. The API key stays on the server; the browser only calls `/api/apertus/*`.

1. Copy `.env.example` to `.env` (never commit `.env`) and fill in:
   ```
   VITE_APERTUS_MODE=apertus
   APERTUS_BASE_URL=https://<endpoint>/v1
   APERTUS_API_KEY=<key>
   APERTUS_MODEL=<model name, e.g. the 8B or 70B Apertus model id>
   ```
2. Run the proxy: `npm run proxy`
3. Run the app: `npm run dev` (Vite forwards `/api` to the proxy)
4. Check: `curl localhost:5173/api/apertus/health` should report `"configured": true`.

Switching between the 8B and 70B models, or to a self-hosted deployment, only changes `APERTUS_BASE_URL` and `APERTUS_MODEL`.

## Code map

| File | Role |
|---|---|
| `src/apertus/factSheet.ts` | Turns the engine's analysis into numbered, citable facts |
| `src/apertus/prompts.ts` | Prompts and defensive JSON parsing |
| `src/apertus/receipts.ts` | The Receipts verifier |
| `src/apertus/pipeline.ts` | Translation, cross-lingual evidence check, generation, fallback |
| `src/apertus/language.ts` | Language detection and multilingual lexicons |
| `src/apertus/client.ts` | HTTP client for the proxy, and mode selection |
| `src/apertus/mockClient.ts` | Stand-in model used until Apertus access is configured |
| `server/apertus-proxy.mjs` | Key-holding proxy to the Apertus endpoint |
| `src/components/ReceiptsView.tsx`, `ApertusPanel.tsx` | UI |
