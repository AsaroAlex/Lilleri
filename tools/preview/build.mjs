import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startManagedProcess } from '../dev/processes.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const env = {
  ...process.env,
  EXPO_PUBLIC_API_URL: '/api',
  EXPO_PUBLIC_LOCAL_AUTH_MODE: '0',
  EXPO_NO_DOTENV: '1',
  EXPO_OFFLINE: '1',
  EXPO_NO_TELEMETRY: '1',
  TURBO_TELEMETRY_DISABLED: '1',
  CI: '1',
}
let active
let stopping = false
const stop = () => {
  stopping = true
  process.exitCode = 1
  void active?.stop()
}
process.once('SIGINT', stop)
process.once('SIGTERM', stop)

async function run(command, args, cwd) {
  if (stopping) throw new Error('Preview build cancelled')
  active = startManagedProcess(command, args, { cwd, env })
  const result = await active.finished
  await active.stop()
  if (stopping || result.code !== 0) throw new Error('Compiled preview build failed')
}

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
  )
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
  )
} catch (error) {
  console.error(`[preview] ${error.message}`)
  process.exitCode = 1
}
