import { schema } from '@lilleri/database'
import { boolean, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })

/** Better Auth's supported Drizzle model. Kept separate from the financial domain. */
export const user = pgTable('identity_users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: instant('created_at').notNull(),
  updatedAt: instant('updated_at').notNull(),
  adultAttested: boolean('adult_attested').notNull(),
  termsVersion: text('terms_version').notNull(),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
})
export const session = pgTable('identity_sessions', {
  id: text('id').primaryKey(),
  token: text('token').notNull().unique(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: instant('expires_at').notNull(),
  createdAt: instant('created_at').notNull(),
  updatedAt: instant('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
})
export const account = pgTable('identity_accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: instant('access_token_expires_at'),
  refreshTokenExpiresAt: instant('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: instant('created_at').notNull(),
  updatedAt: instant('updated_at').notNull(),
})
export const verification = pgTable('identity_verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: instant('expires_at').notNull(),
  createdAt: instant('created_at').notNull(),
  updatedAt: instant('updated_at').notNull(),
})
export const passkey = pgTable('identity_passkeys', {
  id: text('id').primaryKey(),
  name: text('name'),
  publicKey: text('public_key').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  credentialID: text('credential_id').notNull().unique(),
  counter: integer('counter').notNull(),
  deviceType: text('device_type').notNull(),
  backedUp: boolean('backed_up').notNull(),
  transports: text('transports'),
  createdAt: instant('created_at'),
  aaguid: text('aaguid'),
})
export const memberships = pgTable(
  'identity_memberships',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    profileId: text('profile_id')
      .notNull()
      .references(() => schema.profiles.id, { onDelete: 'cascade' }),
    role: text('role').$type<'owner' | 'editor' | 'viewer'>().notNull(),
    createdAt: instant('created_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.profileId] })],
)
export const acceptances = pgTable(
  'identity_acceptances',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<'adult_attestation' | 'terms'>().notNull(),
    textVersion: text('text_version').notNull(),
    acceptedAt: instant('accepted_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind] })],
)
export const stepUps = pgTable('identity_step_ups', {
  sessionId: text('session_id')
    .primaryKey()
    .references(() => session.id, { onDelete: 'cascade' }),
  verifiedAt: instant('verified_at').notNull(),
})
export const twoFactor = pgTable('identity_two_factors', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes').notNull(),
  verified: boolean('verified').notNull().default(false),
  failedVerificationCount: integer('failed_verification_count').notNull().default(0),
  lockedUntil: instant('locked_until'),
})

export const authSchema = { user, session, account, verification, passkey, twoFactor }
