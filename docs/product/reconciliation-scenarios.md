# Reconciliation acceptance catalogue v1

**Snapshot:** 2026-10-04. **Version:** `reconciliation-scenarios-v1`.

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

## 2026-10-04 integration boundary

The matrix below records the implemented roadmap increment while retaining the v1
requirement statuses: **4 supported / 18 incomplete / 3 expected unsupported**.
The machine-readable v1 catalogue's capability descriptions predate this increment;
its whole-case acceptance has not been independently promoted. New API/integration
proof is linked below rather than treated as automatic completion of a scenario.
Fuel/tolerance stages, own-IBAN evidence, full field-lock/action detail, batch undo
and the explicitly later features remain unfinished.

## Requirement matrix

| # | Original scenario / priority | Stories | Status | Actual scope and remaining acceptance |
|---|---|---|---|---|
| 1 | Pending → booked, same amount / P0 | E03.4, E13.1 | Incomplete | Same- and distinct-ID replacements retain original first-seen/amount history and compatible category/private/quiet corrections; explicit bridge undo persists across refetch. Whole-case acceptance promotion remains pending in v1. |
| 2 | Pending → booked, changed amount / P0 | E13.1 | Incomplete | Explicit changed-amount linkage records original/replacement money and preserves the hold until revisioned accept; undo restores it. Versioned tolerance/fuel matching and whole-case acceptance remain. |
| 3 | Pending never books / P0 | E03.4, E13.1 | Incomplete | Absence retains conservative reservation. Explicit exact linked expiration/cancellation/reversal has immutable terminal history; unproved or partial reversal cannot release the hold. Provider-specific fuel/expiry semantics and whole-case acceptance remain. |
| 4 | Duplicate provider row on resync / P0 | E03.2–.3, E13.2 | Supported | Same-source stable-ID replay preserves canonical rows, revisions and immutable source observations. Sync audit runs remain separate. |
| 5 | Reconsent with ID churn / P0 | E03.2, E13.2 | Incomplete | Actual in-place renewal can alias a uniquely proved new provider ID to the canonical row, preserving corrections and immutable identity audit. Ambiguous renewal stops atomically; whole-case acceptance promotion remains pending in v1. |
| 6 | Two identical coffees / P0 | E03.2, E13.2 | Incomplete | No-ID fingerprint/ordinals preserve distinct purchases across complete pagination, reordering and refetch. Unknown/incomplete coverage cannot establish identity; whole-case acceptance promotion remains pending in v1. |
| 7 | CSV + bank duplicate / P0 | E05.3, E13.2 | Incomplete | Seven-day same-account/currency/exact-money candidates allow different descriptors and require an explicit row choice. Linked receipt/source audit and ordinary duplicate undo survive retry/raw expiry. Broader automatic fuzzy/supersession policy and whole-case acceptance remain. |
| 8 | Internal transfer, both legs / P0 | E13.3, E13.6 | Incomplete | Reciprocal source account links plus exact amount/reference prove the pair; revisioned decisions/undo persist. Own-IBAN/code evidence and broader acceptance remain. |
| 9 | Internal transfer, missing leg / P0 | E13.3 | Incomplete | The engine never invents a second leg. An own-IBAN registry and explicit single-leg provenance remain. |
| 10 | Card settlement / P0 typing, P1 period linking | E13.4, E28.4 | Incomplete | A source-declared settlement is excluded from spending without a card account. Verified broader typing and statement-period/subset-sum/retroactive links remain. |
| 11 | Partial/full refund / P1 | E28.1 | Incomplete | Explicit bounded cumulative links net the refund; excess requires review. Category inheritance, merchant-window proposals and period setting remain. |
| 12 | Split / P1 | E28.2 | Expected unsupported | No split ledger/API/rule capability. The guard preserves the parent and counts its purchase once; it does not validate child sums. |
| 13 | Reimbursement / P2 | E32.1 | Expected unsupported | No reimbursable flag/proposal/ledger. A person payment does not automatically reduce the original purchase. |
| 14 | Variable recurring payment / P0 | E14.1 | Supported | Explicit creditor/mandate groups changing descriptors; calendar cadence, exact median and configured variability bands produce an estimate. |
| 15 | Subscription price-increase alert / P1 | E14.3, E29 | Expected unsupported | Observed variability exists; no measured alert producer/dedup/preference is claimed. |
| 16 | Merchant rename/descriptor change / P0 | E07.1, E07.3, E10.2 | Incomplete | Private aliases retain identity/source text. Verified bank patterns, frozen fingerprints and legacy-rule migration remain. |
| 17 | Multi-currency/FX / P0 | E06.5, E13.3 | Incomplete | Original/billed minor amounts, literal dated rates and source versions are encrypted, visible in detail and retained in ownership export. Missing evidence stays unknown; conflicting source evidence leaves canonical money unchanged. Complete cross-currency transfer proof and whole-case acceptance remain. |
| 18 | Timezone/month boundary / P0 | E06.1, E15.1, E13.7 | Supported | A declared provider date stays in its declared month in both Rome and UTC; profile calendars select the current month separately. |
| 19 | DST / P0 | E03.1, E13.7 | Incomplete | Date-only invariants and UTC quota arithmetic work; explicit acquisition acceptance at both Rome DST transitions remains. |
| 20 | Negative balance/overdraft / P0 | E06.2, E05.4, E16.1 | Incomplete | Signed exact balances and available-cash shortfall remain signed; balance facts alone create no income. Complete linked card-liability presentation remains. |
| 21 | Provider retry/partial page / P0 | E03.5–.6 | Supported | Durable bounded checkpoints resume without duplicate financial application, extra refresh for a valid checkpoint, partial freshness or deletion claims. |
| 22 | Consent expiration/history gap / P0 | E02.8, E03.6, E05.3 | Incomplete | Completed declared coverage/consent events disclose exact unrecovered intervals and route to account-specific CSV recovery. Unknown/partial or incomplete multi-account evidence stays unverified; imports do not prove completeness. Whole-case overlap/renewal acceptance remains. |
| 23 | Source deletes edited booking / P0 | E03.5, E13.5 | Incomplete | Two complete absences preserve edited canonical facts and enable revisioned keep-manual/remove/undo. Search and 90-day history share those decisions; removed facts remain reviewable/exportable. Complete reversal/source-reappearance whole-case acceptance remains. |
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
verified bank/code patterns, fitted calibration/runtime policy consumers, persisted/native
90-day cache, admitted official-provider lifecycle/sync and broader encrypted/indexed
fields. Scoped server search, actual 90-day history, original/billed FX provenance and
evidence-based consent-gap/direct import recovery are now implemented locally.
The [offline boundary](../operations/offline-cache.md) and
[evaluation tools](../../tools/evaluation/README.md) describe their actual limits.
Provider access, legal review, native devices and representative labels constrain
real operation/acceptance; they do not mark these missing local paths completed.

## Executable evidence

[The new engine suite](../../packages/engines/src/reconciliation-scenarios.test.ts)
contains **21 actual Vitest cases**, including the catalogue completeness/priority
contract, the supported variable-mandate/month-boundary assertions, conservative
partial behavior and explicit P1/P2 guards. That engine suite alone does not assert
the newer API identity/FX implementation, fuel matching, own-IBAN, split, reimbursement, native storage or alert acceptance.

The 2026-10-04 integrated API suites add the following bounded evidence:

- [Sync identity](../../apps/api/test/sync-identity.test.ts): missing-ID ordinals,
  actual renewal aliases, ambiguous/incomplete refusal, carried corrections,
  immutable audit, isolation and erasure fencing.
- [Pending/source choices](../../apps/api/test/pending-lifecycle.test.ts): compatible
  carried edits/first-seen, changed-money accept/undo, exact terminal evidence,
  persistent source keep-manual/remove/undo and retained private ownership facts.
- [Mapped import](../../apps/api/test/mapped-import.test.ts) and
  [consent gaps](../../apps/api/test/consent-history-gap.test.ts): explicit seven-day
  links/receipt counts, undo/reimport memory, stale privacy fences and completed-window
  evidence for exact gaps without inferring completeness from rows.
- [Ledger reads](../../apps/api/test/ledger-read.test.ts): both read projections agree
  with source choices, reject stale cursors and preserve encrypted canonical money.
- [FX evidence](../../apps/api/test/fx-evidence.test.ts): exact original/billed money,
  literal rates, retained corrections/conflicts, raw-TTL survival, atomic contradictory
  snapshot refusal, owned references, RLS and source/profile erasure.

The root combined gate passed 23 Turbo tasks with 579 API tests/3 skips on PGlite;
the same 45-file suite passed 581/1 on PostgreSQL. Driver repetitions are not added
together. These totals cover the repository increment, not 25 independently completed
case requirements. Latest visual/browser release acceptance and deployment are tracked
separately in [STATUS](../STATUS.md).

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
