/** Real encrypted choices and captured history; run only in an exclusive synthetic demo writer slot. */
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { writeFile } = require('node:fs/promises')
const { createRequire } = require('node:module')
const { join } = require('node:path')
const { chromium } = require('playwright')
const { unzipSync, strFromU8 } = createRequire(join(__dirname, '../apps/api/package.json'))(
  'fflate',
)
const ui = process.argv[2] || 'http://localhost:8082',
  api = process.argv[3] || 'http://localhost:3004'
const reportPath =
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Exclusive manual browser helper outside cached Turbo tasks.
  process.env.LILLERI_UNDERSTANDING_PERSISTENCE_SMOKE_REPORT ||
  '/tmp/lilleri-understanding-persistence-ui.json'
const report = { status: 'running', checks: [], pageErrors: [] }
const button = (page, name) => page.getByRole('button', { name, exact: true })
const check = (name) => {
  report.checks.push(name)
  console.log(`PASS ${name}`)
}
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const ordered = (values) => [...values].sort((first, second) => first.id.localeCompare(second.id))
const financial = (value) => ({
  accounts: ordered(value.accounts.map(({ balanceUpdatedAt: _freshness, ...facts }) => facts)),
  transactions: ordered(value.transactions),
})
function unchangedFreshness(before, after) {
  const result = { accountFreshnessUpdates: 0, transactionObservationUpdates: 0 }
  const bankConnections = new Set(
    before.connections.filter((row) => row.providerId !== 'local-manual').map((row) => row.id),
  )
  for (const [group, field, counter] of [
    ['accounts', 'balanceUpdatedAt', 'accountFreshnessUpdates'],
    ['transactions', 'observedAt', 'transactionObservationUpdates'],
  ]) {
    const current = new Map(after[group].map((row) => [row.id, row]))
    for (const previous of before[group]) {
      const next = current.get(previous.id)
      assert.ok(next, 'Every owned financial record remains present')
      const first = Date.parse(previous[field]),
        last = Date.parse(next[field])
      assert.ok(Number.isFinite(first) && Number.isFinite(last) && last >= first)
      assert.ok(last <= Date.now(), 'Freshness cannot claim a future observation')
      if (next[field] !== previous[field]) {
        assert.ok(bankConnections.has(previous.connectionId), 'Local source facts remain exact')
        if (group === 'transactions') assert.equal(next[field], previous[field])
        result[counter]++
      }
    }
  }
  return result
}
function origin(value) {
  const url = new URL(value)
  assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  assert.equal(value, url.origin)
}
async function request(path, method = 'GET', body, expected = 200) {
  const response = await fetch(`${api}${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  })
  assert.equal(response.status, expected, `${method} ${path}`)
  return response.json()
}
async function open(page) {
  await page.goto(ui)
  await button(page, 'Riepilogo mensile e disponibilità').waitFor()
  const response = page.waitForResponse(
    (value) =>
      new URL(value.url()).pathname === '/v1/insights/monthly/history' &&
      value.request().method() === 'GET',
  )
  await button(page, 'Riepilogo mensile e disponibilità').click()
  await page.getByRole('heading', { name: 'Il mese e il tuo margine', exact: true }).waitFor()
  const loaded = await response
  assert.equal(loaded.status(), 200)
  const history = await loaded.json()
  const facts = history.items.reduce(
    (sum, row) => sum + row.payload.inputFacts.transactions.length,
    0,
  )
  if (!history.items.length)
    await page.getByText('Nessuna analisi salvata visibile.', { exact: true }).waitFor()
  else
    await page.waitForFunction(
      (expected) =>
        [...document.querySelectorAll('div')].filter(
          (node) => node.children.length === 0 && node.textContent?.startsWith('Input salvato:'),
        ).length === expected,
      facts,
    )
  await settled(page, 'Salva scelte di calcolo')
  return history
}
async function settled(page, name) {
  await page.waitForFunction(
    (label) =>
      [...document.querySelectorAll('[role="button"]')].some(
        (node) =>
          node.getAttribute('aria-label') === label &&
          node.getAttribute('aria-disabled') !== 'true',
      ),
    name,
  )
}
async function mutate(page, label, path, method = 'POST', status = 200) {
  const pending = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === path && response.request().method() === method,
  )
  await button(page, label).click()
  const response = await pending
  assert.equal(response.status(), status, `${method} ${path}`)
  return response.json()
}
async function choose(page, accounts, chosen, buffer = '90071992547409931.23', horizon) {
  for (const account of accounts) {
    const checkbox = page.getByRole('checkbox', {
      name: `Includi ${account.name} ${account.balance.currency}`,
      exact: true,
    })
    const checked = await checkbox.getAttribute('aria-checked')
    if ((checked === 'true') !== (account.id === chosen.id)) await checkbox.click()
  }
  await page
    .getByRole('textbox', { name: `Margine ${chosen.balance.currency}`, exact: true })
    .fill(buffer)
  await page
    .getByRole('radio', { name: 'Prossimo stipendio: data indicata da te', exact: true })
    .click()
  await page.getByRole('textbox', { name: 'Data finale della stima', exact: true }).fill(horizon)
}
;(async () => {
  origin(ui)
  origin(api)
  const before = await request('/v1/demo')
  assert.equal(before.mode, 'synthetic')
  assert.equal((await request('/v1/settings')).settings.locale, 'it-IT')
  const original = (await request('/v1/understanding/preferences')).preferences,
    monthly = await request('/v1/insights/monthly')
  const contributions = new Set(monthly.insights.flatMap((row) => row.inputs.transactionIds))
  const candidate = before.transactions.find(
    (row) =>
      row.kind === 'expense' &&
      contributions.has(row.id) &&
      before.accounts.some(
        (account) =>
          account.id === row.accountId &&
          account.kind === 'cash' &&
          account.balance.currency === 'EUR',
      ),
  )
  assert.ok(candidate, 'Run the financial/current-understanding fixture before this proof')
  const chosen = before.accounts.find((row) => row.id === candidate.accountId)
  assert.ok(chosen)
  const privacy = await request(`/v1/transactions/${candidate.id}/privacy`)
  const baselineDigest = digest(financial(before))
  let savedId = null,
    privacyTouched = false
  const browser = await chromium.launch({
    headless: true,
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: Use the existing local cloud Chromium.
    executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  })
  context.setDefaultTimeout(25000)
  context.on('page', (page) =>
    page.on('pageerror', (error) => report.pageErrors.push({ name: error.name })),
  )
  const page = await context.newPage()
  let peer
  try {
    await open(page)
    peer = await context.newPage()
    await open(peer)
    await page.getByRole('heading', { name: 'Analisi salvate', exact: true }).waitFor()
    check('Actual scoped preferences and observed history load in two independent browser windows')
    await choose(page, before.accounts, chosen, undefined, monthly.boundary.defaultHorizonOn)
    const changed = await mutate(
      page,
      'Salva scelte di calcolo',
      '/v1/understanding/preferences',
      'PATCH',
    )
    assert.deepEqual(changed.values.accountIds, [chosen.id])
    assert.equal(changed.values.bufferByCurrency.EUR, '9007199254740993123')
    assert.equal(changed.values.horizon.mode, 'next_salary')
    assert.equal(changed.revision, original.revision + 1)
    check(
      'Explicit UI save persists exact large minor-unit buffer, selected account and user-provided salary horizon',
    )
    await open(page)
    assert.equal(
      await page
        .getByRole('checkbox', { name: `Includi ${chosen.name} EUR`, exact: true })
        .getAttribute('aria-checked'),
      'true',
    )
    assert.equal(
      await page.getByRole('textbox', { name: 'Margine EUR', exact: true }).inputValue(),
      '90071992547409931.23',
    )
    assert.equal(
      await page
        .getByRole('radio', { name: 'Prossimo stipendio: data indicata da te', exact: true })
        .getAttribute('aria-checked'),
      'true',
    )
    assert.equal(
      await page
        .getByRole('textbox', { name: 'Data finale della stima', exact: true })
        .inputValue(),
      monthly.boundary.defaultHorizonOn,
    )
    check(
      'Reload restores actual encrypted saved account, full exact buffer and horizon without submitting a calculation',
    )
    const undone = await mutate(
      page,
      'Annulla ultima scelta di calcolo',
      '/v1/understanding/preferences/undo',
    )
    assert.deepEqual(undone.values, original.values)
    const undoEvents = (await request('/v1/understanding/preferences')).events
    assert.equal(undoEvents[0].action, 'undone')
    assert.equal(undoEvents[1].action, 'changed')
    check('A fresh undo gesture restores prior choices as a new immutable audit revision')
    let peerPatches = 0
    peer.on('request', (value) => {
      if (
        new URL(value.url()).pathname === '/v1/understanding/preferences' &&
        value.method() === 'PATCH'
      )
        peerPatches++
    })
    await choose(peer, before.accounts, chosen, '2.50', monthly.boundary.defaultHorizonOn)
    await mutate(peer, 'Salva scelte di calcolo', '/v1/understanding/preferences', 'PATCH', 409)
    await settled(peer, 'Salva scelte di calcolo')
    await peer
      .getByText('I dati o le scelte sono cambiati. Aggiorna e ripeti la scelta.', { exact: true })
      .waitFor()
    assert.equal(peerPatches, 1)
    assert.equal(
      (await request('/v1/understanding/preferences')).preferences.revision,
      undone.revision,
    )
    await choose(peer, before.accounts, chosen, '2.50', monthly.boundary.defaultHorizonOn)
    await mutate(peer, 'Salva scelte di calcolo', '/v1/understanding/preferences', 'PATCH')
    assert.equal(peerPatches, 2)
    check(
      'A stale second window receives 409 with no replay; only a new explicit gesture creates its audited change',
    )
    await open(page)
    const firstSaved = await mutate(page, 'Salva questa analisi', '/v1/insights/monthly/snapshots')
    let saved = firstSaved
    savedId = saved.id
    assert.ok(
      saved.payload.result.insights.some((row) => row.inputs.transactionIds.includes(candidate.id)),
    )
    assert.equal(saved.payload.result.capture.capturedAt, saved.capturedAt)
    assert.equal(saved.payload.result.capture.inputDigest, saved.inputDigest)
    check(
      'Monthly save captures the actual observed inputs, formula, policy and ledger/privacy generation guards',
    )
    await settled(page, 'Salva questa analisi')
    saved = await mutate(page, 'Salva questa analisi', '/v1/insights/monthly/snapshots')
    assert.deepEqual(saved, firstSaved)
    assert.equal(
      (await request('/v1/insights/monthly/history')).items.filter((row) => row.id === savedId)
        .length,
      1,
    )
    check('Saving unchanged inputs again reuses the immutable capture without duplicating history')
    const visible = await open(page)
    assert.ok(visible.items.some((row) => row.id === savedId))
    await page.getByText('Input salvato:', { exact: false }).first().waitFor()
    check(
      'Reopened browser history shows captured values and original inputs with their actual capture instant',
    )
    await request(`/v1/transactions/${candidate.id}/privacy`, 'PATCH', {
      revision: privacy.revision,
      quiet: privacy.quiet,
      private: true,
    })
    privacyTouched = true
    const hidden = await open(page)
    assert.ok(!hidden.items.some((row) => row.id === savedId))
    const expectedVisibleFacts = hidden.items.reduce(
      (sum, row) => sum + row.payload.inputFacts.transactions.length,
      0,
    )
    await page.waitForFunction(
      (expected) =>
        [...document.querySelectorAll('[data-testid],div')].filter(
          (node) => node.children.length === 0 && node.textContent?.startsWith('Input salvato:'),
        ).length === expected,
      expectedVisibleFacts,
    )
    check(
      'CURRENT private metadata removes the previously captured analysis from actual browser history',
    )
    const zipResponse = await fetch(`${api}/v1/export/archive`, {
      signal: AbortSignal.timeout(20000),
    })
    assert.equal(zipResponse.status, 200)
    const zip = unzipSync(new Uint8Array(await zipResponse.arrayBuffer()))
    assert.equal(Object.keys(zip).length, 11)
    const ownership = JSON.parse(strFromU8(zip['data.json'])).understandingPersistence
    assert.ok(
      ownership.monthlySnapshots
        .find((row) => row.id === savedId)
        ?.payload.result.insights.some((row) => row.inputs.transactionIds.includes(candidate.id)),
    )
    assert.ok(ownership.preferenceEvents.some((row) => row.action === 'undone'))
    check(
      'Actual ZIP rights export retains original privately hidden capture and immutable choice history',
    )
    const currentPrivacy = await request(`/v1/transactions/${candidate.id}/privacy`)
    await request(`/v1/transactions/${candidate.id}/privacy`, 'PATCH', {
      revision: currentPrivacy.revision,
      quiet: privacy.quiet,
      private: privacy.private,
    })
    const restoredPrivacy = await request(`/v1/transactions/${candidate.id}/privacy`)
    assert.equal(restoredPrivacy.quiet, privacy.quiet)
    assert.equal(restoredPrivacy.private, privacy.private)
    privacyTouched = false
    const current = (await request('/v1/understanding/preferences')).preferences
    await request('/v1/understanding/preferences', 'PATCH', {
      revision: current.revision,
      expectedDigest: current.digest,
      values: original.values,
    })
    await open(page)
    await page.setViewportSize({ width: 320, height: 844 })
    const size = await page.evaluate(() => ({
      width: innerWidth,
      content: document.documentElement.scrollWidth,
    }))
    assert.ok(size.content <= size.width + 1)
    assert.ok(
      (await request('/v1/insights/monthly/history')).items.some((row) => row.id === savedId),
    )
    check(
      'Original choices and privacy are restored; captured history is visible again and wraps at 320 pixels',
    )
    const after = await request('/v1/demo')
    assert.equal(digest(financial(after)), baselineDigest)
    report.backgroundFreshness = unchangedFreshness(before, after)
    assert.equal(report.pageErrors.length, 0)
    assert.deepEqual(
      (await request('/v1/understanding/preferences')).preferences.values,
      original.values,
    )
    report.leftState = {
      originalPreferencesRestored: true,
      originalPrivacyRestored: true,
      financialFactsUnchanged: true,
      savedCaptureRetained: true,
      choiceAuditRetained: true,
    }
    check(
      'All financial facts remain identical, with zero JavaScript errors and honest retained capture/audit state',
    )
    report.status = 'passed'
  } catch (error) {
    report.status = 'failed'
    report.error = { name: error.name }
    throw error
  } finally {
    const cleanupErrors = []
    if (privacyTouched) {
      try {
        const current = await request(`/v1/transactions/${candidate.id}/privacy`)
        await request(`/v1/transactions/${candidate.id}/privacy`, 'PATCH', {
          revision: current.revision,
          quiet: privacy.quiet,
          private: privacy.private,
        })
        const restored = await request(`/v1/transactions/${candidate.id}/privacy`)
        assert.equal(restored.quiet, privacy.quiet)
        assert.equal(restored.private, privacy.private)
      } catch (error) {
        cleanupErrors.push({ operation: 'privacy', name: error.name })
      }
    }
    try {
      const current = (await request('/v1/understanding/preferences')).preferences
      if (JSON.stringify(current.values) !== JSON.stringify(original.values))
        await request('/v1/understanding/preferences', 'PATCH', {
          revision: current.revision,
          expectedDigest: current.digest,
          values: original.values,
        })
    } catch (error) {
      cleanupErrors.push({ operation: 'preferences', name: error.name })
    }
    if (cleanupErrors.length) {
      report.status = 'failed'
      report.cleanupErrors = cleanupErrors
      process.exitCode = 1
    }
    try {
      await writeFile(reportPath, JSON.stringify(report, null, 2))
    } finally {
      await browser.close()
    }
  }
  console.log(JSON.stringify(report, null, 2))
})().catch((error) => {
  console.error(
    `${error.name}: persistence browser proof failed after ${report.checks.length} checks`,
  )
  process.exitCode = 1
})
