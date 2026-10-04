/**
 * Browser proof of the interactive same-origin development gateway.
 * Run only against a NEW isolated DEMO_MODE=1 archive with no competing writer:
 * node tools/interactive-ui-smoke.cjs http://127.0.0.1:8080 --isolated
 * This creates one synthetic account/expense and retains their real audit history.
 * Playwright/Chromium are validation prerequisites, not application dependencies.
 */
const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const { readFile, writeFile } = require('node:fs/promises')
const { createRequire } = require('node:module')
const { join } = require('node:path')

const { chromium } = (() => {
  try {
    return require('playwright')
  } catch {
    return require('/opt/codex/runtimes/cua/lib/node_modules/playwright-core')
  }
})()
const { strFromU8, unzipSync } = createRequire(join(__dirname, '../apps/api/package.json'))(
  'fflate',
)
const ui = process.argv[2] || 'http://127.0.0.1:8080'
const reportPath =
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual browser validation is outside cached Turbo tasks.
  process.env.LILLERI_INTERACTIVE_SMOKE_REPORT || '/tmp/lilleri-interactive-ui.json'
const report = { status: 'running', checks: [], pageErrors: [], consoleErrors: [], apiRequests: [] }
const button = (page, name) => page.getByRole('button', { name, exact: true })
const check = (name) => {
  report.checks.push(name)
  console.log(`PASS ${name}`)
}
async function request(path) {
  const response = await fetch(`${ui}/api${path}`, { signal: AbortSignal.timeout(20_000) })
  assert.equal(response.status, 200, `GET /api${path}`)
  return response.json()
}
const overview = () => request('/v1/demo')
const summaryAmount = (data, field) =>
  BigInt(data.analysis.summaries.find((item) => item.currency === 'EUR')[field].amountMinor)
async function responseFrom(page, path, method, action, expected = 200) {
  const pending = page.waitForResponse(
    (response) => response.url() === `${ui}/api${path}` && response.request().method() === method,
  )
  const [response] = await Promise.all([pending, Promise.resolve().then(action)])
  assert.equal(response.status(), expected, `${method} /api${path}`)
  return response
}
async function noOverflow(page, name) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    content: document.documentElement.scrollWidth,
  }))
  assert.ok(dimensions.content <= dimensions.viewport + 1, `${name}: ${JSON.stringify(dimensions)}`)
}
async function load(page, english = false) {
  await responseFrom(page, '/v1/demo', 'GET', () => page.goto(ui))
  await page
    .getByRole('heading', { name: english ? 'Overview' : 'Panoramica', exact: true })
    .waitFor()
  await button(page, english ? 'Refresh' : 'Aggiorna').waitFor()
}
async function search(page, description, english = false) {
  await button(page, english ? 'Transactions' : 'Movimenti').click()
  await page
    .getByRole('textbox', {
      name: english ? 'Search transaction history' : 'Cerca nello storico',
      exact: true,
    })
    .fill(description)
  const prefix = english ? 'Open' : 'Apri'
  const escaped = description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const row = page.getByRole('button', { name: new RegExp(`^${prefix} ${escaped},`) })
  await row.first().waitFor()
  return row
}

;(async () => {
  let browser
  try {
    const url = new URL(ui)
    assert.equal(ui, url.origin, 'Use an exact gateway origin without a path')
    assert.ok(
      url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
      'The writing smoke test accepts only a loopback development gateway',
    )
    assert.ok(
      process.argv.includes('--isolated'),
      'Confirm the NEW isolated archive with --isolated',
    )
    const initial = await overview()
    assert.equal(initial.mode, 'synthetic')
    assert.ok(initial.transactions.length > 0, 'Use a freshly seeded synthetic fixture')
    assert.deepEqual(
      await request('/v1/manual/accounts'),
      [],
      'Refuse an archive with manual accounts',
    )
    const originalSettings = (await request('/v1/settings')).settings
    assert.equal(originalSettings.locale, 'it-IT', 'Use a fresh Italian fixture')
    check('Gateway API serves the fresh synthetic fixture through /api/v1/demo')

    browser = await chromium.launch({
      // biome-ignore lint/suspicious/noUndeclaredEnvVars: Use an installed browser without adding an application dependency.
      executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox'],
    })
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
      acceptDownloads: true,
    })
    context.setDefaultTimeout(30_000)
    context.on('page', (page) => {
      page.on('pageerror', (error) => report.pageErrors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') report.consoleErrors.push(message.text())
      })
      page.on('request', (outbound) => {
        const target = new URL(outbound.url())
        if (/^\/(?:api\/)?(?:v1(?:\/|$)|api\/auth(?:\/|$))/.test(target.pathname))
          report.apiRequests.push({
            method: outbound.method(),
            path: target.pathname,
            sameOrigin: target.origin === ui,
            throughGateway: target.pathname.startsWith('/api/v1/'),
          })
      })
    })
    const page = await context.newPage()
    await load(page)
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await noOverflow(page, `${width}px Home`)
    }
    check('Real Home renders at 320, 390 and 1280px without horizontal overflow')

    const sample = initial.transactions.find((transaction) => transaction.merchantKey === 'netflix')
    assert.ok(sample, 'The synthetic fixture contains a Netflix search example')
    const sampleName = sample.merchantName?.trim() || sample.description.trim()
    const results = await search(page, sampleName)
    await results.first().click()
    await page.getByRole('heading', { name: 'Dettaglio movimento', exact: true }).waitFor()
    await page.getByText(sample.description, { exact: true }).waitFor()
    await button(page, '← Torna all’elenco').click()
    assert.equal(
      await page.getByRole('textbox', { name: 'Cerca nello storico' }).inputValue(),
      sampleName,
    )
    check('Transactions search opens actual detail and preserves the query when returning')

    await button(page, 'Importa o aggiungi').click()
    await page.getByRole('tab', { name: 'Aggiungi conto', exact: true }).click()
    const suffix = randomUUID().slice(0, 8)
    const accountName = `Contanti interattivi ${suffix}`
    const description = `Spesa interattiva ${suffix}`
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: originalSettings.timezone }).format(
      new Date(),
    )
    await page.getByRole('textbox', { name: 'Nome del conto', exact: true }).fill(accountName)
    await page.getByRole('textbox', { name: 'Saldo iniziale', exact: true }).fill('100,25')
    await page.getByRole('textbox', { name: 'Data del saldo iniziale', exact: true }).fill(today)
    const beforeManual = await overview()
    const account = await (
      await responseFrom(
        page,
        '/v1/manual/accounts',
        'POST',
        () => button(page, 'Crea conto locale').click(),
        201,
      )
    ).json()
    await page
      .getByText('Conto locale aggiunto. Il saldo iniziale non è una nuova entrata.', {
        exact: true,
      })
      .waitFor()
    assert.equal(account.balanceMinor, '10025')
    assert.equal(summaryAmount(await overview(), 'income'), summaryAmount(beforeManual, 'income'))
    await page.getByRole('textbox', { name: 'Importo in EUR', exact: true }).fill('2,50')
    await page
      .getByRole('textbox', { name: 'Descrizione facoltativa', exact: true })
      .fill(description)
    const entry = await (
      await responseFrom(
        page,
        '/v1/manual/transactions',
        'POST',
        () => button(page, 'Salva movimento').click(),
        201,
      )
    ).json()
    await page.getByText('Movimento aggiunto e saldo aggiornato.', { exact: true }).waitFor()
    assert.equal(entry.accountId, account.id)
    assert.equal(entry.amountMinor, '-250')
    assert.equal(entry.balanceMinor, '9775')
    assert.equal(
      summaryAmount(await overview(), 'spend'),
      summaryAmount(beforeManual, 'spend') + 250n,
    )
    check('UI creates one manual account and exact expense; opening balance creates no income')

    await load(page)
    const persisted = await overview()
    assert.equal(
      persisted.accounts.find((item) => item.id === account.id).balance.amountMinor,
      '9775',
    )
    const persistedEntry = persisted.transactions.find((item) => item.id === entry.transactionId)
    assert.equal(persistedEntry.description, description)
    assert.equal(persistedEntry.amount.amountMinor, '-250')
    await (await search(page, description)).click()
    await page.getByRole('heading', { name: description, exact: true }).waitFor()
    check('Browser reload retains the manual balance and transaction, verified in API and detail')

    await button(page, 'Privacy').click()
    await page.getByRole('radio', { name: 'English', exact: true }).click()
    const english = await (
      await responseFrom(page, '/v1/settings', 'PATCH', () =>
        button(page, 'Salva impostazioni').click(),
      )
    ).json()
    assert.equal(english.settings.locale, 'en-GB')
    await page.getByRole('heading', { name: 'Profile and display', exact: true }).waitFor()
    await load(page, true)
    await button(page, 'Privacy').click()
    await page.getByRole('heading', { name: 'Profile and display', exact: true }).waitFor()
    assert.equal(
      await page.getByRole('radio', { name: 'English', exact: true }).getAttribute('aria-checked'),
      'true',
    )
    assert.equal((await request('/v1/settings')).settings.locale, 'en-GB')
    check('Explicit English choice updates real labels and persists after browser reload')

    const downloadPending = page.waitForEvent('download')
    const archiveResponse = await responseFrom(page, '/v1/export/archive', 'POST', () =>
      button(page, 'Download ZIP archive').click(),
    )
    assert.equal(archiveResponse.headers()['content-type'], 'application/zip')
    const download = await downloadPending
    assert.equal(download.suggestedFilename(), 'lilleri-dati-dimostrativi.zip')
    const downloadedBytes = await readFile(await download.path())
    assert.equal(downloadedBytes.subarray(0, 2).toString(), 'PK')
    const files = unzipSync(downloadedBytes)
    const manifest = JSON.parse(strFromU8(files['manifest.json']))
    const exported = JSON.parse(strFromU8(files['data.json']))
    assert.equal(manifest.sourceMode, 'synthetic')
    assert.equal(manifest.profileId, initial.profile.id)
    for (const item of manifest.files) {
      assert.ok(files[item.path], `Archive file ${item.path}`)
      assert.equal(files[item.path].byteLength, item.bytes)
      assert.equal(createHash('sha256').update(files[item.path]).digest('hex'), item.sha256)
    }
    assert.equal(exported.profileSettings.settings.locale, 'en-GB')
    assert.equal(
      exported.transactions.find((item) => item.id === entry.transactionId).amount.amountMinor,
      '-250',
    )
    await page
      .getByText('Archive ready. The download contains CSV, JSON, events and the data schema.', {
        exact: true,
      })
      .waitFor()
    check(
      'Actual same-origin ZIP download preserves the manual expense, locale and verified digests',
    )

    await page.getByRole('radio', { name: 'Italiano', exact: true }).click()
    const restored = await (
      await responseFrom(page, '/v1/settings', 'PATCH', () => button(page, 'Save settings').click())
    ).json()
    assert.equal(restored.settings.locale, originalSettings.locale)
    await page.getByRole('heading', { name: 'Profilo e formato', exact: true }).waitFor()
    assert.ok(report.apiRequests.length > 0)
    assert.ok(
      report.apiRequests.every((item) => item.sameOrigin && item.throughGateway),
      'Every browser API call must use this origin and /api; no direct internal API port',
    )
    assert.deepEqual(report.pageErrors, [])
    assert.deepEqual(report.consoleErrors, [])
    report.leftState = { originalLocaleRestored: true, syntheticAccountAndExpenseRetained: true }
    check('No direct API-port requests or runtime errors; Italian restored through UI')
    report.status = 'passed'
  } catch (error) {
    report.status = 'failed'
    report.failure = {
      name: error.name,
      message: error.message,
      completedChecks: report.checks.length,
    }
    console.error(error)
    process.exitCode = 1
  } finally {
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
    if (browser) await browser.close()
  }
  console.log(`Report: ${reportPath}`)
})()
