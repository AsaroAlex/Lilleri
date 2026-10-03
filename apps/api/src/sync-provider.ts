import { createHash } from 'node:crypto'
import { dateOnly, parseDecimal } from '@lilleri/domain'
import {
  normalizeAccount,
  normalizeTransaction,
  type ProviderAccount,
  type ProviderContext,
  type ProviderTransaction,
  type SyntheticSyncMetadata,
  type SyntheticSyncPage,
  type SyntheticSyncPageRequest,
  type SyntheticSyncSnapshot,
} from '@lilleri/financial-providers'
import { z } from 'zod'
import type { SyncConfiguration } from './runtime-config.js'

export class SyncContractError extends Error {
  constructor(readonly reason: 'invalid_provider_contract' | 'bound_reached') {
    super(reason)
  }
}
export function syncRequired<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new SyncContractError('invalid_provider_contract')
  return value
}
export function syncInstant(value: string) {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) throw new Error('Invalid sync clock')
  return new Date(time).toISOString()
}
export function syncDate(value: string) {
  return dateOnly(value)
}
export const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${syncDate(date)}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
export function syncHash(value: unknown): string {
  const sorted = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(sorted)
      : item && typeof item === 'object'
        ? Object.fromEntries(
            Object.entries(item)
              .filter(([, v]) => v !== undefined)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, sorted(v)]),
          )
        : typeof item === 'bigint'
          ? String(item)
          : item
  return createHash('sha256')
    .update(JSON.stringify(sorted(value)))
    .digest('hex')
}
const text = z.string().min(1).max(200)
const accountSchema = z
  .object({
    id: text,
    name: text,
    institutionName: text,
    kind: z.enum(['current', 'card', 'cash', 'savings']),
    currency: z.string().min(3).max(3),
    balance: z.string().min(1).max(40),
  })
  .strict()
export const syncRecordSchema = z
  .object({
    id: text,
    accountId: text,
    amount: z.string().min(1).max(40),
    currency: z.string().length(3),
    description: z.string().min(1).max(2000),
    status: z.enum(['pending', 'booked', 'reversed']),
    merchantName: z.string().max(500).optional(),
    bookedOn: z.string().length(10).optional(),
    authorizedOn: z.string().length(10).optional(),
    kind: z
      .enum(['expense', 'income', 'transfer', 'card_settlement', 'refund', 'cash_withdrawal'])
      .optional(),
    reference: z.string().max(500).optional(),
    relatedTransactionId: text.optional(),
    relatedAccountId: text.optional(),
    source: z.enum(['bank', 'csv', 'manual']).optional(),
  })
  .strict()
export function validateSyncSnapshot(
  value: unknown,
  providerId: string,
  context: ProviderContext,
  config: SyncConfiguration,
  observedBefore?: string,
): SyntheticSyncSnapshot {
  try {
    const parsed = z
      .object({
        snapshotId: z.string().min(1).max(200),
        accounts: z.array(accountSchema).min(1).max(config.maxAccounts),
        historyFrom: z.record(z.string(), z.string().length(10).nullable()),
        observedAt: z.string().datetime({ offset: true }).max(40),
        balances: z
          .array(
            z
              .object({
                accountId: text,
                currency: z.string().length(3),
                amount: z.string().min(1).max(40),
                type: z.enum(['booked', 'available', 'unknown']),
                referenceDate: z.string().length(10).nullable(),
                opening: z
                  .object({
                    amount: z.string().min(1).max(40),
                    date: z.string().length(10),
                    type: z.literal('booked'),
                  })
                  .strict()
                  .nullable(),
              })
              .strict(),
          )
          .max(config.maxAccounts),
      })
      .strict()
      .parse(value)
    syncInstant(parsed.observedAt)
    if (
      observedBefore !== undefined &&
      Date.parse(parsed.observedAt) > Date.parse(syncInstant(observedBefore))
    )
      throw new Error('Future source observation')
    const accounts = parsed.accounts as ProviderAccount[]
    if (new Set(accounts.map((account) => account.id)).size !== accounts.length)
      throw new Error('Duplicate account')
    if (
      Object.keys(parsed.historyFrom).length !== accounts.length ||
      accounts.some((account) => !Object.hasOwn(parsed.historyFrom, account.id))
    )
      throw new Error('Missing history evidence')
    for (const account of accounts)
      normalizeAccount(providerId, context, account, parsed.observedAt)
    for (const date of Object.values(parsed.historyFrom)) if (date !== null) syncDate(date)
    if (
      parsed.balances.length !== accounts.length ||
      new Set(parsed.balances.map((balance) => balance.accountId)).size !== accounts.length
    )
      throw new Error('Missing balances')
    for (const balance of parsed.balances) {
      const account = accounts.find((account) => account.id === balance.accountId)
      if (!account || account.currency !== balance.currency)
        throw new Error('Wrong balance account')
      const amount = parseDecimal(balance.amount, account.currency)
      if (amount.amountMinor !== parseDecimal(account.balance, account.currency).amountMinor)
        throw new Error('Balance snapshot drift')
      if (balance.referenceDate !== null) syncDate(balance.referenceDate)
      if (balance.opening) {
        syncDate(balance.opening.date)
        parseDecimal(balance.opening.amount, account.currency)
      }
    }
    return { ...parsed, accounts }
  } catch {
    throw new SyncContractError('invalid_provider_contract')
  }
}
export interface SyncWindow {
  accountId: string
  from: string
  to: string
  includePending: boolean
}
export interface SyncStage {
  snapshot: SyntheticSyncSnapshot
  windows: SyncWindow[]
  windowIndex: number
  cursor: string | null
  seenCursors: string[]
  records: ProviderTransaction[]
  complete: boolean[]
  pages: number
}
export function planSync(
  snapshot: SyntheticSyncSnapshot,
  from: string | null,
  to: string,
  config: SyncConfiguration,
  metadata: SyntheticSyncMetadata,
): SyncStage {
  const windows: SyncWindow[] = []
  const size = Math.min(config.windowDays, metadata.maxWindowDays)
  for (const account of snapshot.accounts) {
    const start = from ?? snapshot.historyFrom[account.id] ?? to
    if (start > to) throw new SyncContractError('invalid_provider_contract')
    for (let current = start; current <= to; ) {
      const end = addDays(current, size - 1) < to ? addDays(current, size - 1) : to
      windows.push({ accountId: account.id, from: current, to: end, includePending: end === to })
      if (windows.length > config.maxPagesPerJob) throw new SyncContractError('bound_reached')
      current = addDays(end, 1)
    }
  }
  return {
    snapshot,
    windows,
    windowIndex: 0,
    cursor: null,
    seenCursors: [],
    records: [],
    complete: [],
    pages: 0,
  }
}
export function validateSyncPage(
  value: unknown,
  request: SyntheticSyncPageRequest,
  account: ProviderAccount,
  providerId: string,
  context: ProviderContext,
  metadata: SyntheticSyncMetadata,
): SyntheticSyncPage {
  try {
    const parsed = z
      .object({
        snapshotId: text,
        from: z.string().length(10),
        to: z.string().length(10),
        transactions: z.array(syncRecordSchema).max(request.pageSize),
        nextCursor: z.string().min(1).max(metadata.maxCursorBytes).nullable(),
        coverage: z.enum(['complete_window', 'unknown']),
      })
      .strict()
      .parse(value)
    if (
      parsed.snapshotId !== request.snapshotId ||
      parsed.from !== request.from ||
      parsed.to !== request.to
    )
      throw new Error('Page scope drift')
    if (
      parsed.nextCursor !== null &&
      (Buffer.byteLength(parsed.nextCursor, 'utf8') > metadata.maxCursorBytes ||
        [...parsed.nextCursor].some(
          (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
        ))
    )
      throw new Error('Invalid cursor')
    for (const raw of parsed.transactions) {
      if (
        raw.accountId !== account.id ||
        raw.currency !== account.currency ||
        (raw.source && raw.source !== 'bank')
      )
        throw new Error('Wrong record scope')
      const record = raw as ProviderTransaction
      normalizeTransaction(providerId, context, record, new Date().toISOString())
      if (record.status === 'pending') {
        if (!request.includePending) throw new Error('Unexpected pending set')
      } else if (!record.bookedOn || record.bookedOn < request.from || record.bookedOn > request.to)
        throw new Error('Outside requested window')
    }
    return { ...parsed, transactions: parsed.transactions as ProviderTransaction[] }
  } catch {
    throw new SyncContractError('invalid_provider_contract')
  }
}
