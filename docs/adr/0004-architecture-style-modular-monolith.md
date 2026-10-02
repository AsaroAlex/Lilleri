# ADR-0004: Architecture style: modular monolith

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; implementation team
- **Decision gate:** D for the scoped mock-first architecture; not a real-data release approval

## Context

FACT: [the brief](../BRIEF.md) asks for a modular monolith and allows later extraction. Financial consistency requires scoped ingestion, user-correction precedence and reversible matches, not many services. ASSUMPTION: two to four engineers cannot economically operate separate deployment/database/queue ownership for every entity. Historical workflow prompts enumerate many modules; that list is a domain catalogue, not a requirement for empty services. The local mock does not need a durable distributed event system.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| Bounded modular monolith | One app/database, explicit pure ports | Atomic consistency and simpler operations | Boundary discipline required | System proposals A/B and brief |
| Microservices from start | Per-domain services/databases | Independent deployment and scaling | Distributed auth/consistency and high operations cost | No measured need or independent teams |
| Undifferentiated application | One process with ad-hoc shared data access | Fastest first CRUD | Hard replay/ownership, cross-tenant query risk | Critique of proposal A |

Proposal: explicit modules with a transactional outbox and workers. Critique: implementing every event/entity immediately would delay the walking skeleton. Counterproposal: build only actual behaviours with pure engine/provider/repository seams, add outbox when durable async work appears. Decision: a modular monolith whose complexity follows demonstrated needs.

## Decision

DECISION: Fastify application owns transport and scoped orchestration; pure domain/money/engines own financial semantics; provider adapters own external mapping; repositories own persistence. Initial behaviours are connections, account snapshots, transactions, analysis and review/corrections. Additional billing/import/household modules are added when implemented. Shared code does not permit bypassing another module's tenant or revision invariants.

An API and later worker share one repository/codebase. Durable source writes/checkpoints and future outbox are transactional; consumers are idempotent. Direct calls to pure engines are sufficient for bounded synthetic work. Domain events are versioned data with a purpose and owner, not a generic broker added for appearances. Do not implement event sourcing for the whole ledger: immutable observations plus canonical revisions and audit decisions preserve provenance with less operational burden. Extraction requires independent measured throughput, ownership or release constraints and a maintained port.

## Consequences

Positive: a small team can reason about source/correction transactions and test the whole loop locally. Future background work can share the same exact rules. Negative: one deployment and database can become contention/failure boundaries; module isolation is enforced by exports, review and tests rather than network. Future extraction will still require a data/consistency migration; seams make that work easier but do not make it free. Avoid circular imports and accidental mobile imports of server modules.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Shared code bypasses module/tenant boundary | Medium | High | Scoped ports, composite constraints and attack tests | API fetches arbitrary IDs without profile |
| Premature events/services delay value | Medium | Medium | Require behaviour/consumer for each package/event | Many empty modules and no working core loop |

## Revisit conditions

Reopen when profiling proves contention cannot be solved inside the monolith, an independent team owns a module, or a needed deployment constraint conflicts with the shared release. Do not extract based only on projected user count. Add durable async/outbox before real unattended jobs, with fault-injection evidence.

## References

- [Three proposals and critique](../architecture/system-architecture.md).
- [Repository dependencies](../architecture/repository-structure.md).
- [Ingestion pipeline](../architecture/data-pipeline.md); [domain model](../architecture/domain-model.md).
