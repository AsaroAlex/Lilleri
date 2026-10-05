/** Read-only European bank-directory acceptance against an isolated empty loopback runtime.
 * Run: LILLERI_PLAYWRIGHT_MODULE=... CHROME_BIN=... node tools/european-banks-ui-smoke.cjs
 * Uses real directory responses and the actual device-preference panel. API writes are blocked.
 * No financial records are created and no external bank website is opened.
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
const reportPath = process.env.LILLERI_EUROPE_UI_REPORT || '/tmp/lilleri-european-banks-ui.json'
// biome-ignore lint/suspicious/noUndeclaredEnvVars: Optional manual screenshot location.
const screenshotPath = process.env.LILLERI_EUROPE_UI_SCREENSHOT
const countryCodes = [
  'IT',
  'FR',
  'DE',
  'ES',
  'PT',
  'NL',
  'BE',
  'AT',
  'IE',
  'GB',
  'CH',
  'SE',
  'DK',
  'NO',
  'FI',
  'PL',
]
const widths = [320, 390, 599, 768, 960, 1440]
const checks = []
const layouts = []
const countryCounts = {}
const apiWrites = []
const pageErrors = []
const copy = {
  'it-IT': {
    choose: 'Scegli la tua banca',
    title: 'Trova la tua banca',
    country: 'Paese',
    allCountries: 'Tutti i paesi',
    all: 'Tutti',
    cards: 'Carte',
    wallets: 'Portafogli',
    search: 'Cerca una banca o un servizio',
    empty: 'Nessun servizio trovato',
    clear: 'Mostra tutti i servizi',
    back: 'Tutti i servizi',
    settings: 'Impostazioni',
    preferences: 'Preferenze',
    preferencesHeading: 'Lingua e orario',
    dark: 'Usa aspetto scuro',
    light: 'Usa aspetto chiaro',
    connect: 'Collega il conto',
    official: /Apri il sito ufficiale/,
    unavailable: 'Non riesco a caricare l’elenco dei servizi.',
    retry: 'Riprova',
  },
  'en-GB': {
    choose: 'Choose your bank',
    title: 'Find your bank',
    country: 'Country',
    allCountries: 'All countries',
    all: 'All',
    cards: 'Cards',
    wallets: 'Wallets',
    search: 'Search for a bank or service',
    empty: 'No services found',
    clear: 'Show all services',
    back: 'All services',
    settings: 'Settings',
    preferences: 'Preferences',
    preferencesHeading: 'Language and time',
    dark: 'Use dark appearance',
    light: 'Use light appearance',
    connect: 'Connect account',
    official: /Open official website/,
    unavailable: 'The service directory could not be loaded.',
    retry: 'Try again',
  },
}
const button = (page, name) => page.getByRole('button', { name, exact: true })
const heading = (page, name) => page.getByRole('heading', { name, exact: true })
const tiles = (page) => page.locator('[data-testid^="bank-service-"][role="button"]')
const countryName = (locale, code) => new Intl.DisplayNames([locale], { type: 'region' }).of(code)
const tileName = (entry, locale) => `${entry.name}, ${countryName(locale, entry.countryCode)}`
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
  context.on('page', (page) =>
    page.on('pageerror', (error) => pageErrors.push({ context: label, message: error.message })),
  )
  await context.route(`${origin}/api/**`, (route) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()))
      return route.abort('blockedbyclient')
    return route.continue()
  })
}
async function fits(page, label) {
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }))
  assert.ok(dimensions.content <= dimensions.width + 1, `${label}: ${JSON.stringify(dimensions)}`)
  layouts.push({ label, ...dimensions })
}
async function expectEntries(page, entries, locale) {
  const expectedIds = entries.map((entry) => `bank-service-${entry.id}`).sort()
  await page.waitForFunction((expected) => {
    const ids = [...document.querySelectorAll('[data-testid^="bank-service-"][role="button"]')]
      .map((element) => element.getAttribute('data-testid'))
      .sort()
    return JSON.stringify(ids) === JSON.stringify(expected)
  }, expectedIds)
  assert.equal(await tiles(page).count(), entries.length)
  for (const entry of entries) await button(page, tileName(entry, locale)).waitFor()
}
async function selectCountry(page, locale, code) {
  const picker = page.getByRole('combobox', { name: copy[locale].country, exact: true })
  await picker.focus()
  await picker.selectOption(code)
  assert.equal(await picker.inputValue(), code)
  return picker
}
async function openDirectory(page, locale) {
  await button(page, copy[locale].choose).click()
  await heading(page, copy[locale].title).waitFor()
}
async function openPreferences(page, locale) {
  await page
    .getByRole('navigation')
    .getByRole('button', { name: copy[locale].settings, exact: true })
    .click()
  await button(page, copy[locale].preferences).click()
  await heading(page, copy[locale].preferencesHeading).waitFor()
}
async function detail(page, entry, locale) {
  await button(page, tileName(entry, locale)).click()
  const panel = page.getByTestId('bank-service-detail')
  await panel.getByRole('heading', { name: entry.name, exact: true }).waitFor()
  assert.ok((await panel.innerText()).includes(countryName(locale, entry.countryCode)))
  assert.equal(await button(page, copy[locale].connect).count(), 0)
  const website = panel.getByRole('link', { name: copy[locale].official })
  assert.equal(await website.getAttribute('href'), entry.officialUrl)
  assert.equal(await website.getAttribute('target'), '_blank')
  assert.equal(await website.getAttribute('rel'), 'noopener noreferrer')
  await fits(page, `${locale} detail ${entry.id}`)
  await button(page, copy[locale].back).click()
  const search = page.getByRole('textbox', { name: copy[locale].search, exact: true })
  assert.equal(await search.evaluate((element) => document.activeElement === element), true)
}
;(async () => {
  const initial = await read('/v1/demo')
  const initialSettings = await read('/v1/settings')
  assert.equal(initial.fixtureMode, 'empty')
  assert.equal(initial.accounts.length, 0)
  assert.equal(initial.transactions.length, 0)
  assert.equal(initial.connections.length, 0)
  const directory = await read('/v1/connection-directory')
  assert.equal(directory.country, 'IT')
  assert.deepEqual([...directory.countries].sort(), [...countryCodes].sort())
  assert.equal(directory.entries.length, 62)
  assert.equal(new Set(directory.entries.map((entry) => entry.id)).size, directory.entries.length)
  for (const entry of directory.entries) {
    assert.ok(countryCodes.includes(entry.countryCode))
    assert.equal(entry.automatic.state, 'configuration_required')
    assert.equal(entry.automatic.providerId, null)
    assert.equal(entry.automatic.institutionId, null)
    assert.equal(new URL(entry.officialUrl).protocol, 'https:')
  }
  for (const code of countryCodes) {
    countryCounts[code] = directory.entries.filter((entry) => entry.countryCode === code).length
    assert.ok(countryCounts[code] > 0, code)
  }
  assert.equal(countryCounts.IT, 18)
  pass(
    'Actual directory has 62 distinct services across 16 countries and declares no active bank connection',
  )
  const browser = await chromium.launch({
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Browser supplied by validation environment.
    executablePath: process.env.CHROME_BIN || undefined,
    headless: true,
    args: ['--no-sandbox'],
  })
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    await observe(context, 'italian')
    const page = await context.newPage()
    await page.goto(origin)
    await button(page, 'Scegli la tua banca').waitFor()
    await openDirectory(page, 'it-IT')
    const country = page.getByRole('combobox', { name: 'Paese', exact: true })
    assert.equal(await country.inputValue(), 'IT')
    assert.equal(await country.locator('option').count(), 17)
    assert.equal(await country.locator('option[value="all"]').innerText(), 'Tutti i paesi')
    await expectEntries(
      page,
      directory.entries.filter((entry) => entry.countryCode === 'IT'),
      'it-IT',
    )
    for (const code of countryCodes) {
      assert.equal(
        await country.locator(`option[value="${code}"]`).innerText(),
        countryName('it-IT', code),
      )
      await selectCountry(page, 'it-IT', code)
      await expectEntries(
        page,
        directory.entries.filter((entry) => entry.countryCode === code),
        'it-IT',
      )
    }
    await selectCountry(page, 'it-IT', 'all')
    await expectEntries(page, directory.entries, 'it-IT')
    pass(
      'Italy is the default; each country filter and all countries show exactly their own country-qualified services',
    )

    for (const id of [
      'bnp-paribas-fr',
      'deutsche-bank-de',
      'bbva-es',
      'bunq-nl',
      'monzo-gb',
      'starling-gb',
      'n26-de',
    ]) {
      const entry = directory.entries.find((candidate) => candidate.id === id)
      assert.ok(entry, id)
      await detail(page, entry, 'it-IT')
    }
    pass(
      'Representative French, German, Spanish, Dutch and British bank details identify the market and use safe official links',
    )

    const search = page.getByRole('textbox', { name: copy['it-IT'].search, exact: true })
    await search.fill('N26')
    const n26Entries = directory.entries.filter((entry) => entry.name === 'N26')
    assert.equal(n26Entries.length, 2)
    await expectEntries(page, n26Entries, 'it-IT')
    await search.fill('ING')
    const ingEntries = directory.entries.filter((entry) => /^ING\b/i.test(entry.name))
    assert.equal(ingEntries.length, 3)
    for (const entry of ingEntries) await button(page, tileName(entry, 'it-IT')).waitFor()
    await search.fill('')
    await selectCountry(page, 'it-IT', 'DE')
    const germanIng = directory.entries.find(
      (entry) => entry.countryCode === 'DE' && /^ING\b/i.test(entry.name),
    )
    assert.ok(germanIng)
    for (const query of ['DiBa', 'DiB']) {
      await search.fill(query)
      await expectEntries(page, [germanIng], 'it-IT')
    }
    await selectCountry(page, 'it-IT', 'FR')
    await search.fill('societe generale')
    const societe = directory.entries.find(
      (entry) => entry.countryCode === 'FR' && /société générale/i.test(entry.name),
    )
    assert.ok(societe)
    await expectEntries(page, [societe], 'it-IT')
    await button(page, 'Carte').click()
    await heading(page, 'Nessun servizio trovato').waitFor()
    assert.equal(await tiles(page).count(), 0)
    await button(page, 'Mostra tutti i servizi').click()
    assert.equal(await country.inputValue(), 'FR')
    assert.equal(await search.inputValue(), '')
    await expectEntries(
      page,
      directory.entries.filter((entry) => entry.countryCode === 'FR'),
      'it-IT',
    )
    await selectCountry(page, 'it-IT', 'DE')
    await search.fill('societe generale')
    await heading(page, 'Nessun servizio trovato').waitFor()
    await button(page, 'Mostra tutti i servizi').click()
    assert.equal(await country.inputValue(), 'DE')
    await expectEntries(
      page,
      directory.entries.filter((entry) => entry.countryCode === 'DE'),
      'it-IT',
    )
    pass(
      'Accent-insensitive search and duplicate bank names retain market identity; search and type filters intersect the selected country',
    )

    await selectCountry(page, 'it-IT', 'IT')
    await button(page, 'Carte').click()
    await expectEntries(
      page,
      directory.entries.filter((entry) => entry.countryCode === 'IT' && entry.kind === 'card'),
      'it-IT',
    )
    await button(page, 'Portafogli').click()
    await expectEntries(
      page,
      directory.entries.filter((entry) => entry.countryCode === 'IT' && entry.kind === 'wallet'),
      'it-IT',
    )
    await button(page, 'Tutti').click()
    await selectCountry(page, 'it-IT', 'FR')
    await button(page, tileName(societe, 'it-IT')).click()
    await page.getByTestId('bank-service-detail').waitFor()
    await selectCountry(page, 'it-IT', 'DE')
    assert.equal(await page.getByTestId('bank-service-detail').count(), 0)
    assert.equal(await country.evaluate((element) => document.activeElement === element), true)
    await expectEntries(
      page,
      directory.entries.filter((entry) => entry.countryCode === 'DE'),
      'it-IT',
    )
    pass(
      'Country changes clear a previous bank detail and keep chooser focus; Italian card and wallet filters remain intact',
    )

    await selectCountry(page, 'it-IT', 'all')
    const n26 = directory.entries.find((entry) => entry.id === 'n26-de')
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 })
      for (const appearance of ['light', 'dark']) {
        const switcher = button(
          page,
          appearance === 'light' ? copy['it-IT'].light : copy['it-IT'].dark,
        )
        if (await switcher.count()) await switcher.click()
        await fits(page, `it-IT ${width} ${appearance} all countries`)
        await detail(page, n26, 'it-IT')
      }
    }
    pass(
      'All European bank tiles and country-qualified details fit six Italian viewport widths in both appearances',
    )

    await openPreferences(page, 'it-IT')
    await page.getByRole('radio', { name: 'English', exact: true }).click()
    await heading(page, 'Language and time').waitFor()
    await page.reload()
    await button(page, 'Choose your bank').waitFor()
    await openDirectory(page, 'en-GB')
    const englishCountry = page.getByRole('combobox', { name: 'Country', exact: true })
    assert.equal(await englishCountry.inputValue(), 'IT')
    for (const code of countryCodes)
      assert.equal(
        await englishCountry.locator(`option[value="${code}"]`).innerText(),
        countryName('en-GB', code),
      )
    assert.equal(await englishCountry.locator('option[value="all"]').innerText(), 'All countries')
    await selectCountry(page, 'en-GB', 'all')
    await expectEntries(page, directory.entries, 'en-GB')
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 })
      for (const appearance of ['light', 'dark']) {
        const switcher = button(
          page,
          appearance === 'light' ? copy['en-GB'].light : copy['en-GB'].dark,
        )
        if (await switcher.count()) await switcher.click()
        await fits(page, `en-GB ${width} ${appearance} all countries`)
        await detail(page, n26, 'en-GB')
      }
    }
    pass(
      'Actual saved English preference localises countries and bank labels after reload, across six widths and both appearances',
    )

    const retryContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
    await observe(retryContext, 'directory-retry')
    const retryPage = await retryContext.newPage()
    await retryPage.goto(origin)
    await button(retryPage, 'Scegli la tua banca').waitFor()
    await openPreferences(retryPage, 'it-IT')
    await retryPage.getByRole('radio', { name: 'English', exact: true }).click()
    await heading(retryPage, 'Language and time').waitFor()
    await retryPage
      .getByRole('navigation')
      .getByRole('button', { name: 'Home', exact: true })
      .click()
    await retryContext.route(`${origin}/api/v1/connection-directory`, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'provider_unavailable' }),
      }),
    )
    await openDirectory(retryPage, 'en-GB')
    await retryPage.getByText(copy['en-GB'].unavailable, { exact: true }).waitFor()
    assert.equal(await tiles(retryPage).count(), 0)
    await fits(retryPage, 'English unavailable directory')
    await retryContext.unroute(`${origin}/api/v1/connection-directory`)
    await button(retryPage, 'Try again').click()
    await expectEntries(
      retryPage,
      directory.entries.filter((entry) => entry.countryCode === 'IT'),
      'en-GB',
    )
    await selectCountry(retryPage, 'en-GB', 'GB')
    await expectEntries(
      retryPage,
      directory.entries.filter((entry) => entry.countryCode === 'GB'),
      'en-GB',
    )
    pass(
      'A read-only directory 503 displays an English retry and restores country browsing without fabricated banks',
    )

    if (screenshotPath) {
      await page.setViewportSize({ width: 1440, height: 1000 })
      await selectCountry(page, 'en-GB', 'all')
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
      'Browsing, filters, details, preference changes and retry cause no API writes, financial changes or page errors',
    )
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          status: 'passed',
          checks,
          entries: directory.entries.length,
          countries: countryCodes,
          countryCounts,
          widths,
          locales: ['it-IT', 'en-GB'],
          appearances: ['light', 'dark'],
          layouts,
          apiWrites,
          pageErrors,
          serverSettingsUnchanged: true,
          financesUnchanged: true,
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
