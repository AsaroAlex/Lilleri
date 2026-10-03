import { openDatabase } from '@lilleri/database'
import {
  createRetentionPump,
  expiredPayloadCount,
  runRetentionBatch,
  standaloneRetentionConfiguration,
} from './retention-maintenance.js'

async function main() {
  const { command, url, settings } = standaloneRetentionConfiguration(
    process.env,
    process.argv.slice(2),
  )
  const handle = await openDatabase({ driver: 'postgres', url })
  let pump: ReturnType<typeof createRetentionPump> | undefined
  try {
    if (command === 'status') {
      const checkedAt = new Date().toISOString()
      console.log(
        JSON.stringify({
          checkedAt,
          expiredPayloads: await expiredPayloadCount(handle.db, checkedAt),
        }),
      )
    } else if (command === 'run') {
      const checkedAt = new Date().toISOString()
      const result = await runRetentionBatch(handle.db, settings, checkedAt)
      console.log(
        JSON.stringify({
          checkedAt,
          enabled: settings.enabled,
          deleted: result.deleted,
          profilesVisited: result.profilesVisited,
          failedProfiles: result.failedProfiles,
          expiredPayloads: await expiredPayloadCount(handle.db, checkedAt),
        }),
      )
      if (result.failedProfiles) process.exitCode = 2
    } else if (!settings.enabled) {
      console.log(JSON.stringify({ enabled: false, state: 'disabled' }))
    } else {
      pump = createRetentionPump(handle.db, settings, {
        report: (status) => console.log(JSON.stringify(status)),
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
