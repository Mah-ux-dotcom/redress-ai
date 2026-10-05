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

The proxy (`server/apertus-proxy.mjs`) works with any **OpenAI-compatible** chat-completions endpoint. It defaults to the Hack Apertus CSCS endpoint, `https://api.inference.cscs.ch/v1`. The API key stays on the server; the browser only calls `/api/apertus/*`.

1. Provide the key as `APERTUS_API_KEY`, either in `.env` (never commit it) or as an environment variable. If your environment injects the credential for `api.inference.cscs.ch` itself (for example a Claude Code cloud environment "Bearer" credential), leave the variable unset.
2. Optional: set `APERTUS_MODEL` to pin a model, for example the 8B or 70B id. If it is unset, the proxy reads the endpoint's `/models` list and picks an Apertus instruct model.
3. Set `VITE_APERTUS_MODE=apertus`, then run `npm run proxy` and `npm run dev` (Vite forwards `/api` to the proxy).
4. Check: `curl localhost:8787/api/apertus/health` should report `"configured": true` and a model name.

Behind an HTTPS proxy, the proxy relaunches itself with `NODE_USE_ENV_PROXY=1` so that Node's built-in fetch uses it (Node >= 22.21).

## Live check against real Apertus

With the proxy running (`npm run proxy`), `npm run test:live` sends six real cases through the full pipeline (translation, generation, Receipts) and prints every sentence with its verdict. It is skipped in the normal test run.

First live results with `swiss-ai/Apertus-v1.5-70B` on the CSCS endpoint (October 2026):

| Case | Task | Result |
|---|---|---|
| NovaCredit (EN) | explain in English | 9/9 verified |
| NovaCredit (EN) | letter in German | 12/12 verified |
| Job rejection, automation not established | explain in French | 11/11 verified |
| NovaCredit Schweiz (DE notice, translated) | explain in English | 9/9 verified |
| NovaCredit Schweiz (DE notice, translated) | letter in German | 8 verified, 4 blocked: the model cited fact IDs that do not exist |
| Insurance, human decision | explain in Italian | 11/11 verified |

Typical latency is 7–17 seconds per case, including translation where needed. Two issues found live were fixed: a malformed greeting line broke the whole JSON response (valid sentences are now salvaged and the broken one dropped), and lines the model mislabelled as "framing" while citing sources are now checked as content.

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
