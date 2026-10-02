# Lilleri — Technology Stack Options (greenfield TypeScript monorepo)

**Scope.** Evaluation of the candidate stack for Lilleri (consumer PFM, Italy-first then EU, 1–3 person team, promise: zero-setup aggregation + automatic reconciliation + personal AI categorization). Covers 16 areas (mobile, web, backend, ORM/DB, jobs, auth, billing, i18n, monorepo tooling, observability, deployment, security tooling, mobile security, design tokens/design system, charts, OCR) with current versions as of **2026-10-02**, an Architecture Decision Matrix, and per-area recommendation / runner-up / risks / revisit condition.

**Verification method and its limits (read first).**
- The session's web-search budget was already exhausted before this research started (every `WebSearch` call returned "budget used, 200/200"). `WebFetch`/`curl` to vendor sites (expo.dev, hetzner.com, postgresql.org, endoflife.date, api.github.com) is blocked by the egress proxy.
- What *was* reachable and used as primary evidence: (1) the **npm registry** (`npm view` for versions, publish dates, dist-tags, engines, peer dependencies, READMEs), (2) **raw.githubusercontent.com** (changelogs, docs sources, release schedules — e.g. `nodejs/Release/schedule.json`, `expo/expo/docs`, `postgres/postgres` release notes, `endoflife-date/endoflife.date` product files, `github/docs` billing pages), (3) **Context7** library documentation (Expo, better-auth, Drizzle, Prisma, Next.js, NestJS, Hono, Biome, NativeWind, Unistyles, Tamagui, pg-boss, Graphile Worker, BullMQ, Inngest, Trigger.dev, Fly.io, Neon, Supabase, RevenueCat, Stripe, Clerk, Paddle, Semgrep, Snyk, PostHog, Vitest, Lingui, Coolify, Hetzner API).
- Claims that could not be verified today (mainly **prices of Hetzner, Vercel, AWS, Sentry, Auth0, Supabase, GitHub Code Security, Stripe Tax %, Paddle %, Apple/Google store policy text**) are labelled **ASSUMPTION** or **UNKNOWN** with the exact page to check. Reliability: high = primary source read today; medium = official docs via Context7 or well-established fact not re-read today; low = memory only.
- Labels: **FACT** (verified today from a primary source), **ASSUMPTION** (believed true from training/known-stable facts, not re-verified today), **HYPOTHESIS** (judgement/forecast), **UNKNOWN** (could not establish; verification path given).
- **Adversarial verification pass (2026-10-02, later the same day; see §7).** `WebSearch` was still exhausted and `api.github.com` / `github.com` remained blocked, so the pass re-ran `npm view` for ~90 packages, re-read raw.githubusercontent.com sources, used nodejs.org/dist, Flutter's release JSON on storage.googleapis.com, the GitHub code-search API (via MCP) and Context7. Corrections are applied inline and tagged **⟦AV⟧**; the material ones are: BullMQ 6 now has an optional **PostgreSQL backend** (§3.5), Neon Free storage is **1 GB/project** not 0.5 GB (§3.11), Drizzle has **no clean 1.0.0-rc.5** release (§3.4), Hermes does **not list `Intl.PluralRules`** as implemented (§3.8), better-auth's OIDC story is the `@better-auth/oauth-provider` package (§3.6), Flutter stable is **3.47.6** (§3.1), and PGlite's README confirms **pgvector** support (§3.4). Hetzner/Vercel/Sentry/Stripe Tax/Paddle/GitHub-Code-Security prices and Apple/Google policy text remain unverified (no reachable primary source).
- **Second adversarial pass ⟦AV2⟧ (2026-10-02, later still; see §7).** This time `WebSearch` worked for 13 queries before the session budget ran out, `curl` to raw.githubusercontent.com and storage.googleapis.com worked, the GitHub MCP exposed repository metadata, Context7 mirrored Hetzner/Expo docs, and `npm view` was re-run for ~45 packages. **Material corrections:** (1) **Hetzner prices were stale** — two 2026 increases (CX23 ≈ €5.99, CX33 ≈ €8.99) and reports that the CX line was not orderable in Sept 2026 → MVP cost estimate raised to ≈ €45–100/month and bundle A's cost score lowered 5 → 4 (weighted total 4.6 → 4.5; §2.1, §3.11); (2) **PostgreSQL 18.6 was released 2026-08-13**, not 08-11 (§1, §4); (3) **Expo Production plan is ≈ $199/month + usage** (secondary), not the remembered "$99" (§3.1); (4) **Clerk has no EU region** — UNKNOWN → FACT (§2.2, §3.6); (5) **GitHub Code Security $30 / Secret Protection $19 per active committer** — ASSUMPTION → FACT (secondary, §3.12); (6) **Supabase Pro $25 / 100k MAU, Free 50k MAU** — ASSUMPTION → FACT (primary, §3.6); (7) RevenueCat's 1 % applies to *total* MTR, not the excess (§3.7). **Re-confirmed from primary sources:** TypeScript 7.0.2 + archived `typescript-go`, Node 24/26 dates, Expo 57/58 bundled versions, Drizzle still RC, Neon 1 GB/project, Sentry EU scope, Semgrep LGPL-2.1 and ≤ 10-contributor free tier, OTel Logs "Development", Hermes Intl gaps, Flutter 3.47.6, Coolify 4.4.0, Next 15.5 EOL, BullMQ PG backend. **Still unverified:** Stripe Tax %, Paddle %, Vercel pricing, Auth0 Free MAU, Apple/Google policy text, NativeWind 5 GA timing, Inngest EU, OVHcloud Milan, Textract eu-south-1.

---

## 0. Executive summary — recommended stack at a glance

| Layer | Recommendation (Oct 2026) | Runner-up | Key reason |
|---|---|---|---|
| Mobile | **React Native 0.86 via Expo SDK 57** (New Architecture only; Expo Router 57; EAS Build/Update; `expo-secure-store`, `expo-local-authentication`, `react-native-passkeys`) | Flutter | One TS codebase + OTA + shared packages with web; SDK 57 bundles RN 0.86.3 / React 19.2.3 (FACT, S9) |
| Web app / admin / landing | **Next.js 16.3** (App Router, Turbopack default, `proxy.ts`) self-hosted in EU (Docker) | Astro 7 for landing only | One web framework for 1–3 people; Next 16 is mature (released 2025-10-22, FACT S1/S13) |
| Backend | **Fastify 5 + Zod 4 + `fastify-type-provider-zod` 7 + `@fastify/swagger`** as a modular monolith; OpenAPI → generated mobile client | Hono 4.13 (+`@hono/node-server`, `@hono/zod-openapi`) | Mature Node-first ecosystem (helmet, rate-limit, under-pressure, OTel), no TS-compiler-API dependency (works with TS 7), Italian OSS roots help hiring |
| ORM / DB | **Drizzle ORM** (1.0.0-rc.4 is the `rc` tag since 2026-06-27 — GA date unknown, HYPOTHESIS ⟦AV⟧; 0.45.3 stable fallback) on **PostgreSQL 18.6** (+ pgvector 0.8.7, PGlite 0.5.8 for tests — PGlite README confirms pgvector support ⟦AV⟧) | Kysely 0.29 | SQL-first, RLS/policies, PGlite driver, drizzle-kit migrations; Prisma is mid-transition (7 → "Prisma 8" contract-first rewrite in RC) |
| Jobs / queues | **pg-boss 12** (Postgres-backed: retries/backoff, DLQ, cron) | BullMQ 6 on Valkey/Redis — or BullMQ 6's new optional **PostgreSQL backend** (FACT, S61 ⟦AV⟧) | One stateful service at MVP; transactional enqueue; no Redis to operate (BullMQ-on-PG is a second way to get that, but it is 2 months old and not the "battle-tested" path per BullMQ's own docs) |
| Auth | **better-auth 1.7** (self-hosted in the API; `@better-auth/passkey`, `@better-auth/expo`, 2FA, Apple/Google idToken sign-in) | Ory Kratos (self-host / Ory Network EU) | Users stay in your EU Postgres; passkeys + Expo first-class; Lucia is deprecated (FACT, S1) |
| Billing | **RevenueCat** (IAP, free < $2.5k MTR then 1 %) + **Stripe + Stripe Tax** (web) | Paddle (MoR) | Store policy forces IAP for in-app digital subscriptions; RevenueCat pricing verified (S41) |
| i18n | **i18next 26 + react-i18next 17 + i18next-icu** (ICU), `Intl.NumberFormat('it-IT', {currency:'EUR'})` | Lingui 6 | Ubiquitous, works identically in RN and Next; Lingui 6 is ESM-only/Node 22.19+ with macro build steps |
| Monorepo / quality | **pnpm 12 + Turborepo 2.11**, **Biome 2.5** (format+lint), **TypeScript 6.0.3 pinned for tooling, TS 7.0 for fast type-checks**, **Vitest 5**, **Playwright 1.63**, **Maestro 2.11**, Changesets 3 | Nx 23; oxlint+oxfmt | Biome/Vitest/Fastify/Expo/Next have no dependency on the TS JS compiler API; `typescript-eslint` still requires TS < 6.1 (FACT, S1) |
| Observability | **OpenTelemetry JS** (traces+metrics stable; logs still "Development") + **Pino 10** + **Sentry (EU region, Frankfurt)** + **PostHog EU** (+ OpenFeature) | Grafana Cloud EU / Better Stack | EU data residency verified for Sentry (S30) and PostHog (S31) |
| Deployment | **Hetzner (fsn1/hel1) + Coolify 4.4** (Docker), Postgres self-managed with pgBackRest → Hetzner Object Storage; or **Neon (aws-eu-central-1)** if you prefer managed PG | Fly.io (fra/ams) or AWS eu-south-1 (Milan) ECS Fargate + RDS | ≈ €45–100/month MVP (⟦AV2⟧ revised upward: Hetzner raised prices twice in 2026 and the CX shared line is reported unavailable to order — see §3.11), EU-owned provider (GDPR/sovereignty), no US CLOUD Act exposure for primary data |
| Security tooling | Semgrep CE + Trivy + Gitleaks + Renovate + Syft SBOM + ZAP baseline; CodeQL only if repo public or Code Security licence | Snyk Free | All free for a private repo except CodeQL |
| Mobile security | Platform pinning (iOS `NSPinnedDomains`, Android Network Security Config) or `react-native-ssl-public-key-pinning`; `expo-secure-store` (+`requireAuthentication`); `expo-local-authentication`; `expo-screen-capture`; `jail-monkey` 3 | react-native-keychain | All Expo-compatible with a dev client |
| Design system | Tokens: **Style Dictionary 5** (DTCG) fed by Tokens Studio; RN styling: **NativeWind 5 RC (Tailwind 4) + react-native-reusables/rn-primitives**, fallback **Unistyles 3** | Tamagui 2 | Shares Tailwind 4 tokens with Next.js; Unistyles if NativeWind 5 GA slips |
| Charts | **Victory Native XL 42** (Skia 2.6 bundled by SDK 57, Reanimated 4.5) | react-native-gifted-charts | Skia-backed, 60–100 fps, pan/zoom; peer ranges satisfied by SDK 57 (FACT S1/S9) |
| OCR | On-device **ML Kit** (`@infinitered/react-native-mlkit-text-recognition` 5 or `@react-native-ml-kit/text-recognition` 2) + server-side LLM structuring; EU cloud OCR alternative **Mistral OCR** | Google Document AI (EU endpoint) | Receipts stay on device for raw OCR; EU vendor for cloud fallback |

---

## 1. Runtime baselines (Node, TypeScript, PostgreSQL, Redis)

| Item | Current state (2026-10-02) | Label | Source |
|---|---|---|---|
| Node.js 24 "Krypton" | LTS since 2025-10-28; **enters Maintenance 2026-10-20**; EOL 2028-04-30; latest 24.21.0 (2026-09-07 per nodejs.org/dist ⟦AV⟧) | FACT | S2, S3, S65 |
| Node.js 26 | Released 2026-05-05; **becomes LTS 2026-10-28**; EOL 2029-04-30; latest 26.10.0 | FACT | S2, S3 |
| Node.js 22 "Jod" | Maintenance since 2025-10-21, EOL 2027-04-30 | FACT | S2 |
| Node.js 20 | EOL 2026-04-30 (do not use) | FACT | S2 |
| Bun | 1.4.2 (2026-09-04) | FACT | S1, S3 |
| TypeScript | `latest` = **7.0.2 (2026-07-08)** — the Go-native port ("TypeScript 7"); the npm package is a thin launcher (`bin/tsc`, `lib/version.cjs`, vendored `vscode-jsonrpc`, `./unstable/*` API) — **it does not ship the in-process JS compiler API**. **6.0.3 (2026-04-16)** is the last JS-based release; `typescript-go` repo is archived (`archived: true`, last push 2026-08-31 — re-confirmed via GitHub API metadata, S69 ⟦AV⟧); dist-tags today: `rc` 7.0.1-rc, `next` 7.1.0-dev.20261002.1. ⟦AV2⟧ Re-confirmed 2026-10-02: npm `latest` 7.0.2 (published 2026-07-08); GitHub API via MCP: `microsoft/typescript-go` is `archived: true` (last push 2026-08-31, description "Staging repo for development of native port of TypeScript", Apache-2.0); press coverage (InfoQ, Aug 2026 — S79) reports 7.0 GA with 8–12× faster full builds and nightlies moved back under `typescript@next` | FACT | S1, S12, S69, S79 |
| typescript-eslint 8.71 | peer `typescript: ">=4.8.4 <6.1.0"` → **not compatible with TS 7** | FACT | S1 |
| @nestjs/cli 12.0.8 | depends on `typescript ~6.0.2`; `@nestjs/swagger` peer `typescript ^5.5 \|\| ^6.0` | FACT | S1 |
| PostgreSQL | **18.6** latest (released **2026-08-13** per `release-18.sgml` ⟦AV2⟧; 18.0 GA 2025-09-25; EOL 2030-11-14); 17.11; 16.15; **19 is beta4** (`meson.build` version `19beta4`; beta 4 announced 2026-09-24), GA date still "2026-??-?? AS OF 2026-09-14" in the release notes — postgresql.org's beta announcements target a Sept/Oct 2026 GA, so 19.0 is probably weeks away but **not released on 2026-10-02** | FACT | S3, S4, S80 |
| PG 18 headline features | Asynchronous I/O subsystem; B-tree **skip scan**; `uuidv7()`; OAuth authentication; temporal (range) constraints; virtual generated columns | FACT | S4 |
| pgvector | 0.8.7 (2026-10-01) | FACT | S48 |
| PGlite | 0.5.8 (2026-08-26), "WASM Postgres… 3.7 MB gzipped" | FACT | S1, S49 |
| Redis / Valkey | Redis 8.10.2; Valkey 9.1.2 (BSD) | FACT | S3 |

**Recommendation.** Node **24 LTS** today (`engines.node ">=24.9"` — NestJS docs note Jest can only `require()` ESM-only packages on Node ≥ 24.9, S23), plan the move to **Node 26** in Q1 2027 once Expo/Next/Fastify CI matrices include it. TypeScript: pin **`typescript@6.0.3`** as the workspace compiler for maximum tool compatibility and add **TS 7 (`typescript@7` aliased, e.g. `"tsc-native": "npm:typescript@7.0.2"`) for the `typecheck` task** (10× faster, same semantics as 6.0 per S12). Flip the workspace to TS 7 once Next.js and any ESLint usage confirm support (**UNKNOWN**: whether `next build`'s type-check integration loads `typescript` as a library — verify on the vertical slice; Next 16's upgrade guide only states a *minimum* of TypeScript 5.1, S68 ⟦AV⟧). Encouraging signals for the TS 7 path ⟦AV⟧: `i18next` 26 and `react-i18next` 17 already declare `peerDependencies.typescript: "^5 || ^6 || ^7"`, and `oxlint` 1.86 declares a peer on `oxlint-tsgolint >= 7.0.2003` (type-aware linting built on the native TS toolchain) — FACT, S1. PostgreSQL **18** (uuidv7 primary keys, AIO); do not wait for 19. Bun: use for scripts if you like, not as the API runtime at MVP (OTel/Pino/pg-boss maturity is Node-first — HYPOTHESIS).

---

## 2. Architecture Decision Matrix

Scores 1 (poor) – 5 (excellent) for Lilleri's context (1–3 devs, Italy/EU, regulated-adjacent consumer finance). Weighted total uses weights in the header (sum 100).

### 2.1 Stack bundles

| Criterion (weight) | **A. Expo + Next 16 + Fastify/Zod + Drizzle + pg-boss + better-auth + Hetzner/Coolify** | **B. Expo + Next 16 + NestJS 12 + Prisma 7 + BullMQ/Valkey + Clerk + Fly.io/Neon** | **C. Flutter + Supabase (Auth/PG/Edge) + Next landing** | **D. Native Swift/Kotlin + Go/Java API + AWS Milan** |
|---|---|---|---|---|
| Development speed (15) | 5 | 4 | 4 | 2 |
| Type safety end-to-end (10) | 5 (Zod → OpenAPI → generated client; Drizzle) | 4 | 2 (Dart ↔ TS boundary) | 2 |
| Security posture (10) | 4 (own auth = own responsibility) | 4 | 4 | 5 |
| Ecosystem maturity (8) | 4 | 5 | 4 | 5 |
| Testing (7) | 4 (Vitest, PGlite, Playwright, Maestro) | 4 | 3 | 4 |
| Cost at MVP (8) | 4 (≈ €45–100/mo — ⟦AV2⟧ was 5 / €30–80 before the 2026 Hetzner price increases, S75) | 3 (€60–150/mo) | 4 | 2 (€150–300/mo) |
| Observability (6) | 4 (OTel + Sentry EU + PostHog EU) | 5 (NestJS 12 has native observability) | 3 | 4 |
| Mobile DX (8) | 5 (Expo dev client, EAS, OTA) | 5 | 4 | 3 |
| Backend scalability (6) | 4 (modular monolith; PG-queue limits ~1k jobs/s) | 4 | 3 (Edge functions constraints) | 5 |
| Hiring Italy/EU (8) | 4 (React/TS abundant; Fastify Italian roots) | 5 (NestJS very common in IT consultancies) | 3 | 3 |
| EU deployment / data residency (8) | 5 (EU-owned provider) | 3 (US vendors, EU regions) | 3 (US vendor, EU region) | 4 (AWS Milan, US company) |
| Vendor lock-in (6) | 5 | 3 | 2 | 4 |
| **Weighted total /5** | **4.5** (⟦AV2⟧ was 4.6; cost score 5 → 4) | **4.1** | **3.3** | **3.2** |

### 2.2 Per-area matrices (relevant criteria only)

**Mobile**

| Option | Dev speed | Type safety | Ecosystem | Testing | Cost | Mobile DX | Hiring IT/EU | Lock-in | Notes |
|---|---|---|---|---|---|---|---|---|---|
| RN 0.86 + Expo SDK 57 | 5 | 5 | 5 | 4 | 5 | 5 | 5 | 4 (EAS optional) | New Arch only since SDK 55 (FACT S5) |
| Flutter | 4 | 3 | 4 | 4 | 5 | 4 | 3 | 4 | Separate language; stable **3.47.6** (2026-10-01, Dart 3.13.5) — FACT, S62 ⟦AV⟧ |
| Native Swift + Kotlin | 2 | 3 | 5 | 4 | 3 | 3 | 3 | 5 | 2 codebases, no OTA |

**Backend**

| Option | Dev speed | Type safety | Security | Ecosystem | Testing | Observability | Scalability | Hiring | TS 7 ready |
|---|---|---|---|---|---|---|---|---|---|
| Fastify 5 + Zod | 5 | 5 | 4 (`@fastify/helmet`, `rate-limit`, `under-pressure`) | 5 | 5 | 5 (`@fastify/otel`) | 4 | 4 | yes |
| Hono 4.13 | 5 | 5 (`hc` RPC + zod-openapi) | 3 | 3 (Node-side smaller) | 4 | 4 (`@hono/otel`) | 4 | 3 | yes |
| NestJS 12 | 3 | 4 | 4 | 5 | 4 | 5 (`@nestjs/observe`) | 4 | 5 | **no** (CLI needs TS 6) |

**ORM**

| Option | Type safety | Migrations | PG features (RLS/jsonb/partition/numeric) | Tests (PGlite) | Maturity | Risk |
|---|---|---|---|---|---|---|
| Drizzle 1.0 RC / 0.45 | 5 | 4 (drizzle-kit) | 5 (pgPolicy, `withRLS`, jsonb; partitioning via SQL migration) | 5 (first-class driver) | 4 | 1.0 GA timing (HYPOTHESIS) |
| Kysely 0.29 | 4 | 3 (Migrator, codegen) | 4 | 4 (`kysely-pglite`, stale 2024) | 4 | more boilerplate |
| Prisma 7 / 8 RC | 4 | 5 | 3 | 3 (`pglite-prisma-adapter` community) | 3 | **API rewrite in progress** (FACT S16) |

**Jobs**

| Option | Simplicity | Reliability (retry/DLQ) | Cron | EU hosting | Cost | Lock-in |
|---|---|---|---|---|---|---|
| pg-boss 12 | 5 | 5 (retryLimit/backoff/deadLetter) | 5 | 5 | 5 | 5 |
| BullMQ 6 | 4 | 5 | 5 (Job Schedulers) | 5 (Redis/Valkey, **or the v6 optional PostgreSQL backend** — S61 ⟦AV⟧) | 4 | 4 |
| Graphile Worker 0.18 | 4 | 4 | 5 (crontab) | 5 | 5 | 5 |
| Temporal | 2 | 5 | 5 | 4 (self-host heavy; Cloud EU) | 2 | 3 |
| Inngest / Trigger.dev | 4 | 5 | 5 | 3–4 (EU region exists for Trigger.dev; self-host possible) | 3 | 2 |

**Auth**

| Option | Passkeys | Expo | Session revocation | MFA | Apple/Google native | EU residency | Cost | Lock-in |
|---|---|---|---|---|---|---|---|---|
| better-auth 1.7 | 5 | 5 | 5 (DB sessions) | 4 | 5 (idToken) | 5 (your DB) | 5 | 5 |
| Ory Kratos | 4 | 3 | 5 | 5 | 4 | 5 (self-host) / 4 (Ory Network) | 4 | 4 |
| Clerk | 5 | 5 | 4 | 5 | 5 | 2 (⟦AV2⟧ US-only hosting, no EU region — FACT, S76) | 4 (50k MRU free) | 2 |
| Supabase Auth | 4 | 4 | 4 | 4 | 5 | 4 (EU regions) | 4 | 2 |
| Auth0 | 5 | 4 | 4 | 5 | 5 | 4 (EU region) | 3 | 2 |
| Keycloak | 4 | 3 | 5 | 5 | 4 | 5 | 3 (ops) | 4 |
| Lucia | — | — | — | — | — | — | — | **deprecated** |

---

## 3. Area-by-area findings

### 3.1 Mobile: React Native + Expo vs Flutter vs native

**Verified facts**

| Claim | Label | Source |
|---|---|---|
| `expo` latest **57.0.26** (2026-09-29); dist-tags: `sdk-57`=57.0.26, `sdk-56`=56.0.23, `sdk-55`=55.0.31, `sdk-54`=54.0.37, **`next`=58.0.2** (58.0.0 published 2026-09-29, not yet `latest`) | FACT | S1 |
| SDK release dates (CHANGELOG headings): 57.0.0 — 2026-07-08; 56.0.0 — 2026-06-01; 55.0.0 — 2026-02-25; 54.0.0 — 2025-09-10. ⟦AV⟧ npm *publish* dates differ: `expo@57.0.0` 2026-06-30, `expo@56.0.0` 2026-05-20, `expo@58.0.0` 2026-09-29 (the `.0` package is cut before the public announcement). ⟦AV2⟧ Expo's own changelog page (expo.dev/changelog/sdk-57, via search — S81) dates the SDK 57 release **2026-06-30**, i.e. the npm date rather than the 07-08 repo-CHANGELOG heading; it also records that `expo@57.0.9` fixed a Hermes V1 memory regression inherited from SDK 56 that hit apps importing reanimated/worklets — pin ≥ 57.0.9 | FACT | S8, S1, S81 |
| ⟦AV⟧ **SDK 58 is pre-release**: `next` = 58.0.2 and the `sdk-58` branch bundles **react-native 0.88.0-rc.2**, react 19.3.0, reanimated 4.7.0, Skia 2.11.2 — i.e. it pairs with an RN *release candidate* today | FACT | S9 (sdk-58 branch), S1 |
| SDK 57 bundles **react-native 0.86.3, react 19.2.3, react-native-reanimated 4.5.1, react-native-worklets 0.10.1, @shopify/react-native-skia 2.6.2, react-native-screens ~4.26, gesture-handler ~2.32, react-native-svg 15.15.4, @sentry/react-native ~7.11, react-native-web ~0.21** (SDK 56: RN 0.85.3; SDK 55: RN 0.83.10) | FACT | S9 |
| "SDK 55 and later run entirely on the New Architecture… cannot be disabled… React Native 0.82 was the first version to remove the option"; legacy architecture frozen June 2025; ~83 % of SDK 54 EAS builds used New Arch (Jan 2026) | FACT | S5 |
| React Native latest 0.87.1 (0.87.0 — 2026-08-11); 0.88.0-rc.3 syncs React 19.3.0; RN releases every ~2 months, each supported ~6 months (endoflife) | FACT | S1, S3, S52 |
| Expo Router 57.0.24; **React Server Components in Expo Router are "experimental"/beta**; API routes + server functions deploy to **EAS Hosting** | FACT | S1, S11 |
| `expo-secure-store` 57.0.4: iOS Keychain (`kSecClassGenericPassword`, `kSecAttrAccessible` configurable), Android Keystore-encrypted SharedPreferences; "some iOS releases refused values above roughly 2048 bytes"; data persists across reinstall on iOS; `requireAuthentication` (biometric gate) not available in Expo Go; values protected by `requireAuthentication` become inaccessible when biometrics change | FACT | S10 |
| `expo-local-authentication` 57.0.3: Face ID / Touch ID / Android BiometricPrompt; needs `NSFaceIDUsageDescription` | FACT | S10 |
| `react-native-passkeys` 0.4.2 (2026-08-05): Expo module, same API on iOS/Android/web (`navigator.credentials`-like), needs AASA (`webcredentials`) and `assetlinks.json`, Android `compileSdkVersion ≥ 34`, peer `expo >= 53` | FACT | S1, S53 |
| EAS Free plan: "limited quantity of low-priority builds… free updates… limits reset monthly"; **1,000 MAU** for EAS Update; no overage on Free (builds stop until the 1st of next month); **Starter $19/month → $45 build credit + 3,000 MAU**; Production and Enterprise exist (prices only on expo.dev/pricing); usage-based overage for paid plans; **EAS Update code signing only on Production/Enterprise**. ⟦AV⟧ Re-confirmed from `billing/faq.mdx` and `billing/usage-based-pricing.mdx`; overage rates: **$0.005 per extra MAU**, **$0.10 per GiB** edge bandwidth (Starter includes 100 GiB); builds are $1/$2 (Android medium/large) and $2/$4 (iOS medium/large) | FACT | S6, S7, S66 |
| Free-plan monthly build count (historically 30 builds incl. 15 iOS) and Production/Enterprise prices — ⟦AV2⟧ **corrected:** the "historically $99" Production figure is stale; concordant 2026 summaries of expo.dev/pricing (S84) give **Production $199/month + usage, 50,000 MAU, $225 build credit, 1 TiB edge bandwidth, 1 TiB storage**; Enterprise price not found (historically $999); storage overage $0.05/GiB. Expo's `billing/plans.mdx` (S6, re-read via raw GitHub and Context7) still prints only the Starter price ($19 → $45 build credit) | ASSUMPTION (medium; secondary sources for the $199 figure) — verify at https://expo.dev/pricing | S57, S84 |
| EAS Update policy: "your updates need to follow the App Store and Play Store guidelines… changes to your app's behavior need to be reviewed" | FACT | S7 |
| Apple Developer Program License Agreement §3.3.1B: interpreted code may be downloaded only if it does not change the primary purpose of the app, does not create a store for other code, and does not bypass signing/sandbox/security features; App Review Guideline 2.5.2 says apps may not download/install/execute code that changes features/functionality except as permitted | ASSUMPTION (medium; long-standing text, not re-read today) — verify at developer.apple.com/support/terms and App Review Guidelines §2.5.2 | S56 |
| Flutter current version: stable **3.47.6** (2026-10-01), Dart SDK 3.13.5 ⟦AV⟧ | FACT | S62 |

**Why RN + Expo for a 1–3 person team.** One language and one monorepo (shared Zod schemas, API client, i18n catalogs, tokens) with the Next.js web app; EAS gives cloud builds, OTA (`expo-updates`), and fingerprint-based "build only when native changes" workflows (S6 FAQ); hiring pool for React/TS in Italy is the largest; Expo's config plugins + dev client remove most native work while still allowing any native module. Flutter would be a reasonable second choice if the team were Dart-fluent, but it splits the type system from the backend and weakens web code sharing; native doubles mobile effort and removes OTA.

**Risks.** (1) **Upgrade treadmill**: 3–4 Expo SDKs/year (55 → 56 → 57 within five months in 2026), each 1–3 dev-days; mitigate by staying ≤ 1 SDK behind. (2) **Library drift**: several ecosystem packages lag Expo's bundled versions (e.g. npm `@sentry/react-native` is 8.29 while SDK 57 bundles ~7.11) — always use `npx expo install --fix`. (3) **OTA compliance**: keep updates to bug fixes/UI; ship feature changes through store review (ADPLA 3.3.1B). (4) **EAS dependency**: optional — `eas build --local` or GitHub Actions macOS runners work; EAS Update can be self-hosted (custom updates server) if code signing on Free is a blocker. (5) **RSC/Expo UI are experimental** — do not build the product on them. (6) Expo Go cannot be used once `react-native-passkeys`, pinning, Unistyles or Skia are added — use dev clients from day one.

**Recommendation:** Expo SDK 57 now; move to SDK 58 when it becomes `latest` (it is already published as `next`, but ⟦AV⟧ it currently bundles **RN 0.88.0-rc.2** — do not adopt it before the stable RN 0.88 pairing lands) and before the vertical slice if timing allows. **Runner-up:** Flutter. **Revisit condition:** if the team acquires a native-platform specialist *and* the product needs deep platform UI (e.g. widgets, App Intents) beyond what `@expo/ui`/Expo Modules provide.

### 3.2 Web / landing / admin: Next.js vs Astro vs Vite+React

| Claim | Label | Source |
|---|---|---|
| Next.js latest **16.3.8** (16.0.0 — 2025-10-22; 16.3.0 — 2026-08-03; canary 16.4.0-canary.57). Node ≥ 20.9; **Turbopack default for dev and build** (fails on custom webpack config unless `--webpack`); filesystem caching default; `middleware.ts` → **`proxy.ts`** (Node runtime only); async request APIs; React 19.2 canary in App Router; `cacheComponents: true` + `partialPrefetching`; React Compiler support, optional Rust port (`experimental.turbopackRustReactCompiler`) | FACT | S1, S13 |
| Next 15.5.x EOL 2026-10-21 (endoflife) → start on 16 | FACT | S3 |
| Astro **7.3.5** (7.0 — 2026-06-22; Node ≥ 22.12) | FACT | S1 |
| Vite **8.3.2** (8.0 — 2026-03-12); `@vitejs/plugin-react` 6.1.1 | FACT | S1 |
| React **19.3.0** (2026-09-09); `babel-plugin-react-compiler` 1.0.0 (2025-10-07) | FACT | S1 |
| Vercel pricing (Hobby free / Pro ~$20 per member) and EU-region Functions | ASSUMPTION (medium) — verify at vercel.com/pricing | S57 |

**Hosting: Vercel vs self-host EU.** Next 16 self-hosts cleanly in Docker (`output: 'standalone'`), which is what Coolify/Dokploy/Fly expect. Vercel is faster to start but is a US company (EU edge regions exist); for an app whose web surface is landing + admin + possibly account pages, self-hosting on the same Hetzner box costs ~€0 extra and keeps logs/IPs in the EU.

**Recommendation:** **Next.js 16** for the web app and admin (auth-aware, RSC/Server Actions, same Tailwind 4 tokens as NativeWind), landing as a static route group initially. **Runner-up:** **Astro 7** for the landing if marketing content (blog, SEO pages, MDX) grows — it is simpler and lighter for content, at the cost of a second framework. Vite+React only for an internal SPA admin if you want zero SSR. **Risks:** Next's cache-components model is still evolving (16.x minor releases add/rename flags — HYPOTHESIS); Turbopack incompatibility with some webpack-era plugins. **Revisit condition:** landing needs > 20 content pages or a CMS → split to Astro; or the web app becomes a full consumer product → consider Expo Router web (RN Web 0.21) for maximum code sharing.

### 3.3 Backend: NestJS vs Fastify vs Hono; OpenAPI; tRPC/oRPC

| Claim | Label | Source |
|---|---|---|
| Fastify **5.12.5** (5.0 — 2024-09-17); `fastify-type-provider-zod` **7.0.0** (peer `zod >= 4.1.5`, `@fastify/swagger >= 9.5.1`, `fastify ^5.5`); `@fastify/swagger` 9.9.1; `@scalar/fastify-api-reference` 1.72; `@fastify/helmet` 13.1, `@fastify/rate-limit` 11.2, `@fastify/under-pressure` 9.2, `@fastify/otel` 0.21.1 (2026-10-02). ⟦AV⟧ **Fastify 6 is in alpha** (`next` = 6.0.0-alpha.4, 2026-09-16) — expect a major within the project's first year; `fastify-type-provider-zod` 7 pins `fastify ^5.5` | FACT | S1 |
| Hono **4.13.12** (4.13.0 — 2026-08-03; `node >= 16.9`); `@hono/node-server` 2.1.3; `@hono/zod-openapi` 1.6.3 (peer `zod ^4`, `hono >= 4.10`); `hono-openapi` 1.3.3; `@hono/otel` 1.2.0; `hc` typed RPC client from exported route types | FACT | S1, S24 |
| NestJS **12.1.2** (12.0.0 — 2026-08-27; `node >= 20`): v12 "centers on ESM packages, updated CLI defaults, first-class Standard Schema validation and serialization, and native observability"; generated projects default to **Vitest and oxlint**; `nest upgrade` bumps TypeScript to v6 (required by CLI/schematics), raises `engines.node >= 20.19`; Jest can require ESM-only v12 packages only on Node ≥ 24.9 | FACT | S1, S23 |
| `@nestjs/swagger` 12.0.2 (peer TS `^5.5 \|\| ^6.0`); `nestjs-zod` 5.5.0 (peer `@nestjs/common ^10 \|\| ^11` — **not yet declaring v12**) | FACT | S1 |
| tRPC `@trpc/server` **11.19.0** (11.0 — 2025-03-21; peer `typescript >= 5.7.2`); oRPC `@orpc/server` **1.15.4**, `@orpc/openapi` 1.15.4 (OpenAPI first-class, Standard Schema). ⟦AV⟧ oRPC **2.0 is in beta** (`beta` = 2.0.0-beta.41, 2026-10-01) — if adopting oRPC, expect a major soon | FACT | S1 |
| Zod **4.6.5** | FACT | S1 |

**Modular-monolith pattern (Fastify).** One deployable, one Postgres; each bounded context (`accounts`, `transactions`, `reconciliation`, `categorization`, `billing`, `identity`) is an encapsulated Fastify plugin with its own routes, Zod schemas, Drizzle schema file, and pg-boss workers; cross-module calls only through exported TS interfaces (enforced by Biome/`knip`/package boundaries, e.g. `packages/modules/*`). OpenAPI is generated from Zod at boot; the mobile app consumes a generated client (`openapi-typescript` + `openapi-fetch` or `@hey-api/openapi-ts` — versions not checked, UNKNOWN) so **mobile ↔ API typing is contract-first and survives API versioning**. tRPC's `hc`-style RPC is excellent for Next ↔ API but has no native OpenAPI; **oRPC** gives both RPC and OpenAPI and runs on Fastify/Hono/Node — a viable alternative to `fastify-type-provider-zod` if you prefer procedure-style APIs.

**Recommendation:** **Fastify 5 + Zod 4 + fastify-type-provider-zod + @fastify/swagger + Scalar UI**, modular monolith, OpenAPI-generated mobile client (REST for mobile, optional oRPC/tRPC for Next-internal calls). **Runner-up:** **Hono** (same Zod/OpenAPI story, web-standard, portable to Bun/Workers; smaller Node-side ecosystem for rate-limit/under-pressure/auth plugins). **NestJS 12** is the hiring-friendly enterprise choice but adds DI/decorator ceremony, needs TS 6 (blocks TS 7), and its v12 ESM/Standard-Schema transition is 5 weeks old; `nestjs-zod` has not caught up. **Risks:** Fastify plugin encapsulation misuse (fix with lint rules + templates); Zod 4 ↔ OpenAPI 3.1 edge cases. **Revisit condition:** team ≥ 5 backend devs or need for a strict architecture framework → NestJS; edge/Bun deployment desire → Hono.

### 3.4 ORM / DB: Drizzle vs Prisma vs Kysely; Postgres 16/17/18; PGlite; pgvector

| Claim | Label | Source |
|---|---|---|
| `drizzle-orm` **0.45.3** is `latest` (0.45.0 — 2025-12-04; 0.45.3 — 2026-09-21); `rc` tag = **1.0.0-rc.4 (2026-06-27)**; `beta` = 1.0.0-beta.22; `drizzle-kit` 0.31.11. ⟦AV⟧ **Corrected:** there is **no clean `1.0.0-rc.5` release** — only hash-suffixed snapshot builds (`1.0.0-rc.5-5935859`, 2026-09-09, under the `rc5` dist-tag; earlier `-ab785fc`/`-169397b` in August). The `rc` tag has not moved in 3+ months, so "GA imminent" is unsupported. Supportive signal: `better-auth` 1.7.7 declares peer `drizzle-orm: "^0.45.2 \|\| >=1.0.0-rc.1 <2.0.0"` and `drizzle-kit: ">=0.31.4 \|\| >=1.0.0-beta.1"` | FACT | S1 |
| Drizzle v1: relational queries v2 (`where: { id: 1 }` object syntax; `db._query` → `db.query`), `pgTable.withRLS()` replaces `.enableRLS()`, `pgPolicy`/`pgRole` for RLS, upgrade guide published; `driver: "pglite"` in `drizzle.config.ts`; `drizzle(client)` with `new PGlite()` for in-memory tests; peers include `@electric-sql/pglite >= 0.2`, `pg >= 8`, `postgres >= 3`, `@opentelemetry/api ^1.4.1` | FACT | S1, S15 |
| `drizzle-orm` dist-tag `numeric-modes` (1.0.0-beta.1 branch) suggests numeric mode options are landing in 1.0 | HYPOTHESIS | S1 |
| Prisma: `prisma` `latest` = **8.0.0-rc.19** (2026-09-29), `prev` = 7.10.0; `@prisma/client` 7.10.0; Prisma 7 (2025-11-19) removed `engine: "classic"`, uses `prisma.config.ts` + driver adapters (`@prisma/adapter-pg`); **Prisma 8 is a new "contract-first" ORM** (`@prisma/orm-postgres` — ⟦AV⟧ confirmed on npm at 8.0.0-rc.14, 2026-10-01 — `definePrismaConfig`, `db.orm.public.User.include(...)…all()`), with a migration guide running 7 and 8 clients side by side; `prisma` engines `node >= 22.18`. ⟦AV⟧ Note `better-auth` 1.7.7 peers only `prisma ^5 \|\| ^6 \|\| ^7` — no Prisma 8 adapter yet | FACT | S1, S16 |
| Kysely **0.29.6** (0.29.0 — 2026-05-08; ⟦AV⟧ `next` = 0.30.0-beta.2, 2026-09-14; engines `node >= 22`); `kysely-codegen` 0.20; `kysely-pglite` 0.6.1 (last publish 2024-09) | FACT | S1 |
| PGlite 0.5.8; `pglite-prisma-adapter` 0.7.2 (community); `@testcontainers/postgresql` 12.2.0. ⟦AV⟧ PGlite README: "support for many Postgres extensions, including **pgvector** and PostGIS" (package exports include `./contrib/*`; confirm the exact import path for `vector` in 0.5.x) | FACT | S1, S49 |
| pgvector 0.8.7 (2026-10-01): IVFFlat/HNSW, `halfvec`/`sparsevec` | FACT | S48 |

**Postgres features that matter for Lilleri.** Amounts: store **integer minor units (`bigint`, EUR cents)**, never floats; if you must use `numeric(14,2)` (e.g. FX rates), handle string/number conversion explicitly (Drizzle returns `numeric` as string by default — ASSUMPTION, verify in 1.0). Identity: `uuidv7()` from PG 18 for time-ordered PKs. Raw provider payloads: `jsonb` with GIN where queried. Multi-tenancy: **RLS** with `pgPolicy` + a per-request `SET LOCAL app.user_id` (belt-and-braces with application scoping). Growth: declarative **range partitioning** of `transactions` by month via SQL in drizzle-kit migrations (drizzle-kit does not model partitions — ASSUMPTION; verify). Embeddings for merchant/category similarity: **pgvector** HNSW on `halfvec(1024)`. Tests: **PGlite in-process** for unit/integration (fast, no Docker), **Testcontainers** for anything touching partitioning or exact planner behaviour (⟦AV⟧ pgvector *is* available in PGlite per its README — FACT S49 — so vector-similarity unit tests can stay in-process; still smoke-test HNSW/`halfvec` on PGlite 0.5.8 before relying on it).

**Recommendation:** **Drizzle** — start on **1.0 RC** (the API you will live with; ⟦AV⟧ GA timing is **unknown** — the `rc` tag has been 1.0.0-rc.4 since 2026-06-27 with only snapshot builds since, HYPOTHESIS) with 0.45.3 as fallback if an RC blocker appears in week 1. **Runner-up:** **Kysely** (if you prefer a pure query builder + hand-written SQL migrations). **Prisma:** not now — the 7→8 transition means either adopting a 10-month-old "classic 7" that is already `prev`, or an RC of a rewritten API. **Risks:** Drizzle 1.0 GA slips (HYPOTHESIS; RC since June 2026); relational-query v2 edge cases. **Revisit condition:** Prisma 8 GA + 6 months of stability and the team values schema-first DX over SQL-first.

### 3.5 Jobs / queues

| Claim | Label | Source |
|---|---|---|
| **pg-boss 12.35.1** (12.0 — 2025-11-09): Node ≥ 22.12 or Bun; **PostgreSQL ≥ 13**; `retryLimit`/`retryDelay`/`retryBackoff` (exponential), **dead-letter queues** (`createQueue('main', { deadLetter: 'dlq' })`, `sourceId` preserved, redrive), `schedule(name, cron, data, { tz })`, queue policies, `updateQueue` | FACT | S1, S17 |
| **BullMQ 6.3.11** (6.0 — 2026-07-30): Redis ≥ 5 hard minimum, ≥ 6.2 recommended; Valkey auto-detected; Dragonfly supported; v6 removed `repeat`/`debounce` in favour of **Job Schedulers** (`upsertJobScheduler`) and deduplication; `ioredis` 6.0.0; `@nestjs/bullmq` 12 | FACT | S1, S19 |
| ⟦AV⟧ **Corrected/added: BullMQ 6 ships an optional PostgreSQL backend** — same `Queue`/`Worker`/`QueueEvents`/`FlowProducer` API via `createPostgresBackend` (or `setDefaultBackendFactory`), **PostgreSQL ≥ 13** (14+ recommended), `pg` as an optional peer dependency (npm: `peerDependencies.pg >= 8.0.0`), explicit `runMigrations()` schema setup, LISTEN-based wakeups. BullMQ's docs: "The Redis backend remains the default and the most battle-tested option." v6 changelog: "Introduce the IQueueBackend abstraction, Redis and PostgreSQL backends" | FACT | S1, S61 |
| **Graphile Worker 0.18.0** (2026-09-08): Node ≥ 22.18, PG ≥ 12; crontab file with `?fill=2d&max=10` options, exponential backoff `exp(least(10, attempt))` seconds | FACT | S1, S18 |
| Temporal TS SDK 1.24.0 (client/worker/testing) | FACT | S1 |
| **Inngest** SDK 4.21.1; Hobby plan **50k executions/month**, Pro 1M then $50/1M; concurrency limits Free 5 / Basic 25 / Pro 200+; self-hosting supported (1.0 announcement) | FACT | S1, S20 |
| **Trigger.dev** SDK 4.7.0; self-host via Docker Compose (webapp + worker); cloud supports `region: "eu-central-1"` override on trigger → an EU execution region exists | FACT | S1, S21 |
| Inngest EU region / data residency | UNKNOWN — ⟦AV⟧ a GitHub code search of `inngest/website` for "data residency" / "EU" region finds only blog posts (one says self-hosting "buys you data residency"), no EU-cloud region doc → assume **no EU-hosted Inngest Cloud**; verify at inngest.com/docs or with sales | S63 |

**Recommendation:** **pg-boss** for all MVP background work (bank-sync polling, reconciliation runs, AI categorization batches, email, cron reports): transactional enqueue in the same PG transaction as the domain write, DLQ for poison messages, cron with timezone (`Europe/Rome`). Run workers as a separate `worker` process from the same image. **Runner-up:** **BullMQ 6 on Valkey 9** when you need > ~1k jobs/s, rate-limited groups, or flows; Graphile Worker if you prefer LISTEN/NOTIFY latency and crontab files. ⟦AV⟧ **New option to weigh:** BullMQ 6's PostgreSQL backend gives BullMQ's richer API (flows, groups, schedulers) with *no Redis* — but it is ~2 months old (v6, 2026-07-30) and BullMQ itself calls Redis the battle-tested path, so for MVP it is a HYPOTHESIS, not a recommendation; it does lower the cost of a later pg-boss → BullMQ migration (no new stateful service). **Temporal/Inngest/Trigger.dev**: defer — durable orchestration becomes valuable when sync pipelines have multi-hour waits and human-in-the-loop steps; both SaaS add a vendor on the critical path with user-adjacent data. **Risks:** pg-boss throughput ceiling and table bloat (needs `maintenance` and archive settings); long-running jobs block PG connections (use a dedicated pool). **Revisit condition:** > 500 k jobs/day, or a need for multi-step durable workflows with signals.

### 3.6 Auth

| Claim | Label | Source |
|---|---|---|
| **better-auth 1.7.7** (1.7.0 — 2026-08-18; `@better-auth/expo` 1.7.7 with peers `expo-secure-store >= 12.5`, `expo-web-browser >= 14`, `expo-linking >= 7`, `expo-network >= 8.0.7`, `expo-constants >= 17`; `@better-auth/passkey` 1.7.7 as separate package) | FACT | S1 |
| ⟦AV⟧ **OAuth/OIDC provider:** `@better-auth/oauth-provider` **1.7.7** (npm) turns better-auth into an **OAuth 2.1 authorization server with OIDC** (`authorization_code`/`refresh_token`/`client_credentials`, dynamic client registration, JWKS via the `jwt` plugin, RFC 7662 introspection / RFC 7009 revocation, consent screens) — introduced in 1.5 and documented at `docs/plugins/oauth-provider`; this supersedes the older "oidcProvider" name used in this document's first draft | FACT | S1, S14 |
| Passkey plugin: WebAuthn registration/authentication, **passkey-first onboarding** (`registration.requireSession: false` + `resolveUser`, since 1.6), WebAuthn extensions; Expo client works with `passkeyClient()` + `expoClient({ storage: SecureStore, cookiePrefix })` (challenge cookie name must match prefix) | FACT | S14 |
| Sessions: DB-backed, `session.expiresIn` + `updateAge` (sliding renewal); `revokeSession({ token })`, `revokeOtherSessions()`; `bearer()` plugin for `Authorization` header clients; `twoFactor()` plugin (TOTP/OTP) | FACT | S14 |
| Native social sign-in: `authClient.signIn.social({ provider: "apple" \| "google" \| "facebook", idToken: { token, nonce } })` — documented with `@react-native-google-signin/google-signin` (16.1.5) and Apple ID token; `expo-apple-authentication` 57.0.2 | FACT | S1, S14 |
| better-auth docs mention a "purpose-prefixed verification identifiers / state-cookie" cutover between versions → **minor releases carry migration steps** | FACT | S14 |
| Lucia: npm `deprecated: "This package has been deprecated. Please see https://lucia-auth.com/lucia-v3/migrate"`; last publish 3.2.2 (2024-10-20) | FACT | S1 |
| Clerk: billing by **Monthly Retained Users**, **Free plan 50,000 MRU per application**; Expo SDK with `user.createPasskey()`; hosted auth via `@clerk/expo/hosted-auth` | FACT | S44 |
| Clerk EU data residency — ⟦AV2⟧ **resolved: no EU region.** Clerk offers no regional data residency or region selection; data is hosted on US infrastructure (Google Cloud, Cloudflare; sub-processors in the US) and EU/UK/Swiss personal data is transferred to the US under the EU-US Data Privacy Framework (Clerk DPA / privacy policy, as summarised by several 2026 comparisons). Earlier ⟦AV⟧ negative evidence: GitHub code search of `clerk/clerk-docs` for "data residency" / "European" returns **zero hits**. The 50,000-MRU Free limit *is* in the docs (migrating/overview.mdx) | FACT (medium: secondary sources concordant with Clerk's own DPA — re-read clerk.com/legal/dpa before an ADR) | S63, S44, S76 |
| Supabase: regions include eu-central-1 Frankfurt, eu-central-2 Zurich, eu-west-1/2/3, eu-north-1; Auth hooks on Free/Pro; Supabase itself notes "Europe" general region includes non-EU London/Zurich | FACT | S34 |
| Supabase **Free: 50,000 MAU; Pro: $25/month with 100,000 MAU included, then $0.00325 per MAU** (⟦AV2⟧ FACT — `packages/shared-data/plans.ts` in the Supabase repo, S77); Auth0 Free 25k MAU with EU region; Ory Network EU region; Keycloak 26.x | FACT for Supabase (S77) / ASSUMPTION (medium) for Auth0, Ory, Keycloak — verify on vendor pricing pages | S57, S77 |
| Neon "Managed Better Auth": Free up to 60k MAU, Launch/Scale up to 1M MAU | FACT | S33 |

**Design notes for Lilleri.** Mobile uses better-auth's Expo plugin (session token in SecureStore, cookie-cache off for immediate revocation), passkeys as the primary credential with email OTP fallback; Sign in with Apple/Google via native id-token flow (no browser round-trip); **step-up**: `twoFactor` + `expo-local-authentication` app lock. "Refresh-token rotation" in the OAuth sense is not the model — better-auth uses server-side sessions with sliding expiry; revocation is immediate and global (`revokeOtherSessions`), which is simpler and safer for a finance app. If Lilleri later needs to *be* an OAuth/OIDC provider (B2B, open-banking partner), better-auth ships **`@better-auth/oauth-provider`** (OAuth 2.1 + OIDC authorization server) together with the `jwt` plugin — ⟦AV⟧ FACT (S1, S14), corrected from the earlier unverified "oidcProvider" reference.

**Recommendation:** **better-auth** inside the Fastify API with the Drizzle adapter, passkey + Expo + twoFactor + bearer plugins. **Runner-up:** **Ory Kratos** (self-hosted in the same Hetzner project, or Ory Network EU) when a formally audited IdP is required. **Risks:** better-auth is a fast-moving 1.x with breaking cutovers in minors (pin and read release notes); no third-party security audit found today (UNKNOWN — verify on better-auth.com/security). **Revisit condition:** licensing as AISP/PISP or a partner demanding certified IAM; or team wants zero auth code (→ Clerk, accepting US residency — ⟦AV2⟧ Clerk has no EU region, S76).

### 3.7 Billing

| Claim | Label | Source |
|---|---|---|
| RevenueCat: **free under $2,500 MTR; above that Pro bills 1 % of *total* MTR (not of the excess), on gross pre-store-commission revenue** (⟦AV2⟧ concordant 2026 pricing write-ups, S82 — ≈ 1.4 % of net proceeds after the store cut); MTR includes all purchases/renewals; `react-native-purchases` **10.11.0** (10.0 — 2026-04-15); `@revenuecat/purchases-js` 1.67 (web billing) | FACT | S1, S41 |
| Stripe Node **23.0.0** (2026-10-01); `@stripe/stripe-react-native` 0.80.0; Stripe Tax "charges for calculating tax on live transactions where you are registered… subscription, pay-as-you-go, and custom plans"; registrations via Stripe only in "Tax Complete" | FACT (qualitative) | S1, S42 |
| Stripe Tax fee (≈ 0.5 % per transaction pay-as-you-go; lower on Tax Complete) | ASSUMPTION (medium) — verify at stripe.com/tax/pricing | S57 |
| Paddle: merchant of record for digital goods, sellers in 200+ countries; `@paddle/paddle-node-sdk` 3.10, `@paddle/paddle-js` 1.6.5 | FACT | S1, S43 |
| Paddle fee (≈ 5 % + $0.50 per checkout); Lemon Squeezy (acquired by Stripe 2024; `@lemonsqueezy/lemonsqueezy.js` last publish 2024-11-05 → stagnant) | ASSUMPTION (medium) / FACT for npm date | S1, S57 |
| Store policies: Apple requires IAP for digital subscriptions bought in-app (Guideline 3.1.1); apps may let users access subscriptions bought elsewhere (3.1.3(b) multiplatform) but must not steer to external purchase in the US store except under specific entitlements; in the **EU under the DMA Apple's alternative terms permit link-outs/alternative payments with specific fees**; Google Play EEA "User Choice Billing"/external offers with reduced service fee | ASSUMPTION (medium; policy text and EU fee schedules changed repeatedly 2024-2026) — verify App Review Guidelines §3.1 and Apple "Alternative terms addendum for apps in the EU"; Google "EEA program" pages | S56, S57 |
| Italian VAT on digital subscriptions is 22 %; EU OSS scheme allows single VAT return for B2C digital services across EU | ASSUMPTION (high confidence, legal) | S57 |

**Recommendation:** **RevenueCat + StoreKit/Play Billing as the primary channel** (IAP is mandatory for in-app digital subscriptions; Apple/Google remit VAT as the seller), **Stripe + Stripe Tax for web** sign-ups (OSS registration in Italy), entitlements unified in RevenueCat (its Stripe integration can ingest web subscriptions — ASSUMPTION, verify). **Runner-up:** **Paddle** as MoR if you want to avoid VAT/OSS filings entirely for web (cost ≈ 5 %+). **Risks:** store fee 15 % (Small Business Program ≤ $1M) vs 30 %; EU DMA terms are in flux — do not design pricing pages around link-outs yet. **Revisit condition:** web becomes > 30 % of sign-ups, or EU alternative-terms fees settle.

### 3.8 i18n

| Claim | Label | Source |
|---|---|---|
| i18next **26.4.2** (26.0 — 2026-03-28), react-i18next **17.0.15**, `i18next-icu` 2.4.4 (ICU MessageFormat), `next-intl` 4.14.8, `expo-localization` 57.0.2 | FACT | S1 |
| Lingui **6.9.0** (6.0 — 2026-04-22): **ESM-only, Node ≥ 22.19**, macros from `@lingui/core/macro` + `@lingui/react/macro`, Babel or SWC plugin, PO catalogs, `@lingui/metro-transformer` for RN, `setI18n` for RSC; tutorial assumes RN ≥ 0.76 / Expo ≥ 52 with Hermes and says to polyfill missing `Intl` APIs | FACT | S1, S45 |
| FormatJS: `react-intl` 12.1.3, `@formatjs/intl-numberformat` 9.4.3, `@formatjs/intl-pluralrules` 6.3.15 | FACT | S1 |
| Hermes `Intl`: `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.Collator` implemented using platform ICU (iOS/Android), `formatToParts` for NumberFormat Android-only, several options unsupported per platform; polyfill where needed | FACT | S47 |
| `Intl.PluralRules` in Hermes: ⟦AV⟧ Hermes' `IntlAPIs.md` lists **only** `Intl.Collator`, `Intl.NumberFormat`, `Intl.DateTimeFormat` and `Intl.getCanonicalLocales` as implemented (plus `formatToParts` for NumberFormat on Android only) — **`Intl.PluralRules`, `Intl.RelativeTimeFormat`, `Intl.ListFormat` are not listed** → assume missing and ship `@formatjs/intl-pluralrules` (+ locale data for `it`) from day one, since i18next-icu plural selection depends on it | FACT (by omission in the Hermes doc) — still confirm on a device | S47 |

**Recommendation:** **i18next + react-i18next + i18next-icu** shared catalogs (`packages/i18n`, JSON, ICU plurals/selects for Italian "1 transazione / 2 transazioni"); in Next use the same i18next instance (or `next-intl` if you prefer RSC-native helpers); currency via `Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })` → `1.234,56 €`, dates via `Intl.DateTimeFormat`. **Runner-up:** **Lingui 6** (best extraction/macro DX and tiny runtime; costs a Metro transformer + SWC plugin and ESM-only constraints). **Risks:** Hermes Intl gaps (⟦AV⟧ `PluralRules` is not implemented per the Hermes doc and `NumberFormat.formatToParts` is Android-only — add the FormatJS polyfills in the app entry before i18next initialises). **Revisit condition:** > 3 locales with professional translators (PO workflow favours Lingui).

### 3.9 Monorepo tooling, lint/format, TypeScript, tests, release

| Claim | Label | Source |
|---|---|---|
| pnpm **12.8.1** (12.0 — 2026-08-26); Turborepo **2.11.6**; Nx **23.2.1** (`@nx/expo`, `@nx/next` 23.2.1); moonrepo **2.5.6** | FACT | S1 |
| Biome **2.5.15** (2.0 "Biotype" — 2025-06-17; 2.5.0 — 2026-06-12): first type-aware rules without `tsc` (`noFloatingPromises` in nursery; limitations: no complex types/inference, same-file only at 2.0, improving with multi-file analysis), GritQL plugins, **domains** (React, Next.js, test frameworks auto-enabled from package.json), monorepo `ProjectLayout`, HTML/Vue/Svelte/Astro "experimental full support" flag | FACT | S1, S22 |
| ESLint **10.11.0** (10.0 — 2026-02-06); Prettier 3.9.9; `eslint-config-expo` 57.0.2; `eslint-plugin-react-hooks` 7.1.1; typescript-eslint 8.71 (TS < 6.1) | FACT | S1 |
| oxlint **1.86.0** (1.0 — 2025-06-10; ⟦AV⟧ peer `oxlint-tsgolint >= 7.0.2003` — its type-aware rules run on the native TS-Go toolchain, i.e. the oxlint path is TS 7-native); oxfmt **0.71.0** (pre-1.0); NestJS 12 defaults new projects to oxlint | FACT | S1, S23 |
| Vitest **5.0.3** (5.0 — 2026-09-03): Node `^22.12 \|\| ^24 \|\| >=26`, Vite ≥ 6.4; browser providers are separate packages (`@vitest/browser-playwright`); coverage threshold/include semantics changed | FACT | S1, S46 |
| Playwright **1.63.0** (2026-09-04); `jest-expo` 57.0.5; `@testing-library/react-native` 14.0.1; Jest 30.5.2; Detox 20.51.4 | FACT | S1 |
| Maestro **2.11.0** (gradle `VERSION_NAME`, CHANGELOG) | FACT | S50 |
| Changesets **3.0.3** (3.0 — 2026-08-11); `knip` 6.39; `syncpack` 15.3; `sherif` 1.13 | FACT | S1 |

**Lint/format decision.** Biome gives one fast tool for TS/TSX/JSON/CSS across API, web and RN with no dependency on the TypeScript compiler (so it is indifferent to TS 6 vs 7). What you lose vs ESLint: `eslint-plugin-react-native`-style rules, `eslint-config-expo` defaults, and full type-aware rules (`noFloatingPromises` is still partial — important for an async-heavy API; compensate with `@typescript-eslint/no-floating-promises` **only if** you keep TS ≤ 6.0 and ESLint, or with runtime guards + Vitest). Expo and RN are plain TSX for Biome; `biome.json` domains enable React rules.

**Recommendation:** **pnpm workspaces + Turborepo** (remote cache can be self-hosted — avoids Vercel) ; **Biome** for format+lint (optionally a tiny ESLint config only for `react-hooks` v7 React-Compiler rules, if Biome's `useExhaustiveDependencies` proves insufficient); **TypeScript 6.0.3 workspace + TS 7 for `typecheck`** (see §1); **Vitest 5** for API/packages/web unit+integration (PGlite), **jest-expo** for RN components (Expo's supported runner), **Playwright** for web E2E, **Maestro** YAML flows for mobile E2E (runs in EAS Workflows or GitHub Actions emulators), **Changesets** for internal package versioning/changelogs. **Runner-up:** Nx (if you want generators/graph tooling and `@nx/expo`), oxlint+oxfmt (once oxfmt reaches 1.0). **Risks:** Biome's partial type-awareness; Expo tooling (`expo lint`) assumes ESLint — keep `eslint-config-expo` out or run both in CI only. **Revisit condition:** typescript-eslint ships TS 7 support, or Biome reaches full cross-file type inference → simplify to one tool.

### 3.10 Observability, analytics, feature flags

| Claim | Label | Source |
|---|---|---|
| OpenTelemetry JS: **Tracing Stable, Metrics Stable, Logs "Development"** (API and SDK); `@opentelemetry/api` 1.9.1, `@opentelemetry/sdk-node` 0.222.0 (experimental packages share 0.x versioning), `@opentelemetry/instrumentation-pino` 0.68, `@opentelemetry/instrumentation-fastify` 0.57, `@fastify/otel` 0.21.1 | FACT | S1, S29 |
| Pino **10.3.1** (10.0 — 2025-10-03); `pino-opentelemetry-transport` 4.0.2; `@logtail/pino` 0.5.11 (Better Stack); `@axiomhq/pino` 2.0 | FACT | S1 |
| Sentry: **data storage location selectable US or EU (Frankfurt) at organization creation, cannot be changed later**; events/transactions/spans/profiles/logs/replays stored in the selected region; user accounts, integration metadata, tokens, org settings, audit logs, cron check-ins stay in the US; `@sentry/node` 11.2.0, `@sentry/nextjs` 11.2.0, `@sentry/react-native` 8.29 (but SDK 57 bundles ~7.11). ⟦AV2⟧ `data-storage-location/index.mdx` re-read on 2026-10-02 (S30): EU = Frankfurt, Germany; "User accounts, notification settings, and 2FA authenticators" and "Cron check-ins" are in the "may be stored in the US regardless of your selected Data Storage Location" list; uptime-check data may be stored outside the region; use the region-specific API domain. Sentry's help centre (via search, S83) adds that the EU region is available on **all plans including the free Developer plan at no extra cost** | FACT | S1, S30, S83 |
| Sentry pricing (Developer free 5k errors; Team from ~$26/mo) | ASSUMPTION (medium) — verify at sentry.io/pricing | S57 |
| PostHog: **EU Cloud** (`eu.posthog.com`, `ui_host`/`api_host`), free tier **1M events, 5,000 web + 2,500 mobile session replays, 1M feature-flag requests, 1,500 survey responses per month** (⟦AV⟧ re-confirmed on posthog.com compare pages; also 100k error-tracking exceptions free; overage from $0.00005/event, ~$0.005/replay, $0.0001/flag request); RN SDK `posthog-react-native` 4.78.4 with `enableSessionReplay` (default **false**, must also be enabled in project settings), `sessionReplayConfig`, `before_send` filtering, `@posthog/react-native-plugin` 2.12; `posthog-node` 5.55 | FACT | S1, S31, S70 |
| OpenFeature `@openfeature/server-sdk` 1.23.0, `@openfeature/react-sdk` 1.4.1, `@openfeature/web-sdk` 1.10, `@openfeature/flagd-provider` 0.16.1; Unleash server 8.2.0 (self-host), `flagsmith-nodejs` 8.1.2 | FACT | S1 |
| Grafana Cloud free tier (10k series / 50 GB logs / 50 GB traces) with EU regions; Better Stack EU data residency; Grafana Faro RN SDK 1.4.1 | ASSUMPTION (medium) / FACT for npm version | S1, S57 |

**Recommendation:** OTel SDK in the API/worker (auto-instrumentation for Fastify, pg, pino; OTLP/HTTP exporter) → **Grafana Cloud (EU) or self-hosted Grafana+Tempo+Loki on Hetzner** for traces/logs/metrics; **Sentry EU** for errors + mobile crash reporting (use the Expo-bundled SDK version); **PostHog EU** for product analytics + feature flags (via OpenFeature provider so you can swap to Unleash/flagd later), **session replay off by default** for a finance app; if ever enabled, mask all text/images and exclude account/transaction screens. **Runner-up:** Better Stack (logs+uptime, EU) if you want one hosted bill. **Risks:** OTel Logs still "Development" (keep Pino as the log pipeline and correlate by trace id); Sentry metadata residency in the US (acceptable: no user data). **Revisit condition:** OTel Logs SDK reaches Stable → send logs via OTLP too.

### 3.11 Deployment and managed Postgres

| Claim | Label | Source |
|---|---|---|
| Hetzner Cloud locations fsn1 (Falkenstein, DE), nbg1 (Nuremberg, DE), hel1 (Helsinki, FI); server types **cx23/cx33/cx43/cx53** (cost-optimized), cpx12–cpx62, cax11–cax41 (Arm64); pricing API returns EUR net/gross with VAT, included traffic and per-TB overage; backups add 20 % of server price | FACT (catalogue) | S35 |
| Hetzner monthly prices — ⟦AV2⟧ **corrected (secondary sources).** The first draft's ≈ €3.5–4 (2 vCPU/4 GB) and ≈ €6.5–7 (4/8) are **stale**: several concordant 2026 write-ups (Northflank, Better Stack, Bitdoze, Comparedge, Cloudhim — S75) report **two Hetzner Cloud price increases in 2026 (April and June)** with **CX23 ≈ €5.99/month** (2 vCPU/4 GB/40 GB NVMe) and **CX33 ≈ €8.99/month** (4 vCPU/8 GB/80 GB), and at least one (Bitdoze, early Sept 2026) reports the **CX shared-vCPU line as "not available" to order, with CPX12 ≈ €11.99/month the cheapest orderable plan**. Hetzner's own changelog (S35, via Context7) confirms the cx23/cx33/cx43/cx53 + cpx12–cpx62 catalogue and that the cx22-line could no longer be ordered from 2026-01-01, but publishes no prices. The older figures (CCX13 ≈ €12–13, LB11 ≈ €5.4, volumes ≈ €0.05/GB, Object Storage ≈ €5/TB) are probably also higher now | ASSUMPTION (medium: multiple concordant secondary sources, no primary price read — hetzner.com is blocked from this sandbox) — verify at hetzner.com/cloud or `GET https://api.hetzner.cloud/v1/pricing` | S57, S35, S75 |
| Coolify **4.4.0** (nightly 4.5-rc.1): minimum 2 cores / 2 GB / 10 GB; scheduled, engine-aware **Postgres backups to S3-compatible storage**; "a backup is not a restore test"; Dokploy **v0.30.6** | FACT | S36, S37 |
| Fly.io EU regions: **ams, arn (Stockholm), cdg (Paris), fra, lhr**; `fra`/`ams`/`lhr` can host Managed Postgres (⟦AV⟧ re-confirmed from `reference/regions`: MPG column ✓ only for ams, fra, lhr among EU regions); **no Milan region** | FACT | S32, S72 |
| Neon regions: aws-eu-central-1 (Frankfurt), aws-eu-west-2 (London) (+ US/APAC/SA); Azure regions being deprecated; pricing: Free 100 projects, 100 CU-h/project, **1 GB/project (20 GB account total)** (⟦AV⟧ **corrected** from "0.5 GB"; ⟦AV2⟧ re-read `plans.md` on 2026-10-02 — "1 GB of Postgres storage per project, up to 20 GB across all projects", 5 GB egress/project, 5 GB object storage — note that several third-party pricing aggregators still quote 0.5 GB and are stale), 6 h history window; **Launch $0.106/CU-hour + $0.35/GB-month**, up to 7-day history, 500 GB egress included; Scale $0.222/CU-hour, 30-day history, SOC 2, private networking, SLA; extra branches $1.50/branch-month; no minimum monthly fee on Launch/Scale | FACT | S33, S67 |
| Supabase EU regions: eu-central-1 (Frankfurt), eu-central-2 (Zurich, non-EU), eu-west-1 (Ireland), eu-west-2 (London, non-EU), eu-west-3 (Paris), eu-north-1 (Stockholm) — ⟦AV⟧ re-confirmed from `packages/shared-data/regions.ts`; the "Europe" *general* region resolves to Frankfurt by default but may land in London/Zurich | FACT | S34, S73 |
| Scaleway Managed PostgreSQL: node types e.g. `db-dev-s`, HA option (99.95 % SLO) vs standalone (99.5 %), regions fr-par / nl-ams / pl-waw | FACT (no prices) | S55 |
| AWS eu-south-1 (Milan) and eu-central-1 (Frankfurt) exist; RDS db.t4g.micro ≈ $12–15/mo + storage; Fargate ≈ $30+/mo for 0.5 vCPU/1 GB always-on | FACT (regions, well known) / ASSUMPTION (prices) | S57 |
| Railway (EU West — Amsterdam), Render (Frankfurt), OVHcloud (FR/DE/PL regions; Milan availability UNKNOWN), Crunchy Bridge (EU regions on AWS/Azure/GCP, from ≈ $35/mo) | ASSUMPTION (medium) — verify on each provider's regions page | S57 |
| Vercel/Fly/Neon/Supabase/Railway/Render/AWS are US companies (CLOUD Act exposure even with EU regions); Hetzner (DE), Scaleway (FR), OVHcloud (FR) are EU-owned | FACT (corporate domicile) | S57 |
| **DORA** (Reg. (EU) 2022/2554, applicable from 2025-01-17) binds *financial entities* and their critical ICT providers; a PFM app that is not itself licensed (uses a licensed AISP aggregator) is not a financial entity, but partners may flow down requirements; GDPR Art. 44+ transfers are the practical constraint | FACT (legal scope) — confirm with counsel | S57 |

**Cost at MVP (HYPOTHESIS, ±30 %; ⟦AV2⟧ revised for the 2026 Hetzner price increases, S75).**

| Path | Components | €/month |
|---|---|---|
| Hetzner + Coolify | 1× cx33 app+worker (≈ €9), 1× cx33/ccx13 Postgres (€9–15), LB11 (€5–7), volumes 40 GB (€2–3), Object Storage backups (€5–6), snapshots (20 %) | **≈ €40–60** (⟦AV2⟧ was €30–45); **≈ €55–85 if only CPX plans are orderable** (cpx22-class ≈ €15–20 each — unverified) |
| Hetzner app + Neon Launch PG | cx33 (≈ €9) + Neon ~100–300 CU-h + 5 GB (≈ $15–40) + LB | ≈ €40–65 (⟦AV2⟧ was €35–60) |
| Fly.io (fra) + Neon | 2 shared-1x machines (≈ $10–15) + Neon (≈ $15–40) + egress | ≈ €40–80 |
| AWS eu-south-1 | Fargate 2 tasks (≈ $60) + RDS t4g.small Multi-AZ (≈ $60) + ALB ($20) + backups | ≈ €150–300 |

**Recommendation:** **Hetzner fsn1 (or hel1) + Coolify** running Docker images built in GitHub Actions: `api`, `worker`, `web` (Next standalone), **Postgres 18 in Docker on a dedicated server with a volume**, **pgBackRest (or WAL-G) to Hetzner Object Storage for PITR** in addition to Coolify's scheduled dumps, Valkey only if/when BullMQ is adopted. Use Hetzner Firewalls + private network; Cloudflare in front is optional (US company; proxying terminates TLS outside EU control — decide consciously). **Runner-up:** **Fly.io fra + Neon eu-central-1** (fully managed, scale-to-zero, branching for preview DBs) if you prefer not to operate Postgres; or **AWS eu-south-1** only if a partner mandates AWS. **Risks:** self-managed Postgres = you own backups/upgrades (restore drills quarterly); single-region. **Revisit condition:** > 10k MAU or SOC 2/ISO audit scope → managed PG with SLA (Neon Scale, Crunchy Bridge, RDS Multi-AZ) and multi-node app tier.

### 3.12 Security tooling (SAST/SCA/secrets/SBOM/DAST)

| Claim | Label | Source |
|---|---|---|
| Semgrep CE 1.178.0 (2026-09-23), engine licensed **LGPL-2.1** (⟦AV2⟧ `LICENSE` in semgrep/semgrep re-read 2026-10-02); **AppSec Platform free for ≤ 10 contributors and 10 private repos, then from $30/contributor/month** (⟦AV2⟧ `usage-and-billing/overview.mdx` re-read: "free for organizations with **10 or fewer** monthly contributors"; a contributor = ≥ 1 commit to a scanned *private* repo in a rolling 90-day window, bots excluded, limit shared across all of a company's Semgrep orgs); Pro rules are cross-file; Supply Chain + Secrets in platform. ⟦AV⟧ Re-confirmed: `usage-and-billing/overview.mdx` — "Semgrep Code and Semgrep Supply Chain are free for organizations with **10 or fewer** monthly contributors"; the "$30 per contributor per month" figure appears in the Opengrep comparison snippet | FACT | S39, S51, S64 |
| GitHub: a subset of Advanced Security features is **free for public repos**; private repos need **GitHub Code Security / Secret Protection licences billed per unique active committer (90-day window)**; bots ignored | FACT | S38 |
| Code Security **$30** and Secret Protection **$19** per active committer/month (unbundled from GitHub Advanced Security in April 2025) — ⟦AV2⟧ confirmed by several concordant 2026 pricing write-ups that cite github.com/security/plans (eesel, toolradar, checkthat, cloudeagle — S78); the `github/docs` billing pages themselves still omit prices (⟦AV⟧ S63) | FACT (medium: concordant secondary sources; the GitHub plans page itself was not fetched) | S57, S63, S78 |
| Snyk Free: test limits apply to private repos across OSS/Code/Container/IaC; Team/Enterprise limits only on Code/Open Source | FACT (qualitative; numbers not in docs) | S40 |
| Trivy, Gitleaks, TruffleHog, Syft, OWASP ZAP: free/OSS; current versions not verified today | UNKNOWN (versions) — ⟦AV⟧ still blocked: `api.github.com` and `github.com/*/releases.atom` are unreachable and the GitHub MCP is scoped to this project's repo; none of these projects publish a version file on raw.githubusercontent.com. `gh release view` once GitHub access is enabled | — |
| Renovate (free, Mend) vs Dependabot (free on GitHub) | ASSUMPTION (high confidence) | S57 |

**Recommendation (all free for a private repo):** Semgrep CE with `p/typescript`, `p/react`, `p/nodejs`, `p/secrets` + custom rules (e.g. forbid `float` amounts), **Gitleaks** pre-commit + CI (TruffleHog weekly with verification), **Trivy** for image/IaC/SBOM (`trivy image --format cyclonedx`) or **Syft** → CycloneDX attached to releases, **Renovate** with grouped Expo/RN updates and `pnpm` lockfile maintenance, **OWASP ZAP baseline** nightly against staging, `npm audit`/`pnpm audit` gate, Biome security rules. **CodeQL** only if you buy Code Security (3 committers ≈ $90/mo at $30/committer — ⟦AV2⟧ S78) or the repo goes public. **Runner-up:** Snyk Free (friendlier triage UI). **Revisit condition:** external security audit or partner questionnaire demanding commercial SAST/SCA.

### 3.13 Mobile security

| Claim | Label | Source |
|---|---|---|
| `react-native-ssl-public-key-pinning` 1.2.6 (2025-07-05): JS-configured SPKI pinning for all fetch/XHR, Expo managed workflow supported (dev client; disable dev-client network inspector on iOS to test); `react-native-ssl-pinning` 1.6.0 (2025-07) | FACT | S1, S54 |
| Compatibility of these pinning libs with RN 0.86 / New Arch | UNKNOWN — smoke-test in the vertical slice; both last published July 2025 | — |
| Platform-native pinning: iOS `NSPinnedDomains` (Info.plist, iOS 14+) settable from `app.json` `ios.infoPlist`; Android Network Security Config `<pin-set>` (needs a small config plugin to add `res/xml/network_security_config.xml`) | ASSUMPTION (high confidence; Apple/Android docs not re-read today) | S57 |
| `jail-monkey` 3.0.0 (2026-04-28) with New Architecture support; `expo-device` 57 (`isRootedExperimentalAsync`) | FACT | S1, S54 |
| `expo-secure-store` 57 (see §3.1) + `requireAuthentication`; `react-native-keychain` 10.0.0 (2025-03); `react-native-mmkv` 4.3.2 (fast, encryptable KV — not a keychain) | FACT | S1, S10 |
| `expo-local-authentication` 57.0.3 (biometric prompt; no biometric *data* access) | FACT | S10 |
| `expo-screen-capture` 57.0.3: `usePreventScreenCapture()`, screenshot callbacks; Android 14+ needs no permission for blocking/callback; iOS prevention supported; `react-native-screenshot-prevent` 1.2.2 alternative | FACT | S1, S10 |
| Play Integrity / App Attest from Expo | UNKNOWN — evaluate `expo-app-integrity`/community modules; not verified today | — |

**Recommendation:** (1) **TLS pinning with backup pins and an expiry runbook** — prefer platform mechanisms (NSPinnedDomains + Android NSC via config plugin) to avoid a 2025-era native dependency; pin intermediate CA SPKI, keep a 2-pin rotation, and ship pins via OTA-able config *only* as a kill switch. (2) **Secrets** in `expo-secure-store` with `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY` and `requireAuthentication` for the session token; never in MMKV/AsyncStorage. (3) **App lock** via `expo-local-authentication` with device passcode fallback, auto-lock on background + privacy overlay in the app switcher (AppState-driven). (4) **Screenshot prevention** on balances/transactions screens (`usePreventScreenCapture`). (5) **Root/jailbreak signal** via `jail-monkey` as a risk score (not a hard block) feeding server-side step-up. (6) **OTA integrity**: EAS Update code signing (Production plan) or self-hosted signed updates. (7) Later: Play Integrity + App Attest for high-risk actions. **Risks:** pinning outages on cert rotation (mitigate with backup pins, staged rollout, remote kill switch); `requireAuthentication` invalidation when biometrics change (handle re-login gracefully). **Revisit condition:** PSD2/AISP licensing or partner security review requiring RASP (e.g. Promon/Appdome — commercial).

### 3.14 Design tokens and shared RN + web design system

| Claim | Label | Source |
|---|---|---|
| Style Dictionary **5.5.5** (5.0 — 2025-05-16; DTCG format support); `@tokens-studio/sd-transforms` 2.0.3 (2025-12); Terrazzo `@terrazzo/cli` 2.7.1 (2.0 — 2026-03-17) | FACT | S1 |
| Tailwind CSS **4.3.3**; NativeWind `latest` **4.2.7** (peer `tailwindcss > 3.3`), **NativeWind 5.0.0-rc.0** (2026-09-13; peers `tailwindcss > 4.1.11`, `react-native-css 3.1.0-rc.0`); v5 requires **Tailwind v4.1+ and RN 0.81+**, new CSS `@import "nativewind/theme"`, `VariableContextProvider` replaces `vars()` | FACT | S1, S25 |
| Unistyles **3.4.0** (3.0 — 2025-07-07): React 19 + **New Architecture mandatory**, `react-native-nitro-modules`, `react-native-edge-to-edge` (optional since 3.1), **no Expo Go** (prebuild/dev client), Expo Router guide, first-class RN Web and Next.js SSR (Babel only, SWC must be disabled) | FACT | S1, S26 |
| Tamagui **2.7.7** (2.0 — 2026-05-23): compiler extracts atomic CSS, works with standard Expo Metro config; Next.js needs `transpilePackages` + Turbopack `resolveAlias` for RN → RN Web | FACT | S1, S27 |
| react-native-reusables CLI 0.7.1 (2026-03); `@rn-primitives/*` 1.5.2 (2026-07); gluestack-ui v3 core 5.0.15 (NativeWind-based) | FACT | S1 |

**Recommendation:** **Tokens:** Figma Tokens Studio → DTCG JSON in `packages/tokens` → **Style Dictionary 5** builds (a) Tailwind 4 `@theme` CSS variables for Next + NativeWind, (b) a typed TS theme object for charts/Skia, (c) iOS/Android native colours for splash/widgets. **Styling/components:** **NativeWind 5 (RC) + react-native-reusables/rn-primitives** so RN and Next share Tailwind 4 utilities and the same token variables; adopt the RC now only because GA is expected soon and the vertical slice is small — **fallback to NativeWind 4.2 (Tailwind 3 on mobile, Tailwind 4 on web with tokens still shared)** if the RC blocks. **Runner-up:** **Unistyles 3** (fastest, typed themes/breakpoints, no Tailwind mental model, excellent Expo Router/SSR support). **Tamagui** is powerful but a heavier, more opinionated dependency for a 1–3 person team. **Risks:** NativeWind 5 RC churn; Tailwind-on-native edge cases (shadows, fonts). **Revisit condition:** NativeWind 5 GA not shipped by the end of the vertical slice → switch to Unistyles 3; or web app stays admin-only → Unistyles + plain Tailwind on web.

### 3.15 Charts in React Native

| Claim | Label | Source |
|---|---|---|
| Victory Native XL **42.0.1** (42.0 — 2026-08-25): peers `@shopify/react-native-skia >= 2.6 < 3`, `react-native-reanimated >= 3.19.1`, `react-native-gesture-handler >= 2`; built on D3 + Skia + Reanimated, "100+ FPS on low-end devices"; Expo SDK 57 bundles Skia **2.6.2** and Reanimated **4.5.1** (satisfies peers) | FACT | S1, S9, S28 |
| `@shopify/react-native-skia` **2.14.0** (2.0 — 2025-05-09; peers RN ≥ 0.78, React ≥ 19, Reanimated ≥ 4, worklets ≥ 0.7) | FACT | S1 |
| `react-native-gifted-charts` 1.4.80 (SVG-based; peers `react-native-svg`, linear-gradient) | FACT | S1 |

**Recommendation:** **Victory Native XL** for spending trends, cash-flow bars, category donuts (Skia-rendered, gesture/pan/zoom, theme from tokens) — and keep to the SDK-bundled Skia version. **Runner-up:** gifted-charts for quick simple charts (SVG, lighter setup, weaker interaction/perf). Use the project `dataviz` guidance for palettes/accessibility. **Risks:** Skia major bumps lag Expo SDKs; Victory XL API churn between majors (41 → 42 in 2026). **Revisit condition:** web parity needed → consider a shared D3 data layer with Recharts/visx on web.

### 3.16 OCR in-app (receipts, paper statements)

| Claim | Label | Source |
|---|---|---|
| `@infinitered/react-native-mlkit-text-recognition` **5.0.1** (2025-11-25, Expo-modules based); `@react-native-ml-kit/text-recognition` **2.0.0** (2025-09-01); `react-native-vision-camera` 5.2.3 + `react-native-vision-camera-text-recognition` 3.1.1 (live OCR frame processor); `react-native-document-scanner-plugin` 2.0.4 (ML Kit document scanner / VisionKit); `expo-text-extractor` 2.0.0; `tesseract.js` 7 (web); `react-native-mlkit-ocr` stale (2023) | FACT | S1 |
| Cloud: `@mistralai/mistralai` 2.7.0 (Mistral OCR, EU company); `@google-cloud/documentai` 10.1.1 (EU endpoint `eu-documentai.googleapis.com`); `@azure-rest/ai-document-intelligence` 1.1.0; `@aws-sdk/client-textract` 3.1145 (eu-central-1; eu-south-1 availability UNKNOWN) | FACT (SDK versions) / ASSUMPTION (regional endpoints) | S1, S57 |
| Accuracy of on-device ML Kit on Italian thermal receipts ("scontrino") and structured field extraction | UNKNOWN — benchmark 50 real receipts in the vertical slice | — |

**Recommendation:** **On-device ML Kit** (Infinite Red module for Expo ergonomics, or the `@react-native-ml-kit` one) for raw text + `react-native-document-scanner-plugin` for capture/cropping; send **text (not images)** to the API where the **AI provider abstraction** (LLM structured extraction with Zod schema: merchant, date, total, VAT, line items) normalizes it; **Mistral OCR** (EU) as the cloud fallback for low-quality scans, Google Document AI EU as runner-up. **Risks:** PII in images (keep on device; if uploading, strip EXIF, short retention); ML Kit model size (~Latin script bundle); Italian receipt layouts vary. **Revisit condition:** receipt volume > 1k/day or accuracy < 90 % on totals → dedicated receipt model (Document AI Expense parser / Mindee — not evaluated).

---

## 4. Evidence — versions verified via `npm view` (registry.npmjs.org, 2026-10-02)

Date = publish date of that version per `npm view <pkg> time`.

| Package | Latest | Published | Notes / dist-tags |
|---|---|---|---|
| expo | 57.0.26 | 2026-09-29 | `next` 58.0.2; `sdk-56` 56.0.23; `sdk-55` 55.0.31; `sdk-54` 54.0.37 |
| react-native | 0.87.1 | 2026-08-26 | `next` 0.88.0-rc.3; Expo 57 bundles 0.86.3 |
| expo-router / expo-updates / expo-secure-store / expo-local-authentication / expo-screen-capture / expo-device / @expo/ui | 57.0.24 / 57.0.24 / 57.0.4 / 57.0.3 / 57.0.3 / 57.0.2 / 57.0.21 | Sept 2026 | |
| react-native-passkeys | 0.4.2 | 2026-08-05 | peer expo ≥ 53 |
| eas-cli | 24.8.0 | — | |
| react / react-dom | 19.3.0 | 2026-09-09 | |
| next | 16.3.8 | 2026-09-30 | `canary` 16.4.0-canary.57; node ≥ 20.9 |
| astro | 7.3.5 | 2026-09-24 | `beta` 7.4.0-beta.0; node ≥ 22.12 |
| vite | 8.3.2 | 2026-10-01 | |
| fastify | 5.12.5 | 2026-09-16 | ⟦AV⟧ `next` 6.0.0-alpha.4 (2026-09-16) |
| fastify-type-provider-zod | 7.0.0 | 2026-06-24 | zod ≥ 4.1.5 |
| @fastify/swagger / helmet / rate-limit / under-pressure / otel | 9.9.1 / 13.1.1 / 11.2.0 / 9.2.0 / 0.21.1 | 2026 | |
| hono / @hono/node-server / @hono/zod-openapi / @hono/otel | 4.13.12 / 2.1.3 / 1.6.3 / 1.2.0 | Sept 2026 | |
| @nestjs/core / cli / swagger / platform-fastify | 12.1.2 / 12.0.8 / 12.0.2 / 12.1.2 | Sept 2026 | cli depends on typescript ~6.0.2 |
| @trpc/server / @orpc/server / @orpc/openapi | 11.19.0 / 1.15.4 / 1.15.4 | Sept 2026 | |
| zod | 4.6.5 | 2026-09-13 | |
| drizzle-orm / drizzle-kit | 0.45.3 / 0.31.11 | 2026-09-21 | `rc` 1.0.0-rc.4 (2026-06-27); ⟦AV⟧ no plain rc.5 — only `1.0.0-rc.5-<sha>` snapshots (`rc5` tag, 2026-09-09); `beta` 1.0.0-beta.22 |
| prisma / @prisma/client | 8.0.0-rc.19 / 7.10.0 | 2026-09-29 / 2026-08-25 | `prev` 7.10.0; node ≥ 22.18 |
| kysely / kysely-codegen | 0.29.6 / 0.20.0 | 2026-09-16 / 2026-02-16 | |
| @electric-sql/pglite | 0.5.8 | 2026-08-26 | |
| pg / postgres | 8.23.1 / 3.4.9 | 2026-09-30 / 2026-04-05 | |
| pg-boss | 12.35.1 | 2026-09-30 | node ≥ 22.12, PG ≥ 13 |
| bullmq / ioredis | 6.3.11 / 6.0.0 | 2026-10-01 / 2026-07-31 | 6.0 on 2026-07-30; ⟦AV⟧ peers `ioredis >= 5`, `redis >= 5`, **`pg >= 8` (optional PostgreSQL backend)**, `bullmq-otel >= 2` |
| graphile-worker | 0.18.0 | 2026-09-08 | node ≥ 22.18 |
| @temporalio/client|worker|testing | 1.24.0 | 2026-09-15 | |
| inngest / @trigger.dev/sdk | 4.21.1 / 4.7.0 | 2026-10-01 | |
| better-auth / @better-auth/expo / @better-auth/passkey / @better-auth/oauth-provider | 1.7.7 | 2026-09-30 | 1.7.0 on 2026-08-18; ⟦AV⟧ peers `drizzle-orm ^0.45.2 \|\| >=1.0.0-rc.1 <2`, `prisma ^5 \|\| ^6 \|\| ^7`, `next ^14 \|\| ^15 \|\| ^16` |
| @prisma/orm-postgres (Prisma 8) | 8.0.0-rc.14 | 2026-10-01 | ⟦AV⟧ exists on npm; RC only |
| react-native-css (NativeWind 5 engine) | 3.0.7 | 2026 | ⟦AV⟧ `rc` 3.1.0-rc.0, required by `nativewind@5.0.0-rc.0` (peers `tailwindcss > 4.1.11`) |
| lucia | 3.2.2 | 2024-10-20 | **deprecated** |
| react-native-purchases / @revenuecat/purchases-js | 10.11.0 / 1.67.1 | 2026-10-01 / 2026-09-30 | |
| stripe / @stripe/stripe-react-native | 23.0.0 / 0.80.0 | 2026-10-01 / 2026-09-30 | |
| @paddle/paddle-node-sdk / @paddle/paddle-js / @lemonsqueezy/lemonsqueezy.js | 3.10.0 / 1.6.5 / 4.0.0 | 2026-08-07 / 2026-08-25 / 2024-11-05 | |
| i18next / react-i18next / i18next-icu / next-intl | 26.4.2 / 17.0.15 / 2.4.4 / 4.14.8 | Sept 2026 | |
| @lingui/core / @lingui/react | 6.9.0 | 2026-10-01 | 6.0 on 2026-04-22 |
| react-intl / @formatjs/intl-numberformat / intl-pluralrules | 12.1.3 / 9.4.3 / 6.3.15 | Sept 2026 | |
| pnpm / turbo / nx / @moonrepo/cli | 12.8.1 / 2.11.6 / 23.2.1 / 2.5.6 | Sept–Oct 2026 | |
| @biomejs/biome | 2.5.15 | 2026-09-30 | 2.0 on 2025-06-17 |
| eslint / prettier / typescript-eslint / oxlint / oxfmt | 10.11.0 / 3.9.9 / 8.71.0 / 1.86.0 / 0.71.0 | Sept 2026 | typescript-eslint peer TS < 6.1 |
| typescript | 7.0.2 | 2026-07-08 | 6.0.3 (2026-04-16) last JS-based; `beta` 6.0.0-beta |
| vitest / @playwright/test / jest / jest-expo / @testing-library/react-native / detox | 5.0.3 / 1.63.0 / 30.5.2 / 57.0.5 / 14.0.1 / 20.51.4 | 2026 | |
| @changesets/cli / knip / syncpack / sherif | 3.0.3 / 6.39.0 / 15.3.3 / 1.13.0 | 2026 | |
| @opentelemetry/api / sdk-node / instrumentation-pino | 1.9.1 / 0.222.0 / 0.68.0 | 2026 | |
| pino / pino-opentelemetry-transport / @logtail/pino | 10.3.1 / 4.0.2 / 0.5.11 | 2026 | |
| @sentry/node / nextjs / react-native | 11.2.0 / 11.2.0 / 8.29.0 | 2026-10-01 | Expo 57 bundles @sentry/react-native ~7.11 |
| posthog-js / posthog-node / posthog-react-native | 1.435.6 / 5.55.0 / 4.78.4 | 2026-10-01/02 | |
| @openfeature/server-sdk / react-sdk / web-sdk / flagd-provider | 1.23.0 / 1.4.1 / 1.10.0 / 0.16.1 | 2026 | |
| unleash-server / flagsmith-nodejs | 8.2.0 / 8.1.2 | 2026 | |
| tailwindcss / nativewind / react-native-unistyles / tamagui | 4.3.3 / 4.2.7 / 3.4.0 / 2.7.7 | 2026 | nativewind `rc` 5.0.0-rc.0 (2026-09-13) |
| @react-native-reusables/cli / @rn-primitives/slot / @gluestack-ui/core | 0.7.1 / 1.5.2 / 5.0.15 | 2026 | |
| style-dictionary / @terrazzo/cli / @tokens-studio/sd-transforms | 5.5.5 / 2.7.1 / 2.0.3 | 2025–26 | |
| victory-native / @shopify/react-native-skia / react-native-gifted-charts / react-native-reanimated | 42.0.1 / 2.14.0 / 1.4.80 / 4.7.0 | 2026 | |
| @infinitered/react-native-mlkit-text-recognition / @react-native-ml-kit/text-recognition / react-native-vision-camera / react-native-document-scanner-plugin / @mistralai/mistralai | 5.0.1 / 2.0.0 / 5.2.3 / 2.0.4 / 2.7.0 | 2025–26 | |
| react-native-ssl-public-key-pinning / react-native-ssl-pinning / jail-monkey / react-native-keychain / react-native-mmkv | 1.2.6 / 1.6.0 / 3.0.0 / 10.0.0 / 4.3.2 | 2025–26 | |
| bun / bun-types / @types/node | 1.4.2 / 1.4.2 / 26.6.4 | 2026-09 / 2026-10-01 | |

Non-npm versions verified today: PostgreSQL 18.6 / 17.11 / 16.15, 19beta4 (S3, S4); Node 24.21.0 / 26.10.0 (S3); pgvector 0.8.7 (S48); Coolify 4.4.0 (S36); Dokploy v0.30.6 (S37); Maestro 2.11.0 (S50); Semgrep 1.178.0 (S51); Redis 8.10.2, Valkey 9.1.2 (S3). ⟦AV⟧ Re-confirmed in the adversarial pass: PostgreSQL 18.6 (released 2026-08-13 — ⟦AV2⟧ corrected from "2026-08-11"; `release-18.sgml`, S4) / 17.11 / 16.15 (S3); Node 26.10.0 (2026-09-21), 24.21.0 (2026-09-07), 22.23.3 (2026-09-23) from nodejs.org/dist (S65); Coolify 4.4.0 + nightly 4.5-rc.1 (S36); Semgrep 1.178.0 (S51); **Flutter stable 3.47.6 (2026-10-01), Dart 3.13.5 (S62)**.

---

## 5. Open questions / verification debt

1. **Expo Free-plan build quota and Production/Enterprise prices** — read https://expo.dev/pricing (blocked today). ⟦AV2⟧ Partially resolved via secondary summaries of that page: Production ≈ **$199/month + usage** (50,000 MAU, $225 build credit, 1 TiB bandwidth/storage); Enterprise price and the Free build quota still unread (S84).
2. **Hetzner current price list** (cx23/cx33/ccx13/LB11/volumes/Object Storage) — https://www.hetzner.com/cloud/ or `GET https://api.hetzner.cloud/v1/pricing` with a token. ⟦AV2⟧ **Now urgent:** secondary sources report two 2026 price increases (CX23 ≈ €5.99, CX33 ≈ €8.99) and that the CX line was not orderable in Sept 2026 (S75) — confirm availability and CPX/CCX prices before the hosting ADR and re-check the €40–85 MVP range in §3.11.
3. **Next.js 16.3 + TypeScript 7**: does `next build` type-check work with the TS 7 launcher package, or does it need `typescript@6`? Test in the vertical slice.
4. **Drizzle 1.0 GA date** and `numeric` mode options. ~~PGlite 0.5 pgvector availability~~ — ⟦AV⟧ resolved: PGlite README lists pgvector (S49); only the import path remains to check.
5. ~~**Clerk EU data residency**~~ — ⟦AV2⟧ resolved: no EU region, US hosting under the EU-US DPF (S76); **Inngest EU region** (⟦AV⟧ no EU-cloud doc found — assume none); **OVHcloud Milan**; **Textract in eu-south-1**.
6. **Apple/Google policy text** (ADPLA 3.3.1B, Guideline 2.5.2 and 3.1.x, EU alternative terms; Google EEA programs) — re-read before designing OTA cadence and web-pricing pages.
7. **Pinning libraries vs RN 0.86/New Arch**; feasibility of platform pinning via config plugin.
8. **Hermes `Intl.PluralRules`/`formatToParts` on iOS** for Italian plurals and EUR formatting.
9. ~~**GitHub Code Security / Secret Protection per-committer prices**~~ — ⟦AV2⟧ resolved (secondary, concordant): $30 / $19 per active committer per month (S78); **Snyk Free numeric limits** still open.
10. ~~**Flutter current version**~~ — ⟦AV⟧ resolved: stable 3.47.6 (S62).
11. **better-auth security audit status** (still open). ~~`oidcProvider`/`jwt` plugin availability~~ — ⟦AV⟧ resolved: `@better-auth/oauth-provider` 1.7.7 + `jwt` plugin (S1, S14).
12. **Trivy/Gitleaks/TruffleHog/Syft/ZAP versions** — `gh release view` once GitHub API access is granted for those repos (⟦AV⟧ still blocked on 2026-10-02).
13. ⟦AV⟧ **BullMQ 6 PostgreSQL backend maturity** — throughput, table bloat and LISTEN behaviour under load vs pg-boss; decide before any pg-boss → BullMQ migration.
14. ⟦AV⟧ **Expo SDK 58 stable pairing** — adopt only once `sdk-58` bundles a non-RC React Native 0.88.
15. ⟦AV⟧ **Fastify 6** (alpha) and **oRPC 2** (beta) — check release notes before the vertical slice so the API scaffold does not land on an about-to-be-superseded major.

---

## 6. Sources

| ID | Source | Type | Verified | Pub. date | Reliability | Doubts |
|---|---|---|---|---|---|---|
| S1 | npm registry via `npm view` (versions, `time`, `dist-tags`, `engines`, `peerDependencies`, READMEs) — https://registry.npmjs.org | primary | 2026-10-02 | per package | high | README text may lag releases |
| S2 | https://raw.githubusercontent.com/nodejs/Release/main/schedule.json | primary | 2026-10-02 | live | high | — |
| S3 | https://raw.githubusercontent.com/endoflife-date/endoflife.date/master/products/{nodejs,postgresql,react-native,nextjs,bun,redis,valkey}.md | secondary (community-maintained) | 2026-10-02 | live | medium-high | community data; cross-checked with S1/S4 |
| S4 | https://raw.githubusercontent.com/postgres/postgres/{REL_18_STABLE,REL_19_STABLE,REL_17_STABLE}/meson.build and doc/src/sgml/release-18.sgml, release-19.sgml | primary | 2026-10-02 | live | high | 19 release date placeholder "2026-??-??" |
| S5 | https://raw.githubusercontent.com/expo/expo/main/docs/pages/guides/new-architecture.mdx | primary | 2026-10-02 | live | high | — |
| S6 | https://raw.githubusercontent.com/expo/expo/main/docs/pages/billing/plans.mdx, billing/faq.mdx; https://docs.expo.dev/billing/usage-based-pricing (via Context7) | primary | 2026-10-02 | live | high | numeric build quotas only on expo.dev/pricing |
| S7 | https://raw.githubusercontent.com/expo/expo/main/docs/pages/eas-update/introduction.mdx, eas-update/code-signing.mdx | primary | 2026-10-02 | live | high | — |
| S8 | https://raw.githubusercontent.com/expo/expo/main/CHANGELOG.md | primary | 2026-10-02 | live | high | — |
| S9 | https://raw.githubusercontent.com/expo/expo/{sdk-57,sdk-56,sdk-55}/packages/expo/bundledNativeModules.json | primary | 2026-10-02 | live | high | — |
| S10 | https://raw.githubusercontent.com/expo/expo/main/docs/pages/versions/unversioned/sdk/{securestore,local-authentication,screen-capture}.mdx | primary | 2026-10-02 | live | high | "unversioned" docs may precede SDK 57 |
| S11 | https://raw.githubusercontent.com/expo/expo/main/docs/pages/guides/server-components.mdx, eas/hosting/introduction.mdx | primary | 2026-10-02 | live | high | — |
| S12 | https://raw.githubusercontent.com/microsoft/typescript-go/main/README.md; `npm pack typescript@7.0.2 --dry-run`; `npm view typescript@7.0.2 exports` | primary | 2026-10-02 | live | high | — |
| S13 | https://raw.githubusercontent.com/vercel/next.js/canary/docs/01-app/02-guides/upgrading/version-16.mdx (+ Context7 /vercel/next.js) | primary | 2026-10-02 | live | high | — |
| S14 | better-auth docs via Context7 (/better-auth/better-auth: plugins/passkey.mdx, concepts/session-management.mdx, integrations/expo.mdx, authentication/apple.mdx, plugins/bearer.mdx, plugins/2fa.mdx, blogs/1-6.mdx) | primary (mirrored) | 2026-10-02 | live | high | — |
| S15 | Drizzle docs via Context7 (/drizzle-team/drizzle-orm-docs: pg/connect-pglite, pg/rls, pg/v0-v1-changes, pg/relations-v1-v2, pg/upgrade-v1, pg/drizzle-config-file) | primary (mirrored) | 2026-10-02 | live | high | — |
| S16 | Prisma docs via Context7 (/websites/prisma_io: cli/configuration, orm/v7/reference/prisma-config-reference, guides/upgrade-prisma-orm/postgresql, postgres/database/switch-from-accelerate) | primary (mirrored) | 2026-10-02 | live | high | — |
| S17 | pg-boss DeepWiki via Context7 + `npm view pg-boss readme` | secondary + primary | 2026-10-02 | live | medium-high | DeepWiki is generated from source |
| S18 | Graphile Worker docs via Context7 (/graphile/worker: cron.md, exponential-backoff.md, requirements.md) | primary (mirrored) | 2026-10-02 | live | high | — |
| S19 | BullMQ source/docs via Context7 (/taskforcesh/bullmq: redis-connection.ts, job.ts, guide/jobs/repeatable.md) + README | primary | 2026-10-02 | live | high | — |
| S20 | Inngest website via Context7 (/inngest/website: Pricing/plans.ts, docs/usage-limits/inngest.mdx, blog self-hosting) | primary (mirrored) | 2026-10-02 | live | high | plan names may change |
| S21 | Trigger.dev docs via Context7 (/websites/trigger_dev: self-hosting/overview, triggering) | primary (mirrored) | 2026-10-02 | live | high | — |
| S22 | Biome website via Context7 (/biomejs/website: blog/biome-v2.mdx, blog/biome-v2-0-beta.md, blog/roadmap-2025.md, linter/rules/no-floating-promises, internals/language-support) | primary (mirrored) | 2026-10-02 | 2025–26 | high | type-aware capability evolving monthly |
| S23 | NestJS docs via Context7 (/nestjs/docs.nestjs.com: content/migration.md, cli/usages.md) | primary (mirrored) | 2026-10-02 | 2026-08+ | high | — |
| S24 | Hono docs via Context7 (/websites/hono_dev: examples/zod-openapi, concepts/stacks, getting-started/nextjs) | primary (mirrored) | 2026-10-02 | live | high | — |
| S25 | NativeWind v5 docs via Context7 (/websites/nativewind_dev_v5: guides/migrate-from-v4, guides/themes, llms-full.txt) | primary (mirrored) | 2026-10-02 | live | high | pre-release docs |
| S26 | Unistyles docs via Context7 (/jpudysz/react-native-unistyles: v3/start/getting-started.mdx, v3/tutorial/intro.mdx, migration skill) | primary (mirrored) | 2026-10-02 | live | high | — |
| S27 | Tamagui docs via Context7 (/websites/tamagui_dev: guides/expo, guides/next-js, guides/how-to-upgrade, intro/why-a-compiler) | primary (mirrored) | 2026-10-02 | live | medium | v2 specifics thin |
| S28 | Victory Native XL docs via Context7 (/formidablelabs/victory-native-xl README, docs/getting-started, docs/introduction) | primary (mirrored) | 2026-10-02 | live | high | — |
| S29 | https://raw.githubusercontent.com/open-telemetry/opentelemetry-js/main/README.md (signal status table) | primary | 2026-10-02 | live | high | — |
| S30 | https://raw.githubusercontent.com/getsentry/sentry-docs/master/docs/organization/data-storage-location/index.mdx | primary | 2026-10-02 | live | high | — |
| S31 | PostHog site via Context7 (/posthog/posthog.com: compare/*, blog/*, docs/libraries/react-native, docs/advanced/proxy/*) | primary (mirrored) | 2026-10-02 | live | medium-high | free-tier numbers from comparison pages |
| S32 | Fly.io docs via Context7 (/websites/fly_io: reference/regions, machines/guides-examples/machine-placement) | primary (mirrored) | 2026-10-02 | live | high | — |
| S33 | https://raw.githubusercontent.com/neondatabase/website/main/content/docs/introduction/regions.md; pricing via Context7 (/neondatabase/website public/pricing.md, docs/introduction/plans.md) | primary | 2026-10-02 | live | high | — |
| S34 | Supabase docs via Context7 (/websites/supabase_guides: platform/regions, functions/regional-invocation) + raw apps/docs/content/guides/platform/regions.mdx | primary | 2026-10-02 | live | high | — |
| S35 | Hetzner Cloud API docs/changelog via Context7 (/websites/hetzner_cloud) | primary (mirrored) | 2026-10-02 | live | medium | no prices (API needs token) |
| S36 | Coolify docs via Context7 (/coollabsio/coolify-docs: start-with-self-hosted.mdx, databases/backups.mdx); https://raw.githubusercontent.com/coollabsio/coolify/main/versions.json | primary | 2026-10-02 | live | high | — |
| S37 | https://raw.githubusercontent.com/Dokploy/dokploy/canary/apps/dokploy/package.json | primary | 2026-10-02 | live | high | canary branch |
| S38 | https://raw.githubusercontent.com/github/docs/main/content/billing/concepts/product-billing/github-advanced-security.md; content/code-security/getting-started/github-security-features.md | primary | 2026-10-02 | live | high | prices not in these pages |
| S39 | Semgrep docs via Context7 (/semgrep/semgrep-docs: snippets/semgrep-pro-vs-oss.mdx, faq/comparisons/opengrep.mdx) | primary (mirrored) | 2026-10-02 | live | high | — |
| S40 | Snyk docs via Context7 (/websites/snyk_io: what-counts-as-a-test, usage-settings) | primary (mirrored) | 2026-10-02 | live | medium | no numeric limits |
| S41 | RevenueCat docs via Context7 (/websites/revenuecat: account-management.md, launch-checklist.md, stripe-projects-quickstart.md) | primary (mirrored) | 2026-10-02 | live | high | — |
| S42 | Stripe docs via Context7 (/websites/stripe: tax/how-tax-works, tax/use-stripe-to-register) | primary (mirrored) | 2026-10-02 | live | medium | fee % not in docs |
| S43 | Paddle developer docs via Context7 (/websites/developer_paddle) | primary (mirrored) | 2026-10-02 | live | medium | fee % not in docs |
| S44 | Clerk docs via Context7 (/clerk/clerk-docs: guides/development/migrating/overview.mdx, custom-flows/authentication/passkeys.mdx, reference/expo/native-hooks/use-hosted-auth.mdx) | primary (mirrored) | 2026-10-02 | live | high | EU residency not found |
| S45 | Lingui docs via Context7 (/lingui/js-lingui: releases/migration-6.md, ref/metro-transformer.mdx, tutorials/react-native.md, library rules) | primary (mirrored) | 2026-10-02 | live | high | — |
| S46 | Vitest docs via Context7 (/vitest-dev/vitest: guide/migration/index.md, packages/vitest/package.json, blog/vitest-4.md) | primary (mirrored) | 2026-10-02 | live | high | — |
| S47 | https://raw.githubusercontent.com/facebook/hermes/main/doc/IntlAPIs.md | primary | 2026-10-02 | live | high | doc may lag Hermes releases |
| S48 | https://raw.githubusercontent.com/pgvector/pgvector/master/CHANGELOG.md | primary | 2026-10-02 | live | high | — |
| S49 | https://raw.githubusercontent.com/electric-sql/pglite/main/packages/pglite/CHANGELOG.md; `npm view @electric-sql/pglite description` | primary | 2026-10-02 | live | high | embedded PG version not checked |
| S50 | https://raw.githubusercontent.com/mobile-dev-inc/maestro/main/gradle.properties and CHANGELOG.md | primary | 2026-10-02 | live | high | — |
| S51 | https://raw.githubusercontent.com/semgrep/semgrep/develop/CHANGELOG.md | primary | 2026-10-02 | live | high | — |
| S52 | https://raw.githubusercontent.com/facebook/react-native/main/CHANGELOG.md | primary | 2026-10-02 | live | high | — |
| S53 | `npm view react-native-passkeys readme` | primary | 2026-10-02 | 2026-08 | high | — |
| S54 | `npm view react-native-ssl-public-key-pinning readme`; `npm view jail-monkey readme` | primary | 2026-10-02 | 2025-07 / 2026-04 | high | RN 0.86 compat untested |
| S55 | Scaleway docs via Context7 (/scaleway/docs-content: managed-databases-for-postgresql-and-mysql/*) | primary (mirrored) | 2026-10-02 | live | medium | no prices |
| S56 | Apple Developer Program License Agreement §3.3.1B; App Store Review Guidelines §2.5.2, §3.1.x | memory (not re-read) | — | — | medium | wording/section numbers may have changed; verify |
| S57 | Training-knowledge price points and provider facts (Hetzner, Vercel, Sentry, Supabase/Auth0 MAU, GitHub Code Security, Stripe Tax %, Paddle %, Railway/Render regions, AWS prices, DORA/GDPR scope, Italian VAT) | memory | — | — | low-medium | all labelled ASSUMPTION; verify before ADRs |
| S58 | https://raw.githubusercontent.com/facebook/react-native-website/main/docs/security.md | primary | 2026-10-02 | live | high | — |
| S59 | Expo new-architecture guide (S5) citing React Native 0.82 blog (2025-10-08) | primary via S5 | 2026-10-02 | 2025-10 | high | — |
| S60 | https://raw.githubusercontent.com/expo/expo/main/docs/pages/build-reference/infrastructure.mdx | primary | 2026-10-02 | live | high | — |
| S61 | ⟦AV⟧ https://raw.githubusercontent.com/taskforcesh/bullmq/master/docs/gitbook/guide/postgresql.md and docs/gitbook/changelog.md (v6 entry "Introduce the IQueueBackend abstraction, Redis and PostgreSQL backends"); Context7 /taskforcesh/bullmq (guide/postgresql.md) | primary | 2026-10-02 | 2026-07+ | high | backend is ~2 months old |
| S62 | ⟦AV⟧ https://storage.googleapis.com/flutter_infra_release/releases/releases_linux.json (`current_release.stable` → 3.47.6, 2026-10-01, Dart 3.13.5) | primary (Flutter release feed) | 2026-10-02 | live | high | — |
| S63 | ⟦AV⟧ GitHub code-search API (via MCP) over `clerk/clerk-docs` ("data residency", "European", "50,000 Monthly Retained Users"), `inngest/website` ("data residency", EU region), `github/docs` `content/billing` ("per active committer", "Secret Protection") | primary (negative/positive search results) | 2026-10-02 | live | medium | absence of text ≠ absence of feature; re-check vendor sites |
| S64 | ⟦AV⟧ semgrep/semgrep-docs: docs/usage-and-billing/overview.mdx, docs/snippets/faq/comparisons/opengrep.mdx, docs/snippets/semgrep-pro-vs-oss.mdx (via GitHub code search) | primary | 2026-10-02 | live | high | — |
| S65 | ⟦AV⟧ https://nodejs.org/dist/index.json (latest per major: 26.10.0 2026-09-21, 24.21.0 2026-09-07, 22.23.3 2026-09-23) | primary | 2026-10-02 | live | high | — |
| S66 | ⟦AV⟧ https://raw.githubusercontent.com/expo/expo/main/docs/pages/billing/faq.mdx and billing/usage-based-pricing.mdx (1,000 / 3,000 MAU, $0.005/MAU, $0.10/GiB, per-build prices) | primary | 2026-10-02 | live | high | Production/Enterprise prices still only on expo.dev/pricing |
| S67 | ⟦AV⟧ https://raw.githubusercontent.com/neondatabase/website/main/content/docs/introduction/plans.md (plan table) and docs/introduction/regions.md | primary | 2026-10-02 | live | high | — |
| S68 | ⟦AV⟧ https://raw.githubusercontent.com/vercel/next.js/canary/docs/01-app/02-guides/upgrading/version-16.mdx ("Turbopack by default", custom webpack build fails, Node 20.9+, TS 5.1+, `middleware` → `proxy`, proxy runtime nodejs only) and docs/01-app/03-api-reference/03-file-conventions/proxy.mdx | primary | 2026-10-02 | live | high | — |
| S69 | ⟦AV⟧ GitHub search API repository metadata for microsoft/typescript-go (`archived: true`, `pushed_at` 2026-08-31) | primary | 2026-10-02 | live | high | — |
| S70 | ⟦AV⟧ PostHog compare pages via Context7 (/posthog/posthog.com: compare/best-amplitude-alternatives, posthog-vs-hotjar, best-product-analytics-tools-for-startups) | primary (mirrored) | 2026-10-02 | live | medium-high | marketing pages, not the pricing API |
| S71 | ⟦AV⟧ RevenueCat docs via Context7 (/websites/revenuecat: welcome/set-up-revenuecat/account-management.md "What happens when you reach $2.5k in MTR?") | primary (mirrored) | 2026-10-02 | live | high | — |
| S72 | ⟦AV⟧ Fly.io docs via Context7 (/websites/fly_io: reference/regions table with Gateway/MPG columns) | primary (mirrored) | 2026-10-02 | live | high | — |
| S73 | ⟦AV⟧ https://raw.githubusercontent.com/supabase/supabase/master/packages/shared-data/regions.ts and apps/docs/content/guides/platform/regions.mdx | primary | 2026-10-02 | live | high | — |
| S74 | ⟦AV⟧ `npm view` re-run on 2026-10-02 for ~90 packages (versions, `time`, `dist-tags`, `engines`, `peerDependencies`, `deprecated`), incl. `@better-auth/oauth-provider`, `@prisma/orm-postgres`, `react-native-css`, `nativewind@5.0.0-rc.0`, `@electric-sql/pglite` README/exports, `pg-boss` README | primary | 2026-10-02 | per package | high | — |
