# Owned privacy preferences in the synthetic application

Privacy controls are persisted metadata for the authenticated profile. They do not change canonical transaction amounts, account balances or the owned ledger. A movement marked `quiet` or `private` is excluded from the monthly understanding and safe-to-spend inputs; existing health-category movements are also quiet. The movement and its privacy history remain in the owner's export. Removing a flag includes it again on the next analysis. Erasing a canonical transaction or profile cascades its corresponding metadata and audit, so privacy preferences cannot recreate erased financial data.

`rulesOnly` disables the shared merchant dictionary in actual classification. Personal corrections, profile rules and declared income/transfer facts remain available. Rule previews bind the current privacy revision and context into their digest; applying an older preview after a privacy change requires a new preview. This is a reversible recognition preference, not a claim that transactions are processed by an external AI model.

The mobile panel loads the saved profile and transaction preferences, exposes explicit reversible choices, and refreshes the overview after successful writes. Its profile/session/request epoch also fences late reads, writes and authentication failures. Revision conflicts refresh the saved values and require another gesture; they do not automatically resubmit a choice. The ledger selector searches the currently loaded owned transactions, with at most 50 visible results at once. It does not fetch another profile's data.

## Separate purposes and honest availability

`P-AI`, `C-ANALYTICS` and `N-SERVICE` have independent current records and immutable choice events. All default to `not_granted` without inserting a record. Explicit grant/denial requires the currently displayed text version, hash, notice version and, for P-AI, vendor-list version. Withdrawal needs only the current record revision, so a newer disclosure cannot block withdrawing an older preference. Revision increments fence concurrent choices and withdrawal/regrant reuse.

The registry is synthetic Italian draft text (`*/local-it-IT/draft-1`), and its declared source of truth is `local_preference`. It supplies reviewable UI evidence for this local implementation; it does not establish a lawful basis, approved notice, real vendor list or provider-native consent. `permissionNotFeature` remains true on permission responses. P-AI and identified analytics remain unavailable and never enable external calls even when an API test records a grant. The UI exposes no dormant opt-in switch for those features.

N-SERVICE enables the available optional in-app service feed only for a current explicit grant. It never asserts native push delivery or an OS permission (`nativePushEnabled: false`, `osPermission: unknown`). Mandatory security and data-rights messages, export and deletion remain available after opting out. The notification outbox binds the permission revision, preventing delivery of an old optional message after withdrawal and a subsequent grant.

Denial and withdrawal record a re-prompt boundary six calendar months later in UTC, preserving the time of day and clamping the day for shorter months. The present UI performs no automatic prompts. A user can revisit the setting and make a new explicit choice before that boundary. This boundary is a fixed local product invariant, not an operator-configurable harassment window.

## Scoped routes and audit

All routes resolve the current principal's profile through the existing scoped service; request bodies contain no profile selector:

- `GET /v1/privacy/settings` and `PATCH /v1/privacy/settings` (`revision`, `rulesOnly`).
- `GET /v1/transactions/:id/privacy` and `PATCH /v1/transactions/:id/privacy` (`revision`, `quiet`, `private`).
- `GET /v1/privacy/permissions` and `PATCH /v1/privacy/permissions/:purpose` (explicit choice and `revision`; grant/denial also include current disclosure evidence).

The defaults are revision 1. Changes to profile/transaction metadata and their audit insert are one transaction; no-op metadata updates return the current version. Explicit permission choices always append their own event. Unknown properties are rejected. A stale revision returns `privacy_changed`; stale disclosure evidence returns `privacy_text_changed`. Foreign transaction IDs return unavailable. Audit records contain only typed preference/disclosure evidence, not transaction text, amounts, names or credential material.

Migration `0019_privacy_controls.sql` adds composite ownership foreign keys, forced PostgreSQL RLS and runtime profile/household policies. Runtime writes can insert audit but cannot update or directly delete its history; trusted erasure cascades can remove it. PostgreSQL scoped export reads are sequential on their transaction client. The JSON ownership export includes current settings, transaction flags, all three purpose records and immutable events; its existing audit JSONL also includes those events.

## Validation evidence and scope

Thirteen dedicated privacy tests pass against fresh PGlite and against the separate local synthetic PostgreSQL database after frozen migrations 0019/0020. They exercise default-off reads without writes, actual metadata persistence and reversibility, one-winner concurrent updates, stale revision/ABA fencing, foreign ownership and scoped RLS reads, rules-only behavior, health exclusion, unavailable feature grants, strict disclosure proof, unblocked withdrawal, calendar re-prompt boundaries, immutable audit with erasure cascades, audit-insert failure rollback, and real strict Fastify routes. The synthetic audit fault trigger is limited to its own fixture prefix so parallel PostgreSQL fixtures are not affected.

`tools/privacy-ui-smoke.cjs` is the manual actual-browser runner for the disposable demo archive. Its current fresh-bundle run passed **10/10 groups** with zero browser JavaScript errors: saved rules-only behavior, current draft service choices and withdrawal, transaction flags, ownership export, stale-choice refresh without resubmission, 48-point controls, narrow layouts and browser reload. One explicitly injected obsolete-grant view verifies independent minimal UI withdrawal, while the backend suite separately tests real obsolete stored evidence. Run it sequentially with other writers and only against the disposable synthetic archive; its final cleanup restores rules-only/quiet/private to false and withdraws optional service delivery while preserving the choice audit. Detailed scope, the injected scenario and executed report paths are recorded in [Privacy web flow validation](../reviews/privacy-ui-smoke.md).

These tests establish local behavior and schema constraints. They do not establish legal approval, production authentication, external vendor processing, native push setup or an OS permission grant. Broader integrated API, web UI and PostgreSQL checks are recorded by the repository's final validation gate.
