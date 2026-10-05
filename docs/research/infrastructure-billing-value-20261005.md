# Lilleri — EU infrastructure, email, KMS and subscription-billing research (value for money)

**Research date / verification date for every row:** 2026-10-05 (Europe/Rome).
**Scope:** Italy-first consumer PFM web app (Node 22 Fastify API + PostgreSQL 16+ with RLS via Drizzle, Expo web static export, Next.js marketing page, one Docker image, today on Railway Hobby with PGlite on a 1 GB volume). EU hosting, encrypted backups, PITR, DPA required. Planned Plus price €6.99/month or €69.99/year **including 22% IVA**.
**Conventions:** EUR excl. VAT unless stated; USD→EUR at **1.17 USD = 1 EUR** (same ASSUMPTION as `docs/business/cost-architecture.md`); 1 month = 730 h.

## 0. Method and evidence labels

| Label | Meaning in this report |
|---|---|
| **FACT-P** | Read first-hand this pass from the vendor's own documentation (Railway docs via the Railway docs tool; Stripe and Scaleway API docs via Context7 mirrors of the official docs). Reliability high. |
| **FACT-S** | Vendor price/term obtained through a web-search result summary of the vendor page or a dated third-party transcription; the page itself could not be opened (see limitation). Reliability medium (vendor page summarised) or low (third-party only) — stated per row. |
| **ASSUMPTION** | Workload, volume, conversion or engineering estimate made for this model. |
| **UNKNOWN** | Not found or conflicting; must be verified before relying on it. |

**Limitation (important):** the session's egress proxy blocked `WebFetch` for every vendor domain tried (railway.com, fly.io, render.com, hetzner.com, scaleway.com, stripe.com, docs.stripe.com, resend.com, station.railway.com). Railway documentation was therefore read through the Railway docs MCP tool (first-hand). Stripe and Scaleway API references were read through Context7 (official doc mirrors). All other prices come from `WebSearch` result summaries; treat them as FACT-S and re-check on the vendor page before signing anything. No price below is invented; where a number is my arithmetic it is shown with its formula.

---

## 1. Recommendation in one screen

**Launch (≈100 registered users): stay on Railway, upgrade Hobby → Pro, run app + Railway Postgres in EU West Metal (Amsterdam), enable Railway PITR and volume backups, add a nightly client-side-encrypted logical dump to an independent EU object store, use Scaleway TEM for email and Scaleway Key Manager for the envelope-encryption KEK, Stripe Checkout + Billing + Customer Portal for subscriptions (manual 22% inclusive IVA tax rate; Stripe Tax/OSS only when cross-border B2C sales approach €10 k/yr), Sentry (EU region) free + UptimeRobot free.**

Why:
1. **Railway Hobby cannot be used for the commercial launch.** Railway's ToS (quoted by Railway staff on Central Station) limits Hobby to "internal, personal, non-commercial use"; commercial workloads need Pro (FACT-S medium, S10). Railway's own docs position Hobby for "personal projects" and Pro for "production apps" (FACT-P, S1/S2). Pro = **$20/month, which includes $20 of usage, unlimited seats** (FACT-P, S1/S9).
2. **Railway Postgres now has native PITR** (pgBackRest WAL archiving to a Railway bucket; weekly full + daily differential; last 4 fulls kept → **~4-week restore window**; restore forks a new service; no separate fee, billed as bucket storage $0.015/GB-month + upload egress $0.05/GB) (FACT-P, S4). It also has scheduled volume backups (daily kept 6 days, weekly 27 days, monthly 89 days; billed incrementally at volume rate) (FACT-P, S5), one-click major-version upgrades (14–17 → newer) and optional HA (FACT-P, S8). This removes the main reason the earlier docs pointed to Neon.
3. **It keeps the single Docker image and the current deploy loop** — the only code change is pointing Drizzle at `DATABASE_URL` instead of PGlite and moving `/data` key material to KMS-wrapped storage.
4. **Cost at launch is the $20 Pro minimum (~€17.09/month)**; the estimated usage (~$11–13) fits inside the included credit (ASSUMPTION, §10).
5. **Stripe is the cheapest mature billing rail for an Italy-first B2C launch**: €5.33 net per €6.99 monthly payment and €55.58 per €69.99 annual payment after IVA, card fee and Billing (§3). A merchant of record (Paddle) costs ~€0.26 more per subscription-month (≈5 % of ex-VAT revenue) and is only worth it if VAT/OSS administration across many EU countries becomes the bottleneck.

Main trade-offs accepted: Railway, Tigris (Railway buckets), Stripe and Sentry are US-headquartered (EU regions + DPA/SCCs/DPF, but not "sovereign"); Railway Postgres is an **unmanaged template** (you own tuning, roles, connection pooling, monitoring) (FACT-P, S8); no contractual SLA below Enterprise (FACT-P, S11). The EU-owned, lower-cash alternative is Hetzner + Coolify (≈€14–60/month) at the price of 4–8 h/month of operations (ASSUMPTION) — not worth it before ~10 k users unless sovereignty becomes a hard requirement.

---

## 2. Workload model (ASSUMPTIONS)

| Item | 100 registered | 1,000 registered | 10,000 registered | Basis |
|---|---|---|---|---|
| Paying (10–20 %) | 10–20 | 100–200 | 1,000–2,000 | brief |
| Annual share of Plus | 60 % | 60 % | 60 % | repo `unit-economics.md` U4 Base |
| MAU | ~50 % of registered | ~50 % | ~50 % | ASSUMPTION (light traffic) |
| DB data (5–20 MB/user) | 0.5–2 GB | 5–20 GB | 50–200 GB | brief |
| Emails/month (budget ceiling) | ≤ 1,000 | ≤ 10,000 | 30,000–100,000 | ~3–10/registered user (verification, reset, notifications) |
| App RAM / avg vCPU | 0.5 GB / 0.05 | 0.7 GB / 0.15 | 2 × 0.75–1 GB / 0.6–1.0 | compiled preview measured ~0.55 GB RSS locally (`railway-preview.md`); production API without PGlite assumed similar |
| Postgres RAM / avg vCPU | 0.3 GB / 0.03 | 1 GB / 0.1 | 4 GB / 0.5–1.0 | ASSUMPTION |
| User egress | 2–5 GB | 10–25 GB | 100–250 GB | 20–50 MB per MAU-month, static assets cached |
| KMS operations (DEK unwraps, cached) | ≤ 10 k | ≤ 100 k | ≤ 1 M | ASSUMPTION |

Excluded from all tables: bank-data/AIS (not used in the zero-investment import-only launch), domain, accountant/legal, Apple/Google developer fees, people.

---

## 3. Net revenue per payment (VAT 22 % included in price)

Ex-VAT price: monthly €6.99 / 1.22 = **€5.7295**; annual €69.99 / 1.22 = **€57.3689**. Card/processor fees are charged on the gross (VAT-inclusive) amount; app-store commission is computed on the price net of VAT.

| Rail | Fee formula (source, label) | Net per €6.99 monthly | Fee % of ex-VAT | Net per €69.99 annual | Fee % | Blended net per sub-month (60 % annual) | Who files VAT / OSS |
|---|---|---|---|---|---|---|---|
| **Stripe Payments + Billing** | 1.5 % + €0.25 standard EEA cards (FACT-S medium, S44; also repo doc read 2026-10-03) + Billing 0.7 % PAYG (FACT-S medium, S45) | **€5.33** (5.7295 − 0.3549 − 0.0489) | 7.05 % | **€55.58** (57.3689 − 1.2999 − 0.4899) | 3.12 % | **€4.91** | **Lilleri** (Italian IVA in periodic returns; Union OSS quarterly only once cross-border B2C > €10 k/yr) |
| Stripe + Stripe Tax | + 0.5 % per transaction where registered (FACT-S medium, S45) | €5.29 | 7.66 % | €55.23 | 3.73 % | €4.88 | Lilleri (Stripe Tax calculates; filing is separate) |
| Stripe Managed Payments (Stripe MoR) | + 3.5 % on full amount incl. tax, on top of processing and Billing (FACT-S medium, S46) | €5.08 | 11.32 % | €53.13 | 7.39 % | €4.69 | Stripe as MoR — **availability for Italian businesses UNKNOWN** (public preview, "~35 countries") |
| Paddle (MoR) | 5 % + 50¢ (FACT-S medium, S48); 50¢ taken as $0.50 = €0.427 (ASSUMPTION; €0.50 variant in brackets) | €4.95 (€4.88) | 13.56 % (14.83 %) | €53.44 (€53.37) | 6.85 % | €4.65 | Paddle collects/remits all EU VAT; Lilleri sells B2B to Paddle (Paddle self-bills a "reverse invoice"; Italian SdI cross-border reporting still applies — FACT-S medium, S48; confirm with commercialista) |
| Lemon Squeezy (MoR, Stripe-owned) | 5 % + 50¢ (FACT-S low, S49) | ≈ €4.95 | ≈ 13.6 % | ≈ €53.44 | ≈ 6.9 % | ≈ €4.65 | LS as MoR; **in transition to Stripe Managed Payments since 2026 (slower support, migration path) — not recommended for a new integration** (FACT-S low) |
| Mollie (cards + Subscriptions API) | 1.8 % + €0.25 EEA consumer cards (FACT-S low-medium, S50); recurring tooling included (ASSUMPTION) | €5.35 | 6.56 % | €55.86 | 2.63 % | €4.93 | Lilleri; no hosted customer portal or tax engine → more build work |
| Apple App Store / Google Play | 15 % (Apple Small Business Program; Google subscriptions 10 % service + 5 % billing = 15 % effective) on net-of-VAT price (FACT-S medium, S51/S52) | €4.87 | 15 % | €48.76 | 15 % | €4.39 | Store is MoR and remits VAT. Apple changed EU terms on 1 Oct 2026 (Core Technology Commission 5 % for non-App-Store sales; EU IAP standard 26 %, 15 % for SBP) — re-verify before native launch |

Notes:
- **Stripe vs Paddle gap:** €0.26 per subscription-month (blended) ≈ 5.0 % of ex-VAT revenue → ≈ €5/month at 20 subs, €51 at 200, €512 at 2,000 (arithmetic).
- **VAT/OSS (FACT-S medium, S53):** since 1 Jul 2021 an EU-wide **€10,000/yr** threshold applies to cross-border B2C TBE (electronic) services + distance sales. Below it, an Italian supplier charges **Italian IVA 22 %** to consumers in other EU states too; above it, destination-country VAT applies and the Union OSS (registered in Italy, quarterly return) is used. Italy-first ⇒ at launch the OSS burden is small, which weakens the case for paying an MoR premium.
- **Italian e-invoicing/corrispettivi for B2C digital services** (whether a receipt/fattura is needed when not requested, SdI reporting) — **UNKNOWN**, ask the commercialista; it is the same question under Stripe or Mollie, and partly shifts to the MoR under Paddle.
- Premium/business/non-EEA cards, PayPal, disputes and currency conversion cost more (Stripe: 1.9 % premium EEA, 2.5 % UK, 3.25 % international, +1–2 % FX — FACT-S medium, S44).

---

## 4. App hosting / compute in the EU

| Provider | EU region | Price points (label) | Free tier | DPA / GDPR | Fit for single Docker image | Notes |
|---|---|---|---|---|---|---|
| **Railway Pro** | EU West Metal, Amsterdam `europe-west4-drams3a` (FACT-P, S3) | $20/mo incl. $20 usage; RAM **$10/GB-mo**, CPU **$20/vCPU-mo**, egress **$0.05/GB**, volume **$0.15/GB-mo**, buckets **$0.015/GB-mo** (free ops/egress); per-service max 1 TB RAM/1,000 vCPU, 42 replicas, volumes self-serve to 1 TB (FACT-P, S1/S6) | — | Self-serve DPA (DocuSign), SOC 2 Type II + SOC 3, DORA docs under NDA, EU VAT ID on invoices (FACT-P, S7) | **Native today** (no change) | Builds free; unlimited seats (FACT-P, S9); contractual SLA only Enterprise (FACT-P, S11); US company |
| Railway Hobby | same | $5/mo incl. $5 usage; 48 GB RAM/service, **5 GB volume max**, 6 replicas (FACT-P, S1) | Free plan $1 credit, 0.5 GB RAM (FACT-P) | same | Native | **Non-commercial use only** per ToS (FACT-S medium, S10) → not allowed for paid launch |
| Fly.io | fra, ams, cdg, arn, lhr… | shared-cpu-1x 1 GB base $5.70/mo; region multiplier fra 1.154, ams 1.038, cdg 1.135 → fra ≈ **$6.58**, ams ≈ $5.92 (FACT-S medium, S12; arithmetic); volumes $0.15/GB-mo; egress $0.02/GB EU/NA (FACT-S medium) | none significant | DPA available (UNKNOWN details) | Yes (Dockerfile) | `cost-architecture.md` quoted $7.73 for fra 1 GB — discrepancy, verify |
| Render | Frankfurt (UNKNOWN for all services) | Starter $7 (512 MB/0.5 CPU), Standard $25 (2 GB/1 CPU) (FACT-S medium, S14); bandwidth included cut 20× in 2026 (Hobby 5 GB, Pro 25 GB) with $0.15/GB overage; legacy plans auto-migrated 1 Aug 2026 (FACT-S low-medium) | Free web service (sleeps) | DPA (UNKNOWN) | Yes | Workspace plan fee for "Professional" UNKNOWN |
| Hetzner Cloud (+ Coolify self-hosted) | FSN/NBG (DE), HEL (FI) | After 15 Jun 2026: **CX23 €5.49**, **CX33 €8.49**, **CX43 €15.99**, CAX11 €5.99, CPX22 €19.49 /mo excl. IPv4 (FACT-S medium, S15); primary IPv4 €0.50/mo, backups +20 % of server price (FACT-S low-medium, S16); volumes price after 2026 adjustments UNKNOWN | — | EU company, DPA (Art. 28) standard (ASSUMPTION: well known, not re-read) | Yes via Coolify/Docker | You run OS, Postgres, backups, TLS, monitoring; CX stock availability was flagged in repo doc (Q3) — still UNKNOWN |
| Scaleway | fr-par, nl-ams, pl-waw | Serverless Containers €0.10 per 100 k GB-s and €1.0 per 100 k vCPU-s after 400 k GB-s / 200 k vCPU-s free per month (FACT-S medium, S20); DEV1-S ≈ €6.42/mo, PLAY2-NANO ≈ €19.71/mo (FACT-S medium); prices raised 1 Jun 2026 (FACT-S medium, S19; exact deltas UNKNOWN) | Serverless free quota | EU company, DPA | Yes (registry + container) | 1 GB/0.5 vCPU always-on container ≈ €13/mo (arithmetic on pre-increase rates, ASSUMPTION) |
| OVHcloud | FR/DE/PL/UK… | VPS-1 €5.39 → **€7.79**/mo from 1 Apr 2026 (FACT-S low, S26) | Public Cloud credits (UNKNOWN) | EU company | Yes (VPS/Managed K8s) | Managed PG prices UNKNOWN |
| Koyeb | Frankfurt (ASSUMPTION) | Pro $29/mo + compute ($10 included); 1 vCPU/1 GB ≈ $10.71/mo (FACT-S low, S27) | Free tier small instance | UNKNOWN | Yes | Platform fee makes it poor value at launch |
| Northflank | EU region on Northflank cloud UNKNOWN; BYOC in any cloud region | $0.01667/vCPU-h (≈ $12/vCPU-mo), $0.00833/GB-h (≈ $6/GB-mo), disk $0.15/GB-mo, egress $0.06/GB (FACT-S low, S28) | Sandbox: 2 services + 1 DB | UNKNOWN | Yes | DB from $2.70/mo; nf-compute-100-2 (1 vCPU/2 GB) $24/mo with PITR (FACT-S low) |
| DigitalOcean App Platform | FRA1, AMS3 (ASSUMPTION, standard DO regions) | 1 GB shared container $12/mo (autoscale-capable, 150 GiB transfer) or $10/mo fixed (100 GiB) (FACT-S medium, S29) | 3 free static sites (ASSUMPTION) | DPA available (ASSUMPTION) | Yes (Dockerfile) | Good runner-up to Railway |

---

## 5. Managed PostgreSQL in the EU (all are PostgreSQL → RLS supported)

**RLS caveat for every provider (ASSUMPTION, engineering):** superusers and roles with `BYPASSRLS` skip policies, and table owners skip them unless `FORCE ROW LEVEL SECURITY` is set. Railway's template exposes the `postgres` superuser in `DATABASE_URL` (FACT-P: template variables `PGUSER`/`DATABASE_URL`, S8) → create a dedicated `lilleri_app` role (`NOSUPERUSER NOBYPASSRLS`, not owner of tables) for the API and keep the owner role for migrations only. Check the equivalent on Neon/Supabase (their default roles may have elevated privileges — UNKNOWN).

| Provider | EU region | Entry price (label) | PG version | PITR / backups | DPA | Fit |
|---|---|---|---|---|---|---|
| **Railway Postgres** (template, "unmanaged") | Amsterdam (service region); PITR bucket on Tigris — Tigris has ams/fra regions (FACT-S medium, S61) but **which region the auto-created PITR bucket uses is UNKNOWN → verify it is EU** | Usage only: RAM $10/GB-mo, CPU $20/vCPU-mo, volume $0.15/GB-mo; PITR = bucket $0.015/GB-mo + upload egress $0.05/GB; restore traffic free (FACT-P, S1/S4) | Official `postgres-ssl` image on a **major tag** (e.g. `:16`, `:17`); minor pinning not supported with PITR; in-place major upgrades 14–17 → newer (FACT-P, S4/S8) | **PITR ~4 weeks** (last 4 weekly fulls + daily diffs, WAL archive_timeout 60 s); window starts at enable; restore creates a sibling service (FACT-P, S4). Volume backups daily/weekly/monthly kept 6/27/89 days (FACT-P, S5). Bucket "encrypted at rest" but **no SSE options, no versioning, no object lock** (FACT-P, S6) | Railway DPA (FACT-P, S7) | **Best fit**: same platform, same project, private networking |
| Neon (Launch) | AWS eu-central-1 Frankfurt, eu-west-2 London; Azure regions deprecated for new projects (FACT-S medium, S31) | $0.106/CU-h compute, $0.35/GB-mo storage, instant-restore history $0.20/GB-mo; **no monthly minimum since Dec 2025**; Scale $0.222/CU-h (FACT-S medium, S31) | 14–18 (ASSUMPTION) | Launch 7-day PITR; Scale 30 days (FACT-S medium) | DPA + DPF (FACT-S medium) | Good second DB; cross-provider latency Amsterdam↔Frankfurt (~7–10 ms RTT, ASSUMPTION); costlier than Railway PG at 10 k users |
| Supabase | eu-central-1 Frankfurt, others | Pro $25/project (incl. $10 compute credit = Micro), 8 GB DB, daily backups 7 days; **PITR add-on $100/mo per 7-day window** (FACT-S medium, S32) | 15/17 (ASSUMPTION) | PITR only as add-on | DPA (ASSUMPTION) | Poor value if PITR mandatory (≥ $125/mo) |
| Scaleway Managed DB | Paris, Amsterdam, Warsaw | DB-DEV-S (2 vCPU/2 GB) ≈ €11/mo, DB-PLAY2-PICO ≈ €17/mo (FACT-S low, S18; pre-1-Jun-2026 rates?); backup storage €0.03/GB-mo or 100 GB included (conflicting, UNKNOWN) | UNKNOWN | Autobackup daily, 7-day retention default; **native PITR not confirmed (UNKNOWN)** — Scaleway publishes a pgBackRest-to-S3 tutorial (FACT-S medium) | EU company DPA | EU-sovereign option if PITR is verified |
| Aiven | Many EU clouds (AWS/GCP/Azure/UpCloud/OVH) | Free (1 GB, no backups), Developer $5 (8 GB, **no backups**), Startup-4 $75 (2-day PITR), Business-4 $180 (14-day) (FACT-S medium, S33) | 13–17+ | as listed | Finnish company, DPA | Expensive for required PITR |
| DigitalOcean Managed PG | FRA1, AMS3 (ASSUMPTION) | 1 GiB node $15/mo, 2 GiB $30/mo; per-minute billing in 2026 (FACT-S medium, S30) | 13–17 (ASSUMPTION) | Daily backups 7 days + **PITR last 7 days included** (FACT-S medium, S30) | DPA (ASSUMPTION) | **Best value if leaving Railway** with a managed DB |
| Fly Managed Postgres | fra/ams (ASSUMPTION) | Basic $38/mo (shared-2x, 1 GB), Starter $72, Launch $282; storage $0.30/GB per node (HA: primary + replica) (FACT-S medium, S13) | UNKNOWN | HA + backups included; PITR UNKNOWN | UNKNOWN | Overpriced at launch |
| Render Postgres | Frankfurt (UNKNOWN) | Basic-1gb $19/mo (FACT-S medium, S14) | UNKNOWN | PITR window 3 days (Hobby workspace) / 7 days (Professional+) (FACT-S medium) | UNKNOWN | OK, but bandwidth changes and workspace fees |
| Hetzner self-managed + pgBackRest | DE/FI | Server price only (see §4) + Hetzner Object Storage **€6.49/mo incl. 1 TB storage + 1 TB egress**, extra €8.70/TB-mo, €1/TB egress (FACT-S low-medium, S17) | Any (you install) | PITR as configured (pgBackRest repo encryption `aes-256-cbc` available) | Hetzner DPA | Cheapest cash; highest operational burden |
| Crunchy Bridge | AWS/GCP/Azure EU (ASSUMPTION) | Hobby-2 $35/mo, Standard-4 $140/mo (FACT-S low, S34) | UNKNOWN | PITR UNKNOWN in this pass | UNKNOWN | **Status after Snowflake acquisition UNKNOWN** — avoid until clarified |
| Xata | eu-central-1 (EU compute ×1.15) | xata.micro $0.012/h (≈ $10/mo EU), storage $0.30/GB-mo (FACT-S medium-low, S35) | UNKNOWN | PITR UNKNOWN | UNKNOWN | Young platform; verify backups |

---

## 6. Transactional email (verification, password reset, notifications)

| Provider | EU data residency | ~1 k/mo | ~10 k/mo | ~100 k/mo | Free tier | DPA/GDPR notes |
|---|---|---|---|---|---|---|
| **Scaleway TEM** (Essential PAYG) | **Yes — EU company, fr-par** (FACT-P: API region path; S22) | **€0.18** ((1,000−300) × €0.25/1k) | **€2.43** | **€24.93** (or Scale plan **€80** incl. 100 k + dedicated IP, 99.9 % SLA, €0.20/1k extra) | **300 emails/month** | Essential: 5 domains, 1 webhook/domain, 10 recipients/email default, 2 MB API message, no hourly quota since Dec 2023 (FACT-S medium, S21). Requires SPF, DKIM, MX, DMARC (FACT-P, S23) |
| Amazon SES (eu-south-1 Milan / eu-central-1) | Region-resident processing; US parent (FACT-S medium, S37) | $0.16 Essentials (€0.14) | $1.60 (€1.37) | $16.00 (€13.68) | **None for new customers since 21 Jul 2026** | New accounts default to **Essentials $0.16/1k** (0–10 M), Pro $0.22/1k + $105/mo, Enterprise $0.23/1k + $500/mo; à-la-carte $0.10/1k kept by older accounts — whether new accounts can switch to à-la-carte is **conflicting (UNKNOWN)**; dedicated IP $24.95/mo (FACT-S medium, S36). AWS DPA applies automatically (ASSUMPTION, well known) |
| Resend | **No** — sending region eu-west-1 possible but account data, logs, metadata stored in US (FACT-S medium, S39) | $0 | $20 (Pro, 50 k) | $90 (Pro 100k) | 3,000/mo, 100/day | Prior repo default; fails the "EU residency" preference |
| Postmark | **No** — US only, no EU plans announced (FACT-S medium, S38) | $15 (10 k incl.) | $15 | Basic $15 + 90 × $1.80 = $177; Pro $16.50 + 90 × $1.30 = $133.50; Platform $18 + 90 × $1.20 = $126 (arithmetic on FACT-S) | 100/mo | DPA available (FACT-S) |
| Brevo | **Yes** — FR/DE on-prem + GCP Belgium (FACT-S low, S40) | $0 | $0 if ≤ 300/day, else paid | UNKNOWN (credit packs ≈ $0.002–0.006/email → $200–600) | 300/day | Plans Starter $9, Standard $18 (marketing-oriented) |
| Mailgun (EU region) | Partial — message data in EU (GCP DE/BE); account data replicated globally (FACT-S low, S41) | $0 | $15 (Basic 10 k) | $90 (Scale 100 k) | 100/day | Foundation $35/50 k; dedicated IP $60 |
| SendGrid | UNKNOWN for EU residency | trial only | $19.95 (Essentials 50 k) | UNKNOWN | **No free plan** (60-day trial) (FACT-S low, S42) | — |
| Mailjet | **Yes** — GCP Frankfurt + Belgium (FACT-S medium, S43) | $0 | €18 (Essential 15 k) | UNKNOWN | 6,000/mo, 200/day | Prices updated 9 Sep 2026 |

**Recommendation: Scaleway TEM** — EU-only processing under an EU provider, a single JSON POST with an `X-Auth-Token` header (no SDK/SigV4), a free tier that covers launch, and ≤ €25/month at 100 k emails. **Fallback adapter: Amazon SES in eu-south-1** if TEM deliverability to Italian mailboxes (Libero/Virgilio/Outlook/Gmail) disappoints in the beta — measure inbox placement before launch (ASSUMPTION: TEM shared-IP reputation is the main risk). Exact API details are in [`email-billing-api-20261005.md`](email-billing-api-20261005.md).

---

## 7. Billing provider recommendation

**Stripe (Checkout in `subscription` mode + Billing + Customer Portal).** Prices as Stripe `Price` objects in EUR with `tax_behavior=inclusive` (699 monthly, 6999 yearly). At launch use a **manual inclusive 22 % IT tax rate** (free) rather than Stripe Tax (0.5 %), because sales are Italy-first and below the €10 k cross-border threshold; enable Stripe Tax + OSS registration when EU cross-border B2C sales approach €10 k/yr or the product is marketed EU-wide. Collect ToS consent and the express request for immediate performance/acknowledgement of the loss of the 14-day withdrawal right (EU consumer law for digital services — ASSUMPTION, confirm wording with counsel) via `consent_collection` / `custom_text`.

When to choose otherwise:
- **Paddle** if the founder wants zero VAT/OSS/chargeback administration across many countries and accepts ~5 % lower net revenue.
- **Mollie** (Dutch, EU-sovereign payments) if avoiding US PSPs matters: slightly better net (€4.93 vs €4.91 per sub-month) but you build the customer portal, dunning UX and tax logic yourself.
- **Stripe Managed Payments** only if Stripe confirms availability for an Italian company; at +3.5 % it is cheaper than Paddle (€4.69 vs €4.65 blended — ≈ equal) and keeps the Stripe integration.
- **App stores** only with native apps; 15 % makes net €4.39 per sub-month.

---

## 8. Secrets/KMS and object storage for encrypted backups

**KMS (one KEK wrapping per-profile DEKs; DEKs cached in memory after unwrap):**

| Service | Price (label) | 100 users (≤10 k ops) | 1 k users (≤100 k ops) | 10 k users (≤1 M ops) | EU / notes |
|---|---|---|---|---|---|
| **Scaleway Key Manager** | **€0.06 per key version/month** (was €0.04 before 1 Jun 2026), **€0.03 per 10 k operations**, €0.01 per key restore (FACT-S medium, S24) | **€0.09** | **€0.36** | **€3.06** | GA; HSM-protected keys; AES-256-GCM symmetric; key material never exportable (FACT-S medium). Supports encrypt/decrypt; data-key generation API **UNKNOWN** (otherwise generate DEK locally and wrap it) |
| AWS KMS | $1/customer-managed key/month + $0.03/10 k requests after **20 k free/month** (FACT-S medium, S54) | $1.00 (€0.85) | $1.24 (€1.06) | $3.94 (€3.37) | eu-south-1 Milan available; CloudTrail audit; automatic rotation adds key-version charges (ASSUMPTION) |
| Google Cloud KMS | $0.06/active key version/month (software) + $0.03/10 k ops (FACT-S medium, S55) | ≈ $0.09 | ≈ $0.36 | ≈ $3.06 | europe-west8 Milan exists; regional price UNKNOWN |

Recommendation: **Scaleway Key Manager** (EU provider, same account as TEM and offsite backups). Design notes (ASSUMPTION): keep the KEK out of Railway (so a stolen DB/volume backup is useless without KMS), cache unwrapped DEKs with a short TTL so a KMS outage only blocks new sessions, implement crypto-shredding (delete wrapped DEK) for erasure, and keep an offline break-glass procedure.

**Object storage for the independent encrypted backup copy** (nightly `pg_dump` compressed and encrypted client-side with an `age`/GPG public key whose private key is offline; 7 daily + 4 weekly + 3 monthly copies):

| Store | Price (label) | EU | Notes |
|---|---|---|---|
| Railway Buckets (Tigris) | $0.015/GB-mo, free ops and egress; Pro unlimited capacity (FACT-P, S6) | ams/fra available (Tigris) | Same vendor as primary → not independent; no versioning/object lock (FACT-P) |
| **Scaleway Object Storage** | ≈ €0.0105–0.0146/GB-mo (sources conflict — UNKNOWN), PUT €0.005/1k, GET €0.0004/10k (FACT-S low, S25) | fr-par / nl-ams / pl-waw | EU-owned; recommended with versioning/object lock if available (UNKNOWN) |
| Hetzner Object Storage | €6.49/mo incl. 1 TB + 1 TB egress (FACT-S low-medium, S17) | DE/FI | Best flat price once backups exceed ~400 GB |
| Cloudflare R2 | $0.015/GB-mo, 10 GB free, Class A $4.50/M, Class B $0.36/M, zero egress (FACT-S medium, S56) | EU jurisdiction option (repo doc; not re-verified) | US company |
| Backblaze B2 | ≈ $6.95/TB-mo, free egress up to 3× stored (FACT-S low, S57) | EU Central (Amsterdam) | US company |

---

## 9. Monitoring (optional, low priority)

| Tool | Free tier | Paid | EU / notes |
|---|---|---|---|
| Sentry | Developer: 5 k errors/mo, 1 user (FACT-S medium, S58) | Team $26/mo, Business $80/mo | **EU data region (Frankfurt) on all plans**, choose at org creation (FACT-S medium, S58) |
| Better Stack | 10 monitors/heartbeats, 1 status page (FACT-S low-medium, S59) | Responder $34/mo ($29 yearly) | — |
| UptimeRobot | Free; **commercial use allowed again per May 2026 ToS** (FACT-S low-medium, S60) | Solo $9/mo annual ($10 monthly) | — |

---

## 10. Recommended stack — monthly cost (EUR, excl. VAT)

Railway usage estimates are ASSUMPTIONS built from §2 and FACT-P unit prices (§4). Railway volume billing basis (used vs provisioned GB) is **UNKNOWN**; ranges assume used GB.

**Railway usage build-up (USD):**
- 100 users: app 0.5 GB ($5.00) + 0.05 vCPU ($1.00); PG 0.3 GB ($3.00) + 0.03 vCPU ($0.60); volume 1–2 GB ($0.15–0.30); volume backups ($0.15–0.30); PITR bucket + WAL upload ($0.15–0.35); offsite-dump upload egress ($0.25–0.90); user egress ($0.10–0.25) ⇒ **≈ $10.4–11.7 → bill = $20 minimum = €17.09**.
- 1,000 users: app 0.7 GB ($7) + 0.15 vCPU ($3); PG 1 GB ($10) + 0.1 vCPU ($2); volume 10–25 GB ($1.50–3.75); backups ($0.75–2.25); PITR ($0.90–3.10); offsite upload ($2–9); user egress ($0.50–1.25) ⇒ **$28–41 → €23.9–35.0**.
- 10,000 users (2 app replicas, no DB HA): app RAM 1.5–2 GB ($15–20) + 0.6–1.0 vCPU ($12–20); PG 4 GB ($40) + 0.5–1.0 vCPU ($10–20); volume 100–250 GB ($15–37.5); backups ($4.5–15); PITR ($6.5–21); offsite upload, weekly ($3–12); user egress ($5–12.5) ⇒ **$111–198 → €94.9–169.2**. Postgres HA (optional) would add roughly 2× the DB lines (≈ +€85–170, ASSUMPTION).

| Line | 100 registered | 1,000 registered | 10,000 registered |
|---|---|---|---|
| Hosting + database + volume backups + PITR (Railway Pro, EU West) | €17.09 | €23.9–35.0 | €94.9–169.2 |
| Offsite encrypted backups (Scaleway Object Storage) | €0.10–0.30 | €0.5–2.5 | €3–13 |
| Email (Scaleway TEM) | €0.00–0.18 | €2.43 | €7.4–24.9 (30 k–100 k) |
| KMS (Scaleway Key Manager) | €0.09 | €0.36 | €3.06 |
| Monitoring (Sentry EU + uptime) | €0 (free) | €0 (free) | €22–31 (Sentry Team + UptimeRobot Solo) |
| **Infrastructure subtotal** | **€17.3–17.7** | **€27.2–40.3** | **€130.4–241.2** |
| Billing fees (Stripe + Billing, €0.251 per sub-month) | €2.51–5.02 | €25.10–50.20 | €251.0–502.0 |
| **Total** | **€19.8–22.7** | **€52.3–90.5** | **€381–743** |

**Revenue (60 % annual):** ex-VAT €5.160 per subscription-month; after Stripe €4.909.

| Metric | 100 (10 % / 20 % paying) | 1,000 (10 % / 20 %) | 10,000 (10 % / 20 %) |
|---|---|---|---|
| Ex-VAT subscription revenue | €51.60 / €103.20 | €516.02 / €1,032.05 | €5,160.25 / €10,320.49 |
| Net after Stripe fees | €49.09 / €98.18 | €490.92 / €981.85 | €4,909.25 / €9,818.49 |
| Infra cost per registered user | €0.17–0.18 | €0.027–0.040 | €0.013–0.024 |
| Infra cost per paying user | €0.87–1.77 | €0.14–0.40 | €0.07–0.24 |
| Infra as % of ex-VAT revenue | 33.5–34.3 % / 16.8–17.2 % | 5.3–7.8 % / 2.6–3.9 % | 2.5–4.7 % / 1.3–2.3 % |
| Infra + billing fees as % of ex-VAT revenue | 38.4–39.2 % / 21.6–22.0 % | 10.1–12.7 % / 7.5–8.8 % | 7.4–9.5 % / 6.1–7.2 % |

Reading: the $20 Railway floor dominates at 100 users (it is a fixed cost, not per-user); from 1,000 users infrastructure is < 8 % of ex-VAT revenue and billing fees (≈ 4.9 % of revenue) become the largest variable line. Covered by subscriptions from ≈ 4 paying users (€19.8 / €4.91) at launch.

---

## 11. Alternatives priced at each stage (hosting + PITR-capable DB only, EUR/month) and trade-offs

| Option | 100 | 1,000 | 10,000 | Ops burden | Migration effort | Comment |
|---|---|---|---|---|---|---|
| **Railway Pro + Railway PG (recommended)** | 17.1 | 23.9–35.0 | 94.9–169.2 | Low–medium (PG template is unmanaged; PITR/backups/upgrades are clicks) | None | US company; no SLA below Enterprise |
| Railway Pro app + Neon Launch (Frankfurt) | 22–34 | 35–60 (ASSUMPTION) | 125–277 | Low (DB fully managed) | Low (connection string) | Second vendor, cross-site latency, 7-day PITR; dearer at scale |
| DigitalOcean App Platform + Managed PG (FRA1/AMS3) | 21.4–23.1 ($10–12 + $15) | ≈ 47 (ASSUMPTION: $25 app + $30 PG) | ≈ 130–190 (ASSUMPTION) | Low | Medium (new platform, same Dockerfile) | 7-day PITR included in $15 node — best non-Railway managed value |
| Fly.io app (fra) + Fly MPG Basic | ≈ 43 ($6.58 + $38 + storage) | ≈ 75–95 | UNKNOWN | Low–medium | Medium | MPG floor too high for launch |
| Render Standard + Basic-1gb PG | ≈ 38–40 (+ workspace fee UNKNOWN) | UNKNOWN | UNKNOWN | Low | Medium | 3-day PITR on Hobby workspace; low bandwidth allowance |
| Supabase Pro + PITR (+ Railway app) | ≥ 128 | ≥ 128 | ≥ 200 | Low | Medium | PITR add-on $100 kills value |
| Scaleway Serverless Containers + DB-DEV-S | ≈ 24–28 (ASSUMPTION) | ≈ 35–60 | UNKNOWN | Medium | Medium | EU-owned; **PG PITR unconfirmed** |
| Aiven Startup-4 (+ Railway app) | ≈ 81 | ≈ 81 | ≈ 171+ | Low | Low | 2-day PITR only |
| Northflank (service + nf-compute-100-2) | ≈ 31 | UNKNOWN | UNKNOWN | Low–medium | Medium | EU region UNKNOWN |
| Koyeb Pro + PG small | ≈ 51–59 ($29 + $10.71 + $29.76, minus up to $10 included compute) | UNKNOWN | UNKNOWN | Low | Medium | $29 platform fee |
| **Hetzner + Coolify, PG self-managed + pgBackRest → Hetzner Object Storage** | **≈ 13.6** (CX23 5.49 + IPv4 0.50 + backups 1.10 + Object Storage 6.49) | **≈ 17.2–24.3** (1–2 nodes) | **≈ 48–62** (app CX33 + DB CX43 + volume + Object Storage) | **High**: OS/PG patching, TLS, firewall, monitoring, restore drills, on-call — ASSUMPTION 4–8 h/month | Medium–high | Cash saving vs Railway ≈ €4 / €7–11 / €47–107 per month — less than the value of the founder's ops hours until ~10 k users |

Trade-off summary: Railway buys the lowest operational burden and zero migration for a ~€4–100/month premium over self-hosting; DigitalOcean is the like-for-like managed alternative; Hetzner/Scaleway buy EU ownership and lower cash cost with more operations work.

---

## 12. Minimal-change migration path from the current preview (ASSUMPTIONS; no change made)

1. Keep the synthetic PGlite preview on its own project (Hobby is fine for a non-commercial preview); create a **separate production project on Pro**.
2. Set workspace/service region to **EU West Metal (Amsterdam)** before attaching volumes (changing region later migrates the volume with downtime — FACT-P, S3).
3. Add Railway Postgres on a major tag ≥ 16 (e.g. `postgres-ssl:17`), private networking only; create `lilleri_app` role (NOBYPASSRLS, non-owner) for the API; run Drizzle migrations with the owner role as a pre-deploy step.
4. Enable **PITR** (verify the auto-created bucket's region is EU) and **daily + weekly volume backups**.
5. Add a small cron service: `pg_dump | zstd | age -r <public key>` → Scaleway Object Storage (versioned); quarterly restore drill into a scratch service.
6. Move the KEK from `/data/recovery` to Scaleway Key Manager; store only wrapped DEKs in Postgres.
7. Sign the Railway DPA (self-serve), Scaleway DPA (contract terms), Stripe DPA (part of Stripe Services Agreement — ASSUMPTION), Sentry DPA; record sub-processors (Railway → Tigris, etc.) in the RoPA.
8. Set Railway usage alerts / hard limit (FACT-P: cost-control page exists, S1) at ~2× expected spend.

---

## 13. What changes versus the repo's prior assumptions

| Prior assumption (doc) | Now (2026-10-05) | Effect |
|---|---|---|
| Infra floor built on Neon/Fly/Hetzner/R2; rule 13 "Neon Launch to 10 k MAU" (`cost-architecture.md` §2, §6) | Railway Postgres now has native PITR (~4-week window), scheduled volume backups, HA and in-place major upgrades (FACT-P) | Default DB becomes Railway Postgres in the same project; Neon becomes the fallback; at 10 k users Neon is costlier |
| Railway only appeared as "$0.05/GB egress" (`cost-architecture.md` §3) and Hobby $5 for the preview (`railway-preview.md`) | **Hobby is non-commercial**; production needs **Pro $20/mo incl. $20 usage, unlimited seats**; buckets $0.015/GB-mo with free egress/ops | +$15/month fixed at launch; the preview can stay on Hobby while non-commercial |
| Email: Resend Free 3 k/Pro $20, SES $0.16–0.23/1k (`cost-architecture.md` §3) | Resend keeps account data in the US; SES reorganised into plans on 21 Jul 2026, new accounts default to Essentials $0.16/1k and **no SES free tier for new customers** | Recommend Scaleway TEM (EU, €0.25/1k, 300 free); SES Milan as fallback |
| Payment take 8 / 13 / 16 % of ex-VAT and "native IAP at launch" (rule 15; `unit-economics.md` U8) | Web-first Stripe at €6.99/€69.99: **7.05 % monthly, 3.12 % annual, 4.86 % blended** (60 % annual); Paddle 9.8 % blended; stores 15 % | Base U8 13 % is too pessimistic for web checkout; keep 15 % only for the store channel |
| Plus €4.99/€39.99 (`unit-economics.md`) | €6.99/€69.99 (`zero-investment-launch.md`) → net €5.33 / €55.58 per payment, €4.91 per sub-month blended | Confirms the zero-investment doc's €5.33/€55.58 arithmetic |
| "Stripe Tax when OSS registration exists" (rule 15) | Below €10 k/yr cross-border B2C, Italian IVA applies to all EU consumers; manual 22 % inclusive tax rate suffices | Saves 0.5 % until EU expansion |
| Hetzner CX23 €5.49 / CPX22 €19.49 (R-BC) | Consistent with the 15 Jun 2026 adjustment (CX33 €8.49, CX43 €15.99, CAX11 €5.99) | No change; Hetzner Object Storage €6.49 base noted |
| Fly shared-1x 1 GB fra $7.73 (R-BC) | Base $5.70 × fra multiplier 1.154 ≈ $6.58 (FACT-S) | Discrepancy — verify |
| Marginal infra €0.034/MAU Base (U19) | €0.027–0.040 per registered user at 1 k; €0.013–0.024 at 10 k; fixed $20 floor dominates at 100 | Base holds at 1 k; lower at 10 k |
| UptimeRobot/ Sentry as free tiers | UptimeRobot free allows commercial use again (May 2026 ToS); Sentry EU region on all plans | No change in cost |

---

## 14. Open items to verify (UNKNOWN)

1. Region of Railway's auto-created PITR bucket (must be EU: Tigris ams/fra), whether pgBackRest repo encryption is enabled, and where Railway stores logs/metrics (trust.railway.com sub-processors).
2. Railway volume billing basis (used vs provisioned) and whether PITR is available on all paid plans.
3. Scaleway: post-1-Jun-2026 prices for Managed DB, Serverless, Object Storage; Managed PG PITR; Key Manager data-key API; Topics & Events (SNS) pricing used by TEM webhooks.
4. Amazon SES: whether a new account can switch from Essentials to à-la-carte $0.10/1k.
5. Stripe Managed Payments availability for Italian sellers; Paddle's 50¢ currency treatment for EUR prices.
6. Italian invoicing/corrispettivi obligations for B2C electronic services sold via Stripe vs via an MoR (commercialista).
7. Crunchy Bridge status post-acquisition; Render workspace fees; Northflank EU region; OVHcloud Managed PG prices.
8. TEM inbox placement on Italian mailbox providers (seed test during beta).

---

## 15. Sources (all checked 2026-10-05)

| ID | Source | URL | Access | Reliability | Used for |
|---|---|---|---|---|---|
| S1 | Railway — Pricing Plans | https://docs.railway.com/pricing/plans | Railway docs tool (first-hand) | high | Plans, limits, unit prices, included usage |
| S2 | Railway — Pricing overview | https://docs.railway.com/pricing | first-hand | high | Hobby "personal projects", Pro "production" |
| S3 | Railway — Regions | https://docs.railway.com/deployments/regions | first-hand | high | EU West Metal Amsterdam; volume migration |
| S4 | Railway — Point-in-Time Recovery | https://docs.railway.com/volumes/point-in-time-recovery | first-hand | high | PITR mechanism, window, cost, limits |
| S5 | Railway — Backups | https://docs.railway.com/volumes/backups | first-hand | high | Volume backup schedules/pricing |
| S6 | Railway — Storage Buckets; Buckets billing | https://docs.railway.com/storage-buckets ; https://docs.railway.com/storage-buckets/billing | first-hand | high | $0.015/GB-mo, free ops/egress, no SSE/versioning |
| S7 | Railway — Compliance (DPA, SOC 2, DORA) | https://docs.railway.com/enterprise/compliance | first-hand | high | DPA, certifications |
| S8 | Railway — PostgreSQL; Major upgrades | https://docs.railway.com/databases/postgresql ; https://docs.railway.com/databases/postgresql-major-upgrade | first-hand | high | Unmanaged template, variables, upgrades |
| S9 | Railway — compare to Vercel FAQ | https://docs.railway.com/platform/compare-to-vercel | first-hand | high | Pro unlimited seats |
| S10 | Railway Central Station — Hobby non-commercial ToS | https://station.railway.com/questions/terms-of-service-only-non-commercial-us-8302c41c ; https://station.railway.com/questions/commercial-usage-using-hobby-plan-7fd8cf69 | search summary | medium | Hobby commercial restriction |
| S11 | Railway — Support (SLA) | https://docs.railway.com/platform/support | first-hand | high | SLA only Enterprise |
| S12 | Fly.io — Resource pricing | https://fly.io/docs/about/pricing/ ; https://fly.io/pricing.md | search summary | medium | Machine, regional multipliers, volume, egress |
| S13 | Fly.io — Managed Postgres | https://fly.io/docs/mpg ; https://fly.io/mpg | search summary | medium | MPG plans |
| S14 | Render — pricing, PITR, plan changes | https://render.com/pricing ; https://render.com/docs/postgresql-backups ; https://render.com/docs/new-workspace-plans | search summary | medium-low | Instances, PG, PITR window, bandwidth |
| S15 | Hetzner — Price adjustment 15 Jun 2026 | https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/ | search summary | medium | CX/CAX/CPX prices |
| S16 | Hetzner — IPv4 pricing | https://docs.hetzner.com/general/infrastructure-and-availability/ipv4-pricing | search summary | low-medium | IPv4 €0.50, backups 20 % |
| S17 | Hetzner Object Storage (third-party) | https://sliplane.io/blog/cheap-object-storage-providers-europe | search summary | low-medium | €6.49 incl. 1 TB |
| S18 | Scaleway — Managed Databases pricing | https://www.scaleway.com/en/pricing/managed-databases/ ; https://hoststack.dev/blog/scaleway-postgresql-pricing-2026 | search summary | low | DB-DEV-S/PLAY2-PICO |
| S19 | Scaleway — pricing update (1 Jun 2026) | https://www.scaleway.com/en/blog/a-transparent-update-on-scaleway-pricing/ | search summary | medium | Price increase date |
| S20 | Scaleway — Serverless / Instances pricing | https://www.scaleway.com/en/pricing/serverless/ ; https://www.scaleway.com/en/pricing/virtual-instances/ | search summary | medium | Container/instance prices |
| S21 | Scaleway — TEM capabilities & limits, plans | https://www.scaleway.com/en/docs/transactional-email/reference-content/tem-capabilities-and-limits/ ; https://www.scaleway.com/en/docs/transactional-email/how-to/manage-tem-plans/ ; https://www.scaleway.com/en/pricing/managed-services/ | search summary | medium | TEM prices, quotas |
| S22 | Scaleway — TEM API | https://www.scaleway.com/en/developers/api/transactional-email/ | Context7 (official schema) | high | Endpoint, header, body |
| S23 | Scaleway docs-content — TEM webhooks, domain auth | https://github.com/scaleway/docs-content/blob/main/pages/transactional-email/api-cli/use-webhooks-with-sns-topics.mdx ; https://github.com/scaleway/docs-content/blob/main/pages/transactional-email/quickstart.mdx | Context7 | high | Webhooks, SPF/DKIM/MX/DMARC |
| S24 | Scaleway — Key Manager pricing/FAQ | https://www.scaleway.com/en/pricing/security-and-account/ ; https://www.scaleway.com/en/docs/key-manager/faq/ | search summary | medium | €0.06/key version, €0.03/10 k ops, HSM |
| S25 | Scaleway Object Storage (third-party) | https://www.iloveblogs.blog/post/scaleway-object-storage-vs-aws-s3-eu-pricing | search summary | low | Storage price (conflicting) |
| S26 | OVHcloud VPS increase | https://digitiz.fr/hausse-prix-vps-2026/ ; https://agentdeals.dev/vendor/ovhcloud | search summary | low | VPS-1 €7.79 |
| S27 | Koyeb pricing (third-party) | https://sliplane.io/blog/5-awesome-koyeb-alternatives ; https://getdeploying.com/heroku-vs-koyeb | search summary | low | Pro $29, instances |
| S28 | Northflank pricing (third-party) | https://www.budgetforge.dev/tools/northflank-pricing-2026 | search summary | low | Unit prices |
| S29 | DigitalOcean — App Platform pricing | https://docs.digitalocean.com/products/app-platform/details/pricing/ | search summary | medium | $12/$10 1 GB containers |
| S30 | DigitalOcean — Managed PostgreSQL pricing/limits | https://docs.digitalocean.com/products/databases/postgresql/details/pricing/ ; https://docs.digitalocean.com/products/databases/postgresql/details/limits/ | search summary | medium | $15/$30 nodes, 7-day PITR |
| S31 | Neon — pricing, regions, GDPR | https://neon.com/pricing ; https://neon.com/docs/introduction/regions ; https://neon.com/blog/gdpr-compliance-and-neon | search summary | medium | CU/storage/restore prices, EU regions |
| S32 | Supabase pricing (third-party) | https://makerkit.dev/blog/saas/supabase-pricing ; https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/ | search summary | medium-low | Pro $25, PITR $100 |
| S33 | Aiven — pricing, Developer tier | https://aiven.io/pricing?product=pg ; https://aiven.io/blog/new-developer-tier-for-aiven-for-postgres | search summary | medium | Plans and PITR windows |
| S34 | Crunchy Bridge (third-party) | https://www.costbench.com/software/database-as-service/crunchy-bridge/ | search summary | low | Hobby-2/Standard-4 |
| S35 | Xata pricing | https://xata.io/pricing.md | search summary | medium-low | micro instance, EU ×1.15 |
| S36 | Amazon SES — pricing plans (21 Jul 2026) | https://aws.amazon.com/ses/pricing/ ; https://aws.amazon.com/about-aws/whats-new/2026/07/amazon-ses-pricing-plans/ ; https://aws.amazon.com/blogs/messaging-and-targeting/introducing-amazon-simple-email-service-ses-pricing-plans/ | search summary | medium | Essentials/Pro/Enterprise, free tier end |
| S37 | Amazon SES in EU (Milan) | https://aws.amazon.com/about-aws/whats-new/2021/03/amazon-simple-email-service-is-now-available-in-the-eu-milano-and-africa-cape-town-regions | search summary | medium | eu-south-1 availability |
| S38 | Postmark — pricing, EU privacy | https://postmarkapp.com/pricing ; https://postmarkapp.com/euprivacy ; https://automationatlas.io/answers/postmark-pricing-explained-2026/ | search summary | medium-low | Tiers, US-only data |
| S39 | Resend — pricing, regions | https://resend.com/pricing ; https://www.resend.com/docs/dashboard/domains/regions.md | search summary | medium | Tiers, US account data |
| S40 | Brevo (third-party) | https://costbench.com/software/email-api/brevo-transactional/ ; https://marcandrews.com/is-brevo-gdpr-compliant-uk-business-guide-for-2024/ | search summary | low | Free 300/day, EU hosting |
| S41 | Mailgun (third-party + GDPR page) | https://automationatlas.io/answers/mailgun-pricing-explained-2026/ ; https://www.mailgun.com/resources/learn/gdpr/ | search summary | low-medium | Tiers, EU region |
| S42 | SendGrid (third-party) | https://automationatlas.io/answers/sendgrid-pricing-explained-2026/ | search summary | low | No free plan, Essentials |
| S43 | Mailjet — pricing update, data security | https://documentation.mailjet.com/hc/en-us/articles/25750983876763-Mailjet-Subscription-Pricing-Update-September-9-2026 ; https://www.mailjet.com/products/data-security-and-privacy/ | search summary | medium | Free 6 k, EU hosting |
| S44 | Stripe Italia — pricing | https://stripe.com/it/pricing (also `docs/business/zero-investment-launch.md`, read 2026-10-03) | search summary + repo | medium | 1.5 % + €0.25 etc. |
| S45 | Stripe Billing / Tax pricing | https://stripe.com/billing/pricing ; https://stripe.com/tax/pricing ; https://erpresearch.com/erp-add-ons/billing-subscriptions/stripe-billing/pricing | search summary | medium | 0.7 %, 0.5 % |
| S46 | Stripe Managed Payments pricing | https://support.stripe.com/questions/managed-payments-pricing ; https://stripe.com/managed-payments | search summary | medium | +3.5 % add-on |
| S47 | Stripe API — Checkout Sessions, Portal sessions, Webhooks, Billing webhooks | https://docs.stripe.com/api/checkout/sessions ; https://docs.stripe.com/api/customer_portal/sessions ; https://docs.stripe.com/webhooks ; https://docs.stripe.com/billing/subscriptions/webhooks | Context7 (official) | high | API spec file |
| S48 | Paddle — fees, VAT, payouts | https://www.paddle.com/pricing ; https://www.paddle.com/help/manage/get-paid/should-i-charge-paddle-vattax-for-payouts ; https://paddle.com/help/sell/tax/how-paddle-handles-vat-on-your-behalf | search summary | medium | 5 % + 50¢, reverse invoice |
| S49 | Lemon Squeezy status (third-party) | https://fungies.io/lemon-squeezy-stripe-acquisition-saas-founders-2026/ | search summary | low | Transition to Stripe MP |
| S50 | Mollie pricing | https://www.mollie.com/pricing | search summary | low-medium | 1.8 % + €0.25 |
| S51 | Apple — EU changes Aug 2026; Small Business Program | https://www.apple.com/hr/newsroom/2026/08/apple-announces-changes-for-apps-in-the-european-union/ ; https://developer.apple.com/app-store/small-business-program/ | search summary | medium | 15 %, EU CTC 5 % |
| S52 | Google Play service fees | https://support.google.com/googleplay/android-developer/answer/112622 | search summary | medium | 10 % + 5 % billing |
| S53 | EU VAT €10 k threshold / OSS | https://www.vatcalc.com/?p=6149 (Directive 2006/112/EC art. 59c) | search summary | medium | OSS duty |
| S54 | AWS KMS pricing | https://aws.amazon.com/kms/pricing/ ; https://cloudburn.io/blog/aws-kms-pricing | search summary | medium | $1/key, $0.03/10 k, 20 k free |
| S55 | Google Cloud KMS pricing | https://cloud.google.com/kms/pricing | search summary | medium | $0.06/version, $0.03/10 k |
| S56 | Cloudflare R2 pricing | https://developers.cloudflare.com/r2/pricing/ | search summary | medium | $0.015/GB, free tier |
| S57 | Backblaze B2 (third-party) | https://costbench.com/software/cloud-infrastructure/backblaze-b2/ | search summary | low | ~$6.95/TB |
| S58 | Sentry — pricing, EU data region | https://sentry.io/pricing/ ; https://docs.sentry.io/organization/data-storage-location/ | search summary | medium | Free/Team, Frankfurt |
| S59 | Better Stack (third-party) | https://hyperping.com/blog/betterstack-pricing | search summary | low-medium | Free 10 monitors, Responder |
| S60 | UptimeRobot (third-party) | https://notifier.so/guides/uptimerobot-pricing-2026/ ; https://dev.to/velprove/uptimerobot-commercial-use-free-alternatives-for-business-sites-in-2026-5d75 | search summary | low-medium | Commercial use, Solo price |
| S61 | Tigris regions | https://www.tigrisdata.com/docs/concepts/regions | search summary | medium | ams/fra availability |
| S62 | Repo documents | `docs/business/cost-architecture.md`, `docs/business/unit-economics.md`, `docs/business/zero-investment-launch.md`, `docs/operations/railway-preview.md` | read | — | Prior assumptions (§13) |
