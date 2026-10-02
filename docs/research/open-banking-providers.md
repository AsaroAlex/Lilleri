# Open banking providers for Lilleri: evaluation, Italian PSD2 mechanics, licensing route and decision

**Project:** LILLERI (greenfield consumer PFM, Italy-first then Europe; no AISP licence of its own)
**Date / verification date for every claim:** 2026-10-02
**Author:** open banking + PSD2/open finance specialist + CTO fintech, founding team
**Status:** Phase 1 synthesis of the raw research in `docs/research/raw/open-banking-providers-a.md` (group A: Tink, TrueLayer, Yapily, Salt Edge), `open-banking-providers-b.md` (group B: Fabrick, GoCardless BAD, Enable Banking, Powens, Plaid, Neonomics, Mastercard, Klarna Kosma, finAPI, Qwist, Bud, CBI Globe direct), `non-bank-sources-and-os-limits.md` and `regulatory-landscape.md`, plus 10 WebSearch queries run on 2026-10-02 for this document (tagged `NEW-n`). Companion documents: `provider-capability-matrix.md` (scored matrix), `provider-cost-model.md` (cost scenarios), `data-sources-feasibility.md` (multi-source strategy).

**Review provenance (DECISION, 2026-10-02):** this revision checks repository evidence, source consistency and design implications. Source URLs/access dates below are inherited observations, not fresh web verification. FACT means the cited observation is recorded; vendor performance, source independence, market prevalence and current legal/commercial eligibility remain unverified where stated.

## How to read this document

- **Labels.** Every variable claim carries FACT / ASSUMPTION / HYPOTHESIS / DECISION / OPEN QUESTION / UNKNOWN. A FACT inherited from the raw notes keeps the raw note's caveat: most provider and legal pages were read as search-engine excerpts or through documentation mirrors, not as full page reads, so "FACT" means "stated on the cited page as seen on 2026-10-02" and must be re-read before any contract is signed. Nothing here is legal advice.
- **Source tags.** `A-§x` = `open-banking-providers-a.md` section x; `B-§x` = `open-banking-providers-b.md`; `NB-§x` = `non-bank-sources-and-os-limits.md`; `REG-§x` = `regulatory-landscape.md`; `NEW-n` = search run for this document. Full URL list with verification dates in the Sources section.
- **Priorities applied.** Lilleri's order of priorities is trust, data correctness, security, simplicity, automation, reliability, privacy, speed, UX, brand recognition, cost, monetisation, feature count. Cost is deliberately low in this order; it is still a real constraint for a pre-seed company, which is why the decision below has explicit price gates.

---

## 0. Executive summary

1. **Providers advertise a possible Italian recipient route without Lilleri holding its own licence** through at least six providers that publish a "recipient under our licence" model for EEA users (route A): Yapily Connect UAB (Bank of Lithuania), TrueLayer (Ireland) Ltd (Central Bank of Ireland), Tink AB (Finansinspektionen; customer on Tink's licence after KYC), Enable Banking (FIN-FSA), Mastercard Open Finance Europe ("Aiia Data … do not require a license"), Powens (ACPR) and, uniquely Italian-supervised, Fabrick S.p.A. ("Fabrick Pass", Banca d'Italia payment institution since May 2020). FACT for the existence of retained provider claims; UNKNOWN for current terms and Lilleri’s eligibility; UNKNOWN for Banca d'Italia's written position on an unlicensed Italian recipient of AIS data (P0 counsel question, unresolved in four research passes) [A-§2.6, B-§15, REG-§10.2].
2. **The agent route (B) is legally foreseen but commercially exceptional.** Tink AB lists exactly one registered agent (An Post, Ireland); TrueLayer frames agency as a bridge "while you are waiting for your licence to be approved by the FCA"; Yapily does not use the construct for EEA users. FACT [A-§2.6 AV2, REG-§10.2]. Do not plan the launch around B.
3. **Own AISP registration (route C)** is a 90-day statutory decision on a complete file (FACT) that realistically takes 6–12 months end to end (HYPOTHESIS), with professional-indemnity insurance but no capital requirement; it is the phase-2 lever that unlocks direct CBI Globe access ("100 % of Italian banks with a single integration", Nexi/CBI claim) [B-§13, B-§15.2].
4. **A shared gateway does not make provider data behaviour identical.** The ~80 % CBI figure is historical source evidence. Article 10a’s 180-day SCA condition is distinct from AIS consent validity and the 90-day information scope of that exemption. Four unattended accesses per 24 h is the default unless a higher frequency is agreed; it is not four complete refreshes. History, bank windows, fields and throttling require measurement per bank/provider. Retained research reports PSD3/PSR **not adopted/not operative; fresh consolidated status UNKNOWN in this review** (OEIL: awaiting Council first-reading position; indicative plenary 14 Dec 2026; application ≈ mid-2028+) [A-§2.1–2.3, REG-§2].
5. **Credit cards are the weak spot of Italian open banking.** Nexi exposes AIS only for its prepaid cards; UniCredit, Mediolanum and Crédit Agricole card accounts were absent through Enable Banking in the retained March2026 observation; current/other-provider coverage UNKNOWN; Fineco card accounts appeared at Enable Banking in March 2026; Amex Italy is UNKNOWN. PayPal has a PSD2 interface but coverage is provider-specific (Tink's Italian list has no PayPal); Satispay publishes an XS2A portal but no aggregator listing was found; Hype coverage is UNKNOWN at every provider, including Fabrick; group membership does not prove an integration [A-§2.3, B-§1, NB-§1–2].
6. **Pricing is sales-led everywhere.** No first-party price list exists for any shortlisted provider; the only public figures are third-party listing sites copying each other (Tink ≈ €0.50/user/month; Yapily ≈ £200–500/month entry; Salt Edge "Growth $500/month" from a 2019 card). Enable Banking confirms a per-connected-account model **with a minimum monthly invoice** of undisclosed size. GoCardless Bank Account Data is closed to new customers since July 2025 [A-§1.5, B-§3–4, NEW-2].
7. **DECISION (§5):** primary provider **Yapily (Yapily Connect UAB)**; secondary/fallback **Enable Banking**, whose documented restricted-production mode is a candidate pilot subject to its current terms and authorised participants. **Tink** is the challenger to quote in the same RFP (it tops the weighted matrix on operational completeness and would become primary if it offers startup terms and confirms 180-day Italian consent); **Fabrick** gets a parallel enquiry as the only Italian-supervised licence umbrella; **Salt Edge** is excluded until it names its EEA-licensed entity; TrueLayer, Plaid, Powens, Mastercard, Neonomics and the rest are not recommended for the MVP (reasons per provider in §3).
8. **Gate B = PASS WITH CONDITIONS for research/mock engineering only; production acceptance BLOCKED** (§6): current accounts, prepaid IBAN accounts (Postepay, BancoPosta) and the main neobanks (Revolut, N26) are reachable through several providers; credit cards, PayPal, Satispay and Hype are partial or unverified and must be handled by RFP clauses, bank-side detection and CSV import in the MVP.

---

## 1. Italian PSD2 mechanics that shape the product

### 1.1 Legal parameters (EU law directly applicable in Italy)

| Parameter | Value | Label | Evidence (verified 2026-10-02) | Product consequence |
|---|---|---|---|---|
| Legal baseline | PSD2 (Directive 2015/2366, transposed by D.Lgs. 218/2017 → TUB art. 114-septies/novies) + RTS on SCA & CSC (Delegated Reg. 2018/389) as amended by Delegated Reg. 2022/2360 | FACT (law) | REG-§1.1; A-§2.1; EUR-Lex ELI entries (primary text not re-read today; secondary sources agree) | Design for this regime; nothing from PSD3/PSR is in force. |
| Scope of AIS | Only **payment accounts accessible online** (current accounts, many card accounts, IBAN-bearing prepaid/e-money accounts). Loans, mortgages, securities, savings without payment function are out of scope. | FACT (law) / ASSUMPTION (per-product classification) | PSD2 art. 4(12), 66–67 [B-§1, REG-§1.1] | Consumer-credit instalments (Compass, Findomestic, Agos), brokers and insurers are not reachable via AIS; plan CSV/manual paths [A-§2.3]. |
| Consent validity / SCA | Article 10a exempts qualifying balance/recent-transaction access from SCA subject to first-access and 180-day-since-last-SCA conditions and permitted exceptions. **AIS consent lifetime, provider-token expiry and bank SCA deadlines are separate.** | FACT (retained legal source); UNKNOWN (implementation) | Delegated Reg. 2022/2360; EBA/RTS/2022/03; EBA Q&A 2023_6820 [A-§2.1 AV2] | Use provider-reported lifecycle fields; reminders derive from the actual expiry, not a universal day 150. |
| Background access | RTS art. 36(5)(b) permits the default **four unattended accesses per 24 h unless a higher frequency is agreed**. User-present requests are distinguished, but bank/provider throttling, fraud controls and endpoint accounting still apply. | FACT (retained source) / UNKNOWN (per-bank accounting) | EBA Q&A 2019_4631; Yapily Intesa restrictions [A-§2.1] | Coordinate the budget across endpoints; retries and pages can consume it. Opening the app does not automatically prove active-user access. |
| History at first consent | The SCA exemption’s **last 90 days** describes information accessed under that exemption, not a universal initial-history minimum or maximum. Provider/bank histories and query windows vary; Salt Edge documents a default 60-day fetch interval. | FACT (documentation) / UNKNOWN (per-bank depth) | Yapily restrictions; Salt Edge Provider attributes; Banca Investis [A-§2.1] | Display the actual retrieved interval, gaps and completeness; no unconditional three-month onboarding promise. |
| Consent gap on late renewal | If a consent is renewed more than 90 days after expiry, the bank returns only the last 90 days → hole in history. | FACT (Tink behaviour) | docs.tink.com consent-reconfirmation [A-§2.1] | Nudge before expiry; design for gaps. |
| Purpose limitation | AISP may use data only for the AIS **explicitly requested by the PSU** (PSD2 art. 67(2)(f)); art. 94(2) explicit consent (contractual, per EDPB 06/2020). | FACT (law) | REG-§1.1 | The provider's consent screen must name Lilleri as recipient and the purpose; Lilleri’s further processing needs its own GDPR basis/role assessment and a documented DPIA before real financial-data processing (project DECISION). |
| Who is an AISP in Italy | Registered by Banca d'Italia in the AIS section of the art. 114-septies register (mirrored in the EBA register); decision within **90 days** of a complete application; EU AISPs operate under passport, possibly via agents with a central contact point. | FACT | Banca d'Italia istituti-di-pagamento pages and FAQ; Diritto Bancario (Catenacci/Sanna 2019) [A-§2.1, B-§15.2] | Phase-2 option (§4.3). |
| PSD3 / PSR status | Provisional agreement 27 Nov 2025; COREPER 22 Apr 2026; texts 23 Apr 2026 (Council docs 8221/26, 8222/26); ECON 5 May 2026; **no plenary vote, no OJ publication**; OEIL "awaiting Council's 1st reading position", indicative plenary 14 Dec 2026; PSR applies 18 months after entry into force (PSD3 transposition 21 months) → **≈ mid-2028 or later**. Secondary descriptions of the agreed text report the 4×/24 h cap **retained** and renewal SCA moved to the AISP (180 vs 365 days disputed). | FACT (retained reported status) / UNKNOWN (fresh adoption/consolidated text) | OEIL 2023/0209(COD); Clearingpost; Arthur Cox; Freshfields; KPMG Law; William Fry; EY Belgium; dudkowiak (isolated 365-day claim) [A-§2.2, B-§1, REG-§2] | Keep refresh cadence and renewal flow configurable; quarterly "PSR watch"; do not promise more than 4 unattended refreshes/day. |
| FIDA (open finance) | Retained sources report no agreement/adoption as of 30 Sep 2026; fresh status UNKNOWN. Access to savings/investment/insurance cannot be promised. Any 2028–2029 timing is a HYPOTHESIS, not an enacted deadline. | FACT (reported) | REG-§3 | Investments stay manual/CSV in v1. |
| DORA | In force since 17 Jan 2025 (retained source). Direct scope and the applicable framework depend on the legal entity/activity and regulatory route; contractual obligations may reach Lilleri under route A. | FACT (law date) / UNKNOWN (Lilleri scope/contract) | REG-§4 | Counsel and contract review classify direct obligations, proportionality and outsourcing flow-downs. |

### 1.2 The gateway landscape: CBI Globe vs own APIs

CBI Globe (Consorzio CBI, Nexi as technology partner) is the shared PSD2 gateway on Berlin Group NextGenPSD2 with Italian customisations. Launch-era figures (2018–2019) — "nearly 300 banks", "~80 % of the Italian market", "130+ TPPs on the developer portal" — are confirmed on Nexi's own page but **no 2025–2026 refresh of the participant count was found** (FACT historical) [A-§2.3 AV2]. The CBI Globe "active" functionality lets licensed TPPs "reach 100 % of Italian banks with a single integration" (Nexi claim, FACT as self-claim) but the TPP area is reserved to PSPs holding an eIDAS QWAC/QSealC, i.e. **not usable without a licence** [B-§13].

| Institution | Gateway | Label | Evidence | Reachability evidence at providers |
|---|---|---|---|---|
| Intesa Sanpaolo | CBI Globe | FACT | Yapily institution config; Aziendabanca 2019 list | Enable Banking IT page; Tink IT list; Plaid (openbankingtracker); Yapily. **Restrictions:** HTTP 429 `ACCESS_EXCEEDED`; transactions retrievable in **two-week windows** only (live Yapily page) [A-§2.3] |
| UniCredit | Own developer portal (developer.unicredit.eu) | FACT (portal) | UniCredit newsroom | Enable Banking (no credit-card accounts); Tink; TrueLayer 2020 launch. Tink Italy status page logged a major UniCredit AIS/PIS outage on 19 May 2026 (statusgator, medium) |
| Banco BPM | CBI Globe | FACT | Yapily config page | Enable Banking; Powens (PIS); Tink |
| BPER | CBI Globe | FACT (2019 list) | Aziendabanca | Enable Banking; Yapily (openbankingtracker) |
| MPS | CBI Globe | FACT | Yapily config; mps.it | Enable Banking |
| BNL | CBI Globe | FACT | Yapily config | Powens (PIS) |
| Crédit Agricole Italia | CBI Globe | FACT (2019) | Aziendabanca | Enable Banking (no credit-card accounts); Tink Italy status: AIS issue 24 Jun 2026 |
| Credem | CBI Globe | FACT (2019) | Aziendabanca; Salt Edge 2019 press | Enable Banking core-library connector; Powens (Wealth) |
| Poste Italiane / BancoPosta / **Postepay** | CBI Globe | FACT | Yapily config; posteitaliane.it open-banking page | Enable Banking ("BancoPosta and Postepay via CBI Globe"); Tink IT list (PostePay); Salt Edge (openbankingtracker) |
| BCC Iccrea | CBI Globe | FACT | gruppobcciccrea.it | Enable Banking |
| Mediolanum | CBI Globe (ASSUMPTION) | ASSUMPTION | — | Enable Banking (no credit-card accounts) |
| Fineco | UNKNOWN (own API or CBI Globe) | UNKNOWN | Salt Edge 2019 press lists Fineco | Enable Banking **card accounts via dedicated integration (Mar 2026)**; Tink IT list |
| Banca Sella / **Hype** | Fabrick platform (Sella group) | ASSUMPTION | Fabrick AISP page; openbankingtracker Hype | Hype listing UNKNOWN at Tink (absent from IT list), Enable Banking, Yapily, Salt Edge; ASSUMPTION reachable via Fabrick |
| Cassa Centrale, BP Sondrio, ING Italia, Illimity, Banca Generali, DB Italy, Widiba | UNKNOWN | UNKNOWN | — | Widiba: Powens (Wealth) |
| Revolut (IT IBAN) | Revolut's own PSD2 API | FACT | developer.revolut.com | Tink IT list; Enable Banking (multi-country incl. IT); Salt Edge/Yapily/Plaid/TrueLayer (openbankingtracker aggregator list) |
| N26 | N26 own API (DE) | FACT (Tink lists it) | Tink IT capabilities page (mirror) | Tink IT list; Enable Banking April 2026 changelog: pan-European players like N26 shown "across every country they serve" (search snippet, medium) [NEW-9] |
| Wise, Mooney, TIM, Hello Bank | — | FACT (Tink lists them for IT) | Tink IT capabilities page (mirror, cache date unknown) [NB-S-37] | Others UNKNOWN |

**Field fill-rates are the real unknown.** The presence of `creditorName`, `endToEndId`, `bankTransactionCode` in a provider schema does not mean CBI Globe banks populate them; they "frequently leave them empty and push everything into `remittanceInformationUnstructured`" (ASSUMPTION from the raw notes; per-bank fill-rates UNKNOWN) [A-§2.4]. This is the single most important thing to measure before freezing the reconciliation design — see §5.4 (Enable Banking restricted-production pilot).

### 1.3 Quirks that matter for "automatic reconciliation"

| Quirk | What we know | Label | Source |
|---|---|---|---|
| Pending transactions | Berlin Group supports `bookingStatus=pending`; every shortlisted provider exposes a pending/booked status; **whether each Italian bank actually returns card authorisations as pending is UNKNOWN**. | FACT (schema) / UNKNOWN (bank behaviour) | A-§2.5 |
| Pending→booked identity | Transaction IDs change at many banks on booking; match on (account, amount, date ±3 d, normalised description); keep the provider's stable id where offered (TrueLayer `normalised_provider_transaction_id`, Tink `providerTransactionId`, Salt Edge `id` + `duplicated`). | ASSUMPTION (design) | A-§7 |
| Intesa two-week window | Transactions retrievable 14 days at a time; combined with 4×/day cap, an unattended catch-up after a multi-week gap can take days; user-present session is the fast path. | FACT (Yapily live page) | A-§2.5 AV2 |
| Transfer / duplicate hints | Salt Edge `mode=transfer`, `duplicated`; Tink PFM counterpart ids; Yapily enrichment `transactionHash`; TrueLayer none. | FACT (schemas) | A-§2.4 |
| MCC | Not standard in PSD2 payloads; Tink/Yapily (Data Plus)/Salt Edge expose it when the bank gives it; TrueLayer and Enable Banking do not. | FACT (schemas) / UNKNOWN (IT fill) | A-§2.4, B-§4 |
| Consent branding | Under route A the **provider's name** (Yapily Connect, TrueLayer, Tink, Enable Banking, Fabrick) appears on the bank's consent screen, with mandatory provider T&Cs; only Tink's "licensed Enterprise-tier" customers may hide Tink's logo. | FACT | A-§2.6 AV | 
| SCA flow | All major Italian banks use redirect / app-to-app; embedded or decoupled flows are not typical. | ASSUMPTION | A-§2.5 |

### 1.4 Reachability of cards, wallets and non-banks (explicit statements)

| Source | Status for an Italian PFM | Label | Evidence |
|---|---|---|---|
| **Nexi cards** | AIS via CBI Globe **only for prepaid cards issued by Nexi Payments** (Card-API sandbox). Credit/charge cards: not stated → likely not reachable; bank-issued Nexi cards appear only if the issuing bank exposes a card account. | FACT (prepaid) / UNKNOWN (credit) | nexi.it/openbanking.html; nexi.it PSD2 Data Opening [A-§2.3 AV2] |
| **American Express Italy** | Amex has a PSD2 Account & Transaction API for AISPs (UK and France explicitly); Italy UNKNOWN; no aggregator found listing "American Express IT". | FACT (API exists) / UNKNOWN (IT) | developer.americanexpress.com [A-§2.3] |
| **Bank-issued credit cards** | Exposed as card accounts only where the bank implements NextGenPSD2 `card-accounts`: UniCredit, Mediolanum, Crédit Agricole were absent through Enable Banking in March2026 (other routes/current status UNKNOWN); Fineco does (Enable Banking, Mar 2026); CBI Globe card-account support "enhanced across several banks" (Enable Banking changelog). | FACT (Enable Banking's view) | enablebanking.com/docs/markets/it; changelog Apr 2026 [B-§1] |
| **Postepay / Postepay Evolution** | IBAN-bearing payment account → in PSD2 scope; reachable (Enable Banking, Tink, Salt Edge, Yapily/Poste config). | FACT | A-§2.3; B-§4 |
| **Hype** | Sella-group e-money account; PSD2-regulated with APIs (openbankingtracker); **not on Tink's Italian list**; listing at Enable Banking/Yapily/Salt Edge UNKNOWN; UNKNOWN at Fabrick too; shared ownership does not prove a connector. | UNKNOWN | A-§2.3; NB-S-37; NEW-7 (no new evidence) |
| **PayPal (Europe) S.à r.l.** | Luxembourg credit institution with a PSD2 AIS interface (GoCardless cached institution `PAYPAL_PPLXLULL`, 90 days history, IT among countries — ten GitHub caches). PayPal's own Transaction Search API is merchant-side (NOT FEASIBLE for a consumer app). **Tink's Italian list has no PayPal**; Yapily/Enable Banking/Salt Edge coverage UNKNOWN. | FACT (interface exists; merchant API) / UNKNOWN (provider coverage) | NB-§1; NEW-4 (no new evidence) |
| **Satispay** | Publishes an open-banking XS2A portal (openbanking.satispay.com); EMI → PSD2 access obligations apply (ASSUMPTION on exact status); **no aggregator listing found anywhere**; Tink's Italian list has no Satispay although it lists Mooney/PostePay/N26/Revolut/Wise/TIM. | FACT (portal) / UNKNOWN leaning negative (coverage) | NB-§2; NEW-3, NEW-10 (no new evidence) |
| Compass, Findomestic, Agos | Consumer credit, not payment accounts → outside AIS. | ASSUMPTION | A-§2.3 |
| Trade Republic cash account | German banking licence → possibly reachable via AIS; which aggregators list it UNKNOWN. | UNKNOWN | NB-§8 |

---

## 2. Licensing route: requirements, timelines, costs

### 2.1 The three routes

| Route | Mechanics | Who documents it | Requirements on Lilleri | Timeline | Cost | Label |
|---|---|---|---|---|---|---|
| **A. Recipient under the provider's licence ("licence-as-a-service", "fourth party")** | Provider is the AISP of record; the user consents to the provider, which shares data with Lilleri; Lilleri must not present itself as providing AIS. | Yapily Connect ("delegated registration … Yapily Connect acts as the registered entity"; no FCA agency registration for EEA PSUs); TrueLayer ("in the UK and EU, entities not regulated to provide AIS … mandatory copy … submit UI designs for review"); Tink ("when using Tink's license, users must explicitly consent to Tink's T&Cs"; Tink performs CDD/KYC on the customer); Enable Banking (terms-consent widget "when the application relies on Enable Banking … as a regulated entity"); Mastercard OFE ("Aiia Data and Aiia Pay do not require a license"); Powens (T&Cs track regulated/unregulated sub-clients); Fabrick ("Fabrick Pass" AISP/PISP as-a-service for "fourth parties"; Banca d'Italia PI since May 2020); Salt Edge Partner Program (EEA entity UNKNOWN). | KYB/AML questionnaire on the company (UBO, sanctions), privacy/security review, **UI/consent-copy review**, in-app connection-management/revoke screen, DPA; CDD/AML obligations depend on the actual legal role; obtain written classification. | Weeks (ASSUMPTION; Enable Banking self-serve → contract; Yapily/Tink sales cycle) — **UNKNOWN per provider** | Commercial fees UNKNOWN; legal review, security, insurance and compliance costs may still arise (see `provider-cost-model.md`). | FACT (providers) / **UNKNOWN (Banca d'Italia's acceptance for a B2C app)** |
| **B. Registered agent of a licensed AISP** | Lilleri appointed as agent (PSD2 art. 19), registered by the licensee's home NCA and notified to Banca d'Italia; licensee bears conduct, complaints, AML; Lilleri formally "provides AIS on behalf of" the licensee, own-branded flow with licensee disclosure. | Tink ("may" use agents; **one** registered agent in total: An Post, IE); TrueLayer (UK/FCA-framed, "while you are waiting for your licence"); Yapily (not used for EEA PSUs). | Fit-and-proper on directors; due diligence; ongoing monitoring; possibly OAM enrolment if the licensee is Italian (UNKNOWN for AIS-only). | UNKNOWN (ask) | UNKNOWN | FACT (framework) / ASSUMPTION (commercial availability — exceptional) |
| **C. Own AISP registration (Banca d'Italia)** | Entry in the AIS section of the art. 114-septies register; conditions in art. 114-novies: programme of operations, governance/fit-and-proper, security policy, incident procedures, **professional indemnity insurance per EBA/GL/2017/08**; **no initial capital**; eIDAS QWAC/QSealC; then direct CBI Globe access or BYO-licence mode at an aggregator (Enable Banking "TPP Infrastructure-as-a-Service" documented). | — | Compliance function, DORA framework/obligations as classified by counsel, incident reporting, possibly AML (Italian 231/2007 scope for AIS-only PIs UNKNOWN; AMLR 2027 appears to carve out AIS — ASSUMPTION), GDPR DPIA. | **90 days** statutory decision on a complete application (FACT); **6–12+ months** end to end incl. pre-filing (HYPOTHESIS). | UNKNOWN: legal/advisory fees, PII premium (EBA formula; a French "€5 M per incident" figure is not to be relied on), eIDAS certificates (few k€/yr, ASSUMPTION), compliance officer, audit; low-reliability SME anchor for CBI integration budgets: TPP contract setup €0–1,500, analysis €2–4 k, connector €5–15 k, test/go-live €1–3 k, annual TPP fees €600–3,600 (2021 blog, accounting-software context). | FACT (procedure) / UNKNOWN (cost) |

Sources: A-§2.6 (incl. AV/AV2 corrections), B-§13, B-§15.1–15.2, REG-§10.1–10.2, NB-§0.1.

### 2.2 What is still open on the licensing route (all P0/P1)

| # | Open question | Why it matters | How to close |
|---|---|---|---|
| L1 | Does Banca d'Italia accept route A for a B2C app marketed to Italian consumers, and what must the consent screen, T&Cs and privacy notice say? Fabrick's May 2020 press release attributes the terms "quarta parte / pseudo TPP" to Banca d'Italia (Fabrick's attribution; text not found on bancaditalia.it). | Go-live legality; contract and UX. | Written opinion from an Italian fintech-regulatory firm; informal query to Banca d'Italia (Canale Fintech); ask Fabrick's compliance team for the Banca d'Italia text [B-§15.1, REG-§15 Q1]. |
| L2 | For each shortlisted provider: EEA licensed entity, NCA, EBA-register entry and **Italy passport line** (Yapily Connect UAB: cross-border rights FACT, Italy line not eyeballed; Enable Banking: FIN-FSA FACT, Italy passport to confirm; Tink AB: FACT; Fabrick: Italian). | Legal basis for serving Italian PSUs. | EBA register lookup; written confirmation in the RFP. |
| L3 | Salt Edge: which EEA-authorised entity is the AISP on Italian consent screens for Partners? Only Salt Edge Limited (UK FCA FRN 822499, 25 Mar 2019) was found in eight targeted searches across two sessions; a UK registration does not passport into the EEA. | Decides whether Salt Edge is usable at all. | Ask Salt Edge in writing; if the answer is "Salt Edge Limited (UK)" alone, exclude. [A-§3.4 AV2, NEW-1] |
| L4 | OAM registration for agents of AIS-only payment institutions; central-contact-point thresholds (Delegated Reg. 2021/1722) for EU AISPs with Italian agents. | Only if route B is ever offered. | Counsel. |
| L5 | DORA / outsourcing flow-downs the provider will push into the contract (audit rights, exit, data location). | Contract review before signature. | Read the MSA; REG-§4, §10.3. |

---

## 3. Provider-by-provider evaluation

Each profile: what it is, licence/route, Italian coverage, data, operations, integration, commercial, risks, **verdict for Lilleri**. Scores and raw values per criterion are in `provider-capability-matrix.md`; cost scenarios in `provider-cost-model.md`.

### 3.1 Tink (Visa)

- **Corporate:** Swedish AISP/PISP (Tink AB, Finansinspektionen), owned by Visa since 2022; Milan office since the 2019 Italian launch. Visa announced ~2,600 layoffs (~7 %) on 28 Jul 2026, concentrated in technology and product; **Tink-specific impact UNKNOWN** (FACT for Visa; A-§3.1 AV2).
- **Route:** Tink acts as the AISP on its own licence; the startup is Tink's customer/data recipient after KYC/CDD (FACT, legal FAQ). Agent appointment exists on paper but Tink AB has one agent in total (FACT) → route B ASSUMPTION, unlikely.
- **Italian coverage:** Tink's own market-capabilities page for IT (via mirror, cache date unknown) lists ~70 providers including Intesa, UniCredit, BPM, Fineco, PostePay, Mooney, TIM, N26, Revolut, Wise, Hello Bank — **no PayPal, no Satispay, no Hype** (FACT via mirror; NB-S-37). Dedicated "Tink providers Italy" status page exists with 2026 incidents for UniCredit, Crédit Agricole, Intesa maintenance (medium).
- **Data:** `status` BOOKED/PENDING; `descriptions.original/display`; `dates.booked/value`; `identifiers.providerTransactionId`; `merchantInformation.{merchantName, merchantCategoryCode}` where banks provide; `providerMutability`; CREDITCARD_ACCOUNTS item (bank-dependent); separate Investments/Loans products (Italy availability UNKNOWN) (FACT, docs).
- **Operations:** managed background refresh in Tink's own PSD2 windows; `refresh:finished` webhook with API/BACKGROUND source; `account-transactions:modified` / `account-booked-transactions:modified` events with HMAC (FACT). Consent: "90 or 180 days depending on the market"; 180-day enablement is market-by-market and **Italy was not named in the changelog entries seen → UNKNOWN**.
- **Enrichment:** deepest stack — ML categorisation with per-user learning, recurring + predicted recurring, Merchant Information (logo, location), CO2; Account Check (holder-name match) supports Italy (FACT, marketing + docs). Accuracy for Italian merchants UNKNOWN.
- **Integration:** Tink Link web/iOS/Android (React Native only via a third-party wrapper); permanent users for continuous access (FACT).
- **Commercial:** sales-led; "Enterprise tier" mentioned in docs; the "€0.50/user/month Standard, €0.25/verification" figures appear only on listing sites copying each other (UNKNOWN). Minimums, SLA, EU hosting region UNKNOWN.
- **Risks:** enterprise gate for a pre-seed B2C company (UNKNOWN whether Tink onboards at all and how fast); pricing opacity; category/recurring-id lock-in; Visa restructuring; residency unknown; no PayPal/Satispay/Hype.
- **Verdict:** **Challenger.** Operationally the most complete managed platform (tops the weighted matrix at 3.60), but every advantage beyond licence and coverage (managed refresh, webhooks, enrichment, SDK) is either something Lilleri builds anyway or does not need; its weaknesses hit simplicity, speed and cost. Quote it in the RFP; it becomes primary only if it confirms startup-accessible terms, 180-day Italian consent and EU hosting (rescore with the written quote and evidence).

### 3.2 Fabrick (Banca Sella group)

- **Corporate:** Sella-group open-finance platform; Mastercard and Reale Mutua as investors; 75 % of finAPI (DE) bought from SCHUFA (announced 22 May 2024, completed June 2025); 2025 net revenues €66 M, 587 counterparties, >2.1 bn API calls/month (FACT, press) [B-§2.1].
- **Route:** **Banca d'Italia-authorised payment institution since May 2020 (AISP + PISP)**; "AISP as a service" for unlicensed "fourth parties / pseudo TPP" announced at licensing; marketed as **"Fabrick Pass"** (IT/ES/FR) for banks, corporates **and fintech**; commercial models "from flat fee to revenue sharing" (Fabrick fintech page, NEW-6, self-claim). **All published adopters are B2B** (Pinv 2021, Kalaway 2022, Be Safe Group); no B2C consumer-app adopter found → B2C terms UNKNOWN.
- **Italian coverage:** "97 % of Italian banks integrated" (May 2020 claim); "1,700+ European banks"; named Italian list not retrieved; coverage of the CBI Globe universe expected; **Hype (same group) expected but UNKNOWN** [B-§2.2].
- **Data / operations / integration:** pending/booked, MCC, history, refresh, webhooks, SDK, sandbox terms, status page: **all UNKNOWN** (no developer evidence retrieved; no community sentiment found).
- **Commercial:** UNKNOWN; historically enterprise/bank-oriented with setup fee + volume tiers (ASSUMPTION).
- **Risks:** enterprise sales motion; opacity; proprietary API (medium lock-in, ASSUMPTION); 78 % of its matrix weight sits on UNKNOWN defaults.
- **Verdict:** **Parallel enquiry, not primary.** An Italian-supervised shortlisted candidate whose arrangement still needs question L1 resolved. Consumer name recognition and Hype coverage are untested hypotheses. It jumps to the top two if it sells Fabrick Pass to a B2C startup on startup terms with a usable developer experience (sensitivity S5: 3.19 → still behind the top three unless DX/coverage evidence is strong).

### 3.3 TrueLayer

- **Corporate:** UK AISP/PISP (FCA 901096) with **TrueLayer (Ireland) Ltd, Central Bank of Ireland C433487**, passported across the EEA (FACT, registers). Italy launch Aug 2020 (UniCredit, Intesa, Poste). **Sept 2025: ~25 % layoffs (71 roles), then USD 50 m at ≈USD 700 m (−30 %)**; strategic focus on payments/profitability (FACT, multi-source) [A-§3.2 AV2]. Data API still sold (v3 recommended for new data customers).
- **Route:** route A documented for "UK and EU" unregulated clients (mandatory consent copy, UI review, CBI copy variant); agent model documented but framed as a bridge "while you are waiting for your licence to be approved by the FCA"; v3 data connections require `user.name` "unless you have an AISP licence" (FACT, docs).
- **Italian coverage:** "all leading Italian banks" (2020); current list UNKNOWN; many EU providers in beta release channels (FACT, docs).
- **Data:** stable `normalised_provider_transaction_id`; dedicated pending endpoint; `transaction_category` type codes and `merchant_name`; **`transaction_classification` only for UK/IE/FR** (no vendor categorisation for Italy); no MCC, no ISO codes; running balance; docs still say consent "maximum of 90 days" (v1) (FACT).
- **Operations:** pull-based; async with `webhook_uri`; no data-change webhooks found; no data SDK (mobile SDKs are payments-only).
- **Commercial:** sales-gated (Development free / Scale / Enterprise per third parties, low); appetite for small data-only EU clients after the pivot UNKNOWN.
- **Verdict:** **Not recommended for the MVP.** Credible fallback for the top-3 banks and the best-documented consent-copy regime, but the 2025 restructuring, the payments pivot, the 90-day consent wording and the absence of Italian enrichment/MCC make it fourth in every group-A scenario (2.91–3.04).

### 3.4 Yapily

- **Corporate:** UK-HQ API-first aggregator; USD 69 m raised; Feb 2025 Adyen deal and "losses significantly reduced" (FACT, multi-source); the 2022 finAPI acquisition **lapsed** (approvals not obtained by 31 Jan 2023; Fabrick bought finAPI instead) (FACT) [A-§3.3 AV2].
- **Route:** **Yapily Connect UAB** — Bank of Lithuania payment-institution licence No. 53, authorisation **LB002045**, AIS + PIS since 23 Dec 2020, "cross-border provision without branch" (FACT, lb.lt register; Estonian FSA cross-border list); "delegated registration" for unregulated entities; FCA agency registration "does not apply to Yapily Connect UAB customers sharing information with EEA-based PSUs" (FACT, docs). Italy passport line on the EBA register not yet eyeballed (ASSUMPTION) [NEW-8: lobbyfacts datacard confirms the Lithuanian entity; no Italy line found].
- **Italian coverage:** dedicated Italy product page; per-institution configuration pages for Intesa, Banco BPM, Poste Italiane, MPS, BNL (all via CBI Globe); "80 % coverage" (~2021 claim); named also Banca Sella, Valsabbina, BPER, UniCredit; partner Moneyfarm (FACT mixed dates). Fintech/neobank list (Hype, Satispay, PayPal, N26) UNKNOWN.
- **Data:** richest raw Berlin Group surface — `bookingDateTime`, `valueDateTime`, `reference`, `description`, `transactionInformation[]`, `isoBankTransactionCode`, `proprietaryBankTransactionCode`, `payeeDetails/payerDetails` with account identifications, `balance`, `currencyExchange`, `chargeDetails` (FACT, docs). Data Plus (separate contract): tier1–3 categories, merchant, `recurrence`, MCC, `cleansedDescription`.
- **Operations:** client-driven refresh (you own the 4×/day counting; Intesa `ACCESS_EXCEEDED` and 14-day window documented); webhooks for consents/payments/categorisation only; **180-day EEA consent explicitly documented** (one older tutorial page still says 90 — rely on `expiresAt`).
- **Integration:** Node/Java SDKs; Hosted Pages (web) or build your own bank picker/consent UI; no native mobile SDK; redirect + embedded auth where banks support it (FACT).
- **Commercial:** "pricing not publicly available; production = base + usage fees"; £200–500/month entry per listing sites (UNKNOWN). SLA, status page, EU hosting region UNKNOWN.
- **Risks:** more engineering (UI, scheduler); Data Plus lock-in if adopted; residency unknown; status transparency unknown; sales conversation for production keys.
- **Verdict:** **Primary (see §5).** Best-evidenced EEA licence-as-a-service for EEA users, richest raw fields for an own reconciliation engine, documented Italian institution behaviour, stable finances, low lock-in (Berlin-Group-like schema).

### 3.5 Salt Edge

- **Corporate:** private, founded 2013 (Canada); ~147 staff (low); Backbase partnership 31 Mar 2025; Italian references EasyPol, Switcho, Plannix, Domopay (medium) [A-§3.4].
- **Route:** Partner Program ("instant access … even without your own PSD2 licence"; Partners "operate under Salt Edge's license"; Salt Edge Connect widget collects consent; mandatory end-user consent dashboard) (FACT, docs). **EEA licensed entity/NCA: UNKNOWN** — only Salt Edge Limited's UK FCA AISP registration (FRN 822499, 25 Mar 2019) found; NEW-1 (this document) again found only the UK registration. A UK registration does not passport into the EEA post-Brexit → **P0 blocker**.
- **Italian coverage:** 451–464 "connections" on openbankingtracker (inflated by BCC branches); named Fineco, MPS, Intesa, Credem, Crédit Agricole, Fideuram (2019–2020 press); listed for Postepay and Revolut; some connections run in `web` (scraping) mode — must be excluded (`regulated=true`) (FACT dated / ASSUMPTION).
- **Data:** `status` posted/pending with `custom_pendings_period`; `mode` normal/fee/**transfer**; `duplicated`; `extra.mcc`, payee/payer, posting date, balance snapshots; `supported_transaction_extra_fields` per provider tells what Italian banks fill (FACT, swagger v6).
- **Operations:** managed daily/background refresh with `next_refresh_possible_at` and a 4×/24 h guard; success/fail/notify callbacks; iOS/Android SDKs; EEA data residency claimed, ISO 27001, PCI DSS (FACT).
- **Enrichment:** 150-category engine ("95 % accuracy" vendor claim), merchant identification (25 M merchants); recurring detection not found (UNKNOWN).
- **Commercial:** sales-led, per consented end-user; the "Free / Growth $500 / Custom" card dates from ≈2019 and is not on saltedge.com today; "Test" status = 100 live connections for 90 days (HYPOTHESIS that the "free tier" story derives from it) (UNKNOWN today).
- **Verdict:** **Excluded until it names its EEA entity, NCA and EBA-register entry in writing.** PFM-friendliest raw flags (transfer/duplicate), managed refresh and EEA residency would make it a strong primary (rescore after written legal, data and commercial evidence) — but not on an unverified legal basis for Italian users.

### 3.6 GoCardless Bank Account Data (ex-Nordigen)

- **Status:** "From July 2025 onwards, GoCardless has stopped accepting new Bank Account Data accounts" (own `new-signups-disabled` page; Actual Budget docs; Invoice Ninja; support quoted "only available to enterprise customers in the future") (FACT) [B-§3]. Docs describe a 90-day access period; this is not disproved by the separate 180-day SCA exemption. Current commercial access is unverified.
- **Verdict:** **Not viable.** Only relevance: the free/indie tier of this market is gone; expect negotiated pricing everywhere.

### 3.7 Enable Banking (Finland)

- **Corporate:** Espoo; **licensed PSD2 AISP supervised by FIN-FSA** ("details … in the EBA register", own FAQ) (FACT, snippet); "2,700+ ASPSPs in 30 countries" (self-claim) vs openbankingtracker's automated count "41 countries / 108 institutions" (NEW-7, medium; the two figures measure different things — flag as CONFLICT to resolve with the live `GET /aspsps?country=IT`) [B-§4].
- **Route:** two documented modes — (1) Enable Banking as the regulated entity with a mandatory terms-consent widget before the bank redirect (route A); (2) licensed TPPs bring their own eIDAS certificates and Enable Banking becomes a technical service provider "completely invisible for end-users" (BYO-licence path for phase 2) (FACT, docs).
- **Italian coverage:** dedicated "Open Banking Specifics in Italy" page naming Intesa Sanpaolo, UniCredit, Banco BPM, BCC Iccrea, Crédit Agricole Cariparma, BPER, MPS, Mediolanum, plus Poste Italiane (BancoPosta and Postepay via CBI Globe) and Revolut; Credem and Mediolanum connectors in the core library; **March 2026: expanded card-account access across CBI Globe banks and a dedicated Finecobank integration; UniCredit, Mediolanum, Crédit Agricole card accounts absent through Enable Banking at that date** (FACT provider observation; other/current coverage UNKNOWN); N26 shown across countries served (April 2026 changelog snippet, medium, NEW-9). PayPal/Satispay/Hype UNKNOWN.
- **Data:** Berlin-Group-style booked/pending and `remittance_information`; MCC not standard; holder name where provided (ASSUMPTION; schema not read).
- **Operations:** redirect flow; web widgets (`<enablebanking-aspsp-list>`, terms consent); no native mobile SDK; payment-status webhooks exist, **AIS data webhooks UNKNOWN**; refresh is client-driven (ASSUMPTION); consent `valid_until` follows the ASPSP.
- **Sandbox:** mock banks after self-registration **plus "restricted production"**: a production app starts inactive, is activated by linking one's own accounts and "can only fetch data from accounts linked to the application" until an agreement is signed — real Italian data before any contract (FACT, docs).
- **Commercial:** per connected account per month, volume-based, **minimum monthly invoice with an included quota** (own FAQ, FACT); "Get a Quote" tool since March 2026; no public numbers (NEW-2 confirms). SLA page exists on rfp.wiki (content not read).
- **Risks:** small vendor; floor unknown; no enrichment (irrelevant); no SDK; AIS webhooks and status page unknown; institution-count conflict.
- **Verdict:** **Secondary / fallback, and the measurement instrument.** Fastest path to real Italian data (sandbox today, restricted production this week, contract in weeks), per-account pricing, EU company, documented exit to BYO licence. Becomes primary if Yapily fails its price or passport gates (§5.3).

### 3.8 Powens (ex-Budget Insight, France)

- **Corporate:** ACPR-licensed AISP/PISP passported to 30 countries; PSG Equity-backed; CEO Jean Guillaume since Oct 2024; Unnax (Spanish EMI) acquired 24 Apr 2024; Italy launch June 2023 ("900+ institutions" across main EU markets) (FACT) [B-§5].
- **Route:** T&Cs require an annual listing of (sub)clients with regulated/unregulated status → serves unregulated clients under its licence (FACT, snippet).
- **Italian coverage:** "90 % (AIS and PIS)" on an undated blog (likely 2021–22); PIS at BPM, BNL, Poste; **Wealth & Loans** aggregates securities/savings from 9 Italian banks incl. Sella, Credem, Widiba via a **non-PSD2, partly credential-based channel** (`auth_mechanism` = credentials) (FACT, docs) — regulatory stance of that channel in Italy UNKNOWN.
- **Data / operations:** hierarchical Category object; `CONNECTION_SYNCED` / `ACCOUNT_SYNCED` / `ACCOUNT_CATEGORIZED` webhooks (FACT, docs); `coming` vs booked and `original_wording` (ASSUMPTION); Powens Connect webview; pricing UNKNOWN.
- **Verdict:** **Not for the MVP.** Attractive later for investment-account aggregation (unique in the set), but the credential-based channel conflicts with Lilleri's trust/security priorities, Italian coverage currency is unverified and 49 % of its matrix weight is UNKNOWN.

### 3.9 Plaid Europe

- **Corporate / route:** **Plaid B.V.** (DNB R179714, KvK 74716603) and Plaid Financial Ltd (FCA 804718), each providing AIS/PIS under PSD2 (FACT, legal footer; OBIE list); whether unlicensed EU customers contract under Plaid B.V.'s licence (route A) is ASSUMPTION (Plaid's agent/registration blog posts are UK-framed; the competitor matrix records YNAB as "an agent of Plaid Financial Ltd") [B-§6].
- **Italian coverage:** openbankingtracker tracks 225 Italian banks for Plaid (2.3 % of its coverage); Intesa supported; long-tail quality (BCC networks, Postepay, Hype) UNKNOWN (HYPOTHESIS: UK/payments focus).
- **Data / integration:** Transactions "also available in the UK and Europe"; `days_requested` 1–730; pending flag; Enrich EU availability not stated (UNKNOWN); Plaid Link SDK best-in-class (ASSUMPTION).
- **Commercial:** no pay-as-you-go in Europe; sales-led; minimums UNKNOWN.
- **Verdict:** **Not for the MVP.** Best SDK/DX and stability, but route A for an Italian B2C startup is unverified, Italian long-tail quality is a hypothesis and 54 % of its matrix weight is UNKNOWN. Re-evaluate for the European expansion phase.

### 3.10 Neonomics (Norway)

- Licensed by Finanstilsynet, passported (FACT, self-claim); "252 banks in Italy" (openbankingtracker figure) while its own coverage claims conflict (2,000 / 3,500 / 6,000); per-user/month data pricing, no setup fee (secondary, low); **bought UK unit Ordo on 23 Jan 2025 and closed it in Aug 2025** to "channel all resources into the Nordic and wider EU markets" (FACT) [B-§7].
- **Verdict:** **Not recommended** — stability/strategy warnings and almost no Italian evidence (85 % of matrix weight UNKNOWN).

### 3.11 Mastercard Open Finance Europe (ex-Open Banking Europe / Aiia)

- Docs have separate **"unlicensed" (Aiia Data)** and "licensed" (Aiia Enterprise) tracks: "Aiia Data and Aiia Pay do not require a license as services are provided under Mastercard's existing TPP license"; API covers Connect, Accounts, Transactions, **Categories**, Consents, Providers, Sync (FACT, docs mirror); entity "Mastercard OB Services Europe A/S (formerly Aiia)"; active 2025 release notes; **consumer app Spiir shut down 8 Jun 2026** (FACT, Danish press) [B-§8].
- **Italian coverage:** "3,000+ banks across Europe", strongest in Nordics/Baltics; **Italian list not retrieved** (UNKNOWN). Pricing, SDK, onboarding for a pre-revenue startup UNKNOWN.
- **Verdict:** **Not for the MVP** — cleanest "no licence needed" wording and big-brand stability, but no Italian coverage evidence and an unclear roadmap for the unlicensed track after Spiir (sensitivity S6: even with proven coverage it stays below the top four).

### 3.12 CBI Globe direct

- TPP area reserved to PSPs in the AISP/PISP/PIISP role with eIDAS QWAC/QSealC (InfoCert partnership); "reach 100 % of Italian banks with a single integration" (FACT) [B-§13]. Fees UNKNOWN (brochure PDF exists at cbi-org.eu, not read; NEW-5 found no fee schedule). No neobank/foreign coverage (Revolut, N26 are not Italian ASPSPs) — would still need an aggregator or direct integrations for them (ASSUMPTION).
- **Verdict:** **Phase 2+ option after own registration (route C)** — lowest marginal cost hypothesis, highest fixed cost and time; not an MVP path.

### 3.13 Others found

| Provider | Finding | Verdict |
|---|---|---|
| Klarna Kosma / Open Banking by Klarna | Brand retired Jul–Aug 2023; no 2025–26 evidence of third-party AIS commercialisation (UNKNOWN) [B-§9] | Exclude. |
| finAPI (75 % Fabrick) | DACH-centric; Italy via Fabrick going forward (UNKNOWN) [B-§10] | Only as part of a Fabrick deal. |
| Qwist (ex-finleap connect) | Operating (CEO change Oct 2025; June 2026 launches); DACH-focused; Italy UNKNOWN [B-§11] | Exclude. |
| Bud Financial | Bank of Lithuania AIS licence (Jul 2024); enrichment-first (Enrich claims 98 %); Italian connectivity UNKNOWN [B-§12] | Possible enrichment benchmark partner later; not connectivity. |
| CRIF | Prior knowledge: Banca d'Italia-authorised AISP/PISP with "CRIF Open Banking" platform (ASSUMPTION; not researched) [B-§14] | Add to the RFP long list for an Italian-supervised comparison with Fabrick (OPEN QUESTION). |
| Nexi Open, TAS Group, Mia-FinTech, Cedacri/Cabel | Bank-facing or building-block vendors; startup-facing AIS-as-a-service UNKNOWN [B-§14] | Exclude for now. |
| Yolt (ING) | Consumer app closed late 2021; B2B unit phased out by end April 2023 (FACT) | Exclude. |

---

## 4. Cross-provider synthesis

### 4.1 Evidence quality of the "no licence needed" claim (route A), by provider

| Provider | EEA licensed entity | NCA / register evidence | Route A documented for EEA users | Italy passport evidence | Overall label |
|---|---|---|---|---|---|
| Yapily | Yapily Connect UAB (company 305602679) | Bank of Lithuania register, licence No. 53, LB002045, AIS+PIS from 2020-12-23, cross-border without branch (high) | Yes — "delegated registration"; no FCA agency registration for EEA PSUs (high, docs) | Not eyeballed (ASSUMPTION) | FACT / ASSUMPTION (IT line) |
| TrueLayer | TrueLayer (Ireland) Ltd | Central Bank of Ireland C433487; Latvijas Banka cross-border list (high) | Yes — "UK and EU" unregulated clients, mandatory copy (high, docs) | Passporting evidenced for LV; IT not eyeballed | FACT / ASSUMPTION (IT line) |
| Tink | Tink AB | Finansinspektionen (high, legal pages) | Yes — customer on Tink's licence after KYC (high) | Italian operations since 2019 (medium) | FACT |
| Enable Banking | Enable Banking Oy (ASSUMPTION on legal name) | FIN-FSA; "details in the EBA register" (own FAQ, snippet) | Yes — terms-consent widget; EB as regulated entity (high, docs mirror) | Not eyeballed | FACT (snippet) / ASSUMPTION (IT line) |
| Fabrick | Fabrick S.p.A. | Banca d'Italia payment institution, May 2020 (press + Fabrick release, medium-high) | Marketed ("Fabrick Pass"); B2C terms UNKNOWN | n/a (Italian) | FACT (offer) / UNKNOWN (B2C) |
| Mastercard OFE | Mastercard OB Services Europe A/S | Danish FSA (ASSUMPTION); OBIE lists the entity | Yes — "do not require a license" (high, docs mirror) | UNKNOWN | FACT / UNKNOWN (IT) |
| Powens | Powens SAS | ACPR; 30 countries (self-claim) | Yes — T&Cs (snippet) | Italy launch 2023 (press) | FACT (self) |
| Plaid | Plaid B.V. | DNB R179714 (high) | ASSUMPTION | UNKNOWN | ASSUMPTION |
| Salt Edge | **UNKNOWN** | Only UK FCA FRN 822499 found (medium) | Yes (docs) — but under which EEA entity? | UNKNOWN | **UNKNOWN — P0** |
| Neonomics | Neonomics AS | Finanstilsynet (self-claim) | UNKNOWN | UNKNOWN | ASSUMPTION |

### 4.2 Where providers differ in ways Lilleri cares about

| Dimension | Matters for | Leaders | Laggards | Note |
|---|---|---|---|---|
| Raw transaction fields (ISO codes, counterparties, value date, original remittance) | Reconciliation (pending→booked, transfers, refunds, card settlements) | Yapily, Salt Edge, Tink, CBI direct | TrueLayer, Enable Banking (ASSUMPTION), Mastercard (UNKNOWN) | Fill-rate per Italian bank UNKNOWN for all → measure. |
| Transfer/duplicate hints | Internal-transfer and duplicate detection | Salt Edge (`mode=transfer`, `duplicated`), Tink (counterpart ids) | Everyone else | Lilleri builds its own regardless. |
| Managed refresh + change events | Automation, reliability | Tink, Salt Edge, Powens | Yapily, TrueLayer, Enable Banking, CBI direct | DIY scheduler is a bounded task; PSD2 has no bank push, so "events" are the provider's own polling. |
| Consent duration documentation | Trust (predictable reconnects) | Yapily (180 EEA explicit) | TrueLayer (docs say 90), Tink (IT unknown) | Read `expires_at` per bank in any case. |
| Pilot before contract | Speed, data-correctness validation | Enable Banking (restricted production), Salt Edge (90-day Test status) | Tink, Fabrick (enterprise) | — |
| Consent-screen name familiar to Italians | Trust, UX | Fabrick (Sella), Tink (Visa) | Yapily Connect UAB, Enable Banking | Copy must explain "Lilleri uses [Provider], an authorised AISP supervised by [NCA]". |
| EU data residency statement | Privacy, security | Salt Edge (explicit), TrueLayer (EEA/UK), Fabrick/Enable Banking/Powens (EU companies, ASSUMPTION) | Tink, Yapily (UNKNOWN) | Ask for sub-processor list / hosting region. |
| Exit path to own licence | Lock-in, phase 2 | Enable Banking (BYO-licence TSP mode), Yapily (direct registration mode) | Tink (category lock-in), Powens, Plaid | Canonical schema + raw payload retention is the real mitigation. |

---

## 5. Proposal → critique → counter-proposal → decision

### 5.1 Proposal (as the raw notes left it)

Group A's provisional ranking was **Salt Edge first** (3.95 normalised), then Yapily ≈ Tink, then TrueLayer, on the strength of Salt Edge's Partner Program "built for finapps", PFM-oriented raw flags, managed refresh, EEA residency and Italian PFM references [A-§5]. Group B's ranking was **Enable Banking first** (3.70), then Plaid (3.55), Powens (3.45), Fabrick (3.35) [B-§16.3]. A straightforward merge would read: "Salt Edge primary, Enable Banking fallback, Tink/Yapily as alternates."

### 5.2 Critique

1. **Salt Edge's legal basis for Italian users is unverified.** Eight targeted searches across two sessions (plus NEW-1 here) found only the UK FCA registration. Lilleri's first priority is trust; a consent screen whose AISP of record cannot be named on an EEA register fails that priority outright. The raw notes already applied this sensitivity (licence 5 → 3 drops Salt Edge to third).
2. **The group-A arithmetic was wrong twice** (weights summed to 110 %; totals did not follow from sub-scores). Corrected, the top three are within 0.3 points — smaller than the uncertainty from UNKNOWN sub-scores. Any ranking at this precision is a shortlist, not a decision.
3. **Enrichment and managed refresh were over-weighted for Lilleri.** The product strategy is own AI categorisation with explicit rules winning over AI, and own reconciliation. Vendor categories, recurring flags and merchant logos are nice-to-have inputs, not dependencies; access-budget scheduling still needs bank-specific accounting, paging/retry coordination and failure handling. Scoring these highly favours Tink/Salt Edge for capabilities Lilleri will not rely on (the matrix treats enrichment as optional and its scores as judgements).
4. **Nobody has measured Italian field fill-rates.** The reconciliation promise depends on `bookingDate`/`valueDate`, counterparties, remittance text and stable ids actually arriving from CBI Globe banks. Every provider profile says "schema has it; bank fill UNKNOWN". The decision must include an instrument to measure this before the architecture is frozen.
5. **PayPal, Satispay and Hype were assumed, then found absent at the one provider whose Italian list we could read (Tink).** They are top-of-mind for Italian users under 40 and must be RFP clauses, not assumptions; CSV import and bank-side detection must be in the MVP regardless of provider [NB-§13].
6. **Route B (agent) was initially presented as a standard product.** It is not (one Tink agent exists; TrueLayer frames it as transitional). Planning around it would have cost months.
7. **The Italian-supervised option was under-explored.** Fabrick's Banca d'Italia licence and "fourth party" wording directly address the P0 counsel question; its B2C willingness is unknown only because nobody asked.

### 5.3 Counter-proposal

- **Primary: Yapily (Yapily Connect UAB).** Reasons: (i) best-evidenced EEA licence on a public register with explicit "provider statement about no agency registration for EEA PSUs; Lilleri classification unresolved" wording — provider evidence to examine; Italian acceptance for Lilleri remains unresolved; (ii) richest raw Berlin Group surface (ISO and proprietary bank transaction codes, payee/payer with account identifiers, value dates, remittance arrays) — the inputs an own reconciliation engine needs; (iii) 180-day EEA consent documented, Italian institution behaviour documented per bank (Intesa's 14-day window and 429 throttling); (iv) stable finances after 2025; (v) low lock-in (Berlin-Group-like schema; Data Plus optional); (vi) Italian PFM reference (Moneyfarm). Costs accepted: build the bank picker/consent UI (Hosted Pages in a webview for MVP), build the refresh scheduler, no native SDK, sales conversation for production keys.
- **Secondary / fallback: Enable Banking.** Reasons: documented route A with a terms-consent widget; the most explicit Italian coverage page and active 2026 Italian card-account work; per-connected-account pricing with a quote tool; EU company; **restricted-production mode gives real Italian data before any contract**; documented BYO-licence exit for phase 2; thin API close to Berlin Group semantics. Use it from day one as the fill-rate measurement instrument and keep a non-exclusive contract so that switching is a connector change.
- **Challenger: Tink.** Quote in the same RFP. Becomes primary if, within the RFP window, it (a) accepts Lilleri as a customer on its licence with a quote at or below the Base assumptions in `provider-cost-model.md`, (b) confirms 180-day consent for Italian banks, (c) names an EU hosting region, and (d) adds PayPal or Satispay to its Italian catalogue or confirms a roadmap.
- **Parallel enquiry: Fabrick.** Ask for Fabrick Pass B2C terms, developer sandbox, Hype/Postepay/Nexi coverage, price model (flat fee vs revenue share), and the Banca d'Italia "quarta parte / pseudo TPP" text. If it sells to a B2C startup on usable terms, re-run the matrix; its Italian supervision could outweigh DX gaps for the trust priority.
- **Excluded for now:** Salt Edge (until EEA entity named — then re-admit to the RFP), TrueLayer, Plaid EU, Powens, Mastercard OFE, Neonomics, Klarna, finAPI, Qwist, Bud (enrichment only), CBI Globe direct (phase 2+), GoCardless (closed).
- **Architecture decision independent of provider:** canonical transaction schema modelled on Berlin Group fields, raw provider payload retained per transaction, provider adapter per institution (so that a second provider can serve institutions the first covers badly), refresh budget tracked per consent, consent state machine with expiry reminders from day ~150 and history-gap handling.

### 5.4 Critique of the counter-proposal (second pass)

- *"Yapily requires more engineering than Tink."* True (UI + scheduler ≈ 2–4 engineer-weeks, ASSUMPTION), but this code is also the place where Lilleri's refresh timing, consent UX and error handling live — control that matters for trust and reliability. Tink Link's convenience does not remove the need for Lilleri's own consent-management screen.
- *"Yapily's EU data residency and status page are unknown."* Both are RFP gates (G-gates below); a "data stored outside the EEA" answer would demote Yapily behind Enable Banking (company nationality is not proof of hosting or support access; the gate is independent of scores).
- *"Enable Banking is small."* True; that is why it is fallback, not primary, and why the contract is non-exclusive. Its restricted-production value is independent of its long-term size.
- *"Why not simply Enable Banking primary given it is cheaper and faster?"* The build-own preference is a judgement, not a statistical result; price and onboarding speed remain unquoted and untested. The tie-breakers are licence evidence quality (register entry vs FAQ snippet), documented 180-day consent, documented raw field richness (FACT vs ASSUMPTION) and vendor scale — all on the trust/data-correctness side of Lilleri's priorities. If Enable Banking's pilot shows equal field richness on the top-10 Italian banks and its quote lands under Yapily's, the order flips without regret: both adapters exist.
- *"The counsel question L1 could invalidate route A entirely."* Then every proposed route A arrangement, including Fabrick, must be reclassified; domestic supervision alone is not an exemption; the only mitigation is to ask counsel now and keep the Fabrick line open. This is why Fabrick's enquiry runs in parallel rather than later.

### 5.5 DECISION

| # | Decision | Label | Owner / by when |
|---|---|---|---|
| D1 | **Primary provider: Yapily (Yapily Connect UAB) under route A**, subject to gates G1–G4. | DECISION (conditional) | CTO; RFP answers within 4 weeks of sending |
| D2 | **Secondary/pilot candidate: Enable Banking.** Build its adapter only after sandbox terms and credentials are supplied. A restricted-production study needs approved terms, privacy/legal review and authorised participants who authenticate directly at their banks; never collect personal bank credentials. Measure fields, history, pending, renewal and account-type exposure before selecting a production provider. | DECISION (conditional) | CTO; blocked on provider access and human approvals |
| D3 | **Tink is the challenger**: same RFP; promoted to primary only if conditions (a)–(d) in §5.3 are met. | DECISION | CTO |
| D4 | **Fabrick parallel enquiry** (Fabrick Pass B2C terms, Hype coverage, Banca d'Italia text). | DECISION | CEO/CTO; 2 weeks |
| D5 | **Salt Edge excluded** until it names its EEA entity, NCA and EBA entry; re-admitted automatically if it does (it would then be re-scored). | DECISION | — |
| D6 | **Route B (agent) is not a launch dependency**; request it in writing from Yapily/Tink/Fabrick as an optional upgrade. **Route C (own registration)** is a phase-2 decision gated on product-market signal and on the counsel opinion; direct CBI Globe is the cost lever after it. | DECISION | — |
| D7 | **Provider-independent architecture:** canonical transaction schema, minimal time-bounded raw evidence under the retention model, adapter boundary and synthetic mock first. Per-bank paging, access budgets and lifecycle fields are configurable. A second provider requires its own authorisation; consent and transaction identifiers are not automatically portable. | DECISION | Architecture ADR |
| D8 | **MVP coverage claims:** only tested institution/account-type routes and actual history intervals. Mock data is clearly labelled. Unknown cards/wallets are not connected; bank-side card debits are unitemised unless an independent card ledger/import exists. Wallet top-ups show movement to an uncovered destination, not wallet spending or a verified wallet balance. CSV/manual fallback capabilities must match implemented parsers. | DECISION | Product |
| D9 | **Counsel engagement now** on L1 (route A acceptability and consent wording) — P0 before any production launch. | DECISION | CEO; engage within 2 weeks |

**Production gates for every candidate (DECISION; failure pauses that candidate, with no automatic promotion of an unqualified fallback):**

- G1 — Written provider confirmation of EEA entity, NCA/register, Italy passport and contractual role, plus Italian counsel approval of Lilleri’s actual AIS/data recipient role, disclosures and permitted processing.
- G2 — Comparable written quotes at 1k/10k/100k accounts/users with meter, included quota, floors, calls, setup, renewal and exit terms. Evaluate against the current Plus-only business model and free-AIS guardrail in `docs/business/unit-economics.md`; the research Base cost is an assumption, not an approved quote. No purchase/contract is authorised by this document.
- G3 — EU/EEA hosting region and sub-processor list; DPA; 12-month AIS success rates for Intesa, UniCredit, Poste, BPM, BPER, MPS; status page or equivalent.
- G4 — Italian institution list (CSV) with account types exposed (current/card/prepaid), history at first consent, pending support, consent validity, auth flow — including explicit yes/no for PayPal, Satispay, Hype, N26, Revolut, Fineco cards, Nexi prepaid, Amex IT.

---

## 6. Gate B assessment — is feasible Italian financial-data coverage available?

**Verdict (DECISION): PASS WITH CONDITIONS for technical research feasibility and mock-first engineering; production acceptance BLOCKED.** Institution listings demonstrate possible routes, not complete current account data or approval for Lilleri’s legal role. G1–G4 and a bank-level data-quality pilot must pass before real-user launch.

| Coverage need | Evidence | Label | Condition |
|---|---|---|---|
| Current accounts of the major Italian banks (Intesa, UniCredit, BPM, BPER, MPS, BNL, CA, Credem, BCC, Mediolanum) | Reachable via CBI Globe/own APIs through at least Enable Banking (own IT page), Tink (own IT list), Yapily (institution pages), Plaid/Salt Edge (third-party lists) | FACT (multi-provider) | Written account-type coverage plus end-to-end authorised pilot; history, IDs, paging, error rates and renewals measured. |
| Prepaid IBAN accounts (Postepay, BancoPosta) | Poste on CBI Globe; listed at Enable Banking, Tink, Salt Edge, Yapily | FACT (listing) / UNKNOWN (quality) | Account-type confirmation and authorised end-to-end pilot, including Postepay variant and balance semantics. |
| Neobanks (Revolut IT, N26) | Tink IT list (both); Enable Banking (Revolut; N26 per Apr 2026 changelog snippet) | FACT (Tink) / FACT-snippet (EB) | Confirm in RFP CSV. |
| Hype | UNKNOWN at Tink (absent), Enable Banking, Yapily, Salt Edge; ASSUMPTION via Fabrick | UNKNOWN | RFP clause; Fabrick enquiry; do not promise. |
| Credit cards | Nexi: prepaid only; UniCredit/Mediolanum/CA: absent through EB in March2026, other/current routes UNKNOWN; Fineco: yes (EB, 2026); Amex IT: UNKNOWN | FACT (partial) | Do not promise credit cards in the MVP; expose bank-side card settlements instead; CSV import for Amex/Nexi exports. |
| PayPal | PSD2 interface exists; provider coverage specific (Tink: no) | FACT / UNKNOWN | Hard RFP requirement; CSV fallback in MVP. |
| Satispay | XS2A portal exists; current aggregator listing and account-data behaviour unverified | UNKNOWN | RFP enquiry; show bank-side top-ups to a destination outside coverage. User-supplied snapshots/imports carry date and incomplete status; no inferred pseudo-account balance [NB-§2]. |
| Data depth and quality | ~90 days at first consent; pending availability per bank UNKNOWN; counterparty fill-rates UNKNOWN; Intesa 14-day window | FACT / UNKNOWN | Enable Banking restricted-production pilot (D2) before freezing reconciliation; CSV import for history. |
| Legal basis to receive the data | Route A documented by ≥6 providers; Banca d'Italia position UNKNOWN | FACT / UNKNOWN | Counsel opinion (D9) before production; Fabrick assessed under the same role/contract gate. |

**Interpretation (HYPOTHESIS):** the research supports building a testable current-account workflow. It does not prove that the entire financial picture is correct or complete. Card settlements without purchase feeds are unitemised bank debits; wallet top-ups cannot reveal wallet purchases, cashbacks, P2P or refunds. Copies of the same payment across feeds require provenance and conservative matching, not amount/date deletion. Example release copy must use tested coverage, e.g. *"Conti collegati aggiornati al [data/ora]. Le fonti non collegate e i saldi manuali sono indicati a parte. Per Satispay vediamo le ricariche sul conto, non i singoli acquisti."*
---

## Decisions / Recommendations

1. Primary provider **Yapily (Yapily Connect UAB)**, route A, conditional on gates G1–G4 (DECISION D1).
2. Fallback **Enable Banking**, non-exclusive; start its restricted-production pilot now as the measurement instrument for Italian field fill-rates (D2).
3. **Tink** as challenger in the same RFP with explicit promotion conditions (D3); **Fabrick** parallel enquiry as the Italian-supervised option (D4); **Salt Edge** excluded until its EEA entity is named (D5).
4. Plan for a reviewed route A as the planning hypothesis; request route B only as a written optional upgrade; route C (own registration) and direct CBI Globe are phase-2 decisions (D6).
5. Provider-independent architecture with canonical Berlin Group schema, raw payload retention, dual-provider adapters, per-consent refresh budget, 14-day paging parameter, consent state machine (D7).
6. MVP promises limited to current accounts, prepaid IBAN accounts and the main neobanks; no credit-card/Satispay/Hype promise; PayPal via AIS if listed, else CSV; CSV import of the six main export formats in the MVP (D8).
7. Engage Italian regulatory counsel on route A acceptability and consent wording within two weeks (D9).
8. Gate B: PASS WITH CONDITIONS for research/mock engineering; real-user production acceptance blocked until §6 conditions pass.

## Open questions

| # | Question | Label | How to resolve | Priority |
|---|---|---|---|---|
| Q1 | Banca d'Italia's written position on an unlicensed Italian B2C recipient of AIS data under an EU provider's licence; mandatory consent/T&C content. | UNKNOWN | Counsel opinion; Canale Fintech; Fabrick's compliance team ("quarta parte / pseudo TPP" text). | P0 |
| Q2 | Yapily: Italy passport line on the EBA register; EU hosting region; status page; 12-month success rates per Italian bank; quote and floor. | UNKNOWN | RFP (gates G1–G4). | P0 |
| Q3 | Enable Banking: minimum monthly invoice amount and included quota; AIS data webhooks; SLA; status page; Italian ASPSP CSV incl. PayPal/Satispay/Hype; legal entity name and Italy passport. | UNKNOWN | Quote tool + RFP; restricted-production pilot. | P0 |
| Q4 | Per-bank field fill-rates (`creditorName`, `endToEndId`, `bankTransactionCode`, value date), pending availability, consent `valid_until`, card-account exposure for the top-10 Italian banks. | UNKNOWN | Enable Banking restricted-production pilot (D2); Yapily sandbox cannot answer this (mock institutions). | P0 |
| Q5 | Tink: does it onboard a pre-seed B2C customer on its licence, in how many weeks, at what price; 180-day Italian consent; EU hosting; Tink impact of Visa's July 2026 layoffs. | UNKNOWN | RFP. | P1 |
| Q6 | Fabrick Pass: B2C eligibility, pricing model (flat fee vs revenue share), sandbox, Hype coverage, developer docs. | UNKNOWN | Direct enquiry. | P1 |
| Q7 | Salt Edge: EEA-authorised entity, NCA, EBA-register ID, Banca d'Italia notification. | UNKNOWN | Written question; exclusion stands until answered. | P1 |
| Q8 | PayPal (PPLXLULL) and Satispay reachability at Yapily, Enable Banking, Salt Edge, Fabrick; Trade Republic cash account; Amex IT. | UNKNOWN | RFP CSV; sandbox `institutions?country=IT` / `aspsps?country=IT`. | P1 |
| Q9 | PSR agreed text: 180 vs 365-day AIS SCA cycle; exact 4×/24 h wording; adoption after the 14 Dec 2026 indicative plenary. | UNKNOWN | Read Council doc 8222/26; OEIL quarterly. | P2 |
| Q10 | CBI Globe TPP fee schedule and onboarding SLA; own-registration cost (law-firm quotes, PII premium, eIDAS). | UNKNOWN | Request from CBI; 2–3 law-firm quotes; QTSP price list. | P2 (phase 2) |
| Q11 | CRIF as an Italian-supervised alternative to Fabrick. | UNKNOWN | Add to RFP long list. | P2 |
| Q12 | Enable Banking institution count: own "2,700+ ASPSPs" vs openbankingtracker "108 institutions" — different definitions? | CONFLICT | Live `GET /aspsps` count. | P2 |

## Sources

All URLs were seen on 2026-10-02 as search-engine excerpts or documentation-mirror text unless the raw note states a full fetch; reliability as graded in the raw notes. `A-#n` = source number n in `open-banking-providers-a.md`; `B-#n` in `open-banking-providers-b.md`; `NB-S-n` in `non-bank-sources-and-os-limits.md`; `REG-S-n` in `regulatory-landscape.md`.

| Tag | Source | URL | Verified | Reliability | Used for |
|---|---|---|---|---|---|
| A-#1 | EUR-Lex, Delegated Regulation (EU) 2022/2360 | https://eur-lex.europa.eu/eli/reg_del/2022/2360/oj/eng | 2026-10-02 | high | 180-day renewal |
| A-#3 | EBA Q&A 2019_4631 | https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2019_4631 | 2026-10-02 | high | 4×/24 h |
| A-#159 | Norton Rose Fulbright, Regulation Tomorrow (Aug 2022) | https://www.regulationtomorrow.com/2022/08/commission-delegated-regulation-amending-the-rts-as-regards-the-90-day-exemption-for-account-access/ | 2026-10-02 | medium-high | Application 25 Jul 2023 |
| A-#161 | EBA Q&A 2023_6820 | https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2023_6820 | 2026-10-02 | high | Post-amendment interpretation |
| A-#152 | OEIL procedure file 2023/0209(COD) (PSR) | https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2023%2F0209%28COD%29 | 2026-10-02 | high | PSR not adopted |
| A-#153 | Clearingpost, 14 Dec 2026 indicative plenary | https://clearingpost.com/insights/legislative-observatory-lists-december-14-indicative-plenary-date-for-psd3-and-p/ | 2026-10-02 | medium | PSR timeline |
| A-#154 | Arthur Cox, PSD3/PSR final compromise texts | https://www.arthurcox.com/insights/psd3-and-psr-final-compromise-texts-published/ | 2026-10-02 | medium-high | 18/21-month clocks |
| A-#155 | Freshfields, PSD3/PSR | https://www.freshfields.com/en/our-thinking/blogs/risk-and-compliance/psd3-psr-what-the-eus-new-payments-rules-mean-for-your-business-102mrom | 2026-10-02 | medium-high | OJ pending |
| A-#11 | Banca d'Italia FAQ Istituti di pagamento | https://www.bancaditalia.it/compiti/vigilanza/accesso-mercato/istituti-pagamento/faq-istituti-pagamento/index.html | 2026-10-02 | high | 90-day decision; agents |
| A-#194 | Banca d'Italia, Istituti di pagamento (accesso al mercato) | https://www.bancaditalia.it/compiti/vigilanza/accesso-mercato/istituti-pagamento/index.html | 2026-10-02 | high | AISP register section |
| A-#12 | Diritto Bancario, disciplina degli AISP | https://www.dirittobancario.it/art/la-disciplina-degli-aisp-nelle-nuove-disposizioni-di-vigilanza-della-banca-d-italia/ | 2026-10-02 | medium | Registration mechanics |
| A-#14, #15 | CBI Globe Wiki / FAQ | https://www.cbiglobe.com/Wiki/index.php/1.1_API_and_PSD2 ; https://www.cbiglobe.com/Help-Center/FAQ/L/0 | 2026-10-02 | high | Gateway; eIDAS |
| A-#193 | Nexi Group, CBI Globe passive functionality | https://www.nexigroup.com/en/business/banks-and-financial-institutions/open-banking/compliance-and-vas/ | 2026-10-02 | high (self-claim) | ~300 banks / 80 % (launch-era) |
| B-#30 | CBI Globe Registrazione TPP; Nexi active functionality | https://www.cbiglobe.com/Registrazione-TPP ; https://www.nexigroup.com/en/business/banks-and-financial-institutions/open-banking/active-functionality/ | 2026-10-02 | high | TPP-only registration; "100 % of Italian banks" |
| A-#23, #191, #192 | Nexi open banking / PSD2 Data Opening | https://nexi.it/openbanking.html ; https://www.nexi.it/news/pagamenti-digitali/psd2.html ; https://www.nexi.it/en/openbanking.html | 2026-10-02 | high | AIS for prepaid cards only |
| A-#30, #31 | American Express Open Banking | https://developer.americanexpress.com/open-banking ; https://a4dexternal.americanexpress.com/products/account-and-transaction-api-public/overview | 2026-10-02 | high | Amex API (UK/FR) |
| A-#24, #25 | Poste Italiane open banking; openbankingtracker Postepay | https://www.posteitaliane.it/en/open-banking.html ; https://www.openbankingtracker.com/provider/poste-pay-card | 2026-10-02 | high / medium | Postepay reachability |
| A-#26 | openbankingtracker, Hype | https://www.openbankingtracker.com/provider/hype | 2026-10-02 | medium | Hype PSD2 APIs |
| A-#27, #28 | Revolut Open Banking API; openbankingtracker Revolut | https://developer.revolut.com/docs/open-banking/open-banking-api ; https://www.openbankingtracker.com/provider/revolut | 2026-10-02 | high / medium | Revolut coverage |
| A-#29 | Satispay Open Banking portal | https://openbanking.satispay.com/ | 2026-10-02 | high | XS2A portal exists |
| A-#99–#103 | Yapily institution configuration pages (Intesa, BPM, Poste, MPS, BNL) | https://docs.yapily.com/institution-configurations/italy/Intesa-Sanpaolo (and siblings) | 2026-10-02 | high (mirror) | CBI Globe routing |
| A-#195 | Yapily data restrictions (live) | https://docs.yapily.com/pages/data/financial-data-resources/data-restrictions/ | 2026-10-02 | high | Intesa 2-week window; 429 |
| A-#90, #94 | Yapily consents; Connect AIS UX guidelines | https://docs.yapily.com/data/financial-data-resources/financial-data-consents ; https://docs.yapily.com/tools-and-services/yapily-connect/yapilyconnect-ux-ais-guidelines | 2026-10-02 | high | 180-day EEA; no agency for UAB customers |
| A-#92, #93, #146 | Yapily Connect overview; licensing; registration | https://docs.yapily.com/tools-and-services/yapily-connect/overview ; https://docs.yapily.com/concepts/licensing-and-registration ; https://docs.yapily.com/getting-started/integration-setup/registration | 2026-10-02 | high | Route A |
| A-#95, #96, #97 | Yapily transactions; Data Plus | https://docs.yapily.com/api-reference/financial-data/get-account-transactions ; https://docs.yapily.com/api-reference/data-plus/get-enrichment-results ; https://docs.yapily.com/data/data-plus/categorisation | 2026-10-02 | high | Raw fields; enrichment |
| A-#172, #173, #174, #175 | Bank of Lithuania register; Estonian FSA; Yapily end-user terms; Yapily compliance blog | https://www.lb.lt/en/sfi-financial-market-participants/yapily-connect-uab ; https://www.fi.ee/en/payment-services/payment-institutions/payment-services/providers-cross-border-payment-sevices/yapily-connect-uab ; https://www.yapily.com/legal/end-user-terms ; https://www.yapily.com/blog/how-yapily-approaches-compliance-in-open-banking | 2026-10-02 | high / medium-high | Yapily Connect UAB licence |
| A-#108, #198 | Tech.eu; PaymentExpert — Yapily/Adyen, losses reduced | https://tech.eu/2025/02/03/yapily-inks-deal-with-adyen-says-losses-significantly-reduced/ ; https://paymentexpert.com/2025/02/04/adyen-harnesses-yapilys-open-banking-to-streamline-customer-onboarding/ | 2026-10-02 | medium | Stability |
| A-#177–#179 | finAPI newsroom; FinTech Futures — Yapily deal lapsed, Fabrick bought finAPI | https://www.finapi.io/en/fabrick-acquires-finapi/ ; https://www.finapi.io/en/fabrick-announces-acquisition-of-finapi/ ; https://www.fintechfutures.com/m-a/open-finance-fintech-fabrick-to-acquire-finapi-from-germany-s-schufa | 2026-10-02 | high / medium | Corporate facts |
| A-#40, #41, #162, #163, #164 | Tink legal FAQ; Use of Agents; End-User Terms | https://tink.com/legal/faq/ ; https://tink.com/legal/tinksuseofagents/ ; https://cdn.tink.se/legal/terms-and-conditions/en_UK/end-user-terms-of-service-en_UK-2510-v2.pdf | 2026-10-02 | high | Tink route A; one agent |
| A-#42–#53, #139–#141 | Tink docs (PSD2 intro, consent reconfirmation, transactions, webhooks, Account Check, enrichment, Tink Link customisation, changelog) | https://docs.tink.com/resources/aggregation/introduction-to-psd2 ; https://docs.tink.com/resources/transactions/consent-reconfirmation ; https://docs.tink.com/resources/business-transactions/list-business-transactions ; https://docs.tink.com/resources/transactions/webhooks-for-transactions ; https://docs.tink.com/resources/account-check/account-check-sdk-sessions ; https://tink.com/products/data-enrichment/ ; https://docs.tink.com/resources/tink-link-web/tink-link-web-customization ; https://docs.tink.com/changelog?tags=Tink+Link | 2026-10-02 | high (mirror) | Tink capabilities |
| NB-S-37 | Tink market capabilities, Italy (provider table) | https://docs.tink.com/market-capabilities/aggregation?market=IT | 2026-10-02 (mirror, cache date unknown) | medium-high | ~70 IT providers; no PayPal/Satispay/Hype |
| A-#57, #58, #59 | Tink status; Tink providers Italy status; StatusGator | https://status.tink.com/ ; https://tinkitaly.statuspage.io/ ; https://statusgator.com/services/tink-italy | 2026-10-02 | high / medium | Italian incidents 2026 |
| A-#180, #181 | CNBC; Bloomberg — Visa 7 % layoffs 28 Jul 2026 | https://www.cnbc.com/2026/07/28/visa-is-cutting-7percent-of-employees-in-efficiency-push-as-ai-reshapes-work.html ; https://www.bloomberg.com/news/articles/2026-07-28/visa-to-cut-7-of-workforce-as-ceo-seeks-to-revamp-payments-firm | 2026-10-02 | high | Vendor risk |
| A-#63, #187 | Finexer; MerchantMachine — Tink pricing claims | https://blog.finexer.com/tink-pricing/ ; https://merchantmachine.co.uk/open-banking-payments/tink/ | 2026-10-02 | low | €0.50/user/mo (unverified) |
| A-#64–#80, #142, #143, #165–#171 | TrueLayer blog/support/docs; CBI register; Latvijas Banka; press on 2025 layoffs/round | https://truelayer.com/blog/italy-launch/ ; https://support.truelayer.com/hc/en-us/articles/360005473714 ; https://docs.truelayer.com/docs/collect-user-consent ; https://docs.truelayer.com/docs/create-a-connection-v3 ; https://docs.truelayer.com/docs/transaction-data-reference ; https://registers.centralbank.ie/FirmDataPage.aspx?firmReferenceNumber=C433487 ; https://www.finextra.com/newsarticle/45072/truelayer-lays-off-25-of-staff-in-a-single-day ; https://finance.yahoo.com/news/tiger-backed-truelayer-loses-unicorn-091524083.html | 2026-10-02 | high / medium-high | TrueLayer profile |
| A-#114–#135, #149, #182–#186 | Salt Edge Partner Program; docs v5/v6; swagger; privacy/security; Backbase; Finextra/Finovate FCA licence; pricing listings; firefly-iii #2036 | https://www.saltedge.com/products/account_information/partner_program ; https://docs.saltedge.com/partners/v1/ ; https://docs.saltedge.com/v6/api_reference ; https://docs.saltedge.com/account_information/v5/ ; https://www.saltedge.com/legal/privacy_policy ; https://www.finextra.com/pressarticle/77911/salt-edge-receives-aisp-licence-from-fca ; https://github.com/firefly-iii/firefly-iii/issues/2036 ; https://www.trustradius.com/products/salt-edge/pricing | 2026-10-02 | high / medium / low | Salt Edge profile |
| B-#12, #13, #42, #63 | Enable Banking Italy page; changelogs; FAQ; widgets; linked-accounts; TPP IaaS; terms | https://enablebanking.com/docs/markets/it/ ; https://enablebanking.com/blog/2026/04/08/enable-banking-changelogmarch-2026 ; https://enablebanking.com/blog/2026/05/14/enable-banking-changelog-april-2026 ; https://enablebanking.com/docs/faq/ ; https://enablebanking.com/docs/api/widgets ; https://enablebanking.com/docs/api/linked-accounts ; https://enablebanking.com/docs/tpp ; https://enablebanking.com/terms/ | 2026-10-02 | high (snippets/mirror) | Enable Banking profile |
| B-#1, #48, #51, #52, #53, #68 | Fabrick pages; Fabrick Pass; licence press (MilanoFinanza, BeBeez PDF, Aziendabanca, Economyup); adopters; Teleborsa results | https://www.fabrick.com/it/fabrick-pass-servizi-as-a-service ; https://www.milanofinanza.it/news/fabrick-diventa-istituto-di-pagamento-202005281024454561 ; https://bebeez.it/files/2020/05/280520_Fabrick_licenzaIP.pdf ; https://lventuregroup.com/wp-content/uploads/2021/11/Partnership-tra-Pinv-e-Fabrick-CS.pdf ; https://www.teleborsa.it/News/2026/02/10/fabrick-sella-ricavi-salgono-a-66-milioni-di-euro-nel-2025-191.html | 2026-10-02 | high (self) / medium-high | Fabrick profile |
| B-#6, #8, #50 | GoCardless pricing page; BAD docs; new-signups-disabled page; Actual Budget docs | https://gocardless.com/en-us/pricing ; https://developer.gocardless.com/bank-account-data/overview ; https://bankaccountdata.gocardless.com/new-signups-disabled ; https://actualbudget.org/docs/advanced/bank-sync/gocardless/ | 2026-10-02 | high / medium | Closure |
| B-#18, #43, #54 | Powens pages, docs, leadership/ownership press | https://www.powens.com/about-us/ ; https://www.powens.com/sas-conditions-sale/ ; https://www.powens.com/blog/products-news-coverage-italy-spain/ ; https://docs.powens.com/documentation/integration-guides/wealth-and-loans ; https://www.businesswire.com/news/home/20230612025886/en/ | 2026-10-02 | high (self) / medium-high | Powens profile |
| B-#10, #20, #46, #56 | openbankingtracker Plaid; Plaid blogs; Plaid docs; Plaid legal footer; OBIE Plaid B.V. | https://www.openbankingtracker.com/api-aggregators/plaid ; https://plaid.com/blog/plaid-europe-open-banking-2025/ ; https://plaid.com/docs/api/link/ ; https://plaid.com/en-eu/resources/banking/search/ ; https://www.openbanking.org.uk/regulated-providers/plaid-b-v/ | 2026-10-02 | medium / high | Plaid profile |
| B-#23, #24, #57 | Neonomics pages; GetApp; Tech.eu/ThePaypers Ordo closure; Finextra Access PaySuite | https://www.neonomics.io/market-coverage ; https://www.getapp.com/finance-accounting-software/a/neonomics/ ; https://tech.eu/2025/08/05/uk-open-banking-firm-ordo-to-close/ ; https://www.finextra.com/newsarticle/47938/access-paysuite-acquires-ordos-open-banking-technology-infrastructure | 2026-10-02 | high (self) / medium-high | Neonomics profile |
| B-#25, #44, #58, #59 | Mastercard Open Finance Europe docs (unlicensed Aiia Data FAQ, API refs); investor news; Spiir shutdown press; OBIE entity | https://developer.mastercard.com/open-finance-europe/documentation/unlicensed/aiia-data/faq ; https://developer.mastercard.com/open-finance-europe/documentation/unlicensed/aiia-data/api-references ; https://investor.mastercard.com/investor-news/investor-news-details/2021/Mastercard-Advances-Global-Open-Banking-Capabilities-With-Close-of-Aiia-Acquisition/default.aspx ; https://mobilpuls.dk/artikel/mastercard-lukker-spiir-8-juni-2026 ; https://www.openbanking.org.uk/regulated-providers/aiia-a-s/ | 2026-10-02 | high / medium | Mastercard profile |
| B-#27, #28, #29, #60, #65, #67 | Klarna Kosma press; Qwist press; Bud press; Yolt (ING) | https://tech.eu/2023/07/31/klarna-scraps-open-banking-brand-klarna-kosma/ ; https://qwist.com/en/resources/press/ ; https://thefintechtimes.com/bud-financial-expands-team-in-lithuania-after-securing-local-ais-provider-licence/ ; https://ing.com/news/2022/09/yolt-to-phase-out-its-business-to-business-open-banking-operations.html | 2026-10-02 | medium / high | Others |
| B-#31 | Brentasoft blog (PSD2 cost anchors, 2021) | https://brentasoft.com/blog/psd2-open-banking-pmi-italiane-2021/ | 2026-10-02 | low | CBI integration budget anchors only |
| B-#33, #34, #36, #66 | Banca d'Italia Disposizioni/Provvedimento 2019/D.Lgs. 218/2017; Diritto Bancario PDF; OAM; brocardi art. 114-septies | https://www.bancaditalia.it/compiti/vigilanza/normativa/archivio-norme/disposizioni/disp-ip-20120620/Disposizioni-vigilanza-per-IP-e-IMEL-versione-integrale-al-22-febbraio-2022.pdf ; https://www.organismo-am.it/profilo-professionale-agente ; https://www.brocardi.it/testo-unico-bancario/titolo-v-ter/art114septies.html | 2026-10-02 | high / medium | Route C mechanics |
| B-#61 | PSD3/PSR law-firm and vendor notes (William Fry, EY Belgium, crassula, openbankingtracker, dudkowiak, KPMG Law, PwC) | https://www.williamfry.com/knowledge/psr-psd3-eu-payment-services-legislation-is-agreed/ ; https://www.ey.com/en_be/technical/financial-services/financial-services-alerts/payment-services-regulation-key-impacts-on-payment-service-providers ; https://www.openbankingtracker.com/guides/psd3-psr-readiness ; https://www.dudkowiak.com/blog/psd3-and-psr-final-texts-agreed-new-obligations-for-payment-institutions | 2026-10-02 | medium-high / medium | PSR content (cap retained; 180 vs 365) |
| NB-S-15, S-16 | GitHub caches of the GoCardless institution record PAYPAL_PPLXLULL | https://github.com/frieser/openbanking-cli | 2026-10-02 | medium | PayPal PSD2 interface |
| NB-S-13 | PayPal Transaction Search (server SDK docs) | https://github.com/paypal/paypal-dotnet-server-sdk/blob/main/doc/controllers/transaction-search.md | 2026-10-02 | medium-high | Merchant-side API |
| REG-S-26 | EDPB Guidelines 06/2020 (PSD2/GDPR interplay) | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-062020-interplay-second-payment-services-directive_en | 2026-10-02 (not fetched) | high | Art. 94(2) consent reading |
| REG-S-21 | Regulation (EU) 2022/2554 (DORA) | https://eur-lex.europa.eu/eli/reg/2022/2554/oj | 2026-10-02 (not fetched) | high | DORA scope |
| NEW-1 | WebSearch: Salt Edge EEA entity (results: crassula AISP guide; Salt Edge Partner Program; Aruba case study) | https://crassula.io/guides/licenses/aisp/ ; https://www.saltedge.com/products/account_information/partner_program | 2026-10-02 | low-medium | Only UK FCA registration surfaced; Lithuania as AIS passport hub (3–4 months, secondary) |
| NEW-2 | WebSearch: Enable Banking pricing (openbankingtracker; FAQ; G2; rfp.wiki; dev.to) | https://www.openbankingtracker.com/enablebanking ; https://enablebanking.com/docs/faq/ ; https://www.g2.com/products/enable-banking/pricing ; https://dev.to/johnfrandsen/the-cheapest-open-banking-apis-for-small-businesses-and-indie-builders-in-2026-5cab | 2026-10-02 | medium / low | "no price list; Get a Quote since April 2026"; minimum invoicing confirmed |
| NEW-3, NEW-10 | WebSearch: Satispay AIS aggregator coverage | https://openbanking.satispay.com/ ; https://www.openbankingtracker.com/answers/which-api-aggregators-support-european-psd2 | 2026-10-02 | medium | No aggregator listing found |
| NEW-4 | WebSearch: PayPal AIS at Salt Edge/Enable Banking/Yapily | https://docs.saltedge.com/v6/ ; https://www.openbankingtracker.com/open-banking-apis-europe | 2026-10-02 | medium | No coverage evidence either way |
| NEW-5 | WebSearch: CBI Globe TPP fees (brochure; FAQ; Nexi) | https://www.cbi-org.eu/Engine/RAServeFile.php/f/Documenti/CBIGlobe/Brochure_CBI_Globe_ITA.pdf ; https://www.cbiglobe.com/Il-servizio/CBI-Globe | 2026-10-02 | high (exist; not read) | No fee schedule found |
| NEW-6 | WebSearch: Fabrick Pass pricing (Fabrick fintech solutions page; BitMat Kalaway; Fabrick AISP product page) | https://www.fabrick.com/solutions/fintechs ; https://www.bitmat.it/vertical/finance-tech/kalaway-arricchisce-la-sua-piattaforma-con-fabrick-pass/ ; https://www.fabrick.com/it-it/prodotti/aisp/ | 2026-10-02 | high (self) / medium | "flat fee to revenue sharing"; no prices |
| NEW-7 | WebSearch: Hype aggregator coverage (openbankingtracker comparisons; Yapily blog) | https://www.openbankingtracker.com/api-aggregators/compare ; https://www.yapily.com/blog/tink-alternatives-6-open-banking-platforms-compared | 2026-10-02 | medium | Institution counts (Salt Edge 73 countries; Tink 46/511; Yapily 47/445; Enable Banking 41/108; Plaid 9,706) — automated; no Hype evidence |
| NEW-8 | WebSearch: Yapily Connect UAB Italy passport (lobbyfacts datacard; Yapily compliance blog; Yapily Connect docs) | https://www.lobbyfacts.eu/datacard/yapily-connect-uab?rid=082978347295-79 ; https://docs.yapily.com/pages/tools-and-services/yapilyconnect/yapilyconnect-overview/ | 2026-10-02 | medium / high | Lithuanian entity confirmed; Italy line not found |
| NEW-9 | WebSearch: Enable Banking Italy list (Italy market page; April 2026 changelog) | https://enablebanking.com/docs/markets/it/ ; https://enablebanking.com/blog/2026/05/14/enable-banking-changelog-april-2026 | 2026-10-02 | high (snippet) | N26 shown across countries served |

## Review log

Repository evidence review — 2026-10-02. Provider statements/register observations retain their original dates; no new provider agreement, credential access or fresh register/legal verification occurred.

| Critique | Resolution | Remaining evidence / owner |
|---|---|---|
| BLOCKER — provider licence/Italian supervision looked like automatic approval for Lilleri | Route A conditional on factual-role counsel opinion, permitted processing and provider written terms/passport; Fabrick assessed under same gate | Founder/Counsel: Q1/L1; provider EEA entity, Italy passport, contract and required UX |
| BLOCKER — failed primary gate automatically promoted an unqualified fallback | Every candidate passes legal, data, commercial and location gates; failure pauses that candidate | Provider/Counsel: G1–G4 evidence for any selected production route |
| MAJOR — 180-day consent, 90-day history and four refreshes were universal promises | SCA/consent/token expiry distinct; history and access accounting per bank/provider; retries/pages share actual budget | Engineering: authorised bank/account pilot and renewal trace |
| MAJOR — Satispay top-ups produced an inferred wallet ledger | Uncovered destination movement only; no itemised spending or complete pseudo-balance; card debit unitemised absent independent card ledger | Product: manual/import completeness copy; provider wallet/card evidence |
| MAJOR — personal founder-account pilot and numerical ranking implied current approval | Mock first; real study requires terms, authorised participants and legal/privacy review; rankings are evidence judgements | Founder: provider sandbox credentials/terms and human pilot approval, never personal bank credentials |
| MAJOR — raw payload retention/failover and DORA were oversimplified | Time-bounded evidence retention; independent consent per provider; DORA framework depends on entity/route | Security/Privacy/Counsel: retention, contract and incident obligations |

**Gate B:** PASS WITH CONDITIONS for technical research/mock engineering; **real-data beta/production BLOCKED** until role/passport/contract/location and bank-quality gates pass. Yapily is an RFP preference; Enable Banking a pilot candidate; no production provider has been contracted or validated.
