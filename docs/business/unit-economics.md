# Lilleri unit economics — COGS per user, ARPU, margins, CAC/LTV, sensitivity, break-even

**Project:** LILLERI (consumer PFM, Italy-first then Europe)
**Document date / verification date of carried-over claims:** 2026-10-02
**Inputs:** `business-and-cost-inputs.md` (R-BC, incl. its §14 inputs table), `open-banking-providers-a/b.md` (R-OBA/R-OBB), `ai-ml-transaction-intelligence.md` (R-AI), `build-vs-buy-and-vendors.md` (R-BB), `competitors-*.md` (R-US/R-EU/R-IT), `user-pain-points.md` (R-PP); decisions from `business-model.md` and `pricing-analysis.md`; one WebSearch check (RevenueCat 2026, W-1).
**Method:** every number below is produced by the formulas in §3–§8 from the inputs in §2 (a scratch Python implementation was used; §10 gives the same formulas in TypeScript-ready form). Outputs of ASSUMPTION inputs are HYPOTHESES, never facts. Prices are EUR excl. VAT unless stated; USD converted at 1.17 (ASSUMPTION).
**Label key:** FACT · ASSUMPTION · HYPOTHESIS · DECISION · OPEN QUESTION · UNKNOWN.

---

## 0. Summary

| Metric (Base inputs) | Value | Label |
|---|---|---|
| Net revenue per subscription-month (blended Plus 65 % / Pro 15 % / Family 20 %) | **€3.68** (Plus €2.85, Pro €4.60, Family €5.70) | HYPOTHESIS (prices DECISION; take rate, mix ASSUMPTION) |
| COGS per subscription-month | **€1.39** (Plus €1.07, Pro €1.14, Family €2.61) | HYPOTHESIS |
| Contribution per subscription-month | **€2.30** (62 % of net revenue) | HYPOTHESIS |
| COGS per free MAU: connected / not connected | **€0.59 / €0.08** | HYPOTHESIS |
| Gross profit per 1,000 MAU (120 subscriptions, 50 % of free MAU connected, consented offers €0.10/MAU) | **€92 (17 % GM); −€10 without the offers rail (−2 %)** | HYPOTHESIS |
| LTV (contribution × 17.5-month lifetime) | **€40** per subscription | HYPOTHESIS |
| CAC per paid subscription (€3 per registered user ÷ 4 % registered→paid) | **€75**; fully loaded with the free users who never pay **€99** | HYPOTHESIS |
| Payback | **33 months (43 fully loaded)** | HYPOTHESIS |
| Five most uncertain inputs, ranked by effect on GP per 1,000 MAU (Base €92) | AIS price per account (+€227 at €0.10 / −€340 at €0.60), paid subscriptions per 1,000 MAU (−€163 at 60 / +€217 at 200), consented-offers revenue (−€80 / +€150), free-user connection rate (±€65), paid accounts per user (−€68 / +€45); churn affects LTV (€36–€52), not steady-state GP; AI cost per user moves GP by only ±€3 | HYPOTHESIS |
| Break-even | Base inputs never break even at the stage fixed costs; **Target inputs** (AIS €0.20, 180 subscriptions per 1,000 MAU, offers €0.15/MAU) break even at ≈ 240 k MAU on a €120 k/month fixed base and ≈ 1.0 M MAU on €500 k/month | HYPOTHESIS → Gate C in `revenue-scenarios.md` |

The business is **not** a question of AI cost (≈ €0.02–0.10 per user per month) but of **bank-data cost per connected account** and **how many MAU pay**. Everything else is second order.

---

## 1. Definitions and cohorts

| Term | Definition |
|---|---|
| Registered | Created an account (email/passkey) |
| Connected | Has ≥ 1 live bank consent (activation event) |
| MAU | Opened the app (or received and acted on a push) in the calendar month |
| Active-synced | MAU with a live connection that was refreshed this month (free users: only while active; see `business-model.md` D-BM-1) |
| Paid subscription | A Plus, Pro or Family subscription billed this month (trial not counted) |
| Paid member | A person covered by a paid subscription (Family covers 2.0 / 2.3 / 3.0 members, ASSUMPTION) |
| Free MAU | MAU not covered by a paid subscription; split into connected (live sync) and unconnected (manual/import or paused) |
| ARPPU | Net revenue (ex-VAT, after rails) per paid subscription per month |
| ARPU | Net revenue per MAU per month (subscriptions + consented offers) |
| Contribution | ARPPU − COGS per subscription |
| GP per 1,000 MAU | Revenue per 1,000 MAU − COGS per 1,000 MAU (all cohorts) |

Steady-state convention: per-1,000-MAU figures assume cohorts in equilibrium; onboarding backfills and trial costs are treated as acquisition costs (§7).

---

## 2. Inputs table (Low / Base / High)

"Low/Base/High" are the input's values; the **effect on margin** column says which direction hurts. Sources: R-BC §14 input numbers in brackets.

| ID | Input | Unit | Low | Base | High | Label (source) | Effect on margin |
|---|---|---|---|---|---|---|---|
| **Pricing** | | | | | | | |
| U1 | Plus price monthly / annual (gross) | € | 3.99 / 29.99 | **4.99 / 39.99** | 5.99 / 49.99 | DECISION (`pricing-analysis.md`) | ↑ price ↑ margin |
| U2 | Pro price monthly / annual | € | 6.99 / 54.99 | **7.99 / 64.99** | 9.99 / 79.99 | DECISION | ↑ |
| U3 | Family price monthly / annual | € | 8.99 / 69.99 | **9.99 / 79.99** | 12.99 / 99.99 | DECISION | ↑ |
| U4 | Share of subscriptions on annual plans | % | 40 | **60** | 80 | ASSUMPTION [6] | ↑ share ↓ monthly ARPPU, ↑ lifetime |
| U5 | VAT (Italy) | % | 22 | **22** | 22 | FACT [7] | — |
| U6 | Paid mix Plus / Pro / Family | % | 80/10/10 | **65/15/20** | 50/20/30 | ASSUMPTION | richer mix ↑ ARPPU |
| U7 | Members per Family subscription | # | 2.0 | **2.3** | 3.0 | ASSUMPTION | ↑ members ↑ COGS |
| U8 | Blended payment take rate on ex-VAT (store 15 %, web ≈ 5 %, RevenueCat 1 %) | % | 8 | **13** | 16 | FACT (rates) / ASSUMPTION (channel mix) [8, 9] | ↑ take ↓ margin |
| **Bank data (AIS)** | | | | | | | |
| U9 | AIS price per connected account-month | € | 0.10 | **0.30** | 0.60 | UNKNOWN → ASSUMPTION [22] | the #1 lever |
| U10 | AIS monthly minimum / platform fee | €/mo | 0 | **500** | 2,000 | UNKNOWN → ASSUMPTION [23] | step cost |
| U11 | Connected accounts per paid member | # | 2.0 | **3.0** | 4.5 | FACT low-medium [24] | ↑ |
| U12 | Connected accounts per connected free MAU (cap 2) | # | 1.3 | **1.6** | 2.0 | ASSUMPTION (cap is DECISION) | ↑ |
| U13 | Share of free MAU with a live connection | % | 35 | **50** | 65 | ASSUMPTION (activation 30/50/70 % [11], minus churn of connections) | ↑ share ↑ COGS |
| U14 | Accounts not accessed in a month are not billed (sync pause works) | yes/no | yes | **yes** | no | HYPOTHESIS (Enable Banking wording "accounts accessed per month", R-OBB §4) | "no" ≈ High case for U13 |
| U15 | Vendor enrichment per account-month (if bought) | € | 0 | **0** | 0.05 | ASSUMPTION [25]; DECISION to build (R-BB §3) | — |
| **AI and compute** | | | | | | | |
| U16 | AI per free MAU (categorisation of ≈ 80–150 new tx, monthly summary) | € | 0.01 | **0.02** | 0.04 | prices FACT, volumes ASSUMPTION [26]; R-AI §7.2 | small |
| U17 | AI per Plus member | € | 0.02 | **0.04** | 0.08 | ASSUMPTION (alerts, search) | small |
| U18 | AI per Pro/Family member (assistant chat, AI budget, forecasts) | € | 0.05 | **0.10** | 0.25 | ASSUMPTION (≈ 20 calls × 3 k tokens at Sonnet-class prices, R-BB §18) | small |
| U19 | Infra (compute + DB + cache + storage) per MAU | € | 0.013 | **0.034** | 0.10 | ASSUMPTION on usage, unit prices FACT [34] | medium at scale |
| U20 | Notifications + analytics/observability + auth per MAU | € | 0.001 | **0.010** | 0.057 | FACT prices / ASSUMPTION volumes [38–41] | small |
| U21 | Receipt OCR per Pro/Family member | € | 0.001 | **0.01** | 0.30 | FACT prices / ASSUMPTION route and share [32, 33] | small unless Document AI path |
| **Support and other** | | | | | | | |
| U22 | Support contacts per 1,000 MAU per month | # | 5 | **15** | 40 | UNKNOWN → ASSUMPTION [42] | ↑ |
| U23 | AI deflection of contacts | % | 70 | **60** | 40 | FACT (YNAB 70 %) / ASSUMPTION [44] | — |
| U24 | Cost per human-handled contact | € | 4 | **6** | 8 | ASSUMPTION [43] | ↑ |
| U25 | Paid users' contact multiplier | × | 1.5 | **2.0** | 3.0 | ASSUMPTION (connection issues scale with accounts) | ↑ |
| U26 | Other variable (FX, logos cache, legal tooling share) per MAU | € | 0.005 | **0.010** | 0.020 | ASSUMPTION | small |
| **Growth, retention, conversion** | | | | | | | |
| U27 | Paid subscriptions per 1,000 MAU | # | 60 | **120** | 200 | ASSUMPTION; UNKNOWN for all competitors [14] | the #2 lever |
| U28 | Registered → paid (lifetime) | % | 2 | **4** | 7 | ASSUMPTION [14; W-1 hard paywall 10.7 % vs freemium 2.1 % of trial starts] | CAC per paid |
| U29 | Monthly churn (monthly plans) | %/mo | 14 | **9** | 6 | ASSUMPTION [15] | LTV |
| U30 | Annual renewal rate | % | 35 | **45** | 60 | ASSUMPTION [16]; W-1 annual 1-yr retention ≈ 27–28 % cross-category | LTV |
| U31 | Consented offers revenue per MAU per month | € | 0.02 | **0.10** | 0.25 | ASSUMPTION (half of R-BC §13 Base because opt-in) [46] | the #3 lever |
| U32 | Blended CAC per registered user | € | 6 (paid-heavy) | **3** | 1.5 (organic/referral) | ASSUMPTION [19]; `go-to-market.md` targets | CAC |
| U33 | Free user active months before dormancy (for lifetime free cost) | mo | 2 | **3** | 5 | ASSUMPTION (D30 retention 4–9 % [17]) | loaded CAC |
| U34 | USD→EUR | — | 1.17 | **1.17** | 1.17 | ASSUMPTION | — |
| **Fixed costs (ranges only; see `cost-architecture.md`)** | | | | | | | |
| U35 | Fixed monthly cost at 1 k / 10 k / 100 k / 1 M MAU (Low / Base / High) | €k | 8 / 20 / 70 / 300 | **15 / 40 / 120 / 500** | 30 / 70 / 200 / 900 | ASSUMPTION | break-even |

---

## 3. COGS per user per month — the formula

`COGS_user = AIS + ENRICH + AI + INFRA + NOTIF_ANALYTICS_AUTH + OCR + SUPPORT + OTHER` (payment fees are applied to revenue, not COGS, see §4).

| Line | Formula | Free connected MAU (L/B/H) | Free unconnected MAU | Plus member | Pro / Family member |
|---|---|---|---|---|---|
| AIS | accounts × U9 (only if accessed this month, U14) | 1.3×0.10 / 1.6×0.30 / 2.0×0.60 = **0.13 / 0.48 / 1.20** | 0 | 2.0×0.10 / 3.0×0.30 / 4.5×0.60 = **0.20 / 0.90 / 2.70** | same as Plus |
| Enrichment | accounts × U15 | 0 / 0 / 0.10 | 0 | 0 / 0 / 0.23 | same |
| AI | U16 / U17 / U18 | 0.01 / 0.02 / 0.04 | ≈ 25 % of U16 (imports only) = 0.003 / 0.005 / 0.01 | 0.02 / 0.04 / 0.08 | 0.05 / 0.10 / 0.25 |
| Infra | U19 | 0.013 / 0.034 / 0.10 | same | same | same |
| Notif + analytics + auth | U20 | 0.001 / 0.010 / 0.057 | same | same | same |
| OCR | U21 (Pro/Family only) | 0 | 0 | 0 | 0.001 / 0.01 / 0.30 |
| Support | U22/1000 × (1 − U23) × U24 × multiplier | 5/1000×0.3×4 = **0.006** / 15/1000×0.4×6 = **0.036** / 40/1000×0.6×8 = **0.192** | half of free connected | × U25: 0.009 / 0.072 / 0.576 | same as Plus |
| Other | U26 | 0.005 / 0.010 / 0.020 | same | same | same |
| **Total** | | **≈ 0.17 / 0.59 / 1.71** | **≈ 0.03 / 0.08 / 0.28** | **≈ 0.25 / 1.07 / 3.76** | **≈ 0.28 / 1.14 / 4.23** (Family = members × this: 0.56 / 2.61 / 12.7) |

Base totals from the model: free connected €0.590, free unconnected €0.077, Plus €1.066, Pro €1.136, Family (2.3 members) €2.613. At Base, **AIS is 81 % of a free connected user's COGS and 84 % of a Plus member's**.

Cost per 1,000 transactions (for reference, R-AI §7.2, prices FACT, volumes ASSUMPTION): rules/merchant map/kNN ≈ $0; small-LLM tier $0.03–0.25 (GPT-5.4 nano / Gemini 3.1 Flash-Lite / Mistral Small 4 / Haiku 4.5 with ≥ 4,096-token cached prefix); frontier residual $0.01–0.05; blended steady state **$0.03–0.10 per 1,000 transactions**, i.e. ≈ €0.004–0.013 per user-month at 150 transactions — negligible next to AIS.

---

## 4. Revenue formulas

```
gross_monthly(plan)   = (1 − U4) × price_monthly + U4 × price_annual / 12
exvat(plan)           = gross_monthly / (1 + U5)
net(plan)             = exvat × (1 − U8)
ARPPU                 = Σ_plan mix(plan) × net(plan)
members_per_sub       = mix_plus + mix_pro + mix_fam × U7
offers_per_MAU        = U31
```

| Plan | Gross blended €/mo (Base) | Ex-VAT | Net at take 13 % | Net Low (take 16 %, 80 % annual) | Net High (take 8 %, 40 % annual) |
|---|---|---|---|---|---|
| Plus | 4.00 | 3.28 | **2.85** | 2.52 | 3.26 |
| Pro | 6.45 | 5.28 | **4.60** | 4.08 | 5.25 |
| Family | 8.00 | 6.56 | **5.70** | 5.05 | 6.53 |
| Blended ARPPU (mix per U6) | — | — | **3.68** | 2.93 | 4.64 |

ARPU per MAU (Base): subscriptions €442 + offers €100 per 1,000 MAU = **€0.54 per MAU per month**. For comparison, Finanzguru's revenue is ≈ €40 M on > 3 M users ≈ €1.1 per registered user per month (FACT medium, R-EU S-68), mostly commissions; Monarch's $100 M ARR on > 1 M members ≈ $8.3 per member-month (FACT, R-US W12) with no free tier.

---

## 5. Contribution and gross margin per plan (Base)

| Plan | Net revenue | COGS | Contribution | Margin | Note |
|---|---|---|---|---|---|
| Plus | €2.85 | €1.07 | **€1.78** | 62 % | AIS €0.90 is the bulk |
| Pro | €4.60 | €1.14 | **€3.46** | 75 % | AI assistant adds only €0.06 |
| Family (2.3 members) | €5.70 | €2.61 | **€3.09** | 54 % | Accretive in euros, dilutive in margin |
| Blended per subscription | €3.68 | €1.39 | **€2.30** | 62 % | — |
| Low case (U-values Low for margin) | €2.93 | €3.12 | **−€0.19** | −7 % | AIS €0.45, 4 accounts, 3 members, take 16 % |
| High case | €4.64 | €0.58 | **€4.06** | 88 % | AIS €0.15, 2.5 accounts |

---

## 6. Blended economics per 1,000 MAU

```
subs        = U27
paid_members= subs × members_per_sub
free        = 1000 − paid_members
conn        = free × U13 ; unconn = free − conn
revenue     = subs × ARPPU + 1000 × U31
COGS        = subs × COGS_sub + conn × COGS_free_conn + unconn × COGS_free_unconn
GP          = revenue − COGS ; GM = GP / revenue
```

| Case | Subs | Paid members | Free conn | Rev subs | Rev offers | COGS paid | COGS free conn | COGS free unconn | GP | GM | GM subs-only |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Pessimistic | 60 | 72 | 603 | €176 | €20 | €187 | €790 | €92 | **−€873** | −446 % | −508 % |
| **Base** | 120 | 151 | 424 | €442 | €100 | €166 | €250 | €33 | **€92** | 17 % | −2 % |
| **Target (plan of record)** | 180 | 238 | 343 | €696 | €150 | €185 | €135 | €27 | **€499** | 59 % | 50 % |
| Optimistic | 200 | 260 | 296 | €928 | €250 | €116 | €68 | €11 | **€983** | 83 % | 79 % |

Target inputs: AIS €0.20, 180 subs/1,000 MAU, mix 60/15/25, take 12 %, free connected 45 % at 1.5 accounts, offers €0.15/MAU, contacts 12/1,000 at 65 % deflection (ASSUMPTION set chosen as the plan of record; each value is inside the Low–High range and must be measured in beta).

Reading: at Base, **free connected users' bank-data cost (€204 of the €250) is larger than the whole paid contribution net of free costs**; the offers rail turns a −2 % subscription-only margin into +17 %. The Target case needs three things to move together: AIS price, paid share, offers.

---

## 7. CAC, LTV, payback

```
lifetime_months = U4 × 12 / (1 − U30) + (1 − U4) × 1 / U29
LTV             = contribution_per_sub × lifetime_months
CAC_paid        = U32 / U28
free_per_paid   = (1 − U28) / U28
free_lifetime   = U13 × U33 × COGS_free_conn + (1 − U13) × U33 × COGS_free_unconn
loaded_CAC      = CAC_paid + free_per_paid × free_lifetime
payback         = CAC_paid / contribution_per_sub ; loaded_payback = loaded_CAC / contribution_per_sub
```

| Case | Lifetime (mo) | Contribution/mo | LTV | CAC per paid | Free-user cost per paid | Loaded CAC | Payback (mo) | Loaded payback (mo) |
|---|---|---|---|---|---|---|---|---|
| Pessimistic | 16.2 | −€0.19 | −€3 | €300 | €93 | €393 | never | never |
| Base | 17.5 | €2.30 | **€40** | €75 | €24 | **€99** | 33 | 43 |
| Target | 19.4 | €2.84 | **€55** | €40 | €12 | **€52** | 14 | 18 |
| Optimistic | 22.0 | €4.06 | **€89** | €21 | €7 | **€29** | 5 | 7 |

Base LTV sensitivity (single input moved): monthly churn 14 % → LTV €37, 6 % → €45; annual renewal 35 % → €36, 60 % → €52; AIS €0.60 → €20, €0.10 → €54; registered→paid 2 % → CAC per paid €150 (payback 65 months), 7 % → €43 (19 months); CAC per registered €6 → €150 per paid, €1.5 → €38.

Implications (HYPOTHESIS): (1) at Base, paid acquisition does not pay back inside a plausible lifetime — the business must be organic/referral-led until AIS and conversion are measured (`go-to-market.md` CAC targets); (2) a 1-point change in registered→paid conversion is worth more than any AI-cost optimisation; (3) annual plans are the retention lever (lifetime 17.5 → 22 months at 60 % renewal).

---

## 8. Sensitivity analysis

### 8.1 The five most uncertain inputs (one at a time, Base otherwise; GP per 1,000 MAU, Base = €92)

| Input | Low value → GP (Δ) | High value → GP (Δ) | Rank | Comment |
|---|---|---|---|---|
| U9 AIS price per account | €0.10 → €319 (+227) | €0.60 → −€247 (−340) | **1** | Swing of €566 per 1,000 MAU; must be quoted before any price is fixed |
| U27 paid subscriptions per 1,000 MAU | 60 → −€71 (−163) | 200 → €310 (+217) | **2** | The free tier's conversion job |
| U29/U30 churn and renewal | no effect on steady-state GP; LTV €36–€52 | — | **3 (LTV)** | Changes payback from 43 to 29 loaded months (Base CAC) |
| U16–U18 AI cost per user | Plus AI €0.08 → €89 (−3) | €0.02 → €94 (+2) | **5** | Immaterial unless frontier models are used on every row |
| U11/U12/U13 connections per user | paid 4.5 acc → €24 (−68); free 2.0 acc → €42 (−51); free connected 65 % → €27 (−65) | paid 2.0 → €138; free 1.3 → €131; free connected 35 % → €158 | **4** | Together ±€130; the free envelope cap is the control |
| (extra) U31 offers per MAU | €0.02 → €12 (−80) | €0.25 → €242 (+150) | — | The second rail |
| (extra) U8 take rate | 16 % → €77 | 8 % → €118 | — | Web rail worth ≈ €25 per 1,000 MAU |
| (extra) U1 Plus price | €3.99 → €42 | €5.99 → €143 | — | Price test worth €100 per 1,000 MAU |
| (extra) U19 infra per MAU | €0.10 → €26 | €0.013 → €113 | — | Keep infra lean (`cost-architecture.md`) |

### 8.2 Two-way grid: gross margin per 1,000 MAU, AIS price × paid subscriptions (Base otherwise; "with offers €0.10 / subscriptions only")

| AIS €/acc-mo | 60 subs | 90 | 120 | 160 | 200 | 250 |
|---|---|---|---|---|---|---|
| 0.10 | 38 / 10 | 51 / 36 | 59 / 50 | 65 / 59 | 69 / 65 | 73 / 70 |
| 0.15 | 23 / −12 | 39 / 21 | 48 / 37 | 56 / 49 | 61 / 56 | 66 / 62 |
| 0.20 | 8 / −33 | 27 / 5 | 38 / 24 | 47 / 38 | 53 / 47 | 58 / 54 |
| **0.30** | −22 / −77 | 3 / −27 | **17 / −2** | 29 / 17 | 37 / 28 | 44 / 38 |
| 0.45 | −67 / −143 | −34 / −74 | −14 / −40 | 2 / −15 | 13 / 1 | 22 / 13 |
| 0.60 | −112 / −208 | −70 / −122 | −46 / −79 | −25 / −46 | −12 / −27 | 0 / −11 |

Reading: a healthy software gross margin (≥ 50 %) exists only in the upper-right triangle (AIS ≤ €0.20 and ≥ 120–160 subscriptions per 1,000 MAU). At €0.45 or above nothing works; this is the explicit kill criterion for the free-tier shape (D-BM-1 guardrail).

### 8.3 Free-tier shape comparison (Base, per 1,000 MAU; from `business-model.md` §2)

| Shape | COGS | GP | GM |
|---|---|---|---|
| A manual-only free | €232 | €310 | 57 % |
| B/F 1 institution (≤ 2 accounts) | €449 | €92 | 17 % |
| C 1 account | €373 | €169 | 31 % |
| D limited refresh, per-call billing (−60 % free AIS) | €327 | €215 | 40 % |
| E ad-funded unlimited free | €707 | −€65 | −10 % |
| F′ time-boxed 90-day sync then import | €284 | €258 | 48 % |
| G trial-gated (350 subs/1,000 MAU) | €563 | €826 | 59 % |

---

## 9. Break-even analysis

| Case | GP per 1,000 MAU | Break-even MAU at fixed €15 k (1 k stage) | at €40 k (10 k stage) | at €120 k (100 k stage) | at €500 k (1 M stage) |
|---|---|---|---|---|---|
| Base | €92 | 162 k | 433 k | 1.30 M | 5.4 M |
| **Target** | €499 | 30 k | 80 k | **240 k** | **1.0 M** |
| Optimistic | €983 | 15 k | 41 k | 122 k | 508 k |

Required paid subscriptions per 1,000 MAU for break-even at each stage (Base otherwise, offers €0.10):

| AIS price | 100 k MAU, fixed €120 k | 1 M MAU, fixed €500 k |
|---|---|---|
| €0.15 | 419 (42 % of MAU) | 196 (20 %) |
| €0.20 | 452 (45 %) | 218 (22 %) |
| €0.30 | 528 (53 %) | 270 (27 %) |

Reading: break-even before ≈ 250 k MAU requires the Target inputs **and** a fixed base ≤ €120 k/month (a team of ≈ 10–12); the Base case does not break even at any scale with the stage fixed costs. The 1 k and 10 k stages are investment stages in every case (`revenue-scenarios.md`).

---

## 10. Spreadsheet / TypeScript model skeleton

```ts
// lilleri-unit-economics.ts — pure functions; every input is an explicit parameter (no hidden defaults in logic)
export type Inputs = {
  plusM: number; plusY: number; proM: number; proY: number; famM: number; famY: number; // gross incl. VAT
  annualShare: number; vat: number; takeRate: number;              // U4, U5, U8
  mixPlus: number; mixPro: number; mixFam: number; famMembers: number; // U6, U7
  aisPrice: number; accPaid: number; accFree: number; freeConnected: number; enrich: number; // U9, U11–U13, U15
  aiFree: number; aiPlus: number; aiPro: number; infra: number; miscSaas: number; ocrPro: number; // U16–U21
  contactsPerK: number; deflection: number; costContact: number; paidContactMult: number; other: number; // U22–U26
  offersPerMau: number; subsPerK: number;                           // U31, U27
  churnM: number; renewalY: number; cacReg: number; regToPaid: number; freeActiveMonths: number; // U28–U30, U32, U33
};

export const blendedGross = (m: number, y: number, annualShare: number) => (1 - annualShare) * m + annualShare * y / 12;
export const net = (i: Inputs, m: number, y: number) => blendedGross(m, y, i.annualShare) / (1 + i.vat) * (1 - i.takeRate);
export const supportCost = (i: Inputs, mult = 1) => i.contactsPerK / 1000 * (1 - i.deflection) * i.costContact * mult;

export type Tier = 'freeConn' | 'freeUnconn' | 'plus' | 'pro';
export function cogsMember(i: Inputs, t: Tier): number {
  const base = i.infra + i.miscSaas + i.other;
  switch (t) {
    case 'freeConn':   return i.accFree * (i.aisPrice + i.enrich) + i.aiFree + base + supportCost(i);
    case 'freeUnconn': return i.aiFree * 0.25 + base + supportCost(i, 0.5);
    case 'plus':       return i.accPaid * (i.aisPrice + i.enrich) + i.aiPlus + base + supportCost(i, i.paidContactMult);
    case 'pro':        return i.accPaid * (i.aisPrice + i.enrich) + i.aiPro + i.ocrPro + base + supportCost(i, i.paidContactMult);
  }
}

export function perSubscription(i: Inputs) {
  const nPlus = net(i, i.plusM, i.plusY), nPro = net(i, i.proM, i.proY), nFam = net(i, i.famM, i.famY);
  const cPlus = cogsMember(i, 'plus'), cPro = cogsMember(i, 'pro'), cFam = i.famMembers * cPro;
  const arppu = i.mixPlus * nPlus + i.mixPro * nPro + i.mixFam * nFam;
  const cogs  = i.mixPlus * cPlus + i.mixPro * cPro + i.mixFam * cFam;
  const membersPerSub = i.mixPlus + i.mixPro + i.mixFam * i.famMembers;
  return { nPlus, nPro, nFam, cPlus, cPro, cFam, arppu, cogs, contribution: arppu - cogs, membersPerSub };
}

export function per1kMau(i: Inputs) {
  const s = perSubscription(i);
  const subs = i.subsPerK, paidMembers = subs * s.membersPerSub, free = 1000 - paidMembers;
  const conn = free * i.freeConnected, unconn = free - conn;
  const revenue = subs * s.arppu + 1000 * i.offersPerMau;
  const cogs = subs * s.cogs + conn * cogsMember(i, 'freeConn') + unconn * cogsMember(i, 'freeUnconn');
  return { subs, paidMembers, free, conn, unconn, revenue, cogs, gp: revenue - cogs, gm: (revenue - cogs) / revenue };
}

export function ltv(i: Inputs) {
  const s = perSubscription(i);
  const lifetime = i.annualShare * 12 / (1 - i.renewalY) + (1 - i.annualShare) / i.churnM;
  const cacPaid = i.cacReg / i.regToPaid;
  const freePerPaid = (1 - i.regToPaid) / i.regToPaid;
  const freeLifetime = i.freeConnected * i.freeActiveMonths * cogsMember(i, 'freeConn')
                     + (1 - i.freeConnected) * i.freeActiveMonths * cogsMember(i, 'freeUnconn');
  const loadedCac = cacPaid + freePerPaid * freeLifetime;
  return { lifetime, ltv: s.contribution * lifetime, cacPaid, loadedCac,
           payback: cacPaid / s.contribution, loadedPayback: loadedCac / s.contribution };
}

export function stagePnl(i: Inputs, mau: number, fixedMonthly: number, aisMinimum: number) {
  const k = per1kMau(i), scale = mau / 1000;
  const aisVariable = (k.subs * (i.mixPlus + i.mixPro + i.mixFam * i.famMembers) * i.accPaid + k.conn * i.accFree) * i.aisPrice * scale;
  const ais = Math.max(aisVariable, aisMinimum); // step: minimum monthly invoice
  const cogs = k.cogs * scale - aisVariable + ais;
  const revenue = k.revenue * scale;
  return { revenue, cogs, gp: revenue - cogs, fixed: fixedMonthly, net: revenue - cogs - fixedMonthly };
}

export const BASE: Inputs = {
  plusM: 4.99, plusY: 39.99, proM: 7.99, proY: 64.99, famM: 9.99, famY: 79.99,
  annualShare: 0.60, vat: 0.22, takeRate: 0.13, mixPlus: 0.65, mixPro: 0.15, mixFam: 0.20, famMembers: 2.3,
  aisPrice: 0.30, accPaid: 3.0, accFree: 1.6, freeConnected: 0.50, enrich: 0,
  aiFree: 0.02, aiPlus: 0.04, aiPro: 0.10, infra: 0.034, miscSaas: 0.010, ocrPro: 0.01,
  contactsPerK: 15, deflection: 0.60, costContact: 6, paidContactMult: 2.0, other: 0.010,
  offersPerMau: 0.10, subsPerK: 120, churnM: 0.09, renewalY: 0.45, cacReg: 3, regToPaid: 0.04, freeActiveMonths: 3,
};
// TARGET: aisPrice 0.20, subsPerK 180, mix 0.60/0.15/0.25, takeRate 0.12, accFree 1.5, freeConnected 0.45,
//         infra 0.030, miscSaas 0.008, contactsPerK 12, deflection 0.65, offersPerMau 0.15, churnM 0.08, renewalY 0.50, cacReg 2, regToPaid 0.05
```

Spreadsheet mapping: one sheet "Inputs" (U1–U35 with L/B/H columns and a selector), one sheet "PerSub" (§4–§5), one "Per1kMAU" (§6), one "LTV" (§7), one "Stages" (§9 with fixed costs from `cost-architecture.md`), one "Sensitivity" (data table over U9 × U27).

---

## 11. Decisions / Recommendations

| ID | Decision / recommendation |
|---|---|
| D-UE-1 | The Base inputs in §2 are the official model inputs until the RFP and the beta replace U9, U13, U27 and U31 with measured values; any pitch or plan quotes the Target case as the plan of record and the Base case as the honest floor |
| D-UE-2 | Report three business KPIs monthly from beta month 3: AIS cost per paid subscription (free share separately), paid subscriptions per 1,000 MAU, offers revenue per MAU |
| D-UE-3 | AI cost is capped by design at ≤ €0.10 per paid member per month (tiered pipeline, batch backfills, cached prefixes) — it is not a lever worth optimising beyond that |
| D-UE-4 | No paid user acquisition beyond small tests while loaded payback > 18 months (Base says 43); growth is organic/referral-led (`go-to-market.md`) |
| R-UE-1 | Negotiate in the RFP: per-user pricing, no charge for accounts not accessed, lite rate for single-institution users, 5 k/25 k/100 k ladder — each could move U9 from Base toward Low |
| R-UE-2 | Implement the TypeScript model in the monorepo (`packages/finance-model`) with the inputs as a versioned JSON so that the beta dashboards and this document share one source |

---

## 12. Open questions

| # | Question | Decides | How to verify |
|---|---|---|---|
| Q1 | AIS €/account-month at 5 k / 25 k / 100 k accounts; minimum invoice; per-user option; non-accessed accounts billed? | U9, U10, U14 — the whole model | RFP to 5 providers (R-OBA §6, R-OBB §17) |
| Q2 | Paid subscriptions per 1,000 MAU with a 1-institution free tier in Italy | U27 | Closed beta cohorts (n ≥ 2,000 MAU) |
| Q3 | Share of free MAU that keep a live connection vs lapse | U13 | Beta telemetry |
| Q4 | Monthly churn and annual renewal for an Italian PFM | U29, U30 | Beta + first renewal cohort (month 13) |
| Q5 | Opt-in rate and revenue per MAU of the consented offers rail | U31 | Phase-2 experiment with 2 bank partners and 1 comparator |
| Q6 | Support contacts per 1,000 MAU and deflection | U22, U23 | Beta support log |
| Q7 | Real infra cost per MAU at 10 k and 100 k | U19 | Cloud bills in `cost-architecture.md` budget alerts |
| Q8 | Trial→paid conversion for a 30-day no-card Pro trial in finance (RevenueCat category cut) | U28 | RevenueCat State of Subscription Apps 2026 category appendix; beta |

---

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
