# PROJECT STATE — Lilleri

> Memoria operativa corrente. Mandato in `docs/BRIEF.md`; consegna e limiti in
> `docs/STATUS.md`. Se stato e repository divergono, vale il repository.

## Mandato e vincoli

Fondamenta PFM Italy-first: CONNECT → SYNC → UNDERSTAND → CORRECT ONLY WHEN NECESSARY →
LEARN → AUTOMATE. I 37 deliverable iniziali hanno documentazione e una prima implementazione
eseguibile con dati sintetici. Il futuro MVP con banche reali non è completato.

- Nome Lilleri, scope @lilleri/*; documenti inglesi, copy prodotto italiano.
- Fiducia > correttezza > sicurezza > semplicità > automazione > affidabilità > privacy.
- FACT / ASSUMPTION / HYPOTHESIS / DECISION / UNKNOWN e fonti; niente prezzi, coverage,
  licenze, controlli security o risultati utenti inventati. Review indipendenti, decisioni motivate.
- Mai credenziali bancarie, PAN, dati personali reali, segreti nel repo o scraping fragile.
- Money bigint + valuta, niente somme cross-currency senza FX. Provider date DATE,
  istanti UTC; visualizzazione/calendario del profilo Europe/Rome.
- Branch claude/admiring-hypatia-yzh6nq, commit/push frequenti; niente PR senza richiesta
  e niente force push. Non riusare URL/attribuzioni della vecchia sessione Claude.
- Cloud già isolato: riusare checkout, niente worktree senza richiesta.
- Aggiornare questa memoria dopo decisioni/verifiche senza annunciarlo salvo problemi.

## Ambiente e startup verificati

- Checkout /workspace/Lilleri, Debian 13 x86_64; ogni shell:
  `. /workspace/.lilleri-toolchain/env.sh`. Node 22.22.0, pnpm 10.28.0, Python 3.12.14.
- Toolchain/cache fuori checkout. Root e toolkit tools/brand-render hanno install frozen separati.
- Script install/setup rieseguito completamente con exit 0: install, pnpm check, pnpm build.
  Install/start cloud aggiornati e salvati come draft; nessun nuovo segreto o egress aggiunto.
  Non dichiarare pubblicazione o ripristino in un nuovo task verificati.
- pnpm dev compila API/client/brand e avvia API 127.0.0.1:3001, Next 127.0.0.1:3000,
  Expo localhost:8081 (qui IPv6 ::1). HTTP readiness e overview con 5 conti e 35 movimenti verificati.
  Con CI=1 Expo disabilita reload; senza CI usare sviluppo normale.
- API solo DEMO_MODE=1 e loopback, rifiuta NODE_ENV=production. Default PGlite persistente
  .lilleri/data ignorato; usare PGLITE_PATH separato per prove, non cancellare archivi esistenti.
  Erasure crea tombstone e overview 404, niente reseed silenzioso.
- Turbo propaga cache XDG/PG_TEST_DATABASE_URL; DevTools RN può usare fallback incluso
  se il download non disponibile: non è una dipendenza di readiness.
- Docker disponibile; PostgreSQL 16.15 reale testato su lilleri-resume-pg, 127.0.0.1:55432,
  database sintetico lilleri_test. Processi/daemon/container non sono garantiti nel prossimo task.
- Git proxy HTTPS funziona; riusare autenticazione piattaforma senza estrarre token.
- Vecchi run wf_* non disponibili; tools/workflows/*.js sono specifiche, non programmi Node.

## Fasi iniziali e decisioni

- Fasi 0/1: ricerca esistente e compliance/prodotto/business revisionati; gate A/C non validati
  commercialmente; B studiato, dati reali bloccati. Unknown/source dates restano espliciti.
- Fase 2: brand B “li”, palette T3 carta/vino, GeistUI/importi, Newsreader, GeistMono.
  Asset originali/font OFL/fonti/checksum, token TS/JSON/CSS e guide.80 coppie di contrasto e 61 asset verificati.
  Review browser con screenshot; native/assistive tech/utenti/clearance legale non verificati.
- Fase 3: 9 architecture docs, proposte, ADR 0001–0018, security/STRIDE/incident review.
  Modular monolith Fastify/PostgreSQL/Drizzle/PGlite, Expo/Next; niente Redis/LLM obbligatori.
  Gate D accettato per mock; E condizionato al perimetro sintetico, non per produzione.
- Fase 4: domain/provider/engines/database/API/client/Expo/Next implementati e verificati.
- Fase 5: review finale, STATUS/README/CONTRIBUTING/SECURITY, evidenze e quality gates
  completati per la consegna iniziale sintetica; matrice release completa resta distinta.
- Ladder Gratis/Plus; Famiglia Later fino sharing reale, Pro professionale futuro.
  Prezzi/30-day preview non rinnovante sono ipotesi/spec, non billing implementato.
  Launch Plus-only, offers revenue 0: Base GP −79.49 €/1k MAU prima minimi/fissi, non sostenibilità provata.

## Software effettivo

- Money minor units bigint, JSON string esatta, formatter accessibile; EUR/GBP separati.
- Domain date-only/DST/taxonomy; catalogo UI compatto, non CRUD categorie completo.
- Provider port/mock italiano pagine da 7, validazione/identità stabile, CSV bounded strict.
  I nomi fixture non sono banche integrate.
- Engines pending/booked, duplicate/transfer/card/cash/refund conservativi, evidenza/versione,
  override/undo, sticky correzioni, recurring come stima, summary per valuta.
  Amount/date/merchant soli non cancellano movimenti; rimborsi eleggibili entro bound.
- Database: 4 migrazioni SHA256, Drizzle driver PGlite/pg,13 FK scoped, osservazioni immutabili all’UPDATE,
  batch atomici e tombstone. Non è una prova di ruoli/RLS/restore produzione.
- API trusted demo profile, Host/Origin guard, OpenAPI DTO, sync idempotente, revisioni,
  feedback once/merchant, match decisions, CSV/cursor, revoke/regrant/export/cascade delete.
  Conferme impossibili tornano 409 senza decisione/legs salvati.
- Expo Home review prima totali, search/detail/categoryscope/undo, matchreview, recurring,
  privacy/refresh/disconnect/regrant/download/delete confermati, light/dark. Date finanziarie
  preservate; instanti Europe/Rome; merchant vuoto usa descrizione originale, evidenza italiana.
- Next landing responsive onesta sullo sviluppo, asset/font locali e tema manuale.
- Client tipi condivisi; Content-Type JSON solo con body, DELETE vuoti non falliscono Fastify.
  Generazione automatica/drift del client ancora futuro; watch API monitora dist, ricompilare sorgenti.

## Verifiche

- pnpm check: Biome+typecheck/test,22 task riusciti;149 casi distinti:
  money 63, domain 19, providers 18, engines 35, API 14.
- Frozen install, pnpm lint/format:check, git diff --check passati. Next-generated next-env.d.ts
  escluso Biome perché framework lo riscrive; TypeScript controlla comunque l'app.
- pnpm build: 10 task riusciti: Next produzione ed Expo WEB export. Native non verificato.
- API PGlite 14/14 e PostgreSQL reale 14/14 con PG_TEST_DATABASE_URL propagato da Turbo,
  integrazione senza cache. Gli stessi 14 test non contano due volte nel totale 149.
- PG reale 16.15: migrazioni repeat/SHA/FK e UPDATE observation respinto P0001.
  Il caso persist/reopen usa PGlite su disco anche nella suite configurata PostgreSQL.
- Chromium:16 gruppi funzionali,0 errori JS: categoria/undo/merchant, matchundo/reject/confirm,
  sync invariati/ID/correzioni, JSON download, revoca con storico, regrant stessiID, erase 204
  +overview 404, errori iniettati/retry, valute separate, reflow 320/390. Solo archivio temporaneo.
- Verifica mirata successiva su sorgenti finali via pnpm dev:2 gruppi passati, nav a 320 px hitrect
  circa 60.8×64, documento italiano, descriptor fallback/evidenza umana, light/dark Expo;
  Next ledger 14/12 px e dark attivato davvero (data-theme/body/screenshot).
- docs/design/visual-quality-gate.md: screenshot/review indipendente, non certificazione UX.
  docs/reviews/final-review.md: review security/invarianti, non pentest/studio con utenti.

## Limiti e prossime azioni

- pnpm audit --prod exit 1: node-forge 1.4.0 HIGH senza patch indicata e uuid 7.0.3 MODERATE
  via tooling Expo. Uso/triage in SECURITY; non dichiarare audit pulito o gate produzione passato.
  Nessun override/fork silenzioso. Gitleaks/trufflehog assenti: scan redatto di 84 file senza candidati
  non è scan completa/della storia Git. Remote CI non dichiarata eseguita.
- Native, VoiceOver/TalkBack, DynamicType/zoom, store e utenti non verificati.
- Auth/membership/sessioni/passkeys/recovery, KMS/encryption/roles/RLS, jobs/outbox/retention,
  PITR/restore, processorrights e incidentdrills progettati, non consegnati.
- Split/shared/reimbursement/FX, CRUD categorie/regole, customtaxonomy UX, notifiche/insight
  persistenti e billing richiedono nuovi invarianti e implementazione/test.
- Provider sandbox/coverage/fees/contratti/route legale/DPIA/Article9/processori e clearance
  trademark/domain richiedono accesso/verifica umana; nessun segreto in chat.
- Prossimo lavoro: mantenere demo/invarianti, chiudere advisory con release supportate/triage,
  auth/isolation/recovery e jobs/retention con prove; device/accessibilità. Sandbox ufficiale solo
  con permission/accesso effettivi, pilot reale aspetta gate legali/security. Non rifare ricerca,
  brand o architettura consegnati né usare il mock come prova commerciale.

## Git e aggiornamento

Remote concorrente 72ec8b6 integrato senza reset/perdita con merge 0234761, già inviato.
Core/imports/brand/architettura commit precedenti; backend 1ac257b, apps/startup 5a1f473.
Finali documenti/evidenze nello stesso branch; verificare remote e integrare nuovi commit
senza force. Nessuna PR creata/richiesta.

2026-10-02 — consegna iniziale/fondamenta sintetiche completate; release reale ancora gated.
