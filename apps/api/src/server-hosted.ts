import { fileURLToPath } from 'node:url'
import { HostedConfigurationError } from './hosted-configuration.js'
import { createHostedServer } from './hosted-server.js'

/** Production entry point. The synthetic `server.js` entry point is unchanged and separate. */
const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const redact = (message: string) =>
  message
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/giu, '[url]')
    .replace(/\S+@\S+/gu, '[address]')
    .replace(/[A-Za-z0-9_+/=-]{24,}/gu, '[value]')
    .slice(0, 300)
let server: Awaited<ReturnType<typeof createHostedServer>>
try {
  server = await createHostedServer(process.env, repositoryRoot)
} catch (error) {
  // Configuration errors name the variable only; other messages are redacted before logging.
  console.error(
    JSON.stringify({
      event: 'startup_failed',
      reason:
        error instanceof HostedConfigurationError
          ? error.message
          : `${error instanceof Error ? error.name : 'Error'}: ${redact(error instanceof Error ? error.message : '')}`,
    }),
  )
  process.exit(1)
}
let stopping = false
const stop = () => {
  if (stopping) return
  stopping = true
  void server.close().finally(() => process.exit(0))
}
process.once('SIGTERM', stop)
process.once('SIGINT', stop)
try {
  await server.listen()
} catch {
  console.error(JSON.stringify({ event: 'listen_failed' }))
  await server.close()
  process.exit(1)
}
