import { spawn } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertBootstrapBrowserOrigins,
  assertSyntheticEntryPoint,
  ZERO_BUDGET_PORTS,
  zeroBudgetEnvironment,
} from './environment.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const children = new Set()
let stopping = false

function stop() {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill('SIGTERM')
  const timer = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL')
  }, 8_000)
  timer.unref()
}

process.once('SIGINT', stop)
process.once('SIGTERM', stop)

function childProcess(command, args, cwd, env) {
  if (stopping) throw new Error('Startup cancelled')
  const child = spawn(command, args, { cwd, env, stdio: 'inherit', shell: false })
  children.add(child)
  const completion = new Promise((resolve, reject) => {
    child.once('error', (error) => {
      children.delete(child)
      reject(error)
    })
    child.once('exit', (code, signal) => {
      children.delete(child)
      resolve({ code, signal })
    })
  })
  return { child, completion }
}

async function assertPortFree(port) {
  await new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', () =>
      reject(new Error(`Port ${port} is busy; existing services were left running`)),
    )
    server.listen(port, '127.0.0.1', () => server.close(resolve))
  })
}

async function waitForApi(child) {
  const deadline = Date.now() + 45_000
  while (
    !stopping &&
    child.exitCode === null &&
    child.signalCode === null &&
    Date.now() < deadline
  ) {
    try {
      const response = await fetch(`http://127.0.0.1:${ZERO_BUDGET_PORTS.api}/health`, {
        signal: AbortSignal.timeout(1_000),
      })
      if (response.ok) return
    } catch {
      // Local readiness only. No remote probe or provider request.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('The local synthetic API did not become ready')
}

async function main() {
  const args = process.argv.slice(2)
  if (
    args.some((arg) => !['--check', '--prepare', '--api-only'].includes(arg)) ||
    new Set(args).size !== args.length ||
    (args.includes('--check') && args.includes('--prepare'))
  )
    throw new Error('Use --check, --prepare and/or --api-only; --check never builds or starts')
  const policy = JSON.parse(await readFile(new URL('./policy.json', import.meta.url), 'utf8'))
  const env = zeroBudgetEnvironment(process.env, root, policy)
  assertSyntheticEntryPoint(await readFile(join(root, 'apps/api/src/server.ts'), 'utf8'))
  assertBootstrapBrowserOrigins(await readFile(join(root, 'apps/api/src/app.ts'), 'utf8'))
  if (args.includes('--prepare')) {
    const prepared = await childProcess(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      [
        'exec',
        'turbo',
        'run',
        'build',
        '--filter=@lilleri/api',
        '--filter=@lilleri/api-client',
        '--filter=@lilleri/brand',
      ],
      root,
      env,
    ).completion
    if (prepared.code !== 0 || stopping) throw new Error('Local preparation did not complete')
  }
  const entry = join(root, 'apps/api/dist/server.js')
  await access(entry).catch(() => {
    throw new Error('Builds are missing; install locked dependencies and run pnpm dev:zero')
  })
  assertSyntheticEntryPoint(await readFile(entry, 'utf8'))
  assertBootstrapBrowserOrigins(await readFile(join(root, 'apps/api/dist/app.js'), 'utf8'))
  const expoEntry = join(root, 'apps/mobile/node_modules/expo/bin/cli')
  if (!args.includes('--api-only')) {
    for (const path of [
      expoEntry,
      join(root, 'packages/api-client/dist/index.js'),
      join(root, 'packages/brand/dist/index.js'),
    ])
      await access(path)
  }
  const ports = [
    ZERO_BUDGET_PORTS.api,
    ...(args.includes('--api-only') ? [] : [ZERO_BUDGET_PORTS.web]),
  ]
  const checks = await Promise.allSettled(ports.map(assertPortFree))
  for (const check of checks) if (check.status === 'rejected') throw check.reason
  console.log(
    'Gratis permanente: prototipo locale sintetico, senza banche reali, checkout o AI esterna.',
  )
  console.log(
    'Usa soltanto dati inventati. Il costo del dispositivo e il tempo di lavoro restano a tuo carico.',
  )
  console.log(`API: http://127.0.0.1:${ZERO_BUDGET_PORTS.api}`)
  if (!args.includes('--api-only'))
    console.log(`Demo web: http://localhost:${ZERO_BUDGET_PORTS.web}`)
  if (args.includes('--check')) {
    console.log('Configurazione e prerequisiti verificati; nessun servizio avviato.')
    return
  }
  const api = childProcess(process.execPath, [entry], root, env)
  // Handle early errors immediately while waiting for the health endpoint.
  let apiFailure
  const apiDone = api.completion.catch((error) => {
    apiFailure = error
    stop()
  })
  await waitForApi(api.child)
  if (apiFailure) throw apiFailure
  if (args.includes('--api-only')) {
    const result = await apiDone
    if (!stopping && result?.code !== 0) throw new Error('The local API exited unexpectedly')
    return
  }
  const expo = childProcess(
    process.execPath,
    [
      expoEntry,
      'start',
      '--web',
      '--localhost',
      '--port',
      String(ZERO_BUDGET_PORTS.web),
      '--clear',
    ],
    join(root, 'apps/mobile'),
    env,
  )
  const result = await Promise.race([apiDone, expo.completion])
  if (!stopping && result?.code !== 0)
    throw new Error('A local preview service exited unexpectedly')
  stop()
  await Promise.allSettled([apiDone, expo.completion])
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
  stop()
})
