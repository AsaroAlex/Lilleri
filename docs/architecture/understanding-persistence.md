# Saved choices and observed monthly captures

The local E15/E16 implementation saves user choices and actual monthly observations. It does not reconstruct what the application might have known in the past or treat estimated available funds as an observed balance.

## Choices, revision and undo

`GET /v1/understanding/preferences` starts at virtual revision 1 with no included accounts, no assumed buffers and a month-end horizon. Users explicitly save selected account IDs, nonnegative exact minor-unit buffers per selected currency, and month end, a chosen date, or a next-salary date they provide. A saved salary date does not establish that income will arrive.

`PATCH /v1/understanding/preferences` requires the expected revision and digest. A profile lock serializes competing writers. A change increments the revision and appends an immutable encrypted before/after event; a no-op does neither. `POST /v1/understanding/preferences/undo` requires the current revision/digest and current event ID. Undo appends another event; a source-erasure change cannot be undone. Stale writes return 409 and require a new gesture after refreshing.

State and event payloads use the existing profile AES-GCM envelope with profile/table/column/row AAD. Amounts remain canonical integer strings through storage, JSON and UI. Account ownership and currency are checked. Editing choices invalidates the cash estimate; calculation remains explicit and keeps the existing conservative handling of hidden liabilities.

## Actual capture and immutable evidence

`GET /v1/insights/monthly` returns the observed result and actual captured instant, input/ledger/privacy digests and captured policy version. `POST /v1/insights/monthly/snapshots` requires the selected month, expected input digest and policy version. The server reads actual inputs once and calculates once, then locks the profile and rechecks ledger, source generations, privacy and policy before saving. An intervening change returns 409. The client supplies no amounts, formula or result to persist.

The encrypted immutable payload contains the observed result, contributing economic facts, confirmed-refund evidence, exact calculation, policy parameters and generation references. A refund counterpart outside the selected month remains evidence with its original booking date; it is not added to that month's totals. Raw descriptions, merchant names and credentials are not copied.

Validation checks the complete disjoint partition of nonzero booked inputs, exact integer sums, refund relationships and bounds, clocks, owned account/transaction membership and payload digests. Historical amounts and revisions are deliberately not compared with subsequently updated facts.

Saving unchanged month/input/policy state returns the original capture. A new complete capture with at least one insight can produce the scoped `summary_ready` notification. Partial coverage and repeated saves do not produce it. N-SERVICE permission, notification preferences, quiet hours and delivery limits still apply. No external push adapter is asserted.

## Current privacy, rights and erasure

`GET /v1/insights/monthly/history` suppresses a whole capture if any referenced account/transaction is missing or currently excluded by quiet/private/health/category settings. SQL filtering precedes the keyset query limit and decryption: at most `historyPageSize + 1` visible rows are read. The canonical default is 20, bounded 1–100; no lifetime or expiration policy is invented. The panel refreshes on overview changes and fences asynchronous results with the existing identity epoch.

Personal JSON/ZIP rights exports retain original observations hidden by presentation privacy. The optional `understandingPersistence` field contains current preferences, immutable events and monthly captures; older archives without it remain supported. Reads and decryption are sequential on the scoped SQL client. Export validation bounds clocks by actual profile creation/export instants.

Frozen migration 0030 provides profile/household RLS, owned financial references, immutable guards and composite profile/receipt foreign keys. The erasure callback runs after receipt MAC verification and financial-generation classification. It redacts whole old encrypted capture/event payloads, prunes affected choices and appends a minimal receipt-bound change before financial facts are deleted. Later authenticated same-ID facts and captures survive older receipt replay. This is row erasure with mandatory restore replay; the shared profile key remains for surviving sources. Whole-profile erasure cascades the module records.

## Evidence

Sixteen persistence test groups pass on fresh PGlite and real local PostgreSQL: actual HTTP, encryption, exact large buffers, reopen/undo, conflicts, a real intervening write, current privacy with original export, pagination, SQL guards/RLS, recomputed-hash attacks, scoped receipt foreign keys, actual erasure, later same-ID generations and summary production. Eleven current Understanding calculation groups also pass on PostgreSQL. Disposable fixture teardown removes only its tracked profile UUIDs' independent receipts and creation intents; a separate PostgreSQL run of Understanding, retention and restore passed 33 groups and left zero receipts or orphan receipts. Production restore verification remains unchanged.

Actual browser checks pass against the compiled local API and Expo web: nine current-calculation groups and twelve persistence groups, with zero JavaScript errors. The persistence proof verifies exact large buffers, saved selections and salary horizon, reopening, immutable undo, a conflict explanation that remains after refresh, a fresh save gesture, actual monthly inputs and policy, complete idempotent capture, current-private history suppression, and the eleven-file ZIP retaining original captured evidence. It restores and reads back the original preference values and privacy flags, and preserves every financial fact and transaction observation timestamp. Five bank account freshness timestamps advanced during the automatic background sync; the helper separately verifies monotonic, nonfuture freshness on the same source instead of treating those timestamps as changed economic facts. Saved captures and audited choices remain deliberately retained. Evidence is in `.lilleri-validation/completion-understanding-final.json` and `.lilleri-validation/understanding-persistence-ui.json`, with matching logs. Native devices and external bank/push integrations remain outside these local proofs.
