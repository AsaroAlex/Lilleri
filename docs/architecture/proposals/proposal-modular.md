# Proposal B — modular monolith with explicit consistency boundaries

**Date:** 2026-10-02 · **Status:** DECISION INPUT.

## Thesis and evidence

FACT: provider transaction identifiers and pending/booked semantics vary; the [reconciliation research](../../research/raw/reconciliation-and-data-model-patterns.md) records unstable identifiers and absent pending data. FACT: [provider coverage](../../research/provider-capability-matrix.md) remains institution-dependent; marketing coverage is not tested field coverage. ASSUMPTION: a small team will need to repair ingestion without silently rewriting user corrections.

DECISION PROPOSAL: keep one deployable codebase and one PostgreSQL database, but enforce package/module seams and distinguish immutable observations, canonical transaction revisions and derived links. Fastify/Zod, Drizzle and Expo/Next stay shared with proposal A. A worker shares modules with the API, and a transactional outbox publishes durable work. Redis is optional only after measured cache or distributed-rate-limit pressure.

## Module ownership

Identity owns principals and sessions; profiles owns membership. Connections owns provider consent/capabilities/cursors. Accounts owns account identity/balances. Transactions owns observations and canonical revisions. Reconciliation owns relationship decisions; classification owns category assignments and structured feedback. Rules owns explicit predicates and learned preferences. Recurring/insights consume accepted facts. Future billing/notifications/imports have ports and no empty service scaffolding. `@lilleri/domain`, `money`, `engines`, `financial-providers`, `database`, `api-client`, `brand`, `i18n` reflect these boundaries. No domain code imports Drizzle, Fastify or a bank SDK.

A profile is the financial tenant. Household membership cannot implicitly grant access to personal profiles. Shared accounts attach to one authorised financial profile; aggregation must deduplicate the same underlying account before household totals. Composite profile foreign keys prevent cross-profile references. All reads/commands include server-derived profile scope. Production PostgreSQL RLS is a potential second boundary with a non-owner application role; it must be tested with pooling, workers and migrations before being claimed.

## Data and API

PostgreSQL BIGINT stores minor-unit amounts within a checked range; TypeScript bigint and integer strings preserve exactness. Currency exponent is a versioned code table, never assumed two decimals. Original amount, account amount and any FX conversion have separate provenance. Provider booked/value dates are date-only; authorisation/retrieval times are timestamp-with-time-zone. No cross-currency sum without a dated explicit rate and rounding rule.

`FinancialDataProvider` maps capabilities and connection/account/balance/transaction operations to canonical observations. The synthetic provider implements failure, retry and duplicate fixtures before any contracted adapter. REST/OpenAPI `/v1` uses RFC 9457, cursor pagination, conditional revision updates and scoped idempotency receipts. Auth eventually uses better-auth only after actual sign-in/passkey/recovery/revocation tests. Mock identity is loopback only.

## Pipeline and resilience

Raw ingest → structural validation → exact amount/date normalisation → namespaced observation deduplication → merchant normalisation → evidence-based reconciliation → classification precedence → recurring suggestions → deterministic insights → optional notifications. Store the page, new cursor and job checkpoint atomically. Derived processing is versioned and replayable. A durable outbox closes the DB-commit/job-publication gap. pg-boss is at-least-once, workers are idempotent, delivery attempts have deadlines and capped jitter; poison records quarantine without advancing past unpersisted pages. Revocation is rechecked before fetch and before commit.

Default pending, duplicate, refund and transfer candidates stay suggestions unless strong identifiers and financial/account invariants justify an accepted link. Matching amount/date/merchant is not sufficient evidence. Accepted links are reversible events; canonical source amounts are preserved. Rules and manual corrections survive replay and model version changes. Statistical/embedding/LLM tiers remain disabled until a measured unresolved error justifies them, evaluation establishes calibration and legal/vendor controls pass. External AI sees minimal pseudonymised fields only with a documented permitted purpose; no raw ledger uploads or arithmetic by LLM.

## Deployment and costs

Use PGlite for deterministic local tests and demos, real PostgreSQL for multi-client/concurrency, RLS and pg-boss verification. Environments are synthetic dev/test, separate staging, controlled real-data beta, then production. Reviewed migrations, EU managed database, secret manager, envelope encryption for designated columns, PITR and restored-backup erasure checks are real-data prerequisites, not current demo claims. Expo uses typed API state, stale indicators and SecureStore only for future session secrets; offline ledger writes are deferred. Next is a landing with future authenticated web surface separated from marketing. Tokens and translations are shared, platform components may differ.

Pino plus an allowlist avoids PII in logs; OpenTelemetry and error monitoring require payload scrubbing tests. Define sync and stage latency, freshness, review/correction and provider cost metrics before dashboards. Tests cover unit invariants, adapter contracts, SQL/migrations, API tenant attacks, failed-page replay, concurrent corrections and eventual mobile E2E. Feature flags are database/config values with owners/expiry, never an authorisation boundary. CI blocks source quality failures and evaluates security advisories. ASSUMPTION planning envelope: €100–350/month hosting/monitoring for a small managed beta, excluding AIS, support, stores/tax/labour; vendor prices UNKNOWN until quoted.

## Evaluation

HYPOTHESIS scores: speed 4, type safety 5, security 4, ecosystem 4, testing 5, cost 4, observability 4, mobile DX 5, scalability 4, hiring 4, EU deployment 4, low lock-in 5. The modularity score assumes the team actually tests boundaries.

Risk: building every entity, event and outbox immediately would delay the walking skeleton. Counterproposal: persist only the working slice; add durable workers/outbox at the first asynchronous real-provider dependency. I would not introduce a broker, per-module databases, CQRS across all modules, event sourcing of the entire ledger, Redis, custom cryptography or learned models now.
