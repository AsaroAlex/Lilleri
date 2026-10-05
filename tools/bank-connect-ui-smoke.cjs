/** Read-only connection-entry acceptance against an isolated loopback runtime.
 * Every directory service must expose a connection action and verify current availability.
 * Requests cannot create consent, write finance, or navigate to an external bank.
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
// biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual report location.
const reportPath = process.env.LILLERI_BANK_CONNECT_REPORT || '/tmp/lilleri-bank-connect-ui.json'
const checks = [],
  errors = [],
  writes = [],
  external = [],
  layouts = [],
  verifiedServices = []
const copy = {
  'it-IT': {
    entry: 'Aggiungi conto',
    connect: 'Collega il conto',
    unavailable: 'Collegamento non ancora disponibile',
    back: 'Dettagli del servizio',
    all: 'Tutti i servizi',
    title: 'Trova la tua banca',
    search: 'Cerca una banca o un servizio',
    banks: 'Banche',
    reload: 'Ricarica stato e disponibilità',
    noConnections: 'Non hai collegamenti. Scegli una fonte per vedere le opzioni disponibili.',
    country: 'Paese',
    retry: 'Verifica di nuovo',
    failed: 'Verifica non riuscita',
    unsupported: 'Collegamento automatico non disponibile',
    unverified: 'Compatibilità da verificare',
    dark: 'Usa aspetto scuro',
  },
  'en-GB': {
    entry: 'Add account',
    connect: 'Connect account',
    unavailable: 'Connection is not available yet',
    back: 'Service details',
    all: 'All services',
    title: 'Find your bank',
    search: 'Search for a bank or service',
    banks: 'Banks',
    reload: 'Reload status and availability',
    noConnections: 'You have no connections. Choose a source to see the available options.',
    country: 'Country',
    retry: 'Check again',
    failed: 'Connection check failed',
    unsupported: 'Automatic connection unavailable',
    unverified: 'Compatibility needs checking',
    dark: 'Use dark appearance',
  },
}
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
const pass = (name) => {
  checks.push(name)
  console.log(`PASS ${name}`)
}
const read = async (path) => {
  const r = await fetch(`${origin}/api${path}`)
  assert.equal(r.status, 200)
  return r.json()
}
const canonical = (x) =>
  JSON.stringify({
    accounts: x.accounts,
    transactions: x.transactions,
    connections: x.connections,
    syntheticFixtures: x.syntheticFixtures,
  })
async function fits(page, label) {
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }))
  assert.ok(dimensions.content <= dimensions.width + 1, label)
  layouts.push({ label, ...dimensions })
}
async function focusedTile(page, id) {
  const tile = page.getByTestId(`bank-service-${id}`)
  await tile.waitFor()
  await page.waitForFunction(
    (serviceId) => document.activeElement?.getAttribute('data-testid') === serviceId,
    `bank-service-${id}`,
    { timeout: 3_000 },
  )
  assert.equal(await tile.evaluate((node) => node === document.activeElement), true)
}
async function dedicatedScreen(page, id, locale, name) {
  const main = page.getByRole('main')
  await main.getByRole('heading', { name, exact: true, level: 1 }).waitFor()
  await page.waitForFunction(
    () =>
      document.querySelector('[role="main"]')?.getAttribute('aria-labelledby') ===
      'lilleri-bank-heading',
  )
  await page.waitForFunction(() => (document.querySelector('[role="main"]')?.scrollTop ?? -1) <= 1)
  assert.equal(await main.getAttribute('aria-labelledby'), 'lilleri-bank-heading')
  assert.equal(
    await page.getByRole('heading', { name: copy[locale].title, exact: true }).count(),
    0,
  )
  assert.equal(
    await page.getByRole('combobox', { name: copy[locale].country, exact: true }).count(),
    0,
  )
  assert.equal(await page.locator('[data-testid^="bank-service-"][role="button"]').count(), 0)
  assert.equal(await page.locator('[data-testid^="bank-service-logo-"]').count(), 1)
  assert.equal(await page.getByTestId(`bank-service-logo-${id}`).count(), 1)
  assert.equal(await button(page, copy[locale].reload).count(), 0)
  assert.equal(await page.getByText(copy[locale].noConnections, { exact: true }).count(), 0)
  const skip = page.locator('#lilleri-skip-content')
  await skip.focus()
  await page.keyboard.press('Enter')
  assert.equal(
    await page.locator('#lilleri-bank-heading').evaluate((node) => node === document.activeElement),
    true,
  )
}
async function visibleInMain(page, locator, label) {
  const box = await locator.boundingBox()
  const main = await page.getByRole('main').boundingBox()
  const viewport = page.viewportSize()
  assert.ok(box && main && viewport, label)
  assert.ok(box.y >= main.y - 1 && box.y >= 0, `${label}: above visible content`)
  assert.ok(
    box.y + box.height <= Math.min(main.y + main.height, viewport.height) + 1,
    `${label}: below visible content`,
  )
}
;(async () => {
  const before = await read('/v1/export'),
    directory = await read('/v1/connection-directory')
  assert.equal(directory.entries.length, 62)
  const browser = await chromium.launch({
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Browser supplied by the validation environment.
    executablePath: process.env.CHROME_BIN || undefined,
    headless: true,
    args: ['--no-sandbox'],
  })
  async function pageFor(locale = 'it-IT', width = 650, height = 768) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 3,
    })
    await context.addInitScript(
      ({ locale }) => {
        localStorage.setItem(
          'lilleri.display-preferences.v1',
          JSON.stringify({ version: 1, locale, timezone: 'Europe/Rome' }),
        )
      },
      { locale },
    )
    await context.route('**/*', (route) => {
      const request = route.request()
      if (!request.url().startsWith(origin)) {
        external.push(request.url())
        return route.abort()
      }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        writes.push(request.method())
        return route.abort()
      }
      return route.continue()
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(origin)
    await button(page, copy[locale].entry).click()
    await page
      .getByRole('combobox', { name: copy[locale].country, exact: true })
      .selectOption('all')
    return { context, page }
  }
  async function openFlow(page, id, locale = 'it-IT', expected = copy[locale].unavailable) {
    await page.getByTestId(`bank-service-${id}`).click()
    const detail = page.getByTestId('bank-service-detail')
    await button(detail, copy[locale].connect).waitFor()
    const name = directory.entries.find((entry) => entry.id === id).name
    await dedicatedScreen(page, id, locale, name)
    await visibleInMain(page, button(detail, copy[locale].all), `${id} detail back`)
    await visibleInMain(page, button(detail, copy[locale].connect), `${id} connection action`)
    assert.equal(
      await detail.getByTestId('bank-detail-options-toggle').getAttribute('aria-expanded'),
      'false',
    )
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname === `/api/v1/connection-directory/${id}/connect`,
    )
    await button(detail, copy[locale].connect).click()
    const r = await response
    const flow = page.getByTestId('bank-connection-flow')
    await flow.getByRole('heading', { name: expected, exact: true }).waitFor()
    await dedicatedScreen(page, id, locale, name)
    await visibleInMain(page, button(flow, copy[locale].back), `${id} flow back`)
    assert.equal(await flow.locator('input').count(), 0)
    assert.equal(
      await flow
        .getByRole('button', {
          name: /Continua in banca|Continue to bank|Accedi e continua|Sign in and continue/,
        })
        .count(),
      0,
    )
    return { flow, response: r }
  }
  async function closeFlow(page, locale = 'it-IT') {
    const id = await page
      .getByTestId('bank-connection-flow')
      .locator('[data-testid^="bank-service-logo-"]')
      .getAttribute('data-testid')
    await button(page.getByTestId('bank-connection-flow'), copy[locale].back).click()
    const detail = page.getByTestId('bank-service-detail')
    await detail.waitFor()
    assert.equal(
      await detail
        .getByRole('heading')
        .first()
        .evaluate((node) => node === document.activeElement),
      true,
    )
    await button(detail, copy[locale].all).click()
    await focusedTile(page, id.slice('bank-service-logo-'.length))
  }
  try {
    const { context, page } = await pageFor()
    for (const entry of directory.entries) {
      const { response } = await openFlow(page, entry.id)
      assert.equal(response.status(), 200)
      const value = await response.json()
      assert.equal(value.entry.id, entry.id)
      assert.equal(value.entry.countryCode, entry.countryCode)
      assert.equal(value.entry.automatic.state, 'configuration_required')
      await fits(page, `service ${entry.id}`)
      verifiedServices.push(entry.id)
      await closeFlow(page)
    }
    pass(
      'All 62 banks, cards and wallets expose the connection action and read exact current server availability',
    )
    await openFlow(page, 'bper')
    const refreshed = page.waitForResponse(
      (r) => new URL(r.url()).pathname === '/api/v1/connection-directory/bper/connect',
    )
    await button(page, copy['it-IT'].retry).click()
    assert.equal((await refreshed).status(), 200)
    await page
      .getByTestId('bank-connection-flow')
      .getByRole('heading', { name: copy['it-IT'].unavailable, exact: true })
      .waitFor()
    await closeFlow(page)
    pass('Recheck performs a fresh server read; back returns focus to service details')
    const lastTile = page.locator('[data-testid^="bank-service-"][role="button"]').last()
    await lastTile.scrollIntoViewIfNeeded()
    const savedScroll = await page.getByRole('main').evaluate((node) => node.scrollTop)
    assert.ok(savedScroll > 100)
    const lastId = (await lastTile.getAttribute('data-testid')).slice('bank-service-'.length)
    await openFlow(page, lastId)
    await closeFlow(page)
    await page.waitForFunction(
      (expected) =>
        Math.abs((document.querySelector('[role="main"]')?.scrollTop ?? -1) - expected) <= 2,
      savedScroll,
    )
    await visibleInMain(page, page.getByTestId(`bank-service-${lastId}`), 'returned last tile')
    await page
      .getByRole('combobox', { name: copy['it-IT'].country, exact: true })
      .selectOption('DE')
    await button(page, copy['it-IT'].banks).click()
    await page.getByRole('textbox', { name: copy['it-IT'].search, exact: true }).fill('n26')
    await openFlow(page, 'n26-de')
    await closeFlow(page)
    assert.equal(
      await page.getByRole('combobox', { name: copy['it-IT'].country, exact: true }).inputValue(),
      'DE',
    )
    assert.equal(
      await page.getByRole('textbox', { name: copy['it-IT'].search, exact: true }).inputValue(),
      'n26',
    )
    assert.equal(await button(page, copy['it-IT'].banks).getAttribute('aria-pressed'), 'true')
    assert.equal(await page.locator('[data-testid^="bank-service-"][role="button"]').count(), 1)
    pass(
      'Dedicated bank screens remove the chooser; back restores the clicked tile, scroll, query, type and country',
    )
    await context.close()
    for (const locale of ['it-IT', 'en-GB'])
      for (const width of [320, 650, 1440])
        for (const theme of ['light', 'dark']) {
          const { context, page } = await pageFor(locale, width)
          if (theme === 'dark') await button(page, copy[locale].dark).click()
          await openFlow(
            page,
            width === 320 ? 'monte-paschi-siena' : width === 650 ? 'bper' : 'amex',
            locale,
          )
          await fits(page, `${locale} ${width} ${theme} flow`)
          await closeFlow(page, locale)
          await context.close()
        }
    pass('Connection flows fit mobile and desktop in both languages and appearances')
    const failure = await pageFor()
    let first = true
    await failure.page.route('**/connection-directory/bper/connect', (route) => {
      if (first) {
        first = false
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'private_backend_detail',
            detail: 'internal source unavailable',
          }),
        })
      }
      return route.continue()
    })
    await openFlow(failure.page, 'bper', 'it-IT', copy['it-IT'].failed)
    assert.ok(
      !(await failure.page.getByTestId('bank-connection-flow').innerText()).includes(
        'private_backend_detail',
      ),
    )
    await button(failure.page, copy['it-IT'].retry).click()
    await failure.page
      .getByRole('heading', { name: copy['it-IT'].unavailable, exact: true })
      .waitFor()
    await failure.context.close()
    pass('A failed check has localised retry and recovers without exposing provider errors')
    for (const state of ['unsupported', 'unverified', 'available', 'mismatch']) {
      const variant = await pageFor()
      await variant.page.route('**/connection-directory/bper/connect', async (route) => {
        const value = await (await route.fetch()).json()
        if (state === 'mismatch') value.entry.id = 'unicredit'
        else value.entry.automatic.state = state
        if (state === 'available') {
          value.prerequisites = { privateAccess: 'ready', bankProvider: 'ready' }
          value.entry.automatic.providerId = 'test-provider'
          value.entry.automatic.institutionId = 'test-bank'
          value.entry.automatic.accountKinds = ['current']
        }
        await route.fulfill({ json: value })
      })
      await openFlow(
        variant.page,
        'bper',
        'it-IT',
        state === 'unsupported'
          ? copy['it-IT'].unsupported
          : state === 'unverified'
            ? copy['it-IT'].unverified
            : state === 'mismatch'
              ? copy['it-IT'].failed
              : copy['it-IT'].unavailable,
      )
      await variant.context.close()
    }
    pass(
      'Unsupported, unverified and mismatched replies are distinct; available metadata cannot bypass personal access',
    )
    const race = await pageFor('it-IT', 1440)
    let release
    const delayed = new Promise((resolve) => {
      release = resolve
    })
    await race.page.route('**/connection-directory/bper/connect', async (route) => {
      const response = await route.fetch()
      await delayed
      try {
        await route.fulfill({ response })
      } catch {
        /* The abandoned request was aborted. */
      }
    })
    await race.page.getByTestId('bank-service-bper').click()
    await button(race.page.getByTestId('bank-service-detail'), copy['it-IT'].connect).click()
    await button(race.page.getByTestId('bank-connection-flow'), copy['it-IT'].back).click()
    await button(race.page.getByTestId('bank-service-detail'), copy['it-IT'].all).click()
    await focusedTile(race.page, 'bper')
    await race.page.getByTestId('bank-service-unicredit').click()
    await button(race.page.getByTestId('bank-service-detail'), copy['it-IT'].connect).click()
    await race.page
      .getByTestId('bank-connection-flow')
      .getByRole('heading', { name: copy['it-IT'].unavailable, exact: true })
      .waitFor()
    release()
    await race.page.waitForTimeout(100)
    assert.ok(
      (await race.page.getByTestId('bank-connection-flow').innerText()).includes('UniCredit'),
    )
    assert.ok(
      !(await race.page.getByTestId('bank-connection-flow').innerText()).includes('BPER Banca'),
    )
    await race.context.close()
    pass('Changing bank cancels the previous check and rejects its late response')
    assert.deepEqual(errors, [])
    assert.deepEqual(writes, [])
    assert.deepEqual(external, [])
    assert.equal(canonical(await read('/v1/export')), canonical(before))
    pass(
      'No credentials, external bank navigation, financial writes or archive changes occur before activation',
    )
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          status: 'passed',
          checks,
          verifiedServices,
          layouts,
          pageErrors: errors,
          financialWrites: writes,
          externalRequests: external,
          canonicalArchiveUnchanged: true,
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
