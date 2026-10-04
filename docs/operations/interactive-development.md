# Interactive development and repository analysis

**Checked:** 2026-10-04, Europe/Rome. **Target:** an MVP with real bank access and a public release. The current runnable application is a persistent synthetic development instance. The founder confirmed that no provider account/contract, hosting or domain is available yet. The [execution plan](../product/execution-plan.md) remains active; this setup does not mark its unfinished P0 stories complete.

## Start and test the current application

Requirements: Node 22.12+ and **pnpm 10.28.0** (the package-manager pin). In the supplied workspace activate `. /workspace/.lilleri-toolchain/env.sh`; its Node 22.22.0/pnpm 10.28.0 avoids the host's pnpm 11, which ignores the current manifest's overrides. Other machines can use their normal Node/pnpm installation.

```bash
pnpm install --frozen-lockfile
pnpm dev:cloud
```

In this workspace, the existing dependency store is `/workspace/.lilleri-cache/pnpm-store`. For a noninteractive bootstrap use `CI=1 pnpm install --frozen-lockfile --store-dir /workspace/.lilleri-cache/pnpm-store`. The existing store also supports `--offline`.

Open **port 8080** using the cloud workspace's private preview/port-forwarding facility, if the host provides one. The current Codex cloud task exposes no callable port-forwarding capability or verified browser-accessible cloud URL. `localhost` on a Mac refers to that Mac, not this cloud instance. For local development open `http://localhost:8080`. This is the Expo financial application, not the Next marketing page. Both browser requests and downloaded exports use `/api` on the preview origin. Do not expose the internal API or Metro ports separately. Starting the process alone does not create a public deployment.

### View and iterate in Codex on a Mac

The user selected **this Codex chat with an online preview**, without local installation or a move to Replit. The existing financial app must remain tied to this working tree and its persistent synthetic archive. A source snapshot or a separate local project does not implement that workflow.

The current cloud instance is healthy on internal port 8080, but exposes no verified browser-accessible URL or callable ingress configuration. Its enforced HTTP network policy permits package-manager destinations only; VPN and TCP grants are absent. Installing a tunnel client alone cannot grant connectivity. A public ingress to this instance, or an authorized Node-compatible hosting environment with source updates and persistent development storage, is an infrastructure prerequisite. Keep the runtime and data intact; confirm a real HTTPS URL, API writes, refresh persistence and hot reload before declaring the online preview ready.

The user has now started a Railway service; the [Railway preview setup](railway-preview.md) provides the concrete Docker, persistent-volume, source-branch and HTTPS configuration. Changes arrive after a checked commit is deployed. A deployed URL still needs verification. No provider account or custom domain is available yet. The available Replit connector does not synchronize this working tree, and Sites Workers hosting is not a drop-in runtime for the Node/PGlite supervisor. Do not substitute a recreated frontend for the actual app. Ordinary local development remains supported by `DEV_HOST=127.0.0.1 pnpm dev:cloud`; it is not the user's selected delivery path.

The launcher compiles the existing API/client/brand dependencies, starts the required processes, and stops its children together on Ctrl+C or SIGTERM. Keep its terminal/session running. In this managed Linux execution host, a detached launch needs a separate session: `setsid nohup pnpm dev:cloud > /path/to/dev.log 2>&1 < /dev/null &`. Plain `nohup` does not survive this host's command-group cleanup. A managed terminal is the portable alternative; the cloud host still controls environment lifetime. This is a development supervisor, not a production process manager.

| Component | Interactive address | Standard `pnpm dev` address | Purpose |
| --- | --- | --- | --- |
| Preview gateway | `0.0.0.0:8080` | Absent | Browser app, API proxy and Metro WebSocket forwarding |
| Fastify API | `127.0.0.1:3191` | `127.0.0.1:3001` | Synthetic financial HTTP API and same-process maintenance |
| Expo/Metro | `localhost:8181` | `localhost:8081` | React Native Web development and interface reload |
| Next.js | `127.0.0.1:3000` | `127.0.0.1:3000` | Project page and `/piani`, optional separate port forwarding |
| PostgreSQL | Not needed | Optional `127.0.0.1:5432` | Compose alternative to embedded PGlite |

`dev:zero` also uses 3191/8181. Run only one of these workflows at a time. Occupied ports cause startup to fail without stopping the existing service. `DEV_HOST=127.0.0.1 pnpm dev:cloud` restricts the gateway to the local computer.

## Stack and structure

The repository contains eleven workspace projects managed by pnpm/Turborepo. Application/core code is TypeScript with ESM; development/evaluation helpers use JavaScript, and a separate optional brand renderer includes Python. Shared packages export compiled `dist` files.

| Path | Runtime/framework and responsibilities |
| --- | --- |
| `apps/mobile` | Expo 57.0.26, React 19.2.3, React Native 0.86.3, React Native Web 0.21.2; the actual financial browser UI. Native execution is separate, unverified work. |
| `apps/web` | Next.js 16.3.8/React; public project and plan pages, locally bundled fonts/artwork. |
| `apps/api` | Fastify 5.12.5, Zod 4.6.5, OpenAPI, Drizzle; scoped financial services, imports, rules, consent/sync, privacy, notifications, ownership and deletion. |
| `packages/database` | PGlite 0.5.8 or PostgreSQL via `pg`; shared schema, 31 ordered checksum-protected SQL migrations and financial RLS. |
| `packages/money`, `domain`, `engines` | Bigint minor units and currency, calendar/profile types, taxonomy and pure deterministic financial analysis/reconciliation. |
| `packages/financial-providers` | Provider contracts, synthetic Italian adapter, CSV and bounded XLSX mapping (`read-excel-file` 9.3.10). No live-bank adapter is selected at startup. |
| `packages/api-client`, `brand` | Typed HTTP client, original assets, local fonts and theme tokens. |
| `tools`, `docs`, `.github` | Browser/evaluation/bootstrap checks, product/security/operations evidence and GitHub CI. Optional brand rendering is outside the product workspace. |

Authentication uses Better Auth 1.7.7 with passkeys and TOTP/recovery. It is explicitly opt-in for **local synthetic** sessions. The default demo is a shared profile without user authentication; the cloud launcher keeps local identity disabled and drops inherited database/provider/auth configuration. Public multi-user identity and recovery are unfinished release work. A private cloud preview access control protects the development entry point; it does not supply application authentication.

The API owns bounded revocation, raw-retention, notification and durable-sync pumps on the same database handle. No Redis, queue service, mail provider, bank subscription, AI service or Docker container is needed for this preview. The optional standalone revocation/retention workers require the documented synthetic PostgreSQL arrangement; do not open the API's file-backed PGlite from another process.

## Persistence and environment

Interactive data is saved in ignored `.lilleri/interactive/data`. Vault and deletion/source-erasure recovery records are independent and outside that archive, under the launcher's stable home-directory namespace. The launcher preserves `.lilleri/data`, `.lilleri/zero-budget/data` and existing external validation archives. Reopening encrypted data requires the corresponding original keys and current journals; copying only a database is insufficient. Erasing a profile does not silently reseed it. Do not delete archives to solve a startup error.

The root `.env.example` and `apps/mobile/.env.example` describe the standard workflow; they are examples, not automatic root `.env` loading. The interactive launcher constructs its own explicit synthetic environment. It never switches a supplied production database into demo mode.

| Variables | Standard workflow role / interactive handling |
| --- | --- |
| `DEV_HOST`, `DEV_PORT`, `DEV_PUBLIC_ORIGIN` | Gateway binding/port and optional exact externally forwarded origin; set the latter to the HTTPS preview origin when available. Hosting `PORT` is used when `DEV_PORT` is absent. |
| `DEV_DATA_PATH` | Explicit isolated synthetic archive for automated/manual scenarios; its default is `.lilleri/interactive/data`, and its independent key/journal namespace follows the archive identity. |
| `DEV_RECOVERY_PATH` | Optional parent for per-archive keys/journals on persistent hosting storage. Must keep recovery state outside the database directory; the local home-directory default is unchanged. |
| `NODE_ENV`, `DEMO_MODE`, `LOCAL_AUTH_MODE` | Explicit synthetic/nonproduction mode. Production, local-auth and external database settings are refused by the interactive launcher. |
| `API_HOST`, `API_PORT` | Standard API binding/port; interactive API stays loopback on 3191. |
| `PGLITE_PATH` | Standard persistent archive selection; interactive workflow uses its separate stable archive. |
| `LOCAL_KEY_VAULT_PATH`, `SOURCE_ERASURE_JOURNAL_PATH` | Independent synthetic keys/recovery journals. Standard Turbo startup now forwards the source-erasure journal override. |
| `DATABASE_URL`, `DATABASE_RUNTIME_URL` | Optional standard PostgreSQL migration/trusted and separate non-owner runtime connections. Not used by `dev:cloud`. |
| `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_LOCAL_AUTH_MODE` | Values embedded in the browser bundle; interactive values are `/api` and `0`. Restart/export to change bundle configuration. |
| `NEXT_PUBLIC_DEMO_URL` | Optional explicit demo link on the Next site; the interactive launcher supplies its gateway URL. Standard local startup retains its original link. |
| `LOCAL_AUTH_BASE_URL`, `LOCAL_AUTH_SECRET` | Local identity only; secure process configuration with a stable secret, never repository content. Not inherited into the cloud demo. |
| `PAYLOAD_RETENTION_*` | Standard cleanup bootstrap options; active persisted runtime policy remains authoritative. |
| `DELETION_JOURNAL_KEY_FILE`, `DELETION_JOURNAL_KEY_ID` | Optional operator/restore journal signing configuration; see the deletion-aware restore contract. |
| `PG_TEST_DATABASE_URL`, `PG_TEST_OTHER_CLUSTER_URL` | Disposable PostgreSQL integration and optional separate-cluster tests. Never point these at real data. |
| `EXPO_OFFLINE`, `EXPO_NO_TELEMETRY`, `NEXT_TELEMETRY_DISABLED`, `TZ` | Development tooling settings; offline Expo, disabled telemetry and profile-aware financial calendars. |

The gateway validates browser origin/fetch metadata before rewriting upstream API headers, filters authentication credentials, and does not expose local operator diagnostics or local authentication. HTTPS port forwarding must preserve browser Host and `X-Forwarded-Proto: https`. The backend's original loopback/production guards remain in place. The HTTP/OpenAPI contract is available internally at `/openapi.json`; financial routes remain versioned under `/v1`. The proxy prefix is only a development transport detail.

## Build, checks and diagnosis

| Command | Result |
| --- | --- |
| `pnpm dev:cloud` | Initial build, API/Expo/Next supervision, same-origin preview and source rebuilds |
| `pnpm dev` | Original loopback workflow; its API watches compiled output, so rebuild TS separately |
| `pnpm dev:zero` | Separate synthetic zero-budget demonstration/economics workflow |
| `pnpm build` | All package builds, Next production build and Expo web export |
| `pnpm check` | Biome lint/format, configuration/copy guards, Node contracts, typechecks and unit/API suites |
| `pnpm test:dev` | Gateway real HTTP/WebSocket and build/restart regression tests |
| `pnpm test:integration` | API integration; embedded PGlite by default, optional disposable PostgreSQL |
| `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` | Individual existing checks |
| `node tools/interactive-ui-smoke.cjs http://localhost:8080 --isolated` | Actual browser smoke on a fresh synthetic archive; requires tooling Playwright and Chromium, not an app dependency |

Expo and Next update their own interface sources. API and shared-package changes trigger a serialized checked rebuild; the API restarts only after success, and closes its existing database handle first. A failed rebuild leaves the running application available and prints the compiler failure. This process adds no application dependencies and does not rewrite API contracts or migration files.

Useful diagnosis: gateway `/api/health`, `/api/v1/demo`, API service stdout, browser console/network, and loopback-only `/internal/metrics` / `/internal/observability`. Check exact API status/problem codes and the affected data/revisions. A stale `409` must lead to a fresh view and a new explicit gesture, not an automatic replay of a financial write.

Manual acceptance for each iteration:

1. Open the preview, verify Home and transactions on mobile/desktop widths.
2. Create a synthetic manual account/entry or import an invented CSV/XLSX; refresh and verify that saved data remains.
3. Check transaction evidence, make a correction and use undo; inspect totals/currencies.
4. Change language/preferences and reopen; test the affected flow and export when relevant.
5. Report the screen/action and observed result. Future fixes use the current archive and source state; no reset is assumed.

## Path to the real-bank/public MVP

The documented full beta P0 is **not complete**. The [25 reconciliation scenarios](../product/reconciliation-scenarios.md) currently classify four as supported, eighteen as incomplete and three as expected unsupported. Local fixtures and a successful preview cannot establish real coverage, lawful access, production security or native release acceptance.

| Next work | Software work that can continue | Required resource before real operation |
| --- | --- | --- |
| Bank connector | Implement the chosen official adapter against existing provider ports; verify redirects, authorization terms, pagination, error/revocation and identity contracts | Issued sandbox access and current provider documentation/terms; contract/licence route and Italy coverage before real data. Existing research proposes Yapily conditionally and Enable Banking as fallback; this is not an active account. |
| Public identity | Production session/origin/CSRF configuration, real recovery/delivery, ownership and deletion acceptance | Deploy/domain origin, protected secrets and delivery service; existing localhost auth must not simply be exposed publicly. |
| Correctness P0 | No-ID/reconsent identity, pending lifecycle, own-IBAN/one-leg evidence, cross-source dedup, remaining rule/feedback/search/FX and degraded flows | Provider semantics and authorized fixtures where needed; synthetic adversarial work remains independently actionable. |
| Infrastructure | Separate least-privilege PostgreSQL runtime, deployed encryption/key adapter, backups/restore, HTTPS and alert/operator isolation | Selected hosting region/account, domain, secret store/KMS and backup configuration. None is configured yet. |
| Pilot and release | Production data lifecycle, notices/consent and end-to-end acceptance | Provider permission/contract, reviewed privacy/legal/processor arrangements and informed participants before real data; actual release acceptance before public banking availability. |

Continue the existing [execution plan](../product/execution-plan.md) and [MVP criteria](../product/mvp.md) from this state. User authorization covers local reversible implementation; creating provider/hosting accounts, paid contracts and production changes are separate concrete actions when their inputs are available.
