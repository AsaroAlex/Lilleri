# Data retention — how long Lilleri keeps each class of data, how it deletes it, and what backups and legal holds change

**Project:** LILLERI (consumer PFM, Italy-first then Europe; unlicensed data recipient under a provider's AISP licence)
**Date / verification date for every claim:** 2026-10-02
**Author:** Privacy/GDPR specialist + fintech compliance analyst, founding team
**Status of this document:** synthesis of Phase 0 research; the authoritative retention schedule referenced by `compliance/privacy-model.md` §3 and by the Art. 30 records; input to `architecture/` (storage, keys, backups, jobs) and `security/`. **Not legal advice**; the civil-code anchors and the "no statutory retention" conclusions must be confirmed by counsel (`compliance/legal-open-questions.md` Q3).

## How to read this document

- Labels: **FACT**, **ASSUMPTION**, **HYPOTHESIS**, **DECISION**, **OPEN QUESTION / UNKNOWN** (see `docs/README.md`). Every period below is a **DECISION (proposed)** unless it is anchored in a cited rule; the anchors themselves are FACT or ASSUMPTION as recorded in the raw notes (primary texts were not fetched — hosts blocked).
- Evidence base: `docs/research/raw/regulatory-landscape.md` (**RL-§x**, sources **RL S-nn**), `non-bank-sources-and-os-limits.md` (**NB-§x**), `open-banking-providers-a.md` (**PA-§x**), `open-banking-providers-b.md` (**PB-§x**); WebSearch gap closures as **NEW-n** (table in `regulatory-landscape.md` §8.2).
- Data classes, encryption classes (E1–E4) and access roles are defined in `privacy-model.md` §3; consent types in `consent-model.md` §2.

---

## 1. Executive summary

1. **No sector law forces Lilleri to keep bank data.** PSD2 imposes no retention on an unlicensed recipient; AML 10-year retention does not apply (Lilleri is not an obliged entity); the only hard anchors are **accounting records (10 years, art. 2220 c.c.)** and the **ordinary limitation period for claims (10 years, art. 2946 c.c.)** for a restricted archive of contract/consent/billing evidence. FACT (scope) / ASSUMPTION (civil-code anchors not re-read) (RL-§6.4, §9).
2. Therefore the schedule is driven by **GDPR storage limitation (Art. 5(1)(e))** and by the product promise: live financial data lives **as long as the account lives**; raw provider payloads **13 months**; receipt images **90 days**; raw forwarded e-mails **30 days**; AI prompt/response logs **30 days**; analytics events **13 months**; security logs **12 months**; dormant accounts deleted after **24 months of inactivity** with warnings. DECISION.
3. **Deletion is cryptographic**: every user has a data-encryption key (DEK); account deletion destroys the DEK, which makes the user's E2/E3 data unreadable in the database **and in every backup** without rewriting backups; a deletion log is replayed after any restore. DECISION.
4. **Account deletion runs end to end in ≤ 30 days** (7-day cool-off, then revocation at the provider, token destruction, crypto-shredding, cache/index purge, vendor confirmations, restricted-archive carve-out, confirmation to the user) and is available **in-app and via a web link**, as Apple 5.1.1(v) and Play require. FACT (store rules) / DECISION (flow).
5. **Backups** are EU-only, encrypted, retained **30 days** (daily) with a quarterly restore test; they never extend the life of personal data beyond the schedule because of the DEK design; logs and analytics (not under per-user DEKs) are pseudonymised and short-lived. DECISION.
6. **Legal holds** suspend deletion timers for a named scope only (user, period, data class), require DPO approval, are reviewed every 90 days, and never override the user's erasure right unless Art. 17(3)(e) (legal claims) applies. DECISION.
7. **What the provider keeps is not Lilleri's to decide**: the licensed AISP is a separate controller with its own retention; the RFP must ask for it and the privacy notice must say it. FACT (roles) / OPEN QUESTION (provider periods).

---

## 2. Principles (DECISION; FACT where cited)

| # | Principle | Anchor |
|---|---|---|
| P1 | **Purpose-bound retention**: each class has one trigger (account life, connection life, event time) and one period; nothing is "kept just in case". | GDPR Art. 5(1)(e), Art. 25 (FACT) |
| P2 | **Live service data = life of the account**; the user controls earlier deletion per source. | Contract basis (`privacy-model.md` §2.2) |
| P3 | **Short life for the richest copies**: raw payloads, images, raw e-mails, prompts. | Minimisation (`privacy-model.md` §4) |
| P4 | **Legal anchors only where they exist**: accounting 10 years (art. 2220 c.c.); claims evidence up to 10 years (art. 2946 c.c.) in a restricted archive; consent proofs for the same window. No PSD2 retention; no AML retention. | RL-§6.4, RL-§9 (ASSUMPTION on articles; FACT on AML scope) |
| P5 | **Deletion means unrecoverable**: crypto-shredding for E2/E3; hard delete for E1; vendor confirmation for processors. | GDPR Art. 17, Art. 28(3)(g) (FACT) |
| P6 | **Backups do not resurrect data**: deletion log replay on restore; per-user DEKs. | Art. 17 + Art. 32 (FACT) |
| P7 | **Evidence of deletion** is itself retained (audit class, no content). | Art. 5(2) accountability (FACT) |
| P8 | **Annual review** of the schedule, and review on every new data source or vendor (DPIA trigger). | DPIA outline (`privacy-model.md` §8) |

---

## 3. Retention schedule per data class

Period starts at the **trigger**. "Archive" = restricted, encrypted, access by DPO/legal only, excluded from product and analytics.

| # | Data class | Trigger | Retention | Rationale | Anchor / label | Deletion method | Backup behaviour |
|---|---|---|---|---|---|---|---|
| 1 | **Raw provider payloads** (JSON per fetch, HTTP metadata) | Fetch time | **13 months rolling**, then delete; deleted immediately with the connection if the user chooses "Elimina tutto da questa banca" | Re-run a year of reconciliation after mapping fixes; provider-switch without lock-in (PA-§7); dispute evidence | DECISION | Object lifecycle rule + DEK (E3) | Under DEK; 30-day backup window |
| 2 | **Normalised transactions, balances, accounts** | Account/connection life | Life of account; per-connection deletion on "Scollega → Elimina"; per-transaction "Elimina" for imported/manual items | The product | Contract (FACT) / DECISION | DEK shred (account) or row delete + tombstone (partial) | Under DEK |
| 3 | **Derived data** (categories, reconciliation links, merchant normalisation, recurring entities, insights, budgets) | Account life | Life of account; regenerated when sources change; special-category-feature labels deleted on consent withdrawal (C-SPECIAL) | The promise | DECISION | DEK shred / targeted delete | Under DEK |
| 4 | **User rules, corrections, Review-Inbox decisions, per-user model state** | Account life | Life of account; included in export | Rules win over AI; explainability | DECISION | DEK shred | Under DEK |
| 5 | **Receipt images** | Successful extraction | **90 days**, unless the user pins the image ("Conserva lo scontrino", e.g., for warranties) → life of account; failed extraction: 7 days | Images carry other people's data; itemisation needs only line items (NB-§6.3) | DECISION | Object lifecycle + DEK | Under DEK |
| 6 | **Receipt extracted data** (merchant, date, totals, line items, link to transaction) | Account life | Life of account | Product | DECISION | DEK shred | Under DEK |
| 7 | **E-mail ingestion — raw messages/attachments** (forward-to-inbox) | Arrival | Non-receipt mail: **discarded on arrival** (never stored beyond the parsing buffer, ≤ 24 h); receipts/invoices: **30 days** then delete raw; PDF invoices the user pins: life of account | Minimisation; Google Limited Use if OAuth is ever used (NB-§5) | DECISION | Lifecycle + DEK; inbound-mail vendor must not retain beyond delivery (contract) | Under DEK |
| 8 | **E-mail extracted data** | Account life | Life of account; deleted with C-EMAIL withdrawal if the user chooses | Product | DECISION | DEK shred / targeted | Under DEK |
| 9 | **Imported files** (CSV/XLSX/PDF) | Import | **30 days** then delete file; parsed transactions follow row 2; column mappings life of account | Fallback/history backfill (NB-§7) | DECISION | Lifecycle + DEK | Under DEK |
| 10 | **AI processing logs — content** (pseudonymised prompt, output, confidence, model id) | Call time | **30 days** | Quality, incident investigation, explainability; PLD evidence window balanced against minimisation (RL-§14) | DECISION | Lifecycle + DEK (E3) | Under DEK |
| 11 | **AI metrics — no content** (model id/version, latency, cost, acceptance rate, correction rate per category group) | Call time | **13 months** | Model governance; AI-Act deployer documentation | DECISION | Hard delete | Standard |
| 12 | **Consent and permission records** (`consent_event`, `connection` state history) | Event time | Life of account, then **archive 10 years** (proof of consent / defence of claims) | GDPR Art. 7(1) proof; art. 2946 c.c. | DECISION / ASSUMPTION (10-year anchor) | Immutable store; archive copy excluded from DEK shred (no transaction content inside) | Archive backed up separately, same 10 years |
| 13 | **Product analytics events** (semantic only) | Event time | **13 months** raw; aggregates indefinitely (no identifiers) | Garante 2021 guidelines; seasonality needs 13 months | DECISION | Hard delete by partition; pseudonymous id rotated on consent withdrawal | Standard (pseudonymised) |
| 14 | **Diagnostics / crash logs** (PII-scrubbed) | Event time | **90 days** | Reliability | DECISION | Hard delete | Standard |
| 15 | **Security logs** (auth events, API access; IP truncated after 7 days) | Event time | **12 months** | Security monitoring, incident forensics | DECISION (ASSUMPTION that 12 months is proportionate; Garante has accepted 6–12 months in practice — not verified) | Hard delete | Standard |
| 16 | **Audit log of privileged actions, exports, deletions, breaches** | Event time | **10 years**, no personal content beyond user id and action | Accountability (Art. 5(2), Art. 33(5)) | DECISION / ASSUMPTION | Immutable | Archive |
| 17 | **Identity & account** (e-mail, name, credentials, MFA, age attestation) | Account deletion | Deleted at the end of the deletion flow; **e-mail hash kept 12 months** in a "deleted accounts" list to prevent abuse of free trials and to honour "do not re-contact" | Contract; LI (abuse) | DECISION | DEK shred; hashed e-mail hard-deleted after 12 months | Under DEK / standard |
| 18 | **Sessions & devices** (push tokens, session ids) | Last use | Sessions **90 days** after last use; push tokens until logout/revocation; device records with the account | Security | DECISION | Hard delete | Standard |
| 19 | **Provider tokens & secrets** (E4) | Revocation/expiry | Destroyed immediately on revocation, expiry, connection deletion, account deletion; rotated per provider policy | Security | DECISION | Secret-manager delete + provider-side revoke | Secret store backups ≤ 7 days |
| 20 | **Support tickets** | Closure | **24 months**; attachments with personal data 90 days unless needed for the ticket | Help; patterns | DECISION | Hard delete; anonymise if the account is deleted earlier | Standard |
| 21 | **Billing & accounting** (store transaction ids, invoices, tax records) | Fiscal year end | **10 years** in archive; subscription state deleted with the account | art. 2220 c.c.; tax law | ASSUMPTION (anchor) / DECISION | Archive; hard delete at expiry | Archive |
| 22 | **Marketing lists & suppression** | Withdrawal | Opt-in data deleted at withdrawal; **suppression hash kept indefinitely** (to honour the opt-out) | art. 130 Codice privacy | DECISION | Hash only | Standard |
| 23 | **Vendor register, DPAs, TIAs, DPIA, Art. 30 records** | End of relationship | Relationship + **5 years** | Accountability; DORA readiness if status changes (RL-§4.3) | DECISION | Archive | Archive |
| 24 | **Legal-hold archive** | Hold release | Until release + 30 days | Legal claims (Art. 17(3)(e)) | DECISION | Hard delete at release | Separate, access-logged |
| 25 | **Dormant accounts** | Last activity (login or successful refresh) | Warning at **18 months**, second at **22 months**, deletion at **24 months** (full account-deletion flow) | Storage limitation; stale financial data is a liability | DECISION | Account-deletion flow | — |

Notes: (i) rows 1–11 are under the user's DEK → unreadable everywhere once the DEK is destroyed; (ii) rows 12, 16, 21, 23 deliberately contain **no transaction content** so that they can outlive the account; (iii) the provider's own retention of the data it fetched as a controller is **UNKNOWN per provider** (RFP question; see §9).

---

## 4. Triggers and timers (DECISION)

| Trigger | Effect |
|---|---|
| **Account deletion request** | §5.1 flow; all DEK-protected classes become unreadable at T+7 days (end of cool-off); non-DEK classes follow their own short periods or are hard-deleted at T+7 |
| **Connection revoked / deleted by the user** | Tokens destroyed immediately; provider consent revoked; raw payloads for that connection deleted immediately if "Elimina tutto" or at 13 months if "Conserva lo storico"; normalised data per the user's choice |
| **Connection revoked at the bank or provider** (webhook/polling) | Tokens destroyed; data kept (user still owns the ledger) until the user decides; connection shown as revoked in "Collegamenti" |
| **Consent withdrawal** (C-EMAIL, C-SPECIAL, C-ANALYTICS, P-AI) | Source-specific deletion per `consent-model.md` §2 (raw e-mails now; derived special-category labels now; pseudonymous analytics id rotated; AI logs continue to expire at 30 days — no new calls) |
| **Expired connection** (no renewal) | No deletion by itself; dormant-account timer continues from last activity |
| **Inactivity** | 18/22/24-month notices then deletion (row 25) |
| **Scheduled lifecycle jobs** | Daily: rows 1, 5, 7, 9, 10, 14, 18; monthly: rows 11, 13, 15, 20; yearly: rows 16, 21, 23 |
| **Legal hold placed** | Timers suspended for the hold scope only (§7) |

---

## 5. Deletion workflows

### 5.1 Account deletion (user-initiated; in-app "Elimina account" and web link) — DECISION; store rules FACT (Apple 5.1.1(v); Play User Data)

| Step | When | What happens | Evidence |
|---|---|---|---|
| 1 | T0 | User re-authenticates; sees what will be deleted and what is kept (billing records, consent proofs, audit entries; wording in plain Italian) and the 7-day cancel window; confirms | `consent_event` (K-CONTRACT withdrawn, pending) |
| 2 | T0 | Account enters `pending_deletion`: refresh stops, no new AI calls, push stops, analytics id rotated, app shows "Account in eliminazione — annulla entro il …" | Audit |
| 3 | T0 … T+7 d | User may cancel from the app or the confirmation e-mail link | Audit |
| 4 | T+7 d | **Revoke every provider consent** (provider API) and request bank-side revocation where supported; **destroy provider tokens** (E4) | Provider API responses logged |
| 5 | T+7 d | **Crypto-shred**: destroy the user's DEK(s) in the KMS; write a `deletion_log` entry (user id, timestamp, classes, DEK ids) | Audit + deletion log |
| 6 | T+7 d | Hard-delete E1 rows (sessions, device records, marketing opt-ins → suppression hash), purge caches, search indexes, queues, CDN objects; anonymise support tickets | Job report |
| 7 | T+7 … T+14 d | **Processor deletions**: inbound-mail vendor (messages), OCR/LLM (should hold nothing — zero retention; request confirmation), push vendor (token), analytics (pseudonym unlink), cloud object stores (lifecycle); collect confirmations | Vendor confirmations filed |
| 8 | T+7 d | **Carve-outs** moved/kept in archive: billing (10 y), consent proofs (10 y), audit (10 y), e-mail hash (12 m), suppression hash | Archive index |
| 9 | ≤ T+30 d | Confirmation e-mail to the user ("I tuoi dati sono stati eliminati il …; conserviamo solo …") | Sent-mail log (hash only) |
| 10 | Any restore after T+7 | `deletion_log` replayed: DEK ids remain destroyed; any resurrected E1 rows re-deleted | Restore runbook |

Target: 7 days typical, ≤ 30 days hard limit; the GDPR "one month" (Art. 12(3)) is never approached.

### 5.2 Connection deletion ("Scollega")

Revoke at provider → destroy tokens → user choice: **"Conserva lo storico"** (transactions stay as a closed account; raw payloads expire at 13 months) or **"Elimina tutto ciò che viene da questa banca"** (transactions, balances, raw payloads, derived data from that connection deleted now; reconciliation links to other accounts rewritten; a tombstone keeps the audit trail). Confirmation in-app. FACT that providers require a revoke surface (PA-§2.6).

### 5.3 Partial deletions

Receipt (image + extracted data, link removed); e-mail source (raw + extracted + alias); imported file (file now; transactions optional); chat history (now; AI logs expire at 30 days); single manual/imported transaction. Each writes a tombstone; API-sourced transactions cannot be "deleted" while the connection is live (they would re-sync) — they can be marked **"Privata"** or the connection deleted (`privacy-model.md` §5.2 S3).

### 5.4 Provider-side data (FACT on roles; UNKNOWN on periods)

The licensed AISP holds the data it fetched as a **separate controller**; Lilleri's deletion does not delete the provider's copy. Actions: (a) revoke consent at the provider on every deletion; (b) ask the provider for its retention and deletion policy and for a user-facing path (RFP, `legal-open-questions.md` Q4); (c) say it in the privacy notice: *"[Provider] conserva i dati che ha raccolto per conto tuo secondo la propria informativa: [link]"*.

### 5.5 Vendor-side data (DECISION)

Contracts require: zero retention for LLM/OCR (or documented abuse-monitoring minimum), inbound-mail provider retention ≤ 7 days, push vendor only tokens + templated text, analytics vendor (if any) pseudonymised with deletion API; **deletion within 30 days of our instruction** with written confirmation (Art. 28(3)(g)). Annual attestation; vendor register entry per `privacy-model.md` §3.3 row 21.

### 5.6 Dormant accounts (DECISION)

Inactivity = no login and no successful refresh. E-mail at 18 months ("Il tuo account Lilleri verrà eliminato tra 6 mesi se non accedi"), at 22 months, then the §5.1 flow at 24 months without cool-off cancellation after the final notice period. ASSUMPTION: 24 months is proportionate for financial data of a free user; counsel may prefer a shorter period for free tiers.

### 5.7 Employee / admin data (brief)

Access and break-glass logs 10 years (audit); staff accounts removed within 24 h of off-boarding; no personal data of users on endpoints (policy in `security/`).

---

## 6. Backup implications (DECISION)

| Topic | Policy | Why |
|---|---|---|
| Location | EU regions only; same provider/region family as production | `privacy-model.md` §12 |
| Encryption | Backups encrypted with platform keys **and** contain only DEK-encrypted user data for E2/E3 classes; DEKs are wrapped by KMS keys that are backed up separately (HSM-backed, 7-day retention) | Crypto-shredding works only if the DEK cannot come back from a backup |
| Retention window | Daily snapshots **30 days**; no long-term monthly archives of the production database (archives in §3 are separate, content-free) | Keeps "deleted" meaning deleted within the 30-day promise even for E1 rows |
| Deletion log replay | Every restore runs the `deletion_log` replay (DEK ids destroyed, E1 deletions re-applied, lifecycle jobs re-run) before the restored system serves traffic | Art. 17 + Art. 32 |
| Logs and analytics | Not under per-user DEKs → must already be pseudonymised and short-lived (§3 rows 13–15) so that backups add no risk | Minimisation |
| Restore testing | Quarterly restore drill including a deletion-replay check; results in the audit log | Art. 32(1)(d) |
| Retention of backups after a legal hold | Hold scope exported to the legal-hold archive; backups themselves are not extended | §7 |
| Provider/vendor backups | Addressed by contract: deletion within 30 days must cover vendor backups or state the bounded backup window (≤ 35 days) | Art. 28 |

---

## 7. Legal holds (DECISION; FACT on the GDPR exception)

| Element | Rule |
|---|---|
| Triggers | Litigation or credible threat; Garante/AGCM/Banca d'Italia inquiry; provider or app-store dispute; fraud/abuse investigation; law-enforcement request with a valid legal basis (Italian law; never on informal request) |
| Scope | Narrowest possible: named users/period/data classes; recorded in the **hold register** (owner, trigger, scope, start, review date, legal basis) |
| Effect | Lifecycle timers suspended for the scope; the data is **copied to the legal-hold archive** (DEK-independent copy, access-logged, DPO/legal only) so that the production deletion flow can still run for everything else |
| User rights | Erasure requests inside a hold are honoured for everything outside the scope; inside the scope erasure is refused only under **Art. 17(3)(e)** (establishment, exercise or defence of legal claims) with a written reasoning and the user informed (Art. 12(4)) |
| Approval & review | DPO + founder approval to place; review every **90 days**; release recorded; archive deleted 30 days after release |
| Transparency | Privacy notice states that data may be retained for legal claims; hold register available to the Garante on request |

---

## 8. Operational controls (DECISION)

- Retention periods are **configuration**, not code constants; each class has an owner, a job, a last-run metric and a "rows expired vs deleted" reconciliation.
- A **deletion certificate** (internal) is generated per account deletion listing classes, timestamps and vendor confirmations.
- The schedule is linked to the Art. 30 records and the DPIA; changes require DPO sign-off and a changelog entry.
- Annual review each **December** with the compliance review (`regulatory-landscape.md` §5), and on triggers: new data source (mailbox OAuth, notification listener), new vendor, new country, AISP registration (DORA would then add register-of-information retention and incident-record rules — RL-§4).

---

## 9. Decisions / Recommendations

| # | Decision / recommendation | Label |
|---|---|---|
| D1 | Adopt the schedule in §3 as the authoritative retention table; periods are configuration with DPO-owned change control. | DECISION |
| D2 | Per-user DEKs (E2/E3) and crypto-shredding as the deletion primitive; deletion log replayed on every restore; 30-day backup window; EU-only backups. | DECISION |
| D3 | Account deletion in-app and via web link, 7-day cool-off, ≤ 30 days end to end, provider consent revocation and token destruction as mandatory steps, carve-outs limited to content-free archives (billing, consent proofs, audit). | DECISION |
| D4 | Raw provider payloads 13 months; receipt images 90 days; raw e-mails 30 days (non-receipts discarded on arrival); imported files 30 days; AI content logs 30 days; analytics 13 months; security logs 12 months; dormant accounts 24 months. | DECISION (proposed values) |
| D5 | Legal holds are scoped, archived separately, DPO-approved, reviewed every 90 days; erasure refused only under Art. 17(3)(e). | DECISION |
| D6 | Every processor contract: deletion ≤ 30 days with confirmation, bounded backup window, zero retention for AI/OCR. | DECISION |
| R1 | Counsel to confirm the civil-code anchors (art. 2220, 2946), the dormant-account period for free users, and whether any Italian rule requires longer retention of consent proofs or of the app's transaction data (none identified). | RECOMMENDATION |
| R2 | RFP question to every provider: retention and deletion policy for data fetched under the user's consent; user-facing deletion path; backup window; data location. | RECOMMENDATION |
| R3 | Implement the retention jobs and the deletion certificate in the first vertical slice so that "delete my account" works on day one of beta. | RECOMMENDATION |

---

## 10. Open questions

| # | Question | Why it matters | How to resolve |
|---|---|---|---|
| OQ1 | Are art. 2220 (10-year accounting) and art. 2946 (10-year limitation) the right anchors, and does any Italian or EU rule impose retention of PFM transaction data or consent proofs beyond them? (None found; PSD2 and AML do not apply to Lilleri — RL-§6.4, §9.) | Archive design | Counsel (`legal-open-questions.md` Q3) |
| OQ2 | What retention does each shortlisted provider apply to data fetched as AISP, and can a user request deletion there? | Notice accuracy; user trust | RFP; provider privacy notices (TrueLayer stores "primarily in EEA/UK" — PA-§3.2; Salt Edge EU-only — PA-§3.4; others UNKNOWN) |
| OQ3 | Is a 13-month raw-payload window defensible under minimisation, or should it be 90 days plus on-demand re-fetch (user-present sessions are unlimited under the RTS)? | Storage of the richest copy | DPIA; engineering trade-off |
| OQ4 | Dormant-account period for free users: 24 months vs shorter | Proportionality | DPO/counsel |
| OQ5 | Security-log retention 12 months vs 6 months in the Garante's practice for a consumer app | Proportionality | DPO; Garante decisions review |
| OQ6 | Do AI content logs of 30 days give enough evidence under the Product Liability Directive (transposition by 9 Dec 2026) for defective-insight claims, or should metrics-only logs plus model versioning suffice? | PLD exposure (RL-§14) | Counsel after the Italian transposition is published |
| OQ7 | Vendor backup windows: can LLM/OCR/inbound-mail vendors contractually confirm ≤ 35-day backup retention and zero retention of content? (Vendor pages were blocked — RL-§6.5.) | Deletion promise | Read current DPAs; written confirmation |
| OQ8 | Law-enforcement requests: Italian procedure (decreto, richiesta ex art. 132 Codice privacy for traffic data does not apply to Lilleri — ASSUMPTION) and who in the company may respond | Legal-hold triggers | Counsel; written procedure |

---

## 11. Sources

Verification date for every row: **2026-10-02**. Full raw-note source table in `regulatory-landscape.md` §8.

| ID | Source | URL | Pub. date | Reliability | Used for |
|---|---|---|---|---|---|
| RL-§6.4 | Retention practice: live data while the account exists; logs 6–12 months; erase within 30 days except billing/accounting (10 years, art. 2220 c.c.) and claims evidence (art. 2946 c.c.); PSD2 imposes no retention on Lilleri; AML retention does not apply | https://www.normattiva.it (Codice civile, not fetched) | consolidated | high (law) / ASSUMPTION (articles not re-read) | §2 anchors; §3 rows 12, 16, 21 |
| RL-§9, RL S-57 | D.lgs. 231/2007 art. 3 — Lilleri not an obliged entity; AMLR 2024/1624 from 10 Jul 2027 | https://www.normattiva.it ; https://eur-lex.europa.eu/eli/reg/2024/1624/oj | consolidated / 2024 | high (not fetched) | No AML retention |
| RL-§6.4, RL S-26 | GDPR Art. 5(1)(e), 7(1), 12(3), 17, 17(3)(e), 28(3)(g), 32, 33(5); EDPB 06/2020 (provider as separate controller) | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-062020-interplay-second-payment-services-directive_en | 2016 / 2020 | high (not fetched) | Principles; legal holds; provider-side data |
| RL S-27 | Garante cookie guidelines 2021 (anonymised analytics; retention expectations) | https://www.garanteprivacy.it/web/guest/home/docweb/-/docweb-display/docweb/9677876 | 2021-06-10 | high (not fetched) | Analytics retention |
| RL S-32, S-74 / NB S-04 | Apple App Review Guideline 5.1.1(v) — in-app account deletion (first-hand, verbatim) | https://developer.apple.com/app-store/review/guidelines/ | 2026-06-08 | high | §5.1 |
| RL S-41; NEW-1 | Google Play Data safety; User Data policy (account deletion in-app + web; third-party AI clarification 15 Jul 2026) | https://developer.android.com/guide/topics/data/collect-share ; https://support.google.com/googleplay/android-developer/answer/10144311?hl=en | 2026 | high / medium-high (snippet) | §5.1; vendor deletion |
| PA-§2.6, §3.2, §3.4, §7 | Provider revoke surfaces; TrueLayer stores "primarily within Europe (EEA) and the UK"; Salt Edge "EU/EEA users' data stored only in the EU"; store raw payloads in a canonical schema to avoid lock-in | https://truelayer.com/legal/privacy/ ; https://www.saltedge.com/legal/privacy_policy ; https://docs.truelayer.com/docs/collect-user-consent | n/d | high | §3 row 1 rationale; §5.4; OQ2 |
| PA #43 | Tink consent reconfirmation — late renewal re-fetches only 90 days | https://docs.tink.com/resources/transactions/consent-reconfirmation | n/d | high (mirror) | Why user-present re-fetch is limited (OQ3) |
| RL S-04 / PA #3 | EBA Q&A 2019_4631 — user-present requests unlimited | https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2019_4631 | n/d | high | OQ3 |
| NB-§5, §6, §7 | E-mail ingestion (forward-to-inbox; discard non-receipts; short attachment retention); receipt images may contain others' data; file imports | https://developers.google.com/workspace/gmail/api/auth/scopes ; https://cloud.google.com/document-ai/pricing | n/d | medium-high | §3 rows 5–9 |
| RL-§4, RL S-21; NEW-4 | DORA + Delegated Reg. 2025/532 — register of information and incident records would apply only if Lilleri registers as AISP | https://eur-lex.europa.eu/eli/reg/2022/2554/oj ; https://www.jonesday.com/en/insights/2025/07/uniform-standards-for-ict-subcontracting-in-eu-financial-sector-new-obligations | 2022–2025 | high / medium-high | §8 trigger |
| RL-§14, RL S-67 | Product Liability Directive (EU) 2024/2853 (transposition by 9 Dec 2026) | https://eur-lex.europa.eu/eli/dir/2024/2853/oj | 2024-11-18 | high (not fetched) | AI-log window (OQ6) |
| RL-§6.5, RL S-31, S-76; NEW-5 | DPF status; EU residency recommendation | https://curia.europa.eu/juris/liste.jsf?num=C-703/25%20P | 2025–2026 | high / medium | EU-only backups |

*End of document.*
