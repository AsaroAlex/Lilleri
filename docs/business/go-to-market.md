# Lilleri go-to-market — Italian launch strategy

**Project:** LILLERI (consumer PFM, Italy-first then Europe)
**Document date / verification date of carried-over claims:** 2026-10-02
**Inputs:** raw research (R-BC, R-OBA, R-OBB, R-US, R-EU, R-IT, R-PP, R-AI, R-BB), decisions in `business-model.md`, `pricing-analysis.md`, `unit-economics.md`, `revenue-scenarios.md`; two WebSearch checks on 2026-10-02 (Apple Ads 2026 benchmarks W-8; RevenueCat 2026 W-1).
**Language note:** documentation in English; product copy, taglines and voice examples in Italian with English glosses.
**Label key:** FACT · ASSUMPTION · HYPOTHESIS · DECISION · OPEN QUESTION · UNKNOWN.

---

## 0. Summary

- **Positioning (DECISION):** Lilleri is the app that *understands* what happens to your money across all your Italian accounts, not another place to *see* them. "See all your accounts" is table stakes in Italy (Intesa XME Banks, Hype paid plans — FACT medium, R-IT §3.10); reconciliation quality, learning categorisation and the Review Inbox are the differentiators (R-PP §H).
- **Growth model (DECISION):** organic and referral-led. The unit economics (`unit-economics.md` §7) do not support paid acquisition at Base: loaded payback 43 months at €3 per registered user. Targets: blended CAC ≤ €2 per registered user at launch, ≤ €1.50 by month 12; CAC per paid subscription ≤ €40; paid UA limited to Apple Search Ads tests in Italy (CPI benchmark ≈ $1.32 for Italy as a tier-3 market, finance category global CPI ≈ $8.44 — FACT medium, W-8).
- **Channels in priority order:** ASO in Italian; content/SEO on Italian money topics that global apps ignore (F24, MAV/RAV, bollette, conto cointestato, partita IVA); personal-finance creators and communities (YouTube, Reddit r/ItaliaPersonalFinance, Telegram); a referral programme paid in Plus months (not cash) at launch; partnerships (comparators, banks/brokers, Fabrick ecosystem) only after trust metrics; Italian fintech press.
- **Sequencing:** waitlist (M0) → closed beta of 500 → 2,000 users on the top-10 Italian banks (M2–M5) → open beta (M6) → public launch iOS/Android (M8) → offers-rail experiments (M9+) → 12-month review with Gate C KPIs (M12) → first European market selection (M15+).
- **Metrics:** activation (registered → connected ≥ 50 %), sync success ≥ 97 %/day, auto-categorisation auto-error ≤ 2 %, Review Inbox "zero" within 7 days ≥ 60 %, D30 ≥ 10 % (finance benchmark 4–9 %), trial→paid ≥ 25 %, paid subscriptions per 1,000 MAU ≥ 120 by month 6 and ≥ 180 by month 9, NPS ≥ 40, CAC as above.

---

## 1. Who we launch for (ICP) and why Italy first

| Segment | Evidence | Status | Role in launch |
|---|---|---|---|
| **Multi-account Italians, 25–45**, 3–5 relationships (Fineco/BBVA/Buddybank/Revolut IT/Satispay/Postepay), who reconcile by hand in a sheet at month-end | Creator transcripts Y-02/Y-03 (R-IT §1.3, §7) | FACT (low-medium) | Primary ICP; the free tier's 1-institution cap is designed to convert exactly them |
| Couples with personal accounts + a joint account | Italian couples norm (R-IT §4.5) | FACT (low-medium) | Family plan; second wave |
| Partita IVA freelancers who separate business/personal and park tax money | Y-03 (R-IT §7) | FACT (low) | Pro now, Business Later |
| Finance-content audiences (175 k-subscriber creators teaching ChatGPT-on-Revolut-exports budgeting) | Y-02 (R-IT §5.4) | FACT (low-medium) | Demand proof for "AI budget output with zero effort" |
| Self-hosters / GoCardless refugees (Actual Budget, Firefly) | R-PP §F, G-79 | FACT (high as a segment, small) | Early critics and advocates; export/API matter |
| Not launch ICP: single-bank users whose bank app already categorises; users of lending-led apps | R-IT §3 | — | They are the free tier's long tail |

Why Italy first (HYPOTHESIS, well supported): no Italian-born aggregator PFM at scale (Oval Money closed; Fast Budget status UNKNOWN); the apps that serve Italy are generic Salt Edge trackers with linking complaints (R-EU §1; R-IT §1); YNAB runs Plaid in Italy but bank-level quality is UNKNOWN; Italian payment types (F24, MAV/RAV, PagoPA, bollettini, Postepay top-ups, SDD) are mis-categorised by global taxonomies (R-IT §8); Italian creators carry referral codes for 5–10 banks each, so a referral culture exists (R-IT Y-01/Y-06/Y-07).

---

## 2. Positioning and messaging

**Positioning statement (DECISION):** For Italians with more than one account who are tired of checking three apps and a spreadsheet, Lilleri is the personal-finance app that connects your accounts once and then understands what happens to your money by itself — pairing transfers, settling card payments, catching duplicates and refunds, learning your categories — so that you only review what matters. Unlike bank apps and generic trackers, it is correct across institutions, learns from you, never shows ads and never sells data.

| Element | Italian copy | English gloss | Note |
|---|---|---|---|
| Tagline | **"Collega i tuoi conti una volta. Al resto pensa Lilleri."** | Connect your accounts once. Lilleri takes care of the rest. | Mirrors the promise |
| Secondary | "Capisce da sola cosa succede ai tuoi soldi." | It understands by itself what happens to your money. | Automation, not budgeting method |
| Review Inbox | "Inbox zero per le tue finanze." | Inbox zero for your finances. | Core mechanic |
| Trust line | "Sola lettura, tramite un intermediario autorizzato. Niente pubblicità. Mai. I tuoi dati non si vendono." | Read-only, through an authorised intermediary. No ads. Ever. Your data is not for sale. | R-PP §E: named regulated aggregator, read-only, no data selling |
| Italian specifics | "F24, MAV, bollettini, ricariche Postepay: Lilleri sa cosa sono." | F24, MAV, payment slips, Postepay top-ups: Lilleri knows what they are. | R-IT §8 |
| Consent expiry | "Tra 12 giorni la tua banca chiederà di confermare l'accesso. Ci pensiamo insieme, ci vuole un minuto." | In 12 days your bank will ask you to confirm access. We'll do it together, it takes a minute. | The failure mode nobody markets (R-EU §6) |
| Failure honesty | "Intesa non risponde da stamattina (manutenzione). Riproviamo alle 14:30." | Intesa has not responded since this morning (maintenance). We'll retry at 14:30. | Never "sync offline" (R-PP §H #4) |
| Paywall moment | "Aggiungi Fineco e Revolut con Lilleri Plus — €4,99 al mese o €39,99 all'anno." | Add Fineco and Revolut with Lilleri Plus — €4.99/month or €39.99/year. | Contextual, concrete |
| What we are not | "Lilleri non ti presta soldi e non ti dà consigli finanziari." | Lilleri does not lend you money and does not give financial advice. | Distance from Cleo-style lending (R-EU §12 #5) |

Voice (DECISION): calm, precise, second person singular, no exclamation marks, numbers always with the euro sign and two decimals, bank names spelled as the bank spells them.

---

## 3. Channels

CAC figures are ASSUMPTIONS unless marked; "CAC" = cost per registered user.

| Channel | What | Expected CAC | Share of registrations (launch year) | Evidence / notes |
|---|---|---|---|---|
| **ASO (App Store / Google Play, Italian)** | Keywords: "gestione spese", "app spese", "budget", "conti in un'unica app", "spese condivise", "abbonamenti", "entrate uscite"; screenshots that show reconciliation (a paired transfer, a settled card statement, the inbox); ratings prompt only after an "inbox zero" moment | €0–0.50 | 25–35 % | Italian guides already rank "app gestione spese" lists (R-EU S-12); 2026 "reviews" are competitor SEO farms (R-US §6 #15) — Lilleri must earn store rank, not buy listicles |
| **Content / SEO on Italian money topics** | Evergreen Italian articles and tools: "Cos'è l'F24 e come categorizzarlo", "MAV e RAV spiegati", "Conto cointestato o app per la coppia?", "Partita IVA: separare spese personali e lavoro", "Quanto costa Revolut/N26/Hype nel 2026" (honest comparisons), "Come esportare i movimenti da Fineco/Intesa/Poste"; a free "calcolatore abbonamenti" | €0.50–1.50 | 15–25 % | Creators' own content proves demand for these exact questions (R-IT §7); global apps cannot write them |
| **YouTube creators (personal finance, Italy)** | 10–20 creators in the 20 k–200 k range; sponsored segments with honest demos; creator-specific referral links paying Plus months; no fabricated reviews | €1–3 (sponsored); €0.50–1 (organic mentions) | 15–25 % | Every Italian finance video carries referral codes (FACT low, R-IT Y-01/Y-06/Y-07); Wallet became the default via creators (Y-02/Y-03) |
| **Reddit r/ItaliaPersonalFinance, Telegram finance groups, FinanzaOnline** | Founder-led presence, AMAs, a public changelog, honest coverage page ("quali banche funzionano oggi"); no astroturfing | €0.20–0.80 | 5–10 % | Sentiment there is UNKNOWN (R-PP I-12) — verify before launch; self-hoster communities (Actual/Firefly) are reachable via the GoCardless-refugee threads (R-PP G-79) |
| **Referral programme** | Both sides get 1 month of Plus per activated referral (referred user connects ≥ 1 institution); Pro trial +15 days; no cash at launch | €1–2 (cost of Plus months at COGS) | 10–20 % | Italian neobanks pay €5–50 cash (FACT low-medium); Lilleri cannot win a cash war; Rocket pays affiliates $4–10 per install (FACT medium, R-US S83) |
| **Partnerships** | (a) comparators (Facile.it/SOStariffe/Segugio) for the Phase-2 switching rail; (b) 2–3 banks/brokers for referral payouts (Buddybank, Tinaba, Moneyfarm-type); (c) Fabrick/CBI ecosystem contacts for later B2B2C; (d) an education partner (Tinaba's "Investiamo" model) | €0–1 | 0–5 % in year 1 | Only after trust metrics; never in the Review Inbox (`business-model.md` §6) |
| **Press / PR** | Italian fintech and consumer press: Aziendabanca, Economyup, Il Sole 24 Ore (Plus24), Corriere Economia, Wired IT, Il Post; angle: "the first Italian app that reconciles transfers across banks" + the no-ads promise | ≈ €0 marginal | 5 % | Press covers Italian fintech launches (Satispay, Hype coverage in R-IT W-08) |
| **Paid UA (tests only)** | Apple Search Ads Italy on brand and category keywords; small Meta test; stop if CAC per registered > €3 | €1.50–3.50 per install (ASSUMPTION; W-8: Italy CPI ≈ $1.32, tier-3 CPT $0.50–1.50; finance global CPI $8.44) | 0–10 % | Budget cap €5 k/month during launch; paid UA only scales if C5 (`revenue-scenarios.md`) holds |

Blended CAC target: Low €1.50 / Base €2.00 / High €3.00 per registered user in the launch year (vs research Base €6 for a paid-heavy mix, R-BC §12). Registered → connected ≥ 50 % keeps CAC per connected user ≤ €4.

---

## 4. Waitlist and closed beta

| Stage | Goal | Mechanics | Size / exit criteria |
|---|---|---|---|
| **Waitlist (M0–M2)** | Demand signal, price research, bank coverage priorities | Italian landing page with the tagline, a "quali banche usi?" survey (multi-select of 30 institutions), a Van Westendorp price block, and the trust line; invite codes; creator pre-announcements | 5,000–10,000 sign-ups (Low 2 k / High 20 k, ASSUMPTION); exit when the provider contract is signed and the top-10 banks pass sandbox + restricted-production tests |
| **Closed beta wave 1 (M2–M3)** | Prove reconciliation on real Italian data; measure fill-rates per bank; build the eval set | 500 users chosen for coverage of Intesa Sanpaolo, UniCredit, Poste/Postepay, Fineco, BPER, Banco BPM, MPS, Crédit Agricole Italia, Credem, BCC Iccrea + Revolut IT; Hype/N26/Satispay/Mediolanum as "coverage unknown" cohort | Exit: sync success ≥ 95 % daily on top-10; auto-error ≤ 3 %; transfer-pair precision ≥ 95 % on labelled pairs; consent-renewal flow tested at day 90 for at least one bank |
| **Closed beta wave 2 (M4–M5)** | Conversion mechanics and support load | 2,000 users; 30-day Pro trial live; paywall copy A/B; support via email + in-app; weekly "cosa abbiamo sistemato" changelog | Exit: trial→paid ≥ 20 %; support contacts ≤ 25 per 1,000 MAU; NPS ≥ 30; free AIS cost per paid subscription measured |
| **Open beta (M6–M7)** | Scale to 10 k MAU, ASO, creators | Public TestFlight/Play open testing; store listings live; first creator wave; referral programme on | Exit: D30 ≥ 8 %; paid subscriptions ≥ 100 per 1,000 MAU; no P1 data-correctness incident open > 7 days |
| **Launch (M8)** | Public iOS/Android launch in Italy | Press, creators wave 2, App Store featuring pitch (Italy editorial), Product Hunt optional | — |

Beta recruiting copy: "Cerchiamo 500 persone con almeno tre conti diversi che vogliono smettere di riconciliare a mano." (We are looking for 500 people with at least three different accounts who want to stop reconciling by hand.)

---

## 5. Launch sequencing and gates

| Month | Milestone | Gate to pass before next step |
|---|---|---|
| M0 | Waitlist live; RFP sent to 5 providers; counsel engaged on licence route and offers rail | Provider shortlist with prices (C1 in `revenue-scenarios.md`) |
| M1 | Provider contract (non-exclusive, ≤ 12 months); DPIA; DPO; sandbox + restricted production on top-10 banks | Legal basis confirmed in writing (route A or B) |
| M2–M3 | Closed beta wave 1 (500) | Reconciliation quality gates (§4) |
| M4–M5 | Closed beta wave 2 (2,000); pricing tests | Trial→paid ≥ 20 %; AIS cost per paid subscription measured; decision F vs F′ taken |
| M6–M7 | Open beta; ASO; creators wave 1; referral | D30 ≥ 8 %; paid subscriptions ≥ 100/1,000 MAU |
| M8 | Public launch (iOS + Android), press | — |
| M9–M11 | Family and Pro feature completion; offers-rail experiment with 2 partners (opt-in cohort only) | Opt-in ≥ 25 % in the experiment cohort with no NPS penalty |
| M12 | 12-month review against Gate C conditions C1–C6 | Continue / tighten free tier / switch to trial-gated |
| M15+ | First European market selection | Criteria in §9 Q6 |

---

## 6. CAC targets and launch budget (ASSUMPTION; DECISION on caps)

| Item | Low | Base | High | Notes |
|---|---|---|---|---|
| Launch-year marketing budget (M0–M12) | €15 k | €40 k | €90 k | Creators €15–40 k, content €5–15 k, paid tests €5–20 k, PR/events €2–10 k, referral COGS €3–10 k |
| Registered users in launch year | 40 k | 80 k | 150 k | Implied by budget ÷ CAC plus organic |
| Blended CAC per registered | €1.50 | €2.00 | €3.00 | Organic/referral ≥ 70 % of registrations |
| CAC per connected user | €3 | €4 | €6 | Activation 50 % Base |
| CAC per paid subscription | €21 | €40 | €75 | Registered→paid 7 / 5 / 4 % |
| Payback (contribution €2.30–2.84) | 5–9 mo | 14–18 mo | 26–33 mo | `unit-economics.md` §7 |
| Rule | Paid UA stops if CAC per registered > €3 for two consecutive weeks or if loaded payback > 18 months at measured conversion | DECISION | — |

---

## 7. Trust-building actions that double as marketing (DECISION)

| Action | Why it converts in Italy |
|---|---|
| Public, live "Copertura banche" page: per institution — works / partial (no card accounts) / not available — with last-checked date | Spendee's Italian reviews punish advertised-but-broken banks (R-EU §12 #8); honesty on UniCredit/Mediolanum/Crédit Agricole card accounts (FACT, R-OBB §1) |
| "Chi vede i tuoi dati" page naming the licensed AISP, hosting region (EU), AI processors, retention, export and deletion | Revolut Sep-2026 disclosure incident made "who sees my data" a live question (R-IT §3.1); Finanzguru/Fintonic advertise their regulator and servers (R-PP §E) |
| Consent-expiry countdown and plain-language renewal | The most complained-about failure mode across all apps (R-PP §A #4) — nobody markets a fix |
| Export and delete in two taps from day 1 | Oval Money, Moneyhub, Mint shutdown memories (R-PP §E) |
| No ads, no data selling, no lending — written on the store listing | R-PP §E; Cleo/Rocket cautionary tales |
| Public changelog and incident page in Italian | Postepay app migration and isybank episodes primed users for "apps disappear" (R-IT §7) |

---

## 8. Metrics dashboard (DECISION)

| Area | Metric | Target (launch year) | Benchmark / source |
|---|---|---|---|
| Acquisition | Registered users; CAC per registered (blended, by channel) | ≤ €2.00 blended | §6 |
| Activation | Registered → first institution connected (≤ 24 h) | ≥ 50 % (Low 30 / High 70) | R-BC §14 input 11 |
| Time to first value | Registered → first reconciled insight ("ecco cosa è successo ai tuoi soldi") | ≤ 10 minutes median | Zero-setup promise |
| Data correctness | Daily sync success per institution; silent-drop rate; duplicate rate; transfer-pair precision/recall; pending→booked replacement precision | ≥ 97 % / 0 tolerated / < 0.5 % / ≥ 95 % / ≥ 98 % | R-PP §A #1–#8; R-AI §6.2 |
| AI quality | Auto-rate; auto-error-rate; review-rate; abstain accuracy | ≥ 75 % / ≤ 2 % / ≤ 20 % / ≥ 90 % | R-AI §6.2 |
| Engagement | Review Inbox items per user-week; "inbox zero" reached within 7 days of a sync; sessions per MAU | ≤ 10 / ≥ 60 % / ≥ 12 | Product hypothesis |
| Retention | D1 / D7 / D30; M3 MAU retention | ≥ 35 / 20 / 10 %; ≥ 40 % | Finance apps D30 4–9 % (ASSUMPTION, R-BC §12) |
| Monetisation | Trial→paid; paid subscriptions per 1,000 MAU; annual share; Family share | ≥ 25 %; ≥ 120 (M6) → ≥ 180 (M9); ≥ 60 %; ≥ 20 % | W-1 (17–32-day trials median 42.5 % cross-category); `unit-economics.md` |
| Business KPIs | Free AIS cost per paid subscription; offers revenue per MAU (from M9); gross margin per 1,000 MAU | ≤ €1.20; ≥ €0.15 by 100 k MAU; ≥ 50 % | `business-model.md` D-BM-1; `revenue-scenarios.md` §6 |
| Trust | NPS; Trustpilot vs App Store gap; support contacts per 1,000 MAU; refund/chargeback rate; consent-renewal completion | ≥ 40; gap ≤ 1.0 star; ≤ 15; ≤ 0.5 %; ≥ 80 % within 7 days of expiry | R-US §4.5 (4.5–4.9 store vs 2.0–3.5 Trustpilot) |
| Referral | Share of registrations from referral; K-factor | ≥ 15 %; ≥ 0.3 | — |

---

## 9. Decisions / Recommendations

| ID | Decision |
|---|---|
| D-GTM-1 | Italy-only launch; organic/referral-led growth; paid UA capped at €5 k/month for tests with the stop rule in §6 |
| D-GTM-2 | Positioning on reconciliation and understanding, not on aggregation; the tagline "Collega i tuoi conti una volta. Al resto pensa Lilleri." |
| D-GTM-3 | Waitlist → closed beta (500 → 2,000) → open beta → launch at M8 with the gates in §5 |
| D-GTM-4 | Referral rewards in Plus months, not cash, at launch; cash bonuses only if a bank partner funds them (Phase 2) |
| D-GTM-5 | Public coverage page, "who sees your data" page, consent-expiry UX and two-tap export/delete are launch requirements, not nice-to-haves |
| D-GTM-6 | Creator deals are sponsorships with disclosure and honest demos; no paid "reviews"; no SEO attack content |

## 10. Open questions

| # | Question | How to verify |
|---|---|---|
| Q1 | Italian sentiment on PFM apps in r/ItaliaPersonalFinance, Telegram groups and FinanzaOnline (not reachable in research) | Read threads; 20 user interviews from the waitlist |
| Q2 | Live coverage and quality for Hype, N26, Satispay, Mediolanum, Widiba, BBVA Italia, Postepay Evolution through the chosen provider | Sandbox + restricted production; provider ASPSP CSV (R-OBA §6 #2) |
| Q3 | Creator CPMs/CPAs in Italian personal finance and whether creators accept Plus-month referral rewards instead of cash | Outreach to 10 creators |
| Q4 | Actual CPI/CPT for finance keywords in Italy on Apple Search Ads (benchmarks are cross-category) | €2 k test campaign |
| Q5 | Whether the 30-day trial that connects all accounts and then drops to one institution creates reviews like "my accounts stopped updating" | Beta wave 2 copy test |
| Q6 | First European market: criteria = provider coverage quality, incumbent strength (DE: Finanzguru; FR: Bankin'/Linxo; ES: Fintonic pivoted; PT/GR/NL: Plum present), language cost, consent behaviour | Decide at M12 with provider data; candidates Spain and Portugal (HYPOTHESIS) |
| Q7 | App Store editorial featuring process for Italy | Apple partnership contacts after launch |

---

## 11. Sources

| ID | Source | URL | Date seen | Reliability | Used for |
|---|---|---|---|---|---|
| R-IT | `competitors-italy-and-ai-first.md` §1, §3, §4.5, §5.4, §7–§9, Y-01…Y-07, W-01, W-08 | repo | 2026-10-02 | low–medium | ICP, referral culture, Italian specifics, incumbents' aggregation |
| R-PP | `user-pain-points.md` §A, §E, §G, §H | repo | 2026-10-02 | medium | Pain points, trust signals, metrics |
| R-EU | `competitors-eu-uk.md` §1, §6, §11, §12, S-12 | repo | 2026-10-02 | medium | Italian coverage gap, consent UX gap, patterns to avoid |
| R-US | `competitors-us.md` §4.5, §5, §6, S83 | repo | 2026-10-02 | medium | Trust gap, referral payouts, patterns |
| R-OBA / R-OBB | `open-banking-providers-a.md` §6, §7; `open-banking-providers-b.md` §1, §16 | repo | 2026-10-02 | medium–high | Bank coverage facts, card-account limits, RFP |
| R-AI | `ai-ml-transaction-intelligence.md` §6.2 | repo | 2026-10-02 | medium | Quality metrics definitions |
| R-BC | `business-and-cost-inputs.md` §12, §13, §14 | repo | 2026-10-02 | medium | CAC/retention/conversion ranges, referral benchmarks |
| UE / RS / BM | `unit-economics.md`, `revenue-scenarios.md`, `business-model.md` | repo | 2026-10-02 | HYPOTHESIS/DECISION | Targets and gates |
| W-1 | RevenueCat State of Subscription Apps 2026 | https://www.revenuecat.com/state-of-subscription-apps | 2026-10-02 | medium (search summary) | Trial length and conversion |
| W-8 | AppTweak "Apple Ads benchmarks 2026"; Business of Apps "Apple Search Ads costs (2026)"; apsteq CPI/CPT 2026 | https://www.apptweak.com/en/aso-blog/apple-ads-benchmarks ; https://www.businessofapps.com/marketplace/apple-search-ads/research/apple-search-ads-costs/ ; https://apsteq.com/blog/app-user-acquisition-cost/ | 2026-10-02 | medium (search summaries) | Italy CPI ≈ $1.32; tier-3 CPT $0.50–1.50; finance CPI $8.44 / CPT $3.55 |
