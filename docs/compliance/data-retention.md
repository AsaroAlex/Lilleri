# Data retention — purpose-bound schedule, deletion and recovery

**Project:** Lilleri, Italy-first PFM; proposed recipient route subject to counsel/provider approval.
**Review date:** 2026-10-02. **Retained evidence dates:** 2026-10-02; publication/access metadata in §11 preserved.
**Status:** proposed production schedule with bounded synthetic implementation evidence below. No production erasure or key-management capability is established by this document.

**Synthetic implementation evidence (2026-10-03):** the local demo now separates immutable source-observation metadata from raw successful-ingest content in `observation_payloads`. Migration `0006` preserves existing observation IDs and starts expiry at their original ingest instant plus 720 hours, without resetting the clock during upgrade. Provider sync and CSV import attach content only when observation metadata is first inserted; replay cannot recreate an expired/deleted payload. The scoped export excludes raw content at or after expiry even when physical cleanup has not run. Explicit local maintenance deletes at most 100 rows by default (validated range 1–1,000), scoped to one profile, without changing its canonical ledger. Source/account/profile cascades also remove content. Eight dedicated tests passed with PGlite; the same run with the PostgreSQL driver passed seven shared retention scenarios plus the intentionally PGlite legacy-upgrade scenario. This is synthetic local evidence, not a deployed daily expiry job, approved real-data retention period, processor deletion, backup erasure or key-management claim. The 90-day exception and quarantine policy remain unimplemented.

## How to read this document

**DECISION** identifies proposed periods/controls; **FACT** only claims supported at the retained source level; **ASSUMPTION/HYPOTHESIS** unconfirmed inputs/interpretations; **UNKNOWN** unresolved matters. Sources are raw RL/NB/PA/PB and earlier NEW entries in `regulatory-landscape.md` §8. No fresh legal or vendor verification occurred. Encryption classes are in `privacy-model.md` §3.1, consent types in `consent-model.md` §2.

## 1. Executive summary

- **DECISION:** no real financial data in the current environment. All production periods need an owner, necessity justification, lawful basis, timer/deletion job and DPIA review before collection.
- **HYPOTHESIS:** a pure PFM recipient has no sector-wide duty to retain customer bank data; actual licensing/agency/AML status and applicable laws are not established (RL-§6.4, §9). Do not inherit a provider's retention obligations or assume no obligations categorically.
- **DECISION:** normalised requested ledger/rules can live while the account and purpose remain active; raw successful provider payloads **30 days**, exceptional justified ceiling **90 days**; failed/quarantined copies **7 days**. The former 13-month raw default was disproportionate without evidence of necessity.
- **DECISION:** no routine AI prompt/output content logs. Content-free version/cost/latency/outcome metrics suffice by default; justified isolated incident sample ≤ 7 days. A PLD reference does not require routine financial-content logging.
- **UNKNOWN:** instant crypto-erasure from all backups. Deleting a live DEK does not erase a wrapped DEK in a recoverable database/key backup. Use bounded isolated backups, protected deletion tombstones and restore replay; claim cryptographic erasure only after no usable copy can be recovered and tested.
- **DECISION:** stop processing/revoke on request promptly; perform active deletion without a mandatory 7-day waiting period; target≤ 30 days end-to-end with honest backup/processor exceptions. GDPR Art. 12 response window is **one calendar month**, not a universal30-day erasure licence.

## 2. Principles

| Principle | Resolution / label |
|---|---|
| Purpose-bound, minimal copies | **DECISION:** periods are maximums, not entitlements; expired purposes or lawful withdrawal can trigger earlier deletion |
| Raw≠canonical≠derived | **DECISION:** deleting a source invalidates provenance-linked labels, indexes, caches, user model state and reconciliation; exact scope tested |
| Restricted archives | **DECISION:** separated from product/analytics, narrow evidence, no routine transaction content; independent lawful purpose/key/access/expiry |
| Ten-year periods | **ASSUMPTION:** accounting Art. 2220 and ordinary limitation Art. 2946 in retained notes need counsel. A limitation period does not mandate retaining every consent/audit event for ten years |
| Personal means personal | **FACT (retained GDPR interpretation):** user IDs, email/suppression hashes and pseudonymous events remain personal data; no “content-free means anonymous” claim |
| Erasure/deletion record | **DECISION:** minimised job/tombstone proof kept only as needed to prevent recovery and demonstrate execution; do not indefinitely recreate deleted profiles |
| Key/backup integrity | **DECISION:** delete/purge usable key copies if feasible; otherwise isolate deleted records and enforce verified restore replay until bounded expiry |
| Controller accountability | **DECISION:** controller/legal owns justified holds/retention; DPO advises independently; legitimate holds neither cover all data nor automatically override erasure |

## 3. Proposed schedule per class

Periods start at the stated trigger. All numbers are **DECISION (proposed)** except statutory anchors explicitly labelled **ASSUMPTION**. They must not be advertised as implemented SLAs yet. Archives and provider periods do not silently inherit account-life retention.

| Data class | Trigger / maximum proposed period | Purpose / deletion and recovery rule |
|---|---|---|
| Raw provider JSON/metadata | Successful normalisation: **30 days**; documented DPIA/incident exception ≤ 90 days; malformed/quarantine 7 days from ingest | Necessary debugging only; field allowlist; earlier source/account deletion; content objects and all derived references purged |
| Normalised transactions, balances, accounts | Account/purpose life; earlier source/account erasure | Requested ledger; retain history only under independent reviewed ongoing purpose; deletion tombstones prevent re-ingest |
| Derived labels, recurrence, insights, links | Account/source life; invalidate promptly on source deletion/withdrawal | Provenance tracked; delete/recompute caches/indexes/model state; Article 9 condition must persist where relevant |
| Rules, corrections, personal model | Account life | Personal service/export; no personal cross-user training; erase targeted feedback and model artefacts |
| Receipt images | Successful extraction: 90 days; failure 7 days; user explicitly pins until unpin/source/account deletion | Minimise originals; pinned material periodically review; Article 9/other-subject assessment |
| Receipt extracted items | Account/source/purpose life | Erase with source/withdrawal where no valid ongoing basis; raw image expiry does not erase extracted sensitivity |
| Raw email/attachments | Non-receipts discarded after parsing, buffer ≤24 h; receipt raw 30 days; pinned invoice only by user choice/review | Inbound vendor retention separately approved; no inbox-wide collection in MVP |
| Email extracted items | Account/source life while lawful purpose remains | Withdrawal stops ingestion; retaining consent-based extracted material needs valid independent basis, not just a “keep” toggle |
| Import files/mappings | File 30 days from import; mappings account life | Parsed rows follow ledger/source schedule; earlier erase source on request |
| AI prompt/output content | **Disabled by default**; justified incident sample ≤ 7 days from capture | Scope/redaction/approval; no quiet-set or counterparty disclosure; erase vendor/sample copies when purpose ends |
| AI operational metrics | 13 months from event if justified | Model/version/cost/latency/outcome only; no user/category/merchant content; verify aggregation/re-identification risk |
| Consent/permission/connection evidence | Minimised evidence during account life; post-close maximum **3 years proposed**, only for documented claims/accountability need; longer only class-specific counsel-approved requirement/hold | Separate identifiers/text-version proof from product content; 3 years not statutory fact; no blanket 10-year archive |
| Product analytics | 13 months from event only if justified and permitted; earlier consent withdrawal/erasure applies | Pseudonymous remains personal; withdrawal stops identifier use and deletes consent-only events; indefinite aggregate only if demonstrated irreversibly anonymous |
| Crash diagnostics | 90 days from event | Scrub content before upload; erase relevant identifiers/copies on rights request where applicable |
| Security logs |**6 months** from event; justified documented exception ≤ 12 months; full IP default ≤ 7 days | LIA and incident necessity; no claim that Garante universally accepts these periods |
| Routine access/export/delete audit |12 months from event proposed; deletion tombstones until all restorable copies expired +90 days | Minimal IDs/actions; exceptional claim evidence separately scoped; incident/breach records have a documented reviewed period, not automatic 10 years |
| Identity/auth factors |Active account life; active deletion prompt after validated request | Deletion certificate may retain minimal confirmation route transiently; trial-abuse email hash not retained by default; any later abuse list needs LIA/purpose/expiry |
| Sessions/devices/push |Sessions ≤ 90 days last use; revoke on logout/account request; push token remove promptly | Restored sessions/tokens remain revoked; device rows erased with account |
| Provider tokens/secrets |Revoke/delete immediately on disconnect/deletion or unusable expiry; rotation per contract | Provider revocation and secret-store key/version destruction separately tracked; unusable retained secret backups bounded ≤ 7 days only if proven |
| Support messages | 24 months after closure maximum; attachments90 days; earlier account erasure unless scoped necessity | Redact other subjects, no blanket “anonymise” where identity/content recoverable |
| Billing/accounting |Record-specific **10 years proposed (ASSUMPTION on legal anchor)**; trigger/start confirmed by counsel/tax adviser | Only necessary invoice/tax/accounting records; subscription entitlement erased with account; no full ledger retained |
| Marketing/suppression |Marketing opt-in until withdrawal; minimal suppression token while necessary to honour applicable opt-out, annual review | Hash remains personal; document scope and deletion trigger; no automatic indefinite retention |
| Vendor/DPIA/ROPA/contracts |Relationship + 5 years proposed | Accountability/legal evidence without customer financial content; review actual obligations |
| Legal-hold material |Until reviewed hold release; delete within 30 days after release absent valid renewed basis | Narrow scope/copy, restricted archive, controller/legal decision with DPO advice |
| Dormant accounts |No meaningful user action for 24 months proposed; warn 18/22 months; stop/delete after final notice | Background refresh does **not** reset user inactivity forever; paid contractual service and pending claims assessed individually |
| Backups/PITR |**30 days maximum** from snapshot/log capture; no unapproved monthly archive | Isolated, no routine product use; tombstone replay before serving restored system; key copies tracked; explain residual window honestly |

**DECISION:** the proposed 3-year evidence archive and 6-month security default replace unsupported blanket 10-year and 12-month choices; both require justified signed review. Accounting may need a different trigger or tax period. No period authorises collecting data that lacks a lawful basis.

## 4. Triggers and partial erasure

| Trigger | Action / DECISION |
|---|---|
| Account erasure |Stop background jobs/external AI/push promptly; revoke sessions/provider access; active erase and processor instructions; bounded backup isolation; permitted archives explained |
| AIS disconnect |Stop access/revoke/destroy tokens; offer distinct retain-history (reviewed ongoing ledger basis) or delete-source choice. GDPR erasure is separate |
| Provider/bank revocation or expiry |Stop unusable access; do not destroy requested history automatically; explain status and retained purpose; inspect provider signals, not universal180-day assumptions |
| GDPR withdrawal |Stop consent purpose; remove raw/derived/processor data unless another independently valid basis already applies; no silent basis switch |
| P-AI withdrawal |No new external calls; queued jobs cancelled; vendor artefact/sample deletion assessed; existing lawful categories may remain under reviewed core purpose |
| Delete source/transaction |Purge originals/derivatives/indexes/caches/reconciliation links; manage live re-sync via scope/exclusion/disconnection. A “private” flag is not erasure |
| Shared/household change |Remove departing person's access immediately; assess which common records each participant may lawfully retain; exports never disclose unauthorised other-subject data |
| Hold/inactivity |Scoped hold reviewed independently; inactivity based on meaningful user action, not perpetual provider refresh |

## 5. Account deletion workflow (DECISION; not implemented proof)

1. Verify identity proportionately, explain affected data/permitted archive/backup windows and separate app-store subscription cancellation. Provide in-app and web request entry; no compulsory7-day cool-off. An optional brief cancellation mechanism must not delay legitimate erasure unduly.
2. At validated request, disable jobs/sessions/external AI/push and initiate provider revocation/token invalidation. Retry failed provider calls without keeping local access active; preserve only minimal response evidence.
3. Purge active user data, objects, indexes, queues, caches, model state and authorised household references. Where key deletion is used, inventory every recoverable key version/copy and verify irreversibility; also hard-delete application rows where needed.
4. Issue processor deletion instructions and collect concrete responses including abuse-monitoring and backup limits. Provider independent-controller copies require a separate request path and notice; Lilleri cannot certify their erasure from its own job.
5. Preserve only documented class-specific lawful carve-outs under separate keys/access/expiry. Unresolved breach/litigation holds are narrowly scoped, reviewed and explained where lawful.
6. Write minimised deletion tombstones/certificate; protect them from rollback. Target active deletion promptly, end-to-end≤ 30 days; respond within **one calendar month** per Art. 12(3). Complexity may permit an explained response extension, not routine delay; rights and without-undue-delay erasure remain separate.
7. Inform the user accurately what completed, which legally justified records remain, and when isolated backup/vendor copies expire. Do not say “unreadable in every backup” unless verified. If a deadline cannot be met, escalate and send the legally required status/reason promptly.

### 5.1 Provider and vendor deletion

**HYPOTHESIS:** provider usually acts as independent controller for AIS; actual roles/periods **UNKNOWN** until Q4 closes. Revoke access and expose its rights contact/notice. For processors, Art. 28 terms must cover deletion/return, subprocessors, locations, restricted retention and backup expiry. “Zero retention or abuse-monitoring minimum” are different configurations; actual exception must be approved/disclosed. Proposed processor active deletion≤ 7 days after instruction and bounded isolated backups≤ 30 days, unless counsel-approved justified exception; these are negotiated targets, not statutory numbers.

## 6. Backup and key implications

| Issue | Proposed control | Acceptance evidence |
|---|---|---|
| Recoverable wrapped keys |Track live DB, key vault/version, PITR, object replicas, snapshots, exports and key wrapping material; a restored wrapped DEK may still decrypt under a live KMS key | Key lifecycle design and deletion/restore test; instant crypto-erasure claim forbidden until proven |
| Bounded residual copies |30-day backup/PITR window; segregated inaccessible routine copies; no reuse for analytics/debugging | Actual configured policy and expired-object verification |
| Tombstones/replay |Separately protected minimised deletion log survives restore; purge/revoke expired records and keys before traffic/jobs resume | Restore drill deletes account/source/shared records and cannot resurrect sessions/tokens |
| Partial deletion |Per-user key destruction cannot erase one transaction while preserving all others; purge source/row derivatives and enforce tombstones on restore | Partial/source-erasure test, live re-ingest suppression |
| Non-DEK logs/archives |Pseudonymisation alone is insufficient; bounded periods and targeted erasure/rights assessment | Identifier/index inventory, job reports |
| Restore drills |Quarterly and after key/backup/deletion changes | Job timings, failed-copy detection, rollback safe incident procedure |
| Vendor backups |Written actual backup expiry/isolated-use/no-recovery-to-service terms and deletion evidence | Contract/configuration/attestation; unknown periods block promise |

**DECISION:** if cryptographic irreversibility cannot be proven, use honest bounded-backup deletion rather than assert instant erasure. Even proven crypto-erasure does not erase separate plaintext logs, exports, other-subject copies, provider records or processors automatically.

## 7. Legal holds

**DECISION:** controller/legal authorises narrow scope after legal-basis/necessity assessment with independent DPO advice. Record basis, records/users/period, access, start, owner and90-day review. Art. 17(3)(e) may cover necessary establishment/exercise/defence of claims; other applicable Art. 17 exceptions/legal duties need specific identification. An informal request, fraud suspicion or store disagreement does not automatically suspend all erasure. Honour out-of-scope erasure and explain refusal/rights under Art. 12(4) where required. Copy justified held material to separate controlled archive, not indefinite extension of all production backups; release purge≤ 30 days.

## 8. Operating controls and review

**DECISION:** configuration-owned periods; daily expiry jobs with counts/errors/oldest-record alerts; deletion ownership/retries; actual certificates listing remaining copies; protected tombstones and restore gate; purpose/Art. 30/DPIA links. Review annually and at new source/vendor/country/household/licensing/AI changes. Thresholds and retention jobs in docs are proposed acceptance criteria, not a test result.

## Review log

**Date:** 2026-10-02. **Method:** retained raw-source critique; no fresh statutes/DPAs.

| Critique | Resolution | Remaining human production blocker |
|---|---|---|
|13-month raw payloads and 30-day prompts kept richest copies for speculative claims/reprocessing |30-day raw/max 90-day exception; no routine prompt content; isolated7-day justified sample | Necessity/DPIA approval and tested field/lifecycle controls |
| Ten-year limitation was treated as blanket retention duty | Separate accounting anchors from optional narrowly justified evidence; proposed 3-year ceiling with review, normal audit12 months | Counsel/tax record-class/trigger/claims assessment |
| Live DEK deletion guaranteed unreadable backups while recoverable keys were backed up | Key-copy inventory, bounded30-day isolation, tombstone replay and tested restore; no instant claim | Demonstrated key and backup lifecycle, processor evidence |
| Mandatory7-day delay and 30-day GDPR rule conflated response and erasure | Prompt stop/erase; no forced cool-off; one-calendar-month response and lawful exception/extension analysis | Rights workflow, policy copy and staffing |
| Refresh reset dormancy; hashes/“content-free” records treated anonymous | Meaningful-user inactivity; hashes/IDs remain personal; annual suppression review | Dormancy necessity/user notice and LIA/suppression policy |
| Provider role and legal holds were automatic/DPO-owned | Actual-role assessment; controller/legal scoped hold decision, DPO advice | Provider terms, legal-hold/incident procedures |

**Gate verdict:** **PASS WITH CONDITIONS for synthetic design; real-data deletion/retention acceptance BLOCKED** pending legal necessity and engineering/vendor evidence.

## 9. Decisions / Recommendations

Adopt this proposed schedule over the earlier 13-month raw default; verify scope and necessity before real data. Implement active and partial deletion, source/model provenance, processor requests, isolated bounded backups and rollback-safe tombstones before beta. Publish actual completion/retention facts only. No automatic 10-year consent/audit archive, indefinite hash retention, or crypto-erasure guarantee.

## 10. Open questions

| Question | Closure owner/evidence |
|---|---|
| Which accounting/claims/consent periods and legal duties actually apply? | Counsel/tax adviser; per-record purpose/basis/trigger memo (Q3/Q5) |
| Can30-day raw retention/max90 exception and3-year evidence ceiling be justified? | Controller + DPO DPIA/necessity assessment |
| Can every decryptable key/backup/export/derivative copy be controlled and partial deletion preserved after restore? | Engineering/security key inventory + restore acceptance evidence |
| What do provider/processor/subprocessor copies retain, and who answers rights requests? | Actual contracts/notices/configuration and deletion responses (Q4) |
| Which withdrawal/household/live-sync cases require deletion vs restriction vs independent ongoing purpose? | Counsel + domain/privacy tested workflow |

## 11. Sources

Retained research date for these rows: **2026-10-02**; publication dates and access limitations are preserved. The present review did not re-fetch these sources. Full raw-note source table in `regulatory-landscape.md` §8.

| ID | Source | URL | Pub. date | Reliability | Used for |
|---|---|---|---|---|---|
| RL-§6.4 | Retention practice: live data while the account exists; logs 6–12 months; erase within 30 days except billing/accounting (10 years, art. 2220 c.c.) and claims evidence (art. 2946 c.c.); PSD2 imposes no retention on Lilleri; AML retention does not apply | https://www.normattiva.it (Codice civile, not fetched) | consolidated | high (law) / ASSUMPTION (articles not re-read) | §2 anchors; §3 rows 12, 16, 21 |
| RL-§9, RL S-57 | D.lgs. 231/2007 art. 3 — Lilleri not an obliged entity; AMLR 2024/1624 from 10 Jul 2027 | https://www.normattiva.it ; https://eur-lex.europa.eu/eli/reg/2024/1624/oj | consolidated / 2024 | high (not fetched) | No AML retention |
| RL-§6.4, RL S-26 | GDPR Art. 5(1)(e), 7(1), 12(3), 17, 17(3)(e), 28(3)(g), 32, 33(5); EDPB 06/2020 (provider as separate controller) | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-062020-interplay-second-payment-services-directive_en | 2016 / 2020 | high (not fetched) | Principles; legal holds; provider-side data |
| RL S-27 | Garante cookie guidelines 2021 (anonymised analytics; retention expectations) | https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/9677876 | 2021-06-10 | high (not fetched) | Analytics retention |
| RL S-32, S-74 / NB S-04 | Apple App Review Guideline 5.1.1(v) — in-app account deletion (first-hand, verbatim) | https://developer.apple.com/app-store/review/guidelines/ | 2026-06-08 | high | §5.1 |
| RL S-41; NEW-1 | Google Play Data safety; User Data policy (account deletion in-app + web; third-party AI clarification claimed by earlier synthesis; exact change/date UNKNOWN) | https://developer.android.com/guide/topics/data/collect-share ; https://support.google.com/googleplay/android-developer/answer/10144311?hl=en | 2026 | high / medium-high (snippet) | §5.1; vendor deletion |
| PA-§2.6, §3.2, §3.4, §7 | Provider revoke surfaces; TrueLayer stores "primarily within Europe (EEA) and the UK"; Salt Edge "EU/EEA users' data stored only in the EU"; store raw payloads in a canonical schema to avoid lock-in | https://truelayer.com/legal/privacy/ ; https://www.saltedge.com/legal/privacy_policy ; https://docs.truelayer.com/docs/collect-user-consent | n/d | high | §3 row 1 rationale; §5.4; OQ2 |
| PA #43 | Tink consent reconfirmation — late renewal re-fetches only 90 days | https://docs.tink.com/resources/transactions/consent-reconfirmation | n/d | high (mirror) | Why user-present re-fetch is limited (OQ3) |
| RL S-04 / PA #3 | EBA Q&A 2019_4631 — user-present requests unlimited | https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2019_4631 | n/d | high | OQ3 |
| NB-§5, §6, §7 | E-mail ingestion (forward-to-inbox; discard non-receipts; short attachment retention); receipt images may contain others' data; file imports | https://developers.google.com/workspace/gmail/api/auth/scopes ; https://cloud.google.com/document-ai/pricing | n/d | medium-high | §3 rows 5–9 |
| RL-§4, RL S-21; NEW-4 | DORA + Delegated Reg. 2025/532 — register of information and incident records would apply only if Lilleri registers as AISP | https://eur-lex.europa.eu/eli/reg/2022/2554/oj ; https://www.jonesday.com/en/insights/2025/07/uniform-standards-for-ict-subcontracting-in-eu-financial-sector-new-obligations | 2022–2025 | high / medium-high | §8 trigger |
| RL-§14, RL S-67 | Product Liability Directive (EU) 2024/2853 (transposition by 9 Dec 2026) | https://eur-lex.europa.eu/eli/dir/2024/2853/oj | 2024-11-18 | high (not fetched) | AI-log window (OQ6) |
| RL-§6.5, RL S-31, S-76; NEW-5 | DPF status; EU residency recommendation | https://curia.europa.eu/juris/liste.jsf?num=C-703/25%20P | 2025–2026 | high / medium | EU-only backups |

*End of document.*
