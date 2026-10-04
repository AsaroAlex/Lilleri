/**
 * Actual durable acquisition and source-data choices on an isolated synthetic demo.
 * Exclusive writer required. Run LAST: it retains, then erases the default bank source.
 * Adds one explicitly synthetic local account/expense; leaves that other source intact.
 * No response substitution, provider fixture modification or operator-budget changes.
 * A real user-present HTTP job with a long calendar interval prepares partial progress.
 * Run: node tools/durable-sync-ui-smoke.cjs UI_ORIGIN API_ORIGIN
 */
const assert = require('node:assert/strict')
const { createHash, randomUUID } = require('node:crypto')
const { writeFile } = require('node:fs/promises')
const { createRequire } = require('node:module')
const { join } = require('node:path')
const { chromium } = require('playwright')
const { strFromU8, unzipSync } = createRequire(join(__dirname, '../apps/api/package.json'))(
  'fflate',
)
const ui = process.argv[2] || 'http://localhost:8082'
const api = process.argv[3] || 'http://127.0.0.1:3004'
const reportPath =
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual validation outside cached Turbo tasks.
  process.env.LILLERI_DURABLE_SYNC_SMOKE_REPORT || '/tmp/lilleri-durable-sync-ui.json'
const report = {
  status: 'running',
  checks: [],
  pageErrors: [],
  preparation: 'actual_http_long_interval',
  preflightResumeSlices: 0,
  sourceErased: false,
}
const suffix = randomUUID().slice(0, 8)
const labels = {
  'it-IT': {
    transactions: 'Movimenti',
    settings: 'Impostazioni',
    entry: 'Collegamenti e fonti',
    heading: 'Collegamenti',
    reload: 'Ricarica stato e disponibilità',
    choice: 'Scollega e scegli i dati',
    retain: 'Conserva lo storico',
    erase: 'Elimina i dati della fonte',
    ack: 'Confermo di voler eliminare i dati salvati di questa fonte.',
    confirmErase: 'Scollega ed elimina i dati',
    confirmRetain: 'Scollega e conserva lo storico',
    cancel: 'Annulla',
    update: 'Aggiorna questa fonte',
    continue: 'Continua aggiornamento',
    check: 'Controlla progresso',
    resume: 'Riprendi il collegamento',
    partial: 'Acquisizione parziale da continuare',
    completed: 'Acquisizione completata',
    history: 'Storico aggiornamenti',
    inbox: /^Da controllare(?:,| \()/,
  },
  'en-GB': {
    transactions: 'Transactions',
    settings: 'Settings',
    entry: 'Connections and sources',
    heading: 'Connections',
    reload: 'Reload status and availability',
    choice: 'Disconnect and choose what happens to data',
    retain: 'Keep the history',
    erase: 'Erase this source’s data',
    ack: 'I confirm that I want to erase this source’s saved data.',
    confirmErase: 'Disconnect and erase data',
    confirmRetain: 'Disconnect and keep history',
    cancel: 'Cancel',
    update: 'Update this source',
    continue: 'Continue update',
    check: 'Check progress',
    resume: 'Resume connection',
    partial: 'Partial acquisition to continue',
    completed: 'Acquisition completed',
    history: 'Update history',
    inbox: /^To review(?:,| \()/,
  },
}
const button = (page, name) => page.getByRole('button', { name, exact: true })
const check = (name) => {
  report.checks.push(name)
  console.log(`PASS ${name}`)
}
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const terminal = (job) => ['completed', 'failed', 'blocked', 'cancelled'].includes(job.state)
function origin(value) {
  const parsed = new URL(value)
  assert.ok(
    parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname),
  )
  assert.equal(parsed.origin, value, 'Use an exact loopback HTTP origin')
}
async function request(path, method = 'GET', body, status = 200) {
  const response = await fetch(`${api}${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30_000),
  })
  assert.equal(response.status, status, `${method} ${path}`)
  return status === 204 ? undefined : response.json()
}
const financial = (value) => ({
  accounts: value.accounts
    .map(({ id, connectionId, balance }) => ({ id, connectionId, balance }))
    .sort((a, b) => a.id.localeCompare(b.id)),
  transactions: value.transactions
    .map(
      ({
        id,
        accountId,
        connectionId,
        source,
        amount,
        status,
        kind,
        bookedOn,
        relatedTransactionId,
      }) => ({
        id,
        accountId,
        connectionId,
        source,
        amount,
        status,
        kind,
        bookedOn,
        relatedTransactionId,
      }),
    )
    .sort((a, b) => a.id.localeCompare(b.id)),
})
const sourceFinance = (value, connectionId) => {
  const all = financial(value)
  return {
    accounts: all.accounts.filter((row) => row.connectionId === connectionId),
    transactions: all.transactions.filter((row) => row.connectionId === connectionId),
  }
}
async function responseFrom(page, path, method, action, status = 200) {
  const pending = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === path && response.request().method() === method,
  )
  await action()
  const response = await pending
  assert.equal(response.status(), status, `${method} ${path}`)
  return {
    value: status === 204 ? undefined : await response.json(),
    body: response.request().postDataJSON(),
  }
}
async function openPanel(page, locale = 'it-IT') {
  const copy = labels[locale]
  await button(page, copy.transactions).click()
  if (!(await button(page, copy.entry).count())) await button(page, copy.settings).click()
  await button(page, copy.entry).click()
  await page.getByRole('heading', { name: copy.heading, exact: true }).waitFor()
  await button(page, copy.reload).waitFor()
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
async function localeChoice(locale) {
  const current = (await request('/v1/settings')).settings
  return request('/v1/settings', 'PATCH', {
    revision: current.revision,
    displayName: current.displayName,
    timezone: current.timezone,
    locale,
  })
}
async function noOverflow(page, width) {
  await page.setViewportSize({ width, height: 844 })
  const dimensions = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }))
  assert.ok(dimensions.content <= dimensions.width + 1, `${width}px: ${JSON.stringify(dimensions)}`)
}
async function choose(page, locale, data) {
  const copy = labels[locale]
  await button(page, copy.choice).click()
  const retain = page.getByRole('radio', { name: copy.retain, exact: true }),
    erase = page.getByRole('radio', { name: copy.erase, exact: true })
  assert.equal(
    await retain.getAttribute('aria-checked'),
    'true',
    'Every new confirmation defaults to retaining history',
  )
  assert.equal(await erase.getAttribute('aria-checked'), 'false')
  if (data === 'erase') {
    await erase.click()
    const ack = page.getByRole('checkbox', { name: copy.ack, exact: true })
    assert.equal(await ack.getAttribute('aria-checked'), 'false')
    assert.equal(
      await button(page, copy.confirmErase).isDisabled(),
      true,
      'Erasure requires a separate acknowledgement',
    )
    await page
      .getByText(
        locale === 'it-IT'
          ? 'La chiave di cifratura è condivisa dal profilo'
          : 'The profile shares its encryption key',
        { exact: false },
      )
      .waitFor()
  }
}
;(async () => {
  origin(ui)
  origin(api)
  let originalSettings,
    privatePath,
    privateInitial,
    browser,
    pausedForSetup = false,
    connectionBase
  try {
    const initial = await request('/v1/demo')
    assert.equal(initial.mode, 'synthetic')
    originalSettings = (await request('/v1/settings')).settings
    assert.equal(
      originalSettings.locale,
      'it-IT',
      'Restore the isolated fixture to Italian before this proof',
    )
    const connection = initial.connections.find((row) => row.providerId === 'mock-italian')
    assert.ok(connection, 'The synthetic bank connection is required')
    connectionBase = `/v1/connections/${encodeURIComponent(connection.id)}`
    // Initial foreground work can legitimately leave a user-present catch-up partial. Complete
    // that preparation explicitly through the same actual bounded HTTP port; the background
    // pump must never manufacture presence. Never resume unattended work or reset the archive.
    for (let attempt = 0; attempt < 80; attempt++) {
      const jobs = await request(`${connectionBase}/sync-jobs`)
      if (jobs.every(terminal)) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        const again = await request(`${connectionBase}/sync-jobs`)
        if (again.every(terminal)) break
      }
      const due = jobs.find(
        (job) =>
          !terminal(job) &&
          job.mode === 'user_present' &&
          Date.parse(job.availableAt) <= Date.now() &&
          (job.state !== 'running' ||
            (job.leaseExpiresAt && Date.parse(job.leaseExpiresAt) <= Date.now())),
      )
      if (due) {
        const preparedJob = await request(
          `/v1/sync/${encodeURIComponent(due.id)}/resume`,
          'POST',
          {},
        )
        assert.equal(preparedJob.mode, 'user_present')
        assert.equal(preparedJob.connectionId, connection.id)
        assert.equal(preparedJob.profileId, initial.profile.id)
        report.preflightResumeSlices++
        console.log(`PREP actual user-present slice ${report.preflightResumeSlices}`)
      }
      if (attempt === 79)
        throw new Error('Initial foreground acquisition did not settle within the validation bound')
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    const active = await request(`${connectionBase}/lifecycle`)
    assert.equal(active.state, 'active', 'Run before the final source erasure writer')
    await request(`${connectionBase}/pause`, 'POST', { revision: active.revision })
    pausedForSetup = true
    const today = (await request('/v1/insights/monthly')).boundary.calculatedOn
    const manual = await request(
      '/v1/manual/accounts',
      'POST',
      {
        requestId: randomUUID(),
        name: `Durable proof local ${suffix}`,
        kind: 'cash',
        currency: 'EUR',
        openingOn: today,
        openingBalanceMinor: '10000',
      },
      201,
    )
    const merchant = `Durable private proof ${suffix}`,
      expense = await request(
        '/v1/manual/transactions',
        'POST',
        {
          requestId: randomUUID(),
          accountId: manual.id,
          amountMinor: '-1234',
          currency: 'EUR',
          kind: 'expense',
          bookedOn: today,
          description: merchant,
          merchantName: merchant,
        },
        201,
      )
    assert.equal(typeof expense.transactionId, 'string')
    privatePath = `/v1/transactions/${encodeURIComponent(expense.transactionId)}/privacy`
    privateInitial = await request(privatePath)
    const prepared = await request('/v1/demo')
    assert.equal(prepared.accounts.find((row) => row.id === manual.id).balance.amountMinor, '8766')
    assert.ok(
      prepared.analysis.reviewItems.some((row) =>
        row.transactionIds.includes(expense.transactionId),
      ),
      'The new synthetic manual expense needs actual Inbox review',
    )
    const unchanged = financial(prepared)
    browser = await chromium.launch({
      // biome-ignore lint/suspicious/noUndeclaredEnvVars: Reuse the installed cloud browser.
      executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox'],
    })
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce',
      }),
      page = await context.newPage()
    context.setDefaultTimeout(30_000)
    page.on('pageerror', (error) => report.pageErrors.push({ name: error.name }))
    const traffic = { starts: 0, resumes: 0, jobReads: 0, deletes: 0 }
    page.on('request', (outbound) => {
      const path = new URL(outbound.url()).pathname,
        method = outbound.method()
      if (path === '/v1/sync/start' && method === 'POST') traffic.starts++
      if (/^\/v1\/sync\/[^/]+\/resume$/u.test(path) && method === 'POST') traffic.resumes++
      if (
        method === 'GET' &&
        (/^\/v1\/sync\//u.test(path) || path === `${connectionBase}/sync-jobs`)
      )
        traffic.jobReads++
      if (path === connectionBase && method === 'DELETE') traffic.deletes++
    })
    await page.goto(ui)
    await button(page, labels['it-IT'].settings).waitFor()
    await page.getByRole('button', { name: labels['it-IT'].inbox }).click()
    await page.getByText(merchant, { exact: true }).waitFor()
    const flags = await request(privatePath, 'PATCH', {
        revision: privateInitial.revision,
        quiet: true,
        private: true,
      }),
      quiet = await request('/v1/demo')
    assert.deepEqual(financial(quiet), unchanged)
    const related = new Set([expense.transactionId])
    let changed = true
    while (changed) {
      changed = false
      for (const row of quiet.transactions)
        if (
          row.relatedTransactionId &&
          (related.has(row.id) || related.has(row.relatedTransactionId))
        )
          for (const id of [row.id, row.relatedTransactionId])
            if (!related.has(id)) {
              related.add(id)
              changed = true
            }
    }
    for (const id of related)
      assert.equal(
        JSON.stringify(quiet.analysis.reviewItems).includes(id),
        false,
        'Private related identifiers cannot appear in attention evidence',
      )
    await page.reload()
    await button(page, labels['it-IT'].settings).waitFor()
    await page.getByRole('button', { name: labels['it-IT'].inbox }).click()
    assert.equal(await page.getByText(merchant, { exact: true }).count(), 0)
    await request(privatePath, 'PATCH', {
      revision: flags.revision,
      quiet: privateInitial.quiet,
      private: privateInitial.private,
    })
    check(
      'Actual private/quiet Inbox attention is suppressed while exact owned amounts and other-source balances remain',
    )

    await localeChoice('en-GB')
    await page.reload()
    await button(page, labels['en-GB'].settings).waitFor()
    await openPanel(page, 'en-GB')
    await page.getByText('No real bank is connected.', { exact: false }).waitFor()
    await choose(page, 'en-GB', 'erase')
    await button(page, labels['en-GB'].cancel).click()
    assert.equal(traffic.deletes, 0)
    assert.deepEqual(financial(await request('/v1/demo')), unchanged)
    check(
      'Saved British English renders actual progress/source choices, retain default, erasure acknowledgement and truthful shared-key disclosure without writes',
    )
    await localeChoice('it-IT')
    await page.reload()
    await button(page, labels['it-IT'].settings).waitFor()
    await openPanel(page)
    assert.equal(await button(page, labels['it-IT'].update).isDisabled(), true)
    await responseFrom(page, `${connectionBase}/resume`, 'POST', () =>
      button(page, labels['it-IT'].resume).click(),
    )
    pausedForSetup = false
    await settled(page, labels['it-IT'].update)
    const beforeExplicit = await request('/v1/demo'),
      startCount = traffic.starts,
      resumeCount = traffic.resumes,
      startedResponse = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === '/v1/sync/start' &&
          response.request().method() === 'POST',
      ),
      resumedResponse = page.waitForResponse(
        (response) =>
          /^\/v1\/sync\/[^/]+\/resume$/u.test(new URL(response.url()).pathname) &&
          response.request().method() === 'POST',
      )
    await button(page, labels['it-IT'].update).click()
    const startResponse = await startedResponse
    assert.equal(startResponse.status(), 200)
    const started = await startResponse.json()
    assert.equal(started.mode, 'user_present')
    assert.equal(started.connectionId, connection.id)
    assert.equal(started.profileId, initial.profile.id)
    const sliceResponse = await resumedResponse
    assert.equal(sliceResponse.status(), 200)
    let firstJob = await sliceResponse.json()
    assert.equal(firstJob.id, started.id)
    assert.equal(traffic.starts, startCount + 1)
    assert.equal(traffic.resumes, resumeCount + 1)
    for (let gesture = 0; !terminal(firstJob) && gesture < 20; gesture++) {
      await settled(page, labels['it-IT'].continue)
      firstJob = (
        await responseFrom(page, `/v1/sync/${encodeURIComponent(firstJob.id)}/resume`, 'POST', () =>
          button(page, labels['it-IT'].continue).click(),
        )
      ).value
    }
    assert.equal(firstJob.state, 'completed')
    await settled(page, labels['it-IT'].update)
    assert.deepEqual(financial(await request('/v1/demo')), financial(beforeExplicit))
    check(
      'Explicit UI update starts one actual user-present job and one bounded slice per gesture without changing canonical money',
    )

    const beforeCatchup = await request('/v1/demo'),
      freshness = beforeCatchup.connections.find((row) => row.id === connection.id).lastSyncedAt,
      from = `${Number(today.slice(0, 4)) - 1}-01-01`,
      queued = await request('/v1/sync/start', 'POST', {
        connectionId: connection.id,
        requestId: randomUUID(),
        mode: 'user_present',
        from,
      }),
      partial = await request(`/v1/sync/${encodeURIComponent(queued.id)}/resume`, 'POST', {})
    assert.equal(
      partial.state,
      'partial',
      'The actual long interval must exceed a single captured slice',
    )
    assert.ok(partial.report.windowsCompleted < partial.report.windowsTotal)
    assert.equal(partial.report.syncedAt, null)
    const partialFinance = await request('/v1/demo')
    assert.deepEqual(financial(partialFinance), financial(beforeCatchup))
    assert.equal(
      partialFinance.connections.find((row) => row.id === connection.id).lastSyncedAt,
      freshness,
    )
    await button(page, labels['it-IT'].check).click()
    await page.getByText(labels['it-IT'].partial, { exact: true }).first().waitFor()
    await page
      .getByText(
        'Finché l’acquisizione è incompleta, saldi e ultima acquisizione restano quelli già salvati.',
        { exact: true },
      )
      .first()
      .waitFor()
    await page.getByRole('button', { name: /^← Torna a / }).click()
    const reopenWrites = { starts: traffic.starts, resumes: traffic.resumes },
      readBefore = traffic.jobReads
    await openPanel(page)
    await page.getByText(labels['it-IT'].partial, { exact: true }).first().waitFor()
    assert.ok(traffic.jobReads > readBefore)
    assert.deepEqual({ starts: traffic.starts, resumes: traffic.resumes }, reopenWrites)
    check(
      'Real long-interval partial job preserves saved money/freshness and reopens through authoritative job reads',
    )

    await settled(page, labels['it-IT'].check)
    await page.waitForTimeout(200)
    const idle = { ...traffic }
    await page.waitForTimeout(1500)
    assert.deepEqual(
      traffic,
      idle,
      'Idle connections UI must not poll reports or issue hidden writes',
    )
    const progressBefore = await request(`/v1/sync/${encodeURIComponent(queued.id)}`)
    await responseFrom(page, `${connectionBase}/sync-jobs`, 'GET', () =>
      button(page, labels['it-IT'].check).click(),
    )
    const progressAfter = await request(`/v1/sync/${encodeURIComponent(queued.id)}`)
    assert.equal(progressAfter.revision, progressBefore.revision)
    assert.deepEqual(progressAfter.report, progressBefore.report)
    assert.equal(traffic.starts, idle.starts)
    assert.equal(traffic.resumes, idle.resumes)
    check(
      'Idle UI has no repeated polling; explicit progress check reads the server without advancing the job',
    )

    let job = progressAfter,
      gestures = 0
    for (; !terminal(job) && gestures < 32; gestures++) {
      await settled(page, labels['it-IT'].continue)
      const previous = job
      job = (
        await responseFrom(page, `/v1/sync/${encodeURIComponent(queued.id)}/resume`, 'POST', () =>
          button(page, labels['it-IT'].continue).click(),
        )
      ).value
      assert.ok(
        job.report.pages > previous.report.pages && job.report.pages - previous.report.pages <= 100,
        'Each gesture must advance only a bounded slice',
      )
      if (job.state !== 'completed') {
        assert.equal(job.state, 'partial')
        const still = await request('/v1/demo')
        assert.deepEqual(financial(still), financial(beforeCatchup))
        assert.equal(
          still.connections.find((row) => row.id === connection.id).lastSyncedAt,
          freshness,
        )
      }
    }
    assert.equal(job.state, 'completed')
    assert.equal(job.report.windowsCompleted, job.report.windowsTotal)
    assert.equal(job.report.processedRecords, job.report.payloadRecords)
    assert.ok(job.report.payloadRecords > 0)
    assert.equal(
      job.report.outcomes.filter((row) =>
        ['inserted', 'updated', 'unchanged', 'rejected', 'duplicate_payload'].includes(row.outcome),
      ).length,
      job.report.processedRecords,
    )
    const finished = await request('/v1/demo')
    assert.deepEqual(financial(finished), financial(beforeCatchup))
    assert.equal(
      finished.connections.find((row) => row.id === connection.id).lastSyncedAt,
      job.report.syncedAt,
    )
    assert.ok(
      job.report.balances.every((row) => row.result === 'not_comparable'),
      'The default fixture supplies no comparable booked opening anchors',
    )
    await settled(page, labels['it-IT'].update)
    await page.getByText(labels['it-IT'].completed, { exact: true }).first().waitFor()
    await page.getByText('Confronto del saldo non disponibile:', { exact: false }).first().waitFor()
    report.partialResumeGestures = gestures
    report.requestedWindows = job.report.windowsTotal
    check(
      'Explicit bounded resumptions complete exact payload accounting and freshness atomically while unknown balance comparison stays unknown',
    )

    await noOverflow(page, 320)
    const panel = page
      .getByRole('heading', { name: labels['it-IT'].heading, exact: true })
      .locator('..')
    for (const control of await panel.locator('[role="button"], [role="radio"]').all()) {
      const size = await control.boundingBox()
      assert.ok(
        size && size.width >= 43.5 && size.height >= 43.5,
        'Visible controls need 44px targets',
      )
    }
    check('320px progress/history controls reflow without overflow and retain usable target sizes')

    await choose(page, 'it-IT', 'retain')
    const retained = (
      await responseFrom(
        page,
        connectionBase,
        'DELETE',
        () => button(page, labels['it-IT'].confirmRetain).click(),
        204,
      )
    ).body
    assert.deepEqual(retained, { data: 'retain' })
    await page
      .getByText('Fonte scollegata. Lo storico resta disponibile.', { exact: true })
      .waitFor()
    const disconnected = await request('/v1/demo')
    assert.deepEqual(financial(disconnected), financial(finished))
    assert.equal((await request(`${connectionBase}/lifecycle`)).state, 'revoked')
    const denied = await request(
      '/v1/sync/start',
      'POST',
      { connectionId: connection.id, requestId: randomUUID(), mode: 'user_present' },
      409,
    )
    assert.equal(denied.code, 'consent_inactive')
    check(
      'Default retain choice sends the actual DELETE decision, revokes future refresh and preserves all saved source and other-source financial facts',
    )

    await settled(page, labels['it-IT'].choice)
    await choose(page, 'it-IT', 'erase')
    const deletesBefore = traffic.deletes
    await button(page, labels['it-IT'].cancel).click()
    assert.equal(traffic.deletes, deletesBefore)
    await choose(page, 'it-IT', 'erase')
    await page.getByRole('checkbox', { name: labels['it-IT'].ack, exact: true }).click()
    assert.equal(await button(page, labels['it-IT'].confirmErase).isDisabled(), false)
    const erasedBody = (
      await responseFrom(
        page,
        connectionBase,
        'DELETE',
        () => button(page, labels['it-IT'].confirmErase).click(),
        204,
      )
    ).body
    assert.deepEqual(erasedBody, { data: 'erase' })
    report.sourceErased = true
    await page
      .getByText('Fonte scollegata e dati eliminati dall’archivio attuale.', { exact: true })
      .waitFor()
    const erased = await request('/v1/demo')
    assert.deepEqual(sourceFinance(erased, connection.id), { accounts: [], transactions: [] })
    assert.deepEqual(financial(erased), {
      accounts: financial(disconnected).accounts.filter(
        (row) => row.connectionId !== connection.id,
      ),
      transactions: financial(disconnected).transactions.filter(
        (row) => row.connectionId !== connection.id,
      ),
    })
    assert.equal(erased.accounts.find((row) => row.id === manual.id).balance.amountMinor, '8766')
    const owned = await request('/v1/export')
    assert.equal(
      owned.accounts.some((row) => row.connectionId === connection.id),
      false,
    )
    assert.equal(
      owned.transactions.some((row) => row.connectionId === connection.id),
      false,
    )
    assert.equal(
      owned.sourceObservations.some((row) => row.connectionId === connection.id),
      false,
    )
    assert.ok(owned.sourceErasures.some((row) => row.signed.body.connectionId === connection.id))
    assert.ok(owned.transactions.some((row) => row.id === expense.transactionId))
    for (const row of owned.sync.jobs.filter((row) => row.connectionId === connection.id)) {
      assert.deepEqual(row.report.balances, [])
      assert.deepEqual(row.report.outcomes, [])
      assert.deepEqual(row.report.issues, [])
    }
    check(
      'Acknowledged erasure removes only the selected source, retains the synthetic local source and exports a real scoped receipt with financial report redaction',
    )

    const archive = await fetch(`${api}/v1/export/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(30_000),
    })
    assert.equal(archive.status, 200)
    const files = unzipSync(new Uint8Array(await archive.arrayBuffer())),
      manifest = JSON.parse(strFromU8(files['manifest.json'])),
      data = JSON.parse(strFromU8(files['data.json']))
    assert.equal(manifest.sourceMode, 'synthetic')
    assert.equal(manifest.profileId, initial.profile.id)
    for (const entry of manifest.files) {
      assert.ok(files[entry.path])
      assert.equal(files[entry.path].byteLength, entry.bytes)
      assert.equal(createHash('sha256').update(files[entry.path]).digest('hex'), entry.sha256)
    }
    assert.equal(
      data.accounts.some((row) => row.connectionId === connection.id),
      false,
    )
    assert.equal(
      data.transactions.some((row) => row.connectionId === connection.id),
      false,
    )
    assert.ok(data.sourceErasures.some((row) => row.signed.body.connectionId === connection.id))
    assert.ok(data.transactions.some((row) => row.id === expense.transactionId))
    assert.deepEqual(report.pageErrors, [])
    report.remainingFinanceDigest = hash(financial(erased))
    check(
      'Actual complete owner ZIP remains valid after source erasure, with declared file hashes, other-source facts and zero browser JavaScript errors',
    )
    report.status = 'passed'
  } finally {
    if (browser) await browser.close()
    if (privatePath && privateInitial) {
      const current = await request(privatePath)
      if (current.quiet !== privateInitial.quiet || current.private !== privateInitial.private)
        await request(privatePath, 'PATCH', {
          revision: current.revision,
          quiet: privateInitial.quiet,
          private: privateInitial.private,
        })
    }
    if (originalSettings) {
      const current = (await request('/v1/settings')).settings
      if (current.locale !== originalSettings.locale)
        await request('/v1/settings', 'PATCH', {
          revision: current.revision,
          displayName: current.displayName,
          timezone: current.timezone,
          locale: originalSettings.locale,
        })
    }
    if (pausedForSetup && connectionBase) {
      const current = await request(`${connectionBase}/lifecycle`)
      if (current.state === 'paused')
        await request(`${connectionBase}/resume`, 'POST', { revision: current.revision })
    }
    await writeFile(reportPath, JSON.stringify(report, null, 2))
  }
})().catch(async (error) => {
  report.status = 'failed'
  report.error = error.message
  await writeFile(reportPath, JSON.stringify(report, null, 2))
  console.error(error)
  process.exitCode = 1
})
