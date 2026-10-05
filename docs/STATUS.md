# Lilleri delivery status

## European bank directory — 2026-10-05

Published commit `d377327e67310086833e220543c11c0bb21c3413`, Railway deployment
`804c2af2-1ab5-4a99-9719-ec7d592f3e51` **SUCCESS**, verified at 11:41 Europe/Rome.
Latest request: add European banks. Added 44 country-specific entries, making 62
services across 16 markets (59 bank entries, 2 cards, 1 wallet). Italy remains the
18-choice default; the country selector, translated market labels and combined
country/type/alias search expose the wider catalogue without merging bank markets.
Exact live bindings must match the entry's country. All automatic routes still need
activation, and new statement formats remain unverified. The Italian builder and
old-response UI retain compatibility; archives and protected public access are unchanged.

Targeted provider directory 25, API 3 on PGlite and PostgreSQL passed. Read-only browser
acceptance: European 9 groups/56 layouts, Italian 6 groups, product 8 groups/134 surfaces,
no API writes or server-settings/finance changes. Repository check passed 23/23 tasks:
API 592 passed/3 skipped, mobile 66, provider 343. Matching compiled bundle
`index-ac1a7308521b77d2d05060977c6ac5c6.js` was tested locally and served HTTP 200
by the final deployment, together with health/directory/overview/export. Public metadata
has 62 configuration-required entries and 16 markets; active finance is still empty.
The full canonical owned archive (5 accounts/35 transactions/1 connection) and immutable
retirement audit compare identical before/after. No migrations, financial verification
POST or Railway settings changed. The owned local runtime is stopped, archive retained.
Post-release evidence is committed locally until the next functional push. See `docs/operations/european-bank-directory-20261005.md` and
`docs/research/european-bank-directory-20261005.md`; release evidence is in
`docs/operations/european-bank-directory-release-20261005.json`.

## Product interface and shared access — 2026-10-05

Published at [Lilleri](https://lilleri-production.up.railway.app/): commit `c837feb`,
Railway `dad4c7dc-1254-479b-88be-082606471cc5` **SUCCESS**, verified at 11:14
Europe/Rome. Removed prototype framing and updated Italian/English import and
rule workflows without bypassing confirmation. Public display preferences are local
to each device, public financial/profile writes and deletion are protected, and
personal manual-account shortcuts remain available with authenticated identity.
Internal provenance and archives are preserved. Hosted personal access and live bank
activation remain necessary. Repository 23/23, API 592/3 skipped, mobile 62,
provider 337, focused PostgreSQL 10/10. Final frontend and 8 browser groups
(134 surfaces) passed. The exact new web bundle and public read endpoints returned
HTTP 200; active finance stays empty and canonical owned archive/retirement audit
remain unchanged. No migrations or Railway settings changed.
See [scope and validation](operations/product-release-20261005.md) and
[release proof](operations/product-release-20261005.json).

## Italian banks, cards and wallet selector — 2026-10-05

Published commit `33e050a`, Railway deployment
`4ddd2a8a-b2e0-4988-ab7a-21594c4c6899` **SUCCESS** at
[Lilleri](https://lilleri-production.up.railway.app/). Home opens 18 services,
including the major Italian banks, Amex and Satispay, with search, type filters,
focused details and official links. All automatic routes still require activation;
personal Amex/Satispay CSV/XLSX exports remain unverified. Their PDF guides do not
enable PDF import. App-specific server-only Yapily LIVE/IT discovery is implemented
as an unregistered read-only adapter; live authorization/identity/storage are pending.

The repository check passed 23/23 tasks (API 586/3 skipped, provider 337, mobile 48).
Three new API tests passed on PostgreSQL. Final mobile/type/copy and read-only
browser acceptance cover 320–1440px, search, routing, focus, retry, English and dark
display. Public health/catalogue/demo/export and the exact new web asset returned
HTTP 200. Active finance stays empty; all owned 35/5/1 rows and retirement audit
compare identical before/after. No Railway configuration or migration changes.
See [release proof](operations/italian-connections-release-20261005.json).

## Visual finance UI and empty preview — 2026-10-05

Published at [Lilleri](https://lilleri-production.up.railway.app/): commit `875973d`,
Railway `a7fb1b6c-619f-4a16-a24f-b9eb2d0f89d9` **SUCCESS**. Original illustrations,
compact account tiles, dated transaction groups, expandable filters, guided decisions
and Settings → Privacy are live. Observation dates follow the profile timezone.

Public Home, ledger search and 90-day history show zero accounts/transactions.
Exactly 35 mock rows, 5 accounts and 1 connection were retired. A read-only public
ownership export still contains all 35/5/1 canonical records, retirement revision 1
and one immutable event after the second deployment. Archive/recovery paths and the
existing volume remain unchanged. The empty preview prevents mock reappearance and
refuses personal uploads until protected identity exists.

The complete check passed 23/23 tasks: API 583/3 skipped on PGlite, 585/1 skipped on
PostgreSQL, 46 files; provider 265 and mobile 45. PostgreSQL restore passed 8/8 with
37 migrations. Browser proof includes 14 visual, 8 interactive, 5 source and 7 guided
groups; final empty layouts and midnight/timezone display passed separately. A local
cleanup retained a manual expense and exact EUR97.75 balance. Final UI-only refinements
passed typecheck/build and targeted browser checks after the full repository run.

The official Modelo authorization protocol client is prepared but unregistered;
live bank access, provider resources and protected hosted runtime remain incomplete.
The first bank/country/provider account is still missing user information.
[Review](design/finance-ui-review-20261004.md) ·
[release evidence](operations/finance-ui-clean-release-20261005.json) ·
[cleanup semantics](operations/empty-preview-fixtures.md).

## Neutral UI / UX iteration — 2026-10-04

The founder's colour feedback is applied at [Lilleri](https://lilleri-production.up.railway.app/):
`e55479b`, Railway `a5f09884` **SUCCESS**. The neutral Graphite & Blue palette and regenerated
logo/assets accompany compact headings, clear source/category destinations, financial rows
before secondary tools and quiet settings navigation. Local acceptance: 80/80 contrast
pairs, 45 mobile tests, nine responsive widths, both themes, keyboard focus, complete IT/EN
amounts, nonoverlapping metrics and a read-only large-value fixture; actual browser groups
5/3/8. Fresh public health, HTML and exact bundle plus runtime readiness are verified.
The original connection, five exact balances and all 34 visible transaction IDs/amounts
matched the immediately preceding snapshot. This is a visible-snapshot comparison,
not ownership/archive-wide certification. [Review](design/ui-ux-review-20261004.md) ·
[release evidence](operations/neutral-ui-release-20261004.json).

## Integrated roadmap increment — 2026-10-04

The combined local increment implements bounded missing-ID ordinals/renewal aliases;
explicit pending replacement/terminal histories and reversible Inbox source choices;
seven-day reviewed CSV/bank links and account-specific, evidence-based history recovery;
scoped full-history search and actual 90-day history with revision-bound continuation;
and encrypted original/billed FX evidence, correction history, detail and ownership export.
Missing or contradictory source evidence remains explicit and never fabricates money,
a booking, a rate or bank-history completeness. Original canonical audit is retained.

| Verified gate | Result | Evidence / limit |
| --- | --- | --- |
| Combined repository check | **23 Turbo tasks passed**; API **579 passed / 3 skipped**, 45 files | `/workspace/.lilleri-validation/roadmap-check.log`; PGlite/default path. Earlier counts below describe prior phases. |
| Complete PostgreSQL API suite | **581 passed / 1 skipped**, 45 files | `/workspace/.lilleri-validation/roadmap-postgres-api.log`; isolated synthetic PostgreSQL 16 target. This reruns the same suite, not additional distinct tests. |
| Actual PostgreSQL dump/restore | **8/8 checks passed**, all **36 frozen migration checksums** | `/workspace/.lilleri-validation/roadmap-postgres-drill.json`; exact money, authenticated inputs, current independent keys/journals, deletion replay, RLS/token invalidation and quarantined restore. `productionBackupAccepted: false`. |
| Hosted identity/readiness | Optional HTTPS factory/client, mandatory verification/recovery delivery port and atomic quota contracts tested; readiness always **`productionReady: false`** | Default server/preview remains synthetic. Reviewed hosted entry point, external key/journal runtime, approved notices and deployed delivery are incomplete. [Readiness](operations/hosted-readiness.md). |
| Official sandbox adapter | Documented Yapily Modelo read adapter and zero-I/O prerequisite check implemented | Reader is unregistered; issued application/consent, authorization/exchange/renewal/revocation and admitted durable sync remain required. No bank connection was made. |

The roadmap increment and original account-register design are now published at
[Lilleri](https://lilleri-production.up.railway.app/): commit `54c35c2`, Railway
`91590ba9-4a81-4547-aa2f-c6a94655222c` **SUCCESS**. Fresh public HTML, the exact new bundle,
health, demo, search, 90-day history, pending/source choices and FX reads returned 200.
The original connection, five exact account balances and all 35 transaction IDs/amounts
survived. The register uses Newsreader headings, a numbered index, aligned financial rows
and side-by-side spending/accounts on wide screens. Nine widths (320–1440 px), dark
appearance and keyboard skip/focus passed; local browser groups passed 5 source-decision,
3 cross-source-import and 8 complete interactive checks. Public writes remain for user
feedback. [Release evidence](operations/original-design-release-20261004.json).
All 40 epics retain unfinished stories/acceptance; the reconciliation catalogue remains
**4 supported / 18 incomplete / 3 expected unsupported**. See [parallel release order](operations/parallel-development.md).

## Compiled Railway preview — 2026-10-04

Commit `3efd4ab` reached Railway SUCCESS (`7dc1df94`). The image builds the API and exports the financial web UI once; runtime starts the API, loopback asset server and gateway, without Metro/Next/watchers. The existing volume/recovery namespace is unchanged. Fresh public health/demo reads preserved the original connection and all five exact account balances. Three asset-boundary tests and all eight local browser flows pass; local total RSS was approximately0.55GB. Deployed memory is not yet measured; retain the3GB cap. This establishes an online synthetic preview, with public user identity and real bank access still gated.

## Interactive development iteration — 2026-10-04

`pnpm dev:cloud` now provides a supervised same-origin browser preview on port
8080, with Expo/Next reload and serialized checked API/package rebuilds. It uses
a separate persistent synthetic archive and independent home-directory recovery
records; existing archives are preserved. A compiler failure retains the running
API. Production/auth/database overrides are refused. Standard Turbo also now
forwards the source-erasure journal path, and the Next demo link can point to an
explicit gateway URL.

The frozen installation, full check (23 Turbo tasks, existing API448pass/3skip),
fresh core/mobile396, thirteen gateway/process/rebuild tests and eight actual
browser flow groups pass. Live frontend HMR uses same-origin WebSockets through
8080 even from a mapped remote hostname; backend compiler failure/corrected save
and exact source restoration preserve the ledger. Browser manual writes target
only an isolated fresh synthetic store. Reports are outside the checkout at
`/workspace/.lilleri-validation/iterative-*`.

The goal remains a real-bank/public MVP. The founder has a verified synthetic Railway preview; no provider account/contract or custom domain has been supplied. This iteration establishes a development workflow;
unfinished P0 software, official adapter/access, production identity and deployed
security/release acceptance remain open. See [repository analysis and next
steps](operations/interactive-development.md) and the existing execution plan.

**Foundation snapshot:** 2026-10-03. **Scope:** extended local synthetic foundation; the 2026-10-04 integration and its gates are recorded above. This report follows [BRIEF](BRIEF.md); [execution plan](product/execution-plan.md) accounts for every E00–E39 epic. Research dates, commercial assumptions and external gates retain their source context.

## Foundation outcome and integrated capabilities

The persistent synthetic financial slice now integrates durable bounded sync jobs, foreground refresh, conservative pending/source-removal attention, private merchant aliases and a 72-leaf local taxonomy, recurring feedback, bounded CSV/XLSX import, persisted Italian/British English ICU copy, encrypted understanding choices/monthly history and an encrypted read-only browser cache. Connection creation performs provider I/O outside financial SQL transactions. Source retain/erase choices use an independent authenticated journal and generation proofs; old backups must replay those intents before opening. Ownership JSON and the eleven-file ZIP include the available new histories.

These extend exact money, optional local identity, forced financial RLS, audited runtime policy, selected-field encryption, profile erasure, masked support, rules, manual finance, notifications and raw cleanup. Expo uses the implemented paths; Next is a project/plan page and a separate local preview launcher enforces the documented zero-initial-cash scenario. Local evaluation tools validate split/metric/shadow-policy contracts; the original frozen toy fixture remains a regression runner. No real bank is connected.

The **37 initial deliverables are foundational delivery**, not completion of the full P0 beta, P1 launch, P2 expansion or Later plan. Local implementation/testing can continue while provider/legal/empirical prerequisites are pending. Remaining technical work is named in the execution plan; it is not disguised as an external blocker. The public Railway URL hosts a shared synthetic preview. Store submission, billable purchases, representative accuracy, a legally cleared pilot and production-security acceptance remain unclaimed.

## Implemented extension and limits

| Capability | Actual behaviour | Boundary |
|---|---|---|
| Exact financial foundation | Bigint minor units, separate currencies/calendar dates, atomic idempotent ingest; durable jobs/leases/budgets, encrypted checkpoints and complete-only financial application | Synthetic runtime adapter; bounded no-ID/renewal identity and explicit hold lifecycles now implemented. Provider-specific fuel/tolerance stages, whole-case acceptance and real provider semantics remain open |
| Reconciliation revision | SHA-256 token binds profile, candidate/evidence/algorithm, account structure, source leg revisions and decision counter; stale or competing commands return `409` before writes | Balance freshness alone does not invalidate a decision; token is concurrency control, not authentication |
| Local identity | Maintained Better Auth sessions/membership, age/draft terms acceptance, UV passkeys, TOTP/recovery, 90-day sessions/revocation and 5-minute sensitive-action step-up; signup starts empty | Default runtime remains loopback/nonproduction. Optional HTTPS hosted contracts/client and real mail port are implemented/tested, with no deployed delivery, reviewed production bootstrap, native biometrics or approved terms |
| Client identity lifecycle | Epoch fencing prevents late financial/security responses after logout/renewal/principal change; stale panel401 cannot clear a newer session; erasure clears secrets/data and broadcasts | Browser synthetic evidence; no automatic replay after reauthentication |
| Rules | Structured conditions, canonical category actions, draft/preview/apply/disable/archive/undo-to-draft, source/policy-bound preview and equal-priority conflict review | Remaining tag/split/transfer actions, rule stages and full taxonomy/learning programme are open |
| Manual/import | Exact manual opening/entry/adjustment/reversal; explicit IT/EN CSV/XLSX mapping, preview/revision/receipt fencing and permanent physical worksheet provenance | CSV256KiB/1,000 rows; XLSX512KiB/4MiB inflation/1,100 physical rows; typed Excel/serial dates, formulas/macros/unsafe ZIP are refused. Reviewed seven-day cross-source candidates/link receipts and duplicate undo/reimport memory now implemented. Verified per-bank templates, broader supersession acceptance and native share remain open |
| Server ledger and FX | Scoped full-history search and actual 90-day history; 100-row/1,000-scan/128KiB bounds, profile/filter/revision HMAC cursors; encrypted original/billed amounts, literal dated rates and correction/conflict history | No inferred conversion/forecast/complete bank coverage. Representative large-archive latency, complete field locks and persisted/native projection cache remain open |
| Source Inbox choices | Explicit changed-amount accept/undo and keep-manual/remove/undo with fresh revision proofs; both read projections use the authoritative lifecycle; removed source facts remain reviewable and owned | Quiet/private facts stay out of review cards but remain in owner export. Whole-case acceptance, fuel/tolerance matching and batch undo remain open |
| Settings/entitlements | Audited display name/IANA timezone/it-IT or en-GB locale, exact ICU formatting and immutable history; honest free-beta entitlements | No charges/trials/complete live-source admission. Source/user/legal text keeps its actual language |
| Revocation outbox | Local denial/tombstone and durable generation-specific job commit together; claims commit before I/O, leases/fenced acknowledgement/timeout/bounded retry; pending acknowledgement blocks regrant | Mock capability proven; actual provider adapter/permissions and operational service acceptance remain separate |
| Connection trust | Synthetic scoped discovery/consent lifecycle, crash-safe creation intents, compensating exact-grant revocation, durable start/progress/resume and retain/erase UI | No actual institution/hosted redirect. Uncertain late grants remain blocked; completed-window exact gap/direct import recovery now implemented. Renewal-all and admitted official lifecycle remain open |
| Runtime configuration | Strict persisted documents and immutable revisions/digests; concurrent-edit fencing and rollback create new versions; actual maintenance, lifecycle, observability and understanding consumers reload configuration | Trusted synthetic PostgreSQL operator; no customer HTTP edit route or credentials/free text in config. Full automation/refresh consumers and deployed operator identity remain open |
| Safe observability | Official OpenTelemetry sampled local traces, fixed operation labels, bounded counters, scrubbed logs and loopback aggregate diagnostics; strict semantic catalogue with default-off optional delivery | No network exporter, raw URL/body/error/finance or identity labels. Small-cell suppression does not prove anonymity; DPO review and deployed alerts/response remain open |
| Financial isolation | Reserved personal household/account membership/scope, composite ownership references and ENABLE/FORCE RLS; scoped non-owner request transactions buffer success until commit | Independent non-owner PostgreSQL login is locally exercised. Fallback SET LOCAL ROLE retains trusted session authority; application process still holds explicit trusted credentials. No sharing or deployed least-privilege/TLS proof |
| Profile encryption | AES-256-GCM per-profile DEK envelope with field/row/profile AAD, blind-index primitive and independent filesystem vault; selected financial/raw/manual/mapping fields encrypt/decrypt through the scoped service | Local synthetic key provider, selected fields only; full E1–E4, identifier/tokenisation/index integration, KMS, rotation/key-copy inventory and production acceptance remain open |
| Masked support | Owner-granted short-lived access, typed ticket/reason, trusted operator identity port, MFA/two-person approval and immutable owned audit; diagnostics expose bounded health/counts | No public asserted-operator route, financial content unlock, deployed staff identity or actual human incident approval/drill |
| Raw retention | Original ingest+720-hour expiry; metadata survives; replay does not extend/recreate payload. Same-handle scheduled bounded/fair/nonoverlap cleanup and aggregate expired/deleted/error status | Successful synthetic ingest class only; no rejected-input quarantine retention, processor deletion, backup expiry or SLA claim |
| Privacy | Audited reversible rules-only classification and transaction quiet/private flags; current draft purpose records/evidence, revision-only withdrawal and six-month re-prompt boundary | Owned ledger/export stays intact. Quiet evidence is removed; private liabilities withhold availability. External AI/identified analytics unavailable; local preferences are not approved notices/native OS permission |
| Local notifications | Content-free feed/preferences, quiet IANA/DST and fair bounded pump; actual Inbox, export, balance mismatch and complete saved-month summary producers | Optional N-SERVICE starts off; rights/security independent. Native push/OS permission and acceptance remain open |
| Monthly understanding | Exact observed currency totals/refunds/evidence; encrypted immutable snapshots and bounded keyset history, current privacy filtering and signed-source redaction | Incomplete source coverage remains partial; no fabricated historical snapshots or calibrated probabilities |
| Safe-to-spend | Explicit selected accounts/horizon/per-currency buffers, persisted encrypted choices with revision/digest fencing and undo, exact conservative formula | Unknown/stale balance, coverage or private liabilities return unavailable; verified bank semantics and watchlists remain open |
| Data ownership | Exact JSON and eleven-file ZIP with available consent/support/privacy/notification/mapping histories; new identity/pending/source-choice and encrypted FX histories; decrypted owned mappings and durable value-date provenance; JSON Schema/digest manifest and 32 MiB bound | GET snapshots are read-only; explicit POST can create an essential completion notice. No expiring external link/async huge export or invented historical events. CSV safety prefix leaves original JSON lossless |
| Erasure and restore | Profile key finalization plus independent authenticated source intents/receipts, exact logical-content/new-generation proofs and quarantine replay; signed histories validated in ownership exports | Source erasure retains the shared profile key. A stale journal/vault pair, unknown proofs or pending replay cannot certify readiness. No processor/every-copy/PITR claim |
| Evaluation | Original38-scenario/51-transaction runner; local disjoint-split validation, denominators/calibration metrics, shadow-review and immutable policy metadata; explicit25-case reconciliation catalogue | Catalogue4 supported/18 incomplete/3 expected unsupported. Tiny synthetic tools refuse representative promotion; no fitted model/calibrator/runtime promotion or empirical accuracy |

Contracts: [identity](architecture/local-identity.md), [rules](architecture/explicit-rules.md), [manual/import](architecture/manual-accounts-and-import.md), [CSV mapper](operations/locale-csv-mapper.md), [settings](architecture/profile-settings-and-entitlements.md), [discovery](architecture/provider-discovery-contract.md), [consent lifecycle](architecture/consent-lifecycle.md), [runtime configuration](operations/runtime-configuration.md), [observability](reviews/local-observability.md), [PostgreSQL isolation](architecture/postgresql-isolation.md), [profile encryption](architecture/profile-envelope-encryption.md), [support](reviews/local-support-access.md), [privacy](operations/privacy-controls.md), [notifications](reviews/local-notifications.md), [understanding](architecture/observed-understanding.md), [outbox](operations/revocation-outbox.md), [retention](operations/payload-retention.md), [archive export](architecture/data-export.md), [restore](operations/deletion-aware-restore.md) and [evaluation](operations/synthetic-evaluation.md).

## Historical continuation verification — 2026-10-03

**Historical phase: 847 distinct Vitest cases = 361 core + 451 API + 35 mobile.** Core: money63, domain42, engines142 and providers114. The complete default API execution passes448 and intentionally skips3 PostgreSQL-only cases. The complete fresh PostgreSQL run passes450 with1 independent-second-cluster skip; that scenario passes in the separate16/16 two-cluster proof. Repeated execution on another driver does not add cases. The separate Node contract suites pass41 groups: configuration AST4, copy AST3, evaluation19 and zero-budget bootstrap15.

The exact cloud installer exits0 after frozen root/brand installation,23 successful check tasks and10 successful build tasks, including Next and a cleared Expo web export. All31 SQL migration checksums match the fresh PostgreSQL database `lilleri_continuation_signed_final_20261003`. The complete isolation suite16/16 uses14 PostgreSQL cases with two actual same-name Unix-socket clusters/separate non-owner runtime credentials and2 explicit PGlite guard fixtures; a second scoped proof checks24 financial tables in9 groups. Neither applied migration files nor stored checksums were rewritten.

| Current proof | Executed evidence | Boundary |
|---|---|---|
| API/database |37 API files; PostgreSQL450 pass/1 skip and default448 pass/3 skips; mapped module23/23 on both drivers | The remaining skipped scenario passes in the independent two-cluster proof. Filesystem/singleton fixtures deliberately remain PGlite; collector tests use no database |
| Sync and creation |44 durable-sync cases and17 creation cases on each driver; maintenance12 on each driver | Synthetic provider, generation/lease/deadline and uncertain-grant fencing; no real-bank finality inferred |
| Mapped signed-clock regression |CSV/XLSX actual HTTP first reproduce409, then pass23/23 module cases on both drivers with encryption/current journal/advancing clock |Command, import, audit, provenance and generation proofs share one captured instant; strict source guards unchanged |
| Source/crypto/restore |42 focused cases on each driver;4 actual HTTP routing cases;5 compiled CLI checks | Independent current journals/vault anchors and exact new-generation proofs required. Source erase retains the shared profile key |
| Understanding |16 persistence cases on each driver; current calculation suite; actual App9 and persistence12 groups,0 page errors | Save/reopen/undo, stale409 after refresh, immutable history, privacy, original owned archive and idempotence. Only complete nonempty new captures can produce the optional summary notice |
| Current browser acceptance |133 flow groups pass with0 page errors: financial17, auth16, understanding9, persistence12, connection9, privacy10, notifications7, mapped9, XLSX7, merchant10, locale7, actual App cache10 and durable sync10 | Exclusive demo writers ran sequentially. Auth uses a separate archive. The historical table below is not added to these current counts |
| Durable acquisition/source decision |10/10 browser groups;230 windows,11 explicit UI continuation gestures,0 preflight resume slices | Complete-only financial application, no idle polling, retain followed by acknowledged bank-source erasure; other sources and full owner ZIP hashes preserved. The disposable bank source remains erased |
| Web accessibility |13 checks in Italian and the same13 in British English pass with0 page errors/forwarded writes |Keyboard/modal focus, headings/checked states, live atomic attributes,44CSSpx,320px, Home with200% DOM text, reduced motion and active light/dark contrast. Locale restored with current revision; browser zoom, native/assistive/external certification remain unexecuted |
| Frozen evaluation |38 scenarios/51 transactions pass against the current engine | Original author-labelled toy fixture, separate from the25-case catalogue (4 supported/18 incomplete/3 expected unsupported) and19 evaluation-contract groups |
| Zero-investment startup |`check:zero`, `economics:zero` and actual `dev:zero` startup pass; API3191 and Expo localhost8181 are ready;5 accounts/35 transactions with exact money strings and dedicated CORS | Separate synthetic archive, independent home-directory vault/journal, no paid service or bank activation |
| Dependency audit |2 HIGH,0 MODERATE,0 CRITICAL; expected exit1 | node-forge1.4.0 and braces3.0.3 still have no patch reported; production security remains uncleared |
| Current development startup |`pnpm dev`: Next3000, API3001 and Expo localhost8081 HTTP200; fresh5-account/35-transaction EUR/GBP demo with exact money strings; actual browser renders one H1/navigation with0 page errors | Separate persistent archive and independent vault/source journal; prior archives preserved. This proves the current process startup, not fresh-task restoration |
| Cloud configuration |Draft revision8 saved and read back with exact tested install/start scripts | Repository membership, network preset, secrets and runtime requirements preserved. Available tools expose draft read/update, not publication; publication and fresh-task restoration are unverified |

Logs and content-free proof reports are retained outside the checkout in `/workspace/.lilleri-validation`, including `continuation-pulled-final-installer.log`, `continuation-last-check.log`, `continuation-last-build.log`, `continuation-signed-final-postgres.log`, `continuation-signed-final-postgres-migrations.tsv`, `continuation-final-migration-sha256.txt`, `continuation-new-rls-proof.json`, `rls-socket-31-20261003/final-proof.json`, the current browser reports and `continuation-cloud-ready-{start-proof,browser}.json`. The requested pull fast-forwarded through `cf608e0` (PR3); integration checkpoint `e10f10672072cef05927de07ae434c4f69718538` and web announcement fix `0dda407` are committed and pushed.203 modified/untracked files were independently archived, hash-verified and stashed before integration. Existing stores and preservation stashes remain intact. The counts below describe the starting commit `5bbdec9` and are retained as historical evidence.

## Historical verification of the starting commit

**Starting phase verification passed: 553 distinct Vitest cases = 265 core + 288 API.** Core: money 63, domain 35, providers 85 and engines 82. The complete saved installer exited 0 after frozen root/brand installation, `pnpm check` (22 successful tasks) and `pnpm build` (10 successful tasks, including Next/Expo web). The default API run passed 285 cases and intentionally skipped 3 PostgreSQL-only cases. The actual PostgreSQL-configured Turbo path passed 287 API cases with 1 independent-second-cluster skip, across 8 successful tasks. That last scenario also passed in the separate 16-case two-cluster RLS proof. Repeated driver execution does not create additional distinct cases. Four separate Node configuration-lint groups and the 10-consumer/17-field AST guard also pass.

PostgreSQL-only cases are intentionally skipped in the default PGlite suite. An ordinary configured PostgreSQL run additionally skips the independent second-cluster fixture unless `PG_TEST_OTHER_CLUSTER_URL` is provided. That separate two-cluster proof has run successfully. Filesystem backup/reopen and isolated singleton-configuration cases deliberately remain PGlite scenarios even in the PostgreSQL-configured command; collector tests run without a database. No migration/checksum guard or assertion was weakened.

| Check | Executed evidence | Scope / limit |
|---|---|---|
| Financial browser extension | **17 groups passed, 0 JavaScript errors** | Current-phase actual two-tab stale decisions, failed refetch/evidence, rules preview/apply/disable/undo, manual audit/reversal/adjustment, CSV replay, settings conflicts and eleven-file ZIP download; 320 px reflow. Report: `completion-financial-ui.json`; [reproduction](reviews/financial-ui-smoke.md) |
| Connection browser | **9 groups passed, 0 JavaScript errors** | Actual pause/refresh denial, renewal preserving pause/finance, stale revision without replay, fresh resume/history, 320 px reflow and late-response fence. Unknown coverage UI is an explicitly injected synthetic view; the actual server denies that choice. Report: `completion-connection-ui.json`; [reproduction](reviews/connection-ui-smoke.md) |
| Privacy browser | **10 groups passed, 0 JavaScript errors** | Actual rules-only dictionary exclusion/reversal, local service grant/withdrawal, quiet/private persistence with ledger/export preservation, stale choice without replay, 48-point controls, 390/320 px reflow and reload/cleanup. Obsolete disclosure view is explicitly injected; revision-only withdrawal uses the actual API. Report: `privacy-ui-smoke.json` |
| Local identity browser | **16 groups passed, 0 JavaScript errors** | Fresh latest compiled API and cleared auth export: virtual CTAP2 UV, TOTP/recovery, explicit step-up, late principal/overview/setup/old-401 races, cross-tab logout/current-session revoke/erasure and empty new signup; 320 px auth fit |
| Notification/understanding/mapped-import browser | **7 + 9 + 9 groups passed, 0 JavaScript errors** | Actual final in-app feed/preferences/read/navigation and POST ZIP; month/account/buffer/horizon/formula/quiet handling; saved mappings, lost-success retry, duplicates, stale conflicts, archive/restore and unmount. Shared demo writers ran sequentially on a disposable archive |
| Independent passkey boundary probe | Current compiled probe passed actual register/signin and rejected replay, tampered origin, absent UV, malformed stored key and revoked session | Virtual Chromium authenticator; separate from the fresh final 16-group auth run, no native-device claim |
| PostgreSQL schema/isolation | **22 frozen SHA-256 migrations; 16 isolated RLS cases passed**, PG 16.15 | Actual independent non-owner credential, pooled transaction-context fencing, owner/admin refusal and same-name separate Unix-socket cluster rejection. Trusted fixture provisions the restricted login; no production RLS/TLS/PITR acceptance |
| Runtime configuration/telemetry | Dedicated strict configuration and privacy tests; four Node AST regression groups and maintained-consumer scan; actual compiled PostgreSQL operator/worker proof; safe collector/Fastify tests | Configuration proof spans concurrent edits/rollback/pause/re-enable/restart and six audited revisions. Collector tests are in-process redaction/label tests; they are not extra SQL isolation scenarios |
| Local key/restore boundary | Targeted crypto/storage/restore proofs passed on PGlite and configured PostgreSQL; actual compiled recovery CLI exercised a pre-erasure encrypted 35-row snapshot | Expected-key wrong-vault refusal, current-vault unreadability, atomic rollback and quarantined latest-journal replay. PGlite filesystem-copy cases prove the local recovery contract; no historical-vault/media/KMS/PITR/processor acceptance |
| Audit parent erasure | Consent/retention focused suites: **30 passed on PGlite and 30 on PostgreSQL** | New migration 0022 allows exact absent-parent cascades while direct journal deletion stays denied; source descendants erased, independent profile/support history retained until profile erase |
| Scoped UUID compatibility | Earlier actual xcode 3.0.1/CommonJS UUID 11.1.1 probe: 1,000 v4 samples/PBX roundtrip and nine malformed-buffer cases passed | Narrow override remains in the current lockfile and removes the observed UUID advisory; not native iOS/signing validation |
| Dependency audit | **Exit 1: 2 HIGH, 0 MODERATE** | Current production audit: node-forge 1.4.0 and braces 3.0.3 have no patch reported; [SECURITY](../SECURITY.md), not a clean security gate |
| Frozen installs | Complete installer passed after all source fixes; root and separate brand toolkit frozen installs; historical native Sharp 16×16 render | Node 22.22.0/pnpm 10.28.0 and cache/store outside checkout; final combined installer/check/build repeat exited 0 |
| Local startup | `pnpm dev` API/Next/Expo readiness and synthetic initial 5 accounts/35 transactions verified; fresh compiled loopback API and cleared Expo served the current browser checks | Current disposable validation archive has extra manual-test records; prior/user stores preserved. Processes must restart in future tasks |
| Synthetic evaluation | **38 scenarios/51 transactions passed** against the current engine | Original author-labelled toy fixture; exact-money/schema expectations and explicit denominators. No representative accuracy, calibration or automation readiness follows |
| Historical continuation aggregate | **264 distinct tests = 167 core + 97 API**, 22 check tasks, 10 build tasks; same 97 API cases passed the eight-task PostgreSQL-configured path | Earlier committed continuation through b85b307: money 63/domain 35/provider 19/engine 50, 12 migrations and complete installer exit 0. Superseded evidence is retained here, not presented as the current test count |
| Historical foundation checks | Initial 149 tests, 16 browser groups and 2 targeted render groups on 2026-10-02 | Historical evidence is not added to today's distinct-test count; brand 80 contrast pairs/61 assets have recorded source/licence/checksum evidence |
| Remote CI/native/accessibility/user/security/legal acceptance | **Unverified** | YAML, web builds and local synthetic role/key/restore passes do not establish executed remote jobs, devices/assistive technology, external audit, users, production processors or clearance |

The old disposable `lilleri_test` database contains a checksum from draft migration 0010. It is preserved rather than altering applied history or disabling checksum checks. Current phase testing uses fresh databases with frozen files. Migration 0022 corrects cascade behavior without rewriting the already-applied immutable-audit migrations. The migration runner remains authoritative.

## Gates and remaining execution

A market opportunity and C sustainable business remain commercially unvalidated; Base launch economics can be negative before minimum/fixed costs. B real-data feasibility needs issued provider sandbox access and later verified institution/account-type coverage, acceptable contract/licence route and permissions. D accepts the scoped modular-monolith architecture. E has additional local isolation/encryption/restore/support evidence but remains **uncleared for real data/production**, including open release-tooling advisories, incomplete encryption-class coverage and absent deployed KMS/role/key-copy/backup controls. F has concept/browser evidence rather than participant/native acceptance; G has original brand/artifact evidence rather than professional clearance or recognition measurement.

Next local engineering: own-IBAN/missing-leg evidence, fuel/tolerance matching, whole-case reconciliation acceptance and batch/session undo; complete feedback/field-lock/rule actions/stages and fitted automation-policy consumers; representative search-load and persisted/native cache acceptance; renewal-all, admitted official-provider authorization/exchange/renewal/revocation and durable sync; reviewed hosted bootstrap/authenticated financial scope and external key/current remote deletion-journal runtime; broader encryption/index/tokenisation, retention classes and explanatory rights entry. Bounded sync identity, explicit hold/source decisions, reviewed cross-source import, server search/90-day history, FX provenance and evidence-based gap recovery now have local proof. Representative authorised data is still required for empirical promotion. The complete [execution plan](product/execution-plan.md) names story IDs, priorities, acceptance and owners. Provider, legal and empirical gates do not suspend those independent software tasks.

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
| 25 | Database schema | 36 frozen SQL/Drizzle migrations, both drivers, reserved tenancy and actual non-owner forced-RLS/isolation proof; deployed role/TLS/PITR acceptance remains unverified |
| 26 | Core domain | Exact money, dates, source/financial types and taxonomy; full product expansion later |
| 27 | Mock financial provider | Implemented synthetic Italian fixtures plus validated institution/discovery/authorization/renewal contract; no real institution implied |
| 28 | Initial sync pipeline | Durable bounded synthetic sync jobs/checkpoints/budgets/leases and foreground refresh, complete-only atomic apply and revocation outbox; actual bank adapter remains gated |
| 29 | Initial reconciliation tests | Engine/API cases execute meaningful invariants; no full field-accuracy/25-scenario-production claim |
| 30 | Initial classification/rules | Deterministic classification, sticky corrections and versioned category-rule preview/apply/undo; calibrated personal ML and remaining rule actions/stages later |
| 31 | Mobile application shell | Expo API-driven auth/financial/consent/privacy/notification/understanding/merchant/recurring/CSV-XLSX surfaces and web export; actual browser execution stated above, native/store validation missing |
| 32 | Core CI | YAML/scripts and PG variable corrected; local quality/real-PG path passed; remote execution and advisory closure unverified |
| 33 | Documentation | README/contributing/security/status plus specialist documents/review logs |
| 34 | Backlog | `product/backlog.md`; local slice, future beta and Later scope distinguished |
| 35 | Risks | Security/legal/business unknowns and stage blockers documented |
| 36 | Pre-mortem | `product/pre-mortem.md`; subjective correlated risk judgements, no calibrated probability claim |
| 37 | Next milestones | `product/roadmap.md` phases 0–8 with canonical A–G and separate release decisions |

## Reproduction and cloud configuration

From the repository root, activate `. /workspace/.lilleri-toolchain/env.sh` in this cloud workspace, then use frozen install, `pnpm check`, `pnpm build` and `pnpm dev`. [CONTRIBUTING](../CONTRIBUTING.md) documents disposable PostgreSQL, optional identity, worker and browser workflows. Set a new PGLITE_PATH for an independent fixture; never delete an existing store to make a test pass. Native/devices require a separate reviewed arrangement.

The reusable cloud installer and startup instructions are saved as a draft. **Draft revision8 is saved and confirmed by readback**, with the exact tested installer and updated startup instructions for31 migrations, both authenticated recovery journals and the exercised current demo archive. Saving does not execute scripts, publish a snapshot or demonstrate restoration in a new task. The user explicitly requested publication; the available onboarding tools only read/update drafts, so publication cannot be executed here. Network policy/repository membership/secret values were not changed. Optional local identity requires a securely supplied stable local process secret; default demo needs none.

Remote Actions status could not be read: the available GitHub API request returns403. Local CI-equivalent commands passed; remote execution is not claimed.

## Continuation review findings

| Concrete issue | Correction and evidence |
|---|---|
| The web adapter dropped explicit live atomic state; enlarged header/navigation text escaped320px | Shared web status attribute preserves native props; header/navigation wrap using intrinsic tab widths. Actual DOM regression and locale matrix are recorded in the accessibility review |
| Nested mapped import captured a later clock than its outer command, so current signed-source proof correctly rejected the outer fact | One captured command instant for CSV/XLSX import, audit, provenance and proofs; both advancing-clock HTTP regressions first reproduced409, then passed on both drivers and in the actual lost-response browser flow |
| Concurrent/stale Next dev output left malformed generated type files | Stopped the old checkout dev instance, preserved corrupt generated files outside checkout and ran official Next typegen; tracked typecheck scope unchanged, full installer/check/build passes |
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
| Financial SQL scope could accidentally send success before commit or deadlock on a trusted PGlite read | Buffered response until commit; trusted identity/configuration captured before the scoped transaction; nested/savepoint and late commit-failure regressions |
| Runtime endpoint metadata could mistake two same-named Unix-socket databases for the same target | Pinned trusted/runtime sessions verify two fresh advisory-lock challenges; actual separate-cluster rejection and lock cleanup pass |
| A changed vault could falsely report destruction while the original wrapping key remained usable | Finalization binds the staged expected key ID; wrong vault fails with a pending intent, while the correct independent vault fences old restored ciphertext |
| Immutable source-owned audit triggers blocked existing physical-source erasure cascades | Additive frozen migration 0022 permits nested cascades only after the exact scoped parent disappears; direct audit changes/deletes and cross-profile operations remain denied |
| React Native web controls omitted checked state from the actual DOM | Explicit ARIA checked/disabled/pressed state supplements native accessibility props; actual privacy browser checkbox persistence and stale-choice behavior pass |
| GET export reads could create completion notices | Both GET routes are read-only; explicit POST archive produces an essential notice after the captured snapshot, with actual application tests and browser ZIP evidence |
| Real clock calls made consent/mapping audit timestamps differ and ZIP rejected legitimate owned history | New events reuse persisted transition instants; legacy causal ordering is validated without journal rewriting. Advancing-clock producer and negative historical-export regressions pass on both drivers |
| Null socket endpoint metadata and driver URL precedence could collapse independent database targets | Pinned-session advisory challenges reject a separate cluster; the vault fingerprint projects the installed driver's effective host/port/database without credentials |
| Legacy saved mappings escaped startup encryption | Atomic lossless mapping/snapshot upgrade preserves owner exports; rollback restores original content and immutable guards |

Historical independent review remains dated in [final-review](reviews/final-review.md); the continuation [review](reviews/continuation-review.md) and integrated [completion review](reviews/completion-review.md) record subsequent evidence and limits. No external certification or paid activity is inferred.
