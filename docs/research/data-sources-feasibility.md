# Data-sources feasibility — the multi-source strategy (A–I) for Lilleri on iOS and Android

**Project:** LILLERI · **Date / verification date for every claim:** 2026-10-02 · **Author:** open banking specialist + CTO fintech, founding team
**Status:** Phase 1 synthesis of `docs/research/raw/non-bank-sources-and-os-limits.md` (NB), `open-banking-providers-a.md` (A), `open-banking-providers-b.md` (B) and `regulatory-landscape.md` (REG), plus the searches tagged `NEW-n` in `open-banking-providers.md`. Companion: `open-banking-providers.md` (provider decision), `provider-capability-matrix.md`, `provider-cost-model.md`.

## How to read this document

- **Question answered:** beyond the chosen PSD2 provider, which data sources can Lilleri ingest, on which platform, at what cost and policy exposure — and which belong in the MVP?
- **Verdict vocabulary (per source, per platform):** **FEASIBLE** (no policy or legal blocker, cost ≈ engineering) · **FEASIBLE WITH CONSENT+COST** (needs an explicit user consent step and/or a paid dependency or certification) · **NOT FEASIBLE** (no API, closed by law or platform) · **POLICY RISK** (technically possible but exposed to store policy or legal re-characterisation; may be rejected or removed). Platforms: **iOS**, **Android**; **Web** is noted where it differs.
- **Labels:** FACT / ASSUMPTION / HYPOTHESIS / DECISION / OPEN QUESTION / UNKNOWN, carried over from the raw notes. The raw notes could reach only `developer.apple.com`, `developer.android.com`, `cloud.google.com` and GitHub first-hand; Google Play policy text, PayPal, Satispay, Amazon, OCR vendors and most pricing pages were egress-blocked, so those rows are ASSUMPTION/UNKNOWN with a verification path.
- **Legal baseline for every "via a licensed provider" statement:** PSD2 + RTS 2018/389 as amended by 2022/2360 are in force (180-day renewal, 4×/24 h background cap, ~90-day first history); PSD3/PSR and FIDA are not in force; the "recipient under the provider's licence" route (A) is documented by the providers but Banca d'Italia's position is UNKNOWN (P0 counsel question) — see `open-banking-providers.md` §1–2.

---

## 0. Summary — sources A–I by platform

| Source | iOS | Android | Web | Cost (order of magnitude) | Privacy / policy risk | User value (Italy) | MVP or later |
|---|---|---|---|---|---|---|---|
| **A. Open banking (PSD2 AIS via licensed provider)** | FEASIBLE WITH CONSENT+COST | FEASIBLE WITH CONSENT+COST | FEASIBLE WITH CONSENT+COST | €0.3–0.8 per user/month at scale; floor at seed (ASSUMPTION ranges, `provider-cost-model.md`) | Low–medium (regulated channel; provider's name on consent; route-A legal question open) | Very high (core promise) | **MVP** |
| **B. Official provider APIs** (PayPal, Satispay, brokers, exchanges, BNPL, Amazon, utilities) | Mostly NOT FEASIBLE (merchant-side APIs); exchanges FEASIBLE WITH CONSENT; Directa FEASIBLE | same | same | Engineering only | Medium (API-key custody for exchanges) | Low–medium | **Later** (exchanges/brokers); never for PayPal/Satispay consumer APIs |
| **C. File import** (CSV/XLSX/PDF statements) | FEASIBLE (share sheet, Files) | FEASIBLE (share target, SAF) | FEASIBLE (best UX for files) | Engineering per template | Low (user-initiated) | High (history backfill, uncovered institutions, fallback) | **MVP** (top formats) |
| **D. Receipt scanning** (camera OCR / LLM vision) | FEASIBLE | FEASIBLE | FEASIBLE (upload) | $0.0003–0.10 per receipt (FACT for Google Expense Parser $0.10; Vertex Gemini list; others ASSUMPTION) | Medium (images; third-party AI disclosure, Apple 5.1.2(i)) | Medium (cash, itemisation) | **MVP-lite** (optional attach-to-transaction), not core |
| **E. E-mail receipts** — Gmail API (restricted scope) | FEASIBLE WITH CONSENT+COST | same | same | Annual CASA assessment (UNKNOWN amount; four-figure to low-five-figure, 2–3 months) | High (whole-mailbox access; Limited Use) | Medium (Amazon, bills itemisation) | **Later** |
| **E'. E-mail receipts — forward-to-Lilleri inbox** | FEASIBLE | FEASIBLE | FEASIBLE | ≈ $0.10 per 1,000 inbound e-mails (SES) to a few $/month (ASSUMPTION) | Low (user chooses what to forward) | Medium | **MVP-lite / early later** (demand test) |
| **E''. Microsoft Graph Mail.Read** | FEASIBLE WITH CONSENT | same | same | Free; publisher verification needs a Partner Center account | High | Low–medium in Italy | Later |
| **F. Android notification listener** (bank/wallet push) | NOT FEASIBLE (no iOS API) | FEASIBLE WITH CONSENT; **POLICY RISK moderate** | n/a | Engineering | High (listener sees every notification; OTPs redacted on Android 15+) | Medium–high (instant pending; Satispay itemisation) | **Later** (opt-in experiment with kill-switch) |
| F'. Android SMS reading | NOT FEASIBLE | **POLICY RISK high → effectively NOT FEASIBLE on Play** | n/a | — | Very high | Low (Italian banks use push; SMS alerts are paid) | Never |
| F''. Android Accessibility scraping | NOT FEASIBLE | NOT FEASIBLE (policy) | n/a | — | Extreme | — | Never |
| **G. OS integrations** — Apple FinanceKit | NOT FEASIBLE in Italy (US/UK only) | n/a | n/a | — | — | — | Never unless Apple extends to the EU (watch item) |
| G'. Apple Pay / Wallet transaction history | NOT FEASIBLE (no API) | n/a | n/a | — | — | — | Never |
| G''. Google Pay / Wallet transaction history | n/a | NOT FEASIBLE (issuer/merchant APIs only); Takeout export exists | n/a | — | — | Low | Never (Takeout import: later, low priority) |
| G'''. Share sheet / camera / file picker | FEASIBLE | FEASIBLE | n/a | Engineering | None | Enabler for C and D | **MVP** |
| **H. Manual entry** | FEASIBLE | FEASIBLE | FEASIBLE | Engineering | None | Medium (cash, uncovered accounts) | **MVP** |
| **I. Recurring manual templates** | FEASIBLE | FEASIBLE | FEASIBLE | Engineering | None | Medium (rent in cash, allowances, known bills) | **MVP** (simple) |
| Screen scraping / storing bank credentials | NOT FEASIBLE | NOT FEASIBLE | NOT FEASIBLE | — | Extreme (PSD2, bank T&Cs, no licence) | — | Never |

Bottom line (FACT-based where the raw notes are first-hand, otherwise ASSUMPTION): for an unlicensed startup in Italy the only reliable *automatic* source is PSD2 AIS through a licensed provider; everything that touches the OS payment layer (Apple Pay, iOS notifications, Google Pay, Android SMS/Accessibility) is closed or policy-hostile; the user-pushed artefacts (files, forwarded e-mails, receipt photos, manual entries) are cheap, policy-safe and belong in the MVP; the one grey OS channel worth an experiment is Android notification access, opt-in, after the MVP [NB-§0].

---

## 1. Source A — Open banking (PSD2 AIS via a licensed provider)

| Aspect | Finding | Label | Source |
|---|---|---|---|
| Feasibility, both platforms | FEASIBLE WITH CONSENT+COST under route A (recipient under the provider's licence); the bank's consent screen names the provider; redirect/app-to-app SCA on all major Italian banks. | FACT (providers) / UNKNOWN (Banca d'Italia position) | A-§2.6, REG-§10.2 |
| Platform specifics | iOS and Android: redirect to the bank app or web via universal/app links; Hosted Pages or provider widgets in an in-app browser; no native SDK at Yapily/Enable Banking (Tink/Salt Edge have iOS/Android SDKs). Web: same redirect flow. | FACT | A-§3.x, B-§4 |
| What arrives | Balances; booked and (bank-dependent) pending transactions; ~90 days at first consent; 4 unattended refreshes/day; 180-day re-authentication at the bank; Intesa two-week retrieval windows; sparse counterparty fields at CBI Globe banks. | FACT / UNKNOWN (fill-rates) | A-§2.1–2.5 |
| Coverage limits to state explicitly | Current accounts, Postepay/BancoPosta, Revolut, N26: reachable. Credit cards: partial (Nexi prepaid only; Fineco cards at Enable Banking; UniCredit/Mediolanum/CA none; Amex IT UNKNOWN). PayPal: PSD2 interface exists, provider-specific (Tink: no). Satispay: no aggregator listing found. Hype: UNKNOWN. | FACT / UNKNOWN | A-§2.3, B-§1, NB-§1–2 |
| Cost | Per connected account or per user; floor at seed; see `provider-cost-model.md`. | ASSUMPTION ranges | — |
| Privacy | Regulated channel; explicit consent; art. 67(2)(f) purpose limitation; GDPR DPIA mandatory for Lilleri; EU hosting to be confirmed per provider. | FACT (law) / UNKNOWN (hosting) | REG-§1, §6 |
| Store policy | Apple 3.2.1(viii) ("money management apps should be submitted by the financial institution performing such services and must have necessary licensing") → publish from Lilleri's legal entity, keep the licensed provider visible in review notes; Google Play Financial-features declaration (budgeting/money management is a declarable feature; licence evidence may be requested). | FACT (text) / HYPOTHESIS (review outcome) | NB-§3.3, REG-§11 |

**Verdict:** MVP, both platforms. Decision on the provider in `open-banking-providers.md` (Yapily primary, Enable Banking fallback).

## 2. Source B — Official (non-PSD2) provider APIs

| Provider | What exists | iOS / Android verdict | Label | Source / how to verify |
|---|---|---|---|---|
| **PayPal** | Transaction Search API (`GET /v1/reporting/transactions`) uses the app's own client-credentials and returns the *merchant* account's transactions; "Log in with PayPal" has no transaction scope. **NOT FEASIBLE for a consumer PFM via PayPal's own APIs.** Via PSD2 AIS: FEASIBLE WITH CONSENT+COST if the chosen provider lists PayPal (Europe) S.à r.l. (cached GoCardless record: 90-day history, IT in scope); Tink's Italian list has no PayPal. CSV "activity download": FEASIBLE. | NOT FEASIBLE (own API) / FEASIBLE via AIS if listed / FEASIBLE via CSV — same on both platforms | FACT (merchant API, via SDK docs) / UNKNOWN (AIS coverage per provider) / ASSUMPTION (CSV) | NB-§1; verify scope list on developer.paypal.com; RFP question |
| **Satispay** | Business/online APIs for merchants only; no consumer account-information API documented; open-banking (XS2A) portal exists → PSD2 access is in principle possible for a licensed AISP, but **no aggregator lists Satispay** (Tink's IT list has none). Consumer export (CSV/PDF) UNKNOWN. | NOT FEASIBLE (own API) / UNKNOWN via AIS (leaning negative) | FACT (portal) / UNKNOWN | NB-§2; A-#29; NEW-3/NEW-10 |
| **Revolut, N26** | Own PSD2 APIs; reachable through aggregators (Tink lists both for IT; Enable Banking Revolut, N26). Revolut app offers Excel/CSV export; N26 web app CSV. | FEASIBLE via AIS; FEASIBLE via CSV | FACT / ASSUMPTION (exports) | A-§2.3; NB-§7.1 |
| **Trade Republic** | No official API; `pytr` is an unofficial client of a private API — using it would breach TR's terms and is fragile → never. TR's cash account may be reachable via PSD2 AIS (German banking licence) — which aggregators list it UNKNOWN. PDF documents/CSV via the unofficial tool only. | NOT FEASIBLE (unofficial API = POLICY RISK, never) / UNKNOWN via AIS | FACT (pytr) / UNKNOWN | NB-§8 |
| **Degiro** | No official API; consumer CSV export of transactions/account statement in the web app. | FEASIBLE via CSV only | ASSUMPTION (high confidence) | NB-§8 |
| **Directa** | Documented Trading API for clients (portfolio, orders, history); read-only use with client credentials possible; terms/cost UNKNOWN. | FEASIBLE (API) — later | ASSUMPTION (medium) | NB-§8; verify on directa.it |
| **Moneyfarm, Fineco brokerage** | No public API; PDF/online reports (Moneyfarm); Excel/PDF (Fineco); Fineco current/card accounts via PSD2 instead. | NOT FEASIBLE (API) / CSV-PDF only | ASSUMPTION | NB-§8 |
| **Binance, Kraken** | User-generated **read-only** API keys (account info, trade history); CSV export too. | FEASIBLE WITH CONSENT (key custody in a KMS; withdrawal-disabled keys) — later | ASSUMPTION (high confidence) | NB-§8 |
| **Coinbase** | "Sign in with Coinbase" OAuth2 (`wallet:accounts:read`, `wallet:transactions:read`) historically; current status under CDP docs UNKNOWN. | UNKNOWN — later | UNKNOWN | NB-§8 |
| **Klarna, Scalapay, PayPal Pay in 3 (BNPL)** | Merchant APIs only; instalments visible only on the funding instrument (card/SEPA lines "KLARNA", "SCALAPAY"; PayPal activity). | NOT FEASIBLE (API); FEASIBLE from bank data (pattern detection: identical amounts, 30-day or 2-week cadence, 3–4 occurrences, BNPL brand) | ASSUMPTION / HYPOTHESIS (detection) | NB-§9 |
| **Amazon** | Order History Reports retired (US, Mar 2023; never on amazon.it); GDPR "Richiedi i tuoi dati" archive only (days–weeks); browser-extension scraping breaches Conditions of Use. | NOT FEASIBLE (routine sync); POLICY RISK (scraping) → never; e-mail channel instead | ASSUMPTION (medium) | NB-§10 |
| **Utilities / telco (Enel, Plenitude, A2A, TIM, Vodafone, WindTre, Iliad, Fastweb)** | No consumer APIs; PDF bills by e-mail/web; payments via SDD/pagoPA/card → SDD lines carry creditor name/ID and mandate reference. | NOT FEASIBLE (API); FEASIBLE from bank data (recurring detection on SDD creditor id) | ASSUMPTION | NB-§11 |
| **Government portals** (ADE e-invoices, lotteria degli scontrini, IO app, Portale Consumi) | SPID/CIE-gated, no third-party API; manual export at best (HYPOTHESIS for lottery receipt list). | NOT FEASIBLE (automation) | ASSUMPTION / HYPOTHESIS | NB-§6.2, §12 |

**Verdict:** no official consumer API worth integrating in the MVP; exchanges/Directa later; PayPal/Satispay/BNPL/utilities are handled by source A (if listed), bank-side detection and source C.

## 3. Source C — File import (CSV/XLS/XLSX/PDF statements)

| Aspect | Finding | Label | Source |
|---|---|---|---|
| Feasibility | FEASIBLE on iOS (share sheet, Files picker), Android (share target, Storage Access Framework) and Web (drag-and-drop — best UX for files). Zero policy risk; privacy low (user-initiated); cost = engineering per template + template drift. | FACT (platform mechanisms) / ASSUMPTION (bank formats) | NB-§7, §12 |
| Italian export formats believed available (all ASSUMPTION; bank sites blocked) | Intesa Sanpaolo: PDF, Excel (CSV possibly; Italian column names "Data", "Operazione", "Dettagli", "Conto o carta", "Contabilizzazione", "Categoria", "Valuta", "Importo"); UniCredit: Excel, CSV, PDF; Fineco: XLS, PDF; BancoPosta/Postepay: PDF, Excel/CSV via web; Revolut: Excel/CSV per account/period (high confidence); N26: CSV with English headers (high); Hype: PDF (CSV UNKNOWN); Amex IT: Excel/CSV, PDF (QIF/OFX UNKNOWN); Nexi: Excel/PDF; PayPal: CSV activity, PDF (high); Satispay: UNKNOWN. | ASSUMPTION | NB-§7.1 |
| Standard formats | OFX/QFX/QIF: essentially not offered by Italian retail banks; MT940/CAMT.053/CBI records: corporate channels only; PDF statements universal but need per-bank templates (LLM-assisted parsing viable, must reconcile totals). | ASSUMPTION (high confidence) | NB-§7.2 |
| Value | High: (a) history backfill beyond the ~90 days PSD2 returns at first consent, (b) fallback when a bank API is flaky, (c) onboarding users whose institution is uncovered (Satispay, Amex, brokers); competitors' lesson: CSV import/export on every tier is a trust feature. | ASSUMPTION / FACT (competitor notes) | NB-§7.3 |
| Design | Generic CSV/XLSX importer with column-mapping UI + pre-built mappings (Intesa, UniCredit, Fineco, Revolut, N26, PayPal); deduplicate against API-sourced transactions by (date, amount, normalised description) with a tolerance window; PDF parsing later; OFX/QIF as a cheap bonus. | DECISION (design input) | NB-§7.3 |

**Verdict:** MVP (top six mappings + generic mapper); PDF statements later.

## 4. Source D — Receipt scanning (OCR / LLM vision)

| Aspect | Finding | Label | Source |
|---|---|---|---|
| Feasibility | FEASIBLE on both platforms (camera via out-of-process picker — Apple 5.1.1(iii) prefers picker/share sheet over full Photos access; Android photo picker); upload on Web. | FACT (platform) | NB-§6, §12; NB-S-04 |
| Vendor prices | Google Document AI Expense Parser **USD 0.10 per page** (list; no volume tier; Italian "in specific versions") — FACT (pricing page fetched); Enterprise Document OCR USD 1.50 per 1,000 pages (first 1,000/month free) — FACT; Azure prebuilt receipt v4.0 supports Italian (`it` thermal, `it-IT` hotel) — FACT; price ≈ USD 10 per 1,000 pages — ASSUMPTION; AWS Textract AnalyzeExpense ≈ USD 0.01 per page — ASSUMPTION; Mistral OCR USD 0.002–0.004 per page (+0.003–0.005 annotation) — registry (medium); LLM vision: Gemini 2.5 Flash-Lite $0.10/$0.40 per MTok (FACT, Vertex), Claude Haiku 4.5 $1/$5, Sonnet 5.5 $2/$10 (first-party cache 2026-09-25), gpt-5-mini $0.25/$2.00 (registry). | FACT / ASSUMPTION as marked | NB-§6.1 |
| Per-receipt cost | ≈ USD 0.0003 (Gemini Flash-Lite) – 0.001 (gpt-5-mini) – 0.0035 (Haiku) – 0.007 (Sonnet) – 0.01 (Azure/AWS) – 0.10 (Google Expense Parser); at 5 receipts/user/month even the most expensive path is < USD 0.50/user/month. **Cost is not the deciding factor; Italian thermal-receipt accuracy and privacy posture are.** | ASSUMPTION (order of magnitude; derived) | NB-§6.1 |
| Italian specifics | "Documento commerciale" from registratori telematici since 2020: seller name/P.IVA, date/time, line items with VAT codes, "TOTALE COMPLESSIVO", payment split, progressive number; **no standard machine-readable barcode**; lotteria degli scontrini code printed; instant-lottery QR status UNKNOWN; no independent Italian OCR benchmark found. | ASSUMPTION / UNKNOWN | NB-§6.2 |
| Privacy / policy | Images may contain other personal data; sending them to an external LLM = sharing with third-party AI → explicit permission (Apple 5.1.2(i), text confirmed verbatim; Google User Data policy disclosure/consent); prefer EU-hosted inference with a DPA; purpose strings for camera. | FACT (Apple text) / FACT-knowledge (Google) | NB-§3.3, REG-§11 |
| Design | Optional photo that attaches a receipt to an existing transaction (match by amount ± €0.01, date, merchant if possible); extraction with an EU-hosted model under a DPA; build a 200-receipt labelled Italian test set (supermarkets, bars, pharmacies, fuel) and benchmark 2 LLMs + 1 specialised parser before choosing. | DECISION (design input) / HYPOTHESIS (accuracy) | NB-§6.3 |

**Verdict:** MVP-lite (optional, never required for the core promise); both platforms.

## 5. Source E — E-mail receipts

| Channel | Feasibility | Cost | Privacy / policy | Label | Source |
|---|---|---|---|---|---|
| **Gmail API (restricted scopes)** | FEASIBLE WITH CONSENT+COST. `gmail.readonly`, `gmail.modify`, `gmail.metadata`, `mail.google.com` are **restricted** scopes → restricted-scope verification (brand, privacy policy, demo video, Limited Use) and, because Lilleri would store extracted data on servers, an **annual CASA security assessment by an authorised assessor** (Tier 2 self-scan reported no longer allowed — 2026 third-party notes, low). Unverified apps: 100 users, 7-day token expiry. | Assessment fee UNKNOWN (older FAQ: USD 15–75k pre-CASA; 2023 reports of ~USD 540 self-scan are **defunct**; safe planning number: four-figure to low-five-figure per year + 2–3 months lead time) | High (whole-mailbox access; Limited Use policy; DPIA; third-party AI disclosure) | FACT (scope tiers) / ASSUMPTION (process) / UNKNOWN (cost) | NB-§5.1 |
| **Microsoft Graph `Mail.Read` (Outlook.com / M365)** | FEASIBLE WITH CONSENT. Delegated `Mail.Read` does **not** require admin consent and is consentable on personal accounts (official source file re-read); `Mail.ReadBasic` excludes bodies/attachments (insufficient). Publisher verification: free, needs a Partner Center account and a verified domain; unverified multi-tenant apps are blocked by risk-based step-up consent in many tenants. | Free | High | FACT | NB-§5.2 |
| **Forward-to-Lilleri inbox** (`receipts-<token>@in.lilleri.app`; user forwards or sets a Gmail/Outlook filter) | FEASIBLE on every platform; no restricted scopes, no CASA; Gmail auto-forwarding requires one-time verification of the destination. | ≈ USD 0.10 per 1,000 inbound e-mails (SES) to a few USD/month on hosted inbound-parse plans (ASSUMPTION) | Low (Lilleri sees only what the user forwards; strong data-minimisation story) | ASSUMPTION (medium) | NB-§5.3 |
| **IMAP with app-specific passwords** (iCloud, Libero, Virgilio, Aruba; Gmail with 2-Step Verification) | Technically FEASIBLE but **not a route Lilleri should take**: custody of a full-mailbox credential, no granular scope, revocable at any time by the provider. | — | High | ASSUMPTION | NB-§5.1 AV, §5.3 |
| **Vendors** (Nylas, Unipile, EmailEngine, Mailparser/Parseur, Zapier Email Parser) | FEASIBLE WITH COST; they do **not** remove Lilleri's own Google restricted-scope verification/CASA for production use under Lilleri's OAuth client (whether shipping on Nylas' client is allowed is UNKNOWN). | Prices UNKNOWN (historically per-connected-account monthly fees; Mailparser from ~USD 40/month) | High | UNKNOWN | NB-§5.3 |
| GDPR (all channels) | Legal basis = explicit consent per mailbox, revocable in-app; DPIA very likely; server-side filters by sender/subject, immediate discard of non-receipts, short attachment retention; Google Limited Use and Apple 5.1.2(i) both require disclosure of third-party AI processing. | FACT (law) / ASSUMPTION (practice) | NB-§5.4 |

**Verdict:** forward-to-inbox as the MVP-lite / early-later demand test (cheap, privacy-friendly: Amazon, Trenitalia/Ryanair, utilities' PDF bills, Apple/Google receipts); Gmail OAuth + CASA later, only if receipt itemisation proves valued; Outlook.com next because it is free of CASA.

## 6. Source F — Android notification listener (and the two "never" channels)

| Channel | Finding | Verdict | Label | Source |
|---|---|---|---|---|
| **NotificationListenerService** (reads bank/wallet push alerts: amount, merchant/payee, sometimes card suffix) | Declared with `BIND_NOTIFICATION_LISTENER_SERVICE`; the user must enable it in Settings → Special app access → Notification access and can revoke any time; platform docs call the access sensitive. Android 15+ **redacts OTP-bearing notifications** for untrusted listeners (`RECEIVE_SENSITIVE_NOTIFICATIONS` is `signature|role`, not obtainable by Lilleri) — transaction alerts unaffected today, but the platform direction is narrowing. Play policy: notification access is not a named "restricted permission" (ASSUMPTION; policy centre blocked) but falls under the Permissions/APIs-that-access-sensitive-information and User Data policies (prominent disclosure, runtime consent, Data safety); two 2026 policy-update bundles (April: answer/16926792; July: answer/17134731; deadlines 26 Aug 2026, 30 Sep 2026, 27 Jan 2027) could not be read. Indian PFM precedent (SMS→notification parsing after 2019) is a tolerated pattern when disclosed (HYPOTHESIS). Italian banks/wallets (Intesa, UniCredit, Fineco, BancoPosta/Postepay, Revolut, N26, Hype, Satispay, Nexi, Amex) send push for card payments, Satispay payments, incoming transfers; formats unstandardised. | **FEASIBLE WITH CONSENT; POLICY RISK moderate; privacy risk high** — Android only; **NOT FEASIBLE on iOS** (no API for third-party apps) | FACT (platform API; OTP redaction) / ASSUMPTION (Play policy) / HYPOTHESIS (tolerance) | NB-§4.2; NB-S-08, S-32, S-33, S-34, S-35 |
| Mitigations if pursued | Opt-in, launched after MVP; filter by package name on-device and discard everything else immediately; parse on-device; never transmit raw notification text off-device; prominent disclosure screen before the system-settings hop; Data safety "Financial info — collected, not shared"; instrumented experiment with a kill-switch; device tests on Android 15/16 for false-positive OTP redaction of Italian bank alerts. | DECISION (design input) | NB-§4.2 |
| Value | Near-real-time pending transactions (closing the gap left by 4×/day polling) and **the only automatic Satispay itemisation path if no AIS coverage exists**. | HYPOTHESIS (value) | NB-§2, §4.2 |
| **SMS reading** (`READ_SMS`/`RECEIVE_SMS`) | Play "SMS and Call Log permissions" policy restricts to default handlers and a short exception list; expense tracking is not an exception; apps were removed in 2019; the policy is live and being narrowed in 2026 (READ_CALL_LOG account-verification use case withdrawn). Italian bank SMS alerts are paid add-ons anyway. | **POLICY RISK high → NOT FEASIBLE on Play; never** | ASSUMPTION (policy wording) / FACT (policy live, 2026 narrowing) | NB-§4.3 |
| **AccessibilityService** (reading bank-app screens) | Android docs: only for general-purpose assistive tools; Play requires the accessibility declaration and forbids using it to collect data from other apps; would also breach bank T&Cs and PSD2. | **NOT FEASIBLE; never** | FACT (Android docs) / ASSUMPTION (Play) | NB-§4.4 |

**Verdict:** notification listener = later, Android-only, opt-in experiment; SMS and Accessibility = never.

## 7. Source G — OS integrations

| Integration | Finding | iOS | Android | Label | Source |
|---|---|---|---|---|---|
| **Apple FinanceKit** (iOS 17+) | Provides accounts, balances, transactions, history tokens and background delivery for Apple Wallet financial data — **United States only** (Apple Card, Apple Cash, Savings; iOS 17.4+) and **United Kingdom only** (accounts connected to Wallet via UK open banking: Barclays, HSBC, Lloyds, Monzo, NatWest, Santander …; iOS 18.4+). Entitlement requires distribution "through the App Store for iPhone in the United States or United Kingdom", Finance category, financial-management tools, reciprocity rule, `NSFinancialDataUsageDescription`. **No EU/Italy availability** (page fetched three times on 2026-10-02; unchanged). Other issuers' Apple Pay transactions are not in FinanceKit even in the US. | **NOT FEASIBLE in Italy** | n/a | FACT | NB-§3.2; NB-S-01, S-02, S-03, S-28 |
| **Apple Pay / Wallet transaction history** | PassKit processes payments and manages passes; **no API reads the user's Apple Pay history or other issuers' cards**; Guideline 5.1.2(vii) limits sharing of Apple-Pay-acquired data. | **NOT FEASIBLE** | n/a | FACT (by exclusion of documented APIs) | NB-§3.1 |
| **iOS notification reading** | No OS API for third-party apps. | **NOT FEASIBLE** | n/a | FACT (absence) | NB-§3.4 |
| **Google Pay / Google Wallet** | Wallet API is issuer-side (passes); Google Pay APIs are merchant-side; **no API returns a consumer's Google Pay history**; users can export their own Google Pay data via Takeout (JSON/CSV) — low value in Italy because Google Pay transactions already appear on the underlying card/bank. | n/a | **NOT FEASIBLE** (API); Takeout import later, low priority | ASSUMPTION (high confidence; pages blocked) | NB-§4.1 |
| **Wallet passes (loyalty cards)** | Issuer-side APIs only; no spend data. | Low value | Low value | ASSUMPTION | NB-§12 |
| **Share sheet / "Open in Lilleri" (share extension, share target)** for PDFs, CSVs, receipt images, e-mails | FEASIBLE, cheap, zero policy risk; companion to C and D. | FEASIBLE | FEASIBLE | FACT (platform mechanisms) | NB-§12 |
| **Camera / Photos** | Use the out-of-process picker (Apple 5.1.1(iii) explicitly prefers picker/share sheet over full Photos access). | FEASIBLE | FEASIBLE | FACT | NB-§12 |
| **Location** | Later, optional, for merchant enrichment and receipt↔transaction matching; adds a sensitive category. | Later | Later | ASSUMPTION | NB-§12 |
| **Watch item** | If Apple extends FinanceKit to EU open-banking-connected accounts, Lilleri's Finance-category listing and "financial management tools" positioning would already satisfy the entitlement criteria. | OPEN QUESTION (quarterly check) | — | — | NB-§3.4 |

## 8. Source H — Manual entry

| Aspect | Finding | Label |
|---|---|---|
| Feasibility | FEASIBLE on iOS, Android, Web; no policy or privacy exposure beyond the app's own data. | FACT |
| Role in a zero-setup product | Not a setup step; a correction/complement path surfaced from the Review Inbox: cash spending, uncovered accounts (Satispay wallet balance, Amex, brokers), splitting a receipt, adjusting a balance. Keep it one tap from any transaction list; Italian copy example: *"Aggiungi una spesa in contanti"*, *"Correggi il saldo"*. | DECISION (design input) |
| Interplay with automation | Manual entries participate in reconciliation (an entered cash expense should not duplicate an ATM withdrawal; a manual "PayPal" entry should merge with a later CSV import) — same dedup keys as source C. | DECISION (design input) |

**Verdict:** MVP.

## 9. Source I — Recurring manual templates

| Aspect | Finding | Label |
|---|---|---|
| What | User-defined recurring entries for money that never reaches a connected account or arrives without descriptors: rent paid in cash, allowances, informal subscriptions, a known bill not yet visible. Each template generates expected occurrences that the subscription/recurring module can match against real transactions (bank SDD lines carry creditor id and mandate reference — reliable keys; BNPL instalment cadences detectable). | ASSUMPTION / HYPOTHESIS (matching quality) |
| Feasibility | FEASIBLE on all platforms; pure product logic; no external dependency. | FACT |
| Risk | Over-engineering the setup: must stay optional and inbox-driven ("Lilleri ha notato un pagamento mensile a …, vuoi tenerlo d'occhio?") rather than a budgeting chore. | DECISION (design input) |

**Verdict:** MVP (simple version: amount, cadence, counterparty, account), richer forecasting later.

---

## 10. Explicit limitation statements (for product copy and investor material)

| Topic | Statement | Label |
|---|---|---|
| **Apple Pay** | Lilleri cannot read Apple Pay or Apple Wallet transaction history on iOS: there is no third-party API, and FinanceKit — Apple's only developer route to Wallet financial data — is available solely in the United States and the United Kingdom as of 2026-10-02. Apple Pay purchases are seen only through the underlying bank/card account via PSD2 (as card settlements) or via imports. | FACT |
| **Google Pay** | Lilleri cannot read Google Pay / Google Wallet transaction history: the Wallet and Pay APIs are issuer- and merchant-side. Google Pay purchases are seen through the underlying card/bank account; a user-driven Google Takeout import is possible but low-value. Android notification parsing (opt-in, later) could surface them in near-real time. | ASSUMPTION (high confidence; Google developer pages blocked) |
| **Satispay** | No consumer API; no aggregator was found listing Satispay for PSD2 AIS (Tink's Italian catalogue has none); Satispay publishes an XS2A portal so a licensed AISP could in principle connect. In the MVP Lilleri sees Satispay only from the bank side (top-ups as SEPA debits "SATISPAY") and models a "Satispay wallet" pseudo-account (balance = top-ups − known spends) with manual/CSV completion; itemisation would come from AIS coverage (RFP clause) or the Android notification experiment. | FACT (portal) / UNKNOWN (coverage) / DECISION (MVP handling) |
| **PayPal** | PayPal's own API is merchant-side (not usable for a consumer app). PayPal (Europe) is a Luxembourg bank with a PSD2 AIS interface (90-day history per a cached aggregator record), but coverage is provider-specific — Tink's Italian list has none — so PayPal AIS is a hard RFP requirement; the MVP ships PayPal CSV import and reconciles card/SEPA lines "PAYPAL *MERCHANT" with PayPal activity (±3 days, same amount). | FACT (API) / UNKNOWN (coverage) / DECISION |
| **Credit cards** | Nexi exposes AIS only for prepaid cards; UniCredit, Mediolanum and Crédit Agricole expose no card accounts; Fineco card accounts are reachable (Enable Banking, 2026); Amex Italy unknown. Lilleri must not promise credit-card coverage in the MVP; card settlements on the current account are the reliable signal, plus CSV import of card statements. | FACT / UNKNOWN |
| **Investments, loans, insurance, pensions** | Out of PSD2 scope; FIDA not in force (earliest ≈ 2028–2029); only manual balances, CSV (Degiro, Directa, Trade Republic documents), read-only exchange keys; never credential-based scraping of brokers (Powens' non-PSD2 wealth channel noted but not adopted). | FACT (law) / DECISION |
| **History** | ~90 days at first connection is the Italian norm; deeper history only via statement/CSV import. | FACT (typical) |
| **Refresh** | Up to 4 unattended refreshes per day per consent plus unlimited refreshes while the user is in the app; pending transactions appear only where the bank exposes them. | FACT (law) / UNKNOWN (per bank) |

Italian onboarding copy example consistent with the above: *"Collega i tuoi conti e Lilleri capisce da sola cosa succede ai tuoi soldi. Vediamo gli ultimi 3 mesi subito e impariamo da qui in avanti. Apple Pay, Google Pay e Satispay? Li riconosciamo dai movimenti del conto."*

---

## 11. Platform-policy constraints that apply across sources

| Rule | Content (verified 2026-10-02 on the platform's own page unless noted) | Implication | Label | Source |
|---|---|---|---|---|
| Apple 3.2.1(viii) | "Apps used for financial trading, investing, or money management should be submitted by the financial institution performing such services and must have necessary licensing and permissions in the locations where you make them available." | Submit from Lilleri's legal entity; keep the licensed AISP visible in review notes; the answer differs between route A (recipient) and route B (agent) — settle the route before submission. Many non-bank PFMs are on the store → manageable review risk, not a blocker. | FACT (text) / HYPOTHESIS (outcome) | NB-§3.3; REG-§11.1 |
| Apple 5.1.1(i)–(iii), (v) | Privacy policy, consent before collection, data minimisation, "paid functionality must not be dependent on or require a user to grant access to this data", in-app account deletion. | Consent-first onboarding; subscription not conditioned on data permissions; in-app deletion in MVP. | FACT | NB-§3.3 |
| Apple 5.1.2(i) (13 Nov 2025 revision) | "You must clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so." | Explicit permission step before transactions/receipts/e-mails go to an external LLM; prefer EU-hosted inference and a DPA. | FACT (verbatim) | NB-§3.3; REG-§11.1 |
| Apple ATT | Required only if linking user data with third-party data for advertising/data brokers; EU alternative prompt mandatory in Italy from iOS 27.2 (only if tracking). | No ad-tech SDKs → no ATT prompt. | FACT | NB-§3.3; REG-§11.2 |
| Apple App Privacy Details | Declare "Other Financial Info" (linked, app functionality), identifiers, contact info; no tracking. | Labels from the real SDK list. | FACT | NB-§3.3 |
| Google Play Data safety + account deletion | Declare all data collected/shared incl. SDKs; "financial info" named category; in-app + web account deletion. | Form-filling from the real SDK list. | FACT | REG-§11.3 |
| Google Play Financial features declaration | Budgeting/money-management is a declarable feature; licence documentation may be requested; whether an aggregation app relying on a third-party AISP must upload the provider's licence evidence is UNKNOWN (route-dependent). | Prepare the licence evidence pack (provider licence + contract). | ASSUMPTION / UNKNOWN | NB-§4.5; REG-§11.3 |
| Google Play User Data policy | Prominent disclosure + runtime consent before sharing personal/sensitive data with third parties (covers LLM sharing); an AI-specific 2026 change could not be corroborated. | Same explicit-permission step as Apple 5.1.2(i). | FACT (existing rules, knowledge) / UNKNOWN (2026 AI clause) | REG-§11.3 |
| GDPR | DPIA mandatory (systematic financial data + innovative tech); Art. 9 inference risk from categories (health/religion/union/politics) → taxonomy design; EU residency; SCCs + TIA besides DPF (appeal C-703/25 P pending). | Affects sources A, D, E, F equally. | FACT (law) / FACT (reported, DPF appeal) | REG-§6 |

---

## 12. MVP vs later — recommendation

| Phase | Sources | Why |
|---|---|---|
| **MVP (zero-setup promise, Italy; iOS + Android)** | **A** PSD2 AIS via the primary provider (RFP must require PayPal, ask Satispay/Trade Republic cash/Hype); **C** CSV/XLSX import with mappings for Intesa, UniCredit, Fineco, Revolut, N26, PayPal + generic mapper + share-sheet entry; **H** manual entry from the Review Inbox; **I** simple recurring templates; **bank-side detection** of Satispay top-ups, BNPL instalments, SDD bills, salary (no integration needed); **G'''** share sheet/camera/file picker; **D** receipt photo as an optional attach-to-transaction (MVP-lite); compliance plumbing the stores require anyway (consent-first onboarding, account deletion, privacy labels/Data safety, explicit third-party-AI permission, no ATT, IAP/Play Billing, Financial-features declaration). | Delivers the core promise on the accounts where Italian money actually moves; every item is policy-safe; the only external dependency is the AIS provider. |
| **Later — sequenced by evidence of demand** | 5. **E'** forward-to-inbox receipts (cheap demand test) → **E** Gmail OAuth + CASA only if itemisation proves valued (budget: assessment fee UNKNOWN; 2–3 months) → Outlook.com (no CASA); 6. **D** full receipt itemisation with an EU-hosted model benchmarked on an Italian receipt set; 7. **F** Android notification-access experiment (opt-in, on-device parsing, kill-switch) for instant pending transactions and Satispay itemisation; 8. **B** investments/crypto: manual balances → CSV (Degiro/Directa/TR documents) → read-only exchange keys (KMS, withdrawal-disabled) → Directa API; 9. PDF-statement parsing; Google Takeout import (low priority). | Each adds itemisation or breadth, not the core "what happens to my money" answer; each carries a cost (CASA), a policy risk (notification access) or a smaller audience (investments). |
| **Never** | Screen scraping / storing bank credentials; Android SMS reading; Accessibility scraping; unofficial private APIs (Trade Republic `pytr`); browser-extension scraping of Amazon/web banking. | Illegal, policy-hostile or catastrophic for trust. |
| **Watch list** | FinanceKit EU expansion; Android notification-listener policy changes (April/July 2026 Play bundles); Satispay PSD2 availability at aggregators; lotteria degli scontrini QR / receipt export; FIDA progress; PSR final text (4×/24 h, 180 vs 365 days). | Quarterly review. |

---

## Decisions / Recommendations

1. **MVP data sources (DECISION):** A (PSD2 AIS), C (CSV/XLSX import, six mappings + generic), H (manual), I (simple recurring templates), bank-side detection of wallets/BNPL/SDD/salary, share-sheet/camera entry points, and D as an optional receipt attachment. Both platforms. Web for file import if a web client exists.
2. **PayPal and Satispay handling (DECISION):** PayPal AIS coverage is a hard RFP requirement with CSV fallback in the MVP; Satispay is modelled as a bank-side pseudo-account in the MVP; neither is promised as "connected".
3. **Credit cards (DECISION):** not promised; card settlements on the current account plus CSV import; Fineco cards where the provider exposes them.
4. **E-mail (DECISION):** forward-to-inbox first; Gmail restricted scopes + CASA only after demand is proven; budget a yearly four-figure to low-five-figure assessment plus 2–3 months lead time; never IMAP credential custody.
5. **Android notification access (DECISION):** post-MVP opt-in experiment with on-device parsing, package allow-list, no raw text off-device, prominent disclosure, kill-switch; read the April/July 2026 Play policy bundles first.
6. **Never (DECISION):** screen scraping, bank credential storage, SMS reading, Accessibility scraping, unofficial private APIs, Amazon scraping.
7. **Policy plumbing in the MVP (DECISION):** explicit third-party-AI permission step (Apple 5.1.2(i) + Play User Data), in-app account deletion, consent-first onboarding not tied to the paid tier, privacy labels/Data safety from the real SDK list, Financial-features declaration with the provider licence pack, no ATT.
8. **Copy (DECISION):** onboarding states the limits plainly (90 days of history, a few refreshes a day, cards/wallets recognised from bank movements), e.g. *"Apple Pay, Google Pay e Satispay? Li riconosciamo dai movimenti del conto."*

## Open questions

| # | Question | Label | How to verify | Priority |
|---|---|---|---|---|
| D1 | Which shortlisted AIS providers list PayPal (PPLXLULL) for Italian users, with what history and consent model? (Tink: no.) | UNKNOWN | Provider institution lists / sandbox (`institutions?country=IT`, `aspsps?country=IT`, Tink `GET /api/v1/providers/{IT,LU}`); written RFP answer. | P0 |
| D2 | Is Satispay reachable via any AIS provider or its own XS2A portal; does the consumer app export CSV/PDF? | UNKNOWN | Ask providers; developers.satispay.com; in-app check. | P1 |
| D3 | Hype: which providers list it (Fabrick assumed)? | UNKNOWN | RFP; Fabrick enquiry. | P1 |
| D4 | Current Google Play policy wording for NotificationListenerService use by finance apps, incl. the April/July 2026 update bundles (answer/16926792, answer/17134731). | UNKNOWN | Read on an unblocked network before the experiment. | P1 (later phase) |
| D5 | CASA Tier 2 cost and timeline for Gmail restricted scopes; whether Nylas or others shield Lilleri from its own verification. | UNKNOWN | Quotes from 2–3 CASA labs (appdefensealliance.dev); Nylas sales. | P2 |
| D6 | EU-region list prices for Azure receipt, Textract AnalyzeExpense, Veryfi, Taggun, Mindee; Italian thermal-receipt accuracy of 2 LLMs + 1 parser on a 200-receipt set. | UNKNOWN / HYPOTHESIS | Vendor pricing pages; benchmark. | P2 |
| D7 | Real export options per Italian bank (section 3) and sample files for the parser test suite. | ASSUMPTION | Manual collection with real accounts. | P1 (MVP) |
| D8 | Has Apple announced FinanceKit for any EU market? | UNKNOWN | apple.com/newsroom; developer.apple.com/financekit quarterly. | P3 |
| D9 | Does the lotteria degli scontrini reserved area let a consumer export participating receipts; is the instant-lottery QR live? | UNKNOWN | lotteriadegliscontrini.gov.it; ADE provvedimenti. | P3 |
| D10 | Trade Republic / Directa / Degiro official export and API terms; Coinbase OAuth status under CDP. | UNKNOWN | Vendor help centres. | P3 |
| D11 | Whether the Play Financial-features declaration requires licence evidence for an aggregation app under route A. | UNKNOWN | Play Console form; Google support. | P1 |
| D12 | Google Play User Data policy: any AI-specific disclosure clause added in 2026 (answer 10144311). | UNKNOWN | Read policy page. | P2 |

## Sources

Raw-note source IDs are kept (`NB-S-n` = `non-bank-sources-and-os-limits.md` Sources; `REG-S-n` = `regulatory-landscape.md` §16; `A-#n`, `B-#n` as in the sibling documents). All verified 2026-10-02; "fetched" = read first-hand through the tool; "mirror" = official text via the Context7 index; otherwise search-engine excerpt.

| Tag | Source | URL | Verified / access | Reliability | Used for |
|---|---|---|---|---|---|
| NB-S-01, S-28 | Apple — FinanceKit overview (regions, entitlement criteria) | https://developer.apple.com/financekit/ | 2026-10-02 (fetched ×3) | high | US/UK only |
| NB-S-02, S-03 | Apple — FinanceKit framework and FinanceStore docs (JSON) | https://developer.apple.com/documentation/financekit ; https://developer.apple.com/documentation/financekit/financestore | 2026-10-02 (fetched) | high | Capabilities |
| NB-S-04, REG-S-74 | Apple — App Store Review Guidelines ("Last Updated: June 8, 2026"; 3.1.1, 3.2.1(viii), 5.1.1, 5.1.2(i)) | https://developer.apple.com/app-store/review/guidelines/ | 2026-10-02 (fetched, raw HTML) | high | Store rules |
| NB-S-05 | Apple — PassKit framework docs | https://developer.apple.com/documentation/passkit | 2026-10-02 (fetched) | high | No Apple Pay history API |
| NB-S-06, REG-S-38 | Apple — App Tracking Transparency; user privacy and data use (EU prompt) | https://developer.apple.com/documentation/apptrackingtransparency ; https://developer.apple.com/app-store/user-privacy-and-data-use/ | 2026-10-02 (fetched) | high | ATT |
| NB-S-07 | Apple — App Privacy Details | https://developer.apple.com/app-store/app-privacy-details/ | 2026-10-02 (fetched) | high | Financial Info labels |
| NB-S-08 | Android — NotificationListenerService reference | https://developer.android.com/reference/android/service/notification/NotificationListenerService | 2026-10-02 (fetched) | high | Listener mechanics |
| NB-S-09 | Android — AccessibilityService guide | https://developer.android.com/guide/topics/ui/accessibility/service | 2026-10-02 (fetched) | high | "Only … general-purpose assistive tool" |
| NB-S-32, S-33, S-34 | Android 15 "Behavior changes: all apps" (OTP redaction); `Manifest.permission` RECEIVE_SENSITIVE_NOTIFICATIONS; AOSP core manifest | https://developer.android.com/about/versions/15/behavior-changes-all ; https://developer.android.com/reference/android/Manifest.permission#RECEIVE_SENSITIVE_NOTIFICATIONS ; https://raw.githubusercontent.com/aosp-mirror/platform_frameworks_base/android15-release/core/res/AndroidManifest.xml | 2026-10-02 (fetched) | high | OTP redaction |
| NB-S-35, REG-S-40 | Android — Google Play policies landing page (2026 update bundles; SMS/Call-Log narrowing; deadlines) | https://developer.android.com/distribute/play-policies | 2026-10-02 (fetched) | high (summary-level) | Policy calendar |
| REG-S-41 | Android — Data safety: collect and share | https://developer.android.com/guide/topics/data/collect-share | 2026-10-02 (fetched) | high | Data safety |
| — | Google Play policy pages (blocked): Permissions & APIs (answer 9888170); User Data (10144311); SMS/Call Log (10208820); Financial Services (9876821); April/July 2026 bundles (16926792, 17134731) | https://support.google.com/googleplay/android-developer/ | not fetched | — | To verify |
| NB-S-10, S-46 | Google — Gmail API scopes (restricted tiers) | https://developers.google.com/workspace/gmail/api/auth/scopes | 2026-10-02 (mirror) | medium-high | Restricted scopes |
| NB-S-42 | Third-party 2026 engineering notes on CASA (Tier 2 self-scan no longer allowed) | GitHub code search ("CASA" "Tier 2") | 2026-10-02 | low | Stale-figure warning |
| NB-S-11 | Microsoft — Graph permissions reference (Mail.Read delegated: no admin consent) | https://learn.microsoft.com/graph/permissions-reference (raw source file via GitHub) | 2026-10-02 (fetched) | high | Outlook route |
| NB-S-12 | Microsoft — Publisher verification overview | https://learn.microsoft.com/entra/identity-platform/publisher-verification-overview (via GitHub) | 2026-10-02 (fetched) | high | Publisher verification |
| NB-S-13, S-14 | PayPal — Transaction Search (server SDK docs); REST v1→v2 migration | https://github.com/paypal/paypal-dotnet-server-sdk/blob/main/doc/controllers/transaction-search.md ; https://developer.paypal.com/api/rest/integration/payments-api/v1-v2-migration | 2026-10-02 (mirror) | medium-high | Merchant-side API |
| NB-S-15, S-16 | GitHub caches of the GoCardless institution record PAYPAL_PPLXLULL (90 days, IT) | https://github.com/frieser/openbanking-cli (and others) | 2026-10-02 | medium | PayPal PSD2 interface |
| NB-S-37 | Tink — market capabilities, Italy (provider table; no PayPal/Satispay/Hype) | https://docs.tink.com/market-capabilities/aggregation?market=IT | 2026-10-02 (mirror) | medium-high | Coverage negatives |
| NB-S-17; A-#29 | FindAPIs — Satispay Online API (merchant); Satispay Open Banking portal | https://github.com/paytience/FindAPIs ; https://openbanking.satispay.com/ | 2026-10-02 | low / high | Satispay |
| NB-S-18, S-26, S-47 | Google Cloud — Document AI processors list; Document AI pricing (Expense Parser $0.10/page) | https://cloud.google.com/document-ai/docs/processors-list ; https://cloud.google.com/document-ai/pricing | 2026-10-02 (fetched) | high | OCR prices |
| NB-S-19, S-27 | Microsoft — Azure AI Document Intelligence prebuilt receipt; language support (Italian) | https://learn.microsoft.com/azure/ai-services/document-intelligence/prebuilt/receipt ; https://learn.microsoft.com/azure/ai-services/document-intelligence/language-support/prebuilt (via GitHub) | 2026-10-02 (fetched) | high | Azure receipt |
| NB-S-20 | AWS — Textract expense documents (archived GitHub mirror) | https://github.com/awsdocs/amazon-textract-developer-guide/blob/master/doc_source/expensedocuments.md | 2026-10-02 | medium (stale) | AnalyzeExpense fields |
| NB-S-21, S-31 | Anthropic price table (bundled skill cache, 2026-09-25) | docs.anthropic.com pricing (cache) | 2026-10-02 | high (first-party cache) | LLM vision prices |
| NB-S-22, S-45 | LiteLLM price registry (OpenAI, Gemini, Mistral OCR) | https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json | 2026-10-02 | medium | LLM/OCR prices |
| NB-S-36 | Google Cloud — Vertex AI generative AI pricing | https://cloud.google.com/vertex-ai/generative-ai/pricing | 2026-10-02 (fetched) | high | Gemini prices |
| NB-S-23 | pytr — unofficial Trade Republic client | https://github.com/pytr-org/pytr | 2026-10-02 | medium | Never use |
| NB-S-38, S-39, S-40; A-§2.6; B-§15 | Provider docs on route A (Tink consent; TrueLayer collect user consent; Enable Banking FAQ/TPP) and sibling licensing sections | https://docs.tink.com/resources/payments/one-time-payments/consent-and-authentication-one-time-payments ; https://docs.truelayer.com/docs/collect-user-consent ; https://enablebanking.com/docs/faq ; https://enablebanking.com/docs/tpp | 2026-10-02 (mirror) | medium-high | Legal baseline of source A |
| A-#23, #191 | Nexi — open banking / PSD2 Data Opening (prepaid-only AIS) | https://nexi.it/openbanking.html ; https://www.nexi.it/news/pagamenti-digitali/psd2.html | 2026-10-02 | high | Credit-card limits |
| B-#12, #13 | Enable Banking — Italy market page; changelogs (card accounts, Fineco; N26) | https://enablebanking.com/docs/markets/it/ ; https://enablebanking.com/blog/2026/04/08/enable-banking-changelogmarch-2026 ; https://enablebanking.com/blog/2026/05/14/enable-banking-changelog-april-2026 | 2026-10-02 | high (snippet) | Card accounts; N26 |
| REG-§6, S-26, S-31, S-76 | GDPR/EDPB 06/2020; DPF General Court T-553/23; appeal C-703/25 P | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-062020-interplay-second-payment-services-directive_en ; https://curia.europa.eu/juris/liste.jsf?num=T-553/23 ; https://curia.europa.eu/juris/liste.jsf?num=C-703/25%20P | 2026-10-02 (not fetched; reported) | high / medium | Privacy constraints |
| REG-S-73 | Android Developers blog — expanded billing choice and lower fees on Google Play | https://developer.android.com/blog/posts/expanded-billing-choice-and-lower-fees-on-google-play | 2026-10-02 (fetched) | high | Store economics context |
| NEW-3, NEW-9, NEW-10 | WebSearch 2026-10-02: Satispay AIS coverage; Enable Banking Italy list; openbankingtracker Satispay | https://openbanking.satispay.com/ ; https://enablebanking.com/docs/markets/it/ ; https://www.openbankingtracker.com/providers | 2026-10-02 | medium | No Satispay aggregator evidence; N26 at EB |
| — | Blocked on 2026-10-02 (to re-verify): developer.paypal.com; developers/support.satispay.com; support.google.com Play policy centre; appdefensealliance.dev; azure/aws pricing; veryfi/taggun/mindee/nylas; platform.openai.com; ai.google.dev; agenziaentrate.gov.it; lotteriadegliscontrini.gov.it; amazon.it; docs.klarna.com; developers.binance.com; docs.cdp.coinbase.com; directa.it; help.revolut.com; bank export pages | — | not fetched | — | Listed in NB Sources "Blocked today" |
