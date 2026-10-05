/**
 * Isolated synthetic HTTPS/browser proof. Never uses a user archive or a mail provider.
 * Build packages/API and export Expo with EXPO_PUBLIC_HOSTED_AUTH_MODE=1,
 * EXPO_PUBLIC_API_URL=https://identity.lilleri.test,
 * EXPO_PUBLIC_HOSTED_AUTH_TERMS_VERSION=beta-reviewed-fixture-v1 and
 * EXPO_PUBLIC_HOSTED_AUTH_TERMS_URL=https://identity.lilleri.test/condizioni.
 * Requires loopback port443, OpenSSL, Chromium and tooling Playwright. Its ephemeral
 * self-signed test certificate is accepted only by this private browser context.
 */
const assert = require('node:assert/strict')
const { randomBytes, randomUUID } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const { mkdtemp, readFile, rm } = require('node:fs/promises')
const { createServer } = require('node:https')
const { tmpdir } = require('node:os')
const { join, resolve, extname } = require('node:path')
const { pathToFileURL } = require('node:url')
const { chromium } = require('playwright')
const root = resolve(__dirname, '..')
const origin = 'https://identity.lilleri.test'
const password = 'Synthetic hosted UI password 45!'
const replacement = 'Synthetic recovered UI password 67!'
const checks = []
const passed = (name) => {
  checks.push(name)
  console.log(`PASS ${name}`)
}
const types = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
}

;(async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lilleri-hosted-identity-fixture-'))
  let browser, app, handle, server
  try {
    const { createApp } = await import(pathToFileURL(join(root, 'apps/api/dist/app.js')).href)
    const { openDatabase } = await import(
      pathToFileURL(join(root, 'packages/database/dist/index.js')).href
    )
    handle = await openDatabase({ driver: 'pglite' })
    const verification = [],
      recovery = []
    let refuseDelivery = false
    app = await createApp({
      db: handle.db,
      demoMode: false,
      financialScope: handle.withProfile,
      environment: 'production',
      hostedIdentity: {
        baseURL: origin,
        secret: randomBytes(48).toString('hex'),
        termsVersion: 'beta-reviewed-fixture-v1',
        delivery: {
          sendVerification: async (message) => {
            verification.push(message)
          },
          sendPasswordReset: async (message) => {
            if (refuseDelivery) throw new Error('Synthetic transport outage')
            recovery.push(message)
          },
        },
      },
    })
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-keyout',
        join(directory, 'key.pem'),
        '-out',
        join(directory, 'cert.pem'),
        '-days',
        '1',
        '-subj',
        '/CN=identity.lilleri.test',
      ],
      { stdio: 'ignore' },
    )
    server = createServer(
      {
        key: await readFile(join(directory, 'key.pem')),
        cert: await readFile(join(directory, 'cert.pem')),
      },
      async (request, response) => {
        response.setHeader('Referrer-Policy', 'no-referrer')
        response.setHeader('Cache-Control', 'no-store')
        try {
          const url = new URL(request.url ?? '/', origin)
          if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/v1/')) {
            const chunks = []
            for await (const chunk of request) chunks.push(chunk)
            const body = Buffer.concat(chunks).toString()
            const result = await app.inject({
              method: request.method,
              url: request.url,
              headers: request.headers,
              ...(body ? { payload: body } : {}),
            })
            response.writeHead(result.statusCode, result.headers)
            response.end(result.payload)
            return
          }
          if (url.pathname === '/condizioni') {
            response.setHeader('Content-Type', 'text/plain')
            response.end('Synthetic reviewed-version fixture only. Not legal terms for real users.')
            return
          }
          const path = resolve(
            root,
            'apps/mobile/dist',
            `.${decodeURIComponent(['/', '/app'].includes(url.pathname) ? '/index.html' : url.pathname)}`,
          )
          if (!path.startsWith(`${resolve(root, 'apps/mobile/dist')}/`))
            throw new Error('Invalid fixture path')
          response.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream')
          response.end(await readFile(path))
        } catch {
          response.writeHead(500)
          response.end('Synthetic fixture unavailable')
        }
      },
    )
    await new Promise((resolve, reject) => {
      server.once('error', reject)
      server.listen(443, '127.0.0.1', resolve)
    })
    browser = await chromium.launch({
      executablePath: '/usr/bin/chromium',
      headless: true,
      args: [
        '--no-sandbox',
        '--no-proxy-server',
        '--host-resolver-rules=MAP identity.lilleri.test 127.0.0.1',
      ],
    })
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage(),
      errors = [],
      financialWrites = []
    page.on('pageerror', () => errors.push('pageerror'))
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/v1/') && request.method() !== 'GET')
        financialWrites.push(request.method())
    })
    await page.goto(origin)
    await page.getByRole('button', { name: 'Crea il tuo profilo', exact: true }).click()
    const email = `hosted-ui-${randomUUID()}@example.invalid`
    await page
      .getByRole('textbox', { name: 'Nome del profilo', exact: true })
      .fill('Persona sintetica')
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    const signup = page.getByRole('button', { name: 'Crea il tuo profilo', exact: true })
    assert.equal(await signup.isDisabled(), true)
    await page
      .getByRole('checkbox', { name: 'Dichiaro di avere almeno 18 anni.', exact: true })
      .click()
    assert.equal(await signup.isDisabled(), true)
    await page.getByRole('link', { name: 'Leggi le condizioni di utilizzo', exact: true }).waitFor()
    await page
      .getByText('Versione delle condizioni: beta-reviewed-fixture-v1', { exact: true })
      .waitFor()
    await page
      .getByRole('checkbox', { name: 'Accetto le condizioni di utilizzo.', exact: true })
      .click()
    await signup.click()
    await page
      .getByText('Profilo creato. Apri il collegamento nella tua email, poi accedi.', {
        exact: true,
      })
      .waitFor()
    assert.equal(verification.length, 1)
    passed(
      'hosted signup uses configured legal version, adult/terms gates and verification-first UI',
    )
    await page
      .getByRole('button', { name: 'Invia di nuovo l’email di verifica', exact: true })
      .click()
    await page
      .getByText('Se l’indirizzo richiede verifica, riceverai un’email con il collegamento.', {
        exact: true,
      })
      .waitFor()
    assert.equal(verification.length, 2)
    await page.goto(verification[1].url)
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Accedi con password', exact: true }).click()
    await page.getByRole('button', { name: 'Impostazioni', exact: true }).click()
    await page.getByRole('button', { name: 'Esci dal profilo', exact: true }).waitFor()
    const cookies = await context.cookies(origin)
    const sessionCookie = cookies.find(
      (cookie) => cookie.name === '__Secure-lilleri-hosted.session_token',
    )
    assert.equal(sessionCookie.secure, true)
    assert.equal(sessionCookie.httpOnly, true)
    assert.equal(sessionCookie.sameSite, 'Strict')
    passed('HTTPS browser verification/sign-in and actual Secure HttpOnly Strict session cookie')
    await page.getByRole('button', { name: 'Esci dal profilo', exact: true }).click()
    await page.getByRole('button', { name: 'Hai dimenticato la password?', exact: true }).click()
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
    await page
      .getByRole('button', { name: 'Invia il collegamento di recupero', exact: true })
      .click()
    await page
      .getByText(
        'Se l’indirizzo è registrato, riceverai un’email con un collegamento valido per 15 minuti.',
        { exact: true },
      )
      .waitFor()
    assert.equal(recovery.length, 1)
    await page.goto(recovery[0].url)
    await page.getByLabel('Nuova password', { exact: true }).waitFor()
    assert.equal(new URL(page.url()).searchParams.has('token'), false)
    assert.equal(new URL(page.url()).searchParams.has('identity'), false)
    await page.getByLabel('Nuova password', { exact: true }).fill(replacement)
    await page
      .getByLabel('Ripeti la nuova password', { exact: true })
      .fill('Different synthetic password')
    const save = page.getByRole('button', { name: 'Salva la nuova password', exact: true })
    assert.equal(await save.isDisabled(), true)
    await page.getByLabel('Ripeti la nuova password', { exact: true }).fill(replacement)
    const before = financialWrites.length
    await save.click()
    await page
      .getByText(
        'Password aggiornata. Tutte le sessioni sono terminate. Accedi con la nuova password.',
        { exact: true },
      )
      .waitFor()
    assert.equal(financialWrites.length, before)
    passed(
      'recovery removes token from history, validates password confirmation and returns to a fresh sign-in gesture',
    )
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(replacement)
    await page.getByRole('button', { name: 'Accedi con password', exact: true }).click()
    await page.getByRole('button', { name: 'Impostazioni', exact: true }).click()
    await page.getByRole('button', { name: 'Esci dal profilo', exact: true }).click()
    await page.goto(`${origin}/?identity=recover&token=invalid`)
    await page
      .getByText('Il collegamento non è valido o è scaduto. Richiedine uno nuovo.', { exact: true })
      .waitFor()
    await page.setViewportSize({ width: 320, height: 844 })
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    )
    passed('new-password sign-in, invalid-link recovery and320px form reflow')
    refuseDelivery = true
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
    await page
      .getByRole('button', { name: 'Invia il collegamento di recupero', exact: true })
      .click()
    await page.getByRole('alert').waitFor()
    assert.equal(
      await page
        .getByText(
          'Se l’indirizzo è registrato, riceverai un’email con un collegamento valido per 15 minuti.',
          { exact: true },
        )
        .count(),
      0,
    )
    passed('mail outage stays a visible failure without a success claim')
    assert.deepEqual(errors, [])
    console.log(
      `PASS ${checks.length} hosted identity browser groups;0 page errors; private synthetic HTTPS fixture only`,
    )
  } finally {
    if (browser) await browser.close()
    if (server) await new Promise((resolve) => server.close(resolve))
    if (app) await app.close()
    if (handle) await handle.close()
    await rm(directory, { recursive: true, force: true })
  }
})().catch(() => {
  console.error(
    `Hosted identity UI smoke failed after ${checks.length} completed groups. Raw browser errors are suppressed to protect recovery tokens.`,
  )
  process.exitCode = 1
})
