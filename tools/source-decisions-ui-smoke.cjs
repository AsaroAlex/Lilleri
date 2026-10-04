/** Browser transport/conflict proof; financial writes are intercepted, never sent to the archive. */
const assert = require('node:assert/strict')
const { writeFile } = require('node:fs/promises')
const { chromium } = require('/opt/codex/runtimes/cua/lib/node_modules/playwright-core')
const origin = process.argv[2]
if (
  !origin ||
  !/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin) ||
  !process.argv.includes('--isolated')
)
  throw new Error('Use a fresh isolated loopback synthetic preview and --isolated')
const report = {
  scope: 'isolated synthetic UI with intercepted decision transport',
  checks: [],
  errors: [],
}
const check = (name) => {
  report.checks.push(name)
  console.log(`PASS ${name}`)
}
async function main() {
  const health = await (await fetch(`${origin}/api/health`)).json()
  assert.equal(health.mode, 'synthetic')
  const data = await (await fetch(`${origin}/api/v1/demo`)).json()
  const records = data.transactions.filter((row) => row.status === 'booked')
  assert.ok(records.length >= 3)
  let removal = {
    transactionId: records[0].id,
    revision: 1,
    transactionRevision: records[0].revision,
    presenceDigest: 'a'.repeat(64),
    choice: null,
    needsDecision: true,
  }
  let pending = {
    transactionId: records[1].id,
    revision: 1,
    digest: 'c'.repeat(64),
    state: 'amount_change_review',
    firstSeenAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-04T10:00:00Z',
    replacementTransactionId: records[2].id,
    replacementRevision: records[2].revision,
    pendingAmountMinor: '-1000',
    replacementAmountMinor: '-1250',
    currency: 'EUR',
    carried: [],
  }
  const removalWrites = [],
    pendingWrites = []
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    page.on('pageerror', (error) => report.errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') report.errors.push(message.text())
    })
    const json = (route, body, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    await page.route(`${origin}/api/v1/reconciliation/source-removals`, (route) =>
      json(route, [removal]),
    )
    await page.route(`${origin}/api/v1/reconciliation/pending`, (route) => json(route, [pending]))
    await page.route(`${origin}/api/v1/reconciliation/source-removals/decision`, (route) => {
      const body = route.request().postDataJSON()
      removalWrites.push(body)
      if (removalWrites.length === 1) {
        removal = { ...removal, revision: 2, presenceDigest: 'b'.repeat(64) }
        return json(route, { code: 'decision_stale', detail: 'Fresh source proof required' }, 409)
      }
      assert.equal(body.revision, removal.revision)
      assert.equal(body.presenceDigest, removal.presenceDigest)
      removal = {
        ...removal,
        revision: removal.revision + 1,
        choice: body.choice === 'undo' ? 'undone' : body.choice,
        needsDecision: body.choice === 'undo',
      }
      return json(route, removal)
    })
    await page.route(`${origin}/api/v1/reconciliation/pending/decision`, (route) => {
      const body = route.request().postDataJSON()
      pendingWrites.push(body)
      assert.equal(body.revision, pending.revision)
      assert.equal(body.expectedDigest, pending.digest)
      assert.equal(body.replacementRevision, pending.replacementRevision)
      pending = {
        ...pending,
        revision: pending.revision + 1,
        digest: String(pending.revision).repeat(64),
        state: body.action === 'accept' ? 'replaced' : 'amount_change_review',
        carried: body.action === 'accept' ? ['category'] : [],
      }
      return json(route, pending)
    })
    await page.goto(origin)
    await page.getByRole('heading', { name: 'Panoramica', exact: true }).waitFor()
    await page
      .getByRole('button', { name: /^Da controllare/ })
      .first()
      .click()
    await page.getByRole('heading', { name: 'Aggiornamenti dalla banca', exact: true }).waitFor()
    const card = page
      .getByText('La fonte non restituisce più questo movimento', { exact: true })
      .locator('..')
    await card.getByRole('button', { name: 'Escludi dai conteggi', exact: true }).click()
    await card.getByRole('button', { name: 'Conferma esclusione', exact: true }).waitFor()
    assert.equal(removalWrites.length, 0)
    await card.getByRole('button', { name: 'Annulla', exact: true }).click()
    assert.equal(removalWrites.length, 0)
    check('Exclusion requires a second explicit gesture; cancel sends no write')
    await card.getByRole('button', { name: 'Conserva come manuale', exact: true }).click()
    await page
      .getByText(
        'La fonte è cambiata. L’elenco è stato aggiornato: controlla di nuovo e ripeti la scelta.',
        { exact: true },
      )
      .waitFor()
    assert.equal(removalWrites.length, 1)
    assert.equal(removalWrites[0].presenceDigest, 'a'.repeat(64))
    check('409 refreshes proofs and never replays the write')
    await card.getByRole('button', { name: 'Conserva come manuale', exact: true }).click()
    await card.getByText('Conservato nei conteggi come manuale', { exact: true }).waitFor()
    assert.equal(removalWrites.length, 2)
    await card.getByRole('button', { name: 'Annulla modifica', exact: true }).click()
    await card.getByRole('button', { name: 'Conserva come manuale', exact: true }).waitFor()
    assert.equal(removalWrites[2].choice, 'undo')
    check('Keep as manual and undo use fresh revisioned source evidence')
    await page.getByRole('button', { name: 'Conferma sostituzione', exact: true }).click()
    await page
      .getByText('Le correzioni compatibili sono state conservate.', { exact: true })
      .waitFor()
    await page.getByRole('button', { name: 'Annulla modifica', exact: true }).first().click()
    await page.getByRole('button', { name: 'Conferma sostituzione', exact: true }).waitFor()
    assert.deepEqual(
      pendingWrites.map((row) => row.action),
      ['accept', 'undo'],
    )
    check('Changed pending amount can be accepted and undone with no silent currency conversion')
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 })
      const dimensions = await page.evaluate(() => [
        innerWidth,
        document.documentElement.scrollWidth,
      ])
      assert.ok(dimensions[1] <= dimensions[0] + 1)
    }
    assert.deepEqual(report.errors, [])
    check('320/390/1280px review controls render without overflow or browser errors')
    report.status = 'passed'
  } finally {
    await browser.close()
  }
}
main()
  .catch((error) => {
    report.status = 'failed'
    report.failure = error.message
    process.exitCode = 1
  })
  .finally(() =>
    writeFile(
      '/workspace/.lilleri-validation/source-decisions-ui.json',
      `${JSON.stringify(report, null, 2)}\n`,
    ),
  )
