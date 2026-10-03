# E22 — controlli locali di accessibilità web

Il componente di conferma dell’App ora espone `alertdialog`, nome e conseguenza. Il focus iniziale va all’annullamento; `Tab` e `Shift+Tab` restano nel dialogo; `Escape` annulla solo quando non è in corso un’azione. Lo sfondo è `inert` e nascosto all’albero accessibile durante la conferma. La chiusura ripristina gli attributi precedenti e il focus sul pulsante di apertura solo se il contesto d’identità resta attuale. La stessa primitive protegge la conferma della revoca di tutte le sessioni.

Il primo controllo effettuato sul browser dell’App precedente ha rilevato un difetto concreto: la conferma di eliminazione aveva soltanto `role=alert`, il focus restava fuori, quattro pressioni di Tab attraversavano la navigazione, Escape non chiudeva e Annulla non restituiva il focus. Inoltre i due radio del dettaglio non esponevano `aria-checked` nel DOM di React Native Web 0.21. La correzione conserva gli stati nativi e aggiunge gli attributi web espliciti.

L’App ora ha un solo H1, un contenuto `main` nominato, navigazione nominata con `aria-current`, salto al contenuto con tastiera e focus sul titolo quando cambia pagina. Filtri e categorie espongono `aria-pressed`; l’ambito della correzione è un gruppo radio con stato verificabile. Gli avvisi dell’App sono regioni vive con urgenza e atomicità esplicite. L’anello di focus usa il colore primario del tema, spessore 3 px e distacco 2 px: il precedente `borderStrong` non raggiungeva 3:1 su `primarySoft`. La preferenza di movimento ridotto disabilita animazioni e transizioni web. Queste modifiche non alterano i controlli di identità, le revisioni o le azioni finanziarie.

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

## Verifica dell’App da eseguire sul deployment finale

`tools/accessibility-ui-audit.cjs [UI_ORIGIN] [API_ORIGIN] [it-IT|en-GB]` usa le preferenze salvate reali, richiede una demo sintetica e blocca tutte le richieste browser diverse da GET/HEAD/OPTIONS. Non salva preferenze, notifiche, decisioni, sessioni o movimenti. Va eseguito per ciascun locale dopo che il verificatore della lingua ha rilasciato il profilo; il confronto dello snapshot finanziario richiede assenza di altri scrittori.

Il controllo prepara verifiche DOM e tastiera su landmark, heading, focus di pagina, ricerca, stati di scelta, annullamento della conferma, avviso vivo di consultazione temporanea dopo errore di rete, contrasto del testo attivo nei temi chiaro e scuro, anello di focus, bersagli da almeno 44 CSS px, viewport 320 CSS px e stress del testo al 200%. Il 200% è un raddoppio DOM di font e interlinea, distinto da zoom del browser, Dynamic Type e impostazioni del dispositivo. La matrice finale dell’App non è ancora dichiarata eseguita in questo documento.

## Limiti di accettazione

Questo lavoro è una verifica locale mirata dei flussi web, non una certificazione WCAG completa. Non sono stati eseguiti VoiceOver, TalkBack, navigazione nativa, caratteri di sistema al 200%, misure fisiche 44 pt/48 dp, né un audit esterno. L’accettazione E22.2, la dichiarazione formale di accessibilità e la revisione su dispositivi restano gate espliciti. I controlli di contrasto dell’helper misurano testo attivo renderizzato e sfondo effettivo sulle pagine esercitate; non attestano grafici, immagini, stati non visitati o tutti gli strumenti assistivi.
