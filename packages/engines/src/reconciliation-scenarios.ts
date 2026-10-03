/** Original requirement numbering from RC §9.3; statuses describe the whole stated scenario. */
export interface ReconciliationScenario {
  readonly id: number
  readonly name: string
  readonly priority: 'P0' | 'P0/P1' | 'P1' | 'P2'
  readonly stories: readonly string[]
  readonly status: 'supported' | 'incomplete' | 'expected_unsupported'
  readonly expected: string
  readonly implemented: string
  readonly remaining: string | null
  readonly evidence: readonly string[]
}

export const RECONCILIATION_SCENARIO_CATALOGUE_VERSION = 'reconciliation-scenarios-v1'
export const RECONCILIATION_SCENARIOS = [
  {
    id: 1,
    name: 'Pending to booked, same amount',
    priority: 'P0',
    stories: ['E03.4', 'E13.1'],
    status: 'incomplete',
    expected:
      'One active movement with source history, original first-seen date and carried edits.',
    implemented:
      'Same-ID updates preserve identity; explicit exact-money source links suppress the pending overlay.',
    remaining: 'Complete carried edits and first-seen state for distinct-ID transitions.',
    evidence: ['apps/api/test/integration.test.ts', 'apps/api/test/sync-jobs.test.ts'],
  },
  {
    id: 2,
    name: 'Pending to booked, amount changes',
    priority: 'P0',
    stories: ['E13.1'],
    status: 'incomplete',
    expected: 'Evidence-based tolerance match, visible changed amount and one counted booking.',
    implemented:
      'An explicit link with a changed amount is proposed for review without suppressing the hold.',
    remaining: 'Versioned tolerance/fuel stages, carried edits and amount-change event/copy.',
    evidence: ['packages/engines/src/reconciliation-scenarios.test.ts'],
  },
  {
    id: 3,
    name: 'Pending never books, fuel authorization hold',
    priority: 'P0',
    stories: ['E03.4', 'E13.1'],
    status: 'incomplete',
    expected: 'Verified fuel booking or provider-specific auditable expired-hold/cancelled state.',
    implemented: 'Absence alone retains the pending hold and conservative cash reservation.',
    remaining:
      'Provider-specific hold expiry/cancellation and supported fuel-preauthorization matching.',
    evidence: [
      'apps/api/test/sync-jobs.test.ts',
      'packages/engines/src/reconciliation-scenarios.test.ts',
    ],
  },
  {
    id: 4,
    name: 'Duplicate provider transaction on resync',
    priority: 'P0',
    stories: ['E03.2', 'E03.3', 'E13.2'],
    status: 'supported',
    expected: 'An identical same-source stable-ID replay creates no new financial row or revision.',
    implemented:
      'Atomic same-ID ingestion preserves canonical rows, revisions and immutable observations.',
    remaining: null,
    evidence: ['apps/api/test/integration.test.ts', 'apps/api/test/sync-jobs.test.ts'],
  },
  {
    id: 5,
    name: 'Reconsent with provider ID churn',
    priority: 'P0',
    stories: ['E03.2', 'E13.2'],
    status: 'incomplete',
    expected: 'Fingerprint and ordinal retain a movement when provider identifiers change.',
    implemented: 'Stable IDs are namespaced by profile, connection, source and account.',
    remaining: 'Provider-ID churn/fingerprint linking and auditable changed-provider-ID event.',
    evidence: ['packages/financial-providers/src/index.test.ts'],
  },
  {
    id: 6,
    name: 'Two identical coffees on the same day',
    priority: 'P0',
    stories: ['E03.2', 'E13.2'],
    status: 'incomplete',
    expected: 'Two no-ID occurrences keep distinct deterministic ordinals through refetch.',
    implemented: 'Two distinct source IDs with identical amount/date/merchant remain separate.',
    remaining: 'No-ID provider ordinal identity across repeated fetches.',
    evidence: ['packages/engines/src/reconciliation-scenarios.test.ts'],
  },
  {
    id: 7,
    name: 'CSV and bank duplicate',
    priority: 'P0',
    stories: ['E05.3', 'E13.2'],
    status: 'incomplete',
    expected:
      'Fingerprint or unique bounded fuzzy match, retained source history and linked import counts.',
    implemented:
      'Exact account/date/amount/merchant candidates need confirmation unless a unique shared reference proves the link.',
    remaining:
      'Full fingerprint/ordinal and seven-day fuzzy import matching, source supersession and receipt counts.',
    evidence: [
      'packages/engines/src/reconciliation-scenarios.test.ts',
      'apps/api/test/mapped-import.test.ts',
    ],
  },
  {
    id: 8,
    name: 'Internal transfer between two accounts',
    priority: 'P0',
    stories: ['E13.3', 'E13.6'],
    status: 'incomplete',
    expected:
      'Owned-account evidence pairs both existing legs, excludes cashflow and supports rejection/undo.',
    implemented:
      'Exact opposite amounts plus reciprocal source account links and unique reference prove a pair; decisions persist.',
    remaining: 'Own-IBAN registry/code evidence and complete window/policy acceptance.',
    evidence: [
      'packages/engines/src/reconciliation-scenarios.test.ts',
      'apps/api/test/integration.test.ts',
    ],
  },
  {
    id: 9,
    name: 'Internal transfer with one side missing',
    priority: 'P0',
    stories: ['E13.3'],
    status: 'incomplete',
    expected:
      'A registered own-IBAN identifies the existing leg without inventing an absent transaction.',
    implemented: 'An unconnected counterpart never causes creation of a second leg.',
    remaining: 'Own-IBAN registry and explicit single-leg transfer provenance/label.',
    evidence: ['packages/engines/src/reconciliation-scenarios.test.ts'],
  },
  {
    id: 10,
    name: 'Credit-card settlement',
    priority: 'P0/P1',
    stories: ['E13.4', 'E28.4'],
    status: 'incomplete',
    expected:
      'Exclude a typed settlement without card detail; later link the verified statement period.',
    implemented:
      'Source-declared settlement is excluded from spending even without a matched card leg; paired detail counts purchases once.',
    remaining:
      'Broader verified code typing and P1 statement-period/subset-sum/retroactive linking.',
    evidence: [
      'packages/engines/src/reconciliation-scenarios.test.ts',
      'packages/engines/src/index.test.ts',
    ],
  },
  {
    id: 11,
    name: 'Partial and full refund',
    priority: 'P1',
    stories: ['E28.1'],
    status: 'incomplete',
    expected: 'Bounded cumulative refunds inherit category and obey a chosen reporting period.',
    implemented:
      'Explicit same-account/currency purchase links net bounded refunds; excessive totals require review.',
    remaining: 'Merchant-window proposals, inherited category and period choice.',
    evidence: [
      'packages/engines/src/reconciliation-scenarios.test.ts',
      'packages/engines/src/index.test.ts',
    ],
  },
  {
    id: 12,
    name: 'Split',
    priority: 'P1',
    stories: ['E28.2'],
    status: 'expected_unsupported',
    expected:
      'Parent identity is retained; children sum exactly and changed parent amounts require review.',
    implemented: 'No split rows, rule action or inferred split relationship exists.',
    remaining: 'Entire split ledger/event/API/client capability.',
    evidence: ['packages/engines/src/reconciliation-scenarios.test.ts'],
  },
  {
    id: 13,
    name: 'Reimbursement',
    priority: 'P2',
    stories: ['E32.1'],
    status: 'expected_unsupported',
    expected:
      'An explicit flagged expense receives a proposed person-payment reimbursement, never automatic.',
    implemented: 'A similar incoming person payment does not manufacture a reimbursement link.',
    remaining: 'Reimbursable flag, proposal/confirmation and reimbursement ledger.',
    evidence: ['packages/engines/src/reconciliation-scenarios.test.ts'],
  },
  {
    id: 14,
    name: 'Recurring with variable amount',
    priority: 'P0',
    stories: ['E14.1'],
    status: 'supported',
    expected:
      'An explicit mandate groups variable regular observations; an exact median estimates the next payment.',
    implemented:
      'Creditor/mandate identity, calendar cadence, exact upper absolute median and policy amount bands.',
    remaining: null,
    evidence: [
      'packages/engines/src/reconciliation-scenarios.test.ts',
      'packages/engines/src/recurring-observed.test.ts',
    ],
  },
  {
    id: 15,
    name: 'Subscription price increase',
    priority: 'P1',
    stories: ['E14.3', 'E29'],
    status: 'expected_unsupported',
    expected:
      'The same observed series receives one measured price-change alert without a duplicate series.',
    implemented:
      'Observed amount variability is available; no delivered price-change notification is inferred.',
    remaining: 'Precision-gated alert producer, inbox action, dedup and preference.',
    evidence: ['packages/engines/src/recurring-observed.test.ts'],
  },
  {
    id: 16,
    name: 'Merchant rename and descriptor change',
    priority: 'P0',
    stories: ['E07.1', 'E07.3', 'E10.2'],
    status: 'incomplete',
    expected:
      'Verified aliases preserve merchant identity, old rules and originally computed fingerprints.',
    implemented:
      'Private merchant aliases retain stable identity and original source text; generic normalization is versioned.',
    remaining:
      'Verified bank descriptor patterns and frozen fingerprint/legacy-rule migration across arbitrary source changes.',
    evidence: ['packages/engines/src/merchant.test.ts', 'apps/api/test/merchant-taxonomy.test.ts'],
  },
  {
    id: 17,
    name: 'Multi-currency and dated FX',
    priority: 'P0',
    stories: ['E06.5', 'E13.3'],
    status: 'incomplete',
    expected:
      'Preserve original and billed money/rate/source/date before any evidenced FX conversion or transfer.',
    implemented: 'Currencies remain separate and cross-currency amounts alone never prove a pair.',
    remaining:
      'Original-money and provider/dated fallback FX provenance, exact conversion and evidenced FX matching.',
    evidence: ['packages/engines/src/reconciliation-scenarios.test.ts'],
  },
  {
    id: 18,
    name: 'Timezone and month boundary',
    priority: 'P0',
    stories: ['E06.1', 'E15.1', 'E13.7'],
    status: 'supported',
    expected:
      'An explicit provider calendar date stays in its declared month across profile timezones.',
    implemented:
      'SQL/domain financial dates are date-only; monthly selection uses the profile calendar without shifting booking dates.',
    remaining: null,
    evidence: [
      'packages/engines/src/reconciliation-scenarios.test.ts',
      'packages/engines/src/understanding.test.ts',
    ],
  },
  {
    id: 19,
    name: 'Daylight saving transitions',
    priority: 'P0',
    stories: ['E03.1', 'E13.7'],
    status: 'incomplete',
    expected:
      'UTC scheduling has no repeated/skipped budget window and financial dates do not shift at DST.',
    implemented:
      'UTC quota windows and unchanged date-only financial rows; notification DST is independently tested.',
    remaining: 'An explicit acquisition acceptance case at both Rome DST transitions.',
    evidence: [
      'apps/api/test/sync-jobs.test.ts',
      'apps/api/test/notifications.test.ts',
      'packages/engines/src/reconciliation-scenarios.test.ts',
    ],
  },
  {
    id: 20,
    name: 'Negative balance and overdraft',
    priority: 'P0',
    stories: ['E06.2', 'E05.4', 'E16.1'],
    status: 'incomplete',
    expected:
      'Signed balances and owed liabilities stay visible; opening/correction facts never become income.',
    implemented:
      'Exact signed balance and fail-closed/signed cash estimate; manual opening/adjustments are separately audited.',
    remaining: 'Complete linked card-liability presentation and acceptance.',
    evidence: [
      'packages/engines/src/reconciliation-scenarios.test.ts',
      'apps/api/test/manual.test.ts',
    ],
  },
  {
    id: 21,
    name: 'Provider retry and partial page',
    priority: 'P0',
    stories: ['E03.5', 'E03.6'],
    status: 'supported',
    expected:
      'Bounded checkpoint/resume is idempotent; incomplete work changes no balance/freshness or deletion evidence.',
    implemented:
      'Durable staged pages/checkpoints, committed lease/reservation, complete atomic application and incomplete coverage fences.',
    remaining: null,
    evidence: ['apps/api/test/sync-jobs.test.ts', 'apps/api/test/sync-routing.test.ts'],
  },
  {
    id: 22,
    name: 'Consent expiration and history gap',
    priority: 'P0',
    stories: ['E02.8', 'E03.6', 'E05.3'],
    status: 'incomplete',
    expected:
      'A renewed limited-history source exposes exact missing dates, CSV recovery and overlap dedup.',
    implemented:
      'Consent generation fences, bounded long-gap catch-up and conservative history-gap attention.',
    remaining:
      'Exact unavailable history interval, direct CSV recovery offer and full overlap dedup acceptance.',
    evidence: ['apps/api/test/sync-jobs.test.ts', 'apps/api/test/consent-lifecycle.test.ts'],
  },
  {
    id: 23,
    name: 'Provider deletes a booked user-edited transaction',
    priority: 'P0',
    stories: ['E03.5', 'E13.5'],
    status: 'incomplete',
    expected:
      'Retain the row, edits and links with evidence; offer keep-as-manual or remove, never silent deletion.',
    implemented:
      'Two complete source absences preserve the canonical facts and generate current Inbox attention.',
    remaining:
      'Explicit keep-as-manual/remove decision and full CNCL/RJCT/reversal link lifecycle.',
    evidence: ['apps/api/test/sync-jobs.test.ts'],
  },
  {
    id: 24,
    name: 'Back-dated transaction',
    priority: 'P0',
    stories: ['E03.5', 'E15.1'],
    status: 'incomplete',
    expected:
      'A new booking twenty days before the previous latest date is refetched and correctly updates its month.',
    implemented: 'Configured trailing windows and long-gap catch-up retain provider dates.',
    remaining: 'Explicit twenty-day late-booking acceptance plus durable late-booked event.',
    evidence: [
      'apps/api/test/sync-jobs.test.ts',
      'packages/engines/src/reconciliation-scenarios.test.ts',
    ],
  },
  {
    id: 25,
    name: 'Cash withdrawal to wallet',
    priority: 'P1',
    stories: ['E28.3'],
    status: 'incomplete',
    expected:
      'Verified ATM withdrawal funds a cash wallet once with truthful untracked remainder and later cash spends.',
    implemented:
      'Explicit two-leg cash relationships can be confirmed; no missing cash leg or wallet balance is fabricated.',
    remaining:
      'Verified code-driven wallet creation, untracked remainder and complete wallet lifecycle.',
    evidence: [
      'packages/engines/src/index.test.ts',
      'packages/engines/src/reconciliation-scenarios.test.ts',
    ],
  },
] as const satisfies readonly ReconciliationScenario[]
