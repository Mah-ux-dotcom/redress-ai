# REDRESS × Apertus benchmark — results

Run 2026-10-05T12:19:00.483Z → 2026-10-05T12:23:44.705Z · endpoint `api.inference.cscs.ch` · commit `a834446` · 20 cases × 2 run(s) per model.
Settings: translation temperature 0, generation temperature 0.2, max_tokens 3000 (translation) / 2000 (generation), per-call timeout 120 s.

All numbers below are automated measurements produced by `benchmarks/run.ts`. Methodology and limitations: `benchmarks/README.md`.

## Overall

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success (model output usable, no fallback) | 95.8% | 96.7% |
| JSON valid as returned (all model outputs) | 40.7% | 96.7% |
| JSON usable only after the narrow repair | 44.0% | 0.0% |
| JSON salvaged item by item | 5.3% | 0.7% |
| Claims checked by Receipts | 728 | 843 |
| Verified claims | 92.7% | 97.7% |
| Blocked (unsupported) claims | 7.3% | 2.3% |
| Source grounding (claims citing only real facts) | 91.7% | 98.0% |
| Output in the requested language | 100.0% | 96.6% |
| Explanation completeness (4 required parts) | 82.2% | 98.1% |
| Letter coverage (REDRESS requests included) | 80.7% | 100.0% |
| Translation success (non-English notices) | 66.7% | 100.0% |
| Automation status correct after translation | 73.3% | 100.0% |
| Median latency per task | 2.4 s | 6.3 s |
| 90th percentile latency per task | 3.4 s | 9.4 s |
| Mean completion tokens per case | 1020 | 1241 |

## By task

**explain**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 95.0% | 100.0% |
| Claims | 378 | 410 |
| Verified | 94.2% | 98.3% |
| Blocked | 5.8% | 1.7% |
| Median latency | 2.6 s | 6.3 s |

**letter**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 92.5% | 100.0% |
| Claims | 278 | 356 |
| Verified | 92.1% | 98.3% |
| Blocked | 7.9% | 1.7% |
| Median latency | 3.2 s | 8.3 s |

**answer**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Success | 100.0% | 90.0% |
| Claims | 72 | 77 |
| Verified | 87.5% | 92.2% |
| Blocked | 12.5% | 7.8% |
| Median latency | 0.6 s | 1.6 s |

## By notice language

**en**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 96.7% | 90.0% |
| Verified | 88.6% | 97.0% |
| Output in requested language | 100.0% | 100.0% |

**de**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 100.0% | 100.0% |
| Verified | 95.0% | 97.7% |
| Output in requested language | 100.0% | 100.0% |

**fr**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 96.7% | 96.7% |
| Verified | 94.3% | 96.6% |
| Output in requested language | 100.0% | 86.2% |

**it**

| Metric | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| Task success | 90.0% | 100.0% |
| Verified | 93.0% | 99.5% |
| Output in requested language | 100.0% | 100.0% |

## Why claims were blocked

| Reason (count; a claim can have several) | `swiss-ai/Apertus-v1.5-8B` | `swiss-ai/Apertus-v1.5-70B` |
|---|---|---|
| fabricated_citation | 10 | 0 |
| framing_too_long | 1 | 0 |
| legal_conclusion | 0 | 1 |
| malformed_output | 13 | 0 |
| no_citation | 23 | 5 |
| unsupported_automation_claim | 5 | 9 |
| unsupported_law | 10 | 0 |
| unsupported_number | 10 | 2 |
| unsupported_quote | 1 | 3 |
| unsupported_solely_claim | 2 | 0 |

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
- `swiss-ai/Apertus-v1.5-8B` run 1, `it-02-telecom-solely` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 2, `en-02-account-solely` explain: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 2, `it-03-insurance-algorithm` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-8B` run 2, `it-05-job-not-established` letter: Apertus (swiss-ai/Apertus-v1.5-8B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-70B` run 1, `en-04-insurance-human` answer: Apertus (swiss-ai/Apertus-v1.5-70B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-70B` run 2, `en-03-tenancy-algorithm` answer: Apertus (swiss-ai/Apertus-v1.5-70B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-70B` run 2, `en-04-insurance-human` answer: Apertus (swiss-ai/Apertus-v1.5-70B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
- `swiss-ai/Apertus-v1.5-70B` run 2, `fr-05-school-not-established` answer: Apertus (swiss-ai/Apertus-v1.5-70B) was unavailable (Response has no usable sentences). Showing REDRESS's rule-based output in English instead.
