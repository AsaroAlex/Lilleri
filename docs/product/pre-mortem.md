# Pre-mortem: "It is 2029 and Lilleri failed"

**Project:** LILLERI (greenfield consumer PFM; Italy-first, then Europe)
**Document type:** Phase 1 product document — prospective hindsight on the plan in `roadmap.md`
**Date / verification date for every carried-over claim:** 2026-10-02
**Author:** Head of Product + startup finance analyst + growth lead (founding team)
**Language:** documentation in English; product copy in Italian with English glosses.
**Inputs read in full:** the fifteen documents listed in `metrics.md` ("Inputs"); failure evidence is drawn mainly from `user-pain-points.md`, `market-analysis.md` §5 (trends) and §8.4 (counter-arguments), `open-banking-providers.md` §3 (provider risks), `regulatory-landscape.md` §2, `business-model.md` §2–3, `unit-economics.md` §8, `revenue-scenarios.md` §6, `brand-strategy.md` §10.
**Method:** Klein's pre-mortem (`NEW-M1`): assume the project has already failed, write the obituary, then list every reason it could have happened. The 1989 Mitchell/Russo work cited by Klein found that "prospective hindsight" raises the ability to identify reasons for future outcomes by about 30 % (reported in the HBR article; not re-verified here). Each failure mode below has a probability, an impact, early-warning signals with thresholds, mitigations and an owner role.

## Delivery and evidence boundary (review decision, 2026-10-02)

This is a requirements document, not a list of delivered features. Local work uses synthetic fixtures and a mock provider. Official sandbox work needs provider-issued non-production access. Any real-data pilot needs a written acceptable licence route, provider permission/contract, DPIA/privacy controls, security isolation and informed participant consent before access. Bank credentials are never collected by Lilleri. Mock or sandbox success does not verify Italian production coverage, user demand, retention, classification calibration, store approval or legal clearance.

The full P0 list describes a future cleared beta, not the initial repository scaffold. Implement a small synthetic vertical slice first: exact money → mock ingest → idempotency → deterministic reconciliation/classification with explicit rules → evidence/review/undo → honest synthetic summary. Record actual commands/results in repository status; do not claim every planned fixture or UI flow is already implemented.

Canonical commercial policy: **Lilleri Gratis / Lilleri Plus** at launch; Plus **€4.99/month / €39.99/year is a hypothesis**. **Lilleri Famiglia Later** after consent/sharing/isolation tests; **Pro reserved** for future professional workflows. Closed beta is free. A proposed **30-day non-renewing Plus preview** requires implemented entitlements; it never charges. Store billing, real purchases and renewal metrics are P1 and require explicit checkout and release gates. Correctness, corrections/learning/rules, privacy/security/consent safety, retained-data access, export and deletion stay free in every plan and after downgrade.

Evidence dates/FACT labels below are inherited from source research, including its snippets and uncertainty; this review does not freshly verify vendor terms or law. Numerical success criteria are HYPOTHESES. Fixture correctness cannot establish production precision. Report audited error numerator/denominator, sample selection, decision type, bank/period, label agreement and confidence intervals; audit and user corrections must not double-count errors. A zero-error small sample is not proof of zero error. All A–G letters refer to the brief: A market, B data feasibility, C business, D architecture, E security, F core-loop UX, G brand. Beta/public-launch/expansion releases are separate decisions.

## How to read this document

- Labels: **FACT** (cited source seen on the verification date), **ASSUMPTION** (working value), **HYPOTHESIS** (interpretation to validate), **DECISION** (proposed), **OPEN QUESTION / UNKNOWN**. The failure *stories* are HYPOTHESES by construction; the *evidence* behind each is labelled.
- **Probability** is the founding team's estimate (ASSUMPTION) that the failure mode is a *material contributor* to Lilleri not existing in 2029 if the plan were executed with no mitigation beyond what is already decided: shown as Base with a Low–High range, on a scale Low < 15 %, Medium 15–35 %, High 35–60 %, Very high > 60 %. "Residual" is the target after the mitigations below (HYPOTHESIS).
- **Impact** if it occurs: **Fatal** (the company ends or the promise is no longer deliverable), **Severe** (a phase is lost or ≥ 50 % of plan value), **Major** (a quarter lost or a material cost), **Moderate**.
- **Early-warning signals** reference the metrics of `metrics.md` (§3 inputs, §5 operational, §6 guardrails) with the threshold at which the signal fires; **Mitigations** are split into preventive (P), detective (D) and corrective (C); **Owner** is a role, not a person.
- The priority order (trust, data correctness, security, simplicity, automation, reliability, privacy, speed, UX, brand recognition, cost, monetisation, feature count) is the lens: a failure that breaks a higher priority is rated higher impact at equal probability.

---

## 0. The obituary (HYPOTHESIS — five plausible storylines)

*Written as if in 2029.*

**Storyline 1 — "The free tier ate the company."** In this hypothetical future, Lilleri launched with a generous free core because the research said Italians expect free money apps. The provider quote came in at €0.45 per connected account per month with a €2,000 minimum; the team kept the free sync "for one more quarter" three times. Paid subscriptions never passed 90 per 1,000 MAU. By the time the F′ fallback was switched on, the seed money was gone and the users who left over "my accounts stopped updating" wrote the reviews that killed the relaunch. (Comparable exits illustrate the risk; they do not prove the same cause for Lilleri: Mint, Moneyhub, Spiir, Yolt, Grip, Oval Money — `market-analysis.md` T4, FACT; Base-case economics never break even — `revenue-scenarios.md` §3, HYPOTHESIS.)

**Storyline 2 — "It connected to everything except the banks people use."** Intesa worked, UniCredit worked, Poste worked on the second attempt, Satispay never, Hype never, credit cards never. The WOW moment required two institutions; most users had one that worked and one that did not. The App Store filled with "non si collega" and "mancano i movimenti della carta" ("the card's transactions are missing"). The coverage page was honest, so nobody was lied to; nobody stayed either. (Evidence: CRIF 57.4 % connection success in Italy; UniCredit/Mediolanum/Crédit Agricole expose no card accounts; Satispay has no aggregator listing — `open-banking-providers.md` §1.4, FACT/UNKNOWN.)

**Storyline 3 — "Silent, once."** A reconciliation release in month four after launch widened the transfer window to catch more pairs. Precision fell from 99.4 % to 96 %; a few thousand users saw a rent payment and a salary paired into a "giroconto" and vanish from income and spend. The balance-equality check caught it in 36 hours, the undo worked, the sync report explained it — but the screenshots were already on Reddit under "Lilleri inventa i movimenti" ("Lilleri invents transactions"). Trust, priority one, did not recover. (Evidence: phantom transfer legs and silent overwrites are the most-cited trust-killers — `PP-G-24`, `G-83`, `G-84`, FACT.)

**Storyline 4 — "Banca d'Italia asked a question."** Lilleri launched as a recipient under a Lithuanian provider's licence. Eighteen months in, after a complaint, the supervisor asked whether Lilleri was in substance providing account-information services to Italian consumers. Counsel had never been asked in writing; the provider's answer was "that is your problem". The product paused for five months while an agent appointment was negotiated. (Evidence: Banca d'Italia's position on route A was UNKNOWN in four research passes — `open-banking-providers.md` Q1, `regulatory-landscape.md` OQ1.)

**Storyline 5 — "Correct, calm and forgotten."** The product worked. The inbox was empty most weeks. Users opened the app once a month, read "Niente da fare", and did not renew at €39.99 because nothing seemed to happen. The team, measured on the North Star, had built a product whose success looked like absence. (Evidence: "sense of control" is why YNAB users stay — `US-S12`, FACT; the amended promise requires visibility — `market-analysis.md` §8.2, HYPOTHESIS.)

The failure modes below are the parts these storylines are made of.

---

**Risk-quantification limit (DECISION):** probabilities/residual targets below are elicited planning judgements, not measured failure rates. Modes are correlated (cost, retention, funding, support and trust); do not sum percentages or use weighted rank as portfolio failure probability. Re-elicit after quotes/audits/cohorts; an implemented mitigation is not evidence that its residual target has been achieved.

## 1. Summary ranking

Ranked by Base probability × impact weight (Fatal 4, Severe 3, Major–Severe 2.5, Major 2, Moderate–Major 1.5, Moderate 1; a mixed impact such as "Fatal (route A) / Major" takes the higher weight) — an ordering device (ASSUMPTION), not a forecast; ties keep the order of first visibility. "Phase" = where the signal first becomes visible (`roadmap.md`).

| Rank | ID | Failure mode | Probability (Base; Low–High) | Impact | Score | First visible | Owner role |
|---|---|---|---|---|---|---|---|
| 1 | F07 | Unsustainable free tier | High 45 % (30–60) | Fatal | 1.80 | Phase 5 | CFO + Head of Product |
| 2 | F15 | Founder bandwidth and team | High 50 % (35–65) | Severe | 1.50 | Phase 2–3 | CEO |
| 3 | F01 | Open banking data too expensive | High 35 % (25–50) | Fatal | 1.40 | Phase 2 | CEO + CFO |
| 4 | F04 | Users don't trust Lilleri with their accounts | High 35 % (25–50) | Fatal | 1.40 | Phase 1–5 | CEO (brand) + Head of Product |
| 5 | F21 | Funding gap | High 35 % (25–50) | Fatal | 1.40 | Phase 5–6 | CEO + CFO |
| 6 | F03 | Inconsistent bank coverage | High 55 % (40–70) | Major–Severe | 1.38 | Phase 2 | CTO |
| 7 | F02 | Poor connection UX | High 45 % (30–60) | Severe | 1.35 | Phase 3 | Head of Product + CTO |
| 8 | F11 | Poor retention | High 45 % (30–60) | Severe | 1.35 | Phase 5 | Head of Product + Growth |
| 9 | F09 | Competitors replicate (banks, Revolut, platforms) | High 50 % (35–65) over three years | Major–Severe | 1.25 | Phase 6–8 | CEO |
| 10 | F05 | AI and reconciliation errors | High 40 % (30–55) | Severe | 1.20 | Phase 3–5 | Data/ML lead + CTO |
| 11 | F19 | Italian willingness to pay too low | High 40 % (25–55) | Severe | 1.20 | Phase 1, 5 | Growth / Monetisation |
| 12 | F10 | Compliance blocks features (route A, Art. 9, offers) | Medium 25 % (15–40) | Fatal (route A) / Major | 1.00 | Phase 2 | Compliance/DPO + CEO |
| 13 | F08 | Weak differentiation | Medium 30 % (20–45) | Severe | 0.90 | Phase 1, 5 | Head of Product + Brand |
| 14 | F22 | Market smaller than assumed | Medium 30 % (20–45) | Severe (growth) | 0.90 | Phase 1, 6 | Growth |
| 15 | F23 | Silent-automation incident at scale | Medium 30 % (20–45) | Severe | 0.90 | Phase 6 | CTO |
| 16 | F14 | Provider shutdown, acquisition or price hike | Medium 30 % (20–45) | Severe | 0.90 | Any | CTO |
| 17 | F06 | Support cost explodes | High 40 % (25–55) | Major | 0.80 | Phase 5 | Support lead |
| 18 | F13 | Unclear positioning | Medium 30 % (20–45) | Major | 0.60 | Phase 1, 6 | Head of Product + Brand |
| 19 | F16 | App-store rejection or delays | Medium 30 % (20–45) | Major (delay) | 0.60 | Phase 5 | Head of Product + Compliance |
| 20 | F17 | Data breach or security incident | Low–Medium 15 % (8–25) | Fatal | 0.60 | Any | CTO (security) |
| 21 | F18 | PSD3/PSR changes the rules | Very high 60 % (45–75) that rules change by 2028–29 | Moderate (mostly upside; rework) | 0.60 | Phase 7–8 | Compliance |
| 22 | F12 | Weak brand | Medium 35 % (20–50) | Moderate–Major | 0.53 | Phase 1, 6 | Brand lead |
| 23 | F20 | Second revenue rail erodes trust | Medium 25 % (15–40) | Major | 0.50 | Phase 7 | Head of Product + Compliance |

Reading (HYPOTHESIS): the top of the list is economics, capacity and trust, not technology. Four of the top five (F07, F01, F04, F21) are the same chain seen from different sides — bank data costs money per connected account, Italians expect free, trust is slow to build and fast to lose, and the runway is finite — and the fifth (F15) is the team's capacity to run that chain's mitigations. Technology failures (F05, F23) sit mid-table because the research shows how to prevent them; coverage (F03) is high-probability but survivable if the promise is bounded honestly; the breach (F17) scores low on probability but is in the kill list because its impact is absolute.

---

## 2. Failure modes in detail

### F01 — Open banking data too expensive

| | |
|---|---|
| **Story** | Every provider is sales-led; the only price range we have is €0.10 / €0.30 / €0.60 per connected account-month with minimum invoices of €0 / €500 / €2,000 (UNKNOWN → ASSUMPTION, `unit-economics.md` U9–U10). At €0.30 a free connected user costs ≈ €0.59/month; at €0.45 or above "nothing works" at any paid share (`unit-economics.md` §8.2, HYPOTHESIS). The quote arrives after the architecture is built; the team accepts it. |
| **Probability** | High — Base 35 % (Low 25 / High 50) that the achievable price is > €0.30 with no per-user or inactive-account relief. Residual after mitigation: Medium 15 %. |
| **Impact** | Fatal in combination with a free sync tier; Severe alone (margin). |
| **Early-warning signals** | RFP quotes > €0.30 at 25 k accounts (Phase 2, Gate C C1); minimum invoice > 25 % of AIS cost; provider_cost_per_active_user Base exceeded two months running; free AIS cost per paid subscription > €0.95 (`metrics.md` §5 #13); gross margin per 1,000 MAU < 30 %. |
| **Mitigations** | P: identical RFP to five providers with a 5 k/25 k/100 k ladder, per-user pricing, no charge for accounts not accessed, lite single-institution rate (D-BM-7); non-exclusive ≤ 12-month contract; fallback contract proposed only after provider/legal due diligence. P: free envelope capped at 1 institution ≤ 2 accounts with sync pause after 14 days of inactivity (D-BM-1). D: invoice ingestion into the finance model from the first bill; monthly guardrail review. C: F′ time-boxed Gratis sync for new cohorts; trial-gated shape G if > €0.35; route C (own AISP + CBI Globe direct) as the long-run cost lever (`open-banking-providers.md` D6). |
| **Owner** | CEO (contract) + CFO (guardrail). |
| **Evidence** | `unit-economics.md` §0, §8.1–8.2 (HYPOTHESIS from ASSUMPTION inputs); Enable Banking FAQ on per-account billing and minimum invoice (`EB-1`, FACT); GoCardless free tier closed July 2025 (`PP-AD-01`, FACT) — the free route is gone. |

### F02 — Poor connection UX

| | |
|---|---|
| **Story** | The bank redirect lands on a screen that names "Yapily Connect UAB"; the user has never heard of it and stops. SCA fails on the second bank; the app shows a generic error; the user never comes back. Consent expires after 90 days at one bank and 180 at another with no warning. The number-one complaint in every market (N = 22) becomes Lilleri's too. |
| **Probability** | High — Base 45 % (30–60) that connection completion stays below 60 % per attempt. Residual: Medium 25 %. |
| **Impact** | Severe: TTFV and WOW cannot happen; activation below 30 % makes CAC per connected user unaffordable. |
| **Early-warning signals** | Connection completion < 60 % per attempt or activation < 30 % (`metrics.md` §3.2 #2); connection_failure_rate bank/provider-side > 10 % on any bank-week (§5 #10); `connection_failed{cause: user_abandoned}` > 25 % at the consent explainer; support topic "connection" > 40 % of contacts; consent renewal before expiry < 60 % (§5 #11). |
| **Mitigations** | P: consent explainer that says in Italian who the provider is, that it is read-only, that SCA happens in the bank app, and how long the consent lasts (`consent-model.md` §3; `IT-Y-02` "my bank confirmed it is read-only"); Fabrick enquiry for an Italian-supervised name on the bank screen; per-bank coverage status before the tap; user-present refresh on open (uncapped by law); renewal UX at day 150/170/178 as inbox items, batch "Rinnova tutti". D: per-bank funnel with failure causes; `coverage_unavailable_shown`; weekly review. C: dual provider failover per institution; copy iteration on the explainer; human support for connection failures with an SLA for Plus (`user-pain-points.md` D12). |
| **Owner** | Head of Product (flow, copy) + CTO (failover, causes). |
| **Evidence** | `user-pain-points.md` §1 #1 (N = 22), #3 (N = 11), FACT; CRIF 57.4 % (`NEW-4`, medium); provider name on the consent screen under route A (`open-banking-providers.md` §1.3, FACT); Plaid/YNAB +21 %/+12 % conversion after a provider switch (`US-W3`, vendor claim). |

### F03 — Inconsistent bank coverage

| | |
|---|---|
| **Story** | Current accounts work. Credit cards (Nexi credit, Amex, UniCredit/Mediolanum/Crédit Agricole cards), Satispay, Hype and PayPal do not, or only sometimes. Half the ICP's stack is invisible; the "pairing WOW" needs two institutions and many users have one that connects. Reviews say "manca la carta" and "non supporta Satispay". |
| **Probability** | High — Base 55 % (40–70) that ≥ 1 of Satispay/Hype/credit cards remains unreachable at launch (it is the current state). Residual: it does not go away; the residual risk is of *promising* it: Medium 20 %. |
| **Impact** | Major if the promise is bounded honestly; Severe if the coverage page over-promises or if > 50 % of users cannot reach two institutions. |
| **Early-warning signals** | Share of trial users with ≥ 2 live institutions < 50 % (`metrics.md` §3.2 #5); `coverage_unavailable_shown` on > 40 % of onboardings; "unsupported" support topic > 15 %; fallback (CSV/manual) usage < 20 % of those shown the fallback (nobody takes it); coverage-honesty guardrail G17 > 2 %. |
| **Mitigations** | P: MVP promise limited to current accounts, prepaid IBANs, Revolut/N26 (D8); credit cards recognised from the bank side as settlements; Satispay/PayPal pseudo-accounts with top-ups typed as transfers; CSV/XLSX import of six formats; public "Copertura banche" page per account type with last-checked date; RFP clauses for PayPal/Satispay/Hype/Fineco cards; Fabrick enquiry for Hype. D: fill-rate pilot (Phase 2) and the "coverage unknown" beta cohort; per-bank health. C: fallback WOW for single-institution users (subscriptions + safe-to-spend, J-7); Android notification-listener experiment later for Satispay itemisation (policy risk, `data-sources-feasibility.md` §6). |
| **Owner** | CTO (coverage) + Head of Product (promise and fallbacks). |
| **Evidence** | `open-banking-providers.md` §1.4 and §6 (FACT/UNKNOWN per source); `data-sources-feasibility.md` §10 limitation statements; Spendee IT reviews punishing advertised-but-broken banks (`EU-S-13a`, low-medium). |

### F04 — Users don't trust Lilleri with their accounts

| | |
|---|---|
| **Story** | A foreign provider's name on the bank screen; an app from a company nobody knows asking for every account, three months after the Revolut disclosure incident and the Garante's €12.5 M fine on Poste's apps; a friend says "ma poi chi vede i tuoi dati?". Consent-screen completion stalls at 50 %. Those who connect delete the account the first time a sync fails without explanation. |
| **Probability** | High — Base 35 % (25–50) that trust friction keeps activation and retention below the Low targets. Residual: Medium 15 %. |
| **Impact** | Fatal: trust is priority one and the whole promise depends on connecting. |
| **Early-warning signals** | Consent-screen completion < 70 % of starts (`jobs-to-be-done.md` §7); `trust_page_viewed` followed by abandonment > 30 %; `deletion_requested{reason: distrust}` > 10 % of deletions; Trustpilot − store gap > 1.5 (G9); interview verbatims on "sola lettura" doubts; press framing as "another app that wants your bank password". |
| **Mitigations** | P: the trust set shipped in the MVP — named licensed provider with licence number, read-only wording, SCA at the bank, EU hosting, "I tuoi dati" page, export and deletion in two taps, no money movement, no display/contextual banners, no data sale, no lending (`market-analysis.md` decision 7; `brand-strategy.md` R6–R8); Fabrick as the Italian-supervised option if the foreign name tests badly; candid failure states (never "sync offline"); incident comms before users ask. D: consent funnel; trust-page exits; qualitative tag on deletions; brand measures (`brand-strategy.md` §13). C: creator-led reassurance ("works with my banks, read-only, my bank confirmed"), public status and coverage pages, a visible human support channel. |
| **Owner** | CEO (brand and public posture) + Head of Product (trust surfaces). |
| **Evidence** | `user-pain-points.md` §6 (what scares / what reassures, FACT); Revolut Sep 2026 incident and Garante fine (`IT-W-08`, medium); `IT-Y-02` read-only reassurance (low-medium); competitor rating gap (`competitors-us.md` §4.5, FACT). |

### F05 — AI and reconciliation errors

| | |
|---|---|
| **Story** | The categoriser is confidently wrong on Italian payment types; a bimonthly Hera bill is called monthly; a dentist is "recurring"; a Satispay top-up is "Spesa". Corrections do not stick because the learned model and the user's rules fight. Users stop correcting, the audited ACR flatlines at 70 %, and "non impara mai" ("it never learns") appears in reviews — the Emma failure, replayed. |
| **Probability** | High — Base 40 % (30–55) that production accuracy misses the Base targets for two consecutive months. Residual: Medium 20 %. |
| **Impact** | Severe: the North Star stalls; "cannot trust the numbers" is churn reason #1. |
| **Early-warning signals** | Auto-error rate > 3 % (G2); repeat-correction share > 20 % (`metrics.md` §5 #9); corrections per 100 transactions > 15 at month 1 or not falling by month 3; balance_mismatch_rate > 3 % on any bank; recurring false-regular > 4 %; eval-set regression > 2 pp on a model change; "numeri sbagliati" support topic rising. |
| **Mitigations** | P: deterministic reconciliation before any model (Phase 3); explicit rules always win and are proposed from the first correction; abstain over wrong; confidence gate tuned to auto-error ≤ 2 %; every decision carries a reason and an undo; Italian eval set of 3–5 k rows with repeated merchants; Italian payment-type dictionary; locked attributes so automation never overwrites a user edit. D: weekly audited sample; shadow mode for every new model version; drift alerts on format change. C: raise review routing instead of auto-applying; roll back model versions by flag; batch undo per sync run. |
| **Owner** | Data/ML lead (categorisation) + CTO (reconciliation). |
| **Evidence** | `user-pain-points.md` §1 #5 (N = 10), #20, FACT; `EU-S-20/S-21` (Emma), `EU-S-22` (Snoop); Sure's eval lesson on repeated merchants (`ai-ml-transaction-intelligence.md` §2.2, high); `reconciliation-and-data-model-patterns.md` §9.2 thresholds (HYPOTHESIS). |

### F06 — Support cost explodes

| | |
|---|---|
| **Story** | Every bank-side failure becomes a ticket; the three founders answer e-mails at night; the funded Plus support response promise is missed; Trustpilot fills with "support non risponde". Contacts run at 40 per 1,000 MAU at €8 each (the High case) — a cost line the model did not budget. |
| **Probability** | High — Base 40 % (25–55) that contacts exceed 25 per 1,000 MAU in the first six months. Residual: Medium 20 %. |
| **Impact** | Major: margin and founder time; Severe if it drives the rating gap. |
| **Early-warning signals** | support_contacts_per_1k_MAU > 25 for two months (`metrics.md` §5 #19); contacts per 100 connection failures rising; first-response time > 48 h; deflection < 50 %; "sync" tickets > 30 % of total (`brand-strategy.md` §13 proxy). |
| **Mitigations** | P: every failure state names the bank, the cause and the next retry in Italian; sync report lists what changed; coverage page answers "does my bank work" before the ticket; in-app diagnostics attached to a contact automatically (no screenshots of ledgers needed). D: topic tagging from day one; weekly top-three causes. C: pause acquisition until the top three causes are fixed (`roadmap.md` §7); hire a support lead at the Phase 6 trigger; AI deflection only on known causes, never on billing. |
| **Owner** | Support lead (Head of Product until hired). |
| **Evidence** | `unit-economics.md` U22–U25 (ASSUMPTION ranges); YNAB 70 % deflection (`US-S10`, medium); unresponsive support as a churn reason (`user-pain-points.md` §5, FACT). |

### F07 — Unsustainable free tier

| | |
|---|---|
| **Story** | Storyline 1 above. Free connected users cost more than paying users contribute; the guardrail (≤ €0.95 free AIS cost per paid subscription) is breached and then "paused" for growth; conversion never reaches 120 per 1,000 MAU; F′ is switched on too late and reads as a bait-and-switch. |
| **Probability** | High — Base 45 % (30–60). Residual with the guardrail enforced as a rule: Medium 20 %. |
| **Impact** | Fatal. |
| **Early-warning signals** | Free AIS cost per paid subscription > €0.95 for two months (`metrics.md` §5 #13; D-BM-1); share of free MAU with a live connection > 60 % (U13 High); paid subscriptions per 1,000 MAU < 100 at beta month 6 (post-billing purchase release evidence); trial→paid < 15 %; GM per 1,000 MAU < 30 %. |
| **Mitigations** | P: free envelope 1 institution ≤ 2 accounts, sync pause after 14 days of inactivity, actual provider expiry preserved; pause behaviour and billing relief disclosed/verified without inventing consent dates; proposed 30-day non-renewing Plus preview after implementation; free beta no paid trial/conversion; the F′ fallback designed and copy-tested *before* launch ("i tuoi conti smettono di aggiornarsi, i dati restano tuoi"). D: the three Gate C KPIs reported monthly from beta month 3 (R-BM-2). C: F′ for new cohorts after two misses, funded transition and explicit notice for existing commitments; trial-gated G at the 12-month review if F misses twice more (`business-model.md` §2–3). |
| **Owner** | CFO (guardrail) + Head of Product (envelope and copy). |
| **Evidence** | `business-model.md` §2 model comparison (HYPOTHESIS), §3 decision; `revenue-scenarios.md` §3 (Base never breaks even); European subscription-only exits (`market-analysis.md` T4, FACT); PocketGuard removed its free plan (`US-W27`, medium). |

### F08 — Weak differentiation

| | |
|---|---|
| **Story** | Intesa's XME Banks already aggregates and categorises; Hype Radar does it on paid plans; Revolut links Italian banks. Lilleri's "reconciliation" is invisible until the first month-end, and the store listing reads like every "app gestione spese". Users ask "what does it do that my bank doesn't?" and the answer takes a paragraph. |
| **Probability** | Medium — Base 30 % (20–45). Residual: Low 12 %. |
| **Impact** | Severe: CAC rises, conversion falls, press ignores it. |
| **Early-warning signals** | Phase 1 interviewees cannot restate the differentiator (< 60 % can, `roadmap.md` Phase 1 exit); incumbent depth check shows XME Banks pairs transfers; WOW-session rate < 30 % in beta; D7 no better than generic trackers; store-listing conversion below category median (UNKNOWN benchmark). |
| **Mitigations** | P: positioning on correctness and effort, not aggregation or AI (`market-analysis.md` decision 1; `brand-strategy.md` P1); the incumbent depth check in Phase 1 with the re-scope rule if they already pair; screenshots that show a paired transfer, a settled card and an empty inbox; the two data moats (confirmed Italian transfer pairs; user-confirmed Italian merchant and payment-type dictionary). D: copy tests; WOW verbatims. C: re-scope the differentiator to inbox + learning visibility + portability + consent management (`market-analysis.md` §9 condition 2). |
| **Owner** | Head of Product + Brand lead. |
| **Evidence** | XME Banks and Hype Radar aggregation (`NEW-7`, `WS-01`, FACT medium); depth UNKNOWN; `opportunity-map.md` §3 defensibility scores (ASSUMPTION). |

### F09 — Competitors replicate (banks, Revolut, platforms)

| | |
|---|---|
| **Story** | Intesa ships transfer pairing inside XME Banks for free to 13 million customers; Revolut extends Italian linked accounts with "smart categories"; Hype, now Banca Sella, bundles Radar into the free plan; ChatGPT's personal-finance feature reaches the EU with an AIS partner. Each takes a slice; together they take the top of the funnel. |
| **Probability** | High over three years — Base 50 % (35–65) that at least one incumbent ships a credible reconciliation feature by 2029. Residual: unchanged probability, Major impact instead of Severe if the moats exist. |
| **Impact** | Major–Severe. |
| **Early-warning signals** | Incumbent release notes mentioning "giroconti", "riconcilia", "impara le tue categorie"; Revolut Italy linked-accounts expansion; OpenAI country list adds EU markets (`market-analysis.md` Q7); creator videos comparing Lilleri to a bank feature; CAC rising while activation holds. |
| **Mitigations** | P: bank-independence as a feature (the ledger survives a change of bank; export; no lock-in); the two data moats; Italian semantics; speed of iteration; household layer that no single bank can offer (two consents, two banks). D: quarterly competitor watch (in-app checks, help centres). C: B2B2C option — Lilleri's reconciliation engine inside a partner bank's app (`business-model.md` §7) rather than fighting the bank. |
| **Owner** | CEO. |
| **Evidence** | `market-analysis.md` T6, T10 (FACT/UNKNOWN); ChatGPT personal finance US-only (`US-S170`, high); Hype merger into Banca Sella (`IT-W-04`, low-medium); `market-analysis.md` §8.4. |

### F10 — Compliance blocks features

| | |
|---|---|
| **Story** | Storyline 4: Banca d'Italia (or the provider's own compliance) does not accept an unlicensed B2C recipient; or the Garante treats inferred categories as Art. 9 data; or the offers rail is read as *mediazione creditizia* without OAM registration; or the Play Financial-features declaration demands licence evidence Lilleri cannot produce under route A. Each pauses a feature or the product. |
| **Probability** | Medium — Base 25 % (15–40) for the route-A question alone; Medium 20 % for an Art. 9 or offers-rail block. Residual: Low 10 % with the opinions in hand. |
| **Impact** | Fatal (route A rejected after launch without a fallback); Major otherwise. |
| **Early-warning signals** | Counsel memo negative or hedged; provider KYB refuses a B2C app; Fabrick declines B2C terms; Garante newsletter mentions aggregators; store review asks for a licence; taxonomy review flags labels. |
| **Mitigations** | P: counsel engaged in Phase 1, opinion before any real-data pilot/beta access (D9); Fabrick parallel enquiry (Italian licensee); route B requested in writing as an upgrade; route C budget held as a contingency (€40–150 k, ASSUMPTION); DPIA before beta; taxonomy without special-category labels and a "Privata" flag; no monetised referrals in launch; €0 offers in model (D3 of `regulatory-landscape.md`); licence evidence pack for the stores. D: quarterly OEIL/Garante/Play watch (D10). C: pause the affected feature, not the product; switch to the Italian-supervised licensee. |
| **Owner** | Compliance/DPO + CEO. |
| **Evidence** | `open-banking-providers.md` §2.2 L1–L5 (UNKNOWN); `regulatory-landscape.md` §2 rows 7, 9, 12, 19 (FACT/UNKNOWN); Fabrick "quarta parte" attribution not found on Banca d'Italia pages (`NEW-3` in regulatory, ASSUMPTION). |

### F11 — Poor retention

| | |
|---|---|
| **Story** | Storyline 5: the correct picture is delivered, the inbox is empty, and nothing pulls the user back. Or the opposite: the inbox is full of questions, the user does the work for two months and leaves (the YNAB effect). D30 settles at the finance-app average of 4 % instead of the 10 % the plan needs. |
| **Probability** | High — Base 45 % (30–60) that D30 < 8 % at launch. Residual: Medium 25 %. |
| **Impact** | Severe: paid subscriptions per 1,000 MAU cannot reach 180 on a leaking base. |
| **Early-warning signals** | D30 < 8 % on open-beta cohorts (beta retention release evidence); M3 MAU retention < 30 %; WACU-fresh < 40 % of MAU; inbox items per week > 10 (work) **or** `summary_viewed` < 1 per user-month (absence); consent renewal before expiry < 60 % (connections silently die); insight opens < 35 %. |
| **Mitigations** | P: the amended promise made visible — the sync report, the "why", the monthly "Cosa è successo" card, the consent countdown as a *moment*, recurring and price-increase cards, safe-to-spend; inbox budget ≤ 5 minutes a month; household layer as the first expansion; WOW vs non-WOW cohort instrumentation from day one. D: cohort retention by WOW status and by number of institutions; inbox size and minutes per month watched together. C: single-institution fallback WOW; nudge cadence tuned within the push cap (≤ 3/week) and never for engagement's sake. |
| **Owner** | Head of Product + Growth. |
| **Evidence** | Finance D30 ≈ 4.2 % (Business of Apps) vs 10–15 % cited for fintech (`NEW-M2`, medium-low, sources disagree); YNAB manual-effort churn (`US-S13`); "sense of control" retention (`US-S12`); `jobs-to-be-done.md` §4 AUTOMATE stage. |

### F12 — Weak brand

| | |
|---|---|
| **Story** | "Lilleri" reads as a toy outside Tuscany; the icon disappears among Satispay orange and Revolut black; nobody can spell it a week later; aided awareness never passes 1 %; every euro of marketing buys installs that forget the name. |
| **Probability** | Medium — Base 35 % (20–50) that recall and awareness miss the Low measures. Residual: Medium 20 %. |
| **Impact** | Moderate–Major (slower growth, higher CAC), not fatal. |
| **Early-warning signals** | 7-day spelling-correct recall < 40 %; icon confusion at 60 px > 15 %; aided awareness < 1 % at month 12 (`brand-strategy.md` §13); CAC per registered > €3; branded search volume flat. |
| **Mitigations** | P: identity built for warmth and distinctiveness (paper/ink, non-letter mark), the Tuscan story told once; typography and candour carry seriousness; one tagline; consistency rules. D: Phase 1 recall and confusion tests; brand tracker from launch. C: adjust the mark, never the name mid-flight; invest in content and coverage pages that rank for Italian money questions. |
| **Owner** | Brand lead. |
| **Evidence** | `brand-strategy.md` §1, §9, §11 (HYPOTHESIS); `naming-analysis.md` via brand strategy (name under-signals seriousness, HYPOTHESIS). |

### F13 — Unclear positioning

| | |
|---|---|
| **Story** | Three stories compete inside the company: "the AI money app", "the calm money app", "inbox zero for your finances". The store listing says one, the creators say another, the paywall a third. Plan labels or promised capabilities drift from canonical Gratis/Plus, Famiglia Later and Pro professional reserved. Users cannot place Lilleri between their bank app and a tracker. |
| **Probability** | Medium — Base 30 % (20–45). Residual: Low 10 % with one positioning sentence enforced. |
| **Impact** | Major. |
| **Early-warning signals** | Copy tests fail to produce a consistent restatement; store-listing conversion below median; press describes "a new budgeting app"; internal documents disagree (today: `brand-strategy.md` D7 two paid tiers vs `business-model.md` D-BM-6 three — an existing inconsistency, FACT by inspection). |
| **Mitigations** | P: positioning P1 ("keeps your money correctly accounted for, by itself") as the only brand sentence; P2 as the product narrative; "AI" only as an explanation; a pricing/plan ADR carrying the settled Gratis/Plus ladder and explicit Later capability gates before paywall tests (`roadmap.md` R-8). D: quarterly message audit across store, site, creators, paywall. C: one-page positioning refresh with copy tests. |
| **Owner** | Head of Product + Brand lead. |
| **Evidence** | `brand-strategy.md` §3 (DECISION); `messaging-framework.md`; the formerly conflicting ladder, now resolved in business D-BM-6; future capability/copy drift remains a risk. |

### F14 — Provider shutdown, acquisition or price hike

| | |
|---|---|
| **Story** | The primary provider is acquired (Yapily's own finAPI deal lapsed; Fabrick bought finAPI; Mastercard bought Aiia and shut Spiir), restructures (TrueLayer −25 % staff, Visa −7 %), closes a product (GoCardless Bank Account Data to new customers) or raises prices at renewal. Lilleri has one adapter in production and six weeks of runway on the old contract. |
| **Probability** | Medium — Base 30 % (20–45) over three years for a material event at the primary. Residual: the event probability is unchanged; impact drops to Major with the dual-adapter architecture. |
| **Impact** | Severe without a second adapter; Major with it. |
| **Early-warning signals** | Layoff or funding news; status-page degradation; renewal terms with > 30 % increase; institutions silently dropped from the provider's list; provider's "new sign-ups disabled" page. |
| **Mitigations** | P: provider-agnostic architecture (canonical schema, raw payload retention, adapter per institution, provider-agnostic mock boundary first; second live adapter only after contract/coverage/re-consent evidence, D7); non-exclusive ≤ 12-month contract; the second adapter exercised in production for ≥ 1 institution by expansion release provider-concentration review; Fabrick and Tink lines kept warm. D: quarterly vendor review in the vendor register (DORA-style). C: switch only after verified adapter/contract/capability and re-consent evidence; release timing UNKNOWN; re-consent users with a plain explanation; route C decision re-opened. |
| **Owner** | CTO. |
| **Evidence** | `open-banking-providers.md` §3.1–3.6 (FACT for the corporate events); `market-analysis.md` T3 (FACT); `PP-AD-01` (FACT). |

### F15 — Founder bandwidth and team

| | |
|---|---|
| **Story** | Three founders carry product, engineering, brand, compliance, support, fundraising and the RFP. Phase 3 (XL) takes twice the Base estimate; the eval set is never built because the same person is answering support; a founder burns out in Phase 5; a key person leaves with the only knowledge of the reconciliation engine. |
| **Probability** | High — Base 50 % (35–65) that at least one phase slips by > 50 % for capacity reasons. Residual: Medium 30 %. |
| **Impact** | Severe (time and morale), potentially Fatal via F21. |
| **Early-warning signals** | Phase effort tracking > 1.5× Base; > 3 workstreams in progress per person; support backlog > 48 h; no documented owner for a critical component; ADRs stalled; roadmap re-planned without using the §7 triggers. |
| **Mitigations** | P: scope discipline (the cut orders in `roadmap.md`), the "what not to build" list (`opportunity-map.md` §4), contractors for DPO/legal/design/annotation, hiring triggers tied to gates and caps (D-RS-3), vertical slice before breadth, written runbooks and ADRs as knowledge insurance. D: monthly capacity review against the person-month ranges. C: cut from the bottom of the priority order; extend a phase rather than skip a gate. |
| **Owner** | CEO. |
| **Evidence** | `revenue-scenarios.md` §4 team sizes (ASSUMPTION); `roadmap.md` effort ranges (ASSUMPTION); general startup experience (ASSUMPTION). |

### F16 — App-store rejection or delays

| | |
|---|---|
| **Story** | Apple 3.2.1(viii) ("money management apps should be submitted by the financial institution… must have necessary licensing") is applied to Lilleri; the reviewer asks for a licence Lilleri does not hold; Play's Financial-features declaration requests evidence; the third-party-AI permission step is judged insufficient; launch slips a quarter while creators are already booked. |
| **Probability** | Medium — Base 30 % (20–45) of at least one rejection round; Low 10 % of a lasting block. Residual: Low. |
| **Impact** | Major (delay and sunk marketing), rarely Fatal. |
| **Early-warning signals** | Review questions during TestFlight/internal testing; competitor PFMs removed; policy bundle deadlines (Play 27 Jan 2027 permission changes). |
| **Mitigations** | P: submit from the company developer account with the provider's licence and contract in review notes; settle route A/B before submission; Finance category; explicit AI permission step and purpose strings; Data safety / privacy labels from the real SDK list; in-app deletion; IAP/Play Billing; no ATT; early TestFlight submission in Phase 5 to surface questions. D: policy calendar watch (`regulatory-landscape.md` §5). C: respond with the evidence pack; if blocked, Fabrick (Italian licensee) as the named institution in notes; web PWA as a stop-gap for existing users (OPEN QUESTION). |
| **Owner** | Head of Product + Compliance. |
| **Evidence** | Apple guidelines first-hand (`RL S-32`, FACT); Play declaration (ASSUMPTION/UNKNOWN, `data-sources-feasibility.md` §11); many non-bank PFMs exist on both stores (HYPOTHESIS: manageable). |

### F17 — Data breach or security incident

| | |
|---|---|
| **Story** | A leaked cloud credential, a vendor incident (the LLM vendor, the analytics host, the push provider), or raw descriptions in logs; a Garante notification within 72 hours; the story runs next to Revolut's. For a product whose first priority is trust, one incident is the end. |
| **Probability** | Low–Medium — Base 15 % (8–25) over three years for a reportable incident. Residual: Low 7 %. |
| **Impact** | Fatal. |
| **Early-warning signals** | Pen-test high/critical findings open > 30 days; secrets in logs or repos (scanner hits); vendor DPA without 24-hour breach notice; anomalous access patterns; failed backup/restore drill; key-rotation never exercised. |
| **Mitigations** | P: app-level envelope encryption with KMS-wrapped per-household keys for IBANs, raw descriptions and payloads; Postgres RLS with FORCE and a non-owner app role; passkeys/2FA; no bank credentials ever (PSD2 redirect only); logging redaction; pseudonymised minimal AI payloads; vendor DPAs with ≤ 24 h breach notice; external pen-test before launch; incident runbook and comms templates in Italian. D: secret scanning, access anomaly alerts, quarterly restore drills. C: runbook execution, Garante notification, user communication before users ask (`brand-strategy.md` §12). |
| **Owner** | CTO (security). |
| **Evidence** | `reconciliation-and-data-model-patterns.md` §6–7 (pgcrypto limits FACT; envelope recommendation); `privacy-model.md` §3, §11; Garante fines on OpenAI (€15 M) and Replika (€5 M) (`regulatory-landscape.md` row 10, FACT reported). |

### F18 — PSD3/PSR changes the rules

| | |
|---|---|
| **Story** | The PSR is adopted; renewal SCA moves from the bank to the AISP; permission dashboards appear at the bank; the 4×/24 h cap stays; a 365-day cycle appears in one draft; Level-2 RTS change the API. Lilleri's consent machine, built around 180 days and bank-side SCA, needs rework at the worst moment (Phase 8). Or the opposite: the provider passes new obligations and costs down. |
| **Probability** | Very high that rules change by 2028–29 — Base 60 % (45–75) that the PSR applies within the planning horizon; Medium 20 % that it imposes material rework. |
| **Impact** | Moderate (mostly upside: in-app renewal, better APIs); Major if provider obligations raise prices. |
| **Early-warning signals** | OEIL status change after the 14 Dec 2026 indicative plenary; OJ publication; provider notices of contract changes; EBA consultations on Level-2 RTS. |
| **Mitigations** | P: refresh cadence, renewal flow and consent state machine configurable per bank and provider (D1 of `regulatory-landscape.md`); the renewal step pluggable; no promise of more than 4 unattended refreshes a day. D: quarterly PSR watch (D10); read Council doc 8222/26 when reachable. C: re-plan the consent machine as a Phase 7–8 item when the text is final. |
| **Owner** | Compliance. |
| **Evidence** | `regulatory-landscape.md` §2 rows 2–3, §3 (FACT reported, convergent); 180 vs 365 days UNKNOWN. |

### F19 — Italian willingness to pay too low

| | |
|---|---|
| **Story** | Italians pay €3.99–€9.99 for neobank tiers that come with a card and perks; a PFM at €4.99 that "just shows what my bank already shows" does not clear the bar. The Van Westendorp survey says €2.99; trial→paid lands at 12 %; annual plans are rare. The Target corridor (180 subscriptions per 1,000 MAU) is never reached. |
| **Probability** | High — Base 40 % (25–55) that Italian PFM WTP sits below the Base assumptions. Residual: Medium 25 %. |
| **Impact** | Severe: Gate C C2 fails; launch economics fail; no offer income can be assumed before separate legal/product/trust gates. |
| **Early-warning signals** | Phase 1 survey acceptance of €4.99 < 30 % of ICP respondents; trial→paid < 15 % after two paywall iterations (post-billing purchase release evidence); annual share < 40 %; paywall views with `trigger: second_institution` not converting; interview verbatims "la banca lo fa gratis". |
| **Mitigations** | P: price test €3.99/€4.99/€5.99 in Phase 1 and in beta; depth and automation as the paid value (multi-institution, background refresh, history, forecasts, household); Famiglia as the family-budget annual purchase; clear price-change notice/rights, no lifetime price commitment; no gating of correctness (gating basics is the fastest route to the rating gap). D: monetisation metrics with paired guardrails. C: F′ shape; trial-gated G at the 12-month review; the opt-in offers rail (Phase 7) only after trust metrics hold; B2B2C with a bank that funds the free core. |
| **Owner** | Growth / Monetisation. |
| **Evidence** | `market-analysis.md` §3 (WTP for a PFM in Italy UNKNOWN); Italian price anchors (`user-pain-points.md` §7, FACT low-medium); RevenueCat benchmarks are cross-category (`W-1`); Moneyhub at £1.49 was loved and still closed (`EU-S-07a`). |

### F20 — Second revenue rail erodes trust

| | |
|---|---|
| **Story** | The "Offerte" rail launches to fix the margin; a bank referral appears next to the balance; a creator posts "Lilleri now sells your data"; opt-in is 12 % and NPS of opted-in users drops; the kill switch is pulled, the revenue line is gone, and the brand has a scar. |
| **Probability** | Medium — Base 25 % (15–40). Residual: Low 10 % with D-BM-5 rules enforced. |
| **Impact** | Major (trust and revenue both). |
| **Early-warning signals** | Opt-in < 15 % in the experiment cohort; complaints > 1 per 1,000 offers shown; NPS delta ≤ −5 vs control (kill switch); support topic "privacy" rising; press or creator mentions of "vende i dati". |
| **Mitigations** | P: no display/contextual banners, no data sale; the rail only after beta trust metrics hold; separate revocable consent; visible "Lilleri riceve un compenso" label; never in the inbox, insights or categorisation; no "you should" language; counsel on PSD2 art. 67(2)(f) and OAM/IVASS boundaries before launch; Free and paid see the same rail (no "ad-free" upsell). D: opt-in, opt-out, complaints, NPS delta measured per cohort. C: kill switch at NPS −5; withdraw partners that generate complaints. |
| **Owner** | Head of Product + Compliance. |
| **Evidence** | `business-model.md` §5–6 (DECISION); Snoop sells anonymised data, Moneyhub's "we don't sell your data" loved (`EU-S-22/S-23`, `EU-S-07a`); Finanzguru commission concentration is a comparator, not proof of Lilleri legal/monetisation feasibility (`EU-S-35/S-68`, medium). |

### F21 — Funding gap

| | |
|---|---|
| **Story** | A seed round is sized on an unverified growth/cash path and raised as if the Target scenario were a forecast; beta metrics land between Base and Pessimistic; the bridge does not close; the provider minimum invoice and the DPO retainer are the last bills paid. |
| **Probability** | High — Base 35 % (25–50) that runway ends before renewal/expansion evidence exists. Residual: Medium 20 %. |
| **Impact** | Fatal. |
| **Early-warning signals** | Runway < 9 months without a term sheet; fixed costs > stage cap by 20 %; Gate C KPIs trending to Base or worse at beta month 6; CAC > €3 for two weeks; investor feedback "another budgeting app". |
| **Mitigations** | P: stage budgets as hard caps (D-RS-3); show launch Plus-only Base/downside/Target together, with funding need UNKNOWN until a monthly cash path is modelled (D-RS-1); beta designed to produce the three Gate C numbers early; organic/referral-led growth (no paid UA beyond tests). D: monthly runway review. C: F′ or trial-gated G to fix margin; slow Phase 6 growth spend; B2B2C conversations as a strategic option. |
| **Owner** | CEO + CFO. |
| **Evidence** | `revenue-scenarios.md` §5: funding UNKNOWN; retired unsupported seed estimate. |

### F22 — Market smaller than assumed

| | |
|---|---|
| **Story** | The multi-account optimiser exists in creator audiences (28 k–175 k subscribers per video) but not at scale; the waitlist stalls at 1,500; most sign-ups have one bank; the ceiling for a category leader (0.6–2.4 M registered, HYPOTHESIS) was already optimistic and Lilleri's reachable slice is a tenth of it. |
| **Probability** | Medium — Base 30 % (20–45). Residual: Medium 20 % (it cannot be mitigated, only discovered early). |
| **Impact** | Severe for growth; not fatal if Europe comes earlier. |
| **Early-warning signals** | Waitlist < 2,000 with creator support; < 40 % of sign-ups declaring ≥ 3 institutions; CAC rising month over month at launch; Italian ASO volume for the category below expectations (UNKNOWN today). |
| **Mitigations** | P: Phase 1 survey and the Osservatorio/Banca d'Italia data pulls (`market-analysis.md` Q3–Q5); the single-institution fallback WOW widens the funnel beyond S1. D: waitlist composition; registered→connected by number of institutions. C: earlier Phase 8; household (S3) and partita IVA (S4) segments earlier than planned. |
| **Owner** | Growth. |
| **Evidence** | `market-analysis.md` §3.2 sizing funnel (HYPOTHESIS/UNKNOWN); share of Italians using a PFM UNKNOWN. |

### F23 — Silent-automation incident at scale

| | |
|---|---|
| **Story** | Storyline 3: a threshold change, a provider renumbering a day's batch (the Enable Banking positional-id case), or a dedup rule that drops legitimate identical rows — at launch volume, with no canary, no batch undo and a sync report that nobody reads. |
| **Probability** | Medium — Base 30 % (20–45) of at least one incident affecting > 1 % of users in the first year. Residual: Low 10 % with canaries, shadow mode and batch undo. |
| **Impact** | Severe (trust), recoverable only if detected within hours and undone cleanly. |
| **Early-warning signals** | duplicate_rate or balance_mismatch_rate spike on a release; undo rate > 5 % (G4); `inbox_item_created{item_type: balance_mismatch}` spike; `transaction_corrected{field: link}` spike; support "movimenti spariti" within 24 h of a release. |
| **Mitigations** | P: append-only `ledger_event` with batch undo per sync run; shadow mode for every matcher and model version; canary cohorts and feature flags with kill switches; the 25 fixtures in CI; never positional ids; provider deletions of edited rows become "needs review", never deletes. D: release-level dashboards for §5 #4, #14, #15 and G4 in the first 24 h. C: kill switch; batch undo; incident comms within the same day in Italian ("abbiamo annullato…"). |
| **Owner** | CTO. |
| **Evidence** | `PP-G-83` (positional-id overwrite), `G-84` (silent skip), `G-87` (dedup drops legitimate rows), `G-24` (phantom transfer), FACT high; `reconciliation-and-data-model-patterns.md` §5 (precedents for undo and negative memory). |

---

## 3. Failure chains (how the modes compound)

| Chain | Sequence | Break point (the cheapest place to stop it) |
|---|---|---|
| **The free-tier death spiral** | F01 price high → F07 free tier contribution-negative → F21 runway → late F′ → F04 trust lost on "accounts stopped updating" | Phase 2 RFP with per-user/lite pricing; F′ copy tested before launch |
| **The coverage–WOW–retention chain** | F03 coverage gaps → WOW impossible → F11 low D30 → F19 nobody pays for a half picture | Honest promise + fallback WOW; recruit beta for ≥ 3 reachable institutions |
| **The silent-automation chain** | F05 errors → F23 incident → F04 trust → F06 support → F21 | Audit, shadow mode, canaries, batch undo (all Phase 4–6 deliverables) |
| **The legal chain** | F10 route A questioned → launch pause → F21 | Counsel opinion before production; Fabrick line |
| **The bandwidth chain** | F15 overload → eval set skipped → F05 → F23 | Hiring triggers at gates; scope cut orders |
| **The positioning chain** | F13 drift → F08 looks like a tracker → F12 brand ignored → F22 looks like a small market | One positioning sentence; plan-ladder ADR; copy tests |

---

## 4. Tripwire dashboard (the early-warning signals in one place)

| Signal | Threshold | Metric ref. | Failure modes | Phase |
|---|---|---|---|---|
| RFP price per account-month | > €0.30 (> €0.35 = shape change) | `metrics.md` §5 #13; Gate C C1 | F01, F07 | 2 |
| Counsel opinion | negative / hedged | Gate D D1 | F10 | 2 |
| Fill-rate pilot: banks with no stable id and no pending | ≥ 3 of top-10 | Gate D D3 | F03, F05 | 2 |
| Connection completion per attempt | < 60 % | §3.2 #2 | F02, F04 | 3–5 |
| Consent-screen completion | < 70 % | `jobs-to-be-done.md` §7 | F04 | 3–5 |
| Users with ≥ 2 live institutions (trial) | < 50 % | §3.2 #5 | F03 | 5 |
| Audited ACR at beta month 3 | < 70 % | §2.6 | F05 | 5 |
| Auto-applied error rate | > 3 % | G2 | F05, F23 | 4–6 |
| Repeat-correction share | > 20 % | §5 #9 | F05 | 4–5 |
| Balance-mismatch rate | > 3 % on any bank | §5 #15 | F05, F23 | 3–6 |
| Undo rate | > 5 % | G4 | F23 | 6 |
| Silent-skip incidents / phantom legs | > 0 | §5 #14, G18 | F23, F04 | 3–8 |
| Support contacts per 1,000 MAU | > 25 for 2 months | §5 #19 | F06 | 5–6 |
| D30 (open beta) | < 8 % | §3.2 #4 | F11 | 5–6 |
| WOW-session rate | < 30 % | §3.2 #1 | F08, F11, F03 | 5 |
| Trial → paid | < 15 % after two iterations | §3.2 #10 | F19, F07 | 5 |
| Paid subscriptions per 1,000 MAU | < 100 at month 6 | post-billing purchase release evidence | F07, F19 | 5–6 |
| Free AIS cost per paid subscription | > €0.95 for 2 months | §5 #13 | F07, F01 | 5–7 |
| Trustpilot − store gap | > 1.5 | G9 | F04, F06 | 6 |
| CAC per registered | > €3 for 2 weeks | `go-to-market.md` §6 | F12, F22, F21 | 6 |
| Runway | < 9 months without a term sheet | — | F21 | 5–7 |
| Offers-rail NPS delta | ≤ −5 | G16 | F20 | 7 |
| Provider news (layoffs, acquisition, closure, price +30 %) | any | vendor register | F14 | any |
| Incumbent ships pairing/learning | any | competitor watch | F09, F08 | any |
| Phase effort vs Base | > 1.5× | `roadmap.md` §1.1 | F15 | any |

---

## 5. Kill criteria (DECISION proposed: when to stop or pivot rather than push)

| Condition | Decision |
|---|---|
| Counsel concludes that no route (A with any provider incl. Fabrick, B, or C within budget) allows an Italian B2C recipient to receive AIS data lawfully | Stop the consumer product; consider B2B2C with a licensed partner |
| RFP floor > €0.45 per account-month at 25 k accounts from every provider **and** Phase 1 WTP acceptance < 30 % | Do not launch a free sync tier; relaunch the plan as trial-gated (G) or stop |
| Audited ACR < 70 % **and** auto-error > 3 % for three consecutive beta months despite raising review routing | Do not launch; return to Phase 3–4 with a reduced bank list |
| Gate F: F2 (ACR) and F6 (conversion) both miss their Low values in two consecutive beta cycles | Stop the Italian consumer launch; preserve the ledger/reconciliation engine as a B2B asset |
| A trust incident (silent automation, breach) with public coverage before launch | Delay launch; publish the post-mortem; fix; re-run Gate F |
| Pessimistic economics (AIS €0.45, 60 subscriptions per 1,000 MAU) confirmed by measured data at launch + 6 months | Do not fund past the next quarter (`revenue-scenarios.md` §6) |

---

## 6. What the 2029 team would wish the 2026 team had done (checklist derived from the modes)

1. Asked counsel the route-A question in writing in the first month, not after launch (F10).
2. Sent the RFP with per-user and inactive-account pricing to five providers before designing the free tier (F01, F07).
3. Run the fill-rate pilot on their own accounts before freezing the identity strategy (F03, F05).
4. Built batch undo, shadow mode and canaries before the first growth spike (F23).
5. Tested the F′ fallback copy with users while nobody needed it (F07, F04).
6. Measured the audited North Star, not the observed one (F05).
7. Recruited the beta for three reachable institutions per user and told single-bank users the truth (F03, F11).
8. Settled the plan ladder and the one positioning sentence before the paywall existed (F13, F19).
9. Kept the second provider adapter alive in production for at least one bank (F14).
10. Hired support before the launch press, not after the first one-star review (F06).

---

## Decisions / Recommendations

| ID | Decision / recommendation | Label |
|---|---|---|
| PM-1 | Adopt the 23 failure modes with their owners as the standing risk register; review at every gate and whenever a tripwire fires | DECISION (proposed) |
| PM-2 | Adopt the tripwire dashboard (§4) as a view of the metrics dashboard, owned by the Head of Product, with the thresholds versioned alongside `metrics.json` | DECISION (proposed) |
| PM-3 | Adopt the kill criteria (§5) as pre-committed decisions; changing them requires all three founders | DECISION (proposed) |
| PM-4 | The highest-scoring modes that a product or contract deliverable can prevent (F07, F01, F04, F03) each get a named preventive deliverable in Phases 1–2 of `roadmap.md` (F′ copy test, RFP pricing clauses, trust set in the MVP, fill-rate pilot); F15 and F21 are governed by the fixed-cost caps and hiring triggers of `revenue-scenarios.md` D-RS-3 and `roadmap.md` §1.2 | DECISION (proposed) |
| PM-5 | Re-run this pre-mortem at Gate E (before real users) and at Gate G (12-month review), re-estimating probabilities with measured data | RECOMMENDATION |
| PM-6 | Every incident post-mortem must map to a failure mode here or add a new one (F24+), so the register learns | RECOMMENDATION |
| PM-7 | Preserve canonical Gratis/Plus in the pricing/plan ADR; keep Famiglia Later and Pro professional reserved; only delivered capabilities appear in paywall | RECOMMENDATION |

## Open questions

| # | Question | Failure modes | How to resolve | Owner / phase |
|---|---|---|---|---|
| 1 | What is Banca d'Italia's actual position on an unlicensed B2C recipient under a foreign or Italian AISP licence? | F10 | Written counsel opinion; Canale Fintech query; Fabrick compliance text | CEO, Phase 1–2 |
| 2 | Will any provider quote per-user or inactive-account pricing to a pre-seed B2C customer? | F01, F07 | RFP answers | CTO, Phase 2 |
| 3 | Does the foreign provider name on the bank's consent screen measurably reduce completion vs an Italian-supervised name? | F02, F04 | Prototype test with both names in Phase 1; A/B at beta if both providers are contracted | Head of Product, Phase 1 / 5 |
| 4 | Finance-app D30 for Italian users with a connected account: 4 % (category average) or 10–15 % (fintech/banking)? Sources disagree by category (`NEW-M2`) | F11 | Beta cohorts; purchase of a category cut from AppsFlyer/Adjust if affordable | Growth, Phase 5 |
| 5 | Real Italian WTP for a PFM (UNKNOWN in every research pass) | F19 | Phase 1 survey; beta price tests | Growth, Phase 1 / 5 |
| 6 | Do XME Banks or Hype Radar already pair transfers or learn per user? | F08, F09 | Hands-on checks with test accounts | Head of Product, Phase 1 |
| 7 | How many of the top-10 banks return stable ids and pending rows through the chosen providers? | F03, F05, F23 | Fill-rate pilot | CTO, Phase 2 |
| 8 | What is the incumbents' support-contact rate per connection failure (benchmark for F06)? | F06 | Ask providers; estimate from review volumes | Support lead, Phase 5 |
| 9 | What does the final PSR text say on the AIS SCA cycle (180 vs 365 days) and the 4×/24 h cap? | F18 | Council doc 8222/26; OEIL after 14 Dec 2026 | Compliance, ongoing |
| 10 | Is the weekly audit feasible under the beta consent, and at what sample size per bank? | F05 | DPO memo; statistical design | DPO + Data/ML, Phase 4 |
| 11 | Would a B2B2C deal with an Italian bank be a credible fallback for F07/F21, and what would it cost the brand? | F07, F21, F09 | Two exploratory conversations in Phase 7, no commitment | CEO, Phase 7 |

## Review log

| Reviewer | Finding | Resolution |
|---|---|---|
| Investor/CFO (major) | Funding story and mitigations reused retired seed/ARPPU model and required offer income | Funding UNKNOWN; Plus-only zero-offers launch, Base negative and Target stage losses preserved |
| Fintech/privacy (blocker) | “Own accounts”/licence transfer/dual consent implied real access allowed before legal clearance | Staged mock/sandbox/pilot boundary; written route, provider and privacy/security gates |
| Brand/PM (major) | F13 still treated resolved plan naming as open | Canonical Gratis/Plus; Famiglia Later, Pro reserved; price/demand questions remain |
| Consumer (major) | Mitigations committed lifetime prices,12-month grandfathering and blanket no-ad promise | Notice/funded transitions; non-renewing preview; no-banner/no-data-sale policy |
| Data (major) | Subjective risk-score ranking could be read as calibrated probability or independent compound risk | Explicit elicited judgements, correlated risks and no implied residual-risk verification |

## Sources

All carried-over claims verified on 2026-10-02 by the input documents; IDs resolve in their Sources sections. "Snippet" = search-engine summary only.

### Input documents (this repository)

| Document | Used for |
|---|---|
| `docs/research/market-analysis.md` | §3 sizing (UNKNOWNs), §5 trends T3, T4, T6, T8, T10, §8.4 counter-arguments, §9 Gate A, §11 open questions |
| `docs/research/user-pain-points.md` | §1 ranked pain points (#1–#13), §5 churn, §6 trust, §7 WTP, D1–D13 |
| `docs/research/opportunity-map.md` | §1 summary, §3 defensibility, §4 what not to build |
| `docs/research/open-banking-providers.md` | §1.4 coverage, §2 licensing routes and L1–L5, §3 provider risks, §5.5 decisions, §6 Gate B, Q1–Q12 |
| `docs/research/data-sources-feasibility.md` | §0 matrix, §6 notification listener, §10–11 limits and store rules |
| `docs/product/personas.md` | P1–P4 trust thresholds and WTP; coverage risk by persona (§7) |
| `docs/product/jobs-to-be-done.md` | §5 WOW, §6 TRUST events and killers, §7 targets, J-7 fallback WOW |
| `docs/compliance/regulatory-landscape.md` | §2 master table rows 2–3, 6–12, 18–20; §3 not-law list; §5 calendar; OQ1–OQ13 |
| `docs/compliance/privacy-model.md` | §3 encryption classes, §11 incident runbook, D2, D6 |
| `docs/compliance/consent-model.md` | §3 onboarding, §5 renewal timeline |
| `docs/business/business-model.md` | §1 fixed findings, §2 model comparison, §3 D-BM-1 guardrail and F′, §5–6 offers rules |
| `docs/business/unit-economics.md` | U9–U13, U22–U31; §5–§9 margins, sensitivity, break-even |
| `docs/business/revenue-scenarios.md` | §3 scale P&L, §4 team, §6 Gate C and funding implication |
| `docs/business/go-to-market.md` | §3 channels and CAC, §4 beta, §6 stop rules, §8 dashboard |
| `docs/brand/brand-strategy.md` | §1, §9, §10 anti-patterns, §12 guardrails, §13 measures, D7 |
| `docs/research/raw/ai-ml-transaction-intelligence.md` | §2.2 eval lesson, §5.6 prompt injection, §6.2 metrics, §7.2 cost |
| `docs/research/raw/reconciliation-and-data-model-patterns.md` | §1.2–1.3 id instability, §5 audit/undo, §6–7 isolation and encryption, §9.3 fixtures |
| `docs/product/metrics.md`, `docs/product/roadmap.md` | Signal thresholds; phase placement |

### Key external sources carried over

| ID | Source | URL | Date | Reliability | Used for |
|---|---|---|---|---|---|
| PP-G-24 / G-83 / G-84 / G-87 | Actual Budget #3485, #8701, #9063, #8221 | https://github.com/actualbudget/actual/issues/3485 ; https://github.com/actualbudget/actual/issues/8701 ; https://github.com/actualbudget/actual/issues/9063 ; https://github.com/actualbudget/actual/issues/8221 | 2024–2026 | high | F05, F23 |
| PP-AD-01 | Actual Budget docs: GoCardless Bank Account Data closed to new accounts | https://raw.githubusercontent.com/actualbudget/actual/master/packages/docs/docs/advanced/bank-sync/gocardless.md | 2026-10-02 | high | F01, F14 |
| EB-1 | Enable Banking FAQ (per-account billing, minimum invoice) | https://enablebanking.com/docs/faq/ | 2026-10-02 (mirror/snippet) | high | F01 |
| B-#12 | Enable Banking Italy market page (card accounts not exposed at UniCredit/Mediolanum/Crédit Agricole) | https://enablebanking.com/docs/markets/it/ | 2026-10-02 (snippet) | high | F03 |
| A-#29 | Satispay open-banking portal (no aggregator listing found) | https://openbanking.satispay.com/ | 2026-10-02 | high (portal exists) / UNKNOWN (coverage) | F03 |
| NEW-4 (market) | CRIF 57.4 % connection success | https://www.pagamentidigitali.it/digital-banking/open-banking-cresce-la-fiducia-in-italia-nel-2025-oltre-la-meta-dei-conti-viene-collegata-con-successo/ | 2025-10 | medium | F02 |
| IT-W-08 | Italian press digests (Revolut data-disclosure incident Sep 2026; Garante €12.5 M fine on Poste apps Apr 2026) | https://github.com/p1va/news-in-brief | 2026 | medium (headlines) | F04, F17 |
| IT-Y-02 | Giuseppe Castagna — "Il metodo con cui traccio i miei soldi" | https://www.youtube.com/watch?v=kJNxDIcJOac | 2025-12-26 | low-medium | F02, F04 |
| EU-S-20 / S-21 / S-22 | Emma Trustpilot; Emma learning help; Snoop complaints | https://uk.trustpilot.com/review/emma-app.com ; https://help.emma-app.com/en/article/change-a-transaction-category-iipyy2/ ; https://www.trustpilot.com/review/snoop.app?page=3 | n/d | low-medium / high / low | F05 |
| EU-S-13a / S-38 / S-11 | Spendee IT reviews; Wallet Trustpilot; Plum IT App Store | https://apps.apple.com/it/app/635861140?see-all=reviews&platform=iphone ; https://www.trustpilot.com/review/budgetbakers.com ; https://apps.apple.com/it/app/plum-risparmi-e-investimenti/id1456139507 | 2025–26 | low-medium / medium | F02, F03, F06 |
| EU-S-08 / S-85 | Moneyhub closure; Spiir shutdown | https://moneyhubhelp.zendesk.com/hc/en-gb/articles/48275693667217-Moneyhub-App-Closure-and-Your-Account-Options ; https://mobilpuls.dk/artikel/mastercard-lukker-spiir-8-juni-2026 | 2026 | high / medium | F07, F14 |
| EU-S-68 / S-35 | Finanzguru scale and commission model | https://www.aktiencheck.de/news/Artikel-3_Millionen_Nutzer_Wie_Finanzguru_Konkurrenz_abhaengt-19361555 ; https://www.check-app.de/2026/08/09/finanzguru-womit-verdient-die-app-eigentlich-geld-und-was-bekommt-sie-dafuer-von-mir/ | 2026 | medium-high / medium | F20 |
| EU-S-07a | Moneyhub £1.49 value praise | https://www.householdmoneysaving.com/moneyhub-review/ | n/d | low | F19 |
| EU-S-45 | Cleo FTC $17 M settlement | https://www.hunton.com/privacy-and-cybersecurity-law-blog/ftc-reaches-17-million-settlement-with-cash-advance-company-cleo-ai | 2025-03 | high | F20 |
| US-S12 / S13 | YNAB Trustpilot (control); Penny Hoarder (manual effort) | https://www.trustpilot.com/review/ynab.com ; https://www.thepennyhoarder.com/budgeting/ynab-review/ | 2026 | medium / medium-low | F11 |
| US-W27 | PocketGuard free plan removed | https://clark.com/personal-finance-credit/budgeting-saving/pocketguard/ | 2026 | medium | F07 |
| US-W3 | Plaid customer story on YNAB | https://plaid.com/en-gb/customer-stories/ynab/ | 2025 | high (vendor) | F02 |
| US-S170 | TechCrunch: ChatGPT personal finance (US only) | https://techcrunch.com/2026/05/15/openai-launches-chatgpt-for-personal-finance-will-let-you-connect-bank-accounts/ | 2026-05-15 | high | F09 |
| NEW-7 (market) / WS-01 | Intesa XME Banks press release; Hype Radar support page | https://group.intesasanpaolo.com/it/newsroom/comunicati-stampa/2020/02/intesa-sanpaolo-presenta-xme-banks-per-la-gestione-di-conti-corr ; https://support.hype.it/privati/articles/radar-come-monitorare-entrate-uscite-e-piani-risparmio-dei-tuoi-conti | 2020 / n/d | medium-high / high (snippets) | F08, F09 |
| IT-W-04 | Neobank dataset: Hype merger into Banca Sella | https://github.com/andreolf/neobankbeat | 2026-09-11 | low-medium | F09 |
| A-#64 / A-#180 / A-#108 | TrueLayer layoffs; Visa layoffs; Yapily/Adyen and reduced losses | https://www.finextra.com/newsarticle/45072/truelayer-lays-off-25-of-staff-in-a-single-day ; https://www.cnbc.com/2026/07/28/visa-is-cutting-7percent-of-employees-in-efficiency-push-as-ai-reshapes-work.html ; https://tech.eu/2025/02/03/yapily-inks-deal-with-adyen-says-losses-significantly-reduced/ | 2025–2026 | high / high / medium | F14 |
| B-#1 | Fabrick Pass | https://www.fabrick.com/it/fabrick-pass-servizi-as-a-service | 2026-10-02 | high (self) | F10, F14 |
| A-#11 | Banca d'Italia FAQ Istituti di pagamento | https://www.bancaditalia.it/compiti/vigilanza/accesso-mercato/istituti-pagamento/faq-istituti-pagamento/index.html | 2026-10-02 (snippet) | high | F10 |
| A-#152 | OEIL 2023/0209(COD) (PSR) | https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2023%2F0209%28COD%29 | 2026-10-02 | high | F18 |
| RL S-32 | Apple App Review Guidelines (3.2.1(viii)) | https://developer.apple.com/app-store/review/guidelines/ | 2026-06-08 (first-hand) | high | F16 |
| NEW-1 (regulatory) | Google Play policy announcement 15 Jul 2026 | https://support.google.com/googleplay/android-developer/answer/17134731?hl=en | 2026-07-15 | medium (snippet) | F16 |
| RL S-29 (regulatory row 10) | Garante decisions: OpenAI €15 M (docweb 10085432); Luka/Replika €5 M (10130115) | https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/10085432 ; https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/10130115 | 2024–2025 | high (not fetched; reported) | F17 |
| W-1 | RevenueCat State of Subscription Apps 2026 | https://www.revenuecat.com/state-of-subscription-apps | 2026-10-02 | medium | F19 |

### New sources from WebSearch on 2026-10-02 (snippets only)

| ID | Source | URL | Published | Reliability | Used for |
|---|---|---|---|---|---|
| NEW-M1 | Gary Klein, "Performing a Project Premortem", Harvard Business Review 85(9), Sep 2007 (PDF mirror) | http://homepages.se.edu/cvonbergen/files/2013/01/Performing-a-Project-Premortem.pdf | 2007-09 | medium (mirror of a known article; search summary) | Method |
| NEW-M2 | Business of Apps finance benchmarks (D30 ≈ 4.2 %); third-party roll-ups citing Adjust 2026 (2 %) and fintech 10–15 % | https://www.businessofapps.com/data/finance-app-benchmarks/ ; https://semnexus.com/day-1-day-7-day-30-retention-benchmarks-app-category-2026 | 2026 | medium-low (sources disagree) | F11 |

End of document.
