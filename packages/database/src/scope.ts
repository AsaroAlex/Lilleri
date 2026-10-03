import { eq, sql } from 'drizzle-orm'
import type { PgTransactionConfig } from 'drizzle-orm/pg-core'
import type { Database } from './index.js'
import * as schema from './schema.js'

export interface ProfileScopeOptions extends PgTransactionConfig {
  /** Verified server-side owner only, and only needed for atomic credential erasure. */
  readonly identityUserId?: string
}

export class ProfileScopeError extends Error {
  constructor(readonly code: 'invalid_scope' | 'profile_unavailable' | 'owner_required') {
    super(code)
    this.name = 'ProfileScopeError'
  }
}

function validateIdentifier(value: string) {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > 256 ||
    Array.from(value).some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    throw new ProfileScopeError('invalid_scope')
}

/** No profile or user identifiers are accepted directly from HTTP request bodies. */
export function createProfileScope(
  trustedDb: Database,
  runtimeDb: Database,
  setLocalRole: boolean,
) {
  return async <T>(
    profileId: string,
    work: (db: Database) => Promise<T>,
    options: ProfileScopeOptions = {},
  ): Promise<T> => {
    validateIdentifier(profileId)
    const [profile] = await trustedDb
      .select({ householdId: schema.profiles.householdId })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, profileId))
    if (!profile?.householdId) throw new ProfileScopeError('profile_unavailable')
    if (options.identityUserId !== undefined) {
      validateIdentifier(options.identityUserId)
      const membership = await trustedDb.execute(sql`
        SELECT 1 FROM identity_memberships
        WHERE profile_id = ${profileId} AND user_id = ${options.identityUserId} AND role = 'owner'
        LIMIT 1
      `)
      if (!(membership as { rows: unknown[] }).rows.length)
        throw new ProfileScopeError('owner_required')
    }
    const { identityUserId, ...transactionOptions } = options
    return runtimeDb.transaction(
      async (db) => {
        if (setLocalRole) await db.execute(sql`SET LOCAL ROLE lilleri_runtime`)
        // SET LOCAL is transaction-bound: success, failure and pool reuse all clear scope.
        // Set every field, including the absent user, so no previous value is reused.
        await db.execute(sql`
        SELECT set_config('app.profile_id', ${profileId}, true),
               set_config('app.household_id', ${profile.householdId}, true),
               set_config('app.identity_user_id', ${identityUserId ?? ''}, true)
      `)
        return work(db)
      },
      Object.keys(transactionOptions).length ? transactionOptions : undefined,
    )
  }
}

/** An actual login credential must not inherit a migration or trusted boundary. */
export async function assertRuntimeRole(db: Database) {
  const result = await db.execute(sql`
    SELECT pg_has_role(current_user, 'lilleri_runtime', 'MEMBER') AS runtime_member,
           pg_has_role(current_user, 'lilleri_trusted', 'MEMBER') AS trusted_member,
           EXISTS (
             SELECT 1 FROM pg_roles role
             WHERE pg_has_role(current_user, role.oid, 'MEMBER')
             AND (role.rolsuper OR role.rolbypassrls OR role.rolcreatedb OR role.rolcreaterole
                  OR EXISTS (SELECT 1 FROM pg_class table_definition
                             JOIN pg_namespace namespace ON namespace.oid = table_definition.relnamespace
                             WHERE namespace.nspname = 'public'
                             AND table_definition.relkind IN ('r','p')
                             AND table_definition.relowner = role.oid))
           ) AS unsafe_membership
  `)
  const role = (
    result as {
      rows: { runtime_member: boolean; trusted_member: boolean; unsafe_membership: boolean }[]
    }
  ).rows[0]
  if (!role?.runtime_member || role.trusted_member || role.unsafe_membership)
    throw new Error(
      'Runtime database credential must be a non-owner member of lilleri_runtime only',
    )
}
