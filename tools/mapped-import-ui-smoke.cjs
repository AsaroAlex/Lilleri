/**
 * Actual mapped CSV flows against a synthetic DEMO_MODE=1 API and Expo bundle.
 * Use an isolated archive and no competing writer on its demo profile.
 * Creates a dedicated synthetic manual account and audit/import rows; never deletes them.
 * Run: node tools/mapped-import-ui-smoke.cjs [UI_ORIGIN] [API_ORIGIN]
 * Playwright and Chromium are local validation prerequisites, not app dependencies.
 */
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { writeFile } = require('node:fs/promises')
const { chromium } = require('playwright')

const ui = process.argv[2] || 'http://localhost:8082'
const api = process.argv[3] || 'http://127.0.0.1:3004'
// biome-ignore lint/suspicious/noUndeclaredEnvVars: This manual helper is not a cached Turbo task.
const reportPath = process.env.LILLERI_MAPPED_SMOKE_REPORT || '/tmp/lilleri-mapped-import-ui.json'
const report = { status: 'running', checks: [], pageErrors: [] }
const check = (name) => {
  report.checks.push(name)
  console.log(`PASS ${name}`)
}
const button = (page, name) => page.getByRole('button', { name, exact: true })
const csvField = (page) => page.getByRole('textbox', { name: 'CSV da associare', exact: true })
const financial = (overview) => ({
  accounts: overview.accounts,
  transactions: overview.transactions,
  analysis: overview.analysis,
})
function validateOrigin(value) {
  const url = new URL(value)
  assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  assert.equal(value, url.origin, 'Use an exact loopback HTTP origin')
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
  return response.status === 204 ? undefined : response.json()
}
async function responseFrom(page, path, method, action, expected = 200) {
  const pending = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === path && response.request().method() === method,
  )
  const [response] = await Promise.all([pending, Promise.resolve().then(action)])
  assert.equal(response.status(), expected, path)
  return response.json()
}
async function openPanel(page) {
  await button(page, 'Movimenti').click()
  await responseFrom(page, '/v1/import-mappings', 'GET', () =>
    button(page, 'CSV personalizzato').click(),
  )
  await page.getByRole('heading', { name: 'Importa CSV con associazioni', exact: true }).waitFor()
}
async function selectColumn(page, field, header) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.getByRole('button', { name: new RegExp(`^${escaped}:`) }).click()
  await page.getByRole('radio', { name: `${field}: ${header}`, exact: true }).click()
}
async function inspect(page, csv) {
  await csvField(page).fill(csv)
  const layout = await responseFrom(page, '/v1/imports/mapped/layout', 'POST', () =>
    button(page, 'Leggi intestazioni CSV').click(),
  )
  assert.deepEqual(layout.errors, [])
  await page.getByRole('heading', { name: '2. Associa le colonne', exact: true }).waitFor()
  return layout
}
async function preview(page) {
  const value = await responseFrom(page, '/v1/imports/mapped/preview', 'POST', () =>
    button(page, 'Mostra anteprima importazione').click(),
  )
  await page.getByRole('heading', { name: '3. Controlla l’anteprima', exact: true }).waitFor()
  return value
}
async function manualAccount(id) {
  const account = (await request('/v1/manual/accounts')).find((item) => item.id === id)
  assert.ok(account)
  return account
}
async function noOverflow(page, name) {
  const bounds = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
  }))
  assert.ok(bounds.width <= bounds.viewport + 1, `${name}: ${JSON.stringify(bounds)}`)
}

;(async () => {
  validateOrigin(ui)
  validateOrigin(api)
  assert.equal((await request('/v1/demo')).mode, 'synthetic')
  const suffix = randomUUID().slice(0, 8)
  const accountName = `CSV locale sintetico ${suffix}`
  const account = await request(
    '/v1/manual/accounts',
    'POST',
    {
      requestId: randomUUID(),
      name: accountName,
      kind: 'cash',
      currency: 'EUR',
      openingBalanceMinor: '200000',
      openingOn: '2026-10-03',
    },
    201,
  )
  const initial = await request('/v1/demo')
  const name = `Formato sintetico ${suffix}`
  const header = 'Data;Valuta;Descrizione;Importo;Codice;Stato'
  const csv = `${header}\n03/10/2026;04/10/2026;Spesa locale ${suffix};-1.234,56;mapped-out-${suffix};Fatto\n03/10/2026;04/10/2026;Entrata locale ${suffix};10,00;mapped-in-${suffix};Fatto`
  const firstBalance = (200000n - 123456n + 1000n).toString()
  const duplicateBalance = (BigInt(firstBalance) - 250n - 250n).toString()
  const finalBalance = (BigInt(duplicateBalance) + 1n - 300n).toString()
  const browser = await chromium.launch({
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: This manual helper is not a cached Turbo task.
    executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  })
  let releaseLateResponse = () => {}
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    })
    context.setDefaultTimeout(20_000)
    const page = await context.newPage()
    page.on('pageerror', (error) => report.pageErrors.push(error.message))
    await page.goto(ui)
    await button(page, 'Controlla').waitFor()
    await openPanel(page)
    await page
      .getByRole('radio', { name: `Conto per importazione: ${accountName}, EUR`, exact: true })
      .click()
    const layout = await inspect(page, csv)
    assert.equal(layout.rowCount, 2)
    assert.deepEqual(layout.header, ['Data', 'Valuta', 'Descrizione', 'Importo', 'Codice', 'Stato'])
    await selectColumn(page, 'Data di contabilizzazione', 'Data')
    await selectColumn(page, 'Descrizione', 'Descrizione')
    await selectColumn(page, 'Importo con segno', 'Importo')
    await selectColumn(page, 'Identificatore della fonte', 'Codice')
    await selectColumn(page, 'Data valuta', 'Valuta')
    await selectColumn(page, 'Stato', 'Stato')
    const status = page.getByRole('textbox', { name: 'Valore dello stato Contabilizzato, 1' })
    await status.fill('F')
    await status.pressSequentially('atto')
    assert.equal(await status.inputValue(), 'Fatto', 'Alias editing must retain focus and identity')
    await page.getByRole('textbox', { name: 'Nome delle associazioni CSV', exact: true }).fill(name)
    const saved = await responseFrom(page, '/v1/import-mappings', 'POST', () =>
      button(page, 'Salva associazioni CSV').click(),
    )
    await page.getByText('Associazioni salvate per questo conto.', { exact: false }).waitFor()
    assert.equal(saved.accountId, account.id)
    assert.equal(saved.mapping.columns.valueOn, 'Valuta')
    assert.deepEqual(saved.mapping.statusValues, { Fatto: 'booked' })
    assert.deepEqual(financial(await request('/v1/demo')), financial(initial))
    check(
      'Owned account, explicit headers, Italian decimals/dates and stable status aliases save without importing',
    )

    const first = await preview(page)
    assert.deepEqual(first.errors, [])
    assert.equal(first.rows[0].record.amount, '-1234.56')
    assert.equal(first.rows[0].record.bookedOn, '2026-10-03')
    assert.equal(first.rows[0].provenance.valueOn, '2026-10-04')
    assert.equal(first.rows[0].provenance.rawValueOn, '04/10/2026')
    assert.equal(first.rows[0].provenance.identity, 'external')
    assert.deepEqual(financial(await request('/v1/demo')), financial(initial))
    await page
      .getByRole('textbox', { name: 'Nome delle associazioni CSV', exact: true })
      .fill(`${name} aggiornato`)
    assert.equal(await page.getByRole('heading', { name: '3. Controlla l’anteprima' }).count(), 0)
    const renamed = await responseFrom(page, `/v1/import-mappings/${saved.id}`, 'PATCH', () =>
      button(page, 'Salva modifiche alle associazioni').click(),
    )
    await page.getByText('Associazioni salvate per questo conto.', { exact: false }).waitFor()
    assert.equal(renamed.revision, saved.revision + 1)
    await preview(page)
    check(
      'Exact signed money and separate value date preview leave finances unchanged; editing invalidates the decision',
    )

    // Simulate a lost success reply after the actual server commits. The fresh explicit retry
    // must use the same command identity; the server returns its accepted result once.
    const commitPath = '/v1/imports/mapped/commit'
    const acceptedBodies = []
    page.on('request', (outbound) => {
      if (new URL(outbound.url()).pathname === commitPath && outbound.method() === 'POST')
        acceptedBodies.push(outbound.postDataJSON())
    })
    await page.route(
      `${api}${commitPath}`,
      async (route) => {
        const accepted = await route.fetch()
        assert.equal(accepted.status(), 200)
        await route.fulfill({
          status: 503,
          contentType: 'application/problem+json',
          headers: {
            'access-control-allow-origin': ui,
            'access-control-allow-credentials': 'true',
          },
          body: JSON.stringify({
            code: 'synthetic_lost_reply',
            detail: 'Risposta sintetica non confermata.',
          }),
        })
        await page.unroute(`${api}${commitPath}`)
      },
      { times: 1 },
    )
    await responseFrom(
      page,
      commitPath,
      'POST',
      () => button(page, 'Importa righe dell’anteprima').click(),
      503,
    )
    await page.getByRole('alert').waitFor()
    assert.equal(await csvField(page).inputValue(), csv)
    assert.equal((await manualAccount(account.id)).balanceMinor, firstBalance)
    const accepted = await responseFrom(page, commitPath, 'POST', () =>
      button(page, 'Importa righe dell’anteprima').click(),
    )
    await page
      .getByText('2 nuovi movimenti, 0 aggiornati, 0 già presenti.', { exact: false })
      .waitFor()
    assert.equal(accepted.inserted, 2)
    assert.equal(acceptedBodies.length, 2)
    assert.equal(acceptedBodies[0].requestId, acceptedBodies[1].requestId)
    assert.equal((await manualAccount(account.id)).balanceMinor, firstBalance)
    assert.equal(await csvField(page).inputValue(), '')
    assert.equal(await page.getByRole('heading', { name: '3. Controlla l’anteprima' }).count(), 0)
    check(
      'Lost success reply retains preview and request identity; explicit retry adds each row and exact manual balance once',
    )

    const afterFirst = await request('/v1/demo')
    await inspect(page, csv)
    await preview(page)
    const repeated = await responseFrom(page, commitPath, 'POST', () =>
      button(page, 'Importa righe dell’anteprima').click(),
    )
    await page
      .getByText('0 nuovi movimenti, 0 aggiornati, 2 già presenti.', { exact: false })
      .waitFor()
    assert.equal(repeated.unchanged, 2)
    assert.deepEqual(financial(await request('/v1/demo')), financial(afterFirst))
    check('Reimport with stable source IDs leaves financial facts unchanged')

    const duplicateCsv = `${header}\n03/10/2026;04/10/2026;Acquisto uguale ${suffix};-2,50;;Fatto\n03/10/2026;04/10/2026;Acquisto uguale ${suffix};-2,50;;Fatto`
    await inspect(page, duplicateCsv)
    await selectColumn(page, 'Identificatore della fonte', 'Nessuna')
    const duplicatePreview = await preview(page)
    assert.deepEqual(duplicatePreview.errors, [])
    assert.equal(duplicatePreview.canImport, false)
    assert.equal(duplicatePreview.duplicateCandidates.length, 1)
    assert.equal(await button(page, 'Importa righe dell’anteprima').isDisabled(), true)
    const acknowledgement = page.getByRole('checkbox', {
      name: 'Ho controllato le righe uguali e voglio mantenerle tutte',
      exact: true,
    })
    await acknowledgement.click()
    assert.equal(await button(page, 'Importa righe dell’anteprima').isDisabled(), false)
    await csvField(page).fill(duplicateCsv.replaceAll('Acquisto uguale', 'Acquisto ricontrollato'))
    assert.equal(await page.getByRole('heading', { name: '3. Controlla l’anteprima' }).count(), 0)
    await responseFrom(page, '/v1/imports/mapped/layout', 'POST', () =>
      button(page, 'Leggi intestazioni CSV').click(),
    )
    await preview(page)
    assert.equal(await acknowledgement.getAttribute('aria-checked'), 'false')
    assert.equal(await button(page, 'Importa righe dell’anteprima').isDisabled(), true)
    await acknowledgement.click()
    const kept = await responseFrom(page, commitPath, 'POST', () =>
      button(page, 'Importa righe dell’anteprima').click(),
    )
    await page
      .getByText('2 nuovi movimenti, 0 aggiornati, 0 già presenti.', { exact: false })
      .waitFor()
    assert.equal(kept.inserted, 2)
    assert.equal((await manualAccount(account.id)).balanceMinor, duplicateBalance)
    const duplicateRows = (await request('/v1/demo')).transactions.filter(
      (row) =>
        row.accountId === account.id && row.description === `Acquisto ricontrollato ${suffix}`,
    )
    assert.equal(duplicateRows.length, 2)
    assert.notEqual(duplicateRows[0].id, duplicateRows[1].id)
    check(
      'Generated identical rows require explicit review, editing clears acknowledgement and both distinct purchases survive',
    )

    const freshCsv = `${header}\n03/10/2026;04/10/2026;Decisione successiva ${suffix};-3,00;;Fatto`
    await inspect(page, freshCsv)
    await preview(page)
    await request(
      '/v1/manual/transactions',
      'POST',
      {
        requestId: randomUUID(),
        accountId: account.id,
        amountMinor: '1',
        currency: 'EUR',
        bookedOn: '2026-10-03',
        kind: 'income',
        description: `Intervento sintetico ${suffix}`,
      },
      201,
    )
    const intervened = await request('/v1/demo')
    const beforeStaleWrites = acceptedBodies.length
    const stale = await responseFrom(
      page,
      commitPath,
      'POST',
      () => button(page, 'Importa righe dell’anteprima').click(),
      409,
    )
    assert.equal(stale.code, 'import_preview_stale')
    await page
      .getByText('Il conto, i movimenti o le associazioni sono cambiati.', { exact: false })
      .waitFor()
    assert.equal(await page.getByRole('heading', { name: '3. Controlla l’anteprima' }).count(), 0)
    await page.waitForTimeout(200)
    assert.equal(acceptedBodies.length, beforeStaleWrites + 1)
    assert.deepEqual(financial(await request('/v1/demo')), financial(intervened))
    await preview(page)
    await responseFrom(page, commitPath, 'POST', () =>
      button(page, 'Importa righe dell’anteprima').click(),
    )
    await page
      .getByText('1 nuovi movimenti, 0 aggiornati, 0 già presenti.', { exact: false })
      .waitFor()
    assert.equal((await manualAccount(account.id)).balanceMinor, finalBalance)
    check(
      'Intervening account change rejects one stale commit; fresh preview and gesture apply the later row exactly once',
    )

    const beforeArchive = await request('/v1/demo')
    const archived = await responseFrom(page, `/v1/import-mappings/${saved.id}`, 'PATCH', () =>
      button(page, `Archivia ${renamed.name}`).click(),
    )
    await page.getByText('Associazioni archiviate.', { exact: false }).waitFor()
    assert.equal(archived.archived, true)
    await page
      .getByRole('checkbox', { name: 'Mostra associazioni archiviate', exact: true })
      .click()
    assert.equal(await button(page, `Usa ${renamed.name}`).isDisabled(), true)
    const restored = await responseFrom(page, `/v1/import-mappings/${saved.id}`, 'PATCH', () =>
      button(page, `Ripristina ${renamed.name}`).click(),
    )
    await page.getByText('Associazioni ripristinate.', { exact: false }).waitFor()
    assert.equal(restored.archived, false)
    assert.equal(restored.revision, archived.revision + 1)
    assert.deepEqual(financial(await request('/v1/demo')), financial(beforeArchive))
    await button(page, `Usa ${renamed.name}`).click()
    await inspect(page, csv)
    assert.equal(
      await page.getByRole('textbox', { name: 'Nome delle associazioni CSV' }).inputValue(),
      renamed.name,
    )
    check(
      'Saved mapping archive/restore advances revisions without deleting or changing financial history',
    )

    await page.setViewportSize({ width: 320, height: 844 })
    await noOverflow(page, '320px saved CSV mapping')
    await inspect(page, csv)
    await preview(page)
    await noOverflow(page, '320px mapped CSV preview')
    const panel = page
      .getByRole('heading', { name: 'Importa CSV con associazioni', exact: true })
      .locator('..')
    for (const control of await panel
      .locator('[role="button"], [role="radio"], [role="checkbox"]')
      .all()) {
      const bounds = await control.boundingBox()
      assert.ok(
        bounds && bounds.width >= 43.5 && bounds.height >= 43.5,
        'Panel controls need 44px targets',
      )
    }
    check('320px mapping/preview reflows with 44px web controls')

    let release
    const released = new Promise((resolve) => {
      release = resolve
    })
    releaseLateResponse = release
    const incoming = page.waitForRequest(
      (outbound) =>
        new URL(outbound.url()).pathname === '/v1/imports/mapped/preview' &&
        outbound.method() === 'POST',
    )
    await page.route(
      `${api}/v1/imports/mapped/preview`,
      async (route) => {
        await released
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          headers: {
            'access-control-allow-origin': ui,
            'access-control-allow-credentials': 'true',
          },
          body: JSON.stringify({
            code: 'authentication_required',
            detail: 'Vecchia richiesta sintetica',
          }),
        })
      },
      { times: 1 },
    )
    await Promise.all([incoming, button(page, 'Mostra anteprima importazione').click()])
    await button(page, '← Torna ai movimenti').click()
    release()
    await page.waitForTimeout(250)
    assert.equal(await page.getByText('Vecchia richiesta sintetica', { exact: false }).count(), 0)
    assert.equal(
      await page
        .getByRole('heading', { name: 'Importa CSV con associazioni', exact: true })
        .count(),
      0,
    )
    await button(page, 'CSV personalizzato').click()
    assert.equal(await csvField(page).inputValue(), '')
    assert.equal(await page.getByRole('heading', { name: '3. Controlla l’anteprima' }).count(), 0)
    assert.deepEqual(report.pageErrors, [])
    check(
      'Unmount discards delayed old error and volatile CSV/preview; no browser JavaScript errors',
    )
    report.status = 'passed'
  } finally {
    releaseLateResponse()
    await browser.close()
  }
})()
  .catch((error) => {
    report.status = 'failed'
    report.error = error instanceof Error ? error.message : String(error)
    console.error(report.error)
    process.exitCode = 1
  })
  .finally(async () => {
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
    console.log(`Report: ${reportPath}`)
  })
