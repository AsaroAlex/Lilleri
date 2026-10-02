# Market analysis: does a third-party PFM deserve to exist in Italy in 2026?

**Project:** LILLERI (greenfield consumer PFM, Italy-first then Europe)
**Date / verification date for every claim:** 2026-10-02
**Author:** Product Manager (consumer fintech) + growth lead + UX researcher, founding team
**Status of this document:** synthesis of Phase 0 research; input to Gate A (market opportunity) and to `product/` and `business/`. **Revised 2026-10-02 after a red-team review** (see "Review log" at the end): Gate A is re-labelled **NOT YET ASSESSABLE** (§9), the free-tier economics are computed (§3.3) and pricing now defers to `docs/business/business-model.md`, the competitor set is widened to Italian independents and bank-native aggregators, and several FACT labels are downgraded or corrected.

## How to read this document

- Every variable claim is labelled **FACT** (supported by a cited source seen on the verification date), **ASSUMPTION** (working value, not verified), **HYPOTHESIS** (our interpretation, to be validated), **DECISION** (a choice we propose, to be recorded in an ADR), **OPEN QUESTION / UNKNOWN** (not found; how to verify is stated).
- Evidence base: the five raw research notes in `docs/research/raw/` — `competitors-us.md` (cited as **US-**), `competitors-eu-uk.md` (**EU-**), `competitors-italy-and-ai-first.md` (**IT-**), `user-pain-points.md` (**PP-**), `brand-competitor-analysis.md` (**BR-**) — plus ten WebSearch queries run on 2026-10-02 to close the Italian market-sizing gap (cited as **NEW-**). Source IDs are resolved in the Sources table at the end; the raw notes hold the full source tables (hundreds of URLs) and their adversarial-verification logs.
- Research-environment caveat carried over from the raw notes: WebFetch was blocked for every vendor, press and regulator domain, so almost everything rests on search-engine snippets of the cited pages, not full page reads. Every price, user count and date must be re-read on the primary page before it enters a contract, a pricing page or a business plan.
- Estimates are never presented as facts. Where we size anything we show the arithmetic and label it HYPOTHESIS.
- **Grading rules added in the revision pass.** (1) A GitHub-hosted capture of a third-party page or a news digest (`IT-V-02/W-02`, `IT-V-05/W-01`, `IT-V-11`, `IT-W-04`, `IT-W-08`) is graded **low** until the primary page is re-read; where the revision re-sourced an event to a primary or national-press page (NEW-11…NEW-13) the new source is cited instead. (2) Pain-point counts (N) measure *breadth of independent support*, dominated by self-hosters on Actual Budget / Firefly III; a FACT label on a failure mode means "it exists and is documented", **not** "Italian mass-market users meet it often" — Italian frequency is UNKNOWN until the 500-review coding and the 20–30 interviews (§9 checklist). (3) "Absence in sources" is never a FACT about a competitor's product; it is UNKNOWN until the product is installed and tested. (4) Pricing, free-tier shape, unit economics and CAC are owned by `docs/business/` (`business-model.md`, `pricing-analysis.md`, `unit-economics.md`, `go-to-market.md`); this document quotes them and does not restate a different policy.
- Sources added in the revision pass: the WebSearch queries cited as **NEW-11…NEW-20** (2026-10-02, snippets) and the `WS-` sources of `user-pain-points.md` (same date), resolved in §12.

---

## 1. Executive summary (decision-relevant)

1. **Italy has no bank-independent personal-finance aggregator at scale.** The only Italian-born one with reach, Oval Money, closed in 2023; the apps Italian finance creators recommend are foreign Salt Edge-based trackers (Wallet by BudgetBakers, Spendee, MoneyWiz, Money Pro, Toshl) whose Italian store reviews are dominated by bank-linking failures. FACT for the closures and the creator stack (IT-§1, IT-§2.1, EU-§7, PP-G I-2, I-9); HYPOTHESIS for "no counter-example exists" (none surfaced in any channel).
2. **The underlying population is large and multi-banked.** 48.1 million current accounts at end-2024 (FACT, NEW-1), more than 67 million payment cards at end-2023 plus 30 million Postepay cards of which more than 10 million Evolution cards with an IBAN (FACT, NEW-2, NEW-5), Revolut above 5 million Italian customers in May 2026 (FACT, NEW-6), Satispay at 6.5 million users (FACT, IT-W-02/W-03). The target user holds 3–5 institutions and reconciles them by hand at month-end (FACT, low-medium, IT-Y-02/Y-03).
3. **"See all your accounts in one place" is table stakes, not a differentiator.** Intesa Sanpaolo's XME Banks has aggregated other banks' accounts and cards since 2020, free, and its launch copy promises spending categories and an aggregated view of income and expenses across linked accounts (FACT, medium, NEW-7); Hype advertises cross-bank aggregation on its paid plans (FACT, low-medium, IT-W-01). What nobody is documented to do is categorise external transactions *per user*, pair transfers and card settlements across institutions, or run a review flow (UNKNOWN for incumbents; HYPOTHESIS that they do not).
4. **The same five failure modes dominate every app in every market and nobody has solved them:** connections break and need re-authentication (22 independent sources), duplicates (16), transfers and card settlements not recognised (10; the single most up-voted feature request in the largest open-source PFM, 382 votes), consent expiry experienced as random breakage (11), categorisation that "never learns" (10). The best-rated US apps still ship "clear the cache" as the fix. FACT (PP-§A, US-§4.1).
5. **The market re-formed around paid subscriptions after Mint died (March 2024)** — Monarch reached $100M ARR and 1M members by 2026, YNAB holds $109/yr, Copilot $95/yr — while in Europe pure-subscription D2C apps without a second revenue rail or a parent have exited (Moneyhub, Spiir, Yolt, Grip, Oval Money) and the survivors monetise with subscriptions plus commissions, cashback or assets (Finanzguru >3M users and ~€40M 2025 revenue; Emma profitable; Plum profitable). FACT (US-§1, US-W12, EU-§1, EU-§5).
6. **The EU "Plus" price band moved up in 2025–26 to €3.99–€5.99 monthly / €30–€48 annual**, and Italians already pay €2.90–€9.99 a month for neobank and payment-app tiers (Hype, Satispay, N26, Revolut, Plum IT). FACT (EU-§8, IT-§2.3/2.4, PP-§F). Willingness to pay for a *PFM* in Italy specifically is UNKNOWN.
7. **AI moved from "chat over your data" (2023–25) to "agents that act" (2026: Rocket Money Rowan, Cleo Autopilot, Piere) and to platform bundling (ChatGPT personal finance with Plaid, US-only).** Per-user learning categorisation (Copilot) remains the capability users praise most; no vendor publishes a verifiable accuracy number. In Italy the only "AI budgeting" users actually practise is pasting a Revolut export into a temporary ChatGPT chat. FACT (US-§3, IT-§5.4); reading ASSUMPTION.
8. **Open-banking plumbing in Italy is mature but uneven:** CBI Globe processed more than 700 million API calls for 200+ third-party providers (FACT, NEW-8); CRIF measures a 57.4% account-connection success rate in H1 2025, up 8 points in a year (FACT, NEW-4); GoCardless Bank Account Data is closed to new accounts since July 2025 (FACT, PP-AD-01); Intesa Sanpaolo rate-limits unattended access and serves transactions in two-week windows (FACT, PP-§G I-5); UniCredit, Mediobanca and Crédit Agricole Italia expose no credit-card accounts over PSD2 (FACT, PP-§G I-8).
9. **Why Lilleri should exist — and it is not "because it uses AI":** the job "know what actually happens to my money across 3–5 institutions without doing the bookkeeping myself" is real, recurring, measurable in minutes per month, and unserved in Italy by banks (own ledger or balance-centric aggregation), by foreign trackers (sync breaks, no learning, no reconciliation) and by ChatGPT (export, paste, privacy workaround). The founding hypothesis "the financial tracker you don't have to manage / le tue finanze si organizzano da sole" is **validated with one amendment** from the pain-point evidence: automation is trusted only when it is visible and correctable, so the promise must read "si organizzano da sole — e tu vedi sempre perché". HYPOTHESIS (validated against FACT-level pain points; to be confirmed with users).
10. **Gate A verdict: PASS WITH CONDITIONS** (§9). The opportunity is clear on problem, population and structure; it is conditional on five things we do not yet know: connector quality for the top Italian banks, Italian willingness to pay for a PFM, the real depth of XME Banks/Hype aggregation, a credible second revenue rail, and a user test of the amended promise.

---

## 2. Market context by geography

| Region | Structure in 2026 | Dominant business models | 2024–26 signals | What it means for Lilleri | Status / sources |
|---|---|---|---|---|---|
| **Italy** | No at-scale independent PFM. Bank-native analytics (Intesa, UniCredit/Buddybank, Fineco "Money Map", Poste), neobanks (Revolut >5M IT customers, N26, Hype, Satispay 6.5M, bunq, Tinaba, isybank) and foreign Salt Edge trackers (Wallet, Spendee, MoneyWiz, Money Pro, Toshl) plus indie Fast Budget. Shared-expense apps (Splitwise, Tricount, Settle Up) are mainstream for couples and roommates. | Free bank apps; neobank subscription ladders (Hype €2.90/€9.90; Satispay €3.99/€9.99/€39.99; N26 €4.90/€9.90/€16.90; Revolut ~€4/€10/€16/€45); referral-bonus culture as the acquisition channel; Plum IT €3.99/€9.99. | Oval Money closed 2023; Yolt left; Postepay app folded into the Poste Italiane app 9 Oct 2025 (low-medium); Intesa XME Banks live since 2020; Hype sells cross-bank aggregation on paid plans and is being merged into Banca Sella (2026, low-medium); Revolut Italy data-disclosure incident Sep 2026 (680 clients cited in Parliament); Garante fined Poste €12.5M over its apps (Apr 2026); Decreto Accise makes app/wallet acceptance mandatory for merchants (Jun 2026); cash still >60% of POS transactions by number. | The slot "independent aggregator that reconciles across institutions" is empty; trust and portability are live themes; promo-driven acquisition must be budgeted; cash and prepaid semantics are first-class. | FACT (IT-§1, IT-§2, IT-§3, IT-W-04, IT-W-08, NEW-3, NEW-6, NEW-7); Hype merger and Postepay date low-medium |
| **Europe (DACH, FR, ES, NL, Nordics)** | Country-bound PFMs: Finanzguru and Outbank (DE), Bankin' and Linxo (FR), Fintonic (ES), Dyme (NL), Finanzfluss Copilot (DE, investor-first). None serve Italy. | Generous free core + Plus (€3.99–€5.99/mo) + commissions (Finanzguru ~70% of 2022 revenue from insurance/switching; Dyme switching; Bankin' cashback). Two French PFMs survive as captive subsidiaries (Bankin' owned by Groupe Casino since the 2022 split; Linxo 100% Crédit Agricole Payment Services since 2025). | Finanzguru >3M users, ~€40M revenue 2025, Toni Kroos campaign 2026, monthly price raised to €4.29 (Sep 2026, trackers disagree); Spiir (DK, ~1M users, Mastercard-owned) shut 8 Jun 2026; Grip (ABN AMRO) closed Dec 2022; Yolt (ING) closed 2021/2023; Fintonic restructured Apr 2025 and pivoted to credit, profitable Sep 2025; Spendee Premium doubled to $5.99. | Subscription-only D2C without a second rail or a parent has not survived in Europe; the proven European benchmark is Finanzguru's free core plus commission rail; the Plus anchor sits at €3.99–€5.99. | FACT (EU-§1, EU-§2, EU-§3.10–3.14, EU-§5, EU-§8) |
| **UK** | Open-banking PFMs with a 90-day re-consent model: Emma (>3M users, profitable, £5.7M revenue 2024), Snoop (Vanquis-owned; Plus £5.99), Plum (profitable Jan 2026, £34M ARR, £3.1bn AUM; in Italy since Jan 2023 with a 3.4/5 Italian rating), Cleo (relaunched Feb 2026 at £12.99 Pro; FTC $17M settlement Mar 2025 in the US). Moneyhub's consumer app closed 31 Jul 2026. | Freemium with login-count gating (Emma 2 free logins), cashback/affiliate, invest AUM, interest margin; switching commissions (Snoop); AUM (Plum); lending (Cleo). | Emma is explicitly UK/US/CA only and cannot connect EU banks; Snoop Plus +20% in 2026; Moneyhub (£1.49/mo, "we don't sell your data") exited D2C. | UK players are design and monetisation benchmarks, not Italian competitors; Plum is the one UK brand already in Italy and its Italian reviews are a warning about linking quality. | FACT (EU-§3.1–3.4, EU-§3.17, EU-S-63/S-64/S-65/S-66/S-67/S-70/S-76/S-83) |
| **US** | Category-defining paid apps: YNAB ($14.99/mo, $109/yr), Monarch (Core $99.99/yr; Plus $199–$299/yr, conflict; $100M ARR; 1M members; $850M valuation; acquired MBI Oct 2026), Copilot ($95/yr; per-user ML categoriser; Apple-first, no Android), Rocket Money (free tier; Premium $7–$14 slider; Premium+ $15 with the Rowan agent; 10-Q shows +$42M H1-2026 revenue from paying subscribers), Simplifi ($3.49–$3.99 promo then $6.99/mo), Empower (free, AUM upsell), PocketGuard (free tier removed 2026), Origin. | Paid subscription $95–$109/yr with a 2–3× premium tier; freemium only where a parent monetises elsewhere (Rocket, Empower, Credit Karma). | Mint (3.6M active users in 2021; 20–25M registered) closed 23 Mar 2024 and its users moved to paid apps (Monarch "20×" paid-subscriber growth); ChatGPT personal finance with Plaid launched May–Jun 2026 (US only); agentic assistants (Rowan, Cleo Autopilot, Piere). | The US proves users pay ~$100/yr for a PFM when it is the only way to see everything, and shows the next battleground (reconciliation quality, agents, household). None of these apps connects Italian banks except YNAB (Plaid since Feb 2025, bank-level quality UNKNOWN). | FACT (US-§0, US-§1, US-§3, US-§4.4, US-W5/W7/W12/W13/W15/W20/W27/W28) |

---

## 3. Market size signals for Italy

The raw research could not verify any Italian statistic (regulator and statistics sites were egress-blocked). The table below combines those placeholders with ten WebSearch queries run on 2026-10-02; where a figure is a search-engine summary of an official source it is labelled FACT with a medium grade, and the primary page to re-read is named.

### 3.1 Supply-side and demand-side counts

| Metric | Value | Status | Source (verified 2026-10-02) | Notes / how to verify |
|---|---|---|---|---|
| Population | ~58.9–59 million (2025) | ASSUMPTION | IT-§6 (ISTAT not fetched) | demo.istat.it |
| Internet users / smartphone penetration | ~50–51M internet users; smartphone ~80%+ of population | ASSUMPTION | IT-§6 | DataReportal "Digital 2025: Italy" |
| Adults / households with a bank or postal account | ~95–97% | ASSUMPTION (high confidence it is >95%) | IT-§6 (Global Findex 2021: 97% of adults) | Banca d'Italia IBF; World Bank Findex |
| **Current accounts (households + firms)** | **48,110,106 at end-2024**, +5.6M (+13.2%) vs 2019; North-West 18.29M, North-East 10.42M, Centre 9.99M, South 6.30M, Islands 3.11M; deposits €1,363.6bn | FACT (medium: FABI analysis of Banca d'Italia data, reported by Il Sole 24 Ore, FocusRisparmio and others, Jul 2025) | NEW-1 | Includes business accounts; the household-only count is UNKNOWN. Re-read on infostat.bancaditalia.it |
| **Payment cards in circulation** | **>67 million at end-2023** (vs 64.69M in 2022); **13.49M active credit cards** | FACT (medium: Banca d'Italia "Sistema dei pagamenti" as reported by Arena Digitale, May 2024) | NEW-2 | Debit vs prepaid split UNKNOWN (table TSPAG040 not read); 2024 figure not surfaced |
| **Postepay cards** | **30 million issued, of which >10 million Postepay Evolution** (with IBAN); 3.4bn Postepay transactions in 2025 (+12.2%) | FACT (medium: Poste Italiane's own channel, 11 Apr 2026) | NEW-5, IT-V-11 | Company-reported; Evolution share now FACT rather than the raw note's ASSUMPTION |
| **Cash at the point of sale** | **>60% of POS transactions by number in Italy** (euro area 52%, down from 59% in 2022); Italy among the highest-cash countries with Slovenia, Malta, Austria; cash share declining | FACT (medium-high: ECB SPACE 2024 and Banca d'Italia's report on the Italian results) | NEW-3 | Value share not captured (raw note's ~40% stays ASSUMPTION) |
| **Revolut customers in Italy** | **>5 million (28 May 2026)**, "almost 10%" market penetration, fifth bank in Italy by customers, Italy = Revolut's fifth market globally; >4M in an earlier 2025–26 report | FACT (medium-high: company announcement carried by Teleborsa, Milano Finanza, AziendaBanca, Arena Digitale) | NEW-6 | Resolves the raw note's UNKNOWN (IT-§3.1). Italian IBAN confirmed; branch launch date still UNKNOWN |
| Satispay | 6.5M users, 450k+ merchants, annualised revenue >€116M (31 May 2026), ≈€670M deposits, 500k+ investing users | FACT (medium: Satispay's own homepage/careers copy captured Jul–Sep 2026, press via IT-W-02) | IT-W-02, IT-W-03 | — |
| N26 | 8M+ customers in 11 countries incl. Italy; Italian count UNKNOWN | FACT (low-medium) / UNKNOWN | IT-W-04 | n26.com press |
| Hype, Buddybank, isybank, bunq (Italy) | Customer counts UNKNOWN (Hype background ~1.5–2M, ASSUMPTION) | UNKNOWN | IT-§2.3, IT-§2.6 | Company press rooms; Banca d'Italia IMEL register for Hype |
| Fintech/insurtech service users | 12.7M Italians (29% of the 18–74 population) used ≥1 fintech/insurtech service; 326 startups | FACT (low-medium; Osservatorio Fintech & Insurtech PoliMi press release, **undated in the snippet, likely 2019 → stale**) | NEW-10 | A later Osservatorio figure says 66% of Italians used at least one digital financial service in 2023 (low; summary only). Pull the 2025 report on osservatori.net |
| **Open-banking volumes (infrastructure)** | **CBI Globe: >700M API calls from >200 PSPs acting as AISP/PISP/CISP (2025)**; API calls +52% in 2023; CBI federates >80% of the Italian banking industry; open-banking payments only 0.13% of online transfers, mostly B2B; "Active Functionality" (CBI acting as TPP) +70% vs 2024 | FACT (medium: Data Manager May 2026, Banca Forte, AziendaBanca, CBI pages) | NEW-8 | Consumer AIS consent counts UNKNOWN; CBI annual report (cbi-org.eu) |
| **Open-banking consent behaviour (consumer)** | **57.4% of account-connection attempts succeed in H1 2025 (+8 pp vs 2024)**; 49.2% of users in CRIF's observed base have at least one connected account; Gen Z and "new to credit" users drive growth | FACT (medium: CRIF Open Banking market outlook, Oct 2025, via Pagamenti Digitali, EconomyUp, Data Manager) | NEW-4 | **Caveat:** CRIF observes credit-application flows (lending/credit scoring), not PFM; the 49.2% is of CRIF's user sample, not of Italians. Still the best public signal that Italians will go through PSD2 flows, and that ~4 in 10 attempts fail — a product problem Lilleri must design for |
| Open-banking A2A payments | Trustly: account-to-account transactions in Italy +63% (Dec 2024) | FACT (medium, single provider) | IT-Y-31 | — |
| Regulatory tailwind | Decreto Accise (law by 25 Jun 2026): merchants must accept electronic money "anche via app e wallet"; Satispay zeroes merchant fees under €10 from Sep 2026 | FACT (medium) | IT-W-08, IT-W-02 | gazzettaufficiale.it |
| Italian e-commerce payment mix | ≈€52bn e-commerce 2025; wallets ≈35%, cards ≈31–33%, bank transfers ≈13%; mobile payments +61% in 2024 | FACT (low-medium) | IT-W-02 | Cross-Border Magazine as cited |
| **Share of Italians using a PFM / expense-tracking app** | **UNKNOWN** — no survey surfaced in any channel | UNKNOWN | — | Osservatorio Fintech & Insurtech 2025 consumer survey; Banca d'Italia IACOFI; a 200-respondent Phase 1 survey |

### 3.2 A sizing funnel (HYPOTHESIS, not a forecast)

We show the arithmetic so it can be challenged. Nothing below is a fact.

| Step | Working value | Basis | Status |
|---|---|---|---|
| Adults with a bank or postal account | ~45–48M | ~95–97% of adults; 48.1M accounts include firms and multi-account holders, so this is an order of magnitude, not a count | ASSUMPTION |
| Adults with ≥2 institutions (the reconciliation problem exists) | plausibly 8–15M | Revolut >5M + Satispay 6.5M + N26/Hype/bunq/Buddybank/isybank, with unknown overlap, on top of a primary bank; nearly everyone with a neobank also has a primary bank (IT-Y-01: Revolut as "carta di appoggio") | HYPOTHESIS |
| Adults who actively try to track spending today (spreadsheet, ChatGPT-DIY, Wallet/Spendee, bank analytics) | UNKNOWN; order of magnitude single-digit millions | No Italian survey; creator audiences of 28k–175k subscribers per video (IT-Y-02/Y-03/Y-04) show a sizeable but unquantified interest | UNKNOWN |
| Long-run ceiling for a category leader (registered users) | 0.6–2.4M | Foreign benchmarks relative to population: Finanzguru >3M in Germany (pop. ~84M ≈ 3.6%, registered), Emma >3M in UK/US/CA (UK pop. ~68M; share UNKNOWN), Mint 3.6M MAU in the US in 2021 (≈1.1% of population, active); 1–4% of 59M | HYPOTHESIS (benchmarks FACT: EU-S-68, EU-S-64, US-W28) |
| Paid conversion | UNKNOWN for freemium PFMs in Europe | Monarch >500k paying of ~1M total in May 2025 is a paid-only product (US-W13, US-S34) and not a freemium comparable; Finanzguru's paid share UNKNOWN; Rocket Money's 10-Q discloses revenue growth but no subscriber count (US-W20) | UNKNOWN |

Reading (HYPOTHESIS): the population is not the constraint; the constraints are connector quality (CRIF's 42.6% failure rate is the baseline we inherit), willingness to pay for correctness rather than features, and acquisition cost in a referral-bonus market.

---

## 4. Segments

| # | Segment | Who they are | Evidence | Size signal | Core pain today | Fit with the promise | Priority | Status |
|---|---|---|---|---|---|---|---|---|
| S1 | **Multi-account optimisers** | 25–45, hold 3–5 relationships (e.g. Fineco for investments, BBVA for interest, Buddybank/Revolut for daily spend, Satispay for small payments, a broker for the emergency fund); follow Italian finance creators; already try Wallet, Getquin, spreadsheets, ChatGPT | IT-Y-02, IT-Y-03, IT-Y-04 (three independent creators and their audiences); PP-§G I-9 | Revolut >5M and Satispay 6.5M Italian users as the pool (NEW-6, IT-W-02); overlap UNKNOWN | Month-end ritual of copying balances into a sheet; Wallet sync breaks; cash typed by hand; "I have too many accounts" | Direct: reconciliation across institutions is their job to be done | **P0 (launch)** | FACT for behaviour (low-medium), HYPOTHESIS for size |
| S2 | **Broken-sync refugees** | Current users of Wallet, Spendee, Plum IT, MoneyWiz whose bank links stopped working | EU-S-38 (Wallet 44% one-star, "sync broken since Dec 2024"), EU-S-13a (Spendee IT), EU-S-11 (Plum IT 3.4/5) | UNKNOWN; Wallet is the Italian creators' default | "I can't trust the numbers"; unresponsive support | Direct; they already accept PSD2 and a subscription | **P0 (early adopters)** | FACT for the pain |
| S3 | **Couples and households** | Partners who keep personal accounts plus a joint account or a split app; "app o conto cointestato" | IT-Y-05, IT-§4.5; US-S40/S42 (Monarch household is the most-loved feature); PP-§B | Splitwise/Tricount mainstream in Italy (IT-Y-04/Y-05) | Manual entry in split apps; Splitwise free tier capped at ~4 adds/day with ads; "shared costs fronted by one person" invisible | Strong, but requires household model and split-tagging on real transactions | P1 | FACT |
| S4 | **Partita IVA / freelancers** | Mix business and personal on the same accounts; park tax money; need giacenza media and ISEE-relevant balances | IT-Y-03, IT-§8.5 | UNKNOWN | No global app separates business/personal or tracks tax set-aside | Good, but adjacent to business-banking territory (Qonto) | P1 (after MVP) | FACT (low-medium) |
| S5 | **Prepaid-primary and cash-heavy mass market** | Postepay Evolution as the primary "account" (>10M cards), cash top-ups (Hype, Mooney), >60% cash at POS | NEW-5, NEW-3, IT-§8.2–8.3 | >10M Evolution cards | Apps assume checking + credit card; top-ups are mis-read as spending; cash unobservable | Medium: needs Poste connector quality (UNKNOWN) and a cash model | P2 | FACT for counts; UNKNOWN for connector quality |
| S6 | **Gen Z neobank natives** | Hype (minors 12+), Satispay, Revolut users recruited by referral codes | IT-Y-06/Y-07/Y-20 | UNKNOWN | Low complexity, low WTP; many single-account | Weak fit for a reconciliation product; valuable as a growth channel later | P3 | ASSUMPTION |
| S7 | **Self-hosters / power users** | Actual Budget, Firefly III users paying the aggregator directly | PP-§A, PP-§F | Niche | Want CSV/API, transparency of sync, control | Not a target; a precise source of failure-mode evidence and of trust requirements (export, API) | Not targeted | FACT |

---

## 5. Trends 2024–2026

| # | Trend | Evidence | Status | Implication for Lilleri |
|---|---|---|---|---|
| T1 | **Mint shutdown re-formed the US around paid PFMs** | Intuit announced 1 Nov 2023, closed 23 Mar 2024; ~3.6M active users (2021); Monarch 20× paid-subscriber growth, $75M Series B at $850M (May 2025), 1M members (Mar 2026), $100M ARR and MBI acquisition (1 Oct 2026); free ad/lead-gen PFM could not carry aggregation costs | FACT (US-§1, US-W11/W12/W13/W28); "why Mint died" reading ASSUMPTION | Paid is viable when the product is the only way to see everything; a free, ad-funded PFM is the model that died |
| T2 | **AI: from chat-over-data to agents that act; nobody publishes accuracy** | Copilot per-user model (2023); Monarch assistant relaunch (Oct 2025); Quicken Assist (Feb 2026); Cleo Autopilot (5 Feb 2026); Rocket Money Rowan on SMS, built with Anthropic models (25 Aug 2026); Piere; ChatGPT personal finance with Plaid (May–Jun 2026, US only); long tail of SEO-driven "AI budgeting" apps | FACT (US-§3); trend reading ASSUMPTION | "AI" is not a positioning; per-user learning with a visible "why" is the praised capability; agentic money movement is a later, trust-gated step; messaging-first nudges may beat a chat box in Italy (HYPOTHESIS, US-§5.16) |
| T3 | **Aggregator consolidation and the end of the free hobbyist route** | GoCardless Bank Account Data closed to all new accounts from Jul 2025; Mastercard bought Aiia (Nov 2021) and shut Spiir (Jun 2026); Fabrick (Sella) took 75% of finAPI (Jun 2025); YNAB switched Europe from TrueLayer to Plaid (Feb 2025) after TrueLayer moved EU banks to private beta (Mar 2024); Enable Banking rising among self-hosters, free only for own-account use; Salt Edge remains the trackers' default | FACT (PP-AD-01, PP-§G I-6, EU-S-85, IT-W-07, US-W2/W3/W4, PP-EB-01) | Provider choice is a strategic, not a procurement, decision; design the connector layer provider-agnostic; budget for a minimum monthly invoice from day one |
| T4 | **European D2C exits; survivors have a second rail or a parent** | Moneyhub (Jul 2026), Spiir, Yolt, Grip, Oval Money closed; Bankin' (Casino) and Linxo (Crédit Agricole) captive; Fintonic pivoted to credit; Finanzguru (commissions), Emma (cashback/invest/interest), Snoop (switching), Plum (AUM) thrive | FACT (EU-§1, EU-§5, EU-§9) | Plan the second rail (B2B2C with an Italian bank or aligned affiliate) before scale, not after |
| T5 | **Price band drifting up; crippled freemium retreating; generous free cores winning** | Snoop £4.99→£5.99; Spendee $2.99→$5.99; Finanzguru €2.99→€4.29 monthly; Linxo Lab adds Premium; PocketGuard removes its free plan (2026); Monarch adds Plus at 2–3× Core; Finanzguru's free core serves >3M users | FACT (EU-§8, US-§4.4, US-W27, EU-S-68) | A €3.99–€4.99 monthly / €29.99–€39.99 annual Plus is mid-pack; gate depth, never correctness (categories, rules, export) |
| T6 | **Incumbents absorb aggregation** | Intesa XME Banks (2020; free; 20 banks at launch, target 100+; spending categories across accounts); Hype Next/Premium cross-bank aggregation; UniCredit multibanking (ASSUMPTION); Revolut/bunq linked accounts for Italian banks UNKNOWN; Tricount folded into bunq's funnel | FACT (NEW-7, IT-W-01, IT-V-09); depth UNKNOWN | "One place for all accounts" cannot be the headline; correctness across institutions and per-user learning must be |
| T7 | **Consent and access rules changed, apps did not** | SCA exemption extended from 90 to 180 days (Delegated Regulation (EU) 2022/2360, applies from 25 Jul 2023); apps and aggregator EULAs still say 90 days; users experience consent expiry as random breakage; 4 unattended refreshes/day (RTS 2018/389 art. 36(5)(b)), user-present refreshes uncapped; Intesa serves two-week transaction windows and answers HTTP 429 when exceeded | FACT (EU-§6, EU-S-87, PP-§A #4, PP-§G I-5) | Proactive consent management is an open, unmarketed differentiator; catch-up syncs must be chunked |
| T8 | **Trust events are fresh in Italian memory** | Revolut handed identity documents and histories to criminals impersonating a prefecture e-mail (Sep 2026; 680 clients cited in Parliament); Garante fined Poste €12.5M over the BancoPosta/Postepay apps (Apr 2026); Postepay app shut and migrated (Oct 2025, low-medium); Hype being merged into Banca Sella (2026, low-medium); Cleo FTC settlement; shutdowns stranding users (Mint, Moneyhub, Spiir, Oval) | FACT (IT-W-08, IT-W-04, EU-S-45, PP-§E) | "Who can see my data and under what process", read-only PSD2 wording, export and deletion are launch features, not compliance afterthoughts |
| T9 | **Italian subscription ladders set the consumer ceiling** | Satispay Plus/Metal/Velvet €3.99/€9.99/€39.99 with card included (Jul 2026); Hype Next €2.90 / Premium €9.90; N26 €4.90/€9.90/€16.90 (FR/ES lists, IT to confirm); Revolut ~€4/€10/€16/€45; Plum IT €3.99/€9.99 | FACT (low-medium to high; IT-V-02/W-02, IT-V-05/W-01, IT-V-23, IT-Y-01, EU-S-66) | Italians already pay €3–€10/month for money apps; a PFM Plus at €3.99–€4.99 is the floor of that ladder, not the ceiling |
| T10 | **Platform bundling threat (US today, Europe UNKNOWN)** | ChatGPT personal finance connects banks via Plaid for Plus/Pro users (US only as of Jul 2026); Hiro acquisition (Apr 2026) | FACT (US-S170/S171, US-W29/W30) | Watch item; European launch would need EU AIS licensing and bank coverage; our defence is reconciliation quality and Italian semantics, not chat |

---

## 6. Bank-app analytics: the default competitor

The default alternative to Lilleri is not another PFM; it is the analytics tab of the app the user already has. The table records what is documented and what is not.

| Bank / neobank app (Italy) | Built-in analytics | Sees other institutions? | Categorises external transactions? | Learns per user / custom categories / rules | Transfer pairing, card settlement, review flow across institutions | Status / sources |
|---|---|---|---|---|---|---|
| **Intesa Sanpaolo (XME Banks)** | Spending analysis, XME Salvadanaio goals (ASSUMPTION) | **Yes** — accounts and cards of other banks; transfers from linked non-Intesa accounts; free; 20 banks at launch (Feb 2020), target 100+ | **Advertised yes at launch:** "monitorare le categorie di spesa", "organizzazione di tutte le spese, a prescindere dal conto", graphs, filters, labels (launch copy, 2020) | UNKNOWN | UNKNOWN; not mentioned in any copy seen | FACT (medium) for existence and launch copy (NEW-7, IT-V-09); current bank count, usage and quality UNKNOWN |
| **Hype (Banca Sella)** | "Radar" spending/income control; Box goal jars; cashback | **Yes on Next/Premium** (€2.90/€9.90): "aggregazione conti di altre banche" | UNKNOWN | UNKNOWN | UNKNOWN | FACT (low-medium, IT-W-01); depth UNKNOWN; merger into Banca Sella 2026 (low-medium, IT-W-04) |
| **UniCredit / Buddybank** | Categorised spending ("gestione spese"); Buddybank categorisation "works well if you pay by card and correct labels" (creator) | Multibanking view "around 2020" | UNKNOWN | UNKNOWN | UNKNOWN | ASSUMPTION for multibanking; FACT (low) for Buddybank categorisation (IT-Y-03) |
| **Revolut** | Analytics by category/merchant, category budgets, Subscriptions hub, Pockets, weekly notifications; statement export | Linked accounts exist in the UK and some EEA markets; **Italy UNKNOWN** | — | Custom categories / apply-to-future UNKNOWN | Own transfers typed; external not reconciled | ASSUMPTION for analytics detail (IT-§3.1); >5M IT customers FACT (NEW-6) |
| **N26** | Insights (auto categorisation, monthly stats), hashtags, Spaces with rules and round-ups (paid) | None (ASSUMPTION) | — | Fixed category set (ASSUMPTION); learning UNKNOWN | No | ASSUMPTION (IT-§3.2) |
| **Satispay** | "Budget" refill envelope, Salvadanaio, points; creators single out Budget as its most interesting feature | No (linked IBAN only); exposes its own PSD2 portal as an ASPSP | — | UNKNOWN | P2P only | FACT (low-medium, IT-Y-09/Y-13; IT-§2.4) |
| **bunq** | Up to 25 sub-accounts with own IBANs; insights; user-defined categories in the API; "Finn" assistant (ASSUMPTION) | Advertised adding other banks' accounts (ASSUMPTION); Italy UNKNOWN | UNKNOWN | User-defined categories exist at API level (FACT, IT-D-02) | UNKNOWN | mixed (IT-§3.3) |
| **Fineco** | "Money Map" categorised spending (ASSUMPTION) | No | — | UNKNOWN | No | ASSUMPTION (IT-§3.8) |
| **Poste Italiane (BancoPosta/Postepay)** | Unified app since Oct 2025 with "Pwallet" and an AI assistant (low-medium); categorisation UNKNOWN | No | — | UNKNOWN | No | FACT (low-medium, IT-Y-30, IT-V-12) |

**Conclusions.**
- FACT: at least two Italian incumbents (Intesa, Hype) ship or sell cross-bank aggregation; Intesa's launch copy promises categorised spending across linked accounts. The raw note's phrasing "banks only see their own ledger" is therefore wrong for the largest bank and must be replaced by "banks do not reconcile across institutions, do not learn per user and do not run a review flow" — the last three being UNKNOWN for incumbents, not proven absent.
- HYPOTHESIS: even where aggregation exists it is balance-centric and categorisation is a fixed taxonomy without per-user learning, transfer pairing or refund matching; nothing in any official copy mentions those. This is the single most important thing to verify before positioning (install Intesa with a test account; Hype on a paid plan; see Open questions Q1).
- FACT: bank apps structurally cannot model non-bank value: cash, Satispay/Postepay balances held by a family member, broker cash (IT-§3.10), and no bank app offers data portability across a change of bank (ASSUMPTION).

---

## 7. Why users still need a third-party PFM

| # | Argument | Evidence | Status |
|---|---|---|---|
| 1 | **Multi-institution living is the norm for the target** and the number of relationships keeps growing (neobanks as "carta di appoggio", interest-bearing accounts, brokers, wallets) | IT-Y-02/Y-03 (3–5 relationships, "too many accounts"); Revolut >5M Italian customers mostly alongside a primary bank; 48.1M accounts for ~45–48M banked adults | FACT (low-medium) for behaviour; FACT for counts (NEW-1, NEW-6) |
| 2 | **Cross-institution correctness is nobody's job.** A bank app can show another bank's balance, but a transfer from Fineco to Revolut is two transactions in two ledgers, a card settlement is a debit on the account and a credit on the card, a refund is an inflow that belongs to an old expense | PP-§A #3 (382 up-votes), #2, #8, #17; US-§4.1 ("no incumbent exposes a robust pending→posted reconciliation"); Plaid documents pending→posted linkage, so failures are app-side | FACT |
| 3 | **The trackers that do work in Italy are generic and fragile.** Wallet/Spendee/Plum IT reviews: sync "almost never works", three weeks to connect, six weeks without data, support non-existent | EU-S-13a, EU-S-38, EU-S-11; PP-§G I-2 | FACT (low-medium) |
| 4 | **Categorisation must learn the user's merchants** (local supermarket brands, BCC descriptors, F24/MAV/RAV/PagoPA semantics, "ricarica Postepay" as a transfer). Fixed taxonomies produce "sums that bore no relation to reality" | IT-§8.1, IT-Y-02 (rules for a local supermarket); EU-S-22 (Snoop), EU-S-20 (Emma "never learns"); PP-§A #5 | FACT |
| 5 | **Users price effort in minutes per month and abandon tools that cost more.** The current Italian "best practice" is 15 minutes a month with Wallet, 5 minutes with a sheet, 2 minutes with ChatGPT on an export (with a privacy workaround) | IT-Y-02 (effort ladder), IT-§7 | FACT (low-medium) |
| 6 | **Households and shared costs are second-class everywhere.** Split apps are manual and ad-capped (Splitwise ~4 adds/day with a 10-second ad); PFMs treat "household" as a paywall; "spent but not yet paid back" is invisible | IT-§4, PP-§A #22, US-S65 | FACT |
| 7 | **Portability and survivorship.** Users have been stranded by Mint, Moneyhub, Spiir, Oval Money, Yolt, Grip, the Postepay app and GoCardless; a bank-independent ledger with export is the only place the history survives a change of bank | PP-§A #13, PP-§E, IT-§8.6 | FACT |
| 8 | **Cash and non-bank value** still matter in Italy (>60% of POS transactions by number) and are typed by hand in every app | NEW-3, IT-Y-04 | FACT |

---

## 8. Why should Lilleri exist?

### 8.1 The job to be done (not the feature list)

"**Know what actually happens to my money across all my accounts, without doing the bookkeeping myself, and trust the numbers.**" The evidence for each clause:

- *across all my accounts*: S1 behaviour (IT-Y-02/Y-03), 48.1M accounts, >5M Revolut, 6.5M Satispay (NEW-1, NEW-6, IT-W-02) — FACT.
- *without doing the bookkeeping*: the effort ladder in minutes (IT-Y-02), YNAB's "manual effort" as a churn reason, Actual's 382-vote transfer request, the "merge/match" request with 121 votes (PP-§A #3, #16, PP-§D) — FACT.
- *trust the numbers*: "cannot trust the numbers" is the top churn reason (PP-§D); Trustpilot/BBB scores of 2.0–3.5 versus 4.5–4.9 in app stores for the same products, driven by billing and support rather than features (US-§4.5) — FACT.

The task brief explicitly forbids "because it uses AI" as the answer, and the evidence agrees: no user in any source asks for AI; they ask for correctness and for less work. "AI" appears in the evidence only as (a) the mechanism Copilot uses to learn per user, (b) marketing noise from SEO-driven apps, and (c) a workaround Italians practise with ChatGPT because nothing native exists (US-§3, IT-Y-02). AI is a means for categorisation learning and explanation; it is not the reason to exist.

### 8.2 Validating the founding hypothesis: "the financial tracker you don't have to manage / le tue finanze si organizzano da sole"

| Evidence **for** the hypothesis | Status |
|---|---|
| The two most-wanted mechanics in the open-source community are "recognise transfers between accounts automatically" (382 votes) and "merge unmatched transactions gracefully" (121 votes); both are requests to stop managing | FACT (PP-G-01, PP-G-43) |
| Italians already optimise for minutes per month and the creator with the largest audience teaches a 2-minute ChatGPT workflow precisely to avoid managing a tracker | FACT, low-medium (IT-Y-02) |
| The most-loved features across markets are "one place for everything", categorisation that is right first time and learns, subscription ledgers that find things for you, and a single safe-to-spend number — all outcomes of automation | FACT (PP-§C) |
| "Too much manual work (approving, transfers, credit cards)" is a documented churn reason for YNAB and Actual users | FACT (PP-§D) |
| Copilot, the app whose categorisation users praise most, is the one that learns per user and turns review into one tap | FACT (US-S51/S63/S64) |

| Evidence **against** or qualifying the hypothesis | Status | Consequence |
|---|---|---|
| Users distrust *silent* automation: hidden pending items that reappear (Monarch), transfer counterparts invented by the app (Actual), sync that "silently drops" or overwrites transactions "with no error, no warning" (Enable Banking integrations, Aug–Oct 2026) are documented trust-killers | FACT (US-S29, PP-G-24, PP-G-83/G-84/G-87) | Automation must surface what it did and allow one-tap undo |
| "Control and flexibility" and "knowing where money goes" are what YNAB users love; a product that removes all manual touch removes the sense of control for a segment | FACT (US-S12) | Keep a visible, optional review loop; "nothing to do" must be a state the user *sees*, not an absence |
| Round-ups that quietly convert cash into points (Revolut "Spiccioli") are called "cursed" by a creator; any automation that moves money must be explicit and reversible | FACT, low-medium (IT-Y-01) | Lilleri's automation is read-only bookkeeping in the MVP; no money movement |
| Opaque "95% accuracy" AI claims are flagged as a trust risk; nobody publishes a mechanism | ASSUMPTION (US-§6.14) | Show confidence and a reason ("learned from your correction on 12 March"), never a percentage |
| Learning must be visible: Emma claims to learn after three similar edits yet reviewers say it "doesn't seem to ever learn" | FACT (EU-S-21, EU-S-20) | Propose the rule on the first correction and show the learned rules in a list |

**Verdict (HYPOTHESIS, validated against FACT-level pain points; to be confirmed with 20–30 S1/S2 users in Phase 1):** the hypothesis holds, with an amendment. "You don't have to manage it" is the right promise; "you never see what it did" is not. The promise should be stated as **"le tue finanze si organizzano da sole — e tu vedi sempre perché"** ("your finances organise themselves — and you can always see why"). The hero moment is an empty Review Inbox the user *looks at* ("niente da fare"), consistent with the brand territory in BR-§8.3.

Draft positioning sentence (DECISION proposed, to be tested): *Collega i tuoi conti una volta. Lilleri riconosce da sola bonifici interni, addebiti della carta, rimborsi e abbonamenti, impara le tue categorie e ti mostra solo ciò che vale la pena controllare.*

### 8.3 Why not the alternatives the user has today

| Alternative | Effort (user-reported) | Cross-institution correctness | Learns the user | Coverage of Italian specifics | Privacy / trust posture | Status |
|---|---|---|---|---|---|---|
| Bank app analytics (Intesa XME Banks, Hype Radar, Revolut Analytics) | ~0 min | Aggregation yes (Intesa, Hype); transfer/card/refund reconciliation UNKNOWN, likely absent | UNKNOWN (fixed taxonomies assumed) | Native payment types (F24, MAV/RAV, PagoPA) yes at Hype/Poste | Bank-grade, but ties the ledger to one bank | FACT/UNKNOWN (§6) |
| Wallet by BudgetBakers (Salt Edge) | ~15 min/month | Auto-managed Transfer category; cross-institution pairing manual (ASSUMPTION); duplicates and broken sync reported | Rules for unrecognised merchants; ML learning UNKNOWN | Generic; local merchants need rules | Read-only PSD2 ("my bank confirmed"); support "non-existent" | FACT (IT-Y-02/Y-03, EU-§3.6) |
| Google Sheet (15/65/20 method) | ~5 min/month | Manual | n/a | Manual | Private | FACT (IT-Y-02) |
| ChatGPT on a Revolut export | ~2 min/month | One account at a time; no reconciliation | "Learns" within a chat | Depends on the prompt | Export + paste; temporary chat as the privacy workaround | FACT (IT-Y-02) |
| YNAB (Plaid in Italy since Feb 2025) | 2–4 weeks to be comfortable; manual assignment | Approve/match flow is the positive reference; transfers explicit; pending not in plan | Payee memory only | Italian bank quality UNKNOWN; $109/yr | Credentials never touch YNAB | FACT (US-§2.1) |
| **Lilleri (intended)** | target <5 min/month (HYPOTHESIS) | Automatic pairing of transfers, card settlements, refunds, pending→posted with confidence and undo | Per-user learning, explicit rules win, visible reasons | Italian payment-type semantics, prepaid and cash model | Named licensed AISP, read-only, export and deletion from day one | DECISION (proposed) |

### 8.4 Honest counter-arguments (why this could fail) and mitigations

| Counter-argument | Evidence | Mitigation | Status |
|---|---|---|---|
| Aggregation cost killed Mint and every European subscription-only D2C PFM | US-§1 (ASSUMPTION on cause), EU-§5 (FACT on exits) | Paid Plus from day one at a mid-pack price; second rail planned (B2B2C with an Italian bank, aligned affiliate), never ads in the inbox | DECISION proposed |
| Incumbents could ship reconciliation inside XME Banks or Hype | §6 (depth UNKNOWN) | Verify depth now (Q1); differentiate on per-user learning data and bank-independence (ledger survives a change of bank) | OPEN QUESTION |
| ChatGPT or Revolut could bundle a PFM | US-§3; Revolut AI assistant UNKNOWN | Watch item; Lilleri's moat is correctness data (pairs, rules, merchants) and Italian semantics, not chat | ASSUMPTION |
| Italian willingness to pay for a PFM is unproven | §3 (UNKNOWN); comparables are neobank tiers | Phase 1 price test; free core generous enough to retain non-payers as data contributors | OPEN QUESTION |
| Connector quality is outside our control (57.4% success rate; Intesa limits; missing card accounts) | NEW-4, PP-§G I-3/I-5/I-8 | Provider-agnostic connector layer, per-bank health page, honest coverage per account type, CSV/PDF fallback | DECISION proposed |
| Acquisition in a referral-bonus market is expensive | IT-§7, IT-§9.1.6 | Creator-led distribution with a partner-funded bonus; own the "come gestisco i miei soldi" content lane | HYPOTHESIS |

---

## 9. Gate A assessment: is the market opportunity clear?

| Criterion | Evidence | Assessment |
|---|---|---|
| A real, recurring, unserved problem | Five failure modes with 10–22 independent sources each; Italian apps do not reconcile across institutions; trackers that reach Italy break | **Met** (FACT) |
| A population large enough | 48.1M accounts; >67M cards; >10M Postepay Evolution; >5M Revolut IT; 6.5M Satispay; multi-banking is the norm for S1 | **Met** on order of magnitude (FACT); share that tracks spending UNKNOWN |
| Evidence of willingness to pay | US $95–$109/yr; EU Plus €3.99–€5.99; Italian neobank tiers €2.90–€9.99; Finanzguru >3M users with a free core; Monarch $100M ARR | **Partially met**: strong abroad, UNKNOWN for a PFM in Italy |
| A reachable channel | Creator/referral culture; S2 refugees; shared-expense word of mouth | **Partially met** (HYPOTHESIS; CAC unknown) |
| Defensible differentiation | Reconciliation quality, per-user learning with visible reasons, consent management, Italian payment semantics; none marketed by any competitor found | **Met as a hypothesis**; incumbents' depth UNKNOWN |
| Structural risk acceptable | Aggregation cost, provider dependence, incumbents, platform bundling | **Acceptable with mitigations** (§8.4) |

**Verdict: PASS WITH CONDITIONS.** The market opportunity is clear enough to proceed to product definition (Phase 1) and to architecture (Phase 3), provided the following conditions are closed before any build commitment beyond a vertical slice:

1. **Connector reality check (P0):** test-link, via the shortlisted providers, the eight institutions that define "works in Italy" for S1 (Intesa Sanpaolo/isybank, UniCredit/Buddybank, Fineco, BBVA Italia, Revolut IT IBAN, Poste/Postepay Evolution, Satispay, a BCC) and record per-bank consent length, history depth, pending availability and transaction IDs. Target: a documented success rate above CRIF's 57.4% baseline on these eight.
2. **Incumbent depth check (P0):** verify whether XME Banks and Hype categorise external transactions, learn, pair transfers; if they do, re-scope the differentiation to review inbox, learning and portability.
3. **Willingness-to-pay test (P1):** a 200-respondent survey plus 20–30 interviews with S1/S2 on the amended promise and a €3.99/€4.99 Plus; measure stated preference and the "minutes per month" they expect.
4. **Second-rail plan (P1):** a written business-model option set (B2B2C with an Italian bank, aligned affiliate, household tier) before Phase 5.
5. **Promise test (P1):** validate "si organizzano da sole — e tu vedi sempre perché" against the alternative "control" framing with the same interviewees.

---

## 10. Decisions / Recommendations

Each item is a proposed DECISION to be recorded in an ADR or in `product/`; none is final until recorded.

1. **DECISION (proposed): position Lilleri on correctness and effort, not on AI.** Headline promise "le tue finanze si organizzano da sole — e tu vedi sempre perché"; "AI" appears only as the explanation of how categorisation learns. Rationale: §8.1–8.2.
2. **DECISION (proposed): launch segment = S1 multi-account optimisers and S2 broken-sync refugees**, reached through Italian finance creators; S3 households as the first expansion. Rationale: §4.
3. **DECISION (proposed): "see all accounts in one place" is table stakes; the differentiators are automatic reconciliation (transfers, card settlements, refunds, pending→posted, duplicates), per-user learning with explicit rules winning, the Review Inbox, proactive consent management and Italian payment semantics.** Rationale: §6, §7, T6, T7.
4. **DECISION (proposed): pricing posture = generous free core + Plus at €3.99–€4.99 monthly / €29.99–€39.99 annual; never gate custom categories, rules or export; reminder before any trial converts; no ads in the product.** Rationale: T5, T9, PP-§F, EU-§11–12.
5. **DECISION (proposed): plan a second revenue rail before scale** (B2B2C with an Italian bank or aligned, disclosed affiliate), explicitly excluding lending/cash-advance and data selling. Rationale: T4, EU-§9, PP-§E.
6. **DECISION (proposed): provider-agnostic connector layer with a per-bank health page in Italian; honest coverage per account type (credit cards of UniCredit/Mediolanum/Crédit Agricole are not on PSD2); CSV/PDF import as a first-class fallback; GoCardless excluded.** Rationale: T3, PP-§G.
7. **DECISION (proposed): trust features ship in the MVP:** consent screen naming the licensed AISP with read-only wording in Italian, "what we store and who we send it to" page, CSV export and account deletion from day one. Rationale: T8, PP-§E.
8. **RECOMMENDATION: treat Finanzguru (free core + commission rail, >3M users) as the business-model benchmark, Copilot (per-user learning, one-tap review) as the categorisation benchmark, Monarch (rules-driven review status, household) as the review-flow benchmark, YNAB (34-day trial, API, import IDs) as the trust-and-portability benchmark.**
9. **RECOMMENDATION: no money-movement automation in the MVP** (no round-ups, no auto-saves, no agents); read-only bookkeeping until trust is established. Rationale: §8.2 (Revolut "Spiccioli" reaction, Cleo/Rocket regulatory history).
10. **RECOMMENDATION: re-verify every number in §3 on the primary page before it enters the business plan**; the FABI, Banca d'Italia, ECB SPACE, CRIF and Revolut figures above are search-engine summaries.

---

## 11. Open questions

| # | Question | Why it matters | How to verify | Owner / phase |
|---|---|---|---|---|
| Q1 | Do Intesa XME Banks, Hype Next/Premium and UniCredit multibanking categorise external transactions, learn per user, pair transfers, and how many people use them? | Determines whether "correctness across institutions" is still open | Install the three apps with test accounts (Hype on a paid plan); read intesasanpaolo.com "Collega le tue banche"; ask Fabrick/CBI contacts | Product, Phase 1 |
| Q2 | Per-bank connector quality for the top eight Italian institutions (consent length 90/180, history depth, pending, stable IDs, rate limits, card accounts) | Gate A condition 1; MVP coverage promise | Sandbox/limited-production tests with Enable Banking, Salt Edge, Fabrick, Plaid, TrueLayer, Tink; Yapily data-restrictions page for Intesa | Engineering, Phase 3 |
| Q3 | Share of Italians using a PFM/expense app today and their willingness to pay | Gate A conditions 3; business plan | Osservatorio Fintech & Insurtech 2025 consumer data; Phase 1 survey (200) and interviews (20–30) | Growth, Phase 1 |
| Q4 | Household-only current-account count and 2024 card split (debit/prepaid) | Sizing precision | Banca d'Italia Base Dati Statistica (infostat), "Sistema dei pagamenti" table TSPAG040 | Growth, Phase 1 |
| Q5 | Consumer AIS consent counts in Italy (not API calls) | Adoption curve | CBI annual report; Osservatorio PoliMi; provider `valid_until` statistics | Growth |
| Q6 | Revolut's and bunq's linked-accounts availability for Italian banks; Revolut's AI assistant in Italy | Competitive pressure from neobanks | In-app check; help.revolut.com; together.bunq.com | Product |
| Q7 | ChatGPT personal finance European timeline | Platform threat | OpenAI help centre country list | Product (watch) |
| Q8 | Italian-language sentiment (r/ItaliaPersonalFinance, FinanzaOnline) on PSD2, Postepay, Wallet, Revolut analytics | Pain-point frequency in the mass market | site:reddit.com queries once budget allows; FinanzaOnline threads; code 500 Italian App Store reviews by theme | UX research, Phase 1 |
| Q9 | Hype merger into Banca Sella: timeline and whether the app/brand survives | Migration churn and S6 channel | Sella group press; Banca d'Italia IMEL register | Growth (watch) |
| Q10 | Satispay as an ASPSP: has any aggregator integrated openbanking.satispay.com? | S1 coverage (Satispay is in every creator's stack) | Provider ASPSP catalogues; Satispay developer contact | Engineering |
| Q11 | Exact current prices: Monarch Plus ($199 vs $299), Finanzguru monthly (€4.29?), Wallet IT period mapping, N26/Revolut Italian lists, Satispay annual canone | Pricing comparables | Read the vendor pricing pages from a normal browser | Business, Phase 1 |
| Q12 | Does the 12.7M / 29% fintech-usage figure have a 2025 update? | Demand signal | osservatori.net 2025 report | Growth |

---

## 12. Sources

All sources verified on 2026-10-02 (search-engine snippets or indexed copies; no vendor page was read in full). Reliability: high = official/primary; medium = reputable secondary or official copy via a dated capture; low = blog/forum/creator/SEO.

### 12.1 Raw research notes (this repository)

| ID prefix | File | What was used |
|---|---|---|
| US- | `/home/user/Lilleri/docs/research/raw/competitors-us.md` (sources S1–S201, V1–V5, W1–W33) | Mint shutdown, US pricing, AI moves, reconciliation patterns, Plaid pending→posted linkage |
| EU- | `/home/user/Lilleri/docs/research/raw/competitors-eu-uk.md` (sources S-01–S-87) | UK/EU players, exits, EUR price anchors, PSD2 consent, Italian-bank support |
| IT- | `/home/user/Lilleri/docs/research/raw/competitors-italy-and-ai-first.md` (sources R-EU/R-US/R-OB, D-01–D-03, Y-01–Y-34, V-01–V-28, W-01–W-15) | Italian landscape, bank-app analytics, shared-expense apps, Italian user behaviour, Satispay/Hype/Poste facts |
| PP- | `/home/user/Lilleri/docs/research/raw/user-pain-points.md` (sources G-01–G-87, AD-01/02, GC-01, SE-01, CS-01, D-* digests) | Ranked pain points, jobs, loved features, churn, trust, willingness to pay, Italian specifics |
| BR- | `/home/user/Lilleri/docs/research/raw/brand-competitor-analysis.md` (sources S1–S16, E1–E21) | Verbal territory ("niente da fare"), tone, naming constraints |

### 12.2 Key primary and secondary sources cited directly in this document (carried over from the raw notes)

| ID | Source | URL | Date seen / published | Reliability |
|---|---|---|---|---|
| US-S51 | Copilot changelog: Copilot Intelligence for Spending | https://changelog.copilot.money/log/copilot-intelligence | 2023-09-05 | high |
| US-S29 | Monarch help: Hiding or Unhiding Transactions (hidden pending may reappear) | https://help.monarch.com/hc/en-us/articles/4405041904916-Hiding-or-Unhiding-Transactions | n/d | high |
| US-S170/S171 | TechCrunch / OpenAI: ChatGPT personal finance | https://techcrunch.com/2026/05/15/openai-launches-chatgpt-for-personal-finance-will-let-you-connect-bank-accounts/ ; https://openai.com/index/personal-finance-chatgpt/ | 2026-05-15 | high |
| US-S70 | Rocket Companies press release: Rowan | https://www.rocketcompanies.com/press-release/rocket-moneys-rowan-rewrites-what-ai-can-do-in-personal-finance/ | 2026-08-25 | high |
| US-S172 | PR Newswire: Cleo launches Autopilot | https://www.prnewswire.com/news-releases/cleo-launches-autopilot-automating-your-money-moves-302679691.html | 2026-02-05 | high |
| US-W2 / W3 | YNAB "More Banks: Europe Edition"; Plaid customer story on YNAB | https://www.ynab.com/whats-new/more-banks-europe-edition ; https://plaid.com/en-gb/customer-stories/ynab/ | 2025-02-05 / 2025 | high |
| US-W12 | Axios / PR Newswire: Monarch $100M ARR and MBI acquisition | https://www.prnewswire.com/news-releases/monarch-hits-100m-in-arr-acquires-mbi-to-accelerate-next-phase-of-growth-302896004.html | 2026-10-01 | high |
| US-W13 | CNBC: Monarch raises $75M | https://www.cnbc.com/2025/05/23/personal-finance-app-monarch-raises-75-million.html | 2025-05-23 | high |
| US-W20 | SEC EDGAR: Rocket Companies 10-Q (quarter ended 2026-06-30) | https://www.sec.gov/Archives/edgar/data/0001805284/000162828026054577/rkt-20260630.htm | 2026-08 | high |
| US-W27 | PocketGuard free plan removed (Clark.com, FinanceBuzz and others) | https://clark.com/personal-finance-credit/budgeting-saving/pocketguard/ | 2026 | medium |
| US-W28 | Engadget / Wikipedia: Mint shutdown, 3.6M active users (Bloomberg 2021) | https://www.engadget.com/intuit-is-closing-down-mint-its-popular-free-budget-tracking-app-054145229.html | 2023-11 / live | medium |
| US-V4 | Plaid docs: pending→posted reconciliation (`pending_transaction_id`) | https://plaid.com/docs/transactions/transactions-data/ | live | high |
| EU-S-19 / S-63 | Emma help: countries (UK/US/CA only); plan comparison | https://help.emma-app.com/en/article/which-countries-is-emma-available-in-1x4q2og/ ; https://emma-app.com/plans/compare-emma-plans | n/d / 2026 | high |
| EU-S-20 / S-21 | Emma Trustpilot ("never learns"); Emma help on learning after three edits | https://uk.trustpilot.com/review/emma-app.com ; https://help.emma-app.com/en/article/change-a-transaction-category-iipyy2/ | n/d | low-medium / high |
| EU-S-11 | Apple App Store IT: Plum (3.4/5, 150 reviews) | https://apps.apple.com/it/app/plum-risparmi-e-investimenti/id1456139507 | n/d | medium |
| EU-S-13a | Apple App Store IT / Trustpilot: Spendee | https://apps.apple.com/it/app/635861140?see-all=reviews&platform=iphone ; https://www.trustpilot.com/review/spendee.com | n/d | low-medium |
| EU-S-38 | Trustpilot: Wallet by BudgetBakers | https://www.trustpilot.com/review/budgetbakers.com | 2025–26 | low-medium |
| EU-S-22 | Snoop privacy policy / Trustpilot | https://snoop.app/privacy-policy/ ; https://www.trustpilot.com/review/snoop.app?page=3 | n/d | high / low |
| EU-S-68 | Finanzguru >3M users, ~€40M revenue 2025 (aktiencheck, Finance Forward, Manager Magazin via) | https://www.aktiencheck.de/news/Artikel-3_Millionen_Nutzer_Wie_Finanzguru_Konkurrenz_abhaengt-19361555 ; https://financefwd.com/de/der-stille-aufstieg-des-hoehle-der-loewen-start-ups-finanzguru/ | 2026 | medium-high |
| EU-S-64 / S-65 | Emma >3M users; profitability, £5.7M revenue 2024 | https://emma-app.com/ ; https://www.fintechgrowthinsider.com/p/edoardo-moreni-emma | 2026 / 2025–26 | medium |
| EU-S-66 / S-67 | Plum tiers (UK, IT); profitability release | https://withplum.com/it-it/subscriptions ; https://www.finextra.com/pressarticle/109618/plum-hits-profitability | 2025–26 / 2026-04-28 | high / medium-high |
| EU-S-70 | Snoop Plus £5.99/£47.99 | https://snoop.app/plus/ | May 2026 | high |
| EU-S-75 / S-77 / S-78 / S-79 / S-80 | Spendee, Outbank, Bankin', Linxo, Dyme prices | https://www.spendee.com/pricing ; https://help.outbankapp.com/de/kb/articles/was-kostet-das-abo ; https://support.bankin.com/hc/fr/articles/360006559578 ; https://tirelire-ailee.fr/linxo-avis-2026-appli-fiable/ ; https://dymesupport.zendesk.com/hc/nl/articles/360018054758 | 2026 | high / medium |
| EU-S-72 / S-73 | Bankin' owned by Groupe Casino; Linxo 100% Crédit Agricole Payment Services | https://www.mind.eu.com/fintech/article/casino-entre-au-capital-du-pfm-bankin/ ; https://presse.credit-agricole.com/actualites/le-groupe-credit-agricole-prend-une-participation-majoritaire-dans-linxo-group-9b7a-9ed05.html | 2019–2025 / 2020 | medium-high / high |
| EU-S-76 | Cleo UK relaunch, UK Pro £12.99, ~$150M ARR | https://web.meetcleo.com/pricing ; https://www.finextra.com/newsarticle/47264/ai-personal-banking-assistant-cleo-relaunches-in-uk | 2026 | high / medium |
| EU-S-45 | Cleo FTC $17M settlement | https://www.hunton.com/privacy-and-cybersecurity-law-blog/ftc-reaches-17-million-settlement-with-cash-advance-company-cleo-ai | 2025-03 | high |
| EU-S-83 / S-85 | Moneyhub sunset 31 Jul 2026; Spiir shutdown 8 Jun 2026 | https://getwealthly.co.uk/learn/moneyhub-alternatives-wps-lifestage ; https://mobilpuls.dk/artikel/mastercard-lukker-spiir-8-juni-2026 | 2026 | medium |
| EU-S-84 | Fintonic restructuring and profitability | https://forbes.es/economia/792740/fintonic-alcanza-la-rentabilidad-tras-doce-anos-de-historia/ | 2025 | medium-high |
| EU-S-50 / S-50a | Yolt and Oval Money closures | https://www.aziendabanca.it/notizie/fintech-insurtech/yolt-chiude ; https://www.ceotech.it/oval-money-lapp-di-risparmio-chiude-definitivamente/ | 2021–24 | medium |
| EU-S-87 | EBA/RTS/2022/03; Delegated Regulation (EU) 2022/2360 | https://eur-lex.europa.eu/eli/reg_del/2022/2360/oj/eng | 2022–23 | high |
| EU-S-86 | Fast Budget and other Italian Salt Edge clients | https://blog.saltedge.com/fast-budget-automated-pfm-via-psd2/ | n/d | high (vendor) |
| IT-Y-01 | Tony Pezzella, "Revolut 2026: la verità che nessuno ti dice" (transcript) | https://www.youtube.com/watch?v=zwCFwhEIV3I | 2025-11-01 | low-medium |
| IT-Y-02 | Giuseppe Castagna, "Il metodo con cui traccio i miei soldi (in 5 minuti al mese)" (transcript) | https://www.youtube.com/watch?v=kJNxDIcJOac | 2025-12-26 | low-medium |
| IT-Y-03 | Karim Mejri, "Come gestisco i soldi nel 2026" (transcript) | https://www.youtube.com/watch?v=J4bio_hsN08 | 2025-03-16 | low-medium |
| IT-Y-04 | Bussola Finanziaria, "10 app di finanza personale" (transcript) | https://www.youtube.com/watch?v=SRVVdLcDARc | 2025-04-22 | low |
| IT-Y-05 | Bank Station, "Come gestire le spese di coppia" (transcript) | https://www.youtube.com/watch?v=gLz7l24O0PA | 2025-07-16 | low-medium |
| IT-Y-09 / Y-13 | Satispay reviews (Budget feature) | https://www.youtube.com/watch?v=TNcTCLLcZqM ; https://www.youtube.com/watch?v=KhpmCtRp6Gs | 2025-09-29 / 2026-03-18 | low-medium / low |
| IT-Y-30 | Postepay app shutdown into the Poste Italiane app (set of five videos incl. Poste Italiane official) | https://www.youtube.com/watch?v=kldxiEqg3Ng ; https://www.youtube.com/watch?v=uQcLdILDCS4 | 2025-09 → 2025-12 | low-medium |
| IT-Y-31 | askanews: Trustly A2A +63% in Italy | https://www.youtube.com/watch?v=PSonnIbmetk | 2024-12-03 | medium |
| IT-V-09 | Google Play description of "Intesa Sanpaolo Mobile" (XME Banks), captured in a research dataset | https://github.com/Trustworthy-Software/Revisiting-Android-App-Categorization | ≈2023 capture | medium |
| IT-V-11 | poste.it copy: "oltre 30 milioni di carte Postepay" (saved page) | https://github.com/rootameli/endpoint | n/d | medium |
| IT-W-01 | Italian affiliate page: Hype plans €0/€2.90/€9.90, "aggregazione conti di altre banche" on Next/Premium | https://github.com/iSte94/EffettoComposto | promo to 2026-03-18 | low-medium |
| IT-W-02 / W-03 | Automated Satispay company report quoting satispay.com (users, merchants, revenue, plans, merchant fees, funding); live inspection of satispay.com/it-it | https://github.com/vibewatch/startup ; https://github.com/kwakseongjae/oh-my-design | 2026-07-21 / 2026-09-26 | medium |
| IT-W-04 | Neobank dataset (Hype merger into Banca Sella; Revolut 50M; N26 8M+; Buddybank live) | https://github.com/andreolf/neobankbeat | 2026-09-11 | low-medium |
| IT-W-08 | Italian daily press digests (Revolut incident Sep 2026; Garante fine on Poste 20 Apr 2026; Decreto Accise 25 Jun 2026) | https://github.com/p1va/news-in-brief | 2025-12 → 2026-09 | medium for headlines |
| IT-D-02 | bunq API reference (user-defined categories, MCC) | https://doc.bunq.com/ | n/d | high |
| PP-G-01 | Actual Budget #1628 "Recognise transfers between accounts" (382 up-votes) | https://github.com/actualbudget/actual/issues/1628 | 2023-09-01 | high |
| PP-G-43 | Actual Budget #669 "Merge unmatched transactions" (121 up-votes) | https://github.com/actualbudget/actual/issues/669 | 2023-02-19 | high |
| PP-G-10 | Actual Budget #3826 "EUA has expired" | https://github.com/actualbudget/actual/issues/3826 | 2024-11-12 | high |
| PP-G-79 | Actual Budget #5445 "Alternative to GoCardless" (147 up-votes, support reply) | https://github.com/actualbudget/actual/issues/5445 | 2025-08-01 | high |
| PP-G-81 / G-82 / G-86 | Italian bank failures: Intesa via GoCardless; Mediobanca Premier; ING Italy and Credem via Enable Banking | https://github.com/actualbudget/actual/issues/6510 ; https://github.com/actualbudget/actual/issues/4577 ; https://github.com/firefly-iii/firefly-iii/issues/12108 | 2025-12-29 / 2025-03-08 / 2026-04-09 | high |
| PP-G-83 / G-84 / G-87 | Silent overwrite / skip / dedup failures in Enable Banking integrations | https://github.com/actualbudget/actual/issues/8701 ; https://github.com/actualbudget/actual/issues/9063 ; https://github.com/actualbudget/actual/issues/8221 | 2026-08 → 2026-10 | high |
| PP-AD-01 | Actual Budget official docs: GoCardless stopped accepting new accounts from July 2025 | https://raw.githubusercontent.com/actualbudget/actual/master/packages/docs/docs/advanced/bank-sync/gocardless.md | 2026-10-02 | high |
| PP-EB-01 | Enable Banking FAQ / linked accounts (minimum monthly invoice; own-account restricted apps) | https://enablebanking.com/docs/faq ; https://enablebanking.com/docs/api/linked-accounts | n/d (mirror) | high |
| PP-D-OBA-#195 | Yapily data-restrictions page (Intesa Sanpaolo 429 `ACCESS_EXCEEDED`, two-week window) | https://docs.yapily.com/pages/data/financial-data-resources/data-restrictions/ | live | high |
| BR-§8.3 | Verbal territory and tagline drafts ("niente da fare"; "Collega una volta. Poi niente.") | `/home/user/Lilleri/docs/research/raw/brand-competitor-analysis.md` §8.3 | 2026-10-02 | HYPOTHESIS |

### 12.3 New sources from WebSearch queries run on 2026-10-02 (snippets only; re-read the primary page before use)

| ID | Source | URL | Published | Reliability | Used for |
|---|---|---|---|---|---|
| NEW-1 | FABI: "In Italia 48 milioni di conti correnti" (analysis of Banca d'Italia data); Il Sole 24 Ore; FocusRisparmio | https://www.fabi.it/2025/07/24/in-italia-48-milioni-di-conti-correnti/ ; https://en.ilsole24ore.com/art/fabi-conti-correnti-famiglie-e-imprese-20-miliardi-piu-2024-AGAjLKED ; https://www.focusrisparmio.com/news/conti-correnti-italia-fabi | 2025-07-24 / 2025-03 | medium (union analysis of official data) | 48,110,106 accounts end-2024; regional split; deposits |
| NEW-2 | Arena Digitale on Banca d'Italia "Sistema dei pagamenti"; Banca d'Italia statistics PDF | https://arenadigitale.it/2024/05/23/bankitalia-in-aumento-carte-di-debito-e-di-credito-nel-2023/ ; https://www.bancaditalia.it/pubblicazioni/sistema-pagamenti/2024-sistema-pagamenti/statistiche_SDP_20240523.pdf | 2024-05-23 | medium / high (PDF not read) | >67M cards end-2023; 13.49M credit cards |
| NEW-3 | ECB SPACE 2024; Banca d'Italia report on Italian results; SSRN paper on Italian SPACE results | https://www.ecb.europa.eu/stats/ecb_surveys/space/html/ecb.space2024~19d46f0f17.en.html ; https://www.bancaditalia.it/media/notizia/rapporto-sulle-abitudini-di-pagamento-dei-consumatori-in-italia-evidenze-dall-indagine-bce-del-2024/ ; https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6758844 | 2024-12 / 2025 | medium-high | Cash >60% of POS transactions by number in Italy; euro area 52% |
| NEW-4 | CRIF Open Banking market outlook (via Pagamenti Digitali, EconomyUp, Data Manager, CRIF press) | https://www.pagamentidigitali.it/digital-banking/open-banking-cresce-la-fiducia-in-italia-nel-2025-oltre-la-meta-dei-conti-viene-collegata-con-successo/ ; https://www.economyup.it/fintech/cresce-la-fiducia-nellopen-banking-in-italia-quasi-1-italiano-su-2-ha-un-conto-connesso/ ; https://www.crif.it/risorse/rassegna-stampa/open-banking-cresce-la-fiducia-degli-italiani/ | 2025-10 | medium | 57.4% connection success H1 2025; 49.2% with a connected account (CRIF sample) |
| NEW-5 | TG Poste: "Nel 2025 Postepay regina dei pagamenti digitali con 3,4 miliardi di transazioni"; Agipress | https://tgposte.poste.it/2026/04/11/nel-2025-postepay-regina-dei-pagamenti-digitali-con-3-4-miliardi-di-transazioni/ ; https://www.agipress.it/poste-italiane-regina-dei-pagamenti-digitali-con-postepay/ | 2026-04-11 | medium (company channel) | 30M Postepay cards, >10M Evolution, 3.4bn transactions 2025 |
| NEW-6 | Teleborsa, Milano Finanza, AziendaBanca, Arena Digitale: Revolut >5M customers in Italy; Business People (4M) | https://www.teleborsa.it/News/2026/05/28/revolut-supera-i-5-milioni-di-clienti-in-italia-con-uso-sempre-piu-quotidiano-3.html ; https://www.milanofinanza.it/news/revolut-supera-i-5-milioni-di-clienti-in-italia-e-diventa-la-quinta-banca-del-paese-202605281412375471 ; https://www.aziendabanca.it/notizie/fintech-insurtech/revolut-oltre-5-milioni-di-clienti-in-italia | 2026-05-28 | medium-high (company release via financial press) | Revolut Italy scale and penetration |
| NEW-7 | Intesa Sanpaolo newsroom: XME Banks launch and activation; Intesa "Collega le tue banche"; Banca Forte | https://group.intesasanpaolo.com/it/newsroom/comunicati-stampa/2020/02/intesa-sanpaolo-presenta-xme-banks-per-la-gestione-di-conti-corr ; https://group.intesasanpaolo.com/it/newsroom/tutte-le-news/news/2020/open-banking--attivo-l-aggregatore-finanziario-xme-banks ; https://www.intesasanpaolo.com/it/persone-e-famiglie/tutti-i-giorni/identita-digitale/collega-le-tue-banche.html ; https://bancaforte.it/notizie/xme-banks-l-and-039-aggregatore-finanziario-di-intesa-sanpaolo-RB98653q | 2020-02 / live | medium-high (official press release, snippet) | XME Banks: free, other banks' accounts and cards, spending categories across accounts, 20 banks at launch |
| NEW-8 | Data Manager "Dall'open banking all'open finance"; Banca Forte on CBI; AziendaBanca; CBI Globe pages | https://www.datamanager.it/2026/05/dallopen-banking-allopen-finance-la-democratizzazione-dei-dati-bancari/ ; https://bancaforte.it/notizie/open-finance-e-pagamenti-digitali-accelerano-il-ruolo-strategico-di-cbi-RB103961b ; https://www.cbiglobe.com/Il-servizio/CBI-Globe | 2026-05 / live | medium | >700M API calls; 200+ TPPs; 0.13% of online transfers; >80% of industry federated |
| NEW-9 | Osservatorio Fintech & Insurtech PoliMi (programme and client-evolution report pages) | https://www.osservatori.net/report/fintech-insurtech/evoluzione-clienti-fintech-insurtech/ ; https://www.osservatori.net/fintech-insurtech/ | 2025 | medium (report not read) | No PFM-usage share found (UNKNOWN) |
| NEW-10 | CorCom / Osservatorio press release: 12.7M Italians (29% of 18–74) use ≥1 fintech/insurtech service; Il Sole 24 Ore "Un italiano su tre" | https://www.corrierecomunicazioni.it/finance/fintech-alla-conquista-ditalia-servizi-online-per-13-milioni-di-utenti/ ; https://www.osservatori.net/it/ricerche/comunicati-stampa/il-digitale-investe-finanza-e-assicurazioni-12-7-milioni-di-italiani-utilizzano-servizi-fintech-e-insurtech ; https://www.ilsole24ore.com/art/un-italiano-tre-utilizza-servizi-fintech-meno-digitali-pmi-ACeRgL4 | undated in snippet (likely 2019; stale) | low-medium | Fintech usage order of magnitude |

**Search log for this document:** 10 WebSearch queries executed on 2026-10-02 (Italian current accounts; payment cards; ECB SPACE Italy; open-banking adoption/CRIF; Postepay cards; Revolut Italy customers; XME Banks functionality; CBI Globe volumes; Osservatorio PFM usage; Osservatorio 13M users). WebFetch not attempted (blocked per the raw notes).

End of document.
