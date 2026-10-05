import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startManagedProcess } from '../dev/processes.mjs'

/** Builds the hosted service: API, shared packages and the Expo web app in hosted identity mode. */
const root = fileURLToPath(new URL('../../', import.meta.url))
let active
let stopping = false
const stop = () => {
  stopping = true
  process.exitCode = 1
  void active?.stop()
}
process.once('SIGINT', stop)
process.once('SIGTERM', stop)

async function run(command, args, cwd, env) {
  if (stopping) throw new Error('Production build cancelled')
  active = startManagedProcess(command, args, { cwd, env })
  const result = await active.finished
  await active.stop()
  if (stopping || result.code !== 0) throw new Error('Production build failed')
}
const base = {
  ...process.env,
  EXPO_NO_DOTENV: '1',
  EXPO_OFFLINE: '1',
  EXPO_NO_TELEMETRY: '1',
  TURBO_TELEMETRY_DISABLED: '1',
  CI: '1',
}
for (const name of Object.keys(base)) if (name.startsWith('EXPO_PUBLIC_')) delete base[name]

try {
  await run(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    [
      'exec',
      'turbo',
      'run',
      'build',
      '--filter=@lilleri/api',
      '--filter=@lilleri/api-client',
      '--filter=@lilleri/brand',
      '--',
      '--noEmitOnError',
    ],
    root,
    base,
  )
  // The browser accepts exactly the terms version the server publishes.
  const legal = await readFile(join(root, 'apps/api/dist/legal-pages.js'), 'utf8')
  const version = /export const LEGAL_TERMS_VERSION = '([a-z0-9-]+)'/.exec(legal)?.[1]
  if (!version) throw new Error('Published terms version is unavailable')
  await run(
    process.execPath,
    [
      join(root, 'apps/mobile/node_modules/expo/bin/cli'),
      'export',
      '--platform',
      'web',
      '--clear',
      '--max-workers',
      '2',
    ],
    join(root, 'apps/mobile'),
    {
      ...base,
      EXPO_PUBLIC_HOSTED_AUTH_MODE: '1',
      EXPO_PUBLIC_LOCAL_AUTH_MODE: '0',
      EXPO_PUBLIC_HOSTED_AUTH_TERMS_VERSION: version,
      EXPO_PUBLIC_HOSTED_AUTH_TERMS_URL: '/legal/terms',
      EXPO_PUBLIC_HOSTED_AUTH_PRIVACY_URL: '/legal/privacy',
    },
  )
} catch (error) {
  console.error(`[production] ${error.message}`)
  process.exitCode = 1
}
