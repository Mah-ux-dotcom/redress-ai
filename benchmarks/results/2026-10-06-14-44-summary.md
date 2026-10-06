# REDRESS × Apertus benchmark — results

Run 2026-10-06T14:44:35.562Z → 2026-10-06T14:49:39.511Z · endpoint `api.inference.cscs.ch` · commit `22057a3` · 20 cases × 2 run(s) per model.
Settings: translation temperature 0, generation temperature 0.2, max_tokens 3000 (translation) / 2000 (generation), per-call timeout 120 s.

All numbers below are automated measurements produced by `benchmarks/run.ts`. Methodology and limitations: `benchmarks/README.md`.

## Overall

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success (model output usable, no fallback) | 97.5% | 100.0% |
| JSON valid as returned (all model outputs) | 54.0% | 100.0% |
| JSON usable only after the narrow repair | 32.7% | 0.0% |
| JSON salvaged item by item | 6.0% | 0.0% |
| Claims checked by Receipts | 918 | 938 |
| Verified claims | 94.9% | 96.3% |
| Blocked (unsupported) claims | 5.1% | 3.7% |
| Source grounding (claims citing only real facts) | 97.1% | 96.8% |
| Output in the requested language | 100.0% | 100.0% |
| Explanation completeness (4 required parts) | 88.8% | 98.8% |
| Letter coverage (REDRESS requests included) | 83.4% | 100.0% |
| Translation success (non-English notices) | 73.3% | 100.0% |
| Automation status correct after translation | 80.0% | 100.0% |
| Median latency per task | 2.6 s | 6.7 s |
| 90th percentile latency per task | 3.5 s | 9.3 s |
| Mean completion tokens per case | 1126 | 1310 |

## By task

**explain**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 100.0% | 100.0% |
| Claims | 427 | 447 |
| Verified | 98.1% | 94.4% |
| Blocked | 1.9% | 5.6% |
| Median latency | 2.8 s | 7.0 s |

**letter**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 92.5% | 100.0% |
| Claims | 305 | 347 |
| Verified | 91.1% | 99.1% |
| Blocked | 8.9% | 0.9% |
| Median latency | 3.0 s | 8.8 s |

**answer**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 100.0% | 100.0% |
| Claims | 186 | 144 |
| Verified | 93.5% | 95.1% |
| Blocked | 6.5% | 4.9% |
| Median latency | 1.4 s | 3.0 s |

## By notice language

**en**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 100.0% | 100.0% |
| Verified | 94.5% | 97.3% |
| Output in requested language | 100.0% | 100.0% |

**de**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 100.0% | 100.0% |
| Verified | 95.1% | 94.3% |
| Output in requested language | 100.0% | 100.0% |

**fr**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 93.3% | 100.0% |
| Verified | 94.5% | 96.5% |
| Output in requested language | 100.0% | 100.0% |

**it**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 96.7% | 100.0% |
| Verified | 95.5% | 97.2% |
| Output in requested language | 100.0% | 100.0% |

## Why claims were blocked

| Reason (count; a claim can have several) | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| fabricated_citation | 7 | 2 |
| framing_too_long | 1 | 0 |
| legal_conclusion | 0 | 1 |
| no_citation | 23 | 23 |
| unsupported_automation_claim | 10 | 5 |
| unsupported_law | 1 | 0 |
| unsupported_number | 11 | 2 |
| unsupported_quote | 0 | 5 |
| unsupported_solely_claim | 3 | 2 |

## Automation-status mismatches

- `swiss-ai/Apertus-v1.5-8B` run 1, `de-02-insurance-solely`: expected confirmed_automated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 1, `fr-04-loan-human`: expected human_indicated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 1, `it-03-insurance-algorithm`: expected possibly_automated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 2, `de-02-insurance-solely`: expected confirmed_automated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 2, `fr-04-loan-human`: expected human_indicated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 2, `it-03-insurance-algorithm`: expected possibly_automated, got not_established (translation failed: No usable translation in the model response)

## Fallbacks (model output not usable)

- `swiss-ai/Apertus-v1.5-8B` run 1, `fr-01-credit-automated` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 1, `it-04-benefit-human` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 2, `fr-01-credit-automated` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
