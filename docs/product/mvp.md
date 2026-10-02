# Lilleri MVP — strict scope, the vertical slice, success criteria and exit criteria

**Project:** LILLERI (greenfield consumer PFM; Italy-first, then Europe)
**Document type:** Phase 1 product document — MVP definition
**Date / verification date for every carried-over claim:** 2026-10-02
**Author:** Head of Product + principal architect (product side), founding team
**Companions:** `vision.md` (thesis, principles, loop, WOW/TRUST, automation modes), `prd.md` (full requirements; story IDs such as `CO-4`, `RE-3` are defined there), `backlog.md` (epics and stories), `personas.md`, `jobs-to-be-done.md`.
**Language:** documentation in English; product copy in Italian with English glosses.

## How to read this document

- Labels: **FACT** (cited source seen on 2026-10-02 by the input document named), **ASSUMPTION**, **HYPOTHESIS**, **DECISION** (proposed; final when recorded in an ADR), **OPEN QUESTION / UNKNOWN**.
- Evidence prefixes as in `prd.md` §0 (`MA`, `OM`, `PP`, `PE`, `JTBD`, `OBP`, `DSF`, `REG`, `BM`, `UE`, `BS`, `AI`, `RC`, `PM`, `CM`, `DR`, `CA`).
- **Every target number in §5 is a HYPOTHESIS to validate**, not a forecast. Ranges are Low / Base / High. No number here may appear in external claims before it is measured (`BS` D6).
- The MVP is a *closed beta* product: founders' own accounts first, then ≤ 200 invited users, then ≤ 1,000 (Phase 5 gates). "Launch" is what follows the exit criteria in §6.

---

## 1. Purpose and the scope rule

The MVP exists to prove one thing: **the core loop produces a correct cross-institution picture with nothing to fix, learns from one correction, and handles its first failure honestly** — on the accounts where Italian salaries land and most spending happens (current accounts, prepaid IBAN accounts, the main neobanks), for the primary persona P1 Giulia and the secondary personas P4 Paola and P2 Marco & Sara as individuals (`PE` PD-1).

**Scope rule (DECISION):** a capability is in the MVP only if removing it would make one of the following untrue for P1's stack (Intesa + Fineco + Revolut, with Satispay and Amex as honest fallbacks):

1. The first session can end in a WOW session (`vision.md` §5.3).
2. The first failure (consent expiry, outage, ambiguity, mismatch) is handled as a TRUST event (`vision.md` §6.2).
3. A correction is never needed twice for the same merchant.
4. The user can leave with everything (export) or delete everything, on day one.
5. Nothing moves money, nothing is paywalled that makes data correct, nothing is claimed that is not measured.

Everything else is P1, P2 or Later, however loved elsewhere. Feature count is the last of thirteen priorities.

---

## 2. What is in, what is out, and why

### 2.1 In the MVP (P0)

| # | Capability | Why it is in (evidence) | PRD stories | Principle |
|---|---|---|---|---|
| 1 | Account with passkey, 18+ gate, biometric lock, in-app deletion | Store rules (Apple 5.1.1(v)); security is priority 3 | AU-1…AU-4 | C3, C6 |
| 2 | Bank connection through one licensed provider (route A), consent as a first-class object, "Collegamenti" screen, renewal cadence 150/170/178, history-gap handling | Connection breakage and consent expiry are pain points #1 and #3 (`PP`); no competitor markets renewal UX (`EU-§6`) | CO-1, CO-3, CO-4 | TRUST |
| 3 | Honest coverage per institution and account type with a ten-second manual fallback | Spendee-style broken promises are a churn driver; cards/wallets partly unreachable (`OBP` §1.4) | CO-2 | C5 |
| 4 | Provider-agnostic connector port with one live adapter and contract tests for a second | Provider choice is strategic; GoCardless closed; Yapily primary conditional on gates G1–G4, Enable Banking fallback (`OBP` D1–D2, D7) | CO-6 | P3 |
| 5 | Sync engine: 4×/24 h budget, user-present refresh, 14-day paging parameter, immutable provider records, layered identity, trailing-window re-fetch, idempotent runs, per-run report, balance check | Duplicates (#2), silent drops (#6), balance mismatch (#10) (`PP`); the identity evidence in `RC` §0–§2 | SY-1…SY-5 | C1, P6 |
| 6 | CSV/XLSX import (Intesa, UniCredit, Fineco, Revolut, N26, PayPal + generic mapper) and manual accounts (cash, wallet, card statement) | 90-day history limit; uncovered institutions; cash >60% of POS transactions by number (`DSF` §3, §8; `MA` NEW-3) | SY-6, SY-7 | C4, C5 |
| 7 | Transactions list, detail with raw descriptor and "why", search; exact money and date representation | "Combined list" and "show imported payee" requests (`PP-G-68`, `G-53`); `RC` §3 | TX-1…TX-4 | P3, P6 |
| 8 | Merchant normalisation and the Italian payment-type dictionary (kind axis from channel keywords and CBI causali) | Italian strings are regular and finite (`AI` §1.3); F24/PagoPA/SDD/ricarica semantics (`PP` I-14) | MN-1, MN-2 | P2, C4 |
| 9 | Canonical taxonomy separate from user taxonomy; unlimited user categories; merge/archive with migration; quiet set; hide categories | Gated categories are the most resented paywall (`PP` #14); Art. 9 posture (`PM` §5) | CA-1…CA-4 | P5, C6 |
| 10 | Categorisation pipeline tiers T0–T4 with the precedence order, abstention, calibrated scores; T4 only with P-AI permission and pseudonymised payloads | "Never learns" (#5); Copilot's per-user model is the praised benchmark (`US-S51`); store rules on third-party AI | AC-1…AC-5 | P5, P4 |
| 11 | Feedback types (correct, wrong category, merchant rename, transfer, refund, duplicate, recurring, subscription, ignore, split) with locks, events, undo; one-tap rule proposal after the first correction; rules engine | Learning must be visible after one correction (`EU-S-21` vs `EU-S-20`); Sure's locks (`AI` §2.8) | FB-1…FB-4 | P5, P6 |
| 12 | Calibration service and versioned automation policy; modes CONTROL and BALANCED (default); shadow mode | "92% auto + 8% review beats 99% auto with 5% hidden errors" (`vision.md` P4) | CF-1…CF-4 | P4 |
| 13 | Review Inbox with actions ✓ / categoria / trasferimento / dividi / duplicato / rimborso / ignora, swipe, undo, empty state | 121 up-votes for merge/approve; approve-everything is a churn driver (`PP-G-43`; `US-S13`) | RI-1…RI-3 | CORRECT stage |
| 14 | Reconciliation: pending→booked, duplicates across sources (EXACT_ID / FINGERPRINT / FUZZY_WINDOW), internal transfer pairs (incl. wallet top-ups and single-leg own-IBAN), card settlement typing and exclusion (bank-side), provider deletion → needs review, evidence records, batch undo | The wedge: 382 up-votes; double-counted card payments (#15); phantom records (`PP-G-24`) | RE-1…RE-4 (typing), RE-9, RE-10 | P4, P6, C1 |
| 15 | Recurring detection with Italian periodicities and the five types; subscriptions/bills list with next 60 days | Loved contract ledgers (`EU-S-35`); one-offs counted as regular is the anti-pattern (`EU-S-22`) | RS-1, RS-2 | P2, C4 |
| 16 | Monthly "Cosa è successo" summary with source data, calculation, confidence, `is_estimate` | The ChatGPT-DIY output Italians want (`IT-Y-02`) | IN-1, IN-2 | P6 |
| 17 | Safe-to-spend number with visible formula | Satispay's Budget is the Italian mental model (`WS-07`); fallback WOW for single-institution users (`JTBD` J-7) | BU-1 | P1 |
| 18 | Service notifications (inbox non-empty, consent reminders, mismatch, summary ready), no payload | Renewal UX needs push (`CM` §5.2) | NO-1 | TRUST |
| 19 | Privacy dashboard "I tuoi dati", "Permessi e privacy", export ZIP, per-connection and account deletion, retention jobs | Trust preconditions; store rules; GDPR rights as features (`PM` D9; `DR` R3) | PR-1…PR-5 | C3 |
| 20 | Settings; degraded-mode copy with "Ultimo aggiornamento 09:42"; offline read cache | No silent failure (`PP` D4) | SE-1, DG-1, DG-2 | C1 |
| 21 | it-IT master copy with English glossary; locale-correct numbers; WCAG 2.1 AA build | Brand rule (`BS` D10); accessibility decision (`REG` D9) | I18N-1, A11Y-1 | — |
| 22 | Entitlements engine with the never-gated list enforced; free envelope (1 institution, ≤ 2 accounts) enforced at connect time | Free-tier economics (`BM` D-BM-1); correctness never paywalled (`BM` D-BM-2) | PW-1, CO-5 | C3 |
| 23 | Household tenancy reserved in the data model (RLS, `household_id`, `scope`) — no feature | Avoids migration for Famiglia and partita IVA (`RC` §6; `PE` PD-2) | HH-0 | P3 |
| 24 | Evaluation set, 25 reconciliation fixtures, injection suite, semantic analytics, vendor register, DPIA, counsel engagement | Measurement is the condition for every claim (`BS` D6; `JTBD` J-9) | XD-5…XD-7 | P4 |

### 2.2 Out of the MVP for now (P1 / P2) — with reasons

| # | Capability | Priority | Why not now | Trigger to pull in |
|---|---|---|---|---|
| 1 | Second provider adapter live with per-institution failover | P1 | One adapter proves the loop; the second needs the RFP outcome and a dual-consent plan (`OBP` D7) | Gate G1–G4 answers; a bank the primary covers badly |
| 2 | Card statement-period link (settlement reconciled to card postings) | P1 | Card accounts mostly arrive by CSV; bank-side typing already removes double counting (RE-4 AC 1) | First 20 users with imported card statements |
| 3 | Refund matching, splits, cash wallet funded by ATM | P1 | Valuable but not needed for the first correct picture; each adds a match type to calibrate (`OM` §2.11, §2.16) | Inbox telemetry shows refund/cash questions > 5% of items |
| 4 | Recurring alerts (price change, missing, duplicate SDD), weekly digest with variances, watchlists | P1 | Detection must be precise before alerts can be trusted (`RS-1` false-regular < 2%) | Recurring precision measured at Base |
| 5 | AUTOPILOT mode and the weekly "Fatto da solo" digest | P1 | Needs measured override rates per user to be safe (`vision.md` §7.1) | ≥ 200 users with ≥ 30 reviews each |
| 6 | Trial lifecycle, reminders, paywall screens, two-tap cancel | P1 | Beta is free; billing surprises are pain point #8 and must be built carefully, not fast | Before public launch |
| 7 | Queued offline writes; coverage/health public page; accessibility external audit; pen test | P1 | Launch gates, not loop proofs | Before public launch |
| 8 | PDF statement import; web app for import/export (read-only ledger) | P1 / P2 | Mobile proves the loop; web is best for files (`DSF` §3) and an OPEN QUESTION for S1 (`OM` Q9) | Interview signal |
| 9 | Receipt photo attach (no extraction) | P2 | Nice, not loop-critical; conflict between `DSF` (MVP-lite) and `OM` (not in MVP) resolved as P2 | Post-launch |
| 10 | Reimbursable flag and reimbursement proposals | P2 | Depends on household semantics (`RC` §4.2) | Household discovery |
| 11 | Merchant/enrichment vendor bake-off; logos | P1 (logos) / P2 (vendor) | Own cascade first; vendor only on the residual (`AI` §1.1) | Residual share measured |

### 2.3 Later or never (DECISION, from `vision.md` §8 and `OM` §4)

| Capability | Status | Reason |
|---|---|---|
| Household (Famiglia): invitations, shared tags, joint-account ledger, assignment | Later (first expansion) | Couples norm is real (`IT-Y-05`) but needs two-consent pairing proven first |
| Financial chat over deterministic tools | Later | Users want the output, not a prompt (`IT-Y-02`); Art. 50 and MiFID guardrails |
| Receipt OCR, e-mail ingestion (forward-to-inbox, Gmail/CASA) | Later | Cost and surface before the core is trusted (`DSF` §12) |
| Android notification listener | Later (opt-in experiment) | Policy risk moderate; iOS impossible (`DSF` §6) |
| Investments/crypto import, PDF parsing of brokers | Later | FIDA not in force; manual/CSV only |
| Partita IVA scope features | Later | Data model reserved; adjacent to business banking |
| Offers rail, cashback, switching | Later (Phase 2 business) | Only after trust metrics; counsel on art. 67(2)(f) (`BM` D-BM-4) |
| Money movement, lending, advice, ads, data sale, scraping, SMS/accessibility reading, mascots, lifetime deals, sliders, daily caps, 7-day or card-up-front trials, accuracy claims before measurement | Never | `vision.md` §8 |

---

## 3. The vertical slice that proves the core loop

### 3.1 Narrative (P1 Giulia, HYPOTHESIS; FACT anchors in `PE` §2)

Monday morning. Giulia installs Lilleri, creates an account with a passkey, confirms she is over 18. She reads one screen that names the provider and its supervisor, says read-only, says 180 days. She connects Intesa (SCA in the Intesa app), Fineco, Revolut. Amex and Satispay are shown as "non ancora collegabili" with a ten-second manual balance. Three minutes after the last consent she sees **"Cosa ho capito"**: 14 new movements, the €200 bonifico Intesa → Revolut recognised as one movement, Saturday's Satispay refill typed as a top-up, the Amex statement debit typed as a card payment and excluded from spend, two pending items flagged, every balance equal to the bank's, Netflix/Spotify/palestra/RC auto listed with next dates, and **"Puoi ancora spendere 612 € fino al 31"** with the formula one tap away. The inbox has two cards: *SUMUP *BAR CENTRALE — Caffè e bar?* (she taps ✓, accepts the rule) and *Bonifico da Chiara R. 45 € — è un rimborso?* (she links it). Inbox: *Niente da fare.* Five months later a push says Intesa expires in ten days; she renews in thirty seconds from the Intesa app. One day Fineco is under maintenance; the home screen says so, with the last good update time and the next retry. She exports a ZIP once, to check that she can.

### 3.2 The walking skeleton (components the slice must exercise end to end)

| Stage | Component | Minimum implementation in the slice | Proof artefact |
|---|---|---|---|
| CONNECT | Consent service; one provider adapter; institution picker with coverage statuses; Collegamenti screen | Enable Banking restricted-production (founders' own accounts; real Italian data before any contract) **and** the primary provider's sandbox; production keys on contract (`OBP` D1–D2) | Consent events; `expires_at` read per bank; coverage statuses for the eight "works in Italy" institutions |
| SYNC | Scheduler (4×/24 h budget, user-present refresh); `provider_record`; identity strategy; pending→booked; duplicate stages; transfer pairing; card-settlement typing; balance check; `sync_run` report | All running against real founders' accounts and the 25 fixture scenarios in CI | Zero silent skips; balance equality or inbox item; sync report in Italian |
| UNDERSTAND | Normaliser + Italian dictionary; canonical/user taxonomy; tiers T0–T3 in-house; T4 small LLM behind P-AI with pseudonymised batched calls; recurring engine; monthly summary; safe-to-spend | T5 frontier residual deferred to P1 | Per-tier resolution share; auto-error on the eval set; "why" on every row |
| CORRECT | Review Inbox with the seven actions; swipe; undo | Mobile (iOS + Android) | ≤ 3 items after first sync on founders' accounts; ≤ 2 interactions |
| LEARN | Feedback → events, locks, rule proposal, merchant map, per-user index, eval set (pseudonymised) | Rules list in Settings | Repeat-correction rate on the same merchant |
| AUTOMATE | Calibration + versioned automation policy (CONTROL, BALANCED); renewal cadence; mismatch item; service push | Shadow mode for any new threshold version | Threshold version on every decision; renewal before expiry measured |
| Cross-cutting | Encryption classes, per-user DEK, export ZIP, account deletion with crypto-shredding, retention jobs, semantic analytics, degraded-mode copy, it-IT formatting, WCAG build | Day-one | "Delete my account" works on beta day one (`DR` R3) |

Platforms: iOS and Android via a shared React Native/Expo codebase; backend Node/PostgreSQL/Redis workers (per the monorepo assumption in `CA` header, ASSUMPTION); no web client in the slice (file import via share sheet; OPEN QUESTION on web for launch).

### 3.3 Milestones and gates (DECISION; dates are not set here)

| Milestone | Scope | Users | Gate to pass |
|---|---|---|---|
| **M0 Dogfood** | Walking skeleton on founders' accounts (Intesa, UniCredit, Poste/Postepay, BPM, Fineco, Revolut, N26 as available) via Enable Banking restricted production | 3–6 internal | Field fill-rate study reported (`OBP` Q4); 25 fixtures green; identity churn measured; no silent skips for 2 weeks |
| **M1 Closed beta A** | All P0 stories; primary provider on contract or Enable Banking promoted (`OBP` G1–G4) | ≤ 50 invited (S1/S2) | WOW-session rate and inbox load measured; counsel opinions on route A and taxonomy in hand; DPIA complete |
| **M2 Closed beta B** | P0 hardening; P1 items that telemetry demands (refunds/cash if > 5% of inbox questions); trial and paywall built but not charged | ≤ 200 | Success criteria at Base for 4 consecutive weeks (§5); zero trust-killer incidents |
| **M3 Open beta** | P1 launch gates (second adapter, alerts, AUTOPILOT, health page, audit, pen test) | ≤ 1,000 | Exit criteria (§6) → public launch |

### 3.4 How the slice proves each loop stage

| Stage | Hypothesis proven if | Instrument |
|---|---|---|
| CONNECT | ≥ Base connection success on the eight institutions; consent completion ≥ 85% of starts; renewal ≥ 80% before expiry | `consent_started/completed/failed`, `consent_renewed` |
| SYNC | Zero silent skips; balance equality or inbox item 100%; duplicates ≤ 1 per 1,000; pairing precision ≥ 99% at the auto threshold | `sync_run` reports; weekly 200-row audit; eval set |
| UNDERSTAND | Auto-error ≤ 2% on auto-applied labels with auto-rate ≥ Base; "Altro" < 5%; recurring next date ±3 days for ≥ 90% of SDD/PagoPA series | Eval set; calibration reports; audits |
| CORRECT | Inbox ≤ 3 after first sync; < 5 min/month; ≥ 90% resolved in ≤ 2 interactions | `inbox_item_resolved{interactions}`; session timing |
| LEARN | Repeat-correction rate → ≤ 2%; rule-override rate < 5% | `category_corrected`, `rule_deleted` |
| AUTOMATE | Trust-event resolution ≥ 80%; support contacts per 100 failures ≤ 20 | `consent_renewed`, support log |

---

## 4. Explicitly not built in the slice (so nobody builds it by accident)

Budget methods; category budgets for everything; charts beyond the summary; household; chat; receipts; e-mail; logos (monogram fallback is enough); vendor enrichment; web client; T5 frontier model; AUTOPILOT; alerts; PDF import; offers; referral mechanics; marketing push; investment accounts beyond manual balances.

---

## 5. MVP success criteria — targets to validate, and how they are measured

All targets are HYPOTHESES (`JTBD` J-9). "Base" is the value that must hold for four consecutive weeks on ≥ 200 connected beta users across ≥ 5 institutions for the exit criteria; "Low" is the floor below which the kill/pivot rules in §6.3 apply; "High" is the aspiration.

| # | Metric | Definition | How measured (instrument) | Low | Base | High | Anchor |
|---|---|---|---|---|---|---|---|
| S1 | **Connection success** | `consent_completed` ÷ `consent_started` per institution, on the eight "works in Italy" institutions (Intesa/isybank, UniCredit/Buddybank, Fineco, BBVA Italia, Revolut IT, Poste/Postepay, a BCC, N26), excluding user abandonment before the bank screen | Semantic events; per-institution breakdown; provider-caused vs Lilleri-caused classified | 65% | 75% | 85% | CRIF 57.4% in H1 2025 (FACT medium, credit flows; `MA` NEW-4) |
| S2 | **Sync success** | Scheduled refreshes completed within their window, Lilleri-caused failures only; separately, provider/bank-caused failure rate reported | `sync_run.status`; cause class | 93% | 97% | 99% | HYPOTHESIS |
| S3 | **Zero silent skips / overwrites** | Rows the provider returned that are absent from the ledger without a report entry; booked rows overwritten by unrelated rows | Weekly reconciliation of provider payloads vs ledger (automated) | 0 | 0 | 0 | DECISION (hard rule; `PP-G-83/G-84`) |
| S4 | **Balance equality** | Synced accounts whose booked balance equals the provider's after each sync, or an inbox item exists | Automated per sync | 100% | 100% | 100% | DECISION |
| S5 | **Normalisation rate** | Transactions resolved to a canonical merchant **or** a typed payment kind (F24, SDD creditor, ATM, settlement, transfer) without user input | Pipeline provenance; weekly 200-row double-annotated audit | 70% | 80% | 90% | `AI` §7.1 (T0 resolves kind for most rows, FACT on fixtures) |
| S6 | **Auto-categorisation precision** | Among auto-applied labels (BALANCED), share that the user never corrects within 30 days **and** that the audit confirms | Audit sample + `category_corrected{source_tier}` | 92% | 95% | 97% | Copilot third-party "95%" unverified (`US-S65`); Emma 3-edit rule |
| S6b | Auto-rate | Share of new transactions auto-applied (not sent to review) in BALANCED | Pipeline | 70% | 80% | 90% | ASSUMPTION |
| S6c | Auto-error rate | Wrong among auto-applied (1 − S6) | Audit | ≤ 8% | ≤ 5% | ≤ 3% | Target for calibration ε = 2% at steady state; beta tolerance wider |
| S7 | **Reconciliation precision** | Transfer pairs: precision at auto threshold / recall; pending→booked replacement precision; duplicate false-merge rate; card-settlement typing precision | Labelled audit of all auto links; eval set; user "sono diversi" / unpair feedback | 97% / 80% ; 95% ; ≤ 0.5% ; 90% | 99% / 85% ; 98% ; ≤ 0.1% ; 95% | 99.5% / 92% ; 99% ; 0 ; 98% | `JTBD` §7 F2–F4 |
| S8 | **% requiring review** | New transactions that enter the inbox (BALANCED), steady state after the first month | `inbox_item_created` ÷ new transactions | ≤ 25% | ≤ 15% | ≤ 8% | `vision.md` §7.1 ranges |
| S8b | Inbox after first sync | Items in the inbox at the end of the first session | `first_picture_shown` + inbox count | ≤ 5 | ≤ 3 | ≤ 2 | `JTBD` §5.3 |
| S8c | Minutes per month in the inbox | Median per active user | Session timing on inbox screens | 8 | 5 | 3 | `IT-Y-02` ladder (2/5/15) |
| S9 | **Onboarding completion** | Registered → first connection → first picture shown | Funnel events | 50% | 60% | 70% | ASSUMPTION |
| S9b | Consent completion | `consent_completed` ÷ users who reached the pre-redirect explainer | Funnel | 75% | 85% | 92% | `JTBD` §7 |
| S10 | **Time to first value** | Last connection → "Cosa ho capito" shown, p50 / p90 | `first_picture_shown{seconds_bucket}` | 5 / 15 min | 3 / 10 min | 90 s / 5 min | Monarch "allow 24 hours" is the anti-pattern (`US-S25`) |
| S11 | **WOW-session rate** | First sessions meeting all five WOW conditions among users with ≥ 2 institutions | Computed from events | 35% | 50% | 65% | `vision.md` §5.3 |
| S12 | **D7 / D30 retention (connected users)** | Users with ≥ 1 live connection who open the app on day 7 / day 30 | Cohort analytics (anonymised or consented id) | 25% / 12% | 35% / 20% | 45% / 30% | Generic free-app D30 4–9% (`UE` U33 ASSUMPTION) is not comparable; WOW vs non-WOW cohorts compared |
| S13 | **Repeat-correction rate** | Corrections on a merchant that already has a rule or learned preference | `category_corrected` with existing rule flag | ≤ 5% | ≤ 2% | ≤ 1% | `JTBD` §7 F5 |
| S14 | **Trust-event resolution** | Consents renewed before the connection stops; outages explained before a support contact | `consent_renewed`; support log tagging | 65% ; 70% | 80% ; 85% | 90% ; 95% | `vision.md` §6.4 |
| S15 | **Support contacts per 100 connection failures** | Tickets tagged "collegamento" ÷ failures | Support tool + events | 30 | 20 | 10 | Benchmark UNKNOWN (`JTBD` Q9) |
| S16 | **Recurring precision** | Period class correct and next date within ±3 days for SDD/PagoPA series; false-regular rate | Audit against subsequent occurrences | 80% ; ≤ 5% | 90% ; ≤ 2% | 95% ; ≤ 1% | `JTBD` §7 F7 |
| S17 | **"Altro" share of spend** | Share of spend in Uncategorised/Altro after 30 days | Ledger | ≤ 10% | ≤ 5% | ≤ 3% | `JTBD` §7 F13 |
| S18 | **Cost guardrails** | AI per 1,000 transactions; LLM calls per 1,000; free AIS cost per paid subscription (measured once billing exists) | Cost dashboard (`CA` A2–A4) | ≤ $0.25 ; ≤ 400 | ≤ $0.10 ; ≤ 300 | ≤ $0.05 ; ≤ 200 | `AI` §7.2; `CA` §5 |

**Measurement infrastructure (P0):** semantic events only (`PM` §6); a frozen labelled Italian eval set (3,000–5,000 rows, double-annotated, stratified by bank, kind and merchant frequency); a weekly 200-row consented audit of live decisions; automated provider-payload vs ledger reconciliation; per-decision-type dashboards of auto-rate / auto-error / review-rate with the threshold version; cohort retention with WOW split. Every number is reported with its denominator and its provider-caused share.

---

## 6. Exit criteria

### 6.1 Go to public launch (all must hold; DECISION)

| # | Criterion | Evidence required |
|---|---|---|
| X1 | All P0 stories in `prd.md` accepted; the 25 reconciliation fixtures, the injection suite and the never-gated entitlement tests pass in CI | CI status; acceptance log |
| X2 | Success criteria S1–S8, S9, S10, S13, S14, S16, S17 at **Base** for 4 consecutive weeks on ≥ 200 connected beta users across ≥ 5 institutions; S3 and S4 at 100% throughout | Dashboards with denominators; audit reports |
| X3 | Zero trust-killer incidents in the last 4 beta weeks (silent skip/overwrite; "clear the cache" advice; credential prompt; un-reminded charge; bank listed as supported that does not connect; money movement; shutdown without export; upsell in inbox) | Incident register |
| X4 | Legal and compliance: counsel opinion on route A and consent wording; counsel sign-off on the taxonomy (Art. 9); DPIA complete; external DPO appointed; vendor register and incident runbook live; T&Cs with withdrawal/renewal wording | Documents on file (`REG` R1; `PM` D7–D8) |
| X5 | Provider: contract signed with the primary (gates G1–G4) or Enable Banking promoted; EU hosting and sub-processor list on file; consent copy approved by the provider's UI review | Contract; RFP answers (`OBP` §5.5) |
| X6 | Stores: Apple and Google compliance checklist complete (third-party-AI permission step, in-app deletion, privacy labels / Data safety from the real SDK list, Financial-features declaration with licence pack, no ATT); app approved in both stores | Review notes; approvals (`REG` §4.7) |
| X7 | Security: external penetration test with critical/high findings closed; MASVS L1 verified; break-glass and key rotation runbooks tested; restore drill with deletion-log replay passed | Pen-test report; drill log |
| X8 | Accessibility: WCAG 2.1 AA external audit with no blocking issues | Audit report (`REG` D9) |
| X9 | Billing: trial, reminders, two-tap cancel, grandfathering implemented; paywall never shown in inbox/failure/consent flows (tested); cost guardrail metric live | Test evidence; dashboard (`BM` D-BM-3; `CA` A2) |
| X10 | Launch promises limited to what is measured: current accounts, prepaid IBAN accounts, Revolut/N26; ~90 days initial history; "a few refreshes a day plus on open"; no credit-card/Satispay/Hype promise; CSV import of the six formats | Marketing copy review against `OBP` D8 and `BS` D6 |

### 6.2 Launch-ready but not blocking (should-have)

Second adapter live with failover; recurring alerts; AUTOPILOT with digest; refunds/splits/cash wallet; public health page; web import/export; logos.

### 6.3 Kill / pivot rules (DECISION; evaluated at M1 and M2)

| Signal | Threshold | Action |
|---|---|---|
| Connection success on the eight institutions after mitigation (second adapter tested) | < 60% (below Low) for 4 weeks | Re-open the provider decision (Tink/Fabrick lines); consider import-first onboarding for affected banks; do not launch with a promise that fails 4 in 10 times |
| Auto-categorisation precision | < 90% at auto-rate ≥ 70% | Default mode becomes CONTROL; widen the eval set; delay launch rather than lower the bar |
| Transfer-pair precision | < 97% at the auto threshold | Pairing proposes only (inbox) until calibrated; the WOW is redefined around subscriptions + safe-to-spend until fixed |
| WOW-session rate | < 35% among multi-institution users for 4 weeks | Re-run first-session usability tests; revisit the "Cosa ho capito" design before adding anything |
| D30 (connected users) | < 10% for two cohorts | Stop feature work; investigate trust events, sync reliability and value framing with interviews |
| Free AIS cost per paid subscription (once billing exists) | > €1.20 for two consecutive months | Switch new cohorts to the pre-agreed fallback shape (`BM` D-BM-1) |
| Any trust-killer incident | 1 | Fix and re-run the 4-week clock |

---

## 7. MVP risks and mitigations (top 8)

| # | Risk | Likelihood / impact | Mitigation | Label |
|---|---|---|---|---|
| 1 | Banca d'Italia does not accept route A for a B2C app | UNKNOWN / blocking | Counsel now; Fabrick parallel enquiry; agent route requested in writing | UNKNOWN (P0) |
| 2 | Italian banks leave `entryReference`, counterparties and bank codes empty, degrading identity and pairing | Likely for CBI Globe banks (ASSUMPTION) / high | Fill-rate study at M0; fingerprint + ordinal identity; own-IBAN registry; description-based transfer evidence; inbox fallback | ASSUMPTION |
| 3 | Pending transactions not exposed by major banks (Fineco spec: booked only) | FACT (2019 file) / medium | Design for absence: pending is an overlay; booked-first UX; mark pending availability per bank on the coverage page | FACT / UNKNOWN per bank |
| 4 | Provider cost makes the free tier contribution-negative | UNKNOWN / high | RFP with per-user pricing, no-charge for non-accessed accounts; guardrail and fallback shape | `BM` D-BM-1 |
| 5 | WOW does not happen for single-institution users | Likely for P3 / medium | Fallback WOW (subscriptions + safe-to-spend) and a second-institution nudge | `JTBD` J-7 |
| 6 | Calibrated thresholds overfit the small early eval set | Likely / medium | Conservative provisional thresholds; shadow mode; weekly re-fit; CONTROL mode available; human audit sample | DECISION |
| 7 | Intesa's 14-day windows and 4×/day cap make catch-up syncs slow after renewals | FACT / medium | Chunked catch-up with progress copy; user-present sessions; renewal reminders early | FACT |
| 8 | App Review questions a non-bank "money management" app (Apple 3.2.1(viii)) | Possible / medium | Submit from the legal entity with the provider's licence and contract in review notes; many non-bank PFMs are on the store | HYPOTHESIS |

---

## Decisions / Recommendations

| ID | Decision / recommendation | Label | Needs ADR? |
|---|---|---|---|
| MVP-1 | Scope rule of §1 and the IN/OUT/NEVER tables of §2 define the MVP; additions require a written exception citing the rule | DECISION | No |
| MVP-2 | The vertical slice of §3 (walking skeleton on founders' accounts via Enable Banking restricted production plus the primary provider's sandbox) is built before any feature outside it | DECISION | Yes (architecture slice ADR) |
| MVP-3 | Milestones M0–M3 with the gates in §3.3; beta users ≤ 50 / ≤ 200 / ≤ 1,000 | DECISION | No |
| MVP-4 | Success criteria S1–S18 with Low/Base/High; Base held for 4 consecutive weeks on ≥ 200 connected users across ≥ 5 institutions is the measured condition for launch | DECISION (targets HYPOTHESIS) | No |
| MVP-5 | Exit criteria X1–X10 and kill/pivot rules §6.3 are the launch gate; feature count never substitutes for a failed gate | DECISION | No |
| MVP-6 | Mobile-first (iOS + Android) for the slice; web only for import/export later pending the open question | DECISION | Platform ADR |
| MVP-R1 | Start the Enable Banking restricted-production pilot this week on founders' accounts; report fill-rates, pending support, `valid_until`, card exposure in 3 weeks | RECOMMENDATION | — |
| MVP-R2 | Recruit 20–30 S1/S2 users for M1 through two Italian finance creators; run first-session tests with real consents | RECOMMENDATION | — |
| MVP-R3 | Build the labelled eval set from Banana fixtures, the CBI table and consented M0/M1 data before M1; freeze a test split | RECOMMENDATION | — |

## Open questions

| # | Question | Why it matters | How to resolve | Priority |
|---|---|---|---|---|
| 1 | Which provider holds production keys for M1 (Yapily on contract vs Enable Banking promoted)? | Slice timeline | RFP gates G1–G4 within 4 weeks (`OBP` D1) | P0 |
| 2 | Per-bank fill-rates, pending availability, id stability, consent `valid_until` for the top-10 banks | Identity and pairing parameters | M0 pilot | P0 |
| 3 | Is the Base connection-success target (75%) realistic against CRIF's 57.4%, which measures credit flows rather than PFM consents? | S1 calibration | M0/M1 data | P1 |
| 4 | Are D7/D30 targets for connected users right, given no Italian PFM benchmark exists? | S12 | First two cohorts | P1 |
| 5 | Does the fallback WOW retain single-institution users at a comparable rate? | P3 strategy | WOW-split cohorts | P1 |
| 6 | Is a web client needed for launch (import/export UX)? | Scope | Interviews; creator feedback | P1 |
| 7 | What audit sample size keeps auto-error estimates within ±1 point? | S6c precision | Statistical plan with the eval set | P1 |
| 8 | Which trust-killer incidents are detectable automatically vs need the support tag? | X3 | Incident taxonomy | P2 |

## Sources

All verified on 2026-10-02 by the input documents named; URLs carried over verbatim.

| ID | Source | URL / path | Used for |
|---|---|---|---|
| PE | `/home/user/Lilleri/docs/product/personas.md` | repo | Persona priority; Giulia's stack and day-in-the-life |
| JTBD | `/home/user/Lilleri/docs/product/jobs-to-be-done.md` | repo | WOW/TRUST definitions; success signals and targets |
| OM | `/home/user/Lilleri/docs/research/opportunity-map.md` | repo | MVP core vs not-now list |
| PP | `/home/user/Lilleri/docs/research/user-pain-points.md` | repo | Pain-point ranking; decisions D1–D13 |
| MA | `/home/user/Lilleri/docs/research/market-analysis.md` | repo | Gate A conditions; CRIF baseline; cash share |
| OBP | `/home/user/Lilleri/docs/research/open-banking-providers.md` | repo | Provider decision; gates G1–G4; pilot; MVP promises |
| DSF | `/home/user/Lilleri/docs/research/data-sources-feasibility.md` | repo | Sources in the MVP; never list |
| REG / PM / CM / DR | `/home/user/Lilleri/docs/compliance/regulatory-landscape.md`; `privacy-model.md`; `consent-model.md`; `data-retention.md` | repo | Launch compliance gates; DPIA; deletion on day one |
| BM / UE / CA | `/home/user/Lilleri/docs/business/business-model.md`; `unit-economics.md`; `cost-architecture.md` | repo | Free envelope; guardrail; cost alerts |
| BS | `/home/user/Lilleri/docs/brand/brand-strategy.md` | repo | No claims before measurement (D6) |
| AI | `/home/user/Lilleri/docs/research/raw/ai-ml-transaction-intelligence.md` | repo | Eval-set design; cost per 1,000 transactions; cascade |
| RC | `/home/user/Lilleri/docs/research/raw/reconciliation-and-data-model-patterns.md` | repo | 25 fixture scenarios; identity strategy; RLS |
| NEW-4 | CRIF open-banking outlook (57.4% connection success H1 2025) | https://www.pagamentidigitali.it/digital-banking/open-banking-cresce-la-fiducia-in-italia-nel-2025-oltre-la-meta-dei-conti-viene-collegata-con-successo/ | S1 anchor (medium; credit flows) |
| NEW-3 | ECB SPACE 2024 (cash >60% of POS transactions by number) | https://www.ecb.europa.eu/stats/ecb_surveys/space/html/ecb.space2024~19d46f0f17.en.html | Cash in scope |
| PP-G-01 / G-43 / G-83 / G-84 | Actual Budget issues (transfer pairing 382 votes; merge 121 votes; silent overwrite; silent skip) | https://github.com/actualbudget/actual/issues/1628 ; https://github.com/actualbudget/actual/issues/669 ; https://github.com/actualbudget/actual/issues/8701 ; https://github.com/actualbudget/actual/issues/9063 | Wedge; S3 |
| IT-Y-02 | Giuseppe Castagna — "Il metodo con cui traccio i miei soldi (in 5 minuti al mese)" | https://www.youtube.com/watch?v=kJNxDIcJOac | Effort ladder; ChatGPT-DIY |
| US-S25 / S51 / S65 | Monarch delayed transactions; Copilot Intelligence; fincomparelab "95%" | https://help.monarch.com/hc/en-us/articles/360048883651-Troubleshooting-Delayed-Transactions ; https://changelog.copilot.money/log/copilot-intelligence ; https://www.fincomparelab.com/reviews/copilot-money-review/ | Time-to-value anti-pattern; learning benchmark; unverified accuracy |
| EU-S-21 / S-22 / S-35 | Emma learning after three edits; Snoop categorisation complaints; Finanzguru contract ledger | https://help.emma-app.com/en/article/change-a-transaction-category-iipyy2/ ; https://www.trustpilot.com/review/snoop.app?page=3 ; https://www.check-app.de/2026/08/09/finanzguru-womit-verdient-die-app-eigentlich-geld-und-was-bekommt-sie-dafuer-von-mir/ | S6, S16 anchors |
| WS-07 | Satispay blog — Budget | https://www.satispay.com/it-it/blog/guide-satispay/come-impostare-budget-satispay/ | Safe-to-spend mental model |
| OBP S11 | FinecoBank NextGenPSD2 v1.3 OpenAPI (mirror): booked only | https://github.com/Yolt-group/bespoke-providers/blob/main/bespoke-fineco/swagger/fineco/finecobank-psd2-api-v2.yaml | Risk 3 |
| OBP / EB | Enable Banking FAQ (restricted production; per-account billing); Italy page | https://enablebanking.com/docs/faq ; https://enablebanking.com/docs/markets/it/ | M0 pilot; coverage |
| OBP / YP | Yapily data restrictions (Intesa 14-day window; 429) | https://docs.yapily.com/pages/data/financial-data-resources/data-restrictions/ | Risk 7 |
| REG / Apple | Apple App Review Guidelines (3.2.1(viii), 5.1.1(v), 5.1.2(i)) | https://developer.apple.com/app-store/review/guidelines/ | X6; risk 8 |
| REG / Play | Google Play User Data policy; 15 Jul 2026 announcement | https://support.google.com/googleplay/android-developer/answer/10144311?hl=en ; https://support.google.com/googleplay/android-developer/answer/17134731?hl=en | X6 |
| AI §8 | Banana Accounting Italia fixtures; CBI causali table | https://github.com/BananaAccounting/Italia ; https://github.com/fab128k/da-pdf-a-csv | Eval-set seeds |

End of document.
