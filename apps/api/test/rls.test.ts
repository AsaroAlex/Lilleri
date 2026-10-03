import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Database, type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { createProfileScope } from '../../../packages/database/src/scope.js'
import { createApp } from '../src/app.js'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import { profileEncryptionKeys, profileKeyTombstones } from '../src/encryption-schema.js'
import { LOCAL_TERMS_VERSION } from '../src/identity.js'
import * as identity from '../src/identity-schema.js'
import { ManualService } from '../src/manual-service.js'
import { RulesService } from '../src/rules.js'
import { DemoService } from '../src/service.js'
import { SettingsService } from '../src/settings.js'

const profileA = `rls_a_${randomUUID()}`,
  profileB = `rls_b_${randomUUID()}`
const financialTables = [
  'profiles',
  'connections',
  'consents',
  'accounts',
  'transactions',
  'source_observations',
  'classification_feedback',
  'preferences',
  'match_decisions',
  'sync_runs',
  'profile_tombstones',
  'match_decision_legs',
  'observation_payloads',
  'revocation_jobs',
  'classification_rules',
  'rule_events',
  'manual_accounts',
  'manual_commands',
  'manual_balance_events',
  'profile_settings',
  'profile_settings_events',
  'profile_encryption_keys',
  'profile_key_tombstones',
  'account_members',
] as const
const instant = '2026-10-03T12:00:00.000Z'
let handle: DatabaseHandle
let runtimeRole: string | undefined
let runtimeUrl: string | undefined
let app: Awaited<ReturnType<typeof createApp>>
function rows<T>(value: unknown): T[] {
  return (value as { rows: T[] }).rows
}
async function seed(profileId: string) {
  const provider = new MockItalianProvider(),
    service = new DemoService(handle.db, profileId, provider, () => instant)
  await service.bootstrap(true)
  const data = await service.data(),
    transaction = data.transactions.find((item) => item.merchantKey),
    match = data.analysis.matches[0]
  if (!transaction || !match) throw new Error('Tenant fixture is incomplete')
  await service.decide(match.id, 'confirmed', match.revision)
  await service.correct(transaction.id, 'food', 'merchant', transaction.revision)
  await new RulesService(handle.db, profileId, () => instant).create({
    name: 'Regola sintetica',
    conditions: { merchantKey: 'coop' },
    categoryId: 'food',
    priority: 10,
  })
  await new SettingsService(handle.db, profileId, () => instant).update(1, {
    displayName: 'Profilo sintetico',
    locale: 'it-IT',
    timezone: 'Europe/Rome',
  })
  await new ManualService(handle.db, profileId, () => instant).create({
    requestId: randomUUID(),
    name: 'Contanti sintetici',
    kind: 'cash',
    currency: 'EUR',
    openingBalanceMinor: '1000',
    openingOn: '2026-10-01',
  })
  await handle.db.insert(schema.profileTombstones).values({ profileId, erasedAt: instant })
  await handle.db.insert(schema.revocationJobs).values({
    id: `job_${randomUUID()}`,
    profileId,
    connectionId: data.accounts[0].connectionId,
    providerId: 'mock-italy',
    consentId: `consent_${profileId}`,
    state: 'pending',
    attempts: 0,
    createdAt: instant,
    nextAttemptAt: instant,
    deadlineAt: '2026-10-10T12:00:00.000Z',
  })
  await handle.db.execute(
    sql`INSERT INTO profile_encryption_keys(profile_id,key_id,wrapped_key,created_at) VALUES(${profileId},${`key_${profileId}`},'synthetic-test-key',${instant})`,
  )
  await handle.db.execute(
    sql`INSERT INTO profile_key_tombstones(profile_id,key_id,staged_at) VALUES(${profileId},${`old_key_${profileId}`},${instant})`,
  )
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  if (url) {
    const migration = await openDatabase({ driver: 'postgres', url })
    runtimeRole = `lilleri_test_${randomUUID().replaceAll('-', '')}`
    const password = randomBytes(32).toString('hex')
    try {
      // Generated identifiers/password contain only ASCII hex; never print this query or error.
      await migration.db.execute(
        sql.raw(
          `CREATE ROLE "${runtimeRole}" LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${password}'`,
        ),
      )
      await migration.db.execute(sql`GRANT lilleri_runtime TO ${sql.identifier(runtimeRole)}`)
    } catch {
      throw new Error('Disposable non-owner runtime role could not be provisioned')
    } finally {
      await migration.close()
    }
    const connection = new URL(url)
    connection.username = runtimeRole
    connection.password = password
    runtimeUrl = connection.toString()
    handle = await openDatabase({ driver: 'postgres', url, runtimeUrl })
  } else handle = await openDatabase({ driver: 'pglite' })
  await seed(profileA)
  await seed(profileB)
  app = await createApp({
    db: handle.db,
    financialScope: handle.withProfile,
    demoMode: true,
    profileId: profileA,
    seed: false,
    now: () => instant,
  })
})
afterAll(async () => {
  await app?.close()
  if (handle) {
    for (const id of [profileA, profileB]) {
      await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
      await handle.db
        .delete(schema.profileTombstones)
        .where(eq(schema.profileTombstones.profileId, id))
      await handle.db.delete(schema.revocationJobs).where(eq(schema.revocationJobs.profileId, id))
    }
    await handle.close()
  }
  const url = process.env.PG_TEST_DATABASE_URL
  if (url && runtimeRole) {
    const cleanup = await openDatabase({ driver: 'postgres', url })
    try {
      await cleanup.db.execute(sql`DROP ROLE ${sql.identifier(runtimeRole)}`)
    } finally {
      await cleanup.close()
    }
  }
})

describe('non-owner transaction-scoped financial isolation', () => {
  test('every reserved household table has ENABLE and FORCE RLS and populated tenant fixtures', async () => {
    const catalog = rows<{
      relname: string
      relrowsecurity: boolean
      relforcerowsecurity: boolean
    }>(
      await handle.db.execute(
        sql`SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class JOIN pg_namespace ON pg_namespace.oid=pg_class.relnamespace WHERE pg_namespace.nspname='public' AND relkind='r'`,
      ),
    )
    for (const name of [
      ...financialTables,
      'households',
      'identity_memberships',
      'identity_users',
    ]) {
      expect(
        catalog.find((table) => table.relname === name),
        name,
      ).toMatchObject({ relrowsecurity: true, relforcerowsecurity: true })
    }
    for (const name of financialTables) {
      const field = name === 'profiles' ? 'id' : 'profile_id'
      const counts = rows<{ profile_id: string; count: string }>(
        await handle.db.execute(
          sql`SELECT ${sql.identifier(field)} AS profile_id,count(*)::text AS count FROM ${sql.identifier(name)} WHERE ${sql.identifier(field)} IN (${profileA},${profileB}) GROUP BY ${sql.identifier(field)}`,
        ),
      )
      expect(counts.length, `${name} has both seeded tenants`).toBe(2)
      expect(
        counts.every((item) => BigInt(item.count) > 0n),
        name,
      ).toBe(true)
    }
    expect(handle.runtimeRoleMode).toBe(
      process.env.PG_TEST_DATABASE_URL ? 'separate-credential' : 'trusted-session-role',
    )
  })
  test('all financial tables hide the other profile without application WHERE predicates', async () => {
    await handle.withProfile(profileA, async (db) => {
      const role = rows<{ current_user: string; superuser: boolean; owner: boolean }>(
        await db.execute(
          sql`SELECT current_user,(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser,EXISTS(SELECT 1 FROM pg_class JOIN pg_namespace ON pg_namespace.oid=pg_class.relnamespace WHERE pg_namespace.nspname='public' AND relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)) AS owner`,
        ),
      )[0]
      expect(role).toMatchObject({ superuser: false, owner: false })
      for (const name of financialTables) {
        const field = name === 'profiles' ? 'id' : 'profile_id'
        const visible = rows<{ profile_id: string }>(
          await db.execute(
            sql`SELECT ${sql.identifier(field)} AS profile_id FROM ${sql.identifier(name)}`,
          ),
        )
        expect(visible.length, name).toBeGreaterThan(0)
        expect(new Set(visible.map((row) => row.profile_id)), name).toEqual(new Set([profileA]))
      }
    })
  })
  test('an unset scope denies every financial row and cannot insert one', async () => {
    await handle.db.transaction(async (db) => {
      await db.execute(sql`SET LOCAL ROLE lilleri_runtime`)
      await db.execute(
        sql`SELECT set_config('app.profile_id','',true),set_config('app.household_id','',true),set_config('app.identity_user_id','',true)`,
      )
      for (const name of financialTables)
        expect(rows(await db.execute(sql`SELECT 1 FROM ${sql.identifier(name)}`)), name).toEqual([])
      await expect(
        db.transaction((tx) =>
          tx
            .insert(schema.preferences)
            .values({ profileId: profileA, merchantKey: 'unset', categoryId: 'food' }),
        ),
      ).rejects.toThrow()
    })
  })
  test('cross-profile update/delete affect zero rows and mismatched insert/update roll back', async () => {
    await handle.withProfile(profileA, async (db) => {
      for (const name of financialTables) {
        const field = name === 'profiles' ? 'id' : 'profile_id'
        if (name === 'account_members' || name === 'profile_key_tombstones') {
          await expect(
            db.transaction((tx) =>
              tx.execute(
                sql`UPDATE ${sql.identifier(name)} SET ${sql.identifier(field)} = ${sql.identifier(field)} WHERE ${sql.identifier(field)} = ${profileB}`,
              ),
            ),
          ).rejects.toThrow()
          await expect(
            db.transaction((tx) =>
              tx.execute(
                sql`DELETE FROM ${sql.identifier(name)} WHERE ${sql.identifier(field)} = ${profileB}`,
              ),
            ),
          ).rejects.toThrow()
        } else {
          expect(
            rows(
              await db.execute(
                sql`UPDATE ${sql.identifier(name)} SET ${sql.identifier(field)} = ${sql.identifier(field)} WHERE ${sql.identifier(field)} = ${profileB} RETURNING ${sql.identifier(field)}`,
              ),
            ),
            name,
          ).toEqual([])
          expect(
            rows(
              await db.execute(
                sql`DELETE FROM ${sql.identifier(name)} WHERE ${sql.identifier(field)} = ${profileB} RETURNING ${sql.identifier(field)}`,
              ),
            ),
            name,
          ).toEqual([])
        }
      }
      expect(
        await db
          .update(schema.accounts)
          .set({ name: 'Forbidden' })
          .where(eq(schema.accounts.profileId, profileB))
          .returning(),
      ).toEqual([])
      expect(
        await db
          .delete(schema.preferences)
          .where(eq(schema.preferences.profileId, profileB))
          .returning(),
      ).toEqual([])
      await expect(
        db.transaction((tx) =>
          tx
            .insert(schema.preferences)
            .values({ profileId: profileB, merchantKey: 'forbidden', categoryId: 'food' }),
        ),
      ).rejects.toThrow()
      await expect(
        db.transaction((tx) =>
          tx.update(schema.accounts).set({ householdId: `household:${profileB}` }),
        ),
      ).rejects.toThrow()
    })
    const foreign = await handle.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.profileId, profileB))
    expect(foreign.every((account) => account.name !== 'Forbidden')).toBe(true)
  })
  test('nested financial transactions preserve scope and failed writes are atomic', async () => {
    const merchantKey = `rollback_${randomUUID()}`
    await expect(
      handle.withProfile(profileA, async (db) => {
        await db.transaction(async (tx) => {
          await tx
            .insert(schema.preferences)
            .values({ profileId: profileA, merchantKey, categoryId: 'food' })
          expect(await tx.select().from(schema.profiles)).toHaveLength(1)
        })
        throw new Error('Simulated response preparation failure')
      }),
    ).rejects.toThrow('Simulated response preparation failure')
    expect(
      await handle.db
        .select()
        .from(schema.preferences)
        .where(eq(schema.preferences.merchantKey, merchantKey)),
    ).toEqual([])
  })
  test('concurrent scope callbacks and reused pooled clients cannot mix households', async () => {
    const result = await Promise.all(
      Array.from({ length: 20 }, (_, index) => {
        const expected = index % 2 ? profileA : profileB
        return handle.withProfile(expected, async (db) => {
          const first = await db.select().from(schema.profiles)
          if (process.env.PG_TEST_DATABASE_URL) await db.execute(sql`SELECT pg_sleep(0.002)`)
          const second = await db.select().from(schema.profiles)
          return (
            first[0]?.id === expected &&
            second[0]?.id === expected &&
            first.length === 1 &&
            second.length === 1
          )
        })
      }),
    )
    expect(result.every(Boolean)).toBe(true)
    if (runtimeUrl) {
      // A fresh runtime pool connection has no context; no migration/owner SQL participates.
      const ownerUrl = process.env.PG_TEST_DATABASE_URL
      if (!ownerUrl) throw new Error('Missing PostgreSQL owner URL')
      const isolated = await openDatabase({ driver: 'postgres', url: ownerUrl, runtimeUrl })
      try {
        expect(
          await isolated.withProfile(profileB, (db) => db.select().from(schema.profiles)),
        ).toHaveLength(1)
      } finally {
        await isolated.close()
      }
    }
  })
  test.skipIf(!process.env.PG_TEST_DATABASE_URL)(
    'the same non-owner pooled connection clears every context after commit and rollback',
    async () => {
      if (!runtimeUrl || !runtimeRole) throw new Error('Missing disposable runtime credential')
      const require = createRequire(
        new URL('../../../packages/database/dist/index.js', import.meta.url),
      )
      const { Pool } = require('pg')
      const pool = new Pool({ connectionString: runtimeUrl, max: 1 })
      const scope = createProfileScope(handle.db, drizzle(pool, { schema }) as Database, false)
      try {
        const backend = await scope(
          profileA,
          async (db) =>
            rows<{ pid: number }>(await db.execute(sql`SELECT pg_backend_pid() AS pid`))[0]?.pid,
        )
        const afterCommit = await pool.query(
          "SELECT pg_backend_pid() AS pid, current_user, current_setting('app.profile_id',true) AS profile_id, current_setting('app.household_id',true) AS household_id, current_setting('app.identity_user_id',true) AS user_id",
        )
        expect(afterCommit.rows[0].pid).toBe(backend)
        expect(afterCommit.rows[0].current_user).toBe(runtimeRole)
        for (const field of ['profile_id', 'household_id', 'user_id'])
          expect(afterCommit.rows[0][field] ?? '').toBe('')
        await expect(
          scope(profileB, async (db) => {
            await db.insert(schema.preferences).values({
              profileId: profileB,
              merchantKey: 'rolled-back-pool-write',
              categoryId: 'food',
            })
            throw new Error('Abort scoped pool callback')
          }),
        ).rejects.toThrow('Abort scoped pool callback')
        const afterRollback = await pool.query(
          "SELECT pg_backend_pid() AS pid, current_setting('app.profile_id',true) AS profile_id, current_setting('app.household_id',true) AS household_id, current_setting('app.identity_user_id',true) AS user_id",
        )
        expect(afterRollback.rows[0].pid).toBe(backend)
        for (const field of ['profile_id', 'household_id', 'user_id'])
          expect(afterRollback.rows[0][field] ?? '').toBe('')
        expect((await pool.query('SELECT 1 FROM profiles')).rows).toEqual([])
        expect((await pool.query('SELECT 1 FROM preferences')).rows).toEqual([])
      } finally {
        await pool.end()
      }
    },
  )
  test('scope identifiers and unknown profiles fail closed', async () => {
    await expect(handle.withProfile('', async () => 0)).rejects.toMatchObject({
      code: 'invalid_scope',
    })
    await expect(
      handle.withProfile(`missing_${randomUUID()}`, async () => 0),
    ).rejects.toMatchObject({ code: 'profile_unavailable' })
  })
  test('runtime cannot access identity credentials or mutate trusted deletion completion', async () => {
    await handle.withProfile(profileA, async (db) => {
      await expect(
        db.transaction((tx) =>
          tx.execute(
            sql`SELECT email,password FROM identity_users JOIN identity_accounts ON identity_accounts.user_id=identity_users.id`,
          ),
        ),
      ).rejects.toThrow()
      await expect(
        db.transaction((tx) =>
          tx.execute(
            sql`UPDATE profile_key_tombstones SET destroyed_at=${instant} WHERE profile_id=${profileA}`,
          ),
        ),
      ).rejects.toThrow()
      await expect(
        db.transaction((tx) =>
          tx.execute(sql`DELETE FROM profile_key_tombstones WHERE profile_id=${profileA}`),
        ),
      ).rejects.toThrow()
      expect(
        await db
          .delete(identity.user)
          .where(eq(identity.user.id, 'other-user'))
          .returning({ id: identity.user.id }),
      ).toEqual([])
    })
  })
  test('only separately verified owner membership permits same-transaction identity erasure', async () => {
    const ownerId = `owner_${randomUUID()}`,
      viewerId = `viewer_${randomUUID()}`,
      now = new Date(instant)
    await handle.db.insert(identity.user).values(
      [ownerId, viewerId].map((id) => ({
        id,
        name: 'Synthetic',
        email: `${id}@example.test`,
        adultAttested: true,
        termsVersion: 'test',
        createdAt: now,
        updatedAt: now,
      })),
    )
    await handle.db.insert(identity.memberships).values([
      { userId: ownerId, profileId: profileA, role: 'owner', createdAt: now },
      { userId: viewerId, profileId: profileA, role: 'viewer', createdAt: now },
    ])
    await expect(
      handle.withProfile(profileA, async () => 0, { identityUserId: viewerId }),
    ).rejects.toMatchObject({ code: 'owner_required' })
    await expect(
      handle.withProfile(profileB, async () => 0, { identityUserId: ownerId }),
    ).rejects.toMatchObject({ code: 'owner_required' })
    await expect(
      handle.withProfile(
        profileA,
        async (db) => {
          await db.delete(identity.user).where(eq(identity.user.id, ownerId))
          throw new Error('Rollback authorised erasure')
        },
        { identityUserId: ownerId },
      ),
    ).rejects.toThrow('Rollback authorised erasure')
    expect(
      await handle.db
        .select({ id: identity.user.id })
        .from(identity.user)
        .where(eq(identity.user.id, ownerId)),
    ).toHaveLength(1)
    await handle.withProfile(
      profileA,
      (db) =>
        db
          .delete(identity.user)
          .where(eq(identity.user.id, ownerId))
          .then(() => undefined),
      { identityUserId: ownerId },
    )
    expect(
      await handle.db
        .select({ id: identity.user.id })
        .from(identity.user)
        .where(eq(identity.user.id, ownerId)),
    ).toEqual([])
    await handle.db.delete(identity.user).where(eq(identity.user.id, viewerId))
  })
  test('configured financial HTTP routes execute through scoped runtime and preserve exact DTOs', async () => {
    const overview = await app.inject({ url: '/v1/demo' })
    expect(overview.statusCode, overview.payload).toBe(200)
    const snapshot = overview.json()
    expect(snapshot.profile.id).toBe(profileA)
    expect(snapshot.transactions.length).toBeGreaterThan(0)
    const foreign = (
      await handle.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.profileId, profileB))
    )[0]
    if (!foreign) throw new Error('Missing foreign transaction')
    const denied = await app.inject({ url: `/v1/transactions/${foreign.id}` })
    expect(denied.statusCode).toBe(404)
    const manual = await app.inject({
      method: 'POST',
      url: '/v1/manual/accounts',
      payload: {
        requestId: randomUUID(),
        name: 'Portafoglio RLS',
        kind: 'cash',
        currency: 'EUR',
        openingBalanceMinor: '1250',
        openingOn: '2026-10-01',
      },
    })
    expect(manual.statusCode, manual.payload).toBe(201)
    expect(manual.json().balanceMinor).toBe('1250')
    const archive = await app.inject({ url: '/v1/export/archive' })
    expect(archive.statusCode, archive.payload.slice(0, 200)).toBe(200)
    expect(archive.headers['content-type']).toContain('application/zip')
  })
  test('authenticated scoped erasure rolls back credentials and key staging on failure, then issues a post-commit certificate', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'lilleri-rls-identity-vault-'))
    const keys = await createLocalSyntheticKeyManagement({ directory, mode: 'demo' })
    const encryption = new ProfileEncryption(handle.db, keys, () => instant)
    const local = await createApp({
      db: handle.db,
      financialScope: handle.withProfile,
      encryption,
      demoMode: false,
      localIdentity: { baseURL: 'http://localhost:3001', secret: randomBytes(48).toString('hex') },
    })
    let profileId: string | undefined, userId: string | undefined
    try {
      const password = 'Scoped synthetic credential 39!'
      const headers = { origin: 'http://localhost:3000', host: 'localhost:3001' }
      const signup = await local.inject({
        method: 'POST',
        url: '/api/auth/sign-up/email',
        headers,
        payload: {
          name: 'Persona sintetica',
          email: `rls-local-${randomUUID()}@example.invalid`,
          password,
          adultAttested: true,
          termsVersion: LOCAL_TERMS_VERSION,
        },
      })
      expect(signup.statusCode, signup.payload).toBe(200)
      userId = signup.json().user.id
      const setCookie = signup.headers['set-cookie']
      const cookie = (
        Array.isArray(setCookie) ? setCookie : typeof setCookie === 'string' ? [setCookie] : []
      )
        .map((value) => value.split(';')[0])
        .join('; ')
      const authenticated = { ...headers, cookie }
      const membership = (
        await handle.db
          .select()
          .from(identity.memberships)
          .where(eq(identity.memberships.userId, userId as string))
      )[0]
      if (!membership) throw new Error('Missing authenticated owner profile')
      profileId = membership.profileId
      const connect = await local.inject({
        method: 'POST',
        url: '/v1/connections/mock',
        headers: authenticated,
        payload: {},
      })
      expect(connect.statusCode, connect.payload).toBe(200)
      expect(
        await handle.db
          .select()
          .from(profileEncryptionKeys)
          .where(eq(profileEncryptionKeys.profileId, profileId)),
      ).toHaveLength(1)
      const stepUp = await local.inject({
        method: 'POST',
        url: '/v1/auth/reauthenticate',
        headers: authenticated,
        payload: { password },
      })
      expect(stepUp.statusCode, stepUp.payload).toBe(200)
      const archive = await local.inject({ url: '/v1/export/archive', headers: authenticated })
      expect(archive.statusCode, archive.payload.slice(0, 200)).toBe(200)
      expect(archive.headers['content-type']).toContain('application/zip')
      const original = DemoService.prototype.erase
      const failed = vi
        .spyOn(DemoService.prototype, 'erase')
        .mockImplementationOnce(async function (this: DemoService, completion) {
          await original.call(this, async (db) => {
            await completion?.(db)
            throw new Error('Synthetic scoped credential cleanup failure')
          })
        })
      try {
        const response = await local.inject({
          method: 'POST',
          url: '/v1/profile/deletion',
          headers: authenticated,
          payload: {},
        })
        expect(response.statusCode, response.payload).toBe(500)
        expect(response.payload).not.toContain('Synthetic scoped credential cleanup failure')
        expect(
          await handle.db.select().from(schema.profiles).where(eq(schema.profiles.id, profileId)),
        ).toHaveLength(1)
        expect(
          await handle.db
            .select()
            .from(identity.user)
            .where(eq(identity.user.id, userId as string)),
        ).toHaveLength(1)
        expect(
          await handle.db
            .select()
            .from(profileEncryptionKeys)
            .where(eq(profileEncryptionKeys.profileId, profileId)),
        ).toHaveLength(1)
        expect(
          await handle.db
            .select()
            .from(profileKeyTombstones)
            .where(eq(profileKeyTombstones.profileId, profileId)),
        ).toEqual([])
        expect(
          await handle.db
            .select()
            .from(schema.revocationJobs)
            .where(eq(schema.revocationJobs.profileId, profileId)),
        ).toEqual([])
      } finally {
        failed.mockRestore()
      }
      const response = await local.inject({
        method: 'POST',
        url: '/v1/profile/deletion',
        headers: authenticated,
        payload: {},
      })
      expect(response.statusCode, response.payload).toBe(200)
      expect(response.json()).toMatchObject({
        format: 'lilleri.deletion-certificate.v1',
        localFinancialDeletion: 'completed',
        keyErasure: 'destroyed_local_adapter',
        externalProcessors: 'not_verified',
      })
      expect(response.payload).not.toContain(profileId)
      expect(response.payload).not.toContain(userId as string)
      expect(
        await handle.db.select().from(schema.profiles).where(eq(schema.profiles.id, profileId)),
      ).toEqual([])
      expect(
        await handle.db
          .select()
          .from(identity.user)
          .where(eq(identity.user.id, userId as string)),
      ).toEqual([])
      expect(
        await handle.db
          .select()
          .from(identity.account)
          .where(eq(identity.account.userId, userId as string)),
      ).toEqual([])
      expect(
        await handle.db
          .select()
          .from(profileEncryptionKeys)
          .where(eq(profileEncryptionKeys.profileId, profileId)),
      ).toEqual([])
      const [tombstone] = await handle.db
        .select()
        .from(profileKeyTombstones)
        .where(eq(profileKeyTombstones.profileId, profileId))
      expect(tombstone?.destroyedAt).toBeTruthy()
      expect(
        await handle.db
          .select()
          .from(schema.revocationJobs)
          .where(eq(schema.revocationJobs.profileId, profileId)),
      ).toHaveLength(1)
      expect((await local.inject({ url: '/v1/demo', headers: authenticated })).statusCode).toBe(401)
    } finally {
      await local.close()
      if (userId) await handle.db.delete(identity.user).where(eq(identity.user.id, userId))
      if (profileId) {
        await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
        await handle.db
          .delete(schema.revocationJobs)
          .where(eq(schema.revocationJobs.profileId, profileId))
      }
      await rm(directory, { recursive: true, force: true })
    }
  })
  test.skipIf(!process.env.PG_TEST_DATABASE_URL)(
    'owner credentials and a mismatched runtime database are rejected',
    async () => {
      const url = process.env.PG_TEST_DATABASE_URL
      if (!url) throw new Error('Missing PostgreSQL URL')
      await expect(openDatabase({ driver: 'postgres', url, runtimeUrl: url })).rejects.toThrow(
        'non-owner',
      )
      if (!runtimeUrl) throw new Error('Missing runtime credential')
      const otherDatabase = new URL(runtimeUrl)
      otherDatabase.pathname = '/postgres'
      await expect(
        openDatabase({ driver: 'postgres', url, runtimeUrl: otherDatabase.toString() }),
      ).rejects.toThrow('same database')
    },
  )
  test.skipIf(!process.env.PG_TEST_DATABASE_URL || !process.env.PG_TEST_OTHER_CLUSTER_URL)(
    'same-name databases on different Unix-socket clusters are rejected and verification locks clear',
    async () => {
      const url = process.env.PG_TEST_DATABASE_URL,
        otherUrl = process.env.PG_TEST_OTHER_CLUSTER_URL
      if (!url || !otherUrl) throw new Error('Missing isolated socket-cluster URLs')
      const other = await openDatabase({ driver: 'postgres', url: otherUrl })
      const role = `lilleri_socket_${randomUUID().replaceAll('-', '')}`
      const password = randomBytes(32).toString('hex')
      let created = false
      try {
        const metadata = sql`SELECT current_database() AS database, inet_server_addr()::text AS address, inet_server_port() AS port`
        const ownIdentity = rows<{ database: string; address: string | null; port: number | null }>(
          await handle.db.execute(metadata),
        )[0]
        const otherIdentity = rows<{
          database: string
          address: string | null
          port: number | null
        }>(await other.db.execute(metadata))[0]
        // These are actual independent clusters with metadata the old check could not distinguish.
        expect(ownIdentity).toEqual(otherIdentity)
        expect(ownIdentity?.address).toBeNull()
        expect(ownIdentity?.port).toBeNull()
        try {
          await other.db.execute(
            sql.raw(
              `CREATE ROLE "${role}" LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${password}'`,
            ),
          )
          created = true
          await other.db.execute(sql`GRANT lilleri_runtime TO ${sql.identifier(role)}`)
        } catch {
          throw new Error('Disposable socket-cluster runtime role could not be provisioned')
        }
        const runtime = new URL(otherUrl)
        runtime.username = role
        runtime.password = password
        await expect(
          openDatabase({ driver: 'postgres', url, runtimeUrl: runtime.toString() }),
        ).rejects.toThrow('same database')
        const locks = rows<{ held: number }>(
          await other.db.execute(sql`
          SELECT count(*)::integer AS held FROM pg_locks lock
          JOIN pg_stat_activity session ON session.pid = lock.pid
          WHERE lock.locktype = 'advisory' AND session.usename = ${role}
        `),
        )
        expect(locks[0]?.held).toBe(0)
      } finally {
        try {
          if (created) await other.db.execute(sql`DROP ROLE ${sql.identifier(role)}`)
        } finally {
          await other.close()
        }
      }
    },
  )
  test('a restored local fallback rejects a runtime group that acquired trusted membership', async () => {
    const path = await mkdtemp(join(tmpdir(), 'lilleri-rls-unsafe-membership-'))
    try {
      const unsafe = await openDatabase({ driver: 'pglite', path })
      try {
        await unsafe.db.execute(sql`GRANT lilleri_trusted TO lilleri_runtime`)
      } finally {
        await unsafe.close()
      }
      await expect(openDatabase({ driver: 'pglite', path })).rejects.toThrow('non-owner')
    } finally {
      await rm(path, { recursive: true, force: true })
    }
  })
  test('quarantined restored PGlite copies cannot be opened as ordinary application databases', async () => {
    const path = await mkdtemp(join(tmpdir(), 'lilleri-rls-quarantine-'))
    try {
      await writeFile(join(path, '.lilleri-restore-quarantine'), 'pending journal replay', {
        mode: 0o600,
      })
      await expect(openDatabase({ driver: 'pglite', path })).rejects.toThrow('quarantined')
      const restore = await openDatabase({ driver: 'pglite', path, restoreQuarantine: true })
      await restore.close()
    } finally {
      await rm(path, { recursive: true, force: true })
    }
  })
})
