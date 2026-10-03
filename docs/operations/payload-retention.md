# Automatic synthetic payload retention

The local API runs bounded physical cleanup using its existing database handle in both demo and local identity modes. This covers all profiles with expired raw content, including profiles created through registration. Canonical transactions, immutable observation metadata, corrections, rules and financial results remain intact. A payload expires at its original ingest instant plus 720 hours; unchanged provider sync or CSV replay never extends that deadline or recreates deleted content. Export also omits expired raw content before physical cleanup runs.

## Schedule and bounds

The pump starts one batch immediately and schedules the next batch after the previous one completes. Timer and manual requests coalesce into the same in-flight promise. Graceful shutdown cancels the pending timer and awaits active work before the database handle closes.

Each batch visits a page of expired profiles in ascending internal ID order. The next batch continues after the last visited profile; after reaching the end, it wraps. Each profile has its own deletion limit, so a large first profile cannot monopolise subsequent runs. A profile created behind the cursor is visited after the next wrap. The paging cursor lives only in memory and is never logged; restarting starts a new pass. Independent PostgreSQL processes may run concurrently: profile locks and scoped deletion predicates prevent duplicate deletion, while every process retains its own limits. A profile-level failure is counted and other profiles in the page continue; the failed profile is retried after the cursor wraps.

| Configuration | Default | Accepted values |
|---|---:|---|
| `PAYLOAD_RETENTION_ENABLED` | `1` | `0` or `1` |
| `PAYLOAD_RETENTION_INTERVAL_MS` | `60000` | Integer 1,000–86,400,000 |
| `PAYLOAD_RETENTION_PROFILE_LIMIT` | `20` | Integer 1–100 |
| `PAYLOAD_RETENTION_PAYLOAD_LIMIT` | `100` | Integer 1–1,000 per visited profile |

Invalid configuration fails before cleanup starts, including when disabled. A disabled pump does not schedule or delete; status can still count the expired backlog. The maximum deletion volume per batch is the product of the two limits. SQL aggregate counts and profile discovery may scan more rows than are deleted; production capacity and indexing require measurement.

## Status and standalone PostgreSQL worker

Status distinguishes the remaining expired payload count from deletions in the last run and since this pump started. Counters since startup are process-local, not a durable deletion certificate. A failed count is `null` with a safe error code, never a fabricated zero. Reports include only aggregate counts, clock instants, state and allowlisted codes; they exclude profile IDs, source IDs, descriptions, raw content, SQL and credentials.

The preferred path is the pump inside the API, using the same PGlite/PostgreSQL handle. After building `@lilleri/api`, the standalone entry point is `node dist/retention-worker.js run|status|watch` from `apps/api`. `run` performs one bounded page, `status` reports the global expired count, and `watch` runs the fair scheduled pump until SIGINT/SIGTERM. The standalone worker requires a trusted synthetic PostgreSQL `DATABASE_URL`, exactly one of `DEMO_MODE=1` or `LOCAL_AUTH_MODE=1`, and a nonproduction environment. It rejects any `PGLITE_PATH` configuration and never opens a second file-backed PGlite store. Its output is aggregate-only; configuration/database failures emit a safe code and exit status 2. Do not point it at a production or real-data database.

The standalone one-shot `run` starts its cursor at the beginning each invocation. Use `watch` or the API pump for fairness across a persistent backlog; repeatedly launching only the one-shot command does not preserve paging state.

## Evidence and limits

On 2026-10-03, nine dedicated tests passed with PGlite and with real PostgreSQL on the current twelve-migration synthetic database. Tests inject the clock and timer to check immediate scheduling, exact expiry, bounded fair paging/wrap, a new earlier profile, nonoverlap, graceful stop, failed-run retry, asynchronous reporter failure, per-profile failure isolation/retry, disabled mode, concurrent batches and replay after scheduled deletion. The retention source checks and API typecheck passed at implementation time; the combined repository gate is recorded separately in the project status. Standalone PostgreSQL `run` and local-identity `status` returned aggregate-only output; `watch` handled SIGTERM and exited 0, while a configured `PGLITE_PATH` was rejected with safe output and exit 2. The eight original retention tests also passed in the PostgreSQL-configured run (seven shared real-PG cases plus the intentionally PGlite legacy migration case). This is local execution evidence, not production scheduling/SLA evidence.

This implements successful synthetic-source raw payload cleanup only. It does not establish production retention necessity, a daily operational SLA, quarantine/incident exceptions, processor deletion, backup/PITR purging, key erasure, rollback-safe restore or receipt/email/AI content lifecycles. Those controls require their own implemented evidence and external clearance.
