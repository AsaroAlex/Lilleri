# Lilleri unit economics — launch model and explicit sensitivities

**Review date:** 2026-10-02. **Evidence:** external claims and URLs below are inherited from the research; this review rechecks document consistency and arithmetic, not live vendor terms or legal clearance. Source verification dates belong to the cited research. FACT labels there retain the original limitations. All prices, conversion, usage, costs and projections proposed here are ASSUMPTIONS or HYPOTHESES; DECISION means a reversible internal planning choice.

**Delivery boundary (DECISION):** local mock → official sandbox → legally cleared, contracted, consented real-data beta → store launch → later capabilities. Requirements and budgets do not prove implementation. No real-bank keys, bank credentials, purchase, contract, counsel opinion or store billing are obtained by these documents.

## 0. CFO conclusion

The launch ladder is **Gratis / Plus**, with **Famiglia Later** and **Pro reserved for future professional use** (`business-model.md` D-BM-6; brand D7). The former Plus/Pro/Family revenue mix is withdrawn: it monetised capabilities outside the MVP and overstated launch ARPPU. Offers revenue is **€0 in all launch scenarios**. A paid plan is a planned entitlement; the closed beta is free, so paid conversion and the free-cost-per-paid ratio cannot yet be measured.

At Base, net Plus revenue is **€2.85/subscription-month**, paid COGS **€1.07**, and paid contribution **€1.78**. Supporting Gratis users turns subscription-only GP into **−€79.49 per 1,000 MAU** before the provider minimum and fixed costs. Target GP is **€211.17/1,000 MAU (40.7%)**; Optimistic GP is **€482.64 (74.0%)**. These are scenario outputs, not forecasts. The former €3.68 ARPPU, €499 Target GP and ~240k-MAU break-even are superseded.

## 1. Grain, cohorts and denominator checks

| Term | Definition / safeguard |
|---|---|
| MAU | Unique person who opens the app or acts on a service notification during the month; passive background refresh alone does not count |
| Active paid subscription | Paid entitlement active during the month; annual subscribers count in every covered month even when no cash is billed that month; trials excluded |
| Paid member | One person per Plus subscription at launch; Famiglia seats are zero in this model |
| Gratis MAU | MAU minus paid members; split by a billable bank refresh in the month |
| Accounts billed | Contract-defined monthly units, including dormant accounts if billed; never infer invoice relief from lower refresh frequency |
| ARPPU / ARPU | Net recognised subscription revenue per paid subscription / per MAU after VAT and rails; annual cash receipts recognised over 12 months |
| Gross profit | Net recognised revenue minus direct delivery costs; compare to cash runway separately |
| Paid conversions | Cohort conversion with explicit start event, eligibility and elapsed window; paid subscriptions/MAU is a stock ratio, not trial→paid conversion |

Steady-state tables exclude growth backfills/trial costs, refunds, payment failures, tax remittance timing, churn replacement CAC and dormant billable accounts unless explicitly added. They therefore do not establish runway or a funding amount.

## 2. Inputs (range values are ASSUMPTIONS unless explicitly qualified)

IDs are retained for compatibility with research references; U2/U6/U7/U18/U21 no longer create launch revenue.

| ID | Input | Low / Base / High | Evidence / status |
|---|---|---|---|
| U1 | Plus gross monthly / annual price | €3.99/€29.99 · **€4.99/€39.99** · €5.99/€49.99 | HYPOTHESIS; Italian WTP UNKNOWN; `pricing-analysis.md` §7 |
| U2 | Pro price | No launch SKU or price | DECISION; future professional use requires separate research |
| U3 | Famiglia gross price, Later | €8.99/€69.99 · €9.99/€79.99 · €12.99/€99.99 | HYPOTHESIS; sharing and isolation must ship first |
| U4 | Annual share | 40 / 60 / 80% | ASSUMPTION |
| U5 | Italy VAT | 22% | Carried law reference R-BC §8; confirm merchant/tax route before checkout |
| U6/U7 | Launch paid mix / seats | 100% Plus / one member | DECISION; prospective household occupancy not blended into launch |
| U8 | Effective payment take on ex-VAT revenue | 8 / 13 / 16% | ASSUMPTION; includes stores, PSP fixed fees averaged over price/channel/term and billing service; verify exact programme eligibility |
| U9 | AIS per billed account-month | €0.10 / €0.30 / €0.60 | UNKNOWN → ASSUMPTION; R-BC §3, R-OBA/R-OBB |
| U10 | AIS minimum invoice | €0 / €500 / €2,000 monthly | UNKNOWN → ASSUMPTION; max(variable, minimum), not additive unless contract says platform fee + usage |
| U11/U12 | Accounts paid / connected Gratis | 2/1.3 · 3/1.6 · 4.5/2 | ASSUMPTION; Gratis cap is DECISION |
| U13/U14 | Connected Gratis share / dormant relief | 35 / 50 / 65% / unconfirmed | ASSUMPTION / UNKNOWN; bill all contract units if no relief |
| U15 | Bought enrichment / account-month | €0 / €0 / €0.05 | ASSUMPTION; launch building deterministic enrichment |
| U16/U17 | AI per Gratis / Plus member-month | €0.01/€0.02 · €0.02/€0.04 · €0.04/€0.08 | ASSUMPTION on workloads; no paid assistant or OCR promised |
| U18/U21 | Advanced assistant / OCR | Zero launch volume; Later cost envelope €0.05–€0.25 / €0.001–€0.30 per using member | ASSUMPTION; available only after separate product/privacy/cost gates |
| U19/U20 | Marginal infra / SaaS per MAU above fixed reserved capacity | €0.013/€0.001 · €0.034/€0.010 · €0.100/€0.057 | ASSUMPTION; reconcile invoices to avoid fixed/variable double counting |
| U22–U25 | Contacts per 1k, deflection, €/human contact, paid multiplier | 5/70%/€4/1.5 · 15/60%/€6/2 · 40/40%/€8/3 | ASSUMPTION; privacy or billing cases require human support |
| U26 | Other marginal cost/MAU | €0.005 / €0.010 / €0.020 | ASSUMPTION |
| U27/U28 | Paid subs per 1k MAU / registered→paid | 60/2% · 120/4% · 200/7% | ASSUMPTION, different denominators |
| U29/U30 | Monthly churn / annual renewal | 14%/35% · 9%/45% · 6%/60% | ASSUMPTION; cross-category benchmarks are not Italian PFM evidence |
| U31 | Offers revenue/MAU | **€0 launch**; Later sensitivity €0.02/€0.10/€0.25 | ASSUMPTION; lawful monetisation and opt-in not established |
| U32/U33 | CAC per registered / lifetime Gratis active months | €6/2 · €3/3 · €1.50/5 | ASSUMPTION; includes non-payers |
| U35 | Fixed budgets at 1k/10k/100k/1M (Low/Base/High) | €8/20/70/300k · €15/40/120/500k · €30/70/200/900k | ASSUMPTION; `cost-architecture.md` §2; exclude AIS minimum already in direct costs |

## 3. Reproducible formulas

Use fractions (VAT .22, take .13), EUR monetary values and non-overlapping invoice allocations. These finance scenario calculations do not substitute for the product's integer minor-unit ledger.

```text
support         = contactsPerK / 1000 × (1 − deflection) × costContact
baseOther       = infraMarginal + miscSaasMarginal + other
cFreeConnected  = accFree × (aisPrice + enrichment) + aiFree + baseOther + support
cFreeUnconnected= aiFree × .25 + baseOther + support × .5
cPlus           = accPaid × (aisPrice + enrichment) + aiPlus + baseOther + support × paidMultiplier
netPlus         = ((1 − annualShare) × monthlyPrice + annualShare × annualPrice / 12)
                  / (1 + vat) × (1 − takeRate)
paidMembers     = paidSubscriptions                   # launch: one member per Plus
free            = mau − paidMembers
freeConnected   = free × connectedFreeShare
freeUnconnected = free − freeConnected
variableAIS     = (paidMembers × accPaid + freeConnected × accFree) × aisPrice
recognizedRevenue = paidSubscriptions × netPlus + mau × offersPerMau
variableCOGS    = paidMembers × cPlus + freeConnected × cFreeConnected + freeUnconnected × cFreeUnconnected
COGS            = variableCOGS + max(0, minimumInvoice − variableAIS)
                  + dormantBillableAIS + launchCohortBackfillAndPreviewCosts
GP              = recognizedRevenue − COGS
operatingResult = GP − fixedOperatingCosts − incrementalAcquisitionSpend
```

Validate `0 ≤ paidMembers ≤ MAU`, rates in [0,1], prices/costs non-negative and one billing unit per invoice line. Non-MAU paying members and dormant billable accounts must be reported and added as separate cohorts before applying this model to real invoices. For paid customers after cancellation, reconciling/exporting retained data stays free; only future source breadth/automation entitlements change.

## 4. Scenario outputs (per 1,000 MAU before AIS minimum)

| Case | Net Plus | Plus COGS | Contribution | Gratis conn/unconn | Revenue | COGS | GP | GM | Free AIS / paid sub |
|---|---|---|---|---|---|---|---|---|---|
| Pessimistic | €2.52 | €2.63 | −€0.11 | €1.31 / €0.28 | €151.37 | €1,050.89 | −€899.52 | -594.3% | €9.16 |
| Base | €2.85 | €1.07 | €1.78 | €0.59 / €0.08 | €341.91 | €421.40 | −€79.49 | -23.2% | €1.76 |
| Target | €2.88 | €0.74 | €2.14 | €0.39 / €0.07 | €518.76 | €307.59 | €211.17 | 40.7% | €0.61 |
| Optimistic | €3.26 | €0.42 | €2.84 | €0.23 / €0.02 | €652.60 | €169.96 | €482.64 | 74.0% | €0.31 |

Parameters for each case are listed in `revenue-scenarios.md` §1. Pessimistic and Optimistic are combined scenarios within the input envelopes, not simply every table column at once. Base fails the **€0.95** free-AIS guardrail. Target meets that ratio while still losing against the larger stage budgets; one ratio is not Gate C approval.

## 5. CAC, LTV and payback (no offers)

```text
lifetimeMonths = annualShare × 12/(1−annualRenewal) + (1−annualShare)/monthlyChurn
LTVproxy       = contributionPlus × lifetimeMonths
CACpaid        = CACregistered / registeredToPaid
freeBurdenPerPaid = (1−registeredToPaid)/registeredToPaid × activeFreeMonths
                   × (connectedFreeShare × cFreeConnected + (1−connectedFreeShare) × cFreeUnconnected)
loadedCAC      = CACpaid + freeBurdenPerPaid
paybackProxy   = loadedCAC / contributionPlus          # undefined if contribution ≤ 0
```

This is an undiscounted contribution-LTV proxy with stationary survival and no switching between terms. Annual cash, refunds, failed renewals, gross retention, expiry and cohort survival need separate measurement. Free burden is shown here to reveal subsidy; **do not charge it again** in a cohort P&L that already includes Gratis monthly COGS. Preview/trial costs and churn-replacement acquisition must be added once to a real cohort cash model.

| Case | Lifetime | LTV proxy | CAC paid | Gratis burden | Loaded CAC | Loaded payback proxy |
|---|---|---|---|---|---|---|
| Pessimistic | 16.2 mo | −€1.79 | €300.00 | €93.09 | €393.09 | Never |
| Base | 17.5 mo | €31.27 | €75.00 | €24.01 | €99.01 | 55.5 mo |
| Target | 19.4 mo | €41.59 | €40.00 | €12.14 | €52.14 | 24.3 mo |
| Optimistic | 22.0 mo | €62.48 | €21.43 | €7.09 | €28.52 | 10.0 mo |

Target loaded payback (~24 months) exceeds its ~19-month lifetime proxy; paid acquisition does not yet qualify. No scale budget follows from registered-user CAC alone.

## 6. Sensitivities and break-even limits

Single-input moves from launch Base, all other values held fixed; no provider minimum at this steady-state grain.

| Input | Lower / first move → GP per 1k | Higher / second move → GP per 1k | Interpretation |
|---|---|---|---|
| AIS/account | 0.1 → €133.31 | 0.6 → −€398.69 | Invoice unit and dormant relief dominate |
| Paid subscriptions/1k | 60 → −€206.49 | 200 → €89.85 | Stock ratio, not trial conversion |
| Paid accounts/member | 2 → −€43.49 | 4.5 → −€133.49 | Uncapped use needs fair-usage pricing |
| Gratis connected share | 0.35 → −€11.77 | 0.65 → −€147.21 | Better activation can worsen subsidy |
| AI/Plus member | 0.02 → −€77.09 | 0.08 → −€84.29 | Small absolute saving; protect correctness |

Churn affects cohort LTV rather than this stationary monthly GP; 14% vs 6% monthly churn changes Base LTV to ~€28.43 vs ~€35.23. Test jointly with renewal and replacement CAC. A Later offers rail yielding €0.10/MAU adds €100 GP/1k **before its own direct costs**; it cannot be assumed available or net of compliance/support/partner deductions.

At a hypothetical fixed €120k/month, Target needs ~**568k MAU** without offers or ~**332k** with €0.15/MAU incremental net offers. At fixed €500k, those become ~**2.37M / 1.38M**. Holding fixed costs constant across those scales is an illustrative ratio, not a growth plan. Base has negative marginal GP, so more identical users cannot produce break-even. Optimistic needs ~622k MAU against fixed €300k, before acquisition/growth costs. No seed-round size is supportable without a monthly cash-flow path.

## 7. Decisions / Recommendations

| ID | Decision / recommendation |
|---|---|
| D-UE-1 | Launch Base = Plus only, offers €0; show Pessimistic/Base/Target/Optimistic together; Target is a hypothesis, Base is not a guaranteed floor |
| D-UE-2 | Report invoice cost/billed account, free AIS/active paid subscription and paid subscriptions/MAU; during free beta report absolute € and shadow scenarios, never fabricate paid conversion |
| D-UE-3 | AI budget target ≤ €0.10/paid member-month for delivered core; suppress unsupported features before spending more; do not lower confidence to hit the budget |
| D-UE-4 | Scale acquisition only when measured cohort contribution-LTV/CAC and fully allocated payback justify it; Target does not meet the 18-month payback target |
| R-UE-1 | Obtain quotes for usage/minimum/additive platform charges, inactive accounts, seats, reconnects, retries, exports, support and VAT; reconcile actual invoices |
| R-UE-2 | Implement a versioned pure finance model with input validations before treating a dashboard as the source of truth; this document contains formulas, not an implemented package |

## 8. Open questions

Provider billing units and route legality; inactive-but-paid/billable cohorts; Italian observed WTP; independently verified channel fees and rail eligibility; refund/chargeback costs; annual renewal survival; true household occupancy; cash timing and runway; exact count and cost of free preview cohorts. Owners: CFO with CTO (billing/usage), product (cohorts), counsel/tax adviser (legal/fees). No quotes or opinions are implied.

## Review log

| Reviewer | Concrete finding | Resolution |
|---|---|---|
| CFO (major) | €3.68 ARPPU and ~240k Target break-even included an unshipped Pro/Famiglia mix and offers revenue | Recomputed a launch Plus-only, zero-offers model; old outputs withdrawn; documented constant-fixed-cost limits |
| Investor (major) | €40 CAC / 18-month payback overstated acquisition viability | Recomputed Target loaded payback ~24 months; no acquisition scale gate passed |
| CFO (major) | Annual subscribers defined as billed this month; dormant units and minimum charges missing from steady-state grain | Defined active entitlements and invoice-unit allocation, minimum top-up and separate dormant cohorts |
| PM/privacy (major) | AI assistant/OCR/household priced as launch capabilities | Set launch volume to zero and reserved separate Later capability gates |
| CFO (major) | Lifetime subsidy might be added on top of monthly Gratis COGS | Marked loaded CAC as alternate diagnostic; charge subsidy once in cohort P&L |

## 13. Sources

| ID | Source | URL | Date seen | Reliability | Used for |
|---|---|---|---|---|---|
| R-BC | `business-and-cost-inputs.md` §3–§14 (inputs 1–50) | repo | 2026-10-02 | medium–high (vendor prices high; volumes ASSUMPTION) | All unit prices and ranges |
| R-OBA | `open-banking-providers-a.md` §1.5, §2.1, §6 | repo | 2026-10-02 | medium | Pricing opacity, 4×/day, consent cycle |
| R-OBB | `open-banking-providers-b.md` §4, §16.2, §17 | repo | 2026-10-02 | medium–high | Enable Banking per-account model, minimum invoice |
| R-AI | `ai-ml-transaction-intelligence.md` §2.4, §5.3, §7.2 | repo | 2026-10-02 | high (prices) / medium (volumes) | AI cost per 1 k transactions, caching minimums |
| R-BB | `build-vs-buy-and-vendors.md` §0, §3, §5–§10, §18 | repo | 2026-10-02 | medium–high | Infra/SaaS unit prices, AI vendor costs |
| R-EU | `competitors-eu-uk.md` S-68 (Finanzguru revenue), §5 | repo | 2026-10-02 | medium-high | Revenue per user benchmark |
| R-US | `competitors-us.md` W12 (Monarch $100 M ARR), W5 | repo | 2026-10-02 | high | Revenue per member benchmark |
| R-PP | `user-pain-points.md` §F | repo | 2026-10-02 | medium | Price/retention signals |
| AN-1 | Anthropic pricing and prompt-caching pages | https://platform.claude.com/docs/en/about-claude/pricing ; https://platform.claude.com/docs/en/build-with-claude/prompt-caching | 2026-10-02 (via R-AI/R-BC) | high | AI unit prices |
| EB-1 | Enable Banking FAQ (pricing model) | https://enablebanking.com/docs/faq/ | 2026-10-02 (mirror + snippet) | high | Per-account billing, minimum invoice |
| AP-1 / GP-1 | Apple Apps in the EU; Android Developers Blog Jun 2026 | https://developer.apple.com/support/apps-in-the-eu/ ; https://android-developers.googleblog.com/2026/06/play-expanded-billing.html | 2026-10-02 (via R-BC) | high / medium-high | Take rates |
| RC-1 | RevenueCat docs | https://www.revenuecat.com/docs/welcome/set-up-revenuecat/account-management | 2026-10-02 (via R-BC) | high | 1 % above $2.5 k MTR |
| W-1 | RevenueCat State of Subscription Apps 2026 | https://www.revenuecat.com/state-of-subscription-apps | 2026-10-02 | medium (search summary) | Hard-paywall vs freemium conversion, annual retention |
