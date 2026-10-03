/**
 * Actual Expo observed-month and explicit cash-estimate UI on an isolated synthetic demo.
 * Run sequentially with other writers: node tools/understanding-ui-smoke.cjs UI_ORIGIN API_ORIGIN.
 * Adds two local accounts and synthetic ledger entries; restores its temporary quiet preference.
 * Never target a personal archive. Node 22+, Playwright and Chromium are local prerequisites.
 */
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { writeFile } = require('node:fs/promises')
const { chromium } = require('playwright')
const ui = process.argv[2] || 'http://localhost:8082'
const api = process.argv[3] || 'http://127.0.0.1:3004'
const reportPath =
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual smoke helper outside cached Turbo tasks.
  process.env.LILLERI_UNDERSTANDING_SMOKE_REPORT || '/tmp/lilleri-understanding-ui.json'
const report = { status: 'running', checks: [], pageErrors: [] }
const suffix = randomUUID().slice(0, 8)
const check = (label) => {
  report.checks.push(label)
  console.log(`PASS ${label}`)
}
function origin(value) {
  const url = new URL(value)
  assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  assert.equal(value, url.origin, 'Use an exact loopback HTTP origin')
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
const button = (page, name) => page.getByRole('button', { name, exact: true })
const finance = (value) => ({
  accounts: value.accounts,
  transactions: value.transactions,
  matches: value.analysis.matches,
})
async function open(page) {
  await button(page, 'Riepilogo mensile e disponibilità').click()
  await page.getByRole('heading', { name: 'Il mese e il tuo margine', exact: true }).waitFor()
  await page.getByRole('textbox', { name: 'Mese del riepilogo', exact: true }).waitFor()
}
async function calculate(page) {
  const pending = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/v1/safe-to-spend',
  )
  await button(page, 'Calcola il margine').click()
  const response = await pending
  assert.equal(response.status(), 200)
  return { value: await response.json(), query: new URL(response.url()).searchParams }
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
  origin(ui)
  origin(api)
  const initial = await request('/v1/demo')
  assert.equal(initial.mode, 'synthetic')
  const monthly = await request('/v1/insights/monthly')
  const today = monthly.boundary.calculatedOn
  const names = { EUR: `Contanti comprensione ${suffix}`, GBP: `Sterline comprensione ${suffix}` }
  const accounts = {}
  for (const currency of ['EUR', 'GBP']) {
    accounts[currency] = await request(
      '/v1/manual/accounts',
      'POST',
      {
        requestId: randomUUID(),
        name: names[currency],
        kind: 'cash',
        currency,
        openingOn: today,
        openingBalanceMinor: currency === 'EUR' ? '10000' : '5000',
      },
      201,
    )
  }
  const entry = async (currency, amountMinor, kind, merchantName) =>
    request(
      '/v1/manual/transactions',
      'POST',
      {
        requestId: randomUUID(),
        accountId: accounts[currency].id,
        amountMinor,
        currency,
        kind,
        bookedOn: today,
        description: `Movimento comprensione sintetico ${suffix}`,
        merchantName,
      },
      201,
    )
  const visibleMerchant = `Esercente comprensione ${suffix}`
  const expense = await entry('EUR', '-1234', 'expense', visibleMerchant)
  await entry('EUR', '5000', 'income', `Entrata comprensione ${suffix}`)
  await entry('EUR', '-250', 'transfer', `Trasferimento comprensione ${suffix}`)
  await entry('GBP', '-750', 'expense', `Spesa sterline ${suffix}`)
  const baseline = await request('/v1/demo')
  const browser = await chromium.launch({
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Local browser prerequisite for manual validation.
    executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  })
  let quietApplied = false
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    })
    context.setDefaultTimeout(20_000)
    const page = await context.newPage()
    page.on('pageerror', (error) => report.pageErrors.push(error.message))
    await page.goto(ui)
    await button(page, 'Riepilogo mensile e disponibilità').waitFor()
    await open(page)
    assert.equal(
      await page.getByRole('textbox', { name: 'Mese del riepilogo', exact: true }).inputValue(),
      today.slice(0, 7),
    )
    await page
      .getByText('Dati disponibili, copertura incompleta', { exact: false })
      .first()
      .waitFor()
    check(
      'current profile-calendar month shows observed subtotals with explicit incomplete coverage',
    )
    const oldMonth = monthly.availableMonths.find((value) => value < today.slice(0, 7))
    if (oldMonth) {
      const pending = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/v1/insights/monthly' &&
          new URL(response.url()).searchParams.get('month') === oldMonth,
      )
      await page.getByRole('textbox', { name: 'Mese del riepilogo', exact: true }).fill(oldMonth)
      await button(page, 'Mostra il mese').click()
      assert.equal((await pending).status(), 200)
      assert.equal(
        await page.getByRole('textbox', { name: 'Mese del riepilogo', exact: true }).inputValue(),
        oldMonth,
      )
      check(
        'user selects available historical month rather than silently replacing the current date',
      )
    }
    const currentPending = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/v1/insights/monthly' &&
        new URL(response.url()).searchParams.get('month') === today.slice(0, 7),
    )
    await page
      .getByRole('textbox', { name: 'Mese del riepilogo', exact: true })
      .fill(today.slice(0, 7))
    await button(page, 'Mostra il mese').click()
    assert.equal((await currentPending).status(), 200)
    for (const currency of ['EUR', 'GBP'])
      await page
        .getByRole('checkbox', { name: `Includi ${names[currency]} ${currency}`, exact: true })
        .click()
    let calculationRequests = 0
    page.on('request', (value) => {
      if (new URL(value.url()).pathname === '/v1/safe-to-spend') calculationRequests++
    })
    await button(page, 'Calcola il margine').click()
    await page.getByText('Indica un margine per ogni valuta:', { exact: false }).waitFor()
    assert.equal(calculationRequests, 0)
    await page.getByRole('textbox', { name: 'Margine EUR', exact: true }).fill('1,234')
    await page.getByRole('textbox', { name: 'Margine GBP', exact: true }).fill('2,50')
    await button(page, 'Calcola il margine').click()
    await page
      .getByText('Controlla le cifre decimali del margine per questa valuta.', { exact: true })
      .waitFor()
    assert.equal(calculationRequests, 0)
    check('empty and over-precision buffers never become a silent zero or a rounded HTTP amount')
    await page.getByRole('textbox', { name: 'Margine EUR', exact: true }).fill('10,00')
    const calculated = await calculate(page)
    assert.deepEqual(JSON.parse(calculated.query.get('bufferByCurrency')), {
      EUR: '1000',
      GBP: '250',
    })
    assert.equal(calculated.query.get('horizonOn'), monthly.boundary.defaultHorizonOn)
    assert.deepEqual(
      calculated.value.results.map((row) => [row.currency, row.value.amountMinor]),
      [
        ['EUR', '12516'],
        ['GBP', '4000'],
      ],
    )
    await page.getByText('Circa € 125,16', { exact: false }).waitFor()
    await page.getByText('− Uscite in sospeso:', { exact: false }).first().waitFor()
    await page.getByText('− Ricorrenti stimate:', { exact: false }).first().waitFor()
    check(
      'explicit local accounts, comma-decimal buffers and horizon yield separate exact currencies with a visible formula',
    )
    await page.getByRole('textbox', { name: 'Margine EUR', exact: true }).fill('20')
    assert.equal(await page.getByText('Circa € 125,16', { exact: false }).count(), 0)
    assert.equal(calculationRequests, 1)
    check(
      'editing the buffer immediately invalidates the prior estimate without automatically submitting it',
    )
    const bank = initial.accounts.find(
      (row) =>
        row.kind === 'current' &&
        row.balance.currency === 'EUR' &&
        initial.connections.find((connection) => connection.id === row.connectionId)?.providerId !==
          'local-manual',
    )
    assert.ok(bank, 'Synthetic bank current account required')
    for (const currency of ['EUR', 'GBP'])
      await page
        .getByRole('checkbox', { name: `Includi ${names[currency]} ${currency}`, exact: true })
        .click()
    await page.getByRole('checkbox', { name: `Includi ${bank.name} EUR`, exact: true }).click()
    await page.getByRole('textbox', { name: 'Margine EUR', exact: true }).fill('0')
    const unknown = await calculate(page)
    assert.equal(unknown.value.results[0].status, 'unavailable')
    assert.equal(unknown.value.results[0].value, null)
    await page.getByText('EUR: stima non disponibile', { exact: true }).waitFor()
    await page
      .getByText('La fonte non precisa come interpretare il saldo.', { exact: true })
      .waitFor()
    check(
      'bank balance semantics remain unknown and display an unavailable estimate with a concrete reason',
    )
    await button(page, 'Apri i movimenti usati').first().click()
    await page.getByText(visibleMerchant, { exact: true }).waitFor()
    const privacyPath = `/v1/transactions/${expense.transactionId}/privacy`
    const flags = await request(privacyPath)
    await request(privacyPath, 'PATCH', { revision: flags.revision, quiet: true, private: false })
    quietApplied = true
    await page.reload()
    await button(page, 'Riepilogo mensile e disponibilità').waitFor()
    await open(page)
    await button(page, 'Apri i movimenti usati').first().click()
    assert.equal(await page.getByText(visibleMerchant, { exact: true }).count(), 0)
    const savedMonth = await request('/v1/insights/monthly')
    assert.ok(!JSON.stringify(savedMonth).includes(expense.transactionId))
    assert.ok(
      (await request('/v1/demo')).transactions.some((row) => row.id === expense.transactionId),
    )
    check('quiet preference suppresses insight evidence while retaining the owned transaction')
    const panel = page
      .getByRole('heading', { name: 'Il mese e il tuo margine', exact: true })
      .locator('..')
    for (const control of await panel.locator('[role="button"], [role="checkbox"], input').all()) {
      const bounds = await control.boundingBox()
      assert.ok(
        bounds && bounds.width >= 48 && bounds.height >= 48,
        'Understanding targets need 48 points',
      )
    }
    await noOverflow(page, 390)
    await noOverflow(page, 320)
    check(
      'understanding controls have 48-point targets and no horizontal overflow at 390/320 CSS pixels',
    )
    assert.deepEqual(finance(await request('/v1/demo')), finance(baseline))
    assert.deepEqual(report.pageErrors, [])
    check('readonly calculations preserve the ledger and render without browser exceptions')
    report.status = 'passed'
  } finally {
    if (quietApplied) {
      const path = `/v1/transactions/${expense.transactionId}/privacy`,
        flags = await request(path)
      await request(path, 'PATCH', { revision: flags.revision, quiet: false, private: false })
    }
    await browser.close()
  }
})()
  .catch((cause) => {
    report.status = 'failed'
    report.error = cause instanceof Error ? cause.message : 'understanding_ui_smoke_failed'
    console.error(report.error)
    process.exitCode = 1
  })
  .finally(async () => {
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  })
