# Competitor analysis: UK/EU personal finance management (PFM) apps

**Project:** LILLERI (greenfield consumer PFM, Italy-first then Europe)
**Research date / verification date for every claim:** 2026-10-02
**Author:** specialist researcher sub-agent (web search only; WebFetch egress-blocked on every domain attempted)
**Adversarial verification passes:** two on 2026-10-02. **Pass 1** (tags **[AV]**) could not run web searches and relied on aggregator documentation, cross-document triangulation and labelled model recall; its notes are kept below as "Verification notes (adversarial pass 1 — search-less, partly superseded)". **Pass 2** (tags **[AV2]**, this version) re-ran the checks with **40 fresh WebSearch queries** (WebFetch still blocked) and is authoritative where the two disagree — see the final section "Verification notes (adversarial pass)". Headline changes from pass 2: Finanzguru has **>3M users** (not 500k) and its monthly price is now **€4.29**; Snoop Plus is now **£5.99/£47.99**; Spendee Premium is now **$5.99/$35.99**; Plum's Italian legacy Pro is **€3.99** (not €2.00); Wallet's Italian App Store price is **€5.99** not €4.49; Dyme Silver is **€4.99** not €6.99; the Emma "£5.99" conflict is resolved (it is the Ultimate extra-member price); the Bankin'–Casino ownership claim that pass 1 called "probably erroneous" is **confirmed**; Linxo is **100 % Crédit Agricole Payment Services since 2025** with Oxlin dating from 2018 (not 2021) and a Linxo Lab Premium tier launched Sept 2026; Toshl's Medici requirement for *all* bank connections is confirmed; the Finanzguru–finAPI link was **not found** and is downgraded to HYPOTHESIS.

## Scope note

This document profiles the UK/EU PFM apps named in the brief (Emma, Snoop, Plum, Moneyhub, Spendee, Wallet by BudgetBakers, MoneyWiz, Money Pro, Toshl, Finanzguru, Outbank, Bankin', Linxo, Fintonic, Buddy, Monefy, Cleo) plus other EU open-banking PFMs surfaced by search in English, German, French, Spanish and Italian (Dyme, Finanzfluss Copilot, Fast Budget, Fabrick, Spiir, Grip, Yolt, Oval Money). For each product the brief's ~45 attributes are covered in a profile table; where no evidence was found the cell says **UNKNOWN** and the "How to verify" column says what to do. Every variable claim carries a status label (**FACT** = directly supported by a cited source; **ASSUMPTION** = reasonable inference from a source; **HYPOTHESIS** = our interpretation, not evidenced; **UNKNOWN** = not found), a source reference (S-nn, resolved in the Sources table at the end), the source's visible publication date (or "n/d" when the snippet did not show one), and a reliability grade (high = official/primary; medium = reputable secondary; low = blog/forum/affiliate-review site/unclear). Numbers quoted from search-engine snippets may be stale; the snippet date seen is noted. Marketing copy is paraphrased, never copied beyond short quotes. Important method limitation: the session's web-search budget was exhausted after 47 successful queries (14 further queries were refused), and all four WebFetch attempts to official help centres (Plum, BudgetBakers, Finanzguru, Emma) returned EGRESS_BLOCKED, so several feature-level cells (sync cadence, split transactions, refund matching, export formats) could not be confirmed and are marked UNKNOWN rather than guessed.

---

## 1. Executive summary (decision-relevant findings)

1. **Nobody in the named set serves Italy well with a full PFM.** Emma is UK/US/CA only and explicitly cannot connect EU banks (FACT, S-19, high). Snoop, Moneyhub and Cleo-UK are UK-only. Finanzguru/Outbank are DACH; Bankin'/Linxo are France-centric; Fintonic is Spain. The only products that connect Italian banks are the Salt Edge-based "generic" trackers (Wallet by BudgetBakers, Spendee, MoneyWiz, Money Pro, Toshl, Fast Budget) and Plum (savings/invest app, in Italy since Jan 2023, with a 3.4/5 Italian App Store rating dominated by bank-linking complaints) (FACT, S-11, S-27, medium). This is the gap Lilleri's promise targets.
2. **The dominant recurring complaint across every open-banking app is the same: connections break, re-authentication is frequent and confusing, and categorisation "does not learn".** Emma (Trustpilot ~3.5, 22% "bad", bank connection and categorisation themes, S-20), Snoop (Trustpilot 3.2, categorisation sums "bore no relation to reality", S-22), Wallet (44% one-star, "bank sync broken since Dec 2024", "support non-existent", S-38), Spendee ("sync almost never works", S-13), Finanzguru (re-auth "sometimes monthly", wrong categories for small merchants, S-24), Bankin' (random sync failures, wrong budget maths, fluctuating forecast, S-33), Fintonic (entities permanently disconnected, cannot export since Aug 2025, S-18), Linxo (connectivity issues taking months, S-17). Reconciliation quality, not feature count, is the open opportunity.
3. **The market is consolidating or exiting D2C.** Moneyhub closed its consumer app (announced Feb 2025; final sunset 31 July 2026; ~36 roles cut), Spiir (DK, ~1M users, Mastercard-owned) shut 8 June 2026, Yolt (ING) closed 2021/2023, Grip (ABN AMRO) closed Dec 2022, Oval Money (IT/UK) closed May 2023, Cleo left the UK in 2020 and only relaunched Feb 2026, Fintonic pivoted to credit scoring/consumer lending, Snoop was absorbed by Vanquis Banking Group (July 2023). (FACTS, S-07, S-08, S-45, S-47, S-50, S-48, S-16, S-18, S-06.) Pure subscription PFM with no lending/investing/affiliate rail has been hard to sustain in Europe; survivors monetise via subscriptions **plus** affiliate/commission (Snoop, Finanzguru ~70% of revenue from commissions, Emma cashback/invest/interest) or investment/savings AUM (Plum, ~£3bn AUM, profitable Jan 2026). **[AV2]** The survivors are larger than the first draft implied: Finanzguru reports **>3 million users and ~€40m revenue for 2025** (Manager Magazin figures, Jan 2026, S-68), Emma states **>3 million users** and was profitable on £5.7m 2024 revenue (S-64, S-65), Cleo reports ~$150m ARR (S-76). Bankin' B2C has been **owned by Groupe Casino since the 2022 split** (S-72) and Linxo is 100 % Crédit Agricole Payment Services since 2025 (S-73) — i.e. the two French PFMs survive as corporate subsidiaries, not as independent subscription businesses.
4. **EU pricing anchors (re-verified 2026-10-02 [AV2]):** Finanzguru Plus **€4.29/mo monthly (from 1 Sep 2026) or ≈€2.99/mo billed annually** (S-69; the earlier "€2.99 regular, €29.99/yr" figure is 2025 and now stale), Outbank €3.99/mo or €39.99/yr (confirmed, official helpdesk S-77; Business plan €9.99/€99.99), Bankin' Plus €4.99/mo or €39.99/yr (confirmed, official support S-78), Linxo Premium **€4.49/mo** or €29.99/yr (S-79; a Linxo Lab Premium tier launched Sept 2026), Wallet **€5.99 (Italian App Store in-app purchase, likely monthly; €29.99 likely yearly)** — the earlier €4.49 was unsupported (S-74), Plum legacy EU in Italy **Pro €3.99 / Premium €9.99** (withplum.com/it-it, S-66; the help-centre's generic "€2.00" is not what Italian users see), Dyme **Silver €4.99** / Gold €9.99 (S-80; earlier €6.99 was wrong), Finanzfluss Copilot Plus €8.99 (not re-checked). UK anchors: Emma Plus £4.99 / Pro £9.99 / Ultimate £14.99 **confirmed** on the official plans page (S-63; the Which? "£5.99" is the Ultimate *extra-member* price, conflict resolved), Snoop Plus **£5.99/mo or £47.99/yr (official snoop.app/plus, May 2026, S-70 — up from £4.99/£39.99)**, Plum £3.99/£7.99/£14.99 (confirmed, S-66), Cleo UK Pro £12.99/mo (official, S-76). Net: the "Plus" anchor has drifted **up** during 2025–26 — monthly prices now cluster at **€3.99–€5.99 / £4.99–£5.99**, annual-equivalents at €2.50–€3.99. A €3–5/month "Plus" tier with a genuinely useful free tier remains the market norm; >€9/month only sustains where there are tangible perks (Plum Max, Dyme Gold, Cleo Pro's cash features).
5. **PSD2 consent UX is a live problem:** the EBA moved the SCA exemption from 90 to 180 days (EBA final report 5 Apr 2022; Commission Delegated Regulation (EU) 2022/2360 published in the Official Journal 5 Dec 2022; ASPSPs had to apply it by 25 July 2023 — dates corrected [AV], S-59), but aggregators' default EULAs (Salt Edge, GoCardless) and the apps' own help pages (Finanzguru, Emma UK) still describe 90-day renewals, and BudgetBakers tells users consent lasts "1–6 months depending on your bank" (FACTS, S-25, S-26, S-24, S-21). Users experience this as unpredictable breakage. No app in the set was found to have a distinctive, well-reviewed renewal UX; this is an open design opportunity.

---

## 2. Comparison matrix (headline facts)

| Product | HQ / markets | Italian banks? | Aggregator(s) | Free tier | Paid (local currency) | Monetisation beyond subs | Status 2024–26 |
|---|---|---|---|---|---|---|---|
| Emma | UK; UK, US, CA | **No** (FACT S-19, re-read 2026-10-02 [AV2]) | TrueLayer; Salt Edge (UK coverage) (FACT S-04, S-05) | Yes (2 bank logins per review S-02) | Plus £4.99/mo (£41.99/yr); Pro £9.99 (£83.99/yr); Ultimate £14.99 (£124.99/yr) (FACT, official plans page S-63 + S-03, 2026 [AV2]; Which?'s "£5.99" = Ultimate extra-member price, S-63) | Cashback, affiliate, Emma Invest AUM fee, interest on cash | Active; **>3m users** (emma-app.com 2026, S-64); profitable, £5.7m revenue 2024 (S-65) [AV2] |
| Snoop | UK only | No | Tink (privacy policy, FACT S-22; **re-confirmed 2026-10-02** on snoop.app, S-71 [AV2]) | Yes | Snoop Plus **£5.99/mo or £47.99/yr** (official snoop.app/plus, May 2026, S-70 [AV2]; was £4.99/£39.99) | Switching commissions, anonymised data, subs | Acquired by Vanquis 31 Jul 2023; savings account Jan 2025; 2026 reviews cite slow savings deposits/withdrawals (S-70) |
| Plum | UK; 10 EU markets incl. Italy | **Yes** (since Jan 2023; Italian App Store listing live 2026-10-02, 3.4/5 from 150 reviews, S-11) | TrueLayer, Tink, Finker (privacy policy FACT S-28) | Basic free | UK (post 7 Jul 2025): Plus £3.99, Boost £7.99, Max £14.99 (confirmed S-66 [AV2]); **Italy (legacy): Pro €3.99, Premium €9.99** (withplum.com/it-it/subscriptions, S-66 [AV2]; the help-centre's generic "Pro €2.00" is not the Italian price) | AUM/asset income, transaction revenue, subs | Profitable Jan 2026 (announced 28 Apr 2026, S-67), ARR £34m, £3.1bn AUM, 5m+ downloads; Crowdcube raise May 2026 (S-67) [AV2] |
| Moneyhub (D2C) | UK | No | Own platform | 6 months free | £1.49/mo or £14.99/yr | None (no data selling) | **Closed** D2C (announced Feb 2025; sunset 31 Jul 2026) |
| Spendee | CZ; global | Yes via Salt Edge | Salt Edge | Basic free | Plus $1.99/mo ($14.99/yr); **Premium $5.99/mo ($35.99/yr)** (official help centre / spendee.com/pricing 2026, S-75 [AV2]; the $2.99/$22.99 figure is stale); EUR UNKNOWN | None found | Active, independent |
| Wallet (BudgetBakers) | CZ; global, strong EU | Yes via Salt Edge | Salt Edge (FACT S-37) | Yes (limited) | Italian App Store in-app purchases: **Premium €5.99 / €17.99 / €29.99, Lifetime, 3-Year €59.99** (periods unlabelled; €5.99 ≈ monthly, €29.99 ≈ yearly — ASSUMPTION on periods, FACT on amounts, S-74 [AV2]). BudgetBakers says prices vary by country/platform (S-74). The earlier "~€4.49" (S-36b) is **not supported** and removed as an anchor. | None found | Active; heavy sync complaints since Dec 2024 |
| MoneyWiz | (SilverWiz) global | Yes via Salt Edge Partner | Salt Edge Partner (EEA), Salt Edge Original, Plaid (US/CA) (FACT S-40) | No (trial) | Premium $4.99/mo or $49.99/yr; Standard $19.99/yr | None | Active; user anger over subscription/iCloud changes |
| Money Pro (iBear) | global | Yes via Salt Edge (GOLD) | Plaid or Salt Edge (FACT S-41) | Limited | Basic $12.99/yr; Plus $29.99/yr; Gold $69.99/yr | None | Active; forced-subscription backlash |
| Toshl | SI; global | **Yes** — Italy named among 60 countries with bank connections (toshl.com, FACT S-81 [AV2]) | Salt Edge (most of world), Plaid (US/CA, some UK/FR/ES) (FACT S-14, S-81) | Yes (2 accounts, 2 budgets) | Pro $2.99/mo or $19.99/yr; **Medici $4.99/mo or $3.33/mo billed yearly — required for *all* automatic bank connections, any country** (FACT, toshl.com S-81 [AV2]; the "US/CA only" wording was the reviewer's) | None | Active |
| Finanzguru | DE | No (DE; AT UNKNOWN) | Operator dwins GmbH is BaFin-registered as a payment institution / Kontoinformationsdienst (ID 152148) and its help centre describes direct XS2A (current accounts) and FinTS (cards, savings, depots) interfaces (FACT, S-82 [AV2]). **finAPI as technical provider: HYPOTHESIS only — no source found in 40 searches** (downgraded from pass-1 ASSUMPTION [AV2]) | Yes (generous) | Plus **€4.29/mo monthly (from 1 Sep 2026) or ≈€2.99/mo billed annually** (S-69 [AV2]); 2025 sources: €2.99 regular, tests €0.99–€4.99, €29.99/yr (S-15, stale) | Insurance/contract commissions (~70% of revenue 2022) | Active; **>3M users, ~€40m revenue 2025** (Manager Magazin via S-68, Jan 2026 [AV2]); Deutsche Bank **~16 %**, coparion ~16 %, PayPal Ventures ~8 % (2025, S-68); Toni Kroos ad campaign 2026 (S-68) |
| Outbank | DE; DE/AT/CH | No | UNKNOWN (own + PSD2) | 14-day trial only | €3.99/mo or €39.99/yr (confirmed on official helpdesk 2026, S-77 [AV2]); Business €9.99/mo or €99.99/yr | None found | Owned by FP Finanzpartner AG since 2021 |
| Bankin' | FR; FR (+ES, DE, UK claimed) | No evidence | Bridge (ex in-house, ASSUMPTION) | Yes | Plus €4.99/mo or €39.99/yr (confirmed, official support S-78 [AV2]); Pro from €8.33/mo | Cashback, product offers; consumer-credit tie-up with Banque Casino (S-72) | Bridge split off 2022; **B2C Bankin' owned by Groupe Casino — FACT**: Casino invested €20m for a minority stake in 2019 and took full control of the B2C entity at the 2022 split (mind.eu.com, journaldunet, planet-fintech, S-72 [AV2]). Post-2024 status after Casino's own debt restructuring (Kretinsky consortium) UNKNOWN; a Nov 2025 legal notice records a capital change at Perspecteev (S-72). |
| Linxo / Linxo Lab | FR (Crédit Agricole Payment Services, **100 % since 2025**, S-73 [AV2]) | No evidence | In-group: **Oxlin**, the DSP2-licensed open-banking subsidiary created in the 2018 Linxo Group reorganisation (FACT on structure, S-73 [AV2]; that the B2C app runs on it remains ASSUMPTION) | Yes; Linxo Lab free — **but a Lab Premium tier launched Sept 2026** (S-79, medium-low [AV2]) | Premium **€4.49/mo** or €29.99/yr (S-79 [AV2]) | None found | Two apps coexist; B2B+B2C unified under one "Linxo" brand in 2025; CEO Laurent Gastinel (since 2024) targets profitability by 2028 and growth *outside* the group's captive demand (S-73) |
| Fintonic | ES | No | UNKNOWN (own; Bank of Spain AISP) | Yes (100% free) | Premium UNKNOWN | Loans, insurance (pivot) | Restructured Apr 2025; profitable 2025; pivot to credit |
| Buddy | UNKNOWN (believed Nordic, ASSUMPTION) | UNKNOWN | UNKNOWN | Yes | Premium $9.99/mo or $49.99/yr | None | Active |
| Monefy | global | N/A (manual only) | None | Yes | $59.99–69.99/yr (intro $34.99) | None | Moved from one-time purchase to subscription (backlash) |
| Cleo | UK/US | No | UNKNOWN (UK) | Yes (chat/budget/roast) | US: Plus $5.99, Pro $8.99, Builder $14.99; **UK Pro £12.99/mo** (official pricing page + UK Pro T&Cs, S-76 [AV2]) | Cash advance, express fees | FTC $17m settlement 27 Mar 2025; UK relaunch Feb 2026 (confirmed, Finextra/PR Newswire S-76 [AV2]); ~$150m ARR (Sifted, S-76) |

---

## 3. Product profiles

Legend for each row: **Status** · evidence (source id, date seen, reliability) · doubts.

### 3.1 Emma (Emma Technologies Ltd, London)

| Attribute | Finding |
|---|---|
| Target users | Multi-account UK consumers wanting an aggregated view, budgeting, subscription control; upsell into investing/saving. **ASSUMPTION** from feature set (S-02, S-03; medium). |
| Markets | UK, US, Canada. Explicitly cannot connect banks outside these. **FACT** (S-19 official help "Which countries is Emma available in?", n/d; high). A community thread requests European bank support (S-19b). **[AV]** Attempted refutation found no contrary evidence: consistent with Emma's published footprint through mid-2026 (model recall, S-62) and with user-pain-points.md I-1 (same source, not independent). **[AV2] Confirmed by fresh search (2026-10-02):** the official help centre still states "Emma is currently live in the UK, US & Canada" and "is unable to support connections to banks outside the UK, US and Canada"; a sister article "I can see the wrong country's banks (UK/US/Canada)" and the "move abroad" article confirm no EU market (S-19, S-63). FACT, high. |
| Onboarding / steps to first value | UNKNOWN (store screenshots not fetchable). Reviews imply: sign up → connect bank via Open Banking → automatic categorisation and spending notifications. **ASSUMPTION** (S-02). How to verify: install UK build. |
| UX highlights | Aggregated multi-account view; "true balance" (what's left to spend) on Plus; Spaces (sub-budgets) on Ultimate. **FACT** (S-02 Which?, 2026; medium). |
| Bank connection / aggregator | TrueLayer (named customer story; first to use TrueLayer–Revolut integration) **FACT** (S-04, n/d; high-official vendor blog). Salt Edge partnership to extend UK bank coverage "and eventually expand to new countries" **FACT** (S-05 Finextra press release, n/d; medium). Emma holds FCA AISP permission **FACT** (S-05). |
| Sync frequency | UNKNOWN. Verify via help centre "How often does Emma sync". |
| Categorisation approach | Automatic; learns from the user: after three or more edits to similar transactions it remembers and applies the edit to future ones. **FACT** (S-21 official help, n/d; high). Reviewers still say it "doesn't seem to ever learn" **FACT** (S-20 Trustpilot digest; low-medium). |
| Custom categories | Pro and Ultimate only. **FACT** (S-21; high). |
| Rules engine | "Budgeting rules that automatically classify transactions" on Pro. **FACT** (S-21; high). Bulk "Advanced transactions editing" (category, date, name, tags for many transactions at once) **FACT** (S-21). |
| Automation level | Medium: auto-categorise + learn-after-3 + Pro rules. **ASSUMPTION**. |
| Recurring / subscription detection | Yes; bill reminders on Plus; subscription tracking is a core marketing feature. **FACT** (S-02, S-03; medium). |
| Merchant normalisation / logos | UNKNOWN (likely merchant names normalised; "Select All by merchant" implies merchant grouping). **ASSUMPTION** (S-21). |
| Search | UNKNOWN. |
| Transaction review flow | Change category per transaction; apply to all from same merchant; bulk edit. **FACT** (S-21). No evidence of a dedicated "review inbox". |
| Split transactions | UNKNOWN. |
| Internal transfer detection | UNKNOWN. |
| Refund handling | UNKNOWN. |
| Cash handling | Offline/manual accounts on Pro ("track spending in any offline accounts"). **FACT** (S-02). |
| Budgets | Yes; category budgets; Spaces for granular budgets (Ultimate). **FACT** (S-02). |
| Forecasting / cash flow | "True balance" (Plus) is a left-to-spend projection; full cash-flow forecast UNKNOWN. **FACT/ASSUMPTION** (S-02). |
| Net worth | Pro: net worth over time. **FACT** (S-02). |
| Goals | Emma Pots (savings pots earning interest, via Bondsmith). **FACT** (S-22b official blog; high). |
| Notifications | Spending notifications in free tier. **FACT** (S-02). |
| Anomaly alerts | Fraud/data-breach detection alerts on Plus (credentials found in breach). **FACT** (S-02). Spending anomaly alerts UNKNOWN. |
| Shared finances / couples | UNKNOWN (no evidence of shared budgets). |
| Receipt scanning | UNKNOWN (no evidence). |
| Import / export | UNKNOWN. |
| Web app | UNKNOWN (believed mobile-first). |
| Mobile platforms | iOS, Android. **FACT** (S-02a App Store listing). |
| Pricing (GBP, seen 2026-10-02) | Plus £4.99/mo or £41.99/yr; Pro £9.99/mo or £83.99/yr; Ultimate £14.99/mo or £124.99/yr; annual ≈30% off. **FACT** (S-03 official help page snippet + S-01 review; high/medium). **Conflict:** Which? (S-02, 2026) lists Plus at £5.99/mo. Doubt: Emma may run regional/price tests. EUR pricing: N/A (not sold in EU). **[AV]** Not resolvable this pass (no fresh search possible). The £4.99/£9.99/£14.99 ladder matches the 2024–25 published prices (model recall, S-62), so £5.99 may be a 2026 increase. Status downgraded to **FACT (2024–25) / UNKNOWN (current)**; re-read S-03 before using in pricing decisions. **[AV2] Resolved:** Emma's official "Compare Emma Plans" page and the help article (S-63, S-03) plus four 2026 reviews (householdmoneysaving, thefinancialwilderness, coolcuration, money to the masses) all give Plus £4.99 / Pro £9.99 / Ultimate £14.99 with ~30 % off annually. The "£5.99/month" figure is Emma's price **per extra member added to an Ultimate plan** (help article "What are Emma Extra Members?", S-63); Which? appears to have conflated the two. Status restored to **FACT (current, 2026)**, high. |
| Paywall structure | Feature-gated tiers: bank-login count (2 free → 4 Plus → unlimited Pro), custom categories/rules/net worth/offline accounts (Pro), business accounts/Spaces (Ultimate). Free trials auto-convert. **FACT** (S-02, S-20). |
| Free tier limits | 2 bank connections; standard categorisation; notifications; pots. **FACT** (S-02; medium). |
| Advertising | No display ads found; in-app "offers"/cashback deals act as sponsored content. **ASSUMPTION** (S-22c). |
| Affiliate / marketplace revenue | Cashback via partner links (double cashback for Pro); affiliate program paying per trial; Emma Invest AUM fee 0.10% (Ultimate) to 0.60% (Basic); interest on uninvested cash via Bondsmith. **FACT** (S-22b, S-22c, S-22d; high-official). |
| Retention mechanisms | Pots with interest, invest, cashback, subscription tiers tied to login count. **ASSUMPTION**. |
| Strengths | Breadth of aggregation, true balance, learning after repeated edits, rules on Pro. |
| Weaknesses | No EU; paywall on custom categories; trial auto-charge complaints. |
| Recurring negative themes | Unwanted charges after trial/cancellation friction (one user charged £83.99 after cancelling trial); broken bank connections; categorisation not learning. **FACT** (S-20 Trustpilot pages, n/d; low-medium). Trustpilot ~3.5/5 over 500+ reviews, 22% "bad" (snippet; may be stale). |
| Most loved | One place for all accounts; easy to use. **FACT** (S-20). |
| Most frequent problems | Connection drops; subscription billing. **FACT** (S-20). |
| Users / scale | "More than 1.3m customers across UK, US and Canada" **FACT** (S-22a, n/d; medium; stale). **[AV2]** emma-app.com now states "more than 3 million people use Emma" (2026, S-64; company claim, medium). |
| News 2024–26 | **[AV2]** Emma is profitable; revenue £5.7m in 2024, compounding for three years, driven by paywall + social ads (CEO Edoardo Moreni on Fintech Growth Insider podcast, S-65; medium). Total funding ~$7.6m over 3 rounds (Tracxn, S-65). A data aggregator lists a "$2.5m seed, January 2026" — **UNKNOWN/low** (date looks like a mis-filed 2018 round; do not cite). Bondsmith interest-pots partnership (S-22b, n/d). |
| PSD2/Open Banking consent UX | Help centre: renew access every 90 days; each renewal restarts the 90 days (UK re-consent model). **FACT** (S-21, high). |

### 3.2 Snoop (Snoop App Ltd, Norwich; owned by Vanquis Banking Group)

| Attribute | Finding |
|---|---|
| Target users | UK mass-market consumers who want free money-saving nudges ("Snoops") on bills and subscriptions. **FACT** (S-06, S-09; medium). |
| Markets | UK only. **FACT** (S-09). |
| Onboarding | Reviews call it "quick to set up"; sign-up → connect accounts via Open Banking → feed of Snoops. **ASSUMPTION** (S-09 nutsaboutmoney 2025; low-medium). Steps count UNKNOWN. |
| UX highlights | Personalised feed of tips, price comparisons, alerts on forgotten subscriptions and bill spikes. **FACT** (S-09a Open Banking Ltd article; medium-high). |
| Bank connection / aggregator | **Tink** is listed in Snoop's privacy policy as "Open Banking data aggregator and payment provider". **FACT** (S-22 snoop.app privacy policy, n/d; high). Read-only access; FCA-regulated. **FACT** (S-09). **[AV]** Could not be re-read this pass (snoop.app egress-denied); the provider may have changed after the Vanquis acquisition — treat as FACT *as of the policy version seen*, not as current. **[AV2] Re-confirmed 2026-10-02** by a site-restricted search of snoop.app: the privacy policy names "Tink … Snoop's open banking data aggregator and payment provider, located in the EEA" and snoop.app/open-banking says Snoop connects to UK banks "through Tink's open banking technology"; Snoop's terms/privacy history page shows a Nov 2024 revision, so this is the post-Vanquis policy (S-71). FACT, high, current. |
| Sync frequency | UNKNOWN. |
| Categorisation | Automatic; accuracy criticised (one-off vs regular not distinguished; Amazon needs manual recategorising). **FACT** (S-22, S-09; low-medium). Learning from corrections: UNKNOWN. |
| Custom categories | Unlimited custom categories only on Snoop Plus. **FACT** (S-09 finder; medium). |
| Rules engine | UNKNOWN. |
| Automation level | Medium (auto categorisation + automated insights feed). **ASSUMPTION**. |
| Recurring / subscription detection | Yes: forgotten subscriptions, unexpectedly high bills; core feature. **FACT** (S-09a). |
| Merchant normalisation / logos | UNKNOWN. |
| Search | UNKNOWN. |
| Review flow | Recategorise per transaction. **ASSUMPTION** (S-22). |
| Split / transfer / refund / cash | UNKNOWN; manual accounts on Plus. **FACT** (S-09). |
| Budgets | Yes (free). **FACT** (S-09). Spending reports on Plus. |
| Forecasting | UNKNOWN. |
| Net worth / goals | UNKNOWN; savings account launched Jan 2025 (via Vanquis) **FACT** (S-06 snippet; medium). |
| Notifications / anomaly alerts | Yes: spending alerts, bill-spike alerts. **FACT** (S-09a). |
| Shared / receipts / import-export / web | UNKNOWN. |
| Mobile | iOS, Android. **FACT** (S-09). |
| Pricing | Free; Snoop Plus £4.99/mo or £39.99/yr. **FACT (2025, stale)** (S-09 finder, 2025; medium). **[AV2] Corrected:** Snoop's own Plus page (snoop.app/plus, seen as of 12 May 2026), its Zendesk article "How much does it cost?" and trysnowball/walletsavvy 2026 reviews give **£5.99/mo or £47.99/yr** — a ~20 % increase since the finder review (S-70; high). |
| Paywall / free limits | Plus adds unlimited custom categories, spending reports, manual accounts; reviewers say free covers most needs. **FACT** (S-09, S-09b). |
| Advertising | Feed contains commercial switching offers (commission-bearing), disclosed. **FACT** (S-23 lovemoney/upthegains; medium). |
| Affiliate revenue | Commissions when users switch energy, mobile, broadband/TV, life insurance; anonymised aggregated data sold for trend insights; Plus subs. **FACT** (S-23; medium). |
| Retention | Daily feed, alerts, savings account. **ASSUMPTION**. |
| Strengths | Free, fast, actionable; strong App Store rating (4.6 from 6,900+ reviews, snippet). |
| Weaknesses | Categorisation accuracy; UI text overlap reports; Trustpilot 3.2/5. **FACT** (S-22; low-medium). |
| News | Founded 2019 (Jayne-Anne Gadhia, John Natalizia), launched April 2020, acquired by Vanquis Banking Group 31 July 2023 (undisclosed sum). **FACT** (S-06 uktech/tech.eu/thepaypers, 2023; medium). "1 million downloads" **FACT** (S-23a, n/d). **[AV]** Acquisition date consistent with model recall (announced 31 Jul 2023) — confirmed. |
| Consent renewal UX | UNKNOWN (UK 90-day re-consent applies by regulation). |

### 3.3 Plum (Plum Fintech Ltd, London)

| Attribute | Finding |
|---|---|
| Target users | People who want automatic saving/investing with light PFM; 18–40 mobile-first. **ASSUMPTION** (S-10, S-29). |
| Markets | UK + France, Spain, Ireland, Belgium (earlier) + Italy, Portugal, Netherlands, Greece, Cyprus (added Jan 2023) = 10 markets. **FACT** (S-27 TechCrunch/uktech 24 Jan 2023; high-medium). "2 million customers across 10 European markets" (S-29, n/d). **[AV]** The Jan 2023 five-country expansion including Italy is consistent with model recall of the TechCrunch report (S-62) — confirmed. |
| Onboarding | Connect bank → AI analyses income/spend → auto-saves calculated amounts. **FACT** (S-27). Steps UNKNOWN. |
| UX highlights | Autosave rules, round-ups, pockets; subscription perks (travel insurance, VPN, discounts) added to paid plans. **FACT** (S-29 financefeeds 2026; medium). |
| Aggregators | TrueLayer (Ireland) Ltd, Tink AB, ITBS Finance SMPC ("Finker") per Irish privacy policy. **FACT** (S-28 withplum.com legal, n/d; high). Logins forwarded to TrueLayer, read-only. |
| Sync frequency | UNKNOWN. |
| Categorisation / learning / custom categories / rules | Spending analysis exists; details UNKNOWN (search budget exhausted before feature query ran). |
| Recurring detection | UNKNOWN (likely in spending analysis). |
| Budgets / forecasting / net worth | UNKNOWN; investment and pension views exist. |
| Goals | Yes (pockets/goals). **ASSUMPTION** (S-10). |
| Shared / receipts / export / web | UNKNOWN. |
| Mobile | iOS, Android (Italian store listing "Plum - Risparmi e investimenti"). **FACT** (S-11). |
| Pricing | UK (from 7 July 2025): Basic free, Plus £3.99, Boost £7.99, Max £14.99. Legacy (registered before 7 July 2025 or outside UK): Basic free, Pro £2.99/€2.00, Ultra £4.99 (UK only), Premium £9.99/€9.99. **FACT** (S-10 official help articles, 2025; high). EU users therefore remain on legacy €2.00/€9.99 (ASSUMPTION based on "outside UK" wording). **[AV]** Doubt: €2.00 for Pro is unusually low against the £2.99 UK legacy price and may be a snippet-truncation of €2.99 or a promotional figure; the 7 Jul 2025 re-pricing itself could not be re-verified. Treat the EU prices as **ASSUMPTION** until read in the Italian App Store. **[AV2] Resolved:** (a) the 7 Jul 2025 UK re-pricing and the Plus £3.99 / Boost £7.99 / Max £14.99 ladder are confirmed by Plum's "New Subscriptions – Comparison Table" help article, Forbes Advisor UK and upthegains (2026) — Plus gives 3.10 % AER pockets, 12 funds/1,200 stocks; Boost adds the Plum Visa card; Max adds a 95-day notice pocket (3.87 % AER), 3,000 stocks, price alerts, recurring buys; all paid tiers have a 30-day trial (S-66, high). (b) The help-centre legacy article does literally say "Pro (£2.99/€2.00)", but Plum's **Italian** subscriptions page (withplum.com/it-it/subscriptions) prices **Pro at €3.99/mo and Premium at €9.99/mo** for Italian users (S-66, high). So the Italian anchor is **€3.99**, not €2.00; €2.00 may apply to another EU market or be stale. Italian prices: **FACT** (official IT page). |
| Paywall | Tiers gate interest rates, investing options, perks. **ASSUMPTION** (S-10). |
| Advertising / affiliate | Discounts/perks within subscription; asset-based and transaction revenue. **FACT** (S-29). |
| Retention | Autosaving creates balance lock-in; perks bundle. **ASSUMPTION**. |
| Strengths | Scale, profitability, multi-country, three aggregators (resilience). |
| Weaknesses (Italy) | Italian App Store 3.4/5 (150 reviews): cannot link/change bank, blocked withdrawals due to link problems, unhelpful support (mixed). **FACT** (S-11 App Store IT snippet, n/d; medium). |
| News 2024–26 | Debt financing aimed at profitability by 2025 (S-29a therecursive, n/d); £16m Series B (S-29b, n/d); operational profitability Jan 2026, ARR £34m, >60% growth, ~£3bn AUM, 5m+ downloads (S-29 financefeeds/ffnews, 2026; medium). **[AV]** Unverifiable this pass: the three outlets appear to quote one company release, so this is one source, not three; keep FACT (company-reported) and do not treat the AUM/ARR as audited. **[AV2] Confirmed and dated:** the profitability release was carried by UKTN on **28 Apr 2026**, Finextra (press article 109618), FFnews, BusinessCloud and futureofbanking.info — operational profitability (first positive EBITDA) reached **January 2026**, 60 %+ YoY growth, **£34m ARR**, **£3.1bn** assets under management/advice, >5m downloads (S-67; company-reported, medium-high). Follow-on: Plum opened a **Crowdcube** community raise in May 2026 (crowdfundinsider, S-67). Earlier: £16m Series B with AUM tripled to £1bn in a year (financemagnates, S-29b). |
| Consent renewal UX | UNKNOWN. Italian complaints about re-linking suggest friction. **HYPOTHESIS**. |

### 3.4 Moneyhub (UK) — consumer app closed

| Attribute | Finding |
|---|---|
| Status | D2C app exit announced Feb 2025 (tech.eu 14 Feb 2025: 36 roles, ~30% of workforce, cut; backed by Lloyds and L&G); no new customers; app sunset **31 July 2026** per help-centre update of 30 June 2026; users could migrate to **WPS LifeStage** (WPS Advisory, same platform) — >10,000 did — or export CSV and delete; remaining data deleted under GDPR. **FACT** (S-07 tech.eu 2025, S-08 Moneyhub help centre 2026, S-08a crestcast 2026; high/medium). **Conflicts:** householdmoneysaving says it "quietly closed access for retail users in early 2025"; one blog cites an "Aug 14 deadline". Treat 31 July 2026 (official) as authoritative. **[AV]** The Feb 2025 D2C-exit announcement and job cuts are consistent with model recall (S-62) — confirmed; the sunset date and WPS LifeStage migration rest on the official help centre (S-08) alone and could not be re-read. **[AV2] Confirmed by fresh search:** the official help article (S-08) and five independent 2026 UK write-ups (paybacker, crestcast, getwealthly, moola-money, wealthr) agree the app was sunset on **31 July 2026**, that >10,000 users migrated to **WPS LifeStage** (same Moneyhub platform underneath, new provider/branding), that LifeStage went live on **3 Aug 2026**, and that un-actioned accounts were deleted under GDPR (S-83). The "**14 August 2026**" date (wealthr, aureli) is a secondary-source data-deletion deadline that contradicts the official "deleted where no action by 31 July"; crestcast explicitly titles its piece "Closed on 31 July 2026, Not August". Treat 31 Jul (official) as authoritative; 14 Aug = UNKNOWN/low. |
| Pricing before closure | £1.49/mo or £14.99/yr; 6 months free, no auto-renewal; justified by "we don't sell your data". **FACT** (S-07a householdmoneysaving; low-medium). **[AV]** Matches the long-published Moneyhub consumer price (model recall, S-62) — confirmed. |
| Lessons | Loved for value, reliability, all-assets view (Smart Money People reviews, S-07b). Still could not justify D2C versus enterprise. **FACT/HYPOTHESIS**. |
| Everything else | Not researched further (defunct). Export format at closure: CSV. **FACT** (S-08). |

### 3.5 Spendee (Spendee s.r.o., Prague)

| Attribute | Finding |
|---|---|
| Target users | Individuals and families wanting a visual tracker with optional bank sync and shared wallets; popular in Italy per Italian guides. **FACT/low** (S-12 money.it etc., 2025–26). |
| Markets | Global; Italian localisation praised. **FACT** (S-12; low). |
| Onboarding | UNKNOWN. Italian user: 3 weeks to get bank connected. **FACT** (S-13a App Store IT; low-medium). |
| Aggregator | Salt Edge; 2,500+ institutions. **FACT** (S-13 CHOICE/millennialmoney; medium). |
| Sync frequency | UNKNOWN. |
| Categorisation | Automatic (Premium) + manual; learning UNKNOWN. **FACT** (S-13). |
| Custom categories / rules | Custom categories: UNKNOWN (likely yes); rules: UNKNOWN. |
| Recurring detection | UNKNOWN. |
| Shared finances | Shared wallets (Premium). **FACT** (S-13). |
| Budgets | Yes; unlimited on Premium. **FACT** (S-13). |
| Receipts / split / transfers / refunds / forecasting / net worth / web | UNKNOWN. |
| Mobile | iOS, Android (App Store IT id 635861140). **FACT** (S-13a). |
| Pricing (USD, 2025) | Basic free; Plus $1.99/mo or $14.99/yr; Premium $2.99/mo or $22.99/yr; 7-day Premium trial. **FACT (2025, now stale)** (S-13 millennialmoney/wealthrocket; medium). **[AV2] Corrected:** Spendee's own help centre ("What is Spendee Premium?") and spendee.com/pricing now list **Premium at $5.99/mo or $35.99/yr** (bank/e-wallet/crypto connections, auto-import and auto-categorisation, unlimited wallets/budgets) and **Plus at $1.99/mo or $14.99/yr** (unlimited wallets/budgets, shared wallets); 7-day trial on all plans (S-75, high). Premium has roughly doubled. EUR price UNKNOWN (verify in IT App Store). |
| Paywall | Bank sync, unlimited wallets/budgets, sharing, auto-categorisation behind Premium. **FACT** (S-13). |
| Ads / affiliate | None found. UNKNOWN. |
| Ownership | Private, Prague; founder/CEO David Neveceral; no acquisition evidence. **FACT** (S-13b tracxn/cbinsights; medium). |
| Negative themes | Bank sync "almost never works", forced logouts; sync stopped after years with no data for 6+ weeks; advertised banks no longer connectable; slow support. **FACT** (S-13, S-13a Trustpilot/App Store IT; low-medium). |
| Loved | Interface, multi-currency, shared wallets, free tier. **FACT** (S-13). |

### 3.6 Wallet by BudgetBakers (Prague)

| Attribute | Finding |
|---|---|
| Target users | EU/UK multi-currency households and investors wanting broad bank coverage. **ASSUMPTION** (S-36). |
| Markets | Global; "widest EU and UK bank coverage of any tracker tested" (review claim). **FACT/low** (S-36 getfinny 2026). Italian guides: Italian Open Banking support. **FACT/low** (S-12). |
| Aggregator | Salt Edge (official Salt Edge EULA summary on budgetbakers.com). **FACT** (S-37; high). Coverage claims conflict: 5,000+ (S-36), 4,000 (S-36a), 3,500 (S-12). |
| Consent | Support article: consent duration 1–6 months depending on bank; after expiry/revocation no access. **FACT** (S-37a support snippet; high). |
| Sync frequency | UNKNOWN. |
| Categorisation | Automatic "smart" categorisation. **FACT** (S-36a). Learning: UNKNOWN. Data model exposes fixed system categories "Unknown income/expense", "Uncategorized", and an **auto-managed "Transfer" category** (observed in BudgetBakers' public MCP server instructions in this session, 2026-10-02; medium). This implies transfer detection is a first-class, automatic concept. **FACT** (S-39 environment observation). |
| Custom categories / labels | Yes: categories and labels via API/MCP (create_category, create_label). **FACT** (S-39). |
| Rules engine | UNKNOWN. |
| Transfer detection | Auto-managed Transfer category (see above). **FACT** (S-39). |
| Shared finances | Group sharing exists (reviews mention). **ASSUMPTION** (S-36). |
| Receipt scanning | UNKNOWN (reviews historically mention receipt photos; not confirmed here). |
| Import / export | API/MCP available (records, accounts, budgets). **FACT** (S-39). CSV/OFX import UNKNOWN. |
| Web app | Yes (BudgetBakers has a web app; confirmed by API presence) **ASSUMPTION**. |
| Pricing | ~€4.49/mo, discount annually, lifetime plan "from time to time". **ASSUMPTION** (S-36b wealthypot 2026; low — a single affiliate-style blog; downgraded from FACT [AV]). **[AV2] Replaced:** the Italian App Store listing (apps.apple.com/it, id1032467659) shows in-app purchases **"Premium 5,99 €", "Premium 17,99 €", "Premium 29,99 €", "Lifetime Premium 29,99 €", "3-Year Premium 59,99 €"** (billing periods are not labelled in the listing; €5.99 is most plausibly monthly and €29.99 yearly — ASSUMPTION on periods). The French listing surfaces older entries (€1.99/mo ex-VAT, €14.99/yr) that look like legacy IAP ids. BudgetBakers' "Everything about Premium" article says Monthly/Yearly/Lifetime plans share identical features and that prices differ by country and platform, so the in-app price is authoritative (S-74; high for amounts, low for period mapping). The €4.49 anchor is withdrawn. |
| Paywall | Bank sync, unlimited budgets, reporting behind Premium. **FACT** (S-36). |
| Ads / affiliate | None found. |
| Negative themes | Trustpilot distribution 44% 1-star / 31% 5-star; "bank sync no longer working since December 2024"; support "totally non-existent"; refunds refused (even Google Play); balances without transactions. **FACT** (S-38 Trustpilot digest, 2025–26; low-medium). |
| Loved | Multi-currency (150+), investment tracking, breadth of banks. **FACT** (S-36). |
| News | None 2024–26 found. UNKNOWN. |

### 3.7 MoneyWiz (SilverWiz)

| Attribute | Finding |
|---|---|
| Target users | Power users wanting desktop + mobile, multi-currency, investments. **ASSUMPTION** (S-40a). |
| Markets | Global; EEA via Salt Edge Partner. **FACT** (S-40). |
| Aggregators | Salt Edge Partner (PSD2 EEA), Salt Edge Original (non-PSD2), Plaid (US/CA); Yodlee could not serve EU/UK after 14 Sep 2019 PSD2 deadline. Setapp users limited to one provider. **FACT** (S-40 official support/help, 2025; high). |
| Pricing (USD) | Premium $4.99/mo or $49.99/yr (bank sync + cloud sync); Standard $19.99/yr (device sync only). **FACT** (S-40a saasworthy 2026; medium). Also distributed via Setapp. |
| Platforms | iOS, macOS, Android, Windows (ASSUMPTION; store listing "MoneyWiz 2026 Personal Finance"). |
| Categorisation / rules / split / forecast | Historically rules, scheduled transactions, forecasting exist — **UNKNOWN** here (query not executed). |
| Negative themes | iCloud sync problems and data loss; subscription changes charging for previously free features; weak non-US bank integration. **FACT** (S-40a App Store digest; low-medium). |
| Loved | Long-term reliability, comprehensiveness. |

### 3.8 Money Pro (iBear LLC)

| Attribute | Finding |
|---|---|
| Pricing (USD) | Basic $12.99/yr; Plus $29.99/yr; Gold $69.99/yr. Online Banking requires **Gold**; downloads last 12 months of transactions. **FACT** (S-41 money.pro FAQ/guide; high; S-41a sourceforge 2025). |
| Aggregators | Plaid or Salt Edge; iBear never sees credentials. **FACT** (S-41b iBear privacy policy; high). |
| Platforms | iOS, macOS, Android, Windows. **ASSUMPTION** (store listings). |
| Negative themes | Forced move to subscription, lost one-time purchase; sync problems; missing features from older version. **FACT** (S-41a; low-medium). |
| Other attributes | UNKNOWN. |

### 3.9 Toshl Finance (Slovenia)

| Attribute | Finding |
|---|---|
| Pricing (USD) | Free (2 accounts, 2 budgets); Pro $2.99/mo or $19.99/yr (unlimited accounts/budgets, receipt photos, repeat expenses, bill reminders, fingerprint); Medici $4.99/mo or $39.99/yr adds automatic US/CA bank import. **FACT** (S-14 financeapps.guide/App Store; medium). Whether EU bank connections are included in Pro: UNKNOWN (verify toshl.com/pricing). **[AV]** Toshl's own pricing has historically placed *all* automatic bank connections (Salt Edge, Plaid and others, any country) in Medici, not only US/CA (model recall, S-62; unverified) — so Italian sync most likely requires Medici ($4.99/mo). The "US/CA" wording is the reviewer's, not Toshl's. Status: **ASSUMPTION**. **[AV2] Upgraded to FACT:** Toshl's own blog/FAQ states "the automatic bank connections are available to Toshl users with the Toshl Medici subscription plan", priced **$4.99/mo or $3.33/mo billed yearly** (30-day trial); Plaid covers US, Canada and some UK/FR/ES connections, Salt Edge "most of the other connections"; ~14,000 connections in **60 countries including Italy** (S-81, high). So Italian bank sync = Medici, ≈$40/yr. |
| Aggregators | Salt Edge and Plaid; 14,000+ connections. **FACT** (S-14, S-14a toshl.com blog; high). Salt Edge default 90-day re-authorisation then "Authorization unsuccessful" until re-entered (generic Salt Edge behaviour described by a PocketSmith help article; S-14b). |
| Receipt scanning | Receipt photos on Pro. **FACT** (S-14). |
| Web app | Yes (web-app bank-connection guide). **FACT** (S-14a). |
| Negative themes | Sync issues, duplicate entries in paid version. **FACT** (S-14; low). |
| Other attributes | UNKNOWN. |

### 3.10 Finanzguru (Frankfurt)

| Attribute | Finding |
|---|---|
| Target users | German consumers wanting multibanking plus contract/subscription management and switching. **FACT** (S-15). |
| Markets | Germany (Austria UNKNOWN). |
| Onboarding | Connect banks → automatic categorisation and contract recognition in free tier. **FACT** (S-15). Steps UNKNOWN. |
| UX highlights | Contract overview: monthly cost, next debit, notice period; one-tap cancellation service (free); switching offers. **FACT** (S-35 check-app.de 2026, reisetopia; medium). |
| Aggregator | UNKNOWN. BaFin-regulated, German servers, AES encryption (S-15, S-24). A help article "Zugang erneuern" explains legally required re-authentication with 2nd factor at least every 90 days (**FACT**, S-24 official help; high — note this predates/ignores the 180-day EBA change). **[AV]** Model recall (S-62, unverified): Finanzguru's operator dwins GmbH obtained its own BaFin authorisation as a Kontoinformationsdienst in 2019 and has used **finAPI GmbH** as its technical PSD2 interface — **ASSUMPTION**, not FACT. Relevant to Lilleri: finAPI has been 75 % owned by **Fabrick (Sella group, Italy)** since 19 Jun 2025 (open-banking-providers-b.md, source 4), so the DACH benchmark's plumbing now belongs to an Italian aggregator candidate. **[AV2] Refutation attempt (two searches, incl. the exact phrase "Finanzguru" "finAPI"):** no page links the two. What the sources do say: dwins GmbH (Wiesenhüttenplatz 25, Frankfurt) is registered with BaFin as a **Zahlungsinstitut / Kontoinformationsdienstleister, ID 152148**; Finanzguru's help centre ("Bankzugänge einbinden", "Banken anbinden") explains that current accounts are attached via the banks' **XS2A** PSD2 interface and other account types (cards, savings, depots) via **FinTS**, authenticated directly with the bank (S-82, high). This is consistent with either an in-house integration or a white-labelled provider; the finAPI link is therefore **downgraded to HYPOTHESIS** and the Fabrick cross-link should not be used until the Datenschutzerklärung's Auftragsverarbeiter list is read. |
| Sync frequency | UNKNOWN. |
| Categorisation | Automatic; errors for small/unknown merchants. **FACT** (S-24 neuebanken 2026; low-medium). Learning: UNKNOWN. |
| Custom categories / rules | UNKNOWN (query refused). |
| Recurring detection | Yes, strong: subscriptions, insurance, mobile, gym. **FACT** (S-35). |
| Budgets | 1 budget free; unlimited in Plus. **FACT** (S-15). |
| Forecasting | Plus: forecasts and long-term analyses. **FACT** (S-15). |
| History | 3 months free; longer with Plus. **FACT** (S-15). |
| Shared / receipts / export / web | UNKNOWN. |
| Pricing (EUR) | Plus regularly €2.99/mo; price tests €0.99–€4.99/mo and €29.99/yr; 7-day free trial. **FACT (2025, stale)** (S-15 ftd.de 07/2025, financer.de; medium). **[AV2] Updated:** 2026 German price trackers (kiweekly "Finanzguru Preis 2026", finwiss, transaktionsgebuehren.com, finanda) report **€4.29/mo on monthly billing as of 1 Sep 2026** and an **annual plan at ≈€2.99/mo equivalent**; a mein-deal promo ("3 Monate Plus gratis statt 9 €") implies the €2.99 monthly rate still existed for some cohorts (S-69; medium — figures vary across trackers, consistent with Finanzguru's known price testing). Status: FACT that the monthly rate has risen above €2.99; exact current figure **ASSUMPTION (€4.29)**. |
| Paywall | Generous free core (multibanking, categorisation, contracts, cancellation); Plus = forecasts, budgets, history. **FACT** (S-15). |
| Ads / affiliate | Business model is commission-based: insurance brokerage via Finanzguru Versicherungsservice GmbH, utility/contract switching; ~70% of ~€4m revenue in 2022 from commissions. **FACT** (S-35; medium). Acquired insurance broker Volders in 2021. **FACT** (S-34). |
| Investors / scale | Deutsche Bank ~20% (entered 2017 via Digi-Venture fund); €8m extended Series A (VR Venture, Coparion, Venture Stars, HDI, Deutsche Bank, Frank Strauß); €13m round led by SCOR Ventures and PayPal Ventures (total €27m since 2018); >500,000 registered users, "largest bank-independent finance app in Germany". **FACT** (S-34 onvista/paymentandbanking/startbase, n/d; medium). **[AV]** The 500k figure comes from the 2019–20 funding-round coverage and is **stale**; later press (2023–24) reported well over 1 million users (model recall, S-62; unverified). Use 500k only as a floor; the scale of Finanzguru's free-tier/commission model is larger than the matrix implies. **[AV2] Corrected with sources:** aktiencheck ("3 Millionen Nutzer: Wie Finanzguru die Konkurrenz abhängt"), Finance Forward ("Der stille Aufstieg …") and procontra report **>3 million users**, and Manager Magazin's January 2026 figures put **2025 revenue at ~€40m**; an intermediate milestone was 1.5m users / 100k insurance customers. Cap table as of 2025: **Deutsche Bank ~16 %, coparion ~16 %, PayPal Ventures ~8 %** (so "~20 %" for Deutsche Bank is stale). In 2026 Finanzguru signed footballer **Toni Kroos** for a national ad campaign ("Control it like Toni") (S-68; medium-high). Finanzguru is roughly **6× the size the first draft implied** — the most important single correction for the "generous free core + commission rail" benchmark. |
| Ratings | iOS 4.7, Android ~4.5. **FACT** (S-15; medium). |
| Negative themes | Bank connections needing re-authentication after updates, sometimes monthly; mis-categorisation. **FACT** (S-24; low-medium). |
| News 2024–26 | None found. UNKNOWN. |

### 3.11 Outbank (Germany; FP Finanzpartner AG)

| Attribute | Finding |
|---|---|
| Markets | DE, AT, CH; real-time monitoring of banks in those countries. **FACT** (S-30 handelsblatt/wiwo; medium). |
| Pricing (EUR) | €3.99/mo or €39.99/yr; 14-day limited trial; highest subscription among tested banking apps. **FACT** (S-30 konto.org 2026; medium). **[AV2] Confirmed on the official helpdesk** ("Was kostet das Outbank-Abo?"): Individual €3.99/mo or €39.99/yr ("du sparst 2 Monate"); **Business** (private + business accounts) €9.99/mo or €99.99/yr; 14-day free trial after plan selection (S-77; high). Scored 74.5/100 in konto.org 2026 test; first for accesses/functions/evaluation. |
| Categorisation | Two systems: categories (auto via rules) and tags (manual). Auto-assignment is based on predefined rules "from aboalarm", continuously developed; users can edit/rename/delete categories and create own rules. **FACT** (S-31 outbankapp.com; high). Learning from corrections: UNKNOWN (rules-based by design). |
| Rules engine | Yes, user-defined rules. **FACT** (S-31). |
| Recurring detection | Contract/subscription overview derived from categories. **FACT** (S-31). |
| Budgets | Many budgets linked to categories/tags, auto-updated. **FACT** (S-31 help). |
| Payments | Can initiate transfers (full banking app, not read-only). **FACT** (S-30). |
| Ownership history | Insolvency filing Sept 2017 → acquired by Verivox (ProSiebenSat.1) Nov 2017 → sold with dev team to FP Finanzpartner AG in 2021, which introduced the subscription model. **FACT** (S-32 iphone-ticker/t-online; medium). |
| Aggregator | UNKNOWN (historically own HBCI/FinTS + PSD2 connectors). |
| Other attributes | UNKNOWN. Italian banks: no. |

### 3.12 Bankin' (Perspecteev, Paris)

| Attribute | Finding |
|---|---|
| Markets | France primarily; "6 million users in France, UK, Spain, Germany" (claim). **FACT/low** (S-33 selectra/touslescashbacks 2026). Italy: no evidence. |
| Pricing (EUR) | Free; Bankin' Plus €4.99/mo or €39.99/yr (≈€3.33/mo); some sources "from €2.49/mo" (likely promo); Bankin' Pro from €8.33/mo (professionals: multiple business accounts, alerts). **FACT** (S-33; medium-low; conflicting figures). **[AV2] Plus price confirmed** on Bankin's official support article "Présentation de Bankin' Plus" and by three 2026 French reviews (touslescashbacks, parrainduweb, selectra): €4.99/mo or €39.99/yr; referral gives one month of Plus free (S-78; high). |
| Free tier | Aggregation, categorisation, balance forecast ("prévision de solde"); "sufficient for 90% of users". **FACT** (S-33). |
| Forecasting | Balance forecast and monthly budget simulation. **FACT** (S-33). |
| Aggregator | Bridge (Bankin's former B2B arm, split March 2022; BPCE + Truffle invested €20m; Anna Maj CEO from 21 Nov 2024). **FACT** on Bridge (S-16 mind.eu.com; medium); that Bankin' still uses Bridge: **ASSUMPTION**. |
| Ownership | One source states Bankin' B2C was "fully acquired by the Casino group" — surprising, unverified. **UNKNOWN/verify** (S-16; medium source but odd claim). **[AV]** Attempted refutation: no corroboration in any sibling research document and no matching deal in model recall (no known Casino-group fintech acquisition fits). Treat as **probably erroneous** (possible confusion with another entity) and do not use in any decision until Infogreffe / mentions légales confirm. **[AV2] Pass 1 was wrong — the claim is CONFIRMED.** Fresh search found: (1) mind Fintech "Casino entre au capital du PFM Bankin'" and journaldunet / planet-fintech / L'ADN: **Groupe Casino (the retailer) invested €20m in Perspecteev in 2019** for a minority stake (≥10 % of voting rights, subject to ACPR approval); (2) moneyvox: Bankin' partnered with **Banque Casino** on consumer credit; (3) CFNews "Bankin' va se scinder" and mind Fintech's Bridge article: at the **2022 split**, the B2C Bankin' entity (SIREN 907753735, created by partial asset contribution from Perspecteev) was **fully taken over by Groupe Casino** while historical VCs (Oddo/Génération NewTech, Omnes, CommerzVentures) exited and BPCE/Truffle backed Bridge; (4) mind Fintech "Bankin' réduit ses pertes en 2024" confirms the entity still reports under that ownership in 2024 (S-72; medium-high, multiple independent outlets). Open point: Groupe Casino itself went through a court-approved debt restructuring (Kretinsky consortium, Feb–May 2024, further recapitalisation proposed Nov 2025) and a Perspecteev capital change was filed on 10 Nov 2025 — whether Bankin' has been or will be divested is **UNKNOWN**. Status upgraded to **FACT (ownership through 2024)**. |
| Negative themes | Trustpilot: impossible sync with some banks, random sync, recurring bugs, wrong budget calculations, fluctuating forecasts, slow cashback payouts, unresponsive support; company "did not respond to negative reviews". **FACT** (S-33a Trustpilot digest; low-medium). Rating 4.3/5 cited by one review site (conflicts with critical tone). |
| Loved | Simplicity, feature count. **FACT** (S-33). |
| Cashback | Yes ("cagnottes de cashback"). **FACT** (S-33a). |
| Other attributes | UNKNOWN. |

### 3.13 Linxo and Linxo Lab (Crédit Agricole group)

| Attribute | Finding |
|---|---|
| Ownership | Acquired by Crédit Agricole (frenchweb: "racheté par le Crédit Agricole"); one site says subsidiary "since 2010" (doubtful). **FACT** on acquisition (S-17 frenchweb, n/d; medium). **[AV]** Date, from model recall (S-62, not fetched): Crédit Agricole took a minority stake in 2017 and acquired control of Linxo Group in **January 2020**; Linxo's B2B aggregation arm Linxo Connect was rebranded **Oxlin** (ACPR-licensed AISP/PISP) in 2021. "Since 2010" is Linxo's founding year, not the acquisition date. Status of the date: **ASSUMPTION** until the Jan 2020 Crédit Agricole press release is fetched. **[AV2] Verified and corrected:** Crédit Agricole's own press release and GlobeNewswire (28 Jan 2020) announce a **majority stake of 85 %** in Linxo Group; the deal **closed on 18 June 2020** (zonebourse, planet-fintech, fusacq) at a reported ~€20m valuation (crowdfundinsider). **Oxlin was not a 2021 rebrand**: it was created in the **2018** reorganisation into Linxo Group with two subsidiaries — Oxlin (DSP2-licensed open-banking/B2B) and Linxo (B2C). In **2025 Crédit Agricole Payment Services became 100 % shareholder**, Laurent Gastinel (CEO since 2024) unified B2B and B2C under a single "Linxo" brand, and the plan targets profitability by 2028 with growth "en dehors du groupe" — meaning new external customers, not a divestment (mind Fintech interview; fr.wikipedia; lafabriquebyca) (S-73; high for dates/ownership, medium for strategy). Status: **FACT**. |
| Products | Linxo (classic) and Linxo Lab (new, modern, co-built with users, free only, coexisting; same credentials). **FACT** (S-17a linxo.com; high). Forecast feature on Lab due end June 2026. **[AV2]** "Free only" is now stale: a 2026 French review notes that **a Premium tier for Linxo Lab was launched in September 2026**, distinct from classic Linxo Premium (S-79; medium-low, single secondary source — verify on linxo.com). |
| Pricing (EUR) | Classic: free; Premium ~€4/mo or €29.99/yr (≈€2.50/mo). Lab: free, no paid tier. **FACT** (S-17, S-17a; medium/high). **[AV2]** 2026 reviews (tirelire-ailee, economiser-mon-argent, leboninvestisseur, 1parrainage) give Premium at **€4.49/mo** (some still say "4 €") or **€29.99/yr**, no commitment; Lab Premium price UNKNOWN (S-79; medium). |
| Premium features | Custom categories; 30-day rolling balance forecast; unlimited history; account groups (Perso/Pro/Enfants). **FACT** (S-17b; medium). |
| Negative themes | Poor support even for Premium; bank connectivity issues taking months. **FACT** (S-17 Trustpilot digest; low-medium). |
| Aggregator | **ASSUMPTION**: in-group via Oxlin (ex-Linxo Connect, same Crédit Agricole group) — model recall, S-62 [AV]; previously UNKNOWN (query refused). Verify in Linxo's CGU/politique de confidentialité. **[AV2]** Oxlin's existence as Linxo Group's DSP2-licensed open-banking subsidiary (since 2018) is now **FACT** (S-73); mind Fintech notes Oxlin "represents the majority of revenues, operating mainly within the Crédit Agricole group". That the B2C app's connections run through Oxlin remains **ASSUMPTION** (highly likely, not stated). |
| Other attributes | UNKNOWN. |

### 3.14 Fintonic (Madrid)

| Attribute | Finding |
|---|---|
| Model | 100% free app with Bank of Spain AISP licence; strength is aggregation + alerts (fees, duplicate direct debits, overdrafts); "FinScore" credit scoring; loans and insurance. **FACT** (S-18 javilinares/recharge/verkot 2025; low-medium). Premium: UNKNOWN. |
| News 2024–26 | Restructuring (April 2025), new CEO Armando Baquero (ex-Santander insurance CEO), led by SquareOne Capital with ING Ventures; first-ever profitability (Sept 2025); loan originations ×5, >€1m/day; positioning as credit-scoring and consumer-finance company; ING reportedly selling its 22% stake (valuation ~US$110m); closed Chile operations. **FACT** (S-18a fintonic.com blog, murcia.com 2025-09-05, df.cl; medium/high). **[AV2] Confirmed by fresh search:** Forbes España ("Fintonic alcanza la rentabilidad tras doce años de historia"), Bolsamania/Europa Press, Seguros TV and INESE Future all report the April 2025 restructuring under SquareOne Capital with ING Ventures, Baquero's appointment (ex-CEO Santander Insurance Holding), revenue doubled in 12 months, loan originations ×5 to >€1m/day, and first-ever profitability (S-84; medium-high). The ING 22 % stake sale / ~US$110m valuation was not re-surfaced — keep as FACT (single source S-18a), medium. |
| Negative themes | Permanent disconnection of entities, shrinking bank coverage, continuous categorisation failures; transactions not downloadable since Aug 2025. **FACT** (S-18 App Store ES digest; low-medium). |
| Aggregator | UNKNOWN. |
| Other attributes | UNKNOWN. Italy: no. |

### 3.15 Buddy

| Attribute | Finding |
|---|---|
| Target users | Couples/small households; "joyful" customisable budgeting. **FACT** (S-42 App Store/senki; medium). |
| Shared finances | Shared budgets with partner/roommate; invite, sync, see who spent what. **FACT** (S-42). |
| Bank sync | Available; recurring dissatisfaction for non-US banks. **FACT** (S-42 justuseapp; low). Provider and EU country list: UNKNOWN. |
| Pricing (USD) | Premium $9.99/mo or $49.99/yr. **FACT** (S-42; medium). |
| Ratings | 4.7 (9,500+ App Store reviews); 3.3 on another platform. **FACT** (S-42). |
| Developer HQ | UNKNOWN (believed Nordic — unverified). |
| Other attributes | UNKNOWN. |

### 3.16 Monefy

| Attribute | Finding |
|---|---|
| Model | Manual-entry tracker (tap category → amount → done); no bank connection by design (privacy). **FACT** (S-43 monefy.com; high). 11M+ downloads, 4.7 from 283k reviews. |
| Pricing | Premium $59.99/yr (listed $69.99, first year $34.99; varies by region). Shift from one-time purchase to subscription caused backlash; long-term users lost paid features. **FACT** (S-43; medium/low). |
| Relevance | Benchmark for "fastest manual entry" UX only. |

### 3.17 Cleo (Cleo AI Ltd)

| Attribute | Finding |
|---|---|
| Markets | US core since 2020 exit from UK; UK relaunched 5 Feb 2026 with Chat, Budget, Roast, Voice, Cleo Pro subscription, Early Income, personalised spending roadmap; **not** in UK: Subscriptions Plus/Builder, credit scores, debt reset, Money IQ, savings, Save Hacks, Cleo Card. **FACT** (S-46 Cleo FAQ + PR Newswire, Feb 2026; high). **[AV]** UK relaunch corroborated independently by competitors-us.md (PR Newswire 2026-02-05 Autopilot release noting the UK relaunch; Finextra) — confirmed (S-60). **[AV2] Re-confirmed by fresh search:** Finextra ("AI personal banking assistant Cleo relaunches in UK"), CFOtech UK, PR Newswire UK, FFnews and Financial IT (Feb 2026) — staged rollout on the UK App Store, chat/budget/roast first; Sifted reports ~$150m ARR and that Cleo had concentrated on the US since 2022 (S-76; high). |
| Pricing (US) | Plus $5.99/mo (advances up to $250 after history), Pro $8.99, Builder $14.99; $3.99 express fee. **FACT** (S-44 finder; medium). UK Pro price UNKNOWN. **[AV2] UK Pro = £12.99/mo** per Cleo's pricing page and "Cleo AI Pro Subscription Terms (UK)"; Plus, Builder, US credit tools and the Cleo Card are not offered in the UK (S-76; high). Note this is **2–3× the UK PFM "Plus" norm** — Cleo prices as a cash-advance/AI product, not a budgeting app. |
| Regulatory | FTC $17m settlement announced 27 Mar 2025: deceptive claims about cash-advance amounts/speed and obstructive cancellation; funds for refunds. **FACT** (S-45 hunton/pymnts/law360 2025; high). **[AV]** Consistent with model recall of the FTC announcement — confirmed. |
| Reviews | Trustpilot 4.0 from 3,746 reviews (snippet). **FACT** (S-44; medium). |
| Relevance | AI-chat UX benchmark (tone, "roast"), but monetisation is lending-led, not PFM. |

---

## 4. Other EU open-banking PFMs found via multilingual search

| Product | Country | Key facts | Status |
|---|---|---|---|
| **Dyme** | NL | Subscription detection and one-click cancellation (>1,000 companies); deal switching (insurance, energy, telecom); partnered with **Tink**; free + **Silver €4.99/mo** + Gold €9.99/mo (**corrected [AV2]** from €6.99: financer.nl 2026 review and Dyme's own Zendesk "Kost het geld om Dyme te gebruiken?", S-80; medium-high); claims avg user saves €530/yr. **FACT** (S-49 tink.com press, firetheboss; medium). | Active; marketed itself as Grip's successor. |
| **Finanzfluss Copilot** | DE | Launched Sept 2024 by Finanzfluss (media brand); aggregator **wealthAPI** (BaFin-licensed); 350+ banks/brokers/exchanges; free tier includes household book; Plus €8.99/mo (analysis, CSV export). **FACT** (S-51 finanzfluss.de, portfolioglance; high/medium). | Active; investor-first, not budgeting-first. |
| **Fast Budget** | IT | Italian PFM app that partnered with **Salt Edge** for bank connections. **FACT** (S-52 thepaypers, n/d; medium). **[AV2] Confirmed** by the Salt Edge blog ("Fast Budget partners with Salt Edge to provide a fully automated way to manage daily finances") and a Finextra press article (85259) — Salt Edge's toolkit gives it "5000+ banks in 50+ countries"; other Italian Salt Edge clients surfaced: EasyPol, Switcho, Plannix (S-86; medium-high). Pricing/features UNKNOWN. | Active (verify). |
| **Fabrick** | IT | B2B modular PFM suite for banks (Open Finance platform). **FACT** (S-53; medium). | B2B only. |
| **Spiir** | DK | Nearly 1M users; company Aiia acquired by Mastercard — **announced Sept 2021, closed Nov 2021** (Mastercard investor news, S-58, cited independently in open-banking-providers-b.md; the "2024" date given by one S-47 source is wrong — corrected [AV]); app shut **8 June 2026**. **FACT** (S-47 mobilsiden/simfee 2026; medium). **[AV2] Both dates confirmed by fresh search:** Mastercard's investor release and Finovate date the Aiia close to **18 Nov 2021** (S-58, S-85), so the "2024" repeated by mobilsiden/mobilpuls is wrong; the 8 June 2026 shutdown is reported by mobilpuls, savio.dk, blissbudget, kronerogore and mymoneyapp.dk — from that date login and data access ended, with CSV export offered beforehand; co-founder Rune Mai floated an open-source successor on Reddit (S-85; medium-high). | **Closed**. |
| **Grip** | NL (ABN AMRO) | Free household-budget app; closed 16 Dec 2022, features folded into ABN AMRO app; non-ABN users stranded. **FACT** (S-48 iexgeld/emerce; medium). | **Closed**. |
| **Yolt** | NL/UK/IT (ING) | Consumer app closed (Dec 2021); B2B open-banking unit closed end April 2023. **FACT** (S-50 aziendabanca/finextra; medium). **[AV]** Both dates consistent with model recall (S-62) — confirmed. | **Closed**. |
| **Oval Money** | IT/UK | Savings/invest app; acquired by Guru Capital May 2021 → ETX Capital → OvalX; users told to withdraw by 9 May 2023; OvalX voluntary liquidation June 2024. **FACT** (S-50a aziendabanca/ceotech/altroconsumo 2023–24; medium). | **Closed**. |
| **Goin (ES), Lunch Money (US w/ Salt Edge), Monse (DE), Grassfeld** | — | Surfaced by name only; no verified detail. UNKNOWN. | — |

---

## 5. Shutdowns, pivots, acquisitions and pricing changes 2023–2026 (chronological)

| Date | Event | Status / source |
|---|---|---|
| Jan 2023 | Plum expands to IT, PT, NL, GR, CY (10 markets) | FACT, S-27 |
| Apr 2023 | Yolt B2B closes (consumer app already closed 2021) | FACT, S-50 |
| May 2023 | Oval Money users must withdraw; OvalX liquidated Jun 2024 | FACT, S-50a |
| 31 Jul 2023 | Snoop acquired by Vanquis Banking Group | FACT, S-06 |
| Sept 2024 | Finanzfluss Copilot launches (wealthAPI) | FACT, S-51 |
| Oct–Nov 2024 | Powens new CEO; Bridge new CEO (Anna Maj) | FACT, S-16 |
| 2019 | Groupe Casino invests €20m in Perspecteev (Bankin'), minority stake [AV2] | FACT, S-72 |
| 28 Jan / 18 Jun 2020 | Crédit Agricole announces 85 % of Linxo Group; deal closes 18 Jun 2020 [AV2] | FACT, S-73 |
| 18 Nov 2021 | Mastercard closes acquisition of Aiia (Spiir's parent) [AV2] | FACT, S-58, S-85 |
| 2022 | Perspecteev splits: Bridge (B2B, BPCE/Truffle) and Bankin' B2C fully taken over by Groupe Casino [AV2] | FACT, S-72 |
| Dec 2024 | Wallet (BudgetBakers) users report bank sync broken | FACT (reviews), S-38 |
| Jan 2025 | Snoop launches savings account | FACT, S-06 |
| Feb 2025 | Moneyhub announces D2C exit, ~36 roles cut | FACT, S-07 |
| 27 Mar 2025 | Cleo FTC $17m settlement | FACT, S-45 |
| Apr 2025 | Fintonic restructuring; new CEO; pivot to credit | FACT, S-18a |
| 7 Jul 2025 | Plum new UK plans (£3.99/£7.99/£14.99); legacy plans for EU | FACT, S-10 |
| Aug 2025 | Fintonic users report export broken | FACT (reviews), S-18 |
| Aug 2025 | GoCardless Bank Account Data (ex-Nordigen) discontinuation reported by self-hosters; Enable Banking becomes the free alternative — makes S-26 a stale consent-duration anchor | FACT (user-pain-points.md G-11, Actual issue #5505, 2025-08-06), S-61 [AV] |
| Sept 2025 | Fintonic announces first profitability | FACT, S-18a |
| 2025 | Crédit Agricole Payment Services becomes 100 % owner of Linxo Group; B2B/B2C unified under "Linxo" brand [AV2] | FACT, S-73 |
| Jan 2026 | Plum reaches operational profitability (announced 28 Apr 2026) | FACT, S-29, S-67 |
| Jan 2026 | Manager Magazin: Finanzguru >3M users, ~€40m revenue 2025 [AV2] | FACT, S-68 |
| 5 Feb 2026 | Cleo relaunches in UK (limited features; UK Pro £12.99) | FACT, S-46, S-76 |
| by May 2026 | Snoop Plus raised to £5.99/mo, £47.99/yr [AV2] | FACT, S-70 |
| May 2026 | Plum opens Crowdcube community raise [AV2] | FACT, S-67 |
| 8 Jun 2026 | Spiir (Mastercard) shuts down | FACT, S-47 |
| 31 Jul 2026 | Moneyhub consumer app sunset; WPS LifeStage live 3 Aug 2026; >10,000 migrated | FACT, S-08, S-83 |
| 1 Sep 2026 | Finanzguru Plus monthly price €4.29 (annual ≈€2.99/mo) [AV2] | ASSUMPTION (trackers), S-69 |
| Sep 2026 | Linxo Lab Premium tier launched [AV2] | FACT/low (single source), S-79 |
| 2025–26 | Spendee Premium repriced to $5.99/mo, $35.99/yr (date unknown) [AV2] | FACT, S-75 |
| 2024–26 | Outbank, MoneyWiz, Toshl, Buddy: no major corporate news surfaced. Emma (profitable, >3m users), Finanzguru (>3M users, Kroos campaign, repricing), Bankin' (Casino-owned, losses reduced 2024), Linxo (100 % CA, rebrand), Spendee (repricing) now covered above [AV2] | UNKNOWN / FACT as noted |

---

## 6. PSD2 consent renewal (90 / 180 days) — regulation vs. observed app behaviour

- **Regulation (FACT, S-25 vixio/lexology/plaid, 2022–23; high-medium; dates corrected [AV], S-59):** EBA amended the SCA RTS so that the exemption from re-applying SCA for AIS access runs **180 days** (previously 90). Sequence: EBA Final Report EBA/RTS/2022/03 published **5 April 2022**; Commission Delegated Regulation (EU) 2022/2360 published in the Official Journal on **5 December 2022** (in force 25 Dec 2022); ASPSPs had to apply it by **25 July 2023**. (The original text's "announced 5 Dec 2022" conflated the OJ publication with the EBA announcement; corroborated by regulatory-landscape.md S-03.) **[AV2] Confirmed from primary sources by fresh search:** EBA Final Report EBA/RTS/2022/03 (eba.europa.eu, 5 Apr 2022); EUR-Lex 2022/2360 — entered into force 25 Dec 2022, **applies from 25 Jul 2023**; the amended RTS makes the AIS exemption *mandatory* for ASPSPs (balance + last 90 days' transactions, no sensitive data, SCA at first access, <180 days since last SCA) and keeps the Art. 10 voluntary exemption only for direct customer access; ASPSPs already applying the old 90-day exemption could run it out to expiry (financialinstitutionsnews 5 Dec 2022; dlklegal; EBA Q&A 2023_6820) (S-59, S-87; high). In the EU the user re-authenticates **at the bank** (SCA); in the UK, after the first SCA, renewal is a 90-day **re-consent with the TPP** without bank SCA (S-25a saasant explainer; medium).
- **Observed in apps/aggregators:** Salt Edge EULA (as summarised on budgetbakers.com) still says "usually up to 90 days" and requires renewal (S-37, high); GoCardless Bank Account Data default EUA = 90 days access / 90 days history (S-26 developer docs; high); BudgetBakers help: "1–6 months depending on your bank" (S-37a; high); Finanzguru help "Zugang erneuern": at least every 90 days with 2nd factor (S-24; high); Emma UK help: every 90 days, timer restarts on renewal (S-21; high). Reviewers of Finanzguru report re-auth "sometimes monthly" after app updates (S-24; low-medium).
- **Primary-documentation check (adversarial pass, Context7 index, 2026-10-02) [AV]:** (a) **TrueLayer** Data API v1 docs still state "Open banking regulations limit the duration of a user's consent to a maximum of 90 days", and its Oct 2022 changelog introduced `/connections/extend` for SCA-free reconfirmation of consent (the UK model) — **confirmed** (S-56). (b) **Salt Edge** API v6 reference shows consent validity is set per consent (`period_days`, `expires_at`) and capped per provider (`max_consent_days`, `null` = no limit); i.e. the "usually up to 90 days" in the Salt Edge EULA summary (S-37) is legal boilerplate, **not a technical default** — re-characterised (S-55). (c) **GoCardless** Bank Account Data docs expose `access_valid_for_days`/`max_historical_days` as optional with defaults (the retrieved excerpt shows a 30-day/180-day example, not the defaults) and the service is being discontinued (Aug 2025, S-61) — S-26 is a **stale anchor**. Net: the "apps and docs still say 90 days" observation holds, but the gap is between app help pages and bank reality, not an aggregator-imposed limit.
- **Implication (HYPOTHESIS):** Italian banks' actual consent windows vary (some 90, some 180 days); an app that tracks per-connection expiry, warns ahead of time, batches renewals, and explains *why* will differentiate on the single most-complained-about failure mode. No competitor in the set was found to market such a UX.

---

## 7. Italian-bank support summary

| Supports Italian banks today? | Products | Evidence |
|---|---|---|
| Yes (PFM via Salt Edge) | Wallet, Spendee, MoneyWiz (Salt Edge Partner), Money Pro (Gold), Toshl (**Medici plan, Italy named explicitly** [AV2]), Fast Budget | S-37, S-13, S-40, S-41, S-14, S-81, S-52, S-86 |
| Yes (savings app, limited PFM) | Plum (since Jan 2023; TrueLayer/Tink/Finker) | S-27, S-28 |
| No | Emma (explicit), Snoop, Moneyhub, Cleo, Finanzguru, Outbank, Bankin' (no evidence), Linxo, Fintonic, Dyme, Finanzfluss Copilot | S-19 etc. |
| N/A | Monefy (manual), Buddy (UNKNOWN) | — |

Salt Edge lists Italy among 32 European countries with 4,848 connections overall (S-41c saltedge.com coverage; high; Italy-specific count UNKNOWN). TrueLayer launched in Italy covering UniCredit, Intesa Sanpaolo, Poste Italiane (S-05a truelayer.com blog, dated 2020 per open-banking-providers-a.md #64; high). **[AV]** Confirmed against current TrueLayer docs: `IT` is in the API country enum and Italy is listed as a fully supported hosted-page market (S-56). Tink has had a Milan office since Dec 2019 (S-53a; medium).

---

## 8. Pricing in EUR and free-tier structures (consolidated)

| Product | EUR price (source, date) | Free tier shape |
|---|---|---|
| Finanzguru Plus | **€4.29/mo monthly (1 Sep 2026) or ≈€2.99/mo annual** (S-69, 2026 [AV2]); 2025: €2.99 regular, tests €0.99–€4.99, €29.99/yr (S-15, stale) | Generous: multibanking, categorisation, contracts, cancellation, 1 budget, 3-month history |
| Outbank | €3.99/mo or €39.99/yr; Business €9.99/€99.99 (S-77 official, 2026 [AV2]) | None (14-day trial) |
| Bankin' Plus / Pro | €4.99/mo or €39.99/yr (S-78 official, 2026 [AV2]); Pro from €8.33/mo (S-33) | Aggregation, categorisation, balance forecast |
| Linxo Premium | **€4.49/mo** or €29.99/yr; Linxo Lab free core, **Lab Premium since Sep 2026** (price UNKNOWN) (S-79, 2026 [AV2]) | Aggregation + auto-categorisation; custom categories/forecast paid |
| Wallet | **€5.99 / €17.99 / €29.99 IAPs, 3-Year €59.99** in Italian App Store (periods unlabelled; ≈€5.99/mo, €29.99/yr) (S-74, 2026 [AV2]); €4.49 withdrawn | Manual tracking; sync paid |
| Plum EU (legacy, Italy) | **Pro €3.99, Premium €9.99** (withplum.com/it-it, S-66 [AV2]); help-centre generic "€2.00" not applicable to Italy | Basic saving |
| Dyme | **Silver €4.99**, Gold €9.99 (S-80 [AV2]) | Basic insights |
| Finanzfluss Copilot Plus | €8.99/mo (S-51; not re-checked) | Portfolio + household book |
| Spendee | USD: Premium **$5.99/mo or $35.99/yr**, Plus $1.99/$14.99 (S-75 [AV2]); EUR UNKNOWN | Manual wallets |
| Toshl | USD: Medici **$4.99/mo or $3.33/mo yearly** = bank sync incl. Italy (S-81 [AV2]); EUR UNKNOWN | 2 accounts, 2 budgets |
| Cleo UK | **£12.99/mo** Pro (S-76 [AV2]) | Chat/budget/roast |
| MoneyWiz, Money Pro, Buddy, Monefy | EUR UNKNOWN (USD listed above) | — |

---

## 9. Advertising, affiliate and marketplace models observed

| Product | Model | Evidence |
|---|---|---|
| Snoop | Switching commissions (energy, mobile, broadband/TV, life insurance), anonymised aggregated data, Plus subs; "by far the biggest" revenue is switching | S-23 (medium) |
| Emma | Cashback links (double for Pro), affiliate programme per trial, Emma Invest AUM fee 0.10–0.60%, interest margin on pots (Bondsmith) | S-22b–d (high) |
| Finanzguru | ~70% of 2022 revenue from commissions; own insurance brokerage; switching | S-35 (medium) |
| Plum | Asset-based income, transaction revenue, subscriptions with perks | S-29 (medium) |
| Bankin' | Cashback pots; Plus/Pro subs | S-33a |
| Dyme | Deal switching + subs | S-49 |
| Fintonic | Loans/insurance (now the core) | S-18a |
| Moneyhub | Subscription only, "we don't sell your data" — and exited D2C | S-07a |

---

## 10. Cross-product review themes (synthesis)

**Most frequent problems (in descending frequency across sources):** (1) bank connection breaks / re-authentication loops; (2) categorisation errors and "it never learns"; (3) subscription billing surprises (auto-charge after trial, hard cancellation — Emma, Cleo/FTC, Monefy/MoneyWiz/Money Pro forced subscriptions); (4) unresponsive support (Wallet, Spendee, Bankin', Linxo); (5) wrong maths: budgets/forecasts fluctuating (Bankin'), balances without transactions (Wallet), one-offs counted as regular (Snoop); (6) shrinking bank coverage (Fintonic, Spendee).

**Most loved:** one place for all accounts (every aggregator app); contract/subscription detection with cancellation (Finanzguru, Dyme, Snoop); shared wallets (Spendee, Buddy); fast manual entry (Monefy); value for money (Moneyhub, Finanzguru free tier); multi-currency (Wallet).

---

## 11. Patterns worth adopting (reimplemented originally, not copied)

1. **Learn-from-corrections with an explicit threshold and visible memory.** Emma applies a rule after ≥3 similar edits (S-21). Lilleri should make the learning visible immediately (after 1 correction propose "apply to all future from this merchant?") and show the learned rule in a reviewable list — addressing the "never learns" complaint without silent misfires.
2. **Transfers as a first-class, auto-managed concept.** BudgetBakers models an auto-managed Transfer category (S-39). Lilleri's promise (automatic reconciliation of transfers/duplicates/card settlements) goes further: pair legs across accounts and hide them from spend totals by default, with an undo.
3. **Contract/subscription ledger with next-debit date and notice period** (Finanzguru S-35, Outbank S-31, Dyme S-49). High-love feature in DACH/NL; Italian users have no equivalent.
4. **Generous free core, cheap Plus (€2.99–€4.99 annual-equivalent; €3.99–€5.99 monthly after the 2025–26 repricing wave [AV2]), no gating of basics like custom categories.** Finanzguru's free tier includes categorisation, contracts and cancellation (S-15) and that model now serves >3M users (S-68); Emma/Snoop/Linxo gate custom categories and get complaints. Gate depth (history, forecasts, multi-household), not correctness. Note that Finanzguru, Snoop, Spendee and Linxo Lab all **raised or introduced** paid pricing in 2025–26 (S-69, S-70, S-75, S-79): the market is testing the ceiling, not racing to the bottom.
5. **"True balance"/left-to-spend and 30-day balance forecast** (Emma S-02; Bankin', Linxo S-33/S-17b) are the most-cited daily-use features; implement from recurring-payment detection.
6. **Proactive consent-expiry management** (see §6): per-connection countdown, pre-expiry push, one-tap batch renewal, plain-language explanation of the 90/180-day rule. No competitor markets this.
7. **Transparent, pre-notified billing**: reminder before trial converts, in-app cancel. The FTC case (S-45) and Emma Trustpilot themes (S-20) show how costly the opposite is.
8. **Resilience via multiple aggregators** (Plum uses TrueLayer, Tink and Finker; MoneyWiz offers Salt Edge Partner/Original/Plaid; S-28, S-40). Design the connector layer to be provider-agnostic from day one so an Italian bank outage at one provider can fail over.
9. **Shared wallets / household views** (Spendee, Buddy) — demand exists; couple it with per-person attribution.
10. **Monetise beyond subscription with aligned incentives** (Snoop's "when the customer wins, we do too", S-23) — but disclose and keep ads out of the review inbox.

## 12. Patterns to avoid

1. **Silent, generic "bank sync failed" states** with no root cause (Wallet, Spendee, Fintonic). Always show which bank, which consent, what the user must do, and when it will retry.
2. **Gating custom categories and rules behind the top tiers** (Emma Pro, Snoop Plus, Linxo Premium) — it blocks the very corrections that make categorisation learn.
3. **Forced migration from one-time purchase to subscription without grandfathering** (Monefy, MoneyWiz, Money Pro) — reputational damage lasting years in store reviews.
4. **Trial auto-conversion without reminder; hard-to-find cancel** (Emma complaints; Cleo FTC).
5. **Mixing lending/cash-advance incentives into a PFM** (Cleo) — regulatory exposure and trust erosion.
6. **Subscription-only D2C with no second revenue rail and no bank distribution** (Moneyhub, Spiir, Yolt, Grip): all exited. Plan a second rail (B2B2C with an Italian bank, or aligned affiliate) early.
7. **Counting one-off large payments as regular spend** (Snoop complaint) — recurring detection must require periodicity evidence.
8. **Promising bank coverage that no longer works** (Spendee Italian reviews) — keep a live coverage/health page.
9. **Unresponsive support for paying users** (Wallet, Linxo, Bankin') — SLA for Plus users is a cheap differentiator.
10. **Over-broad feature sprawl before reconciliation quality** — the sector's most-loved apps are narrow (Snoop's feed, Finanzguru's contracts, Monefy's speed).

---

## 13. Open questions and how to verify

| Question | How to verify |
|---|---|
| Exact EUR prices for Spendee, Wallet, MoneyWiz, Toshl, Buddy in the Italian App Store | Open each listing in apps.apple.com/it; check In-App Purchases section. |
| Which aggregator Finanzguru, Outbank, Linxo, Fintonic, Buddy, Cleo-UK use | Read each privacy policy / Datenschutzerklärung "Kontoschnittstelle" section; Buddy's App Store privacy labels. |
| Whether Toshl Pro includes EU (Salt Edge) bank connections at no extra cost | toshl.com/pricing and help article "Bank connections – which plan". |
| Split transactions, refund matching, sync cadence for each app | Install on a test device with a sandbox bank (Salt Edge fake bank) and exercise the flows. |
| Fast Budget pricing, features, reviews | apps.apple.com/it listing + fastbudget.app; Salt Edge press release date. |
| Bankin' ownership (Casino group claim) and current user count | **[AV2] Casino ownership through 2024 RESOLVED (FACT, S-72).** Still open: whether Casino's 2024–25 restructuring has divested Bankin' (check Infogreffe for SIREN 907753735 and the 10 Nov 2025 Perspecteev notice); user count. |
| Emma 2024–26 funding / profitability | **[AV2] Partly resolved:** profitable, £5.7m revenue 2024, >3m users (S-64, S-65). Confirm with Companies House filings for Emma Technologies Ltd; ignore the "$2.5m seed Jan 2026" aggregator entry. |
| Plum EU user split and Italian active users | Plum press office; Companies House accounts. |
| Reddit sentiment (r/UKPersonalFinance, r/ItaliaPersonalFinance, r/eupersonalfinance) | Searches were refused after budget exhaustion; run direct site:reddit.com queries. |
| [AV] Emma's current (2026) Plus price: £4.99 or £5.99? | **[AV2] RESOLVED:** £4.99 (official plans page); £5.99 is the Ultimate extra-member price (S-63). |
| [AV] Finanzguru current user count and technical PSD2 provider (finAPI?) | **[AV2] User count RESOLVED (>3M, S-68). Provider still OPEN:** no finAPI link found; read the Datenschutzerklärung's Auftragsverarbeiter list and BaFin register entry ID 152148 for dwins GmbH. |
| [AV] Linxo: Crédit Agricole control date (Jan 2020?) and whether the B2C app runs on Oxlin | **[AV2] Dates RESOLVED** (85 % announced 28 Jan 2020, closed 18 Jun 2020; 100 % CA Payment Services 2025; Oxlin since 2018, S-73). Oxlin-for-B2C still ASSUMPTION — read Linxo politique de confidentialité. Also verify Linxo Lab Premium (Sep 2026) price on linxo.com. |
| [AV] Toshl: do EU (Salt Edge) bank connections require Medici rather than Pro? | **[AV2] RESOLVED:** yes, Medici for all automatic connections, Italy included (S-81). |
| [AV] Plum legacy EU Pro price (€2.00 looks low vs £2.99) and the 7 Jul 2025 UK re-pricing | **[AV2] RESOLVED:** Italy Pro €3.99 / Premium €9.99 (withplum.com/it-it); UK re-pricing confirmed (S-66). Which EU market, if any, pays €2.00 remains UNKNOWN. |
| [AV] Spiir shutdown date (8 Jun 2026) and Moneyhub sunset (31 Jul 2026) | **[AV2] Both RESOLVED** (S-85, S-83). Minor residue: the "14 Aug 2026" Moneyhub data-deletion date in two blogs is unexplained. |
| [AV2] Wallet (BudgetBakers) Italian price periods (€5.99 monthly? €29.99 yearly? what is "Lifetime €29.99" vs "3-Year €59.99"?) | Open the Italian App Store listing's In-App Purchases on a device, or the in-app paywall. |
| [AV2] Finanzguru Plus exact current price (€4.29 monthly per trackers; annual €35.88 or €29.99?) | finanzguru.de/plus or in-app paywall; trackers disagree because of ongoing price tests. |
| [AV2] Bankin' post-2024: still Groupe Casino after the Kretinsky restructuring? | Infogreffe SIREN 907753735; bankin.com/en/legalnotice.html; mind Fintech "Bankin' réduit ses pertes en 2024". |

---

## Sources

| ID | Source (URL) | Pub. date seen | Reliability | Used for / doubts |
|---|---|---|---|---|
| S-01 | https://moneytothemasses.com/banking/emma-review-is-it-the-best-budgeting-app | n/d (2025–26) | medium | Emma pricing, tiers |
| S-02 | https://www.which.co.uk/money/banking/banking-security-and-payment-methods/open-banking-budgeting-and-saving-apps-aLl3e0g9I7Ft | 2026 | medium-high | Emma tier contents; lists Plus £5.99 (conflict) |
| S-02a | https://apps.apple.com/gb/app/emma-budget-planner-tracker/id1270062373 | n/d | high | Platform |
| S-03 | https://help.emma-app.com/en/article/how-much-does-emma-plusproultimate-cost-1ywhulq/ | n/d | high (official; fetch blocked, snippet only) | Emma prices |
| S-04 | https://truelayer.com/blog/financial-services/customer-story-emma/ ; https://www.fintechfutures.com/open-banking/truelayer-integrates-with-revolut-to-access-open-banking-data | n/d | high / medium | Emma–TrueLayer |
| S-05 | https://www.finextra.com/pressarticle/77549/emma-to-extend-bank-coverage-through-salt-edge-partnership ; https://blog.saltedge.com/collaboration-emma-saltedge/ | n/d (c. 2019) | medium / high | Emma–Salt Edge; FCA AISP |
| S-05a | https://truelayer.com/blog/italy-launch/ | n/d | high | TrueLayer Italy coverage |
| S-06 | https://www.uktech.news/growth-strategy/exit-strategy/snoop-vanquis-banking-group-20230801 ; https://tech.eu/2023/07/31/former-virgin-money-ceos-app-snoop-now-part-of-vanquis-banking-group/ ; https://thepaypers.com/fintech/news/snoop-acquired-by-vanquis-banking-group | 31 Jul–1 Aug 2023 | medium | Snoop acquisition; Jan 2025 savings account (snippet) |
| S-07 | https://tech.eu/2025/02/14/moneyhub-scraps-d2c-app-over-30-jobs-reported-to-be-axed/ | 14 Feb 2025 | medium | Moneyhub D2C exit, job cuts |
| S-07a | https://www.householdmoneysaving.com/moneyhub-review/ | 2026 | low | Moneyhub pricing; claims "closed early 2025" (conflict) |
| S-07b | https://smartmoneypeople.com/moneyhub-reviews/product/app | n/d | low-medium | Moneyhub user praise |
| S-08 | https://moneyhubhelp.zendesk.com/hc/en-gb/articles/48275693667217-Moneyhub-App-Closure-and-Your-Account-Options ; https://moneyhubhelp.zendesk.com/hc/en-gb/articles/32678340163217-Service-Migration-Q-A-s | 30 Jun 2026 (update) | high | Sunset 31 Jul 2026; WPS LifeStage; CSV export |
| S-08a | https://crestcast.co.uk/blog/moneyhub-is-closing-what-to-do-now ; https://aureli.app/blog/moneyhub-alternatives-uk | 2026 | low | Date conflict (Aug 14 vs 31 Jul) |
| S-09 | https://www.finder.com/uk/digital-banking/snoop-app-review ; https://www.nutsaboutmoney.com/reviews/snoop ; https://www.forbes.com/advisor/uk/banking/snoop-app-review/ | 2025 | medium | Snoop pricing, Plus features, platforms |
| S-09a | https://www.openbanking.org.uk/insights/snoop-budgeting-app-and-savings-account-aim-to-help-build-better-savings-habits/ | n/d | medium-high | Snoop feature description |
| S-09b | https://www.slowmoneymovement.com/platform-spotlights/snoop-review | 2026 | low | "free is enough" |
| S-10 | https://help.withplum.com/en/articles/8711801-what-is-a-plum-subscription ; https://help.withplum.com/en/articles/8711815-plum-ultra-legacy | 2025 | high (fetch blocked; snippet) | Plum tiers UK/EU, 7 Jul 2025 change |
| S-11 | https://apps.apple.com/it/app/plum-risparmi-e-investimenti/id1456139507 | n/d | medium | Italian rating 3.4/5, complaints |
| S-12 | https://www.money.it/le-15-migliori-app-per-la-gestione-delle-spese ; https://techprincess.it/migliori-app-gestione-spese-risparmio-2025/ ; https://blog.tuttosemplice.com/app-gestione-spese-2025-la-guida-alle-migliori-per-risparmiare/ | 2025–26 | low | Italian market perception of Spendee/Wallet/Emma |
| S-13 | https://www.choice.com.au/products/money/financial-planning-and-investing/creating-a-budget/spendee-premium ; https://millennialmoney.com/spendee-review/ ; https://www.wealthrocket.com/budgeting/spendee-review/ ; https://www.capterra.com/p/238829/Spendee/reviews/ | 2025–26 | medium / low | Spendee pricing, Salt Edge, complaints |
| S-13a | https://apps.apple.com/it/app/635861140?see-all=reviews&platform=iphone ; https://www.trustpilot.com/review/spendee.com | n/d | low-medium | Italian & Trustpilot complaints |
| S-13b | https://tracxn.com/d/companies/spendee/__XOLDP4GRSEyZBG1Pyrj4fJTJ_26p9vemtqWsL-8Y5Ig ; https://www.cbinsights.com/company/spendee/people | 2026 | medium | Ownership |
| S-14 | https://www.financeapps.guide/app/toshl/ ; https://apps.apple.com/us/app/toshl-finance-best-budget/id921590251 | 2026 | medium | Toshl pricing, Salt Edge/Plaid |
| S-14a | https://toshl.com/blog/how-to-set-up-your-finances-with-bank-connections-web-app/ ; https://toshl.com/blog/bank-connection-news-march-2021/ | 2021 | high | Toshl partners, web app |
| S-14b | https://learn.pocketsmith.com/article/1341-troubleshooting-salt-edge-bank-feeds | n/d | medium | Generic Salt Edge 90-day error behaviour |
| S-15 | https://www.ftd.de/vermoegen/finanzguru-test/ ; https://financer.de/bewertung/finanzguru/ ; https://www.mobilebanking.de/angebot/finanzguru-finanz-app-erfahrungen-kosten-test-check.html | 07/2025, 2026 | medium | Finanzguru pricing, free tier, ratings |
| S-16 | https://www.mind.eu.com/fintech/data/entreprises/bridge/ ; https://www.mind.eu.com/fintech/services-bancaires/info-mind-fintech-bpce-et-truffle-investissent-dans-bridge-lactivite-btob-de-bankin/ ; https://www.mind.eu.com/fintech/data/entreprises/powens/ | 2024 | medium | Bridge split, investors, CEOs; Casino claim (doubt) |
| S-17 | https://selectra.info/finance/guides/compte-bancaire/linxo ; https://fr.trustpilot.com/review/www.linxo.com?page=2 ; https://www.frenchweb.fr/rachete-par-le-credit-agricole-comment-linxo-compte-accelerer-dans-lopen-banking/390791 | n/d / 2026 | medium / low | Linxo pricing, ownership, complaints |
| S-17a | https://linxo.com/linxo-lab/ ; https://linxo.com/lancement-linxo-lab/ ; https://linxo.com/linxo-app-historique/ | 2026 | high | Linxo Lab coexistence, free, forecast date |
| S-17b | https://tirelire-ailee.fr/linxo-avis-2026-appli-fiable/ ; https://www.empruntis.com/.../linxo-avis/ | 2026 | low | Premium feature list |
| S-18 | https://apps.apple.com/es/app/fintonic-ahorra-y-fin%C3%A1nciate/id672220319?see-all=reviews ; https://javilinares.com/top-5-apps-gestionar-dinero/ ; https://verkot.es/2025/12/09/mejores-apps-de-finanzas-personales-2025-fintonic-wallet/ | 2025 | low-medium | Fintonic free model, complaints |
| S-18a | https://www.fintonic.com/blog/armando-baquero-ceo-fintonic/ ; https://www.murcia.com/empresas/noticias/2025/09/05-fintonic-alcanza-la-rentabilidad-tras-su-reestructuracion-y-liderazgo-renovado.asp ; https://www.df.cl/mercados/banca-fintech/nuestro-viaje-ha-terminado-fintech-espanola-fintonic-cierra-sus | 2025 | high / medium | Restructuring, profitability, ING stake, Chile exit |
| S-19 | https://help.emma-app.com/en/article/which-countries-is-emma-available-in-1x4q2og/ | n/d | high | UK/US/CA only |
| S-19b | https://community.emma-app.com/t/support-for-european-banks/627 | n/d | low | EU bank support requested |
| S-20 | https://uk.trustpilot.com/review/emma-app.com ; https://www.trustpilot.com/review/emma-app.com?page=4 ; https://www.tryabel.com/emma-app-review/ | n/d | low-medium | Emma complaint themes, rating |
| S-21 | https://help.emma-app.com/en/article/change-a-transaction-category-iipyy2/ ; https://help.emma-app.com/en/article/create-edit-and-delete-custom-categories-umylhf/ ; https://help.emma-app.com/en/article/advanced-transactions-editing-gap9ue/ ; https://help.emma-app.com/en/category/accounts-18ix4l7/ | n/d | high | Learning after 3 edits, custom categories (Pro), rules (Pro), 90-day renewal |
| S-22 | https://snoop.app/privacy-policy/ ; https://www.trustpilot.com/review/snoop.app?page=3 ; https://upthegains.co.uk/blog/snoop-app-review | n/d | high (policy) / low | Tink as aggregator; complaint themes |
| S-22a | https://www.thewealthmosaic.com/vendors/emma/emma-app/ ; https://www.electronicpaymentsinternational.com/news/money-management-app-us-emma/ | n/d | medium | 1.3m customers; US/CA launch |
| S-22b | https://emma-app.com/blog/emma-bondsmith-interest-pots | n/d | high | Interest pots |
| S-22c | https://emma-app.com/affiliate ; https://www.finder.com/uk/budgeting/emma-review | n/d | high / medium | Affiliate, cashback |
| S-22d | https://emma-app.com/features/invest | n/d | high | AUM fees by tier |
| S-23 | https://www.lovemoney.com/news/amp/96894/can-an-app-called-snoop-save-you-money ; https://moneytothemasses.com/banking/snoop-app-review ; https://getsmartsaver.co.uk/snoop-uk-review-2026/ | n/d / 2026 | medium / low | Snoop revenue model |
| S-23a | https://www.businessage.com/post/snoop-app-hits-a-million-downloads-ceo-john-natalizia-reveals-how | n/d | low-medium | 1M downloads |
| S-24 | https://hilfe.finanzguru.de/de/articles/1491970 ; https://www.neuebanken.de/finanzguru-test/ ; https://www.kagels-trading.de/finanzguru-test/ | n/d / 2026 | high (help) / low-medium | 90-day re-auth; complaint themes |
| S-25 | https://www.vixio.com/insights/pc-90-becomes-180-eba-makes-key-sca-change ; https://www.lexology.com/library/detail.aspx?g=8c495258-0737-4a0c-a259-c5fa7a2b0560 ; https://plaid.com/blog/eu-reauth-update/ | 2022–23 | medium-high | EBA 180-day change, dates |
| S-25a | https://www.saasant.com/blog/uk-eu-open-banking-consent-feed-break-fix/ | n/d | medium | UK re-consent vs EU re-auth |
| S-26 | https://developer.gocardless.com/bank-account-data/quick-start-guide | n/d | high | GoCardless default 90-day EUA |
| S-27 | https://techcrunch.com/2023/01/24/plum-launches-its-money-management-app-in-five-more-countries ; https://www.uktech.news/fintech/plum-launch-european-20230124 | 24 Jan 2023 | high / medium | Plum 10 markets incl. Italy |
| S-28 | https://withplum.com/en-ie/legal/privacy ; https://blog.withplum.com/why-we-need-your-bank-details-and-how-we-keep-them-and-your-money-safe/ | n/d | high | TrueLayer/Tink/Finker |
| S-29 | https://financefeeds.com/plum-reports-first-profitability-milestone-as-assets-and-subscriptions-grow/ ; https://ffnews.com/news/smart-money-app-plum-reaches-profitability ; https://businesscloud.co.uk/news/smart-money-app-plum-reaches-profitability/ | 2026 | medium | Profitability, ARR, AUM, perks |
| S-29a | https://www.therecursive.com/ai-fintech-plum-profitability-bbva-funding-expansion/ | n/d | medium | Debt financing |
| S-29b | https://withplum.com/press/plum-raises-16m-series-b-after-rapid-growth-and-approaches-profitability | n/d | high | Series B |
| S-30 | https://www.handelsblatt.com/erfahrungen/outbank-app-test/ ; https://www.wiwo.de/vergleich/outbank-test-und-vergleich/ ; https://www.konto.org/software/outbank/ | 2025–26 | medium | Outbank price, markets, test score |
| S-31 | https://outbankapp.com/umsaetze-automatisch-kategorisieren-mit-outbank/ ; https://outbankapp.com/kategorien-und-tags-in-outbank-was-ist-der-unterschied/ ; https://help.outbankapp.com/de/kb/articles/budgets-sparziele | n/d | high | Rules, categories/tags, budgets, contracts |
| S-32 | https://www.iphone-ticker.de/outbank-erneut-verkauft-neuer-besitzer-fuehrt-abo-modell-ein-182181/ ; https://www.t-online.de/finanzen/boerse/news/id_82691090/... ; https://www.mobiflip.de/offiziell-verivox-uebernimmt-outbank/ | 2017 / 2021 | medium | Ownership history |
| S-33 | https://selectra.info/finance/guides/compte-bancaire/bankin-avis ; https://touslescashbacks.com/articles/avis-bankin-application-gestion-budget ; https://leboninvestisseur.com/bankin-plus-ou-pro/ | 2026 | low-medium | Bankin' pricing (conflicting), users, features |
| S-33a | https://www.trustpilot.com/review/www.bankin.com ; https://fr.trustpilot.com/review/www.bankin.com?page=3 | n/d | low-medium | Complaint themes, cashback |
| S-34 | https://www.onvista.de/news/deutsche-bank-startet-mit-dem-finanzguru-76972869 ; https://paymentandbanking.com/finanzspritze-weitere-acht-millionen-fuer-finanzguru-app/ ; https://www.startbase.com/news/finanzguru-schliesst-finanzierungsrunde-ab/ | n/d | medium | Investors, users, Volders |
| S-35 | https://www.check-app.de/2026/08/09/finanzguru-womit-verdient-die-app-eigentlich-geld-und-was-bekommt-sie-dafuer-von-mir/ ; https://paymentandbanking.com/finanzguru-das-vorbild-fintech/ ; https://reisetopia.de/guides/finanzen/finanzguru/ | 9 Aug 2026 / n/d | medium | Business model, commissions share, contract features |
| S-36 | https://getfinny.app/blog/wallet-budgetbakers-review-2026 ; https://www.senki.io/reviews/wallet-by-budgetbakers | 2026 | low | Coverage claims, features |
| S-36a | https://www.techradar.com/reviews/wallet-finance-management | n/d | medium | 4,000 banks claim |
| S-36b | https://wealthypot.com/budgeting-apps/wallet-budgetbakers/ | 2026 | low | €4.49/mo, lifetime |
| S-37 | https://budgetbakers.com/en/legal/saltedge-terms/ | n/d | high | Salt Edge EULA, 90 days |
| S-37a | https://support.budgetbakers.com/hc/en-us/articles/7076796545554-Connect-disconnect-or-reconnect-your-bank | n/d | high (fetch blocked; snippet) | Consent 1–6 months |
| S-38 | https://www.trustpilot.com/review/budgetbakers.com ; https://www.supermoney.com/reviews/budgetbakers | 2025–26 | low-medium | Rating distribution, complaints |
| S-39 | Wallet by BudgetBakers MCP server instructions observed in this session's tool environment (fixed category IDs incl. auto-managed "Transfer") | 2026-10-02 | medium (primary system text, not public page) | Data model: transfers, system categories, API |
| S-40 | https://support.wiz.money/hc/en-us/articles/360035416613-Update-on-Open-Banking-PSD2-in-MoneyWiz ; https://help.wiz.money/en/articles/4440569-moneywiz-and-setapp-partnership-upd-2025 ; https://help.wiz.money/en/articles/4440621-how-to-change-the-online-banking-provider | 2019 / 2025 | high | Providers, Setapp constraint |
| S-40a | https://www.saasworthy.com/product/moneywiz/pricing ; https://apps.apple.com/app/id1511185140 | 2026 | medium | Pricing, complaint themes |
| S-41 | https://money.pro/faq/ ; https://money.pro/guide/ | n/d | high | Gold required, 12 months history |
| S-41a | https://sourceforge.net/software/product/Money-Pro/ ; https://apps.apple.com/us/app/money-pro-personal-finance/id972572731?mt=12&see-all=reviews | 2025 | low-medium | Pricing tiers, complaints |
| S-41b | https://ibearsoft.com/privacy.html | n/d | high | Plaid/Salt Edge |
| S-41c | https://www.saltedge.com/products/account_information/coverage ; https://www.saltedge.com/products/account_information/coverage/it | n/d | high | Coverage numbers |
| S-42 | https://apps.apple.com/us/app/buddy-budget-planner-app/id936422955 ; https://www.senki.io/reviews/buddy ; https://justuseapp.com/en/app/936422955/buddy-easy-budgeting/reviews | n/d / 2026 | medium / low | Buddy pricing, sharing, complaints |
| S-43 | https://www.monefy.com/ ; https://apps.apple.com/us/app/monefy-bills-money-tracker/id1212024409 | n/d | high / medium | Manual-only, pricing, backlash |
| S-44 | https://www.finder.com/cash-advance-apps/cleo-cash-advance-app ; https://www.thepennyhoarder.com/budgeting/cleo-app-review/ | 2025–26 | medium | Cleo US pricing, Trustpilot |
| S-45 | https://www.hunton.com/privacy-and-cybersecurity-law-blog/ftc-reaches-17-million-settlement-with-cash-advance-company-cleo-ai ; https://www.pymnts.com/news/regulation/2025/cleo-ai-settles-17-million-ftc-fast-money-case/ | Mar 2025 | high | FTC settlement |
| S-46 | https://web.meetcleo.com/faqs/en/articles/12992410-what-s-available-for-cleo-customers-in-the-uk ; https://www.prnewswire.co.uk/news-releases/cleo-brings-ai-powered-money-management-back-to-the-uk-302679663.html ; https://moneytothemasses.com/news/cleo-budgeting-app-announces-temporary-uk-exit | Feb 2026 / 2020 | high / medium | UK relaunch scope, 2020 exit |
| S-47 | https://mobilsiden.dk/nyheder/apps-sociale-medier/en-af-de-bedste-apps-i-danmark-lukker/ ; https://www.simfee.dk/artikler/spiir-lukker-hvad-nu ; https://mymoneyapp.dk/spiir-alternativ/ | 2026 | medium / low | Spiir shutdown 8 Jun 2026; Mastercard date doubt |
| S-48 | https://www.iexgeld.nl/Artikel/760160/Grip-app-stopt-dit-zijn-de-alternatieven.aspx ; https://www.emerce.nl/nieuws/abn-stopt-huishoudboekje-grip | 2022 | medium | Grip closure |
| S-49 | https://tink.com/press/dyme-tink/ ; https://firetheboss.com/personal-finance/budgeting/dyme-app-review/ ; https://www.trustpilot.com/review/dyme.app | n/d | high / low | Dyme Tink, pricing |
| S-50 | https://www.aziendabanca.it/notizie/fintech-insurtech/yolt-chiude ; https://www.finextra.com/newsarticle/38794/yolt-to-close-consumer-app-to-focus-on-open-banking-tech-platform | 2021 / 2023 | medium | Yolt closures |
| S-50a | https://www.aziendabanca.it/notizie/fintech-insurtech/oval ; https://www.ceotech.it/oval-money-lapp-di-risparmio-chiude-definitivamente/ ; https://www.altroconsumo.it/reclamare/bacheca-dei-reclami/chiusura-forzata-posizioni-di-/CPTIT01793349-13 | 2023–24 | medium | Oval Money closure |
| S-51 | https://www.finanzfluss.de/copilot/preise/ ; https://www.portfolioglance.com/investing-apps/finanzfluss-copilot ; https://finanda.de/finanz-apps/finanzguru-oder-finanzfluss-copilot/ | 2026 | high / medium | Copilot pricing, wealthAPI |
| S-52 | https://thepaypers.com/fintech/news/fast-budget-partners-with-salt-edge | n/d | medium | Fast Budget–Salt Edge |
| S-53 | https://www.fabrick.com/it-it/ | n/d | high | Fabrick PFM B2B |
| S-53a | https://www.economyup.it/fintech/open-banking/tink-storia-della-piattaforma-di-open-banking-svedese/ ; https://tink.com/it/account-aggregation/ | n/d | medium / high | Tink Milan office |
| S-54 | https://www.saltedge.com/products/account_information/coverage/it | n/d | high | Salt Edge Italy page (count not visible) |
| S-55 | Salt Edge API v6 reference — Consents (`period_days`, `expires_at`) and Providers (`max_consent_days`, `max_fetch_interval`): https://docs.saltedge.com/v6/api_reference (retrieved through the Context7 documentation index, 2026-10-02) | live | high (primary vendor docs) | [AV] Consent validity is configurable per consent/provider, not fixed at 90 days |
| S-56 | TrueLayer docs: https://docs.truelayer.com/docs/create-a-connection-v1 ("maximum of 90 days"); https://docs.truelayer.com/changelog?page=5 (Oct 2022 reconfirmation via `/connections/extend`); https://docs.truelayer.com/docs/create-payments-or-mandates-with-the-hpp (Italy fully supported); https://docs.truelayer.com/reference/start-payment-authorization-flow (country enum incl. IT) — via Context7, 2026-10-02 | live | high (primary vendor docs) | [AV] 90-day wording persists; UK re-consent endpoint; Italy coverage |
| S-57 | GoCardless Bank Account Data quick-start: https://developer.gocardless.com/bank-account-data/overview/bank-account-data/quick-start-guide — via Context7, 2026-10-02 | live | high | [AV] `max_historical_days` / `access_valid_for_days` optional with defaults; default values not in the retrieved excerpt |
| S-58 | Mastercard investor news — close of the Aiia acquisition (2021): https://investor.mastercard.com/investor-news/investor-news-details/2021/Mastercard-Advances-Global-Open-Banking-Capabilities-With-Close-of-Aiia-Acquisition/default.aspx (as cited in docs/research/raw/open-banking-providers-b.md, source 26; not fetched in this session) | 2021 | high | [AV] Corrects the Spiir/Aiia ownership date |
| S-59 | EBA Final Report EBA/RTS/2022/03 (5 Apr 2022); Commission Delegated Regulation (EU) 2022/2360, OJ 5 Dec 2022: https://eur-lex.europa.eu/eli/reg_del/2022/2360/oj (as cited in docs/research/raw/regulatory-landscape.md S-03; not fetched) | 2022 | high (primary law) | [AV] Corrects the "announced 5 Dec 2022" wording |
| S-60 | docs/research/raw/competitors-us.md S172 (PR Newswire, Cleo launches Autopilot, 2026-02-05, noting the UK relaunch) and S180 (Finextra, "Cleo relaunches in UK") | 2026 | high / medium | [AV] Independent corroboration of the Cleo UK relaunch |
| S-61 | docs/research/raw/user-pain-points.md G-11 — Actual Budget issue #5505 "GoCardless Bank Account Data is being discontinued": https://github.com/actualbudget/actual/issues/5505 | 2025-08-06 | medium | [AV] S-26 is a stale anchor |
| S-62 | Model recall (assistant knowledge to mid-2026; nothing fetched): Crédit Agricole–Linxo (2017 stake, Jan 2020 control; Oxlin 2021); Finanzguru–finAPI and dwins GmbH BaFin AISP authorisation (2019); Finanzguru >1M users (2023–24 press); Vanquis–Snoop 31 Jul 2023; FTC–Cleo 27 Mar 2025; Yolt Dec 2021 / Apr 2023; Plum Jan 2023 expansion; Emma 2024–25 price ladder; Toshl Medici scope; Moneyhub £1.49 price; Emma UK/US/CA footprint | — | low-medium (unverified) | [AV] Used only to flag inconsistencies or downgrade, never to upgrade a claim to FACT |

**Search log:** 47 WebSearch queries executed successfully (EN/DE/FR/ES/IT; app-store, Trustpilot, news, help centres); 14 further queries refused after the session budget was exhausted; 4 WebFetch attempts (help.withplum.com, support.budgetbakers.com, hilfe.finanzguru.de, help.emma-app.com) returned EGRESS_BLOCKED.

**Adversarial-pass log (2026-10-02):** 15 refutation WebSearch queries attempted, all refused (session budget 200/200 already consumed before the pass); 10 direct HTTPS probes to official pages (help.emma-app.com, moneyhubhelp.zendesk.com, help.withplum.com, hilfe.finanzguru.de, snoop.app, linxo.com, budgetbakers.com, eur-lex.europa.eu, saltedge.com, apps.apple.com) all policy-denied (403 on CONNECT; not retried); 5 Context7 documentation queries (Salt Edge ×2, GoCardless BAD, TrueLayer ×2) succeeded; sibling research files grepped for independent corroboration.

---

## Verification notes (adversarial pass)

**Pass date:** 2026-10-02. **Goal:** try to *refute* the 8–12 claims most consequential for product, brand or business decisions and most likely to be wrong or stale.

**Method and its limits, stated plainly.** The brief asked for fresh WebSearch queries. None could be run: the session's WebSearch budget was already exhausted (200/200) before the pass began, all 15 planned refutation queries were refused, and direct HTTPS egress is policy-denied for every competitor and official host tried. The pass therefore used three weaker routes, each labelled wherever it is used:

- **(a) Primary aggregator documentation** retrieved through the Context7 documentation index (Salt Edge API v6, TrueLayer docs, GoCardless Bank Account Data docs) — reliability high, but only for aggregator-level claims.
- **(b) Cross-document triangulation** with the sibling research files in `docs/research/raw/` (open-banking-providers-a/b, regulatory-landscape, competitors-us, user-pain-points, competitors-italy-and-ai-first). Counted as corroboration only where the sibling file cites a source *independent* of this document's own sources.
- **(c) Model recall** (assistant knowledge up to mid-2026; nothing fetched), logged as S-62. Used only to flag inconsistencies or to **downgrade** claims — never to upgrade a claim to FACT.

Every claim below should be re-run by a session with search budget before it drives a pricing or positioning decision. Inline edits are tagged **[AV]**.

| # | Claim (where) | Verdict | What was found / what changed | Sources |
|---|---|---|---|---|
| 1 | Emma is UK/US/CA only and cannot connect EU banks — underpins the "nobody serves Italy" thesis (§1, §2, §3.1, §7) | **Confirmed (weakly)** | No contrary evidence; consistent with Emma's published footprint through mid-2026 (recall) and with user-pain-points.md I-1 (same source S-19, not independent). Kept FACT; flagged for a pre-launch re-read. | S-19; S-62 |
| 2 | Emma Plus £4.99 / Pro £9.99 / Ultimate £14.99 (§1 item 4, §2, §3.1, §8 context) | **Unverifiable → downgraded** | Which? 2026 lists Plus at £5.99; the £4.99 ladder matches the 2024–25 published prices (recall). Possible 2026 increase. Status now FACT (2024–25) / UNKNOWN (current). | S-01, S-02, S-03; S-62 |
| 3 | Moneyhub: D2C exit announced Feb 2025 (~36 roles); £1.49/£14.99 pricing; sunset 31 Jul 2026; WPS LifeStage migration (§1, §3.4, §5) | **Confirmed (Feb 2025 exit, pricing) / unverifiable (sunset date, migration)** | Feb 2025 announcement and pricing match recall. Sunset date rests on the official help centre alone (S-08), which could not be re-read. No change to text beyond annotation. | S-07, S-07a, S-08; S-62 |
| 4 | Spiir: parent Aiia "acquired by Mastercard 2024 per one source; earlier reports say 2021" (§4) | **Corrected** | Mastercard announced the Aiia acquisition in Sept 2021 and closed it in Nov 2021 — Mastercard investor news, cited independently in open-banking-providers-b.md (source 26). The "2024" date was removed as wrong. Shutdown date 8 Jun 2026 not re-verifiable. | S-58; S-47 |
| 5 | Plum: Italy since Jan 2023 (10 markets); UK tiers £3.99/£7.99/£14.99 from 7 Jul 2025; legacy EU Pro €2.00 / Premium €9.99; profitability Jan 2026 with ARR £34m, ~£3bn AUM (§1, §2, §3.3, §5, §8) | **Confirmed (Jan 2023) / unverifiable (2025–26 items) / doubt added (€2.00)** | Jan 2023 five-country expansion including Italy matches recall of the TechCrunch report. €2.00 is implausibly low against the £2.99 UK legacy price → EU prices downgraded to ASSUMPTION. Profitability figures: three outlets quoting one company release = one source. | S-27, S-10, S-29; S-62 |
| 6 | Finanzguru: aggregator UNKNOWN; >500k users; Deutsche Bank ~20%; Plus €2.99 (§2, §3.10, §8) | **Partly corrected** | The 500k figure dates from 2019–20 funding coverage and is stale; later press reported >1M (recall) → marked as a floor. Aggregator: finAPI plus dwins GmbH's own BaFin AISP authorisation (recall) → recorded as ASSUMPTION. New cross-link: finAPI is 75 % Fabrick (Sella, IT) since Jun 2025 (open-banking-providers-b.md). Price and DB stake unchanged. | S-34, S-15; open-banking-providers-b.md src 4; S-62 |
| 7 | Snoop: Tink per privacy policy; Vanquis acquisition 31 Jul 2023; Plus £4.99/£39.99 (§2, §3.2) | **Confirmed (acquisition, price) / unverifiable (Tink)** | Acquisition date and Plus price match recall. The Tink naming cannot be re-read and may have changed post-acquisition — annotated as "as of policy version seen". | S-06, S-09, S-22; S-62 |
| 8 | Bankin' B2C "fully acquired by the Casino group" (§2, §3.12, §13) | **Unverifiable — doubt strengthened** | No corroboration in any sibling document; no matching deal in recall. Marked "probably erroneous; do not use in decisions" pending Infogreffe / mentions légales. | S-16 |
| 9 | Linxo: acquired by Crédit Agricole, date UNKNOWN; aggregator UNKNOWN (§2, §3.13) | **Corrected (as ASSUMPTION)** | Recall: minority stake 2017, control Jan 2020; B2B unit Linxo Connect rebranded Oxlin (ACPR AISP/PISP) 2021, so the app's aggregator is in-group. "Since 2010" is the founding year. Added as ASSUMPTION pending the Jan 2020 press release. | S-17; S-62 |
| 10 | Cleo: FTC $17m settlement 27 Mar 2025; UK relaunch 5 Feb 2026 (§2, §3.17, §5) | **Confirmed** | FTC settlement matches recall. UK relaunch corroborated by an independent source set in competitors-us.md (PR Newswire 2026-02-05; Finextra). | S-45, S-46, S-60; S-62 |
| 11 | Wallet (BudgetBakers): ~€4.49/mo; aggregator Salt Edge (§1, §2, §3.6, §8) | **Salt Edge confirmed / price downgraded** | Salt Edge: official BudgetBakers legal page plus recall. Price: a single low-reliability blog → downgraded FACT → ASSUMPTION in §2, §3.6. | S-37, S-36b; S-62 |
| 12 | EBA 90→180 days "announced 5 Dec 2022; comply by 25 Jul 2023" (§1 item 5, §6) | **Corrected (dates)** | Correct sequence: EBA Final Report 5 Apr 2022; Delegated Regulation (EU) 2022/2360 published in the OJ 5 Dec 2022, in force 25 Dec 2022; ASPSP application by 25 Jul 2023. Corroborated by regulatory-landscape.md S-03. | S-25, S-59; S-62 |
| 13 | "Aggregators' default EULAs/docs still describe 90-day renewals" — Salt Edge, GoCardless, TrueLayer (§1 item 5, §6) | **Confirmed for TrueLayer / re-characterised for Salt Edge / stale for GoCardless** | TrueLayer Data API v1 docs still say "maximum of 90 days" and expose `/connections/extend` (UK re-consent) — confirmed from primary docs. Salt Edge API v6: validity is per-consent `period_days` capped by provider `max_consent_days`, so the EULA's "90 days" is boilerplate, not a technical default. GoCardless BAD is being discontinued (Aug 2025) → S-26 is a weak anchor. §6 amended. | S-55, S-56, S-57, S-26, S-61 |
| 14 | TrueLayer covers Italy (UniCredit, Intesa, Poste) (§7) | **Confirmed** | `IT` is in TrueLayer's API country enum and Italy is a fully supported hosted-page market (primary docs); the Italy-launch blog is dated 2020 per open-banking-providers-a.md #64. | S-56; S-05a |
| 15 | Toshl: Medici tier = "US/CA bank import"; EU connections in Pro UNKNOWN (§2, §3.9, §13) | **Downgraded** | Recall of Toshl's own pricing: all automatic bank connections (any country/provider) sit in Medici, so Italian sync most likely needs Medici ($4.99/mo); the "US/CA" wording is the reviewer's. Recorded as ASSUMPTION. | S-14; S-62 |
| 16 | Yolt consumer app closed 2021; B2B closed Apr 2023 (§1, §4, §5) | **Confirmed** | Matches recall (consumer app closed Dec 2021; B2B wound down by Apr 2023). Month added. | S-50; S-62 |

**Claims that could not be checked at all** (left as written, reliability unchanged): Spiir shutdown date (8 Jun 2026); Moneyhub sunset (31 Jul 2026) and WPS migration; Plum 7 Jul 2025 re-pricing; Fintonic 2025 restructuring/profitability/ING stake; Fast Budget–Salt Edge partnership; Dyme and Finanzfluss Copilot prices; Outbank price; all App Store / Trustpilot ratings and review percentages; user counts for Emma (1.3m), Bankin' (6m), Plum (2m), Spiir (~1M). **Trademark/domain-availability claims** do not appear in this document (they live in `naming-lilleri.md`) and were therefore out of scope here.

**Net effect on decisions.** None of the corrections overturns the executive-summary conclusions (Italy gap; reconciliation quality as the opportunity; €3–5 "Plus" anchor; consent-renewal UX as a differentiator). Three nuances change: (i) Finanzguru is materially larger than "500k users" implied, which strengthens it as the benchmark for a generous free core plus commission rail; (ii) the 90-vs-180-day gap is an *app help-page and bank-behaviour* problem, not an aggregator-imposed limit — Salt Edge consents are configurable per provider, which is good news for Lilleri's consent-expiry UX; (iii) finAPI's Fabrick ownership links the DACH benchmark's plumbing to an Italian aggregator candidate already on the provider shortlist.
