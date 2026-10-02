# Privacy model — what Lilleri stores, why, on which basis, and how it protects it

**Project:** LILLERI (consumer PFM, Italy-first then Europe; unlicensed data recipient under a provider's AISP licence; AI categorisation)
**Date / verification date for every claim:** 2026-10-02
**Author:** Privacy/GDPR specialist + fintech compliance analyst, founding team
**Status of this document:** synthesis of Phase 0 research; input to the DPIA, the Art. 30 records, the privacy notice, `architecture/` (data model, encryption) and `security/`. Companion documents: `compliance/regulatory-landscape.md` (the law), `compliance/consent-model.md` (what we ask and when), `compliance/data-retention.md` (how long and how we delete), `compliance/legal-open-questions.md` (what counsel must confirm). **Not legal advice.**

## How to read this document

- Labels: **FACT** (cited source seen on the verification date), **ASSUMPTION** (working value, not verified), **HYPOTHESIS** (interpretation to validate), **DECISION** (proposed choice, to be recorded in an ADR), **OPEN QUESTION / UNKNOWN**.
- Evidence base: `docs/research/raw/regulatory-landscape.md` (**RL-§x**, sources **RL S-nn**), `non-bank-sources-and-os-limits.md` (**NB-§x**), `open-banking-providers-a.md` (**PA-§x**), `open-banking-providers-b.md` (**PB-§x**), plus the WebSearch results recorded as **NEW-n** in `regulatory-landscape.md` §8.2. Primary legal texts (GDPR, Codice privacy, EDPB 06/2020, Garante decisions) were **not** fetched in any session (hosts blocked); their content is cited from the raw notes' knowledge-level entries and must be re-read before the DPIA is signed.
- Retention periods appear here only as pointers; the authoritative schedule is `data-retention.md`.
- Product copy examples are in Italian; documentation is in English.

---

## 1. Executive summary

1. **Lilleri is an independent controller** for the PFM service; the licensed provider is a separate controller for the account-information service it performs under PSD2; cloud, LLM, OCR, e-mail-inbound, push and analytics vendors are processors. Joint controllership may exist for the shared consent-capture flow — the provider's DPA decides. FACT (EDPB 06/2020 logic) / ASSUMPTION (joint-controller allocation) (RL-§6.1).
2. **The core service runs on contract (Art. 6(1)(b)), not on GDPR consent.** PSD2 Art. 94(2) "explicit consent" is contractual (EDPB 06/2020). Consent is reserved for optional features (e-mail ingestion, marketing, personalised offers, analytics with identifiers, special-category features) so that withdrawal never breaks the contract and consent is freely given. FACT (RL-§6.1).
3. **The biggest design risk is Art. 9 inference** from transaction data (pharmacies, donations, union dues, party memberships, clinics, dating services). EDPB 06/2020 expects technical measures (filtering) to avoid processing special categories where not necessary, and the Garante is strict on inferred sensitive data and on AI (OpenAI €15M, Replika €5M). **Decision: Lilleri does not infer, label, profile, or let the AI chat volunteer anything in those classes; merchant-type labels stay neutral; users can hide any category; a future "donazioni detraibili" feature would be gated behind explicit, separately logged consent.** FACT (risk) / DECISION (mitigations) (RL-§6.2).
4. **A DPIA is mandatory** (WP248 criteria + Garante list Provv. 467/2018: large-scale evaluation/profiling, systematic monitoring, financial data, innovative tech/AI) and must be completed **before beta**. FACT (criteria) / DECISION (timing) (RL-§6.4).
5. **Encryption and access are tiered by data class** (E1–E4 below): raw provider payloads, account identifiers, receipts, e-mail bodies and AI prompt logs sit in the highest tiers with per-user keys (crypto-shredding on deletion) and no human access without break-glass. DECISION.
6. **Analytics carry semantic events only** — never descriptions, IBANs, amounts, counterparties or free text — and run without persistent identifiers unless the user consents; no advertising or tracking SDK. DECISION (Garante cookie guidelines 2021; Apple 5.1.1/5.1.2; Play User Data).
7. **AI vendors must offer EU residency, zero retention, no training on inputs, a DPA with SCCs where needed, and receive a minimal pseudonymised payload**; the user gives explicit permission before any personal data reaches a third-party AI (Apple 5.1.2(i), verbatim; Play User Data clarified 15 Jul 2026). FACT (store rules) / DECISION (vendor requirements).
8. **EU hosting; SCC + TIA for any US sub-processor** even where the DPF applies, because the DPF appeal (C-703/25 P) is pending with no hearing date. FACT (status) / DECISION.
9. **Rights flows are product features**: export (JSON + CSV), in-app deletion within 30 days, per-connection revocation, objection to profiling, category correction as rectification. DECISION; also required by Apple 5.1.1(v) and Play.
10. **Appoint an external DPO from launch** (likely mandatory at scale under Art. 37(1)(b): regular and systematic monitoring on a large scale), and run the 72-hour breach clock from a written incident runbook. DECISION / ASSUMPTION on mandatoriness.

---

## 2. Roles and lawful bases

### 2.1 Who is controller or processor for what

| Processing | Lilleri | Licensed provider (AISP) | Vendors | Label / source |
|---|---|---|---|---|
| Account-information service (fetching balances/transactions from the bank under the user's PSD2 consent) | Recipient of the data (controller for what it does next) | **Controller** for the AIS it provides (EDPB 06/2020 treats PSPs as controllers) | — | FACT (RL-§6.1) |
| Consent capture on the provider's hosted/mandated screen | Possibly **joint controller** for the shared flow | Controller | — | ASSUMPTION — provider DPA/T&Cs decide; TrueLayer/Yapily/Tink mandate their copy (PA-§2.6) |
| Storage, normalisation, reconciliation, categorisation, insights, Review Inbox, subscriptions, chat | **Controller** | — | Cloud/DB, LLM API, OCR, e-mail inbound, push: **processors** | FACT (RL-§6.1) |
| Receipts OCR, e-mail receipt extraction | Controller | — | Processor (OCR/LLM/inbound mail) | FACT |
| Product analytics, crash reporting | Controller | — | Processor (self-hosted or EU SaaS) | FACT |
| Payments for Premium | Controller for subscription state | — | Apple/Google: **independent controllers** for the purchase | ASSUMPTION (store terms) |
| "Silent party" data (counterparties' names and IBANs inside transactions) | Controller, legitimate interest limited to delivering the service; no further use | Same | — | FACT (EDPB 06/2020; RL-§6.1) |

### 2.2 Lawful-basis map (per purpose)

| Purpose | Lawful basis | Why not another basis | Label / source |
|---|---|---|---|
| Create and secure the account; authenticate | Art. 6(1)(b) contract (+ 6(1)(c)/(f) for security logs) | — | FACT |
| Ingest, store, normalise, reconcile and categorise transactions; detect subscriptions; show insights; Review Inbox | **Art. 6(1)(b) contract** — necessary to perform the service the user signed up for; PSD2 Art. 94(2) "explicit consent" is given to the provider contractually | GDPR consent would be withdrawable at any time (breaks the service) and not freely given | FACT (EDPB 06/2020; RL-§6.1) |
| Personal AI categorisation that learns per user (model state derived from the user's own corrections) | Art. 6(1)(b) contract (profiling without legal effects → Art. 22 not engaged; Art. 13(2)(f) transparency and Art. 21 objection apply) | — | FACT (RL-§6.3) |
| Any special-category inference (health, religion, politics, union, sex life) | **Avoided by design**; if ever needed (e.g., deductible donations), **Art. 9(2)(a) explicit consent**, specific and separately logged | 9(2)(g) "substantial public interest" has no Italian law basis for PFM (EDPB) | FACT (RL-§6.2) / DECISION |
| Receipt photo → line items (user-initiated) | Art. 6(1)(b) contract for the feature; separate **permission** for third-party AI sharing (store rule, not a GDPR basis); camera OS permission | — | FACT (store rules) / ASSUMPTION (basis) |
| E-mail receipt ingestion (forward-to-inbox or OAuth mailbox) | **Art. 6(1)(a) consent per mailbox**, revocable; Google Limited Use policy; purpose limited to receipt/invoice extraction | Mailbox access is beyond what the core promise needs | FACT (NB-§5.4) |
| Android notification access (post-MVP experiment) | Art. 6(1)(a) consent + OS special access; on-device parsing only | Reads every notification → high intrusion | DECISION (NB-§4.2) |
| Product analytics with persistent identifiers | **Consent** (art. 122 Codice privacy) — or anonymised analytics without consent per Garante 2021 guidelines | — | FACT (RL-§7) |
| Crash/diagnostic telemetry strictly necessary to run the app | Strictly-necessary exemption (art. 122) if genuinely minimal; else consent | — | FACT / ASSUMPTION on "minimal" threshold |
| Service push (consent expiring, reconnect needed, Review Inbox item, low balance alert the user configured) | Contract; OS permission only | Not marketing | FACT (art. 130 scope) / ASSUMPTION (push classification) |
| Marketing push / e-mail; personalised offers | **Consent** (art. 130); soft opt-in for own similar services via e-mail collected at sale (art. 130(4)) with opt-out each time | — | FACT |
| Security monitoring, fraud/abuse prevention, access logs | Art. 6(1)(f) legitimate interest (LIA on file) / 6(1)(c) where legally required | — | FACT |
| Billing and accounting records | Art. 6(1)(c) legal obligation (art. 2220 c.c., 10 years) | — | ASSUMPTION (civil-code retention; RL-§6.4) |
| Model-quality improvement using user corrections (aggregate, pseudonymised) | Art. 6(1)(f) legitimate interest with LIA, opt-out in settings; **never** sending raw user data to a vendor for training | Digital Omnibus LI-for-AI basis is a stalled proposal (NEW-6) | DECISION / ASSUMPTION |
| Support conversations | Contract / legitimate interest | — | FACT |

---

## 3. Data inventory

### 3.1 Encryption classes (DECISION)

| Class | Meaning | Mechanism |
|---|---|---|
| **E1** | Platform encryption at rest (cloud KMS default) + TLS in transit | Default for everything |
| **E2** | E1 + **application-level envelope encryption with a per-user data key (DEK)** wrapped by a KMS key; enables **crypto-shredding** (delete the DEK → data unrecoverable in DB and backups) | Per-user tables and blobs |
| **E3** | E2 + field-level encryption or tokenisation of identifiers + **no human read access** except break-glass with dual approval and audit | Account identifiers, raw payloads, receipts, e-mail bodies, AI prompt logs |
| **E4** | Secrets: provider access/refresh tokens, API keys, signing keys — in a secret manager/HSM, never in application tables, rotated | Tokens, keys |

### 3.2 Access roles (DECISION)

| Role | Access |
|---|---|
| **User** | Own data only, through the app/API; export and deletion self-service |
| **Support** | Masked view (no IBAN, no raw description, amounts bucketed) by default; full view only with **user-granted time-boxed access** from inside the app; all reads logged |
| **On-call engineer** | Break-glass to E3 data with dual approval, ticket reference, automatic expiry, audit event |
| **Data / product analytics** | Pseudonymised, aggregated datasets only; never E3 fields |
| **DPO / legal** | Per data-subject request or incident, logged |
| **Processors** | Scoped to their function (LLM: pseudonymised payload only; OCR: image only; push: token + templated text) |

### 3.3 Inventory

| # | Data class | Examples | Why we store it | Lawful basis | Retention (see `data-retention.md`) | Encryption class | Who can access | Label |
|---|---|---|---|---|---|---|---|---|
| 1 | Identity & account | e-mail, display name, password hash / passkey, MFA factors, locale, age-gate attestation (18+) | Account, login, legal capacity | Contract | Life of account + 30 days | E2 | User; support (masked e-mail); security | DECISION |
| 2 | Device & session | device model/OS, push token, session ids, app version, IP at login (short-lived) | Security, push delivery, support | Contract / LI (security) | Sessions: 90 days after last use; push token: until revoked | E2 (push token E4) | Security; on-call | DECISION |
| 3 | Bank connection metadata | provider name, provider connection/consent id, institution, consent granted/expiry dates, SCA timestamp, status, account ids (IBAN/PAN-suffix **masked for display, tokenised at rest**), holder name as returned | Operate and renew connections; show the "Collegamenti" dashboard; reconciliation keys | Contract (PSD2 explicit consent captured by the provider) | Life of connection + 30 days after revocation (status history kept in audit) | **E3** (identifiers) / E2 (status) | User; on-call (break-glass); support masked | DECISION |
| 4 | Provider access tokens | OAuth/API tokens, refresh tokens, webhook secrets | Fetch data | Contract | Until revoked/expired; rotated | **E4** | Service accounts only | DECISION |
| 5 | **Raw provider payloads** | provider JSON per fetch (transactions, balances, accounts), HTTP metadata | Re-process after mapping fixes; reconciliation audit; provider switch without lock-in (PA-§7 point 7); dispute evidence | Contract | **Rolling 13 months** then delete (proposal; see retention doc); never leaves the EU | **E3** | On-call break-glass; batch jobs | DECISION |
| 6 | Normalised transactions | date booked/value, amount, currency, raw + cleaned description, counterparty name/IBAN (**silent-party data**), bank transaction codes, status pending/booked, stable provider id, source (API/import/receipt) | The product | Contract (counterparty data: LI limited to the service) | Life of account (user may delete per connection/account) | E2 (counterparty IBAN: **E3**) | User; support masked; on-call | DECISION |
| 7 | Balances & accounts | balance types, timestamps, account type, nickname | The product | Contract | Life of account | E2 | User | DECISION |
| 8 | **Derived data** | category (AI-suggested / rule / user), confidence, reconciliation links (transfer pairs, pending→booked, refund↔purchase, card settlement), merchant normalisation, recurring/subscription entities, insights, budgets | The promise ("understands what happens to your money") | Contract (profiling without legal effects) | Life of account; regenerable | E2 | User; analytics only in aggregate | DECISION |
| 9 | User rules, corrections, Review-Inbox decisions, per-user model state | "PayPal *Spotify → Abbonamenti"; "ignora questo trasferimento"; hidden categories; feedback | Rules win over AI; personal learning; explainability | Contract | Life of account (export included) | E2 | User | DECISION |
| 10 | Receipts | photo/PDF, extracted merchant/date/total/line items, link to transaction | Cash capture, itemisation | Contract (feature); third-party-AI permission; camera permission | Image: 90 days after extraction unless the user pins it; extracted data: life of account | **E3** (image) / E2 (data) | User; OCR processor (image only) | DECISION (NB-§6) |
| 11 | E-mail ingestion | forwarded e-mail (headers, body, attachments), sender, extracted receipt/invoice data | Itemisation (Amazon, bills) | **Consent** per mailbox; Limited Use | Raw e-mail: discard non-receipts immediately; receipts raw: 30 days; extracted: life of account | **E3** (raw) / E2 | User; inbound-mail processor | DECISION (NB-§5) |
| 12 | Imported files | CSV/XLSX/PDF statements, column mappings | History backfill, fallback | Contract | File: 30 days after import; mapping: life of account | **E3** (file) / E2 | User | DECISION (NB-§7) |
| 13 | **AI processing logs** | pseudonymised prompt payload, model id/version, output, confidence, latency, cost; **never the vendor's copy** (zero retention) | Quality, explainability, incident investigation, PLD evidence (RL-§14) | Contract + LI (quality) | 30 days detailed; 13 months aggregated metrics without content | **E3** | ML engineers (break-glass for content) | DECISION |
| 14 | Consent & permission records | type, version/hash of text, timestamps, channel, build, withdrawal, AIS consent ids/expiry | Proof of consent (Art. 7(1)); renewal UX | Legal obligation / contract | Life of account + 10 years (limitation period) in restricted archive | E2 | DPO; user (own) | DECISION (`consent-model.md` §4) |
| 15 | Product analytics events | **semantic events** only (`connection_added`, `inbox_item_resolved{kind}`, `category_corrected{from_group,to_group}`), coarse buckets, no amounts/descriptions/IBANs | Product decisions | Consent (with identifiers) or anonymised (no consent) | 13 months raw; aggregates indefinitely | E1 (pseudonymised) | Product/data | DECISION (§6) |
| 16 | Diagnostics / crash logs | stack traces, app/OS version, **scrubbed** of PII | Reliability | Strictly necessary / consent | 90 days | E1 | Engineering | DECISION |
| 17 | Security & audit logs | auth events, admin/break-glass actions, data exports/deletions, API access logs (IP truncated after 7 days) | Security, accountability, Art. 5(2) | LI / legal obligation | 12 months (security), audit of deletions/exports: 10 years | E2 (immutable store) | Security; DPO | DECISION |
| 18 | Support tickets | conversation, attachments the user sends | Help | Contract / LI | 24 months after closure | E2 | Support | DECISION |
| 19 | Billing | store transaction ids, subscription state, invoices (web) | Contract, accounting | Contract / legal obligation | Accounting records 10 years (art. 2220 c.c.) | E2 | Finance | ASSUMPTION (10 years) |
| 20 | Marketing | e-mail opt-in state, campaign membership | Marketing | Consent / soft opt-in | Until withdrawal; suppression list kept | E1 | Marketing | DECISION |
| 21 | Vendor register & DPAs | list of processors, locations, DPAs, TIAs | Accountability; DORA readiness | Legal obligation | Life of relationship + 5 years | E1 | Compliance | DECISION (RL-§4.3) |

**Explicit non-collection (DECISION):** no card PAN or bank credentials ever (PSD2 forbids sensitive payment data for AISPs and screen scraping is "never", NB-§12); no contacts, no installed-app lists, no precise location in MVP (NB-§12); no advertising identifiers; no biometric templates (OS handles biometrics); no government IDs (KYC is the provider's job on the company, not on users — RL-§9).

---

## 4. Data minimisation decisions

| # | Decision | Rationale | Label |
|---|---|---|---|
| M1 | **Store raw provider payloads for a rolling 13 months only**, long enough to re-run a year of reconciliation after a mapping fix; normalised data is the system of record. | Raw payloads are the richest, least-controlled copy (counterparty IBANs, free-text) | DECISION |
| M2 | **Tokenise account identifiers**; display masked (`IT60 •••• 1234`); full IBAN readable only by the reconciliation service and break-glass. | Reduces exposure in logs, support, analytics | DECISION |
| M3 | **Silent-party data** (counterparty names/IBANs) used only for reconciliation and display inside the owner's ledger; never aggregated across users, never used to profile third parties, never exported to vendors with identifiers. | EDPB 06/2020 | DECISION (FACT on the rule) |
| M4 | **LLM payloads are pseudonymised and minimal**: cleaned description, amount bucket or rounded amount, MCC/bank code, date granularity "weekday", merchant candidates; **no IBAN, no user id, no account id, no full history**, no names of counterparties unless they are merchants. | Apple 5.1.2(i); Garante AI practice; transfer minimisation | DECISION |
| M5 | **No amounts, descriptions or identifiers in analytics or crash logs**; event schemas are reviewed by the DPO before release. | Garante cookie guidelines; store privacy labels | DECISION |
| M6 | **Receipt images deleted 90 days after successful extraction** unless pinned; extraction keeps line items only. | Images may contain other people's data (NB-§6.3) | DECISION |
| M7 | **E-mail ingestion starts with forward-to-inbox**, not mailbox OAuth, so Lilleri sees only what the user forwards; non-receipt mail is discarded on arrival. | Strong minimisation story; avoids restricted scopes/CASA (NB-§5.3) | DECISION |
| M8 | **Age gate 18+**; no processing of minors' data at launch. | L. 132/2025; art. 2-quinquies | DECISION |
| M9 | **No precise location, no contacts, no installed-app list** in MVP; location considered later only opt-in for merchant matching. | NB-§12; Apple 5.1.2(ii)–(iv) | DECISION |
| M10 | **Per-user DEKs** so that deletion is cryptographic and backups need no rewrite. | Erasure within 30 days incl. backups (see `data-retention.md`) | DECISION |
| M11 | **Model-quality datasets are built from user corrections in aggregate** (category transitions, merchant strings with amounts removed), never from raw ledgers. | LI with opt-out; minimisation | DECISION |

---

## 5. Special-category inference — risks and mitigations

### 5.1 Where Art. 9 data hides in a ledger (FACT on the risk — EDPB 06/2020; RL-§6.2)

| Signal in transactions | Possible inference | Art. 9 class | Likelihood in Italian data |
|---|---|---|---|
| Pharmacy purchases (`FARMACIA …`), clinics, laboratories, psychologists, physiotherapists, dentists, ticket sanitario, private hospitals, health-insurance premiums | health condition, therapy | Health | High (pharmacies are everyday merchants) |
| Donations to parties, 2×1000 is not visible but party membership fees, union dues (`CGIL`, `CISL`, `UIL` SDD), professional-association fees | political opinion, trade-union membership | Political / union | Medium |
| Church offerings, 8×1000 is not visible, religious schools, kosher/halal shops, pilgrimages | religious belief | Religion | Medium |
| Dating apps, LGBTQ+ venues, sexual-health products, adult content | sex life / orientation | Sex life | Medium |
| Lawyers, court fees, bail, fines | criminal matters (Art. 10) | Art. 10 | Low-medium |
| Charities for specific diseases, patient associations | health + beliefs | Health | Low-medium |
| Immigration services, ethnic grocery stores, remittance corridors | ethnic origin | Ethnic origin | Medium |

### 5.2 Mitigations (DECISION unless stated)

| # | Mitigation | How it shows in the product |
|---|---|---|
| S1 | **Do not infer.** The taxonomy contains **no category whose name or definition is a special-category inference**: no "Religione/Chiesa", "Partito", "Sindacato", "Terapia/Psicologo", "Salute" as a health inference. Merchant-type labels are neutral: "Farmacia" (a shop type), "Donazioni e offerte", "Quote e tessere", "Benessere e cura della persona", "Spese mediche" only if counsel confirms it is acceptable as a merchant/expense type presented to the user with no further use — **counsel sign-off on the final taxonomy (P0, `legal-open-questions.md` Q2)**. | Category list; taxonomy review log |
| S2 | **Do not profile on those classes.** No insight, nudge, segment, offer, score or analytics event is computed from categories in a protected "quiet set" (`quiet_set = {Farmacia, Spese mediche, Donazioni e offerte, Quote e tessere, Incontri e relazioni, Servizi legali}`); they are excluded from subscription-detection narratives ("Spendi 40 € al mese in farmacia" is never generated), from AI chat proactive remarks, and from model-quality datasets. | Feature flags on the insight engine; test suite asserting no insight references a quiet-set category |
| S3 | **Allow category hiding.** Any category can be hidden ("Nascondi questa categoria dai riepiloghi") and any transaction marked "Privata" (excluded from insights, chat context, exports to third parties, and support views); hidden state is honoured by every surface. | Settings → Privacy → "Categorie riservate" |
| S4 | **AI chat guardrail.** The assistant never volunteers special-category observations; if the user asks ("quanto spendo in farmacia?") it answers the arithmetic without inference ("Questo è il totale delle transazioni etichettate Farmacia") and never speculates on health. Prompt rules + output filter + red-team tests. | System prompt; eval set |
| S5 | **Explicit consent gate for any future feature that needs the inference** (e.g., "donazioni detraibili per il 730", union-fee deductions): Art. 9(2)(a) consent, specific wording, separate screen, logged with text version, withdrawable with deletion of derived labels. | `consent-model.md` type C-SPECIAL |
| S6 | **Vendor isolation.** LLM payloads for quiet-set merchants are either processed by rules on-device/server-side without AI or sent with the merchant string generalised ("negozio al dettaglio") — ASSUMPTION that this materially reduces vendor-side inference; validate in the DPIA. | Payload builder |
| S7 | **Transparency.** The privacy notice explains in plain Italian that transactions can reveal sensitive things, that Lilleri does not use them to infer anything, and how to hide categories. Example copy: *"I tuoi movimenti possono raccontare cose personali (una farmacia, una donazione). Lilleri non ne deduce nulla su di te e non li usa per consigli o offerte. Puoi nascondere qualsiasi categoria quando vuoi."* | Layered notice, layer 1 |
| S8 | **Garante benchmarks on file**: OpenAI (lawful basis, transparency, age), Replika (chatbot, age gate), Foodinho/Deliveroo (algorithmic transparency, DPIA), Cass. 14381/2021 (knowable logic for any score) → every AI output has a "Perché?" explanation. FACT (decisions, reported) | Explainability surface in the Review Inbox |

---

## 6. Analytics privacy rules (DECISION)

1. **Semantic events only.** Event names describe product actions (`connection_added`, `connection_expired`, `inbox_opened`, `inbox_item_resolved{kind: duplicate|transfer|category|subscription}`, `rule_created`, `export_requested`); properties are enums or coarse buckets (`transactions_count_bucket: 1-50|51-200|…`).
2. **Forbidden properties:** description text, merchant names, amounts (even rounded), IBAN/account ids, counterparty names, category of a single transaction, free-text input, e-mail content, receipt content, chat messages. The quiet set (§5.2 S2) is never an analytics dimension.
3. **No third-party advertising or tracking SDK; no cross-app identifiers** → no Apple ATT prompt; Data safety/App Privacy "no tracking". FACT (rules) / DECISION.
4. **Identifiers:** without consent, analytics are **anonymised** per the Garante 2021 guidelines (truncated IP, no persistent device id, no cross-site/app combination, aggregated reporting); with consent (one toggle, off by default, re-askable not earlier than 6 months), a rotating pseudonymous id lets us analyse funnels. FACT (guidelines) / DECISION.
5. **Where:** EU-hosted (self-hosted or EU SaaS with DPA); raw events 13 months; the vendor never receives E3 data.
6. **Governance:** every new event passes a schema review (DPO + lead engineer) with a lint rule rejecting forbidden property names; the schema is published in `architecture/observability.md` (to be written).
7. **Crash reporting:** PII scrubbing before upload; breadcrumbs exclude screen content; no transaction objects in logs.

---

## 7. AI vendor data-handling requirements (DECISION; FACT where stores/laws are cited)

| Requirement | Why | How we verify |
|---|---|---|
| **EU data residency** for inference (EU-region endpoint) and no storage outside the EU; if a US vendor is used through an EU region, SCC + TIA on file in addition to any DPF certification | RL-§6.5; DPF appeal pending (NEW-5) | DPA, sub-processor list, region configuration |
| **Zero data retention** of prompts/outputs by the vendor (or ≤ the abuse-monitoring minimum, documented), **no training on inputs/outputs**, no human review by the vendor except with our written approval | Garante AI practice; Apple 5.1.2(i) truthfulness | Contract clause; vendor documentation; annual attestation |
| **DPA under Art. 28** with sub-processor transparency and audit rights; AI-Act documentation (model card, GPAI compliance, copyright policy) on file | GDPR Art. 28; AI Act GPAI chapter (deployer keeps the provider's docs) | Vendor register |
| **Minimal payload** (§4 M4): pseudonymised, no identifiers, no quiet-set inference material, no full-ledger context; chat context windows built from aggregates where possible | Minimisation | Payload builder tests |
| **Explicit user permission before any personal data goes to a third-party AI** — one clear screen in first-run and a toggle in settings; Premium must work without it (on-device/rule-based fallback or in-house model) | Apple 5.1.2(i) verbatim; Apple 5.1.1(ii); Play User Data policy clarified 15 Jul 2026 (NEW-1) | `consent-model.md` type P-AI |
| **Switchability**: canonical internal schema and prompt abstraction so vendor replacement is a connector change; two approved vendors in the register | Lock-in, incident response | Architecture |
| **Logging on our side** (§3.3 row 13), **not** on the vendor's | PLD evidence; explainability | Log pipeline |
| **Cost/accuracy choice does not override privacy**: the raw note shows per-receipt costs of USD 0.0003–0.10 — cost is not the deciding factor; accuracy on Italian receipts and privacy posture are (NB-§6.1) | FACT (prices) | Vendor benchmark on an Italian receipt set |
| **Chat disclosure**: "Stai parlando con un assistente AI" on first use and in the header; L. 132/2025 plain-language information | AI Act Art. 50(1) since 2 Aug 2026 | UI |

Example permission copy (Italian, plain language): *"Per capire i tuoi movimenti, Lilleri può usare un servizio di intelligenza artificiale di un fornitore esterno che opera in Europa. Gli inviamo solo la descrizione del movimento, senza il tuo nome, il tuo IBAN o i tuoi conti; il fornitore non conserva nulla e non usa i tuoi dati per addestrare i suoi modelli. Puoi cambiare idea quando vuoi nelle impostazioni. [Attiva] [Non ora]"* — the "Non ora" path keeps the app fully usable with rules and the in-house classifier.

---

## 8. DPIA outline (to be completed before beta — DECISION on timing; FACT that it is required, RL-§6.4)

1. **Description of processing**: data flows (provider → Lilleri → vendors), data classes (§3.3), purposes, recipients, retention, scale (target users), technologies (PSD2 aggregation, LLM categorisation, OCR, e-mail inbound).
2. **Necessity and proportionality**: lawful-basis map (§2.2), minimisation decisions (§4), retention (`data-retention.md`), transparency (layered notice), rights (§9), processors and transfers (§7, §12).
3. **Risks to data subjects** (likelihood × severity): (a) Art. 9 inference and its misuse (§5); (b) unauthorised access to financial history (breach, insider, support misuse); (c) inaccurate categorisation driving wrong financial decisions (PLD angle); (d) over-collection via e-mail/receipts; (e) vendor misuse of prompts; (f) unlawful transfers (DPF invalidation); (g) chilling effects / loss of control (consent not understood, renewal failures leaving stale data); (h) minors; (i) dark patterns in consent capture.
4. **Measures**: encryption classes and access roles (§3.1–3.2), quiet-set controls (§5.2), analytics rules (§6), vendor requirements (§7), consent records and renewal UX (`consent-model.md`), deletion and crypto-shredding (`data-retention.md`), incident runbook (§11), DPO, security testing, Review Inbox as correction path, explainability.
5. **Consultation**: DPO opinion; user research on comprehension of the consent and hiding features; counsel on taxonomy; provider's DPA; prior consultation with the Garante (Art. 36) only if residual risk stays high (HYPOTHESIS: not needed if S1–S8 are implemented).
6. **Residual risk and sign-off**; review triggers: new data source (mailbox OAuth, notification listener), new vendor, new AI feature (chat), affiliate features, expansion to a new country, PSR application.

---

## 9. User rights flows (DECISION; FACT on the rights)

| Right | In-app flow | SLA | Notes |
|---|---|---|---|
| **Access / portability (Art. 15, 20)** | Settings → "I tuoi dati" → "Scarica i tuoi dati": ZIP with JSON (full model: accounts, transactions, categories, rules, reconciliation links, consents) + CSV per account; delivered in-app and by expiring link | Immediate (async job, minutes) ; legal max 1 month | A trust feature as much as a right (competitor lesson, NB-§7.3) |
| **Rectification (Art. 16)** | Correcting a category, a merchant, a transfer pairing is rectification; profile fields editable | Immediate | Review Inbox is the rectification UI |
| **Erasure (Art. 17) — account deletion** | Settings → "Elimina account": explains what is deleted and what is kept (billing records, consent proofs), requires re-auth, 7-day cool-off with cancel, then: revoke all provider consents, delete DEKs (crypto-shred), delete vendor-side artefacts (none expected: zero retention), confirm by e-mail | ≤ 30 days end-to-end; typically 7 days | Apple 5.1.1(v) and Play require in-app deletion (FACT); web link too |
| **Partial erasure** | Delete a connection (with "keep history as imported" or "delete everything from this bank"), delete a receipt, delete e-mail ingestion data, clear chat history | Immediate | Per-source deletion |
| **Revocation of AIS consent** | "Scollega" in Collegamenti → revoke at the provider (and the bank where supported), delete tokens, stop refresh; data retention choice offered | Immediate | PSD2 right exercised via the provider (`consent-model.md` §6) |
| **Withdrawal of GDPR consents** | Toggles in Settings → Privacy (analytics id, marketing, e-mail ingestion, AI sharing, special-category features) with effect "from now"; derived data from special-category features deleted | Immediate | Same ease as giving (Art. 7(3)) |
| **Objection to profiling (Art. 21)** | "Disattiva categorizzazione automatica" switch (rules-only mode) and "Disattiva consigli"; documented limits of the service in that mode | Immediate | Art. 13(2)(f) explanation in the notice |
| **Restriction (Art. 18)** | Support-handled; account frozen read-only | 1 month | Rare |
| **Complaint** | Notice names the DPO contact and the Garante | — | — |
| **Deceased users / heirs** | Codice privacy art. 2-terdecies: heirs' access unless the user opted out in settings ("Dopo di me") | 1 month | ASSUMPTION on article; counsel |

Identity verification for requests made outside the app: re-authentication in the app or e-mail challenge; no ID documents collected (minimisation).

---

## 10. DPO decision

- **DECISION: appoint an external DPO from launch** (contract, published contact in the notice, registered with the Garante). Rationale: Art. 37(1)(b) likely applies once at scale — core activity = regular and systematic monitoring of data subjects on a large scale (continuous account monitoring) — and the Garante expects it for consumer-finance/AI products; an external DPO is cheap relative to the risk. ASSUMPTION on strict mandatoriness at launch scale (WP243 interpretation, RL-§6.4) → `legal-open-questions.md` Q9.
- Responsibilities: DPIA ownership, Art. 30 records, consent/analytics schema reviews, vendor DPA review, rights-request escalation, breach assessment, annual review.

---

## 11. Breach notification timelines (FACT on the law; DECISION on internal SLAs)

| Clock | Rule | Lilleri internal target |
|---|---|---|
| Processor → controller | "Without undue delay" (Art. 33(2)) | **Contractual: ≤ 24 h** from awareness, in every DPA (cloud, LLM, OCR, mail, push, analytics) |
| Provider ↔ Lilleri | Provider has its own PSD2/DORA major-incident duties toward its NCA (not Lilleri's duty); contract to require **mutual notification ≤ 24 h** for incidents affecting shared users | Contract clause (`legal-open-questions.md` Q7) |
| Lilleri → **Garante** | **≤ 72 h** from awareness unless unlikely to result in a risk (Art. 33(1)); phased notification allowed | Decision meeting at T+24 h; notification drafted by T+48 h; DPO signs |
| Lilleri → **users** | "Without undue delay" when high risk (Art. 34) — e.g., exposure of transaction histories or account identifiers | In-app + e-mail within 72 h of the Garante filing; plain-language Italian; what happened, what to do (re-authorise, watch statements) |
| Lilleri → app stores / provider | Contractual/platform duties if credentials or tokens are involved | Same incident runbook; rotate E4 secrets first |
| Record | Art. 33(5): all breaches documented, even unnotified | Incident register (audit log class) |
| DORA / NIS2 | Not applicable to unlicensed Lilleri (RL-§4, §13); DORA 4h/72h/1-month templates apply to the provider | If Lilleri becomes an ICT TPP of the provider: cooperate per contract |

---

## 12. International transfers and residency (FACT on status; DECISION on policy)

- **Primary hosting in the EU** (EU regions; EU-resident inference endpoints). DECISION.
- **DPF** adequacy (10 Jul 2023) survives the General Court's 3 Sep 2025 ruling; **appeal C-703/25 P pending, no hearing date as of Oct 2026**; US PCLOB without quorum since Jan 2025 (reported). FACT (RL-§6.5; NEW-5) → for any DPF-certified US vendor, **also sign SCCs and keep a TIA**, and prefer EU-only processing so an invalidation is a paperwork event, not a migration. DECISION.
- **UK** (if a UK-based provider entity is ever involved): UK adequacy decision in force (ASSUMPTION; verify the renewal status before contracting).
- Expansion to other EU countries: same model; lead-authority question → `legal-open-questions.md` Q8.

---

## 13. Decisions / Recommendations

| # | Decision / recommendation | Label |
|---|---|---|
| D1 | Contract (Art. 6(1)(b)) is the basis for the core service; consent only for optional features; LI with LIA for security and aggregate model quality. | DECISION |
| D2 | Taxonomy with no special-category labels; quiet-set exclusion from insights, chat, analytics and model datasets; category hiding and "Privata" flag; explicit Art. 9 consent for any future inference feature; counsel sign-off on the taxonomy before beta. | DECISION |
| D3 | Encryption classes E1–E4 with per-user DEKs (crypto-shredding) and break-glass access; support sees masked data unless the user grants time-boxed access. | DECISION |
| D4 | Raw provider payloads kept 13 months; receipt images 90 days; e-mail raw 30 days; AI prompt logs 30 days (details in `data-retention.md`). | DECISION (proposed values) |
| D5 | Analytics: semantic events only, forbidden-property lint, anonymised without consent, no ad/tracking SDK, EU-hosted. | DECISION |
| D6 | AI vendors: EU residency, zero retention, no training, DPA + SCC/TIA, minimal pseudonymised payload, explicit user permission step shared by Apple/Play rules, two switchable vendors. | DECISION |
| D7 | DPIA before beta with the outline in §8; review triggers listed. | DECISION |
| D8 | External DPO from launch. | DECISION |
| D9 | Rights as product features: export ZIP, in-app deletion (7-day cool-off, ≤30 days), per-connection revocation, profiling opt-out, consent toggles. | DECISION |
| D10 | Breach runbook with 24 h processor SLA, 72 h Garante clock, user notice within 72 h of filing. | DECISION |
| D11 | EU hosting; SCC + TIA for every US sub-processor regardless of DPF. | DECISION |
| R1 | Have counsel map EDPB 06/2020 onto the final taxonomy and the quiet-set rule (P0). | RECOMMENDATION |
| R2 | Validate consent and hiding comprehension with 8–10 Italian users before beta (DPIA §8.5). | RECOMMENDATION |
| R3 | Publish a short "privacy promise" page in Italian mirroring the decisions above (trust is priority #1). | RECOMMENDATION |

---

## 14. Open questions

| # | Question | Why it matters | How to resolve |
|---|---|---|---|
| OQ1 | Is "Farmacia" / "Spese mediche" as a neutral expense type acceptable without Art. 9 consent when no inference is made, or must the label itself change? | Core taxonomy | Counsel + DPIA (`legal-open-questions.md` Q2) |
| OQ2 | Does the provider's DPA make Lilleri a joint controller for the consent flow, and who answers data-subject requests about the AIS step? | Rights handling; notices | Provider DPA review |
| OQ3 | Is a DPO mandatory at launch scale (Art. 37(1)(b))? | Governance | Counsel; appoint regardless |
| OQ4 | Which LLM/OCR vendors meet EU residency + zero retention + no training today, under which contract tiers? Pages were blocked in research (RL-§6.5). | Vendor choice | Read current DPAs and data-residency pages; request written confirmation |
| OQ5 | Does pseudonymised merchant text sent to an LLM still count as "personal data shared with third-party AI" for Apple 5.1.2(i)? (We assume yes and ask permission anyway.) | Permission step necessity | App Review guidance; keep the step regardless |
| OQ6 | Heirs' access rule (Codice privacy art. 2-terdecies) and the "Dopo di me" setting | Rights flow | Counsel |
| OQ7 | Has the Garante issued any decision on a PFM/AISP app or on inferred financial-sensitive data? (None found, NEW-8.) | DPIA benchmarks | Garante docweb search from an unblocked network |
| OQ8 | UK adequacy renewal status if a UK provider entity is in the chain | Transfers | Verify on the Commission's adequacy page |
| OQ9 | Whether on-device/in-house classification can carry enough of the categorisation load that the third-party-AI permission is genuinely optional for most users | Product quality under "Non ora" | ML benchmark (see `research/raw/ai-ml-transaction-intelligence.md`) |

---

## 15. Sources

Verification date for every row: **2026-10-02**. Access status as recorded in the raw notes (primary legal texts not fetched; see `regulatory-landscape.md` §8 for the full table).

| ID | Source | URL | Pub. date | Reliability | Used for |
|---|---|---|---|---|---|
| RL-§6, RL S-26 | EDPB Guidelines 06/2020 on the interplay of PSD2 and GDPR (v2.0) | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-062020-interplay-second-payment-services-directive_en | 2020-12-15 | high (not fetched) | Controller roles; contractual "explicit consent"; Art. 9 risk and filtering; silent-party data |
| RL-§6.4, RL S-28 | Garante — Elenco dei trattamenti soggetti a DPIA (Provv. 467/2018, docweb 9058979) | https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/9058979 | 2018-10-11 | high (not fetched) | DPIA triggers |
| RL-§6.2, RL S-29, S-78 | Garante v. OpenAI (docweb 10085432, 20 Dec 2024, €15M); Garante v. Luka Inc./Replika (Provv. 10130115, 19 May 2025, €5M) | https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/10085432 ; …/docweb/10130115 | 2024–2025 | high (decision) / medium (details reported) | Garante AI practice |
| RL-§6.3, RL S-30 | Cass. civ. sez. I, 25 May 2021 n. 14381 (Mevaluate) | https://www.italgiure.giustizia.it/ | 2021-05-25 | high (not fetched) | Knowable logic for algorithmic rating |
| RL-§6.5, RL S-31, S-76; NEW-5 | General Court T-553/23 (3 Sep 2025); CJEU C-703/25 P (appeal 31 Oct 2025, pending; Microsoft intervener) | https://curia.europa.eu/juris/liste.jsf?num=T-553/23 ; https://curia.europa.eu/juris/liste.jsf?num=C-703/25%20P ; https://edpl.lexxion.eu/article/EDPL/2026/1/15 ; https://ieu-monitoring.com/editorial/microsoft-backs-eu-commission-in-eu-court-case-on-transatlantic-data-flows-and-privacy/1244467 | 2025–2026 | high (docket) / medium (status) | DPF status |
| RL-§7, RL S-27 | Garante — Linee guida cookie e altri strumenti di tracciamento (docweb 9677876) | https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/9677876 | 2021-06-10 | high (not fetched) | Analytics without consent only if anonymised; 6-month re-prompt rule |
| RL-§6.4 | Codice civile art. 2220 (10-year accounting retention), art. 2946 (ordinary limitation); Codice privacy art. 2-quinquies (digital consent age 14), art. 122, art. 130 | https://www.normattiva.it | consolidated | high (not fetched) | Retention anchors; minors; ePrivacy |
| RL-§5, RL S-23, S-25, S-75 | AI Act Reg. (EU) 2024/1689; Reg. (EU) 2026/1744; L. 132/2025 | https://eur-lex.europa.eu/eli/reg/2024/1689/oj ; http://data.europa.eu/eli/reg/2026/1744/oj ; https://www.gazzettaufficiale.it/eli/id/2025/09/25/25G00144/sg | 2024–2026 | high / medium-high (reported) | Art. 50 disclosure; deployer role; minors |
| RL-§11.1, RL S-32, S-74 / NB S-04, S-07 | Apple App Review Guidelines 5.1.1(ii), 5.1.1(v), 5.1.2(i)–(iv) (verbatim, first-hand); App Privacy Details | https://developer.apple.com/app-store/review/guidelines/ ; https://developer.apple.com/app-store/app-privacy-details/ | 2026-06-08 | high (first-hand) | Third-party-AI permission; deletion; no gating; labels |
| RL-§11.3, RL S-40, S-41; NEW-1 | Google Play policies calendar; Data safety; User Data policy; Policy announcement 15 Jul 2026 (third-party AI clarification) | https://developer.android.com/distribute/play-policies ; https://developer.android.com/guide/topics/data/collect-share ; https://support.google.com/googleplay/android-developer/answer/10144311?hl=en ; https://support.google.com/googleplay/android-developer/answer/17134731?hl=en | 2026 | high (first-hand) / medium-high (snippet) | Disclosure/consent for third-party AI; account deletion |
| NB-§5, NB S-10, S-46 | Gmail API scopes (restricted scopes, CASA); Google Limited Use | https://developers.google.com/workspace/gmail/api/auth/scopes | n/d | medium-high (mirror) | E-mail ingestion design (forward-to-inbox first) |
| NB-§6, NB S-26, S-27, S-36, S-21, S-22 | Receipt OCR / LLM vision vendors and prices (Google Document AI; Azure receipt it-IT; Vertex Gemini; Anthropic cache; LiteLLM registry) | https://cloud.google.com/document-ai/pricing ; https://cloud.google.com/vertex-ai/generative-ai/pricing | 2026 | high / medium | "Cost is not the deciding factor" |
| NB-§4.2, NB S-08, S-32 | Android NotificationListenerService; Android 15 OTP redaction | https://developer.android.com/reference/android/service/notification/NotificationListenerService ; https://developer.android.com/about/versions/15/behavior-changes-all | n/d | high (first-hand) | Notification-access risk profile |
| PA-§2.6, §7; PB-§15 | Provider consent screens name the provider; mandatory copy; store raw payloads in a canonical schema to avoid lock-in | https://docs.truelayer.com/docs/collect-user-consent ; https://docs.yapily.com/tools-and-services/yapily-connect/overview ; https://docs.tink.com/resources/tink-link-web/tink-link-web-customization | n/d | high (mirror) | Joint-controller question; raw-payload retention rationale |
| RL-§4, RL S-21; NEW-4 | DORA Reg. 2022/2554; Delegated Reg. 2025/532 (subcontracting RTS) | https://eur-lex.europa.eu/eli/reg/2022/2554/oj ; https://www.regulationtomorrow.com/2025/03/commission-adopts-dora-rts-specifying-the-elements-that-a-financial-entity-has-to-determine-when-subcontracting-ict-services/ | 2022–2025 | high / medium-high | Incident cooperation clauses; vendor register |
| RL-§14, RL S-67 | Product Liability Directive (EU) 2024/2853 | https://eur-lex.europa.eu/eli/dir/2024/2853/oj | 2024-11-18 | high (not fetched) | Why AI logs are kept |
| NEW-6 | Digital Omnibus data-track status (Acompli Sep 2026; Osborne Clarke; Simmons & Simmons) | https://acompli.ie/news/digital-omnibus-gdpr-cookies-status-september-2026/ ; https://www.osborneclarke.com/what-our-clients-are-talking-about/digital-regulation/digital-omnibus-package | 2026 | medium-high | LI-for-AI basis is a stalled proposal |
| NEW-8 | Garante / open-banking search (negative result) | see `regulatory-landscape.md` §8.2 | — | — | OQ7 |

*End of document.*
