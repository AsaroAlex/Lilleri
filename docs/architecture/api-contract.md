# API contract and conventions

**Date:** 2026-10-03 · **Status:** Accepted design; route implementation/OpenAPI artifact is authoritative for currently shipped endpoints.

## Boundary and payloads

DECISION: Fastify REST `/v1` with Zod request/response schemas and OpenAPI 3 generation. Mobile imports a typed safe client/DTO, never database/provider secrets. Domain IDs are opaque strings; JSON `amountMinor` is a signed decimal integer string with currency, never a JSON number. Dates are real `YYYY-MM-DD`; instants are ISO 8601 UTC. User-facing text is translated Italian; machine error codes are stable English identifiers.

The default walking skeleton uses a server-selected synthetic profile and loopback-only demo identity. An opt-in local synthetic mode verifies Better Auth sessions and server-derived profile membership on every financial request; its passkey/TOTP and step-up controls are documented in [local identity](local-identity.md). Both modes reject production and non-loopback startup. It does not offer production authentication or imply that choosing a header profile ID grants financial access. Real-user beta requires verified authentication, sessions, membership checks and anti-CSRF rules where cookies apply. Every resource lookup and foreign reference is profile-scoped. Unknown or unauthorised object returns indistinguishable `404` without enumerating another profile's data; missing/invalid session uses `401`.

## Current walking-skeleton route contract

FACT: [typed client](../../packages/api-client/src/index.ts) defines the following routes; Fastify emits an OpenAPI route artifact. The current client wrappers are manually typed, not generated from that artifact. Current overview/classification/reconciliation/export have explicit response DTO schemas, including exact money strings and provenance. Raw synthetic source payloads inside export intentionally use a record schema. Automated generated-client drift proof remains a beta hardening gap. The server binds a trusted synthetic profile and never accepts an arbitrary profile header as authentication. Sync remains bounded synchronous mock work. Durable grant-specific revocation is implemented through an outbox with committed claims, leases, bounded retries and the same-handle API pump; it does not supply a durable bank-sync scheduler.

| Capability | Route | Contract |
| --- | --- | --- |
| Health / schema | `GET /health`, `GET /openapi.json` | Safe synthetic health marker and generated route contract |
| Overview/bootstrap | `GET /v1/demo` | `mode: synthetic`, profile, connections, accounts, transactions and analysed summaries/review/recurring |
| Connect mock | `POST /v1/connections/mock` | Synthetic source only; returns connection |
| Sync | `POST /v1/connections/{id}/sync` | Returns inserted/updated/unchanged/rejected counts and actual syncedAt |
| Transactions | `GET /v1/transactions?cursor=...&limit=...` | Bounded page `{items,nextCursor}`; profile-scoped opaque cursor ordered by canonical ID |
| CSV subset import | `POST /v1/imports/csv` | `{accountId,csv}`; bounded strict stable-ID rows, atomic rollback, exact amounts and owned-account currency |
| Category correction | `PATCH /v1/transactions/{id}/classification` | `{categoryId,scope:once|merchant,revision}`; stale revision `409`; stored correction survives replay |
| Match decision | `PATCH /v1/reconciliation/{id}` | `{state:confirmed|rejected|undone,revision}`; 64-hex opaque revision binds source legs, account structure, candidate evidence and decision counter; stale commands return `409` before any write |
| Disconnect | `DELETE /v1/connections/{id}` | Commits local consent denial plus durable generation-specific revocation job; existing synthetic history remains; pending acknowledgement blocks regrant |
| ZIP export | `GET /v1/export/archive` | Scoped 11-file local ZIP with exact CSV/JSON/events/schema/manifest; same recent-auth boundary, 32 MiB cap and binary OpenAPI |
| Export | `GET /v1/export` | Exact scoped synthetic facts, observations and decisions; no paid gate |
| Erasure | `DELETE /v1/profile` | Atomically cascades financial data, tombstone/outbox and local identity/credentials/sessions when enabled; no silent reseed |

The aggregate overview supplies current account/review/summary surfaces. Implemented extensions are documented with their exact DTOs and invariants:

| Capability | Route family | Contract source |
| --- | --- | --- |
| Local sessions, factors, step-up and acceptance | `/api/auth/*`, `/v1/auth/*` | [Local identity](local-identity.md); authenticated financial profile comes from membership, never a submitted selector |
| Explicit versioned category rules | `/v1/rules*` | [Rules](explicit-rules.md); preview binds source and policy revisions, stale apply returns `409`, undo restores a draft |
| Manual accounts, entries, adjustments and reversal | `/v1/manual/*`, `/v1/imports/csv/preview` | [Manual/import](manual-accounts-and-import.md); exact signed amounts, command receipts, audit and bounded read-only CSV preview |
| Profile settings and free beta entitlements | `/v1/settings*` | [Settings](profile-settings-and-entitlements.md); expected revision, actual profile timezone/name, immutable audit |
| Revocation status | `GET /v1/revocations` | [Outbox](../operations/revocation-outbox.md); profile-scoped safe state/error codes |

The JSON export includes scoped rules/events, settings/audit, manual audit, consent/decisions, unexpired source payloads and safe identity/acceptance metadata in local mode. Passwords, factor seeds, recovery codes, passkey private material and session tokens are excluded. The financial snapshot uses a repeatable-read read-only transaction; identity metadata is read separately. Generated-client drift verification, custom categories, real rights processing, processor deletion and shared-subject exports remain separate work.

## Errors and consistency

Current safe RFC 9457 errors follow `application/problem+json`: `type`, `title`, `status`, safe `detail`, `instance`/request ID and stable `code`; optional `fieldErrors` holds field paths/codes without submitted values. `400` malformed input, `401` session invalid, `404` scoped resource absent, `409` revision/idempotency conflict, `422` financial invariant violation, `429` quota with Retry-After, `502` current synthetic provider failure (`503` may be used by later unavailable-service paths). No raw bank response, SQL message, stack, token, description or amount leaks into errors. Optional field errors and production distributed quotas remain future extensions; local session/step-up and bounded authentication quota responses are implemented; the demo currently validates inputs and emits safe problem details without raw provider/SQL messages.

Classification correction accepts the validated body revision. DECISION: other future competing mutation commands also need an expected revision (`If-Match` or validated body revision). Reject stale corrections with `409`, return current safe revision and require an explicit retry; silent last-write-wins can erase a correction. Designed durable command idempotency keys are scoped by principal/profile + operation + key, with request digest and bounded retention. Same key/same request returns stored receipt; changed request is `409`. Persist receipts in the same transaction as durable side effects where possible. Provider refresh itself cannot be made exactly once merely by client request keys. Current mock source ingestion is idempotent by identity/revision and atomic collected batch with scoped connection locking. Manual commands additionally persist scoped idempotency receipts/digests with the financial effect in one transaction; general-purpose HTTP command receipts are not claimed.

Current cursor pages order canonical transaction ID; current cursor contains profile and last ID and is validated, not trusted as SQL. Future date-sorted/filterable views need a stable tuple such as `(bookedDate, id)` plus query/version binding. Enforce page size maximum and allowlisted filters; no arbitrary field/operator/expression input. A moving ledger can be paged under a snapshot/revision where consistency matters. Offset/cursor pagination implementation status is documented by OpenAPI; no false promise of unbounded export in a listing endpoint.

## Authentication, rate limits and versioning

The opt-in local Better Auth integration has executed browser UV passkey/TOTP/recovery and session expiry/revocation tests. Production cookie/transport policy, email delivery/account recovery, native token handling and verified app links remain release prerequisites. Exact allowlisted origins receive credentialled CORS in both local modes; no wildcard origin is accepted. OAuth bank callbacks validate state/PKCE/nonce where the selected provider flow supports them; allowlist redirect hosts and never forward arbitrary provider URLs supplied by a client. Provider webhook signatures and replay windows must be implemented from actual vendor specifications before enabling webhooks.

Designed real-data rate limits must be configured per route/principal/IP with conservative login/recovery/export limits; production distributed limits require shared enforcement. WAF is defence in depth, not resource authorisation. Current mock exposes no public service. Compatible additions stay in `/v1`; breaking money/status/semantics changes require `/v2` or explicit schema migration/version negotiation. Generate OpenAPI and client in CI, check contract drift and test exact serialization, invalid input, tenant attacks, correction persistence, concurrency conflicts and idempotent sync replay.

References: [system](system-architecture.md), [domain](domain-model.md), [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) (standard published 2023; reference, not live verification), [Fastify spike](../research/raw/toolchain-spikes.md) (historical executed evidence).
