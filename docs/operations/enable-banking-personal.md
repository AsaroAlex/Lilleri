# Collegare i propri conti reali con Enable Banking

Verifica delle fonti: 5 ottobre 2026. Questo percorso riguarda una prova privata
con i propri conti personali. Il sito pubblico Lilleri su Railway resta privo di
collegamenti reali: il suo runtime attuale non dispone di accesso personale e non
può ricevere questi dati. Il connettore personale usa le API di produzione del
provider separatamente dall'archivio e dai profili condivisi del sito.

## Perché questo percorso

Enable Banking consente l'attivazione di un'applicazione **Production** in modalità
**restricted** collegando i conti del titolare nel Control Panel. I termini del
9 gennaio 2026 consentono l'uso personale dei propri conti e prevedono gratuità
entro quel perimetro. L'applicazione non può essere resa pubblica con questa sola
attivazione; accesso a conti di altri utenti e servizio commerciale richiedono un
accordo separato. Il fornitore consente anche valutazioni prima del contratto.

La registrazione del conto nel Control Panel crea la whitelist. Occorre poi una
seconda autorizzazione attraverso l'API per ottenere una sessione utilizzabile dal
connettore. Solo i conti effettivamente collegati vengono restituiti: collegarne
uno non abilita tutti gli altri conti della stessa persona.

## Passaggi del titolare del conto

1. Aprire [Enable Banking](https://enablebanking.com/sign-in/), inserire la propria
   email e usare il collegamento di accesso ricevuto. Non fornire password della
   banca a Lilleri, a questa chat o al terminale.
2. Aprire [API applications](https://enablebanking.com/cp/applications) e registrare
   una nuova applicazione scegliendo **Production**. Il modulo richiede nome,
   descrizione, contatto per la protezione dati, URL dei propri termini/privacy,
   un URL HTTPS di ritorno e la chiave pubblica. Sono dati del titolare: non
   usare contatti o documenti inventati. La modalità restricted non comporta la
   verifica commerciale di quei documenti, ma i campi restano richiesti.
3. Lasciare che il browser generi la chiave privata e conservarne il file PEM
   scaricato in una cartella privata fuori dal repository. Annotare l'Application
   ID. Il file PEM deve restare sul dispositivo; non inviarlo in chat, inserirlo
   in Git, in variabili pubbliche Expo o nel servizio Railway condiviso.
4. Nella nuova applicazione usare **Activate by linking accounts**. Scegliere la
   banca e completare login e conferma esclusivamente nel sito/app della banca.
   Collegare ogni conto personale che si desidera leggere.
5. Configurare il connettore locale con quell'Application ID, il percorso del PEM
   e l'esatto URL HTTPS registrato. Il comando di discovery ricava dal provider
   il nome preciso della banca nel paese scelto. BPER conto e BPER carte, per
   esempio, non devono essere confusi.
6. Avviare il collegamento dal proprio terminale interattivo. Aprire nel browser
   il collegamento di autorizzazione mostrato; al ritorno, copiare l'URL completo
   finale nel prompt locale, che ne nasconde l'inserimento. Non incollare quell'URL
   in questa chat: contiene un codice di autorizzazione di breve durata.

La procedura manuale di ritorno segue il modello del sample ufficiale del provider:
il connettore non richiede un server HTTP locale. Usa un URL HTTPS registrato e
controllato da `GET /application`. Non è stata verificata l'accettazione di callback
HTTP localhost per applicazioni Production. Registrare un URL non significa che
Lilleri abbia già implementato il relativo callback o un login bancario nel sito.
La raggiungibilità e l'accettazione dell'URL scelto restano da verificare durante
la registrazione e il primo esercizio reale.

L'URL di ritorno deve essere sotto il proprio controllo: la query contiene un
codice temporaneo. Evitare pagine di terzi e il sito Railway condiviso; disabilitare
la registrazione delle query nel servizio che riceve il ritorno. Il terminale
verifica quel ritorno ma non controlla i log del servizio HTTPS scelto.

## Comandi locali

Eseguire dal repository sul proprio dispositivo, con Node 22.12+ e pnpm 10.28.
Il workspace cloud condiviso e il terminale di questa chat non sono la destinazione
dei dati personali. Preparare prima il pacchetto:

```bash
pnpm install --frozen-lockfile
pnpm --filter @lilleri/financial-providers... build
pnpm banking:personal --help
```

Creare due cartelle private distinte, entrambe fuori dal repository. Con questi
esempi la chiave di cifratura resta separata dal file di sessione:

```bash
install -d -m 700 "$HOME/.lilleri-personal/keys" "$HOME/.lilleri-personal/session"
```

Collocare il PEM scaricato dal Control Panel in
`$HOME/.lilleri-personal/keys/application.pem` e limitarne i permessi a `600`.
Il comando è:

```bash
chmod 600 "$HOME/.lilleri-personal/keys/application.pem"
```

Impostare i valori reali della propria applicazione; i segnaposto seguenti non
sono credenziali utilizzabili:

```bash
export ENABLE_BANKING_APPLICATION_ID='<Application ID UUID del Control Panel>'
export ENABLE_BANKING_PRIVATE_KEY_PATH="$HOME/.lilleri-personal/keys/application.pem"
export ENABLE_BANKING_PERSONAL_USE=1
export ENABLE_BANKING_COUNTRY=IT
pnpm banking:personal --banks
```

`--banks` esegue discovery reale con le proprie credenziali e restituisce i nomi
esatti delle banche personali ammesse dall'applicazione. Copiare il nome desiderato
senza abbreviazioni; poi completare la configurazione:

```bash
export ENABLE_BANKING_ASPSP_NAME='<nome esatto ottenuto da --banks>'
export ENABLE_BANKING_REDIRECT_URL='<URL HTTPS esatto registrato nel Control Panel>'
export ENABLE_BANKING_DATA_PATH="$HOME/.lilleri-personal/session"
export ENABLE_BANKING_STORE_KEY_PATH="$HOME/.lilleri-personal/keys/session.key"
pnpm banking:personal --check
pnpm banking:personal --connect
```

`--check`, anche senza argomenti, non legge file e non effettua richieste. Un
risultato `configured` verifica la forma della configurazione, senza attestare
chiave, accesso Production o funzionamento con la banca. `--connect` richiede un
terminale interattivo e avvia l'autorizzazione reale dopo i controlli del provider.
Il riepilogo mostra solo conteggi: nessun saldo, IBAN, identificativo di sessione
o codice di autorizzazione viene scritto automaticamente nell'output.

Per le letture successive e la chiusura:

```bash
pnpm banking:personal --refresh
pnpm banking:personal --disconnect
```

Per conservare una lettura ispezionabile, scegliere esplicitamente un nuovo file
fuori dal repository, in una cartella privata con permessi `700`:

```bash
install -d -m 700 "$HOME/.lilleri-personal/captures"
pnpm banking:personal --refresh --export "$HOME/.lilleri-personal/captures/first-read.enc"
pnpm banking:personal --read-export "$HOME/.lilleri-personal/captures/first-read.enc"
```

L'export è cifrato con la chiave locale separata e non sovrascrive un file esistente.
`--read-export` non contatta il provider e mostra il JSON finanziario decifrato solo
in un terminale interattivo privato; non eseguirlo in terminali registrati o condivisi.
Questo comando richiede il percorso della chiave locale e la dichiarazione d'uso
personale, senza richiedere nuovamente l'accesso alla banca. Senza `--export`, saldi
e movimenti restano soltanto in memoria durante la lettura. La sessione cifrata
conserva invece i metadati necessari alle successive letture.

Una nuova autorizzazione non sostituisce silenziosamente una sessione salvata.
La sessione viene chiusa solo dopo una risposta accettata dal provider; i file
locali non sono una prova di revoca bancaria. Se l'esito del primo scambio o della
chiusura è incerto, controllare i consensi nel pannello del provider prima di
riprovare. Un blocco locale concorrente non viene cancellato automaticamente.

## Protezione e funzionamento del connettore

Il client firma JWT RS256 con la chiave dell'applicazione e invia richieste soltanto
all'endpoint ufficiale `https://api.enablebanking.com`. Prima dell'autorizzazione
verifica applicazione attiva, ambiente Production, servizio AIS, paese e URL di
ritorno registrati. L'API non espone uno stato restricted né la whitelist: quei
controlli attestano configurazione e identità dell'applicazione, non l'abilitazione
di un servizio pubblico o la gratuità commerciale.

Il ritorno deve corrispondere all'URL configurato e allo stato casuale creato per
quella singola richiesta. Errori, parametri duplicati, codici riutilizzati o ritorni
di un'altra richiesta non devono essere scambiati per una sessione valida. I dati
di sessione restano cifrati sul dispositivo, fuori dal repository e dagli archivi
condivisi. La lettura conserva i tipi di saldo, gli importi decimali e i movimenti
come dichiarati dal provider; non somma saldi di tipo diverso e non deduplica per
identificatori che potrebbero cambiare.

I movimenti vengono letti con paginazione e intervallo costanti, fino alla fine
esplicita; una pagina vuota con continuation key non indica fine. Il connettore
non inventa IP o header della persona per aumentare la frequenza di lettura. Si
applicano i limiti del provider e della banca per letture senza presenza utente.
Sessione scaduta o revocata richiede una nuova autorizzazione; non si promette una
durata uguale per tutte le banche.

La chiusura cancella la sessione presso il provider. La documentazione specifica
che la revoca alla banca viene eseguita quando possibile: controllare anche i
consensi nell'app della banca o nel
[pannello consensi del provider](https://enablebanking.com/data-sharing-consents/).
Non rappresentare una sessione cancellata come prova universale di revoca bancaria.

## Passaggio al sito Lilleri

Questo connettore è una prova personale privata e non importa automaticamente
risultati nel sito pubblico. Prima del collegamento direttamente nell'interfaccia
web occorrono un runtime autenticato per utente, autorizzazioni persistenti con
callback, archiviazione privata e sincronizzazione del provider. L'entry point
attuale, la creazione connessioni e l'orchestratore sync accettano soltanto il
provider di sviluppo: aggiungere una variabile non li trasforma in un runtime reale.
Le librerie di identità esistenti sono riutilizzabili, ma non sono ancora installate
in un entry point ospitato con tutte le dipendenze richieste.

Per il servizio pubblico servono inoltre l'accordo e l'attivazione commerciale del
provider. Questo percorso non autorizza a inserire conti reali nel profilo condiviso
esposto oggi su Railway. Non sono stati acquistati servizi, creati account presso il
provider o eseguite chiamate a conti reali durante la preparazione del connettore.

## Copertura da verificare nel primo collegamento

La documentazione italiana descrive Intesa Sanpaolo, UniCredit, BPER e altre banche;
la discovery della propria applicazione resta la fonte operativa. La disponibilità
del conto non prova quella di carte, investimenti o altri prodotti della stessa
banca. Amex Italia e Satispay personale restano senza una copertura AIS verificata
per questo percorso: non presentarli come già collegabili.

## Verifiche eseguite

38 test del nuovo client e tutti i 381 test del pacchetto provider superati;
18 test CLI/storage superati. Typecheck provider, API e mobile, build delle
dipendenze, controlli di formato e configurazione superati. I test usano chiavi
temporanee generate per le prove, risposte sintetiche iniettate e cartelle
temporanee; nessuna richiesta bancaria autenticata è stata eseguita. Il comando
predefinito è stato verificato senza configurazione: esce con stato bloccato,
elenca solo i nomi delle variabili mancanti e non avvia I/O.

Questi risultati verificano il software preparato; il primo collegamento reale
resta da eseguire dopo i passaggi del titolare descritti sopra.

## Fonti ufficiali

- [Attivazione dei conti propri](https://enablebanking.com/docs/api/linked-accounts/).
- [Termini del servizio](https://enablebanking.com/terms/), aggiornati il 9 gennaio 2026.
- [Control Panel e registrazione](https://enablebanking.com/docs/api/control-panel/).
- [FAQ: accesso restricted, attivazione, limiti e costi](https://enablebanking.com/docs/faq).
- [Riferimento API](https://enablebanking.com/docs/api/reference/).
- [Migrazione dei domini di autorizzazione, giugno 2026](https://enablebanking.com/blog/2026/06/12/enable-banking-changelog-may-2026).
- [Esempio ufficiale con URL di ritorno manuale](https://github.com/enablebanking/enablebanking-api-samples/blob/master/python_example/account_information.py).
- [Specificità italiane](https://enablebanking.com/docs/markets/it).
- [Specificità Amex descritte nella pagina svedese](https://enablebanking.com/docs/markets/se/).
