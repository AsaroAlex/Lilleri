/** Actual CSV/bank explicit link, Inbox undo, and reimport on a separate synthetic archive. */
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { writeFile } = require('node:fs/promises')
const { chromium } = require('playwright')
const ui = process.argv[2] || 'http://127.0.0.1:5173'
const api = process.argv[3] || 'http://127.0.0.1:3287'
const report = { checks: [], pageErrors: [] }
const check = (name) => {
  report.checks.push(name)
  console.log(`PASS ${name}`)
}
const button = (page, name) => page.getByRole('button', { name, exact: true })
async function request(path) {
  const response = await fetch(`${api}${path}`)
  assert.equal(response.status, 200)
  return response.json()
}
async function responseFrom(page, path, action, method = 'POST') {
  const pending = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === path && response.request().method() === method,
  )
  const [response] = await Promise.all([pending, action()])
  const result = await response.json()
  assert.equal(response.status(), 200, `${path}: ${JSON.stringify(result)}`)
  return result
}
async function column(page, field, header) {
  await page.getByRole('button', { name: new RegExp(`^${field}:`) }).click()
  await page.getByRole('radio', { name: `${field}: ${header}`, exact: true }).click()
}
;(async () => {
  for (const value of [ui, api]) {
    const url = new URL(value)
    assert.ok(
      url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname) &&
        value === url.origin,
    )
  }
  const before = await request('/v1/demo')
  assert.equal(before.mode, 'synthetic')
  const bank = before.transactions.find(
    (transaction) =>
      transaction.source === 'bank' &&
      transaction.status === 'booked' &&
      transaction.kind === 'expense' &&
      transaction.amount.currency === 'EUR' &&
      !before.analysis.matches.some(
        (match) => match.state === 'confirmed' && match.transactionIds.includes(transaction.id),
      ) &&
      before.transactions.filter(
        (other) =>
          other.source === 'bank' &&
          other.accountId === transaction.accountId &&
          other.status === 'booked' &&
          other.amount.amountMinor === transaction.amount.amountMinor &&
          Math.abs(Date.parse(other.bookedOn) - Date.parse(transaction.bookedOn)) <=
            14 * 86_400_000,
      ).length === 1,
  )
  assert.ok(bank)
  const account = before.accounts.find((account) => account.id === bank.accountId)
  const importedOn = new Date(Date.parse(bank.bookedOn) + 7 * 86_400_000).toISOString().slice(0, 10)
  const minor = BigInt(bank.amount.amountMinor),
    absolute = minor < 0n ? -minor : minor
  const value = `${minor < 0n ? '-' : ''}${absolute / 100n},${(absolute % 100n).toString().padStart(2, '0')}`
  const merchant = `CSV merchant sample ${randomUUID().slice(0, 8)}`
  const csv = `Data;Descrizione;Importo;Codice;Negozio\n${importedOn.slice(8)}${'/'}${importedOn.slice(5, 7)}/${importedOn.slice(0, 4)};Synthetic different descriptor;${value};${randomUUID()};${merchant}\n`
  const browser = await chromium.launch({
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual browser acceptance script.
    executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  })
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    page.on('pageerror', (error) => report.pageErrors.push(error.message))
    await page.goto(ui)
    await button(page, 'Movimenti').click()
    await button(page, 'Importa file').click()
    await page.getByRole('heading', { name: 'Importa movimenti da file', exact: true }).waitFor()
    const prepare = async () => {
      await page
        .getByRole('radio', { name: `Conto per importazione: ${account.name}, EUR`, exact: true })
        .click()
      await page.getByRole('textbox', { name: 'CSV da associare', exact: true }).fill(csv)
      await responseFrom(page, '/v1/imports/mapped/layout', () =>
        button(page, 'Leggi intestazioni CSV').click(),
      )
      for (const [field, header] of [
        ['Data di contabilizzazione', 'Data'],
        ['Descrizione', 'Descrizione'],
        ['Importo con segno', 'Importo'],
        ['Identificatore della fonte', 'Codice'],
        ['Esercente', 'Negozio'],
      ])
        await column(page, field, header)
      return responseFrom(page, '/v1/imports/mapped/preview', () =>
        button(page, 'Mostra anteprima importazione').click(),
      )
    }
    const preview = await prepare()
    assert.equal(preview.crossSourceCandidates.length, 1)
    assert.equal(preview.crossSourceCandidates[0].transactionId, bank.id)
    assert.equal(preview.crossSourceCandidates[0].dateDistanceDays, 7)
    assert.ok(await button(page, 'Importa righe dell’anteprima').isDisabled())
    await page.getByText(bank.description, { exact: false }).waitFor()
    const link = page.getByRole('button', { name: /^Collega al movimento bancario del / })
    await link.click()
    assert.equal(await link.getAttribute('aria-pressed'), 'true')
    const accepted = await responseFrom(page, '/v1/imports/mapped/commit', () =>
      button(page, 'Importa righe dell’anteprima').click(),
    )
    assert.equal(accepted.linked, 1)
    assert.equal(accepted.inserted, 0)
    const linked = await request('/v1/demo')
    const imported = linked.transactions.find(
      (transaction) => !before.transactions.some((previous) => previous.id === transaction.id),
    )
    assert.ok(imported)
    const match = linked.analysis.matches.find(
      (match) =>
        match.type === 'duplicate' &&
        match.transactionIds.includes(bank.id) &&
        match.transactionIds.includes(imported.id),
    )
    assert.ok(match && match.state === 'confirmed')
    assert.equal(linked.transactions.length, before.transactions.length + 1)
    assert.equal(
      linked.accounts.find((account) => account.id === bank.accountId).balance.amountMinor,
      account.balance.amountMinor,
    )
    check(
      'Seven-day different-descriptor import requires an explicit selected bank link; retained source counts once and bank balance stays unchanged',
    )
    await page.getByRole('button', { name: /^Da controllare/ }).click()
    const card = page
      .getByRole('heading', { name: 'Possibile duplicato', exact: true })
      .locator('..')
      .locator('..')
      .filter({ has: page.getByText(merchant, { exact: true }) })
    await responseFrom(
      page,
      `/v1/reconciliation/${encodeURIComponent(match.id)}`,
      () => button(card, 'Annulla decisione').click(),
      'PATCH',
    )
    const undone = await request('/v1/demo')
    assert.equal(undone.analysis.matches.find((current) => current.id === match.id).state, 'undone')
    check('Inbox undo restores both distinct transactions without deleting either source')
    await button(page, 'Movimenti').click()
    await button(page, 'Importa file').click()
    const fresh = await prepare()
    assert.equal(fresh.previousImports[0].disposition, 'imported')
    assert.equal(fresh.crossSourceCandidates.length, 0)
    const repeated = await responseFrom(page, '/v1/imports/mapped/commit', () =>
      button(page, 'Importa righe dell’anteprima').click(),
    )
    assert.equal(repeated.inserted, 0)
    assert.equal(repeated.linked, 0)
    assert.equal(
      (await request('/v1/demo')).analysis.matches.find((current) => current.id === match.id).state,
      'undone',
    )
    check('Reimport preserves the undone decision and creates no new financial row')
    assert.deepEqual(report.pageErrors, [])
    report.status = 'passed'
  } finally {
    await browser.close()
  }
})()
  .catch((error) => {
    report.status = 'failed'
    report.error = error.message
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await writeFile(
      // biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual browser acceptance script.
      process.env.LILLERI_CROSS_SOURCE_REPORT || '/tmp/lilleri-cross-source-ui.json',
      `${JSON.stringify(report, null, 2)}\n`,
    )
  })
