# Contributing to Lilleri

Read [PROJECT_STATE.md](PROJECT_STATE.md), [STATUS](docs/STATUS.md), [BRIEF](docs/BRIEF.md) and the [documentation map](docs/README.md). Current development uses synthetic data only; product/security/compliance documents distinguish implementation from future release requirements.

## Toolchain and startup

Use Node 22.12+ and pnpm 10; the package manager is pinned to pnpm 10.28.0. This workspace optionally provides (activate it for Git commits too: hooks invoke pnpm):

```bash
. /workspace/.lilleri-toolchain/env.sh
```

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

In the supplied workspace, reuse the existing store with `pnpm install --frozen-lockfile --store-dir /workspace/.lilleri-cache/pnpm-store`. Do not switch a populated checkout to a different pnpm major version.

`predev` compiles `@lilleri/api`, `@lilleri/api-client`, `@lilleri/brand` and build dependencies, then Turbo starts Next on 127.0.0.1:3000, Expo on 8081 and the explicit demo API on 127.0.0.1:3001. Root startup needs no `.env` file. Environment examples document optional overrides; they are not production configuration. Set API variables in the launching shell, and public client variables before starting/building the relevant app. The server does not claim automatic root `.env` loading.

PGlite persists synthetic data at `.lilleri/data` by default and applies the same 22 reviewed, checksum-protected migration files as PostgreSQL. To test a new demo without destroying existing files:

```bash
PGLITE_PATH=/tmp/lilleri-new-demo pnpm dev
```

The server uses an independent synthetic key vault, partitioned by database identity under `/workspace/.lilleri-data/key-vaults` by default. To choose a durable location explicitly, set `LOCAL_KEY_VAULT_PATH` outside `PGLITE_PATH`, with access restricted to the local process owner. Reopening an encrypted store requires its original vault. Startup upgrades supported legacy plaintext before serving traffic and refuses unresolved key-destruction intents. Treat the database, current independent keys and current recovery journal according to their separate [encryption](docs/architecture/profile-envelope-encryption.md) and [restore](docs/operations/deletion-aware-restore.md) contracts; copying historical keys alongside a database defeats the current-vault destruction proof.

The default API requires `DEMO_MODE=1`; opt-in synthetic browser identity instead requires `LOCAL_AUTH_MODE=1` and `DEMO_MODE=0` (see [local identity](docs/architecture/local-identity.md)). Both reject `NODE_ENV=production` and permit only loopback hosts. Keep this guard. A physical device's loopback is that device; do not open the unauthenticated demo on a public/LAN host to make a native preview work. Simulator/device support needs a separate reviewed development arrangement and actual device checks.

## Optional local PostgreSQL

Docker is optional; PGlite is the default. The Compose service binds PostgreSQL to loopback 5432, stores data in a named volume, and uses synthetic demo-only credentials.

```bash
docker compose up -d postgres
DATABASE_URL=postgresql://lilleri_demo:local_demo_only@127.0.0.1:5432/lilleri_demo pnpm dev
```

No real user/bank data belongs in either local driver. The standalone migration command requires a built database package and an explicit local URL:

```bash
pnpm --filter @lilleri/database build
DATABASE_URL=postgresql://lilleri_demo:local_demo_only@127.0.0.1:5432/lilleri_demo pnpm --filter @lilleri/database migrate
```

Migration checksums reject editing an already-applied migration; add a reviewed migration for schema changes. A fresh database needs authority to provision the reviewed `lilleri_runtime` and `lilleri_trusted` groups, or those groups must be pre-provisioned. Do not embed passwords in migrations.

The trusted `DATABASE_URL` serves migrations, identity and maintenance. Financial HTTP work uses `withProfile` with transaction-local profile/household context and a non-owner SQL role. Supplying **`DATABASE_RUNTIME_URL`** selects an independently provisioned login belonging only to the reviewed runtime group. Startup rejects owner/admin/bypass credentials and verifies that both connections reach the same actual database. Without it, the local fallback uses `SET LOCAL ROLE lilleri_runtime` on a trusted session; that tests scoped statements but retains the session's trusted authority. See [PostgreSQL isolation](docs/architecture/postgresql-isolation.md) for grants, separate-credential proofs and the remaining deployment boundary. Local role evidence does not prove production least privilege, TLS or backup security.

## Checks and their scope

| Command, from repo root | Scope |
| --- | --- |
| `pnpm lint` | Biome lint |
| `pnpm format:check` | Biome format verification without rewriting |
| `pnpm format` | Apply formatting; inspect resulting changes |
| `pnpm typecheck` | Workspace TypeScript checks |
| `pnpm test` | Money/domain/provider/engine tests and API suite using PGlite by default |
| `pnpm lint:configuration` | AST-based guard against inline defaults in maintained operational consumers |
| `pnpm test:configuration-lint` | Node regression groups for the configuration guard |
| `pnpm check` | Biome check, configuration guard/regressions, workspace typecheck and tests |
| `pnpm check:fix` | Apply Biome fixes; typecheck/tests still need their own run |
| `pnpm test:integration` | API integration suite, PGlite unless `PG_TEST_DATABASE_URL` is set |
| `pnpm build` | Workspace builds, Next production build and Expo **web** export |

The existing cloud verification used a separately provisioned disposable PostgreSQL 16.15 test database on 127.0.0.1:55432. If that test database is available, run:

```bash
PG_TEST_DATABASE_URL=postgres://lilleri:lilleri@127.0.0.1:55432/lilleri_completion_final_20261003 pnpm test:integration
```

This command assumes that exact local test service/database already exists. It does not create it, and the demo Compose service uses a different port/user/database. In another workspace supply your own disposable test database URL using **`PG_TEST_DATABASE_URL`**, not `TEST_DATABASE_URL`. The real-login isolation cases need a trusted local fixture capable of provisioning their temporary runtime login. A separate optional two-cluster Unix-socket regression also needs `PG_TEST_OTHER_CLUSTER_URL`; an ordinary single-cluster run skips it. Some reopen/restore scenarios intentionally remain filesystem-backed PGlite checks even in the PostgreSQL-configured suite. Integration tests create synthetic profiles and clean them up; never point them at a production or valuable database. [STATUS](docs/STATUS.md) records executed totals, skips and CI limitations.

For independent browser exports after shared builds:

```bash
pnpm --filter @lilleri/web build
pnpm --filter @lilleri/web start
```

In another terminal:

```bash
pnpm --filter @lilleri/mobile build
python3 -m http.server 8081 --bind 127.0.0.1 --directory apps/mobile/dist
```

Keep the demo API running on 3001 for the exported Expo browser prototype. Stop the Expo dev server before using 8081 for the static export. Native device execution, VoiceOver/TalkBack, store builds and real-provider behaviour need separate evidence.

## Local maintenance and browser evidence

Revocation retries, bounded payload retention and the content-free notification pump run on the API's own database handle. Never open a persistent PGlite store from a second process while the API owns it. Standalone workers and the trusted runtime-configuration operator require a separate supported synthetic PostgreSQL connection. See [outbox operations](docs/operations/revocation-outbox.md), [retention](docs/operations/payload-retention.md) and [runtime configuration](docs/operations/runtime-configuration.md). Bootstrap environment values do not override a persisted active configuration revision; later changes and rollback create immutable audited revisions.

`GET /v1/export` and `GET /v1/export/archive` are read-only ownership snapshots. `POST /v1/export/archive` with `{}` is the explicit ZIP export action and can add its essential in-app completion notice. Neither creates a public download link. Optional service notices require the current local N-SERVICE choice; export/deletion/security rights remain available after withdrawal. Read [export](docs/architecture/data-export.md), [privacy](docs/operations/privacy-controls.md) and [notification](docs/reviews/local-notifications.md) contracts before changing those boundaries.

Loopback-only `/internal/metrics` and `/internal/observability` expose aggregate local diagnostics. Their fixed labels cannot contain route IDs, bodies, raw errors or financial content. The collector has no network exporter; this surface does not establish a production operator portal or legally anonymous analytics. See [local observability](docs/reviews/local-observability.md).

Reproducible browser scripts in `tools` require Playwright plus a Chromium executable in the tooling environment. They are development evidence, not app runtime dependencies, and use only disposable synthetic stores. Run financial, connection, privacy, notification, understanding and mapped-import writers **sequentially** when they share an archive. Read each script's prerequisites before running it; a baseline count does not apply after manual imports modify the fixture. Rebuild/restart the API and clear Expo's bundle cache when checking changed compiled/client code. Native/device tests remain separate.

## Implementation conventions

- Use strict TypeScript, ESM and `import type`; packages use `@lilleri/*`. Domain and pure engines must not import vendor payloads or call external services.
- Money is integer minor units as `bigint` plus currency. Use `@lilleri/money`; serialise bigint as decimal strings across JSON boundaries. Never perform ledger arithmetic with floating point.
- Financial booking/value dates are valid `YYYY-MM-DD` calendar dates persisted as SQL `DATE`; instants are validated timestamp values. Derive local calendar periods with the profile timezone (`Europe/Rome` for this prototype), never by treating every date as midnight UTC.
- Keep source identity, observations, canonical revisions, user corrections and inference separate. Same amount/merchant/date is insufficient duplicate evidence. Explicit correction/rule wins over automatic classification; ambiguous structural matches go to review.
- Preserve profile scope in queries, mutations and references. Demo identity is server-selected; opt-in local identity verifies sessions and derives membership on the server. Use the scoped transaction handle for financial services, await every query before returning, and capture necessary trusted identity/configuration reads before entering a PGlite financial transaction. Both modes are synthetic-only. Production authentication/recovery/authorization remains a separate release requirement.
- Fixtures are synthetic. No credentials, IBANs, real receipts/exports or personal financial screenshots in code/tests/docs; scope confidential evidence through the appropriate reviewed process.
- Source/capability, confidence, freshness and estimation claims must follow actual implementation/evidence. Correctness, correction/learning, privacy/security, retained-data access, export and deletion cannot become paid entitlements.
- Add meaningful invariant/adversarial tests for changed financial or tenant behaviour. Documentation and cosmetic edits need appropriate verification, not tests that merely mirror wording.

Use Conventional Commits. Hooks are configured in the root manifest; hook execution depends on local Git setup. Architectural changes need an ADR using [the template](docs/adr/0000-adr-template.md). Keep changes reviewable, update relevant documentation and project memory when authorized, and report actual checks/failures without claiming unrun production or native tests.
