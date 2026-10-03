import { createHash, randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import type { Account, Connection } from '@lilleri/domain'
import {
  discoverInstitutions,
  type FinancialDataProvider,
  hasExpandedProviderContract,
  institutionPickerDecision,
  validateDiscoveryMetadata,
  validateProviderConnectionGrant,
} from '@lilleri/financial-providers'
import { and, asc, eq, inArray, isNull, lte, notInArray, sql } from 'drizzle-orm'
import {
  type ConnectionCreationIntent,
  connectionCreationIntents,
} from './connection-creation-schema.js'
import { assertLifecycleAllowsRefresh, recordConsentGranted } from './consent-lifecycle.js'
import { consentLifecycles } from './consent-lifecycle-schema.js'
import { Problem } from './problem.js'
import type { FinancialScope } from './request-scope.js'
import { assertNoOutstandingRevocation, enqueueRevocation } from './revocation-outbox.js'

const liveCreations = new Set<string>()
const creationWork = new Set<Promise<unknown>>()
let acceptingCreationWork = true
function trackCreationWork<T>(work: Promise<T>): Promise<T> {
  creationWork.add(work)
  void work.then(
    () => creationWork.delete(work),
    () => creationWork.delete(work),
  )
  return work
}
/** Server shutdown: stops admission synchronously, then waits for discovery, grant and compensation. */
export async function closeConnectionCreationWork(): Promise<void> {
  acceptingCreationWork = false
  while (creationWork.size) await Promise.allSettled([...creationWork])
}
const pendingStates = ['prepared', 'dispatching', 'cancelled', 'compensating'] as const
function instant(value: string) {
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) throw new Error('Invalid creation clock')
  return parsed.toISOString()
}
const changed = () =>
  new Problem(
    409,
    'connection_creation_changed',
    'Il collegamento è cambiato. Controlla lo stato prima di riprovare.',
  )
const pending = () =>
  new Problem(
    409,
    'connection_creation_pending',
    'Il collegamento precedente deve terminare prima di riprovare.',
  )
const unavailable = () =>
  new Problem(502, 'provider_unavailable', 'La fonte non è disponibile. Riprova più tardi.')
function checkedIdentity(value: string) {
  if (
    !value ||
    value.length > 200 ||
    Array.from(value).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    throw new Error('Invalid trusted creation identity')
}
async function basis(db: Database, profileId: string, connectionId: string) {
  const [profile] = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, profileId))
    .for('update')
  if (!profile) throw changed()
  const [connection] = await db
    .select()
    .from(schema.connections)
    .where(
      and(eq(schema.connections.profileId, profileId), eq(schema.connections.id, connectionId)),
    )
    .for('update')
  const consents = await db
    .select()
    .from(schema.consents)
    .where(
      and(eq(schema.consents.profileId, profileId), eq(schema.consents.connectionId, connectionId)),
    )
    .orderBy(asc(schema.consents.id))
  const [lifecycle] = await db
    .select()
    .from(consentLifecycles)
    .where(
      and(
        eq(consentLifecycles.profileId, profileId),
        eq(consentLifecycles.connectionId, connectionId),
      ),
    )
  const digest = createHash('sha256')
    .update(
      JSON.stringify({
        profile: { id: profile.id, householdId: profile.householdId, createdAt: profile.createdAt },
        connection: connection ?? null,
        consents,
        lifecycle: lifecycle ?? null,
      }),
    )
    .digest('hex')
  return { connection, digest }
}
export interface CreationCompensation {
  /** Server-generated durable id, never forwarded from a request. Target is read from trusted storage. */
  readonly intentId: string
  readonly grantSettled: boolean
}
export interface ConnectionCreationOptions {
  readonly scope: FinancialScope
  readonly profileId: string
  readonly provider: FinancialDataProvider
  readonly attemptTimeoutMs: number
  readonly now?: () => string
  /** Trusted compensator must remain usable after profile deletion. */
  readonly compensate: (value: CreationCompensation) => Promise<void>
}
/** All provider discovery/grant calls happen after a short committed prepare and before scoped apply. */
export class ConnectionCreationCoordinator {
  constructor(readonly options: ConnectionCreationOptions) {
    checkedIdentity(options.profileId)
    if (
      !Number.isInteger(options.attemptTimeoutMs) ||
      options.attemptTimeoutMs < 1 ||
      options.attemptTimeoutMs > 300_000
    )
      throw new Error('Invalid configured creation timeout')
    if (
      !options.provider.capabilities().synthetic ||
      !options.provider.capabilities().grantSpecificRevocation ||
      !hasExpandedProviderContract(options.provider) ||
      (hasExpandedProviderContract(options.provider) &&
        validateDiscoveryMetadata(options.provider.discoveryMetadata()).environment !== 'synthetic')
    )
      throw new Error('Only expanded synthetic grant-specific providers are supported')
  }
  private at() {
    return instant(this.options.now?.() ?? new Date().toISOString())
  }
  private scope<T>(work: (db: Database) => Promise<T>) {
    return this.options.scope(this.options.profileId, work)
  }
  connect(
    input: { readonly institutionId: string; readonly accountKind: Account['kind'] },
    signal?: AbortSignal,
  ): Promise<Connection> {
    if (!acceptingCreationWork) return Promise.reject(unavailable())
    return trackCreationWork(this.create(input, signal))
  }
  private async create(
    input: { readonly institutionId: string; readonly accountKind: Account['kind'] },
    signal?: AbortSignal,
  ): Promise<Connection> {
    checkedIdentity(input.institutionId)
    const provider = this.options.provider
    if (!hasExpandedProviderContract(provider)) throw unavailable()
    const prepared = await this.scope(async (db) => {
      await db
        .select()
        .from(schema.profiles)
        .where(eq(schema.profiles.id, this.options.profileId))
        .for('update')
      const [existing] = await db
        .select()
        .from(schema.connections)
        .where(
          and(
            eq(schema.connections.profileId, this.options.profileId),
            eq(schema.connections.providerId, provider.id),
            eq(schema.connections.institutionId, input.institutionId),
          ),
        )
        .orderBy(asc(schema.connections.createdAt), asc(schema.connections.id))
      if (existing?.status === 'active') {
        try {
          await assertLifecycleAllowsRefresh(db, this.options.profileId, existing.id, this.at())
          return { connection: existing, intent: null }
        } catch (error) {
          if (!(error instanceof Problem) || error.code !== 'consent_inactive') throw error
        }
      }
      const [open] = await db
        .select()
        .from(connectionCreationIntents)
        .where(
          and(
            eq(connectionCreationIntents.profileId, this.options.profileId),
            eq(connectionCreationIntents.providerId, provider.id),
            eq(connectionCreationIntents.institutionId, input.institutionId),
            inArray(connectionCreationIntents.state, [...pendingStates]),
          ),
        )
      if (open) throw pending()
      const connectionId = existing?.id ?? `connection_${randomUUID()}`
      await assertNoOutstandingRevocation(db, this.options.profileId, connectionId)
      const snapshot = await basis(db, this.options.profileId, connectionId),
        at = this.at()
      const [intent] = await db
        .insert(connectionCreationIntents)
        .values({
          id: randomUUID(),
          profileId: this.options.profileId,
          providerId: provider.id,
          institutionId: input.institutionId,
          connectionId,
          consentId: `consent_${randomUUID()}`,
          basisDigest: snapshot.digest,
          state: 'prepared',
          createdAt: at,
          deadlineAt: new Date(Date.parse(at) + this.options.attemptTimeoutMs).toISOString(),
        })
        .returning()
      if (!intent) throw changed()
      return { connection: null, intent }
    })
    if (prepared.connection) {
      const { householdId: _household, ...connection } = prepared.connection
      return connection
    }
    const intent = prepared.intent
    if (!intent) throw changed()
    let timer: ReturnType<typeof setTimeout> | undefined
    let abortHandler: (() => void) | undefined
    let abandoned = false
    let ioStarted = false
    let grantSettled = false
    try {
      if (signal?.aborted) throw changed()
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => {
            abandoned = true
            reject(unavailable())
          },
          Math.max(1, Date.parse(intent.deadlineAt) - Date.parse(this.at())),
        )
        abortHandler = () => {
          abandoned = true
          reject(changed())
        }
        signal?.addEventListener('abort', abortHandler, { once: true })
        if (signal?.aborted) abortHandler()
      })
      const institutions = await Promise.race([
        trackCreationWork(discoverInstitutions(provider)),
        timeout,
      ])
      const institution = institutions.find((row) => row.id === input.institutionId)
      if (
        !institution ||
        !institutionPickerDecision(institution, input.accountKind, 'synthetic').connectable
      )
        throw new Problem(
          422,
          'institution_unavailable',
          'Questa fonte non è verificata per il tipo di conto richiesto.',
        )
      liveCreations.add(intent.id)
      await this.scope(async (db) => {
        const current = await this.fence(db, intent)
        await db
          .update(connectionCreationIntents)
          .set({ state: 'dispatching', dispatchedAt: this.at() })
          .where(eq(connectionCreationIntents.id, current.id))
      })
      if (abandoned || signal?.aborted) throw changed()
      ioStarted = true
      const creation = trackCreationWork(
        (async () => {
          try {
            const grant = await provider.createConnection({
              profileId: intent.profileId,
              connectionId: intent.connectionId,
              grantId: intent.consentId,
              institutionId: intent.institutionId,
            })
            grantSettled = true
            if (abandoned) {
              await this.options.compensate({ intentId: intent.id, grantSettled: true })
              throw changed()
            }
            return grant
          } catch (error) {
            // A rejected provider promise does not prove the remote grant never materialized.
            await this.options.compensate({ intentId: intent.id, grantSettled })
            throw error
          } finally {
            liveCreations.delete(intent.id)
          }
        })(),
      )
      const grant = validateProviderConnectionGrant(
        await Promise.race([creation, timeout]),
        provider.discoveryMetadata(),
      )
      return await this.scope(async (db) => {
        const current = await this.fence(db, intent)
        const at = this.at()
        if (
          current.state !== 'dispatching' ||
          abandoned ||
          signal?.aborted ||
          grant.redirectUrl !== null ||
          grant.authorization.state !== 'active' ||
          Date.parse(grant.consentExpiresAt) <= Date.parse(at)
        )
          throw changed()
        const { connection } = await basis(db, intent.profileId, intent.connectionId)
        const value: Connection = {
          id: intent.connectionId,
          profileId: intent.profileId,
          providerId: intent.providerId,
          institutionId: intent.institutionId,
          status: 'active',
          createdAt: connection?.createdAt ?? at,
          lastSyncedAt: connection?.lastSyncedAt ?? null,
        }
        await db
          .insert(schema.connections)
          .values(value)
          .onConflictDoUpdate({ target: schema.connections.id, set: { status: 'active' } })
        await db
          .update(schema.consents)
          .set({ revokedAt: at })
          .where(
            and(
              eq(schema.consents.profileId, intent.profileId),
              eq(schema.consents.connectionId, intent.connectionId),
              isNull(schema.consents.revokedAt),
            ),
          )
        await db.insert(schema.consents).values({
          id: intent.consentId,
          profileId: intent.profileId,
          connectionId: intent.connectionId,
          purpose: 'account_information',
          grantedAt: at,
          expiresAt: grant.consentExpiresAt,
          revokedAt: null,
          provider: intent.providerId,
        })
        await recordConsentGranted(
          db,
          intent.profileId,
          intent.connectionId,
          intent.consentId,
          { discovery: provider.discoveryMetadata(), authorization: grant.authorization },
          at,
        )
        await db
          .update(connectionCreationIntents)
          .set({ state: 'applied', settledAt: at, appliedAt: at })
          .where(eq(connectionCreationIntents.id, intent.id))
        // A deadline or caller cancellation during SQL writes rolls back the whole apply.
        if (abandoned || signal?.aborted || intent.deadlineAt <= this.at()) throw changed()
        return value
      })
    } catch (error) {
      abandoned = true
      if (!ioStarted) liveCreations.delete(intent.id)
      await this.options.compensate({
        intentId: intent.id,
        grantSettled: !ioStarted || grantSettled,
      })
      if (error instanceof Problem) throw error
      throw unavailable()
    } finally {
      if (timer) clearTimeout(timer)
      if (abortHandler) signal?.removeEventListener('abort', abortHandler)
      // A failed dispatch fence never started provider I/O.
      if (!abandoned) liveCreations.delete(intent.id)
    }
  }
  private async fence(db: Database, intent: ConnectionCreationIntent) {
    const snapshot = await basis(db, intent.profileId, intent.connectionId)
    const [current] = await db
      .select()
      .from(connectionCreationIntents)
      .where(
        and(
          eq(connectionCreationIntents.profileId, intent.profileId),
          eq(connectionCreationIntents.id, intent.id),
        ),
      )
      .for('update')
    if (
      !current ||
      !['prepared', 'dispatching'].includes(current.state) ||
      current.basisDigest !== snapshot.digest ||
      current.deadlineAt <= this.at()
    )
      throw changed()
    await assertNoOutstandingRevocation(db, intent.profileId, intent.connectionId)
    return current
  }
}
/** Call inside erasure/revocation's scoped transaction; prevents even a late grant from applying. */
export async function cancelConnectionCreationIntents(
  db: Database,
  profileId: string,
  at: string,
  connectionId?: string,
) {
  checkedIdentity(profileId)
  instant(at)
  const captured = await db
    .select({
      id: connectionCreationIntents.id,
      providerId: connectionCreationIntents.providerId,
      connectionId: connectionCreationIntents.connectionId,
      consentId: connectionCreationIntents.consentId,
    })
    .from(connectionCreationIntents)
    .where(
      and(
        eq(connectionCreationIntents.profileId, profileId),
        connectionId ? eq(connectionCreationIntents.connectionId, connectionId) : undefined,
        inArray(connectionCreationIntents.state, [...pendingStates]),
      ),
    )
    .orderBy(asc(connectionCreationIntents.id))
    .for('update')
  await db
    .update(connectionCreationIntents)
    .set({ state: 'cancelled' })
    .where(
      and(
        eq(connectionCreationIntents.profileId, profileId),
        connectionId ? eq(connectionCreationIntents.connectionId, connectionId) : undefined,
        inArray(connectionCreationIntents.state, ['prepared', 'dispatching']),
      ),
    )
  return captured
}
/** Offline restore replay uses authenticated receipt IDs and still enforces the original scope. */
export async function cancelRestoredConnectionCreationIntents(
  db: Database,
  profileId: string,
  connectionId: string,
  intentIds: readonly string[],
  at: string,
) {
  checkedIdentity(profileId)
  checkedIdentity(connectionId)
  instant(at)
  if (intentIds.length > 10_000 || new Set(intentIds).size !== intentIds.length)
    throw new Error('Invalid bounded creation receipt')
  for (const id of intentIds) checkedIdentity(id)
  if (!intentIds.length) return
  const captured = await db
    .select()
    .from(connectionCreationIntents)
    .where(
      and(
        eq(connectionCreationIntents.profileId, profileId),
        eq(connectionCreationIntents.connectionId, connectionId),
        inArray(connectionCreationIntents.id, [...intentIds]),
      ),
    )
    .for('update')
  if (captured.length !== intentIds.length || captured.some((row) => row.state === 'applied'))
    throw new Error(
      'Creation receipt target is missing or inconsistent; restore must remain quarantined',
    )
  await db
    .update(connectionCreationIntents)
    .set({ state: 'cancelled' })
    .where(
      and(
        eq(connectionCreationIntents.profileId, profileId),
        eq(connectionCreationIntents.connectionId, connectionId),
        inArray(connectionCreationIntents.id, [...intentIds]),
        inArray(connectionCreationIntents.state, ['prepared', 'dispatching']),
      ),
    )
}
/** Trusted-only compensation: targets come exclusively from immutable intent fields. */
export async function compensateConnectionCreationIntent(
  db: Database,
  value: CreationCompensation,
  at: string,
) {
  const now = instant(at)
  await db.transaction(async (tx) => {
    const [intent] = await tx
      .select()
      .from(connectionCreationIntents)
      .where(eq(connectionCreationIntents.id, value.intentId))
      .for('update')
    if (!intent || intent.state === 'applied' || intent.state === 'compensated') return
    if (!intent.dispatchedAt) {
      await tx
        .update(connectionCreationIntents)
        .set({ state: 'compensated', compensatedAt: now })
        .where(eq(connectionCreationIntents.id, intent.id))
      return
    }
    if (liveCreations.has(intent.id) && !value.grantSettled) {
      await tx
        .update(connectionCreationIntents)
        .set({ state: 'cancelled' })
        .where(eq(connectionCreationIntents.id, intent.id))
      return
    }
    const jobId = await enqueueRevocation(
      tx,
      {
        profileId: intent.profileId,
        connectionId: intent.connectionId,
        providerId: intent.providerId,
        consentId: intent.consentId,
      },
      now,
    )
    // A previously acknowledged pre-settlement revoke cannot cover a late-created grant.
    if (value.grantSettled && !intent.settledAt)
      await tx
        .update(schema.revocationJobs)
        .set({
          state: 'pending',
          attempts: 0,
          nextAttemptAt: now,
          completedAt: null,
          leaseToken: null,
          leaseExpiresAt: null,
          lastErrorCode: null,
        })
        .where(eq(schema.revocationJobs.id, jobId))
    await tx
      .update(connectionCreationIntents)
      .set({
        state: 'compensating',
        revocationJobId: jobId,
        ...(value.grantSettled ? { settledAt: intent.settledAt ?? now } : {}),
      })
      .where(eq(connectionCreationIntents.id, intent.id))
  })
}
/** Startup/maintenance only: never redispatches a grant; active local I/O remains serially fenced. */
export async function recoverConnectionCreationIntents(db: Database, at: string, limit: number) {
  const now = instant(at)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error('Invalid bounded creation recovery limit')
  const rows = await db
    .select()
    .from(connectionCreationIntents)
    .where(
      and(
        notInArray(connectionCreationIntents.state, ['applied', 'compensated']),
        lte(connectionCreationIntents.deadlineAt, now),
      ),
    )
    .orderBy(
      sql`${connectionCreationIntents.recoveryCheckedAt} NULLS FIRST`,
      asc(connectionCreationIntents.createdAt),
      asc(connectionCreationIntents.id),
    )
    .limit(limit)
  for (const row of rows) {
    await db
      .update(connectionCreationIntents)
      .set({ recoveryCheckedAt: now })
      .where(
        and(
          eq(connectionCreationIntents.id, row.id),
          notInArray(connectionCreationIntents.state, ['applied', 'compensated']),
        ),
      )
    if (liveCreations.has(row.id)) continue
    await compensateConnectionCreationIntent(db, { intentId: row.id, grantSettled: false }, now)
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(connectionCreationIntents)
        .where(eq(connectionCreationIntents.id, row.id))
        .for('update')
      if (!current?.revocationJobId || current.state !== 'compensating') return
      const [job] = await tx
        .select()
        .from(schema.revocationJobs)
        .where(eq(schema.revocationJobs.id, current.revocationJobId))
      // An early revoke acknowledgement is not a permanent generation tombstone.
      // Unknown remote settlement remains blocked across a process restart.
      if (current.settledAt !== null && job?.state === 'completed')
        await tx
          .update(connectionCreationIntents)
          .set({ state: 'compensated', compensatedAt: now })
          .where(eq(connectionCreationIntents.id, row.id))
    })
  }
  return rows.length
}
