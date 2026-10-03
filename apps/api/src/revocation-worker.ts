import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { openDatabase } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { assertDemoConfiguration } from './app.js'
import { drainRevocations, revocationsForProfile } from './revocation-outbox.js'

assertDemoConfiguration(process.env.DEMO_MODE === '1', process.env.NODE_ENV)
const command = process.argv[2] ?? 'run'
if (!['run', 'status'].includes(command)) throw new Error('Use revocation-worker run or status')
const profileId = process.env.REVOCATION_PROFILE_ID
if (command === 'status' && !profileId)
  throw new Error('Status requires trusted REVOCATION_PROFILE_ID configuration')
const path = resolve(
  process.env.PGLITE_PATH ?? new URL('../../../.lilleri/data', import.meta.url).pathname,
)
await mkdir(resolve(path, '..'), { recursive: true })
const handle = await openDatabase(
  process.env.DATABASE_URL
    ? { driver: 'postgres', url: process.env.DATABASE_URL }
    : { driver: 'pglite', path },
)
try {
  if (command === 'status' && profileId) {
    console.log(JSON.stringify({ revocations: await revocationsForProfile(handle.db, profileId) }))
  } else {
    const limit = Number(process.env.REVOCATION_BATCH_LIMIT ?? '20')
    const results = await drainRevocations(handle.db, [new MockItalianProvider()], limit, {
      ...(profileId ? { profileId } : {}),
    })
    console.log(JSON.stringify({ processed: results.length, results }))
    if (results.some((result) => result.state === 'failed')) process.exitCode = 2
  }
} finally {
  await handle.close()
}
