# Integrated local completion review

Date: 2026-10-03. Scope: the synthetic continuation after committed baseline
`5bbdec9`, with remote PR #3 at `cf608e0` integrated by fast-forward. Earlier integration
evidence remains historical; it does not validate later source changes.
Current aggregate results and reproduction commands are maintained in
[STATUS](../STATUS.md); the full E00–E39 acceptance inventory remains in the
[execution plan](../product/execution-plan.md).

The continuation preserves audited runtime policy, local OpenTelemetry,
forced tenant RLS, selected-field encryption, masked support, consent/privacy,
in-app notifications and portable rights. Frozen migrations 0023–0031 add
durable acquisition, private merchant/user taxonomy, recurring feedback, ICU
locale, XLSX provenance, source-erasure receipts/generation facts, crash-safe
connection creation, saved understanding and source-bound manual command caches.
The current chain has 31 reviewed files.

The App also integrates an encrypted session-bound read-only web cache and
Italian/British English presentation. Local evaluation tools validate frozen
splits, exact metrics and shadow-policy review/rollback without training a model
or activating runtime inference. All financial records and grants are synthetic.
Combined installer/check/build/database/browser results are finalized in STATUS;
this review does not invent an aggregate PASS from module handoffs or old totals.

## Retained repairs from the earlier integration

| Finding | Resulting behavior and evidence |
|---|---|
| A financial transaction could open a second trusted PGlite read for identity or policy and block itself | Request identity, ownership identity data and runtime policies are captured before the financial scope; scoped financial work uses its supplied handle |
| A reply could announce success before transaction commit | Responses are buffered until commit, including post-commit key finalization; injected commit/handler failures do not send premature success |
| Read-only export calls produced completion notices | Both GET exports preserve state; explicit POST creates the ZIP and an essential completion notice after the captured snapshot. Actual application tests cover this boundary |
| Immutable child audits prevented legitimate source cascade deletion | New frozen migration 0022 allows a nested deletion only when its exact parent is absent. Direct audit DELETE/UPDATE stays denied; source/profile erasure and preservation of independent history are exercised on both drivers |
| A wrong local vault could falsely complete key destruction | Finalization supplies the staged expected key ID; missing expected private key leaves the intent pending. A real older backup still decrypts through the original vault until that vault is correctly destroyed |
| Legacy saved mapping content and immutable snapshots escaped the financial storage upgrade | Startup encrypts mapping names, definitions and snapshots losslessly in one transaction. Prefix-like plaintext, owner export equality and rollback restoring content and audit guards are covered |
| Null network metadata made independent Unix-socket clusters appear equal | A pinned trusted/runtime session pair uses two random advisory-lock challenges. Separate same-name clusters are rejected; failed verification leaves no runtime locks |
| A vault fingerprint interpreted PostgreSQL URL overrides differently from the driver | A nonconnecting instance of the installed driver projects only effective host/port/database. Duplicate overrides, empty fallbacks, environment defaults and ignored database query parameters are tested without copying credentials |
| Real-clock consent and mapping transitions produced slightly different state/event timestamps | New producers use the persisted transition instant. Export accepts causally ordered historical consent/mapping event latency while rejecting reversed history, changed snapshots or times outside their revision windows; original journals remain intact |
| Native accessibility props did not expose checkbox state in React Native Web | Panels also supply explicit web ARIA state. Actual privacy, notification, understanding and mapping browser checks exercise the served controls |
| Repeated decryption queued concurrent queries on one PostgreSQL client | Financial and manual-audit decryption awaits each scoped query sequentially, preserving exact owner DTOs |

Browser helpers also needed corrections to their selectors, documented HTTP status
expectations and arithmetic. Those corrections preserved the financial and
concurrency assertions; they did not alter application data to hide failures.
Mode and source changes required cleared Metro bundles before verification.

## Continuation defects and resulting contracts

| Finding | Resulting behavior and evidence |
|---|---|
| Connection discovery/grant creation waited inside scoped SQL, preventing concurrent revoke/delete from completing | Preparation commits an exact generation intent before provider I/O. Apply uses a short locked recheck; deletion/revocation cancels the intent and late settlement enters compensation. [Creation tests/contract](local-connection-creation.md) cover cancellation, crash/deadline and shutdown without redispatching the grant |
| Early revocation acknowledgement could be mistaken for permanent remote cancellation | Unknown settlement remains fenced even after acknowledgement. An observed late grant rearms its exact revocation job and needs a subsequent acknowledgement. No vendor finality or permanent tombstone is inferred |
| A partial acquisition or delayed lease could advance financial state | Committed budgets/leases and bounded encrypted checkpoints precede fetches outside SQL. Every page/final apply rechecks current grant/generation/deadline/lease; only the complete validated snapshot changes balances/freshness. Background work cannot borrow user presence from a saved foreground intent. [Acquisition evidence](../architecture/durable-synthetic-sync.md) remains synthetic |
| A default disconnect body broke earlier clients that send DELETE without JSON | The strict optional body is nullish. Omitted/null bodies retain history and revoke; only explicit `{data: "erase"}` enters source erasure. Invalid choices still fail validation; profile identity remains server-derived |
| Recognition rejected valid existing source text containing unsupported controls and blocked rights export | The reader abstains per row with fixed `unsupported_source_text` evidence, preserving original ledger/export text. Writer limits remain strict; database/crypto errors are not swallowed |
| Display renames or ambiguous intermediary text could silently change merchant grouping | A resolved private alias has stable versioned identity. Raw source text/legacy keys remain unchanged; conflicting/unknown recognition abstains, and private/quiet surfaces suppress identity/proposals. Category assignment and merge/undo preserve historical labels and current privacy/revision fencing |
| Unmatched declared card settlement appeared as new monthly spending | The declared settlement is excluded from spending while its actual pending cash reservation remains. This correction does not establish complete statement-period reconciliation or negative-balance presentation |
| Physical source erasure could be forgotten when an old database backup was restored | Exact owned membership is recorded in an independent fsynced HMAC receipt anchored in the current vault before deletion. Startup/access and compiled restore require current authenticated replay, and unknown membership stays quarantined. The shared profile DEK survives; old source data remains decryptable before replay |
| A newer generation signature could authorize restored older rows, payloads or cached financial responses | Source proofs bind actual profile/source/account membership, erasure generation and logical decrypted content. Manual command proofs include operation/request hash/response/server time and real audit events. Transplants, mismatched account parents and unknown orphan caches fail; actual later authorized same-ID generations may survive |
| Missing live references tempted exporters to infer that a row had been erased | Only exact currently authenticated receipt references admit missing historical merchant/category audit subjects, within their erasure clock. Current assignments still require the actual ledger. Quiet/private histories remain in the owned export |
| External version-1 export metadata accepted ISO offsets but the new receipt validator required canonical UTC for that metadata too | Only external `snapshot.exportedAt` accepts valid offsets and uses parsed-instant cutoff comparison. Its original representation is preserved. Signed receipts, intents and global recovery-journal stamps remain canonical UTC; MAC bytes and internal monotonic guards are unchanged |
| Forged monthly payloads could retain valid hashes while omitting an expense or borrowing another source receipt | Validation checks the complete disjoint booked-input partition, exact sums/currencies/refund evidence, original owned membership and composite receipt references. Recomputing a hash does not replace those semantic checks. Capture calculates real server inputs once, then rechecks ledger/privacy/policy/source generations under lock |
| A historical capture could reveal currently quiet/private evidence or disappear permanently from data rights | Current privacy filtering precedes bounded SQL pagination/decryption and suppresses a whole affected presentation capture. Ownership export retains original observations; authenticated old-source erasure redacts exact old-generation capture/event payloads. Later same-ID authorized captures survive replay |
| A recorded summary kind could be reported as a delivered producer | A newly saved complete nonempty monthly capture invokes the actual scoped `summary_ready` producer. Duplicate saves and partial coverage do not. N-SERVICE, preferences, quiet hours and delivery limits still apply; this is an in-app producer, not native push |
| Successful-looking notices or stale panel responses could survive a failed 409 action or a new principal | Understanding clears the prior notice at action start, keeps conflicts as explicit refresh/new-gesture decisions and fences late responses with profile/snapshot epochs. Offline App gates block financial reads/writes other than overview retry and discard cached authorization on received invalidation or erasure attempts |
| Rule preview omitted its real semantic heading and localized labels lost intended spacing | The actual preview is a level-3 heading using one named ICU message with the user's original rule name. Browser selectors follow that served heading and rendered ICU whitespace; preview/apply financial assertions remain intact |
| Disposable PostgreSQL fixtures left independent signed receipts after destroying their temporary signer, contaminating later restore checks | Trusted teardown removes only its exact synthetic UUID profiles' receipt/intent fixtures and restores immutable guards transactionally. Production receipts still survive profile erasure; no restore-readiness guard is weakened to ignore them |

These corrections are backed by their scoped source/tests and specialized
contracts: [source erasure](../architecture/source-erasure.md),
[understanding persistence](../architecture/understanding-persistence.md),
[merchant/taxonomy](../implementation/merchant-taxonomy.md),
[recurring](../architecture/observed-recurring.md),
[locale](../architecture/localisation.md) and
[offline cache](../operations/offline-cache.md). Actual browser and aggregate
execution must be read from STATUS after the final compiled/bundle gate; a helper
existing on disk is not execution evidence.

## Boundary of this evidence

The independent PostgreSQL continuation review used an actual non-owner login
across 24 tables, covering FORCE RLS, absent context, bidirectional scope,
cross-profile mutation/reference denial, immutable audits and receipt-bound
redaction/cascades. The separate two-cluster suite executed all 16 scenarios,
including the same-name Unix-socket case, with 31 matching migration checksums
and no remaining temporary roles or advisory locks. Artifacts are
`/workspace/.lilleri-validation/continuation-new-rls-proof.json` and
`rls-socket-31-20261003/final-proof.json`. These are actual targeted proofs,
separate from default-suite PostgreSQL skips and current aggregate totals.

The filesystem vault, closed/copied/reopened quarantined PGlite backups and
compiled recovery CLI are local key/restore evidence. Source row erasure retains
the shared key and requires current journal replay before serving a backup.
Neither establishes deployed KMS, TLS, PITR, historical key-copy destruction,
privileged joint journal/vault rollback resistance or processor deletion.
Native push/devices/keystores/assistive technologies, actual users and independent
production acceptance remain separate evidence.

CSV and bounded XLSX share explicit mapping/provenance and hostile-input refusal;
native share entry and verified per-bank coverage remain open. Durable synthetic
budgets/jobs/checkpoints and foreground refresh exist, while real-bank semantics,
hosted authorization and actual background-device operation remain unverified.
Saved monthly snapshots record actual observations; safe-to-spend refuses unknown
coverage/private liabilities. The web cache preserves one complete bounded saved
overview, not a server-projected 90-day archive, cold offline login or write queue.
ICU/English availability is not international bank coverage or editorial/legal
approval. Synthetic evaluation groups establish tool invariants and refusal,
not fitted calibration, empirical accuracy or model promotion.

The current production dependency audit remains **2 HIGH / 0 MODERATE /
0 CRITICAL**, with node-forge and braces unpatched in the observed chain. The
UUID override is separate recorded compatibility evidence. See
[SECURITY](../../SECURITY.md); a passing build/application suite does not clear
these findings.

## Work that remains locally implementable

All 40 epics retain unfinished stories or acceptance prerequisites. The exact
[25 reconciliation requirements](../product/reconciliation-scenarios.md) record
**4 supported, 18 incomplete and 3 expected unsupported**; safe refusal of a later
capability cannot complete an incomplete P0 criterion. Genuine remaining local
work includes no-ID/ID-churn identity and pending transitions, own-IBAN and
source-removal decisions, cross-source dedup, original/billed FX provenance,
scoped server search/90-day projection, full feedback/field-lock/rule actions,
fitted calibrators/runtime policy, exact renewal gaps, wider encryption/index
coverage and retained-object/rights controls.

Remaining independent software work stays active in the execution plan. External
provider, legal, infrastructure and empirical prerequisites control real operation
and release claims; this review does not mark the full roadmap complete.
