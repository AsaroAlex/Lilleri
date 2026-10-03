import { open } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openDatabase } from '@lilleri/database'
import { RuntimeConfigurationStore } from './runtime-config.js'

type Command =
  | { command: 'init' }
  | { command: 'status' }
  | { command: 'history' }
  | {
      command: 'update'
      expectedRevision: number
      reason: 'tuning' | 'incident' | 'release'
      path: string
    }
  | { command: 'rollback'; expectedRevision: number; targetRevision: number }
export function runtimeConfigurationOperatorArguments(
  environment: Readonly<Record<string, string | undefined>>,
  arguments_: readonly string[],
): Command & { url: string } {
  if (environment.NODE_ENV === 'production')
    throw new Error('Runtime configuration operator is synthetic-only')
  for (const name of ['DEMO_MODE', 'LOCAL_AUTH_MODE'])
    if (environment[name] !== undefined && !['0', '1'].includes(environment[name] ?? ''))
      throw new Error('Invalid synthetic mode')
  if ((environment.DEMO_MODE === '1') === (environment.LOCAL_AUTH_MODE === '1'))
    throw new Error('Choose exactly one synthetic mode')
  if (environment.PGLITE_PATH !== undefined)
    throw new Error('A standalone operator cannot open a shared PGlite store')
  const url = environment.DATABASE_URL
  if (!url || !['postgres:', 'postgresql:'].includes(new URL(url).protocol))
    throw new Error('A trusted synthetic PostgreSQL URL is required')
  const revision = (value: string | undefined) => {
    if (!value || !/^[1-9]\d*$/.test(value)) throw new Error('Invalid revision')
    const parsed = Number(value)
    if (!Number.isSafeInteger(parsed) || parsed > 2_147_483_646) throw new Error('Invalid revision')
    return parsed
  }
  const command = arguments_[0] ?? 'status'
  if (['init', 'status', 'history'].includes(command) && arguments_.length <= 1)
    return { command: command as 'init' | 'status' | 'history', url }
  if (command === 'rollback' && arguments_.length === 3)
    return {
      command,
      expectedRevision: revision(arguments_[1]),
      targetRevision: revision(arguments_[2]),
      url,
    }
  const reason = arguments_[1],
    path = arguments_[3]
  if (
    command === 'update' &&
    arguments_.length === 4 &&
    (reason === 'tuning' || reason === 'incident' || reason === 'release') &&
    path &&
    path.length <= 4096 &&
    !path.includes('\0')
  )
    return { command, reason, expectedRevision: revision(arguments_[2]), path, url }
  throw new Error('Invalid runtime configuration command')
}

async function main() {
  const options = runtimeConfigurationOperatorArguments(process.env, process.argv.slice(2))
  const handle = await openDatabase({ driver: 'postgres', url: options.url })
  try {
    const store = new RuntimeConfigurationStore(handle.db)
    if (options.command === 'init') console.log(JSON.stringify(await store.ensure()))
    else if (options.command === 'status') console.log(JSON.stringify(await store.read()))
    else if (options.command === 'history') console.log(JSON.stringify(await store.history()))
    else if (options.command === 'rollback')
      console.log(
        JSON.stringify(
          await store.rollback(options.expectedRevision, options.targetRevision, 'local_operator'),
        ),
      )
    else {
      const file = await open(options.path, 'r')
      let values: unknown
      try {
        const metadata = await file.stat()
        if (!metadata.isFile() || metadata.size > 16_384)
          throw new Error('Invalid configuration file')
        // Bound the read itself: growth after stat cannot allocate an unbounded buffer.
        const bytes = Buffer.alloc(16_385)
        let offset = 0
        while (offset < bytes.length) {
          const result = await file.read(bytes, offset, bytes.length - offset, offset)
          if (!result.bytesRead) break
          offset += result.bytesRead
        }
        if (offset > 16_384) throw new Error('Invalid configuration file')
        values = JSON.parse(bytes.subarray(0, offset).toString('utf8'))
      } finally {
        await file.close()
      }
      console.log(
        JSON.stringify(
          await store.update(options.expectedRevision, values, {
            actor: 'local_operator',
            reason: options.reason,
          }),
        ),
      )
    }
  } finally {
    await handle.close()
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]))
  void main().catch(() => {
    // No file paths, input values, SQL, connection credentials or private exceptions in output.
    console.error(JSON.stringify({ errorCode: 'runtime_configuration_operator_failed' }))
    process.exitCode = 2
  })
