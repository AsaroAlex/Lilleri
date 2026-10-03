# PROJECT STATE — Lilleri

> Memoria operativa corrente. Mandato in `docs/BRIEF.md`; prove e limiti in
> `docs/STATUS.md`; tutti gli epic in `docs/product/execution-plan.md`.
> Se stato e sorgenti divergono, valgono sorgenti e verifiche effettive.

## Mandato persistente

Il fondatore ha chiesto di eseguire tutto il piano del repository. I 37 deliverable
iniziali hanno una base documentata ed eseguibile; non equivalgono al completamento
del futuro MVP P0, launch P1, expansion P2 e Later. Proseguire autonomamente sul
lavoro tecnico locale. Non inventare accesso sandbox, contratti, autorizzazioni,
calibrazione, coverage, prove utenti o gate di produzione.

- Lilleri, scope @lilleri/*; documenti inglesi e copy prodotto italiano.
- Fiducia > correttezza > sicurezza > semplicità > automazione > affidabilità > privacy.
- FACT / ASSUMPTION / HYPOTHESIS / DECISION / UNKNOWN con fonti e date.
- Mai credenziali bancarie, PAN, dati personali reali, segreti nel repo o scraping.
- Money bigint con valuta, JSON stringhe esatte; niente somme cross-currency senza FX.
  Date finanziarie SQL DATE; instanti UTC; calendario del profilo con timezone IANA.
- Branch `claude/admiring-hypatia-yzh6nq`, commit/push normali e frequenti; niente
  force push o PR senza richiesta. Checkout già isolato: niente worktree non richiesto.
- Aggiornare questa memoria dopo decisioni/verifiche senza annunciarlo salvo problemi.

## Ambiente e startup

- Checkout `/workspace/Lilleri`, Debian 13 x86_64. Ogni shell:
  `. /workspace/.lilleri-toolchain/env.sh`. Node 22.22.0, pnpm 10.28.0.
- Toolchain/cache fuori checkout. Store `/workspace/.lilleri-cache/pnpm-store`;
  root e `tools/brand-render` hanno frozen install separati. Non usare il pnpm di
  sistema durante la ricreazione della toolchain: aspettare install e riattivare.
- `pnpm dev` precompila API/client/brand e dipendenze; avvia Next su 127.0.0.1:3000,
  Expo su localhost:8081 (qui IPv6::1), API su 127.0.0.1:3001. Readiness HTTP 200 e
  fixture iniziale 5 conti/35 movimenti, EUR/GBP separati e money strings verificate.
- Expo dev/build usano `--clear`: cambiare modalità auth/demo o API URL senza
  pulire Metro ha prodotto una variante client sbagliata, riprodotta e corretta.
  Nei comandi Expo diretti usare `--clear`; Turbo lega la cache alle variabili pubbliche.
- Default DEMO_MODE=1; alternativa LOCAL_AUTH_MODE=1 con DEMO_MODE=0. Entrambe
  rifiutano produzione e non-loopback. Auth locale richiede LOCAL_AUTH_SECRET
  stabile di almeno 32 caratteri nel processo, mai log/repo; client con
  EXPO_PUBLIC_LOCAL_AUTH_MODE=1 e API URL localhost coerenti per cookie Strict.
  Signup crea un profilo vuoto e non connette fonti automaticamente.
- PGlite default `.lilleri/data` ignorato: NON cancellare archivi. Usare un nuovo
  PGLITE_PATH esterno per prove. Erasure demo persiste tombstone e overview 404, no reseed.
- API/shared sorgenti compilate: watch monitora dist, quindi ricompilare. Processi
  non garantiti nel task successivo. Non aprire PGlite da due processi.
- API esegue pump revoche e retention sul proprio handle, anche in auth locale.
  Worker separati solo PostgreSQL sintetico; documentazione in `docs/operations`.
- PostgreSQL 16.15 nel container `lilleri-resume-pg`, loopback 55432. DB finale
  `lilleri_execution_20261003`: tutte le 12 migrazioni finali/frozen. Vecchio `lilleri_test`
  conserva un checksum draft 0010: NON cambiarne history/checksum né allentare guard.
  Se una migrazione ancora non committata cambia dopo applicazione, creare un DB nuovo.
- Docker/daemon/processi non garantiti per il task futuro. Git proxy HTTPS funziona;
  riusare autenticazione piattaforma senza estrarre token.
- Install/start cloud salvati come draft: revisione in STATUS. Salvataggio non
  dimostra pubblicazione o restore in task fresco. Nessun egress/segreto da aggiungere
  per il fallback DevTools; nessuna chiave bancaria necessaria alla demo.

## Implementazione effettiva, 2026-10-03

- Fondamenta: money/date/domain, provider mock, ingest atomico/idempotente,
  riconciliazione conservativa, correzioni sticky/undo, ricorrenze stimate, overview
  per valuta, Expo/Next e brand B “li”/T3 carta-vino/font OFL. Evidenza storica: 80 contrasti / 61 asset.
- Match revision SHA256 vincolata a profilo, candidato, algoritmo/evidenza, counter,
  leg revisions e struttura conto. Stale 409 senza scritture, ABA/concorrenti protetti.
- Payload raw separati da provenance immutabile, TTL originale 720 ore; replay non
  prolunga né ricrea contenuto. Export omette scaduti prima della pulizia. Pump
  limitato/equo/nonoverlap, stop pulito e status aggregato. Non retention di produzione.
- Outbox revoca sopravvive erasure; denial/tombstone/job atomici. Grant-specific
  capability, claim committato prima I/O, lease/fenced ack/timeout/retry bounded;
  regrant bloccato in attesa di acknowledgement. Non scheduler bancario completo.
- Better Auth locale: membership derivata server, sessione DB a ogni richiesta,
  UV passkey con prova Chromium virtuale, TOTP/recovery one-use, 90 giorni/sessionlist/revoke,
  age/draftterms acceptance, step-up di 5 minuti per JSON/ZIP export/disconnect/delete,
  quote auth locali atomiche. Identity/finance erase stessa transazione.
  Email reale, recovery di produzione e fattori nativi non consegnati.
- Regole categoria con condizioni strutturate, versioni, draft/preview/apply/disable/
  archive/undo come draft; token vincolato a dati/policy, conflitti richiedono review.
  Conti manuali con opening balance, entrate/uscite, correzione saldo, reversal/audit
  e command receipts idempotenti. CSV canonico bounded preview/import/reimport atomico.
- Settings modificano davvero nome/timezone; locale it-IT, revisioni e audit. Pure
  Gratis/Plus/free-beta entitlements: correctness/privacy/ownership sempre gratuiti.
  Nessun billing, trial o enforcement live-cap finto.
- ZIP locale: 11 file CSV/JSON/eventi/schema/manifest, money stringhe esatte e CSV
  safety prefix solo sui testi rischiosi; JSON originale lossless. Limite 32 MiB esplicito.
  JSON export resta disponibile; nessun link pubblico o delivery job inventato.
- Runner originale sintetico frozen, 38 scenari / 51 movimenti, metriche con denominatori
  espliciti/null e astensione separata. Non corpus rappresentativo, calibrazione o live audit.
- App integra auth/regole/manual/import/settings. Epoche identità fermano risposte
  tardive dopo logout/renewal/principal change e vecchi 401; segreti enrollment solo
  memoria effimera, broadcast tra schede. Step-up richiede un nuovo gesto, no auto-replay.

## Verifiche finali

- 264 casi distinti: 167 core (money 63, domain 35, providers 19, engines 50) + 97 API.
  `pnpm check`: 22 task; `pnpm build`: 10 task, Next ed Expo WEB. Installer completo
  eseguito con exit 0; frozen root/brand e renderer Sharp 16×16 passati.
- 97 API ripetuti nella vera suite PostgreSQL tramite Turbo: 8 task, integrazione senza
  cache. Stessi casi, non contarli due volte. Legacy/reopen restano PGlite dove previsto.
- PG: 12 SHA migrations ripetute,16 FK composite,2 trigger immutabili. Ruolo test
  owner/superuser: nessuna prova RLS/TLS/KMS/PITR/restore di produzione.
- Browser finale: 17 gruppi finanziari e 16 auth locale, 0 errori JS; reflow 320 px.
  Auth finale esportato con `--clear` e provato su API finale/nuovo archivio sintetico.
  Probe UV passkey separato ripetuto contro API compilata finale: denials corretti.
  Storici 16 + 2 render groups del 2026-10-02 restano evidenza datata; native/assistive tech/utenti non verificati.
- Runner: 38 scenari / 51 movimenti, annotazioni 51/51 e 13/13 relazioni su toy set dell’autore;
  errori automatici osservati 0/46 categorie e 0/6 relazioni. Nessuna accuracy reale inferita.
- Audit prod 2026-10-03: 2 HIGH (node-forge 1.4.0, braces 3.0.3), 0 MODERATE, nessuna patch
  riportata. UUID mitigato solo xcode3.0.1>uuid11.1.1: CommonJS/PBX/buffer verificati,
  non native iOS/signing. SECURITY conserva triage; non audit pulito.
- Scan storica redatta di 84 file non è scan completa/history; remote CI non dichiarata eseguita.

## Piano residuo

`docs/product/execution-plan.md` conta tutti i 40 epic e le acceptance ancora aperte.
Ordine: configurazione/observability/ruoli/RLS/encryption/restore → consent/sync budget/
resume/gap/balance → merchant/taxonomy/correction/privacy → recurring/insight mensili/
safe-to-spend/mapper → offline/i18n/a11y/native → valutazione rappresentativa/
calibrazione/automation. I gate esterni non sospendono lavoro tecnico indipendente.

Sandbox solo con accesso ufficiale emesso; pilot reale solo dopo contratto/route legale,
DPIA/processori/security e consenso partecipanti. Naming clearance, coverage/fees,
WTP/sostenibilità non provati. P1 billing/release e P2/Later Famiglia/chat/OCR/offers
richiedono proprie dipendenze ed evidenze. Nessun deployment, charge, PR o collegamento
reale autorizzato da queste prove sintetiche.

## Git

Software della continuazione salvato in `4fe6c6d`; documenti/stato nel commit successivo.
Base precedente `c4bea21d123521be234698a119301ae9bbc613b8`; remote concorrente storico
72ec8b6 integrato con 0234761 senza reset/perdita. Continuazione salvata nello stesso
branch; verificare remote prima push e integrare cambi concorrenti senza force.
