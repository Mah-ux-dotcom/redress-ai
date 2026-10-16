# REDRESS × Apertus benchmark — results

Run 2026-10-05T12:26:11.143Z → 2026-10-05T12:31:07.444Z · endpoint `api.inference.cscs.ch` · commit `eb7611a` · 20 cases × 2 run(s) per model.
Settings: translation temperature 0, generation temperature 0.2, max_tokens 3000 (translation) / 2000 (generation), per-call timeout 120 s.

All numbers below are automated measurements produced by `benchmarks/run.ts`. Methodology and limitations: `benchmarks/README.md`.

## Overall

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success (model output usable, no fallback) | 94.2% | 100.0% |
| JSON valid as returned (all model outputs) | 38.7% | 99.3% |
| JSON usable only after the narrow repair | 42.7% | 0.7% |
| JSON salvaged item by item | 7.3% | 0.0% |
| Claims checked by Receipts | 712 | 860 |
| Verified claims | 91.6% | 97.0% |
| Blocked (unsupported) claims | 8.4% | 3.0% |
| Source grounding (claims citing only real facts) | 91.9% | 96.9% |
| Output in the requested language | 100.0% | 96.7% |
| Explanation completeness (4 required parts) | 80.1% | 99.4% |
| Letter coverage (REDRESS requests included) | 69.3% | 100.0% |
| Translation success (non-English notices) | 66.7% | 100.0% |
| Automation status correct after translation | 73.3% | 100.0% |
| Median latency per task | 2.5 s | 6.4 s |
| 90th percentile latency per task | 3.6 s | 9.5 s |
| Mean completion tokens per case | 1097 | 1270 |

## By task

**explain**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 97.5% | 100.0% |
| Claims | 380 | 416 |
| Verified | 97.1% | 99.3% |
| Blocked | 2.9% | 0.7% |
| Median latency | 2.7 s | 6.4 s |

**letter**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 87.5% | 100.0% |
| Claims | 258 | 358 |
| Verified | 82.2% | 96.6% |
| Blocked | 17.8% | 3.4% |
| Median latency | 3.2 s | 8.6 s |

**answer**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 97.5% | 100.0% |
| Claims | 74 | 86 |
| Verified | 95.9% | 87.2% |
| Blocked | 4.1% | 12.8% |
| Median latency | 0.6 s | 1.4 s |

## By notice language

**en**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 100.0% | 100.0% |
| Verified | 95.5% | 97.5% |
| Output in requested language | 100.0% | 100.0% |

**de**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 100.0% | 100.0% |
| Verified | 97.1% | 96.8% |
| Output in requested language | 100.0% | 100.0% |

**fr**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 96.7% | 100.0% |
| Verified | 85.1% | 95.7% |
| Output in requested language | 100.0% | 86.7% |

**it**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 80.0% | 100.0% |
| Verified | 84.9% | 97.8% |
| Output in requested language | 100.0% | 100.0% |

## Why claims were blocked

| Reason (count; a claim can have several) | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| fabricated_citation | 1 | 0 |
| framing_too_long | 13 | 1 |
| legal_conclusion | 0 | 1 |
| malformed_output | 35 | 6 |
| no_citation | 20 | 8 |
| unsupported_automation_claim | 2 | 5 |
| unsupported_law | 19 | 0 |
| unsupported_number | 19 | 2 |
| unsupported_quote | 1 | 5 |
| unsupported_solely_claim | 0 | 2 |

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

- `swiss-ai/Apertus-v1.5-8B` run 1, `fr-01-credit-automated` explain: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 1, `it-01-credit-automated` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 1, `it-02-telecom-solely` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 1, `it-03-insurance-algorithm` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 1, `it-04-benefit-human` answer: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 2, `it-01-credit-automated` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 2, `it-05-job-not-established` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
