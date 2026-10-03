# Audited synthetic runtime configuration

`RuntimeConfigurationStore` persists the operational document and its complete revision history. Schema version 1 contains three required strict sections: `payloadRetention`, `revocation` and `observability`, plus optional `connectionLifecycle`, `notifications` and `understanding` sections. Historical documents keep those sections absent, without adding defaults or changing their digest; adding them requires a new audited revision. Unknown keys, strings where booleans or counts are expected, unbounded values, credential fields and free-text audit reasons are rejected before a write. The API exposes no HTTP configuration route. Financial exports contain no global operator configuration.

The immutable bootstrap defaults preserve existing local behavior: retention enabled, a 60-second interval, 20 profiles and 100 payloads per profile; revocation enabled, a 1-second interval, four jobs per batch, a 30-second lease, eight attempts and a 10-second attempt timeout; operational tracing sampled at 0.1 and metrics enabled. The new connection-lifecycle expiry warning window defaults explicitly to zero (advance warnings disabled) and accepts integer seconds up to 30 days. Its consumer must also have an actual provider expiry date; configuration never invents a consent lifetime. These defaults are frozen in the configuration module. Validation limits are safety bounds, not calibrated policy thresholds.

Notifications default to enabled with a 60-second maintenance interval, 20 profiles and 50 events per profile. Provider-relative advance reminder offsets default to an empty frozen list: an operator must explicitly choose windows before upcoming reminders are scheduled. A document can contain up to five distinct positive offsets, each at most 30 days, and a consumer still needs a known provider deadline. `inboxDailyLimit` is fixed to one so an operational edit cannot weaken the product's daily inbox cap. Optional service delivery also requires the separate user's current N-SERVICE preference; security and data-rights messages retain their independent mandatory behavior.

Understanding defaults are a 24-hour maximum balance age, a three-day occurrence tolerance, 120 forecast occurrences and a 62-day horizon. Their respective safety ranges are 0–30 days, 0–31 days, 1–1000 occurrences and 1–366 days. These are explicit synthetic operating assumptions, not a bank freshness SLA or calibrated forecasting guarantees. The per-request service captures the active revision and values before entering the financial SQL scope and returns the operating-policy version with its result.

`ensure(initialDocument)` creates revision 1 exactly once, including under concurrent startup. After bootstrap, the persisted document is authoritative; calling `ensure` with different defaults does not overwrite an operator change. Every successful edit requires the currently active revision and records the complete document, SHA-256 digest, previous revision, bounded actor/reason codes and creation time in one transaction. Competing edits with the same expected revision have one winner. A rollback copies a historical document into a new revision and records its source; it never rewinds the revision counter or revives a stale edit. Database triggers forbid updates/deletes of revision history, deletion of the singleton head and rewinding/skipping its revision.

## Runtime consumers

The retention and revocation pumps accept a configuration reader and read the authoritative values before each bounded batch. A change applies on their next scheduled run; the new interval starts after the current batch completes. Work already in progress keeps the settings with which it started. Configuration read/validation failure prevents new cleanup or provider work and produces only the existing safe aggregate failure status. A dynamic pump paused by configuration continues polling, so a later audited revision can re-enable it. Stopping the process awaits current work and prevents further scheduling.

Static pump callers retain the existing defaults and retention's unscheduled disabled behavior. The source observation expiry remains its original ingest instant plus 720 hours. Configuration does not extend an already recorded expiry or change a queued revocation's seven-day deadline, nor acknowledge failed revocations or weaken the regrant barrier. Observability consumers use the same document; no amounts, descriptions, profile IDs, credentials or free-form properties belong in it.

The standalone PostgreSQL retention worker reads the active revision for `run`/`status`, and `watch` reloads it before each batch, including while paused. The revocation worker likewise uses the active document for enabled state, batch size, lease, attempt limit and timeout. Both print the corresponding configuration revision and aggregate counts. Legacy retention environment settings and `REVOCATION_BATCH_LIMIT` are validated bootstrap inputs; they cannot override an existing active revision. Revocation status is aggregate-only and is limited by a trusted `REVOCATION_PROFILE_ID`; detailed scoped status remains in the authenticated API.

## Trusted local operator

Build the API, then run the operator from `apps/api` against an explicitly trusted **synthetic PostgreSQL** database. It accepts exactly one of `DEMO_MODE=1` or `LOCAL_AUTH_MODE=1`, rejects production and any `PGLITE_PATH`, and never opens a second file-backed PGlite store. The operator credentials are process environment inputs, not configuration values.

```sh
node dist/runtime-config-operator.js init
node dist/runtime-config-operator.js status
node dist/runtime-config-operator.js history
node dist/runtime-config-operator.js update tuning 1 /tmp/synthetic-runtime-config.json
node dist/runtime-config-operator.js rollback 2 1
```

`update` takes a reason (`tuning`, `incident` or `release`), expected revision and a JSON file containing the complete strict document. The file read is bounded to 16 KiB, including growth after its size check. `rollback` takes expected active revision and historical target revision. The actor is the fixed trusted process code `local_operator`, not a caller-provided email/name. History returns at most 100 revisions; the internal store also supports bounded paging after a revision. Successful output includes only the allowlisted configuration/audit fields; failures print `runtime_configuration_operator_failed` and exit 2 without the connection URL, file path, input, SQL or private exception.

This is a privileged local process tool, not production operator authentication or dual approval. Keep its database credentials out of clients. A future deployment needs authenticated operator identities, protected role assignment, reviewed access procedures and retention for the audit itself.

## Operational default lint

`tools/lint-operational-configuration.mjs` parses TypeScript syntax with the declared Babel parser and checks ten maintained maintenance, lifecycle, observability, notification, understanding and server consumers. It rejects inline numeric/boolean/array defaults for seventeen named operational duration, limit, sampling and metrics fields, including arithmetic, TypeScript wrappers, parameter/class defaults, assignments, quoted/computed keys and top-level constant aliases. Central configuration references, runtime reads and safety validation comparisons are accepted. Comments and strings cannot masquerade as code; an invalid parse fails the check. Adding a new consumer/operational field requires extending the maintained list. This scoped guard does not claim to cover all future automation/provider policy parameters.

```sh
node --test tools/lint-operational-configuration.test.mjs
node tools/lint-operational-configuration.mjs
```

## Evidence and remaining scope

On 2026-10-03, all **11 dedicated configuration tests**, **9 retention maintenance tests** and **9 outbox tests** passed against fresh PGlite after the seventeen-migration set was frozen. The configuration suite covers strict schemas, no-PII/credential/free-text fields, concurrent bootstrap/edit fencing, rollback/ABA fencing, immutable SQL history, transactional rollback on head-update failure, disk close/reopen, preservation of legacy optional-field digests, actual pump pause/re-enable/fail-closed behavior, a real queued revocation's changed timeout, and standalone operator argument/mode guards. Four separate Node lint regression groups pass, and the actual seven-consumer scan passes. API build/typecheck passed at implementation time; the repository's combined gate is recorded separately.

After adding optional notification/understanding sections, the expanded **13 configuration tests** and **13 privacy tests** passed together on fresh PGlite. The additional configuration cases preserve historical optional-field absence/digests and reject duplicate/out-of-range reminder windows and synthetic understanding bounds. The four Node regression groups now include those policy fields and array aliases, and the actual ten-consumer scan passes. These additive fields did not change the frozen 0013 migration.

A separate synthetic PostgreSQL proof used the compiled operator and workers on a fresh database. Across six revisions it confirmed exactly one concurrent-edit winner, immutable history/head protection, operator update/history/rollback, aggregate status at the correct revision, a paused retention `watch` re-enabled by an audited update, physical removal of one expired payload, one completed generation-specific revocation, graceful SIGTERM exit and rejection of a standalone PGlite configuration. This is real local PostgreSQL execution evidence, not production operator authentication, distributed configuration availability or scheduling SLA evidence.

This implements the configuration foundation and live maintenance controls for E00.3. Automation thresholds, provider-specific refresh budgets/windows and future feature flags need their own schema revisions and actual consumers. The raw content lifetime and job deadline are established lifecycle bounds rather than discretionary configuration switches. This local evidence does not establish production configuration distribution, availability, authenticated operator audit or externally approved policy changes.
