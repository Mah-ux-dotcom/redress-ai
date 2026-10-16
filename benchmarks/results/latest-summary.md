# REDRESS × Apertus benchmark — results

Run 2026-10-06T14:50:41.762Z → 2026-10-06T14:55:39.450Z · endpoint `api.inference.cscs.ch` · commit `e49e06e` · 20 cases × 2 run(s) per model.
Settings: translation temperature 0, generation temperature 0.2, max_tokens 3000 (translation) / 2000 (generation), per-call timeout 120 s.

All numbers below are automated measurements produced by `benchmarks/run.ts`. Methodology and limitations: `benchmarks/README.md`.

## Overall

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success (model output usable, no fallback) | 96.7% | 100.0% |
| JSON valid as returned (all model outputs) | 53.3% | 100.0% |
| JSON usable only after the narrow repair | 29.3% | 0.0% |
| JSON salvaged item by item | 10.0% | 0.0% |
| Claims checked by Receipts | 906 | 895 |
| Verified claims | 94.4% | 98.5% |
| Blocked (unsupported) claims | 5.6% | 1.5% |
| Source grounding (claims citing only real facts) | 94.6% | 98.7% |
| Output in the requested language | 100.0% | 100.0% |
| Explanation completeness (4 required parts) | 90.8% | 99.4% |
| Letter coverage (REDRESS requests included) | 80.6% | 100.0% |
| Translation success (non-English notices) | 76.7% | 100.0% |
| Automation status correct after translation | 83.3% | 100.0% |
| Median latency per task | 2.6 s | 6.2 s |
| 90th percentile latency per task | 3.5 s | 9.3 s |
| Mean completion tokens per case | 1126 | 1290 |

## By task

**explain**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 95.0% | 100.0% |
| Claims | 412 | 419 |
| Verified | 97.8% | 99.5% |
| Blocked | 2.2% | 0.5% |
| Median latency | 2.7 s | 6.3 s |

**letter**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 95.0% | 100.0% |
| Claims | 322 | 349 |
| Verified | 89.4% | 98.6% |
| Blocked | 10.6% | 1.4% |
| Median latency | 3.0 s | 8.6 s |

**answer**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 100.0% | 100.0% |
| Claims | 172 | 127 |
| Verified | 95.3% | 95.3% |
| Blocked | 4.7% | 4.7% |
| Median latency | 1.3 s | 2.7 s |

## By notice language

**en**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 100.0% | 100.0% |
| Verified | 96.1% | 98.1% |
| Output in requested language | 100.0% | 100.0% |

**de**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 100.0% | 100.0% |
| Verified | 92.2% | 97.4% |
| Output in requested language | 100.0% | 100.0% |

**fr**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 90.0% | 100.0% |
| Verified | 91.7% | 99.1% |
| Output in requested language | 100.0% | 100.0% |

**it**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 96.7% | 100.0% |
| Verified | 97.3% | 99.6% |
| Output in requested language | 100.0% | 100.0% |

## Why claims were blocked

| Reason (count; a claim can have several) | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| fabricated_citation | 11 | 0 |
| framing_too_long | 2 | 1 |
| legal_conclusion | 1 | 0 |
| malformed_output | 4 | 0 |
| no_citation | 23 | 2 |
| unsupported_automation_claim | 8 | 3 |
| unsupported_law | 3 | 1 |
| unsupported_number | 12 | 3 |
| unsupported_quote | 2 | 5 |
| unsupported_solely_claim | 1 | 1 |

## Automation-status mismatches

- `swiss-ai/Apertus-v1.5-8B` run 1, `de-02-insurance-solely`: expected confirmed_automated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 1, `fr-04-loan-human`: expected human_indicated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 1, `it-03-insurance-algorithm`: expected possibly_automated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 2, `de-02-insurance-solely`: expected confirmed_automated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 2, `it-03-insurance-algorithm`: expected possibly_automated, got not_established (translation failed: No usable translation in the model response)

## Fallbacks (model output not usable)

- `swiss-ai/Apertus-v1.5-8B` run 1, `fr-05-school-not-established` explain: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 2, `fr-01-credit-automated` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 2, `fr-05-school-not-established` explain: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 2, `it-04-benefit-human` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
