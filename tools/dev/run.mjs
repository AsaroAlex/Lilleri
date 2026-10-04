import { watch } from 'node:fs'
import { access, readdir, readFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertBootstrapBrowserOrigins,
  assertSyntheticEntryPoint,
} from '../bootstrap/environment.mjs'
import { DEVELOPMENT_PORTS, developmentConfiguration } from './environment.mjs'
import { createDevelopmentGateway } from './gateway.mjs'
import { startManagedProcess } from './processes.mjs'
import { createRebuildQueue } from './watch.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const processes = new Set()
const watchers = []
const configuration = developmentConfiguration(process.env, root)
const { env } = configuration
let shuttingDown = false
let shutdown
let gateway
let queue
let api

function log(message) {
  console.log(`[dev] ${message}`)
}
function stop() {
  if (shutdown) return shutdown
  shuttingDown = true
  shutdown = (async () => {
    log('Stopping development services…')
    for (const watcher of watchers) watcher.close()
    const queued = queue?.close()
    await gateway?.close()
    // Stop the active build too, so the queue cannot race a shutdown with an API restart.
    await Promise.allSettled([...processes].map((process) => process.stop()))
    await queued
    log('Development services stopped; the synthetic archive is preserved.')
  })()
  return shutdown
}
process.once('SIGINT', () => void stop())
process.once('SIGTERM', () => void stop())

function start(command, args, cwd = root) {
  if (shuttingDown) throw new Error('Development startup cancelled')
  const managed = startManagedProcess(command, args, { cwd, env })
  processes.add(managed)
  managed.finished.then(() => processes.delete(managed))
  return managed
}
function supervise(managed, name) {
  managed.finished.then((result) => {
    if (!managed.intentional && !shuttingDown) {
      // The CLI may have exited while a bundler worker still owns its process group.
      void managed.stop()
      log(`${name} exited unexpectedly (${result.code ?? result.signal ?? 'startup failure'}).`)
      process.exitCode = 1
      void stop()
    }
  })
}
async function command(commandName, args, cwd = root) {
  const managed = start(commandName, args, cwd)
  const result = await managed.finished
  await managed.stop()
  if (result.code !== 0 || shuttingDown)
    throw new Error(
      `Development preparation failed (${result.code ?? result.signal ?? 'startup failure'})`,
    )
}
async function build() {
  await command(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', [
    'exec',
    'turbo',
    'run',
    'build',
    '--filter=@lilleri/api',
    '--filter=@lilleri/api-client',
    '--filter=@lilleri/brand',
    '--',
    '--noEmitOnError',
  ])
  await command(process.execPath, [join(root, 'apps/web/scripts/copy-brand.mjs')])
  await validateCompiledApi()
}
async function validateCompiledApi() {
  assertSyntheticEntryPoint(await readFile(join(root, 'apps/api/dist/server.js'), 'utf8'))
  assertBootstrapBrowserOrigins(await readFile(join(root, 'apps/api/dist/app.js'), 'utf8'))
}
async function available(port, host) {
  await new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', () =>
      reject(new Error(`Port ${port} is busy; existing services were left running`)),
    )
    server.listen(port, host, () => server.close(resolve))
  })
}
async function ready(managed, address, name) {
  const addresses = Array.isArray(address) ? address : [address]
  const deadline = Date.now() + 90_000
  while (!shuttingDown && managed.child.exitCode === null && managed.child.signalCode === null) {
    if (Date.now() >= deadline) break
    for (const url of addresses) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(2_000) })
        await response.body?.cancel()
        if (response.ok) return url
      } catch {
        // Readiness probes use loopback only and contain no credentials or user data.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`${name} did not become ready`)
}
async function restartApi() {
  if (api) await api.stop()
  if (shuttingDown) return
  api = start(process.execPath, [join(root, 'apps/api/dist/server.js')])
  supervise(api, 'Synthetic API')
  await ready(api, `http://127.0.0.1:${DEVELOPMENT_PORTS.api}/health`, 'Synthetic API')
}
async function watchSources() {
  const watchFailure = () => {
    log('Source watching failed; restart pnpm dev:cloud to restore automatic builds.')
    process.exitCode = 1
    void stop()
  }
  const packages = await readdir(join(root, 'packages'), { withFileTypes: true })
  const directories = [
    join(root, 'apps/api/src'),
    join(root, 'packages/database/migrations'),
    join(root, 'packages/brand/tokens'),
    join(root, 'packages/brand/logo'),
    ...packages
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(root, 'packages', entry.name, 'src')),
  ]
  for (const directory of directories) {
    try {
      await access(directory)
    } catch {
      continue
    }
    const watcher = watch(directory, { recursive: true }, (_event, filename) => {
      if (filename === null || /\.(?:ts|tsx|js|mjs|json|sql|css|svg)$/u.test(filename.toString()))
        queue.invalidate()
    })
    watcher.on('error', watchFailure)
    watchers.push(watcher)
  }
  const configurationDirectories = new Map()
  for (const path of [
    join(root, 'tsconfig.base.json'),
    join(root, 'apps/api/tsconfig.build.json'),
    ...packages
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(root, 'packages', entry.name, 'tsconfig.build.json')),
  ]) {
    try {
      await access(path)
    } catch {
      continue
    }
    const directory = dirname(path)
    if (!configurationDirectories.has(directory)) configurationDirectories.set(directory, new Set())
    configurationDirectories.get(directory).add(basename(path))
  }
  for (const [directory, files] of configurationDirectories) {
    // Watch directories rather than file inodes, so editor atomic replacements keep working.
    const watcher = watch(directory, (_event, filename) => {
      if (filename === null || files.has(filename.toString())) queue.invalidate()
    })
    watcher.on('error', watchFailure)
    watchers.push(watcher)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const prepared = args.length === 1 && args[0] === '--prepared'
  if (args.length > 0 && !prepared)
    throw new Error(
      'Use development environment variables to configure pnpm dev:cloud; --prepared requires packages already built from this source',
    )
  assertSyntheticEntryPoint(await readFile(join(root, 'apps/api/src/server.ts'), 'utf8'))
  assertBootstrapBrowserOrigins(await readFile(join(root, 'apps/api/src/app.ts'), 'utf8'))
  const checked = await Promise.allSettled([
    available(configuration.port, configuration.host),
    available(DEVELOPMENT_PORTS.api, '127.0.0.1'),
    available(DEVELOPMENT_PORTS.expo, 'localhost'),
    available(DEVELOPMENT_PORTS.site, '127.0.0.1'),
  ])
  for (const result of checked) if (result.status === 'rejected') throw result.reason
  if (prepared) {
    log('Starting the synthetic preview from packages compiled during the image build…')
    await validateCompiledApi()
  } else {
    log('Preparing the interactive synthetic preview from the installed workspace dependencies…')
    await build()
  }
  await restartApi()
  const expo = start(
    process.execPath,
    [
      join(root, 'apps/mobile/node_modules/expo/bin/cli'),
      'start',
      '--web',
      '--localhost',
      '--port',
      String(DEVELOPMENT_PORTS.expo),
      '--clear',
    ],
    join(root, 'apps/mobile'),
  )
  const site = start(
    process.execPath,
    [
      join(root, 'apps/web/node_modules/next/dist/bin/next'),
      'dev',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(DEVELOPMENT_PORTS.site),
    ],
    join(root, 'apps/web'),
  )
  supervise(expo, 'Expo browser app')
  supervise(site, 'Next project site')
  const [expoAddress] = await Promise.all([
    // Container DNS can exclude IPv6 localhost even when Metro listens on ::1.
    ready(
      expo,
      [`http://[::1]:${DEVELOPMENT_PORTS.expo}/`, `http://127.0.0.1:${DEVELOPMENT_PORTS.expo}/`],
      'Expo browser app',
    ),
    ready(site, `http://127.0.0.1:${DEVELOPMENT_PORTS.site}/`, 'Next project site'),
  ])
  if (shuttingDown) return
  gateway = createDevelopmentGateway({
    apiPort: DEVELOPMENT_PORTS.api,
    expoPort: DEVELOPMENT_PORTS.expo,
    expoHost: new URL(expoAddress).hostname.replaceAll('[', '').replaceAll(']', ''),
    port: configuration.port,
    publicOrigin: configuration.publicOrigin,
  })
  await new Promise((resolve, reject) => {
    gateway.server.once('error', reject)
    gateway.server.listen(configuration.port, configuration.host, resolve)
  })
  queue = createRebuildQueue({
    build,
    restart: restartApi,
    report(state, _error, phase) {
      if (state === 'building') log('Sources changed; rebuilding shared packages and API…')
      if (state === 'ready')
        log('API restarted with the latest complete build; ready for another test.')
      if (state === 'failed' && phase === 'build' && !shuttingDown)
        log('Build failed; the current API stays running. Fix the compiler error and save again.')
      if (state === 'failed' && phase === 'restart' && !shuttingDown) {
        log(
          'The rebuilt API could not start; inspect the server logs before restarting development.',
        )
        process.exitCode = 1
        void stop()
      }
    },
  })
  await watchSources()
  log(`Browser app: ${configuration.publicOrigin ?? `http://localhost:${configuration.port}`}`)
  log(
    `Forward port ${configuration.port} for the cloud preview. API /api stays on the same browser origin.`,
  )
  log(
    `Project site: http://127.0.0.1:${DEVELOPMENT_PORTS.site} (forward port ${DEVELOPMENT_PORTS.site} separately).`,
  )
  log(
    'Frontend hot reload and serialized API/package rebuilds are active. Ctrl+C stops all services.',
  )
  log(`Synthetic demo data only; changes persist in ${env.PGLITE_PATH} across restarts.`)
}

main().catch((error) => {
  console.error(`[dev] ${error.message}`)
  process.exitCode = 1
  void stop()
})
