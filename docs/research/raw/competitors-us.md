# US-centric PFM competitors: deep analysis (YNAB, Monarch, Copilot, Rocket Money, Simplifi, Empower, PocketGuard, Origin, AI-first newcomers, Mint shutdown)

**Project:** LILLERI (greenfield consumer PFM, Italy-first then Europe)
**Research date / verification date:** 2026-10-02
**Author:** research subagent (web search only; WebFetch blocked by egress proxy for all tested domains)
**Adversarial verification passes:** two, both 2026-10-02, see "Verification notes (adversarial pass)" at the end. **Pass 1** ran without web access (WebSearch budget exhausted, vendor/news domains egress-blocked) and relied on API documentation via the Context7 index (V1-V4), internal-consistency checks and the reviewer's prior knowledge (V5). **Pass 2 (this revision)** re-ran the brief with 36 fresh WebSearch refutation queries (WebFetch still blocked; sources W1-W33). Where pass 2 contradicts pass 1, pass 2 wins: in particular pass 1's downgrade of YNAB's European provider to UNKNOWN was wrong (it is Plaid, officially, since 2025-02-05), the Monarch Plus price in the original draft ($199/yr) does not match the launch press release ($299/yr for new members), the "Origin raised $30M in Mar 2026" item referred to a different company, PocketGuard's free plan is confirmed gone, and Quicken Assist dates from February 2026, not August. Items that could not be re-verified in either pass are listed in §7.

## Scope note

This document analyses the US-centric personal-finance-management (PFM) apps that define the category's expectations: YNAB, Monarch Money, Copilot Money, Rocket Money, Quicken Simplifi, Empower Personal Dashboard (ex Personal Capital), PocketGuard and Origin, plus AI-first entrants launched 2024-2026 (ChatGPT personal finance, Rocket Money "Rowan", Cleo "Autopilot", Piere, SuperMoney, Quicken Assist, Monarch's 2025 AI assistant relaunch) and the Mint shutdown of March 2024 as the trigger event for the current market structure. For each product it covers target users, markets, onboarding, bank connectivity and aggregators, sync, categorisation and learning, rules, transfers/duplicates/pending handling, review flows, budgeting/forecasting/net worth, sharing, imports/exports, platforms, pricing and paywall, revenue model, retention, review themes and 2024-2026 news. Evidence comes from 57 web searches (English and Italian) run on 2026-10-02, plus 36 refutation searches run in the second adversarial pass the same day (sources W1-W33); every variable claim is labelled **FACT / ASSUMPTION / HYPOTHESIS / UNKNOWN** with a source ID (see the Sources table at the end), a reliability grade (high = official/primary; medium = reputable secondary; low = blog/forum/SEO site/unclear) and doubts. Search-engine snippets were AI-summarised and may be stale; where sources conflict both versions are reported. Marketing text is paraphrased, not copied. Nothing in this document is legal, financial or pricing advice; prices are USD unless stated and must be re-verified on the vendor's pricing page before being used in any decision.

**Important caveat on reliability:** a large share of 2026 "review" pages found by search are SEO content-farm sites run by competing apps (getfinny, walletgrower, fincomparelab, checkthat.ai, sheetlink, budgetsmart, spendalyst, monavio, borderlessbudget, senticmoney, etc.). They are graded **low** and used only for triangulation or when nothing better was found. Official help centres, press releases, TechCrunch/CNBC/Forbes/NerdWallet and Trustpilot/App Store pages are preferred.

---

## 0. One-page comparison (state as of 2026-10-02)

| Product | Owner / status | Core price (USD) | Free tier | Aggregator(s) | Markets | Platforms | AI categorisation learns per user? | Review inbox | Household sharing |
|---|---|---|---|---|---|---|---|---|---|
| YNAB | Independent (private) | $14.99/mo or $109/yr [FACT, medium, S13/S191; re-confirmed pass 2 W5] | No (34-day trial; free year for students) | MX + Plaid for US/CA [FACT high S1]; **Europe/UK: Plaid since 2025-02-05**, replacing TrueLayer (YNAB's UK/EU partner 2020-2025) [FACT high W1/W2/W3, corrected in pass 2: pass 1 had downgraded this to UNKNOWN]; TrueLayer still visible on the status page, presumably legacy [FACT medium S9] | US, CA, UK, 18 European countries incl. Italy [FACT high S8/W3]; Italian bank depth UNKNOWN | Web, iOS, Android, (Apple Watch) | Payee memory: last-used category per payee, monitors changes [FACT high S5]; no ML/LLM product feature found [UNKNOWN] | "Approve" new imports; match manual vs import [FACT high S2] | YNAB Together: up to 6 people on one subscription [FACT high S6] |
| Monarch Money | Independent; $75M Series B May 2025 at $850M [FACT high S34/W13]; $100M ARR and first acquisition (MBI, ex-HMBradley) announced 2026-10-01 [FACT high W12] | Core $14.99/mo or $99.99/yr [FACT high S20]; Plus annual-only, launched 2026-04-21: **$299/yr for new members per the launch press release, $100 off the first year for existing members** [FACT high S20/W7/W8]; several 2026 review sites quote $199/yr instead [CONFLICT, W10]; verify on monarch.com/pricing | No (7-day trial) | Plaid, Mastercard Data Connect (Finicity), MX; default + user override [FACT high S21/S22] | US + Canada only, USD/CAD [FACT high S33] | Web, iOS, Android | ML suggestion + rules; "learns from corrections" claimed by third parties [ASSUMPTION low S39/S42]; official statement UNKNOWN | "Needs review" status, rule-driven, assignable to household member [FACT high S28] | Unlimited household members on one subscription [FACT medium S40/S42] |
| Copilot Money | Independent; $6M Series A Mar 2024 [FACT high S50] | $13/mo or $95/yr [FACT medium S63] | No (1-month trial) | Plaid primary; Mastercard, MX, Akoya for others; direct Apple/Capital One/Public/Coinbase [FACT high S57/S58] | US only per help centre (S59); Canada contested [see 2.3, W17] | iPhone, iPad, Mac, Apple Watch; web since Dec 2025 [FACT high S56]; no Android as of 2026 [FACT medium, re-verified pass 2 W15; see 2.3] | Yes: one ML model per user, active after ~30 reviewed transactions, top-2 guesses surfaced [FACT high S51] | "To Review" section on Dashboard [FACT high S54/S67] | Single-user only [ASSUMPTION low S65] |
| Rocket Money | Rocket Companies (NYSE: RKT); ex-Truebill (acq. 2021, renamed 2022) [FACT medium S78] | Free; Premium "pay what you want" $7-$14/mo; Premium+ $15/mo with Rowan [FACT high S71] | Yes (limited: 2 custom category budgets) [FACT high S72] | Plaid [FACT medium S78/S79] | US | iOS, Android, web (web for Premium) | Rules (Premium only) [FACT high S75]; ML learning UNKNOWN | None found; "ignore" transaction action [FACT high S74] | UNKNOWN |
| Quicken Simplifi | Quicken Inc. | Promo $3.99/mo billed $47.88/yr (a $3.49 promo seen Sep 2026); renewal $6.99/mo ($83.88/yr) [FACT medium W21; conflict resolved in pass 2, see 2.5] | No (30-day money-back) | Quicken's own OAuth/API connections + some Plaid [FACT high S93/S99] | US and Canada, USD and CAD only [FACT high W22; upgraded from ASSUMPTION in pass 2] | Web, iOS, Android | Rules: one category rule per payee; "apply to similar" memory [FACT high S94/S95]; Quicken Assist AI chat in beta since 2026-02-12 (Early Access), publicised Aug 2026, can batch-categorise [FACT high S90/S91/W23] | None found | "Spaces": one shareable space [FACT high S96] |
| Empower Personal Dashboard | Empower (ex Personal Capital) | Free; monetised via wealth-management upsell (AUM fee from 0.89%) [FACT medium S117] | Entire product free | Yodlee FastLink [FACT medium S114] | US | Web, iOS, Android | Rule prompt on edit (apply to future/past) [FACT high S111]; max 30 custom categories [FACT high S110] | None | UNKNOWN |
| PocketGuard | PocketGuard Inc. | Plus $12.99/mo or $74.99/yr; lifetime $149.99 one-time currently sold [FACT medium W27] | **No longer**: the free tier (2 accounts/2 categories) was removed in 2026; new users get a 7-day trial then must pay [FACT medium W27; conflict resolved in pass 2] | Plaid + Finicity [FACT high S125] | US (Canada UNKNOWN) | iOS, Android, web | Rules (Plus) [FACT medium S127]; ML UNKNOWN | None | UNKNOWN |
| Origin | Origin Financial (B2B2C + consumer) | $12.99/mo or $99/yr; $1 first-year promo seen [FACT medium S140/S148] | No (7-day trial) | Plaid, Finicity (Mastercard), MX [FACT medium S140] | US consumer bank sync; employer product in 70+ countries [FACT high S144] | iOS, Android, web | Auto-categorisation + custom rules [FACT high S141/S142]; learning UNKNOWN | Swipe-to-review transactions [FACT high S143] | Partner sharing without extra fee [ASSUMPTION medium S140] |

---

## 1. The Mint shutdown (2023-2024) and where users went

| Item | Finding | Status / source |
|---|---|---|
| Announcement | Intuit announced on 2023-11-01 that Mint would be sunset and users migrated to Credit Karma | FACT (medium) S157, S155 |
| Shutdown date | Mint closed on 2024-03-23 | FACT (medium) S155, S156, S161 |
| Scale | Mint had ~20-25 million registered users at the end (sources say "over 20 million" and "roughly 25 million"; active users were far fewer). Adversarial passes: the "25 million" figure is a cumulative registered-user number Intuit has quoted since the mid-2010s; Bloomberg reported in 2021 that Mint had about 3.6 million active users, a figure repeated by Engadget and Wikipedia at shutdown (pass 2, W28). Use the MAU order of magnitude (single-digit millions), not 20-25M, when sizing the "Mint refugee" pool | FACT for the registered range (medium) S155, S158; ~3.6M active users (2021, Bloomberg via Engadget/Wikipedia) FACT (medium) W28; end-2023 active-user count UNKNOWN |
| Credit Karma as destination | CK received linked accounts, transactions and full net-worth history; it did **not** receive category budgets, spending targets, goals or budget-vs-actual | FACT (medium) S159, S160, S156 |
| Why Mint died (strategic read) | Free, ad/affiliate-funded model with high aggregation costs; Intuit preferred to funnel users to Credit Karma's lead-gen business | ASSUMPTION (medium) S158 |
| Winners | Monarch Money: "20x paid subscriber surge in the year after the shutdown" (CNBC, May 2025) and "6x growth in 2024"; by May 2025 >500k paying subscribers and ~1M total users; surpassed 1M "active members" on 2026-03-24 (">100% increase year-over-year"); announced $100M ARR and its first acquisition (MBI, the ex-HMBradley team, forming "Monarch Labs") on 2026-10-01 | FACT (high) W13, W11, W12; S34, S35, S162, S36 |
| Other beneficiaries | Copilot ("booming now that Mint is dead", TechCrunch Mar 2024); Simplifi ran a "1 year free for Mint users" promo; Rocket Money positioned a Mint-comparison landing page; YNAB benefited | FACT (high for Copilot S50; low for Simplifi promo S104; medium for Rocket S71) |
| Distribution of refugees | Reddit polls (anecdotal): ~30-40% Monarch/Simplifi, ~20% YNAB, <10% Credit Karma. One blog claims "most Mint users land on Rocket Money because the free tier is closest to Mint" | CONFLICTING, both LOW (S196, S197). No primary survey found: UNKNOWN. To verify: app-store download estimates (Sensor Tower/Appfigures) for Jan-Apr 2024 |
| Migration mechanics | Monarch, Simplifi, YNAB and Copilot all shipped Mint CSV importers and trial extensions; Monarch's CEO is Mint's former first product manager, which was used heavily in marketing | FACT (medium) S40, S190; CSV import details per app in section 2 |
| Lesson | A free PFM funded by lead-gen could not sustain aggregation costs; the market re-formed around paid subscriptions ($95-$109/yr) plus a few free/freemium players (Empower, Rocket Money, Credit Karma) with other monetisation | ASSUMPTION (medium) S158, S44 |

---

## 2. Per-product deep dives

Legend for each table: **F** = FACT, **A** = ASSUMPTION, **H** = HYPOTHESIS, **U** = UNKNOWN. Reliability in parentheses.

### 2.1 YNAB (You Need A Budget)

| Attribute | Finding |
|---|---|
| Target users | Hands-on budgeters who accept a method (zero-based "give every dollar a job", four rules); couples/families via YNAB Together; strong community/education bent. F (medium) S13, S12 |
| Markets | US core; Direct Import in US, Canada, UK and 18 European countries (Austria, Belgium, Denmark, Estonia, Finland, France, Germany, Ireland, **Italy**, Latvia, Lithuania, Netherlands, Norway, Poland, Portugal, Spain, Sweden, UK) via Plaid; coverage in Italy limited ("only some banks", no Intesa Sanpaolo / UniCredit per one review). F (high) S8, W3 for availability and the country list; A (low) S14, S16 for Italian gaps (a pass-2 Italian-language search found no independent evidence either way). Italian App Store reviews complain it does not connect to Italian banks. F (medium) S16 |
| Onboarding / steps to first value | Create account (no card for 34-day trial) → create plan → add accounts (linked or unlinked) → categorise/"assign" money. First value (a funded category plan) needs the user to assign money manually: typically 4-6 steps and a mindset shift; reviewers say 2-4 weeks to be comfortable. A (medium) S13, S17 |
| UX highlights | Category-first ledger, "Ready to Assign" number, targets, age of money, reports; Android new-transaction screen redesigned Jul 2026; "Hide Amounts" on web Jun 2026. F (high) S7 |
| Bank connection / aggregator | Direct Import via MX and Plaid (credentials never touch YNAB). F (high) S1. **Europe/UK: Plaid, since 2025-02-05.** YNAB's own "More Banks: Europe Edition" post (W2) announces Plaid as a new Direct Import provider "for more banks in more countries across Europe", with YNAB acting as an agent of Plaid Financial Ltd (FCA-authorised); Plaid's customer story (W3) says YNAB *switched* from its previous European provider and reports +21% UK conversion, +12% EU conversion and -62% daily error rate after the move, with coverage in 18 European countries incl. Italy. F (high) W2, W3. History: TrueLayer was the original UK/EU Direct Import partner (YNAB "Direct Import in the UK and EU", W1) and is still listed on ynabstatus.com (S9), presumably for legacy connections; in March 2024 YNAB removed Direct Import for EU banks that TrueLayer had moved to "private beta", without discounts for affected users (HN thread, W4, low-medium), a plausible trigger for the 2025 switch. **Pass-1 note superseded:** pass 1 had downgraded the Plaid claim to UNKNOWN because its only source was a low-reliability blog (S14); that blog was right. Plaid production access outside US/CA requires a Plaid access ticket (V2), which YNAB evidently holds. GoCardless is used only by third-party bridges (BudgetSyncer, Sync for YNAB), not by YNAB itself. F (low) S15 |
| Sync frequency | UNKNOWN exact cadence; Direct Import pulls "recent transactions and current balances"; third parties say several times per day. U. Verify: support.ynab.com "How Direct Import Works" |
| Categorisation approach | Deterministic payee memory: first time a payee appears you are prompted; afterwards YNAB applies the most recently used category for that payee and watches whether you change it. F (high) S5. No ML/LLM categoriser announced 2024-2026. U (no evidence) |
| Learns from corrections | Yes, at payee level (last-used category). F (high) S5 |
| Custom categories | Unlimited categories and groups. F (medium) S13 |
| Rules engine | No general if/then rules engine; payee renaming rules exist ("payee settings"). A (medium) |
| Automation level | Low by design: approval of imports, manual assignment of money. F (high) S2 |
| Recurring/subscription detection | Scheduled transactions are user-defined; no automatic subscription detection found. U |
| Merchant normalisation / logos | Payee cleanup on import; no logos. A (medium) |
| Search | Transaction search/filter by account, payee, category, date. A (medium) |
| Transaction review flow | Imported transactions arrive as "to approve"; manually entered ones auto-match to imports with identical amount within 10 days and are then auto-approved. F (high) S2 |
| Split transactions | Supported (multi-category splits). F (medium) S5 |
| Internal transfer detection | Transfers are explicit transfer transactions between budget accounts; imported pairs must be matched/approved; file imports use an import ID (milliunits+ISO date+occurrence index) to avoid duplicates against Direct Import. F (high) S2, S3 |
| Credit-card payments | Modelled as transfers to the card account; the "Credit Card Payment" category is funded automatically as you spend on the card; uncategorised card transactions distort that category and trigger alerts. F (high) S5. Reviewers list credit-card reconciliation as a recurring pain. F (medium) S12/S13 |
| Pending → posted | Pending transactions are shown (feature launched via blog) but are **not reflected in the plan until they clear**. F (high) S4 |
| Duplicates | File import skips transactions with identical date+amount; manual-vs-import matching window 10 days; advice for residual duplicates is delete + reconcile. F (high) S2, S3 |
| Refund handling | Refund entered as inflow to the same category (method guidance); no automatic refund matching. A (medium) |
| Cash handling | Cash tracking accounts, manual entry. F (medium) |
| Budgets | Zero-based envelope budgeting with targets, rollover of overspending rules. F (high) |
| Forecasting / cash flow | Scheduled transactions and "age of money"; no projection curve like Simplifi/Monarch. A (medium) |
| Net worth | Net-worth report. F (medium) |
| Goals | Category "targets" (by date, monthly, weekly). F (medium) |
| Notifications | Transaction approval and scheduled-transaction reminders; UNKNOWN detail. U |
| Anomaly alerts | None found. U |
| Shared finances | YNAB Together: group manager plus up to 5 members (6 total) share one subscription, each with own login; selective plan sharing (e.g., parents/teens, coaches). F (high) S6 |
| Receipt scanning | None native; a third-party "Receipts for YNAB" iOS app exists. F (medium) S194/S195 |
| Import / export | File import: CSV preferred as of Aug 2026 (also OFX/QFX/QIF historically); CSV export; public API. F (high) S7, S3. Adversarial pass: the public API is confirmed from the API reference (V1): transactions carry an optional `import_id` used for import matching, create/update responses return `duplicate_import_ids`, amounts are milliunits with ISO-8601 dates, and the API now addresses "plans" (`/plans/{plan_id}/...`) rather than "budgets". F (high) V1 |
| Web app | Yes (primary). F |
| Mobile | iOS, Android, Apple Watch. F |
| Pricing | $14.99/mo or $109/yr; 34-day trial without card; students free for 12 months. F (medium) S13, S191, S192. History (annual) $50 (2016) → $84 (Dec 2017) → $98.99 (Nov 2021, commonly quoted as $99) → $109 (2024). The $14.99 monthly price dates from the Nov 2021 increase, not from 2024 (reviewer prior knowledge, medium; corrected in the adversarial pass because S11/S191 read as if the monthly price also rose in 2024). The effective dates of the $109 step (2024-08-01 new sign-ups, 2024-09-01 renewals) were repeated by several independent 2026 pricing pages in pass 2 and are consistent with the forum thread: F (medium) S11, S191, W5. Monthly billing therefore totals $179.88/yr, 65% more than annual |
| Paywall | Single all-inclusive plan; no tiers. F (medium) S13 |
| Free tier | None. F |
| Advertising / affiliate | None in product; referral programme ("Share & Earn", QR referral on Android Jul 2026); gift subscriptions Aug 2026. F (high) S7 |
| Retention mechanisms | Method/education (workshops, videos), community, YNAB Together, referral, annual billing discount. A (medium) |
| Strengths | Behaviour change, clear method, strong support (AI support bot since Oct 2024 deflects ~70% of tickets), API ecosystem. F (medium) S10 |
| Weaknesses | Price, learning curve, manual effort, weak European bank coverage, no AI assistance in product. F (medium) S12, S13, S16 |
| Recurring negative themes | Price increases; steep learning curve; bank-sync breakages; credit-card payment reconciliation chores. F (medium) S12, S13 |
| Most loved | Control and flexibility, educational resources, feeling of "knowing where money goes". F (medium) S12 |
| Most frequent problems | Direct Import disconnects; duplicates after re-linking; confusion about credit-card categories. F (medium) S12, S2 |
| Ratings | Trustpilot: 3,103 reviews, 4.6 stars (TrustScore 4.5; 77% five-star, 4% one- or two-star) as of 2026-10-02. F (medium) W6; the earlier "431 reviews" snippet was stale (conflict resolved in pass 2). YNAB is the only app in this set whose Trustpilot score is in line with its app-store ratings. App Store 4.8 / Google Play 4.7 per an Italian review site. A (low) S17 |
| 2024-2026 news | March 2024: Direct Import withdrawn for EU banks TrueLayer moved to private beta (W4); price to $109 (Aug 2024); Forethought AI support (Oct 2024); **2025-02-05: Plaid becomes the European/UK Direct Import provider, replacing TrueLayer** (W2, W3); CSV-preferred import, gifts, Hide Amounts (2026). No funding/acquisition news; independent and profitable-by-reputation (A). F (high) S7, S10, W2 |

### 2.2 Monarch Money

| Attribute | Finding |
|---|---|
| Target users | Ex-Mint "see everything in one place" users, couples/households, investors who want net worth + budgeting; "optimisers" for Plus. F (medium) S40, S20 |
| Markets | US and Canada only; accounts recommended in USD or CAD; no UK/EU. F (high) S33 |
| Onboarding | 1) sign up with email/password (12-char) + 7-day trial (card required per reviewers); 2) connect accounts via Plaid/Finicity/MX; 3) customise categories (disable unused groups, rename); 4) set budget. First value (transactions + net worth) after step 2; a usable budget after step 4. Reviewers say the 7-day trial is too short to finish setup. F (high) S41, S22; A (low) S39 |
| UX highlights | Customisable dashboard, Reports, Cash Flow (Sankey), Recurring, Goals, Investments with Morningstar data (Plus), receipt scanning, bill sync, AI assistant. F (high) S32, S20 |
| Bank connection / aggregator | Plaid, Mastercard Data Connect (Finicity) and MX; Monarch picks the provider it expects to work best for each institution and the user can switch provider; 13,000+ institutions; manual accounts fallback. F (high) S21, S22 |
| Sync frequency | No fixed schedule; refresh cadence set by institution + provider; manual refresh available; "allow at least 24 hours" for new transactions. F (high) S24, S25 |
| Categorisation | Automatic categorisation from provider data + Monarch logic; user rules; third parties claim an ML model that learns from corrections ("hybrid model", reinforces payee→category associations). A (low) S39, S42. No official description of the model found. U. Verify: help.monarch.com "Categories" and "Transaction Rules" articles (blocked) |
| Learns from corrections | Claimed yes (low). When you change a category Monarch offers to create a rule for that merchant (apply to past/future). A (medium) S27 |
| Custom categories | Unlimited custom categories and groups; disable defaults. F (high) S41 |
| Rules engine | If-then rules on merchant, amount, account, category; actions: rename merchant, set category, add tags, mark review status, assign reviewer, split by % or $, hide, apply retroactively. F (high) S27, S26, S28 |
| Automation level | High: rules + review status + bill sync; AI assistant can answer questions. F (high) |
| Recurring / subscription detection | "Recurring" tab auto-detects recurring merchants and amounts, feeds cash-flow forecast. F (medium) S32, S40 |
| Merchant normalisation / logos | Merchant names cleaned with logos; rename via rules. A (medium) |
| Search | Transaction search with filters (account, category, tag, amount, date, review status, pending/split). F (high) S29 |
| Transaction review flow | Transaction review system (launched Apr 2022): each transaction is "Needs review" or "Reviewed"; rules set the status automatically (e.g., by amount, merchant, category, account) and can assign a specific household member to review; splitting counts as review. F (high) S28, S26 |
| Split transactions | Manual and rule-based splits (percentage or fixed amounts, unlimited parts). F (high) S26 |
| Internal transfer detection | Transfers are a category group; payments via Zelle/Venmo/checks are often auto-categorised as "Transfers"; credit-card payoffs appear as transfers to the card account and are excluded from spend. A (low) S43. Pair-matching algorithm details UNKNOWN (official article S30 exists but was egress-blocked). U |
| Credit-card payments | Treated as transfer (card account ↔ checking) so spend is counted once at purchase time. A (low-medium) S43, S30 |
| Pending → posted | Pending transactions are imported and shown; hiding a pending transaction may not stick because the posted version "sometimes comes through as a new entry" (i.e., pending→posted is not always matched to the same record). F (high) S29. Reports/budget can filter pending. F (high) S29 |
| Duplicates | Official troubleshooting: check the bank first, check for double-linked accounts; otherwise delete. No automatic de-dup across providers found. F (high) S23 |
| Refund handling | Manual: categorise refund to original category (reviewers). A (medium) |
| Cash handling | Manual cash account. A (medium) |
| Budgets | Flexible: category budgets, rollover, "Flex" budgeting (fixed/flexible/non-monthly buckets), or no budget at all. F (medium) S40, S42 |
| Forecasting / cash flow | Forward-looking cash-flow projections based on recurring items; Plus adds long-range forecasting and scenario modelling. F (high) S20 |
| Net worth | Core feature; equity tracking added Oct 2025. F (high) S32 |
| Goals | Reimagined goals in Oct 2025 Winter Release. F (high) S32 |
| Notifications | Review notifications configurable via rules; budget/bill reminders. F (high) S28 |
| Anomaly alerts | Rules on amount thresholds act as alerting; no ML anomaly detection found. U |
| Shared finances | Household with unlimited members, separate logins, shared or individual goals; widely cited as best-in-class. F (medium) S40, S42 |
| Receipt scanning | Native (Winter Release Oct 2025): photo or email-forward; AI extracts merchant, amount, date and line items and matches/splits against transactions. F (high) S31, S32. One blog says line-item/business features sit behind Plus. A (low) S194 |
| Import / export | CSV import (incl. Mint export format), CSV export, unofficial GraphQL API used by community libraries. F (medium) S41 |
| Web app | Yes. F |
| Mobile | iOS (App Store 4.9) and Android (4.7). F (medium) S37 snippet |
| Pricing | Core $14.99/mo or $99.99/yr. F (high) S20, W10. Plus: annual-only, launched 2026-04-21, includes forecasting/scenario modelling, business/rental tracking, Morningstar investment analysis, estate planning (one free will via Trust & Will for early subscribers, "a $299 value"), coaching access. **Price conflict (pass 2):** the launch press release (S20 as carried by Morningstar, TipRanks and Fioney, W7) states "$299 per year for new members" with "$100 off their first year" for existing members (discount only for members billed directly by Monarch, not via App Store/Google Play, W9); the Monarch help article "Monarch Plus Tier" (W8) confirms annual billing and the $100 existing-member discount but defers the price to the pricing page; most 2026 review/SEO pages (getfinny, envelopebudgeting, fincomparelab, W10) quote $199/yr. The original draft's "$199/yr" therefore did **not** come from S20. Treat list price as $299/yr (high, primary) with $199/yr as a possible later reduction or a misreading of the $100-off price (CONFLICT); verify on monarch.com/pricing before use. Frequent 50%-off first-year Core promos ($49.99) seen on deal sites. F (low) |
| Paywall | All features paid after trial; two tiers since Apr 2026. F (high) S20 |
| Free tier | None. F |
| Advertising / affiliate | No ads; partner offers (Trust & Will) bundled in Plus. F (high) S20. Any card/loan marketplace UNKNOWN |
| Retention | Household lock-in, net-worth history, rules investment, annual billing. A (medium) |
| Strengths | Breadth, household collaboration, provider choice, review system, receipt scanning, AI assistant, investment depth. F (medium) S40, S42 |
| Weaknesses | Connection reliability for small banks/credit unions; 7-day trial; US/CA only; cost; set-up effort for rules. F (medium) S39, S37 |
| Recurring negative themes | Plaid/credit-union disconnects and re-auth loops; sync delays; duplicate transactions; price complaints; Trustpilot 2.0/5 (33 reviews on the trustpilot.com/review/www.monarchmoney.com page) vs App Store 4.9. F (medium) S37, S39 for the themes; the review count is A (low): Monarch moved from monarchmoney.com to monarch.com in 2025, and pass 2 confirmed that a second Trustpilot page exists at trustpilot.com/review/monarch.com (W14; its count and score were not retrievable), so the 33-review figure must not be quoted as Monarch's total |
| Most loved | Household sharing; one dashboard; investment and net-worth tracking; flexible budgeting. F (medium) S42, S40 |
| Most frequent problems | Connection breaks; delayed transactions (24h+); duplicates after re-linking. F (high) S23, S25 |
| 2024-2026 news | 20x paid-subscriber growth post-Mint; $75M Series B (2025-05-23, co-led by FPV + Forerunner; Accel, SignalFire, Menlo, Clocktower participated; $850M post-money, CNBC W13); Winter Release Oct 2025 (new AI assistant, goals, equity tracking, receipts); 2026-03-24: surpassed 1M active members (">100% YoY"), named to Fast Company Most Innovative 2026 and Forbes Fintech 50 2026 (W11); Monarch Plus 2026-04-21 (W7); **2026-10-01: $100M ARR announced together with Monarch's first acquisition, MBI (formerly HMBradley, builder of "Routines" money-movement automations), whose team forms "Monarch Labs" under Zach Bruhnke to move Monarch "beyond insight into action"** (W12). F (high) S34, S32, S36, S20, W11-W13 |

### 2.3 Copilot Money

| Attribute | Finding |
|---|---|
| Target users | Design-conscious Apple users who want automatic tracking with light-touch review; investors (crypto, stocks). F (medium) S63, S50 |
| Markets | Help centre: only US financial institutions, with a "country leaderboard" where users vote for the next country; USD only, no currency conversion. F (high) S59. Canadian competitor sites (finnomia.ca, modufi.ca, W17) and one low-reliability blog (S66) say some Canadian banks connect via Plaid but coverage is "limited" and billing is USD. CONFLICT → treat Canada as UNKNOWN/partial (A, low); unchanged after pass 2 |
| Onboarding | Download → sign in (Apple ID) → connect accounts (Plaid etc.) → Copilot detects likely recurring transactions for you to confirm → review transactions on Dashboard. First value (categorised spend, recurring list) within one session; ML suggestions start after ~30 reviewed transactions. F (high) S61, S54 |
| UX highlights | Dashboard with "To Review", monthly category budgets with "amount left", Recurring, Investments, Net Worth, widgets, Apple Watch, Mac app; web app since Dec 2025 (feature parity still catching up). F (high) S56, S67 |
| Bank connection / aggregator | Plaid for most; Mastercard Data Connect, MX and Akoya for institutions not on Plaid; direct integrations with Apple (Apple Card/Cash), Capital One, Public, Coinbase. F (high) S57, S58 |
| Sync frequency | UNKNOWN; depends on Plaid; manual refresh available. U |
| Categorisation | "Copilot Intelligence for Spending" (launched 2023-09-05): a separate ML model per user trained on that user's reviewed transactions; predicts transaction type and category; surfaces the top two guesses to make corrections one tap. F (high) S51. Third-party claim: 95%+ first-pass accuracy after 2-3 months. A (low) S65 |
| Learns from corrections | Yes, explicitly per user. F (high) S51 |
| Custom categories | Custom categories with emoji/icons; only "Regular" transactions can be categorised (Income and Internal Transfer cannot). F (high) S52 |
| Rules engine | Merchant-level rules (rename, category, exclude) and recurring assignment; no complex multi-condition engine found. A (medium) S54 |
| Automation level | High for categorisation; low for budgets (monthly caps). F |
| Recurring / subscription detection | Automatic at onboarding and ongoing; recurring bills are treated as already spent at the start of the month so "left to spend" is conservative. F (high) S61; A (medium) S64 |
| Merchant normalisation / logos | Yes, logos and cleaned merchant names; renaming supported. F (medium) S63 |
| Search | Transactions tab with filters and search. F (high) S54 |
| Transaction review flow | New transactions land in "To Review" on the Dashboard; user confirms suggested type + category; reviewing trains the model. F (high) S54, S67 |
| Split transactions | Supported. A (medium) |
| Internal transfer detection | Three transaction types: Regular, Income, Internal Transfer. Internal Transfers (incl. credit-card payments) are excluded from spending budgets; marked with a "T" badge; manual internal transfers can be created. F (high) S52, S53 |
| Credit-card payments | Both legs (checking debit and card credit) kept as Internal Transfer so spend counts once at purchase. F (high) S53 |
| Pending → posted | When the posted copy arrives, the aggregator "should recall" the pending copy; if both remain, the official fix is force-close/re-open and then "Clear local cache". F (high) S54. App Store review (Nov 2025): Amex transactions sometimes post on the wrong date and carry notes from unrelated transactions, attributed to the pending→posted linkage. F (medium) S62 |
| Duplicates | Account-level duplicates come from delete-and-reconnect caching issues; fix is clearing local cache. F (high) S55 |
| Refund handling | Refunds appear as positive Regular transactions in the category (reduce spend). A (medium) |
| Cash handling | Manual cash account. A (medium) |
| Budgets | Monthly category budgets with rollover option. F (medium) S63 |
| Forecasting / cash flow | Light (recurring-based "left to spend"); no long-range forecast. A (medium) |
| Net worth | Yes, incl. investments and crypto. F (medium) S63 |
| Goals | Limited/absent (reviewers). A (medium) S63 |
| Notifications | Bank-fee alerts, big-expense alerts, budget updates, credit-utilisation alerts, paydays. F (high) S60 |
| Anomaly alerts | Marketing mentions unusual charges/subscription price increases surfaced by the assistant; concrete implementation UNKNOWN. A (low) |
| Shared finances | No multi-user/household; couples need two subscriptions ("$190 couples trap" per a low-reliability review). A (low) S65 |
| Receipt scanning | None (no extraction). A (low) S194 |
| Import / export | CSV import (incl. Mint), CSV export. A (medium) |
| Web app | Yes since Dec 2025, missing some features. F (high) S56 |
| Mobile | iPhone, iPad, Mac, Apple Watch. F (medium) S56, S63. "No Android app": pass 1 downgraded this to A (medium) because it was an absence established only by not finding a listing; pass 2 re-verified it with multiple 2026 sources (Penny Hoarder, receiptsync, walletgrower, W15) that independently state there is still no Android app, that an Android version "discussed for 2024 never shipped", and that the Dec 2025 web app is the only route for Android users. Restored to F (medium). Android has been on the roadmap since the 2024 Series A (S50) |
| Pricing | $13/mo or $95/yr; 1-month free trial (longer via referral codes); no free tier. F (medium) S63. Renewal at same price per low-reliability source. A (low) |
| Paywall | Single plan. F |
| Advertising / affiliate | None found. U |
| Retention | Model personalisation (switching cost), Apple ecosystem integration, design. A (medium) |
| Strengths | Best-rated categorisation and design; transfer typing; per-user ML; alerts. F (medium) S63, S64 |
| Weaknesses | Apple-only mobile; US-only; single user; cache-related duplicate bugs; limited budgeting method; Plaid dependence. F (medium) S62, S63 |
| Recurring negative themes | Missing/late transactions, wrong dates on pending→posted, small-bank disconnects, price. F (medium) S62 |
| Most loved | Categorisation accuracy and speed of review; visual design; recurring detection. F (medium) S63, S64 |
| Most frequent problems | Sync reliability for small institutions; pending/posted duplicates; Android absence. F (medium) |
| 2024-2026 news | $6M Series A led by Adjacent (Mar 2024) with growth attributed to Mint shutdown; web app Dec 2025; continuing Apple-first strategy. F (high) S50, S56 |

### 2.4 Rocket Money (ex Truebill)

| Attribute | Finding |
|---|---|
| Target users | Mass-market US consumers wanting subscription control, bill negotiation, light budgeting and credit score; large free user base cross-sold Rocket products. F (medium) S79, S78 |
| Markets | US. F |
| Onboarding | Sign up → connect bank via Plaid → app lists recurring charges/subscriptions and spend → prompt to pick a Premium price. First value (subscription list) in minutes. A (medium) S79 |
| UX highlights | Subscriptions list with cancel button, bill negotiation flow, Smart Savings, net worth, credit score, budgets. F (medium) S78 |
| Bank connection / aggregator | Plaid, read-only, 12,000+ institutions. F (medium) S78, S79 |
| Sync frequency | UNKNOWN. U |
| Categorisation | Automatic categorisation; transaction rules available only in Premium; custom categories limited on free (2 custom category budgets). F (high) S72, S75, S76 |
| Learns from corrections | UNKNOWN; no ML claims found. U |
| Custom categories | Premium: unlimited; Free: capped. F (high) S72 |
| Rules engine | Premium: automated transaction rules (category/rename). F (high) S75 |
| Automation level | Medium; with Rowan (Premium+) agentic actions (cancel, negotiate, auto-save). F (high) S70 |
| Recurring / subscription detection | Core strength; auto-detected recurring charges; cancellation concierge; bill negotiation (fee 35-60% of first-year savings, waived in Premium+). F (high) S71 |
| Merchant normalisation / logos | Yes (logos). A (medium) |
| Search | Basic. A |
| Transaction review flow | No review inbox; per-transaction edit (date, note, rename, assign to bill, ignore from budget). F (high) S74 |
| Split transactions | Premium feature per reviewers. A (medium) |
| Internal transfer detection | User sets category to "Internal Transfer" manually; help article guides this. F (high) S73. Automatic pairing UNKNOWN |
| Credit-card payments | Same manual "Internal Transfer" path. F (high) S73 |
| Pending → posted | UNKNOWN specifics. U |
| Duplicates | Known causes: PayPal linked alongside bank (double entries), account linked twice, provider glitches; workaround is unlink PayPal or "ignore" transactions. F (high) S74 |
| Refund handling | UNKNOWN. U |
| Cash handling | UNKNOWN. U |
| Budgets | Category budgets (free limited to 2 custom categories). F (high) S72 |
| Forecasting / cash flow | Upcoming bills calendar; no projection curve. A (medium) |
| Net worth | Yes. F (medium) |
| Goals | Smart Savings (automated transfers to Rocket savings account). F (medium) S78 |
| Notifications | Bill reminders, low balance, subscription alerts; Rowan texts. F (high) S70 |
| Anomaly alerts | Rowan monitors spending and texts when it spots a problem/savings opportunity. F (high) S70 |
| Shared finances | UNKNOWN. U |
| Receipt scanning | None. A (low) S194 |
| Import / export | CSV export: one source says any account (web) can export; another says Premium only. CONFLICT (low) S82, S72 |
| Web app | Yes (reported as Premium-only in some sources). CONFLICT (low) |
| Mobile | iOS (4.5) and Android (4.6). F (medium) S77 snippet |
| Pricing | Free tier; Premium "pay what you think is fair" slider $7-$14/mo: F (high) S71 (vendor pricing explainer) re-confirmed in pass 2 by the vendor's own "What is Rowan" page and by Rob Berger, Wall Street Survivor and planandmultiply (W18); the reviewer-prior-knowledge $6-$12 range was stale. Premium+ $15/mo (Rowan, bill negotiation without success fee, HYSA eligibility): F (high) S71, W18, W19. Bill-negotiation success fee 35-60% of first-year savings for non-Premium+. F (high) S71 |
| Paywall | Freemium; Premium unlocks unlimited categories, rules, cancellation concierge, net-worth history, web, export (contested). F (high) S72 |
| Advertising / affiliate | Cross-promotion of Rocket Mortgage/loans/Rocket Visa; external affiliate programme pays $4-$10 per install/sign-up. F (medium) S83, S84 |
| Retention | Subscription savings narrative, Premium+ agent, savings account. A |
| Strengths | Subscription cancellation (named best subscription-cancelling app), free tier, scale (10M+ members claimed; premium members "nearly doubled YoY"). F (medium) S77 snippet, S78; exact member figures U. Hard financial signal (pass 2): Rocket Companies' Form 10-Q for the quarter ended 2026-06-30 attributes a $42M year-on-year increase in Rocket Money revenue for H1 2026 ($20M in Q1) to "growth in paying subscribers"; no subscriber count is disclosed. F (high) W20 |
| Weaknesses | Dark-pattern cancellation of its own Premium; surprise negotiation fees; email-only support; shallow budgeting. F (medium) S77, S86, S87 |
| Recurring negative themes | Trustpilot 3.5/5 (4,100+ reviews); BBB A+ rating but 1.89/5 user average and ~259-261 complaints in 3 years with only ~21% satisfactorily resolved; charges after cancellation; unauthorised negotiations. F (medium) S77, S86 |
| Most loved | Finding and cancelling forgotten subscriptions; simplicity. F (medium) S78 |
| Most frequent problems | Billing/cancellation friction; sync errors; PayPal duplicates. F (medium) S74, S77 |
| 2024-2026 news | Premium slider and Premium+ tier; Rowan AI agent launched 2026-08-25 (built with Anthropic models; text-message interface; cancels subscriptions, negotiates bills, sets up savings; limited rollout in Premium+ with broader availability later in 2026). F (high) S70, S80, S81 |

### 2.5 Quicken Simplifi

| Attribute | Finding |
|---|---|
| Target users | Value-seeking ex-Mint users, people who want an automated "Spending Plan" without envelopes; Quicken brand loyalists wanting a lighter cloud product. F (medium) S101, S102 |
| Markets | US and Canada: official support articles say Simplifi "can be used anywhere in the U.S. and Canada", connects only to US and Canadian institutions and supports USD and CAD only (one currency per account set). F (high) W22 (upgraded from U in pass 2). Canadian coverage is thinner than Quicken Classic's; users report failures with Wealthsimple, CIBC, MBNA Canada, AmEx Canada. A (low-medium) W22 community thread |
| Onboarding | Sign up (card required, annual up-front, 30-day money-back) → connect accounts → confirm detected bills/income/subscriptions → Spending Plan auto-built. First value (Spending Plan) in one session; 3-4 steps. A (medium) S101 |
| UX highlights | Spending Plan (income − bills − planned spending = "available"), Watchlists per category, Refund Tracker, Subscription tracker, Retirement Planner (15 variables), credit score, reports, Projected Cash Flow. F (medium) S101, S102 |
| Bank connection / aggregator | Quicken's own connection service with OAuth/API links to institutions, plus "some Plaid connections for certain banks"; community thread titled "Why doesn't Simplifi just use Plaid?" confirms it is not Plaid-first. F (high) S93, S99. Historical Quicken stack via Intuit/QCS. A (low) S99 |
| Sync frequency | Pending transactions appear up to 4-6 hours after the bank shows them. F (high) S92 |
| Categorisation | Automatic categorisation + Transaction Rules (if payee/amount → rename payee, set category, add tag); when recategorising, "Apply to similar transactions" updates past ones and remembers; only one category rule per payee. F (high) S94, S95 |
| Learns from corrections | Deterministic rule memory, not ML. F (high) S95. Quicken Assist Chat (AI chat, in beta) can find uncategorised transactions and batch-recategorise, create rules, goals, transactions; it "never takes action without your review and approval". F (high) S90, S91, W25. **Timeline corrected in pass 2:** the product team announced it to Early Access subscribers on 2026-02-12 (initially 60% of Early Access Basic subscribers, web and mobile, W23); the Quicken blog post S90 that the original draft dated "Aug 2026" was published 2026-08-04 and marks wider beta publicity, not the first availability |
| Custom categories | Yes, with subcategories (mobile and web). F (high) |
| Rules engine | Yes (see above). F (high) S94 |
| Automation level | Medium-high (Spending Plan auto-updates). F |
| Recurring / subscription detection | Subscription tracker scans transactions for recurring charges; bills/income series. F (medium) S101 |
| Merchant normalisation / logos | Payee renaming rules; logos UNKNOWN. U |
| Search | Transaction search/filter, reports (web). F (high) S97 |
| Transaction review flow | No inbox; "uncategorised" filter; AI chat can drive categorisation. F (high) S91 |
| Split transactions | Yes; splitting a pending transfer marks the counterpart pending too. F (high) S92 |
| Internal transfer detection | Transfers between linked accounts are detected/paired (counterpart handling described); exact matching rules UNKNOWN. A (medium) S92 |
| Credit-card payments | Treated as transfers. A (medium) |
| Pending → posted | Pending downloaded when the bank exposes it; included in balances; some institutions (Capital One, SoFi, USAA, PNC, Fidelity) do not provide pending. F (high) S92. Community reports of duplicates when editing a pending transaction's category before it posts. F (medium) S107 |
| Duplicates | Troubleshooting articles for missing transactions and balance discrepancies; manual delete. F (high) |
| Refund handling | Refund Tracker: mark an expected refund and track its arrival. F (medium) S101 |
| Cash handling | Manual cash account. A |
| Budgets | Spending Plan + Watchlists (budget a few categories without budgeting everything). F (medium) S101 |
| Forecasting / cash flow | Projected cash flow 30 days+ based on bills/income. F (medium) S101 |
| Net worth | Yes. F |
| Goals | Savings goals. F |
| Notifications | Bill reminders, large transaction, low balance. A (medium) |
| Anomaly alerts | UNKNOWN. U |
| Shared finances | Spaces & Sharing: one shareable space with one additional person (Quicken Business & Personal offers up to three). F (high) S96 |
| Receipt scanning | Photo attachment to a transaction on mobile; no extraction. F (medium) S100 |
| Import / export | Manual CSV/QFX import; CSV export only, web only. F (high) S97, S98 |
| Web app | Yes (primary). F |
| Mobile | iOS, Android. F |
| Pricing | Promo $3.99/mo billed annually ($47.88, "42% off"); a deeper "50% off" promo at $3.49/mo was observed on quicken.com in mid-Sep 2026 (W21). Renewal: **$6.99/mo ($83.88/yr)**, i.e. +75% on the promo price. Pass 2 resolved the earlier $5.99-vs-$6.99 conflict: four independent 2026 pricing pages plus a direct observation of quicken.com's "then $6.99/month, billed annually" wording agree on $6.99; $5.99 was the 2023 list price. F (medium) W21; S103, S101. Annual only; no monthly; 30-day money-back. F (medium) S101 |
| Paywall | Single plan. F |
| Free tier | None (Mint users got a free year promo in 2023-24). F (low) S104 |
| Advertising / affiliate | None found in-app; Quicken cross-sells Classic/Business. A |
| Retention | Low price, Quicken brand, annual prepay. A |
| Strengths | Cheapest full-featured app; Spending Plan + watchlists; refund tracker; AI assistant; broad institution list (14,000+). F (medium) S101, S90 |
| Weaknesses | Intro-vs-renewal price jump; bills module and reports criticised; web-only export; sync lag. F (low-medium) S103, S105 |
| Recurring negative themes | Renewal price surprise; sync/bill detection issues; bugs slow to fix. F (low-medium) S105, S103 |
| Most loved | Price/value, Spending Plan clarity, watchlists. F (medium) S101 |
| Most frequent problems | Connection errors (OL-xxx codes shared with Quicken), missing transactions. F (medium) S99 |
| 2024-2026 news | Mint-user free-year promo (2023-24); Quicken Assist Chat AI beta: Early Access rollout from 2026-02-12 (W23), broader beta publicity with the 2026-08-04 blog post (S90), using user data, Simplifi tools and web search. F (high) S90, W23 |

### 2.6 Empower Personal Dashboard (ex Personal Capital)

| Attribute | Finding |
|---|---|
| Target users | Investors/high-net-worth prospects wanting net-worth and portfolio analytics; budgeting is secondary. F (medium) S116, S117 |
| Markets | US. F |
| Onboarding | Sign up → link accounts (Yodlee FastLink) → dashboard with net worth, cash flow, retirement planner. First value after linking (2-3 steps). A (medium) |
| UX highlights | Net worth, Retirement Planner, Investment Checkup, fee analyser, cash flow, savings planner, emergency fund. F (medium) S117 |
| Bank connection / aggregator | Yodlee FastLink. F (medium) S114 |
| Sync frequency | UNKNOWN; "Re-sync transactions" button disabled for one week after use. F (high) S113 |
| Categorisation | Automatic; on edit a pop-up offers to apply to future and/or past transactions (rule creation). F (high) S111. Max 30 custom categories (types Income/Expense/Transfer); default categories cannot be deleted. F (high) S110 |
| Learns from corrections | Rule-based only. F (high) S111 |
| Rules engine | Simple (per-description rule on edit). F (high) |
| Automation level | Low-medium. |
| Recurring / subscription detection | Bills/upcoming view; basic. A |
| Transaction review flow | None; bulk edit on web (category/description/tags). F (high) S112 |
| Split transactions | UNKNOWN. U |
| Internal transfer detection | "Transfer" category type exists; automatic pairing UNKNOWN. A (medium) S110 |
| Pending → posted | Reviewers describe a pervasive pending-transaction issue that makes budgeting unreliable. A (low) S119 |
| Duplicates | Re-sync tool to fix missing/duplicate transactions. F (high) S113 |
| Budgets | One overall monthly spending target; no per-category budgets (NerdWallet) — some blogs say "budgeting" loosely. F (medium) S116 |
| Forecasting / cash flow | Cash-flow view; retirement Monte Carlo. F (medium) |
| Net worth | Core strength. F |
| Goals | Retirement/savings planner. F |
| Shared finances | UNKNOWN. U |
| Receipt scanning | None. U |
| Import / export | CSV export; no import. A (medium) |
| Web app / mobile | Web, iOS, Android. F |
| Pricing | Free dashboard; wealth management for clients with $100k+ investable assets at 0.89% AUM on $100k-$999,999, then 0.79% on the first $3M, 0.69% on the next $2M, 0.59% on the next $5M, 0.49% above $10M. F (medium) S117, W26 (re-confirmed pass 2) |
| Advertising / affiliate | Sales calls to free users above asset thresholds; "Investment Checkup" doubles as upsell. F (medium) S114, S115 |
| Strengths | Free; best-in-class investment analytics for a free tool. F (medium) |
| Weaknesses | Thin spending tools, 30-category cap, sync reliability, support, pushy sales. F (medium) S115, S116, S119 |
| Recurring negative themes | Yodlee sync failures/outdated data, slow transaction downloads, sales calls, weak support. F (medium) S115, S114 |
| 2024-2026 news | No pricing/ownership changes found; remains a lead-gen funnel for Empower advisory. U |

### 2.7 PocketGuard

| Attribute | Finding |
|---|---|
| Target users | Beginners who want one number ("In My Pocket") and debt payoff planning. F (medium) S131, S132 |
| Markets | US (Canada UNKNOWN). U |
| Onboarding | Sign up → link accounts (Plaid/Finicity) → confirm income and bills → "In My Pocket" shown. 3-4 steps. A (medium) S131 |
| UX highlights | In My Pocket = income − bills − goals − budgets; debt payoff plan; subscription list with cancel (Plus). F (medium) S131 |
| Bank connection / aggregator | Plaid and Finicity. F (high) S125 |
| Sync frequency | "Regular sync schedule"; UNKNOWN cadence. U |
| Categorisation | Automatic + manual; Plus unlocks unlimited custom rules (merchant/payee/account/amount/category conditions per roadmap). F (medium) S127 |
| Learns from corrections | Rules only; ML UNKNOWN. U |
| Custom categories | 70+ defaults; custom categories/subcategories (Plus for unlimited). F (medium) S131 |
| Transaction review flow | None found; pending transactions became editable per a product news post. F (high) S126 |
| Internal transfer detection | Transfers excluded from In My Pocket; Plus supports transfers between cash accounts, multiple cash accounts (up to 50), duplicate cash transactions, auto-repeat bills. F (medium) S127, S131 |
| Pending → posted | Pending editable (news post "edit-pending"); replacement behaviour UNKNOWN. A (medium) S126 |
| Budgets / goals / net worth | Category budgets, goals, net worth; debt payoff (Plus). F (medium) |
| Shared finances | UNKNOWN. U |
| Import / export | CSV export (Plus) per reviewers; import UNKNOWN. A (low) |
| Platforms | iOS (4.6), Android (4.2), web. F (medium) S128, S129 |
| Pricing | Plus $12.99/mo or $74.99/yr (~$6.25/mo), or **$149.99 one-time lifetime** (currently sold; the Feb 2024 "lifetime discontinued" item is therefore stale or was temporary). F (medium) W27 (Clark.com, FinanceBuzz, Ramsey, Penny Hoarder and three SEO pages agree), S133, S134. **Free tier removed (2026):** the historical free plan (2 linked accounts, 2 budget categories) is gone; new users get a 7-day trial and then must pay; pocketguard.com's pricing page shows no free plan (observed late Aug 2026). Pass 2 resolved the earlier CONFLICT: F (medium) W27. For context, 2023 pricing was $7.99/mo or $34.99/yr, so Plus has more than doubled in three years while the free plan disappeared. A (low-medium) W27 |
| Advertising / affiliate | Offers/"ways to save" with partner products in-app. A (low) |
| Strengths | Simplicity; one-number model; debt tools. F (medium) |
| Weaknesses | Crashes, sync failures (e.g., Amex disconnecting daily), narrow free tier, shrinking free plan. F (medium) S128, S130 |
| Recurring negative themes | App crashes, sync, data loss after re-link, cancellation/refund complaints on Trustpilot. F (medium) S130 |
| 2024-2026 news | Lifetime plan withdrawn (Feb 2024) then back on sale at $149.99 (2026); free plan removed in 2026, trial-only model. F (medium) W27 |

### 2.8 Origin

| Attribute | Finding |
|---|---|
| Target users | Consumers wanting an all-in-one (spending, investing, tax filing, estate, HYSA) with an AI advisor; employees via employer financial-wellness benefit. F (high) S141, S144 |
| Markets | Consumer bank sync is US; employer product claims 70+ countries / 70+ languages (advice, not bank sync). F (high) S144. Italy availability for consumers: effectively no. A |
| Onboarding | Sign up (7-day trial) → connect accounts (Plaid/Finicity/MX) → AI builds a budget "in seconds" from income/spending → review transactions by swiping. 3-4 steps. F (high) S141, S143 |
| UX highlights | AI "Sidekick" chat; Review Transactions swipe UI; budgets; subscriptions; net worth; investing; tax filing; estate planning; CFP sessions ($119 each). F (medium) S140, S148 |
| Bank connection / aggregator | Plaid, Finicity (Mastercard) and MX. F (medium) S140 |
| Categorisation | Automatic by merchant; custom categories, tags, filters; custom rules. F (high) S142; learning UNKNOWN |
| Transaction review flow | Swipe-based review of transactions (confirm/adjust category). F (high) S143 |
| Recurring detection | Subscriptions and cash-flow tracking. F (high) S141 |
| Internal transfers / pending / duplicates | UNKNOWN. U |
| Budgets / forecasting | AI-generated personalised budget; cash-flow view. F (high) S141 |
| Shared finances | Partner can be added without extra fee (reviewer). A (medium) S140 |
| Platforms | iOS (4.6, ~3,000 ratings), Android (3.9, ~441 ratings, as of Mar 2026), web. F (medium) S140, S146, S147 |
| Pricing | $12.99/mo or $99/yr; $1 first-year promo seen; 7-day trial. F (medium) S140, S148 |
| Advertising / affiliate | Cash-management account (APY up to ~3.7%), investing, tax filing are own products; no third-party ads. A (medium) S140 |
| Strengths | Breadth, AI advisor, partner sharing, B2B2C distribution. F (medium) |
| Weaknesses | Users surprised by subscription; sync issues; AI weaker on Android; modest budget customisation. F (medium) S140, S146 |
| 2024-2026 news | "1 million pieces of advice" via AI advisor milestone (S145, medium-low); vendor blog actively attacks YNAB/Rocket in SEO content (S149). **Correction (pass 2): the "$30M raised Mar 2026" item in the original draft is a misattribution.** The March 2026 $30M Series A+ (led by Notion Capital, with Felix Capital, Acadian Ventures and HSBC Innovation Banking; Fortune, BusinessWire, Tech.eu, W32) belongs to *Origin*, a UK-based AI benefits-management platform founded by Chris Bruce and Pete Craghill (ex-Darwin/Mercer), not to Origin Financial (useorigin.com, San Francisco, founder-CEO Matt Watson). Origin Financial's last disclosed round is the $56M Series B of 2021 at a $400M valuation (01A, General Catalyst, Lachy Groom; Founders Fund, Felicis, Abstract participating), ~$68-70M raised in total; no 2025-2026 round was found (W33). One low-reliability revenue tracker estimates ~$16.7M ARR for 2025 (W33, low). No layoffs/pivot news found. U |

---

## 3. AI-first newcomers and AI moves, 2024-2026

| Product / move | Date | What it is | Status / source |
|---|---|---|---|
| Copilot Intelligence | 2023-09-05 | Per-user ML categoriser; top-2 suggestions | FACT (high) S51 |
| Monarch AI Assistant | 2023-06-13 (first); relaunched in Winter Release 2025-10-22 | GPT-4-powered chat over user data; relaunch bundled with goals, equity tracking, receipt scanning | FACT (medium/high) S38, S32 |
| ChatGPT personal finance | 2026-05-15 preview for US Pro users on web and iOS; expanded to Plus and Pro in the US on web, iOS and Android around 2026-06-25 (reported 2026-06-30/07-01) | Connect banks/cards/investments via Plaid (12,000+ institutions); dashboard of balances, spending, subscriptions, upcoming payments, net worth, portfolio; Q&A grounded in the data; Intuit integration planned for tax-aware analysis; follows OpenAI's April 2026 acquisition of the Hiro team | FACT (high) S170, S171, W29 for the May launch; the June expansion is now FACT (medium) W30 (9to5Mac, Dataconomy), upgraded in pass 2 from the low-reliability S183 |
| Rocket Money Rowan | 2026-08-25 | Agentic assistant over SMS built with Anthropic models; monitors spend, texts when it finds a problem/saving, cancels subscriptions, negotiates bills, sets savings transfers; Premium+ ($15/mo), limited rollout to select new Premium+ subscribers, waitlist for others, wider availability "later in 2026" | FACT (high) S70, S80, W19 (re-confirmed pass 2 via Nasdaq/PR Newswire, FinTech Global, Dealroom) |
| Cleo Autopilot | 2026-02-05 | Multi-agent system that executes pre-approved money moves within user-set guardrails (at launch: positive cash flow via a Roadmap; can move money to savings, prevent overdrafts with cash advances, set merchant spending limits); expands to emergency fund/debt/major purchase in 2026; Cleo also relaunched in the UK | FACT (high) S172, S173, W31 (re-confirmed pass 2); S180 (medium) |
| Quicken Assist Chat | Early Access beta from 2026-02-12; blog launch post 2026-08-04 (dates corrected in pass 2) | AI chat inside Simplifi using user data + Simplifi tools + web search; can recategorise in batch, create rules/goals/transactions, always with user approval | FACT (high) S90, S91, W23, W25 |
| Piere | $2.1M pre-seed 2025-10-21 | "Self-driving money": MyPlan auto-executed plans, Piere IQ chat budgets; tripled users and 4x paid subs in 2025; partners NFCC and Progressive | FACT (medium) S174 |
| SuperMoney AI app | 2025 (Finovate) | Automated budgeting, insights feed, AI assistant | FACT (low-medium) S175, S176 (press release content not verified) |
| Origin Sidekick | ongoing | AI advisor; "1M pieces of advice" | FACT (medium-low) S145 |
| EveryDollar relaunch (Ramsey) | 2026-01 | Not AI-first, but relevant: "margin finder", daily lessons, group coaching | FACT (low) S200 |
| BudgetSmart AI, Finny, Monavio, Spendalyst, Vento, Tally, Spendify, Bountisphere, etc. | 2025-2026 | Long tail of small AI-branded apps whose main visible activity is SEO content attacking incumbents; no funding/user data found | HYPOTHESIS (low): mostly indie/one-person products; ignore as competitors, watch as SEO noise |

**Reading of the AI trend (ASSUMPTION, medium):** 2023-2025 "AI" meant chat-over-your-data (Monarch, Origin, Copilot alerts). 2026 shifted to **agentic action** (Cleo Autopilot, Rowan, Piere MyPlan) and **platform bundling** (ChatGPT + Plaid; Quicken Assist). Rowan and Cleo both chose a **messaging-first** interface (SMS/chat) rather than dashboards. Per-user learning categorisation (Copilot) remains the benchmark users praise most; nobody has a published, verifiable accuracy number.

---

## 4. Cross-cutting analysis

### 4.1 Pending → posted, duplicates, transfers, credit-card payments

| App | Pending shown? | Pending counted in budget/balance? | Pending→posted replacement | Duplicate strategy | Transfer handling | Credit-card payment |
|---|---|---|---|---|---|---|
| YNAB | Yes [F high S4] | Not in plan until cleared [F high S4] | Cleared import replaces pending [A] | Skip identical date+amount on file import; 10-day amount match for manual entries; import IDs with occurrence index [F high S2/S3] | Explicit transfer transactions; both sides must exist/match [F high] | Transfer to card account; "Credit Card Payment" category auto-funded [F high S5] |
| Monarch | Yes [F high S29] | Filterable in reports; default UNKNOWN | Not always matched: hidden pending may reappear as new posted entry [F high S29] | Manual; troubleshooting checks bank + double-linked accounts [F high S23] | "Transfers" category; rules; auto-categorisation for Zelle/Venmo/checks [A low S43]; pairing logic UNKNOWN | Appears as transfer to card, excluded from spend [A low-medium] |
| Copilot | Yes | Unclear; "left to spend" subtracts recurring up-front [A] | Aggregator should recall pending; else clear cache [F high S54]; wrong-date bug on Amex [F medium S62] | Cache clear; delete/reconnect warning [F high S55] | Explicit type "Internal Transfer" excluded from budgets, "T" badge, manual creation possible [F high S52] | Both legs Internal Transfer [F high S53] |
| Rocket Money | UNKNOWN | UNKNOWN | UNKNOWN | PayPal + bank double entries; account linked twice; "ignore" workaround [F high S74] | Manual "Internal Transfer" category [F high S73] | Same manual path [F high S73] |
| Simplifi | Yes, 4-6h lag; some FIs omit pending [F high S92] | Yes, included in balance [F high S92] | Editing pending before posting can create duplicates [F medium S107] | Manual + troubleshooting | Transfer pairs recognised; splitting one side marks counterpart pending [F high S92] | Transfer [A] |
| Empower | Yes | Reviewers say pending breaks budgeting [A low S119] | UNKNOWN | Re-sync tool (1-week cooldown) [F high S113] | "Transfer" category type [F high S110] | UNKNOWN |
| PocketGuard | Yes, editable [F high S126] | UNKNOWN | UNKNOWN | Plus: duplicate cash transactions tool [F medium S127] | Transfers excluded from In My Pocket [F medium] | UNKNOWN |

**Takeaway (ASSUMPTION, medium):** no incumbent exposes a robust, explainable pending→posted reconciliation; the best-rated ones (Copilot, Monarch) still ship "clear cache" and "check your bank" as the fix. Transfer handling is either a manual category (Rocket, Empower) or a typed transaction (Copilot, YNAB) with limited automatic pairing. This is a real gap for Lilleri's "automatic reconciliation" promise.

**Aggregator-side evidence added in the adversarial pass (FACT, high, V4):** Plaid's Transactions documentation states that a pending→posted transition is delivered as a removal of the pending record plus a new posted record carrying `pending_transaction_id`, signalled by a `TRANSACTIONS_REMOVED` webhook; only "in rare instances" is the posted record unlinked, and even then the pending one is still removed. Plaid also offers an on-demand `/transactions/refresh` on top of its periodic extraction. The Copilot and Monarch failure modes above (pending copy lingering, hidden pending reappearing as a new posted entry) are therefore app-side handling gaps rather than an aggregator limitation, which strengthens the case that Lilleri can differentiate here, provided its EU providers expose equivalent linkage (verify per provider; see reconciliation-and-data-model-patterns.md).

### 4.2 How categorisation learns

| App | Mechanism | Cold start | Explanation to user |
|---|---|---|---|
| Copilot | Per-user ML model trained on reviewed transactions; predicts type + category; top-2 shown | ~30 reviewed transactions [F high S51] | Suggestion with alternatives; no "why" |
| Monarch | Provider category + Monarch mapping + user rules; claimed ML reinforcement [A low] | Immediate (defaults) | Rule creation prompt |
| YNAB | Payee → last category memory | First occurrence prompts | Implicit |
| Simplifi | One rule per payee; "apply to similar"; AI chat for batch fixes | Immediate | Rule visible |
| Empower | Rule prompt (future/past) | Immediate | Pop-up |
| Rocket / PocketGuard | Rules (paid tiers) | Immediate | Rule visible |
| Origin | Auto by merchant + rules + swipe review | Immediate | Swipe |

### 4.3 Review-inbox style flows

- Copilot "To Review" (dashboard section; each review trains the model) [F high S54/S67].
- Monarch "Needs review" status with rules that decide what needs review and who reviews it; splitting counts as reviewing; review notifications [F high S28].
- Origin swipe-to-review [F high S143].
- YNAB "approve" imported transactions and match manual entries [F high S2].
- Rocket, Simplifi, Empower, PocketGuard: no inbox; edit-in-list.

### 4.4 Pricing trends 2024-2026 (all FACT/medium unless noted)

| App | 2023/early-2024 | 2026-10 | Trend |
|---|---|---|---|
| YNAB | $98.99/yr (quoted as $99) and $14.99/mo, both since Nov 2021 | $109/yr (annual step in 2024; exact dates A low S11); $14.99/mo unchanged | +10% on annual only, single tier (corrected in adversarial pass: the monthly price did not change in 2024; reviewer prior knowledge, medium) |
| Monarch | $99.99/yr, $14.99/mo | Core unchanged; Plus added 2026-04-21 at $299/yr list for new members per the launch release (W7), $199/yr per 2026 review sites (W10): CONFLICT, verify | Tiering up for power users at 2-3x Core; heavy 50%-off first-year promos on Core; $100-off first year on Plus for existing members |
| Copilot | ~$95/yr | $95/yr, $13/mo | Flat |
| Rocket Money | Premium $4-$12 slider (historic, A) | $7-$14 slider; Premium+ $15/mo (2026) | Floor raised; new AI tier; negotiation fee folded into top tier |
| Simplifi | $5.99/mo, $47.88/yr (2023, A low) | $3.99/mo promo billed annually ($3.49 seen Sep 2026); renewal $6.99/mo = $83.88/yr (conflict resolved, W21) | Deeper intro discount, +75% renewal step-up |
| PocketGuard | Plus $34.99/yr, $7.99/mo (2023, A low-medium W27) + lifetime | $74.99/yr, $12.99/mo, lifetime $149.99 back on sale; free plan removed in 2026 (F medium W27) | Freemium → trial-only; Plus price more than doubled in three years |
| Origin | $12.99/mo, $99/yr | Same; $1 first-year promo | Promo-led acquisition |
| Empower | Free | Free | Lead-gen model stable |
| ChatGPT | n/a | Bundled in Plus/Pro | Platform bundling threat |

**Pattern (ASSUMPTION, medium):** the US market settled at **~$95-$109/yr** for a full PFM; growth comes from (a) first-year discounts with renewal step-ups, (b) a premium tier at ~2-3x for AI/agentic or planning features (Monarch Plus $199-$299 vs $99.99 Core; Rocket Premium+ $15 vs a $7-$14 slider), and (c) household sharing included to raise willingness to pay. Freemium is retreating (PocketGuard's free plan is now confirmed gone) except where a parent company monetises elsewhere (Rocket, Empower, Credit Karma).

### 4.5 Trust signals

- App-store ratings are uniformly high (4.5-4.9) while Trustpilot/BBB are mostly low (Monarch 2.0 on a 33-review page that is not its only Trustpilot page, see 2.2; Rocket 3.5/4,100 reviews; BBB users 1.89) — reviewers attribute the gap to first-month enthusiasm vs billing/support friction later [F medium S37, S77, S86]. **YNAB is the exception**: Trustpilot 4.6 on 3,103 reviews [F medium W6], which suggests the gap is driven by billing/cancellation practices rather than by the category itself.
- Plaid/aggregator reliability is the number-one complaint everywhere; small institutions and credit unions are the worst [F medium S39, S62].

---

## 5. Patterns worth adopting (to be re-implemented originally, not copied)

1. **Typed transactions, not just categories** — a first-class transaction type (regular / income / internal transfer / refund) that is excluded from spending when it is a transfer, with both legs of a transfer linked. (Copilot's three types; YNAB's transfer semantics.)
2. **Per-user learning categoriser with an explicit cold-start threshold and visible alternatives** — train on the user's confirmations, show the top-2/3 alternatives inline, and tell the user when the model is "ready". (Copilot Intelligence.) Lilleri should add what nobody has: a short "why" (matched merchant / learned from your correction on date X).
3. **Review inbox driven by rules + confidence** — only low-confidence or user-defined cases (amount > X, new merchant, category Y, account Z) go to review; everything else is auto-reviewed; household member assignment; splitting = reviewed. (Monarch.) Add swipe gestures for mobile (Origin).
4. **Explicit pending/posted state machine** — show pending, keep it out of (or clearly flagged inside) budgets until posted, match posted to pending by aggregator IDs plus fuzzy amount/date/merchant window, never produce "clear cache" advice. (YNAB's policy; Copilot/Monarch's failures as the anti-pattern.)
5. **Deterministic import de-duplication** — stable import IDs with amount + date + occurrence index, 10-day manual-vs-import match window, identical-row skip on file import. (YNAB.)
6. **Provider choice and fallback per institution** — default to the best provider per bank, let the user switch, keep manual/CSV as a graceful fallback. (Monarch.) In Italy/EU this maps to multiple AIS providers.
7. **Recurring detection at onboarding and "already spent" treatment** — detect subscriptions/bills during setup and subtract them from "safe to spend" from day one. (Copilot, PocketGuard "In My Pocket", Simplifi Spending Plan.)
8. **Single "safe to spend" number** for beginners alongside category detail for power users. (PocketGuard, Simplifi.)
9. **Household on one subscription** with separate logins and selective sharing. (Monarch unlimited; YNAB Together up to 6.)
10. **Receipt capture that extracts line items and splits the matched transaction** (Monarch Winter Release) — in Italy, consider scontrino/fattura elettronica angles later.
11. **Rules with rename + category + tag + split + review-status actions, applied retroactively** (Monarch, Simplifi), and allow more than one rule per payee (Simplifi's one-rule limit is a complaint).
12. **Configurable alerts**: bank fee, large expense, subscription price increase, unusual merchant, low balance. (Copilot, Rowan.)
13. **Refund tracking** as a first-class flow (expected refund → matched inflow). (Simplifi Refund Tracker.)
14. **Long free trial without card** (YNAB 34 days) — Monarch's 7-day trial is a recurring complaint; a reconciliation-heavy product needs time to show value.
15. **CSV export on every tier, every platform**, plus a documented API. (YNAB API; Simplifi's web-only export is a complaint.)
16. **Messaging-first proactive assistant** (Rowan/Cleo) — HYPOTHESIS: for Italy, push/WhatsApp-style nudges that propose an action and ask for one-tap approval may beat a chat box.

## 6. Patterns to avoid

1. **Hard-to-cancel subscriptions and surprise success fees** (Rocket Money's bill-negotiation 35-60% cut and three-path cancellation) — drives Trustpilot/BBB collapse.
2. **Intro price with silent renewal step-up** (Simplifi $3.99 → $5.99-$6.99; Monarch 50%-off promos) — generates "price trap" content and churn at month 12.
3. **Sales-call upsell on a "free" tool** (Empower) and ad/lead-gen-funded PFM (Mint) — the model that killed Mint.
4. **Lifetime deals** that get withdrawn and then reappear at a higher price (PocketGuard: withdrawn Feb 2024, back at $149.99 in 2026).
5. **Crippled free tiers** (2 accounts / 2 categories) that read as bait.
6. **Single-platform lock-in and late web** (Copilot: no Android, web only in Dec 2025).
7. **Shipping "clear the cache" or "check your bank" as the answer to duplicates and pending/posted issues** (Copilot, Monarch) — the exact pain Lilleri promises to remove.
8. **Hidden pending transactions that reappear when posted** (Monarch) — breaks user trust in the ledger.
9. **Manual transfer tagging as the only path** (Rocket, Empower) and transfers that distort spend if the user forgets.
10. **Arbitrary caps** (Empower: 30 custom categories; Simplifi: one rule per payee).
11. **Budget without categories** (Credit Karma, Empower) — users leave immediately.
12. **7-day trials** for products that need multi-week data to show reconciliation value.
13. **US-only currency/market assumptions** baked into the data model (Monarch USD/CAD; Copilot US-only) — Lilleri must be multi-currency and multi-provider from day one.
14. **Opaque AI claims** ("95% accuracy") without a visible mechanism or explanation — invites distrust; show confidence and reasons instead.
15. **SEO content farms masquerading as reviews** (many 2026 "reviews" are competitors' marketing) — do not build brand around attack-content; it is also a signal that discovery is dominated by this noise.
16. **Web-only export / premium-only export** (Simplifi, Rocket) — data portability is a trust feature, especially under GDPR.

---

## 7. Open questions and how to verify

| Question | How to verify |
|---|---|
| Monarch's exact transfer-pairing and pending→posted logic | Read help.monarch.com article 360048393292 (egress-blocked here) from a normal browser; test with a trial account |
| Official Monarch categorisation model (ML vs rules) | Monarch help "Categories" article; Monarch engineering blog |
| YNAB Direct Import coverage in Italy (provider question **resolved in pass 2**: Plaid since 2025-02-05, W2/W3; which Italian banks actually connect is still open) | support.ynab.com Europe article + bank list; try linking Intesa/UniCredit/Fineco in a trial; compare with Plaid's own Italian institution list |
| Copilot Canada support | help.copilot.money International article; app listing in Canadian App Store |
| Rocket Money member and premium counts | Rocket Companies 10-K/10-Q and earnings calls (2025-2026) |
| Simplifi renewal price and Canada availability — **resolved in pass 2** ($6.99/mo renewal, W21; US + Canada, USD/CAD, W22) | Re-read quicken.com/simplifi before quoting, since promos change monthly |
| PocketGuard free plan status — **resolved in pass 2** (removed; 7-day trial only; lifetime $149.99 back on sale, W27, medium) | pocketguard.com/pricing from a normal browser for a primary confirmation |
| Exact Trustpilot counts — **resolved for YNAB in pass 2** (3,103 reviews, 4.6, W6); Monarch's monarch.com page count still unknown (W14) | trustpilot.com/review/monarch.com directly |
| ChatGPT personal finance rollout to Plus — **resolved in pass 2** (Plus + Android from ~2026-06-25, W30) | openai.com help centre for the current country list (still US-only as of July 2026) |
| **Monarch Plus list price: $299/yr (launch press release, W7) vs $199/yr (2026 review sites, W10)** — matters for the "premium tier at ~2x" pricing pattern | monarch.com/pricing from a normal browser; Monarch help article "Monarch Plus Tier" (W8) |
| Origin Financial (useorigin.com) funding and health since the 2021 $56M Series B — the draft's "$30M Mar 2026" was a different company (W32/W33) | Crunchbase/PitchBook profile for Origin Financial; LinkedIn page S145 (check which "Origin" the snippet referred to) |
| Sync cadence per app (Plaid default vs on-demand) | Plaid docs on transaction refresh; each app's help centre |
| Mint-refugee distribution | Sensor Tower / Appfigures download data Jan-Apr 2024; r/mintuit polls |
| Items pass 1 could not re-verify — **status after pass 2**: Monarch Plus Apr 2026 (exists, price conflict, see above); Rowan and Premium+ Aug 2026 (confirmed, W18/W19); Quicken Assist (confirmed, but dates from Feb 2026, W23); ChatGPT personal finance May 2026 (confirmed, W29/W30); Cleo Autopilot Feb 2026 (confirmed, W31); Origin $30M Mar 2026 (**refuted**, wrong company, W32); PocketGuard free-plan removal (confirmed, medium, W27); Rocket Premium slider $7-$14 (confirmed, W18) | Only the Monarch Plus price and the Rowan general-availability date remain to be read on live pricing pages |
| Copilot Android availability | Google Play search for "Copilot Money"; changelog.copilot.money |
| Monarch Trustpilot total (old monarchmoney.com page vs new monarch.com page) | trustpilot.com/review/monarch.com and trustpilot.com/review/www.monarchmoney.com |
| YNAB price-history dates (monthly $14.99 since Nov 2021; annual $109 since 2024-08-01/09-01 — the 2024 dates are now multi-source, W5, medium; the 2021 date still rests on reviewer prior knowledge) | ynab.com/blog price-change posts 2021 and 2024 |

---

## Sources

All verified (search snippet seen) on 2026-10-02. Publication dates shown when visible in the snippet/URL. Reliability: high = official/primary; medium = reputable secondary; low = blog/forum/SEO/unclear.

| ID | Source | URL | Pub. date | Reliability | Doubts |
|---|---|---|---|---|---|
| S1 | YNAB support: How Direct Import Works | https://support.ynab.com/en_us/how-direct-import-works-H1IGYLgnxl | n/a | high | snippet only |
| S2 | YNAB support: Approving and Matching Transactions | https://support.ynab.com/en_us/approving-and-matching-transactions-a-guide-ByYNZaQ1i | n/a | high | |
| S3 | YNAB support: File-Based Import | https://support.ynab.com/en_us/file-based-import-a-guide-Bkj4Sszyo | n/a | high | |
| S4 | YNAB blog: Pending Transactions Have Arrived | https://www.ynab.com/blog/pending-transactions-have-arrived | undated (older) | high | behaviour may have evolved |
| S5 | YNAB support: Categorizing Transactions | https://support.ynab.com/en_us/categorizing-transactions-a-guide-HyRl60sks | n/a | high | |
| S6 | YNAB: Introducing YNAB Together | https://www.ynab.com/whats-new/introducing-ynab-together | n/a | high | |
| S7 | YNAB What's New | https://www.ynab.com/whats-new | 2026 entries | high | |
| S8 | YNAB support: Direct Import in Europe | https://support.ynab.com/en_us/direct-import-in-europe-Syae1z_A9 | n/a | high | bank list not seen |
| S9 | YNAB status page | https://ynabstatus.com/ | live | medium | TrueLayer component inferred from snippet |
| S10 | Forethought case study on YNAB support | https://forethought.ai/case-studies/ynab-replaced-a-basic-chatbot-with-forethought-and-saw-deflection-jump-from-25-to-70 | 2024-25 | medium | vendor case study |
| S11 | Lemmy thread: YNAB price increase | https://lemmy.dbzer0.com/post/23246932 | 2024 | low | forum |
| S12 | Trustpilot: YNAB | https://www.trustpilot.com/review/ynab.com | live | medium | review count conflict |
| S13 | Penny Hoarder YNAB review 2026 | https://www.thepennyhoarder.com/budgeting/ynab-review/ | 2026 | medium-low | affiliate site |
| S14 | Freenance YNAB review (EU angle) | https://freenance.io/products/ynab-review-2026-budgeting-app-worth-it-european-investors/ | 2026 | low | |
| S15 | BudgetSyncer (third-party EU sync for YNAB) | https://budgetsyncer.com/ | live | low | vendor |
| S16 | Apple App Store (IT): YNAB | https://apps.apple.com/it/app/ynab/id1010865877 | live | medium | user reviews |
| S17 | AccurateReviews (IT) YNAB | https://www.accuratereviews.com/it/software-gestione-finanze/ynab-recensione/ | n/a | low | |
| S20 | PR Newswire via Morningstar: Monarch launches Monarch Plus | https://www.morningstar.com/news/pr-newswire/20260421la39327/monarch-launches-premium-tier-monarch-plus | 2026-04-21 | high | |
| S21 | Monarch help: Privacy and Security | https://help.monarch.com/hc/en-us/articles/360048393572-Privacy-and-Security | n/a | high | |
| S22 | Monarch help: Guide to Connecting Your Accounts | https://help.monarch.com/hc/en-us/articles/360048393352-Guide-to-Connecting-Your-Accounts | n/a | high | |
| S23 | Monarch help: Troubleshooting Duplicate Transactions | https://help.monarch.com/hc/en-us/articles/32110313427604-Troubleshooting-Duplicate-Transactions | n/a | high | |
| S24 | Monarch help: Refreshing Your Accounts | https://help.monarch.com/hc/en-us/articles/360054839131-Refreshing-Your-Accounts | n/a | high | |
| S25 | Monarch help: Troubleshooting Delayed Transactions | https://help.monarch.com/hc/en-us/articles/360048883651-Troubleshooting-Delayed-Transactions | n/a | high | |
| S26 | Monarch help: Splitting Transactions | https://help.monarch.com/hc/en-us/articles/360050178492-Splitting-Transactions | n/a | high | |
| S27 | Monarch help: Transaction Rules | https://help.monarch.com/hc/en-us/articles/360048393372-Creating-Transaction-Rules | n/a | high | |
| S28 | Monarch blog: Transaction review (+ X post Apr 2022) | https://www.monarch.com/blog/transaction-review | 2022 | high | |
| S29 | Monarch help: Hiding or Unhiding Transactions | https://help.monarch.com/hc/en-us/articles/4405041904916-Hiding-or-Unhiding-Transactions | n/a | high | |
| S30 | Monarch help: Transfers and Credit Card Payments | https://help.monarch.com/hc/en-us/articles/360048393292-Transfers-and-Credit-Card-Payments | n/a | high | egress-blocked; content not read |
| S31 | Monarch help: Receipt and Image Imports | https://help.monarch.com/hc/en-us/articles/44244210547860-Receipt-and-Image-Imports-with-Receipt-Scanning | 2025-26 | high | |
| S32 | Monarch blog: Winter Release | https://www.monarch.com/blog/winter-release | 2025-10-22 | high | |
| S33 | Monarch help: FAQs (countries/currencies) | https://help.monarch.com/hc/en-us/articles/19985735202068-Monarch-FAQs | n/a | high | |
| S34 | FinTech Futures: Monarch raises $75m Series B | https://www.fintechfutures.com/venture-capital-funding/us-personal-finance-fintech-monarch-raises-75m-series-b | 2025-05 | medium | |
| S35 | Sacra: Monarch Money | https://sacra.com/c/monarch-money/ | 2025 | medium | estimates |
| S36 | PR Newswire: Monarch 1M members / Fast Company 2026 | https://www.prnewswire.com/news-releases/monarch-named-to-the-2026-fast-company-most-innovative-companies-list-as-it-surpasses-1-million-members-302723497.html | 2026 | high | |
| S37 | Trustpilot: Monarch Money | https://www.trustpilot.com/review/www.monarchmoney.com | live | medium | only 33 reviews |
| S38 | Product Hunt: Monarch AI Assistant | https://www.producthunt.com/products/monarch/launches/monarch-ai-assistant | 2023-06-13 | medium | |
| S39 | aitooldiscovery: Monarch Reddit summary | https://www.aitooldiscovery.com/guides/monarch-money-reddit | 2026 | low | secondary summary of Reddit |
| S40 | Forbes Advisor: Monarch review | https://www.forbes.com/advisor/banking/monarch-budget-app-review/ | 2026 | medium | |
| S41 | Monarch help: Getting Started | https://help.monarch.com/hc/en-us/articles/360048393272-Getting-Started-with-Monarch | n/a | high | |
| S42 | Marriage Kids and Money: Monarch review after 4 years | https://marriagekidsandmoney.com/monarch-money-review/ | 2026 | low | affiliate |
| S43 | Evolving Money Coaching: Monarch transfers | https://evolvingmoneycoaching.com/avoid-these-mistakes-in-monarch-money-and-an-explanation-on-transfers/ | n/a | low | |
| S44 | Second Order Labs: Monarch and the Mint migration | https://secondorderlabs.com/articles/growth/monarch-money-turned-budgeting-into-a-subscription-and-capped-the-market-it-can-ever-reach/ | 2025-26 | low | opinion |
| S50 | TechCrunch: Copilot $6M Series A | https://techcrunch.com/2024/03/21/budgeting-app-copilot-mint-6m-series-a/ | 2024-03-21 | high | |
| S51 | Copilot changelog: Copilot Intelligence for Spending | https://changelog.copilot.money/log/copilot-intelligence | 2023-09-05 | high | |
| S52 | Copilot help: Transaction Types | https://help.copilot.money/en/articles/3971267-transaction-types | n/a | high | |
| S53 | Copilot help: Credit Card Payment Transactions | https://help.copilot.money/en/articles/10671434-credit-card-payment-transactions | n/a | high | |
| S54 | Copilot help: Transactions FAQ | https://help.copilot.money/en/articles/10761907-transactions-faq | n/a | high | |
| S55 | Copilot help: Troubleshooting Account Duplicates | https://help.copilot.money/en/articles/8663179-troubleshooting-account-duplicates | n/a | high | |
| S56 | Copilot help: Copilot Money for Web | https://help.copilot.money/en/articles/11780342-copilot-money-for-web | 2025-12 | high | |
| S57 | Copilot: Privacy and Security | https://www.copilot.money/privacy-and-security | n/a | high | |
| S58 | Copilot help: How Do You Get My Financial Data | https://help.copilot.money/en/articles/10768078-how-do-you-get-my-financial-data | n/a | high | |
| S59 | Copilot help: International Currency | https://help.copilot.money/en/articles/10715424-international-currency | n/a | high | |
| S60 | Copilot help: Settings Overview | https://help.copilot.money/en/articles/11062072-settings-overview | n/a | high | |
| S61 | Copilot help: Quick Start Guide | https://help.copilot.money/en/articles/11157550-quick-start-guide | n/a | high | |
| S62 | Apple App Store: Copilot | https://apps.apple.com/us/app/copilot-track-budget-money/id1447330651 | live | medium | single review cited (Nov 2025) |
| S63 | Forbes Advisor: Copilot review | https://www.forbes.com/advisor/banking/copilot-budget-app-review/ | 2026 | medium | |
| S64 | Money with Katie: Copilot review (updated 2026) | https://moneywithkatie.com/copilot-review-a-budgeting-app-that-finally-gets-it-right/ | 2026 | low-medium | affiliate |
| S65 | fincomparelab: Copilot review | https://www.fincomparelab.com/reviews/copilot-money-review/ | 2026 | low | SEO site |
| S66 | borderlessbudget: Copilot for expats | https://borderlessbudget.com/blog/copilot-money-review-expats | 2026 | low | competitor SEO |
| S67 | Copilot help: Dashboard FAQ | https://help.copilot.money/en/articles/10238054-dashboard-faq | n/a | high | |
| S70 | Rocket Companies press release: Rowan | https://www.rocketcompanies.com/press-release/rocket-moneys-rowan-rewrites-what-ai-can-do-in-personal-finance/ | 2026-08-25 | high | |
| S71 | Rocket Money: pricing explainer (Free/Premium/Premium+) | https://www.rocketmoney.com/learn/personal-finance/how-much-does-rocket-money-cost | 2026 | high | vendor |
| S72 | Rocket help: Premium Membership features | https://help.rocketmoney.com/en/articles/2677184-premium-membership-features | n/a | high | |
| S73 | Rocket help: Working with credit card payments & transfers | https://help.rocketmoney.com/en/articles/3584527-working-with-credit-card-payments-transfers | n/a | high | |
| S74 | Rocket help: Troubleshooting duplicate transactions | https://help.rocketmoney.com/en/articles/6241182-troubleshooting-duplicate-transactions-in-the-app | n/a | high | |
| S75 | Rocket help: Creating transaction rules | https://help.rocketmoney.com/en/articles/10328100-creating-transaction-rules | n/a | high | |
| S76 | Rocket help: Editing and creating categories | https://help.rocketmoney.com/en/articles/3332081-editing-and-creating-transaction-categories | n/a | high | |
| S77 | Trustpilot: Rocket Money | https://www.trustpilot.com/review/rocketmoney.com | live | medium | |
| S78 | The College Investor: Rocket Money review | https://thecollegeinvestor.com/22660/rocket-money-review/ | 2026 | medium-low | affiliate |
| S79 | Ramsey Solutions: What is Rocket Money | https://www.ramseysolutions.com/budgeting/what-is-rocket-money | 2026 | medium-low | competitor (EveryDollar) |
| S80 | PYMNTS: Rowan ends subscriptions without a phone call | https://www.pymnts.com/news/artificial-intelligence/2026/this-ai-agent-ends-subscriptions-without-a-phone-call/ | 2026-08 | medium | |
| S81 | The Paypers: Rocket Money launches Rowan | https://thepaypers.com/fintech/news/rocket-money-launches-rowan-ai-agent-for-personal-finance | 2026-08 | medium | |
| S82 | Northville Tech: export from Rocket Money | https://northvilletech.com/blog/how-to-export-transactions-from-rocket-money/ | 2026 | low | |
| S83 | Rocket Money affiliates page | https://www.rocketmoney.com/affiliates | live | high | |
| S84 | UpPromote: Rocket Money affiliate program | https://uppromote.com/affiliate-directory/rocket-money/ | n/a | low | |
| S85 | Wall Street Survivor: Premium vs Premium+ | https://www.wallstreetsurvivor.com/rocket-money-premium-vs-premium-plus/ | 2026 | low | |
| S86 | fincomparelab: Rocket Money review | https://www.fincomparelab.com/reviews/rocket-money-review/ | 2026 | low | BBB numbers cited |
| S87 | The Finance Verdict: Rocket Money | https://thefinanceverdict.com/rocket-money-review/ | 2026 | low | |
| S90 | Quicken blog: What is Quicken Assist | https://www.quicken.com/blog/what-is-quicken-ai-the-new-ai-chat-in-quicken-simplifi/ | 2026 | high | vendor |
| S91 | Simplifi support: Using Quicken Assist Chat | https://support.simplifi.quicken.com/en/articles/13343650-using-quicken-assist-chat | 2026 | high | |
| S92 | Simplifi support: Does Simplifi download pending transactions | https://support.simplifi.quicken.com/en/articles/5654045-does-quicken-simplifi-download-pending-transactions | n/a | high | |
| S93 | Simplifi support: OAuth API connection | https://support.simplifi.quicken.com/en/articles/6997452-new-and-improved-way-to-connect-to-your-financial-institution-oauth-api | n/a | high | |
| S94 | Simplifi support: Transaction Rules (web) | https://support.simplifi.quicken.com/en/articles/4792733-how-to-use-transaction-rules-in-the-web-app | n/a | high | |
| S95 | Simplifi support: Recategorize a Transaction | https://support.simplifi.quicken.com/en/articles/3348227-how-to-recategorize-a-transaction | n/a | high | |
| S96 | Simplifi support: Spaces & Sharing | https://support.simplifi.quicken.com/en/articles/6443103-how-to-share-your-quicken-simplifi-data | n/a | high | |
| S97 | Simplifi support: Export transactions | https://support.simplifi.quicken.com/en/articles/3404263-how-to-export-transactions-from-quicken-simplifi | n/a | high | |
| S98 | Simplifi support: Manual import | https://support.simplifi.quicken.com/en/articles/4413430-how-to-manually-import-transactions | n/a | high | |
| S99 | Simplifi community: Why doesn't Simplifi just use Plaid? | https://community.simplifimoney.com/discussion/15194/why-doesn-039-t-simplifi-just-use-plaid | n/a | medium | forum |
| S100 | Simplifi community: receipt upload | https://community.simplifimoney.com/discussion/7634/mobile-receipt-scanning-upload | n/a | medium | |
| S101 | CNBC Select: Simplifi review | https://www.cnbc.com/select/quicken-simplifi-review/ | 2026 | medium | |
| S102 | Forbes Advisor: Simplifi review | https://www.forbes.com/advisor/banking/quicken-simplifi-review/ | 2026 | medium | |
| S103 | fincomparelab: Simplifi review | https://www.fincomparelab.com/reviews/quicken-simplifi-review/ | 2026 | low | |
| S104 | Slickdeals: Mint users 1 year Simplifi free | https://slickdeals.net/f/17193106-mint-app-users-1-year-quicken-simplifi-free-new-simplifi-members | 2023-24 | low | |
| S105 | Capterra: Quicken reviews | https://capterra.com/p/151854/Quicken/reviews/ | live | low-medium | mixes Quicken Classic |
| S106 | Simplifi community: pending not in cash flow | https://community.simplifimoney.com/discussion/10441/pending-transactions-not-reflected-in-cash-flow-balance | n/a | medium | |
| S107 | Simplifi community: changing category of pending creates duplicates | https://community.simplifimoney.com/discussion/comment/35277/ | n/a | medium | |
| S110 | Empower support: Create Custom Categories | https://support-personalwealth.empower.com/hc/en-us/articles/115012742188-Create-Custom-Categories-for-Transactions | n/a | high | |
| S111 | Empower support: Edit category | https://support-personalwealth.empower.com/hc/en-us/articles/201169830-How-do-I-edit-the-category-of-a-transaction | n/a | high | |
| S112 | Empower support: Edit Multiple Transactions | https://support-personalwealth.empower.com/hc/en-us/articles/201169860-Edit-Multiple-Transactions | n/a | high | |
| S113 | Empower support: Re-sync Account Transactions | https://support-personalwealth.empower.com/hc/en-us/articles/23481877705751-Re-sync-Account-Transactions | n/a | high | |
| S114 | Moneywise: Empower app review | https://moneywise.com/investing/reviews/empower | 2026 | medium-low | |
| S115 | Bogleheads: Empower sync issues | https://www.bogleheads.org/forum/viewtopic.php?t=424800 | 2024 | low-medium | forum |
| S116 | NerdWallet: Empower Personal Dashboard review | https://www.nerdwallet.com/finance/learn/empower-personal-dashboard-budget-app-review | 2025-26 | medium | |
| S117 | Rob Berger: Empower review | https://robberger.com/empower-review/ | 2026 | medium-low | affiliate |
| S118 | Wallet Hacks: Empower review | https://wallethacks.com/personal-capital-review/ | 2026 | low-medium | |
| S119 | getfinny: Empower review | https://getfinny.app/blog/empower-personal-dashboard-review-2026 | 2026 | low | competitor SEO |
| S125 | PocketGuard help: aggregation errors | https://pocketguard.com/help/aggregation-error-i-cannot-connect-or-update-my-account/ | n/a | high | |
| S126 | PocketGuard news: financial data improvements (edit pending) | https://pocketguard.com/news/edit-pending/ | n/a | high | |
| S127 | PocketGuard roadmap | https://pocketguard.com/news/pocketguard-roadmap/ | n/a | high | roadmap, may be stale |
| S128 | Apple App Store: PocketGuard | https://apps.apple.com/us/app/pocketguard-budget-app/id949414211 | live | medium | |
| S129 | Google Play: PocketGuard | https://play.google.com/store/apps/details?id=com.pocketguard.android.app | live | medium | |
| S130 | Trustpilot: PocketGuard | https://www.trustpilot.com/review/pocketguard.com | live | medium | |
| S131 | Penny Hoarder: PocketGuard review | https://www.thepennyhoarder.com/budgeting/pocketguard-review/ | 2026 | medium-low | |
| S132 | NerdWallet: PocketGuard review | https://www.nerdwallet.com/finance/learn/pocketguard-app-review | n/a | medium | |
| S133 | checkthat.ai: PocketGuard pricing | https://checkthat.ai/brands/pocketguard/pricing | 2026 | low | |
| S134 | sheetlink: PocketGuard pricing 2026 | https://sheetlink.app/pocketguard-pricing-2026 | 2026-08 | low | competitor SEO |
| S135 | Experian: PocketGuard review | https://www.experian.com/blogs/ask-experian/pocketguard-budgeting-app-review/ | n/a | medium | |
| S140 | Finder: Origin review | https://www.finder.com/budgeting/origin-financial | 2026-03 | medium | |
| S141 | Origin: Spending product page | https://useorigin.com/products/spending | live | high | vendor |
| S142 | Origin support: How does Spending work | https://support.useorigin.com/hc/en-us/articles/36975949985293-How-does-the-Spending-feature-work | n/a | high | |
| S143 | Origin blog: Swipe to review transactions | https://useorigin.com/resources/blog/never-wonder-where-your-money-went-introducing-review-transactions | n/a | high | vendor |
| S144 | Origin: Employers page | https://useorigin.com/employers | live | high | vendor |
| S145 | Origin LinkedIn page | https://www.linkedin.com/company/origin-financialsf | live | medium-low | funding claim via snippet |
| S146 | Apple App Store: Origin | https://apps.apple.com/us/app/origin-ai-budget-and-track/id1637693312 | live | medium | |
| S147 | Google Play: Origin | https://play.google.com/store/apps/details?id=com.useorigin.employee.android | live | medium | |
| S148 | Rob Berger: Origin review | https://robberger.com/origin-review/ | 2026 | medium-low | |
| S149 | Origin blog: YNAB vs AI finance apps | https://useorigin.com/resources/blog/ynab-vs-ai-finance-apps-whats-actually-better-in-2026 | 2026 | low | competitor marketing |
| S150 | Benzinga: Origin review | https://www.benzinga.com/money/origin-financial-review | n/a | medium-low | |
| S155 | WalletHub: What happened to Mint | https://wallethub.com/edu/b/what-happened-to-mint/151868 | 2024 | medium | |
| S156 | CNBC Select: Mint is gone, alternatives | https://www.cnbc.com/select/mint-budgeting-app-is-going-away-here-are-some-alternatives/ | 2024 | medium | |
| S157 | AlternativeTo news: Intuit to discontinue Mint | https://alternativeto.net/news/2023/11/intuit-to-discontinue-mint-app-in-2024-merging-features-into-credit-karma/ | 2023-11 | medium | |
| S158 | Sacra: Why Mint failed | https://sacra.com/research/why-mint-failed/ | 2024 | medium | analysis |
| S159 | 20somethingfinance: Mint → Credit Karma transition | https://20somethingfinance.com/mint-shutdown-credit-karma-transition/ | 2024 | low-medium | |
| S160 | Bountisphere: Credit Karma budgeting tool | https://bountisphere.com/budgeting-tools/banks/credit-karma | 2026 | low | competitor |
| S161 | Nasdaq: Mint is disappearing | https://www.nasdaq.com/articles/mint-is-disappearing-what-to-do-alternatives-to-consider | 2023-24 | medium | |
| S162 | mlq.ai: Monarch Series B amid post-Mint demand | https://mlq.ai/news/personal-finance-app-monarch-raises-75m-series-b-amid-surging-demand-post-mint-shutdown/ | 2025-05 | low-medium | |
| S170 | TechCrunch: OpenAI launches ChatGPT for personal finance | https://techcrunch.com/2026/05/15/openai-launches-chatgpt-for-personal-finance-will-let-you-connect-bank-accounts/ | 2026-05-15 | high | |
| S171 | OpenAI: A new personal finance experience in ChatGPT | https://openai.com/index/personal-finance-chatgpt/ | 2026-05 | high | |
| S172 | PR Newswire: Cleo launches Autopilot | https://www.prnewswire.com/news-releases/cleo-launches-autopilot-automating-your-money-moves-302679691.html | 2026-02-05 | high | |
| S173 | Cleo blog: Introducing Autopilot | https://web.meetcleo.com/blog/introducing-autopilot | 2026-02 | high | vendor |
| S174 | FinTech Global: Piere secures $2.1m | https://fintech.global/2025/10/21/ai-platform-piere-secures-2-1m-to-power-self-driving-money/ | 2025-10-21 | medium | |
| S175 | Wikipedia: SuperMoney | https://en.wikipedia.org/wiki/SuperMoney | live | low-medium | |
| S176 | BusinessWire release 2025-05-21 (SuperMoney, per search) | https://www.businesswire.com/news/home/20250521356679/en | 2025-05-21 | medium | content not read |
| S177 | Rob Berger: Best AI-powered finance apps | https://robberger.com/best-ai-power-finance-apps/ | 2026 | medium-low | |
| S178 | NerdWallet: Best budget apps 2026 | https://www.nerdwallet.com/finance/learn/best-budget-apps | 2026 | medium | |
| S180 | Finextra: Cleo relaunches in UK | https://www.finextra.com/newsarticle/47264/ai-personal-banking-assistant-cleo-relaunches-in-uk | 2025-26 | medium | |
| S181 | Sacra: Cleo | https://sacra.com/c/cleo/ | 2025 | medium | |
| S183 | buildfastwithai: ChatGPT personal finance explainer | https://blog.buildfastwithai.com/chatgpt-personal-finance-openai-2026 | 2026 | low | June rollout claim |
| S190 | Penny Hoarder: Monarch review 2026 | https://www.thepennyhoarder.com/budgeting/monarch-money-review/ | 2026 | medium-low | |
| S191 | fincomparelab: YNAB pricing | https://www.fincomparelab.com/guides/ynab-pricing/ | 2026 | low | |
| S192 | costbench: YNAB pricing | https://costbench.com/software/personal-finance/ynab/ | 2026 | low | |
| S194 | ReceiptSync blog: budgeting apps with receipt scanning | https://receiptsync.net/blog/budgeting-app-with-receipt-scanning | 2026 | low | vendor |
| S195 | senticmoney: budget app with receipt scanner | https://senticmoney.com/blog/budget-app-with-receipt-scanner | 2026 | low | competitor |
| S196 | cappi.io: Mint shut down 2026 | https://cappi.io/blog/mint-shut-down-2026/ | 2026 | low | |
| S197 | pocketclear: What happened to Mint | https://pocketclear.app/blog/what-happened-to-mint-2026.html | 2026 | low | |
| S200 | getitplanned: Mint alternatives 2026 (EveryDollar relaunch) | https://www.getitplanned.com/blog/mint-alternatives-budgeting-apps-2026 | 2026 | low | |
| S201 | Northville Tech: connect bank to Monarch | https://northvilletech.com/blog/how-to-connect-bank-accounts-monarch/ | 2026 | low | |

Sources added by the adversarial verification pass (retrieved 2026-10-02 as indexed documentation text via the Context7 docs index, because the live pages are egress-blocked):

| ID | Source | URL | Pub. date | Reliability | Doubts |
|---|---|---|---|---|---|
| V1 | YNAB API reference v1 (transactions: `import_id`, `duplicate_import_ids`, milliunits, `/plans/{plan_id}` endpoints) | https://api.ynab.com/v1 | live | high | indexed copy, not the live page |
| V2 | Plaid docs: Institutions "Supported countries" (production access US/CA by default, other countries by ticket); Changelog Oct 2022 (DK, EE, LV, LT, PL, NO, SE added; Italian Link language) | https://plaid.com/docs/api/institutions/ ; https://plaid.com/docs/changelog/ | live | high | indexed copy; full country list not shown in the retrieved excerpt |
| V3 | TrueLayer docs: provider search `CountryCode` enum (AT, BE, DE, DK, ES, FI, FR, GB, IE, IT, LT, NL, NO, PL, PT, RO); Supported Providers table in Console | https://docs.truelayer.com/docs/get-information-about-banking-providers ; https://docs.truelayer.com/docs/supported-providers-table | live | high | enum is from the payments API; Data-product coverage per bank lives in the Console table |
| V4 | Plaid docs: Transactions data (pending→posted reconciliation, `pending_transaction_id`, `TRANSACTIONS_REMOVED` webhook) and `/transactions/refresh` | https://plaid.com/docs/transactions/transactions-data/ ; https://plaid.com/docs/api/products/transactions/ | live | high | indexed copy |
| V5 | Reviewer prior knowledge (model knowledge up to mid-2026) | n/a | n/a | medium at best | not a source; used only to flag likely errors, every V5-based statement must be re-verified against a primary page |

Sources added by the second adversarial pass (36 WebSearch refutation queries, 2026-10-02; search-engine snippets only, pages not opened because WebFetch is blocked):

| ID | Source | URL | Pub. date | Reliability | Doubts |
|---|---|---|---|---|---|
| W1 | YNAB What's New: Direct Import in the UK and EU (TrueLayer named as Direct Import partner) | https://www.ynab.com/whats-new/direct-import-in-the-uk-and-eu | undated (c. 2020) | high | snippet only |
| W2 | YNAB What's New: More Banks: Europe Edition (Plaid added as European Direct Import provider; YNAB is an agent of Plaid Financial Ltd, FCA-authorised) | https://www.ynab.com/whats-new/more-banks-europe-edition | 2025-02-05 | high | |
| W3 | Plaid customer story: How YNAB increased UK conversion by 21% with Plaid (YNAB switched from its previous European provider; 18 European countries incl. Italy; +21% UK and +12% EU conversion, -62% daily errors) | https://plaid.com/en-gb/customer-stories/ynab/ | 2025 | high (vendor) | metrics are Plaid marketing |
| W4 | Hacker News: Tell HN: YNAB will partly remove direct bank imports (EU banks moved by TrueLayer to private beta; no discounts) | https://news.ycombinator.com/item?id=39773819 | 2024-03 | low-medium | forum; quotes an in-app message |
| W5 | 2026 YNAB pricing pages: thepricer.org; planandmultiply; costbench (S192); getfinny; sheetlink; envelopebudgeting — all $14.99/mo, $109/yr, 34-day trial; $109 effective 2024-08-01 (new) / 2024-09-01 (renewals) | https://www.thepricer.org/how-much-does-ynab-cost/ ; https://www.planandmultiply.com/en/blog/ynab-pricing-2026-plans-features-alternatives | 2026 | low each, mutually consistent | SEO/affiliate |
| W6 | Trustpilot: YNAB (3,103 reviews, 4.6 stars, TrustScore 4.5) | https://www.trustpilot.com/review/ynab.com | live | medium | |
| W7 | Monarch Plus launch release as carried by Morningstar/PR Newswire, TipRanks and Fioney ("$299 per year for new members"; "$100 off their first year" for existing members; free Trust & Will will "a $299 value") | https://www.morningstar.com/news/pr-newswire/20260421la39327/monarch-launches-premium-tier-monarch-plus ; https://www.tipranks.com/news/private-companies/monarch-debuts-high-priced-monarch-plus-tier-targeting-advanced-personal-and-business-finance-planning ; https://fioney.com/budgeting-app-monarch-introduces-monarch-plus-product-tier/ | 2026-04-21 | high | same release as S20 |
| W8 | Monarch help: Monarch Plus Tier (annual billing; $100 off for existing members; price deferred to pricing page) | https://help.monarch.com/hc/en-us/articles/48349699981972-Monarch-Plus-Tier | 2026 | high | price not in snippet |
| W9 | Monarch help: Updating Your Subscription (Plus discount only for members billed directly by Monarch, not App Store / Google Play) | https://help.monarch.com/hc/en-us/articles/44815447567636-Updating-Your-Subscription | 2026 | high | |
| W10 | 2026 pages quoting Monarch Plus at $199/yr: getfinny Core vs Plus; envelopebudgeting; fincomparelab; NerdWallet "I used Monarch for 30 days" | https://getfinny.app/blog/monarch-money-core-vs-plus-2026 ; https://www.nerdwallet.com/finance/learn/monarch-money-app-review | 2026 | low (SEO) / medium (NerdWallet) | conflicts with W7 |
| W11 | PR Newswire via Morningstar: Monarch named to the 2026 Fast Company Most Innovative Companies list as it surpasses 1 million members (+100% YoY; also Forbes Fintech 50 2026) | https://www.morningstar.com/news/pr-newswire/20260324la17966/monarch-named-to-the-2026-fast-company-most-innovative-companies-list-as-it-surpasses-1-million-members | 2026-03-24 | high | company release |
| W12 | Axios Pro: Personal finance startup Monarch buys HMBradley, hits $100M ARR; PR Newswire release; Monarch blog "Welcoming MBI" (Monarch Labs under Zach Bruhnke) | https://www.axios.com/pro/fintech-deals/2026/10/01/personal-finance-monarch-hmbradley-100-million-arr ; https://www.prnewswire.com/news-releases/monarch-hits-100m-in-arr-acquires-mbi-to-accelerate-next-phase-of-growth-302896004.html ; https://www.monarch.com/blog/welcoming-MBI | 2026-10-01 | high | terms undisclosed |
| W13 | CNBC: Personal finance app Monarch raises $75 million despite "nuclear winter" for fintech startups ($850M post-money; FPV + Forerunner; 20x paid-subscriber growth since Mint closed) | https://www.cnbc.com/2025/05/23/personal-finance-app-monarch-raises-75-million.html | 2025-05-23 | high | |
| W14 | Trustpilot: Monarch (page under the new monarch.com domain) | https://www.trustpilot.com/review/monarch.com | live | medium | count and score not retrieved |
| W15 | Copilot has no Android app (2026): Penny Hoarder review; ReceiptSync "Copilot Money has no Android app"; walletgrower review | https://www.thepennyhoarder.com/budgeting/budgeting-copilot-money-review/ ; https://receiptsync.net/blog/copilot-money-android-alternative ; https://walletgrower.com/blog/copilot-money-review-2026 | 2026 | medium-low / low | second and third are competitor SEO |
| W16 | The College Investor: Copilot Money review 2026 ($13/mo, $95/yr, 1-month trial, card up front) | https://thecollegeinvestor.com/41976/copilot-review/ | 2026 | medium-low | affiliate |
| W17 | Canadian competitor pages on Copilot in Canada (partial Plaid coverage, USD billing): Finnomia; Modufi | https://finnomia.ca/copilot-money-alternative ; https://modufi.ca/blog/best-budgeting-apps-canada | 2026 | low | competitor SEO; contradicts S59 |
| W18 | Rocket Money: What is Rowan (vendor; Premium+ $15/mo); Rob Berger Rocket Money review; planandmultiply Rocket Money cost 2026 (Premium $7-$14 slider) | https://www.rocketmoney.com/learn/personal-finance/what-is-rowan ; https://robberger.com/rocket-money-review/ ; https://www.planandmultiply.com/en/blog/rocket-money-budget-app-review-alternatives-2026 | 2026 | high (vendor) / medium-low | |
| W19 | Nasdaq (PR Newswire): Rocket Money's Rowan Rewrites What AI Can Do in Personal Finance; FinTech Global; Dealroom; Coverager | https://www.nasdaq.com/press-release/rocket-moneys-rowan-rewrites-what-ai-can-do-personal-finance-2026-08-25 ; https://fintech.global/2026/09/03/rocket-money-launches-ai-agent-to-manage-finances/ ; https://app.dealroom.co/news/feed/rocket-money-launches-rowan-ai-agent-that-monitors-spending-and-cancels-subscriptions-via-text | 2026-08-25 / 2026-09-03 | high / medium | |
| W20 | SEC EDGAR: Rocket Companies Form 10-Q for the quarter ended 2026-06-30 (Rocket Money revenue +$20M in Q1 2026 and +$42M in H1 2026 "associated with growth in paying subscribers") | https://www.sec.gov/Archives/edgar/data/0001805284/000162828026054577/rkt-20260630.htm | 2026-08 | high | no subscriber counts disclosed |
| W21 | Simplifi renewal pricing: fincomparelab Simplifi pricing guide (quicken.com observed 2026-09-15: "$3.49/mo first year, then $6.99/mo billed annually"); getfinny; spendalyst; walletgrower; Quicken Simplifi product page | https://www.fincomparelab.com/guides/simplifi-pricing/ ; https://getfinny.app/blog/quicken-simplifi-pricing-2026 ; https://www.quicken.com/products/simplifi/ | 2026 | low each, mutually consistent; vendor page high | vendor page seen as snippet only |
| W22 | Simplifi support: Subscription Questions ("anywhere in the U.S. and Canada"); What Currencies Does Simplifi Support (USD and CAD only); Quicken community thread on Simplifi "not working in Canada" | https://support.simplifi.quicken.com/en/articles/3363727-quicken-simplifi-subscription-questions ; https://support.simplifi.quicken.com/en/articles/3828353-what-currencies-does-quicken-simplifi-support ; https://community.quicken.com/discussion/7945211/quicken-budget-money-planner-aka-simplifi-sold-but-not-working-in-canada | n/a | high / medium (forum) | |
| W23 | Simplifi community, product team: New Feature Alert: Quicken Assist Chat! (60% of Early Access Basic subscribers, web and mobile) | https://community.simplifimoney.com/discussion/15724/new-feature-alert-quicken-assist-chat | 2026-02-12 | high | official product post |
| W24 | Quicken blog: What Is Quicken Assist (same page as S90; publication date established) | https://www.quicken.com/blog/what-is-quicken-ai-the-new-ai-chat-in-quicken-simplifi/ | 2026-08-04 | high | vendor |
| W25 | Simplifi support: What You Can Do with Quicken Assist Chat in Simplifi ("never takes action without your review and approval") | https://support.simplifi.quicken.com/en/articles/13929605-what-you-can-do-with-quicken-assist-chat-in-simplifi | 2026 | high | |
| W26 | Empower fee schedule and $100k minimum: The College Investor; BestRoboAdvisors; Rob Berger (S117) | https://thecollegeinvestor.com/4757/empower-review/ ; https://www.bestroboadvisors.org/empower-review/ | 2026 | medium-low | affiliate sites |
| W27 | PocketGuard pricing and free-plan removal: Clark.com; FinanceBuzz; Ramsey Solutions; Penny Hoarder (S131); getfinny; sheetlink (S134); checkthat (S133) — all: no free plan, 7-day trial, Plus $12.99/mo, $74.99/yr, lifetime $149.99; 2023 prices $7.99/mo, $34.99/yr | https://clark.com/personal-finance-credit/budgeting-saving/pocketguard/ ; https://financebuzz.com/pocketguard-review ; https://www.ramseysolutions.com/budgeting/pocketguard-budgeting-app-review ; https://getfinny.app/blog/pocketguard-pricing-2026 | 2026 | medium / medium-low / low | Ramsey is a competitor (EveryDollar) |
| W28 | Engadget: Intuit is shutting down Mint; Wikipedia: Intuit Mint (3.6M active users per Bloomberg, 2021; shutdown moved from 2024-01-01 to 2024-03-23) | https://www.engadget.com/intuit-is-closing-down-mint-its-popular-free-budget-tracking-app-054145229.html ; https://en.wikipedia.org/wiki/Intuit_Mint | 2023-11 / live | medium | |
| W29 | American Banker: OpenAI launches personal finance tools for ChatGPT Pro users; TheNextWeb analysis (Plaid, 12,000+ institutions; Hiro acquisition April 2026; web + iOS at launch) | https://www.americanbanker.com/news/openai-launches-personal-finance-tools-for-chatgpt-pro-users ; https://thenextweb.com/news/openai-chatgpt-personal-finance-plaid | 2026-05 | medium | |
| W30 | 9to5Mac: OpenAI's personal finance features for ChatGPT expand to more customers (Plus, Android, US only); Dataconomy: ChatGPT Plus users can now connect financial accounts | https://9to5mac.com/2026/06/30/openai-just-released-new-personal-finance-features-for-chatgpt-customers/ ; https://dataconomy.com/2026/07/01/openai-chatgpt-personal-finance-tools-us/ | 2026-06-30 / 2026-07-01 | medium | |
| W31 | Yahoo Finance (PR Newswire): Cleo Launches Autopilot; Cleo Autopilot product page; founder's launch post | https://finance.yahoo.com/news/cleo-launches-autopilot-automating-money-140000197.html ; https://web.meetcleo.com/autopilot | 2026-02-05 | high | vendor |
| W32 | Fortune (exclusive): AI-powered benefits platform Origin raises $30 million; BusinessWire release (Series A+, Notion Capital lead, total >$50M); Tech.eu — **this is Origin the UK benefits platform (founders Chris Bruce, Pete Craghill), not Origin Financial** | https://fortune.com/2026/03/25/exclusive-ai-powered-benefits-platform-origin-raises-30-million-in-fresh-funding-to-bring-chros-visibility-into-benefits-usage-and-spend/ ; https://www.businesswire.com/news/home/20260326028470/en/ ; https://tech.eu/2026/03/25/origin-raises-30m-series-a-to-improve-global-benefits-efficiency/ | 2026-03-25/26 | high | |
| W33 | Origin Financial (useorigin.com, Matt Watson) funding: FinTech Futures ($56M Series B at $400M, 2021); Tracxn; Crunchbase; Getlatka (ARR estimate $16.7M for 2025) | https://www.fintechfutures.com/venture-capital-funding/financial-wellness-platform-origin-raises-56m-funding-at-400m-valuation ; https://tracxn.com/d/companies/origin/__6O3brG-g1OpInmLiIw_2zZmcKup5vclpVeWbcDtD5QU ; https://www.crunchbase.com/organization/origin-cf50 ; https://getlatka.com/companies/useorigin.com | 2021 / live | medium / low | ARR estimate unverified |

---

## Verification notes (adversarial pass)

Two passes were run on 2026-10-02. Pass 1 had no web access and is kept below for the record; **where pass 2 contradicts pass 1, pass 2 wins** (pass 1 rows #2, #8, #9 and #13 are superseded or refined by pass 2 rows #2, #7, #8 and #13).

### Pass 1 (no web access; API docs via Context7 and reviewer prior knowledge)

**Date:** 2026-10-02. **Method and limits:** the brief asked for fresh WebSearch refutation queries. This session's WebSearch budget was already exhausted (200/200) before the pass began, WebFetch is blocked, and every vendor, news, Wikipedia, DuckDuckGo and web-archive host tested is denied by the egress proxy (HTTP 403 on CONNECT); GitHub search endpoints and YouTube search (vidIQ, no credits) were also unavailable. The pass therefore relied on three weaker channels: (1) primary API documentation retrievable through the Context7 docs index (YNAB API, Plaid, TrueLayer: V1-V4); (2) internal-consistency checks within this document and against the sibling research docs (which cite this document as D-US/R-US, so they are not independent evidence); (3) the reviewer's own prior knowledge up to mid-2026 (V5), used only to flag likely errors and always labelled. "Confirmed" below means "consistent with a primary doc retrieved this session or with reviewer prior knowledge from before mid-2026"; it is weaker than a live read of the vendor page, so every price and date below must still be re-read on the primary page before it is used in a decision. Sixteen claims were selected for consequence (pricing anchors, aggregator and coverage, user counts, shutdown facts, AI launch dates, platform availability) and likelihood of being stale or wrong.

| # | Claim (section) | Verdict | Evidence and reasoning | Change made |
|---|---|---|---|---|
| 1 | YNAB $14.99/mo, $109/yr, 34-day trial, free student year (0, 2.1, 4.4) | Confirmed (current price); **corrected** (history) | Current prices and trial match reviewer prior knowledge (V5) and S13/S191. The history line implied the $14.99 monthly price arrived with the 2024 increase; it dates from the Nov 2021 increase ($98.99/yr, $14.99/mo), and 2024 raised only the annual price to $109. Exact 2024 effective dates remain single-source. | 2.1 Pricing and 4.4 YNAB row rewritten; 2024 dates kept at A (low) |
| 2 | YNAB European Direct Import runs "via Plaid in 18 EU markets" (0, 2.1) | **Corrected**: downgraded to UNKNOWN | Single low-reliability source (S14). Plaid (V2) does cover a European footprint that includes Italy, but production access outside US/CA requires a Plaid ticket; TrueLayer (V3) lists IT among its countries, appears on YNAB's status page (S9) and was YNAB's UK partner from 2020 (V5). Coverage alone cannot identify the provider. | 0 table and 2.1 Bank connection downgraded; V2/V3 added |
| 3 | YNAB public API with stable import IDs used for de-duplication (2.1, 5.5) | Confirmed | V1 shows `import_id` on transactions, `duplicate_import_ids` in create/update responses, milliunit amounts with ISO dates, and endpoints now under `/plans/{plan_id}`. | Evidence added to 2.1 Import/export |
| 4 | Monarch Core $14.99/mo or $99.99/yr; 7-day trial; US and Canada only, USD/CAD (0, 2.2) | Confirmed | Consistent with V5 and with official S20/S33. | None |
| 5 | Monarch Plus $199/yr, annual-only, launched 2026-04-21 (0, 2.2, 4.4) | Unverifiable | Only basis is the PR Newswire release (S20, high); it post-dates reviewer knowledge and no live access was possible. Not refuted. | None; added to §7 |
| 6 | Monarch $75M Series B, May 2025, $850M post-money, led by Forerunner and FPV; "20x paid subscriber surge" post-Mint; 1M members in 2026 (0, 1, 2.2) | Confirmed (Series B); unverifiable (1M members) | Series B terms and lead investors match May 2025 coverage (V5). The 1M-member figure rests on S36 (PR Newswire, 2026) and could not be re-checked. | None |
| 7 | Copilot $13/mo or $95/yr, 1-month trial; $6M Series A Mar 2024 led by Adjacent (0, 2.3) | Confirmed | Consistent with V5 and S50 (TechCrunch 2024-03-21). | None |
| 8 | Copilot has no Android app (0, 2.3, 6.6) | **Corrected**: downgraded FACT → ASSUMPTION | An absence proven only by not finding a listing; Android has been on Copilot's public roadmap since 2024 (S50) and the status could not be re-checked. No evidence an Android app exists either. | 0 table and 2.3 Mobile downgraded to A (medium); §7 row added |
| 9 | Rocket Money Premium slider $7-$14/mo; Premium+ $15/mo with Rowan; Rowan launched 2026-08-25 on Anthropic models (0, 2.4, 3, 4.4) | Unverifiable (Rowan, Premium+); slider **flagged** | V5 (to mid-2026) has the Premium slider at $6-$12, so S71's $7-$14 is plausibly a 2026 change but cannot be confirmed. Rowan and Premium+ rest on the official press release (S70) and trade press (S80/S81); not refuted. | 2.4 Pricing: slider downgraded to F (medium) with verify note |
| 10 | Simplifi $3.99/mo promo billed $47.88/yr; renewal $5.99 vs $6.99 (conflict); not Plaid-first (2.5, 4.4) | Unverifiable | Conflict already recorded. V5: list price $5.99/mo billed annually ($71.88) with $2.99-$3.99 promos through 2025; $6.99 unconfirmed. Aggregator claim rests on official S93/S99 and is internally consistent. | None |
| 11 | Empower: Yodlee FastLink aggregation; free dashboard; advisory fee from 0.89% AUM (0, 2.6) | Confirmed | Consistent with V5 (Personal Capital has used Yodlee; 0.89% on the first $1M, tiered down). | None |
| 12 | PocketGuard Plus $12.99/mo or $74.99/yr; lifetime withdrawn Feb 2024; free plan possibly removed in 2026 (0, 2.7, 4.4) | Unverifiable | Both sources are low-reliability SEO sites. V5: $12.99/mo, $74.99/yr and a $99.99 lifetime existed through 2023-24. Free-plan status is the decision-relevant item and remains CONFLICT. | None; already in §7 |
| 13 | Mint: announced 2023-11-01, closed 2024-03-23, 20-25M users (1) | Confirmed (dates); **corrected** (scale nuance) | Dates match V5 (shutdown first set for 2024-01-01, then extended to 2024-03-23). "25M" is a cumulative registered-user count; Intuit cited roughly 3.6M monthly active users in 2021 (V5). | 1 Scale row rewritten with MAU caveat |
| 14 | AI launch dates: Copilot Intelligence 2023-09-05; Monarch AI assistant 2023-06-13; ChatGPT personal finance 2026-05-15 (Plus rollout June); Cleo Autopilot 2026-02-05; Quicken Assist Aug 2026 (3) | Confirmed (2023 items); unverifiable (2026 items) | 2023 items consistent with V5. 2026 items rest on official or high-reliability sources (S170-S173, S90/S91) and post-date reviewer knowledge; the June Plus expansion stays A (low, S183). | None; added to §7 |
| 15 | Monarch Trustpilot 2.0/5 from 33 reviews (2.2, 4.5) | **Corrected**: count downgraded to A (low) | The cited page is for the old domain monarchmoney.com; Monarch rebranded to monarch.com in 2025 (V5), so a second page is likely and 33 is not a defensible total. | Caveats added in 2.2 and 4.5; §7 row added |
| 16 | "No incumbent exposes a robust pending→posted reconciliation" and the clear-cache anti-pattern (4.1, 6.7) | Confirmed and **strengthened** | V4: Plaid links posted to pending via `pending_transaction_id`, removes the pending record and fires `TRANSACTIONS_REMOVED`; unlinked posted records occur only "in rare instances". The observed Copilot/Monarch failures are therefore app-side. | Paragraph added to 4.1 |

**Net effect:** 16 claims checked; 6 corrected or downgraded (#1 history, #2, #8, #9 slider, #13 scale, #15); 1 strengthened with new primary evidence (#16); 7 confirmed against primary docs or reviewer prior knowledge (#3, #4, #6, #7, #11 and the dated parts of #1, #13, #14); 5 left as unverifiable because they post-date the reviewer's knowledge or rest only on low-reliability sources (#5, #9 Rowan/Premium+, #10, #12, #14 2026 items). No claim was refuted outright by primary evidence. Nothing was deleted. The pricing anchor used elsewhere in the project ($95-$109/yr for a full US PFM) survives the pass.

### Pass 2 (live WebSearch, 36 refutation queries, 2026-10-02)

**Method and limits:** each claim below was attacked with one to three WebSearch queries phrased to find a contradicting price, date, provider or status; WebFetch remained blocked, so evidence is search-engine snippets (titles, URLs, AI-summarised extracts) rather than full pages, and the session's search budget ran out after the 36th query (the last planned query, the Monarch Trustpilot count on the new domain, was not executed). "Confirmed" means at least one primary or reputable-secondary snippet agrees and no snippet disagrees; "corrected" means the document was changed; "refuted" means the claim was shown to be false. Selection criteria: consequence for Lilleri's pricing, aggregator, market-sizing and positioning decisions, and likelihood of staleness (prices, launch dates, funding, platform availability, free-tier status, Italy/EU coverage).

| # | Claim (section) | Verdict | Evidence and reasoning | Change made |
|---|---|---|---|---|
| 1 | YNAB $14.99/mo, $109/yr, 34-day trial, free student year; $109 effective 2024-08-01 (new) / 2024-09-01 (renewals) (0, 2.1, 4.4) | Confirmed | Six independent 2026 pricing pages (W5) plus the forum thread S11 agree; no source quotes a different current price. | 2024 dates upgraded A (low) → F (medium) |
| 2 | YNAB European Direct Import provider: original draft "Plaid in 18 EU markets" on one blog; pass 1 downgraded to UNKNOWN (0, 2.1, §7) | **Corrected — pass 1 reversed** | YNAB's own "More Banks: Europe Edition" (W2, 2025-02-05) adds Plaid for Europe with YNAB as agent of Plaid Financial Ltd; Plaid's customer story (W3) says YNAB switched from its previous European provider and lists 18 countries incl. Italy; W1 names TrueLayer as the earlier partner; the HN thread (W4) documents the March 2024 withdrawal of TrueLayer private-beta banks. | 0 table, 2.1 Markets / Bank connection / News rewritten to FACT (high); §7 row updated |
| 3 | YNAB Trustpilot: 431 vs ~2,900 reviews (2.1, 4.5, §7) | **Corrected** | Trustpilot page (W6): 3,103 reviews, 4.6 stars, TrustScore 4.5. | 2.1 Ratings and 4.5 rewritten; §7 row resolved |
| 4 | Monarch Core $14.99/$99.99, 7-day trial, US/CA; $75M Series B May 2025 at $850M; 1M members early 2026 (0, 1, 2.2) | Confirmed; **new facts added** | CNBC 2025-05-23 (W13) confirms the Series B terms and the 20x post-Mint claim; PR Newswire 2026-03-24 (W11) confirms 1M active members (+100% YoY), Fast Company and Forbes Fintech 50; Axios / PR Newswire 2026-10-01 (W12): $100M ARR and first acquisition (MBI, ex-HMBradley, "Monarch Labs"). | 0 table, 1 Winners, 2.2 News updated |
| 5 | Monarch Plus $199/yr, annual-only, launched 2026-04-21, cited to S20 (0, 2.2, 4.4) | **Corrected → CONFLICT** | The launch release itself (S20 as carried by Morningstar, TipRanks, Fioney: W7) says $299/yr for new members and $100 off the first year for existing members; Monarch help (W8, W9) confirms annual billing and the discount mechanics; 2026 review/SEO pages (W10) say $199/yr. The draft's $199 was not what S20 says. | 0 table, 2.2 Pricing, 4.4 rewritten with both figures; §7 row added; 4.4 pattern changed to "~2-3x" |
| 6 | Monarch Trustpilot 2.0 on 33 reviews is Monarch's total (2.2, 4.5) | Unverifiable; pass-1 suspicion confirmed | A second page, trustpilot.com/review/monarch.com, exists (W14); its score and count could not be read before the search budget ran out. | Caveat tightened in 2.2 |
| 7 | Copilot $13/mo, $95/yr, 1-month trial; no Android; Canada contested (0, 2.3) | Confirmed (price, Android); unverifiable (Canada) | Price: W16, S63. Android: three 2026 reviews independently state no Android app and that the Dec 2025 web app is the only route (W15), so pass 1's downgrade is reversed. Canada: help centre still US-only with a country leaderboard (S59) vs Canadian competitor sites claiming partial Plaid coverage in USD (W17). | 2.3 Mobile restored to F (medium); 0 table and 2.3 Markets sources added |
| 8 | Rocket Money Premium $7-$14 slider, Premium+ $15/mo, Rowan launched 2026-08-25 on Anthropic models (0, 2.4, 3, 4.4) | Confirmed | Vendor pricing explainer and "What is Rowan" page (S71, W18); Nasdaq/PR Newswire release dated 2026-08-25, FinTech Global, Dealroom (W19); Rocket Companies 10-Q (W20) shows Rocket Money revenue +$42M in H1 2026 from paying-subscriber growth. Pass 1's "slider may still be $6-$12" flag was stale and is withdrawn. | 2.4 Pricing upgraded to F (high); Strengths row gains the SEC figure |
| 9 | Simplifi $3.99 promo; renewal $5.99 vs $6.99 (CONFLICT); Canada UNKNOWN (0, 2.5, 4.4) | **Corrected (both)** | Renewal: four 2026 pricing pages and a direct observation of quicken.com wording agree on $6.99/mo billed annually ($83.88/yr); a $3.49 promo was live in Sep 2026 (W21). Canada: official support says US and Canada, USD/CAD only (W22). | 0 table, 2.5 Markets / Pricing, 4.4 rewritten; §7 row resolved |
| 10 | Quicken Assist AI chat "beta Aug 2026" / "summer 2026" (0, 2.5, 3) | **Corrected (date)** | Simplifi product-team post "New Feature Alert: Quicken Assist Chat!" is dated 2026-02-12 (60% of Early Access Basic subscribers, W23); the Quicken blog post S90 was published 2026-08-04 (W24). The feature predates the blog post by six months. | 0 table, 2.5 Learns / News, 3 rewritten |
| 11 | Empower free dashboard, Yodlee, advisory from 0.89% AUM (0, 2.6) | Confirmed; detail added | W26: $100k minimum for wealth management, 0.89% on $100k-$999,999, tiers 0.79/0.69/0.59/0.49% above $1M. | 2.6 Pricing expanded |
| 12 | PocketGuard free plan possibly removed (CONFLICT, low); lifetime withdrawn Feb 2024; Plus $12.99/$74.99 (0, 2.7, 4.4) | **Corrected (conflict resolved)** | Clark.com, FinanceBuzz, Ramsey, Penny Hoarder and three SEO pages (W27) all state: no free plan, 7-day trial only, Plus $12.99/mo or $74.99/yr, lifetime $149.99 on sale. The "lifetime withdrawn" item is stale. | 0 table, 2.7 Pricing / News, 4.4, 6.4 updated to F (medium) |
| 13 | Mint announced 2023-11-01, closed 2024-03-23; ~3.6M active users (2021) on reviewer prior knowledge (1) | Confirmed; source upgraded | Engadget and Wikipedia (W28) cite Bloomberg's 3.6M (2021) and the extension of the shutdown from 2024-01-01 to 2024-03-23. | 1 Scale row: V5 replaced by W28, F (medium) |
| 14 | ChatGPT personal finance 2026-05-15 (Pro, US); Plus + Android by 2026-06-25 on a low-reliability blog (3) | Confirmed; June item **upgraded** | TechCrunch / American Banker (S170, W29) for the May preview (web + iOS, Plaid 12,000+ institutions, Hiro acquisition April 2026); 9to5Mac 2026-06-30 and Dataconomy 2026-07-01 (W30) for the Plus/Android expansion, US only. | 3 row rewritten to F (medium) for the June item; §7 row resolved |
| 15 | Cleo Autopilot launched 2026-02-05 (3) | Confirmed | PR Newswire via Yahoo Finance, Cleo's Autopilot page and the founder's launch post (W31). | Source added, launch capabilities detailed |
| 16 | Origin "$30M raised Mar 2026 aimed at employer/benefits visibility" (2.8) | **Refuted** | The $30M Series A+ of 2026-03-25 belongs to Origin, a UK benefits-management platform (Notion Capital lead; founders Chris Bruce and Pete Craghill, ex-Darwin/Mercer) per Fortune, BusinessWire and Tech.eu (W32). Origin Financial (useorigin.com) last raised a $56M Series B in 2021 at $400M; no 2025-2026 round found (W33). The S145 LinkedIn snippet almost certainly belonged to the other company. | 2.8 News rewritten; §7 row added |

**Net effect of pass 2:** 16 claims checked; **7 corrected** (#2 pass-1 reversal, #3, #5, #9, #10, #12, #16 refuted); 8 confirmed (#1, #4, #7 price/Android, #8, #11, #13, #14, #15), four of them with grade upgrades or new facts (#1 dates, #4 $100M ARR and MBI acquisition, #13 source, #14 June rollout); 1 unverifiable (#6, plus the Canada half of #7). Nothing was deleted. Decision-relevant consequences: (a) **YNAB already runs Plaid in Italy**, so "Plaid coverage in Italy" is a proven path for a US-style PFM, and YNAB's reported 21%/12% conversion uplift after switching providers is a useful benchmark for how much aggregator quality moves onboarding; (b) the US pricing anchor ($95-$109/yr for a full PFM) survives, but the premium-tier multiple should be stated as 2-3x, not 2x, until Monarch Plus's live price is read; (c) freemium retreat is now evidence-backed (PocketGuard), while Monarch's $100M ARR and move into money-movement automation (MBI) shows where the paid leaders are heading; (d) the Origin funding item should not be used as evidence of investor appetite for consumer AI PFMs.

End of document.
