import type { Rule, Transaction } from '@lilleri/domain'

/** Literal Unicode comparison; rule text is data and cannot become a regular expression. */
export function normalizeRuleText(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('it-IT').replace(/\s+/g, ' ').trim()
}
export function ruleMatches(transaction: Transaction, rule: Rule): boolean {
  if (rule.profileId !== transaction.profileId || !rule.enabled) return false
  const conditions = rule.conditions ?? (rule.merchantKey ? { merchantKey: rule.merchantKey } : {})
  if (Object.keys(conditions).length === 0) return false
  if (conditions.merchantKey !== undefined && conditions.merchantKey !== transaction.merchantKey)
    return false
  if (conditions.accountId !== undefined && conditions.accountId !== transaction.accountId)
    return false
  if (conditions.kind !== undefined && conditions.kind !== transaction.kind) return false
  const amount = transaction.amount.amountMinor
  if (conditions.direction === 'debit' && amount >= 0n) return false
  if (conditions.direction === 'credit' && amount <= 0n) return false
  if (conditions.direction === 'zero' && amount !== 0n) return false
  if (conditions.description) {
    const value = normalizeRuleText(conditions.description.value)
    const description = normalizeRuleText(transaction.description)
    if (
      !value ||
      (conditions.description.operator === 'equals'
        ? description !== value
        : !description.includes(value))
    )
      return false
  }
  if (conditions.amount) {
    if (conditions.amount.currency !== transaction.amount.currency) return false
    const absolute = amount < 0n ? -amount : amount
    try {
      if (conditions.amount.minMinor !== undefined && absolute < BigInt(conditions.amount.minMinor))
        return false
      if (conditions.amount.maxMinor !== undefined && absolute > BigInt(conditions.amount.maxMinor))
        return false
    } catch {
      return false
    }
  }
  return true
}
