# Synthetic provider revocation outbox

This runtime fixes a concrete loss path: previously a failed provider acknowledgement after local disconnect or profile erasure was discarded. Local denial and a minimal revocation request now commit in the same database transaction. The financial profile can be erased while the request survives for retry.

The worker accepts only synthetic providers advertising grant-specific revocation. It is not a real-bank scheduler, production authorization system, or evidence of provider compliance. A production adapter must demonstrate generation-specific, idempotent revocation and its own network cancellation/timeout contract before this path can be enabled.

## Run and inspect

Build the API and its workspace dependencies using the existing root build command. Then run one bounded batch:

```sh
DEMO_MODE=1 pnpm --filter @lilleri/api worker:revocations
```

The command requires a trusted synthetic PostgreSQL `DATABASE_URL`, exactly one local mode and a nonproduction environment. Any `PGLITE_PATH` is rejected; the API's same-handle pump remains the supported PGlite path. The worker reads the [audited runtime configuration](runtime-configuration.md), with at most four claims per batch by default. `REVOCATION_BATCH_LIMIT` is a validated bootstrap input from 1 to 20; it cannot override an already persisted document. A separate PostgreSQL worker can run while the API is open.

Use trusted configuration to restrict a batch or inspect one profile, including an erased synthetic profile:

```sh
DEMO_MODE=1 REVOCATION_PROFILE_ID=profile_demo pnpm --filter @lilleri/api worker:revocation-status
```

The status command requires `REVOCATION_PROFILE_ID`. Worker output includes configuration revision and aggregate counts by state, excluding routing identifiers, financial records, credentials and provider exception text. HTTP `GET /v1/revocations` retains detailed status scoped to the API's trusted current profile and rejects an erased profile. Workers have no public HTTP dispatch endpoint. Exit code 2 from a batch means at least one claimed request reached terminal failure, or a safe configuration/database failure code was emitted.

## Delivery contract

- Enqueue is deduplicated by profile, connection and consent generation. A repeated disconnect does not reset a completed or failed request.
- Claim uses a short transaction with `FOR UPDATE SKIP LOCKED`. It commits a fresh random lease token before provider I/O; network calls hold no database transaction or row lock.
- Default attempt timeout is 10 seconds, lease is 30 seconds, maximum attempts is 8 and request deadline is 7 days. Backoff doubles from roughly one second with bounded deterministic jitter. Limits are validated by the worker functions.
- A timeout does not prove that an underlying provider request has stopped. Retries can overlap an earlier indeterminate attempt. Acknowledgement is fenced by the current lease token; provider effects are fenced by consent generation. A late revoke for an old generation cannot revoke a newer synthetic grant.
- `pending`, `running` and terminal `failed` requests prevent regrant of that connection. Once acknowledgement completes, regrant preserves canonical account/transaction IDs and creates a new consent generation.
- Local erasure removes financial rows and records its restore tombstone before dispatch. Dispatch never creates a profile, account, transaction or consent.
- Disconnect and erasure return after committing local denial; they do not wait for provider I/O. The API server runs an automatic pump against its own handle, initially with a one-second timer and at most four claims per batch. It reads the authoritative runtime revision before each batch; a paused pump polls for re-enable, and a configuration read failure prevents provider work. Batches never overlap, and the next interval starts after completion. Shutdown stops new claims and waits for the current bounded attempt before closing the database. `createApp` used in tests does not start a background worker implicitly.
- Future-dated retries wait for a later pump tick or explicit batch; the command does not spin or sleep until they become due. The same-handle pump permits automatic retry with the default PGlite store; a second process must not open that store concurrently.

## Failure handling

`provider_unavailable` is retryable until the bound is reached. `provider_unknown`, `deadline_exceeded` and `attempts_exhausted` are terminal. A terminal request remains visible and keeps the regrant barrier. Inspect the synthetic adapter and its configuration before resolving it. This slice deliberately provides no public "mark complete" or blind dead-letter replay action. An operator must establish what happened to the target generation before changing a terminal request through a separately reviewed administrative procedure.

Unfinished requests and terminal evidence are not automatically deleted. Completed-job cleanup and production routing-retention periods still need an explicit operator/privacy policy; this outbox stores only minimal synthetic routing. It must not acquire raw payloads, descriptions or real tokens.

## Verification recorded on 2026-10-03

Twelve dedicated tests pass against PGlite and in a PostgreSQL-configured run. The disk close/reopen case intentionally uses PGlite; the other scenarios use the selected shared driver. They cover enqueue rollback and deduplication, two concurrent claimers, bounded backoff and terminal failures, no private exception leakage, deadline exhaustion, unknown provider routing, timeout, expired-lease recovery, stale acknowledgement fencing, delayed old-generation revocation after replacement, profile-scoped status, local sync/regrant denial, erasure retry without resurrection, durable retry after close/reopen, automatic pump retry, no overlapping batches and clean pump shutdown. The provider suite has a separate old-consent/new-grant regression.

An explicit nonempty PostgreSQL CLI fixture processed one request to `completed` and returned one scoped status row. A compiled-API PGlite smoke confirmed status 200 with only the configured profile's job despite a foreign `profileId` query, export 200 preserving the status array, and status 404 after erasure.
