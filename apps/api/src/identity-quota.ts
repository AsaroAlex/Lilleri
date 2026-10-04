import { createHmac } from 'node:crypto'
import type { Database } from '@lilleri/database'
import { sql } from 'drizzle-orm'

/** Cross-process atomic fixed-window quota. Neither caller IP headers nor PII are persisted. */
export function createIdentityQuota(db: Database, secret: string) {
  return async (key: string, rule: { window: number; max: number }) => {
    if (
      !Number.isInteger(rule.window) ||
      rule.window < 1 ||
      !Number.isInteger(rule.max) ||
      rule.max < 1
    )
      throw new Error('Invalid identity quota rule')
    const hash = createHmac('sha256', secret).update(`identity-quota-v1:${key}`).digest('hex')
    // Bound each cleanup statement. Old buckets contain opaque digests only.
    await db.execute(sql`
      DELETE FROM identity_request_quotas WHERE key_hash IN (
        SELECT key_hash FROM identity_request_quotas
        WHERE expires_at < statement_timestamp() - interval '1 day'
        ORDER BY expires_at LIMIT 100
      )
    `)
    const result = await db.execute(sql`
      INSERT INTO identity_request_quotas (key_hash, count, expires_at)
      VALUES (${hash}, 1, statement_timestamp() + ${rule.window} * interval '1 second')
      ON CONFLICT (key_hash) DO UPDATE SET
        count = CASE WHEN identity_request_quotas.expires_at <= statement_timestamp()
          THEN 1 ELSE LEAST(identity_request_quotas.count + 1, ${rule.max + 1}) END,
        expires_at = CASE WHEN identity_request_quotas.expires_at <= statement_timestamp()
          THEN statement_timestamp() + ${rule.window} * interval '1 second'
          ELSE identity_request_quotas.expires_at END
      RETURNING count, CEIL(EXTRACT(EPOCH FROM (expires_at - statement_timestamp())))::integer AS retry_after
    `)
    const row = (result as { rows: { count: number; retry_after: number }[] }).rows[0]
    if (!row) throw new Error('Identity quota is unavailable')
    return row.count <= rule.max
      ? { allowed: true, retryAfter: null }
      : { allowed: false, retryAfter: Math.max(1, row.retry_after) }
  }
}
