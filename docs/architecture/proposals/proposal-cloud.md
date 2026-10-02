# Proposal C — managed EU operations from the first real-data release

**Date:** 2026-10-02 · **Status:** DECISION INPUT.

## Thesis and evidence

ASSUMPTION: an operational mistake, compromised credential or stolen backup could outweigh months of infrastructure savings once real financial data arrives. FACT: the brief requires incident response, isolation, backup/restore, secret management and evidence of controls. [Vendor research](../../research/raw/build-vs-buy-and-vendors.md) contains mixed verified facts, assumptions and blocked-source claims; it does not establish a contracted deployment, residency guarantee or actual price. EU cloud region alone does not settle international transfer or processor obligations.

DECISION PROPOSAL: deploy the Fastify modular monolith and its worker as managed containers in one EU region; use managed PostgreSQL, managed secrets/KMS, encrypted object storage and automated IaC. AWS Milan/Frankfurt is a candidate, with EU-owned managed providers as alternatives. No region/vendor is purchased or deployed by this document. Managed queue is an option, not a prerequisite; pg-boss reduces services if database isolation/capacity suffices.

## Application and data

The monorepo retains `apps/mobile`, `web`, `api` and `@lilleri/domain`, `money`, `engines`, `database`, `financial-providers`, `api-client`, `brand` and `i18n`. Modules retain provider-independent ports. `FinancialDataProvider` implements capabilities, connection lifecycle, accounts, balances, paged transactions and disconnect. Mock adapters run locally before a sandbox and real-bank pilot. No provider SDK crosses the domain boundary.

Canonical amounts use checked PostgreSQL BIGINT and TypeScript bigint, integer strings on JSON. Currency and original/account amounts are explicit; FX conversions require provenance. Financial date-only fields do not become UTC midnight timestamps. Profile tenant IDs appear on every financial record, composite FK and authorisation command. Observation identity separates retries from canonical matching. Strong references or human confirmation justify dedup/transfer/pending links; repeated purchases must survive fuzzy matching. API `/v1` has OpenAPI schema validation, RFC 9457 errors, opaque cursors, conditional writes and scoped idempotency receipts.

## Reliability and security shape

Sync runs through provider → raw validation → normalisation → observation persistence → merchant/reconciliation → classification → recurring → insights. A transaction commits source/cursor/checkpoint plus outbox entry; a worker publishes and consumes idempotently with bounded retries. Partition operational queues from financial tables logically, measure contention, and introduce a managed queue only if isolation or scheduling demands it. Quarantine poison records, keep failure metadata without raw descriptions and expose last successful update. Provider rate allowances and consent expiries come from metadata/contracts, not a universal daily cron. Revocation fences pending jobs.

Use least-privilege database/runtime roles, network-restricted DB, TLS, a secret manager, separate environments, KMS-wrapped DEKs for designated sensitive fields and auditable break-glass support access. Backups need PITR, separate permissions, tested restores and deletion tombstones; restoring an old DEK must not resurrect erased records. CI runs secret/dependency scans and emits SBOM; IaC and deployed controls require review. Passkeys, MFA/recovery, refresh rotation and revocation are required beta tests for better-auth, not assumed from package support. WAF/rate limits complement per-object authorisation.

Mobile Expo uses exact typed DTOs, a visible stale state and future secure session storage; Next is a public landing, with a future admin isolated and no blanket support impersonation. Offline ledger storage/writes are deferred. Italian-first translations and tokens remain shared across platforms. All AI model calls are off by default. Future ML/embeddings/LLM need precision evaluation, permission and vendor DPA/residency/retention confirmation; tool-based deterministic arithmetic remains mandatory.

## Environments, operation and evaluation

PGlite powers synthetic dev/test; PostgreSQL integration checks actual migrations, roles, RLS, concurrency and queues. Staging uses synthetic fixtures and independent secrets. Production follows reviewed IaC, container image digest promotion, database expand/contract migrations, a health/readiness check, canary exposure, rollback and restore drill. OpenTelemetry traces plus Pino scrubbed logs, error monitoring, queue/provider metrics, SLO alerts and budget alerts support operations. Product analytics collect semantic events without amounts, merchants or descriptions. Feature flags have an owner and expiry; kill switches halt real-provider/AI ingestion.

ASSUMPTION planning envelope: €300–1,000/month hosting/operations tooling for a small managed beta, excluding AIS, support, stores, tax and labour; this is a reserve scenario, not a cloud quote. HYPOTHESIS scores: speed 2, type safety 5, security 5, ecosystem 4, testing 4, cost 2, observability 5, mobile DX 5, scalability 5, hiring 3, EU deployment 4, low lock-in 3. Security is potential capability; without configured controls it earns no release certification.

Risks: IaC, IAM/KMS and multiple managed services can overwhelm a three-person team, and queue/KMS integrations introduce provider lock-in. Counterproposal: build the local modular slice now, adopt managed Postgres/backups/secrets before real data, and defer deployment extras until needs are measured. I would not build Kubernetes, multi-region active-active, a service mesh, automatic support access, a large SIEM or blue/green infrastructure for a synthetic prototype.
