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

Results go to `track_2b/data/benchmark_results/`:
- `<timestamp>.json`: every case, task, sentence, verdict, Receipts reason and latency. When a task falls back, the model's raw response is included so the failure can be inspected.
- `<timestamp>-summary.md` and `latest-summary.md`: the tables.

## Results (final run, 6 October 2026)

20 notices × 2 runs per model, same inputs and prompts, on the Hack Apertus CSCS endpoint. Full tables: [`latest-summary.md`](../../data/benchmark_results/latest-summary.md). Every sentence and verdict: `track_2b/data/benchmark_results/2026-10-06-14-50.json`. 

| Automated measurement | Apertus 1.5 8B | Apertus 1.5 70B |
|---|---|---|
| Task success (output usable, no fallback) | 96.7% | **100%** |
| JSON valid as returned | 53.3% | **100%** |
| Claims verified by Receipts | 94.4% (906 claims) | **98.5%** (895 claims) |
| Fabricated citations | 11 | **0** |
| Explanation completeness (4 required parts) | 90.8% | **99.4%** |
| Letter coverage (REDRESS requests included) | 80.6% | **100%** |
| Non-English notices translated | 76.7% | **100%** |
| Automation status correct after translation | 83.3% | **100%** |
| Output in the requested language | 100% | 100% |
| Median latency per task | **2.6 s** | 6.2 s |

What this shows:
- **70B is the right default for REDRESS.** Every output was usable and valid JSON, every non-English notice was translated and classified correctly, and it never fabricated a citation.
- **8B is about 2.4 times faster, but fragile.** About half its outputs needed the narrow JSON repair or item-by-item salvage. It could not translate 7 of its 30 non-English notices, which led to wrong statuses on 3 of the 15 notices. It also fabricated 11 citations, all of which Receipts blocked.
- **Receipts still matters for 70B.** It blocked paraphrased "quotes" of the notice, numbers and automation claims that weren't in the cited facts, and a law not in the cited reference (1.5% of 70B's claims).
- **Run-to-run variation was small:** verified claims 93.8% / 95.0% (8B) and 98.4% / 98.7% (70B).

**How the benchmark improved REDRESS.** The benchmark was run five times, and every result file is kept in `track_2b/data/benchmark_results/`. Each run exposed something that was then fixed with a regression test:
- **Run 1:** a translation bug, and Receipts false positives such as inline fact IDs being read as numbers.
- **Runs 2–3:** further false positives, for example general descriptions of what a law covers.
- **Run 4:** a prompt change that stopped 70B writing French letters in English (it had done so in 4 of 10 French letters), but which also made explanations end with sign-offs.

The numbers above are from run 5, on the submitted code. See the run history below.

**Not measured:** human ratings of fluency, tone and legal appropriateness. See the limitations below.

### Run history

| Run | Results | Checker state |
|---|---|---|
| 1 | `results/2026-10-05-12-11.*` | Original Receipts. Revealed a translation-alignment bug and Receipts false positives (inline fact IDs read as numbers; requests mentioning the automated system; "where applicable" hedges; uncited "the notice does not say…" sentences) |
| 2 | `results/2026-10-05-12-19.*` | After those fixes. Revealed a second JSON-error variant (70B) and law-scope statements ("for automated decisions that…") flagged as automation claims |
| 3 | `results/2026-10-05-12-26.*` | After those fixes. Two more German hedge patterns found |
| 4 | `results/2026-10-06-14-44.*` | After a full-app audit: output-language rule moved next to the format rules, signature handling. 70B French letters fixed (0 of 10 in English); the new rule made explanations end with sign-offs |
| 5 (final) | `results/2026-10-06-14-50.*` | Greetings and sign-offs only in letters; standard closings are non-claims; "unless"/"qualora" hedges |

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
