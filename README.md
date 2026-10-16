# REDRESS × Apertus

**When an AI makes a decision about you, know what to do next — with every AI sentence backed by a receipt.**

Hack Apertus 2026 · **Track 2B — Own Project**. The project lives in [`track_2b/`](track_2b/):

| Path | What it is |
| --- | --- |
| [`track_2b/README.md`](track_2b/README.md) | The Track 2B challenge description and submission requirements |
| [`track_2b/technical_report.md`](track_2b/technical_report.md) | Technical report (PDF: [`track_2b/REDRESS_Report.pdf`](track_2b/REDRESS_Report.pdf)) |
| [`track_2b/Makefile`](track_2b/Makefile) | `make run` builds and starts REDRESS in Docker |
| [`track_2b/src/`](track_2b/src/) | The code: web app, deterministic engine, Apertus language layer, Receipts verifier, proxy, tests, benchmark ([README](track_2b/src/README.md)) |
| [`track_2b/data/`](track_2b/data/) | Benchmark results: Apertus 1.5 8B vs 70B, every sentence and verdict |
| [`track_2b/docs/`](track_2b/docs/) | Language-layer details, demo script, screenshots |

## Run it

```bash
cd track_2b
export LLM_API_KEY=...        # your Apertus endpoint key (or put it in track_2b/.env)
make run                      # builds the image (runs all tests) and serves http://localhost:8080
```

Optional: `LLM_BASE_URL` (default `https://api.inference.cscs.ch/v1`, any OpenAI-compatible endpoint) and `LLM_NAME` (default: auto-selects Apertus 1.5 70B). `make run MODE=mock` runs without any model. `make run` also works from the repository root.

## How it works, in one line

A deterministic engine decides the facts; **Apertus 1.5** translates, explains, drafts the letter and answers questions in EN/DE/FR/IT; **Receipts** checks every sentence Apertus writes against the facts, blocks unsupported ones and links verified ones to their source.

Not legal advice. Licence: Apache 2.0 (see [LICENSE](LICENSE)).
