import { readFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertBootstrapBrowserOrigins,
  assertSyntheticEntryPoint,
} from '../bootstrap/environment.mjs'
import { DEVELOPMENT_PORTS, developmentConfiguration } from '../dev/environment.mjs'
import { createDevelopmentGateway } from '../dev/gateway.mjs'
import { startManagedProcess } from '../dev/processes.mjs'
import { createStaticPreviewServer } from './static.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const configuration = developmentConfiguration(process.env, root)
let api
let gateway
let frontend
let shutdown
let stopping = false

async function close(server) {
  if (!server?.listening) return
  server.closeIdleConnections?.()
  await new Promise((resolve) => server.close(resolve))
}

function stop() {
  if (shutdown) return shutdown
  stopping = true
  shutdown = (async () => {
    await gateway?.close()
    frontend?.closeAllConnections()
    await close(frontend)
    await api?.stop()
    console.log('[preview] Stopped; the synthetic archive is preserved.')
  })()
  return shutdown
}
process.once('SIGTERM', () => void stop())
process.once('SIGINT', () => void stop())

async function available(port, host) {
  await new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', () =>
      reject(new Error(`Port ${port} is busy; existing services preserved`)),
    )
    probe.listen(port, host, () => probe.close(resolve))
  })
}

async function listen(server, port, host) {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, host, resolve)
  })
}

async function main() {
  if (process.argv.length !== 2)
    throw new Error('Configure the compiled preview with DEV_* variables')
  assertSyntheticEntryPoint(await readFile(join(root, 'apps/api/dist/server.js'), 'utf8'))
  assertBootstrapBrowserOrigins(await readFile(join(root, 'apps/api/dist/app.js'), 'utf8'))
  frontend = await createStaticPreviewServer({ directory: join(root, 'apps/mobile/dist') })
  const probes = await Promise.allSettled([
    available(configuration.port, configuration.host),
    available(DEVELOPMENT_PORTS.api, '127.0.0.1'),
    available(DEVELOPMENT_PORTS.expo, '127.0.0.1'),
  ])
  for (const probe of probes) if (probe.status === 'rejected') throw probe.reason
  if (stopping) return
  api = startManagedProcess(process.execPath, [join(root, 'apps/api/dist/server.js')], {
    cwd: root,
    env: configuration.env,
  })
  api.finished.then((result) => {
    if (!stopping && !api.intentional) {
      console.error(`[preview] API exited (${result.code ?? result.signal ?? 'startup failure'}).`)
      process.exitCode = 1
      void stop()
    }
  })
  const deadline = Date.now() + 90_000
  let healthy = false
  while (!stopping && Date.now() < deadline && api.child.exitCode === null) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEVELOPMENT_PORTS.api}/health`, {
        signal: AbortSignal.timeout(2_000),
      })
      const body = await response.json()
      if (response.ok && body.status === 'ok' && body.mode === 'synthetic') {
        healthy = true
        break
      }
    } catch {
      // Bounded loopback-only readiness; never log configuration or credentials.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  if (!healthy) throw new Error('Synthetic API did not become ready')
  if (stopping) return
  await listen(frontend, DEVELOPMENT_PORTS.expo, '127.0.0.1')
  gateway = createDevelopmentGateway({
    apiPort: DEVELOPMENT_PORTS.api,
    expoPort: DEVELOPMENT_PORTS.expo,
    expoHost: '127.0.0.1',
    port: configuration.port,
    publicOrigin: configuration.publicOrigin,
  })
  await listen(gateway.server, configuration.port, configuration.host)
  console.log(`[preview] Compiled synthetic app ready on port ${configuration.port}.`)
}

main().catch((error) => {
  console.error(`[preview] ${error.message}`)
  process.exitCode = 1
  void stop()
})
