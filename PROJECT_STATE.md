# PROJECT STATE — Lilleri

> Memoria operativa del progetto. Leggere per primo quando si riprende il lavoro
> ("Riprendi da dove ti sei fermato"). Rappresenta lo stato attuale, non la storia.
> Requisiti completi del fondatore: `docs/BRIEF.md`. Se questo file e il repository
> divergono, vale il repository: correggere qui e proseguire.

## Obiettivo

Progettare, validare e costruire le fondamenta di **Lilleri**, app consumer di Personal Finance
Management Italy-first (poi Europa): l'utente collega le sue fonti una volta e Lilleri organizza
automaticamente i movimenti (riconciliazione, categorizzazione personale che impara, Review Inbox,
abbonamenti, insight). Zero setup come percorso completo; personalizzazione totale per chi la vuole.

## Risultato finale atteso

Repository professionale con: ricerca completa e verificata; strategia di prodotto, brand e business;
brand identity con asset reali (SVG/PNG/token); design system; ADR; security e compliance;
monorepo funzionante (`@lilleri/*`) con dominio, database e migrazioni, mock provider italiano,
pipeline di sync idempotente, motore di riconciliazione e classificazione/regole testati, API
OpenAPI, shell mobile Expo, landing Next.js, CI; quality gate eseguiti davvero; `docs/STATUS.md`
finale. Checklist dei 37 output in `docs/BRIEF.md` § "Output finale atteso".

## Contesto essenziale

- Nome ufficiale immutabile: **Lilleri** (toscano per "soldi"). Scope pacchetti `@lilleri/*`.
- Documentazione in inglese; copy di prodotto e voice in italiano.
- Etichette obbligatorie su ogni affermazione variabile: FACT / ASSUMPTION / HYPOTHESIS /
  DECISION / OPEN QUESTION / UNKNOWN, con URL e data di verifica. Mai inventare prezzi, coperture,
  stato legislativo, disponibilità marchi/domini.
- Metodo: decisioni importanti = proposta → critica → controproposta → decisione; red team per
  quelle ad alto impatto. Il fondatore ha autorizzato l'orchestrazione multi-agente (tool Workflow).
- Priorità: fiducia > correttezza dati > sicurezza > semplicità > automazione > affidabilità >
  privacy > velocità > UX > brand > costi > monetizzazione > numero di feature.

## Vincoli

- Non copiare codice/testi/branding/asset dei concorrenti. Niente scraping o workaround contro le
  policy degli store. Mai credenziali bancarie né PAN completi. Segreti mai nel repo.
- Importi in minor units `bigint` + valuta; mai float. Date contabili come DATE Europe/Rome.
- Chiedere al fondatore solo per: credenziali/API key, contratti, acquisti/licenze, decisioni
  legali, spese, clearance trademark, cambi radicali di business senza evidenza.
- Git: lavorare SOLO sul branch `claude/admiring-hypatia-yzh6nq`; commit frequenti; push con
  `git push -u origin claude/admiring-hypatia-yzh6nq`; NON aprire PR senza richiesta esplicita.
  Footer commit: `Co-Authored-By: <modello in uso> <noreply@anthropic.com>` +
  `Claude-Session: https://claude.ai/code/session_01Hy6Nxp3h8WcsgEKytLVGrs` (seguire il footer
  indicato dall'ambiente della sessione corrente). Nessun identificativo di modello nei file.
- Protocollo di continuità: aggiornare questo file in silenzio dopo ogni modifica/decisione/test/
  cambio fase; non parlarne all'utente salvo problemi.

## Ambiente

- Container cloud effimero (Linux), repo in `/home/user/Lilleri`. Node 22.22, pnpm 10.28,
  Python 3.11, Go 1.24, PostgreSQL 16 binari in `/usr/lib/postgresql/16/bin`, Redis 7. Docker CLI
  presente ma **daemon non disponibile** (docker compose va scritto ma non eseguibile qui).
- Postgres locale per i test (da ricreare a ogni nuovo container, non gira come root):
  ```bash
  mkdir -p /var/lib/postgresql/lilleri && chown postgres:postgres /var/lib/postgresql/lilleri
  su postgres -s /bin/bash -c "export PATH=/usr/lib/postgresql/16/bin:\$PATH; \
    initdb -D /var/lib/postgresql/lilleri/data -U lilleri --auth=trust -E UTF8; \
    setsid nohup pg_ctl -D /var/lib/postgresql/lilleri/data -o '-p 55432 -k /tmp -c listen_addresses=127.0.0.1' \
    -l /var/lib/postgresql/lilleri/log start >/dev/null 2>&1 &"
  psql -h 127.0.0.1 -p 55432 -U lilleri -d postgres -c "create database lilleri_test;" -c "create database lilleri_dev;"
  ```
  `pgvector` non è installato. `pgcrypto` sì.
- Rete: registry npm/PyPI raggiungibili; `WebFetch` bloccato per quasi tutti i domini; WebSearch
  ~200 query per esecuzione di workflow; Expo CLI richiede `EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 CI=1`
  in questa sandbox.
- Versioni verificate eseguendole (2026-10-02, `docs/research/raw/toolchain-spikes.md`):
  TypeScript 7.0.2 (tsc Go-native) OK su Fastify/Drizzle/Expo/Next; Fastify 5.12 + fastify-type-
  provider-zod 7 + Zod 4.6 + @fastify/swagger 9 (OpenAPI OK); Drizzle 0.45.3 + PGlite 0.5.8 (bigint
  OK, serve testTimeout ≥30 s); pg-boss 12.35 (export nominato `PgBoss`) su PG16 OK; better-auth
  1.7.7 + passkey plugin OK; Vitest 5.0.3; Expo SDK 57.0.26 (template RN 0.86.3) typecheck OK;
  Next 16.3.8 build OK; Biome 2.5.15 OK. Altre versioni npm note: turbo 2.11.6, expo-router 57,
  i18next 26.4, pino 10.3, dinero.js 2.0.2, openapi-typescript 7.13, openapi-fetch 0.17.
- Strumenti brand: `tools/brand-render/` (resvg + font OFL in `fonts/`; `pnpm install` lì prima
  dell'uso). Script dei workflow: `tools/workflows/` (vedi README lì).

## Stato corrente

Fase 0 (ricerca) COMPLETATA e verificata. Fase 1 (sintesi strategica) quasi completa: tutti i
documenti scritti; mancano le passate di critica/revisione. Fase 2 (brand) in esplorazione: 3
direzioni logo e 3 territori colore prodotti; manca la decisione tipografica, poi giuria +
consolidamento + design system. Fasi 3-5 (architettura, implementazione, review finali) DA FARE.
Nessun codice applicativo ancora nel repo.

## Ultima attività

Il modello precedente ha esaurito i crediti a metà di tre workflow (agenti falliti con
"out of usage credits"). I workflow sono stati fermati e rilanciati in resume alle 15:50 UTC del
2026-10-02 con il modello corrente:
- `phase1-synthesis-a` (run `wf_130b58b5-76c`): fase Revise dei documenti research/compliance
  sulla base delle 4 critiche già prodotte.
- `phase1-synthesis-b2` (run `wf_826cd90f-22e`): critiche (investor, brand-director, cto, cfo) +
  revisione di business/brand/product, inclusa la riconciliazione della nomenclatura dei piani.
- `phase2-explore` (run `wf_32c30274-72d`): solo l'agente tipografia (logo A/B/C e colore fatti).
Gli script attivi sono nello scratchpad della sessione (effimero); copie identiche in
`tools/workflows/` (nelle copie `TOOLS` punta a `/home/user/Lilleri/tools/brand-render`).

## Prossima azione

Se i tre workflow sopra risultano completati (controllare che esistano `## Review log` in
`docs/research/market-analysis.md` e `docs/product/prd.md`, e `docs/brand/explorations/typography-decision.md`):
committare, poi lanciare `tools/workflows/phase2-judge-consolidate.js` (giuria brand →
consolidamento asset finali in `packages/brand/{logo,icon,png,tokens}` → design system e docs
design/tone-of-voice → red team → fix). Se non completati in una nuova sessione (run ID non più
resumibili): rilanciare da `tools/workflows/` solo le parti mancanti, senza rifare ciò che esiste.
Subito dopo (anche in parallelo alla fase 2): lanciare `tools/workflows/phase3-architecture.js`.

## Piano

1. Fase 0 — Ricerca (mercato, provider, compliance, business, tech, AI, brand, naming) ✅
2. Fase 1 — Sintesi + red team: research/compliance/business/brand strategy/product docs ⏳
3. Fase 2 — Brand: esplorazione → giuria → identità finale + token + design system + voice ⏳
4. Fase 3 — Architettura: 3 proposte → giuria → sintesi → ADR 0001-0018 → security → red team
5. Fase 4 — Implementazione monorepo + vertical slice (ordine: tooling → brand tokens → domain →
   database → auth/profile → provider abstraction → mock provider italiano → sync pipeline →
   normalizzazione → riconciliazione → classificazione/regole → API → mobile shell → onboarding →
   transazioni → Review Inbox → recurring/insight → billing foundation → observability/security)
6. Fase 5 — Review critiche finali (CTO, security, privacy, fintech, AI, data, UX, brand, business,
   growth, investitore, consumer), brand red team, quality gate (install/lint/format/typecheck/
   test/build eseguiti davvero), visual quality gate, `docs/STATUS.md`, commit e push.

## Completato

- Ricerca grezza verificata (2 passate avversariali): `docs/research/raw/*.md` (16 file).
- Spike toolchain eseguiti: `docs/research/raw/toolchain-spikes.md`.
- Sintesi: `docs/research/{market-analysis,competitor-matrix,opportunity-map,user-pain-points,
  open-banking-providers,provider-capability-matrix,provider-cost-model,data-sources-feasibility,
  brand-competitor-analysis}.md`; `docs/compliance/*.md` (5); `docs/business/*.md` (6);
  `docs/brand/{brand-strategy,naming-analysis,messaging-framework}.md`;
  `docs/product/{personas,jobs-to-be-done,vision,prd,mvp,backlog,metrics,roadmap,pre-mortem}.md`.
- Esplorazioni brand: `docs/brand/explorations/logo-direction-{a,b,c}.md` +
  `packages/brand/explorations/direction-{a,b,c}/` (SVG + PNG) + `packages/brand/explorations/colour/`
  (t1/t2/t3 JSON + render).
- `docs/BRIEF.md`, `docs/README.md`, `docs/adr/0000-adr-template.md`, `tools/`.

## In corso

- Revisione post-critica dei documenti di fase 1 (workflow A e B2).
- Decisione tipografica (workflow explore, agente typography).

## Da fare

- Fase 2: giuria + consolidamento brand + design system + tone of voice + brand red team.
- Fase 3: architettura + ADR + security (threat model STRIDE, security architecture, incident response).
- Fase 4: implementazione (vedi Piano). Fase 5: review finali, quality gate, `docs/STATUS.md`.
- Documenti ancora mancanti: `docs/brand/{brand-identity,visual-language,brand-guidelines,
  brand-assets,tone-of-voice,brand-architecture}.md`, `docs/design/*.md`, `docs/architecture/*.md`,
  `docs/adr/0001…`, `docs/security/*.md`, `docs/STATUS.md`, README/CONTRIBUTING/SECURITY di root.

## Da verificare

- Coerenza nomenclatura piani: brand-strategy D7 dice "Lilleri / Lilleri Plus / Lilleri Famiglia"
  con "Pro" riservato a futuro tier partita IVA; business docs usano Free/Plus/Pro/Family
  (Plus €4,99, Pro €7,99, Family €9,99). Deve essere risolto dalla revisione B2; se no, decidere.
- Decisione MVP "Node/PostgreSQL/Redis workers" in `docs/product/mvp.md` è un'ASSUMPTION:
  gli spike indicano che pg-boss su Postgres basta (Redis forse non necessario) → ADR fase 3.

## Decisioni

- **Provider open banking**: primario Yapily (Yapily Connect UAB, licenza Banca di Lituania) con
  "route A" (Lilleri come destinatario sotto licenza del provider), condizionato a 4 gate RFP;
  fallback Enable Banking (usarne subito la "restricted production" per misurare i dati reali
  italiani); Tink challenger; Fabrick richiesta parallela (unico vigilato Banca d'Italia); Salt Edge
  escluso finché non indica un'entità EEA. Motivo: licenza EEA documentata e campi Berlin Group
  ricchi; prezzi tutti UNKNOWN (RFP). Conseguenza: architettura dual-adapter, mock-first.
  (`docs/research/open-banking-providers.md`)
- **Gate**: A mercato PASS con condizioni; B copertura dati PASS con condizioni; C business
  CONDITIONAL PASS (dipende da costo AIS ≤ €0,20/conto-mese, ≥18% paganti, offerte opt-in).
- **Posizionamento**: la riconciliazione corretta e spiegata è il cuneo, non l'aggregazione
  (Intesa XME Banks e Hype già aggregano). Promessa con clausola "chiede solo quando ha dubbi" /
  "e tu vedi sempre perché".
- **Business**: freemium ibrido (modello F): Free = 1 istituto (≤2 conti) + import illimitato +
  tutte le funzioni di correttezza/privacy/export; prova Pro 30 giorni senza carta; niente
  pubblicità display/contestuale; offerte solo in un'area "Offerte" opt-in con consenso separato.
- **Brand**: tagline raccomandata "Tu spendi. Lilleri sistema."; territorio emotivo "la
  tranquillità di sapere"; base cromatica carta calda + inchiostro con una firma tra oliva / cotto /
  vino (cotto vicino all'arancio Satispay #FF3D00: richiede test di confusione); master brand
  monolitico; nome Lilleri GO (non è clearance legale).
- **Stack candidato** (da ratificare con ADR in fase 3): monorepo pnpm + Turborepo, TypeScript 7
  per typecheck, Biome, Vitest; Fastify 5 + Zod + OpenAPI; Drizzle + PostgreSQL (PGlite nei test);
  pg-boss per i job; better-auth (passkey); Expo SDK 57 + Expo Router; Next.js 16 per landing.

## Problemi aperti

- Prezzi AIS di tutti i provider UNKNOWN (serve RFP: azione umana/contratto).
- Posizione di Banca d'Italia sulla "route A" UNKNOWN → serve parere legale (P0).
- Clearance marchio Lilleri (EUIPO/UIBM, classi 9/36/42) e domini (lilleri.com e lilleri.it già
  registrati da terzi) → azione umana.
- PSD3/PSR: accordo politico nov. 2025, NON in Gazzetta Ufficiale al 2026-10-02; FIDA non legge.
- Limiti di utilizzo del modello: i workflow possono fermarsi per crediti/rate limit; in tal caso
  rilanciare in resume (stessa sessione) o rieseguire solo le parti mancanti.

## File importanti

- `docs/BRIEF.md` — mandato completo del fondatore (requisiti, deliverable, review richieste).
- `docs/research/raw/` — evidenze con fonti; `toolchain-spikes.md` — versioni testate davvero.
- `docs/research/open-banking-providers.md` — decisione provider. `docs/product/mvp.md` — scope e
  vertical slice (milestone M0-M3). `docs/product/prd.md` — user stories P0/P1/P2.
- `docs/business/unit-economics.md` — formule COGS/ARPU (anche in TypeScript, §10).
- `docs/brand/brand-strategy.md`, `messaging-framework.md`, `naming-analysis.md`.
- `tools/workflows/*.js` — prompt di orchestrazione per rilanciare ogni fase.
- `tools/brand-render/*.mjs` — render SVG→PNG, icon sheet, shelf test, contrasto WCAG.

## Componenti importanti

Nessun componente software ancora implementato. Interfaccia prevista del provider:
`FinancialDataProvider { capabilities(), createConnection(), refreshConnection(), listAccounts(),
getBalances(), getTransactions(), disconnect() }`.

## Modifiche effettuate

Solo documentazione, asset di esplorazione brand e tooling di supporto (vedi Completato).

## Test e verifiche

- Spike eseguiti e passati (vedi Ambiente). Nessun test del prodotto ancora (nessun codice).
- Da fare: quality gate completo del monorepo in fase 4/5.

## Informazioni critiche da non perdere

- Il branch è `claude/admiring-hypatia-yzh6nq`; repo remoto `AsaroAlex/Lilleri`.
- Il container è effimero: committare e pushare spesso; ricreare Postgres a ogni nuova sessione.
- I run ID dei workflow valgono solo nella stessa sessione; in una nuova sessione usare
  `tools/workflows/`.
- Documenti generati da agenti: ogni claim ha etichetta e fonte; mantenerle nelle modifiche.

## Recent Changes

- 2026-10-02 15:50 UTC — workflow fase 1/2 rilanciati in resume dopo esaurimento crediti del
  modello precedente; creati `PROJECT_STATE.md`, `docs/BRIEF.md`, `tools/`.
- 2026-10-02 — completate fase 0 e documenti di fase 1; 3 direzioni logo e 3 territori colore.

## Ultimo aggiornamento

2026-10-02 ~15:55 UTC — creazione iniziale del file di stato a partire da repository e sessione.
