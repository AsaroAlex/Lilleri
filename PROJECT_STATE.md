# PROJECT STATE — Lilleri

> Memoria operativa corrente. Leggere `docs/BRIEF.md` per il mandato completo.
> Se stato e repository divergono, vale il repository.

## Obiettivo e mandato

Fondamenta Lilleri, PFM Italy-first: CONNECT → SYNC → UNDERSTAND → CORRECT ONLY WHEN
NECESSARY → LEARN → AUTOMATE. Risultato richiesto: ricerca, brand/design, decisioni
architetturali/security e software realmente eseguibile con dati sintetici. Il pilot
con conti reali richiede separatamente contratto/provider, pareri legali e sicurezza verificata.

## Vincoli

- Nome Lilleri, scope `@lilleri/*`. Documenti inglesi; copy prodotto italiano.
- Trust > correttezza > sicurezza > semplicità > automazione > affidabilità > privacy.
- FACT / ASSUMPTION / HYPOTHESIS / DECISION / UNKNOWN e fonti: niente prezzi, coverage,
  licenze, fatti normativi, risultati utenti o controlli security inventati.
- Proposta → critica → controproposta → decisione; review indipendenti.
- Mai credenziali bancarie, PAN, dati personali reali, segreti nel repo o scraping fragile.
- Money bigint + valuta; niente somme tra valute senza FX esplicito. Date provider DATE,
  istanti UTC, profilo Europe/Rome.
- Branch `claude/admiring-hypatia-yzh6nq`, commit frequenti e push sullo stesso branch.
  Nessuna PR senza richiesta. Non attribuire la sessione corrente al vecchio URL Claude.
- Task cloud già isolato: usare il checkout, non creare worktree senza richiesta.
- Aggiornare questo file dopo decisioni/verifiche senza annunciarlo salvo problemi.

## Ambiente attuale verificato

- Checkout `/workspace/Lilleri`, Linux x86_64. Ogni shell:
  `. /workspace/.lilleri-toolchain/env.sh`.
- Node 22.22.0, pnpm 10.28.0, Python 3.12.14. Cache/toolchain fuori dal checkout.
- Root e toolkit brand installati; renderer Resvg/Sharp verificato.
- HTTPS Git proxy legge il branch remoto; niente token aggiuntivo per le letture.
- Vecchi run `wf_*` e tool Workflow non disponibili nella sessione corrente.
  `tools/workflows/*.js` sono specifiche di prompt, non programmi Node da eseguire.
- Non assumere Postgres/Redis o daemon Docker locali dalla memoria vecchia.
  Database dev/test previsto PGlite; PostgreSQL reale da verificare separatamente.

## Stato corrente

- Fase 0: ricerca grezza esistente, non rifarla. Conclusioni troppo forti in revisione.
- Fase 1: revisioni research/compliance e prodotto/business in corso con review indipendenti.
- Fase 2: brand/design in consolidamento dagli asset A/B/C e T1/T2/T3 esistenti.
  Direzione B (monogramma li), T3 carta/vino, Geist UI/importi, Newsreader editoriale;
  token e font locali creati, gate finale da documentare.
- Fase 3: architettura/security/ADR in stesura e review.
- Fase 4: money preesistente verificato; domain/provider/engines implementati con test verdi.
  Database/API/UI e verifiche end-to-end da completare.
- Fase 5: review finali e `docs/STATUS.md` da completare.

## Decisioni correnti

- Mock-first: i nomi fixture non implicano alcuna banca integrata.
- Fastify modular monolith; PostgreSQL/Drizzle e PGlite dev/test; Expo mobile/Next landing.
  Queue PostgreSQL quando necessaria, nessun Redis obbligatorio, nessun LLM operativo.
- Identità canonica profilo/connessione/provider/conto/id, stabile tra status se id stabile;
  osservazioni con status/revisione. Importo/data/merchant soli suggeriscono, non cancellano.
- Match con provenienza/versione, correzioni sticky, undo, summary per valuta.
- Ladder concordata in revisione: Gratis / Plus; Famiglia Later finché sharing non implementato;
  Pro professionale futuro. Prezzi/conversione ipotesi; offers revenue zero nel caso base.
- Gate D architettura, E security, F core-loop UX, G brand come brief. Rilasci beta/launch separati.

## Implementato e verificato

- `packages/money`: bigint/ISO4217/formatter; 63 test passati in onboarding, build/typecheck OK.
- `packages/domain`: model/types/date-only/DST; 7 test passati.
- `packages/financial-providers`: port/mock italiano paginato/normalizzazione/revoca/retry;
  10 test passati.
- `packages/engines`: reconciliation conservativa, summary per valuta, precedence,
  recurring come stima, undo; 27 test passati.
- Nuovi pacchetti build/typecheck OK. Workspace lockfile aggiornato per i pacchetti nuovi.

## Prossima azione

1. Finire review fase1 e Review log con critiche, fix e blocchi umani.
2. Consolidare brand/design e prove contrasto/mono/piccoli formati/specimen.
3. Finire 9 architecture docs, ADR0001–0018 e security STRIDE/incident response.
4. Database persistente/sync idempotente/API scoping/feedback/export-delete/revoca/mobile/web.
5. Install frozen, lint/format/typecheck/unit/integration/API/build e smoke app avviata.
   Distinguere PGlite da PostgreSQL reale, web da device nativo, review esperta da studio UX.
6. Review avversariale/fix, STATUS e documentazione coerente, commit/push, nessuna PR.

## Blocchi esterni e limiti

- Coverage/quality/prezzi AIS reali non validati dal mock. Servono provider/contratti/sandbox
  ufficiale/counsel prima di conti reali; non chiedere valori segreti in chat.
- Gate A commerciale ancora non assessable; B fattibilità studiata distinta dal pilot;
  C condizionato a quote/cohort paganti. Non dichiarare produzione pronta.
- DPIA/tasse/commissioni/store economics/trademark clearance richiedono verifica umana.
- Passkey/MFA/KMS/PITR/backup restore/pen test non implementati senza prove.

## File importanti

`docs/BRIEF.md`, `docs/product/{prd,mvp,roadmap}.md`, `docs/research/raw/toolchain-spikes.md`,
`docs/research/open-banking-providers.md`, `docs/business/unit-economics.md`, `docs/brand/`,
`docs/architecture/`, `docs/adr/`, `docs/security/`, `tools/workflows/`, `tools/brand-render/`,
`packages/{money,domain,financial-providers,engines,brand}`.

## Ultimo aggiornamento

2026-10-02 — ripresa nel checkout cloud corrente; revisioni e implementazione sintetica in corso.
