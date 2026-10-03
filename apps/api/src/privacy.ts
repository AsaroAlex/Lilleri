import { createHash, randomUUID } from 'node:crypto'
import { type Database, schema } from '@lilleri/database'
import type { Classification } from '@lilleri/domain'
import { and, asc, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  type PrivacyPermissionPurpose,
  privacyPermissionEvents,
  privacyPermissions,
  profilePrivacyEvents,
  profilePrivacySettings,
  transactionPrivacy,
  transactionPrivacyEvents,
} from './privacy-schema.js'
import { notFound, Problem } from './problem.js'

const revision = z.number().int().min(1).max(2_147_483_646)
const identifier = z.string().min(1).max(256)
const purposeSchema = z.enum(['P-AI', 'C-ANALYTICS', 'N-SERVICE'])
const stateSchema = z.enum(['not_granted', 'granted', 'denied', 'revoked'])
export const transactionPrivacyValuesSchema = z
  .object({ quiet: z.boolean(), private: z.boolean() })
  .strict()
export const privacySettingsValuesSchema = z.object({ rulesOnly: z.boolean() }).strict()
export const privacySettingsDtoSchema = privacySettingsValuesSchema.extend({
  profileId: identifier,
  revision: z.number().int().positive(),
  updatedAt: z.string(),
})
export const transactionPrivacyDtoSchema = transactionPrivacyValuesSchema.extend({
  profileId: identifier,
  transactionId: identifier,
  revision: z.number().int().positive(),
  updatedAt: z.string(),
})
export const privacyDisclosureDtoSchema = z
  .object({
    purpose: purposeSchema,
    textVersion: z.string(),
    textHash: z.string().regex(/^[a-f0-9]{64}$/),
    noticeVersion: z.string(),
    vendorListVersion: z.string().nullable(),
    locale: z.literal('it-IT'),
    text: z.string(),
    draft: z.literal(true),
    permissionNotFeature: z.literal(true),
    featureAvailable: z.boolean(),
  })
  .strict()
export type PrivacyDisclosure = z.infer<typeof privacyDisclosureDtoSchema>
const NOTICE_VERSION = 'privacy/local-it-IT/draft-1'
function disclosure(
  purpose: PrivacyPermissionPurpose,
  textVersion: string,
  text: string,
): PrivacyDisclosure {
  const values = {
    purpose,
    textVersion,
    noticeVersion: NOTICE_VERSION,
    vendorListVersion: purpose === 'P-AI' ? 'none/local-draft-1' : null,
    locale: 'it-IT' as const,
    text,
  }
  return Object.freeze({
    ...values,
    textHash: createHash('sha256').update(JSON.stringify(values)).digest('hex'),
    draft: true,
    permissionNotFeature: true,
    featureAvailable: purpose === 'N-SERVICE',
  })
}
/** Synthetic draft registry, never evidence of reviewed vendor/lawful-basis acceptance. */
export const PRIVACY_DISCLOSURES: Readonly<Record<PrivacyPermissionPurpose, PrivacyDisclosure>> =
  Object.freeze({
    'P-AI': disclosure(
      'P-AI',
      'p-ai/local-it-IT/draft-1',
      'Questo permesso locale non attiva un servizio AI esterno. Nessun dato viene inviato a un fornitore AI. Un futuro servizio richiederà informazioni sui fornitori e una nuova scelta esplicita. Regole, correzioni, esportazione ed eliminazione restano disponibili.',
    ),
    'C-ANALYTICS': disclosure(
      'C-ANALYTICS',
      'c-analytics/local-it-IT/draft-1',
      'Questa scelta locale non avvia una raccolta di analisi con identificatore. Le metriche operative necessarie non includono importi, descrizioni o identificatori del profilo. Puoi rifiutare senza perdere le funzioni di gestione dei tuoi dati.',
    ),
    'N-SERVICE': disclosure(
      'N-SERVICE',
      'n-service/local-it-IT/draft-1',
      'Preferenza locale per avvisi di servizio, separata dalla pubblicità. Non concede il permesso notifiche del dispositivo. Le informazioni essenziali su sicurezza e diritti sui dati restano disponibili anche se disattivi questi avvisi.',
    ),
  })
const permissionFields = {
  profileId: identifier,
  purpose: purposeSchema,
  state: stateSchema,
  revision: z.number().int().positive(),
  textVersion: z.string(),
  textHash: z.string().regex(/^[a-f0-9]{64}$/),
  noticeVersion: z.string(),
  vendorListVersion: z.string().nullable(),
  updatedAt: z.string(),
  reaskNotBefore: z.string().nullable(),
  sourceOfTruth: z.literal('local_preference'),
}
export const privacyPermissionRecordDtoSchema = z.object(permissionFields).strict()
export const privacyPermissionDtoSchema = privacyPermissionRecordDtoSchema
  .extend({
    granted: z.boolean(),
    localPreferenceEnabled: z.boolean(),
    textIsCurrent: z.boolean(),
    permissionNotFeature: z.literal(true),
    featureAvailable: z.boolean(),
    effectiveEnabled: z.boolean(),
    nativePushEnabled: z.literal(false),
    osPermission: z.literal('unknown'),
    canPrompt: z.literal(false),
    disclosure: privacyDisclosureDtoSchema,
  })
  .strict()
export type PrivacyPermissionView = z.infer<typeof privacyPermissionDtoSchema>
const permissionChoiceSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('granted'),
      textVersion: z.string().max(100),
      textHash: z.string().regex(/^[a-f0-9]{64}$/),
      noticeVersion: z.string().max(100),
      vendorListVersion: z.string().max(100).nullable(),
    })
    .strict(),
  z
    .object({
      action: z.literal('denied'),
      textVersion: z.string().max(100),
      textHash: z.string().regex(/^[a-f0-9]{64}$/),
      noticeVersion: z.string().max(100),
      vendorListVersion: z.string().max(100).nullable(),
    })
    .strict(),
  z.object({ action: z.literal('revoked') }).strict(),
])
export type PrivacyPermissionChoice = z.infer<typeof permissionChoiceSchema>
const permissionRequestSchema = z.discriminatedUnion('action', [
  permissionChoiceSchema.options[0].extend({ revision }),
  permissionChoiceSchema.options[1].extend({ revision }),
  permissionChoiceSchema.options[2].extend({ revision }),
])
const changed = () =>
  new Problem(
    409,
    'privacy_changed',
    'Le preferenze di privacy sono cambiate. Aggiorna i dati prima di salvare.',
  )
const invalid = () =>
  new Problem(
    400,
    'invalid_privacy',
    'Controlla le preferenze e la versione delle informazioni mostrate.',
  )
const textChanged = () =>
  new Problem(
    409,
    'privacy_text_changed',
    'Le informazioni del permesso sono cambiate. Leggi la versione corrente prima di scegliere.',
  )
function instant(value: string) {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) throw invalid()
  return new Date(parsed).toISOString()
}

/** Product suppression policy: six calendar months, preserving the instant and clamping month end. */
export function privacyReaskNotBefore(value: string): string {
  const date = new Date(instant(value))
  const target = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + 6,
      1,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  )
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay))
  return target.toISOString()
}
export function mayPromptPrivacyPermission(
  permission: Pick<PrivacyPermissionView, 'state' | 'reaskNotBefore'>,
  now: string,
  featureAvailable: boolean,
) {
  const current = instant(now)
  if (!featureAvailable || permission.state === 'granted') return false
  return permission.reaskNotBefore === null || instant(permission.reaskNotBefore) <= current
}
export function privacyExcludedTransactionIds(
  flags: readonly { transactionId: string; quiet: boolean; private: boolean }[],
  classifications: readonly Pick<Classification, 'transactionId' | 'categoryId'>[] = [],
): string[] {
  // The legacy health category maps only to quiet canonical merchant-type leaves.
  return [
    ...new Set([
      ...flags.filter((row) => row.quiet || row.private).map((row) => row.transactionId),
      ...classifications
        .filter((row) => row.categoryId === 'health')
        .map((row) => row.transactionId),
    ]),
  ].sort()
}
export function privacyClassificationOptions(settings: { readonly rulesOnly: boolean }) {
  return { globalDictionaryEnabled: !settings.rulesOnly }
}
export function applyRulesOnlyToClassifications(
  classifications: readonly Classification[],
  rulesOnly: boolean,
): Classification[] {
  return classifications.map((row) =>
    rulesOnly &&
    row.source === 'global' &&
    row.evidence.some((item) => item.startsWith('dictionary:'))
      ? {
          ...row,
          categoryId: 'uncategorised',
          source: 'review',
          needsReview: true,
          confidence: 0,
          explanation:
            'La categorizzazione automatica è disattivata. Scegli una categoria o crea una regola.',
          evidence: ['rules-only-global-dictionary-disabled'],
        }
      : row,
  )
}
async function profile(db: Database, profileId: string, lock = false) {
  const query = db.select().from(schema.profiles).where(eq(schema.profiles.id, profileId))
  const [row] = await (lock ? query.for('update') : query)
  if (!row) throw notFound()
  return row
}
function permissionRecord(
  row: typeof privacyPermissions.$inferSelect | undefined,
  profileId: string,
  purpose: PrivacyPermissionPurpose,
  createdAt: string,
) {
  const copy = PRIVACY_DISCLOSURES[purpose]
  return privacyPermissionRecordDtoSchema.parse({
    profileId,
    purpose,
    state: row?.state ?? 'not_granted',
    revision: row?.revision ?? 1,
    textVersion: row?.textVersion ?? copy.textVersion,
    textHash: row?.textHash ?? copy.textHash,
    noticeVersion: row?.noticeVersion ?? copy.noticeVersion,
    vendorListVersion: row ? row.vendorListVersion : copy.vendorListVersion,
    updatedAt: row?.updatedAt ?? createdAt,
    reaskNotBefore: row?.reaskNotBefore ?? null,
    sourceOfTruth: 'local_preference',
  })
}
function permissionView(
  record: z.infer<typeof privacyPermissionRecordDtoSchema>,
): PrivacyPermissionView {
  const copy = PRIVACY_DISCLOSURES[record.purpose]
  const textIsCurrent =
    record.textVersion === copy.textVersion &&
    record.textHash === copy.textHash &&
    record.noticeVersion === copy.noticeVersion &&
    record.vendorListVersion === copy.vendorListVersion
  const localPreferenceEnabled =
    record.purpose === 'N-SERVICE' && record.state === 'granted' && textIsCurrent
  return {
    ...record,
    granted: record.state === 'granted',
    localPreferenceEnabled,
    textIsCurrent,
    permissionNotFeature: true,
    featureAvailable: copy.featureAvailable,
    effectiveEnabled: localPreferenceEnabled,
    nativePushEnabled: false,
    osPermission: 'unknown',
    canPrompt: false,
    disclosure: copy,
  }
}
export async function readPrivacyPermission(
  db: Database,
  profileId: string,
  purpose: PrivacyPermissionPurpose,
  now?: string,
): Promise<PrivacyPermissionView> {
  if (now !== undefined) instant(now)
  const owned = await profile(db, profileId)
  const [row] = await db
    .select()
    .from(privacyPermissions)
    .where(
      and(eq(privacyPermissions.profileId, profileId), eq(privacyPermissions.purpose, purpose)),
    )
  return permissionView(permissionRecord(row, profileId, purpose, owned.createdAt))
}

export const privacyProfileEventDtoSchema = z
  .object({
    id: identifier,
    profileId: identifier,
    revision: z.number().int().min(2),
    before: privacySettingsValuesSchema,
    after: privacySettingsValuesSchema,
    occurredAt: z.string(),
  })
  .strict()
export const privacyTransactionEventDtoSchema = z
  .object({
    id: identifier,
    profileId: identifier,
    transactionId: identifier,
    revision: z.number().int().min(2),
    before: transactionPrivacyValuesSchema,
    after: transactionPrivacyValuesSchema,
    occurredAt: z.string(),
  })
  .strict()
export const privacyPermissionEventDtoSchema = z
  .object({
    id: identifier,
    profileId: identifier,
    purpose: purposeSchema,
    revision: z.number().int().min(2),
    action: z.enum(['granted', 'denied', 'revoked']),
    beforeState: stateSchema,
    afterState: z.enum(['granted', 'denied', 'revoked']),
    textVersion: z.string(),
    textHash: z.string().regex(/^[a-f0-9]{64}$/),
    noticeVersion: z.string(),
    vendorListVersion: z.string().nullable(),
    reaskNotBefore: z.string().nullable(),
    sourceOfTruth: z.literal('local_preference'),
    evidenceMethod: z.literal('explicit_choice'),
    uiContext: z.literal('privacy_settings'),
    occurredAt: z.string(),
  })
  .strict()
export const privacyExportDtoSchema = z
  .object({
    settings: privacySettingsDtoSchema,
    transactionFlags: z.array(transactionPrivacyDtoSchema),
    permissions: z.array(privacyPermissionRecordDtoSchema),
    events: z
      .object({
        settings: z.array(privacyProfileEventDtoSchema),
        transactions: z.array(privacyTransactionEventDtoSchema),
        permissions: z.array(privacyPermissionEventDtoSchema),
      })
      .strict(),
  })
  .strict()

/** Caller derives the profile and SQL scope from the validated principal, never a request selector. */
export class PrivacyService {
  constructor(
    readonly db: Database,
    readonly profileId: string,
    readonly now: () => string = () => new Date().toISOString(),
  ) {}
  async readSettings(db: Database = this.db) {
    const owned = await profile(db, this.profileId)
    const [row] = await db
      .select()
      .from(profilePrivacySettings)
      .where(eq(profilePrivacySettings.profileId, this.profileId))
    return {
      profileId: this.profileId,
      rulesOnly: row?.rulesOnly ?? false,
      revision: row?.revision ?? 1,
      updatedAt: row?.updatedAt ?? owned.createdAt,
    }
  }
  async updateRulesOnly(expectedRevision: number, rulesOnly: boolean) {
    if (
      !revision.safeParse(expectedRevision).success ||
      !privacySettingsValuesSchema.safeParse({ rulesOnly }).success
    )
      throw invalid()
    return this.db.transaction(async (db) => {
      await profile(db, this.profileId, true)
      const before = await this.readSettings(db)
      if (before.revision !== expectedRevision) throw changed()
      if (before.rulesOnly === rulesOnly) return before
      const updatedAt = instant(this.now()),
        nextRevision = before.revision + 1
      await db
        .insert(profilePrivacySettings)
        .values({ profileId: this.profileId, rulesOnly, revision: nextRevision, updatedAt })
        .onConflictDoUpdate({
          target: profilePrivacySettings.profileId,
          set: { rulesOnly, revision: nextRevision, updatedAt },
        })
      await db.insert(profilePrivacyEvents).values({
        id: `privacy_profile_${randomUUID()}`,
        profileId: this.profileId,
        revision: nextRevision,
        before: { rulesOnly: before.rulesOnly },
        after: { rulesOnly },
        occurredAt: updatedAt,
      })
      return { profileId: this.profileId, rulesOnly, revision: nextRevision, updatedAt }
    })
  }
  async transaction(id: string, db: Database = this.db) {
    await profile(db, this.profileId)
    const [owned] = await db
      .select({ id: schema.transactions.id, observedAt: schema.transactions.observedAt })
      .from(schema.transactions)
      .where(and(eq(schema.transactions.profileId, this.profileId), eq(schema.transactions.id, id)))
    if (!owned) throw notFound()
    const [row] = await db
      .select()
      .from(transactionPrivacy)
      .where(
        and(
          eq(transactionPrivacy.profileId, this.profileId),
          eq(transactionPrivacy.transactionId, id),
        ),
      )
    return {
      profileId: this.profileId,
      transactionId: id,
      quiet: row?.quiet ?? false,
      private: row?.private ?? false,
      revision: row?.revision ?? 1,
      updatedAt: row?.updatedAt ?? owned.observedAt,
    }
  }
  async updateTransaction(
    id: string,
    expectedRevision: number,
    input: z.infer<typeof transactionPrivacyValuesSchema>,
  ) {
    const parsed = transactionPrivacyValuesSchema.safeParse(input)
    if (
      !parsed.success ||
      !revision.safeParse(expectedRevision).success ||
      !identifier.safeParse(id).success
    )
      throw invalid()
    return this.db.transaction(async (db) => {
      await profile(db, this.profileId, true)
      const before = await this.transaction(id, db)
      if (before.revision !== expectedRevision) throw changed()
      if (before.quiet === parsed.data.quiet && before.private === parsed.data.private)
        return before
      const updatedAt = instant(this.now()),
        nextRevision = before.revision + 1
      await db
        .insert(transactionPrivacy)
        .values({
          profileId: this.profileId,
          transactionId: id,
          ...parsed.data,
          revision: nextRevision,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: [transactionPrivacy.profileId, transactionPrivacy.transactionId],
          set: { ...parsed.data, revision: nextRevision, updatedAt },
        })
      await db.insert(transactionPrivacyEvents).values({
        id: `privacy_transaction_${randomUUID()}`,
        profileId: this.profileId,
        transactionId: id,
        revision: nextRevision,
        before: { quiet: before.quiet, private: before.private },
        after: parsed.data,
        occurredAt: updatedAt,
      })
      return {
        profileId: this.profileId,
        transactionId: id,
        ...parsed.data,
        revision: nextRevision,
        updatedAt,
      }
    })
  }
  async permissions(db: Database = this.db) {
    const owned = await profile(db, this.profileId)
    const rows = await db
      .select()
      .from(privacyPermissions)
      .where(eq(privacyPermissions.profileId, this.profileId))
    return (Object.keys(PRIVACY_DISCLOSURES) as PrivacyPermissionPurpose[]).map((purpose) =>
      permissionView(
        permissionRecord(
          rows.find((row) => row.purpose === purpose),
          this.profileId,
          purpose,
          owned.createdAt,
        ),
      ),
    )
  }
  async setPermission(
    purpose: PrivacyPermissionPurpose,
    expectedRevision: number,
    choice: PrivacyPermissionChoice,
  ) {
    const parsed = permissionChoiceSchema.safeParse(choice)
    if (
      !parsed.success ||
      !purposeSchema.safeParse(purpose).success ||
      !revision.safeParse(expectedRevision).success
    )
      throw invalid()
    return this.db.transaction(async (db) => {
      const owned = await profile(db, this.profileId, true)
      const [stored] = await db
        .select()
        .from(privacyPermissions)
        .where(
          and(
            eq(privacyPermissions.profileId, this.profileId),
            eq(privacyPermissions.purpose, purpose),
          ),
        )
      const before = permissionRecord(stored, this.profileId, purpose, owned.createdAt)
      if (before.revision !== expectedRevision) throw changed()
      const copy = PRIVACY_DISCLOSURES[purpose]
      if (
        parsed.data.action !== 'revoked' &&
        (parsed.data.textVersion !== copy.textVersion ||
          parsed.data.textHash !== copy.textHash ||
          parsed.data.noticeVersion !== copy.noticeVersion ||
          parsed.data.vendorListVersion !== copy.vendorListVersion)
      )
        throw textChanged()
      const metadata = parsed.data.action === 'revoked' ? before : copy
      const updatedAt = instant(this.now()),
        nextRevision = before.revision + 1
      const reaskNotBefore =
        parsed.data.action === 'granted' ? null : privacyReaskNotBefore(updatedAt)
      const values = {
        state: parsed.data.action,
        revision: nextRevision,
        textVersion: metadata.textVersion,
        textHash: metadata.textHash,
        noticeVersion: metadata.noticeVersion,
        vendorListVersion: metadata.vendorListVersion,
        updatedAt,
        reaskNotBefore,
      }
      await db
        .insert(privacyPermissions)
        .values({ profileId: this.profileId, purpose, ...values })
        .onConflictDoUpdate({
          target: [privacyPermissions.profileId, privacyPermissions.purpose],
          set: values,
        })
      await db.insert(privacyPermissionEvents).values({
        id: `privacy_permission_${randomUUID()}`,
        profileId: this.profileId,
        purpose,
        revision: nextRevision,
        action: parsed.data.action,
        beforeState: before.state,
        afterState: parsed.data.action,
        textVersion: metadata.textVersion,
        textHash: metadata.textHash,
        noticeVersion: metadata.noticeVersion,
        vendorListVersion: metadata.vendorListVersion,
        reaskNotBefore,
        sourceOfTruth: 'local_preference',
        evidenceMethod: 'explicit_choice',
        uiContext: 'privacy_settings',
        occurredAt: updatedAt,
      })
      return permissionView({
        profileId: this.profileId,
        purpose,
        ...values,
        sourceOfTruth: 'local_preference',
      })
    })
  }
  async analysisContext(db: Database = this.db, classifications: readonly Classification[] = []) {
    const settings = await this.readSettings(db)
    const flags = await db
      .select()
      .from(transactionPrivacy)
      .where(eq(transactionPrivacy.profileId, this.profileId))
    return {
      rulesOnly: settings.rulesOnly,
      ...privacyClassificationOptions(settings),
      excludedTransactionIds: privacyExcludedTransactionIds(flags, classifications),
      revision: settings.revision,
    }
  }
  async exportAudit(db: Database = this.db) {
    const settings = await this.readSettings(db)
    const flags = await db
      .select()
      .from(transactionPrivacy)
      .where(eq(transactionPrivacy.profileId, this.profileId))
      .orderBy(asc(transactionPrivacy.transactionId))
    const settingsEvents = await db
      .select()
      .from(profilePrivacyEvents)
      .where(eq(profilePrivacyEvents.profileId, this.profileId))
      .orderBy(asc(profilePrivacyEvents.revision))
    const transactionEvents = await db
      .select()
      .from(transactionPrivacyEvents)
      .where(eq(transactionPrivacyEvents.profileId, this.profileId))
      .orderBy(asc(transactionPrivacyEvents.transactionId), asc(transactionPrivacyEvents.revision))
    const permissionEvents = await db
      .select()
      .from(privacyPermissionEvents)
      .where(eq(privacyPermissionEvents.profileId, this.profileId))
      .orderBy(asc(privacyPermissionEvents.purpose), asc(privacyPermissionEvents.revision))
    const omitScope = <T extends { householdId: string }>(row: T) => {
      const { householdId: _household, ...rest } = row
      return rest
    }
    return privacyExportDtoSchema.parse({
      settings,
      transactionFlags: flags.map(omitScope),
      permissions: (await this.permissions(db)).map((row) =>
        privacyPermissionRecordDtoSchema.parse({
          profileId: row.profileId,
          purpose: row.purpose,
          state: row.state,
          revision: row.revision,
          textVersion: row.textVersion,
          textHash: row.textHash,
          noticeVersion: row.noticeVersion,
          vendorListVersion: row.vendorListVersion,
          updatedAt: row.updatedAt,
          reaskNotBefore: row.reaskNotBefore,
          sourceOfTruth: row.sourceOfTruth,
        }),
      ),
      events: {
        settings: settingsEvents.map(omitScope),
        transactions: transactionEvents.map(omitScope),
        permissions: permissionEvents.map(omitScope),
      },
    })
  }
}

const problemDto = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  code: z.string(),
  detail: z.string(),
  instance: z.string(),
})
const errors = {
  400: problemDto,
  401: problemDto,
  403: problemDto,
  404: problemDto,
  409: problemDto,
  500: problemDto,
}
export function registerPrivacyRoutes(
  app: FastifyInstance,
  resolve: (request: FastifyRequest) => Promise<PrivacyService> | PrivacyService,
) {
  const api = app.withTypeProvider<ZodTypeProvider>()
  api.get(
    '/v1/privacy/settings',
    { schema: { response: { 200: privacySettingsDtoSchema, ...errors } } },
    async (request) => (await resolve(request)).readSettings(),
  )
  api.patch(
    '/v1/privacy/settings',
    {
      schema: {
        body: privacySettingsValuesSchema.extend({ revision }),
        response: { 200: privacySettingsDtoSchema, ...errors },
      },
    },
    async (request) =>
      (await resolve(request)).updateRulesOnly(request.body.revision, request.body.rulesOnly),
  )
  api.get(
    '/v1/transactions/:id/privacy',
    {
      schema: {
        params: z.object({ id: identifier }).strict(),
        response: { 200: transactionPrivacyDtoSchema, ...errors },
      },
    },
    async (request) => (await resolve(request)).transaction(request.params.id),
  )
  api.patch(
    '/v1/transactions/:id/privacy',
    {
      schema: {
        params: z.object({ id: identifier }).strict(),
        body: transactionPrivacyValuesSchema.extend({ revision }),
        response: { 200: transactionPrivacyDtoSchema, ...errors },
      },
    },
    async (request) =>
      (await resolve(request)).updateTransaction(request.params.id, request.body.revision, {
        quiet: request.body.quiet,
        private: request.body.private,
      }),
  )
  api.get(
    '/v1/privacy/permissions',
    {
      schema: {
        response: {
          200: z.object({ permissions: z.array(privacyPermissionDtoSchema) }).strict(),
          ...errors,
        },
      },
    },
    async (request) => ({ permissions: await (await resolve(request)).permissions() }),
  )
  api.patch(
    '/v1/privacy/permissions/:purpose',
    {
      schema: {
        params: z.object({ purpose: purposeSchema }).strict(),
        body: permissionRequestSchema,
        response: { 200: privacyPermissionDtoSchema, ...errors },
      },
    },
    async (request) => {
      const { revision, ...choice } = request.body
      return (await resolve(request)).setPermission(request.params.purpose, revision, choice)
    },
  )
}
