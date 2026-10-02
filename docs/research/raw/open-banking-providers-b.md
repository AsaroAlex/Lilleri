# Open banking data-aggregation providers for Italy — Group B

**Project:** LILLERI (consumer PFM, Italy-first, then Europe). Startup without its own AISP licence.
**Author:** specialist research agent (Phase 0). **Verification date for every claim: 2026-10-02.**
**Status vocabulary:** FACT (verified against a cited source on the verification date) · ASSUMPTION (working value, not verified) · HYPOTHESIS (belief to validate) · UNKNOWN (not findable; "how to verify" given).
**Adversarial verification pass (2026-10-02):** 14 decision-critical claims were re-checked; corrections are marked inline ("CORRECTED", "mirror read 2026-10-02", "via sibling …") and listed in **"Verification notes (adversarial pass)"** at the end of this document. The pass could not use WebSearch (session budget exhausted) nor fetch any primary web page (egress blocked); it relied on (a) Context7 documentation mirrors of Enable Banking, Powens, Plaid, GoCardless and Mastercard developer docs, and (b) independently sourced findings in the sibling research files of this repository.

## Scope note and evidence caveats

Providers in scope ("group B"): Fabrick (Sella group), GoCardless Bank Account Data (ex-Nordigen), Enable Banking, Powens (ex-Budget Insight), Plaid Europe, Neonomics, Mastercard Open Banking Europe (ex-Aiia), Klarna Kosma / Open Banking by Klarna, finAPI, Qwist, Bud Financial, CBI Globe as a direct option, plus Italy-focused players found (CRIF, Nexi Open, TAS Group, Mia-FinTech — see §14, mostly UNKNOWN). Group A (Tink, TrueLayer, Yapily, Salt Edge, …) is covered in the sibling document and only referenced here for the licensing comparison.

Research environment constraints (material to how to read this document):

- 24 distinct WebSearch queries were executed (EN + IT, including `site:` queries) before the session-wide search budget was exhausted; a further 9 planned queries (Fabrick licence/pricing, Italy-focused vendors, Banca d'Italia timelines, status pages, group-A licence programmes, openbankingtracker Italy counts, Plaid docs) could not run.
- 12 WebFetch attempts on primary sources (enablebanking.com, developer.mastercard.com, powens.com, developer.gocardless.com, cbiglobe.com, openbankingtracker.com, dev.to, dirittobancario.it, g2.com, rfp.wiki, plaid.com) all returned EGRESS_BLOCKED. **No primary page was read in full.** FACT labels below therefore mean "stated in a search-engine snippet/summary of the cited page on 2026-10-02", and every FACT must be re-verified on the primary page before any contractual, legal or pricing decision.
- Items marked ASSUMPTION draw on the agent's background knowledge (cut-off mid-2026) and were **not** confirmed in this session.
- Pricing: no public per-account/per-call euro figure was found for any group-B provider. All pricing cells are UNKNOWN with a verification route.

---

## 1. Regulatory baseline that applies to every provider (EU/Italy)

| Topic | Finding | Status | Source / how to verify |
|---|---|---|---|
| Scope of PSD2 data access | Only "payment accounts accessible online" (current accounts, many card accounts, some prepaid/e-money accounts). Loans, mortgages, securities/investment accounts and savings products without payment functionality are **outside** PSD2 AIS; any provider claiming them uses screen-scraping, bank partnerships or other non-PSD2 channels. | FACT (law) / ASSUMPTION for provider practice | PSD2 Directive (EU) 2015/2366 art. 4(12), art. 67 — eur-lex.europa.eu (not fetched this session; primary law, high reliability). Verify per provider which channel they use for non-payment accounts. |
| 90-day history without SCA | RTS on SCA & CSC (Delegated Reg. (EU) 2018/389) art. 10: AISP may read balance and the last 90 days of transactions without SCA; older history requires SCA. In practice most ASPSPs give deeper history (often 12–24 months) **at first consent** (when SCA is performed) and 90 days afterwards. | FACT (law); ASSUMPTION (practice) | eur-lex 2018/389 (high; not fetched). Verify per bank in provider ASPSP catalogues. |
| Background refresh limit | RTS 2018/389 art. 36(5): without the PSU actively requesting, an AISP may access data at most **4 times per 24 h**, unless a higher frequency is agreed with the ASPSP. | FACT (law) | eur-lex 2018/389 (high; not fetched). |
| Consent / SCA renewal 90 → 180 days | EBA final report EBA/RTS/2022/03 (5 April 2022) amended the RTS; the Commission adopted it as Delegated Regulation (EU) 2022/2360 (3 Aug 2022; OJ L 312, 5 Dec 2022). New art. 10a: ASPSPs **must not** apply SCA when the PSU accesses account data through an AISP (mandatory exemption) except on first access, and must re-apply SCA at least every **180 days** (was 90); for direct customer access the 180-day exemption is optional (art. 10). **Applicable from 25 July 2023.** Industry (Plaid) argued "180 days is not enough". | FACT (law) / FACT (application date — two independent secondary sources; OJ text not fetched) — **upgraded from ASSUMPTION** | EBA final report PDF (eba.europa.eu, 2022-04-05, high); MNB press release (high); Plaid blog "180 days is not enough" (medium); application date 25 July 2023 per financialinstitutionsnews.com 2022-12-05 (medium, via sibling `open-banking-providers-a.md` §2.1) and vixio/lexology (via sibling `competitors-eu-uk.md` §6). Confirm on eur-lex 2022/2360 art. 2. |
| Actual consent duration in Italy | Many Italian ASPSPs (via CBI Globe) implemented 180-day consent after the amendment; some providers' docs still default to 90 days (GoCardless docs snippet: "up to 90 days of continuous access"). Per-bank behaviour varies. | ASSUMPTION / conflict noted | GoCardless docs (medium, see §3). Verify in each provider's ASPSP catalogue for the top Italian banks. |
| PSD3 / PSR status | Provisional political agreement reported 27 November 2025; Council COREPER endorsed the trilogue texts on 22 April 2026 (texts published ~23 April 2026); EP ECON vote reported 5 May 2026 (the vote counts 55–3–5 / 50–2–2 come from secondary reporting and were not re-verified); plenary reported "late May 2026"; publication in the Official Journal was *anticipated* for June/July 2026. **Whether the PSR/PSD3 have actually been published in the OJ by 2026-10-02 is UNKNOWN** — no source in this repository confirms it. Even if published, the PSR applies only after an 18–21-month transition (Commission proposal: 18 months; spring-2026 reporting: 21 months) → **earliest application ≈ Q1–Q2 2028; not applicable today**; PSD3 additionally needs national transposition. **Design for PSD2 + RTS as in force.** | FACT (process status up to May 2026, secondary sources) / **UNKNOWN (OJ publication by today) — CORRECTED from an implied "pending publication"** / FACT (not applicable before 2028) | Worldline blog 2026 (medium), PaymentBrief 2026 (medium), openbankingtracker PSD3 guide (medium), Council doc ST-8220-2026-INIT (high, not fetched); corroborated by sibling `regulatory-landscape.md` §2 (Norton Rose Fulbright 2026, Morrison Foerster 2026-04-30, Lexology 2026 — all via prior session, medium-high). Verify OJ publication and application dates on eur-lex (OEIL 2023/0209(COD) PSR, 2023/0210(COD) PSD3). |
| PSD3/PSR content relevant to PFM | Reported: standardised dedicated interfaces, stronger API governance, permission dashboards at banks. On SCA renewal the Commission **proposal** shifts the ≥180-day re-authentication from the bank to the **AISP** (the AISP applies its own SCA); whether the final text keeps this is UNKNOWN — the earlier wording "180-day re-authentication retained" was over-stated. Whether the "4×/day" cap is **removed** (the proposal moved the frequency rules to Level 1; reporting suggests access "whether or not the PSU is actively requesting") in the final text could **not be confirmed**. PSD3 reportedly retains the AISP *registration* regime (PII, no capital). | HYPOTHESIS (4×/day removal; AISP-side SCA) / FACT (proposal content only) | ThePaypers PSD3/PSR explainer (medium); Bird & Bird July 2023 note on the proposals (medium, via sibling `regulatory-landscape.md` §2). Verify against the final PSR text (Council 23 April 2026 publication). Treat any change as **not in force**. |
| Credit-card accounts in Italy | Not all Italian ASPSPs expose card accounts through their PSD2 APIs: UniCredit, Banca Mediolanum and Crédit Agricole reportedly do not; Finecobank card accounts became available at Enable Banking via a dedicated integration (March 2026). | FACT (Enable Banking docs/changelog snippets) | enablebanking.com/docs/markets/it/ and changelog 2026-04-08 (high for Enable Banking's view; bank behaviour may change). |

---

## 2. Fabrick (Banca Sella group) — Fabrick Platform / Open Banking / PSD2 gateway

### 2.1 Corporate facts and 2024–2026 changes

| Item | Finding | Status | Source |
|---|---|---|---|
| Ownership | Open-finance platform of the Sella group (Banca Sella); subsidiaries Fabrick Solutions Spain, Judopay (UK), finAPI (DE). Capital increase with **Mastercard** and **Gruppo Reale Mutua** as investors (before the finAPI deal). | FACT | SellaInsights, finapi.io press, Teleborsa 2026-02-10 (high/medium) |
| finAPI acquisition | Agreement announced 2025; completion of acquisition of **75 % of finAPI** from SCHUFA Holding AG on **19 June 2025**; remaining 25 % held by founders Florian Haagen and Martin Lacher. Purpose: enter Germany/Austria. | FACT | finapi.io "Fabrick acquires finAPI"; Open Banking Expo; FinSMEs 2025-06; Aziendabanca (high/medium) |
| 2025 results | Net revenues **€66 M** (2025); connected counterparties **587** at end-2025 (+33.4 %); **>2.1 bn API calls/month**; payments business ~132 k customers, €29.8 bn POS/e-commerce transaction value. | FACT | Teleborsa 2026-02-10; SellaInsights 2026 (medium/high) |
| Scale claims (marketing) | ">850 connected banks", "over 1,700 European banks through a single PSD2 gateway", "400+ counterparties, 1,400 APIs, 330 M calls/day" (older figures) | FACT (as claimed) | fabrick.com (high as self-claim; dates unclear, numbers conflict with the 2025 "587 counterparties" figure — different metrics/dates) |
| Layoffs / shutdowns | None found. | UNKNOWN | Verify via Sella group annual report / press. |

### 2.2 Capability matrix

| Attribute | Finding | Status | How to verify |
|---|---|---|---|
| Italian banks covered (count/named) | Claims "1,700+ European banks" via PSD2 gateway; Italian list not retrieved. As an Italian player historically built on CBI Globe plus direct connections, coverage of the CBI Globe universe (Intesa Sanpaolo, UniCredit, Banco BPM, BPER, MPS, BNL, Crédit Agricole Italia, Mediolanum, Fineco, Banca Sella, Credem, Poste/Postepay, BCC Iccrea, Cassa Centrale, BP Sondrio, Banca Generali, Widiba, Deutsche Bank Italy) is expected. Hype (Sella group) expected. Revolut/N26/Satispay/Mooney: UNKNOWN. | ASSUMPTION (coverage of CBI Globe banks); UNKNOWN (named list) | Request the ASPSP catalogue from Fabrick sales / developer portal; cross-check against CBI Globe participant list. |
| Account types | Current accounts (yes); card/prepaid accounts where the ASPSP exposes them (bank-dependent, see §1); loans/mortgages/investments: UNKNOWN (likely not via PSD2). | ASSUMPTION / UNKNOWN | Ask for the "account types by ASPSP" sheet. |
| Pending vs booked, merchant/MCC/original description | UNKNOWN. Italian PSD2 (CBI Globe standard, Berlin-Group-based) returns booked and, where supported, pending transactions with `remittanceInformationUnstructured`; MCC is not standard in PSD2 payloads. | ASSUMPTION (standard behaviour) | Check Fabrick API reference for `transactionStatus` and enrichment fields. |
| History depth / refresh / webhooks | UNKNOWN. | UNKNOWN | Developer portal docs; ask sales. |
| Enrichment / categorisation | Fabrick markets "value-added PSD2 services" (aggregation, categorisation, PFM modules for banks); product name and pricing not retrieved. | ASSUMPTION | fabrick.com solutions pages; request product sheet. |
| Recurring detection / holder verification | UNKNOWN. | UNKNOWN | Ask. |
| Sandbox / mobile SDK / flow | Developer portal with sandbox believed to exist; mobile SDK UNKNOWN; redirect-based SCA (Italian banks mostly redirect/app-to-app). | ASSUMPTION / UNKNOWN | Register on Fabrick developer portal; test sandbox terms. |
| Consent duration | Follows ASPSP (90/180 days). | ASSUMPTION | Verify per bank. |
| Pricing model | UNKNOWN (no public prices). Historically enterprise/bank-oriented commercial model with setup fee + volume tiers. | UNKNOWN / ASSUMPTION | Request quote; ask about startup/fintech plan and minimum monthly commitment. |
| Commercial constraints / SLA | UNKNOWN; counterparties are mostly banks, corporates, fintechs (587 in 2025). | UNKNOWN | Ask for standard MSA and SLA. |
| EU data residency | Italian company; EU residency expected. | ASSUMPTION | Confirm DPA/sub-processors. |
| Licence model for an unlicensed startup | Fabrick offers "Fabrick Pay by Bank … with Fabrick's licence" (PIS) and "account aggregation (AISP)" as PSD2 value-added services — i.e., it holds the TPP licence and offers services through it. **CORRECTED:** the sibling group-A session found a dedicated **"Fabrick Pass"** offer — AISP/PISP licence **"as a service"** for Italy, Spain and France (https://www.fabrick.com/it/fabrick-pass-servizi-as-a-service). So AIS under Fabrick's licence **is marketed**, not merely plausible; what remains UNKNOWN is whether it is sold to a pre-revenue **B2C** startup, on what minimums, and which Fabrick entity is the AISP of record. | FACT (PIS and AIS licence-as-a-service marketed — "Fabrick Pass", via sibling session; page not fetched) / UNKNOWN (B2C startup terms) | fabrick.com solutions page (snippet); fabrick.com Fabrick Pass page (via `open-banking-providers-a.md` §2.6, medium-high). Verify Fabrick S.p.A. authorisation on Banca d'Italia "Albo istituti di pagamento" and ask Fabrick's compliance for the contractual model. |
| Time-to-market / lock-in | Enterprise onboarding likely weeks–months; proprietary API (not Berlin Group pass-through) → medium lock-in. | ASSUMPTION | Ask for typical onboarding timeline. |
| DX / community sentiment | No developer-community evidence found. | UNKNOWN | Search GitHub/StackOverflow for "fabrick api"; ask for references. |
| Status page / incidents | UNKNOWN. | UNKNOWN | Ask for status page URL and 12-month incident history for Italian ASPSPs. |

**Assessment:** strongest *Italian* footprint of group B (Sella group, CBI ecosystem, Mastercard-backed, growing: finAPI, Judopay). Main doubts: pricing opacity, enterprise sales motion, no public developer sentiment, and whether a B2C startup can buy "Fabrick Pass" (AIS licence-as-a-service, marketed for IT/ES/FR) on startup terms.

---

## 3. GoCardless Bank Account Data (ex-Nordigen)

| Attribute | Finding | Status | Source / how to verify |
|---|---|---|---|
| Corporate history | Nordigen (Latvia) acquired by GoCardless in 2022; product rebranded "GoCardless Bank Account Data". | FACT | gocardless.com blog (high) |
| **Status 2025–2026** | **"From July 2025 onwards, GoCardless has stopped accepting new Bank Account Data accounts."** Free tier wound down during 2025 (caps tightened, self-service signup degraded, new free accounts closed by mid-2025; existing ones migrated to paid pricing). Community guides (2026) describe it as "closed to new signups and being wound down"; existing integrations may continue. **Independent corroboration (sibling `user-pain-points.md`):** Actual Budget issue #5505 "GoCardless Bank Account Data is being discontinued, replace with Enable Banking" (2025-08-06, 23 up-votes) and Firefly III #10753 (2025-08-13) — consistent with a July 2025 cut-off. Caveat: those threads describe the closure to new *personal/free* users, whereas the pricing-page snippet says *all* new BAD accounts; the developer docs (mirror read 2026-10-02) are still online and unchanged. | FACT (closure to new customers, per gocardless.com pricing page snippet, corroborated by community evidence dated Aug 2025); scope (all new accounts vs free tier only) partially UNKNOWN | gocardless.com/en-us/pricing (high); dev.to J. Frandsen guides 2026 (low/medium); openbankingtracker free-APIs guide 2026 (medium); github.com/actualbudget/actual/issues/5505 and firefly-iii #10753 (medium, via sibling). **Verify directly on gocardless.com and by attempting signup.** |
| Italian coverage | Historically broad Italian coverage via CBI Globe banks; count UNKNOWN. | ASSUMPTION / UNKNOWN | Irrelevant for a new customer; see status. |
| Data model (docs) | End-user agreement parameters `max_historical_days`, `access_valid_for_days` and `access_scope`; defaults 90 days history / 90 days access; up to **24 months** history and up to **90 days** continuous access where the bank supports it. Docs mention balances, account details, statuses/error messages, sandbox. **Re-read on 2026-10-02 via the Context7 docs mirror:** the overview still states "up to 24 months of transaction history and … continuous access to account information for up to 90 days". | FACT (docs, mirror read 2026-10-02) | developer.gocardless.com Bank Account Data overview and quick-start guide (high; mirror). Conflict with the 180-day EBA rule confirmed (docs still cap access at 90 days) — moot for a new customer since the product is closed. |
| Pricing | Formerly free tier + paid; current list prices for existing customers UNKNOWN. | UNKNOWN | Not obtainable for new customers. |
| Licence model | Served unlicensed developers under Nordigen/GoCardless AISP licence (Latvia; GoCardless entities). | ASSUMPTION | n/a |
| Community | Was the default for self-hosted PFM (Firefly III, Actual Budget have dedicated GoCardless setup docs). Migration guides now point to alternatives. | FACT | docs.firefly-iii.org; actualbudget.org docs; dev.to guides (medium/low) |

**Assessment:** **Not viable** for Lilleri as a new integration (closed to new Bank Account Data customers since July 2025). Useful only as a signal: the free/indie tier of the market has disappeared, so pricing for small players is now negotiated everywhere.

---

## 4. Enable Banking (Finland)

| Attribute | Finding | Status | Source / how to verify |
|---|---|---|---|
| Corporate | Espoo, Finland; licensed **PSD2 AISP supervised by FIN-FSA**; "connectivity engine" with 2,700+ ASPSPs in 30 countries; AIS and PIS. | FACT (secondary) | api-evangelist GitHub profile (low/medium); enablebanking.com (high, not fetched) |
| Italy market page | Dedicated "Open Banking Specifics in Italy" doc. Most widely used ASPSPs listed in order: **Intesa Sanpaolo, UniCredit, Banco BPM, Gruppo BCC Iccrea, Crédit Agricole Cariparma, BPER Banca, Banca MPS, Banca Mediolanum**. Also covers **Poste Italiane (BancoPosta and Postepay; via CBI Globe)** and "several smaller ones". Many Italian banks connected via the **CBI Globe** platform. **Revolut** integrations across countries incl. Italy. | FACT | enablebanking.com/docs/markets/it/ (high; snippet) |
| Card accounts | March 2026 changelog: expanded card-account access in Italy; **Finecobank** card accounts via dedicated integration; UniCredit, Mediolanum, Crédit Agricole do **not** expose credit-card accounts. | FACT | enablebanking.com changelog 2026-04-08 (high) |
| Other named banks (Fineco, Banca Sella, Credem, Hype, N26, Illimity, Widiba, ING, Mooney, Satispay, Amex IT, Compass, Findomestic, Agos, DB Italy, Banca Generali, BP Sondrio, Cassa Centrale) | Not confirmed in snippets (Fineco: yes for card accounts). **Credem (Credito Emiliano)** and **Banca Mediolanum** connectors are documented in the Enable Banking core-library reference (mirror read 2026-10-02; the Credem connector takes a `brand` parameter for brands served through Credem's endpoint and a `business` flag). CBI Globe participants are likely covered. | FACT (Credem and Mediolanum connectors exist) / UNKNOWN / ASSUMPTION (rest) | enablebanking.com/docs/core/latest (high; mirror). Enable Banking publishes a public ASPSP list per country — check `enablebanking.com/docs/…/aspsps` or the sandbox `GET /aspsps?country=IT`. |
| Account types | Payment accounts; card accounts where exposed (see above). Loans/investments: not via PSD2 (UNKNOWN). | FACT / UNKNOWN | Docs. |
| Pending vs booked; fields | Berlin-Group-style `booked`/`pending` and `remittance_information`; MCC not standard. | ASSUMPTION | Docs API reference (transactions schema). |
| History depth / refresh | Follows ASPSP; sandbox-testable. Background 4×/day cap applies. | ASSUMPTION | Docs per-ASPSP "max history" field. |
| Webhooks | Payment-status webhooks exist (Aug 2024 changelog); AIS/data webhooks UNKNOWN. | FACT (payments) / UNKNOWN (AIS) | changelog 2024-09-04 (high). |
| Enrichment / categorisation / recurring detection | Not a product focus (pure connectivity); UNKNOWN. | ASSUMPTION / UNKNOWN | Ask. |
| Holder verification | Account holder name returned where ASPSP provides it. | ASSUMPTION | Docs. |
| Sandbox | Sandbox with documented mock-bank credentials (e.g., an S-Pankki sandbox user) available after self-registration. In addition, a **"restricted production"** mode: a production application starts "Inactive", is activated by linking one's own accounts, "can only fetch data from accounts linked to the application" and "will stay in this state until an agreement has been signed" — useful for a real-data pilot before contract. | FACT (own docs, mirror read 2026-10-02) — **upgraded from ASSUMPTION** | enablebanking.com/docs/api/sandbox ; enablebanking.com/docs/api/linked-accounts (high; mirror). |
| Mobile SDK / flow | **Redirect**-based authorisation (no embedded/credential flows); no official iOS/Android SDK found. Enable Banking does publish **web UI widgets** — a `<enablebanking-aspsp-list>` bank-selection element (filters: country, psu-type personal/business, service AIS/PIS, sandbox, no-beta) and a terms-consent widget — plus language SDKs for its core connector library. | FACT (web widgets — own docs, mirror read 2026-10-02) / ASSUMPTION (no native mobile SDK) | enablebanking.com/docs/api/widgets (high; mirror). Ask. |
| Consent duration | Follows ASPSP (90/180 days); `valid_until` set on session. | ASSUMPTION | Docs. |
| Pricing | **Per connected account per month**, volume-based ("determined by the number of accounts accessed and payments made per month"), via a licence agreement tailored to expected usage and markets; single edition; **"Get a Quote" tool** launched (March 2026). **Enable Banking's own FAQ adds: "There is a minimum monthly invoice that includes a set quota of accounts and payments"** — a floor exists; its amount is UNKNOWN. No euro figure found. | FACT (model and the existence of a minimum monthly invoice — own docs FAQ, mirror read 2026-10-02) / UNKNOWN (numbers) | enablebanking.com/docs/faq "How much does it cost to use the Enable Banking API?" (high; mirror); G2 pricing page (medium); changelog 2026-04-08 (high). Use the quote tool; ask the minimum monthly invoice and included quota at 5 k / 25 k / 100 k accounts. |
| Commercial constraints / SLA | rfp.wiki page exists on SLAs & escalation (content not retrieved). | UNKNOWN | rfp.wiki (low/medium); ask for SLA. |
| EU residency | Finland/EU. | ASSUMPTION | DPA. |
| Licence model for unlicensed startup | Two documented modes (own docs). (1) **Enable Banking as the regulated entity:** the docs describe a mandatory "terms consent" widget "intended for use when the application relies on Enable Banking to access ASPSPs as a regulated entity" — the PSU accepts Enable Banking's terms before the bank redirect (model A of §15). (2) **Licensed TPPs under their own licence:** "Licensed TPPs can utilize the Enable Banking API under their own license by providing their own eIDAS certificates"; Enable Banking then acts as a **Technical Service Provider** in a single-tenant environment, "completely invisible for end-users", with the TPP's own redirect domain ("TPP Infrastructure-as-a-Service") — the natural bring-your-own-licence path for phase 2 (model C). Secondary snippet: "businesses can enable their customers without an AISP licence to access bank account information". | FACT (own docs, mirror read 2026-10-02) — **upgraded from FACT (secondary)** | enablebanking.com/docs/faq ("Can a TPP use Enable Banking API under their own license?"), /docs/api/widgets (terms consent), /docs/tpp and /docs/tpp/getting-started (high; mirror); api-evangelist profile (low/medium). Confirm with Enable Banking: which legal entity is the AISP of record for Italian PSUs, consent wording, data-sharing contract, Italian passporting (FIN-FSA passport to IT). |
| Time-to-market | Self-serve sandbox → contract; weeks. | ASSUMPTION | Ask. |
| Lock-in | Proprietary but thin API close to Berlin Group semantics → low/medium. | ASSUMPTION | — |
| DX / sentiment | Frequently recommended in 2026 "Nordigen alternatives" guides; detailed changelogs monthly (good transparency signal). | FACT (presence) / UNKNOWN (sentiment detail) | dev.to guides (low/medium); enablebanking.com changelogs (high). |
| Status page / incidents | UNKNOWN. | UNKNOWN | Ask for status page and Italian ASPSP incident log. |
| Corporate news 2024–26 | Monthly changelogs; no ownership change found. | FACT (no news found) | — |

**Assessment:** best-documented Italian coverage in group B, licensed, explicitly serves customers without AISP licence (own docs: terms-consent widget when Enable Banking is the regulated entity), per-account pricing **with a minimum monthly invoice** (amount unknown), restricted-production pilot mode before contract, and a documented bring-your-own-licence TSP mode for phase 2; active 2026 development on Italian card accounts. Gaps: no enrichment, no native mobile SDK (web widgets only), prices and the minimum-invoice floor unknown.

---

## 5. Powens (ex-Budget Insight, France)

| Attribute | Finding | Status | Source / how to verify |
|---|---|---|---|
| Corporate | Paris; renamed from Budget Insight in 2022 (Bertrand Jeannet was CEO at the time of the rebrand). **CORRECTED: a new CEO was appointed in Oct–Nov 2024** (sibling `competitors-eu-uk.md` §5 timeline, FACT via its source S-16), so "CEO Bertrand Jeannet" is stale; the current CEO's name is UNKNOWN here. AISP + PISP licence passported to **30 countries**, supervised by **ACPR**. | FACT (licence, self-claim) / CORRECTED (leadership) | powens.com security & compliance; blog (high/medium); competitors-eu-uk.md S-16 (medium). Verify current leadership and any 2025–26 ownership change on powens.com/about and press. |
| 2024–2026 news | None retrieved (search budget). Prior knowledge: acquired Unnax (ES) in 2023. | UNKNOWN / ASSUMPTION | Verify on powens.com press. |
| Italian coverage | Blog: "In Italy, coverage (AIS and PIS) is at **90 %**"; PIS from 10 banks incl. **Banco BPM, BNL, Poste Italiane**; **Wealth** product aggregates savings/securities accounts from 9 banks incl. **Banca Sella, Credem, Widiba** — "only TPP offering securities-account aggregation for Italian banks". openbankingtracker: 116+ banks overall (number looks partial). | FACT (claims; blog date not visible — likely 2021–2022) | powens.com blog "coverage in Italy and Spain" (high as self-claim; dated). Request current IT connector list. |
| Account types | Payment accounts; **investments/securities, loans, savings, life insurance, retirement plans** via the **"Wealth & Loans"** product, which Powens' docs describe as "aggregating **non-PSD2** accounts" and which exposes `/users/me/investments`, market orders, pockets and loan amortisations. Connectors expose multiple **sources** with `auth_mechanism` = `credentials` ("directaccess") or `webauth` ("openapi"), i.e., a **credential-based direct-access channel coexists with the PSD2 API channel**. Unique in group B for Italian investment accounts (Italian availability rests on a dated blog). | FACT (product and channel types — own docs, mirror read 2026-10-02) — **upgraded from ASSUMPTION** / UNKNOWN (which Italian connectors use which source) | docs.powens.com Wealth & Loans integration guide; custom-connection-implementation (`GET /connectors?expand=sources`) (high; mirror). Ask which Italian wealth connectors are credential-based and Powens' regulatory stance on them in Italy. |
| Pending vs booked, fields | Powens exposes `coming` (pending) vs booked, `original_wording`, `simplified_wording`, and categorisation fields. | ASSUMPTION (prior knowledge of Budget Insight API) | docs.powens.com. |
| Enrichment | Categorisation is part of the data product: transactions carry a hierarchical **Category object** (category code + parent category code) and an `ACCOUNT_CATEGORIZED` webhook fires "after the transactions are processed and categorized". Merchant cleaning (`simplified_wording`) remains prior knowledge. | FACT (categorisation — own docs, mirror read 2026-10-02) — **upgraded from ASSUMPTION** / ASSUMPTION (merchant cleaning) | docs.powens.com api-reference bank-transactions (Category object), bank-accounts webhooks (high; mirror); pricing UNKNOWN. |
| Webhooks | Documented webhooks: `CONNECTION_SYNCED` (payload includes, per connection, the new transactions, investments, market orders and documents), `ACCOUNT_SYNCED`, `ACCOUNT_CATEGORIZED`. | FACT (own docs, mirror read 2026-10-02) — **upgraded from ASSUMPTION** | docs.powens.com api-reference user-connections/connections and data-aggregation/bank-accounts (high; mirror). |
| Sandbox / SDK / flow | Hosted **"Powens Connect" webview** for bank selection and consent; no native SDK known. | ASSUMPTION | Docs. |
| Pricing | UNKNOWN; T&Cs public but prices not. | UNKNOWN | Request quote; ask per-connection/month vs per-user. |
| Licence model for unlicensed startup | T&Cs require clients to provide an **annual listing of legal-entity (sub)clients** to whom the API is made available, with their **regulated or unregulated status** — evidence Powens serves unregulated clients under its own licence and monitors the chain. | FACT (snippet) | powens.com T&Cs (high). Verify Italian passport scope and consent wording. |
| Data residency | France/EU. | ASSUMPTION | DPA. |
| DX / sentiment | Finary (FR wealth app) community thread discusses how Powens works (sync behaviour); sentiment details not retrieved. | UNKNOWN | community.finary.com (low). |
| Status page | UNKNOWN. | UNKNOWN | Ask. |

**Assessment:** strong candidate if Italian investment-account aggregation matters (unique Wealth product) and for built-in categorisation; verify how current the "90 %" figure is and the compliance status of non-PSD2 connectors.

---

## 6. Plaid Europe

| Attribute | Finding | Status | Source / how to verify |
|---|---|---|---|
| Italian coverage | openbankingtracker: Plaid "tracks **225 banks in Italy** (2.3 % of its coverage)"; **Intesa Sanpaolo** listed as supported by Plaid. 12,000+ institutions across US/CA/UK/EU. | FACT (secondary aggregator data) | openbankingtracker.com/api-aggregators/plaid; provider/intesa-sanpaolo (medium). Verify with Plaid's institution search (`/institutions/get` with `country_codes=["IT"]`). |
| Europe strategy 2025–26 | Plaid reports open banking "mainstream in Europe in 2025", +55 % new customers, teams growing in London and Amsterdam, new Head of Europe; partnerships cited are UK/payments-centric (Zilch, Raylo, Lightspeed, Squarespace). No evidence of scaling back. | FACT | plaid.com blog 2025; crowdfundinsider 2026-01; ffnews (medium/high) |
| Pricing | US pay-as-you-go not offered in Europe; European customers go through sales; third-party sites report Europe adds 5–15 % to licence cost. | FACT (third-party pricing sites — low) | Request quote; ask about startup programme. |
| Licence entities | Plaid Financial Ltd (UK FCA) and Plaid B.V. (NL, DNB) — AISP/PISP passported in EEA. Unlicensed customers use Plaid's licence. | ASSUMPTION | plaid.com legal pages. |
| SDK / flow | Plaid Link SDK (iOS, Android, React Native, web) — best-in-class embedded consent UX; OAuth redirect to bank in EU. | ASSUMPTION (well known; not verified this session) | plaid.com/docs/link. |
| Data richness | Transactions with merchant name, category (Plaid taxonomy), pending flag. Plaid docs (mirror read 2026-10-02): Transactions is "also available in the UK and Europe"; `days_requested` configurable 1–730 (default 90; production minimum 30; ≥180 recommended for Recurring Transactions) — what an Italian bank actually returns is bank-dependent. "Enrich" (`/transactions/enrich`) exists and is listed alongside Transactions for checking/savings/credit accounts, but the docs do **not** state EU availability (examples are US-only) → UNKNOWN. | FACT (docs, mirror) / UNKNOWN (EU Enrich; Italian history depth) | plaid.com/docs/financial-insights (product comparison), /docs/api/link (Transactions configuration), /docs/api/products/enrich (high; mirror); ask EU field coverage for Italian banks. |
| Status page | status.plaid.com exists (institution-level status). | ASSUMPTION | — |
| Fit for Italy | Coverage count is high but **quality for Italian long tail (BCC networks, Postepay, Hype) UNKNOWN**; Plaid's European focus is UK/payments. | HYPOTHESIS | Test top-30 Italian institutions in sandbox/limited production. |

---

## 7. Neonomics (Norway)

| Attribute | Finding | Status | Source / how to verify |
|---|---|---|---|
| Licence | Neonomics AS licensed PI / PISP / AISP by **Finanstilsynet (Norway)**, passported across EU → operates in Italy. | FACT | neonomics.io (high; snippet) |
| Coverage | "252 banks in Italy" (openbankingtracker); 3,500+ (site) / "over 6,000 bank connections in Europe" (coverage page title). | FACT (secondary) / conflict between 3,500 and 6,000 (different dates/definitions) | openbankingtracker (medium); neonomics.io market-coverage (high). Verify IT list on neonomics.io/market-coverage. |
| Pricing | Partly published: usage-based; per successful transaction (payments); **per-user-per-month** for data aggregation, volume tiers; **no setup fee**. | FACT (secondary: GetApp/openbankingtracker) | getapp.com (low/medium). Request quote. |
| Corporate 2024–26 | Acquired UK platform **Ordo** (approved by FCA and Finanstilsynet; terms undisclosed); Dec 2024 complaint to Norwegian competition authority on payments market; Feb 2025 FundingPartners partnership. Tracxn lists only $2.7 M raised (looks incomplete). | FACT | openbankingexpo; neonomics.io blog; ffnews; tracxn (medium/low) |
| SDK / webhooks / enrichment / sandbox | UNKNOWN (Neonomics has "Account Data API" enterprise product; sandbox believed free). | UNKNOWN / ASSUMPTION | neonomics.io/enterprise/account-data-api; docs. |
| Fit | Small Nordic-centric vendor; Italian depth and support quality UNKNOWN. | HYPOTHESIS | Ask for Italian customer references. |

---

## 8. Mastercard Open Banking Europe (ex-Aiia)

| Attribute | Finding | Status | Source / how to verify |
|---|---|---|---|
| Corporate | Aiia (Denmark; grew out of the Spiir PFM app, Aiia API brand later) acquired by Mastercard (closed 2021). Part of Mastercard's global open-banking platform, now branded **"Mastercard Open Finance Europe"** in the developer portal (docs paths moved from `/open-banking-europe/` to `/open-finance-europe/`). Signal: the consumer PFM app **Spiir** was shut down on **8 June 2026** (sibling `competitors-eu-uk.md` §5, FACT, medium); the B2B API is still documented as live, but ask Mastercard about the roadmap of the unlicensed "Aiia Data" track. | FACT | investor.mastercard.com (high); competitors-eu-uk.md S-47 (medium); developer.mastercard.com (mirror read 2026-10-02) |
| Coverage | "3,000+ banks across Europe"; strongest in Nordics/Baltics. **Italy list not retrieved.** | FACT (claim) / UNKNOWN (IT) | Mastercard press (high). Verify "Supported Providers" page on developer.mastercard.com (blocked this session). |
| **Licence model** | Developer docs have separate **"unlicensed"** and **"licensed"** tracks. FAQ (re-read 2026-10-02 via the docs mirror, now under the "Open Finance Europe" path): "To use Aiia Enterprise, companies need to be registered AISP and/or PISP. **Aiia Data and Aiia Pay do not require a license as services are provided under Mastercard's existing TPP license.**" The "Open Finance Europe Unlicensed Providers API" lets TPPs "access Open Finance services in Europe using Mastercard's License" and covers Connect (OAuth), Accounts, Transactions, **Categories**, Consents, Providers, Sync, Payouts and Accept Payments. Connect Flow: client calls `/v1/oauth/connect`, PSU completes "Supervised login" (signs up with Aiia Data, logs in to bank, consents). One-time flow also available. | FACT (own docs, mirror read 2026-10-02) — **confirmed** | developer.mastercard.com/open-finance-europe/documentation/unlicensed/aiia-data/faq and …/api-references ; …/open-finance-europe/documentation/support/faq (high; mirror). Older `/open-banking-europe/` URLs in §Sources may redirect. |
| Data | Account, account-holder and transaction details; "Codes and formats" page. | FACT | docs (high) |
| Pricing / SLA / sandbox | Test providers documented; prices UNKNOWN (enterprise sales). | FACT (sandbox) / UNKNOWN (price) | Ask Mastercard open banking sales. |
| SDK | UNKNOWN. | UNKNOWN | Docs. |
| Fit | Clear "no licence needed" documentation and big-brand stability; Italian coverage/quality and startup-friendliness UNKNOWN. | HYPOTHESIS | Request Italian ASPSP list + indicative pricing. |

---

## 9. Klarna Kosma / Open Banking by Klarna

| Attribute | Finding | Status | Source |
|---|---|---|---|
| History | Spun out as brand/BU March–April 2022 on SOFORT-era connectivity; "15,000+ banks in 27 markets" claimed. **Brand scrapped July/Aug 2023** (folded under Klarna; "marketing move", no job cuts; Kosma stayed as product brand for the API business; VP Wilko Klassen). | FACT | Finextra, Tech.eu, FinTech Global, ThePaypers (medium/high) |
| 2025–2026 status | No evidence of sale/closure found; no evidence of active third-party AIS commercialisation either. Klarna group focus: BNPL, 2025 losses, exec departures. **Whether a new third party can contract AIS in 2026 is UNKNOWN.** | UNKNOWN | Verify via klarna.com/open-banking / sales contact. |
| Fit | Not recommended: strategic uncertainty; coverage in Italy historically via screen-scraping/API mix; no public pricing. | HYPOTHESIS | — |

---

## 10. finAPI (Germany, now 75 % Fabrick)

| Attribute | Finding | Status | Source |
|---|---|---|---|
| Ownership | 75 % Fabrick since 19 June 2025 (from SCHUFA); 25 % founders. 400+ clients (banks, insurers, fintechs, software vendors), DACH plus "numerous other European countries". | FACT | finapi.io; Open Banking Expo (high/medium) |
| Italy | Coverage UNKNOWN (DACH-centric; Italy likely via Fabrick going forward). | UNKNOWN | Ask Fabrick/finAPI which entity would contract for Italy. |
| Licence | finAPI GmbH is a BaFin-licensed AISP/PISP (prior knowledge). | ASSUMPTION | BaFin register. |
| Fit | Only relevant as part of a Fabrick deal. | HYPOTHESIS | — |

## 11. Qwist (ex-finleap connect, ex-figo)

| Attribute | Finding | Status | Source |
|---|---|---|---|
| Ownership | Rebranded to Qwist 2023; acquired Nov 2023 by **Crastorehill** (majority-owned by Finch Capital) together with **ndgit**; Berlin; 80+ staff in 4 countries; strategy: buy-and-build ahead of PSD3. | FACT | Open Banking Expo; Finovate; CMS; crowdfundinsider (medium) |
| Italy | UNKNOWN. | UNKNOWN | Ask. |
| Fit | DACH-focused, PE-owned consolidation vehicle; low priority for Italy. | HYPOTHESIS | — |

## 12. Bud Financial (UK)

| Attribute | Finding | Status | Source |
|---|---|---|---|
| Corporate / licence | Founded 2015 (UK); EU entry with office in Lithuania and **AISP licence from the Bank of Lithuania** (passporting); also active UK/US/MENA. | FACT | Open Banking Expo "Bud establishes European footprint" (medium) |
| Products | Enrich (categorisation; claims 98 % accuracy), Drive, Assess (affordability), Engage (PFM). | FACT (claims) | thisisbud.com; finexer blog (low) |
| Pricing | Free sandbox; production per-user pricing via sales. | FACT (secondary, low) | finexer blog (low) |
| Italy connectivity | UNKNOWN; openbankingtracker lists "0+ institutions" (data gap). Bud's EU connectivity likely via partner aggregators. | UNKNOWN / ASSUMPTION | Ask Bud which aggregator underlies Italian connections. |
| Fit | Interesting as **enrichment layer** (not connectivity) if Lilleri wants to buy rather than build categorisation; Italian merchant coverage of its models UNKNOWN. | HYPOTHESIS | Request Italian-transaction accuracy benchmark. |

## 13. CBI Globe as a direct option

| Attribute | Finding | Status | Source |
|---|---|---|---|
| What it is | CBI Globe (CBI S.c.p.a., with Nexi as technology partner): "passive" functionality for banks' PSD2 compliance and **"active" functionality** that lets banks and third parties (corporates, fintechs) operate as TPPs, "reach **100 % of Italian banks** with a single integration" plus a growing number of European institutions. | FACT | nexigroup.com open-banking pages; cbiglobe.com (high) |
| Who can register | TPP area reserved to **PSPs in the role of AISP/PISP/PIISP**; onboarding = upload **eIDAS QWAC/QSealC** (production or test), verify email, access API portal. CBI partners with InfoCert for certificates. eIDAS PSD2 certificates are issued only to authorised/registered PSPs (they embed the NCA authorisation number). | FACT (registration requirements); FACT (eIDAS tie to authorisation — RTS art. 34) | cbiglobe.com Registrazione-TPP, Wiki "3. TPP onboarding", "3.1 Certificate Requirements" (high) |
| Consequence for Lilleri | **Not usable without an own AISP registration** (or as agent of one). Becomes the natural "direct" option *after* own registration (phase 2+). | FACT (inference) | — |
| Costs | UNKNOWN. A low-reliability SME-integration blog cites typical AIS integration budgets: TPP contract setup €0–1,500; analysis €2–4 k; connector development €5–15 k; test/go-live €1–3 k; annual TPP fees €600–3,600 (context: accounting software, not PFM). | UNKNOWN / low-reliability anchor | brentasoft.com blog 2021 (low). Request CBI Globe fee schedule. |
| Examples | Banca 5 first Italian bank operating as TPP; Mooney publishes a PSD2 TPP notice. | FACT | economyup; mooney.it (medium) |

## 14. Other Italy-focused providers (search budget exhausted — all UNKNOWN unless noted)

| Provider | What is known | Status | How to verify |
|---|---|---|---|
| CRIF (Bologna) | Prior knowledge: Banca d'Italia-authorised AISP/PISP; "CRIF Open Banking" platform with categorisation/credit-scoring; serves banks/fintechs; likely belongs in group A if already covered. | ASSUMPTION | crif.it; Banca d'Italia albo. |
| Nexi Open | Nexi's open-banking developer portal; Nexi is CBI Globe's technology partner. B2C-startup commercial model UNKNOWN. | ASSUMPTION / UNKNOWN | nexigroup.com developer portal. |
| TAS Group | Payment-software vendor; open-banking "fintech hub" offerings aimed at banks; AIS-as-a-service for startups UNKNOWN. | UNKNOWN | tasgroup.eu. |
| Mia-FinTech | Mia-Platform spin-off selling fintech building blocks (incl. open-banking integrations); not an AISP of record (believed). | ASSUMPTION / UNKNOWN | mia-fintech.com. |
| Cedacri/ION, Cabel | Core-banking outsourcers with PSD2 gateways for client banks; not startup-facing. | ASSUMPTION | — |
| "Open Banking Italia" | No entity found under this name. | UNKNOWN | — |
| Yolt (ING) | Consumer app closed **2021**; B2B open-banking unit closed **end April 2023** — exclude. (CORRECTED from "closed 2022–2023, prior knowledge".) | FACT (via sibling `competitors-eu-uk.md` S-50: aziendabanca.it "Yolt chiude"; finextra 38794; medium) | — |

---

## 15. Italian regulatory route for a startup without its own licence

### 15.1 The three models

| Model | Mechanism | Who offers it (evidence) | Italian regulatory status | Status |
|---|---|---|---|---|
| **A. Client of a licensed AISP ("licence-as-a-service" / "TPP-as-a-service")** | The provider is the AISP of record; the PSU consents to the provider collecting data and sharing it with Lilleri (a *recipient*, not an AIS provider). Lilleri signs an API contract and must not present itself as providing AIS. | **Mastercard Open Banking Europe** ("you do not need a license… services are provided through our license" — FACT); **Powens** (T&Cs track regulated/unregulated sub-clients — FACT); **Enable Banking** (own docs: terms-consent widget "when the application relies on Enable Banking to access ASPSPs as a regulated entity" — FACT, mirror read 2026-10-02); **Fabrick** ("Fabrick Pass" AISP/PISP licence-as-a-service for IT/ES/FR — FACT via sibling session; B2C startup terms UNKNOWN); **Neonomics** (passported licence; model UNKNOWN); **Plaid** (ASSUMPTION); GoCardless (closed). Group A: Tink, TrueLayer, Yapily "Open Banking as a Service", Salt Edge partner programme (ASSUMPTION; see group-A doc). | Widely practised across the EU. **Banca d'Italia's explicit written position was not retrieved** this session. Risk points: (i) the provider's licence must be passported to Italy (check EBA/Banca d'Italia register for "AIS" passport into IT); (ii) consent screens must name the licensed AISP; (iii) Lilleri must avoid any activity that *is* AIS in substance (it only receives data from the AISP under the user's consent); (iv) PSD2 art. 67(2)(f) restricts the AISP to using data only for the AIS *explicitly requested by the PSU* — so the provider's consent screen must name Lilleri as recipient and state the purpose (sibling `regulatory-landscape.md` §10.2; P0 question for counsel). | FACT (providers) / UNKNOWN (Banca d'Italia position) |
| **B. Agent of an AISP** | Lilleri acts as an *agent* of a licensed AISP, registered by that AISP (Banca d'Italia's rules: on registration an AISP indicates "the agents it intends to use"; agents of foreign EU PIs operating in Italy are listed via the home-state register). | **CORRECTED — offered commercially by group-A leaders:** Tink ("Tink's use of agents": for partners without an AIS/PIS licence Tink becomes the regulated PSP and performs AML/CTF checks) and TrueLayer ("in the EU, TrueLayer acts as AISP in its own right and typically partners with agents who provide AIS on behalf of TrueLayer") — FACT via sibling `open-banking-providers-a.md` §2.6 (official legal/support pages). Not found among group-B providers, which document model A (Enable Banking, Mastercard, Powens). | Legally foreseen (TUB art. 114-novies / Disposizioni di vigilanza; EBA register lists agents). Agents in payment services are supervised; for AISP-only agents, OAM registration requirements are UNKNOWN (OAM governs "agenti nei servizi di pagamento" for IP/IMEL; fee €160; EU PIs' agents operating only in Italy are listed in the home register). | FACT (framework) / UNKNOWN (practicability) |
| **C. Own AISP registration** | Register in the **special section of the Albo degli Istituti di Pagamento** (TUB art. 114-novies(1)/(4)); conditions: professional indemnity insurance (PII) or comparable guarantee per **EBA/GL/2017/08** (amount by risk profile, activity type and size), governance/fit-and-proper, programme of operations, security policy; **no initial capital requirement** for AIS-only. Then obtain eIDAS QWAC/QSealC and connect directly (CBI Globe or aggregator "bring-your-own-licence"). | n/a | Banca d'Italia registers the AISP, listing agents and PII policy details, after receiving the Chamber-of-Commerce registration certificate. | FACT |

### 15.2 Own AISP registration — timeline and cost

| Item | Finding | Status | How to verify |
|---|---|---|---|
| Legal basis | D.Lgs. 218/2017 (PSD2 transposition) → TUB art. 114-novies; Banca d'Italia "Disposizioni di vigilanza per gli istituti di pagamento e gli IMEL" (consolidated text to 22 Feb 2022) and Provvedimento 23 July 2019 (AISP rules). Banca d'Italia FAQ page for IP exists. | FACT | bancaditalia.it (high; PDFs not fetched) |
| Capital | None for AIS-only (PSD2 art. 7/33; EBA GL). | FACT (law) | PSD2 art. 33 (eur-lex). |
| PII | Mandatory; minimum amount per EBA/GL/2017/08 formula (risk profile, activity, size). A French-market secondary source cites "€5 M per incident" for AISP PII — **do not rely on it** for Italy; the EBA formula is case-specific. | FACT (requirement) / conflict on amount | Compute with EBA GL formula; get broker quotes (typical premiums UNKNOWN). |
| Procedure duration | Banca d'Italia decides within **90 days of a complete application** (Banca d'Italia FAQ "Istituti di pagamento", cited directly by the sibling group-A session), but pre-filing dialogue and completeness rounds typically stretch the end-to-end to **6–12 months**. | FACT (90 days — Banca d'Italia FAQ via sibling `open-banking-providers-a.md` §2.1/§2.6, high; page not fetched today) — **upgraded from ASSUMPTION** / HYPOTHESIS (6–12 months) | bancaditalia.it FAQ istituti di pagamento; Disposizioni di vigilanza, Cap. II "Procedura"; ask a regulatory law firm for 2024–2026 observed timelines. |
| Costs | UNKNOWN (legal/advisory fees, PII premium, eIDAS certificates ~ few k€/yr, compliance officer, audit). | UNKNOWN | Obtain 2–3 law-firm quotes; InfoCert/other QTSP price list for QWAC/QSealC. |
| Running obligations | Reporting to Banca d'Italia, incident reporting (EBA GL on major incidents / DORA scope check), AML limited for AIS-only, GDPR DPIA. | ASSUMPTION | Disposizioni di vigilanza, Cap. on AISP. |

**Working recommendation (DECISION input, not a decision):** launch under **model A** with a provider that documents it (Mastercard, Enable Banking, Powens, plausibly Fabrick — and group-A candidates), keep contracts non-exclusive and ≤12 months, and start the own-registration file (model C) only after product-market signal, targeting direct CBI Globe access as a phase-2 cost lever.

---

## 16. Cross-provider matrices

### 16.1 Named Italian institutions — evidence found this session (Y = named in a source; blank = not found, UNKNOWN)

| Institution | Enable Banking | Powens | Plaid | Fabrick | Neonomics | Mastercard | CBI Globe (direct) |
|---|---|---|---|---|---|---|---|
| Intesa Sanpaolo | Y | | Y (openbankingtracker) | | | | Y (claim "100 % IT banks") |
| UniCredit | Y (no card accounts) | | | | | | Y |
| Banco BPM | Y | Y (PIS) | | | | | Y |
| BPER | Y | | | | | | Y |
| MPS | Y | | | | | | Y |
| BNL | | Y (PIS) | | | | | Y |
| Crédit Agricole Italia | Y (no card accounts) | | | | | | Y |
| Mediolanum | Y (no card accounts) | | | | | | Y |
| Fineco | Y (card accounts, 2026) | | | | | | Y |
| Banca Sella | | Y (Wealth) | | ASSUMPTION (own group) | | | Y |
| Credem | Y (core-library connector, mirror 2026-10-02) | Y (Wealth) | | | | | Y |
| Poste / BancoPosta / Postepay | Y (via CBI Globe) | Y (PIS) | | | | | Y |
| BCC Iccrea | Y | | | | | | Y |
| Cassa Centrale | | | | | | | Y (ASSUMPTION) |
| Widiba | | Y (Wealth) | | | | | Y |
| Hype | | | | ASSUMPTION (Sella group) | | | UNKNOWN |
| Revolut (IT) | Y (multi-country) | | | | | | n/a (LT bank) |
| N26, Illimity, ING Italia, Mooney, Satispay, Amex IT, Nexi cards, Compass, Findomestic, Agos, DB Italy, Banca Generali, BP Sondrio | UNKNOWN for all providers | | | | | | Illimity/ING/BP Sondrio/Banca Generali/DB Italy: Y (Italian ASPSPs, ASSUMPTION); Amex/Compass/Findomestic/Agos: likely out of PSD2 scope or own APIs (UNKNOWN) |
| **Count of IT institutions** | UNKNOWN (list public) | "90 % coverage" (dated) | 225 tracked | "1,700+ EU" (IT UNKNOWN) | 252 | UNKNOWN | ~100 % of IT ASPSPs |

How to close the gaps: ask every shortlisted provider for a CSV of Italian ASPSPs with: account types exposed (current/card/prepaid), history at first consent, pending support, consent validity (90/180), auth flow (redirect/decoupled/app-to-app), 90-day success rate.

### 16.2 Licence, pricing and commercial model

| Provider | Serves unlicensed clients under own licence | Pricing model (public numbers) | Sandbox | Mobile SDK | Enrichment | Status |
|---|---|---|---|---|---|---|
| Fabrick | PIS yes; AIS marketed as "Fabrick Pass" licence-as-a-service (IT/ES/FR, via sibling session); B2C startup terms UNKNOWN | UNKNOWN | ASSUMPTION yes | UNKNOWN | marketed (details UNKNOWN) | mixed |
| GoCardless BAD | yes (historically) | n/a — **closed to new customers (Jul 2025; corroborated Aug 2025)** | yes | no | no | FACT |
| Enable Banking | **yes (own docs: EB as regulated entity + terms-consent widget)**; also BYO-licence TSP mode | per connected account/month; **minimum monthly invoice** (amount UNKNOWN); quote tool; no numbers | yes (docs) + restricted production | web widgets; no native SDK (ASSUMPTION) | no | mixed |
| Powens | yes (T&Cs) | UNKNOWN | ASSUMPTION yes | webview | yes (docs: Category object; ACCOUNT_CATEGORIZED webhook) | mixed |
| Plaid | yes (ASSUMPTION) | sales-led in EU; no PAYG | yes (ASSUMPTION) | yes (Link) | Enrich (EU availability UNKNOWN — docs silent) | mixed |
| Neonomics | passported licence; model UNKNOWN | per-user/month (data), per-tx (payments), no setup fee; no numbers | UNKNOWN | UNKNOWN | UNKNOWN | mixed |
| Mastercard Open Finance Europe (ex-OB Europe/Aiia) | **yes (documented; re-confirmed 2026-10-02 via docs mirror)** | UNKNOWN | yes (test providers) | UNKNOWN | "Categories" endpoint in the unlicensed API (details UNKNOWN) | mixed |
| Klarna Kosma | UNKNOWN (status unclear) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| finAPI | yes in DE (ASSUMPTION) | UNKNOWN | ASSUMPTION | UNKNOWN | yes in DE (ASSUMPTION) | UNKNOWN for IT |
| Qwist | ASSUMPTION | UNKNOWN | UNKNOWN | UNKNOWN | yes (ASSUMPTION) | UNKNOWN for IT |
| Bud | LT licence; mostly enrichment | per-user; free sandbox | yes | UNKNOWN | **core product** | connectivity UNKNOWN |
| CBI Globe direct | **no — own licence required** | UNKNOWN | yes (test certs) | no | no | FACT |

### 16.3 Scoring (1 = poor, 5 = excellent; "?" = scored 2 by default because UNKNOWN; weights for an Italian B2C PFM MVP)

Weights: Italian coverage & quality 25 %; licence umbrella 20 %; startup pricing fit 15 %; data richness (pending/booked, card/prepaid, history, fields) 15 %; DX/sandbox/SDK 10 %; stability & reliability 10 %; time-to-market/commercial flexibility 5 %.

| Provider | Coverage IT (25) | Licence umbrella (20) | Pricing fit (15) | Data richness (15) | DX (10) | Stability (10) | TTM (5) | Weighted /5 | Key UNKNOWNs |
|---|---|---|---|---|---|---|---|---|---|
| Enable Banking | 4 | 4 | 3? | 3 | 4 | 4 | 4 | **3.70** (was 3.65) | minimum monthly invoice amount; price/account; AIS webhooks; SDK; SLA |
| Fabrick | 4? | 4? (was 3?: "Fabrick Pass" AIS licence-as-a-service is marketed) | 2? | 3? | 2? | 5 | 2? | **3.35** (was 3.20) | Fabrick Pass terms for B2C; pricing; DX |
| Powens | 4? (dated 90 %) | 4 | 2? | 4 | 3 | 3 | 3 | **3.45** (was 3.40) | current IT list; price; Wealth compliance; post-2024 leadership/ownership |
| Mastercard Open Finance Europe | 2? | 5 | 2? | 3? | 3 | 5 | 2? | **3.15** (was 3.10) | IT coverage; price; startup onboarding; Aiia Data roadmap after Spiir shutdown |
| Plaid Europe | 3? | 4? | 2 | 4? | 5 | 5 | 2 | **3.55** (was 3.35) | IT long-tail quality; EU pricing; Enrich in EU |
| Neonomics | 3? | 3? | 3? | 2? | 2? | 2 | 3 | **2.65** (was 2.70) | everything beyond count & licence |
| Bud | 1? | 3 | 2? | 4 (enrich) | 3 | 3 | 2 | **2.45** (was 2.35) | IT connectivity source |
| finAPI | 1? | 2? | 2? | 3? | 3 | 4 | 2 | **2.20** (was 2.15) | IT relevance |
| Qwist | 1? | 2? | 2? | 3? | 2? | 2 | 2 | **1.90** (was 1.85) | IT relevance; 2024–26 corporate status |
| Klarna Kosma | 2? | 2? | 1? | 2? | 2? | 1 | 1 | **1.70** | whether it is still sold |
| CBI Globe direct | 5 | 1 (needs own licence) | 3? | 4 | 2 | 5 | 1 | **3.25** (was 3.05; not usable now) | fees; onboarding |
| GoCardless BAD | — | — | — | — | — | — | — | **0 (closed)** | — |

Scores with "?" are provisional; a single quote or ASPSP list can move a provider by ±0.5.

**Arithmetic correction (adversarial pass, 2026-10-02):** the weighted scores were recomputed as Σ(weight × score)/100 with the stated weights (25/20/15/15/10/10/5). Ten of twelve original totals were wrong by 0.05–0.20; the only substantive change is the Fabrick licence-umbrella sub-score (3? → 4?) after the "Fabrick Pass" finding. On corrected arithmetic the order is Enable Banking 3.70 > **Plaid 3.55 > Powens 3.45** > Fabrick 3.35 > (CBI direct 3.25, not usable) > Mastercard 3.15 > Neonomics 2.65 > Bud 2.45 > finAPI 2.20 > Qwist 1.90 > Klarna 1.70.

### 16.4 Provisional ranking for the Italian MVP (group B only)

1. **Enable Banking** — Italian market page, 2026 card-account work (Fineco), licensed AISP serving unlicensed customers (own docs), per-account pricing with a quote tool **but a minimum monthly invoice** (amount unknown), restricted-production pilot mode. Must verify price and floor, AIS webhooks, consent renewal UX, SLA.
2. **Powens** — unique Italian investment-account aggregation (documented non-PSD2 "Wealth & Loans" channel, partly credential-based) and built-in categorisation (documented); verify how current the "90 %" claim is, the regulatory stance of credential-based Italian connectors, post-2024 leadership, and contractual terms for an Italian B2C. *Note:* on corrected arithmetic Plaid (3.55) scores above Powens (3.45); Powens stays #2 here only on the qualitative Italy-investment argument — the synthesis phase must decide whether that outweighs Plaid's SDK/stability lead.
3. **Plaid Europe** — best SDK/DX and stability; Transactions confirmed available in Europe (docs); Italian long-tail quality, EU pricing and EU availability of Enrich are the risks.
4. **Fabrick** — strongest Italian institutional footprint (Sella, Mastercard, finAPI) **and a marketed AIS licence-as-a-service ("Fabrick Pass", IT/ES/FR)**; would jump to #1–2 if startup-friendly B2C terms and pricing are confirmed.
5. **Mastercard Open Finance Europe (ex-Open Banking Europe/Aiia)** — cleanest "no licence needed" documentation (re-confirmed 2026-10-02); needs Italian coverage proof and a roadmap statement after the Spiir consumer-app shutdown (June 2026).
6. **Neonomics** — licensed, 252 IT banks listed, usage pricing; thin evidence on quality.
7. **CBI Globe direct** — phase-2 option after own AISP registration (100 % Italian banks, lowest marginal cost hypothesis).
8. Bud (enrichment partner only) · 9. finAPI (via Fabrick) · 10. Qwist · 11. Klarna Kosma · 12. GoCardless BAD (closed).

Cross-group note: the final shortlist should pit Enable Banking / Powens / Fabrick against group-A leaders (Tink, TrueLayer, Salt Edge, Yapily, CRIF) on the same CSV of Italian ASPSPs and on identical pricing scenarios (e.g., 5 k, 25 k, 100 k connected accounts).

---

## 17. Open questions (to resolve before the architecture decision)

1. Enable Banking: euro price per connected account/month at 5 k / 25 k / 100 k accounts; minimum commitment; is there an AIS data-change webhook; official Italian ASPSP list with account types.
2. Fabrick: does Fabrick contract AIS for unlicensed B2C startups under its licence; startup pricing; developer sandbox terms; status page.
3. Powens: current Italian coverage list and the regulatory basis of Wealth (securities) connectors in Italy; price.
4. Mastercard: Italian "Supported Providers" list; pricing/onboarding for a pre-revenue startup.
5. Plaid: Italian institution list and per-institution success rates; EU contract minimums.
6. Banca d'Italia: written position (FAQ/Q&A) on unlicensed recipients of AIS data under a licensed AISP's consent; OAM/agent requirements for AISP-only agents.
7. PSD3/PSR final text: is the 4×/day cap removed; application date; impact on refresh design.
8. CBI Globe: TPP fee schedule and onboarding SLA for a future own registration.
9. (added by the adversarial pass) PSR/PSD3: has the PSR been published in the OJ (and with which application date)? — status UNKNOWN as of 2026-10-02 in every file of this repository.
10. (added) Enable Banking: the euro amount of the **minimum monthly invoice** and its included account quota (own FAQ confirms a floor exists).
11. (added) Fabrick: "Fabrick Pass" (AIS licence-as-a-service) — eligibility, minimums and AISP-of-record entity for an Italian B2C startup.
12. (added) Powens: current CEO/ownership (new CEO Oct–Nov 2024) and which Italian wealth connectors are credential-based.
13. (added) Mastercard: roadmap for the unlicensed "Aiia Data" track after the Spiir shutdown (8 June 2026).

---

## Sources

| # | Source | URL | Pub. date (if visible) | Verified | Reliability | Used for / doubts |
|---|---|---|---|---|---|---|
| 1 | Fabrick — Soluzioni per banche / Open Finance | https://www.fabrick.com/it/soluzioni/banche ; https://www.fabrick.com/it-it/ ; https://www.fabrick.com/it-it/corporate/piattaforma-open-finance/ | n/d | 2026-10-02 | high (self-claim) | Scale claims; PIS "with Fabrick's licence". Numbers undated. |
| 2 | Teleborsa — Fabrick ricavi 2025 | https://www.teleborsa.it/News/2026/02/10/fabrick-sella-ricavi-salgono-a-66-milioni-di-euro-nel-2025-191.html | 2026-02-10 | 2026-10-02 | medium | 2025 revenue, counterparties, API calls |
| 3 | SellaInsights — Fabrick completes finAPI acquisition / group results | https://sellainsights.it/-/fabrick-completa-l-acquisizione-di-finapi ; https://sellainsights.it/-/gruppo-sella-positivi-i-risultati-2025-sostenuti-da-una-crescita-strutturale-e-costante | 2025 / 2026 | 2026-10-02 | high (group media) | finAPI deal, Mastercard/Reale Mutua capital increase |
| 4 | finAPI — Fabrick acquires finAPI | https://www.finapi.io/en/fabrick-acquires-finapi/ ; https://www.finapi.io/en/fabrick-announces-acquisition-of-finapi/ | 2025-06 | 2026-10-02 | high | 75 %/25 % split, completion date 19 June 2025 |
| 5 | Open Banking Expo / FinSMEs / Aziendabanca — finAPI acquisition | https://www.openbankingexpo.com/news/open-finance-platform-fabrick-completes-acquisition-of-finapi/ ; https://www.finsmes.com/2025/06/fabrick-acquires-finapi.html ; https://www.aziendabanca.it/notizie/tecno/fabrick-acquisizione-finapi | 2025-06 | 2026-10-02 | medium | Corroboration |
| 6 | GoCardless pricing page | https://gocardless.com/en-us/pricing | n/d | 2026-10-02 | high | "From July 2025 … stopped accepting new Bank Account Data accounts" (snippet) |
| 7 | GoCardless blog — acquisition of Nordigen | https://gocardless.com/en-us/blog/gocardless-acquire-open-banking-platform-nordigen | 2022 | 2026-10-02 | high | History |
| 8 | GoCardless developer docs — Bank Account Data | https://developer.gocardless.com/bank-account-data/overview ; …/quick-start-guide ; …/sandbox/ ; …/balance/ ; …/statuses/ | n/d | 2026-10-02 | high | EUA parameters, 90/24-month limits (snippet; possibly stale vs 180-day rule) |
| 9 | dev.to (J. Frandsen) — Nordigen shutdown / alternatives / migration guides | https://dev.to/johnfrandsen/self-hosted-bank-account-aggregation-in-2026-after-the-nordigen-free-tier-shutdown-3mdo ; https://dev.to/johnfrandsen/nordigen-alternatives-in-2026-a-developers-guide-to-european-bank-data-apis-3pie ; https://dev.to/johnfrandsen/migrating-off-nordigen-a-field-guide-for-indie-builders-2026-4o3j | 2026 | 2026-10-02 | low/medium (blog) | Free-tier wind-down narrative, community sentiment |
| 10 | openbankingtracker — free APIs guide; Nordigen; Plaid; Neonomics; Powens; Bud; Enable Banking; Italy pages | https://www.openbankingtracker.com/guides/free-open-banking-apis ; https://www.openbankingtracker.com/nordigen ; https://www.openbankingtracker.com/api-aggregators/plaid ; https://www.openbankingtracker.com/api-aggregators/neonomics ; https://www.openbankingtracker.com/powens ; https://www.openbankingtracker.com/api-aggregators/bud ; https://www.openbankingtracker.com/enablebanking ; https://www.openbankingtracker.com/provider/intesa-sanpaolo | 2026 | 2026-10-02 | medium (secondary aggregator; counts may be stale/automated) | Bank counts (Plaid 225 IT, Neonomics 252 IT), Intesa supported by Plaid |
| 11 | Firefly III / Actual Budget docs — GoCardless setup | https://docs.firefly-iii.org/how-to/data-importer/import/gocardless/ ; https://actualbudget.org/docs/advanced/bank-sync/gocardless/ | n/d | 2026-10-02 | medium | Community dependence on GoCardless BAD |
| 12 | Enable Banking — Italy market docs | https://enablebanking.com/docs/markets/it/ | n/d | 2026-10-02 | high | Named Italian ASPSPs, CBI Globe, card-account limits |
| 13 | Enable Banking — changelogs (Mar 2026, Apr 2026, Jan 2026, Oct 2025, Aug 2024, Feb 2024) | https://enablebanking.com/blog/2026/04/08/enable-banking-changelogmarch-2026 ; https://enablebanking.com/blog/2026/05/14/enable-banking-changelog-april-2026 ; https://enablebanking.com/blog/2026/02/17/enable-banking-changelog-january-2026 ; https://enablebanking.com/blog/2025/11/05/enable-banking-changelog-october-2025 ; https://enablebanking.com/blog/2024/09/04/changelog-august-2024 | 2024–2026 | 2026-10-02 | high | Fineco card accounts, quote tool, payment webhooks |
| 14 | Enable Banking — provider landscape blog | https://enablebanking.com/blog/the-open-banking-provider-landscape-in-europe-what-to-know-before-you-choose | n/d | 2026-10-02 | medium (vendor opinion) | Context |
| 15 | G2 — Enable Banking pricing | https://www.g2.com/products/enable-banking/pricing | 2026 | 2026-10-02 | medium | Single edition, tailored pricing |
| 16 | rfp.wiki — Enable Banking SLAs | https://www.rfp.wiki/financial-services-banking-fintech/open-banking-platforms/enable-banking | 2026 | 2026-10-02 | low/medium | Existence of SLA info (not read) |
| 17 | api-evangelist GitHub — Enable Banking profile | https://github.com/api-evangelist/enable-banking | n/d | 2026-10-02 | low/medium | FIN-FSA licence, 2,700+ banks, "customers without an AISP licence" |
| 18 | Powens — security & compliance; T&Cs; Italy/Spain coverage blog; European coverage blog; rebrand blog | https://www.powens.com/security-compliance/ ; https://www.powens.com/sas-conditions-sale/ ; https://www.powens.com/blog/products-news-coverage-italy-spain/ ; https://www.powens.com/blog/acceleration-api-european-converage/ ; https://www.powens.com/blog/budget-insight-becomes-powens/ | n/d (coverage blog likely 2021–22) | 2026-10-02 | high (self) | ACPR licence/30 countries; sub-client reporting; 90 % IT coverage; Wealth product. Coverage figures dated. |
| 19 | Finary community — Powens functioning | https://community.finary.com/t/fonctionnement-de-powens-budget-insight/8657 | n/d | 2026-10-02 | low | Sentiment pointer only |
| 20 | Plaid blog — Europe 2025; new partnerships; EU expansion | https://plaid.com/blog/plaid-europe-open-banking-2025/ ; https://plaid.com/blog/plaid-europe-new-partnerships-and-country-coverage/ ; https://plaid.com/blog/simplified-eu-expansion/ ; https://plaid.com/blog/180-days-is-not-enough/ | 2025 / n/d | 2026-10-02 | high (self) | Europe momentum; 180-day stance |
| 21 | Crowdfund Insider — Plaid growth 2026; ffnews — Head of Europe; Sifted | https://www.crowdfundinsider.com/2026/01/257893-fintech-plaid-reports-growth-in-open-banking-adoption-improves-platform-security/ ; https://ffnews.com/newsarticle/plaid-hires-head-of-europe-to-meet-rising-demand-across-continent/ ; https://sifted.eu/articles/plaid-europe-fintech-expansion | 2026-01 / n/d | 2026-10-02 | medium | +55 % customers, London/Amsterdam |
| 22 | Third-party Plaid pricing pages (Vendr, Capterra, TrustRadius, etc.) | https://www.vendr.com/marketplace/plaid ; https://www.capterra.com/p/174384/Plaid/ ; https://www.trustradius.com/products/plaid-plaid/pricing | 2026 | 2026-10-02 | low | "No PAYG in Europe; +5–15 %" — unverified |
| 23 | Neonomics — market coverage; Account Data API; Ordo acquisition; Axactor | https://www.neonomics.io/market-coverage ; https://www.neonomics.io/enterprise/account-data-api ; https://www.neonomics.io/blog/neonomics-acquires-u-k-open-banking-platform-ordo | n/d / 2024 | 2026-10-02 | high (self) | Licence (Finanstilsynet), coverage claims, Ordo |
| 24 | GetApp — Neonomics pricing; Tracxn; Open Banking Expo / RBI / ffnews on Ordo | https://www.getapp.com/finance-accounting-software/a/neonomics/ ; https://tracxn.com/d/companies/neonomics/__xN-lG7GH3rpWSRHw2qv1lpk8quZSW5Xw71vxn3i0k-8 ; https://www.openbankingexpo.com/news/norways-neonomics-acquires-uk-open-banking-platform-ordo/ | 2024–2026 | 2026-10-02 | low/medium | Pricing model; funding figure doubtful |
| 25 | Mastercard developer docs — Aiia Data (unlicensed) FAQ, Connect Flow, One-time flow, Codes & formats; Aiia Enterprise (licensed) | https://developer.mastercard.com/open-banking-europe/documentation/unlicensed/aiia-data/faq/ ; …/aiia-data/connect/connect-flow/ ; …/aiia-data/connect/one-time-flow/ ; …/aiia-data/codes-formats/ ; https://developer.mastercard.com/open-banking-europe/documentation/licensed/aiia-enterprise/ | n/d | 2026-10-02 | high | "No licence needed" statement; flows |
| 26 | Mastercard investor news — Aiia acquisition close; press 2022 | https://investor.mastercard.com/investor-news/investor-news-details/2021/Mastercard-Advances-Global-Open-Banking-Capabilities-With-Close-of-Aiia-Acquisition/default.aspx ; https://www.mastercard.com/news/press/2022/june/mastercard-aiia | 2021 / 2022 | 2026-10-02 | high | Corporate history, 3,000+ banks |
| 27 | Klarna Kosma — Finextra, Tech.eu, FinTech Global, ThePaypers, PaymentExpert; api-evangelist profile | https://www.finextra.com/newsarticle/42716/klarna-ditches-open-banking-brand ; https://tech.eu/2023/07/31/klarna-scraps-open-banking-brand-klarna-kosma/ ; https://fintech.global/2023/08/01/klarna-axes-open-banking-brand-klarna-kosma-after-18-months/ ; https://thepaypers.com/fintech/news/klarnas-open-banking-platform-to-operate-under-its-corporate-brand ; https://github.com/api-evangelist/klarna-kosma | 2023 / n/d | 2026-10-02 | medium | Brand shutdown 2023; no 2025–26 status |
| 28 | Qwist/ndgit — Open Banking Expo, Finovate, CMS, Crowdfund Insider, ndgit.com | https://www.openbankingexpo.com/news/finch-capital-acquires-open-banking-businesses-qwist-and-ndgit/ ; https://finovate.com/crastorehill-acquires-open-banking-players-qwist-and-ndgit/ ; https://ndgit.com/en/crastorehill-acquires-leading-open-banking-players/ | 2023-11 | 2026-10-02 | medium | Crastorehill ownership |
| 29 | Bud — Open Banking Expo (EU footprint), thisisbud blog, Finexer blogs | https://www.openbankingexpo.com/news/bud-establishes-european-footprint/ ; https://www.thisisbud.com/en-us/blog/enriching-aggregated-open-banking-data-with-bud ; https://blog.finexer.com/bud-financial-pricing/ | n/d | 2026-10-02 | medium / low | Bank of Lithuania licence; products; pricing model (low) |
| 30 | CBI Globe — Registrazione TPP, Wiki onboarding & certificates, FAQ, How to join; Nexi group CBI Globe pages | https://www.cbiglobe.com/Registrazione-TPP ; https://www.cbiglobe.com/Wiki/index.php/3._TPP_onboarding ; https://www.cbiglobe.com/Wiki/index.php/3.1_Certificate_Requirements ; https://www.cbiglobe.com/Il-servizio/Come-aderire ; https://www.nexigroup.com/en/business/banks-and-financial-institutions/open-banking/active-functionality/ | n/d | 2026-10-02 | high | TPP-only registration, eIDAS, "100 % Italian banks" |
| 31 | Brentasoft blog — PSD2 for Italian SMEs (cost anchors) | https://brentasoft.com/blog/psd2-open-banking-pmi-italiane-2021/ | 2021 | 2026-10-02 | low | Indicative integration/TPP fee ranges only |
| 32 | Economyup — Banca 5 as TPP; Italian banks' API sharing | https://www.economyup.it/fintech/open-banking-banca-5-e-la-prima-banca-italiana-a-operare-come-tpp/ ; https://www.economyup.it/fintech/open-banking-a-che-punto-sono-le-banche-in-italia-con-la-condivisione-delle-api/ | n/d | 2026-10-02 | medium | Context |
| 33 | Banca d'Italia — Istituti di pagamento page, FAQ, Disposizioni di vigilanza (consolidated 22 Feb 2022), Provvedimento 23 July 2019, D.Lgs. 218/2017 | https://www.bancaditalia.it/compiti/vigilanza/accesso-mercato/istituti-pagamento/index.html ; https://www.bancaditalia.it/compiti/vigilanza/accesso-mercato/istituti-pagamento/faq-istituti-pagamento/index.html ; https://www.bancaditalia.it/compiti/vigilanza/normativa/archivio-norme/disposizioni/disp-ip-20120620/Disposizioni-vigilanza-per-IP-e-IMEL-versione-integrale-al-22-febbraio-2022.pdf ; https://www.bancaditalia.it/compiti/vigilanza/normativa/archivio-norme/disposizioni/disp-ip-20120620/Provvedimento_del_23_luglio_2019.pdf ; https://www.bancaditalia.it/compiti/sispaga-mercati/strumenti-pagamento/normativa/Decreto_legislativo_n_218-2017.pdf | 2017–2022 | 2026-10-02 | high (primary; not fetched, snippets only) | AISP special-section registration, PII, agents listed at registration |
| 34 | Diritto Bancario — "La disciplina degli AISP nelle nuove disposizioni di vigilanza" (Catenacci, Sanna) | https://www.dirittobancario.it/art/la-disciplina-degli-aisp-nelle-nuove-disposizioni-di-vigilanza-della-banca-d-italia/ | 2019-07 | 2026-10-02 | medium (law-firm commentary) | PII per EBA/GL/2017/08; registration mechanics |
| 35 | Pagamenti Digitali — "E che PSD2 sia… nuove disposizioni di vigilanza" | https://www.pagamentidigitali.it/payment-regulation/bankitalia/e-che-psd2-sia-ottava-puntata-le-nuove-disposizioni-di-vigilanza-per-istituti-di-pagamento-e-istituti-di-moneta-elettronica/ | 2019 | 2026-10-02 | medium | Context |
| 36 | OAM — agent in payment services guides/FAQ; Camera di Commercio Torino/Roma | https://www.organismo-am.it/profilo-professionale-agente ; https://www.organismo-am.it/risposte-assistenza/pagamenti-agente-nei-servizi-di-pagamento-persona-fisica ; https://www.to.camcom.it/agente-di-pagamento-istituti-di-moneta-elettronica-o-di-pagamento-italiani | n/d | 2026-10-02 | high (OAM) | Agent registration mechanics, €160 fee; AISP-agent specifics UNKNOWN |
| 37 | EBA — Final report EBA/RTS/2022/03 (180-day amendment); MNB press release; Bird & Bird; LUXHUB | https://www.eba.europa.eu/sites/default/files/document_library/Publications/Draft%20Technical%20Standards/2022/EBA-RTS-2022-03%20RTS%20on%20SCA&CSC/1029858/Final%20Report%20on%20the%20amendment%20of%20the%20RTS%20on%20SCA&CSC.pdf ; https://www.mnb.hu/en/pressroom/press-releases/press-releases-2022/eba-publishes-final-report-on-the-amendment-of-its-technical-standards-on-the-exemption-to-strong-customer-authentication-for-account-access | 2022-04-05 | 2026-10-02 | high | 90 → 180 days |
| 38 | EBA Q&A tool (2020_5643, 2022_6526, 2019_4450) and press release on SCA/CSC clarity | https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2020_5643 ; https://www.eba.europa.eu/single-rule-book-qa/qna/view/publicId/2022_6526 ; https://www.eba.europa.eu/publications-and-media/press-releases/eba-provides-clarity-market-participants-implementation | 2019–2022 | 2026-10-02 | high | Consent responsibility of AISP; agent registration pointers; no Q&A found on unlicensed data recipients |
| 39 | PSD3/PSR status — Worldline blog, PaymentBrief, openbankingtracker guide, ThePaypers explainer, KPMG Law, Freshfields, Council doc ST-8220-2026 | https://worldline.com/en/home/main-navigation/resources/blogs/2026/the-scope-and-timeline-are-locked-in-for-psd3-and-psr-what-should-psps-know ; https://paymentbrief.com/articles/psd3-psr-implementation-operator-checklist-2026/ ; https://www.openbankingtracker.com/guides/psd3-psr-readiness ; https://thepaypers.com/regulations/explainers/explainer-psd3-and-psr-overview-and-key-considerations ; https://data.consilium.europa.eu/doc/document/ST-8220-2026-INIT/en/pdf | 2026 | 2026-10-02 | medium (secondary) / high (Council doc, not fetched) | Process milestones; not in force |
| 40 | EU primary law (not fetched; cited from knowledge): PSD2 2015/2366; RTS 2018/389; Delegated Reg. 2022/2360 | https://eur-lex.europa.eu/eli/dir/2015/2366/oj ; https://eur-lex.europa.eu/eli/reg_del/2018/389/oj ; https://eur-lex.europa.eu/eli/reg_del/2022/2360/oj | 2015 / 2018 / 2022 | not fetched | high (primary) | 90-day SCA exemption, 4×/day cap, 180-day renewal |
| 41 | Mooney PSD2 TPP notice; BPER PSD2 pages | https://www.mooney.it/psd2-informativa-tpp ; https://www.bper.it/footer/informative-normative/psd2-la-nuova-normativa-sui-servizi-di-pagamento | n/d | 2026-10-02 | medium | Context on Italian ASPSP/TPP practice |
| 42 | Enable Banking docs (read via Context7 mirror `/websites/enablebanking`, 2026-10-02): FAQ (pricing; "Can a TPP use Enable Banking API under their own license?"), API widgets (terms consent; `<enablebanking-aspsp-list>`), linked-accounts (restricted production), sandbox, TPP Infrastructure-as-a-Service, core-library connector reference (Credem, Banca Mediolanum) | https://enablebanking.com/docs/faq ; https://enablebanking.com/docs/api/widgets ; https://enablebanking.com/docs/api/linked-accounts ; https://enablebanking.com/docs/api/sandbox ; https://enablebanking.com/docs/tpp ; https://enablebanking.com/docs/tpp/getting-started ; https://enablebanking.com/docs/core/latest | n/d | 2026-10-02 (mirror) | high (official docs; mirror may lag the live site by days–weeks) | Minimum monthly invoice; licence modes; restricted production; widgets; Italian connectors |
| 43 | Powens docs (read via Context7 mirror `/websites/powens`, 2026-10-02): Wealth & Loans guide; custom connection implementation (`GET /connectors?expand=sources`, `auth_mechanism` credentials/webauth); bank-transactions (Category object); bank-accounts and connections webhooks | https://docs.powens.com/documentation/integration-guides/wealth-and-loans ; https://docs.powens.com/documentation/integration-guides/advanced/custom-connection-implementation ; https://docs.powens.com/api-reference/products/data-aggregation/bank-transactions ; https://docs.powens.com/api-reference/products/data-aggregation/bank-accounts ; https://docs.powens.com/api-reference/user-connections/connections | n/d | 2026-10-02 (mirror) | high (official docs; mirror) | Non-PSD2 wealth channel; credential-based sources; categorisation; webhooks |
| 44 | Mastercard Developers — Open Finance Europe (ex-Open Banking Europe/Aiia) docs (read via Context7 mirror `/websites/developer_mastercard`, 2026-10-02): unlicensed Aiia Data FAQ and API references; support FAQ "Licenses and certificates" | https://developer.mastercard.com/open-finance-europe/documentation/unlicensed/aiia-data/faq ; https://developer.mastercard.com/open-finance-europe/documentation/unlicensed/aiia-data/api-references ; https://developer.mastercard.com/open-finance-europe/documentation/support/faq | n/d | 2026-10-02 (mirror) | high (official docs; mirror) | "Aiia Data and Aiia Pay do not require a license"; Aiia Enterprise requires AISP/PISP registration; product renamed |
| 45 | GoCardless Bank Account Data docs (read via Context7 mirror, 2026-10-02): overview ("up to 24 months … up to 90 days"); quick-start (end-user agreement parameters) | https://developer.gocardless.com/bank-account-data/overview ; https://developer.gocardless.com/bank-account-data/overview/bank-account-data/quick-start-guide | n/d | 2026-10-02 (mirror) | high (official docs; mirror) | Confirms 90-day access cap still in docs; no closure notice found in the mirrored docs |
| 46 | Plaid docs (read via Context7 mirror `/llmstxt/plaid_llms_txt`, 2026-10-02): Financial Insights product comparison; Link Transactions configuration (`days_requested`); Enrich API; institutions/get; payment initiation (Europe) | https://plaid.com/docs/financial-insights/ ; https://plaid.com/docs/api/link/ ; https://plaid.com/docs/api/products/enrich/ ; https://plaid.com/docs/api/institutions/ ; https://plaid.com/docs/payment-initiation/ | n/d | 2026-10-02 (mirror) | high (official docs; mirror) | Transactions available in UK/Europe; Enrich EU availability not stated; 18 European payment markets |
| 47 | Sibling research files in this repository (independent sessions, each with its own citations): `open-banking-providers-a.md` (§2.1 180-day application date via financialinstitutionsnews.com; §2.6 Tink/TrueLayer agent routes; Fabrick Pass page; Banca d'Italia FAQ 90-day term), `regulatory-landscape.md` (§2 PSD3/PSR status via Norton Rose Fulbright / MoFo / Lexology 2026; §10.2 licensing models), `competitors-eu-uk.md` (§5 timeline: Powens new CEO Oct–Nov 2024; Spiir shutdown 8 Jun 2026; Yolt 2021/2023), `user-pain-points.md` (GoCardless discontinuation threads Aug 2025) | /home/user/Lilleri/docs/research/raw/ | 2026-10-02 | 2026-10-02 | medium–high (secondary, but independently sourced) | Cross-checks used by the adversarial pass; their underlying URLs are listed in those files |
| 48 | Fabrick — "Fabrick Pass" servizi as-a-service (AISP/PISP licence-as-a-service, IT/ES/FR) | https://www.fabrick.com/it/fabrick-pass-servizi-as-a-service | n/d | not fetched (cited via source 47) | medium-high (official page, not read) | AIS licence-as-a-service exists at Fabrick |
| 49 | Actual Budget issue #5505 "GoCardless Bank Account Data is being discontinued, replace with Enable Banking"; Firefly III issue #10753 | https://github.com/actualbudget/actual/issues/5505 ; https://github.com/firefly-iii/firefly-iii/issues/10753 | 2025-08-06 / 2025-08-13 | not fetched (cited via source 47) | medium (community) | Independent corroboration of the GoCardless BAD closure timing |

---

## Verification notes (adversarial pass)

**Date:** 2026-10-02. **Method constraints:** the session's WebSearch budget was already exhausted (200/200) and every primary web host (eur-lex, gocardless.com, enablebanking.com, bancaditalia.it, developer.mastercard.com) was refused by the egress proxy (HTTP 403 on CONNECT), so no fresh web search or page fetch was possible. Verification therefore used two independent channels: (a) **Context7 documentation mirrors** of the providers' official developer docs (first-party text, but a mirror that may lag the live site), and (b) **sibling research files** in this repository, each produced by a separate session with its own citations. Claims that neither channel could reach are marked *unverifiable* and left at their original status (or downgraded where the original status over-claimed). Nothing was deleted.

| # | Claim checked (section) | Verdict | Evidence / sources | Change made |
|---|---|---|---|---|
| 1 | PSD3/PSR "not in force; OJ publication anticipated June/July 2026" (§1) | **Corrected (status), confirmed (not applicable)** | No file in the repo and no mirrored doc confirms OJ publication; sibling `regulatory-landscape.md` §2 (NRF 2026, MoFo 2026-04-30, Lexology 2026) gives the same spring-2026 milestones and an 18–21-month application clock. | Row rewritten: OJ publication by today = **UNKNOWN**; earliest application ≈ 2028 added; ECON vote counts flagged as unverified secondary reporting. |
| 2 | PSR content: "180-day re-authentication retained"; 4×/day cap removal (§1) | **Corrected (over-stated) / unverifiable (final text)** | Sibling §2 (Bird & Bird 2023 proposal note): the proposal moves renewal SCA to the AISP; final text unknown. | Wording changed to "proposal content"; AISP-side SCA and 4×/day removal both HYPOTHESIS. |
| 3 | Delegated Reg. 2022/2360 applicable from 25 July 2023 (§1) | **Confirmed (two independent secondary sources)** | financialinstitutionsnews.com 2022-12-05 (via `open-banking-providers-a.md` §2.1); vixio/lexology (via `competitors-eu-uk.md` §6). Primary OJ text not fetched. | ASSUMPTION → FACT; art. 10a mechanics and OJ date added. |
| 4 | GoCardless BAD closed to new accounts from July 2025 (§3) | **Confirmed (timing), scope partially unverifiable** | Actual #5505 (2025-08-06) and Firefly #10753 (2025-08-13) via `user-pain-points.md`; those threads speak of the free/personal tier; the pricing-page snippet speaks of all new accounts; GoCardless docs mirror still online, 90-day cap unchanged. | Corroboration and scope caveat added; "attempt signup" instruction kept. |
| 5 | Enable Banking serves customers without an AISP licence; per-account pricing (§4, §15, §16.2) | **Confirmed and strengthened (first-party docs); pricing claim corrected** | Enable Banking FAQ and widgets docs (mirror): terms-consent widget "when the application relies on Enable Banking to access ASPSPs as a regulated entity"; BYO-licence TSP mode; FAQ: volume-based pricing **with a minimum monthly invoice**; restricted-production mode; web widgets; Credem/Mediolanum connectors. | FACT (secondary) → FACT (own docs); **minimum monthly invoice** added to pricing, assessment, §16.2, §16.3 and open questions; sandbox/SDK rows upgraded. |
| 6 | Fabrick: AIS under its licence for unlicensed clients "UNKNOWN but plausible" (§2.2, §15, §16.2) | **Corrected (under-claimed)** | `open-banking-providers-a.md` §2.6 cites fabrick.com "Fabrick Pass" — AISP licence "as a service" for IT/ES/FR (page not fetched). | Status → FACT (marketed) / UNKNOWN (B2C startup terms); licence sub-score 3? → 4?. |
| 7 | Powens: "CEO Bertrand Jeannet"; Wealth channel "likely credential-based"; webhooks/enrichment (§5) | **Corrected (CEO stale); confirmed (Wealth non-PSD2, credential sources; webhooks; categorisation)** | `competitors-eu-uk.md` §5: new Powens CEO Oct–Nov 2024. Powens docs (mirror): "Wealth & Loans … aggregating non-PSD2 accounts"; connector sources with `auth_mechanism` credentials/webauth; `CONNECTION_SYNCED`/`ACCOUNT_SYNCED`/`ACCOUNT_CATEGORIZED`; Category object. Italian "90 %" coverage figure remains unverifiable and dated. | CEO claim marked stale; three rows upgraded ASSUMPTION → FACT (docs). |
| 8 | Mastercard Open Banking Europe: "you do not need a license" (§8, §15, §16.2) | **Confirmed (first-party docs); naming corrected** | developer.mastercard.com (mirror): "Aiia Data and Aiia Pay do not require a license as services are provided under Mastercard's existing TPP license"; Aiia Enterprise requires AISP/PISP registration; docs now live under "Open Finance Europe". Spiir consumer app shut 8 Jun 2026 (`competitors-eu-uk.md`). | Rows updated with exact wording, new paths, Spiir signal and a roadmap question. |
| 9 | Plaid: Transactions/Enrich in Europe; licensed entities (§6) | **Partly confirmed; entities unverifiable** | Plaid docs (mirror): Transactions "also available in the UK and Europe"; `days_requested` 1–730; Enrich docs silent on EU; 18 European payment markets. No doc text on Plaid B.V./DNB or Plaid Financial Ltd/FCA reached. | Data-richness row updated; licence entities stay ASSUMPTION. |
| 10 | Model B "rarely offered commercially by aggregators" (§15.1) | **Corrected** | `open-banking-providers-a.md` §2.6: Tink ("use of agents") and TrueLayer (EU agents) offer the agent route on official pages. | Row rewritten; PSD2 art. 67(2)(f) consent-naming point added to model A. |
| 11 | Own AISP registration: 90-day decision term (§15.2); no capital; PII per EBA/GL/2017/08 | **Confirmed (90 days via Banca d'Italia FAQ cited by sibling; others consistent)** | `open-banking-providers-a.md` §2.1/§2.6 and `regulatory-landscape.md` §1.1/§10.1 (PSD2 art. 33, art. 5(3), EBA/GL/2017/08). Primary pages not fetched. | 90 days ASSUMPTION → FACT (via sibling); other rows unchanged. |
| 12 | Yolt "closed 2022–2023" (§14) | **Corrected** | `competitors-eu-uk.md` S-50 (aziendabanca; finextra): consumer app 2021, B2B unit end April 2023. | Row corrected; ASSUMPTION → FACT (via sibling). |
| 13 | Weighted scores in §16.3 | **Corrected (arithmetic)** | Recomputed Σ(w×s)/100 with the stated weights; 10 of 12 totals were off by 0.05–0.20 (e.g., Plaid 3.35 → 3.55, CBI direct 3.05 → 3.25). | Table recomputed; note added; ranking §16.4 annotated (Plaid > Powens on numbers). |
| 14 | Fabrick/finAPI deal (75 % on 19 June 2025), Fabrick 2025 results, Neonomics (Finanstilsynet licence, Ordo, 252 IT banks), Klarna Kosma 2025–26 status, Qwist/Crastorehill, Bud's Bank of Lithuania licence, Enable Banking FIN-FSA licence and "2,700+ ASPSPs", Powens "90 %" Italian coverage, openbankingtracker bank counts, OAM €160 fee, Banca d'Italia position on model A | **Unverifiable in this session** | No reachable source; the group-A file independently notes Yapily's 2022 finAPI deal (never completed), which is consistent with SCHUFA still owning finAPI until the 2025 Fabrick deal. Banca d'Italia's written position remains UNKNOWN in all three regulatory-relevant files (P0 counsel question). | Statuses left as originally labelled (all already FACT-with-caveat, ASSUMPTION or UNKNOWN); no upgrade applied. Re-verify on first unblocked network: finapi.io press page, neonomics.io, klarna.com, Bank of Lithuania register, FIN-FSA register, powens.com. |

**Net effect on decisions:** (i) the regulatory baseline is unchanged — design for PSD2 + RTS (180-day SCA at the bank, 4×/day background cap, ~90-day first history); (ii) Enable Banking stays #1 but now carries a known **minimum-invoice floor** to price; (iii) Fabrick's AIS licence-as-a-service is real ("Fabrick Pass"), which strengthens the case for a direct enquiry; (iv) the agent model (B) is commercially available from Tink/TrueLayer (group A), so the cross-group shortlist should compare A vs B explicitly; (v) on corrected arithmetic Plaid out-scores Powens — the #2/#3 order is a qualitative call for the synthesis phase.
