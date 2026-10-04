/**
 * Actual Expo web notification panel against an isolated synthetic demo archive.
 * Start the current DEMO_MODE=1 API and Expo bundle using a NEW PGLITE_PATH.
 * Run alone: node tools/notifications-ui-smoke.cjs [UI_ORIGIN] [API_ORIGIN].
 * Defaults: http://localhost:8081 and http://127.0.0.1:3004.
 * Preferences and an initially granted N-SERVICE choice are restored. The helper
 * appends immutable synthetic preference/read facts and creates an export notice.
 * No native push, bank delivery, production account or external service is tested.
 */
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { writeFile } = require('node:fs/promises')
const { chromium } = require('playwright')

const ui = process.argv[2] || 'http://localhost:8081'
const api = process.argv[3] || 'http://127.0.0.1:3004'
const reportPath =
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual browser helper outside cached Turbo tasks.
  process.env.LILLERI_NOTIFICATION_SMOKE_REPORT || '/tmp/lilleri-notifications-ui.json'
const report = { status: 'running', checks: [], pageErrors: [] }
const button = (scope, name) => scope.getByRole('button', { name, exact: true })
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
const values = (preferences) => ({ types: preferences.types, quietHours: preferences.quietHours })
const preferences = () => request('/v1/notifications/preferences')
const permission = async () =>
  (await request('/v1/privacy/permissions')).permissions.find((row) => row.purpose === 'N-SERVICE')
async function setPermission(action, copy) {
  const current = await permission()
  return request('/v1/privacy/permissions/N-SERVICE', 'PATCH', {
    revision: current.revision,
    action,
    ...(action === 'revoked'
      ? {}
      : {
          textVersion: copy.textVersion,
          textHash: copy.textHash,
          noticeVersion: copy.noticeVersion,
          vendorListVersion: copy.vendorListVersion,
        }),
  })
}
const finance = (value) => ({
  accounts: value.accounts,
  transactions: value.transactions,
  analysis: value.analysis,
})
async function openPanel(page) {
  await page.getByRole('button', { name: /^Impostazioni(?:,|$)/ }).click()
  await button(page, 'Avvisi di servizio').click()
  await page.getByRole('heading', { name: 'Avvisi', exact: true }).waitFor()
  await page.getByLabel('Inizio degli orari tranquilli').waitFor()
  return page.getByRole('heading', { name: 'Avvisi', exact: true }).locator('..')
}
async function responseFrom(page, path, action, expected = 200) {
  const pending = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === path && response.request().method() === 'PATCH',
  )
  await action()
  const response = await pending
  assert.equal(response.status(), expected, path)
  return { value: await response.json(), body: response.request().postDataJSON() }
}
function surroundingQuietHours(timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const minute =
    Number(parts.find((part) => part.type === 'hour').value) * 60 +
    Number(parts.find((part) => part.type === 'minute').value)
  const text = (value) => {
    const wrapped = (value + 1440) % 1440
    return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`
  }
  return { enabled: true, start: text(minute - 10), end: text(minute + 10) }
}
const titles = {
  inbox: 'Hai movimenti da rivedere',
  consent_reminder: 'Un collegamento richiede la tua attenzione',
  balance_mismatch: 'Ci sono dati da verificare',
  connection_expired: 'Un collegamento richiede un rinnovo',
  connection_paused: 'Un collegamento è in pausa',
  summary_ready: 'Il riepilogo è pronto',
  security_notice: 'Un avviso per la sicurezza del tuo account',
  export_ready: 'La tua esportazione è pronta',
  deletion_status: 'Aggiornamento sulla tua richiesta di eliminazione',
  rights_action: 'Una richiesta sui tuoi dati richiede attenzione',
}
function validateFeed(feed) {
  assert.equal(feed.nativePushAvailable, false)
  for (const item of feed.items) {
    assert.deepEqual(Object.keys(item).sort(), [
      'deliveredAt',
      'id',
      'revision',
      'seenAt',
      'textVersion',
      'title',
      'type',
    ])
    assert.match(item.id, /^[a-f\d-]{36}$/)
    assert.equal(item.title, titles[item.type])
    assert.equal(item.textVersion, 'notification-text-v1')
  }
}

;(async () => {
  validateOrigin(ui)
  validateOrigin(api)
  const initial = await request('/v1/demo')
  assert.equal(initial.mode, 'synthetic', 'Use a disposable synthetic archive')
  const original = await preferences(),
    originalPermission = await permission()
  let browser
  try {
    if (originalPermission.localPreferenceEnabled) await setPermission('revoked')
    assert.equal((await permission()).localPreferenceEnabled, false)
    const off = {
      types: Object.fromEntries(Object.keys(original.types).map((key) => [key, false])),
      quietHours: surroundingQuietHours(original.timezone),
    }
    await request('/v1/notifications/preferences', 'PATCH', { ...off, revision: original.revision })
    const archive = await fetch(`${api}/v1/export/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(20_000),
    })
    assert.equal(archive.status, 200)
    assert.match(archive.headers.get('content-type'), /^application\/zip/)
    assert.deepEqual(
      [...new Uint8Array(await archive.arrayBuffer()).subarray(0, 4)],
      [0x50, 0x4b, 0x03, 0x04],
    )
    const feed = await request('/v1/notifications')
    validateFeed(feed)
    const notice = feed.items.find((item) => item.type === 'export_ready' && item.seenAt === null)
    assert.ok(notice, 'A successful actual export must produce an essential local notice')
    check(
      'Actual POST archive creates a valid ZIP and delivers its notice with N-SERVICE off, optional types off and quiet hours active',
    )
    await request(`/v1/notifications/${randomUUID()}/destination`, 'GET', undefined, 404)
    check(
      'Feed contains only a fixed generic title, opaque event id and delivery/read metadata; unknown routing fails closed',
    )

    browser = await chromium.launch({
      // biome-ignore lint/suspicious/noUndeclaredEnvVars: Manual browser helper outside cached Turbo tasks.
      executablePath: process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox'],
    })
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    context.setDefaultTimeout(20_000)
    const page = await context.newPage()
    page.on('pageerror', (error) => report.pageErrors.push(error.message))
    await page.goto(ui)
    await page.getByRole('button', { name: /^(?:Controlla|Da controllare(?:,.*)?)$/ }).waitFor()
    let panel = await openPanel(page)
    await panel.getByText('Avvisi essenziali', { exact: true }).waitFor()
    await panel
      .getByText('Attiva gli avvisi facoltativi in Permessi e privacy.', { exact: true })
      .waitFor()
    await panel
      .getByText('Le notifiche al dispositivo non sono attive.', { exact: false })
      .waitFor()
    await panel.getByText(`Fuso del profilo: ${original.timezone}.`, { exact: false }).waitFor()
    assert.equal(await panel.getByRole('checkbox').count(), 7)
    const quietToggle = panel.getByRole('checkbox', {
      name: 'Rispetta gli orari tranquilli',
      exact: true,
    })
    assert.equal(await quietToggle.isChecked(), true)
    assert.equal(await quietToggle.isDisabled(), false)
    await quietToggle.click()
    assert.equal(await quietToggle.isChecked(), false)
    await quietToggle.click()
    assert.equal(await quietToggle.isChecked(), true)
    for (const control of await panel.locator('[role="button"], [role="checkbox"], input').all()) {
      const bounds = await control.boundingBox()
      assert.ok(bounds && bounds.height >= 43.5 && bounds.width >= 43.5, '44px touch targets')
    }
    const dimensions = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    assert.ok(dimensions.scroll <= dimensions.width + 1, 'No 390px horizontal overflow')
    check(
      'Actual 390px panel separates essential and optional notices, exposes current IANA zone and uses 44px targets',
    )

    const card = panel.getByText(titles.export_ready, { exact: true }).first().locator('..')
    const marked = await responseFrom(page, `/v1/notifications/${notice.id}/seen`, () =>
      button(card, 'Segna come letto').click(),
    )
    assert.deepEqual(marked.body, { revision: notice.revision })
    assert.ok(marked.value.seenAt)
    await card.getByText('Letto', { exact: false }).waitFor()
    await request(
      `/v1/notifications/${notice.id}/seen`,
      'PATCH',
      { revision: notice.revision },
      409,
    )
    check(
      'Mark-read submits the owned event revision; a stale read mutation is rejected by the actual API',
    )

    let writes = 0
    page.on('request', (outbound) => {
      if (
        new URL(outbound.url()).pathname === '/v1/notifications/preferences' &&
        outbound.method() === 'PATCH'
      )
        writes++
    })
    await panel.getByLabel('Inizio degli orari tranquilli').fill('08:00')
    await panel.getByLabel('Fine degli orari tranquilli').fill('08:00')
    await button(panel, 'Salva preferenze avvisi').click()
    await panel
      .getByRole('alert')
      .getByText('Inserisci due orari diversi nel formato 22:00.')
      .waitFor()
    assert.equal(writes, 0)
    await panel.getByLabel('Inizio degli orari tranquilli').fill('22:00')
    await panel.getByLabel('Fine degli orari tranquilli').fill('08:00')
    const inboxToggle = panel.getByRole('checkbox', { name: 'Movimenti da rivedere', exact: true })
    assert.equal(await inboxToggle.isChecked(), false)
    await inboxToggle.click()
    assert.equal(await inboxToggle.isChecked(), true)
    const beforeSave = await preferences()
    const saved = await responseFrom(page, '/v1/notifications/preferences', () =>
      button(panel, 'Salva preferenze avvisi').click(),
    )
    assert.equal(saved.body.revision, beforeSave.revision)
    assert.equal(saved.body.types.inbox, true)
    assert.equal(saved.body.quietHours.start, '22:00')
    await panel.getByText('Preferenze degli avvisi salvate.', { exact: true }).waitFor()
    assert.equal((await preferences()).revision, beforeSave.revision + 1)
    check(
      'Equal quiet-hour endpoints make no HTTP mutation; valid optional preference changes persist with a revision',
    )

    const concurrent = await preferences()
    await request('/v1/notifications/preferences', 'PATCH', {
      ...values(concurrent),
      revision: concurrent.revision,
    })
    await panel.getByRole('checkbox', { name: 'Riepiloghi pronti', exact: true }).click()
    await responseFrom(
      page,
      '/v1/notifications/preferences',
      () => button(panel, 'Salva preferenze avvisi').click(),
      409,
    )
    await panel
      .getByRole('alert')
      .getByText('Gli avvisi sono cambiati. Aggiorna e controlla prima di riprovare.')
      .waitFor()
    assert.equal((await preferences()).types.summary_ready, false)
    await button(panel, 'Aggiorna avvisi').click()
    await panel.getByRole('alert').waitFor({ state: 'detached' })
    check(
      'A second writer makes the panel show a conflict and preserves the server preference until explicit refresh',
    )

    const destination = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/v1/notifications/${notice.id}/destination`,
    )
    await button(card, 'Apri avviso').click()
    assert.deepEqual(await (await destination).json(), { screen: 'privacy', action: 'open' })
    await page
      .getByRole('heading', { name: 'Le tue preferenze di riservatezza', exact: true })
      .waitFor()
    panel = await openPanel(page)
    await button(panel, 'Apri Permessi e privacy').click()
    await page
      .getByRole('heading', { name: 'Le tue preferenze di riservatezza', exact: true })
      .waitFor()
    assert.deepEqual(finance(await request('/v1/demo')), finance(initial))
    assert.deepEqual(report.pageErrors, [])
    check(
      'Opaque-event and permission navigation reach actual screens; notification actions leave financial data unchanged',
    )
    report.status = 'passed'
  } finally {
    const latest = await preferences()
    await request('/v1/notifications/preferences', 'PATCH', {
      ...values(original),
      revision: latest.revision,
    })
    if (originalPermission.localPreferenceEnabled)
      await setPermission('granted', originalPermission.disclosure)
    await browser?.close()
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  }
})().catch((error) => {
  report.status = 'failed'
  report.failure = String(error)
  void writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`).finally(() => {
    console.error(error)
    process.exitCode = 1
  })
})
