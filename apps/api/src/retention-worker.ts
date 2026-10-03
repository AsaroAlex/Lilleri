import { openDatabase } from '@lilleri/database'
import {
  createRetentionPump,
  expiredPayloadCount,
  runRetentionBatch,
  standaloneRetentionConfiguration,
} from './retention-maintenance.js'
import { DEFAULT_RUNTIME_CONFIGURATION, RuntimeConfigurationStore } from './runtime-config.js'

async function main() {
  const { command, url, settings } = standaloneRetentionConfiguration(
    process.env,
    process.argv.slice(2),
  )
  const handle = await openDatabase({ driver: 'postgres', url })
  let pump: ReturnType<typeof createRetentionPump> | undefined
  try {
    const configurations = new RuntimeConfigurationStore(handle.db)
    const configuration = await configurations.ensure({
      ...DEFAULT_RUNTIME_CONFIGURATION,
      payloadRetention: settings,
    })
    let configurationRevision: number | null = configuration.revision
    const payloadSettings = configuration.values.payloadRetention
    if (command === 'status') {
      const checkedAt = new Date().toISOString()
      console.log(
        JSON.stringify({
          checkedAt,
          configurationRevision,
          expiredPayloads: await expiredPayloadCount(handle.db, checkedAt),
        }),
      )
    } else if (command === 'run') {
      const checkedAt = new Date().toISOString()
      const result = await runRetentionBatch(handle.db, payloadSettings, checkedAt)
      console.log(
        JSON.stringify({
          checkedAt,
          configurationRevision,
          enabled: payloadSettings.enabled,
          deleted: result.deleted,
          profilesVisited: result.profilesVisited,
          failedProfiles: result.failedProfiles,
          expiredPayloads: await expiredPayloadCount(handle.db, checkedAt),
        }),
      )
      if (result.failedProfiles) process.exitCode = 2
    } else {
      pump = createRetentionPump(handle.db, payloadSettings, {
        configuration: async () => {
          configurationRevision = null
          const current = await configurations.read()
          configurationRevision = current.revision
          return current.values.payloadRetention
        },
        report: (status) => console.log(JSON.stringify({ configurationRevision, ...status })),
      })
      await new Promise<void>((resolve) => {
        process.once('SIGINT', resolve)
        process.once('SIGTERM', resolve)
      })
    }
  } finally {
    await pump?.stop()
    await handle.close()
  }
}
try {
  await main()
} catch {
  // Fail closed without printing connection credentials, SQL, content or profile identifiers.
  console.error(JSON.stringify({ errorCode: 'payload_retention_worker_failed' }))
  process.exitCode = 2
}
