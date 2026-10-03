# Lilleri

Lilleri is an Italy-first personal-finance project. The current repository is a **local prototype with synthetic financial data**: a persistent scoped API, durable synthetic acquisition, deterministic reconciliation/classification, Review Inbox, versioned rules, private merchant aliases and user categories, recurring feedback, manual accounts, CSV/XLSX import, consent/privacy controls, in-app notifications and conservative financial observations. The browser UI supports Italian and British English. Optional local browser identity supports owned profiles; no real bank is connected by this setup.

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

The API defaults to embedded **PGlite**, with persistent synthetic data in ignored `.lilleri/data`. Docker, bank credentials and paid services are not needed. The 31 reviewed, checksum-protected migrations run on startup; the current chain is in [packages/database/migrations](packages/database/migrations). The server encrypts selected financial fields under per-profile keys in an independent local vault outside the database directory. Keep its current keys and independent deletion/source-erasure journals available when reopening an existing store; copying the database alone is insufficient. Deleting the demo profile persists its deletion state; it does not silently reseed. Use a new `PGLITE_PATH` for a fresh demo.

```bash
PGLITE_PATH=/tmp/lilleri-fresh-demo pnpm dev
```

The local API rejects production configuration and non-loopback binding. Physical-device banking/mobile behaviour is unverified; the browser export does not validate native iOS/Android. Detailed optional PostgreSQL and test commands are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Zero-investment workflow

The [zero-investment launch decision](docs/business/zero-investment-launch.md) keeps Gratis permanent and postpones paid bank access until collected revenue can fund it. No bank subscription or checkout is activated. The [bootstrap tools](tools/bootstrap/README.md) use the existing synthetic prototype with separate ports and a separate archive:

```bash
pnpm economics:zero
pnpm check:zero
pnpm dev:zero
```

`dev:zero` builds local packages and starts only the API (127.0.0.1:3191) and Expo browser preview (localhost:8181), with embedded PGlite, offline Expo and no inherited service credentials. Install the locked dependencies first using the normal setup above. This is a local synthetic demonstration, not a commercially deployed service or permission to import personal bank records. Commercial setup, infrastructure, support and time still require costing. Test prices are hypotheses; the prototype charges nobody. The proposed free/paid boundary is available on the project site's `/piani` page.

## Available local flows

- **Home:** observed monthly totals and transaction evidence; safe-to-spend uses saved account selections, a visible horizon and exact per-currency buffers, with reopen and undo. Unknown source coverage, balance meaning or private liabilities can make the estimate unavailable. Explicit monthly captures retain immutable original evidence; history follows current privacy while owned exports preserve the original. A newly saved complete nonempty capture can produce an optional in-app summary notice. See [saved understanding](docs/architecture/understanding-persistence.md) and [current evidence](docs/STATUS.md).
- **Transactions:** exact-money manual entries, strict CSV, an explicit Italian/British mapper with saved revisions, previews and duplicate acknowledgement, and bounded XLSX worksheet import through the same audited mapping flow. Verified per-bank mappings, broader cross-source deduplication and native share entry remain open.
- **Connections:** synthetic institution coverage, provider-derived authorization dates, pause/resume/renewal, disconnect data choices and owned consent history. Durable jobs preserve bounded progress, quotas and encrypted checkpoints; partial acquisition does not advance balances or freshness. Paused, expired, revoked and unknown grants cannot refresh.
- **Merchants and categories:** versioned conservative recognition, private aliases with stable identity, rename/preview/apply/undo and a 72-leaf local taxonomy with user category creation, assignment, merge and archive. Historical labels and original source text remain portable; conflicting recognition abstains. Recurring candidates use explicit creditor/mandate or resolved merchant evidence and support saved corrections.
- **Privacy and notifications:** reversible rules-only/quiet/private preferences, draft local purpose disclosures, default-off optional service notices, quiet hours and read state. External AI, identified analytics and native push are unavailable.
- **Data rights:** scoped JSON/ZIP with available acquisition, merchant/category, recurring and preference audit; profile deletion with independent key destruction; source row erasure with authenticated independent receipts and mandatory quarantined restore replay. Source erasure retains the shared profile key and is not source-specific crypto-shredding.
- **Offline reading:** an encrypted, expiring, session-bound browser overview can remain readable after a network failure. Actions are blocked until online revalidation. This bounded web cache is not a complete server-projected 90-day archive, a cold offline login or native secure storage; it does not queue writes.

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
pnpm test:evaluation-contract
pnpm build
```

`pnpm check` combines Biome lint/format, operational and UI-copy guards, evaluation/bootstrap regression groups, typecheck and unit suites; the API suite uses PGlite by default. PostgreSQL-specific tests need an explicitly configured disposable database. `pnpm build` includes a Next production build and an **Expo web export**. Current executed totals, driver-specific skips, browser evidence and dependency findings are recorded in [STATUS](docs/STATUS.md); earlier committed totals do not validate a newer working tree.

The [evaluation tools](tools/evaluation/README.md) validate frozen dataset splits, exact metric denominators and versioned shadow-policy review/rollback records. They train no model and activate no runtime policy; synthetic data cannot establish representative accuracy or promotion. The [25-scenario reconciliation catalogue](docs/product/reconciliation-scenarios.md) records **4 supported, 18 incomplete and 3 expected unsupported** requirements. Remaining local P0 implementation stays active alongside the concrete external prerequisites in the [execution plan](docs/product/execution-plan.md); all 40 epics are not complete.

## Repository map

| Path | Content |
| --- | --- |
| `apps/api` | Scoped Fastify/Zod API, durable acquisition, consent/import/merchant/recurring/privacy/understanding/notification/data-rights services, maintenance and integration tests |
| `apps/mobile` | Expo/React Native local prototype and browser export |
| `apps/web` | Next.js project page with locally bundled artwork/fonts |
| `packages/money` | Exact bigint minor-unit arithmetic and currency formatting |
| `packages/domain` | Financial types, calendar-date utilities and taxonomy |
| `packages/financial-providers` | Validated discovery/authorization/acquisition ports, synthetic Italian fixture provider and bounded CSV/XLSX parsing/mapping |
| `packages/engines` | Pure deterministic classification, merchant recognition, reconciliation catalogue, semantic recurring detection, monthly observations and safe-to-spend |
| `packages/database` | Shared PostgreSQL/Drizzle schema, checksum migrations, forced RLS and scoped PGlite/PostgreSQL handles |
| `packages/api-client` | Typed local API client |
| `packages/brand` | Original mark, icons, local OFL fonts and light/dark tokens |
| `docs` | Research, product/business, brand/design, architecture/ADRs, security and compliance |
| `tools` | Evaluation contracts/shadow-policy tools, sequential browser evidence helpers, configuration/copy guards and historical research/brand tooling |

Trust, data correctness and security precede conversion. **Gratis / Plus** is the proposed launch ladder; pricing and live-source access remain hypotheses/gated. The local vault and restore drill do not establish production KMS or backup acceptance. Local identity/state reconciliation, FX provenance, server search, complete feedback/rule actions and fitted calibration still need software work. Production identity/recovery, real-bank access, full encryption-class coverage, household sharing, external AI, billing and store releases require further implementation and specific external evidence. Read [SECURITY.md](SECURITY.md) before changing the demo boundary.
