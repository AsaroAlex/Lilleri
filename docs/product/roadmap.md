# Roadmap: phases 0–8, decision gates A–G, effort and team assumptions

**Project:** LILLERI (greenfield consumer PFM; Italy-first, then Europe)
**Document type:** Phase 1 product document — phased plan without calendar dates
**Date / verification date for every carried-over claim:** 2026-10-02
**Author:** Head of Product + startup finance analyst + growth lead (founding team)
**Language:** documentation in English; product copy in Italian with English glosses.
**Inputs read in full:** the fifteen documents listed in `metrics.md` ("Inputs"), plus `docs/compliance/consent-model.md` §4–5 and `privacy-model.md` §6 for the compliance deliverables.
**Companions:** `metrics.md` (what each phase makes measurable; gate thresholds), `pre-mortem.md` (failure modes F01–F23 referenced in each phase's risk row).

## How to read this document

- Labels: **FACT** (cited source seen on the verification date), **ASSUMPTION** (working value), **HYPOTHESIS** (interpretation to validate), **DECISION** (proposed here; final only when recorded in an ADR or ratified in the PRD), **OPEN QUESTION / UNKNOWN**.
- **No calendar dates.** Phases are ordered; effort is expressed in T-shirt sizes and person-month ranges (Low / Base / High, ASSUMPTION) with explicit team assumptions. `go-to-market.md` §5 uses "M0…M15" labels; those are *relative months from the waitlist*, not calendar commitments, and map onto Phases 5–8 here.
- A phase ends when its **exit criteria** are met and its **gate** is passed; gates are decision points with explicit options (go / go with conditions / re-scope / stop), not ceremonies. Gates A, B and C already have verdicts in the research documents; D–G are defined here.
- The priority order (trust, data correctness, security, simplicity, automation, reliability, privacy, speed, UX, brand recognition, cost, monetisation, feature count) decides what is in each phase and what is cut first when a phase overruns (every phase has a "scope cut order").

---

## 0. Executive summary

1. **Nine phases, seven gates.** Phase 0 Research (done; Gates A, B, C assessed), Phase 1 Brand & Prototype (Gate C ratified; promise, positioning and price tested with users), Phase 2 Technical foundation (Gate D: legal basis + provider + architecture + security + compliance plumbing before product code), Phase 3 Open Banking MVP (the deterministic loop on real Italian accounts: connect, sync, reconcile, Review Inbox, consent management, import/export/delete, trust page), Phase 4 AI automation (per-user learning with rules winning, recurring detection, insights, safe-to-spend; Gate E: correct enough for real users), Phase 5 Closed Beta (500 → 2,000 ICP users; North Star baseline; Gate F: trust, correctness and conversion proven), Phase 6 Italian launch (open beta → public iOS/Android launch), Phase 7 Monetisation optimisation (Famiglia/household, pricing tests, free-tier guardrail, opt-in offers rail; Gate G at the 12-month review), Phase 8 European expansion (one market at a time, each with its own mini-gate).
2. **The critical path runs through Phase 2, not Phase 3.** Nothing user-facing can launch without (a) counsel's answer on the "recipient under the provider's licence" route (Banca d'Italia's position is UNKNOWN — the single P0 legal question, `open-banking-providers.md` Q1), (b) a signed non-exclusive provider contract that passes gates G1–G4, and (c) the Enable Banking restricted-production fill-rate pilot that tells us which Italian banks return stable ids, pending rows and counterparties. These three start in Phase 1 and are Phase 2's exit criteria.
3. **Correctness ships before intelligence.** Phase 3 delivers the state machines, pairing, settlement, dedup and the inbox *deterministically* (rules, CBI codes, provider hints) with every automatic action carrying a reason and an undo; Phase 4 adds the learning cascade on top. This order is the direct consequence of the research: the five dominant failure modes are reconciliation failures, not categorisation failures (`user-pain-points.md` §0.1), and silent automation is the documented trust-killer (`opportunity-map.md` §1.2).
4. **Effort (ASSUMPTION, person-months L/B/H):** Phase 1 3/5/8, Phase 2 6/10/16, Phase 3 12/20/32, Phase 4 8/14/22, Phase 5 6/10/16, Phase 6 5/8/14, Phase 7 10/18/28, Phase 8 18/30/50 per first market. Team: three founders plus contractors through Phase 2; five people from Phase 3; seven to eight by Phase 7; twelve for Phase 8 — the same stage-size assumptions as `revenue-scenarios.md` §4 and the fixed-cost caps of D-RS-3 (≤ €15 k/month closed beta, ≤ €40 k launch, ≤ €120 k to 250 k MAU).
5. **Re-planning triggers are written down (§7)** so that a bad RFP quote, a negative counsel memo, a low WOW-session rate or a failed free-tier guardrail changes the plan by rule, not by argument.

---

## 1. Planning assumptions

### 1.1 Effort scale (ASSUMPTION)

| T-shirt | Person-months | Typical item |
|---|---|---|
| XS | < 0.5 | A copy test; a dashboard tile; a legal memo brief |
| S | 0.5–1.5 | A CSV mapping set; the trust page; a pricing survey |
| M | 1.5–4 | Consent state machine with renewal UX; eval set v1; brand identity |
| L | 4–9 | Reconciliation engine (pairing, settlement, pending→booked, dedup) with fixtures; mobile client for the loop |
| XL | 9–18 | Phase 3 as a whole; household model; first European market |
| XXL | > 18 | Own AISP registration programme with CBI Globe direct integration |

### 1.2 Team assumptions (ASSUMPTION; consistent with `revenue-scenarios.md` §4)

| Phase | Core team | Contractors / partners | Fixed-cost cap (D-RS-3) |
|---|---|---|---|
| 1–2 | 3 founders: CEO/product, CTO, brand-design-growth lead | Brand designer, Italian regulatory counsel, external DPO, UX researcher (interviews), accountant | ≤ €15 k/month |
| 3–5 | 5: + 2 engineers (one mobile, one backend/data); CTO covers data/ML until a lead is hired | DPO, counsel, pen-test firm, annotators for the weekly audit | ≤ €15 k (beta) → ≤ €40 k (launch) |
| 6–7 | 5 → 7–8: + support lead (part-time first), + growth/content, + data/ML lead | Creators, PR, accessibility audit | ≤ €40 k → ≤ €120 k |
| 8 | 12: + 2–3 engineers, + market lead per country, + compliance | Local counsel per market | ≤ €120 k until 250 k MAU |

### 1.3 Principles that shape every phase (DECISION proposed)

| # | Principle | Source |
|---|---|---|
| P1 | Every automatic action carries a reason and an undo; every uncertain action becomes an inbox card | `opportunity-map.md` §5 #2; `jobs-to-be-done.md` loop invariants |
| P2 | Correctness features (categories, rules, pairing, consent management, export, deletion) are never paywalled and never cut for schedule | `business-model.md` D-BM-2 |
| P3 | Nothing in the product moves money; no lending, no cash advance, no chat-first interface, no budgeting method to learn | `jobs-to-be-done.md` J-6; `opportunity-map.md` §4 |
| P4 | Trust surfaces (named provider, read-only wording, consent countdown, sync report, coverage page, "I tuoi dati", export, delete) ship in the MVP, not after | `market-analysis.md` decision 7; `go-to-market.md` D-GTM-5 |
| P5 | A phase does not end on a date; it ends on measured exit criteria (`metrics.md`) and a gate decision |  this document |
| P6 | Decisions without an ADR are not decisions; each phase lists the ADRs it must produce | `docs/README.md` |
| P7 | Scope is cut from the bottom of the priority order first: feature count → monetisation → cost → brand → UX → speed; never trust, correctness, security | project brief |

---

## 2. Phase overview

| Phase | Name | One-line goal | Main deliverable | Gate at the end | Size (L/B/H person-months) | Team |
|---|---|---|---|---|---|---|
| 0 | Research | Know the market, the plumbing, the law and the economics before committing | The `docs/research`, `compliance`, `business`, `brand` syntheses | **A** (market), **B** (coverage), **C** (economics, assessed) | done (≈ 3–4 pm equivalent) | 3 founders |
| 1 | Brand & Prototype | Validate the amended promise, positioning, WOW and price with real Italians; give the product a face | Brand identity + clickable prototype + user/pricing research + PRD + waitlist | **C** ratified; A/B conditions assigned | 3 / 5 / 8 | 3 + brand designer + UX researcher |
| 2 | Technical foundation | Settle the legal basis, the provider, the architecture, security and compliance plumbing | Counsel opinion, provider contract, fill-rate pilot, ADRs, monorepo, CI/CD, security baseline, DPIA v1 | **D** | 6 / 10 / 16 | 3 + 1 engineer + counsel/DPO |
| 3 | Open Banking MVP | The deterministic loop works on real Italian accounts with correctness guarantees | Connect → sync → ledger → reconcile → inbox → month view; import/export/delete; trust pages; iOS + Android | internal dogfood criteria (feeds E) | 12 / 20 / 32 | 5 |
| 4 | AI automation | Per-user learning with rules winning and a visible why; recurring; insights; safe-to-spend | Cascade T0–T5, eval set, rules-from-corrections, recurring engine, summaries, AI cost caps | **E** | 8 / 14 / 22 | 5 (+ data/ML hat) |
| 5 | Closed Beta | Prove trust, correctness and conversion with 500 → 2,000 ICP users; set the North Star baseline | Beta programme, support process, pricing tests, store-readiness, audited ACR | **F** | 6 / 10 / 16 | 5 |
| 6 | Italian launch | Open beta → public iOS/Android launch; organic/referral growth | Store listings, ASO, creators, referral, press, status page, launch guardrails | launch criteria (part of F) | 5 / 8 / 14 | 5–7 |
| 7 | Monetisation optimisation | Make the Target corridor real without touching trust | Famiglia/household, pricing tests, guardrail decisions, opt-in offers rail, web read-only, 12-month review | **G** | 10 / 18 / 28 | 7–8 |
| 8 | European expansion | Repeat the Italian playbook in one market at a time | Market selection, provider coverage, local semantics and trust pages, localisation, own-AISP decision | per-market mini-gate (B + F) | 18 / 30 / 50 per market | 12 |

---

## 3. Decision gates A–G

| Gate | Question | Placed after | Criteria (pass = all met; "conditions" = carried forward with an owner) | Status today | Options at the gate | Decides |
|---|---|---|---|---|---|---|
| **A** | Is the market opportunity clear? | Phase 0 | Real recurring unserved problem; population order of magnitude; willingness-to-pay evidence; reachable channel; defensible differentiation; acceptable structural risk (`market-analysis.md` §9) | **PASS WITH CONDITIONS** (FACT, documented): A1 connector reality check on eight institutions; A2 incumbent depth check (XME Banks, Hype Radar); A3 WTP test (200 survey + 20–30 interviews); A4 second-rail option set; A5 promise test | go / go with conditions | Founders |
| **B** | Is feasible Italian financial-data coverage available? | Phase 0 (conditions closed in Phase 2) | Current accounts, prepaid IBANs and main neobanks reachable via ≥ 1 provider; gaps (cards, PayPal, Satispay, Hype) handled by RFP clauses, bank-side detection and CSV; legal basis to receive data (`open-banking-providers.md` §6) | **PASS WITH CONDITIONS** (FACT, documented): RFP gates G1–G4; counsel on route A; fill-rate pilot | go with conditions / switch provider / re-scope coverage promise | CTO |
| **C** | Is the business potentially sustainable? | Phase 1 (assessed in Phase 0; re-run at Gate G) | C1 AIS ≤ €0.20 per account-month (≤ €0.25 with per-user/lite pricing); C2 ≥ 180 paid subscriptions per 1,000 MAU by beta month 9 (≥ 120 by month 6); C3 offers ≥ €0.15/MAU by 100 k MAU; C4 fixed-cost discipline; C5 blended CAC ≤ €2; C6 counsel clears licence route and offers rail (`revenue-scenarios.md` §6) | **CONDITIONAL PASS** (FACT, documented); all six UNKNOWN until RFP and beta | proceed with the Target case as plan of record and Base as the honest floor; fallback F′ free tier; stop if Pessimistic | CEO + CFO |
| **D** | Are the legal basis and the foundation ready to build on? | Phase 2 | D1 written counsel opinion that route A is acceptable for an Italian B2C recipient (or an alternative route chosen and budgeted); D2 provider contract signed, non-exclusive, ≤ 12-month term, G1–G4 answered; D3 fill-rate pilot report on the top-10 banks (id stability, pending, counterparties, consent `valid_until`, card accounts); D4 ADRs recorded for licensing route, provider architecture, canonical schema, ledger model, money representation, identity/fingerprint, encryption and RLS, i18n/number formatting, analytics, AI vendor posture, mobile/web stack; D5 DPIA v1, DPO appointed, Art. 30 records, vendor register, event registry with lint; D6 security baseline (envelope encryption, RLS with FORCE, passkeys/2FA, secrets management, no credential storage) passing an internal review; D7 CI/CD with the 25 reconciliation fixtures green on the empty engine (skeleton) | not started | go / go with conditions (e.g., Enable Banking primary if Yapily fails G2) / pause for route B/C | CTO + counsel |
| **E** | Is the product correct enough to put in front of real users? | Phase 4 | E1 25 fixture scenarios pass (`reconciliation-and-data-model-patterns.md` §9.3); E2 balance equality 100 % on dogfood accounts for 30 consecutive days, 0 silent skips, 0 phantom legs, 0 respawning duplicates; E3 transfer-pair precision ≥ 99 % at the auto threshold and recall ≥ 90 % on the labelled set; pending→booked replacement precision ≥ 98 %; E4 classification auto-rate ≥ 75 % with auto-error ≤ 2 % on the Italian eval set; abstain accuracy ≥ 90 %; E5 recurring next-date accuracy ≥ 90 % on an SDD/PagoPA sample, false-regular ≤ 2 %; E6 every automatic decision has a stored, renderable reason and an undo; review-routing floor ≥ 95 %; E7 the four TRUST events (consent expiry, outage, ambiguity, mismatch) implemented with Italian copy; E8 AI cost ≤ €0.05 per user-month on dogfood volumes; third-party-AI permission step live; E9 DPIA updated for the AI tier; taxonomy Art. 9 review signed off; E10 inbox ≤ 3 items at first sync for ≥ 2-institution dogfood users; TTFV ≤ 10 min | not started | go to beta / go with a reduced coverage promise / hold until E2–E3 | Head of Product + CTO |
| **F** | Did the beta prove trust, correctness and conversion? (launch decision) | Phase 5 | F1 sync success ≥ 95 % daily on the top-10 banks (≥ 97 % at launch); F2 audited ACR ≥ 80 % (Base) with hidden error ≤ 3 pp; auto-error ≤ 3 % (≤ 2 % at launch); F3 transfer-pair precision ≥ 95 % on labelled beta pairs (≥ 99 % auto threshold maintained); F4 consent renewal before expiry ≥ 60 % on the first expiring cohort (≥ 80 % target); F5 D30 ≥ 8 % (open beta), WOW-session rate ≥ 30 %; F6 trial→paid ≥ 20 %; paid subscriptions ≥ 100 per 1,000 MAU; free AIS cost per paid subscription measured and the F vs F′ decision taken; F7 support contacts ≤ 25 per 1,000 MAU; NPS ≥ 30; F8 no P1 data-correctness incident open > 7 days; F9 store submissions accepted on both platforms with the licence evidence pack; F10 pen-test findings of high/critical severity closed; accessibility audit (WCAG 2.1 AA) passed on the core loop; F11 "Copertura banche", "I tuoi dati", status page and two-tap export/delete live | not started | launch / launch to a narrower bank list / extend beta one cycle / stop (if F2 and F6 both miss the Low values twice) | Founders |
| **G** | Do launch economics support expansion? (12-month review) | Phase 7 | G1 Gate C conditions re-tested on measured data: AIS price per account-month, paid subscriptions per 1,000 MAU ≥ 180, offers ≥ €0.15/MAU (opt-in ≥ 25 %, no NPS penalty), fixed costs within caps, CAC ≤ €2, loaded payback ≤ 18 months; G2 audited ACR ≥ 85 % for three consecutive months; G3 Trustpilot − store gap ≤ 1.0; refund rate ≤ 0.5 %; un-reminded charges 0; G4 monthly churn ≤ 9 %, first annual-renewal cohort ≥ 45 %; G5 provider concentration: second adapter exercised in production for ≥ 1 institution; G6 route C (own AISP) decision taken with a budget; G7 first-market selection criteria scored on provider data (`go-to-market.md` Q6) | not started | expand / consolidate Italy (≤ 300 k MAU ceiling, D-RS-4) / tighten free tier / switch to trial-gated | CEO + CFO |

---

## 4. Phases in detail

### Phase 0 — Research (complete)

| Element | Content |
|---|---|
| **Goal** | Establish, with labelled evidence, whether a third-party PFM deserves to exist in Italy, how the data arrives, what the law allows, what it costs and how the brand should sound |
| **Deliverables (done)** | Raw research notes (`docs/research/raw/*`); syntheses: market analysis, opportunity map, competitor matrix, user pain points, open-banking providers (+ capability matrix, cost model), data-sources feasibility; personas, JTBD; regulatory landscape, privacy, consent, retention, legal open questions; business model, pricing, unit economics, revenue scenarios, GTM, cost architecture; brand strategy, naming, messaging, competitor brand analysis |
| **Dependencies** | None |
| **Risks realised** | Research-environment limits: most vendor, regulator and press pages seen as search snippets, not full reads (FACT, stated in every synthesis) → every number must be re-read on the primary page before it enters a contract or a plan |
| **Exit criteria** | Met: Gate A PASS WITH CONDITIONS; Gate B PASS WITH CONDITIONS; Gate C CONDITIONAL PASS; conditions carried forward with owners (§3) |
| **Effort** | Done (≈ 3–4 person-months equivalent, ASSUMPTION) |
| **Carried-forward conditions** | A1–A5, B (G1–G4 + counsel + pilot), C1–C6 — assigned to Phases 1–2 and 5–7 below |

### Phase 1 — Brand & Prototype

| Element | Content |
|---|---|
| **Goal** | Before writing product code: validate the amended promise ("si organizzano da sole — e tu vedi sempre perché"), the positioning on correctness, the WOW moment and the price with Italian users; produce the identity and a clickable prototype of the loop; freeze the PRD and MVP scope; start the three long-lead items of Phase 2 (counsel, RFP, pilot access) |
| **Deliverables** | See table below |
| **Dependencies** | Phase 0 syntheses; access to 5–8 interviewees per MVP persona (`personas.md` PD-7); a brand designer; counsel engaged (D9 of `open-banking-providers.md`) |
| **Risks** | F08 weak differentiation, F12 weak brand, F13 unclear positioning, F19 WTP too low, F22 market smaller than assumed, F15 founder bandwidth (`pre-mortem.md`) |
| **Effort** | S–M per item; **phase L/B/H = 3 / 5 / 8 person-months** |
| **Team** | 3 founders + brand designer (contract) + UX researcher (contract, interviews and diary study) |
| **Scope cut order** | Logo exploration breadth → diary study length → survey size (never below 100) → prototype fidelity (never below "clickable loop with real Italian copy") |

| Deliverable | Description | Size | Owner | Depends on |
|---|---|---|---|---|
| Promise and positioning test | 20–30 moderated sessions with S1/S2 (P1, P4, P2) on the amended promise vs the "control" framing; WOW verbatim collected unprompted (`jobs-to-be-done.md` Q1); copy tests for the tagline, the inbox name ("Da rivedere" vs alternatives, `messaging-framework.md` Q4) and the safe-to-spend line | M | Head of Product + UX researcher | Recruiting via creators/waitlist |
| Incumbent depth check (A2) | Hands-on test accounts: Intesa XME Banks, Hype Next/Premium Radar, Revolut linked accounts in Italy — do they categorise external transactions, learn, pair transfers, show pending? (`market-analysis.md` Q1) | S | Head of Product | Test accounts |
| Willingness-to-pay test (A3) | 200-respondent survey (Van Westendorp + plan-choice) on the waitlist; €3.99 vs €4.99 vs €5.99 Plus; annual anchor for P4; one Famiglia question | S | Growth | Waitlist live |
| Waitlist | Italian landing page with the tagline, "quali banche usi?" multi-select (30 institutions), trust line, invite codes; creator pre-announcements | S | Growth + brand designer | Identity v1 |
| Brand identity v1 | Wordmark, mark concept (non-letter, "two strokes settling into one line"), palette (warm paper/ink), type (tabular figures, Unicode minus), tone-of-voice guide; 7-day name-recall and icon-confusion tests (`brand-strategy.md` §13) | M | Brand lead + designer | `brand-strategy.md` D11 |
| Clickable prototype | The six-stage loop in Figma with real Italian copy: consent screen naming the provider, sync report, month view, inbox cards (one tap, undo), rule proposal, consent countdown, trust page; tested in the promise sessions | M | Head of Product + designer | Positioning |
| PRD + MVP scope | Scope = `opportunity-map.md` §5 #1 (areas 2.1–2.10, 2.12 detection, 2.14, 2.16 minimal, 2.18–2.21); explicit non-goals (§4 of the same); acceptance = Gate E criteria; this roadmap, `metrics.md`, `pre-mortem.md` ratified | M | Head of Product | Everything above |
| Long-lead starts for Phase 2 | Counsel brief on Q1 (route A); RFP sent to Yapily, Enable Banking, Tink, Salt Edge, Fabrick with the identical volume ladder and G1–G4; Enable Banking self-registration and restricted-production activation on founders' accounts | S | CEO + CTO | None (start day one of the phase) |
| Decision log | ADR list for Phase 2 drafted; second-rail option set (A4) written (`business-model.md` §7) | XS | CEO | — |

**Exit criteria (Phase 1 → Gate C ratified):** promise test — a majority of interviewees prefer the amended framing and can restate the differentiator in their own words (HYPOTHESIS threshold ≥ 60 %); WOW verbatim appears unprompted in ≥ 5 of 10 first-session tests on the prototype; WTP — stated acceptance of €4.99 monthly or €39.99 annual by ≥ 40 % of ICP respondents (Low 30 / High 50 %), annual preferred by P4; waitlist ≥ 2,000 (Low) with ≥ 40 % declaring ≥ 3 institutions; name recall ≥ 40 % (Low) at 7 days; incumbent depth check written up (if XME Banks pairs transfers, re-scope the WOW per J-7); counsel engaged and RFP sent; PRD signed off by the three founders.

### Phase 2 — Technical foundation

| Element | Content |
|---|---|
| **Goal** | Make it legal, contractual and architectural to receive Italian bank data; lay the foundation (monorepo, schema, security, compliance plumbing, observability, event registry) so that Phase 3 writes product code on solid ground |
| **Dependencies** | Phase 1 PRD; counsel; provider sales cycles (UNKNOWN duration, weeks to months — `open-banking-providers.md` §2.1); Enable Banking restricted production (available immediately, FACT) |
| **Risks** | F10 compliance blocks (route A rejected), F01 data too expensive, F14 provider risk, F03 coverage, F17 security debt, F15 bandwidth |
| **Effort** | **phase L/B/H = 6 / 10 / 16 person-months** |
| **Team** | CTO + 1 engineer (backend/data) + counsel + DPO; CEO on contracts; Head of Product on event registry and copy for consent flows |
| **Scope cut order** | Web client scaffold → second provider adapter *implementation* (the interface stays) → observability depth (never below: sync-run table, error budget, alerting on §5 #1, #3, #14 of `metrics.md`) |

| Deliverable | Description | Size | Owner | Depends on |
|---|---|---|---|---|
| Counsel opinion on the licensing route (D1) | Written answer to `legal-open-questions.md` Q1: route A acceptability for a B2C recipient; mandatory consent/T&C/privacy-notice content; OAM applicability to route B; Fabrick's "quarta parte" text; Art. 9 taxonomy review scoped | S (our time) | CEO | Phase 1 brief |
| Provider RFP → contract (D2) | Answers to G1–G4 from Yapily, Enable Banking, Tink, Fabrick (Salt Edge only if it names its EEA entity); price ladder 5 k/25 k/100 k accounts; per-user and lite options; DORA flow-downs read; non-exclusive ≤ 12-month contract with the primary; secondary contracted or kept in restricted production | M | CTO + CEO | RFP sent in Phase 1 |
| Fill-rate pilot (D3) | 30-day study on founders' own accounts (Intesa, UniCredit, Poste/Postepay, BPM, Fineco, Revolut, N26 + 3 more): presence of `entry_reference`/`transactionId`/`endToEndId`/`bankTransactionCode`/`balanceAfterTransaction`, pending support, id churn, back-dating, consent `valid_until`, card-account exposure; report feeds the identity strategy and the coverage page | M | CTO | Enable Banking restricted production |
| ADR set (D4) | Licensing route; provider-agnostic architecture (canonical Berlin Group schema, raw payload retention, adapter per institution, dual-provider from release one); ledger model ("double-entry-lite" with links and append-only `ledger_event`); money representation (`bigint` minor units + currency + scale; Dinero.js v2); identity and fingerprint (`provider_key` → `fingerprint_v1` + ordinal); encryption (app-level AES-256-GCM envelope, KMS-wrapped DEKs) and Postgres RLS with FORCE; dates (`date` columns, Europe/Rome analytics date, UTC instants); i18n and number formatting (Italian master copy, English glossary, locale table); analytics architecture (self-hosted/EU, semantic events, lint); AI vendor posture (EU residency/ZDR/no training, two switchable vendors, permission step); mobile and web stack and platform order (OPEN QUESTION); taxonomy v1 (kind × category, no special-category labels) | M (sum) | CTO + Head of Product | Pilot; `reconciliation-and-data-model-patterns.md` §9; `ai-ml-transaction-intelligence.md` §7 |
| Monorepo and CI/CD | TypeScript monorepo: `domain`, `ledger`, `connectors` (adapters: yapily, enable_banking, csv), `reconcile`, `categorise`, `analytics` (event registry + lint), `finance-model` (U-inputs + `scenarios.json` + `metrics.json`); environments; migrations run as table owner, app role without BYPASSRLS; fixture runner for the 25 scenarios | M | CTO + engineer | ADRs |
| Security baseline (D6) | Envelope encryption for IBANs/raw descriptions/payloads; blind indexes for IBAN equality; passkeys/2FA; session/device management; secrets management; no bank credentials ever stored; logging redaction; threat model (STRIDE) in `docs/security/`; internal security review | M | CTO | ADRs |
| Compliance plumbing (D5) | DPIA v1; external DPO appointed; Art. 30 records; vendor register + incident runbook; layered Italian privacy notice v1; consent-record schema (`consent-model.md` §4); analytics event registry with the "never send" lint; company developer accounts (Apple D-U-N-S, Play org verification); licence evidence pack template | M | DPO + Head of Product | Counsel; provider contract |
| Observability skeleton | `sync_run` table, provider error taxonomy, alerting on sync_success_rate, silent-skip incidents, balance mismatch; dashboards for `metrics.md` §5 #1–#4 (empty until Phase 3) | S | CTO | Monorepo |
| Italian merchant and payment-type dictionary v0 | Seed from CBI causali table (MIT), Banana fixtures (Apache-2.0), payment-type regexes (F24, MAV/RAV, PagoPA/CBILL, bollettini, SDD, ricarica Postepay/Satispay/Hype, SumUp/Nexi prefixes); schema for the confirmation loop | S | CTO (data) | `ai-ml-transaction-intelligence.md` §1.3 |

**Exit criteria (Gate D):** D1–D7 as in §3. Hard stop: no production launch until D1 is answered in writing (D9 of `open-banking-providers.md`).

### Phase 3 — Open Banking MVP

| Element | Content |
|---|---|
| **Goal** | The deterministic loop — CONNECT → SYNC → UNDERSTAND → CORRECT ONLY WHEN NECESSARY — works end to end on real Italian accounts: every transaction ingested once, state-machined, paired/settled/deduplicated with evidence and undo, routed to the inbox only when uncertain; consent, coverage and sync health are user-facing objects; import, export and deletion work from day one. Built as a **vertical slice first** (one founder, one bank, one month, one second account for pairing), then widened to the top-10 banks |
| **Dependencies** | Gate D; provider production keys; pilot report (which fields to trust per bank); identity ADR; brand identity v1 and prototype copy |
| **Risks** | F02 connection UX, F03 coverage, F05 reconciliation errors, F23 silent-automation incident, F16 store rules shaping flows, F15 bandwidth |
| **Effort** | **phase L/B/H = 12 / 20 / 32 person-months (XL)** |
| **Team** | 5: CTO, backend/data engineer, mobile engineer, Head of Product (copy, inbox design, QA on fixtures), brand-design lead (UI); DPO on consent screens |
| **Scope cut order** | Web read-only view → PDF statement parsing (keep CSV/XLSX) → cash-wallet polish (keep ATM→cash pairing) → recurring *display* (detection moves to Phase 4 anyway) → second provider adapter in production (keep dormant) → Android or iOS first (OPEN QUESTION: ship one platform first if the team is < 5; never cut export/delete/trust page/consent countdown) |

| Deliverable | Description | Size | Owner | Depends on |
|---|---|---|---|---|
| Vertical slice | Founder account at one top-10 bank + one second account: consent flow (provider named, "solo lettura"), first sync with ~90 days, ledger, one transfer pair, one card settlement or Satispay top-up typed, month view, inbox with ≤ 3 cards, sync report; demoed internally before widening | M | CTO + mobile engineer | Gate D |
| Connection flow and connections dashboard | Bank picker with per-bank, per-account-type coverage status; consent explainer (names the licensed provider, read-only, duration from provider `expires_at`); redirect/app-to-app SCA; `connection` state machine (`consent-model.md` §4.2: active, expiring, expired, revoked, error_auth, error_provider, paused); renewal UX at day 150/170/178/180 with batch "Rinnova tutti"; history-gap handling with CSV offer | L | Head of Product + mobile + backend | Provider contract |
| Sync engine | Scheduler ≤ 4 unattended refreshes per consent per day + user-present refresh on open; per-bank parameters (14-day paging for Intesa, 429 back-off); trailing-window re-fetch (≥ 7, 30 recommended); `sync_run` idempotency; per-sync human-readable report ("14 nuovi, 1 trasferimento riconosciuto, 2 in attesa, 0 saltati") listing every merged/skipped/changed item; named failure states with next retry | L | CTO | ADRs |
| Ingestion identity and dedup | Layered `provider_key` → `fingerprint_v1` + ordinal; `provider_record` immutable with raw payload (90-day retention); `DEDUP_HIT` / `MERGE_PROPOSED` / `NEW` machine; CSV ↔ API supersession; remembered deletions (nothing respawns) | L | Backend engineer | Pilot report |
| Transaction lifecycle | `PENDING → BOOKED` (provider link, then fuzzy with tolerance), `EXPIRED_HOLD`, `CANCELLED`, `REVERSED`, `NEEDS_REVIEW` on provider deletion of edited rows; user edits carried across transitions; "saldo come lo vede la banca oggi" default with future-dated items separate; balance equality check after every sync → inbox item on mismatch | L | Backend engineer | Identity |
| Reconciliation engine (deterministic) | `TRANSFER_PAIR` (opposite amounts, window, IBAN hash, e2e id, provider hints; never invent a leg), `CARD_SETTLEMENT` (statement period, "unexplained settlement" state), `CASH_WITHDRAWAL` → cash wallet, `REFUND_OF`, `REIMBURSEMENT_OF` (propose only), `REVERSAL_OF`; evidence JSON renderable as one Italian sentence; auto thresholds per `reconciliation-and-data-model-patterns.md` §9.2; rejection memory; batch undo per sync run | L | CTO + backend | Lifecycle |
| Review Inbox ("Da rivedere") | Cards for the ambiguous only (new merchant, candidate pair, candidate duplicate, candidate refund, amount threshold, balance mismatch, consent expiring/expired, bank-removed item); one-tap confirm with top alternatives inline; swipe on mobile; undo stack; empty state "Niente da fare. Tutto è al suo posto."; routing floor enforced in code | M | Head of Product + mobile | Reconciliation |
| Categorisation T0/T1 | Kind from CBI codes/keywords/ISO BTC; system rules for structural kinds (fees, interest, stamp duty, ATM, settlements, transfers, F24/PagoPA/MAV/RAV/bollettini); merchant map seed; every category with a reason string; corrections write a per-user rule proposal (rule engine with conditions on merchant, amount band, account, payment type, direction; retroactive with preview); explicit rules always win | M | Backend + Head of Product | Dictionary v0 |
| Import, manual, cash | CSV/XLSX importer with mappings (Intesa, UniCredit, Fineco, Revolut, N26, PayPal) + generic mapper + share-sheet entry; manual accounts and pseudo-accounts (Satispay/PayPal wallets with top-ups typed as transfers); one-tap cash entry; recurring manual templates (simple) | M | Backend + mobile | Identity |
| Month view, balances, simple summary | "Cosa è successo" month view from reconciled data (income, fixed vs variable, transfers excluded, pending flagged); balances snapshot across accounts incl. cash; a deterministic monthly summary card (no model) | M | Mobile + Head of Product | Reconciliation |
| Trust surfaces | "I tuoi dati" page (provider and licence, read-only scope, expiry per bank, what is stored and for how long, processors and EU hosting, no data sale, export/delete buttons); "Copertura banche" page with per-bank/per-account-type status and last-checked date; status page in Italian; in-app account deletion (crypto-shredding ≤ 24 h) and export (CSV/JSON zip with schema) | S–M | Head of Product + DPO | Compliance plumbing |
| Store compliance plumbing | Consent-first onboarding not tied to any paid tier; 18+ age gate; privacy labels / Data safety from the real SDK list; Financial-features declaration draft; purpose strings; no ad SDK; IAP/Play Billing scaffolding (no paywall yet) | S | Head of Product | ADRs |
| Fixtures and QA | 25 reconciliation scenarios as automated fixtures; per-bank golden exports; dogfood protocol (founders + 10 friendly ICP users under research consent) with daily balance-equality checks | M | CTO | Engine |

**Exit criteria (internal, feeding Gate E):** all 25 fixtures green; balance equality 100 % on dogfood accounts for 30 consecutive days; 0 silent skips, 0 phantom legs, 0 respawning duplicates; sync_success_rate ≥ 95 % daily on ≥ 8 of the top-10 banks over 30 days; inbox ≤ 3 items at first sync for ≥ 2-institution dogfood users; TTFV ≤ 10 min median on dogfood; every automatic action shows a reason and can be undone; export and deletion verified end to end; consent renewal flow exercised on at least one real expiry (or a provider-forced re-consent).

### Phase 4 — AI automation

| Element | Content |
|---|---|
| **Goal** | Turn corrections into learning: per-user categorisation that is right the first time and corrected once, with explicit rules winning and a visible "why"; recurring detection with Italian periodicities; the monthly/weekly "Cosa è successo" with evidence lines; safe-to-spend; all within the AI cost cap and the EU/permission posture. "AI" appears in the product only as an explanation (`opportunity-map.md` §2.6) |
| **Dependencies** | Phase 3 ledger and rules; AI vendor ADR; taxonomy with Art. 9 review; third-party-AI permission step; eval set |
| **Risks** | F05 AI errors, F23 silent automation, F10 (Art. 9, AI Act Art. 50 disclosure, store AI rules), F01/F14 indirectly (cost), F15 |
| **Effort** | **phase L/B/H = 8 / 14 / 22 person-months** |
| **Team** | 5; CTO or a data/ML lead on the cascade; annotators (contract) for the eval set and the weekly audit |
| **Scope cut order** | T5 frontier residual → chat of any kind (not in scope anyway, P3) → insight depth (keep the monthly summary) → anomaly alert variety (keep projected-negative, duplicate SDD, price increase) → embeddings tier T3 (keep T0–T2 + T4) → never cut: rules-from-corrections, reasons, abstain, eval set, cost cap |

| Deliverable | Description | Size | Owner | Depends on |
|---|---|---|---|---|
| Italian eval set v1 | 3,000–5,000 labelled rows stratified by bank/format, kind, merchant frequency (repeated merchants per pseudo-user), ≥ 30 rows per leaf, null/abstain subset, injection subset, pending/booked pairs, card-settlement subset; double annotation; frozen test split; seeded from Banana fixtures, CBI table, dogfood data under consent | M | Data/ML lead | Taxonomy v1 |
| Taxonomy v1 | Two axes: `kind` (card_pos, card_online, sdd, sct_out/in, instant, atm, fee, interest, tax, card_settlement, transfer_internal, refund, cash_deposit, pagopa, f24, unknown) × `category` (12–16 parents, 70–110 leaves, default child per parent, stable snake_case ids, version tags); first-class parents for Transfers, Income (incl. pensione INPS, rimborsi 730), Taxes & government, Fees & interest; no special-category labels; "Privata" flag | S | Head of Product + DPO | Counsel memo |
| Cascade T2–T5 behind one port | T2 char n-gram TF-IDF + linear model per locale + per-user naive Bayes (abstains without known tokens); T3 embeddings + kNN (pgvector, global + per-user namespaces); T4 small LLM batched 25–50 items with closed-enum JSON schema, cached stable prefix (padded ≥ 4,096 tokens if Haiku 4.5), hints and top-3 candidates passed; T5 frontier residual only on disagreement + material amount; `classifyBatch` port with AI SDK for online, direct SDKs for batch; two switchable vendors; shadow mode on 5 % | L | Data/ML lead | Eval set; AI ADR |
| Confidence gate and calibration | Per-tier calibration (Platt → isotonic as labels grow); thresholds chosen for auto-error ≤ 2 %; "null over wrong"; review routing floor; readiness indicator during cold start; confidence shown as words, never percentages | S | Data/ML lead | Cascade |
| Learning loop | First correction proposes a rule inline ("Da ora CONAD CITY → Spesa alimentare?"); learned rules in a reviewable list with provenance ("creata da te il 6 ott" / "suggerita da Lilleri, confermata"); locked attributes so automation never overwrites a user edit; corrections feed per-user rule, Bayes/kNN index and (with consent) the eval set | M | Backend + Head of Product | Rules engine (Phase 3) |
| Recurring engine | Group by normalised merchant / SDD creditor id / mandate reference / kind; periodicities weekly, biweekly, monthly, bimonthly, quarterly, semiannual, annual; ≥ 2–3 occurrences with amount bands (fixed ±2 %, variable median ±35 %); next expected debit; notice period (user-added); "expected but missing" and "price increased" inbox cards; exclude settlements/transfers | M | Backend | Phase 3 ledger |
| Safe-to-spend and watchlists | "Puoi spendere ancora X € fino al [payday]" = available balance across accounts − recurring not yet debited − set-aside; recalculated after every sync; optional category watchlists; no envelope method | S | Mobile + backend | Recurring |
| Summaries and alerts | Weekly/monthly "Cosa è successo" generated from reconciled data (income, fixed vs variable, three largest variances vs the user's own baseline, subscriptions changed, transfers moved, ≤ 3 suggestions each with an evidence line); few explainable alerts (projected negative before payday, duplicate SDD, price increase, new merchant above threshold, bank fee), default-on, individually mutable; push volume cap ≤ 3/week | M | Head of Product + backend | Recurring; summary card from Phase 3 |
| AI compliance and cost | Third-party-AI permission step (Apple 5.1.2(i) / Play) in first run and settings; Art. 50 disclosure labels ("Categoria suggerita"); pseudonymised minimal payloads (no IBAN, no user id, no balances); prompt-injection test suite; AI cost dashboard with the €0.10 per paid member cap; DPIA update | S | DPO + Data/ML | Cascade |
| Weekly audit ritual | Sampling procedure (200–500 rows), annotation UI/sheet, adjudication; feeds audited ACR (`metrics.md` §2.4) | S | Data/ML lead | Eval set |

**Exit criteria (Gate E):** E1–E10 as in §3.

### Phase 5 — Closed Beta

| Element | Content |
|---|---|
| **Goal** | Prove, with 500 then 2,000 real ICP users on the top-10 Italian banks, that the loop is correct, trusted and convertible; set the North Star baseline; measure the three Gate C inputs; harden support, security and store readiness |
| **Dependencies** | Gate E; waitlist (Phase 1); research/beta consent flows; TestFlight / Play internal testing; support tooling; billing scaffolding with the 30-day no-card Pro trial (OPEN QUESTION 3 on plan names) |
| **Risks** | F02, F03, F05, F06 support cost, F07 free tier, F11 retention, F19 WTP, F16 store rejection, F23 |
| **Effort** | **phase L/B/H = 6 / 10 / 16 person-months** (iteration, fixes, support, instrumentation) |
| **Team** | 5; part-time support (founder-led first, then a support lead); annotators; pen-test firm; accessibility auditor |
| **Scope cut order** | Wave 2 size (2,000 → 1,200) → pricing A/B breadth (never below one price test) → "coverage unknown" cohort (Hype/N26/Satispay/Mediolanum) → never cut: audit, balance-equality monitoring, support SLA, pen-test |

| Deliverable | Description | Size | Owner |
|---|---|---|---|
| Wave 1 (500) | Recruited for bank coverage (Intesa, UniCredit, Poste/Postepay, Fineco, BPER, Banco BPM, MPS, Crédit Agricole Italia, Credem, BCC Iccrea + Revolut IT), ≥ 3 institutions each; "coverage unknown" sub-cohort; daily correctness review; per-bank fill-rate and failure causes at scale; consent-renewal test at the first expiry | M | Head of Product + CTO |
| Wave 2 (2,000) | Trial live (30-day, no card, reminder at day 27); paywall copy A/B ("Aggiungi Fineco e Revolut con Lilleri Plus"); support via e-mail + in-app with human answers on connection failures; weekly "cosa abbiamo sistemato" changelog; NPS; free AIS cost per paid subscription measured; **F vs F′ decision** (`business-model.md` D-BM-1) | M | Growth + Head of Product + CFO |
| North Star baseline | Audited ACR, hidden error rate, WACU-fresh, TTFV, WOW-session rate, inbox size, corrections/100, consent renewals; **re-calibration of every Low/Base/High after 200 consented users** (J-9); dashboard v1 with paired metrics | S | Head of Product + Data/ML |
| Hardening | External pen-test (high/critical closed); incident-runbook drill; accessibility audit WCAG 2.1 AA on the loop; load test of the scheduler at 10× beta; backup/restore drill incl. key rotation | M | CTO |
| Store readiness | Listings (Italian), screenshots showing reconciliation (paired transfer, settled card, empty inbox), privacy labels / Data safety, Financial-features declaration with the licence evidence pack, review notes naming the provider and the route; T&Cs with Cod. Cons. art. 49 information and withdrawal; dark-pattern audit of paywall and cancel flows; Trustpilot profile claimed | S | Head of Product + Compliance |
| Public trust pages | "Copertura banche" live with last-checked dates; status page; "I tuoi dati" reviewed by the DPO; public changelog | S | Head of Product |

**Exit criteria (Gate F):** F1–F11 as in §3; plus the written F vs F′ decision and the Phase 6 launch plan (bank list, channel plan, support SLA).

### Phase 6 — Italian launch

| Element | Content |
|---|---|
| **Goal** | Open beta then public launch on iOS and Android in Italy with organic/referral-led growth, launch guardrails live, and no regression on correctness while volume grows 5–10× |
| **Dependencies** | Gate F; store approvals; creators and press lined up; referral mechanic in Plus months; support SLA; provider capacity confirmed for the expected connected-account volume |
| **Risks** | F02/F03 at scale, F06 support, F11 retention, F12/F13 brand and positioning, F16 store, F21 funding (launch costs), F09 competitor reaction |
| **Effort** | **phase L/B/H = 5 / 8 / 14 person-months** (engineering: scale, ASO, referral, store ops; growth: creators, content, PR) |
| **Team** | 5 → 7: + support lead, + growth/content; creators and PR as contractors |
| **Scope cut order** | Paid UA tests (cap €5 k/month, stop rule) → PR breadth → creator wave size → never cut: launch guardrails, status page, support SLA, coverage honesty |

| Deliverable | Description | Size | Owner |
|---|---|---|---|
| Open beta | Public TestFlight / Play open testing; store listings live; ASO (Italian keywords, screenshots of reconciliation); referral programme (1 month of Plus per activated referral, both sides); first creator wave (10–20 creators, sponsored with #adv, honest demos, creator-specific links) | M | Growth |
| Launch | Public release both platforms; press (Aziendabanca, Economyup, Il Sole 24 Ore Plus24, Corriere Economia, Wired IT, Il Post) on "the first Italian app that reconciles transfers across banks" and the no-ads promise; App Store editorial pitch; creators wave 2 | S | Growth + CEO |
| Launch guardrails | G1–G18 of `metrics.md` §6 live on the dashboard; release-blocking checks wired into CI (un-reminded charges, silent skips, schema lint, rating-prompt discipline, cancel taps); canary cohorts and kill switches for the reconciliation and categorisation versions; incident comms templates in Italian | S | Head of Product + CTO |
| Scale readiness | Scheduler budget per consent at 10× beta; provider quota monitoring; cost dashboard (provider_cost_per_active_user, free AIS cost per paid); on-call rota | S | CTO |
| Content and SEO | Evergreen Italian articles and tools (F24, MAV/RAV, conto cointestato, partita IVA, export guides per bank, "calcolatore abbonamenti"); public coverage page as a ranking asset | M | Growth |
| Post-launch stabilisation | 60-day correctness watch at launch volume; weekly North Star review; store-review monitoring for "non si collega" and "numeri sbagliati" themes; Trustpilot parity actions | S | Head of Product + Support |

**Launch criteria (subset of F, re-checked at open beta):** D30 ≥ 8 % on open-beta cohorts; paid subscriptions ≥ 100 per 1,000 MAU; no P1 correctness incident open > 7 days; sync_success_rate ≥ 97 % daily on the launch bank list; support ≤ 15 per 1,000 MAU; audited ACR ≥ Base for the phase; both store approvals in hand. **Exit criteria (Phase 6):** 60 days after public launch with the launch criteria still met at ≥ 5× beta volume; blended CAC ≤ €3 (High) with ≥ 70 % organic/referral registrations.

### Phase 7 — Monetisation optimisation

| Element | Content |
|---|---|
| **Goal** | Reach the Target corridor (AIS ≤ €0.20 equivalent, ≥ 180 paid subscriptions per 1,000 MAU, offers ≥ €0.15/MAU opt-in) without a single trust regression; ship the first expansion (household/Famiglia) and the depth features that justify Plus; take the route-C decision; run the 12-month review (Gate G) |
| **Dependencies** | Launch data; first renewal cohort (month 13 relative to the first annual purchase); counsel memo on PSD2 art. 67(2)(f) for the offers rail; partner talks (2 banks/brokers, 1 comparator); plan-ladder ADR (OPEN QUESTION 3) |
| **Risks** | F07 free tier, F19 WTP, F20 second rail erodes trust, F11 retention, F01 provider price at renewal, F09 competitor replication, F10 (OAM/IVASS boundaries for any referral) |
| **Effort** | **phase L/B/H = 10 / 18 / 28 person-months** |
| **Team** | 7–8: + data/ML lead if not yet hired; growth/monetisation owner; support lead |
| **Scope cut order** | Receipts attach-to-transaction (MVP-lite) → web read-only → forecasting depth (12-month cash-flow) → offers rail breadth (never ship it before the beta trust metrics hold; never inside the inbox) → Famiglia scope (ship shared tags + joint-account contributions; cut settle-up suggestions first) |

| Deliverable | Description | Size | Owner |
|---|---|---|---|
| Plan ladder ADR and paywall | Resolve the conflict between `brand-strategy.md` D7 (Lilleri / Lilleri Plus / Lilleri Famiglia; no "Pro" for consumers) and `business-model.md` D-BM-6 (Free / Plus / Pro / Family); grandfathering of launch prices; contextual upgrade prompts only; two-tap cancel; pre-renewal reminders | S | Head of Product + CEO |
| Pricing tests | €4.99 vs €5.99 Plus (`unit-economics.md` §8: worth ≈ €100 per 1,000 MAU); annual share push; Famiglia price; measured against refund rate and cancel taps (guardrails G7–G8) | S | Monetisation |
| Famiglia / household (first expansion) | Two patterns: shared tags with split rules on personal accounts; joint account as household ledger with contribution tracking (equal / income-proportional); contributions paired across two consents; private-by-default; one subscription, separate logins; no per-member fee, no daily caps | L | Head of Product + backend + mobile |
| Refund and reimbursement matching | Promote `REFUND_OF` to auto with evidence; "rimborsabile" flag and "in attesa di rimborso" ledger; partner repayments netted through the household model | M | Backend |
| Free-tier guardrail operations | Monthly check of free AIS cost per paid subscription (≤ €1.20); two consecutive misses → F′ for new cohorts with 12-month grandfathering; widen to 2 institutions only if AIS ≤ €0.15 and conversion ≥ 20 % | XS (recurring) | CFO + Product |
| Opt-in "Offerte" rail experiment | Only after launch trust metrics hold: separate revocable consent, labelled items with "Lilleri riceve un compenso", never in the inbox or insights, 2 bank/broker referral partners + 1 comparator for switching, opted-in cohort vs control, kill switch at NPS delta −5; counsel sign-off on art. 67(2)(f) and OAM/IVASS boundaries first | M | Product + Compliance + Growth |
| Depth features for Plus | 30-day balance forecast per account; subscription price-increase and duplicate-SDD alerts (if not in Phase 4); scheduled export; receipts attach (MVP-lite); web read-only view (OPEN QUESTION on priority) | M | Product + engineering |
| Route C decision | Own AISP registration: counsel quotes, PII premium, eIDAS, CBI Globe fee schedule; go/no-go with budget (€40–150 k one-off, ASSUMPTION) tied to provider cost at scale and the Phase 8 plan | S | CEO + CTO |
| 12-month review | Gate C conditions C1–C6 re-tested on measured data; North Star trend; guardrail record; decision to expand / consolidate / tighten | S | CEO + CFO |

**Exit criteria (Gate G):** G1–G7 as in §3.

### Phase 8 — European expansion

| Element | Content |
|---|---|
| **Goal** | Launch Lilleri in a first non-Italian market with the same promise, the same correctness guarantees and a market-specific trust layer (local licensed provider named, local SCA pattern, local payment semantics), then repeat |
| **Dependencies** | Gate G; market selection on provider coverage quality, incumbent strength (DE Finanzguru, FR Bankin'/Linxo, ES Fintonic pivoted, PT/GR/NL Plum present), language cost, consent behaviour (`go-to-market.md` Q6; candidates Spain and Portugal, HYPOTHESIS); provider passport for the market; local counsel (consumer law, AISP passporting); i18n architecture from Phase 2 (Italian master copy + English glossary + locale number table) |
| **Risks** | F09 incumbents, F03 coverage per market, F14 provider concentration, F10 per-market compliance, F21 funding, F15 bandwidth, F18 PSR timing (≈ mid-2028+, may move renewal in-app — upside and rework) |
| **Effort** | **L/B/H = 18 / 30 / 50 person-months for the first market** (ASSUMPTION; second market cheaper) |
| **Team** | 12 (`revenue-scenarios.md` §4 100 k-MAU stage): + market lead, + 2–3 engineers, + compliance |
| **Scope cut order** | Number of markets in parallel (one at a time) → local offers rail → local creators breadth → never cut: local coverage page, local trust page, local consent copy, local eval set |

| Deliverable | Description | Size | Owner |
|---|---|---|---|
| Market selection memo | Score candidates on provider coverage (RFP CSV per market), incumbent depth, WTP anchors, language cost, consent/SCA behaviour, legal cost; pick one | S | CEO + Growth |
| Provider coverage per market | Primary/secondary adapters configured; per-bank parameters; fill-rate pilot repeated on local accounts; coverage page | M | CTO |
| Local semantics | Payment-type dictionary and merchant seed for the market; recurring periodicities; local eval set (≥ 1,500 rows) before enabling T4 auto-apply; taxonomy labels localised, ids unchanged | M | Data/ML |
| Localisation | Copy from the English glossary; locale number/date formatting; local trust and consent pages (provider name, NCA, SCA pattern); plan names ("Lilleri Family/Familie/Famille") | M | Head of Product + Brand |
| Compliance per market | Local counsel: consumer law, store declarations, privacy notice; passport confirmation of the provider; DPIA annex | S | Compliance |
| Mini-gates | Gate B (coverage) and Gate F (beta trust/correctness/conversion) repeated for the market with a 300-user local beta before public launch; NSM in the new market ≥ Italy's Base within two quarters of launch | — | Founders |
| Own AISP programme (if route C was chosen at Gate G) | Banca d'Italia registration file, PII, eIDAS certificates, DORA programme, CBI Globe direct integration; BYO-licence mode at the aggregator for non-Italian banks | XXL | CTO + Compliance |

---

## 5. Workstreams across phases

| Workstream | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 | Phase 7 | Phase 8 |
|---|---|---|---|---|---|---|---|---|
| **Compliance & legal** | Counsel brief; second-rail option set | Opinion on route A; DPIA v1; DPO; Art. 30; vendor register; T&Cs draft | Consent copy; trust page; deletion/export | Art. 9 taxonomy sign-off; AI permission; Art. 50 labels; DPIA update | Store declarations; dark-pattern audit; pen-test | Incident comms; CCD2 wording check (if any affiliate copy) | Offers-rail opinion; route C file | Per-market counsel; passporting |
| **Brand & growth** | Identity; promise/positioning tests; waitlist; WTP survey | Copy system; glossary | UI; Italian copy for every state | Insight copy; nudge tone | Beta recruiting; changelog; NPS | ASO; creators; referral; press; content | Pricing tests; Famiglia launch | Market selection; local creators |
| **Data & measurement** | — | Event registry + lint; `metrics.json`; eval harness skeleton | Ops metrics §5 #1–5, 8–10, 14–17, 21; dogfood ACR | Eval set; cascade metrics; weekly audit; AI cost | North Star baseline; re-calibration; dashboard v1 | Guardrails live; CAC by channel | Renewal cohorts; Gate G pack | Per-market cuts |
| **Security** | — | Threat model; encryption; RLS; secrets; passkeys | Logging redaction; key rotation drill | Payload minimisation tests; injection suite | External pen-test; backup drill | On-call; canaries; kill switches | Bug bounty (optional) | Per-market data residency check |
| **Provider & data plumbing** | RFP sent; restricted production on | Contract; pilot report; adapters | Sync engine; identity; lifecycle | Hints into cascade | Fill rates at scale; renewal test | Quota monitoring | Contract renewal; route C | Market coverage |

---

## 6. Critical path and parallelism

1. **Counsel opinion (Phase 1 start → Phase 2 exit)** gates every production launch. If it slips, Phase 3 proceeds on restricted production and dogfood only; nothing is lost except time.
2. **Provider contract with G1–G4 (Phase 1 start → Phase 2 exit)** gates Phase 5 (real users at scale). Enable Banking restricted production lets Phase 3 start without it.
3. **Fill-rate pilot (Phase 2)** gates the identity strategy and the coverage page; it is the cheapest, earliest risk reducer in the plan and must not wait for the contract.
4. **Phase 3 vertical slice → engine → inbox** is sequential; the mobile client, the import module, the trust pages and the dictionary can run in parallel from the first week of Phase 3.
5. **Eval set (Phase 4)** should start during Phase 3 from fixtures and dogfood data so that Phase 4 begins with labels.
6. **Beta recruiting (Phase 5)** starts from the waitlist during Phase 4; the "coverage unknown" cohort is recruited last.
7. **Famiglia (Phase 7)** depends on the data-model room reserved in Phase 2 (profiles, account members, RESTRICTIVE policy on private accounts); do not defer the schema, only the feature.

---

## 7. Re-planning triggers (DECISION proposed: rules, not debates)

| Trigger | Where measured | Response |
|---|---|---|
| RFP quotes > €0.30 per account-month with no per-user or inactive-account relief | Phase 2 | Enable Banking primary if cheaper and pilot-equivalent; free tier switches to F′ "Free Classic" at design time; > €0.35 → model the trial-gated shape G and re-run `revenue-scenarios.md` before Phase 5 |
| Counsel says route A is not acceptable for a B2C recipient | Phase 2 | Fabrick Pass (Italian licensee, still route A) → route B request in writing → route C budget enters fixed costs; no production launch until one is in place |
| Pilot shows no stable id and no pending rows at ≥ 3 of the top-10 banks | Phase 2 | Fingerprint+ordinal becomes the primary key for those banks; coverage page states "aggiornamento solo a contabilizzazione"; pending-dependent features (safe-to-spend precision) degrade gracefully |
| Incumbent depth check shows XME Banks or Hype pairs transfers and learns | Phase 1 | Re-scope differentiation to inbox + learning visibility + portability + consent management (`market-analysis.md` §9 condition 2) |
| WOW-session rate < 30 % in beta or TTFV > 15 min median | Phase 5 | Fallback WOW (subscriptions + safe-to-spend) becomes the first screen for single-institution users; investigate per-bank first-sync failures before any growth spend |
| Audited ACR < 70 % (Low) at beta month 3 | Phase 5 | Freeze feature work; raise review routing (accept review_rate up to 25 %) rather than auto-apply; expand the eval set; delay launch |
| Free AIS cost per paid subscription > €1.20 for two consecutive months | Phase 5–7 | F′ for new cohorts; existing free users grandfathered 12 months |
| Trial→paid < 15 % (Low) after two paywall iterations | Phase 5 | Price test €3.99; move depth features forward; test annual-first paywall; if still < 15 % at launch +6 months, evaluate trial-gated G |
| Support contacts > 25 per 1,000 MAU for two months | Phase 5–6 | Pause acquisition; fix the top three failure causes; add in-app diagnostics; only then resume |
| Provider announces closure, acquisition or > 30 % price increase | Any | Activate the dormant adapter for the affected institutions within one release; invoke non-exclusive contract exit; if route C was deferred, re-open the decision |
| Trustpilot − store gap > 1.5 at month 6 | Phase 6 | Billing and support review before any monetisation experiment; offers rail postponed |
| Fixed costs exceed the stage cap by > 20 % | Any | Hiring freeze until C1 and C2 are measured inside thresholds (D-RS-3) |

---

## 8. Mapping to the repository work plan

The repository's internal task list uses six workstream phases (0 Research; 1 Synthesis and strategy; 2 Brand identity and design system; 3 Architecture decisions and ADRs; 4 Monorepo foundation and vertical slice; 5 Critical reviews and quality gates). They map onto this roadmap as follows: internal 0 = Phase 0; internal 1 + 2 = Phase 1 (this document is an internal-1 deliverable); internal 3 = Phase 2 ADRs; internal 4 = Phase 2 foundation + the Phase 3 vertical slice; internal 5 = the review discipline applied at every gate. No conflict; the roadmap is the product view, the task list is the engineering view.

---

## Decisions / Recommendations

| ID | Decision / recommendation | Label | Needs ADR? |
|---|---|---|---|
| R-1 | Nine phases in the order above; correctness (Phase 3, deterministic) before intelligence (Phase 4); trust surfaces in the MVP | DECISION (proposed) | No (PRD) |
| R-2 | Gates A–G with the criteria in §3; D–G newly defined here; a gate ends a phase, a date never does | DECISION (proposed) | No |
| R-3 | Effort in T-shirt sizes and person-month ranges only; team assumptions per §1.2; fixed-cost caps per `revenue-scenarios.md` D-RS-3 | DECISION (proposed) | No |
| R-4 | The three long-lead items (counsel, RFP, restricted-production pilot) start on day one of Phase 1, not in Phase 2 | DECISION (proposed) | No |
| R-5 | Phase 3 is built as a vertical slice first; the 25 fixture scenarios are the acceptance test of the engine | DECISION (proposed) | Yes — ledger/reconciliation ADRs |
| R-6 | Scope cut order per phase follows the priority order; correctness, trust and privacy items are never on a cut list | DECISION (proposed) | No |
| R-7 | Re-planning triggers in §7 are adopted as standing rules and reviewed at every gate | DECISION (proposed) | No |
| R-8 | Resolve the plan-ladder conflict (brand D7 vs business D-BM-6) in a pricing/plan ADR before Phase 5 paywall tests | RECOMMENDATION | Yes |
| R-9 | Decide platform order (iOS first, Android first, or both) and the mobile/web stack in Phase 2 with the team size as the main input | RECOMMENDATION | Yes |
| R-10 | Do not plan Italian-only growth beyond ≈ 300 k MAU (D-RS-4); Phase 8 is the growth plan, not an option | RECOMMENDATION | No |

## Open questions

| # | Question | Why it matters | How to resolve | Owner / phase |
|---|---|---|---|---|
| 1 | Provider sales-cycle length for a pre-seed B2C customer (Yapily, Tink); Enable Banking contract turnaround | Phase 2 duration; whether Phase 3 runs on restricted production longer than planned | RFP responses; ask for a timeline in writing | CTO, Phase 1 |
| 2 | Will counsel's opinion require consent-screen or T&C content that changes the Phase 3 connection flow? | Rework risk | Scope the opinion to include UI wording | CEO + counsel, Phase 2 |
| 3 | Plan ladder: two paid tiers (Plus, Famiglia) per brand strategy or three (Plus, Pro, Family) per business model? Affects trial name ("Pro trial"), paywall copy and ARPPU assumptions (U6) | Phase 5 paywall; unit economics | Pricing/plan ADR; Van Westendorp results | Head of Product + CEO, Phase 2–5 |
| 4 | Platform order and stack (iOS first vs both; native vs cross-platform; web for import only?) | Phase 3 effort and team shape | ADR with the pilot team's skills as input; `tech-stack-options.md` raw note | CTO, Phase 2 |
| 5 | Does the research/beta consent allow the weekly audit without a separate consent? | Audited North Star feasibility | DPO + counsel | DPO, Phase 4 |
| 6 | How large must the "coverage unknown" cohort be to resolve Hype, N26, Satispay, Mediolanum, Widiba, BBVA Italia quality? | Coverage page honesty at launch | Pilot + beta wave 1 design | CTO, Phase 5 |
| 7 | Is a read-only web view required at Italian launch for S1 (Wallet users value desktop sub-categories)? | Phase 6/7 scope | Beta survey; creator feedback | Product, Phase 5 |
| 8 | Route C timing: does own registration lower AIS cost enough via CBI Globe direct to justify the fixed cost before Phase 8? | Gate G | Law-firm quotes; CBI fee schedule | CEO + CTO, Phase 7 |
| 9 | First European market (Spain vs Portugal vs other) | Phase 8 plan | Provider coverage CSVs per market; incumbent depth checks | Growth, Phase 7 |
| 10 | PSR adoption (indicative plenary 14 Dec 2026; application ≈ mid-2028+): if renewal SCA moves to the AISP, how much of the consent machine is rework vs upside? | Phase 7–8 engineering | Quarterly OEIL watch; read Council doc 8222/26 when reachable | Compliance, ongoing |

## Sources

All carried-over claims verified on 2026-10-02 by the input documents; IDs resolve in their Sources sections.

### Input documents (this repository)

| Document | Used for |
|---|---|
| `docs/research/market-analysis.md` | Gate A verdict and conditions (§9); decisions 1–10; Q1 incumbent depth |
| `docs/research/open-banking-providers.md` | §1 PSD2 parameters; §2 licensing routes; §5.5 D1–D9 and RFP gates G1–G4; §6 Gate B |
| `docs/research/data-sources-feasibility.md` | MVP source set (A, C, H, I, D-lite); never list; policy plumbing |
| `docs/research/opportunity-map.md` | §2 feature areas; §3 differentiator ranking; §4 what not to build; §5 decisions |
| `docs/research/user-pain-points.md` | §0 failure modes; D1–D13 |
| `docs/product/personas.md` | PD-1…PD-8 (validation plan, household rules, data-model room for P5) |
| `docs/product/jobs-to-be-done.md` | Loop and invariants; WOW/TRUST definitions; J-1…J-9 |
| `docs/compliance/regulatory-landscape.md` | §2 master table; §4 constraints register; §5 calendar; D1–D10; R1–R2 |
| `docs/compliance/consent-model.md` | §4 consent records; §5 renewal timeline (day 150/170/178/180) |
| `docs/compliance/privacy-model.md` | Analytics rules; AI vendor requirements; DPIA scope |
| `docs/business/business-model.md` | D-BM-1…D-BM-7; §7 second rails |
| `docs/business/unit-economics.md` | U-inputs; D-UE-1…4; R-UE-2 (finance model package) |
| `docs/business/revenue-scenarios.md` | §4 fixed costs and team by stage; §6 Gate C C1–C6; D-RS-1…4 |
| `docs/business/go-to-market.md` | §4 waitlist/beta/open beta exit criteria; §5 sequencing; §6 CAC rules; D-GTM-1…6; Q6 first market |
| `docs/brand/brand-strategy.md` | D1–D11; §13 brand measures; plan naming (D7) |
| `docs/brand/messaging-framework.md` | Inbox name candidates; glossary |
| `docs/research/raw/ai-ml-transaction-intelligence.md` | §6.1 eval set; §7 pipeline and cost; §5 provider posture |
| `docs/research/raw/reconciliation-and-data-model-patterns.md` | §4.2–4.4 models and state machines; §9.1 identity; §9.2 match types; §9.3 fixtures |
| `docs/product/metrics.md` | Gate thresholds; measurement plan by phase |
| `docs/product/pre-mortem.md` | Failure modes F01–F23 referenced per phase |

### Key external sources carried over

| ID | Source | URL | Date | Reliability | Used for |
|---|---|---|---|---|---|
| A-#11 | Banca d'Italia FAQ Istituti di pagamento (90-day decision term; agents) | https://www.bancaditalia.it/compiti/vigilanza/accesso-mercato/istituti-pagamento/faq-istituti-pagamento/index.html | 2026-10-02 (snippet) | high | Route C timing |
| B-#1 | Fabrick Pass (AISP as a service, Banca d'Italia PI) | https://www.fabrick.com/it/fabrick-pass-servizi-as-a-service | 2026-10-02 | high (self) | Fallback route |
| B-#12 | Enable Banking Italy market page; restricted production (FAQ) | https://enablebanking.com/docs/markets/it/ ; https://enablebanking.com/docs/faq/ | 2026-10-02 (snippet/mirror) | high | Pilot instrument |
| A-#172 | Bank of Lithuania register: Yapily Connect UAB | https://www.lb.lt/en/sfi-financial-market-participants/yapily-connect-uab | 2026-10-02 | high | Primary provider licence evidence |
| A-#152 / A-#153 | OEIL 2023/0209(COD); Clearingpost on the 14 Dec 2026 indicative plenary | https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2023%2F0209%28COD%29 ; https://clearingpost.com/insights/legislative-observatory-lists-december-14-indicative-plenary-date-for-psd3-and-p/ | 2026-10-02 | high / medium | PSR watch |
| EU-1 / EU-2 | Delegated Reg. 2018/389 + EBA Q&A 2019_4631; Delegated Reg. 2022/2360 | https://eur-lex.europa.eu/eli/reg_del/2018/389/oj ; https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2019_4631 ; https://eur-lex.europa.eu/eli/reg_del/2022/2360/oj/eng | 2018–2023 | high | Sync and consent parameters |
| A-#195 | Yapily data restrictions (Intesa 429, two-week window) | https://docs.yapily.com/pages/data/financial-data-resources/data-restrictions/ | live | high | Per-bank sync parameters |
| RL S-32 | Apple App Review Guidelines (3.2.1(viii), 5.1.1(v), 5.1.2(i)) | https://developer.apple.com/app-store/review/guidelines/ | 2026-06-08 (first-hand) | high | Store readiness |
| AP-1 / GP-1 | Apple EU terms (1 Oct 2026); Android Developers blog on Play fees (Jun 2026) | https://developer.apple.com/support/apps-in-the-eu/ ; https://android-developers.googleblog.com/2026/06/play-expanded-billing.html | 2026 | high / medium-high | Billing scaffolding |
| NEW-1 (regulatory) | Google Play policy announcement 15 Jul 2026 | https://support.google.com/googleplay/android-developer/answer/17134731?hl=en | 2026-07-15 | medium (snippet) | AI permission step |
| NEW-4 (market) | CRIF 57.4 % connection success, H1 2025 | https://www.pagamentidigitali.it/digital-banking/open-banking-cresce-la-fiducia-in-italia-nel-2025-oltre-la-meta-dei-conti-viene-collegata-con-successo/ | 2025-10 | medium | Connection targets |
| NEW-7 (market) | Intesa Sanpaolo newsroom: XME Banks | https://group.intesasanpaolo.com/it/newsroom/comunicati-stampa/2020/02/intesa-sanpaolo-presenta-xme-banks-per-la-gestione-di-conti-corr | 2020-02 | medium-high (snippet) | Incumbent depth check |
| WS-01 | Hype support: Radar | https://support.hype.it/privati/articles/radar-come-monitorare-entrate-uscite-e-piani-risparmio-dei-tuoi-conti | n/d | high (snippet) | Incumbent depth check |
| W-1 | RevenueCat State of Subscription Apps 2026 | https://www.revenuecat.com/state-of-subscription-apps | 2026-10-02 | medium | Trial design |
| US-W3 | Plaid customer story on YNAB | https://plaid.com/en-gb/customer-stories/ynab/ | 2025 | high (vendor) | Provider quality → conversion |
| PP-G-01 | Actual Budget #1628 | https://github.com/actualbudget/actual/issues/1628 | 2023-09-01 | high | Why pairing is Phase 3 core |
| PP-AD-01 | Actual Budget docs: GoCardless closed to new accounts | https://raw.githubusercontent.com/actualbudget/actual/master/packages/docs/docs/advanced/bank-sync/gocardless.md | 2026-10-02 | high | Provider risk |
| A-#180 / A-#64 | CNBC on Visa layoffs (Tink parent); Finextra on TrueLayer layoffs | https://www.cnbc.com/2026/07/28/visa-is-cutting-7percent-of-employees-in-efficiency-push-as-ai-reshapes-work.html ; https://www.finextra.com/newsarticle/45072/truelayer-lays-off-25-of-staff-in-a-single-day | 2026 / 2025 | high | Provider risk |

End of document.
