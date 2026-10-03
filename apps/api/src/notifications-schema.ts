import { integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core'

export type NotificationKind =
  | 'inbox'
  | 'consent_reminder'
  | 'balance_mismatch'
  | 'connection_expired'
  | 'connection_paused'
  | 'summary_ready'
  | 'security_notice'
  | 'export_ready'
  | 'deletion_status'
  | 'rights_action'
export interface NotificationPreferenceValues {
  readonly types: {
    readonly inbox: boolean
    readonly consent_reminder: boolean
    readonly balance_mismatch: boolean
    readonly connection_expired: boolean
    readonly connection_paused: boolean
    readonly summary_ready: boolean
  }
  readonly quietHours: { readonly enabled: boolean; readonly start: string; readonly end: string }
}
export const notificationPreferences = pgTable('notification_preferences', {
  profileId: text('profile_id').primaryKey(),
  values: jsonb('values').$type<NotificationPreferenceValues>().notNull(),
  revision: integer('revision').notNull(),
  updatedAt: text('updated_at').notNull(),
})
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull(),
  kind: text('kind').$type<NotificationKind>().notNull(),
  textVersion: text('text_version').$type<'notification-text-v1'>().notNull(),
  dedupKey: text('dedup_key').notNull(),
  permissionRevision: integer('permission_revision'),
  connectionId: text('connection_id'),
  consentId: text('consent_id'),
  sourceGeneration: text('source_generation'),
  sourceAction: text('source_action').$type<
    'renew_consent' | 'perform_sca' | 'renew_session' | 'reconnect'
  >(),
  sourceDeadline: text('source_deadline'),
  offsetSeconds: integer('offset_seconds'),
  dueAt: text('due_at').notNull(),
  status: text('status').$type<'queued' | 'delivered' | 'cancelled' | 'suppressed'>().notNull(),
  createdAt: text('created_at').notNull(),
  deliveredAt: text('delivered_at'),
  seenAt: text('seen_at'),
  revision: integer('revision').notNull(),
})
export const notificationEvents = pgTable('notification_events', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull(),
  notificationId: text('notification_id'),
  action: text('action')
    .$type<'preferences_changed' | 'queued' | 'delivered' | 'cancelled' | 'suppressed' | 'seen'>()
    .notNull(),
  revision: integer('revision').notNull(),
  before: jsonb('before_values').$type<NotificationPreferenceValues>(),
  after: jsonb('after_values').$type<NotificationPreferenceValues>(),
  occurredAt: text('occurred_at').notNull(),
})
