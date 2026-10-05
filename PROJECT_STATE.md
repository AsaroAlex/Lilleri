# PROJECT STATE — Lilleri

## Current European directory release candidate — 2026-10-05 (Europe/Rome)

Latest request: add European banks. Added 44 country-specific entries, making 62
services across 16 markets (59 bank entries, 2 cards, 1 wallet). Italy remains the
18-choice default; the country selector, translated market labels and combined
country/type/alias search expose the wider catalogue without merging bank markets.
Exact live bindings must match the entry's country. All automatic routes still need
activation, and new statement formats remain unverified. The Italian builder and
old-response UI retain compatibility; archives and protected public access are unchanged.

Targeted provider directory 25, API 3 on PGlite and PostgreSQL passed. Read-only browser
acceptance: European 9 groups/56 layouts, Italian 6 groups, product 8 groups/134 surfaces,
no API writes or server-settings/finance changes. Repository check passed 23/23 tasks:
API 592 passed/3 skipped, mobile 66, provider 343. Matching compiled bundle
`index-ac1a7308521b77d2d05060977c6ac5c6.js` was tested locally. Publication is in progress. See `docs/operations/european-bank-directory-20261005.md` and
`docs/research/european-bank-directory-20261005.md`.

## Current product interface release — 2026-10-05 (Europe/Rome)

Published commit `c837feb4ddc46231931866aee17c581a1db5c140`, Railway deployment
`dad4c7dc-1254-479b-88be-082606471cc5` **SUCCESS**, verified at 11:14 Europe/Rome.
The latest user request removes preview/draft/mock branding and moves towards a
finished app. Product copy is updated in both languages; header/intro/footer
prototype framing and the Privacy mock-source block are removed. Device display
preferences, authenticated manual-account onboarding and public shared-profile
write protection are integrated. The public app is read-only without personal identity,
including legacy responses without fixture metadata. Internal source modes and all
owned archives remain explicit/preserved; live bank access is not activated by renaming.

Repository check: 23/23 tasks, API 592 passed/3 skipped in 48 files, mobile 62 and
provider 337; focused guard/retirement PostgreSQL 10/10. Read-only browser validation
covers language/device isolation, reload, responsive themes, all public destinations,
retry and 18-service bank selection. Final frontend typecheck/build, copy checks and
8 browser groups (134 surfaces) passed on bundle
`index-719eb38f70b1f9c87fc34a68c430054e.js`. The exact deployed bundle, health,
directory, overview and export returned HTTP 200. Active finance remains 0/0/0;
owned accounts/transactions/connections 5/35/1 and the full immutable retirement
audit compare identical before/after. No financial verification POST, migrations
or Railway configuration changes. The fresh owned local runtime was stopped,
preserving its archive. Scope and proof: `docs/operations/product-release-20261005.md`
and `docs/operations/product-release-20261005.json`. This post-release evidence is
committed locally until the next functional push to avoid deploying the same app twice.

## Current Italian bank selection release — 2026-10-05 (Europe/Rome)

The user requested the main Italian banks, Amex and Satispay. Published commit
`33e050a54202470ab1b75d1076cbbd6b1495231a`, Railway deployment
`4ddd2a8a-b2e0-4988-ab7a-21594c4c6899` **SUCCESS**, verified at 10:41 Europe/Rome.
Home → Choose your bank opens 18 services (15 banks, Postepay/Amex cards,
Satispay wallet), search by aliases/accent/spacing, type filters and focused details
with official links. Mobile names are complete and duplicate introductory headings
were removed. Amex/Satispay personal PDF guides are linked without unsupported
CSV/XLSX import claims. No automatic route is presently available.

The separate public read-only connection directory, shared DTO/client, fail-closed
future exact live bindings and server-only app-specific Yapily LIVE/IT discovery
are implemented. The latter remains unregistered, without account-kind evidence or
live consent/callback wiring. A provider account/resource availability question is
pending; do not request secret keys in chat. Live identity/storage, provider access,
durable consent/callback, renewal/revocation/sync and institution-specific coverage
are still required. Adding credentials alone cannot activate this runtime.

Verification: repository 23/23 tasks; API 586 passed/3 skipped in 47 files on
PGlite, provider 337, mobile 48; the 3 new API tests also passed on actual
PostgreSQL. Final mobile typecheck/copy checks and six read-only browser flows plus
retry/English/dark cases passed at 320–1440px. Public health/directory/demo/export
and the matching new web bundle returned HTTP 200. The catalogue has 18 setup
routes and zero available routes. Active finance remains 0/0/0; owned 5 accounts,
35 transactions, 1 connection and the complete retirement audit compare identical
before/after deployment. No financial validation POST or Railway setting change.

The final bundle is `index-b36cc0aa476786b5c0ed1ca8f9e396bf.js`. The owned fresh
empty local preview was stopped, preserving its archive. Evidence and activation
scope are in `docs/operations/italian-connections-20261005.md` and
`docs/operations/italian-connections-release-20261005.json`. Post-release evidence
is a local docs commit until the next functional publication, avoiding an extra
deployment of the same application.

## Previous finance UI and clean-data release — 2026-10-05 (Europe/Rome)

The latest user request is to remove test data, begin real-bank testing, improve the
visual hierarchy of Home/accounts/transactions/review decisions, and move Privacy
inside Settings. Continued parallel work and tested Railway publication are already
authorized. The optional question asking for the first bank, country and any existing
provider account has not been answered.

Published commit `875973dbd2b8780f0c8981e2c0f8ee89ad7dc1df`, Railway deployment
`a7fb1b6c-619f-4a16-a24f-b9eb2d0f89d9` **SUCCESS**, at
https://lilleri-production.up.railway.app/. Original illustrations distinguish
accounts/categories/navigation; movements group by date; filters are compact and
expandable; review decisions explain their effects; Privacy and ownership controls
are nested in Settings. Balance observation dates use the profile timezone.

`DEV_DEMO_FIXTURES=empty` is live. Public Home/search/90-day history contain **zero
active accounts, transactions or connections**. Exactly **35 proven mock rows,
5 accounts and 1 connection** are retired from active views. A read-only public
ownership export independently confirms the original **35/5/1** canonical records,
retirement revision **1** and **one immutable event** after both deployments.
No physical archive/key erasure or public financial validation write occurred.
Manual/CSV/explicit keep-manual ownership is protected; public protected counts are
currently zero. The same volume, database/recovery paths and one replica remain.
Do not unset the flag to simulate bank access: retirement remains durable, mock
reconnect/sync is blocked, and unauthenticated personal payloads are rejected.

Validation: repository check **23/23 Turbo tasks**, API **583 passed/3 skipped** on
PGlite and **585 passed/1 skipped** on PostgreSQL (46 files), provider **265** and
mobile **45**. PostgreSQL restore passed **8/8** against **37 frozen migrations**;
production backup acceptance remains false. Browser checks passed 14 visual,
8 interactive, 5 source and 7 guided groups, plus empty screens at
320/390/768/1440px and a read-only midnight/timezone fixture. A local transition
preserved one manual account/expense and exact EUR **97.75** balance. Final UI-only
heading/date refinements passed mobile typecheck/build and targeted browser checks
after the full repository check.

**Real bank access is not active.** The official Yapily Modelo sandbox authorization
protocol client is now implemented/tested separately from its reader; neither is
registered. Protected runtime/callback/store, sync admission, external key/journal
adapters, provider application/consent and a live adapter remain prerequisites.
Never invite real financial uploads into the shared preview or ask for secrets in
chat. Bank/country/provider availability is the next missing user information.
All 40 roadmap epics retain unfinished stories; no real-bank acceptance is claimed.

Evidence: `docs/operations/finance-ui-clean-release-20261005.json`,
`docs/design/finance-ui-review-20261004.md`, and
`docs/operations/empty-preview-fixtures.md`. Local reports are under
`/workspace/.lilleri-validation/finance-*` and `clean-data-postgres-*`.

## Previous integration and release handoff — 2026-10-04 (Europe/Rome)

Persistent user goal: execute the seven development phases in parallel, publish tested
increments frequently on the existing Railway URL, and make the visual design original.
The shared synthetic preview is not the completed real-bank/public MVP. Integration
branch: `codex/roadmap-integration`; ordinary checked pushes to
`claude/admiring-hypatia-yzh6nq` trigger the existing Railway service. No new PR or
force push is requested. Preserve its archive, current recovery namespace and one replica.

The integrated source now has bounded no-ID fingerprint/ordinals and in-place renewal
aliases; explicit pending lifecycle/correction history and individual Inbox accept,
keep-manual/remove and undo choices; explicit seven-day CSV/bank links with receipt/source
history and persistent duplicate undo; evidence-based exact renewal-gap/account import
recovery; scoped server search and actual 90-day history with revision-bound HMAC cursors;
and encrypted original/billed FX versions/detail/owned export. Unknown/ambiguous evidence
fails or stays unknown; canonical money and source audit are never guessed. The new
migration chain contains **36 frozen files**, with earlier files unchanged.

Optional hosted HTTPS identity/client, mandatory verification/recovery delivery ports,
atomic quotas and redacted readiness inspection have local proof. The default entry point
remains synthetic/loopback; `productionReady` is always false. Hosted runtime/financial
scope, external KMS and an independently durable current remote deletion/source journal
still require implementation. Real mail/notices, EU PostgreSQL/TLS/separate roles,
backup/PITR/alerts and actual provider application/consent remain unconfigured. The official
Yapily Modelo sandbox read adapter is unregistered: consent creation/redirect/exchange,
renewal/revocation and admitted durable sync remain separate work. Never paste secrets
into chat or relabel local journals as production integrations.

Combined validation: `pnpm check` passed **23 Turbo tasks**, API **579/3 skipped** on
PGlite; the complete isolated PostgreSQL API suite passed **581/1 skipped**, 45 files.
Those driver runs are not additive distinct cases. The actual guarded PostgreSQL 16
custom-dump/deletion-aware restore drill passed **8/8** against all **36 migrations**;
restored targets retain `ALLOW_CONNECTIONS=false` and revoked PUBLIC CONNECT.
`productionBackupAccepted` remains false. Logs/reports:
`/workspace/.lilleri-validation/roadmap-check.log`, `roadmap-postgres-api.log` and
`roadmap-postgres-drill.json`. Preserve existing archives and independent keys/journals.

The current verified publication is commit `e55479be807639e9877a184460127416e6efde59`,
Railway deployment `a5f09884-23f3-4561-8238-22a42d3774ba` **SUCCESS** at
https://lilleri-production.up.railway.app/. The latest user rejected warm colours and
requested an applied UI/UX review. Graphite & Blue is now live: neutral planes and logo,
blue actions/selection, compact Geist headings, recent ledger before tools, direct account
Sources navigation, explicit category choice and quiet settings links. The review and
contrast report record 80/80 required pairs. Nine widths, both themes, keyboard focus,
complete IT/EN amounts, nonoverlapping metrics, selected mobile rule and a read-only
million-value fixture passed. Source-choice/cross-source/full-interaction browser groups
passed 5/3/8; mobile tests passed 45. No backend changes accompanied this visual iteration.
Fresh public health/HTML/exact bundle reads and compiled-runtime logs confirm the release.
The connection, five exact account balances and all 34 currently visible transaction
IDs/amounts matched the immediately preceding snapshot; that comparison is not a full
ownership export. The earlier 35-row proof remains historical. Writing validation stayed
inside the separate local fixture. [UI/UX review](docs/design/ui-ux-review-20261004.md);
[release evidence](docs/operations/neutral-ui-release-20261004.json). Preserve financial
source meaning, locale, identity fences, volume and recovery namespace.
All 40 epics retain residual acceptance, and the 25-case v1 catalogue remains 4/18/3 until
whole-case acceptance is reviewed. Current residual work is in the execution plan/status;
older verification counts/process notes below are historical, not evidence of live state.

## Earlier preview iteration — 2026-10-04 (Europe/Rome)

Current user goal: finish the real-bank/public MVP through an iterative
development → manual test → feedback → minimal fix workflow. There is no
provider account/contract or custom domain. The user has now created a Railway
service linked to Lilleri; its synthetic preview is online with verified persistence.
Do not call
the synthetic preview the completed banking MVP. Remaining software P0 work and
external prerequisites are in the execution plan and
`docs/operations/interactive-development.md`.

Current online-preview path: root Dockerfile, Node22.22/pnpm10.28 and the
compiled synthetic preview supervisor on Railway (`pnpm preview:build`, `tools/preview/run.mjs`). `/data` must persist database,
independent keys and source journal; PORT and DEV_RECOVERY_PATH are supported.
Detailed one-time service settings are in `docs/operations/railway-preview.md`.
Use the existing development branch and automatic deploys after checked pushes.
This is commit/build/deploy, not filesystem hot reload from Codex. The Railway
plugin is now connected and can inspect/configure the existing service. The user
has upgraded to Hobby; any subscription or billing decision remains theirs.

Railway project `perfect-light` (`515b8fe0-7c94-4449-9d7e-4b290fcb80c3`),
production environment `d5ee5896-0e66-4cd9-a6a4-8ee057da0330`, service
`bebdbda1-7f5e-48fc-8a3b-72ece8b9fefb`, domain
`https://lilleri-production.up.railway.app` on port8080. Build `a10e286d`
of commit `73d0a08` failed because Railway Metal rejects secret mounts in RUN.
The deployment Dockerfile now uses standard npm/pnpm installation steps; local
Codex certificate handling belongs only in a temporary validation Dockerfile.
The plugin attached volume `lilleri-data` (`4599b33e-5413-4388-9980-872cb2ca7ef2`,
1024MB) at `/data` and set healthcheck `/api/health` (300s), memory limit3GB
and graceful draining30s in production. Keep the current single replica.
Fix commit `199f8f8` deployed successfully (`fa15d61b`); its redeploy `6975da48`
also reached SUCCESS. Fresh public API reads after redeployment preserved the
same synthetic connection and all five accounts with exact balances. Railway
HTTP logs confirmed200 for `/`, `/api/health`, `/api/v1/demo` and the Expo bundle.
Memory usage reached1.85GB during frontend compilation; the3GB cap leaves margin.
Local validation on a NEW isolated loopback archive passed13 launcher tests,
configuration lint16 consumers and all8 interactive browser checks, including
exact manual amounts, reload persistence and verified ZIP exports, without
console/page errors. These interactive writes were local, not on the public
shared archive. The online synthetic preview is ready for user testing; the
real-bank/public MVP remains incomplete. Detailed evidence is in
`docs/operations/railway-preview-validation.json`.

Preferred browser development command is now `pnpm dev:cloud`, after activating
the pinned Node22/pnpm10 toolchain and installing the frozen lockfile. New
dependency-free `tools/dev` supervises Fastify3191, Expo localhost8181, Next3000
and a gateway0.0.0.0:8080. Forward only8080 for the financial browser app; `/api`
and Metro WebSockets share the preview origin. API production/loopback guards
remain. This is a private shared synthetic preview, without production identity.
The standard `pnpm dev` and `dev:zero` workflows remain available separately.

Default archive is ignored `.lilleri/interactive/data`, with independent keys
and source journal under `~/.lilleri-interactive/<root-and-database-path-hash>/`.
`DEV_DATA_PATH` selects a separate synthetic fixture with its own recovery
namespace; preserve current keys/journals. `DEV_HOST`, `DEV_PORT` and optional
exact `DEV_PUBLIC_ORIGIN` configure only the gateway. No old archive was reset.

Source rebuilds are serialized and use `--noEmitOnError`; failed compilation
leaves the current API alive, and a corrected save restarts after its writer
closes. Expo must run without CI (CI disables watch) and with `--clear` to avoid
stale embedded endpoints. Metro readiness now probes explicit IPv6/IPv4 loopback
and the gateway reuses the working address. Container Node ADDRCONFIG otherwise
filters IPv6 localhost even when Expo binds ::1; API stays IPv4.
Worker groups and early-reset WebSockets
are handled on shutdown. Standard Turbo now passes SOURCE_ERASURE_JOURNAL_PATH.
Next DemoLink accepts an explicit validated NEXT_PUBLIC_DEMO_URL for this setup.

Verification: frozen offline install; full check23tasks (API448pass/3skip,
existing core361 and mobile35); independent fresh core/mobile396pass; thirteen
real HTTP/WebSocket/process/build regressions; eight actual browser flows
(manual exact money, reload, language, real ZIP, 320/390/1280); live HMR without
navigation using mapped remote hostname and same-origin8080 sockets; actual
compiler failure/corrected save/source restore with unchanged financial ledger.
Temporary App/server probes were restored byte for byte. No PostgreSQL/native
or actual public ingress claim is added by this iteration.

Railway image verification: frozen dependency install and eight package builds
passed in Docker; thirteen development tests also passed inside the image.
Eight browser flows passed through the real container gateway. A new prepared
container with the same /data reopened all six accounts and36 transactions,
preserved exact financial records/profile, completed synthetic sync and rendered
and refreshed the UI with no browser errors. Railway healthcheck Host returned200.
At1GiB the first browser bundle compile caused OOM; the2GiB fixture passed.
Use at least2GB for the complete development image; Free/Trial cannot run it
reliably. No paid plan was activated. Proofs in railway-* validation files.
The Docker image uses --prepared to avoid repeating its build at startup; normal
local development still builds before launch. The actual hosted HTTPS URL and
automatic GitHub deployment are now verified as described above; this paragraph records the earlier local image proof.

Proof/logs in `/workspace/.lilleri-validation/iterative-*`; browser writes used
only separate `/workspace/.lilleri-validation/interactive-smoke/data`.
Final manual preview uses the default interactive archive. Keep the active
environment and archive between feedback iterations; never reseed/reset as an
assumed fix. Use current source/logs and reproduce the reported flow first.
For a detached launch on this executor use `setsid nohup pnpm dev:cloud` with
stdin/stdout redirected: plain nohup is killed by command-group cleanup and can
leave detached child workers. Final log is `iterative-runtime.log`, launcher PID
in `iterative-launcher.pid`; verify the actual runner/process identity before
stopping it. A managed persistent terminal is the portable alternative.
Latest user preference: remain in this Codex chat with the existing Railway online preview, without Mac installation, source ZIPs or a move to Replit. Railway public ingress is verified. Do not restart obsolete tunnel or Codex-native ingress investigations. The seven requested development phases were implemented in isolated tracks and integrated; latest source/gates and the pending original-design release are recorded above. Main integration branch is `codex/roadmap-integration`; checked releases push normally to `claude/admiring-hypatia-yzh6nq`.

Compiled-preview increment `3efd4ab65a361931f5e64f5ff3380943a56f227c` reached Railway SUCCESS (`7dc1df94-42f4-40c0-8caf-72b3dcd610e8`). Fresh public health/demo reads preserved the original connection and exact five account balances. Local runtime uses approximately0.55GB total RSS after8browser flows; deployed memory is not measured, so keep3GB cap. Assets have3tested traversal/ownership/cache boundaries. Keep current `/data` archive/recovery namespace, one replica and existing API synthetic/identity guards. No real-bank or mail/KMS resources have been supplied. An optional asynchronous resource-status question is pending; never ask the user to paste secrets.

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
  `lilleri_continuation_signed_final_20261003`:31 migrazioni frozen/checksum verificati.
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

## Historical verification — 2026-10-03

- 847 casi Vitest distinti:361 core(money63/domain42/engine142/provider114),451 API,
  35 mobile. Full corrente defaultAPI448pass/3skip; PG450pass/1skip. Caso secondocluster passa
  separatamente nella prova RLS16/16 con cluster/socket omonimi realmente separati e
  login non-owner indipendenti:14 casi PG e2 guard fixture PGlite. Ripetizioni driver non aggiungono casi.
- 41 gruppi Node distinti fuori Vitest: configurationAST4/copyAST3/evaluation19/bootstrap15.
  Guard consumer16 e copy13UI mantengono scansioni statiche reali.
- Installer esatto exit0 frozenroot+brand, pnpmcheck23task/build10task Next+Expo--clear.
  PG full37file/359.77s exit0; tutte31migrazioni SHA uguali tra SQL e file, 1–22 immutate.
  Prova aggiuntiva9 gruppi FORCE RLS su24 tabelle finanziarie nuove/storiche.
- Sync44 e creation17 e maintenance12 per driver; source/encryption/restore42 perdriver,
 4 HTTPsource routing e5 compiledCLI recovery; understanding persistence16 perdriver.
- Browser corrente: financial17/auth16/understanding9/persistence12/connection9/privacy10/
  notifications7/mapped9/XLSX7/merchant10/i18n7/cacheApp10/durable10 pass:
  133 gruppi di flussi,0 page errors. Accessibilità: gli stessi13 casi passano in
  italiano e inglese,0JS/0writes; testo DOM200% su Home320px, non zoom/native.
  Durable LAST ha completato230 finestre con11 gesti UI,0 preflight resume, retain
  verificato e successivo erase della sola banca sintetica; ZIP completo verificato.
  Non aggiungere ripetizioni per lingua o standalonecache12/focus8 ai133 flussi.
- Auth passkey probe actualregister/signin più negativi UV/origin/replay/key/revokesession.
  Virtual CTAP2 Chromium, non prova dispositivo. Auth fixture separata con31 migrazioni.
- Frozen38scenari/51tx pass; separate requirement25cases4/18/3. Nessuna accuracy empirica.
- Actualdev:zero readiness API3191/Expolocalhost8181,5conti/35tx strings/CORS; check/economics
  pass. Next current build / e /piani HTTP200; rebuild dopo nuove aggiunte remote.
- Startup finale `pnpm dev`: Next3000 `/` e `/piani`, API3001 `/health` e `/v1/demo`,
  Expo localhost8081 HTTP200. Nuovo archivio indipendente5conti/35tx EUR/GBP exact.
  Override non segreti in `/workspace/.lilleri-validation/cloud-ready-runtime.env`;
  dati/vault/journal fuori checkout, vecchi archivi preservati. Prove startup/browser
  `continuation-cloud-ready-start-proof.json` e `continuation-cloud-ready-browser.json`.
- Audit produzione2HIGH/0MODERATE/0CRITICAL: node-forge1.4.0/braces3.0.3 senza patch
  riportata. Nessun clean gate/signing/native/KMS/legal/realbank acceptance.
- Prove/log fuori checkout `/workspace/.lilleri-validation`, riferimenti in STATUS.

Due nuove regressioni actualHTTP CSV/XLSX con clock che avanza hanno riprodotto409
source_erasure_changed: outer command firmava a t1 dopo inner import a t2>t1.
Producer corretto cattura un solo at per import/audit/provenance/facts; modulo23/23
su entrambi i driver. Nessun guard source o migrazione cambiato. Full suite847/installer/check23/build10 pass.
Checkpoint integrato e pushato `e10f10672072cef05927de07ae434c4f69718538`.
Vecchi generated Next dev types corrotti preservati fuori checkout; typegen ufficiale
e fulltypecheck pass senza cambiare scope. API GitHub Actions403: CIremota non verificata.

## Cloud e punto stabile

Cloud draft8 salvato e readback exact installer/start, repository/networkpreset/secrets/
runtime requirements preservati. Strumenti disponibili solo read/update draft: user
ha autorizzato publication, ma non c’è comando callable per pubblicare. Non dichiarare
pubblicato o restore nuovo task. Check23/build10/mobile35 pass dopo live announcements
e reflow200%; browser finali conclusi e prove aggiornate. Checkpoint precedenti pushati
`e10f106` e `0dda407`; leggere HEAD/remoto per il commit finale di reflow e acceptance.

DemoAPI3004 e Metro8082 per accettazione; authAPI3005/static5173 su archivio diverso;
tutti i writer browser chiusi. Il demo3004 conserva l’erasure finale della banca e
gli altri dati; non riseminarlo. Preview corrente `pnpm dev` su3000/3001/8081 usa il
nuovo archivio `cloud-ready-demo-20261003-final`, con vault indipendente
`cloud-ready-demo-keys-20261003-final` e journal sibling. I vecchi Next3006 e
previewzero3191/8181 sono stati fermati; riavviarli solo se necessari. Un task futuro
deve verificare processi/porte e non assumere un restore già validato.

## Lavoro residuo reale

The 40-epic plan remains active. Local residuals: own-IBAN/missing-leg provenance,
fuel/tolerance matching and whole-case reconciliation acceptance; batch/session undo;
complete feedback/field-lock/rule stages/actions and fitted runtime calibration/policy;
representative server-search latency and persisted/native cache; renewal-all and admitted
official-provider consent lifecycle/sync; reviewed hosted bootstrap/financial scope,
external key/current remote deletion-journal integration; wider encryption/index/tokenisation,
retained object classes and explanatory rights. Bounded identity, explicit holds/source
choices, reviewed seven-day import links, server history/FX and exact evidence-based
renewal recovery are now delivered locally, as described above.

External release gates: issued official sandbox application/consent, contracts/legal route,
DPIA/verified coverage/processors before real data; approved notices and actual mail delivery;
EU database/TLS/roles/KMS/backup/PITR/alerts with deletion-aware deployed recovery proof;
authorized representative labels/audits, native/store/device/accessibility/users and
professional naming review. These gates do not suspend independent local implementation
or promote unfinished acceptance.
