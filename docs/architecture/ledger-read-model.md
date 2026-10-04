# Owned ledger search and 90-day history

DECISION, 2026-10-04: the server projection is a bounded read of actual owned
history. It is not a forecast of future balances, and it does not recalculate
Home totals from a filtered or incomplete transaction page.

`GET /v1/ledger/search` searches the current profile's complete available ledger.
It accepts `q`, `accountId`, `currency`, `status`, inclusive `from`/`to` financial
dates, `limit` and an opaque `cursor`. Text matching is a literal, Unicode
normalised, case-insensitive substring of original description, merchant name or
reference. It does not search translated category labels or private merchant
alias labels. `%` and `_` are ordinary text, not SQL wildcards. The profile is
always derived by the server. A foreign or unavailable account produces 404;
caller-supplied profile fields are rejected.

`GET /v1/ledger/projection` accepts the same filters except arbitrary dates. The
server determines today in the current profile's IANA timezone, then includes
today and the preceding 89 calendar days. A transaction's booking date takes
precedence over its authorization date. Undated, older and future dated entries
are excluded from this projection and remain searchable through full history.
The `window` and `policy` fields disclose these rules. The projection also returns
current observed balances for owned accounts, each with its own currency and
`balanceUpdatedAt`. Account/date/text/currency filters apply to transaction rows;
currency filtering does not imply converting an account's balance. No opening
balance, future cashflow, mixed-currency total or assertion of complete bank
coverage is inferred.

Transactions are returned in descending financial-date order, then ascending
canonical ID; undated entries sort last. Confirmed provider replacement holds
are excluded only after their complete same-profile/source/account/provider,
currency, amount and explicit relationship evidence is verified, including when
the replacement lies outside the requested date window. Ownership exports keep
the canonical original. Read DTOs retain exact money strings and revisions.

Reads run in a repeatable-read profile scope with FORCE RLS and the existing
session, source-journal readiness and deleted-profile guards. Search does not
store query terms or a plaintext search index. Text is decrypted only in scoped
chunks. Each response inspects at most 1000 eligible rows and returns at most 100
transactions (default 50), with at most 128 KiB of serialized transaction contents.
The projection returns at most 200 account contexts; an excessive context or
single oversized record fails explicitly rather than creating a partial
snapshot. A search page may contain no matches while `nextCursor` is present.
The UI offers continuation and reports no-results only after `searchComplete`.

Cursors are authenticated with a process-local HMAC, bound to profile, filters,
purpose, sort position and current ledger revision. They expire after 15 minutes
and fail after a server restart. A profile-wide SQL digest fences changes to
canonical rows, sync presence, privacy flags, account observations and profile
metadata. A late booking, source erasure, privacy change or balance update during
paging returns 409 `ledger_changed`, requiring an explicit new search. This
prevents missing a newly inserted row ahead of a cursor or mixing pages from
different authoritative states. Digest calculation scans profile metadata in SQL;
it does not decrypt the complete archive. Its database cost remains linear in
archive size; large-archive load/latency acceptance is not established by these
synthetic functional tests.

Quiet and private purchases remain readable in the owner's ledger, with current
privacy flags attached. These endpoints publish no derived insights, review
notifications, recurring estimates or filtered spending totals. Existing privacy
suppression continues to apply where those derived products are produced.

The Movimenti view uses server search and projection, with date/account/currency
controls, continuation, restart and preserved query/detail/back behavior.
Responses from an old query, profile/session epoch or network state are ignored.
Offline requests remain fenced by the existing API proxy. During a verified
offline overview, search uses only the saved snapshot and states that scope; the
90-day local filter uses the saved retrieval date and profile calendar. No new
native keystore, cold offline session, queued writes or persisted paginated
projection is claimed. The existing 512 KiB full-overview cache can still refuse a
large archive.

Validation: `apps/api/test/ledger-read.test.ts` exercises real scoped HTTP/SQL
queries and encrypted records, exact large money, profile/date/currency filters,
calendar boundaries, paging/tampering/expiry/late booking, bounded continuation,
oversized refusals, current privacy flags and revoked/expired sessions.
`apps/mobile/src/ledger-search-session.test.ts` exercises delayed actual client
responses, cancellation, profile/network fencing, continuation and stale-page
handling. Browser acceptance uses an independent synthetic archive; runtime
proofs are recorded outside the repository.
