# Personas (Italy): who Lilleri is for, what they connect, what they fear, what "zero setup" means to them

**Project:** LILLERI (greenfield consumer PFM; Italy-first, then Europe)
**Document type:** Phase 1 product document — evidence-based personas
**Research / verification date for every claim:** 2026-10-02
**Author:** UX researcher + consumer fintech PM (founding team)
**Language:** documentation in English; product-copy examples in Italian.

**Review provenance (DECISION, 2026-10-02):** this revision checks repository evidence, source consistency and design implications. Source URLs/access dates below are inherited observations, not fresh web verification. FACT means the cited observation is recorded; vendor performance, source independence, market prevalence and current legal/commercial eligibility remain unverified where stated.

## How to read this document

- **Personas are composites (ASSUMPTION).** No Lilleri user interviews exist yet. Each persona is assembled from documented behaviours in the raw research (Italian creator transcripts, Italian App Store review digests, provider documentation, competitor help centres, GitHub issue reports). The *behaviours* carry their own labels (FACT / ASSUMPTION / HYPOTHESIS / UNKNOWN); the *person* — name, age, city, job — is fictional and exists only to make the behaviours concrete.
- **Source prefixes** follow `docs/research/user-pain-points.md`: `PP-` (raw pain-points document), `IT-` (Italian competitor document), `EU-` (UK/EU document), `US-` (US document), `WS-` (WebSearch run on 2026-10-02 for the synthesis). `#n` refers to the ranked pain points in `docs/research/user-pain-points.md` §1; `D-n` to its decisions; `I-n` to its Italian-specific items.
- **Priority (DECISION, revised 2026-10-02):** P1 is the **MVP (primary)** target; P4 and P2 are **MVP as individuals** — their single-user needs (own accounts, bills, transfers, card debits) are in scope, while the **household layer** (cross-consent pairing, shared tags, joint-account ledger, invitations) is **Later (first expansion)**, consistent with `docs/research/opportunity-map.md` §5 (household post-MVP), `docs/product/mvp.md` §2.2 and the compliance model (`docs/compliance/consent-model.md` §2 has no household consent type; `docs/compliance/privacy-model.md` §§2/4/5 forbid cross-user aggregation and key sharing). P3 is **Secondary (MVP-compatible)**; P5 is **Later**. The ordering is a DECISION proposed here, to be ratified in the product strategy.
- **Minors:** no persona connects a minor's account. Lilleri's privacy model gates at 18+ (`privacy-model.md` §4); teen accounts sit behind `docs/compliance/legal-open-questions.md` Q16. Children's spending is visible at launch only through the parents' own transactions (top-ups, PagoPA school fees).
- **Validation:** every persona ends with "How to validate". Until 5–8 interviews and a 2-week diary study per MVP persona are done, treat the trust thresholds and willingness-to-pay as HYPOTHESES.

---

## 0. Persona overview and priority

| # | Persona | One-line | Priority | Why this priority (evidence) |
|---|---|---|---|---|
| P1 | **Giulia — the multi-account professional** | 3 bank relationships + Amex + Satispay + Revolut; "I have too many accounts"; wants review to take minutes, not a spreadsheet ritual (her best tool today costs her ~15 min/month with Wallet, `IT-Y-02`; Lilleri's target is under five) | **MVP (primary)** | Italian finance creators describe exactly this stack and this ritual (`IT-Y-02`, `IT-Y-03`; FACT low-medium); she is the user for whom cross-institution reconciliation is the daily problem, and she already pays for neobank tiers (`IT-` §6; FACT low-medium) |
| P2 | **Marco & Sara — the couple sharing expenses** | Personal accounts plus a joint account or a split app; want fairness without typing every receipt | **MVP as individuals; household layer Later (first expansion)** | The Italian couple norm is documented (`IT-Y-05`; FACT low-medium); household sharing is the most-loved US feature (Monarch) and its absence a documented complaint (Copilot "couples trap") (`US-S40/S65`); Splitwise's free-tier cap pushes users to look for alternatives (`IT-V-13…V-15`). **Why not household at MVP:** cross-consent pairing needs a household consent type, a household scope with its own keys and a joint-account dedupe rule that do not exist yet (`consent-model.md` §2; `privacy-model.md` §§2/4/5) — DECISION PD-5 |
| P3 | **Alessia — the young saver on Postepay/Hype** | Prepaid IBAN as primary account, cash top-ups, promo codes; wants a free, Italian-feeling app | **Secondary (MVP-compatible)** | >30M Postepay cards; Evolution used as a primary account (`IT-V-11`, `IT-Y-30`; FACT medium/low); Hype's cash top-up is "the big advantage" (`IT-Y-07`, `Y-20`); price-sensitive, referral-driven acquisition (`IT-Y-01/Y-06/Y-07`). Coverage quality of Poste and Satispay is UNKNOWN (`I-7`, `I-8`), which is why she is not primary |
| P4 | **Paola — the family budget manager** | Joint account, bimonthly bills, TARI, condominio, ISEE, top-ups to the children's cards; wants to see everything the household spends and never miss a bill | **MVP as an individual; household layer Later (first expansion)** | Italian family-budget content exists (`IT-Y-32`); Italian recurring periodicities beyond monthly are a documented categoriser gap (`IT-` §8.8; `EU-S-22`); subscription/contract ledgers are among the most-loved EU features (`EU-S-35`). **Scope limits:** her bills and the joint account are MVP; Roberto's own view and the shared household view are Later (PD-5); the children's accounts are out (18+ gate, privacy-model §4); long-period recurring detection grows with history or a CSV backfill (history requirement below) |
| P5 | **Luca — the freelance / partita IVA** | Mixes business and personal on the same accounts; parks tax money; needs an accountant export | **Later** | Behaviour is documented (`IT-Y-03`; FACT low) but needs business/personal tagging, F24 semantics and accountant exports that are out of MVP scope (`IT-` §8.5); regulatory and product scope differ (invoices, fattura elettronica). Kept here so the data model does not block him |

---

## 1. Shared Italian context (applies to every persona)

| Fact about the Italian user | Evidence | Status |
|---|---|---|
| Multi-account living is the norm among finance-aware users: 3–5 relationships (salary bank, investment bank, neobank for daily spend, Satispay for small payments, a broker for the emergency fund); "I have too many accounts" | `IT-Y-02`, `IT-Y-03` | FACT (low-medium) |
| Bank-native aggregation already exists: Intesa XME Banks (since Feb 2020, categorises other banks' movements), Hype Radar (paid plans), Revolut linked accounts (**launched Aug 2020 via TrueLayer; current Italian availability UNKNOWN — verify in-app**), Webank WeConnect; Italian-born Salt Edge-based apps (Plannix, Switcho, EasyPol, Fast Budget) also aggregate and categorise — so "see all accounts in one place" is familiar, and its failures ("qualcosa è andato storto", stale balances) are familiar too. Whether any of them pairs transfers or learns is UNKNOWN (absence from marketing copy is not evidence) | `WS-01`, `WS-04`, `WS-05`, `WS-06`, `WS-08`, `WS-11`, `WS-14`, `WS-15`, `WS-16` | FACT (medium) / UNKNOWN (depth, usage, Revolut status) |
| History at first link is ~90 days in practice for most banks (bank/provider behaviour; RTS 2018/389 art. 10 is an SCA *exemption* for balance + 90 days, not a cap); per-bank depth UNKNOWN; Intesa returns transactions in two-week windows with a 4/day unattended cap and HTTP 429 beyond it — a multi-window backfill may take hours or longer; bank/provider request budgets and endpoint accounting must be measured. Consequence for every persona: on day one Lilleri can detect **monthly** recurring candidates when sufficient occurrences are returned; bimonthly, quarterly and semiannual ones need ≥2–3 occurrences (121+ days for bimonthly), a CSV backfill, or the user's one-tap confirmation | `PP-D-OB-§1`, `PP-D-OBA-#195`, `PP-GC-01`; `#19`, `I-5` (revised) | FACT (law, caps) / ASSUMPTION (per-bank depth) |
| Italian credit cards settle as **one monthly debit** on the current account ("PAGAMENTO PER UTILIZZO CARTE DI CREDITO ESTRATTO mm/yyyy", "Utilizzo carta di credito"); UniCredit, Banca Mediolanum and Crédit Agricole card accounts were absent through Enable Banking in March2026 (other/current routes UNKNOWN), Nexi's AIS covers prepaid cards only, Amex Italia's AIS availability is UNKNOWN (`WS-17`), Fineco card accounts are documented by Enable Banking; current per-account success remains untested. Where that purchase-level feed is unavailable, it does **not** reach Lilleri; the US "card payment = transfer between two connected accounts" pattern does not apply | `PP-D-OB-#63`; `PP-D-OBA pass 2 #19`; `I-8`; `WS-17` | FACT (coverage) / UNKNOWN (Amex) |
| The hook is "dove sono finiti i soldi" at month-end; spreadsheets and "1000 apps" get abandoned; effort is priced in minutes per month (ChatGPT 2 min, Google Sheet 5 min, Wallet automation 15 min) | `IT-Y-02` | FACT (low-medium) |
| PSD2 read-only reassurance must be said out loud ("my bank confirmed it is read-only… nobody ever had problems") | `IT-Y-02` | FACT (low-medium) |
| Italian payment types that global categorisers treat as noise: F24, MAV/RAV, PagoPA/CBILL, bollettini, SDD, "ricarica Postepay", Satispay top-ups | `IT-Y-01`, `IT-W-01`; `IT-` §8.1 | FACT (Revolut cannot pay them) / HYPOTHESIS (categorisation gap) |
| Cash still matters and is typed by hand in every app; cards preferred "so nothing is missed" | `IT-Y-04`, `IT-Y-03`; ECB SPACE cash share ≈60 % of POS by number (ASSUMPTION) | FACT (low) / ASSUMPTION |
| Forced app migrations are recent memory: Postepay and BancoPosta apps retired into the Poste Italiane app (9 Oct 2025); Hype "being merged into Banca Sella (2026)" (GitHub dataset only — confirm on a Sella press release); Oval Money closed (2023) | `IT-Y-30`, `IT-V-12`, `IT-W-04` (low), `EU-S-50a` | FACT (low-medium; Hype merger low) |
| 2026 trust events as reported in GitHub-captured press digests: Revolut Italy data-disclosure incident (Sep 2026, "680 clienti" cited in Parliament); Garante €12.5M fine on Poste's BancoPosta/Postepay apps (Apr 2026). **Not to be used in product copy, trust page or pitch until re-sourced** to the Garante newsroom, ANSA or the parliamentary record | `IT-W-08` (low) | FACT (low) |
| Postepay scale: Poste's "oltre 30 milioni di carte Postepay" is cumulative issuance marketing, not cards in circulation or active users | `IT-V-11` (low) | FACT (low; scale signal only) |
| Acquisition is referral/promo driven; creators carry 5–10 bank codes; welcome bonuses €5–€50 | `IT-Y-01`, `Y-06`, `Y-07`, `Y-14` | FACT (low) |
| Price anchors Italians already pay: Hype Next €2.90 / Premium €9.90; Satispay Plus/Metal/Velvet €3.99/€9.99/€39.99; Plum IT Pro €3.99 / Premium €9.99; N26 €4.90/€9.90/€16.90 (FR/ES lists, IT to confirm); Revolut ≈€3.99/€9.99/€15.99/€45 (creator); Wallet IT IAP €5.99 (period unlabelled) | `IT-V-05`, `IT-W-01`, `IT-V-02`, `IT-W-02`, `EU-S-66`, `IT-V-23`, `IT-Y-01`, `EU-S-74` | FACT (low-medium) |

---

## 2. P1 — Giulia, the multi-account professional (MVP, primary)

**Snapshot (ASSUMPTION — composite):** Giulia, 34, product manager at a software company in Milan, salaried, lives alone, travels for work. Uses her phone for everything financial; opens her banking apps several times a week but hates the month-end spreadsheet. Follows two Italian finance YouTubers.

### Context

- Holds **five money relationships** (FACT that this pattern exists: `IT-Y-02`, `IT-Y-03`): the salary bank, an investment bank, a neobank for daily spend, a payments app, and a card.
- Does a **month-end ritual**: copies balances and totals from each app into a Google Sheet, checks subscription renewals by hand, reviews quarterly (`IT-Y-03`; FACT low-medium).
- Has tried **Wallet by BudgetBakers** on a creator's recommendation (`IT-Y-02/Y-03`) and a **ChatGPT-on-exported-statement** routine with a temporary chat as the privacy workaround (`IT-Y-02`; FACT low-medium). Knows her bank's app offers "XME Banks"-style aggregation and found it clunky (ASSUMPTION; linking failures documented in `WS-05`).

### Accounts and sources

| Source | Role | Connection route | Status of coverage |
|---|---|---|---|
| Intesa Sanpaolo (XME Conto) | Salary, rent by bonifico, utilities by SDD | PSD2 via a licensed AISP; **Intesa answers HTTP 429 beyond the consented daily multiplicity and limits retrieval to a two-week window per request** (`PP-D-OBA-#195`; FACT) | Reachable (Enable Banking IT page lists Intesa, `PP-D-OB-#63`); a GoCardless get-accounts error was reported Dec 2025 (`PP-G-81`) |
| Fineco | Investments, emergency fund, Fineco card | PSD2; Fineco card accounts via a dedicated Enable Banking integration since Mar 2026 (`PP-D-OB-#63`; FACT) | Reachable; "the only app that connected Fineco" was a creator's praise for Wallet (`IT-Y-03`) |
| Revolut (Italian IBAN) | Travel, daily card, FX | PSD2; Revolut via GoCardless adds a phantom pre-start transaction (`PP-G-66`); a booked Revolut transaction was silently skipped via Enable Banking (`PP-G-84`) | Reachable; known edge cases |
| Satispay | Coffee, lunch, P2P; weekly "Budget" of €50 that refills every Sunday night (`WS-07`; FACT) | Satispay is an EMI with its own PSD2 portal; **no aggregator integration evidenced** (`IT-` §2.4) | **UNKNOWN** — fallback: treat the weekly top-up from Intesa as a typed "top-up" and the Satispay wallet as a manual balance |
| American Express Italia | Big purchases, points | **UNKNOWN** coverage (`I-8`); Amex "disconnecting daily" is a PocketGuard complaint in the US (`US-S128/S130`) | **UNKNOWN** — fallback: statement import or manual card account |
| Broker (e.g. Trade Republic / Moneyfarm) | Emergency fund at 2.75 % (pattern from `IT-Y-03`) | Trade Republic via Enable Banking duplicated every transaction on first import (`PP-G-22`); Moneyfarm manual in Getquin (`IT-Y-03`) | Partial |

### Goals

1. "Dimmi dove sono finiti i soldi questo mese" without opening five apps (`IT-Y-02`; FACT low-medium).
2. Never double-count the €200 she moves from Intesa to Revolut before a trip, or the Amex statement debit when purchases are independently available; otherwise it remains an unitemised card debit (`#4`, `#15`; FACT that the failure mode is documented; prevalence UNKNOWN).
3. A list of what is recurring (Netflix, Spotify, palestra, assicurazione semestrale, canone RAI in the electricity bill) with the next debit date (`EU-S-35`, loved feature; `IT-` §8.8).
4. Spend under five minutes a month on review (`IT-Y-02` effort ladder).

### Frustrations (ranked by the synthesis)

- Connections that break and re-auth loops she cannot predict (`#1`, `#3`): she experienced Wallet's "sync broken since December 2024" (`EU-S-38`; FACT low-medium).
- Duplicates after re-linking and transfers that show up as income (`#2`, `#4`).
- Categorisation that "never learns" her local supermarket or the SumUp-prefixed bar (`#5`, `#18`; `IT-Y-02`).
- "Sync offline" with no reason (`PP-G-73`; FACT).
- Apps that disappear or re-price: she remembers Oval Money and the Postepay app migration (`#11`).

### Trust threshold (what she needs before connecting) — HYPOTHESIS, anchored

| Requirement | Anchor |
|---|---|
| The consent screen names the licensed AISP and says read-only, in Italian, before the bank redirect | `IT-Y-02` reassurance; `EU-S-05/S-15/S-18` (named licences reassure) |
| SCA happens in her bank's app, not by typing credentials into Lilleri | `PP-D-OB-§1`; contrast with Hype Radar's "credenziali di accesso all'home banking" wording (`WS-01`; flow ASSUMPTION) |
| She can see and revoke every connection, with its expiry date | `EU-S-21`, `EU-S-37a` (stated durations reassure); `D-3` |
| Implemented export formats and the deletion-request flow are free; retention/backup timelines are stated separately | `EU-S-08` (Moneyhub exit praised for CSV); `US-S7` |
| A plain "what we store, who we send it to, what happens if we shut down" page | `D-10`; shutdown history `#11` |
| No money movement, ever, without an explicit reversible action | `IT-Y-01` ("cursed" round-ups); `EU-S-45` (Cleo) |

### Willingness to pay — HYPOTHESIS

- She already pays for a Revolut or Satispay tier (ASSUMPTION; tiers exist at €3.99–€9.99, `IT-V-02`, `IT-Y-01`). A willingness-to-pay test range of **€3.99–€5.99/month or €29.99–€49.99/year** is an unvalidated research hypothesis against Wallet IT €5.99, Bankin' €4.99, Linxo €4.49, Plum IT €3.99 (`EU-` §8; `PP-` §F).
- She will pay for **depth** (full history, forecasts, insights, Amex/Satispay fallbacks done well) but will churn on a **renewal step-up** or a trial that converts silently (`#8`, `#16`; FACT).
- Triggers to pay: the first month in which the picture was right without her touching it (see WOW in `docs/product/jobs-to-be-done.md`).

### What "zero setup" means to Giulia — HYPOTHESIS

- No category setup, no budget method, no "assign money" step (YNAB's 2–4 weeks to be comfortable is the anti-pattern, `US-S13/S17`).
- Connect Intesa, Fineco and Revolut in one flow; Lilleri pre-detects transfers between them, her salary, her SDDs and her subscriptions from the available history; recurring detection depends on enough occurrences (`PP-GC-01` 90-day default; `US-S61` Copilot detects recurring at onboarding).
- Accounts it cannot connect (Amex, Satispay) are shown honestly with a fallback, not promised (`EU-` §12.8).

### A day in the life — sync scenario (HYPOTHESIS; design narrative with FACT anchors)

*Monday 07:40, tram.* Giulia opens Lilleri. Overnight, Lilleri refreshed Intesa, Fineco and Revolut within the actual bank/provider unattended access budget (default four accesses/day unless a higher frequency is agreed; paging/retries included, `PP-D-OBA`) and on app-open it may request an active-user refresh only when the provider classifies it accordingly, within its bank/provider limits. The home screen says: *"Tutto a posto. 2 movimenti da rivedere."*

What happened in the sync (shown in the sync report, `D-4`):
- Saturday's **€200 bonifico Intesa → Revolut** appeared on both sides; Lilleri paired the legs (same amount, opposite sign, 1-day gap, known own-IBAN) and hid both from spend and income (`D-2`; the mechanic with 382 up-votes, `PP-G-01`).
- The **Satispay weekly refill of €50** from Intesa (Sunday night, `WS-07`) was typed as a top-up to a wallet, not as a purchase.
- The **Amex statement debit of €612.30** on Intesa was matched to the Amex card account's statement (manual or imported) and typed as a card settlement, so the purchases count once, at purchase time (`US-S53` Copilot pattern).
- Two Intesa items are still **pending**; they are visible in a separate pending total; the displayed bank snapshot retains its supplied type/reference date (`D-5`; `US-S4` YNAB policy).
- The displayed booked balance reproduces the provider’s typed snapshot with its reference date. Independent transaction-derived reconciliation is assessed only with a comparable opening balance and complete interval; a diagnostic is not automatically a missing-transaction claim (`PP-G-84` is the anti-pattern).

The two Review Inbox items:
1. *"SUMUP *BAR CENTRALE MILANO — 3,20 €. Pensiamo sia Caffè e bar: l’esercente sembra un bar. Confermi?"* She taps yes; Lilleri proposes *"Applica a tutti i prossimi movimenti di questo esercente?"* — yes; the rule appears in Impostazioni › Regole (`D-6`; `EU-S-21` learn-after-3 as the slower benchmark).
2. *"Bonifico in entrata da Chiara R. — 45,00 €. È un rimborso di una spesa condivisa?"* She links it to Friday's dinner; Lilleri nets it against that expense instead of counting income (`PP-G-04`, `PP-G-61`; `D-7`).

A banner: *"Il collegamento con Intesa Sanpaolo scade tra 9 giorni — rinnova con la tua banca."* (expiry from actual provider metadata; renewal duration unmeasured) She snoozes it to the weekend (`D-3`). Total time: about 40 seconds.

### How to validate P1

- 6 interviews with Milan/Rome/Turin professionals holding ≥3 institutions; ask them to show their month-end ritual.
- Test-link Intesa, Fineco, Revolut, Trade Republic in the chosen AISP sandbox/limited production; measure transfer-pairing precision on real data with consent.
- Confirm Amex IT and Satispay coverage (`I-8`); decide the fallback UX before promising either.

---

## 3. P2 — Marco & Sara (MVP as individuals; household research Later)

**Snapshot (ASSUMPTION — composite):** Marco, 31, nurse; Sara, 29, secondary-school teacher; Bologna; living together for two years, not married; a joint account for rent, utilities and groceries funded in proportion to their salaries; everything else split "by feel" or in Splitwise and settled with Satispay.
**DECISION — MVP boundary:** this adult can view only their own authorised accounts (including a joint bank account they can lawfully access). Other adults’ accounts, invitations, cross-user pairing, shared tags and shared billing below are Later research narratives. No child account is connected or imported. Long-period predictions need adequate imported/retained history or explicit user confirmation; they are not first-session guarantees.


### Context

- The Italian couple norm has two accepted models: a free split app where every shared purchase is typed in, or a joint account funded equally or pro rata — and the advice is to always keep personal accounts (`IT-Y-05`; FACT low-medium).
- Splitwise's free tier is capped at about 4 expense adds per day with a 10-second ad between adds (`IT-V-13`, `V-14`; FACT medium-low); Tricount is free but CSV export left with the old Premium (`IT-W-12`). An "alternative-seeking" short reached 20k views (`IT-Y-23`).
- Monarch's unlimited household on one subscription is "best-in-class" in the US; Copilot's lack of it is the "$190 couples trap" (`US-S40/S42`, `US-S65`; FACT medium / low).

### Accounts and sources

| Who | Source | Role | Coverage note |
|---|---|---|---|
| Joint | BancoPosta or Intesa joint account ("conto cointestato") | Rent, utilities (SDD, bimonthly), groceries by card | Intesa reachable; **Poste reachable at provider level, UX quality UNKNOWN** (`I-7`) |
| Marco | Buddybank (UniCredit) + Hype | Salary; daily card; Hype Box for the holiday | UniCredit reachable; **UniCredit credit-card accounts not exposed over PSD2** (`PP-D-OB-#63`); Hype coverage UNKNOWN (`I-8`); Buddybank is a separately addressable ASPSP (`IT-V-08`) |
| Sara | Intesa + Postepay Evolution | Salary; online shopping | Intesa reachable; Postepay via Poste ASPSP, quality UNKNOWN |
| Both | Satispay | Settling small debts to each other ("scambia denaro"), bar, pizza | UNKNOWN coverage; P2P settlement shows up as bank-side top-ups and debits |
| Both | Splitwise (manual) | Trips with friends; shared items not on the joint account | No bank feed by design (`IT-D-01`) |

### Goals

1. "Sapere quanto ha speso *la casa* questo mese" from the joint account and from the shared items each paid personally, without typing receipts (`IT-Y-05`; `IT-D-01` shows what "good enough" sharing looks like: paid/owed shares, repayments, comments).
2. Fairness: each sees what they contributed and what is still owed, with a settle-up suggestion.
3. Privacy: each keeps personal spending private by default (ASSUMPTION; consistent with "keep personal accounts" advice).
4. Not pay twice for one household (`US-S65`).

### Frustrations

- Satispay P2P settlements and bonifici between the two are counted as income/expense by trackers (`#4`; `PP-G-04`).
- Splitwise's daily cap and ads; Tricount's lost export (`#14`, `#21`).
- Bank-native aggregation (XME Banks, Radar) is per-person; neither bank shows the other partner's account or the shared tags (`WS-04`, `WS-01`; FACT that they are single-user views — ASSUMPTION).
- Household plans that are a paywall rather than a feature (`EU-S-63` Emma extra members £5.99; `US-S65`).

### Trust threshold — HYPOTHESIS

- Granular sharing: each partner chooses which accounts or only which *tagged* transactions the other sees; nothing shared by default (anchor: Monarch household with individual/shared goals, `US-S40`; YNAB Together selective sharing, `US-S6`).
- Both authenticate at their own bank; one partner can never connect the other's bank (PSD2 consent is personal; `PP-D-OB-§1`).
- Leaving the household removes shared visibility immediately and exports each person's data separately (ASSUMPTION, GDPR-driven).

### Willingness to pay — HYPOTHESIS

- Later household willingness-to-pay hypothesis: one subscription with separately authenticated members; price and seat economics follow `business-model.md`, not this persona; anchor: Monarch's unlimited household on one subscription (`US-S40`), YNAB Together up to six (`US-S6`).
- ASSUMPTION: they use free split tracking today; whether that implies a free household tier is UNKNOWN and is not a commercial decision; they would pay for history, forecasts and joint-account insights (`D-9`, `D-11`).

### Later household hypothesis: what "zero setup" would mean to Marco & Sara — HYPOTHESIS

- Sara invites Marco; each connects their own banks; Lilleri recognises the joint account as shared because both consented to it, and recognises transfers between their personal accounts and the joint account as contributions, not spend.
- Shared tagging is proposed, not configured: *"Questa spesa Esselunga da 86 € è della casa? Da ora in poi Esselunga = casa?"*
- No split rules to set up front; the default is the joint-account model, with a split tag for the rest (`IT-Y-05` both patterns supported, `IT-` §4.5 HYPOTHESIS).

### Later household sync scenario (HYPOTHESIS; not MVP acceptance)

*Sunday 18:30, kitchen.* Sara opens Lilleri's "Casa" view. This week's sync:
- Marco's **€900 bonifico to the joint account** and Sara's **€700** are typed as contributions (both legs paired across two people's consents; hidden from each person's spend; shown as "contributi del mese" in Casa).
- The joint account's **SDD Hera €143 (bimonthly)** was recognised as a bill with a two-month period (`#20`; `IT-` §8.8) and the next expected date is shown.
- Marco paid **€52 at the pizzeria with Hype** and tagged it "casa" from the push notification; Lilleri computes that Sara owes €26 and suggests settling via their usual Satispay transfer; when the **Satispay €26** lands on Marco's side it is matched to that debt, not counted as income (`PP-G-04`).
- The Review Inbox for Casa has one item: *"Amazon 34,90 € dal conto cointestato — casa o personale?"* Sara taps "casa › bambini"; no rule is created because Amazon is ambiguous (`EU-S-22` Amazon complaint; `D-6`).

Marco's personal view never shows Sara's personal Intesa transactions; Sara's never shows Marco's Hype beyond the items he tagged.

### How to validate P2

- 5 couple interviews (both partners present) in Bologna/Rome; map the joint-vs-split pattern and settlement channel (Satispay, bonifico, cash).
- Prototype test of "contribution pairing across two consents" and of the default-private sharing model.
- Verify Poste and Hype coverage before promising joint-account support for BancoPosta/Hype households.

---

## 4. P3 — Alessia, the young saver on Postepay/Hype (Secondary, MVP-compatible)

**Snapshot (ASSUMPTION — composite):** Alessia, 23, Naples, final-year university student with a part-time job in a bar (paid partly in cash tips); Postepay Evolution as her main account (her parents top it up; her employer pays by bonifico to its IBAN), Hype opened for a €25 welcome bonus and used for the "Box" savings goal, Satispay for everything under €10.

### Context

- Postepay Evolution has an IBAN and is used as a primary account by many; Poste's own copy says "oltre 30 milioni di carte Postepay" (`IT-V-11`, `IT-Y-30`; FACT medium / low).
- The standalone Postepay app was retired on 9 Oct 2025 into the Poste Italiane app with PosteID credentials (`IT-Y-30`, `IT-V-12`; FACT low-medium); the Garante fined Poste €12.5M over those apps in Apr 2026 (`IT-W-08`; FACT medium).
- Hype: free plan with Box goals and cashback; cash top-up at tobacconists is "the big advantage"; accounts for minors from 12 (`IT-Y-06`, `Y-07`, `Y-20`; FACT low). Hype is "being merged into Banca Sella (2026)" (`IT-W-04`; low-medium).
- She learned about every account from a YouTube referral code (`IT-Y-06`, `Y-07`, `Y-13`); she has tried a manual tracker ("everything must be entered by hand", `IT-Y-04`) and a ChatGPT budget on an exported statement (`IT-Y-02`).
- Demand for *free* trackers is explicit in Italian creator content ("2 app gratis per gestire le tue spese", `IT-Y-33`; FACT low).

### Accounts and sources

| Source | Role | Coverage note |
|---|---|---|
| Postepay Evolution (Poste Italiane ASPSP) | Primary: salary bonifico, parents' top-ups, online shopping, ATM | Reachable at provider level via CBI Globe-connected AISPs and Enable Banking's IT page (`I-7`); **UX quality UNKNOWN**; SCA now happens in the Poste Italiane app |
| Hype (free plan) | Box goal "Erasmus", cashback, cash top-ups at the tabaccheria | **UNKNOWN** coverage (`I-8`) — fallback: manual account or statement import |
| Satispay | Daily payments under €10; weekly Budget €30 (`WS-07`) | UNKNOWN (`IT-` §2.4) — model the top-ups from Postepay as typed top-ups |
| Cash | Tips; small spend | Manual; pair ATM withdrawals to a cash wallet (`D-8`) |

### Goals

1. "Capire se arrivo a fine mese" — one safe-to-spend number she already understands from Satispay's weekly Budget (`WS-07`; `US-S131` PocketGuard "In My Pocket" pattern).
2. Save for a goal without thinking (Hype Box / Plum autosave patterns, `IT-Y-06`, `EU-S-27`) — but never have the app move money on its own (`IT-Y-01`).
3. See that the parents' €150 top-up is income-like and the Satispay refill is not spend.
4. Zero cost.

### Frustrations

- "Ricarica Postepay" and Satispay top-ups counted as expenses; ATM cash counted as spend and then forgotten (`I-14`, `I-15`; HYPOTHESIS on frequency).
- Apps that need a credit card for a trial or charge after a trial (`#8`); Splitwise-style daily caps (`#14`).
- The Postepay app vanished into another app; she distrusts "yet another app" (`#11`).
- Categorisers that do not know Neapolitan merchants (`#18`).

### Trust threshold — HYPOTHESIS

- An Italian-language, Italian-feeling product (anchor: Italians favour Italian brands with cash top-up, `IT-Y-20`; HYPOTHESIS).
- No card required, no trial auto-conversion, free core that stays free (`#8`; `US-W27` PocketGuard's free-plan removal as the anti-pattern).
- A one-screen explanation of what Lilleri sees ("solo i movimenti, mai le credenziali, mai i soldi") and the ability to delete everything in one tap.
- Social proof from a creator she follows (referral-driven acquisition, `IT-Y-06/Y-07`).

### Willingness to pay — HYPOTHESIS

- Lowest of the five: €0 today; the Hype Next anchor (€2.90/month, `IT-V-05`) is the ceiling of what she has considered; she is a free-core user whose value to Lilleri is referral and future conversion.
- She will not pay for correctness; she might pay for a goal/insights layer later or convert when she becomes a P1.

### What "zero setup" means to Alessia — HYPOTHESIS

- Connect Postepay in the Poste Italiane app flow and see, within a minute, income (salary, parents), top-ups to Satispay/Hype typed correctly, cash withdrawals paired to a cash wallet, and one number: *"Puoi spendere ancora 112 € fino al 28"*.
- If Hype or Satispay cannot be connected, Lilleri says so on the connect screen and offers a 10-second manual balance, not a broken promise (`EU-` §12.8).

### A day in the life — sync scenario (HYPOTHESIS)

*Friday 23:10, after a shift.* Alessia gets a push: *"Stipendio ricevuto: 640 €. Fino al 31 puoi spendere 318 € dopo bollette e abbonamenti."* In the sync:
- The **bonifico from the bar** is typed as income (recurring, monthly, learned from two prior occurrences; `US-S61` recurring detection at onboarding).
- The **€30 Satispay refill** and the **€50 Hype top-up** (ricarica) are typed as top-ups, excluded from spend; the Hype balance is a manual account because Hype could not be connected (UNKNOWN coverage).
- The **€40 ATM withdrawal** created a cash-wallet balance; she taps "+ 12 € pizza" from the notification (`D-8`; `EU-S-43` Monefy-speed entry as the benchmark).
- The Review Inbox has one item: *"PAGOPA – UNIVERSITÀ FEDERICO II 156 € — tasse universitarie?"* (Italian payment-type dictionary, `I-14`). She confirms.
- Nothing moved money; the Box suggestion is a nudge she can ignore (`IT-Y-01`).

### How to validate P3

- 5 interviews with 20–26-year-olds whose primary account is Postepay Evolution or Hype; test the "safe to spend" copy.
- Sandbox test of the Poste Italiane ASPSP flow end to end (SCA in the Poste app) and of Satispay/Hype reachability (`I-7`, `I-8`).
- Measure how many connect only one institution — if most do, test clear spending/categories and evidenced recurring candidates as the WOW; any safe-to-spend value needs explicit coverage assumptions.

---

## 5. P4 — Paola (MVP as an individual; household research Later)

**Snapshot (ASSUMPTION — composite):** Paola, 45, Verona, part-time administrative employee, married to Roberto (sales agent, variable income), two children (14 and 9). She is the one who knows when the TARI is due, which bimonthly bills are coming, and whether the ISEE needs updating. She uses a paper notebook plus a spreadsheet, and the bank app's "Gestione Spese" for the joint account.
**DECISION — MVP boundary:** this adult can view only their own authorised accounts (including a joint bank account they can lawfully access). Other adults’ accounts, invitations, cross-user pairing, shared tags and shared billing below are Later research narratives. No child account is connected or imported. Long-period predictions need adequate imported/retained history or explicit user confirmation; they are not first-session guarantees.


### Context

- Italian family-budget content exists and recommends a basket of apps (Getquin, EasySpesa, FamilyWall, Keepa, "Personal Fisco") rather than one product (`IT-Y-32`; FACT low).
- Italian recurring costs with periodicities beyond monthly — bimonthly utilities, TARI instalments, condominium fees, semiannual car insurance, school fees — are exactly what recurring detectors get wrong ("one-off counted as regular", `EU-S-22`; `IT-` §8.8; FACT / ASSUMPTION).
- The contract/subscription ledger with next debit date and notice period is among the most-loved European features (Finanzguru, Dyme; `EU-S-35`, `S-49`; FACT).
- As an Intesa customer she may already use XME Banks' "Gestione Spese", which categorises movements of all linked accounts with editable categories, labels and splits (`WS-04`; FACT medium) — Lilleri must be visibly better at correctness, not merely "all in one place".
- Hype accounts exist for minors from 12 (`IT-Y-07`; FACT low); children's pocket money and school payments flow through PagoPA and prepaid cards (ASSUMPTION).

### Accounts and sources

| Source | Role | Coverage note |
|---|---|---|
| Intesa Sanpaolo joint account (Paola + Roberto) | Household bills (SDD), mortgage, groceries | Reachable; two-week retrieval window and daily cap (`PP-D-OBA-#195`) — catch-up syncs must be chunked |
| Roberto's UniCredit account | His variable income; commissions | Reachable for accounts; **UniCredit credit cards not exposed over PSD2** (`PP-D-OB-#63`); requires Roberto's own consent |
| Paola’s own BancoPosta/Postepay, if held | Her payments and outgoing top-ups to children | Listing evidence only; actual account variant/quality UNKNOWN (`I-7`). Children’s balances are outside coverage. |
| Nexi credit card (via Intesa) | Big purchases, holidays | Nexi AIS only for prepaid cards via CBI Globe; credit cards not stated (`PP-D-OBA pass 2 #19`) — **likely a statement-import or manual fallback** |
| Parent-side top-ups to a child’s card | Outgoing bank movement only | No child-account connection, imported child statement or computed child balance in the 18+ MVP. |
| Satispay (household) | Small payments; school-fee collections | UNKNOWN |

### Goals

1. "Non farmi dimenticare una scadenza": every recurring cost with its true periodicity and the next date — Hera bimonthly, TARI three instalments, condominio quarterly, RC auto semiannual, mensa scolastica, Netflix, canone in bolletta (`EU-S-35` loved feature; `IT-` §8.8).
2. "Quanto spende la famiglia davvero" across the joint account, Roberto's account and the cards, with transfers between them not counted (`#4`).
3. An end-of-year picture (giacenza media, balances at 31 December) for the ISEE (`IT-Y-03`, `IT-` §8.5; FACT low that users care; feature HYPOTHESIS).
4. Something Roberto will accept: he connects his own bank, sees the household view, and is nudged only for his items.

### Frustrations

- A one-off large bill treated as "regular" and a bimonthly bill treated as monthly (`#20`; `EU-S-22`).
- Credit-card statements counted twice: the Nexi debit on Intesa plus the card purchases (`#15`).
- Bank-app aggregators that fail to link ("qualcosa è andato storto", `WS-05`) and support that does not answer (`#13`).
- Apps that require her to set up categories and budgets before showing anything (`#23`; YNAB 2–4 weeks, `US-S13`).
- Data about her children in a foreign app with unclear retention (`IT-W-08` Garante fine makes this salient; HYPOTHESIS).

### Trust threshold — HYPOTHESIS

- EU data residency and a plain retention/deletion policy, in Italian, including minimisation of counterparty/child information present in her own transactions (`IT-` §8.6; GDPR).
- Named AISP, read-only, SCA at the bank for each adult; children’s account connection excluded from the 18+ MVP; future parental authority and platform rules require counsel review.
- "What happens if Lilleri closes" answered on the trust page with an export she has tested once (`EU-S-08`).
- A human to call when Intesa stops syncing (`D-12`; `EU-` §12.9).

### Willingness to pay — HYPOTHESIS

- Annual plan buyer: a **€29.99–€49.99/year test range**, not a chosen plan, if it replaces the notebook and catches one missed bill; anchor: EU annual equivalents €30–€48 (`EU-` §1.4) and the Italian habit of paying for insurance-style peace of mind (ASSUMPTION).
- Will not accept per-member pricing for the household (`EU-S-63` Emma extra-member fee as the anti-pattern).

### Later household hypothesis: what "zero setup" would mean to Paola — HYPOTHESIS

- Connect the joint account; see a partial bill list for the available interval; show expected dates only when adequate history or user confirmation exists with amounts and periodicities inferred from history (two or more occurrences with consistent spacing; `D-6` periodicity evidence), and the evidenced subscriptions list (incomplete until enough history exists).
- Roberto receives an invite link, connects UniCredit in his own app, and the household view fills without either configuring anything.
- No budget to build; a "spesa prevista vs spesa reale" view appears by itself at month end (the ChatGPT-DIY output users want, `IT-Y-02`; `IT-` §9.1.5).

### Later household sync scenario (HYPOTHESIS; not MVP acceptance)

*Wednesday 13:15, lunch break.* Lilleri's push: *"Settimana prossima: TARI 2ª rata 187 € (14 ott), Hera bimestrale ≈ 140 €, Netflix 12,99 €. Sul conto cointestato ci sono 1.240 € disponibili dopo queste uscite."* In the sync:
- The **SDD Hera** last came 61 days ago and 60 days before that → bimonthly, next date predicted; the **TARI** came in three instalments last year → three-instalment schedule with amounts from the municipality's pattern (`#20`).
- **Roberto's €1,500 bonifico** to the joint account is paired with the outflow on his UniCredit (both consents present) and typed as a contribution, not income.
- The **Nexi statement debit €843** on Intesa is matched to the Nexi card account (statement imported or manual) and typed as a card settlement (`#15`; `US-S53`).
- The Review Inbox has two items: *"Bonifico 320 € — pagamento una tantum?"* (she confirms; `EU-S-22` anti-pattern avoided) and *"PagoPA ISTITUTO COMPRENSIVO 95 € — mensa scolastica?"* (`I-14`).
- A balance report distinguishes bank snapshot from a transaction-derived check and labels incomplete intervals. Intesa’s documented two-week query window (`PP-D-OBA-#195`) is not assumed for UniCredit. Roberto’s own account remains private until a Later household sharing model is approved.

### How to validate P4

- 6 interviews with the household "money manager" in families with two incomes and children; collect their bill calendars.
- Test recurring detection on real Italian SDD/PagoPA histories: precision on periodicity (monthly vs bimonthly vs quarterly vs semiannual) is the metric.
- Verify whether XME Banks' "Gestione Spese" already satisfies her (depth check, `OPEN QUESTION` 3 in the synthesis).

---

## 6. P5 — Luca, the freelance / partita IVA (Later)

**Snapshot (ASSUMPTION — composite):** Luca, 38, Turin, freelance UX designer under the regime forfettario; invoices through the SDI; uses the same Fineco account for business and personal, an N26 for personal spend, and parks money for taxes in a remunerated broker account; a commercialista does his tax return and asks for a yearly export.

### Context

- An Italian creator describes exactly this: separating business vs personal in Wallet and parking taxes in an interest-bearing account; "too many accounts complicate ISEE and tax returns" (`IT-Y-03`; FACT low).
- Global apps have none of the Italian bureaucracy semantics (F24, INPS, fattura elettronica, ISEE) (`IT-` §8.5; ASSUMPTION).
- Outbank sells a "Business" plan at €9.99/€99.99 for private + business accounts; Bankin' Pro from €8.33/month; Emma Ultimate gates business accounts (`EU-S-77`, `EU-S-33`, `EU-S-02`; FACT) — a market signal that business/personal mixing commands a higher tier.

### Accounts and sources

| Source | Role | Coverage note |
|---|---|---|
| Fineco (one account for everything) | Client payments, personal spend, F24 debits | Reachable; card accounts via Enable Banking (`PP-D-OB-#63`) |
| N26 | Personal daily spend | Reachable (EU bank); Italian IBAN |
| Broker (tax set-aside at ~2.75 %) | Money "that is not mine" until F24 day (`IT-Y-03`) | Partial |
| PayPal | Some client payments, SaaS subscriptions | PayPal via GoCardless caused duplicates and wrong balances (`PP-G-21`, `G-42`); coverage via the chosen AISP UNKNOWN |

### Goals (Later)

1. Tag every transaction as business or personal with rules ("client X → business", "Adobe → business"), and see personal spend net of business.
2. Know how much is set aside for taxes versus what the next F24 will require (`IT-Y-03`).
3. One export per year that the commercialista accepts (CSV/PDF, by tag and period).
4. Reimbursable client expenses tracked as "spent, not yet repaid" (`PP-G-61`).

### Frustrations

- Every PFM counts his client payments as "income" and his F24 as "other"; business SaaS pollutes personal categories (`I-14`; ASSUMPTION on frequency).
- Business features are a top-tier paywall elsewhere (`EU-S-77`, `S-02`).

### Trust threshold / willingness to pay — HYPOTHESIS

- Same consent and export requirements as P1, plus a guarantee that business tags survive export.
- Would pay **€9.99/month** for a business/personal tier (anchor: Outbank Business €9.99; Bankin' Pro €8.33), i.e. 2× Plus — consistent with the US 2–3× premium-tier multiple (`US-` §4.4).

### What "zero setup" means to Luca — HYPOTHESIS

- Lilleri proposes the business/personal split from evidence (SDI-numbered bonifici in, F24 debits, SaaS subscriptions) and asks once per counterparty; nothing to configure.

### Why Later (DECISION proposed)

- Requires business/personal tagging, F24/INPS semantics, accountant exports and possibly invoice matching — none needed for P1–P4; the data model must only reserve a "scope" (personal/business) attribute on transactions and rules so the feature can be added without migration.

### How to validate P5

- 5 interviews with forfettari; collect what their commercialista actually asks for; test whether a tag + export is enough.

---

## 7. Cross-persona implications for the product (HYPOTHESIS unless marked)

| Capability | P1 Giulia | P2 Marco & Sara | P3 Alessia | P4 Paola | P5 Luca (Later) |
|---|---|---|---|---|---|
| Cross-institution transfer pairing (`D-2`) | Core | Core within one user; cross-user pairing Later | Low (one institution) | Core | Core |
| Card-settlement handling (`D-2`) | Unitemised debit; pair only with independently available card ledger | Medium, same coverage limit | — | Unitemised debit; pairing conditional | Medium |
| Consent countdown and renewal (`D-3`) | Core | Core | Core | Core | Core |
| Honest sync report, no silent failure (`D-4`) | Core | Core | Core | Core | Core |
| Pending/booked/future state machine (`D-5`) | Core | Medium | Medium | Core (bills) | Medium |
| Learning categorisation with visible rules (`D-6`) | Core | Medium | Medium | Core | Core |
| Italian payment-type dictionary (`D-6`, `I-14`) | Medium | Medium | Core (ricarica, PagoPA) | Core (PagoPA, SDD, TARI) | Core (F24) |
| Review Inbox under 5 min/month (`D-7`) | Core | Core | Medium | Core | Core |
| Recurring detection with Italian periodicities (`#20`) | Medium | Core | Medium | Core | Medium |
| Safe-to-spend number (`I-16` pattern) | Low | Medium | Core | Medium | Low |
| Cash wallet paired to ATM (`D-8`) | Low | Low | Core | Medium | Low |
| Shared tags + cross-user household ledger (`D-11`) | — | Later | — | Later | — |
| Adult prepaid / dated manual wallet snapshots (`D-8`) | Satispay incomplete | Own Satispay/Hype only | Core if verified | Own adult accounts; child top-ups only | PayPal incomplete |
| Manual/statement fallback for unreachable sources | Amex, Satispay | Hype, Satispay | Hype, Satispay | Nexi, Hype | PayPal |
| Export and deletion, free (`D-10`) | Core | Core | Core | Core | Core (accountant) |
| Household subscription (`D-11`) | — | Later; seats/price unvalidated | — | Later; seats/price unvalidated | — |
| Business/personal scope | — | — | — | — | Core |

**Coverage risk by persona (FACT/UNKNOWN):** P1 depends on Intesa, Fineco, Revolut (reachable, with documented edge cases) plus Amex and Satispay (UNKNOWN); P2 and P4 depend on Poste (reachable at provider level, quality UNKNOWN) and Hype/Satispay/Nexi (UNKNOWN); P3 depends almost entirely on Poste and Satispay/Hype. **This is why P1 is primary and P3 is secondary** until `I-7`/`I-8` are resolved.

---

## 8. Decisions / Recommendations (proposed; DECISION labels)

| ID | Decision | Rationale |
|---|---|---|
| PD-1 | **Build the MVP for P1 (Giulia) first**, verify it serves P4 and P2 as individual adult users, with household sharing strictly Later, and keep P3 (Alessia) in scope for the free core without promising Poste/Satispay/Hype quality until tested | P1's stack is the best-documented Italian behaviour and is reachable over PSD2; P3's sources are UNKNOWN in quality (`I-7`, `I-8`) |
| PD-2 | **Reserve data-model room for P5 (Luca)** — a personal/business scope on transactions and rules — without building the feature | Avoids a migration later; the behaviour is documented (`IT-Y-03`) and commands a premium tier elsewhere (`EU-S-77`) |
| PD-3 | **Every persona's consent screen names the AISP, says read-only in Italian, and redirects to the bank for SCA** | Universal trust threshold (`IT-Y-02`; `EU-` §12; `D-10`) |
| PD-4 | **Unreachable sources are shown as such on the connect screen with a 10-second manual fallback**, never as a broken promise | `EU-` §12.8; Amex/Satispay/Hype/Nexi UNKNOWN |
| PD-5 | **Household is Later**, after separate adult authorisations, sharing boundaries, revocation, isolation and joint-account deduplication are designed and tested. A single-person joint bank account view is not a shared household product; seats/price follow the business model and remain hypotheses | `US-S40/S65`; `EU-S-63`; `IT-V-13`; `IT-Y-05` |
| PD-6 | **Commercial policy follows `business-model.md` / `pricing-analysis.md`.** Lilleri Gratis / Lilleri Plus; proposed €4.99/month or €39.99/year is an unvalidated hypothesis, with low/high test ranges. Proposed 30-day preview does not renew or charge; free beta has no subscription or conversion | `PP-` §F; `EU-` §1.4; `#8` |
| PD-7 | **Recruit and interview 5–8 people per MVP persona before the first design review**; run a 2-week diary study of the month-end ritual (P1) and the bill calendar (P4) | All trust thresholds and WTP figures here are HYPOTHESES |
| PD-8 | **Acquisition through Italian finance creators with a referral mechanic**, accepting that bank bonuses cannot be matched; consider a bank/broker partner that funds the bonus later | `IT-Y-01/Y-06/Y-07/Y-14`; `IT-` §9.1.6 HYPOTHESIS |

---

## 9. Open questions

| # | Question | Persona(s) | How to verify |
|---|---|---|---|
| 1 | Does the multi-account professional exist at scale outside the finance-creator audience? (average banking relationships per adult in Italy UNKNOWN) | P1 | Banca d'Italia / ABI surveys; CRIF; interviews |
| 2 | Amex Italia, Satispay, Hype, Nexi credit-card reachability and quality through the shortlisted AISPs | P1, P2, P3, P4 | Provider catalogues; sandbox/limited-production tests |
| 3 | Poste Italiane ASPSP user experience (SCA in the Poste app, consent length, transaction completeness) | P2, P3, P4 | End-to-end test with a Postepay Evolution and a BancoPosta account |
| 4 | Do Italian couples want shared *tags on personal accounts*, a *joint-account ledger*, or both? What do they consider private? | P2 | Couple interviews; prototype test |
| 5 | Later only: what parental authority, minor-data basis and platform/bank permissions would be needed? The 18+ MVP excludes child accounts. | P4 | Bank T&Cs; AISP guidance |
| 6 | Does XME Banks' "Gestione Spese" or Hype Radar already satisfy P4/P1 on categorisation, and do they pair transfers? | P1, P4 | Hands-on checks (synthesis OPEN QUESTION 3) |
| 7 | What precision does recurring detection reach on Italian SDD/PagoPA histories with bimonthly, quarterly and semiannual periods? | P4 | Offline evaluation on consented data |
| 8 | Is a safe-to-spend number the right first screen for P3, and does it conflict with Satispay's own Budget mental model? | P3 | Interviews; copy tests |
| 9 | Willingness to pay by persona: do the low/base/high Plus prices in `pricing-analysis.md` work for P1/P4? | P1, P4 | Van Westendorp survey after the first WOW moment; pricing tests |
| 10 | What does a commercialista actually need from a forfettario's export? | P5 | 5 interviews with accountants |
| 11 | Italian-language sentiment on Reddit/FinanzaOnline (still unreachable) | all | Survey with moderator consent; unblocked-network search |

---

## Sources

All verified on 2026-10-02. IDs resolve in the Sources section of `docs/research/user-pain-points.md` (synthesis), which carries the URLs over from the raw documents; the entries most load-bearing for the personas are repeated here.

| ID | Source | URL | Pub. date | Reliability | Used for |
|---|---|---|---|---|---|
| IT-Y-02 | Giuseppe Castagna — "Il metodo con cui traccio i miei soldi (in 5 minuti al mese)" (transcript) | https://www.youtube.com/watch?v=kJNxDIcJOac | 2025-12-26 | low-medium | Effort ladder; ChatGPT-DIY; read-only reassurance; Wallet 15 min/month; local-merchant rules |
| IT-Y-03 | Karim Mejri — "Come gestisco i soldi nel 2026" (transcript) | https://www.youtube.com/watch?v=J4bio_hsN08 | 2025-03-16 | low-medium | Multi-account stack; month-end ritual; business/personal split; tax set-aside; "too many accounts" |
| IT-Y-04 | Bussola Finanziaria — "10 app di finanza personale" (transcript) | https://www.youtube.com/watch?v=SRVVdLcDARc | 2025-04-22 | low | Cash typed by hand; manual trackers |
| IT-Y-05 | Bank Station — "Come gestire le spese di coppia" (transcript) | https://www.youtube.com/watch?v=gLz7l24O0PA | 2025-07-16 | low-medium | Couple norms: split app vs joint account; keep personal accounts |
| IT-Y-01 | Tony Pezzella — "Revolut 2026" (transcript) | https://www.youtube.com/watch?v=zwCFwhEIV3I | 2025-11-01 | low-medium | Revolut IT plans; no F24/MAV/RAV; "cursed" round-ups; chat-only support |
| IT-Y-06 / Y-07 / Y-20 | Hype reviews and comparisons | https://www.youtube.com/watch?v=-44HBq9pTZA ; https://www.youtube.com/watch?v=0GRi3fG7GTI ; https://www.youtube.com/watch?v=GL17li6mCII | 2025 | low | Hype plans, Box, minors 12+, cash top-up, referral codes |
| IT-Y-30 / IT-V-12 | Postepay app retirement into the Poste Italiane app (9 Oct 2025) | https://www.youtube.com/watch?v=kldxiEqg3Ng ; https://www.youtube.com/watch?v=uQcLdILDCS4 ; https://github.com/gdellapenna/AssistiveGenerativeAI | 2025 | low-medium / low | Forced migration; Postepay Evolution as primary |
| IT-Y-32 | Alessio Serio — "5 app per gestire il budget familiare" | https://www.youtube.com/watch?v=5NunQ58KlQ8 | 2026-02-26 | low | Family-budget app basket |
| IT-Y-33 | Ubaldo Schiavone — "2 app gratis per gestire le tue spese" | https://www.youtube.com/watch?v=TCHVyJsCd0E | 2025-10-26 | low | Demand for free trackers |
| IT-V-11 | poste.it "oltre 30 milioni di carte Postepay" | https://github.com/rootameli/endpoint | n/d | medium | Postepay scale |
| IT-V-05 / IT-W-01 | Hype plans €0/€2.90/€9.90; Radar aggregation on Next/Premium | https://github.com/iSte94/EffettoComposto | promo to 2026-03-18 | low-medium | Price anchor; aggregation |
| IT-V-02 / IT-W-02 | Satispay plans €3.99/€9.99/€39.99; 6.5M users | https://github.com/vibewatch/startup | 2026-07-21 | low-medium / medium | Price anchor |
| IT-V-08 | Buddybank PSD2 sandbox (separately addressable ASPSP) | https://github.com/bank-io/aspsp-data | n/d | medium | P2 coverage |
| IT-V-13 / V-14 / V-15 / W-12 | Splitwise free cap and ads; Tricount export | https://github.com/peanutprotocol/peanutsplit ; https://github.com/SM1LE21/bill-splitting-Website ; https://github.com/Splitoio/website ; https://github.com/canivibecodeit/canivibecodeit | 2026 | medium-low / low | P2 frustrations |
| IT-V-23 | N26 FR/ES price tables | https://github.com/huguesforselectum/selectum | n/d | low-medium | Price anchor |
| IT-W-04 | Neobank dataset: Hype "being merged into Banca Sella (2026)" | https://github.com/andreolf/neobankbeat | 2026-09-11 | low-medium | Migration risk |
| IT-W-08 | Italian press digests: Garante fine on Poste apps; Revolut incident | https://github.com/p1va/news-in-brief | 2026 | medium (headlines) | Trust events |
| IT-D-01 | Splitwise API reference | https://dev.splitwise.com/ | n/d | high | Shared-expense data model |
| IT-Y-23 | "Splitwise Alternative" short (20k views) | https://www.youtube.com/watch?v=legbEsCW1H4 | 2025-04-06 | low | Alternative-seeking signal |
| WS-01 / WS-02 / WS-03 | Hype support and product pages on Radar | https://support.hype.it/privati/articles/radar-come-monitorare-entrate-uscite-e-piani-risparmio-dei-tuoi-conti ; https://support.hype.it/hc/it/articles/4403885339412-Come-consultare-la-sezione-Radar ; https://www.hype.it/gestisci-soldi | n/d | high (snippet) | Bank-native aggregation that categorises external accounts |
| WS-04 | Intesa Sanpaolo newsroom: XME Banks (2020) | https://group.intesasanpaolo.com/it/newsroom/tutte-le-news/news/2020/open-banking--attivo-l-aggregatore-finanziario-xme-banks ; https://group.intesasanpaolo.com/it/newsroom/comunicati-stampa/2020/02/intesa-sanpaolo-presenta-xme-banks-per-la-gestione-di-conti-corr | 2020-02 | high (snippet) | "Gestione Spese" on linked accounts |
| WS-05 | ING community: XME Banks linking failure | https://community.ing.it/t5/Risparmi-e-investimenti/Problema-associazione-conto-arancio-a-XME-BANKS/td-p/152837 | n/d | low-medium | Bank-native aggregation failures |
| WS-06 | Revolut Italy open banking (Aug 2020) | https://www.lamiafinanza.it/2020/08/revolut-lancia-lopen-banking-per-i-suoi-oltre-400-000-clienti-retail-e-business-italiani/ ; https://thepaypers.com/fintech/news/revolut-launches-open-banking-for-its-italian-retail-and-business-customers | 2020-08 | medium | Linked accounts via TrueLayer |
| WS-07 | Satispay blog: "Come impostare il tuo Budget su Satispay" | https://www.satispay.com/it-it/blog/guide-satispay/come-impostare-budget-satispay/ | n/d | high (snippet) | Weekly Budget mechanics |
| WS-08 | Apple App Store IT: Webank (WeConnect) | https://apps.apple.com/it/app/webank/id306283651 | live | medium | Bank-native aggregation |
| WS-11 | Hype review themes (SosTariffe; Trustpilot; Bancaforte) | https://www.sostariffe.it/banche-finanziarie/hype/opinioni/ ; https://it.trustpilot.com/review/hype.it?page=7 ; https://bancaforte.it/notizie/hype-lancia-nuovi-servizi-e-supera-il-traguardo-di-1-5-milioni-di-clienti-RB100296r | n/d | low / medium | Stale balances; support |
| PP-G-01 / G-04 / G-61 / G-66 / G-81 / G-84 / G-22 / G-21 / G-42 / G-73 | GitHub issue reports (transfer pairing 382 up-votes; reimbursements; Revolut phantom; Intesa error; Revolut skipped; Trade Republic duplicates; PayPal) | https://github.com/actualbudget/actual/issues/1628 ; https://github.com/actualbudget/actual/issues/2289 ; https://github.com/actualbudget/actual/issues/7158 ; https://github.com/actualbudget/actual/issues/5502 ; https://github.com/actualbudget/actual/issues/6510 ; https://github.com/actualbudget/actual/issues/9063 ; https://github.com/actualbudget/actual/issues/8846 ; https://github.com/actualbudget/actual/issues/8879 ; https://github.com/actualbudget/actual/issues/5665 ; https://github.com/actualbudget/actual/issues/7717 | 2023–26 | high (first-hand, dated) | Failure modes per source |
| PP-D-OB-#63 / PP-D-OBA-#195 / PP-GC-01 | Enable Banking Italian market page and Mar 2026 changelog; Yapily data-restrictions (Intesa 429, two-week window); GoCardless docs (90-day default, 4/day) | https://enablebanking.com/docs/markets/it/ ; https://enablebanking.com/blog/2026/04/08/enable-banking-changelogmarch-2026 ; https://docs.yapily.com/pages/data/financial-data-resources/data-restrictions/ ; https://developer.gocardless.com/bank-account-data/overview | live | high (official, snippets/mirror) | Coverage and sync constraints |
| EU-S-38 / S-11 / S-13a | Wallet Trustpilot; Plum IT App Store; Spendee IT | https://www.trustpilot.com/review/budgetbakers.com ; https://apps.apple.com/it/app/plum-risparmi-e-investimenti/id1456139507 ; https://apps.apple.com/it/app/635861140?see-all=reviews&platform=iphone | 2025–26 / n/d | low-medium / medium | Italian linking complaints |
| EU-S-21 / S-22 / S-35 / S-49 | Emma learning; Snoop categorisation complaints; Finanzguru and Dyme contract ledgers | https://help.emma-app.com/en/article/change-a-transaction-category-iipyy2/ ; https://www.trustpilot.com/review/snoop.app?page=3 ; https://www.check-app.de/2026/08/09/finanzguru-womit-verdient-die-app-eigentlich-geld-und-was-bekommt-sie-dafuer-von-mir/ ; https://tink.com/press/dyme-tink/ | n/d–2026 | high / low / medium | Learning and recurring benchmarks |
| EU-S-63 / S-66 / S-74 / S-77 / S-78 / S-79 / S-33 / S-02 / S-08 / S-50a / S-43 | Emma plans and extra members; Plum IT prices; Wallet IT IAPs; Outbank; Bankin'; Linxo; Which?; Moneyhub closure; Oval Money; Monefy | https://emma-app.com/plans/compare-emma-plans ; https://withplum.com/it-it/subscriptions ; https://apps.apple.com/it/app/wallet-finanza-personale/id1032467659 ; https://help.outbankapp.com/de/kb/articles/was-kostet-das-abo ; https://support.bankin.com/hc/fr/articles/360006559578-Pr%C3%A9sentation-de-Bankin-Plus ; https://tirelire-ailee.fr/linxo-avis-2026-appli-fiable/ ; https://www.which.co.uk/money/banking/banking-security-and-payment-methods/open-banking-budgeting-and-saving-apps-aLl3e0g9I7Ft ; https://moneyhubhelp.zendesk.com/hc/en-gb/articles/48275693667217-Moneyhub-App-Closure-and-Your-Account-Options ; https://www.ceotech.it/oval-money-lapp-di-risparmio-chiude-definitivamente/ ; https://www.monefy.com/ | 2023–26 | high–low (see synthesis) | Price anchors; shutdowns; manual-entry benchmark |
| US-S4 / S6 / S13 / S17 / S40 / S42 / S53 / S61 / S65 / S131 / S128 / S130 / W27 | YNAB pending policy; YNAB Together; YNAB learning curve; Monarch household; Copilot card payments and onboarding; Copilot couples trap; PocketGuard "In My Pocket", Amex disconnects, free-plan removal | https://www.ynab.com/blog/pending-transactions-have-arrived ; https://www.ynab.com/whats-new/introducing-ynab-together ; https://www.thepennyhoarder.com/budgeting/ynab-review/ ; https://www.forbes.com/advisor/banking/monarch-budget-app-review/ ; https://marriagekidsandmoney.com/monarch-money-review/ ; https://help.copilot.money/en/articles/10671434-credit-card-payment-transactions ; https://help.copilot.money/en/articles/11157550-quick-start-guide ; https://www.fincomparelab.com/reviews/copilot-money-review/ ; https://www.thepennyhoarder.com/budgeting/pocketguard-review/ ; https://apps.apple.com/us/app/pocketguard-budget-app/id949414211 ; https://www.trustpilot.com/review/pocketguard.com ; https://clark.com/personal-finance-credit/budgeting-saving/pocketguard/ | 2023–26 | high–low (see synthesis) | Patterns and anti-patterns |

End of document.

## Review log

Repository evidence/product-scope review — 2026-10-02. Personas remain fictional composites, not interviewed customers.

| Critique | Resolution | Remaining evidence / owner |
|---|---|---|
| MAJOR — top summary deferred households while PD-1/PD-5 and scenes shipped them at MVP | P2/P4 adult individual use is MVP; household stories explicitly Later, sharing/seat economics unvalidated | Product/Counsel/Security: joint-account scope, permissions, revocation and isolation before Famiglia |
| BLOCKER — P4 still connected/imported minor accounts despite 18+ claim | Removed child account source rows; parent-side top-ups only, no computed child balances | Counsel: future minor/parental-authority analysis; not a beta dependency |
| MAJOR — matching inaccessible Amex/Nexi and complete first-session bill calendar overpromised | Unitemised card debit unless independent card ledger; long periods require adequate history or user confirmation | Provider/Research: coverage, real-data pilot and recurring precision |
| MAJOR — uncapped app-open refresh, equality and 78% UI confidence presented authority | Active-user limits explicit; snapshot display vs anchored diagnostics distinct; unsupported numeric confidence replaced with reasons | Engineering/UX: bank-level data behaviour and calibrated review tests |
| MAJOR — willingness-to-pay and separate household/free-tier decisions conflicted | Business document owns Gratis/Plus/30-day preview policy; persona ranges are unvalidated experiment hypotheses | Research/Business: interviews/diaries plus purchase/retention evidence |
| MAJOR — old compliance subsection/decision references no longer existed | Updated privacy cross-references and removed missing PD references | All owners: maintain cross-document scope consistency |

**Gate contribution:** sufficient hypotheses for mock UX; Gate A/F not empirically validated. **Human blockers:** representative adult interviews/diaries, incumbent-depth checks, authorised provider pilot and later household/minor counsel decisions. No real interviews or bank linking performed by this review.
