/** Real Chromium keyboard checks for the pure web focus controller; no HTTP or native claim. */
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { mkdtemp, readFile, rm, writeFile } = require('node:fs/promises')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')
const { chromium } = require('playwright')
const report = { status: 'running', checks: [], pageErrors: [] }
const reportPath =
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Explicit manual helper output path.
  process.env.LILLERI_ACCESSIBILITY_FOCUS_REPORT || '/tmp/lilleri-focus-browser.json'
async function main() {
  const output = await mkdtemp(join(tmpdir(), 'lilleri-focus-'))
  let browser
  try {
    execFileSync(
      'pnpm',
      [
        'exec',
        'tsc',
        '--ignoreConfig',
        '--module',
        'commonjs',
        '--target',
        'ES2023',
        '--lib',
        'ES2023,DOM',
        '--skipLibCheck',
        '--outDir',
        output,
        'apps/mobile/src/accessibility/web-focus.ts',
      ],
      { cwd: resolve(__dirname, '..'), stdio: 'pipe' },
    )
    const script = await readFile(join(output, 'web-focus.js'), 'utf8')
    browser = await chromium.launch({
      executablePath: '/usr/bin/chromium',
      headless: true,
      args: ['--no-sandbox'],
    })
    const page = await browser.newPage()
    page.on('pageerror', (error) => report.pageErrors.push(error.message))
    await page.setContent(
      '<button id="opener">Open</button><aside id="preserved" aria-hidden="false" inert="existing">Preserved</aside><main id="surface"><button id="background">Background</button><section id="dialog" role="alertdialog" aria-modal="true" aria-labelledby="title"><h2 id="title">Delete?</h2><button id="danger">Delete</button><button id="cancel">Cancel</button><button disabled id="disabled">Disabled</button><button hidden id="hidden">Hidden</button><details><summary id="summary">More</summary><button id="closed-detail">Closed</button></details></section></main>',
    )
    await page.addScriptTag({
      content: `window.focusLibrary = {}; (function(exports){${script}\n})(window.focusLibrary)`,
    })
    await page.evaluate(() => {
      document.querySelector('#opener').focus()
      window.current = true
      window.dismissAllowed = true
      window.dismissed = 0
      window.dispose = window.focusLibrary.activateWebDialog(document.querySelector('#dialog'), {
        initialFocus: document.querySelector('#cancel'),
        isCurrent: () => window.current,
        mayRestoreFocus: () => window.current,
        canDismiss: () => window.dismissAllowed,
        onDismiss: () => {
          window.dismissed++
          window.dispose()
          document.querySelector('#dialog').remove()
        },
      })
    })
    const active = () => page.evaluate(() => document.activeElement.id)
    const pass = (name) => {
      report.checks.push(name)
      console.log(`PASS ${name}`)
    }
    assert.equal(await active(), 'cancel')
    assert.deepEqual(
      await page
        .locator('#background')
        .evaluate((el) => [el.hasAttribute('inert'), el.getAttribute('aria-hidden')]),
      [true, 'true'],
    )
    assert.equal(await page.locator('#opener').getAttribute('aria-hidden'), 'true')
    pass('safe initial focus and inert background')
    await page.keyboard.press('Tab')
    assert.equal(await active(), 'summary')
    await page.keyboard.press('Tab')
    assert.equal(await active(), 'danger')
    await page.keyboard.press('Shift+Tab')
    assert.equal(await active(), 'summary')
    await page.keyboard.press('Shift+Tab')
    assert.equal(await active(), 'cancel')
    pass('Tab and Shift+Tab wrap; hidden, disabled and closed-details controls excluded')
    await page.evaluate(() =>
      document
        .querySelector('#dialog')
        .insertAdjacentHTML('beforeend', '<button id="added">Added</button>'),
    )
    await page.keyboard.press('Tab')
    assert.equal(await active(), 'summary')
    await page.keyboard.press('Tab')
    assert.equal(await active(), 'added')
    await page.keyboard.press('Tab')
    assert.equal(await active(), 'danger')
    pass('dynamic dialog controls participate in actual keyboard order')
    await page.evaluate(() =>
      document.body.insertAdjacentHTML(
        'beforeend',
        '<button id="late-background">Late background</button>',
      ),
    )
    await page.waitForFunction(() =>
      document.querySelector('#late-background').hasAttribute('inert'),
    )
    await page.locator('#late-background').evaluate((el) => el.focus())
    assert.equal(await active(), 'danger')
    pass('new background controls stay inert and cannot steal focus')
    await page.evaluate(() => {
      window.dismissAllowed = false
    })
    await page.keyboard.press('Escape')
    assert.equal(await page.evaluate(() => window.dismissed), 0)
    assert.equal(await page.locator('#dialog').count(), 1)
    await page.evaluate(() => {
      window.dismissAllowed = true
    })
    await page.keyboard.press('Escape')
    assert.equal(await page.evaluate(() => window.dismissed), 1)
    assert.equal(await active(), 'opener')
    assert.deepEqual(
      await page
        .locator('#preserved')
        .evaluate((el) => [el.getAttribute('inert'), el.getAttribute('aria-hidden')]),
      ['existing', 'false'],
    )
    assert.equal(await page.locator('#opener').getAttribute('aria-hidden'), null)
    pass('busy Escape is blocked; safe dismissal restores focus and original background attributes')
    await page.evaluate(() => {
      document
        .querySelector('#surface')
        .insertAdjacentHTML(
          'beforeend',
          '<section id="stale"><button id="stale-safe">Cancel</button></section>',
        )
      document.querySelector('#opener').focus()
      window.current = true
      window.dispose = window.focusLibrary.activateWebDialog(document.querySelector('#stale'), {
        isCurrent: () => window.current,
        mayRestoreFocus: () => window.current,
        onDismiss: () => window.dismissed++,
      })
      window.current = false
    })
    await page.keyboard.press('Escape')
    assert.equal(await page.evaluate(() => window.dismissed), 1)
    await page.evaluate(() => {
      window.dispose()
      document.querySelector('#stale').remove()
    })
    assert.notEqual(await active(), 'opener')
    pass('stale identity context cannot dismiss or restore prior sensitive focus')
    await page.evaluate(() => {
      document
        .querySelector('#surface')
        .insertAdjacentHTML('beforeend', '<section id="empty">No controls</section>')
      window.dispose = window.focusLibrary.activateWebDialog(document.querySelector('#empty'), {
        returnFocus: document.querySelector('#opener'),
      })
    })
    assert.equal(await active(), 'empty')
    await page.keyboard.press('Tab')
    assert.equal(await active(), 'empty')
    await page.keyboard.press('Shift+Tab')
    assert.equal(await active(), 'empty')
    await page.evaluate(() => window.dispose())
    assert.equal(await active(), 'opener')
    assert.equal(await page.locator('#empty').getAttribute('tabindex'), null)
    pass('empty dialogs retain keyboard focus without permanent tab stops')
    await page.evaluate(() => {
      document.querySelector('#opener').focus()
      window.dispose = window.focusLibrary.activateWebDialog(document.querySelector('#empty'))
      document.querySelector('#opener').remove()
      window.dispose()
    })
    assert.equal(await page.locator('[inert]').count(), 1)
    pass('detached openers clean up safely without restoring obsolete elements')
    assert.deepEqual(report.pageErrors, [])
    report.status = 'pass'
  } catch (error) {
    report.status = 'fail'
    report.error = error.message
    process.exitCode = 1
    console.error(error)
  } finally {
    if (browser) await browser.close()
    await rm(output, { recursive: true, force: true })
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  }
}
void main()
