# Privacy model — purposes, data, roles and real-data release gates

**Project:** Lilleri, Italy-first PFM; proposed unlicensed recipient arrangement, not established authorisation.
**Review date:** 2026-10-02. **Retained source dates:** 2026-10-02; publication dates in §15 are unchanged.
**Status:** proposed controls and counsel/DPIA inputs. These are not implemented-control claims or signed legal conclusions.

## How to read this document

**FACT** means supported at the retained evidence level; **ASSUMPTION** is a working input; **HYPOTHESIS** an interpretation; **DECISION** a project choice; **UNKNOWN / OPEN QUESTION** a production gap. Evidence is raw RL (regulatory), NB (non-bank/OS), PA/PB (provider) sections and the earlier synthesis's NEW sources in `regulatory-landscape.md` §8. This review did not freshly fetch legal texts, policies or DPAs. Reported 2026 changes remain reported, not certified current law. Retention is controlled by `data-retention.md`.

## 1. Executive summary

- **DECISION:** operate the present build with synthetic financial data only. A real-data beta requires a DPIA, signed lawful-basis/Article 9 assessment, approved provider roles/route and vendor contracts, and tested rights/security controls.
- **HYPOTHESIS:** Lilleri determines the PFM purposes and is a controller; the licensed AISP is usually a controller for its AIS. Roles follow actual purposes and means, not the title of a DPA. Cloud/AI/OCR/mail vendors are not automatically processors for every use; assess service processing, abuse monitoring, training and remote support separately.
- **HYPOTHESIS:** narrowly necessary PFM processing can rely on Art. 6(1)(b). Necessity must be established purpose by purpose; an optional feature, contract clause or store permission does not itself create a lawful basis. PSD2 explicit consent, GDPR basis, Article 9 condition, OS permission and SCA are separate.
- **FACT (retained EDPB 06/2020 description, RL-§6.2):** raw transactions can reveal special categories. Renaming “health” to “pharmacy”, hiding a category or excluding an insight does not remove raw collection/storage/processing. Minimise before classification/vendor disclosure; if avoidance cannot be achieved, obtain a valid Art. 9 condition or omit that processing.
- **DECISION:** complete a DPIA before real-data beta regardless of launch-size threshold. Requirement is **likely (HYPOTHESIS)** from systematic financial monitoring, profiling and innovative processing; confirm Garante list applicability and scale (RL-§6.4). Consult under Art. 36 if unmitigated high risk remains.

## 2. Roles and lawful bases

### 2.1 Role assessment

| Processing | Proposed role / evidence | Required closure |
|---|---|---|
| Bank AIS | Provider controller for its licensed service; Lilleri recipient then controller for its PFM purposes (**HYPOTHESIS**, retained EDPB logic; RL-§6.1) | Actual EU entity, Italian passport, purposes, user/provider contracts; Q1/Q4 |
| Provider hosted/embedded consent UX | Independent roles or joint determination possible; **UNKNOWN**. Hosting a screen alone proves neither joint controllership nor processing | Determine purposes/means; Art. 26 arrangement if jointly determined; responsibilities and notice |
| Ledger/reconciliation/rules/insights | Lilleri controller (**HYPOTHESIS** based on intended product) | Document necessity, purpose, scope and rights |
| Cloud, OCR, external AI, mail, push, analytics | Processor for instructed purposes only if actual terms/uses fit Art. 28; independent or joint purposes may exist (**UNKNOWN**) | Purpose-specific roles, DPA where applicable, subprocessors, retention, training, support access, location |
| Apple/Google purchase processing | Separate purchase/controller roles reported; Lilleri controls entitlement/accounting (**ASSUMPTION**) | Current store terms and notices |
| Counterparty “silent party” data | Personal data of people without a Lilleri contract; narrowly scoped LI may be available (**HYPOTHESIS**, RL-§6.1) | LIA, purpose limitation, Art. 14 transparency/exemption analysis, safeguards; no counterparty marketing/profiling |
| Household/shared accounts | Lilleri controller; one member's permission cannot grant rights over every other member's data (**UNKNOWN** perimeter) | Authority/access model, notices, invitations, revocation and subject-specific export/deletion |

### 2.2 Purpose-specific basis map (proposed; counsel approval required)

| Purpose | Proposed Article 6 basis / extra condition | Assessment needed |
|---|---|---|
| Account, authentication and core ledger/reconciliation | Contract for objectively necessary requested service (**HYPOTHESIS**) | Separate security/legal obligations and optional processing; service promise alone is not necessity |
| Rules/in-house personal classification, recurrence, insights | Contract only to extent necessary (**HYPOTHESIS**); profiling assessment | Art. 22 depends on significant effects, not label; general transparency applies. Art. 21 objection attaches to LI/public-interest/marketing bases, not every contract-based profile |
| External AI classification/OCR/chat | Per-purpose necessity/basis assessment + optional **P-AI store permission** | Permission is not automatically Art. 6 consent; no calls without reviewed basis, purpose, vendor/transfer and Art. 9 handling |
| Raw/inferred health, beliefs, union, political, sex-life/orientation data | **Art. 6 basis + separate Art. 9(2) condition**, if processed; no condition established here | Avoid where feasible. Explicit consent may be available but must cover actual affected data subjects; account holder cannot consent for a counterparty |
| Criminal-offence/conviction inference | **Art. 10 legal authority**, not Art. 9 consent | Avoid criminal inference; lawyers/fines do not automatically prove criminal data |
| User-initiated receipt/import | Contract for requested feature (**HYPOTHESIS**) + required OS/store permission | Itemisation can reveal special categories/third parties; inspect/filter and minimise |
| Forwarded receipts / mailbox OAuth | Optional consent proposed (**DECISION**); forwarding vs mailbox access assessed separately | Scope, withdrawal/deletion; OAuth Limited Use restrictions when applicable; third-party sender data |
| Android notification listener | Optional consent + OS special access + Play disclosures proposed; **post-MVP** | Reading all notifications is intrusive even if on-device; filter before retention, no raw upload; renewed DPIA |
| Product analytics identifiers/device access | Consent unless actual statutory exemption established (RL-§7 retained description) | Removing identifiers is insufficient proof of anonymity; device rules and GDPR assessed separately |
| Necessary diagnostics / service push | Contract/LI where justified; necessary device exemption and OS permission assessed separately (**HYPOTHESIS**) | Pure service content only; do not bundle marketing; minimise telemetry |
| Marketing/promotional profiling | Consent proposed; separate channel/purpose choices | Art. 130/soft-opt-in scope confirmed before use; excluded from v1 |
| Security/abuse logs | LI + LIA or identified legal obligation (**HYPOTHESIS**) | No unspecified “legal obligation”; proportionate data/time |
| Billing/accounting | Identified legal obligation where applicable (**HYPOTHESIS**) | Confirm record classes, civil/tax periods, trigger and entity |
| Cross-user model improvement | **Disabled for personal financial data in v1 (DECISION)** | Pseudonymisation is not anonymisation. Any later LI requires fresh compatibility/LIA/PSD2-purpose/Art. 9 review; opt-out does not cure invalid basis |
| Support/rights records | Contract/LI/identified accountability obligation according to purpose (**HYPOTHESIS**) | Narrow records and retention; no free-form transaction content by default |

## 3. Data inventory

### 3.1 Protection classes (DECISION; proposed, not implemented)

| Class | Protection | Limit |
|---|---|---|
| **E1** | TLS + platform encryption at rest, least privilege | Encryption does not anonymise data |
| **E2** | E1 + per-user envelope encryption/key isolation where validated | Live DEK deletion alone does not erase recoverable wrapped-key backups; effectiveness must be tested |
| **E3** | E2 + field tokenisation/encryption and no routine human content access; approved audited break-glass | Tokenisation remains personal data; service jobs still process content |
| **E4** | Separate secret manager/service credentials; scoped access and rotation/revocation | Secret-store backups and provider revocation are separate deletion tasks |

### 3.2 Access roles (DECISION)

Users access authorised own/shared data; support sees masked metadata and uses user-granted time-limited content access when appropriate; emergency access requires justified scope, approval, expiry and audit. Security/on-call access is least privilege. Product/data staff receive reviewed aggregates; a small cell or rare merchant can identify a person. Processors receive only function-scoped payloads. DPO/legal advise and inspect justified rights/incident records; the controller remains accountable for decisions.

### 3.3 Inventory — proposed uses, with no real-data collection authorised by this table

| Data class | Examples / purpose | Proposed basis | Retention reference | Protection / access |
|---|---|---|---|---|
| Identity/age | Email, display name, auth factors, locale, 18+ attestation | Account contract; security assessment | Account life; deletion schedule | E2; user, masked support, security |
| Devices/sessions | OS/build, login metadata, push tokens | Security/service purpose | Sessions ≤ 90 days from last use; push until revoked | E2/E4; security/service |
| Connections/consent/SCA | Provider/entity, scopes/accounts, actual consent/SCA/session expiry, revocation, freshness | Reviewed service/consent evidence | Connection life; minimised evidence separately | E2/E3; user, masked support, service |
| Provider secrets | Access/refresh tokens, webhook keys | Reviewed connection purpose | Revoke/destroy promptly | E4; service only |
| Raw provider payloads | Received JSON, descriptions/identifiers for normalisation/error resolution | Subject to Art. 6/9/10 and field minimisation | **30 days after successful normalisation; 90-day justified ceiling; quarantine 7 days** | E3; jobs, approved break-glass |
| Transactions/accounts/balances | Dates, minor-unit amounts/currency, descriptions, provider ID, counterparties, source | Reviewed core service; silent-party LIA | Account life or earlier source deletion | E2; identifiers/raw sensitive text E3; user/service |
| Derived labels/links/recurrence | Confidence, reversible classification/reconciliation, insights | Per-purpose basis; Art. 9/10 where relevant | Account/source life; invalidate on deletion/withdrawal | E2/E3; user/service |
| Rules/feedback/user model | Corrections, deterministic preferences, exclusions | Reviewed personal service | Account life; no cross-user personal training | E2; user/service |
| Receipt images/items | Photo/PDF, merchant/date/total/line items | Requested feature + assessed sensitive data/permission | Image 90 days, failed7 days; pinned only by choice; items account life | E3; user, approved OCR |
| Email | Forwarded receipt, minimal headers, extracted items | Optional reviewed purpose; sender safeguards | Non-receipts discard; receipt raw 30 days; extracted schedule | E3; parser, approved inbound vendor |
| Import files | CSV/XLSX/PDF + mappings | Requested import purpose | File 30 days; parsed rows/source lifecycle | E3; user/service |
| AI content/metrics | Minimal pseudonymised prompt/output; model/version/cost/latency | Reviewed service/quality basis; sensitive-data exclusions | **No content logs by default**; justified incident sample ≤ 7 days; metrics 13 months | E3 for content; reviewed metrics access |
| Consent/permission evidence | Exact text/hash/version, scope, timestamp/action and source | Purpose-specific accountability/claims basis | Minimised account-life evidence; exceptional archive only per schedule | Separate restricted key/storage if archived |
| Analytics/diagnostics | Semantic action enums; scrubbed crashes | Consent/exemption assessment | Analytics 13 months only if justified; crashes 90 days | E1; no transaction details; pseudonymous not anonymous |
| Security/audit | Auth/access/privileged/delete/incident metadata | LIA/identified obligations | Security6 months default, justified≤ 12; normal audit12 months | Restricted; no transaction content; exceptional claim hold |
| Support | User-supplied messages/attachments | Purpose-specific contract/LI | Ticket24 months maximum; attachments90 days; earlier erasure | E2/E3; support |
| Billing | Store IDs/invoices/entitlement | Contract/identified accounting law | Record-specific period, 10-year proposal pending counsel | Restricted finance archive |
| Marketing/suppression | Permission state, minimal suppression token | Reviewed purpose, off in v1 | Only while needed to honour applicable opt-out; periodic review | Restricted; tokens remain personal data |
| Vendor/DPIA/ROPA evidence | DPA/TIA/location/roles/control decisions | Accountability purpose | Relationship + 5 years proposed; no transaction content | Compliance/legal |
| Household membership | Invitations/access scope/history ownership | Reviewed shared-service purpose | Membership/source lifecycle; identity minimisation | Tenant and person isolation; export/delete tested |

**DECISION: non-collection:** no bank credentials, full PAN, contacts, installed-app inventory, precise location, ad identifiers, biometric templates or blanket identity documents in MVP. This is a project minimisation boundary, not a claim that PSD2's “sensitive payment data” means all confidential financial data or that every provider can never request user verification.

## 4. Data minimisation decisions

- **DECISION:** allowlist necessary provider fields before durable storage. Raw payload retention is short and justified; a year of reprocessing convenience does not establish necessity. Quarantine is isolated and expires.
- **DECISION:** tokenise/mask account identifiers; silent-party data stays inside the requested ledger/reconciliation, with no cross-user profile, advertising or vendor identifier disclosure.
- **DECISION:** external AI payload builders remove IBANs, account/user IDs, personal counterparties, precise location and unnecessary times/amounts; descriptions can still reveal identity or sensitive traits after direct identifiers are removed. Pseudonymised merchant text remains potentially personal data.
- **DECISION:** do not send raw/provider or “quiet set” content to external AI pending an approved assessment. A broad label is insufficient if accompanying amount/date/context identifies the merchant or inference.
- **DECISION:** no financial content in crash reports, traces, semantic analytics, notifications, support screenshots or routine audit. Push bodies are generic so lock-screen/processor exposure does not disclose spending/balances.
- **DECISION:** every derivative/index/cache/model-state must track provenance sufficient for source deletion, withdrawal and shared-account rectification.

## 5. Special-category and criminal-data risks

### 5.1 Signals do not prove traits (FACT on potential risk; inference likelihood UNKNOWN)

| Signal | Potential sensitive revelation | Required handling |
|---|---|---|
| Clinic/pharmacy/therapy/receipt line items | Health, if content actually reveals it | Review raw fields and derived use; merchant type does not prove illness |
| Political/religious organisation or union payment | Opinion/belief/membership | Avoid trait profiles; valid Art. 9 condition if processing revealed data |
| Dating/sexual-health/religious-school/ethnic context | Sex life/orientation, belief, ethnicity in some contexts | No speculative trait inference or assumed characteristic |
| Lawyer/fine/court payment | Potential Article 10 conviction/offence content | No criminal inference; general legal fee ≠ criminal conviction; explicit consent alone is insufficient |
| Counterparty or household material | Sensitive data of another person | Holder's consent does not establish that other person's condition/basis |

### 5.2 Controls and residual risk (DECISION)

| Control | Resolution | Residual uncertainty |
|---|---|---|
| Avoid trait classification | No diagnoses/religion/politics/union/sexual/criminal categories or targeting; counsel reviews final neutral taxonomy | A neutral label does not erase sensitive raw content |
| Filter/minimise before downstream use | Provider field negotiation and ingestion allowlist; suppress unnecessary identifiers/descriptions where feasible | Detection itself can process sensitive data; document unavoidable steps and legal condition |
| Quiet-set exclusion | Exclude potentially sensitive material from narrative insights, external AI, analytics, marketing and model-improvement datasets | Risk mitigation only; not an Article 9 exemption or legal approval |
| Private/hide setting | Respect in summaries/support/vendor payloads; user export still includes authorised own data by explicit choice | Display preference does not equal erasure or source filtering |
| User-requested sensitive arithmetic | Disabled until actual raw/derived-data legal assessment closes; a chat query is not automatically explicit consent | Relevant Article 9 condition and effective withdrawal required |
| Future explicit consent | Specific unbundled purpose/data disclosure; record proof; stop/revoke and delete affected derivatives when basis ends | Must be freely given and relate to affected subjects; other Article 6/transfer duties remain |
| Truthful privacy copy | “Non usiamo i movimenti per dedurre salute, religione o opinioni politiche. Alcune descrizioni possono comunque rivelare dati delicati: [misure verificate].” | Do not claim that Lilleri stores no sensitive data unless data-flow evidence proves it |

## 6. Analytics privacy rules (DECISION)

Semantic events only (`connection_added`, `export_requested`, `inbox_item_resolved{kind}`); no descriptions, merchants, IBANs, counterparties, exact/rounded amounts, receipt/email/chat content or sensitive category dimensions. Disable third-party ad/tracking SDKs. Necessary first-party operational telemetry is assessed separately from optional product analytics. Consent refusal stops consent-based identifiers and associated processing; deleting/rotating an identifier does not erase the old data. Truncated IP/rotating IDs do not establish anonymity: require re-identification assessment, aggregation thresholds and device-access exemption analysis. Actual App Privacy/Data safety declarations follow SDK/transfer/role audit, not a preselected “no sharing” label.

## 7. AI/vendor and transfer requirements (DECISION)

| Requirement | Evidence before enablement |
|---|---|
| Purpose-specific roles/basis | Identify processor instructions and any vendor independent purposes; Art. 28 contract where applicable; no personal financial training |
| EU storage/inference preferred | Contract/region configuration; subprocessors, logs, backups, remote support/admin access and transfer paths verified |
| No input/output training and minimum retention | Actual contract tier and settings, abuse-monitoring/human-access exceptions, bounded backups/deletion, audit evidence; do not promise “retains nothing” while exceptions exist |
| Minimal payload + Article 9 safeguards | Reviewed builder and red-team sample; no silent-party identifiers/quiet-set material; pseudonymisation still subject to GDPR |
| Optional explicit P-AI permission | Apple 5.1.2(i) retained first-hand wording; Play general User Data obligations assessed. **Exact July 2026 AI-specific change UNKNOWN** (NEW-1 vs raw AV3) |
| Switch/incident/delete capability | Contractual exit, deletion interface, prompt vendor breach reporting; quality fallback validated before optional AI |
| Transfer mechanism | Check current adequacy scope/vendor certification or SCCs + TIA and supplementary measures as applicable. Contingency is a DECISION; DPF litigation does not itself invalidate an adequacy decision |

Draft copy must name the **actual** vendor, fields, purpose, locations, retention exceptions and fallback. “Operates in Europe” and “retains nothing” cannot ship from marketing claims. Ask at first use requiring external AI, not before the user needs it. Chat identifies itself as AI and uses deterministic arithmetic with source/confidence explanations; this does not establish regulatory classification.

## 8. DPIA outline and acceptance gate

**DECISION:** complete before any real-user financial-data beta; mock/synthetic tests can proceed. **HYPOTHESIS:** requirement likely under Article 35/Garante criteria; scale and exact criteria to be documented rather than assumed.

1. Describe purposes, intended effects, user/household/counterparty subjects, scale, collection/ingestion/derivative/vendor/backup flows and controller/processor roles.
2. Establish necessity, Article 6 basis, Article 9/10 conditions, silent-party transparency, access boundaries, source limitations, retention and rights. Assess rejection of more intrusive alternatives.
3. Assess sensitive raw/inferred data, unauthorised history access, insiders/support, shared-account misuse, inaccurate insights, over-collection, re-identification, vendor training/transfers, stale/gapped data, minors and permission coercion.
4. Record tested minimisation, isolation, reversibility, encryption/key lifecycle, deletion/restore, rights, vendor/consent gates and incident controls with owner/evidence/residual risk.
5. Obtain DPO advice, counsel assessment and comprehension research. The controller accepts accountable residual-risk decisions; **Art. 36 prior consultation required if applicable high risk remains unmitigated**. Implementation of a quiet set alone cannot close that assessment.
6. Sign off and review on new source, AI use, vendor, household behaviour, market, scale or legal/policy change. No sign-off exists in this document.

## 9. Rights flows (DECISION; legal scope requires review)

| Flow | Product target | Legal distinction / limit |
|---|---|---|
| Access / portability | Secure own-data JSON/CSV export, usually minutes; enforce household/third-party scope | Art. 15 access includes relevant personal data; Art. 20 portability scope differs and does not automatically include every inferred datum; richer export is a product choice |
| Rectification | Immediate user corrections; retain source/provenance and contested-data status | User category preference is not proof that bank source data changed |
| Account erasure | Re-auth proportionate to risk; stop processing/revoke promptly; active deletion without mandatory 7-day delay; end-to-end target≤ 30 days | Art. 12(3) response is **one calendar month**, extension up to two further months where conditions met and informed in first month; erasure is without undue delay subject to lawful exceptions |
| Source/partial erasure | Delete connection/receipt/email/chat/derived state with provenance | Live-connection re-ingest is managed by exclusion/scope or disconnection; “private” is not erasure |
| AIS withdrawal | Stop access immediately, revoke at provider, destroy tokens, offer separate keep/delete history choice | AIS withdrawal is distinct from GDPR erasure and contract termination |
| GDPR withdrawal | Stop affected purpose, delete/restrict material if no independent valid basis remains, including derivatives/processor copies | Does not retroactively invalidate prior lawful processing; special-data withdrawal needs raw + derivative review |
| Objection / restriction | Support applicable Art. 21/18 requests; voluntary rules-only/insight-off settings | Art. 21 scope depends on basis; contract-based profiling does not have universal objection right; Art. 22 significance assessment remains |
| Complaint / heirs | DPO/controller contact, Garante information; documented heirs procedure | Art. 2-terdecies scope/limitations require counsel; no blanket claim that a toggle defeats heirs' legal rights |

Authenticate external requests proportionately; do not rely on email alone for sensitive exports or collect ID documents automatically. Account deletion does not automatically cancel app-store billing; explain and link cancellation as a separate action without delaying deletion.

## 10. DPO and accountability

**DECISION:** appoint an independent external DPO before real-data beta. **UNKNOWN:** statutory mandatoriness at actual launch scale (Art. 37 monitoring/large-scale tests). Assess annually and on scale changes. DPO advises and monitors; management/controller owns DPIA, retention, breach and release decisions. Do not claim the DPO is cheap without a quote or expected solely by product category.

## 11. Breach clocks (retained GDPR descriptions; proposed operating targets)

| Clock | Obligation / target |
|---|---|
| Processor → controller | Art. 33(2) **without undue delay**. Proposed contractual initial alert≤ 12 h from awareness, continuous updates; no 24-hour waiting entitlement |
| Provider ↔ Lilleri | Separate controllers assess own duties; mutual **without undue delay** alerts for shared-user incidents, proposed ≤ 12 h initial contractual target. DORA reporting is separate and role-specific |
| Lilleri → authority | Art. 33(1): **without undue delay and, where feasible,≤ 72 h from controller awareness**, unless unlikely to risk rights/freedoms. Investigate immediately; 72 h is maximum qualified reporting window, not time to begin; late notice needs reasons; phased notice available |
| Lilleri → affected people | Art. 34: **without undue delay when high risk**, subject to applicable exceptions. Separate parallel risk assessment; never wait until 72 h after authority filing |
| Internal | Alert incident lead immediately; initial controller risk decision target≤ 12 h; draft notice target≤24 h; qualified decision-maker available even if DPO absent. Evidence may change the decision |
| Record | Document every personal-data breach and reasons/notifications under Art. 33(5); incident awareness and decisions timestamped, no unnecessary financial content |

Deletion/credential rotation must be coordinated with containment and justified evidence preservation; do not wait for vendor full root-cause reports or DPO signature to start/report.

## 12. International transfers and residency

**DECISION:** prefer EU storage/inference; inspect remote access, telemetry, backups and subprocessor paths. EU regions do not alone prove no Chapter V transfer. Current DPF/vendor certification, UK adequacy and the cited case docket are **UNKNOWN in this review**; retained RL-§6.5/NEW-5 status is not freshly verified. Select an actually valid mechanism for each flow; SCC/TIA contingency may help but is not a universally mandatory duplicate of valid adequacy and not a guarantee against future migration. Expansion needs local/privacy authority assessment (legal Q11).

## Review log

**Date:** 2026-10-02. **Method:** retained evidence comparison; no fresh legal/vendor access.

| Critique | Resolution | Remaining human production blocker |
|---|---|---|
| Core contract basis treated as fact for every feature; vendor roles “decided by DPA” | Per-purpose necessity/basis and factual role assessment; separate silent parties/households and vendor independent uses | Counsel basis/roles/LIA/Art. 14 memo + actual terms |
| Neutral taxonomy/quiet set assumed to avoid Article 9 | Addressed raw collection, filtering, derived labels and other subjects; user chat request not consent | Article 9/10 condition, taxonomy/data-flow memo and DPIA |
| DPIA automatic legal fact; DPO gate ownership mistaken | Likely statutory trigger assessed separately; DPIA project gate; DPO advises, controller decides | Completed DPIA + governance appointment + residual-risk evidence |
| EU/zero-retention/privacy-label promises exceeded vendor evidence | Scope-specific contracts, access/transfer/retention proof; truthfully disclosed exceptions; Play-date conflict retained as unknown | Vendor approval, configuration audit, actual privacy notice/store labels |
| Crypto-erasure and rights deadlines overstated | Tested key/backup deletion required; one-calendar-month response distinct from erasure target; no forced cool-off | Working export/delete/source/household controls and restore evidence |
| User breach notice delayed until authority filing +72 h | Parallel without-undue-delay clock; immediate investigation; accountable controller decision | Staffed tested incident runbook and contractual cooperation |

**Gate verdict:** **PASS WITH CONDITIONS for synthetic engineering design; real-data beta/production BLOCKED**. No blanket Article 9, DPIA, transfer, vendor or implemented-security approval is implied.

## 13. Decisions / Recommendations

Adopt the proposed minimisation/access/rights model, short raw retention and disabled financial-content training. Complete DPIA and signed bases/roles/Article 9 review before real data; keep external AI off until purpose/vendor/transfer/permission evidence is complete. Appoint independent DPO advice, test deletion and incident clocks, and publish only substantiated privacy claims.

## 14. Open questions

| Question | Closure evidence |
|---|---|
| Can raw sensitive data be avoided, and what conditions cover unavoidable processing/other subjects? | Counsel + DPO Article 9/10/14 memo, source field controls |
| Which purposes qualify as contract-necessary, and what profiling/Art. 22 rights apply? | Signed basis map, LIA/compatibility and intended-effects review |
| What are provider/household/vendor roles and transfer/retention exceptions? | Actual agreements, flow inventory and settings evidence |
| Is DPO required and must high residual risk be consulted under Art. 36? | Threshold assessment and completed DPIA |
| Can key deletion, partial/shared deletion, export isolation and incident reporting be demonstrated? | Engineering/security operating evidence |
| What current policies/adequacy/AI amendments and heirs rules apply? | Current primary consolidated text; Q3/Q6/Q11/Q20 |

## 15. Sources

Retained research date for these rows: **2026-10-02**; publication dates and access limitations are preserved. The present review did not re-fetch these sources. Access status as recorded in the raw notes (primary legal texts not fetched; see `regulatory-landscape.md` §8 for the full table).

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
