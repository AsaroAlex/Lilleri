# Proposal A — one application, one database

**Date:** 2026-10-02 · **Status:** DECISION INPUT, not a deployment claim.

## Scope and evidence

FACT: the brief prioritises trust and data correctness above feature count. ASSUMPTION: two to four engineers operate the first beta. FACT: the historical spikes exercised Fastify, Drizzle/PGlite, pg-boss on real PostgreSQL, and an Expo/Next build; they did not establish production security or passkey usability. Sources: [brief](../../BRIEF.md), [spikes](../../research/raw/toolchain-spikes.md), [stack research](../../research/raw/tech-stack-options.md). Current workspace and lockfile outrank obsolete `/home/user` commands in those notes.

DECISION PROPOSAL: Fastify modular application, PostgreSQL/Drizzle, Expo mobile and Next landing in a pnpm monorepo. Start with PGlite and a synthetic Italian provider for an entirely local walking skeleton. Add real PostgreSQL and pg-boss when a real provider or concurrent workers require them. Redis, Kubernetes, external AI and purchase processing are absent at this stage.

## Shape and contracts

`apps/api` owns transport and orchestration; `packages/domain`, `money`, `engines` have pure logic; `database` owns schema/migrations; `financial-providers` owns adapters. Mobile imports only safe domain/DTO definitions, translations and brand tokens. It never imports database credentials or backend code. Start modules with actual behaviour: profiles, connections, accounts, transactions, reconciliation/classification and review. Budgeting, billing and notifications become modules only when implemented.

The provider port is `capabilities`, `createConnection`, `refreshConnection`, `listAccounts`, `getBalances`, `getTransactions`, `disconnect`. Capabilities vary by institution/account and include history, pending support, stable identifiers, expiry and rate allowance; unsupported calls return typed errors. Canonical amounts are bigint minor units; API amounts are signed decimal integer strings. Date-only bank fields remain DATE; UTC timestamps track retrieval and change time. Accounts and every mutation are scoped to an authorised profile.

REST `/v1` has explicit Zod input/output schemas, generated OpenAPI, RFC 9457 errors, opaque cursors and idempotency keys for asynchronous commands. Source observation identity includes profile, connection, source account, provider identifier and status. Stable canonical transactions reference observations; matching amounts/date alone never destroys repeated purchases. User corrections have revisions and always outrank inference.

## Sync and recovery

Provider fetch → validate → normalise → persist observation/cursor in one transaction → merchant rules → reconciliation links → classification → recurring suggestions → derived summary. Deterministic replay never overwrites a user choice. Initially sync is bounded and synchronous for the mock; status is honest. A later pg-boss worker has at-least-once delivery, retryable versus permanent errors, capped jittered backoff, per-institution rate budgets, leased jobs and quarantine. PostgreSQL writes and an outbox commit atomically before downstream publication. No assertion that a queue makes side effects exactly once.

PGlite verifies SQL and exact financial invariants cheaply; real PostgreSQL CI verifies migrations, concurrency, privileges and queue behaviour. Reviewed versioned migrations are forward-only in shared environments, with an expand/contract path and restore fallback. Composite tenant foreign keys and server-side membership checks precede optional RLS as defence in depth. Sensitive real-bank columns need a separately tested envelope-encryption plan and KMS before beta; those are designed controls, not features of the local demo.

## Identity, client and operations

Current demo identity is a server-selected synthetic profile on loopback, explicitly not authentication. Before a real-user beta, evaluate better-auth with database sessions, passkeys, step-up recovery, session revocation and token rotation. A construction spike is insufficient. Mobile uses Expo-compatible versions, read-through API state, visible stale timestamps and no plaintext persistent ledger cache initially. Tokens later go to SecureStore. Next renders a landing; no financial data in marketing logs and no admin console now.

Pino logs allowlisted metadata without descriptions, balances or IBANs; request IDs connect logs and later OpenTelemetry spans. Metrics measure completed syncs, freshness, review volume and inference correction rate. Semantic product events omit amounts and merchant strings. Local/test are synthetic; staging/production require EU region, contracted processors, secret management, encrypted backups, PITR/restore drills and a rollout plan. Feature flags use simple server configuration; Italian copy has stable translation keys and locale-aware exact money formatting. CI runs lint/format/typecheck/tests/build, secret scan and dependency review. Local mocks have zero provider/AI fees. ASSUMPTION planning envelope: €50–200/month hosting/tooling for a small managed beta excluding AIS, support, stores, taxes and labour; this is not a quote. AIS prices remain UNKNOWN.

## Evaluation and omissions

Scores (1–5; HYPOTHESIS, see final matrix): speed 5, type safety 5, security 3, ecosystem 4, testing 4, cost 5, observability 3, mobile DX 5, scalability 3, hiring 4, EU deployment 4, low lock-in 5. Security/observability scores reflect operational work still needed.

Risk: simplicity can hide weak module boundaries or long synchronous requests. Countermeasure: explicit pure ports, bounded sync, revisioned provenance and a worker seam. I would not build Redis, a universal event bus, multi-region deployment, ML pipelines, an admin impersonation console or microservices now. This option wins implementation speed but needs the modular proposal's replay and tenant discipline.
