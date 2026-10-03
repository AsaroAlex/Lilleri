# PROJECT STATE — Lilleri

> Memoria operativa corrente. Mandato in `docs/BRIEF.md`; prove e limiti in
> `docs/STATUS.md`; tutti i 40 epic in `docs/product/execution-plan.md`.
> Se stato e sorgenti divergono, valgono sorgenti e verifiche effettive.

## Mandato persistente

Il fondatore ha chiesto di eseguire tutto il piano del repository e completare la
continuazione. I 37 deliverable iniziali hanno una base documentata ed eseguibile;
non equivalgono al completamento del futuro MVP P0, launch P1, expansion P2 e Later.
Proseguire autonomamente sul lavoro tecnico locale, senza inventare sandbox,
contratti, autorizzazioni, calibrazione, coverage, prove utenti o gate di produzione.

- Lilleri, scope @lilleri/*; documenti inglesi e copy prodotto italiano.
- Fiducia > correttezza > sicurezza > semplicità > automazione > affidabilità > privacy.
- FACT / ASSUMPTION / HYPOTHESIS / DECISION / UNKNOWN con fonti e date.
- Nessuna credenziale bancaria, PAN, dato personale reale, segreto nel repo o scraping.
- Money bigint con valuta, JSON stringhe esatte; nessuna somma cross-currency senza FX.
  Date finanziarie SQL DATE; istanti UTC; calendario del profilo con timezone IANA.
- Branch `claude/admiring-hypatia-yzh6nq`, commit/push normali e frequenti; niente
  force push o PR senza richiesta. Checkout già isolato, nessun nuovo worktree necessario.
- Aggiornare questa memoria dopo decisioni/verifiche. Non chiedere conferma per lavoro
  tecnico reversibile già autorizzato; verificare il risultato prima di dichiararlo.

## Ambiente e startup

- Checkout `/workspace/Lilleri`, Debian 13 x86_64. Ogni shell, inclusi hook Git:
  `. /workspace/.lilleri-toolchain/env.sh`. Node 22.22.0, pnpm 10.28.0.
- Toolchain/cache fuori checkout; store `/workspace/.lilleri-cache/pnpm-store`.
  Root e `tools/brand-render` hanno frozen install separati. Durante la ricreazione
  della toolchain attendere npm prima di avviare altri comandi pnpm.
- `pnpm dev` precompila dipendenze/API/client/brand, poi Next 127.0.0.1:3000,
  Expo localhost:8081 e API 127.0.0.1:3001. Demo iniziale 5 conti/35 movimenti.
  Readiness HTTP e money strings verificati; i processi non persistono necessariamente.
- Expo dev/build e comandi diretti devono usare `--clear`: Metro ha riprodotto
  bundle obsoleti di auth e ARIA dopo cambi di modalità/sorgente.
- DEMO_MODE=1 oppure LOCAL_AUTH_MODE=1/DEMO_MODE=0, esclusivamente loopback/nonproduzione.
  Auth locale richiede LOCAL_AUTH_SECRET stabile >=32 caratteri, solo nel processo;
  client EXPO_PUBLIC_LOCAL_AUTH_MODE=1 e host localhost coerente per cookie Strict.
  Signup crea un profilo vuoto, senza connessione automatica.
- PGlite default `.lilleri/data` ignorato: NON cancellare archivi. Usare un nuovo
  PGLITE_PATH esterno per prove; mai aprire lo stesso file store da due processi.
  Demo erasure persiste tombstone/404 e non risemina il profilo.
- Vault locale indipendente fuori dal backup finanziario: LOCAL_KEY_VAULT_PATH.
  Default partizionato dal target PostgreSQL effettivo tramite il parser del driver,
  incluse socket/default/override duplicati, senza credenziali; PGlite usa il suo path.
  Se si cambia vault per un archivio esistente, usare esplicitamente quello corretto:
  un vault errato non certifica distruzione e non decifra i dati.
- DATABASE_URL è trusted per migrazioni/identity/manutenzione. DATABASE_RUNTIME_URL
  può fornire credenziali runtime non-owner separate; fallback SET LOCAL ROLE mantiene
  l'autorità trusted nella sessione. Tutto HTTP finanziario usa withProfile e RLS.
- Pump revoche/retention/notifiche usano lo stesso handle del server, configurazione
  persistita autorevole e batch limitati. Worker/operator separati solo PostgreSQL.
  Dist compilato: ricompilare API/database dopo modifiche; watch osserva dist.
- PostgreSQL16.15: container `lilleri-resume-pg`, loopback55432; DB finale
  `lilleri_completion_final_20261003`, 22 migrazioni frozen. Il vecchio `lilleri_test`
  conserva checksum draft0010: non modificarne history né allentare il guard.
- Restore offline/quarantena richiede journal HMAC latest e chiave indipendenti;
  niente traffico/jobs prima di replay. Non ripristinare un vecchio vault da un backup
  finanziario o inferire distruzione di tutte le copie. Vedere operations/deletion-aware-restore.
- Docker/daemon/processi non garantiti in task futuro. Git HTTPS proxy funziona;
  riusare autenticazione piattaforma senza estrarre token.
- Install/start cloud: revisione finale in STATUS. Salvataggio draft non dimostra
  pubblicazione o restore in un task fresco. Demo non richiede segreti bancari.

## Implementazione effettiva, 2026-10-03

Base precedente: money/date/domain, mock provider, ingest atomico/idempotente,
riconciliazione conservativa con revisioni/ABA, correzioni sticky/undo, ricorrenze
stimate, valuta separata, Expo/Next/brand, Better Auth locale con UV/TOTP/recovery/
step-up/sessioni, regole versionate, manual opening/entries/adjustments/reversal,
CSV canonico, settings/entitlements free-beta, revocation outbox, raw TTL originale
720h e ZIP11file. Questa fase aggiunge:

- E00: configurazione runtime strict e audit immutabile, rollback come nuova revisione,
  consumer effettivi live; operator PostgreSQL e guard AST10consumer/17campi. OpenTelemetry
  ufficiale, collector locale bounded, catalogo semantico allowlist senza contenuto
  finanziario/URL/errori raw; endpoint interni loopback, nessun network exporter.
- E06/E24: household/account membership/scope riservati, RLS ENABLE/FORCE, transazioni
  runtime scoperte server-side, risposta solo dopo commit. Prove credenziali non-owner,
  pooled context cleanup e due cluster distinti con socket/DB omonimi.
- Cifratura AES256GCM per profilo e campo/row AAD; DEK wrapped da adapter indipendente
  locale. Financial text, raw payload, manual reasons, mapping CSV e snapshot cifrati;
  upgrade legacy lossless/atomico con trigger ripristinati su rollback. Account names,
  merchant keys, rule definitions e altri contenuti/copie non interamente cifrati.
- Delete: intent/tombstone atomico, key finalization post-commit e certificato onesto;
  expected-key impedisce falso successo con vault errato. Restore CLI protegge journal,
  invalida sessioni, replay profilo/chiavi e revoche senza risuscitare dati.
- Support: grant owner15min, operator port trusted, MFA/due approvatori distinti,
  audit owned e diagnostica solo masked count/health. Nessuna escalation HTTP autoasserita.
- E02/E13: discovery synthetic per account kind con provenienza/unknown expliciti;
  consent/SCA/session/token distinti, pause/resume/renew revisionati, denial pre-I/O,
  storico immutabile e pannello reale. Nessuna coverage o connessione bancaria reale.
- E18 privacy: rules-only modifica davvero classificazione; quiet/private escludono
  evidenza dagli insight conservando ledger/export. Permission draft purpose/current
  choice audit, ritiro revision-only anche obsoleto; N-SERVICE locale off iniziale;
  AI/identified analytics non disponibili, nessun toggle inerte o permesso OS finto.
- E17: feed in-app content-free, six preferences, quiet IANA/DST, bounded pump, reminder
  legati alla generazione/scadenza reale; diritti/security indipendenti da opt-out.
  Sync con review items e POST ZIP sono produttori reali; GET JSON/ZIP read-only.
- E15/E16: riepilogo osservato mensile per valuta, refund distinto, evidenze e limiti;
  safe-to-spend con conti scelti, orizzonte, buffer e formula esplicita. Copertura/balance
  bancari unknown o liabilities private restituiscono unavailable, nessuna certezza.
- E05: mapper CSV256KiB/1000righe, locale/date/debit-credit/status espliciti, preview,
  saved mapping revision/archive/restore, acknowledgement duplicati generati, receipt
  retry idempotente e valueOn/provenance durevole. Nessun XLSX o share nativo consegnato.
- Owned export include consent/support/privacy/notifiche complete/mapping storico
  decrypted, references/revision/clocks validati; ZIP11file/version1 compatibile.
  Timestamp storici legittimi conservati; nuove transizioni usano un istante catturato.
- Client: nuovi pannelli e gestione epoche identità, stale409 richiede nuovo gesto;
  web ARIA esplicita oltre a props native. Non prova generale assistive/native acceptance.

## Verifiche finali

- 553 casi Vitest distinti:265core (money63/domain35/provider85/engine82) +288API.
  DefaultAPI285pass/3skip PostgreSQL; configuratoPG287pass/1skip secondo cluster.
  Anche quel caso passa nella prova RLS16/16 con cluster socket realmente indipendenti.
  Ripetizioni driver non aggiungono casi; configurazione singleton/reopen/copie file
  restano volutamente PGlite, collector15test senza DB.
- Installer integrale finale exit0; frozen root/brand, pnpm check22task e build10task
  inclusi Next/Expo web. PG Turbo reale8task pass; DB finale22checksum/migrazioni.
  Quattro gruppi Node AST e scan10consumer/17campi passati, fuori dai553Vitest.
- Browser: financial17, connections9, privacy10, notifiche7, understanding9, mapped9,
  auth16; zero errori JS, reflow320/390px secondohelper. Default e auth su archivi
  sintetici separati, writer demo sequenziali. Auth finale API compilata corrente e
  export con --clear; probe indipendente UV/origin/replay/malformed key/session denial.
- Cloud draft revisione5 salvata e verificata con readback: installer/start esatti;
  repository, network preset, secrets e runtime requirements preservati. Non pubblicato,
  restore in un task fresco non verificato. Nessun segreto aggiunto.

- Runner frozen originale:38scenari/51movimenti; annotazioni51/51 e13/13relazioni,
  0/46errori automatici categorie e0/6relazioni sul toy set dell'autore. Nessuna
  accuracy/calibrazione/precisione rappresentativa inferita.
- Audit prod2026-10-03:2HIGH node-forge1.4.0/braces3.0.3,0MODERATE, nessuna patch
  riportata. Scoped xcode3.0.1>uuid11.1.1 resta mitigato con prova compatibilità
  CommonJS/PBX/buffer storica; nessuna accettazione signing/native.
- Remote CI, native/assistive technology/utenti, TLS/KMS/PITR/processor/legale non
  dichiarati passati. Archivio fixture attuale contiene dati sintetici aggiunti dai test.

## Piano residuo e prossima continuazione

Tutte le40righe E00–E39 restano in execution-plan con acceptance effettive.
Prossimo lavoro tecnico indipendente: E03 scheduler/jobs/budget/pending overlay/
trailing/resume/gap/balance; merchant/tassonomia/correction e feedback ricorrenti;
XLSX e dedup cross-source; insight snapshots/scelte persistite; tombstone source-only
nel restore e più classi cifrate/index/tokenization; offline scoped encrypted cache,
ICU/English/copy lint, tastiera/focus/text200%/reduced motion; tools valutazione
rappresentativa/calibrazione/shadow automation. Gate esterni non sospendono questi task.

Sandbox ufficiale solo con accesso emesso; pilot reale dopo contratto/route legale,
DPIA/processori/security/consenso partecipanti. Naming clearance, coverage/fees e
WTP/sostenibilità non provati. P1billing/release e P2/Later Famiglia/chat/OCR/offers
richiedono dipendenze/evidenze proprie. Nessun deployment, charge, PR o collegamento
reale autorizzato dalle prove sintetiche.

## Git

Base di questa fase `b85b307f04c5118a83548a549235923825b07d5d`; continuazione sullo
stesso branch con commit/push normali. Verificare remote prima di push; integrare
cambi concorrenti senza force/reset/perdita. Commit finale registrato in Git.
