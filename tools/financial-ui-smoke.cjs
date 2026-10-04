/**
 * Real Expo web financial flows against an isolated synthetic demo archive.
 * Prerequisites: Node 22+, Playwright resolvable by Node, Chromium installed,
 * and the default DEMO_MODE=1 API plus Expo web built from the current sources.
 * Start them with a NEW PGLITE_PATH; this script adds a local account and synthetic
 * transactions. Do not run competing writers or target a personal archive.
 * Run: node tools/financial-ui-smoke.cjs [UI_ORIGIN] [API_ORIGIN]
 * Defaults: http://localhost:8081 and http://127.0.0.1:3001.
 * Optional env: CHROMIUM_EXECUTABLE, LILLERI_FINANCIAL_SMOKE_REPORT.
 * No bank data, authentication credentials, destructive profile erasure or native
 * device claims. All exercised writes are checked through the actual API.
 */
const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const { readFile, writeFile } = require('node:fs/promises')
const { createRequire } = require('node:module')
const { join } = require('node:path')
const { chromium } = require('playwright')
const { strFromU8, unzipSync } = createRequire(join(__dirname, '../apps/api/package.json'))(
  'fflate',
)

const ui = process.argv[2] || 'http://localhost:8081'
const api = process.argv[3] || 'http://127.0.0.1:3001'
// biome-ignore lint/suspicious/noUndeclaredEnvVars: This manual browser helper is not a cached Turbo task.
const reportPath = process.env.LILLERI_FINANCIAL_SMOKE_REPORT || '/tmp/lilleri-financial-ui.json'
const report = { checks: [], pageErrors: [], status: 'running' }
const suffix = randomUUID().slice(0, 8)
const check = (name) => {
  report.checks.push(name)
  console.log(`PASS ${name}`)
}
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
const overview = () => request('/v1/demo')
const financial = (data) => ({
  accounts: data.accounts.map(({ id, balance }) => ({ id, balance })),
  transactions: data.transactions.map(({ id, accountId, amount, status, kind, bookedOn }) => ({
    id,
    accountId,
    amount,
    status,
    kind,
    bookedOn,
  })),
  matches: data.analysis.matches.map(({ id, state }) => ({ id, state })),
  summaries: data.analysis.summaries,
})
const money = (data, field, currency = 'EUR') =>
  BigInt(data.analysis.summaries.find((item) => item.currency === currency)[field].amountMinor)
const classification = (data, id) =>
  data.analysis.classifications.find((item) => item.transactionId === id)
const button = (page, name) => page.getByRole('button', { name, exact: true })
async function responseFrom(page, path, method, action, status = 200) {
  const pending = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === path && response.request().method() === method,
  )
  await action()
  const response = await pending
  assert.equal(response.status(), status, `${method} ${path}`)
  return { value: await response.json(), body: response.request().postDataJSON() }
}
async function noOverflow(page, name) {
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
  }))
  assert.ok(dimensions.scroll <= dimensions.width + 1, `${name}: ${JSON.stringify(dimensions)}`)
}
async function load(page) {
  await page.goto(ui)
  await button(page, 'Controlla').waitFor()
}
const ruleCard = (page, name) => page.getByText(name, { exact: true }).locator('..')
const matchCard = (page) =>
  page.getByRole('heading', { name: 'Addebito carta', exact: true }).locator('..').locator('..')

;(async () => {
  validateOrigin(ui)
  validateOrigin(api)
  const initial = await overview()
  assert.equal(initial.mode, 'synthetic')
  assert.deepEqual(initial.analysis.summaries.map((item) => item.currency).sort(), ['EUR', 'GBP'])
  for (const item of [
    ...initial.accounts.map((account) => account.balance),
    ...initial.transactions.map((transaction) => transaction.amount),
  ]) {
    assert.equal(typeof item.amountMinor, 'string')
    assert.match(item.amountMinor, /^-?\d+$/)
  }
  assert.ok(initial.transactions.some((item) => item.merchantKey === 'netflix'))
  assert.ok(initial.analysis.matches.some((item) => item.type === 'card_settlement'))
  const browser = await chromium.launch({
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: This manual browser helper is not a cached Turbo task.
    executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  })
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    })
    context.setDefaultTimeout(20_000)
    context.on('page', (page) =>
      page.on('pageerror', (error) => report.pageErrors.push(error.message)),
    )
    const page = await context.newPage()
    await load(page)
    await noOverflow(page, '390px Home')
    check('Synthetic finance loads with separate EUR/GBP money and no 390px overflow')

    // Both real pages keep the same opaque evidence revision before opposing decisions.
    const originalMatch = initial.analysis.matches.find((item) => item.type === 'card_settlement')
    const matchPath = `/v1/reconciliation/${encodeURIComponent(originalMatch.id)}`
    await request(matchPath, 'PATCH', { state: 'undone', revision: originalMatch.revision })
    await load(page)
    const other = await context.newPage()
    await load(other)
    await page.getByRole('button', { name: /^Da controllare,/ }).click()
    await other.getByRole('button', { name: /^Da controllare,/ }).click()
    const normalized = await overview()
    const sourceAmounts = normalized.transactions.map(({ id, amount }) => ({ id, amount }))
    const first = await responseFrom(page, matchPath, 'PATCH', () =>
      button(matchCard(page), 'Conferma corrispondenza').click(),
    )
    assert.match(first.body.revision, /^[a-f0-9]{64}$/)
    await page.getByText('Corrispondenza confermata. I totali sono stati ricalcolati.').waitFor()
    let staleWrites = 0
    other.on('request', (outbound) => {
      if (new URL(outbound.url()).pathname === matchPath && outbound.method() === 'PATCH')
        staleWrites += 1
    })
    const conflict = await responseFrom(
      other,
      matchPath,
      'PATCH',
      () => button(matchCard(other), 'Rifiuta').click(),
      409,
    )
    assert.equal(conflict.value.code, 'reconciliation_changed')
    await other.getByText(/Questa corrispondenza è cambiata. I dati sono aggiornati/).waitFor()
    assert.equal(staleWrites, 1, 'Conflict must not replay the decision')
    let current = await overview()
    assert.equal(
      current.analysis.matches.find((item) => item.id === originalMatch.id).state,
      'confirmed',
    )
    assert.deepEqual(
      current.transactions.map(({ id, amount }) => ({ id, amount })),
      sourceAmounts,
    )
    check('Two pages: one confirmation wins; stale rejection is 409, refreshes and never replays')

    const currentMatch = current.analysis.matches.find((item) => item.id === originalMatch.id)
    await request(matchPath, 'PATCH', { state: 'undone', revision: currentMatch.revision })
    await other.route('**/v1/demo', (route) => route.abort())
    await responseFrom(
      other,
      matchPath,
      'PATCH',
      () => button(matchCard(other), 'Annulla decisione').click(),
      409,
    )
    await other.getByText(/Quelli precedenti restano visibili/).waitFor()
    assert.equal(staleWrites, 2, 'Failed conflict refresh must not replay the decision')
    await button(matchCard(other), 'Annulla decisione').waitFor()
    await other.unroute('**/v1/demo')
    current = await overview()
    await request(matchPath, 'PATCH', {
      state: originalMatch.state,
      revision: current.analysis.matches.find((item) => item.id === originalMatch.id).revision,
    })
    await other.close()
    await load(page)
    check('A failed conflict refresh preserves visible prior evidence and requires another gesture')

    const beforeRules = await overview()
    const name = `Regola browser ${suffix}`
    await button(page, 'Movimenti').click()
    await button(page, 'Regole').click()
    await button(page, 'Nuova regola').click()
    await page.getByRole('textbox', { name: 'Nome della regola', exact: true }).fill(name)
    await page.getByRole('textbox', { name: 'Esercente esatto', exact: true }).fill('netflix')
    await page.getByRole('textbox', { name: 'Priorità da 0 a 100', exact: true }).fill('90')
    await button(page, 'Acquisti').click()
    const created = await responseFrom(
      page,
      '/v1/rules',
      'POST',
      () => button(page, 'Salva e mostra anteprima').click(),
      201,
    )
    const rule = created.value
    const rulePath = `/v1/rules/${encodeURIComponent(rule.id)}`
    await page.getByRole('heading', { name: `Anteprima: ${name}`, exact: true }).waitFor()
    assert.equal(rule.enabled, false)
    assert.deepEqual(
      (await overview()).analysis.classifications,
      beforeRules.analysis.classifications,
    )
    assert.deepEqual(financial(await overview()), financial(beforeRules))
    check('Rule creation and retroactive preview keep drafts inactive and finance unchanged')

    await responseFrom(page, `${rulePath}/apply`, 'POST', () =>
      button(page, 'Applica questa regola').click(),
    )
    await page
      .getByText('Regola applicata. Puoi disattivarla o annullare l’ultima modifica.')
      .waitFor()
    const afterRule = await overview()
    const netflix = beforeRules.transactions.filter((item) => item.merchantKey === 'netflix')
    assert.ok(netflix.length >= 3)
    for (const transaction of netflix) {
      assert.equal(classification(afterRule, transaction.id).categoryId, 'shopping')
      assert.equal(classification(afterRule, transaction.id).source, 'rule')
    }
    assert.deepEqual(financial(afterRule), financial(beforeRules))
    check(
      'Applying the preview changes matching categories while exact amounts and totals stay fixed',
    )

    await responseFrom(page, `${rulePath}/state`, 'POST', () =>
      button(ruleCard(page, name), 'Disattiva').click(),
    )
    await page.getByText('Regola disattivata. I movimenti conservano i loro importi.').waitFor()
    assert.deepEqual(
      (await overview()).analysis.classifications,
      beforeRules.analysis.classifications,
    )
    await responseFrom(page, `${rulePath}/state`, 'POST', () =>
      button(ruleCard(page, name), 'Annulla ultima modifica').click(),
    )
    await page
      .getByText(
        'Versione precedente ripristinata come bozza. Controlla una nuova anteprima per attivarla.',
      )
      .waitFor()
    let savedRule = (await request('/v1/rules')).find((item) => item.id === rule.id)
    assert.equal(savedRule.enabled, false)
    assert.ok(savedRule.revision > rule.revision)
    check('Rule disable restores classifications; undo restores a draft requiring fresh preview')

    await button(ruleCard(page, name), 'Mostra anteprima').click()
    await page.getByRole('heading', { name: `Anteprima: ${name}`, exact: true }).waitFor()
    await request(rulePath, 'PATCH', {
      revision: savedRule.revision,
      definition: {
        name,
        conditions: { merchantKey: 'netflix' },
        categoryId: 'shopping',
        priority: 89,
      },
    })
    let applications = 0
    page.on('request', (outbound) => {
      if (new URL(outbound.url()).pathname === `${rulePath}/apply` && outbound.method() === 'POST')
        applications += 1
    })
    const staleRule = await responseFrom(
      page,
      `${rulePath}/apply`,
      'POST',
      () => button(page, 'Applica questa regola').click(),
      409,
    )
    assert.equal(staleRule.value.code, 'rule_changed')
    await page.getByText(/La regola o i movimenti sono cambiati. Controlla i dati/).waitFor()
    assert.equal(applications, 1)
    assert.equal(await button(page, 'Applica questa regola').count(), 0)
    savedRule = (await request('/v1/rules')).find((item) => item.id === rule.id)
    assert.equal(savedRule.enabled, false)
    assert.deepEqual(financial(await overview()), financial(beforeRules))
    check(
      'Concurrent rule edit rejects the stale preview and discards it without automatic activation',
    )

    await button(page, '← Torna ai movimenti').click()
    await button(page, 'Conti e movimenti manuali').click()
    await page.getByRole('tab', { name: 'Aggiungi conto', exact: true }).click()
    const accountName = `Contanti browser ${suffix}`
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date())
    await page.getByRole('textbox', { name: 'Nome del conto', exact: true }).fill(accountName)
    await page.getByRole('textbox', { name: 'Saldo iniziale', exact: true }).fill('100,25')
    await page.getByRole('textbox', { name: 'Data del saldo iniziale', exact: true }).fill(today)
    const beforeManual = await overview()
    const createdAccount = await responseFrom(
      page,
      '/v1/manual/accounts',
      'POST',
      () => button(page, 'Crea conto locale').click(),
      201,
    )
    const account = createdAccount.value
    await page
      .getByText('Conto locale aggiunto. Il saldo iniziale non è una nuova entrata.')
      .waitFor()
    current = await overview()
    assert.equal(account.balanceMinor, '10025')
    assert.equal(account.currency, 'EUR')
    assert.equal(money(current, 'balance'), money(beforeManual, 'balance') + 10025n)
    assert.equal(money(current, 'income'), money(beforeManual, 'income'))
    assert.equal(money(current, 'spend'), money(beforeManual, 'spend'))
    assert.equal(current.transactions.length, beforeManual.transactions.length)
    check('Manual opening balance adds exact EUR 100.25 without inventing income or a transaction')

    await page.getByRole('textbox', { name: 'Importo in EUR', exact: true }).fill('2,50')
    await page
      .getByRole('textbox', { name: 'Descrizione facoltativa', exact: true })
      .fill(`Spesa browser ${suffix}`)
    const entry = await responseFrom(
      page,
      '/v1/manual/transactions',
      'POST',
      () => button(page, 'Salva movimento').click(),
      201,
    )
    await page.getByText('Movimento aggiunto e saldo aggiornato.').waitFor()
    assert.equal(entry.value.amountMinor, '-250')
    assert.equal(entry.value.balanceMinor, '9775')
    assert.equal(money(await overview(), 'spend'), money(beforeManual, 'spend') + 250n)
    await responseFrom(
      page,
      `/v1/manual/transactions/${encodeURIComponent(entry.value.transactionId)}/reverse`,
      'POST',
      () => button(page, 'Annulla ultimo inserimento').click(),
    )
    await page
      .getByText(/Inserimento annullato. Il saldo e i totali sono stati aggiornati/)
      .waitFor()
    current = await overview()
    assert.equal(
      current.transactions.find((item) => item.id === entry.value.transactionId).status,
      'reversed',
    )
    assert.equal(money(current, 'spend'), money(beforeManual, 'spend'))
    assert.equal(
      (await request('/v1/manual/accounts')).find((item) => item.id === account.id).balanceMinor,
      '10025',
    )
    check(
      'Manual expense subtracts 250 cents exactly; explicit reversal restores balance/spend and keeps audit',
    )

    await page.getByRole('textbox', { name: 'Importo in EUR', exact: true }).fill('3,20')
    await page
      .getByRole('textbox', { name: 'Descrizione facoltativa', exact: true })
      .fill(`Seconda spesa ${suffix}`)
    await responseFrom(
      page,
      '/v1/manual/transactions',
      'POST',
      () => button(page, 'Salva movimento').click(),
      201,
    )
    await page.getByText('Movimento aggiunto e saldo aggiornato.').waitFor()
    await page.getByRole('tab', { name: 'Correggi il saldo', exact: true }).click()
    const beforeAdjustment = await overview()
    await page.getByRole('textbox', { name: 'Saldo corretto in EUR', exact: true }).fill('120,00')
    await page
      .getByRole('textbox', { name: 'Motivo della correzione', exact: true })
      .fill('Conteggio sintetico verificato')
    const adjustmentPath = `/v1/manual/accounts/${encodeURIComponent(account.id)}/adjust`
    await responseFrom(page, adjustmentPath, 'POST', () =>
      button(page, 'Conferma saldo corretto').click(),
    )
    await page
      .getByText('Saldo corretto. La differenza è nello storico e non conta come entrata o spesa.')
      .waitFor()
    current = await overview()
    assert.equal(money(current, 'income'), money(beforeAdjustment, 'income'))
    assert.equal(money(current, 'spend'), money(beforeAdjustment, 'spend'))
    assert.equal(current.transactions.length, beforeAdjustment.transactions.length)
    assert.equal(
      (await request('/v1/manual/accounts')).find((item) => item.id === account.id).balanceMinor,
      '12000',
    )
    await responseFrom(page, adjustmentPath, 'POST', () =>
      button(page, 'Annulla ultima correzione').click(),
    )
    await page
      .getByText('Correzione annullata. Il saldo è aggiornato e lo storico conserva la modifica.')
      .waitFor()
    const events = await request(`/v1/manual/accounts/${encodeURIComponent(account.id)}/events`)
    assert.equal(events.filter((item) => item.operation === 'adjustment').length, 2)
    assert.equal(
      (await request('/v1/manual/accounts')).find((item) => item.id === account.id).balanceMinor,
      '9705',
    )
    check(
      'Balance adjustment/undo create audit events, preserve transactions and never count as income/spend',
    )

    await page.getByRole('tab', { name: 'Importa CSV', exact: true }).click()
    await page.getByRole('radio', { name: `${accountName} · EUR`, exact: true }).click()
    const csv = `id,date,amount,currency,description,merchant,reference\ncsv-out-${suffix},${today},-1.20,EUR,Spesa CSV sintetica,,\ncsv-in-${suffix},${today},5.00,EUR,Entrata CSV sintetica,,`
    await page.getByRole('textbox', { name: 'Contenuto del CSV', exact: true }).fill(csv)
    const beforeCsv = await overview()
    const preview = await responseFrom(page, '/v1/imports/csv/preview', 'POST', () =>
      button(page, 'Controlla anteprima CSV').click(),
    )
    assert.equal(preview.value.newRows, 2)
    assert.equal(preview.value.newAmountTotalMinor, '380')
    assert.equal(preview.value.manualBalanceWillChange, true)
    assert.deepEqual(financial(await overview()), financial(beforeCsv))
    const imported = await responseFrom(page, '/v1/imports/csv', 'POST', () =>
      button(page, 'Importa righe controllate').click(),
    )
    assert.equal(imported.value.inserted, 2)
    await page
      .getByText('2 nuovi movimenti, 0 già presenti. Nessuna riga è stata modificata.')
      .waitFor()
    const afterCsv = await overview()
    assert.equal(afterCsv.transactions.length, beforeCsv.transactions.length + 2)
    assert.equal(money(afterCsv, 'spend'), money(beforeCsv, 'spend') + 120n)
    assert.equal(money(afterCsv, 'income'), money(beforeCsv, 'income') + 500n)
    assert.equal(
      (await request('/v1/manual/accounts')).find((item) => item.id === account.id).balanceMinor,
      '10085',
    )
    check(
      'CSV preview is read-only; import adds two exact rows and changes manual balance by EUR 3.80',
    )

    await page.getByRole('textbox', { name: 'Contenuto del CSV', exact: true }).fill(csv)
    const replayPreview = await responseFrom(page, '/v1/imports/csv/preview', 'POST', () =>
      button(page, 'Controlla anteprima CSV').click(),
    )
    assert.equal(replayPreview.value.newRows, 0)
    assert.equal(replayPreview.value.unchangedRows, 2)
    const replayImport = await responseFrom(page, '/v1/imports/csv', 'POST', () =>
      button(page, 'Importa righe controllate').click(),
    )
    assert.equal(replayImport.value.inserted, 0)
    assert.equal(replayImport.value.unchanged, 2)
    await page
      .getByText('0 nuovi movimenti, 2 già presenti. Nessuna riga è stata modificata.')
      .waitFor()
    assert.deepEqual(financial(await overview()), financial(afterCsv))
    check('Repeating the same CSV preserves transaction IDs, totals and manual balance')

    await button(page, '← Torna ai movimenti').click()
    await button(page, 'Impostazioni').click()
    await button(page, 'Preferenze').click()
    await page.getByRole('textbox', { name: 'Nome del profilo', exact: true }).waitFor()
    const originalSettings = (await request('/v1/settings')).settings
    const beforeSettings = await overview()
    const settingsPeer = await context.newPage()
    await load(settingsPeer)
    await button(settingsPeer, 'Impostazioni').click()
    await button(settingsPeer, 'Preferenze').click()
    await settingsPeer.getByRole('textbox', { name: 'Nome del profilo', exact: true }).waitFor()
    await page
      .getByRole('textbox', { name: 'Nome del profilo', exact: true })
      .fill(`Profilo UTC ${suffix}`)
    await button(page, 'UTC').click()
    await responseFrom(page, '/v1/settings', 'PATCH', () =>
      button(page, 'Salva impostazioni').click(),
    )
    await page.getByText('Impostazioni salvate.').waitFor()
    let settingWrites = 0
    settingsPeer.on('request', (outbound) => {
      if (new URL(outbound.url()).pathname === '/v1/settings' && outbound.method() === 'PATCH')
        settingWrites += 1
    })
    await settingsPeer
      .getByRole('textbox', { name: 'Nome del profilo', exact: true })
      .fill('Modifica obsoleta')
    await button(settingsPeer, 'Tokyo').click()
    const settingsConflict = await responseFrom(
      settingsPeer,
      '/v1/settings',
      'PATCH',
      () => button(settingsPeer, 'Salva impostazioni').click(),
      409,
    )
    assert.equal(settingsConflict.value.code, 'settings_changed')
    await settingsPeer.getByText(/Le impostazioni sono cambiate. Ho aggiornato i dati/).waitFor()
    assert.equal(settingWrites, 1)
    assert.equal(
      await settingsPeer
        .getByRole('textbox', { name: 'Nome del profilo', exact: true })
        .inputValue(),
      `Profilo UTC ${suffix}`,
    )
    assert.equal((await request('/v1/settings')).settings.timezone, 'UTC')
    check(
      'Settings persist; a second page gets 409, discards its stale form and does not auto-save',
    )

    await settingsPeer
      .getByRole('textbox', { name: 'Nome del profilo', exact: true })
      .fill(`Profilo Tokyo ${suffix}`)
    await button(settingsPeer, 'Tokyo').click()
    await responseFrom(settingsPeer, '/v1/settings', 'PATCH', () =>
      button(settingsPeer, 'Salva impostazioni').click(),
    )
    await settingsPeer.getByText('Impostazioni salvate.').waitFor()
    assert.equal(settingWrites, 2)
    assert.equal((await request('/v1/settings')).settings.timezone, 'Asia/Tokyo')
    assert.deepEqual(financial(await overview()), financial(beforeSettings))
    await settingsPeer
      .getByRole('textbox', { name: 'Nome del profilo', exact: true })
      .fill(originalSettings.displayName)
    const zoneLabels = {
      'Europe/Rome': 'Italia',
      'Europe/London': 'Londra',
      'America/New_York': 'New York',
      'Asia/Tokyo': 'Tokyo',
      UTC: 'UTC',
    }
    assert.ok(
      zoneLabels[originalSettings.timezone],
      'Run with a supported synthetic initial timezone',
    )
    await button(settingsPeer, zoneLabels[originalSettings.timezone]).click()
    await responseFrom(settingsPeer, '/v1/settings', 'PATCH', () =>
      button(settingsPeer, 'Salva impostazioni').click(),
    )
    await settingsPeer.getByText('Impostazioni salvate.').waitFor()
    await settingsPeer.close()
    check(
      'An explicit retry saves the new timezone; booking dates and exact finance remain unchanged',
    )

    await page.setViewportSize({ width: 320, height: 740 })
    await load(page)
    await noOverflow(page, '320px Home')
    await button(page, 'Movimenti').click()
    await button(page, 'Regole').click()
    await button(page, 'Nuova regola').click()
    await noOverflow(page, '320px rule form')
    await button(page, 'Chiudi senza salvare').click()
    await button(page, '← Torna ai movimenti').click()
    await button(page, 'Conti e movimenti manuali').click()
    await page.getByRole('tab', { name: 'Aggiungi conto', exact: true }).click()
    await noOverflow(page, '320px manual account form')
    await page.getByRole('tab', { name: 'Importa CSV', exact: true }).click()
    await noOverflow(page, '320px CSV form')
    await button(page, '← Torna ai movimenti').click()
    await button(page, 'Impostazioni').click()
    await button(page, 'Preferenze').click()
    await page.getByRole('textbox', { name: 'Nome del profilo', exact: true }).waitFor()
    await noOverflow(page, '320px settings')
    check('320px Home, rules, account, CSV and settings wrap without horizontal page overflow')

    await button(page, '← Torna a Impostazioni').click()
    await button(page, 'Privacy e dati').click()
    const beforeArchive = await overview()
    const downloadPending = page.waitForEvent('download')
    const archiveResponsePending = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/v1/export/archive' &&
        response.request().method() === 'POST',
    )
    await button(page, 'Scarica archivio ZIP').click()
    const archiveResponse = await archiveResponsePending
    assert.equal(archiveResponse.status(), 200)
    assert.equal(archiveResponse.headers()['content-type'], 'application/zip')
    assert.match(
      archiveResponse.headers()['content-disposition'],
      /^attachment; filename=".+\.zip"$/,
    )
    const download = await downloadPending
    assert.equal(download.suggestedFilename(), 'lilleri-dati-dimostrativi.zip')
    const downloadedBytes = await readFile(await download.path())
    assert.equal(downloadedBytes.subarray(0, 2).toString(), 'PK')
    const files = unzipSync(downloadedBytes)
    assert.deepEqual(Object.keys(files).sort(), [
      'README.txt',
      'accounts.json',
      'categories.json',
      'consents.json',
      'data.json',
      'events.jsonl',
      'links.csv',
      'manifest.json',
      'rules.json',
      'schema.json',
      'transactions.csv',
    ])
    const manifest = JSON.parse(strFromU8(files['manifest.json']))
    const archiveData = JSON.parse(strFromU8(files['data.json']))
    const archiveSchema = JSON.parse(strFromU8(files['schema.json']))
    assert.equal(manifest.archiveVersion, 1)
    assert.equal(manifest.scope, 'profile')
    assert.equal(manifest.profileId, beforeArchive.profile.id)
    assert.equal(manifest.sourceMode, 'synthetic')
    assert.equal(manifest.delivery, 'local_download')
    assert.equal(manifest.moneyEncoding, 'decimal_string_integer_minor_units')
    assert.deepEqual(manifest.currencies, ['EUR', 'GBP'])
    assert.equal(manifest.counts.accounts, beforeArchive.accounts.length)
    assert.equal(manifest.counts.transactions, beforeArchive.transactions.length)
    assert.equal(manifest.files.length, 10)
    for (const entry of manifest.files) {
      assert.equal(files[entry.path].byteLength, entry.bytes)
      assert.equal(createHash('sha256').update(files[entry.path]).digest('hex'), entry.sha256)
    }
    assert.equal(archiveSchema.$schema, 'https://json-schema.org/draft/2020-12/schema')
    assert.equal(archiveSchema.$defs.money.properties.amountMinor.type, 'string')
    assert.equal(archiveData.exportVersion, 1)
    assert.deepEqual(financial(archiveData), financial(beforeArchive))
    for (const transaction of archiveData.transactions) {
      assert.equal(typeof transaction.amount.amountMinor, 'string')
      assert.match(transaction.amount.amountMinor, /^-?\d+$/)
      assert.equal(transaction.profileId, beforeArchive.profile.id)
    }
    const csvRows = strFromU8(files['transactions.csv'])
    assert.match(csvRows, /,-120,EUR,/)
    assert.match(csvRows, /,500,EUR,/)
    const exportedEvents = strFromU8(files['events.jsonl']).trim().split('\n').map(JSON.parse)
    assert.equal(exportedEvents.length, manifest.counts.events)
    assert.ok(exportedEvents.some((event) => event.type === 'manual_balance'))
    const specification = await request('/openapi.json')
    assert.deepEqual(
      specification.paths['/v1/export/archive'].get.responses['200'].content['application/zip']
        .schema,
      { type: 'string', format: 'binary' },
    )
    await page
      .getByText('Archivio pronto. Il download contiene CSV, JSON, eventi e schema dei dati.')
      .waitFor()
    await noOverflow(page, '320px ZIP download')
    assert.deepEqual(financial(await overview()), financial(beforeArchive))
    check(
      'Actual ZIP browser download contains 11 files, verified digests/schema/exact money and ZIP HTTP/OpenAPI media type',
    )
    assert.deepEqual(report.pageErrors, [])
    check('No unhandled browser JavaScript errors in the exercised financial flows')
    report.status = 'passed'
  } catch (error) {
    report.status = 'failed'
    report.error = error.stack
    console.error(error)
    process.exitCode = 1
  } finally {
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
    await browser.close()
  }
})().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
