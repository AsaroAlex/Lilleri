export * from './calendar-date.js'
export * from './entitlements.js'
export * from './merchant.js'
export * from './profile-settings.js'
export * from './taxonomy.js'

import type { CurrencyCode, Money } from '@lilleri/money'

export type { CurrencyCode, Money, MoneyJson } from '@lilleri/money'
export { fromJson, money, parseDecimal, toJson } from '@lilleri/money'

/** A provider calendar date. It never passes through a user's local timezone. */
export function dateOnly(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Expected YYYY-MM-DD')
  const parsed = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error('Invalid calendar date')
  }
  return value
}

export function daysBetween(first: string, second: string): number {
  return (
    Math.abs(
      Date.parse(`${dateOnly(first)}T00:00:00Z`) - Date.parse(`${dateOnly(second)}T00:00:00Z`),
    ) / 86_400_000
  )
}

export interface Account {
  readonly id: string
  readonly profileId: string
  readonly connectionId: string
  readonly providerAccountId: string
  readonly name: string
  readonly institutionName: string
  readonly kind: 'current' | 'card' | 'cash' | 'savings'
  readonly balance: Money
  readonly balanceUpdatedAt: string
}

export interface Connection {
  readonly id: string
  readonly profileId: string
  readonly providerId: string
  readonly institutionId: string
  readonly status: 'active' | 'expired' | 'revoked' | 'error'
  readonly createdAt: string
  readonly lastSyncedAt: string | null
}

export interface Consent {
  readonly id: string
  readonly profileId: string
  readonly connectionId: string
  readonly purpose: 'account_information'
  readonly grantedAt: string
  readonly expiresAt: string
  readonly revokedAt: string | null
  readonly provider: string
}

export type TransactionKind =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'card_settlement'
  | 'refund'
  | 'cash_withdrawal'
export interface Transaction {
  readonly id: string
  readonly profileId: string
  readonly accountId: string
  readonly connectionId: string
  readonly providerId: string
  readonly providerTransactionId: string
  readonly revision: number
  readonly source: 'bank' | 'csv' | 'manual'
  readonly status: 'pending' | 'booked' | 'reversed'
  readonly amount: Money
  readonly description: string
  readonly merchantName: string | null
  readonly merchantKey: string | null
  readonly bookedOn: string | null
  readonly authorizedOn: string | null
  readonly observedAt: string
  readonly kind: TransactionKind
  /** Opaque provider relationship, never inferred from amount alone. */
  readonly reference: string | null
  readonly relatedTransactionId: string | null
  readonly relatedAccountId: string | null
}

export interface Provenance {
  readonly algorithmVersion: string
  readonly confidence: number
  readonly explanation: string
  readonly evidence: readonly string[]
}

export type MatchType =
  | 'pending_to_booked'
  | 'duplicate'
  | 'internal_transfer'
  | 'card_settlement'
  | 'refund'
  | 'cash_transfer'
export interface ReconciliationMatch extends Provenance {
  readonly id: string
  readonly type: MatchType
  readonly transactionIds: readonly string[]
  readonly state: 'confirmed' | 'suggested' | 'rejected' | 'undone'
}

export type CategoryId =
  | 'income'
  | 'groceries'
  | 'shopping'
  | 'food'
  | 'transport'
  | 'utilities'
  | 'subscriptions'
  | 'health'
  | 'travel'
  | 'transfer'
  | 'uncategorised'
export const CATEGORIES: Readonly<Record<CategoryId, string>> = {
  income: 'Entrate',
  groceries: 'Spesa alimentare',
  shopping: 'Acquisti',
  food: 'Bar e ristoranti',
  transport: 'Trasporti',
  utilities: 'Casa e utenze',
  subscriptions: 'Abbonamenti',
  health: 'Salute',
  travel: 'Viaggi',
  transfer: 'Trasferimenti',
  uncategorised: 'Da controllare',
}
export function isCategoryId(value: string): value is CategoryId {
  return Object.hasOwn(CATEGORIES, value)
}

/** Bounded AND conditions. Amount bounds are absolute integer minor units, never floats. */
export interface RuleConditions {
  readonly merchantKey?: string
  readonly description?: { readonly operator: 'equals' | 'contains'; readonly value: string }
  readonly amount?: {
    readonly currency: CurrencyCode
    readonly minMinor?: string
    readonly maxMinor?: string
  }
  readonly accountId?: string
  readonly kind?: TransactionKind
  readonly direction?: 'debit' | 'credit' | 'zero'
}
export interface RuleDefinition {
  readonly name: string
  readonly conditions: RuleConditions
  readonly categoryId: CategoryId
  readonly priority: number
}
export interface RuleRecord extends RuleDefinition {
  readonly id: string
  readonly profileId: string
  readonly enabled: boolean
  readonly archived: boolean
  readonly revision: number
  readonly createdAt: string
  readonly updatedAt: string
}
export interface RulePreview {
  readonly ruleId: string
  readonly revision: number
  readonly previewRevision: string
  readonly affectedTransactionIds: readonly string[]
  readonly matchedTransactionIds: readonly string[]
  readonly lockedTransactionIds: readonly string[]
}
export interface Rule {
  readonly id: string
  readonly profileId: string
  /** Legacy exact-merchant condition retained for existing pure-engine callers. */
  readonly merchantKey?: string
  readonly conditions?: RuleConditions
  readonly categoryId: CategoryId
  readonly priority: number
  readonly enabled: boolean
  readonly revision?: number
}
export interface Preference {
  readonly profileId: string
  readonly merchantKey: string
  readonly categoryId: CategoryId
}
export interface Classification extends Provenance {
  readonly transactionId: string
  readonly categoryId: CategoryId
  readonly source: 'user' | 'rule' | 'preference' | 'global' | 'review'
  readonly needsReview: boolean
}
export interface ClassificationFeedback {
  readonly transactionId: string
  readonly profileId: string
  readonly categoryId: CategoryId
  readonly scope: 'once' | 'merchant'
  readonly createdAt: string
}
export interface ReviewItem {
  readonly id: string
  readonly transactionIds: readonly string[]
  readonly type: 'classification' | 'reconciliation' | 'balance'
  readonly explanation: string
  readonly matchId: string | null
}
export interface RecurringSeries extends Provenance {
  readonly id: string
  readonly merchantKey: string
  readonly transactionIds: readonly string[]
  readonly kind: 'subscription' | 'recurring_expense' | 'recurring_income'
  readonly frequency: 'monthly'
  readonly expectedAmount: Money
  readonly nextOn: string
  readonly priceIncreased: boolean
}
export interface CurrencySummary {
  readonly currency: Money['currency']
  readonly balance: Money
  readonly income: Money
  readonly spend: Money
  readonly pending: Money
  readonly transactionCount: number
}
export interface Analysis {
  readonly matches: readonly ReconciliationMatch[]
  readonly classifications: readonly Classification[]
  readonly recurring: readonly RecurringSeries[]
  readonly reviewItems: readonly ReviewItem[]
  readonly summaries: readonly CurrencySummary[]
}
