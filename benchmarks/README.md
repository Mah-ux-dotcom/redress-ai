# REDRESS × Apertus benchmark: Apertus 1.5 8B vs 70B

A small, reproducible benchmark of the two Apertus 1.5 models on the tasks REDRESS actually gives a language model. It is meant to replace claims like "70B is better" with measurements, and to show where each model fails.

## What is measured

REDRESS uses Apertus only as a **language layer**. A deterministic engine decides the facts, the automation status and the legal references. Apertus:

1. **translates** non-English notices into English so the engine can analyse them;
2. **explains** the result in the user's language;
3. **drafts** the challenge letter in the user's language;
4. **answers** free-form questions.

Every sentence Apertus writes goes through **Receipts** (`src/apertus/receipts.ts`), which blocks unsupported claims. The benchmark runs this exact pipeline: the same code the app runs, the same prompts, and the same inputs for both models.

## Fixtures

`fixtures/cases.ts`: **20 synthetic notices, 5 per language** (English, German, French, Italian). All organisations, people and reference numbers are fictional, and e-mail addresses use the reserved `.example` domain.

| | Confirmed automated | Possibly automated / AI-assisted | Not established | Human decision |
|---|---|---|---|---|
| Cases | 8 (4 of them "solely automated") | 5 | 4 | 3 |

Jurisdictions covered: UK, EU, Switzerland, US and "General / not sure".

Each case has a **hand-labelled expected automation status**. Each non-English case also has a **faithful reference English translation**. A unit test (`src/__tests__/benchmark.test.ts`) checks that the REDRESS engine produces the expected status from each English notice or reference translation. The labels are therefore verified before any model runs, and a status mismatch in the benchmark can only come from the model's translation.

## Metrics (all automated)

| Metric | Definition |
|---|---|
| Task success | Model output could be used (no fallback to REDRESS's rule-based output) |
| JSON valid / repaired / salvaged | How the model's JSON was read: valid as returned; usable only after one narrow, documented repair (a text value not closed before the `cites` key, a frequent small-model error); or salvaged item by item |
| Claims checked | Sentences that make a factual claim (greetings and sign-offs are not counted) |
| Verified / blocked | Share of claims that passed or failed Receipts |
| Why claims were blocked | Receipts' reason, categorised (fabricated citation, unsupported number, unsupported law, unsupported automation or human-decision claim, legal conclusion…) |
| Source grounding | Share of claims that cite only facts that exist (a fabricated citation counts as ungrounded) |
| Output in requested language | Stopword-based language detection on the output, ignoring quoted notice text; an unclear result counts as a mismatch |
| Explanation completeness | Which of the four required parts (what happened, automation evidence, what is not established, next steps) are covered by at least one verified sentence |
| Letter coverage | Share of REDRESS's rule-based letter requests (`Q*` facts) covered by a verified sentence |
| Translation success | Non-English notices translated with at least one sentence that matches the original |
| Automation status correct after translation | REDRESS's status from the model's translation equals the hand label |
| Latency | Wall-clock time per task (median and 90th percentile), including translation where needed |
| Completion tokens | As reported by the endpoint |

## How to run

```bash
npm run benchmark:apertus                       # both Apertus 1.5 models, 20 cases, 1 run
npm run benchmark:apertus -- --runs 2           # repeat to see run-to-run variation
npm run benchmark:apertus -- --cases de-        # only the German cases
npm run benchmark:apertus -- --models swiss-ai/Apertus-v1.5-8B
```

Requirements:
- **Endpoint access.** By default the runner uses `https://api.inference.cscs.ch/v1`; set `APERTUS_BASE_URL` to use another OpenAI-compatible endpoint. The key is read from `APERTUS_API_KEY`, or injected by your environment. It is never written to the results.
- **Proxy behind a firewall.** The npm script sets `NODE_USE_ENV_PROXY=1` so that Node's `fetch` honours `HTTPS_PROXY` (Node ≥ 22.21). On Windows, set that variable separately and run `npx vite-node benchmarks/run.ts`.

## Output files

Results go to `benchmarks/results/`:
- `<timestamp>.json`: every case, task, sentence, verdict, Receipts reason and latency. When a task falls back, the model's raw response is included so the failure can be inspected.
- `<timestamp>-summary.md` and `latest-summary.md`: the tables.

## Results (final run, 5 October 2026)

20 notices × 2 runs per model, same inputs and prompts, on the Hack Apertus CSCS endpoint. Full tables: [`results/latest-summary.md`](results/latest-summary.md). Every sentence and verdict: `benchmarks/results/2026-10-05-12-26.json`. Methodology and limitations: this file.

| Automated measurement | Apertus 1.5 8B | Apertus 1.5 70B |
|---|---|---|
| Task success (output usable, no fallback) | 94.2% | **100%** |
| JSON valid as returned | 38.7% | **99.3%** |
| Claims verified by Receipts | 91.6% (712 claims) | **97.0%** (860 claims) |
| Fabricated citations | 1 | **0** |
| Explanation completeness (4 required parts) | 80.1% | **99.4%** |
| Letter coverage (REDRESS requests included) | 69.3% | **100%** |
| Non-English notices translated | 66.7% | **100%** |
| Automation status correct after translation | 73.3% | **100%** |
| Output in the requested language | **100%** | 96.7% |
| Median latency per task | **2.5 s** | 6.4 s |

What this shows:
- **70B is the right default for REDRESS.** It translated every non-English notice correctly, almost always returned valid structured output, and covered every required part of explanations and letters.
- **8B is about 2.5 times faster, but fragile.** Only 39% of its outputs were valid JSON as returned; most were usable only after a narrow, documented repair. It could not translate 4 of the 15 non-English notices (the same 4 in both runs), and each of those notices was then mis-classified as "not established".
- **8B did better on language.** 70B wrote 4 of its 10 French letters in English (all its other outputs were in the requested language). REDRESS now warns the user when this happens.
- **Receipts mattered for both models.** For 8B it mostly blocked laws and numbers that weren't in the sources, malformed output and one fabricated citation. For 70B it mostly blocked malformed output (citation markup written into the sentence), quotes that weren't verbatim, and unsupported automation or "solely automated" claims.
- **Run-to-run variation was small** for the overall verified rate (8B 91.2% / 91.9%; 70B 96.9% / 97.0%). It is larger for free-form answers, which have few claims per run.

**How the benchmark improved REDRESS.** The first run (`2026-10-05-12-11`, kept unchanged) exposed a real translation bug and several Receipts false positives, for example inline fact IDs being read as numbers and honest "the notice does not say…" sentences being blocked. These were fixed with regression tests. The run was then repeated twice, and all three result files are in `benchmarks/results/`. After the final run, two more German hedge patterns ("wenn", "lässt nicht erkennen") were fixed. They affected 3 of the 70B's 86 free-form answer claims, and the numbers above do not include that fix.

**Not measured:** human ratings of fluency, tone and legal appropriateness. See the limitations in `benchmarks/README.md`.

### Run history

| Run | Results | Checker state |
|---|---|---|
| 1 | `results/2026-10-05-12-11.*` | Original Receipts. Revealed a translation-alignment bug and Receipts false positives (inline fact IDs read as numbers; requests mentioning the automated system; "where applicable" hedges; uncited "the notice does not say…" sentences) |
| 2 | `results/2026-10-05-12-19.*` | After those fixes. Revealed a second JSON-error variant (70B) and law-scope statements ("for automated decisions that…") flagged as automation claims |
| 3 (final) | `results/2026-10-05-12-26.*` | After those fixes |

Every fix is covered by regression tests in `src/__tests__/hardening.test.ts` that use the sentences found in these runs. Fixes that loosen a check are paired with tests showing the genuine errors are still blocked.

## Limitations

- **Small sample.** 20 cases × 2 runs is enough to show clear differences, not small ones. Run-to-run variation is visible in the results; generation uses temperature 0.2.
- **Synthetic notices.** They are short and clearly worded; real notices are longer and messier.
- **Receipts is the yardstick.** "Verified" means a sentence passed REDRESS's deterministic checks (citations, numbers, quotes, law, automation and human-decision claims, legal conclusions). It does not prove the sentence is well written or complete, and Receipts cannot judge tone or every nuance. A model that writes fewer, safer sentences can score a higher verified rate.
- **Language detection is heuristic**, and it is not reliable on very short outputs.
- **The repair helps weaker JSON output.** It is applied identically to both models and reported separately ("JSON valid as returned"), so its effect is visible.
- **One endpoint, one point in time.** Latency depends on the CSCS endpoint's load when the benchmark ran.
- **Spot checks, not human evaluation.** While analysing the runs, the AI assistant that built REDRESS read samples of the blocked and verified sentences. It found, for example, that 70B once renamed "Assurances Exemple SA" to "Example Insurance SA" (Receipts does not check names). This is not independent human evaluation.
- **No human evaluation yet.** Fluency, tone and legal appropriateness of the outputs have not been rated by a person. The raw results file contains every sentence for anyone who wants to do this.
