// This command deliberately has no activation, network or resource-creation mode.
try {
  if (process.argv.length !== 2) throw new Error('Unsupported argument')
  const { inspectHostedReadiness } = await import('../apps/api/dist/hosted-readiness.js')
  const report = inspectHostedReadiness(process.env)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  process.exitCode = 2 // Configuration inspection cannot authorize a production launch.
} catch {
  process.stderr.write(
    'Hosted readiness inspection unavailable. Build the API and pass no arguments.\n',
  )
  process.exitCode = 1
}
