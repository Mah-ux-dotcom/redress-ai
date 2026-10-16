# Data

`benchmark_results/` — the five runs of the REDRESS × Apertus benchmark (Apertus 1.5 8B vs 70B) on the Hack Apertus CSCS endpoint. Each run has a `.json` file with every model sentence, its Receipts verdict and reason, and a `-summary.md` with the tables. `latest-summary.md` is the final run, on the submitted code.

The inputs are 20 synthetic notices (fictional organisations and people, 5 each in EN/DE/FR/IT) in [`../src/benchmarks/fixtures/cases.ts`](../src/benchmarks/fixtures/cases.ts). No personal data. Methodology and limitations: [`../src/benchmarks/README.md`](../src/benchmarks/README.md). Re-run with `make benchmark`.
