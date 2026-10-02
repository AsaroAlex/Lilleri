# Lilleri business model — free tier, plan ladder, advertising, revenue add-ons

**Project:** LILLERI (greenfield consumer PFM, Italy-first then Europe; no AISP licence yet)
**Document date / verification date of carried-over claims:** 2026-10-02
**Author:** founding-team synthesis (subscription monetisation + fintech unit economics + CFO + ad-monetisation lens)
**Inputs read in full:** `docs/research/raw/business-and-cost-inputs.md` (R-BC), `open-banking-providers-a.md` (R-OBA), `open-banking-providers-b.md` (R-OBB), `competitors-us.md` (R-US), `competitors-eu-uk.md` (R-EU), `competitors-italy-and-ai-first.md` (R-IT), `user-pain-points.md` (R-PP), `ai-ml-transaction-intelligence.md` (R-AI), `build-vs-buy-and-vendors.md` (R-BB). Four WebSearch queries were run on 2026-10-02 to close small gaps (RevenueCat 2026 benchmarks, Satispay/Revolut/Hype/N26 Italian plan prices, Italian app-usage survey); they are cited as W-1…W-6 and graded medium (search-engine summaries of the cited pages, not full reads).
**Companion documents:** `pricing-analysis.md` (price points), `unit-economics.md` (formulas and inputs U1–U40), `revenue-scenarios.md` (scale scenarios and Gate C), `go-to-market.md`, `cost-architecture.md`.
**Label key:** FACT (cited source, verified 2026-10-02) · ASSUMPTION (working value, not verified) · HYPOTHESIS (our interpretation) · DECISION (taken here; reversible under the stated conditions) · OPEN QUESTION · UNKNOWN (not findable; how to verify given).

---

## 0. Summary (decision-relevant)

1. **The single most important business-model fact is that Lilleri pays for bank data per connected account per month, and nobody will tell us the price until we sign.** Every provider is sales-led; the only working range is €0.10 / €0.30 / €0.60 per account-month (Low/Base/High, ASSUMPTION, R-BC §3 input 22). At the Base price a free user with one connected institution costs ≈ €0.59/month while active, while a paying subscriber contributes ≈ €2.30/month after store fees and COGS blended across plans (Plus alone ≈ €1.78) (`unit-economics.md` §5). **Any free tier with permanent bank sync is therefore contribution-negative at Base unless free users are few, cheap or short-lived.** This drives every decision below.
2. **DECISION — free-tier model: F (hybrid freemium) with a hard COGS guardrail and a pre-agreed fallback.** Free = one institution (max 2 accounts) with automatic sync *while the user is active*, unlimited manual/CSV/PDF import, and every correctness, learning, privacy and export feature; 30-day Pro trial with no card for every new user. Guardrail: free-tier bank-data cost must stay ≤ €1.20 per paying subscription per month (≈ one third of blended net ARPPU). If the provider RFP returns > €0.20 per account-month with no per-user or inactive-account relief, the fallback shape "Free Classic" (90 days of full sync, then import-only free tier) is switched on for new cohorts. Models A, B, C, D, E and a trial-gated G were evaluated (§2–§3); E (ad-funded) is rejected outright.
3. **DECISION — plan ladder:** Free / Plus (€4.99 or €39.99/yr) / Pro (€7.99 or €64.99/yr) / Family (€9.99 or €79.99/yr, up to 5 people) / Business (Later). Paywall dimensions are *depth and automation*: number of institutions, background refresh, history in reports, forecasting, advanced AI, receipts, household, automation, insights depth. **Never paywalled:** anything that makes the data correct, safe or portable — categorisation and learning, rules, Review Inbox, transfer/duplicate/pending reconciliation, consent management, 2FA/passkeys, export, deletion (§4).
4. **DECISION — advertising:** no display ads and no contextual ads, ever (models A and B rejected). Sponsored offers (C), affiliate referrals (D), cashback (E) and switching (F) are allowed only as one opt-in, clearly labelled "Offerte" rail that never touches categorisation, insights or the Review Inbox, with its own consent and a visible "Lilleri riceve un compenso" disclosure (§5–§6). The research is unambiguous that trust is lost through billing surprises, unauthorised actions and data selling, not through features (R-PP §E).
5. **The second rail is not optional at scale.** Subscription-only D2C PFMs closed (Moneyhub, Spiir, Yolt, Grip, Oval); the survivors run commissions or AUM (Finanzguru ≈ 70 % commissions, > 3 M users, ≈ €40 M revenue 2025; Plum £34 M ARR on AUM; Snoop switching) (FACT, R-EU §1, §9). The scenarios in `revenue-scenarios.md` show Lilleri covering a lean team only when (a) AIS price ≤ €0.20, (b) paid subscriptions ≥ 18–20 % of MAU, (c) a consented offers rail yields ≥ €0.15 per MAU per month. That is the plan of record ("Target" case), and it is a HYPOTHESIS until the RFP and the beta measure it.

---

## 1. What the research fixes before any model is chosen

| # | Finding | Status | Source | Consequence for the model |
|---|---|---|---|---|
| 1.1 | AIS pricing is per connected account (Enable Banking: "number of accounts accessed … per month", minimum monthly invoice exists) or per consented end-user (Salt Edge) or "per call + subscription" (Yapily); no public euro figure for any provider | FACT (model) / UNKNOWN (numbers) | R-OBB §4, §16.2; R-OBA §1.5; R-BC §3 | COGS of a free user is a recurring per-account fee, not a one-off |
| 1.2 | Working range €0.10 / €0.30 / €0.60 per account-month; platform minimum €0 / €500 / €2,000 per month | ASSUMPTION (low-medium) | R-BC §3 working ranges | Base free-user AIS cost = 1.6 accounts × €0.30 ≈ €0.48 |
| 1.3 | Background refresh ≤ 4×/24 h per consent without the user present; user-present requests uncapped; consent renewal with SCA every 180 days (EEA) | FACT (law) | RTS 2018/389 art. 36(5)(b), EBA Q&A 2019_4631; Reg. (EU) 2022/2360 — R-OBA §2.1 | "Limited refresh" is a product lever, not necessarily a cost lever (per-account billing) |
| 1.4 | Italian creators use 3–5 banking relationships; "works with Fineco/BBVA/Revolut" is the bar | FACT (low-medium) | R-IT §1.3, Y-02/Y-03 | Multi-institution is the paid value; one institution is a genuine but partial free experience |
| 1.5 | Italians expect free money apps; bank apps' analytics are free; Moneyhub at £1.49 was loved and still closed | FACT (low–medium) | R-BC §2; R-EU §3.4 | A "free tier" must be real; monetise depth and automation |
| 1.6 | Freemium PFM free→paid conversion is UNKNOWN for every competitor; RevenueCat 2026: hard-paywall apps convert trial→paid at a median 10.7 % by day 35 vs 2.1 % for freemium apps (≈ 5×); 17–32-day trials convert at a median 42.5 % vs 25.5 % for < 4-day trials; annual-plan 1-year retention ≈ 28 % (freemium) vs 27 % (hard paywall) | UNKNOWN (PFM) / FACT medium (cross-category, W-1) | R-BC §1.4; W-1 | Long no-card trial; freemium conversion must be measured, not assumed |
| 1.7 | Finanzguru: > 3 M users, ≈ €40 M 2025 revenue, ≈ 70 % commissions; generous free core (multibanking, categorisation, contracts) | FACT (medium-high) | R-EU S-68, S-35 | Proof that free core + aligned commissions scales in Europe |
| 1.8 | Monarch: $100 M ARR, > 1 M members, trial-gated (no free tier); YNAB $109/yr, 34-day no-card trial | FACT (high) | R-US W12, W5 | Proof that trial-gated works in the US at $95–109/yr; not proven in Italy |
| 1.9 | Trust is lost through billing surprises, unauthorised actions, data selling, shutdowns and opaque failures; won through named regulated aggregator, read-only, export, deletion | FACT | R-PP §E, §A #7 | Ads, hidden affiliate steering and dark-pattern cancellation are off the table |
| 1.10 | Cross-bank *aggregation* is already offered by Intesa (XME Banks) and Hype (paid plans); categorisation of external transactions, transfer reconciliation and a review inbox are not | FACT medium / UNKNOWN depth | R-IT §3.10, V-09, W-01 | The paid value is reconciliation quality and automation, not "see all accounts" |
| 1.11 | Apple EU terms from 2026-10-01: IAP 15 % (Small Business Program), alternative payment in-app 10 %, out-of-app link 10 %; Google Play EEA from 2026-06-30: 10 % service fee on subscriptions + 5 % billing fee only with Play Billing | FACT (high / medium-high) | R-BC §8 | Store take ≈ 15 % Base; a 10 % rail exists on both platforms |
| 1.12 | PSD2 art. 67(2)(f): an AISP may use account data only for the AIS explicitly requested by the user; Banca d'Italia's position on an unlicensed *recipient* app is UNKNOWN | FACT (law) / UNKNOWN | R-OBA §2.6; R-OBB §15.1 | Any offers rail that uses account data needs its own consent and counsel sign-off |

---

## 2. Free-tier models A–F (plus G as a comparator): evaluation

All COGS figures are per 1,000 MAU at the Base inputs of `unit-economics.md` (AIS €0.30/account-month, 120 paid subscriptions per 1,000 MAU, blended net ARPPU €3.68, consented offers €0.10/MAU). Gross profit (GP) and gross margin (GM) are computed with the scratch model behind `unit-economics.md` (HYPOTHESIS: outputs of ASSUMPTION inputs). "Free-conn" = free MAU with a live bank connection.

| Model | Shape | Free-conn per 1k MAU | COGS/1k MAU | GP/1k MAU | GM | Trust / promise fit | Conversion mechanics | Italian fit | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **A** Free manual tracking; bank sync premium | Free = manual + CSV/PDF import only | 0 | €232 | €310 | 57 % | Breaks the promise ("connect once") for free users; manual entry is what users abandon (R-IT Y-02) | Conversion must happen on a promise the user has not experienced; expect trial-gated-like conversion only if a trial exists | Poor: Italians expect free apps; bank apps already sync their own ledger for free | Only as the **fallback** component (import-only free after a trial) |
| **B** 1 bank (institution) free | Free = 1 institution, all its accounts | 424 (1.6 acc) | €449 | €92 | 17 % (−2 % without offers) | Promise demonstrated on one bank; reconciliation across institutions (the hard part) not shown | Multi-bank users (the target) must upgrade; single-bank users stay free with little reason to pay | Good: "collega la tua banca" is credible | Viable only if AIS ≤ €0.20 or offers rail ≥ €0.10/MAU |
| **C** 1–2 accounts free | Free = up to 2 accounts (any institution) — at 1 account | 424 (1.0 acc) | €373 | €169 | 31 % | Same as B; 2 accounts across 2 banks lets transfer pairing be demonstrated | As B; slightly stronger upgrade pressure | Good | Middle lever; "1 institution, max 2 accounts" is C+B |
| **D** Bank sync free with limited refresh | Free = sync only on app open (user-present, uncapped by law) or 1×/day | 424 (1.6 acc) | €449 under per-account billing; €327 if the provider bills per call and free users consume ≈ 40 % of the calls | €92 / €215 | 17 % / 40 % | Weak: pending→booked, alerts and consent-expiry nudges need background refresh; "refresh on open" is fine UX for a free tier | Refresh cadence is a credible Plus benefit (automation) | OK | Keep "background refresh + alerts" as a Plus dimension; cost relief only if per-call pricing is quoted (OPEN QUESTION) |
| **E** Ad-funded bank sync | Free unlimited sync, funded by ads (eCPM) | 509 (3.0 acc) | €707 | −€65 even with €0.20/MAU ad revenue | −10 % | Fails priorities 1–3 (trust, correctness, security): profiling on account data, ePrivacy/GDPR consent, Mint precedent (free ad/lead-gen PFM died) | n/a | Poor | **Rejected** |
| **F** Hybrid freemium | Free = 1 institution (≤ 2 accounts) + import + all correctness features; paid = multi-institution, automation, depth; consented offers rail | 424 (1.6 acc) | €449 | €92 | 17 % | Full promise for one bank; correctness never gated; export and deletion always on | Multi-bank need + 30-day Pro trial + automation/depth | Good | **Chosen**, with guardrail (§3) |
| F′ Hybrid, time-boxed ("Free Classic") | Everyone gets full sync for 90 days; afterwards free = import-only + everything already synced stays | 102 (users in their 90-day window) | €284 | €258 | 48 % | Full promise experienced by everyone for a quarter (≈ the 90-day history window and half a consent period); after that the free user keeps a correct, exportable ledger | Highest trial exposure; conversion happens at a natural moment ("i tuoi conti smettono di aggiornarsi") | Acceptable if communicated up front | **Fallback** if AIS > €0.20 |
| **G** Trial-gated (no free sync; 30-day trial) | Monarch/YNAB model | 45 | €563 | €826 (at 350 subs/1k MAU) | 59 % | Clean economics; smaller top of funnel; Italian "free" expectation unmet | RevenueCat: hard paywall ≈ 5× freemium trial→paid rate (W-1) | Unproven in Italy; neobank tiers set a €0 anchor | Comparator; revisit at the 12-month review if F misses its guardrail twice |

Reading: at Base the per-1k-MAU gross profit ranking is G > A ≈ F′ > D(per-call) > C > B = F > E. The ranking inverts on top-of-funnel and trust: F and F′ keep the promise real for free users and keep correctness ungated; A and G ask Italians to pay before they have seen Lilleri reconcile anything.

---

## 3. Proposal → critique → counter-proposal → decision

**Proposal (monetisation lead):** Model F with a generous free tier: 2 institutions free, background refresh included, 12-month history, all AI; Plus adds unlimited institutions, forecasting, household. Rationale: Finanzguru's free core scaled to > 3 M users; Italians expect free; trust is built by giving away correctness.

**Critique (CFO):** At Base inputs the proposal is contribution-negative. Two free institutions ≈ 2.4 accounts × €0.30 = €0.72/month per connected free MAU; with ≈ 50 % of free MAU connected and 120 paid subscriptions per 1,000 MAU, free-user bank-data cost (≈ €300 per 1,000 MAU) exceeds the entire subscription contribution (≈ €276). Finanzguru funds its free core with ≈ 70 % commission revenue (FACT, R-EU S-35, S-68) that Lilleri has decided to keep opt-in and modest. Moneyhub, Spiir, Yolt and Grip show what happens to a generous free-plus-subscription PFM without a second rail (FACT, R-EU §5). The provider price is UNKNOWN; the plan cannot assume the Low value.

**Counter-proposal (product):** Keep F but shrink the free sync envelope to one institution (max 2 accounts) and pause background sync for inactive users; add a 30-day no-card Pro trial so every new user experiences all accounts and the reconciliation across them; gate automation and depth, never correctness. Add the RFP requirements that make the free tier cheaper: per-user (not per-account) pricing, no billing for accounts not accessed in the month, a "lite" rate for single-institution users. And define the fallback (F′) now, so that the free tier does not become a slow-motion Moneyhub.

**Critique round 2 (CFO):** Accepted, with numbers attached. The free tier is allowed to cost at most one third of blended net ARPPU per paying subscription (≤ €1.20/month). Target inputs (AIS €0.20, 180 subscriptions per 1,000 MAU, offers €0.15/MAU) give 59 % GM and break-even at ≈ 240 k MAU on a €120 k/month fixed base (`revenue-scenarios.md`). Base inputs do not break even at any scale. Therefore the guardrail is not decorative: it is the kill criterion for the free sync.

**DECISION D-BM-1 (free tier = Model F, guarded).**

| Element | Decision | Condition / review |
|---|---|---|
| Free sync envelope | 1 institution, max 2 accounts, automatic sync (background 1×/day + on open) while the user is active | Active = app opened in the last 14 days; otherwise background sync pauses; a consent not used for 90 days is left to expire with a plain-language explanation |
| Free import | Unlimited manual accounts, CSV/PDF/statement import; imported data gets the same categorisation, learning, rules, reconciliation and Review Inbox | Always |
| Trial | 30-day Pro trial for every new account, no card on web; store-native introductory offer on iOS/Android; pre-expiry reminder at day 27 | Never auto-charge without a reminder (R-PP §A #7) |
| Guardrail | Free-tier AIS cost per paid subscription ≤ €1.20/month, measured monthly from month 3 of open beta | Two consecutive misses → switch new cohorts to F′ "Free Classic" (90-day full sync, then import-only); existing free users grandfathered for 12 months |
| RFP requirements that protect the free tier | Per-user pricing option; no charge for accounts not accessed in the month; a lite rate for single-institution users; price ladder at 5 k / 25 k / 100 k accounts | Identical RFP to Enable Banking, Yapily, Tink, Salt Edge, Fabrick (R-OBA §6, R-OBB §16.4) |
| Reversibility | Free envelope can be widened (2 institutions) if measured AIS ≤ €0.15 and conversion ≥ 20 % of MAU | Reviewed quarterly |

Rejected: E (ads); A and G as primary models (promise not experienced for free; Italian "free" expectation); D as a cost lever (unless per-call pricing is quoted).

---

## 4. Plan ladder and paywall dimensions

Plan names in product copy (Italian): **Lilleri Free**, **Lilleri Plus**, **Lilleri Pro**, **Lilleri Famiglia**; **Lilleri Business** is "Later" (partita IVA users: business/personal split, fattura elettronica import, accountant export). Prices are DECISION values from `pricing-analysis.md` §7 (Low/Base/High there).

### 4.1 What is never paywalled (rule)

**Rule (DECISION D-BM-2):** anything that makes the user's data correct, safe or portable is free for everyone. Monetisation gates *breadth, automation and depth*, never *correctness, security or privacy*. Italian copy: "Quello che rende i tuoi dati corretti e sicuri è gratis. Sempre." (What makes your data correct and safe is free. Always.)

| Always free (all plans) | Why |
|---|---|
| Automatic categorisation with per-user learning; explicit rules (rules win over AI); unlimited custom categories | Gating categories/rules blocks the corrections that make the AI learn and is the most resented paywall in the EU set (R-EU §12 #2; R-PP §A #15) |
| Review Inbox ("inbox zero per le tue finanze"), transfer/duplicate/pending/refund/card-settlement reconciliation on all data in the app | Reconciliation is the promise and the trust surface |
| Consent management: list of connections, expiry countdown, revoke, renew; sync-failure explanations naming bank, cause and next retry | R-PP §H #3–#4 |
| Security: passkeys/2FA, device/session management, biometric lock, breach-style alerts | Priority 3 |
| Privacy: data minimisation choices, "who sees my data" page, AI-processing opt-outs, no data selling | Priority 7; Revolut Sep-2026 disclosure incident made this a live Italian question (R-IT §3.1) |
| Export (CSV/PDF/JSON) on every platform; account deletion; data portability | R-US §5 #15; Moneyhub/Mint/Oval lessons |
| Read-only, named regulated aggregator shown on the consent screen | R-PP §E |

### 4.2 Paywall dimensions by plan

| Dimension | Free | Plus (€4.99/mo · €39.99/yr) | Pro (€7.99/mo · €64.99/yr) | Family (€9.99/mo · €79.99/yr) | Business (Later) |
|---|---|---|---|---|---|
| Institutions (bank connections) | 1 | Unlimited | Unlimited | Unlimited per member | Unlimited + business accounts |
| Accounts | ≤ 2 synced + unlimited manual/import | Unlimited | Unlimited | Unlimited | Unlimited |
| Refresh | Background 1×/day while active + on open | Background up to 4×/day (law), push on new/pending items | As Plus + priority refresh windows | As Pro | As Pro |
| History depth in reports | Rolling 12 months (data is never deleted; older history exportable) | Unlimited | Unlimited | Unlimited | Unlimited + fiscal-year views |
| Advanced AI | Categorisation + learning + monthly summary | + natural-language search, anomaly alerts, subscription price-increase alerts | + AI assistant chat over own data ("Chiedi a Lilleri"), monthly "AI budget" with variance and suggestions, forecasting narratives | As Pro, household-level | + VAT/expense tagging assistant |
| Receipts (scontrini) | Attach photo (no extraction) | Attach photo | OCR extraction + line-item split + match to transaction | As Pro | + fattura elettronica import |
| Household | — | — | — | Up to 5 members, shared household ledger, joint-account semantics, split-tagging on personal accounts, contribution rules | Team seats |
| Export | CSV/PDF/JSON always | + scheduled export | + API token | + per-member export | + accountant export |
| Forecasting | Safe-to-spend ("Quanto posso spendere") 30-day | + 30-day balance forecast per account | + 12-month cash-flow forecast, scenarios, irregular bills (TARI, bollo, condominio) | As Pro | + tax set-aside |
| Automation | Rules apply automatically | + auto-apply learned suggestions above confidence; recurring auto-detection | + "autopilot" rules (auto-split, auto-tag reimbursements), reconciliation suggestions auto-accepted at high confidence | As Pro | + bulk ops |
| Insights | Monthly summary, top categories, subscriptions list | + weekly digest, duplicate-subscription and price-rise alerts, cash-flow trend | + net-worth, savings-rate, goal tracking, year review | + per-member and household insights | + P&L view |
| Rules | Unlimited | Unlimited | Unlimited + rule templates | Unlimited | Unlimited |
| Support | Email, 48 h | Email, 24 h | Chat + email, same day | Same day | Same day |

Notes: (a) "1 institution" rather than "1 account" because an Italian institution often exposes current account + card/prepaid account (Fineco card accounts via Enable Banking since Mar 2026; UniCredit/Mediolanum/Crédit Agricole do not expose card accounts — FACT, R-OBB §1); capping accounts at 2 keeps free AIS cost bounded. (b) History: data retention is a trust feature; the paywall is on *reporting* depth, never on keeping or exporting the user's own data. (c) Pro is single-user; Family is Pro for the household — the €1 gap is deliberate anchoring (`pricing-analysis.md` §4).

### 4.3 Paywall behaviour (DECISION D-BM-3)

- Upgrade prompts appear only at the moment a gated dimension is touched ("Aggiungi una seconda banca con Plus"), never inside the Review Inbox, never on sync-failure screens.
- Pricing shown gross incl. VAT in EUR, monthly and annual side by side, with the annual saving in euro ("Risparmi €19,89 all'anno").
- Cancellation in two taps from Settings; pre-renewal reminder 3 days before every renewal (monthly and annual); refunds for accidental renewals within 14 days on web.
- Grandfathering: early adopters keep their launch price for life; any list-price increase applies to new subscribers only (YNAB $99→$109 backlash, R-PP §F).

---

## 5. Advertising and sponsored revenue: evaluation A–F

Revenue per MAU is the honest metric; the Italian consumer-PFM MAU is small and sensitive. Ad revenue assumptions: display eCPM €0.50–2.00 (ASSUMPTION, low; Italian in-app finance inventory), 20–40 sessions/MAU/month (ASSUMPTION), one impression per session.

| Model | Mechanics | Revenue per MAU per month (L/B/H) | Trust impact | Legal / regulatory | UX | Verdict |
|---|---|---|---|---|---|---|
| **A** Generic display ads | Banners/interstitials from ad networks | €0.01 / €0.03 / €0.08 | Severe: "the app that sells my attention"; Mint's free model is the cautionary tale (R-US §1); Splitwise's ad-gated free tier is the alternative-seeking trigger in Italy (R-IT §4.1) | Ad SDKs = third-party processors in a financial app; Garante cookie/tracking consent; DPIA impact; app-store privacy labels | Breaks the calm "inbox zero" surface | **Rejected** |
| **B** Contextual ads | Ads keyed on category/merchant data | €0.03 / €0.10 / €0.25 | Severe: profiling on bank data is exactly what users fear (R-PP §E); any targeting on account data conflicts with PSD2 art. 67(2)(f) purpose limitation | Explicit consent for profiling; account data used beyond the AIS purpose — counsel would have to clear it; likely not | Same | **Rejected** |
| **C** Sponsored financial offers | Partner products shown in a dedicated section (e.g., a savings account, an ETF plan) | €0.02 / €0.08 / €0.20 | Medium: acceptable only if clearly labelled, never ranked by payout without disclosure, never framed as advice | Not "consulenza finanziaria" (no personalised recommendation); IVASS/Consob rules if insurance/investment products are promoted; disclosure of compensation | Separate "Offerte" tab; off by default | **Allowed later (Phase 2)** under §6 rules |
| **D** Affiliate marketplace (bank/broker referral) | "Apri un conto X" links; payout per funded account €10 / €25 / €60 (ASSUMPTION, R-BC §13) | €0.03 / €0.10 / €0.25 (≈ 0.3–0.5 % of MAU convert per month) | Medium-low: this is how Italian creators monetise today (every video carries 5–10 referral codes, FACT R-IT); users understand the model when it is disclosed | Affiliate networks (Awin/Tradedoubler) or direct; disclosure; no account-data-driven targeting without consent | Same tab; a user who already has that bank should not see it (uses linked-institution list — requires the offers consent) | **Allowed (Phase 2)**; the first rail to build |
| **E** Cashback | Merchant-funded cashback on card spend (1–5 % of basket, publisher share 30–50 %) | €0.02 / €0.10 / €0.30 | Medium: needs matching of card transactions to merchant offers → account data used for a commercial purpose → consent; Satispay/Hype already own cashback in Italy | Separate consent; merchant network contracts; VAT on cashback; AML considerations if Lilleri pays out | Only with a partner network; payouts complicate the product | **Later (Phase 3)**; not before 100 k MAU |
| **F** Switching (energy, telco, insurance, mortgage via comparators) | Detect a recurring bill, offer a comparison; CPA per completed switch €15 / €35 / €80 (ASSUMPTION, R-BC §13) | €0.05 / €0.15 / €0.40 (Snoop: switching is "by far the biggest" revenue; Finanzguru ≈ 70 % commissions — FACT R-EU) | Medium: aligned ("when the customer wins, we do too") if the comparison is honest and the user initiates | Comparator partnership (Facile.it/SOStariffe/Segugio) carries the licences; Lilleri discloses compensation; no recommendation language | Triggered from a detected bill, one tap to opt in | **Allowed (Phase 2–3)**; highest-value aligned rail |

**DECISION D-BM-4 (advertising):** No ads (A, B) — stated publicly as a product promise ("Niente pubblicità. Mai." — No ads. Ever.). C, D and F form a single opt-in "Offerte" rail, built after the beta proves retention and trust metrics (`go-to-market.md` §8), never before. E only with a partner and after 100 k MAU. Revenue modelling uses €0.02 / €0.10 / €0.25 per MAU per month for the whole rail (`unit-economics.md` U31), well below the Finanzguru-derived €0.47 upper anchor (R-BC §13).

---

## 6. Revenue add-ons policy (DECISION D-BM-5)

| Rule | Implementation | Italian copy (gloss) |
|---|---|---|
| Clearly labelled | Every sponsored or affiliate item carries a visible label and the compensation statement; no native placement inside transactions, insights or the Review Inbox | "Offerta partner — Lilleri riceve un compenso se attivi questo prodotto." (Partner offer — Lilleri is paid if you activate this product.) |
| Optional, separate consent | The "Offerte" rail is off by default; enabling it is a separate, revocable consent, logged with timestamp and scope; it is distinct from the PSD2 consent and from analytics consent | "Vuoi vedere offerte basate sui tuoi movimenti? Puoi disattivarle quando vuoi." (Do you want to see offers based on your transactions? You can turn them off any time.) |
| Purpose limitation | Account data is used for offers only after that consent; counsel confirms the construction under PSD2 art. 67(2)(f) and GDPR art. 6 before launch of the rail (OPEN QUESTION Q4) | — |
| No hidden advice | Offers are comparisons or referrals, never personalised recommendations; no "you should" language; no ranking by payout without saying so; insurance/investment products only through licensed partners with their own disclosures | "Lilleri non dà consigli finanziari: ti mostra opzioni, decidi tu." (Lilleri does not give financial advice: it shows options, you decide.) |
| No interference with correctness | Categorisation, reconciliation, alerts and forecasts never change because of a partner relationship; the "why this category" explanation never references offers | — |
| Revenue never degrades the free tier | Offers are shown to Free and paid users alike (paid users can hide the tab entirely); Plus is never "ad-free" because Free is also ad-free | "Nessun piano è 'senza pubblicità' perché nessun piano ha pubblicità." |
| Measurement | Track opt-in rate, opt-out rate, complaints per 1,000 offers shown, NPS delta; kill switch if NPS of opted-in users drops > 5 points vs control | — |

---

## 7. Second rails and later options (HYPOTHESES to validate)

| Rail | What | When | Evidence |
|---|---|---|---|
| Offers rail (C/D/F) | Bank/broker referrals, switching via comparators | Phase 2 (after beta trust metrics) | Finanzguru, Snoop, Italian referral culture (R-EU §9; R-IT §9.1.6) |
| Family / household | Pro for up to 5 members | Launch | Monarch household "best-in-class"; Italian couples norm (R-US §5 #9; R-IT §4.5) |
| Business (partita IVA) | Business/personal split, tax set-aside, accountant export, fattura elettronica import | Later (12–18 months) | Creator evidence of freelancers parking tax money (R-IT §7) |
| B2B2C / white-label | Lilleri's reconciliation engine inside a bank or broker app; a bank partner funding referral bonuses | Later; depends on own-AISP registration or partner licence | Fabrick/CBI ecosystem; Tinaba education-as-distribution (R-IT §9.1.6–7) |
| Data products | **Never** sell or license user data, aggregated or not (Snoop sells anonymised trend data — a pattern not adopted) | — | R-EU §9; priority order (trust > revenue) |

---

## 8. Decisions / Recommendations

| ID | Decision | Status | Owner / review |
|---|---|---|---|
| D-BM-1 | Free-tier model F: 1 institution (≤ 2 accounts) synced while active + unlimited import + all correctness features; 30-day no-card Pro trial; guardrail ≤ €1.20 free AIS cost per paid subscription; fallback F′ "Free Classic" (90-day full sync, then import-only) | DECISION | CFO + product; reviewed monthly from beta month 3 |
| D-BM-2 | Never paywall correctness, security, privacy or export (list in §4.1) | DECISION (standing rule) | Product; any exception needs founder sign-off |
| D-BM-3 | Paywall behaviour: contextual upgrade prompts only, gross EUR pricing, two-tap cancel, pre-renewal reminders, lifetime grandfathering of launch prices | DECISION | Product + growth |
| D-BM-4 | No display or contextual ads, ever; opt-in "Offerte" rail (sponsored offers, affiliate referrals, switching) in Phase 2; cashback Phase 3 | DECISION | Founders; counsel on art. 67(2)(f) |
| D-BM-5 | Add-on policy: labelled, separate revocable consent, purpose-limited, no hidden advice, no interference with correctness, no "ad-free" upsell | DECISION | Product + legal |
| D-BM-6 | Plan ladder Free / Plus / Pro / Family; Business Later; prices per `pricing-analysis.md` | DECISION (prices to be tested in beta) | Monetisation |
| D-BM-7 | RFP to providers must request per-user pricing, no-charge for non-accessed accounts, lite single-institution rate, and 5 k / 25 k / 100 k ladder; the free tier's shape is finalised only after quotes | DECISION | Founders; 2 weeks |
| R-BM-1 | Run a Van Westendorp + plan-choice survey in the waitlist cohort before fixing Plus at €4.99 vs €5.99 | Recommendation | Growth |
| R-BM-2 | Model and report "free AIS cost per paid subscription", "paid subscriptions per 1,000 MAU" and "offers revenue per MAU" as the three business KPIs from beta day 1 | Recommendation | Data |

---

## 9. Open questions

| # | Question | Why it matters | How to verify |
|---|---|---|---|
| Q1 | Actual AIS price per account-month at 5 k / 25 k / 100 k accounts; minimum invoice; per-user option; charge for accounts not accessed in a month | Decides between F and F′ and the free envelope | Identical RFP to Enable Banking, Yapily, Tink, Salt Edge, Fabrick (R-OBA §6 #1; R-OBB §17) |
| Q2 | Does any provider bill per API call (Yapily "per call + subscription") such that a user-present-only free tier is materially cheaper? | Makes model D a cost lever | RFP question |
| Q3 | Free→paid conversion among *connected* users in Italy with a 1-institution free tier (UNKNOWN for all competitors) | Paid subscriptions per 1,000 MAU is the #2 sensitivity | Closed beta cohorts; RevenueCat benchmarks for freemium finance apps |
| Q4 | Can account data be used for an opt-in offers rail under PSD2 art. 67(2)(f) + GDPR, and what is Banca d'Italia's view of an unlicensed recipient app? | Legal basis of the second rail and of the whole licence route | Counsel memo (R-OBA §2.6 P0; R-OBB §15.1) |
| Q5 | Italian CPAs for bank/broker referrals and energy/telco switches | Offers-rail revenue per MAU | Awin/Tradedoubler IT programme pages; direct talks with 2–3 banks and one comparator |
| Q6 | Whether Intesa XME Banks / Hype paid aggregation categorise external transactions | Whether "see all accounts" is already free for Intesa/Hype customers | Test accounts (R-IT §10 Q1) |
| Q7 | Family: do Italian couples prefer one Family plan or "Plus includes a partner"? | Family price point and ARPPU | Beta survey + A/B |
| Q8 | Does a 30-day trial that connects all accounts and then drops to 1 institution generate complaints ("my accounts stopped updating")? | Churn and reviews | Beta copy test; measure reconnection rate after trial |

---

## 10. Sources

Verification date for carried-over claims: 2026-10-02 (as recorded in the raw documents). W-sources were searched on 2026-10-02 (search-engine summaries, medium reliability unless an official page is named).

| ID | Source | URL | Date seen | Reliability | Used for |
|---|---|---|---|---|---|
| R-BC | `docs/research/raw/business-and-cost-inputs.md` (§1–§3, §8, §12–§14) | repo | 2026-10-02 | medium–high | AIS working ranges, store fees, conversion/retention ranges, affiliate benchmarks |
| R-OBA | `docs/research/raw/open-banking-providers-a.md` (§1.5, §2.1, §2.6, §6) | repo | 2026-10-02 | medium–high | PSD2 mechanics, licensing routes, pricing opacity |
| R-OBB | `docs/research/raw/open-banking-providers-b.md` (§1, §4, §15, §16) | repo | 2026-10-02 | medium–high | Enable Banking per-account model and minimum invoice, card-account exposure, model A/B/C |
| R-US | `docs/research/raw/competitors-us.md` (§1, §4.4, §5, §6, W5–W12) | repo | 2026-10-02 | medium | Mint lesson, Monarch/YNAB trial-gated proof, patterns to avoid |
| R-EU | `docs/research/raw/competitors-eu-uk.md` (§1, §5, §8, §9, §11, §12, S-35, S-68) | repo | 2026-10-02 | medium | EU pricing, shutdowns, Finanzguru commission model, gating complaints |
| R-IT | `docs/research/raw/competitors-italy-and-ai-first.md` (§1, §3.10, §4, §7–§9, W-01, V-09) | repo | 2026-10-02 | low–medium | Italian multi-account behaviour, referral culture, XME Banks/Hype aggregation, couples norms |
| R-PP | `docs/research/raw/user-pain-points.md` (§A, §E, §F, §H) | repo | 2026-10-02 | medium | Trust signals, paywalled-basics complaints, billing surprises |
| R-AI | `docs/research/raw/ai-ml-transaction-intelligence.md` (§7.2) | repo | 2026-10-02 | high (prices) / medium | AI cost per 1k transactions |
| R-BB | `docs/research/raw/build-vs-buy-and-vendors.md` (§2, §6, §18) | repo | 2026-10-02 | medium–high | Billing stack, provider lock-in, AI vendor posture |
| EU-1 | Commission Delegated Regulation (EU) 2018/389, art. 10 and art. 36(5)(b); EBA Q&A 2019_4631 | https://eur-lex.europa.eu/eli/reg_del/2018/389/oj ; https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2019_4631 | 2026-10-02 (via R-OBA) | high | 4×/day background cap; 90-day history without SCA |
| EU-2 | Commission Delegated Regulation (EU) 2022/2360 (180-day SCA renewal, applies 25 Jul 2023) | https://eur-lex.europa.eu/eli/reg_del/2022/2360/oj/eng | 2026-10-02 (via R-OBA/R-EU) | high | Consent cycle |
| EU-3 | PSD2 Directive (EU) 2015/2366 art. 67(2)(f) | https://eur-lex.europa.eu/eli/dir/2015/2366/oj | not fetched (cited via R-OBB §1) | high (law) | Purpose limitation on AIS data |
| EB-1 | Enable Banking FAQ "How much does it cost to use the Enable Banking API?" | https://enablebanking.com/docs/faq/ | 2026-10-02 (mirror + W-4 snippet) | high | Per-account billing, minimum monthly invoice |
| AP-1 | Apple — Apps in the EU (terms effective 2026-10-01) | https://developer.apple.com/support/apps-in-the-eu/ | 2026-10-02 (via R-BC) | high | 15 %/10 % rails |
| GP-1 | Android Developers Blog, "Expanded billing choice and lower fees on Google Play" (Jun 2026), via mirror | https://android-developers.googleblog.com/2026/06/play-expanded-billing.html | 2026-10-02 (via R-BC S43) | medium-high | 10 % service fee + 5 % billing fee |
| W-1 | RevenueCat, State of Subscription Apps 2026 (report + "in 10 minutes" summary) | https://www.revenuecat.com/state-of-subscription-apps ; https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026 | 2026-10-02 | medium (search summary) | Trial length vs conversion; hard paywall vs freemium trial→paid; annual retention |
| W-2 | Satispay Plus page; Aziendabanca "Satispay lancia l'abbonamento"; alphabetcity.it 2026-07-08 | https://www.satispay.com/it-it/privati/satispay-plus/ ; https://www.aziendabanca.it/notizie/fintech-insurtech/satispay-plus ; https://alphabetcity.it/2026/07/08/carta-satispay-mastercard-arrivano-red-metal-e-velvet-costi-limiti-prelievi-gratis-e-pagamenti-in-tutto-il-mondo/ | 2026-10-02 | medium | Plus €3.99/mo or €39.99/yr; Metal €9.99; Velvet €39.99 |
| W-3 | Revolut "Confronta i piani" (IT) + 2026 Italian guides | https://www.revolut.com/it-IT/our-pricing-plans/ ; https://www.agendadigitale.eu/cittadinanza-digitale/pagamenti-digitali/carta-revolut/ | 2026-10-02 | medium | Plus €3.99, Premium €9.99, Metal €15.99, Ultra €55 |
| W-4 | Enable Banking pricing (G2, openbankingtracker, rfp.wiki) | https://www.g2.com/products/enable-banking/pricing ; https://www.rfp.wiki/financial-services-banking-fintech/open-banking-platforms/enable-banking | 2026-10-02 | low-medium | No public unit rates (UNKNOWN stands) |
| W-5 | Hype 2026 reviews (finanza.com, selectra.net, punto-informatico) | https://www.finanza.com/focus/conti/conto-hype-recensione ; https://selectra.net/conti/guida/confronto/hype-start-plus-premium | 2026-10-02 | medium | Next €2.90, Premium €9.90 |
| W-6 | N26 "Confronta i conti" (IT) + 2026 Italian guides | https://n26.com/it-it/conti ; https://pagamenti.net/n26-italia-come-funziona/ | 2026-10-02 | medium | Smart €4.90, You/Go €9.90, Metal €16.90 |
