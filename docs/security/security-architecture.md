# Security architecture and control evidence

**Date:** 2026-10-02 · **Status:** accepted design; synthetic implementation and real-data prerequisites explicitly separated.

## Current boundary and evidence policy

DECISION: current setup processes synthetic fixtures only. No personal bank credentials, full PAN, production access token, purchased cloud service or external AI/OCR call is required. The demo uses server-selected identity and must bind loopback, reject production configuration and reject unexpected browser origins. Real authenticated identity is a beta prerequisite. A passing money/API test is evidence of its scenario; no KMS, passkey, WAF, RLS, backup/PITR, signed DPIA or production-readiness claim follows from it.

FACT: [money](../../packages/money/src/money.ts) implements exact bigint/currency primitives. [Provider/domain source](../../packages/financial-providers/src/index.ts) defines the current synthetic port. SQL/API controls and quality command results must be inspected in current code/tests and final STATUS. [Threat model](threat-model.md) prioritises broken object authorisation and telemetry leakage. This document defines required controls even where implementation is deferred.

## Authorisation and database controls

A Profile is the financial tenant. Derive permitted profiles from an authenticated principal/membership, never directly from a client header/object ID. Current demo has a trusted injected synthetic profile; it must not let arbitrary callers switch to another profile. Every query, mutation, foreign key, match leg, preference, cursor, export and deletion has profile scope. Composite `(profile_id, id)` constraints prevent a valid ID from linking across tenants. Unknown and unauthorised IDs receive the same safe `404`. Household membership requires explicit shared-profile grants and does not expose personal profiles.

Production runtime roles are non-owner and have only needed schema/CRUD grants; migration owner and backup/key admin roles are separate. Parameterised queries plus strict allowlisted filters prevent SQL-expression injection. RLS is designed defence in depth only when real-PG tests verify non-owner enforcement, transaction-local tenant setting, pool reuse, worker contexts and administrative bypass boundaries. No default owner connection can earn an RLS claim. Test concurrent correction/sync, unique source identity and tenant FKs against real PostgreSQL as well as deterministic PGlite financial scenarios.

## Encryption, key hierarchy and sensitive fields

Local PGlite synthetic files may be plaintext; no real financial data may be stored there under the current security posture. Real-data transport requires TLS with valid hostname/certificate verification across client/API/provider/database links. Edge termination, internal hop policy and renewal monitoring must be configured/tested; HTTP loopback local development is not a production TLS design. Database volumes/snapshots/object stores use platform encryption, but that protects media theft rather than a compromised application role.

Proposed sensitive-field protection follows [privacy classes](../compliance/privacy-model.md): provider tokens/webhook keys E4 in a secret manager; raw payloads, full account identifiers/counterparty text and receipt/import objects E3; account/transaction/feedback data E2 where validated. KMS wraps scoped data-encryption keys (DEKs); application obtains narrow decrypt grants, uses an audited standard AEAD implementation with unique nonces, stores key version/ciphertext and binds profile/record/purpose as authenticated associated data. Separate runtime decrypt, key-admin/rotation and backup privileges. Rotation writes a new version or rewraps safely with backwards-read support, limits old-key lifetime and verifies all retained copies.

DECISION: field-encryption details for amounts/dates and searchable aliases remain a real-data engineering/privacy gate. Current BIGINT/date schema serves synthetic use. Encrypting ledger columns changes SQL aggregation/indexing; either trusted service decrypts and computes exact aggregates or a reviewed protection/necessity exception permits selected operational columns under strong platform encryption. This trade-off must be approved/tested before real data, not silently marked complete. Do not publish 'all transaction fields envelope encrypted' from the current SQL schema.

A blind index, if needed, is a purpose-specific keyed digest of a canonical value with a separate key and profile binding; low-entropy names/amounts can still leak equality/frequency and must not use public unkeyed hashes. Canonical opaque/provider IDs and raw references require minimisation; masking is presentation, not encryption. Household/shared-profile key ownership needs explicit departure/deletion behaviour. Destroying a user's personal key must not destroy other members' lawful shared records, nor retain that user's access.

Crypto-erasure is effective only if all recoverable key versions/copies are unavailable. A live DEK deletion with a recoverable wrapped DEK/PITR copy and live KMS key can be reversed. Inventory keys/backups/exports/replicas, maintain protected deletion tombstones outside the restored DB and purge/revoke before any restored jobs/traffic. Proposed isolated backup maximum 30 days is a policy to implement and verify; no current instant-erasure guarantee. Partial source/transaction deletion also needs row/derivative purge because a whole-profile key cannot selectively erase one record.

## Identity and mobile sessions

Better-auth is the selected candidate; [ADR-0012](../adr/0012-authentication-and-session-security.md) requires actual device/web registration/sign-in/sign-out, verification, passkey origin/app association, recovery, step-up, session expiry/revocation and takeover tests. Historical construction-only spike is insufficient. Passkeys/MFA do not fix weak support recovery. Sessions and refresh tokens follow the actual selected design: if refresh tokens are used, rotation/reuse detection and atomic revoke; if database sessions, validate active expiry/revocation consistently. Bank OAuth separately validates state/PKCE/nonce where specified and allows only trusted provider redirect hosts. Provider credentials never reach mobile.

Browser cookies need Secure/HttpOnly/SameSite, origin/CSRF defences for mutations and safe CORS. Mobile secrets use SecureStore/Keychain/Keystore with tested lifecycle; no session tokens in AsyncStorage, logs or deep links. No plaintext persistent ledger cache in the first shell; visible stale data in memory is allowed. Biometrics gates local app access, not server identity. Default TLS trust/verification is preferable to brittle ad-hoc certificate pinning; pinning requires documented threat/rotation/backup pins and device tests. Rooted/jailbroken signals are advisory, not foolproof exclusion or identity proof. Screenshots are user-controlled; sensitive preview/app-switcher masking may be added after platform testing, never an unsupported blanket promise.

## Validation, idempotency and abuse control

Validate request/response schema, actual dates, currency/exact integers, enum fields and financial constraints. Bound body/file/page sizes, query windows, job concurrency and deadlines. Unknown input cannot become SQL, executable rule code or template instruction. Idempotency receipts scope principal/profile + route + key + digest and conflict on changed request; immutable observations and canonical revisions prevent retries from counting twice. Expected revision checks protect sticky corrections. Source IDs/status relationships are adapter evidence, not universal proof of duplicates.

Current synthetic server needs origin/bind guards and scoped input handling. Real beta adds shared principal/IP route quotas, login/recovery/export controls, provider per-institution budgets and optionally WAF at edge; WAF never replaces authorisation. Rate-limit semantics distinguish unattended access from provider-managed/attended refresh and read actual expiry/capabilities. Revocation immediately stops local access, cancels/fences queued jobs, destroys tokens and retries provider revoke separately. Failed remote revoke does not leave local access enabled or justify claiming remote success.

## Audit, logs and third parties

Audit business decisions with subject/revision/action, actor, timestamp, algorithm/model/prompt version where applicable, evidence and inverse/supersession. Audit content is minimised and access-restricted; an audit table is not automatically tamper-proof. Privileged actions and key decrypt grants need separately controlled access logs. Do not log raw source or financial amounts/descriptions under 'debug'. Pino/error/tracing allowlists exclude headers/cookies/tokens, SQL bindings, URLs with secrets, provider payloads, email/IBAN/merchant and ledger values. Sentinel-redaction tests cover third-party auto-capture; financial screen replay is disabled.

Future external AI/OCR receives only a permitted-purpose minimal DTO after actual basis/permission, Article 9 handling, DPA/role/transfer/residency/retention review and evaluation. 'Zero retention', 'EU endpoint' and 'no training' require actual configuration/terms, with abuse-monitoring exceptions handled separately. Content logs default off; justified incident samples ≤7 days under restricted scope. Prompt injection stays untrusted data, constrained outputs have no mutation/tool authority and exact finance stays deterministic. Product analytics are semantic enums/count buckets with no raw category histories/amounts/merchant/description/IBAN; pseudonymisation is not anonymity.

## Backups, rights and every datum's purpose

Real-beta backups require encrypted, network/access-isolated copies, bounded retention/PITR, separate credentials and a timed restore including source/profile deletion, shared membership removal, expired retention and session/token revocation. RPO/RTO in [NFR](../architecture/nfr.md) are targets until rehearsed. A backup job success is not recovery proof. Document operator steps in [incident response](incident-response.md).

Export/deletion is available without a paid plan. Current synthetic export/delete establishes local contracts only. Real rights workflows need step-up/identity verification, scoped exports excluding unauthorised other-subject data, active/partial erasure of source/derived/index/cache/job/object copies, provider revoke, processor instructions/responses, legal carve-outs and truthful backup windows. Rights response one-calendar-month and erasure timing must follow counsel-approved obligations; no forced seven-day cool-off. Provider independent-controller retention is separate and unknown until contracts.

| Stored datum | Reason / boundary | Proposed lifecycle |
| --- | --- | --- |
| Account snapshot/transaction money/date/source | Requested PFM facts and exact reporting; tenant scoped | Account/source life, early rights/source erasure |
| Minimised canonical description/counterparty/reference | Specific retained ledger/matching/explanation purpose; sensitive, not the whole provider response | Account/source life or earlier rights erasure, E3 where needed; field necessity reviewed |
| Raw provider payload | Justified short repair/replay only, not required mock | 30d post-normalisation, max90d justified; quarantine 7d |
| Rules/preferences/corrections/match state | Sticky autonomy, explainability and undo | Profile/source life; no global training by default |
| Consent/scope/expiry/revoke evidence | Actual source permission lifecycle, distinct from GDPR basis | Minimal reviewed evidence schedule; no blanket10y |
| Provider/session secrets | Access while authorised | Immediate revoke, rotation and bounded secret-copy handling |
| Operational/security metadata | Detect abuse/reliability without ledger payload | Security 6mo default / justified ≤12mo; IP ≤7d proposal |
| Exports/imports/receipt objects | User-requested purpose only; deferred features gated | Short TTL per retention schedule; no routine public links |
| Billing/legal archive | Future actual record-specific obligation | Counsel-approved record classes, not full ledger |

[Retention schedule](../compliance/data-retention.md) and purpose/basis/DPIA records govern; this register does not grant legal permission to collect.

## Software supply chain and Gate E

Lockfile review, secret scan, dependency advisories, least-privilege CI, SAST/type checks and actual test/build evidence are baseline. A continue-on-error dependency audit is advisory, not a blocking release gate. Produce SBOM/artifact provenance before public release, pin deployment artifact digests and review signing/update credentials. DAST and independent auth/tenant testing run on a staging service before real data. Triage exploitable critical/high findings promptly with documented owner/deadline; no blanket 'zero vulnerabilities' from package install.

| Control | Mock acceptance evidence | Real-data beta / production acceptance |
| --- | --- | --- |
| Synthetic boundary | Fixtures labelled, no secrets/vendor calls, loopback/prod/origin guard tests | Mock mode impossible on real-data deployment |
| Financial integrity | Exact-money/repeat purchase/replay/correction/undo tests | Provider-labelled audit, concurrency/revocation tests |
| Tenant access | Scoped repository/FK and HTTP attacks on implemented endpoints | Real sessions/membership/household grants; real-PG roles/RLS if used |
| Identity/session | Clearly demo-only, no auth claim | Device/passkey/recovery/revoke/step-up lifecycle verified |
| Encryption/secrets | No real sensitive data; synthetic local DB | Chosen field/at-rest/TLS/KMS/key lifecycle verified |
| Logs/analytics | Safe code/error allowlist; no external analytics | Sentinel scrubbing tests, processor terms/retention/access |
| Backup/rights | Synthetic scoped export/delete tests | Timed restore/PITR, tombstones, processor/partial deletion evidence |
| Supply chain | Actual lint/type/test/build + reviewed findings | Blocking advisory triage, SBOM/provenance, DAST/independent test |
| Incident/privacy | STRIDE/runbook and honest release blockers documented | Assigned responders/drill, DPIA/basis/provider-contract closure |

DECISION: Gate E can be assessed for synthetic use; real-data security acceptance is BLOCKED until evidence exists. Architecture/control plans alone do not close it. Track implementation review findings and accepted residual risks with owner/date, and reopen after a new provider, AI vendor, shared-account workflow, deployment or key/storage change.

## Review log

**Date:** 2026-10-02. Independent fintech/privacy review read pipeline, reconciliation and security against revised compliance. No blocker was found for synthetic scope; real-data acceptance remains blocked. A major retention ambiguity was fixed: minimised canonical ledger fields can follow justified account/source life, while complete raw provider payloads have the separate 30-day / maximum 90-day exception schedule. No full payload is kept indefinitely merely because one field remains useful. The reviewer also confirmed that actual institution metadata governs quota/expiry and that key deletion alone does not prove backup erasure.

Independent static implementation review found refund/original eligibility, cumulative-refund override, malformed-refund and duplicate-account/orphan-account hazards. The implementation owner added guards and targeted adversarial tests. API review separately identified expiry string comparison, missing migration checksums, local revocation rollback, stale concurrent source snapshots and repeated mock reconnection identity. Implementation changes and final executed test results remain authoritative; a static fix inspection is not a production-security test. SQL DATE is implemented for financial calendar fields; current validated ISO instant TEXT fields remain a scoped prototype limitation. Current endpoints now have explicit response DTO schemas, and checksum migrations, committed local revocation, bounded source collection locking and stable mock reconnection identities are implemented. Match optimistic decision revision, automated generated-client drift proof, production identity/key/backup controls, durable source cursors/outbox and full audit-event retention remain beta hardening work.
