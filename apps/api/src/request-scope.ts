import type { Database, DatabaseHandle } from '@lilleri/database'
import type { FastifyReply, FastifyRequest } from 'fastify'

export type FinancialScope = DatabaseHandle['withProfile']

/** Buffer send until the SQL scope commits; a rolled-back mutation must never send success. */
export async function scopedReply<T>(
  scope: (callback: (db: Database) => Promise<T>) => Promise<T>,
  reply: FastifyReply,
  handler: (db: Database, reply: FastifyReply) => Promise<T>,
  afterCommit?: () => Promise<void>,
) {
  let sent = false
  let payload: unknown
  const buffered = new Proxy(reply, {
    get(target, property) {
      // Fastify replies are thenable. The buffered reply is deliberately not.
      if (property === 'then') return undefined
      if (property === 'send')
        return (value: unknown) => {
          if (sent) throw new Error('Response already buffered')
          sent = true
          payload = value
          return buffered
        }
      const value = Reflect.get(target, property, target)
      if (typeof value !== 'function') return value
      return (...args: unknown[]) => {
        const result = Reflect.apply(value, target, args)
        return result === target ? buffered : result
      }
    },
  })
  const result = await scope((db) => handler(db, buffered))
  await afterCommit?.()
  return sent ? reply.send(payload) : result
}

export interface ScopedRequest {
  readonly request: FastifyRequest
  readonly db: Database
}
