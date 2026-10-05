# Enable Banking API: adapter specification for Lilleri (AIS only)

**Verified:** 2026-10-05. **Scope:** what a Lilleri `FinancialDataProviderV2` adapter (`packages/financial-providers`) needs in order to read Italian consumer accounts through Enable Banking under Enable Banking's own AISP registration, the route Lilleri would use as an unlicensed company.
**Evidence method (read first):** this session's egress proxy blocked direct fetches of `enablebanking.com`. The field names below therefore come from four sources:
1. The official OpenAPI file `https://enablebanking.com/docs/api/reference/enablebanking-api.yaml`, read through the Context7 documentation index (`/openapi/enablebanking_api_reference_enablebanking-api_yaml`).
2. Enable Banking's own documentation pages, read through Context7 (`/websites/enablebanking`) and WebSearch excerpts restricted to `enablebanking.com`.
3. Enable Banking's official code samples, cloned from GitHub: `enablebanking/enablebanking-api-samples`, commit `7a16788`, 2026-03-30.
4. An independent production client: Firefly III `data-importer`, `app/Services/EnableBanking/*`, commit `07fa5e9`, 2026-09-23.

Every item is labelled **FACT** (stated in one of those sources), **ASSUMPTION** or **VERIFY**. VERIFY means the item is documented but should be confirmed against the live sandbox before the code relies on it.

---

## 1. Environments and hosts

| Item | Value | Label | Source |
|---|---|---|---|
| API origin (sandbox and production) | `https://api.enablebanking.com` | FACT | Official sample `API_ORIGIN = "https://api.enablebanking.com"`; Firefly `config/eb.php` default `ENABLE_BANKING_URL=https://api.enablebanking.com`; API reference examples |
| How the environment is selected | Sandbox and production share the origin. The environment is a property of the **application** whose id is the JWT `kid`. `GET /application` returns `environment` (`sandbox` / `production`) and `active`. | FACT (shared origin, `environment` field) / VERIFY (the aggregation API uses snake_case; one excerpt came from the TPP API, which uses camelCase `redirectUris`) | API reference "Environment" (`"PRODUCTION"`); GET /application excerpt |
| Hosted bank-selection and consent UI (PSU redirect) | `https://auth.enablebanking.com/...`, for example `https://auth.enablebanking.com/ais/start?sessionid=<uuid>`. The URL is always taken from `POST /auth` → `url`; never build it yourself. | FACT | API reference POST /auth response example |
| Control panel (registering apps, keys, redirect URLs, linked accounts) | `https://enablebanking.com/cp/applications` | FACT | Samples README |
| Sandbox ASPSPs | "Mock ASPSP" (driven from the control panel) plus a limited set of bank sandboxes. Use the shared infrastructure, not a single-tenant one. | FACT | https://enablebanking.com/docs/api/sandbox |
| Production app states | Starts **Inactive**. It then becomes either **restricted** (activated by linking your own accounts; data only from those linked accounts; free; for evaluation or personal non-commercial use) or **unrestricted** (after a signed contract and KYB). | FACT | https://enablebanking.com/docs/api/linked-accounts/ ; https://enablebanking.com/docs/api/control-panel/ ; https://enablebanking.com/terms/ ; FAQ |

## 2. Authentication (application JWT)

| Item | Value | Label | Source |
|---|---|---|---|
| Scheme | Each request carries `Authorization: Bearer <JWT>`. No OAuth client-credentials exchange. | FACT | Quick start; samples |
| Algorithm | `RS256` only | FACT | TPP API doc: `"alg": "RS256" (always the same, only RS256 is supported)` |
| JWT header | `{"typ": "JWT", "alg": "RS256", "kid": "<application_id>"}` | FACT | API/TPP API reference "JWT format and signature" |
| JWT claims | `iss: "enablebanking.com"` (always the same), `aud: "api.enablebanking.com"` (always the same), `iat` (epoch seconds), `exp` (epoch seconds) | FACT | Quick start ("always the same value"); samples; Firefly `JWTManager` |
| Maximum TTL | `exp - iat` ≤ **86,400 s** (24 h). Longer tokens are rejected. Samples and Firefly use 3,600 s. | FACT | API reference "JWT format and signature > Body" |
| Key material | An RSA key pair per application. Either let the control panel generate it in the browser (SubtleCrypto), which downloads `<application_id>.pem`, or generate it locally with OpenSSL and upload the public certificate. The application id becomes the `kid`. | FACT | Control panel docs; samples README |
| Lilleri handling | Keep the private key in the server secret store and never in the mobile bundle. Mint a short-lived JWT (for example 5–15 min) per worker and cache it until roughly 60 s before `exp`. | ASSUMPTION (design) | — |

Illustrative Node 22 signing, using only `node:crypto` and therefore no new dependency (ASSUMPTION: code shape; claims FACT):

```ts
import { createSign } from 'node:crypto'
const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url')
export function enableBankingJwt(appId: string, privateKeyPem: string, ttlSeconds = 900): string {
  const iat = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: appId }))
  const body = b64url(JSON.stringify({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat, exp: iat + ttlSeconds }))
  const sig = createSign('RSA-SHA256').update(`${header}.${body}`).sign(privateKeyPem)
  return `${header}.${body}.${b64url(sig)}`
}
```

## 3. Endpoints used by an AIS adapter

All paths are relative to `https://api.enablebanking.com`. JSON uses snake_case. Amounts are **strings** with `.` as the decimal separator.

### 3.1 `GET /application`: application self-check (FACT)
Response (aggregation API, as used by the official sample): includes `redirect_urls` (array). The sample uses `app["redirect_urls"][0]` as `redirect_url`. Other documented fields are `name`, `description`, `kid`, `environment`, `active`, `countries`, `services`, plus payment-related fields. **VERIFY** the exact snake_case set in the sandbox. Use this call as a startup health check: the app must be `active`, have the expected `environment` and have `AIS` in `services`.

### 3.2 `GET /aspsps`: list institutions (FACT)
Query: `country` (ISO 3166 alpha-2, e.g. `IT`), `psu_type` (`personal` | `business`), `service` (e.g. `AIS`), `payment_type`. For Lilleri, call `GET /aspsps?country=IT&psu_type=personal&service=AIS`.
Response `GetAspspsResponse`:
```
{ "aspsps": [ {
    "name": "string",                 // required. ASPSP identity is the PAIR (name, country); there is no separate id
    "country": "IT",                  // required
    "logo": "uri",                    // required; supports Uploadcare suffixes such as "-/resize/500x/"
    "psu_types": ["personal"],        // required
    "auth_methods": [ { "name": "...", "title": "...", "psu_type": "personal",
                        "credentials": [ { "name","title","required","description","template" } ],
                        "approach": "REDIRECT" | "DECOUPLED" | "EMBEDDED",
                        "hidden_method": false } ],   // required
    "maximum_consent_validity": 15552000,   // required, SECONDS (180 d = 15,552,000)
    "sandbox": { "users": [ { "username","password","otp" } ] },
    "beta": false,                    // required
    "bic": "string",
    "required_psu_headers": ["Psu-Ip-Address", ...],
    "payments": [ ... ],              // PIS only; ignore
    "group": { "name": "...", "logo": "uri" }
} ] }
```
Notes:
- Several Italian brands appear as separate ASPSPs or `auth_methods`. Examples: BancoPosta vs Postepay; BPER Banca vs BPER Banca Carte, with methods "Servizi digitali Smart" / "Area Riservata Carte"; each BCC is listed individually. FACT (Italy page; March 2026 changelog).
- `maximum_consent_validity` is "180 days for the majority of ASPSPs" (FACT, FAQ excerpt). Firefly falls back to 90 days (7,776,000 s) when the field is missing.
- `beta: true` means the connector is in beta. Lilleri should not mark such a connector "available" without its own test.

### 3.3 `POST /auth`: start authorisation (FACT)
Request `StartAuthorizationRequest`:
```
{
  "access": {                               // required
    "valid_until": "2027-04-03T12:00:00.000000+00:00",  // required, RFC 3339 WITH offset;
                                            //   must be <= now + aspsp.maximum_consent_validity
    "balances": true,                       // optional
    "transactions": true,                   // optional
    "accounts": [ { "iban": "IT60X..." } ]  // optional; omit → bank decides (user picks / all accounts)
  },
  "aspsp": { "name": "Intesa Sanpaolo", "country": "IT" },   // required, exact pair from /aspsps
  "state": "<opaque CSRF+correlation token>",                // required; echoed back on redirect
  "redirect_url": "https://app.lilleri.example/callback/eb",  // required; must be whitelisted on the app
  "psu_type": "personal",                   // business | personal
  "auth_method": "<auth_methods[].name>",   // optional
  "credentials": { ... },                   // optional; only with auth_method, else WRONG_REQUEST_PARAMETERS
  "credentials_autosubmit": true,           // optional
  "language": "it",                         // optional, 2-letter lowercase
  "psu_id": "<pseudonymous Lilleri user id>" // optional; only its hash is stored; use an anonymised id
}
```
`valid_until` semantics (FACT, OpenAPI): the bank may adjust the consent upward to its own minimum, but the **session** expires exactly at the value given.

Response `StartAuthorizationResponse`: `{ "url": "https://auth.enablebanking.com/ais/start?sessionid=…", "authorization_id": "<uuid>", "psu_id_hash": "<hex>" }`. Redirect the user to `url`. `authorization_id` is not the session id that is later used for data.

Terms-consent step (FACT): when Enable Banking acts as the regulated entity, as it would for Lilleri, its hosted flow shows Enable Banking's terms before the bank redirect. An embeddable widget can show them in-app: `<enablebanking-consent authorization="<authorization_id>" origin="https://auth.enablebanking.com" locale="IT">`. This step is skipped only for licensed TPPs using their own eIDAS certificates. Source: https://enablebanking.com/docs/api/widgets and the FAQ.

### 3.4 Redirect callback (FACT, OAuth 2.0 style)
The bank and Enable Banking redirect to `redirect_url` with query parameters:
- on success: `code` and `state`;
- on failure: `state`, `error` (for example `access_denied` when the user cancels) and a human-readable `error_description` (VERIFY the exact name; the docs only say "error code and human-readable description").

Firefly reads `code`, `state` and `error`. Lilleri must validate `state` against its stored pending authorisation (single use, short TTL) before exchanging `code`.

### 3.5 `POST /sessions`: exchange code for a session (FACT)
Request `AuthorizeSessionRequest`: `{ "code": "<code from redirect>" }`
Response `AuthorizeSessionResponse`:
```
{
  "session_id": "<uuid>",                       // required. Store it; it is the consent handle
  "accounts": [ AccountResource ],              // required
  "aspsp": { "name": "...", "country": "IT" },  // required
  "psu_type": "personal",                       // required
  "access": { "valid_until": "...", "balances": ..., "transactions": ..., "accounts": [...] }  // required
}
```
`AccountResource` (FACT, OpenAPI):
| Field | Type / values | Lilleri use |
|---|---|---|
| `uid` | uuid | `account_id` path parameter for balances and transactions. **Valid only while the session is `AUTHORIZED`.** It can be absent if the account is blocked or closed. |
| `identification_hash` (required) | string | **Stable account identity across sessions**, including after re-consent. Use it as `providerAccountId`. |
| `identification_hashes` (required) | string[] | Fuzzy matching (IBAN vs BBAN). |
| `account_id` | `{ iban }` or `{ other: { identification, scheme_name, issuer } }` | Display a masked IBAN. |
| `all_account_ids` | GenericIdentification[] | — |
| `account_servicer` | `{ bic_fi, clearing_system_member_id, name }` | — |
| `name` | account holder name(s) | — |
| `details` | description by PSU or ASPSP | Display name fallback |
| `usage` | `PRIV` / `ORGA` | Reject `ORGA` for the consumer product |
| `cash_account_type` (required) | `CACC` / `CASH` / `CARD` / `LOAN` / `SVGS` / `OTHR` | `CACC`→`current`, `CARD`→`card`, `SVGS`→`savings`, `CASH`→`cash`; `LOAN` / `OTHR` → do not import (ASSUMPTION mapping) |
| `product` | proprietary product name | Display |
| `currency` (required) | ISO 4217 | — |
| `psu_status` | holder / co-holder / attorney | — |
| `credit_limit` | `{ currency, amount }` | Cards |
| `legal_age` | boolean or null | — |
| `postal_address` | object | Do not store (data minimisation) |

### 3.6 `GET /sessions/{session_id}`: session state (FACT)
Response `GetSessionResponse`: `status` (required) is one of `INVALID | PENDING_AUTHORIZATION | RETURNED_FROM_BANK | AUTHORIZED | EXPIRED | CLOSED | REVOKED | CANCELLED`. Other fields: `accounts` (uuid[]), `accounts_data` (`[{ uid, identification_hash, identification_hashes }]`), `aspsp`, `psu_type`, `psu_id_hash`, `access` (with `valid_until`), `created`, `authorized`, `closed`.
Map to the Lilleri consent state machine: `AUTHORIZED` → active; `EXPIRED` → needs renewal; `REVOKED` / `CLOSED` / `CANCELLED` → disconnected; `PENDING_AUTHORIZATION` / `RETURNED_FROM_BANK` → in progress; `INVALID` → failed.

### 3.7 `DELETE /sessions/{session_id}`: revoke (FACT)
The docs say: "Delete session by session ID. PSU's bank consent will be closed automatically if possible." It takes optional PSU headers and returns a `SuccessResponse` on 200. After this call the `uid`s stop working. Lilleri's `disconnect()` calls it, then deletes or marks local tokens. A bank-side consent close is best effort ("if possible"), so the UI copy must not promise a bank-side revocation.

### 3.8 `GET /accounts/{account_id}/details` (FACT)
This call returns the same `AccountResource` as above. It is optional; the session response already carries the accounts.

### 3.9 `GET /accounts/{account_id}/balances` (FACT)
Response `HalBalances`: `{ "balances": [ { "name" (required), "balance_amount": { "currency", "amount" } (required), "balance_type" (required: CLAV|CLBD|FWAV|INFO|ITAV|ITBD|OPAV|OPBD|PRCD|OTHR|VALU|XPCD), "last_change_date_time", "reference_date", "last_committed_transaction" } ] }`.
Recommended pick order (ASSUMPTION; varies by bank): `CLBD` (closing booked), then `ITBD`, then `XPCD` / `ITAV` / `CLAV`. Store the `balance_type` and timestamp that were used, and show "as of".

### 3.10 `GET /accounts/{account_id}/transactions`: paginated (FACT)
Query parameters (all optional):
- `date_from` (date). Note the `DATE_FROM_IN_FUTURE` error.
- `date_to` (date, inclusive, UTC). `DATE_TO_WITHOUT_DATE_FROM` is an error.
- `continuation_key`.
- `transaction_status`: one of `BOOK|CNCL|HOLD|OTHR|PDNG|RJCT|SCHD`.
- `strategy`: `default` | `longest`. With `longest`, the API "attempts to find the earliest available transaction and fetches all subsequent transactions"; `date_to` is ignored and `date_from` is only a hint. With `default`, an unavailable period returns `WRONG_TRANSACTIONS_PERIOD`.

Response `HalTransactions`: `{ "transactions": [Transaction], "continuation_key": "string|null" }`.

Pagination rules (FACT, FAQ):
- Repeat the request with `continuation_key` until it is absent or null.
- Keep **all other query parameters identical** across pages.
- **Continue even when a page is empty** if a key is present.
- Page size varies by ASPSP.
- The key is "only valid in current session".

Firefly caps the loop at 50 pages. Lilleri should cap it and persist progress (ASSUMPTION).

`Transaction` fields (FACT, OpenAPI):
| Field | Notes / Lilleri mapping |
|---|---|
| `entry_reference` | ASPSP's unique, **immutable** id for the account, stable **across sessions**. Not globally unique, so scope it by account `identification_hash`. Use it as `ProviderTransaction.id` when present. |
| `transaction_id` | For `GET /accounts/{id}/transactions/{transaction_id}` only. **Not stable** ("may change if the list is retrieved again"). Never use it as an identity. |
| `transaction_amount` (required) | `{ currency, amount }`. The amount is an unsigned string; the sign comes from `credit_debit_indicator`. |
| `credit_debit_indicator` (required) | `CRDT` / `DBIT` |
| `status` (required) | `BOOK` → booked; `PDNG` → pending; `HOLD` → pending (hold); `CNCL` / `RJCT` → reversed or dropped; `SCHD` → do not import as posted; `OTHR` → quarantine (ASSUMPTION mapping) |
| `booking_date`, `value_date`, `transaction_date` | `transaction_date` is the card transaction date. `bookedOn` = `booking_date`; `authorizedOn` = `transaction_date`. |
| `creditor`, `debtor` | `{ name, postal_address, organisation_id, private_id, contact_details }`. The counterparty `name` is the merchant hint. |
| `creditor_account`, `debtor_account` | `{ iban }` or `{ other }`. Transfer detection. |
| `creditor_agent`, `debtor_agent` | `{ bic_fi, clearing_system_member_id, name }` |
| `bank_transaction_code` | `{ description, code, sub_code }` |
| `merchant_category_code` | ISO 18245 MCC, **when the bank provides it** |
| `remittance_information` | string[]. Join it for the description; Italian CBI Globe banks often put everything here (ASSUMPTION carried over from the earlier research). |
| `reference_number`, `reference_number_schema` | Structured creditor reference |
| `balance_after_transaction` | Running balance, when provided |
| `exchange_rate` | `{ unit_currency, exchange_rate, rate_type, contract_identification, instructed_amount }`. Maps to `fxEvidence`. |
| `debtor_account_additional_identification`, `creditor_account_additional_identification`, `note` | — |

When `entry_reference` is absent, which is common for pending items, derive a fallback id from (account `identification_hash`, `status`, amount, `credit_debit_indicator`, `transaction_date` or `booking_date`, normalised `remittance_information`), and treat pending-to-booked matching as fuzzy (ASSUMPTION; consistent with the repo's reconciliation research).

### 3.11 `GET /accounts/{account_id}/transactions/{transaction_id}` (FACT)
This returns one `Transaction`. It is optional and not needed for sync.

## 4. PSU headers and refresh budget

| Rule | Label | Source |
|---|---|---|
| Data endpoints accept `Psu-Ip-Address`, `Psu-User-Agent`, `Psu-Referer`, `Psu-Accept`, `Psu-Accept-Charset`, `Psu-Accept-Encoding`, `Psu-Accept-language`, `Psu-Geo-Location`. | FACT | OpenAPI (balances, details, transactions, DELETE session) |
| Send them **only when the user is actually present** (pull-to-refresh, onboarding). This "typically exempts the request from limitations on background transaction fetching". | FACT | FAQ "PSU Headers" |
| If an ASPSP lists `required_psu_headers`, send **all or none** of them; otherwise the call fails with `PSU_HEADER_NOT_PROVIDED`. | FACT | OpenAPI ASPSPData |
| Unattended fetches: "frequently limited to four times per day by many ASPSPs" (RTS art. 36(5)(b)). On 429 `ASPSP_RATE_LIMIT_EXCEEDED`, wait **6 hours** before the next background fetch. | FACT | FAQ "Rate Limits" |
| Lilleri budget: at most 3 scheduled background syncs per account per 24 h, keeping one in reserve, plus user-present refreshes. Fetch balances and transactions in the same cycle, because each call can count against the bank's quota. | ASSUMPTION (design) | — |
| After the 180-day SCA window, many ASPSPs return only the last 90 days of transactions. The first sync should use `strategy=longest` and record the oldest date actually returned. | FACT (EB FAQ excerpt) / ASSUMPTION (strategy choice) | FAQ |

## 5. Error format

All non-2xx responses use `ErrorResponse` (FACT, OpenAPI):
```
{ "message": "string (required)", "code": 422, "error": "WRONG_TRANSACTIONS_PERIOD", "detail": <any> }
```
- `code` is identical to the HTTP status.
- Statuses documented: 400, 401, 403, 404, 408, 422, 429, 500.
- Note that Firefly's parser also tolerates `error_code` and `details`, so parse defensively (VERIFY).

`error` enum (FACT): `ACCESS_DENIED, ACCOUNT_DOES_NOT_EXIST, ALREADY_AUTHORIZED, ASPSP_ACCOUNT_NOT_ACCESSIBLE, ASPSP_ERROR, ASPSP_TIMEOUT, ASPSP_RATE_LIMIT_EXCEEDED, AUTHORIZATION_NOT_PROVIDED, CLOSED_SESSION, DATE_TO_WITHOUT_DATE_FROM, DATE_FROM_IN_FUTURE, EXPIRED_AUTHORIZATION_CODE, EXPIRED_SESSION, INVALID_ACCOUNT_ID, INVALID_HOST, UNAUTHORIZED_IP, NO_ACCOUNTS_ADDED, PAYMENT_NOT_FOUND, PSU_HEADER_NOT_PROVIDED, PSU_HEADER_INVALID, REDIRECT_URI_NOT_ALLOWED, REVOKED_SESSION, SESSION_DOES_NOT_EXIST, UNAUTHORIZED_ACCESS, UNTRUSTED_PAYMENT_PARTY, WEBHOOK_URI_NOT_ALLOWED, WRONG_ASPSP_PROVIDED, WRONG_AUTHORIZATION_CODE, WRONG_DATE_INTERVAL, WRONG_CREDENTIALS_PROVIDED, WRONG_REQUEST_PARAMETERS, WRONG_SESSION_STATUS, WRONG_TRANSACTIONS_PERIOD, WRONG_CONTINUATION_KEY, TRANSACTION_DOES_NOT_EXIST, PAYMENT_LIMIT_EXCEEDED, ASPSP_PAYMENT_NOT_ACCESSIBLE, INVALID_PAYMENT, ASPSP_PSU_ACTION_REQUIRED, PAYMENT_NOT_FINALIZED, PAYMENT_SUBMISSION_NOT_SUPPORTED, PAYMENT_NOT_AUTHORIZED, PAYMENT_SUBMISSION_NOT_DEFERRED`.

Suggested adapter classification (ASSUMPTION):
| Class | Codes | Action |
|---|---|---|
| Re-consent needed | `EXPIRED_SESSION`, `REVOKED_SESSION`, `CLOSED_SESSION`, `ACCESS_DENIED`, `ASPSP_PSU_ACTION_REQUIRED`, `WRONG_SESSION_STATUS` | Mark the connection as needing attention and prompt renewal. Do not retry. |
| Back off | `ASPSP_RATE_LIMIT_EXCEEDED` (429) | Wait 6 h (FAQ). Do not count the attempt as a failure of the connection. |
| Transient | `ASPSP_ERROR`, `ASPSP_TIMEOUT`, HTTP 408 / 500 | Exponential backoff, within the daily budget |
| Data/period | `WRONG_TRANSACTIONS_PERIOD`, `WRONG_DATE_INTERVAL`, `DATE_FROM_IN_FUTURE`, `WRONG_CONTINUATION_KEY` | Restart pagination without the key, or retry with `strategy=longest` |
| Account gone | `ACCOUNT_DOES_NOT_EXIST`, `ASPSP_ACCOUNT_NOT_ACCESSIBLE`, `INVALID_ACCOUNT_ID` | Re-read the session and mark the account unavailable |
| Bug / config | `WRONG_REQUEST_PARAMETERS`, `REDIRECT_URI_NOT_ALLOWED`, `UNAUTHORIZED_ACCESS`, `INVALID_HOST`, `UNAUTHORIZED_IP`, `PSU_HEADER_*`, `WRONG_ASPSP_PROVIDED` | Alert. Do not retry. |
| Callback | `EXPIRED_AUTHORIZATION_CODE`, `WRONG_AUTHORIZATION_CODE`, `ALREADY_AUTHORIZED` | Restart `POST /auth`, or treat as idempotent if the session already exists |

## 6. Mapping to Lilleri's existing provider contract (ASSUMPTION / design suggestion)

| Lilleri (`packages/financial-providers/src/index.ts`, `contracts.ts`) | Enable Banking |
|---|---|
| `listInstitutions(cursor)` | `GET /aspsps?country=IT&psu_type=personal&service=AIS`. There is no cursor, so return a single page; the institution id is a stable encoding of `name` + `country`. |
| `createConnection(ctx)` → `ProviderConnectionGrant` | `POST /auth` → `url` (redirect), with `valid_until = now + min(180 d, maximum_consent_validity)`; state persisted server-side |
| callback completion | `POST /sessions { code }` → store `session_id`, `access.valid_until`, accounts (`identification_hash`, `uid`) |
| `renewConnection(ctx)` | A new `POST /auth` for the same ASPSP, then a new session. Match accounts by `identification_hash` and transactions by `entry_reference`. Delete the old session only after the new one is `AUTHORIZED`. |
| `listAccounts` / `getBalances` | Session `accounts` + `GET /accounts/{uid}/balances` |
| `getTransactions(ctx, accountId, cursor)` → `ProviderPage { transactions, nextCursor }` | `GET /accounts/{uid}/transactions` with `date_from` / `strategy` + `continuation_key` ↔ `nextCursor`. The key is session-scoped, so never persist it across sessions. |
| `refreshConnection` | `GET /sessions/{id}` status check plus the budgeted fetch |
| `disconnect` | `DELETE /sessions/{session_id}` |
| `capabilities().grantSpecificRevocation` | `true` (revocation is per session) |
| `discoveryMetadata().environment` | from `GET /application.environment` (`sandbox` → `sandbox`, `production` → `live`) |

## 7. Webhooks and other gaps

- **AIS data webhooks:** none were found in the retrieved documentation. Sync is pull-based. UNKNOWN; ask Enable Banking.
- **SLA, status page:** UNKNOWN in first-party material.
- **Data residency, sub-processors:** UNKNOWN; ask in the contract.
- **Italian field fill rates** (`creditor.name`, `merchant_category_code`, `bank_transaction_code`, `entry_reference` on pending items): UNKNOWN per bank. Measure them in restricted mode with the founder's own accounts.

## 8. Sources

| # | Source | URL | Accessed | Method |
|---|---|---|---|---|
| S1 | Enable Banking OpenAPI (aggregation API) | https://enablebanking.com/docs/api/reference/enablebanking-api.yaml | 2026-10-05 | Context7 index `/openapi/enablebanking_api_reference_enablebanking-api_yaml` (direct fetch blocked by proxy) |
| S2 | API reference (JWT, flows, strategy, environment, examples) | https://enablebanking.com/docs/api/reference/ | 2026-10-05 | Context7 `/websites/enablebanking` + WebSearch excerpt |
| S3 | Quick start (JWT claims) | https://enablebanking.com/docs/api/quick-start | 2026-10-05 | Context7 |
| S4 | FAQ (pricing model, PSU headers, rate limits, continuation key, licence, 180-day validity) | https://enablebanking.com/docs/faq/ | 2026-10-05 | Context7 + WebSearch excerpts |
| S5 | Sandbox | https://enablebanking.com/docs/api/sandbox | 2026-10-05 | Context7 |
| S6 | Linked accounts / restricted production | https://enablebanking.com/docs/api/linked-accounts/ | 2026-10-05 | Context7 + WebSearch |
| S7 | Control panel | https://enablebanking.com/docs/api/control-panel/ | 2026-10-05 | Context7 + WebSearch |
| S8 | UI widgets (terms consent) | https://enablebanking.com/docs/api/widgets | 2026-10-05 | Context7 |
| S9 | Terms of Service (free restricted use; evaluation or personal use only) | https://enablebanking.com/terms/ | 2026-10-05 | WebSearch excerpt |
| S10 | TPP API v1 (JWT header `typ/alg/kid`) | https://enablebanking.com/docs/tppapi/latest | 2026-10-05 | Context7 |
| S11 | Official samples, `python_example/account_information.py`, `config.json`, README | https://github.com/enablebanking/enablebanking-api-samples (commit 7a16788, 2026-03-30) | 2026-10-05 | `git clone` (full read) |
| S12 | Firefly III data-importer Enable Banking client | https://github.com/firefly-iii/data-importer/tree/main/app/Services/EnableBanking (commit 07fa5e9, 2026-09-23) | 2026-10-05 | `git clone` (code read) |
