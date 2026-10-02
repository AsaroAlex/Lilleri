import Image from 'next/image'
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
          <a href="#come-funziona">Il progetto</a>
          <a href="#privacy">I tuoi dati</a>
        </nav>
        <ThemeButton />
      </header>
      <main id="main">
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="status-dot" /> Un progetto in sviluppo
            </p>
            <h1 id="hero-title">
              I tuoi soldi,
              <br />
              <em>in ordine.</em>
            </h1>
            <p className="hero-intro">
              Un bonifico qui. Una carta là.
              <br />
              Lilleri nasce per mettere insieme i movimenti e aiutarti a capire cosa succede.
            </p>
            <a className="button primary" href="#come-funziona">
              Scopri il progetto <span aria-hidden="true">↗</span>
            </a>
            <p className="hero-note">
              Per ora, un prototipo con dati dimostrativi.
              <br />I collegamenti bancari reali non sono disponibili.
            </p>
            <Signature />
          </div>
          <figure className="hero-figure">
            <div className="figure-label">
              <span>Una visione più chiara</span>
              <span>01 — Esempio</span>
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
              <p className="ledger-label">Ogni movimento ha il suo posto.</p>
              <p className="ledger-amount">€ 42,50</p>
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
                  <strong>Quando c’è un dubbio, scegli tu.</strong>
                  <span>Una proposta spiegata. Una correzione possibile.</span>
                </div>
              </div>
              <div className="ledger-foot">
                <Signature small />
                <span>Le fonti restano visibili.</span>
              </div>
            </div>
            <figcaption>Importi e movimenti illustrativi. Nessun conto reale.</figcaption>
          </figure>
        </section>
        <section className="manifesto" id="come-funziona" aria-labelledby="project-title">
          <div className="wrap manifesto-grid">
            <div>
              <p className="eyebrow">Meno rumore. Più senso.</p>
              <h2 id="project-title">
                Un movimento,
                <br />
                <em>una volta sola.</em>
              </h2>
            </div>
            <div className="manifesto-copy">
              <p>
                La stessa spesa può comparire in posti diversi. Un addebito carta può sembrare una
                seconda uscita. Un trasferimento può confondersi con una spesa.
              </p>
              <p>
                Stiamo costruendo Lilleri per distinguere queste storie, conservare le fonti e
                chiederti una conferma quando gli indizi non bastano.
              </p>
              <p className="quiet">
                Il prototipo permette di provare questo percorso su dati sintetici. L’automazione e
                la copertura bancaria saranno da verificare prima del lancio.
              </p>
            </div>
          </div>
        </section>
        <section className="steps wrap" aria-label="Come stiamo progettando Lilleri">
          <article>
            <span className="step-number">01</span>
            <h3>Una vista d’insieme.</h3>
            <p>
              Saldi e spese, separati per valuta. Il periodo dei dati e l’ultimo aggiornamento
              sempre accanto agli importi.
            </p>
            <Signature small />
          </article>
          <article>
            <span className="step-number">02</span>
            <h3>Il perché, a portata.</h3>
            <p>
              Proposte di categoria e corrispondenze tra movimenti mostrano gli indizi da cui
              nascono.
            </p>
            <Signature small />
          </article>
          <article>
            <span className="step-number">03</span>
            <h3>L’ultima parola è tua.</h3>
            <p>
              Correggi un movimento o scegli la categoria per i prossimi acquisti dallo stesso
              esercente.
            </p>
            <Signature small />
          </article>
        </section>
        <section className="privacy wrap" id="privacy" aria-labelledby="privacy-title">
          <div className="privacy-heading">
            <p className="eyebrow">Controllo, prima di tutto.</p>
            <h2 id="privacy-title">
              I tuoi dati.
              <br />
              <em>Le tue scelte.</em>
            </h2>
          </div>
          <div className="privacy-detail">
            <p>
              Nella demo puoi esportare i dati, scollegare la fonte simulata o eliminare il profilo
              dimostrativo. Scollegare ferma gli aggiornamenti; eliminare rimuove anche lo storico.
            </p>
            <ul>
              <li>Nessuna credenziale bancaria richiesta.</li>
              <li>Nessun collegamento a banche reali disponibile.</li>
              <li>Nessun dato inviato a un servizio di AI esterno dal prototipo.</li>
            </ul>
            <p className="quiet">
              Prima di un servizio reale serviranno un fornitore verificato, un’informativa completa
              e controlli di sicurezza validati. Questa pagina presenta il progetto, non un servizio
              bancario.
            </p>
          </div>
        </section>
        <section className="closing wrap">
          <Signature />
          <p>
            Un po’ di ordine.
            <br />
            <em>Un po’ più di spazio.</em>
          </p>
          <a className="button secondary" href="#come-funziona">
            Rileggi il progetto <span aria-hidden="true">↑</span>
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
