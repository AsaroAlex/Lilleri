# Lilleri revenue scenarios — launch Plus-only, 1k / 10k / 100k / 1M MAU

**Review date:** 2026-10-02. **Evidence:** external claims and URLs below are inherited from the research; this review rechecks document consistency and arithmetic, not live vendor terms or legal clearance. Source verification dates belong to the cited research. FACT labels there retain the original limitations. All prices, conversion, usage, costs and projections proposed here are ASSUMPTIONS or HYPOTHESES; DECISION means a reversible internal planning choice.

**Delivery boundary (DECISION):** local mock → official sandbox → legally cleared, contracted, consented real-data beta → store launch → later capabilities. Requirements and budgets do not prove implementation. No real-bank keys, bank credentials, purchase, contract, counsel opinion or store billing are obtained by these documents.

## 0. Gate C verdict

**DECISION — CONDITIONAL for further research and local/sandbox work; economically unvalidated for launch.** Base launch GP is negative. Target has positive marginal contribution but remains loss-making at each Base fixed-cost stage. Only the Optimistic subscription-only case is profitable at 1M MAU in these static tables. Neither free beta, a legal offer hypothesis nor a spreadsheet passes a production gate.

The earlier €0.54 Base ARPU, ~€0.50 Target GP/MAU, ~240k-MAU break-even and €1.5–2.5M seed estimate are withdrawn because they assumed an unavailable Pro/Famiglia/offer mix and an unspecified cash path. Launch recognised ARPU is **€0.342 Base / €0.519 Target**. The plan must be able to state its funding need without promising later commercial uses of bank data.

## 1. Parameter sets (ASSUMPTIONS; prices Plus €4.99 / €39.99 incl. VAT)

| Input | Pessimistic | Base | Target | Optimistic |
|---|---|---|---|---|
| AIS price / minimum invoice | €0.45 / €2,000 | €0.30 / €500 | €0.20 / €500 | €0.15 / €0 |
| Paid Plus subscriptions / 1k MAU | 60 | 120 | 180 | 200 |
| Paid mix / members per subscription | 100% Plus / 1 | 100% Plus / 1 | 100% Plus / 1 | 100% Plus / 1 |
| Annual share / effective take | 80% / 16% | 60% / 13% | 60% / 12% | 40% / 8% |
| Connected Gratis share × accounts | 65% × 2.0 | 50% × 1.6 | 45% × 1.5 | 40% × 1.3 |
| Paid accounts/member | 4.0 | 3.0 | 3.0 | 2.5 |
| AI per Gratis / Plus member | €0.04 / €0.08 | €0.02 / €0.04 | €0.02 / €0.04 | €0.01 / €0.02 |
| Marginal infra/SaaS/other per MAU | €0.100/0.057/0.020 | €0.034/0.010/0.010 | €0.030/0.008/0.010 | €0.013/0.001/0.005 |
| Contacts per 1k / deflection / human cost / paid multiplier | 40 / 40% / €8 / 3 | 15 / 60% / €6 / 2 | 12 / 65% / €6 / 2 | 5 / 70% / €4 / 1.5 |
| Offers revenue / Famiglia seats / Pro subscribers | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| Fixed budget set | High | Base | Base | Low |

Ranges derive from R-BC/R-OBA/R-OBB and the labelled inputs of `unit-economics.md` §2. Fees and prices remain unconfirmed. Account limits are product hypotheses; coverage is per bank/account type and stage, not a number implied by a price.

## 2. User cohorts by scale

Plus paid members = subscriptions; Gratis = MAU − paid members. The closed beta actually charges nobody; the 1k rows simulate a future monetised cohort of that size. Unconnected Gratis includes manual/import/paused users. Family-sharing seats are deliberately absent until implemented.

| MAU | Case | Plus subscriptions/members | Gratis MAU | Gratis connected | Gratis unconnected |
|---|---|---|---|---|---|
| 1,000 | Pessimistic | 60 | 940 | 611 | 329 |
| 1,000 | Base | 120 | 880 | 440 | 440 |
| 1,000 | Target | 180 | 820 | 369 | 451 |
| 1,000 | Optimistic | 200 | 800 | 320 | 480 |
| 10,000 | Pessimistic | 600 | 9,400 | 6,110 | 3,290 |
| 10,000 | Base | 1,200 | 8,800 | 4,400 | 4,400 |
| 10,000 | Target | 1,800 | 8,200 | 3,690 | 4,510 |
| 10,000 | Optimistic | 2,000 | 8,000 | 3,200 | 4,800 |
| 100,000 | Pessimistic | 6,000 | 94,000 | 61,100 | 32,900 |
| 100,000 | Base | 12,000 | 88,000 | 44,000 | 44,000 |
| 100,000 | Target | 18,000 | 82,000 | 36,900 | 45,100 |
| 100,000 | Optimistic | 20,000 | 80,000 | 32,000 | 48,000 |
| 1,000,000 | Pessimistic | 60,000 | 940,000 | 611,000 | 329,000 |
| 1,000,000 | Base | 120,000 | 880,000 | 440,000 | 440,000 |
| 1,000,000 | Target | 180,000 | 820,000 | 369,000 | 451,000 |
| 1,000,000 | Optimistic | 200,000 | 800,000 | 320,000 | 480,000 |

## 3. Monthly static P&L (HYPOTHESES, EUR)

Revenue excludes VAT and fees. COGS adds `max(0, minimumInvoice − variableAIS)` exactly once. Fixed budgets exclude AIS minimum and marginal delivery cost; they include people and fixed reserved capacity. Profits exclude incremental growth spend, new-cohort preview/backfill costs, unknown dormant account bills and financing. These omissions must be funded before launch.

| MAU | Case | Net revenue | Direct COGS | Gross profit | GM | Fixed budget | Operating result |
|---|---|---|---|---|---|---|---|
| 1,000 | Pessimistic | €151 | €2,393 | −€2,242 | -1480.9% | €30,000 | −€32,242 |
| 1,000 | Base | €342 | €602 | −€260 | -76.1% | €15,000 | −€15,260 |
| 1,000 | Target | €519 | €589 | −€70 | -13.5% | €15,000 | −€15,070 |
| 1,000 | Optimistic | €653 | €170 | €483 | 74.0% | €8,000 | −€7,517 |
| 10,000 | Pessimistic | €1,514 | €10,509 | −€8,995 | -594.3% | €70,000 | −€78,995 |
| 10,000 | Base | €3,419 | €4,214 | −€795 | -23.2% | €40,000 | −€40,795 |
| 10,000 | Target | €5,188 | €3,076 | €2,112 | 40.7% | €40,000 | −€37,888 |
| 10,000 | Optimistic | €6,526 | €1,700 | €4,826 | 74.0% | €20,000 | −€15,174 |
| 100,000 | Pessimistic | €15,137 | €105,089 | −€89,952 | -594.3% | €200,000 | −€289,952 |
| 100,000 | Base | €34,191 | €42,140 | −€7,949 | -23.2% | €120,000 | −€127,949 |
| 100,000 | Target | €51,876 | €30,759 | €21,117 | 40.7% | €120,000 | −€98,883 |
| 100,000 | Optimistic | €65,260 | €16,996 | €48,264 | 74.0% | €70,000 | −€21,736 |
| 1,000,000 | Pessimistic | €151,365 | €1,050,886 | −€899,521 | -594.3% | €900,000 | −€1,799,521 |
| 1,000,000 | Base | €341,910 | €421,400 | −€79,490 | -23.2% | €500,000 | −€579,490 |
| 1,000,000 | Target | €518,760 | €307,588 | €211,172 | 40.7% | €500,000 | −€288,828 |
| 1,000,000 | Optimistic | €652,597 | €169,960 | €482,637 | 74.0% | €300,000 | €182,637 |

## 4. Fixed budgets and implied team (ASSUMPTIONS)

| Stage | Low / Base / High monthly | Team envelope |
|---|---|---|
| 1k MAU | €8k / €15k / €30k | 2–4 founders/contractors; roles may be combined |
| 10k | €20k / €40k / €70k | ~3–7 people; compliance and support cannot be unpaid assumptions |
| 100k | €70k / €120k / €200k | ~7–18 people; no automatic hire because MAU crossed a threshold |
| 1M | €300k / €500k / €900k | ~25–65 people, market support/translation/legal needs uncertain |

Budgets are envelopes, not vendor quotes or reconciled accounting totals. A ~€120k fixed team needs ~568k MAU at Target static GP before acquisition; a ~€500k team needs ~2.37M. Holding budgets flat while scaling is illustrative only. One-million MAU is a scale sensitivity; Italian attainable demand and the need for European expansion are UNKNOWN, not implied by competitor registered-user counts.

## 5. Later sensitivities and funding discipline

- A lawful offers rail with **incremental net** €0.15/MAU would add €15k/month at 100k MAU and €150k at 1M, before any unallocated rail costs. Target would still lose ~€83.9k and ~€138.8k respectively against Base fixed budgets. This is not permission or proof of an available product.
- Famiglia at hypothetical €9.99/€79.99 nets ~€5.70/month at Base. At Plus core delivery cost €1.066/person, two / 2.3 / five fully active members cost €2.13 / €2.45 / €5.33 before sharing overhead. A five-seat claim gives little cushion (~€0.37) and cannot be priced from average occupancy alone. Test a two-adult household first; no committed seat count.
- A higher Plus price or bounded/time-boxed Gratis sync may change GP; re-run joint conversion, coverage and churn sensitivity. A price increase is not revenue at unchanged demand.
- Funding remains UNKNOWN. Build a monthly cash model with starting cash, growth, spend, cohort conversion, minimum fees, trial costs, VAT settlement, annual receipts/refunds, legal/insurance, hiring and contingency; do not reuse the retired seed estimate.

## 6. Gate C conditions (DECISION; internal research gate, no approval substitute)

| Condition | Evidence required | State / action if missed |
|---|---|---|
| C1 Contracted AIS economics | Written billing unit, dormant rules, platform minimum/fee, volume ladder and actual coverage; €0.20/account is a Target hypothesis | UNKNOWN; keep mock/sandbox; re-run F/F′ before promising Gratis live sync |
| C2 Retained paid demand | Post-billing cohort paid share, renewal and contribution; 180 paid subscriptions/1k MAU is a Target hypothesis | UNKNOWN; beta willingness is distinct from collected revenue |
| C3 Launch subsidy | Free AIS/active paid subscription ≤ €0.95 with non-zero paid denominator; full blended GP > 0 and a funded operating path | Base ratio €1.76 fails; two measured misses trigger new-cohort F′ review; existing promises require notice and funding |
| C4 Fixed/cash discipline | Monthly forecast funds stage costs, support, acquisition and contingencies; no duplicated minimum/cost lines | UNKNOWN; no hires or scale launch inferred from scenario size |
| C5 Acquisition | Measured contribution-LTV/CAC sustainable and loaded payback target ≤18 months | Base ~56 / Target ~24 months fail; organic discovery and bounded research tests only |
| C6 Legal production route | Written counsel route/taxonomy opinions, accepted licence/contract route, DPIA, verified consent and security gates | OPEN; user opt-in alone does not resolve a licensing or prohibited-purpose issue |

Offers are Later and excluded from C1–C5. Opening them requires a separate legal, commercial, product and trust gate; a checkbox cannot legalise otherwise prohibited processing. Gate C will be re-evaluated when provider quotes and actual eligible paid cohorts exist.

## 7. Decisions / Recommendations

| ID | Decision / recommendation |
|---|---|
| D-RS-1 | Gate C conditional/unvalidated; use Plus-only, €0-offers launch scenarios; show Base and downside whenever showing Target |
| D-RS-2 | Freeze a versioned finance model only when implemented and reconciled to this arithmetic; no `scenarios.json` implementation is claimed |
| D-RS-3 | Stage fixed budgets are assumptions; commitments require funded cash projections and real usage quotes |
| D-RS-4 | 1M MAU is a sensitivity, not validated Italy/Europe market size |
| R-RS-1 | Replace assumptions with invoice, paid cohort and support evidence; before billing, report shadow economics explicitly |
| R-RS-2 | Ask counsel and providers before accessing real beta data; keep licence, data, security and business gates separate |

## 8. Open questions

Written AIS fee ladder and coverage; actual dormant-unit billing; Italian paid demand and retention; marginal vs fixed cloud allocation; household seats and cost; legal route and referral restrictions; cash runway; addressable demand. Verify through quotes, appropriately consented and cleared beta cohorts, and counsel/tax advice. No outreach or spend is executed by this review.

## Review log

| Reviewer | Finding | Resolution |
|---|---|---|
| Investor/CFO (blocker) | Conditional pass relied on Pro/Famiglia/offer revenue not present in MVP | Replaced all scale tables with Plus-only subscription revenue; Gate C now conditional and economically unvalidated |
| CFO (major) | Provider minimum was listed in fixed composition and direct COGS | Budget grain now excludes provider minimum; top-up appears once in direct costs |
| Investor (major) | €1.5–2.5M seed round and ~240k-MAU break-even had no audited monthly cash path | Withdrawn; constant-cost break-even labelled illustrative; funding UNKNOWN |
| PM (major) | Five-seat household priced from average seats and presented for launch | Famiglia Later; two/2.3/five-seat stress case and uncommitted occupancy added |

## 9. Sources

| ID | Source | URL | Date seen | Reliability | Used for |
|---|---|---|---|---|---|
| UE | `docs/business/unit-economics.md` (inputs U1–U35, formulas §3–§9) | repo | 2026-10-02 | HYPOTHESIS (derived) | All computed figures |
| CA | `docs/business/cost-architecture.md` §2 | repo | 2026-10-02 | ASSUMPTION | Fixed-cost ranges and team sizes |
| R-BC | `business-and-cost-inputs.md` §1.4, §3, §12–§14 | repo | 2026-10-02 | medium–high | Ranges, scale references, affiliate anchors |
| R-EU | `competitors-eu-uk.md` S-67, S-68 (Plum, Finanzguru scale) | repo | 2026-10-02 | medium-high | Scale comparables |
| R-US | `competitors-us.md` W12, W13 (Monarch ARR, members) | repo | 2026-10-02 | high | Scale comparables |
| R-OBA / R-OBB | `open-banking-providers-a.md` §6; `open-banking-providers-b.md` §13, §15, §17 | repo | 2026-10-02 | medium–high | RFP questions, own-AISP costs, legal P0 |
| R-IT | `competitors-italy-and-ai-first.md` §6 (market sizing placeholders) | repo | 2026-10-02 | low (ASSUMPTION) | Italian population/accounts ranges |
| R-PP | `user-pain-points.md` §F, §H | repo | 2026-10-02 | medium | Free-tier and pricing constraints |
