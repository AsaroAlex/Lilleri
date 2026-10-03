# Continuation review — local synthetic extension

**Date:** 2026-10-03. **Verdict:** accepted for the declared loopback synthetic development scope. The complete future beta and production gates remain open.

## Evidence and review boundaries

The lead ran the complete reusable installer: pinned Node 22.22.0/pnpm 10.28.0, frozen root and brand toolkit installation, `pnpm check` (22 tasks) and `pnpm build` (10 tasks). Final distinct tests are **264 = 167 core + 97 API**. The actual PostgreSQL 16.15 Turbo integration path repeated all 97 API cases successfully, with integration caching disabled. Deliberate legacy/reopen cases use PGlite; this does not claim a network database restart or backup restore. Twelve final SQL migration checksums pass repeated migration execution.

Specialist agents implemented identity, rules, manual/import, settings, retention, revocation and evaluation in distinct ownership scopes. An independent static reviewer examined the API/financial boundaries and client lifecycle, then authored focused panel fixes after reporting findings. The lead integrated and independently exercised the combined source. The browser owners ran actual operations: **17 financial groups and 16 identity groups**, zero JavaScript errors, with explicit race interleavings, exact-money checks, ZIP downloads and 320 px reflow. A separate virtual CTAP2 probe was rerun against the final compiled API and passed registration/sign-in plus replay/origin/user-verification/malformed-key/revoked-session denials.

This is an implementation and regression review. It is not an external penetration test, recruited-user study, native biometric/assistive-technology audit, signed DPIA, representative accuracy measurement or production operation certification. Workspace logs are ephemeral; reproducible tests and scripts are committed, and [STATUS](../STATUS.md) records their scope. Historical initial evidence remains in the dated [initial review](final-review.md).

## Concrete findings and resolution

| Finding | Resolution / regression |
|---|---|
| Concurrent and ABA match decisions could erase a choice; account structure changes could invalidate evidence | Opaque profile/candidate/source/account/decision revision; one winner and one stale 409, changed account/source, malformed token and no-write financial rejection tests |
| Export-only expiry could leave raw content forever; replay could recreate it | Separate payload storage, original 720-hour expiry, no rehydrate, fair bounded scheduled cleanup, status and exact boundary/replay tests |
| Provider acknowledgement lacked durable recovery and consent generation safety | Outbox survives profile erasure, generation-specific capability, committed claims before I/O, fenced leases/retry/deadline and blocked regrant |
| Encoded paths could avoid recent-auth checks | Registered route identity controls JSON/ZIP export, disconnect and deletion sensitivity |
| Financial erasure could precede credential cleanup or lose authorization during session revocation | Identity cleanup shares financial erasure transaction; injected failure rolls back all effects and already authorized deletion survives concurrent signout |
| Rule conflict could be invisible when winning category did not change | Preview compares full classification/evidence/review state; ambiguous conflict stays reviewable |
| Old financial/security responses could resurrect state or an old panel 401 could clear a new identity | Identity epochs, render-bound callbacks, immediate erase cleanup and no-echo cross-tab broadcast; real held-response browser regressions |
| Credentials-included fetch blocked the default demo | Exact allowlisted credentialled CORS applies in both synthetic modes; preflight/actual request tests and browser flow |
| Metro could reuse the default demo during an opt-in auth export | Reproduced wrong endpoint/mode; workspace dev/build use `--clear`; final auth export and 16 browser groups pass against final API/fresh store |
| Binary archive contract advertised JSON | Explicit OpenAPI ZIP binary content agrees with actual route and browser download |
| UUID vulnerable transitive path needed compatible supported resolution | Narrow xcode 3.0.1 override to UUID 11.1.1, actual CommonJS/PBX roundtrip/buffer bounds. Forge/braces findings remain open |

## Limits and decision

The new functionality remains synthetic-only and refuses production/non-loopback configuration. Local sessions and recovery codes do not establish real email delivery or safe lost-device recovery. Outbox and retention are real local workers but not the complete bank scheduler or production data-lifecycle programme. Pure entitlements have no purchase lifecycle. Rules/manual import do not complete generic XLSX/locale mappings, taxonomy, split/sharing or recurring/insight acceptance.

The original frozen evaluation fixture contains 38 scenarios and 51 transactions, annotated by its author. Its counts and null denominators are regression evidence, never representative accuracy or calibration. The full 25 reconciliation catalogue and lawful independent evaluation/live audit remain open.

The final production dependency audit exits 1 with two HIGH findings (node-forge/braces) and no MODERATE finding. Current registry/audit report no patch; [SECURITY](../../SECURITY.md) retains exact dispositions. No complete/history secret scan or remote CI result is claimed. Test PostgreSQL uses an owner/superuser role; RLS, deployed KMS/TLS, production backups/PITR and deletion-aware restore acceptance are absent.

Continue from the complete [execution plan](../product/execution-plan.md). Technical tasks remain active; actual sandbox access, contracts/legal route/DPIA/processors, key/backup deployment and consented representative users gate the corresponding real operation. No public release, spend, charge or real-bank credential use follows from these passes.
