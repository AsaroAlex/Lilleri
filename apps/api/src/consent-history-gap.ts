import { type Database, schema } from '@lilleri/database'
import { and, asc, eq } from 'drizzle-orm'
import { consentEvents } from './consent-lifecycle-schema.js'
import { syncJobs } from './sync-schema.js'

export interface ConsentHistoryRecovery {
  readonly interruptedAt: string
  readonly renewedAt: string
  readonly status: 'unverified' | 'covered' | 'bank_gap'
  readonly intervals: readonly { readonly from: string; readonly to: string }[]
  readonly evidenceJobIds: readonly string[]
}
function calendar(value: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))
  const part = (type: string) => parts.find((part) => part.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
const move = (date: string, days: number) =>
  new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10)
/** Consent dates prove interrupted access. Only completed declared windows prove acquired history. */
export function consentRecoveryFromEvidence(
  events: readonly {
    action: string
    occurredAt: string
    authorization: { consentExpiresAt: string | null }
  }[],
  jobs: readonly {
    id: string
    state: string
    completedAt: string | null
    requestedFrom: string | null
    requestedTo: string
    report: {
      coverage: string
      historyFrom: string | null
      balances: readonly { readonly accountId: string }[]
    }
  }[],
  timezone: string,
  accountIds: readonly string[],
): ConsentHistoryRecovery | null {
  for (let index = events.length - 1; index > 0; index--) {
    const renewed = events[index],
      previous = events[index - 1]
    if (
      renewed?.action !== 'renewed' ||
      !previous?.authorization.consentExpiresAt ||
      Date.parse(previous.authorization.consentExpiresAt) >= Date.parse(renewed.occurredAt)
    )
      continue
    const interruptedAt = previous.authorization.consentExpiresAt
    const from = calendar(interruptedAt, timezone),
      to = calendar(renewed.occurredAt, timezone)
    let intervals = [{ from, to }]
    const evidenceJobIds: string[] = []
    for (const job of jobs) {
      if (
        job.state !== 'completed' ||
        !job.completedAt ||
        job.completedAt < renewed.occurredAt ||
        job.report.coverage !== 'complete_requested_interval'
      )
        continue
      const coveredAccounts = new Set(job.report.balances.map((balance) => balance.accountId))
      if (
        !accountIds.length ||
        coveredAccounts.size !== accountIds.length ||
        accountIds.some((id) => !coveredAccounts.has(id))
      )
        continue
      // The aggregate historyFrom is not a per-account declaration for multi-account connections.
      const start = job.requestedFrom ?? (accountIds.length === 1 ? job.report.historyFrom : null)
      if (!start || start > job.requestedTo || job.requestedTo < from) continue
      evidenceJobIds.push(job.id)
      intervals = intervals.flatMap((interval) => {
        if (start > interval.to || job.requestedTo < interval.from) return [interval]
        const remaining = []
        if (start > interval.from) remaining.push({ from: interval.from, to: move(start, -1) })
        if (job.requestedTo < interval.to)
          remaining.push({ from: move(job.requestedTo, 1), to: interval.to })
        return remaining
      })
    }
    return {
      interruptedAt,
      renewedAt: renewed.occurredAt,
      status: evidenceJobIds.length ? (intervals.length ? 'bank_gap' : 'covered') : 'unverified',
      intervals: evidenceJobIds.length ? intervals : [],
      evidenceJobIds,
    }
  }
  return null
}
export async function readConsentHistoryRecovery(
  db: Database,
  profileId: string,
  connectionId: string,
) {
  const [profile] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, profileId))
  if (!profile) return null
  const events = await db
    .select()
    .from(consentEvents)
    .where(
      and(eq(consentEvents.profileId, profileId), eq(consentEvents.connectionId, connectionId)),
    )
    .orderBy(asc(consentEvents.revision))
  const jobs = await db
    .select()
    .from(syncJobs)
    .where(and(eq(syncJobs.profileId, profileId), eq(syncJobs.connectionId, connectionId)))
    .orderBy(asc(syncJobs.createdAt), asc(syncJobs.id))
  const accounts = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(
      and(eq(schema.accounts.profileId, profileId), eq(schema.accounts.connectionId, connectionId)),
    )
  return consentRecoveryFromEvidence(
    events,
    jobs,
    profile.timezone,
    accounts.map((account) => account.id),
  )
}
