import { type ApiClient, ApiError, type DemoOverview } from '@lilleri/api-client'
import { isCategoryId } from '@lilleri/domain'
import { isCurrencyCode } from '@lilleri/money'

type RecordValue = Record<string, unknown>
const record = (value: unknown): value is RecordValue =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string'
const id = (value: unknown) => text(value) && value.length > 0
const nullableText = (value: unknown) => value === null || text(value)
const instant = (value: unknown) => text(value) && Number.isFinite(Date.parse(value))
const calendar = (value: unknown) =>
  value === null ||
  (text(value) &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    instant(value) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value)
const oneOf = (value: unknown, allowed: readonly string[]) => text(value) && allowed.includes(value)
const strings = (value: unknown) => Array.isArray(value) && value.every(text)
const rows = (value: unknown, predicate: (row: RecordValue) => boolean) =>
  Array.isArray(value) && value.every((row) => record(row) && predicate(row))
const money = (value: unknown) =>
  record(value) &&
  text(value.amountMinor) &&
  /^-?(0|[1-9]\d*)$/.test(value.amountMinor) &&
  text(value.currency) &&
  isCurrencyCode(value.currency)
const provenance = (row: RecordValue) =>
  id(row.algorithmVersion) &&
  text(row.explanation) &&
  typeof row.confidence === 'number' &&
  Number.isFinite(row.confidence) &&
  strings(row.evidence)
function completeOverview(row: RecordValue) {
  const profile = row.profile
  if (!record(profile)) return false
  return (
    row.mode === 'synthetic' &&
    id(profile.id) &&
    text(profile.name) &&
    text(profile.timezone) &&
    rows(
      row.accounts,
      (account) =>
        ['id', 'profileId', 'connectionId', 'providerAccountId'].every((key) => id(account[key])) &&
        account.profileId === profile.id &&
        text(account.name) &&
        text(account.institutionName) &&
        oneOf(account.kind, ['current', 'card', 'cash', 'savings']) &&
        money(account.balance) &&
        instant(account.balanceUpdatedAt),
    ) &&
    rows(
      row.connections,
      (connection) =>
        ['id', 'profileId', 'providerId', 'institutionId'].every((key) => id(connection[key])) &&
        connection.profileId === profile.id &&
        oneOf(connection.status, ['active', 'expired', 'revoked', 'error']) &&
        instant(connection.createdAt) &&
        (connection.lastSyncedAt === null || instant(connection.lastSyncedAt)),
    ) &&
    rows(
      row.transactions,
      (transaction) =>
        [
          'id',
          'profileId',
          'accountId',
          'connectionId',
          'providerId',
          'providerTransactionId',
        ].every((key) => id(transaction[key])) &&
        transaction.profileId === profile.id &&
        Number.isInteger(transaction.revision) &&
        (transaction.revision as number) > 0 &&
        oneOf(transaction.source, ['bank', 'csv', 'manual']) &&
        oneOf(transaction.status, ['pending', 'booked', 'reversed']) &&
        money(transaction.amount) &&
        text(transaction.description) &&
        nullableText(transaction.merchantName) &&
        nullableText(transaction.merchantKey) &&
        calendar(transaction.bookedOn) &&
        calendar(transaction.authorizedOn) &&
        instant(transaction.observedAt) &&
        oneOf(transaction.kind, [
          'expense',
          'income',
          'transfer',
          'card_settlement',
          'refund',
          'cash_withdrawal',
        ]) &&
        nullableText(transaction.reference) &&
        nullableText(transaction.relatedTransactionId) &&
        nullableText(transaction.relatedAccountId),
    ) &&
    record(row.analysis) &&
    rows(
      row.analysis.matches,
      (match) =>
        provenance(match) &&
        id(match.id) &&
        id(match.revision) &&
        strings(match.transactionIds) &&
        oneOf(match.type, [
          'pending_to_booked',
          'duplicate',
          'internal_transfer',
          'card_settlement',
          'refund',
          'cash_transfer',
        ]) &&
        oneOf(match.state, ['confirmed', 'suggested', 'rejected', 'undone']),
    ) &&
    rows(
      row.analysis.classifications,
      (classification) =>
        provenance(classification) &&
        id(classification.transactionId) &&
        text(classification.categoryId) &&
        isCategoryId(classification.categoryId) &&
        oneOf(classification.source, ['user', 'rule', 'preference', 'global', 'review']) &&
        typeof classification.needsReview === 'boolean',
    ) &&
    rows(
      row.analysis.recurring,
      (recurring) =>
        provenance(recurring) &&
        id(recurring.id) &&
        text(recurring.merchantKey) &&
        strings(recurring.transactionIds) &&
        oneOf(recurring.kind, ['subscription', 'recurring_expense', 'recurring_income']) &&
        recurring.frequency === 'monthly' &&
        money(recurring.expectedAmount) &&
        recurring.nextOn !== null &&
        calendar(recurring.nextOn) &&
        typeof recurring.priceIncreased === 'boolean',
    ) &&
    rows(
      row.analysis.reviewItems,
      (review) =>
        id(review.id) &&
        strings(review.transactionIds) &&
        oneOf(review.type, ['classification', 'reconciliation', 'balance']) &&
        text(review.explanation) &&
        nullableText(review.matchId),
    ) &&
    rows(
      row.analysis.summaries,
      (summary) =>
        text(summary.currency) &&
        isCurrencyCode(summary.currency) &&
        ['balance', 'income', 'spend', 'pending'].every((key) => money(summary[key])) &&
        Number.isInteger(summary.transactionCount) &&
        (summary.transactionCount as number) >= 0,
    )
  )
}

/** Every public financial method is fenced, including direct child-client calls and GET exports. */
export function offlineGatedApi(
  client: ApiClient,
  blocked: () => boolean,
  message: () => string,
  beforeDestructiveRequest?: () => void,
): ApiClient {
  const methods = new Map<PropertyKey, unknown>()
  return new Proxy(client, {
    get(target, property, receiver) {
      const method: unknown = Reflect.get(target, property, receiver)
      if (typeof method !== 'function') return method
      if (methods.has(property)) return methods.get(property)
      const wrapped = (...args: unknown[]) => {
        if (property !== 'overview' && blocked())
          return Promise.reject(new ApiError(503, 'offline_read_only', message()))
        const requestMethod =
          property === 'request' && args[1] && typeof args[1] === 'object'
            ? Reflect.get(args[1], 'method')
            : undefined
        if (
          property === 'erase' ||
          property === 'disconnect' ||
          (typeof requestMethod === 'string' && requestMethod.toUpperCase() === 'DELETE')
        )
          beforeDestructiveRequest?.()
        return Reflect.apply(method, target, args)
      }
      methods.set(property, wrapped)
      return wrapped
    },
  })
}

/** Pin the complete verified online view; an encrypted read cannot become a partial/recomputed view. */
export function matchesVerifiedOverview(
  value: unknown,
  serializedVerifiedOverview: string | null,
): value is DemoOverview {
  if (!serializedVerifiedOverview || !value || typeof value !== 'object') return false
  try {
    return (
      record(value) &&
      completeOverview(value) &&
      JSON.stringify(value) === serializedVerifiedOverview
    )
  } catch {
    return false
  }
}
