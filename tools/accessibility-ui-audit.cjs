/**
 * Actual Expo web P0 audit, read-only: navigation, selection drafts and safe dialog cancellation.
 * GET /v1/settings must already have the locale supplied as the third argument (it-IT/en-GB).
 * Run separately for each saved locale after the i18n writer releases the demo profile.
 * 200% is a DOM text-size stress, not OS Dynamic Type or assistive-technology certification.
 */
const assert = require('node:assert/strict')
const { writeFile } = require('node:fs/promises')
const { chromium } = require('playwright')
const { assertFinancialUnchanged } = require('./demo-financial-invariant.cjs')
const ui = process.argv[2] || 'http://localhost:8082'
const api = process.argv[3] || 'http://127.0.0.1:3004'
const locale = process.argv[4] || 'it-IT'
const reportPath =
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Explicit manual browser report.
  process.env.LILLERI_ACCESSIBILITY_UI_REPORT || '/tmp/lilleri-accessibility-ui.json'
const english = locale === 'en-GB'
const text = (it, en) => (english ? en : it)
const report = {
  status: 'running',
  locale,
  checks: [],
  pageErrors: [],
  blockedWrites: [],
  textStress: 'DOM font/line-height 200%',
  nativeAssistiveTechnology: 'not_executed',
}
function origin(value) {
  const url = new URL(value)
  assert.equal(value, url.origin)
  assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
}
async function get(path) {
  const response = await fetch(`${api}${path}`, { signal: AbortSignal.timeout(20_000) })
  assert.equal(response.status, 200, path)
  return response.json()
}
async function main() {
  origin(ui)
  origin(api)
  assert.ok(['it-IT', 'en-GB'].includes(locale))
  const initial = await get('/v1/demo')
  assert.equal(initial.mode, 'synthetic')
  assert.equal(
    (await get('/v1/settings')).settings.locale,
    locale,
    'Save the expected locale before this read-only audit',
  )
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
  })
  let failOverview = false
  await context.route('**/v1/**', async (route) => {
    const request = route.request()
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      report.blockedWrites.push({
        method: request.method(),
        path: new URL(request.url()).pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, ':id'),
      })
      await route.abort('blockedbyclient')
      return
    }
    if (failOverview && new URL(request.url()).pathname === '/v1/demo') {
      await route.abort('failed')
    } else await route.continue()
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => report.pageErrors.push(error.message))
  const button = (name) => page.getByRole('button', { name, exact: true })
  const pass = (name) => {
    report.checks.push(name)
    console.log(`PASS ${locale} ${name}`)
  }
  const mainHeading = () => page.getByRole('heading', { level: 1 })
  async function navigate(it, en) {
    await button(text(it, en)).click()
    await page.waitForFunction(() => document.activeElement?.id === 'lilleri-main-heading')
    assert.equal(await mainHeading().count(), 1)
  }
  async function targets() {
    const issues = await page
      .locator('[role="button"],[role="checkbox"],[role="radio"],button,input,select,textarea')
      .evaluateAll((elements) =>
        elements
          .filter((el) => {
            const r = el.getBoundingClientRect()
            return (
              r.width &&
              r.height &&
              !el.closest('[inert],[hidden],[aria-hidden="true"]') &&
              getComputedStyle(el).visibility === 'visible'
            )
          })
          .flatMap((el) => {
            const r = el.getBoundingClientRect()
            return r.width < 43.99 || r.height < 43.99
              ? [
                  {
                    role: el.getAttribute('role') || el.tagName.toLowerCase(),
                    width: Math.round(r.width),
                    height: Math.round(r.height),
                  },
                ]
              : []
          }),
      )
    assert.deepEqual(issues, [], 'Every visible control must be at least 44 CSS px')
  }
  async function checkboxes() {
    const controls = page.getByRole('checkbox')
    assert.equal(
      await page.getByRole('checkbox', { name: /\S/ }).count(),
      await controls.count(),
      'Every checkbox must have a nonempty accessible name',
    )
    for (const control of await controls.all()) {
      assert.ok(
        ['true', 'false', 'mixed'].includes(await control.getAttribute('aria-checked')),
        'React Native Web checkbox must expose its actual checked state',
      )
    }
  }
  async function reflow() {
    const issues = await page.evaluate(() => {
      const width = window.innerWidth
      return [...document.querySelectorAll('body *')]
        .filter((el) => {
          if (
            !el.childNodes.length ||
            ![...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim())
          )
            return false
          if (el.closest('[inert],[hidden],[aria-hidden="true"]')) return false
          const r = el.getBoundingClientRect()
          const s = getComputedStyle(el)
          if (
            !r.width ||
            !r.height ||
            s.visibility !== 'visible' ||
            el.id === 'lilleri-skip-content'
          )
            return false
          return r.left < -1 || r.right > width + 1
        })
        .map((el) => ({
          role: el.getAttribute('role') || el.tagName.toLowerCase(),
          left: Math.round(el.getBoundingClientRect().left),
          right: Math.round(el.getBoundingClientRect().right),
        }))
    })
    assert.deepEqual(issues, [], 'Visible text must fit the 320 CSS px viewport')
  }
  async function contrast() {
    const failures = await page.evaluate(() => {
      const rgb = (value) => {
        const p = value.match(/[\d.]+/g)?.map(Number)
        return p && p.length >= 3 ? p : null
      }
      const luminance = (p) =>
        p
          .slice(0, 3)
          .map((v) => {
            const c = v / 255
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
          })
          .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
      const ratio = (a, b) => {
        const x = luminance(a),
          y = luminance(b)
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
      }
      const rows = []
      for (const el of document.querySelectorAll('body *')) {
        if (![...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim()))
          continue
        if (el.closest('[inert],[hidden],[aria-hidden="true"],[aria-disabled="true"]')) continue
        const r = el.getBoundingClientRect(),
          style = getComputedStyle(el)
        if (
          !r.width ||
          !r.height ||
          style.visibility !== 'visible' ||
          el.id === 'lilleri-skip-content'
        )
          continue
        let current = el,
          bg = null,
          dimmed = false
        while (current) {
          const s = getComputedStyle(current)
          if (Number(s.opacity) < 1) dimmed = true
          const candidate = rgb(s.backgroundColor)
          if (!bg && candidate && (candidate.length === 3 || candidate[3] === 1)) bg = candidate
          current = current.parentElement
        }
        if (dimmed) continue
        const fg = rgb(style.color)
        if (!fg || !bg) continue
        const large =
          parseFloat(style.fontSize) >= 24 ||
          (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700)
        const value = ratio(fg, bg),
          minimum = large ? 3 : 4.5
        if (value + 0.01 < minimum)
          rows.push({
            role: el.getAttribute('role') || el.tagName.toLowerCase(),
            contrast: Number(value.toFixed(2)),
            minimum,
          })
      }
      return rows
    })
    assert.deepEqual(failures, [], 'Rendered active text contrast')
  }
  try {
    await page.goto(ui, { waitUntil: 'domcontentloaded' })
    await page
      .getByRole('heading', {
        name: text('Panoramica', 'Overview'),
        level: 1,
        exact: true,
      })
      .waitFor()
    await page.waitForFunction((expected) => document.documentElement.lang === expected, locale)
    await button(text('Aggiorna', 'Refresh')).waitFor()
    assert.equal(await mainHeading().count(), 1)
    assert.equal(await page.getByRole('main').count(), 1)
    pass('saved locale, one main landmark and one H1')
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement.id), 'lilleri-skip-content')
    await page.keyboard.press('Enter')
    assert.equal(await page.evaluate(() => document.activeElement.id), 'lilleri-main-heading')
    assert.equal(await page.locator('#lilleri-main-heading').getAttribute('tabindex'), '-1')
    pass('keyboard skip link reaches content without a sequential heading tab stop')
    await targets()
    await checkboxes()
    await contrast()
    pass('desktop control sizes and light text contrast')
    assert.equal(await button('Home').getAttribute('aria-current'), 'page')
    await navigate('Movimenti', 'Transactions')
    assert.equal(
      await button(text('Movimenti', 'Transactions')).getAttribute('aria-current'),
      'page',
    )
    assert.equal(await button('Home').getAttribute('aria-current'), null)
    await button(text('Tutti', 'All')).waitFor()
    assert.equal(await page.locator('[aria-pressed="true"]').count(), 1)
    await page
      .getByRole('textbox', {
        name: text('Cerca un movimento', 'Search transactions'),
        exact: true,
      })
      .fill('__NO_MATCH_FOR_ACCESSIBILITY__')
    await page.getByText(text('Nessun risultato.', 'No results.'), { exact: true }).waitFor()
    assert.equal(
      await page.evaluate(() => document.activeElement.getAttribute('aria-label')),
      text('Cerca un movimento', 'Search transactions'),
    )
    await page
      .getByRole('textbox', {
        name: text('Cerca un movimento', 'Search transactions'),
        exact: true,
      })
      .fill('')
    pass('route focus, current navigation, selected filter and search retain input focus')
    const row = page.getByRole('button', { name: english ? /^Open / : /^Apri / }).first()
    await row.click()
    await page.waitForFunction(() => document.activeElement.id === 'lilleri-main-heading')
    const radios = page.getByRole('radio')
    assert.equal(await radios.count(), 2)
    assert.equal(await radios.nth(0).getAttribute('aria-checked'), 'true')
    assert.equal(await radios.nth(1).getAttribute('aria-checked'), 'false')
    assert.equal(await page.locator('[aria-pressed="true"]').count(), 1)
    await targets()
    pass('transaction category and scope expose actual checked/pressed states')
    await navigate('Impostazioni', 'Settings')
    await button(text('Privacy e dati', 'Privacy and data')).click()
    await page.waitForFunction(() => document.activeElement.id === 'lilleri-main-heading')
    const opener = button(text('Elimina dati dimostrativi', 'Delete demo data'))
    await opener.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('alertdialog', {
      name: text('Eliminare i dati dimostrativi?', 'Delete the demo data?'),
      exact: true,
    })
    await dialog.waitFor()
    assert.equal(await dialog.getAttribute('aria-modal'), 'true')
    assert.ok(await dialog.getAttribute('aria-describedby'))
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.testid),
      'confirmation-cancel',
    )
    assert.equal(
      await page
        .getByRole('button', { name: 'Home', exact: true, includeHidden: true })
        .evaluate((el) => !!el.closest('[inert]')),
      true,
    )
    await page.keyboard.press('Tab')
    assert.equal(
      await page.evaluate(() => document.activeElement.getAttribute('aria-label')),
      text('Conferma eliminazione', 'Confirm deletion'),
    )
    await page.keyboard.press('Shift+Tab')
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.testid),
      'confirmation-cancel',
    )
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'detached' })
    assert.equal(await opener.evaluate((el) => document.activeElement === el), true)
    await opener.click()
    await dialog.waitFor()
    await dialog.getByRole('button', { name: text('Annulla', 'Cancel'), exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
    assert.equal(await opener.evaluate((el) => document.activeElement === el), true)
    pass(
      'named destructive dialog: safe initial focus, inert background, keyboard wrap, Escape/cancel return',
    )
    await targets()
    await checkboxes()
    await contrast()
    pass('privacy control sizes and heading hierarchy')
    await button(text('← Torna a Impostazioni', '← Back to Settings')).click()
    await page.waitForFunction(() => document.activeElement.id === 'lilleri-main-heading')
    for (const [it, en] of [
      ['Avvisi di servizio', 'Service notices'],
      ['Collegamenti e fonti', 'Connections and sources'],
      ['Esercenti e categorie', 'Merchants and categories'],
    ]) {
      await button(text(it, en)).click()
      await page.waitForFunction(() => document.activeElement.id === 'lilleri-main-heading')
      assert.equal(await mainHeading().count(), 1)
      await targets()
      await checkboxes()
      await button(text('← Torna a Impostazioni', '← Back to Settings')).click()
      await page.waitForFunction(() => document.activeElement.id === 'lilleri-main-heading')
    }
    await navigate('Ricorrenti', 'Recurring')
    await page.getByRole('heading', { level: 2 }).first().waitFor()
    assert.equal(await mainHeading().count(), 1)
    await targets()
    pass(
      'mounted notice, connection, merchant and recurring panels keep heading hierarchy and usable targets',
    )
    await navigate('Home', 'Home')
    failOverview = true
    await button(text('Aggiorna', 'Refresh')).click()
    const status = page.getByRole('status').filter({
      hasText: text(
        'Consultazione temporanea senza connessione',
        'Temporary view without a connection',
      ),
    })
    await status.waitFor()
    assert.equal(await status.getAttribute('aria-live'), 'polite')
    assert.equal(await status.getAttribute('aria-atomic'), 'true')
    assert.equal(
      await page.getByText('RAW_PRIVATE_ERROR_MUST_NOT_RENDER', { exact: false }).count(),
      0,
    )
    failOverview = false
    await button(text('Aggiorna', 'Refresh')).click()
    await status.waitFor({ state: 'detached' })
    pass(
      'network failure announces the bounded read-only saved view and restores online after retry',
    )
    assert.equal(
      await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
      true,
    )
    assert.equal(
      await page.evaluate(
        () => document.head.querySelectorAll('[data-lilleri-accessibility="true"]').length,
      ),
      1,
    )
    await button(text('Usa aspetto scuro', 'Use dark appearance')).click()
    await contrast()
    await button(text('Usa aspetto chiaro', 'Use light appearance')).focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    const ring = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement)
      return {
        width: parseFloat(s.outlineWidth),
        offset: parseFloat(s.outlineOffset),
        visible: document.activeElement.matches(':focus-visible'),
      }
    })
    assert.ok(ring.visible && ring.width >= 3 && ring.offset >= 2)
    pass('reduced-motion media and dark active text/visible focus')
    await button(text('Usa aspetto chiaro', 'Use light appearance')).click()
    await page.setViewportSize({ width: 320, height: 800 })
    await targets()
    await reflow()
    pass('320 CSS px responsive text reflow and control sizes')
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('body *')) {
        if (
          ![...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim()) ||
          el.closest('[aria-hidden="true"]')
        )
          continue
        const s = getComputedStyle(el)
        el.style.fontSize = `${parseFloat(s.fontSize) * 2}px`
        if (s.lineHeight !== 'normal') el.style.lineHeight = `${parseFloat(s.lineHeight) * 2}px`
      }
    })
    await targets()
    await reflow()
    assert.equal(await button('Home').isVisible(), true)
    pass('200% DOM text stress at 320 CSS px preserves visible controls and reflow')
    assert.deepEqual(report.pageErrors, [])
    assert.deepEqual(report.blockedWrites, [])
    assertFinancialUnchanged(initial, await get('/v1/demo'), report, true)
    pass(
      'no browser writes, uncaught errors or changed financial facts; bounded mock freshness allowed',
    )
    report.status = 'pass'
  } catch (error) {
    report.status = 'fail'
    report.error = error.message
    process.exitCode = 1
    console.error(error)
  } finally {
    await context.close()
    await browser.close()
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  }
}
void main().catch(async (error) => {
  report.status = 'fail'
  report.error = error.message
  process.exitCode = 1
  console.error(error)
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
})
