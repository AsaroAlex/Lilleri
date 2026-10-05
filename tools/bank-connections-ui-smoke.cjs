/** Read-only bank picker acceptance against an isolated empty loopback preview.
 * Run: LILLERI_PLAYWRIGHT_MODULE=... CHROME_BIN=... node tools/bank-connections-ui-smoke.cjs
 * No financial request is written, and no external bank site is opened.
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
const reportPath = process.env.LILLERI_BANK_UI_REPORT || '/tmp/lilleri-bank-connections-ui.json'
const checks = []
const pass = (name) => {
  checks.push(name)
  console.log(`PASS ${name}`)
}
const italianBankNames = new Set()
const button = (page, name) =>
  page.getByRole('button', {
    name: italianBankNames.has(name) ? `${name}, Italia` : name,
    exact: true,
  })
async function read(path) {
  const response = await fetch(`${origin}/api${path}`, { signal: AbortSignal.timeout(20_000) })
  assert.equal(response.status, 200, path)
  return response.json()
}
async function fits(page, label) {
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }))
  assert.ok(dimensions.content <= dimensions.width + 1, `${label}: ${JSON.stringify(dimensions)}`)
}
;(async () => {
  const initial = await read('/v1/demo')
  assert.equal(initial.fixtureMode, 'empty')
  assert.equal(initial.accounts.length, 0)
  assert.equal(initial.transactions.length, 0)
  const directory = await read('/v1/connection-directory')
  assert.equal(directory.country, 'IT')
  assert.ok(directory.entries.length >= 16)
  for (const entry of directory.entries) {
    assert.equal(entry.automatic.state, 'configuration_required')
    assert.equal(entry.automatic.institutionId, null)
    assert.equal(entry.automatic.providerId, null)
    assert.equal(new URL(entry.officialUrl).protocol, 'https:')
  }
  const italianEntries = directory.entries.filter((entry) => (entry.countryCode ?? 'IT') === 'IT')
  for (const entry of italianEntries) italianBankNames.add(entry.name)
  assert.equal(italianEntries.length, 18)
  pass('Actual directory exposes brands without fabricated live coverage')
  const browser = await chromium.launch({
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Browser supplied by validation environment.
    executablePath: process.env.CHROME_BIN || undefined,
    headless: true,
    args: ['--no-sandbox'],
  })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
    const errors = []
    const writes = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => {
      if (
        request.url().startsWith(`${origin}/api/`) &&
        !['GET', 'HEAD', 'OPTIONS'].includes(request.method())
      )
        writes.push(`${request.method()} ${new URL(request.url()).pathname}`)
    })
    await page.goto(origin)
    await button(page, 'Aggiungi conto').click()
    await page.getByRole('heading', { name: 'Trova la tua banca', exact: true }).waitFor()
    await page.getByRole('combobox', { name: 'Paese', exact: true }).waitFor()
    assert.equal(
      await page.getByRole('combobox', { name: 'Paese', exact: true }).inputValue(),
      'IT',
    )
    for (const entry of italianEntries) await button(page, entry.name).waitFor()
    pass('Home defaults to all 18 Italian banks, cards and wallets in the European directory')
    const search = page.getByRole('textbox', { name: 'Cerca una banca o un servizio', exact: true })
    for (const [query, name] of [
      ['credit agricole', 'Crédit Agricole Italia'],
      ['Cariparma', 'Crédit Agricole Italia'],
      ['Uni Credit', 'UniCredit'],
      ['B.P.M.', 'Banco BPM'],
      ['amex', 'American Express'],
    ]) {
      await search.fill(query)
      await button(page, name).waitFor()
    }
    await search.fill('nessuna banca xyz')
    await page.getByRole('heading', { name: 'Nessun servizio trovato', exact: true }).waitFor()
    await button(page, 'Mostra tutti i servizi').click()
    await button(page, 'Carte').click()
    await button(page, 'American Express').waitFor()
    assert.equal(await button(page, 'Intesa Sanpaolo').count(), 0)
    await button(page, 'Portafogli').click()
    await button(page, 'Satispay').waitFor()
    assert.equal(await button(page, 'American Express').count(), 0)
    await button(page, 'Tutti').click()
    pass('Alias search, accent handling, empty state and type filters work')
    for (const name of ['Intesa Sanpaolo', 'American Express', 'Satispay']) {
      await button(page, name).click()
      const detail = page.getByTestId('bank-service-detail')
      await detail.getByRole('heading', { name, exact: true }).waitFor()
      assert.equal(await button(page, 'Collega il conto').count(), 1)
      const website = detail.getByRole('link', { name: /Apri il sito ufficiale/ })
      assert.equal(await website.getAttribute('target'), '_blank')
      assert.equal(await website.getAttribute('rel'), 'noopener noreferrer')
      assert.equal(new URL(await website.getAttribute('href')).protocol, 'https:')
      if (name !== 'Intesa Sanpaolo') {
        await detail.getByText(/documento personale verificato è in PDF/).waitFor()
        assert.equal(await button(page, 'Importa estratto conto').count(), 0)
        await detail.getByRole('link', { name: /Guida al documento/ }).waitFor()
      }
      await fits(page, name)
      await button(page, 'Tutti i servizi').click()
      assert.equal(await search.evaluate((element) => document.activeElement === element), true)
    }
    pass('Bank, Amex and Satispay details explain unavailable routes and return keyboard focus')
    for (const width of [320, 390, 599, 768, 960, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await fits(page, `directory ${width}`)
      await button(page, 'American Express').click()
      await page.getByTestId('bank-service-detail').waitFor()
      await fits(page, `detail ${width}`)
      await button(page, 'Tutti i servizi').click()
    }
    await button(page, 'Usa aspetto scuro').click()
    await fits(page, 'dark mobile')
    pass('Directory and details fit mobile, tablet and desktop, with light and dark themes')
    assert.deepEqual(writes, [])
    assert.deepEqual(errors, [])
    const after = await read('/v1/demo')
    assert.deepEqual(after.accounts, initial.accounts)
    assert.deepEqual(after.transactions, initial.transactions)
    assert.deepEqual(after.connections, initial.connections)
    await page.reload()
    await button(page, 'Aggiungi conto').waitFor()
    pass('Selection makes no financial writes; reload keeps the preview empty')
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          status: 'passed',
          checks,
          entries: directory.entries.length,
          widths: [320, 390, 599, 768, 960, 1440],
          financialWrites: writes,
          pageErrors: errors,
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
