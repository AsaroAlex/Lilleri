# Lilleri product vision — why it should exist, what it believes, and how the loop, the WOW and the TRUST moments are designed

**Project:** LILLERI (greenfield consumer PFM; Italy-first, then Europe)
**Document type:** Phase 1 product document — vision, thesis, principles, core loop, WOW/TRUST design, automation modes, non-goals
**Date / verification date for every carried-over claim:** 2026-10-02
**Author:** Head of Product + principal architect (product side), founding team
**Language:** documentation in English; product copy, taglines and voice examples in Italian with English glosses.

## How to read this document

- Every variable claim carries a label: **FACT** (cited source seen on 2026-10-02 by the input document named), **ASSUMPTION** (working value, not verified), **HYPOTHESIS** (belief to validate with users or data), **DECISION** (choice proposed here; final only when recorded in an ADR or ratified in the PRD), **OPEN QUESTION / UNKNOWN** (not established; how to verify given).
- Evidence is cited through the synthesized documents and the two raw research notes read in full for this document: `MA` = `docs/research/market-analysis.md`, `OM` = `docs/research/opportunity-map.md`, `PP` = `docs/research/user-pain-points.md`, `PE` = `docs/product/personas.md`, `JTBD` = `docs/product/jobs-to-be-done.md`, `OBP` = `docs/research/open-banking-providers.md`, `DSF` = `docs/research/data-sources-feasibility.md`, `REG` = `docs/compliance/regulatory-landscape.md`, `BM` = `docs/business/business-model.md`, `UE` = `docs/business/unit-economics.md`, `BS` = `docs/brand/brand-strategy.md`, `AI` = `docs/research/raw/ai-ml-transaction-intelligence.md`, `RC` = `docs/research/raw/reconciliation-and-data-model-patterns.md`, plus `PM` = `docs/compliance/privacy-model.md`, `CM` = `docs/compliance/consent-model.md`. Source IDs inside those documents (for example `PP-G-01`, `IT-Y-02`, `US-S51`) are kept so the chain to the original URL stays intact; the ones that carry this document's argument are repeated in the Sources section.
- Priorities applied throughout, in order: trust, data correctness, security, simplicity, automation, reliability, privacy, speed, UX, brand recognition, cost, monetisation, feature count. Revenue must never destroy trust.
- Nothing here is a user-validated fact about Lilleri: no Lilleri users exist yet. Every target number is a HYPOTHESIS to be calibrated in the beta (see `mvp.md`).

---

## 1. The thesis in one page

> **Lilleri keeps your money correctly accounted for, by itself — and you can always see why.**
> *Colleghi i conti una volta. Al resto pensa Lilleri — e ti chiede solo quando ha un dubbio.* ("Connect your accounts once. Lilleri takes care of the rest — and asks you only when it is unsure.") — brand promise, `BS` §2, DECISION.

| Element | Statement | Label / evidence |
|---|---|---|
| The job | "When my money lives in several accounts, cards and wallets, I want one picture that is right without my doing anything, so that I know where my money goes, catch what matters, and stop keeping a spreadsheet." | FACT for the behaviour (`JTBD` §0; `IT-Y-02`, `IT-Y-03`); the target user holds 3–5 institutions and reconciles them by hand at month-end |
| What is broken today | The same five failure modes dominate every market and every app: connections break (22 independent sources), duplicates (16), consent expiry experienced as random breakage (11), transfers and card settlements not paired (10; the single most up-voted request in open-source PFM, 382 votes), categorisation that "never learns" (10), transactions silently missing (10) | FACT (`PP` §0.1, §1 #1–#6) |
| What is already solved | "See all accounts in one place" — Intesa XME Banks since 2020, Hype Radar, Revolut linked accounts, Webank | FACT medium (`PP` I-13, `MA` §6); it is table stakes in Italy, not a differentiator |
| What nobody does in Italy | Cross-institution reconciliation (pending→booked, duplicates, transfers, card settlements, refunds), per-user learning with explicit rules that win, a review inbox, visible consent management, Italian payment semantics (F24, MAV/RAV, PagoPA, SDD, ricarica Postepay) | UNKNOWN for incumbents' depth (none documents it); HYPOTHESIS that they do not (`MA` §6 conclusions; `OM` §3) |
| The wedge | **Reconciliation correctness and visible learning**, not feature breadth and not "AI" | DECISION (`PP` D1; `MA` §10.1; `OM` §1) |
| The product in one sentence | A six-stage loop — CONNECT → SYNC → UNDERSTAND → CORRECT ONLY WHEN NECESSARY → LEARN → AUTOMATE — where every automatic action carries a reason and an undo, and the empty Review Inbox is the hero state | DECISION (`JTBD` §4, J-1; `OM` §5.2) |
| Why now | Mint's death re-formed the market around paid PFMs (Monarch $100M ARR); European survivors run a generous free core plus an aligned second rail (Finanzguru >3M users); Italian open banking is mature but uneven (CBI Globe >700M API calls; CRIF 57.4% connection success); 2026 trust events (Revolut data disclosure, Garante €12.5M fine on Poste's apps) make "who sees my data" a live purchase criterion | FACT (`MA` §1.5–§1.8, T1, T4, T8) |

The internal one-liner for decks and hiring: *your money, correctly accounted for, by itself* (`BS` §2).

---

## 2. Why Lilleri should exist (the answer, and what it is not)

The task brief forbids "because it uses AI" as the answer, and the evidence agrees: no user in any source asks for AI; they ask for correctness and for less work (`MA` §8.1, FACT). AI appears in the evidence only as (a) the mechanism Copilot uses to learn per user, which users praise (`US-S51`), (b) marketing noise, and (c) a workaround Italians practise by pasting a Revolut export into a temporary ChatGPT chat (`IT-Y-02`).

| # | Argument | Evidence | Label |
|---|---|---|---|
| 1 | **Multi-institution living is the norm for the target and growing.** 48.1M current accounts at end-2024; >5M Revolut Italian customers (May 2026) mostly alongside a primary bank; 6.5M Satispay users; >10M Postepay Evolution cards with an IBAN | `MA` §3.1 (NEW-1, NEW-5, NEW-6, IT-W-02); creator stacks `IT-Y-02/Y-03` | FACT (medium) for counts; FACT (low-medium) for behaviour |
| 2 | **Cross-institution correctness is nobody's job.** A bank app can show another bank's balance, but a bonifico from Fineco to Revolut is two transactions in two ledgers; a card settlement is a debit on the account and a credit on the card; a refund is an inflow that belongs to an old expense. Plaid documents that pending→posted linkage is delivered by the aggregator, so the failures are app-side | `MA` §7.2; `PP` #4, #9, #15; `US-V4` | FACT |
| 3 | **The trackers that reach Italy are generic and fragile.** Wallet/Spendee/Plum IT reviews: sync "almost never works", three weeks to connect, six weeks without data, support "non-existent" | `PP` I-2 (`EU-S-13a`, `EU-S-38`, `EU-S-11`) | FACT (low-medium) |
| 4 | **Categorisation must learn the user's merchants and Italy's payment types.** Fixed taxonomies produce "sums that bore no relation to reality"; Emma claims to learn after three edits and reviewers say it "never learns"; Italian creators write manual rules for a local supermarket | `PP` #5, #18; `EU-S-20/S-21/S-22`; `IT-Y-02` | FACT |
| 5 | **Users price effort in minutes per month and leave tools that cost more.** The Italian ladder is 2 min (ChatGPT on an export), 5 min (sheet), 15 min (Wallet); "too much manual work" is a churn reason for YNAB and Actual users | `IT-Y-02`; `PP` §5 | FACT (low-medium / FACT) |
| 6 | **Trust is won by boring, verifiable things and lost by billing and support.** App-store ratings 4.5–4.9 vs Trustpilot/BBB 2.0–3.5 for the same products; YNAB is the exception thanks to honest billing; what reassures is a named regulated aggregator, read-only, SCA at the bank, export, deletion | `PP` §0.3, §6; `US-§4.5`, `US-W6` | FACT |
| 7 | **Portability and survivorship.** Users have been stranded by Mint, Moneyhub, Spiir, Oval Money, Yolt, Grip, the Postepay app and the GoCardless free tier; a bank-independent ledger with export is the only place history survives a change of bank | `PP` #11, #22; `MA` §7.7 | FACT |
| 8 | **Italian money is not US money.** Cash >60% of POS transactions by number; prepaid-as-primary; F24/MAV/RAV/PagoPA/bollettini/SDD; bimonthly utilities, TARI instalments, semiannual insurance; couples with personal accounts plus a joint account | `MA` NEW-3; `PP` §2.7 I-14…I-17 | FACT / ASSUMPTION mix |

**Honest counter-arguments (and why we proceed anyway):**

| Counter-argument | Evidence | Mitigation | Label |
|---|---|---|---|
| Aggregation cost killed Mint and every European subscription-only D2C PFM | `MA` §8.4; `UE` §0 (AIS is 80–85% of per-user COGS at Base and UNKNOWN until the RFP) | Free tier bounded (1 institution, ≤2 accounts) with a guardrail; Plus from day one; a disclosed, opt-in second rail planned before scale; never ads, lending or data sale | DECISION (`BM` D-BM-1, D-BM-4) |
| Incumbents could ship reconciliation inside XME Banks or Hype | `MA` §6 (depth UNKNOWN) | Verify depth now (Gate A condition 2); differentiate on per-user learning data and bank-independence | OPEN QUESTION |
| Connector quality is outside our control (57.4% success; Intesa limits; missing card accounts) | `MA` NEW-4; `OBP` §1.3–1.4 | Provider-agnostic connector layer, two adapters, per-bank health page, honest coverage per account type, CSV import as a first-class path | DECISION (`OBP` D7–D8) |
| Italian willingness to pay for a PFM is unproven | `MA` §3, §9 | Phase 1 price test; free core generous enough to retain non-payers as learning contributors | OPEN QUESTION |
| Banca d'Italia's position on an unlicensed B2C recipient under a provider's licence is unknown | `OBP` §2.2 L1; `REG` OQ1 | Counsel engaged (P0); Fabrick (Banca d'Italia-supervised) kept open in parallel | UNKNOWN (P0) |

**Verdict (DECISION, consistent with `MA` §8.2):** the founding hypothesis "le tue finanze si organizzano da sole" holds with one amendment — automation is trusted only when it is visible and correctable. The promise is therefore **"si organizzano da sole — e tu vedi sempre perché"** ("they organise themselves — and you can always see why").

---

## 3. Principles

The six principles below are the design constitution. Each is stated as a rule, with what it means in practice, what it forbids, and how we will know it is being kept. Corollaries that follow from the priority order close the section.

### P1 — Zero setup must be a complete path

| | |
|---|---|
| Rule | A user who connects one institution and does nothing else must get a correct, useful picture — balances equal to the bank's, transfers paired, subscriptions listed, categories with a reason, one safe-to-spend number — without creating a category, choosing a budget method, writing a rule or entering a card. |
| Why | Value gated behind configuration is the documented anti-pattern (YNAB 2–4 weeks to feel comfortable, Monarch's trial "too short to finish setup"); Italians abandon spreadsheets and "1000 apps" (`PP` #23; `OM` §2.1; `IT-Y-02`). FACT |
| What it forbids | Any mandatory step between "consent at the bank" and "the first picture" other than the three legally unavoidable asks (T&Cs, bank consent, third-party-AI permission — `CM` §3); empty states that say "add a category to begin"; onboarding wizards for budgets. |
| What it allows | Optional configuration *after* value, proposed from evidence ("Da ora Conad → Spesa alimentare?"); manual fallbacks that take ten seconds for sources that cannot connect (`PE` PD-4). |
| How we test it | Steps-to-value = 3 (install, consent at the bank, read the summary); time from last connection to the month view ≤ 3 minutes (HYPOTHESIS, `JTBD` §5.3); onboarding completion as a tracked metric (`mvp.md` §5). |

### P2 — Infer first, ask second

| | |
|---|---|
| Rule | Lilleri reads what the bank already said before it asks the user anything: the payment kind from the descriptor and the CBI causale, the merchant from the normalised string, the transfer from the counterparty IBAN, the subscription from the mandate reference. A question to the user is the last resort, and it carries what Lilleri already believes. |
| Why | Italian exports expose stable channel keywords (`PAGAMENTO POS`, `ADDEBITO SDD`, `BONIFICO`, `PRELIEVO`, `PRE-ADDEBITO`), delimiters before the merchant text, and bank-provided labels (`Moneymap`, `Categoria`, `CAUSALE_ABI`) that deterministic rules resolve for most rows (`AI` §1.3, FACT); SDD `mandato nr.` and creditor id are the strongest subscription keys (`AI` §3; `RC` §1.1). |
| What it forbids | Asking "what is this?" without a candidate answer; asking the same question twice for the same merchant; asking about a row whose kind is structurally determined (fees, stamp duty, ATM cash, card settlement, F24). |
| How we test it | Share of transactions resolved with a `kind` deterministically (target ≥ 90%, HYPOTHESIS); every inbox card shows a proposal with a reason; repeat-question rate for the same merchant → 0 after one answer. |

### P3 — Complexity in the system, not in the UX

| | |
|---|---|
| Rule | The ledger, the identity strategy, the state machines, the calibration, the evidence records live in the backend. The user sees one list, one inbox, one number and one page about their data. The machinery is visible only as a one-line "why" and an undo. |
| Why | The most-loved apps are narrow and loop-shaped; the ones that expose their plumbing ship "clear the cache" as the fix (`US-§4.1`; `OM` §1.2). Correct money requires `bigint` minor units, three dates, immutable provider records, fingerprints with ordinals, locked fields and append-only events (`RC` §0, §3–§5) — none of which the user should ever name. |
| What it forbids | Settings that expose thresholds, tiers or model names; error states that name HTTP codes; a "sync log" the user must read to trust a balance; branded nouns for every tab (`BS` §8). |
| How we test it | Every automated decision renders to one Italian sentence from its evidence record without an LLM (`RC` §5, §9.2); number of distinct screens in the core loop ≤ 6; no consumer string contains "PSD2", "AISP", "API", "sync" or "ledger" except on the consent and trust pages where the law requires them, always with a plain gloss (`BS` §10). |

### P4 — Precision before automation aggressiveness

| | |
|---|---|
| Rule | **92% auto + 8% review beats 99% "auto" with 5% hidden errors.** Lilleri optimises the error rate of what it applies silently, not the share it applies. Thresholds are chosen to hit a target *auto-apply error rate* per decision type and per automation mode, and the review rate is reported as the cost of that target. Below threshold, Lilleri prefers "needs review" over a wrong label. |
| Why | A hidden error costs a trust event (a wrong balance, a transfer counted as income, a phantom record) that users discover weeks later and that drives churn reason #1, "cannot trust the numbers" (`PP` §5; `PP-G-84`); a review costs one tap. Maybe/Sure prompt the model to "favor null over false positives" (`AI` §2.4, FACT); opaque "95% accurate" claims are a documented trust risk (`US-§6.14`). Calibration (Platt/isotonic per tier, reliability diagrams, Brier) exists precisely to make a threshold mean something (`AI` §2.6, FACT). |
| Arithmetic (illustration, ASSUMPTION) | On 150 transactions a month: 99% auto with 5% hidden errors ≈ 7 wrong rows nobody sees, each a potential balance or spend distortion; 92% auto with ≤2% auto-error ≈ 3 wrong rows plus 12 one-tap reviews ≈ 60–90 seconds. The second is inside the five-minute monthly budget (`JTBD` J-4) and keeps the numbers believable. |
| What it forbids | Hardcoded thresholds; a single global threshold for every decision type; raising automation by lowering precision; silently applying anything whose score is below the calibrated threshold; claiming an accuracy number in marketing before it is measured (`BS` D6). |
| How we test it | Auto-error rate per decision type ≤ target (BALANCED: ≤ 2%, HYPOTHESIS); review rate reported next to it; weekly re-calibration; shadow mode for any new tier or model before promotion (`AI` §2.8). |

### P5 — Explicit rules beat AI

| | |
|---|---|
| Rule | Resolution order for every category decision: **explicit user rule > learned deterministic preference > high-confidence personalised model > global classification > LLM suggestion > Needs Review.** A user's correction is never overwritten by automation; locked fields stay locked; a rule proposed from a correction is visible, editable and free on every tier. |
| Why | "Never learns" is the categorisation complaint with the broadest support (`PP` #5); learning that is invisible is not believed (`EU-S-20` vs `EU-S-21`); gating rules and categories behind paywalls is the most resented paywall in the EU set (`PP` #14; `BM` D-BM-2). Sure's `locked_attributes` pattern — automation skips any attribute the user set — is the implementation precedent (`AI` §2.8, FACT). |
| What it forbids | A model "correcting" a user; a rule limited to one per payee (Simplifi) or capped (Empower 30 categories); a learned preference that cannot be seen or deleted; AI as a persona rather than a mechanism (`BS` §10 "AI theatre"). |
| How we test it | Repeat-correction rate for the same merchant → 0 after the first rule (`JTBD` §7 F5); rule-override rate (rules the user later deletes) tracked; 100% of corrections create a `ledger_event` with actor = user and lock the field. |

### P6 — Everything AI does is reversible, explainable, traceable

| | |
|---|---|
| Rule | Every automated write is an append-only event with actor (`rule:<id>@<v>`, `model:<name>@<v>`, `provider:<name>`), a stored evidence record (features, score, threshold version, candidates considered) and a compensating undo. Every surface that shows an automated result can show its "why" in one line. Rejections are remembered so undone matches are never re-proposed. |
| Why | Silent automation is the trust-killer with the most direct evidence: hidden pending that reappears, invented transfer counterparts, silent skips and overwrites (`US-S29`; `PP-G-24`, `G-83`, `G-84`, `G-87`); Maybe's `RejectedTransfer` is the negative-memory precedent (`RC` §5, FACT); Cass. 14381/2021 (Mevaluate) holds that consent to algorithmic scoring is invalid unless the logic is knowable, and the Garante expects a correction path (`PM` §5.2 S8). |
| What it forbids | Hard deletes of user-visible state by automation; AI outputs without a stored provenance; "95%" shown as a bare number; a model that moves money or calls tools beyond read-only queries. |
| How we test it | 100% of automated decisions below score 1.0 are renderable in the inbox with a human explanation generated from features (`RC` §9.2); undo works for every decision type in the test fixtures (`RC` §9.3); batch undo per sync run. |

### Corollaries from the priority order (DECISION)

| # | Corollary | Source |
|---|---|---|
| C1 | **No silent failure, ever.** Every sync produces a human-readable report naming the bank, the cause and the next retry; "sync offline" and "internal error" are banned strings. | `PP` D4; `JTBD` §6 |
| C2 | **Nothing in the loop moves money.** Read-only bookkeeping; no round-ups, auto-saves, agents or payment initiation in any mode. | `MA` §10.9; `OM` §4.1; `IT-Y-01` |
| C3 | **Correctness, security, privacy and portability are never paywalled.** Categorisation, learning, rules, inbox, reconciliation, consent management, export, deletion are free on every tier. | `BM` D-BM-2 |
| C4 | **Italian money is modelled as it is.** Prepaid IBANs as primary accounts; wallets (Satispay, PayPal) as accounts whose top-ups are transfers; cash wallet funded by ATM withdrawals; bimonthly/quarterly/semiannual periodicities; F24/MAV/RAV/PagoPA/SDD as typed kinds. | `PP` D8; `OM` §2.8, §2.16 |
| C5 | **Honest coverage is part of CONNECT.** Unreachable sources (credit cards of UniCredit/Mediolanum/Crédit Agricole, Amex IT, Satispay, Hype) are shown as such before the user tries, with a ten-second manual fallback. | `JTBD` J-8; `OBP` D8 |
| C6 | **Do not infer anything in the special categories.** The taxonomy contains no health/religion/politics/union/sex-life inference; a protected "quiet set" is excluded from insights, chat, analytics and model datasets; any category can be hidden. | `PM` §5.2 S1–S7 |

---

## 4. The core loop

**CONNECT → SYNC → UNDERSTAND → CORRECT ONLY WHEN NECESSARY → LEARN → AUTOMATE.** The loop is the product's information architecture: every screen, notification and metric belongs to one stage (`JTBD` J-1, DECISION).

| Stage | What the system does | What the user sees (Italian copy, draft) | Invariant | Primary signal |
|---|---|---|---|---|
| **CONNECT** | Provider-agnostic connector; consent as a first-class object (provider named, read-only, expiry read from the provider, never assumed); coverage per account type; CSV/manual fallback | *"Per leggere i tuoi movimenti, Lilleri usa [Provider], un intermediario autorizzato e vigilato da [Autorità]. Lilleri vede solo saldi e movimenti: non può muovere denaro. Il collegamento dura 180 giorni, poi ti chiederemo di rinnovarlo."* ("To read your transactions Lilleri uses [Provider], an authorised intermediary supervised by [Authority]. Lilleri only sees balances and transactions: it cannot move money. The connection lasts 180 days, then we will ask you to renew it.") | Never asks for bank credentials; never promises a bank or account type that does not connect | Connection success per institution; consent completion ≥ 85% of starts (HYPOTHESIS) |
| **SYNC** | Fetch within the 4×/24 h budget plus user-present refresh on open; immutable provider records; layered identity (provider-stable id → vendor id → fingerprint + ordinal → fuzzy window); pending→booked, duplicate, transfer, settlement, refund passes; balance check against the provider's balance | *"Aggiornato alle 07:41 — Intesa, Fineco, Revolut. 14 movimenti nuovi, 1 giroconto riconosciuto, 1 addebito carta abbinato, 2 in attesa, 0 saltati. Prossimo aggiornamento alle 13:00."* ("Updated at 07:41 — … 14 new, 1 transfer recognised, 1 card debit matched, 2 pending, 0 skipped. Next update at 13:00.") | Zero silent skips; balance equality or an inbox item; a pair is never created by inventing a leg | Duplicate rate; pairing precision/recall; % accounts with balance = bank |
| **UNDERSTAND** | Kind + category with provenance; recurring detection with Italian periodicities; insights with source data, calculation, confidence; safe-to-spend from reconciled data only | *"Ottobre finora: 1.240 € spesi. Casa 540 €, Spesa 310 €, Trasporti 95 €. In arrivo: Hera ≈140 € (12 ott), TARI 187 € (14 ott). Puoi ancora spendere 612 € fino al 31."* | No estimate presented as a fact; every category shows a one-line "why" | % auto-categorised never corrected at day 30; recurring next-date error |
| **CORRECT ONLY WHEN NECESSARY** | Review Inbox receives only what is below threshold or structurally ambiguous; one or two taps per correction; undo stack; empty state is the goal | *"2 movimenti da rivedere."* → *"SUMUP *BAR CENTRALE 3,20 € — Caffè e bar? (probabile)"* → *"Niente da fare. Tutto è al suo posto."* ("Nothing to do. Everything is in its place.") | Inbox items ≤ 3 after the first sync; no approve-everything; no ads, no upsell in the inbox | Minutes per month in the inbox (< 5); one-tap resolution rate |
| **LEARN** | Each correction writes an event, locks the field, proposes a rule, updates the per-user merchant map and index, and (with consent, pseudonymised) the eval set | *"D'ora in poi 'CONAD CITY VIA ROMA' andrà in Spesa alimentare. Regola creata — la trovi in Impostazioni › Regole."* | Explicit rules win; learning visible after one correction | Repeat-correction rate → 0; % corrections that create a rule |
| **AUTOMATE** | Consent-renewal cadence (day 150/170/178), bill and price-change alerts, monthly summary, automation mode adjusts with measured override rate | *"Il collegamento con Intesa scade tra 9 giorni — rinnova in 30 secondi dall'app Intesa."* / *"Spotify è passato da 10,99 a 11,99 €."* | Nothing moves money; every nudge is opt-out-able; no nudge triggered by distress signals (AI Act Art. 5 posture, `REG` §4.3) | % consents renewed before expiry (≥ 80%); nudge opt-out rate |

**Loop invariants (DECISION, carried from `JTBD` §4):** (1) never configure before value; (2) nothing moves money; (3) every automatic decision carries a reason and an undo; (4) a failure anywhere is surfaced in the user's language in the same session; (5) correctness features are never paywalled.

---

## 5. The WOW moment

### 5.1 Definition (DECISION, carried from `JTBD` §5.1)

> **WOW = the first time Lilleri shows a picture of the user's month that is *right* across institutions with nothing to fix: balances equal to the banks', transfers between own accounts paired and hidden, card settlements netted, subscriptions and bills listed with next dates, categories with a "why" — reached in the first session, within minutes of the last connection.**

Target verbatim to listen for in interviews (HYPOTHESIS): *"Ha capito da solo che quei 200 € erano un giro tra i miei conti."* ("It worked out by itself that those €200 were a move between my accounts.")

### 5.2 Why this and not "all accounts in one place"

| Candidate | Verdict | Reason |
|---|---|---|
| All accounts in one place | Table stakes | Intesa XME Banks, Hype Radar, Revolut, Webank already sell it (`PP` I-13, FACT medium) |
| It found my forgotten subscriptions | Part of WOW | Loved (Finanzguru, Rocket) but Revolut's Subscriptions hub approximates it; does not prove *correctness* |
| **It paired my transfers and nothing is double** | **Core of WOW** | 382 up-votes for the mechanic; manual fixing "creates a mess of duplicates"; no Italian incumbent demonstrably does it (`PP-G-01`) |
| The monthly picture appears in 30 seconds | Part of WOW | The ChatGPT-DIY output Italians produce by hand (`IT-Y-02`) |
| Balance matches the bank to the cent | Precondition | Mismatch is how users discover silent errors (`PP-G-84`); on its own it is a TRUST signal |
| It categorised my local bar correctly | Part of WOW | Delightful if the "why" is shown; a trust risk if opaque |

### 5.3 Measurable definition (HYPOTHESIS; calibrate after the first 200 consented users)

A first session counts as a WOW session when all hold: (1) ≥ 2 institutions connected; (2) every connected account's booked balance equals the bank's (tolerance 0); (3) every transfer pair with score ≥ the auto-pair threshold is paired and no leg appears in spend or income; (4) Review Inbox ≤ 3 items; (5) last connection → month view ≤ 3 minutes.

| Range | Low | Base | High |
|---|---|---|---|
| WOW-session rate among multi-institution first sessions | 35% | 50% | 65% |
| Time to first correct picture (p50) | 5 min | 3 min | 90 s |

Leading signals: WOW-session rate, time-to-first-correct-picture. Lagging: D7/D30 retention and trial-to-paid of WOW vs non-WOW cohorts (anchor: Plaid reports +21% UK / +12% EU conversion for YNAB after a provider switch — vendor claim, `US-W3`).

### 5.4 Design of the moment (DECISION)

1. The first screen after the last consent is **"Cosa ho capito"** ("What I understood"): a sync report in plain Italian, then the month picture, then the inbox count. It names what Lilleri could not connect and what it will learn going forward (90-day history stated explicitly: *"Vediamo gli ultimi 3 mesi subito e impariamo da qui in avanti."*).
2. Paired transfers are shown **once as a single movement** with the two accounts and a tiny undo, not as two hidden rows: the user must *see* the pairing to feel it.
3. Single-institution users get the **fallback WOW**: subscriptions with next dates plus the safe-to-spend number, and a nudge to add a second institution with the pairing benefit explained (`JTBD` J-7).
4. What kills the WOW is treated as a release blocker: first-import duplicates, a phantom transfer, a bank listed as supported that does not connect, an unstated 90-day history, a confident wrong label on an Italian payment type, any setup step before the picture (`JTBD` §5.4).

---

## 6. The TRUST moment

### 6.1 Definition (DECISION, carried from `JTBD` §6.1)

> **TRUST = the first time something goes wrong — a consent expires, a bank is down, a transaction is ambiguous, a balance does not match — and Lilleri tells the truth, in Italian, before the user notices, with one action to fix it and no consequence they did not choose.**

The evidence says the failure path, not the happy path, decides retention: churn reasons #1 and #2 are "cannot trust the numbers" and "the connection keeps breaking" (`PP` §5); the ratings gap between app stores and Trustpilot is billing and support, not features (`US-§4.5`).

### 6.2 The four trust events as designed flows

| Event | Today (FACT) | Lilleri (DECISION) | Italian copy (draft) |
|---|---|---|---|
| **Consent expiry** | 400/500 errors, "sync offline", silent stop; nobody warns in advance (`PP` #3) | Countdown per connection; inbox item at day 150, push at 170, banner at 178; expired = "in pausa", never red; one-tap batch renewal; gap handling with CSV import offer (`CM` §5.2) | *"Il collegamento con Intesa scade tra 2 giorni. Rinnova ora: 30 secondi nell'app Intesa, poi tutto riprende da solo."* |
| **Bank / provider outage, rate cap** | "Contact support" with no cause; re-sync disabled for a week (`PP-G-74`; `US-S113`) | Name the bank, the cause (maintenance, provider error, daily cap, 14-day paging in progress) and the next retry; show the last good update; user-present refresh offered | *"Intesa Sanpaolo non risponde (manutenzione). Ultimo aggiornamento riuscito: ieri 22:10. Riproviamo alle 13:00; se vuoi, aggiorna ora."* |
| **Ambiguity** | Silent wrong guess that never learns; phantom record (`EU-S-20`; `PP-G-24`) | An inbox card with the belief, the confidence in words, the alternative; no action taken below threshold | *"Non siamo sicuri: 'TRF SEPA 200 €' è un trasferimento al tuo Revolut? Sì / No, è una spesa."* |
| **Balance mismatch / skipped item** | Discovered weeks later (`PP-G-84`) | Mismatch is an inbox item with amount and candidate cause; skipped items listed in the sync report; re-fetch of a trailing window | *"Il saldo Revolut differisce di 5,00 € da quello della banca. Potrebbe mancare un movimento del 30 set — lo abbiamo richiesto di nuovo."* |

### 6.3 Preconditions and killers

Preconditions (FACT-based, `JTBD` §6.3): consent screen names the licensed AISP, says read-only, redirects to the bank for SCA; export and deletion free, one tap, every tier; a "what we store, who we send it to, what happens if Lilleri closes" page; no trial converts without a reminder, no renewal step-up; nothing ever moves money; a human answers when a bank link breaks.

Trust killers (DECISION — release blockers): silent skips/overwrites; "clear the cache" as advice; a connect flow that asks for bank credentials; a charge the user was not reminded of; a bank listed as supported that does not connect; an automation that moved money; a shutdown without export; an upgrade prompt inside the inbox or on a failure screen (`BM` D-BM-3).

### 6.4 Measurement (HYPOTHESIS)

| Measure | Low | Base | High |
|---|---|---|---|
| Consents renewed before the connection stops | 65% | 80% | 90% |
| Outages where the user saw the explanation before contacting support | 70% | 85% | 95% |
| Support contacts per 100 connection failures | 30 | 20 | 10 |
| Trustpilot vs app-store gap at month 12 | ≤ 1.5 | ≤ 1.0 | ≤ 0.5 |
| Users who export at least once and are still active 30 days later | — | tracked | — |

---

## 7. Automation modes: AUTOPILOT / BALANCED / CONTROL

Automation is a dial the user holds, not a promise Lilleri makes. The three modes change **how much Lilleri applies silently**, never **what it may do** (nothing moves money in any mode) and never **what wins** (explicit rules and locked fields win in every mode).

### 7.1 Definitions (DECISION; thresholds and shares are HYPOTHESES)

| | **CONTROL** — *"Decido io"* ("I decide") | **BALANCED** — *"Chiede se ha un dubbio"* ("Asks when unsure") — **default** | **AUTOPILOT** — *"Decide Lilleri"* ("Lilleri decides") |
|---|---|---|---|
| Who it is for | Users who want to see every decision (YNAB-style "sense of control", `US-S12`); first weeks after a bad experience elsewhere | Most users; the mode the WOW is designed for | Users with a stable, repeating stack and a measured low override rate |
| Auto-applied silently | Only deterministic outcomes: explicit rules; `EXACT_ID`/`PROVIDER_LINK` dedup; pending→booked with provider link or exact amount+date; transfer pairs with own-IBAN match and exact amount; structural kinds (fees, interest, stamp duty, ATM cash, card settlement descriptor, F24/PagoPA) | Everything whose calibrated score ≥ θ(d, BALANCED), with θ chosen for a target auto-error rate per decision type | Everything whose score ≥ θ(d, AUTOPILOT), a looser target; still never below the tier's abstention floor |
| Target auto-apply error rate ε (per decision type) | ≤ 0.5% | ≤ 2% | ≤ 4% |
| Goes to the Review Inbox | Every non-deterministic category, pairing, duplicate, refund, recurring flag | Below-threshold decisions; new merchants above a user amount threshold; structural ambiguities (transfer without evidence, duplicate without id, refund candidate, price change, balance mismatch, consent expiry) | Only structural ambiguities and balance/consent events; everything else is applied and listed in a weekly **"Fatto da solo"** ("Done on its own") digest with one-tap undo per item |
| Expected review share of new transactions (steady state) | 25% / 40% / 55% (L/B/H) | 5% / 10% / 15% | 1% / 3% / 5% |
| Notifications | Per sync: "N da rivedere" | Only when the inbox is non-empty or a trust event occurs | Weekly digest + trust events only |
| Learning | Same in all modes: every confirmation and correction feeds rules, merchant map, index | Same | Same |
| Suggested switch | Offered if the user's override rate on auto decisions exceeds 2ε over the last 50 decisions | — | Offered after ≥ 30 reviewed items with override rate < ε over the last 100 auto decisions (Copilot's "active after ~30 reviews" is the benchmark, `US-S51`) |

Italian labels are HYPOTHESES for a copy test; the internal names are AUTOPILOT / BALANCED / CONTROL. Vocabulary to avoid: "Autopilot" as a product name (Cleo's money-moving feature; `MA` T2) and "AI/smart/boost" (`BS` §4).

### 7.2 How thresholds are set (DECISION; mechanics in `prd.md` §4.9)

- Each decision type `d` ∈ {category, transfer_pair, pending_to_booked, duplicate_merge, refund_of, card_settlement, recurring_flag, subscription_flag} produces a **calibrated** score `s ∈ [0,1]` from the tier that resolved it (rules = 1.0 by construction; linear/Bayes via Platt then isotonic once > 1,000 labels per bank exist; kNN via a distance sigmoid; LLM via agreement features, schema validity and, where available, log-probability margins — `AI` §2.6).
- `θ(d, mode)` is the smallest threshold on the evaluation set (frozen test split plus rolling, consented, pseudonymised feedback) at which the measured auto-error rate ≤ ε(mode). Thresholds are **configuration with a version**, re-fitted weekly, never literals in code.
- Cold start: thresholds from the offline Italian eval set, marked provisional and conservative; a per-user adjustment widens θ when the measured override rate exceeds 2ε.
- Every decision stores `score`, `threshold_version`, `tier`, `mode` on its event, so "why was this applied?" is always answerable and a threshold regression can be rolled back by version.

### 7.3 What never changes across modes (DECISION)

Nothing moves money. Explicit rules win. Locked fields are never overwritten. Every applied decision has an undo and a "why". Trust events (consent expiry, outage, mismatch) always reach the user. A pair is never created by inventing a leg. Deleted duplicates do not respawn (negative memory). Quiet-set categories are never used in nudges. Modes are free on every tier.

---

## 8. Non-goals (what Lilleri is not)

| # | Non-goal | Why (evidence) | Label |
|---|---|---|---|
| 1 | Moving money: round-ups, auto-saves, agents that pay, payment initiation | Silent money movement is "cursed" to Italian creators (`IT-Y-01`); agents raise FTC/AGCM exposure (Cleo, Rocket; `EU-S-45`, `US-S77`); trust is priority 1 | DECISION |
| 2 | Lending, cash advance, credit scores, insurance brokerage, investment advice | Fintonic and Cleo became lenders and stopped being PFMs; OAM/IVASS/MiFID reservations (`REG` §4.6) | DECISION |
| 3 | A chat-first interface | Users want the output, not a prompt (`IT-Y-02`); chat is a Later feature grounded in deterministic tools, never the product | DECISION |
| 4 | Zero-based envelope budgeting as a method to learn | YNAB's 2–4-week learning curve is a churn driver (`US-S13`); one safe-to-spend number plus watchlists covers the job | DECISION |
| 5 | Replacing the bank app for payments (F24, MAV/RAV, PagoPA) | Hype and Poste already pay them in-app; Lilleri *understands* them | DECISION |
| 6 | Ads, contextual ads, data sale, affiliate steering inside the product surfaces | Mint's free model died; Snoop's data sale and Emma's offers are the opposite model; no ads in the inbox ever (`BM` D-BM-4) | DECISION |
| 7 | Bill negotiation / cancellation concierge with success fees | Collapsed Rocket's Trustpilot (`US-§6.1`) | DECISION |
| 8 | Investment analytics and portfolio tooling | Over-built for the job; FIDA not in force; balances only (`OM` §2.22) | DECISION |
| 9 | Screen scraping, credential storage, SMS reading, accessibility scraping, unofficial APIs | Illegal, policy-hostile or catastrophic for trust (`DSF` §12 "Never") | DECISION |
| 10 | Mascots, gamification, confetti, "AI/smart/magic" vocabulary | Incompatible with calm-premium positioning and with the trust problem (`BS` §10) | DECISION |
| 11 | Lifetime deals, pay-what-you-want sliders, daily caps, 7-day or card-up-front trials | Each is a documented complaint (`OM` §4.10) | DECISION |
| 12 | Claiming accuracy numbers before they are measured | Opaque "95%" claims are a trust risk (`US-§6.14`); `BS` D6 | DECISION |

---

## Decisions / Recommendations

| ID | Decision / recommendation | Label | Needs ADR? |
|---|---|---|---|
| V-1 | Position on correctness and effort, not on AI; promise "si organizzano da sole — e tu vedi sempre perché"; "AI" appears only as the explanation of how categorisation learns | DECISION | No (brand) |
| V-2 | Adopt the six principles P1–P6 and corollaries C1–C6 as the design constitution; every PRD story cites the principle it serves | DECISION | Yes — principles that constrain architecture (P4 calibration, P5 precedence and locks, P6 events/evidence) |
| V-3 | The six-stage loop is the information architecture; every screen, notification and metric is assigned to one stage | DECISION | No |
| V-4 | WOW = first correct cross-institution picture with nothing to fix; instrument WOW-session rate and time-to-first-correct-picture from day one; single-institution fallback WOW | DECISION | No |
| V-5 | TRUST = first failure handled honestly; the four trust events are designed flows with their own copy, telemetry and release criteria; the trust-killer list is a release gate | DECISION | No |
| V-6 | Three automation modes with per-mode target auto-error rates (0.5% / 2% / 4%), BALANCED default, calibrated versioned thresholds, mode-independent invariants | DECISION (targets HYPOTHESIS) | Yes — automation policy and calibration service |
| V-7 | Non-goals 1–12 are stated publicly where they are promises (no money movement, no ads, no lending, no data sale) | DECISION | Business-model ADR references them |
| V-8 | Validate with 20–30 S1/S2 users before design freeze: (a) empty inbox as hero vs dashboard; (b) safe-to-spend as first number vs category totals; (c) automatic pairing with undo vs confirm-first; (d) the Italian mode labels | RECOMMENDATION | — |
| V-9 | Calibrate every numeric target in this document after the first 200 consented users; none appears in external claims before then | RECOMMENDATION | — |

## Open questions

| # | Question | Why it matters | How to verify | Priority |
|---|---|---|---|---|
| 1 | Do Intesa XME Banks or Hype Radar pair transfers or learn per user today? | Changes the defensibility of the WOW | Install with test accounts (Hype on a paid plan); `MA` Q1 | P0 |
| 2 | Will S1 users accept automatic pairing with undo (BALANCED) or do they want confirm-first (CONTROL) as the default? | Default mode; WOW design | 20–30 moderated first sessions with real consents | P0 |
| 3 | What auto-pair threshold keeps precision ≥ 99% on Italian bank data? | Core of WOW and TRUST | Offline evaluation on consented histories; Enable Banking restricted-production pilot (`OBP` D2) | P0 |
| 4 | Are the per-mode target error rates (0.5% / 2% / 4%) the right trade-off for Italian users, and does the review share land in the ranges above? | P4 and §7 | Beta telemetry; interviews on "minutes per month tolerated" | P1 |
| 5 | Do the Italian mode labels ("Decido io" / "Chiede se ha un dubbio" / "Decide Lilleri") read as intended? | Copy | Copy test with 8–10 users | P1 |
| 6 | Is "Puoi ancora spendere X €" the right safe-to-spend framing next to Satispay's weekly Budget? | UNDERSTAND stage | Copy tests; interviews (`JTBD` Q6) | P1 |
| 7 | Does a per-sync report reduce or increase anxiety for non-technical users? | SYNC copy density | A/B on report density; P3/P4 interviews | P2 |
| 8 | What is the incumbents' support-contact rate per connection failure (benchmark for the TRUST metric)? | Target setting | Ask providers; estimate from review volumes | P2 |

## Sources

All verified on 2026-10-02 by the input documents named; URLs carried over verbatim. Reliability as graded in those documents.

### Internal inputs (read in full)

| ID | Document | Used for |
|---|---|---|
| MA | `/home/user/Lilleri/docs/research/market-analysis.md` | Why now; sizing signals; incumbents; founding-hypothesis validation; Gate A |
| OM | `/home/user/Lilleri/docs/research/opportunity-map.md` | Feature-area opportunities; differentiator ranking; what not to build |
| PP | `/home/user/Lilleri/docs/research/user-pain-points.md` | Ranked pain points; Italian specifics; decisions D1–D13 |
| PE | `/home/user/Lilleri/docs/product/personas.md` | Personas; trust thresholds; zero-setup meaning |
| JTBD | `/home/user/Lilleri/docs/product/jobs-to-be-done.md` | Jobs; core loop; WOW and TRUST definitions; success signals |
| OBP | `/home/user/Lilleri/docs/research/open-banking-providers.md` | PSD2 mechanics; provider decision; coverage; Gate B |
| DSF | `/home/user/Lilleri/docs/research/data-sources-feasibility.md` | Sources A–I; never list |
| REG | `/home/user/Lilleri/docs/compliance/regulatory-landscape.md` | Law in force; AI Act posture; store rules |
| BM | `/home/user/Lilleri/docs/business/business-model.md` | Free tier; never-paywalled list; no ads |
| UE | `/home/user/Lilleri/docs/business/unit-economics.md` | AIS as dominant cost |
| BS | `/home/user/Lilleri/docs/brand/brand-strategy.md` | Promise; positioning; tone; anti-patterns |
| AI | `/home/user/Lilleri/docs/research/raw/ai-ml-transaction-intelligence.md` | Italian descriptors; cascade; calibration; locks; prompt injection |
| RC | `/home/user/Lilleri/docs/research/raw/reconciliation-and-data-model-patterns.md` | Identity strategy; match types; evidence model; undo; state machines |
| PM / CM | `/home/user/Lilleri/docs/compliance/privacy-model.md`; `/home/user/Lilleri/docs/compliance/consent-model.md` | Quiet set; consent families; renewal timeline |

### Primary and secondary sources carried over (most load-bearing)

| ID | Source | URL | Date | Reliability |
|---|---|---|---|---|
| PP-G-01 | Actual Budget #1628 "Recognise transfers between accounts" (382 up-votes) | https://github.com/actualbudget/actual/issues/1628 | 2023-09-01 | high |
| PP-G-43 | Actual Budget #669 "Merge unmatched transactions" (121 up-votes) | https://github.com/actualbudget/actual/issues/669 | 2023-02-19 | high |
| PP-G-24 / G-83 / G-84 / G-87 | Phantom transfer; silent overwrite; silent skip; dedup drops legitimate items | https://github.com/actualbudget/actual/issues/3485 ; https://github.com/actualbudget/actual/issues/8701 ; https://github.com/actualbudget/actual/issues/9063 ; https://github.com/actualbudget/actual/issues/8221 | 2024–2026 | high |
| PP-G-10 / G-73 / G-74 | EUA expired; "Bank Sync Offline"; "contact support" | https://github.com/actualbudget/actual/issues/3826 ; https://github.com/actualbudget/actual/issues/7717 ; https://github.com/actualbudget/actual/issues/5742 | 2024–2026 | high |
| IT-Y-02 | Giuseppe Castagna — "Il metodo con cui traccio i miei soldi (in 5 minuti al mese)" | https://www.youtube.com/watch?v=kJNxDIcJOac | 2025-12-26 | low-medium |
| IT-Y-03 | Karim Mejri — "Come gestisco i soldi nel 2026" | https://www.youtube.com/watch?v=J4bio_hsN08 | 2025-03-16 | low-medium |
| IT-Y-01 | Tony Pezzella — "Revolut 2026" ("cursed" round-ups; no F24/MAV/RAV) | https://www.youtube.com/watch?v=zwCFwhEIV3I | 2025-11-01 | low-medium |
| WS-04 / NEW-7 | Intesa Sanpaolo newsroom: XME Banks (2020) | https://group.intesasanpaolo.com/it/newsroom/comunicati-stampa/2020/02/intesa-sanpaolo-presenta-xme-banks-per-la-gestione-di-conti-corr ; https://group.intesasanpaolo.com/it/newsroom/tutte-le-news/news/2020/open-banking--attivo-l-aggregatore-finanziario-xme-banks | 2020-02 | high (snippet) |
| WS-01 | Hype support: Radar | https://support.hype.it/privati/articles/radar-come-monitorare-entrate-uscite-e-piani-risparmio-dei-tuoi-conti | n/d | high (snippet) |
| WS-07 | Satispay blog: "Come impostare il tuo Budget su Satispay" | https://www.satispay.com/it-it/blog/guide-satispay/come-impostare-budget-satispay/ | n/d | high (snippet) |
| NEW-4 | CRIF open-banking outlook: 57.4% connection success H1 2025 | https://www.pagamentidigitali.it/digital-banking/open-banking-cresce-la-fiducia-in-italia-nel-2025-oltre-la-meta-dei-conti-viene-collegata-con-successo/ | 2025-10 | medium |
| NEW-6 | Revolut >5M customers in Italy | https://www.teleborsa.it/News/2026/05/28/revolut-supera-i-5-milioni-di-clienti-in-italia-con-uso-sempre-piu-quotidiano-3.html | 2026-05-28 | medium-high |
| NEW-3 | ECB SPACE 2024 (cash >60% of POS transactions by number in Italy) | https://www.ecb.europa.eu/stats/ecb_surveys/space/html/ecb.space2024~19d46f0f17.en.html | 2024-12 | medium-high |
| EU-S-20 / S-21 | Emma Trustpilot ("never learns"); Emma help: learns after three edits | https://uk.trustpilot.com/review/emma-app.com ; https://help.emma-app.com/en/article/change-a-transaction-category-iipyy2/ | n/d | low-medium / high |
| US-S51 | Copilot changelog: Copilot Intelligence (per-user model, ~30 reviews) | https://changelog.copilot.money/log/copilot-intelligence | 2023-09-05 | high |
| US-S29 | Monarch help: hidden pending may reappear | https://help.monarch.com/hc/en-us/articles/4405041904916-Hiding-or-Unhiding-Transactions | n/d | high |
| US-S12 / S13 | YNAB Trustpilot ("sense of control"); Penny Hoarder (2–4 weeks) | https://www.trustpilot.com/review/ynab.com ; https://www.thepennyhoarder.com/budgeting/ynab-review/ | 2024–2026 | medium / medium-low |
| US-V4 | Plaid docs: pending→posted (`pending_transaction_id`) | https://plaid.com/docs/transactions/transactions-data/ | live | high |
| US-W3 | Plaid–YNAB customer story (+21% UK / +12% EU conversion) | https://plaid.com/en-gb/customer-stories/ynab/ | 2025 | high (vendor) |
| US-W12 | Monarch $100M ARR | https://www.prnewswire.com/news-releases/monarch-hits-100m-in-arr-acquires-mbi-to-accelerate-next-phase-of-growth-302896004.html | 2026-10-01 | high |
| EU-S-68 | Finanzguru >3M users, ≈€40M revenue 2025 | https://www.aktiencheck.de/news/Artikel-3_Millionen_Nutzer_Wie_Finanzguru_Konkurrenz_abhaengt-19361555 | 2026 | medium-high |
| EU-S-45 | Cleo FTC $17M settlement | https://www.hunton.com/privacy-and-cybersecurity-law-blog/ftc-reaches-17-million-settlement-with-cash-advance-company-cleo-ai | 2025-03 | high |
| IT-W-08 | Italian press digests (Revolut Sep 2026 incident; Garante fine on Poste apps) | https://github.com/p1va/news-in-brief | 2026 | medium (headlines) |
| AI §2.4 / §2.8 | Maybe/Sure auto-categoriser ("favor null over false positives"); Sure `locked_attributes` | https://github.com/maybe-finance/maybe ; https://raw.githubusercontent.com/we-promise/sure/main/app/models/provider/openai/auto_categorizer.rb | 2025–2026 | high (code) |
| AI §2.6 | scikit-learn calibration guide | https://raw.githubusercontent.com/scikit-learn/scikit-learn/main/doc/modules/calibration.rst | live | high |
| AI §1.3 | CBI causali table and regex rules (MIT); Banana Accounting Italia fixtures (Apache-2.0) | https://github.com/fab128k/da-pdf-a-csv ; https://github.com/BananaAccounting/Italia | 2026 | high |
| RC §2.1 | Actual Budget `sync.ts` reconciliation; YNAB OpenAPI (`import_id`) | https://raw.githubusercontent.com/actualbudget/actual/master/packages/loot-core/src/server/accounts/sync.ts ; https://github.com/ynab/ynab-sdk-js/blob/master/open_api_spec.yaml | live | high |
| RC §1.2 | Enable Banking FAQ (entry_reference vs transaction_id); Salt Edge v6 (pending ids change); TrueLayer (normalised id) | https://enablebanking.com/docs/faq ; https://docs.saltedge.com/v6/api_reference ; https://docs.truelayer.com/docs/transaction-data-reference | n/d | high (via index) |
| PP-D-OB / D-OBA | RTS 2018/389 (art. 10, art. 36(5)(b)); Delegated Reg. 2022/2360; EBA Q&A 2019_4631; Yapily data restrictions (Intesa 429, two-week window); Enable Banking Italy page | https://eur-lex.europa.eu/eli/reg_del/2018/389/oj ; https://eur-lex.europa.eu/eli/reg_del/2022/2360/oj ; https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2019_4631 ; https://docs.yapily.com/pages/data/financial-data-resources/data-restrictions/ ; https://enablebanking.com/docs/markets/it/ | 2018 / 2022 / live | high |
| RL S-30 | Cass. civ. 14381/2021 (Mevaluate: knowable logic) | https://www.italgiure.giustizia.it/ | 2021-05-25 | high (not fetched) |
| NB-S-04 / NEW-1 | Apple App Review Guidelines 5.1.2(i), 3.2.1(viii); Google Play User Data policy (AI clarification 15 Jul 2026) | https://developer.apple.com/app-store/review/guidelines/ ; https://support.google.com/googleplay/android-developer/answer/17134731?hl=en | 2026 | high / medium-high |

End of document.
