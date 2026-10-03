import { createHash } from 'node:crypto'
import { CANONICAL_CATEGORIES, CATEGORIES, parseDecimal } from '@lilleri/domain'
import { strToU8, zip } from 'fflate'
import { Problem } from './problem.js'

type RecordValue = Record<string, unknown>
export const DATA_EXPORT_VERSION = 1
export const MAX_DATA_EXPORT_BYTES = 32 * 1024 * 1024
export interface DataExportArchive {
  readonly body: Buffer
  readonly filename: string
  readonly contentType: 'application/zip'
}
const invalid = () =>
  new Problem(
    500,
    'invalid_export_snapshot',
    'Non riesco a preparare un archivio completo per questo profilo. Riprova.',
  )
const tooLarge = () =>
  new Problem(
    422,
    'export_too_large',
    'L’archivio supera il limite locale di 32 MiB. Nessun archivio parziale è stato creato.',
  )
function record(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid()
  return value as RecordValue
}
function list(value: unknown): RecordValue[] {
  if (!Array.isArray(value)) throw invalid()
  return value.map(record)
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw invalid()
  return value
}
function identifier(value: unknown): string {
  const id = text(value)
  if (!id) throw invalid()
  return id
}
const decimalMinor = /^(0|-?[1-9]\d*)$/
function minor(value: unknown): string {
  const amount = text(value)
  if (!decimalMinor.test(amount)) throw invalid()
  return amount
}
function money(value: unknown) {
  const row = record(value),
    amountMinor = minor(row.amountMinor),
    currency = text(row.currency)
  try {
    parseDecimal('0', currency)
  } catch {
    throw invalid()
  }
  return { amountMinor, currency }
}
function timestamp(value: unknown): string {
  const instant = text(value)
  if (!/^\d{4}-\d{2}-\d{2}T/.test(instant) || !Number.isFinite(Date.parse(instant))) throw invalid()
  return instant
}
const forbiddenKeys = new Set([
  'password',
  'passwordhash',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'sessiontoken',
  'authorization',
  'cookie',
  'setcookie',
  'credentials',
  'clientsecret',
  'privatekey',
  'totpsecret',
  'backupcodes',
  'recoverycodes',
])
function assertNoCredentials(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) assertNoCredentials(item)
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, item] of Object.entries(value)) {
    if (forbiddenKeys.has(key.replace(/[_-]/g, '').toLowerCase())) throw invalid()
    assertNoCredentials(item)
  }
}
function normalizedSnapshot(input: unknown) {
  // Bigint conversion is lossless. Text is never changed for spreadsheet compatibility here.
  let serialized: string | undefined
  try {
    serialized = JSON.stringify(input, (_, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value,
    )
  } catch {
    throw invalid()
  }
  if (!serialized) throw invalid()
  if (Buffer.byteLength(serialized, 'utf8') > MAX_DATA_EXPORT_BYTES) throw tooLarge()
  const snapshot = record(JSON.parse(serialized))
  assertNoCredentials(snapshot)
  if (snapshot.exportVersion !== 1) throw invalid()
  timestamp(snapshot.exportedAt)
  const profileId = identifier(record(snapshot.profile).id)
  const scoped = (value: unknown) =>
    list(value).map((row) => {
      if (row.profileId !== profileId) throw invalid()
      return row
    })
  const connections = scoped(snapshot.connections),
    accounts = scoped(snapshot.accounts),
    transactions = scoped(snapshot.transactions)
  const connectionIds = new Set(connections.map((row) => identifier(row.id))),
    accountById = new Map(accounts.map((row) => [identifier(row.id), row])),
    transactionIds = new Set(transactions.map((row) => identifier(row.id)))
  if (
    connectionIds.size !== connections.length ||
    accountById.size !== accounts.length ||
    transactionIds.size !== transactions.length
  )
    throw invalid()
  for (const account of accounts) {
    if (!connectionIds.has(text(account.connectionId))) throw invalid()
    money(account.balance)
  }
  for (const transaction of transactions) {
    const account = accountById.get(text(transaction.accountId))
    if (!account || transaction.connectionId !== account.connectionId) throw invalid()
    if (money(transaction.amount).currency !== money(account.balance).currency) throw invalid()
  }
  for (const key of [
    'consents',
    'sourceObservations',
    'feedback',
    'preferences',
    'matchDecisions',
    'matchDecisionLegs',
    'syncRuns',
    'rules',
    'ruleEvents',
  ])
    scoped(snapshot[key])
  for (const row of [
    ...list(snapshot.consents),
    ...list(snapshot.syncRuns),
    ...list(snapshot.revocationJobs),
  ])
    if (!connectionIds.has(text(row.connectionId))) throw invalid()
  for (const row of list(snapshot.sourceObservations)) {
    const account = accountById.get(text(row.accountId))
    if (!account || row.connectionId !== account.connectionId) throw invalid()
    // Existing export already omits expired raw content. Defend that boundary for direct callers too.
    if (
      Object.hasOwn(row, 'payload') &&
      (!row.payloadExpiresAt ||
        Date.parse(timestamp(row.payloadExpiresAt)) <= Date.parse(timestamp(snapshot.exportedAt)))
    )
      throw invalid()
  }
  for (const row of [...list(snapshot.feedback), ...list(snapshot.matchDecisionLegs)])
    if (!transactionIds.has(text(row.transactionId))) throw invalid()
  const manual = record(snapshot.manual)
  for (const row of scoped(manual.accountStates)) {
    if (!accountById.has(text(row.accountId))) throw invalid()
    minor(row.openingBalanceMinor)
  }
  for (const row of scoped(manual.balanceEvents)) {
    if (
      !accountById.has(text(row.accountId)) ||
      (row.transactionId !== null && !transactionIds.has(text(row.transactionId)))
    )
      throw invalid()
    minor(row.beforeMinor)
    minor(row.afterMinor)
  }
  const settings = record(snapshot.profileSettings)
  if (record(settings.settings).profileId !== profileId) throw invalid()
  scoped(settings.events)
  const analysis = record(snapshot.analysis)
  for (const row of [
    ...list(analysis.classifications),
    ...list(analysis.reviewItems),
    ...list(analysis.recurring),
    ...list(analysis.matches),
  ]) {
    const ids = Object.hasOwn(row, 'transactionId') ? [row.transactionId] : row.transactionIds
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || !transactionIds.has(id)))
      throw invalid()
  }
  for (const row of list(analysis.summaries)) {
    for (const key of ['balance', 'income', 'spend', 'pending']) {
      const value = money(row[key])
      if (value.currency !== row.currency) throw invalid()
    }
  }
  for (const row of list(analysis.recurring)) money(row.expectedAmount)
  return snapshot
}

/** CSV alone cannot prescribe spreadsheet cell types; only untrusted text receives a safety prefix. */
function csvText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'string') throw invalid()
  // Include invisible format characters before a formula, as well as leading tab/CR/LF cells.
  const probe = value.replace(/^[\s\p{Cf}]+/u, '')
  return /^[=+\-@]/.test(probe) || /^[\t\r\n]/.test(value) ? `'${value}` : value
}
function csvNumber(value: unknown): string {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw invalid()
    return String(value)
  }
  return minor(value)
}
function cell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}
function csv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  return `${[headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`
}
function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}
function transactionCsv(snapshot: RecordValue) {
  const classifications = new Map(
    list(record(snapshot.analysis).classifications).map((row) => [text(row.transactionId), row]),
  )
  const headers = [
    'id',
    'profile_id',
    'account_id',
    'connection_id',
    'provider_id',
    'provider_transaction_id',
    'revision',
    'source',
    'status',
    'amount_minor',
    'currency',
    'description',
    'merchant_name',
    'merchant_key',
    'booked_on',
    'authorized_on',
    'observed_at',
    'kind',
    'reference',
    'related_transaction_id',
    'related_account_id',
    'category_id',
    'category_source',
    'needs_review',
  ]
  const rows = list(snapshot.transactions).map((row) => {
    const amount = money(row.amount),
      classification = classifications.get(text(row.id))
    return [
      csvText(row.id),
      csvText(row.profileId),
      csvText(row.accountId),
      csvText(row.connectionId),
      csvText(row.providerId),
      csvText(row.providerTransactionId),
      csvNumber(row.revision),
      csvText(row.source),
      csvText(row.status),
      amount.amountMinor,
      csvText(amount.currency),
      csvText(row.description),
      csvText(row.merchantName),
      csvText(row.merchantKey),
      csvText(row.bookedOn),
      csvText(row.authorizedOn),
      csvText(row.observedAt),
      csvText(row.kind),
      csvText(row.reference),
      csvText(row.relatedTransactionId),
      csvText(row.relatedAccountId),
      csvText(classification?.categoryId),
      csvText(classification?.source),
      classification ? String(classification.needsReview) : '',
    ]
  })
  return { content: csv(headers, rows), columns: headers }
}
function linkCsv(snapshot: RecordValue) {
  const decisions = new Map(list(snapshot.matchDecisions).map((row) => [text(row.matchId), row]))
  const headers = [
    'id',
    'type',
    'state',
    'revision',
    'transaction_ids',
    'algorithm_version',
    'confidence',
    'explanation',
    'evidence',
    'decision_revision',
    'decided_at',
  ]
  const rows = list(record(snapshot.analysis).matches).map((row) => {
    const confidence = row.confidence
    if (
      typeof confidence !== 'number' ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 1
    )
      throw invalid()
    const decision = decisions.get(text(row.id))
    return [
      csvText(row.id),
      csvText(row.type),
      csvText(row.state),
      csvText(row.revision),
      csvText(JSON.stringify(row.transactionIds)),
      csvText(row.algorithmVersion),
      String(confidence),
      csvText(row.explanation),
      csvText(JSON.stringify(row.evidence)),
      decision ? csvNumber(decision.revision) : '',
      csvText(decision?.decidedAt),
    ]
  })
  return { content: csv(headers, rows), columns: headers }
}
function events(snapshot: RecordValue) {
  const output: { type: string; occurredAt: string; data: RecordValue }[] = []
  const append = (type: string, rows: RecordValue[], clock: string) => {
    for (const row of rows) output.push({ type, occurredAt: timestamp(row[clock]), data: row })
  }
  append('classification_feedback', list(snapshot.feedback), 'createdAt')
  append('reconciliation_decision', list(snapshot.matchDecisions), 'decidedAt')
  append('classification_rule', list(snapshot.ruleEvents), 'createdAt')
  append('manual_balance', list(record(snapshot.manual).balanceEvents), 'createdAt')
  append('profile_settings', list(record(snapshot.profileSettings).events), 'createdAt')
  append('sync_run', list(snapshot.syncRuns), 'syncedAt')
  for (const row of list(snapshot.consents)) {
    output.push({ type: 'consent_granted', occurredAt: timestamp(row.grantedAt), data: row })
    if (row.revokedAt !== null)
      output.push({ type: 'consent_revoked', occurredAt: timestamp(row.revokedAt), data: row })
  }
  for (const row of list(snapshot.sourceObservations)) {
    const { payload: _payload, payloadExpiresAt: _expiry, ...metadata } = row
    output.push({
      type: 'source_observation',
      occurredAt: timestamp(row.observedAt),
      data: metadata,
    })
  }
  if (snapshot.identity)
    append('identity_acceptance', list(record(snapshot.identity).acceptances), 'acceptedAt')
  return output.sort(
    (a, b) =>
      a.occurredAt.localeCompare(b.occurredAt) ||
      a.type.localeCompare(b.type) ||
      JSON.stringify(a.data).localeCompare(JSON.stringify(b.data)),
  )
}
const stringSchema = { type: 'string' }
const nullableString = { type: ['string', 'null'] }
const integerSchema = { type: 'integer', minimum: 0 }
const positiveRevision = { type: 'integer', minimum: 1 }
const minorSchema = { type: 'string', pattern: '^(0|-?[1-9]\\d*)$' }
const reference = (name: string) => ({ $ref: `#/$defs/${name}` })
const array = (items: unknown) => ({ type: 'array', items })
const object = (properties: RecordValue, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
})
const provenance = {
  algorithmVersion: stringSchema,
  confidence: { type: 'number', minimum: 0, maximum: 1 },
  explanation: stringSchema,
  evidence: array(stringSchema),
}
/** Machine-readable JSON shape; CSV projections/neutralization are declared in manifest.json. */
export const DATA_EXPORT_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'urn:lilleri:data-export:schema:v1',
  title: 'Lilleri local data.json export version 1',
  ...reference('snapshot'),
  $defs: {
    money: object({
      amountMinor: minorSchema,
      currency: { type: 'string', pattern: '^[A-Z]{3}$' },
    }),
    account: object({
      id: stringSchema,
      profileId: stringSchema,
      connectionId: stringSchema,
      providerAccountId: stringSchema,
      name: stringSchema,
      institutionName: stringSchema,
      kind: { enum: ['current', 'card', 'cash', 'savings'] },
      balance: reference('money'),
      balanceUpdatedAt: stringSchema,
    }),
    connection: object({
      id: stringSchema,
      profileId: stringSchema,
      providerId: stringSchema,
      institutionId: stringSchema,
      status: { enum: ['active', 'expired', 'revoked', 'error'] },
      createdAt: stringSchema,
      lastSyncedAt: nullableString,
    }),
    transaction: object({
      id: stringSchema,
      profileId: stringSchema,
      accountId: stringSchema,
      connectionId: stringSchema,
      providerId: stringSchema,
      providerTransactionId: stringSchema,
      revision: positiveRevision,
      source: { enum: ['bank', 'csv', 'manual'] },
      status: { enum: ['pending', 'booked', 'reversed'] },
      amount: reference('money'),
      description: stringSchema,
      merchantName: nullableString,
      merchantKey: nullableString,
      bookedOn: nullableString,
      authorizedOn: nullableString,
      observedAt: stringSchema,
      kind: {
        enum: ['expense', 'income', 'transfer', 'card_settlement', 'refund', 'cash_withdrawal'],
      },
      reference: nullableString,
      relatedTransactionId: nullableString,
      relatedAccountId: nullableString,
    }),
    classification: object({
      ...provenance,
      transactionId: stringSchema,
      categoryId: { enum: Object.keys(CATEGORIES) },
      source: { enum: ['user', 'rule', 'preference', 'global', 'review'] },
      needsReview: { type: 'boolean' },
    }),
    match: object({
      ...provenance,
      id: stringSchema,
      revision: { type: 'string', pattern: '^[a-f0-9]{64}$' },
      type: {
        enum: [
          'pending_to_booked',
          'duplicate',
          'internal_transfer',
          'card_settlement',
          'refund',
          'cash_transfer',
        ],
      },
      transactionIds: array(stringSchema),
      state: { enum: ['confirmed', 'suggested', 'rejected', 'undone'] },
    }),
    analysis: object({
      classifications: array(reference('classification')),
      matches: array(reference('match')),
      recurring: array(
        object({
          ...provenance,
          id: stringSchema,
          merchantKey: stringSchema,
          transactionIds: array(stringSchema),
          kind: { enum: ['subscription', 'recurring_expense', 'recurring_income'] },
          frequency: { const: 'monthly' },
          expectedAmount: reference('money'),
          nextOn: stringSchema,
          priceIncreased: { type: 'boolean' },
        }),
      ),
      reviewItems: array(
        object({
          id: stringSchema,
          transactionIds: array(stringSchema),
          type: { enum: ['classification', 'reconciliation', 'balance'] },
          explanation: stringSchema,
          matchId: nullableString,
        }),
      ),
      summaries: array(
        object({
          currency: stringSchema,
          balance: reference('money'),
          income: reference('money'),
          spend: reference('money'),
          pending: reference('money'),
          transactionCount: integerSchema,
        }),
      ),
    }),
    ruleConditions: object(
      {
        merchantKey: stringSchema,
        description: object({ operator: { enum: ['equals', 'contains'] }, value: stringSchema }),
        amount: object({ currency: stringSchema, minMinor: minorSchema, maxMinor: minorSchema }, [
          'currency',
        ]),
        accountId: stringSchema,
        kind: {
          enum: ['expense', 'income', 'transfer', 'card_settlement', 'refund', 'cash_withdrawal'],
        },
        direction: { enum: ['debit', 'credit', 'zero'] },
      },
      [],
    ),
    ruleState: object({
      name: stringSchema,
      conditions: reference('ruleConditions'),
      categoryId: { enum: Object.keys(CATEGORIES) },
      priority: { type: 'integer', minimum: 0, maximum: 100 },
      enabled: { type: 'boolean' },
      archived: { type: 'boolean' },
    }),
    rule: object({
      id: stringSchema,
      profileId: stringSchema,
      name: stringSchema,
      conditions: reference('ruleConditions'),
      categoryId: { enum: Object.keys(CATEGORIES) },
      priority: { type: 'integer', minimum: 0, maximum: 100 },
      enabled: { type: 'boolean' },
      archived: { type: 'boolean' },
      revision: positiveRevision,
      createdAt: stringSchema,
      updatedAt: stringSchema,
    }),
    ruleEvent: object({
      id: stringSchema,
      profileId: stringSchema,
      ruleId: stringSchema,
      revision: positiveRevision,
      action: { enum: ['created', 'edited', 'applied', 'disabled', 'archived', 'undone'] },
      before: { anyOf: [reference('ruleState'), { type: 'null' }] },
      affectedTransactionIds: array(stringSchema),
      createdAt: stringSchema,
    }),
    settingsValues: object({
      displayName: stringSchema,
      locale: { const: 'it-IT' },
      timezone: stringSchema,
    }),
    settings: object({
      profileId: stringSchema,
      displayName: stringSchema,
      locale: { const: 'it-IT' },
      timezone: stringSchema,
      revision: positiveRevision,
      updatedAt: stringSchema,
    }),
    settingsEvent: object({
      id: stringSchema,
      profileId: stringSchema,
      revision: positiveRevision,
      before: reference('settingsValues'),
      after: reference('settingsValues'),
      createdAt: stringSchema,
    }),
    manualEvent: object({
      id: stringSchema,
      profileId: stringSchema,
      accountId: stringSchema,
      requestId: stringSchema,
      operation: { enum: ['opening', 'entry', 'import', 'adjustment', 'reversal'] },
      transactionId: nullableString,
      beforeMinor: minorSchema,
      afterMinor: minorSchema,
      accountRevision: positiveRevision,
      reason: stringSchema,
      createdAt: stringSchema,
    }),
    identity: object({
      user: object({
        id: stringSchema,
        name: stringSchema,
        email: stringSchema,
        emailVerified: { type: 'boolean' },
        adultAttested: { type: 'boolean' },
        termsVersion: stringSchema,
        twoFactorEnabled: { type: 'boolean' },
        createdAt: stringSchema,
      }),
      acceptances: array(
        object({
          kind: { enum: ['adult_attestation', 'terms'] },
          textVersion: stringSchema,
          acceptedAt: stringSchema,
        }),
      ),
      sessions: array(
        object({
          id: stringSchema,
          current: { type: 'boolean' },
          createdAt: stringSchema,
          expiresAt: stringSchema,
        }),
      ),
    }),
    snapshot: object(
      {
        exportVersion: { const: 1 },
        exportedAt: stringSchema,
        mode: { const: 'synthetic' },
        profile: object({ id: stringSchema, name: stringSchema, timezone: stringSchema }),
        connections: array(reference('connection')),
        accounts: array(reference('account')),
        transactions: array(reference('transaction')),
        analysis: reference('analysis'),
        consents: array(
          object({
            id: stringSchema,
            profileId: stringSchema,
            connectionId: stringSchema,
            purpose: { const: 'account_information' },
            grantedAt: stringSchema,
            expiresAt: stringSchema,
            revokedAt: nullableString,
            provider: stringSchema,
          }),
        ),
        sourceObservations: array(
          object(
            {
              id: stringSchema,
              profileId: stringSchema,
              connectionId: stringSchema,
              accountId: stringSchema,
              providerId: stringSchema,
              providerRecordId: stringSchema,
              status: stringSchema,
              contentHash: stringSchema,
              observedAt: stringSchema,
              payload: { type: 'object' },
              payloadExpiresAt: stringSchema,
            },
            [
              'id',
              'profileId',
              'connectionId',
              'accountId',
              'providerId',
              'providerRecordId',
              'status',
              'contentHash',
              'observedAt',
            ],
          ),
        ),
        feedback: array(
          object({
            profileId: stringSchema,
            transactionId: stringSchema,
            categoryId: { enum: Object.keys(CATEGORIES) },
            scope: { enum: ['once', 'merchant'] },
            createdAt: stringSchema,
          }),
        ),
        preferences: array(
          object({
            profileId: stringSchema,
            merchantKey: stringSchema,
            categoryId: { enum: Object.keys(CATEGORIES) },
          }),
        ),
        matchDecisions: array(
          object({
            profileId: stringSchema,
            matchId: stringSchema,
            state: { enum: ['confirmed', 'rejected', 'undone'] },
            decidedAt: stringSchema,
            revision: positiveRevision,
          }),
        ),
        matchDecisionLegs: array(
          object({ profileId: stringSchema, matchId: stringSchema, transactionId: stringSchema }),
        ),
        syncRuns: array(
          object({
            id: stringSchema,
            profileId: stringSchema,
            connectionId: stringSchema,
            inserted: integerSchema,
            updated: integerSchema,
            unchanged: integerSchema,
            rejected: integerSchema,
            syncedAt: stringSchema,
          }),
        ),
        rules: array(reference('rule')),
        ruleEvents: array(reference('ruleEvent')),
        manual: object({
          accountStates: array(
            object({
              profileId: stringSchema,
              accountId: stringSchema,
              openingOn: stringSchema,
              openingBalanceMinor: minorSchema,
              revision: positiveRevision,
            }),
          ),
          balanceEvents: array(reference('manualEvent')),
        }),
        profileSettings: object({
          settings: reference('settings'),
          events: array(reference('settingsEvent')),
        }),
        revocationJobs: array(
          object({
            id: stringSchema,
            connectionId: stringSchema,
            state: { enum: ['pending', 'running', 'completed', 'failed'] },
            attempts: integerSchema,
            nextAttemptAt: stringSchema,
            deadlineAt: stringSchema,
            completedAt: nullableString,
            lastErrorCode: nullableString,
          }),
        ),
        identity: reference('identity'),
      },
      [
        'exportVersion',
        'exportedAt',
        'mode',
        'profile',
        'connections',
        'accounts',
        'transactions',
        'analysis',
        'consents',
        'sourceObservations',
        'feedback',
        'preferences',
        'matchDecisions',
        'matchDecisionLegs',
        'syncRuns',
        'rules',
        'ruleEvents',
        'manual',
        'profileSettings',
        'revocationJobs',
      ],
    ),
  },
} as const
const readme = `Lilleri — archivio locale dei tuoi dati

La copia completa e senza modifiche del testo è data.json. Gli importi sono stringhe di unità minime intere (EUR: centesimi, JPY: yen, KWD: millesimi); ogni importo conserva la propria valuta. Nessuna conversione o somma tra valute viene introdotta dall’esportazione.

transactions.csv e links.csv sono viste tabellari. Per evitare formule involontarie, alcune celle di testo hanno un apostrofo aggiunto davanti. Il testo originale resta in data.json. Gli importi CSV restano cifre intere esatte: nel foglio di calcolo importa amount_minor come testo per evitare arrotondamenti automatici di numeri grandi. Non rimuovere gli apostrofi prima di aprire il CSV in un foglio di calcolo.

accounts.json, rules.json, categories.json, consents.json ed events.jsonl conservano dati e provenienza. Gli eventi descrivono le registrazioni disponibili e non un’intera cronologia delle operazioni future o esterne. I contenuti grezzi già scaduti non sono inclusi; i loro metadati possono restare disponibili.

manifest.json descrive i file, le colonne CSV, le versioni e i digest SHA-256. schema.json descrive data.json. I digest servono a controllare che i file non cambino all’interno dell’archivio, non sono una firma digitale.

Questo download locale non crea un link pubblico, un collegamento bancario o un processo automatico di conservazione. Conserva l’archivio dove preferisci e considera che contiene informazioni finanziarie personali.
`

/** Build from the same schema-validated, profile-scoped snapshot used by JSON export. */
export async function createDataExportArchive(input: unknown): Promise<DataExportArchive> {
  const snapshot = normalizedSnapshot(input),
    profile = record(snapshot.profile),
    transactions = transactionCsv(snapshot),
    links = linkCsv(snapshot),
    audit = events(snapshot)
  const files: Record<string, Uint8Array> = {}
  let bytes = 0
  const add = (path: string, content: string) => {
    const data = strToU8(content)
    bytes += data.byteLength
    if (bytes > MAX_DATA_EXPORT_BYTES) throw tooLarge()
    files[path] = data
  }
  add('transactions.csv', transactions.content)
  add('links.csv', links.content)
  add('accounts.json', json(snapshot.accounts))
  add('rules.json', json(snapshot.rules))
  add(
    'categories.json',
    json({ formatVersion: 1, canonical: CANONICAL_CATEGORIES, prototypeVisible: CATEGORIES }),
  )
  add('consents.json', json(snapshot.consents))
  add(
    'events.jsonl',
    audit.map((event) => JSON.stringify(event)).join('\n') + (audit.length ? '\n' : ''),
  )
  add('data.json', json(snapshot))
  add('schema.json', json(DATA_EXPORT_SCHEMA))
  add('README.txt', readme)
  const currencies = [
    ...new Set([
      ...list(snapshot.accounts).map((row) => money(row.balance).currency),
      ...list(snapshot.transactions).map((row) => money(row.amount).currency),
    ]),
  ].sort()
  add(
    'manifest.json',
    json({
      archiveVersion: DATA_EXPORT_VERSION,
      exportVersion: snapshot.exportVersion,
      exportedAt: snapshot.exportedAt,
      profileId: profile.id,
      timezone: profile.timezone,
      sourceMode: snapshot.mode,
      scope: 'profile',
      delivery: 'local_download',
      moneyEncoding: 'decimal_string_integer_minor_units',
      currencies,
      counts: {
        accounts: list(snapshot.accounts).length,
        transactions: list(snapshot.transactions).length,
        links: list(record(snapshot.analysis).matches).length,
        events: audit.length,
      },
      csv: {
        encoding: 'UTF-8',
        delimiter: ',',
        lineEnding: 'CRLF',
        textFormulaProtection: {
          method: 'apostrophe_prefix',
          originalValues: 'data.json',
          appliesTo:
            'text cells starting with = + - @ after leading whitespace/format characters, or tab/CR/LF',
        },
        numericMinorColumns: {
          encoding: 'canonical_decimal_string',
          spreadsheetImportType: 'text',
        },
        columns: { 'transactions.csv': transactions.columns, 'links.csv': links.columns },
      },
      schema: { path: 'schema.json', describes: 'data.json' },
      files: Object.entries(files).map(([path, content]) => ({
        path,
        bytes: content.byteLength,
        sha256: createHash('sha256').update(content).digest('hex'),
      })),
    }),
  )
  const time = new Date(text(snapshot.exportedAt))
  const mtime =
    time.getUTCFullYear() >= 1980 && time.getUTCFullYear() <= 2107
      ? time
      : new Date('2000-01-01T00:00:00Z')
  const body = await new Promise<Buffer>((resolve, reject) =>
    zip(files, { level: 6, mtime }, (error, data) =>
      error ? reject(error) : resolve(Buffer.from(data)),
    ),
  )
  return {
    body,
    filename: `lilleri-export-${text(snapshot.exportedAt).slice(0, 10)}.zip`,
    contentType: 'application/zip',
  }
}
