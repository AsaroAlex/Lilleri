# Lilleri delivery status

**Snapshot:** 2026-10-03. **Scope:** extended local synthetic foundation. This report follows [BRIEF](BRIEF.md); [execution plan](product/execution-plan.md) accounts for every E00–E39 epic. Research dates, commercial assumptions and external gates retain their source context.

## Current outcome

The persistent synthetic financial slice now includes optional local browser identity, revision-guarded reconciliation, versioned category rules, manual accounts/entries/adjustments/reversal, bounded CSV preview/import, audited profile settings/free-beta entitlements, a durable revocation outbox, automatic raw-payload cleanup and a local ZIP ownership export. Expo consumes these capabilities; Next remains a development-stage project page. A frozen synthetic evaluation runner records explicit error/review denominators and abstention. No real bank is connected.

The **37 initial deliverables are foundational delivery**, not completion of the full P0 beta, P1 launch, P2 expansion or Later plan. Local implementation/testing can continue while provider/legal/empirical prerequisites are pending. Remaining technical work is named in the execution plan; it is not disguised as an external blocker. There is no public deployment, store submission, billable purchase, representative accuracy, legally cleared pilot or production-security acceptance claim.

## Implemented extension and limits

| Capability | Actual behaviour | Boundary |
|---|---|---|
| Exact financial foundation | Bigint minor units, separate currencies, SQL calendar dates, atomic/idempotent ingest, conservative links/classification, sticky correction/replay | Mock provider and synthetic fixture names; synchronous mock sync is not a durable bank scheduler |
| Reconciliation revision | SHA-256 token binds profile, candidate/evidence/algorithm, account structure, source leg revisions and decision counter; stale or competing commands return `409` before writes | Balance freshness alone does not invalidate a decision; token is concurrency control, not authentication |
| Local identity | Maintained Better Auth sessions/membership, age/draftterms acceptance, UV passkeys, TOTP/recovery,90-day sessions/revocation and5-minute sensitive-action step-up; signup starts empty | Explicit loopback/nonproduction opt-in; no real email delivery, production recovery, native biometrics or legal approval of terms |
| Client identity lifecycle | Epoch fencing prevents late financial/security responses after logout/renewal/principal change; stale panel401 cannot clear a newer session; erasure clears secrets/data and broadcasts | Browser synthetic evidence; no automatic replay after reauthentication |
| Rules | Structured conditions, canonical category actions, draft/preview/apply/disable/archive/undo-to-draft, source/policy-bound preview and equal-priority conflict review | Remaining tag/split/transfer actions, rule stages and full taxonomy/learning programme are open |
| Manual/import | Opening balances, exact signed entries, balance-only adjustments, revision guards, reversal/audit and scoped idempotency receipts; bounded canonical CSV preview/import/replay | Generic mapper, bank templates, XLSX and native share intake remain open |
| Settings/entitlements | Real display name/IANA timezone, it-IT locale, optimistic revision and immutable audit; Gratis/Plus/free-beta capability policy keeps correctness/privacy/export/delete free | No inert automation controls, English UI, charges/trial lifecycle or verified live-source caps |
| Revocation outbox | Local denial/tombstone and durable generation-specific job commit together; claims commit before I/O, leases/fenced acknowledgement/timeout/bounded retry; pending acknowledgement blocks regrant | Mock capability proven; actual provider adapter/permissions and operational service acceptance remain separate |
| Raw retention | Original ingest+720-hour expiry; metadata survives; replay does not extend/recreate payload. Same-handle scheduled bounded/fair/nonoverlap cleanup and aggregate expired/deleted/error status | Successful synthetic ingest class only; no quarantine, processor, backup/key purge or SLA claim |
| Data ownership | Existing exact JSON plus11-file ZIP: transactions/links CSV, account/rule/category/consent JSON, events, lossless data, JSON Schema, README, digest manifest;32 MiB local bound | User gesture/web download; no expiring external link or async huge export. CSV safety prefix affects risky text only, original JSON remains lossless |
| Evaluation | Frozen original38-scenario/51-transaction fixture, confusion cells, exact denominators, null zero-denominator rates, abstention and labelled relationship metrics | Tiny single-author synthetic regression; no representative3 k corpus, calibration, live audit, model promotion or empirical accuracy |

See [identity](architecture/local-identity.md), [rules](architecture/explicit-rules.md), [manual/import](architecture/manual-accounts-and-import.md), [settings](architecture/profile-settings-and-entitlements.md), [outbox](operations/revocation-outbox.md), [retention](operations/payload-retention.md), [archive export](architecture/data-export.md) and [evaluation](operations/synthetic-evaluation.md) for contracts and limits.

## Executed verification

**Final aggregate passed: 264 distinct tests = 167 core + 97 API.** Core: money 63, domain 35, financial providers 19, engines 50. The API's ten files cover 18 financial integration, 12 identity, 8 rules, 14 manual/import, 8 settings, 12 revocation, 8 raw retention, 9 retention maintenance and 8 archive cases. `pnpm check` completed 22 tasks (21 cached); `pnpm build` completed 10 tasks (9 cached), including fresh final Expo export and Next build evidence from the current source/cache provenance. The final repeat also includes the corrected Expo `--clear` build script. The same 97 API tests passed the actual PostgreSQL-configured Turbo integration path: eight tasks, API test execution uncached. Repeated driver execution is not an additional 97 unique cases.

The complete saved installer was executed with exit 0: pinned Node 22.22.0/pnpm 10.28.0 activation, frozen root/brand installation, check and build. An initially overlapping PostgreSQL command fell back to the system package manager while the installer recreated the toolchain and failed before tests; after confirming the pinned tools again, the full PostgreSQL run above passed. No migration/checksum guard or assertion was weakened.

| Check | Executed evidence | Scope / limit |
|---|---|---|
| Financial browser extension | **17 groups passed,0 JavaScript errors** | Actual two-tab stale decisions, failed refetch/evidence, rules preview/apply/disable/undo, manual audit/reversal/adjustment, CSV replay, settings conflicts and11-file ZIP download;320 px reflow. [Reproduction](reviews/financial-ui-smoke.md) |
| Local identity browser | **16 groups passed,0 JavaScript errors** | Virtual CTAP2 UV, TOTP/recovery, explicit step-up action, late principal/overview/setup/old401 races, cross-tab logout/current-session revoke/erasure and new signup;320 px auth fit |
| Independent passkey boundary probe | Actual register/signin, challenge replay/origin/UV rejection, malformed persisted key and revoked-session refusal passed | Virtual Chromium authenticator, no native-device claim |
| PostgreSQL schema | **12 SHA-256 migrations;16 composite FK;2 immutable triggers**, PG 16.15 | Fresh disposable `lilleri_execution_20261003`; test role is owner/superuser, no production RLS/TLS/PITR acceptance. Legacy/reopen cases deliberately PGlite |
| Scoped UUID compatibility | Actual xcode 3.0.1 resolves CommonJS UUID 11.1.1;1,000 v4 samples/PBX roundtrip and9 malformed-buffer cases passed | Narrow override removes observed UUID advisory; not native iOS/signing validation |
| Dependency audit | **Exit1:2 HIGH,0 MODERATE** | node-forge 1.4.0 and braces 3.0.3 have no patch reported in current registry/audit; [SECURITY](../SECURITY.md), not clean security gate |
| Frozen installs | Root and separate brand toolkit passed; native Sharp16×16 render passed | Toolchain/store outside checkout; ignored build-script warning did not prevent verified prebuilt renderer |
| Local startup | `pnpm dev` HTTP200 for API/Next/Expo; initial5 accounts/35 transactions, EUR/GBP separate, money strings | Disposable validation store now modified by manual tests; preserved prior/user stores. Processes must restart in future tasks |
| Historical foundation checks | Initial 149 tests, 16 browser groups and 2 targeted render groups on 2026-10-02 | Historical evidence is not added to today's distinct-test count; brand 80 contrast pairs/61 assets have recorded source/licence/checksum evidence |
| Remote CI/native/accessibility/user/security/legal acceptance | **Unverified** | YAML, web builds and synthetic passes do not establish executed remote jobs, devices/assistive technology, external audit, users, keys/restore/processors or clearance |

The old disposable `lilleri_test` database contains a checksum from draft migration0010. It is preserved rather than altering applied history or disabling checksum checks. Final12 migration testing uses a new database with frozen files. Current migration runner remains authoritative.

## Gates and remaining execution

A market opportunity and C sustainable business remain commercially unvalidated; Base launch economics can be negative before minimum/fixed costs. B real-data feasibility needs issued provider sandbox access and later verified institution/account-type coverage, acceptable contract/licence route and permissions. D accepts the scoped modular-monolith architecture. E is conditional for synthetic local use and **uncleared for real data/production**, including open release-tooling advisories and absent deployed key/role/backup controls. F has concept/browser evidence rather than participant/native acceptance; G has original brand/artifact evidence rather than professional clearance or recognition measurement.

Next local engineering: audited configuration/observability, non-owner isolation/RLS/encryption/restore; consent/sync budgets/resume/gaps/balance; merchant/taxonomy/privacy/full correction; recurring/monthly insights/safe-to-spend and locale mapper; client offline/i18 n/accessibility/native; representative evaluation/calibration before automation. The complete [execution plan](product/execution-plan.md) names story IDs, priorities, acceptance and owners.

Concrete external requirements: provider-issued sandbox credentials (secure environment settings, never chat), provider contract/legal route/DPIA/taxonomy/processors before real data, actual EU/KMS/backup configuration, consented labelled audits/users/invoices, native delivery/store/device access and professional review. Never collect bank passwords or bypass the official provider flow. P1 billing/release and P2/Later sharing/chat/OCR/offers/expansion retain their stated dependency/evidence triggers.

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
| 21 | User flows | `design/user-flows.md` and initial and continuation automated browser groups; moderated participant/native validation open |
| 22 | Design system | `design/design-system.md`, brand tokens and prototype usage |
| 23 | Repository architecture | Applications/shared packages, scripts and ADR map exist |
| 24 | Working local environment | PGlite default; frozen install, quality/build checks, three-service startup/HTTP smoke, browser flows and targeted rendering passed; full native/accessibility coverage open |
| 25 | Database schema | Versioned SQL/Drizzle with both drivers; real-PG scenario tests, production roles/RLS unverified |
| 26 | Core domain | Exact money, dates, source/financial types and taxonomy; full product expansion later |
| 27 | Mock financial provider | Implemented with synthetic Italian fixture cases |
| 28 | Initial sync pipeline | Implemented atomic persistent synthetic path; durable bank-sync cursor/jobs later; revocation outbox now implemented locally |
| 29 | Initial reconciliation tests | Engine/API cases execute meaningful invariants; no full field-accuracy/25-scenario-production claim |
| 30 | Initial classification/rules | Deterministic classification, sticky corrections and versioned category-rule preview/apply/undo; calibrated personal ML and remaining rule actions/stages later |
| 31 | Mobile application shell | Expo API-driven prototype, web export and automated browser flows; native/store validation missing |
| 32 | Core CI | YAML/scripts and PG variable corrected; local quality/real-PG path passed; remote execution and advisory closure unverified |
| 33 | Documentation | README/contributing/security/status plus specialist documents/review logs |
| 34 | Backlog | `product/backlog.md`; local slice, future beta and Later scope distinguished |
| 35 | Risks | Security/legal/business unknowns and stage blockers documented |
| 36 | Pre-mortem | `product/pre-mortem.md`; subjective correlated risk judgements, no calibrated probability claim |
| 37 | Next milestones | `product/roadmap.md` phases 0–8 with canonical A–G and separate release decisions |

## Reproduction and cloud configuration

From the repository root, activate `. /workspace/.lilleri-toolchain/env.sh` in this cloud workspace, then use frozen install, `pnpm check`, `pnpm build` and `pnpm dev`. [CONTRIBUTING](../CONTRIBUTING.md) documents disposable PostgreSQL, optional identity, worker and browser workflows. Set a new PGLITE_PATH for an independent fixture; never delete an existing store to make a test pass. Native/devices require a separate reviewed arrangement.

The reusable cloud installer and startup instructions are saved as a draft. **Draft revision 4 confirmed by readback** (installer/start instructions match the saved values). Saving does not execute scripts, publish a snapshot or demonstrate restoration in a new task. Network policy/repository membership/secret values were not changed. Optional local identity requires a securely supplied stable local process secret; default demo needs none.

## Continuation review findings

| Concrete issue | Correction and evidence |
|---|---|
| Opposite match commands could overwrite; ABA and account structure could leave stale confirmations | Opaque token and monotonic counter; exact one winner/one409, source/account changes, malformed tokens and no-write financial rejection covered |
| Payload history prevented physical raw deletion/replay could extend retention | Separate expiring payload table, original deadline, replay no-rehydrate, bounded fair scheduler and export expiry boundary |
| Remote revocation failure had no durable recovery; old generation could revoke a replacement grant | Durable generation-specific outbox, safe claims/leases/retries and blocked regrant until acknowledgement |
| Encoded URLs could bypass sensitive-action matching | Registered route identity drives step-up; encoded JSON/ZIP/export/disconnect/delete denial tests |
| Financial erasure and credential cleanup could commit separately | Same transaction callback, cleanup-fault rollback and concurrent session revoke regression |
| Equal-priority category conflict could be missed by a zero-change preview | Full classification/evidence/review comparison; ambiguous candidate remains human-reviewed |
| Late responses could restore old facts/secrets or clear a new session | Financial/security epochs, render-bound child callbacks, immediate erasure and no-echo broadcasts; actual browser races pass |
| Credentialled client could not read default demo CORS | Exact allowlisted origin receives credentialled CORS for both synthetic modes; actual browser and preflight/GET regression pass |
| Metro reused a default-demo transform during an opt-in auth export | Expo build/dev and direct mode-switch exports clear the cache; final fresh auth API/export 16 groups and default startup variant verified |
| ZIP OpenAPI initially described JSON media | Explicit ZIP binary content; actual HTTP/schema/browser download agree |
| UUID vulnerable indirect version required compatibility proof | Scoped supported11.1.1 override, actual CommonJS/xcode/PBX/buffer evidence; forge/braces remain transparently open |

Historical independent review remains dated in [final-review](reviews/final-review.md); the continuation [review](reviews/continuation-review.md) records new evidence and limits. No external certification or paid activity is inferred.
