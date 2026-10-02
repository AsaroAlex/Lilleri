# ADR-0013: Deployment and environments

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; security and operations owners
- **Decision gate:** D for deployment design; E remains open for real-data operations

## Context

FACT: the [system architecture](../architecture/system-architecture.md) selects a portable Node modular monolith, PostgreSQL and a synthetic walking skeleton. PGlite is the local database option; its successful execution cannot establish network isolation, PostgreSQL runtime roles, backups or concurrent workers. FACT: the [privacy model](../compliance/privacy-model.md) requires completed legal/provider and DPIA work before real-user financial processing. ASSUMPTION: a small team benefits from managed database and secret services rather than operating every primitive. UNKNOWN: the hosting supplier, actual processor roles, subprocessors, support access, signed prices and recovery performance. No cloud subscription, public deployment or purchase is authorised by this ADR.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| Portable app plus managed EU primitives | Node API/worker, managed PostgreSQL, secrets and backups | Lower operational burden; standard application/database boundaries | Contract and configuration review still required | [Cloud proposal](../architecture/proposals/proposal-cloud.md); [cost inputs](../research/raw/business-and-cost-inputs.md) |
| Self-managed VM and database | Own application, database, keys and backup jobs | Infrastructure control; apparently low server price | Patching, recovery and staffing cost; larger failure burden | [Boring proposal](../architecture/proposals/proposal-boring.md) |
| Provider-specific serverless platform | Managed runtime/database/auth/queue bundle | Convenient integrated deployment | More proprietary IAM/data coupling; residency paths still need review | [Stack research](../research/raw/tech-stack-options.md) |

Proposal: choose an EU managed platform immediately. Critique: an EU region is not evidence of acceptable international transfers, and buying infrastructure adds no value to the local mock. Counterproposal: accept portable deployment requirements now, select and contract the supplier when real-data prerequisites can be demonstrated. Decision: adopt managed primitives as the real-data direction while leaving vendor and spend undecided.

## Decision

DECISION: separate development, automated test, staging and production configuration and credentials. Development and tests use synthetic fixtures; staging defaults to synthetic data with isolated database/secrets. A controlled real-bank beta is a separately approved processing stage, not permission to put customer data in generic staging. Never copy production financial data into developer machines, preview builds or screenshots.

Before real data, select an EU deployment after reviewing actual region, replicas, telemetry, backup locations, remote administration, subprocessors, DPA and transfer mechanisms. Require managed PostgreSQL, restricted runtime roles/network access, secret management, encryption/key lifecycle, bounded backup/PITR and an exercised restore. [NFR](../architecture/nfr.md) beta RPO ≤1 hour and RTO ≤8 hours are hypotheses to demonstrate; production ≤15 minutes/≤4 hours are later targets. [Retention](../compliance/data-retention.md) proposes a maximum 30-day backup window. Replay protected deletion tombstones and revoke restored sessions/secrets before restored traffic or jobs resume; deleting a live key alone does not prove irreversible backup erasure.

Build immutable artifacts from a frozen lockfile. CI checks formatting/lint, types, meaningful financial and API tests, real-PG paths that exist, and client/server builds. Scan findings require review. Use explicit migration approval, expand/contract schema changes, health/readiness checks and a documented rollback that does not assume destructive migrations are reversible. Application and migration credentials are separate. A future worker shares the monolith codebase and verified at-least-once/idempotent contracts; no queue deployment is required merely by this decision.

## Consequences

- Positive: the local mock runs without purchased services; standard Node/PostgreSQL boundaries support later migration and clearer ownership.
- Accepted trade-offs: managed services add recurring cost and vendor coordination; the team still owns configuration, access and recovery verification.
- Easier: isolated previews, reviewed releases and timed recovery. Harder: demonstrating deletion across backups, key copies and processors rather than relying on vendor feature lists.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| EU region mistaken for complete transfer protection | Medium | High | Contract and access/subprocessor review before real data | Unsupported EU-only marketing claim |
| Restored system resurrects erased data or access | Medium | Critical | Protected tombstones, key inventory and restore drill | Deleted fixture appears after recovery |
| Green local CI mistaken for deployment readiness | High | High | Stage-specific evidence register and real-PG checks | Release has no role/restore/auth evidence |

## Revisit conditions

Reopen supplier/deployment choice on acceptable written quotes, material transfer/contract changes, failed recovery targets or measured workload limits. Reassess operations staffing before public availability commitments. A new region, backup mechanism, key hierarchy or real-data staging use requires fresh privacy/security review.

## References

- [System architecture](../architecture/system-architecture.md); [NFR](../architecture/nfr.md).
- [ADR-0005 database](0005-database-postgresql-and-drizzle.md); [privacy](../compliance/privacy-model.md); [retention](../compliance/data-retention.md).
- [Cost architecture](../business/cost-architecture.md), planning review dated 2026-10-02; vendor prices remain unknown.
- [Historical toolchain spikes](../research/raw/toolchain-spikes.md), source dates retained there; no deployed recovery evidence.
