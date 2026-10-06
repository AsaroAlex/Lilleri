import { bigint, boolean, index, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core'

/** Stripe's documented subscription statuses; the migration enforces the same set. */
export const BILLING_SUBSCRIPTION_STATUSES = [
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
] as const
export type BillingSubscriptionStatus = (typeof BILLING_SUBSCRIPTION_STATUSES)[number]
export type BillingInterval = 'month' | 'year'

/** Trusted-write mapping between a Lilleri profile and its Stripe customer. */
export const billingCustomers = pgTable('billing_customers', {
  profileId: text('profile_id').primaryKey(),
  householdId: text('household_id').notNull().default(''),
  stripeCustomerId: text('stripe_customer_id').notNull().unique(),
  createdAt: text('created_at').notNull(),
})
/** Latest Stripe subscription state, always re-read from Stripe before it is stored. */
export const billingSubscriptions = pgTable(
  'billing_subscriptions',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id').notNull().default(''),
    profileId: text('profile_id').notNull(),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    status: text('status').$type<BillingSubscriptionStatus>().notNull(),
    priceId: text('price_id'),
    /** Present only when the subscription uses one of the configured Plus prices. */
    interval: text('interval').$type<BillingInterval>(),
    currentPeriodEnd: text('current_period_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    canceledAt: text('canceled_at'),
    /** Unix seconds of the newest applied Stripe event; older deliveries never overwrite. */
    stripeCreated: bigint('stripe_created', { mode: 'number' }).notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('billing_subscriptions_profile').on(table.profileId, table.stripeCreated)],
)
/** Webhook idempotency journal (trusted only): identifiers and types, never payloads. */
export const billingEvents = pgTable('billing_events', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  receivedAt: text('received_at').notNull(),
})
/**
 * Cancellations owed by a profile deletion (trusted only, no foreign key): armed before the
 * erasure, removed once Stripe confirms, retried with backoff until then.
 */
export const billingCancellations = pgTable('billing_cancellations', {
  profileId: text('profile_id').primaryKey(),
  stripeCustomerId: text('stripe_customer_id'),
  subscriptionIds: jsonb('subscription_ids').$type<string[]>().notNull(),
  attempts: integer('attempts').notNull().default(0),
  /** The profile's RevenueCat customer must be erased too. */
  storeCustomer: boolean('store_customer').notNull().default(false),
  armedAt: text('armed_at').notNull(),
  nextAttemptAt: text('next_attempt_at').notNull(),
})
export const STORE_CHANNELS = ['app_store', 'play_store', 'promotional'] as const
export type StoreChannel = (typeof STORE_CHANNELS)[number]
/** Latest RevenueCat "plus" entitlement of a profile (App Store, Google Play or a grant). */
export const storeEntitlements = pgTable('store_entitlements', {
  profileId: text('profile_id').primaryKey(),
  householdId: text('household_id').notNull().default(''),
  store: text('store').$type<StoreChannel>().notNull(),
  productId: text('product_id').notNull(),
  /** Null only for a non-expiring promotional grant. */
  expiresAt: text('expires_at'),
  gracePeriodExpiresAt: text('grace_expires_at'),
  willRenew: boolean('will_renew').notNull().default(true),
  billingIssue: boolean('billing_issue').notNull().default(false),
  sandbox: boolean('sandbox').notNull().default(false),
  managementUrl: text('management_url'),
  refreshedAt: text('refreshed_at').notNull(),
})
export type StoreEntitlementRow = typeof storeEntitlements.$inferSelect
export type BillingSubscriptionRow = typeof billingSubscriptions.$inferSelect
