# Lilleri

Lilleri is an Italy-first personal-finance project. The current repository is a **local prototype with synthetic financial data**: a persistent scoped API, deterministic reconciliation/classification, Review Inbox, versioned rules, manual accounts and CSV mapping, consent controls, privacy preferences, an in-app notification feed, monthly observations and conservative safe-to-spend estimates. Optional local browser identity supports owned profiles. The product ambition is to organise supported financial sources with less manual work; no real bank is connected by this setup.

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

The API defaults to embedded **PGlite**, with persistent synthetic data in ignored `.lilleri/data`. Docker, bank credentials and paid services are not needed. The 22 reviewed, checksum-protected migrations run on startup. The server encrypts selected financial fields under per-profile keys in an independent local vault outside the database directory. Keep that vault available when reopening an existing store; moving or backing up the database alone does not move its keys. Deleting the demo profile persists its deletion state; it does not silently reseed. Use a new `PGLITE_PATH` for a fresh demo.

```bash
PGLITE_PATH=/tmp/lilleri-fresh-demo pnpm dev
```

The local API rejects production configuration and non-loopback binding. Physical-device banking/mobile behaviour is unverified; the browser export does not validate native iOS/Android. Detailed optional PostgreSQL and test commands are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Available local flows

- **Home:** observed monthly totals and their transaction evidence; safe-to-spend uses explicit account selection, a visible horizon and per-currency buffers. Unknown source coverage, balance meaning or private liabilities can make the estimate unavailable.
- **Movimenti:** exact-money manual entries, strict CSV import and an explicit Italian/British CSV mapper with saved revisions, previews and duplicate acknowledgement. XLSX and native share-sheet import remain open.
- **Collegamenti:** synthetic institution coverage, provider-derived authorization dates, pause/resume/renewal and owned consent history. Paused, expired, revoked and unknown grants cannot refresh.
- **Privacy and notifications:** reversible rules-only/quiet/private preferences, draft local purpose disclosures, default-off optional service notices, quiet hours and read state. External AI, identified analytics and native push are unavailable.
- **Data rights:** scoped JSON and eleven-file ZIP export, durable financial/identity erasure, an API deletion receipt, independent local key destruction and a quarantined deletion-aware restore procedure.

Operational foundations include audited runtime configuration, content-free OpenTelemetry diagnostics, forced financial RLS and a separate non-owner PostgreSQL credential option, plus user-granted masked support diagnostics. These controls have local synthetic evidence; their contracts and remaining release work are linked from [STATUS](docs/STATUS.md).

## Optional local identity

For synthetic browser sign-up, sessions, passkeys and TOTP, use the explicitly opt-in [local identity workflow](docs/architecture/local-identity.md). Set `DEMO_MODE=0`, `LOCAL_AUTH_MODE=1`, `EXPO_PUBLIC_LOCAL_AUTH_MODE=1` and matching localhost API/client origins. Supply a stable `LOCAL_AUTH_SECRET` securely in the process environment; no secret is included in the repository. Signup starts with an empty owned profile and connects no source automatically. Production and non-loopback binding remain refused.

## Quality commands

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

`pnpm check` combines Biome lint/format, operational-configuration lint and its regression groups, typecheck and unit suites; the API suite uses PGlite by default. PostgreSQL-specific tests need an explicitly configured disposable database. `pnpm build` includes a Next production build and an **Expo web export**, not native store binaries. Current executed test counts, both database-driver results, browser evidence and open dependency findings are recorded in [STATUS](docs/STATUS.md). The complete future backlog remains distinct from the local slice; [execution plan](docs/product/execution-plan.md) tracks remaining software and external gates.

## Repository map

| Path | Content |
| --- | --- |
| `apps/api` | Scoped Fastify/Zod API, consent/import/privacy/understanding/notification/data-rights services, maintenance and integration tests |
| `apps/mobile` | Expo/React Native local prototype and browser export |
| `apps/web` | Next.js project page with locally bundled artwork/fonts |
| `packages/money` | Exact bigint minor-unit arithmetic and currency formatting |
| `packages/domain` | Financial types, calendar-date utilities and taxonomy |
| `packages/financial-providers` | Validated discovery/authorization port, synthetic Italian fixture provider and bounded CSV parsers/mapper |
| `packages/engines` | Pure deterministic classification, reconciliation, recurring detection, monthly observations and safe-to-spend |
| `packages/database` | Shared PostgreSQL/Drizzle schema, checksum migrations, forced RLS and scoped PGlite/PostgreSQL handles |
| `packages/api-client` | Typed local API client |
| `packages/brand` | Original mark, icons, local OFL fonts and light/dark tokens |
| `docs` | Research, product/business, brand/design, architecture/ADRs, security and compliance |
| `tools` | Research orchestration history and brand-rendering tooling; historical workflow paths are not startup commands |

Trust, data correctness and security precede conversion. **Gratis / Plus** is the proposed launch ladder; pricing and live-source access remain hypotheses/gated. The local vault and restore drill do not establish production KMS or backup acceptance. Production identity/recovery, real-bank access, full encryption-class coverage, household sharing, external AI, billing and store releases require further implementation and external review. Read [SECURITY.md](SECURITY.md) before changing the demo boundary.
