# Lilleri business model — guarded Gratis, Plus, and later options

**Review date:** 2026-10-02. **Evidence:** external claims and URLs below are inherited from the research; this review rechecks document consistency and arithmetic, not live vendor terms or legal clearance. Source verification dates belong to the cited research. FACT labels there retain the original limitations. All prices, conversion, usage, costs and projections proposed here are ASSUMPTIONS or HYPOTHESES; DECISION means a reversible internal planning choice.

**Delivery boundary (DECISION):** local mock → official sandbox → legally cleared, contracted, consented real-data beta → store launch → later capabilities. Requirements and budgets do not prove implementation. No real-bank keys, bank credentials, purchase, contract, counsel opinion or store billing are obtained by these documents.

## 0. Summary (DECISION and HYPOTHESES)

Launch consumer naming is **Lilleri Gratis / Lilleri Plus**. Brand D7 reserves **Lilleri Pro** for future professional workflows; **Lilleri Famiglia** is Later, after safe sharing ships. The closed beta is free and the current local slice uses synthetic data. Prices are hypotheses, not sale offers: Plus €4.99/month or €39.99/year; later Famiglia €9.99/€79.99 is only a test point.

A bounded one-institution (up to two accounts) live-sync Gratis tier, Model F, remains the **product hypothesis**, subject to written provider pricing/coverage and the legal production route. Manual/CSV data receives the same correctness, correction, privacy and portability treatment as connected data. PDF/XLSX/OFX/QIF support is gated by implemented parsers; “unlimited import” describes a proposed account envelope, never format availability.

The revised Plus-only, zero-offers model produces Base net ARPPU **€2.85**, paid contribution **€1.78**, and GP **−€79.49/1,000 MAU** before minimum invoices/fixed costs. Target GP **€211.17/1,000 MAU** still fails the Base stage budgets. Gate C is conditional and commercially unvalidated. A source quote, willingness-to-pay survey or free beta cannot prove retention or collected revenue.

## 1. What the research fixes before any model is chosen

| # | Finding | Status | Source | Consequence for the model |
|---|---|---|---|---|
| 1.1 | AIS pricing is per connected account (Enable Banking: "number of accounts accessed … per month", minimum monthly invoice exists) or per consented end-user (Salt Edge) or "per call + subscription" (Yapily); no public euro figure for any provider | FACT (model) / UNKNOWN (numbers) | R-OBB §4, §16.2; R-OBA §1.5; R-BC §3 | COGS of a free user is a recurring per-account fee, not a one-off |
| 1.2 | Working range €0.10 / €0.30 / €0.60 per account-month; platform minimum €0 / €500 / €2,000 per month | ASSUMPTION (low-medium) | R-BC §3 working ranges | Base free-user AIS cost = 1.6 accounts × €0.30 ≈ €0.48 |
| 1.3 | Regulatory unattended-access limits and SCA rules apply; actual provider/bank quotas and consent `valid_until` must be read and tested; never promise a universal 180-day lifetime or uncapped bank responses | Carried law reference; implementation OPEN | RTS 2018/389 art. 36(5)(b), EBA Q&A 2019_4631; Reg. (EU) 2022/2360 — R-OBA §2.1 | "Limited refresh" is a product lever, not necessarily a cost lever (per-account billing) |
| 1.4 | Italian creators use 3–5 banking relationships; "works with Fineco/BBVA/Revolut" is the bar | FACT (low-medium) | R-IT §1.3, Y-02/Y-03 | Multi-institution is the paid value; one institution is a genuine but partial free experience |
| 1.5 | Italians expect free money apps; bank apps' analytics are free; Moneyhub at £1.49 was loved and still closed | FACT (low–medium) | R-BC §2; R-EU §3.4 | A "free tier" must be real; monetise depth and automation |
| 1.6 | Freemium PFM free→paid conversion is UNKNOWN for every competitor; RevenueCat search summaries compare hard-paywall/freemium and trial length; original cohort/denominator labels require primary-source verification before conversion rates are reused | UNKNOWN (PFM and benchmark denominator applicability; W-1 search summary) | R-BC §1.4; W-1 | 30-day non-renewing preview is a HYPOTHESIS; study denominators must be verified before any conversion benchmark is reused |
| 1.7 | Finanzguru: > 3 M users, ≈ €40 M 2025 revenue, ≈ 70 % commissions; generous free core (multibanking, categorisation, contracts) | FACT (medium-high) | R-EU S-68, S-35 | Comparator for a different commission-heavy model; not proof of Lilleri conversion or profitability |
| 1.8 | Monarch: $100 M ARR, > 1 M members, trial-gated (no free tier); YNAB $109/yr, 34-day no-card trial | FACT (high) | R-US W12, W5 | Paid US comparator; no causal proof or Italian WTP evidence |
| 1.9 | Trust is lost through billing surprises, unauthorised actions, data selling, shutdowns and opaque failures; won through named regulated aggregator, read-only, export, deletion | FACT | R-PP §E, §A #7 | Ads, hidden affiliate steering and dark-pattern cancellation are off the table |
| 1.10 | Cross-bank *aggregation* is already offered by Intesa (XME Banks) and Hype (paid plans); categorisation of external transactions, transfer reconciliation and a review inbox are not | FACT medium / UNKNOWN depth | R-IT §3.10, V-09, W-01 | The paid value is reconciliation quality and automation, not "see all accounts" |
| 1.11 | Apple EU terms from 2026-10-01: IAP 15 % (Small Business Program), alternative payment in-app 10 %, out-of-app link 10 %; Google Play EEA from 2026-06-30: 10 % service fee on subscriptions + 5 % billing fee only with Play Billing | Carried source claim; live contract applicability UNKNOWN | R-BC §8 | Use provisional take envelope; verify effective fees, eligibility, tax and programme terms before checkout |
| 1.12 | PSD2 art. 67(2)(f): an AISP may use account data only for the AIS explicitly requested by the user; Banca d'Italia's position on an unlicensed *recipient* app is UNKNOWN | FACT (law) / UNKNOWN | R-OBA §2.6; R-OBB §15.1 | Any offers rail that uses account data needs its own consent and counsel sign-off |

---


## 2. Free-tier models A–F (plus G comparator)

The former four-plan/offer model output columns are retired. Below are comparative unit drivers; conversion and lifetime effects remain UNKNOWN. Base cohort has 120 Plus subscribers, 880 Gratis MAU, 440 connected Gratis users at 1.6 accounts and AIS €0.30/account-month. No offers, trials or minimums are included in these illustrative stationary GP figures.

| Model | Shape | Cost / commercial critique | Trust / UX tradeoff | Decision |
|---|---|---|---|---|
| A | Gratis manual + implemented imports; live sync paid | Base delivery COGS ~€196, GP ~€146/1k MAU if cohort unchanged; conversion cannot be assumed unchanged | Multi-source promise must be demonstrated through a clear non-renewing preview or imports | Fallback component, not yet a new launch promise |
| B | One institution with all its accounts free | No account cap means unknown liability; one-bank activation may not show cross-bank value | Useful single-bank experience; show second-bank gain concretely | Use only with cap C |
| C | One or two synced accounts free | One-account Base reduces direct AIS by ~€79/1k; GP ~€−0.29 if all other cohorts unchanged | Two accounts across institutions could demonstrate transfer pairing; institution pricing may still bill twice | Test against F after provider quotes |
| D | Less frequent/user-present free refresh | Per-account costs may be identical to F; per-call savings only after quotes | Freshness, reauthentication and provider errors stay visible; service safety notices always free | UX lever; no assumed invoice savings |
| E | Ad-funded unlimited free sync | Unknown eCPM/opt-in and increased data/support cost; cannot be relied on to cover AIS | Banner/contextual targeting conflicts with trust and purpose limitation | Reject |
| F | One institution, ≤2 accounts + manual/CSV; Plus breadth/planning | Base GP −€79.49/1k; free AIS subsidy €1.76/paid sub violates guardrail | Real free utility with correction/export intact | Product hypothesis pending quotes and legal gates |
| F′ | Disclosed time-boxed sync then import/manual | Cohort flow, new-user rate and preview cost must be modelled; no steady “90-day” savings inferred | User sees final limits before connecting; history stays accessible/exportable | Pre-agreed contingency for **new cohorts**, review before release |
| G | Paid sync after non-renewing preview | Paid fraction and retention UNKNOWN in Italy; no 35%-MAU conversion assumption | Narrower adoption; preserve free correctness/access to retained data | Comparator; major business-shape choice requires founder review with evidence |

## 3. Proposal → critique → counterproposal → decision

**Proposal (original monetisation synthesis):** Free / Plus / Pro / Family, full Pro trial and future commissions fund a generous synced free tier.

**Critique (investor and CFO):** The revenue mix creates cash from assistant/OCR/household capabilities that the MVP excludes. Italian WTP and provider billing are UNKNOWN. Commission-funded competitors do not establish Lilleri economics. Gratis bank data can cost more than paying-user contribution. Lifetime price promises and five-seat family prices assume liabilities before retention/coverage are known.

**Counterproposal (PM with brand owner):** Launch Gratis / Plus, with core data correctness and safety ungated. Charge for supported source breadth, implemented optional planning/automation and reporting, not corrections. Keep Famiglia Later; reserve Pro for professional use. Preview is non-renewing Plus access after entitlement implementation; closed beta remains free. Offer income is zero in the launch model. Provide a funded, disclosed fallback and re-evaluate it with quotes and cohorts.

**DECISION D-BM-1:** use F as a conditional product hypothesis; final live-sync envelope follows quotes and legal/coverage gates, with no real-data activation here. Guardrail **free AIS cost / active paid subscription ≤ €0.95/month** (~one third of Base net Plus €2.85), recomputed if price/fees change. An all-free beta has no paid denominator: report absolute cost and shadow subsidy, not a pass. Two actual paid-cohort misses require new-cohort F′ review with copy/usability evidence and a funded transition. Do not silently degrade existing paid or free promises; no unfunded 12-month grandfathering commitment.

| Element | Proposal / gate |
|---|---|
| Gratis sync | 1 supported institution, ≤2 supported account types; background cadence based on verified bank/provider quotas and consent state |
| Inactivity | Proposed 14-day Gratis background pause with visible freshness/resume; lower call volume saves money only if the contract confirms it; no forced shortening of bank consent |
| Manual/CSV | No monetisation cap on correctness/retained data; implemented formats only, with file-size/security limits visible |
| Preview | Proposed 30-day non-renewing Plus entitlement; day-23/day-27 expiry notices; no card/checkout purchase, no autocharge; real billing requires explicit separate checkout |
| Trial end | User selects Gratis sources; surplus new sync pauses after notice; retained ledger still correctable/exportable; no paid security/consent gate |
| RFP | Ask per-account/per-user/per-call, dormant billing, reconnect/refresh, minimum vs additive fees, account-type coverage and 5k/25k/100k ladders |
| F′ | Proposed 90-day sync window for new cohorts only; start/end/available formats and future charges disclosed before consent; operational and acquisition cost unknown |

## 4. Canonical plan ladder and capability gates

**DECISION D-BM-6:** Italian public names and exactly one launch paid tier. Entitlement IDs are stable and independent of labels. A plan table advertises a capability only after implementation, validation and stage clearance; “Later” is not a purchasable SKU.

| Capability | Gratis | Plus (price HYPOTHESIS €4.99/mo, €39.99/yr) | Famiglia Later | Pro reserved |
|---|---|---|---|---|
| Source breadth | Proposed one institution/≤2 accounts + manual and supported imports | Supported multiple institutions; contracted/tested caps and fair usage, no coverage guarantee | Members' supported accounts after lawful sharing | Professional sources researched separately |
| Correctness/learning | Categorisation, learned corrections, rules, custom categories, reconciliation, Review Inbox, evidence and undo on all held data | Same guarantees | Same per member | Same guarantees |
| Freshness/service safety | Last update, mismatches, connection failures, revoke/renew, security notices always free | Optional faster refresh only within actual quotas; never guarantee bank delivery | Same safety notices | Later specification |
| Retained history | View/search/correct/export held records subject to disclosed retention | Optional advanced reports and scheduled export only when implemented | Own-member export and controlled shared view | Professional reporting researched later |
| Recurring/insight | Core recurring detection and factual picture; estimates labelled | Optional forecasting/scenarios/proactive planning after accuracy validation | Household planning only after sharing gates | No tax/accounting advice promised |
| Receipts/chat/API | No entitlement promised; Later by separate product/privacy gates | Add only when delivered and costed; “advanced AI” cannot mean more accurate categories | Same gate | No speculative bundle or launch price |
| Household | Personal account; no sharing UI | Personal account | Shared data permission, invite/revoke, member isolation, own export/deletion, privacy tests required; no promised five seats | Professional scope separate |

**DECISION D-BM-2 — never monetise correctness, security, privacy or portability.** Applies to retained data, imports, plan expiry and failure screens. No paywall on categorisation/learning/rules, corrections, custom categories, matching/undo/explanations, consent safety, accessible security controls, privacy/AI opt-outs, account deletion and portable export. Export formats are implementation requirements; a CSV route plus machine-readable portability is launch-critical, PDF/JSON/ZIP support must be tested before being named. All users have equal incident/privacy/billing help; paid priority support may apply only to optional planning questions after capacity exists.

**DECISION D-BM-3 — paywall behaviour:** contextual upgrade at a requested supported source/planning benefit; explicit VAT-inclusive total and period; easy cancel and restore; reminders; no prompt in Review Inbox, sync-error, consent, deletion/export or distress flows. Preview does not renew. Cancellation removes future renewal via the real channel and preserves data rights. Price-change policy promises notice and review, not lifetime price protection.

## 5. Advertising and optional add-ons

| Model | Economics / risks | Decision |
|---|---|---|
| A display / B contextual banners | Revenue UNKNOWN; third-party tracking/processors and potential prohibited bank-data purposes | Reject; no ad SDK or category targeting in core surfaces |
| C sponsored offers | Partner payout and user value unvalidated; promotion may trigger rules beyond disclosure | Later hypothesis, labelled “Offerta partner” in a dedicated optional area |
| D referrals | Italian creator practice is a comparator, not Lilleri CPA; partner terms/eligibility unknown | Later after contract, legal and trust gates |
| E cashback | Adds transaction matching, payout/support and regulatory responsibilities | Later research only |
| F switching | User-initiated comparison; account-data purpose and regulated promotion remain questions | Later research only; no personalised ranking/advice assumed lawful |

**DECISION D-BM-4:** launch has no offer rail. Its default projected revenue is €0. Avoid “Niente pubblicità. Mai.” while sponsored offers remain a future option; approved draft is **“Niente banner. Non vendiamo i tuoi dati.”** (“No banners. We do not sell your data.”). Permission to explore a rail is not permission to launch it or use account data for it.

## 6. Revenue add-ons policy (DECISION D-BM-5, Later only)

Dedicated optional area, off by default, labelled compensation, no placement in transactions/inbox/insights, no distress triggers or payout-based ranking. Disclosure and a checkbox do not establish a lawful AIS data-use purpose: counsel must first confirm the route and restrictions, including whether consent can validly authorise the proposed use. Start with user-selected interests and no account-data targeting if lawful. Separate revocable choices, processor minimisation, partner evidence and complaint/opt-out measurements remain required. No user data sale, no hidden advice, no lending/money movement. Run a controlled trust experiment only after the product, legal, contract and security gates; “NPS delta” is observational unless selection bias is controlled. A kill switch disables the rail if complaints or trust harm exceed the pre-agreed limits.

## 7. Decisions / Recommendations

| ID | Decision / recommendation |
|---|---|
| D-BM-1 | Guarded Model F hypothesis; free AIS subsidy ≤€0.95/active paid sub; all-free beta ratio unavailable; F′ contingent new-cohort shape |
| D-BM-2 | Correctness/learning/correction, safety/privacy/consent and export/deletion free for all, including downgrade |
| D-BM-3 | Non-renewing preview, separate explicit purchase; supported-benefit prompts and easy cancellation; no lifetime pricing promise |
| D-BM-4 | No display/contextual banners; offer rail Later only, launch revenue €0 |
| D-BM-5 | No data sale, no hidden advice, no core interference; opt-in never substitutes for legal basis/allowed purpose |
| D-BM-6 | Gratis / Plus launch; Famiglia Later with safe sharing; Pro reserved for professional use; all prices hypotheses |
| D-BM-7 | Identical RFP questions for billing and account-type coverage before live free-tier commitment |
| R-BM-1 | Run price, paid benefit and preview-end comprehension tests; survey WTP is distinct from purchase/renewal |
| R-BM-2 | Track actual invoices and cohort retention; report shadow economics while beta is free |

## 8. Open questions

Written fees/coverage, dormant account billing, legal licence route, sustainable Gratis envelope, actual paid retention, safe household seat count, preview-dropoff complaints, regulated promotion restrictions and partner CPA. Investigate with quotes, counsel and opt-in cleared cohorts. B2B2C/professional routes remain separate options rather than compensating for weak consumer evidence.

## Review log

| Reviewer | Finding | Resolution |
|---|---|---|
| Brand/PM (major) | Four-plan ladder contradicted brand D7 and consumer simplicity | Agreed with brand owner: Gratis / Plus, Famiglia Later, Pro professional reserved |
| CFO (blocker) | Free tier relied on unavailable paid capabilities and offers | Launch economic mix narrowed; zero offers; Base negative; guardrail recalculated €0.95 |
| PM (major) | Store intro purchase presented as universal no-card trial | Non-renewing preview only; closed beta free; explicit purchase separate and gated |
| Privacy (blocker) | Separate offers consent described as sufficient for commercial AIS use | Added prior lawful-purpose/licence check; consent alone cannot clear prohibition |
| CFO/consumer (major) | Lifetime prices, five-member Famiglia and automatic 12-month free grandfathering created unfunded commitments | Removed committed seats/lifetime protection; funded transition and notice required |
| Growth/brand (major) | Absolute no-ad promise conflicted with sponsored offers | No-banner/no-data-sale draft and Later optional labelled rail |

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
