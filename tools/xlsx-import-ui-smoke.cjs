/** Actual XLSX picker/mapping/preview/receipt/export checks. Synthetic loopback archive only; one writer. */
const assert = require('node:assert/strict')
const { assertFinancialUnchanged } = require('./demo-financial-invariant.cjs')
const { randomUUID } = require('node:crypto')
const { writeFile } = require('node:fs/promises')
const { chromium } = require('playwright')
const { zipSync, strToU8, unzipSync, strFromU8 } = require('../apps/api/node_modules/fflate')
const ui = process.argv[2] || 'http://localhost:8082'
const api = process.argv[3] || 'http://127.0.0.1:3004'
// biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual smoke artifact path is not a cached Turbo input.
const reportPath = process.env.LILLERI_XLSX_SMOKE_REPORT || '/tmp/lilleri-xlsx-import-ui.json'
const report = { status: 'running', checks: [], pageErrors: [] }
const check = (name) => {
  report.checks.push(name)
  console.log(`PASS ${name}`)
}
const button = (page, name) => page.getByRole('button', { name, exact: true })
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
async function responseFrom(page, path, action, expected = 200) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (value) => new URL(value.url()).pathname === path && value.request().method() === 'POST',
    ),
    Promise.resolve().then(action),
  ])
  assert.equal(response.status(), expected, path)
  return response.json()
}
const escapeXml = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
function workbook(description) {
  const string = (ref, text) => `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(text)}</t></is></c>`
  const row = (number, amount, description) =>
    `<row r="${number}">${string(`A${number}`, '03/10/2026')}${string(`B${number}`, '04/10/2026')}${string(`C${number}`, description)}<c r="D${number}"><v>${amount}</v></c></row>`
  const sheet = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">${string('A1', 'Titolo sintetico')}</row><row r="2">${string('A2', 'Nota sintetica')}</row><row r="3">${['Data', 'Valuta', 'Descrizione', 'Importo'].map((text, index) => string(`${String.fromCharCode(65 + index)}3`, text)).join('')}</row>${row(4, '-1234.56', description)}<row r="5"/>${row(6, '-2.50', `${description}\nseconda riga`)}</sheetData></worksheet>`
  const files = {
    '[Content_Types].xml':
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/></Types>',
    '_rels/.rels':
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="root" Target="xl/workbook.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"/></Relationships>',
    'xl/workbook.xml':
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Movimenti" sheetId="1" r:id="first"/><sheet name="Archivio" sheetId="2" r:id="second"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="first" Target="worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/><Relationship Id="second" Target="worksheets/sheet2.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/></Relationships>',
    'xl/worksheets/sheet1.xml': sheet,
    'xl/worksheets/sheet2.xml': sheet,
  }
  return Buffer.from(
    zipSync(Object.fromEntries(Object.entries(files).map(([name, xml]) => [name, strToU8(xml)]))),
  )
}
async function chooseFile(page, buffer) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    button(page, 'Scegli file Excel XLSX').click(),
  ])
  await chooser.setFiles({
    name: 'estratto-sintetico.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  })
  await page.getByText('File selezionato: estratto-sintetico.xlsx', { exact: true }).waitFor()
}
async function selectSheet(page, sheet, header = '3') {
  const discovery = await responseFrom(page, '/v1/imports/mapped/workbook', () =>
    button(page, 'Leggi fogli Excel').click(),
  )
  assert.deepEqual(discovery.errors, [])
  assert.equal(discovery.selectedSheet, null)
  assert.equal(await button(page, 'Leggi intestazioni Excel').isDisabled(), true)
  const choice = page.getByRole('radio', { name: `Foglio Excel: ${sheet}`, exact: true })
  assert.equal(await choice.getAttribute('aria-checked'), 'false')
  await choice.click()
  assert.equal(await choice.getAttribute('aria-checked'), 'true')
  await page
    .getByRole('textbox', { name: 'Riga delle intestazioni Excel', exact: true })
    .fill(header)
  const layout = await responseFrom(page, '/v1/imports/mapped/workbook', () =>
    button(page, 'Leggi intestazioni Excel').click(),
  )
  assert.deepEqual(layout.errors, [])
  return layout
}
async function column(page, label, header) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.getByRole('button', { name: new RegExp(`^${escaped}:`) }).click()
  await page.getByRole('radio', { name: `${label}: ${header}`, exact: true }).click()
}
const preview = (page) =>
  responseFrom(page, '/v1/imports/mapped/preview', () =>
    button(page, 'Mostra anteprima importazione').click(),
  )
;(async () => {
  for (const origin of [ui, api]) {
    const url = new URL(origin)
    assert.ok(
      url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
        url.origin === origin,
    )
  }
  assert.equal((await request('/v1/demo')).mode, 'synthetic')
  const suffix = randomUUID().slice(0, 8),
    name = `Excel sintetico ${suffix}`,
    account = await request(
      '/v1/manual/accounts',
      'POST',
      {
        requestId: randomUUID(),
        name,
        kind: 'cash',
        currency: 'EUR',
        openingBalanceMinor: '200000',
        openingOn: '2026-10-03',
      },
      201,
    ),
    initial = await request('/v1/demo'),
    bytes = workbook(`Spesa Excel ${suffix}`)
  const browser = await chromium.launch({
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Optional manual browser executable.
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
    const page = await context.newPage()
    page.on('pageerror', (error) => report.pageErrors.push(error.message))
    await page.goto(ui)
    await button(page, 'Movimenti').click()
    await button(page, 'Importa file').click()
    await page.getByRole('heading', { name: 'Importa movimenti da file', exact: true }).waitFor()
    await page
      .getByRole('radio', { name: `Conto per importazione: ${name}, EUR`, exact: true })
      .click()
    await page.getByRole('radio', { name: 'Formato del file: Excel XLSX', exact: true }).click()
    await chooseFile(page, bytes)
    const layout = await selectSheet(page, 'Movimenti')
    assert.deepEqual(layout.header, ['Data', 'Valuta', 'Descrizione', 'Importo'])
    assert.equal(layout.rowCount, 2)
    check(
      'Actual Excel picker requires explicit sheet/header and reads two data rows across a physical blank row',
    )
    await column(page, 'Data di contabilizzazione', 'Data')
    await column(page, 'Descrizione', 'Descrizione')
    await column(page, 'Importo con segno', 'Importo')
    await column(page, 'Data valuta', 'Valuta')
    const first = await preview(page)
    assert.deepEqual(first.errors, [])
    assert.deepEqual(
      first.rows.map((row) => row.rowNumber),
      [4, 6],
    )
    assert.equal(first.rows[0].record.amount, '-1234.56')
    assert.equal(first.rows[0].provenance.rawFields.amount, '-1234.56')
    assert.equal(first.rows[0].provenance.valueOn, '2026-10-04')
    assert.equal(first.workbook.headerRow, 3)
    assert.equal(first.workbook.sheet, 'Movimenti')
    assertFinancialUnchanged(initial, await request('/v1/demo'), report, true)
    check(
      'Reviewed Italian mapping preserves exact numeric XML tokens, booking/value dates and original worksheet coordinates without writes',
    )
    await page.getByRole('radio', { name: 'Foglio Excel: Archivio', exact: true }).click()
    assert.equal(
      await page.getByRole('heading', { name: '3. Controlla l’anteprima', exact: true }).count(),
      0,
    )
    await responseFrom(page, '/v1/imports/mapped/workbook', () =>
      button(page, 'Leggi intestazioni Excel').click(),
    )
    const other = await preview(page)
    assert.notEqual(other.rows[0].record.id, first.rows[0].record.id)
    await page.getByRole('radio', { name: 'Foglio Excel: Movimenti', exact: true }).click()
    await responseFrom(page, '/v1/imports/mapped/workbook', () =>
      button(page, 'Leggi intestazioni Excel').click(),
    )
    assert.equal((await preview(page)).rows[0].record.id, first.rows[0].record.id)
    check(
      'Changing worksheet invalidates the accepted preview and distinct sheets retain stable separate identities',
    )
    const path = '/v1/imports/mapped/commit',
      bodies = []
    page.on('request', (value) => {
      if (new URL(value.url()).pathname === path && value.method() === 'POST')
        bodies.push(value.postDataJSON())
    })
    await page.route(
      `${api}${path}`,
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
        await page.unroute(`${api}${path}`)
      },
      { times: 1 },
    )
    await responseFrom(page, path, () => button(page, 'Importa righe dell’anteprima').click(), 503)
    await page.getByRole('alert').waitFor()
    await page.getByText('File selezionato: estratto-sintetico.xlsx', { exact: true }).waitFor()
    const accepted = await responseFrom(page, path, () =>
      button(page, 'Importa righe dell’anteprima').click(),
    )
    assert.equal(accepted.inserted, 2)
    assert.equal(bodies.length, 2)
    assert.equal(bodies[0].requestId, bodies[1].requestId)
    assert.equal(
      (await request('/v1/manual/accounts')).find((row) => row.id === account.id).balanceMinor,
      '76294',
    )
    await page
      .getByText('2 nuovi movimenti, 0 aggiornati, 0 già presenti.', { exact: false })
      .waitFor()
    assert.equal(
      await page.getByText('File selezionato: estratto-sintetico.xlsx', { exact: true }).count(),
      0,
    )
    check(
      'Lost success reply preserves workbook and command identity; explicit retry applies exact balance once then clears file state',
    )
    const after = await request('/v1/demo')
    await chooseFile(page, bytes)
    await selectSheet(page, 'Movimenti')
    const repeatedPreview = await preview(page)
    assert.equal(repeatedPreview.rows[0].record.id, first.rows[0].record.id)
    const repeated = await responseFrom(page, path, () =>
      button(page, 'Importa righe dell’anteprima').click(),
    )
    assert.equal(repeated.unchanged, 2)
    assertFinancialUnchanged(after, await request('/v1/demo'), report, true)
    check('Rereading and reimporting the original XLSX adds no transactions or balance changes')
    const json = await request('/v1/export'),
      origins = json.mappedImports.provenance.filter((row) => row.accountId === account.id)
    assert.deepEqual(origins.map((row) => row.rowNumber).sort(), [4, 6])
    for (const row of origins) {
      assert.equal(row.fileFormat, 'xlsx')
      assert.equal(row.workbookDigest, first.workbook.workbookDigest)
      assert.equal(row.worksheet, 'Movimenti')
      assert.equal(row.headerRow, 3)
    }
    assert.ok(!JSON.stringify(json).includes(bytes.toString('base64')))
    const response = await fetch(`${api}/v1/export/archive`)
    assert.equal(response.status, 200)
    const data = unzipSync(new Uint8Array(await response.arrayBuffer()))['data.json']
    assert.ok(data)
    assert.deepEqual(
      JSON.parse(strFromU8(data)).mappedImports.provenance.filter(
        (row) => row.accountId === account.id,
      ),
      origins,
    )
    check(
      'Actual JSON and ZIP exports retain owned permanent workbook origin without original file bytes',
    )
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 })
      const size = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }))
      assert.ok(size.width <= size.viewport + 1)
    }
    for (const element of await page.getByRole('radio').all()) {
      const box = await element.boundingBox()
      if (box) assert.ok(box.height >= 44 && box.width >= 44)
    }
    assert.deepEqual(report.pageErrors, [])
    check('XLSX intake reflows at 320/390 px with 44 px choices and no JavaScript errors')
    report.status = 'passed'
  } finally {
    await browser.close()
  }
})()
  .catch((error) => {
    report.status = 'failed'
    report.error = error.message
    process.exitCode = 1
  })
  .finally(async () => {
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
    console.log(reportPath)
  })
