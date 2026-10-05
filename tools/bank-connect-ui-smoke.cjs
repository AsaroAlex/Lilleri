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
  async function pageFor(locale = 'it-IT', width = 650) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
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
    const response = page.waitForResponse(
      (r) => new URL(r.url()).pathname === `/api/v1/connection-directory/${id}/connect`,
    )
    await button(detail, copy[locale].connect).click()
    const r = await response
    const flow = page.getByTestId('bank-connection-flow')
    await flow.getByRole('heading', { name: expected, exact: true }).waitFor()
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
