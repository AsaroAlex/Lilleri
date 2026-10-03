# Verifica browser dei flussi finanziari locali

Verifica eseguita il 3 ottobre 2026 con Chromium reale, Expo web e API `DEMO_MODE=1` su un archivio PGlite sintetico isolato: **17 gruppi passati in un’unica esecuzione, nessun errore JavaScript non gestito**. Il controllo usa le risposte dell’API per verificare gli effetti delle azioni nel browser; gli importi sono confrontati come interi `bigint`, separando EUR e GBP. La verifica completa è stata ripetuta sullo stesso archivio di prova dopo aver aggiunto il download ZIP: usa i conteggi effettivi di partenza e identità sintetiche nuove.

## Riproduzione

Sono necessari Node 22+, dipendenze del workspace installate, Chromium e Playwright risolvibile da Node. Playwright è uno strumento dell’ambiente di verifica, non una dipendenza di produzione. L’ambiente cloud verificato lo fornisce già.

Avviare la demo su una **nuova directory** scelta per questa verifica:

```sh
PGLITE_PATH=/percorso/nuovo-archivio-sintetico pnpm dev
```

Quando API ed Expo rispondono, eseguire da un altro terminale nella radice del repository:

```sh
node tools/financial-ui-smoke.cjs
```

Il frontend predefinito è `http://localhost:8081`, perché Expo `--localhost` può ascoltare su IPv6; l’API è `http://127.0.0.1:3001`. Entrambi gli URL possono essere passati come argomenti. Le origini consentite dal server devono includere quella del frontend. `CHROMIUM_EXECUTABLE` permette di scegliere l’eseguibile; `LILLERI_FINANCIAL_SMOKE_REPORT` permette di scegliere il file JSON del risultato, altrimenti scritto in `/tmp/lilleri-financial-ui.json`.

Non eseguire altri writer sullo stesso archivio durante la verifica. Lo script aggiunge un conto locale e quattro movimenti sintetici, dei quali uno annullato; conserva lo storico. Lascia la regola creata disattivata e ripristina le impostazioni e lo stato iniziale della riconciliazione. Non elimina il profilo e non cancella una directory esistente. Per ottenere sempre la stessa base, usare una nuova directory a ogni esecuzione.

## Casi verificati

| Flusso | Evidenza verificata |
| --- | --- |
| Caricamento | Profilo sintetico, EUR/GBP separati, importi JSON esatti e nessun overflow a 390 px. |
| Riconciliazione tra due pagine | La conferma della prima pagina vince; il rifiuto con revisione obsoleta riceve `409 reconciliation_changed`, aggiorna gli indizi e invia una sola scrittura. |
| Refresh del conflitto fallito | L’errore di rete viene iniettato dopo il conflitto: gli indizi precedenti restano visibili e l’azione non viene ripetuta. |
| Creazione regola | La bozza e l’anteprima retroattiva non cambiano categorie, movimenti, importi o totali. |
| Applicazione regola | I tre movimenti Netflix cambiano categoria; importi, conti, riconciliazioni e totali restano identici. |
| Disattivazione e undo | La disattivazione ripristina le categorie; l’undo crea una bozza che richiede un’altra anteprima. |
| Anteprima obsoleta | Una modifica API concorrente rende obsoleta l’anteprima; l’applicazione riceve `409 rule_changed` e non attiva la regola. |
| Apertura conto manuale | EUR 100,25 aggiunge esattamente 10.025 centesimi al saldo senza creare entrate o movimenti. |
| Inserimento e annullamento | Una spesa da 250 centesimi aggiorna saldo e spese; l’annullamento li ripristina e mantiene il movimento come `reversed`. |
| Correzione del saldo | Correzione e undo aggiungono due eventi allo storico senza inventare entrate, spese o movimenti. |
| CSV | L’anteprima non scrive; due righe da -120 e +500 centesimi cambiano il saldo manuale di +380, le spese di +120 e le entrate di +500. |
| CSV ripetuto | Stessi ID, nessun movimento aggiunto, nessun cambiamento a saldi o totali. |
| Impostazioni tra due pagine | La prima scrittura persiste; la seconda riceve `409 settings_changed`, scarta il modulo obsoleto e non salva automaticamente. |
| Nuovo gesto per le impostazioni | Una scelta esplicita successiva salva Tokyo; date di contabilizzazione, importi e totali restano identici. |
| Layout 320 px | Home, modulo regole, conto manuale, CSV e impostazioni senza overflow orizzontale della pagina. |
| Archivio ZIP | Download reale tramite il pulsante Privacy a 320 px, 11 file, conteggi del manifest, dimensioni e digest SHA-256 dei dieci file descritti, schema JSON Draft 2020-12, eventi JSONL, importi CSV -120/+500 ed esatta corrispondenza del JSON con movimenti e totali correnti. Header HTTP e OpenAPI dichiarano `application/zip`; OpenAPI dichiara un contenuto binario. Il download non cambia i dati finanziari. |
| Errori JavaScript | Nessun evento `pageerror` sulle pagine esercitate. |

Questa verifica ha inoltre individuato un difetto reale dopo l’introduzione delle sessioni: il client inviava `credentials: include` anche nella demo mentre il server consentiva le credenziali CORS solo nella modalità identità. La correzione emette `Access-Control-Allow-Credentials: true` per le sole origini già consentite; il test browser è stato rieseguito e passato dopo la correzione. Il confine delle origini ha una verifica API dedicata.

Il risultato riguarda il prototipo web locale con dati sintetici. Non dimostra esecuzione su iOS/Android, accesso a banche reali, completezza del futuro MVP o conformità della configurazione di produzione. Il percorso di identità locale ha un helper separato, `tools/identity-ui-smoke.cjs`.
