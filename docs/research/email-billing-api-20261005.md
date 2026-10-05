# Lilleri — adapter integration spec: Scaleway TEM (email) and Stripe (subscriptions)

**Compiled:** 2026-10-05. **Companion to:** [`infrastructure-billing-value-20261005.md`](infrastructure-billing-value-20261005.md).
**Evidence:** Scaleway TEM and Stripe API details below come from the official documentation via Context7 mirrors (FACT-P, high) unless a line is marked **ASSUMPTION** (from prior knowledge of the vendor docs, not re-read this pass) or **UNKNOWN** (verify before coding). Direct web access to the vendor sites was blocked by the session proxy, so verify marked items on the live pages.

---

## 0. Ports the adapters should implement (proposal, ASSUMPTION)

```ts
// packages/api (proposal only; no repository file was changed)
export interface TransactionalEmailPort {
  send(msg: {
    to: { email: string; name?: string };
    subject: string;
    text: string;               // always send a text part
    html?: string;
    category: 'verify_email' | 'password_reset' | 'security_notice' | 'billing' | 'digest';
    replyTo?: string;
    listUnsubscribe?: string;   // only for non-essential notifications
    outboxId: string;           // our idempotency key (unique row in an outbox table)
  }): Promise<{ providerMessageId: string; status: 'queued' | 'sent' }>;
}

export interface BillingPort {
  createCheckout(input: { userId: string; plan: 'plus_monthly' | 'plus_yearly'; locale: 'it' | 'en' }): Promise<{ url: string }>;
  createPortal(input: { userId: string; returnUrl: string }): Promise<{ url: string }>;
  handleWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<void>;
}
```

Rules: never put balances, transactions or IBANs in email bodies; grant/revoke Plus only from verified webhooks (never from the browser redirect); keep the provider IDs (`cus_…`, `sub_…`, TEM email `id`) in our database.

---

## 1. Email — Scaleway Transactional Email (TEM)

### 1.1 One-time setup

| Step | Detail | Label / source |
|---|---|---|
| Region | `fr-par` (API path `/regions/fr-par/`) | FACT-P (E1, E3) |
| Domain | Add sending domain (e.g. `mail.lilleri.it`) in TEM; publish **SPF, DKIM, MX and DMARC** records exactly as shown in the console; sending requires them | FACT-P (E4) |
| Credentials | Create an IAM *application* + policy scoped to the Lilleri project with permission set **`TransactionalEmailEmailFullAccess`** (separate `TransactionalEmailDomain*` sets exist); generate an API key and use its **secret key** as the auth token | FACT-P permission-set names (E5); least-privilege mapping is ASSUMPTION |
| Plan | Essential (PAYG): 300 free emails/month then €0.25/1,000; max 5 domains, 1 webhook per domain, default 10 recipients/email, 2 MB per API email, no hourly quota | FACT-S medium (research S21) |
| Project ID | Required in every send body (`project_id`) | FACT-P (E1) |

### 1.2 Send an email

```
POST https://api.scaleway.com/transactional-email/v1alpha1/regions/fr-par/emails
X-Auth-Token: <SCW_SECRET_KEY>
Content-Type: application/json
```

Request JSON (all fields as documented; `from`, `to`, `subject`, `project_id` required; at least one of `text`/`html`):

```json
{
  "from": { "email": "no-reply@mail.lilleri.it", "name": "Lilleri" },
  "to": [ { "email": "utente@example.it", "name": "Mario Rossi" } ],
  "cc": [],
  "bcc": [],
  "subject": "Conferma il tuo indirizzo email",
  "text": "Ciao Mario, conferma il tuo indirizzo: https://app.lilleri.it/verifica?token=…",
  "html": "<p>Ciao Mario, <a href=\"https://app.lilleri.it/verifica?token=…\">conferma il tuo indirizzo</a>.</p>",
  "project_id": "<SCW_PROJECT_ID>",
  "attachments": [],
  "send_before": "2026-10-05T12:34:56Z",
  "additional_headers": [
    { "key": "Reply-To", "value": "supporto@lilleri.it" },
    { "key": "X-Lilleri-Outbox-Id", "value": "<outboxId>" }
  ]
}
```

- `attachments[]`: `{ "name": "...", "type": "<MIME>", "content": "<base64>" }` (FACT-P, E1).
- `send_before`: RFC 3339 deadline after which TEM stops trying (FACT-P field, E2; exact semantics ASSUMPTION) — useful for short-lived reset links.
- Response **200**: the created email object(s) with `id`, `message_id`, `project_id`, `mail_from`, `mail_rcpt`, `rcpt_type` (`to|cc|bcc`), `subject`, `created_at`, `updated_at`, `status` (`new|sending|sent|failed|canceled`), `status_details`, `try_count`, `last_tries`, `flags` (FACT-P object schema, E1). Whether the body wraps them as `{"emails":[…]}` is **UNKNOWN** — parse defensively.
- Status lookup: `GET /transactional-email/v1alpha1/regions/fr-par/emails/{email_id}` (ASSUMPTION, standard Scaleway pattern; verify). Domain list: `GET …/regions/fr-par/domains` with the same header (FACT-P, E3).
- Errors: Scaleway JSON error body (`message`, `type`) — ASSUMPTION. Retry policy: retry on network error / 429 / 5xx with exponential backoff and the same `outboxId`; do **not** retry 4xx. TEM has no documented idempotency key (UNKNOWN) → the outbox row is the dedupe guard.
- Adapter practice: one API call per recipient (no address exposure), always include `text`, add `List-Unsubscribe` (+ `List-Unsubscribe-Post: List-Unsubscribe=One-Click`) only on non-essential notifications.

### 1.3 Delivery events (bounces/complaints)

Create a webhook that publishes to a Scaleway **Topics and Events** (SNS-compatible) topic:

```
POST https://api.scaleway.com/transactional-email/v1alpha1/regions/fr-par/webhooks
X-Auth-Token: <SCW_SECRET_KEY>
Content-Type: application/json

{ "domain_id": "<domain_id>", "project_id": "<project_id>", "name": "lilleri-tem-events",
  "event_types": ["email_delivered","email_dropped","email_mailbox_not_found","email_spam","email_blocklisted","email_deferred"],
  "sns_arn": "<topic ARN>" }
```
(FACT-P, E6.) Event types: `blocklist_created`, `email_blocklisted`, `email_deferred`, `email_delivered`, `email_dropped`, `email_mailbox_not_found`, `email_queued`, `email_spam`, `unknown_type` (FACT-P, E7). Payload fields: `id`, `type`, `organization_id`, `project_id`, `domain_id`, `domain_name`, `created_at`, `email_sent_at`, `email_id`, `email_from`, `email_to`, `email_headers[{key,value}]`, `email_response_code`, `email_response_message` (FACT-P, E8).

Subscribe an HTTPS endpoint (e.g. `/api/email/tem/events/<random-path-token>`) to the topic; confirm the SNS `SubscriptionConfirmation` (ASSUMPTION, SNS semantics). **Message-signature verification support on Scaleway SNS: UNKNOWN** → protect with an unguessable path token, check `project_id`/`domain_id`, dedupe on `id`. Actions: `email_dropped` / `email_mailbox_not_found` → mark address undeliverable and stop non-essential mail; `email_spam` → suppress notifications; `email_blocklisted` → surface in support tooling. Topics and Events pricing: UNKNOWN (expected negligible).

Essential plan allows **one webhook per domain** (FACT-S, research S21) — route all event types to one topic.

### 1.4 Fallback adapter — Amazon SES v2 in eu-south-1 (Milan) (ASSUMPTION: from prior knowledge of AWS docs; verify)

```
POST https://email.eu-south-1.amazonaws.com/v2/email/outbound-emails
Authorization: AWS4-HMAC-SHA256 Credential=<AKID>/<date>/eu-south-1/ses/aws4_request, SignedHeaders=…, Signature=…
X-Amz-Date: <ISO8601>
Content-Type: application/json

{ "FromEmailAddress": "Lilleri <no-reply@mail.lilleri.it>",
  "Destination": { "ToAddresses": ["utente@example.it"] },
  "ReplyToAddresses": ["supporto@lilleri.it"],
  "Content": { "Simple": {
      "Subject": { "Data": "Reimposta la password", "Charset": "UTF-8" },
      "Body": { "Text": { "Data": "…", "Charset": "UTF-8" }, "Html": { "Data": "…", "Charset": "UTF-8" } } } },
  "ConfigurationSetName": "lilleri-tx",
  "EmailTags": [ { "Name": "category", "Value": "password_reset" } ] }
→ 200 { "MessageId": "…" }
```
Use `@aws-sdk/client-sesv2` (`SendEmailCommand`) rather than hand-rolled SigV4. Bounce/complaint events via configuration-set event destinations (SNS or EventBridge). New accounts start in the SES sandbox (production access request needed) and, since 21 Jul 2026, on the Essentials plan at $0.16/1,000 (research S36).

---

## 2. Billing — Stripe Checkout + Billing + Customer Portal

### 2.1 Conventions

| Item | Value | Label |
|---|---|---|
| Base URL | `https://api.stripe.com` | FACT-P (B1) |
| Auth | Secret or restricted key: `Authorization: Bearer sk_live_…` (curl examples use basic auth `-u sk_…:`) | FACT-P basic-auth form (B1); Bearer form ASSUMPTION (standard) |
| Body encoding | `application/x-www-form-urlencoded`, nested keys like `line_items[0][price]` | FACT-P (B1) |
| Versioning | Pin `Stripe-Version` (or the account default) and pin the webhook endpoint `api_version` | ASSUMPTION (standard practice) |
| Idempotency | `Idempotency-Key: <uuid>` on every POST | ASSUMPTION (standard) |
| Key hygiene | Restricted key with only Checkout Sessions, Customers, Billing Portal, Subscriptions (read), Invoices (read) | ASSUMPTION |

### 2.2 One-time catalogue and tax setup

```
POST /v1/products            name="Lilleri Plus"
POST /v1/prices              product=prod_… currency=eur unit_amount=699  recurring[interval]=month tax_behavior=inclusive lookup_key=plus_monthly_eur
POST /v1/prices              product=prod_… currency=eur unit_amount=6999 recurring[interval]=year  tax_behavior=inclusive lookup_key=plus_yearly_eur
POST /v1/tax_rates           display_name=IVA percentage=22 inclusive=true country=IT description="IVA 22% Italia"
```
(ASSUMPTION — standard Stripe objects; launch uses the manual inclusive 22 % rate. Switch to `automatic_tax[enabled]=true` with Stripe Tax when EU cross-border B2C sales approach €10 k/yr; do not combine manual `tax_rates` with automatic tax.)

Customer portal configuration (once):
```
POST /v1/billing_portal/configurations
  business_profile[privacy_policy_url]=https://lilleri.it/privacy
  business_profile[terms_of_service_url]=https://lilleri.it/termini
  features[invoice_history][enabled]=true
  features[payment_method_update][enabled]=true
  features[customer_update][enabled]=true
  features[customer_update][allowed_updates][]=email
  features[customer_update][allowed_updates][]=address
  features[subscription_cancel][enabled]=true
  features[subscription_cancel][mode]=at_period_end
  features[subscription_update][enabled]=true
  features[subscription_update][default_allowed_updates][]=price
  features[subscription_update][products][0][product]=prod_…
  features[subscription_update][products][0][prices][]=price_monthly
  features[subscription_update][products][0][prices][]=price_yearly
```
(ASSUMPTION — parameter names from prior knowledge of the Billing Portal Configuration API; verify against B3.)

### 2.3 Create a Checkout Session (subscription mode)

```
POST https://api.stripe.com/v1/checkout/sessions
Authorization: Bearer <STRIPE_SECRET_KEY>
Idempotency-Key: <uuid>
Content-Type: application/x-www-form-urlencoded

mode=subscription
line_items[0][price]=price_monthly            # or price_yearly
line_items[0][quantity]=1
line_items[0][tax_rates][0]=txr_IT22          # launch: manual inclusive IVA
customer=cus_…                                # create/reuse the Customer first (1:1 with Lilleri user)
client_reference_id=<lilleri_user_id>
metadata[lilleri_user_id]=<lilleri_user_id>
subscription_data[metadata][lilleri_user_id]=<lilleri_user_id>
success_url=https://app.lilleri.it/abbonamento/ok?session_id={CHECKOUT_SESSION_ID}
cancel_url=https://app.lilleri.it/piani
locale=it
billing_address_collection=auto
consent_collection[terms_of_service]=required
custom_text[terms_of_service_acceptance][message]=<testo: richiesta di esecuzione immediata e presa d'atto sul diritto di recesso>
allow_promotion_codes=false
```
- Documented parameters used: `mode`, `line_items[][price|quantity]`, `success_url` with `{CHECKOUT_SESSION_ID}`, `cancel_url`, `customer`/`customer_email`, `client_reference_id`, `metadata`, `subscription_data`, `locale`, `billing_address_collection`, `consent_collection`, `custom_text`, `allow_promotion_codes`, `automatic_tax` (FACT-P, B1/B2). `line_items[][tax_rates]` and the exact `custom_text.terms_of_service_acceptance` key are ASSUMPTION (verify). `consent_collection[terms_of_service]` requires a ToS URL in the Dashboard public details (ASSUMPTION).
- Response: Checkout Session object with `id` (`cs_…`), `url` (hosted page), `status: "open"`, `mode`, `customer`, `subscription` (null until completed), `client_reference_id`, `automatic_tax`, `expires_at` (FACT-P example, B1). Server returns `{ url }`; client redirects (303).
- The success page may show "attivazione in corso" and poll our API; entitlement comes from the webhook.

### 2.4 Customer portal session

```
POST https://api.stripe.com/v1/billing_portal/sessions
Authorization: Bearer <STRIPE_SECRET_KEY>

customer=cus_…
return_url=https://app.lilleri.it/impostazioni/abbonamento
locale=it
# optional: configuration=bpc_…   flow_data[type]=…  (deep link to cancel/update flows)
```
Response: `{ "id": "bps_…", "object": "billing_portal.session", "customer": "cus_…", "url": "https://billing.stripe.com/p/session/…", "return_url": "…", "locale": …, "configuration": "bpc_…" }` (FACT-P, B3). Portal sessions are short-lived — create on click, never store the URL.

### 2.5 Webhook endpoint and signature verification

Register (Dashboard or API): `POST /v1/webhook_endpoints url=https://app.lilleri.it/api/billing/stripe/webhook enabled_events[]=… api_version=<pinned>`; the response returns the signing secret `whsec_…` (ASSUMPTION, standard). Store it as a secret variable.

**Header:** `Stripe-Signature: t=1492774577,v1=5257a869e7…,v0=6ffbb59b23…` — single line in production; `t` = timestamp, `v1` = live signature scheme, `v0` = test scheme to ignore (FACT-P, B4).

**Algorithm (FACT-P, B4):**
1. Parse the header; take `t` and every `v1` value (there can be several while a secret is being rolled — ASSUMPTION).
2. `signed_payload = t + "." + <raw request body exactly as received>`.
3. `expected = hex(HMAC_SHA256(key = endpoint secret "whsec_…", message = signed_payload))`.
4. Constant-time compare `expected` with each `v1`; reject (400) if none match.
5. Reject if `|now − t|` exceeds the tolerance — **300 seconds** is the official libraries' default (ASSUMPTION from SDK docs; B4 states timestamp-based replay protection).

Node/Fastify specifics: the route must receive the **raw Buffer** (register a route-scoped content-type parser for `application/json` with `parseAs: 'buffer'`); with the SDK use `stripe.webhooks.constructEvent(rawBody, signatureHeader, endpointSecret)` (FACT-P, B5). Respond 2xx quickly, then process.

Delivery semantics (ASSUMPTION, Stripe webhook docs): at-least-once, not ordered, retried with backoff for up to ~3 days in live mode. Therefore: persist `event.id` with a unique constraint (dedupe), and on subscription events re-read the current object (`GET /v1/subscriptions/{id}`) before changing entitlements.

### 2.6 Lifecycle events to handle

| Event | Handle? | Action in Lilleri | Source |
|---|---|---|---|
| `checkout.session.completed` | Required | Map `client_reference_id`/`metadata.lilleri_user_id` → user; store `customer`, `subscription`; mark checkout complete; entitlement follows subscription status | FACT-P (B6, B7) |
| `checkout.session.async_payment_succeeded` / `…_failed` | Only if delayed methods (e.g. SEPA DD) are enabled | Activate / show failure | FACT-P (B6) |
| `customer.subscription.created` | Required | Upsert subscription row: status, price (monthly/yearly), `cancel_at_period_end`, current period end | ASSUMPTION (standard Billing event) |
| `customer.subscription.updated` | Required | Status transitions (`trialing`, `active`, `past_due`, `unpaid`, `canceled`, `incomplete`, `incomplete_expired`, `paused`), plan switch, `cancel_at_period_end` toggles → recompute entitlement | ASSUMPTION (standard) |
| `customer.subscription.deleted` | Required | Subscription ended → revoke Plus at that moment; keep all user data accessible on Gratis | FACT-P (B6) |
| `customer.subscription.trial_will_end` | Only with trials | Reminder email ~3 days before | FACT-P (B6) |
| `customer.subscription.paused` / `resumed` | Only if pausing is offered | Suspend/restore Plus | ASSUMPTION |
| `invoice.paid` | Required | Record payment (invoice id, amount, tax), extend paid-through date, keep/restore entitlement | FACT-P (B7, B8) |
| `invoice.payment_failed` | Required | Email the user to update the card; grace state; Smart Retries per Dashboard | FACT-P (B7, B8) |
| `invoice.payment_action_required` | Required (EU SCA/3-D Secure) | Email the hosted invoice link so the customer authenticates | FACT-P (B8, B9) |
| `invoice.upcoming` | Recommended for the yearly plan | Pre-renewal notice email | FACT-P (B8, B9) |
| `invoice.finalized` | Optional | Store receipt/PDF link | ASSUMPTION |
| `charge.refunded`, `charge.dispute.created` | Optional | Flag account; revoke on full refund/lost dispute | ASSUMPTION |

Entitlement rule (ASSUMPTION): Plus is active when status ∈ {`active`, `trialing`}, or `past_due` within a configured grace period; `cancel_at_period_end=true` keeps Plus until the period end. Never delete user data on cancellation.

**API-version caveat (ASSUMPTION, verify on the changelog for your pinned version):** from API version `2025-03-31.basil`, `current_period_start/end` are read from subscription items (`items.data[].current_period_end`), and an invoice's subscription link moved under `invoice.parent.subscription_details.subscription`. Write the mapper against the pinned version and cover it with fixture tests.

Testing: Stripe CLI `stripe listen --forward-to localhost:<port>/api/billing/stripe/webhook` and `stripe trigger <event>`; test clocks for monthly/yearly renewals and failed renewals (ASSUMPTION, standard tooling).

---

## 3. Sources

| ID | Source | URL | Access | Used for |
|---|---|---|---|---|
| E1 | Scaleway TEM API (schema) — Send email | https://www.scaleway.com/en/developers/api/transactional-email/ ; https://www.scaleway.com/en/developers/api/transactional-email/v1alpha1/schema.yml | Context7 `/websites/scaleway_en_developers_api` | Endpoint, header, body, Email object |
| E2 | Scaleway TEM API — email request example (cc, bcc, send_before) | https://www.scaleway.com/en/developers/api/transactional-email/emails | Context7 | Full body fields |
| E3 | Scaleway docs — Send emails with API (domains GET) | https://github.com/scaleway/docs-content/blob/main/pages/transactional-email/api-cli/send-emails-with-api.mdx | Context7 `/scaleway/docs-content` | Prerequisites, domains endpoint |
| E4 | Scaleway docs — TEM quickstart (SPF/DKIM/MX/DMARC) | https://github.com/scaleway/docs-content/blob/main/pages/transactional-email/quickstart.mdx | Context7 | DNS requirements |
| E5 | Scaleway changelog — TEM IAM permission sets (Apr 2023) | https://github.com/scaleway/docs-content/blob/main/changelog/april2023/2023-04-27-transactional-email-added-new-iam-permissions-set.mdx | Context7 | Permission-set names |
| E6 | Scaleway docs — Use webhooks with SNS topics | https://github.com/scaleway/docs-content/blob/main/pages/transactional-email/api-cli/use-webhooks-with-sns-topics.mdx | Context7 | Webhook creation |
| E7 | Scaleway docs — webhook event types | https://github.com/scaleway/docs-content/blob/main/macros/tem/webhook-event-types.mdx | Context7 | Event list |
| E8 | Scaleway docs — webhook event payloads | https://github.com/scaleway/docs-content/blob/main/pages/transactional-email/reference-content/webhook-events-payloads.mdx | Context7 | Payload fields |
| E9 | Amazon SES v2 SendEmail (fallback) | https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html | prior knowledge (not re-read) | Fallback adapter |
| B1 | Stripe API — Create Checkout Session | https://docs.stripe.com/api/checkout/sessions/create | Context7 `/websites/stripe` | Parameters, response |
| B2 | Stripe — Recurring payments / subscription Checkout examples | https://docs.stripe.com/recurring-payments ; https://docs.stripe.com/payments/checkout/migrating-prices | Context7 | `mode=subscription` usage |
| B3 | Stripe API — Customer Portal sessions | https://docs.stripe.com/api/customer_portal/sessions | Context7 | Portal session request/response |
| B4 | Stripe — Webhooks (Stripe-Signature, manual verification) | https://docs.stripe.com/webhooks | Context7 | Signature scheme |
| B5 | Stripe — Webhooks quickstart (Node constructEvent, raw body) | https://docs.stripe.com/webhooks/quickstart | Context7 | Node verification |
| B6 | Stripe — SaaS quickstart event handling | https://docs.stripe.com/connect/saas/quickstart | Context7 | checkout/subscription events |
| B7 | Stripe — SaaS subscriptions use case (events to monitor) | https://docs.stripe.com/get-started/use-cases/saas-subscriptions | Context7 | checkout.session.completed, invoice.paid, invoice.payment_failed |
| B8 | Stripe — Subscription webhooks | https://docs.stripe.com/billing/subscriptions/webhooks | Context7 | invoice.* lifecycle |
| B9 | Stripe — Billing testing | https://docs.stripe.com/billing/testing | Context7 | payment_action_required, upcoming |
| B10 | Stripe — API changelog (basil) | https://docs.stripe.com/changelog/basil | not read (verify) | Period-field move caveat |
