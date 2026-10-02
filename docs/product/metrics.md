# Metrics: North Star, metric tree, event taxonomy, operational metrics and guardrails

**Project:** LILLERI (greenfield consumer PFM; Italy-first, then Europe)
**Document type:** Phase 1 product document — measurement system (what we optimise, what we watch, what we refuse to optimise)
**Date / verification date for every carried-over claim:** 2026-10-02
**Author:** Head of Product + startup finance analyst + growth lead (founding team)
**Language:** documentation in English; product copy and metric names shown to users in Italian with English glosses.
**Inputs read in full:** `docs/research/market-analysis.md`, `opportunity-map.md`, `user-pain-points.md`, `open-banking-providers.md`, `data-sources-feasibility.md`; `docs/product/personas.md`, `jobs-to-be-done.md`; `docs/compliance/regulatory-landscape.md` (plus `privacy-model.md` §6 and `consent-model.md` §4–5 for the analytics and consent constraints); `docs/business/business-model.md`, `unit-economics.md`, `revenue-scenarios.md`, `go-to-market.md`; `docs/brand/brand-strategy.md`; `docs/research/raw/ai-ml-transaction-intelligence.md`, `reconciliation-and-data-model-patterns.md`. Three WebSearch queries were run on 2026-10-02 to close small gaps (cited as `NEW-M1…M3`, search-engine summaries only, medium/low reliability).
**Companions:** `roadmap.md` (when each metric is instrumented and which gate it feeds), `pre-mortem.md` (which metric is the early-warning signal for which failure).

## Delivery and evidence boundary (review decision, 2026-10-02)

This is a requirements document, not a list of delivered features. Local work uses synthetic fixtures and a mock provider. Official sandbox work needs provider-issued non-production access. Any real-data pilot needs a written acceptable licence route, provider permission/contract, DPIA/privacy controls, security isolation and informed participant consent before access. Bank credentials are never collected by Lilleri. Mock or sandbox success does not verify Italian production coverage, user demand, retention, classification calibration, store approval or legal clearance.

The full P0 list describes a future cleared beta, not the initial repository scaffold. Implement a small synthetic vertical slice first: exact money → mock ingest → idempotency → deterministic reconciliation/classification with explicit rules → evidence/review/undo → honest synthetic summary. Record actual commands/results in repository status; do not claim every planned fixture or UI flow is already implemented.

Canonical commercial policy: **Lilleri Gratis / Lilleri Plus** at launch; Plus **€4.99/month / €39.99/year is a hypothesis**. **Lilleri Famiglia Later** after consent/sharing/isolation tests; **Pro reserved** for future professional workflows. Closed beta is free. A proposed **30-day non-renewing Plus preview** requires implemented entitlements; it never charges. Store billing, real purchases and renewal metrics are P1 and require explicit checkout and release gates. Correctness, corrections/learning/rules, privacy/security/consent safety, retained-data access, export and deletion stay free in every plan and after downgrade.

Evidence dates/FACT labels below are inherited from source research, including its snippets and uncertainty; this review does not freshly verify vendor terms or law. Numerical success criteria are HYPOTHESES. Fixture correctness cannot establish production precision. Report audited error numerator/denominator, sample selection, decision type, bank/period, label agreement and confidence intervals; audit and user corrections must not double-count errors. A zero-error small sample is not proof of zero error. All A–G letters refer to the brief: A market, B data feasibility, C business, D architecture, E security, F core-loop UX, G brand. Beta/public-launch/expansion releases are separate decisions.

## How to read this document

- Every variable claim carries **FACT** (cited source seen on the verification date), **ASSUMPTION** (working value, not verified), **HYPOTHESIS** (our interpretation, to be validated), **DECISION** (proposed here; final only when recorded in an ADR or ratified in the PRD), **OPEN QUESTION / UNKNOWN**.
- **No Lilleri data exists.** Every target is a HYPOTHESIS shown as Low / Base / High (Low = the floor we would accept at the stated phase, High = the stretch value) and must be re-calibrated after the first 200 consented users (`jobs-to-be-done.md` J-9). Where a competitor benchmark exists it is cited; where none exists the cell says so.
- Targets are tied to the phase in which they are first measurable (`roadmap.md`); a target that cannot be measured yet is not a target, it is a design intent.
- Priority order from the project brief applies to the measurement system itself: trust, data correctness, security, simplicity, automation, reliability, privacy, speed, UX, brand recognition, cost, monetisation, feature count. A metric that would push the team to trade a higher priority for a lower one is either rejected (§2) or paired with a guardrail (§6).

---

## 0. Executive summary

1. **North Star Metric (DECISION proposed): the Auto-correct rate — the share of a month's transactions that Lilleri processed correctly without the user doing anything.** Italian product name: *"movimenti a posto da soli"* ("transactions in order by themselves"). It is reported in two forms: the **rate** (quality; the primary number until launch) and the **count** (volume = rate × transactions of active connected users; the growth form after launch). Rationale in §2: it is the direct measurement of the promise, it is the only candidate that moves only when the reconciliation core actually works, and its gaming vectors are exactly the trust-killers the research documents — so its guardrails are the product's release blockers, not an afterthought.
2. **Four alternatives were scored** against reflects-user-value / measurable / not-gameable / leads-revenue / aligned-with-priorities: weekly active connected users with fresh data (becomes the **reach input**), time-to-first-value (becomes the **activation input**), review-inbox-zero rate (becomes the **paired companion** — it can only be read next to the Auto-correct rate, because an empty inbox is also what silent automation produces), and paid subscriptions per 1,000 MAU (business KPI, lagging, rejected as North Star). HYPOTHESIS scoring, §2.3.
3. **"Correctly" is measured with three instruments, not one** (§2.2): the user's own corrections within 30 days (what they noticed), a weekly audited sample labelled by the team against the Italian eval set (what they did not notice), and balance equality with the bank after every sync (what nobody can argue with). The observed rate and the audited rate are both reported; the audited one is the North Star.
4. **The metric tree (§3) has four branches** — Reach, Correctness, Trust & Retention, Economics — and the thirteen input metrics named in the brief are placed on it with definitions, formulas, data sources, Low/Base/High targets and the phase in which each is first measurable. The economics branch reuses the inputs U1–U35 of `unit-economics.md` so that the beta dashboard and the finance model share one source.
5. **The event taxonomy (§4) is semantic and minimal**: ~40 events named `object_action`, emitted server-side wherever the ledger knows the fact (connection, sync, inbox, rules, consents, billing), client-side only for things the server cannot know (screen views, taps, permission prompts). **Never sent:** amounts, descriptions, merchant names, categories of individual transactions, IBANs, balances, names, free text, push content, device advertising identifiers, precise location, screenshots or session replay of financial screens. Without the analytics consent the pipeline is anonymised per the Garante 2021 guidelines; with consent a rotating pseudonymous id allows funnels (`privacy-model.md` §6, FACT on the rules).
6. **Thirteen operational metrics (§5)** — sync_success_rate, sync_duration, transactions_imported, duplicate_rate, reconciliation_auto_rate, classification_auto_rate, classification_accuracy, review_rate, correction_rate, connection_failure_rate, consent_expiry_rate, ai_cost_per_active_user, provider_cost_per_active_user — plus eight extras the research shows are the real failure signals (silent-skip incidents, balance-mismatch rate, pending→booked replacement precision, transfer-pair precision/recall, recurring next-date accuracy, support contacts per 1,000 MAU, crash-free sessions, export/deletion SLA). Each has a formula, a grain, a Low/Base/High target to validate and an alert threshold.
7. **Guardrails (§6) forbid engagement farming by construction**: minutes per month in the app is a metric we want to go *down* (target ≤ 5), sessions and push opens are reported but never targeted, every growth metric is published next to its counter-metric, and nine guardrails are release blockers (un-reminded charges, silent skips, distress-triggered prompts, analytics schema violations, auto-applied error rate, undo rate, cancel-flow taps, rating-prompt discipline, inbox-zero-by-abandonment).

---

## 1. What the measurement system must respect (constraints from the research)

| # | Constraint | Evidence | Status | Consequence for metrics |
|---|---|---|---|---|
| 1 | The promise is "connect once and Lilleri understands what happens to your money"; the amended promise is "si organizzano da sole — e tu vedi sempre perché" (they organise themselves — and you always see why) | `market-analysis.md` §8.2; `brand-strategy.md` §2 | DECISION (proposed) | The North Star must measure *automatic correctness*, and its guardrails must measure *visibility* (reasons, undo, inbox) |
| 2 | Churn reason #1 is "cannot trust the numbers"; #2 "connection keeps breaking" | `user-pain-points.md` §5 | FACT | Correctness and sync health are the leading indicators of retention, not engagement |
| 3 | Users price effort in minutes per month (ChatGPT 2, sheet 5, Wallet 15) and leave tools that cost more | `IT-Y-02` via `user-pain-points.md` §0.4 | FACT (low-medium) | Time in app is a cost to the user; it is a guardrail that must fall, never a target |
| 4 | Silent automation (hidden pending that reappears, invented transfer legs, silent skips) is a documented trust-killer; the praised pattern is "automatic, with one tap to confirm and an obvious undo" | `opportunity-map.md` §1.2; `PP-G-24/G-83/G-84/G-87`; `US-S29`, `US-S51` | FACT | An empty inbox is only good if reached by resolution; the share of low-confidence decisions routed to review is a floor, not a ceiling |
| 5 | Nobody publishes a verifiable categorisation-accuracy number; opaque "95 %" claims are a trust risk | `competitors-us.md` §6.14 via `jobs-to-be-done.md` §5.2 | ASSUMPTION | Accuracy is measured on a labelled Italian eval set and an audited production sample; no accuracy number is published externally before it is measured (`brand-strategy.md` D6) |
| 6 | App-store ratings (4.5–4.9) and Trustpilot (2.0–3.5) diverge for the same products; the gap is billing and support; YNAB (4.6 Trustpilot) proves it is avoidable | `competitors-us.md` §4.5, `US-W6` | FACT | The rating gap is a brand KPI (`brand-strategy.md` §13) and a guardrail here |
| 7 | Bank data costs per connected account per month (price UNKNOWN; €0.10/0.30/0.60 working range); AI cost is second order (€0.004–0.013 per user-month at 150 tx) | `unit-economics.md` §0, §3 | UNKNOWN → ASSUMPTION | provider_cost_per_active_user is the #1 economic metric; ai_cost_per_active_user is capped by design, not optimised |
| 8 | The business breaks even only in the Target corridor: AIS ≤ €0.20, ≥ 180 paid subscriptions per 1,000 MAU, offers ≥ €0.15/MAU | `revenue-scenarios.md` §6 (Gate C conditions C1–C6) | HYPOTHESIS | The three gating KPIs (free AIS cost per paid subscription, paid subscriptions per 1,000 MAU, offers revenue per MAU) sit on the Economics branch and are reported from beta month 3 (`business-model.md` R-BM-2) |
| 9 | Product analytics must be semantic, without amounts/descriptions/IBANs; consent (art. 122) for identifiers or anonymised per Garante 2021; schemas reviewed by the DPO before release; no ad/tracking SDK | `privacy-model.md` §6, M5; `regulatory-landscape.md` §2 row 8, D6 | FACT (rules) / DECISION | §4 is written to these rules; the "never send" list is enforced by a schema lint |
| 10 | PSD2 mechanics bound what "fresh data" can mean: ≤ 4 unattended refreshes per 24 h per consent, user-present refreshes uncapped, 180-day renewal at the bank, Intesa two-week windows and HTTP 429 | `open-banking-providers.md` §1.1, §1.3 | FACT | "Fresh" = synced within the last unattended window or on open; sync_success_rate excludes bank-imposed caps from the failure numerator and reports them separately |

---

## 2. North Star Metric selection

### 2.1 Criteria

The four criteria in the brief plus one Lilleri-specific criterion. Weights are the founding team's judgement (ASSUMPTION); the ranking in §2.3 is robust to ±10 points on any weight.

| Criterion | Weight | What "5" means | What "1" means |
|---|---|---|---|
| **Reflects user value** | 30 % | Moves only when the user's job ("one picture that is right without doing anything", `jobs-to-be-done.md` §0) is done better | Can move without the user being better off |
| **Measurable** | 20 % | Computable from our own ledger and events every day, with a known lag and a known error bar | Needs surveys, vendor data or guesswork |
| **Not gameable** | 20 % | A team cannot hit it without delivering real value; the obvious shortcuts are detectable (Amplitude's stress test, `NEW-M3`) | Can be inflated with incentives, routing tricks or definition changes |
| **Leads revenue** | 20 % | Statistically precedes trial→paid, renewal and referral (to be proven on cohorts) | Lagging, or unrelated to willingness to pay |
| **Aligned with the priority order** | 10 % | Optimising it pushes trust and correctness before automation, speed and features | Optimising it rewards speed, engagement or feature count over correctness |

### 2.2 Candidates and their definitions

| ID | Candidate | Precise definition (DECISION proposed for A; working definitions for the others) | Italian name shown internally / to users |
|---|---|---|---|
| **A** | **Auto-correct rate (ACR)** — "percentage of monthly transactions correctly processed without user intervention" (the brief's candidate) | Numerator: transactions ingested in month M for users active in M with ≥ 1 live connection that satisfy **all** of: (1) ingested exactly once (no duplicate collapsed or reported later); (2) lifecycle resolved — booked, or pending with a provider link or an expiry decision; (3) typed (standard / transfer leg / card settlement / refund / cash withdrawal / reimbursement) **and** categorised automatically, each with a stored reason; (4) **not edited by the user within 30 days** (category, type, link, split, merchant, delete, "not a duplicate"); (5) **not flagged wrong in the weekly audited sample** (§2.4); (6) the account's booked balance equalled the bank's balance at every sync in M. Denominator: all transactions ingested via API or file import for those users in M. Manual entries (cash, manual accounts) are excluded from both and reported separately. Reported as **observed ACR** (criteria 1–4, 6) and **audited ACR** (all six; the audit estimates the hidden error rate and the observed rate is discounted by it). Final value for M is known at the end of M+1; a provisional value is shown daily. | *Movimenti a posto da soli* ("transactions in order by themselves"); user-facing copy: *"Questo mese 96 movimenti su 100 si sono sistemati da soli."* ("This month 96 out of 100 transactions sorted themselves out.") |
| **A′** | **Auto-correct volume** (companion, same definition) | Count of transactions meeting A's criteria in M, summed over all active connected users. Grows with users; the growth form of A after launch. | *Movimenti sistemati da Lilleri questo mese* |
| **B** | **Weekly active connected users with fresh data (WACU-fresh)** | Users who opened the app (or acted on a service push) in week W **and** whose every live connection completed a successful sync within the previous 24 h at the time of the open (user-present refresh counts). Excludes users whose only connection is expired or in bank-side maintenance (reported separately). | *Utenti attivi con dati aggiornati* |
| **C** | **Time-to-first-value (TTFV)** and **WOW-session rate** | TTFV: median minutes from registration to the first "Cosa è successo ai tuoi soldi" view built from ≥ 1 synced account. WOW-session rate: share of first sessions meeting all five WOW conditions of `jobs-to-be-done.md` §5.3 (≥ 2 institutions, balance equality, all high-confidence pairs paired, inbox ≤ 3, ≤ 3 minutes from last connection to the month view). | *Tempo al primo quadro corretto* |
| **D** | **Review-inbox-zero rate** | Share of active connected users whose Review Inbox is empty at the end of week W, counting only emptiness reached by **resolution** (every item decided in one tap or undone) — items that expired or were dismissed without a decision do not count. | *Tasso di "Niente da fare"* |
| **E** | **Paid subscriptions per 1,000 MAU** | As `unit-economics.md` U27 (business KPI, Gate C condition C2). | — |

### 2.3 Scoring

Scores 1–5 are HYPOTHESIS (founding-team judgement); the evidence column points to the FACT-level support behind each score.

| Criterion (weight) | A — Auto-correct rate | B — WACU-fresh | C — TTFV / WOW rate | D — Inbox-zero rate | E — Paid subs / 1k MAU |
|---|---|---|---|---|---|
| Reflects user value (30 %) | **5** — the promise itself; a transaction correctly handled without effort is the unit of value (`PP-G-01` 382 votes for exactly this mechanic; `PP-§D` "too much manual work" churn) | 3 — fresh data is necessary, not sufficient: a fresh wrong picture counts (`PP-G-84` "the only way to notice is a balance mismatch") | 4 — the WOW moment matters, but once per user | 4 — the hero state (`BR-§8.3`), but only valuable if reached honestly | 2 — value to Lilleri, not to the user |
| Measurable (20 %) | 4 — computable from the ledger daily; needs the 30-day window and a weekly audit, so the final value lags one month | 5 — trivially computable from sync runs and opens | 4 — computable; small denominator (new users only) | 5 — trivial | 5 — trivial |
| Not gameable (20 %) | 4 — gameable by (a) auto-applying more and routing less, (b) making corrections hard, (c) excluding hard accounts; each vector is detected by a guardrail (§2.5) and the audit | 3 — gameable with push nudges that create "opens" (engagement farming) and by counting partial syncs as fresh | 3 — gameable by shrinking what "value" means (any screen) or by cherry-picking cohorts | 2 — **directly gameable by silent automation**: route nothing to the inbox and it is always zero — the exact trust-killer in `PP-G-24/G-83/G-84` | 3 — gameable with dark patterns and trial traps (`PP-§A #7`) |
| Leads revenue (20 %) | 4 — HYPOTHESIS: the first month "in which the picture was right without her touching it" is the trigger to pay (`personas.md` P1 WTP); to be proven on WOW vs non-WOW cohorts | 4 — active users convert; standard SaaS logic | 3 — WOW cohorts should convert better (Plaid/YNAB +21 % UK / +12 % EU after a provider switch is the only vendor datapoint, `US-W3`) | 3 — plausible, unproven | 5 — it is revenue |
| Aligned with priorities (10 %) | **5** — trust and correctness first by construction | 3 — rewards reliability and reach; neutral on correctness | 3 — rewards speed over correctness unless the strict WOW definition is kept | 2 — rewards automation over visibility | 2 — rewards monetisation (12th of 13) |
| **Weighted score** | **4.40** | 3.60 | 3.50 | 3.30 | 3.20 |

### 2.4 How "correctly" is measured (the three instruments)

| Instrument | What it catches | Mechanics | Lag | Label |
|---|---|---|---|---|
| **User corrections within 30 days** | Errors the user noticed | Every user edit on a transaction is a `ledger_event` with `actor = user`; a transaction with any such event inside 30 days of ingestion fails criterion (4). Corrections made *from* an inbox card count as intervention (the inbox asked), so inbox-routed transactions are not "without intervention" — that is by design: the metric rewards fewer, better-targeted questions. | 30 days | DECISION |
| **Weekly audited sample** | Errors the user did not notice (silent wrongness — the gap Sure's own eval found when it measured only on repeated merchants, `ai-ml-transaction-intelligence.md` §2.2) | Each week, 200 (Low) / 300 (Base) / 500 (High) auto-processed transactions are sampled, stratified by bank, kind, source tier and confidence band, from consented beta users; two annotators label category, type and links against the Italian eval taxonomy; disagreements adjudicated. The measured error rate per stratum discounts the observed ACR. Annotation effort ≈ 2–4 hours per week (ASSUMPTION). Consent: the sample is drawn under the beta research consent (`consent-model.md` C-RESEARCH or equivalent — OPEN QUESTION 4). | 7 days | DECISION |
| **Balance equality** | Missing, duplicated or mis-stated transactions regardless of category | After every sync, the booked balance computed from the ledger is compared with the balance returned by the bank (tolerance 0); a mismatch is an inbox item (`user-pain-points.md` D5) and marks every transaction of that account-month as failing criterion (6) until explained. | same sync | DECISION |

### 2.5 Gaming vectors and the guardrail that closes each

| How a team could inflate the ACR | Why it is tempting | Detection / guardrail (see §6 for thresholds) |
|---|---|---|
| Auto-apply more decisions and route fewer to the inbox | Fewer inbox items also looks like "simplicity" | **Auto-applied error rate** ≤ 2 % (audit) and **review-routing floor**: ≥ 95 % of decisions below the confidence threshold must be routed; both are release blockers |
| Make corrections harder to find or slower | Fewer corrections inside 30 days | **Correction friction** ≤ 2 taps from any transaction; correction latency tracked; the audited ACR is immune anyway |
| Exclude hard accounts or banks from the denominator | Cards, Satispay pseudo-accounts and CSV imports are the error-prone part | The denominator is fixed by definition (API + import); exclusions require a documented change of the metric version (`acr_v1`, `acr_v2`) and a restatement of history |
| Widen the auto-pair window or lower thresholds | Higher reconciliation_auto_rate | **Transfer-pair precision** ≥ 99 % at the auto threshold and **undo rate** ≤ 2 % of automatic actions |
| Count pending holds that expire as "resolved" | Fewer dangling items | Expired holds are reported separately (`EXPIRED_HOLD` state, `reconciliation-and-data-model-patterns.md` §4.3) and audited |
| Report only the observed ACR | It is always higher than the audited one | Both are reported; the audited ACR is the North Star; the gap between them is itself a tracked metric ("hidden error rate") |

### 2.6 Decision and targets

**DECISION (proposed): the North Star Metric is the audited Auto-correct rate (A), reported with its volume form (A′).** B (WACU-fresh) is the Reach input that multiplies A′; C (TTFV / WOW-session rate) is the activation input; D (inbox-zero rate) is reported only next to the auto-applied error rate and the review-routing floor, never alone; E is the Gate C business KPI.

| Target (HYPOTHESIS; calibrate after 200 users) | Low | Base | High | When first measurable | Benchmark / anchor |
|---|---|---|---|---|---|
| Observed ACR, first sync (new user, ≥ 2 institutions) | 60 % | 70 % | 80 % | Phase 3 dogfood (`roadmap.md`) | None published; `go-to-market.md` §8 sets auto-rate ≥ 75 % and review ≤ 20 % for categorisation alone |
| Audited ACR, month 3 of closed beta | 70 % | 80 % | 88 % | Phase 5 | Copilot's third-party "95 %" is unverified (`US-S65`); Emma "learns after three edits" yet users say it never learns (`EU-S-20/S-21`) |
| Audited ACR, month 12 after launch (steady state) | 85 % | 90 % | 95 % | Phase 7 | `jobs-to-be-done.md` §7 F5: ≥ 90 % never corrected at day 30 |
| Hidden error rate (observed − audited) | ≤ 5 pp | ≤ 3 pp | ≤ 1.5 pp | Phase 5 | — |
| Auto-correct volume per active connected user per month | 80 | 120 | 150 transactions | Phase 5 | ≈ 80–150 new transactions per user-month (`unit-economics.md` U16 volume assumption) |

Italian copy where the metric reaches the user (DECISION on the tone, not the number): *"A settembre 112 movimenti su 118 si sono sistemati da soli. Sei li hai corretti tu: Lilleri li ha imparati."* ("In September 112 out of 118 transactions sorted themselves out. You corrected six: Lilleri learned them.") Never shown as a percentage with decimals, never as an "accuracy" claim (`brand-strategy.md` §10 "AI theatre").

---

## 3. Metric tree

### 3.1 Shape

```
NORTH STAR  Audited Auto-correct rate (ACR)  ×  transactions of active connected users  =  Auto-correct volume
│
├── REACH (how many transactions enter the loop)
│     registered → connection completion → first sync success → connected institutions per user
│     → D1 / D7 / D30 retention → WACU-fresh (weekly active connected users with fresh data)
│
├── CORRECTNESS (how many are right by themselves)            ← operational metrics, §5
│     sync_success_rate · duplicate_rate · reconciliation_auto_rate · classification_auto_rate
│     classification_accuracy · review_rate · correction_rate (corrections per 100 tx) · balance equality
│
├── TRUST & RETENTION (why they stay)
│     time to first value / WOW-session rate · review inbox size · minutes per month · insight engagement
│     consent renewal before expiry · support contacts per 1,000 MAU · Trustpilot − store gap · NPS
│
└── ECONOMICS (what the loop funds)                              ← inputs U1–U35, unit-economics.md
      free → paid conversion · churn / renewal · ARPU / ARPPU · gross margin
      provider_cost_per_active_user · ai_cost_per_active_user · free AIS cost per paid subscription
```

Reading: the Correctness branch *is* the North Star decomposed; Reach multiplies it; Trust & Retention is where the amended promise ("e tu vedi sempre perché") is measured; Economics is downstream and must never be allowed to pull a Correctness metric down (priority order; `business-model.md` D-BM-2).

### 3.2 Input metrics — definitions, sources and targets

The thirteen inputs named in the brief, placed on the tree. "Grain" = the dimensions every dashboard must be able to cut by. "Source" = where the number is computed (ledger = server-side from the database; events = §4 taxonomy; billing = store/RevenueCat webhooks; invoice = provider/vendor bills).

| # | Input metric | Branch | Definition / formula | Grain | Source | Low / Base / High (HYPOTHESIS) | First measurable | Benchmark / evidence | Owner |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Time to first value (TTFV)** | Trust | Median minutes from `account_created` to the first `summary_viewed{kind: first_picture}` built from ≥ 1 synced account; companion: **WOW-session rate** (strict five-condition definition, §2.2 C) | platform, cohort week, number of institutions, primary bank | events + ledger | TTFV ≤ 15 / ≤ 10 / ≤ 6 min; WOW-session rate 30 / 45 / 60 % of first sessions with ≥ 2 institutions | Phase 3 dogfood; Phase 5 at scale | Monarch "allow 24 h", Simplifi 4–6 h are the anti-patterns (`US-S25`, `US-S92`); Rocket "minutes" (`US-S79`); `go-to-market.md` §8 ≤ 10 min | Head of Product |
| 2 | **Connection completion** | Reach | `connection_completed` / `connection_started` per attempt; plus **activation**: registered users with ≥ 1 completed connection within 24 h / registered | bank, provider, platform, cause of failure, cohort | events + ledger | per attempt 60 / 70 / 80 %; activation 30 / 50 / 70 % | Phase 3 | CRIF: 57.4 % of connection attempts succeed in Italy, H1 2025 (`NEW-4` in `market-analysis.md`, credit-flow sample, medium) — the baseline to beat | Product + CTO |
| 3 | **First sync success** | Reach | Share of new connections whose first sync delivered accounts, balances **and** ≥ 60 days of history (or the bank's documented maximum) within 10 minutes of consent, with balance equality | bank, provider | ledger | 85 / 92 / 97 % | Phase 3 | ~90 days of history is the Italian norm; Fineco exposes no pending list (`open-banking-providers.md` §1.1; `reconciliation-and-data-model-patterns.md` §1.3) | CTO |
| 4 | **D1 / D7 / D30 retention** | Reach | Share of registered users (cohort by registration week) who open the app or act on a service push in exact elapsed-day windows [24h,48h) / [7d,8d) / [30d,31d) from registration; rolling week/month return is a separately named companion; reported separately for connected vs unconnected and WOW vs non-WOW cohorts | cohort, connected, WOW, platform, channel | events | D1 25 / 35 / 45 %; D7 12 / 20 / 28 %; D30 6 / 10 / 15 %; M3 MAU retention 30 / 40 / 50 % | Phase 5 | Finance apps D30 ≈ 4.2 % (Business of Apps, Jan 2026) and 2 % (Adjust 2026) vs 10–15 % cited for "fintech" and 11.6 % for digital banking — sources disagree by category (`NEW-M2`, medium-low); `go-to-market.md` §8 ≥ 35/20/10 | Growth |
| 5 | **Connected institutions per user** | Reach | Median and distribution of live institutions (not accounts) per connected user; share with ≥ 2 (pairing WOW possible) and ≥ 3 (ICP) | plan, cohort | ledger | share ≥ 2 among trial users 50 / 65 / 80 %; paid members 2.0 / 3.0 / 4.5 accounts (U11) | Phase 5 | Italian ICP holds 3–5 relationships (`IT-Y-02/Y-03`, low-medium); free tier capped at 1 institution (`business-model.md` D-BM-1) | Product |
| 6 | **Auto-classification accuracy** | Correctness | (a) Eval set: accuracy and macro-F1 at leaf and parent level, per bank and per kind; (b) production: audited wrong auto-decisions / representative audited auto-decisions, with sampling/stratum weights and interval = audited auto-error; corrected auto-decisions / all auto-decisions is a separate observed correction rate. Never add audit errors to all-user corrections or interpret uncorrected rows as correct | bank, kind, source tier (T0–T5), confidence band, merchant frequency | eval harness + ledger + audit | auto-error rate ≤ 3 / ≤ 2 / ≤ 1 %; eval leaf accuracy 85 / 90 / 94 % | Phase 4 (eval), Phase 5 (production) | No independent published number; classical models reach 97–99 % only within one bank's closed vocabulary (`ai-ml-transaction-intelligence.md` §2.2, medium); `go-to-market.md` §8 auto-error ≤ 2 % | Data/ML lead |
| 7 | **Review inbox size** | Trust | Median inbox items per active connected user per week; items at first sync; **minutes per month in the inbox** (sum of inbox session durations) | plan, institutions, cohort | events | items/week ≤ 10 / ≤ 5 / ≤ 3; at first sync ≤ 5 / ≤ 3 / ≤ 2; minutes/month ≤ 8 / ≤ 5 / ≤ 3 | Phase 3 | Italian effort ladder 2/5/15 min (`IT-Y-02`); `jobs-to-be-done.md` J-4 budget 5 min/month; `PP-G-43` 121 votes | Product |
| 8 | **Corrections per 100 transactions** | Correctness | User edits (category, type, link, split, merchant, delete, "not duplicate") per 100 ingested transactions in the period; split into **first corrections** (new merchant/pattern) and **repeat corrections** (same merchant corrected again — must trend to 0) | bank, kind, tier, plan, user tenure | ledger events | month 1 ≤ 15 / ≤ 10 / ≤ 6; month 6 ≤ 8 / ≤ 5 / ≤ 3; repeat-correction share ≤ 15 / ≤ 8 / ≤ 3 % | Phase 3 | "Never learns" is a 10-source pain point (`PP-§A #5`); Copilot's per-user model is the praised benchmark (`US-S51`) | Data/ML lead |
| 9 | **Insight engagement** | Trust | Share of delivered weekly/monthly summaries and alert cards opened within 7 days; share **acted** (one-tap decision taken); opt-out rate of each nudge type; dismissed-without-opening share (negative) | insight type, plan, channel (push vs in-app) | events | opened 35 / 50 / 65 %; acted 10 / 20 / 30 %; opt-out ≤ 8 / ≤ 5 / ≤ 3 % | Phase 4 | The ChatGPT-DIY monthly output is the demand proof (`IT-Y-02`); Snoop feed and Copilot alerts praised (`EU-S-09a`, `US-S60`) | Product |
| 10 | **Free → paid conversion** | Economics | (a) non-renewing preview → explicit collected purchase within 7 days of preview end among eligible matured priced cohorts; unavailable in free beta; (b) registered → paid lifetime (U28); (c) **paid subscriptions per 1,000 MAU** (U27, Gate C C2); (d) upgrade trigger mix (`paywall_viewed{trigger}` → `subscription_started`) | cohort, trigger, plan, platform, channel | billing + events | trial→paid 15 / 25 / 35 %; registered→paid 2 / 4 / 7 %; subs/1k MAU 60 / 120 / 200 (Target 180 by month 9) | After verified billing and matured cohorts; free beta only intent/preview usability | RevenueCat search summaries require primary cohort/denominator verification; no benchmark transplanted into Italian PFM or non-renewing preview; PFM paid conversion UNKNOWN | Growth / Monetisation |
| 11 | **Churn** | Economics | Monthly-plan churn (U29); annual renewal rate (U30); connection churn (live connections lapsed without renewal, feeds §5 consent_expiry_rate); cancel reasons (one-tap survey, optional) | plan, tenure, platform, reason | billing + ledger | monthly churn 14 / 9 / 6 %; annual renewal 35 / 45 / 60 % | Phase 7 (first renewal cohort at month 13) | RevenueCat annual 1-year retention ≈ 27–28 % cross-category (`W-1`); YNAB price-increase backlash (`US-S11`) | Monetisation |
| 12 | **ARPU / ARPPU** | Economics | ARPPU = net revenue (ex-VAT, after store/payment rails) per paid subscription-month (U1–U8); ARPU = (subscriptions + consented offers) per MAU-month | plan, annual share, platform rail | billing | Launch scenario net Plus ARPPU €2.52 Pessimistic / €2.85 Base / €2.88 Target / €3.26 Optimistic; subscription-only ARPU €0.151 / €0.342 / €0.519 / €0.653 | Phase 6 | `unit-economics.md` §4; Finanzguru ≈ €1.1 per registered user-month (mostly commissions, `EU-S-68`), Monarch ≈ $8.3 per member-month (no free tier, `US-W12`) | CFO |
| 13 | **Gross margin** | Economics | GP per 1,000 MAU = revenue − COGS (AIS, AI, infra, notifications, support, OCR) per `unit-economics.md` §6; plus the three Gate C KPIs: **free AIS cost per paid subscription** (≤ €0.95 guardrail), **offers revenue per MAU** (from Phase 7), **paid subs per 1,000 MAU** | plan, cohort, provider | invoices + ledger | Launch subscription-only GM before minimums −594.3% Pessimistic / −23.2% Base /40.7% Target /74.0% Optimistic; positive funded economics not established by target value | After actual billing; beta absolute/shadow costs only | `revenue-scenarios.md` §6 C1–C4 | CFO |

Companion Reach metric not in the brief but required by the tree: **WACU-fresh** (§2.2 B) — Low / Base / High 40 / 55 / 70 % of MAU with live connections (HYPOTHESIS; measurable Phase 5).

### 3.3 Causal reading (what we expect to move what — HYPOTHESES to test on cohorts)

| If this input improves… | …we expect this to move | Test | Phase |
|---|---|---|---|
| Connection completion +10 pp | TTFV −2 min; activation +8 pp; WACU-fresh +5 pp | Per-bank funnel before/after provider or copy change | 5 |
| WOW-session rate +15 pp | D30 +4 pp; trial→paid +5 pp | WOW vs non-WOW cohorts (`jobs-to-be-done.md` J-2) | 5 |
| Repeat-correction share → < 5 % | Audited ACR +5 pp; inbox size −30 % | Per-user before/after first rule creation | 4–5 |
| Consent renewal before expiry ≥ 80 % | Connection churn −50 %; D90 +3 pp | Renewal-UX cohorts (provider-relative reminder windows) | 5–6 |
| Audited ACR +5 pp | Monthly churn −1 pp; NPS +5 | Cohort regression at month 6 | 6–7 |
| Inbox minutes/month −2 min (with ACR flat) | D30 +2 pp | Quasi-experiment on routing thresholds within the guardrails | 5–6 |

---

## 4. Product-analytics event taxonomy

**Telemetry destination rule (DECISION):** per-bank/provider, confidence, consent and decision-type cuts belong in the access-controlled internal operational store with minimised identifiers/retention. The taxonomy below is an internal schema, not permission to forward it to SaaS analytics. Third-party product analytics receives only separately approved generic events/properties; no bank relationships, account types, category groups, precise consent dates, quiet/sensitive signals, amounts, merchant/descriptors or ledger screenshots. Free preview billing events are simulations until verified receipts exist.

### 4.1 Principles (DECISION proposed; rules FACT per `privacy-model.md` §6)

1. **Semantic events only.** An event records that a meaningful thing happened in the loop (CONNECT → SYNC → UNDERSTAND → CORRECT → LEARN → AUTOMATE, `jobs-to-be-done.md` §4), never *what* the thing contained. `inbox_item_resolved{item_type: transfer_candidate, resolution: confirmed, taps: 1}` is allowed; the merchant, the amount and the category are not.
2. **Server-side first.** Facts the ledger knows (connection state, sync runs, inbox items, rules, consents, billing) are emitted by the backend from the `ledger_event` / `consent_event` tables; the client emits only what the server cannot know (screen views, taps, OS permission outcomes, notification opens). This removes most of the SDK surface, makes events replayable and keeps the forbidden properties out of the client bundle.
3. **Naming:** `object_action` in snake_case, past tense (`connection_completed`), one event per outcome, no "generic click" events. Enumerated properties only; no free text; no floats except durations in seconds and bucketed counts.
4. **Common envelope:** `event_id`, `event_name`, `event_version`, `occurred_at` (minute precision is enough for product analytics; second precision only for sync/latency events), `app_version`, `platform` (ios/android/web), `locale`, `plan` (free/plus/famiglia/trial), `cohort_week`, and **either** a rotating pseudonymous `user_key` (with the analytics consent C-ANALYTICS, re-askable not earlier than 6 months) **or** nothing (anonymised mode: no persistent identifier, truncated IP at the edge, aggregated reporting only).
5. **Registry as code:** every event and its property enums live in one versioned file (`packages/analytics/events.ts`); the DPO reviews schema changes before release (M5); a lint rejects any property outside the allow-list; CI fails on an unregistered event name.
6. **Operational metrics are not analytics events.** §5 numbers are computed from the ledger and sync tables; they never travel through the analytics pipeline. This separation lets the analytics pipeline be anonymised without losing operational precision.
7. **Vendor:** self-hosted or EU-hosted product analytics (processor under a DPA, `privacy-model.md` §1.1); no advertising or tracking SDK, hence no ATT prompt (`regulatory-landscape.md` D6). Vendor choice is a Phase 2 ADR (OPEN QUESTION 2).

### 4.2 Event catalogue

Properties in braces are the complete allowed set; enums in parentheses. "Feeds" names the §3/§5/§6 metric.

**CONNECT**

| Event | Trigger | Properties | Feeds |
|---|---|---|---|
| `account_created` | Registration completed | `{platform, channel (organic/referral/creator/paid/press/unknown), referral_present: bool}` | Reach funnel; CAC |
| `age_gate_passed` | 18+ confirmation | `{}` | Compliance (D4) |
| `consent_screen_viewed` | PSD2 consent explainer shown (names the provider, read-only) | `{provider (yapily/enable_banking/other), screen_version}` | Trust: consent completion |
| `connection_started` | User taps the bank → redirect | `{bank_id, provider, attempt_number (1/2/3+), entry_point (onboarding/add_bank/renewal)}` | Connection completion |
| `connection_completed` | Provider returns accounts | `{bank_id, provider, accounts_count_bucket (1/2/3-4/5+), account_types (set: current/card/prepaid/savings), duration_s_bucket, consent_days_bucket (≤90/91-180/unknown)}` | Connection completion; institutions per user |
| `connection_failed` | Redirect or provider error, or abandonment timeout | `{bank_id, provider, cause (user_abandoned/sca_failed/bank_error/provider_error/no_accounts/rate_limited/unsupported_account_type/unknown), step}` | connection_failure_rate by cause |
| `coverage_unavailable_shown` | A source is shown as "non ancora collegabile" | `{source_kind (card_credit/satispay/hype/paypal/broker/other), fallback_offered (manual/csv/none)}` | Coverage honesty; F03 early warning |
| `import_completed` | CSV/XLSX/PDF import finished | `{mapping (intesa/unicredit/fineco/revolut/n26/paypal/generic/pdf), rows_bucket, matched_share_bucket, new_share_bucket, errors: bool}` | Import quality; transactions_imported (file) |
| `manual_account_added` | Manual or pseudo-account created | `{kind (cash/wallet_satispay/wallet_paypal/card/broker/other)}` | Coverage fallback usage |

**SYNC**

| Event | Trigger | Properties | Feeds |
|---|---|---|---|
| `sync_completed` (server) | Sync run ends | `{bank_id, provider, mode (unattended/user_present/catch_up), outcome (success/partial/failed), cause_if_failed (consent_expired/bank_maintenance/provider_error/rate_cap/chunking_in_progress/auth_error/unknown), duration_s, new_bucket, dedup_hits_bucket, paired_bucket, skipped_count (must be 0), balance_equal: bool}` | sync_success_rate, sync_duration, transactions_imported, silent-skip incidents, balance equality |
| `sync_report_viewed` | User opens the per-sync summary | `{items_listed_bucket}` | Trust (F9 honest failure) |
| `sync_failure_explained` | A named failure state is shown | `{cause, next_retry_shown: bool}` | Trust; support deflection |
| `refresh_requested` | User-present refresh | `{entry_point (pull/open/button)}` | PSD2 user-present usage |

**UNDERSTAND**

| Event | Trigger | Properties | Feeds |
|---|---|---|---|
| `summary_viewed` | Month/week view or first picture rendered | `{kind (first_picture/month/week), institutions_bucket (1/2/3+), inbox_count_bucket (0/1-3/4-10/11+), balance_equal_all: bool, minutes_since_last_connection_bucket}` | TTFV; WOW-session rate |
| `safe_to_spend_viewed` | "Puoi spendere ancora…" shown | `{has_recurring_subtracted: bool}` | F8 engagement |
| `subscriptions_viewed` | Recurring list opened | `{items_bucket, non_monthly_present: bool}` | F7 engagement |
| `category_reason_viewed` | User taps the "why" on a category | `{source_tier (rule/user_rule/merchant_map/model/llm/provider_hint)}` | Visibility of learning (amended promise) |
| `coverage_page_viewed`, `trust_page_viewed`, `status_page_viewed` | Trust surfaces opened | `{entry_point}` | Trust; brand measures |

**CORRECT (Review Inbox)**

| Event | Trigger | Properties | Feeds |
|---|---|---|---|
| `inbox_opened` | Inbox screen | `{items_bucket, oldest_item_age_days_bucket}` | Inbox size |
| `inbox_item_created` (server) | An item is routed to the inbox | `{item_type (new_merchant/low_confidence_category/transfer_candidate/duplicate_candidate/refund_candidate/reimbursement_candidate/amount_threshold/balance_mismatch/consent_expiring/consent_expired/bank_removed_item/price_increase/unexplained_settlement/household), confidence_band (low/medium), source_tier}` | review_rate; review-routing floor |
| `inbox_item_resolved` | One-tap or swipe decision | `{item_type, resolution (confirmed/alternative_chosen/rejected/undone/snoozed), taps (1/2/3+), time_to_decide_s_bucket, rule_proposed: bool}` | One-tap resolution rate; inbox minutes |
| `inbox_item_expired` (server) | Item auto-closed without decision | `{item_type, age_days}` | Inbox-zero-by-abandonment guardrail |
| `inbox_zero_reached` (server) | Inbox goes to 0 by resolution | `{items_resolved_in_session_bucket, reached_by (resolution/expiry/mixed)}` | Inbox-zero rate (honest form) |
| `transaction_corrected` (server) | Any user edit outside the inbox | `{field (category/type/link/split/merchant/deleted/not_duplicate), source_tier_before, from_group → to_group (parent-level category groups only, never leaf), is_repeat: bool, taps}` | Corrections per 100 tx; correction friction |
| `automation_undone` (server) | Undo of an automatic action | `{action_type (pair/settlement/refund/category/dedup), age_s_bucket}` | Undo rate guardrail |

**LEARN**

| Event | Trigger | Properties | Feeds |
|---|---|---|---|
| `rule_proposed` (server) | First correction proposes a rule | `{condition_kind (merchant/payment_type/amount_band/account/direction)}` | Learning visibility |
| `rule_created` | User accepts/creates a rule | `{origin (proposed/manual), retroactive_count_bucket, condition_kind}` | % corrections that create a rule |
| `rule_deleted` | User removes a rule | `{origin, age_days_bucket}` | Rule-override rate |
| `model_readiness_shown` | Cold-start indicator changes | `{level (learning/ready)}` | Learning curve |

**AUTOMATE**

| Event | Trigger | Properties | Feeds |
|---|---|---|---|
| `consent_renewal_prompted` (server) | Reminder relative to actual provider expiry or an explicit expiry-state item | `{days_to_actual_expiry_bucket, channel (inbox/push/banner)}; bank/provider cuts internal only` | consent_expiry_rate; renewal funnel |
| `consent_renewed` (server) | SCA completed before or after expiry | `{bank_id, before_expiry: bool, days_from_expiry_bucket, batch: bool}` | Renewal before expiry (≥ 80 %) |
| `consent_revoked` | User disconnects | `{bank_id, reason (optional enum: switching_bank/privacy/not_useful/other/none)}` | Connection churn |
| `insight_delivered` (server) | Weekly/monthly summary or alert created | `{insight_type (weekly/monthly/price_increase/duplicate_debit/projected_negative/new_merchant_threshold/bank_fee), channel}` | Insight engagement |
| `insight_opened`, `insight_acted`, `insight_dismissed`, `insight_opted_out` | User reaction | `{insight_type, action (optional enum)}` | Insight engagement; nudge opt-out guardrail |
| `push_permission_answered` | OS prompt result | `{granted: bool, context (inbox/renewal/summary)}` | Notification guardrails |

**ACCOUNT, BILLING, TRUST**

| Event | Trigger | Properties | Feeds |
|---|---|---|---|
| `trial_started`, `trial_reminder_sent` (server), `trial_ended` | Trial lifecycle | `{plan, days_before_charge (reminder), outcome (converted/lapsed/cancelled)}` | Free→paid; un-reminded charges = 0 |
| `paywall_viewed` | Contextual upgrade prompt | `{trigger (second_institution/history_depth/household/forecast/insight_depth/settings), plan_shown}` | Upgrade trigger mix |
| `subscription_started`, `subscription_renewed`, `subscription_cancelled`, `subscription_refunded` (server, from store webhooks) | Billing | `{plan, period (monthly/annual), rail (apple_iap/play_billing/web), taps_to_cancel (cancel only), reason (optional enum)}` | Conversion, churn, ARPPU, cancel-flow guardrail |
| `export_requested`, `export_completed` | Data export | `{format (csv/json/pdf), scope (all/account/period)}` | Export SLA; export-without-churn |
| `deletion_requested`, `deletion_completed` (server) | Account deletion | `{reason (optional enum incl. distrust), hours_to_complete}` | Deletion SLA; distrust signal |
| `support_contact_opened` | In-app support | `{topic (connection/sync/wrong_number/billing/privacy/other), bank_id (if connection)}` | Support contacts per 1,000 MAU |
| `rating_prompt_shown`, `rating_prompt_answered` | Store rating prompt | `{context (inbox_zero_only), answered: bool}` | Rating-prompt discipline |
| `permission_ai_answered` | Third-party-AI permission step (Apple 5.1.2(i), Play User Data) | `{granted: bool, context (onboarding/settings)}` | Compliance; AI tier availability |
| `analytics_consent_changed` | C-ANALYTICS toggle | `{granted: bool}` | Pipeline mode |

### 4.3 What must never be sent (DECISION; enforced by schema lint and DPO review)

| Never in any event, log line, crash report or session recording | Why |
|---|---|
| Transaction amounts (exact, rounded or bucketed finer than "bucket of count"), balances, running totals | Financial data; profiling risk; `privacy-model.md` §6 forbidden properties |
| Descriptions, merchant names, counterparty names, payee strings, notes, split labels | Personal data of the user and of third parties; Art. 9 inference risk |
| The category of an individual transaction (leaf or parent); only the `from_group → to_group` parent-level pair of a *correction* is allowed, and the "quiet set" groups (health, religion, union, politics, sex life) are never an analytics dimension | Art. 9 inference (`privacy-model.md` §5.2, D2) |
| IBANs, account numbers, card last-4, provider account ids, consent ids, tokens | Identifiers; PSD2 sensitive payment data |
| Full `bank_id` in anonymised mode when the bank has < 50 connected users in the period (k-anonymity floor) | Re-identification |
| Names, e-mail, phone, address, date of birth, device advertising identifiers (IDFA/GAID), hardware ids, precise location | No ad SDK; no tracking; Apple/Play privacy labels |
| Free-text input of any kind (search queries, support messages, cancel reasons typed, chat) | Cannot be enumerated or minimised |
| Push-notification content, inbox-card content, insight text, screenshots, session replay of any financial screen | Would reproduce the ledger in the analytics store |
| Events to any advertising, attribution or "growth" network; server-side forwarding to such networks | No advertising/attribution SDK or bank-data forwarding in launch; ePrivacy art. 122 |
| Timestamps finer than the minute for user actions in analytics (second precision stays in operational logs) | Minimisation; fingerprinting |

Copy for the consent toggle (Italian, gloss): *"Aiutaci a migliorare Lilleri: condividiamo solo eventi anonimi come 'collegamento riuscito' o 'movimento corretto'. Mai importi, descrizioni o nomi."* ("Help us improve Lilleri: we share only anonymous events such as 'connection succeeded' or 'transaction corrected'. Never amounts, descriptions or names.")

---

## 5. Operational metrics

Computed server-side from the ledger, sync runs, provider payload metadata, invoices and the eval harness. Grain unless stated: per bank × provider × day, with weekly and monthly roll-ups. "Alert" = paging or a release-blocking threshold; "validate" = a Low/Base/High HYPOTHESIS to calibrate (Phase in `roadmap.md`).

| # | Metric | Definition / formula | Grain and source | Low / Base / High to validate | Alert threshold | First measurable | Owner |
|---|---|---|---|---|---|---|---|
| 1 | **sync_success_rate** | Successful sync runs ÷ attempted runs, where success = provider responded, records parsed, balances fetched, no unparseable page. **Excluded from the denominator and reported separately:** runs blocked by an expired consent (user-side), bank-declared maintenance, and the 4×/24 h cap (`rate_capped_share`). Reported per mode (unattended / user-present / catch-up) | bank × provider × day; sync runs table | daily 95 / 97 / 99 % on the top-10 banks; per-bank floor 90 % | any bank < 90 % for 2 consecutive days; overall < 95 % for 1 day; `rate_capped_share` > 10 % (scheduler bug) | Phase 3 | CTO |
| 2 | **sync_duration** | p50 / p95 seconds from run start to ledger updated, per mode; catch-up runs chunked in 14-day windows (Intesa) reported separately as "wall time to complete catch-up" | bank × mode | user-present p95 ≤ 45 / ≤ 20 / ≤ 10 s; unattended p95 ≤ 5 / ≤ 3 / ≤ 1.5 min; catch-up after a 60-day gap ≤ 72 / ≤ 36 / ≤ 12 h wall time | user-present p95 > 60 s; unattended p95 > 10 min | Phase 3 | CTO |
| 3 | **transactions_imported** | Count per run / day / bank split into `new`, `dedup_hit`, `merged (fuzzy)`, `pending_replaced`, `superseded (csv↔api)`, `skipped` (must be 0); plus **expected-vs-actual** check: if `balanceAfterTransaction` chains do not reconcile, flag `gap_suspected` | bank × source × day | — (volume metric); `gap_suspected` share ≤ 2 / ≤ 1 / ≤ 0.3 % of account-syncs | `skipped` > 0 (silent-skip incident, release blocker); `gap_suspected` > 3 % on any bank | Phase 3 | CTO |
| 4 | **duplicate_rate** | Duplicates that reached the ledger (detected later by audit, user "è un doppione", fingerprint collapse on re-fetch, or balance mismatch) ÷ transactions ingested | bank × source × week | ≤ 1.0 / ≤ 0.5 / ≤ 0.1 % | > 1 % on any bank-week; any "respawning" duplicate after user deletion (release blocker, `PP-G-04`) | Phase 3 | CTO |
| 5 | **reconciliation_auto_rate** | Transactions that required a reconciliation decision (pending→booked, transfer pair, card settlement, refund, cash withdrawal, duplicate candidate) resolved automatically with evidence ÷ all such transactions; reported with **auto-applied precision** (audit) per link type | link type × bank × week | auto rate 70 / 85 / 92 %; precision at the auto threshold ≥ 97 / ≥ 99 / ≥ 99.5 %; recall (pairs found automatically or via inbox) ≥ 85 / ≥ 90 / ≥ 95 % | precision < 97 % on any link type (lower the threshold's aggressiveness, not the audit); phantom-leg incidents > 0 (release blocker, `PP-G-24`) | Phase 3 (deterministic), Phase 4 (full) | CTO + Data/ML |
| 6 | **classification_auto_rate** | Transactions auto-categorised above the confidence threshold (tiers T0–T5) without inbox routing ÷ transactions needing a category | tier × bank × kind × week | launch 65 / 75 / 85 %; steady state 80 / 90 / 94 % | drop > 5 pp week-over-week (format drift, the most common failure, `ai-ml-transaction-intelligence.md` §6.2) | Phase 4 | Data/ML lead |
| 7 | **classification_accuracy** | (a) Eval set: leaf and parent accuracy, macro-F1, calibration (ECE, Brier) per tier; (b) production **auto-error rate** = errors among auto-applied labels (30-day corrections + audit) ÷ auto-applied; (c) **abstain accuracy** = share of "null/needs review" decisions that were right to abstain | tier × bank × kind × confidence band | auto-error ≤ 3 / ≤ 2 / ≤ 1 %; abstain accuracy ≥ 85 / ≥ 90 / ≥ 95 %; eval leaf accuracy 85 / 90 / 94 % | auto-error > 3 % (release blocker for the tier); eval regression > 2 pp on a model change | Phase 4 | Data/ML lead |
| 8 | **review_rate** | Transactions routed to the Review Inbox ÷ transactions ingested; by item type | item type × bank × week | launch ≤ 25 / ≤ 20 / ≤ 12 %; steady state ≤ 15 / ≤ 10 / ≤ 6 % | > 30 % (users will churn on work, `US-S13`) **or** < 3 % while auto-error > 1 % (silent automation) | Phase 3 | Product |
| 9 | **correction_rate** | User corrections ÷ automatic decisions (category + reconciliation), with **repeat-correction rate** (same merchant/pattern corrected ≥ 2 times by the same user) and **rule-creation share** (corrections that produced a rule) | tier × bank × tenure | correction rate ≤ 10 / ≤ 5 / ≤ 3 %; repeat-correction ≤ 15 / ≤ 8 / ≤ 3 % of corrections; rule-creation share ≥ 40 / ≥ 60 / ≥ 75 % of first corrections | repeat-correction > 20 % (learning is not working — the Emma failure, `EU-S-20`) | Phase 3 (deterministic), Phase 4 | Data/ML lead |
| 10 | **connection_failure_rate** | `connection_failed` ÷ `connection_started`, by cause; bank-side and provider-side causes reported separately from user abandonment | bank × provider × cause × week | total ≤ 40 / ≤ 30 / ≤ 20 % (complement of completion 60/70/80); bank/provider-side ≤ 10 / ≤ 5 / ≤ 2 % | bank/provider-side > 10 % on any bank-week → health page status change + provider ticket | Phase 3 | CTO |
| 11 | **consent_expiry_rate** | Live connections that reached `expired` in the month without renewal ÷ live connections at month start; companions: **renewal before expiry** (renewed within configured reminder window before actual provider `valid_until`/`expires_at`), **renewal within 7 days of expiry**, **history-gap incidents** (renewal > 90 days late) | bank × month | expiry rate ≤ 35 / ≤ 20 / ≤ 10 %; renewal before expiry ≥ 60 / ≥ 80 / ≥ 90 %; within 7 days ≥ 70 / ≥ 85 / ≥ 95 % | renewal before expiry < 60 % (reminder UX failing); any bank whose provider `expires_at` is missing (mark expiry UNKNOWN, investigate provider state and show honest reauthentication/freshness information; never invent a date) | Phase 5 (first expiries) | Product |
| 12 | **ai_cost_per_active_user** | (LLM + embedding + OCR + vendor enrichment spend in the month) ÷ MAU; also per paid member and per 1,000 transactions, per tier | tier × plan × month; vendor invoices + AI logs | per MAU €0.01 / €0.02 / €0.04 (free), €0.02 / €0.04 / €0.08 (Plus), €0.05 / €0.10 / €0.25 (Later advanced capabilities; zero launch volume); per 1,000 tx $0.03–0.10 blended | > €0.10 per paid member-month (D-UE-3 cap) → route more rows to cheaper tiers / batch; cache-hit rate < 50 % on the stable prefix | Phase 4 | CTO + Data/ML |
| 13 | **provider_cost_per_active_user** | AIS invoice (variable + minimum) ÷ MAU; **per connected account-month** (the contracted unit); **free AIS cost per paid subscription** = AIS cost attributable to free connected users ÷ paid subscriptions (Gate C guardrail) | provider × plan × month; invoices + connections table | per account-month €0.10 / €0.30 / €0.60 (UNKNOWN until RFP); free AIS cost/active paid subscription guardrail ≤€0.95, warning€0.80; unavailable with zero paid denominator | free AIS cost per paid > €0.95 for two consecutive months → review funded new-cohort F′ transition with clear notice (D-BM-1); minimum invoice > 25 % of total AIS cost (under-utilised floor) | Phase 5 | CFO |

**Extras the research shows are the real failure signals (same labelling; all HYPOTHESIS targets):**

| # | Metric | Definition | Target (L / B / H) | Alert | Evidence |
|---|---|---|---|---|---|
| 14 | **silent_skip_incidents** | Count of transactions the provider returned that did not reach the ledger or the sync report (detected by balance mismatch, audit or user report) | 0 / 0 / 0 | any → release blocker | `PP-G-84`, `G-83`, `G-87` |
| 15 | **balance_mismatch_rate** | Account-syncs where the computed booked balance ≠ bank balance ÷ account-syncs; every mismatch is an inbox item, never a log line | ≤ 2 / ≤ 1 / ≤ 0.3 % | > 3 % on any bank | `user-pain-points.md` D5; `PP-G-38…G-42` |
| 16 | **pending_replacement_precision** | Pending rows correctly replaced in place by their booked row ÷ pending rows that booked (audit) | ≥ 96 / ≥ 98 / ≥ 99.5 % | < 96 % | `US-V4` (Plaid linkage); `reconciliation-and-data-model-patterns.md` §4.3 |
| 17 | **transfer_pair_precision / recall** | On labelled pairs: precision of auto-pairs; recall including inbox-confirmed pairs | precision ≥ 97 / ≥ 99 / ≥ 99.5 %; recall ≥ 85 / ≥ 90 / ≥ 95 % | precision < 97 % | `PP-G-01` (382 votes); `jobs-to-be-done.md` §7 F2 |
| 18 | **recurring_next_date_accuracy** | Share of SDD/PagoPA/card recurring items whose predicted next debit lands within ±3 days and ±10 % amount; **false-regular rate** (one-offs called recurring) | ≥ 80 / ≥ 90 / ≥ 95 %; false-regular ≤ 4 / ≤ 2 / ≤ 1 % | false-regular > 4 % | `EU-S-22` (Snoop anti-benchmark); `jobs-to-be-done.md` §7 F7 |
| 19 | **support_contacts_per_1k_MAU** | Human-handled contacts per 1,000 MAU per month, by topic; **contacts per 100 connection failures** | ≤ 25 / ≤ 15 / ≤ 8; per 100 failures UNKNOWN benchmark → ≤ 20 / ≤ 10 / ≤ 5 | > 25 for 2 months (F06) | `unit-economics.md` U22; `jobs-to-be-done.md` §6.4 |
| 20 | **crash_free_sessions / api_p95** | Crash-free sessions; API p95 latency for the month view and inbox | ≥ 99.0 / ≥ 99.5 / ≥ 99.8 %; p95 ≤ 800 / ≤ 400 / ≤ 250 ms | crash-free < 99 % | priority "speed" (8th) — tracked, not optimised ahead of correctness |
| 21 | **export_success / deletion_sla** | Export completes first time; account deletion completed (crypto-shredded) within the SLA | export 100 %; deletion ≤ 72 / ≤ 24 / ≤ 4 h | any failed export; deletion > 72 h | `PP-§A #13`, `EU-S-08`; GDPR Art. 17 |

---

## 6. Guardrail metrics (no engagement farming)

### 6.1 Doctrine (DECISION proposed)

1. **Time in the app is a cost the user pays.** Minutes per month is targeted *downwards*; sessions per user, push opens and screens per session are reported but never appear as targets, OKRs or bonus criteria. (The `go-to-market.md` §8 line "sessions per MAU ≥ 12" is superseded by this document — OPEN QUESTION 1.)
2. **Every growth metric is published next to its counter-metric** (paired metrics): activation next to connection_failure by cause; trial→paid next to refund rate and cancel-flow taps; inbox-zero rate next to auto-error rate; insight opens next to opt-outs; referrals next to referred-user D30.
3. **Nine guardrails are release blockers**: a release that breaches one does not ship, whatever it does to the North Star.
4. **Guardrails have owners outside growth** (Product, Compliance/DPO, CTO) so the people measured on growth are not the ones policing it.

### 6.2 Guardrail table

| # | Guardrail | Definition | Threshold (DECISION where marked, else HYPOTHESIS) | Protects against | Release blocker? | Owner |
|---|---|---|---|---|---|---|
| G1 | **Minutes per month in the app** (median, active connected users) | Sum of foreground session minutes per user-month | ≤ 5 (Base); alert if the median rises above 8 while the inbox size is flat (the app is becoming work) | Engagement farming; manual-work churn (`US-S13`) | No (trend review) | Product |
| G2 | **Auto-applied error rate** | §5 #7(b) | ≤ 2 % (DECISION); ≤ 3 % hard stop | Gaming the ACR by auto-applying more | **Yes** | Data/ML |
| G3 | **Review-routing floor** | Decisions below the confidence threshold actually routed to the inbox ÷ decisions below threshold | ≥ 95 % (DECISION); any code path that suppresses routing is a defect | Silent automation (`PP-G-24/G-83/G-84`) | **Yes** | CTO |
| G4 | **Undo rate** | `automation_undone` ÷ automatic actions shown to the user | ≤ 2 % (Base); > 5 % = automation too aggressive | Over-automation | **Yes** (> 5 %) | Product |
| G5 | **Inbox-zero by abandonment** | `inbox_zero_reached{reached_by: expiry}` + expired items ÷ all inbox items | ≤ 10 % | Empty inbox that was never read | No (trend) | Product |
| G6 | **Correction friction** | Taps from any transaction to a saved correction; p50 seconds | ≤ 2 taps (DECISION); p50 ≤ 10 s | Hiding corrections to protect the ACR | **Yes** (taps) | Product |
| G7 | **Un-reminded charges** | Actual subscription renewals without required advance notice; non-renewing previews never charge; checkout purchases need explicit confirmation (`trial_reminder_sent`, renewal reminder) | 0 (DECISION) | Billing anger, Trustpilot gap (`PP-§A #7`) | **Yes** | Monetisation + Compliance |
| G8 | **Cancel-flow taps** and **refund / chargeback rate** | Taps from Settings to cancellation or actual store-management destination; refunds ÷ charges with channel eligibility | ≤2 taps to the appropriate channel (Lilleri cannot promise external store taps); refunds≤0.5% is a hypothesis, never suppress lawful refunds | Dark patterns (AGCM; `regulatory-landscape.md` §4.5) | **Yes** (taps) | Product + Compliance |
| G9 | **Trustpilot − App Store gap** | Difference in stars at month 6 and 12 | ≤ 1.0 (Base); ≤ 0.5 (High) | Billing/support erosion (`competitors-us.md` §4.5) | No (brand KPI) | Brand + Support |
| G10 | **Support contacts per 1,000 MAU** | §5 #19 | ≤ 15 | Opaque failures | No | Support |
| G11 | **Notification volume and relevance** | Service pushes per user per week; acted-on share; opt-out rate | ≤ 3 pushes/week (DECISION cap); acted ≥ 30 %; opt-out ≤ 5 % | Push-driven "engagement" | No (cap to be implemented and verified) | Product |
| G12 | **Rating-prompt discipline** | Prompts shown only after `inbox_zero_reached{reached_by: resolution}`; ≤ 1 per user per year | 100 % compliance (DECISION) | Store-rating gaming | **Yes** | Product |
| G13 | **Distress-triggered prompts** | Upgrade/offer prompts shown within 7 days of a projected-negative, failed-debit or low-balance signal | 0 (DECISION; AI Act Art. 5 posture, `regulatory-landscape.md` §4.3) | Exploiting vulnerability | **Yes** | Compliance |
| G14 | **Analytics schema violations** | Events or properties outside the registry/allow-list caught by lint or DPO review | 0 (DECISION) | Privacy drift | **Yes** | DPO |
| G15 | **Export-without-churn** | Users who exported and are still active 30 days later ÷ exporters | ≥ 60 % (export is a safety valve, not an exit) | Treating portability as churn risk | No | Product |
| G16 | **Offers-rail health** (Phase 7+) | Opt-in rate; complaints per 1,000 offers shown; descriptive NPS delta opted-in vs control, with selection bias; randomised invitation/eligible test needed for causal inference | opt-in genuine (no pre-ticking); complaints ≤ 1 per 1,000; NPS delta ≥ −0 (kill switch at −5, D-BM-5) | Revenue destroying trust | **Yes** (kill switch) | Product + Compliance |
| G17 | **Coverage honesty** | Share of users who attempted a source shown as "supported" and got `no_accounts` or `unsupported_account_type` | ≤ 2 % | Promising banks that do not connect (`EU-S-13a`) | No (health-page update within 24 h) | CTO |
| G18 | **Silent-skip incidents and phantom legs** | §5 #14; invented transfer counterparts | 0 | The two documented trust-killers | **Yes** | CTO |

### 6.3 Paired-metric reporting rule (what every dashboard tile shows)

| Growth metric | Must be shown with |
|---|---|
| Activation (registered → connected) | connection_failure_rate by cause; coverage_unavailable_shown share |
| WOW-session rate | balance_mismatch_rate; inbox items at first sync |
| Inbox-zero rate | auto-applied error rate; review-routing floor; inbox-zero by abandonment |
| Trial → paid | refund rate; cancel-flow taps; un-reminded charges |
| Insight opens | opt-outs; dismissed-without-opening |
| Referrals share | referred-user D30 vs organic D30 |
| Paid subscriptions per 1,000 MAU | free AIS cost per paid subscription; Trustpilot gap |
| Auto-correct rate (observed) | audited ACR; hidden error rate |

---

## 7. Measurement plan by phase (summary; detail in `roadmap.md`)

| Phase | What is instrumented | What becomes measurable | Calibration action |
|---|---|---|---|
| 2 — Technical foundation | Event registry + lint; `ledger_event`, `sync_run`, `consent_event` tables; invoice ingestion; eval harness skeleton | Nothing user-facing yet; fill-rate pilot metrics per bank (Enable Banking restricted production) | Freeze metric definitions v1 and the fingerprint/normaliser versions |
| 3 — Open Banking MVP | All SYNC/CONNECT/CORRECT events; §5 #1–5, 8–10, 14–17, 21 on founders' accounts | Observed ACR on dogfood; sync health per bank; inbox size | 25 fixture scenarios pass; balance equality 100 % on dogfood |
| 4 — AI automation | LEARN/AUTOMATE events; §5 #6–7, 12, 18; weekly audit procedure (internal data) | Eval-set accuracy; auto/abstain rates; AI cost | Thresholds chosen to hit auto-error ≤ 2 % on the eval set |
| 5 — Closed beta | Retention cohorts, TTFV at scale, trial funnel, support topics, consent renewals, provider cost; audited ACR with consented users | North Star baseline; beta release criteria and Gate F UX evidence | **Re-calibrate every Low/Base/High after the first 200 consented users** (J-9); publish v1 of the dashboard |
| 6 — Launch | Store webhooks (billing), CAC by channel, Trustpilot gap, referral K | Economics branch; guardrails G7–G12 live | Monthly metric review; thresholds versioned |
| 7 — Monetisation | Renewal cohorts, offers-rail guardrails, price tests | Churn/renewal; Gate C re-evaluation and expansion release decision | 12-month review against C1–C6 |
| 8 — Europe | Per-market cuts of everything (bank, provider, locale) | Market "mini-gates" | Reset Low/Base/High per market |

Review rituals (DECISION proposed): weekly correctness review (CTO + Data/ML: §5 #1–10, #14–18, audit results); monthly North Star review (whole team: ACR observed vs audited, Reach, Trust branches, guardrails); quarterly economics review (CFO: U-inputs replaced by measured values, Gate C conditions). No metric is discussed without its label (observed/audited, HYPOTHESIS/measured) and its grain.

---

## Decisions / Recommendations

| ID | Decision / recommendation | Label | Needs ADR? |
|---|---|---|---|
| M-1 | **North Star = audited Auto-correct rate** ("movimenti a posto da soli"), reported with its volume form; definition v1 as in §2.2 A with the six criteria and the three instruments (§2.4) | DECISION (proposed) | Yes — metric definitions are versioned with the ledger schema |
| M-2 | WACU-fresh is the Reach input, TTFV/WOW-session rate the activation input, inbox-zero rate a paired companion only; paid subscriptions per 1,000 MAU stays a Gate C business KPI | DECISION (proposed) | No |
| M-3 | Metric tree with four branches and the thirteen inputs placed as in §3.2; targets are Low/Base/High HYPOTHESES to be versioned as metrics configuration when the finance-model/dashboard is implemented and re-calibrated after 200 consented users | DECISION (proposed) | Reference the finance-model ADR (`unit-economics.md` R-UE-2) |
| M-4 | Event taxonomy per §4: semantic, server-side first, registry-as-code, DPO-reviewed, lint-enforced allow-list, "never send" list as a standing rule; self-hosted or EU-hosted analytics; no ad/attribution SDK | DECISION (proposed) | Yes — analytics architecture ADR (Phase 2) |
| M-5 | Operational metrics per §5 with alert thresholds; silent skips, phantom legs and respawning duplicates are zero-tolerance release blockers | DECISION (proposed) | Yes — observability ADR |
| M-6 | Guardrail doctrine per §6: minutes per month targeted downwards, sessions never targeted, paired metrics on every tile, nine release-blocking guardrails owned outside growth | DECISION (proposed) | No (product policy; cite in the PRD) |
| M-7 | Supersede `go-to-market.md` §8 "sessions per MAU ≥ 12" with G1/G11; keep its other targets as the Base column here | RECOMMENDATION | No |
| M-8 | Build the weekly audit (200–500 labelled transactions) as a standing team ritual from Phase 4; budget 2–4 hours/week; without it the North Star is only "observed" and must be labelled as such everywhere | RECOMMENDATION | No |
| M-9 | No external accuracy claim ("95 %") until the audited ACR has three consecutive months of data; copy uses counts ("112 su 118"), never percentages with decimals | RECOMMENDATION (ties to `brand-strategy.md` D6) | No |

## Open questions

| # | Question | Why it matters | How to resolve | Owner / phase |
|---|---|---|---|---|
| 1 | Resolved: GTM removes sessions/MAU target; confirm all future dashboards preserve low-effort policy | Consistency of the dashboard and incentives | Keep M-7 and test dashboards against it; no outstanding naming conflict | Head of Product, Phase 1 |
| 2 | Which analytics vendor (self-hosted vs EU SaaS) and crash reporter satisfy §4.1 and `privacy-model.md` §6 at seed-stage cost? | Pipeline mode; DPA | Phase 2 ADR with a 3-option comparison | CTO + DPO, Phase 2 |
| 3 | Can the audited ACR be computed without a research consent (internal annotators on pseudonymised rows under Art. 6(1)(f) with LIA), or does it need the explicit beta research consent? | Feasibility of the audit at launch scale | Counsel + DPO memo; `consent-model.md` update | DPO, Phase 4 |
| 4 | What is the minimum weekly audit sample for a ±2 pp error bar per bank once there are 15 banks? | Audit cost | Statistical design after the first month of beta data | Data/ML, Phase 5 |
| 5 | Should inbox-routed transactions ever count as "without intervention" (e.g., when the user merely confirms Lilleri's top suggestion in one tap)? | Definition purity vs incentive to ask good questions | Decide with the first 200 users' data: if one-tap confirms dominate and users do not perceive them as work, publish ACR v2 with a "confirmed" sub-rate | Product, Phase 5 |
| 6 | Real per-bank `expires_at` behaviour (90 vs 180 days) changes the consent_expiry_rate baseline | Target calibration | Enable Banking pilot statistics; RFP answers | CTO, Phase 2 |
| 7 | Does D30 ≈ 4 % (Business of Apps) or ≈ 10–15 % (digital banking) apply to an Italian PFM with a connected account? The sources disagree by category (`NEW-M2`) | Retention targets | Beta cohorts; AppsFlyer/Adjust finance category cut if purchasable | Growth, Phase 5 |
| 8 | Is "transactions" the right unit for the volume form, or "account-months kept correct"? | Volume form may over-weight heavy users | Compare both on beta data; pick the one that correlates with retention | Product, Phase 5 |
| 9 | k-anonymity floor for `bank_id` in anonymised mode (50 users proposed) | Small banks (BCC) could re-identify | DPO decision | DPO, Phase 2 |

## Review log

| Reviewer | Finding | Resolution |
|---|---|---|
| Data (major) | D7/D30 used multi-day return windows and accuracy added observed corrections to biased audit counts | Exact-day retention defined; rolling returns separate; correction rate and representative audited error distinct, no double counting |
| CFO (blocker) | ARPPU/GM targets used abandoned four-plan/offer model | Plus-only, zero-offers outputs; free subsidy€0.95, no all-free-beta paid ratio |
| Privacy (major) | Semantic properties and bank metadata could flow to third-party analytics | Internal operational grain separated from external analytics; no financial-category properties |
| Fintech (major) | Expiry reminders assumed day150/170/178 and missing expiry fallback day150 | Provider-relative reminders; missing expiry unknown/visible and provider investigation |
| PM (major) | Frozen metrics/scenarios and enforced caps implied code had been implemented | Implementation requirements labelled; free beta, sandbox and live cohorts separated |

## Sources

All carried-over claims were verified on 2026-10-02 by the input documents named; IDs resolve in those documents' Sources sections. "Snippet" = search-engine summary only, page not read.

### Input documents (this repository)

| Document | Sections used |
|---|---|
| `docs/product/jobs-to-be-done.md` | §0 main job; §4 loop and success signals; §5 WOW definition; §6 TRUST; §7 targets; J-2, J-4, J-9 |
| `docs/product/personas.md` | P1–P5 trust thresholds and WTP; §7 capability matrix |
| `docs/research/user-pain-points.md` | §0, §1 ranked pain points; §5 churn; §6 trust; D1–D13 |
| `docs/research/opportunity-map.md` | §1.2 visible automation; §2.5 inbox; §2.6 learning; §3 differentiators; §5 #9 "measure by correctness" |
| `docs/research/market-analysis.md` | §3 (CRIF 57.4 %, NEW-4); §8.2 amended promise; §9 Gate A conditions |
| `docs/research/open-banking-providers.md` | §1.1 PSD2 parameters; §1.3 quirks; §5.5 D2 pilot; §6 Gate B |
| `docs/research/data-sources-feasibility.md` | §0 source matrix; §10 limitation statements |
| `docs/compliance/regulatory-landscape.md` | §2 rows 6–8, 18–19; §4.3, §4.5; D5, D6 |
| `docs/compliance/privacy-model.md` | §1 (controller roles), §4 M4–M5, §5.2 quiet set, §6 analytics rules, D2 |
| `docs/compliance/consent-model.md` | §4 consent records; §5 renewal timeline |
| `docs/business/business-model.md` | D-BM-1 guardrail; D-BM-2 never-paywalled; D-BM-4/5 offers rail; R-BM-2 three KPIs |
| `docs/business/unit-economics.md` | U1–U35; §3 COGS; §6 per-1,000-MAU; §8 sensitivity; D-UE-2/3 |
| `docs/business/revenue-scenarios.md` | §1 scenarios; §6 Gate C conditions C1–C6 |
| `docs/business/go-to-market.md` | §4 beta exit criteria; §8 metrics dashboard; W-1, W-8 |
| `docs/brand/brand-strategy.md` | §1, §7 R1–R10, §10 anti-patterns, §13 brand measures, D6 |
| `docs/brand/messaging-framework.md` | Review Inbox name candidates; glossary |
| `docs/research/raw/ai-ml-transaction-intelligence.md` | §2.2 (Sure eval lesson), §2.6 calibration, §6.1–6.3 eval set, metrics and minimisation, §7.2 cost per 1k |
| `docs/research/raw/reconciliation-and-data-model-patterns.md` | §4.3 pending→booked machine, §5 audit/undo/evidence, §9.2 match types, §9.3 fixtures |

### Key external sources carried over (IDs as in the input documents)

| ID | Source | URL | Date | Reliability | Used for |
|---|---|---|---|---|---|
| NEW-4 (market-analysis) | CRIF Open Banking outlook via Pagamenti Digitali: 57.4 % connection success H1 2025 | https://www.pagamentidigitali.it/digital-banking/open-banking-cresce-la-fiducia-in-italia-nel-2025-oltre-la-meta-dei-conti-viene-collegata-con-successo/ | 2025-10 | medium (snippet; credit-flow sample) | Connection-completion baseline |
| PP-G-01 | Actual Budget #1628 "Recognise transfers between accounts" (382 up-votes) | https://github.com/actualbudget/actual/issues/1628 | 2023-09-01 | high | Value of automatic pairing |
| PP-G-43 | Actual Budget #669 "Merge unmatched transactions" (121 up-votes) | https://github.com/actualbudget/actual/issues/669 | 2023-02-19 | high | Inbox value |
| PP-G-24 / G-83 / G-84 / G-87 | Actual Budget #3485 (phantom transfer), #8701 (silent overwrite), #9063 (silent skip), #8221 (dedup drops legitimate rows) | https://github.com/actualbudget/actual/issues/3485 ; https://github.com/actualbudget/actual/issues/8701 ; https://github.com/actualbudget/actual/issues/9063 ; https://github.com/actualbudget/actual/issues/8221 | 2024–2026 | high | Silent-automation guardrails |
| PP-G-04 | Actual Budget #2289 (deleted transactions respawn) | https://github.com/actualbudget/actual/issues/2289 | 2024-01-26 | high | Duplicate guardrail |
| US-S51 | Copilot changelog: Copilot Intelligence (per-user model after ~30 reviews) | https://changelog.copilot.money/log/copilot-intelligence | 2023-09-05 | high | Learning benchmark |
| US-S65 | fincomparelab Copilot review ("95 %" third-party claim) | https://www.fincomparelab.com/reviews/copilot-money-review/ | 2026 | low | Unverified accuracy claims |
| EU-S-20 / S-21 | Emma Trustpilot ("never learns"); Emma help (learns after three edits) | https://uk.trustpilot.com/review/emma-app.com ; https://help.emma-app.com/en/article/change-a-transaction-category-iipyy2/ | n/d | low-medium / high | Repeat-correction guardrail |
| EU-S-22 | Snoop categorisation complaints (one-offs counted as regular) | https://www.trustpilot.com/review/snoop.app?page=3 | n/d | low | Recurring false-regular rate |
| US-S13 | Penny Hoarder YNAB review (manual effort, 2–4 weeks) | https://www.thepennyhoarder.com/budgeting/ynab-review/ | 2026 | medium-low | Review burden churn |
| US-S25 / S92 / S79 | Monarch delayed transactions ("allow 24 h"); Simplifi pending 4–6 h; Ramsey on Rocket "minutes" | https://help.monarch.com/hc/en-us/articles/360048883651-Troubleshooting-Delayed-Transactions ; https://support.simplifi.quicken.com/en/articles/5654045-does-quicken-simplifi-download-pending-transactions ; https://www.ramseysolutions.com/budgeting/what-is-rocket-money | 2022–2026 | high / high / medium | TTFV anchors |
| US-V4 | Plaid transactions docs (pending→posted linkage) | https://plaid.com/docs/transactions/transactions-data/ | live | high | Pending replacement precision |
| US-W3 | Plaid customer story on YNAB (+21 % UK / +12 % EU conversion, −62 % errors) | https://plaid.com/en-gb/customer-stories/ynab/ | 2025 | high (vendor claim) | Aggregator quality → conversion |
| US-W6 | YNAB Trustpilot (4.6, 3,103 reviews) | https://www.trustpilot.com/review/ynab.com | live | medium | Rating-gap guardrail |
| US-W12 | Monarch $100 M ARR, > 1 M members | https://www.prnewswire.com/news-releases/monarch-hits-100m-in-arr-acquires-mbi-to-accelerate-next-phase-of-growth-302896004.html | 2026-10-01 | high | ARPU comparables |
| EU-S-68 | Finanzguru > 3 M users, ≈ €40 M revenue 2025 | https://www.aktiencheck.de/news/Artikel-3_Millionen_Nutzer_Wie_Finanzguru_Konkurrenz_abhaengt-19361555 | 2026 | medium-high | ARPU comparables |
| W-1 (business docs) | RevenueCat, State of Subscription Apps 2026 | https://www.revenuecat.com/state-of-subscription-apps | 2026-10-02 | medium (snippet) | Trial conversion and annual retention anchors |
| EB-1 | Enable Banking FAQ (per-account billing, minimum invoice; entry_reference) | https://enablebanking.com/docs/faq/ | 2026-10-02 (mirror) | high | Provider cost unit; identity |
| A-#195 | Yapily data-restrictions page (Intesa 429, two-week window) | https://docs.yapily.com/pages/data/financial-data-resources/data-restrictions/ | live | high | sync_duration catch-up |
| EU-1 / EU-2 | Delegated Reg. 2018/389 art. 36(5)(b) + EBA Q&A 2019_4631; Delegated Reg. 2022/2360 | https://eur-lex.europa.eu/eli/reg_del/2018/389/oj ; https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2019_4631 ; https://eur-lex.europa.eu/eli/reg_del/2022/2360/oj/eng | 2018–2023 | high | 4×/24 h; 180-day renewal |
| IT-Y-02 | Giuseppe Castagna — "Il metodo con cui traccio i miei soldi (in 5 minuti al mese)" | https://www.youtube.com/watch?v=kJNxDIcJOac | 2025-12-26 | low-medium | Minutes-per-month ladder |
| RL S-32 | Apple App Review Guidelines (5.1.2(i), 3.2.1(viii), 5.1.1(v)) | https://developer.apple.com/app-store/review/guidelines/ | 2026-06-08 (first-hand) | high | Permission step event |
| NEW-1 (regulatory) | Google Play policy announcement 15 Jul 2026 (User Data policy and third-party AI) | https://support.google.com/googleplay/android-developer/answer/17134731?hl=en | 2026-07-15 | medium (snippet) | Permission step event |
| Garante 2021 (RL S-27) | Garante cookie guidelines (docweb 9677876) — anonymised analytics conditions | https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/9677876 | 2021-06-10 | high (not fetched; via `privacy-model.md`) | Anonymised-mode rules |

### New sources from WebSearch on 2026-10-02 (snippets only; re-read before use)

| ID | Source | URL | Published | Reliability | Used for |
|---|---|---|---|---|---|
| NEW-M1 | Gary Klein, "Performing a Project Premortem", Harvard Business Review 85(9), Sep 2007 (PDF copy hosted at Southeastern Oklahoma State University) | http://homepages.se.edu/cvonbergen/files/2013/01/Performing-a-Project-Premortem.pdf | 2007-09 | medium (mirror of a known article) | Method reference for `pre-mortem.md` (cited there) |
| NEW-M2 | Business of Apps, "Finance App Benchmarks (2026)" (D30 ≈ 4.2 %); third-party roll-ups citing Adjust 2026 (finance D30 2 %) and 10–15 % for fintech / 11.6 % digital banking | https://www.businessofapps.com/data/finance-app-benchmarks/ ; https://semnexus.com/day-1-day-7-day-30-retention-benchmarks-app-category-2026 ; https://uxcam.com/blog/mobile-app-retention-benchmarks/ | 2026-01 / 2026 | medium-low (sources disagree by category; snippets) | D30 anchors in §3.2 #4 |
| NEW-M3 | Amplitude, "The North Star Playbook" (NSM qualities; stress-testing for gaming) | https://amplitude.com/resources/north-star-playbook ; https://info.amplitude.com/rs/138-CDN-550/images/Amplitude-The-North-Star-Playbook.pdf | n/d | medium (vendor playbook; snippet) | Criteria wording in §2.1 |

End of document.
