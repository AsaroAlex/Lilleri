import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TAXONOMY_VERSION } from '@lilleri/domain'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { createLocalSyntheticKeyManagement } from '../src/encryption-local.js'
import {
  merchantTaxonomyExportDtoSchema,
  validateMerchantTaxonomyExport,
} from '../src/merchant-taxonomy-export.js'
import { validateSourceErasureOwnershipExport } from '../src/source-erasure-export.js'
import { SourceErasureJournal } from '../src/source-erasure-journal.js'

let journal: SourceErasureJournal, directory: string
const occurredAt = '2026-10-03T12:00:00.000Z',
  erasedAt = '2026-10-03T13:00:00.000Z'
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'lilleri-recognition-export-proof-'))
  journal = new SourceErasureJournal(
    join(directory, 'journal'),
    join(directory, 'anchors'),
    randomBytes(32),
    await createLocalSyntheticKeyManagement({ directory: join(directory, 'keys'), mode: 'demo' }),
  )
})
afterAll(async () => {
  if (directory) await rm(directory, { recursive: true, force: true })
})
function snapshot() {
  const profileId = 'synthetic-profile',
    transactionId = 'synthetic-tx',
    accountId = 'synthetic-account',
    connectionId = 'synthetic-connection'
  const common = { profileId, createdAt: occurredAt, updatedAt: occurredAt, revision: 1 },
    aliasValues = {
      normalizedKey: 'netflix',
      merchantId: 'merchant:private:stable-synthetic',
      displayName: 'Nome originale',
      archived: false,
    },
    values = {
      label: 'Etichetta storica',
      canonicalCode: 'FOOD_GROCERIES',
      taxonomyVersion: TAXONOMY_VERSION,
      icon: 'basket',
      parentId: null,
      position: 0,
      hidden: false,
      archived: false,
    },
    source = { ...common, ...values, id: 'synthetic-category-source', revision: 2, archived: true },
    target = { ...common, ...values, label: 'Destinazione', id: 'synthetic-category-target' },
    alias = { ...common, ...aliasValues, id: 'synthetic-alias' },
    before = {
      profileId,
      transactionId,
      categoryId: source.id,
      categoryRevision: 1,
      canonicalCode: values.canonicalCode,
      taxonomyVersion: TAXONOMY_VERSION,
      labelSnapshot: values.label,
      quiet: false,
      revision: 2,
      updatedAt: occurredAt,
    },
    after = { ...before, categoryId: target.id, labelSnapshot: target.label, revision: 3 }
  const merchantTaxonomy = merchantTaxonomyExportDtoSchema.parse({
    taxonomyVersion: TAXONOMY_VERSION,
    aliases: [alias],
    categories: [source, target],
    assignments: [],
    aliasEvents: [
      {
        id: 'synthetic-alias-event',
        profileId,
        aliasId: alias.id,
        revision: 1,
        action: 'created',
        occurredAt,
        snapshot: { before: null, after: aliasValues, affectedTransactionIds: [transactionId] },
      },
    ],
    categoryEvents: [
      {
        id: 'synthetic-source-created',
        profileId,
        categoryId: source.id,
        revision: 1,
        action: 'created',
        occurredAt,
        snapshot: { before: null, after: values, affectedTransactionIds: [] },
      },
      {
        id: 'synthetic-source-merged',
        profileId,
        categoryId: source.id,
        revision: 2,
        action: 'merged',
        occurredAt,
        snapshot: {
          before: values,
          after: { ...values, archived: true },
          affectedTransactionIds: [transactionId],
          migrated: [{ transactionId, before, after }],
        },
      },
      {
        id: 'synthetic-target-created',
        profileId,
        categoryId: target.id,
        revision: 1,
        action: 'created',
        occurredAt,
        snapshot: {
          before: null,
          after: { ...values, label: target.label },
          affectedTransactionIds: [],
        },
      },
    ],
    assignmentEvents: [],
  })
  const signed = journal.signReceipt({
    format: 'lilleri.source-erasure.v1',
    id: randomUUID(),
    profileId,
    connectionId,
    revision: 1,
    erasedAt,
    profileKeyId: 'synthetic-profile-key',
    accountIds: [accountId],
    transactions: [{ id: transactionId, accountId }],
    observations: [],
    consentIds: [],
    revocationJobs: [],
    creationIntents: [],
    manualCommandIds: [],
    manualCommands: [],
    localDeletion: 'row-erasure-with-mandatory-restore-replay',
    sourceKeyErasure: 'shared-profile-key-retained',
  })
  return {
    profile: { id: profileId },
    exportedAt: '2026-10-03T15:00:00.000Z',
    accounts: [],
    transactions: [],
    sourceErasures: [{ signed, appliedAt: erasedAt }],
    merchantTaxonomy,
    before,
  }
}
describe('owned recognition history after independently authenticated source erasure', () => {
  test('exact signed profile/account/transaction receipt preserves historical audit without inferring missing references', () => {
    const value = snapshot(),
      refs = validateSourceErasureOwnershipExport(value, (input) => journal.verifyReceipt(input))
    expect(() => validateMerchantTaxonomyExport(value)).toThrow()
    expect(() => validateMerchantTaxonomyExport(value, refs)).not.toThrow()
    expect(value.merchantTaxonomy.aliasEvents[0]?.snapshot.affectedTransactionIds).toEqual([
      'synthetic-tx',
    ])
    expect(
      value.merchantTaxonomy.categoryEvents[1]?.snapshot.migrated?.[0]?.before.labelSnapshot,
    ).toBe('Etichetta storica')
    const tampered = structuredClone(value)
    const ref = tampered.sourceErasures[0]?.signed.body.transactions[0]
    if (!ref) throw new Error('Missing signed subject')
    ref.id = 'foreign-tx'
    expect(() =>
      validateSourceErasureOwnershipExport(tampered, (input) => journal.verifyReceipt(input)),
    ).toThrow()
  })
  test('historical proof cannot admit current assignments, foreign pairs or post-erasure audit clocks', () => {
    const value = snapshot(),
      refs = validateSourceErasureOwnershipExport(value, (input) => journal.verifyReceipt(input))
    const current = structuredClone(value)
    current.merchantTaxonomy.assignments.push(current.before)
    expect(() => validateMerchantTaxonomyExport(current, refs)).toThrow()
    const transaction = refs.transactions.get('synthetic-tx')
    if (!transaction) throw new Error('Missing actual signed receipt reference')
    const foreign = {
      ...refs,
      transactions: new Map([['synthetic-tx', { ...transaction, profileId: 'foreign-profile' }]]),
    }
    expect(() => validateMerchantTaxonomyExport(value, foreign)).toThrow()
    const wrongConnection = {
      ...refs,
      transactions: new Map([
        ['synthetic-tx', { ...transaction, connectionId: 'foreign-connection' }],
      ]),
    }
    expect(() => validateMerchantTaxonomyExport(value, wrongConnection)).toThrow()
    const future = structuredClone(value)
    const at = '2026-10-03T14:00:00.000Z'
    if (future.merchantTaxonomy.aliasEvents[0])
      future.merchantTaxonomy.aliasEvents[0].occurredAt = at
    if (future.merchantTaxonomy.aliases[0]) {
      future.merchantTaxonomy.aliases[0].createdAt = at
      future.merchantTaxonomy.aliases[0].updatedAt = at
    }
    expect(() => validateMerchantTaxonomyExport(future, refs)).toThrow()
  })
})
