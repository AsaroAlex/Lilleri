# ADR-0005: PostgreSQL, Drizzle and deterministic local PGlite

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; implementation team
- **Decision gate:** D for the scoped mock-first architecture; not a real-data release approval

## Context

FACT: [historical spikes](../research/raw/toolchain-spikes.md) round-tripped bigint minor units through Drizzle/PGlite and delivered a pg-boss job on real PostgreSQL. These tests do not establish current role/RLS, concurrency, migrations or backups. ASSUMPTION: relational constraints and transactional checkpoints are central to tenant correctness and replay. A network database may be unavailable in a restricted cloud workspace, so deterministic local execution needs an in-process option without altering production schema semantics.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| PostgreSQL + Drizzle / PGlite local | Relational SQL with two test/dev drivers | Transactions, explicit migrations, bigint, simple local run | Driver parity and real-PG coverage required | Toolchain spikes and existing SQL design |
| Managed backend ORM/platform | Hosted auth/database APIs | Faster managed infrastructure | Platform coupling and another access model | Stack/vendor research; not contracted |
| SQLite-only / document database | Simple local file or flexible documents | Low local setup cost | Divergence from PG constraints/queue/production design | No equivalent financial consistency evidence |

Proposal: PostgreSQL and Drizzle everywhere with PGlite tests. Critique: PGlite cannot prove multi-process locking, network roles/RLS, TLS or pg-boss behaviour. Counterproposal: same reviewed SQL/migrations with PGlite deterministic dev/test and a required real-PG integration track. Decision: adopt both with explicit scope boundaries.

## Decision

DECISION: PostgreSQL is the real-data database; Drizzle schema/query layer preserves explicit SQL constraints. Local synthetic demo/tests use PGlite. SQL migrations are reviewed, versioned and checksum-controlled; shared environments never silently reapply edited history. Use expand/contract for destructive change and test upgrades from the previous schema. BIGINT money is range-checked and parsed as bigint; `SUM` may return numeric/text and must not become Number.

Every financial row/reference has profile scope. Use composite unique/FK constraints where a reference could cross tenants and repository methods that require an authorised profile. Production RLS is defence in depth, not a substitute for application authorisation; enabling it requires non-owner runtime roles, transaction-local tenant context and real-PG pool/worker tests. It remains designed until that evidence exists. Migration/admin roles are separate from runtime. Real-data launch requires encrypted backup/PITR setup, recovery/deletion-tombstone restore drills and restricted database network access; no such deployment is claimed by this ADR.

## Consequences

Positive: SQL transactions protect observation/cursor/correction consistency, and local tests do not need privileged containers. Portability is stronger than a proprietary ledger service. Negative: the team maintains migrations and two execution modes; a passing PGlite test can conceal real-PG differences. Keep tests for both exact finance and relevant production primitives. A failed real-PG integration is a beta blocker for real data, while the local synthetic slice can still be complete.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| PGlite mistaken for full production verification | High | High | Publish tested scope and real-PG prerequisites | Gate claims based on local WASM alone |
| Cross-profile foreign references | Medium | Critical | Composite constraints plus repository/HTTP denial tests | Object ID resolves outside authorised tenant |

## Revisit conditions

Revisit database architecture after measured storage/lock/query needs, not hypothetical scale. Revisit ORM if explicit constraints/migrations cannot be expressed safely. Upgrade PG major after migration/extension/restore checks. Add RLS only with actual role/pool tests; reopen backup targets after timed drills.

## References

- [Domain model](../architecture/domain-model.md), [NFR](../architecture/nfr.md).
- [Toolchain spikes](../research/raw/toolchain-spikes.md); [raw stack research](../research/raw/tech-stack-options.md).
- [Security architecture](../security/security-architecture.md).
