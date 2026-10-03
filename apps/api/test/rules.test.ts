import { randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import type { RuleDefinition } from '@lilleri/domain'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createApp } from '../src/app.js'
import { RulesService, registerRulesRoutes } from '../src/rules.js'
import { DemoService } from '../src/service.js'

let handle: DatabaseHandle
const profiles: string[] = [],
  apps: Awaited<ReturnType<typeof createApp>>[] = []
const definition: RuleDefinition = {
  name: 'La mia spesa',
  conditions: { merchantKey: 'coop' },
  categoryId: 'food',
  priority: 10,
}
async function fixture() {
  const profileId = `rules_${randomUUID()}`
  profiles.push(profileId)
  const now = () => '2026-10-03T12:00:00.000Z',
    provider = new MockItalianProvider(),
    app = await createApp({ db: handle.db, demoMode: true, profileId, provider, seed: true, now })
  const service = new RulesService(handle.db, profileId, now),
    demo = new DemoService(handle.db, profileId, provider, now)
  if (!app.hasRoute({ method: 'GET', url: '/v1/rules' }))
    registerRulesRoutes(app, async () => service)
  apps.push(app)
  return { app, profileId, service, demo }
}
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
})
afterAll(async () => {
  for (const app of apps) await app.close()
  for (const id of profiles)
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, id))
  if (handle) await handle.close()
})
describe('profile-scoped explicit rule preview and commands', () => {
  test('draft creation requires preview and apply; never rewrites money; replay remains durable', async () => {
    const { service, demo } = await fixture(),
      before = await demo.data(),
      rule = await service.create(definition)
    expect(rule).toMatchObject({ enabled: false, revision: 1 })
    expect((await demo.data()).analysis.classifications).toEqual(before.analysis.classifications)
    const preview = await service.preview(rule.id)
    expect(preview.matchedTransactionIds.length).toBeGreaterThan(0)
    expect(preview.affectedTransactionIds).toEqual(preview.matchedTransactionIds)
    const applied = await service.apply(rule.id, rule.revision, preview.previewRevision)
    expect(applied).toMatchObject({ enabled: true, revision: 2 })
    expect((await demo.data()).transactions).toEqual(before.transactions)
    const classified = (await demo.data()).analysis.classifications
    for (const id of preview.affectedTransactionIds)
      expect(classified.find((item) => item.transactionId === id)).toMatchObject({
        categoryId: 'food',
        source: 'rule',
      })
    const [connection] = await handle.db
      .select()
      .from(schema.connections)
      .where(eq(schema.connections.profileId, rule.profileId))
    if (!connection) throw new Error('Fixture connection missing')
    await demo.sync(connection.id)
    expect(await new RulesService(handle.db, rule.profileId).list()).toEqual([applied])
    for (const id of preview.affectedTransactionIds)
      expect(
        (await demo.data()).analysis.classifications.find((item) => item.transactionId === id),
      ).toMatchObject({ categoryId: 'food', source: 'rule' })
    const [event] = await handle.db
      .select()
      .from(schema.ruleEvents)
      .where(and(eq(schema.ruleEvents.ruleId, rule.id), eq(schema.ruleEvents.revision, 2)))
    expect(event?.affectedTransactionIds).toEqual(preview.affectedTransactionIds)
  })
  test('preview excludes sticky feedback and explains locked transactions', async () => {
    const { service, demo } = await fixture(),
      initial = await demo.data(),
      transaction = initial.transactions.find((item) => item.merchantKey === 'coop')
    if (!transaction) throw new Error('Coop fixture missing')
    await demo.correct(transaction.id, 'health', 'once', transaction.revision)
    const rule = await service.create(definition),
      preview = await service.preview(rule.id)
    expect(preview.lockedTransactionIds).toContain(transaction.id)
    expect(preview.affectedTransactionIds).not.toContain(transaction.id)
    await service.apply(rule.id, rule.revision, preview.previewRevision)
    expect(
      (await demo.data()).transactions.find((item) => item.id === transaction.id)?.amount,
    ).toEqual(transaction.amount)
    expect(
      (await demo.data()).analysis.classifications.find(
        (item) => item.transactionId === transaction.id,
      ),
    ).toMatchObject({ categoryId: 'health', source: 'user' })
  })
  test('source revision and feedback changes invalidate preview atomically', async () => {
    const { service, demo, profileId } = await fixture(),
      rule = await service.create(definition),
      preview = await service.preview(rule.id),
      transaction = (await demo.data()).transactions[0]
    if (!transaction) throw new Error('Fixture missing')
    await handle.db
      .update(schema.transactions)
      .set({ revision: transaction.revision + 1 })
      .where(
        and(
          eq(schema.transactions.profileId, profileId),
          eq(schema.transactions.id, transaction.id),
        ),
      )
    await expect(
      service.apply(rule.id, rule.revision, preview.previewRevision),
    ).rejects.toMatchObject({ status: 409, code: 'rule_changed' })
    expect((await service.list())[0]).toMatchObject({ revision: 1, enabled: false })
    expect(
      await handle.db.select().from(schema.ruleEvents).where(eq(schema.ruleEvents.ruleId, rule.id)),
    ).toHaveLength(1)
    const refreshed = await service.preview(rule.id),
      current = (await demo.data()).transactions.find((item) => item.id === transaction.id)
    if (!current) throw new Error('Fixture missing')
    await demo.correct(current.id, 'shopping', 'once', current.revision)
    await expect(
      service.apply(rule.id, rule.revision, refreshed.previewRevision),
    ).rejects.toMatchObject({ status: 409 })
  })
  test('concurrent commands accept one revision; stale edit/apply writes no events', async () => {
    const { service } = await fixture(),
      rule = await service.create(definition)
    const outcomes = await Promise.allSettled([
      service.edit(rule.id, 1, { ...definition, name: 'First' }),
      service.edit(rule.id, 1, { ...definition, name: 'Second' }),
    ])
    expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter((item) => item.status === 'rejected')).toHaveLength(1)
    const current = (await service.list())[0]
    expect(current?.revision).toBe(2)
    await expect(service.apply(rule.id, 1, '0'.repeat(64))).rejects.toMatchObject({ status: 409 })
    expect(
      await handle.db.select().from(schema.ruleEvents).where(eq(schema.ruleEvents.ruleId, rule.id)),
    ).toHaveLength(2)
  })
  test('disable/archive and undo preserve history; restoration requires fresh preview to activate', async () => {
    const { service } = await fixture(),
      rule = await service.create(definition),
      preview = await service.preview(rule.id),
      active = await service.apply(rule.id, 1, preview.previewRevision)
    const disabled = await service.state(rule.id, active.revision, 'disable')
    expect(disabled).toMatchObject({ enabled: false, revision: 3 })
    expect(await service.state(rule.id, disabled.revision, 'disable')).toEqual(disabled)
    const archived = await service.state(rule.id, disabled.revision, 'archive')
    await expect(service.preview(rule.id)).rejects.toMatchObject({
      status: 409,
      code: 'rule_archived',
    })
    const restored = await service.state(rule.id, archived.revision, 'undo')
    expect(restored).toMatchObject({ archived: false, enabled: false, revision: 5 })
    const currentPreview = await service.preview(rule.id)
    expect(
      (await service.apply(rule.id, restored.revision, currentPreview.previewRevision)).enabled,
    ).toBe(true)
  })
  test('foreign profile IDs and account conditions return 404 without cross-profile mutation', async () => {
    const first = await fixture(),
      second = await fixture(),
      rule = await first.service.create(definition),
      foreignAccount = (await second.demo.data()).accounts[0]
    for (const command of [
      () => second.service.preview(rule.id),
      () => second.service.edit(rule.id, 1, definition),
      () => second.service.state(rule.id, 1, 'archive'),
      () => second.service.apply(rule.id, 1, '0'.repeat(64)),
    ])
      await expect(command()).rejects.toMatchObject({ status: 404 })
    if (!foreignAccount) throw new Error('Fixture missing')
    await expect(
      first.service.create({ ...definition, conditions: { accountId: foreignAccount.id } }),
    ).rejects.toMatchObject({ status: 404 })
    expect(await first.service.list()).toHaveLength(1)
    expect(await second.service.list()).toHaveLength(0)
  })
  test('equal-priority overlap preview includes conflict changes and a visible inbox review item', async () => {
    const { service, demo } = await fixture()
    const first = await service.create(definition)
    const second = await service.create({
      ...definition,
      name: 'Other category',
      categoryId: 'shopping',
    })
    const [winner, candidate] = [first, second].sort((a, b) => a.id.localeCompare(b.id))
    if (!winner || !candidate) throw new Error('Expected two draft rules')
    const firstPreview = await service.preview(winner.id)
    await service.apply(winner.id, winner.revision, firstPreview.previewRevision)
    const preview = await service.preview(candidate.id)
    expect(preview.affectedTransactionIds).toEqual(preview.matchedTransactionIds)
    await service.apply(candidate.id, candidate.revision, preview.previewRevision)
    const result = (await demo.data()).analysis
    for (const id of preview.affectedTransactionIds) {
      expect(result.classifications.find((item) => item.transactionId === id)).toMatchObject({
        needsReview: true,
        categoryId: winner.categoryId,
      })
    }
    expect(
      result.reviewItems.some(
        (item) =>
          item.type === 'classification' &&
          item.transactionIds.some((id) => preview.affectedTransactionIds.includes(id)),
      ),
    ).toBe(true)
  })
  test('HTTP validates bounded conditions, canonical categories, revisions and ambiguous intermediaries', async () => {
    const { app } = await fixture()
    for (const conditions of [
      {},
      { merchantKey: 'paypal' },
      { amount: { currency: 'EUR', minMinor: '1.1' } },
      { amount: { currency: 'EUR', minMinor: '1.1', maxMinor: '2.2' } },
      { amount: { currency: 'EUR', minMinor: '20', maxMinor: '10' } },
      { description: { operator: 'regex', value: '.*' } },
      { kind: 'erase' },
    ]) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/rules',
        payload: { ...definition, conditions },
      })
      expect(response.statusCode, response.payload).toBe(400)
    }
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/rules',
          payload: { ...definition, categoryId: 'arbitrary' },
        })
      ).statusCode,
    ).toBe(400)
    const created = await app.inject({ method: 'POST', url: '/v1/rules', payload: definition })
    expect(created.statusCode, created.payload).toBe(201)
    const rule = created.json(),
      preview = await app.inject({
        method: 'POST',
        url: `/v1/rules/${rule.id}/preview`,
        payload: {},
      })
    expect(preview.statusCode, preview.payload).toBe(200)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/v1/rules/${rule.id}/apply`,
          payload: { revision: 1, previewRevision: 'bad' },
        })
      ).statusCode,
    ).toBe(400)
    const applied = await app.inject({
      method: 'POST',
      url: `/v1/rules/${rule.id}/apply`,
      payload: { revision: rule.revision, previewRevision: preview.json().previewRevision },
    })
    expect(applied.statusCode, applied.payload).toBe(200)
  })
})
