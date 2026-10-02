# Repository structure and dependency rules

**Date:** 2026-10-02 · **Status:** Accepted layering; package/file inventory is verified against the repository, not this future tree.

## Working and future surfaces

DECISION: implement one useful financial vertical slice; do not create every planned module as an empty package. Workspace scope is `@lilleri/*`, pnpm manages install, Turborepo schedules scripts, TypeScript is strict and Biome handles source lint/format. Vitest covers pure/SQL/API contracts. Current manifests and lockfile are authoritative; [historical spikes](../research/raw/toolchain-spikes.md) are compatibility evidence for their versions only.

```text
apps/
  api/                    Fastify transport, synthetic identity, scoped application service
  mobile/                 Expo Italian product shell and core loop
  web/                    Next landing; no financial payloads
packages/
  money/                  Existing exact bigint money/currency/format boundary
  domain/                 Provider-independent immutable types and invariants
  engines/                Pure reconciliation/classification/recurring/summary logic
  financial-providers/    Port, normalisation and synthetic Italian fixture
  database/               Drizzle schema, SQL migrations, scoped repositories, PGlite driver
  brand/                  Logo/assets and semantic tokens
  api-client/             Safe typed DTOs/HTTP client when needed
  i18n/                   Stable translation keys/catalogue when needed
  ui/                     Platform components when reuse actually pays off
  ai/                     Future permitted-purpose model port; no external calls now
  observability/          Future shared allowlist/tracing where multiple callers justify it
  config/                 Shared source-tooling configuration when needed
infra/                    Future reviewed EU deployment IaC; local Compose if useful
scripts/                  Build/check utilities; no secrets
.github/                  CI and repository governance
 docs/                    Research, product, design, business, architecture, ADR, security
```

Tree distinguishes responsibilities; not all entries are currently present or necessary. Individual API modules may stay directories instead of packages until a real consumer or boundary needs extraction. `apps/web` is marketing, not a second backend/BFF by default. Paid billing, receipt/email/OCR, learned models and support/admin access are deferred.

## Dependency direction

| Layer | Allowed imports | Prohibited imports |
| --- | --- | --- |
| money | Standard library, versioned currency table | Provider, API, database, UI |
| domain | money, safe pure validators | Fastify/Drizzle/vendor SDK, environment secrets |
| engines | domain/money and pure utilities | Network, database, authentication, UI |
| financial-providers | domain/money, adapter SDKs behind port | UI or application ownership decisions |
| database | domain/money, Drizzle/driver | Product UI; inference deciding stored amounts |
| API/application | Repositories, provider port, engines, auth/transport | Arbitrary cross-tenant queries; raw SDK payload to client |
| mobile/client | DTO/client, brand, i18n, safe domain types | Server runtime, pg driver, provider secret, ORM |
| web landing | Brand/translation/assets | Ledger database, financial logs, bank credentials |

Use ESM explicit exports and build declarations. Separate type-only imports from executable server imports; 'shared package' does not justify bundling server secrets into Metro/Next. Tests can exercise integration through public ports. Root orchestration must not cause a mobile import to pull Node crypto or a PostgreSQL driver.

## Commands and checks

Repository root scripts define `pnpm install`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm build`, `pnpm dev`. A script's existence is not evidence it ran or meaningfully exercised all packages; final STATUS records actual results. Use frozen lockfile in CI. PGlite runs synthetic deterministic local SQL tests, while real-PG CI verifies migrations/roles/concurrency/queue paths that actually exist. Expo exports/web smoke evidence cannot replace iOS/Android device tests. Docker availability is checked on this machine; old state files do not establish it.

Version policy: pin compatible toolchain/native versions, use Expo's validated RN pairing, keep lockfile reviewed; no automatic switch to latest major/canary because a research note lists it. Changesets is optional until packages need versioned publication; private workspace does not require release ceremony now. Git hooks supplement CI, never substitute for it. Commit conventions and branch instructions remain repository governance; this document does not authorise a different branch or publication.

## Migrations, fixtures and reviews

Database migrations are SQL files under `packages/database` with an explicit version/checksum policy. Never silently mutate a migration already applied in a shared environment. Additive changes precede destructive cleanup. Synthetic fixtures are labelled synthetic even when familiar merchants are used; names never imply supported live integrations. No personal bank data in fixtures, screenshots or snapshots. Validate exact amounts, tenant FKs and sticky corrections as domain contracts rather than mirroring implementation internals.

PR/review gates cover financial invariants, provider-independent boundaries, source/revision provenance, tenant access, PII-free logs and current versus designed controls. Security scanning/SBOM and deployment review need concrete artifacts before production. Source research links and FACT/ASSUMPTION/DECISION labels belong in docs; implementation explanations do not clutter product UX.

Extraction rule: move a module into an independent deployment only after measured workload/ownership demands it, preserving the port and idempotent contracts. First scale the single database/process intelligently; package count or a speculative million-user goal is not a reason for microservices. See [ADR-0004](../adr/0004-architecture-style-modular-monolith.md), [system](system-architecture.md), [API](api-contract.md).
