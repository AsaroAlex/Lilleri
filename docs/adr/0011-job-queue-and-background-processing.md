# ADR-0011: PostgreSQL-backed jobs when durable asynchronous work is needed

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; implementation team
- **Decision gate:** D scoped design; real-bank beta and Gate E remain separately gated

## Context

FACT: the historical [pg-boss spike](../research/raw/toolchain-spikes.md) delivered a job on real PostgreSQL 16; it did not test this application's retry, locking or deletion/revocation behaviour. Current PGlite synthetic work is bounded and need not run a network queue. ASSUMPTION: a real provider's latency/refresh windows and retries will require durable asynchronous jobs. Redis would add another service without a demonstrated cache/distributed-limit need in the walking skeleton.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| Bounded synchronous mock; pg-boss on real PG later | Minimal local path, durable shared-DB worker when required | Low service count, transactional seam | Requires real-PG worker/concurrency testing | pg-boss historical spike and stack research |
| BullMQ + Redis/Valkey immediately | Redis-backed jobs/cache | Established queue features | Extra service/ops and DB-publication consistency gap | Stack research; no current load need |
| Managed queue / Temporal from start | External durable delivery or workflow engine | Strong scheduling/isolation features | More IAM/cost/vendor/workflow complexity | Cloud proposal, no quoted/contracted service |

Proposal: PostgreSQL jobs/outbox in the first implementation. Critique: pg-boss requires real PostgreSQL behaviour that local PGlite cannot establish, and a synthetic fixture does not need durable jobs. Counterproposal: synchronous bounded mock now, outbox/pg-boss when first real async source arrives. Decision: defer queue runtime without deferring its correctness contract.

## Decision

DECISION: local walking skeleton can complete bounded synthetic sync in-request with honest status/error/freshness. A real provider or unattended background work must use durable processing before beta. pg-boss is the preferred PostgreSQL queue candidate, subject to current API/migration/role/locking tests. Redis/BullMQ and managed queues remain alternatives after measured contention or scheduling requirements. No queue is claimed installed merely because a spike succeeded.

Production job semantics are at least once. Persist source/checkpoint and outbox publication atomically where needed, and make consumer effects idempotent with scoped IDs/receipts. Jobs have connection/account, run ID, consent generation, deadline and stage/version, not raw descriptions. Recheck active consent before fetch and commit; old queued jobs cannot resurrect revoked or erased data. Retry transient errors with bounded jitter and provider allowance; auth/expiry suspend, poison schema records quarantine and dead-letter with owner/replay reason. Partial account success never masquerades as complete connection freshness. Graceful stop, lease expiry, crash-after-commit and retry storms are integration scenarios.

## Consequences

Positive: one database can initially support data and jobs, with no extra service for the synthetic environment. Negative: queue load can compete with financial queries and schema/permissions add operational duties. Measure worker throughput/DB contention before increasing parallelism. Queue retention and job payload privacy are part of the data schedule. Switching queues later still needs outbox/idempotency and rate-limit contracts; external delivery does not make side effects exactly once. A production worker needs an operator/dead-letter runbook, not just an SDK constructor.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Worker retry duplicates effects | Medium | High | Scoped idempotency and transaction/fault tests | Totals or notification count rises on replay |
| Jobs write after revocation/deletion | Medium | Critical | Consent generation fence and restore tombstones | Old run commits after disconnect |
| Queue overwhelms financial database | Medium | High | Bounded concurrency and contention metrics | Read latency/lock waits rise during sync bursts |

## Revisit conditions

Add durable jobs before any real unattended refresh. Revisit pg-boss after measured contention, unsupported scheduling or need for independent infrastructure isolation. Only add Redis for a concrete measured cache/rate-limit/queue need. Require real-PG crash/concurrency integration and safe dead-letter tooling before enabling workers.

## References

- [Pipeline](../architecture/data-pipeline.md), [observability](../architecture/observability.md).
- [Job research](../research/raw/tech-stack-options.md), [spikes](../research/raw/toolchain-spikes.md).
- [ADR-0005](0005-database-postgresql-and-drizzle.md).
