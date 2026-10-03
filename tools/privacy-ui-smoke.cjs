/**
 * Actual Expo privacy controls against a disposable synthetic DEMO_MODE=1 archive.
 * Run sequentially with other writers: node tools/privacy-ui-smoke.cjs UI_ORIGIN API_ORIGIN.
 * Leaves rulesOnly/quiet/private false and optional service permission withdrawn.
 * Choice audit remains. Never target a personal archive. Playwright/Chromium are local prerequisites.
 */
const assert = require('node:assert/strict')
const { writeFile } = require('node:fs/promises')
const { chromium } = require('playwright')
const ui = process.argv[2] || 'http://localhost:8082'
const api = process.argv[3] || 'http://127.0.0.1:3004'
// biome-ignore lint/suspicious/noUndeclaredEnvVars: This manual smoke helper is outside cached Turbo tasks.
const reportPath = process.env.LILLERI_PRIVACY_SMOKE_REPORT || '/tmp/lilleri-privacy-ui.json'
const report = { status: 'running', checks: [], pageErrors: [] }
const check = (label) => {
  report.checks.push(label)
  console.log(`PASS ${label}`)
}
function validateOrigin(value) {
  const url = new URL(value)
  assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  assert.equal(value, url.origin, 'An exact loopback HTTP origin is required')
}
async function request(path, method = 'GET', body, status = 200) {
  const response = await fetch(`${api}${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20_000),
  })
  assert.equal(response.status, status, `${method} ${path}`)
  return response.json()
}
const checkbox = (page, name) => page.getByRole('checkbox', { name, exact: true })
const rulesLabel = 'Usa solo le mie regole'
const serviceLabel = 'Ricevi gli avvisi facoltativi nell’app'
async function actionResponse(page, path, action, expected = 200) {
  const response = page.waitForResponse(
    (value) => new URL(value.url()).pathname === path && value.request().method() === 'PATCH',
  )
  await action()
  const received = await response
  assert.equal(received.status(), expected, `PATCH ${path}`)
  await page
    .getByRole('button', { name: 'Ricarica le preferenze', exact: true })
    .waitFor({ state: 'visible' })
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('[role="button"]')].find(
      (value) => value.textContent === 'Ricarica le preferenze',
    )
    return button && button.getAttribute('aria-disabled') !== 'true'
  })
  return received
}
async function change(page, label, path, expected = 200) {
  return actionResponse(page, path, () => checkbox(page, label).click(), expected)
}
const finance = (value) => ({
  accounts: value.accounts
    .map(({ balanceUpdatedAt: _freshness, ...facts }) => facts)
    .sort((first, second) => first.id.localeCompare(second.id)),
  transactions: [...value.transactions].sort((first, second) => first.id.localeCompare(second.id)),
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
const displayedDate = (value) =>
  value
    ? new Intl.DateTimeFormat('it-IT', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(`${value}T00:00:00Z`))
    : 'Data non comunicata'
async function open(page) {
  await page.getByRole('button', { name: 'Privacy', exact: true }).click()
  await page
    .getByRole('heading', { name: 'Le tue preferenze di riservatezza', exact: true })
    .waitFor()
  await checkbox(page, rulesLabel).waitFor()
  await checkbox(page, serviceLabel).waitFor()
}
async function noOverflow(page, width) {
  await page.setViewportSize({ width, height: 844 })
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }))
  assert.ok(dimensions.content <= dimensions.width + 1, JSON.stringify(dimensions))
}
;(async () => {
  validateOrigin(ui)
  validateOrigin(api)
  const initial = await request('/v1/demo')
  assert.equal(initial.mode, 'synthetic')
  const transaction =
    initial.transactions.find((row) => {
      const category = initial.analysis.classifications.find(
        (value) => value.transactionId === row.id,
      )
      return (
        category?.source === 'global' &&
        category.evidence.some((value) => value.startsWith('dictionary:'))
      )
    }) || initial.transactions[0]
  assert.ok(transaction, 'A synthetic owned transaction is required')
  assert.ok(
    initial.analysis.classifications.some(
      (row) =>
        row.source === 'global' && row.evidence.some((value) => value.startsWith('dictionary:')),
    ),
    'An actual dictionary match is required for the rules-only check',
  )
  const txPath = `/v1/transactions/${encodeURIComponent(transaction.id)}/privacy`
  const initialSettings = await request('/v1/privacy/settings')
  const initialFlags = await request(txPath)
  assert.equal(initialSettings.rulesOnly, false, 'Start with ordinary classification')
  assert.equal(initialFlags.quiet, false, 'Start with unflagged fixture metadata')
  assert.equal(initialFlags.private, false, 'Start with unflagged fixture metadata')
  const browser = await chromium.launch({
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual browser validation prerequisite.
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
    await page.getByRole('button', { name: 'Controlla', exact: true }).waitFor()
    await open(page)
    assert.equal(
      await page.getByRole('checkbox', { name: /AI|analytics|analisi identificata/i }).count(),
      0,
    )
    check('no unavailable external-AI or identified-analytics opt-in controls')
    await change(page, rulesLabel, '/v1/privacy/settings')
    assert.equal((await request('/v1/privacy/settings')).rulesOnly, true)
    const restricted = await request('/v1/demo')
    assertFinance(restricted, initial)
    assert.ok(
      !restricted.analysis.classifications.some(
        (row) =>
          row.source === 'global' && row.evidence.some((value) => value.startsWith('dictionary:')),
      ),
    )
    check(
      'rules-only persists and removes actual dictionary matches while retaining the owned ledger',
    )
    await change(page, rulesLabel, '/v1/privacy/settings')
    assert.equal((await request('/v1/privacy/settings')).rulesOnly, false)
    check('rules-only can be reversed explicitly')
    let permission = (await request('/v1/privacy/permissions')).permissions.find(
      (row) => row.purpose === 'N-SERVICE',
    )
    if (permission.localPreferenceEnabled)
      await change(page, serviceLabel, '/v1/privacy/permissions/N-SERVICE')
    await change(page, serviceLabel, '/v1/privacy/permissions/N-SERVICE')
    permission = (await request('/v1/privacy/permissions')).permissions.find(
      (row) => row.purpose === 'N-SERVICE',
    )
    assert.equal(permission.localPreferenceEnabled, true)
    assert.equal(permission.nativePushEnabled, false)
    assert.equal(permission.osPermission, 'unknown')
    check('explicit current draft choice enables only available in-app optional service preference')
    // One explicitly injected response models an obsolete stored grant. The actual API
    // independently tests obsolete-copy withdrawal; this fixture verifies UI availability.
    const obsoleteGrantView = async (route) => {
      const response = await route.fetch()
      const body = await response.json()
      await route.fulfill({
        response,
        json: {
          ...body,
          permissions: body.permissions.map((row) =>
            row.purpose === 'N-SERVICE' && row.granted
              ? {
                  ...row,
                  localPreferenceEnabled: false,
                  effectiveEnabled: false,
                  textIsCurrent: false,
                  textVersion: 'n-service/local-it-IT/draft-obsolete',
                  textHash: '0'.repeat(64),
                }
              : row,
          ),
        },
      })
    }
    await page.route('**/v1/privacy/permissions', obsoleteGrantView)
    await page.getByRole('button', { name: 'Ricarica le preferenze', exact: true }).click()
    const withdraw = page.getByRole('button', { name: 'Revoca la scelta precedente', exact: true })
    await withdraw.waitFor()
    assert.equal(await checkbox(page, serviceLabel).getAttribute('aria-checked'), 'false')
    const withdrawal = await actionResponse(page, '/v1/privacy/permissions/N-SERVICE', () =>
      withdraw.click(),
    )
    const withdrawalBody = withdrawal.request().postDataJSON()
    assert.deepEqual(Object.keys(withdrawalBody).sort(), ['action', 'revision'])
    assert.equal(withdrawalBody.action, 'revoked')
    await page.unroute('**/v1/privacy/permissions', obsoleteGrantView)
    check(
      'synthetic obsolete-grant view exposes independent revision-only withdrawal against the actual API',
    )
    assert.equal(
      (await request('/v1/privacy/permissions')).permissions.find(
        (row) => row.purpose === 'N-SERVICE',
      ).localPreferenceEnabled,
      false,
    )
    assert.ok((await request('/v1/export')).profile)
    check('withdrawal succeeds and owned export remains accessible')
    const search = page.getByRole('textbox', {
      name: 'Cerca un movimento per le preferenze di riservatezza',
      exact: true,
    })
    await search.fill(transaction.merchantName || transaction.description)
    await page
      .getByRole('button', {
        name: `${displayedDate(transaction.bookedOn)} · ${transaction.merchantName || transaction.description}`,
        exact: true,
      })
      .first()
      .click()
    await checkbox(page, 'Movimento quieto').waitFor()
    await change(page, 'Movimento quieto', txPath)
    await change(page, 'Movimento riservato', txPath)
    const flagged = await request(txPath)
    assert.equal(flagged.quiet, true)
    assert.equal(flagged.private, true)
    assertFinance(await request('/v1/demo'), initial)
    const ownedExport = await request('/v1/export')
    assert.ok(ownedExport.transactions.some((row) => row.id === transaction.id))
    assert.ok(
      ownedExport.privacy.transactionFlags.some(
        (row) => row.transactionId === transaction.id && row.quiet && row.private,
      ),
    )
    check(
      'quiet/private flags persist independently, preserve finance, and remain in ownership export',
    )
    await request(txPath, 'PATCH', { revision: flagged.revision, quiet: false, private: false })
    let patchCount = 0
    const countPatch = (value) => {
      if (new URL(value.url()).pathname === txPath && value.method() === 'PATCH') patchCount++
    }
    page.on('request', countPatch)
    await change(page, 'Movimento quieto', txPath, 409)
    await page
      .getByText(
        'Le preferenze sono cambiate. Ho aggiornato i dati: controllali e scegli di nuovo.',
        { exact: true },
      )
      .waitFor()
    assert.equal(patchCount, 1)
    page.off('request', countPatch)
    assert.equal((await request(txPath)).quiet, false)
    assert.equal((await request(txPath)).private, false)
    assert.equal(await checkbox(page, 'Movimento quieto').getAttribute('aria-checked'), 'false')
    check('stale transaction choice refreshes saved values without automatic resubmission')
    const panel = page
      .getByRole('heading', { name: 'Le tue preferenze di riservatezza', exact: true })
      .locator('..')
    for (const control of await panel.locator('[role="checkbox"], [role="button"]').all()) {
      const bounds = await control.boundingBox()
      assert.ok(
        bounds && bounds.height >= 48 && bounds.width >= 48,
        'Privacy controls need 48-point targets',
      )
    }
    await noOverflow(page, 390)
    await noOverflow(page, 320)
    check('48-point controls and no horizontal overflow at 390/320 CSS pixels')
    await page.reload()
    await page.getByRole('button', { name: 'Controlla', exact: true }).waitFor()
    await open(page)
    assert.equal(await checkbox(page, rulesLabel).getAttribute('aria-checked'), 'false')
    assert.equal(await checkbox(page, serviceLabel).getAttribute('aria-checked'), 'false')
    const finalSettings = await request('/v1/privacy/settings')
    const finalFlags = await request(txPath)
    assert.equal(finalSettings.rulesOnly, false)
    assert.equal(finalFlags.quiet, false)
    assert.equal(finalFlags.private, false)
    assertFinance(await request('/v1/demo'), initial)
    assert.deepEqual(report.pageErrors, [])
    check('saved preferences survive a browser reload and the disposable archive is restored')
    report.status = 'passed'
  } finally {
    await browser.close()
    const settings = await request('/v1/privacy/settings')
    if (settings.rulesOnly)
      await request('/v1/privacy/settings', 'PATCH', {
        revision: settings.revision,
        rulesOnly: false,
      })
    const flags = await request(txPath)
    if (flags.quiet || flags.private)
      await request(txPath, 'PATCH', { revision: flags.revision, quiet: false, private: false })
    const permission = (await request('/v1/privacy/permissions')).permissions.find(
      (row) => row.purpose === 'N-SERVICE',
    )
    if (permission.localPreferenceEnabled)
      await request('/v1/privacy/permissions/N-SERVICE', 'PATCH', {
        revision: permission.revision,
        action: 'revoked',
      })
  }
})()
  .catch((cause) => {
    report.status = 'failed'
    report.error = cause instanceof Error ? cause.message : 'privacy_ui_smoke_failed'
    console.error(report.error)
    process.exitCode = 1
  })
  .finally(async () => {
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  })
