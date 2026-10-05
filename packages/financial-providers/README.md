# Financial provider integration

## Enable Banking AIS adapter — 2026-10-05

`EnableBankingProvider` (with the low-level `EnableBankingClient`) implements
`FinancialDataProviderV2` and the resumable sync port against
`https://api.enablebanking.com`, under Enable Banking's own AISP registration. It
is **not registered** in `apps/api`; wiring the redirect callback, consent storage
and environment configuration remains separate work.

- Authentication is an RS256 application JWT (`kid` = application id, 900 s TTL,
  reused until 60 s before expiry) signed with `node:crypto`; keys must be RSA ≥ 2048.
- `context.grantId` is the Enable Banking `session_id`. Connection creation is the
  redirect flow only (`startAuthorization` → `completeAuthorization`); embedded-only
  ASPSPs and beta connectors (unless `includeBeta`) are not offered.
- Banks may count every call against a 4/day unattended budget, so `openSync` does
  all bank I/O once per account (details, balances, one transaction traversal over
  `initialHistoryDays`) and pages are served from a process-local snapshot cache.
  A page request on another instance, or after `snapshotTtlMs`, is `snapshot_expired`.
- PSU headers are sent only for `user_present` syncs with a registered presence, and
  never as a partial set of an ASPSP's `required_psu_headers`.
- Errors are categorical (`EnableBankingFailure`); only documented `error` enum
  values are retained, never provider messages, bodies, URLs, tokens or IBANs.
- Transaction identity is `entry_reference` only (never `transaction_id`);
  records without it are returned with `id: null` for API-side fingerprinting.

The endpoint and field shapes come from the researched specification dated
2026-10-05 (OpenAPI, documentation, official samples). No Enable Banking credential,
sandbox application or live call was available; the tests use original synthetic
wire fixtures and an injected `fetch`, so they prove local protocol handling only.

## Live Italian institution discovery — 2026-10-05

`YapilyLiveInstitutionDiscovery` is a separate server-only discovery client. It
uses application credentials supplied to its constructor and makes one GET to
`https://api.yapily.com/institutions`. It does not read environment/browser
configuration, accept an alternate API origin, follow redirects/provider links,
create consent, read accounts or register itself as `FinancialDataProviderV2`.
No credentials or financial/raw/media fields appear in its output or errors.

The official endpoint returns institutions **within the configured application**.
The client validates the complete response before selecting institutions whose
`environmentType` is exactly `LIVE` and whose `countries[].countryCode2` declares
`IT`. It preserves exact provider IDs and separate business/card variants; names,
ID suffixes and brands never create an automatic identity/coverage match. For
example, published BPER and Crédit Agricole IDs remain only documentation
candidates until present in an actual authorized application's live Italian list.
An absent entry means not reported by that application, not globally unsupported.

The four feature declarations remain distinct: `ACCOUNTS`, `ACCOUNT_BALANCES`,
`ACCOUNT_TRANSACTIONS` and `INITIATE_ACCOUNT_REQUEST`. Other reported feature codes
are preserved without guessed equivalences. Account-kind, balance-kind and
history evidence are absent from the institution schema, so `accountTypes` stays
empty; a `_card` ID or bank name is not card-account coverage. Each result retains
`connectionAvailability: configuration_required` and the catalogue retains
`productionAdmission: blocked`. Actual consent routing, private access and a
live financial adapter remain separate application requirements.

The GET route documents no paging parameters. Generic wrapper pagination is
accepted only when coherent with a whole list; count mismatches, nonzero offset,
continuation metadata and `next` links fail as `partial_catalogue`. The client
never guesses a cursor or follows a provider-supplied URL. Response bytes,
institution count, nested JSON, duplicates and whole-operation time are bounded.
Only one request runs per instance. Cancellation interrupts fetch/body reads,
including noncooperating transports; no error body or transport cause is logged,
returned or retained. A 429 returns a bounded Retry-After hint without retrying.

The official references were read on 2026-10-05. This retrieval of the institution
reference identifies **12.13.0**, while the earlier sandbox reference retrieval
identified 12.16.0. `referenceApiVersion` records the documentation used, not an
API deployment version measured from an authenticated provider call. The test
fixtures are original synthetic responses. No actual Yapily credentials, account
entitlement, consent or live bank call was available or exercised.

Verification: all **318 provider tests** passed, including 53 new discovery
cases; provider typecheck/build and Biome passed. Tests cover exact identities,
IT/live filtering, independent feature declarations, unknown kinds, malformed and
partial catalogues, response bounds, errors, cancellation, late responses and
credential/financial-field exclusion.

References:

- [Get institutions](https://docs.yapily.com/api-reference/institutions/get-institutions)
- [Server Basic authentication](https://docs.yapily.com/getting-started/integration-setup/api-authentication)
- [BPER exact IDs and distinct variants](https://docs.yapily.com/institution-configurations/italy/CBI-Globe-BPER)
- [Crédit Agricole exact IDs](https://docs.yapily.com/institution-configurations/italy/CBI-Globe-Credit-Agricole)

## Official Yapily sandbox preparation — 2026-10-04

FACT: `YapilySandboxReadAdapter` implements a **read-only subset of the documented
Yapily API**, bound exclusively to `modelo-sandbox`. It is not registered in the
app's financial connection routes, and does not implement creation, callback
exchange, renewal, remote revocation or payments. The source type intentionally
does not pretend to implement `FinancialDataProvider` or `SyntheticSyncProvider`.

FACT: `YapilySandboxAuthorisationClient` separately implements the documented
Modelo account-authorisation and one-time-token exchange protocol. It is also
unregistered. Its durable intent store and authenticated HTTP callback ingress
are explicit caller dependencies; no production implementation is provided by
this package. It does not implement renewal, remote revocation, live institutions
or ledger/sync admission.

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

## Sandbox authorisation client

The new client generates a random 32-byte Lilleri state and persists a creation
draft through `SandboxAuthorisationStore.stage` before any provider request. It
verifies `modelo-sandbox`, the reported `SANDBOX` environment and initiation/data
features, then calls POST `/account-auth-requests`. The registered HTTPS callback
receives a custom `lilleri-state` query parameter. Yapily's returned correlation
state remains distinct. The returned authorisation URL must have an explicitly
reviewed exact HTTPS origin; no wildcard, prefix, user-info, local/IP or HTTP
destination is admitted.

OTT mode is the default: `oneTimeToken: true` is requested, and the callback's
one-time token is exchanged with POST `/consent-one-time-token`. This endpoint
returns a **bare Consent** with HTTP 201. GET `/consents/{id}` returns the separate
`data` envelope with HTTP 200. Consent ID, application user, institution, provider
state and token must agree between the staged intent, exchange and authoritative
read. Only authorized data scopes are accepted. Missing expiry stays `null`;
reconfirmation, SCA, session and token expiry remain separate. Direct-consent
callback mode is available only when deliberately configured; mixed token modes
are rejected. No generic OAuth2 code flow is substituted for either callback.

The caller's store must atomically claim an active, unexpired state once and fence
the exact profile/connection/grant generation. The client checks the current
generation around provider work and after the final consent read. The test store
is memory-only and never exported. The returned token binding is sensitive:
trusted server code must encrypt it before durable storage and never serialize it
to browser data, logs or analytics. It can feed the existing read-only sandbox
adapter after the remaining application admission checks.

Provider mutations make one attempt. Timeout, cancellation, a transport error or
a malformed/late provider result can leave a remote outcome uncertain. The staged
draft/claimed callback must be retained for durable reconciliation and cleanup;
the integrator must not blindly replay a POST or issue a replacement consent.
`close()` cancels local work and never means remote revocation. The whole-operation
deadline also interrupts a noncooperating transport or stalled response body.

The official callback guide describes OTT exchange but does not specify the OTT
HTTP query-parameter spelling. The protocol client therefore accepts a typed
callback, without guessing a parser. The future authenticated ingress must
measure the actual Modelo callback, map its documented/observed fields, reject
duplicate/ambiguous query parameters and remove token-bearing callback URLs from
logging/history. Durable encrypted callback work, late-settlement compensation,
renewal, revocation and server routing remain unfinished.

Verification: all **265 provider tests** passed on 2026-10-04, including 59 new
authorisation cases for exact bindings, duplicate/concurrent callbacks, missing
scopes, changed tokens/state, direct/OTT separation, HTTPS origins, sandbox
discovery, malformed input, cancellation and bounded failure. One test hands the
verified callback binding to the existing reader. All wire responses are original
synthetic fixtures; no provider account, credentials or bank API was used.

## Operator read check

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
3. **Software — lifecycle integration:** wire the implemented authorisation
   protocol client to durable creation intents, a transactional/encrypted store,
   measured HTTP callback ingress and encrypted grant token storage. Complete
   exact-generation renewal/revoke and late-settlement compensation. The new
   client defines explicit provider mutations, but remains unregistered and has
   made no real provider call.
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

## Concrete next real-account test

The Railway service was inspected on 2026-10-04: its configured variable names
were only `NODE_ENV`, `PORT` and `RAILWAY_DEPLOYMENT_DRAINING_SECONDS`. The running
entry point instantiates `MockItalianProvider`; it cannot connect a real bank.
The hosted library and provider client do not change that published behavior.

The next useful user inputs are the bank name, country, account type, and whether
an authorized Yapily/other provider application already exists. No account number,
bank password, API secret or consent token should be supplied in chat. An operator
puts provider credentials in private host variables for a protected environment,
after the separate hosted runtime and live adapter exist. The current sandbox
credential names are listed above; they never enable a live institution.

Use existing `pnpm check:hosted` and `pnpm check:sandbox` for zero-I/O checks of the
respective configuration. Then complete an official isolated Modelo pilot, wire
its durable lifecycle/sync path, and exercise the chosen bank in a protected
identity-scoped deployment. A CSV/manual account path already exists, but the
shared unauthenticated public preview must not accept personal financial records.
Removing synthetic records alone does not create private access or real-bank
capability.

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
- [Exchange one-time token](https://docs.yapily.com/api-reference/consents/exchange-one-time-token)
- [Delete consent](https://docs.yapily.com/api-reference/consents/delete-consent)
