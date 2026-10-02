# Lilleri

Lilleri is an Italy-first personal-finance project. The current repository is a **local prototype with synthetic financial data**: a mock provider, persistent API, deterministic reconciliation/classification, a Review Inbox and correction replay. The product ambition is to organise supported financial sources with less manual work; no real bank is connected by this setup.

See [delivery status and evidence](docs/STATUS.md), [project memory](PROJECT_STATE.md), [the founder’s brief](docs/BRIEF.md) and [documentation map](docs/README.md).

## Run the local demo

Use Node 22.12+ and pnpm 10 (the repository pins pnpm 10.28.0). In the supplied cloud workspace, the optional installed toolchain can be activated with `. /workspace/.lilleri-toolchain/env.sh`.

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

`predev` builds the API, typed client, brand package and their dependencies, then Turbo starts:

| Service | Local address | Scope |
| --- | --- | --- |
| Next.js project page | http://127.0.0.1:3000 | Public-facing prototype copy, original assets and light/dark styles |
| Expo development server | http://localhost:8081 | Mobile shell; press `w` for its browser preview |
| Fastify demo API | http://127.0.0.1:3001 | Explicit `DEMO_MODE=1`, loopback-only synthetic data |

The API defaults to embedded **PGlite**, with persistent synthetic data in ignored `.lilleri/data`. Docker, bank credentials and paid services are not needed. Database migrations run on startup. Deleting the demo profile persists its deletion state; it does not silently reseed. Use a new `PGLITE_PATH` for a fresh demo.

```bash
PGLITE_PATH=/tmp/lilleri-fresh-demo pnpm dev
```

The local API rejects production configuration and non-loopback binding. Physical-device banking/mobile behaviour is unverified; the browser export does not validate native iOS/Android. Detailed optional PostgreSQL and test commands are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Quality commands

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

`pnpm check` combines Biome lint/format, typecheck and unit suites; the API suite uses PGlite by default. `pnpm build` includes a Next production build and an **Expo web export**, not native store binaries. Local checks passed 149 distinct synthetic cases, real-PostgreSQL integration, both web builds, 16 browser-flow groups and 2 targeted rendering groups; open audit findings and full visual/accessibility, native and user-study limits are recorded in [STATUS](docs/STATUS.md).

## Repository map

| Path | Content |
| --- | --- |
| `apps/api` | Fastify/Zod synthetic API, sync/correction/import/export/deletion routes and integration tests |
| `apps/mobile` | Expo/React Native local prototype and browser export |
| `apps/web` | Next.js project page with locally bundled artwork/fonts |
| `packages/money` | Exact bigint minor-unit arithmetic and currency formatting |
| `packages/domain` | Financial types, calendar-date utilities and taxonomy |
| `packages/financial-providers` | Provider port, synthetic Italian fixture provider and bounded CSV parser |
| `packages/engines` | Pure deterministic classification, reconciliation, recurring detection and summaries |
| `packages/database` | Shared PostgreSQL/Drizzle schema, migrations and PGlite/PostgreSQL drivers |
| `packages/api-client` | Typed local API client |
| `packages/brand` | Original mark, icons, local OFL fonts and light/dark tokens |
| `docs` | Research, product/business, brand/design, architecture/ADRs, security and compliance |
| `tools` | Research orchestration history and brand-rendering tooling; historical workflow paths are not startup commands |

Trust, data correctness and security precede conversion. **Gratis / Plus** is the proposed launch ladder; pricing and live-source access remain hypotheses/gated. Authentication, real-bank access, production encryption/backup controls, household sharing, external AI, billing and store releases require further implementation and external review. Read [SECURITY.md](SECURITY.md) before changing the demo boundary.
