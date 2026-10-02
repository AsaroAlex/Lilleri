# Lilleri — brief operativo (sintesi del mandato originale)

Questo documento condensa il mandato ricevuto dal fondatore il 2026-10-02. È la fonte dei requisiti
quando la conversazione originale non è disponibile. La lingua dei documenti del repository è
l'inglese; il prodotto è Italian-first.

## Missione

Lilleri è un'app consumer di Personal Finance Management, semplicissima da usare ma tecnologicamente
avanzata, prima per l'Italia e poi per l'Europa. Promessa: **"Collego le mie fonti una volta e
Lilleri capisce automaticamente cosa succede ai miei soldi."** Raccoglie automaticamente movimenti da
conti correnti, conti di pagamento, carte di credito/debito/prepagate, risparmio, PayPal e wallet,
fintech, Apple/Google Pay e Satispay (solo se tecnicamente e legalmente possibile), cash/manuale,
CSV/OFX/QIF/Excel, scontrini, email con ricevute (solo con consenso esplicito e se il rapporto
costi/privacy/benefici è ragionevole). ZERO SETUP deve essere un percorso completo: registrati →
collega → attendi la prima sync → vedi subito una situazione comprensibile. L'utente avanzato deve
poter personalizzare tutto. Core loop: CONNECT → SYNC → UNDERSTAND → CORRECT ONLY WHEN NECESSARY →
LEARN → AUTOMATE.

## Modalità operativa richiesta

- Lavorare come un team di massimi esperti (CTO fintech, architetto, mobile, backend, data, ML, LLM,
  open banking, PSD2, security, privacy/GDPR, compliance, PM, UX research, UI/UX, brand strategist,
  brand/visual/type/logo designer, art director, growth, monetizzazione, unit economics, CFO,
  DevOps/SRE, QA, accessibilità, release App Store/Play, marketing, CRO).
- Usare sub-agent in parallelo per le analisi specialistiche e far confrontare criticamente le
  conclusioni. Ogni decisione importante: proposta → critica → controproposta → decisione motivata;
  red-team per le decisioni ad alto impatto. (Il fondatore ha autorizzato esplicitamente
  l'orchestrazione multi-agente.)
- RESEARCH BEFORE BUILD: ricerca aggiornata via Internet su mercato, concorrenti, utenti,
  tecnologie, API, copertura bancaria, compliance, costi, monetizzazione, limiti iOS/Android,
  landscape visivo, naming. Per ogni informazione variabile: URL/fonte, data verifica, data fonte,
  affidabilità, dubbi. Etichettare sempre FACT / ASSUMPTION / HYPOTHESIS / DECISION / OPEN QUESTION /
  UNKNOWN; mai trasformare un'ipotesi in fatto; mai inventare prezzi, coperture, API, vincoli
  legali, disponibilità di marchi o domini.
- Non copiare codice, testi, branding, loghi, asset o interfacce dei concorrenti: prendere pattern
  e reimplementarli in modo originale e migliore (template: SOURCE OF INSPIRATION / USER PROBLEM /
  CURRENT MARKET SOLUTION / WEAKNESS / OUR IMPROVEMENT).
- Decision gates: A opportunità di mercato; B copertura dati finanziari italiani fattibile;
  C business model potenzialmente sostenibile; D architettura approvata; E security baseline;
  F core loop UX validato concettualmente; G brand identity distintiva e coerente. Se un gate
  fallisce, dirlo e descrivere cosa deve cambiare.
- Chiedere intervento umano solo per: credenziali/API key, contratti, acquisto font/licenze/servizi,
  decisioni legali, spese, validazione trademark professionale, scelte che cambiano radicalmente il
  business senza evidenza. Non scegliere asset a pagamento senza segnalare costo e licenza.

## Priorità assolute (in ordine)

1 fiducia · 2 correttezza dei dati · 3 sicurezza · 4 semplicità · 5 automazione · 6 affidabilità ·
7 privacy · 8 velocità · 9 UX · 10 brand recognition · 11 costi · 12 monetizzazione · 13 quantità di
feature. Revenue non deve distruggere trust; AI non deve distruggere correctness; branding non deve
distruggere usability; feature count non deve distruggere UX. Prima di aggiungere feature/AI/dati/
schermate/servizi chiedersi se servono davvero. La complessità sta nel sistema, non nell'esperienza.

## Requisiti di prodotto chiave

- **Fonti multi-source** con fallback (open banking, API ufficiali, import file, scontrini, email,
  Android notification listener solo se legittimo, integrazioni OS, manuale, template ricorrenti).
  Non assumere che iOS permetta di leggere notifiche altrui né che Apple/Google Pay offrano API
  consumer; escludere workaround fragili o contrari alle policy degli store.
- **Modello di dominio provider-agnostic** (User, Profile, Household, FinancialInstitution,
  Connection, Consent, Account, AccountBalance, Transaction, PendingTransaction, Merchant,
  MerchantAlias, Counterparty, Category, Subcategory, Tag, Budget, BudgetPeriod, Rule,
  Classification, ClassificationFeedback, AIRecommendation, RecurringSeries, Subscription, Transfer,
  TransferMatch, ReconciliationMatch, Receipt, Document, ImportJob, SyncJob, SyncCursor,
  UserPreference, Notification, Insight, Goal, AuditEvent — nomi modificabili). Più profili,
  household, account condivisi, multi-valuta, timezone, amount originale/normalizzato, FX, booked/
  value/authorization date, stati pending→booked/reversed/refund/duplicate/transfer/card settlement.
  Importi in minor units/decimal sicuro, mai floating point.
- **Riconciliazione** core: pending→booked, duplicati tra fonti, card settlement (il pagamento del
  saldo carta non è una nuova spesa), trasferimenti interni, rimborsi, split (somma figli = padre),
  shared/reimbursement, cash (ATM → wallet Cash). Pipeline gerarchica: provider id → match
  deterministico → merchant normalizzato → finestre importo/data → relazione conto/carta → regole
  utente → pattern ricorrenti → modello statistico → embeddings → LLM solo per casi ambigui →
  conferma umana. Ogni match: confidence, explanation, evidence, algorithmVersion, modelVersion,
  timestamp; tutto annullabile.
- **AI personale**: GLOBAL + MERCHANT + PROFILE PREFERENCES + EXPLICIT RULES + FEEDBACK + CONTEXT.
  Precedenza: regola esplicita > preferenza deterministica appresa > modello personalizzato ad alta
  confidenza > classificazione globale > suggerimento LLM > Needs Review. Zero-setup: taxonomy
  ragionevole, categorizzazione, merchant normalization, ricorrenze, abbonamenti, trasferimenti,
  duplicati, rimborsi, budget proposti, insight. Infer first, ask second. Learning loop da ogni
  correzione (one-shot / preferenza merchant / contestuale / regola; feedback strutturati: correct,
  wrong category, merchant rename, transfer, refund, duplicate, recurring, subscription, ignore,
  split). Soglie di confidenza calibrate, non hardcoded; modalità AUTOPILOT / BALANCED / CONTROL.
- **Categorie** completamente configurabili (icona, colore, ordine, hidden, income/expense/transfer,
  tag, regole; crea/rinomina/unisci/archivia con migrazione dati); canonical taxonomy interna
  separata dalla taxonomy utente. **Merchant intelligence** (normalizzazione, alias, logo, sito,
  paese, città, categoria, MCC, chain; conservare la stringa originale; non inventare dati).
- **Review Inbox** ("Inbox Zero per le finanze"): solo ciò che richiede attenzione, azioni rapide
  ✓/categoria/trasferimento/split/duplicate/rimborso/ignora in 1-2 interazioni.
- **Recurring/subscription engine** (SUBSCRIPTION, RECURRING BILL, SALARY, RECURRING TRANSFER,
  INSTALLMENT; frequenza, prossimo pagamento, importo atteso, variabilità, confidence; alert su
  aumenti e scomparse). **Insight engine** azionabile (source data, calculation, confidence,
  explanation; mai stime come fatti). **Chat finanziaria** futura: LLM chiama strumenti
  deterministici, mai aritmetica su dati raw. **Explainable AI** ("Perché?") derivata dal sistema.
  Autonomia utente: suggerimenti reversibili, modificabili, tracciabili; la regola vince sempre.
- **Onboarding** brevissimo (value prop → account → privacy/consent → collega banca → sync con
  progressive disclosure reale, niente fake progress → home con wow moment "Lilleri ha organizzato
  643 movimenti. 5 richiedono la tua attenzione."). **Trust moment** prima dell'accesso al conto
  (cosa leggiamo, cosa non possiamo fare, chi gestisce il collegamento, come revocare, perché).
- **Home**: quanti soldi ho, quanto ho speso, sto spendendo troppo, cosa succederà, c'è qualcosa da
  controllare; no dashboard affollate. UX north star: ONE GLANCE → ONE INSIGHT → ONE ACTION;
  "fintech premium calm"; 4/8 pt grid; dark mode; WCAG AA; mai solo rosso/verde.
- **Data ownership/privacy dashboard**: vedere/revocare connessioni, stato consenso, rimuovere
  account, export, cancellazione, cosa conserviamo e perché; niente legalese nell'interfaccia.
  Analytics con eventi semantici, mai descrizioni/IBAN/importi a terze parti.
- **Degraded mode** onesto ("Ultimo aggiornamento 09:42"), copy umano ("Il collegamento con Intesa
  deve essere rinnovato" / CTA "Ricollega"), i18n dal giorno uno (it, poi en/es/fr/de), accessibilità
  (dynamic type, screen reader, touch target, contrasto, reduced motion).

## Brand

Nome ufficiale e immutabile: **Lilleri** (salvo blocker legale grave). Serve: brand strategy
(purpose, mission, vision, promise, positioning, personality 4-6 tratti, archetype solo se utile,
emotional/functional benefit, reason to believe), naming analysis (verifica preliminare, NON
clearance legale), brand identity completa (logo, logomark, wordmark, monogramma, app icon,
favicon, typography, palette con semantic colors e light/dark WCAG, illustration, iconography,
graphic elements, shape language, spacing, motion, voice), 3 direzioni logo esplorate e valutate
(no €, monete, grafici, portafogli, carte, salvadanai, cliché fintech neon; funzionare a 16-1024 px
e monocromatico; clear space, minimum size, usi errati), app icon riconoscibile tra 30 app
finanziarie, tipografia professionale (numeri tabulari, 1/I/l, 0/O, €/£/$/CHF, "€ 12.438,72";
font commerciali solo dopo analisi licenze/costi), tone of voice (DO/DON'T, esempi per onboarding,
errore, successo, alert, AI suggestion, subscription, insight, privacy, paywall, advertising,
notifiche; mai colpevolizzare), 20+ tagline → 5 finaliste → raccomandazione, brand architecture
(master brand Lilleri; Plus/Pro/Family; Business solo se coerente), motion identity, brand red team
(crypto? poco serio? solo Gen Z? banca? gioco? datato in 2 anni? distinguibile da Revolut, N26,
Klarna, Satispay, Wise, Curve e PFM? palette distintiva? icona tra le altre? font leggibile per
€12.348,92? funziona fuori dall'Italia? credibile a milioni di utenti?). Asset in SVG/PNG, design
tokens JSON/TS/CSS, documentazione Markdown; asset AI-generated da far rifinire a un designer.

## Business

Non decidere pricing a sensazione: prezzi concorrenti, willingness to pay, costi aggregatori, AI,
OCR, email, notifiche, hosting, supporto, commissioni store, IVA, pagamenti, CAC, affiliate. Unit
economics (COGS/user/month = open banking + sync + enrichment + AI + compute + storage +
notifications + third-party + support + payment fees + other) a 1k/10k/100k/1M utenti con mix
Free/Paid/Family(/B2B), sensitivity, break-even. Free tier: valutare modelli A-F; mai paywall su
privacy/security. Advertising: valutare criticamente; no vendita dati, no condivisione transazioni,
no dark pattern; consenso separato e opzionale; Free with Ads vs Free Limited + Subscription.
Possibile struttura Free/Plus/Pro/Family (+Business/Professional per partita IVA solo se la ricerca
lo giustifica, non nell'MVP). App Store economics (IAP, Play billing, alternative UE, web
subscription, IVA, parity). Documenti: business-model, pricing-analysis, unit-economics,
revenue-scenarios, go-to-market (ARPU, COGS, margine, conversion, break-even per piano).

## Architettura e implementazione

- Prima Architecture Decision Matrix (development speed, type safety, security, ecosystem, testing,
  cost, observability, mobile DX, backend scalability, hiring, EU deployment, lock-in). Candidato:
  monorepo, React Native + Expo + TS, Next.js, NestJS/Fastify, PostgreSQL, Redis, job queue, AI
  provider abstraction, OpenTelemetry, Docker Compose, GitHub Actions; usare `lilleri` come
  identificatore e `@lilleri/*` come scope. Modular monolith (identity, profiles, connections,
  accounts, transactions, merchants, classification, rules, reconciliation, recurring, insights,
  billing, notifications, imports), domain events dove utili, design for extraction later.
- Provider adapter `FinancialDataProvider` (capabilities, createConnection, refreshConnection,
  listAccounts, getBalances, getTransactions, disconnect); modello canonico interno; mai far
  dipendere il dominio dal formato Tink/Fabrick/etc.; payload originale solo se utile, con retention.
- Pipeline: provider → raw ingest → validation → normalization → idempotency → merchant enrichment →
  reconciliation → classification → recurring → insights → notification; retry, backoff, rate
  limit, poison, DLQ, partial failure, replay; ingestion idempotente (provider tx id + account +
  status + fingerprint di fallback; mai solo amount+date).
- AI: regole → enrichment deterministico → merchant map cache → ML leggero → embeddings → LLM
  piccolo → frontier solo per casi difficili; batch, cache, structured output, prompt versionati,
  log di model/promptVersion/cost/latency/tokens/result/confidence senza PII; abstraction layer
  multi-vendor; inviare il minimo necessario.
- Observability (logs, traces, metrics, errors, job e provider monitoring; metriche
  sync_success_rate … provider_cost_per_active_user), product metrics con North Star, feature flags
  semplici, environment dev/test/staging/prod, segreti mai nel repo, migrazioni versionate, OpenAPI
  + typed client, error model, pagination, idempotency, versioning.
- Security by design (TLS, encryption at rest, envelope encryption, KMS, secret manager, least
  privilege, OAuth/OIDC, MFA/passkeys, refresh rotation, revoca sessioni, audit, rate limiting, WAF,
  validation, idempotency, isolation profili, backup/PITR, scanning, SBOM, export/delete,
  incident response, DR); mai credenziali bancarie né PAN completi; threat model STRIDE.
- Testing serio: unit, integration, contract, API, provider adapter, DB, riconciliazione,
  classificazione, E2E; fixture sintetiche realistiche; scenari: pending→booked, duplicate provider,
  CSV+bank duplicate, internal transfer, card settlement, partial/full refund, split, reimbursement,
  recurring variable, subscription price increase, merchant rename, multi-currency, timezone, DST,
  negative balance, provider retry, consent expiration; invarianti finanziarie testate.
- DX: README, CONTRIBUTING, SECURITY, CODEOWNERS, .editorconfig, .gitignore, .env.example, lint,
  format, typecheck, test, pre-commit, commit conventions, CI; avvio locale semplice (es. `pnpm
  install && docker compose up -d && pnpm dev`).
- Ordine di implementazione: tooling → brand foundation → design tokens → domain model → database →
  auth/profile → provider abstraction → mock provider (dataset italiano sintetico: Coop, Esselunga,
  Amazon, Netflix, Spotify, McDonald's, Autostrade, Enel, TIM, Trenitalia, Deliveroo, Booking, IKEA,
  farmacia, benzina, ristorante; salary, ATM, transfer, card settlement, refund, subscriptions,
  pending) → sync pipeline → normalization → reconciliation → classification/rules → API → mobile
  shell → onboarding → transaction experience → Review Inbox → recurring/insights → billing →
  observability/security. Vertical slice funzionante, non 40 moduli vuoti. Sandbox ufficiale del
  provider dopo il mock; mai credenziali bancarie personali.

## Documenti richiesti (percorsi)

`docs/research/` market-analysis, competitor-matrix, user-pain-points, opportunity-map,
brand-competitor-analysis, open-banking-providers, provider-capability-matrix, provider-cost-model ·
`docs/compliance/` regulatory-landscape, privacy-model, consent-model, data-retention,
legal-open-questions · `docs/security/` threat-model, security-architecture, incident-response ·
`docs/brand/` brand-strategy, naming-analysis, brand-identity, visual-language, brand-guidelines,
brand-assets, tone-of-voice · `docs/design/` design-principles, design-system, user-flows,
wireframes · `docs/business/` business-model, pricing-analysis, unit-economics, revenue-scenarios,
go-to-market · `docs/product/` vision, personas, jobs-to-be-done, prd, mvp, backlog, metrics,
pre-mortem (+ roadmap fasi 0-8 con goals/deliverables/dependencies/risks/exit criteria, effort
relativo) · `docs/adr/` (stack, database, architecture style, bank provider, provider abstraction,
AI architecture, deployment, auth, monetization architecture, design-system implementation) ·
`docs/STATUS.md` (Executive Summary, Product thesis, Brand thesis, Key findings, Selected
architecture, Open Banking decision, Business model hypothesis, Security posture, Compliance
blockers, Brand assets created, Implemented, Not implemented, Known limitations, Risks, Open
questions, Cost assumptions, Recommended next step, Commands, Repository map, Decision log).

## Review finali richieste prima di chiudere il setup

CTO (complessità, overengineering, lock-in), Security (come si perderebbero i dati), Privacy (dati
non necessari), Fintech (assunzioni false sull'accesso ai conti), AI (LLM dove basta una regola),
Data (duplicati/inconsistenze), UX (dove si perdono utenti), Brand (riconoscibile senza logo?
originale? logo a 24 px? palette fiducia? tipografia con importi? fuori dall'Italia?), Business
(free tier distrugge marginalità?), Growth (perché installarla invece dell'app della banca?),
Investitore scettico (perché potrebbe fallire?), Consumer (mi fiderei a collegare il conto?).
Pre-mortem 2029 (failure mode con probabilità, impatto, early warning, mitigazione). Quality gate
repository: eseguire davvero install, lint, format, typecheck, test, build e riportare i comandi.
Visual quality gate: light/dark, small/large device, accessibilità, nomi lunghi, importi grandi,
negativi, multi-valuta, empty/error/loading, account disconnesso, 100+ e zero transazioni.

## Output finale atteso (checklist)

1 Research · 2 Competitive matrix · 3 Product positioning · 4 Brand strategy · 5 Brand identity ·
6 Logo direction · 7 App icon · 8 Font system · 9 Color system · 10 Brand guidelines · 11 PRD ·
12 MVP definition · 13 Open banking provider analysis · 14 Architecture decision · 15 Security
architecture · 16 Compliance analysis · 17 Business model · 18 Unit economics · 19 Pricing
hypotheses · 20 UX principles · 21 User flows · 22 Design system · 23 Repository architecture ·
24 Working local environment · 25 Database schema · 26 Core domain · 27 Mock financial provider ·
28 Initial sync pipeline · 29 Initial reconciliation tests · 30 Initial classification/rule system ·
31 Mobile application shell · 32 Core CI · 33 Documentation · 34 Backlog · 35 Risks · 36 Pre-mortem ·
37 Next implementation milestones. Non è concluso se esistono solo documenti senza software
funzionante, né se esiste codice senza research, brand, design e decisioni.
