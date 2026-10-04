import { createHash } from 'node:crypto'
import type { Database } from '@lilleri/database'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import {
  assertConnectionCreationOwnershipReferences,
  connectionCreationOwnershipDto,
  connectionCreationOwnershipExport,
} from './connection-creation-export.js'
import { consentEvents, consentLifecycles } from './consent-lifecycle-schema.js'
import type { ProfileEncryption } from './encryption.js'
import { savedCsvMappingDto } from './mapped-import-dto.js'
import {
  csvMappingEventDto,
  exportMappedImportAudit,
  mappedImportAuditDto,
  mappedProvenanceDto,
} from './mapped-import-export.js'
import { MerchantTaxonomyService } from './merchant-taxonomy.js'
import {
  merchantTaxonomyExportDtoSchema,
  validateMerchantTaxonomyExport,
} from './merchant-taxonomy-export.js'
import {
  NOTIFICATION_TITLES,
  NotificationsService,
  notificationFeedDto,
  notificationPreferenceValuesSchema,
} from './notifications.js'
import {
  assertPendingOwnershipReferences,
  PendingLifecycleService,
  pendingOwnershipDto,
} from './pending-lifecycle.js'
import {
  PrivacyService,
  privacyExportDtoSchema,
  privacyPermissionEventDtoSchema,
  privacyPermissionRecordDtoSchema,
  privacyProfileEventDtoSchema,
  privacySettingsDtoSchema,
  privacyTransactionEventDtoSchema,
  transactionPrivacyDtoSchema,
} from './privacy.js'
import { recurringOwnershipSchemas, validateRecurringOwnershipExport } from './recurring-export.js'
import {
  type SourceErasureVerifier,
  sourceErasureOwnershipSchemas,
  validateSourceErasureOwnershipExport,
} from './source-erasure-export.js'
import {
  supportApprovals,
  supportEvents,
  supportGrants,
  supportRequests,
} from './support-access-schema.js'
import {
  assertSyncOwnershipReferences,
  syncOwnershipDto,
  syncOwnershipExport,
} from './sync-export.js'
import { understandingOwnershipExportDto } from './understanding-persistence-dto.js'
import { validateUnderstandingOwnershipExport } from './understanding-persistence-validation.js'

const identifier = z.string().min(1).max(256)
const instant = z.iso.datetime({ offset: true })
const revision = z.number().int().min(1).max(2_147_483_647)
const operator = z.string().regex(/^op_[a-f0-9]{32}$/)
const digest = z.string().regex(/^[a-f0-9]{64}$/)
const savedMapping = savedCsvMappingDto.extend({ createdAt: instant, updatedAt: instant })
const exportedMappedImports = mappedImportAuditDto.extend({
  mappings: z.array(savedMapping),
  events: z.array(
    csvMappingEventDto.extend({
      before: savedMapping.nullable(),
      after: savedMapping,
      createdAt: instant,
    }),
  ),
  provenance: z.array(
    mappedProvenanceDto.extend({ valueOn: z.iso.date().nullable(), createdAt: instant }),
  ),
})
const notificationKind = z.enum([
  'inbox',
  'consent_reminder',
  'balance_mismatch',
  'connection_expired',
  'connection_paused',
  'summary_ready',
  'security_notice',
  'export_ready',
  'deletion_status',
  'rights_action',
])
const exportedNotifications = z.strictObject({
  preferences: notificationPreferenceValuesSchema.extend({
    revision,
    updatedAt: instant.nullable(),
    timezone: identifier,
    nativePushAvailable: z.literal(false),
    osPermission: z.literal('unknown'),
  }),
  notifications: z.array(
    z.strictObject({
      id: z.uuid(),
      profileId: identifier,
      kind: notificationKind,
      textVersion: z.literal('notification-text-v1'),
      dedupKey: digest,
      permissionRevision: revision.nullable(),
      connectionId: identifier.nullable(),
      consentId: identifier.nullable(),
      sourceGeneration: digest.nullable(),
      sourceAction: z
        .enum(['renew_consent', 'perform_sca', 'renew_session', 'reconnect'])
        .nullable(),
      sourceDeadline: instant.nullable(),
      offsetSeconds: z.number().int().min(1).max(2_592_000).nullable(),
      dueAt: instant,
      status: z.enum(['queued', 'delivered', 'cancelled', 'suppressed']),
      createdAt: instant,
      deliveredAt: instant.nullable(),
      seenAt: instant.nullable(),
      revision,
    }),
  ),
  events: z.array(
    z.strictObject({
      id: z.uuid(),
      profileId: identifier,
      notificationId: z.uuid().nullable(),
      action: z.enum([
        'preferences_changed',
        'queued',
        'delivered',
        'cancelled',
        'suppressed',
        'seen',
      ]),
      revision,
      before: notificationPreferenceValuesSchema.nullable(),
      after: notificationPreferenceValuesSchema.nullable(),
      occurredAt: instant,
    }),
  ),
  feed: z.array(notificationFeedDto.extend({ deliveredAt: instant, seenAt: instant.nullable() })),
})

// Metadata describes provider consent/SCA/session clocks; it never contains a credential.
export const exportedProviderTerms = z.strictObject({
  providerId: identifier,
  institutionId: identifier,
  state: z.enum(['active', 'requires_action', 'expired', 'revoked', 'unknown']),
  consentExpiresAt: instant.nullable(),
  scaDueAt: instant.nullable(),
  providerSessionExpiresAt: instant.nullable(),
  tokenExpiresAt: instant.nullable(),
  requiredActions: z
    .array(
      z.strictObject({
        action: z.enum(['renew_consent', 'perform_sca', 'renew_session', 'reconnect']),
        method: z.enum(['redirect', 'in_place', 'new_connection']),
        dueAt: instant.nullable(),
        evidenceReference: identifier,
      }),
    )
    .max(4),
})
const providerMetadata = z.strictObject({
  providerId: identifier,
  environment: z.enum(['synthetic', 'sandbox', 'live']),
  coverageVersion: identifier,
  pagination: z.strictObject({
    maxPageSize: z.number().int().min(1).max(1000),
    maxPages: z.number().int().min(1).max(1000),
    maxCursorBytes: z.number().int().min(1).max(4096),
  }),
  refresh: z.strictObject({
    userPresent: z.enum(['supported', 'unsupported', 'unknown']),
    unattendedBudget: z
      .strictObject({
        requests: z.number().int().min(0).max(10_000),
        windowSeconds: z.number().int().min(1).max(31_536_000),
        evidenceReference: identifier,
      })
      .nullable(),
  }),
  renewal: z.enum(['supported', 'unsupported', 'unknown']),
})
const consentRow = {
  profileId: identifier,
  connectionId: identifier,
  consentId: identifier,
  revision,
  terms: exportedProviderTerms,
  providerMetadata: providerMetadata.nullable(),
}
export const exportedConsentLifecycle = z.strictObject({
  ...consentRow,
  paused: z.boolean(),
  source: z.enum(['provider', 'legacy']),
  providerError: z.enum(['unavailable', 'requires_action']).nullable(),
  updatedAt: instant,
})
export const exportedConsentEvent = z.strictObject({
  ...consentRow,
  id: identifier,
  action: z.enum([
    'granted',
    'renewed',
    'paused',
    'resumed',
    'revoked',
    'provider_error',
    'provider_recovered',
    'legacy_imported',
  ]),
  source: z.enum(['provider', 'user', 'legacy']),
  occurredAt: instant,
})
const supportGrant = z.strictObject({
  id: z.uuid(),
  profileId: identifier,
  ticketId: z.string().regex(/^TKT_[A-Z0-9]{8,32}$/),
  reason: z.enum(['sync_issue', 'data_rights', 'security_issue']),
  grantedAt: instant,
  expiresAt: instant,
  revokedAt: instant.nullable(),
  revision: z.number().int().min(1).max(2),
})
const supportRequest = z.strictObject({
  id: z.uuid(),
  profileId: identifier,
  grantId: z.uuid(),
  requestedBy: operator,
  reason: z.enum(['service_outage', 'security_incident']),
  requestedAt: instant,
  expiresAt: instant,
})
const supportApproval = z.strictObject({
  id: z.uuid(),
  profileId: identifier,
  requestId: z.uuid(),
  approvedBy: operator,
  approvedAt: instant,
})
const supportEvent = z.strictObject({
  id: z.uuid(),
  profileId: identifier,
  grantId: z.uuid(),
  requestId: z.uuid().nullable(),
  action: z.enum([
    'granted',
    'revoked',
    'break_glass_requested',
    'break_glass_approved',
    'masked_view_read',
    'break_glass_read',
  ]),
  actorKind: z.enum(['user', 'operator']),
  operatorId: operator.nullable(),
  occurredAt: instant,
})
export const exportedSupportAccess = z.strictObject({
  grants: z.array(supportGrant),
  requests: z.array(supportRequest),
  approvals: z.array(supportApproval),
  events: z.array(supportEvent),
})

const privacyExport = privacyExportDtoSchema
  .extend({
    settings: privacySettingsDtoSchema.extend({ updatedAt: instant }).strict(),
    transactionFlags: z.array(transactionPrivacyDtoSchema.extend({ updatedAt: instant }).strict()),
    permissions: z.array(
      privacyPermissionRecordDtoSchema.extend({
        updatedAt: instant,
        reaskNotBefore: instant.nullable(),
      }),
    ),
    events: z.strictObject({
      settings: z.array(privacyProfileEventDtoSchema.extend({ occurredAt: instant })),
      transactions: z.array(privacyTransactionEventDtoSchema.extend({ occurredAt: instant })),
      permissions: z.array(
        privacyPermissionEventDtoSchema.extend({
          occurredAt: instant,
          reaskNotBefore: instant.nullable(),
        }),
      ),
    }),
  })
  .strict()

/** Optional additions preserve the existing version-1 import/export contract. */
export const ownershipExportSchemas = {
  consentLifecycles: z.array(exportedConsentLifecycle).optional(),
  consentEvents: z.array(exportedConsentEvent).optional(),
  supportAccess: exportedSupportAccess.optional(),
  privacy: privacyExport.optional(),
  notifications: exportedNotifications.optional(),
  mappedImports: exportedMappedImports.optional(),
  merchantTaxonomy: merchantTaxonomyExportDtoSchema.optional(),
  sync: syncOwnershipDto.optional(),
  pendingLifecycle: pendingOwnershipDto.optional(),
  recurringPreferences: recurringOwnershipSchemas.recurringPreferences.optional(),
  recurringPreferenceEvents: recurringOwnershipSchemas.recurringPreferenceEvents.optional(),
  sourceErasures: sourceErasureOwnershipSchemas.sourceErasures.optional(),
  connectionCreation: connectionCreationOwnershipDto.optional(),
  understandingPersistence: understandingOwnershipExportDto.optional(),
}
const ownershipExport = z.strictObject(ownershipExportSchemas)
export type OwnershipExport = z.infer<typeof ownershipExport>

/** Every read uses the caller's existing financial snapshot transaction, in sequence. */
export async function augmentOwnershipExport(
  db: Database,
  profileId: string,
  encryption?: ProfileEncryption,
  now: () => string = () => new Date().toISOString(),
): Promise<OwnershipExport> {
  const lifecycles = await db
    .select()
    .from(consentLifecycles)
    .where(eq(consentLifecycles.profileId, profileId))
    .orderBy(asc(consentLifecycles.connectionId))
  const consentHistory = await db
    .select()
    .from(consentEvents)
    .where(eq(consentEvents.profileId, profileId))
    .orderBy(asc(consentEvents.occurredAt), asc(consentEvents.id))
  const grants = await db
    .select()
    .from(supportGrants)
    .where(eq(supportGrants.profileId, profileId))
    .orderBy(asc(supportGrants.grantedAt), asc(supportGrants.id))
  const requests = await db
    .select()
    .from(supportRequests)
    .where(eq(supportRequests.profileId, profileId))
    .orderBy(asc(supportRequests.requestedAt), asc(supportRequests.id))
  const approvals = await db
    .select()
    .from(supportApprovals)
    .where(eq(supportApprovals.profileId, profileId))
    .orderBy(asc(supportApprovals.approvedAt), asc(supportApprovals.id))
  const events = await db
    .select()
    .from(supportEvents)
    .where(eq(supportEvents.profileId, profileId))
    .orderBy(asc(supportEvents.occurredAt), asc(supportEvents.id))
  const privacy = await new PrivacyService(db, profileId).exportAudit(db)
  const notificationData = await new NotificationsService(db, profileId).export()
  const mappedImports = await exportMappedImportAudit(db, profileId, encryption)
  const notificationFeed = notificationData.notifications
    .filter((row) => row.status === 'delivered')
    .map((row) => ({
      id: row.id,
      type: row.kind,
      title: NOTIFICATION_TITLES[row.kind],
      textVersion: row.textVersion,
      deliveredAt: row.deliveredAt,
      seenAt: row.seenAt,
      revision: row.revision,
    }))
  const renameTerms = ({
    householdId: _household,
    authorization,
    ...row
  }: typeof consentLifecycles.$inferSelect) => ({ ...row, terms: authorization })
  const lifecycleRows = lifecycles.map(renameTerms)
  const eventRows = consentHistory.map(({ householdId: _household, authorization, ...row }) => ({
    ...row,
    terms: authorization,
  }))
  return ownershipExport.parse({
    consentLifecycles: lifecycleRows,
    consentEvents: eventRows,
    supportAccess: { grants, requests, approvals, events },
    privacy,
    notifications: { ...notificationData, feed: notificationFeed },
    mappedImports,
    sync: await syncOwnershipExport(db, profileId),
    pendingLifecycle: await new PendingLifecycleService(db, profileId, now, encryption).ownership(),
    connectionCreation: await connectionCreationOwnershipExport(db, profileId),
    merchantTaxonomy: await new MerchantTaxonomyService(
      db,
      profileId,
      undefined,
      encryption,
    ).exportAudit(db),
  })
}

interface ExportReference {
  readonly id: string
  readonly profileId: string
  readonly connectionId?: string
  readonly providerId?: string
  readonly institutionId?: string
  readonly accountId?: string
  readonly transactionId?: string
  readonly providerTransactionId?: string
  readonly providerRecordId?: string
}
interface OwnershipSnapshot {
  readonly profile: { readonly id: string; readonly createdAt?: string }
  readonly exportedAt: string
  readonly connections: readonly ExportReference[]
  readonly consents: readonly ExportReference[]
  readonly transactions: readonly ExportReference[]
  readonly accounts: readonly ExportReference[]
  readonly sourceObservations: readonly ExportReference[]
}
function fail(): never {
  throw new Error('Invalid ownership export snapshot')
}
function unique<T>(rows: readonly T[], key: (row: T) => string): Map<string, T> {
  const map = new Map<string, T>()
  for (const row of rows) {
    const id = key(row)
    if (map.has(id)) fail()
    map.set(id, row)
  }
  return map
}
function noLaterThan(value: string, upper: number) {
  if (!Number.isFinite(Date.parse(value)) || Date.parse(value) > upper) fail()
}
function window(start: string, end: string, maximum: number) {
  const duration = Date.parse(end) - Date.parse(start)
  if (!Number.isFinite(duration) || duration <= 0 || duration > maximum) fail()
}

/** Pure semantic checks supplement machine-readable shapes for direct ZIP callers. */
export interface OwnershipExportValidationOptions {
  readonly verifySourceErasure?: SourceErasureVerifier
}
export function validateOwnershipExport(
  value: Record<string, unknown>,
  options: OwnershipExportValidationOptions = {},
): OwnershipExport {
  const selected: Record<string, unknown> = {}
  for (const key of Object.keys(ownershipExportSchemas))
    if (Object.hasOwn(value, key)) selected[key] = value[key]
  const parsed = ownershipExport.parse(selected)
  const attested = validateSourceErasureOwnershipExport(
    value as unknown as Parameters<typeof validateSourceErasureOwnershipExport>[0],
    options.verifySourceErasure,
  )
  validateMerchantTaxonomyExport(value, attested)
  validateRecurringOwnershipExport(
    value as unknown as Parameters<typeof validateRecurringOwnershipExport>[0],
  )
  const snapshot = value as unknown as OwnershipSnapshot
  const profileId = snapshot.profile.id
  const exportedAt = Date.parse(snapshot.exportedAt)
  if (!Number.isFinite(exportedAt)) fail()
  if (parsed.understandingPersistence)
    validateUnderstandingOwnershipExport(parsed.understandingPersistence, {
      profileId,
      accountIds: snapshot.accounts.map((row) => row.id),
      transactionIds: snapshot.transactions.map((row) => row.id),
      accounts: snapshot.accounts,
      transactions: snapshot.transactions,
      sourceReceiptIds: parsed.sourceErasures?.map((row) => row.signed.body.id) ?? [],
      exportedAt: snapshot.exportedAt,
      ...(snapshot.profile.createdAt ? { profileCreatedAt: snapshot.profile.createdAt } : {}),
    } as unknown as Parameters<typeof validateUnderstandingOwnershipExport>[1])
  if (parsed.connectionCreation)
    assertConnectionCreationOwnershipReferences(parsed.connectionCreation, {
      profileId,
      exportedAt: snapshot.exportedAt,
      connections: snapshot.connections,
      consents: snapshot.consents,
      revocationJobs: value.revocationJobs ?? [],
      sourceErasureReceipts: parsed.sourceErasures?.map((row) => row.signed.body),
    } as unknown as Parameters<typeof assertConnectionCreationOwnershipReferences>[1])
  if (parsed.sync)
    assertSyncOwnershipReferences(parsed.sync, {
      profileId,
      exportedAt: snapshot.exportedAt,
      connections: snapshot.connections,
      consents: snapshot.consents,
      accounts: snapshot.accounts,
      transactions: snapshot.transactions,
    } as unknown as Parameters<typeof assertSyncOwnershipReferences>[1])
  const connections = unique(snapshot.connections, (row) => row.id)
  if (parsed.pendingLifecycle)
    assertPendingOwnershipReferences(parsed.pendingLifecycle, {
      profileId,
      exportedAt: snapshot.exportedAt,
      transactions: snapshot.transactions,
    } as unknown as Parameters<typeof assertPendingOwnershipReferences>[1])
  const consents = unique(snapshot.consents, (row) => row.id)
  const lifecycleRows = parsed.consentLifecycles ?? []
  const consentRows = parsed.consentEvents ?? []
  if ((parsed.consentLifecycles === undefined) !== (parsed.consentEvents === undefined)) fail()
  unique(lifecycleRows, (row) => row.connectionId)
  unique(consentRows, (row) => row.id)
  unique(consentRows, (row) => `${row.connectionId}\0${row.revision}`)
  for (const row of [...lifecycleRows, ...consentRows]) {
    const connection = connections.get(row.connectionId),
      consent = consents.get(row.consentId)
    if (
      row.profileId !== profileId ||
      !connection ||
      !consent ||
      connection.profileId !== profileId ||
      consent.profileId !== profileId ||
      consent.connectionId !== row.connectionId ||
      row.terms.providerId !== connection.providerId ||
      row.terms.institutionId !== connection.institutionId ||
      (row.providerMetadata && row.providerMetadata.providerId !== row.terms.providerId)
    )
      fail()
    const seen = new Set<string>()
    for (const action of row.terms.requiredActions) {
      if (seen.has(action.action)) fail()
      seen.add(action.action)
    }
    noLaterThan('occurredAt' in row ? row.occurredAt : row.updatedAt, exportedAt)
  }
  if (parsed.consentEvents !== undefined) {
    for (const lifecycle of lifecycleRows) {
      const history = consentRows
        .filter((row) => row.connectionId === lifecycle.connectionId)
        .sort((a, b) => a.revision - b.revision)
      const latest = history.at(-1)
      const previous = history.at(-2)
      const updatedAt = Date.parse(lifecycle.updatedAt)
      if (
        history.length !== lifecycle.revision ||
        history.some((row, index) => row.revision !== index + 1) ||
        history.some(
          (row, index) =>
            index > 0 &&
            Date.parse(row.occurredAt) < Date.parse(history[index - 1]?.occurredAt ?? ''),
        ) ||
        latest?.consentId !== lifecycle.consentId ||
        JSON.stringify(latest?.terms) !== JSON.stringify(lifecycle.terms) ||
        JSON.stringify(latest?.providerMetadata) !== JSON.stringify(lifecycle.providerMetadata) ||
        // Historical producers updated the head before capturing the event's timestamp.
        // Preserve that original latency while requiring a causally ordered current revision.
        updatedAt > Date.parse(latest?.occurredAt ?? '') ||
        (previous && updatedAt < Date.parse(previous.occurredAt))
      )
        fail()
    }
  }
  if (parsed.supportAccess) {
    const {
      grants: grantRows,
      requests: requestRows,
      approvals: approvalRows,
      events: eventRows,
    } = parsed.supportAccess
    const grants = unique(grantRows, (row) => row.id),
      requests = unique(requestRows, (row) => row.id)
    unique(approvalRows, (row) => row.id)
    unique(eventRows, (row) => row.id)
    unique(approvalRows, (row) => `${row.requestId}\0${row.approvedBy}`)
    for (const row of [...grantRows, ...requestRows, ...approvalRows, ...eventRows])
      if (row.profileId !== profileId) fail()
    for (const row of grantRows) {
      if (row.revision !== (row.revokedAt === null ? 1 : 2)) fail()
      window(row.grantedAt, row.expiresAt, 15 * 60_000)
      noLaterThan(row.grantedAt, exportedAt)
      if (row.revokedAt !== null) {
        if (Date.parse(row.revokedAt) < Date.parse(row.grantedAt)) fail()
        noLaterThan(row.revokedAt, exportedAt)
      }
    }
    for (const row of requestRows) {
      const grant = grants.get(row.grantId)
      if (
        !grant ||
        Date.parse(row.requestedAt) < Date.parse(grant.grantedAt) ||
        Date.parse(row.expiresAt) > Date.parse(grant.expiresAt)
      )
        fail()
      window(row.requestedAt, row.expiresAt, 15 * 60_000)
      noLaterThan(row.requestedAt, exportedAt)
    }
    const approvalCounts = new Map<string, number>()
    for (const row of approvalRows) {
      const request = requests.get(row.requestId)
      if (
        !request ||
        row.approvedBy === request.requestedBy ||
        Date.parse(row.approvedAt) < Date.parse(request.requestedAt) ||
        Date.parse(row.approvedAt) >= Date.parse(request.expiresAt)
      )
        fail()
      noLaterThan(row.approvedAt, exportedAt)
      const count = (approvalCounts.get(row.requestId) ?? 0) + 1
      if (count > 2) fail()
      approvalCounts.set(row.requestId, count)
    }
    for (const row of eventRows) {
      const grant = grants.get(row.grantId),
        request = row.requestId === null ? null : requests.get(row.requestId)
      if (
        !grant ||
        (row.requestId !== null && (!request || request.grantId !== row.grantId)) ||
        Date.parse(row.occurredAt) < Date.parse(grant.grantedAt)
      )
        fail()
      noLaterThan(row.occurredAt, exportedAt)
      if (
        row.actorKind === 'user' &&
        (row.operatorId !== null || !['granted', 'revoked'].includes(row.action))
      )
        fail()
      if (
        row.actorKind === 'operator' &&
        (row.operatorId === null || ['granted', 'revoked'].includes(row.action))
      )
        fail()
      if (row.action === 'granted' && row.occurredAt !== grant.grantedAt) fail()
      if (row.action === 'revoked' && row.occurredAt !== grant.revokedAt) fail()
      if (
        ['break_glass_requested', 'break_glass_approved', 'break_glass_read'].includes(
          row.action,
        ) &&
        !request
      )
        fail()
      if (
        row.action === 'break_glass_requested' &&
        request &&
        (row.operatorId !== request.requestedBy ||
          Date.parse(row.occurredAt) !== Date.parse(request.requestedAt))
      )
        fail()
      if (
        row.action === 'break_glass_approved' &&
        request &&
        !approvalRows.some(
          (approval) =>
            approval.requestId === request.id &&
            approval.approvedBy === row.operatorId &&
            Date.parse(approval.approvedAt) === Date.parse(row.occurredAt),
        )
      )
        fail()
      if (
        row.action === 'break_glass_read' &&
        request &&
        (approvalCounts.get(request.id) !== 2 ||
          approvalRows.some(
            (approval) =>
              approval.requestId === request.id &&
              Date.parse(approval.approvedAt) > Date.parse(row.occurredAt),
          ))
      )
        fail()
    }
    for (const grant of grantRows) {
      const history = eventRows.filter((event) => event.grantId === grant.id)
      if (
        history.filter((event) => event.action === 'granted').length !== 1 ||
        history.filter((event) => event.action === 'revoked').length !==
          (grant.revokedAt === null ? 0 : 1)
      )
        fail()
    }
    for (const request of requestRows)
      if (
        eventRows.filter(
          (event) => event.requestId === request.id && event.action === 'break_glass_requested',
        ).length !== 1
      )
        fail()
    for (const approval of approvalRows)
      if (
        eventRows.filter(
          (event) =>
            event.requestId === approval.requestId &&
            event.action === 'break_glass_approved' &&
            event.operatorId === approval.approvedBy &&
            Date.parse(event.occurredAt) === Date.parse(approval.approvedAt),
        ).length !== 1
      )
        fail()
  }
  if (parsed.privacy) {
    const { settings, transactionFlags, permissions, events } = parsed.privacy
    const transactionIds = new Set(snapshot.transactions.map((row) => row.id))
    const flags = unique(transactionFlags, (row) => row.transactionId)
    const choices = unique(permissions, (row) => row.purpose)
    if (choices.size !== 3 || settings.profileId !== profileId) fail()
    unique(events.settings, (row) => row.id)
    unique(events.transactions, (row) => row.id)
    unique(events.permissions, (row) => row.id)
    unique(events.settings, (row) => String(row.revision))
    unique(events.transactions, (row) => `${row.transactionId}\0${row.revision}`)
    unique(events.permissions, (row) => `${row.purpose}\0${row.revision}`)
    for (const row of [
      ...transactionFlags,
      ...permissions,
      ...events.settings,
      ...events.transactions,
      ...events.permissions,
    ])
      if (row.profileId !== profileId) fail()
    noLaterThan(settings.updatedAt, exportedAt)
    for (const row of [...transactionFlags, ...permissions]) noLaterThan(row.updatedAt, exportedAt)
    for (const row of [...events.settings, ...events.transactions, ...events.permissions])
      noLaterThan(row.occurredAt, exportedAt)
    const settingHistory = [...events.settings].sort((a, b) => a.revision - b.revision)
    if (
      settingHistory.length !== settings.revision - 1 ||
      (settings.revision === 1 && settings.rulesOnly) ||
      settingHistory.some((row, index) => row.revision !== index + 2) ||
      (settingHistory.length > 0 && settingHistory.at(-1)?.after.rulesOnly !== settings.rulesOnly)
    )
      fail()
    for (const row of transactionFlags) {
      if (!transactionIds.has(row.transactionId)) fail()
      const history = events.transactions
        .filter((event) => event.transactionId === row.transactionId)
        .sort((a, b) => a.revision - b.revision)
      const latest = history.at(-1)
      if (
        history.length !== row.revision - 1 ||
        (row.revision === 1 && (row.quiet || row.private)) ||
        history.some((event, index) => event.revision !== index + 2) ||
        (latest && (latest.after.quiet !== row.quiet || latest.after.private !== row.private))
      )
        fail()
    }
    for (const event of events.transactions)
      if (!flags.has(event.transactionId) || !transactionIds.has(event.transactionId)) fail()
    for (const row of permissions) {
      if (row.reaskNotBefore !== null && Date.parse(row.reaskNotBefore) < Date.parse(row.updatedAt))
        fail()
      const history = events.permissions
        .filter((event) => event.purpose === row.purpose)
        .sort((a, b) => a.revision - b.revision)
      if (
        history.length !== row.revision - 1 ||
        history.some((event, index) => event.revision !== index + 2) ||
        (row.revision === 1 && row.state !== 'not_granted') ||
        (row.revision > 1 && history.at(-1)?.afterState !== row.state)
      )
        fail()
      let state = 'not_granted'
      for (const event of history) {
        if (
          event.action !== event.afterState ||
          event.beforeState !== state ||
          (event.reaskNotBefore !== null &&
            Date.parse(event.reaskNotBefore) < Date.parse(event.occurredAt))
        )
          fail()
        state = event.afterState
      }
    }
    for (const event of events.permissions) if (!choices.has(event.purpose)) fail()
  }
  if (parsed.notifications) {
    const { preferences, notifications, events, feed } = parsed.notifications
    if (preferences.timezone !== (value.profile as Record<string, unknown>).timezone) fail()
    if (preferences.updatedAt !== null) noLaterThan(preferences.updatedAt, exportedAt)
    const rows = unique(notifications, (row) => row.id)
    unique(notifications, (row) => row.dedupKey)
    unique(events, (row) => row.id)
    unique(events, (row) => `${row.notificationId ?? 'preferences'}\0${row.revision}`)
    unique(feed, (row) => row.id)
    const preferenceHistory = events
      .filter((row) => row.action === 'preferences_changed')
      .sort((a, b) => a.revision - b.revision)
    if (
      preferenceHistory.length !== preferences.revision - 1 ||
      preferenceHistory.some((row, index) => row.revision !== index + 2) ||
      (preferenceHistory.length > 0 &&
        JSON.stringify(preferenceHistory.at(-1)?.after) !==
          JSON.stringify({ types: preferences.types, quietHours: preferences.quietHours }))
    )
      fail()
    for (const event of events) {
      if (event.profileId !== profileId) fail()
      noLaterThan(event.occurredAt, exportedAt)
      if (event.action === 'preferences_changed') {
        if (event.notificationId !== null || event.before === null || event.after === null) fail()
      } else if (
        event.notificationId === null ||
        !rows.has(event.notificationId) ||
        event.before !== null ||
        event.after !== null
      )
        fail()
    }
    const mandatory = new Set([
      'security_notice',
      'export_ready',
      'deletion_status',
      'rights_action',
    ])
    for (const row of notifications) {
      if (row.profileId !== profileId) fail()
      noLaterThan(row.createdAt, exportedAt)
      if (row.deliveredAt !== null) {
        noLaterThan(row.deliveredAt, exportedAt)
        if (Date.parse(row.deliveredAt) < Date.parse(row.createdAt)) fail()
      }
      if (row.seenAt !== null) {
        noLaterThan(row.seenAt, exportedAt)
        if (row.deliveredAt === null || Date.parse(row.seenAt) < Date.parse(row.deliveredAt)) fail()
      }
      if ((row.status === 'delivered') !== (row.deliveredAt !== null)) fail()
      if (row.status !== 'delivered' && row.seenAt !== null) fail()
      if (mandatory.has(row.kind) !== (row.permissionRevision === null)) fail()
      const connection = row.connectionId === null ? null : connections.get(row.connectionId)
      const consent = row.consentId === null ? null : consents.get(row.consentId)
      if (
        (row.connectionId !== null && (!connection || connection.profileId !== profileId)) ||
        (row.consentId !== null &&
          (!consent ||
            consent.profileId !== profileId ||
            consent.connectionId !== row.connectionId))
      )
        fail()
      if (
        row.kind === 'consent_reminder' &&
        (!connection ||
          !consent ||
          row.sourceGeneration === null ||
          row.sourceAction === null ||
          row.sourceDeadline === null ||
          row.offsetSeconds === null)
      )
        fail()
      const history = events
        .filter((event) => event.notificationId === row.id)
        .sort((a, b) => a.revision - b.revision)
      const latest = history.at(-1)
      if (
        history.length !== row.revision ||
        history.some((event, index) => event.revision !== index + 1) ||
        history[0]?.action !== 'queued' ||
        !latest ||
        (latest.action === 'seen' ? row.status !== 'delivered' : latest.action !== row.status) ||
        (row.seenAt !== null && Date.parse(latest.occurredAt) !== Date.parse(row.seenAt))
      )
        fail()
    }
    const delivered = notifications.filter((row) => row.status === 'delivered')
    if (feed.length !== delivered.length) fail()
    for (const item of feed) {
      const row = rows.get(item.id)
      if (
        row?.status !== 'delivered' ||
        item.type !== row.kind ||
        item.title !== NOTIFICATION_TITLES[row.kind] ||
        item.textVersion !== row.textVersion ||
        item.deliveredAt !== row.deliveredAt ||
        item.seenAt !== row.seenAt ||
        item.revision !== row.revision
      )
        fail()
    }
  }
  if (parsed.mappedImports) {
    const { mappings, events, provenance } = parsed.mappedImports
    const accounts = unique(snapshot.accounts, (row) => row.id)
    const transactions = unique(snapshot.transactions, (row) => row.id)
    const observations = unique(snapshot.sourceObservations, (row) => row.id)
    const mappingById = unique(mappings, (row) => row.id)
    unique(events, (row) => row.id)
    unique(events, (row) => `${row.mappingId}\0${row.revision}`)
    unique(provenance, (row) => row.observationId)
    const checkMapping = (row: z.infer<typeof savedMapping>) => {
      if (row.profileId !== profileId || accounts.get(row.accountId)?.profileId !== profileId)
        fail()
      noLaterThan(row.createdAt, exportedAt)
      noLaterThan(row.updatedAt, exportedAt)
      if (Date.parse(row.updatedAt) < Date.parse(row.createdAt)) fail()
    }
    for (const row of mappings) {
      checkMapping(row)
      const history = events
        .filter((event) => event.mappingId === row.id)
        .sort((a, b) => a.revision - b.revision)
      if (
        history.length !== row.revision ||
        history.some((event, index) => event.revision !== index + 1) ||
        JSON.stringify(history.at(-1)?.after) !== JSON.stringify(row)
      )
        fail()
      let previous: z.infer<typeof savedMapping> | null = null
      let previousEventAt: number | null = null
      for (const event of history) {
        if (
          event.profileId !== profileId ||
          event.accountId !== row.accountId ||
          event.after.id !== row.id ||
          event.after.accountId !== row.accountId ||
          event.after.createdAt !== row.createdAt ||
          event.after.revision !== event.revision ||
          JSON.stringify(event.before) !== JSON.stringify(previous)
        )
          fail()
        checkMapping(event.after)
        if (event.before) checkMapping(event.before)
        noLaterThan(event.createdAt, exportedAt)
        const snapshotAt = Date.parse(event.after.updatedAt)
        const eventAt = Date.parse(event.createdAt)
        // Preserve historical append latency without accepting a snapshot from another revision.
        if (snapshotAt > eventAt || (previousEventAt !== null && snapshotAt < previousEventAt))
          fail()
        if (
          event.action === 'created'
            ? event.revision !== 1 || event.before !== null
            : event.before === null
        )
          fail()
        if (event.action === 'archived' && (!event.after.archived || event.before?.archived)) fail()
        if (event.action === 'restored' && (event.after.archived || !event.before?.archived)) fail()
        if (event.action === 'updated' && event.after.archived !== event.before?.archived) fail()
        previous = event.after
        previousEventAt = eventAt
      }
    }
    for (const event of events) if (!mappingById.has(event.mappingId)) fail()
    for (const row of provenance) {
      const workbookOrigin = [row.fileFormat, row.workbookDigest, row.worksheet, row.headerRow]
      if (workbookOrigin.some((field) => field !== undefined)) {
        if (
          workbookOrigin.some((field) => field === undefined) ||
          row.fileFormat !== 'xlsx' ||
          row.headerRow === undefined ||
          row.rowNumber <= row.headerRow ||
          row.rowNumber > 1100 ||
          row.fileDigest !==
            createHash('sha256')
              .update(
                JSON.stringify([
                  'lilleri.xlsx-selection.v1',
                  row.workbookDigest,
                  row.worksheet,
                  row.headerRow,
                ]),
              )
              .digest('hex')
        )
          fail()
      }
      const account = accounts.get(row.accountId),
        transaction = transactions.get(row.transactionId),
        observation = observations.get(row.observationId)
      if (
        row.profileId !== profileId ||
        account?.profileId !== profileId ||
        transaction?.profileId !== profileId ||
        transaction.accountId !== row.accountId ||
        observation?.profileId !== profileId ||
        observation.accountId !== row.accountId ||
        observation.providerRecordId !== transaction.providerTransactionId ||
        observation.connectionId !== transaction.connectionId ||
        observation.providerId !== transaction.providerId
      )
        fail()
      noLaterThan(row.createdAt, exportedAt)
    }
  }
  return parsed
}

/** JSON schema shapes share their source with HTTP validation; semantic references remain above. */
export const ownershipExportJsonSchema = Object.fromEntries(
  Object.entries(ownershipExportSchemas).map(([key, schema]) => [
    key,
    z.toJSONSchema(schema.unwrap(), { target: 'draft-7' }),
  ]),
)
