export function parseEvaluationArguments(argv) {
  const allowed = ['dataset', 'manifest-sha256', 'calibration', 'test', 'policy', 'output', 'now'],
    args = {}
  for (const raw of argv) {
    const match = /^--([a-z0-9-]+)=(.+)$/u.exec(raw)
    if (!match || !allowed.includes(match[1]) || Object.hasOwn(args, match[1]))
      throw new Error(
        'Use one --name=value for dataset, manifest-sha256, calibration, test, policy, output, and optional now',
      )
    args[match[1]] = match[2]
  }
  if (allowed.filter((key) => key !== 'now').some((key) => !args[key]))
    throw new Error(
      'Dataset, independently reviewed manifest-sha256, both prediction splits, policy and new output path are required',
    )
  return args
}
