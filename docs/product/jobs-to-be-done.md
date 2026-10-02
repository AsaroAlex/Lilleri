# Jobs to be done: what Italians hire Lilleri for, the core loop, the WOW and TRUST moments, and how we will know

**Project:** LILLERI (greenfield consumer PFM; Italy-first, then Europe)
**Document type:** Phase 1 product document — JTBD, core loop, moments, success signals
**Research / verification date for every claim:** 2026-10-02
**Author:** UX researcher + consumer fintech PM (founding team)
**Language:** documentation in English; product-copy examples in Italian.

**Review provenance (DECISION, 2026-10-02):** this revision checks repository evidence, source consistency and design implications. Source URLs/access dates below are inherited observations, not fresh web verification. FACT means the cited observation is recorded; vendor performance, source independence, market prevalence and current legal/commercial eligibility remain unverified where stated.

## How to read this document

- Jobs are written in the form *"When [situation], I want to [motivation], so I can [outcome]"*. Each job cites its evidence and the personas (`P1`–`P5` in `docs/product/personas.md`) and pain points (`#n`, `I-n`, `D-n` in `docs/research/user-pain-points.md`) it maps to.
- **Job statements are HYPOTHESES inferred from the documented evidence; FACT labels in evidence/status cells establish that the cited behaviour or request exists, not that Italian demand or the proposed formulation is validated.** **the loop, the moment definitions and every target number are HYPOTHESES or DECISIONS** proposed for ratification. No Lilleri users exist yet; nothing here is validated by Lilleri data. Household jobs are Later; minors are excluded; current commercial/trial policy follows `business-model.md`. Financial data must not be added to third-party telemetry merely to measure these jobs.
- Source prefixes: `PP-` raw pain-points document; `IT-` Italian competitor document; `EU-` UK/EU document; `US-` US document; `WS-` WebSearch run on 2026-10-02 for the synthesis. URLs for every ID are in the Sources section of `docs/research/user-pain-points.md`; the most load-bearing ones are repeated at the end of this file.

---

## 0. The main job (one sentence)

> **"When my money lives in several accounts, cards and wallets, I want one picture that is right without my doing anything, so that I know where my money goes, catch what matters, and stop keeping a spreadsheet."**

Evidence (FACT): "see all my accounts in one place" is the most-loved PFM feature everywhere (`EU-` §10; `US-S42`; `PP-G-68`); the Italian hook is "dove sono finiti i soldi" at month-end and users price effort in minutes per month (`IT-Y-02`); the dominant complaints are about the picture being *wrong* — broken links, duplicates, transfers counted as spend or income, missing items, categories that never learn (`#1`–`#6`).

What this job is **not** (ANTI-JOBS, DECISION): moving money, lending or cash advances (Cleo FTC case, `EU-S-45`; Satispay jar critique, `IT-Y-11`), chat for its own sake (Italian users want the *output* of AI, not a conversation, `IT-Y-02`; `IT-` §5.5), zero-based budgeting as a method (YNAB's 2–4-week learning curve is a churn driver, `US-S13`), replacing the bank app for payments (Hype/Poste already pay F24/MAV/RAV in-app, `IT-W-01`).

---

## 1. Functional jobs

| ID | Job statement | Evidence | Personas | Pain points / decisions | Status |
|---|---|---|---|---|---|
| F1 | When I have several accounts, cards and wallets, I want them connected once and kept connected, so I never re-link blindly or wonder why a balance stopped updating | Connection breakage is the #1 complaint (N=22); consent expiry surfaces as unexplained breakage (N=11); renewal warnings are not established by the retained sources; competitor UX remains UNKNOWN (`EU-` §6) | P1, P2, P4 | `#1`, `#3`, `#12`; `D-3`, `D-4` | FACT |
| F2 | When money moves between my own accounts (bonifico Intesa→Revolut, Satispay/Hype top-up, ricarica Postepay, contribution to the joint account), I want it recognised as a transfer, so my spending and income are not inflated | "Recognise transfers between accounts" is the most up-voted open-source PFM request (382; `PP-G-01`); Rocket/Empower require manual tagging (`US-S73/S110`); reimbursements show as income (`PP-G-04`) | P1, P2, P4 | `#4`, `#25`; `D-2` | FACT |
| F3 | When my credit card statement is debited, I want the settlement matched to the purchases already counted, so nothing is counted twice | Card reconciliation is a recurring chore (`US-S5/S12`; `PP-G-46…G-49`); Copilot keeps both legs as Internal Transfer (`US-S53`) | P1, P4 | `#15`; `D-2` | FACT |
| F4 | When a transaction is pending, booked or future-dated, I want to see the balance the bank sees today and know what is still settling, so I trust the number | Pending→posted confusion and future-dated inflation (N=8; `PP-G-05` 70 comments; `US-S29/S54`); Plaid documents linkage where supplied; bank/provider/application causes require diagnosis (`US-V4`) | P1, P3, P4 | `#9`, `#10`; `D-5` | FACT |
| F5 | When transactions arrive, I want them categorised correctly the first time and corrected once, so I never fix the same merchant twice | "Never learns" (N=10; `EU-S-20`); Emma learns after 3 edits (`EU-S-21`); Copilot per-user model after ~30 reviews (`US-S51`); Italian local merchants need rules (`IT-Y-02`) | all | `#5`, `#18`; `D-6` | FACT |
| F6 | When Lilleri is unsure, I want to be asked one clear question with one tap to answer, and otherwise to be left alone, so review takes minutes a month | Merge/match/approve requested (121 up-votes, `PP-G-43`); YNAB approve and Monarch "needs review" praised; manual approval of everything is a churn driver (`US-S13`); 15 min/month is the Italian benchmark (`IT-Y-02`) | all | `#17`, `#21`, `#23`; `D-7` | FACT |
| F7 | When something recurs (abbonamenti, SDD, bollette bimestrali, TARI, RC auto semestrale), I want it detected with its true period and next date, so I am not surprised | Subscription/contract ledgers are among the most-loved features (`EU-S-35`, `S-49`; `US-S78`); one-offs counted as regular is a documented error (`EU-S-22`); Italian periodicities beyond monthly (`IT-` §8.8) | P1, P4, P2 | `#20`; `D-6` | FACT / ASSUMPTION (Italian periods) |
| F8 | When I look at the month, I want a correct "where did it go" view and a safe-to-spend number, so I can decide without a spreadsheet | "Spend by category" 82 up-votes (`PP-G-69`); left-to-spend features loved (`EU-S-02`, `US-S131`); Satispay's weekly Budget is the Italian mental model (`WS-07`; `IT-Y-13`); ChatGPT-DIY output is what Italians produce by hand (`IT-Y-02`) | all | jobs B; `I-16` | FACT |
| F9 | When a sync fails or skips something, I want to be told which bank, why, and what happens next, so I never discover it from a wrong balance | Opaque "sync offline"/"internal error"/"contact support" states (`PP-G-73, G-60, G-74`); silent skips and overwrites (`PP-G-83, G-84, G-87`): "the only way to notice is a comparable balance mismatch against the bank" | all | `#6`, `#10`, `#13`; `D-4` | FACT |
| F10 | When I pay with cash or a prepaid/wallet balance (Postepay, Satispay, Hype), I want it to count as my money too, so the picture is complete | Cash typed by hand everywhere (`IT-Y-04`); prepaid-as-primary (`IT-V-11`, `IT-Y-30`); Satispay/Hype coverage UNKNOWN (`I-8`) | P3, P2, P4 | `I-15`; `D-8` | FACT (manual cash) / UNKNOWN (wallet coverage) |
| F11 (Later household) | When I share costs with a partner or household, I want contributions, shared items and repayments reconciled from real transactions, so fairness does not require typing receipts | Couple norms (`IT-Y-05`); Splitwise cap and ads (`IT-V-13/V-14`); Monarch household praised, Copilot couples trap (`US-S40/S65`); reimbursable tracking requested (`PP-G-61`) | P2, P4 | `#21`; `D-11` | FACT |
| F12 | When I want my data, I want to export or delete everything in one tap, so I am never trapped | Export praised at shutdowns (`EU-S-08`); web-only/premium-only export is a complaint (`US-S97`, `S72`); Tricount lost CSV export (`IT-W-12`) | all | `#22`; `D-10` | FACT |
| F13 | When I pay a bollettino, F24, MAV/RAV or PagoPA, I want it categorised as what it is (tasse, scuola, condominio, utenze), so the Italian parts of my life are not "Other" | Revolut cannot pay them, Hype can (`IT-Y-01`, `IT-W-01`); categorisation gap is HYPOTHESIS (`IT-` §8.1) | P3, P4, P5 | `I-14`; `D-6` | FACT (payment types) / HYPOTHESIS (gap) |
| F14 (Later) | When I am a freelancer, I want business and personal separated and a yearly export my commercialista accepts | `IT-Y-03`; business tiers elsewhere (`EU-S-77`) | P5 | `PD-2` | FACT (low) |

---

## 2. Emotional jobs

| ID | Job statement | Evidence | Personas | Status |
|---|---|---|---|---|
| E1 | When I open the app, I want to feel that someone competent has already tidied up, so I feel in control instead of behind | "Sense of control" is why YNAB users stay (`US-S12`); Italians abandon spreadsheets and "1000 apps" (`IT-Y-02`); Finanzguru's contract ledger loved for the same reason (`EU-S-35`) | all | FACT (motivation) / HYPOTHESIS (framing) |
| E2 | When I connect my bank, I want to feel safe — that nobody can see my password or move my money — so I can do it without a knot in my stomach | Read-only reassurance needed out loud (`IT-Y-02`); vendors stress "credentials never touch our servers" (`US-S1`; `EU-S-41b`); Revolut Sep 2026 incident and Garante fine on Poste (`IT-W-08`) | all | FACT |
| E3 | When the app shows me a number, I want to believe it, so I do not go and check the bank anyway | Churn reason #1: "cannot trust the numbers" (`PP-G-19`; `EU-S-13a, S-38`); comparable balance mismatch as the only signal of a silent skip (`PP-G-84`) | all | FACT |
| E4 | When I make a mistake or the app does, I want to fix it in one tap and never see it again, so I do not feel punished for correcting | "Never learns" despite corrections (`EU-S-20`); deleting duplicates that return (`PP-G-19, G-20`) | all | FACT |
| E5 | When something recurring is coming, I want to feel prepared rather than ambushed | Forgotten quarterly/annual bills (`PP-G-58`); bill-spike alerts loved (`EU-S-09a`) | P4, P1 | FACT |
| E6 | When I pay for the app, I want to feel the price is fair and will not change under me, so paying feels like a choice | Price increases, renewal step-ups and trial auto-charges are the loudest complaints (`#8`, `#16`); YNAB's Trustpilot parity shows billing honesty is rewarded (`US-W6`) | P1, P4 | FACT |

---

## 3. Social jobs

| ID | Job statement | Evidence | Personas | Status |
|---|---|---|---|---|
| S1 | When I split life with a partner, I want fairness to be visible and private spending to stay private, so money does not become an argument | Couple norms and "keep personal accounts" (`IT-Y-05`); "no more awkward money talk" is Splitwise's praise (`IT-Y-04`) | P2 | FACT (low-medium) |
| S2 (Later household) | When I run the family's money, I want the other adult to see the household picture without being nagged, so I am not the only one who knows | Monarch's assignable review and household roles (`US-S28`, `S40`); family-budget app baskets (`IT-Y-32`) | P4 | FACT (pattern) / HYPOTHESIS (Italian framing) |
| S3 | When a creator or friend recommends a money app, I want it to be the one that "works with my banks", so I can pass the recommendation on | "Works with Fineco/BBVA/Revolut" is the bar creators apply (`IT-Y-03`); referral-driven acquisition (`IT-Y-01/Y-06/Y-07`) | P1, P3 | FACT (low) |
| S4 | When I tell my accountant or partner how I track money, I want it to sound responsible, not obsessive | Italian content frames apps as "gestione spese" and responsible adulthood (`EU-S-12`; `IT-Y-32`) | P1, P5 | HYPOTHESIS |
| S5 | When I give an app my bank access, I want to be able to say "it's the regulated read-only kind my bank knows about", so I can defend the choice | "My bank confirmed it is read-only… nobody ever had problems" (`IT-Y-02`) | all | FACT (low-medium) |

---

## 4. The core loop mapped to jobs

**CONNECT → SYNC → UNDERSTAND → CORRECT ONLY WHEN NECESSARY → LEARN → AUTOMATE** (DECISION: the loop is the product; every screen belongs to one stage).

| Stage | Purpose | Jobs served | Pain points it must remove | What the user sees (Italian copy example) | Must never happen (anti-patterns, evidence) | Primary success signal |
|---|---|---|---|---|---|---|
| **CONNECT** | Link every source once, with consent the user understands and can see | F1, E2, S5, F12 | `#1`, `#3`, `#7`, `I-6`, `I-13` | *"Accesso in sola lettura tramite [AISP autorizzato], come previsto dalla PSD2. Ti autentichi nell'app della tua banca. Lilleri non vede le tue credenziali e non può muovere denaro. Ti mostriamo la scadenza del collegamento quando la banca la comunica e ti avvisiamo prima."* Unreachable sources shown as *"Non ancora collegabile — aggiungi il saldo a mano (10 secondi)"* | Promising banks that do not connect (Spendee IT, `EU-S-13a`); asking for home-banking credentials in-app (Hype Radar wording, `WS-01`); card-required trials (`US-S39`); a connect flow that times out silently (`PP-G-15`) | Time to first connected institution; connection success rate per bank; % of users with ≥2 institutions in session one |
| **SYNC** | Pull, de-duplicate, pair and state-machine every transaction; report honestly | F1, F2, F3, F4, F9, F10, E3 | `#2`, `#4`, `#6`, `#9`, `#10`, `#12`, `#15`, `#19`, `#25` | Sync report: *"Aggiornato alle 07:41 — Intesa, Fineco, Revolut. 14 movimenti nuovi, 1 trasferimento riconosciuto, 1 addebito carta abbinato, 2 in attesa di contabilizzazione, 0 saltati. Prossimo aggiornamento automatico alle 13:00."* | "Sync offline"/"internal error"/"clear the cache" (`PP-G-73`; `US-S54/S55`); phantom third transfer record (`PP-G-24`); silent skips/overwrites (`PP-G-83/G-84/G-87`); hidden pending reappearing as new (`US-S29`); deleting a duplicate that respawns (`PP-G-04`) | Duplicate rate; transfer/card-settlement pairing precision and recall; % accounts whose booked balance equals the bank's; % syncs with a readable report and zero silent skips |
| **UNDERSTAND** | Turn the ledger into the month-end answer and the forward view | F5, F7, F8, F13, E1, E5 | `#5`, `#18`, `#20`, `I-14` | *"Ottobre finora: 1.240 € spesi. Casa 540 €, Spesa 310 €, Trasporti 95 €… In arrivo: Hera ≈140 € (12 ott), TARI 187 € (14 ott). Puoi ancora spendere 612 € fino al 31."* Every category shows a one-line "why": *"Spesa alimentare — esercente riconosciuto (Conad)"* | Opaque "95 % accurate" claims (`US-` §6.14); one-offs counted as regular (`EU-S-22`); "Other" for F24/PagoPA/bollettini (`I-14`); category sums that "bore no relation to reality" (`EU-S-22`) | % transactions auto-categorised and never corrected after 30 days; recurring-detection precision on period and next date; % of month-end views opened without any correction |
| **CORRECT ONLY WHEN NECESSARY** | The Review Inbox: ask only when genuinely unsure; one tap; inbox zero | F6, F11, E4, S1 | `#17`, `#21`, `#23` | *"2 movimenti da rivedere."* → *"SUMUP *BAR CENTRALE 3,20 € — Caffè e bar? L’esercente sembra un bar."* / *"Bonifico da Chiara R. 45 € — rimborso di una spesa condivisa?"* → *"Tutto a posto. Nessun movimento da rivedere."* | Approving every import (YNAB churn, `US-S13`); edit-in-list with no inbox (Rocket, Simplifi, Empower, `US-` §4.3); daily caps or ads on corrections (Splitwise, `IT-V-13`); gating rules/categories (`EU-S-21`, `US-S75`) | Median inbox items per user per week; median minutes in inbox per month (target under 5); % items resolved in one tap; inbox-zero rate |
| **LEARN** | Turn each correction into a visible, editable rule; explicit rules beat AI | F5, E4 | `#5`, `#18` | *"D'ora in poi 'CONAD CITY VIA ROMA' andrà in Spesa alimentare. Regola creata — la trovi in Impostazioni › Regole."* Rules list shows source: *"creata da te il 6 ott"* / *"suggerita da Lilleri, confermata"* | Learning that is invisible or needs three edits (`EU-S-21` vs "never learns", `EU-S-20`); one rule per payee (`US-S95`); category caps (`US-S110`); stripping merchant detail the user needs (`PP-G-53`) | Repeat-correction rate for the same merchant (target → 0); % corrections that create a rule; rule-override rate (rules the user later deletes) |
| **AUTOMATE** | Proactive, reversible nudges and the honest handling of time: consent renewals, upcoming bills, anomalies, month-end summary | F1, F7, F8, E5, E6, S2 | `#3`, `#20`, `#8` | *"Il collegamento con Intesa Sanpaolo scade tra 9 giorni — rinnova nell’app della banca."* / *"Abbonamento Spotify passato da 10,99 a 11,99 €."* / *"Riepilogo di settembre pronto: 3 cose da sapere."* | Automations that move money (round-ups into points, `IT-Y-01`; unauthorised negotiations, `US-S77`); silent trial conversion (`EU-S-20`); unattended refresh beyond the 4/day cap that burns the quota (`PP-G-07`) | % consents renewed before expiry; % bills predicted within ±3 days and ±10 %; opt-out rate on nudges; renewal rate at month 12 without step-up complaints |

**Loop invariants (DECISION):** (1) the user is never asked to configure before seeing value; (2) nothing in the loop moves money; (3) every automatic decision carries a reason and an undo; (4) a failure anywhere in the loop is surfaced in the user's language within the same session; (5) correctness features (categories, rules, pairing, export) are never paywalled.

---

## 5. The WOW moment

### 5.1 Definition (DECISION, built on evidence)

> **WOW (HYPOTHESIS) = the first understandable picture of the available connected data, with source intervals and uncertainty visible: verified transfer/card links count once, unmatched data remains visible, categories carry reasons, and the user can correct or undo. A complete month and an empty inbox are possible outcomes, not first-session guarantees.**

In the user's words (HYPOTHESIS, target verbatim for interviews): *"Ha capito da solo che quei 200 € erano un giro tra i miei conti."*

### 5.2 Candidates evaluated

| Candidate WOW | Evidence it delights | Why it is / is not the WOW for Lilleri | Verdict |
|---|---|---|---|
| "All my accounts in one place" | #1 loved feature everywhere (`EU-` §10; `US-S42`) | Already delivered by Intesa XME Banks (since 2020, categorises external movements), Hype Radar, Revolut linked accounts, Webank (`WS-01/04/06/08`; FACT medium) — in Italy it is expected, not surprising | Table stakes; not WOW |
| "It found my forgotten subscriptions" | Rocket's first value in minutes; Finanzguru/Dyme ledgers loved (`US-S78`; `EU-S-35/S-49`) | Strong, but Revolut's Subscriptions hub and Hype Radar already approximate it (ASSUMPTION); on its own it does not demonstrate *correctness* | Part of WOW, not sufficient |
| "It paired my transfers and nothing is double" | 382 up-votes for the mechanic; manual fixing "creates a mess of duplicates" (`PP-G-01`); the retained sample documents failures; incumbent quality is untested (`US-` §4.1) | A proposed differentiator whose incumbent depth must be tested; directly visible to multi-account users (P1, P2, P4) | **Core of WOW** |
| "The monthly budget appears in 30 seconds" | Italians do this by hand with ChatGPT on an exported statement and keep the chat to "learn" month over month (`IT-Y-02`) | Shows the *output* users want; combined with pairing it is the complete first picture | **Part of WOW** |
| "Balance matches the bank to the cent" | Mismatch is the only way users notice silent errors (`PP-G-84`); "cannot trust the numbers" is churn reason #1 | Necessary condition of WOW; on its own it is a TRUST signal (see §6) | Precondition |
| "It categorised my local bar correctly" | Copilot's categorisation is the most-praised capability (`US-S63/S64`); Italian local merchants need rules today (`IT-Y-02`) | Visible and delightful, but accuracy claims are a trust risk if opaque (`US-` §6.14) — show the "why" | Part of WOW |

### 5.3 Measurable definition (HYPOTHESIS; thresholds to calibrate after the first 200 users)

A session counts as a WOW session when **all** of the following hold within the first session after the last connection:

1. Connection authorisation and first complete data load are measured separately, including failures and abandoned starts; a synthetic demo is never counted as a bank-connected success.
2. Displayed balances reproduce the provider’s amount, currency, balance type and reference date. Transaction-derived equality is assessed only for the same account/currency/type/date with a reliable opening anchor and complete interval; otherwise the diagnostic is **not comparable / incomplete**, not a fabricated adjustment.
3. Transfer/card links exist only when independent evidence supports identity. An unconnected wallet/card counterpart is never invented. Precision uses a labelled review sample with false positives, including repeated equal purchases; user non-correction is not correctness evidence.
4. Review Inbox load is measured together with detected error rates; ≤3 items is a UX hypothesis, not a goal that may suppress uncertainty.
5. Time-to-value and time-to-complete-data are distinct. ≤3 minutes is a mock/demo UX hypothesis; Intesa paging, rate limits and partial history can delay real completeness. Recurring items with insufficient occurrences remain candidates, with no next-date guarantee.

Leading signals: WOW-session rate among first sessions; time-to-first-correct-picture. Lagging: day-7 and day-30 retention of WOW vs non-WOW cohorts; trial-to-paid conversion of WOW cohorts (anchor: Plaid reports +21 % UK / +12 % EU conversion for YNAB after a provider switch — aggregator quality moves onboarding, `US-W3`, vendor claim).

### 5.4 What kills the WOW (FACT-based list)

- A bank in the user's stack that does not connect, or connects without accounts (`PP-G-14`, `G-81`); the mitigation is honest coverage and a 10-second manual fallback (`EU-` §12.8).
- First-import duplicates (`PP-G-22`) or a phantom transfer (`PP-G-24`).
- 90-day history only, without saying so (`PP-G-50`); say it, and show what the first full month will add.
- A categoriser that is confidently wrong on Italian payment types (`I-14`).
- Any setup step before the picture (categories, budget method, "assign money") (`US-S13/S17`).

---

## 6. The TRUST moment

### 6.1 Definition (DECISION, built on evidence)

> **TRUST = the first time something goes wrong — a consent expires, a bank is down, a transaction is ambiguous, a comparable balance check differs — and Lilleri tells the truth, in Italian, as soon as the app detects it, with the known cause or an explicit unknown and the next available action and no consequence they did not choose.**

Trust is won by boring things and lost by surprises (`PP-` §0.5). The evidence says the *failure* path, not the happy path, decides whether users stay: app-store ratings are uniformly high while Trustpilot/BBB are low for the same products, and the gap is billing and support after month one (`US-` §4.5); YNAB, with honest billing and strong support, is the exception (`US-W6`). Churn reasons #1 and #2 are "cannot trust the numbers" and "the connection keeps breaking" (`docs/research/user-pain-points.md` §5).

### 6.2 The four TRUST events to design deliberately

| Event | What the user experiences today (FACT) | What Lilleri does (DECISION) | Italian copy example |
|---|---|---|---|
| **Consent expiry** | A 400/500 error, "sync offline", or a silent stop; nobody warns in advance (`PP-G-10, G-28`; `EU-` §6) | Countdown per connection; push 7 and 2 days before; one-tap renewal in the bank app; plain reason derived from the actual bank/provider lifecycle; consent expiry and SCA are distinct | *"Il collegamento con Intesa scade tra 2 giorni. Rinnova ora: nell’app della banca, poi tutto riprende da solo."* |
| **Bank or provider outage / rate cap** | "Contact support" dialog with no cause (`PP-G-74`); re-sync button disabled for a week (`US-S113`); Hype/Sella outages (`WS-11`) | Name the bank, the cause and the next retry; never consume the user's attention for a bank-side problem; show the last good sync time | *"Intesa Sanpaolo non risponde (manutenzione segnalata dalla banca). Ultimo aggiornamento riuscito: ieri 22:10. Riproviamo alle 13:00; se vuoi, aggiorna ora."* |
| **Ambiguity** | Silent wrong guess that "never learns" (`EU-S-20`), or a phantom record (`PP-G-24`) | An inbox question with the confidence shown and the alternative offered; no action taken on low confidence | *"Non siamo sicuri: 'TRF SEPA 200 €' è un trasferimento al tuo Revolut? Sì / No, è una spesa."* |
| **Balance mismatch / skipped item** | Discovered by the user weeks later (`PP-G-84`: "the only way to notice is a comparable balance mismatch against the bank") | Comparable reconciliation failures are diagnostics with scope/date/type and known vs hypothesised cause; warn after the bank-specific persistence threshold, and surface actual skipped items immediately | *"Il saldo Revolut differisce di 5,00 € da quello della banca. Potrebbe mancare un movimento del 30 set — lo abbiamo richiesto di nuovo."* |

### 6.3 Trust preconditions (what must be true before any TRUST event can land) — FACT-based

- Consent screen names the licensed AISP, says read-only, redirects to the bank for SCA (`IT-Y-02`; `EU-S-05/S-15/S-18`; `PP-D-OB-§1`).
- Export and deletion are free, one tap, every tier (`EU-S-08`; `US-S7`).
- "What we store, who we send it to, what happens if Lilleri closes" page (`#11`; `IT-` §8.6).
- No trial converts without a reminder; no renewal step-up; no lifetime-deal games (`#8`, `#16`; `US-` §6.1–6.4).
- Nothing ever moves money (`IT-Y-01`; `EU-S-45`).
- A human answers when a bank link breaks (`EU-` §12.9; `D-12`).

### 6.4 Measurable definition (HYPOTHESIS)

- **Trust-event resolution rate:** % of consent expiries renewed *before* the connection stops (target ≥80 %); % of outages where the user saw the explanation before contacting support.
- **Support contacts per 100 connection failures** (lower is better; benchmark UNKNOWN — Wallet/Spendee/Linxo complaints suggest the incumbents' number is high, `EU-S-38, S-13, S-17`).
- **Review-site parity:** Trustpilot score within 0.5 of app-store score after month 6 (YNAB achieves parity, `US-W6`; Monarch/Rocket do not, `US-S37/S77`).
- **Export usage without churn:** % of users who export at least once and are still active 30 days later (export as a safety valve, not an exit).
- **Deletion requests citing distrust** (qualitative tag in support).

### 6.5 Trust killers (DECISION: these are release blockers)

Silent skips/overwrites; "clear the cache" as advice; a connect flow that asks for bank credentials; a charge the user was not reminded of; a bank listed as supported that does not connect; an automation that moved money; a shutdown without export.

---

**DECISION — measurement/privacy contract:** operational correctness checks run within the user’s authorised data scope. Product telemetry uses minimal semantic outcomes and denominators, not transaction descriptions, amounts, IBANs, merchant names, sensitive categories or raw review cards in third-party analytics. Record evidence for rules/links separately under the retention model. For recurring and safe-to-spend hypotheses, report coverage gaps and unavailable inputs; an absence of correction is not labelled accuracy. User research requires approved participant consent and a lawful data-handling plan.

## 7. Success signals per job (HYPOTHESIS targets; benchmarks cited where they exist)

| Job | Leading signal (product telemetry) | Lagging signal (outcome) | Target hypothesis / benchmark |
|---|---|---|---|
| F1 Connected once, kept connected | Bank authorisation completion / attempts, first complete load / authorised attempts, overall complete load / starts; by bank/account type/provider; renewal before actual expiry; freshness | 30-day connection retention; churn attributed to "my bank stopped working" | ≥95 % completed authorisation is an unvalidated target; complete-load success is separately reported with failures/abandonments, no inherited CRIF threshold; ≥80 % pre-expiry renewals; benchmark: YNAB's provider switch cut daily errors by 62 % (`US-W3`, vendor claim) |
| F2 Transfers recognised | Auto-pair precision/recall on labelled data; phantom-record count (must be 0); inbox "is this a transfer?" acceptance rate | Repeat complaints "counted as income" (support tag) | Precision ≥99 % at the auto-pair threshold; recall ≥90 % with inbox prompts covering the rest; benchmark: nobody publishes one (`US-` §4.1) |
| F3 Card settlements netted | % statement debits matched to a card account; double-count incidents | Support tags "doppio conteggio carta" | ≥95 % matched where the card account exists; 0 double counts in spend totals |
| F4 Pending/booked/future | Typed snapshot correctness; comparable anchored reconciliation rate; incomplete/not-comparable coverage; pending items with state | Mismatch inbox items per user per month | 100 % accurate snapshot display; independent reconciliation tested only on comparable intervals, no invented balancing entry; benchmark: Plaid delivers `pending_transaction_id` linkage (`US-V4`) |
| F5 Categorised right, corrected once | % transactions auto-categorised with confidence ≥ threshold; repeat-correction rate for the same merchant; time to model readiness | Day-30 "never-corrected" share; NPS verbatims on "ha capito da solo" | ≥90 % never corrected at day 30 (HYPOTHESIS; Copilot's third-party "95 %" is unverified, `US-S65`); repeat corrections → 0 after the first rule; readiness after ≤30 reviewed items (Copilot benchmark, `US-S51`) vs Emma's 3 edits per merchant (`EU-S-21`) |
| F6 Review only when necessary | Inbox items per user per week; minutes per month in inbox; one-tap resolution rate; inbox-zero rate | Day-30 retention vs inbox load; churn tagged "troppo lavoro" | Median <5 min/month (Italian ladder: ChatGPT 2, sheet 5, Wallet 15, `IT-Y-02`); ≤3 items at first sync; ≥90 % one-tap |
| F7 Recurring detected with true period | Precision on period class (monthly/bimonthly/quarterly/semiannual/annual); next-date error; false "regular" rate | Bills surprised (user-reported); nudge opt-outs | Next date within ±3 days for ≥90 % of SDD/PagoPA items; false-regular rate <2 % (Snoop's complaint is the anti-benchmark, `EU-S-22`) |
| F8 Month view and safe-to-spend | % users opening the month view weekly; corrections made from the month view | Spreadsheet abandonment (interview); day-30 retention | ≥60 % weekly open among connected users (HYPOTHESIS); qualitative: "ho smesso di usare il foglio" |
| F9 Honest failure | % syncs with a human-readable report; silent-skip incidents (must be 0); time from failure to user-visible explanation | Support contacts per 100 failures; Trustpilot parity | 0 silent skips; explanation within the same session |
| F10 Cash and wallets count | % ATM withdrawals paired to a cash wallet; manual-entry time; wallet balances kept current | Completeness complaints | Cash entry ≤5 seconds (Monefy speed benchmark, `EU-S-43`); Satispay/Hype coverage resolved (`I-8`) |
| F11 Shared costs reconciled (Later) | % contributions auto-paired across two consents; shared-tag acceptance rate; settle-up suggestions accepted | Household retention (both members active at day 30) | ≥80 % contributions auto-paired; both-active ≥70 % at day 30 (HYPOTHESIS) |
| F12 Export/delete | Export success rate; time to complete deletion | Deletion requests citing distrust | 100 % export/deletion-request availability, all tiers; active-data deletion target follows `data-retention.md`, with processor, legal-hold and backup timelines separately disclosed |
| F13 Italian payment types | % F24/MAV/RAV/PagoPA/bollettini/SDD/ricariche typed correctly | "Other" share of transactions | "Other" <5 % of spend; dictionary coverage of the top-200 Italian descriptors |
| E2/E3/S5 Feel safe, believe the number | Consent-screen completion rate; trust-page usage; comparable balance diagnostics | Trustpilot parity; verbatims "sola lettura" | Consent completion ≥85 % of starts; parity within 0.5 (YNAB benchmark, `US-W6`) |
| E6 Fair price | Trial reminder sent before every charge; renewal price = original price | Month-12 renewal rate; complaints tagged "addebito inaspettato" | 0 un-reminded charges; renewal complaints <1 % (Simplifi/Emma anti-benchmarks, `US-W21`, `EU-S-20`) |

---

## 8. Decisions / Recommendations (proposed; DECISION labels)

| ID | Decision | Rationale (evidence) |
|---|---|---|
| J-1 | **Adopt the six-stage loop as the product's information architecture**; every screen, notification and metric is assigned to one stage | Pain points cluster by stage (`docs/research/user-pain-points.md` §2); the most-loved apps are narrow and loop-shaped (Snoop feed, Finanzguru contracts, Copilot review; `EU-` §12.10) |
| J-2 | **Define WOW as "first correct cross-institution picture with nothing to fix" and instrument it from day one** (WOW-session rate, time-to-first-correct-picture, WOW vs non-WOW retention) | Aggregation alone is table stakes in Italy (`WS-01/04/06`); pairing is the unmet, most-wanted mechanic (`PP-G-01`); ChatGPT-DIY shows the wanted output (`IT-Y-02`) |
| J-3 | **Define TRUST as "the first failure handled honestly" and treat the four trust events (consent expiry, outage, ambiguity, mismatch) as designed flows with their own copy, telemetry and release criteria** | Billing and support, not features, drive the ratings gap (`US-` §4.5); silent failures are documented trust-killers (`PP-G-83/84/87`); no competitor markets consent-renewal UX (`EU-` §11.6) |
| J-4 | **The Review Inbox receives only ambiguity; "inbox zero" is a first-class state; the design budget is five minutes a month** | `PP-G-43` (121 up-votes) vs YNAB manual-effort churn (`US-S13`); Italian effort ladder (`IT-Y-02`) |
| J-5 | **Explicit rules win over AI, learning is visible after one correction, every category shows a "why"** | "Never learns" (`EU-S-20`) despite Emma's 3-edit rule (`EU-S-21`); opaque accuracy claims are a trust risk (`US-` §6.14) |
| J-6 | **Anti-jobs are out of scope and stated publicly:** no money movement, no lending, no chat-first interface, no budgeting method to learn | `EU-S-45`; `IT-Y-11`; `IT-Y-01`; `US-S13`; `IT-` §5.5 |
| J-7 | **Single-institution users get a fallback WOW** (clear evidenced spending/categories and recurring candidates; next dates and safe-to-spend only when data is sufficient) and are nudged to add a second institution with the pairing benefit explained | P3's likely single-institution stack; Rocket's first value in minutes (`US-S79`); Satispay Budget mental model (`WS-07`) |
| J-8 | **Honest coverage is part of CONNECT:** unreachable sources (Amex IT, Satispay, Hype, Nexi credit, UniCredit cards) are shown as such with a manual fallback until sandbox tests prove them | `EU-` §12.8; `PP-D-OB-#63`; `I-7`, `I-8` |
| J-9 | **Calibrate all numeric targets in §7 after the first 200 consented users**; until then they are HYPOTHESES and must not appear in external claims | No Lilleri data exists; competitor accuracy numbers are unverified (`US-S65`) |

---

## 9. Open questions

| # | Question | Why it matters | How to verify |
|---|---|---|---|
| 1 | Do Italian multi-account users recognise "transfer pairing" as the WOW, or do they only notice "nothing is double" after a month? | Decides first-session design and the verbatim we test | 10 moderated first-session tests with real consents; ask for the "wow" verbatim unprompted |
| 2 | What auto-pair confidence threshold keeps precision ≥99 % on Italian bank data (SEPA descriptors, same-day legs, cross-provider timestamps)? | Core of WOW and TRUST | Offline evaluation on consented histories; compare against the Wallet transfer model (`IT-D-03`) |
| 3 | What are the real consent windows per Italian bank (90 vs 180 days) and how does each ASPSP signal expiry? | TRUST event #1 | Provider `valid_until` statistics (`PP-` §9 OPEN QUESTION 5) |
| 4 | Does a per-sync report increase or reduce anxiety for non-technical users? | F9 copy design | A/B test of report density; interviews with P3/P4 |
| 5 | What minutes-per-month do Italian mass-market users actually tolerate (the 2/5/15 ladder comes from finance creators)? | J-4 budget | Diary study (P1, P4) |
| 6 | Is "Puoi ancora spendere X €" the right safe-to-spend framing, given Satispay's weekly Budget and Revolut's budgets already exist? | F8 for P3 | Copy tests; interviews |
| 7 | How do XME Banks, Hype Radar and Revolut linked accounts handle transfers and pending today? If they pair transfers, the WOW must be redefined | J-2 | Hands-on checks (synthesis OPEN QUESTION 3) |
| 8 | Which Italian descriptors must be in the payment-type dictionary at launch (top-200 by frequency)? | F13 | Consented-data frequency analysis; public samples (bank statement formats) |
| 9 | What is the incumbents' support-contact rate per connection failure (benchmark for F9)? | Target setting | Ask providers; estimate from review volumes |
| 10 | Later only: does household F11 need shared tags, joint-account deduplication or both after approved sharing/isolation? | Scope | Couple interviews (P2); prototype test |

---

## Sources

All verified on 2026-10-02. Full tables with URLs are in `docs/research/user-pain-points.md` (Sources) and `docs/product/personas.md` (Sources); the entries most load-bearing for this document are repeated here.

| ID | Source | URL | Pub. date | Reliability | Used for |
|---|---|---|---|---|---|
| PP-G-01 | Actual Budget #1628 "Recognise transfers between accounts" (382 up-votes) | https://github.com/actualbudget/actual/issues/1628 | 2023-09-01 | high | Core WOW mechanic; F2 |
| PP-G-02 / G-03 / G-24 | #2590 merge transfers; #2695 auto-identify transfers; #3485 phantom transfer | https://github.com/actualbudget/actual/issues/2590 ; https://github.com/actualbudget/actual/issues/2695 ; https://github.com/actualbudget/actual/issues/3485 | 2024 | high | Pairing prompt; anti-pattern |
| PP-G-04 / G-61 | #2289 respawning deletes, reimbursements; #7158 reimbursable tracking | https://github.com/actualbudget/actual/issues/2289 ; https://github.com/actualbudget/actual/issues/7158 | 2024 / 2026 | high | F2, F11, E4 |
| PP-G-05 / G-36 | #2354 future transactions in balance (70 comments); #2361 exclude future | https://github.com/actualbudget/actual/issues/2354 ; https://github.com/actualbudget/actual/issues/2361 | 2024 | high | F4 |
| PP-G-07 | #4854 GoCardless 4/day limits | https://github.com/actualbudget/actual/issues/4854 | 2025-04-20 | high | AUTOMATE constraints |
| PP-G-10 / G-28 | #3826 EUA expired; firefly #6275 expired agreement 500 | https://github.com/actualbudget/actual/issues/3826 ; https://github.com/firefly-iii/firefly-iii/issues/6275 | 2024 / 2022 | high | TRUST event 1 |
| PP-G-14 / G-15 / G-81 | #8489 no accounts (BCC); #4460 link times out; #6510 Intesa error | https://github.com/actualbudget/actual/issues/8489 ; https://github.com/actualbudget/actual/issues/4460 ; https://github.com/actualbudget/actual/issues/6510 | 2025–26 | high | WOW killers; CONNECT |
| PP-G-19 / G-20 / G-22 | #2519, #3762 duplicates; #8846 Trade Republic duplicates | https://github.com/actualbudget/actual/issues/2519 ; https://github.com/actualbudget/actual/issues/3762 ; https://github.com/actualbudget/actual/issues/8846 | 2024–26 | high | E3, E4, SYNC |
| PP-G-43 | #669 Merge unmatched transactions (121 up-votes) | https://github.com/actualbudget/actual/issues/669 | 2023-02-19 | high | F6 |
| PP-G-50 | #3747 Import historic transactions (90-day limit) | https://github.com/actualbudget/actual/issues/3747 | 2024-10-28 | high | WOW killer |
| PP-G-53 | #1832 Show imported payee | https://github.com/actualbudget/actual/issues/1832 | 2023-10-28 | high | LEARN anti-pattern |
| PP-G-58 | #4324 Scheduled transactions in budget (forgotten recurring) | https://github.com/actualbudget/actual/issues/4324 | 2025-02-06 | high | E5, F7 |
| PP-G-69 / G-68 | #1346 Spend by category (82); #2333 combined list (19) | https://github.com/actualbudget/actual/issues/1346 ; https://github.com/actualbudget/actual/issues/2333 | 2023–24 | high | Main job; F8 |
| PP-G-73 / G-74 / G-60 | #7717 "Bank Sync Offline"; #5742 "contact support"; #4742 internal error after restore | https://github.com/actualbudget/actual/issues/7717 ; https://github.com/actualbudget/actual/issues/5742 ; https://github.com/actualbudget/actual/issues/4742 | 2025–26 | high | F9; TRUST event 2 |
| PP-G-83 / G-84 / G-87 | #8701 silent overwrite; #9063 silent skip (Revolut); #8221 dedup drops legitimate items | https://github.com/actualbudget/actual/issues/8701 ; https://github.com/actualbudget/actual/issues/9063 ; https://github.com/actualbudget/actual/issues/8221 | 2026 | high | F9; TRUST event 4 |
| PP-D-OB-§1 / D-OBA | RTS 2018/389 (art. 10; art. 36(5)(b)); EBA Q&A 2019_4631; Yapily data restrictions | https://eur-lex.europa.eu/eli/reg_del/2018/389/oj ; https://docs.yapily.com/pages/data/financial-data-resources/data-restrictions/ | 2018 / live | high | SCA at bank; refresh caps |
| PP-D-OB-#63 | Enable Banking Italian market page; March 2026 changelog | https://enablebanking.com/docs/markets/it/ ; https://enablebanking.com/blog/2026/04/08/enable-banking-changelogmarch-2026 | live / 2026-04 | high (snippet) | Coverage honesty (J-8) |
| IT-Y-02 | Giuseppe Castagna — "Il metodo con cui traccio i miei soldi (in 5 minuti al mese)" | https://www.youtube.com/watch?v=kJNxDIcJOac | 2025-12-26 | low-medium | Main job; effort ladder; ChatGPT-DIY; read-only reassurance |
| IT-Y-03 | Karim Mejri — "Come gestisco i soldi nel 2026" | https://www.youtube.com/watch?v=J4bio_hsN08 | 2025-03-16 | low-medium | "Works with my banks" bar; month-end ritual |
| IT-Y-04 / Y-05 / Y-32 | Bussola Finanziaria; Bank Station couples; family-budget apps | https://www.youtube.com/watch?v=SRVVdLcDARc ; https://www.youtube.com/watch?v=gLz7l24O0PA ; https://www.youtube.com/watch?v=5NunQ58KlQ8 | 2025–26 | low / low-medium | F10, F11, S1, S2 |
| IT-Y-01 / Y-11 / Y-13 | Revolut IT (no F24/MAV/RAV; "cursed" round-ups); Satispay jar critique; Satispay Budget emphasis | https://www.youtube.com/watch?v=zwCFwhEIV3I ; https://www.youtube.com/watch?v=XN9wKb02nJc ; https://www.youtube.com/watch?v=KhpmCtRp6Gs | 2025–26 | low-medium / medium / low | Anti-jobs; F8, F13 |
| IT-W-01 / W-08 | Hype pays MAV/RAV/PagoPA/F24 in-app; Italian press digests (Garante fine; Revolut incident) | https://github.com/iSte94/EffettoComposto ; https://github.com/p1va/news-in-brief | 2026 | low-medium / medium | F13; E2 |
| IT-V-13 / V-14 / W-12 | Splitwise cap and ads; Tricount export | https://github.com/peanutprotocol/peanutsplit ; https://github.com/SM1LE21/bill-splitting-Website ; https://github.com/canivibecodeit/canivibecodeit | 2026 | medium-low / low | F11, F12 |
| IT-D-03 | Wallet by BudgetBakers MCP reference docs on transfers (observed in session) | no public URL | 2026-10-02 | medium | Pairing model benchmark |
| WS-01 / WS-04 / WS-06 / WS-08 | Hype Radar support page; Intesa XME Banks newsroom (2020); Revolut Italy open banking (Aug 2020); Webank WeConnect | https://support.hype.it/privati/articles/radar-come-monitorare-entrate-uscite-e-piani-risparmio-dei-tuoi-conti ; https://group.intesasanpaolo.com/it/newsroom/tutte-le-news/news/2020/open-banking--attivo-l-aggregatore-finanziario-xme-banks ; https://www.lamiafinanza.it/2020/08/revolut-lancia-lopen-banking-per-i-suoi-oltre-400-000-clienti-retail-e-business-italiani/ ; https://apps.apple.com/it/app/webank/id306283651 | n/d / 2020 / 2020-08 / live | high–medium (snippets) | Aggregation is table stakes |
| WS-07 | Satispay blog "Come impostare il tuo Budget su Satispay" | https://www.satispay.com/it-it/blog/guide-satispay/come-impostare-budget-satispay/ | n/d | high (snippet) | Safe-to-spend mental model |
| WS-11 | Hype review themes; Hype/Sella outage | https://www.sostariffe.it/banche-finanziarie/hype/opinioni/ ; https://tecnologia.libero.it/hype-down-pagamenti-bloccati-per-migliaia-di-utenti-85587 | n/d | low / medium | TRUST event 2 |
| EU-S-02 / S-09a / S-20 / S-21 / S-22 / S-35 / S-49 | Which? (true balance); Snoop feed; Emma Trustpilot ("never learns"); Emma learns after 3 edits; Snoop categorisation complaints; Finanzguru and Dyme contract ledgers | https://www.which.co.uk/money/banking/banking-security-and-payment-methods/open-banking-budgeting-and-saving-apps-aLl3e0g9I7Ft ; https://www.openbanking.org.uk/insights/snoop-budgeting-app-and-savings-account-aim-to-help-build-better-savings-habits/ ; https://uk.trustpilot.com/review/emma-app.com ; https://help.emma-app.com/en/article/change-a-transaction-category-iipyy2/ ; https://www.trustpilot.com/review/snoop.app?page=3 ; https://www.check-app.de/2026/08/09/finanzguru-womit-verdient-die-app-eigentlich-geld-und-was-bekommt-sie-dafuer-von-mir/ ; https://tink.com/press/dyme-tink/ | n/d–2026 | medium-high / medium-high / low-medium / high / low / medium / high | F5, F7, F8, E1, E5 |
| EU-S-05 / S-15 / S-18 / S-41b | Emma FCA AISP; Finanzguru BaFin; Fintonic AISP; iBear privacy | https://www.finextra.com/pressarticle/77549/emma-to-extend-bank-coverage-through-salt-edge-partnership ; https://www.ftd.de/vermoegen/finanzguru-test/ ; https://apps.apple.com/es/app/fintonic-ahorra-y-fin%C3%A1nciate/id672220319?see-all=reviews ; https://ibearsoft.com/privacy.html | n/d–2026 | medium / medium / low-medium / high | E2, S5 |
| EU-S-08 / S-13a / S-17 / S-38 / S-43 / S-45 | Moneyhub closure (CSV export); Spendee IT; Linxo support; Wallet Trustpilot; Monefy; Cleo FTC | https://moneyhubhelp.zendesk.com/hc/en-gb/articles/48275693667217-Moneyhub-App-Closure-and-Your-Account-Options ; https://apps.apple.com/it/app/635861140?see-all=reviews&platform=iphone ; https://fr.trustpilot.com/review/www.linxo.com?page=2 ; https://www.trustpilot.com/review/budgetbakers.com ; https://www.monefy.com/ ; https://www.hunton.com/privacy-and-cybersecurity-law-blog/ftc-reaches-17-million-settlement-with-cash-advance-company-cleo-ai | 2023–26 | high / low-medium / low-medium / low-medium / high / high | F12, F9, F10, anti-jobs |
| EU-S-12 | Italian guides framing apps as "gestione spese" | https://www.money.it/le-15-migliori-app-per-la-gestione-delle-spese | 2025–26 | low | S4 |
| US-S1 / S7 / S12 / S13 / S17 | YNAB: credentials never touch YNAB; What's New (API/export); Trustpilot; Penny Hoarder; accuratereviews | https://support.ynab.com/en_us/how-direct-import-works-H1IGYLgnxl ; https://www.ynab.com/whats-new ; https://www.trustpilot.com/review/ynab.com ; https://www.thepennyhoarder.com/budgeting/ynab-review/ ; https://www.accuratereviews.com/it/software-gestione-finanze/ynab-recensione/ | n/a–2026 | high / high / medium / medium-low / low | E2, F12, E1, anti-jobs |
| US-S25 / S28 / S29 / S37 / S40 / S42 | Monarch: delayed transactions (24 h); transaction review; hidden pending; Trustpilot; Forbes; household | https://help.monarch.com/hc/en-us/articles/360048883651-Troubleshooting-Delayed-Transactions ; https://www.monarch.com/blog/transaction-review ; https://help.monarch.com/hc/en-us/articles/4405041904916-Hiding-or-Unhiding-Transactions ; https://www.trustpilot.com/review/www.monarchmoney.com ; https://www.forbes.com/advisor/banking/monarch-budget-app-review/ ; https://marriagekidsandmoney.com/monarch-money-review/ | 2022–26 | high / high / high / medium / medium / low | WOW timing; F6; S2; trust parity |
| US-S51 / S53 / S54 / S55 / S63 / S64 / S65 | Copilot Intelligence; card payments; Transactions FAQ (clear cache); duplicates; Forbes; Money with Katie; fincomparelab ("95 %") | https://changelog.copilot.money/log/copilot-intelligence ; https://help.copilot.money/en/articles/10671434-credit-card-payment-transactions ; https://help.copilot.money/en/articles/10761907-transactions-faq ; https://help.copilot.money/en/articles/8663179-troubleshooting-account-duplicates ; https://www.forbes.com/advisor/banking/copilot-budget-app-review/ ; https://moneywithkatie.com/copilot-review-a-budgeting-app-that-finally-gets-it-right/ ; https://www.fincomparelab.com/reviews/copilot-money-review/ | 2023–26 | high / high / high / high / medium / low-medium / low | F3, F5, LEARN, anti-patterns |
| US-S73 / S75 / S77 / S78 / S79 / S110 / S113 / S95 / S97 / S72 | Rocket transfers; rules; Trustpilot; College Investor; Ramsey (first value); Empower 30-category cap; re-sync cooldown; Simplifi one rule per payee; Simplifi export; Rocket Premium features | https://help.rocketmoney.com/en/articles/3584527-working-with-credit-card-payments-transfers ; https://help.rocketmoney.com/en/articles/10328100-creating-transaction-rules ; https://www.trustpilot.com/review/rocketmoney.com ; https://thecollegeinvestor.com/22660/rocket-money-review/ ; https://www.ramseysolutions.com/budgeting/what-is-rocket-money ; https://support-personalwealth.empower.com/hc/en-us/articles/115012742188-Create-Custom-Categories-for-Transactions ; https://support-personalwealth.empower.com/hc/en-us/articles/23481877705751-Re-sync-Account-Transactions ; https://support.simplifi.quicken.com/en/articles/3348227-how-to-recategorize-a-transaction ; https://support.simplifi.quicken.com/en/articles/3404263-how-to-export-transactions-from-quicken-simplifi ; https://help.rocketmoney.com/en/articles/2677184-premium-membership-features | n/a–2026 | high–low (see synthesis) | F2, F6, F12, LEARN, AUTOMATE anti-patterns |
| US-S92 / S131 | Simplifi pending 4–6 h; PocketGuard "In My Pocket" | https://support.simplifi.quicken.com/en/articles/5654045-does-quicken-simplifi-download-pending-transactions ; https://www.thepennyhoarder.com/budgeting/pocketguard-review/ | n/a / 2026 | high / medium-low | WOW timing; F8 |
| US-V4 | Plaid Transactions docs (pending→posted linkage) | https://plaid.com/docs/transactions/transactions-data/ | live | high | F4 |
| US-W3 / W6 / W21 | Plaid–YNAB customer story (+21 %/+12 % conversion, −62 % errors); YNAB Trustpilot 4.6/3,103; Simplifi renewal step-up | https://plaid.com/en-gb/customer-stories/ynab/ ; https://www.trustpilot.com/review/ynab.com ; https://www.fincomparelab.com/guides/simplifi-pricing/ | 2025–26 | high (vendor) / medium / low | Benchmarks for F1, trust parity, E6 |
| US-§4.5 / §6.14 | `competitors-us.md` cross-cutting analysis: ratings gap; opaque AI accuracy claims | `docs/research/raw/competitors-us.md` | 2026-10-02 | medium (synthesis) | TRUST definition; LEARN |

End of document.

## Review log

Repository evidence/measurement review — 2026-10-02; no Lilleri production or user-test observations exist.

| Critique | Resolution | Remaining evidence / owner |
|---|---|---|
| MAJOR — job wording and WOW called FACT/validated demand | Job statements and numerical targets HYPOTHESES; cited FACT records a behaviour/request, not representative Italian demand | UX: moderated tasks/diaries and actual retention/pay evidence |
| BLOCKER — first-session complete month, zero tolerance and ≤3-minute sync guaranteed correctness | Partial source intervals explicit; bank snapshot vs independently anchored comparable reconciliation separated; complete-load timing measured separately | Engineering: opening anchors, complete histories, snapshot types/dates and paging/rate evidence |
| MAJOR — ≥95% connector metric conflated login with complete sync | Attempt/auth/load denominators and bank/provider/account strata separate; abandoned starts included | Product/Data: instrument both flows without raw financial telemetry |
| MAJOR — inbox≤3 and “never corrected” could conceal financial errors | Inbox burden evaluated with labelled precision/error sample; non-correction is not correctness evidence | Data/UX: labelled duplicate/pair/classification cases and observed corrections |
| MAJOR — F11/S2 household and deletion≤24h bypassed scope/retention | Household Later; deletion request vs active/backup/processor/legal-hold timelines follows retention model | Counsel/Security: rights/deletion/restore evidence and later sharing controls |
| MAJOR — UI confidence, universal 180 days and quick renewal claims unsupported | Numeric confidence removed; actual lifecycle-driven copy and timing; honest unknown causes and incomplete wallet/card data | UX/Providers: copy/task test and verified provider lifecycle |

**Gate contribution:** conceptual mock core-loop specification ready; Gate F requires user task tests, and A remains unvalidated. **Human blockers:** approved real-data pilot, privacy-safe instrumentation, representative task testing and labelled reconciliation/recurring accuracy evaluation. Synthetic tests demonstrate engine behaviour, not Italian coverage or market demand.
