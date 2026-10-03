import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Database, type DatabaseHandle, openDatabase, schema } from '@lilleri/database'
import type { OwnedCategoryValues } from '@lilleri/domain'
import { and, eq, sql } from 'drizzle-orm'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { z } from 'zod'
import { ProfileEncryption } from '../src/encryption.js'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import {
  MerchantTaxonomyService,
  registerMerchantTaxonomyRoutes,
} from '../src/merchant-taxonomy.js'
import {
  merchantTaxonomyExportDtoSchema,
  validateMerchantTaxonomyExport,
} from '../src/merchant-taxonomy-export.js'
import {
  categoryAssignmentEvents,
  categoryAssignments,
  merchantAliasEvents,
  merchantAliases,
  ownedCategories,
  ownedCategoryEvents,
} from '../src/merchant-taxonomy-schema.js'
import { PrivacyService } from '../src/privacy.js'
import { Problem } from '../src/problem.js'

let handle: DatabaseHandle, encryption: ProfileEncryption, vault: string
const profiles: string[] = []
const baseNow = '2026-10-03T12:00:00.000Z'
const category = (
  label = 'La mia spesa',
  canonicalCode = 'FOOD_GROCERIES',
): OwnedCategoryValues => ({
  label,
  canonicalCode,
  icon: 'basket',
  parentId: null,
  position: 0,
  hidden: false,
})
beforeAll(async () => {
  const url = process.env.PG_TEST_DATABASE_URL
  handle = await openDatabase(url ? { driver: 'postgres', url } : { driver: 'pglite' })
  vault = await mkdtemp(join(tmpdir(), 'lilleri-merchant-vault-'))
  encryption = new ProfileEncryption(
    handle.db,
    await createLocalSyntheticKeyManagement({ directory: vault, mode: 'demo' }),
    () => baseNow,
  )
})
afterAll(async () => {
  if (handle) {
    for (const profileId of profiles)
      await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, profileId))
    await handle.close()
  }
  if (vault) await rm(vault, { recursive: true, force: true })
})
async function fixture() {
  const profileId = `recognition_${randomUUID()}`,
    connectionId = `recognition_connection_${randomUUID()}`,
    accountId = `recognition_account_${randomUUID()}`
  const transactionIds = [
    `recognition_tx_${randomUUID()}`,
    `recognition_tx_${randomUUID()}`,
    `recognition_health_${randomUUID()}`,
  ]
  profiles.push(profileId)
  await handle.db.insert(schema.profiles).values({
    id: profileId,
    name: 'Synthetic recognition',
    timezone: 'Europe/Rome',
    createdAt: baseNow,
  })
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
    name: 'Synthetic',
    institutionName: 'Synthetic',
    kind: 'current',
    balanceMinor: 10000n,
    currency: 'EUR',
    balanceUpdatedAt: baseNow,
  })
  for (const [index, transactionId] of transactionIds.entries())
    await handle.db.insert(schema.transactions).values(
      await encryption.encryptTransactionRow(handle.db, {
        id: transactionId,
        profileId,
        connectionId,
        accountId,
        providerId: 'mock-italian',
        providerTransactionId: transactionId,
        revision: 1,
        source: 'bank',
        status: 'booked',
        amountMinor: -1200n - BigInt(index),
        currency: 'EUR',
        description: index === 2 ? 'Farmacia sintetica' : 'Abbonamento sintetico',
        merchantName: index === 2 ? 'Farmacia' : 'Netflix',
        merchantKey: index === 2 ? 'farmacia' : 'netflix',
        bookedOn: '2026-10-02',
        observedAt: baseNow,
        kind: 'expense',
        contentHash: String(index + 1).repeat(64),
      }),
    )
  let clock = baseNow
  const now = () => clock
  const service = new MerchantTaxonomyService(handle.db, profileId, now, encryption)
  const scoped = <T>(work: (service: MerchantTaxonomyService, db: Database) => Promise<T>) =>
    handle.withProfile(profileId, (db) =>
      work(new MerchantTaxonomyService(db, profileId, now, encryption), db),
    )
  return {
    profileId,
    accountId,
    transactionIds,
    service,
    scoped,
    now,
    setNow: (value: string) => {
      clock = value
    },
  }
}
async function facts(profileId: string) {
  return {
    transactions: await handle.db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, profileId)),
    accounts: await handle.db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.profileId, profileId)),
    feedback: await handle.db
      .select()
      .from(schema.feedback)
      .where(eq(schema.feedback.profileId, profileId)),
    rules: await handle.db
      .select()
      .from(schema.classificationRules)
      .where(eq(schema.classificationRules.profileId, profileId)),
  }
}
async function createAlias(f: Awaited<ReturnType<typeof fixture>>, name = 'Il mio abbonamento') {
  const tx = f.transactionIds[0]
  if (!tx) throw new Error('Missing fixture transaction')
  const preview = await f.service.previewAlias(tx, name)
  return f.service.applyAlias(tx, name, preview.previewRevision)
}

describe('persisted private recognition choices and versioned taxonomy', () => {
  test('full ownership DTO preserves renamed/merged/undone historical labels and quiet evidence while converting to JSON Schema', async () => {
    const f = await fixture(),
      alias = await createAlias(f),
      tx = f.transactionIds[0] ?? ''
    const source = await f.service.createCategory(category('Etichetta storica'))
    const target = await f.service.createCategory(category('Etichetta successiva'))
    await f.service.assignCategory(tx, source.id, 1)
    const renamed = await f.service.updateCategory(
      source.id,
      source.revision,
      category('Nome corrente'),
    )
    const preview = await f.service.previewMigration(source.id, target.id)
    const merged = await f.service.applyMigration(
      source.id,
      target.id,
      renamed.revision,
      preview.previewRevision,
    )
    await f.service.undoCategory(source.id, merged.revision)
    await new PrivacyService(handle.db, f.profileId, f.now).updateTransaction(tx, 1, {
      quiet: true,
      private: true,
    })
    const data = await facts(f.profileId)
    const snapshot = {
      profile: { id: f.profileId },
      exportedAt: '2026-10-03T13:00:00.000Z',
      accounts: data.accounts,
      transactions: data.transactions,
      merchantTaxonomy: await f.service.exportAudit(),
    }
    expect(() => validateMerchantTaxonomyExport(snapshot)).not.toThrow()
    expect(
      merchantTaxonomyExportDtoSchema.parse(snapshot.merchantTaxonomy).assignments[0]
        ?.labelSnapshot,
    ).toBe('Etichetta storica')
    expect(snapshot.merchantTaxonomy.aliases[0]?.merchantId).toBe(alias.merchantId)
    expect((await f.service.list()).assignments).toEqual([])
    const portable = z.toJSONSchema(merchantTaxonomyExportDtoSchema, { target: 'draft-2020-12' })
    expect(portable).toHaveProperty('properties.aliases')
    expect(JSON.stringify(snapshot.merchantTaxonomy)).not.toContain('_lilleriEncrypted')
  })
  test('ownership rejects foreign/lost/invented revisions, invalid account references, future clocks and historical label tampering', async () => {
    const f = await fixture(),
      tx = f.transactionIds[0] ?? ''
    await createAlias(f)
    const owned = await f.service.createCategory(category())
    await f.service.assignCategory(tx, owned.id, 1)
    const data = await facts(f.profileId)
    const snapshot = {
      profile: { id: f.profileId },
      exportedAt: '2026-10-03T13:00:00.000Z',
      accounts: data.accounts,
      transactions: data.transactions,
      merchantTaxonomy: merchantTaxonomyExportDtoSchema.parse(await f.service.exportAudit()),
    }
    expect(() => validateMerchantTaxonomyExport(snapshot)).not.toThrow()
    const copied = () =>
      JSON.parse(
        JSON.stringify(snapshot, (_key, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
      ) as typeof snapshot
    const foreign = copied()
    if (foreign.merchantTaxonomy.aliases[0])
      foreign.merchantTaxonomy.aliases[0].profileId = 'foreign'
    const missing = copied()
    missing.merchantTaxonomy.aliasEvents = []
    const invented = copied()
    if (invented.merchantTaxonomy.aliasEvents[0])
      invented.merchantTaxonomy.aliasEvents[0].revision = 3
    const account = copied()
    account.accounts = []
    const future = copied()
    if (future.merchantTaxonomy.categoryEvents[0])
      future.merchantTaxonomy.categoryEvents[0].occurredAt = '2026-10-04T12:00:00.000Z'
    const history = copied()
    if (history.merchantTaxonomy.assignmentEvents[0])
      history.merchantTaxonomy.assignmentEvents[0].snapshot.after.labelSnapshot =
        'Etichetta inventata'
    for (const invalid of [foreign, missing, invented, account, future, history])
      expect(() => validateMerchantTaxonomyExport(invalid)).toThrow(
        'Invalid owned recognition export',
      )
  })
  test('read-only owned proposals expose stable dictionary identity and suppress health evidence without writes', async () => {
    const f = await fixture(),
      before = await facts(f.profileId)
    const view = await f.scoped((service) => service.list())
    expect(view.aliases).toEqual([])
    expect(view.categories).toEqual([])
    expect(view.resolutions).toHaveLength(2)
    expect(view.resolutions.every((value) => value.merchantId === 'merchant:netflix')).toBe(true)
    expect(JSON.stringify(view)).not.toContain(f.transactionIds[2])
    expect(await facts(f.profileId)).toEqual(before)
  })
  test('preview writes no alias/key/audit; apply is encrypted, scoped and source/money preserving', async () => {
    const f = await fixture(),
      before = await facts(f.profileId),
      tx = f.transactionIds[0] ?? ''
    const preview = await f.scoped((service) => service.previewAlias(tx, 'La mia scelta'))
    expect(preview.affectedTransactionIds).toEqual(f.transactionIds.slice(0, 2).sort())
    expect(
      await handle.db
        .select()
        .from(merchantAliases)
        .where(eq(merchantAliases.profileId, f.profileId)),
    ).toEqual([])
    const alias = await f.scoped((service) =>
      service.applyAlias(tx, 'La mia scelta', preview.previewRevision),
    )
    expect(alias).toMatchObject({ revision: 1, displayName: 'La mia scelta', archived: false })
    const rows = await handle.db
      .select()
      .from(merchantAliases)
      .where(eq(merchantAliases.profileId, f.profileId))
    expect(rows[0]?.displayName).toMatch(/^lilleri:v1:/u)
    expect(rows[0]?.normalizedKey).toMatch(/^lilleri:v1:/u)
    const audit = await handle.db
      .select()
      .from(merchantAliasEvents)
      .where(eq(merchantAliasEvents.profileId, f.profileId))
    expect(JSON.stringify(audit)).not.toContain('La mia scelta')
    expect(await facts(f.profileId)).toEqual(before)
    expect((await f.service.list()).resolutions.every((value) => value.source === 'user')).toBe(
      true,
    )
  })
  test('an advancing clock is captured once for each alias/category snapshot and immutable event', async () => {
    const f = await fixture()
    let tick = 0
    const clock = () => new Date(Date.parse(baseNow) + tick++).toISOString()
    const service = new MerchantTaxonomyService(handle.db, f.profileId, clock, encryption)
    const preview = await service.previewAlias(f.transactionIds[0] ?? '', 'Scelta temporale')
    const alias = await service.applyAlias(
      f.transactionIds[0] ?? '',
      'Scelta temporale',
      preview.previewRevision,
    )
    const owned = await service.createCategory(category())
    const audit = await service.exportAudit()
    expect(audit.aliasEvents[0]?.occurredAt).toBe(alias.updatedAt)
    expect(audit.categoryEvents[0]?.occurredAt).toBe(owned.updatedAt)
    expect(tick).toBe(2)
  })
  test('one concurrent alias apply wins and stale revision/ledger preview cannot silently overwrite it', async () => {
    const f = await fixture(),
      tx = f.transactionIds[0] ?? ''
    const preview = await f.service.previewAlias(tx, 'Scelta concorrente')
    const results = await Promise.allSettled([
      f.service.applyAlias(tx, 'Scelta concorrente', preview.previewRevision),
      f.service.applyAlias(tx, 'Scelta concorrente', preview.previewRevision),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1)
    const alias = (await f.service.aliases())[0]
    if (!alias) throw new Error('Missing alias')
    const edit = await f.service.previewAlias(tx, 'Nuovo nome', alias.id)
    await handle.db
      .update(schema.transactions)
      .set({ revision: 2 })
      .where(eq(schema.transactions.id, tx))
    await expect(
      f.service.applyAlias(tx, 'Nuovo nome', edit.previewRevision, alias.id, alias.revision),
    ).rejects.toMatchObject({ code: 'recognition_changed' })
    expect((await f.service.aliases())[0]?.displayName).toBe('Scelta concorrente')
  })
  test('quiet flag ABA invalidates a prepared merchant proposal even when the final visible set matches', async () => {
    const f = await fixture(),
      tx = f.transactionIds[0] ?? '',
      privacy = new PrivacyService(handle.db, f.profileId, f.now)
    const preview = await f.service.previewAlias(tx, 'Prima della privacy')
    await privacy.updateTransaction(tx, 1, { quiet: true, private: false })
    await privacy.updateTransaction(tx, 2, { quiet: false, private: false })
    await expect(
      f.service.applyAlias(tx, 'Prima della privacy', preview.previewRevision),
    ).rejects.toMatchObject({ code: 'recognition_changed' })
    expect(await f.service.aliases()).toEqual([])
  })
  test('a backwards injected clock rejects mutations atomically without corrupting historical export ordering', async () => {
    const f = await fixture(),
      alias = await createAlias(f),
      tx = f.transactionIds[0] ?? ''
    const owned = await f.service.createCategory(category('Prima del clock', 'DIGITAL_STREAMING'))
    const target = await f.service.createCategory(
      category('Destinazione clock', 'DIGITAL_STREAMING'),
    )
    const assigned = await f.service.assignCategory(tx, owned.id, 1)
    const aliasPreview = await f.service.previewAlias(tx, 'Clock precedente', alias.id)
    const migration = await f.service.previewMigration(owned.id, target.id)
    const before = await f.service.exportAudit()
    f.setNow('2026-10-02T12:00:00.000Z')
    await expect(
      f.service.applyAlias(
        tx,
        'Clock precedente',
        aliasPreview.previewRevision,
        alias.id,
        alias.revision,
      ),
    ).rejects.toMatchObject({ code: 'recognition_changed' })
    await expect(f.service.changeAlias(alias.id, alias.revision, 'archive')).rejects.toMatchObject({
      code: 'recognition_changed',
    })
    await expect(
      f.service.updateCategory(
        owned.id,
        owned.revision,
        category('Clock precedente', 'DIGITAL_STREAMING'),
      ),
    ).rejects.toMatchObject({ code: 'recognition_changed' })
    await expect(f.service.assignCategory(tx, owned.id, assigned.revision)).rejects.toMatchObject({
      code: 'recognition_changed',
    })
    await expect(
      f.service.applyMigration(owned.id, target.id, owned.revision, migration.previewRevision),
    ).rejects.toMatchObject({ code: 'recognition_changed' })
    expect(await f.service.exportAudit()).toEqual(before)
  })
  test('alias rename/archive/undo preserves stable identity and the independent immutable revision history', async () => {
    const f = await fixture(),
      alias = await createAlias(f),
      tx = f.transactionIds[0] ?? ''
    const preview = await f.service.previewAlias(tx, 'Nome nuovo', alias.id)
    const edited = await f.service.applyAlias(
      tx,
      'Nome nuovo',
      preview.previewRevision,
      alias.id,
      alias.revision,
    )
    const undo = await f.service.changeAlias(alias.id, edited.revision, 'undo')
    expect(undo.displayName).toBe(alias.displayName)
    expect(undo.merchantId).toBe(alias.merchantId)
    const archived = await f.service.changeAlias(alias.id, undo.revision, 'archive')
    expect((await f.service.list()).resolutions[0]?.source).toBe('dictionary')
    const restored = await f.service.changeAlias(alias.id, archived.revision, 'undo')
    expect(restored.archived).toBe(false)
    expect(restored.merchantId).toBe(alias.merchantId)
    expect((await f.service.exportAudit()).aliasEvents.map((event) => event.revision)).toEqual([
      1, 2, 3, 4, 5,
    ])
  })
  test('rules-only suppresses dictionary proposals; explicit own aliases still resolve while quiet/private never produce aliases', async () => {
    const f = await fixture(),
      privacy = new PrivacyService(handle.db, f.profileId, f.now),
      alias = await createAlias(f)
    await privacy.updateRulesOnly(1, true)
    expect((await f.service.list()).resolutions.every((value) => value.source === 'user')).toBe(
      true,
    )
    await f.service.changeAlias(alias.id, alias.revision, 'archive')
    expect((await f.service.list()).resolutions.every((value) => value.status === 'unknown')).toBe(
      true,
    )
    for (const tx of f.transactionIds.slice(0, 2))
      await privacy.updateTransaction(tx, 1, { quiet: false, private: true })
    expect((await f.service.list()).resolutions).toEqual([])
    expect((await f.service.list()).aliases).toEqual([])
    await expect(
      f.service.previewAlias(f.transactionIds[0] ?? '', 'Nome riservato'),
    ).rejects.toMatchObject({ code: 'recognition_unavailable' })
  })
  test('category create/rename/nest/reorder/icon persist; invalid cycles and foreign parents fail', async () => {
    const f = await fixture(),
      other = await fixture()
    const root = await f.scoped((service) => service.createCategory(category('La mia categoria')))
    const child = await f.service.createCategory({
      ...category('Figlia'),
      parentId: root.id,
      position: 4,
    })
    const edited = await f.service.updateCategory(root.id, root.revision, {
      ...category('Nome nuovo'),
      icon: 'tag',
      position: 7,
    })
    expect(edited).toMatchObject({ label: 'Nome nuovo', icon: 'tag', position: 7, revision: 2 })
    await expect(
      f.service.updateCategory(root.id, edited.revision, { ...category(), parentId: child.id }),
    ).rejects.toMatchObject({ code: 'category_cycle' })
    const foreign = await other.service.createCategory(category())
    await expect(
      f.service.createCategory({ ...category(), parentId: foreign.id }),
    ).rejects.toMatchObject({ status: 404 })
    expect((await f.service.categories()).find((value) => value.id === root.id)?.label).toBe(
      'Nome nuovo',
    )
  })
  test('assignment first write bumps implicit revision and preserves label history after category rename', async () => {
    const f = await fixture(),
      owned = await f.service.createCategory(category()),
      tx = f.transactionIds[0] ?? '',
      before = await facts(f.profileId)
    const results = await Promise.allSettled([
      f.service.assignCategory(tx, owned.id, 1),
      f.service.assignCategory(tx, owned.id, 1),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const assignment = (await f.service.assignments())[0]
    expect(assignment).toMatchObject({
      revision: 2,
      labelSnapshot: 'La mia spesa',
      canonicalCode: 'FOOD_GROCERIES',
    })
    await f.service.updateCategory(owned.id, owned.revision, {
      ...category(),
      label: 'La nuova etichetta',
    })
    expect((await f.service.assignments())[0]?.labelSnapshot).toBe('La mia spesa')
    expect(await facts(f.profileId)).toEqual(before)
    const raw = await handle.db
      .select()
      .from(categoryAssignments)
      .where(eq(categoryAssignments.profileId, f.profileId))
    expect(JSON.stringify(raw)).not.toContain('La mia spesa')
  })
  test('hide/unhide is reversible; a quiet canonical leaf stays excluded without rewriting owned ledger', async () => {
    const f = await fixture(),
      owned = await f.service.createCategory(category()),
      tx = f.transactionIds[0] ?? '',
      before = await facts(f.profileId)
    await f.service.assignCategory(tx, owned.id, 1)
    const hidden = await f.service.updateCategory(owned.id, 1, { ...category(), hidden: true })
    expect((await f.service.list()).resolutions.some((value) => value.transactionId === tx)).toBe(
      false,
    )
    await f.service.updateCategory(owned.id, hidden.revision, { ...category(), hidden: false })
    expect((await f.service.list()).resolutions.some((value) => value.transactionId === tx)).toBe(
      true,
    )
    const quiet = await f.service.createCategory(
      category('Categoria riservata', 'GIVING_DONATIONS'),
    )
    await f.service.assignCategory(tx, quiet.id, 2)
    expect((await f.service.list()).resolutions.some((value) => value.transactionId === tx)).toBe(
      false,
    )
    expect(await facts(f.profileId)).toEqual(before)
    expect((await f.service.exportAudit()).assignments[0]?.quiet).toBe(true)
  })
  test('used category requires previewed migration; merge changes only assignments and undo preserves historical labels', async () => {
    const f = await fixture(),
      source = await f.service.createCategory(category('Storica')),
      target = await f.service.createCategory(category('Destinazione')),
      tx = f.transactionIds[0] ?? '',
      before = await facts(f.profileId)
    const original = await f.service.assignCategory(tx, source.id, 1)
    await expect(f.service.previewMigration(source.id, null)).rejects.toMatchObject({
      code: 'category_migration_required',
    })
    await expect(
      f.service.updateCategory(
        source.id,
        source.revision,
        category('Cambio senso', 'SHOPPING_GENERAL'),
      ),
    ).rejects.toMatchObject({ code: 'category_migration_required' })
    const preview = await f.service.previewMigration(source.id, target.id)
    expect(preview.affectedTransactionIds).toEqual([tx])
    const merged = await f.scoped((service) =>
      service.applyMigration(source.id, target.id, source.revision, preview.previewRevision),
    )
    expect(merged.archived).toBe(true)
    expect((await f.service.assignments())[0]).toMatchObject({
      categoryId: target.id,
      labelSnapshot: 'Destinazione',
      revision: 3,
    })
    const restored = await f.service.undoCategory(source.id, merged.revision)
    expect(restored.archived).toBe(false)
    expect((await f.service.assignments())[0]).toMatchObject({
      categoryId: source.id,
      labelSnapshot: original.labelSnapshot,
      revision: 4,
    })
    expect(await facts(f.profileId)).toEqual(before)
    expect((await f.service.exportAudit()).assignmentEvents).toHaveLength(3)
  })
  test('migration preview hides private counts; merging a hidden category cannot expose the old liability', async () => {
    const f = await fixture(),
      source = await f.service.createCategory({ ...category('Nascosta'), hidden: true }),
      target = await f.service.createCategory(category('Visibile')),
      tx = f.transactionIds[0] ?? ''
    await f.service.assignCategory(tx, source.id, 1)
    const preview = await f.service.previewMigration(source.id, target.id)
    expect(preview.affectedTransactionIds).toEqual([])
    await f.service.applyMigration(source.id, target.id, source.revision, preview.previewRevision)
    expect((await f.service.list()).resolutions.some((value) => value.transactionId === tx)).toBe(
      false,
    )
    expect((await f.service.exportAudit()).assignments[0]?.quiet).toBe(true)
  })
  test('a stale target revision or later reassignment invalidates merge and undo with no implicit replay', async () => {
    const f = await fixture(),
      source = await f.service.createCategory(category('Origine')),
      target = await f.service.createCategory(category('Destinazione')),
      tx = f.transactionIds[0] ?? ''
    await f.service.assignCategory(tx, source.id, 1)
    const stale = await f.service.previewMigration(source.id, target.id)
    await f.service.updateCategory(target.id, target.revision, category('Destinazione aggiornata'))
    await expect(
      f.service.applyMigration(source.id, target.id, source.revision, stale.previewRevision),
    ).rejects.toMatchObject({ code: 'recognition_changed' })
    const fresh = await f.service.previewMigration(source.id, target.id)
    const merged = await f.service.applyMigration(
      source.id,
      target.id,
      source.revision,
      fresh.previewRevision,
    )
    await f.service.assignCategory(tx, target.id, 3)
    await expect(f.service.undoCategory(source.id, merged.revision)).rejects.toMatchObject({
      code: 'recognition_changed',
    })
    expect((await f.service.categories()).find((value) => value.id === source.id)?.archived).toBe(
      true,
    )
  })
  test('30-day undo refuses expired/time-reversed commands and incompatible flow migration', async () => {
    const f = await fixture(),
      source = await f.service.createCategory(category()),
      income = await f.service.createCategory(category('Entrate', 'INCOME_OTHER'))
    await expect(f.service.previewMigration(source.id, income.id)).rejects.toMatchObject({
      code: 'category_flow_conflict',
    })
    const edited = await f.service.updateCategory(source.id, source.revision, category('Rinomina'))
    f.setNow('2026-11-03T12:00:00.000Z')
    await expect(f.service.undoCategory(source.id, edited.revision)).rejects.toMatchObject({
      code: 'category_undo_expired',
    })
    f.setNow('2026-10-02T12:00:00.000Z')
    await expect(f.service.undoCategory(source.id, edited.revision)).rejects.toMatchObject({
      code: 'category_undo_expired',
    })
  })
  test('failed audit insert rolls alias state back and never changes original financial facts', async () => {
    const f = await fixture(),
      tx = f.transactionIds[0] ?? '',
      before = await facts(f.profileId)
    await handle.db.execute(
      sql`CREATE OR REPLACE FUNCTION recognition_test_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.profile_id=${sql.raw(`'${f.profileId}'`)} THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END; $$`,
    )
    await handle.db.execute(
      sql`CREATE TRIGGER recognition_test_fault BEFORE INSERT ON merchant_alias_events FOR EACH ROW EXECUTE FUNCTION recognition_test_fault()`,
    )
    try {
      const preview = await f.service.previewAlias(tx, 'Rollback')
      await expect(f.service.applyAlias(tx, 'Rollback', preview.previewRevision)).rejects.toThrow()
      expect(await f.service.aliases()).toEqual([])
      expect(await facts(f.profileId)).toEqual(before)
    } finally {
      await handle.db.execute(sql`DROP TRIGGER recognition_test_fault ON merchant_alias_events`)
      await handle.db.execute(sql`DROP FUNCTION recognition_test_fault()`)
    }
  })
  test('direct audit mutation, foreign references and missing WHERE reads are stopped by SQL isolation', async () => {
    const one = await fixture(),
      two = await fixture(),
      alias = await createAlias(one)
    await createAlias(two)
    const owned = await one.service.createCategory(category()),
      foreign = await two.service.createCategory(category())
    await one.service.assignCategory(one.transactionIds[0] ?? '', owned.id, 1)
    await expect(
      one.service.assignCategory(two.transactionIds[0] ?? '', owned.id, 1),
    ).rejects.toMatchObject({ status: 404 })
    await expect(
      one.service.assignCategory(one.transactionIds[1] ?? '', foreign.id, 1),
    ).rejects.toMatchObject({ status: 404 })
    await one.scoped(async (_service, db) => {
      const values = await db.select().from(merchantAliases)
      expect(values).toHaveLength(1)
      expect(values[0]?.profileId).toBe(one.profileId)
    })
    await expect(
      handle.db.delete(merchantAliasEvents).where(eq(merchantAliasEvents.aliasId, alias.id)),
    ).rejects.toThrow()
    await expect(
      handle.db
        .update(ownedCategoryEvents)
        .set({ occurredAt: 'changed' })
        .where(eq(ownedCategoryEvents.profileId, one.profileId)),
    ).rejects.toThrow()
    await expect(
      handle.db
        .delete(categoryAssignmentEvents)
        .where(eq(categoryAssignmentEvents.profileId, one.profileId)),
    ).rejects.toThrow()
    expect((await one.service.exportAudit()).aliases).toHaveLength(1)
  })
  test('physical transaction/profile erasure removes exact dependent history; other profiles stay intact', async () => {
    const one = await fixture(),
      two = await fixture(),
      owned = await one.service.createCategory(category()),
      tx = one.transactionIds[0] ?? ''
    await createAlias(one)
    await createAlias(two)
    await one.service.assignCategory(tx, owned.id, 1)
    await handle.db
      .delete(schema.transactions)
      .where(and(eq(schema.transactions.profileId, one.profileId), eq(schema.transactions.id, tx)))
    expect(await one.service.assignments()).toEqual([])
    expect((await one.service.exportAudit()).assignmentEvents).toEqual([])
    await handle.db.delete(schema.profiles).where(eq(schema.profiles.id, one.profileId))
    for (const table of [
      merchantAliases,
      merchantAliasEvents,
      ownedCategories,
      ownedCategoryEvents,
      categoryAssignments,
      categoryAssignmentEvents,
    ])
      expect(
        await handle.db.select().from(table).where(eq(table.profileId, one.profileId)),
      ).toEqual([])
    expect((await two.service.exportAudit()).aliases).toHaveLength(1)
  })
  test('actual registered routes reject extra selectors and stale commands while returning persisted typed DTOs', async () => {
    const f = await fixture(),
      app = Fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.setErrorHandler((error, _request, reply) =>
      reply
        .code(error instanceof Problem ? error.status : error.validation ? 400 : 500)
        .send({ code: error instanceof Problem ? error.code : 'invalid_request' }),
    )
    registerMerchantTaxonomyRoutes(app, () => f.service)
    try {
      const body = { transactionId: f.transactionIds[0], displayName: 'Scelta HTTP' }
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/merchants/preview',
            payload: { ...body, profileId: 'foreign' },
          })
        ).statusCode,
      ).toBe(400)
      const preview = await app.inject({
        method: 'POST',
        url: '/v1/merchants/preview',
        payload: body,
      })
      expect(preview.statusCode).toBe(200)
      const saved = await app.inject({
        method: 'POST',
        url: '/v1/merchants/apply',
        payload: { ...body, previewRevision: preview.json().previewRevision },
      })
      expect(saved.statusCode, saved.payload).toBe(200)
      expect(saved.json()).not.toHaveProperty('householdId')
      expect(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/merchants/apply',
            payload: { ...body, previewRevision: preview.json().previewRevision },
          })
        ).statusCode,
      ).toBe(409)
      const created = await app.inject({
        method: 'POST',
        url: '/v1/categories',
        payload: category('Categoria HTTP'),
      })
      expect(created.statusCode, created.payload).toBe(201)
      expect(created.json()).toMatchObject({
        label: 'Categoria HTTP',
        taxonomyVersion: 'canonical-taxonomy-local-v1',
      })
      expect(
        (await app.inject({ method: 'GET', url: '/v1/merchants' })).json().aliases,
      ).toHaveLength(1)
    } finally {
      await app.close()
    }
  })
})
