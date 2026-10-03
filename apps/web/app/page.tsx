import Image from 'next/image'
import DemoLink from './demo-link'
import ThemeButton from './theme-button'

function Signature({ small = false }: { small?: boolean }) {
  return (
    <span className={`signature ${small ? 'small' : ''}`} aria-hidden="true">
      <i />
      <i />
      <b />
    </span>
  )
}

export default function Page() {
  return (
    <>
      <a className="skip" href="#main">
        Vai al contenuto
      </a>
      <header className="site-header wrap">
        <a className="brand" href="#main" aria-label="Lilleri, inizio">
          <Image
            className="logo-light"
            src="/brand/lilleri-lockup-horizontal.svg"
            alt="Lilleri"
            width={146}
            height={48}
          />
          <Image
            className="logo-dark"
            src="/brand/lilleri-lockup-horizontal-on-dark.svg"
            alt="Lilleri"
            width={146}
            height={48}
          />
        </a>
        <nav aria-label="Navigazione principale">
          <a href="#come-funziona">Come funziona</a>
          <a href="#privacy">I tuoi dati</a>
          <a href="#domande">Domande</a>
        </nav>
        <ThemeButton />
      </header>
      <main id="main">
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" /> Finanze personali · Demo disponibile
            </p>
            <h1 id="hero-title">
              Capisci le spese.
              <br />
              <em>Ritrova il quadro.</em>
            </h1>
            <p className="hero-intro">
              Guarda entrate, spese e movimenti nello stesso posto. Correggi le categorie, controlla
              gli abbinamenti e scopri cosa si ripete ogni mese.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#demo">
                Esplora la demo <span aria-hidden="true">↓</span>
              </a>
              <a className="text-link" href="#come-funziona">
                Guarda come funziona <span aria-hidden="true">→</span>
              </a>
            </div>
            <p className="hero-note">
              Parti da dati dimostrativi, senza credenziali bancarie.
              <br />I collegamenti a banche reali non sono ancora disponibili.
            </p>
            <Signature />
          </div>
          <figure className="hero-figure">
            <div className="figure-label">
              <span>La tua panoramica</span>
              <span>Esempio</span>
            </div>
            <div className="ledger">
              <div className="ledger-top">
                <Image
                  className="logo-light"
                  src="/brand/lilleri-symbol.svg"
                  alt=""
                  width={36}
                  height={36}
                />
                <Image
                  className="logo-dark"
                  src="/brand/lilleri-symbol-on-dark.svg"
                  alt=""
                  width={36}
                  height={36}
                />
                <span>Dati dimostrativi</span>
              </div>
              <p className="ledger-label">Spese in questo esempio</p>
              <p className="ledger-amount">€ 42,50</p>
              <p className="ledger-context">Il trasferimento tra conti non è una seconda spesa.</p>
              <div className="ledger-row">
                <div className="merchant-mark">S</div>
                <div>
                  <strong>La spesa del venerdì</strong>
                  <span>Spesa alimentare · Contabilizzato</span>
                </div>
                <strong className="row-amount">−€ 42,50</strong>
              </div>
              <div className="ledger-row">
                <div className="merchant-mark transfer">↔</div>
                <div>
                  <strong>Tra i tuoi conti</strong>
                  <span>Trasferimento · Escluso dalle spese</span>
                </div>
                <strong className="row-amount">€ 200,00</strong>
              </div>
              <div className="review-note">
                <span className="review-symbol" aria-hidden="true">
                  ?
                </span>
                <div>
                  <strong>Un abbinamento da controllare</strong>
                  <span>Confronta i movimenti, poi conferma o rifiuta.</span>
                </div>
              </div>
              <div className="ledger-foot">
                <Signature small />
                <span>Importi, date e fonti visibili.</span>
              </div>
            </div>
            <figcaption>Importi e movimenti illustrativi. Nessun conto reale.</figcaption>
          </figure>
        </section>
        <section className="manifesto" id="come-funziona" aria-labelledby="project-title">
          <div className="wrap manifesto-grid">
            <div>
              <p className="eyebrow">Come funziona</p>
              <h2 id="project-title">
                Segui il denaro.
                <br />
                <em>Passo dopo passo.</em>
              </h2>
            </div>
            <div className="manifesto-copy">
              <p>
                Un pagamento con la carta, il suo addebito sul conto, un trasferimento tra i tuoi
                conti: possono sembrare tre spese. Lilleri ti aiuta a capire quali movimenti sono
                collegati e quali devono restare separati.
              </p>
              <p>
                Parti dai dati della demo oppure aggiungi un conto manuale. Cerca i movimenti,
                assegna le categorie e controlla le proposte prima di confermarle.
              </p>
              <p className="quiet">
                Le proposte mostrano le loro ragioni. Le tue correzioni restano salvate e puoi
                annullare le decisioni sugli abbinamenti.
              </p>
            </div>
          </div>
        </section>
        <section className="steps wrap" aria-label="Cosa puoi fare con Lilleri">
          <article>
            <span className="step-number">01</span>
            <h3>Vedi entrate e spese</h3>
            <p>
              Ritrova conti e movimenti nella panoramica. Confronta le entrate con le spese,
              controllando il periodo e la data di aggiornamento. Ogni valuta resta separata.
            </p>
            <Signature small />
          </article>
          <article>
            <span className="step-number">02</span>
            <h3>Controlla e correggi</h3>
            <p>
              Apri un movimento per vedere la descrizione originale e la categoria. Nella sezione Da
              controllare trovi gli abbinamenti che richiedono una tua scelta.
            </p>
            <Signature small />
          </article>
          <article>
            <span className="step-number">03</span>
            <h3>Riduci il lavoro ripetuto</h3>
            <p>
              Applica una categoria ai prossimi acquisti dallo stesso esercente. Crea le tue regole
              e consulta le possibili ricorrenze, con date e importi indicati come stime.
            </p>
            <Signature small />
          </article>
        </section>
        <section className="demo-section wrap" id="demo" aria-labelledby="demo-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Prova il percorso</p>
              <h2 id="demo-title">
                Inizia da <em>un movimento.</em>
              </h2>
            </div>
            <p>
              La demo contiene esempi da esplorare. Puoi anche aggiungere un conto manuale e provare
              l’importazione con dati inventati.
            </p>
          </div>
          <ol className="demo-path">
            <li>
              <span className="step-number" aria-hidden="true">
                01
              </span>
              <h3>Guarda la Home</h3>
              <p>Controlla il riepilogo, i conti e gli ultimi movimenti.</p>
            </li>
            <li>
              <span className="step-number" aria-hidden="true">
                02
              </span>
              <h3>Apri Da controllare</h3>
              <p>Leggi le ragioni di un abbinamento. Conferma, rifiuta o torna indietro.</p>
            </li>
            <li>
              <span className="step-number" aria-hidden="true">
                03
              </span>
              <h3>Aggiungi i tuoi esempi</h3>
              <p>In Movimenti, scegli Importa o aggiungi per creare un conto manuale.</p>
            </li>
          </ol>
          <div className="demo-access" id="demo-instructions">
            <DemoLink />
            <p className="quiet">
              La demo si apre sul computer su cui hai avviato Lilleri. È un prototipo locale, con
              dati dimostrativi; nessun conto bancario reale viene collegato.
            </p>
          </div>
        </section>
        <section className="privacy wrap" id="privacy" aria-labelledby="privacy-title">
          <div className="privacy-heading">
            <p className="eyebrow">Dati e privacy</p>
            <h2 id="privacy-title">
              I tuoi dati.
              <br />
              <em>Le tue scelte.</em>
            </h2>
          </div>
          <div className="privacy-detail">
            <p>
              Scarica una copia dei tuoi dati quando vuoi. Scegli quali movimenti escludere dalle
              analisi e quali avvisi ricevere. Puoi cambiare queste preferenze dall’app.
            </p>
            <ul>
              <li>Esporta lo storico in JSON o in un archivio ZIP con CSV e JSON.</li>
              <li>Scollega una fonte per fermare gli aggiornamenti e conservare lo storico.</li>
              <li>Elimina il profilo per rimuovere anche conti, movimenti e correzioni.</li>
            </ul>
            <p className="quiet">
              Il prototipo non invia i dati a un servizio di AI esterno. L’accesso a banche reali
              resta in sviluppo: la demo non richiede credenziali bancarie.
            </p>
          </div>
        </section>
        <section className="faq wrap" id="domande" aria-labelledby="faq-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Prima di iniziare</p>
              <h2 id="faq-title">
                Le domande <em>più pratiche.</em>
              </h2>
            </div>
            <p>Cosa puoi provare oggi e cosa aspettarti dai dati che vedi.</p>
          </div>
          <details>
            <summary>Posso collegare la mia banca?</summary>
            <p>
              Non ancora. Puoi esplorare la fonte dimostrativa, aggiungere conti manuali e importare
              file di prova. Il collegamento a banche reali sarà disponibile solo dopo
              l’integrazione e la verifica del fornitore.
            </p>
          </details>
          <details>
            <summary>Come aggiungo un conto o importo i movimenti?</summary>
            <p>
              Apri Movimenti e scegli Importa o aggiungi. Per un file con colonne diverse dal
              formato standard, scegli Importa file. Seleziona il conto, associa le colonne e
              controlla l’anteprima prima di confermare l’importazione.
            </p>
          </details>
          <details>
            <summary>Un trasferimento viene contato come spesa?</summary>
            <p>
              Un trasferimento riconosciuto tra i tuoi conti viene escluso dai totali di spesa. Se
              il collegamento tra due movimenti è incerto, Lilleri lo propone in Da controllare: sei
              tu a confermarlo o rifiutarlo.
            </p>
          </details>
          <details>
            <summary>Le ricorrenze indicano addebiti certi?</summary>
            <p>
              No. Sono possibili ricorrenze ricavate dai movimenti disponibili. Le prossime date e
              gli importi sono stime e non confermano un contratto o un pagamento futuro.
            </p>
          </details>
          <details>
            <summary>Posso esportare o eliminare i dati?</summary>
            <p>
              Sì, dalla sezione Privacy. Scollegare una fonte conserva i movimenti già recuperati.
              Eliminare il profilo rimuove anche lo storico e non può essere annullato: esporta
              prima i dati che vuoi conservare.
            </p>
          </details>
        </section>
        <section className="closing wrap">
          <Signature />
          <p>
            Parti da quello
            <br />
            <em>che vuoi capire.</em>
          </p>
          <a className="button primary" href="#demo">
            Esplora la demo <span aria-hidden="true">↑</span>
          </a>
        </section>
      </main>
      <footer className="site-footer wrap">
        <span>Lilleri · 2026</span>
        <span>Prototipo in sviluppo · Dati dimostrativi</span>
        <a href="#privacy">Privacy del prototipo</a>
      </footer>
    </>
  )
}
