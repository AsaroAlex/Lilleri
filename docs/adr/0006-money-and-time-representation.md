# ADR-0006: Exact money and financial dates

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; implementation team
- **Decision gate:** D for the scoped mock-first architecture; not a real-data release approval

## Context

FACT: [money package](../../packages/money/src/money.ts) already uses bigint and rejects unsafe numeric minor-unit input/currency mismatch. [Currency table](../../packages/money/src/currency.ts) contains zero-, two- and three-decimal exponents; it is a maintained supported subset, not every ISO currency. FACT: provider date/FX semantics vary in [raw model research](../research/raw/reconciliation-and-data-model-patterns.md). ASSUMPTION: exact finance plus consistent timezone semantics is more valuable than convenience conversion through JavaScript Number or Date.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| bigint minor units + currency + source dates | Exact integers, explicit FX and calendar fields | Safe arithmetic and predictable API | Requires explicit JSON and exponent/range handling | Current money/domain packages |
| number minor units + guards | Integer arithmetic within safe range | Familiar language operations | Easy accidental unsafe sum/JSON/decimal conversion | Money library research |
| Floating-point decimal and UTC midnight | Convenient ordinary numbers/timestamps | Easy UI prototypes | Rounding, timezone/DST shifts and currency assumptions | Violates brief; no correctness advantage |

Proposal: all amounts bigint and all dates UTC timestamps. Critique: bank booked dates are calendar facts and converting them to UTC midnight can shift them in user views; FX also needs exact rounding provenance. Counterproposal: separate DATE and instant types with explicit conversion records. Decision: exact money and source-preserving financial dates.

## Decision

DECISION: internal Money is signed bigint minor units plus supported currency. Negative is outflow, positive inflow. Scale is the maintained exponent table, never two-decimal folklore. Database BIGINT inputs are checked against its signed 64-bit range; aggregate overflow/NUMERIC conversion is handled explicitly. JSON amounts are signed decimal integer strings. Parse provider decimal strings exactly with scale validation; unsupported precision/currency goes to a visible error/quarantine, never truncation or silent rounding.

Do not sum currencies. Preserve original/account amounts separately, and reporting conversion only with a dated source rate, exact rational/decimal representation and declared rounding rule. Balances are typed snapshots, not movement sums. Booked/value/authorisation calendar dates are validated real YYYY-MM-DD strings and stored as DATE. Timestamp facts such as observedAt and audit time are UTC instants. Source timezone/offset is retained when supplied. Profile Europe/Rome is a default for user grouping/display, not an invented source timezone or a reason to shift a booked date.

## Consequences

Exact financial invariants become simple bigint equality tests: split sums, transfer conservation, refund allocation and repeat sync totals. Negative: serialization/formatting and DB aggregates need deliberate helpers, and unsupported currencies require a maintained expansion policy. Client formatting must not call Number on large money values. Currency metadata can change historically, so preserve applicable scale/source and never reinterpret an old record by casually changing a table. Locale display is presentation; the underlying exact value remains identical.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Unsafe Number conversion at API/report boundary | Medium | High | Exact serializer/formatter and large-value tests | Precision mismatch above safe integer range |
| Date-only fields shifted by timezone | Medium | High | Calendar validation and DST/offset fixtures | Booking date changes with device zone |

## Revisit conditions

Revisit only to expand supported currencies, handle provider-specific precision/FX, or add explicit accounting semantics. The exactness invariant is not relaxed for performance. Test currency exponent changes/historical data before metadata updates. New provider fixtures must include date-only, offsets and original versus account currencies.

## References

- [Money implementation](../../packages/money/src/money.ts); [domain](../../packages/domain/src/index.ts).
- [Model research](../research/raw/reconciliation-and-data-model-patterns.md), source dates retained there.
- [API contract](../architecture/api-contract.md); [domain design](../architecture/domain-model.md).
