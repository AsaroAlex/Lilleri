# Local manual accounts and bounded CSV fallback

Status: implemented in the local prototype, 2026-10-03. This is a working slice of E05.1/E05.4, not completion of the generic CSV/XLSX importer or all manual-account acceptance criteria.

A manual source uses `providerId=local-manual`, has no bank grant and does not call a banking provider. The UI labels its accounts “non collegato”. Cash, wallet/other, card and savings accounts all use the existing account and transaction model. Balances and inputs are decimal strings of integer minor units; arithmetic remains `bigint` and currencies never mix.

## Commands and invariants

- `GET /v1/manual/accounts`: profile-scoped accounts with their explicit opening date/balance, current balance and positive revision.
- `POST /v1/manual/accounts`: `{requestId,name,kind,currency,openingBalanceMinor,openingOn}`. Opening balance means the balance at the start of the tracking date. It changes aggregate account balance, not income or spending.
- `POST /v1/manual/transactions`: `{requestId,accountId,amountMinor,currency,bookedOn,kind,description,merchantName?,reference?}`. Expense amounts are negative, income positive and transfers nonzero. Currency must match the account. Dates run from the opening date through the profile’s current calendar day. The current balance changes by the exact amount.
- `POST /v1/manual/accounts/:id/adjust`: `{requestId,revision,balanceMinor,currency,reason}`. The expected account revision prevents a stale tab from overwriting a newer balance. An adjustment is an immutable balance event outside transactions; it never becomes spending or income.
- `POST /v1/manual/transactions/:id/reverse`: `{requestId,revision,accountRevision,reason}`. A fresh manual transaction and account revision are required. The canonical entry becomes reversed, its balance effect is undone once, and previous observations/events remain available. A later balance change requires a fresh review rather than an automatic undo.
- `GET /v1/manual/accounts/:id/events`: balance history scoped to the requested account and profile.

Every write holds the same profile lock as ingestion and category/reconciliation commands. The request marker is 16–128 ASCII letters, digits, hyphens or underscores. A retry with the same marker and normalized body returns the original result; reuse for a changed body or another operation returns `409 idempotency_key_reused`. Ledger, account revision, balance, immutable audit and idempotency response commit together. They roll back together if an observation/audit write fails. The client preserves its marker while the same command has an uncertain response; there is no automatic write replay on conflicts.

The command/audit tables cascade when the profile is erased. They contain minimal durable financial provenance rather than another copy of the original file. Manual source observations use the existing 30-day raw-payload policy; normalized transactions and balance events remain until explicit local erasure. `manual_commands` and `manual_balance_events` reject UPDATE. Export includes `manual.accountStates` and `manual.balanceEvents`; money remains strings.

## CSV preview and import

`POST /v1/imports/csv/preview` accepts `{accountId,csv}`. It runs a read-only snapshot and returns row/new/unchanged counts, total signed minor units, signed minor units of new rows only, currency and whether the destination is a manual account. It rejects changed saved identities, malformed rows, unknown currencies, amounts beyond PostgreSQL bigint range and, for manual accounts, dates outside the tracking interval. It writes no ledger rows, observations or balances.

The current strict format is exactly:

```csv
id,date,amount,currency,description,merchant,reference
coffee-1,2026-10-03,-2.50,EUR,Caffe,Bar,
```

Limits are 256 KiB UTF-8 and 1,000 rows. CSV route JSON framing allows 600,000 bytes so a valid quote-dense raw file does not hit the smaller general request limit; the raw-file limit remains unchanged. Date is `YYYY-MM-DD`, amount uses a decimal point and comma separates columns; standard quoting supports commas inside text. Each row supplies a stable source ID. The UI requires an explicit preview followed by import; editing the destination or text discards the preview.

`POST /v1/imports/csv` retains its existing whole-batch atomicity and stable source IDs. A new row imported to a manual account changes its current balance and revision and creates an `import` balance event inside the same transaction. An unchanged replay changes neither balance nor revision. A late row before the opening date, wrong currency, conflicting identity or unrepresentable amount rolls back every row, observation and audit event in that batch. Imported transactions on a provider account leave the provider-reported balance unchanged.

The opening balance is a declared baseline, not a guessed statement ending balance. Set the opening date/balance before the first imported statement period. A later “Correggi il saldo” command records an explicit new baseline in command order; new entries/imported rows then change that current balance.

Manual cash top-ups are ordinary reconciliation candidates against bank-side ATM withdrawals. They require an explicit match confirmation when account relationships are unproven; confirmed transfer legs are excluded from both spending and income. There is no amount-only automatic confirmation.

## Validation and limits

The dedicated `apps/api/test/manual.test.ts` suite passes on both PGlite and real PostgreSQL and has 14 scenarios covering scoped access, idempotent concurrency, exact JPY/KWD, invalid inputs, opening/adjustment non-cashflow behavior, stale adjustment/undo, reversals, read-only previews, replay-safe manual CSV balances, whole-batch rollback, identity conflicts, ATM matching, late audit failure, immutable events and erasure.

Generic column mapping, XLSX, saved account mappings, per-bank templates/fixtures, fuzzy import deduplication, native file/share targets, automatic wallet completion and recurring manual templates remain backlog work. The quick cash flow defaults its date/description and needs an amount plus save; the five-second target has not been measured with participants or on native devices. Local authentication boundaries may protect these routes in the local identity mode, but this slice does not establish production banking, KMS or regulatory readiness.
