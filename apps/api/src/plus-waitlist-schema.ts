import { pgTable, text } from 'drizzle-orm/pg-core'

/** "Plus Fondatori" requests: one per profile, notified once when Plus can be bought. */
export const plusWaitlist = pgTable('plus_waitlist', {
  profileId: text('profile_id').primaryKey(),
  householdId: text('household_id').notNull().default(''),
  joinedAt: text('joined_at').notNull(),
  notifiedAt: text('notified_at'),
})
