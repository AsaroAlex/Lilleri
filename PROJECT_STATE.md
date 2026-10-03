# PROJECT STATE — Lilleri

> Memoria operativa corrente, 2026-10-03. Mandato in `docs/BRIEF.md`, prove e
> limiti in `docs/STATUS.md`, tutti i40 epic in `docs/product/execution-plan.md`.
> Sorgenti e verifiche effettive prevalgono su annotazioni storiche.

## Mandato persistente

Eseguire il piano del repository e completare autonomamente il lavoro tecnico
locale autorizzato. Ultime istruzioni: fare pull e unire il lavoro; pubblicare
l’ambiente appena si raggiunge un punto stabile. I37 deliverable iniziali sono
fondamenta, non l’intero MVP P0/launch P1/expansion P2/Later né un prodotto bancario
pronto per produzione. Non inventare accesso provider, contratti, coverage,
calibrazione, prove utenti, autorizzazioni o gate superati.

- Lilleri/@lilleri/*; documentazione inglese, prodotto italiano/inglese ICU.
- Fiducia > correttezza > sicurezza > semplicità > automazione > affidabilità > privacy.
- FACT/ASSUMPTION/HYPOTHESIS/DECISION/UNKNOWN con fonti/date.
- Money bigint e valuta, JSON con stringhe esatte; niente somme tra valute senza FX.
  Date finanziarie SQL DATE; istanti UTC; calendario del profilo con timezone IANA.
- Solo dati sintetici, niente credenziali bancarie/PAN/dati reali/segreti nel repo.
- Branch `claude/admiring-hypatia-yzh6nq`: commit/push normali, niente force push;
  nessuna nuova PR richiesta. Non chiedere permesso per lavoro reversibile autorizzato.
- Checkout già isolato. Preservare modifiche, stashes e archivi ignorati.

## Pull e provenienza del lavoro

Base verificata precedente `5bbdec9f1d17ce807f1bb01f14bd041099d8d6bf`:
553 Vitest,77 browser groups e22 migrazioni. Sono prove storiche, non totali attuali.
Il remoto è stato integrato con fast-forward prima a `aa3c527` (PR1/2), poi al pull
richiesto `cf608e0eef7fae95ebb32f8082c5d34dd53778c2` (PR3 zero-investment).

Prima di ogni integrazione, modifiche/untracked sono stati archiviati fuori repo,
verificati byte per byte e conservati anche in stash. Ultima preservazione:
`/workspace/.lilleri-validation/preserve-before-zero-pull-20261003.tar.gz`,203 file,
SHA256 `1e8b548cc6e21ca3705da512ce972926e2190dbe06c6c47fe62e7ca12e1da855`.
Risolvere conflitti preservando sorgenti verificati e nuove aggiunte remote: la PR3
aggiunge correttamente `--clear` al launcher Expo. Nessun file di migrazione applicato
è stato riscritto. Non eliminare gli stashes/archivi per pulire lo stato.

## Ambiente e startup

- `/workspace/Lilleri`, Debian13x86_64. Ogni shell/hook Git deve attivare
  `. /workspace/.lilleri-toolchain/env.sh`: Node22.22.0, pnpm10.28.0.
- Toolchain/cache esterni; store `/workspace/.lilleri-cache/pnpm-store`.
  Frozen install root e separato `tools/brand-render`. La ricreazione della toolchain
  tramite npm deve finire prima di altri comandi Node/pnpm.
- `pnpm dev` precompila API/client/brand e avvia Next127.0.0.1:3000,
  API127.0.0.1:3001, Expo localhost8081. Nuovo demo:5 conti/35 movimenti EUR/GBP.
  API runtime usa dist: ricompilare dopo modifiche. Expo deve usare `--clear`.
- `pnpm dev:zero` usa porte3191/8181 e archivio ignorato `.lilleri/zero-budget/data`,
  senza credenziali remote ereditate/checkout/banche reali/AI esterna. Vault e journal
  indipendenti nel home dell’utente `.lilleri-zero-budget/<path-hash>/`.
  `check:zero`/`economics:zero` non avviano né comprano servizi.
- Solo DEMO_MODE=1 o LOCAL_AUTH_MODE=1/DEMO_MODE=0 loopback/nonproduzione.
  Auth richiede LOCAL_AUTH_SECRET stabile>=32 caratteri solo nel processo,
  LOCAL_AUTH_BASE_URL/client coerenti localhost e EXPO_PUBLIC_LOCAL_AUTH_MODE=1.
  Non stampare/persistire segreti. Signup crea un profilo vuoto.
- PGlite default `.lilleri/data` persistente ignorato: non cancellarlo. Per fixture
  nuove scegliere PGLITE_PATH esterno; mai due processi sullo stesso file store.
  Profilo demo erasure conserva tombstone/404 e non risemina.
- LOCAL_KEY_VAULT_PATH fuori dai backup finanziari e stabile per archivio. DefaultPG
  dipende dal target effettivo del driver, incluse socket/override, senza credenziali.
  Un vault sbagliato non certifica distruzione e non decifra l’archivio.
- SOURCE_ERASURE_JOURNAL_PATH default sibling del vault con suffisso `-source-journal`.
  Journal HMAC/fsync ed anchor indipendenti devono essere correnti. Replay profile-
  deletion e source-erasure obbligatorio prima di traffico/jobs; restore offline
  resta in quarantena se mancano prove o recovery. Non ripristinare insieme un
  vault/journal obsoleti e chiamarli correnti.
- Source erase elimina righe della generazione verificata e redige snapshot; il DEK
  condiviso del profilo rimane per altre fonti. Non è cryptoshred per fonte né prova
  di distruzione di tutte le copie/KMS/PITR/processori.
- DATABASE_URL trusted per migrazione/identity/manutenzione; DATABASE_RUNTIME_URL
  può fornire login runtime non-owner separato. Financial HTTP usa withProfile e
  FORCE RLS con scope derivato dal server. Fallback SET LOCAL ROLE trattiene autorità
  trusted nella sessione. Runtime config persistita è autorevole dopo bootstrap.
- Server possiede pump bounded di revoche, retention, notifiche e sync sullo stesso
  handle; foreground dopo commit usa session/profile derivati server-side. Background
  solo unattended autorizzato. Worker/operator separati solo PostgreSQL sintetico.
  Creation recovery parte a startup e dopo batch anche senza job; stop drena intenti.
- PG16.15 container `lilleri-resume-pg`, loopback55432. Database finale corrente
  `lilleri_continuation_final_20261003b`:31 migrazioni frozen/checksum verificati.
  Il vecchio `lilleri_test` contiene checksum draft0010: preservare e usare DB nuovo.
- Docker/servizi non garantiti in task futuro. Riutilizzare autenticazione HTTPS Git
  della piattaforma senza estrarre token. Nessuna credenziale bancaria cloud richiesta.

## Continuazione integrata effettiva

La base conserva identity/passkey/TOTP/recovery/step-up, manual finance, rule preview/
apply/undo, reserved tenancy/RLS, runtime audit, OpenTelemetry locale content-free,
selected-field profile encryption, support masked, privacy, notifiche, raw TTL720h
originale e owned JSON/ZIP11file. La continuazione aggiunge:

- E03: jobs/lease/budget/checkpoint cifrati bounded, provider I/O fuori SQL,
  complete-only apply, generazioni/revoche/deadline fenced, resume/catch-up/foreground.
  Pending→booked solo legame esplicito esatto; due assenze booked generano attenzione,
  niente cancellazione implicita. Balance reconciliation solo semantica/anchor noti.
- E02: creation intent durevole prima di grant/discovery; late grant compensato,
  settlement sconosciuto non si risolve con early ack. Nessuna finalità/idempotenza
  bancaria inventata; recovery e shutdown drain veri.
- E05: CSV e XLSX ufficiale `read-excel-file`9.3.10, limiti ZIP/XML stretti,
  coordinate fisiche/provenance/digest permanenti; niente workbook originale trattenuto.
  Formule/macros/typed Excel/date seriali rifiutati, importi exact da stringhe XML.
- E07/E08:72 foglie/15 parent,51 ID storici preservati; private merchant aliases
  preview/apply/rename/archive/undo e categorie CRUD/nesting/assignment/merge/undo
  revisionati. Ambiguità resta unknown; corrente ledger/quiet/private/generation guard.
- E14: ricorrenze osservate, feedback cifrato revisionato/undo, esclusioni, installment
  e dichiarazioni booked; liabilities private withheld, niente doppio futuro one-off.
- E21: ICU ufficiale12.1.2, it-IT/en-GB persistiti, argomenti dei cataloghi accoppiati,
  errori API con codici controllati; source/legal/free text mantengono lingua reale.
- E22: landmarks/header levels/checked/pressed/current espliciti; focus pagina/skip,
  alertdialog Cancel iniziale/inert/Tabtrap/Escape/restitution identity-fenced,
  ring3:1 e reduced-motion. Prove native/assistive esterne ancora separate.
- E20: cache web IndexedDB AES256GCM, key nonextractable volatile, overview completo
  bounded512KiB, verified session/profile/epoch/expiresAt,5min default15max. Fallback
  solo network/timeout; HTTP401/403/500 elimina copia. Read-only: tutti i port finanziari
  bloccati tranne retryoverview; delete/logout/dropkey avviene prima della richiesta.
  Cold reload non può decifrare; niente90dayprojection/native/queuedwrites.
- E24: source erasure journal indipendente HMAC/fsync prima SQL, current anchors,
  current readiness guard; prove membership/content/consent/local generation esatte.
  IDs riusati sopravvivono replay solo con nuove prove vere; orphan/cache/raw/audit
  non possono prendere in prestito provenienza. Receipts cifrati immutabili, hooks
  redigono references; restore CLI mandatoryreplay currentjournals. V1 exportedAt
  esterno accetta offset ISO; journal/intent/receipt firmati restano UTC canonicali.
- E15/E16: preferenze cifrate, audit before/after/rev/digest/undo; immutable monthly
  payload con input/formula/policy/reference completi, privacy applicata prima paging,
  stale409 senza replay, sourcegeneration redaction e history keyset20+1. Profile
  createdAt reale nel DTO/export. App save/reopen/undo/history/ownedrights verificata.
- E17: summary_ready prodotto veramente inTX solo da nuova capture completa/nonempty
  con configuration e consenso N-SERVICE correnti; retry/partial non emettono.
- Evaluation: catalogo25 casi conserva numerazione requisito:4 supported/18 incomplete/
  3 expected unsupported. Split/metric/calibration/shadow tools19 test; tiny synthetic
  proposal rifiuta promotion. Nessun training/calibratore/runtimepolicy attivato.
- PR3: Gratis permanente manual/import e Plus futuro onesto; `/piani`, launcher e
  exactinteger economics riproducibili. Bench finAPI non è preventivo vincolante né
  attivazione/pagamento. Decisione in `docs/business/zero-investment-launch.md`.

## Verifiche correnti

- 847 casi Vitest distinti:361 core(money63/domain42/engine142/provider114),451 API,
  35 mobile. Ultimo full prima delle2 nuove regressioni:defaultAPI446pass/3skip; PG448pass/1skip. Caso secondocluster passa
  separatamente nella prova RLS16/16 con cluster/socket omonimi realmente separati e
  login non-owner indipendenti:14 casi PG e2 guard fixture PGlite. Ripetizioni driver non aggiungono casi.
- 41 gruppi Node distinti fuori Vitest: configurationAST4/copyAST3/evaluation19/bootstrap15.
  Guard consumer16 e copy13UI mantengono scansioni statiche reali.
- Installer esatto exit0 frozenroot+brand, pnpmcheck23task/build10task Next+Expo--clear.
  PG full37file/419s exit0; tutte31migrazioni SHA uguali tra SQL e file, 1–22 immutate.
  Prova aggiuntiva9 gruppi FORCE RLS su24 tabelle finanziarie nuove/storiche.
- Sync44 e creation17 e maintenance12 per driver; source/encryption/restore42 perdriver,
 4 HTTPsource routing e5 compiledCLI recovery; understanding persistence16 perdriver.
- Browser corrente: financial17/auth16/understanding9/persistence12/connection9/privacy10/
  notifications7/mapped9/XLSX7/merchant10/i18n7 pass:113 gruppi,0 page errors.
  Cache App10 pass:123 gruppi totali. Accessibilità IT+EN/durable10 prosegue. Non trasformare
  pass storici o standalonecache12/focus8 in acceptance finale App ancora da eseguire.
- Auth passkey probe actualregister/signin più negativi UV/origin/replay/key/revokesession.
  Virtual CTAP2 Chromium, non prova dispositivo. Auth fixture separata con31 migrazioni.
- Frozen38scenari/51tx pass; separate requirement25cases4/18/3. Nessuna accuracy empirica.
- Actualdev:zero readiness API3191/Expolocalhost8181,5conti/35tx strings/CORS; check/economics
  pass. Next current build / e /piani HTTP200; rebuild dopo nuove aggiunte remote.
- Audit produzione2HIGH/0MODERATE/0CRITICAL: node-forge1.4.0/braces3.0.3 senza patch
  riportata. Nessun clean gate/signing/native/KMS/legal/realbank acceptance.
- Prove/log fuori checkout `/workspace/.lilleri-validation`, riferimenti in STATUS.

Due nuove regressioni actualHTTP CSV/XLSX con clock che avanza hanno riprodotto409
source_erasure_changed: outer command firmava a t1 dopo inner import a t2>t1.
Producer corretto cattura un solo at per import/audit/provenance/facts; modulo23/23
su entrambi i driver. Nessun guard source o migrazione cambiato. Full suite847 in repeat.

## Cloud e chiusura attiva

Cloud draft7 salvato e readback exact installer/start, repository/networkpreset/secrets/
runtime requirements preservati. Strumenti disponibili solo read/update draft: user
ha autorizzato publication, ma non c’è comando callable per pubblicare. Non dichiarare
pubblicato o restore nuovo task. Finire browser/check dopo ultimi livelli ARIA,
aggiornare prove, fare commit/push normale del punto stabile e verificare remoto.

DemoAPI3004 e Metro8082 per accettazione; authAPI3005/static5173 su archivio diverso;
Next3006 e previewzero3191/8181 separati. Writer sul demo sequenziali; durable-sync
sourceerase helper va LAST e può richiedere nuovo archivio per budget legittimi.
Non alterare policy/budget per far passare helper. Preservare fixture prima di cambiare.

## Lavoro residuo reale

Il piano40epic rimane attivo. Tecnico locale ancora aperto: fingerprint/ordinal/IDchurn;
expired/cancelled/reversed holds; ownIBAN/missingleg/crosssource dedup; source-removal
keepmanual/remove e batchundo; original/billed money/datedFX; scoped server search e
90dayprojection autorevole; feedback/fieldlocks/remainingrules/stages/calibratedpolicy;
exactrenewalgaps/directCSVrecovery/renewalall; encryptionclass/index/tokenisation più
ampie, retentionclasses e explanatoryrights. Non sono tutti blocker esterni.

Gate esterni: accesso sandbox ufficiale emesso, contratti/route legale/DPIA/coverage e
processori prima dati reali; autorizzazioni/fixture autentiche e misura empirica;
KMS/TLS/backup/PITR deployed; native delivery/store/device/assistive/user e naming
clearance professionale. Le incompletezze restano esplicite, senza aggirare i gate.
