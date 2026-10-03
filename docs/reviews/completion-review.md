# Integrated local completion review

Date: 2026-10-03. Scope: the synthetic continuation after commit `b85b307`.
Current aggregate results and reproduction commands are maintained in
[STATUS](../STATUS.md); the full E00–E39 acceptance inventory remains in the
[execution plan](../product/execution-plan.md).

This phase integrates audited runtime policy, local OpenTelemetry diagnostics,
forced tenant RLS, selected-field profile encryption, deletion-aware restoration,
masked support, connection consent, privacy choices, in-app notifications,
observed monthly understanding and explicit saved CSV mapping into the existing
financial application. Separate module tests are complemented by the actual
compiled server and Expo web interactions. All records and accounts are synthetic.

## Defects found and repaired during integration

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

## Boundary of this evidence

Local PostgreSQL non-owner credentials and two independent clusters are executed
proofs. The filesystem vault, quarantined PGlite copies and compiled recovery CLI
are local key/restore proofs. Neither establishes deployed KMS, TLS, PITR,
historical key-copy destruction or processor completion. Native push, devices,
assistive technologies and actual user acceptance remain unverified.

The CSV mapper supports bounded text files; XLSX is still open. Provider discovery
and consent use the synthetic adapter; no live coverage, hosted authorization or
full durable bank scheduler is delivered. Monthly calculations describe observed
data, and safe-to-spend refuses unknown inputs rather than inventing availability.
The original synthetic evaluation fixture is a regression tool, not representative
calibration. Production dependency audit still reports two HIGH findings.

Remaining independent software work stays active in the execution plan. External
provider, legal, infrastructure and empirical prerequisites control real operation
and release claims; this review does not mark the full roadmap complete.
