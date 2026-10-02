# Lilleri pricing analysis — competitor prices, willingness to pay, store economics, proposed price points

**Project:** LILLERI (consumer PFM, Italy-first then Europe)
**Document date / verification date of carried-over claims:** 2026-10-02
**Inputs:** the nine raw research documents listed in `business-model.md` (cited as R-BC, R-OBA, R-OBB, R-US, R-EU, R-IT, R-PP, R-AI, R-BB) plus WebSearch checks run on 2026-10-02 (W-1…W-6, search-engine summaries, medium reliability).
**Currency conventions:** prices are quoted in the vendor's currency and converted to EUR at **1 USD = €0.855 and 1 GBP = €1.17 (ASSUMPTION — use the live rate before any decision)**. Consumer prices are gross (incl. VAT) unless stated. Italian VAT on digital services is 22 % (FACT, law; R-BC §8).
**Label key:** FACT · ASSUMPTION · HYPOTHESIS · DECISION · OPEN QUESTION · UNKNOWN.

---

## 0. Summary

- The European "Plus" band moved up during 2025–26 to **€3.99–€5.99 per month / €30–€48 per year**; Italian neobank and payment-app tiers sit at **€2.90 / €3.99 / €4.90 / €9.90–€9.99 / €15.99–€16.90**; the US full-PFM anchor is **$95–$109 per year** with a premium tier at 2–3× (FACT, §1–§2).
- **DECISION:** Plus €4.99/month or €39.99/year (Low €3.99/€29.99, High €5.99/€49.99); Pro €7.99/€64.99 (Low €6.99/€54.99, High €9.99/€79.99); Family €9.99/€79.99 for up to 5 people (Low €8.99/€69.99, High €12.99/€99.99); Free as defined in `business-model.md`. Annual ≈ 33 % off; 30-day Pro trial, no card on web; price parity between web and in-app; launch prices grandfathered for life (§7–§10).
- Every €4.99 charged nets Lilleri ≈ €3.48 via Apple IAP (Small Business Program 15 %) or Google Play Billing (10 % + 5 %), ≈ €3.37 via the 10 % alternative-payment rails net of PSP fees, ≈ €3.75 via web Stripe; all minus RevenueCat 1 % above $2.5 k MTR (FACT-derived, §5).
- The Plus price is the third-largest lever on gross profit per 1,000 MAU after AIS price and paid share: €3.99 → €5.99 moves Base GP per 1,000 MAU from €42 to €143 (HYPOTHESIS from the model in `unit-economics.md`). The beta must run a Van Westendorp survey and a €4.99 vs €5.99 test before launch (§11).

---

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
| > €9/month only with perks | Plum Max £14.99 (insurance/VPN), Dyme Gold €9.99, Emma Ultimate £14.99, Cleo Pro £12.99 (cash advance) | FACT (R-EU §8) | Pro ≤ €9.99; Family is the only plan allowed above €9.99 (Low/High range) |
| US ceiling | $95–$109/yr full PFM; premium tier 2–3× (Monarch Plus $199–$299) | FACT (R-US §4.4) | Confirms a 2× premium multiple is accepted when it bundles planning/AI |
| Effort pricing | Italian creators rank tools by minutes/month (ChatGPT 2 min, sheet 5 min, Wallet 15 min) | FACT low-medium (R-IT Y-02) | WTP is for time saved: "zero-setup" is the paid value |
| Household WTP | Monarch unlimited household is "best-in-class"; Italian couples use free split apps or joint accounts; per-seat pricing does not fit | FACT (R-US S40; R-IT Y-05) | One Family price, not per-seat |
| Price-increase backlash | YNAB $99→$109; Simplifi renewal step-up; Monefy/MoneyWiz/Money Pro forced subscriptions | FACT (R-PP §F) | Grandfather launch prices; never silent step-ups |
| Trial auto-conversion anger | Emma £83.99 charge after cancelling trial; Cleo FTC $17 M (Mar 2025) | FACT (R-EU S-20, S-45) | Pre-renewal reminders, no-card trial on web |
| Italian "free" expectation | 73 % of Italians use at least one app or digital service to manage expenses, 36 % at least two (2025 survey as summarised by search; attribution unclear); bank apps' analytics are free; creators recommend free apps | FACT low (W-7; attribution UNKNOWN) / FACT low (R-IT Y-33) | Free tier must be real; price the depth |
| Direct WTP survey for PFM in Italy | None found | UNKNOWN | Run Van Westendorp + Gabor-Granger in the waitlist (§11) |
| Trial length | 17–32-day trials convert at a median 42.5 % vs 25.5 % for < 4 days (cross-category, 115 k apps) | FACT medium (W-1) | 30-day trial |

---

## 3. Net-revenue waterfall per price (FACT-derived from R-BC §8; rates as of 2026-10-01)

Gross price → ex-VAT (÷ 1.22) → after rail commission → after RevenueCat 1 % (applies above $2.5 k monthly tracked revenue).

| Rail | Rule (FACT) | €4.99 monthly | €39.99 annual (per month) | €7.99 monthly | €9.99 monthly |
|---|---|---|---|---|---|
| Ex-VAT | ÷ 1.22 | €4.09 | €2.73 | €6.55 | €8.19 |
| Apple IAP, Small Business Program | 15 % of ex-VAT (EU terms 2026-10-01; standard 26 % above $1 M prior-year proceeds) | €3.48 | €2.32 | €5.57 | €6.96 |
| Google Play Billing (EEA from 2026-06-30) | 10 % service fee + 5 % billing fee = 15 % | €3.48 | €2.32 | €5.57 | €6.96 |
| Apple alternative payment in-app / out-of-app link | 10 % to Apple + own PSP (Stripe 1.5 % + €0.25) | ≈ €3.37 | ≈ €2.40 | ≈ €4.69 | ≈ €5.90 |
| Google alternative billing / external link | 10 % to Google + own PSP | ≈ €3.37 | ≈ €2.40 | ≈ €4.69 | ≈ €5.90 |
| Web (Stripe standard EEA card 1.5 % + €0.25; Billing +0.7 %) | Lilleri is merchant of record; VAT via OSS | ≈ €3.75 | ≈ €2.65 | ≈ €6.16 | ≈ €7.76 |
| RevenueCat | −1 % of tracked revenue above $2.5 k MTR | −€0.03 | −€0.02 | −€0.06 | −€0.07 |

Doubts: Stripe premium-EEA and non-EEA card rates conflict across sources (ASSUMPTION, R-BC §8 P2-10); Google programme-specific conditions for EEA link-outs are UNKNOWN (help pages blocked). Apple's standard 26 % applies if prior-year proceeds exceed $1 M (FACT, R-BC §8).

**Blended take rate used in the model:** Low 8 % (50 % web, 50 % store on 10 % rails) / Base 13 % (70 % store at 15 %, 30 % web, + RevenueCat 1 %) / High 16 % (100 % store at 15 % + RevenueCat 1 %) — ASSUMPTION on channel mix (`unit-economics.md` U8).

---

## 4. Price anchoring and plan architecture

| Technique | Application (DECISION unless noted) | Evidence |
|---|---|---|
| Market anchor | Plus at €4.99 sits at the Italian "second rung" (Revolut Plus €3.99, Satispay Plus €3.99, N26 Smart €4.90, Bankin'/Dyme €4.99) and below Wallet IT €5.99 | §1.2 |
| Annual framing | Show monthly and annual side by side with the euro saving ("€39,99 all'anno — risparmi €19,89"); the annual-equivalent €3.33 is the number users will compare with Finanzguru's ≈ €2.99 | R-EU §8 |
| Decoy / good-better-best | Pro €7.99 (single) next to Family €9.99 (up to 5) makes Family the obvious choice for couples and keeps Pro as the anchor for singles | Monarch household inclusion; Italian couples norm (R-IT §4.5) |
| Free as the anchor of value, not of price | Free shows the full promise on one institution; the upgrade prompt names the concrete thing gained ("Aggiungi Fineco e Revolut con Plus") | R-PP §H #6 |
| Charm pricing | .99 endings match every Italian anchor; whole-euro pricing (€5) would read as a rounding up | §1.2 |
| No lifetime deals | PocketGuard's withdrawn-then-returned lifetime plan and Monefy/MoneyWiz migrations show the reputational cost | R-US §6 #4; R-PP §F |
| No "ad-free" tier | Nothing has ads, so ad removal cannot be sold | `business-model.md` D-BM-5 |

---

## 5. App Store / Google Play commission and EU alternative terms — effects

| Effect | Detail | Status | Decision |
|---|---|---|---|
| Base take | 15 % on both stores for a developer under $1 M (Apple SBP; Google 10 % service + 5 % billing) | FACT (R-BC §8) | Model Base 15 % on store sales |
| 10 % rails | Apple: alternative payment in-app or out-of-app link at 10 % (+ own PSP) since 2026-10-01; choice fixed for 12 months; developer collects and remits VAT and reports monthly. Google EEA: alternative billing/external link at 10 % service fee, no billing fee | FACT high (Apple) / medium-high (Google) | Launch with native IAP (simplest, highest trust, refunds handled by store); evaluate the 10 % rails at ≥ 5 k subscriptions when the ≈ €0.11 per €4.99 gain exceeds the VAT/reporting/PSP overhead |
| Apple over $1 M | 26 % standard IAP in the EU | FACT | Not before ≈ 25 k Plus-equivalent subscribers; re-evaluate rails then |
| Subscriptions after year one | 15 % (Apple) irrespective of SBP; Google 10 % on all auto-renewing subscriptions from day one | FACT | Annual plans are favoured by the fee structure as well |
| Store as merchant of record | Apple/Google remit consumer VAT; developer proceeds are net | FACT medium | No OSS registration needed for store sales; needed for web sales above the €10 k EU micro threshold |
| RevenueCat | Free < $2.5 k MTR, then 1 % | FACT high | Keep; replace only above ≈ €250 k MTR if the 1 % matters |

---

## 6. VAT and web vs in-app parity

| Item | Rule | Decision |
|---|---|---|
| VAT | 22 % Italy; B2C digital services taxed in the consumer's member state; EU-wide €10 k micro-business threshold then Union OSS (quarterly return in Italy) | FACT (law, R-BC §8) | Prices displayed gross incl. VAT everywhere; web sales through Stripe Tax + OSS registration before web billing opens |
| Web vs IAP price | Web nets ≈ €3.75 vs ≈ €3.48 in-store per €4.99 | FACT-derived | **DECISION: price parity.** Same gross price on web and in-app; the ≈ €0.27 difference is not worth two price lists, user confusion and the appearance of steering; web checkout is offered on the site and via the permitted out-of-app link (10 % Apple commission on sales within 7 days of the tap) |
| Trial parity | Web: 30 days, no card; stores: 30-day introductory free offer (store-native, requires the store account's payment method) | DECISION | Reminder 3 days before conversion on all channels |
| Price localisation (later markets) | One EUR price list for the euro area; local-currency lists only when a market is opened | DECISION | — |

---

## 7. Proposed price points (DECISION with Low/Base/High)

| Plan | Low | Base (launch) | High | Who / why |
|---|---|---|---|---|
| Free | €0 | €0 | €0 | 1 institution (≤ 2 accounts) synced while active + import + all correctness features (`business-model.md` §4) |
| Plus | €3.99/mo · €29.99/yr | **€4.99/mo · €39.99/yr** | €5.99/mo · €49.99/yr | Multi-institution, background refresh, unlimited history, alerts |
| Pro | €6.99/mo · €54.99/yr | **€7.99/mo · €64.99/yr** | €9.99/mo · €79.99/yr | AI assistant, forecasting, receipts OCR, automation, API |
| Family | €8.99/mo · €69.99/yr | **€9.99/mo · €79.99/yr** | €12.99/mo · €99.99/yr | Pro for up to 5 people + household ledger |
| Business (Later) | €9.99/mo | **€14.99/mo · €119.99/yr** (placeholder) | €19.99/mo | Partita IVA features; not before month 12 — ASSUMPTION |

Net revenue per subscription-month (Base take 13 %, 60 % annual): Plus €2.85, Pro €4.60, Family €5.70; blended across the Base mix (65/15/20) **€3.68** (`unit-economics.md` §4). Gross-profit sensitivity to the Plus price at Base (per 1,000 MAU): €3.99 → €42; €4.49 → €67; €4.99 → €92; €5.49 → €117; €5.99 → €143 (HYPOTHESIS, model output).

Why not €5.99 at launch: it would top the Italian second rung and exceed every Italian neobank "Plus" by €1–2 while Lilleri has no perks and no brand; the beta test decides (§11). Why not €3.99: at Base COGS the free tier is only fundable with Plus contribution ≥ €2.5/month; €3.99 leaves €1.88 (model).

---

## 8. Trial strategy (DECISION)

| Element | Decision | Evidence |
|---|---|---|
| Length | 30 days of Pro | 17–32-day trials convert best (W-1); reconciliation needs weeks of data and at least one monthly cycle to show value (R-US §6 #12) |
| Card | No card on web; store-native introductory offer in-app | YNAB 34 days no card is praised; Monarch 7-day card-required is a recurring complaint (R-US §5 #14) |
| What the trial unlocks | All institutions connected (the full promise), Pro features | The free tier then keeps 1 institution; the user chooses which one |
| Reminders | Day 23 ("una settimana alla fine della prova"), day 27, and on conversion day; cancellation link in every reminder | Emma/Cleo complaints (R-PP §A #7) |
| End of trial | No auto-charge on web; in-app the store rule applies with the reminder above; connections beyond the free envelope pause with a clear message and one-tap upgrade; nothing is deleted | Trust priority; `business-model.md` Q8 |
| Extensions | +15 days for completing onboarding (3 institutions connected, 50 reviews done) and for referrals | Product-led growth |
| Student / young | 50 % off Plus with a .edu/.it university email (Later) | YNAB student year precedent |

---

## 9. Annual discount (DECISION)

| Option | Annual price for Plus | Discount vs 12 × monthly | Observed norm |
|---|---|---|---|
| 16 % (Finanzguru 2025, Outbank, Satispay Plus) | €49.99 | 16 % | DE/IT |
| **33 % (chosen)** | **€39.99** | **33 %** | Snoop 33 %, Bankin' 33 %, Emma ≈ 30 %, Linxo 44 % |
| 40–44 % (US) | €35.99 | 40 % | YNAB 39 %, Monarch 44 % |

Rationale: 33 % puts the annual-equivalent at €3.33, within €0.34 of Finanzguru's annual rate, while keeping the monthly price as the visible anchor. Annual mix target 60 % (Low 40 / High 80, R-BC §12). Annual renewals get a reminder 7 days before and can be switched to monthly in-app.

---

## 10. Family pricing (DECISION)

| Element | Decision | Evidence / doubt |
|---|---|---|
| Model | One household price, up to 5 members, each with own login and private accounts; shared household ledger; member-level privacy controls | Monarch unlimited household on one price; YNAB Together up to 6; Italian norm against per-seat (R-IT Y-05) |
| Price | €9.99/mo · €79.99/yr (Low €8.99/€69.99; High €12.99/€99.99) | 2× Plus; below N26 You/Revolut Premium (€9.90/€9.99) only in the Low case |
| COGS caveat | Members per family 2.0 / 2.3 / 3.0 (ASSUMPTION) × 3 accounts × AIS price; at Base the Family contribution is €3.09/month (54 % margin) vs Plus €1.78 (62 %) — Family is accretive in euros, dilutive in margin | `unit-economics.md` §5 |
| Alternative to test | "Plus includes one partner" (2 people) at €5.99 — may fit Italian couples better and lift Plus ARPPU | OPEN QUESTION Q7 in `business-model.md` |
| Guardrails | Family members must be in the same household (self-declared); max 5; member removal keeps the member's data exportable | Trust |

---

## 11. Price testing plan (Recommendation)

| Step | When | Method | Decision rule |
|---|---|---|---|
| Van Westendorp (4 questions) + Gabor-Granger on Plus | Waitlist (n ≥ 400) | Survey in Italian; test €3.99 / €4.99 / €5.99 monthly and €29.99 / €39.99 / €49.99 annual | Pick the point of marginal expensiveness if ≥ 60 % of the optimal-price band |
| Plan-choice conjoint (Plus vs Pro vs Family) | Closed beta | 3-plan paywall mock with feature bundles | Confirms the Pro/Family gap and whether AI chat belongs in Plus |
| Live A/B of €4.99 vs €5.99 | Open beta, ≥ 2,000 trial starts per arm | RevenueCat Experiments | Keep the higher price if net revenue per trial start is ≥ 95 % of the lower price's |
| Annual share test | Open beta | Default-selected annual vs monthly | Target ≥ 60 % annual |

---

## 12. Decisions / Recommendations

| ID | Decision |
|---|---|
| D-PR-1 | Launch prices (Base): Plus €4.99/€39.99; Pro €7.99/€64.99; Family €9.99/€79.99; Free €0; Business Later |
| D-PR-2 | Annual ≈ 33 % off; annual share target 60 % |
| D-PR-3 | 30-day Pro trial, no card on web, store-native offer in-app, reminders at day 23/27/30, no silent conversion |
| D-PR-4 | Price parity web vs in-app; native IAP at launch; evaluate 10 % rails at ≥ 5 k subscriptions |
| D-PR-5 | Launch prices grandfathered for life; increases apply to new subscribers only, announced 30 days ahead |
| D-PR-6 | One Family price up to 5 members; test "Plus + partner" as an alternative |
| R-PR-1 | Run the §11 tests before fixing Plus; the business case prefers €5.99 but trust and anchors prefer €4.99 |

---

## 13. Open questions

| # | Question | How to verify |
|---|---|---|
| Q1 | Monarch Plus list price ($299 vs $199) — affects the "premium at 2–3×" pattern only | monarch.com/pricing |
| Q2 | Exact EUR App Store prices for Spendee, MoneyWiz, Toshl, Splitwise in Italy; Wallet IAP period mapping | apps.apple.com/it listings, In-App Purchases section |
| Q3 | Revolut Ultra €45 vs €55 and the exact IT list for Revolut/N26 | revolut.com/it-IT/our-pricing-plans; n26.com/it-it/conti |
| Q4 | Stripe Italy premium/international card rates; Stripe Tax rate | stripe.com/it/pricing |
| Q5 | Google Play EEA external-offers programme conditions (non-fee) | support.google.com/googleplay/android-developer/answer/14372887 |
| Q6 | Italian WTP for a PFM (no survey found) | Waitlist survey (§11); Osservatorio Fintech & Insurtech PoliMi "Il consumatore Fintech & Insurtech del futuro" |
| Q7 | Attribution and method of the "73 % of Italians use at least one app to manage expenses" figure | Open focusrisparmio.com / SumUp survey page; ISP–Einaudi "Indagine sul Risparmio 2025" |

---

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
