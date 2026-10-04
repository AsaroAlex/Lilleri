# Financial provider integration

## Official Yapily sandbox preparation — 2026-10-04

FACT: `YapilySandboxReadAdapter` implements a **read-only subset of the documented
Yapily API**, bound exclusively to `modelo-sandbox`. It is not registered in the
app's financial connection routes, and does not implement creation, callback
exchange, renewal, remote revocation or payments. The source type intentionally
does not pretend to implement `FinancialDataProvider` or `SyntheticSyncProvider`.

FACT: API documentation was fetched from the official URLs below on 2026-10-04
through the connected Exa fetch tool. The reference pages identify API version
12.16.0. No official sandbox account, application credentials, permission,
provider contract or completed bank consent is available in this workspace.
No Yapily API call was made. The tests inject original synthetic wire fixtures;
they prove local protocol behavior, not actual provider access or bank coverage.

DECISION: prepare the read path and an operator check now; keep app/source
admission closed until the external sandbox resources and the remaining lifecycle
integration exist. This maintains the conditional nomination in ADR-0007 rather
than committing to a provider commercially.

## Documented read behavior

- The API origin is `https://api.yapily.com`. Sandbox is an **institution
  environment**, not a separate guessed `sandbox` hostname. GET `/institutions`
  must report `modelo-sandbox` as `SANDBOX`, with the required data features,
  before GET `/consents/{consentId}` or any account read.
- Every request uses server-side Basic authentication. GET `/accounts` and GET
  `/accounts/{accountId}/transactions` also send the documented `Consent` header.
  No endpoint outside these four reads is reachable through the adapter. Redirects
  and provider-supplied links are never followed. Config has no alternate origin.
- Consent ID, institution, pseudonymous application user, supplied token,
  profile/connection and exact local grant generation must match. Only
  `AUTHORIZED` plus the required data scopes admits financial reads. Missing
  expiry remains `null`: it is not an unlimited consent. `reconfirmBy` remains
  separate from SCA, provider session and token expiry. Those latter three terms
  remain unknown; no JWT decoding or universal 90/180-day expiry is invented.
- The normal transaction endpoint uses offset pagination with explicit
  `from`, `before`, `limit`, `offset` and ascending `sort=date`. Counts, offsets,
  full page lengths and repeated source identities are checked. Provider-reported
  totals must remain stable. Real-time cursor pagination is private beta in the
  official guide and is deliberately not selected.
- All pages are collected in memory before a result can be returned; partial
  results, changed consent terms, changed account balances and mismatched pages
  fail. This remains `reported_pages_only`: equal totals and stable balances do
  **not** prove an immutable bank snapshot or completeness of historical data.
  Pending-set and deletion evidence remain `unknown`. Empty/missing records never
  become cancellation, reversal, or deletion evidence.
- JSON numeric lexemes stay exact, including numbers exceeding binary floating
  point precision. Supported currency exponents apply through the money package.
  Nonminor fractions, unsupported currencies, contradictory redundant amounts,
  exponential money and malformed/duplicate-key JSON fail without rounding.
  Missing source transaction IDs stay null; an enrichment hash is never promoted
  to a bank identifier. Provider booking and value times remain distinct.
- Typed balances retain their original type and date; headline fallback has
  unknown semantics. No balance types are combined, no opening anchor is invented,
  and unknown account kinds remain unknown. PAN/IBAN/ownership/forwarded/raw
  objects and provider messages are not returned or persisted by this module.
- At most one capture runs per adapter. Account/page/transaction/response-byte
  limits, a whole-capture deadline and per-attempt deadlines apply. At most three
  attempts retry transient failures; `Retry-After` delays above the configured
  wait bound are returned to the caller. A 429 without a usable delay is not
  immediately retried. Caller cancellation and `close()` interrupt fetch, body
  reads and retries. `close()` is local cancellation, not remote revocation.

## Reproducible checks

```sh
. /workspace/.lilleri-toolchain/env.sh
pnpm --filter @lilleri/financial-providers... build
pnpm --filter @lilleri/financial-providers typecheck
pnpm --filter @lilleri/financial-providers test
pnpm --filter @lilleri/financial-providers sandbox:check
```

The default operator command checks missing configuration and performs **zero
network calls**, even if credentials are present. It prints only variable names
and readiness labels. It does not read `.env` files or ambient live-provider
credentials. A real sandbox read requires explicit `--execute` and every
following value in the process environment:

| Variable | External resource / trusted binding |
| --- | --- |
| `YAPILY_SANDBOX_APPLICATION_ID` | Yapily Console application ID |
| `YAPILY_SANDBOX_APPLICATION_SECRET` | Secret of that authorized sandbox application |
| `YAPILY_SANDBOX_PERMISSION_REFERENCE` | Actual provider/account permission evidence reference |
| `YAPILY_SANDBOX_PROFILE_ID` | Isolated synthetic test profile, not a customer |
| `YAPILY_SANDBOX_CONNECTION_ID` | Isolated local test connection identity |
| `YAPILY_SANDBOX_GRANT_ID` | Current local sandbox grant generation |
| `YAPILY_SANDBOX_CONSENT_ID` | Consent obtained through the official Modelo authorization flow |
| `YAPILY_SANDBOX_CONSENT_TOKEN` | Matching token kept only in the process for this operator read |
| `YAPILY_SANDBOX_FROM` | Requested history start as a timezone-qualified ISO timestamp |
| `YAPILY_SANDBOX_BEFORE` | Requested history end as a timezone-qualified ISO timestamp |

The consent's application user ID must be
`yapilySandboxUserReference(profileId, connectionId)`. The check receives no bank
username/password and does not create any account or consent. After those actual
resources exist, run:

```sh
pnpm --filter @lilleri/financial-providers sandbox:check --execute
```

The result is a count-only report. Financial records and all binding/credential
values stay off stdout. A successful read is still explicitly sandbox-only, with
production admission blocked and live bank coverage unverified. Supply credentials
through a private process/secret manager, never committed files, command text or
chat messages. No current Railway variable or public archive is modified.

## Remaining integration work and external resources

1. **External — provider operator:** obtain an authorized sandbox application in
   the Yapily Console and add Modelo Sandbox. The official overview recommends
   Modelo as a preconfigured sandbox. Non-preconfigured sandboxes may require
   certificates/provider support; none are assumed available.
2. **External — authorized sandbox consent:** complete the official redirect flow
   with an isolated test user and the documented pseudonymous application user
   reference. Register a trusted callback origin. Keep tokens server-side.
3. **Software — lifecycle:** adapt durable creation intents to asynchronous
   authorization, one-time callback state, code exchange, encrypted grant token
   storage, exact-generation renewal/revoke and late-settlement compensation.
   The documented account authorisation, callback exchange and delete endpoints
   are references for this next step; the current module makes no mutation call.
4. **Software — canonical grant and sync ports:** the current legacy create-grant
   shape requires a known expiry, while Yapily consent `expiresAt` may be omitted.
   Its absence must be represented faithfully, alongside separately proven
   access/deadline policies. The durable sync metadata port currently explicitly
   supports only `environment: synthetic`; do not rename sandbox to synthetic to
   bypass admission. A new admitted sandbox sync port must preserve unknown
   snapshot, pending-set, deletion, rate budget and history semantics.
5. **Software — app integration:** API registry, institution picker, callback
   route and sync scheduler need independent admission and ownership checks.
   Adapt null source IDs through the sync identity resolver; handle unknown
   account/balance kinds explicitly. This module does not turn protocol results
   into ledger writes. Foreground/unattended allowance remains unknown until
   institution/application/grant evidence supplies actual budgets.
6. **External — official sandbox acceptance:** run the operator check and a
   complete consent/renewal/revoke pilot, including errors and real sandbox paging.
   Record environment, provider/API version, institution, dates and field-quality
   results. Sandbox data may not change pending/booked status realistically.
7. **External — real-data release:** actual contract, DPA, confirmed regulated
   route/roles, Italian institution/account-type/history pilot, permissions,
   quotes and security/privacy/consent exit criteria remain prerequisites. The
   adapter cannot be configured for live institutions. Enable Banking remains
   a conditional fallback requiring its own official documentation and permission.

UNKNOWN: actual authorized access, accepted response variants, Italian bank/card
coverage, source ID stability, historical fill rate, unattended allowance,
commercial pricing and legal permissions. A source field advertised in public
OpenAPI is not field availability measured at an Italian bank.

## Official sources

All verified as public documentation on **2026-10-04**. Individual publication
dates are not given. API references report **12.16.0**; provider behavior may
change and must be rechecked during actual sandbox admission.

- [API authentication](https://docs.yapily.com/getting-started/integration-setup/api-authentication)
- [Get institutions](https://docs.yapily.com/api-reference/institutions/get-institutions)
- [Get consent](https://docs.yapily.com/api-reference/consents/get-consent)
- [Get accounts](https://docs.yapily.com/api-reference/financial-data/get-accounts)
- [Get transactions](https://docs.yapily.com/api-reference/financial-data/get-account-transactions)
- [Offset and private-beta cursor pagination](https://docs.yapily.com/data/financial-data-resources/pagination)
- [Financial data consent lifecycle](https://docs.yapily.com/data/financial-data-resources/financial-data-consents)
- [Sandbox setup and quality limits](https://docs.yapily.com/resources/sandbox/overview)
- [Create account authorisation](https://docs.yapily.com/api-reference/authorisations/create-account-authorisation)
- [Callback and code exchange](https://docs.yapily.com/open-banking-flow/handling-redirects/callback-url)
- [Exchange OAuth2 code](https://docs.yapily.com/api-reference/consents/exchange-oauth2-code)
- [Delete consent](https://docs.yapily.com/api-reference/consents/delete-consent)
