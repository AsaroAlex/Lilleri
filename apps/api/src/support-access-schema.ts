import { schema } from '@lilleri/database'
import { integer, pgTable, text } from 'drizzle-orm/pg-core'

export type SupportGrantReason = 'sync_issue' | 'data_rights' | 'security_issue'
export type BreakGlassReason = 'service_outage' | 'security_incident'
export type SupportAction =
  | 'granted'
  | 'revoked'
  | 'break_glass_requested'
  | 'break_glass_approved'
  | 'masked_view_read'
  | 'break_glass_read'
const profile = () =>
  text('profile_id')
    .notNull()
    .references(() => schema.profiles.id, { onDelete: 'cascade' })
export const supportGrants = pgTable('support_access_grants', {
  id: text('id').primaryKey(),
  profileId: profile(),
  ticketId: text('ticket_id').notNull(),
  reason: text('reason').$type<SupportGrantReason>().notNull(),
  grantedAt: text('granted_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  revision: integer('revision').notNull().default(1),
})
export const supportRequests = pgTable('support_access_requests', {
  id: text('id').primaryKey(),
  profileId: profile(),
  grantId: text('grant_id').notNull(),
  requestedBy: text('requested_by').notNull(),
  reason: text('reason').$type<BreakGlassReason>().notNull(),
  requestedAt: text('requested_at').notNull(),
  expiresAt: text('expires_at').notNull(),
})
export const supportApprovals = pgTable('support_access_approvals', {
  id: text('id').primaryKey(),
  profileId: profile(),
  requestId: text('request_id').notNull(),
  approvedBy: text('approved_by').notNull(),
  approvedAt: text('approved_at').notNull(),
})
export const supportEvents = pgTable('support_access_events', {
  id: text('id').primaryKey(),
  profileId: profile(),
  grantId: text('grant_id').notNull(),
  requestId: text('request_id'),
  action: text('action').$type<SupportAction>().notNull(),
  actorKind: text('actor_kind').$type<'user' | 'operator'>().notNull(),
  operatorId: text('operator_id'),
  occurredAt: text('occurred_at').notNull(),
})
