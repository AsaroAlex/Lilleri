export default function PlansPage() {
  return (
    <>
      <a className="skip" href="#main">
        Vai al contenuto
      </a>
      <header className="site-header wrap">
        <a className="brand" href="/" aria-label="Lilleri, inizio">
          Lilleri
        </a>
        <nav aria-label="Navigazione principale">
          <a href="/">Come funziona</a>
        </nav>
      </header>
      <main id="main">
        <section className="hero wrap" aria-labelledby="plans-title">
          <div className="hero-copy">
            <p className="eyebrow">Gratis e Plus</p>
            <h1 id="plans-title">
              Parti gratis.
              <br />
              <em>Senza scadenza.</em>
            </h1>
            <p className="hero-intro">
              Conti manuali, importazione dei file supportati e strumenti per capire i movimenti
              costituiscono la base gratuita di Lilleri.
            </p>
            <p className="hero-note">
              Oggi puoi esplorare un prototipo locale gratuito con dati dimostrativi. Non serve una
              carta. Nessun abbonamento viene attivato.
            </p>
            <a className="button primary" href="/#demo">
              Esplora la demo
            </a>
          </div>
        </section>
        <section className="steps wrap" aria-label="La base gratuita e i prossimi servizi">
          <article>
            <p className="eyebrow">Gratis · Senza scadenza</p>
            <h2>Capisci i tuoi movimenti</h2>
            <p>
              Aggiungi conti manuali, prova i file supportati, assegna categorie e controlla gli
              abbinamenti. Nel prototipo usa dati inventati.
            </p>
          </article>
          <article>
            <p className="eyebrow">Plus · In preparazione</p>
            <h2>Scegli la comodità</h2>
            <p>
              L’obiettivo è offrire aggiornamenti automatici dai conti bancari supportati. Questa
              funzione non è ancora disponibile. Prezzi e condizioni saranno visibili prima di
              qualsiasi acquisto.
            </p>
          </article>
          <article>
            <p className="eyebrow">I tuoi dati</p>
            <h2>Mantieni il controllo</h2>
            <p>
              Correzioni, privacy, accesso allo storico conservato, esportazione e cancellazione
              fanno parte della base gratuita. La versione Gratis non diventa un pagamento alla
              scadenza di una prova.
            </p>
          </article>
        </section>
      </main>
    </>
  )
}
