import { randomUUID } from 'node:crypto'
import { type DatabaseHandle, openDatabase } from '@lilleri/database'
import Fastify from 'fastify'
import { afterAll, describe, expect, test } from 'vitest'
import { type AppExtensionContext, createApp } from '../src/app.js'
import {
  createLegalPagesExtension,
  LEGAL_PAGE_ROUTES,
  LEGAL_PRIVACY_VERSION,
  LEGAL_TERMS_VERSION,
  type LegalEntity,
  type LegalLocale,
  type LegalPage,
  legalEntityFromEnvironment,
  renderLegalPage,
} from '../src/legal-pages.js'

const REQUIRED = [
  'LEGAL_ENTITY_NAME',
  'LEGAL_ENTITY_ADDRESS',
  'LEGAL_ENTITY_VAT',
  'LEGAL_CONTACT_EMAIL',
  'LEGAL_PRIVACY_EMAIL',
] as const
const CSP =
  "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
const ALLOWED_EXTERNAL_HOSTS = new Set(['www.garanteprivacy.it', 'enablebanking.com', 'stripe.com'])

const environment = (): Record<string, string | undefined> => ({
  LEGAL_ENTITY_NAME: 'Esempio Sintetico S.r.l.',
  LEGAL_ENTITY_ADDRESS: 'Via Esempio 1, 00100 Roma (RM), Italia',
  LEGAL_ENTITY_VAT: 'IT00000000000',
  LEGAL_CONTACT_EMAIL: 'support@example.com',
  LEGAL_PRIVACY_EMAIL: 'privacy@example.com',
})
const entity = (): LegalEntity => legalEntityFromEnvironment(environment())
const everyPage = (value: LegalEntity) =>
  LEGAL_PAGE_ROUTES.map((route) => ({
    ...route,
    html: renderLegalPage(route.page, route.locale, value),
  }))
const failure = (configuration: Record<string, string | undefined>) => {
  try {
    legalEntityFromEnvironment(configuration)
  } catch (error) {
    return error as Error
  }
  throw new Error('expected the configuration to be rejected')
}
const attributes = (html: string, name: string) =>
  [...html.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map((match) => match[1] ?? '')

describe('legal entity configuration', () => {
  test('trims required values and omits blank optional values', () => {
    const configured = legalEntityFromEnvironment({
      ...environment(),
      LEGAL_ENTITY_NAME: '  Esempio Sintetico S.r.l.\n',
      LEGAL_DPO_EMAIL: '   ',
      LEGAL_PEC: '',
    })
    expect(configured).toEqual({
      name: 'Esempio Sintetico S.r.l.',
      address: 'Via Esempio 1, 00100 Roma (RM), Italia',
      vat: 'IT00000000000',
      contactEmail: 'support@example.com',
      privacyEmail: 'privacy@example.com',
    })
    expect('dpoEmail' in configured || 'pec' in configured || 'rea' in configured).toBe(false)
    expect(
      legalEntityFromEnvironment({
        ...environment(),
        LEGAL_DPO_EMAIL: ' dpo@example.com ',
        LEGAL_PEC: 'esempio@pec.example.it',
        LEGAL_REA: 'RM-0000000',
      }),
    ).toMatchObject({
      dpoEmail: 'dpo@example.com',
      pec: 'esempio@pec.example.it',
      rea: 'RM-0000000',
    })
  })

  test('rejects every missing or blank required field with one generic error', () => {
    for (const key of REQUIRED) {
      for (const value of [undefined, '', '   ']) {
        const error = failure({ ...environment(), [key]: value })
        expect(error.message).toBe('Legal entity configuration is incomplete')
      }
    }
    expect(failure({}).message).toBe('Legal entity configuration is incomplete')
  })

  test('rejects invalid values without echoing them', () => {
    const marker = 'SECRET-MARKER-7f3a'
    const invalid: Record<string, string>[] = [
      { LEGAL_CONTACT_EMAIL: `${marker}-not-an-address` },
      { LEGAL_PRIVACY_EMAIL: `${marker}@localhost` },
      { LEGAL_PRIVACY_EMAIL: `"${marker}"@example.com` },
      { LEGAL_CONTACT_EMAIL: `${marker}..x@example.com` },
      { LEGAL_ENTITY_NAME: `${marker}\u0007 S.r.l.` },
      { LEGAL_ENTITY_ADDRESS: `Via ${marker}\nRoma` },
      { LEGAL_ENTITY_VAT: `IT${marker}‮` },
      { LEGAL_ENTITY_NAME: `${marker}${'x'.repeat(300)}` },
      { LEGAL_DPO_EMAIL: `${marker} dpo@example.com` },
      { LEGAL_PEC: `${marker}` },
      { LEGAL_REA: `RM\u0000${marker}` },
    ]
    for (const override of invalid) {
      const error = failure({ ...environment(), ...override })
      expect(error.message).toBe('Legal entity configuration is incomplete')
      expect(String(error)).not.toContain(marker)
      expect(JSON.stringify(error)).not.toContain(marker)
      expect(error.stack ?? '').not.toContain(marker)
    }
    // Exactly 300 characters is the accepted maximum.
    expect(
      legalEntityFromEnvironment({ ...environment(), LEGAL_ENTITY_NAME: 'x'.repeat(300) }).name,
    ).toHaveLength(300)
  })
})

describe('rendered legal pages', () => {
  test('escape every configured value', () => {
    const hostile = legalEntityFromEnvironment({
      ...environment(),
      LEGAL_ENTITY_NAME: '<script>alert("x")</script> & Figli',
      LEGAL_ENTITY_ADDRESS: `"><img src=x onerror=alert(1)> Via d'Esempio`,
      LEGAL_ENTITY_VAT: "IT<b>'0'</b>",
      LEGAL_REA: '<i>RM</i>',
    })
    for (const { html } of everyPage(hostile)) {
      expect(html).not.toMatch(/<script/i)
      expect(html).not.toMatch(/<img/i)
      expect(html).not.toContain('<b>')
      expect(html).not.toContain('<i>')
      expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Figli')
      expect(html).toContain('&quot;&gt;&lt;img src=x onerror=alert(1)&gt; Via d&#39;Esempio')
      expect(html).toContain('IT&lt;b&gt;&#39;0&#39;&lt;/b&gt;')
      expect(html).toContain('&lt;i&gt;RM&lt;/i&gt;')
    }
  })

  test('show DPO, PEC and REA only when configured', () => {
    for (const { html, page } of everyPage(entity())) {
      expect(html).not.toContain('id="dpo"')
      expect(html).not.toMatch(/Responsabile della protezione dei dati|Data Protection Officer/)
      expect(html).not.toContain('PEC')
      expect(html).not.toContain('REA')
      expect(html).not.toContain('dpo@')
      if (page === 'privacy') expect(html).toContain('mailto:privacy@example.com')
    }
    const complete = legalEntityFromEnvironment({
      ...environment(),
      LEGAL_DPO_EMAIL: 'dpo@example.com',
      LEGAL_PEC: 'esempio@pec.example.it',
      LEGAL_REA: 'RM-0000000',
    })
    for (const { html, page, locale } of everyPage(complete)) {
      expect(html).toContain('href="mailto:esempio@pec.example.it"')
      expect(html).toContain('RM-0000000')
      if (page === 'privacy') {
        expect(html).toContain('id="dpo"')
        expect(html).toContain('href="mailto:dpo@example.com"')
        expect(html).toContain(
          locale === 'it' ? 'Responsabile della protezione dei dati' : 'Data Protection Officer',
        )
      } else {
        expect(html).not.toContain('id="dpo"')
        // The withdrawal and complaint sections offer the PEC channel too.
        expect(html.match(/mailto:esempio@pec\.example\.it/g)?.length).toBeGreaterThanOrEqual(3)
      }
    }
  })

  test('merge the contact lines when support and privacy share a mailbox', () => {
    const shared = legalEntityFromEnvironment({
      ...environment(),
      LEGAL_PRIVACY_EMAIL: 'Support@Example.com',
    })
    const html = renderLegalPage('privacy', 'it', shared)
    expect(html).toContain('Assistenza e privacy')
    expect(html).not.toContain('Privacy ed esercizio dei diritti')
  })

  const required: Record<LegalPage, Record<LegalLocale, readonly string[]>> = {
    privacy: {
      it: [
        'Informativa sulla privacy',
        'Titolare del trattamento e contatti',
        'Quali dati trattiamo e da dove provengono',
        'Perché trattiamo i dati e su quale base giuridica',
        'Collegamenti bancari automatici',
        'Categorizzazione automatica e decisioni automatizzate',
        'A chi comunichiamo i dati',
        'Trasferimenti fuori dallo Spazio economico europeo',
        'Per quanto tempo conserviamo i dati',
        'Come proteggiamo i dati',
        'Cookie e memoria del browser',
        'Minori',
        'Cosa succede se non fornisci i dati',
        'I tuoi diritti',
        'Garante per la protezione dei dati personali',
        'Railway Corporation',
        'Scaleway SAS',
        'Stripe Payments Europe, Limited',
        'Enable Banking Oy',
        '__Secure-lilleri-hosted.*',
        'In vigore dal 5 ottobre 2026',
      ],
      en: [
        'Privacy notice',
        'Data controller and contact details',
        'What data we process and where it comes from',
        'Why we process data and on what legal basis',
        'Automatic bank connections',
        'Automatic categorisation and automated decisions',
        'Who we share data with',
        'Transfers outside the European Economic Area',
        'How long we keep data',
        'How we protect data',
        'Cookies and browser storage',
        'Children',
        'What happens if you do not provide data',
        'Your rights',
        'Garante per la protezione dei dati personali',
        'Effective from 5 October 2026',
        'the Italian version prevails',
      ],
    },
    terms: {
      it: [
        'Termini di servizio',
        'Piani e prezzi',
        '6,99 € al mese',
        "69,99 € all'anno",
        'Pagamento e rinnovo automatico',
        'Disdetta di Plus',
        'Diritto di recesso',
        'Modulo di recesso tipo',
        'Collegamenti bancari automatici',
        'Uso corretto del servizio',
        'Disponibilità, manutenzione e aggiornamenti',
        'Proprietà intellettuale',
        'Responsabilità',
        'Sospensione e chiusura',
        'Modifiche ai termini',
        'Assistenza e reclami',
        'Legge applicabile e foro competente',
        'articolo 66-bis del Codice del Consumo',
        'In vigore dal 5 ottobre 2026',
      ],
      en: [
        'Terms of service',
        'Plans and prices',
        '€6.99 a month',
        '€69.99 a year',
        'Payment and automatic renewal',
        'Cancelling Plus',
        'Right of withdrawal',
        'Model withdrawal form',
        'Automatic bank connections',
        'Acceptable use',
        'Availability, maintenance and updates',
        'Intellectual property',
        'Liability',
        'Suspension and termination',
        'Changes to these terms',
        'Support and complaints',
        'Governing law and jurisdiction',
        'Effective from 5 October 2026',
        'the Italian version prevails',
      ],
    },
  }

  test('render both locales as complete documents with headings, version and navigation', () => {
    for (const { html, page, locale } of everyPage(entity())) {
      const other = locale === 'it' ? 'en' : 'it'
      const otherPage = page === 'privacy' ? 'terms' : 'privacy'
      expect(html.startsWith('<!doctype html>\n<html lang=')).toBe(true)
      expect(html).toContain(`<html lang="${locale === 'it' ? 'it' : 'en-GB'}">`)
      expect(html).toContain('<meta charset="utf-8">')
      expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">')
      expect(html).toMatch(/<title>[^<]+ · Lilleri<\/title>/)
      expect(html).toContain('prefers-color-scheme:dark')
      expect(html).toContain('max-width:720px')
      expect(html).toContain(page === 'privacy' ? LEGAL_PRIVACY_VERSION : LEGAL_TERMS_VERSION)
      for (const text of required[page][locale]) expect(html, text).toContain(text)
      const path = (target: LegalPage, language: LegalLocale) =>
        `/legal/${target}${language === 'en' ? '/en' : ''}`
      expect(html).toContain(`href="${path(page, other)}"`)
      expect(html).toContain(`href="${path(otherPage, locale)}"`)
      // Every in-page link resolves to exactly one element, and the contents list every section.
      const ids = attributes(html, 'id')
      expect(new Set(ids).size).toBe(ids.length)
      const anchors = attributes(html, 'href').filter((href) => href.startsWith('#'))
      for (const anchor of anchors) expect(ids, anchor).toContain(anchor.slice(1))
      const sections = [...html.matchAll(/<section id="([^"]+)">/g)].map((match) => match[1])
      expect(sections.length).toBeGreaterThan(10)
      for (const id of sections) expect(anchors).toContain(`#${id}`)
    }
  })

  test('contain no scripts or external resources', () => {
    for (const { html } of everyPage(entity())) {
      expect(html).not.toMatch(/<script|<iframe|<img|<object|<embed|@import|url\(/i)
      expect(html).not.toMatch(/<link[^>]+rel="(?:stylesheet|preload|prefetch|icon)/i)
      expect(html).not.toMatch(/\son[a-z]+=/i)
      expect(html).not.toContain('http://')
      expect(attributes(html, 'src')).toEqual([])
      for (const href of attributes(html, 'href')) {
        if (href.startsWith('#') || href.startsWith('/legal/') || href.startsWith('mailto:'))
          continue
        const url = new URL(href)
        expect(url.protocol, href).toBe('https:')
        expect(ALLOWED_EXTERNAL_HOSTS.has(url.host), href).toBe(true)
      }
    }
  })
})

describe('legal page routes', () => {
  const stubContext: AppExtensionContext = {
    db: {} as AppExtensionContext['db'],
    service: () => {
      throw new Error('not used by legal pages')
    },
    principal: () => undefined,
    afterCommit: () => {},
  }

  test('serve the pre-rendered pages with strict headers', async () => {
    const value = entity()
    const app = Fastify()
    // Mirrors the API's global hook so the test proves the pages override it.
    app.addHook('onRequest', async (_request, reply) => {
      reply.header('Cache-Control', 'no-store')
    })
    await createLegalPagesExtension(value)(app, stubContext)
    try {
      for (const route of LEGAL_PAGE_ROUTES) {
        const response = await app.inject({ method: 'GET', url: route.path })
        expect(response.statusCode, route.path).toBe(200)
        expect(response.headers['content-type']).toBe('text/html; charset=utf-8')
        expect(response.headers['content-security-policy']).toBe(CSP)
        expect(response.headers['cache-control']).toBe('public, max-age=300')
        expect(response.headers['x-content-type-options']).toBe('nosniff')
        expect(response.headers['referrer-policy']).toBe('no-referrer')
        expect(response.body).toBe(renderLegalPage(route.page, route.locale, value))
        const head = await app.inject({ method: 'HEAD', url: route.path })
        expect(head.statusCode, route.path).toBe(200)
      }
      for (const url of ['/legal', '/legal/privacy/it', '/legal/terms/fr', '/legal/cookies'])
        expect((await app.inject({ method: 'GET', url })).statusCode, url).toBe(404)
      const post = await app.inject({ method: 'POST', url: '/legal/privacy' })
      expect(post.statusCode).toBe(404)
    } finally {
      await app.close()
    }
  })

  let handle: DatabaseHandle | undefined
  let api: Awaited<ReturnType<typeof createApp>> | undefined
  afterAll(async () => {
    await api?.close()
    await handle?.close()
  })

  test('are served by the API with public caching despite its no-store default', async () => {
    handle = await openDatabase({ driver: 'pglite' })
    api = await createApp({
      db: handle.db,
      profileId: `legal_pages_${randomUUID()}`,
      demoMode: true,
      seed: false,
      extensions: [createLegalPagesExtension(entity())],
    })
    const page = await api.inject({ method: 'GET', url: '/legal/terms/en' })
    expect(page.statusCode, page.body).toBe(200)
    expect(page.headers['cache-control']).toBe('public, max-age=300')
    expect(page.headers['content-security-policy']).toBe(CSP)
    expect(page.headers['content-type']).toBe('text/html; charset=utf-8')
    expect(page.body).toContain(LEGAL_TERMS_VERSION)
    const api404 = await api.inject({ method: 'GET', url: '/v1/does-not-exist' })
    expect(api404.headers['cache-control']).toBe('no-store')
  }, 30_000)
})
