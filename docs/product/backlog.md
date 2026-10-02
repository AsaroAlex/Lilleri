# Lilleri product backlog — epics, stories, acceptance criteria, sizing, dependencies, and the "not now" list

**Project:** LILLERI (greenfield consumer PFM; Italy-first, then Europe)
**Document type:** Phase 1 product document — prioritised backlog
**Date / verification date for every carried-over claim:** 2026-10-02
**Author:** Head of Product + principal architect (product side), founding team
**Companions:** `prd.md` (requirements and story IDs), `mvp.md` (scope rule, milestones, exit criteria), `vision.md` (principles, modes).
**Language:** documentation in English; product copy in Italian with English glosses.

## Delivery and evidence boundary (review decision, 2026-10-02)

This is a requirements document, not a list of delivered features. Local work uses synthetic fixtures and a mock provider. Official sandbox work needs provider-issued non-production access. Any real-data pilot needs a written acceptable licence route, provider permission/contract, DPIA/privacy controls, security isolation and informed participant consent before access. Bank credentials are never collected by Lilleri. Mock or sandbox success does not verify Italian production coverage, user demand, retention, classification calibration, store approval or legal clearance.

The full P0 list describes a future cleared beta, not the initial repository scaffold. Implement a small synthetic vertical slice first: exact money → mock ingest → idempotency → deterministic reconciliation/classification with explicit rules → evidence/review/undo → honest synthetic summary. Record actual commands/results in repository status; do not claim every planned fixture or UI flow is already implemented.

Canonical commercial policy: **Lilleri Gratis / Lilleri Plus** at launch; Plus **€4.99/month / €39.99/year is a hypothesis**. **Lilleri Famiglia Later** after consent/sharing/isolation tests; **Pro reserved** for future professional workflows. Closed beta is free. A proposed **30-day non-renewing Plus preview** requires implemented entitlements; it never charges. Store billing, real purchases and renewal metrics are P1 and require explicit checkout and release gates. Correctness, corrections/learning/rules, privacy/security/consent safety, retained-data access, export and deletion stay free in every plan and after downgrade.

Evidence dates/FACT labels below are inherited from source research, including its snippets and uncertainty; this review does not freshly verify vendor terms or law. Numerical success criteria are HYPOTHESES. Fixture correctness cannot establish production precision. Report audited error numerator/denominator, sample selection, decision type, bank/period, label agreement and confidence intervals; audit and user corrections must not double-count errors. A zero-error small sample is not proof of zero error. All A–G letters refer to the brief: A market, B data feasibility, C business, D architecture, E security, F core-loop UX, G brand. Beta/public-launch/expansion releases are separate decisions.

## How to read this document

| Item | Convention |
|---|---|
| Priority | **P0** MVP vertical slice and closed beta; **P1** public launch; **P2** first expansion; **Later** roadmap, unscheduled (see `prd.md` §0) |
| Size (relative effort; ASSUMPTION) | **S** ≤ 3 engineer-days; **M** ≤ 2 engineer-weeks; **L** ≤ 4 engineer-weeks; **XL** > 4 engineer-weeks (needs splitting before it enters a sprint). Sizes include tests and copy; they exclude provider sales cycles and counsel time |
| Dependencies | `→ E03.2` means "depends on story E03.2"; `→ E03` means on the whole epic's P0 stories; external dependencies are named (provider contract, counsel) |
| Loop stage | CONNECT / SYNC / UNDERSTAND / CORRECT / LEARN / AUTOMATE / X (cross-cutting), as in `vision.md` §4 |
| Labels | FACT / ASSUMPTION / HYPOTHESIS / DECISION / OPEN QUESTION / UNKNOWN as in `docs/README.md`; story priorities and sizes are DECISION (proposed); evidence prefixes as in `prd.md` §0 |
| Acceptance criteria | Abbreviated here; the full criteria are the PRD story cited in the "PRD" column. A story is done only when its PRD criteria, its tests and its Italian copy are accepted |
| Principle tags | P1–P6 and C1–C6 from `vision.md` §3 |

---

## 1. Epic overview

| Epic | Name | Stage | Priority | Size | Depends on | PRD §§ |
|---|---|---|---|---|---|---|
| E00 | Platform foundations | X | P0 | L | — | 5, 6 |
| E01 | Auth & profile | X | P0 | M | E00 | 4.1 |
| E02 | Connections & consent | CONNECT | P0 | XL | E00, E01, provider sandbox/contract | 4.2 |
| E03 | Sync engine & ingestion identity | SYNC | P0 | XL | E02 | 4.3 |
| E04 | Sync report & degraded modes | SYNC | P0 | M | E03 | 4.3, 4.18 |
| E05 | File import & manual accounts | SYNC | P0 | L | E03, E06 | 4.3 |
| E06 | Ledger core & transactions UI | UNDERSTAND | P0 | L | E00, E03 | 4.4, 5 |
| E07 | Merchant normalisation & Italian dictionary | UNDERSTAND | P0 | L | E06 | 4.5 |
| E08 | Taxonomy & categories | UNDERSTAND | P0 | M | E06, counsel (Art. 9) | 4.6 |
| E09 | Categorisation pipeline | UNDERSTAND | P0 (T0–T4), P1 (T5) | XL | E07, E08, E11, E25 | 4.7 |
| E10 | Feedback, rules & learning | LEARN | P0 | L | E06, E08, E09 | 4.8 |
| E11 | Calibration & automation policy (modes) | AUTOMATE | P0 (CONTROL, BALANCED), P1 (AUTOPILOT) | L | E25 | 4.9 |
| E12 | Review Inbox | CORRECT | P0 | L | E09, E10, E13 | 4.10 |
| E13 | Reconciliation engine (core) | SYNC | P0 | XL | E03, E06, E07 | 4.11 |
| E14 | Recurring & subscriptions | UNDERSTAND | P0 (detection), P1 (alerts) | L | E07, E13 | 4.12 |
| E15 | Insights & summaries | UNDERSTAND | P0 (monthly), P1 (weekly) | M | E08, E13, E14 | 4.13 |
| E16 | Safe-to-spend & watchlists | UNDERSTAND | P0 (number), P1 (watchlists) | M | E13, E14 | 4.14 |
| E17 | Notifications | AUTOMATE | P0 | M | E02, E12 | 4.15 |
| E18 | Privacy dashboard, export, deletion, retention | X | P0 | L | E01, E02, E24 | 4.16 |
| E19 | Settings | X | P0 | M | E01–E18 | 4.17 |
| E20 | Offline cache & queued actions | X | P0 (read), P1 (writes) | M | E06, E12 | 4.18 |
| E21 | i18n & number formatting | X | P0 | M | E00 | 4.19 |
| E22 | Accessibility | X | P0 (build), P1 (audit) | M | E06, E12 | 4.20 |
| E23 | Entitlements & paywall | X | P0 (entitlements), P1 (trial, paywall) | L | E01, E02, pricing ADR | 4.21 |
| E24 | Security hardening | X | P0 | L | E00 | 6 |
| E25 | Evaluation & quality infrastructure | X | P0 | L | E00 | 5, 6 |
| E26 | Coverage, health page & status | CONNECT | P0 (in-app), P1 (public) | M | E02, E04 | 4.2, 6 |
| E27 | Second provider adapter & failover | CONNECT | P1 | L | E02, RFP outcome | 4.2 |
| E28 | Extended reconciliation (refunds, splits, cash wallet, settlement period) | SYNC | P1 | L | E13, E05 | 4.11 |
| E29 | Recurring alerts & weekly digest | AUTOMATE | P1 | M | E14, E15, E17 | 4.12, 4.13 |
| E30 | Web client (import/export, read-only ledger) | X | P1/P2 | L | E05, E18 | 4.3 |
| E31 | Receipt photo attach | UNDERSTAND | P2 | S | E06, E18 | 4.23 |
| E32 | Reimbursable flag & reimbursement proposals | SYNC | P2 | M | E13 | 4.11 |
| E33 | Household (Lilleri Famiglia) | X | Later | XL | E23, HH-0, two-consent pairing proven | 4.24 |
| E34 | Financial chat over deterministic tools | UNDERSTAND | Later | L | E09, E15, E16 | 4.22 |
| E35 | Receipt OCR & e-mail ingestion | UNDERSTAND | Later | L | E31, DPIA update | 4.23 |
| E36 | Android notification-access experiment | SYNC | Later | M | Play policy read | `DSF` §6 |
| E37 | Offers rail (Later monetisation stage) | X | Later | L | counsel (art. 67(2)(f)), trust metrics | `BM` §5–§6 |
| E38 | Partita IVA scope | X | Later | L | HH-0 scope attribute | `PE` §6 |
| E39 | Investments / crypto import | SYNC | Later | M | E05 | `DSF` §2 |

---

## 2. Stories by epic

### E00 Platform foundations — P0, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | Principle |
|---|---|---|---|---|---|---|
| E00.1 | As an engineer, I want a TypeScript monorepo with apps (mobile, api, workers) and shared packages (domain, money, i18n, config), so that the slice is one codebase | Monorepo builds; shared `money` (bigint minor units, Dinero v2 bigint entry) and `dates` (ISO `date` strings) packages with tests; lint/typecheck/test in CI | P0 | M | — | P3 |
| E00.2 | As an engineer, I want environments (local, dogfood, beta) with EU-only hosting, Postgres, Redis, object storage and secrets in a KMS, so that data never leaves the EU | Infra as code; EU regions only; secrets never in tables; backups daily (MVP) with EU-only storage | P0 | M | E00.1 | C3, `PM` D11 |
| E00.3 | As an engineer, I want a versioned configuration service (automation policy, retention periods, refresh windows, per-bank parameters, feature flags), so that nothing operational is a code literal | Config objects versioned with audit; read at runtime; rollback by version; no literal thresholds in app code (lint) | P0 | M | E00.1 | P4 |
| E00.4 | As an engineer, I want observability (structured logs scrubbed of PII, traces sampled 10%, metrics, alert routing), so that failures are seen before users report them | OpenTelemetry baseline; forbidden-property lint for events/logs; dashboards for `sync_run`, inbox, decisions | P0 | M | E00.1 | C1 |
| E00.5 | As the team, I want semantic analytics with a reviewed event catalogue, so that product decisions never touch amounts or descriptions | Catalogue per `prd.md` §7; DPO review step; anonymised mode without consent | P0 | S | E00.4 | `PM` §6 |

### E01 Auth & profile — P0, M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E01.1 | Sign-up with e-mail verification, passkey first, password + TOTP fallback, 18+ attestation, T&Cs acceptance as one explicit action | `K-CONTRACT`, `K-AGE` consent events logged with text version; one ask per screen | P0 | M | E00 | AU-1 |
| E01.2 | Biometric lock, session list with revoke, 90-day session expiry, re-auth before export/deletion/disconnect | Sessions expire; re-auth enforced; events logged | P0 | S | E01.1 | AU-2 |
| E01.3 | Minimal profile (display name, locale, country) and explicit non-collection | No contacts/location/IDs; country IT fixed at launch | P0 | S | E01.1 | AU-3 |
| E01.4 | In-app and web-link account deletion with 7-day cool-off, provider revocation, crypto-shredding, confirmation | Flow per `DR` §5.1; deletion certificate generated | P0 | M | E01.1, E18.3, E24.2 | AU-4 |

### E02 Connections & consent — P0, XL

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E02.1 | `FinancialDataProvider` port with provider-agnostic canonical schema, mock contract tests and minimised evidence retention | Port covers institutions list, consent create/renew/revoke, accounts, balances, transactions (booked/pending) with paging; contract test suite runs against a mock adapter | P0 | L | E00 | CO-6 |
| E02.2 | Official sandbox adapter first; selected live adapter only after clearance | Mock/sandbox schemas tested; real-data fields measured only in cleared opt-in pilot; `valid_until`/`expires_at`, history read from provider | P0 | M | E02.1 | CO-1, CO-6; `OBP` D2 |
| E02.3 | Primary provider adapter (Yapily sandbox → production on contract) | Hosted Pages consent in a webview; per-institution configuration (Intesa 14-day paging); consent `expiresAt` | P0 | L | E02.1, RFP gates G1–G4 | CO-1; `OBP` D1 |
| E02.4 | Pre-redirect explainer screen naming the provider's EU entity and supervisor, read-only, provider-derived expiry and verified coverage | Copy per `CM` §3 step 3; provider UI review submitted | P0 | S | E02.2/E02.3 | CO-1 |
| E02.5 | Institution picker with per-institution, per-account-type coverage status and manual fallback | Statuses from configuration; "Non ancora collegabile — aggiungi il saldo a mano" path to E05.4 | P0 | M | E02.1, E26.1 | CO-2 |
| E02.6 | Consent service: `consent_event` append-only store, `connection` state machine (active / expiring / expired / revoked_* / error_* / paused), source-of-truth per type | Invariants per `CM` §4.4; every feature gate reads the service | P0 | M | E00.3 | CO-3; `CM` §4 |
| E02.7 | "Collegamenti" screen: status, expiry and days left, last update, accounts masked, actions Rinnova / Aggiorna ora / Metti in pausa / Scollega with data choice | Every action writes a consent event; provider-side revocation reflected within one refresh | P0 | M | E02.6 | CO-3 |
| E02.8 | Renewal cadence 150/170/178, "Rinnova tutti", expired = "in pausa" copy, late-renewal gap detection with CSV offer | Timeline per `CM` §5.2; reminders stop on renewal | P0 | M | E02.6, E12, E17 | CO-4 |
| E02.9 | Free-envelope enforcement at connect time (1 institution, ≤ 2 accounts) with contextual message | Cap enforced; manual/import unlimited; paused accounts keep history | P0 | S | E23.1 | CO-5 |

### E03 Sync engine & ingestion identity — P0, XL

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E03.1 | Scheduler with per-consent refresh budget (4×/24 h in fixed windows; free 1/day; paused when inactive > 14 days) and user-present refresh on open | Budget bookkeeping per consent; 429 back-off; windows configurable per provider/bank | P0 | M | E02.6, E00.3 | SY-1 |
| E03.2 | Immutable `provider_record` with layered `provider_key` (stable id → vendor id → `fingerprint_v1` + ordinal), scoped by account and source | Fingerprint spec per `RC` §9.1; normaliser versioned; ordinals deterministic | P0 | L | E02.1 | SY-2 |
| E03.3 | Ingestion state machine (IDENTIFIED / FINGERPRINTED → DEDUP_HIT / NEW / MERGE_PROPOSED / SUPERSEDED) and `transaction_source` history | Per `RC` §4.4; strict-id rule (no fuzzy merge across two different provider ids from the same source) | P0 | M | E03.2 | SY-2, RE-2 |
| E03.4 | Pending overlay: replace the pending set per account per fetch; identity on the canonical row | Pending records never duplicate; edits carried (with E13.1) | P0 | M | E03.3 | SY-2, RE-1 |
| E03.5 | Trailing-window re-fetch (≥ 7 days, default 30), two-fetch rule for provider deletions, idempotent `sync_run` with resume | Scenarios 21, 24 pass | P0 | M | E03.1 | SY-3 |
| E03.6 | 14-day paging and chunked catch-up with progress state; deletion detection suppressed on incomplete runs | Intesa parameter; scenario 22 passes | P0 | M | E03.5 | SY-5 |
| E03.7 | Balance check against provider balance after every sync; mismatch → inbox item + trailing re-fetch | Scenario 20; equality or item 100% | P0 | S | E03.5, E12.1 | SY-4 |

### E04 Sync report & degraded modes — P0, M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E04.1 | `sync_run` report with counts and linked items (new, updated, paired, matched, pending, replaced, skipped with reason, merged, removed-by-bank, balance result) rendered in Italian | Home line + Collegamenti detail; zero silent skips asserted by a payload-vs-ledger reconciliation job | P0 | M | E03.5 | SY-3 |
| E04.2 | Freshness line "Ultimo aggiornamento 09:42" and the degraded-state copy set (stale, paused, expiring/expired, bank unavailable, cap reached, partial, provider outage, history gap, device offline) with banned strings enforced by a copy lint | Copy per `prd.md` DG-1; no red for ordinary events | P0 | S | E04.1 | DG-1 |

### E05 File import & manual accounts — P0, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E05.1 | Generic CSV/XLSX importer with column mapper (Italian decimal comma, `dd/mm/yyyy`, long Italian dates, debit/credit columns, Data contabile/valuta) | Mapping saved per account; file deleted after 30 days | P0 | M | E03.2, E06.1 | SY-6 |
| E05.2 | Pre-built mappings: Intesa Sanpaolo, UniCredit, Fineco, Revolut, N26, PayPal (+ Banana fixtures as regression tests) | Each mapping has fixtures; header auto-detection | P0 | M | E05.1 | SY-6 |
| E05.3 | Dedup of imported rows against synced rows (FINGERPRINT → FUZZY_WINDOW ±7 days), `superseded_by`, summary "412 abbinati, 38 nuovi" | Scenario 7 passes | P0 | S | E05.1, E13.2 | SY-6 |
| E05.4 | Manual accounts (cash, wallet, card statement, other) with ≤ 5 s cash entry and "Correggi il saldo" adjustment events | Manual entries join reconciliation (no duplicate of an ATM withdrawal) | P0 | M | E06.1 | SY-7 |
| E05.5 | Share-sheet / share-target entry points (iOS, Android) for CSV/XLSX | Opens the importer with the file | P0 | S | E05.1 | SY-6 |
| E05.6 | Wallet pseudo-account balance from bank-side top-ups (Satispay, Hype, Postepay) with manual completion | Balance = top-ups − known spends; honest "non collegato" label | P1 | S | E13.3, E05.4 | SY-7 |
| E05.7 | Recurring manual templates proposed from the inbox | Amount, cadence, counterparty, account; matched by E14 | P1 | S | E14.1 | SY-8 |
| E05.8 | PDF statement import (per-bank templates; LLM-assisted parsing reconciling totals) | Totals reconcile; per-bank fixtures | P1 | L | E05.1, E09.5 | SY-6 |

### E06 Ledger core & transactions UI — P0, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E06.1 | Domain model: `account`, `transaction` (bigint minor units, currency, scale, three `date` columns, status, encrypted raw description, normalised description, counterparty hash, codes, category/canonical/kind/confidence/tier/taxonomy_version, parent, locked fields, version), `link`, `ledger_event`, household tenancy with RLS ENABLE + FORCE and CI cross-household test | Schema and tests per `RC` §4.2, §6; `scope` attribute reserved | P0 | L | E00.2 | TX-4, XD-1–XD-3, HH-0 |
| E06.2 | Combined transactions list by day with account chips, status badges, transfer pairs rendered once, settlements linked, month totals excluding transfer legs, filters | it-IT amounts, Unicode minus, tabular figures | P0 | M | E06.1, E21.1 | TX-1 |
| E06.3 | Transaction detail: normalised and raw descriptor, dates, kind, category with "why", links with evidence sentences, history with per-event undo, all feedback actions | Raw never destroyed | P0 | M | E06.1, E10.1 | TX-2 |
| E06.4 | Search (merchant, raw, notes, amount with comma) with p95 ≤ 300 ms server and instant on the 90-day cache | Scoped to the household | P0 | S | E06.1, E20.1 | TX-3 |
| E06.5 | FX: original amount/currency and provider rate kept; dated ECB/Frankfurter fallback with `fx_source` | Scenario 17 passes | P0 | S | E06.1 | TX-4 |

### E07 Merchant normalisation & Italian dictionary — P0, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E07.1 | Normaliser: noise stripping, delimiter extraction, per-bank patterns (Intesa, UniCredit, Fineco, BPER, Crédit Agricole, CSE banks, Hype/Sella, Revolut, N26), versioned | Fixture suite from Banana (Apache-2.0) and CBI table (MIT); raw retained | P0 | M | E06.1 | MN-1 |
| E07.2 | `kind` resolver from channel keywords, CBI causali, ISO bank transaction codes and bank-provided labels as hints | Deterministic kind for ≥ 90% of fixture rows (HYPOTHESIS target) | P0 | M | E07.1 | MN-1 |
| E07.3 | Canonical `merchant` entity, global dictionary seeded (Italian descriptors, CC0 names) and grown from confirmations; per-user merchant rename | Same string → same merchant across users; user renames private | P0 | M | E07.1 | MN-1 |
| E07.4 | Italian payment-type dictionary (F24, PagoPA/CBILL, MAV/RAV, bollettini, SDD creditor, ricarica/top-ups, ATM, card settlement, salary/pension) with typed semantics | Copy examples per MN-2; "Altro" < 5% target | P0 | M | E07.2 | MN-2 |
| E07.5 | Merchant logos cached in Lilleri's CDN by canonical domain; monogram fallback | Never hot-linked; Brandfetch caps respected | P1 | S | E07.3 | MN-3 |
| E07.6 | Enrichment-vendor bake-off on the residual (2k Italian rows, NDA) | Decision memo with cost per residual row | P2 | M | E09.7, E25.1 | MN-4 |

### E08 Taxonomy & categories — P0, M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E08.1 | Canonical taxonomy v1 (two axes; 12–16 parents, 70–110 leaves; default child per parent; stable ids; Italian labels; quiet-set flags; no Art. 9 inference labels) | Counsel sign-off recorded; `taxonomy_version` on transactions | P0 | M | counsel (Art. 9) | CA-1, CA-3, CA-4 |
| E08.2 | User taxonomy: create/rename/nest/reorder/icon; many-to-one mapping to canonical; unlimited on every tier | Pickers show user labels; models learn canonical ids | P0 | S | E08.1 | CA-1 |
| E08.3 | Merge and archive with migration (transactions, rules, recurring, watchlists, baselines), preview counts, 30-day reversal via events | No category delete with transactions | P0 | M | E08.2, E10.3 | CA-2 |
| E08.4 | Hide category / "Transazione privata" honoured by every surface (summaries, insights, exports to third parties, support views) | Test asserts no insight references a hidden/quiet category | P0 | S | E08.1, E15.1 | CA-3 |

### E09 Categorisation pipeline — P0 (T0–T4), P1 (T5), XL

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E09.1 | Resolution orchestrator implementing the precedence order with per-tier abstention, provenance (`source_tier`, `score`, `threshold_version`, candidates) and Needs Review as the terminal fallback | Order per AC-1; null preferred over wrong | P0 | M | E07, E08, E11.1 | AC-1 |
| E09.2 | T0 system rules for structural kinds (fees, interest, stamp duty, ATM, card settlement, F24/PagoPA, internal transfer) | Deterministic category + kind; fixtures | P0 | S | E07.2 | AC-1 (7) |
| E09.3 | T1 per-user merchant map (learned deterministic preference) and global merchant→category dictionary | Conflicting corrections demote to model tiers | P0 | S | E07.3, E10.1 | AC-1 (2), (4) |
| E09.4 | T2/T3: per-user naive Bayes (≥ 20 labels across ≥ 2 categories; abstain on unknown vocabulary), global char n-gram linear model per locale, embeddings + kNN (global + per-user namespaces in pgvector) | Calibrated via E11.1; shadow-tested | P0 | L | E25.1, E11.1 | AC-1 (3), (4) |
| E09.5 | T4 small LLM behind P-AI: batched 25–50 items, closed-enum JSON schema of canonical ids, cached stable taxonomy prefix only when endpoint/size/reuse makes it economical; never pad merely to hit a cache floor, hints + top-3 candidates, pseudonymised payload, injection hardening, vendor port with two switchable vendors (EU residency, zero retention) | Injection suite asserts label stability; financial strings and learned labels cached tenant/profile scoped; public merchant metadata may share a country cache | P0 | L | E09.4, E18.4 (P-AI toggle) | AC-2, AC-3 |
| E09.6 | "Why" rendering for every category from provenance, confidence in words, "Categoria suggerita dall'AI" label for model-sourced rows | No LLM needed to render; Art. 50 posture | P0 | S | E09.1 | AC-4 |
| E09.7 | T5 frontier model routing for the residual (abstain or disagreement + material amount; ≤ 5% of rows) | Routing share alert | P1 | S | E09.5 | AC-1 (5) |
| E09.8 | Onboarding backfill through Batch APIs with 1-hour cache; LLM-call decay tracked per cohort | Alert at > 300 calls per 1,000 tx | P0 | S | E09.5 | AC-3, AC-5 |

### E10 Feedback, rules & learning — P0, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E10.1 | Feedback service: the ten feedback types write `ledger_event` (actor user), lock fields, update merchant map and per-user index, and are undoable; automation skips locked fields | Lock semantics per Sure precedent (`AI` §2.8) | P0 | M | E06.1, E09.3 | FB-1 |
| E10.2 | One-tap rule proposal after the first correction/rename ("Sì, sempre" / "Solo questa volta"), ambiguous-merchant guard, retroactive apply with preview | Rule visible in Regole with source | P0 | M | E10.1, E10.3 | FB-2 |
| E10.3 | Rules engine: conditions (merchant, description, amount range, account, kind, direction, IBAN hash), actions (category, rename, tag, transfer, reimbursable, split, route to inbox, ignore), stages pre/default/post, versioned execution events | Never deletes, never moves money | P0 | L | E06.1 | FB-3 |
| E10.4 | Pseudonymised aggregate eval/retraining feed from corrections (opt-out in settings; amounts removed; quiet set excluded) | DPO-reviewed schema | P0 | S | E10.1, E25.1 | FB-4 |
| E10.5 | Cold-start readiness indicator ("Lilleri sta imparando: N conferme") | Disappears when the per-user model is ready | P1 | S | E09.4 | FB-5 |

### E11 Calibration & automation policy — P0 (CONTROL, BALANCED), P1 (AUTOPILOT), L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E11.1 | Calibration service per tier (Platt → isotonic; kNN sigmoid; LLM agreement features) with reliability diagrams, ECE and Brier reported weekly | Rules = 1.0 by construction | P0 | M | E25.1 | CF-1 |
| E11.2 | `automation_policy` versioned config: `θ(d, mode)` chosen for target auto-error ε (0.5% / 2% / 4%), weekly re-fit, shadow promotion, rollback by version, decision stamping | No literal thresholds in code (lint) | P0 | M | E11.1, E00.3 | CF-2 |
| E11.3 | Modes CONTROL and BALANCED (default) with mode-independent invariants enforced by tests; per-user θ adjustment on override rate; mode switch in Settings | Italian labels behind a copy flag for testing | P0 | M | E11.2, E12.1 | CF-3 |
| E11.4 | AUTOPILOT mode with the weekly "Fatto da solo" digest and per-item undo; suggested after ≥ 30 reviews with low override | Digest lists every auto decision | P1 | M | E11.3, E17.1 | CF-3 |
| E11.5 | Shadow mode for new tiers/models/thresholds with divergence logging and metric-gated promotion | `categorization_shadow_rate` config | P0 | S | E09.1 | CF-4 |

### E12 Review Inbox — P0, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E12.1 | Inbox item model and routing (item types per RI-1; ordering by money at stake then recency; nothing above threshold enters; no upsell) | ≤3 is a prototype UX hypothesis, never hide ambiguity to meet it | P0 | M | E09.1, E13, E11.2 | RI-1 |
| E12.2 | Card UI with belief, confidence in words, evidence sentence, top alternatives; actions ✓ / categoria / trasferimento / dividi / duplicato / rimborso / ignora; swipe gestures; session undo stack | 90% of resolutions in ≤ 2 interactions (HYPOTHESIS, measured) | P0 | L | E12.1, E10.1 | RI-2 |
| E12.3 | "Applica a tutti i simili" for ≥ 2 pending items sharing a merchant | Creates one rule, resolves all | P0 | S | E12.2, E10.2 | RI-2 |
| E12.4 | Empty state "Niente da fare. Tutto è al suo posto." with freshness line; home badge | No animations | P0 | S | E12.2 | RI-3 |
| E12.5 | Offline queued decisions with "user wins" conflict rule and visible queue count | Applies on reconnection | P1 | M | E20.2 | RI-4 |

### E13 Reconciliation engine (core) — P0, XL

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E13.1 | PENDING → BOOKED state machine with provider link, exact, and tolerance stages; edits carried; EXPIRED_HOLD, CANCELLED, REVERSED paths | Scenarios 1–3 pass | P0 | L | E03.4 | RE-1 |
| E13.2 | Duplicate stages EXACT_ID / FINGERPRINT / FUZZY_WINDOW with negative memory and no hard deletes | Scenarios 4–7 pass; a deleted duplicate never respawns | P0 | M | E03.3 | RE-2 |
| E13.3 | TRANSFER_PAIR: candidate generation, evidence features (own-IBAN hash registry, endToEndId, provider hints, keywords, bank codes), auto-pair above θ, inbox below, single-leg own-IBAN recognition, wallet top-ups, undo with rejection memory, "never invent a leg" test | Scenarios 8–9 pass; both legs hidden from spend/income | P0 | L | E07.2, E11.2, E12.1 | RE-3 |
| E13.4 | CARD_SETTLEMENT typing and exclusion from spend (bank-side descriptors, CBI 45), "addebito carta — dettaglio non collegato" state | Scenario 10 (typing part) passes | P0 | S | E07.4 | RE-4 (1) |
| E13.5 | Provider deletion / reversal handling: booked user-edited row → NEEDS_REVIEW; CNCL/RJCT → reversed with link; descriptor-based reversal proposed | Scenario 23 passes | P0 | S | E03.5, E12.1 | RE-9 |
| E13.6 | Evidence records on every link and decision, Italian sentence renderer, per-`sync_run` batch undo | Every automated link reversible until user-confirmed | P0 | M | E06.1 | RE-10 |
| E13.7 | The 25 reconciliation fixture scenarios as CI acceptance tests (incl. DST dates, month boundary, overdraft, retry) | All green before M1 | P0 | M | E25.2 | RE-10 |

### E14 Recurring & subscriptions — P0 (detection), P1 (alerts), L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E14.1 | Recurring engine: grouping keys (merchant / SDD creditor id / mandate), periodicity classes with tolerances, ≥ 3 occurrences rule (2 for semiannual/annual with amount or mandate match), the five types, Tink-shaped statistics, exclusions (settlements, transfers) | Scenarios 14–15 pass; false-regular < 2% target | P0 | L | E07.4, E13.3 | RS-1 |
| E14.2 | Subscriptions and bills list with next 60 days, notice-period text, mark/unmark and period change feedback | Copy per RS-2 | P0 | M | E14.1, E10.1 | RS-2 |
| E14.3 | Alerts: price change, expected-but-missing, duplicate SDD, as inbox cards with individual toggles | Informational wording, never AML | P1 | M | E14.1, E12.1, E17.1 | RS-3 |

### E15 Insights & summaries — P0 (monthly), P1 (weekly), M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E15.1 | Insight object (`inputs`, `calculation`, `value`, `is_estimate`, `confidence`, `explanation_it`) and the "never estimates as facts" copy rules; quiet-set exclusion test | One tap opens the underlying rows | P0 | M | E08.4, E13 | IN-2 |
| E15.2 | Monthly "Cosa è successo" summary card and optional push | Reconciled data only | P0 | S | E15.1, E14.1 | IN-1 |
| E15.3 | Weekly digest with ≤ 3 variances vs own 3-month median and ≤ 3 observations | Opt-out; quiet hours | P1 | M | E15.1, E17.1 | IN-3 |

### E16 Safe-to-spend & watchlists — P0 (number), P1 (watchlists), M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E16.1 | "Puoi ancora spendere X € fino al [data]" with visible formula, horizon = next salary date or month end, account inclusion flags, "circa" for variable items | Recalculated after every sync | P0 | M | E13, E14.1 | BU-1 |
| E16.2 | Category watchlists (category + monthly amount) in the summary | No mandatory budgets | P1 | S | E16.1, E08.2 | BU-2 |

### E17 Notifications — P0, M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E17.1 | Service push types (inbox non-empty batched, consent 170/178, mismatch, expired/paused, summary ready) without payload; quiet hours; per-type toggles; in-context OS permission ask | "Hai 3 movimenti da rivedere"; no amounts in push | P0 | M | E02.8, E12.1 | NO-1 |
| E17.2 | Marketing consent (`C-MARKETING`) as a separate, off-by-default toggle and suppression list | Never mixed with service push | P1 | S | E18.4 | NO-1 |

### E18 Privacy dashboard, export, deletion, retention — P0, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E18.1 | "I tuoi dati" page (connections with provider entity, what we hold and why, who sees what, no data sale, shutdown promise, legal requests, DPO, Garante link) | Reading-level reviewed; copy anchor per PR-1 | P0 | M | E02.7 | PR-1 |
| E18.2 | Export ZIP (transactions.csv, links.csv, accounts.json, rules.json, categories.json, consents.json, events.jsonl, JSON Schema) in minutes, in-app and expiring link, every tier | Schema documented | P0 | M | E06.1 | PR-2 |
| E18.3 | Per-connection and per-source deletion with "Conserva lo storico" / "Elimina tutto"; account deletion backend (crypto-shredding, vendor confirmations, carve-outs, deletion certificate, deletion-log replay on restore) | Per `DR` §5 | P0 | L | E24.2, E02.6 | PR-3 |
| E18.4 | "Permessi e privacy": P-AI, N-SERVICE, C-ANALYTICS, (C-MARKETING, C-EMAIL later) toggles with text versions; hide categories; "Transazione privata"; "Disattiva categorizzazione automatica" (rules-only mode); 6-month re-ask suppression | Every toggle writes a consent event | P0 | M | E02.6, E08.4 | PR-4 |
| E18.5 | Retention jobs as configuration (class-specific durations from current `docs/compliance/data-retention.md`; no raw-to-cold workaround or duplicated policy literal) with "expired vs deleted" metrics | Jobs scheduled; owners named | P0 | M | E00.3, E24.2 | PR-5 |
| E18.6 | Third-party-AI permission screen (P-AI) in first-run after the first connection, symmetric buttons, consequence stated; "Non ora" keeps the product fully usable | Apple 5.1.2(i) / Play User Data copy | P0 | S | E18.4, E09.5 | AC-2 |

### E19 Settings — P0, M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E19.1 | Settings IA per SE-1 (Account, Collegamenti, Conti, Categorie, Regole, Automazione, Abbonamenti e ricorrenti, Notifiche, Permessi e privacy, I tuoi dati, Piano, Lingua e formato, Accessibilità, Esporta, Assistenza) | No setting exposes thresholds, tiers or model names | P0 | M | E01–E18 | SE-1 |
| E19.2 | Automazione section: mode switch, new-merchant amount threshold, retroactive-rule default | Mode change audited | P0 | S | E11.3 | SE-1 |

### E20 Offline cache & queued actions — P0 (read), P1 (writes), M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E20.1 | Encrypted on-device cache of the last 90 days (transactions, balances, inbox, summary); read-only offline browsing; last synced balance with timestamp | No recomputation from partial data | P0 | M | E06.2 | DG-2 |
| E20.2 | Queued writes (inbox decisions, manual entries) with "user wins" conflict rule | Queue count shown | P1 | M | E20.1, E12.2 | DG-2, RI-4 |

### E21 i18n & number formatting — P0, M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E21.1 | ICU message catalogue with it-IT master, English UI, English term glossary, locale-correct number table (it-IT `1.234,56 €`, Unicode minus, tabular figures), date formats; copy lint (no exclamation marks, banned words) | Glossary reviewed by brand | P0 | M | E00.1 | I18N-1 |
| E21.2 | Category labels localised per canonical id with per-locale tables | Taxonomy version-aware | P0 | S | E08.1, E21.1 | I18N-1 |
| E21.3 | es/fr/de UI and per-market trust surfaces | — | Later | L | E21.1, market entry | I18N-1 |

### E22 Accessibility — P0 (build), P1 (audit), M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E22.1 | WCAG 2.1 AA build: dynamic type to 200%, contrast, status never colour-only, screen-reader labels for amounts (sign + currency), 44 pt targets, reduced motion, focus order on web | Component library checks in CI | P0 | M | E06.2, E12.2 | A11Y-1 |
| E22.2 | External accessibility audit, statement and feedback channel | No blocking issues before launch | P1 | S | E22.1 | A11Y-1 |

### E23 Entitlements & paywall — P0 (entitlements), P1 (trial, paywall), L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E23.1 | Pure capability entitlements, stable IDs and Gratis/Plus mappings; never-gated list tested incl. expiry | Beta entitlement with no charges; Later features off; no billing SDK needed | P0 | M | E01, commercial policy | PW-1 |
| E23.2 | Proposed 30-day non-renewing Plus preview (30 vs 34 test), start/end notices and post-preview source choice | No card/purchase or autocharge; retained data accessible/exportable; all-free beta not paid trial | P1 | M | E23.1, E17.1 | PW-2 |
| E23.3 | Contextual paywall only at delivered benefits; VAT total/period/annual charge, consumer info, channel-specific cancellation/restore/refund | No inbox/error/consent/export/deletion/distress prompts; no lifetime price promise | P1 | M | E23.1, counsel/store terms | PW-3 |
| E23.4 | Free AIS/active paid subscription ≤€0.95; explicit zero-denominator and shadow beta cost; funded new-cohort F′ review after two misses | No invented paid conversion or automatic unfunded grandfathering | P1 | S | E23.1, E00.4, actual invoices | PW-4 |
| E23.5 | Explicit purchase checkout, receipt/webhook validation, restore/grace/cancel/refund/renewal with platform/tax/legal gates | Duplicate/out-of-order receipt events tested; downgrade preserves safety/data rights | P1 before any charge | L | E23.1, provider/store terms | PW-5 |

### E24 Security hardening — P0, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E24.1 | Threat model (STRIDE) and security architecture doc; dependency and secret scanning in CI; MASVS L1 checklist | Reviewed before M1 | P0 | M | E00 | §6 |
| E24.2 | Encryption classes E1–E4: per-user DEK envelope encryption (AES-256-GCM, AAD = table/column/row), KMS-wrapped keys, blind indexes (HMAC) for IBAN equality, tokenised account identifiers, secrets in a secret manager | Crypto-shredding verified by test | P0 | L | E00.2 | XD-3 |
| E24.3 | Break-glass access with dual approval, ticket reference, expiry and audit; support masked views with user-granted time-boxed access | Audit events immutable | P0 | M | E24.2 | `PM` §3.2 |
| E24.4 | Incident runbook (processor ≤ 24 h contractual, Garante ≤ 72 h, users ≤ 72 h after filing), vendor register, DPA checklist | Tabletop before M1 | P0 | S | — | `PM` §11; `REG` D8 |
| E24.5 | External penetration test; MASVS L2 for data storage; restore drill with deletion-log replay | Critical/high closed before launch | P1 | M | E24.2, E18.3 | §6 |

### E25 Evaluation & quality infrastructure — P0, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E25.1 | Labelled Italian eval set v1 (3,000–5,000 rows; stratified by bank/kind/merchant frequency; ≥ 30 per leaf; double annotation; null/abstain, injection, pending/booked, settlement subsets; frozen test split) seeded from Banana fixtures, CBI table and consented M0/M1 data (pseudonymised) | Versioned; never trained on the test split | P0 | L | E07.1, E10.4 | XD-5 |
| E25.2 | Reconciliation fixtures: the 25 scenarios as data + expected outcomes; DST and month-boundary cases | Used by E13.7 | P0 | M | — | XD-5 |
| E25.3 | Evaluation runner: per-category precision/recall/F1, hierarchical credit, auto-rate / auto-error / review-rate per decision type and tier, cost per 1,000, latency, schema-failure rate, calibration plots; weekly drift run per bank | Dashboards in E00.4 | P0 | M | E25.1, E11.1 | §6 |
| E25.4 | Weekly 200-row consented live audit workflow with double annotation and adjudication | Audit results feed S5–S7 | P0 | S | E25.3 | `mvp.md` §5 |
| E25.5 | Prompt-injection and quiet-set guardrail test suites (Italian and English payloads) | Label stability asserted; no insight references the quiet set | P0 | S | E09.5, E15.1 | AC-3, CA-3 |

### E26 Coverage, health page & status — P0 (in-app), P1 (public), M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E26.1 | Coverage configuration per institution and account type with Italian statements (feeds the picker and the trust page) | Updated from RFP CSV and pilot results | P0 | S | E02.1 | CO-2 |
| E26.2 | Public connector-health and status page in Italian with per-bank incidents and last-success times; link from degraded states | Automated incident detection at scale (production NFR) | P1 | M | E04.1, E26.1 | §6 |

### E27 Second provider adapter & failover — P1, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends |
|---|---|---|---|---|---|
| E27.1 | Second adapter live (the non-primary of Yapily / Enable Banking, or Tink/Fabrick if promoted), passing contract tests, with per-institution provider selection in configuration | Same canonical schema; consent re-collection flow documented | P1 | L | E02.1, RFP outcome |
| E27.2 | Failover policy per institution (health-based) and dual-consent handling copy | No duplicate transactions across providers (fingerprint) | P1 | M | E27.1, E13.2 |

### E28 Extended reconciliation — P1, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E28.1 | REFUND_OF matching (same merchant, amount ≤ original, ≤ 90 days; partial and cumulative; inherited category; period setting) | Scenario 11 passes | P1 | M | E13.6, E12.2 | RE-5 |
| E28.2 | SPLIT (parent/children, sums enforced, rule-driven % or €, review on parent amount change) | Scenario 12 passes | P1 | M | E10.3 | RE-6 |
| E28.3 | CASH_WITHDRAWAL → cash wallet transfer pair, one-tap cash spend, "contanti non tracciati" | Scenario 25 passes | P1 | S | E13.3, E05.4 | RE-7 |
| E28.4 | CARD_SETTLEMENT statement-period link (sliding window + bounded subset-sum; learned settlement day; retroactive link on later import; "addebito carta non spiegato" queue) | Scenario 10 (link part) passes | P1 | L | E13.4, E05.2 | RE-4 (2)–(5) |

### E29 Recurring alerts & weekly digest — P1, M

Covered by E14.3 and E15.3; listed as an epic for sequencing.

### E30 Web client — P1/P2, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends |
|---|---|---|---|---|---|
| E30.1 | Web import/export (drag-and-drop CSV/XLSX, export download) behind the same auth | Same dedup as mobile | P1 | M | E05.1, E18.2 |
| E30.2 | Read-only web ledger and inbox (decision pending interviews) | Parity of copy and a11y | P2 | L | E30.1 |

### E31 Receipt photo attach — P2, S

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E31.1 | Attach a receipt photo (picker/camera, no extraction), E3 storage, 90-day deletion unless pinned, match by amount/date/merchant | No third-party AI involved | P2 | S | E06.3, E18.5 | RC-1 |

### E32 Reimbursable flag & reimbursement proposals — P2, M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E32.1 | "Rimborsabile" flag, "in attesa di rimborso" ledger, REIMBURSEMENT_OF proposals (never auto) against person credits | Scenario 13 passes (proposal part) | P2 | M | E13.6, E12.2 | RE-8 |

### E33 Household (Lilleri Famiglia) — Later, XL

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E33.1 | Invitations, profiles, private-by-default sharing per account or tag | RLS per profile | Later | L | E06.1 (HH-0), E23.1 | HH-1 |
| E33.2 | Joint-account recognition across two consents; contributions typed as transfers | Pairing across two users' connections | Later | L | E13.3, E33.1 | HH-1 |
| E33.3 | Shared tags with split rules; settle-up suggestions matched to real repayment transfers; inbox assignment | Splitwise-like shares model | Later | L | E32.1, E12.1 | HH-1 |
| E33.4 | Leave household: immediate removal of shared visibility; per-person export | GDPR-driven | Later | S | E18.2 | HH-1 |

### E34 Financial chat over deterministic tools — Later, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E34.1 | Read-only tool layer (`ledger.aggregate`, `ledger.search`, `recurring.list`, `insight.get`, `safe_to_spend.get`) with scope and audit | No write tools exist | Later | M | E15.1, E16.1 | CH-1 |
| E34.2 | Chat UI with Art. 50 disclosure, P-AI gate, "Perché?" citations to tool results, `is_estimate` marking, deletable history | Model never computes money | Later | M | E34.1, E18.6 | CH-1 |
| E34.3 | Guardrails: quiet set, MiFID instrument ban, no offers, injection posture; red-team suite | Suite in CI | Later | S | E34.2, E25.5 | CH-1 |

### E35 Receipt OCR & e-mail ingestion — Later, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends | PRD |
|---|---|---|---|---|---|---|
| E35.1 | 200-receipt Italian benchmark (2 LLMs + 1 parser), EU-hosted vendor under DPA, line-item split | Vendor chosen by accuracy and privacy, not cost | Later | M | E31.1, E28.2 | RC-2 |
| E35.2 | Forward-to-inbox alias with discard-on-arrival for non-receipts, 30-day raw retention, `C-EMAIL` consent | No restricted OAuth scopes | Later | M | E35.1, E18.4 | RC-3 |
| E35.3 | Gmail OAuth + CASA (only if demand proven); Outlook.com Mail.Read | Budget and lead time approved | Later | L | E35.2 | RC-3 |

### E36 Android notification-access experiment — Later, M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends |
|---|---|---|---|---|---|
| E36.1 | Opt-in listener with package allow-list, on-device parsing, no raw text off-device, prominent disclosure, kill-switch; Play April/July 2026 policy bundles read first | Instrumented experiment | Later | M | `DSF` §6 decision |

### E37 Offers rail — Later, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends |
|---|---|---|---|---|---|
| E37.1 | Separate "Offerte" tab, off by default, separate revocable consent, labelled compensation, no interference with correctness, kill switch on NPS delta | Counsel on art. 67(2)(f) and OAM/IVASS boundaries first | Later | L | trust metrics, counsel |

### E38 Partita IVA scope — Later, L

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends |
|---|---|---|---|---|---|
| E38.1 | Business/personal scope on transactions and rules, F24/INPS semantics, accountant export | Interviews with commercialisti first | Later | L | HH-0 scope attribute |

### E39 Investments / crypto import — Later, M

| ID | Story | Acceptance criteria (abbrev.) | Priority | Size | Depends |
|---|---|---|---|---|---|
| E39.1 | Manual balances → CSV (Degiro, Directa, Trade Republic documents) → read-only exchange keys (KMS, withdrawal-disabled) → Directa API | Never unofficial APIs | Later | M | E05.1 |

---

## 3. Suggested sequencing (dependency-driven; DECISION proposed)

| Wave | Goal | Epics / stories | Exit |
|---|---|---|---|
| **W0 Foundations** | Build once, correctly | E00 (all), E01.1–E01.3, E24.1–E24.2, E24.4, E21.1, E25.2, E06.1 | Schema with RLS and DEKs; CI with fixtures; config service |
| **W1 Local walking skeleton** | Synthetic exact-money/mock core loop | Money, mock adapter, validation/idempotency, deterministic classification/rules and conservative reconciliation, evidence/review/undo; extend fixtures only with implemented behaviour | Actual local commands and cases pass; no live coverage/auth/mobile/store/security pass inferred |
| **W2 Official sandbox → cleared pilot/beta** | Selected provider contract tests, then future P0 hardening | Provider credentials/permission, written licence route, contract, DPIA/privacy/security isolation and informed participants before real access; start ≤50, then≤200 | Official sandbox contracts plus real-data audit/coverage evidence after gates; not free-beta purchase conversion |
| **W3 Cleared beta hardening → release review** | P1 as measured need requires, then launch criteria | `mvp.md` future beta P0 and release criteria, measured correctness/support/UX; E23.2–E23.5 before purchases | Public launch only after legal/provider/security/stores/consumer/funded-economics review; no calendar promise |
| **W4 First expansion** | P2 | E31, E32, E30.2, E07.6 | Post-launch |
| **Later** | Roadmap | E33–E39, E21.3 | Separate decisions |

Critical path (HYPOTHESIS): provider adapter → identity/ingestion → reconciliation core → inbox → calibration; the eval set (E25.1) must exist before thresholds (E11.2) are anything but provisional. External dependencies that can stall the path: provider contract (gates G1–G4), counsel on route A and taxonomy, DPIA.

---

## 4. The "not now" list (with reasons)

| # | Not now | Status | Reason (evidence) | Revisit when |
|---|---|---|---|---|
| 1 | Money movement (round-ups, auto-saves, agents, payment initiation) | Never | "Cursed" round-ups (`IT-Y-01`); Cleo FTC, Rocket unauthorised actions (`EU-S-45`, `US-S77`); trust is priority 1 | Never |
| 2 | Bill negotiation / cancellation concierge with success fees | Never | Collapsed Rocket's Trustpilot (`US-§6.1`) | Never |
| 3 | Lending, cash advance, credit score, insurance brokerage, investment advice | Never | Fintonic/Cleo pivots; OAM/IVASS/MiFID reservations (`REG` §4.6) | Never |
| 4 | Display or contextual ads; data sale | Never | Mint precedent; Snoop's data sale as the opposite model (`BM` D-BM-4) | Never |
| 5 | Screen scraping, credential storage, SMS reading, accessibility scraping, unofficial APIs, Amazon scraping | Never | Illegal / policy-hostile (`DSF` §12) | Never |
| 6 | Zero-based envelope budgeting method; mandatory budgets for every category | Not now (likely never) | YNAB learning curve is a churn driver (`US-S13`); safe-to-spend + watchlists cover the job | Only if interviews show demand among retained users |
| 7 | Investment analytics / portfolio tooling | Later at most | Over-built; FIDA not in force; Italians use Getquin (`IT-Y-03`) | FIDA application (≥ 2028) |
| 8 | Receipt OCR, line-item split, e-mail ingestion | Later | Cost and surface before the core is trusted; CASA for Gmail (`DSF` §5, §12) | Demand test via forward-to-inbox |
| 9 | Chat assistant | Later | Users want output, not prompts (`IT-Y-02`); needs deterministic tools and Art. 50/MiFID guardrails | After insights are trusted |
| 10 | Household features | Later (first expansion) | Needs two-consent pairing proven; private-by-default model to validate (`PE` Q4) | After M3 |
| 11 | Manual split groups for trips/roommates | Not now | Tricount is free, Splitwise entrenched (`IT-§4`); splits attach to real transactions later | With household |
| 12 | Multi-currency UX beyond EUR | Not now | Italy-first; data model stays currency-aware (`OM` §4.12) | Second market |
| 13 | Partita IVA features | Later | Adjacent to business banking; data model reserved (`PE` PD-2) | After household |
| 14 | Full web-app parity at launch | Open question | Mobile proves the loop; web best for files (`DSF` §3); S1 demand UNKNOWN (`OM` Q9) | Interviews before M3 |
| 15 | Unlimited household members | Later | Couples first (`IT-Y-05`) | With household |
| 16 | Goals/pots with interest, savings accounts | Not now | Requires a banking partner; not a PFM job (`OM` §4.16) | Partnership decision |
| 17 | Mascots, gamification, confetti, "AI/smart/boost" vocabulary | Never | Brand anti-patterns (`BS` §10) | Never |
| 18 | Lifetime deals, pay-what-you-want sliders, daily caps, 7-day or card-up-front trials | Never | Each a documented complaint (`OM` §4.10) | Never |
| 19 | Frontier LLM on every row; vendor enrichment on full volume | Not now | Cost and privacy; own cascade resolves 75–85% (`AI` §7.2 ASSUMPTION) | Residual measured |
| 20 | Android notification listener | Later (experiment) | Policy risk; Play 2026 bundles unread (`DSF` §6) | After launch |
| 21 | Own AISP registration / direct CBI Globe | Phase 2+ | 6–12 months; fixed cost; decided on AIS spend ≈ €15k/month (`CA` D-CA-5) | Gate C |
| 22 | Offers rail, cashback, switching | Later (Later monetisation stage) | Only after trust metrics; counsel on art. 67(2)(f) (`BM` D-BM-4) | Beta trust metrics |
| 23 | Accuracy claims in marketing | Never before measurement | `BS` D6 | Measured S6/S7 at Base |
| 24 | AUTOPILOT as default | Not now | Needs measured override rates (`vision.md` §7) | ≥ 200 users with ≥ 30 reviews |
| 25 | Logos via third-party hot-linking | Never | Brandfetch per-customer cap; privacy | — (cache instead) |

---

## Decisions / Recommendations

| ID | Decision / recommendation | Label | Needs ADR? |
|---|---|---|---|
| BL-1 | Epic structure E00–E39 and the P0 story set are the build plan for the MVP; sizes are relative and re-estimated at sprint planning | DECISION (sizes ASSUMPTION) | No |
| BL-2 | Sequencing W0–W4 is dependency-driven; the critical path runs adapter → identity → reconciliation → inbox → calibration, with the eval set before thresholds | DECISION | No |
| BL-3 | XL epics (E02, E03, E09, E13) are split into their stories before entering a sprint; no XL story is scheduled whole | DECISION | No |
| BL-4 | The "not now" list is binding; additions to the MVP require a written exception citing `mvp.md` §1 | DECISION | No |
| BL-5 | External dependencies (provider gates G1–G4, counsel on route A and taxonomy, DPIA) are tracked as blocking items on W1/W2 with named owners | DECISION | No |
| BL-R1 | Build synthetic mock and relevant fixtures first; official sandbox next; never activate restricted production without legal/provider/privacy/security clearance | RECOMMENDATION | — |
| BL-R2 | Re-estimate E13.3 (transfer pairing) and E09.4 (per-user models) after the M0 fill-rate report; both depend on what Italian banks actually return | RECOMMENDATION | — |

## Open questions

| # | Question | Affects | How to resolve | Priority |
|---|---|---|---|---|
| 1 | Which adapter is primary at M1 (Yapily on contract vs Enable Banking promoted)? | E02.3, E27 | RFP gates G1–G4 | P0 |
| 2 | Per-bank fill-rates and pending availability | E03.2, E13.1, E13.3 sizing | M0 pilot | P0 |
| 3 | Counsel sign-off on the taxonomy labels (Art. 9) | E08.1 | Counsel + DPIA | P0 |
| 4 | Observed WTP and capability mapping for canonical Gratis/Plus; Famiglia Later, Pro reserved | E23 | Price/bundle research; names resolved | P1 |
| 5 | Is a web import/export client needed before launch (E30.1 P1 vs P2)? | E30 | Interviews | P1 |
| 6 | Do refunds/cash/splits need to move into M2 (inbox telemetry > 5% of items)? | E28 | M1 telemetry | P1 |
| 7 | Trial length 30 vs 34 days | E23.2 | A/B | P1 |
| 8 | Which Italian descriptors cover 80% of S1 transactions (seed size for E07.4)? | E07 | Consented frequency analysis | P1 |
| 9 | Settlement conventions per card issuer for E28.4 | E28.4 | Design-partner statements | P1 |
| 10 | Engineering capacity and team size for W1–W3 (sizes assume a 3–5 engineer team) | Sequencing | Hiring plan vs `CA` fixed-cost ceilings | P1 |

## Review log

| Reviewer | Concrete issue | Resolution |
|---|---|---|
| PM/CTO (major) | First walking skeleton required founders’ real data and almost all epics at once | Added explicit local synthetic slice, official sandbox, cleared pilot progression |
| Fintech/legal (blocker) | Adapter tasks assumed restricted-production permission and universal 180-day consent | Real adapter is gated; provider-derived expiry and verified coverage |
| PM/CFO (major) | P0 E23.1 included store billing while beta was free | Domain entitlements P0; purchase integration separate P1 E23.5; non-renewing preview |
| Brand/consumer (major) | Tier count, lifetime grandfathering and trial charge rules stayed unresolved | Gratis/Plus mapping and transparent channel-specific rights; no lifetime/store autocharge promise |

## Sources

All verified on 2026-10-02 by the input documents named; URLs carried over verbatim.

| ID | Source | URL / path | Used for |
|---|---|---|---|
| PRD / MVP / VISION | `docs/product/prd.md`; `mvp.md`; `vision.md` | repo | Story definitions, scope rule, principles |
| RC | `docs/research/raw/reconciliation-and-data-model-patterns.md` | repo | Identity strategy, match types, fixtures (§9), RLS (§6), money/dates (§3) |
| AI | `docs/research/raw/ai-ml-transaction-intelligence.md` | repo | Cascade tiers, calibration, locks, injection posture, eval set, Italian patterns |
| OBP | `docs/research/open-banking-providers.md` | repo | Provider decision and gates; restricted production; coverage |
| DSF | `docs/research/data-sources-feasibility.md` | repo | Import formats; never list; e-mail/receipt/notification sequencing |
| OM / PP / MA | `docs/research/opportunity-map.md`; `user-pain-points.md`; `market-analysis.md` | repo | Not-now reasons; pain-point anchors |
| PE / JTBD | `docs/product/personas.md`; `jobs-to-be-done.md` | repo | Persona priorities; loop stages |
| REG / PM / CM / DR | `docs/compliance/*.md` | repo | Consent events, retention jobs, deletion flow, store rules, DPIA |
| BM / UE / CA | `docs/business/*.md` | repo | Entitlements, free envelope, cost alerts, fixed-cost ceilings |
| BS | `docs/brand/brand-strategy.md` | repo | Copy rules, anti-patterns, no claims before measurement |
| Actual Budget sources | `sync.ts`, `find-schedules.ts`, `rules.ts`; issues #1628, #669 | https://raw.githubusercontent.com/actualbudget/actual/master/packages/loot-core/src/server/accounts/sync.ts ; https://raw.githubusercontent.com/actualbudget/actual/master/packages/loot-core/src/server/schedules/find-schedules.ts ; https://raw.githubusercontent.com/actualbudget/actual/master/packages/loot-core/src/shared/rules.ts ; https://github.com/actualbudget/actual/issues/1628 ; https://github.com/actualbudget/actual/issues/669 | Reconciliation and rules precedents; wedge evidence |
| Sure / Maybe | `bayes_categorizer.rb`, `auto_categorizer.rb`, locked attributes; `RejectedTransfer` | https://github.com/we-promise/sure ; https://github.com/maybe-finance/maybe | Learning and negative-memory precedents (AGPL: study only) |
| Banana / CBI | Italian import fixtures; CBI causali | https://github.com/BananaAccounting/Italia ; https://github.com/fab128k/da-pdf-a-csv | Fixtures and dictionary seeds |
| Provider docs | Enable Banking FAQ and Italy page; Yapily restrictions and consents; Salt Edge v6; TrueLayer transaction reference; Plaid pending→posted; Tink webhooks | https://enablebanking.com/docs/faq ; https://enablebanking.com/docs/markets/it/ ; https://docs.yapily.com/pages/data/financial-data-resources/data-restrictions/ ; https://docs.yapily.com/data/financial-data-resources/financial-data-consents ; https://docs.saltedge.com/v6/api_reference ; https://docs.truelayer.com/docs/transaction-data-reference ; https://plaid.com/docs/transactions/transactions-data/ ; https://docs.tink.com/resources/transactions/webhooks-for-transactions | Adapter and identity requirements |
| Law / stores | RTS 2018/389; Delegated Reg. 2022/2360; EBA Q&A 2019_4631; Apple App Review Guidelines; Google Play User Data policy | https://eur-lex.europa.eu/eli/reg_del/2018/389/oj ; https://eur-lex.europa.eu/eli/reg_del/2022/2360/oj ; https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2019_4631 ; https://developer.apple.com/app-store/review/guidelines/ ; https://support.google.com/googleplay/android-developer/answer/10144311?hl=en | Refresh budget, consent cadence, store plumbing |
| LLM platform | Anthropic prompt caching / batch / structured outputs / injection guidance; OWASP LLM01 | https://platform.claude.com/docs/en/build-with-claude/prompt-caching ; https://platform.claude.com/docs/en/build-with-claude/batch-processing ; https://platform.claude.com/docs/en/build-with-claude/structured-outputs ; https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks ; https://raw.githubusercontent.com/OWASP/www-project-top-10-for-large-language-model-applications/main/2_0_vulns/LLM01_PromptInjection.md | E09.5, E09.8, E25.5 |
| Creators / market | IT-Y-01, IT-Y-02, IT-Y-03, IT-Y-05; Satispay Budget | https://www.youtube.com/watch?v=zwCFwhEIV3I ; https://www.youtube.com/watch?v=kJNxDIcJOac ; https://www.youtube.com/watch?v=J4bio_hsN08 ; https://www.youtube.com/watch?v=gLz7l24O0PA ; https://www.satispay.com/it-it/blog/guide-satispay/come-impostare-budget-satispay/ | Not-now reasons; safe-to-spend |
| Competitor patterns | Copilot Intelligence; Monarch transaction review; Cleo FTC settlement; Rocket Trustpilot; YNAB Penny Hoarder review | https://changelog.copilot.money/log/copilot-intelligence ; https://www.monarch.com/blog/transaction-review ; https://www.hunton.com/privacy-and-cybersecurity-law-blog/ftc-reaches-17-million-settlement-with-cash-advance-company-cleo-ai ; https://www.trustpilot.com/review/rocketmoney.com ; https://www.thepennyhoarder.com/budgeting/ynab-review/ | Not-now reasons; benchmarks |

End of document.
