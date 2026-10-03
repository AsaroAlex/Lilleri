import { randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import type { Classification } from '@lilleri/domain'
import { eq, sql } from 'drizzle-orm'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
  applyRulesOnlyToClassifications,
  mayPromptPrivacyPermission,
  PRIVACY_DISCLOSURES,
  type PrivacyPermissionChoice,
  PrivacyService,
  privacyClassificationOptions,
  privacyExcludedTransactionIds,
  privacyReaskNotBefore,
  readPrivacyPermission,
  registerPrivacyRoutes,
} from '../src/privacy.js'
import {
  privacyPermissionEvents,
  privacyPermissions,
  profilePrivacyEvents,
  profilePrivacySettings,
  transactionPrivacy,
  transactionPrivacyEvents,
} from '../src/privacy-schema.js'
import { Problem } from '../src/problem.js'

let handle: DatabaseHandle
const profiles: string[] = []
const baseNow = '2026-08-31T10:15:20.123Z'
async function fixture(transactionPrefix = 'privacy_transaction') {
  const profileId = `privacy_${randomUUID()}`,
    connectionId = `privacy_connection_${randomUUID()}`,
    accountId = `privacy_account_${randomUUID()}`,
    transactionId = `${transactionPrefix}_${randomUUID()}`
  profiles.push(profileId)
  await handle.db
    .insert(schema.profiles)
    .values({ id: profileId, name: 'Sintetico', timezone: 'Europe/Rome', createdAt: baseNow })
  await handle.db.insert(schema.connections).values({
    id: connectionId,
    profileId,
    providerId: 'mock-italian',
    institutionId: 'synthetic',
    status: 'active',
    createdAt: baseNow,
  })
  await handle.db.insert(schema.accounts).values({
    id: accountId,
    profileId,
    connectionId,
    providerAccountId: accountId,
    name: 'Sintetico',
    institutionName: 'Sintetico',
    kind: 'current',
    balanceMinor: 20_000n,
    currency: 'EUR',
    balanceUpdatedAt: baseNow,
  })
  await handle.db.insert(schema.transactions).values({
    id: transactionId,
    profileId,
    accountId,
    connectionId,
    providerId: 'mock-italian',
    providerTransactionId: transactionId,
    revision: 1,
    source: 'bank',
    status: 'booked',
    amountMinor: -1200n,
    currency: 'EUR',
    description: 'Movimento sintetico',
    merchantName: 'Sintetico',
    merchantKey: 'coop',
    bookedOn: '2026-08-31',
    observedAt: baseNow,
    kind: 'expense',
    contentHash: 'b'.repeat(64),
  })
  let now = baseNow
  const service = new PrivacyService(handle.db, profileId, () => now)
  return {
    profileId,
    transactionId,
    service,
    setNow: (value: string) => {
      now = value
    },
  }
}
function choice(
  purpose: keyof typeof PRIVACY_DISCLOSURES,
  action: 'granted' | 'denied' = 'granted',
): PrivacyPermissionChoice {
  const copy = PRIVACY_DISCLOSURES[purpose]
  return {
    action,
    textVersion: copy.textVersion,
    textHash: copy.textHash,
    noticeVersion: copy.noticeVersion,
    vendorListVersion: copy.vendorListVersion,
  }
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const profileId of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
  await handle.close()
})

describe('scoped audited privacy controls', () => {
  test('defaults to no private flags, ordinary classification and no optional permissions without writing records', async () => {
    const owned = await fixture()
    expect(await owned.service.readSettings()).toMatchObject({ rulesOnly: false, revision: 1 })
    expect(await owned.service.transaction(owned.transactionId)).toMatchObject({
      quiet: false,
      private: false,
      revision: 1,
    })
    const permissions = await owned.service.permissions()
    expect(permissions).toHaveLength(3)
    for (const permission of permissions)
      expect(permission).toMatchObject({
        state: 'not_granted',
        granted: false,
        localPreferenceEnabled: false,
        effectiveEnabled: false,
        osPermission: 'unknown',
        nativePushEnabled: false,
        canPrompt: false,
      })
    expect(
      await handle.db
        .select()
        .from(profilePrivacySettings)
        .where(eq(profilePrivacySettings.profileId, owned.profileId)),
    ).toHaveLength(0)
    expect(
      await handle.db
        .select()
        .from(privacyPermissions)
        .where(eq(privacyPermissions.profileId, owned.profileId)),
    ).toHaveLength(0)
  })

  test('stores reversible quiet/private metadata and audit while preserving canonical financial records', async () => {
    const owned = await fixture()
    const before = await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, owned.transactionId))
    expect(
      await owned.service.updateTransaction(owned.transactionId, 1, { quiet: true, private: true }),
    ).toMatchObject({ revision: 2, quiet: true, private: true })
    expect((await owned.service.analysisContext()).excludedTransactionIds).toEqual([
      owned.transactionId,
    ])
    const audit = await owned.service.exportAudit()
    expect(audit.transactionFlags).toHaveLength(1)
    expect(audit.events.transactions[0]).toMatchObject({
      before: { quiet: false, private: false },
      after: { quiet: true, private: true },
    })
    expect(JSON.stringify(audit)).not.toContain('householdId')
    expect(
      await handle.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.id, owned.transactionId)),
    ).toEqual(before)
    expect(
      await owned.service.updateTransaction(owned.transactionId, 2, {
        quiet: false,
        private: false,
      }),
    ).toMatchObject({ revision: 3 })
    expect((await owned.service.analysisContext()).excludedTransactionIds).toEqual([])
    expect((await owned.service.exportAudit()).events.transactions).toHaveLength(2)
  })

  test('permits exactly one concurrent change and rejects stale choices even after flags return to their original values', async () => {
    const owned = await fixture()
    const results = await Promise.allSettled([
      owned.service.updateTransaction(owned.transactionId, 1, { quiet: true, private: false }),
      owned.service.updateTransaction(owned.transactionId, 1, { quiet: false, private: true }),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect((await owned.service.exportAudit()).events.transactions).toHaveLength(1)
    await owned.service.updateTransaction(owned.transactionId, 2, { quiet: false, private: false })
    await expect(
      owned.service.updateTransaction(owned.transactionId, 1, { quiet: true, private: true }),
    ).rejects.toMatchObject({ code: 'privacy_changed' })
    expect((await owned.service.transaction(owned.transactionId)).revision).toBe(3)
  })

  test('foreign IDs are unavailable, composite foreign keys reject mismatched ownership and unscoped SQL reads are RLS-isolated', async () => {
    const owned = await fixture(),
      foreign = await fixture()
    await expect(owned.service.transaction(foreign.transactionId)).rejects.toMatchObject({
      status: 404,
    })
    await expect(
      owned.service.updateTransaction(foreign.transactionId, 1, { quiet: true, private: true }),
    ).rejects.toMatchObject({ status: 404 })
    await expect(
      handle.db.insert(transactionPrivacy).values({
        profileId: owned.profileId,
        transactionId: foreign.transactionId,
        quiet: true,
        private: true,
        revision: 2,
        updatedAt: baseNow,
      }),
    ).rejects.toThrow()
    await owned.service.updateTransaction(owned.transactionId, 1, { quiet: true, private: false })
    await foreign.service.updateTransaction(foreign.transactionId, 1, {
      quiet: false,
      private: true,
    })
    await handle.withProfile(owned.profileId, async (db) => {
      const flags = await db.select().from(transactionPrivacy)
      expect(flags.map((row) => row.transactionId)).toEqual([owned.transactionId])
      expect(await db.select().from(transactionPrivacyEvents)).toHaveLength(1)
    })
    await expect(
      handle.withProfile(owned.profileId, (db) =>
        db
          .update(transactionPrivacy)
          .set({ private: false })
          .where(eq(transactionPrivacy.profileId, foreign.profileId))
          .returning(),
      ),
    ).resolves.toEqual([])
  })

  test('rules-only persists an audited revision and removes dictionary predictions while retaining user choices and source facts', async () => {
    const owned = await fixture()
    await owned.service.updateRulesOnly(1, true)
    expect(await owned.service.analysisContext()).toMatchObject({
      rulesOnly: true,
      globalDictionaryEnabled: false,
      revision: 2,
    })
    expect(privacyClassificationOptions({ rulesOnly: true })).toEqual({
      globalDictionaryEnabled: false,
    })
    const base = {
      algorithmVersion: 'synthetic',
      needsReview: false,
      confidence: 1,
      explanation: 'Sintetico',
    }
    const classifications: Classification[] = [
      {
        ...base,
        transactionId: 'dictionary',
        categoryId: 'groceries',
        source: 'global',
        evidence: ['dictionary:coop'],
      },
      {
        ...base,
        transactionId: 'user',
        categoryId: 'food',
        source: 'user',
        evidence: ['sticky-user-correction'],
      },
      {
        ...base,
        transactionId: 'rule',
        categoryId: 'food',
        source: 'rule',
        evidence: ['rule:synthetic'],
      },
      {
        ...base,
        transactionId: 'preference',
        categoryId: 'food',
        source: 'preference',
        evidence: ['merchant:synthetic'],
      },
      {
        ...base,
        transactionId: 'source',
        categoryId: 'income',
        source: 'global',
        evidence: ['provider-kind:income'],
      },
    ]
    const changed = applyRulesOnlyToClassifications(classifications, true)
    expect(changed[0]).toMatchObject({
      categoryId: 'uncategorised',
      source: 'review',
      needsReview: true,
    })
    expect(changed.slice(1)).toEqual(classifications.slice(1))
    expect((await owned.service.exportAudit()).events.settings[0]).toMatchObject({
      before: { rulesOnly: false },
      after: { rulesOnly: true },
    })
    await expect(owned.service.updateRulesOnly(1, false)).rejects.toMatchObject({
      code: 'privacy_changed',
    })
    await owned.service.updateRulesOnly(2, false)
    expect((await owned.service.readSettings()).revision).toBe(3)
  })

  test('combines explicit flags with the legacy quiet canonical category and never mutates original classification inputs', () => {
    const flags = [
      { transactionId: 'private', private: true, quiet: false },
      { transactionId: 'quiet', private: false, quiet: true },
    ]
    const categories = [
      { transactionId: 'health', categoryId: 'health' as const },
      { transactionId: 'ordinary', categoryId: 'food' as const },
    ]
    expect(privacyExcludedTransactionIds(flags, categories)).toEqual(['health', 'private', 'quiet'])
    expect(categories[0]?.categoryId).toBe('health')
  })

  test('stores purpose/text evidence for explicit AI/analytics draft choices without activating external processing', async () => {
    const owned = await fixture()
    for (const purpose of ['P-AI', 'C-ANALYTICS'] as const) {
      const granted = await owned.service.setPermission(purpose, 1, choice(purpose))
      expect(granted).toMatchObject({
        state: 'granted',
        granted: true,
        permissionNotFeature: true,
        effectiveEnabled: false,
        featureAvailable: false,
        localPreferenceEnabled: false,
        canPrompt: false,
      })
      expect(granted.disclosure.draft).toBe(true)
    }
    const exported = await owned.service.exportAudit()
    expect(exported.events.permissions).toHaveLength(2)
    expect(exported.events.permissions[0]).toMatchObject({
      sourceOfTruth: 'local_preference',
      evidenceMethod: 'explicit_choice',
      uiContext: 'privacy_settings',
    })
    expect(JSON.stringify(exported)).not.toMatch(/"(ip|deviceId|amount|description|token)"/)
  })

  test('rejects stale text/vendor evidence and unknown properties before any permission mutation', async () => {
    const owned = await fixture()
    await expect(
      owned.service.setPermission('P-AI', 1, {
        ...choice('P-AI'),
        textHash: '0'.repeat(64),
      } as PrivacyPermissionChoice),
    ).rejects.toMatchObject({ code: 'privacy_text_changed' })
    await expect(
      owned.service.setPermission('P-AI', 1, {
        ...choice('P-AI'),
        vendorListVersion: 'unreviewed-vendor',
      } as PrivacyPermissionChoice),
    ).rejects.toMatchObject({ code: 'privacy_text_changed' })
    await expect(
      owned.service.setPermission('N-SERVICE', 1, {
        ...choice('N-SERVICE'),
        osPermission: 'granted',
      } as never),
    ).rejects.toMatchObject({ code: 'invalid_privacy' })
    expect((await owned.service.exportAudit()).events.permissions).toHaveLength(0)
  })

  test('withdrawal works despite obsolete disclosure versions and immediately disables the actual local service preference', async () => {
    const owned = await fixture()
    expect(await owned.service.setPermission('N-SERVICE', 1, choice('N-SERVICE'))).toMatchObject({
      localPreferenceEnabled: true,
      effectiveEnabled: true,
      nativePushEnabled: false,
      osPermission: 'unknown',
    })
    // Simulate a grant from a previous application disclosure registry; withdrawal needs no new acceptance.
    await handle.db
      .update(privacyPermissions)
      .set({ textVersion: 'n-service/local-it-IT/older-draft' })
      .where(eq(privacyPermissions.profileId, owned.profileId))
    expect(await owned.service.setPermission('N-SERVICE', 2, { action: 'revoked' })).toMatchObject({
      state: 'revoked',
      localPreferenceEnabled: false,
      revision: 3,
      reaskNotBefore: '2027-02-28T10:15:20.123Z',
    })
    expect((await readPrivacyPermission(handle.db, owned.profileId, 'N-SERVICE')).granted).toBe(
      false,
    )
    expect((await owned.service.exportAudit()).events.permissions[1]?.textVersion).toBe(
      'n-service/local-it-IT/older-draft',
    )
  })

  test('suppresses re-asking for six calendar months but allows an explicit user-initiated grant and never prompts unavailable features', async () => {
    const owned = await fixture()
    const denied = await owned.service.setPermission(
      'C-ANALYTICS',
      1,
      choice('C-ANALYTICS', 'denied'),
    )
    expect(privacyReaskNotBefore('2023-08-31T00:00:00.000Z')).toBe('2024-02-29T00:00:00.000Z')
    expect(mayPromptPrivacyPermission(denied, '2027-02-28T10:15:20.122Z', true)).toBe(false)
    expect(mayPromptPrivacyPermission(denied, '2027-02-28T10:15:20.123Z', true)).toBe(true)
    expect(mayPromptPrivacyPermission(denied, '2028-01-01T00:00:00.000Z', false)).toBe(false)
    expect(
      await owned.service.setPermission('C-ANALYTICS', 2, choice('C-ANALYTICS')),
    ).toMatchObject({ state: 'granted', revision: 3, reaskNotBefore: null })
    await expect(
      owned.service.setPermission('C-ANALYTICS', 2, { action: 'revoked' }),
    ).rejects.toMatchObject({ code: 'privacy_changed' })
  })

  test('immutable events cannot be edited/deleted while their parent exists; canonical source/profile erasure removes their metadata', async () => {
    const owned = await fixture()
    await owned.service.updateRulesOnly(1, true)
    await owned.service.updateTransaction(owned.transactionId, 1, { private: true, quiet: false })
    await owned.service.setPermission('N-SERVICE', 1, choice('N-SERVICE'))
    await expect(
      handle.db.update(profilePrivacyEvents).set({ occurredAt: baseNow }),
    ).rejects.toThrow()
    await expect(
      handle.db
        .delete(transactionPrivacyEvents)
        .where(eq(transactionPrivacyEvents.profileId, owned.profileId)),
    ).rejects.toThrow()
    await expect(
      handle.db
        .delete(privacyPermissionEvents)
        .where(eq(privacyPermissionEvents.profileId, owned.profileId)),
    ).rejects.toThrow()
    await handle.db
      .delete(schema.transactions)
      .where(eq(schema.transactions.id, owned.transactionId))
    expect(
      await handle.db
        .select()
        .from(transactionPrivacy)
        .where(eq(transactionPrivacy.profileId, owned.profileId)),
    ).toHaveLength(0)
    expect(
      await handle.db
        .select()
        .from(transactionPrivacyEvents)
        .where(eq(transactionPrivacyEvents.profileId, owned.profileId)),
    ).toHaveLength(0)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, owned.profileId))
    expect(
      await handle.db
        .select()
        .from(profilePrivacyEvents)
        .where(eq(profilePrivacyEvents.profileId, owned.profileId)),
    ).toHaveLength(0)
    expect(
      await handle.db
        .select()
        .from(privacyPermissions)
        .where(eq(privacyPermissions.profileId, owned.profileId)),
    ).toHaveLength(0)
    expect(
      await handle.db
        .select()
        .from(privacyPermissionEvents)
        .where(eq(privacyPermissionEvents.profileId, owned.profileId)),
    ).toHaveLength(0)
  })

  test('a failed audit insert rolls the preference back atomically', async () => {
    const owned = await fixture('privacy_audit_failure')
    await handle.db.execute(sql`CREATE OR REPLACE FUNCTION synthetic_privacy_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.transaction_id LIKE 'privacy_audit_failure_%' AND NEW.before_values->>'quiet' = 'false' AND NEW.after_values->>'quiet' = 'true' AND NEW.after_values->>'private' = 'true' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF;
      RETURN NEW; END; $$`)
    await handle.db.execute(
      sql`CREATE TRIGGER synthetic_privacy_audit_failure BEFORE INSERT ON transaction_privacy_events FOR EACH ROW EXECUTE FUNCTION synthetic_privacy_audit_failure()`,
    )
    try {
      await expect(
        owned.service.updateTransaction(owned.transactionId, 1, { quiet: true, private: true }),
      ).rejects.toThrow()
      expect(await owned.service.transaction(owned.transactionId)).toMatchObject({
        revision: 1,
        quiet: false,
        private: false,
      })
      expect((await owned.service.exportAudit()).events.transactions).toHaveLength(0)
    } finally {
      await handle.db.execute(
        sql`DROP TRIGGER synthetic_privacy_audit_failure ON transaction_privacy_events`,
      )
      await handle.db.execute(sql`DROP FUNCTION synthetic_privacy_audit_failure()`)
    }
  })

  test('HTTP routes enforce strict inputs, optimistic conflicts and profile-derived ownership despite query selectors', async () => {
    const owned = await fixture(),
      foreign = await fixture()
    const app = Fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.setErrorHandler((error, request, reply) => {
      const problem =
        error instanceof Problem
          ? error
          : new Problem(
              error.validation ? 400 : 500,
              'invalid_request',
              'Richiesta non disponibile.',
            )
      reply.code(problem.status).send({
        type: 'about:blank',
        title: 'Richiesta non disponibile',
        status: problem.status,
        code: problem.code,
        detail: problem.message,
        instance: request.url,
      })
    })
    registerPrivacyRoutes(app, () => owned.service)
    try {
      expect(
        (await app.inject({ url: `/v1/privacy/settings?profileId=${foreign.profileId}` })).json()
          .profileId,
      ).toBe(owned.profileId)
      expect(
        (await app.inject({ url: `/v1/transactions/${foreign.transactionId}/privacy` })).statusCode,
      ).toBe(404)
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: '/v1/privacy/settings',
            payload: { revision: 1, rulesOnly: true, profileId: foreign.profileId },
          })
        ).statusCode,
      ).toBe(400)
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: '/v1/privacy/settings',
            payload: { revision: 1, rulesOnly: true },
          })
        ).statusCode,
      ).toBe(200)
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: '/v1/privacy/settings',
            payload: { revision: 1, rulesOnly: false },
          })
        ).statusCode,
      ).toBe(409)
      const permission = await app.inject({
        method: 'PATCH',
        url: '/v1/privacy/permissions/N-SERVICE',
        payload: { revision: 1, ...choice('N-SERVICE') },
      })
      expect(permission.statusCode, permission.payload).toBe(200)
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: '/v1/privacy/permissions/N-SERVICE',
            payload: { revision: 2, action: 'revoked' },
          })
        ).statusCode,
      ).toBe(200)
    } finally {
      await app.close()
    }
  })
})
