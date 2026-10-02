# Toolchain spikes — executed in the sandbox on 2026-10-02

Scope: empirical de-risking of the candidate stack by actually installing and running
the packages (not by reading docs). Every row below is a **FACT** in the sense "it ran
in this sandbox on this date with these versions"; it is not a statement about other
versions or environments. Spike sources live outside the repository (scratchpad) and
were discarded; the reproducible parts are re-created in the real packages in Phase 4.

Environment: Linux x86_64, Node 22.22.0, pnpm 10.28.0, PostgreSQL 16.14 (local,
non-Docker), Redis 7.0.15 available but not needed by the spikes, Docker daemon
unavailable in the sandbox.

## Results

| # | Spike | Versions | Result | Notes / implications |
| --- | --- | --- | --- | --- |
| 1 | TypeScript 7 (Go-native `tsc`) typecheck of a NodeNext ESM project using Fastify, Zod, Drizzle, pg-boss, better-auth types | typescript 7.0.2 | PASS — `tsc -p` exit 0 in 0.7 s wall | TS 7 is usable for `typecheck` tasks. Checked peer ranges: expo, next, drizzle-orm, drizzle-kit, fastify-type-provider-zod, better-auth, vitest, biome, turbo, expo-router declare **no** TypeScript peer constraint (npm view, 2026-10-02). Risk remains for tools with an in-process TS API (typescript-eslint, some codegen); Biome avoids this. |
| 2 | Fastify 5 + `fastify-type-provider-zod` 7 + Zod 4 + `@fastify/swagger` 9: typed route, validation, OpenAPI 3 generation | fastify 5.12.5, fastify-type-provider-zod 7.0.0, zod 4.6.5, @fastify/swagger 9.9.1 | PASS — GET with `limit=5` → 200 and typed body; `limit=999` → 400; `app.swagger()` emits OpenAPI 3.x with 2 query parameters | Confirms the OpenAPI-from-Zod path for a typed mobile client. `fastify-type-provider-zod@7` peer: fastify ^5.5.0, zod >=4.1.5, @fastify/swagger >=9.5.1. |
| 3 | Drizzle ORM 0.45 on PGlite (in-process Postgres/WASM) with `bigint` minor-unit amounts | drizzle-orm 0.45.3, @electric-sql/pglite 0.5.8 | PASS — inserts `-8430n`, `235000n`, `-123456789012n`; rows come back as JS `bigint`; `sum()` cast to text re-parsed equals the exact JS bigint sum | PGlite cold start exceeded Vitest's default 5 s timeout once (WASM boot); use `testTimeout: 30000` or a shared instance per test file. Money as `bigint` minor units round-trips exactly. |
| 4 | pg-boss 12 job queue on real PostgreSQL 16 (start, createQueue, work, send) | pg-boss 12.35.1, pg 8.23.1 | PASS — job delivered to worker; graceful stop | API note: pg-boss 12 exports a **named** `PgBoss` class (no default export under NodeNext). Postgres-only queue is viable → Redis is not required for the MVP job system. |
| 5 | better-auth 1.7.7 with Drizzle adapter and passkey plugin construction | better-auth 1.7.7, @better-auth/passkey 1.7.7 | PASS — `betterAuth({...})` constructs with `drizzleAdapter(db,{provider:'pg'})` and `passkey({rpID,rpName})`; handler is a function | Only construction was tested (no HTTP flow). `@better-auth/expo` peers: expo-secure-store >=12.5, expo-linking >=7, expo-web-browser >=14, expo-constants >=17, expo-network >=8.0.7. |
| 6 | Vitest 5 running the above as ESM TypeScript tests | vitest 5.0.3 | PASS — 4 files, 4 tests | Default test timeout is 5 s; raise for PGlite/DB tests. |

## Rendering toolkit (brand phase)

| # | Spike | Versions | Result |
| --- | --- | --- | --- |
| 7 | SVG → PNG rendering with embedded fonts (Geist, Inter, Newsreader, Manrope, Plus Jakarta Sans, Instrument Sans as TTF; woff2 converted with fontTools) | @resvg/resvg-js 2.x, sharp, fonttools (pip) | PASS — text renders with `font-family="Geist"` and `font-variant-numeric="tabular-nums"`; used to build icon sheets (256→16 px), a 30-icon "finance shelf" recognition test and palette sheets with WCAG contrast. |

## Mobile and web

| # | Spike | Versions | Result | Notes / implications |
| --- | --- | --- | --- | --- |
| 8 | `create-expo-app` blank TypeScript template, typecheck with TypeScript 7 | expo 57.0.26, react-native 0.86.3 (the template pins RN 0.86.x even though npm `latest` RN is 0.87.1), typescript 7.0.2 | PASS — `tsc --noEmit` exit 0 | Expo SDK 57 + TS 7 typecheck is viable. |
| 9 | `expo export --platform web` | expo 57.0.26, react-native-web 0.21.x, react-dom 19.2.3 | PASS only with `EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 CI=1` | Without the offline flags the Expo CLI tries to reach Expo's API through the sandbox proxy and fails with "HTTP Proxy Network Error: Forbidden". CI recipes for this sandbox must set the offline flags; real CI does not need them. Web export also required adding `react-dom` and `react-native-web` explicitly. |
| 10 | Next.js 16 App Router `next build` with TypeScript 7 | next 16.3.8, react 19, typescript 7.0.2 | PASS — static routes `/` and `/_not-found` generated | Next 16 works with TS 7 for a minimal app. |
| 11 | Biome 2.5 `check` on a React Native `App.tsx` and a Next.js `page.tsx` | @biomejs/biome 2.5.15 | RUNS — parses both files; reports formatting diffs as expected on unformatted input | Biome handles RN + Next TSX; formatting rules to be set in the monorepo config. |

## Open items (to be verified in Phase 4, not assumed)

- Biome 2.5 across the whole pnpm/Turborepo monorepo (shared config, per-package overrides).
- Drizzle Kit `generate`/`migrate` against PostgreSQL 16 and PGlite (migrations policy).
- OpenTelemetry SDK + Pino wiring in Fastify 5.
