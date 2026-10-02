# Provider cost model — open banking data cost per connected account / user / month

**Project:** LILLERI · **Date / verification date for every claim:** 2026-10-02 · **Author:** CTO fintech + open banking specialist, founding team
**Status:** Phase 1 synthesis. Inputs: `docs/research/raw/open-banking-providers-a.md` (A), `open-banking-providers-b.md` (B), `non-bank-sources-and-os-limits.md` (NB), and the WebSearch queries run for `open-banking-providers.md` (`NEW-n`). Companion: `provider-capability-matrix.md`, `open-banking-providers.md`.

**Review provenance (DECISION, 2026-10-02):** this revision checks repository evidence, source consistency and design implications. Source URLs/access dates below are inherited observations, not fresh web verification. FACT means the cited observation is recorded; vendor performance, source independence, market prevalence and current legal/commercial eligibility remain unverified where stated.

## How to read this document — read this first

- **No current first-party price list was verified in the retained research for the shortlisted providers** (FACT about the research result, not universal absence; NEW-2/NEW-6). Every euro figure below that is not labelled FACT is an **ASSUMPTION range** chosen to bracket the plausible outcome of a quote, with the anchor that motivated it and the way to verify it (request a quote). Do not budget from the point estimates; budget from the ranges, and replace them with quotes.
- **Retained pricing-model observations** (source verification dates retained, not refreshed by this repository review): Enable Banking bills **per connected account per month**, volume-based, with a **minimum monthly invoice that includes a quota of accounts and payments** (own FAQ; amount undisclosed; "Get a Quote" tool since March/April 2026) [B-§4, NEW-2]; Neonomics bills data aggregation **per user per month** with volume tiers and **no setup fee** (GetApp/openbankingtracker — low reliability) [B-§7]; Salt Edge meters AIS **per consented end-user** (secondary, low) [A-§3.4]; Yapily production is "base + usage fees" (listing sites, low) [A-§3.3]; Fabrick offers "flexible business models from flat fee to revenue sharing" (own fintech page, self-claim) [NEW-6]; Tink mentions an "Enterprise tier" in its docs (no prices) [A-§3.1]; GoCardless Bank Account Data is closed to new customers [B-§3]; CBI Globe fees are UNKNOWN [B-§13, NEW-5].
- **Public numbers that exist are low-reliability and must not be upgraded**: Tink "€0.50 per user per month (Standard), €0.25 per verification" (listing sites copying each other); Yapily "£200–500/month entry production"; Salt Edge "Free $0 (100 live connections) / Growth $500 per month / Custom" (a card reproduced identically on f6s, TrustRadius and a 2019 GitHub thread → historical, not on saltedge.com today); Plaid "Europe adds 5–15 % to licence cost; no pay-as-you-go in Europe" (pricing sites) [A-§1.5 AV2, B-§6].
- **Model outputs are arithmetic under the assumptions in §1–§2, not vendor quotes.** Reproduce them with the formula in §1; the earlier `cost_model.py` scratchpad is not a repository artifact.
- Currency: EUR. Where the anchor is GBP/USD the conversion is ASSUMPTION (≈ 1 GBP = 1.15 EUR; 1 USD = 0.90 EUR), rounded.

---

## 1. Scenario definitions

| Parameter | Values | Label | Rationale |
|---|---|---|---|
| Users (active, connected) | 1,000 · 10,000 · 100,000 · 1,000,000 | DECISION (brief) | Seed → Series A → Italian scale → European scale. |
| Connections per user | 1.0 · 1.8 · 2.5 | DECISION (brief) | 1.0 = single current account; 1.8 = typical Italian user with a bank + Postepay/Revolut/N26 (ASSUMPTION); 2.5 = power user. |
| Scenarios | Low / Base / High | — | Low/Base/High are invented sensitivity cases, not verified negotiated/list prices or probability bounds; quotes may fall outside every case. |
| Metering | "per connected account/month" for most providers; "per consented end-user/month" for Salt Edge and Neonomics | ASSUMPTION (meters/rates except retained provider-specific metering statement) | A per-user meter makes the connections ratio irrelevant to cost. |
| Volume tier multiplier on the unit price | 1k: ×1.00 · 10k: ×0.90 · 100k: ×0.75 · 1M: ×0.60 | ASSUMPTION | Typical enterprise tiering; no provider publishes tiers. Verify in quotes at each scale. |
| Monthly floor / quota | Provider-specific range (§2) | ASSUMPTION (amounts) / FACT (Enable Banking has one) | A floor dominates cost at 1k users. |
| Formula | `cost_month = max(floor, quantity × unit × tier)` where `quantity = users × connections` (per-account meter) or `users` (per-user meter) | DECISION | This assumes a floor inclusive of usage; an additive base fee, prepaid quota, per-call charges or annual commitment requires another formula. Setup, tax, FX, failures/retries, dual-provider overlap and legal/security/compliance work are excluded (UNKNOWN; see §7). |

## 2. Assumption table per provider (EUR; all ASSUMPTION unless stated)

| Provider | Meter | Unit price per month: Low / Base / High | Monthly floor: Low / Base / High | Anchor for the range (reliability) | How to verify |
|---|---|---|---|---|---|
| Tink | per connected account | 0.20 / 0.40 / 0.70 | 1,000 / 2,500 / 5,000 | "€0.50/user/month Standard" on listing sites (low); "Enterprise tier" in docs (high, no price); Visa-owned enterprise sales motion | RFP quote at 1k/10k/100k accounts; ask floor, contract length, enrichment bundle |
| Fabrick | per connected account | 0.20 / 0.45 / 0.80 | 1,000 / 2,500 / 5,000 | "Flat fee to revenue sharing" (own page, self-claim); bank-oriented history (ASSUMPTION) | Ask for Fabrick Pass B2C price sheet; ask whether revenue share replaces the floor |
| TrueLayer | per connected account | 0.20 / 0.40 / 0.70 | 500 / 1,500 / 3,000 | "Development (free) / Scale (monthly fee + usage) / Enterprise" (third-party, low) | RFP quote |
| Yapily | per connected account | 0.15 / 0.30 / 0.60 | 250 / 500 / 1,500 | "£200–500/month entry production; base + usage; per call + subscription" (low) → €230–575 | RFP quote; ask whether "per call" applies to AIS refreshes (would change the model: see §8) |
| Salt Edge | per consented end-user | 0.20 / 0.40 / 0.80 | 450 / 450 / 1,500 | "Growth $500/month" (2019 card, low) → €450; per-end-user metering (low) | RFP quote — only after the EEA entity question is answered |
| Enable Banking | per connected account | 0.10 / 0.25 / 0.50 | 300 / 750 / 2,000 | FACT: per-account volume pricing with a minimum monthly invoice (own FAQ); indie-friendly reputation (dev.to, low) | "Get a Quote" tool + RFP; ask the floor and the included quota at 1k/10k/100k accounts |
| Powens | per connected account | 0.20 / 0.40 / 0.70 | 500 / 1,500 / 3,000 | No anchor (UNKNOWN); mid-market French aggregator (ASSUMPTION) | RFP quote |
| Plaid EU | per connected account | 0.25 / 0.50 / 0.90 | 500 / 2,000 / 5,000 | "No PAYG in Europe; +5–15 % vs US" (low); enterprise sales (ASSUMPTION) | RFP quote; ask startup programme |
| Neonomics | per consented end-user | 0.15 / 0.30 / 0.60 | 0 / 250 / 1,000 | "Per-user/month, volume tiers, no setup fee" (GetApp, low) | RFP quote |
| Mastercard OFE | per connected account | 0.20 / 0.40 / 0.80 | 500 / 1,500 / 3,000 | No anchor (UNKNOWN) | Ask Mastercard open banking sales |
| GoCardless BAD | — | n/a | n/a | Closed to new customers since July 2025 (FACT, own page) | Not obtainable |
| CBI Globe direct | fixed costs (own licence) | see §7 | see §7 | Fees UNKNOWN; low-reliability SME anchors (2021 blog) | Request CBI fee schedule; law-firm quotes |

**Enrichment add-ons** (EUR per connected account per month, ASSUMPTION; none of the vendors publishes enrichment prices):

| Provider | Add-on Low / Base / High | What it buys | Anchor |
|---|---|---|---|
| Tink | 0.10 / 0.20 / 0.40 | Categorisation (per-user learning), recurring + predicted, merchant logo/location | Documented marketed stack (FACT of claim, quality unmeasured); priced separately or bundled — UNKNOWN |
| Yapily | 0.05 / 0.15 / 0.30 | Data Plus: tier1–3 categories, merchant, recurrence, MCC | "Requires separate contract + scope" (FACT, docs) |
| Salt Edge | 0.05 / 0.15 / 0.30 | Data Enrichment Platform, Merchant Identification | Vendor claims (FACT existence) |
| Fabrick | 0.05 / 0.15 / 0.30 | "Value-added PSD2 services" | Marketed (ASSUMPTION) |
| Plaid EU | 0.05 / 0.15 / 0.30 | Enrich (EU availability UNKNOWN) | Docs silent on EU |
| Powens | 0.00 / 0.10 / 0.25 | Categorisation appears part of the data product (FACT, docs) | May be bundled |
| Mastercard OFE | 0.00 / 0.10 / 0.25 | "Categories" endpoint in the unlicensed API (FACT) | May be bundled |
| TrueLayer, Enable Banking, Neonomics | not offered for Italy | — | TrueLayer classification UK/IE/FR only (FACT); EB pure connectivity (FACT) |

## 3. Per-provider cost tables (EUR per month; cells = Low / Base / High; last column = Base cost per user per month at 1.8 connections)

### Tink (per connected account)
| Users | 1.0 conn/user | 1.8 conn/user | 2.5 conn/user | Base €/user/mo @1.8 |
|---|---|---|---|---|
| 1,000 | 1,000 / 2,500 / 5,000 | 1,000 / 2,500 / 5,000 | 1,000 / 2,500 / 5,000 | 2.500 (floor-dominated) |
| 10,000 | 1,800 / 3,600 / 6,300 | 3,240 / 6,480 / 11,340 | 4,500 / 9,000 / 15,750 | 0.648 |
| 100,000 | 15,000 / 30,000 / 52,500 | 27,000 / 54,000 / 94,500 | 37,500 / 75,000 / 131,250 | 0.540 |
| 1,000,000 | 120,000 / 240,000 / 420,000 | 216,000 / 432,000 / 756,000 | 300,000 / 600,000 / 1,050,000 | 0.432 |

### Fabrick (per connected account)
| Users | 1.0 | 1.8 | 2.5 | Base €/user/mo @1.8 |
|---|---|---|---|---|
| 1,000 | 1,000 / 2,500 / 5,000 | 1,000 / 2,500 / 5,000 | 1,000 / 2,500 / 5,000 | 2.500 |
| 10,000 | 1,800 / 4,050 / 7,200 | 3,240 / 7,290 / 12,960 | 4,500 / 10,125 / 18,000 | 0.729 |
| 100,000 | 15,000 / 33,750 / 60,000 | 27,000 / 60,750 / 108,000 | 37,500 / 84,375 / 150,000 | 0.608 |
| 1,000,000 | 120,000 / 270,000 / 480,000 | 216,000 / 486,000 / 864,000 | 300,000 / 675,000 / 1,200,000 | 0.486 |

### TrueLayer (per connected account)
| Users | 1.0 | 1.8 | 2.5 | Base €/user/mo @1.8 |
|---|---|---|---|---|
| 1,000 | 500 / 1,500 / 3,000 | 500 / 1,500 / 3,000 | 500 / 1,500 / 3,000 | 1.500 |
| 10,000 | 1,800 / 3,600 / 6,300 | 3,240 / 6,480 / 11,340 | 4,500 / 9,000 / 15,750 | 0.648 |
| 100,000 | 15,000 / 30,000 / 52,500 | 27,000 / 54,000 / 94,500 | 37,500 / 75,000 / 131,250 | 0.540 |
| 1,000,000 | 120,000 / 240,000 / 420,000 | 216,000 / 432,000 / 756,000 | 300,000 / 600,000 / 1,050,000 | 0.432 |

### Yapily (per connected account) — primary candidate
| Users | 1.0 | 1.8 | 2.5 | Base €/user/mo @1.8 |
|---|---|---|---|---|
| 1,000 | 250 / 500 / 1,500 | 270 / 540 / 1,500 | 375 / 750 / 1,500 | 0.540 |
| 10,000 | 1,350 / 2,700 / 5,400 | 2,430 / 4,860 / 9,720 | 3,375 / 6,750 / 13,500 | 0.486 |
| 100,000 | 11,250 / 22,500 / 45,000 | 20,250 / 40,500 / 81,000 | 28,125 / 56,250 / 112,500 | 0.405 |
| 1,000,000 | 90,000 / 180,000 / 360,000 | 162,000 / 324,000 / 648,000 | 225,000 / 450,000 / 900,000 | 0.324 |

### Salt Edge (per consented end-user — connections ratio does not change cost)
| Users | any ratio | Base €/user/mo |
|---|---|---|
| 1,000 | 450 / 450 / 1,500 | 0.450 |
| 10,000 | 1,800 / 3,600 / 7,200 | 0.360 |
| 100,000 | 15,000 / 30,000 / 60,000 | 0.300 |
| 1,000,000 | 120,000 / 240,000 / 480,000 | 0.240 |

### Enable Banking (per connected account) — fallback candidate
| Users | 1.0 | 1.8 | 2.5 | Base €/user/mo @1.8 |
|---|---|---|---|---|
| 1,000 | 300 / 750 / 2,000 | 300 / 750 / 2,000 | 300 / 750 / 2,000 | 0.750 (floor-dominated) |
| 10,000 | 900 / 2,250 / 4,500 | 1,620 / 4,050 / 8,100 | 2,250 / 5,625 / 11,250 | 0.405 |
| 100,000 | 7,500 / 18,750 / 37,500 | 13,500 / 33,750 / 67,500 | 18,750 / 46,875 / 93,750 | 0.338 |
| 1,000,000 | 60,000 / 150,000 / 300,000 | 108,000 / 270,000 / 540,000 | 150,000 / 375,000 / 750,000 | 0.270 |

### Powens (per connected account)
| Users | 1.0 | 1.8 | 2.5 | Base €/user/mo @1.8 |
|---|---|---|---|---|
| 1,000 | 500 / 1,500 / 3,000 | 500 / 1,500 / 3,000 | 500 / 1,500 / 3,000 | 1.500 |
| 10,000 | 1,800 / 3,600 / 6,300 | 3,240 / 6,480 / 11,340 | 4,500 / 9,000 / 15,750 | 0.648 |
| 100,000 | 15,000 / 30,000 / 52,500 | 27,000 / 54,000 / 94,500 | 37,500 / 75,000 / 131,250 | 0.540 |
| 1,000,000 | 120,000 / 240,000 / 420,000 | 216,000 / 432,000 / 756,000 | 300,000 / 600,000 / 1,050,000 | 0.432 |

### Plaid EU (per connected account)
| Users | 1.0 | 1.8 | 2.5 | Base €/user/mo @1.8 |
|---|---|---|---|---|
| 1,000 | 500 / 2,000 / 5,000 | 500 / 2,000 / 5,000 | 625 / 2,000 / 5,000 | 2.000 |
| 10,000 | 2,250 / 4,500 / 8,100 | 4,050 / 8,100 / 14,580 | 5,625 / 11,250 / 20,250 | 0.810 |
| 100,000 | 18,750 / 37,500 / 67,500 | 33,750 / 67,500 / 121,500 | 46,875 / 93,750 / 168,750 | 0.675 |
| 1,000,000 | 150,000 / 300,000 / 540,000 | 270,000 / 540,000 / 972,000 | 375,000 / 750,000 / 1,350,000 | 0.540 |

### Neonomics (per consented end-user)
| Users | any ratio | Base €/user/mo |
|---|---|---|
| 1,000 | 150 / 300 / 1,000 | 0.300 |
| 10,000 | 1,350 / 2,700 / 5,400 | 0.270 |
| 100,000 | 11,250 / 22,500 / 45,000 | 0.225 |
| 1,000,000 | 90,000 / 180,000 / 360,000 | 0.180 |

### Mastercard Open Finance Europe (per connected account)
| Users | 1.0 | 1.8 | 2.5 | Base €/user/mo @1.8 |
|---|---|---|---|---|
| 1,000 | 500 / 1,500 / 3,000 | 500 / 1,500 / 3,000 | 500 / 1,500 / 3,000 | 1.500 |
| 10,000 | 1,800 / 3,600 / 7,200 | 3,240 / 6,480 / 12,960 | 4,500 / 9,000 / 18,000 | 0.648 |
| 100,000 | 15,000 / 30,000 / 60,000 | 27,000 / 54,000 / 108,000 | 37,500 / 75,000 / 150,000 | 0.540 |
| 1,000,000 | 120,000 / 240,000 / 480,000 | 216,000 / 432,000 / 864,000 | 300,000 / 600,000 / 1,200,000 | 0.432 |

## 4. Cross-provider summary — Base scenario, 1.8 connections per user

| Provider | 1k users €/mo | 10k €/mo | 100k €/mo | 1M €/mo | €/user/mo @10k | €/user/mo @100k | Label |
|---|---|---|---|---|---|---|---|
| Tink | 2,500 | 6,480 | 54,000 | 432,000 | 0.648 | 0.540 | ASSUMPTION |
| Fabrick | 2,500 | 7,290 | 60,750 | 486,000 | 0.729 | 0.608 | ASSUMPTION |
| TrueLayer | 1,500 | 6,480 | 54,000 | 432,000 | 0.648 | 0.540 | ASSUMPTION |
| **Yapily** | 540 | 4,860 | 40,500 | 324,000 | 0.486 | 0.405 | ASSUMPTION |
| Salt Edge | 450 | 3,600 | 30,000 | 240,000 | 0.360 | 0.300 | ASSUMPTION (per-user meter) |
| **Enable Banking** | 750 | 4,050 | 33,750 | 270,000 | 0.405 | 0.338 | ASSUMPTION (model FACT) |
| Powens | 1,500 | 6,480 | 54,000 | 432,000 | 0.648 | 0.540 | ASSUMPTION |
| Plaid EU | 2,000 | 8,100 | 67,500 | 540,000 | 0.810 | 0.675 | ASSUMPTION |
| Neonomics | 300 | 2,700 | 22,500 | 180,000 | 0.270 | 0.225 | ASSUMPTION (per-user meter) |
| Mastercard OFE | 1,500 | 6,480 | 54,000 | 432,000 | 0.648 | 0.540 | ASSUMPTION |

Readings (all conditional on the assumptions):
- **At 1k users the floor is the cost.** The spread is €300–2,500/month, i.e. €0.30–2.50 per user per month, driven entirely by the minimum commitment — the single most important number to obtain in the RFP for the seed phase.
- **At 10k–100k users the unit price dominates**: €0.34–0.81 per user per month at Base; the 1.8 connections assumption adds 80 % to the bill for every per-account meter, which is why **the metering basis (per account vs per user) matters as much as the rate**.
- **Per-user meters (Salt Edge, Neonomics) look cheapest at high connection ratios** — but Salt Edge is excluded pending its EEA entity and Neonomics on stability; do not let the cost model override those gates.
- **Enrichment add-ons** (§5) add roughly 30–50 % at Base if bought; Lilleri's build-own strategy makes them optional.

## 5. Enrichment add-ons and the build-own comparator

Add-on cost at Base, 1.8 connections per user (EUR per month; ASSUMPTION):

| Provider | add-on €/acct/mo (L/B/H) | 1k | 10k | 100k | 1M |
|---|---|---|---|---|---|
| Tink | 0.10 / 0.20 / 0.40 | 360 | 3,240 | 27,000 | 216,000 |
| Fabrick | 0.05 / 0.15 / 0.30 | 270 | 2,430 | 20,250 | 162,000 |
| Yapily | 0.05 / 0.15 / 0.30 | 270 | 2,430 | 20,250 | 162,000 |
| Salt Edge | 0.05 / 0.15 / 0.30 | 270 | 2,430 | 20,250 | 162,000 |
| Plaid EU | 0.05 / 0.15 / 0.30 | 270 | 2,430 | 20,250 | 162,000 |
| Powens | 0.00 / 0.10 / 0.25 | 180 | 1,620 | 13,500 | 108,000 |
| Mastercard OFE | 0.00 / 0.10 / 0.25 | 180 | 1,620 | 13,500 | 108,000 |
| TrueLayer, Enable Banking, Neonomics | not offered | — | — | — | — |

**Build-own categorisation comparator** (per user per month; derived from per-token prices that are FACT or first-party cache, with an ASSUMED volume of 100 transactions per user per month × 150 input / 20 output tokens each; no caching, no batch discounts):

| Model | Price per MTok in / out (USD) | Label of price | ≈ USD per user per month |
|---|---|---|---|
| Gemini 2.5 Flash-Lite (retained Vertex AI list) | 0.10 / 0.40 | Retained price observation [NB-S-36]; current region/contract UNKNOWN | 0.0023 |
| gpt-5-mini | 0.25 / 2.00 | Registry observation (medium) [NB-S-22]; current price UNKNOWN | 0.0078 |
| Claude Haiku 4.5 | 1.00 / 5.00 | Unreproduced prior-session cache dated 2026-09-25; re-verification required [NB-S-21] | 0.025 |
| Claude Sonnet 5.5 | 2.00 / 10.00 | Unreproduced prior-session cache; model availability/price UNKNOWN | 0.050 |

**HYPOTHESIS:** token-only inference can be below an assumed enrichment fee, but these are different services. The retained dollar inputs are not fresh quotes; 100 transactions × 150 input/20 output tokens omits system prompts, retries, privacy filtering, runtime, storage, evaluation, support and human corrections. EUR conversion is an assumption. The table does not establish total cost or equivalent accuracy. **DECISION:** deterministic rules and user corrections first; an optional external classifier or vendor enrichment requires an Italian accuracy/privacy benchmark and a total-cost comparison, with appropriate permission and contract controls.

## 6. Sensitivity — what moves the cost most

| Driver | Effect (Base, Yapily unless noted) | Label |
|---|---|---|
| Monthly floor | At 1k users and 1.8 accounts/user, Base usage is 1,000 × 1.8 × €0.30 = €540. Moving the assumed floor from €250 to €1,500 changes cost from €0.540 to €1.500/user/month (2.78×). | ASSUMPTION |
| Metering basis | Per-account vs per-user at 1.8 connections: 1.8× the bill at the same unit rate. A provider quoting per *user* at €0.40 beats one quoting per *account* at €0.25. | ASSUMPTION |
| Per-call pricing (Yapily "per call + subscription", low) | If AIS refreshes are billed per call, an assumed 4 one-call requests/day × 30 days × 1.8 accounts = 216 calls/user/month, yielding €0.432 at an assumed €0.002/call. Real account, balance and paginated-transaction endpoints, failures/retries and provider refresh billing can require more calls; the RTS access allowance is not a billing definition — larger than the per-account price itself. **Must be clarified in the RFP** (OPEN QUESTION C1). | HYPOTHESIS |
| Volume tier multiplier | Removing the assumed tiers (×1.0 at all scales) raises the 100k Base from €40.5k to €54k/month (Yapily). | ASSUMPTION |
| Connections ratio | 1.0 → 2.5 connections: 2.5× for per-account meters. Product design (which accounts users actually connect) is a cost lever. | FACT (arithmetic) |
| Enrichment | +30–50 % at Base if bought. | ASSUMPTION |
| Consent churn | Consents expire at provider/bank-specific times, distinct from the SCA exemption; expired connections may keep costing (active vs dormant/expired billing is UNKNOWN; ask whether dormant/expired consents are billed). | ASSUMPTION |

## 7. Own-licence path (route C) and CBI Globe direct — fixed-cost model

All figures are ASSUMPTION (founder estimates to be replaced by quotes); the raw notes record cost as UNKNOWN except low-reliability anchors.

| Cost item | Low | Base | High | Anchor / how to verify |
|---|---|---|---|---|
| One-off: registration file (legal/advisory), programme of operations, security policy, governance set-up | €60k | €120k | €250k | No source; UNKNOWN in B-§15.2 → obtain 2–3 Italian fintech-regulatory law-firm quotes |
| One-off: CBI Globe TPP onboarding + connector build/test | €8k | €15k | €25k | 2021 SME blog anchors: TPP contract €0–1,500, analysis €2–4k, connector €5–15k, test/go-live €1–3k (low) [B-#31] |
| Annual: professional indemnity insurance (EBA/GL/2017/08 formula) | €10k | €25k | €60k | UNKNOWN; broker quotes; the French "€5M per incident" figure must not be used [B-§15.2] |
| Annual: compliance officer / DPO share, audit, incident reporting, DORA programme | €60k | €120k | €250k | No source; DORA scope/framework and proportionality require counsel classification [REG-§4] |
| Annual: eIDAS QWAC/QSealC certificates | €2k | €4k | €8k | "few k€/yr" (ASSUMPTION) [B-§15.2]; InfoCert/QTSP price list |
| Annual: CBI Globe TPP fees | €600 | €2,000 | €3,600 | 2021 blog anchor (low); request CBI fee schedule [NEW-5: brochure exists, not read] |
| Annual: connector maintenance (CBI Globe banks + UniCredit direct + Revolut/N26 direct or via an aggregator in BYO-licence/TSP mode) | €80k | €150k | €300k | No source; depends on whether an aggregator remains in TSP mode (Enable Banking documents one) [B-§4] |
| Elapsed time | 6 months | 9 months | 12+ months | 90-day statutory decision (FACT) + pre-filing/completeness rounds (HYPOTHESIS) |

**Crude break-even (HYPOTHESIS):** annual running cost at Base ≈ €300k (excluding one-offs and infra); the aggregator Base at 100k users and 1.8 connections is €40.5k/month ≈ €486k/year (Yapily) or €405k/year (Enable Banking). Own licence therefore starts to pay back somewhere around **50–80k connected users**, *if* non-Italian coverage can be kept cheaply through a TSP-mode aggregator and the organisation accepts the applicable DORA/incident obligations. This is a phase-2 decision; it is not an MVP cost lever.

## 8. How to verify — RFP pricing questionnaire (identical for every shortlisted provider)

1. Metering basis: per connected account, per consented end-user, per API call, per refresh? Are expired/dormant consents billed?
2. Unit price at 1,000 / 10,000 / 100,000 / 1,000,000 connected accounts (AIS only, Italy), and the volume-tier schedule.
3. Minimum monthly invoice (floor), included quota, ramp-up/waiver for the first 6–12 months.
4. Setup/onboarding fees; sandbox and restricted-production terms; KYB/UI-review costs.
5. Enrichment add-on price and whether it can be bought later without re-contracting.
6. Contract length, exclusivity, termination, price-change clauses, EU-expansion pricing (same rate card for ES/FR/DE?).
7. SLA schedule and service credits.
8. Payment initiation pricing (not needed now; informs later monetisation).

## Decisions / Recommendations

1. **Plan the seed phase on the floor, not the unit price**: use €540–2,500/month only as the Base sensitivity span at 1k users/1.8 accounts across Yapily/Enable Banking/Tink. Obtain quotes; gate G2 is evaluated against the current business model, not this unquoted range.
2. **Plan Series-A scale (10k users) on €0.40–0.65 per user per month** at 1.8 connections (Base; ASSUMPTION), and **€0.30–0.55 at 100k** — these are Base-only assumptions. At 10k users/1.8 accounts, High cases also exceed €1 for Tink/TrueLayer/Powens/Mastercard, and floors make 1k-user cases expensive. No provider affordability is verified.
3. **Make the metering basis an explicit RFP criterion**; prefer per-user or per-account with active-consent counting; refuse per-call pricing for AIS refreshes unless capped.
4. **Keep enrichment optional.** Compare accuracy, privacy and total cost; the token-only and vendor-price tables are sensitivity inputs, not a demonstrated cheaper equivalent. No commercial trial or purchase is authorised here.
5. **Treat the own-licence path as a 50–80k-user decision** (HYPOTHESIS), to be re-costed with real quotes once the product-market signal exists.
6. Recompute the §1 formula with quoted values and publish the result in the architecture ADR; keep Low/Base/High discipline.

## Open questions

| # | Question | Label | How to resolve |
|---|---|---|---|
| C1 | Does Yapily (or any provider) bill AIS data refreshes per API call? If so, at what rate and with what cap? | UNKNOWN | RFP question 1; would change the model's structure. |
| C2 | Enable Banking's minimum monthly invoice and included quota at 1k/10k/100k accounts. | UNKNOWN (existence FACT) | Quote tool + RFP. |
| C3 | Tink/Fabrick: floor, ramp-up waiver, whether enrichment is bundled. | UNKNOWN | RFP. |
| C4 | Whether expired/dormant consents count as "connected accounts" at each provider. | UNKNOWN | RFP question 1. |
| C5 | Volume-tier schedules (the ×0.90/×0.75/×0.60 assumption). | ASSUMPTION | RFP question 2. |
| C6 | Salt Edge per-end-user rate and floor (only if its EEA entity is confirmed). | UNKNOWN | RFP. |
| C7 | CBI Globe TPP fee schedule; law-firm and PII broker quotes for route C. | UNKNOWN | Phase-2 procurement. |
| C8 | Realistic connections per user for Italian users (1.8 assumed). | ASSUMPTION | Measure in the Enable Banking pilot and the first 1k users. |

## Sources

| Tag | Source | URL | Verified | Reliability | Used for |
|---|---|---|---|---|---|
| B-#42, B-#63 | Enable Banking FAQ ("How much does it cost…"; minimum monthly invoice) | https://enablebanking.com/docs/faq/ | 2026-10-02 (mirror + live snippet) | high | Metering model; floor exists |
| B-#13 | Enable Banking changelog March 2026 (pricing tool) | https://enablebanking.com/blog/2026/04/08/enable-banking-changelogmarch-2026 | 2026-10-02 | high | Quote tool |
| NEW-2 | openbankingtracker Enable Banking page; G2 pricing; rfp.wiki; dev.to "cheapest open banking APIs 2026" | https://www.openbankingtracker.com/enablebanking ; https://www.g2.com/products/enable-banking/pricing ; https://www.rfp.wiki/financial-services-banking-fintech/open-banking-platforms/enable-banking ; https://dev.to/johnfrandsen/the-cheapest-open-banking-apis-for-small-businesses-and-indie-builders-2026-5cab | 2026-10-02 | medium / low | "No price list; quote form since April 2026" |
| A-#63, A-#187 | Finexer; MerchantMachine — Tink "€0.50/user/month" | https://blog.finexer.com/tink-pricing/ ; https://merchantmachine.co.uk/open-banking-payments/tink/ | 2026-10-02 | low | Tink anchor (unverified) |
| A-#112, A-#188 | Finexer; OMR — Yapily "£200–500/month", "not publicly available" | https://blog.finexer.com/yapily-pricing/ ; https://omr.com/en/reviews/product/yapily/pricing | 2026-10-02 | low | Yapily anchor |
| A-#133, A-#134, A-#184, A-#185 | TrustRadius; Finexer; firefly-iii #2036; f6s — Salt Edge Free/Growth/Custom card | https://www.trustradius.com/products/salt-edge/pricing ; https://blog.finexer.com/salt-edge-pricing/ ; https://github.com/firefly-iii/firefly-iii/issues/2036 ; https://www.f6s.com/software/salt-edge | 2026-10-02 | low | Salt Edge anchor (historical, 2019) |
| A-#149 | Salt Edge docs v6 "Statuses > Test" (100 live connections, 90 days) | https://docs.saltedge.com/v6 | 2026-10-02 (mirror) | high | Trial status (not a free tier) |
| A-#86, A-#188 | Finexer TrueLayer pricing; G2 | https://blog.finexer.com/truelayer-pricing-uk/ ; https://g2.com/products/truelayer/pricing | 2026-10-02 | low | TrueLayer tier names |
| B-#22 | Vendr; Capterra; TrustRadius — Plaid Europe pricing claims | https://www.vendr.com/marketplace/plaid ; https://www.capterra.com/p/174384/Plaid/ ; https://www.trustradius.com/products/plaid-plaid/pricing | 2026-10-02 | low | "No PAYG in Europe; +5–15 %" |
| B-#24 | GetApp — Neonomics pricing (per-user, no setup fee) | https://www.getapp.com/finance-accounting-software/a/neonomics/ | 2026-10-02 | low/medium | Neonomics anchor |
| NEW-6 | Fabrick — Solutions for Fintechs ("flat fee to revenue sharing") | https://www.fabrick.com/solutions/fintechs | 2026-10-02 | high (self-claim) | Fabrick model |
| B-#50 | GoCardless — new signups disabled | https://bankaccountdata.gocardless.com/new-signups-disabled | 2026-10-02 | high | Excluded |
| B-#31 | Brentasoft blog (2021) — PSD2 integration cost anchors for SMEs | https://brentasoft.com/blog/psd2-open-banking-pmi-italiane-2021/ | 2026-10-02 | low | Route C anchors only |
| B-#33, B-#34 | Banca d'Italia Disposizioni; Diritto Bancario — 90-day decision, PII, no capital | https://www.bancaditalia.it/compiti/vigilanza/normativa/archivio-norme/disposizioni/disp-ip-20120620/Disposizioni-vigilanza-per-IP-e-IMEL-versione-integrale-al-22-febbraio-2022.pdf ; https://www.dirittobancario.it/art/la-disciplina-degli-aisp-nelle-nuove-disposizioni-di-vigilanza-della-banca-d-italia/ | 2026-10-02 | high / medium | Route C requirements |
| NEW-5 | CBI Globe brochure (PDF, not read); CBI Globe service page | https://www.cbi-org.eu/Engine/RAServeFile.php/f/Documenti/CBIGlobe/Brochure_CBI_Globe_ITA.pdf ; https://www.cbiglobe.com/Il-servizio/CBI-Globe | 2026-10-02 | high (existence) | No fee schedule found |
| NB-S-36 | Google Cloud — Vertex AI generative AI pricing (Gemini 2.5 Flash-Lite $0.10/$0.40) | https://cloud.google.com/vertex-ai/generative-ai/pricing | 2026-10-02 (fetched) | high | Build-own comparator |
| NB-S-21, S-31 | Anthropic price table (bundled `claude-api` skill cache, 2026-09-25) | docs.anthropic.com pricing (cache; not fetched) | 2026-10-02 | high (first-party cache) | Build-own comparator |
| NB-S-22, S-45 | LiteLLM `model_prices_and_context_window.json` (gpt-5-mini) | https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json | 2026-10-02 | medium | Build-own comparator |
| A-#97 | Yapily docs — Data Plus categorisation requires a separate contract | https://docs.yapily.com/data/data-plus/categorisation | 2026-10-02 (mirror) | high | Enrichment add-on existence |
| A-#52, A-#119 | Tink Data Enrichment product; Salt Edge Data Enrichment docs | https://tink.com/products/data-enrichment/ ; https://docs.saltedge.com/data_enrichment/v5/ | 2026-10-02 | high (existence) | Enrichment add-on existence |
| — | Formula and assumption tables in §1–§2; prior-session scratchpad not retained | local | Repository arithmetic review 2026-10-02 | Arithmetic only | Derived scenarios, not quotes |

## Review log

Repository arithmetic/evidence review — 2026-10-02; no fresh price quotation or procurement performed.

| Critique | Resolution | Remaining evidence / owner |
|---|---|---|
| MAJOR — sensitivity ranges sounded like real list/negotiated prices | All scenarios remain invented sensitivity inputs; no current first-party quote verified; actual values may lie outside ranges | Founder/Providers: written meter, quotas, floor/base fees, calls/retries/setup/renewal and tax/FX terms |
| MAJOR — floor example had wrong denominator/arithmetic | At 1k users×1.8 accounts×€0.30, €250→€1,500 floor yields €0.540→€1.500/user (2.78×), not €0.27→€1.50 | Recompute with actual quote and measured account/user ratio |
| MAJOR — four refreshes represented one billed call each | 216-call example is a single-call assumption; multiple endpoints, pages, retries and service billing may increase it | Providers/Engineering: request accounting and billing definitions |
| MAJOR — every high case claimed below €1/user | Recommendation now identifies several >€1 High cases and floor-dominated seed costs | Business: use Plus-only economics/guardrail, no offer revenue assumption |
| MAJOR — token-only AI cost proved enrichment replacement | Retained/cache inputs not current quotes; total engineering/evaluation/privacy cost and quality omitted; comparator explicitly unequal | Engineering/Privacy: Italian quality benchmark, approved vendor contract and total cost |
| MAJOR — ephemeral script and licensing costs implied repeatable quotation | Formula is explicit; scratchpad availability not claimed; DORA/own-licence scope and cost remain counsel/quote-dependent | Counsel/Brokers: route-C obligations/insurance; provider contract |

**Gate contribution:** arithmetic scenarios useful; provider affordability and Gate C are unvalidated. **Human blockers:** contractual quotes, meter/quota definitions, total compliance/operations costs and real connection ratios. No purchase/contract or live free AIS commitment is authorised here.
