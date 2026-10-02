# API contract and conventions

**Date:** 2026-10-02 · **Status:** Accepted design; route implementation/OpenAPI artifact is authoritative for currently shipped endpoints.

## Boundary and payloads

DECISION: Fastify REST `/v1` with Zod request/response schemas and OpenAPI 3 generation. Mobile imports a typed safe client/DTO, never database/provider secrets. Domain IDs are opaque strings; JSON `amountMinor` is a signed decimal integer string with currency, never a JSON number. Dates are real `YYYY-MM-DD`; instants are ISO 8601 UTC. User-facing text is translated Italian; machine error codes are stable English identifiers.

The walking skeleton uses a server-selected synthetic profile and loopback-only demo identity. It does not offer production authentication or imply that choosing a header profile ID grants financial access. Real-user beta requires verified authentication, sessions, membership checks and anti-CSRF rules where cookies apply. Every resource lookup and foreign reference is profile-scoped. Unknown or unauthorised object returns indistinguishable `404` without enumerating another profile's data; missing/invalid session uses `401`.

## Current walking-skeleton route contract

FACT: [typed client](../../packages/api-client/src/index.ts) defines the following routes; the Fastify-generated OpenAPI is the runtime schema authority. The server binds a trusted synthetic profile and never accepts an arbitrary profile header as authentication. Sync is bounded synchronous mock work, not a durable bank scheduler.

| Capability | Route | Contract |
| --- | --- | --- |
| Health / schema | `GET /health`, `GET /openapi.json` | Safe synthetic health marker and generated route contract |
| Overview/bootstrap | `GET /v1/demo` | `mode: synthetic`, profile, connections, accounts, transactions and analysed summaries/review/recurring |
| Connect mock | `POST /v1/connections/mock` | Synthetic source only; returns connection |
| Sync | `POST /v1/connections/{id}/sync` | Returns inserted/updated/unchanged/rejected counts and actual syncedAt |
| Transactions | `GET /v1/transactions?cursor=...&limit=...` | Bounded page `{items,nextCursor}`; profile-scoped opaque cursor ordered by canonical ID |
| Category correction | `PATCH /v1/transactions/{id}/classification` | `{categoryId,scope:once|merchant,revision}`; stale revision409; stored correction survives replay |
| Match decision | `PATCH /v1/reconciliation/{id}` | `{state:confirmed|rejected|undone}`; validates current scoped candidate and financial constraints |
| Disconnect | `DELETE /v1/connections/{id}` | Local mock revocation; existing synthetic history remains |
| Export | `GET /v1/export` | Exact scoped synthetic facts, observations and decisions; no paid gate |
| Erasure | `DELETE /v1/profile` | Cascade synthetic profile data and prevent automatic reseeding through tombstone |

The aggregate overview supplies the current account/review/summary surfaces; it does not require separate empty CRUD endpoints. Separate account/summary endpoints, durable sync status, individual transaction read, custom rules/categories and asynchronous export are future API extensions. Real rights processing, provider-side deletion and shared-subject export require additional implementation/privacy evidence. Match decisions currently have no optimistic revision parameter; protecting concurrent user decisions with a decision revision is a beta hardening gap, even though scoped DB serialization prevents unsafe conflicting relationships.

## Errors and consistency

Designed RFC 9457 `application/problem+json`: `type`, `title`, `status`, safe `detail`, `instance`/request ID and stable `code`; optional `fieldErrors` holds field paths/codes without submitted values. `400` malformed input, `401` session invalid, `404` scoped resource absent, `409` revision/idempotency conflict, `422` financial invariant violation, `429` quota with Retry-After, `502` current synthetic provider failure (`503` may be used by later unavailable-service paths). No raw bank response, SQL message, stack, token, description or amount leaks into errors. If current demo uses simpler errors, that is a contract gap to close before beta, not compliance evidence.

Classification correction accepts the validated body revision. DECISION: other future competing mutation commands also need an expected revision (`If-Match` or validated body revision). Reject stale corrections with `409`, return current safe revision and require an explicit retry; silent last-write-wins can erase a correction. Designed durable command idempotency keys are scoped by principal/profile + operation + key, with request digest and bounded retention. Same key/same request returns stored receipt; changed request is `409`. Persist receipts in the same transaction as durable side effects where possible. Provider refresh itself cannot be made exactly once merely by client request keys. Current mock source ingestion is idempotent by identity/revision and atomic collected batch with scoped connection locking; persistent general client idempotency-key receipts are not claimed implemented.

Current cursor pages order canonical transaction ID; future date-sorted views may use `(bookedDate, id)` or another documented stable tuple; cursor encodes query/profile/version and is validated, not trusted as SQL. Enforce page size maximum and allowlisted filters; no arbitrary field/operator/expression input. A moving ledger can be paged under a snapshot/revision where consistency matters. Offset/cursor pagination implementation status is documented by OpenAPI; no false promise of unbounded export in a listing endpoint.

## Authentication, rate limits and versioning

Future better-auth integration requires actual passkey sign-in/recovery/revocation/expiry tests, secure cookie settings, mobile token handling and verified app links. OAuth bank callbacks validate state/PKCE/nonce where the selected provider flow supports them; allowlist redirect hosts and never forward arbitrary provider URLs supplied by a client. Provider webhook signatures and replay windows must be implemented from actual vendor specifications before enabling webhooks.

Rate limits are configured per route/principal/IP with conservative login/recovery/export limits; production distributed limits require shared enforcement. WAF is defence in depth, not resource authorisation. Current mock exposes no public service. Compatible additions stay in `/v1`; breaking money/status/semantics changes require `/v2` or explicit schema migration/version negotiation. Generate OpenAPI and client in CI, check contract drift and test exact serialization, invalid input, tenant attacks, correction persistence, concurrency conflicts and idempotent sync replay.

References: [system](system-architecture.md), [domain](domain-model.md), [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) (standard published 2023; reference, not live verification), [Fastify spike](../research/raw/toolchain-spikes.md) (historical executed evidence).
