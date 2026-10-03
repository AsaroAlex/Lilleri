# Local consent lifecycle and event history

Implementation date: **2026-10-03**. This delivers the local synthetic consent state/history and pause/resume/renewal portions of **E02.6–.7**. Actual provider access, legal authorization, official sandbox behavior, native redirects and delivery of expiry reminders remain separate acceptance work.

`consent_lifecycles` stores the current consent generation, a monotonically increasing revision, pause flag, provider authorization metadata and a categorical provider-error signal. `consent_events` appends the corresponding grant, renewal, pause, resume, revocation, error/recovery or explicitly inferred legacy event. The events include the provider's separate consent, SCA, session and token terms and their evidence references. They contain no credentials, raw financial descriptions, IP address or device fingerprint.

Migration **0017_consent_lifecycle.sql** binds both tables to the reserved household, profile, connection and consent generation. Both tables use `ENABLE` and `FORCE ROW LEVEL SECURITY` with the same trusted/runtime boundaries introduced in migration 0015. The runtime role can select/insert events, but cannot update/delete them. Migration **0022_audit_parent_erasure.sql** preserves the original migration checksum and corrects the trigger to permit the existing foreign-key cascades when an owning profile, connection or exact consent generation is physically erased. Updates and direct event deletion remain denied. The exception requires a nested trigger and an absent exact scoped parent; it grants no runtime privileges and introduces no security-definer function. Ordinary disconnect/revocation and pause retain the source and its history. Physical source erasure removes its associated personal audit alongside the ledger/raw content. This is an append-only user-owned local history, rather than a promise of an unlimited lawful retention period.

## Actual state and access

The lifecycle read derives `active`, `expiring`, `expired`, `revoked`, `error`, `paused` or `unknown` from current consent/connection rows and validated provider metadata. Revocation and expired/unusable authorization take precedence over a pause flag. A paused connection whose consent expires therefore reports `expired` with `paused: true`; resuming cannot turn an expired grant into usable access. Consent/SCA/session expiry and token expiry keep distinct reasons. Unknown authorization remains unknown and denies refresh.

Advance expiry status uses the explicit versioned `connectionLifecycle.expiringOffsetSeconds` configuration and an actual known consent or provider-required-action date. The central default is zero, which disables advance warnings. No fixed 180-day term, day-150 timeline or invented deadline is supplied. Unknown dates do not generate reminders. This module computes status; it does not deliver notifications.

`assertLifecycleAllowsRefresh` denies paused, expired, revoked, error and unknown states before provider I/O. It also rejects outstanding durable revocation work. The root financial service calls this inside the transaction that holds the profile and connection locks; later provider collection therefore cannot overtake a concurrent pause/disconnect. A missing lifecycle row can use the existing known legacy consent expiry safely. Reading this fallback does not write an event or invent provider renewal capabilities.

## Commands and atomicity

`ConsentLifecycleService` is constructed with a server-resolved profile and a database handle already scoped by the request boundary. Pause, resume and renewal lock the profile and connection and compare the supplied lifecycle revision before changing anything. Competing commands with the same revision have one winner. Stale requests return `consent_changed`; repeated requests for the already selected pause state add no event.

Pause and resume preserve the consent generation, granted time, expiry, saved ledger and last sync time. They perform no provider request. The first mutation of an unrecorded legacy grant appends `legacy_imported`, clearly marked as inference, before the requested event; its first returned revision is consequently two rather than one.

Renewal requires the expanded provider contract, actual supported renewal metadata, a non-revoked current generation and no outstanding revocation work. The adapter receives that current generation and selected institution. The result is validated before the consent expiry/current authorization are replaced. Local renewal accepts only an active, future-expiring in-place result; native/hosted redirect completion is not fabricated. Renewal preserves an existing pause flag. Malformed, stale, expired or failed provider results leave consent rows and audit unchanged. A provider term can extend expiry; the application never adds a guessed duration.

The integration hooks operate in the caller's financial transaction:

| Hook | Required caller order |
|---|---|
| `recordConsentGranted` | Insert/update the actual scoped consent row, then record validated discovery/authorization metadata and grant/renewal event. |
| `recordConsentRevoked` | Commit local connection/consent denial in the same transaction, then append revocation and clear future required actions. Existing outbox enqueue remains separate; this hook performs no provider I/O. |
| `recordConsentProviderSignal` | Record an actual mapped categorical provider error/recovery in a successful transaction. It is not called merely to infer health from a display timestamp. |
| `assertLifecycleAllowsRefresh` | Call after acquiring the financial profile/connection lock and before any provider request. |

A provider-error signal is an operational state, not a bank-health claim. No exception text is stored. A successful recovery must be an actual accepted provider signal and must also satisfy the underlying consent/connection state; it cannot bypass expiry or revocation.

Each accepted transition writes one captured instant to both the current lifecycle and its appended event. Pause/resume reuse that instant for validation, legacy materialization, state and response. Renewal reads its preflight state before provider I/O, then captures the accepted transition instant after the provider returns and uses it consistently for expiry validation and persistence. Event time comes directly from the persisted lifecycle timestamp. This prevents ordinary milliseconds of request latency from making the ownership ZIP reject its own current history; existing journal rows remain immutable.

## API and ownership export

`registerConsentLifecycleRoutes` registers the following routes using a service resolver supplied by the root API. Read DTOs strip household implementation fields and include only the owning profile's state/history.

| Method | Route | Behavior |
|---|---|---|
| GET | `/v1/connections/:id/lifecycle` | Actual lifecycle, revision, dates, freshness and blocked reason. |
| GET | `/v1/connections/:id/consent-events` | Ordered append-only history for this owned connection. |
| POST | `/v1/connections/:id/pause` | Strict `{ revision }` body. |
| POST | `/v1/connections/:id/resume` | Strict `{ revision }` body; expired/revoked grants stay denied. |
| POST | `/v1/connections/:id/renew` | Strict `{ revision }` body; validated local provider renewal only. |

The exported `consentLifecycleDto` and `consentEventDto` support the overview and ownership export integration. Constructor binding, SQL scope and composite foreign keys reject another profile's connection or consent generation. Client profile/household selectors are not command parameters.

## Evidence

The focused suite covers actual terms, pause/resume invariants, one-winner concurrency, stale/no-op commands, expiry/SCA/session/token boundaries, configured warning offsets, provider error/recovery, renewal with pause and expired-provider renewal, revocation/outstanding outbox denial, read-only legacy inference, missing/invalid expiry, atomic rollback, provider failure/stale generation, regrant revisions/history, cross-profile FK refusal, immutable events/erasure, actual non-owner RLS and strict route DTOs. The source-erasure regression deletes an owned connection through `lilleri_runtime`, denies direct journal deletion and another profile's connection deletion, removes only the owned lifecycle/history and preserves the other profile. The combined consent/retention suites pass **30 tests on PGlite and 30 on PostgreSQL** with all 22 checksum migrations. The richer retention fixture also exercises notification, CSV/provenance and transaction-privacy cascades while retaining independent profile/support history until profile erasure.

```sh
. /workspace/.lilleri-toolchain/env.sh
pnpm --filter @lilleri/api exec vitest run test/consent-lifecycle.test.ts
PG_TEST_DATABASE_URL=postgres://lilleri:lilleri@127.0.0.1:55432/lilleri_execution_20261003 \
  pnpm --filter @lilleri/api exec vitest run test/consent-lifecycle.test.ts
pnpm --filter @lilleri/api typecheck
```

The route fixture verifies serialization and strict requests with a fixed synthetic service binding. Authenticated root API/browser integration remains part of the broader acceptance run; these module tests alone do not establish native behavior, production hosting, real provider authorization or notification delivery.

The advancing-clock regression raises the focused consent suite to **22/22 passed on PGlite and 22/22 on PostgreSQL**. It covers both an existing provider grant and a legacy grant through pause, renewal, resume, provider error/recovery and local revocation; every returned/stored head exactly matches its latest journal timestamp. Actual scoped GET JSON export and POST ZIP export succeed and preserve the same state/history. Reports: `/workspace/.lilleri-validation/consent-clock-pglite.json` and `consent-clock-postgres.json`.
