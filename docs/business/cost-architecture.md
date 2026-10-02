# Lilleri cost architecture — fixed / variable / step costs, drivers, unit costs, alerts, cost-control rules

**Project:** LILLERI (consumer PFM, Italy-first then Europe; TypeScript monorepo: React Native + Expo, Next.js, Node, PostgreSQL, Redis, workers, AI provider abstraction, OpenTelemetry)
**Document / review date:** 2026-10-02. Vendor terms are inherited research; this pass checks consistency and arithmetic, not current vendor applicability.
**Inputs:** `business-and-cost-inputs.md` (R-BC §4–§11, §14), `build-vs-buy-and-vendors.md` (R-BB), `ai-ml-transaction-intelligence.md` (R-AI), `open-banking-providers-a/b.md` (R-OBA/R-OBB), `user-pain-points.md` (R-PP); decisions in `business-model.md`, `unit-economics.md`, `revenue-scenarios.md`.
**Conventions:** EUR excl. VAT; USD at 1.17 (ASSUMPTION); vendor list prices are FACT where the raw research read them (cited), volumes are ASSUMPTIONS; all per-user outputs are HYPOTHESES.
**Label key:** FACT · ASSUMPTION · HYPOTHESIS · DECISION · OPEN QUESTION · UNKNOWN.

---

## 0. Summary

- Lilleri's cost base has one dominant variable line — **bank data (AIS) per connected account per month** — which is 80–85 % of per-user COGS at Base and is UNKNOWN until the RFP; everything else (AI, compute, storage, notifications, analytics, auth, OCR, support) is cheap per user and mostly free-tier until ≈ 10 k MAU (FACT prices, R-BB §0).
- Launch Base costs (HYPOTHESIS): €0.05 one-off onboarding, €1.07 per Plus member-month, €0.59 connected Gratis / €0.077 unconnected Gratis MAU; Plus-only blended delivery cost €0.4214/MAU before AIS minimum. Proposed 30-day non-renewing Plus preview costs ~€1.12 including onboarding, with full direct delivery; beta charges nobody. Later chat/OCR/household volume is zero at launch.
- Fixed costs are people: €15 k / €40 k / €120 k / €500 k per month at 1 k / 10 k / 100 k / 1 M MAU (Base; Low/High in §2); step costs are the AIS minimum invoice, database and cache tiers, analytics/observability tiers, store/EAS plans and — if chosen — own AISP registration (€40–150 k one-off).
- **Cost-control design rules (DECISION):** sync only accounts of active users; cap free accounts; backfill through batch APIs with cached prefixes; resolve 75–85 % of rows without an LLM; never send a string to an external model or logo API twice; keep payloads out of push; egress through zero-egress storage; sample observability; budget alerts on the six drivers in §5.

---

**Review date:** 2026-10-02. **Evidence:** external claims and URLs below are inherited from the research; this review rechecks document consistency and arithmetic, not live vendor terms or legal clearance. Source verification dates belong to the cited research. FACT labels there retain the original limitations. All prices, conversion, usage, costs and projections proposed here are ASSUMPTIONS or HYPOTHESES; DECISION means a reversible internal planning choice.

**Delivery boundary (DECISION):** local mock → official sandbox → legally cleared, contracted, consented real-data beta → store launch → later capabilities. Requirements and budgets do not prove implementation. No real-bank keys, bank credentials, purchase, contract, counsel opinion or store billing are obtained by these documents.

## 1. Cost taxonomy: FIXED / VARIABLE / STEP

| Type | Definition | Lilleri lines | Behaviour |
|---|---|---|---|
| **FIXED** | Does not move with users in the month | Team, legal/DPO/compliance, insurance, accounting, store programmes, domains, tooling seats, office | Grows in steps with hiring |
| **VARIABLE** | Moves with users, accounts, transactions or events | AIS per account, AI tokens, embeddings, OCR, egress, email, push (≈ 0), analytics events, auth MAU, support contacts, payment fees, referral rewards | Linear above free tiers |
| **STEP** | Jumps at thresholds | AIS minimum invoice; Postgres/Redis instance sizes; PostHog/Sentry/Grafana/Resend plan tiers; EAS plan; RevenueCat 1 % above $2.5 k MTR; Apple 26 % above $1 M proceeds; support seats; own-AISP registration | Plan the thresholds; avoid crossing them early |

---

## 2. Fixed costs by stage (monthly; ASSUMPTION ranges)

| Line | 1 k MAU (closed beta) L / B / H | 10 k MAU (launch) L / B / H | 100 k MAU L / B / H | 1 M MAU L / B / H | Notes / sources |
|---|---|---|---|---|---|
| Team (founders + employees, fully loaded) | 3 / 6 / 15 k | 12 / 28 / 50 k | 50 / 85 / 140 k | 220 / 330 / 600 k | Italian loaded cost €5–7 k mid, €8–11 k senior (ASSUMPTION); team sizes 2–4 / 3–7 / 7–18 / 25–65 |
| Legal, DPO, compliance, DPIA, audits | 1 / 2.5 / 5 k | 1.5 / 3 / 6 k | 3 / 6 / 12 k | 10 / 25 / 50 k | External DPO €150–600/mo (ASSUMPTION, R-BB §16); counsel on licence route (P0) |
| Own-AISP registration (if pursued, amortised over 36 months) + PII insurance + eIDAS certs + compliance officer | 0 | 0 | 0 / 3 / 8 k | 3 / 10 / 20 k | One-off €40 k / €80 k / €150 k (UNKNOWN → ASSUMPTION, R-BC §14 input 49); PII per EBA/GL/2017/08 UNKNOWN (R-OBB §15.2) |
| AIS minimum (direct-cost step, excluded from fixed budget totals) | excluded | excluded | excluded | excluded | U10 direct cost = max(variable AIS, minimum); add platform fee only if the contract explicitly makes it additive |
| Infra floor (DB, cache, hosting, object storage, CI) | 0.1 / 0.3 / 0.8 k | 0.4 / 1 / 2.5 k | 2 / 4 / 10 k | 15 / 30 / 60 k | R-BB §0; Neon/Fly/Hetzner/R2 prices (FACT, R-BC §6) |
| Tooling and seats (Sentry, PostHog, Grafana, Resend, EAS, iubenda, RevenueCat, support tool, GitHub) | 0.1 / 0.4 / 1 k | 0.3 / 1 / 2.5 k | 1 / 3 / 6 k | 5 / 15 / 30 k | Free tiers at 1 k; EAS Starter $19, Production ≈ $99 (ASSUMPTION); PostHog ≈ $325/mo at 100 k users (FACT tiers, R-BB §5) |
| Stores and domains | 0.05 / 0.05 / 0.1 k | same | same | same | Apple $99/yr (FACT), Google $25 once (ASSUMPTION) |
| Support (seats + outsourced agents, beyond per-contact variable) | 0 / 0 / 0.5 k | 0.5 / 1.5 / 3 k | 2 / 4 / 8 k | 10 / 20 / 40 k | Crisp free / Intercom EU (ASSUMPTION prices, R-BB §8) |
| Marketing (fixed envelope; variable CAC in `go-to-market.md`) | 0.5 / 1.5 / 3 k | 1 / 3 / 8 k | 5 / 10 / 20 k | 30 / 60 / 100 k | |
| Insurance (cyber, D&O), accounting, G&A, office | 0.5 / 1 / 2 k | 1 / 2 / 4 k | 3 / 6 / 12 k | 15 / 40 / 80 k | |
| Contractors/design (beta) | 2 / 3 / 5 k | 1 / 2 / 4 k | 2 / 3 / 6 k | 5 / 10 / 20 k | |
| **Fixed budget envelope (not sum/quote)** | **8 / 15 / 30 k** | **20 / 40 / 70 k** | **70 / 120 / 200 k** | **300 / 500 / 900 k** | Used by `revenue-scenarios.md`; these are staffing/budget envelopes, not reconciled line-item totals |

Allocation rule (DECISION): fixed infra/tooling covers reserved capacity and seats; per-MAU infra/SaaS is marginal usage above that capacity. Reconcile invoices so the same hosted database, support labour, AIS minimum or SaaS seat is not in both. Stage budget envelopes are ASSUMPTIONS, not arithmetic totals of independent ranges.

Hiring rule (DECISION D-CA-1): no hire takes fixed costs above the stage Base until Gate C conditions C1 and C2 are measured inside thresholds (`revenue-scenarios.md` §6).

---

## 3. Variable and step cost drivers (unit prices FACT unless marked; volumes ASSUMPTION)

| Driver | Unit price (vendor, verified 2026-10-02) | Volume assumption | Cost per MAU-month (L / B / H) | Type | Notes |
|---|---|---|---|---|---|
| **Open banking (AIS)** | €0.10 / 0.30 / 0.60 per connected account-month (UNKNOWN → ASSUMPTION); minimum invoice €0 / 500 / 2,000 | Paid 2–4.5 accounts; free 1.3–2.0 (cap 2); only accounts accessed in the month (HYPOTHESIS, Enable Banking wording) | Free connected 0.13 / 0.48 / 1.20; paid member 0.20 / 0.90 / 2.70 | VARIABLE + STEP | The lever; see §6 rules 1–4 |
| **Enrichment vendor** | UNKNOWN; budget €0 / 0.05 / 0.20 per account if bought | Not bought (DECISION to build, R-BB §3) | 0 / 0 / 0.20 | VARIABLE | Bake-off only on the residual |
| **AI — categorisation (T4 small LLM)** | GPT-5.4 nano $0.20/$1.25; Gemini 3.1 Flash-Lite $0.25/$1.50; Mistral Small 4 $0.15/$0.60 (EU endpoint 1.1×, no Batch); Haiku 4.5 $1/$5 (batch −50 %, cache read $0.10, cacheable prefix ≥ 4,096 tokens) — FACT (R-AI §2.4, §5.3) | 80–150 new tx/user-month; 15–25 % reach the LLM at steady state; 25 items per call | 0.005 / 0.01 / 0.02 | VARIABLE | $0.03–0.10 per 1,000 tx blended |
| **AI — frontier residual (T5)** | Sonnet 5.5 $2/$10; Opus 5.5 $4/$20 (FACT) | 2–5 % of rows | 0.001 / 0.003 / 0.01 | VARIABLE | — |
| **AI — assistant/insights (Later, zero launch volume)** | Sonnet 5.5 $2/$10 (FACT) | ≈ 20 calls × 3 k tokens per member-month | 0.05 / 0.10 / 0.25 per advanced-feature user (Later) | VARIABLE | Quota per plan; cached system prefix |
| **AI — onboarding backfill** | Batch −50 % at Anthropic/OpenAI/Gemini/Mistral-global (FACT) | 300–450 tx (90 days) per new connected user; 1.5–4 k rows if 12–24 months available | €0.01 / 0.03 / 0.10 per new user (frontier on all rows would be €0.3–1) | VARIABLE (one-off) | Always Batch; never frontier for backfill |
| **Embeddings** | OpenAI 3-small $0.02/M; Gemini $0.15/M; Voyage $0.02–0.12/M; self-hosted e5-small ≈ $0 (FACT/ASSUMPTION) | 10–20 tokens per tx | < €0.001 | VARIABLE | pgvector storage is the real cost |
| **Receipt OCR** | LLM vision ≈ $0.001–0.005 per receipt; Google Document AI Expense $0.10/doc; Mindee 6,000-credit minimum (FACT) | 5–15 % of later advanced-feature users scan 5–20 receipts | 0.001 / 0.01 / 0.30 per advanced-feature user (Later) | VARIABLE (+STEP if Mindee) | LLM vision first (R-BB §4) |
| **Compute + DB + cache + storage** | Neon Launch $0.106/CU-h, $0.35/GB-mo; Fly shared-1x 1 GB fra $7.73; Hetzner CX23 €5.49 (if orderable) / CPX22 €19.49; Upstash $0.20/100 k commands; R2 $0.015/GB-mo, zero egress (FACT, R-BC §6) | ≈ 1–2 MB per 1,000 tx incl. indexes; 100–300 API calls/MAU-month; 20–60 worker jobs/MAU-month | 0.013 / 0.034 / 0.10 | VARIABLE + STEP (instance sizes) | $15 / 40 / 120 per 1,000 MAU (R-BC §14 input 34) |
| **Bandwidth / egress** | R2 $0; Fly €0.02/GB; Railway $0.05/GB; AWS/GCP $0.09–0.12/GB (FACT) | 20–100 MB/MAU-month (logos cached, JSON compressed) | 0.0004 / 0.002 / 0.01 | VARIABLE | Serve images from R2/CDN |
| **Redis** | Upstash Free 500 k commands; PAYG $0.20/100 k; Fixed 1 GB $20 (FACT) | 200–500 commands/MAU-month | ≈ 0.001 | STEP | — |
| **Workers / queues** | Compute above; BullMQ on Redis | 4 refresh slots/day per paid consent; 1/day free | included | — | — |
| **Email** | Resend Free 3 k/mo; Pro $20/50 k; $0.90/1 k overage; SES $0.16–0.23/1 k (FACT) | 4–6 emails/MAU-month | 0.0005 / 0.002 / 0.005 | STEP then VARIABLE | — |
| **Push** | Expo Push / FCM / APNs free (FACT medium); OneSignal free only to 1,000 MAU from 2026-09 | 30/MAU-month | ≈ 0 | — | Minimal payloads |
| **Analytics** | PostHog 1 M events free then $0.00005 → $0.000009 tiered; Mixpanel 1 M free (FACT) | 100–200 events/MAU-month | 0 / 0.003 / 0.02 | STEP then VARIABLE | ≈ $325/mo at 100 k MAU (R-BB §5) |
| **Observability** | Sentry Team ≈ $26, PAYG errors $0.00036; Grafana Cloud free tier; logs $0.40–0.50/GB (FACT/ASSUMPTION) | sampled traces; 50 MB logs/1,000 MAU-day | 0 / 0.002 / 0.015 | STEP | — |
| **Auth** | better-auth self-hosted €0 (DECISION, R-BB §1); hosted alternatives $0–20 per 1,000 MAU | — | 0 / 0.003 / 0.017 | — | — |
| **Payment fees** | Apple/Google 15 %; web Stripe 1.5 % + €0.25; RevenueCat 1 % > $2.5 k MTR (FACT) | On ex-VAT revenue | 8 / 13 / 16 % of ex-VAT revenue | VARIABLE (+STEP) | Modelled on revenue |
| **Support** | €4 / 6 / 8 per human contact (ASSUMPTION); AI deflection 40–70 % (FACT YNAB 70 %) | 5 / 15 / 40 contacts per 1,000 MAU; paid users 2× | 0.006 / 0.036 / 0.19 (free); ×2 paid | VARIABLE | Connection breakage is the driver (R-PP §A #1) |
| **Referral rewards** | Plus month at COGS (≈ €1.07) | 15 % of registrations referred, both sides rewarded | ≈ €1–2 per referred registration | VARIABLE (acquisition) | `go-to-market.md` |
| **Logos / FX / legal tooling** | Brandfetch free ≤ 500 k–1 M req/mo (2,400 req/5 min cap → cache); ECB rates free; iubenda €10–40/mo (FACT/ASSUMPTION) | cached | 0.005 / 0.01 / 0.02 | STEP | — |

---

## 4. Cost per unit (Base, HYPOTHESIS; Low / High in brackets)

| Unit | Composition | Cost |
|---|---|---|
| **Per new registered user** | Email/verification €0.0005; analytics; first-run compute; no AIS until connected | **€0.01** (€0.005 / €0.03) |
| **Per new connected user (onboarding)** | Consent flow API calls (counted in the month's per-account fee); backfill of 90 days (300–450 tx) through Batch + rules/kNN: €0.03; embeddings < €0.001; initial recurring/transfer passes compute €0.01 | **€0.05** (€0.02 / €0.30 with frontier backfill) |
| **Per proposed 30-day Plus preview** | Plus direct monthly cost €1.066 + one-off onboarding €0.05 | **€1.12** Base; model actual preview cohorts separately once, no preview charge |
| **Per MAU (blended, all cohorts)** | (Plus €127.92 + Gratis connected €259.60 + Gratis unconnected €33.88) / 1,000 at Base | **€0.4214** before AIS minimum; no offers revenue |
| **Per unconnected free MAU** | AI on imports €0.005; infra €0.034; SaaS €0.01; support €0.018; other €0.01 | **€0.08** (€0.03 / €0.28) |
| **Per connected free MAU** | AIS 1.6 × €0.30 = €0.48; AI €0.02; infra €0.034; SaaS €0.01; support €0.036; other €0.01 | **€0.59** (€0.17 / €1.71) |
| **Per Plus member** | AIS 3 × €0.30 = €0.90; AI €0.04; infra+SaaS €0.044; support €0.072; other €0.01 | **€1.07** (€0.25 / €3.76) |
| **Per Famiglia subscription (Later)** | Plus core per member × active seats + sharing overhead | Base core for 2 / 2.3 / 5 seats = €2.13 / €2.45 / €5.33; sharing overhead UNKNOWN, no seat promise |
| **Per launch paid subscription** | 100% Plus | **€1.066** Base; no later SKU mix |
| **Per 1,000 transactions processed** | T0–T3 ≈ €0; T4 small LLM €0.03–0.09 (15–25 % of rows at $0.03–0.25 per 1,000); T5 €0.01–0.04; embeddings €0.001–0.004; storage €0.0003/month | **€0.05** one-off (€0.03 / €0.25 with Haiku uncached) + €0.0003/month storage |
| **Per 1,000 transactions, AIS-inclusive** (150 tx/account-month) | AIS €0.30 per account ÷ 150 × 1,000 | **€2.00 per 1,000 tx** — bank data dwarfs AI by 40× |

---

## 5. Budget alerts (DECISION D-CA-2 — requirements to implement before real-data beta; current dashboards/alerts not claimed)

| # | Metric | Threshold (Base plan) | Action |
|---|---|---|---|
| A1 | Accounts billed by the provider ÷ active-synced accounts in Lilleri's own ledger | > 1.10 | Sync-pause bug or provider counting dormant consents → reconcile invoice line by line; raise with provider |
| A2 | Free-tier AIS cost ÷ paid subscriptions (per month) | > €0.95 (warning at €0.80); ratio unavailable while paid denominator = 0 | D-BM-1 guardrail: two measured paid-cohort misses → review new-cohort F′ with funded transition and clear notice |
| A3 | AI spend per MAU-day; LLM calls per 1,000 transactions | > €0.004/MAU-day; > 300 calls per 1,000 tx | Tier routing regression (T1/T3 hit rate fell) → freeze prompt/model changes, inspect merchant map |
| A4 | Frontier-model share of rows | > 5 % | Routing threshold drift → retune confidence gates |
| A5 | Cloud bill daily run-rate vs plan | > 120 % of plan for 3 days | Check egress (unexpected image traffic), runaway jobs, log volume |
| A6 | Support contacts per 1,000 MAU | > 25 (Base 15) | Usually a bank outage or consent-expiry wave → status page, in-app explanation, batch renewal nudges |
| A7 | Provider API error rate / retries | > 3 % failed refreshes/day or retry storms | Retries cost refresh slots (4/day) and sometimes money; back off; show "riproviamo alle hh:mm" |
| A8 | Email overage, PostHog events per MAU, Sentry events | Approaching tier limit (80 %) | Sampling and event-catalogue hygiene before upgrading tiers |
| A9 | Payment take rate (effective) | > 15 % of ex-VAT | Mix shifted to stores with standard rates; check SBP status / $1 M threshold |
| A10 | Trial cost per trial start | > €1.50 | Trial users connecting > 4 accounts on average or AIS price above plan |

Operational owner: founder-CFO; review weekly in beta, monthly after launch; every alert maps to a runbook.

---

## 6. Cost-control design rules (DECISION D-CA-3; to be carried into Phase 3 ADRs)

| # | Rule | Why / expected effect |
|---|---|---|
| 1 | **Sync only what is used:** proposed Gratis inactivity pause after 14 days; Plus keeps contracted background refresh unless the user chooses otherwise; both show last update and service safety notices; user-present and unattended requests obey actual bank/provider/legal quotas | Turns per-account billing from "per consent" into "per active user" — the largest single COGS lever if the provider bills accounts accessed (HYPOTHESIS to confirm in RFP) |
| 2 | **Cap the free envelope:** 1 institution, ≤ 2 accounts; the cap is enforced at connect time, not after billing | Bounds free AIS cost |
| 3 | **Refresh budget:** paid consents ≤ 4 background refreshes/day in fixed windows (06:30/12:30/18:30/22:30); free 1/day; Intesa Sanpaolo transaction windows ≤ 14 days per request (FACT, Yapily docs via R-OBA) | Avoids `ACCESS_EXCEEDED` retry storms and wasted calls |
| 4 | **Provider abstraction and minimised evidence:** `FinancialDataProvider` port; canonical immutable source records; retain raw payload only where justified, encrypted and bounded by retention policy; switching needs contract, capability and re-consent evidence | Keeps the RFP credible (switch cost) and enables per-bank provider choice |
| 5 | **Tiered AI with abstention:** T0 rules/CBI codes → T1 merchant map → T2 linear/Bayes → T3 pgvector kNN (global + per-user) → T4 small LLM (25 items/call, closed-enum JSON schema) → T5 frontier on ≤ 5 % residual; corrections write back to per-user rules and kNN so LLM calls decay over time (OSS evidence: 98 → 15 calls over three runs, R-AI §2.5) | Blended $0.03–0.10 per 1,000 tx; AI < 10 % of COGS |
| 6 | **Batch everything that is not interactive:** onboarding backfills, nightly re-labelling, monthly summaries through Batch APIs (−50 %) with 1-hour cached prefixes; do not pad a small prompt merely to hit a cache threshold; calculate whether reusable stable prefixes and endpoint support actually save latency and money | Halves backfill cost; removes the onboarding cost peak |
| 7 | **Cache only at the right scope:** public merchant metadata can share a country/domain cache; transaction descriptors, counterparties, preferences and categorisation caches must remain tenant/profile scoped; logo rate claims need current verification | Dedupes vendor and LLM spend across users |
| 8 | **Data minimisation before any external call:** pseudonymise names/IBANs/card masks; send normalised description, sign, bucketed amount, kind, MCC, country, hint only | Cuts tokens and privacy exposure (R-AI §6.3) |
| 9 | **Privacy-qualified routing before price:** pseudonymisation does not remove GDPR scope; use approved endpoints/regions, purpose, DPA, retention and transfer safeguards from the privacy/vendor policy; no cheap global endpoint exception for pseudonymised text | Avoids paying 1.1× on 100 % of volume |
| 10 | **Zero-egress object storage and CDN for images/receipts** (R2 `eu` jurisdiction) | Egress ≈ €0 |
| 11 | **Push without payload:** "Hai 3 movimenti da rivedere" — amounts fetched on open | Privacy + no notification vendor costs |
| 12 | **Observability sampling:** 10 % trace sampling in prod, error-only logs at INFO level off, structured events with a typed catalogue; stay under PostHog 1 M / Grafana free / Sentry Team until 10 k MAU | Keeps tooling in free/low tiers |
| 13 | **Database sizing by step:** Neon Launch (0.25–1 CU autoscale) to 10 k MAU; one size up per ~5× MAU; partition transactions by user; delete raw payloads on the applicable retention schedule; archive only minimised canonical records where justified; cold storage is not deletion | Avoids premature "Scale" tiers |
| 14 | **Support deflection by design:** every sync failure names bank, cause, next retry; consent-expiry countdown; coverage page; AI support assistant over a curated FAQ | Target ≤ 15 contacts per 1,000 MAU at 60 % deflection |
| 15 | **Payment rails:** native IAP at launch (lowest ops cost), web checkout with Stripe Tax when OSS registration exists; evaluate 10 % rails at ≥ 5 k subscriptions | Take rate 13 % → ≤ 11 % possible |
| 16 | **No fixed-cost commitments on unknowns:** annual provider contracts ≤ 12 months and non-exclusive; no own-AISP registration spend before written legal/licence route and funded economics are cleared; no spending authority follows from a document | Preserves optionality |

---

## 7. Cost drivers at a glance (what moves the bill)

| Driver | Metric to watch | Elasticity (HYPOTHESIS) |
|---|---|---|
| Connected accounts billed (AIS) | accounts × price | 1:1 with COGS; 80–85 % of COGS at Base |
| Paid share of MAU | subscriptions per 1,000 MAU | Raises revenue faster than COGS |
| Free connected share | % of free MAU with live sync | 1:1 with free AIS cost |
| Famiglia active members per subscription (Later) | members | 1:1 with Famiglia COGS |
| LLM share of rows | % rows reaching T4/T5 | AI cost scales linearly; small absolute |
| Support contacts | per 1,000 MAU | Driven by bank outages and consent expiry |
| Egress and images | MB/MAU | Only if images are hot-linked |
| Tier thresholds | PostHog 1 M events, Resend 50 k, Sentry quotas, Neon CU | Step jumps of $20–300/month each |

---

## 8. Decisions / Recommendations

| ID | Decision / recommendation |
|---|---|
| D-CA-1 | Stage fixed-cost ceilings: €15 k (closed beta), €40 k (launch), €120 k (to 250 k MAU); hiring beyond requires measured C1 and C2 inside thresholds |
| D-CA-2 | Budget alerts A1–A10 live from beta day 1, owned by the founder-CFO, each with a runbook |
| D-CA-3 | Cost-control rules 1–16 are inputs to the Phase 3 ADRs (provider abstraction, sync scheduler, AI pipeline, storage, observability) |
| D-CA-4 | AI vendor posture per R-BB §18: small-model tier for classification (GPT-5.4 nano / Gemini 3.1 Flash-Lite / Mistral Small 4 / Haiku 4.5 with padded cache), Sonnet-class for the assistant, frontier only on residual; EU endpoints only where required |
| D-CA-5 | Own-AISP registration is a Phase-3+ option, decided when measured AIS spend exceeds ≈ €15 k/month (i.e., when the one-off €40–150 k plus running costs could pay back within 24 months via direct CBI Globe access — HYPOTHESIS) |
| R-CA-1 | Request in the RFP: billing granularity (account/user/call), definition of "accessed", dormant-consent treatment, invoice line detail per ASPSP, and sandbox/restricted-production terms |
| R-CA-2 | Keep a monthly "cost per unit" report (§4) next to the business KPIs; publish the per-1,000-transactions AI cost to engineering as a budget |

---

## 9. Open questions

| # | Question | How to verify |
|---|---|---|
| Q1 | Does the provider bill accounts not accessed in a month? Is there a per-user or per-call option? Minimum invoice amount and included quota? | RFP (Enable Banking quote tool; Yapily, Tink, Salt Edge, Fabrick sales) |
| Q2 | Real infra cost per MAU at 10 k and 100 k on the chosen stack (Neon/Fly vs Hetzner) | Cloud bills; load test with synthetic users |
| Q3 | Hetzner CX line availability (reported out of stock since 2 Sep 2026) and current Scaleway/OVH prices | hetzner.com/cloud; scaleway.com/pricing |
| Q4 | Support contacts per 1,000 MAU for an Italian PFM and achievable deflection | Beta support log |
| Q5 | Own-AISP registration one-off and running costs (legal, PII premium, QTSP certificates, compliance officer) | 2–3 law-firm quotes; InfoCert price list (R-OBB §15.2) |
| Q6 | EAS Production plan price; Auth0/Clerk EU residency if better-auth is replaced | expo.dev/pricing; vendor pages |
| Q7 | Whether EU-resident inference is legally required for pseudonymised categorisation calls (affects the +10 % regional premium on 100 % of AI volume) | Counsel + DPIA (transfer impact assessment, R-BB §19) |

---

## Review log

| Reviewer | Finding | Resolution |
|---|---|---|
| CFO (major) | Per-user costs and blended mix included unshipped Pro/Famiglia; trial omitted delivery costs | Launch Plus-only costs and full ~€1.12 preview cost; later volume zero |
| CFO (major) | AIS minimum appeared in fixed totals and direct costs | Removed from fixed envelope; max(variable, minimum) applied once |
| Privacy (blocker) | Cheap global inference and shared transaction cache assumed pseudonymisation removed risk | Approved privacy routing and tenant/profile-scoped financial caches; raw retention bounded |
| SRE/PM (major) | Paid sync paused after 14 days despite paid automation promise; alerts presented as implemented | Gratis-only pause hypothesis; Plus contracted cadence; dashboards labelled requirements |
| AI/cost (major) | Padding prompts merely to reach a cache threshold may waste money/latency | Conditional cost evaluation; no padding mandate |

## 10. Sources

| ID | Source | URL | Date seen | Reliability | Used for |
|---|---|---|---|---|---|
| R-BC | `business-and-cost-inputs.md` §3–§11, §14 | repo | 2026-10-02 | high (vendor prices) / medium (ranges) | All unit prices: AIS ranges, LLM, OCR, infra, auth, email, analytics, support, store fees |
| R-BB | `build-vs-buy-and-vendors.md` §0–§19 | repo | 2026-10-02 | medium–high | Stack choices, free tiers, step thresholds, human-contract items |
| R-AI | `ai-ml-transaction-intelligence.md` §2.4, §5.3–§5.4, §6.3, §7 | repo | 2026-10-02 | high (prices) / medium | Tiered pipeline costs, caching minimums, batch limits, data minimisation |
| R-OBA / R-OBB | `open-banking-providers-a.md` §2.1, §2.5, §7; `open-banking-providers-b.md` §4, §13, §15 | repo | 2026-10-02 | medium–high | 4×/day cap, Intesa 14-day window, per-account billing, own-AISP costs |
| R-PP | `user-pain-points.md` §A #1, #4, #9, §H | repo | 2026-10-02 | medium | Support-cost drivers |
| AN-1 | Anthropic pricing; prompt caching; batch processing; data residency | https://platform.claude.com/docs/en/about-claude/pricing ; https://platform.claude.com/docs/en/build-with-claude/prompt-caching ; https://platform.claude.com/docs/en/build-with-claude/batch-processing ; https://platform.claude.com/docs/en/manage-claude/data-residency | 2026-10-02 (via R-AI/R-BC) | high | AI prices, cache floors, batch −50 %, no EU inference |
| GC-1 | Google Cloud Document AI pricing; Vertex Gemini pricing | https://cloud.google.com/document-ai/pricing ; https://cloud.google.com/vertex-ai/generative-ai/pricing | 2026-10-02 (via R-BC) | high | OCR and Gemini prices |
| MI-1 | Mistral regional inference docs (1.1×, no Batch on regional endpoints) | https://docs.mistral.ai/inference/regional-inference | 2026-10-02 (via R-AI) | high (mirror) | EU endpoint cost |
| AWS-1 | AWS Price List API (Textract, SES, S3, data transfer, Cognito) | https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/ | 2026-10-02 (via R-BC) | high | Egress/email/OCR alternatives |
| IN-1 | Neon, Fly.io, Railway, Supabase, Upstash, Cloudflare R2 docs | https://neon.com/docs/introduction/plans ; https://fly.io/docs/about/pricing/ ; https://docs.railway.com/pricing/plans ; https://supabase.com/docs/guides/platform/billing-on-supabase ; https://upstash.com/docs/redis/overall/billing ; https://developers.cloudflare.com/r2/pricing/ | 2026-10-02 (via R-BC/R-BB) | high | Infra unit prices |
| HZ-1 | Hetzner price adjustment 15 Jun 2026 (via dated transcriptions) | https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/ | 2026-10-02 (via R-BC S45) | medium | VPS baseline; CX availability caveat |
| OB-1 | PostHog, Sentry, Grafana, Resend, Expo docs | https://posthog.com/pricing ; https://docs.sentry.io/pricing/ ; https://grafana.com/docs/grafana-cloud/ ; https://resend.com/pricing ; https://docs.expo.dev/billing/plans/ | 2026-10-02 (via R-BB) | high | Tier thresholds |
| EB-1 | Enable Banking FAQ | https://enablebanking.com/docs/faq/ | 2026-10-02 | high | Per-account billing, minimum invoice |
| YP-1 | Yapily data restrictions (Intesa 14-day window, ACCESS_EXCEEDED) | https://docs.yapily.com/pages/data/financial-data-resources/data-restrictions/ | 2026-10-02 (via R-OBA) | high | Refresh-budget rule |
| BF-1 | Brandfetch Logo API rate limits | https://docs.brandfetch.com/logo-api/rate-limits | 2026-10-02 (via R-AI) | medium | Logo caching rule |
