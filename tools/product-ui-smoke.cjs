/** Read-only product acceptance against an isolated empty loopback runtime.
 * Run: LILLERI_PLAYWRIGHT_MODULE=... CHROME_BIN=... node tools/product-ui-smoke.cjs
 * Preferences are changed through the real UI and saved only on the browser device.
 * API writes, financial uploads and external bank navigation are forbidden.
 */
const assert = require('node:assert/strict')
const { writeFile } = require('node:fs/promises')
// biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual browser validation dependency.
const { chromium } = require(process.env.LILLERI_PLAYWRIGHT_MODULE || 'playwright')

const origin = process.argv[2] || 'http://127.0.0.1:8099'
const target = new URL(origin)
assert.equal(target.origin, origin)
assert.ok(
  target.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname),
)
// biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual validation output location.
const reportPath = process.env.LILLERI_PRODUCT_UI_REPORT || '/tmp/lilleri-product-ui.json'
// biome-ignore lint/suspicious/noUndeclaredEnvVars: Optional manual screenshot location.
const screenshotPath = process.env.LILLERI_PRODUCT_UI_SCREENSHOT
const preferenceKey = 'lilleri.display-preferences.v1'
const developmentCopy =
  /\b(?:anteprim\w*|bozz\w*|mock\w*|demo\w*|prototip\w*|sintetic\w*|synthetic\w*|preview\w*|draft\w*)\b/i
const widths = [320, 390, 768, 1440]
const checks = []
const apiWrites = []
const pageErrors = []
const layouts = []
const copy = {
  'it-IT': {
    tabs: ['Home', 'Movimenti', 'Da controllare', 'Ricorrenti', 'Impostazioni'],
    homeHeading: 'Panoramica',
    settings: 'Impostazioni',
    preferences: 'Preferenze',
    preferencesHeading: 'Lingua e orario',
    privacy: 'Privacy e dati',
    privacyHeading: 'I tuoi dati, sotto il tuo controllo',
    privacyAccess:
      'L’accesso personale protetto deve essere attivato prima di aggiungere i tuoi dati finanziari.',
    connections: 'Collegamenti e fonti',
    bankHeading: 'Trova la tua banca',
    dark: 'Usa aspetto scuro',
    light: 'Usa aspetto chiaro',
    notices: 'Avvisi di servizio',
    merchants: 'Esercenti e categorie',
  },
  'en-GB': {
    tabs: ['Home', 'Transactions', 'Review', 'Recurring', 'Settings'],
    homeHeading: 'Overview',
    settings: 'Settings',
    preferences: 'Preferences',
    preferencesHeading: 'Language and time',
    privacy: 'Privacy and data',
    privacyHeading: 'Your data, under your control',
    privacyAccess: 'Protected personal sign-in must be enabled before adding your financial data.',
    connections: 'Connections and sources',
    bankHeading: 'Find your bank',
    dark: 'Use dark appearance',
    light: 'Use light appearance',
    notices: 'Service notices',
    merchants: 'Merchants and categories',
  },
}
const button = (page, name) => page.getByRole('button', { name, exact: true })
const heading = (page, name) => page.getByRole('heading', { name, exact: true })
const pass = (name) => {
  checks.push(name)
  console.log(`PASS ${name}`)
}
async function read(path) {
  const response = await fetch(`${origin}/api${path}`, { signal: AbortSignal.timeout(20_000) })
  assert.equal(response.status, 200, path)
  return response.json()
}
async function observe(context, label) {
  context.on('request', (request) => {
    if (
      request.url().startsWith(`${origin}/api/`) &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
    )
      apiWrites.push({
        context: label,
        method: request.method(),
        path: new URL(request.url()).pathname,
      })
  })
  context.on('page', (page) => {
    page.on('pageerror', (error) => pageErrors.push({ context: label, message: error.message }))
  })
  await context.route(`${origin}/api/**`, (route) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()))
      return route.abort('blockedbyclient')
    return route.continue()
  })
}
async function nav(page, name, expectedHeading = name) {
  const pattern =
    name === 'Da controllare' || name === 'Review' ? new RegExp(`^${name}(?:,.*)?$`) : name
  await page
    .getByRole('navigation')
    .getByRole('button', { name: pattern, exact: typeof pattern === 'string' })
    .click()
  await page.waitForFunction(
    (expected) => document.getElementById('lilleri-main-heading')?.textContent === expected,
    expectedHeading,
  )
}
async function assertSurface(page, label) {
  const surface = await page.evaluate(() => ({
    text: document.body.innerText,
    width: innerWidth,
    contentWidth: document.documentElement.scrollWidth,
    language: document.documentElement.lang,
  }))
  assert.equal(await page.title(), 'Lilleri', label)
  assert.equal(developmentCopy.test(surface.text), false, `${label}: development wording remains`)
  assert.ok(surface.contentWidth <= surface.width + 1, `${label}: ${JSON.stringify(surface)}`)
  layouts.push({
    label,
    width: surface.width,
    contentWidth: surface.contentWidth,
    language: surface.language,
  })
}
async function openPreferences(page, locale) {
  const labels = copy[locale]
  await nav(page, labels.settings)
  await button(page, labels.preferences).click()
  await heading(page, labels.preferencesHeading).waitFor()
}
async function checkLanguage(page, locale) {
  await page.waitForFunction((expected) => document.documentElement.lang === expected, locale)
}
async function preferenceValue(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  }, preferenceKey)
}
async function allSurfaces(page, locale) {
  const labels = copy[locale]
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 })
    for (const appearance of ['light', 'dark']) {
      const switchButton = button(page, appearance === 'light' ? labels.light : labels.dark)
      if (await switchButton.count()) await switchButton.click()
      for (const destination of labels.tabs) {
        await nav(page, destination, destination === 'Home' ? labels.homeHeading : destination)
        await assertSurface(page, `${locale} ${width} ${appearance} ${destination}`)
      }
      for (const child of [labels.connections, labels.preferences, labels.privacy]) {
        await nav(page, labels.settings)
        assert.equal(await button(page, labels.notices).count(), 0)
        assert.equal(await button(page, labels.merchants).count(), 0)
        for (const available of [labels.connections, labels.preferences, labels.privacy])
          await button(page, available).waitFor()
        await button(page, child).click()
        await page.waitForFunction(
          (expected) => document.getElementById('lilleri-main-heading')?.textContent === expected,
          child,
        )
        if (child === labels.connections) {
          await heading(page, labels.bankHeading).waitFor()
          assert.equal(
            await page
              .getByRole('button', {
                name: /Collega la fonte locale|Connect the local source|Rinnova autorizzazione locale|Renew local authorisation/,
              })
              .count(),
            0,
          )
          assert.equal(
            await button(page, locale === 'it-IT' ? 'Collega il conto' : 'Connect account').count(),
            0,
          )
        }
        if (child === labels.preferences) await heading(page, labels.preferencesHeading).waitFor()
        if (child === labels.privacy) {
          await heading(page, labels.privacyHeading).waitFor()
          await page.getByText(labels.privacyAccess, { exact: true }).waitFor()
          assert.equal(
            await page
              .getByRole('button', { name: /Elimina|Esporta|Scarica|Delete|Export|Download/i })
              .count(),
            0,
          )
        }
        await assertSurface(page, `${locale} ${width} ${appearance} ${child}`)
      }
    }
  }
}
;(async () => {
  const initial = await read('/v1/demo')
  const initialSettings = await read('/v1/settings')
  assert.equal(initial.fixtureMode, 'empty')
  assert.equal(initial.accounts.length, 0)
  assert.equal(initial.transactions.length, 0)
  assert.equal(initial.connections.length, 0)
  const browser = await chromium.launch({
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Browser supplied by validation environment.
    executablePath: process.env.CHROME_BIN || undefined,
    headless: true,
    args: ['--no-sandbox'],
  })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    await observe(context, 'primary')
    const page = await context.newPage()
    await page.goto(origin)
    await button(page, 'Aggiungi conto').waitFor()
    await checkLanguage(page, 'it-IT')
    await allSurfaces(page, 'it-IT')
    pass(
      'Italian navigation and all public settings fit four widths in light and dark without development wording',
    )
    pass(
      'Public privacy retains protected-access instructions and hides shared export, erasure and simulated bank actions',
    )

    await openPreferences(page, 'it-IT')
    await page.getByRole('radio', { name: 'English', exact: true }).click()
    await heading(page, 'Language and time').waitFor()
    await checkLanguage(page, 'en-GB')
    await page.getByRole('radio', { name: 'UTC', exact: true }).click()
    assert.equal(
      await page.getByRole('radio', { name: 'UTC', exact: true }).getAttribute('aria-checked'),
      'true',
    )
    assert.deepEqual(await preferenceValue(page), { version: 1, locale: 'en-GB', timezone: 'UTC' })
    await page.reload()
    await button(page, 'Add account').waitFor()
    await checkLanguage(page, 'en-GB')
    await openPreferences(page, 'en-GB')
    assert.equal(
      await page.getByRole('radio', { name: 'English', exact: true }).getAttribute('aria-checked'),
      'true',
    )
    assert.equal(
      await page.getByRole('radio', { name: 'UTC', exact: true }).getAttribute('aria-checked'),
      'true',
    )
    pass(
      'Actual preferences immediately switch to English and UTC, persist on this device and survive reload',
    )

    await allSurfaces(page, 'en-GB')
    pass(
      'English navigation and all public settings fit four widths in light and dark without development wording',
    )

    const separate = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await observe(separate, 'independent-device')
    const separatePage = await separate.newPage()
    await separatePage.goto(origin)
    await button(separatePage, 'Aggiungi conto').waitFor()
    await checkLanguage(separatePage, 'it-IT')
    await openPreferences(separatePage, 'it-IT')
    assert.equal(await preferenceValue(separatePage), null)
    assert.equal(
      await separatePage
        .getByRole('radio', { name: 'Italiano', exact: true })
        .getAttribute('aria-checked'),
      'true',
    )
    assert.equal(
      await separatePage
        .getByRole('radio', { name: 'Italia', exact: true })
        .getAttribute('aria-checked'),
      'true',
    )
    await assertSurface(separatePage, 'independent-device default Italian and Rome')
    assert.deepEqual(await read('/v1/settings'), initialSettings)
    pass('An independent device keeps Italian and Rome; shared server settings remain unchanged')

    const legacyContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await observe(legacyContext, 'legacy-overview')
    const legacySettingsReads = []
    legacyContext.on('request', (request) => {
      if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/v1/settings')
        legacySettingsReads.push(request.url())
    })
    const legacyOverview = { ...initial }
    delete legacyOverview.fixtureMode
    await legacyContext.route(`${origin}/api/v1/demo`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(legacyOverview),
      }),
    )
    const legacyPage = await legacyContext.newPage()
    await legacyPage.goto(origin)
    await button(legacyPage, 'Aggiungi conto').waitFor()
    await assertSurface(legacyPage, 'legacy overview without fixture mode')
    await openPreferences(legacyPage, 'it-IT')
    assert.equal(await legacyPage.getByRole('textbox').count(), 0)
    assert.equal(
      await legacyPage
        .getByRole('radio', { name: 'Italiano', exact: true })
        .getAttribute('aria-checked'),
      'true',
    )
    await assertSurface(legacyPage, 'legacy overview uses actual device-only preference panel')
    await nav(legacyPage, 'Impostazioni')
    await button(legacyPage, 'Privacy e dati').click()
    await heading(legacyPage, 'I tuoi dati, sotto il tuo controllo').waitFor()
    await legacyPage.getByText(copy['it-IT'].privacyAccess, { exact: true }).waitFor()
    assert.equal(
      await legacyPage
        .getByRole('button', { name: /Elimina|Esporta|Scarica|Delete|Export|Download/i })
        .count(),
      0,
    )
    await assertSurface(legacyPage, 'legacy overview hides shared export and erasure actions')
    await nav(legacyPage, 'Impostazioni')
    await button(legacyPage, 'Collegamenti e fonti').click()
    await heading(legacyPage, 'Trova la tua banca').waitFor()
    await button(legacyPage, 'Intesa Sanpaolo, Italia').waitFor()
    assert.equal(
      await legacyPage.locator('[data-testid^="bank-service-"][role="button"]').count(),
      18,
    )
    assert.equal(
      await legacyPage
        .getByRole('button', {
          name: /Collega la fonte locale|Rinnova autorizzazione locale|Collega il conto/,
        })
        .count(),
      0,
    )
    await assertSurface(legacyPage, 'legacy overview shows eighteen bank directory choices')
    assert.deepEqual(legacySettingsReads, [])
    pass(
      'An older overview without fixture mode stays read-only, uses device preferences and bank directory, and never reads shared profile settings',
    )

    const failureContext = await browser.newContext({ viewport: { width: 320, height: 844 } })
    await observe(failureContext, 'unavailable-data')
    await failureContext.route(`${origin}/api/v1/demo`, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'provider_unavailable' }),
      }),
    )
    const failurePage = await failureContext.newPage()
    await failurePage.goto(origin)
    await failurePage.getByText('Serve un nuovo tentativo.', { exact: true }).waitFor()
    await button(failurePage, 'Riprova').waitFor()
    await assertSurface(failurePage, 'unavailable data with product retry at 320')
    const failureText = await failurePage.locator('body').innerText()
    assert.equal(
      /localhost|127\.0\.0\.1|avvia il servizio|start the local service/i.test(failureText),
      false,
    )
    await failureContext.unroute(`${origin}/api/v1/demo`)
    await button(failurePage, 'Riprova').click()
    await button(failurePage, 'Aggiungi conto').waitFor()
    pass(
      'A read-only unavailable-data response shows an honest product retry and recovers without local service instructions',
    )

    if (screenshotPath) {
      await page.setViewportSize({ width: 390, height: 844 })
      await nav(page, 'Home', 'Overview')
      await page.screenshot({ path: screenshotPath, fullPage: true })
    }
    assert.deepEqual(apiWrites, [])
    assert.deepEqual(pageErrors, [])
    const after = await read('/v1/demo')
    assert.deepEqual(after.accounts, initial.accounts)
    assert.deepEqual(after.transactions, initial.transactions)
    assert.deepEqual(after.connections, initial.connections)
    assert.deepEqual(await read('/v1/settings'), initialSettings)
    pass(
      'All acceptance flows make no API writes, preserve financial data and produce no page errors',
    )
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          status: 'passed',
          checks,
          widths,
          locales: ['it-IT', 'en-GB'],
          appearances: ['light', 'dark'],
          layouts,
          apiWrites,
          pageErrors,
          serverSettingsUnchanged: true,
          financesUnchanged: true,
          devicePreferences: { locale: 'en-GB', timezone: 'UTC' },
          independentDevice: { locale: 'it-IT', timezone: 'Europe/Rome' },
          legacyOverviewReadonly: true,
          legacySharedSettingsReads: legacySettingsReads,
        },
        null,
        2,
      ),
    )
  } finally {
    await browser.close()
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
