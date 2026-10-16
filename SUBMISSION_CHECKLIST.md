# REDRESS — Hack Apertus submission checklist

Deadline: **16 October 2026, 12:00 CEST**. ✅ = done and verified in the repository · ⬜ = needs a person.

## Code
- ✅ All work on branch `claude/apertus-receipts` (not merged to `main`)
- ✅ Apertus 1.5 integrated through a key-holding proxy (`server/apertus-proxy.mjs`)
- ✅ Receipts verifies every model sentence (explain, letter, free-form answers)
- ✅ Rule-based fallback when the model is unavailable or unusable
- ✅ Jurisdictions: UK, EU, Switzerland, US, General
- ⬜ Review the branch, then merge it into `main` (see "GitHub" below)

## Tests
- ✅ `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` pass (counts in the final report and README)
- ✅ Live check against real Apertus: `npm run test:live` (with the proxy running)
- ✅ Benchmark run with real Apertus 1.5 8B and 70B; results in `benchmarks/results/`

## Security
- ✅ No credentials in any commit (full history scanned)
- ✅ `.env` git-ignored; only `.env.example` is tracked
- ✅ The API key never reaches the browser (tested, and checked against the production build)
- ⬜ Before going public, run `git log --all -p | grep -i -E "key|token|secret"` once more and check the output

## Documentation
- ✅ README written for judges (problem, architecture, Receipts, Apertus, setup, limitations)
- ✅ LICENSE (Apache 2.0, official text), with `"license": "Apache-2.0"` in package.json
- ✅ Benchmark methodology: `benchmarks/README.md`
- ✅ Language-layer details: `docs/APERTUS.md`

## Demo
- ✅ Script: `DEMO_SCRIPT.md` (about 2 minutes)
- ⬜ Record the video with real Apertus (`VITE_APERTUS_MODE=apertus`, proxy running)
- ⬜ Check the video-length and format requirements in the Getting Started guide ("How to Submit a Project")

## GitHub
- ⬜ Merge `claude/apertus-receipts` into `main` (e.g. open a pull request and merge it)
- ⬜ Make the repository public (Settings → General → Danger Zone → Change visibility)
- ⬜ Optional: delete the unused branch `claude/modest-sagan-0w7d91` (an earlier, separate Apertus experiment without Receipts)
- ⬜ Optional: add a repository description and the topics `apertus`, `hack-apertus`, `ai-accountability`

## Devpost
- ✅ Draft text: `DEVPOST.md`
- ⬜ Paste it into the Devpost submission and choose Track 2B (Apertus Adoption: Own Project)
- ⬜ Add the video link, the GitHub link and screenshots
- ⬜ Confirm team members on Devpost

## Live demo
- ⬜ Decide whether to provide one. Real Apertus needs the proxy (a small server); a static deploy runs only the stand-in or rule-based mode. If a live link is required, deploy the proxy as a serverless function or small server, with the key as a server-side secret. Never use a `VITE_` variable for the key.

## Final branch
- ⬜ After merging, confirm `main` contains `LICENSE`, `README.md`, `benchmarks/` and `server/`, and that `npm install && npm test && npm run build` passes on a fresh clone
