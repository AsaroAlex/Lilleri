import {
  type Account,
  type Analysis,
  type CategoryId,
  type Classification,
  type CurrencySummary,
  daysBetween,
  type Preference,
  type ReconciliationMatch,
  type RecurringSeries,
  type ReviewItem,
  type Rule,
  type Transaction,
} from '@lilleri/domain'
import { money } from '@lilleri/money'

export const ENGINE_VERSION = 'deterministic-v1'
export interface AnalysisOptions {
  readonly rules?: readonly Rule[]
  readonly preferences?: readonly Preference[]
  readonly userClassifications?: Readonly<Record<string, CategoryId>>
  readonly matchOverrides?: Readonly<Record<string, ReconciliationMatch['state']>>
}

const GLOBAL_MERCHANTS: Readonly<Record<string, CategoryId>> = {
  coop: 'groceries',
  esselunga: 'groceries',
  amazon: 'shopping',
  ikea: 'shopping',
  netflix: 'subscriptions',
  spotify: 'subscriptions',
  'mc donald s': 'food',
  mcdonalds: 'food',
  'mcdonald s': 'food',
  autostrade: 'transport',
  trenitalia: 'transport',
  benzina: 'transport',
  enel: 'utilities',
  tim: 'utilities',
  deliveroo: 'food',
  ristorante: 'food',
  'bar demo': 'food',
  booking: 'travel',
  farmacia: 'health',
}

export function classify(transaction: Transaction, options: AnalysisOptions = {}): Classification {
  const base = { transactionId: transaction.id, algorithmVersion: ENGINE_VERSION }
  const user = options.userClassifications?.[transaction.id]
  if (user)
    return {
      ...base,
      categoryId: user,
      source: 'user',
      needsReview: false,
      confidence: 1,
      explanation: 'Categoria scelta da te per questo movimento.',
      evidence: ['sticky-user-correction'],
    }
  const rule = [...(options.rules ?? [])]
    .filter(
      (rule) =>
        rule.enabled &&
        rule.profileId === transaction.profileId &&
        rule.merchantKey === transaction.merchantKey,
    )
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))[0]
  if (rule)
    return {
      ...base,
      categoryId: rule.categoryId,
      source: 'rule',
      needsReview: false,
      confidence: 1,
      explanation: 'La tua regola ha la precedenza.',
      evidence: [`rule:${rule.id}`],
    }
  const preference = options.preferences?.find(
    (item) =>
      item.profileId === transaction.profileId && item.merchantKey === transaction.merchantKey,
  )
  if (preference)
    return {
      ...base,
      categoryId: preference.categoryId,
      source: 'preference',
      needsReview: false,
      confidence: 1,
      explanation: 'Hai scelto questa categoria per questo esercente.',
      evidence: [`merchant:${preference.merchantKey}`],
    }
  if (['transfer', 'card_settlement', 'cash_withdrawal'].includes(transaction.kind)) {
    return {
      ...base,
      categoryId: 'transfer',
      source: 'global',
      needsReview: false,
      confidence: 1,
      explanation:
        'Tipo di movimento dichiarato dalla fonte; il collegamento è verificato separatamente.',
      evidence: [`provider-kind:${transaction.kind}`],
    }
  }
  if (transaction.kind === 'income' && transaction.amount.amountMinor > 0n) {
    return {
      ...base,
      categoryId: 'income',
      source: 'global',
      needsReview: false,
      confidence: 1,
      explanation: 'Entrata dichiarata dalla fonte.',
      evidence: ['provider-kind:income'],
    }
  }
  const category =
    transaction.merchantKey && Object.hasOwn(GLOBAL_MERCHANTS, transaction.merchantKey)
      ? GLOBAL_MERCHANTS[transaction.merchantKey]
      : undefined
  if (category)
    return {
      ...base,
      categoryId: category,
      source: 'global',
      needsReview: false,
      confidence: 1,
      explanation: 'Corrispondenza esatta nel dizionario dimostrativo degli esercenti.',
      evidence: [`dictionary:${transaction.merchantKey}`],
    }
  return {
    ...base,
    categoryId: 'uncategorised',
    source: 'review',
    needsReview: true,
    confidence: 0,
    explanation: 'Non ho elementi sufficienti per scegliere la categoria. Puoi indicarla tu.',
    evidence: ['no-deterministic-match'],
  }
}

const transactionDate = (transaction: Transaction) =>
  transaction.bookedOn ?? transaction.authorizedOn
const matchId = (type: ReconciliationMatch['type'], ids: readonly string[]) =>
  `${type}:${[...ids].sort().join(':')}`
export function reconcile(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
  options: AnalysisOptions = {},
): ReconciliationMatch[] {
  const matches: ReconciliationMatch[] = []
  const owned = new Set(accounts.map((account) => `${account.profileId}:${account.id}`))
  const byId = new Map(transactions.map((transaction) => [transaction.id, transaction]))
  const addMatch = (
    type: ReconciliationMatch['type'],
    a: Transaction,
    b: Transaction,
    confirmed: boolean,
    evidence: string[],
    explanation: string,
  ) => {
    const id = matchId(type, [a.id, b.id])
    if (matches.some((match) => match.id === id)) return
    matches.push({
      id,
      type,
      transactionIds: [a.id, b.id],
      state:
        type === 'refund' && !confirmed && options.matchOverrides?.[id] === 'confirmed'
          ? 'suggested'
          : (options.matchOverrides?.[id] ?? (confirmed ? 'confirmed' : 'suggested')),
      confidence: confirmed ? 1 : 0,
      algorithmVersion: ENGINE_VERSION,
      explanation,
      evidence,
    })
  }
  for (const [index, first] of transactions.entries()) {
    for (const second of transactions.slice(index + 1)) {
      if (first.profileId !== second.profileId || first.amount.currency !== second.amount.currency)
        continue
      if (first.status === 'reversed' || second.status === 'reversed') continue
      const firstDate = transactionDate(first),
        secondDate = transactionDate(second)
      if (!firstDate || !secondDate || daysBetween(firstDate, secondDate) > 7) continue
      const sameAccount = first.accountId === second.accountId
      const sameAmount = first.amount.amountMinor === second.amount.amountMinor
      const sharedReference = Boolean(first.reference && first.reference === second.reference)
      const directLink =
        first.relatedTransactionId === second.id || second.relatedTransactionId === first.id
      const uniqueReference =
        sharedReference &&
        transactions.filter(
          (item) => item.profileId === first.profileId && item.reference === first.reference,
        ).length === 2
      if (
        sameAccount &&
        first.kind !== 'refund' &&
        second.kind !== 'refund' &&
        first.amount.amountMinor < 0n === second.amount.amountMinor < 0n &&
        first.amount.amountMinor > 0n === second.amount.amountMinor > 0n &&
        first.status !== second.status &&
        [first.status, second.status].includes('pending') &&
        [first.status, second.status].includes('booked') &&
        (directLink || uniqueReference)
      ) {
        addMatch(
          'pending_to_booked',
          first,
          second,
          sameAmount,
          [
            'same-account',
            directLink ? 'provider-related-transaction' : 'unique-provider-reference',
            sameAmount ? 'same-amount' : 'changed-amount',
          ],
          sameAmount
            ? 'La fonte collega la prenotazione al movimento contabilizzato.'
            : 'La fonte collega i movimenti, ma l’importo è cambiato: verifica il collegamento.',
        )
      }
      if (
        sameAccount &&
        first.status === 'booked' &&
        second.status === 'booked' &&
        sameAmount &&
        first.source !== second.source &&
        first.merchantKey &&
        first.merchantKey === second.merchantKey &&
        firstDate === secondDate
      ) {
        addMatch(
          'duplicate',
          first,
          second,
          uniqueReference,
          [
            'different-sources',
            'same-account-merchant-date-amount',
            uniqueReference ? 'unique-provider-reference' : 'relationship-unproven',
          ],
          uniqueReference
            ? 'Stesso movimento presente in due fonti con un riferimento condiviso.'
            : 'Questi movimenti si assomigliano. Restano entrambi finché non confermi il duplicato.',
        )
      }
      const opposite =
        first.amount.amountMinor !== 0n && first.amount.amountMinor === -second.amount.amountMinor
      if (
        !sameAccount &&
        first.status === 'booked' &&
        second.status === 'booked' &&
        opposite &&
        owned.has(`${first.profileId}:${first.accountId}`) &&
        owned.has(`${second.profileId}:${second.accountId}`)
      ) {
        const linkedAccounts =
          first.relatedAccountId === second.accountId && second.relatedAccountId === first.accountId
        const kinds = [first.kind, second.kind]
        const type = kinds.includes('card_settlement')
          ? 'card_settlement'
          : kinds.includes('cash_withdrawal')
            ? 'cash_transfer'
            : 'internal_transfer'
        addMatch(
          type,
          first,
          second,
          linkedAccounts && uniqueReference,
          [
            'owned-accounts',
            'opposite-exact-amount',
            linkedAccounts ? 'provider-account-relationship' : 'account-relationship-unproven',
            uniqueReference ? 'unique-provider-reference' : 'reference-unproven',
          ],
          linkedAccounts && uniqueReference
            ? 'Due lati dello stesso spostamento tra i tuoi conti: non è una nuova spesa.'
            : 'Possibile trasferimento: serve una conferma prima di escluderlo dalla spesa.',
        )
      }
    }
    if (first.status === 'booked' && first.kind === 'refund' && first.relatedTransactionId) {
      const original = byId.get(first.relatedTransactionId)
      if (
        original &&
        original.profileId === first.profileId &&
        original.accountId === first.accountId &&
        original.amount.currency === first.amount.currency &&
        original.status === 'booked' &&
        original.kind === 'expense' &&
        original.amount.amountMinor < 0n &&
        first.amount.amountMinor > 0n
      ) {
        const allRefunds = transactions
          .filter(
            (item) =>
              item.profileId === first.profileId &&
              item.kind === 'refund' &&
              item.relatedTransactionId === original.id &&
              item.status === 'booked' &&
              item.accountId === original.accountId &&
              item.amount.amountMinor > 0n &&
              item.amount.currency === original.amount.currency,
          )
          .reduce((total, item) => total + item.amount.amountMinor, 0n)
        addMatch(
          'refund',
          original,
          first,
          allRefunds <= -original.amount.amountMinor,
          ['provider-related-transaction', 'same-account-currency', 'cumulative-refund-bound'],
          allRefunds <= -original.amount.amountMinor
            ? 'Rimborso collegato all’acquisto: riduce la spesa, non è un nuovo reddito.'
            : 'I rimborsi superano l’acquisto originale: controlla il collegamento.',
        )
      }
    }
  }
  // Multiple facts may reference a transaction, but competing exclusions need a review.
  const originalMatches = [...matches]
  const consumed = (match: ReconciliationMatch): readonly string[] => {
    if (match.type === 'refund') return []
    if (match.type === 'pending_to_booked')
      return match.transactionIds.filter((id) => byId.get(id)?.status === 'pending')
    if (match.type === 'duplicate') {
      return match.transactionIds
        .map((id) => byId.get(id))
        .filter((row): row is Transaction => row !== undefined)
        .sort(
          (a, b) =>
            (a.source === 'bank' ? -1 : 1) - (b.source === 'bank' ? -1 : 1) ||
            a.id.localeCompare(b.id),
        )
        .slice(1)
        .map((row) => row.id)
    }
    return match.transactionIds
  }
  for (const match of originalMatches) {
    if (match.state !== 'confirmed' || match.type === 'refund') continue
    if (
      originalMatches.some(
        (other) =>
          other.id !== match.id &&
          other.state === 'confirmed' &&
          ((other.type === match.type &&
            other.transactionIds.some((id) => match.transactionIds.includes(id))) ||
            consumed(other).some((id) => consumed(match).includes(id))),
      )
    ) {
      const index = matches.indexOf(match)
      matches[index] = {
        ...match,
        state: 'suggested',
        confidence: 0,
        explanation: 'Più collegamenti possibili: scegli quello corretto.',
        evidence: [...match.evidence, 'competing-candidates'],
      }
    }
  }
  const eligibleIds = new Set(
    effectiveTransactions(transactions, matches)
      .filter((transaction) => transaction.status === 'booked')
      .map((transaction) => transaction.id),
  )
  return matches.map((match) =>
    match.type === 'refund' &&
    match.state === 'confirmed' &&
    !match.transactionIds.every((id) => eligibleIds.has(id))
      ? {
          ...match,
          state: 'suggested',
          confidence: 0,
          explanation: 'Il rimborso si riferisce a un movimento escluso: verifica il collegamento.',
          evidence: [...match.evidence, 'original-not-counted'],
        }
      : match,
  )
}

export function effectiveTransactions(
  transactions: readonly Transaction[],
  matches: readonly ReconciliationMatch[],
): Transaction[] {
  const excluded = new Set<string>()
  const byId = new Map(transactions.map((transaction) => [transaction.id, transaction]))
  for (const match of matches) {
    if (match.state !== 'confirmed') continue
    if (match.type === 'duplicate') {
      const rows = match.transactionIds
        .map((id) => byId.get(id))
        .filter((item): item is Transaction => item !== undefined)
        .sort(
          (a, b) =>
            (a.source === 'bank' ? -1 : 1) - (b.source === 'bank' ? -1 : 1) ||
            a.id.localeCompare(b.id),
        )
      for (const row of rows.slice(1)) excluded.add(row.id)
    } else if (['internal_transfer', 'card_settlement', 'cash_transfer'].includes(match.type)) {
      for (const id of match.transactionIds) excluded.add(id)
    } else if (match.type === 'pending_to_booked') {
      for (const id of match.transactionIds)
        if (byId.get(id)?.status === 'pending') excluded.add(id)
    }
  }
  return transactions.filter(
    (transaction) => transaction.status !== 'reversed' && !excluded.has(transaction.id),
  )
}

export function summarize(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
  matches: readonly ReconciliationMatch[],
): CurrencySummary[] {
  const effective = effectiveTransactions(transactions, matches)
  const currencies = new Set([
    ...accounts.map((account) => account.balance.currency),
    ...transactions.map((transaction) => transaction.amount.currency),
  ])
  return [...currencies].sort().map((currency) => {
    const relevant = effective.filter((transaction) => transaction.amount.currency === currency)
    const refundIds = new Set(
      matches
        .filter((match) => match.type === 'refund' && match.state === 'confirmed')
        .flatMap((match) =>
          match.transactionIds.filter((id) =>
            effective.some((item) => item.id === id && item.kind === 'refund'),
          ),
        ),
    )
    const booked = relevant.filter((transaction) => transaction.status === 'booked')
    const spend = booked.reduce(
      (total, transaction) =>
        total +
        (transaction.amount.amountMinor < 0n
          ? -transaction.amount.amountMinor
          : refundIds.has(transaction.id)
            ? -transaction.amount.amountMinor
            : 0n),
      0n,
    )
    return {
      currency,
      balance: money(
        accounts
          .filter((account) => account.balance.currency === currency)
          .reduce((total, account) => total + account.balance.amountMinor, 0n),
        currency,
      ),
      income: money(
        booked
          .filter(
            (transaction) => transaction.amount.amountMinor > 0n && !refundIds.has(transaction.id),
          )
          .reduce((total, transaction) => total + transaction.amount.amountMinor, 0n),
        currency,
      ),
      spend: money(spend, currency),
      pending: money(
        relevant
          .filter((transaction) => transaction.status === 'pending')
          .reduce((total, transaction) => total + transaction.amount.amountMinor, 0n),
        currency,
      ),
      transactionCount: booked.length,
    }
  })
}

function nextMonth(date: string): string {
  const [year = 0, month = 0, day = 0] = date.split('-').map(Number)
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(day, last))).toISOString().slice(0, 10)
}
export function detectRecurring(
  transactions: readonly Transaction[],
  matches: readonly ReconciliationMatch[] = [],
): RecurringSeries[] {
  const groups = new Map<string, Transaction[]>()
  for (const transaction of effectiveTransactions(transactions, matches)) {
    if (
      transaction.status !== 'booked' ||
      !transaction.bookedOn ||
      !transaction.merchantKey ||
      !['expense', 'income'].includes(transaction.kind)
    )
      continue
    const key = `${transaction.profileId}:${transaction.accountId}:${transaction.merchantKey}:${transaction.amount.currency}:${transaction.kind}`
    groups.set(key, [...(groups.get(key) ?? []), transaction])
  }
  const result: RecurringSeries[] = []
  for (const [key, group] of groups) {
    const rows = group.sort((a, b) => (a.bookedOn ?? '').localeCompare(b.bookedOn ?? ''))
    if (rows.length < 3) continue
    const recent = rows.slice(-3)
    if (
      !recent.every(
        (row, index) =>
          index === 0 ||
          (daysBetween(recent[index - 1]?.bookedOn ?? '', row.bookedOn ?? '') >= 25 &&
            daysBetween(recent[index - 1]?.bookedOn ?? '', row.bookedOn ?? '') <= 35),
      )
    )
      continue
    const last = recent[2],
      previous = recent[1]
    if (!last?.bookedOn || !last.merchantKey || !previous) continue
    result.push({
      id: `recurring:${key}`,
      merchantKey: last.merchantKey,
      transactionIds: recent.map((row) => row.id),
      kind:
        last.kind === 'income'
          ? 'recurring_income'
          : GLOBAL_MERCHANTS[last.merchantKey] === 'subscriptions'
            ? 'subscription'
            : 'recurring_expense',
      frequency: 'monthly',
      expectedAmount: last.amount,
      nextOn: nextMonth(last.bookedOn),
      priceIncreased:
        last.amount.amountMinor < previous.amount.amountMinor && last.amount.amountMinor < 0n,
      algorithmVersion: ENGINE_VERSION,
      confidence: 0,
      evidence: ['three-observed-monthly-payments', 'not-a-confirmed-contract'],
      explanation:
        'Ho osservato tre pagamenti mensili. La prossima data è una stima, non un addebito confermato.',
    })
  }
  return result
}

export function analyse(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
  options: AnalysisOptions = {},
): Analysis {
  if (
    new Set([
      ...accounts.map((account) => account.profileId),
      ...transactions.map((transaction) => transaction.profileId),
    ]).size > 1
  )
    throw new Error('Analyse one profile at a time')
  if (new Set(transactions.map((transaction) => transaction.id)).size !== transactions.length)
    throw new Error('Duplicate canonical transaction identity')
  if (new Set(accounts.map((account) => account.id)).size !== accounts.length)
    throw new Error('Duplicate canonical account identity')
  const accountsById = new Map(accounts.map((account) => [account.id, account]))
  for (const transaction of transactions) {
    const account = accountsById.get(transaction.accountId)
    if (!account || account.profileId !== transaction.profileId)
      throw new Error('Transaction account is not owned by the profile')
    if (account.balance.currency !== transaction.amount.currency)
      throw new Error('Canonical transaction currency differs from its account')
  }
  const matches = reconcile(accounts, transactions, options)
  const classifications = transactions.map((transaction) => classify(transaction, options))
  const visible = new Set(
    effectiveTransactions(transactions, matches)
      .filter((transaction) => transaction.status === 'booked')
      .map((transaction) => transaction.id),
  )
  const reviewItems: ReviewItem[] = [
    ...classifications
      .filter((item) => item.needsReview && visible.has(item.transactionId))
      .map((item) => ({
        id: `classification:${item.transactionId}`,
        transactionIds: [item.transactionId],
        type: 'classification' as const,
        explanation: item.explanation,
        matchId: null,
      })),
    ...matches
      .filter((match) => match.state === 'suggested')
      .map((match) => ({
        id: `reconciliation:${match.id}`,
        transactionIds: match.transactionIds,
        type: 'reconciliation' as const,
        explanation: match.explanation,
        matchId: match.id,
      })),
  ]
  return {
    matches,
    classifications,
    reviewItems,
    recurring: detectRecurring(transactions, matches),
    summaries: summarize(accounts, transactions, matches),
  }
}
