/**
 * Public legal pages: the privacy notice (GDPR Arts. 13-14) and the consumer terms of service,
 * in Italian (prevailing) and British English.
 *
 * LEGAL REVIEW REQUIRED BEFORE PUBLICATION. These texts were drafted from the product facts and
 * the documents in `docs/compliance/`; they must be reviewed and approved by Italian counsel
 * (privacy/GDPR and consumer law) before they are published or presented for acceptance. Change
 * the version identifiers whenever the substance changes, so that stored acceptance records keep
 * pointing at the text the person actually saw.
 *
 * The operator's identity is never hardcoded: it comes from validated environment variables and
 * every dynamic value is HTML-escaped. Each page is a standalone HTML document with inline CSS
 * only (no scripts, no external resources), rendered once when the routes are registered.
 */
import type { AppExtension } from './app.js'
import { type Fragment, html, SafeHtml } from './safe-html.js'

export const LEGAL_TERMS_VERSION = 'lilleri-terms-2026-10-05'
export const LEGAL_PRIVACY_VERSION = 'lilleri-privacy-2026-10-05'

export type LegalPage = 'privacy' | 'terms' | 'deletion'
export type LegalLocale = 'it' | 'en'

/** The company operating Lilleri, as configured by the operator. */
export interface LegalEntity {
  /** Ragione sociale (`LEGAL_ENTITY_NAME`). */
  readonly name: string
  /** Sede legale (`LEGAL_ENTITY_ADDRESS`). */
  readonly address: string
  /** Partita IVA / codice fiscale (`LEGAL_ENTITY_VAT`). */
  readonly vat: string
  /** Support and legal contact (`LEGAL_CONTACT_EMAIL`). */
  readonly contactEmail: string
  /** Privacy requests (`LEGAL_PRIVACY_EMAIL`); may equal the contact address. */
  readonly privacyEmail: string
  /** Data Protection Officer (`LEGAL_DPO_EMAIL`); the DPO section is shown only when set. */
  readonly dpoEmail?: string
  /** Posta elettronica certificata (`LEGAL_PEC`). */
  readonly pec?: string
  /** Iscrizione al Repertorio Economico Amministrativo (`LEGAL_REA`). */
  readonly rea?: string
}

type Environment = Readonly<Record<string, string | undefined>>

const MAX_FIELD_LENGTH = 300
const MAX_EMAIL_LENGTH = 254
/** Deliberately conservative: operator-configured mailboxes only, safe inside `mailto:`. */
const EMAIL =
  /^[A-Za-z0-9_+-]+(?:\.[A-Za-z0-9_+-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/

/** C0/C1 controls, line/paragraph separators, bidirectional overrides and the BOM. */
const forbiddenCodePoint = (code: number) =>
  code < 0x20 ||
  (code >= 0x7f && code <= 0x9f) ||
  code === 0x200e ||
  code === 0x200f ||
  (code >= 0x2028 && code <= 0x202e) ||
  (code >= 0x2066 && code <= 0x2069) ||
  code === 0xfeff

function configuredField(value: string | undefined, email: boolean): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_FIELD_LENGTH) return undefined
  for (const character of trimmed)
    if (forbiddenCodePoint(character.codePointAt(0) ?? 0)) return undefined
  if (email && (trimmed.length > MAX_EMAIL_LENGTH || !EMAIL.test(trimmed))) return undefined
  return trimmed
}

/**
 * Reads the operator identity from the environment. Any missing or invalid value fails with one
 * generic error that never echoes configuration values.
 */
export function legalEntityFromEnvironment(environment: Environment): LegalEntity {
  const required = (key: string, email = false) => {
    const value = configuredField(environment[key], email)
    if (value === undefined) throw new Error('Legal entity configuration is incomplete')
    return value
  }
  const optional = (key: string, email = false) => {
    const value = environment[key]
    return value === undefined || value.trim() === '' ? undefined : required(key, email)
  }
  const entity = {
    name: required('LEGAL_ENTITY_NAME'),
    address: required('LEGAL_ENTITY_ADDRESS'),
    vat: required('LEGAL_ENTITY_VAT'),
    contactEmail: required('LEGAL_CONTACT_EMAIL', true),
    privacyEmail: required('LEGAL_PRIVACY_EMAIL', true),
  }
  const dpoEmail = optional('LEGAL_DPO_EMAIL', true)
  const pec = optional('LEGAL_PEC', true)
  const rea = optional('LEGAL_REA')
  return {
    ...entity,
    ...(dpoEmail === undefined ? {} : { dpoEmail }),
    ...(pec === undefined ? {} : { pec }),
    ...(rea === undefined ? {} : { rea }),
  }
}

const mail = (address: string) => html`<a href="mailto:${address}">${address}</a>`
const external = (url: string, label: string) =>
  html`<a href="${url}" rel="noreferrer">${label}</a>`

const GARANTE_URL = 'https://www.garanteprivacy.it/'
const ENABLE_BANKING_URL = 'https://enablebanking.com/'
const STRIPE_PRIVACY_URL = { it: 'https://stripe.com/it/privacy', en: 'https://stripe.com/privacy' }

// ---------------------------------------------------------------------------------------------
// Shared page chrome.

const LEGAL_PATHS: Readonly<Record<LegalPage, Readonly<Record<LegalLocale, string>>>> = {
  privacy: { it: '/legal/privacy', en: '/legal/privacy/en' },
  terms: { it: '/legal/terms', en: '/legal/terms/en' },
  deletion: { it: '/legal/delete-account', en: '/legal/delete-account/en' },
}

/** The four public routes, Italian first. */
export const LEGAL_PAGE_ROUTES: readonly {
  readonly path: string
  readonly page: LegalPage
  readonly locale: LegalLocale
}[] = [
  { path: LEGAL_PATHS.privacy.it, page: 'privacy', locale: 'it' },
  { path: LEGAL_PATHS.privacy.en, page: 'privacy', locale: 'en' },
  { path: LEGAL_PATHS.terms.it, page: 'terms', locale: 'it' },
  { path: LEGAL_PATHS.terms.en, page: 'terms', locale: 'en' },
  { path: LEGAL_PATHS.deletion.it, page: 'deletion', locale: 'it' },
  { path: LEGAL_PATHS.deletion.en, page: 'deletion', locale: 'en' },
]

const CHROME = {
  it: {
    lang: 'it',
    name: 'Italiano',
    languageNav: 'Lingua',
    documentsNav: 'Documenti legali',
    contents: 'Indice',
    summary: 'In breve',
    version: 'Versione',
    effective: 'In vigore dal 5 ottobre 2026',
    privacy: 'Informativa sulla privacy',
    terms: 'Termini di servizio',
    deletion: 'Cancellare l’account',
    backToContents: "Torna all'indice",
    languageNote:
      'Questo documento è disponibile anche in inglese. In caso di differenze tra le due versioni, prevale la versione italiana.',
  },
  en: {
    lang: 'en-GB',
    name: 'English',
    languageNav: 'Language',
    documentsNav: 'Legal documents',
    contents: 'Contents',
    summary: 'In short',
    version: 'Version',
    effective: 'Effective from 5 October 2026',
    privacy: 'Privacy notice',
    terms: 'Terms of service',
    deletion: 'Deleting your account',
    backToContents: 'Back to contents',
    languageNote:
      'This English version is a translation provided for convenience. If there is any difference between the two versions, the Italian version prevails.',
  },
} as const

const STYLES = `
:root{color-scheme:light dark;--bg:#ffffff;--fg:#1c1c1e;--muted:#5a5a63;--line:#dcdce2;--panel:#f4f4f7;--accent:#0a58a8}
@media (prefers-color-scheme:dark){:root{--bg:#121214;--fg:#ececf1;--muted:#a9a9b3;--line:#33333a;--panel:#1c1c21;--accent:#80bbff}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;overflow-wrap:break-word}
.page{max-width:720px;margin:0 auto;padding:20px 16px 64px}
.top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;padding-bottom:12px;border-bottom:1px solid var(--line)}
.brand{font-weight:700;font-size:1.1rem;letter-spacing:.02em}
.lang,.docs{display:flex;flex-wrap:wrap;gap:4px 16px}
.lang .current{font-weight:600}
.docs{margin-top:12px;font-size:.95rem}
.docs a[aria-current=page]{font-weight:600;text-decoration:none;color:var(--fg)}
a{color:var(--accent);text-underline-offset:2px}
a:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:2px}
h1{font-size:1.9rem;line-height:1.25;margin:28px 0 6px}
h2{font-size:1.3rem;line-height:1.3;margin:40px 0 8px;scroll-margin-top:16px}
h3{font-size:1.05rem;line-height:1.35;margin:24px 0 6px}
p,ul,ol{margin:0 0 12px}
ul,ol{padding-left:1.4em}
li{margin:4px 0}
.meta{color:var(--muted);font-size:.95rem}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.88em;background:var(--panel);padding:1px 5px;border-radius:4px;overflow-wrap:anywhere}
.summary{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 20px 6px;margin:20px 0}
.summary-title{font-weight:700;margin-bottom:6px}
.toc{border:1px solid var(--line);border-radius:12px;padding:4px 20px 10px;margin:20px 0}
.toc h2{font-size:1rem;margin:12px 0 6px}
.toc ol{margin:0}
.table{overflow-x:auto;margin:12px 0}
table{width:100%;border-collapse:collapse;font-size:.95rem}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
th{background:var(--panel);font-weight:600}
.entity{padding:12px 16px;border-left:3px solid var(--accent);background:var(--panel);border-radius:0 8px 8px 0}
.form{border:1px dashed var(--line);border-radius:8px;padding:12px 16px;margin:12px 0}
.form ul{list-style:none;padding-left:0}
footer{margin-top:48px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:.95rem}
@media print{.lang,.docs,.toc{display:none}a{color:inherit}body{background:#ffffff;color:#000000}}
`

interface Section {
  readonly id: string
  readonly title: string
  readonly body: SafeHtml
}
interface LegalDocument {
  readonly title: string
  readonly intro: SafeHtml
  readonly summary: readonly SafeHtml[]
  readonly sections: readonly (Section | false)[]
}

const table = (head: readonly string[], rows: readonly (readonly Fragment[])[]) =>
  html`<div class="table"><table><thead><tr>${head.map((cell) => html`<th scope="col">${cell}</th>`)}</tr></thead><tbody>${rows.map(
    (row) => html`<tr>${row.map((cell) => html`<td>${cell}</td>`)}</tr>`,
  )}</tbody></table></div>`

const sameMailbox = (entity: LegalEntity) =>
  entity.contactEmail.toLowerCase() === entity.privacyEmail.toLowerCase()

function entityDetails(locale: LegalLocale, entity: LegalEntity) {
  const label =
    locale === 'it'
      ? {
          address: 'Sede legale',
          vat: 'Partita IVA / Codice fiscale',
          rea: 'Iscrizione REA',
          both: 'Assistenza e privacy',
          contact: 'Assistenza e comunicazioni legali',
          privacy: 'Privacy ed esercizio dei diritti',
          pec: 'PEC',
        }
      : {
          address: 'Registered office',
          vat: 'VAT number / Tax code',
          rea: 'REA registration (Italian business register)',
          both: 'Support and privacy',
          contact: 'Support and legal notices',
          privacy: 'Privacy and data protection rights',
          pec: 'PEC (Italian certified email)',
        }
  return html`<div class="entity"><p><strong>${entity.name}</strong><br>${label.address}: ${entity.address}<br>${label.vat}: ${entity.vat}${
    entity.rea ? html`<br>${label.rea}: ${entity.rea}` : ''
  }</p><ul>${
    sameMailbox(entity)
      ? html`<li>${label.both}: ${mail(entity.contactEmail)}</li>`
      : html`<li>${label.contact}: ${mail(entity.contactEmail)}</li><li>${label.privacy}: ${mail(entity.privacyEmail)}</li>`
  }${entity.pec ? html`<li>${label.pec}: ${mail(entity.pec)}</li>` : ''}</ul></div>`
}

// ---------------------------------------------------------------------------------------------
// Informativa sulla privacy (italiano, versione prevalente).

function privacyIt(entity: LegalEntity): LegalDocument {
  const privacy = mail(entity.privacyEmail)
  return {
    title: 'Informativa sulla privacy',
    intro: html`<p>Questa informativa spiega quali dati personali trattiamo quando usi Lilleri, perché lo facciamo, per quanto tempo li conserviamo e quali diritti hai. È resa ai sensi degli articoli 13 e 14 del Regolamento (UE) 2016/679 («GDPR») e del Codice in materia di protezione dei dati personali (d.lgs. 196/2003). Abbiamo cercato di scriverla in modo semplice: se qualcosa non è chiaro, scrivici a ${privacy}.</p>`,
    summary: [
      html`Usiamo i tuoi dati per fornirti Lilleri e per poco altro: sicurezza, pagamenti e obblighi di legge.`,
      html`Non vendiamo i tuoi dati, non mostriamo pubblicità e non usiamo cookie di profilazione né strumenti di analisi di terze parti.`,
      html`Categorie e analisi sono calcolate sui nostri server con regole deterministiche: i tuoi movimenti non vengono inviati a servizi esterni di intelligenza artificiale.`,
      html`Non vediamo mai le credenziali della tua banca. Il collegamento automatico, disponibile con Plus, avviene tramite Enable Banking, è in sola lettura e puoi revocarlo quando vuoi.`,
      html`Puoi esportare tutti i tuoi dati e cancellare l'account in autonomia dalle Impostazioni.`,
    ],
    sections: [
      {
        id: 'titolare',
        title: 'Titolare del trattamento e contatti',
        body: html`<p>Il titolare del trattamento è la società che gestisce Lilleri:</p>${entityDetails('it', entity)}<p>Per qualsiasi domanda su questa informativa o per esercitare i tuoi diritti scrivi a ${privacy}.</p>`,
      },
      entity.dpoEmail !== undefined && {
        id: 'dpo',
        title: 'Responsabile della protezione dei dati',
        body: html`<p>Abbiamo designato un responsabile della protezione dei dati (DPO), che puoi contattare all'indirizzo ${mail(entity.dpoEmail)} per tutte le questioni relative al trattamento dei tuoi dati e all'esercizio dei tuoi diritti.</p>`,
      },
      {
        id: 'dati',
        title: 'Quali dati trattiamo e da dove provengono',
        body: html`<h3>Dati che ci fornisci tu</h3>
<ul>
<li><strong>Dati dell'account</strong>: indirizzo email, password (conservata solo in forma cifrata irreversibile, mai in chiaro), lingua e fuso orario, versione dei termini che hai accettato con la data di accettazione e la tua dichiarazione di essere maggiorenne.</li>
<li><strong>Fattori di sicurezza facoltativi</strong>: se li attivi, le passkey (conserviamo solo la chiave pubblica; eventuali dati biometrici restano sul tuo dispositivo) e il secondo fattore di autenticazione con codice temporaneo (TOTP).</li>
<li><strong>Dati finanziari che inserisci o importi</strong>: conti creati manualmente, saldi, movimenti (data, importo, valuta, descrizione, controparte), file CSV o XLSX che carichi, regole, correzioni e preferenze.</li>
<li><strong>Messaggi</strong>: ciò che ci scrivi quando chiedi assistenza o eserciti i tuoi diritti.</li>
</ul>
<h3>Dati che riceviamo da altri, su tua richiesta</h3>
<ul>
<li><strong>Dalla tua banca, tramite Enable Banking</strong> (solo con Plus e solo per i conti che scegli di collegare): dati identificativi dei conti (per esempio l'IBAN), saldi e movimenti, oltre alle informazioni sullo stato dell'autorizzazione (banca, data di scadenza).</li>
<li><strong>Da Stripe</strong> (solo con Plus): stato dell'abbonamento e dei pagamenti, importi, date di rinnovo e identificativi tecnici di cliente e abbonamento. Il numero completo della tua carta è raccolto da Stripe: noi non lo riceviamo e non lo conserviamo.</li>
</ul>
<h3>Dati generati dall'uso del servizio</h3>
<ul>
<li><strong>Dati elaborati</strong>: categorie dei movimenti, spese ricorrenti, riepiloghi e analisi calcolati dal nostro server.</li>
<li><strong>Dati tecnici e di sicurezza</strong>: identificativi di sessione, indirizzo IP e tipo di browser associati a ciascuna sessione, eventi di sicurezza (per esempio accessi, tentativi non riusciti e conferme di identità).</li>
</ul>
<h3>Dati di altre persone</h3>
<p>I movimenti possono contenere dati di altre persone, per esempio il nome di chi ti ha inviato un bonifico o la causale di un pagamento. Li trattiamo solo per mostrarti e organizzare i tuoi movimenti, sulla base del nostro legittimo interesse a fornirti il servizio che hai richiesto, e non li usiamo per nessun altro scopo.</p>
<h3>Dati che possono rivelare informazioni delicate</h3>
<p>Lilleri non è pensato per trattare categorie particolari di dati, come quelli relativi alla salute, alle convinzioni religiose o all'appartenenza sindacale. Alcuni movimenti, però, potrebbero rivelarle indirettamente (per esempio un pagamento in farmacia o una quota associativa). Non usiamo questi movimenti per dedurre tue caratteristiche personali e non creiamo profili su di te: li trattiamo solo per mostrarteli e organizzarli. Puoi segnare singoli movimenti come privati per escluderli dalle analisi.</p>`,
      },
      {
        id: 'finalita',
        title: 'Perché trattiamo i dati e su quale base giuridica',
        body: html`<p>Trattiamo i tuoi dati solo per le finalità indicate qui sotto, ciascuna con la propria base giuridica (articolo 6 del GDPR).</p>
${table(
  ['Finalità', 'Base giuridica'],
  [
    [
      "Creare e gestire il tuo account, autenticarti e proteggere l'accesso (verifica dell'email, passkey, secondo fattore, recupero della password)",
      'Esecuzione del contratto (art. 6, par. 1, lett. b)',
    ],
    [
      'Fornirti Lilleri: conti manuali, importazione di file, categorizzazione automatica, regole, analisi, esportazione e cancellazione dei dati',
      'Esecuzione del contratto (art. 6, par. 1, lett. b)',
    ],
    [
      'Collegare automaticamente i tuoi conti bancari, quando lo richiedi (Plus)',
      'Esecuzione del contratto (art. 6, par. 1, lett. b)',
    ],
    [
      "Gestire l'abbonamento Plus: pagamenti, rinnovi, disdette e rimborsi",
      'Esecuzione del contratto (art. 6, par. 1, lett. b)',
    ],
    [
      'Tenere la contabilità e adempiere agli obblighi fiscali',
      'Obbligo di legge (art. 6, par. 1, lett. c)',
    ],
    [
      "Inviarti comunicazioni di servizio: verifica dell'email, reimpostazione della password, avvisi di sicurezza, conferme di acquisto, modifiche ai termini",
      'Esecuzione del contratto (art. 6, par. 1, lett. b) e, per le comunicazioni richieste dalla legge, obbligo di legge (art. 6, par. 1, lett. c)',
    ],
    [
      'Rispondere alle richieste di assistenza e alle richieste di esercizio dei diritti',
      'Esecuzione del contratto (art. 6, par. 1, lett. b); per i diritti privacy, obbligo di legge (art. 6, par. 1, lett. c)',
    ],
    [
      'Proteggere il servizio e gli utenti: prevenire abusi, accessi non autorizzati e frodi, limitare i tentativi ripetuti, tenere registri di sicurezza',
      'Legittimo interesse (art. 6, par. 1, lett. f)',
    ],
    [
      'Trattare i dati di altre persone presenti nei tuoi movimenti, solo per mostrarteli',
      'Legittimo interesse (art. 6, par. 1, lett. f)',
    ],
    [
      'Accertare, esercitare o difendere un diritto in sede giudiziaria',
      'Legittimo interesse (art. 6, par. 1, lett. f)',
    ],
  ],
)}
<h3>I nostri legittimi interessi</h3>
<p>Quando ci basiamo sul legittimo interesse, il nostro interesse è mantenere Lilleri sicuro e funzionante, proteggere te e gli altri utenti da accessi non autorizzati e abusi, tutelare i nostri diritti e fornirti il servizio che hai chiesto anche quando i tuoi movimenti contengono dati di altre persone. Abbiamo valutato che questi interessi non prevalgono sui tuoi diritti perché usiamo solo i dati necessari, li conserviamo per poco tempo e non li usiamo per altri scopi. Puoi chiederci maggiori informazioni su questa valutazione e opporti al trattamento (vedi «I tuoi diritti»).</p>
<h3>Nessun marketing basato sul consenso</h3>
<p>Oggi non inviamo comunicazioni promozionali e non trattiamo dati sulla base del tuo consenso. Se in futuro volessimo farlo, te lo chiederemo separatamente: potrai rifiutare senza conseguenze sul servizio e revocare il consenso in qualsiasi momento.</p>
<h3>L'autorizzazione al collegamento bancario è un'altra cosa</h3>
<p>Quando colleghi un conto, autorizzi Enable Banking e la tua banca ad accedere ai dati del conto: è il «consenso esplicito» previsto dalla normativa sui servizi di pagamento (direttiva (UE) 2015/2366, «PSD2»). Si tratta di un'autorizzazione di natura contrattuale, distinta dalle basi giuridiche privacy indicate sopra, come chiarito dalle Linee guida 06/2020 del Comitato europeo per la protezione dei dati (EDPB). Puoi revocarla in qualsiasi momento.</p>`,
      },
      {
        id: 'collegamenti',
        title: 'Collegamenti bancari automatici',
        body: html`<p>Con Plus puoi collegare i tuoi conti bancari in modo automatico. Il servizio di accesso ai conti è prestato da <strong>Enable Banking Oy</strong> (Finlandia), prestatore di servizi di informazione sui conti registrato presso l'autorità di vigilanza finanziaria finlandese (Finanssivalvonta, FIN-FSA).</p>
<ul>
<li>Durante il collegamento Enable Banking ti mostra i propri termini. Per il servizio che ti presta e per l'autorizzazione che raccoglie, Enable Banking agisce come titolare autonomo del trattamento.</li>
<li>Ti autentichi direttamente presso la tua banca, con l'autenticazione forte prevista dalla banca stessa. Lilleri non vede e non conserva mai le tue credenziali bancarie.</li>
<li>L'accesso è in sola lettura e riguarda conti, saldi e movimenti. Lilleri non può disporre pagamenti né spostare denaro.</li>
<li>L'autorizzazione dura al massimo 180 giorni, secondo le regole della tua banca; se vuoi continuare, ti chiederemo di rinnovarla.</li>
<li>Puoi revocare il collegamento in qualsiasi momento dall'app e anche direttamente presso la tua banca.</li>
<li>Lilleri riceve i dati come destinatario da te scelto e li tratta come descritto in questa informativa.</li>
</ul>
<p>Maggiori informazioni sul trattamento svolto da Enable Banking sono disponibili sul sito ${external(ENABLE_BANKING_URL, 'enablebanking.com')}.</p>`,
      },
      {
        id: 'automatizzati',
        title: 'Categorizzazione automatica e decisioni automatizzate',
        body: html`<p>Lilleri assegna automaticamente una categoria ai movimenti, riconosce le spese ricorrenti e calcola riepiloghi. Lo fa sui nostri server con regole e calcoli deterministici: a parità di dati, il risultato è sempre lo stesso.</p>
<p>Si tratta di un trattamento automatizzato, ma non è una decisione che produce effetti giuridici che ti riguardano o che incide in modo analogo significativamente sulla tua persona (articolo 22 del GDPR): serve solo a organizzare le informazioni per te. Puoi correggere ogni categoria e creare regole personali. Non usiamo i tuoi dati per valutare il tuo merito creditizio, non li inviamo a servizi esterni di intelligenza artificiale e non li usiamo per addestrare modelli.</p>`,
      },
      {
        id: 'destinatari',
        title: 'A chi comunichiamo i dati',
        body: html`<p>Non vendiamo i tuoi dati e non li condividiamo con inserzionisti. Li comunichiamo solo ai soggetti che ci aiutano a fornire il servizio, nei limiti di ciò che serve a ciascuno:</p>
${table(
  ['Soggetto', 'Ruolo', 'Attività', 'Luogo del trattamento'],
  [
    [
      'Railway Corporation',
      'Responsabile del trattamento (art. 28 GDPR)',
      "Hosting dell'applicazione e del database",
      'Regione EU West (Amsterdam, Paesi Bassi); società con sede negli Stati Uniti',
    ],
    ['Scaleway SAS', 'Responsabile del trattamento', 'Invio delle email di servizio', 'Francia'],
    [
      'Stripe Payments Europe, Limited',
      "Responsabile del trattamento per l'elaborazione dei pagamenti; per alcune finalità Stripe agisce come titolare autonomo (per esempio per adempiere ai propri obblighi di legge e prevenire le frodi)",
      "Pagamenti e gestione dell'abbonamento Plus, portale di fatturazione",
      'Irlanda',
    ],
    [
      'Enable Banking Oy',
      "Prestatore di servizi di informazione sui conti; titolare autonomo per il servizio che ti presta e per l'autorizzazione che raccoglie",
      'Collegamenti bancari automatici (Plus)',
      'Finlandia',
    ],
  ],
)}
<p>Quando necessario, possono ricevere i dati anche: il nostro personale autorizzato, vincolato alla riservatezza e con accesso limitato a quanto serve per il proprio ruolo; consulenti professionali (per esempio commercialisti o avvocati) tenuti al segreto professionale; autorità pubbliche e giudiziarie, quando lo prevede la legge.</p>
<p>Per i trattamenti di cui sono titolari autonomi, Stripe ed Enable Banking forniscono le proprie informative: ${external(STRIPE_PRIVACY_URL.it, 'informativa privacy di Stripe')} e ${external(ENABLE_BANKING_URL, 'sito di Enable Banking')}.</p>
<p>L'elenco aggiornato dei responsabili del trattamento è disponibile su richiesta scrivendo a ${privacy}.</p>`,
      },
      {
        id: 'trasferimenti',
        title: 'Trasferimenti fuori dallo Spazio economico europeo',
        body: html`<p>I dati del servizio sono conservati nell'Unione europea. Alcuni fornitori, però, hanno sede fuori dallo Spazio economico europeo (SEE) o fanno parte di gruppi internazionali: Railway Corporation, per esempio, è una società statunitense. Quando un fornitore può accedere ai dati da un paese extra SEE, il trasferimento avviene solo con le garanzie previste dal capo V del GDPR: una decisione di adeguatezza della Commissione europea (come quella relativa al Data Privacy Framework UE-USA, per i fornitori certificati) oppure le clausole contrattuali standard approvate dalla Commissione (articolo 46 del GDPR), con le eventuali misure supplementari necessarie.</p>
<p>Puoi chiederci informazioni sulle garanzie applicate e ottenerne copia scrivendo a ${privacy}.</p>`,
      },
      {
        id: 'conservazione',
        title: 'Per quanto tempo conserviamo i dati',
        body: html`${table(
          ['Dati', 'Durata della conservazione'],
          [
            [
              "Dati dell'account e dati finanziari (conti, movimenti, categorie, regole, analisi)",
              "Finché l'account esiste. Puoi eliminare prima singoli conti o fonti di dati. Quando cancelli l'account vengono eliminati, insieme alle chiavi di cifratura del tuo profilo.",
            ],
            [
              'Copia originale dei dati ricevuti dalla banca o dei file importati',
              '30 giorni dalla ricezione; restano i movimenti già elaborati.',
            ],
            [
              'Sessioni di accesso',
              "Terminano quando esci e comunque al più tardi dopo 30 giorni; i relativi dati vengono eliminati con l'account.",
            ],
            [
              'Registri tecnici di sicurezza',
              'Per un periodo breve, al massimo 6 mesi, salvo che servano ad accertare uno specifico incidente.',
            ],
            [
              'Documenti contabili e fiscali relativi a Plus',
              '10 anni, come richiesto dalla legge (articolo 2220 del codice civile). Stripe conserva i propri dati secondo la propria informativa.',
            ],
            [
              'Richieste di assistenza e di esercizio dei diritti',
              'Fino a 24 mesi dalla chiusura della richiesta.',
            ],
            [
              'Copie di sicurezza (backup)',
              'I backup cifrati vengono sostituiti a rotazione: dopo la cancellazione, i tuoi dati possono restarvi fino a 90 giorni. Non li usiamo per altri scopi e vi accediamo solo per ripristinare il servizio in caso di guasto.',
            ],
          ],
        )}
<p>Alla scadenza di questi termini i dati vengono cancellati o resi anonimi. Possiamo conservarli più a lungo solo se è necessario per accertare, esercitare o difendere un diritto in una controversia già sorta o per adempiere a un ordine di un'autorità, e solo per i dati interessati.</p>`,
      },
      {
        id: 'sicurezza',
        title: 'Come proteggiamo i dati',
        body: html`<ul>
<li>Tutte le comunicazioni tra il tuo dispositivo e i nostri server sono cifrate (TLS).</li>
<li>Alcuni dati finanziari, tra i più delicati, sono cifrati anche nel database con chiavi specifiche per ogni profilo, conservate separatamente dal database. Quando cancelli l'account queste chiavi vengono distrutte e quei dati non sono più leggibili (cancellazione crittografica).</li>
<li>Ogni profilo è isolato dagli altri a livello di database: una richiesta può leggere solo i dati del profilo a cui è autorizzata.</li>
<li>Le password sono conservate solo in forma cifrata irreversibile e puoi proteggere l'accesso con passkey e con un secondo fattore.</li>
<li>L'accesso del nostro personale ai sistemi è limitato a chi ne ha bisogno per il proprio ruolo.</li>
</ul>
<p>Nessun sistema è sicuro al 100%. Se si verificasse una violazione dei dati personali che presenta un rischio elevato per i tuoi diritti, ti informeremo senza ingiustificato ritardo, come previsto dall'articolo 34 del GDPR.</p>`,
      },
      {
        id: 'cookie',
        title: 'Cookie e memoria del browser',
        body: html`<p>Lilleri usa solo strumenti tecnici strettamente necessari, tutti di prima parte:</p>
${table(
  ['Nome', 'Tipo', 'A cosa serve', 'Durata'],
  [
    [
      html`<code>__Secure-lilleri-hosted.*</code>`,
      'Cookie tecnici impostati dalla libreria di autenticazione',
      "Mantenere l'accesso e completare le verifiche di sicurezza (per esempio il secondo fattore). Sono protetti (Secure, HttpOnly, SameSite=Strict) e non sono leggibili da script.",
      'Fino alla disconnessione, al massimo 30 giorni',
    ],
    [
      html`<code>lilleri.display-preferences.v1</code>`,
      'Memoria locale del browser (localStorage)',
      'Ricordare la lingua e il fuso orario di visualizzazione. Non contiene dati finanziari né identificativi.',
      'Finché non la cancelli dal browser',
    ],
    [
      html`<code>lilleri-encrypted-read-cache-v1</code>`,
      'Database del browser (IndexedDB)',
      "Conservare una copia cifrata e temporanea dell'ultima panoramica, consultabile in sola lettura se la connessione cade. La chiave per leggerla resta solo nella memoria della pagina aperta.",
      "Leggibile al massimo per 15 minuti; viene eliminata alla scadenza, quando esci o alla successiva apertura dell'app",
    ],
  ],
)}
<p>Non usiamo cookie di profilazione o pubblicitari, né strumenti di analisi statistica o di tracciamento di terze parti. Gli strumenti tecnici strettamente necessari a fornire un servizio che hai richiesto non richiedono il tuo consenso (articolo 122 del Codice privacy e Linee guida del Garante sui cookie e altri strumenti di tracciamento del 10 giugno 2021): per questo non ti mostriamo un banner dei cookie. Se in futuro volessimo usare strumenti diversi, ti chiederemo prima il consenso.</p>
<p>Durante il pagamento e nel portale di fatturazione (Stripe) e durante il collegamento bancario (Enable Banking e la tua banca) visiti pagine di terzi, che possono usare i propri cookie secondo le rispettive informative. Le pagine legali come questa non usano cookie né script.</p>`,
      },
      {
        id: 'minori',
        title: 'Minori',
        body: html`<p>Lilleri è riservato ai maggiorenni. Al momento della registrazione dichiari di avere almeno 18 anni. Non raccogliamo consapevolmente dati di minori: se veniamo a sapere che un account appartiene a un minore, lo chiudiamo e cancelliamo i relativi dati. Se pensi che un minore si sia registrato, scrivici a ${privacy}.</p>`,
      },
      {
        id: 'conferimento',
        title: 'Cosa succede se non fornisci i dati',
        body: html`<ul>
<li>Email, password, dichiarazione di maggiore età e accettazione dei termini sono necessarie per creare l'account: senza questi dati non possiamo registrarti.</li>
<li>I dati finanziari li inserisci tu, quando e se vuoi; senza di essi Lilleri non ha informazioni da organizzare per te.</li>
<li>Il collegamento bancario automatico, le passkey e il secondo fattore sono facoltativi.</li>
<li>Per acquistare Plus servono i dati di pagamento richiesti da Stripe e quelli che la legge richiede per la fatturazione; senza, non possiamo attivare l'abbonamento.</li>
</ul>`,
      },
      {
        id: 'diritti',
        title: 'I tuoi diritti',
        body: html`<p>In qualsiasi momento, e gratuitamente, puoi:</p>
<ul>
<li><strong>accedere</strong> ai tuoi dati e riceverne copia (art. 15 GDPR);</li>
<li><strong>rettificarli</strong> se sono inesatti o incompleti (art. 16): gran parte dei dati puoi modificarli direttamente nell'app;</li>
<li>ottenerne la <strong>cancellazione</strong> (art. 17): puoi eliminare l'account in autonomia dalle Impostazioni;</li>
<li>chiedere la <strong>limitazione</strong> del trattamento (art. 18);</li>
<li>ricevere i dati che ci hai fornito in un formato strutturato e leggibile da dispositivo automatico (<strong>portabilità</strong>, art. 20): puoi scaricarli in autonomia dalle Impostazioni, in formato JSON o in un archivio ZIP;</li>
<li><strong>opporti</strong> ai trattamenti basati sul nostro legittimo interesse, per motivi legati alla tua situazione particolare (art. 21);</li>
<li><strong>revocare</strong> in qualsiasi momento un consenso eventualmente prestato, senza pregiudicare la liceità del trattamento svolto prima della revoca (art. 7, par. 3). Puoi inoltre revocare in qualsiasi momento il collegamento bancario dall'app.</li>
</ul>
<p>Per le richieste che non puoi gestire direttamente nell'app scrivi a ${privacy}. Ti risponderemo entro un mese dal ricevimento della richiesta; se è particolarmente complessa o se le richieste sono numerose, il termine può essere prorogato di altri due mesi e, in tal caso, te lo comunicheremo entro il primo mese (articolo 12 del GDPR). Potremmo chiederti di confermare la tua identità prima di rispondere.</p>
<h3>Reclamo all'autorità di controllo</h3>
<p>Se ritieni che il trattamento dei tuoi dati violi la normativa, puoi proporre reclamo al Garante per la protezione dei dati personali (${external(GARANTE_URL, 'www.garanteprivacy.it')}) oppure all'autorità di controllo dello Stato dell'Unione europea in cui risiedi abitualmente, lavori o in cui si è verificata la presunta violazione (articolo 77 del GDPR). Resta salva la possibilità di rivolgerti al giudice.</p>`,
      },
      {
        id: 'modifiche',
        title: 'Modifiche a questa informativa',
        body: html`<p>Possiamo aggiornare questa informativa, per esempio se cambiano il servizio, i fornitori o la normativa. In alto trovi sempre la versione e la data di entrata in vigore. Ti informeremo delle modifiche rilevanti in app o via email prima che si applichino. Se in futuro volessimo usare i tuoi dati per finalità nuove e diverse da quelle indicate, te lo comunicheremo prima e, quando necessario, ti chiederemo il consenso.</p>`,
      },
    ],
  }
}

// ---------------------------------------------------------------------------------------------
// Privacy notice (British English translation).

function privacyEn(entity: LegalEntity): LegalDocument {
  const privacy = mail(entity.privacyEmail)
  return {
    title: 'Privacy notice',
    intro: html`<p>This notice explains which personal data we process when you use Lilleri, why we do so, how long we keep it and what rights you have. It is provided under Articles 13 and 14 of Regulation (EU) 2016/679 (the “GDPR”) and the Italian Personal Data Protection Code (Legislative Decree 196/2003). We have tried to write it in plain language: if anything is unclear, write to us at ${privacy}.</p>`,
    summary: [
      html`We use your data to provide Lilleri and for little else: security, payments and legal obligations.`,
      html`We do not sell your data, show advertising or use profiling cookies or third-party analytics tools.`,
      html`Categories and insights are calculated on our servers using deterministic rules: your transactions are not sent to external artificial intelligence services.`,
      html`We never see your bank credentials. Automatic connection, available with Plus, goes through Enable Banking, is read-only and can be revoked whenever you like.`,
      html`You can export all your data and delete your account yourself from Settings.`,
    ],
    sections: [
      {
        id: 'titolare',
        title: 'Data controller and contact details',
        body: html`<p>The data controller is the company that operates Lilleri:</p>${entityDetails('en', entity)}<p>For any question about this notice or to exercise your rights, write to ${privacy}.</p>`,
      },
      entity.dpoEmail !== undefined && {
        id: 'dpo',
        title: 'Data Protection Officer',
        body: html`<p>We have appointed a Data Protection Officer (DPO), whom you can contact at ${mail(entity.dpoEmail)} about any matter relating to the processing of your data and the exercise of your rights.</p>`,
      },
      {
        id: 'dati',
        title: 'What data we process and where it comes from',
        body: html`<h3>Data you give us</h3>
<ul>
<li><strong>Account data</strong>: email address, password (stored only in irreversibly hashed form, never in plain text), language and time zone, the version of the terms you accepted with the date of acceptance, and your declaration that you are an adult.</li>
<li><strong>Optional security factors</strong>: if you enable them, passkeys (we store only the public key; any biometric data stays on your device) and two-factor authentication with a time-based code (TOTP).</li>
<li><strong>Financial data you enter or import</strong>: manually created accounts, balances, transactions (date, amount, currency, description, counterparty), CSV or XLSX files you upload, rules, corrections and preferences.</li>
<li><strong>Messages</strong>: what you write to us when you ask for support or exercise your rights.</li>
</ul>
<h3>Data we receive from others, at your request</h3>
<ul>
<li><strong>From your bank, through Enable Banking</strong> (only with Plus and only for the accounts you choose to connect): account identifiers (for example the IBAN), balances and transactions, together with information on the status of the authorisation (bank, expiry date).</li>
<li><strong>From Stripe</strong> (only with Plus): subscription and payment status, amounts, renewal dates and technical customer and subscription identifiers. Your full card number is collected by Stripe: we do not receive or store it.</li>
</ul>
<h3>Data generated by your use of the service</h3>
<ul>
<li><strong>Derived data</strong>: transaction categories, recurring expenses, summaries and insights calculated by our server.</li>
<li><strong>Technical and security data</strong>: session identifiers, the IP address and browser type associated with each session, and security events (for example sign-ins, failed attempts and identity confirmations).</li>
</ul>
<h3>Data about other people</h3>
<p>Transactions may contain data about other people, for example the name of someone who sent you a transfer or the reference of a payment. We process it only to show and organise your transactions, on the basis of our legitimate interest in providing the service you asked for, and we do not use it for any other purpose.</p>
<h3>Data that may reveal sensitive information</h3>
<p>Lilleri is not designed to process special categories of data, such as data concerning health, religious beliefs or trade union membership. Some transactions may nevertheless reveal such information indirectly (for example a payment at a pharmacy or a membership fee). We do not use these transactions to infer your personal characteristics and we do not build profiles about you: we process them only to show and organise them for you. You can mark individual transactions as private to exclude them from insights.</p>`,
      },
      {
        id: 'finalita',
        title: 'Why we process data and on what legal basis',
        body: html`<p>We process your data only for the purposes listed below, each with its own legal basis (Article 6 GDPR).</p>
${table(
  ['Purpose', 'Legal basis'],
  [
    [
      'Creating and managing your account, authenticating you and protecting access (email verification, passkeys, second factor, password recovery)',
      'Performance of the contract (Art. 6(1)(b))',
    ],
    [
      'Providing Lilleri: manual accounts, file import, automatic categorisation, rules, insights, data export and deletion',
      'Performance of the contract (Art. 6(1)(b))',
    ],
    [
      'Connecting your bank accounts automatically, when you ask us to (Plus)',
      'Performance of the contract (Art. 6(1)(b))',
    ],
    [
      'Managing the Plus subscription: payments, renewals, cancellations and refunds',
      'Performance of the contract (Art. 6(1)(b))',
    ],
    ['Keeping accounts and meeting tax obligations', 'Legal obligation (Art. 6(1)(c))'],
    [
      'Sending you service messages: email verification, password reset, security alerts, purchase confirmations, changes to the terms',
      'Performance of the contract (Art. 6(1)(b)) and, for messages required by law, legal obligation (Art. 6(1)(c))',
    ],
    [
      'Answering support requests and requests to exercise your rights',
      'Performance of the contract (Art. 6(1)(b)); for data protection rights, legal obligation (Art. 6(1)(c))',
    ],
    [
      'Protecting the service and its users: preventing abuse, unauthorised access and fraud, limiting repeated attempts, keeping security logs',
      'Legitimate interest (Art. 6(1)(f))',
    ],
    [
      'Processing data about other people contained in your transactions, only to show it to you',
      'Legitimate interest (Art. 6(1)(f))',
    ],
    ['Establishing, exercising or defending legal claims', 'Legitimate interest (Art. 6(1)(f))'],
  ],
)}
<h3>Our legitimate interests</h3>
<p>Where we rely on legitimate interest, our interest is to keep Lilleri secure and working, to protect you and other users from unauthorised access and abuse, to protect our rights and to provide the service you asked for even when your transactions contain data about other people. We have assessed that these interests do not override your rights because we use only the data we need, keep it for a short time and do not use it for other purposes. You can ask us for more information about this assessment and object to the processing (see “Your rights”).</p>
<h3>No consent-based marketing</h3>
<p>We currently do not send promotional messages and we do not process data on the basis of your consent. If we wish to do so in the future, we will ask you separately: you will be able to refuse without any effect on the service and to withdraw your consent at any time.</p>
<h3>Authorising a bank connection is something different</h3>
<p>When you connect an account, you authorise Enable Banking and your bank to access the account data: this is the “explicit consent” required by payment services law (Directive (EU) 2015/2366, “PSD2”). It is a contractual authorisation, distinct from the data protection legal bases listed above, as clarified by Guidelines 06/2020 of the European Data Protection Board (EDPB). You can revoke it at any time.</p>`,
      },
      {
        id: 'collegamenti',
        title: 'Automatic bank connections',
        body: html`<p>With Plus you can connect your bank accounts automatically. The account access service is provided by <strong>Enable Banking Oy</strong> (Finland), an account information service provider registered with the Finnish Financial Supervisory Authority (Finanssivalvonta, FIN-FSA).</p>
<ul>
<li>During the connection Enable Banking shows you its own terms. For the service it provides to you and for the authorisation it obtains, Enable Banking acts as an independent controller.</li>
<li>You authenticate directly with your bank, using the strong customer authentication your bank requires. Lilleri never sees or stores your bank credentials.</li>
<li>Access is read-only and covers accounts, balances and transactions. Lilleri cannot make payments or move money.</li>
<li>The authorisation lasts for up to 180 days, according to your bank's rules; if you want to continue, we will ask you to renew it.</li>
<li>You can revoke the connection at any time from the app and also directly with your bank.</li>
<li>Lilleri receives the data as the recipient you have chosen and processes it as described in this notice.</li>
</ul>
<p>More information on the processing carried out by Enable Banking is available at ${external(ENABLE_BANKING_URL, 'enablebanking.com')}.</p>`,
      },
      {
        id: 'automatizzati',
        title: 'Automatic categorisation and automated decisions',
        body: html`<p>Lilleri automatically assigns a category to transactions, recognises recurring expenses and calculates summaries. It does so on our servers using deterministic rules and calculations: the same data always gives the same result.</p>
<p>This is automated processing, but it is not a decision that produces legal effects concerning you or similarly significantly affects you (Article 22 GDPR): it only organises information for you. You can correct any category and create your own rules. We do not use your data to assess your creditworthiness, we do not send it to external artificial intelligence services and we do not use it to train models.</p>`,
      },
      {
        id: 'destinatari',
        title: 'Who we share data with',
        body: html`<p>We do not sell your data and we do not share it with advertisers. We share it only with the parties that help us provide the service, and only to the extent each of them needs:</p>
${table(
  ['Party', 'Role', 'Activity', 'Place of processing'],
  [
    [
      'Railway Corporation',
      'Processor (Art. 28 GDPR)',
      'Hosting of the application and the database',
      'EU West region (Amsterdam, Netherlands); company based in the United States',
    ],
    ['Scaleway SAS', 'Processor', 'Sending service emails', 'France'],
    [
      'Stripe Payments Europe, Limited',
      'Processor for payment processing; for some purposes Stripe acts as an independent controller (for example to meet its own legal obligations and to prevent fraud)',
      'Payments and management of the Plus subscription, billing portal',
      'Ireland',
    ],
    [
      'Enable Banking Oy',
      'Account information service provider; independent controller for the service it provides to you and for the authorisation it obtains',
      'Automatic bank connections (Plus)',
      'Finland',
    ],
  ],
)}
<p>Where necessary, data may also be received by: our authorised staff, bound by confidentiality and with access limited to what their role requires; professional advisers (for example accountants or lawyers) bound by professional secrecy; public and judicial authorities, where required by law.</p>
<p>For the processing they carry out as independent controllers, Stripe and Enable Banking provide their own notices: ${external(STRIPE_PRIVACY_URL.en, 'Stripe privacy policy')} and ${external(ENABLE_BANKING_URL, 'Enable Banking website')}.</p>
<p>The up-to-date list of our processors is available on request by writing to ${privacy}.</p>`,
      },
      {
        id: 'trasferimenti',
        title: 'Transfers outside the European Economic Area',
        body: html`<p>Service data is stored in the European Union. Some providers, however, are based outside the European Economic Area (EEA) or belong to international groups: Railway Corporation, for example, is a US company. Where a provider may access data from a country outside the EEA, the transfer takes place only with the safeguards required by Chapter V GDPR: an adequacy decision of the European Commission (such as the one on the EU-US Data Privacy Framework, for certified providers) or the standard contractual clauses approved by the Commission (Article 46 GDPR), with any necessary supplementary measures.</p>
<p>You can ask us for information about the safeguards applied and obtain a copy of them by writing to ${privacy}.</p>`,
      },
      {
        id: 'conservazione',
        title: 'How long we keep data',
        body: html`${table(
          ['Data', 'Retention period'],
          [
            [
              'Account data and financial data (accounts, transactions, categories, rules, insights)',
              "For as long as the account exists. You can delete individual accounts or data sources earlier. When you delete your account they are deleted, together with your profile's encryption keys.",
            ],
            [
              'Original copy of data received from the bank or of imported files',
              '30 days from receipt; the transactions already processed remain.',
            ],
            [
              'Sign-in sessions',
              'They end when you sign out and in any case after 30 days at the latest; the related data is deleted with the account.',
            ],
            [
              'Technical security logs',
              'For a short period, at most 6 months, unless they are needed to investigate a specific incident.',
            ],
            [
              'Accounting and tax records relating to Plus',
              '10 years, as required by law (Article 2220 of the Italian Civil Code). Stripe keeps its own data in accordance with its own notice.',
            ],
            [
              'Support requests and requests to exercise your rights',
              'Up to 24 months after the request is closed.',
            ],
            [
              'Security copies (backups)',
              'Encrypted backups are replaced on a rolling basis: after deletion, your data may remain in them for up to 90 days. We do not use them for any other purpose and access them only to restore the service after a failure.',
            ],
          ],
        )}
<p>When these periods expire, data is deleted or anonymised. We may keep it longer only where necessary to establish, exercise or defend a legal claim in a dispute that has already arisen or to comply with an order from an authority, and only for the data concerned.</p>`,
      },
      {
        id: 'sicurezza',
        title: 'How we protect data',
        body: html`<ul>
<li>All communications between your device and our servers are encrypted (TLS).</li>
<li>Some of the most sensitive financial data is also encrypted in the database with keys specific to each profile, stored separately from the database. When you delete your account these keys are destroyed and that data can no longer be read (crypto-erasure).</li>
<li>Each profile is isolated from the others at database level: a request can read only the data of the profile it is authorised for.</li>
<li>Passwords are stored only in irreversibly hashed form, and you can protect access with passkeys and a second factor.</li>
<li>Our staff's access to systems is limited to those who need it for their role.</li>
</ul>
<p>No system is 100% secure. If a personal data breach occurs that is likely to result in a high risk to your rights, we will inform you without undue delay, as required by Article 34 GDPR.</p>`,
      },
      {
        id: 'cookie',
        title: 'Cookies and browser storage',
        body: html`<p>Lilleri uses only strictly necessary technical tools, all of them first-party:</p>
${table(
  ['Name', 'Type', 'Purpose', 'Duration'],
  [
    [
      html`<code>__Secure-lilleri-hosted.*</code>`,
      'Technical cookies set by the authentication library',
      'Keeping you signed in and completing security checks (for example the second factor). They are protected (Secure, HttpOnly, SameSite=Strict) and cannot be read by scripts.',
      'Until you sign out, at most 30 days',
    ],
    [
      html`<code>lilleri.display-preferences.v1</code>`,
      'Browser local storage (localStorage)',
      'Remembering your display language and time zone. It contains no financial data and no identifiers.',
      'Until you clear it from your browser',
    ],
    [
      html`<code>lilleri-encrypted-read-cache-v1</code>`,
      'Browser database (IndexedDB)',
      'Keeping an encrypted, temporary copy of the latest overview, readable in read-only mode if the connection drops. The key needed to read it is held only in the memory of the open page.',
      'Readable for at most 15 minutes; deleted when it expires, when you sign out or the next time the app is opened',
    ],
  ],
)}
<p>We do not use profiling or advertising cookies, or third-party analytics or tracking tools. Strictly necessary technical tools used to provide a service you have requested do not require your consent (Article 122 of the Italian Personal Data Protection Code and the Garante's Guidelines on cookies and other tracking tools of 10 June 2021): this is why we do not show you a cookie banner. If we wish to use other tools in the future, we will ask for your consent first.</p>
<p>During payment and in the billing portal (Stripe) and during a bank connection (Enable Banking and your bank) you visit third-party pages, which may use their own cookies in accordance with their own notices. Legal pages such as this one use no cookies and no scripts.</p>`,
      },
      {
        id: 'minori',
        title: 'Children',
        body: html`<p>Lilleri is for adults only. When you sign up, you declare that you are at least 18 years old. We do not knowingly collect data from minors: if we learn that an account belongs to a minor, we close it and delete the related data. If you believe a minor has signed up, write to us at ${privacy}.</p>`,
      },
      {
        id: 'conferimento',
        title: 'What happens if you do not provide data',
        body: html`<ul>
<li>Email, password, the declaration that you are an adult and acceptance of the terms are needed to create an account: without them we cannot register you.</li>
<li>You enter financial data yourself, when and if you wish; without it Lilleri has no information to organise for you.</li>
<li>Automatic bank connection, passkeys and the second factor are optional.</li>
<li>To buy Plus, the payment data requested by Stripe and the data required by law for invoicing are needed; without them we cannot activate the subscription.</li>
</ul>`,
      },
      {
        id: 'diritti',
        title: 'Your rights',
        body: html`<p>At any time, and free of charge, you can:</p>
<ul>
<li><strong>access</strong> your data and receive a copy (Art. 15 GDPR);</li>
<li><strong>rectify</strong> it if it is inaccurate or incomplete (Art. 16): you can change most of it directly in the app;</li>
<li>obtain its <strong>erasure</strong> (Art. 17): you can delete your account yourself from Settings;</li>
<li>ask for <strong>restriction</strong> of processing (Art. 18);</li>
<li>receive the data you provided to us in a structured, machine-readable format (<strong>portability</strong>, Art. 20): you can download it yourself from Settings, as JSON or as a ZIP archive;</li>
<li><strong>object</strong> to processing based on our legitimate interest, on grounds relating to your particular situation (Art. 21);</li>
<li><strong>withdraw</strong> at any time any consent you may have given, without affecting the lawfulness of processing carried out before the withdrawal (Art. 7(3)). You can also revoke a bank connection from the app at any time.</li>
</ul>
<p>For requests you cannot handle directly in the app, write to ${privacy}. We will reply within one month of receiving your request; if it is particularly complex or there are many requests, this period may be extended by a further two months, in which case we will tell you within the first month (Article 12 GDPR). We may ask you to confirm your identity before we reply.</p>
<h3>Complaint to the supervisory authority</h3>
<p>If you believe that the processing of your data infringes the law, you can lodge a complaint with the Italian Data Protection Authority, the Garante per la protezione dei dati personali (${external(GARANTE_URL, 'www.garanteprivacy.it')}), or with the supervisory authority of the EU Member State where you habitually reside, work or where the alleged infringement took place (Article 77 GDPR). You may also bring the matter before a court.</p>`,
      },
      {
        id: 'modifiche',
        title: 'Changes to this notice',
        body: html`<p>We may update this notice, for example if the service, our providers or the law change. The version and effective date are always shown at the top. We will tell you about significant changes in the app or by email before they apply. If we ever wish to use your data for new purposes different from those described here, we will tell you first and, where necessary, ask for your consent.</p>`,
      },
    ],
  }
}

// ---------------------------------------------------------------------------------------------
// Termini di servizio (italiano, versione prevalente).

function termsIt(entity: LegalEntity): LegalDocument {
  const contact = mail(entity.contactEmail)
  const pec = entity.pec === undefined ? '' : html` oppure via PEC a ${mail(entity.pec)}`
  return {
    title: 'Termini di servizio',
    intro: html`<p>Questi termini regolano il contratto tra te e ${entity.name} («noi») per l'uso di Lilleri, l'app web per organizzare le tue finanze personali. Sono pensati per i consumatori, cioè per le persone che usano Lilleri per scopi estranei alla propria attività professionale. Li accetti al momento della registrazione e puoi salvarli o stamparli da questa pagina in qualsiasi momento.</p>
<p>Come trattiamo i tuoi dati è spiegato nell'<a href="${LEGAL_PATHS.privacy.it}">Informativa sulla privacy</a>.</p>`,
    summary: [
      html`Gratis è gratuito e senza scadenza. Plus costa 6,99 € al mese o 69,99 € all'anno, IVA inclusa, si rinnova automaticamente e puoi disdirlo quando vuoi.`,
      html`Hai 14 giorni di tempo per recedere dall'acquisto di Plus.`,
      html`Lilleri ti aiuta a capire le tue finanze, ma non è una banca e non fornisce consulenza finanziaria.`,
      html`Puoi esportare i tuoi dati e cancellare l'account in qualsiasi momento.`,
    ],
    sections: [
      {
        id: 'fornitore',
        title: 'Chi siamo',
        body: html`<p>Lilleri è fornito da:</p>${entityDetails('it', entity)}`,
      },
      {
        id: 'servizio',
        title: "Che cos'è Lilleri",
        body: html`<p>Lilleri ti permette di riunire in un unico posto le informazioni sui tuoi conti e di capire meglio come usi il tuo denaro. In particolare puoi:</p>
<ul>
<li>creare conti manuali e registrare movimenti;</li>
<li>importare movimenti da file CSV o XLSX esportati dalla tua banca;</li>
<li>ottenere la categorizzazione automatica dei movimenti e correggerla, anche con regole personali;</li>
<li>consultare riepiloghi e analisi calcolati sui nostri server con regole deterministiche;</li>
<li>con Plus, collegare automaticamente i tuoi conti bancari (vedi «Collegamenti bancari automatici»);</li>
<li>esportare i tuoi dati e cancellare l'account in qualsiasi momento.</li>
</ul>
<p><strong>Cosa Lilleri non è.</strong> Lilleri è un servizio informativo. Non è una banca, non custodisce denaro, non esegue né dispone pagamenti, non concede credito e non fornisce consulenza finanziaria, in materia di investimenti, fiscale o legale. Categorie e analisi descrivono i tuoi dati: non sono raccomandazioni personalizzate. Non mostriamo pubblicità e non vendiamo i tuoi dati.</p>
<p><strong>Requisiti tecnici.</strong> Lilleri è un'app web: per usarla servono un browser aggiornato e una connessione a Internet.</p>`,
      },
      {
        id: 'account',
        title: 'Il tuo account',
        body: html`<ul>
<li>Per registrarti devi essere maggiorenne (almeno 18 anni) e dichiararlo al momento della registrazione.</li>
<li>Ti registri con un indirizzo email, che dovrai verificare, e con una password di almeno 12 caratteri. Puoi aggiungere una passkey e l'autenticazione a due fattori (TOTP): ti consigliamo di farlo.</li>
<li>Ogni registrazione crea un solo profilo personale, intestato a te. L'account è personale: non puoi cederlo né condividere le tue credenziali.</li>
<li>Custodisci con cura password, dispositivi e codici. Se sospetti un accesso non autorizzato, cambia subito la password e scrivici a ${contact}.</li>
<li>Fornisci informazioni veritiere e mantienile aggiornate.</li>
</ul>`,
      },
      {
        id: 'piani',
        title: 'Piani e prezzi',
        body: html`<h3>Gratis</h3>
<p>Gratuito e senza scadenza. Comprende conti manuali, importazione di file, regole, esportazione e cancellazione dei dati. Non richiede una carta di pagamento.</p>
<h3>Plus</h3>
<p>Comprende tutto ciò che offre Gratis e, in più, i collegamenti bancari automatici. Costa <strong>6,99 € al mese</strong> oppure <strong>69,99 € all'anno</strong>, IVA inclusa. Non applichiamo costi di attivazione o di disdetta.</p>
<p>Prima che tu confermi l'acquisto ti mostriamo il prezzo totale, la durata del periodo, il rinnovo automatico e come disdire. Dopo l'acquisto ti inviamo una conferma via email. Si applica il prezzo mostrato al momento dell'acquisto.</p>`,
      },
      {
        id: 'pagamento',
        title: 'Pagamento e rinnovo automatico',
        body: html`<ul>
<li>I pagamenti sono elaborati da Stripe Payments Europe, Limited (Irlanda). Inserisci i dati di pagamento sulle pagine di Stripe: noi non vediamo il numero completo della tua carta.</li>
<li>Il prezzo si paga in anticipo all'inizio di ogni periodo (mese o anno).</li>
<li>Plus si rinnova automaticamente per un periodo della stessa durata, allo stesso prezzo, finché non lo disdici. Il rinnovo viene addebitato sullo stesso metodo di pagamento.</li>
<li>Se il pagamento di un rinnovo non va a buon fine ti avvisiamo; se non viene regolarizzato, le funzioni Plus si interrompono e il tuo account torna al piano Gratis, senza perdita dei dati.</li>
</ul>
<h3>Modifiche del prezzo</h3>
<p>Possiamo modificare il prezzo di Plus solo per giustificati motivi, come variazioni dei costi necessari per fornire il servizio o della normativa fiscale. Te lo comunicheremo via email e in app almeno 30 giorni prima. Il nuovo prezzo si applicherà solo dal primo rinnovo successivo alla fine del preavviso: se non sei d'accordo, puoi disdire prima del rinnovo senza alcun costo.</p>`,
      },
      {
        id: 'disdetta',
        title: 'Disdetta di Plus',
        body: html`<p>Puoi disdire Plus in qualsiasi momento dal portale di fatturazione, raggiungibile dall'app. La disdetta ha effetto alla fine del periodo già pagato: fino ad allora continui a usare Plus e non ti verranno addebitati altri rinnovi. Salvo il diritto di recesso (sezione successiva) e gli altri casi previsti da questi termini o dalla legge, non rimborsiamo la parte residua del periodo in corso.</p>
<p>Alla fine del periodo pagato il tuo account torna al piano Gratis: le funzioni Plus, compresi gli aggiornamenti tramite i collegamenti bancari automatici, non sono più disponibili, mentre i dati già presenti nel tuo account restano a tua disposizione.</p>`,
      },
      {
        id: 'recesso',
        title: 'Diritto di recesso',
        body: html`<p>Se acquisti Plus hai il diritto di recedere dal contratto entro 14 giorni dalla sua conclusione, senza dover indicare il motivo e senza alcuna penale (articoli 52 e seguenti del Codice del Consumo, d.lgs. 206/2005, che attuano la direttiva 2011/83/UE).</p>
<p><strong>Come recedere.</strong> Prima della scadenza dei 14 giorni, inviaci una dichiarazione esplicita della tua decisione a ${contact}${pec}. Puoi usare il modulo tipo riportato qui sotto, ma non è obbligatorio.</p>
<p><strong>Attivazione immediata.</strong> Al momento dell'acquisto ti chiediamo se vuoi che Plus si attivi subito, cioè durante il periodo di recesso. Se lo chiedi espressamente e poi recedi, dovrai pagare solo un importo proporzionale al servizio fornito fino al momento in cui ci hai comunicato il recesso (articolo 57, comma 3, del Codice del Consumo). Plus è un servizio digitale fornito in modo continuativo: non perdi il diritto di recesso per il solo fatto che il servizio sia iniziato, perché l'esclusione prevista dall'articolo 59, comma 1, lettera a), riguarda solo i servizi già interamente prestati.</p>
<p><strong>Rimborso.</strong> Ti rimborseremo quanto hai pagato, dedotto l'eventuale importo proporzionale, senza indebito ritardo e comunque entro 14 giorni dal giorno in cui abbiamo ricevuto la tua comunicazione di recesso. Useremo lo stesso mezzo di pagamento che hai utilizzato, salvo che tu abbia espressamente concordato diversamente; il rimborso non ti costerà nulla.</p>
<div class="form">
<p><strong>Modulo di recesso tipo</strong><br>(compilare e restituire il presente modulo solo se si desidera recedere dal contratto)</p>
<ul>
<li>— Destinatario: ${entity.name}, ${entity.address}, ${entity.contactEmail}</li>
<li>— Con la presente io/noi (*) notifichiamo il recesso dal mio/nostro (*) contratto di vendita dei seguenti beni/servizi (*)</li>
<li>— Ordinato il (*)/ricevuto il (*)</li>
<li>— Nome del/dei consumatore(i)</li>
<li>— Indirizzo del/dei consumatore(i)</li>
<li>— Firma del/dei consumatore(i) (solo se il presente modulo è notificato in versione cartacea)</li>
<li>— Data</li>
</ul>
<p>(*) Cancellare la dicitura inutile.</p>
</div>`,
      },
      {
        id: 'collegamenti',
        title: 'Collegamenti bancari automatici',
        body: html`<ul>
<li>I collegamenti bancari automatici sono disponibili solo con Plus.</li>
<li>Il servizio di informazione sui conti è prestato da Enable Banking Oy (Finlandia), prestatore registrato presso l'autorità di vigilanza finanziaria finlandese (FIN-FSA). Durante l'autorizzazione Enable Banking ti mostra i propri termini, che regolano il servizio che ti presta. Lilleri non presta servizi di pagamento né servizi di informazione sui conti: riceve i dati come destinatario da te scelto.</li>
<li>Ti autentichi direttamente presso la tua banca; Lilleri non vede e non conserva mai le tue credenziali bancarie.</li>
<li>L'accesso è in sola lettura (conti, saldi e movimenti) e dura al massimo 180 giorni, secondo le regole della tua banca; poi puoi rinnovarlo.</li>
<li>Puoi revocare il collegamento in qualsiasi momento dall'app e presso la tua banca.</li>
<li>La disponibilità dipende dalle banche e da Enable Banking: non tutte le banche o tutti i conti possono essere supportati e l'elenco può cambiare nel tempo. I dati mostrati sono quelli forniti dalla banca e possono arrivare in ritardo o essere incompleti per cause che non dipendono da noi.</li>
</ul>`,
      },
      {
        id: 'dati',
        title: 'I tuoi dati e i tuoi contenuti',
        body: html`<ul>
<li>I dati che inserisci, importi o colleghi restano tuoi. Ci concedi solo il diritto di trattarli per fornirti il servizio, come descritto nell'<a href="${LEGAL_PATHS.privacy.it}">Informativa sulla privacy</a>.</li>
<li>Puoi esportarli in qualsiasi momento dalle Impostazioni, in formato JSON o in un archivio ZIP, e cancellarli eliminando singole fonti o l'intero account.</li>
<li>Puoi caricare o collegare solo dati di conti di cui sei titolare o che sei autorizzato a gestire.</li>
</ul>`,
      },
      {
        id: 'uso',
        title: 'Uso corretto del servizio',
        body: html`<p>Usando Lilleri ti impegni a:</p>
<ul>
<li>usarlo per scopi personali e leciti, nel rispetto di questi termini e della legge;</li>
<li>non accedere né tentare di accedere ad account o dati altrui;</li>
<li>non aggirare né compromettere le misure di sicurezza, i limiti tecnici o i controlli di accesso;</li>
<li>non sovraccaricare il servizio, per esempio con richieste automatizzate massive, e non estrarne dati con strumenti automatici;</li>
<li>non caricare file contenenti software dannoso;</li>
<li>non decompilare né copiare il software, salvo nei casi in cui la legge lo consente.</li>
</ul>`,
      },
      {
        id: 'disponibilita',
        title: 'Disponibilità, manutenzione e aggiornamenti',
        body: html`<p>Facciamo il possibile perché Lilleri sia sempre disponibile e funzioni correttamente, ma non possiamo garantire un servizio ininterrotto o privo di errori. Il servizio può essere sospeso temporaneamente per manutenzione programmata, che cerchiamo di svolgere nei momenti di minore utilizzo e, quando possibile, di annunciare in anticipo, oppure per interventi urgenti necessari alla sicurezza.</p>
<p>Possiamo aggiornare Lilleri e modificarne le funzioni per motivi giustificati, come esigenze di sicurezza, adeguamenti normativi, cambiamenti dei fornitori o miglioramenti del servizio, senza costi aggiuntivi per te. Se una modifica riduce in modo non trascurabile le funzioni di Plus, te lo comunicheremo in anticipo su un supporto durevole (per esempio via email) e potrai recedere gratuitamente entro 30 giorni, ottenendo il rimborso della parte del periodo pagato non goduta, come previsto dal Codice del Consumo per i servizi digitali.</p>
<p><strong>Garanzia legale di conformità.</strong> Per Plus hai i diritti di garanzia legale previsti dal Codice del Consumo per i contenuti e i servizi digitali (articoli 135-octies e seguenti): se il servizio non è conforme al contratto puoi chiederci di renderlo conforme e, nei casi previsti, ottenere una riduzione del prezzo o la risoluzione del contratto.</p>`,
      },
      {
        id: 'proprieta',
        title: 'Proprietà intellettuale',
        body: html`<p>Il software, il marchio Lilleri, i testi e la grafica del servizio appartengono a noi o ai nostri licenzianti. Ti concediamo una licenza personale, non esclusiva e non trasferibile per usare Lilleri secondo questi termini, per tutta la durata del contratto. I tuoi dati restano tuoi (vedi «I tuoi dati e i tuoi contenuti»).</p>`,
      },
      {
        id: 'responsabilita',
        title: 'Responsabilità',
        body: html`<ul>
<li>Lilleri mostra informazioni basate sui dati che inserisci o che la tua banca fornisce tramite Enable Banking. Categorie e analisi sono calcoli automatici e possono contenere errori, che puoi correggere. Prima di prendere decisioni importanti, verifica i dati con la tua banca o con un professionista.</li>
<li>Rispondiamo nei tuoi confronti, secondo la legge italiana, dei danni causati da un nostro inadempimento.</li>
<li>Non rispondiamo dei danni dovuti a cause a noi non imputabili, come malfunzionamenti o indisponibilità della tua banca, del servizio di Enable Banking o della rete Internet, né di quelli dovuti a un uso del servizio contrario a questi termini.</li>
<li>Nulla in questi termini esclude o limita la nostra responsabilità per dolo o colpa grave (articolo 1229 del codice civile) o per danni alla persona, né limita i diritti che ti riconoscono il Codice del Consumo e le altre norme inderogabili a tutela dei consumatori.</li>
</ul>`,
      },
      {
        id: 'chiusura',
        title: 'Sospensione e chiusura',
        body: html`<h3>Da parte tua</h3>
<p>Puoi cancellare l'account in qualsiasi momento dalle Impostazioni. La cancellazione comporta anche la cessazione di Plus, senza ulteriori addebiti, ed elimina i tuoi dati come descritto nell'<a href="${LEGAL_PATHS.privacy.it}">Informativa sulla privacy</a>. Prima di procedere puoi esportare i tuoi dati.</p>
<h3>Da parte nostra</h3>
<p>Possiamo sospendere o chiudere il tuo account se lo usi in violazione grave di questi termini o della legge, per esempio in caso di abusi, frodi o attività che mettono a rischio la sicurezza del servizio o di altri utenti. Quando possibile ti avvisiamo prima, indicando il motivo e dandoti modo di rimediare o di spiegare; in caso di urgenza (per esempio per proteggere la sicurezza) possiamo intervenire subito e ti informeremo appena possibile. Se chiudiamo l'account per motivi che non dipendono da una tua violazione, ti rimborsiamo la parte di Plus già pagata e non goduta.</p>
<p>Se decidessimo di cessare del tutto il servizio, te lo comunicheremo con almeno 60 giorni di preavviso, ti daremo modo di esportare i tuoi dati e ti rimborseremo la parte di Plus già pagata e non goduta.</p>`,
      },
      {
        id: 'modifiche',
        title: 'Modifiche ai termini',
        body: html`<p>Possiamo modificare questi termini per giustificati motivi: cambiamenti della normativa o provvedimenti delle autorità, esigenze di sicurezza, cambiamenti dei fornitori o delle funzioni del servizio. Ti comunicheremo le modifiche rilevanti in app e via email almeno 30 giorni prima che entrino in vigore, spiegando che cosa cambia. Se non sei d'accordo, prima di quella data puoi disdire Plus o cancellare l'account senza alcun costo; se la modifica ti è sfavorevole e per questo disdici Plus, ti rimborsiamo la parte del periodo pagato non goduta. Le modifiche puramente formali o a tuo favore possono applicarsi subito. Le modifiche non hanno effetto retroattivo.</p>`,
      },
      {
        id: 'reclami',
        title: 'Assistenza e reclami',
        body: html`<p>Per assistenza o reclami scrivi a ${contact}${pec}. Ti risponderemo il prima possibile.</p>
<p>Se non siamo riusciti a risolvere il problema, puoi rivolgerti a un organismo di risoluzione alternativa delle controversie (ADR) iscritto negli elenchi previsti dal Codice del Consumo (articoli 141 e seguenti). In risposta al tuo reclamo ti indicheremo l'organismo competente e se intendiamo avvalercene. Resta sempre salvo il tuo diritto di rivolgerti al giudice.</p>`,
      },
      {
        id: 'legge',
        title: 'Legge applicabile e foro competente',
        body: html`<p>Questi termini sono regolati dalla legge italiana. Se sei un consumatore residente in un altro Stato dell'Unione europea, conservi la protezione delle norme inderogabili del tuo Stato di residenza.</p>
<p>Per le controversie è competente il giudice del luogo in cui hai la residenza o il domicilio, se si trovano in Italia (articolo 66-bis del Codice del Consumo). Se risiedi in un altro Stato dell'Unione europea, puoi agire davanti ai giudici del tuo Stato, secondo il regolamento (UE) n. 1215/2012.</p>`,
      },
      {
        id: 'finali',
        title: 'Disposizioni finali',
        body: html`<ul>
<li>Questi termini sono disponibili in italiano e in inglese; in caso di differenze prevale la versione italiana.</li>
<li>Se una clausola risultasse invalida, le altre restano valide.</li>
<li>La versione che hai accettato è indicata dal codice di versione riportato in alto; puoi chiederci in qualsiasi momento una copia dei termini che hai accettato.</li>
</ul>`,
      },
    ],
  }
}

// ---------------------------------------------------------------------------------------------
// Terms of service (British English translation).

function termsEn(entity: LegalEntity): LegalDocument {
  const contact = mail(entity.contactEmail)
  const pec = entity.pec === undefined ? '' : html` or by PEC to ${mail(entity.pec)}`
  return {
    title: 'Terms of service',
    intro: html`<p>These terms govern the contract between you and ${entity.name} (“we” or “us”) for the use of Lilleri, the web app for organising your personal finances. They are intended for consumers, that is, people who use Lilleri for purposes outside their trade or profession. You accept them when you sign up, and you can save or print them from this page at any time.</p>
<p>How we process your data is explained in the <a href="${LEGAL_PATHS.privacy.en}">Privacy notice</a>.</p>`,
    summary: [
      html`Gratis is free and never expires. Plus costs €6.99 a month or €69.99 a year, VAT included, renews automatically and can be cancelled whenever you like.`,
      html`You have 14 days to withdraw from a Plus purchase.`,
      html`Lilleri helps you understand your finances, but it is not a bank and does not provide financial advice.`,
      html`You can export your data and delete your account at any time.`,
    ],
    sections: [
      {
        id: 'fornitore',
        title: 'Who we are',
        body: html`<p>Lilleri is provided by:</p>${entityDetails('en', entity)}`,
      },
      {
        id: 'servizio',
        title: 'What Lilleri is',
        body: html`<p>Lilleri lets you bring together information about your accounts in one place and better understand how you use your money. In particular, you can:</p>
<ul>
<li>create manual accounts and record transactions;</li>
<li>import transactions from CSV or XLSX files exported from your bank;</li>
<li>have your transactions categorised automatically and correct the categories, including with your own rules;</li>
<li>view summaries and insights calculated on our servers using deterministic rules;</li>
<li>with Plus, connect your bank accounts automatically (see “Automatic bank connections”);</li>
<li>export your data and delete your account at any time.</li>
</ul>
<p><strong>What Lilleri is not.</strong> Lilleri is an information service. It is not a bank, does not hold money, does not execute or initiate payments, does not grant credit and does not provide financial, investment, tax or legal advice. Categories and insights describe your data: they are not personalised recommendations. We do not show advertising and we do not sell your data.</p>
<p><strong>Technical requirements.</strong> Lilleri is a web app: to use it you need an up-to-date browser and an internet connection.</p>`,
      },
      {
        id: 'account',
        title: 'Your account',
        body: html`<ul>
<li>To sign up you must be an adult (at least 18 years old) and declare this when you sign up.</li>
<li>You sign up with an email address, which you will need to verify, and a password of at least 12 characters. You can add a passkey and two-factor authentication (TOTP): we recommend that you do.</li>
<li>Each sign-up creates a single personal profile, in your name. The account is personal: you may not transfer it or share your credentials.</li>
<li>Look after your password, devices and codes. If you suspect unauthorised access, change your password immediately and write to us at ${contact}.</li>
<li>Provide truthful information and keep it up to date.</li>
</ul>`,
      },
      {
        id: 'piani',
        title: 'Plans and prices',
        body: html`<h3>Gratis</h3>
<p>Free and with no expiry. It includes manual accounts, file import, rules, data export and deletion. No payment card is required.</p>
<h3>Plus</h3>
<p>It includes everything in Gratis plus automatic bank connections. It costs <strong>€6.99 a month</strong> or <strong>€69.99 a year</strong>, VAT included. We do not charge activation or cancellation fees.</p>
<p>Before you confirm your purchase we show you the total price, the length of the period, the automatic renewal and how to cancel. After the purchase we send you a confirmation by email. The price shown at the time of purchase applies.</p>`,
      },
      {
        id: 'pagamento',
        title: 'Payment and automatic renewal',
        body: html`<ul>
<li>Payments are processed by Stripe Payments Europe, Limited (Ireland). You enter your payment details on Stripe's pages: we do not see your full card number.</li>
<li>The price is paid in advance at the start of each period (month or year).</li>
<li>Plus renews automatically for a period of the same length, at the same price, until you cancel it. Renewals are charged to the same payment method.</li>
<li>If a renewal payment fails we will let you know; if it is not settled, the Plus features stop and your account returns to the Gratis plan, without any loss of data.</li>
</ul>
<h3>Price changes</h3>
<p>We may change the price of Plus only for justified reasons, such as changes in the costs of providing the service or in tax law. We will tell you by email and in the app at least 30 days in advance. The new price will apply only from the first renewal after the notice period ends: if you do not agree, you can cancel before the renewal at no cost.</p>`,
      },
      {
        id: 'disdetta',
        title: 'Cancelling Plus',
        body: html`<p>You can cancel Plus at any time from the billing portal, which you can reach from the app. Cancellation takes effect at the end of the period you have already paid for: until then you keep using Plus, and no further renewals will be charged. Except for the right of withdrawal (next section) and the other cases provided for by these terms or by law, we do not refund the remainder of the current period.</p>
<p>At the end of the paid period your account returns to the Gratis plan: Plus features, including updates through automatic bank connections, are no longer available, while the data already in your account remains available to you.</p>`,
      },
      {
        id: 'recesso',
        title: 'Right of withdrawal',
        body: html`<p>If you buy Plus, you have the right to withdraw from the contract within 14 days of its conclusion, without giving any reason and without any penalty (Articles 52 et seq. of the Italian Consumer Code, Legislative Decree 206/2005, implementing Directive 2011/83/EU).</p>
<p><strong>How to withdraw.</strong> Before the 14 days expire, send us a clear statement of your decision to ${contact}${pec}. You may use the model form below, but you do not have to.</p>
<p><strong>Immediate start.</strong> When you buy Plus we ask whether you want it to start immediately, that is, during the withdrawal period. If you expressly request this and then withdraw, you will only pay an amount proportionate to the service provided up to the moment you told us of your withdrawal (Article 57(3) of the Italian Consumer Code). Plus is a digital service provided on a continuing basis: you do not lose your right of withdrawal simply because the service has started, as the exception in Article 59(1)(a) applies only to services that have been fully performed.</p>
<p><strong>Refund.</strong> We will refund what you paid, less any proportionate amount, without undue delay and in any event within 14 days of the day we received your notice of withdrawal. We will use the same means of payment you used, unless you have expressly agreed otherwise; the refund will not cost you anything.</p>
<div class="form">
<p><strong>Model withdrawal form</strong><br>(complete and return this form only if you wish to withdraw from the contract)</p>
<ul>
<li>— To: ${entity.name}, ${entity.address}, ${entity.contactEmail}</li>
<li>— I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract of sale of the following goods (*)/for the provision of the following service (*),</li>
<li>— Ordered on (*)/received on (*),</li>
<li>— Name of consumer(s),</li>
<li>— Address of consumer(s),</li>
<li>— Signature of consumer(s) (only if this form is notified on paper),</li>
<li>— Date</li>
</ul>
<p>(*) Delete as appropriate.</p>
</div>`,
      },
      {
        id: 'collegamenti',
        title: 'Automatic bank connections',
        body: html`<ul>
<li>Automatic bank connections are available only with Plus.</li>
<li>The account information service is provided by Enable Banking Oy (Finland), a provider registered with the Finnish Financial Supervisory Authority (FIN-FSA). During authorisation Enable Banking shows you its own terms, which govern the service it provides to you. Lilleri does not provide payment services or account information services: it receives the data as the recipient you have chosen.</li>
<li>You authenticate directly with your bank; Lilleri never sees or stores your bank credentials.</li>
<li>Access is read-only (accounts, balances and transactions) and lasts for up to 180 days, according to your bank's rules; you can then renew it.</li>
<li>You can revoke the connection at any time from the app and with your bank.</li>
<li>Availability depends on the banks and on Enable Banking: not every bank or account can be supported, and the list may change over time. The data shown is the data supplied by the bank and may arrive late or be incomplete for reasons beyond our control.</li>
</ul>`,
      },
      {
        id: 'dati',
        title: 'Your data and your content',
        body: html`<ul>
<li>The data you enter, import or connect remains yours. You grant us only the right to process it in order to provide the service, as described in the <a href="${LEGAL_PATHS.privacy.en}">Privacy notice</a>.</li>
<li>You can export it at any time from Settings, as JSON or as a ZIP archive, and delete it by removing individual sources or your whole account.</li>
<li>You may upload or connect only data from accounts that you hold or are authorised to manage.</li>
</ul>`,
      },
      {
        id: 'uso',
        title: 'Acceptable use',
        body: html`<p>By using Lilleri you agree:</p>
<ul>
<li>to use it for personal and lawful purposes, in accordance with these terms and the law;</li>
<li>not to access, or attempt to access, other people's accounts or data;</li>
<li>not to circumvent or compromise security measures, technical limits or access controls;</li>
<li>not to overload the service, for example with large volumes of automated requests, and not to extract data from it with automated tools;</li>
<li>not to upload files containing malicious software;</li>
<li>not to decompile or copy the software, except where the law allows it.</li>
</ul>`,
      },
      {
        id: 'disponibilita',
        title: 'Availability, maintenance and updates',
        body: html`<p>We do our best to keep Lilleri available and working correctly, but we cannot guarantee an uninterrupted or error-free service. The service may be temporarily suspended for planned maintenance, which we try to carry out at quieter times and, where possible, announce in advance, or for urgent work needed for security.</p>
<p>We may update Lilleri and change its features for justified reasons, such as security needs, legal requirements, changes of provider or service improvements, at no additional cost to you. If a change reduces the Plus features in a way that is more than minor, we will tell you in advance on a durable medium (for example by email) and you may terminate free of charge within 30 days and receive a refund for the unused part of the paid period, as provided for by the Italian Consumer Code for digital services.</p>
<p><strong>Legal guarantee of conformity.</strong> For Plus you have the legal guarantee rights provided for by the Italian Consumer Code for digital content and digital services (Articles 135-octies et seq.): if the service does not conform to the contract, you can ask us to bring it into conformity and, where applicable, obtain a price reduction or terminate the contract.</p>`,
      },
      {
        id: 'proprieta',
        title: 'Intellectual property',
        body: html`<p>The software, the Lilleri brand, and the texts and graphics of the service belong to us or our licensors. We grant you a personal, non-exclusive and non-transferable licence to use Lilleri in accordance with these terms for the duration of the contract. Your data remains yours (see “Your data and your content”).</p>`,
      },
      {
        id: 'responsabilita',
        title: 'Liability',
        body: html`<ul>
<li>Lilleri shows information based on the data you enter or that your bank supplies through Enable Banking. Categories and insights are automatic calculations and may contain errors, which you can correct. Before making important decisions, check the data with your bank or a professional.</li>
<li>We are liable to you, under Italian law, for damage caused by our failure to perform.</li>
<li>We are not liable for damage due to causes not attributable to us, such as malfunctions or unavailability of your bank, of Enable Banking's service or of the internet, nor for damage due to use of the service contrary to these terms.</li>
<li>Nothing in these terms excludes or limits our liability for wilful misconduct or gross negligence (Article 1229 of the Italian Civil Code) or for personal injury, or limits the rights granted to you by the Italian Consumer Code and other mandatory consumer protection rules.</li>
</ul>`,
      },
      {
        id: 'chiusura',
        title: 'Suspension and termination',
        body: html`<h3>By you</h3>
<p>You can delete your account at any time from Settings. Deleting your account also ends Plus, with no further charges, and deletes your data as described in the <a href="${LEGAL_PATHS.privacy.en}">Privacy notice</a>. You can export your data before you do so.</p>
<h3>By us</h3>
<p>We may suspend or close your account if you use it in serious breach of these terms or of the law, for example in cases of abuse, fraud or activity that puts the security of the service or other users at risk. Where possible we will warn you first, giving the reason and a chance to remedy the situation or explain; in urgent cases (for example to protect security) we may act immediately and will inform you as soon as possible. If we close your account for reasons other than a breach on your part, we will refund the part of Plus already paid for and not used.</p>
<p>If we decide to discontinue the service altogether, we will give you at least 60 days' notice, give you the opportunity to export your data and refund the part of Plus already paid for and not used.</p>`,
      },
      {
        id: 'modifiche',
        title: 'Changes to these terms',
        body: html`<p>We may change these terms for justified reasons: changes in the law or decisions of authorities, security needs, changes of provider or of the service's features. We will tell you about significant changes in the app and by email at least 30 days before they take effect, explaining what is changing. If you do not agree, before that date you can cancel Plus or delete your account at no cost; if the change is to your disadvantage and you cancel Plus for that reason, we will refund the unused part of the paid period. Purely formal changes or changes in your favour may apply immediately. Changes do not have retroactive effect.</p>`,
      },
      {
        id: 'reclami',
        title: 'Support and complaints',
        body: html`<p>For support or complaints, write to ${contact}${pec}. We will reply as soon as possible.</p>
<p>If we have not been able to resolve the problem, you can turn to an alternative dispute resolution (ADR) body listed in the registers provided for by the Italian Consumer Code (Articles 141 et seq.). In our reply to your complaint we will tell you which body is competent and whether we intend to use it. You always retain the right to go to court.</p>`,
      },
      {
        id: 'legge',
        title: 'Governing law and jurisdiction',
        body: html`<p>These terms are governed by Italian law. If you are a consumer resident in another Member State of the European Union, you keep the protection of the mandatory rules of your country of residence.</p>
<p>Disputes fall within the jurisdiction of the court of the place where you are resident or domiciled, if that is in Italy (Article 66-bis of the Italian Consumer Code). If you are resident in another Member State of the European Union, you may bring proceedings before the courts of your own country, under Regulation (EU) No 1215/2012.</p>`,
      },
      {
        id: 'finali',
        title: 'Final provisions',
        body: html`<ul>
<li>These terms are available in Italian and in English; if there is any difference, the Italian version prevails.</li>
<li>If any clause is found to be invalid, the others remain valid.</li>
<li>The version you accepted is identified by the version code shown at the top; you can ask us at any time for a copy of the terms you accepted.</li>
</ul>`,
      },
    ],
  }
}

// ---------------------------------------------------------------------------------------------
// Account deletion (the public, no-login page app stores require).

function deletionIt(entity: LegalEntity): LegalDocument {
  const privacy = mail(entity.privacyEmail)
  return {
    title: 'Cancellare il tuo account Lilleri',
    intro: html`<p>Questa pagina spiega come cancellare il tuo account Lilleri e i dati collegati, anche se non riesci più ad accedere all'app. Lilleri è un servizio di ${entity.name}.</p>`,
    summary: [
      html`Dall'app: Impostazioni › Privacy e dati › «Elimina profilo e dati».`,
      html`Se non puoi accedere: scrivi a ${privacy} dall'indirizzo email del tuo account.`,
      html`Plus pagato sul sito si chiude da solo; un abbonamento App Store o Google Play va disdetto anche nello store.`,
    ],
    sections: [
      {
        id: 'dall-app',
        title: "Dall'app o dal sito",
        body: html`<ol>
<li>Accedi a Lilleri, nell'app o sul sito.</li>
<li>Apri Impostazioni › Privacy e dati.</li>
<li>Se vuoi, esporta prima i tuoi dati dalla stessa schermata.</li>
<li>Scegli «Elimina profilo e dati» e conferma la tua identità quando richiesto.</li>
</ol>
<p>La cancellazione è immediata e definitiva.</p>`,
      },
      {
        id: 'senza-accesso',
        title: 'Se non puoi accedere',
        body: html`<p>Scrivi a ${privacy} dall'indirizzo email con cui ti sei registrato, con oggetto «Cancellazione account». Per proteggere il tuo account possiamo chiederti di confermare la richiesta. Cancelliamo l'account entro un mese dalla richiesta (articolo 12 del GDPR) e ti confermiamo l'avvenuta cancellazione.</p>`,
      },
      {
        id: 'dati',
        title: 'Cosa cancelliamo e cosa conserviamo',
        body: html`${table(
          ['Dati', 'Cosa succede'],
          [
            [
              'Account, conti, movimenti, categorie, regole e analisi',
              'Cancellati subito, insieme alle chiavi di cifratura del tuo profilo.',
            ],
            [
              'Copie di sicurezza (backup)',
              'Vengono sostituite a rotazione: i tuoi dati possono restarvi fino a 90 giorni, senza essere usati per altri scopi.',
            ],
            [
              'Documenti contabili e fiscali relativi a Plus',
              '10 anni, come richiesto dalla legge (articolo 2220 del codice civile).',
            ],
            ['Registri tecnici di sicurezza', 'Al massimo 6 mesi.'],
            [
              'Richieste di assistenza e di esercizio dei diritti',
              'Fino a 24 mesi dalla chiusura della richiesta.',
            ],
          ],
        )}
<p>Trovi tutti i dettagli nell'<a href="${LEGAL_PATHS.privacy.it}">informativa sulla privacy</a>.</p>`,
      },
      {
        id: 'abbonamento',
        title: "L'abbonamento Plus",
        body: html`<ul>
<li>Se paghi Plus sul sito, cancellare l'account chiude l'abbonamento: non ci saranno altri addebiti.</li>
<li>Se paghi Plus tramite App Store o Google Play, disdici l'abbonamento anche dalle impostazioni dello store (iPhone: Impostazioni › il tuo nome › Abbonamenti; Android: Play Store › profilo › Pagamenti e abbonamenti › Abbonamenti). Quei pagamenti sono gestiti da Apple e da Google e non possiamo interromperli al posto tuo.</li>
</ul>`,
      },
    ],
  }
}

function deletionEn(entity: LegalEntity): LegalDocument {
  const privacy = mail(entity.privacyEmail)
  return {
    title: 'Deleting your Lilleri account',
    intro: html`<p>This page explains how to delete your Lilleri account and the related data, even if you can no longer sign in to the app. Lilleri is a service of ${entity.name}.</p>`,
    summary: [
      html`In the app: Settings › Privacy and data › “Delete profile and data”.`,
      html`If you cannot sign in: write to ${privacy} from your account's email address.`,
      html`Plus paid on the website ends automatically; an App Store or Google Play subscription must also be cancelled in the store.`,
    ],
    sections: [
      {
        id: 'in-the-app',
        title: 'In the app or on the website',
        body: html`<ol>
<li>Sign in to Lilleri, in the app or on the website.</li>
<li>Open Settings › Privacy and data.</li>
<li>If you wish, export your data from the same screen first.</li>
<li>Choose “Delete profile and data” and confirm your identity when asked.</li>
</ol>
<p>Deletion is immediate and final.</p>`,
      },
      {
        id: 'without-access',
        title: 'If you cannot sign in',
        body: html`<p>Write to ${privacy} from the email address you registered with, with the subject “Account deletion”. To protect your account we may ask you to confirm the request. We delete the account within one month of the request (Article 12 GDPR) and confirm when it is done.</p>`,
      },
      {
        id: 'data',
        title: 'What we delete and what we keep',
        body: html`${table(
          ['Data', 'What happens'],
          [
            [
              'Account, accounts, transactions, categories, rules and insights',
              'Deleted immediately, together with your profile’s encryption keys.',
            ],
            [
              'Backup copies',
              'Replaced on a rotating basis: your data may remain in them for up to 90 days, without being used for any other purpose.',
            ],
            [
              'Accounting and tax records relating to Plus',
              '10 years, as required by law (Article 2220 of the Italian Civil Code).',
            ],
            ['Technical security logs', 'At most 6 months.'],
            ['Support and data-rights requests', 'Up to 24 months after the request is closed.'],
          ],
        )}
<p>All the details are in the <a href="${LEGAL_PATHS.privacy.en}">privacy notice</a>.</p>`,
      },
      {
        id: 'plus',
        title: 'Your Plus subscription',
        body: html`<ul>
<li>If you pay for Plus on the website, deleting your account ends the subscription: there are no further charges.</li>
<li>If you pay for Plus through the App Store or Google Play, also cancel the subscription in the store settings (iPhone: Settings › your name › Subscriptions; Android: Play Store › profile › Payments &amp; subscriptions › Subscriptions). Apple and Google manage those payments and we cannot stop them on your behalf.</li>
</ul>`,
      },
    ],
  }
}

const CONTENT: Readonly<
  Record<LegalPage, Readonly<Record<LegalLocale, (entity: LegalEntity) => LegalDocument>>>
> = {
  privacy: { it: privacyIt, en: privacyEn },
  terms: { it: termsIt, en: termsEn },
  deletion: { it: deletionIt, en: deletionEn },
}

/** Renders one complete, self-contained HTML5 document. */
export function renderLegalPage(page: LegalPage, locale: LegalLocale, entity: LegalEntity): string {
  const content = CONTENT[page]?.[locale]
  if (!content) throw new Error('Unknown legal page')
  const chrome = CHROME[locale]
  const otherLocale: LegalLocale = locale === 'it' ? 'en' : 'it'
  const other = CHROME[otherLocale]
  const document = content(entity)
  const sections = document.sections.filter((section): section is Section => section !== false)
  const version = page === 'terms' ? LEGAL_TERMS_VERSION : LEGAL_PRIVACY_VERSION
  const current = (target: LegalPage) =>
    target === page ? new SafeHtml(' aria-current="page"') : ''
  const body = html`<html lang="${chrome.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="referrer" content="no-referrer">
<title>${document.title} · Lilleri</title>
<link rel="alternate" hreflang="${other.lang}" href="${LEGAL_PATHS[page][otherLocale]}">
<style>${new SafeHtml(STYLES)}</style>
</head>
<body>
<div class="page">
<header class="top">
<span class="brand">Lilleri</span>
<nav class="lang" aria-label="${chrome.languageNav}"><span class="current" lang="${chrome.lang}">${chrome.name}</span><a href="${LEGAL_PATHS[page][otherLocale]}" hreflang="${other.lang}" lang="${other.lang}">${other.name}</a></nav>
</header>
<nav class="docs" aria-label="${chrome.documentsNav}"><a href="${LEGAL_PATHS.privacy[locale]}"${current('privacy')}>${chrome.privacy}</a><a href="${LEGAL_PATHS.terms[locale]}"${current('terms')}>${chrome.terms}</a><a href="${LEGAL_PATHS.deletion[locale]}"${current('deletion')}>${chrome.deletion}</a></nav>
<main>
<h1>${document.title}</h1>
<p class="meta">${chrome.version} <code>${version}</code> · ${chrome.effective}</p>
${document.intro}
<aside class="summary" aria-label="${chrome.summary}"><p class="summary-title">${chrome.summary}</p><ul>${document.summary.map((item) => html`<li>${item}</li>`)}</ul></aside>
<nav class="toc" aria-labelledby="indice"><h2 id="indice">${chrome.contents}</h2><ol>${sections.map(
    (section) => html`<li><a href="#${section.id}">${section.title}</a></li>`,
  )}</ol></nav>
${sections.map(
  (section, index) =>
    html`<section id="${section.id}"><h2>${index + 1}. ${section.title}</h2>
${section.body}
</section>
`,
)}</main>
<footer>
<p>${chrome.languageNote}</p>
<p>${chrome.version} <code>${version}</code> · ${chrome.effective}</p>
<p><a href="#indice">${chrome.backToContents}</a></p>
</footer>
</div>
</body>
</html>`
  return `<!doctype html>\n${body.value}\n`
}

/** Response headers for the static legal pages; they override the API's `no-store` default. */
export const LEGAL_PAGE_HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'text/html; charset=utf-8',
  'content-security-policy':
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'cache-control': 'public, max-age=300',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
}

/**
 * Registers `GET /legal/privacy`, `/legal/privacy/en`, `/legal/terms` and `/legal/terms/en`.
 * All four documents are rendered once, when the extension is registered.
 */
export function createLegalPagesExtension(entity: LegalEntity): AppExtension {
  return (app) => {
    const pages = LEGAL_PAGE_ROUTES.map((route) => ({
      path: route.path,
      body: renderLegalPage(route.page, route.locale, entity),
    }))
    for (const { path, body } of pages)
      app.get(path, async (_request, reply) => reply.headers(LEGAL_PAGE_HEADERS).send(body))
  }
}
