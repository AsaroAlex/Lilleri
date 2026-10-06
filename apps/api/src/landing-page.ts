/**
 * Public home page of the hosted service: `/` (Italian) and `/en` (English), server-rendered with
 * no scripts so it is fast, indexable and works without the web app. The application itself lives
 * under `/app`; old links that returned people to `/?bank=…`, `/?billing=…` or `/?identity=…` are
 * forwarded there unchanged.
 *
 * Prices are never hardcoded: they come from the billing price catalogue (Stripe, cached) and are
 * omitted until known. The "Plus Fondatori" section appears only while Plus cannot be bought.
 */
import { readFile } from 'node:fs/promises'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AppExtension } from './app.js'
import { LEGAL_PAGE_ROUTES, type LegalEntity } from './legal-pages.js'
import { type Fragment, html, type SafeHtml, trusted } from './safe-html.js'
import { securityHeaders } from './web-app.js'

export type LandingLocale = 'it' | 'en'
export interface LandingPrice {
  readonly amount: string
  readonly currency: 'EUR'
}
export interface LandingPrices {
  readonly month: LandingPrice | null
  readonly year: LandingPrice | null
}
export interface LandingPageOptions {
  /** Exact public HTTPS origin, used for canonical, Open Graph and sitemap URLs. */
  readonly baseURL: string
  readonly entity: LegalEntity
  /** Repository brand SVG (monochrome); its fills are switched to `currentColor`. */
  readonly wordmarkSvg: string
  /** Absolute path of the Geist variable WOFF2 served at `/site/geist.woff2`. */
  readonly fontFile?: string
  /** Path of the web application (default `/app`). */
  readonly appPath?: `/${string}`
  /** Price catalogue; read in the background so a slow payment provider never delays the page. */
  readonly prices?: () => Promise<LandingPrices>
  /** True while Plus can be bought (bank provider configured, capacity left). */
  readonly plusOpen?: () => Promise<boolean>
}

const LEGACY_RETURN_PARAMETERS = ['bank', 'billing', 'identity', 'fondatori', 'plus']
const FONT_PATH = '/site/geist.woff2'
const PAGES: Readonly<Record<LandingLocale, string>> = { it: '/', en: '/en' }

export const LANDING_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

const STYLES = `
@font-face{font-family:"Geist";src:url("${FONT_PATH}") format("woff2");font-weight:100 900;font-display:swap}
:root{color-scheme:light;--bg:#F5F5F7;--surface:#FFFFFF;--fg:#1D1D1F;--muted:#515154;--faint:#66666B;--line:#D2D2D7;--accent:#005AC1;--on-accent:#FFFFFF;--soft:#EAF2FF;--good:#146C43;--bar:#005AC1}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;--bg:#0B0C0F;--surface:#15171C;--fg:#F5F5F7;--muted:#B8BBC4;--faint:#9297A3;--line:#2C3039;--accent:#79ACFF;--on-accent:#0B0C0F;--soft:#172B47;--good:#7CD9A6;--bar:#79ACFF}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.6 "Geist",system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;overflow-wrap:break-word}
a{color:var(--accent);text-underline-offset:3px}
a:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:6px}
.skip{position:absolute;left:-999px;top:8px;background:var(--surface);padding:8px 12px;border-radius:8px;z-index:2}
.skip:focus{left:16px}
.wrap{max-width:70rem;margin:0 auto;padding-inline:20px}
header.top{border-bottom:1px solid var(--line);background:var(--bg)}
.bar{display:flex;align-items:center;justify-content:space-between;gap:12px 20px;min-height:64px;flex-wrap:wrap;padding-block:10px}
.brand{display:inline-flex;color:var(--fg);line-height:0}
.brand svg{height:28px;width:auto}
nav.links{display:flex;align-items:center;gap:6px 18px;flex-wrap:wrap;font-size:.95rem}
nav.links a{color:var(--muted);text-decoration:none}
nav.links a:hover{color:var(--fg)}
@media (max-width:640px){nav.links a:not(.btn):not([hreflang]){display:none}.bar{flex-wrap:nowrap}}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 20px;border-radius:12px;font-weight:600;text-decoration:none;border:1px solid transparent;white-space:nowrap}
.btn.primary{background:var(--accent);color:var(--on-accent)}
.btn.secondary{background:var(--surface);color:var(--fg);border-color:var(--line)}
.btn.small{min-height:40px;padding:0 14px;font-size:.95rem}
nav.links a.btn.small{color:var(--fg)}
.hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:48px;align-items:center;padding-block:72px 64px}
@media (max-width:860px){.hero{grid-template-columns:minmax(0,1fr);gap:36px;padding-block:44px 40px}}
h1{font-size:clamp(2.2rem,5.2vw,3.6rem);line-height:1.06;letter-spacing:-.025em;margin:0 0 20px;text-wrap:balance;font-weight:650}
h2{font-size:clamp(1.6rem,3.2vw,2.25rem);line-height:1.15;letter-spacing:-.02em;margin:0 0 12px;text-wrap:balance;font-weight:650}
h3{font-size:1.1rem;margin:0 0 6px;font-weight:620}
.lead{font-size:1.2rem;color:var(--muted);margin:0 0 28px;max-width:36rem}
.actions{display:flex;gap:12px;flex-wrap:wrap}
.reassure{margin:16px 0 0;color:var(--faint);font-size:.93rem}
.preview{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:22px 22px 18px;box-shadow:0 18px 48px -28px rgba(0,40,100,.35)}
.eyebrow{margin:0 0 14px;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);font-weight:600}
.totals{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}
.totals div{background:var(--bg);border-radius:12px;padding:10px 12px}
.totals span{display:block;font-size:.85rem;color:var(--muted)}
.totals strong{font-size:1.25rem;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.totals .in strong{color:var(--good)}
ul.bars{list-style:none;margin:0;padding:0;display:grid;gap:12px}
ul.bars li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;font-size:.93rem}
ul.bars b{font-weight:600;font-variant-numeric:tabular-nums}
ul.bars i{grid-column:1 / -1;height:8px;border-radius:99px;background:var(--soft);position:relative;overflow:hidden}
ul.bars i::after{content:"";position:absolute;inset:0 auto 0 0;width:var(--w);background:var(--bar);border-radius:99px}
.preview .note{margin:16px 0 0;padding-top:12px;border-top:1px solid var(--line);font-size:.88rem;color:var(--muted)}
section{padding-block:56px;border-top:1px solid var(--line)}
.intro{color:var(--muted);max-width:40rem;margin:0 0 32px}
.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;counter-reset:step;padding:0;margin:0;list-style:none}
@media (max-width:860px){.steps{grid-template-columns:minmax(0,1fr)}}
.steps li{counter-increment:step}
.steps li::before{content:counter(step);display:inline-grid;place-items:center;width:32px;height:32px;border-radius:99px;background:var(--soft);color:var(--accent);font-weight:700;margin-bottom:12px}
.steps p,.trust p{margin:0;color:var(--muted)}
.plans{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:start}
@media (max-width:760px){.plans{grid-template-columns:minmax(0,1fr)}}
.plan{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:26px;display:flex;flex-direction:column;gap:14px}
.plan.plus{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}
.plan .name{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.plan .name h3{font-size:1.35rem;margin:0}
.badge{font-size:.78rem;font-weight:600;color:var(--accent);background:var(--soft);padding:3px 10px;border-radius:99px}
.price{font-size:1.9rem;font-weight:650;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin:0}
.price small{font-size:1rem;font-weight:500;color:var(--muted);letter-spacing:0}
.fine{font-size:.88rem;color:var(--faint);margin:0}
.plan ul{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.plan li{padding-left:28px;position:relative}
.plan li::before{content:"";position:absolute;left:4px;top:.55em;width:12px;height:7px;border-left:2px solid var(--good);border-bottom:2px solid var(--good);transform:rotate(-45deg)}
.plan .btn{align-self:flex-start;margin-top:4px}
.founders{background:var(--soft);border-radius:20px;padding:28px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center;margin-top:24px}
@media (max-width:760px){.founders{grid-template-columns:minmax(0,1fr)}}
.founders p{margin:0;color:var(--fg)}
.founders h3{font-size:1.25rem}
.trust{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 32px}
@media (max-width:760px){.trust{grid-template-columns:minmax(0,1fr)}}
.faq{display:grid;gap:10px;max-width:46rem}
details{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:4px 18px}
summary{cursor:pointer;font-weight:600;padding:12px 0;list-style-position:outside}
details p{margin:0 0 14px;color:var(--muted)}
footer{border-top:1px solid var(--line);padding-block:32px 48px;color:var(--faint);font-size:.9rem}
footer .row{display:flex;flex-wrap:wrap;gap:8px 20px;justify-content:space-between;align-items:center}
footer nav{display:flex;flex-wrap:wrap;gap:6px 18px}
footer a{color:var(--muted)}
footer .brand svg{height:22px}
footer p{margin:12px 0 0}
`

interface Copy {
  readonly lang: string
  readonly title: string
  readonly description: string
  readonly skip: string
  readonly nav: {
    readonly how: string
    readonly prices: string
    readonly trust: string
    readonly faq: string
    readonly signIn: string
  }
  readonly otherLanguage: string
  readonly heroTitle: string
  readonly heroLead: string
  readonly start: string
  readonly joinFounders: string
  readonly discoverPlus: string
  readonly reassure: string
  readonly preview: {
    readonly label: string
    readonly eyebrow: string
    readonly income: string
    readonly expenses: string
    readonly rows: readonly (readonly [string, string, string])[]
    readonly incomeValue: string
    readonly expensesValue: string
    readonly note: string
  }
  readonly howTitle: string
  readonly howIntro: string
  readonly steps: readonly (readonly [string, string])[]
  readonly pricesTitle: string
  readonly pricesIntro: string
  readonly gratis: {
    readonly name: string
    readonly price: string
    readonly period: string
    readonly features: readonly string[]
    readonly fine: string
  }
  readonly plus: {
    readonly name: string
    readonly badgeSoon: string
    readonly badgeOpen: string
    readonly features: readonly string[]
    readonly month: string
    readonly year: string
    readonly or: string
    readonly unknownPrice: string
    readonly fine: string
    readonly activate: string
  }
  readonly founders: {
    readonly title: string
    readonly body: string
    readonly promise: string
    readonly cta: string
  }
  readonly trustTitle: string
  readonly trustIntro: string
  readonly trust: readonly (readonly [string, string])[]
  readonly faqTitle: string
  readonly faq: readonly (readonly [string, string])[]
  readonly footer: {
    readonly privacy: string
    readonly terms: string
    readonly contact: string
    readonly vat: string
    readonly legalNav: string
  }
  readonly formatPrice: (price: LandingPrice) => string
}

const italianPrice = (price: LandingPrice) => `${price.amount.replace('.', ',')} €`
const englishPrice = (price: LandingPrice) => `€${price.amount}`

const COPY: Readonly<Record<LandingLocale, Copy>> = {
  it: {
    lang: 'it',
    title: 'Lilleri · I tuoi soldi, finalmente in ordine',
    description:
      'Lilleri riunisce conti, carte e movimenti in un solo posto, li divide per categoria e ti mostra dove vanno i tuoi soldi. Gratis per sempre; con Plus colleghi la tua banca.',
    skip: 'Vai al contenuto',
    nav: {
      how: 'Come funziona',
      prices: 'Prezzi',
      trust: 'Sicurezza',
      faq: 'Domande',
      signIn: 'Accedi',
    },
    otherLanguage: 'English',
    heroTitle: 'I tuoi soldi, finalmente in ordine.',
    heroLead:
      'Lilleri riunisce conti, carte e movimenti in un solo posto, li divide per categoria e ti mostra con chiarezza dove vanno i tuoi soldi ogni mese.',
    start: 'Inizia gratis',
    joinFounders: 'Entra nella lista Fondatori',
    discoverPlus: 'Scopri Plus',
    reassure: 'Gratis per sempre, senza carta di credito. Nessuna pubblicità.',
    preview: {
      label: 'Esempio di riepilogo mensile in Lilleri, con dati di prova',
      eyebrow: 'Esempio · Ottobre',
      income: 'Entrate',
      expenses: 'Uscite',
      incomeValue: '2.450,00 €',
      expensesValue: '1.732,40 €',
      rows: [
        ['Casa e utenze', '780,00 €', '72%'],
        ['Spesa alimentare', '312,60 €', '38%'],
        ['Trasporti', '146,20 €', '19%'],
        ['Abbonamenti', '64,97 €', '9%'],
      ],
      note: '3 movimenti da controllare · 4 pagamenti ricorrenti',
    },
    howTitle: 'Come funziona',
    howIntro: 'Bastano pochi minuti per avere un quadro chiaro, senza fogli di calcolo.',
    steps: [
      [
        'Aggiungi i tuoi conti',
        'Inseriscili a mano o importa l’estratto conto in CSV o Excel della tua banca. Con Plus colleghi la banca e i movimenti arrivano da soli.',
      ],
      [
        'Lilleri mette ordine',
        'Ogni movimento viene riconosciuto e messo nella categoria giusta. Le correzioni diventano regole che valgono anche in futuro.',
      ],
      [
        'Capisci e decidi',
        'Vedi entrate, uscite, abbonamenti e pagamenti ricorrenti, e cosa merita un controllo. Decidi tu, con i numeri davanti.',
      ],
    ],
    pricesTitle: 'Prezzi semplici',
    pricesIntro: 'Gratis non scade. Plus aggiunge il collegamento diretto con la tua banca.',
    gratis: {
      name: 'Gratis',
      price: '0 €',
      period: 'per sempre',
      features: [
        'Conti e movimenti inseriti a mano',
        'Importazione di file CSV ed Excel',
        'Categorie automatiche e regole personali',
        'Pagamenti ricorrenti e movimenti da controllare',
        'Esportazione completa e cancellazione dei dati',
      ],
      fine: 'Nessuna carta richiesta.',
    },
    plus: {
      name: 'Plus',
      badgeSoon: 'In arrivo',
      badgeOpen: 'Disponibile',
      features: [
        'Tutto quello che c’è in Gratis',
        'Collegamento con la tua banca, in sola lettura',
        'Saldi e movimenti aggiornati in automatico',
      ],
      month: 'al mese',
      year: 'all’anno',
      or: 'oppure',
      unknownPrice: 'Il prezzo è indicato nell’app prima del pagamento.',
      fine: 'IVA inclusa. Disdici quando vuoi: non ci saranno altri addebiti dopo il periodo già pagato.',
      activate: 'Attiva Plus',
    },
    founders: {
      title: 'Plus Fondatori',
      body: 'Attiviamo il collegamento con le banche un gruppo di persone alla volta. Crea un account gratuito e tocca «Avvisami» in Impostazioni › Abbonamento: ti scriviamo una sola email quando Plus è pronto per te.',
      promise:
        'Chi entra dalla lista mantiene il prezzo con cui attiva Plus finché resta abbonato.',
      cta: 'Entra nella lista',
    },
    trustTitle: 'Sicurezza e privacy',
    trustIntro: 'I tuoi dati finanziari sono tuoi. Lilleri si sostiene solo con gli abbonamenti.',
    trust: [
      [
        'Sola lettura',
        'Lilleri vede saldi e movimenti, ma non può spostare denaro né fare pagamenti.',
      ],
      [
        'Le credenziali restano alla banca',
        'Con Plus accedi sulla pagina della tua banca tramite Enable Banking, fornitore autorizzato all’accesso ai conti (PSD2). Lilleri non vede mai le tue credenziali.',
      ],
      [
        'Dati cifrati, cancellazione vera',
        'I dati finanziari più delicati sono cifrati con chiavi dedicate a ogni profilo. Quando cancelli l’account distruggiamo le chiavi e quei dati non sono più leggibili; le copie di sicurezza vengono sostituite entro 90 giorni.',
      ],
      [
        'Niente pubblicità, niente vendita di dati',
        'Non vendiamo i tuoi dati, non mostriamo pubblicità e non usiamo cookie di profilazione né strumenti di tracciamento.',
      ],
    ],
    faqTitle: 'Domande frequenti',
    faq: [
      [
        'Lilleri è davvero gratis?',
        'Sì. Gratis non scade e non chiede una carta. Paghi solo se scegli Plus per collegare direttamente la tua banca.',
      ],
      [
        'Quali banche posso collegare?',
        'Con Plus puoi collegare le banche e le carte italiane disponibili tramite Enable Banking. Prima di collegarti trovi nell’app l’elenco aggiornato. Con Gratis puoi comunque importare l’estratto conto di qualsiasi banca.',
      ],
      [
        'Lilleri può muovere i miei soldi?',
        'No. L’accesso è in sola lettura: Lilleri non può fare bonifici, pagamenti o altre operazioni.',
      ],
      [
        'Posso usarlo sul telefono?',
        'Sì. Lilleri funziona nel browser di telefono e computer e puoi aggiungerlo alla schermata Home come un’app.',
      ],
      [
        'Come esporto o cancello i miei dati?',
        'Da Impostazioni puoi esportare tutto e cancellare l’account in qualsiasi momento. La cancellazione è definitiva e chiude anche Plus, senza altri addebiti.',
      ],
    ],
    footer: {
      privacy: 'Informativa sulla privacy',
      terms: 'Termini di servizio',
      contact: 'Contatti',
      vat: 'P. IVA',
      legalNav: 'Informazioni legali',
    },
    formatPrice: italianPrice,
  },
  en: {
    lang: 'en-GB',
    title: 'Lilleri · Your money, finally in order',
    description:
      'Lilleri brings your accounts, cards and transactions together, sorts them into categories and shows where your money goes. Free forever; with Plus you connect your bank.',
    skip: 'Skip to content',
    nav: {
      how: 'How it works',
      prices: 'Pricing',
      trust: 'Security',
      faq: 'Questions',
      signIn: 'Sign in',
    },
    otherLanguage: 'Italiano',
    heroTitle: 'Your money, finally in order.',
    heroLead:
      'Lilleri brings your accounts, cards and transactions together in one place, sorts them into categories and shows clearly where your money goes every month.',
    start: 'Start for free',
    joinFounders: 'Join the Founders list',
    discoverPlus: 'Discover Plus',
    reassure: 'Free forever, no credit card. No advertising.',
    preview: {
      label: 'Example monthly summary in Lilleri, with sample data',
      eyebrow: 'Example · October',
      income: 'Income',
      expenses: 'Spending',
      incomeValue: '€2,450.00',
      expensesValue: '€1,732.40',
      rows: [
        ['Home and utilities', '€780.00', '72%'],
        ['Groceries', '€312.60', '38%'],
        ['Transport', '€146.20', '19%'],
        ['Subscriptions', '€64.97', '9%'],
      ],
      note: '3 transactions to review · 4 recurring payments',
    },
    howTitle: 'How it works',
    howIntro: 'A clear picture in a few minutes, without spreadsheets.',
    steps: [
      [
        'Add your accounts',
        'Enter them by hand or import your bank statement as CSV or Excel. With Plus you connect your bank and transactions arrive on their own.',
      ],
      [
        'Lilleri sorts things out',
        'Every transaction is recognised and put in the right category. Your corrections become rules that also apply in the future.',
      ],
      [
        'Understand and decide',
        'See income, spending, subscriptions and recurring payments, and what deserves a check. You decide, with the numbers in front of you.',
      ],
    ],
    pricesTitle: 'Simple pricing',
    pricesIntro: 'Free never expires. Plus adds a direct connection to your bank.',
    gratis: {
      name: 'Free',
      price: '€0',
      period: 'forever',
      features: [
        'Accounts and transactions entered by hand',
        'CSV and Excel file import',
        'Automatic categories and your own rules',
        'Recurring payments and transactions to review',
        'Full data export and deletion',
      ],
      fine: 'No card required.',
    },
    plus: {
      name: 'Plus',
      badgeSoon: 'Coming soon',
      badgeOpen: 'Available',
      features: [
        'Everything in Free',
        'Read-only connection to your bank',
        'Balances and transactions updated automatically',
      ],
      month: 'per month',
      year: 'per year',
      or: 'or',
      unknownPrice: 'The price is shown in the app before you pay.',
      fine: 'VAT included. Cancel any time: there are no further charges after the period already paid.',
      activate: 'Get Plus',
    },
    founders: {
      title: 'Plus Founders',
      body: 'We are opening bank connections to a group of people at a time. Create a free account and tap “Notify me” in Settings › Subscription: we will send you a single email when Plus is ready for you.',
      promise:
        'People who join from the list keep the price they start Plus with for as long as they stay subscribed.',
      cta: 'Join the list',
    },
    trustTitle: 'Security and privacy',
    trustIntro: 'Your financial data is yours. Lilleri is funded only by subscriptions.',
    trust: [
      [
        'Read-only',
        'Lilleri sees balances and transactions, but cannot move money or make payments.',
      ],
      [
        'Your credentials stay with your bank',
        'With Plus you sign in on your bank’s own page through Enable Banking, a provider authorised for account access (PSD2). Lilleri never sees your credentials.',
      ],
      [
        'Encrypted data, real deletion',
        'The most sensitive financial data is encrypted with keys dedicated to each profile. When you delete your account we destroy the keys and that data can no longer be read; backup copies are replaced within 90 days.',
      ],
      [
        'No advertising, no data selling',
        'We do not sell your data, show advertising or use profiling cookies or tracking tools.',
      ],
    ],
    faqTitle: 'Frequently asked questions',
    faq: [
      [
        'Is Lilleri really free?',
        'Yes. Free never expires and needs no card. You pay only if you choose Plus to connect your bank directly.',
      ],
      [
        'Which banks can I connect?',
        'With Plus you can connect the Italian banks and cards available through Enable Banking. The app shows the up-to-date list before you connect. With Free you can still import statements from any bank.',
      ],
      [
        'Can Lilleri move my money?',
        'No. Access is read-only: Lilleri cannot make transfers, payments or any other operation.',
      ],
      [
        'Can I use it on my phone?',
        'Yes. Lilleri works in the browser on phones and computers, and you can add it to your Home Screen like an app.',
      ],
      [
        'How do I export or delete my data?',
        'From Settings you can export everything and delete your account at any time. Deletion is final and also ends Plus, with no further charges.',
      ],
    ],
    footer: {
      privacy: 'Privacy notice',
      terms: 'Terms of service',
      contact: 'Contact',
      vat: 'VAT no.',
      legalNav: 'Legal information',
    },
    formatPrice: englishPrice,
  },
}

const LEGAL_LINKS: Readonly<Record<LandingLocale, { privacy: string; terms: string }>> = {
  it: { privacy: '/legal/privacy', terms: '/legal/terms' },
  en: { privacy: '/legal/privacy/en', terms: '/legal/terms/en' },
}

/** The repository's monochrome wordmark, recoloured to follow the text colour. */
export function inlineWordmark(svg: string, label: string): SafeHtml {
  const start = svg.indexOf('<svg')
  if (start < 0 || !svg.trimEnd().endsWith('</svg>')) throw new Error('Invalid wordmark SVG')
  const markup = svg
    .slice(start)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/fill="#[0-9A-Fa-f]{3,8}"/g, 'fill="currentColor"')
    .replace('<svg ', '<svg role="img" aria-label="__LABEL__" focusable="false" ')
  if (/<script|on[a-z]+=|href=/i.test(markup)) throw new Error('Unsafe wordmark SVG')
  return html`${trusted(markup.split('__LABEL__')[0] ?? '')}${label}${trusted(markup.split('__LABEL__')[1] ?? '')}`
}

const jsonLd = (value: unknown) =>
  trusted(
    JSON.stringify(value)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026'),
  )

export interface LandingState {
  readonly prices: LandingPrices | null
  readonly plusOpen: boolean
}

/** Renders one complete, self-contained HTML5 document. */
export function renderLandingPage(
  locale: LandingLocale,
  state: LandingState,
  options: Pick<LandingPageOptions, 'baseURL' | 'entity'> & {
    readonly wordmark: SafeHtml
    readonly appPath: string
  },
): string {
  const copy = COPY[locale]
  const other: LandingLocale = locale === 'it' ? 'en' : 'it'
  const app = options.appPath
  const canonical = new URL(PAGES[locale], options.baseURL).href
  const month = state.prices?.month ?? null
  const year = state.prices?.year ?? null
  const plusCta = state.plusOpen
    ? html`<a class="btn primary" href="${app}?plus=1">${copy.plus.activate}</a>`
    : html`<a class="btn primary" href="${app}?fondatori=1">${copy.joinFounders}</a>`
  const priceLine: Fragment =
    month && year
      ? html`<p class="price">${copy.formatPrice(month)} <small>${copy.plus.month}</small></p>
<p class="fine">${copy.plus.or} ${copy.formatPrice(year)} ${copy.plus.year}</p>`
      : html`<p class="fine">${copy.plus.unknownPrice}</p>`
  const offers = [
    { '@type': 'Offer', name: copy.gratis.name, price: '0', priceCurrency: 'EUR' },
    ...(month
      ? [
          {
            '@type': 'Offer',
            name: `${copy.plus.name} (${copy.plus.month})`,
            price: month.amount,
            priceCurrency: 'EUR',
          },
        ]
      : []),
    ...(year
      ? [
          {
            '@type': 'Offer',
            name: `${copy.plus.name} (${copy.plus.year})`,
            price: year.amount,
            priceCurrency: 'EUR',
          },
        ]
      : []),
  ]
  const entity = options.entity
  const body = html`<html lang="${copy.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${copy.title}</title>
<meta name="description" content="${copy.description}">
<meta name="theme-color" content="#F5F5F7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0B0C0F" media="(prefers-color-scheme: dark)">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="it" href="${new URL(PAGES.it, options.baseURL).href}">
<link rel="alternate" hreflang="en" href="${new URL(PAGES.en, options.baseURL).href}">
<link rel="alternate" hreflang="x-default" href="${new URL(PAGES.it, options.baseURL).href}">
<link rel="icon" href="/favicon.ico">
<link rel="apple-touch-icon" href="/icons/app-icon-180.png">
<link rel="preload" href="${FONT_PATH}" as="font" type="font/woff2" crossorigin>
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lilleri">
<meta property="og:title" content="${copy.title}">
<meta property="og:description" content="${copy.description}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${new URL('/icons/app-icon-512.png', options.baseURL).href}">
<meta property="og:locale" content="${locale === 'it' ? 'it_IT' : 'en_GB'}">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Lilleri',
    url: canonical,
    inLanguage: copy.lang,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description: copy.description,
    offers,
    publisher: { '@type': 'Organization', name: entity.name },
  })}</script>
<style>${trusted(STYLES)}</style>
</head>
<body>
<a class="skip" href="#main">${copy.skip}</a>
<header class="top"><div class="wrap bar">
<a class="brand" href="${PAGES[locale]}">${options.wordmark}</a>
<nav class="links" aria-label="Lilleri">
<a href="#come-funziona">${copy.nav.how}</a>
<a href="#prezzi">${copy.nav.prices}</a>
<a href="#sicurezza">${copy.nav.trust}</a>
<a href="#domande">${copy.nav.faq}</a>
<a href="${PAGES[other]}" hreflang="${COPY[other].lang}" lang="${COPY[other].lang}">${copy.otherLanguage}</a>
<a class="btn secondary small" href="${app}">${copy.nav.signIn}</a>
</nav>
</div></header>
<main id="main">
<div class="wrap hero">
<div>
<h1>${copy.heroTitle}</h1>
<p class="lead">${copy.heroLead}</p>
<div class="actions">
<a class="btn primary" href="${app}">${copy.start}</a>
${
  state.plusOpen
    ? html`<a class="btn secondary" href="#prezzi">${copy.discoverPlus}</a>`
    : html`<a class="btn secondary" href="#fondatori">${copy.joinFounders}</a>`
}
</div>
<p class="reassure">${copy.reassure}</p>
</div>
<figure class="preview" role="img" aria-label="${copy.preview.label}" style="margin:0">
<p class="eyebrow">${copy.preview.eyebrow}</p>
<div class="totals"><div class="in"><span>${copy.preview.income}</span><strong>${copy.preview.incomeValue}</strong></div><div><span>${copy.preview.expenses}</span><strong>${copy.preview.expensesValue}</strong></div></div>
<ul class="bars">${copy.preview.rows.map(
    ([label, value, width]) =>
      html`<li><span>${label}</span><b>${value}</b><i style="--w:${width}"></i></li>`,
  )}</ul>
<p class="note">${copy.preview.note}</p>
</figure>
</div>
<section id="come-funziona"><div class="wrap">
<h2>${copy.howTitle}</h2>
<p class="intro">${copy.howIntro}</p>
<ol class="steps">${copy.steps.map(([title, text]) => html`<li><h3>${title}</h3><p>${text}</p></li>`)}</ol>
</div></section>
<section id="prezzi"><div class="wrap">
<h2>${copy.pricesTitle}</h2>
<p class="intro">${copy.pricesIntro}</p>
<div class="plans">
<article class="plan">
<div class="name"><h3>${copy.gratis.name}</h3></div>
<p class="price">${copy.gratis.price} <small>${copy.gratis.period}</small></p>
<ul>${copy.gratis.features.map((feature) => html`<li>${feature}</li>`)}</ul>
<p class="fine">${copy.gratis.fine}</p>
<a class="btn secondary" href="${app}">${copy.start}</a>
</article>
<article class="plan plus">
<div class="name"><h3>${copy.plus.name}</h3><span class="badge">${state.plusOpen ? copy.plus.badgeOpen : copy.plus.badgeSoon}</span></div>
${priceLine}
<ul>${copy.plus.features.map((feature) => html`<li>${feature}</li>`)}</ul>
<p class="fine">${copy.plus.fine}</p>
${plusCta}
</article>
</div>
${
  state.plusOpen
    ? ''
    : html`<div class="founders" id="fondatori">
<div><h3>${copy.founders.title}</h3><p>${copy.founders.body}</p><p class="fine" style="margin-top:8px">${copy.founders.promise}</p></div>
<a class="btn primary" href="${app}?fondatori=1">${copy.founders.cta}</a>
</div>`
}
</div></section>
<section id="sicurezza"><div class="wrap">
<h2>${copy.trustTitle}</h2>
<p class="intro">${copy.trustIntro}</p>
<div class="trust">${copy.trust.map(([title, text]) => html`<div><h3>${title}</h3><p>${text}</p></div>`)}</div>
</div></section>
<section id="domande"><div class="wrap">
<h2>${copy.faqTitle}</h2>
<div class="faq">${copy.faq.map(
    ([question, answer]) => html`<details><summary>${question}</summary><p>${answer}</p></details>`,
  )}</div>
</div></section>
</main>
<footer><div class="wrap">
<div class="row">
<a class="brand" href="${PAGES[locale]}">${options.wordmark}</a>
<nav aria-label="${copy.footer.legalNav}">
<a href="${LEGAL_LINKS[locale].privacy}">${copy.footer.privacy}</a>
<a href="${LEGAL_LINKS[locale].terms}">${copy.footer.terms}</a>
<a href="mailto:${entity.contactEmail}">${copy.footer.contact}: ${entity.contactEmail}</a>
</nav>
</div>
<p>© ${new Date().getUTCFullYear()} ${entity.name} · ${entity.address} · ${copy.footer.vat} ${entity.vat}</p>
</div></footer>
</body>
</html>`
  return `<!doctype html>\n${body.value}\n`
}

const robots = (baseURL: string, appPath: string) =>
  `User-agent: *\nAllow: /\nDisallow: ${appPath}\nDisallow: /api/\nDisallow: /v1/\nDisallow: /connect/\nSitemap: ${new URL('/sitemap.xml', baseURL).href}\n`
const sitemap = (baseURL: string) => {
  const urls = ['/', '/en', ...LEGAL_PAGE_ROUTES.map((route) => route.path)]
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((path) => `<url><loc>${new URL(path, baseURL).href}</loc></url>`)
    .join('\n')}\n</urlset>\n`
}

/**
 * Registers `GET /`, `/en`, `/robots.txt`, `/sitemap.xml` and the page font. `/` forwards the
 * application's return links (`?bank=`, `?billing=`, `?identity=`, …) to the application path.
 */
export async function createLandingPageExtension(
  options: LandingPageOptions,
): Promise<AppExtension> {
  const base = new URL(options.baseURL)
  if (base.protocol !== 'https:' || options.baseURL !== base.origin)
    throw new Error('The landing page needs the exact HTTPS application origin')
  const appPath = options.appPath ?? '/app'
  const wordmark = inlineWordmark(options.wordmarkSvg, 'Lilleri')
  const font = options.fontFile ? await readFile(options.fontFile) : null
  let prices: LandingPrices | null = null
  let refreshing: Promise<void> | null = null
  const refreshPrices = () => {
    if (!options.prices || refreshing) return
    refreshing = options
      .prices()
      .then((value) => {
        if (value.month || value.year) prices = value
      })
      .catch(() => {})
      .finally(() => {
        refreshing = null
      })
  }
  refreshPrices()
  const plusOpen = async () => {
    try {
      return options.plusOpen ? await options.plusOpen() : false
    } catch {
      return false
    }
  }
  const page = (locale: LandingLocale) => async (request: FastifyRequest, reply: FastifyReply) => {
    const query = new URL(request.url, base).searchParams
    if (locale === 'it' && LEGACY_RETURN_PARAMETERS.some((name) => query.has(name)))
      return securityHeaders(reply)
        .header('Cache-Control', 'no-store')
        .redirect(`${appPath}?${query.toString()}`, 303)
    refreshPrices()
    const body = renderLandingPage(
      locale,
      { prices, plusOpen: await plusOpen() },
      { baseURL: base.origin, entity: options.entity, wordmark, appPath },
    )
    return securityHeaders(reply)
      .header('Content-Security-Policy', LANDING_CONTENT_SECURITY_POLICY)
      .header('Cache-Control', 'public, max-age=60')
      .header('Content-Language', locale)
      .type('text/html; charset=utf-8')
      .send(body)
  }
  return (app) => {
    app.route({ method: ['GET', 'HEAD'], url: PAGES.it, handler: page('it') })
    app.route({ method: ['GET', 'HEAD'], url: PAGES.en, handler: page('en') })
    app.get('/robots.txt', async (_request, reply) =>
      securityHeaders(reply)
        .header('Cache-Control', 'public, max-age=3600')
        .type('text/plain; charset=utf-8')
        .send(robots(base.origin, appPath)),
    )
    app.get('/sitemap.xml', async (_request, reply) =>
      securityHeaders(reply)
        .header('Cache-Control', 'public, max-age=3600')
        .type('application/xml; charset=utf-8')
        .send(sitemap(base.origin)),
    )
    if (font)
      app.get(FONT_PATH, async (_request, reply) =>
        securityHeaders(reply)
          .header('Cache-Control', 'public, max-age=604800')
          .type('font/woff2')
          .send(font),
      )
  }
}
