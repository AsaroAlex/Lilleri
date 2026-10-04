/**
 * Actual Expo web connection flows against an isolated synthetic demo archive.
 * Start the current DEMO_MODE=1 API and Expo bundle with a NEW PGLITE_PATH.
 * This helper appends synthetic lifecycle events and leaves the connection active.
 * Do not target a personal archive or run competing writers against the same profile.
 * Run: node tools/connection-ui-smoke.cjs [UI_ORIGIN] [API_ORIGIN]
 * Defaults: http://localhost:8081 and http://127.0.0.1:3004.
 * Playwright and Chromium are validation prerequisites, not app dependencies.
 * Unknown-coverage display uses one explicitly injected synthetic browser fixture;
 * a separate actual-server request verifies refusal. This is no real coverage proof.
 */
const assert = require('node:assert/strict')
const { writeFile } = require('node:fs/promises')
const { chromium } = require('playwright')

const ui = process.argv[2] || 'http://localhost:8081'
const api = process.argv[3] || 'http://127.0.0.1:3004'
// biome-ignore lint/suspicious/noUndeclaredEnvVars: This manual helper is not a cached Turbo task.
const reportPath = process.env.LILLERI_CONNECTION_SMOKE_REPORT || '/tmp/lilleri-connection-ui.json'
const report = { checks: [], pageErrors: [], status: 'running' }
const check = (name) => {
  report.checks.push(name)
  console.log(`PASS ${name}`)
}
const button = (page, name) => page.getByRole('button', { name, exact: true })
function validateOrigin(value) {
  const url = new URL(value)
  assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  assert.equal(value, url.origin, 'Use an exact loopback HTTP origin')
}
async function request(path, method = 'GET', body, expected = 200) {
  const response = await fetch(`${api}${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20_000),
  })
  assert.equal(response.status, expected, `${method} ${path}`)
  return response.status === 204 ? undefined : response.json()
}
const finance = (value) => ({
  accounts: value.accounts
    .map(({ balanceUpdatedAt: _freshness, ...facts }) => facts)
    .sort((first, second) => first.id.localeCompare(second.id)),
  transactions: [...value.transactions].sort((first, second) => first.id.localeCompare(second.id)),
  analysis: value.analysis,
})
function assertFinance(value, initial) {
  assert.deepEqual(finance(value), finance(initial))
  const bankConnections = new Set(
    initial.connections.filter((row) => row.providerId === 'mock-italian').map((row) => row.id),
  )
  const previous = new Map(initial.accounts.map((row) => [row.id, row]))
  let updated = 0
  for (const account of value.accounts) {
    const before = previous.get(account.id)
    assert.ok(before)
    if (!bankConnections.has(account.connectionId))
      assert.equal(account.balanceUpdatedAt, before.balanceUpdatedAt)
    const first = Date.parse(before.balanceUpdatedAt),
      last = Date.parse(account.balanceUpdatedAt)
    assert.ok(
      Number.isFinite(first) && Number.isFinite(last) && last >= first && last <= Date.now(),
    )
    if (account.balanceUpdatedAt !== before.balanceUpdatedAt) updated++
  }
  report.accountFreshnessUpdates = Math.max(report.accountFreshnessUpdates || 0, updated)
}
async function openPanel(page) {
  await page.getByRole('button', { name: 'Movimenti', exact: true }).click()
  if (!(await button(page, 'Collegamenti e fonti').count()))
    await page.getByRole('button', { name: 'Impostazioni', exact: true }).click()
  await button(page, 'Collegamenti e fonti').click()
  await page.getByRole('heading', { name: 'Collegamenti', exact: true }).waitFor()
  await button(page, 'Ricarica stato e disponibilità').waitFor()
  await page.getByText('Disponibile solo nella simulazione', { exact: false }).first().waitFor()
}
async function actionResponse(page, path, action, status = 200) {
  const pending = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === path && response.request().method() === 'POST',
  )
  await action()
  const response = await pending
  assert.equal(response.status(), status, path)
  return response.json()
}
async function noOverflow(page, label) {
  const value = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  assert.ok(value.scrollWidth <= value.width + 1, `${label}: ${JSON.stringify(value)}`)
}

;(async () => {
  validateOrigin(ui)
  validateOrigin(api)
  const initial = await request('/v1/demo')
  assert.equal(initial.mode, 'synthetic')
  const connection = initial.connections.find((item) => item.providerId === 'mock-italian')
  assert.ok(connection, 'An isolated seeded fixture connection is required')
  const base = `/v1/connections/${encodeURIComponent(connection.id)}`
  const beforeLifecycle = await request(`${base}/lifecycle`)
  assert.equal(beforeLifecycle.state, 'active', 'Use a fresh active synthetic fixture')
  const beforeEvents = await request(`${base}/consent-events`)
  const browser = await chromium.launch({
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: This manual helper is not a cached Turbo task.
    executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  })
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    })
    context.setDefaultTimeout(20_000)
    const page = await context.newPage()
    page.on('pageerror', (error) => report.pageErrors.push(error.message))
    await page.goto(ui)
    await button(page, 'Controlla').waitFor()
    await openPanel(page)
    assert.equal(
      await page
        .getByRole('button', {
          name: /^(Home|Movimenti|Da controllare, \d+ moviment[oi]|Ricorrenti|Impostazioni)$/,
        })
        .count(),
      5,
    )
    await page.getByText('Nessuna banca reale viene collegata.', { exact: false }).waitFor()
    for (const label of ['Conto corrente', 'Risparmi', 'Carta', 'Contanti']) {
      await page.getByRole('radio', { name: label, exact: true }).click()
      await page
        .getByText(`${label} · Disponibile solo nella simulazione`, { exact: true })
        .waitFor()
    }
    for (const label of [
      'Scadenza dell’autorizzazione:',
      'Autenticazione richiesta dalla fonte:',
      'Scadenza della sessione della fonte:',
      'Scadenza del token della fonte:',
    ])
      await page.getByText(label, { exact: false }).waitFor()
    const panel = page.getByRole('heading', { name: 'Collegamenti', exact: true }).locator('..')
    for (const control of await panel.locator('[role="button"], [role="radio"]').all()) {
      const bounds = await control.boundingBox()
      assert.ok(
        bounds && bounds.width >= 43.5 && bounds.height >= 43.5,
        'Panel controls need a 44px web target',
      )
    }
    await noOverflow(page, '390px connection panel')
    check(
      'Five tabs retained; four account kinds and separate actual terms show synthetic provenance',
    )

    const paused = await actionResponse(page, `${base}/pause`, () =>
      button(page, 'Metti in pausa').click(),
    )
    await page
      .getByText('Collegamento in pausa. Lo storico e la scadenza sono conservati.', {
        exact: true,
      })
      .waitFor()
    assert.equal(paused.state, 'paused')
    assert.equal(paused.consentId, beforeLifecycle.consentId)
    assert.deepEqual(paused.authorization, beforeLifecycle.authorization)
    assertFinance(await request('/v1/demo'), initial)
    assert.equal(await button(page, 'Aggiorna questa fonte').isDisabled(), true)
    const denied = await request(`${base}/sync`, 'POST', {}, 409)
    assert.equal(denied.code, 'connection_paused')
    check('Pause denies actual sync and preserves consent generation, dates, accounts and ledger')

    const renewed = await actionResponse(page, `${base}/renew`, () =>
      button(page, 'Rinnova autorizzazione dimostrativa').click(),
    )
    await page.getByText('Rinnovo confermato dalla fonte dimostrativa.', { exact: false }).waitFor()
    assert.equal(renewed.state, 'paused')
    assert.equal(renewed.paused, true)
    assert.equal(renewed.consentId, beforeLifecycle.consentId)
    assertFinance(await request('/v1/demo'), initial)
    check('Provider renewal keeps the chosen pause and preserves financial facts')

    // Another accepted command changes the revision while this page keeps its older decision.
    const externallyRenewed = await request(`${base}/renew`, 'POST', { revision: renewed.revision })
    let resumeWrites = 0
    page.on('request', (outbound) => {
      if (new URL(outbound.url()).pathname === `${base}/resume` && outbound.method() === 'POST')
        resumeWrites++
    })
    const stale = await actionResponse(
      page,
      `${base}/resume`,
      () => button(page, 'Riprendi il collegamento').click(),
      409,
    )
    assert.equal(stale.code, 'consent_changed')
    await page
      .getByText('Il collegamento è cambiato. Ho aggiornato i dati:', { exact: false })
      .waitFor()
    await page.waitForTimeout(200)
    assert.equal(resumeWrites, 1, 'The stale command must not be replayed automatically')
    assert.equal((await request(`${base}/lifecycle`)).state, 'paused')
    assert.equal((await request(`${base}/lifecycle`)).revision, externallyRenewed.revision)
    check('Stale lifecycle command refreshes evidence once without replay or hidden resume')

    const resumed = await actionResponse(page, `${base}/resume`, () =>
      button(page, 'Riprendi il collegamento').click(),
    )
    await page
      .getByText('Collegamento ripreso. Puoi scegliere Aggiorna questa fonte.', { exact: true })
      .waitFor()
    assert.equal(resumed.state, 'active')
    assert.equal(resumed.paused, false)
    assertFinance(await request('/v1/demo'), initial)
    const events = await request(`${base}/consent-events`)
    assert.deepEqual(events.slice(0, beforeEvents.length), beforeEvents)
    assert.deepEqual(
      events.slice(beforeEvents.length).map((event) => event.action),
      ['paused', 'renewed', 'renewed', 'resumed'],
    )
    await button(page, 'Storico autorizzazione').click()
    await page.getByText('Autorizzazione rinnovata', { exact: true }).first().waitFor()
    check(
      'Fresh gesture resumes; ownership history keeps original events and accepted commands only',
    )

    await page.setViewportSize({ width: 320, height: 844 })
    await noOverflow(page, '320px connection panel and history')
    check('320px reflow with history and long controls has no horizontal overflow')

    const unknown = {
      id: 'synthetic-unknown-fixture',
      providerId: 'mock-italian',
      name: 'Istituto senza copertura — scenario sintetico',
      countryCode: 'IT',
      accountTypes: ['current', 'savings', 'card', 'cash'].map((kind) => ({
        kind,
        availability: 'unknown',
        evidence: { status: 'unknown', environment: 'synthetic', reference: null, checkedAt: null },
        historyFrom: null,
      })),
    }
    await page.route(`${api}/v1/institutions`, async (route) => {
      const original = await route.fetch()
      const catalogue = await original.json()
      await route.fulfill({
        response: original,
        json: { ...catalogue, institutions: [...catalogue.institutions, unknown] },
      })
    })
    await button(page, 'Ricarica stato e disponibilità').click()
    const unknownCard = page.getByText(unknown.name, { exact: true }).locator('..')
    await unknownCard.getByText('Copertura non verificata', { exact: false }).waitFor()
    assert.equal(
      await unknownCard
        .getByRole('button', { name: 'Collega la fonte dimostrativa', exact: true })
        .count(),
      0,
    )
    const refused = await fetch(`${api}/v1/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institutionId: unknown.id, accountKind: 'current' }),
      signal: AbortSignal.timeout(20_000),
    })
    assert.ok(
      refused.status >= 400 && refused.status < 500,
      'The actual server must refuse unknown institution selection',
    )
    assertFinance(await request('/v1/demo'), initial)
    await unknownCard.getByRole('button', { name: 'Aggiungi il saldo a mano', exact: true }).click()
    await page.getByRole('tab', { name: 'Importa CSV', exact: true }).waitFor()
    check(
      'Injected unknown synthetic coverage offers manual fallback; actual server refuses its selection',
    )
    await page.unroute(`${api}/v1/institutions`)

    await openPanel(page)
    let release
    let started
    const waiting = new Promise((resolve) => {
      release = resolve
    })
    const observed = new Promise((resolve) => {
      started = resolve
    })
    await page.route(`${api}${base}/consent-events`, async (route) => {
      started()
      await waiting
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': ui, 'access-control-allow-credentials': 'true' },
        body: JSON.stringify({
          code: 'session_expired',
          detail: 'Synthetic delayed history response must stay hidden',
        }),
      })
    })
    await button(page, 'Storico autorizzazione').click()
    await observed
    await page.getByRole('button', { name: 'Home', exact: true }).click()
    release()
    await button(page, 'Controlla').waitFor()
    await page.waitForTimeout(200)
    assert.equal(
      await page
        .getByText('Synthetic delayed history response must stay hidden', { exact: true })
        .count(),
      0,
    )
    check('Late history response after panel unmount leaves the current page untouched')
    assert.deepEqual(report.pageErrors, [])
    check('No browser JavaScript errors')
    report.status = 'passed'
  } finally {
    await browser.close()
    await writeFile(reportPath, JSON.stringify(report, null, 2))
  }
})().catch(async (error) => {
  report.status = 'failed'
  report.failure = error.message
  await writeFile(reportPath, JSON.stringify(report, null, 2))
  console.error(error.stack || error.message)
  process.exitCode = 1
})
