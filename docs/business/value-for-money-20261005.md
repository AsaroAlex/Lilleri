# Best value for money: providers and launch economics (2026-10-05)

**Decision owner:** founder. **Prepared:** 2026-10-05. **Founder constraint (2026-10-05):** no fixed
monthly budget for hosting, email or bank access, *as long as the service is profitable through user
subscriptions*. This document supersedes the provider ranking in
[ADR-0007](../adr/0007-open-banking-provider-strategy.md) and the infrastructure defaults in
[cost-architecture](cost-architecture.md); it keeps the Gratis/Plus ladder and prices of the
[zero-investment launch](zero-investment-launch.md).

Evidence: [open-banking value review](../research/open-banking-value-20261005.md),
[Enable Banking API](../research/enable-banking-api-20261005.md),
[infrastructure and billing review](../research/infrastructure-billing-value-20261005.md),
[email and billing APIs](../research/email-billing-api-20261005.md). The session's network proxy
blocked direct page fetches of most vendor sites; prices come from first-party search excerpts,
Context7 mirrors of official docs and the Railway documentation tool. Labels follow ADR-0001.

## 1. Decisions

| Area | DECISION | Why (value for money) | Fallback |
| --- | --- | --- | --- |
| Bank access (AIS) | **Enable Banking** under its own FIN-FSA AISP registration | Self-serve; **free restricted mode for the founder's own accounts**; best-documented 2026 Italian coverage incl. card accounts (Banco BPM, BPER Carte, Postepay, MPS, BNL, Fineco, ING, Widiba, Credem, Hype, Sella, N26, Revolut); small JWT API; per-accessed-account pricing | Yapily (Connect licence, sales-led price, existing sandbox code); finAPI as public price benchmark |
| Hosting | **Railway Pro**, EU West (Amsterdam), one service from `deploy/production.Dockerfile` | $20/month includes $20 usage; Hobby is non-commercial; no migration from today's Railway workflow | DigitalOcean App Platform + Managed PostgreSQL (FRA1/AMS3) |
| Database | **Railway PostgreSQL ≥ 16** in the same project, private network, PITR enabled | Native PITR (~4 weeks) and scheduled backups billed as storage only | Neon (Frankfurt) |
| Encryption keys | **Sealed volume vault** (`LILLERI_VAULT_MASTER_KEY` secret + per-DEK wrapping keys on the service volume) | €0; keys are never in the database or its backups, so profile deletion crypto-erases every database copy | Scaleway Key Manager (≈€0.09–3/month) if a hardware-backed KEK becomes a requirement |
| Email | **Scaleway Transactional Email** (Paris) | EU processing; 300 emails/month free, then €0.25 per 1,000 | Resend adapter (already implemented; US-stored account data) |
| Billing | **Stripe Checkout + Billing + Customer Portal**, prices with Italian VAT included | Lowest fee for an Italy-first web launch: net **€5.33** per €6.99 month, **€55.58** per €69.99 year | Paddle (merchant of record, ≈5% less net revenue) |
| Monitoring | Railway logs/metrics; optional Sentry EU free tier and UptimeRobot free | €0 at launch | Better Stack |

## 2. Unit revenue (FACT for Stripe list prices; ASSUMPTION for the 60% annual share)

| Item | Monthly plan | Annual plan |
| --- | --- | --- |
| Price incl. 22% VAT | €6.99 | €69.99 |
| Net of VAT | €5.73 | €57.37 |
| Stripe 1.5% + €0.25 and Billing 0.7% | −€0.40 | −€1.79 |
| **Net per payment** | **€5.33** | **€55.58 (= €4.63/month)** |
| Blended net per paying user-month (60% annual) | **€4.91** | |

## 3. Monthly cost and profit at 100 / 1,000 / 10,000 registered users

Infrastructure ranges come from the infrastructure review §10 (Railway usage is an estimate built on
first-party unit prices). Bank access is **2 linked accounts per paying user**. Enable Banking does
not publish its prices: "low/base/high" are the research ranges (€0.10/€0.25/€0.50 per account per
month with a €300/€750/€2,000 monthly minimum invoice). Only paying (Plus) users get bank access;
Gratis users cost only infrastructure. Stripe fees are already netted in the revenue line.

| Registered users | Paying (share) | Net revenue | Infrastructure + email + keys | Bank access low / base / high | **Profit low / base / high** |
| --- | --- | --- | --- | --- | --- |
| 100 | 10 (10%) | €49 | €17–18 | €300 / €750 / €2,000 | −€268 / −€718 / −€1,968 |
| 100 | 20 (20%) | €98 | €17–18 | €300 / €750 / €2,000 | −€219 / −€669 / −€1,919 |
| 1,000 | 100 (10%) | €491 | €27–40 | €300 / €750 / €2,000 | **+€151–164** / −€286–299 / −€1,536–1,549 |
| 1,000 | 200 (20%) | €982 | €27–40 | €300 / €750 / €2,000 | **+€642–655 / +€192–205** / −€1,045–1,058 |
| 10,000 | 1,000 (10%) | €4,910 | €130–241 | €300 / €750 / €2,000 | **+€4,369–4,480 / +€3,919–4,030 / +€2,669–2,780** |
| 10,000 | 2,000 (20%) | €9,820 | €130–241 | €400 / €1,000 / €2,000 | **+€9,179–9,290 / +€8,579–8,690 / +€7,579–7,690** |

Without bank access (Plus not yet delivering it) the same service is profitable at every size:
+€31 (100 users, 10% paying), +€451 (1,000) and +€4,669 (10,000) per month.

**Reading.** Hosting, database, email and keys are a small fixed cost (Railway's $20 floor is covered
by 4 subscribers). The **only** line that can make the business unprofitable is the bank-access
minimum invoice. Each paying user contributes €4.71 / €4.41 / €3.91 after their own two accounts,
so bank access pays for itself from **≈72 / 179 / 522 paying users** (low / base / high minimum,
including ~€40 infrastructure).

## 4. How the software keeps the launch profitable

1. **Bank access is a Plus entitlement enforced on the server** (`apps/api/src/live-provider-guard.ts`):
   every provider read checks the profile's plan first, so a lapsed subscription stops costing money
   immediately; background refresh only visits profiles with an active connection and skips users
   inactive for 14 days (`inactiveAfterDays`).
2. **Contracted capacity guard:** `BANK_MAX_ACTIVE_CONNECTIONS` caps simultaneously active bank
   connections to what the contract's minimum invoice includes. New users then see a calm waitlist
   message instead of creating unbudgeted cost.
3. **One bank read per refresh:** the Enable Banking adapter fetches balances and the whole history
   window once per snapshot (PSD2 allows banks to limit unattended access to four per day), and
   unattended refresh runs at most once a day.
4. **Gratis stays free forever** (manual accounts, CSV/XLSX import, rules, export, deletion) and has
   no third-party cost.

## 5. Launch sequence (DECISION, reversible)

1. Deploy the hosted service with Stripe, email and legal pages; Plus can be sold only once bank
   access is active (no pre-sale of an undelivered benefit, as in the zero-investment decision).
2. Create the Enable Banking application and connect the founder's own accounts in **restricted
   production** (free; personal evaluation only) to measure Italian field quality.
3. Request the Enable Banking quote with: minimum invoice ≤ €300/month for the first year, ≤ €0.20
   per account per month, no setup fee, monthly termination after 12 months.
4. Activate unrestricted production and Plus sales when the signed quote's minimum is covered:
   set `BANK_MAX_ACTIVE_CONNECTIONS` to the accounts included in the minimum ÷ 2 (two accounts per
   connection on average) and raise it as paying users grow.
5. Revisit price and provider when the quote is known: at the base estimate (€750 minimum) Plus needs
   ≈179 subscribers; if the quote is higher, compare Yapily and finAPI on the same table before
   signing.

## 6. Open items (UNKNOWN)

- Enable Banking minimum invoice, per-account price, contract term (sales quote).
- Banca d'Italia's view on an unlicensed Italian consumer app receiving AIS data under another
  provider's licence; Italian counsel opinion required before unrestricted production.
- Railway PITR bucket region (must be EU) and volume billing basis; Italian invoicing/corrispettivi
  duties for B2C digital services (commercialista); Scaleway TEM deliverability to Italian mailboxes.
