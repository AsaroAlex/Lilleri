export const RECURRING_FREQUENCIES = [
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannual',
  'annual',
  'irregular',
] as const
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number]
export interface RecurringPolicy {
  readonly version: string
  readonly toleranceDays: Readonly<Record<Exclude<RecurringFrequency, 'irregular'>, number>>
  readonly minimumOccurrences: number
  readonly longPeriodMinimumOccurrences: number
  readonly fixedAmountToleranceBps: number
  readonly variableAmountBandBps: number
  readonly horizonDays: number
  readonly maxProjectedOccurrences: number
}
/** Provisional local PRD RS-1 policy; these are not calibrated precision probabilities. */
export const DEFAULT_RECURRING_POLICY: RecurringPolicy = Object.freeze({
  version: 'local-prd-rs1-v1',
  toleranceDays: Object.freeze({
    weekly: 2,
    biweekly: 3,
    monthly: 4,
    bimonthly: 6,
    quarterly: 8,
    semiannual: 10,
    annual: 15,
  }),
  minimumOccurrences: 3,
  longPeriodMinimumOccurrences: 2,
  fixedAmountToleranceBps: 200,
  variableAmountBandBps: 3500,
  horizonDays: 60,
  maxProjectedOccurrences: 1000,
})
