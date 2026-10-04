import { spawn } from 'node:child_process'

/** Each child owns a process group so stopping Metro/Next also stops their workers. */
export function startManagedProcess(command, args, options) {
  const child = spawn(command, args, {
    ...options,
    stdio: options.stdio ?? 'inherit',
    detached: process.platform !== 'win32',
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
  })
  let intentional = false
  const finished = new Promise((resolve) => {
    child.once('error', (error) => resolve({ code: 1, error }))
    child.once('exit', (code, signal) => resolve({ code, signal }))
  })
  let stopping
  const signal = (name) => {
    if (!child.pid) return
    try {
      if (process.platform === 'win32') child.kill(name)
      else process.kill(-child.pid, name)
    } catch (error) {
      if (error.code !== 'ESRCH') throw error
    }
  }
  return {
    child,
    finished,
    get intentional() {
      return intentional
    },
    stop() {
      if (stopping) return stopping
      intentional = true
      stopping = (async () => {
        signal('SIGTERM')
        const timer = setTimeout(() => signal('SIGKILL'), 8_000)
        timer.unref()
        try {
          await finished
        } finally {
          clearTimeout(timer)
          // A CLI can exit before its worker. Clear any remaining members of this group.
          signal('SIGKILL')
        }
      })()
      return stopping
    },
  }
}
