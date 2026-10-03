import { createHash } from 'node:crypto'
import type { RecurringSelector } from '@lilleri/engines'
import { RECURRING_FREQUENCIES, RECURRING_KINDS, recurringStableKey } from '@lilleri/engines'
import { z } from 'zod'

const id = z.string().min(1).max(256),
  instant = z.iso.datetime(),
  revision = z.number().int().min(2).max(2147483646)
const choice = z.strictObject({
  status: z.enum(['observed', 'confirmed', 'not_recurring']),
  kind: z.enum(RECURRING_KINDS).nullable(),
  frequency: z.enum(RECURRING_FREQUENCIES).nullable(),
  installmentCount: z.number().int().min(1).max(10000).nullable(),
  installmentIndex: z.number().int().min(1).max(10000).nullable(),
})
const selector = z.strictObject({
  profileId: id,
  accountId: id,
  currency: z.string().regex(/^[A-Z]{3}$/),
  direction: z.enum(['outgoing', 'incoming']),
  identityKind: z.enum(['mandate', 'creditor', 'merchant', 'legacy_merchant']),
  identityValue: z.string().min(1).max(65536),
})
export const recurringPreferenceExportDto = z.strictObject({
  id: z.string().regex(/^recurring_[a-f0-9]{64}$/),
  profileId: id,
  accountId: id,
  selector,
  choice,
  revision,
  createdAt: instant,
  updatedAt: instant,
})
export const recurringPreferenceEventExportDto = z.strictObject({
  id: z.uuid(),
  profileId: id,
  accountId: id,
  preferenceId: id,
  revision,
  action: z.enum(['updated', 'undone']),
  occurredAt: instant,
  snapshot: z.strictObject({
    before: choice,
    after: choice,
    evidenceTransactionIds: z.array(id),
    policyVersion: id,
  }),
})
export const recurringOwnershipSchemas = {
  recurringPreferences: z.array(recurringPreferenceExportDto),
  recurringPreferenceEvents: z.array(recurringPreferenceEventExportDto),
} as const
const exportSchema = z.object(recurringOwnershipSchemas).strict()
const fail = () => {
  throw new Error('Recurring ownership snapshot is invalid')
}
function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}
/** Validates an owned snapshot without needing a live DB, key provider or current detector. */
export function validateRecurringOwnershipExport(snapshot: {
  profile: { id: string; createdAt?: string }
  accounts: readonly { id: string; profileId: string }[]
  transactions: readonly { id: string; profileId: string; accountId: string }[]
  exportedAt: string
  recurringPreferences?: unknown
  recurringPreferenceEvents?: unknown
}) {
  if (
    snapshot.recurringPreferences === undefined &&
    snapshot.recurringPreferenceEvents === undefined
  )
    return
  const parsed = exportSchema.parse({
    recurringPreferences: snapshot.recurringPreferences,
    recurringPreferenceEvents: snapshot.recurringPreferenceEvents,
  })
  const accounts = new Map(snapshot.accounts.map((row) => [row.id, row])),
    transactions = new Map(snapshot.transactions.map((row) => [row.id, row]))
  const at = Date.parse(snapshot.exportedAt),
    start = snapshot.profile.createdAt === undefined ? null : Date.parse(snapshot.profile.createdAt)
  if (!Number.isFinite(at) || (start !== null && (!Number.isFinite(start) || at < start))) fail()
  const prefs = new Map(parsed.recurringPreferences.map((row) => [row.id, row]))
  if (
    prefs.size !== parsed.recurringPreferences.length ||
    new Set(parsed.recurringPreferenceEvents.map((row) => row.id)).size !==
      parsed.recurringPreferenceEvents.length
  )
    fail()
  for (const pref of prefs.values()) {
    const account = accounts.get(pref.accountId)
    if (
      pref.profileId !== snapshot.profile.id ||
      !account ||
      account.profileId !== pref.profileId ||
      pref.selector.profileId !== pref.profileId ||
      pref.selector.accountId !== pref.accountId ||
      pref.id !==
        `recurring_${createHash('sha256')
          .update(recurringStableKey(pref.selector as RecurringSelector))
          .digest('hex')}` ||
      (start !== null && Date.parse(pref.createdAt) < start) ||
      Date.parse(pref.updatedAt) < Date.parse(pref.createdAt) ||
      Date.parse(pref.updatedAt) > at
    )
      fail()
    const events = parsed.recurringPreferenceEvents
      .filter((row) => row.preferenceId === pref.id)
      .sort((a, b) => a.revision - b.revision)
    if (events.length !== pref.revision - 1) fail()
    let previous: {
      status: 'observed' | 'confirmed' | 'not_recurring'
      kind: (typeof RECURRING_KINDS)[number] | null
      frequency: (typeof RECURRING_FREQUENCIES)[number] | null
      installmentCount: number | null
      installmentIndex: number | null
    } = {
      status: 'observed',
      kind: null,
      frequency: null,
      installmentCount: null,
      installmentIndex: null,
    }
    let previousAt = Date.parse(pref.createdAt)
    for (const [index, event] of events.entries()) {
      if (
        event.revision !== index + 2 ||
        event.profileId !== pref.profileId ||
        event.accountId !== pref.accountId ||
        Date.parse(event.occurredAt) < previousAt ||
        Date.parse(event.occurredAt) > at ||
        !same(event.snapshot.before, previous)
      )
        fail()
      if (index === 0 && event.occurredAt !== pref.createdAt) fail()
      if (
        event.action === 'undone' &&
        (index === 0 ||
          events[index - 1]?.action === 'undone' ||
          !same(event.snapshot.after, events[index - 1]?.snapshot.before))
      )
        fail()
      const selected = event.snapshot.after
      if (
        selected.status === 'observed' &&
        (selected.kind !== null ||
          selected.frequency !== null ||
          selected.installmentCount !== null ||
          selected.installmentIndex !== null)
      )
        fail()
      if (
        selected.installmentIndex !== null &&
        (selected.installmentCount === null ||
          selected.installmentIndex > selected.installmentCount)
      )
        fail()
      if (
        new Set(event.snapshot.evidenceTransactionIds).size !==
        event.snapshot.evidenceTransactionIds.length
      )
        fail()
      for (const id of event.snapshot.evidenceTransactionIds) {
        const row = transactions.get(id)
        if (!row || row.profileId !== pref.profileId || row.accountId !== pref.accountId) fail()
      }
      previous = selected
      previousAt = Date.parse(event.occurredAt)
    }
    if (!same(previous, pref.choice) || events.at(-1)?.occurredAt !== pref.updatedAt) fail()
  }
  for (const event of parsed.recurringPreferenceEvents) if (!prefs.has(event.preferenceId)) fail()
  return parsed
}
