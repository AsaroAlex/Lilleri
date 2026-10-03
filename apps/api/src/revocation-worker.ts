import { openDatabase } from '@lilleri/database'
import { MockItalianProvider } from '@lilleri/financial-providers'
import { drainRevocations, revocationsForProfile } from './revocation-outbox.js'
import { DEFAULT_RUNTIME_CONFIGURATION, RuntimeConfigurationStore } from './runtime-config.js'
import { runtimeConfigurationOperatorArguments } from './runtime-config-operator.js'

async function main() {
  const command = process.argv[2] ?? 'run'
  if (!['run', 'status'].includes(command) || process.argv.length > 3)
    throw new Error('Use revocation-worker run or status')
  const { url } = runtimeConfigurationOperatorArguments(process.env, ['status'])
  const profileId = process.env.REVOCATION_PROFILE_ID
  if (profileId !== undefined && (!profileId || profileId.length > 200))
    throw new Error('Invalid trusted revocation scope')
  if (command === 'status' && !profileId)
    throw new Error('Status requires a trusted revocation scope')
  const batchLimit = process.env.REVOCATION_BATCH_LIMIT
  if (batchLimit !== undefined && !/^\d+$/.test(batchLimit))
    throw new Error('Invalid bootstrap revocation batch limit')
  const handle = await openDatabase({ driver: 'postgres', url })
  try {
    const configurations = new RuntimeConfigurationStore(handle.db)
    const configuration = await configurations.ensure({
      ...DEFAULT_RUNTIME_CONFIGURATION,
      revocation: {
        ...DEFAULT_RUNTIME_CONFIGURATION.revocation,
        ...(batchLimit === undefined ? {} : { batchLimit: Number(batchLimit) }),
      },
    })
    if (command === 'status' && profileId) {
      const jobs = await revocationsForProfile(handle.db, profileId)
      const counts = { pending: 0, running: 0, completed: 0, failed: 0 }
      for (const job of jobs) counts[job.state]++
      console.log(
        JSON.stringify({
          configurationRevision: configuration.revision,
          enabled: configuration.values.revocation.enabled,
          revocations: { total: jobs.length, ...counts },
        }),
      )
    } else {
      const settings = configuration.values.revocation
      const results = settings.enabled
        ? await drainRevocations(handle.db, [new MockItalianProvider()], settings.batchLimit, {
            ...settings,
            ...(profileId ? { profileId } : {}),
          })
        : []
      const counts = { pending: 0, completed: 0, failed: 0, stale: 0 }
      for (const result of results) counts[result.state]++
      console.log(
        JSON.stringify({
          configurationRevision: configuration.revision,
          enabled: settings.enabled,
          processed: results.length,
          ...counts,
        }),
      )
      if (counts.failed) process.exitCode = 2
    }
  } finally {
    await handle.close()
  }
}
void main().catch(() => {
  console.error(JSON.stringify({ errorCode: 'revocation_worker_failed' }))
  process.exitCode = 2
})
