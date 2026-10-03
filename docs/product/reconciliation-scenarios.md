# Reconciliation acceptance catalogue v1

**Snapshot:** 2026-10-03. **Version:** `reconciliation-scenarios-v1`.

The machine-readable [catalogue](../../packages/engines/src/reconciliation-scenarios.ts)
preserves all 25 numbers and intended outcomes from
[RC §9.3](../research/raw/reconciliation-and-data-model-patterns.md#93-test-scenarios-fixture-driven-expected-behaviour).
It links each case to the current [backlog](backlog.md) and distinguishes the whole
requirement from the smaller behavior actually exercised. The original 38-scenario
evaluation fixture is a separate immutable synthetic regression set; its scenario
count does not establish coverage of these 25 requirements.

`supported` means the stated bounded local scenario has executable evidence.
`incomplete` retains a missing criterion, including unfinished P0 behavior.
`expected_unsupported` applies only to an absent P1/P2 capability. A passing safe-refusal
guard is never feature acceptance. All evidence is synthetic local behavior; it does
not establish real-provider coverage, representative quality, native acceptance or a
cleared beta.

## Requirement matrix

| # | Original scenario / priority | Stories | Status | Actual scope and remaining acceptance |
|---|---|---|---|---|
| 1 | Pending → booked, same amount / P0 | E03.4, E13.1 | Incomplete | Same-ID updates and explicit exact-money replacement work; complete carried edits and first-seen lifecycle for distinct IDs remain. |
| 2 | Pending → booked, changed amount / P0 | E13.1 | Incomplete | Explicit changed-amount linkage requests review and preserves the hold. Tolerance/fuel stages and amount-change history remain. |
| 3 | Pending never books / P0 | E03.4, E13.1 | Incomplete | Missing source records retain conservative reservation. Provider-specific expired-hold/cancellation/fuel handling remains. |
| 4 | Duplicate provider row on resync / P0 | E03.2–.3, E13.2 | Supported | Same-source stable-ID replay preserves canonical rows, revisions and immutable source observations. Sync audit runs remain separate. |
| 5 | Reconsent with ID churn / P0 | E03.2, E13.2 | Incomplete | Scope-stable explicit IDs work; changed provider IDs still need fingerprint/ordinal identity and an audit event. |
| 6 | Two identical coffees / P0 | E03.2, E13.2 | Incomplete | Distinct explicit IDs remain two purchases. No-ID ordinal identity across provider refetches remains. |
| 7 | CSV + bank duplicate / P0 | E05.3, E13.2 | Incomplete | Exact same-day candidates require review unless a unique shared reference proves the link. Full fingerprint/seven-day fuzzy import matching and linked receipt counts remain. |
| 8 | Internal transfer, both legs / P0 | E13.3, E13.6 | Incomplete | Reciprocal source account links plus exact amount/reference prove the pair; revisioned decisions/undo persist. Own-IBAN/code evidence and broader acceptance remain. |
| 9 | Internal transfer, missing leg / P0 | E13.3 | Incomplete | The engine never invents a second leg. An own-IBAN registry and explicit single-leg provenance remain. |
| 10 | Card settlement / P0 typing, P1 period linking | E13.4, E28.4 | Incomplete | A source-declared settlement is excluded from spending without a card account. Verified broader typing and statement-period/subset-sum/retroactive links remain. |
| 11 | Partial/full refund / P1 | E28.1 | Incomplete | Explicit bounded cumulative links net the refund; excess requires review. Category inheritance, merchant-window proposals and period setting remain. |
| 12 | Split / P1 | E28.2 | Expected unsupported | No split ledger/API/rule capability. The guard preserves the parent and counts its purchase once; it does not validate child sums. |
| 13 | Reimbursement / P2 | E32.1 | Expected unsupported | No reimbursable flag/proposal/ledger. A person payment does not automatically reduce the original purchase. |
| 14 | Variable recurring payment / P0 | E14.1 | Supported | Explicit creditor/mandate groups changing descriptors; calendar cadence, exact median and configured variability bands produce an estimate. |
| 15 | Subscription price-increase alert / P1 | E14.3, E29 | Expected unsupported | Observed variability exists; no measured alert producer/dedup/preference is claimed. |
| 16 | Merchant rename/descriptor change / P0 | E07.1, E07.3, E10.2 | Incomplete | Private aliases retain identity/source text. Verified bank patterns, frozen fingerprints and legacy-rule migration remain. |
| 17 | Multi-currency/FX / P0 | E06.5, E13.3 | Incomplete | Exact currencies stay separate; amounts alone never create FX or a cross-currency transfer. Original/billed money and dated rate/source provenance remain. |
| 18 | Timezone/month boundary / P0 | E06.1, E15.1, E13.7 | Supported | A declared provider date stays in its declared month in both Rome and UTC; profile calendars select the current month separately. |
| 19 | DST / P0 | E03.1, E13.7 | Incomplete | Date-only invariants and UTC quota arithmetic work; explicit acquisition acceptance at both Rome DST transitions remains. |
| 20 | Negative balance/overdraft / P0 | E06.2, E05.4, E16.1 | Incomplete | Signed exact balances and available-cash shortfall remain signed; balance facts alone create no income. Complete linked card-liability presentation remains. |
| 21 | Provider retry/partial page / P0 | E03.5–.6 | Supported | Durable bounded checkpoints resume without duplicate financial application, extra refresh for a valid checkpoint, partial freshness or deletion claims. |
| 22 | Consent expiration/history gap / P0 | E02.8, E03.6, E05.3 | Incomplete | Generation fences, long-gap catch-up and history-gap attention work. Exact unavailable interval, direct CSV recovery and complete overlap dedup remain. |
| 23 | Source deletes edited booking / P0 | E03.5, E13.5 | Incomplete | Two complete absences preserve the row/edits and raise Inbox attention. Keep-as-manual/remove and full reversal lifecycle remain. |
| 24 | Back-dated booking / P0 | E03.5, E15.1 | Incomplete | Trailing refetch and original-month arithmetic work. Explicit twenty-day late-booking acquisition and durable late-booked event remain. |
| 25 | ATM → cash wallet / P1 | E28.3 | Incomplete | Proved two-leg cash pairs work and no absent wallet credit is invented. Code-driven wallet creation/untracked remainder remains. |

The current classification is **4 supported, 18 incomplete and 3 expected unsupported**.
Those are requirement statuses, not test results or an accuracy denominator. P0 typing
in case 10 can pass while the combined statement-period scenario stays incomplete.

The original source numbers also expose two historical cross-reference mistakes:
backlog E03.6 cites scenario 22 for paging, although RC 22 concerns a consent/history
gap; E03.7 cites scenario 20 for balance reconciliation, although RC 20 concerns signed
overdraft/liability. Paging and exact balance-mismatch tests are mapped to their real
stories in the acquisition suite rather than renumbering the source catalogue. A
balance-mismatch issue never proves complete provider balance semantics.

The [40-epic execution plan](execution-plan.md) also retains independent local P0
work outside this catalogue: complete feedback/field locks and rule actions/stages,
original-money/dated FX provenance, scoped server search and an authoritative
90-day read projection, verified bank/code patterns, fitted calibration/runtime
policy consumers, exact consent-gap recovery and broader encrypted/indexed fields.
The [offline boundary](../operations/offline-cache.md) and
[evaluation tools](../../tools/evaluation/README.md) describe their actual limits.
Provider access, legal review, native devices and representative labels constrain
real operation/acceptance; they do not mark these missing local paths completed.

## Executable evidence

[The new engine suite](../../packages/engines/src/reconciliation-scenarios.test.ts)
contains **21 actual Vitest cases**, including the catalogue completeness/priority
contract, the supported variable-mandate/month-boundary assertions, conservative
partial behavior and explicit P1/P2 guards. It does not assert full ID churn, fuel
expiry, own-IBAN, split, reimbursement, FX, native storage or alert implementation.

Existing [API ingestion tests](../../apps/api/test/integration.test.ts) execute stable-ID
replay, same-ID pending/booked transition, persisted sticky decisions and reconciliation
undo. The [durable acquisition suite](../../apps/api/test/sync-jobs.test.ts) executes
checkpoint/restart/partial-page retry, source generation/lease fences, bounded complete
application, two-fetch source absence and balance/history attention. These remain
separate scenarios and driver executions; repeating them does not add distinct cases.

The card-settlement correction changes only `summarize`'s booked cashflow selection.
It retains canonical transactions, source money, balances and pending totals. A pending
card settlement still reserves cash in `calculateSafeToSpend`; an unproved ordinary
transfer or lone ATM still follows the existing conservative relationship behavior.

On 2026-10-03, the actual new suite passed 21/21 and the complete engine package passed
142/142 across eight files. Engine typecheck/build and Biome passed. The unchanged
38-scenario/51-transaction evaluation fixture retained `regressionPassed: true`.
Combined repository/database/browser results belong to the final [STATUS](../STATUS.md)
after root integration. None of these counts is representative financial accuracy.

```sh
pnpm --filter @lilleri/engines exec vitest run src/reconciliation-scenarios.test.ts
pnpm --filter @lilleri/engines test
pnpm --filter @lilleri/engines typecheck
pnpm --filter @lilleri/engines build
```
