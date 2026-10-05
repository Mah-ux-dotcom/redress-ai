# REDRESS × Apertus benchmark — results

Run 2026-10-05T12:11:31.585Z → 2026-10-05T12:16:27.407Z · endpoint `api.inference.cscs.ch` · commit `e5fbe42` · 20 cases × 2 run(s) per model.
Settings: translation temperature 0, generation temperature 0.2, max_tokens 3000 (translation) / 2000 (generation), per-call timeout 120 s.

All numbers below are automated measurements produced by `benchmarks/run.ts`. Methodology and limitations: `benchmarks/README.md`.

## Overall

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success (model output usable, no fallback) | 97.5% | 99.2% |
| JSON valid as returned (all model outputs) | 44.7% | 99.3% |
| JSON usable only after the narrow repair | 40.0% | 0.0% |
| JSON salvaged item by item | 6.7% | 0.0% |
| Claims checked by Receipts | 721 | 853 |
| Verified claims | 78.8% | 94.3% |
| Blocked (unsupported) claims | 21.2% | 5.7% |
| Source grounding (claims citing only real facts) | 92.0% | 88.7% |
| Output in the requested language | 99.1% | 96.6% |
| Explanation completeness (4 required parts) | 67.9% | 98.1% |
| Letter coverage (REDRESS requests included) | 58.2% | 99.2% |
| Translation success (non-English notices) | 66.7% | 100.0% |
| Automation status correct after translation | 73.3% | 100.0% |
| Median latency per task | 2.6 s | 6.4 s |
| 90th percentile latency per task | 3.8 s | 9.6 s |
| Mean completion tokens per case | 1063 | 1250 |

## By task

**explain**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 97.5% | 100.0% |
| Claims | 406 | 415 |
| Verified | 75.6% | 96.6% |
| Blocked | 24.4% | 3.4% |
| Median latency | 3.0 s | 6.6 s |

**letter**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 95.0% | 100.0% |
| Claims | 236 | 348 |
| Verified | 83.1% | 97.7% |
| Blocked | 16.9% | 2.3% |
| Median latency | 3.2 s | 8.7 s |

**answer**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 100.0% | 97.5% |
| Claims | 79 | 90 |
| Verified | 82.3% | 70.0% |
| Blocked | 17.7% | 30.0% |
| Median latency | 0.6 s | 1.4 s |

## By notice language

**en**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 100.0% | 96.7% |
| Verified | 64.3% | 96.6% |
| Output in requested language | 100.0% | 100.0% |

**de**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 100.0% | 100.0% |
| Verified | 96.0% | 94.1% |
| Output in requested language | 100.0% | 100.0% |

**fr**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 96.7% | 100.0% |
| Verified | 82.3% | 89.5% |
| Output in requested language | 100.0% | 86.7% |

**it**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 93.3% | 100.0% |
| Verified | 71.4% | 96.8% |
| Output in requested language | 96.4% | 100.0% |

## Why claims were blocked

| Reason (count; a claim can have several) | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| fabricated_citation | 12 | 0 |
| framing_too_long | 1 | 0 |
| legal_conclusion | 0 | 1 |
| no_citation | 23 | 19 |
| unsupported_automation_claim | 2 | 18 |
| unsupported_law | 11 | 0 |
| unsupported_number | 126 | 11 |
| unsupported_quote | 8 | 4 |

## Automation-status mismatches

- `swiss-ai/Apertus-v1.5-8B` run 1, `de-02-insurance-solely`: expected confirmed_automated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 1, `fr-03-insurance-algorithm`: expected possibly_automated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 1, `fr-04-loan-human`: expected human_indicated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 1, `it-03-insurance-algorithm`: expected possibly_automated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 2, `de-02-insurance-solely`: expected confirmed_automated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 2, `fr-03-insurance-algorithm`: expected possibly_automated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 2, `fr-04-loan-human`: expected human_indicated, got not_established (translation failed: No usable translation in the model response)
- `swiss-ai/Apertus-v1.5-8B` run 2, `it-03-insurance-algorithm`: expected possibly_automated, got not_established (translation failed: No usable translation in the model response)

## Fallbacks (model output not usable)

- `swiss-ai/Apertus-v1.5-8B` run 1, `it-05-job-not-established` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 2, `fr-01-credit-automated` explain: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 2, `it-02-telecom-solely` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-70B` run 1, `en-03-tenancy-algorithm` answer: Apertus (swiss-ai/Apertus-v1.5-70B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
