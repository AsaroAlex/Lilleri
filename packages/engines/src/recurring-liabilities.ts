import type { Transaction } from '@lilleri/domain'
import { detectObservedRecurring, type RecurringEvidence } from './recurring-observed.js'

/** User presentation choices never constitute proof that an observed liability disappeared. */
export function detectRecurringLiabilities(input: Parameters<typeof detectObservedRecurring>[0]) {
  const evidence: Record<string, RecurringEvidence> = {}
  const uncertain = new Set<string>()
  const identityKey = (row: Transaction) =>
    JSON.stringify([row.accountId, row.amount.currency, row.merchantKey])
  const unresolvedKeys = new Set(
    input.transactions
      .filter((row) =>
        ['ambiguous', 'suppressed'].includes(
          input.evidenceByTransactionId?.[row.id]?.merchantResolution ?? '',
        ),
      )
      .map(identityKey),
  )
  for (const row of input.transactions) {
    const hint = input.evidenceByTransactionId?.[row.id] ?? {}
    if (row.amount.amountMinor >= 0n) {
      evidence[row.id] = hint
      continue
    }
    const fallbackGroup = unresolvedKeys.has(identityKey(row))
    const { merchantId: _merchantId, ...withoutMerchant } = hint
    evidence[row.id] = {
      ...(fallbackGroup ? withoutMerchant : hint),
      // Internal cash analysis may use the original local key. It never publishes this identity.
      ...(fallbackGroup ? { merchantResolution: 'unknown' } : {}),
      purpose: hint.purpose === 'recurring_transfer' ? 'recurring_transfer' : 'recurring_bill',
    }
  }
  const series = detectObservedRecurring({
    ...input,
    evidenceByTransactionId: evidence,
    choices: {},
  })
  const detailed = new Map(detectObservedRecurring(input).map((item) => [item.stableKey, item]))
  for (const item of series) {
    if (item.expectedAmount.amountMinor >= 0n) continue
    const choice = input.choices?.[item.stableKey]
    const visible = detailed.get(item.stableKey)
    const requiresReview =
      item.frequency === 'irregular' ||
      !visible ||
      choice?.status === 'not_recurring' ||
      (choice?.frequency !== null &&
        choice?.frequency !== undefined &&
        choice.frequency !== item.frequency) ||
      item.transactionIds.some((id) =>
        ['ambiguous', 'suppressed'].includes(
          input.evidenceByTransactionId?.[id]?.merchantResolution ?? '',
        ),
      )
    if (requiresReview) for (const id of item.transactionIds) uncertain.add(id)
  }
  return { series, uncertainTransactionIds: [...uncertain].sort() }
}

/** Keep references readonly and profile scoped; this type documents internal-only consumers. */
export type RecurringLiabilityTransaction = Pick<Transaction, 'id' | 'profileId' | 'accountId'>
