# Observed monthly insights and conservative safe-to-spend

`packages/engines/src/understanding.ts` computes inspectable, profile-scoped financial objects from the current canonical ledger. It performs exact bigint arithmetic per currency. It calls no AI/provider, infers no exchange rate, writes no ledger and assigns no calibrated confidence probability. The module's version is `observed-understanding-v1`; every safe-to-spend result also names its caller-supplied policy version.

## Monthly observations

`buildMonthlyInsights` selects the default month and today's calendar date in the profile's actual IANA timezone. Provider booking dates remain calendar dates and never shift through UTC conversion. A past month ends at its calendar month boundary; the current month stops at today. Future months are refused. Future booked rows, missing booking dates, unknown/partial account coverage, unresolved cash-flow semantics and pending reconciliation reviews make the result explicitly partial.

Monthly observations use effective booked transactions. Confirmed duplicates and pending-to-booked overlays count once; reversals, internal movements, card settlements and cash withdrawals do not become new spending. The observation names its income, expense, linked-refund and unresolved transaction IDs. It includes the period and a visible calculation:

`net spending = expenses − linked refunds`

`net flow = income − net spending`

A confirmed refund of a purchase from an earlier month reduces current net spending and remains separate from earned income. A refund without the required relationship and an unexplained positive expense record stay separate as unresolved credits. Other inconsistent signed/kind combinations stay unresolved. A partial observed subtotal is not a claim that a provider supplied complete history. An empty account-currency month can have zero observed spending without asserting anything about unconnected sources.

The privacy/quiet transaction set is applied after canonical duplicate/lifecycle resolution. Quiet IDs never enter evidence. A visible refund linked only to a quiet purchase remains unresolved rather than exposing its private relationship. These are deterministic observed calculations (`isEstimate: false`), with `confidence: null` because no calibrated probability exists.

## Safe-to-spend estimate

`calculateSafeToSpend` requires explicitly included account IDs, account-specific knowledge, known recurring evidence, verified occurrence bindings and a complete calculation policy. Policy fields are version, calendar horizon, maximum balance age, occurrence-matching tolerance, maximum forecast occurrences and a separate nonnegative bigint buffer for each selected currency. There are no operational default thresholds in the module. A missing currency buffer is unknown rather than an implicit zero.

The visible formula is:

`safe-to-spend = included balances − pending outflows − estimated upcoming outflows − buffer`

No future income is added. An available balance that already includes pending holds is not reduced twice. A booked balance that excludes those holds reserves each effective negative pending payment once. Confirmed duplicate/booking overlays remove superseded holds. An unresolved potential overlay cannot be silently resolved merely to produce a number.

Cash availability differs from spending classification. A pending transfer or card settlement can consume cash in a selected account even though it is not new monthly spending; positive pending counterparts never add projected cash. Credit/card account balances are not treated as spendable cash. Unknown balance meaning, pending-hold inclusion, stale/invalid/future timestamps and incomplete source coverage produce `status: unavailable` and `value: null`.

Recurring outflows are labelled estimates. The current input contract supports the existing conservative monthly series, and every monthly occurrence through the horizon is reserved. A verified provider/user occurrence binding suppresses that same already observed booked or pending occurrence. If a bound pending row becomes booked, the confirmed canonical relationship identifies its representative once. The same observed payment cannot suppress a later monthly charge. Merchant/date similarity alone leaves the occurrence unresolved. An overdue unobserved charge is unknown; it is not silently moved forward or treated as cancelled. Work above the configured occurrence limit also yields an unavailable result.

The estimate gives a signed shortfall when the formula is negative. It does not clamp a cash deficit into an unexplained zero. All results remain separate by currency and carry `isEstimate: true`, `confidence: null`, policy/version, horizon, selected account IDs, visible evidence and projected occurrence dates/amounts. The copy explains that new spending and surprises can change the result.

`understandingHorizon` chooses an explicitly supplied future salary calendar date or the profile's current month end. Salary amounts remain excluded. The caller must preserve the distinction between an inferred salary date and a confirmed obligation; the helper does not authenticate employment or predict an incoming payment.

## Quiet/private outflows

Quiet transaction IDs are absent from both monthly and safe-to-spend evidence. Ignoring a private pending payment or private-derived future obligation would incorrectly turn a liability into available cash. The estimate instead withholds the affected component and returns unavailable with a content-free reason. Quiet booked historical rows need not be cited to use an already supplied account balance. A private canonical representative cannot leak through an older public pending binding.

## Scoped API and product UI

`apps/api/src/understanding-service.ts` registers `GET /v1/insights/monthly` and `GET /v1/safe-to-spend`. Both calculations read a decrypted, profile-scoped repeatable-read ledger snapshot. The caller captures the versioned runtime policy before entering the financial SQL role scope. Responses validate exact decimal minor-unit strings through their DTO schemas; HTTP requests cannot supply another profile. Safe-to-spend account IDs are explicit, horizon dates are bounded by the configured policy, and each currency buffer is a nonnegative decimal minor-unit string. An omitted buffer is unavailable; malformed/duplicate selectors, fractional minor units and out-of-range dates are refused.

Coverage is source evidence, not an inference from a successful sync. The service treats provider snapshots as unknown coverage and unknown balance meaning, so their safe-to-spend value remains `null`. A manual account with its verified local-manual metadata has a booked balance excluding pending holds and complete coverage of its local ledger beginning on its opening date. A month beginning before that date remains partial. This contract describes recorded local entries and their current balance, not all expenses in a person's financial life. Card balances remain unavailable even when the account is manual.

For availability the service derives full-ledger recurring obligations privately, then passes the persisted quiet/private set to the calculator. It does not reuse the privacy-filtered overview recurrence list: doing that could remove a hidden liability and overstate cash. Hidden recurrence evidence instead makes availability unknown without returning its series, dates, amounts or transaction IDs. The default horizon is the earlier of the profile's current month end and the configured maximum horizon; changing a runtime limit cannot propose a date the same API refuses.

`apps/mobile/UnderstandingPanel.tsx` exposes the current month, an explicit historical month selector, observed per-currency subtotals, source gaps, calculation components and scoped transaction evidence. Its estimate form requires selected accounts, a visible date and an explicit major-unit buffer for every selected currency; decimal-comma input is parsed exactly and never rounded to fit a currency. A signed shortfall and an unavailable estimate have distinct Italian copy. Editing a choice invalidates the old estimate without submitting it automatically. Identity epochs and captured overview objects fence stale responses/errors; old evidence disappears immediately when a new overview arrives, including after a privacy change. A confirmed readonly calculation can refresh after a ledger change while preserving the user's choice.

## Boundaries and verification

The module rejects mixed profiles, foreign accounts/evidence, inconsistent currencies, duplicate canonical identities, malformed calendar/instant data and malformed policy/knowledge values. Twenty-seven pure tests passed on 2026-10-03, covering month/timezone/DST and leap-year boundaries, same-currency exact arithmetic beyond JavaScript's safe integer limit, refund timing, semantic/duplicate/lifecycle exclusions, privacy, incomplete data, explicit account selection, pending inclusion, verified/unverified occurrence handling, repeated charges through longer horizons, shortfalls and forecast work limits. Eleven actual scoped HTTP tests also passed on fresh PGlite and a separate real PostgreSQL database, exercising encrypted storage/decrypted calculations, exact multi-currency responses, source coverage, timezone, private pending/recurring/refund boundaries, runtime policy revisions, shortfalls and cross-profile/input rejection.

`tools/understanding-ui-smoke.cjs` passed nine real Expo-web/Chromium checks on 2026-10-03 against a disposable synthetic archive: current/historical month selection and incomplete coverage; explicit EUR/GBP accounts, exact comma-decimal buffers and visible formula; rejection of empty/over-precision buffers before HTTP; immediate invalidation after an input edit; unavailable bank estimates; quiet evidence suppression while preserving the owned transaction; 48-point controls and no horizontal overflow at 390/320 CSS pixels; and unchanged financial ledger with no browser exceptions. The helper restores its temporary quiet flag and adds only documented synthetic local account/entry fixtures. The actual report/log were preserved at `/workspace/.lilleri-validation/completion-understanding-ui.json` and `/workspace/.lilleri-validation/completion-understanding-ui.log`. They establish the recorded web-browser run, not native-device acceptance.

These are current-input calculations with API/UI integration. Persistence of user choices, independently verified provider balance semantics, broader recurring types/periods, persistent historical insight snapshots, notification delivery and empirically calibrated recurrence accuracy remain separate acceptance evidence. The calculation does not establish financial advice, complete knowledge of future expenses or a production affordability guarantee.
