/** Actual App + Chromium IndexedDB, synthetic demo only; source DELETE is intercepted locally. */
const assert = require('node:assert/strict')
const { writeFile } = require('node:fs/promises')
const { chromium } = require('playwright')
const { assertFinancialUnchanged } = require('./demo-financial-invariant.cjs')
const ui = process.argv[2] || 'http://localhost:8082'
const api = process.argv[3] || 'http://127.0.0.1:3004'
const reportPath =
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual browser evidence destination.
  process.env.LILLERI_OFFLINE_UI_REPORT || '/tmp/lilleri-offline-ui.json'
const report = {
  status: 'running',
  checks: [],
  pageErrors: [],
  browserWrites: [],
  interceptedEraseRequests: [],
  clock: 'Chromium virtual clock for expiry only',
}
async function get(path) {
  const result = await fetch(`${api}${path}`, { signal: AbortSignal.timeout(20_000) })
  assert.equal(result.status, 200)
  return result.json()
}
async function main() {
  for (const origin of [ui, api]) {
    const url = new URL(origin)
    assert.equal(origin, url.origin)
    assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
  }
  const before = await get('/v1/demo')
  assert.equal(before.mode, 'synthetic')
  const settings = (await get('/v1/settings')).settings
  let english = settings.locale === 'en-GB'
  const text = (it, en) => (english ? en : it)
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  let outage = null
  let interceptSourceErase = false
  let eraseClearedBeforeResponse = false
  await context.route('**/v1/**', async (route) => {
    const request = route.request()
    if (
      interceptSourceErase &&
      request.method() === 'DELETE' &&
      /^\/v1\/connections\/[^/]+$/.test(new URL(request.url()).pathname)
    ) {
      interceptSourceErase = false
      report.interceptedEraseRequests.push({ method: 'DELETE', data: 'erase', forwarded: false })
      try {
        assert.deepEqual(request.postDataJSON(), { data: 'erase' })
        await waitEmpty()
        eraseClearedBeforeResponse = true
        await route.fulfill({
          status: 500,
          contentType: 'application/problem+json',
          body: JSON.stringify({
            code: 'source_erasure_not_ready',
            detail: 'RAW_PRIVATE_ERASURE_ERROR_MUST_NOT_RENDER',
          }),
        })
      } catch (error) {
        report.interceptionFailure = error.message
        await route.abort('failed')
      }
      return
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      report.browserWrites.push(request.method())
      await route.abort('blockedbyclient')
    } else if (outage && new URL(request.url()).pathname === '/v1/demo') {
      if (outage === 'network') {
        await route.abort('failed')
        return
      }
      await route.fulfill({
        status: outage,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          code: 'request_failed',
          detail: 'RAW_PRIVATE_ERROR_MUST_NOT_RENDER',
        }),
      })
    } else await route.continue()
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => report.pageErrors.push(error.name))
  await page.clock.install({ time: Date.now() })
  const pass = (name) => report.checks.push(name)
  const button = (name) => page.getByRole('button', { name, exact: true })
  const saved = () =>
    page.getByRole('status').filter({
      hasText: text(
        'Consultazione temporanea senza connessione',
        'Temporary view without a connection',
      ),
    })
  const record = () =>
    page.evaluate(async () => {
      const databases = await indexedDB.databases()
      if (!databases.some((db) => db.name === 'lilleri-encrypted-read-cache-v1')) return null
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('lilleri-encrypted-read-cache-v1', 1)
        request.onerror = () => reject(new Error('IndexedDB inspection failed'))
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction('ciphertext', 'readonly')
          const read = transaction.objectStore('ciphertext').get('current')
          read.onerror = () => reject(new Error('Cache record inspection failed'))
          read.onsuccess = () => {
            const value = read.result
            resolve(
              value
                ? {
                    keys: Object.keys(value).sort(),
                    ciphertextBytes: value.ciphertext?.byteLength,
                    ivBytes: value.iv?.byteLength,
                    plaintextBytes: value.plaintextBytes,
                    metadata: JSON.stringify(value),
                  }
                : null,
            )
            db.close()
          }
        }
      })
    })
  const waitRecord = async () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await record()) return
      await page.waitForTimeout(100)
    }
    throw new Error('App did not persist its verified encrypted snapshot')
  }
  const waitEmpty = async () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if ((await record()) === null) return
      await page.waitForTimeout(100)
    }
    throw new Error('Discarded ciphertext was not removed')
  }
  const retryOnline = async () => {
    // Clearing an unverified identity restores the real Italian fallback.
    await page.getByRole('button', { name: /^(Riprova|Try again)$/, exact: true }).click()
    await waitRecord()
    await page.waitForFunction(
      (expected) => document.documentElement.lang === expected,
      settings.locale,
    )
    english = settings.locale === 'en-GB'
  }
  try {
    await page.goto(ui, { waitUntil: 'domcontentloaded' })
    await button(text('Aggiorna', 'Refresh')).waitFor()
    await page.waitForFunction(
      (expected) => document.documentElement.lang === expected,
      settings.locale,
    )
    await waitRecord()
    const stored = await record()
    assert.ok(stored)
    assert.equal(stored.ivBytes, 12)
    assert.equal(stored.ciphertextBytes, stored.plaintextBytes + 16)
    assert.deepEqual(stored.keys, [
      'authorizationId',
      'ciphertext',
      'contextHash',
      'expiresAt',
      'iv',
      'plaintextBytes',
      'savedAt',
      'sequence',
      'version',
    ])
    assert.equal(stored.metadata.includes(before.profile.id), false)
    assert.equal(
      stored.metadata.includes(before.transactions[0]?.description || 'SYNTHETIC_NOT_PRESENT'),
      false,
    )
    pass(
      'current verified App overview persists one encrypted record without financial/profile plaintext',
    )
    await context.setOffline(true)
    await saved().waitFor()
    await button(text('Movimenti', 'Transactions')).click()
    const open = page
      .getByRole('button', { name: new RegExp(`^${text('Apri ', 'Open ')}`) })
      .first()
    await open.waitFor()
    await open.click()
    const save = button(text('Salva categoria', 'Save category'))
    assert.equal(await save.getAttribute('aria-disabled'), 'true')
    const radio = page.getByRole('radio').first()
    assert.equal(await radio.getAttribute('aria-disabled'), 'true')
    await save.dispatchEvent('click')
    assert.deepEqual(report.browserWrites, [])
    pass(
      'actual offline event preserves transaction detail and disables category/scope financial actions',
    )
    await button(text('Impostazioni', 'Settings')).click()
    await page
      .getByText(
        text('Questa pagina richiede una connessione.', 'This page requires a connection.'),
        { exact: false },
      )
      .waitFor()
    assert.equal(await button(text('Esporta i dati', 'Export data')).count(), 0)
    assert.equal(await page.getByRole('checkbox').count(), 0)
    pass('offline Settings hides active export, delete, preferences and permission controls')
    await page.clock.fastForward(5 * 60_000 + 1000)
    await page
      .getByText(
        text(
          'La vista temporanea non è più disponibile.',
          'The temporary view is no longer available.',
        ),
        { exact: false },
      )
      .waitFor()
    assert.equal(await saved().count(), 0)
    await waitEmpty()
    assert.equal(
      await page.getByRole('button', { name: new RegExp(`^${text('Apri ', 'Open ')}`) }).count(),
      0,
    )
    pass(
      'real cache timer with virtual browser time clears expired financial display and stored ciphertext',
    )
    await context.setOffline(false)
    await button('Home').click()
    await waitRecord()
    await button(text('Movimenti', 'Transactions')).click()
    await page
      .getByRole('button', { name: new RegExp(`^${text('Apri ', 'Open ')}`) })
      .first()
      .click()
    assert.notEqual(
      await button(text('Salva categoria', 'Save category')).getAttribute('aria-disabled'),
      'true',
    )
    pass(
      'online revalidation restores current view and action availability without replaying a write',
    )
    await button(text('Impostazioni', 'Settings')).click()
    await button(text('Collegamenti e fonti', 'Connections and sources')).click()
    await button(text('Scollega e scegli i dati', 'Disconnect and choose what happens to data'))
      .first()
      .click()
    await page
      .getByRole('radio', {
        name: text('Elimina i dati della fonte', 'Erase this source’s data'),
        exact: true,
      })
      .click()
    const erase = button(text('Scollega ed elimina i dati', 'Disconnect and erase data'))
    assert.equal(await erase.getAttribute('aria-disabled'), 'true')
    await page
      .getByRole('checkbox', {
        name: text(
          'Confermo di voler eliminare i dati salvati di questa fonte.',
          'I confirm that I want to erase this source’s saved data.',
        ),
        exact: true,
      })
      .click()
    interceptSourceErase = true
    await erase.click()
    await page.getByRole('alert').first().waitFor()
    assert.equal(report.interceptionFailure, undefined)
    assert.equal(eraseClearedBeforeResponse, true)
    assert.deepEqual(report.interceptedEraseRequests, [
      { method: 'DELETE', data: 'erase', forwarded: false },
    ])
    assert.equal(
      await page.getByText('RAW_PRIVATE_ERASURE_ERROR_MUST_NOT_RENDER', { exact: false }).count(),
      0,
    )
    outage = 'network'
    await button(text('Aggiorna', 'Refresh')).click()
    await page.getByRole('alert').waitFor()
    assert.equal(await saved().count(), 0)
    await waitEmpty()
    assert.equal(
      await page.getByRole('button', { name: new RegExp(`^${text('Apri ', 'Open ')}`) }).count(),
      0,
    )
    outage = null
    await retryOnline()
    pass(
      'actual source erase choice drops ciphertext before intercepted failure and cannot restore it after network loss; no DELETE reaches server',
    )
    outage = 'network'
    await button(text('Aggiorna', 'Refresh')).click()
    await saved().waitFor()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('alert').waitFor()
    // A new page without a verified profile uses the real fallback locale.
    english = (await page.evaluate(() => document.documentElement.lang)) === 'en-GB'
    assert.equal(await saved().count(), 0)
    await waitEmpty()
    assert.equal(
      await page.getByRole('button', { name: new RegExp(`^${text('Apri ', 'Open ')}`) }).count(),
      0,
    )
    pass('reload during API outage cannot recover the volatile key or display yesterday’s view')
    outage = null
    await retryOnline()
    outage = 500
    await button(text('Aggiorna', 'Refresh')).click()
    await page.getByRole('alert').waitFor()
    assert.equal(await saved().count(), 0)
    await waitEmpty()
    assert.equal(
      await page.getByRole('button', { name: new RegExp(`^${text('Apri ', 'Open ')}`) }).count(),
      0,
    )
    assert.equal(
      await page.getByText('RAW_PRIVATE_ERROR_MUST_NOT_RENDER', { exact: false }).count(),
      0,
    )
    pass('structured HTTP500 does not restore a prior saved financial view')
    outage = null
    await retryOnline()
    outage = 'network'
    await button(text('Aggiorna', 'Refresh')).click()
    await saved().waitFor()
    outage = 401
    await button(text('Aggiorna', 'Refresh')).click()
    await page.getByRole('alert').waitFor()
    assert.equal(await saved().count(), 0)
    await waitEmpty()
    assert.equal(
      await page.getByRole('button', { name: new RegExp(`^${text('Apri ', 'Open ')}`) }).count(),
      0,
    )
    assert.equal(
      await page.getByText('RAW_PRIVATE_ERROR_MUST_NOT_RENDER', { exact: false }).count(),
      0,
    )
    pass(
      'HTTP401 invalidates even the existing demo read lease and clears displayed financial data',
    )
    assert.deepEqual(report.browserWrites, [])
    assert.deepEqual(report.pageErrors, [])
    assertFinancialUnchanged(before, await get('/v1/demo'), report, true)
    pass(
      'no forwarded financial writes, uncaught errors or changed financial facts; bounded mock freshness allowed',
    )
    report.status = 'passed'
  } finally {
    await context.setOffline(false)
    await browser.close()
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  }
}
main()
  .then(() =>
    console.log(
      JSON.stringify({ status: report.status, checks: report.checks.length, reportPath }),
    ),
  )
  .catch(async (error) => {
    report.status = 'failed'
    report.failure = error.message
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
    console.error(error)
    process.exitCode = 1
  })
