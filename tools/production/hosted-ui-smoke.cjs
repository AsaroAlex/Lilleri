/**
 * End-to-end browser proof of the hosted service with simulated third parties.
 * Runs the real hosted server (PGlite, sealed vault, home page, legal pages, billing, bank flow)
 * behind a loopback HTTPS front for app.lilleri.test, plus a second instance without a bank
 * provider (fondatori.lilleri.test) where Plus is closed and the Fondatori list is offered.
 * Scaleway, Stripe and the bank are simulated in process: no real credential, payment or bank.
 *
 * Prerequisites: `node tools/production/build.mjs` (API + hosted web export), OpenSSL, Chromium
 * and Playwright (NODE_PATH pointing at a Playwright install).
 * Usage: node tools/production/hosted-ui-smoke.cjs [screenshot-directory] [chromium-path]
 */
const assert = require('node:assert/strict')
const { createHmac, randomBytes, randomUUID } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const { mkdtemp, mkdir, readFile, rm } = require('node:fs/promises')
const { createServer } = require('node:https')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')
const { pathToFileURL } = require('node:url')
const { chromium } = require('playwright')

const root = resolve(__dirname, '../..')
const host = 'app.lilleri.test'
const origin = `https://${host}`
const foundersHost = 'fondatori.lilleri.test'
const foundersOrigin = `https://${foundersHost}`
const shots = process.argv[2] ?? join(tmpdir(), 'lilleri-hosted-shots')
const webhookSecret = `whsec_${randomBytes(24).toString('hex')}`
const prices = { month: 'price_plusmonthly', year: 'price_plusyearly' }
const checks = []
const passed = (name) => {
  checks.push(name)
  console.log(`PASS ${name}`)
}
const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (days) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

/** Minimal Stripe emulator for the calls billing.ts makes. */
function stripeEmulator() {
  const customers = new Map()
  const subscriptions = new Map()
  const json = (value, status = 200) =>
    new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
  return {
    customers,
    subscriptions,
    async handle(url, init) {
      const path = url.pathname
      const method = init?.method ?? 'GET'
      if (method === 'GET' && path.startsWith('/v1/prices/')) {
        const id = path.split('/').at(-1)
        const interval = id === prices.month ? 'month' : id === prices.year ? 'year' : null
        if (!interval) return json({ error: { type: 'invalid_request_error' } }, 404)
        return json({
          id,
          active: true,
          currency: 'eur',
          unit_amount: interval === 'month' ? 699 : 6999,
          recurring: { interval, interval_count: 1 },
        })
      }
      if (method === 'POST' && path === '/v1/customers') {
        const id = `cus_${randomBytes(8).toString('hex')}`
        customers.set(id, new URLSearchParams(String(init.body)))
        return json({ id })
      }
      if (method === 'POST' && path === '/v1/checkout/sessions') {
        const form = new URLSearchParams(String(init.body))
        return json({
          id: `cs_test_${randomBytes(8).toString('hex')}`,
          url: `https://checkout.stripe.com/c/pay/cs_test_${encodeURIComponent(form.get('client_reference_id') ?? '')}`,
          customer: form.get('customer'),
        })
      }
      if (method === 'POST' && path === '/v1/billing_portal/sessions')
        return json({ id: 'bps_test', url: 'https://billing.stripe.com/p/session/test_portal' })
      if (method === 'GET' && path.startsWith('/v1/subscriptions/')) {
        const value = subscriptions.get(path.split('/').at(-1))
        return value ? json(value) : json({ error: {} }, 404)
      }
      if (method === 'GET' && path === '/v1/subscriptions')
        return json({ data: [...subscriptions.values()], has_more: false })
      if (method === 'DELETE' && path.startsWith('/v1/subscriptions/')) {
        const value = subscriptions.get(path.split('/').at(-1))
        if (!value) return json({ error: {} }, 404)
        value.status = 'canceled'
        value.canceled_at = Math.floor(Date.now() / 1000)
        return json(value)
      }
      throw new Error(`Unexpected Stripe call ${method} ${path}`)
    },
  }
}

/** Deterministic official-bank stand-in: redirect consent served on the same test origin. */
class SimulatedBank {
  id = 'enable-banking'
  sessions = new Set()
  capabilities() {
    return {
      accountInformation: true,
      payments: false,
      synthetic: false,
      grantSpecificRevocation: true,
    }
  }
  discoveryMetadata() {
    return {
      providerId: this.id,
      environment: 'sandbox',
      coverageVersion: 'smoke',
      pagination: { maxPageSize: 500, maxPages: 1, maxCursorBytes: 64 },
      refresh: {
        userPresent: 'supported',
        unattendedBudget: {
          requests: 4,
          windowSeconds: 86_400,
          evidenceReference: 'https://enablebanking.com/docs/faq/',
        },
      },
      renewal: 'supported',
    }
  }
  syncMetadata() {
    return {
      providerId: this.id,
      environment: 'sandbox',
      evidenceReference: 'https://enablebanking.com/docs/faq/',
      userPresent: 'supported',
      unattendedBudget: {
        requests: 4,
        windowSeconds: 86_400,
        anchor: 'utc_epoch',
        unit: 'refresh_attempt',
        evidenceReference: 'https://enablebanking.com/docs/faq/',
      },
      maxWindowDays: 14,
      maxPageSize: 200,
      maxCursorBytes: 64,
      pendingSet: 'unknown',
      deletionEvidence: 'unknown',
    }
  }
  async listInstitutions() {
    return { institutions: [], nextCursor: null, coverageVersion: 'smoke' }
  }
  async institutions(country) {
    if (country !== 'IT') return []
    return ['Intesa Sanpaolo', 'Intesa Sanpaolo Private Banking', 'UniCredit', 'BPER Banca'].map(
      (name) => ({ id: `IT:${name}`, name, country: 'IT', beta: false, maximumConsentDays: 180 }),
    )
  }
  async startAuthorization(input) {
    return {
      url: `${origin}/__bank/authorize?state=${encodeURIComponent(input.state)}&bank=${encodeURIComponent(input.institutionId)}`,
      authorizationId: randomUUID(),
      validUntil: new Date(Date.now() + 180 * 86_400_000).toISOString(),
    }
  }
  async completeAuthorization(code) {
    const institutionId = Buffer.from(code, 'base64url').toString('utf8')
    const sessionId = randomUUID()
    this.sessions.add(sessionId)
    return {
      sessionId,
      institutionId,
      validUntil: new Date(Date.now() + 180 * 86_400_000).toISOString(),
      accounts: [
        { id: 'acct-hash-1', name: 'Conto corrente ••4821', kind: 'current', currency: 'EUR' },
      ],
    }
  }
  registerPresence() {}
  async createConnection() {
    throw new Error('redirect required')
  }
  async renewConnection() {
    throw new Error('redirect required')
  }
  async refreshConnection() {}
  async listAccounts() {
    return []
  }
  async getBalances() {
    return []
  }
  async getTransactions() {
    return { transactions: [], nextCursor: null }
  }
  async disconnect(context) {
    this.sessions.delete(context.grantId)
  }
  async openSync() {
    return {
      snapshotId: `smoke-${randomUUID()}`,
      accounts: [
        {
          id: 'acct-hash-1',
          name: 'Conto corrente ••4821',
          institutionName: 'Intesa Sanpaolo',
          kind: 'current',
          currency: 'EUR',
          balance: '2418.36',
        },
      ],
      historyFrom: { 'acct-hash-1': daysAgo(60) },
      observedAt: new Date(Date.now() - 1000).toISOString(),
      balances: [
        {
          accountId: 'acct-hash-1',
          currency: 'EUR',
          amount: '2418.36',
          type: 'booked',
          referenceDate: today(),
          opening: null,
        },
      ],
    }
  }
  async getSyncPage(_context, request) {
    const rows = [
      ['ref-1', '-54.20', 'Esselunga Milano', 'Esselunga', 2],
      ['ref-2', '-12.99', 'Netflix abbonamento', 'Netflix', 5],
      ['ref-3', '2350.00', 'Stipendio settembre', null, 6],
      ['ref-4', '-38.40', 'Trenitalia biglietto', 'Trenitalia', 9],
      ['ref-5', '-61.75', 'Enel Energia bolletta', 'Enel Energia', 12],
    ]
      .map(([id, amount, description, merchantName, age]) => ({
        id,
        accountId: 'acct-hash-1',
        amount,
        currency: 'EUR',
        description,
        status: 'booked',
        bookedOn: daysAgo(age),
        ...(merchantName ? { merchantName } : {}),
      }))
      .filter((row) => row.bookedOn >= request.from && row.bookedOn <= request.to)
    const pending = request.includePending
      ? [
          {
            id: null,
            accountId: 'acct-hash-1',
            amount: '-3.20',
            currency: 'EUR',
            description: 'Bar Centrale',
            status: 'pending',
          },
        ]
      : []
    return {
      snapshotId: request.snapshotId,
      from: request.from,
      to: request.to,
      transactions: [...rows, ...pending],
      nextCursor: null,
      coverage: 'complete_window',
    }
  }
}

;(async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lilleri-hosted-ui-'))
  await mkdir(shots, { recursive: true })
  let browser, server, hosted, closed, current
  const mails = []
  const stripe = stripeEmulator()
  const bank = new SimulatedBank()
  try {
    const { createHostedServer } = await import(
      pathToFileURL(join(root, 'apps/api/dist/hosted-server.js')).href
    )
    const { openDatabase } = await import(
      pathToFileURL(join(root, 'packages/database/dist/index.js')).href
    )
    const outbound = async (input, init) => {
      const url = new URL(String(input))
      if (url.origin === 'https://api.scaleway.com') {
        const body = JSON.parse(String(init.body))
        mails.push({ to: body.to[0].email, text: body.text })
        return new Response(
          JSON.stringify({ emails: [{ id: `mail-${mails.length}`, status: 'new' }] }),
          {
            headers: { 'content-type': 'application/json' },
          },
        )
      }
      if (url.origin === 'https://api.stripe.com') return stripe.handle(url, init)
      throw new Error(`Unexpected outbound request to ${url.origin}`)
    }
    const environment = (base, data) => ({
      NODE_ENV: 'production',
      PUBLIC_BASE_URL: base,
      HOSTED_AUTH_SECRET: randomBytes(32).toString('hex'),
      LILLERI_VAULT_MASTER_KEY: randomBytes(32).toString('base64url'),
      LILLERI_DATA_DIR: join(directory, data),
      DATABASE_URL: 'postgresql://lilleri:unused@postgres.railway.internal:5432/railway',
      IDENTITY_MAIL_PROVIDER: 'scaleway',
      IDENTITY_MAIL_API_KEY: 'simulated-scaleway-secret',
      IDENTITY_MAIL_PROJECT_ID: '11111111-2222-4333-8444-555555555555',
      IDENTITY_MAIL_FROM: 'accesso@mail.lilleri.test',
      LEGAL_ENTITY_NAME: 'Lilleri S.r.l.',
      LEGAL_ENTITY_ADDRESS: 'Via Esempio 1, 20100 Milano (MI)',
      LEGAL_ENTITY_VAT: 'IT00000000000',
      LEGAL_CONTACT_EMAIL: 'supporto@lilleri.test',
      LEGAL_PRIVACY_EMAIL: 'privacy@lilleri.test',
      STRIPE_SECRET_KEY: `sk_test_${randomBytes(16).toString('hex')}`,
      STRIPE_WEBHOOK_SECRET: webhookSecret,
      STRIPE_PRICE_MONTHLY: prices.month,
      STRIPE_PRICE_YEARLY: prices.year,
    })
    hosted = await createHostedServer(environment(origin, 'data'), root, {
      database: await openDatabase({ driver: 'pglite' }),
      bankProvider: bank,
      fetch: outbound,
      log: () => {},
    })
    // No bank provider: Plus cannot be bought, so the home page and the app offer the list.
    closed = await createHostedServer(environment(foundersOrigin, 'founders'), root, {
      database: await openDatabase({ driver: 'pglite' }),
      fetch: outbound,
      log: () => {},
    })
    const app = hosted.app
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
        `/CN=${host}`,
      ],
      { stdio: 'ignore' },
    )
    server = createServer(
      {
        key: await readFile(join(directory, 'key.pem')),
        cert: await readFile(join(directory, 'cert.pem')),
      },
      async (request, response) => {
        try {
          const url = new URL(request.url ?? '/', origin)
          if (url.pathname === '/__bank/authorize') {
            // The bank's consent screen, then the provider's redirect back to Lilleri.
            const code = Buffer.from(url.searchParams.get('bank') ?? '').toString('base64url')
            const back = `${origin}/connect/bank/callback?state=${encodeURIComponent(url.searchParams.get('state') ?? '')}&code=${code}`
            response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
            response.end(
              `<!doctype html><meta name="viewport" content="width=device-width"><title>Banca simulata</title><body style="font:16px system-ui;padding:24px"><h1>Banca simulata</h1><p>Autorizzi Lilleri a leggere conti, saldi e movimenti?</p><a id="approve" href="${back}">Autorizza</a></body>`,
            )
            return
          }
          const chunks = []
          for await (const chunk of request) chunks.push(chunk)
          const body = Buffer.concat(chunks)
          const target = String(request.headers.host ?? '').startsWith(foundersHost)
            ? closed.app
            : app
          const result = await target.inject({
            method: request.method,
            url: request.url,
            headers: { ...request.headers, 'x-forwarded-for': '203.0.113.7' },
            ...(body.length ? { payload: body } : {}),
          })
          response.writeHead(result.statusCode, result.headers)
          response.end(result.rawPayload)
        } catch {
          response.writeHead(500)
          response.end('Smoke fixture failure')
        }
      },
    )
    await new Promise((done, fail) => {
      server.once('error', fail)
      server.listen(443, '127.0.0.1', done)
    })
    browser = await chromium.launch({
      executablePath: process.argv[3] ?? '/opt/pw-browsers/chromium',
      headless: true,
      args: [
        '--no-sandbox',
        '--no-proxy-server',
        `--host-resolver-rules=MAP ${host} 127.0.0.1, MAP ${foundersHost} 127.0.0.1`,
      ],
    })
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 390, height: 844 },
    })
    await context.route('https://checkout.stripe.com/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><meta name="viewport" content="width=device-width"><title>Stripe Checkout (simulato)</title><body style="font:16px system-ui;padding:24px"><h1>Lilleri Plus</h1><p>€6,99 al mese · IVA inclusa</p><a id="pay" href="${origin}/?billing=success">Abbonati</a></body>`,
      }),
    )
    const page = await context.newPage()
    current = page
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    const shot = async (name) =>
      page.screenshot({ path: join(shots, `${name}.png`), fullPage: false })

    const home = await page.goto(origin)
    assert.equal(home?.status(), 200)
    await page
      .getByRole('heading', { level: 1, name: 'I tuoi soldi, finalmente in ordine.' })
      .waitFor()
    // Bank access is configured here, so Plus is offered directly with the Stripe prices.
    await page.getByRole('link', { name: 'Scopri Plus', exact: true }).waitFor()
    await page.getByText('6,99 €', { exact: false }).first().waitFor()
    await shot('00-home')
    await page.setViewportSize({ width: 1280, height: 860 })
    await shot('00b-home-desktop')
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    )
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    )
    await page.getByRole('link', { name: 'Inizia gratis', exact: true }).first().click()
    await page.waitForURL(`${origin}/app`)
    passed('server-rendered home page with live prices opens the web app under /app')

    await page.getByRole('button', { name: 'Crea il tuo profilo', exact: true }).click()
    const email = `persona-${randomUUID()}@example.test`
    const password = 'Una password lunga e sicura 42!'
    await page.getByRole('textbox', { name: 'Nome del profilo', exact: true }).fill('Giulia')
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page
      .getByRole('checkbox', { name: 'Dichiaro di avere almeno 18 anni.', exact: true })
      .click()
    await page.getByRole('link', { name: 'Leggi le condizioni di utilizzo', exact: true }).waitFor()
    await page.getByRole('link', { name: 'Informativa privacy', exact: true }).waitFor()
    await page
      .getByRole('checkbox', { name: 'Accetto le condizioni di utilizzo.', exact: true })
      .click()
    await shot('01-signup')
    await page.getByRole('button', { name: 'Crea il tuo profilo', exact: true }).click()
    await page
      .getByText('Profilo creato. Apri il collegamento nella tua email, poi accedi.', {
        exact: true,
      })
      .waitFor()
    const verification = mails.find((mail) => mail.to === email)
    assert.ok(verification, 'verification mail sent through the EU mail adapter')
    await page.goto(/https:\/\/\S+/.exec(verification.text)[0])
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Accedi con password', exact: true }).click()
    await page.getByRole('button', { name: 'Impostazioni', exact: true }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/app')
    await shot('02-home-empty')
    passed('sign-up with legal links, email verification through the mail adapter and sign-in')

    const legal = await context.newPage()
    const terms = await legal.goto(`${origin}/legal/terms`)
    assert.equal(terms?.status(), 200)
    assert.match(await legal.content(), /Lilleri S\.r\.l\./)
    await legal.screenshot({ path: join(shots, '02b-legal-terms.png') })
    await legal.close()
    passed('legal pages are served on the same origin with the operator details')

    await page.getByRole('button', { name: 'Impostazioni', exact: true }).click()
    await page
      .getByRole('button', { name: /Abbonamento/ })
      .first()
      .click()
    await page.getByText('Gratis, senza scadenza').first().waitFor()
    await shot('03-subscription-gratis')
    await page.getByRole('button', { name: /Scegli Plus mensile/ }).click()
    await page.waitForURL(/checkout\.stripe\.com/)
    const [customerId] = [...stripe.customers.keys()]
    const profileId = stripe.customers.get(customerId).get('metadata[profile_id]')
    const subscriptionId = `sub_${randomBytes(8).toString('hex')}`
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86_400
    stripe.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      customer: customerId,
      status: 'active',
      cancel_at_period_end: false,
      cancel_at: null,
      canceled_at: null,
      current_period_end: periodEnd,
      items: {
        data: [
          {
            current_period_end: periodEnd,
            price: { id: prices.month, recurring: { interval: 'month' } },
          },
        ],
      },
    })
    const send = async (type, object) => {
      const payload = JSON.stringify({
        id: `evt_${randomBytes(8).toString('hex')}`,
        type,
        created: Math.floor(Date.now() / 1000),
        data: { object },
      })
      const timestamp = Math.floor(Date.now() / 1000)
      const signature = createHmac('sha256', webhookSecret)
        .update(`${timestamp}.${payload}`)
        .digest('hex')
      const result = await app.inject({
        method: 'POST',
        url: '/webhooks/stripe',
        headers: {
          host,
          'content-type': 'application/json',
          'stripe-signature': `t=${timestamp},v1=${signature}`,
        },
        payload,
      })
      assert.equal(result.statusCode, 200, result.payload)
    }
    await send('checkout.session.completed', {
      id: 'cs_test_smoke',
      object: 'checkout.session',
      mode: 'subscription',
      customer: customerId,
      subscription: subscriptionId,
      client_reference_id: profileId,
    })
    // Stripe still returns to the old `/?billing=success` address: the home page forwards it.
    await page.locator('#pay').click()
    await page.waitForURL(`${origin}/app`)
    await page.getByText('Il tuo piano attuale').first().waitFor()
    await page.getByRole('button', { name: /Gestisci abbonamento/ }).waitFor({ timeout: 40_000 })
    await shot('04-subscription-plus')
    passed('Plus checkout through Stripe, signed webhook and plan upgrade')

    await page.getByRole('button', { name: 'Home', exact: true }).click()
    await page.getByRole('button', { name: 'Aggiungi conto', exact: true }).first().click()
    await page.getByText('Intesa Sanpaolo', { exact: true }).first().click()
    await page.getByRole('button', { name: 'Collega il conto', exact: true }).click()
    await page.getByRole('button', { name: 'Collega con la tua banca', exact: true }).click()
    await page.getByRole('heading', { name: 'Scegli la tua banca' }).waitFor()
    await shot('05-bank-picker')
    await page
      .getByRole('radio', { name: /^Intesa Sanpaolo$/ })
      .first()
      .click()
    await page.getByRole('button', { name: /Continua con Intesa Sanpaolo/ }).click()
    await shot('06-bank-trust')
    await page.getByRole('button', { name: /Continua su Intesa Sanpaolo/ }).click()
    await page.waitForURL(/__bank\/authorize/)
    await page.locator('#approve').click()
    await page.waitForURL((url) => url.origin === origin && !url.pathname.startsWith('/connect'))
    await page
      .getByText('Abbiamo letto i movimenti dalla tua banca. Li trovi in Movimenti.')
      .waitFor({ timeout: 60_000 })
    await shot('07a-bank-connected-notice')
    await page.getByRole('button', { name: 'Movimenti', exact: true }).click()
    // Merchant recognition shows the normalised name and the category.
    await page.getByText('Esselunga', { exact: true }).first().waitFor({ timeout: 30_000 })
    await page.getByText('6 movimenti', { exact: false }).first().waitFor()
    await shot('07-bank-connected')
    passed('bank picker, trust panel, bank redirect, callback and first synchronisation')

    await page.setViewportSize({ width: 1280, height: 860 })
    await page.getByRole('button', { name: 'Home', exact: true }).click()
    await shot('08-home-desktop')
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    )
    await page.setViewportSize({ width: 390, height: 844 })

    const founders = await context.newPage()
    current = founders
    founders.on('pageerror', (error) => errors.push(error.message))
    await founders.goto(foundersOrigin)
    await founders.getByRole('heading', { name: 'Plus Fondatori' }).waitFor()
    await founders.getByText('In arrivo', { exact: true }).waitFor()
    await founders.locator('#fondatori').scrollIntoViewIfNeeded()
    await founders.screenshot({ path: join(shots, '09-home-founders.png') })
    await founders.getByRole('link', { name: 'Entra nella lista', exact: true }).click()
    await founders.waitForURL(`${foundersOrigin}/app?fondatori=1`)
    await founders.getByRole('button', { name: 'Crea il tuo profilo', exact: true }).click()
    const founderEmail = `fondatore-${randomUUID()}@example.test`
    await founders.getByRole('textbox', { name: 'Nome del profilo', exact: true }).fill('Marco')
    await founders.getByRole('textbox', { name: 'Email', exact: true }).fill(founderEmail)
    await founders.getByLabel('Password', { exact: true }).fill(password)
    await founders
      .getByRole('checkbox', { name: 'Dichiaro di avere almeno 18 anni.', exact: true })
      .click()
    await founders
      .getByRole('checkbox', { name: 'Accetto le condizioni di utilizzo.', exact: true })
      .click()
    await founders.getByRole('button', { name: 'Crea il tuo profilo', exact: true }).click()
    await founders
      .getByText('Profilo creato. Apri il collegamento nella tua email, poi accedi.', {
        exact: true,
      })
      .waitFor()
    const founderMail = mails.find((mail) => mail.to === founderEmail)
    assert.ok(founderMail, 'verification mail for the Fondatori instance')
    await founders.goto(/https:\/\/\S+/.exec(founderMail.text)[0])
    await founders.getByRole('textbox', { name: 'Email', exact: true }).fill(founderEmail)
    await founders.getByLabel('Password', { exact: true }).fill(password)
    await founders.getByRole('button', { name: 'Accedi con password', exact: true }).click()
    await founders.getByRole('button', { name: 'Impostazioni', exact: true }).click()
    await founders
      .getByRole('button', { name: /Abbonamento/ })
      .first()
      .click()
    await founders
      .getByRole('button', { name: 'Avvisami quando è disponibile', exact: true })
      .click()
    await founders.getByText('Sei nella lista Fondatori.', { exact: true }).waitFor()
    await founders.getByText('Sei al posto numero 1.', { exact: true }).waitFor()
    await founders.getByTestId('plus-founders').scrollIntoViewIfNeeded()
    await founders.screenshot({ path: join(shots, '10-founders-joined.png') })
    assert.equal(
      await founders.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    )
    passed(
      'closed Plus: the home page and Subscription offer the Fondatori list, and joining works',
    )

    assert.deepEqual(errors, [])
    console.log(
      `PASS ${checks.length} hosted browser groups; 0 page errors; screenshots in ${shots}`,
    )
  } catch (error) {
    if (current) await current.screenshot({ path: join(shots, 'failure.png') }).catch(() => {})
    throw error
  } finally {
    if (browser) await browser.close()
    if (server) await new Promise((done) => server.close(done))
    if (hosted) await hosted.close()
    if (closed) await closed.close()
    await rm(directory, { recursive: true, force: true })
  }
})().catch((error) => {
  console.error(`Hosted UI smoke failed after ${checks.length} groups: ${error?.message ?? error}`)
  process.exitCode = 1
})
