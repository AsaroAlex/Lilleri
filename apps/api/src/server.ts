import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { openDatabase } from '@lilleri/database'
import { assertDemoConfiguration, createApp } from './app.js'

const host = process.env.API_HOST ?? '127.0.0.1'
assertDemoConfiguration(process.env.DEMO_MODE === '1', process.env.NODE_ENV, host)
const port = Number(process.env.API_PORT ?? 3001)
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('API_PORT must be an integer between 1024 and 65535')
const path = resolve(
  process.env.PGLITE_PATH ?? new URL('../../../.lilleri/data', import.meta.url).pathname,
)
await mkdir(resolve(path, '..'), { recursive: true })
const handle = await openDatabase(
  process.env.DATABASE_URL
    ? { driver: 'postgres', url: process.env.DATABASE_URL }
    : { driver: 'pglite', path },
)
const app = await createApp({ db: handle.db, demoMode: true, seed: true })
let closing = false
const close = async () => {
  if (closing) return
  closing = true
  await app.close()
  await handle.close()
}
process.once('SIGINT', () => {
  void close()
})
process.once('SIGTERM', () => {
  void close()
})
try {
  await app.listen({ host, port })
  console.log(`Lilleri synthetic demo API listening on http://${host}:${port}`)
} catch (error) {
  await close()
  throw error
}
