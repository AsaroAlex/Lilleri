# Build vs Buy and Vendor Landscape — LILLERI (verified 2026-10-02)

**Project:** LILLERI — consumer PFM, Italy-first then Europe. TypeScript monorepo (React Native + Expo, Next.js, Node, PostgreSQL, Redis, workers, AI provider abstraction, OpenTelemetry, GitHub Actions). Promise: zero-setup aggregation + automatic reconciliation + personal AI categorisation.

**Scope.** For each of 18 component families: current vendor facts (Oct 2026), EU-readiness, public pricing (UNKNOWN when not public), a BUILD / BUY / HYBRID recommendation for the MVP, cost ranges at 1k / 10k / 100k monthly active users, lock-in risk, migration path, and a "core IP?" flag. Closes with a decision table and the list of items that need a human to sign a contract or pay.

**Method and limitations (read first).**
- The session-wide `WebSearch` budget was already exhausted (200/200) when this task started; 8 searches were attempted and none returned results. `WebFetch`/`curl` to almost every vendor site is blocked by the egress proxy (`CONNECT tunnel failed, 403`).
- Evidence therefore comes from: (a) vendor documentation mirrored by Context7 (medium-high reliability, snapshot undated unless noted); (b) raw documentation files fetched today from `raw.githubusercontent.com` (high — primary, live); (c) the npm registry, PyPI and Docker Hub for versions and dates (high); (d) four vendor pages that were reachable: `platform.claude.com`, `cloud.google.com/document-ai/pricing`, `developer.apple.com/programs`, `www.anthropic.com/pricing` (high); (e) sibling research docs in this repo written today (`open-banking-providers-a/b.md`, `ai-ml-transaction-intelligence.md`, `tech-stack-options.md`, `regulatory-landscape.md`), cited as cross-references; (f) the author's prior knowledge, always labelled ASSUMPTION with the page to verify.
- Labels: **FACT** (read in a primary or mirrored-primary source today), **ASSUMPTION** (prior knowledge or secondary source; verify), **HYPOTHESIS** (reasoned inference), **UNKNOWN** (not found; how to verify given). Reliability: high / medium / low. Currency: USD unless `€` stated. "MAU" = monthly active users unless a vendor defines its own metric (noted).

**Cost-model assumptions used for 1k / 10k / 100k users (state once, reuse):** 1 user = 1 MAU with ~1.5 linked accounts, ~80 bank transactions/month, ~100 analytics events/month (PostHog's own B2C table ranges 8–162 events/MAU/month — FACT), 1 receipt scan/month averaged over all users, 30 push/month, 4 transactional emails/month, 2 % of users contact support per month, 5 % paid conversion at €4.99/month (MTR 1k ≈ €250, 10k ≈ €2.5k, 100k ≈ €25k). Dev-time is priced at €0 (founder time) but noted in person-weeks. All cost figures are monthly, pre-VAT, and ranges, not quotes.

---

## 0. Summary decision table (details in each section)

| # | Component | MVP call | MVP vendor / stack | Est. monthly cost 1k / 10k / 100k | Lock-in | Core IP? |
|---|---|---|---|---|---|---|
| 1 | Auth & identity | **BUILD (OSS lib)** | better-auth 1.7.7 in the API, own Postgres; passkeys + 2FA plugins | €0 / €0 / €0–50 (infra share) | Low | No, but data gravity |
| 2 | Open banking | **BUY under provider licence** | Agent/partner programme (see §2; chosen elsewhere) | UNKNOWN; rumoured €0.25–0.50/user/mo or €200–500/mo entry | High | No (but the reconciliation on top is) |
| 3 | Enrichment / categorisation | **BUILD (HYBRID for logos)** | Rules + embeddings + small LLM (see §3, §18); Brandfetch free Logo API for logos | $5–25 / $50–250 / $500–2,500 (LLM) | Low | **YES** |
| 4 | Receipt OCR | **HYBRID** | LLM vision with structured output first; Google Document AI Expense parser as fallback/benchmark | $5–15 / $50–150 / $500–1,500 | Low–medium | Partly (Italian scontrino parsing rules) |
| 5 | Product analytics | **BUY (free tier)** | PostHog Cloud EU (Frankfurt) | $0 / $0 / ~$450 | Low–medium | No |
| 6 | Subscription billing | **BUY** | RevenueCat (IAP) + Stripe Billing + Stripe Tax (web only, later) | $0 / $0–25 / ~$250 + store fees | Medium | No |
| 7 | Push + email | **BUY (free tiers)** | Expo Push service; Resend (EU region) or Brevo; FCM/APNs underneath | $0–20 / $20–40 / $90–350 | Low | No |
| 8 | Customer support | **BUY cheap or self-host** | Crisp (FR) or Chatwoot CE self-hosted; email-first at 1k | $0–25 / $25–100 / $100–600 | Low | No |
| 9 | Feature flags | **BUILD** | DB-backed flags behind OpenFeature SDK; PostHog flags later for experiments | $0 / $0 / $0–200 | Low | No |
| 10 | Observability | **BUY (free tiers) + OTel** | Sentry EU (Frankfurt) + Grafana Cloud Free (EU) + OTel SDK; Pino logs | $0 / $26–60 / $100–400 | Low (OTel) | No |
| 11 | Secrets / KMS / backups | **BUILD (OSS)** | sops + age in Git, Infisical self-host optional; pgBackRest → EU object storage | $0–5 / $5–10 / $10–30 | Low | No |
| 12 | Document / consent storage | **BUY (commodity)** | Cloudflare R2 with `eu` jurisdiction, or Hetzner Object Storage | $0 / $0–2 / $5–20 | Low (S3 API) | No |
| 13 | Logos | **BUY free tier + cache** | Brandfetch Logo API (free ≤500k req/mo, no attribution); provider institution logos for banks | $0 / $0 / $0 (cache) | Low | No |
| 14 | FX rates | **BUILD trivial** | ECB daily reference rates (free) via self-hosted Frankfurter or direct XML | $0 | None | No |
| 15 | Address / geo | **Not needed for MVP** | — | $0 | — | No |
| 16 | Legal / consent / DPO | **BUY** | iubenda (IT) or Termly; external DPO contract | €10–40 / €20–60 / €60–200 + DPO €150–600 | Low | No |
| 17 | App distribution | **BUY (mandatory)** | Apple $99/yr, Google $25 once, EAS Free → Starter $19/mo → Production | $8–30 / $30–110 / $110–200 | Medium (EAS) | No |
| 18 | AI vendors | **BUY via abstraction** | Primary: Anthropic Haiku 4.5 / Sonnet 5.5 (batch + cache); EU-resident fallback: Mistral EU endpoint | $20–100 / $200–1,000 / $2,000–8,000 | Low (abstraction) | The prompts/evals are IP |

---

## 1. Authentication & identity

### 1.1 Vendor facts

| Vendor | Pricing (public) | Passkeys | MFA | Session revocation | Apple / Google sign-in | EU residency | Current SDK (npm, verified 2026-10-02) | Status / source / reliability |
|---|---|---|---|---|---|---|---|---|
| **better-auth** (OSS, MIT) | Free. Infra only. | Yes: `@better-auth/passkey` 1.7.7 (separate package since 1.7); Expo flow uses browser-based WebAuthn; `cookiePrefix` must match challenge cookie. Native-passkey community wrappers: `expo-better-auth-passkey` 1.6.0 (2026-10-01), `react-native-nitro-better-auth-passkey` 2.0.5 | `twoFactor` plugin (TOTP, backup codes) | Core routes `listSessions`, `revokeSession`, `revokeOtherSessions` (DB sessions) | Social providers; Apple idToken sign-in documented | Your DB, your region | `better-auth` 1.7.7 (2026-09-30; 1.7.0 on 2026-08-18), `@better-auth/expo` 1.7.7 | FACT (npm registry; Context7 /better-auth/better-auth docs + source) — high. Doubts: security-audit status UNKNOWN; minor releases have carried migration steps (tech-stack doc S14). |
| **Clerk** | Billing by *Monthly Retained Users* (user who returns ≥1 day after sign-up). **Free: 50,000 MRU per application**; above → Pro. Pro price: UNKNOWN here (recollection: $25/mo + $0.02/MRU — ASSUMPTION, low). | Yes (Expo `user.createPasskey()` — tech-stack doc S44) | Yes | Yes (dashboard + API) | Yes | **UNKNOWN** — not found in clerk-docs mirror; tech-stack doc also UNKNOWN. Verify: clerk.com/docs search "data residency"/"EU". | `@clerk/clerk-expo` 2.20.0 (2026-09-18), `@clerk/nextjs` 7.9.10 (2026-10-02) | FACT for MRU/free tier (Context7 /clerk/clerk-docs migrating/overview.mdx) — high. |
| **Auth0** (Okta) | **Free: up to 25,000 MAU**, 1 custom domain, passwordless, unlimited social, 5 organisations, community support, 1-day log retention. Essentials / Professional / Enterprise tiers exist; prices not in the mirror (recollection: B2C Essentials from ~$35/mo at 500 MAU — ASSUMPTION, low). | Yes (ASSUMPTION, high) | Yes | Yes | Yes | Tenant region selectable incl. EU at creation (ASSUMPTION, high; verify auth0.com/docs "tenant region") | — | FACT for Free plan (Context7 /auth0/docs-v2 feature-audit-pricing) — high. |
| **Supabase Auth** | **Free: 50,000 MAU**; **Pro $25/mo: 100,000 MAU included, then $0.00325/MAU**; third-party MAU same; SSO MAU $0.015; "Advanced MFA" (phone) is a paid add-on. Example in docs: 160k MAU on Pro = $195 MAU overage. | **Experimental** ("API may change without notice; explicit opt-in in client") | TOTP included; phone add-on | Yes | Yes | EU regions eu-central-1 (Frankfurt), eu-central-2 (Zurich, non-EU), eu-west-1/2/3, eu-north-1 (tech-stack doc S34) | `@supabase/supabase-js` 2.117.2 (2026-09-25) | FACT (raw supabase/supabase docs `billing-on-supabase.mdx`, `monthly-active-users.mdx`, `auth/passkeys.mdx`) — high. Doubt: US company (CLOUD Act exposure noted in tech-stack doc). |
| **Stytch** | **Free: 10,000 MAU** (pricing page snapshot) — an older Stytch blog says B2C free tier = 5,000 MAU: **conflict; the pricing-page figure is newer**. Pay-as-you-go per MAU: price not captured → UNKNOWN. | Yes (product) | Yes | Yes | Yes | **UNKNOWN** (verify stytch.com/docs "data residency") | `@stytch/react-native` 0.73.0 (2026-09-29) | FACT for free tier (Context7 /llmstxt/stytch_api_llms_txt: stytch.com/pricing) — medium. |
| **Ory Network** (Kratos managed) | Plans: Developer (free tier), Production, Growth, Enterprise; prices UNKNOWN (verify ory.sh/pricing). | Yes (Kratos passkeys) | Yes | Yes | Yes | **Personal-data storage location chosen at project creation, permanent** (EU available); staging/dev environments are *not* GDPR-grade for PII. | `@ory/client` 1.22.66 (2026-07-28); Kratos Apache-2.0 (LICENSE read today) | FACT (Context7 /ory/docs personal-data-location, products overview; raw LICENSE) — high for facts listed. |
| **Firebase Auth / Identity Platform** | Base Firebase Auth free (ASSUMPTION, high). **With Identity Platform (Blaze): no-cost tier 50,000 MAU, then $0.0025–0.0055/MAU** (email/social/anon/custom); SAML/OIDC $0.015/MAU beyond 49; Spark projects limited to 3,000 DAU after upgrade; SMS limits 3,000/day without IP. | No native passkeys (ASSUMPTION, medium) | Yes with Identity Platform | Yes (revoke refresh tokens) | Yes | Auth data location: **UNKNOWN** (historically US-only for Auth; verify firebase.google.com/docs/projects/locations) | `firebase` 12.19.0 (2026-10-01), `@react-native-firebase/auth` 26.4.0 | FACT for pricing (Context7 /websites/firebase_google docs/auth) — high. |
| **Keycloak** (self-host, Apache-2.0) | Free; ops cost (JVM, ~1–2 GB RAM, Postgres). | Yes (WebAuthn/passkeys built in — ASSUMPTION, high) | Yes | Yes | Yes (identity brokering) | Wherever you host | Release-notes files for 26.3 / 26.4 / **26.5** exist on `main`; no 27.x → current line is 26.5.x (FACT for files; ASSUMPTION for patch). 26.5 highlights: workflows, JWT authorization grants, OpenTelemetry metrics/logging. LICENSE.txt Apache-2.0. | FACT (raw keycloak/keycloak `release_notes/topics/26_5_0.adoc`, `LICENSE.txt`) — high. |

### 1.2 Recommendation — **BUILD with better-auth (self-hosted library)**; Ory Network (EU) as the managed fallback

- **Why:** Lilleri's user table and sessions are regulated financial data; keeping them in the same EU Postgres as the ledger avoids a second controller/processor, a second region decision and a vendor DPA. better-auth is first-class for Expo, passkeys and 2FA, and is already the pick in `tech-stack-options.md`. All hosted options except Supabase would cost $0 at MVP scale anyway, so the hosted "savings" are nil; the price you pay for hosting is lock-in, not money.
- **Cost (1k / 10k / 100k):** €0 / €0 / €0–50 (extra Postgres rows and a worker for email OTP); hosted comparison at 100k: Supabase $25 (within 100k) ; Clerk ~ $25 + 50k × $0.02 ≈ $1,025 (ASSUMPTION price); Firebase IP ~ 50k × $0.0055 ≈ $275; Auth0 UNKNOWN (likely low thousands).
- **Lock-in:** Low (your schema; standard OAuth/OIDC flows). **Migration path:** export users/credentials/passkey public keys from Postgres; Ory Kratos or Keycloak import. Reverse (into Clerk/Auth0) needs password-hash import support (bcrypt/argon2 supported by most).
- **Core IP?** No — but the account model (households, shared budgets, consent records) is, and it lives next to auth.
- **Risks / to verify:** better-auth security audit status (UNKNOWN); native passkey UX on iOS/Android requires a community native module or the browser-based flow; Sign in with Apple requires the Apple Developer Program (§17).

---

## 2. Open banking (summary of the "operate under provider licence" option; full analysis elsewhere)

Full provider analysis: `open-banking-providers-a.md` (Tink, TrueLayer, Yapily, Salt Edge) and `open-banking-providers-b.md` (Fabrick, Enable Banking, Powens, Plaid, Mastercard/Aiia, Neonomics, Bud, CBI Globe). Cross-referenced facts only:

| Route | Who offers it | Mechanics | Pricing (public) | Status |
|---|---|---|---|---|
| **Agent of a licensed AISP** | Tink ("Tink's use of agents"; Tink becomes the regulated PSP and performs AML/CTF), TrueLayer (Ireland entity; due diligence + monitoring) | Lilleri registered as the licensee's agent; licensee's name appears on consent; Italy: OAM agent registration (€160 fee) and Banca d'Italia notification mechanics still UNKNOWN for AIS-only agents | Sales-led. Third-party claim Tink ≈ €0.50/user/month "Standard" (low reliability) | FACT for existence (docs A §2.6, doc B §15) |
| **Licence-as-a-service / partner programme** | Yapily Connect (Yapily is the TPP on consent), Salt Edge Partner Program (Partners API v1; Salt Edge collects consent, KYC fields on customer creation), Fabrick Pass (IT/ES/FR), Enable Banking (FIN-FSA AISP serving unlicensed customers, per-account pricing), Mastercard Open Banking Europe "Aiia Data (unlicensed)", Powens (ACPR, annual sub-client listing), Plaid (EU entity; Europe sales-only) | Provider's licence covers the activity; Lilleri must not present itself as providing AIS; mandatory in-app consent management; 180-day consent, 4×/day refresh budget | Rumoured entry points: Yapily ≈ £200–500/month; Salt Edge "Growth" ≈ $500/month with per-consented-end-user metering; Enable Banking has a quote tool; everything else UNKNOWN | FACT for existence; prices low reliability |
| **Own AISP licence** | CBI Globe direct access requires it | Banca d'Italia authorisation, PII insurance (EBA formula), eIDAS QWAC/QSealC, compliance officer | UNKNOWN (legal + PII + certificates; several k€/yr for certs alone) | Not for MVP |

**Recommendation: BUY under provider licence (agent or partner programme).** Costs at 1k / 10k / 100k users (HYPOTHESIS using the rumoured ranges, 1.5 connections/user): €200–500 fixed / €2,500–7,500 / €25k–75k per month — this will be Lilleri's largest variable cost after people, and the single item most in need of an RFP (identical RFP to 3–4 providers: 1k / 10k / 50k connected accounts, AIS-only, Italy, agent vs partner, minimums, contract length). **Lock-in: high** (consent re-collection on migration; provider-specific IDs). **Migration path:** abstract provider behind an internal `AggregationProvider` interface from day one; store raw provider payloads; plan for a dual-provider period because consents do not transfer. **Core IP?** No — the reconciliation/dedup engine on top is (`reconciliation-and-data-model-patterns.md`). **Human needed:** yes — contract, KYC/AML onboarding, possibly OAM/agent registration.

---

## 3. Transaction enrichment & categorisation as a service vs in-house

### 3.1 Vendor facts (Italian coverage / price / latency / minimums)

| Vendor | What was verified today | Italian coverage | Price per transaction | Latency / minimums | Status / source |
|---|---|---|---|---|---|
| **Ntropy** | Stateless SDK/API; MIT-licensed SDK; inputs `description, entry_type, amount, currency, date, location.country`; PyPI `ntropy-sdk` **5.5.0** (verified today) | Markets multi-country; Italy quality UNKNOWN | **UNKNOWN** (sales) | UNKNOWN | FACT SDK facts (PyPI; ai-ml doc) — medium |
| **Salt Edge Enrichment** (categorisation + merchant) | Accepts raw third-party descriptions with country hint; `learn` action for user corrections; 18 top-level / 62 subcategories personal taxonomy | Salt Edge covers Italian banks; categorisation quality for Italian merchants UNKNOWN | UNKNOWN (bundled with aggregation plans) | UNKNOWN | FACT features (ai-ml doc via Context7 Salt Edge v6) — medium |
| **Tink Data Enrichment / Merchant Information** | ML categorisation with per-user learning, recurring + predicted recurring, merchant brand/logo/location, CO2; requires ingesting data into Tink's user/account model first | Tink is live in Italy; enrichment accuracy UNKNOWN | UNKNOWN (sales; Visa enterprise motion) | UNKNOWN | FACT product (doc A §3) — high |
| **TrueLayer** | Transaction data reference with classification fields | Italy supported | UNKNOWN | UNKNOWN | FACT (ai-ml doc) — medium |
| **Heron Data** | Enrich-transactions sync endpoint; `is_recurring`, `has_matching_transaction`, duplicate flags; SMB-flavoured categories; PyPI `heron-data` 0.1.4 | **Non-US coverage unverified** | UNKNOWN | Sync endpoint exists | FACT API shape — medium |
| **Plaid Enrich** | Accepts raw descriptions; Personal Finance Category taxonomy (16/104) | Non-US coverage unverified | UNKNOWN (Europe sales-led) | — | FACT taxonomy — medium |
| **Bud Financial** | Enrichment is the core product; Bank of Lithuania AISP licence; free sandbox; production per-user pricing via sales | UNKNOWN | per-user (low-reliability blog) | — | FACT (doc B) — medium/low |
| **Snowdrop, Fabrick enrichment** | Docs not reachable; Fabrick is the only Italy-native option | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN — verify at snowdropsolutions.com, fabrick.com/apis |
| **Brandfetch Transaction API** | `POST /v2/brands/transaction` with `transactionLabel` + `countryCode` → brand/logo/domain (merchant identity only, no category) | Any country code accepted; Italian hit-rate UNKNOWN | UNKNOWN (Logo API is free; Brand/Transaction API quota-based, 429 on quota) | Sync | FACT API (Context7 Brandfetch docs) — high |

In-house baseline (from `ai-ml-transaction-intelligence.md`, FACT prices): deterministic rules + regex → per-user Bayes/kNN on embeddings → small LLM with JSON schema → frontier model on the residual. Cost per **1,000 transactions**: embeddings $0.001–0.005; Claude Haiku 4.5 sync $0.15–0.25, batch + 1-hour cache $0.08–0.13; GPT-5.4 nano $0.03–0.05; Gemini 3.1 Flash-Lite $0.04–0.06; Mistral Small 4 on the EU endpoint $0.03–0.04. Per-user kNN makes LLM calls decay over time (98 → 15 in three runs in the cited OSS experiment).

### 3.2 Recommendation — **BUILD (core IP); HYBRID only for merchant logos and an optional vendor bake-off**

- **Why:** "personal AI categorisation" is the product promise; vendor taxonomies are SMB/US-flavoured, Italian merchant coverage is unverified everywhere, every price is sales-led, and the per-user learning loop (corrections → kNN/Bayes) is exactly what a vendor cannot own for you. The in-house unit cost is one to two orders of magnitude below any plausible per-transaction vendor fee.
- **Cost (1k / 10k / 100k, 80 tx/user/month = 80k / 800k / 8M tx):** LLM share $5–25 / $50–250 / $500–2,500 per month at Haiku-class pricing with batching and caching, falling as the kNN index matures; vendor alternative UNKNOWN (if priced €0.05–0.30/user/month: €50–300 / €500–3,000 / €5k–30k — HYPOTHESIS).
- **Lock-in:** Low (provider abstraction; open models possible). **Migration path:** keep `category_id, confidence, source_tier, taxonomy_version` per transaction (ai-ml doc design) so vendor or model swaps are a batch relabel.
- **Core IP?** **YES** — taxonomy, Italian merchant dictionary, prompts, evals and the correction loop.
- **Human needed:** NDA + 2k-row Italian bake-off with 2–3 vendors (Salt Edge, Ntropy, Fabrick) to obtain price sheets; no contract for MVP.

---

## 4. Receipt OCR

### 4.1 Vendor facts

| Vendor | Price (public) | Accuracy / fit for Italian "scontrino" | EU data residency | Status / source |
|---|---|---|---|---|
| **Google Document AI** | **Expense parser (formerly receipt parser): $0.10 per document** ($0.09 / $0.08 under 1-/3-year flexible savings plans); Invoice parser $0.10; Enterprise Document OCR **first 1,000 pages free, then $1.50 per 1,000 pages** (to 5M), $0.60 above; Form parser $30/1,000 pages (read today on the live pricing page) | Pre-trained expense model (merchant, total, line items, dates, tax); Italian-language receipts supported (ASSUMPTION, medium) | `eu` multi-region endpoint for Document AI (ASSUMPTION, high; verify cloud.google.com/document-ai/docs/regions) | FACT prices (cloud.google.com/document-ai/pricing, fetched 2026-10-02) — high |
| **Azure AI Document Intelligence** | `prebuilt-receipt` model exists (v3/v4 APIs; hotel receipts in v3.0) — pricing not in the mirrored doc. Recollection: prebuilt models ≈ $10 per 1,000 pages; F0 free 500 pages/month — ASSUMPTION, medium | Receipt fields incl. items, tax, merchant; Italian support (ASSUMPTION, medium) | EU regions (West Europe, North Europe, Italy North for some services) — ASSUMPTION, medium | FACT model exists (raw MicrosoftDocs azure-ai-docs overview.md) — high; price UNKNOWN |
| **AWS Textract** | AnalyzeExpense recollection ≈ $0.10/page (first 1M), DetectDocumentText $1.50/1,000 pages — ASSUMPTION, medium | Expense API returns summary + line items | Availability in **eu-south-1 (Milan) UNKNOWN**; eu-west-1/eu-central-1 yes (ASSUMPTION, high) | SDK `@aws-sdk/client-textract` 3.1145.0 (FACT); prices UNKNOWN today |
| **Mindee** (FR) | **Free trial: 200 credits or 14 days**; Starter and Pro: **minimum 6,000 annual credits, overage €0.044/credit**; Enterprise from 500,000 credits; annual billing −10 %; 1 credit ≈ 1 page (ASSUMPTION). Pro adds "data processing localization" | Receipt extraction model documented | Pro/Enterprise "data processing zones" (EU) — FACT that the option exists; default zone UNKNOWN | FACT (Context7 /websites/mindee account-management/plans.md) — medium-high; npm `mindee` 5.10.0 (2026-09-23) |
| **Veryfi** (US) | UNKNOWN (docs mirror has no pricing; recollection: enterprise tiers from several hundred $/month — ASSUMPTION, low) | Receipts/invoices with line items; strong US focus | EU residency UNKNOWN | `@veryfi/veryfi-sdk` 1.5.2 (2026-09-21), PyPI `veryfi` 5.1.0 — FACT versions only |
| **Taggun** | UNKNOWN (no PyPI package; site blocked) | Receipt-specialised | UNKNOWN | UNKNOWN — verify taggun.io/pricing |
| **LLM vision** (Claude, Gemini, GPT) | Token-priced: a phone photo ≈ 1,500–2,500 input tokens + ~300 output. Claude Haiku 4.5 ($1 / $5 per MTok) ≈ **$0.003–0.005 per receipt**; Sonnet 5.5 ($2 / $10) ≈ $0.006–0.01; Gemini 3.1 Flash-Lite ≈ $0.001; batch −50 % | Structured output (JSON schema) gives merchant, date, total, VAT, line items; handles Italian text and the "scontrino" layout natively; accuracy on faded thermal paper UNKNOWN (needs eval set) | Anthropic: no EU inference option (`inference_geo` only `global`/`us`); OpenAI: EU regional processing (+10 %); Mistral EU endpoint (vision models: UNKNOWN) — see §18 | FACT prices (platform.claude.com pricing; ai-ml doc) — high |

### 4.2 Recommendation — **HYBRID: LLM vision first, Document AI as benchmark/fallback**

- **Why:** at Lilleri's volumes the LLM path is 20–30× cheaper than $0.10/document, gives Italian-aware structured output in one call, and reuses the AI abstraction already required for categorisation. Keep Google Expense parser wired as a second provider to measure accuracy and to handle low-confidence or long receipts.
- **Cost (1k / 10k / 100k receipts/month):** LLM $5–15 / $50–150 / $500–1,500; Document AI $100 / $1,000 / $10,000; Mindee €44 / €440 / €4,400 (with the 6,000-credit annual minimum ≈ €264/yr floor).
- **Lock-in:** Low (image in, JSON out). **Migration:** provider interface + golden set of 300 Italian receipts for regression.
- **Core IP?** Partly — the scontrino-specific post-processing (fiscal fields, "RT" receipt codes, VAT splits) and the matching to bank transactions.
- **Human needed:** none for LLM path; Google Cloud billing account; Mindee contract only if chosen.

---

## 5. Product analytics

| Vendor | Pricing (public) | Privacy / EU | Mobile fit | Status / source |
|---|---|---|---|---|
| **PostHog Cloud EU** | Product + web analytics: **first 1M events/month free, then $0.00005/event** with volume discounts; session replay 5k free (≈$0.005/recording; "5,000 web + 2,500 mobile" in the GDPR comparison page); feature flags **1M requests free, then $0.0001/request**; surveys 1,500 free; error tracking 100k free; no per-seat fees; billing limits | **EU Cloud hosted in Frankfurt** (`eu.i.posthog.com`); GDPR doc recommends EU Cloud; autocapture controls, PII masking, `before_send`; self-host is MIT, Docker Compose "hobby", **officially unsupported, no tagged releases, no CVEs** | `posthog-react-native` 4.78.4 (2026-10-02), replay opt-in; `posthog-node` 5.55.0 | FACT (raw posthog.com docs: `start-here.mdx`, compare pages, `gdpr-compliance.mdx`, `self-host/index.mdx`) — high |
| **Mixpanel** | **Free: 1M events/month** (access limited above, no overage); **Growth: first 1M events free with a card**, then à-la-carte per-event rate (number UNKNOWN); Enterprise custom | **EU residency: `api-eu.mixpanel.com`** (host setting on all SDKs) | RN SDK exists; `mixpanel` node 0.24.0 | FACT (Context7 /mixpanel/docs pricing.mdx, SDK pages) — high |
| **Amplitude** | **Free plan: up to 10,000 MTU** (core analytics, flags, replay); Plus/Growth prices UNKNOWN | **EU data residency** via `serverZone: "EU"` / `api.eu.amplitude.com` | `@amplitude/analytics-node` 1.5.76; RN SDK exists | FACT (Context7 /websites/amplitude stripe-projects + SDK pages) — high |
| **Plausible** (EE) | Tiers by pageviews; Starter / Growth / Business / Enterprise; 30-day free trial; prices on website only (recollection: from €9/mo for 10k pageviews — ASSUMPTION, medium); never charged for a single-month spike | EU company, EU hosting (ASSUMPTION, high); cookieless | **Web only** (landing site) | FACT plan structure (raw plausible/docs `subscription-plans.md`) — high |
| **Umami** (OSS, MIT) | Self-host free; **v3.4.0** on master; Cloud pricing UNKNOWN (recollection: Hobby free ~100k events — ASSUMPTION, low) | Self-host anywhere; cookieless | **Web only** | FACT (raw umami package.json, LICENSE) — high |

**Recommendation — BUY PostHog Cloud EU (free tier) for app analytics; Plausible or Umami for the marketing site.** Cost (1k / 10k / 100k users at 100 events/MAU): $0 / $0 / ≈ $450 (9M billable events × $0.00005, before discounts); add replay only on sampled sessions. Lock-in low–medium (event schema is yours; export via API/warehouse). Migration: wrap analytics in an internal `track()` with a typed event catalogue so Mixpanel/Amplitude EU are drop-ins. Core IP: no. **Consent note:** Garante cookie guidelines (regulatory doc §7) — analytics without consent only if anonymised; in-app analytics needs an opt-in or legitimate-interest assessment in the DPIA.

---

## 6. Subscription billing and paywalls

| Vendor | Pricing (public) | EU VAT handling | Apple/Google compliance | Paywall A/B | Status / source |
|---|---|---|---|---|---|
| **RevenueCat** | **Free under $2,500 monthly tracked revenue (MTR); Pro: 1 % of MTR above** (grace period 30 days in first month; unpaid → paywalls/experiments/charts restricted) | N/A (stores remit VAT for IAP); web billing via Stripe | Wraps StoreKit 2 / Play Billing; receipts validation; `react-native-purchases` **10.11.0** (2026-10-01) | Paywalls + Experiments included (restricted if over free tier and unpaid) | FACT (Context7 /websites/revenuecat account-management, stripe-projects-quickstart) — high |
| **Adapty** | Price UNKNOWN here (recollection: free to ~$10k MTR then ~0.99 % — ASSUMPTION, low) | N/A | SDK `react-native-adapty` 4.2.1 (2026-09-30) | Paywall builder, A/B tests, "flows" | FACT SDK + features (Context7 adapty-docs) — medium; price UNKNOWN |
| **Qonversion** | UNKNOWN | N/A | `@qonversion/react-native-sdk` 10.12.0 | Yes | npm FACT; price UNKNOWN |
| **Superwall** | **Infrastructure free at any scale**; charges a **percentage of revenue attributed to a Superwall-rendered paywall (MAR)** only; percentage not captured → UNKNOWN; legacy conversion-based pricing retired | N/A | `@superwall/react-native-superwall` 2.1.7; Expo SDK exists | Core product: remote paywalls + experiments | FACT model (Context7 /websites/superwall) — high; rate UNKNOWN |
| **Stripe Billing + Stripe Tax** (web) | Stripe Tax charges per *calculated* live transaction where registered, with subscription / pay-as-you-go / custom plans (percentages not captured; recollection 0.5 % of volume on pay-as-you-go, Billing 0.7 % — ASSUMPTION, medium); no fee on zero-amount, drafts, trials | Stripe Tax calculates and (with Tax registrations) reports VAT; Lilleri remains merchant (OSS-VAT registration needed) | Web only; in-app digital subscriptions must use IAP (store rules; EU DMA alternatives exist but specifics UNKNOWN as of 2026-10) | — | FACT scope (Context7 docs.stripe.com/tax/how-tax-works) — medium; `stripe` 23.0.0 (2026-10-01) |
| **Paddle** (MoR) | Fee not captured (recollection 5 % + $0.50 — ASSUMPTION, medium) | **Paddle is merchant of record**: handles VAT, PCI, chargebacks, buyer billing support | Web only | — | FACT MoR (Context7 developer.paddle.com) — high; `@paddle/paddle-node-sdk` 3.10.0 |
| **Lemon Squeezy** (MoR; Stripe-owned since 2024 — ASSUMPTION, high) | Platform fee not captured (recollection 5 % + $0.50 — ASSUMPTION); affiliate orders +3 % (FACT) | MoR collects/remits VAT | Web only | — | FACT MoR + affiliate fee (Context7 docs.lemonsqueezy.com); JS SDK last published **2024-11-05** (stale) |

**Recommendation — BUY: RevenueCat for IAP (free until traction) now; Stripe Billing + Stripe Tax for web later; skip MoR unless selling web-only.** Cost (MTR €250 / €2.5k / €25k): RevenueCat $0 / $0–25 / ~$250; store commission 15 % (Small Business Programme / Play 15 % first $1M — ASSUMPTION, high) = €37 / €375 / €3,750 — the store fee dwarfs tooling. Lock-in medium (entitlements and receipts live in RevenueCat; export exists). Migration: keep your own `entitlements` table fed by webhooks. Core IP: no. Paywall A/B: start with RevenueCat Paywalls/Experiments; Superwall only if paywall optimisation becomes the growth lever (its fee scales with attributed revenue). Human needed: App Store Connect agreements (Paid Apps), Google Play payments profile, Stripe KYC, Italian VAT (OSS) registration when selling on web.

---

## 7. Notifications (push) and transactional email

### 7.1 Push

| Vendor | Pricing | EU | Status / source |
|---|---|---|---|
| **Expo Push service** | No public price; widely free (ASSUMPTION, high); limits in docs: **600 notifications/s per project**, 100 messages per request, `MessageRateExceeded` backoff; `expo-notifications` 57.0.21 | Routed via Expo (US) to FCM/APNs; payload content should be minimal (HYPOTHESIS: send "you have new insights", not amounts) | FACT limits (raw expo docs `sending-notifications.mdx`) — high |
| **Firebase Cloud Messaging / APNs** | Free (ASSUMPTION, high) | Google/Apple infrastructure; unavoidable transport | — |
| **OneSignal** | **Free plan: 1,000 MAU for mobile push + in-app (new customers from 2026-09-01, existing from 2026-10-01)**; Growth price UNKNOWN | EU data-centre option exists (ASSUMPTION, medium) | FACT (Context7 documentation.onesignal.com billing-faq) — high; `react-native-onesignal` 5.5.14 |
| **Knock** | Developer (free), Starter, Enterprise; numbers UNKNOWN (recollection: 10k notifications/mo free — ASSUMPTION, low) | EU region (ASSUMPTION, medium) | FACT plan names (Context7 docs.knock.app) — medium; `@knocklabs/node` 1.36.0 |
| **Courier** | **Developer free up to 10,000 sends/month; Business $0.005/send; Enterprise custom** | **EU region eu-west-1 (Ireland), by arrangement; new workspaces cannot be created in EU** | FACT (Context7 courier docs overview + security) — high |
| **Novu** (OSS) | **Cloud: Free 10,000 workflow runs/month; Pro $30 (30k+ runs); Team $250 (250k+); Enterprise**; self-host OSS at no licence cost; API package `3.19.2` | **EU region `eu.api.novu.co`** (US/EU for all; UK/SG/AU/JP/KR enterprise) | FACT (Context7 docs.novu.co billing + security) — high; legacy `@novu/node` 2.6.6 last 2025-12 (use `@novu/api`) |

### 7.2 Transactional email

| Vendor | Pricing | EU | Status / source |
|---|---|---|---|
| **Resend** | **Free $0: 3,000 emails/mo (100/day); Pro $20: 50,000; Pro $35: 100,000; Scale $90–$1,150 (100k–2.5M); overage $0.46–0.90 per 1,000** | Domain `region` option **`eu-west-1`** (sending region) | FACT (Context7 resend docs what-is-resend-pricing + create-domain) — high; `resend` 6.32.0 |
| **Postmark** (ActiveCampaign) | UNKNOWN (recollection: from $15/mo for 10k; 100 free test emails — ASSUMPTION, medium) | No EU residency option known (ASSUMPTION, medium) | `postmark` 5.1.0 (2026-07) — FACT version |
| **Amazon SES** | Recollection $0.10 per 1,000 emails + attachments — ASSUMPTION, high; region eu-south-1 (Milan) availability UNKNOWN; eu-west-1/eu-central-1 yes | AWS EU regions | `@aws-sdk/client-ses` 3.1145.0 |
| **Brevo** (FR) | Recollection: free 300 emails/day; Starter from ~€9/mo — ASSUMPTION, medium | EU company, EU hosting (ASSUMPTION, high) | `@getbrevo/brevo` 6.0.3 |
| **Mailjet** (FR, Sinch) | Recollection: free 6,000/mo, 200/day — ASSUMPTION, medium | EU hosting (ASSUMPTION, high) | `node-mailjet` 6.0.11 |

**Recommendation — BUY free tiers: Expo Push (transport) + Resend EU region (email) — or Brevo if an EU-domiciled processor is preferred; no orchestration layer at MVP.** Build a tiny `notifications` table + worker (preferences, quiet hours, digests) instead of Knock/Courier/Novu until multi-channel orchestration is needed; Novu self-host or Cloud EU is the upgrade path. Cost (4 emails/user/mo → 4k / 40k / 400k; push free): $0–20 / $20 / $90–350. Lock-in low. Core IP: no.

---

## 8. Customer support

| Vendor | Pricing | EU | Status / source |
|---|---|---|---|
| **Intercom** | UNKNOWN (recollection: Essential ~$29/seat/mo; Fin AI ~$0.99/resolution — ASSUMPTION, medium) | **Workspaces hosted in US, EU or AU; EU endpoints `app.eu.intercom.com`, `api.eu.intercom.com`** | FACT regions (Context7 developers.intercom.com) — high; `@intercom/intercom-react-native` 10.7.1 |
| **Crisp** (FR) | Plan names Free / Mini / Essentials / Plus; RTM event shows a "Plus" plan with `price: 295` (unit unclear; UNKNOWN) | French company; GDPR practices documented; hosting EU (ASSUMPTION, high) | FACT plan names (Context7 docs.crisp.chat) — medium; `crisp-sdk-web` 1.2.1 |
| **Zendesk** | UNKNOWN (recollection: Support Team ~$19/agent, Suite Team ~$55/agent — ASSUMPTION, medium) | EU data locality add-on (ASSUMPTION, medium) | — |
| **Help Scout** | UNKNOWN (recollection: Free plan for small teams; Standard ~$50/mo — ASSUMPTION, low) | US hosting (ASSUMPTION) | — |
| **Chatwoot** (OSS) | **MIT core; `enterprise/` directory under separate licence**; current release **v4.18.0** (Docker tag 2026-09-18); Cloud pricing UNKNOWN (recollection: Hacker ~$19/agent — ASSUMPTION, low) | Self-host in EU | FACT (raw chatwoot LICENSE, package.json; Docker Hub tags) — high |
| **Plain** | UNKNOWN (site blocked) | UNKNOWN | — |

**Recommendation — BUY cheap/self-host: email + in-app "contact us" at 1k users; Crisp (EU) or Chatwoot CE self-hosted from ~10k users.** Cost: $0–25 / $25–100 / $100–600 (2 % contact rate = 20 / 200 / 2,000 conversations per month; 1–3 agents). Lock-in low. Core IP: no. Note: support agents will see financial data — restrict PII in tickets; prefer EU-hosted workspace (Intercom EU, Crisp, Chatwoot).

---

## 9. Feature flags

| Option | Pricing | EU | Status / source |
|---|---|---|---|
| **OpenFeature** (CNCF spec) + **DB flags** | Free; `@openfeature/server-sdk` 1.23.0 (2026-07-28) | Your DB | FACT (npm; raw open-feature/spec README) — high |
| **PostHog flags** | **1M flag requests/month free, then $0.0001/request** | EU Cloud | FACT (§5) — high |
| **LaunchDarkly** | UNKNOWN (mirror has no pricing; recollection: Developer free tier, Foundation per service connection — ASSUMPTION, low) | EU instance exists (ASSUMPTION, medium) | — |
| **Unleash** (OSS) | **AGPL-3.0** server; `package.json` version **8.2.0**; Docker `latest` 2026-09-08; SaaS prices UNKNOWN (recollection Pro ~$80/mo — ASSUMPTION, low) | EU-hosted SaaS option (ASSUMPTION, medium); self-host | FACT (raw Unleash LICENSE, package.json; Docker Hub) — high; `unleash-client` 6.12.2 |
| **Flagsmith** (OSS) | **Self-hosted OSS has no request limits; SaaS limits per plan** (numbers UNKNOWN); `version.txt` **2.279.0**; **core API hosted in the EU**, Edge API replicated across 8 AWS regions | EU | FACT (Context7 docs.flagsmith.com; raw version.txt) — high; `flagsmith-nodejs` 8.1.2 |

**Recommendation — BUILD: a `feature_flags` table (key, rule JSON, rollout %) evaluated behind the OpenFeature API, cached in Redis, exposed to the app on session start; add PostHog's OpenFeature provider when experiments are needed.** Cost $0 / $0 / $0–200 (100k users × ~30 sessions = 3M PostHog requests if you move there; keep bootstrap-on-login to stay under 1M). Lock-in low (OpenFeature). Core IP: no.

---

## 10. Observability

| Vendor | Pricing (public) | EU | Status / source |
|---|---|---|---|
| **Sentry** | Paid plans include **50k errors, 5 GB logs, 5 GB metrics, 5M spans, 50 replays, 1 uptime + 1 cron monitor, 1 GB attachments**; PAYG per error from $0.0003625 (Team) / $0.0011125 (Business) at 50–100k, down to $0.00015 / $0.0003 at 500k–10M; logs $0.50/GB; spans $0.000002; replays $0.00375; cron monitor $0.78, uptime $1.00; Seer $40/active contributor. Developer plan free (5k errors — ASSUMPTION, medium); Team ≈ $26/mo (ASSUMPTION, medium) | **Data storage location US or EU (Frankfurt) chosen at org creation, immutable**; account/org metadata stays in US (tech-stack doc S30) | FACT (raw getsentry/sentry-docs `pricing/index.mdx`, `data-storage-location`) — high; `@sentry/react-native` 8.29.0 (Expo 57 bundles ~7.11) |
| **Grafana Cloud** | Free tier: **metrics retention 14 days (Free) vs 13 months (Pro); logs/traces/profiles 14 days Free, 30 days Pro** (FACT); 10k series / 50 GB logs / 50 GB traces / 50 GB profiles (ASSUMPTION, medium); Pro from $19/mo (ASSUMPTION) | EU regions selectable at stack creation (ASSUMPTION, high) | FACT retention (Context7 grafana-cloud features) — high |
| **Better Stack** | **Metrics: $0.50/GB/month in EU ($0.75 US, $1.75 SG), 30 GB free/month** (2026 billing model); logs/uptime prices UNKNOWN | **EU region exists (Germany)** — FACT by pricing table | FACT (Context7 betterstack.com/docs/logs/billing-for-metrics) — high |
| **Datadog** | UNKNOWN today (recollection: Infra $15/host, APM $31/host, logs $0.10/GB ingest + $1.70/M events indexed — ASSUMPTION, medium) | EU site `datadoghq.eu` (ASSUMPTION, high) | — |
| **Highlight.io** | `@highlight-run/node` 3.12.22 last published 2026-07-17; Highlight joined LaunchDarkly (ASSUMPTION, medium) → roadmap risk | UNKNOWN | npm FACT |
| **OpenObserve** (OSS) | **AGPL-3.0**; Docker **v1.1.0-rc1 (2026-09-30)** while `Cargo.toml` on main says 0.93.0 — **conflict**, treat Docker tag as current; Cloud pricing UNKNOWN | self-host; cloud EU UNKNOWN | FACT (raw LICENSE, Cargo.toml; Docker Hub) — medium |
| **SigNoz** (OSS) | **MIT core + `ee/` enterprise directory**; Docker `latest` 2026-09-29; Cloud pricing UNKNOWN (recollection $49/mo base — ASSUMPTION, low) | self-host; cloud EU region exists (ASSUMPTION, medium) | FACT (raw LICENSE; Docker Hub) — high |
| **HyperDX** (ClickHouse) | `@hyperdx/node-opentelemetry` 0.11.0 (2026-05) | — | npm FACT |
| **OpenTelemetry JS** | `@opentelemetry/sdk-node` 0.222.0 (2026-09-21); traces + metrics stable, logs "Development" (tech-stack doc S29) | — | FACT |

**Recommendation — BUY free tiers behind OpenTelemetry: Sentry EU (errors + mobile crash) + Grafana Cloud Free EU (metrics/logs/traces via OTLP) + Pino.** Self-host SigNoz or OpenObserve only when Grafana Free limits bite (expect at 10k–100k users). Cost: $0 / $26–60 / $100–400. Lock-in low (OTLP everywhere; Sentry SDK is the only proprietary surface). Core IP: no. Doubt: Sentry's immutable region choice — create the org as EU on day one.

---

## 11. Secrets / KMS and database backups

| Option | Facts | Status / source |
|---|---|---|
| **sops + age** | Encrypted secrets in Git; keys per environment; zero cost; no runtime service. (`sops` npm 0.0.3 is unrelated; use the Go binary.) | ASSUMPTION, high (well-known tooling) |
| **Infisical** | **MIT core + `ee/`**; `@infisical/sdk` 5.0.2 (2026-04-23); Cloud free/Pro prices UNKNOWN; EU cloud region (`eu.infisical.com`) ASSUMPTION, medium | FACT licence/SDK (raw LICENSE; npm) — high |
| **Doppler** | Prices UNKNOWN (recollection: Developer free, Team per-user — ASSUMPTION, low); US company; EU residency UNKNOWN | — |
| **HashiCorp Vault / OpenBao** | Vault is BSL 1.1 since 2023 and HashiCorp is now IBM (ASSUMPTION, high); **OpenBao LICENSE: MPL-2.0 (HashiCorp copyright, community fork)**; `node-vault` 0.12.0 | FACT OpenBao licence (raw) — high |
| **AWS KMS** | Recollection $1/key/month + $0.03 per 10k requests — ASSUMPTION, high; usable from Hetzner via IAM keys; `@aws-sdk/client-kms` 3.1145.0 | — |
| **Hetzner** | No KMS/secrets product (ASSUMPTION, high) → sops/age or cloud KMS | — |
| **pgBackRest** | `src/version.h` on main = **2.60.0 "dev"** → latest tagged release 2.59.x (ASSUMPTION); MIT (ASSUMPTION, high); S3-compatible repos (R2/Hetzner/Scaleway) supported | FACT version indicator (raw) — medium |
| **WAL-G** | Apache-2.0 (ASSUMPTION, high); version UNKNOWN today (README has no version) | — |
| **Managed PITR** | Supabase PITR add-on (price UNKNOWN; recollection ~$100/mo), Neon includes history retention per plan (tech-stack doc) | ASSUMPTION |

**Recommendation — BUILD with OSS: sops+age for config secrets (CI via GitHub Environments), pgBackRest full+WAL to an EU S3 bucket with a weekly restore drill; envelope-encrypt consent documents and tokens with a KMS-held root key (AWS KMS eu-central-1 or OpenBao self-host) when the agent/partner contract requires it.** Cost $0–5 / $5–10 / $10–30. Lock-in low. Core IP: no. Human needed: AWS account if KMS chosen.

---

## 12. Document / consent storage (S3-compatible, EU)

| Vendor | Price (public) | EU control | Status / source |
|---|---|---|---|
| **Cloudflare R2** | **Standard: $0.015/GB-month; Class A $4.50/M; Class B $0.36/M; egress free; free tier 10 GB-month, 1M Class A, 10M Class B per month**; Infrequent Access $0.01/GB + $0.01/GB retrieval, 30-day minimum | **Jurisdictional Restrictions** guarantee storage/processing within a jurisdiction (GDPR cited); location hints `weur`/`eeur`; set at bucket creation | FACT (raw cloudflare-docs `r2/pricing.mdx`, `reference/data-location.mdx`) — high. Doubt: US company (CLOUD Act). |
| **Hetzner Object Storage** (DE) | Recollection: ~€5/month base including 1 TB storage + 1 TB egress, then ~€5/TB — ASSUMPTION, low-medium (tech-stack doc also "≈ €5/TB") | EU-owned, DE/FI locations | ASSUMPTION — verify hetzner.com/storage/object-storage |
| **Scaleway Object Storage** (FR) | **Free trial: 750 GB for 90 days** (FACT); regular prices not in docs (recollection ≈ €0.015/GB-month Multi-AZ, 75 GB egress free then ~€0.01/GB — ASSUMPTION, medium); unauthorised Chia farming billed €0.08/GB (FACT) | EU-owned; fr-par / nl-ams / pl-waw | FACT trial (raw scaleway docs-content object-storage/faq.mdx) — high |
| **AWS S3 eu-south-1 (Milan)** | Recollection ≈ $0.0245/GB-month, egress $0.09/GB — ASSUMPTION, medium | Italy region | — |

**Recommendation — BUY commodity: R2 with `eu` jurisdiction (free tier covers MVP; zero egress) or Hetzner Object Storage if EU ownership is prioritised; S3 API either way.** Volume: 1 MB/receipt → 12 GB / 120 GB / 1.2 TB per year → $0 / ~$2 / ~$18 per month on R2 after year one. Lock-in low (S3 API; rclone migration). Core IP: no.

---

## 13. Bank and merchant logos

| Source | Facts | Licensing | Status / source |
|---|---|---|---|
| **Brandfetch Logo API** | **Free up to 500,000 requests/month, no attribution link required**; enterprise packages add caching rules/SLA; Brand API and **Transaction API** (merchant from transaction label) are quota-based with 429 on exhaustion; prices UNKNOWN | Free tier terms; check caching rules before storing logos | FACT (Context7 docs.brandfetch.com Clearbit-migration page, Transaction API spec) — high |
| **Logo.dev** | **Free tier requires an attribution link** ("Logos provided by Logo.dev"); **paid plans from $300/year** remove it | Attribution on free | FACT (Context7 logo-dev docs migrations/clearbit.mdx, platform/attribution) — high |
| **Clearbit Logo API** | Both Brandfetch and Logo.dev publish "migrate from Clearbit" guides → Clearbit's free logo API is being retired (HubSpot-owned); sunset date UNKNOWN | — | FACT migrations exist — high; status medium |
| **Tink Merchant Information** | Brand name, logo, location, contact as part of enrichment | Tink contract | FACT (doc A) |
| **Provider institution lists** | Salt Edge `providers` and Yapily `institutions` return bank logos/media; TrueLayer/Tink Link render provider logos in their UIs | Use typically limited to your integration; redistribution terms UNKNOWN — ask in RFP | ASSUMPTION, medium |
| **Own curated set** | Italian banks/fintechs (Intesa, UniCredit, Poste, Fineco, Hype, Revolut, N26, Satispay…) are a few dozen SVGs — trademark use for identification is generally tolerated (HYPOTHESIS; counsel) | — | — |

**Recommendation — BUY free tier + cache: Brandfetch Logo API keyed by merchant domain (output of §3), cached in R2 with a 30-day refresh; bank logos from the aggregation provider's institution list, with a curated fallback.** Cost $0 at all tiers (cache keeps requests ≪ 500k). Lock-in low. Core IP: no (the merchant → domain mapping is part of §3 IP).

---

## 14. FX rates

| Source | Facts | Status / source |
|---|---|---|
| **ECB euro reference rates** | Published daily ~16:00 CET as XML/CSV and via the ECB Data Portal API; free, no key (ASSUMPTION, high — ecb.europa.eu blocked today) | ASSUMPTION |
| **Frankfurter** | Open-source API tracking central-bank rates; public `https://api.frankfurter.dev` (v2: `/v2/coverage`, `/v2/currencies`, providers incl. BIS); **self-host with `docker run lineofflight/frankfurter`**, SQLite, optional free provider keys | FACT (raw hakanensari/frankfurter README) — high |
| **Open Exchange Rates** | **Free plan: 1,000 requests/month, hourly updates**, features base/symbols/convert (from the documented `usage.json` example); paid plans UNKNOWN (recollection Developer ~$12/mo — ASSUMPTION, low) | FACT free plan (Context7 docs.openexchangerates.org) — high |

**Recommendation — BUILD trivially: nightly job pulls ECB rates (or runs Frankfurter in Docker) into an `fx_rates` table; EUR-base is all an Italian PFM needs; add Frankfurter's BIS providers for non-ECB currencies.** Cost $0. No contract. Core IP: no.

---

## 15. Address / geo

Not needed for the MVP: transactions carry merchant location only when a provider enriches it; the app has no delivery or KYC-address flow. If merchant maps are added later: OpenStreetMap/Nominatim (free, usage policy; self-host Photon) or Google Places (paid). Recommendation: **defer**; cost $0.

---

## 16. Legal and compliance tooling

| Item | Facts | Status / source |
|---|---|---|
| **iubenda** (Milan) | Privacy/cookie policy generator, cookie solution, consent database, terms generator; Italian-law templates; prices UNKNOWN today (recollection: per-site plans from ~€4–30/month — ASSUMPTION, low; site blocked) | ASSUMPTION — verify iubenda.com/en/pricing |
| **Termly** | Prices UNKNOWN (recollection: Basic free, Pro+ ~$15/month — ASSUMPTION, low) | ASSUMPTION |
| **Consent rules** | Garante cookie guidelines (10 June 2021): no pre-ticked boxes, scrolling ≠ consent, no cookie walls, no re-prompt within 6 months, analytics without consent only if anonymised; PSD2 Art. 94(2) "explicit consent" is contractual (EDPB 06/2020) | FACT (regulatory doc §7, §4) — high |
| **DPO** | WP243: likely mandatory at scale (regular, systematic, large-scale monitoring); regulatory doc advises external DPO from launch; **DPIA mandatory before beta** | FACT (regulatory doc §6.4) — high |
| **DPO-as-a-service cost in Italy** | UNKNOWN today; typical startup retainers €1,500–7,000/year (ASSUMPTION, low) | Verify with 2–3 Italian privacy firms |
| **Other CMPs** | Usercentrics, Cookiebot, Didomi (FR) — prices UNKNOWN | — |

**Recommendation — BUY: iubenda (Italian-law templates, consent records) for policies and the web cookie banner; in-app consent screens are custom (they are part of the PSD2/GDPR consent-management surface, not a CMP job); contract an external DPO before beta.** Cost €10–40 / €20–60 / €60–200 per month for tooling + DPO €150–600/month. Lock-in low. Core IP: no. Human needed: DPO contract, DPIA sign-off.

---

## 17. App distribution

| Item | Facts | Status / source |
|---|---|---|
| **Apple Developer Program** | **$99 annual membership** (TestFlight, distribution, analytics); free account for Xcode betas only | FACT (developer.apple.com/programs, fetched 2026-10-02) — high. Organisation enrolment needs a D-U-N-S number and legal entity (ASSUMPTION, high). |
| **Google Play Console** | $25 one-time registration fee (ASSUMPTION, high; support page blocked); organisation verification + D-U-N-S for business accounts (ASSUMPTION, medium) | ASSUMPTION |
| **EAS Build / Update / Submit** | **Free plan: limited low-priority builds, resets monthly, no overages; EAS Update 1,000 MAU**. **Starter $19/month: $45 build credit + 3,000 Update MAU + 100 GiB**. **Production plan: 50,000 Update MAU + 1 TiB** (price not in docs; ≈ $99/month ASSUMPTION, medium). Build prices: **Android medium $1, large $2; iOS medium $2, large $4**; Update overage **$0.005/user, $0.10/GiB**; extra concurrencies purchasable; priced the same worldwide pre-tax; `eas-cli` 24.8.0 (2026-09-24) | FACT (raw expo docs `billing/plans.mdx`, `usage-based-pricing.mdx`, `faq.mdx`) — high. Free-plan build count not stated in docs read (recollection 30/month — ASSUMPTION). |
| **Fastlane** | OSS, free; local builds + `eas build --local` avoid build fees | ASSUMPTION, high |
| **TestFlight / Play internal testing** | Included in the developer programmes | ASSUMPTION, high |

**Recommendation — BUY (mandatory): both store programmes; EAS Free during development, Starter at beta, Production at launch (or local/Fastlane builds in GitHub Actions on macOS runners if build spend exceeds ~$100/month).** Cost: $8–30 / $30–110 / $110–200 per month. Lock-in medium (EAS Update protocol; replaceable by self-hosted expo-updates server). Core IP: no. Human needed: both programme enrolments (legal entity, D-U-N-S, payment), Expo plan.

---

## 18. AI vendors summary

| Vendor / model | Price per MTok (input / output) | Cache / batch | EU residency | Zero retention | Status / source |
|---|---|---|---|---|---|
| **Anthropic — Claude Opus 5.5 `claude-opus-5-5`** | **$4 / $20**; cache read 0.05× ($0.20); fast mode $8 / $40 | 5-min write 1.25×, 1-h write 2×; **Batch −50 %**; 1M context, 128k output | **No EU option**: `inference_geo` is `"global"` (default) or `"us"` (+1.1× price); workspace geo controls at-rest storage (verify EU availability in Console) | ZDR per organisation via sales; Fable 5.1/5 and Mythos **require 30-day retention** (not ZDR-eligible unless authorised) | FACT (platform.claude.com pricing + data-residency + api-and-data-retention, fetched 2026-10-02; claude-api skill cache 2026-09-25) — high |
| **Claude Sonnet 5.5** | **$2 / $10**; cache read $0.20 | same | same | same | FACT — high |
| **Claude Haiku 4.5** | **$1 / $5**; cache read $0.10 (5-m write $1.25, 1-h $2) | Batch $0.50 / $2.50 | `inference_geo` returns 400 (pre-4.6 model) | ZDR eligible via sales | FACT — high |
| **Claude Fable 5.1** | $10 / $50; cache read 0.025× | thinking always on; no forced tool_choice | as above | **not ZDR-eligible** | FACT — high (overkill for PFM workloads) |
| **OpenAI — GPT-5.4 nano / mini** | **$0.20 / $1.25** and **$0.75 / $4.50**; cached input $0.02 / $0.075 | Batch −50 %, 24 h | **EU regional processing exists (EEA + CH) with a 10 % uplift** for models released after 2026-03-05 | ZDR for eligible API customers (ASSUMPTION, medium) | FACT prices (ai-ml doc, Context7 snapshot of developers.openai.com) — medium |
| **Google — Gemini 3.1 Flash-Lite / 2.5 Flash** | **$0.25 / $1.50** and $0.30 / $2.50 | Batch/Flex −50 %; context cache $0.025/M + storage | Gemini API: no residency statement; **EU endpoints via Vertex AI only** (ASSUMPTION) | Vertex: no training on customer data (ASSUMPTION) | FACT prices (ai-ml doc, Context7 ai.google.dev) — medium |
| **Mistral — Small 4 (`mistral-small-2603`, Apache-2.0 weights)** | **$0.15 / $0.60** | Batch −50 % | **Yes: `api.eu.mistral.ai`, EU/EFTA data centres** | ZDR option (ASSUMPTION, medium) | FACT (ai-ml doc, Context7 Mistral docs) — medium |
| **Groq / Together (open models)** | UNKNOWN today (recollection: Llama-3.x-70B-class ≈ $0.6–0.9 blended — ASSUMPTION, low) | — | Groq: EU region UNKNOWN; Together: US (ASSUMPTION) | UNKNOWN | UNKNOWN — verify groq.com/pricing, together.ai/pricing |
| **Self-hosted (Qwen3-8B / Ministral) on Hetzner GPU** | compute only; $0.01–0.03 per 1k classifications at good utilisation (ai-ml doc) | — | EU by construction | by construction | ASSUMPTION |

SDK versions (npm, 2026-10-01/02): `@anthropic-ai/sdk` 0.131.0, `openai` 7.27.0, `@google/genai` 2.26.0, `@mistralai/mistralai` 2.7.0, `groq-sdk` 1.6.0, `together-ai` 0.57.0 — FACT.

**Recommendation — BUY through Lilleri's provider abstraction: Claude Haiku 4.5 (classification, batch + prompt cache) and Sonnet 5.5 (insights/chat, adaptive thinking at low effort) as primary; Mistral EU endpoint as the EU-resident route for any pipeline that must not leave the EU; OpenAI EU region as second fallback. Pseudonymise before any remote call (Spendif pattern: redact names/IBANs, restore after).** Cost (categorisation + ~20 insight calls/user/month at ~3k tokens): $20–100 / $200–1,000 / $2,000–8,000 per month; batch + caching roughly halves it. Lock-in low (abstraction; eval set). Core IP: prompts, taxonomy, evals, routing policy. Human needed: DPA + ZDR request with Anthropic/OpenAI sales (ZDR is per organisation), transfer-impact assessment for US inference (regulatory doc P0 item 3).

---

## 19. Items that require a human to sign a contract or pay

| # | Item | Why a human | When |
|---|---|---|---|
| 1 | Open-banking provider agreement (agent or partner programme) + KYC/AML onboarding; possible OAM agent registration (€160) | Regulated relationship; identity and beneficial-owner checks | Before any live bank data |
| 2 | Apple Developer Program ($99/yr) — legal entity + D-U-N-S; Google Play Console ($25) | Store contracts, payment profiles, Paid Apps agreement | Before TestFlight / internal testing |
| 3 | Expo EAS plan (Starter $19/mo → Production) | Card on file | At beta |
| 4 | Anthropic / OpenAI / Mistral: API billing, DPA, ZDR enablement (sales), transfer-impact assessment | ZDR is per-organisation and sales-gated | Before processing real transactions |
| 5 | External DPO contract; DPIA sign-off; privacy counsel for agent/PSD2 positioning | Legal accountability | Before beta |
| 6 | iubenda (or Termly) subscription | Card | Before public landing page |
| 7 | Cloud accounts with cards: Hetzner (servers + Object Storage), Cloudflare (R2, DNS), optional AWS (KMS/SES) | Payment method; EU-residency bucket settings are irreversible on Sentry/R2-jurisdiction | Day one |
| 8 | Sentry org (EU region, immutable), PostHog EU org, Grafana Cloud stack (EU) | Region choice locked at creation | Day one |
| 9 | RevenueCat (card only above $2.5k MTR); Stripe account (KYC) + Stripe Tax; Italian VAT/OSS registration for web sales | KYC and tax registrations | Web billing / after traction |
| 10 | Resend or Brevo paid tier; Courier EU region "by arrangement" if chosen | Card / sales | ~10k users |
| 11 | Enrichment vendor NDA + bake-off (Salt Edge, Ntropy, Fabrick); Mindee annual minimum (6,000 credits) if OCR vendor chosen | NDA/contract | Optional, post-MVP |
| 12 | Support tool (Crisp/Intercom EU) and PII-in-tickets policy | Card; processor DPA | ~10k users |
| 13 | Trademark/brand checks for "Lilleri" and store listing | Counsel | Before launch |

---

## 20. Open questions and how to verify (highest value first)

1. **Open-banking pricing and agent/partner terms** — send the RFP described in §2 to Salt Edge, Yapily, Tink, Fabrick, Enable Banking (owner: founder; 2 weeks).
2. **Clerk/Stytch EU residency** — only matters if better-auth is rejected; check clerk.com/docs and stytch.com/docs for "data residency".
3. **Supabase passkeys** — experimental today; re-check before relying on it (if Supabase Auth is chosen instead).
4. **Anthropic EU inference** — `inference_geo` has no `"eu"` value today; ask sales whether an EU geography is planned; meanwhile use pseudonymisation + Mistral EU for EU-only flows.
5. **Google Document AI `eu` endpoint, Textract in eu-south-1, SES in eu-south-1** — verify region tables.
6. **Hetzner Object Storage and Scaleway price lists; EAS Production plan price and Free-plan build count** — pricing pages blocked today.
7. **iubenda plan prices; DPO retainers in Italy** — get three quotes.
8. **OneSignal's new 1,000-MAU free cap (effective 2026-09/10)** — confirms Expo Push + own preference centre is the right MVP choice; recheck Growth pricing if OneSignal features (journeys) are wanted.
9. **OpenObserve version conflict (Cargo 0.93.0 vs Docker v1.1.0-rc1)** — irrelevant unless self-hosting observability; check GitHub releases.
10. **Groq/Together pricing and EU regions** — only if open-model inference is pursued.

---

## Sources

| # | Source | URL | Pub. date | Verified | Reliability | Notes |
|---|---|---|---|---|---|---|
| S1 | npm registry (`npm view <pkg> version/time`) for all packages cited | https://registry.npmjs.org/ | live | 2026-10-02 | high | versions and publish dates |
| S2 | PyPI JSON (`ntropy-sdk` 5.5.0, `veryfi` 5.1.0, `heron-data` 0.1.4, `mindee`) | https://pypi.org/pypi/<pkg>/json | live | 2026-10-02 | high | |
| S3 | Docker Hub tags (openobserve, signoz, chatwoot, unleash-server) | https://hub.docker.com/v2/repositories/… | live | 2026-10-02 | high | |
| S4 | better-auth README/dist-tags; `@better-auth/passkey`, `@better-auth/expo`, `expo-better-auth-passkey` | npm registry | 2026-09-30 | 2026-10-02 | high | |
| S5 | Better Auth docs via Context7 (`/better-auth/better-auth`: integrations/expo.mdx, plugins/passkey.mdx, plugins/2fa.mdx, src/api/routes/session.ts) | https://github.com/better-auth/better-auth/tree/main/docs | live | 2026-10-02 | high | |
| S6 | Clerk docs via Context7 (`/clerk/clerk-docs` migrating/overview.mdx) | https://github.com/clerk/clerk-docs | live | 2026-10-02 | high | MRU, 50k free |
| S7 | Auth0 docs-v2 via Context7 (feature-audit-pricing index; log-data-retention) | https://github.com/auth0/docs-v2 | live | 2026-10-02 | high | Free 25k MAU |
| S8 | Supabase docs raw: `billing-on-supabase.mdx`, `manage-your-usage/monthly-active-users.mdx`, `auth/passkeys.mdx` | https://raw.githubusercontent.com/supabase/supabase/master/apps/docs/content/guides/… | live | 2026-10-02 | high | |
| S9 | Stytch pricing/blog via Context7 (`/llmstxt/stytch_api_llms_txt`) | https://stytch.com/pricing | undated | 2026-10-02 | medium | 10k vs 5k MAU conflict |
| S10 | Ory docs via Context7 (`/ory/docs`: security-compliance/personal-data-location, products/overview, rate-limits) ; Kratos LICENSE raw | https://github.com/ory/docs ; https://raw.githubusercontent.com/ory/kratos/master/LICENSE | live | 2026-10-02 | high | |
| S11 | Firebase docs via Context7 (`/websites/firebase_google` docs/auth, auth/limits) | https://firebase.google.com/docs/auth | undated | 2026-10-02 | high | |
| S12 | Keycloak raw: `release_notes/topics/26_5_0.adoc` (26_3/26_4 exist, 27_x absent), `LICENSE.txt` | https://raw.githubusercontent.com/keycloak/keycloak/main/… | live | 2026-10-02 | high | |
| S13 | Sibling doc: open-banking-providers-a.md (§2.6, §5, §6) | /home/user/Lilleri/docs/research/raw/open-banking-providers-a.md | 2026-10-02 | 2026-10-02 | high (cross-ref) | |
| S14 | Sibling doc: open-banking-providers-b.md (§15, §16) | /home/user/Lilleri/docs/research/raw/open-banking-providers-b.md | 2026-10-02 | 2026-10-02 | high (cross-ref) | |
| S15 | Sibling doc: ai-ml-transaction-intelligence.md (§2.4 prices, vendor table, cost per 1k tx) | /home/user/Lilleri/docs/research/raw/ai-ml-transaction-intelligence.md | 2026-10-02 | 2026-10-02 | high (cross-ref) | |
| S16 | Sibling doc: tech-stack-options.md (S30 Sentry residency, S34 Supabase regions, S41 RevenueCat, S44 Clerk) | /home/user/Lilleri/docs/research/raw/tech-stack-options.md | 2026-10-02 | 2026-10-02 | high (cross-ref) | |
| S17 | Sibling doc: regulatory-landscape.md (§4, §6.4, §7) | /home/user/Lilleri/docs/research/raw/regulatory-landscape.md | 2026-10-02 | 2026-10-02 | high (cross-ref) | |
| S18 | Brandfetch docs via Context7 (migrate-from-clearbit-logo-api; transaction-api) | https://docs.brandfetch.com/ | undated | 2026-10-02 | high | 500k free, no attribution |
| S19 | Google Document AI pricing (live page) | https://cloud.google.com/document-ai/pricing | live | 2026-10-02 | high | |
| S20 | Azure AI Document Intelligence overview (raw) | https://raw.githubusercontent.com/MicrosoftDocs/azure-ai-docs/main/articles/ai-services/document-intelligence/overview.md | live | 2026-10-02 | high | no prices |
| S21 | Mindee docs via Context7 (account-management/plans.md) | https://docs.mindee.com/account-management/plans.md | undated | 2026-10-02 | medium-high | |
| S22 | PostHog raw docs: product-analytics/start-here.mdx, compare pages, privacy/gdpr-compliance.mdx, self-host/index.mdx, billing/estimating-usage-costs.mdx | https://raw.githubusercontent.com/PostHog/posthog.com/master/contents/… | live | 2026-10-02 | high | |
| S23 | Mixpanel docs via Context7 (`/mixpanel/docs` pricing.mdx, changelogs, SDK pages) | https://github.com/mixpanel/docs | live | 2026-10-02 | high | |
| S24 | Amplitude docs via Context7 (get-started/stripe-projects; SDK EU residency) | https://amplitude.com/docs | undated | 2026-10-02 | high | |
| S25 | Plausible docs raw `subscription-plans.md` | https://raw.githubusercontent.com/plausible/docs/master/docs/subscription-plans.md | live | 2026-10-02 | high | |
| S26 | Umami raw package.json, LICENSE | https://raw.githubusercontent.com/umami-software/umami/master/ | live | 2026-10-02 | high | |
| S27 | RevenueCat docs via Context7 (account-management.md, stripe-projects-quickstart.md, tracking-custom-paywall-impressions) | https://www.revenuecat.com/docs | undated | 2026-10-02 | high | |
| S28 | Superwall docs via Context7 (agents/files pricing; support FAQ MAR) | https://superwall.com/docs | undated | 2026-10-02 | high | |
| S29 | Adapty docs via Context7 | https://github.com/adaptyteam/adapty-docs | live | 2026-10-02 | medium | no prices |
| S30 | Stripe Tax docs via Context7 (`docs.stripe.com/tax/how-tax-works`) | https://docs.stripe.com/tax/how-tax-works | undated | 2026-10-02 | medium | percentages not captured |
| S31 | Paddle developer docs via Context7 (how-paddle-works; partners concepts) | https://developer.paddle.com | undated | 2026-10-02 | high | MoR model |
| S32 | Lemon Squeezy help via Context7 (payments; affiliates fees) | https://docs.lemonsqueezy.com/help | undated | 2026-10-02 | high | |
| S33 | Expo docs raw: `push-notifications/sending-notifications.mdx`, `billing/plans.mdx`, `billing/usage-based-pricing.mdx`, `billing/faq.mdx` | https://raw.githubusercontent.com/expo/expo/main/docs/pages/… | live | 2026-10-02 | high | |
| S34 | OneSignal docs via Context7 (billing-faq) | https://documentation.onesignal.com/docs/en/billing-faq | 2026 | 2026-10-02 | high | 1,000 MAU free from Sept/Oct 2026 |
| S35 | Courier docs via Context7 (overview FAQ; workspaces/security) | https://www.courier.com/docs | undated | 2026-10-02 | high | |
| S36 | Novu docs via Context7 (platform/account/billing; additional-resources/security); raw apps/api/package.json | https://docs.novu.co ; https://raw.githubusercontent.com/novuhq/novu/next/apps/api/package.json | live | 2026-10-02 | high | |
| S37 | Knock docs via Context7 (manage-your-account/knock-plans) | https://docs.knock.app | undated | 2026-10-02 | medium | plan names only |
| S38 | Resend docs via Context7 (knowledge-base/what-is-resend-pricing; api-reference/domains/create-domain) | https://resend.com/docs | undated | 2026-10-02 | high | |
| S39 | Intercom developer docs via Context7 (rest-apis regional hosting; mcp) | https://developers.intercom.com | undated | 2026-10-02 | high | |
| S40 | Crisp docs via Context7 (rtm-api v1; security-practices) | https://docs.crisp.chat | undated | 2026-10-02 | medium | |
| S41 | Chatwoot raw LICENSE, package.json; Docker Hub tags | https://raw.githubusercontent.com/chatwoot/chatwoot/develop/ | live | 2026-10-02 | high | v4.18.0 |
| S42 | OpenFeature spec README raw; `@openfeature/server-sdk` npm | https://raw.githubusercontent.com/open-feature/spec/main/README.md | live | 2026-10-02 | high | |
| S43 | Unleash raw LICENSE (AGPL-3.0), package.json 8.2.0; Docker Hub | https://raw.githubusercontent.com/Unleash/unleash/main/ | live | 2026-10-02 | high | |
| S44 | Flagsmith docs via Context7 (billing-api-usage; open-source FAQ; edge-api); raw version.txt | https://docs.flagsmith.com ; https://raw.githubusercontent.com/Flagsmith/flagsmith/main/version.txt | live | 2026-10-02 | high | |
| S45 | Sentry docs raw `docs/pricing/index.mdx`; `organization/data-storage-location/index.mdx` (via S16) | https://raw.githubusercontent.com/getsentry/sentry-docs/master/docs/pricing/index.mdx | live | 2026-10-02 | high | |
| S46 | Grafana Cloud docs via Context7 (understand-grafana-cloud-features) | https://grafana.com/docs/grafana-cloud/ | undated | 2026-10-02 | high | retention only |
| S47 | Better Stack docs via Context7 (logs/billing-for-metrics) | https://betterstack.com/docs/logs/billing-for-metrics | 2026 | 2026-10-02 | high | |
| S48 | OpenObserve raw LICENSE, Cargo.toml; Docker Hub | https://raw.githubusercontent.com/openobserve/openobserve/main/ | live | 2026-10-02 | medium | version conflict |
| S49 | SigNoz raw LICENSE; Docker Hub | https://raw.githubusercontent.com/SigNoz/signoz/main/LICENSE | live | 2026-10-02 | high | |
| S50 | Infisical raw LICENSE, README; npm `@infisical/sdk` | https://raw.githubusercontent.com/Infisical/infisical/main/ | live | 2026-10-02 | high | |
| S51 | OpenBao raw LICENSE (MPL-2.0) | https://raw.githubusercontent.com/openbao/openbao/main/LICENSE | live | 2026-10-02 | high | |
| S52 | pgBackRest raw `src/version.h` (2.60.0 dev) | https://raw.githubusercontent.com/pgbackrest/pgbackrest/main/src/version.h | live | 2026-10-02 | medium | |
| S53 | Cloudflare docs raw `r2/pricing.mdx`, `r2/reference/data-location.mdx` | https://raw.githubusercontent.com/cloudflare/cloudflare-docs/production/src/content/docs/r2/ | live | 2026-10-02 | high | |
| S54 | Scaleway docs raw `object-storage/faq.mdx` | https://raw.githubusercontent.com/scaleway/docs-content/main/pages/object-storage/faq.mdx | live | 2026-10-02 | high | trial only |
| S55 | Logo.dev docs via Context7 (migrations/clearbit; platform/attribution) | https://docs.logo.dev | live | 2026-10-02 | high | |
| S56 | Frankfurter README raw | https://raw.githubusercontent.com/hakanensari/frankfurter/main/README.md | live | 2026-10-02 | high | |
| S57 | Open Exchange Rates docs via Context7 (reference/usage-json) | https://docs.openexchangerates.org/reference/usage-json | undated | 2026-10-02 | high | free plan 1,000 req/mo |
| S58 | Apple Developer Program page (live) | https://developer.apple.com/programs/ | live | 2026-10-02 | high | $99/yr |
| S59 | Anthropic pricing, data residency, API & data retention (live) | https://platform.claude.com/docs/en/about-claude/pricing ; …/build-with-claude/data-residency ; …/build-with-claude/api-and-data-retention | live | 2026-10-02 | high | |
| S60 | claude-api skill (bundled model table, cached 2026-09-25) | local skill file | 2026-09-25 | 2026-10-02 | high | |
| S61 | Author recollection for items marked ASSUMPTION (Hetzner/Scaleway/AWS prices, Google Play fee, Postmark/SES/Brevo/Mailjet, Intercom/Zendesk/Help Scout, LaunchDarkly, Datadog, Doppler, iubenda/Termly, DPO retainers, store commissions, Groq/Together) | — | — | — | low–medium | verify at vendor pricing pages listed in each section |
| S62 | Blocked today (403 via proxy): clerk.com, auth0.com, supabase.com, posthog.com, revenuecat.com, docs.expo.dev, iubenda.com, sentry.io, hetzner.com, scaleway.com, aws.amazon.com, azure.microsoft.com, ntropy.com, brandfetch.com, logo.dev, openexchangerates.org, ecb.europa.eu, support.google.com, termly.io, github.com API | — | — | 2026-10-02 | — | WebSearch budget exhausted (200/200) before this task |
