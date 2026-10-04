/** Actual UI writes. Only use a disposable DEMO_MODE=1 archive and an exclusive writer slot.
 * node tools/merchant-taxonomy-ui-smoke.cjs UI_ORIGIN API_ORIGIN
 * Preserves source finances and restores privacy/locale. Explicit synthetic decision audits remain.
 */
const assert = require('node:assert/strict')
const { assertFinancialUnchanged } = require('./demo-financial-invariant.cjs')
const { writeFile } = require('node:fs/promises')
const { chromium } = require('playwright')
const ui = process.argv[2] || 'http://localhost:8082'
const api = process.argv[3] || 'http://127.0.0.1:3004'
const reportPath =
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual helper is outside cached Turbo tasks.
  process.env.LILLERI_MERCHANT_SMOKE_REPORT || '/tmp/lilleri-merchant-taxonomy-ui.json'
const report = { status: 'running', checks: [], pageErrors: [] }
const check = (label) => {
  report.checks.push(label)
  console.log(`PASS ${label}`)
}
function origin(value) {
  const url = new URL(value)
  assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  assert.equal(value, url.origin)
}
async function request(path, method = 'GET', body, status = 200) {
  const response = await fetch(`${api}${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20_000),
  })
  assert.equal(response.status, status, `${method} ${path}`)
  return response.json()
}
const button = (context, name) => context.getByRole('button', { name, exact: true })
async function action(page, path, method, gesture, status = 200) {
  const receipt = page.waitForResponse(
    (value) => new URL(value.url()).pathname === path && value.request().method() === method,
  )
  await gesture()
  const response = await receipt
  assert.equal(response.status(), status, `${method} ${path}`)
  return response.json()
}
let privacyPath, originalPrivacy, originalSettings
async function locale(value) {
  const { settings } = await request('/v1/settings')
  return request('/v1/settings', 'PATCH', {
    displayName: settings.displayName,
    timezone: settings.timezone,
    locale: value,
    revision: settings.revision,
  })
}
async function restorePrivacy() {
  if (!privacyPath || !originalPrivacy) return
  const current = await request(privacyPath)
  if (current.quiet !== originalPrivacy.quiet || current.private !== originalPrivacy.private)
    await request(privacyPath, 'PATCH', {
      revision: current.revision,
      quiet: originalPrivacy.quiet,
      private: originalPrivacy.private,
    })
}
;(async () => {
  origin(ui)
  origin(api)
  const initial = await request('/v1/demo')
  assert.equal(initial.mode, 'synthetic')
  const { settings } = await request('/v1/settings')
  originalSettings = settings
  if (settings.locale !== 'it-IT') await locale('it-IT')
  const state = await request('/v1/merchants')
  assert.equal(state.taxonomy.parents.length, 15)
  assert.equal(state.taxonomy.leaves.length, 72)
  const resolved = state.resolutions.find(
    (row) =>
      row.normalizedKey &&
      initial.transactions.some(
        (tx) => tx.id === row.transactionId && tx.kind === 'expense' && tx.status === 'booked',
      ),
  )
  assert.ok(
    resolved,
    'An actual visible synthetic expense with supported merchant source is required',
  )
  const tx = initial.transactions.find((row) => row.id === resolved.transactionId)
  assert.ok(tx)
  privacyPath = `/v1/transactions/${encodeURIComponent(tx.id)}/privacy`
  originalPrivacy = await request(privacyPath)
  const suffix = Date.now().toString(36),
    ownName = `Esercente prova ${suffix}`,
    sourceName = `Categoria prova ${suffix}`,
    targetName = `Destinazione prova ${suffix}`
  const browser = await chromium.launch({
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Optional local Chromium override.
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
    const open = async (title = 'Esercenti e categorie') => {
      await page.goto(ui, { waitUntil: 'networkidle' })
      await button(page, title === 'Merchants and categories' ? 'Settings' : 'Impostazioni').click()
      await button(page, title).click()
      await page.getByRole('heading', { name: title, exact: true, level: 2 }).waitFor()
      await button(panel(), title === 'Merchants and categories' ? 'Refresh' : 'Aggiorna').waitFor()
    }
    const panel = () =>
      page
        .getByRole('heading', {
          name: /^(Esercenti e categorie|Merchants and categories)$/,
          level: 2,
        })
        .locator('..')
    const ready = async () => {
      await button(panel(), 'Aggiorna').waitFor()
      await page.waitForFunction(() =>
        [...document.querySelectorAll('[role="button"]')].some(
          (row) => row.textContent === 'Aggiorna' && row.getAttribute('aria-disabled') !== 'true',
        ),
      )
    }
    const choose = async () => {
      await ready()
      await panel()
        .getByRole('radio')
        .filter({ hasText: tx.merchantName ?? tx.description })
        .first()
        .click()
    }
    const card = (name) => panel().getByText(name, { exact: true }).locator('..')
    const create = async (name) => {
      await button(panel(), 'Crea una categoria').click()
      await panel().getByRole('textbox', { name: 'Nome della categoria', exact: true }).fill(name)
      return action(page, '/v1/categories', 'POST', () => button(panel(), 'Salva').click(), 201)
    }
    await open()
    await ready()
    assert.equal(
      await page
        .getByRole('heading', { name: 'Esercenti e categorie', exact: true, level: 2 })
        .getAttribute('aria-level'),
      '2',
    )
    check('Actual 72-leaf/15-parent catalogue and accessible merchant panel load')
    await choose()
    await panel().getByRole('textbox', { name: 'Nome da mostrare', exact: true }).fill(ownName)
    const beforePreview = await request('/v1/merchants')
    const preview = await action(page, '/v1/merchants/preview', 'POST', () =>
      button(panel(), 'Controlla le modifiche').click(),
    )
    assert.ok(preview.affectedTransactionIds.includes(tx.id))
    assert.deepEqual((await request('/v1/merchants')).aliases, beforePreview.aliases)
    check('Merchant preview is read-only and reports actual owned visible impact')
    let current = await request(privacyPath)
    await request(privacyPath, 'PATCH', { revision: current.revision, quiet: true, private: false })
    current = await request(privacyPath)
    await request(privacyPath, 'PATCH', {
      revision: current.revision,
      quiet: false,
      private: false,
    })
    const conflict = await action(
      page,
      '/v1/merchants/apply',
      'POST',
      () => button(panel(), 'Applica il nome').click(),
      409,
    )
    assert.equal(conflict.code, 'recognition_changed')
    await panel().getByRole('alert').waitFor()
    assert.equal(await button(panel(), 'Applica il nome').count(), 0)
    check('Privacy ABA rejects stale preview with no automatic mutation replay')
    await choose()
    await panel().getByRole('textbox', { name: 'Nome da mostrare', exact: true }).fill(ownName)
    await action(page, '/v1/merchants/preview', 'POST', () =>
      button(panel(), 'Controlla le modifiche').click(),
    )
    const alias = await action(page, '/v1/merchants/apply', 'POST', () =>
      button(panel(), 'Applica il nome').click(),
    )
    await ready()
    await choose()
    await panel()
      .getByRole('textbox', { name: 'Nome da mostrare', exact: true })
      .fill(`${ownName} nuovo`)
    await action(page, '/v1/merchants/preview', 'POST', () =>
      button(panel(), 'Controlla le modifiche').click(),
    )
    const renamed = await action(page, '/v1/merchants/apply', 'POST', () =>
      button(panel(), 'Applica il nome').click(),
    )
    assert.equal(renamed.merchantId, alias.merchantId)
    assert.equal(renamed.revision, alias.revision + 1)
    check('Private merchant apply and rename preserve stable grouping identity')
    await ready()
    const source = await create(sourceName)
    await ready()
    const target = await create(targetName)
    await choose()
    await panel().getByRole('radio', { name: sourceName, exact: true }).click()
    const assignment = await action(
      page,
      `/v1/transactions/${encodeURIComponent(tx.id)}/category`,
      'POST',
      () => button(panel(), 'Assegna la categoria').click(),
    )
    assert.equal(assignment.categoryId, source.id)
    assert.equal(assignment.labelSnapshot, sourceName)
    check('Category creation and explicit assignment persist the user label and revision')
    await ready()
    await button(card(sourceName), 'Modifica categoria').click()
    await panel()
      .getByRole('textbox', { name: 'Nome della categoria', exact: true })
      .fill(`${sourceName} nuovo`)
    const sourceRenamed = await action(
      page,
      `/v1/categories/${encodeURIComponent(source.id)}`,
      'PATCH',
      () => button(panel(), 'Salva').click(),
    )
    assert.equal(
      (await request('/v1/merchants')).assignments.find((row) => row.transactionId === tx.id)
        .labelSnapshot,
      sourceName,
    )
    check('Category rename preserves the historical assignment label')
    await ready()
    await button(card(sourceRenamed.label), 'Unisci o archivia').click()
    await panel().getByRole('radio', { name: targetName, exact: true }).click()
    await action(
      page,
      `/v1/categories/${encodeURIComponent(source.id)}/migration-preview`,
      'POST',
      () => button(panel(), 'Controlla le modifiche').click(),
    )
    await action(page, `/v1/categories/${encodeURIComponent(source.id)}/migrate`, 'POST', () =>
      button(panel(), 'Conferma unione o archivio').click(),
    )
    await ready()
    assert.equal(
      (await request('/v1/merchants')).assignments.find((row) => row.transactionId === tx.id)
        .categoryId,
      target.id,
    )
    await action(page, `/v1/categories/${encodeURIComponent(source.id)}/undo`, 'POST', () =>
      button(card(`${sourceRenamed.label} · Archiviata`), 'Annulla modifica').click(),
    )
    await ready()
    const restored = (await request('/v1/merchants')).assignments.find(
      (row) => row.transactionId === tx.id,
    )
    assert.equal(restored.categoryId, source.id)
    assert.equal(restored.labelSnapshot, sourceName)
    check('Merge preview/apply/undo restore exact historical category choice')
    current = await request(privacyPath)
    await request(privacyPath, 'PATCH', { revision: current.revision, quiet: true, private: true })
    await button(panel(), 'Aggiorna').click()
    await ready()
    const hidden = await request('/v1/merchants')
    assert.ok(!hidden.resolutions.some((row) => row.transactionId === tx.id))
    assert.ok(!hidden.assignments.some((row) => row.transactionId === tx.id))
    await restorePrivacy()
    check('Quiet/private source rows are excluded from proposals and category assignment listings')
    await locale('en-GB')
    await open('Merchants and categories')
    await panel().getByText('Your categories', { exact: true }).waitFor()
    assert.ok(await button(panel(), 'Create a category').count())
    check('English UI uses the real profile display preference')
    const dimensions = await page.evaluate(() => ({
      viewport: innerWidth,
      content: document.documentElement.scrollWidth,
    }))
    assert.ok(dimensions.content <= dimensions.viewport + 1, JSON.stringify(dimensions))
    assertFinancialUnchanged(initial, await request('/v1/demo'), report, false)
    assert.deepEqual(report.pageErrors, [])
    check('390px panel has no overflow, no JavaScript error, and unchanged source finances')
    report.status = 'passed'
  } finally {
    await browser.close()
  }
})()
  .catch((error) => {
    report.status = 'failed'
    report.error = error.stack || String(error)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await restorePrivacy()
      if (originalSettings) await locale(originalSettings.locale)
    } catch (error) {
      report.status = 'failed'
      report.cleanupError = error.message
      process.exitCode = 1
    }
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
    console.log(`Report ${reportPath}`)
  })
