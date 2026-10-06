# REDRESS — 2-minute demo script

**Setup before recording:** `npm run proxy` and `npm run dev` with `VITE_APERTUS_MODE=apertus` (see README), so the outputs are written by real Apertus 1.5. Use a 1280-pixel-wide browser window. Rehearse once: Apertus takes about 5–15 seconds per answer, so plan to talk over the waits or trim them in editing.

All cases below are fictional and built into the app.

---

**0:00 — The problem (on the start screen)**
> "More and more decisions about us — loans, insurance, accounts, jobs — are made or shaped by automated systems. The letters rarely say how. REDRESS helps you work out what happened and what you can do next, and it never lets the AI make things up."

**0:12 — A German decision letter**
Click **"NovaCredit Schweiz — Kreditablehnung (Deutsch)"**, then **Analyze Decision**.
> "Here's a fictional German loan refusal from a Swiss lender. Apertus — Switzerland's open model — translates it so REDRESS's rule-based engine can analyse it. Any evidence about automation has to be found in the original German wording, not just in the translation."

Point to the blue **translation banner** and the status card.

**0:30 — What the evidence shows, and what it doesn't**
> "REDRESS says: *Confirmed Automated* — and shows the exact sentences, in the original German, that prove it. Just as important, it lists what the letter does *not* establish — for example, whether a person made the final decision."

**0:45 — Jurisdiction and options**
Click **Choose Jurisdiction → Switzerland → See My Rights & Options**.
> "Under the Swiss Data Protection Act, automated individual decisions come with specific rights — but only under conditions. REDRESS states those conditions instead of promising rights it can't guarantee."

Briefly expand **"Legal references… when they apply and their limits"**.

**1:00 — Action plan and letter**
Click **Build My Action Plan**, then the button to generate the letter.
> "A step-by-step plan, and a review-request letter built only from verified facts."

**1:08 — Receipts: the key moment**
Scroll to **"Draft this letter in another language"**. Choose **English** → **Draft with Receipts**. (Or use **Explain It To Me → Explain with Receipts**.)
> "Now Apertus writes. Every sentence must cite the facts it's based on, and REDRESS checks each one: numbers, quotes, laws, claims about automation or about a person deciding, legal conclusions."

Click a **green sentence**:
> "Click any sentence and you see its source — highlighted in the original German letter."

If a **red, struck-through** sentence appears:
> "And this one was blocked — the model cited a source that doesn't exist. It never reaches the user as fact."

If none appears in your take, say:
> "In our benchmark, Receipts caught invented citations, unsupported numbers and laws — this is the safety net when that happens." (Use the figures from `benchmarks/results/latest-summary.md`.)

**1:35 — Ask anything**
In **Explain It To Me**, type a question of your own, for example *"Kann ich verlangen, dass ein Mensch meinen Antrag nochmals prüft?"*
> "Free-form questions get the same treatment: answered by Apertus in your language, every sentence checked."

**1:50 — Close**
> "REDRESS: a deterministic engine for the facts, Apertus for the language, and Receipts in between — so people facing automated decisions get help they can trust, in their own language. Open source, and it runs on Swiss infrastructure. REDRESS is an information tool, not legal advice."

---

**Fallback plan:** if the endpoint is slow or down during recording, REDRESS automatically shows its rule-based output with a notice explaining why. Mention it ("and if the model is unavailable, REDRESS degrades safely"), or record with `VITE_APERTUS_MODE=mock`. The stand-in is labelled "Stand-in model (mock — not Apertus)" on screen, so don't present it as Apertus.
