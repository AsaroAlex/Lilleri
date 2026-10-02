# Lilleri pricing analysis — research anchors and testable prices

**Review date:** 2026-10-02. **Evidence:** external claims and URLs below are inherited from the research; this review rechecks document consistency and arithmetic, not live vendor terms or legal clearance. Source verification dates belong to the cited research. FACT labels there retain the original limitations. All prices, conversion, usage, costs and projections proposed here are ASSUMPTIONS or HYPOTHESES; DECISION means a reversible internal planning choice.

**Delivery boundary (DECISION):** local mock → official sandbox → legally cleared, contracted, consented real-data beta → store launch → later capabilities. Requirements and budgets do not prove implementation. No real-bank keys, bank credentials, purchase, contract, counsel opinion or store billing are obtained by these documents.

## 0. Pricing conclusion

**DECISION:** one consumer paid SKU at launch, **Lilleri Plus**, beside **Lilleri Gratis**. Plus **€4.99/month or €39.99/year** is a HYPOTHESIS, with €3.99/€29.99 and €5.99/€49.99 alternatives. Consumer **Lilleri Famiglia** is Later after safe sharing ships; hypothetical €9.99/€79.99 is a test anchor, not a purchasable five-seat promise. **Lilleri Pro** is reserved for future professional workflows; no launch price or SKU.

Italian willingness to pay is UNKNOWN. Competitor prices below are carried research observations with source limits; they do not establish Lilleri conversion. The free beta has no paid conversion. Proposed 30-day **non-renewing Plus preview** needs implemented entitlements and tested end-state copy; it requires no card and never charges at expiry. Store introductory auto-renewing offers are not part of this proposal.

The prior blended €3.68 ARPPU is retired. At 60% annual mix and provisional 13% effective take, net Plus ARPPU is **€2.85**. Revised Base GP is **−€79.49/1k MAU** with offers zero. Test prices against retained net contribution rather than assumed unchanged demand.

## 1. Competitor price table (EUR-converted; state as of 2026-10-02)

### 1.1 PFM apps (US, UK, EU)

| Product (market) | Monthly | Annual | EUR monthly / annual (converted) | Free tier | Trial | Household | Status / source | Doubts |
|---|---|---|---|---|---|---|---|---|
| YNAB (US; Direct Import in IT via Plaid since 2025-02-05) | $14.99 | $109 | €12.82 / €93.20 | None | 34 days, no card | YNAB Together up to 6 | FACT (R-US W5, S6, W2) | $109 effective 2024-08-01 (medium) |
| Monarch (US/CA) | $14.99 | Core $99.99; Plus annual-only | €12.82 / €85.49; Plus €255 ($299 launch release) vs €170 ($199 review sites) | None | 7 days, card | Unlimited household | FACT (R-US S20, W7, W10) | Plus price CONFLICT $299 vs $199 — verify monarch.com/pricing |
| Copilot (US) | $13 | $95 | €11.12 / €81.23 | None | 1 month | Single user | FACT (R-US W16) | — |
| Rocket Money (US) | Premium $7–$14 "pay what you want"; Premium+ $15 | — | €5.99–€11.97; €12.83 | Yes (limited) | — | UNKNOWN | FACT (R-US S71, W18) | — |
| Quicken Simplifi (US/CA) | promo $3.49–3.99 billed annually; renewal $6.99/mo billed annually ($83.88) | $47.88 promo / $83.88 renewal | €40.94 promo / €71.72 renewal | None | 30-day money-back | 1 shared space | FACT (R-US W21) | Promos change monthly |
| PocketGuard (US) | $12.99 | $74.99; lifetime $149.99 | €11.11 / €64.12; €128.24 | Removed 2026 (7-day trial) | 7 days | UNKNOWN | FACT medium (R-US W27) | — |
| Origin (US) | $12.99 | $99 ($1 first-year promo seen) | €11.11 / €84.65 | None | 7 days | Partner free | FACT medium (R-US S140) | — |
| Emma (UK/US/CA) | Plus £4.99; Pro £9.99; Ultimate £14.99 | £41.99 / £83.99 / £124.99 | €5.84 / €49.13; €11.69 / €98.27; €17.54 / €146.24 | Yes (2 logins) | Trial auto-converts | £5.99/extra member on Ultimate | FACT high (R-EU S-63) | Not sold in EU |
| Snoop (UK) | Plus £5.99 | £47.99 | €7.01 / €56.15 | Yes (most features) | — | — | FACT high (R-EU S-70; +20 % in 2026) | — |
| Plum (IT page) | Pro €3.99; Premium €9.99 | — | €3.99 / €9.99 | Basic free | 30 days (UK paid tiers) | — | FACT high (R-EU S-66, withplum.com/it-it) | Savings/invest app with light PFM |
| Moneyhub (UK, closed 31 Jul 2026) | £1.49 | £14.99 | €1.74 / €17.54 | 6 months free | — | — | FACT (R-EU S-07a, S-83) | Benchmark of a price that did not sustain D2C |
| Spendee (CZ; IT via Salt Edge) | Premium $5.99; Plus $1.99 | $35.99; $14.99 | €5.12 / €30.77; €1.70 / €12.82 | Basic free | 7 days | Shared wallets | FACT high (R-EU S-75; Premium ≈ ×2 in 2025–26) | EUR storefront UNKNOWN |
| Wallet by BudgetBakers (CZ; IT via Salt Edge) | IT App Store IAPs €5.99 / €17.99 / €29.99; 3-year €59.99 | periods unlabelled (€5.99 ≈ monthly, €29.99 ≈ yearly — ASSUMPTION) | €5.99 / €29.99 | Manual tracking | — | Group sharing (A) | FACT (amounts) / ASSUMPTION (periods) (R-EU S-74) | Italian creators' default tracker |
| MoneyWiz (global; IT via Salt Edge Partner) | $4.99 | $49.99; Standard $19.99 | €4.27 / €42.74 | None | trial | — | FACT medium (R-EU S-40a) | — |
| Money Pro (global) | — | Gold $69.99 (bank sync) | €59.84/yr | Limited | — | — | FACT high (R-EU S-41) | — |
| Toshl (SI; IT named) | Medici $4.99 ($3.33 yearly) | ≈ $39.96 | €4.27 / €34.17 | 2 accounts, 2 budgets | 30 days | — | FACT high (R-EU S-81) | Bank sync only on Medici |
| Finanzguru (DE) | Plus €4.29 (monthly, from 1 Sep 2026); ≈ €2.99 annual-equivalent | ≈ €35.88 (ASSUMPTION) | €4.29 / ≈ €35.88 | Generous (multibanking, categorisation, contracts) | 7 days | — | FACT medium (R-EU S-69; trackers disagree) | Price tests €0.99–€4.99 historically |
| Outbank (DE/AT/CH) | €3.99 | €39.99 (Business €9.99/€99.99) | €3.99 / €39.99 | None (14-day trial) | 14 days | — | FACT high (R-EU S-77) | — |
| Bankin' (FR) | Plus €4.99; Pro from €8.33 | €39.99 | €4.99 / €39.99 | Yes (aggregation, categorisation, forecast) | — | — | FACT high (R-EU S-78) | — |
| Linxo (FR) | Premium €4.49 | €29.99 | €4.49 / €29.99 | Yes; Lab Premium since Sep 2026 (price UNKNOWN) | — | — | FACT medium (R-EU S-79) | — |
| Dyme (NL) | Silver €4.99; Gold €9.99 | — | €4.99 / €9.99 | Yes | — | — | FACT medium-high (R-EU S-80) | — |
| Finanzfluss Copilot (DE) | Plus €8.99 | — | €8.99 | Yes | — | — | FACT (R-EU S-51; not re-checked) | Investor-first |
| Buddy | $9.99 | $49.99 | €8.54 / €42.74 | Yes | — | Shared budgets | FACT medium (R-EU S-42) | — |
| Cleo (UK) | Pro £12.99 | — | €15.20 | Yes (chat) | — | — | FACT high (R-EU S-76) | Cash-advance product, not PFM pricing |
| Monefy (manual) | — | $59.99–$69.99 (intro $34.99) | €51.29–€59.84 | Yes | — | — | FACT (R-EU S-43) | — |

### 1.2 Italian consumer anchors (what Italians already pay for a money app)

| Product | Tiers (monthly) | Annual | Status / source | Notes |
|---|---|---|---|---|
| Revolut (IT branch) | Standard €0; Plus €3.99; Premium €9.99; Metal €15.99; Ultra €55 | — | FACT medium (W-3: revolut.com/it-IT/our-pricing-plans via search; 2026 Italian guides) | A Nov-2025 creator quoted Ultra ≈ €45 (R-IT Y-01) — 2026 pages say €55; verify on the official page |
| N26 (IT) | Standard €0; Smart €4.90; You/Go €9.90; Metal €16.90 | — | FACT medium (W-6: n26.com/it-it/conti via search; 2026 guides) | — |
| Hype (Banca Sella) | Hype €0; Next €2.90; Premium €9.90 | — | FACT medium (W-5; R-IT V-05/W-01) | Paid plans advertise cross-bank aggregation |
| Satispay | App free; Plus €3.99 (or €39.99/yr); Metal €9.99; Velvet €39.99 | Plus €39.99/yr | FACT medium (W-2: satispay.com/it-it/privati/satispay-plus; aziendabanca.it; alphabetcity.it 2026-07-08) | Card included in plans; launched Jul 2026 |
| bunq | Free; Core €3.99; Pro €9.99; Elite €18.99 | — | FACT low-medium (R-IT Y-21, V-10) | — |
| Plum (IT) | Basic €0; Pro €3.99; Premium €9.99 | — | FACT high (R-EU S-66) | — |
| Splitwise (IT App Store) | Pro ≈ $4.99/mo; annual $29.99–$59.99 by region/SKU | variable | FACT medium-low (R-IT W-10/W-11) | Free tier capped at ~4 adds/day with ads |

**Pattern (HYPOTHESIS, medium):** Italian consumers see a ladder of **€0 → €2.90–€3.99 → €4.90–€4.99 → €9.90–€9.99 → €15.99–€16.90** for money apps that carry tangible perks (cards, insurance, FX, cashback). A pure software PFM must sit on the lower rungs: **€3.99–€4.99 for Plus**, **≤ €9.99 for the richest individual tier**; above €9.99 only with household value.

---

## 2. Willingness-to-pay evidence

| Signal | Evidence | Status | Implication |
|---|---|---|---|
| Sustained EU Plus prices | Finanzguru €4.29 (monthly) / ≈ €2.99 (annual-equivalent); Outbank €3.99; Bankin' €4.99; Linxo €4.49; Dyme €4.99; Snoop £5.99; Emma £4.99; Spendee $5.99; Wallet IT €5.99 | FACT (R-EU §8; R-PP §F) | Band €3.99–€5.99 monthly, €30–€48 annual |
| Direction of travel | Snoop +20 % (2026), Spendee ×2, Finanzguru monthly €2.99→€4.29, Linxo Lab adds a paid tier, PocketGuard removed its free plan | FACT (R-EU pass 2; R-US W27) | The market is testing the ceiling, not racing to the bottom |
| > €9/month only with perks | Plum Max £14.99 (insurance/VPN), Dyme Gold €9.99, Emma Ultimate £14.99, Cleo Pro £12.99 (cash advance) | FACT (R-EU §8) | Comparator only; a richer household tier needs measured use and delivered sharing |
| US ceiling | $95–$109/yr full PFM; premium tier 2–3× (Monarch Plus $199–$299) | FACT (R-US §4.4) | US comparator; does not establish an Italian premium multiple |
| Effort pricing | Italian creators rank tools by minutes/month (ChatGPT 2 min, sheet 5 min, Wallet 15 min) | FACT low-medium (R-IT Y-02) | WTP is for time saved: "zero-setup" is the paid value |
| Household WTP | Monarch unlimited household is "best-in-class"; Italian couples use free split apps or joint accounts; per-seat pricing does not fit | FACT (R-US S40; R-IT Y-05) | Test one Famiglia price after safe sharing; seat ceiling and WTP UNKNOWN |
| Price-increase backlash | YNAB $99→$109; Simplifi renewal step-up; Monefy/MoneyWiz/Money Pro forced subscriptions | FACT (R-PP §F) | Announce prices/terms clearly; do not commit an uncosted lifetime price |
| Trial auto-conversion anger | Emma £83.99 charge after cancelling trial; Cleo FTC $17 M (Mar 2025) | FACT (R-EU S-20, S-45) | Non-renewing Plus preview proposal; an eventual auto-renewing purchase is a separate explicit flow |
| Italian "free" expectation | 73 % of Italians use at least one app or digital service to manage expenses, 36 % at least two (2025 survey as summarised by search; attribution unclear); bank apps' analytics are free; creators recommend free apps | UNVERIFIED (W-7; attribution UNKNOWN) / carried anecdotal creator evidence | Free tier must be real; price the depth |
| Direct WTP survey for PFM in Italy | None found | UNKNOWN | Run Van Westendorp + Gabor-Granger in the waitlist (§11) |
| Trial length | Cross-category search summaries suggest longer trials may work better; the cohort, eligibility and conversion denominator require primary-source verification | UNKNOWN applicability (W-1) | 30-day preview remains a hypothesis, not an evidence-derived optimum |

---


## 3. Payment/VAT waterfall and uncertainty

Consumer prices include VAT. Italy 22% is the carried law reference; tax adviser must confirm the merchant and geographic route before checkout. Annual cash receipts and recognised monthly revenue differ. For a €4.99 monthly charge, ex-VAT is €4.09. For €39.99/year, recognised gross is €3.33/month and ex-VAT €2.73.

```text
nativeStoreNet = gross/(1+VAT) × (1−verifiedEffectiveStoreFee) − billingServiceFee
webNet        = gross/(1+VAT) − PSPpercentage×gross − fixedPSPfee − billing/taxServiceFees
linkedWebNet  = webNet − applicableExternalOfferCommission
annualNetPerMonth = verifiedNetAnnualCharge / 12
```

**Provisional fee envelope:** effective 8/13/16% take on ex-VAT revenue for model scenarios (ASSUMPTION). A 15% native-store case produces €3.48 monthly / €2.32 annual-equivalent before additional billing services. The carried research claims several 2026 EU programme rates; their dates, conditions, eligibility, fee stacking, thresholds, refunds and taxes require primary-source/contract verification. Do not treat a “10%” rail as automatically cheaper: PSP fixed fees, reporting and external-offer terms can erase the difference.

Launch billing implementation must verify developer programme eligibility, signed terms, server-side receipts, renewal/failure/restore/cancellation states, store review, consumer information and tax remittance. Native IAP is a simplicity hypothesis; web checkout and alternative EU rails remain gated. No developer account, subscription service or tax registration is created by this document.

## 4. Price presentation and choice

| Rule | Decision / test |
|---|---|
| Public names | Gratis / Plus; Famiglia Later; Pro reserved |
| Benefit anchor | Supported additional source and optional delivered planning/reporting; never a more accurate ledger, better security or paid export |
| Annual display | “€39,99 all’anno, addebitati in un’unica soluzione”; €19.89 saving vs 12×€4.99 (~33.2%); also show monthly total/period |
| Default choice | No preselected purchase or trial-to-charge conversion; compare monthly/annual fairly; measure comprehension and refunds |
| Price parity | Proposed equal VAT-inclusive price web/native; revisit only after verified net fees and comprehension tests |
| Price changes | Clear notice and channel-specific consent/rights; no automatic renewal price jump promised, no lifetime protection committed |
| No decoy SKU | One launch paid tier; Famiglia value comes from sharing, not an anchor designed to push people to an unavailable tier |

## 5. Store and checkout release requirements

All-free beta uses test/shadow entitlements and charges nobody. Real billing is P1 before any purchase opens, independent of P0 domain entitlements. Confirm store/PSP fees at implementation, record evidence date and plan IDs, authenticate receipt webhooks and derive access from verified server state. Test duplicate/delayed/out-of-order events, restore across devices, grace periods, expiry, cancellation and refund. Security, privacy, correctness, held-history access and export/deletion stay available when access downgrades. Service/safety support is free for everyone.

## 6. VAT and parity questions

Consumer-location tax, merchant-of-record terms, web registration/OSS requirements, fixed PSP fees by term, subscriptions tax classification and cross-channel store constraints are OPEN. Resolve with tax/counsel/provider terms, not app-store anecdotes. The provisional fee envelope must be replaced by an invoice-level waterfall before launching checkout.

## 7. Proposed price points (HYPOTHESES)

| Public plan | Low monthly/yearly | Base test monthly/yearly | High monthly/yearly | Capability gate |
|---|---|---|---|---|
| Lilleri Gratis | €0 | €0 | €0 | Proposed one supported institution/≤2 accounts plus manual/supported imports; quotes/legal route decide live-sync envelope |
| Lilleri Plus | €3.99 / €29.99 | **€4.99 / €39.99** | €5.99 / €49.99 | Supported breadth and delivered optional planning; no paid correctness/security/export |
| Lilleri Famiglia (Later) | €8.99 / €69.99 | €9.99 / €79.99 | €12.99 / €99.99 | Invite/revoke, per-member consent/isolation, shared permissions, own export; seats not committed |
| Lilleri Pro (reserved) | UNKNOWN | UNKNOWN | UNKNOWN | Professional workflow research; no launch SKU |

Using Base usage/conversion unchanged (an artificial sensitivity), Low/Base/High Plus pairs generate GP approximately **−€156.51 / −€79.49 / −€2.47 per 1k MAU**, without offers/minimums. A higher price may reduce demand/retention; economics must re-estimate those inputs together. Lower prices do not automatically improve acquisition or support cost.

## 8. Preview proposal (HYPOTHESIS / DECISION)

| Element | Scope |
|---|---|
| Closed beta | Free product access; no purchased subscription, trial autocharge or paid conversion metric |
| Length | Proposed 30-day non-renewing Plus preview after implementation; 30 vs 34 days can be tested for end-of-month value |
| Card / stores | No checkout or card required for the preview; no store-native introductory purchase is promised |
| Access | Supported multi-institution capability only; no chat/OCR/household unlocked merely by the preview label |
| Notice | Start/end date and post-preview envelope before connecting; expiry notices at day 23/27, with no charge wording |
| End | User selects Gratis sources; unsupported extra refresh pauses after notice; held records stay accessible/correctable/exportable; explicit new checkout required to buy Plus |
| Extension | Do not require fifty reviews or more accounts to earn time; referral reward later only after clear cost, fraud and consent controls |

## 9. Annual pricing and retention

The €39.99 test point is ~33.2% below twelve monthly charges. Annual share 40/60/80% is an ASSUMPTION, not a target that justifies steering users. Measure annual renewal with an eligible maturity denominator, refunds and collected net revenue; do not infer LTV from cash prepayment. Reminder and easy renewal cancellation requirements depend on the implemented rail; no universal store cancellation/refund control is promised.

## 10. Famiglia pricing, Later

Start research with two adults with private accounts by default. A joint account is not proof that all member data can be shared. Per-member consent, account permissions, revoke/leave, own-member export/deletion and adversarial isolation tests are prerequisites. Average occupancy 2.3 is an ASSUMPTION. At Base hypothetical net revenue €5.70, Plus-core COGS for two/2.3/five active members is €2.13/€2.45/€5.33 before sharing overhead; five seats leave only ~€0.37 contribution. Separate account/fair-usage pricing, willingness to pay and workload must be evaluated before committing seats or adding revenue to launch.

## 11. Price testing plan (RECOMMENDATION)

| Method | Question / evidence | Decision rule |
|---|---|---|
| Waitlist interviews + Van Westendorp/Gabor-Granger | Is supported multi-source correctness/time saved worth a subscription? Separate survey intent from observed purchase | Pre-register sample/segment/bank coverage; report uncertainty and selection bias; no optimum inferred from unsupported “60% band” rule |
| Prototype choice | Gratis vs Plus; Famiglia concept separately with visible Later label | Test understanding of free limits and preview end; no live charge in a mock |
| Eligible purchase experiment, after billing gates | €4.99/€39.99 vs €5.99/€49.99 | Primary: collected net contribution per eligible start, including refunds, preview COGS and support; inspect retention, coverage/trust and intervals before choosing |
| Term choice | Monthly/annual informed choice, not default manipulation | Compare comprehension, annual maturation and refunds; no artificial annual-mix quota |

Sample size is determined by baseline effect/variance and minimum detectable difference; “2,000 per arm” alone is not proof of power. Fee/product capabilities and price assignments must be stable and documented.

## 12. Decisions / Recommendations

| ID | Decision / recommendation |
|---|---|
| D-PR-1 | Gratis / Plus; Plus €4.99/€39.99 hypothesis; Famiglia Later; Pro reserved and unpriced |
| D-PR-2 | Annual saving shown transparently; annual share/retention measured, not steered |
| D-PR-3 | 30-day non-renewing Plus preview proposal; free beta; no charge without explicit separate purchase |
| D-PR-4 | Equal gross web/native test prices; billing choice follows verified terms and implemented consumer safeguards |
| D-PR-5 | No lifetime price/seat commitment; price-change rights/notice follow actual contract/channel |
| D-PR-6 | Famiglia price/occupancy hypothetical until sharing and member controls validated |
| R-PR-1 | Re-check primary competitor/fee evidence, then compare retained contribution with uncertainty before price selection |

## 13. Open questions

Italian actual WTP and purchase retention; primary competitor list prices; RevenueCat benchmark denominators; unverified W-7 attribution (exclude from market proof); store eligibility/fee stacking; PSP/tax fees; preview-end comprehension; household occupancy/privacy; allowed channel parity and renewal/refund rules. Sources below retain original verification limitations.

## Review log

| Reviewer | Finding | Resolution |
|---|---|---|
| Brand/PM (major) | Consumer Pro and launch Famiglia contradicted D7/MVP | Canonical Gratis / Plus; Famiglia Later; Pro professional reserved |
| CFO (major) | Trial described no-card and store-native autocharge at once | Separate free beta and non-renewing preview; explicit checkout gate |
| CFO (major) | Precise rail proceeds/fee thresholds stated without current programme eligibility | Retained source chain, replaced authoritative numbers with provisional waterfall and primary-verification requirements |
| Consumer (major) | Lifetime prices, default annual selection and fifty-review extension conflict with simple informed choice | Removed lifetime commitment/steering/work incentive; neutral term comparison |
| Investor (major) | Survey/snippet trial figures treated as Italian purchase evidence | Denominator and attribution checks; contribution-based experiment with uncertainty |

## 14. Sources

| ID | Source | URL | Date seen | Reliability | Used for |
|---|---|---|---|---|---|
| R-US | `competitors-us.md` (§0, §4.4, W5, W7, W10, W16, W18, W21, W27) | repo | 2026-10-02 | medium–high | US prices and trends |
| R-EU | `competitors-eu-uk.md` (§1, §8, S-63…S-81) | repo | 2026-10-02 | medium–high | EU/UK prices (official pages via search) |
| R-IT | `competitors-italy-and-ai-first.md` (§2.3, §2.4, §3.1–3.3, §4.1, V-05, V-10, V-23, W-01, W-10, W-11) | repo | 2026-10-02 | low–medium | Italian neobank anchors, Splitwise |
| R-PP | `user-pain-points.md` (§F) | repo | 2026-10-02 | medium | WTP signals and backlash |
| R-BC | `business-and-cost-inputs.md` (§1, §2, §8, §12, §14) | repo | 2026-10-02 | medium–high | Store fees, VAT, conversion ranges |
| AP-1 | Apple — Apps in the EU | https://developer.apple.com/support/apps-in-the-eu/ | 2026-10-02 (via R-BC) | high | 26/15 %, 20/10 %, 15/10 % rails, CTC 5 % |
| AP-2 | Apple — App Store Small Business Program | https://developer.apple.com/app-store/small-business-program/ | 2026-10-02 (via R-BC) | high | 15 %, $1 M threshold |
| GP-1 | Android Developers Blog, "Expanded billing choice and lower fees on Google Play" (Jun 2026), via GitHub mirror | https://android-developers.googleblog.com/2026/06/play-expanded-billing.html | 2026-10-02 (via R-BC S43) | medium-high | 10 % + 5 % |
| ST-1 | Stripe EU card-fee transcriptions (Spain/Estonia pages, 2026) | https://stripe.com/it/pricing (blocked; secondary transcriptions in R-BC S49) | 2026-10-02 | medium (standard rate) | 1.5 % + €0.25; Billing +0.7 % |
| RC-1 | RevenueCat docs — billing and account settings | https://www.revenuecat.com/docs/welcome/set-up-revenuecat/account-management | 2026-10-02 (via R-BC) | high | Free < $2.5 k MTR, 1 % |
| VAT-1 | DPR 633/1972 art. 16 (22 %); Council Directive (EU) 2017/2455 (OSS, €10 k threshold) | https://www.agenziaentrate.gov.it ; https://vat-one-stop-shop.ec.europa.eu | not fetched (law in force; R-BC K-1) | medium-high | VAT treatment |
| W-1 | RevenueCat State of Subscription Apps 2026 | https://www.revenuecat.com/state-of-subscription-apps ; https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026 ; https://www.revenuecat.com/blog/growth/free-trial-length | 2026-10-02 | medium (search summary) | Trial length conversion; hard paywall vs freemium |
| W-2 | Satispay Plus (official page), Aziendabanca, alphabetcity (2026-07-08) | https://www.satispay.com/it-it/privati/satispay-plus/ ; https://www.aziendabanca.it/notizie/fintech-insurtech/satispay-plus | 2026-10-02 | medium | €3.99/€39.99; €9.99; €39.99 |
| W-3 | Revolut IT pricing page and 2026 guides | https://www.revolut.com/it-IT/our-pricing-plans/ ; https://www.agendadigitale.eu/cittadinanza-digitale/pagamenti-digitali/carta-revolut/ | 2026-10-02 | medium | €3.99/€9.99/€15.99/€55 |
| W-5 | Hype 2026 reviews | https://www.finanza.com/focus/conti/conto-hype-recensione ; https://selectra.net/conti/guida/confronto/hype-start-plus-premium | 2026-10-02 | medium | €2.90/€9.90 |
| W-6 | N26 IT accounts page and 2026 guides | https://n26.com/it-it/conti ; https://pagamenti.net/n26-italia-come-funziona/ | 2026-10-02 | medium | €4.90/€9.90/€16.90 |
| W-7 | Italian expense-app usage survey (search summary; attribution unclear — candidates: FocusRisparmio/SumUp; ISP–Einaudi Indagine sul Risparmio 2025) | https://www.focusrisparmio.com/news/carovita-italiani-risparmio-sumup ; https://group.intesasanpaolo.com/content/dam/portalgroup/repository-documenti/research/it/indagine-risparmio/2025/ISP_Volume%20EINAUDI%202025.pdf | 2026-10-02 | low (unattributed summary) | "73 % use at least one app" — verify before quoting |
