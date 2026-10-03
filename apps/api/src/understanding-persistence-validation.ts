import { createHash } from 'node:crypto'
import {
  addDays,
  calendarDate,
  calendarDateAt,
  endOfMonth,
  isProfileTimezone,
} from '@lilleri/domain'
import { canonicalSourceValue } from './source-erasure-dto.js'
import {
  DEFAULT_UNDERSTANDING_PREFERENCES,
  type UnderstandingOwnershipExport,
  understandingOwnershipExportDto,
} from './understanding-persistence-dto.js'

const hash = (value: unknown) =>
  createHash('sha256').update(canonicalSourceValue(value)).digest('hex')
const fail = (): never => {
  throw new Error('Understanding ownership evidence is invalid')
}
const unique = (values: readonly string[]) => new Set(values).size === values.length
/** Validate rights export against the owning archive; no private presentation filters are applied here. */
export function validateUnderstandingOwnershipExport(
  value: unknown,
  scope: {
    profileId: string
    accountIds: readonly string[]
    transactionIds: readonly string[]
    accounts: readonly { id: string; connectionId: string; balance: { currency: string } }[]
    transactions: readonly {
      id: string
      accountId: string
      connectionId: string
      amount: { currency: string }
    }[]
    sourceReceiptIds?: readonly string[]
    exportedAt?: string
    profileCreatedAt?: string
  },
): UnderstandingOwnershipExport {
  const checked = understandingOwnershipExportDto.safeParse(value)
  if (!checked.success) return fail()
  const data = checked.data,
    accounts = new Set(scope.accountIds),
    transactions = new Set(scope.transactionIds),
    receipts = new Set(scope.sourceReceiptIds ?? [])
  const ownedAccounts = new Map(scope.accounts.map((row) => [row.id, row])),
    ownedTransactions = new Map(scope.transactions.map((row) => [row.id, row]))
  const checkClock = (instant: string) => {
    if (
      (scope.exportedAt && instant > scope.exportedAt) ||
      (scope.profileCreatedAt && instant < scope.profileCreatedAt)
    )
      fail()
  }
  checkClock(data.preferences.updatedAt)
  const preferenceDigest = (values: unknown) => hash({ profileId: scope.profileId, values })
  const checkValues = (values: typeof data.preferences.values) => {
    if (values.accountIds.some((id) => !accounts.has(id))) fail()
  }
  if (
    data.preferences.profileId !== scope.profileId ||
    data.preferences.digest !== preferenceDigest(data.preferences.values) ||
    !unique(data.preferenceEvents.map((row) => row.id)) ||
    !unique(data.monthlySnapshots.map((row) => row.id))
  )
    fail()
  checkValues(data.preferences.values)
  if (data.preferenceEvents.length !== data.preferences.revision - 1) fail()
  if (
    data.preferences.revision === 1 &&
    canonicalSourceValue(data.preferences.values) !==
      canonicalSourceValue(DEFAULT_UNDERSTANDING_PREFERENCES)
  )
    fail()
  let previous: typeof data.preferences.values | null = DEFAULT_UNDERSTANDING_PREFERENCES,
    lastAt: string | null = null
  for (let index = 0; index < data.preferenceEvents.length; index++) {
    const event = data.preferenceEvents[index] ?? fail()
    checkClock(event.occurredAt)
    if (
      event.profileId !== scope.profileId ||
      event.revision !== index + 2 ||
      (lastAt && event.occurredAt < lastAt)
    )
      fail()
    if (event.sourceReceiptId && !receipts.has(event.sourceReceiptId)) fail()
    if (event.payload) {
      if (hash(event.payload) !== event.digest) fail()
      checkValues(event.payload.after)
      if (event.payload.before) checkValues(event.payload.before)
      if (event.action === 'source_erased') {
        if (
          event.payload.before !== null ||
          !event.sourceReceiptId ||
          event.payload.undoOf !== null
        )
          fail()
      } else if (
        !event.payload.before ||
        (previous && canonicalSourceValue(previous) !== canonicalSourceValue(event.payload.before))
      )
        fail()
      if (event.action === 'undone') {
        const original = data.preferenceEvents.find((row) => row.id === event.payload?.undoOf)
        if (
          !original?.payload?.before ||
          original.revision !== event.revision - 1 ||
          canonicalSourceValue(original.payload.before) !==
            canonicalSourceValue(event.payload.after)
        )
          fail()
      } else if (event.payload.undoOf !== null) fail()
      previous = event.payload.after
    } else {
      if (!event.sourceReceiptId) fail()
      previous = null
    }
    lastAt = event.occurredAt
  }
  const last = data.preferenceEvents.at(-1)
  if (
    last &&
    (last.occurredAt !== data.preferences.updatedAt ||
      !last.payload ||
      preferenceDigest(last.payload.after) !== data.preferences.digest)
  )
    fail()
  for (const snapshot of data.monthlySnapshots) {
    checkClock(snapshot.capturedAt)
    if (snapshot.profileId !== scope.profileId) fail()
    if (snapshot.payload === null) {
      if (!snapshot.sourceReceiptId || !receipts.has(snapshot.sourceReceiptId)) fail()
      continue
    }
    if (snapshot.sourceReceiptId !== null || hash(snapshot.payload) !== snapshot.digest) fail()
    const { result, policy, inputFacts, references } = snapshot.payload
    const today = String(calendarDateAt(new Date(snapshot.capturedAt), result.profileTimezone))
    if (
      result.boundary.calculatedOn !== today ||
      result.boundary.maxHorizonOn !== String(addDays(calendarDate(today), policy.horizonDays))
    )
      fail()
    if (
      snapshot.inputDigest !==
      hash({
        month: snapshot.month,
        ledgerDigest: result.capture.ledgerDigest,
        privacyDigest: result.capture.privacyDigest,
        calculatedOn: today,
        policy,
      })
    )
      fail()
    if (
      result.capture.capturedAt !== snapshot.capturedAt ||
      result.capture.inputDigest !== snapshot.inputDigest ||
      result.month !== snapshot.month ||
      result.capture.policyVersion !== policy.version ||
      result.boundary.policyVersion !== policy.version ||
      !isProfileTimezone(result.profileTimezone)
    )
      fail()
    if (
      !unique(inputFacts.accounts.map((row) => row.id)) ||
      !unique(inputFacts.transactions.map((row) => row.id)) ||
      !unique(references.map((row) => `${row.subjectKind}:${row.subjectId}`))
    )
      fail()
    const accountFacts = new Map(inputFacts.accounts.map((row) => [row.id, row])),
      transactionFacts = new Map(inputFacts.transactions.map((row) => [row.id, row]))
    if (
      inputFacts.accounts.some(
        (row) =>
          !accounts.has(row.id) ||
          ownedAccounts.get(row.id)?.connectionId !== row.connectionId ||
          ownedAccounts.get(row.id)?.balance.currency !== row.currency,
      ) ||
      inputFacts.transactions.some(
        (row) =>
          !transactions.has(row.id) ||
          ownedTransactions.get(row.id)?.accountId !== row.accountId ||
          ownedTransactions.get(row.id)?.connectionId !== row.connectionId ||
          ownedTransactions.get(row.id)?.amount.currency !== row.currency ||
          accountFacts.get(row.accountId)?.connectionId !== row.connectionId ||
          accountFacts.get(row.accountId)?.currency !== row.currency,
      )
    )
      fail()
    if (references.length !== accountFacts.size + transactionFacts.size) fail()
    for (const ref of references) {
      const fact =
        ref.subjectKind === 'account'
          ? accountFacts.get(ref.subjectId)
          : transactionFacts.get(ref.subjectId)
      if (
        !fact ||
        fact.connectionId !== ref.connectionId ||
        (ref.subjectKind === 'account'
          ? ref.accountId !== ref.subjectId
          : transactionFacts.get(ref.subjectId)?.accountId !== ref.accountId)
      )
        fail()
    }
    const unionIds = new Set<string>(),
      unionAccounts = new Set<string>(),
      currencies = new Set<string>()
    const linkedRefunds = new Set<string>()
    const refundBound = new Map<string, Set<string>>()
    if (!unique(inputFacts.confirmedRefundLinks.map((row) => row.id))) fail()
    for (const link of inputFacts.confirmedRefundLinks) {
      if (!unique(link.transactionIds) || link.transactionIds.length !== 2) fail()
      const facts = link.transactionIds.map((id) => transactionFacts.get(id) ?? fail())
      const original =
          facts.find((row) => row.kind === 'expense' && BigInt(row.amountMinor) < 0n) ?? fail(),
        refund =
          facts.find((row) => row.kind === 'refund' && BigInt(row.amountMinor) > 0n) ?? fail()
      if (
        new Set(facts.map((row) => row.currency)).size !== 1 ||
        !facts.some((row) => row.kind === 'refund' && BigInt(row.amountMinor) > 0n) ||
        !facts.some((row) => row.kind === 'expense' && BigInt(row.amountMinor) < 0n) ||
        !original ||
        !refund ||
        original.status !== 'booked' ||
        refund.status !== 'booked' ||
        original.accountId !== refund.accountId ||
        refund.relatedTransactionId !== original.id
      )
        fail()
      if (!original || !refund) fail()
      const linked = refundBound.get(original.id) ?? new Set<string>()
      linked.add(refund.id)
      refundBound.set(original.id, linked)
      for (const id of link.transactionIds) {
        unionIds.add(id)
        linkedRefunds.add(id)
      }
    }
    for (const [originalId, refundIds] of refundBound) {
      const original = transactionFacts.get(originalId) ?? fail()
      if (
        [...refundIds].reduce(
          (sum, id) => sum + BigInt((transactionFacts.get(id) ?? fail()).amountMinor),
          0n,
        ) > -BigInt(original.amountMinor)
      )
        fail()
    }
    for (const insight of result.insights) {
      if (
        insight.profileId !== scope.profileId ||
        insight.month !== snapshot.month ||
        insight.inputs.profileTimezone !== result.profileTimezone ||
        currencies.has(insight.currency) ||
        insight.value.netFlow.currency !== insight.currency ||
        insight.value.netSpending.currency !== insight.currency
      )
        fail()
      currencies.add(insight.currency)
      const fromOn = `${snapshot.month}-01`,
        monthEnd = String(endOfMonth(calendarDate(fromOn))),
        throughOn = monthEnd < today ? monthEnd : today
      if (
        fromOn > today ||
        insight.inputs.fromOn !== fromOn ||
        insight.inputs.throughOn !== throughOn ||
        insight.id !== `monthly:${scope.profileId}:${snapshot.month}:${insight.currency}`
      )
        fail()
      if (!unique(insight.inputs.accountIds) || !unique(insight.inputs.transactionIds)) fail()
      for (const id of insight.inputs.accountIds) {
        if (accountFacts.get(id)?.currency !== insight.currency) fail()
        unionAccounts.add(id)
      }
      for (const id of insight.inputs.transactionIds) {
        const fact = transactionFacts.get(id)
        if (
          !fact ||
          fact.currency !== insight.currency ||
          fact.status !== 'booked' ||
          !fact.bookedOn ||
          fact.bookedOn < insight.inputs.fromOn ||
          fact.bookedOn > insight.inputs.throughOn ||
          ['transfer', 'card_settlement', 'cash_withdrawal'].includes(fact.kind)
        )
          fail()
        unionIds.add(id)
      }
      const sum = (ids: readonly string[], kind: string | null, sign: 1 | -1) =>
        ids.reduce((total, id) => {
          const fact = transactionFacts.get(id)
          if (!fact || !insight.inputs.transactionIds.includes(id) || (kind && fact.kind !== kind))
            return fail()
          const amount = BigInt(fact.amountMinor)
          if (kind && (sign === 1 ? amount <= 0n : amount >= 0n)) return fail()
          return total + amount * BigInt(sign)
        }, 0n)
      const income = sum(insight.inputs.incomeTransactionIds, 'income', 1),
        expenses = sum(insight.inputs.expenseTransactionIds, 'expense', -1),
        refunds = sum(insight.inputs.refundTransactionIds, 'refund', 1)
      const unresolved = insight.inputs.unresolvedTransactionIds.map(
        (id) => transactionFacts.get(id) ?? fail(),
      )
      const expectedIncome: string[] = [],
        expectedExpenses: string[] = [],
        expectedRefunds: string[] = [],
        expectedUnresolved: string[] = []
      for (const id of insight.inputs.transactionIds) {
        const fact = transactionFacts.get(id) ?? fail(),
          amount = BigInt(fact.amountMinor)
        if (fact.kind === 'income' && amount > 0n) expectedIncome.push(id)
        else if (fact.kind === 'expense' && amount < 0n) expectedExpenses.push(id)
        else if (fact.kind === 'refund' && amount > 0n && linkedRefunds.has(id))
          expectedRefunds.push(id)
        else if (amount !== 0n) expectedUnresolved.push(id)
      }
      const equalIds = (actual: readonly string[], expected: readonly string[]) =>
        canonicalSourceValue([...actual].sort()) === canonicalSourceValue([...expected].sort())
      if (
        !equalIds(insight.inputs.incomeTransactionIds, expectedIncome) ||
        !equalIds(insight.inputs.expenseTransactionIds, expectedExpenses) ||
        !equalIds(insight.inputs.refundTransactionIds, expectedRefunds) ||
        !equalIds(insight.inputs.unresolvedTransactionIds, expectedUnresolved)
      )
        fail()
      if (
        !unique([
          ...insight.inputs.incomeTransactionIds,
          ...insight.inputs.expenseTransactionIds,
          ...insight.inputs.refundTransactionIds,
          ...insight.inputs.unresolvedTransactionIds,
        ]) ||
        insight.calculation.bookedTransactionCount !== insight.inputs.transactionIds.length ||
        income.toString() !== insight.calculation.incomeMinor ||
        expenses.toString() !== insight.calculation.expensesMinor ||
        refunds.toString() !== insight.calculation.linkedRefundsMinor ||
        (expenses - refunds).toString() !== insight.value.netSpending.amountMinor ||
        (income - expenses + refunds).toString() !== insight.value.netFlow.amountMinor ||
        unresolved
          .reduce(
            (sum, row) => sum + (BigInt(row.amountMinor) > 0n ? BigInt(row.amountMinor) : 0n),
            0n,
          )
          .toString() !== insight.calculation.unresolvedCreditsMinor ||
        unresolved
          .reduce(
            (sum, row) => sum - (BigInt(row.amountMinor) < 0n ? BigInt(row.amountMinor) : 0n),
            0n,
          )
          .toString() !== insight.calculation.unresolvedDebitsMinor
      )
        fail()
    }
    if (unionIds.size !== transactionFacts.size || unionAccounts.size !== accountFacts.size) fail()
  }
  return data
}
