# Production release runbook (hosted service)

**Date:** 2026-10-05. **Scope:** the hosted Lilleri service started by
`apps/api/dist/server-hosted.js` from [`deploy/production.Dockerfile`](../../deploy/production.Dockerfile).
The synthetic preview (root `Dockerfile`, `tools/preview`) is unchanged and stays a separate,
non-commercial Railway service. Provider choices and costs:
[value for money](../business/value-for-money-20261005.md).

## 1. What the hosted service runs

| Concern | Implementation | Code |
| --- | --- | --- |
| HTTP | One Fastify process on `0.0.0.0:$PORT` serving the API, the legal pages and the compiled Expo web app from the same HTTPS origin | `hosted-server.ts`, `web-app.ts` |
| Identity | Email + password (≥ 12 chars), mandatory email verification, password recovery, optional passkeys and TOTP, 30-day Secure/HttpOnly/SameSite=Strict cookies | `identity.ts` (hosted mode) |
| Email | Scaleway Transactional Email (default) or Resend | `identity-mail.ts` |
| Database | PostgreSQL ≥ 16; migrations run at startup under an advisory lock; financial requests use `SET LOCAL ROLE lilleri_runtime` with forced row-level security, or a separate runtime login if `DATABASE_RUNTIME_URL` is set | `packages/database` |
| Encryption | Per-profile data keys; each wrapping key sealed with `LILLERI_VAULT_MASTER_KEY` and stored on the `/data` volume, never in PostgreSQL | `encryption-local.ts` (`createSealedVolumeKeyManagement`) |
| Deletion | Profile deletion destroys the profile's keys (crypto-erasure of every database copy and backup); source erasure journal on `/data` is replayed at startup | `source-erasure*.ts` |
| Bank access | Enable Banking redirect flow (`POST /v1/bank/authorizations` → bank → `GET /connect/bank/callback`), resumable sync jobs, daily unattended refresh, revocation outbox | `bank-connections.ts`, `live-provider-guard.ts`, `packages/financial-providers/src/enable-banking.ts` |
| Subscriptions | Stripe Checkout, Customer Portal and signed webhooks at `POST /webhooks/stripe`; Plus entitlement gates every bank read; Plus is offered only while a bank provider is configured and `BANK_MAX_ACTIVE_CONNECTIONS` has room (`plus_unavailable` otherwise) | `billing.ts` |
| Subscription cancellation on deletion | Before erasure the Stripe customer and open subscriptions are armed in `billing_cancellations` (no foreign key, trusted only); after the deletion commits every open subscription is cancelled immediately; a Stripe failure is retried every 5 minutes with exponential backoff (log `billing_cancellation_deferred`) | `billing.ts`, `hosted-server.ts` |
| Legal | `/legal/privacy`, `/legal/terms` (+ `/en`), rendered with the operator's company details | `legal-pages.ts` |
| Health | `GET /health` → `{"status":"ok","mode":"hosted"}`; also answered for `healthcheck.railway.app` | `app.ts` |

## 2. Accounts to open (owner: founder; never paste secrets in chat or Git)

1. **Railway Pro** workspace; new project (do not reuse the preview project) in **EU West (Amsterdam)**.
2. **Scaleway** organisation: Transactional Email in `fr-par`; add and verify the sending domain
   (SPF, DKIM, MX, DMARC); create an IAM application with `TransactionalEmailEmailFullAccess` on the
   project; generate an API key.
3. **Stripe** account (Italy): create product "Lilleri Plus" with two EUR prices, tax-inclusive:
   €6.99 monthly and €69.99 yearly; enable the Customer Portal (cancel at period end, update payment
   method); set the public terms URL `https://<domain>/legal/terms` in Checkout settings; add a
   webhook endpoint `https://<domain>/webhooks/stripe` pinned to API version
   `2025-09-30.clover` with these events: `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `customer.subscription.paused`,
   `customer.subscription.resumed`, `customer.subscription.trial_will_end`, `invoice.paid`,
   `invoice.payment_failed`;
   enable customer email receipts for successful payments and refunds (the terms promise a
   confirmation on a durable medium).
4. **Enable Banking** application (control panel): generate the RSA key pair (keep the private key),
   register the redirect URL `https://<domain>/connect/bank/callback`, select AIS. Start in
   **restricted production** with your own linked accounts (free, personal evaluation); request the
   commercial quote before inviting other users (see the value-for-money document §5).
5. A domain (e.g. `app.lilleri.it`) pointed at the Railway service (Railway custom domain + TLS).

## 3. Railway configuration

Services in the production project:

- **PostgreSQL** (Railway template, major version ≥ 16), private networking only. Enable
  **Point-in-Time Recovery** and daily/weekly backups. Verify the PITR bucket region is in the EU.
- **lilleri** (this repository, production branch):
  - Variable `RAILWAY_DOCKERFILE_PATH=deploy/production.Dockerfile`.
  - Volume mounted at **`/data`** (vault + erasure journal). Enable volume backups. Keep **one
    replica** (the volume and the in-process sync scheduler assume a single instance).
  - Healthcheck path `/health`, timeout 300 s, draining 30 s, memory limit ≥ 2 GB during builds.
  - Custom domain; set `PUBLIC_BASE_URL` to exactly `https://<domain>` (no path, no trailing slash).

### Environment variables

| Variable | Required | Value / format |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` (set by the image) |
| `PUBLIC_BASE_URL` | yes | `https://<domain>` |
| `HOSTED_AUTH_SECRET` | yes | ≥ 32 random characters, e.g. `openssl rand -base64 48` |
| `LILLERI_VAULT_MASTER_KEY` | yes | 32 random bytes, base64url without padding: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. **Back it up offline**: without it the encrypted fields cannot be read. |
| `DATABASE_URL` | yes | Railway reference `${{Postgres.DATABASE_URL}}` (private `*.railway.internal` host). Public hosts require `sslmode=require` or stricter. |
| `DATABASE_RUNTIME_URL` | optional | Separate non-owner login with `NOBYPASSRLS` (hardening; see §6) |
| `IDENTITY_MAIL_PROVIDER` | yes | `scaleway` (or `resend`) |
| `IDENTITY_MAIL_API_KEY` | yes | Scaleway API secret key (or Resend API key) |
| `IDENTITY_MAIL_PROJECT_ID` | Scaleway | Scaleway project UUID |
| `IDENTITY_MAIL_FROM` | yes | Verified sender, e.g. `accesso@mail.<domain>` |
| `LEGAL_ENTITY_NAME`, `LEGAL_ENTITY_ADDRESS`, `LEGAL_ENTITY_VAT`, `LEGAL_CONTACT_EMAIL`, `LEGAL_PRIVACY_EMAIL` | yes | Operator's legal details shown in the privacy notice and terms |
| `LEGAL_DPO_EMAIL`, `LEGAL_PEC`, `LEGAL_REA` | optional | Shown only when set |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` | for Plus | `sk_live_…`/`rk_live_…`, `whsec_…`, `price_…` (all four or none) |
| `STRIPE_TAX_RATE` | optional | Inclusive IVA tax rate `txr_…` attached to the Plus line item (omit when Stripe Tax computes IVA) |
| `ENABLE_BANKING_APPLICATION_ID` | for banks | Application id (JWT `kid`) |
| `ENABLE_BANKING_PRIVATE_KEY_BASE64` | for banks | Base64 of the PEM private key (`base64 -w0 key.pem`); alternatively `ENABLE_BANKING_PRIVATE_KEY` with `\n` escapes |
| `ENABLE_BANKING_ENVIRONMENT` | for banks | `production` or `sandbox` (must match the application) |
| `BANK_COUNTRIES` | optional | Comma list, default `IT` |
| `BANK_MAX_ACTIVE_CONNECTIONS` | recommended | Cost guard: maximum simultaneously active bank connections covered by the contract |
| `BANK_INITIAL_HISTORY_DAYS` | optional | Default 90 (1–730) |
| `HEALTHCHECK_HOSTS` | optional | Default `healthcheck.railway.app` |
| `INTERNAL_ACCESS_TOKEN` | optional | ≥ 32 characters; enables `/internal/metrics` and `/internal/observability` with `Authorization: Bearer <token>`. Without it those pages are not served. |
| `PAYLOAD_RETENTION_*` | optional | See `payload-retention.md` |

Startup refuses `DEMO_MODE=1`, `LOCAL_AUTH_MODE=1`, `PGLITE_PATH`, local vault paths and
`NODE_TLS_REJECT_UNAUTHORIZED=0`, and logs only the *name* of a missing or invalid variable.

## 4. Release checklist

1. `pnpm install --frozen-lockfile && pnpm check && pnpm build` on the release commit (all green),
   then the browser proof of the hosted image: `node tools/production/build.mjs` followed by
   `node tools/production/hosted-ui-smoke.cjs <screenshot-dir> [chromium-path]` (sign-up with email
   verification, legal pages, Plus checkout with a signed webhook, bank picker → bank → callback →
   first synchronisation, all against local fakes; must print `PASS 4 hosted browser groups`).
2. Deploy; wait for the healthcheck; check logs for `bank_provider_check` (`active`, `environmentMatches`
   and `redirectRegistered` must all be `true` once Enable Banking is configured).
3. Open `https://<domain>/legal/privacy` and `/legal/terms`; confirm the company details.
4. Sign up with a real mailbox, verify the email, sign in, enable TOTP, sign out/in.
5. Stripe test mode first (`sk_test_…` + test webhook secret): buy monthly with card `4242…`, confirm
   the plan becomes Plus within seconds, open the portal, cancel, confirm `cancelAtPeriodEnd`.
6. Bank: with the restricted Enable Banking application, connect your own bank, confirm accounts,
   balance and recent transactions appear; disconnect and confirm the session is deleted.
7. Export the archive, delete the profile, confirm the deletion certificate and that the subscription
   was cancelled in Stripe (Dashboard → Customers: status *Canceled*, no further invoice) and that
   no `billing_cancellations` row is left (`SELECT count(*) FROM billing_cancellations`).
8. Switch Stripe to live keys and Enable Banking to the activated application only after counsel's
   opinion and the signed quote (value-for-money §5–6).

## 5. Operations

- **Backups/restore:** PostgreSQL PITR + volume backups. A database restore must be paired with the
  current `/data` vault and journal; startup replays deletion tombstones and the source-erasure
  journal before serving traffic. Never restore an old `/data` over a newer database.
- **Key loss:** losing `LILLERI_VAULT_MASTER_KEY` or the `/data` volume makes encrypted fields
  unreadable; keep an offline copy of the master key and volume backups.
- **Scaling:** one instance handles the expected 10,000-user load; scale vertically. Horizontal scaling
  requires moving the vault/journal off the local volume first.
- **Cost guard:** raise `BANK_MAX_ACTIVE_CONNECTIONS` only together with the provider contract.
- **Owed cancellations:** a `billing_cancellation_deferred` log line means Stripe could not confirm
  the cancellation of a deleted profile's subscription; it is retried automatically (backoff up to
  6 hours). Rows in `billing_cancellations` with `attempts > 3` need a look at the Stripe status page
  or the API key; never delete such a row by hand before the subscription is cancelled in Stripe.

## 6. Known limits (honest status)

- The Enable Banking adapter is tested against the documented API with recorded-shape fakes; the
  first real-bank run happens in restricted mode with the founder's accounts (no credentials were
  available to this implementation).
- A separate PostgreSQL runtime login is optional; without it the API uses the owner connection with
  `SET LOCAL ROLE lilleri_runtime` (row-level security still enforced per request).
- Native iOS/Android builds are not part of this release; the web app runs in desktop and mobile browsers.
- Legal texts must be reviewed by Italian counsel before publication; see the review list in
  `apps/api/src/legal-pages.ts`.
