# Lilleri delivery status

**Snapshot date:** 2026-10-02. **Scope:** review and functioning local synthetic foundation. This report follows [the founder's brief](BRIEF.md). Source research verification dates and uncertainty remain in their documents; this report does not verify live fees/coverage/law, sign contracts, claim user studies or grant production approval.

## Executive summary

Lilleri now has an original brand/design foundation, revised market/product/business/security/compliance documentation and a persistent **mock-only financial vertical slice**. The local API connects a synthetic provider, syncs canonical data, runs conservative deterministic engines, accepts sticky corrections/review decisions, imports bounded CSV, exports JSON and deletes its demo profile. An Expo prototype consumes the API; Next provides a project page. Local startup uses Node 22/pnpm 10, embedded PGlite and no paid service.

This is a **pre-MVP local prototype**, not a real-bank beta or store-ready financial service. Production identity, licensed provider access, privacy/security/key/backup controls, household sharing, third-party AI/OCR, billing and native-store execution remain gated. Final local installation, quality checks, synthetic suites, PostgreSQL integration and web builds **passed**. Browser automation passed 16 baseline flow groups plus 2 targeted rendering groups after visual fixes, with no unhandled JavaScript errors. Native execution, the complete visual/accessibility matrix, recruited-user studies and production acceptance remain unverified.

## Product and brand thesis

Product hypothesis: organise supported multi-source finances with less repeated correction; show evidence/freshness, preserve user rules and require review for ambiguity. Exact money, correct structural accounting and user ownership precede automation volume. Bank-app aggregation already exists; incremental value and Italian actual willingness to pay remain unvalidated.

Brand decision: **Lilleri**, direction B **li monogram**, **T3 Carta & Vinaccia**, Geist UI, Newsreader editorial and Geist Mono for technical codes. Original SVG/PNG assets, local OFL font/licence files and JSON/TS/CSS tokens exist in `packages/brand`. Asset-engineering checks and expert design assessment do not establish trademark/domain clearance, recruited-user recognition or physical-device accessibility. Generated vectors still require designer finalisation before public release. [Brand jury](brand/brand-jury.md), [asset inventory](brand/brand-assets.md) and [visual gate](design/visual-quality-gate.md) describe evidence and limits.

## Implemented local slice

| Component | Current implementation | Limit |
| --- | --- | --- |
| Money/domain | Bigint minor-unit/currency operations, calendar helpers, financial types/taxonomy | No floating-point ledger arithmetic; full product taxonomy/custom-category UX is future scope |
| Provider | `FinancialDataProvider` port, synthetic Italian fixture provider, normalisation and bounded CSV parser | Institution names in fixtures do not prove real coverage |
| Engines | Pure deterministic categorisation, conservative reconciliation, recurring suggestions, exact summaries and effective-transaction selection | No calibrated personal ML/LLM, real-data accuracy result or universal automation |
| Database | PostgreSQL/Drizzle schema, shared versioned migrations/checksums, PGlite and PostgreSQL drivers | Synthetic use; no implemented production encryption/RLS/role/backup acceptance claim |
| API | Fastify/Zod, scoped synthetic profile, connect/sync, atomic source persistence, correction/replay, reconciliation decisions, cursor pagination, CSV import, JSON export, disconnect/delete and OpenAPI contract | Explicit demo-only loopback access; no login, production sessions, bank tokens or payment lifecycle |
| Typed client | Shared client used by Expo prototype | Full generated-client drift proof remains separate hardening |
| Expo prototype | Local API-driven financial screens, correction/review and data-ownership actions, brand typography/themes | Web export, automated browser flows and targeted rendering checks validated; full visual/accessibility coverage, native iOS/Android and physical devices remain separate evidence |
| Next project page | Responsive development-stage copy, original local artwork/fonts, theme control | No real signup/email capture/banking/analytics integration |
| CI/tooling | Workspace scripts, lockfile, lint/type/tests/build configuration, hooks and security job configuration | Current remote CI execution and advisory findings are not inferred from configured YAML |

The local deletion tombstone prevents silent reseeding of a deleted demo profile. This proves a synthetic contract, not GDPR end-to-end processor or backup erasure. Instants and calendar dates are different: financial fields use SQL `DATE` and valid date-only values; profile calendar periods use `Europe/Rome` in this prototype.

## Verification evidence

The implementation owners reported the following executed checks in this working session. The saved setup log also records 22 successful quality tasks and 10 successful build tasks. Evidence is limited to the tested synthetic cases; it does not imply production security, real-provider behaviour or a remote GitHub CI run.

| Check | Recorded result at this snapshot | Scope / caveat |
| --- | --- | --- |
| Money unit suite | **63 passed** | Exact-money/currency/format invariants |
| Domain suite | **19 passed** | Domain/calendar validation |
| Financial-provider suite | **18 passed** | Mock normalisation/CSV contracts |
| Engine suite | **35 passed** | Financial/reconciliation/classification adversarial cases |
| API integration, PGlite | **14 passed** | Persistence/replay/concurrency, profile references, stale corrections, pagination, review decisions, revoke/reconnect, export/erasure, guards, CSV/reopen and refund regressions |
| API integration, PostgreSQL 16.15 | **14 passed; 8 successful tasks**, using `PG_TEST_DATABASE_URL=postgres://lilleri:lilleri@127.0.0.1:55432/lilleri_test` | Actual PostgreSQL driver/migrations/scenario execution; production non-owner RLS, key controls and operational recovery remain untested |
| Aggregate unique suite count | **149 cases = 135 core + 14 API** | PostgreSQL repeats the same 14 API cases; driver runs are not additional unique tests |
| Frozen installation | **Passed** | Repository lockfile used; no real-bank/service credentials required |
| `pnpm lint` / `pnpm format:check` | **Passed** | Biome source checks; autogenerated `next-env.d.ts` excluded for repeatability |
| `pnpm check` | **Passed; 22 successful tasks** | Biome checks, typecheck and synthetic suites; informational lint suggestions are not a no-warning claim |
| `pnpm build` | **Passed; 10 successful tasks** | Includes Next production build and Expo web export from current source; no native binary/store claim |
| `pnpm dev` | **Started and checked** | Dependency prebuild, Next 3000, Expo 8081 and loopback demo API 3001; HTTP 200 and overview with 5 synthetic accounts / 35 transactions observed |
| Automated browser flows | **16 baseline groups passed** | Synthetic flow/behaviour checks; independent visual review found defects that prompted fixes; no unhandled page errors |
| Targeted browser checks and recapture after fixes | **2 groups passed; fresh screenshots recorded** | Latest Expo development app: Italian document, 320px navigation targets ~60.8×64px with visible «Controlla», original-description fallback and human evidence, light/dark. Latest Next: 320px ledger labels 14px, no horizontal overflow; manual theme sets `data-theme=dark` and body `rgb(20, 15, 14)`. Independent inspection confirms observed compositions; not full accessibility/native acceptance |
| Documentation whitespace | Assigned business/product `git diff --check` passed | Documentation consistency/format evidence only |
| Dependency audit | **Unresolved findings; `pnpm audit --prod --json` exited 1** | High `node-forge` 1.4 finding with no patch reported and moderate `uuid` 7 finding through Expo CLI tooling; see [SECURITY](../SECURITY.md) for scope/triage; not a clean audit |
| Limited secret-pattern review | **84 files checked; 0 candidates** | Gitleaks unavailable; limited working-file patterns are not a full-history or comprehensive secret scan |
| Remote CI, penetration test, native/device accessibility, user studies | **Not verified here** | CI configuration and local commands do not prove remote jobs or release acceptance |

CI and Turbo now consistently pass **`PG_TEST_DATABASE_URL`**. The real-PostgreSQL integration path above was executed locally after the correction; it cannot be described as a remote GitHub CI pass. Dev configuration also passes required XDG cache/data variables, and Expo starts with `--localhost`. The saved setup script was rerun and exited **0**, completing frozen root/brand installation, `pnpm check` and `pnpm build`; its log records the results above. Startup instructions for all three local services were saved in the cloud configuration; execution in a fresh future task is unverified.

The PostgreSQL-configured suite uses the real server for its shared scenarios; its dedicated on-disk close/reopen case uses PGlite. That embedded case is not a network PostgreSQL restart or backup-restore test.

## Selected architecture and release gates

TypeScript/pnpm/Turbo monorepo; Fastify/Zod REST; PostgreSQL/Drizzle with embedded PGlite for synthetic development; pure engines; provider port; Expo mobile and Next project page. Keep a small modular monolith with explicit source/identity/financial/evidence boundaries. Future jobs/outbox, authentication, processors, encryption/key hierarchy and deployment are designs, not completed services. [Architecture](architecture/system-architecture.md) and [ADRs](adr/) record proposal→critique→counterproposal→decision.

| Gate from brief | Current assessment |
| --- | --- |
| A Market opportunity | **Commercially unvalidated**; source-backed hypothesis, incumbent comparison/user demand/WTP evidence missing |
| B Financial-data feasibility | **Real-data blocked** pending acceptable legal/provider route, contract and actual bank/account-type quality; mock port implemented |
| C Business sustainability | **Conditional/unvalidated**; launch Base loses marginal money; quotes/collected paid retention/cash path missing |
| D Architecture | **Accepted for scoped mock design**, per architecture review; deployed-production approval not implied |
| E Security baseline | **Synthetic controls/scenarios only**; real-data acceptance blocked until identity/key/role/backup/privacy evidence |
| F Core-loop UX | **Concept/design, prototype, automated flows and targeted rendering available**; moderated usability, full visual/accessibility matrix and native devices remain open |
| G Brand identity | **Conceptually accepted for implementation**, with asset engineering evidence; designer/legal/user/device validation remains open |

Beta, public launch and expansion are separate release reviews; Gate G means brand, not monetisation expansion. Provider RFP-G1–G4 and metric guardrail IDs G1–G18 are different identifiers.

## Business model and cost assumptions

Canonical consumer ladder: **Lilleri Gratis / Lilleri Plus** at launch; **Lilleri Famiglia Later** after safe sharing, **Lilleri Pro reserved** for future professional use. Plus **€4.99/month / €39.99/year** is a test hypothesis, not an active offer. Core correctness/correction/learning/rules, security/privacy/consent safety, retained-data access and export/delete are always free. Closed beta is free; proposed 30-day non-renewing Plus preview requires implementation and never charges at expiry. Explicit purchase/billing is separate P1 scope.

Revised launch model is **100% Plus paid mix and €0 offers revenue**. Base net revenue **€2.85/subscription-month**, delivery COGS **€1.07**, paid contribution **€1.78**; Gratis subsidy makes GP **−€79.49/1,000 MAU** before provider minimum/fixed costs. Target GP **€211.17/1,000 MAU (40.7%)** still loses against Base fixed stage budgets; Target loaded payback ~24 months exceeds the 18-month acquisition target. Free AIS/active paid subscription guardrail **€0.95** is unavailable in an all-free beta. These are computations from assumptions, not achieved results.

AIS price **€0.10/€0.30/€0.60 per billed account-month** and minimum **€0/€500/€2,000** are unknown→assumption envelopes. Invoice unit, dormant fees, coverage, fees/tax and support need quotes. Earlier four-plan ARPPU/~240k-MAU break-even/seed-round claims are withdrawn. [Business model](business/business-model.md), [economics](business/unit-economics.md), [scenarios](business/revenue-scenarios.md) and [pricing](business/pricing-analysis.md) show arithmetic, uncertainty and contingency. Sponsored offers are Later, separately legal/trust gated; opt-in cannot legalise a prohibited AIS purpose. No service purchase or external publication is performed by this setup.

## Human/external blockers and next implementation work

| Blocker | Required evidence/action | What can continue now |
| --- | --- | --- |
| Provider coverage/access/fees | Provider-issued official sandbox access, written account-type coverage/quotes; later acceptable contract/licence route | Mock contracts, schema/error fixtures and integration hardening |
| Legal/privacy route | Qualified counsel on recipient/AISP route, taxonomy/special-category handling, lawful purposes, rights/consumer terms; DPIA/processor assessment | Minimal synthetic product/security design and documented questions |
| Real-data security | Reviewed auth/membership/recovery, field/transport/key/secrets/role controls, restore/partial-rights/processor evidence and appropriate independent tests | Strengthen local profile/financial guards and test invariants |
| User/business validation | Cleared opt-in beta, representative audits and usability; actual eligible purchase/renewal after billing gates | Transparent concept/price research; shadow costs with no invented conversion |
| Brand/name/native release | Professional naming/trademark/domain review, vector finalisation, physical-device/accessibility/icon/store evidence | Reproducible assets, tokens and synthetic web/prototype testing |

Recommended sequence: extend visual/accessibility evidence to remaining fixtures and native devices, recording defects; harden local API/client contracts and core-loop states; integrate official sandbox only with issued access; prepare a small legally/provider/privacy/security-cleared real-data pilot. Expand toward future MVP only after evidence. Never collect bank passwords or personal-account credentials to bypass the provider flow. No PR/deployment/store submission is part of this delivery.

## Coverage of the 37 requested deliverables

“Documented” means an inspectable specification/analysis exists; it does not prove market or production acceptance.

| # | Deliverable | Coverage / limit |
| --- | --- | --- |
| 1 | Research | `docs/research`; claims retain source dates/reliability/unknowns; live verification gaps remain |
| 2 | Competitive matrix | `research/competitor-matrix.md`; source-backed comparisons, incumbent depth open |
| 3 | Product positioning | `product/vision.md`, brand messaging; hypothesis awaiting users |
| 4 | Brand strategy | `brand/brand-strategy.md`; reviewed and coherent with plan naming |
| 5 | Brand identity | `brand/brand-identity.md` and original assets; designer finalisation required |
| 6 | Logo direction | A/B/C explored; B li monogram selected for implementation |
| 7 | App icon | Original SVG/PNG/light-dark and sizing variants; store/device evidence open |
| 8 | Font system | Local Geist/Newsreader/GeistMono with OFL notices and measured coverage |
| 9 | Colour system | T3 light/dark semantic tokens and contrast reports; actual screens separately tested |
| 10 | Brand guidelines | `brand/brand-guidelines.md` and asset usage inventory |
| 11 | PRD | `product/prd.md`; future beta requirements separated from current slice |
| 12 | MVP definition | `product/mvp.md`; scoped delivery/exit criteria are targets, not achieved beta |
| 13 | Provider analysis | `research/open-banking-providers.md` and matrices/cost model; no live connector contract |
| 14 | Architecture decision | `architecture/system-architecture.md`, proposals and ADRs; mock-scoped decision |
| 15 | Security architecture | `security/*`; implemented demo guards vs real-data controls explicit |
| 16 | Compliance analysis | `compliance/*`; counsel/contract/DPIA questions remain release blockers |
| 17 | Business model | Revised Gratis/Plus hypothesis, no launch offer income |
| 18 | Unit economics | Reproducible Plus-only formulas/scenarios; assumptions not validated |
| 19 | Pricing hypotheses | Low/Base/High and research/test plan; no billable sale offer |
| 20 | UX principles | `design/design-principles.md`; low-effort/trust/correctness rules |
| 21 | User flows | `design/user-flows.md` and 16 automated browser groups; moderated participant/native validation open |
| 22 | Design system | `design/design-system.md`, brand tokens and prototype usage |
| 23 | Repository architecture | Applications/shared packages, scripts and ADR map exist |
| 24 | Working local environment | PGlite default; frozen install, quality/build checks, three-service startup/HTTP smoke, browser flows and targeted rendering passed; full native/accessibility coverage open |
| 25 | Database schema | Versioned SQL/Drizzle with both drivers; real-PG scenario tests, production roles/RLS unverified |
| 26 | Core domain | Exact money, dates, source/financial types and taxonomy; full product expansion later |
| 27 | Mock financial provider | Implemented with synthetic Italian fixture cases |
| 28 | Initial sync pipeline | Implemented atomic persistent synthetic path; durable production cursor/outbox/jobs later |
| 29 | Initial reconciliation tests | Engine/API cases execute meaningful invariants; no full field-accuracy/25-scenario-production claim |
| 30 | Initial classification/rules | Deterministic classification and sticky corrections/replay; calibrated personal ML and full rule UX later |
| 31 | Mobile application shell | Expo API-driven prototype, web export and automated browser flows; native/store validation missing |
| 32 | Core CI | YAML/scripts and PG variable corrected; local quality/real-PG path passed; remote execution and advisory closure unverified |
| 33 | Documentation | README/contributing/security/status plus specialist documents/review logs |
| 34 | Backlog | `product/backlog.md`; local slice, future beta and Later scope distinguished |
| 35 | Risks | Security/legal/business unknowns and stage blockers documented |
| 36 | Pre-mortem | `product/pre-mortem.md`; subjective correlated risk judgements, no calibrated probability claim |
| 37 | Next milestones | `product/roadmap.md` phases 0–8 with canonical A–G and separate release decisions |

## Commands and repository map

From `/workspace/Lilleri` (or your clone's root), optional `. /workspace/.lilleri-toolchain/env.sh`, then:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Quality commands:

```bash
pnpm lint
pnpm format:check
pnpm check
pnpm test:integration
PG_TEST_DATABASE_URL=postgres://lilleri:lilleri@127.0.0.1:55432/lilleri_test pnpm test:integration
pnpm build
```

The PostgreSQL command requires the existing disposable test service on 55432; other workspaces supply their own `PG_TEST_DATABASE_URL`. `pnpm dev` builds API/client/brand dependencies before starting Next 3000, Expo 8081 and API 3001; PGlite persists under `.lilleri/data`. Optional Compose/migration and independent web-export instructions are in [CONTRIBUTING](../CONTRIBUTING.md). See [README](../README.md) for the package map and [docs map](README.md) for specialist sources.

## Decision and review log

| Issue | Resolution |
| --- | --- |
| Previous README described real licensed aggregation and personal AI as delivered | Lead now states local synthetic scope; actual API/engine/prototype inventory and missing controls separated |
| Setup assumed mandatory Docker and root environment-file loading | PGlite default and real shell/script behaviour documented; optional PostgreSQL explicit |
| API suites could be counted twice across PGlite/PG |149 unique cases (135 core + 14 API) distinguished from repeated driver execution |
| CI database variable could silently skip real PostgreSQL | Workflow/Turbo corrected to `PG_TEST_DATABASE_URL`; actual local PostgreSQL path passed 14 cases; remote CI remains unverified |
| Security contact/SLA was a placeholder | Removed fictional monitored address/SLA; current disclosure limitations explicit |
| Final checks/participant/native/store/legal gates could be inferred from documents | Executed local aggregate/startup/browser-flow/targeted-render checks and unverified full visual/native/user/external acceptance recorded separately |
| Browser automation could be mistaken for visual acceptance | Independent review found dark-theme capture/navigation/blank-name/raw-key defects; fixes, successful targeted checks and new captures recorded without certifying the full matrix |
| Limited scan/audit could be called a security pass | Unresolved audit findings and limited 84-file pattern review distinguished from comprehensive/history scans |
