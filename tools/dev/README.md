# Interactive development

Use the installed workspace toolchain (Node 22.12+ and pnpm 10.28.0), then run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm dev:cloud
```

The launcher builds the existing packages, starts the API, Expo browser app and Next project site, then exposes the Expo app through a dependency-free development gateway. If the cloud host supplies ingress, forward **8080** and open that preview. The current Codex cloud task has no verified external URL or callable forwarding capability; starting the launcher alone does not make it reachable from a Mac. Locally, open `http://localhost:8080`. The frontend uses `/api` on the same browser origin, so HTTPS previews work without browser requests to the viewer's localhost or mixed-content errors.

| Process | Address | Purpose |
| --- | --- | --- |
| Browser gateway | `0.0.0.0:8080` | Forward this port for the financial app and hot reload |
| Synthetic API | `127.0.0.1:3191` | Gateway `/api/health` and `/api/v1/*`; remains loopback only |
| Expo / Metro | `localhost:8181` | Browser frontend and hot reload; accessed through gateway |
| Next project site | `127.0.0.1:3000` | Forward 3000 separately when checking the project site |

The gateway checks browser Origin and fetch metadata before proxying, excludes authentication and internal diagnostics routes, and strips inherited authentication credentials. The public preview is a shared **synthetic demo** for development, with no user authentication or bank/provider connections. Use invented data. The existing local authenticated workflow remains separate. A gateway does not establish production readiness.

Frontend changes use Metro/Next hot reload. Changes to API and shared package sources trigger a debounced, serialized Turbo build with `--noEmitOnError`. The API reopens its archive only after the previous process has exited and the complete build succeeds. A compiler error keeps the current API available; save the correction to retry. The launcher prints state changes and all service logs in its terminal. Stop with Ctrl+C; child process groups, hot reload sockets and the API close together. Keep that terminal running between manual tests; the workspace host controls persistence across cloud environment shutdowns.

Configuration belongs in the launching process environment; no secret or `.env` file is required:

```sh
# Loopback-only local development:
DEV_HOST=127.0.0.1 pnpm dev:cloud

# Restrict a cloud preview to its known, exact browser origin:
DEV_PUBLIC_ORIGIN=https://your-preview.example pnpm dev:cloud

# A separate disposable manual test fixture; existing archives are preserved:
DEV_DATA_PATH=/tmp/lilleri-disposable/data pnpm dev:cloud
```

`DEV_PORT` changes only the gateway port. Internal ports stay fixed so the existing API loopback origin policy stays intact. A TLS port forward must preserve the browser Host and `X-Forwarded-Proto: https`; if an origin is configured, it must match exactly, with no trailing slash/path. Every occupied required port aborts startup without terminating its owner.

If `DEV_PORT` is absent, the gateway also accepts a hosting platform's `PORT`. `DEV_RECOVERY_PATH` optionally selects the parent of its per-archive recovery namespace, so a hosted service can persist keys/journals on the same volume as its database while keeping them outside the database backup directory. A recovery directory nested inside the database is refused. The existing local defaults are unchanged.

For an online commit/deploy preview while continuing edits in Codex, use the root Dockerfile and the [Railway setup](../../docs/operations/railway-preview.md). Mount `/data` and preserve it across deployments. This does not provide hot reload from a different Codex filesystem.

The image starts `node tools/dev/run.mjs --prepared` after compiling its packages during the build. This avoids duplicate startup compilation inside a hosting runtime's memory limit. Use this flag only with packages already compiled from the same sources; the compiled synthetic API is checked before opening its archive. Ordinary `pnpm dev:cloud` continues to build before launch, and source changes still use the supervised rebuild queue.

Data persists by default in ignored `.lilleri/interactive/data`, separate from ordinary and zero-budget demos. `DEV_DATA_PATH` chooses another local PGlite directory. The independent key vault and source-erasure journal live under `~/.lilleri-interactive/<root-and-database-path-hash>/`; preserve them when reopening that directory. This launcher does not migrate, reset or delete existing archives. API migrations use the existing reviewed checksum-protected migration chain on startup.

The launcher refuses production mode, local-auth mode and inherited PostgreSQL URLs. Only an explicit allowlist of toolchain variables reaches children; provider/payment credentials, `NODE_OPTIONS` and unrelated archive paths are excluded. Expo runs offline with dotenv loading and telemetry disabled. Installed dependencies are required; no vendor, Docker or database service is needed. Maintenance processes use the API's existing PGlite handle rather than opening the store again.

`pnpm test:dev` runs isolated real HTTP/WebSocket gateway and process/build-supervision regressions without opening application archives. Full application checks remain `pnpm check` and `pnpm build`.
