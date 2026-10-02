# Final review — synthetic financial walking skeleton

**Date:** 2026-10-02 · **Mandate:** [BRIEF](../BRIEF.md), trust and correctness before automation.
**Current verdict:** PASS WITH CONDITIONS for the local synthetic walking skeleton; the final refund-command and browser DELETE regressions are closed. Two dependency advisories remain open. Real-data beta and production remain blocked.

## Scope and independence

This review inspected the current [database](../../packages/database/src/index.ts), SQL migrations, [API transport](../../apps/api/src/app.ts), [application service](../../apps/api/src/service.ts), [financial engines](../../packages/engines/src/index.ts), provider normalisation/import parser and covered tests. The reviewer authored architecture/security documents, not these implementation packages. Other implementation and evidence owners executed the aggregate quality and real-PostgreSQL commands. Their retained outputs were read and the server version was independently queried. A targeted in-memory synthetic refund-command probe was also executed by this reviewer.

This is a focused code/data/control review plus covered-test evidence, not an external penetration test, native-device certification, signed DPIA, legal opinion or proof of production operations. The three architecture proposals were contrasting authored proposals with explicit critique/counterproposal; no independent judge vote or participant validation was fabricated. FACT denotes an observed result with scope, DECISION a chosen design, and HYPOTHESIS/UNKNOWN remain visible in research, cost and performance claims.

## Executed evidence and limits

Session logs are retained outside the repository at `/workspace/.lilleri-validation/`; file names below identify those evidence artifacts. The durable command and scope are recorded here because that workspace is ephemeral. Source test contracts remain in the repository.

| Check | Observed result | Scope / evidence |
| --- | --- | --- |
| Core financial tests | **135 passed**: money 63 + domain 19 + financial providers 18 + engines 35 | Read current package test logs; exact arithmetic/formatting, dates, taxonomy, parsing, conservative relationships and correction precedence |
| API integration with PGlite | **14/14 passed**, including final refund regressions | `pnpm check`, `check-final.log`; current API test output read; synthetic in-process database |
| Real PostgreSQL API run | **12/12 baseline; 14/14 after final refund regressions** | Direct `PG_TEST_DATABASE_URL=<isolated synthetic test DB> pnpm --filter @lilleri/api test`; baseline log read; final direct run reported by implementation owner, and final Turbo path below independently read |
| Corrected Turbo PostgreSQL path | **14/14 suite passed**, 8 successful tasks; integration cache bypassed | `PG_TEST_DATABASE_URL=<isolated synthetic test DB> pnpm test:integration`; current `postgres-integration-turbo-final.log` read |
| Actual server version | **16.15 (Debian 16.15-1.pgdg13+2)** | Reviewer read `SHOW server_version` from the local test container; not historical PROJECT_STATE |
| Repeated PostgreSQL migrations | **Applied successfully** | `pnpm --filter @lilleri/database migrate`; `postgres-migrate-repeat.log`; checksum history inspected |
| Observation immutability / rollback | **UPDATE rejected with P0001; failed transaction left no synthetic profile/cascading data** | `postgres-immutable-probe.log`; reviewed SQL trigger and FKs |
| Aggregate check | **22 tasks successful; 149 tests across core and API** | `pnpm check`, current `check-final.log` read; includes 17 cached tasks with recorded provenance |
| Aggregate build | **10 tasks successful**, Expo web export and Next static routes built | `pnpm build`, `build-final.log`; no iOS/Android runtime claim |
| Final refund command probe | **Initially reproduced HTTP 200 / stored confirmed / effective suggested; after fix HTTP 409, no saved decisions or legs, still suggested** | Reviewer executed same in-memory synthetic probe before/after; no source edits |
| Browser core loop | **16 check groups passed; zero unhandled JavaScript errors** | `browser-report.json` and `browser-flow.log` read: actual API correction/undo, reconciliation, refresh, JSON export, disconnect/regrant, erasure, injected network failures, responsive/dark rendering; Expo web and Next, not native devices |
| Dependency audit | **Exit 1; one high and one moderate advisory** | Owner executed `pnpm audit --prod --json`; reviewer read `dependency-audit.json` and inspected installed use sites; disposition below |
| Limited secret-pattern check | **84 selected files; zero candidates reported** | Redacted content-pattern check reported by evidence owner; gitleaks/trufflehog absent locally. This is neither a complete secret scan nor a Git history scan |

The PostgreSQL-configured API suite uses the real server for its shared database scenarios; its dedicated on-disk close/reopen case intentionally opens PGlite. Therefore a PostgreSQL-configured suite run does not mean every individual persistence case uses a network PostgreSQL server. The current [integration file](../../apps/api/test/integration.test.ts) is authoritative. No test establishes KMS, PITR, production roles/RLS, passkey recovery, vendor deletion or a bank's real identifier/coverage semantics. PostgreSQL BIGINT has a signed 64-bit storage limit; pure bigint tests beyond it do not imply arbitrary-size SQL storage.

## Findings, fixes and current disposition

| Finding / severity | Failure and concrete correction | Disposition / evidence |
| --- | --- | --- |
| Refund eligibility / MAJOR | Refunds could net against pending, reversed or excluded debits. Require a positive booked same-account/currency refund, booked expense original and an effectively counted original | Fixed in pure engine, with adversarial tests |
| Refund bound / MAJOR | A user override could force-confirm cumulative refunds above the purchase; malformed negative refunds distorted the bound. Apply the bound independently of override and sum only positive eligible refund facts | Fixed in pure engine; over-bound confirmation cannot change money |
| Pending lifecycle / MAJOR | A refund/reference could become a pending→booked candidate with opposite sign. Exclude refund kinds and require matching sign | Fixed and tested; no false lifecycle candidate |
| Competing relationships / MAJOR | A record could be excluded by competing derived relationships. Detect competing consumption and route to review; API rejects conflicting confirmations | Fixed in engine/API; conservative abstention remains intentional |
| Account scope/identity / MAJOR | Duplicate accounts doubled balances; orphan or wrong-currency transactions affected totals. Reject duplicate canonical account IDs and enforce owned account/currency before analysis | Fixed, tested and reinforced by scoped SQL FKs |
| Repeated purchases / high-impact guardrail | Amount/date/merchant similarity could hide two real purchases. Same-source purchases remain separate; cross-source weak candidates require review | Covered tests preserve both expenses; strong scoped reference relationships remain required |
| Sticky feedback / high-impact guardrail | Replay or stale requests could erase a correction. Persist once/merchant feedback and check expected transaction revision | Replay tests pass; stale correction HTTP 409 and malformed input HTTP 400 preserve choice |
| Stale concurrent sync / MAJOR | Collection outside lock could allow an older response to overwrite newer facts. Serialize bounded synthetic collection and writes under profile/connection locks | Fixed; concurrent sync regression covered. Long network transactions are not the production worker design |
| Mock reconnect identity / MAJOR | New connection IDs after disconnect doubled the same five accounts/history. Reactivate stable synthetic connection/account identities and retain prior consent grants | Fixed; disconnect→reconnect preserves IDs, count and exact summaries; new consent history retained |
| Consent expiry / MAJOR | Lexicographic ISO strings could mishandle offsets. Compare parsed instants and read actual grant expiry | Fixed; no universal 180-day expiry claim |
| Revoke/erase ordering / MAJOR | A failed source acknowledgement could roll back local denial. Commit local revocation/tombstone first; acknowledgement failure cannot re-enable local access | Fixed in service. Durable remote-revoke retries are future real-provider work |
| Source integrity / MAJOR | Revisions and raw history needed distinct semantics and foreign-reference protection | Status/content observations separated from canonical IDs; UPDATE trigger, deferred scoped references and atomic rollback verified |
| Migration integrity / MAJOR | Migration name alone could conceal edited history. Store/check SHA-256; serialize network PG migrations with advisory lock | Implemented; repeated migration evidence read. Deployment role separation remains future |
| Browser/demo boundary / MAJOR | Client profile headers or hostile browser origin/host could reach another financial scope or expose a public demo | Trusted server profile, profile-scoped commands, origin/Host checks, loopback startup and production-mode refusal; covered denial tests |
| CSV import / high-impact guardrail | A collision, foreign account or currency mismatch could cause partial import/cross-scope data | Bounded strict stable-ID parser, owned canonical account mapping, atomic collision rollback and reimport idempotency tested |
| DTO/OpenAPI drift / MAJOR documentation correction | Earlier review referred to unknown response shapes; current implementation added explicit overview/classification/reconciliation/export DTO schemas | Documentation corrected; manually typed client still lacks generated drift automation |
| PostgreSQL CI selection / MAJOR | CI set TEST_DATABASE_URL while tests read PG_TEST_DATABASE_URL, silently falling back to PGlite | Root corrected CI/Turbo env, disabled integration caching and reran actual PG path successfully |
| Retention ambiguity / MAJOR documentation correction | Minimised canonical fields were conflated with full raw payload TTL | Split purpose/account-source lifetime from raw 30-day / maximum 90-day justified exception; independent fintech/privacy review confirmed the distinction |
| Refund command/audit discrepancy / MAJOR | With original −10 EUR, positive refunds +6/+6 and malformed kind=refund −5, API sum permitted HTTP 200 / stored confirmed while engine returned suggested | Fixed with aligned positive scoped cumulative predicate, effective original eligibility and proposed-engine-state check before writes. Reviewer reran exact probe: HTTP 409, zero saved decisions/legs. Two API regressions pass in 14/14 PGlite and 14/14 real-PG-configured suite runs |
| Bodyless DELETE / MAJOR | Client set JSON Content-Type without a request body, causing Fastify to reject disconnect/erase with HTTP 400 | Root sets Content-Type only when a body exists, using Headers. Final actual-browser disconnect/regrant and erasure flows pass |
| Dependency advisories / OPEN, high and moderate | Expo tooling resolves vulnerable node-forge and uuid versions | Actual audit and import-site triage recorded below; production release gate remains uncleared |

The final command discrepancy mattered even though source amounts remained correct: success and exported saved decision must reflect what was actually applied. The fixed command returns a safe HTTP 409 conflict and persists no misleading confirmed decision/legs; the new excluded-original regression proves the same contract. Current unique core/API tests total 149 (135+14), consistent with the final aggregate logs. [STATUS](../STATUS.md) records the final delivery commands and browser evidence.

## Dependency and secret-check disposition

FACT, verified 2026-10-02: the audit snapshot reports 632 dependencies, one high advisory and one moderate advisory. Its nonzero exit is a finding, not a passing check. The configured CI audit uses `continue-on-error`; that setting does not clear either advisory or establish a release security gate.

| Advisory / installed path | Actual use inspected | Disposition and limit |
| --- | --- | --- |
| High: [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv), node-forge 1.4.0, `expo > @expo/cli > node-forge`; RSA PKCS#1 v1.5 verification accepts extra nested DigestAlgorithm elements | CLI `run/ios/codeSigning/Security.js` imports forge and parses certificates. CLI `utils/codesigning.js` invokes `validateSelfSignedCertificate`; installed `@expo/code-signing-certificates` calls `certificate.verify(certificate)` and `certificate.publicKey.verify(...)` | **OPEN.** The audit lists no patched release (`recommendation: None`), last advisory update 2026-10-01. This is certificate/signature tooling, with actual verification sites; end-to-end exploitability, input trust and mitigations were not proved. Do not enable a production signing/release path until a maintained fix or independently validated mitigation is reviewed and the audit repeated |
| Moderate: [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq), uuid 7.0.3, `expo > @expo/config-plugins > xcode > uuid`; missing caller-buffer bounds in v3/v5/v6 APIs | Installed xcode 3.0.1 `lib/pbxProject.js` imports uuid and calls `uuid.v4()` with no output buffer in `generateUuid()`; the advisory explicitly distinguishes v4 from the affected APIs | **OPEN dependency finding.** This inspected caller does not invoke the affected APIs. That is a bounded source observation, not proof every transitive caller or future native build is unaffected. The audit recommends >=11.1.1; xcode declares ^7.0.3, so an untested cross-major override is not a validated repair |

The synthetic Fastify server does not import Expo tooling in its inspected package/source paths. Dependency reachability and the build/signing chain still require review; successful financial and browser tests do not validate cryptographic verification. No third-party cryptography fork or unverified dependency override was introduced to conceal the findings. Before production, obtain a supported dependency correction or document a validated mitigation for the exact release path, rerun the audit and retain its disposition. Advisory availability is time-sensitive; “no patched release” describes this snapshot only.

The evidence owner reported a bounded, redacted pattern check of 84 selected files with zero candidates. Neither gitleaks nor trufflehog was available locally; the configured CI gitleaks job was not represented as an executed scan. No full-file coverage, Git-history scan or absence-of-secrets guarantee follows from that result.

## Implemented boundary and remaining work

FACT: the current service accepts synthetic providers, selects a trusted configured demo profile, refuses production startup and public bind addresses, and validates browser origins/Host. It is local demonstration identity, not authentication. Composite profile/account/connection FKs and scoped lookup/exports protect the implemented data paths; valid foreign object IDs do not become authorisation. SQL source observations are immutable against UPDATE, with deliberate cascade erasure. Overview/export use repeatable-read read-only snapshots. JSON money is exact integer strings; calendar fields use SQL DATE; instance metadata is minimised and logger/body auto-capture is disabled.

The current synthetic CSV API accepts user-supplied text; developers must use synthetic files under this scope. It is not a legal permission, auth or production intake workflow. New source callbacks, arbitrary real exports and a shared-household release cannot inherit approval from the local tests. No bank credentials/full PAN or external AI endpoint are needed in the provided fixture flow.

DECISION: retain the modular monolith and pure financial engines. Source writes are whole bounded batches with rollback. Real unattended providers need durable jobs/outbox, per-source quotas/expiry, page checkpoint/replay and appropriate deadlines; the current fixture's bounded synchronous transaction is not that implementation. Source payload TTL/retention jobs, complete audit-event history, optimistic match-decision revision and generated-client drift verification remain explicit hardening work. The fixed category catalogue and pure taxonomy operations do not imply shipped custom category/rule management screens. Split/reimbursement/shared-account/FX workflows need their own persistence/API tests before being called complete.

UNKNOWN/unimplemented real-data controls include authenticated users/membership/session/passkey/MFA recovery and revocation, production TLS/DB roles/RLS, reviewed ledger field encryption/KMS/secret lifecycle, WAF/distributed rate limits, backup/PITR and tested restore, protected tombstone replay across backup/key copies, processor export/deletion evidence, incident staffing/drills and required security advisory handling/SBOM/DAST. The two observed dependency advisories remain open as described above. No 'production-ready', signed DPIA, zero-vulnerability or instant crypto-erasure claim is made.

## Required review perspectives

These are documented conclusions from actual implementation/source/document review, not fabricated user studies or specialists' certifications.

| Perspective | Conclusion and practical limit |
| --- | --- |
| CTO | One application/database plus pure ports is proportional. Queue/cloud services are added only at a real need; no Redis/microservices requirement. Real-provider async/recovery work is still substantial |
| Security | Highest-probability leaks remain wrong object scope and verbose telemetry/support access. Current local synthetic denials have tests; real identity/recovery/key/access controls do not |
| Privacy | Minimise canonical fields and short-lived raw copies; pseudonymised data remains personal. No AI disclosure now. Signed purpose/basis/Article 9/DPIA/vendor/retention closure and backup-aware rights processing remain real-data blockers |
| Fintech | Pending, identifiers, history, card exposure and refresh differ by bank/provider. Mock fixture names are not live coverage. Contract/legal route and official sandbox/pilot precede real-bank use |
| AI | Deterministic map/rules/preferences cover the slice. Explainability derives from evidence; confidence is heuristic, not measured accuracy. Future models must demonstrate added value and permitted minimal disclosure |
| Data | Exact money and conservative relationships are tested; replay/corrections/source integrity are real contracts. Ambiguous duplicate/transfer/refund stays reviewable; no invented FX or complete-history balances |
| UX | Synthetic connect/sync/summary/review/correction/replay is reviewable. Browser-flow evidence is scoped; native screen-reader/dynamic-type and participant comprehension/retention are not established |
| Brand | Original assets/tokens/fonts and measured token contrast exist; actual browser captures have a separate visual gate. Recognition and without-logo grouping remain hypotheses, not participant results |
| Business / skeptical investor | Gratis/Plus economics are scenarios and real AIS terms are unknown. Base can lose money before fixed/minimum costs; Gates A/C are not proven by mocks or spreadsheet arithmetic |
| Growth / consumer | Correct explained reconciliation and reversible control are differentiation hypotheses. Real trust/connect willingness, coverage and willingness to pay require valid pilot/user evidence; no bank-access reassurance from a synthetic demo |

## Gate verdict and next step

Gate D accepts the scoped architecture, not a deployed security posture. Gate E is **PASS WITH CONDITIONS for the local synthetic demonstration only**, under the documented local/synthetic delivery restrictions, scope of implemented/tested controls and open dependency dispositions. Gate E for real-data beta/production is **UNCLEARED / BLOCKED**, including the unresolved release-tooling advisories. Gate F concept/browser review and Gate G brand artifacts have separately scoped evidence; native/accessibility and participant validation remain open. Market/business gates do not pass from implementation or cost hypotheses.

Retain the fresh API rejection/rollback, aggregate, browser and audit evidence. Continue with official sandbox only when authorised credentials/provider permission are available; real data waits for provider contracts/legal route, completed privacy assessment/DPIA and verified identity, isolation, encryption, rights/recovery, incident and dependency-release controls. Existing evidence authorises no spend, purchase, real-bank credential use or public launch.

References: [architecture](../architecture/system-architecture.md), [API contract](../architecture/api-contract.md), [threat model](../security/threat-model.md), [security controls](../security/security-architecture.md), [incident response](../security/incident-response.md), [privacy](../compliance/privacy-model.md), [legal blockers](../compliance/legal-open-questions.md), [visual gate](../design/visual-quality-gate.md), [unit economics](../business/unit-economics.md), [pre-mortem](../product/pre-mortem.md).
