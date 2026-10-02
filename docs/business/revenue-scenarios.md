# Lilleri revenue scenarios — 1k / 10k / 100k / 1M users, mixes, margins, fixed costs, team, Gate C

**Project:** LILLERI (consumer PFM, Italy-first then Europe)
**Document date / verification date of carried-over claims:** 2026-10-02
**Inputs:** the inputs table and formulas of `unit-economics.md` (U1–U35), the decisions of `business-model.md` and `pricing-analysis.md`, fixed-cost ranges from `cost-architecture.md`, and the raw research (R-BC, R-OBA, R-OBB, R-US, R-EU, R-IT, R-PP, R-AI, R-BB).
**Method:** four parameter sets (Pessimistic / Base / Target / Optimistic) run through the same formulas at four scales. "Users" below means **MAU** (monthly active users); registered users are typically 2–4× MAU (ASSUMPTION; finance-app D30 retention 4–9 %, R-BC §12). All outputs are HYPOTHESES derived from ASSUMPTION inputs; the only FACTs are the unit prices behind them.
**Label key:** FACT · ASSUMPTION · HYPOTHESIS · DECISION · OPEN QUESTION · UNKNOWN.

---

## 0. Summary and Gate C verdict in one paragraph

At **Base** inputs (AIS €0.30 per account-month, 120 paid subscriptions per 1,000 MAU, consented offers €0.10 per MAU) Lilleri earns €0.54 per MAU per month and keeps €0.09 after COGS; it loses money at every scale against the stage fixed costs (−€39 k/month at 10 k MAU, −€111 k at 100 k, −€408 k at 1 M). At **Target** inputs (AIS €0.20, 180 subscriptions per 1,000 MAU, offers €0.15 per MAU, lean fixed costs) it keeps €0.50 per MAU, breaks even at ≈ 240 k MAU with a €120 k/month team and runs at ≈ €10 M annual revenue and break-even to modest profit at 1 M MAU. The **Optimistic** case is profitable from ≈ 100 k MAU; the **Pessimistic** case (AIS €0.45, 60 subscriptions per 1,000 MAU) is unrecoverable at any scale and must trigger the free-tier fallback. **Gate C verdict: CONDITIONAL PASS** — the business is potentially sustainable only inside the corridor defined in §6, and the three gating inputs (AIS price, paid share, offers rail) are UNKNOWN today. Proceed to Phase 2 with the RFP and the beta designed to measure them, and with the kill criteria in §6 written into the plan.

---

## 1. Scenario definitions

| Input (ID in `unit-economics.md`) | Pessimistic | Base | **Target (plan of record)** | Optimistic | Source of range |
|---|---|---|---|---|---|
| AIS price per account-month (U9) | €0.45 | €0.30 | **€0.20** | €0.15 | R-BC §3 (UNKNOWN → ASSUMPTION) |
| AIS monthly minimum (U10) | €2,000 | €500 | €500 | €0 | R-BC §3 |
| Paid subscriptions per 1,000 MAU (U27) | 60 | 120 | **180** | 200 | ASSUMPTION; UNKNOWN for all competitors |
| Paid mix Plus/Pro/Family (U6) | 80/10/10 | 65/15/20 | **60/15/25** | 50/20/30 | ASSUMPTION |
| Members per Family (U7) | 3.0 | 2.3 | 2.3 | 2.0 | ASSUMPTION |
| Annual share (U4) | 80 % | 60 % | 60 % | 40 % | R-BC §12 |
| Take rate (U8) | 16 % | 13 % | **12 %** | 8 % | FACT rates / ASSUMPTION mix |
| Free MAU connected (U13) × accounts (U12) | 65 % × 2.0 | 50 % × 1.6 | **45 % × 1.5** | 40 % × 1.3 | ASSUMPTION |
| Paid accounts per member (U11) | 4.0 | 3.0 | 3.0 | 2.5 | R-IT (3–5 relationships) |
| AI per free / Plus / Pro member (U16–U18) | €0.04 / 0.08 / 0.25 | €0.02 / 0.04 / 0.10 | €0.02 / 0.04 / 0.10 | €0.01 / 0.02 / 0.05 | R-AI §7.2 |
| Infra + SaaS per MAU (U19+U20) | €0.157 | €0.044 | €0.038 | €0.014 | R-BC §6–§10 |
| Support contacts /1,000 MAU, deflection, cost (U22–U24) | 40, 40 %, €8 | 15, 60 %, €6 | 12, 65 %, €6 | 5, 70 %, €4 | R-BC §11 |
| Consented offers per MAU (U31) | €0.02 | €0.10 | **€0.15** | €0.25 | R-BC §13 (halved for opt-in) |
| Fixed-cost set (U35) | High | Base | Base (lean variant also shown) | Low | `cost-architecture.md` |
| Net ARPPU (output) | €2.93 | €3.68 | €3.87 | €4.64 | — |
| Contribution per subscription (output) | −€0.19 | €2.30 | €2.84 | €4.06 | — |
| GP per 1,000 MAU (output) | −€873 | €92 | **€499** | €983 | — |

---

## 2. User mixes at each scale (Free / Paid / Family)

Paid subscriptions = subs per 1,000 MAU × scale; Family subscriptions = mix × subs; paid members include Family members; free MAU = MAU − paid members; connected free = free × U13.

| Scale (MAU) | Case | Paid subs | of which Plus / Pro / Family | Paid members | Free MAU | Free connected | Free unconnected |
|---|---|---|---|---|---|---|---|
| 1,000 | Pessimistic | 60 | 48 / 6 / 6 | 72 | 928 | 603 | 325 |
| 1,000 | Base | 120 | 78 / 18 / 24 | 151 | 849 | 424 | 424 |
| 1,000 | Target | 180 | 108 / 27 / 45 | 238 | 762 | 343 | 419 |
| 1,000 | Optimistic | 200 | 100 / 40 / 60 | 260 | 740 | 296 | 444 |
| 10,000 | Pessimistic | 600 | 480 / 60 / 60 | 720 | 9,280 | 6,032 | 3,248 |
| 10,000 | Base | 1,200 | 780 / 180 / 240 | 1,512 | 8,488 | 4,244 | 4,244 |
| 10,000 | Target | 1,800 | 1,080 / 270 / 450 | 2,376 | 7,624 | 3,431 | 4,193 |
| 10,000 | Optimistic | 2,000 | 1,000 / 400 / 600 | 2,600 | 7,400 | 2,960 | 4,440 |
| 100,000 | Pessimistic | 6,000 | 4,800 / 600 / 600 | 7,200 | 92,800 | 60,320 | 32,480 |
| 100,000 | Base | 12,000 | 7,800 / 1,800 / 2,400 | 15,120 | 84,880 | 42,440 | 42,440 |
| 100,000 | Target | 18,000 | 10,800 / 2,700 / 4,500 | 23,760 | 76,240 | 34,308 | 41,932 |
| 100,000 | Optimistic | 20,000 | 10,000 / 4,000 / 6,000 | 26,000 | 74,000 | 29,600 | 44,400 |
| 1,000,000 | Pessimistic | 60,000 | 48,000 / 6,000 / 6,000 | 72,000 | 928,000 | 603,200 | 324,800 |
| 1,000,000 | Base | 120,000 | 78,000 / 18,000 / 24,000 | 151,200 | 848,800 | 424,400 | 424,400 |
| 1,000,000 | Target | 180,000 | 108,000 / 27,000 / 45,000 | 237,600 | 762,400 | 343,080 | 419,320 |
| 1,000,000 | Optimistic | 200,000 | 100,000 / 40,000 / 60,000 | 260,000 | 740,000 | 296,000 | 444,000 |

Registered-user equivalents (ASSUMPTION: MAU ≈ 35 % of registered at Base, 25 % Pessimistic, 45 % Optimistic): 100 k MAU ≈ 220–400 k registered; 1 M MAU ≈ 2.2–4 M registered — i.e., the 1 M-MAU scenario is a Finanzguru-sized Italian product (> 3 M users, FACT R-EU S-68) and not plausible in Italy alone before a European rollout (HYPOTHESIS).

---

## 3. Monthly revenue, COGS, gross margin, fixed costs, net — by scale

Revenue = subscriptions (net of VAT and rails) + consented offers. COGS includes the AIS minimum invoice as a step (U10). Fixed costs per `cost-architecture.md` §2 (Pessimistic = High set, Base/Target = Base set, Optimistic = Low set; Target "lean" = Low set).

### 3.1 At 1,000 MAU (closed beta)

| Case | Revenue | of which offers | COGS | Gross profit | GM | Fixed | Net | Team (FTE) |
|---|---|---|---|---|---|---|---|---|
| Pessimistic | €196 | €20 | €2,396 (AIS min €2,000) | −€2,200 | n/m | €30,000 | **−€32,200** | 4 |
| Base | €542 | €100 | €610 (AIS min €500) | −€68 | −13 % | €15,000 | **−€15,068** | 3 (+ contractors) |
| Target | €846 | €150 | €602 | €245 | 29 % | €15,000 | **−€14,755** | 3 |
| Optimistic | €1,178 | €250 | €195 | €983 | 83 % | €8,000 | **−€7,017** | 2–3 |

### 3.2 At 10,000 MAU (open beta → launch)

| Case | Revenue | of which offers | COGS | Gross profit | GM | Fixed | Net | Team (FTE) |
|---|---|---|---|---|---|---|---|---|
| Pessimistic | €1,959 | €200 | €10,685 | −€8,727 | −446 % | €70,000 | **−€78,727** | 7 |
| Base | €5,418 | €1,000 | €4,494 | €924 | 17 % | €40,000 | **−€39,076** | 5 |
| Target | €8,463 | €1,500 | €3,475 | €4,989 | 59 % | €40,000 (lean €20,000) | **−€35,011** (lean −€15,011) | 5 (lean 3–4) |
| Optimistic | €11,781 | €2,500 | €1,947 | €9,834 | 83 % | €20,000 | **−€10,166** | 3–4 |

### 3.3 At 100,000 MAU (Italy at scale)

| Case | Revenue | of which offers | COGS | Gross profit | GM | Fixed | Net | Team (FTE) |
|---|---|---|---|---|---|---|---|---|
| Pessimistic | €19,588 | €2,000 | €106,854 | −€87,266 | −446 % | €200,000 | **−€287,266** | 18 |
| Base | €54,182 | €10,000 | €44,938 | €9,244 | 17 % | €120,000 | **−€110,756** | 12 |
| Target | €84,631 | €15,000 | €34,746 | €49,885 | 59 % | €120,000 (lean €70,000) | **−€70,115** (lean −€20,115) | 12 (lean 7–8) |
| Optimistic | €117,809 | €25,000 | €19,468 | €98,342 | 83 % | €70,000 | **+€28,342** | 7–8 |

Annualised revenue at 100 k MAU: Pessimistic €0.24 M, Base €0.65 M, Target €1.0 M, Optimistic €1.4 M.

### 3.4 At 1,000,000 MAU (Italy + first European markets)

| Case | Revenue | of which offers | COGS | Gross profit | GM | Fixed | Net | Team (FTE) |
|---|---|---|---|---|---|---|---|---|
| Pessimistic | €195,877 | €20,000 | €1,068,539 | −€872,662 | −446 % | €900,000 | **−€1,772,662** | 65 |
| Base | €541,817 | €100,000 | €449,378 | €92,439 | 17 % | €500,000 | **−€407,561** | 40 |
| Target | €846,311 | €150,000 | €347,458 | €498,853 | 59 % | €500,000 (lean €300,000) | **−€1,147 ≈ break-even** (lean +€198,853) | 40 (lean 25–30) |
| Optimistic | €1,178,094 | €250,000 | €194,678 | €983,416 | 83 % | €300,000 | **+€683,416** | 25–30 |

Annualised revenue at 1 M MAU: Pessimistic €2.4 M, Base €6.5 M, Target €10.2 M, Optimistic €14.1 M. For scale: Finanzguru ≈ €40 M on > 3 M users (FACT medium, R-EU S-68); Plum £34 M ARR on 2 M customers / 5 M downloads (FACT medium, R-EU S-67); Monarch $100 M ARR on > 1 M paying-centric members (FACT, R-US W12).

---

## 4. Fixed-cost ranges and implied team by stage (ASSUMPTION; detail in `cost-architecture.md` §2)

| Stage (MAU) | Low | Base | High | Base composition (monthly) | Team implied (Low / Base / High) |
|---|---|---|---|---|---|
| 1 k (closed beta) | €8 k | €15 k | €30 k | 3 founders at minimal pay €6 k; legal/DPO/compliance €2.5 k; AIS minimum €0.5 k; infra €0.3 k; tooling/stores €0.4 k; insurance/accounting €0.8 k; contractors/design €4.5 k | 2–3 / 3 / 4 |
| 10 k (launch) | €20 k | €40 k | €70 k | team of 5 €28 k; compliance/DPO €3 k; AIS minimum €0.5–2 k; infra €1 k; tooling €1 k; part-time support €1.5 k; marketing €3 k; G&A €2 k | 3–4 / 5 / 7 |
| 100 k | €70 k | €120 k | €200 k | team of 12 €85 k (7 eng, 2 product/design, 2 support, 1 growth); compliance/legal/audit €6 k; infra €4 k; tooling €3 k; marketing €10 k; insurance (PII if own AISP) €3 k; own-AISP registration amortised €3 k; G&A €6 k | 7–8 / 12 / 18 |
| 1 M | €300 k | €500 k | €900 k | team of 40 €330 k; marketing €60 k; compliance/regulatory €25 k; infra €30 k; tooling €15 k; G&A €40 k | 25–30 / 40 / 65 |

Italian fully-loaded cost per person: €5–7 k/month mid-level, €8–11 k senior (ASSUMPTION; RAL €40–75 k plus ≈ 35–40 % contributions and overhead). Marketing is treated as fixed here; `go-to-market.md` sets the variable CAC envelope.

---

## 5. What drives the difference between cases (decomposition, per 1,000 MAU, Base → Target)

| Step | GP per 1,000 MAU | Δ | Driver |
|---|---|---|---|
| Base | €92 | — | — |
| + AIS €0.30 → €0.20 | €206 | +€113 | RFP outcome / per-user pricing / sync pause |
| + subscriptions 120 → 180 | €385 | +€180 | Free tier as a funnel; 30-day trial; multi-institution upgrade |
| + offers €0.10 → €0.15 | €435 | +€50 | Phase-2 offers rail (opt-in) |
| + mix 65/15/20 → 60/15/25, take 13 → 12 % | €461 | +€26 | Family adoption; web rail share |
| + free connected 50 % × 1.6 → 45 % × 1.5; support 15 → 12 contacts at 65 % deflection; infra/SaaS | €499 | +€37 | Sync pause, consent-expiry UX, support deflection |
| **Target** | **€499** | | |

(Steps are sequential and computed with the `unit-economics.md` formulas; order changes the attribution slightly. HYPOTHESIS.)

---

## 6. Gate C — "Is the business potentially sustainable?" (DECISION)

**Verdict: CONDITIONAL PASS.** The unit economics of a paying subscriber are sound (Plus 62 % contribution margin at Base, Pro 75 %), and the Target case produces a software-grade 59 % blended gross margin with break-even around 240 k MAU on a 12-person team. But the Base case — which uses the midpoint of every unknown — does not break even at any scale, and the Pessimistic case loses more than it earns on every user. Sustainability therefore depends on three inputs that cannot be known before the RFP and the beta.

| Condition | Threshold for PASS | Status today | How/when measured | If missed |
|---|---|---|---|---|
| C1 AIS price per connected account-month (or per-user equivalent) | ≤ €0.20 at 25 k accounts (≤ €0.25 acceptable with per-user/lite pricing for free users) | UNKNOWN (range €0.10–0.60) | RFP answers, 2–4 weeks | Switch free tier to F′ "Free Classic" (90-day full sync then import-only); re-run scenarios; at > €0.35 consider trial-gated G |
| C2 Paid subscriptions per 1,000 MAU | ≥ 180 by month 9 of open beta (≥ 120 by month 6) | UNKNOWN (60–200) | Beta cohorts, monthly | Tighten free envelope (1 account), raise trial conversion work, test €5.99 |
| C3 Consented offers revenue per MAU | ≥ €0.15 by 100 k MAU (opt-in rate ≥ 25 %, no NPS penalty) | UNKNOWN (€0.02–0.25) | Phase-2 experiments with 2 bank partners + 1 comparator | Plan for subscription-only economics: requires C1 ≤ €0.15 and C2 ≥ 220 |
| C4 Fixed cost discipline | ≤ €40 k/month until 10 k MAU; ≤ €120 k until 250 k MAU | DECISION | Monthly | Hiring freeze rule in `cost-architecture.md` |
| C5 Blended CAC per registered user | ≤ €2 (organic/referral-led); loaded payback ≤ 18 months | ASSUMPTION €3 Base | `go-to-market.md` dashboard | No paid UA beyond tests |
| C6 Legal basis for the licence route and the offers rail (PSD2 art. 67(2)(f); Banca d'Italia position on recipient model) | Counsel memo clears both | UNKNOWN (P0 in R-OBA §6 #3, R-OBB §15) | Counsel, before production | Route B (agent) or own-AISP registration budget (€40–150 k one-off) enters fixed costs |

Funding implication (HYPOTHESIS; sum of monthly nets along a growth path of 1 k → 10 k MAU in 6 months and 10 k → 100 k in 18 months, fixed costs interpolated between stages): cumulative net loss to reach 100 k MAU is ≈ **€0.55 M** in the Target case with lean fixed costs, ≈ **€1.3 M** in the Target case with Base fixed costs, ≈ **€1.6 M** in the Base case (which then keeps losing ≈ €110 k/month at 100 k MAU), and ≈ €0.2 M in the Optimistic case. Add working capital, the provider minimum invoices, a possible own-AISP registration (€40–150 k) and a 30 % contingency: a seed round of **€1.5–2.5 M** covers the Target path to 100 k MAU with a lean team; the Pessimistic case should not be funded past the beta. These are order-of-magnitude figures for Phase 2 planning, not a financial plan.

---

## 7. Decisions / Recommendations

| ID | Decision / recommendation |
|---|---|
| D-RS-1 | Gate C = CONDITIONAL PASS; proceed to Phase 2 with conditions C1–C6 as explicit gates; the plan of record is the Target case; pitches must show Base alongside Target |
| D-RS-2 | The scenario parameter sets in §1 are frozen as `scenarios.json` in the finance model package; any change is a reviewed commit |
| D-RS-3 | Stage budgets: fixed ≤ €15 k (closed beta), ≤ €40 k (launch), ≤ €120 k (to 250 k MAU); hiring beyond this requires C1 and C2 to be measured and inside thresholds |
| D-RS-4 | The 1 M-MAU scenario assumes European expansion; do not plan Italian-only growth beyond ≈ 300 k MAU without evidence (Italy adult population ≈ 50 M; multi-account early adopters UNKNOWN) |
| R-RS-1 | Build the beta dashboard around the three gating KPIs (AIS cost per paid subscription, paid subscriptions per 1,000 MAU, offers revenue per MAU) plus the funnel (`go-to-market.md` §8) |
| R-RS-2 | Run the RFP before Phase 3 architecture decisions that depend on provider billing granularity (per account vs per user vs per call) |

---

## 8. Open questions

| # | Question | Why | How to verify |
|---|---|---|---|
| Q1 | AIS price ladder and billing granularity | C1 | RFP (5 providers), identical volume ladder |
| Q2 | Paid share of MAU for a 1-institution free tier in Italy | C2 | Beta (≥ 2,000 MAU, 3 months) |
| Q3 | Opt-in rate and CPA for Italian bank/broker referrals and switching | C3 | Partner talks; Awin/Tradedoubler IT |
| Q4 | Registered→MAU ratio for an Italian PFM (used to translate MAU scenarios into registered users and downloads) | Sizing, marketing | Beta telemetry; AppsFlyer/Adjust finance retention benchmarks (R-BC §12, unverified) |
| Q5 | Ceiling of the Italian multi-account segment (how many adults hold ≥ 3 relationships and want them reconciled) | 100 k vs 1 M plausibility | Banca d'Italia IBF, PoliMi Osservatorio Fintech consumer report, waitlist survey |
| Q6 | Own-AISP registration timing and cost (€40–150 k one-off; running UNKNOWN) and whether it lowers AIS cost via direct CBI Globe access | Fixed vs variable trade-off at scale | Law-firm quotes; CBI Globe fee schedule (R-OBB §13, §15.2) |
| Q7 | Whether Family subscriptions average 2.0 or 3.0 members (COGS per subscription ±€0.8) | Family margin | Beta |

---

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
