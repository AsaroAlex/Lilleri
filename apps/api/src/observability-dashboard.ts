import type { Observability } from './observability.js'

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
      character,
  )

/** Local operator view. Read only, no scripts, external assets, identifiers or financial records. */
export function renderObservabilityDashboard(observability: Observability): string {
  const snapshot = observability.snapshot()
  const sections = [
    ['HTTP requests and errors', ['lilleri_http_requests_total', 'lilleri_http_errors_total']],
    [
      'Request duration',
      [
        'lilleri_http_duration_ms_bucket',
        'lilleri_http_duration_ms_count',
        'lilleri_http_duration_ms_sum',
      ],
    ],
    ['Sync runs and row outcomes', ['lilleri_sync_runs_total', 'lilleri_sync_rows_total']],
    ['Inbox and decisions', ['lilleri_inbox_actions_total', 'lilleri_decisions_total']],
    [
      'Maintenance and bounded failures',
      [
        'lilleri_maintenance_runs_total',
        'lilleri_maintenance_items_total',
        'lilleri_failures_total',
      ],
    ],
    [
      'Telemetry delivery',
      ['lilleri_telemetry_sink_failures_total', 'lilleri_telemetry_dropped_total'],
    ],
  ] as const
  const panels = sections
    .map(([title, names]) => {
      const rows = snapshot.metrics.filter((row) => (names as readonly string[]).includes(row.name))
      const cells = rows
        .map(
          (row) =>
            `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(
              Object.entries(row.labels)
                .map(([key, value]) => `${key}=${value}`)
                .join(', '),
            )}</td><td>${escapeHtml(String(row.value))}</td></tr>`,
        )
        .join('')
      return `<section><h2>${title}</h2>${rows.length ? `<table><thead><tr><th>Metric</th><th>Bounded dimensions</th><th>Value</th></tr></thead><tbody>${cells}</tbody></table>` : '<p>No observations in this process.</p>'}</section>`
    })
    .join('')
  const aggregates = snapshot.semanticAggregates
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(
          Object.entries(row.properties)
            .map(([key, value]) => `${key}=${value}`)
            .join(', '),
        )}</td><td>${escapeHtml(String(row.count))}</td></tr>`,
    )
    .join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Lilleri local observability</title><style>body{font:16px system-ui,sans-serif;max-width:90rem;margin:2rem auto;padding:0 1rem;color:#17251e;background:#fafaf6}h1{font-size:2rem}h2{font-size:1.25rem}section{margin:2rem 0}table{border-collapse:collapse;width:100%;display:block;overflow:auto}th,td{padding:.55rem;border-bottom:1px solid #d5ddd5;text-align:left}td:last-child{font-variant-numeric:tabular-nums}p{max-width:70rem;line-height:1.5}</style></head><body><h1>Lilleri local observability</h1><p>Process-local synthetic diagnostics. Counters reset on restart. These observations do not establish provider reliability, user conversion, production readiness or anonymity. Small semantic cells are suppressed.</p>${panels}<section><h2>Suppressed semantic aggregate view</h2><p>Engineering catalogue ${escapeHtml(snapshot.catalogueVersion)}. Optional analytics is off by default; privacy review remains required before real-data use.</p>${aggregates ? `<table><thead><tr><th>Event</th><th>Approved dimensions</th><th>Count</th></tr></thead><tbody>${aggregates}</tbody></table>` : '<p>No semantic cells meet the minimum count.</p>'}</section></body></html>`
}
