/** Serialize builds and restarts; retain the running API when a build fails. */
export function createRebuildQueue({ build, restart, report = () => {}, debounceMs = 200 }) {
  let dirty = false
  let stopped = false
  let timer
  let running
  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    if (stopped) return running ?? Promise.resolve()
    if (running) return running
    running = (async () => {
      while (dirty && !stopped) {
        dirty = false
        report('building')
        let phase = 'build'
        try {
          await build()
          // Changes during compilation require a fresh complete build before reopening the archive.
          if (!dirty && !stopped) {
            phase = 'restart'
            await restart()
            report('ready')
          }
        } catch (error) {
          report('failed', error, phase)
        }
      }
    })().finally(() => {
      running = undefined
    })
    return running
  }
  return {
    invalidate() {
      if (stopped) return
      dirty = true
      clearTimeout(timer)
      timer = setTimeout(flush, debounceMs)
    },
    flush,
    async close() {
      stopped = true
      dirty = false
      clearTimeout(timer)
      await running
    },
  }
}
