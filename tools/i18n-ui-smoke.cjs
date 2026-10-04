/** Actual saved IT/EN choices against an isolated synthetic demo; run with an exclusive writer slot. */
const assert = require('node:assert/strict')
const {
  financialSnapshot: finance,
  assertFinancialUnchanged,
} = require('./demo-financial-invariant.cjs')
const { createHash } = require('node:crypto')
const { writeFile } = require('node:fs/promises')
const { chromium } = require('playwright')
const ui = process.argv[2] || 'http://localhost:8082'
const api = process.argv[3] || 'http://localhost:3004'
// biome-ignore lint/suspicious/noUndeclaredEnvVars: This manual helper is outside cached Turbo tasks.
const reportPath = process.env.LILLERI_I18N_SMOKE_REPORT || '/tmp/lilleri-i18n-ui.json'
const report = { status: 'running', checks: [], pageErrors: [] }
const button = (page, name) => page.getByRole('button', { name, exact: true })
const check = (label) => {
  report.checks.push(label)
  console.log(`PASS ${label}`)
}
function origin(value) {
  const url = new URL(value)
  assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  assert.equal(value, url.origin)
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
  return response.json()
}
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
async function loaded(page) {
  await page.goto(ui)
  await button(page, 'Impostazioni').waitFor()
  await button(page, 'Impostazioni').click()
  await button(page, 'Preferenze').click()
  await page.getByRole('radio', { name: 'English', exact: true }).waitFor()
}
async function settled(page, name) {
  await button(page, name).waitFor()
  await page.waitForFunction(
    (label) =>
      [...document.querySelectorAll('[role="button"]')].some(
        (node) =>
          node.getAttribute('aria-label') === label &&
          node.getAttribute('aria-disabled') !== 'true',
      ),
    name,
  )
}
async function save(page, label, expected = 200) {
  const pending = page.waitForResponse(
    (value) =>
      new URL(value.url()).pathname === '/v1/settings' && value.request().method() === 'PATCH',
  )
  await button(page, label).click()
  const response = await pending
  assert.equal(response.status(), expected)
  return response.json()
}
;(async () => {
  origin(ui)
  origin(api)
  const initial = await request('/v1/demo')
  assert.equal(initial.mode, 'synthetic')
  const original = (await request('/v1/settings')).settings
  assert.equal(
    original.locale,
    'it-IT',
    'Prepare a fresh Italian synthetic fixture before this proof',
  )
  report.beforeFinanceDigest = digest(finance(initial))
  const browser = await chromium.launch({
    headless: true,
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Reuse the installed cloud Chromium without downloading another browser.
    executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  context.on('page', (opened) =>
    opened.on('pageerror', (error) => report.pageErrors.push({ name: error.name })),
  )
  page.on('pageerror', (error) => report.pageErrors.push({ name: error.name }))
  let peer
  try {
    await loaded(page)
    await settled(page, 'Salva impostazioni')
    assert.equal(
      await page.getByRole('radio', { name: 'Italiano', exact: true }).getAttribute('aria-checked'),
      'true',
    )
    await page.getByText('1.234,56 €', { exact: true }).waitFor()
    peer = await context.newPage()
    await loaded(peer)
    await settled(peer, 'Salva impostazioni')
    check(
      'Actual Italian defaults and exact displayed sample are loaded in two independent windows',
    )

    await page.getByRole('radio', { name: 'English', exact: true }).click()
    const english = await save(page, 'Salva impostazioni')
    assert.equal(english.settings.locale, 'en-GB')
    assert.equal(english.settings.revision, original.revision + 1)
    await page.getByRole('heading', { name: 'Profile and display', exact: true }).waitFor()
    await settled(page, 'Save settings')
    await page.getByText('€1,234.56', { exact: true }).waitFor()
    assert.equal(
      await page.getByRole('radio', { name: 'English', exact: true }).getAttribute('aria-checked'),
      'true',
    )
    assert.equal(
      await page.getByRole('radio', { name: 'Italiano', exact: true }).getAttribute('aria-checked'),
      'false',
    )
    check(
      'An explicit save persists en-GB and updates real labels, radio semantics and exact currency punctuation',
    )

    await page.reload()
    await button(page, 'Settings').waitFor()
    await button(page, 'Settings').click()
    await button(page, 'Preferences').click()
    await settled(page, 'Save settings')
    await page.getByRole('heading', { name: 'Profile and display', exact: true }).waitFor()
    await button(page, '← Back to Settings').click()
    await button(page, 'Privacy and data').click()
    await page.getByRole('heading', { name: 'Your privacy preferences', exact: true }).waitFor()
    await page.getByRole('checkbox', { name: 'Use only my rules', exact: true }).waitFor()
    await page.getByText(/Synthetic choice text in Italian, version/).waitFor()
    check(
      'Reload reads saved English preferences and localises privacy while clearly labelling the original versioned Italian disclosure',
    )

    await button(page, '← Back to Settings').click()
    await button(page, 'Preferences').click()
    await settled(page, 'Save settings')
    await page
      .getByRole('textbox', { name: 'Profile name', exact: true })
      .fill('Synthetic English preference')
    await button(page, 'UTC').click()
    const renamed = await save(page, 'Save settings')
    assert.equal(renamed.settings.locale, 'en-GB')
    assert.equal(renamed.settings.timezone, 'UTC')
    assert.equal(renamed.settings.displayName, 'Synthetic English preference')
    await settled(page, 'Save settings')
    const exported = await request('/v1/export')
    assert.equal(exported.profileSettings.settings.locale, 'en-GB')
    assert.ok(
      exported.profileSettings.events.some(
        (event) => event.before.locale === 'it-IT' && event.after.locale === 'en-GB',
      ),
    )
    assertFinancialUnchanged(initial, await request('/v1/demo'), report)
    check(
      'Editing actual name and timezone retains English; export preserves locale history and original financial facts',
    )

    let patches = 0
    peer.on('request', (outbound) => {
      if (new URL(outbound.url()).pathname === '/v1/settings' && outbound.method() === 'PATCH')
        patches++
    })
    const conflict = await save(peer, 'Salva impostazioni', 409)
    assert.equal(conflict.code, 'settings_changed')
    await peer
      .getByText(
        'Settings changed. I refreshed the saved values: review them before saving again.',
        { exact: true },
      )
      .waitFor()
    await settled(peer, 'Save settings')
    assert.equal(patches, 1, 'A stale preference is not replayed automatically')
    assert.equal((await request('/v1/settings')).settings.locale, 'en-GB')
    await peer.getByRole('radio', { name: 'Italiano', exact: true }).click()
    const italian = await save(peer, 'Save settings')
    assert.equal(italian.settings.locale, 'it-IT')
    assert.equal(patches, 2, 'A second, deliberate gesture uses refreshed revision')
    await settled(peer, 'Salva impostazioni')
    check(
      'A stale second window receives 409, adopts authoritative locale and requires a new gesture before switching back',
    )

    await page.reload()
    await button(page, 'Impostazioni').waitFor()
    await button(page, 'Impostazioni').click()
    await button(page, 'Preferenze').click()
    await settled(page, 'Salva impostazioni')
    await page
      .getByRole('textbox', { name: 'Nome del profilo', exact: true })
      .fill(original.displayName)
    const zones = {
      'Europe/Rome': 'Italia',
      'Europe/London': 'Londra',
      'America/New_York': 'New York',
      'Asia/Tokyo': 'Tokyo',
      UTC: 'UTC',
    }
    assert.ok(zones[original.timezone], 'Use a fixture with a selectable original zone')
    await button(page, zones[original.timezone]).click()
    const restored = await save(page, 'Salva impostazioni')
    assert.equal(restored.settings.locale, original.locale)
    assert.equal(restored.settings.displayName, original.displayName)
    assert.equal(restored.settings.timezone, original.timezone)
    await settled(page, 'Salva impostazioni')
    await page.setViewportSize({ width: 320, height: 844 })
    const width = await page.evaluate(() => ({
      viewport: innerWidth,
      content: document.documentElement.scrollWidth,
    }))
    assert.ok(width.content <= width.viewport + 1)
    await request(
      '/v1/settings',
      'PATCH',
      {
        displayName: original.displayName,
        timezone: original.timezone,
        locale: 'en-US',
        revision: restored.settings.revision,
      },
      400,
    )
    check(
      'Italian/name/timezone are restored through the UI; unsupported locale is refused and 320px settings wrap',
    )

    const finalFinance = await request('/v1/demo')
    assertFinancialUnchanged(initial, finalFinance, report)
    report.afterFinanceDigest = digest(finance(finalFinance))
    assert.equal(report.afterFinanceDigest, report.beforeFinanceDigest)
    assert.deepEqual(report.pageErrors, [])
    report.leftState = {
      locale: original.locale,
      originalNameRestored: true,
      originalTimezoneRestored: true,
      financialFactsUnchanged: true,
      auditRetained: true,
    }
    report.status = 'passed'
    check('All financial facts and calendar fields stay unchanged, with no JavaScript errors')
  } catch (error) {
    report.status = 'failed'
    report.failure = { name: error.name, completedChecks: report.checks.length }
    throw error
  } finally {
    // Recover the original display preferences even after a failed assertion; preserve the actual audit.
    const current = (await request('/v1/settings')).settings
    if (
      current.locale !== original.locale ||
      current.displayName !== original.displayName ||
      current.timezone !== original.timezone
    )
      await request('/v1/settings', 'PATCH', {
        displayName: original.displayName,
        locale: original.locale,
        timezone: original.timezone,
        revision: current.revision,
      })
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
    await browser.close()
  }
  console.log(JSON.stringify(report, null, 2))
})().catch((error) => {
  console.error(`${error.name}: i18n browser proof failed after ${report.checks.length} checks`)
  process.exitCode = 1
})
