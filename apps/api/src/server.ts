import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { openDatabase } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { assertDemoConfiguration, createApp } from './app.js'
import { assertLocalIdentityConfiguration } from './identity.js'
import {
  createRetentionPump,
  retentionConfigurationFromEnvironment,
} from './retention-maintenance.js'
import { createRevocationPump } from './revocation-outbox.js'

const host = process.env.API_HOST ?? '127.0.0.1'
const localAuthMode = process.env.LOCAL_AUTH_MODE === '1'
const demoMode = process.env.DEMO_MODE === '1'
if (!['127.0.0.1', 'localhost', '::1'].includes(host))
  throw new Error('Synthetic API modes must listen on loopback')
if (localAuthMode && demoMode) throw new Error('Select either LOCAL_AUTH_MODE or DEMO_MODE')
if (!localAuthMode) assertDemoConfiguration(demoMode, process.env.NODE_ENV, host)
const port = Number(process.env.API_PORT ?? 3001)
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('API_PORT must be an integer between 1024 and 65535')
const localIdentity = localAuthMode
  ? {
      baseURL: process.env.LOCAL_AUTH_BASE_URL ?? `http://localhost:${port}`,
      secret: process.env.LOCAL_AUTH_SECRET ?? '',
      ...(process.env.NODE_ENV ? { environment: process.env.NODE_ENV } : {}),
    }
  : undefined
if (localIdentity) assertLocalIdentityConfiguration(localIdentity)
const retentionConfiguration = retentionConfigurationFromEnvironment()
const path = resolve(
  process.env.PGLITE_PATH ?? new URL('../../../.lilleri/data', import.meta.url).pathname,
)
await mkdir(resolve(path, '..'), { recursive: true })
const handle = await openDatabase(
  process.env.DATABASE_URL
    ? { driver: 'postgres', url: process.env.DATABASE_URL }
    : { driver: 'pglite', path },
)
const provider = new MockItalianProvider()
const app = await createApp({
  db: handle.db,
  provider,
  demoMode,
  ...(localIdentity ? { localIdentity } : { seed: true }),
})
const revocations = createRevocationPump(handle.db, [provider])
const payloadRetention = createRetentionPump(handle.db, retentionConfiguration, {
  report: (status) => console.log(JSON.stringify({ event: 'payload_retention', ...status })),
})
let closing = false
const close = async () => {
  if (closing) return
  closing = true
  await payloadRetention.stop()
  await revocations.stop()
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
  console.log(
    `Lilleri synthetic ${localAuthMode ? 'local identity' : 'demo'} API listening on http://${host}:${port}`,
  )
} catch (error) {
  await close()
  throw error
}
