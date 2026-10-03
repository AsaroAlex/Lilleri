import { createHash } from 'node:crypto'

export const DATASET_VERSION = 'lilleri-evaluation-dataset-v1'
export const SPLITS = Object.freeze(['train', 'calibration', 'test'])
export const KINDS = Object.freeze([
  'expense',
  'income',
  'transfer',
  'card_settlement',
  'cash_withdrawal',
  'refund',
  'unknown',
])
export const SUBSETS = Object.freeze([
  'ordinary',
  'injection',
  'quiet',
  'private',
  'pending',
  'booked',
  'settlement',
  'unknown',
])
const HASH = /^[a-f0-9]{64}$/u,
  TOKEN = /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,119}$/u
export function reject(code) {
  throw new Error(`Evaluation refused: ${code}`)
}
export function object(value, required, optional = []) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
    required.some((key) => !Object.hasOwn(value, key)) ||
    Object.keys(value).some((key) => ![...required, ...optional].includes(key))
  )
    reject('invalid-object')
  return value
}
export function token(value) {
  if (typeof value !== 'string' || !TOKEN.test(value)) reject('invalid-token')
  return value
}
export function digest(value) {
  if (typeof value !== 'string' || !HASH.test(value)) reject('invalid-digest')
  return value
}
export function instant(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    reject('invalid-clock')
  return value
}
export function unique(values) {
  if (new Set(values).size !== values.length) reject('duplicate-identity')
}
function array(value, maximum = 100_000) {
  if (!Array.isArray(value) || value.length > maximum) reject('invalid-array')
  return value
}
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => [key, canonical(item)]),
    )
  return value
}
export function sha256(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
}
export function splitDigest(rows, ids) {
  const byId = new Map(rows.map((row) => [row.id, row]))
  if (ids.some((id) => !byId.has(id))) reject('missing-row')
  return sha256([...ids].sort().map((id) => byId.get(id)))
}

/** JSON Schema is portable; the runtime additionally checks digest, ownership, leakage and clocks. */
const hashSchema = { type: 'string', pattern: '^[a-f0-9]{64}$' },
  tokenSchema = { type: 'string', pattern: '^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,119}$' },
  clockSchema = { type: 'string', format: 'date-time' },
  strict = (properties) => ({
    type: 'object',
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  }),
  list = (items) => ({ type: 'array', items, maxItems: 100_000 })
export const DATASET_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  ...strict({
    schemaVersion: { const: DATASET_VERSION },
    datasetId: tokenSchema,
    source: { enum: ['synthetic', 'consented', 'licensed'] },
    purpose: { enum: ['tool-correctness', 'promotion-assessment'] },
    frozenAt: clockSchema,
    authorization: strict({
      referenceHash: hashSchema,
      recordedAt: clockSchema,
      expiresAt: { anyOf: [clockSchema, { type: 'null' }] },
      purposes: list({ enum: ['evaluation', 'training'] }),
    }),
    catalogue: strict({
      version: tokenSchema,
      parents: list(tokenSchema),
      leaves: list(strict({ code: tokenSchema, parent: tokenSchema, quiet: { type: 'boolean' } })),
    }),
    splits: strict(
      Object.fromEntries(
        SPLITS.map((split) => [split, strict({ rowIds: list(hashSchema), sha256: hashSchema })]),
      ),
    ),
    rows: list(
      strict({
        id: hashSchema,
        profileKey: hashSchema,
        merchantKey: { anyOf: [hashSchema, { type: 'null' }] },
        sourceDigest: hashSchema,
        authorizationHash: hashSchema,
        bankId: tokenSchema,
        kind: { enum: KINDS },
        observedAt: clockSchema,
        status: { enum: ['pending', 'booked', 'reversed'] },
        subset: { enum: SUBSETS },
        quiet: { type: 'boolean' },
        private: { type: 'boolean' },
        injection: { type: 'boolean' },
        label: { anyOf: [tokenSchema, { type: 'null' }] },
        annotation: strict({
          first: hashSchema,
          firstLabel: { anyOf: [tokenSchema, { type: 'null' }] },
          second: hashSchema,
          secondLabel: { anyOf: [tokenSchema, { type: 'null' }] },
          adjudicator: { anyOf: [hashSchema, { type: 'null' }] },
          adjudicatedLabel: { anyOf: [tokenSchema, { type: 'null' }] },
        }),
      }),
    ),
  }),
}

/** expectedDigest must come from the independent reviewed manifest, never from the supplied file. */
export function validateCorpus(value, { expectedDigest, approvedCatalogue, now } = {}) {
  digest(expectedDigest)
  instant(now)
  if (sha256(value) !== expectedDigest) reject('unreviewed-manifest')
  object(value, [
    'schemaVersion',
    'datasetId',
    'source',
    'purpose',
    'frozenAt',
    'authorization',
    'catalogue',
    'splits',
    'rows',
  ])
  if (
    value.schemaVersion !== DATASET_VERSION ||
    !['synthetic', 'consented', 'licensed'].includes(value.source) ||
    !['tool-correctness', 'promotion-assessment'].includes(value.purpose)
  )
    reject('unsupported-dataset')
  token(value.datasetId)
  instant(value.frozenAt)
  if (Date.parse(value.frozenAt) > Date.parse(now)) reject('future-freeze')
  const authorization = object(value.authorization, [
    'referenceHash',
    'recordedAt',
    'expiresAt',
    'purposes',
  ])
  digest(authorization.referenceHash)
  instant(authorization.recordedAt)
  unique(array(authorization.purposes))
  if (
    !authorization.purposes.includes('evaluation') ||
    authorization.purposes.some((p) => !['evaluation', 'training'].includes(p)) ||
    Date.parse(authorization.recordedAt) > Date.parse(value.frozenAt)
  )
    reject('unauthorized-purpose')
  if (
    authorization.expiresAt !== null &&
    (Date.parse(instant(authorization.expiresAt)) <= Date.parse(now) ||
      Date.parse(authorization.expiresAt) <= Date.parse(authorization.recordedAt))
  )
    reject('authorization-expired')
  const catalogue = object(value.catalogue, ['version', 'parents', 'leaves'])
  token(catalogue.version)
  array(catalogue.parents).forEach(token)
  unique(catalogue.parents)
  const parents = new Set(catalogue.parents),
    leaves = new Map()
  for (const leaf of array(catalogue.leaves, 110)) {
    object(leaf, ['code', 'parent', 'quiet'])
    token(leaf.code)
    token(leaf.parent)
    if (!parents.has(leaf.parent) || typeof leaf.quiet !== 'boolean' || leaves.has(leaf.code))
      reject('invalid-taxonomy')
    leaves.set(leaf.code, leaf)
  }
  if (
    !leaves.size ||
    !parents.size ||
    !approvedCatalogue ||
    sha256(catalogue) !== sha256(approvedCatalogue)
  )
    reject('unreviewed-taxonomy')
  const rows = array(value.rows)
  const byId = new Map()
  for (const row of rows) {
    object(row, [
      'id',
      'profileKey',
      'merchantKey',
      'sourceDigest',
      'authorizationHash',
      'bankId',
      'kind',
      'observedAt',
      'status',
      'subset',
      'quiet',
      'private',
      'injection',
      'label',
      'annotation',
    ])
    for (const key of ['id', 'profileKey', 'sourceDigest', 'authorizationHash']) digest(row[key])
    if (row.merchantKey !== null) digest(row.merchantKey)
    token(row.bankId)
    instant(row.observedAt)
    if (
      !KINDS.includes(row.kind) ||
      !['pending', 'booked', 'reversed'].includes(row.status) ||
      !SUBSETS.includes(row.subset) ||
      ['quiet', 'private', 'injection'].some((key) => typeof row[key] !== 'boolean') ||
      row.authorizationHash !== authorization.referenceHash ||
      Date.parse(row.observedAt) > Date.parse(value.frozenAt)
    )
      reject('invalid-row')
    object(row.annotation, [
      'first',
      'firstLabel',
      'second',
      'secondLabel',
      'adjudicator',
      'adjudicatedLabel',
    ])
    digest(row.annotation.first)
    digest(row.annotation.second)
    if (row.annotation.adjudicator !== null) digest(row.annotation.adjudicator)
    if (row.annotation.first === row.annotation.second) reject('annotation-not-independent')
    if (row.label !== null && !leaves.has(row.label)) reject('unknown-label')
    if (
      (row.quiet ||
        row.private ||
        row.injection ||
        row.status !== 'booked' ||
        row.kind === 'unknown') &&
      row.label !== null
    )
      reject('guardrail-label')
    if ((row.quiet || row.private) && row.merchantKey !== null) reject('private-merchant-reference')
    if (row.label !== null && leaves.get(row.label).quiet) reject('quiet-label-in-training')
    const annotation = row.annotation
    for (const labelled of [
      annotation.firstLabel,
      annotation.secondLabel,
      annotation.adjudicatedLabel,
    ])
      if (
        labelled !== null &&
        (!leaves.has(labelled) ||
          leaves.get(labelled).quiet ||
          row.quiet ||
          row.private ||
          row.injection ||
          row.status !== 'booked' ||
          row.kind === 'unknown')
      )
        reject('invalid-annotation-label')
    if (annotation.adjudicator === null) {
      if (annotation.firstLabel !== annotation.secondLabel) reject('unadjudicated-disagreement')
      if (annotation.adjudicatedLabel !== null || row.label !== annotation.firstLabel)
        reject('mismatched-annotation')
    } else if (
      [annotation.first, annotation.second].includes(annotation.adjudicator) ||
      annotation.adjudicatedLabel !== row.label
    )
      reject('invalid-adjudication')
    if (
      (row.subset === 'quiet' && !row.quiet) ||
      (row.subset === 'private' && !row.private) ||
      (row.subset === 'injection' && !row.injection) ||
      (row.subset === 'pending' && row.status !== 'pending') ||
      (row.subset === 'booked' && row.status !== 'booked') ||
      (row.subset === 'unknown' && row.kind !== 'unknown') ||
      (row.subset === 'settlement' && row.kind !== 'card_settlement')
    )
      reject('mislabelled-subset')
    if (byId.has(row.id)) reject('duplicate-identity')
    byId.set(row.id, row)
  }
  unique(rows.map((row) => row.sourceDigest))
  object(value.splits, SPLITS)
  const assigned = new Set(),
    profiles = new Map(),
    merchants = new Map(),
    folds = {}
  for (const split of SPLITS) {
    const manifest = object(value.splits[split], ['rowIds', 'sha256'])
    array(manifest.rowIds).forEach(digest)
    digest(manifest.sha256)
    unique(manifest.rowIds)
    if (splitDigest(rows, manifest.rowIds) !== manifest.sha256) reject('changed-split')
    const fold = manifest.rowIds.map((id) => byId.get(id))
    folds[split] = fold
    if (split === 'train' && fold.length && !authorization.purposes.includes('training'))
      reject('unauthorized-training')
    if (
      split === 'train' &&
      fold.some(
        (row) =>
          row.label === null ||
          row.quiet ||
          row.private ||
          row.injection ||
          row.status !== 'booked',
      )
    )
      reject('unsupported-training-row')
    for (const row of fold) {
      if (!row || assigned.has(row.id)) reject('split-overlap')
      assigned.add(row.id)
      if (profiles.has(row.profileKey) && profiles.get(row.profileKey) !== split)
        reject('profile-leakage')
      profiles.set(row.profileKey, split)
      if (row.merchantKey !== null) {
        if (merchants.has(row.merchantKey) && merchants.get(row.merchantKey) !== split)
          reject('merchant-leakage')
        merchants.set(row.merchantKey, split)
      }
    }
  }
  if (assigned.size !== rows.length || SPLITS.some((split) => !folds[split].length))
    reject('incomplete-splits')
  for (let index = 1; index < SPLITS.length; index++) {
    const earlier = folds[SPLITS[index - 1]],
      later = folds[SPLITS[index]]
    if (
      Math.max(...earlier.map((row) => Date.parse(row.observedAt))) >=
      Math.min(...later.map((row) => Date.parse(row.observedAt)))
    )
      reject('time-leakage')
  }
  return { manifest: value, manifestDigest: expectedDigest, folds, catalogue }
}
