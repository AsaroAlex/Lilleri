# E22 — controlli locali di accessibilità web

Il componente di conferma dell’App ora espone `alertdialog`, nome e conseguenza. Il focus iniziale va all’annullamento; `Tab` e `Shift+Tab` restano nel dialogo; `Escape` annulla solo quando non è in corso un’azione. Lo sfondo è `inert` e nascosto all’albero accessibile durante la conferma. La chiusura ripristina gli attributi precedenti e il focus sul pulsante di apertura solo se il contesto d’identità resta attuale. La stessa primitive protegge la conferma della revoca di tutte le sessioni.

Il primo controllo effettuato sul browser dell’App precedente ha rilevato un difetto concreto: la conferma di eliminazione aveva soltanto `role=alert`, il focus restava fuori, quattro pressioni di Tab attraversavano la navigazione, Escape non chiudeva e Annulla non restituiva il focus. Inoltre i due radio del dettaglio non esponevano `aria-checked` nel DOM di React Native Web 0.21. La correzione conserva gli stati nativi e aggiunge gli attributi web espliciti.

L’App ora ha un solo H1, un contenuto `main` nominato, navigazione nominata con `aria-current`, salto al contenuto con tastiera e focus sul titolo quando cambia pagina. Filtri e categorie espongono `aria-pressed`; l’ambito della correzione è un gruppo radio con stato verificabile. Gli avvisi dell’App sono regioni vive con urgenza e atomicità esplicite. L’anello di focus usa il colore primario del tema, spessore 3 px e distacco 2 px: il precedente `borderStrong` non raggiungeva 3:1 su `primarySoft`. La preferenza di movimento ridotto disabilita animazioni e transizioni web. Queste modifiche non alterano i controlli di identità, le revisioni o le azioni finanziarie.

La matrice del browser ha rilevato anche che React Native Web 0.21 scarta
`aria-atomic`: il suo mapper legge `ariaActiveDescendant` al posto di `ariaAtomic`.
I ruoli `status` e `alert` mantengono il valore atomico implicito previsto da ARIA;
il contratto DOM esplicito è ora ripristinato dal componente condiviso con un ref e
un effetto solo web. Avvisi, errore dei font e messaggi dell’accesso locale usano
quel componente, conservando testo, stile e controlli d’identità. Nessuna dipendenza
o libreria installata è stata modificata.

Lo stress reale del testo al 200% su viewport da 320 CSS px ha individuato due
overflow: il glifo del pulsante del tema nell’intestazione e la parola «Privacy»
nella navigazione inferiore. Intestazione, azioni e navigazione ora consentono il
ritorno a capo. Le schede di navigazione usano la larghezza intrinseca delle
etichette prima di distribuire lo spazio, evitando colonne fisse troppo strette.
La correzione conserva etichette complete, bersagli minimi e azioni esistenti;
non taglia né riduce il testo per superare la verifica.

## Evidenza eseguita

`tools/accessibility-focus-browser.cjs` compila il controller e lo esercita in Chromium reale senza HTTP. Otto gruppi passati, zero errori di pagina, report `/workspace/.lilleri-validation/next-accessibility-focus.json`:

- focus iniziale sicuro e isolamento dello sfondo;
- Tab/Shift+Tab circolari ed esclusione di controlli nascosti, disabilitati o dentro dettagli chiusi;
- ingresso nella sequenza dei nuovi controlli del dialogo;
- nuovi controlli di sfondo resi inerti;
- Escape bloccato durante l’azione e ritorno del focus dopo annullamento, con ripristino degli attributi originari;
- contesto d’identità scaduto che impedisce callback e ripristino del focus;
- dialoghi senza controlli che mantengono il focus senza creare tab stop permanenti;
- pulizia sicura quando il pulsante di apertura è stato rimosso.

Il typecheck mobile e Biome sui file dell’App, accesso locale, primitive e cataloghi sono passati. I test del catalogo ICU sono passati con i messaggi dell’App e dell’accesso locale: entrambi i locali hanno gli stessi argomenti e nessun importo passa attraverso `Number`.

## Evidenza finale dell’App

`tools/accessibility-ui-audit.cjs [UI_ORIGIN] [API_ORIGIN] [it-IT|en-GB]` usa le preferenze salvate reali, richiede una demo sintetica e blocca tutte le richieste browser diverse da GET/HEAD/OPTIONS. Non salva preferenze, notifiche, decisioni, sessioni o movimenti. Va eseguito per ciascun locale dopo che il verificatore della lingua ha rilasciato il profilo; il confronto dello snapshot finanziario richiede assenza di altri scrittori.

La matrice finale sul deployment locale `http://localhost:8082`, API
`http://127.0.0.1:3004`, è passata sulle sorgenti corrette e congelate:

| Preferenza effettivamente salvata | Gruppi passati | Errori JavaScript | Scritture browser durante l’audit | Report |
|---|---:|---:|---:|---|
| `it-IT` | 13/13 | 0 | 0 | `/workspace/.lilleri-validation/continuation-accessibility-it.json` |
| `en-GB` | 13/13 | 0 | 0 | `/workspace/.lilleri-validation/continuation-accessibility-en.json` |

I log omonimi `.log` conservano i singoli controlli. Il cambio di lingua è stato
eseguito fra contesti browser chiusi tramite vere GET/PATCH delle impostazioni,
usando la revisione corrente. La preferenza iniziale `it-IT`, nome e fuso orario
originari sono stati ripristinati e riletti dopo l’audit inglese; evidenza in
`continuation-accessibility-locale-handoff.json` nella stessa directory.

I controlli hanno esercitato landmark, H1 unico, salto al contenuto con tastiera,
focus di pagina, ricerca senza perdita di focus, stati dei filtri e dei radio,
annullamento della conferma distruttiva con isolamento dello sfondo e ritorno del
focus. I pannelli avvisi, collegamenti, esercenti e ricorrenti mantengono gerarchia
dei titoli, nomi e stati dei checkbox e bersagli da almeno 44 CSS px. L’errore di
rete mostra la vista temporanea con `aria-live=polite` e `aria-atomic=true` reali;
il nuovo tentativo torna alla vista online. Il testo attivo supera il controllo
di contrasto nei temi chiaro e scuro; preferenza di movimento ridotto e anello di
focus visibile sono verificati nel DOM.

La Home è stata verificata su viewport di 320 CSS px sia con testo normale sia
con font e interlinea raddoppiati al 200%, mantenendo testo e controlli entro il
bordo. Questo stress DOM è distinto da zoom del browser, Dynamic Type e
impostazioni del dispositivo. Il confronto finale verifica tutti i movimenti,
gli altri fatti dei conti e l’analisi completa. Consente soltanto date di
freschezza monotone e non future sui conti già associati a `mock-italian`,
aggiornate dal refresh automatico; le date dei conti locali restano identiche.

## Limiti di accettazione

Questo lavoro è una verifica locale mirata dei flussi web, non una certificazione WCAG completa. Non sono stati eseguiti VoiceOver, TalkBack, navigazione nativa, caratteri di sistema al 200%, misure fisiche 44 pt/48 dp, né un audit esterno. L’accettazione E22.2, la dichiarazione formale di accessibilità e la revisione su dispositivi restano gate espliciti. I controlli di contrasto dell’helper misurano testo attivo renderizzato e sfondo effettivo sulle pagine esercitate; non attestano grafici, immagini, stati non visitati o tutti gli strumenti assistivi.
