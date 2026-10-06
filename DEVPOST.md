# REDRESS — Devpost draft

**Track:** 2B · Apertus Adoption: Own Project

## Project name
REDRESS

## Elevator pitch
When an AI makes a decision about you, know what to do next. REDRESS explains automated decisions and drafts challenge letters in your language with Apertus, and every sentence the model writes is checked against the evidence before you see it.

## The problem
Loans, insurance, housing, jobs and platform accounts are increasingly decided or pre-screened by automated systems. People get short letters that rarely say whether a person or a system decided, why, or what they can do. Generic chatbots fill that gap with confident inventions: rights that don't apply, deadlines that don't exist, "this is illegal". For someone challenging a decision, that is worse than no help. And in Switzerland, the letter may not be in your first language.

## The solution
REDRESS separates **deciding** from **writing**:
- A **deterministic engine** extracts the facts from the notice, classifies whether automation was involved (*confirmed*, *possibly / AI-assisted*, *not established*, *human decision indicated*) with verbatim evidence quotes, lists what the evidence does **not** establish, and selects legal references with their conditions and limits (UK, EU, Switzerland, US, or general guidance).
- **Apertus 1.5** does the language work: it translates German, French and Italian notices, explains the result, drafts the challenge letter, and answers free-form questions, in the user's language.
- **Receipts** checks every sentence Apertus writes before it is shown.

## How it works
1. The user pastes a notice in English, German, French or Italian.
2. Non-English notices are translated by Apertus sentence by sentence. A translation is only kept if its source text appears in the original, and evidence of automation only counts if matching wording exists in the original language.
3. The engine builds a numbered fact sheet: decision facts, evidence quotes, gaps, next steps, legal references and letter requests.
4. Apertus writes, and must cite fact IDs for every sentence.
5. Receipts verifies each sentence deterministically. It blocks fabricated citations, numbers that aren't in the sources, quotes that aren't verbatim, laws not in a cited reference for the selected jurisdiction, unsupported claims that automation was used or that a person decided, unestablished "solely automated" claims, and legal conclusions, in all four languages.
6. The user sees verified sentences with a shield (click to see the source, highlighted in the original notice) and blocked sentences struck through with the reason.

## Apertus integration
- Real Apertus 1.5 (8B and 70B) via the Hack Apertus CSCS inference endpoint, through a small proxy that keeps the API key server-side.
- The proxy accepts any OpenAI-compatible endpoint, so self-hosting Apertus is a configuration change.
- It automatically selects Apertus 1.5 (non-"thinking", 70B) from the endpoint's model list.
- A rule-based fallback is used if the model is slow, down or returns unusable output.

## Why Apertus
- **Multilingual.** Trained on more than 1,800 languages; REDRESS needs German, French and Italian.
- **Open.** Weights, data and code are open, so a service handling people's decision letters can run on infrastructure it controls.
- **Two sizes.** The 8B and 70B models give a real cost/quality choice, which we measured (below).

## The innovation: Receipts
Most AI legal tools ask you to trust the model. REDRESS shows its work: every claim links to its source, and unsupported claims are visibly blocked. In our first live tests, Apertus 1.5 70B was mostly accurate, but it also cited fact IDs that did not exist. Receipts caught those before they reached the user.

## Languages
- **Notices and generated text:** English, German, French and Italian.
- **Interface:** English.

## Legal / jurisdiction support
- **UK:** UK GDPR Art. 22 / 22A–22D, Arts. 13–15, ICO, Financial Ombudsman.
- **EU:** GDPR Art. 22, Arts. 13–15, AI Act (high-risk), Data Protection Authorities.
- **Switzerland:** FADP Art. 21 and Art. 25, FDPIC.
- **US:** FCRA, ECOA / Regulation B, state laws.
- **General:** procedural guidance only.

Every reference states when it applies, its limits, and whether human review is required or merely requestable. REDRESS is an information tool, not legal advice.

## Testing
- **Automated tests** cover the engine, legal wording, every Receipts check (in four languages), translation safeguards, prompt-injection handling, fallbacks, Switzerland, the proxy and the benchmark machinery.
- **Live checks** run against real Apertus 1.5.

## Benchmark (Apertus 1.5 8B vs 70B)
We built a reproducible benchmark: 20 synthetic notices (5 per language), the exact REDRESS pipeline, the same inputs for both models, and 2 runs each, on the CSCS endpoint. Final run, on the submitted code:

| | Apertus 1.5 8B | Apertus 1.5 70B |
|---|---|---|
| Task success | 96.7% | 100% |
| JSON valid as returned | 53.3% | 100% |
| Claims verified by Receipts | 94.4% | 98.5% |
| Fabricated citations | 11 | 0 |
| Non-English notices translated | 76.7% | 100% |
| Automation status correct after translation | 83.3% | 100% |
| Letter coverage | 80.6% | 100% |
| Output in requested language | 100% | 100% |
| Median latency per task | 2.6 s | 6.2 s |

70B is our default. 8B is about 2.4 times faster, but fragile on structured output and translation, and Receipts blocked all 11 of its fabricated citations. We ran the benchmark five times: each run found something in REDRESS itself (a translation bug, checker false positives, 70B writing French letters in English). We fixed each one and kept every run's results in the repository. Full methodology and limitations: `benchmarks/README.md`.

## Challenges
- **Small-model JSON.** 8B often returned slightly malformed JSON. We added one narrow, documented repair and report separately how often each model needed it.
- **Translation alignment.** One model merged lines and used different line breaks, which silently broke our text replacement until we made matching whitespace-tolerant. The benchmark found this.
- **False alarms in our own checker.** Real model output exposed cases like French "ne… ni…" hedges and numbered letter questions mislabelled as greetings. Each one became a test.
- **Legal accuracy.** Writing rights conditionally ("may apply if…") without making them useless.

## What we learned
- Keeping the language model away from the decisions (facts, status, law) makes the whole system testable.
- A verifier is only as good as its false-positive rate. Running against the real model was essential.
- Smaller models can be fast but are fragile on structured output, and measuring that is more useful than assuming it.

## Future improvements
- An interface translated into German, French and Italian.
- A hosted deployment with the proxy as a serverless function.
- Human evaluation of output quality, and a larger, more realistic test set.
- Cantonal data-protection guidance for decisions by Swiss cantonal authorities.
- OCR for screenshots and PDFs.

## Open source
Apache License 2.0.

## Demo instructions
```bash
npm install
npm run dev     # stand-in model, no credentials needed
# Real Apertus: set APERTUS_API_KEY in .env, then `npm run proxy`, then `VITE_APERTUS_MODE=apertus npm run dev`
```
Try **"NovaCredit Schweiz — Kreditablehnung (Deutsch)"** → Analyze → Switzerland → Explain It To Me → **Explain with Receipts**.
