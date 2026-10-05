# Open-banking AIS aggregator for Lilleri: value-for-money review (2026-10-05)

**Question.** Lilleri is an Italy-first consumer PFM. It has no AISP licence and no eIDAS certificates. Which aggregator gives the best value for reading Italian consumer accounts (and cards where possible) under the provider's own licence? The cost must be covered by the "Plus" subscription: €6.99/month incl. 22 % VAT, about **€5.33 net** per paying user per month after VAT and Stripe fees. Only paying users get automatic bank sync.

**Verified:** 2026-10-05. **Companion file:** [`enable-banking-api-20261005.md`](enable-banking-api-20261005.md), the exact Enable Banking adapter specification.

**Labels.**
- **FACT** = stated by the cited source on 2026-10-05.
- **ASSUMPTION** = my estimate, or a third-party figure that is not confirmed by the vendor.
- **UNKNOWN** = not found.
- **CONFLICT** = sources disagree.

---

## 0. Bottom line

1. **Primary: Enable Banking** (Enable Banking Oy, Espoo, FIN-FSA-registered AISP), used under its own registration.
   - **Price:** sales-quoted, per connected account per month, with a minimum monthly invoice.
   - **Free testing:** a free **restricted production** mode lets the founder connect his *own* real Italian accounts and build the whole adapter before signing anything.
   - **Coverage:** the best-documented 2026 Italian coverage, including card accounts: Banco BPM, BPER Carte, Postepay, MPS, BNL, Credem, Widiba, Fineco, ING Italia credit card, Crédit Agricole IT, plus Hype, Sella, N26 and Revolut listings.
   - **API:** small and clean (JWT RS256, about 8 endpoints, stable ids).
2. **Fallback: Yapily** (Yapily Connect UAB, Bank of Lithuania licence, delegated registration for unregulated EEA customers). Price is sales-led ("base + usage"). It has the richest raw fields and documented 180-day EEA consent, was profitable in 2025, and Lilleri already has sandbox code for it in `packages/financial-providers`.
3. **Price benchmark: finAPI.** It is the only relevant provider with a **public price list**: Access B2C + Add-on International + "PSD2 licence AIS" for unlicensed customers ≈ **€280/month at 100 users, €1,400 at 1,000, €4,800 at 10,000** (per user, independent of the number of accounts). It has a 24-month minimum term, and its Italian coverage comes through an unnamed partner, so it is a benchmark rather than the primary.
4. **The floor dominates early.** At 100 paying users, every production option costs **roughly 47–375 % of net Plus revenue (€533/month)** because of minimum invoices. Automatic sync is self-funding (≤ ~15 % of revenue) only from roughly **400–1,000 paying users**, depending on the quote. Negotiate a ramp-up minimum with Enable Banking, or gate sync behind a waitlist until the threshold.
5. **Zero-cost founder test:**
   - Yes with Enable Banking restricted mode (free; own accounts only; evaluation or personal use; non-commercial).
   - Partly with Yapily: a 60-day "trial application" exists in its website terms, but its scope for real Italian banks is UNKNOWN.
   - Not with GoCardless (closed to new sign-ups), Tink (sandbox Demo Bank only, as far as found) or finAPI (paid licence, 24-month term).

---

## 1. Method and evidence limits (read before relying on any FACT)

- This session's egress proxy **blocked direct page fetches** (WebFetch/curl) for every provider domain tested: enablebanking.com, yapily.com, tink.com, truelayer.com, saltedge.com, finapi.io, powens.com, plaid.com, openbankingtracker.com, dev.to and others. GitHub was reachable.
- Evidence therefore comes from:
  - **WebSearch excerpts restricted to first-party domains.** The search engine summarises the live page. Treat these as "first-party page as surfaced by search", which is weaker than a full read.
  - **The Context7 documentation index** of Enable Banking's docs and OpenAPI file.
  - **git clones** of Enable Banking's official samples and Firefly III's open-source Enable Banking client.
  - **Repository research** dated 2026-10-02/03/05.
- Every price below is either a FACT from a first-party page, labelled as such, or explicitly an ASSUMPTION. No price was invented. "Contact sales" is reported as such.

---

## 2. Regulatory parameters that apply to every provider

| Parameter | Value | Label | Source |
|---|---|---|---|
| SCA renewal for AIS | Re-authentication every **180 days** (RTS 2018/389 art. 10a as amended by Delegated Reg. 2022/2360, applicable since 25 Jul 2023) | FACT (law; inherited from the repo's 2026-10-02 source, not re-fetched) | EUR-Lex 2022/2360 |
| Provider practice | Enable Banking: `maximum_consent_validity` is "180 days for the majority of ASPSPs". Yapily: "up to … 180 days in the EEA". **Tink: "now fully supports 180-day consent in … Italy"** | FACT | EB FAQ; Yapily consents docs; Tink changelog (search excerpts) |
| Unattended refresh | **4 accesses / 24 h** per account by default (RTS art. 36(5)(b)). Enable Banking: background fetching is "frequently limited to four times per day"; after `ASPSP_RATE_LIMIT_EXCEEDED`, wait **6 h**. PSU headers mark user-present calls, which are normally exempt. | FACT | EBA Q&A 2019_4631 (repo); EB FAQ |
| History | After the 180-day SCA window, "many ASPSPs restrict access to … the past 90 days". The depth on first connection varies by bank. Enable Banking offers `strategy=longest` to fetch the maximum available. Yapily documents Intesa's 14-day transaction windows. | FACT | EB FAQ + API reference; Yapily data restrictions (repo, 2026-10-02) |
| Licence route for Lilleri | Lilleri receives data as the provider's customer under the provider's AISP authorisation ("route A"). The provider's EEA passport covers Italy. **Banca d'Italia's position on an unlicensed Italian B2C app receiving AIS data this way is still UNKNOWN** (no new source found). The agent route is exceptional, and an own AISP registration is a 6–12-month project. | FACT (provider offers) / UNKNOWN (Banca d'Italia) | Repo §2; searches today found only generic material |
| CBI Globe direct | TPP area reserved to licensed PSPs with eIDAS QWAC/QSealC, so it is **not usable** by Lilleri. No fee schedule was found. | FACT | cbiglobe.com FAQ/Wiki (search) |

---

## 3. Provider-by-provider facts (2026-10-05)

### 3.1 Commercial and licensing summary

| Provider | Public pricing | Minimum / setup / term | Free tier or own-account mode | Self-serve sign-up today | Licence route for unlicensed Lilleri | Labels and sources |
|---|---|---|---|---|---|---|
| **Enable Banking** | **No price list.** "Volume based … number of accounts accessed and payments made per month." Since March/April 2026, quotes come through a "Get a Quote" form. | "**Minimum invoicing per month** which includes a certain amount of accounts and payments" (amount UNKNOWN). Setup fee UNKNOWN. Third-party listing: "startup-friendly, flexible ramp-up pricing and contract duration options" (ASSUMPTION). | **Restricted production: free.** Terms: "Use of the Control Panel and the API under these Terms is free of charge"; production use "limited to Linked Accounts … solely for evaluation purposes or for the personal use of private individuals"; no commercial use and no other people's accounts. | **Yes**: sign-up, sandbox and restricted production need no contract. Full production needs a contract and KYB. | **Yes.** Enable Banking acts as "authorised AISP" ("details … in the EBA register"); FIN-FSA-registered AISP, business ID 2988499-7. A mandatory terms-consent step (hosted or widget) applies when EB is the regulated entity. | FACT: EB FAQ, Terms, linked-accounts, control panel, March 2026 changelog, OBIE register page (all search/Context7). ASSUMPTION: third-party "ramp-up" claim. |
| **Yapily** | **No price list**: "Pricing options scale with your growth". Third-party: production = base + usage; "£200–500/month entry" (repo, low reliability); a "$0.30 per transaction" iGaming example (low). | Base fee + usage (ASSUMPTION amounts). Term UNKNOWN. | **Free console + sandbox (mock data).** Website terms: a **60-day "trial application"** for companies domiciled in the "Territories", describing "live operations with end-users". The real-bank scope is UNKNOWN. | Sandbox: yes. Production: sales (ASSUMPTION; no self-serve production found). | **Yes.** Yapily Connect UAB (Bank of Lithuania, licence LB002045). "If you are unregulated, you can register with each institution using Yapily Connect." | FACT: docs.yapily.com, yapily.com terms (search), Bank of Lithuania register (repo). Financials: 2025 turnover £16.7 m, **profit £355 k**, 102 staff (tech.eu 2026-10-02). |
| **GoCardless Bank Account Data (ex-Nordigen)** | Historical free tier: 50 bank connections/month. | n/a | Existing accounts only | **No.** "From July 2025 onwards, GoCardless has stopped accepting new Bank Account Data accounts"; still true in 2026. | n/a | FACT: bankaccountdata.gocardless.com/new-signups-disabled; Actual Budget docs (search) |
| **Tink (Visa)** | "Standard: contact Tink; Enterprise: custom"; "**no pay-per-use option**". Third-party listings: "€0.50/user/month Standard" (low reliability). | UNKNOWN (enterprise sales) | Free console + sandbox with **Demo Bank** (test data). No free real-account mode was found. | Sandbox: yes. Production: sales. | Yes, on Tink AB's licence after KYC (repo, 2026-10-02) | FACT: tink.com/pricing, FAQ (search). Visa reportedly closed its **US** open-banking unit and is "focusing … on Europe and Latin America" (fintechfutures, search; article cites the CFPB notice of 22 Aug, so likely 2025). |
| **TrueLayer** | Sales-gated. Third-party: "Develop $0, 100 Active Connected Accounts, sandbox; Scale from $261/month" (vendor not confirmed). | UNKNOWN | Develop tier (third-party) | Sandbox self-serve (third-party) | Yes for "non-regulated" customers using TrueLayer's flow (repo; search) | ASSUMPTION for prices. Payments-first strategy; layoffs in 2024–25 (repo + press). |
| **Salt Edge** | Not on saltedge.com. Third-party card (f6s, TrustRadius): **Free $0** with 100 live connections; **Growth $500/month**, unlimited live connections; Custom. | ASSUMPTION (card dates from about 2019) | 100 live connections (third-party) | UNKNOWN | Partner Program: "Partners … operate under Salt Edge's License". **Its EEA-licensed entity is still not named**; only UK FCA FRN 822499 was found. | FACT (programme exists) / UNKNOWN (EEA entity), unchanged from the repo |
| **finAPI** (75 % owned by Fabrick) | **Public list** (finapi.io/en/prices), net of VAT, **per user per month, cumulative tiers**: <br>• Access B2C: €60 flat ≤200 users; €300 flat ≤1,000; then €0.30 (1,001–5k), €0.27 (5k–10k), €0.24 (10k–25k), €0.21, €0.18, €0.15 (>100k). <br>• **Add-on International** (needed for Italy): €20 / €100 flat, then €0.10 → €0.05. <br>• **PSD2 licence AIS** (for customers without their own licence): €200 ≤200 users, +€100 per 100 users, **€1,000 at 901+**. | **24-month initial term**, auto-renewed 12 months, 6 months' notice. Setup fee UNKNOWN. | Sandbox. No free live mode (PSD2 licence not needed for "own users", but Access is still paid). | **Yes**: "Order now" binding online order. | Yes: "Customers without their own BaFin licence can use finAPI's PSD2 licence"; the finAPI Web Form is mandatory. Italy is served "together with partner" (223 Italian banks). Who is the AISP of record for Italian users is UNKNOWN. | FACT (prices, term): finapi.io pages via search. UNKNOWN: whether €1,000 is a flat cap above 900 users; Italian data quality. |
| **Powens** (ex Budget Insight) | Sales-gated ("connect with an advisor") | UNKNOWN | UNKNOWN | No (sales) | ACPR AISP; serves unregulated sub-clients (repo) | FACT: sales-gated (search) |
| **Plaid (EU)** | "For customers based in the EU or UK … **only Custom plans** are offered"; no pay-as-you-go in Europe | UNKNOWN; third-party minimums around USD 500–2,000/month (ASSUMPTION) | Sandbox | Sandbox only | Plaid B.V. (DNB); route A for unlicensed EU customers UNKNOWN (repo) | FACT: plaid.com billing docs (search) |
| **Token.io** | Sales-gated | UNKNOWN | UNKNOWN | No | "Licensing-as-a-service … use Token's FCA and BaFin licence". Token GmbH is a BaFin AISP passported to the EEA. Its product is payments-first. | FACT (search excerpt of token.io FAQ). Italian AIS coverage UNKNOWN. |
| **Fabrick** (Fabrick Pass) | Sales ("flat fee to revenue sharing", repo) | UNKNOWN | UNKNOWN | No | Yes: Banca d'Italia-authorised PI offering AISP "as a service", including to non-financial companies. B2C terms UNKNOWN. | FACT (fabrick.com via search). Only Italian-supervised option. |
| **CBI Globe** | Unpublished | — | — | — | **No**: licensed TPPs with eIDAS only | FACT |
| **Ponto / Isabel (Ibanity)** | **€4 per account per month** (VAT excl.) on Isabel APIHub; myponto.com shows a per-linked-account subscription, discounts above 10 accounts and a 14-day trial | — | 14-day trial | Yes (business-oriented) | Isabel NV is an NBB-authorised AISP/PISP. 15 countries incl. Italy. | FACT (search). At 2 accounts, €8/user exceeds Plus revenue, so excluded on price. |
| **Bridge (ex-Bankin' B2B)** | Sales-gated (subscription + per call/user) | UNKNOWN | UNKNOWN | No | French AISP; France-focused coverage | FACT (search; third-party) |
| **Fintecture** | Sales | UNKNOWN | UNKNOWN | No | ACPR PI #17248. An AIS API exists, but the product is payments/verification-first and France-centric. | FACT (doc.fintecture.com, search) |
| **Brite** | Sales | UNKNOWN | UNKNOWN | No | AIS "Data Solutions" aimed at merchant verification and onboarding, not PFM | FACT (docs.britepayments.com, search) |
| **Klarna Kosma** | — | — | — | No | Brand **scrapped Jul–Aug 2023**. Klarna's open-banking infrastructure continues as B2B/enterprise. No startup self-serve route found. | FACT (tech.eu, Finextra 2023) |
| Akahu | Not relevant (New Zealand) | — | — | — | — | — |

### 3.2 Technical summary

| Provider | API style | Auth | Sandbox | Consent / refresh / history notes |
|---|---|---|---|---|
| Enable Banking | REST/JSON, snake_case, Berlin-Group-like fields | App JWT **RS256**; `kid` = application id; `iss` = `enablebanking.com`; `aud` = `api.enablebanking.com`; TTL ≤ 24 h | Yes (Mock ASPSP + some bank sandboxes) + free restricted production | `valid_until` ≤ `maximum_consent_validity` (mostly 180 d). `continuation_key` pagination. `strategy=longest`. `entry_reference` is stable across sessions. No AIS data webhooks found. |
| Yapily | REST/JSON | Basic auth (app key/secret) + consent token (repo) | Yes (Modelo mock bank) | 180 d EEA. Client-driven refresh. Intesa 14-day windows and 429 `ACCESS_EXCEEDED` (repo). |
| Tink | REST + Tink Link | OAuth2 client credentials (ASSUMPTION; not re-verified) | Demo Bank | 180 d in Italy (new FACT). Managed refresh and webhooks (repo). |
| finAPI | REST (Access v2) + mandatory Web Form 2.0 (Italian UI available) | OAuth2 (ASSUMPTION; not re-verified) | Yes | Italy via partner; history and refresh UNKNOWN |
| TrueLayer, Salt Edge, Powens, Plaid | REST | OAuth-style | Yes | See the repo's `open-banking-providers.md`. Nothing new found today. |

---

## 4. Italian bank coverage (requested list)

Legend:
- **Y** = documented by the provider.
- **Y-card** = card accounts documented.
- **N-card** = card accounts documented as *not* available.
- **?** = not found.

Coverage claims are documentation and not proof of live success rates.

| Bank | Enable Banking (FACT unless noted) | Yapily (repo doc 2026-10-05 + search) | Tink (repo mirror + search) |
|---|---|---|---|
| Intesa Sanpaolo | Y (top ASPSP list). Card accounts: Y-card for Isybank and Intesa Private Banking (Apr 2026); main-brand cards ? | Y (CBI Globe; 14-day windows) | Y |
| UniCredit | Y; **N-card** (no credit cards via PSD2; IBAN prepaid such as Genius Card only) | Y | Y |
| Banco BPM | Y, **Y-card** (Mar 2026; also Bibanca) | Y | Y |
| BPER | Y, **Y-card** via "Area Riservata Carte" / BPER Banca Carte (Mar 2026); also Banco di Sardegna | Y (`bper`; `bper_card` listed, support blank) | ? |
| Crédit Agricole Italia | Y. **CONFLICT:** the Italy page says credit cards are not available; the May 2026 changelog says "added card accounts support". Likely IBAN cards, to be verified. | Y (`ca_cariparma_spa`, `ca_friuladria`) | Y (with 2026 incidents, repo) |
| MPS | Y, **Y-card** (Apr 2026) | Y | ? |
| BNL | Y, **Y-card** (Apr 2026) | Y | ? (Hello Bank listed) |
| Fineco | Y, **Y-card** (dedicated integration, Mar 2026) | Y (page notes eIDAS route for own-licence TPPs) | Y |
| Mediolanum | Y; **N-card** | Y (`bancamediolanum_it`) | ? |
| ING Italia | Y, **Y-card** (current, Conto Arancio, prepaid, Mastercard Gold credit card) | ? (only a UK ING page found) | ? |
| BancoPosta / Postepay | Y, **Y-card**: personal and business; IBAN vs nominal prepaid flows (Mar 2026) | Y (Poste Italiane) | Y (PostePay) |
| N26 | Y (shown in every country served, Apr 2026; fixes May 2026) | Y (decoupled pre-authorisation flow) | Y |
| Revolut | Y (shown in every country served) | Y (EU accounts) | Y |
| Hype | **Y** (integration "fixes and improvements", May 2026). *New vs repo.* | ? | **N** (absent from the IT list, repo) |
| Widiba | Y, **Y-card** (Apr 2026) | ? | ? |
| Credem | Y, **Y-card** (Apr 2026) | Y (Credito Emiliano) | ? |
| Banca Sella | Y ("Banca Sella group (IT)", May 2026) | ? (2021 claim) | ? |
| BCC | Y (pick the specific BCC; Iccrea group) | Y (per-BCC ids, e.g. `bcc_milano`) | ? |
| Others of note | Fideuram, Findomestic, Hello Bank!, Passadore, Euromobiliare, Mediobanca Premier card accounts (Apr–May 2026) | Soldo (via Fabrick gateway) | Mooney, TIM, Wise |

finAPI says it has 223 Italian banks via an unnamed partner (FACT, documentation.finapi.io), with no per-bank detail retrieved.

Salt Edge, Powens and Plaid have historical Italian claims (repo) and nothing new today.

**Not covered anywhere** as consumer AIS (unchanged): PayPal coverage is provider-specific; Satispay has no aggregator listing; Amex Italy is UNKNOWN; Nexi credit cards are not exposed (Nexi exposes prepaid only).

---

## 5. Cost model: 100 / 1,000 / 10,000 paying users

**Revenue:** €5.33 × users = **€533 / €5,330 / €53,300 per month**. A "self-funding" reference budget of 15 % of revenue is **€80 / €800 / €7,995**, i.e. €0.80 per user, €0.40 per account at 2 accounts or €0.27 per account at 3 accounts.

**Formula:** `cost = max(minimum invoice, metered quantity × unit price)`. Volume discounts are ignored, which is conservative. Provider invoices are B2B reverse-charge, so VAT is recoverable and costs are net. Excluded: setup fees (UNKNOWN), engineering, legal/DPIA, and dual-provider overlap.

### 5.1 Inputs

| Provider | Meter | Unit price | Monthly minimum | Basis |
|---|---|---|---|---|
| **finAPI** | per user (accounts per user irrelevant) | Public list (§3.1): B2C + Add-on International + PSD2 licence AIS | built into the flat tiers | **FACT** (first-party list via search). The €1,000 cap above 900 users is as displayed; whether it is flat at 10k users is **UNKNOWN**. |
| **Enable Banking** | per connected account accessed per month | Low €0.10 / Base €0.25 / High €0.50 | Low €300 / Base €750 / High €2,000 (assumed to include quota) | **ASSUMPTION**: same ranges as the repo cost model. The model and the minimum invoice are FACT; the amounts are not published. |
| **Yapily** | per account (base + usage) | €0.15 / €0.30 / €0.60 | €250 / €500 / €1,500 | **ASSUMPTION**; anchor "£200–500/month entry" from third parties (low reliability) |
| **Tink** | per user | €0.50 | €1,000 / €2,500 / €5,000 | **ASSUMPTION**: €0.50 is a listing-site figure; the floor is invented for sensitivity |
| Salt Edge | flat (Growth) | — | $500 ≈ €450 flat | ASSUMPTION (historical card). **Excluded:** EEA licence unknown. |
| Ponto | per account | €4.00 | — | FACT (APIHub, search). **Excluded:** €8/user at 2 accounts = 150 % of revenue. |

### 5.2 Results: 2 linked accounts per paying user (EUR per month; % of net Plus revenue)

| Provider (scenario) | 100 users (200 acc) | 1,000 users (2,000 acc) | 10,000 users (20,000 acc) |
|---|---|---|---|
| **Enable Banking, Low** | 300 (56 %) | 300 (5.6 %) | 2,000 (3.8 %) |
| **Enable Banking, Base** | 750 (141 %) | 750 (14.1 %) | 5,000 (9.4 %) |
| **Enable Banking, High** | 2,000 (375 %) | 2,000 (37.5 %) | 10,000 (18.8 %) |
| **finAPI (public list, FACT)** | **280 (52.5 %)** | **1,400 (26.3 %)** | **4,800 (9.0 %)** |
| Yapily, Low | 250 (47 %) | 300 (5.6 %) | 3,000 (5.6 %) |
| Yapily, Base | 500 (94 %) | 600 (11.3 %) | 6,000 (11.3 %) |
| Yapily, High | 1,500 (281 %) | 1,500 (28.1 %) | 12,000 (22.5 %) |
| Tink, Base (€0.50/user, €2,500 floor) | 2,500 (469 %) | 2,500 (46.9 %) | 5,000 (9.4 %) |

finAPI breakdown:
- 100 users = B2C €60 + International €20 + PSD2 licence €200.
- 1,000 users = €300 + €100 + €1,000.
- 10,000 users = €2,850 + €950 + €1,000.

### 5.3 Sensitivity: 3 linked accounts per paying user

| Provider (scenario) | 100 users (300 acc) | 1,000 users (3,000 acc) | 10,000 users (30,000 acc) |
|---|---|---|---|
| Enable Banking, Low | 300 (56 %) | 300 (5.6 %) | 3,000 (5.6 %) |
| **Enable Banking, Base** | 750 (141 %) | 750 (14.1 %) | **7,500 (14.1 %)** |
| Enable Banking, High | 2,000 (375 %) | 2,000 (37.5 %) | 15,000 (28.1 %) |
| finAPI (per user, unchanged) | 280 (52.5 %) | 1,400 (26.3 %) | 4,800 (9.0 %) |
| Yapily, Base | 500 (94 %) | 900 (16.9 %) | 9,000 (16.9 %) |
| Tink, Base (per user) | 2,500 (469 %) | 2,500 (46.9 %) | 5,000 (9.4 %) |

### 5.4 Readings

- **100 paying users:** no production option is self-funding. The cheapest documented route is finAPI at €280 (52.5 %), but it locks Lilleri into a 24-month term worth about €6,700 or more. With Enable Banking, the minimum invoice is the whole question: at the Base assumption (€750) sync costs 1.4× revenue.
- **Break-even at 15 % of revenue for a given minimum:** €300 → 375 paying users; €750 → about 940; €2,000 → about 2,500.
- **1,000 users:** Enable Banking Base and Yapily Base land at 11–14 %. finAPI is at 26 %, because the €1,000 PSD2-licence fee dominates.
- **10,000 users:** everything except the High cases is ≤ 10–17 %. A per-user meter (finAPI, Tink) protects against users who link many accounts; a per-account meter costs 1.5× when users go from 2 to 3 accounts.
- **Negotiation targets for the Enable Banking quote:**
  - unit price ≤ €0.20 per account per month at 2k–20k accounts;
  - minimum invoice ≤ €300 per month in the first 12 months (ramp-up);
  - no setup fee;
  - monthly or 12-month term.
  
  finAPI's public list is the reference point: about €0.40 per *user* per month all-in at 1k–5k users.

---

## 6. Recommendation and reasoning

### Primary: Enable Banking

| Criterion | Assessment |
|---|---|
| Price | Quoted, not public (weakness). The per-account meter fits "paying users only". The "Get a Quote" form asks for month-1, 12 and 24 volumes, which fits ramp-up pricing. Commercial risk = the size of the minimum invoice. |
| Coverage | Best-documented 2026 Italian coverage of any provider, including **card accounts** at most large groups. It also lists Hype, Sella, ING Italia credit cards, N26 and Revolut. Documented gaps (UniCredit and Mediolanum credit cards) are bank-side PSD2 limits that no aggregator fixes. |
| Licence cover | FIN-FSA-registered AISP acting as the regulated entity, with a mandatory EB terms step. There is a documented exit to "bring your own licence" (TPP Infrastructure-as-a-Service) if Lilleri ever registers with Banca d'Italia. |
| Self-serve | Best in class: sign-up, sandbox and **free restricted production with the founder's own accounts** without a contract, then contract and KYB. |
| API quality | Small, consistent REST API. Stable identities (`identification_hash`, `entry_reference`). Explicit error enum. `strategy=longest`. Documented PSU-header and rate-limit behaviour. An independent OSS client (Firefly III) uses it in production. Weaknesses: no AIS webhooks found, no enrichment (Lilleri builds its own anyway), no native mobile SDK. |
| Vendor risk | Small Finnish company ("Finland's 5th largest fintech" self-claim, 2024). Mitigation: non-exclusive contract plus Lilleri's adapter boundary. |

### Fallback: Yapily

- **Strengths:**
  - strongest licence evidence: a named Bank of Lithuania licence and documented delegated registration;
  - richest raw transaction fields;
  - 180-day EEA consent documented;
  - became profitable in 2025;
  - existing Lilleri sandbox code.
- **Why second on value for money:**
  - no free real-account mode beyond an undefined 60-day trial;
  - sales-led production pricing;
  - more integration work (own picker, scheduler);
  - thinner public evidence on Italian card accounts, ING Italia, Hype and Widiba.
- **Promotion rule:** promote Yapily to primary if its written quote beats Enable Banking's by more than 20 % at 1k–10k accounts *and* its Italian institution list matches on the top 10 banks.

### Price benchmark (not primary): finAPI

- Use its public list to anchor both quotes.
- It becomes interesting only if Enable Banking's minimum exceeds about €1,000 per month **and** finAPI's partner coverage for Italy passes a real-account test.
- **Risks:** the 24-month lock-in; the AISP of record for Italian users is UNKNOWN; DACH focus.

### Not recommended now

- **Tink:** challenger. It now confirms 180-day Italian consent, but it is enterprise-only, offers no PAYG and has no Hype.
- **Excluded or weaker:**
  - Salt Edge: EEA entity not named.
  - GoCardless: closed to new sign-ups.
  - Ponto: price.
  - Plaid EU: custom-only.
  - TrueLayer: payments pivot and unclear startup pricing.
  - Powens, Fabrick, Token.io, Bridge, Fintecture, Brite: sales-only, France- or payments-focused, or unknown Italian AIS.
  - Klarna Kosma: brand retired.
  - CBI Globe: licence required.

### Conditions before going live (all providers)

1. Italian counsel confirms that the route-A recipient role is acceptable for a B2C app, and the required consent and T&C wording. This is P0 and unchanged from the repo.
2. A written quote with the minimum invoice, included quota, term and setup fee.
3. A DPA, sub-processor list and hosting region.
4. A real-account pilot (restricted mode) on the founder's own banks, measuring history depth, pending items, `entry_reference` fill, card-account exposure and 4×/day behaviour.

---

## 7. Zero-cost testing with the founder's own accounts

| Provider | Zero-cost live test? | Conditions |
|---|---|---|
| **Enable Banking** | **Yes** (FACT) | Register a *production* application → "Activate by linking accounts" → it becomes "active in restricted mode". Data comes only from accounts linked by the Control Panel user. The Terms say "free of charge" and "solely for evaluation purposes or for the personal use of private individuals", with no commercial purpose. Firefly III users report sessions of up to 180 days. Beta testers' accounts are **not** allowed: they are not the Control Panel user's accounts. |
| Yapily | Possibly | A 60-day "trial application" in the website terms. Whether it reaches live Italian banks under Yapily Connect is UNKNOWN; ask. |
| Salt Edge | Possibly (historical "100 live connections" / Test status) | Moot until its EEA licence is clarified |
| TrueLayer | Possibly ("Develop: 100 active connected accounts", third-party) | UNKNOWN for EU live data |
| Tink | No (Demo Bank sandbox only, as found) | — |
| finAPI | No (paid Access + 24-month term; PSD2 licence fee waived only for "own users") | — |
| GoCardless | No (closed to new sign-ups) | — |

---

## 8. What changed vs. the repo docs of 2026-10-02/03

| Topic | Repo (2026-10-02/03) | Now (2026-10-05) | Impact |
|---|---|---|---|
| Decision | Yapily primary, Enable Banking fallback; ranking weighted toward trust | **Enable Banking primary, Yapily fallback** on value for money: free real-account testing, documented Italian card coverage, simpler API, per-account fit with "paying users only" | Flip, conditional on quotes. The Yapily sandbox code stays as the fallback adapter. |
| "No first-party price list exists for any shortlisted provider" | Stated | **finAPI publishes a full list** (Access B2C, Add-on International, PSD2 licence AIS, 24-month term). **Ponto** publishes €4 per account. | The cost model has one hard anchor; finAPI moves from "only via Fabrick" to benchmark. |
| Enable Banking restricted mode | Documented as a pilot route; cost not stated | **Free of charge** per Terms; evaluation or personal use only; no commercial use; own accounts only | Founder test at €0 confirmed |
| Enable Banking Italian coverage | Hype UNKNOWN; cards absent at UniCredit/Mediolanum/CA; Fineco cards yes | Hype, Banca Sella, Crédit Agricole IT (card CONFLICT), Mediobanca Premier (May 2026). MPS, BNL, Widiba, Credem, Fideuram, Hello Bank, Isybank cards (Apr 2026). BPM, BPER Carte, Postepay variants (Mar 2026). ING Italia credit card documented. | Card coverage substantially better documented |
| Tink 180-day consent in Italy | UNKNOWN | **FACT**: "fully supports 180-day consent … in Italy" | Removes one Tink blocker; still enterprise-only |
| Yapily finances | Losses reduced (2025 press) | **Profitable in 2025** (£16.7 m turnover, £355 k profit; tech.eu 2026-10-02) | Lower vendor risk for the fallback |
| Yapily trial | Not recorded | 60-day "trial application" in website terms | Possible free live test; scope UNKNOWN |
| Cost framing | 1k–1M connected users, 1.0/1.8/2.5 connections | 100 / 1k / 10k **paying** users vs €5.33 net revenue; 2 and 3 accounts | Shows that the floor, not the unit price, is the early-stage problem |
| GoCardless BAD, Salt Edge EEA entity, Klarna Kosma, CBI Globe | Closed / unknown / retired / licence-only | Unchanged | — |
| Banca d'Italia position on route A | UNKNOWN (P0) | Still UNKNOWN; no new public source | Counsel opinion is still required |

---

## 9. Open questions (ask in the quotes)

1. **Enable Banking:**
   - minimum monthly invoice and included quota at month 1, 12 and 24;
   - per-account price at 2k / 20k / 30k accounts;
   - setup fee and term;
   - what counts as an "account accessed" (any call in the month?);
   - AIS webhooks, SLA, status page, hosting region;
   - Italy passport line in the EBA register;
   - Crédit Agricole IT card-account scope;
   - Hype account types.
2. **Yapily:** base fee plus AIS usage meter (per call or per account); whether the 60-day trial covers live Italian banks; ING Italia / Hype / Widiba / Sella institution ids.
3. **finAPI:**
   - whether the PSD2 licence AIS fee is flat at €1,000 above 900 users;
   - setup fee;
   - who the Italian partner is and which entity is the AISP of record for Italian consumers;
   - whether a 12-month term is available.
4. **Counsel (P0):** is Lilleri's role as a recipient under a foreign AISP's registration acceptable for Italian consumers, and which consent and privacy wording is required?

---

## 10. Sources (all accessed 2026-10-05)

Method key:
- **S** = WebSearch excerpt (domain-restricted where noted).
- **C7** = Context7 documentation index.
- **G** = git clone (full read).
- **R** = repository document.

Reliability: H (first-party), M (reputable press or secondary), L (listing or aggregator sites).

| # | Source | URL | Method | Rel. | Used for |
|---|---|---|---|---|---|
| 1 | Enable Banking FAQ | https://enablebanking.com/docs/faq/ | S, C7 | H | Pricing model, minimum invoice, licence, PSU headers, 4×/day, 180-day validity, pagination |
| 2 | Enable Banking Terms of Service | https://enablebanking.com/terms/ | S | H | Free restricted use; evaluation or personal use only |
| 3 | Enable Banking linked accounts | https://enablebanking.com/docs/api/linked-accounts/ | S, C7 | H | Restricted production |
| 4 | Enable Banking control panel | https://enablebanking.com/docs/api/control-panel/ | S, C7 | H | Activation modes, keys |
| 5 | Enable Banking Italy page | https://enablebanking.com/docs/markets/it/ | S | H | Italian banks, card limits, ING, Postepay |
| 6 | EB March 2026 changelog | https://enablebanking.com/blog/2026/04/08/enable-banking-changelogmarch-2026 | S | H | BPM/BPER/Postepay/Fineco cards; Get a Quote |
| 7 | EB April 2026 changelog | https://enablebanking.com/blog/2026/05/14/enable-banking-changelog-april-2026 | S | H | MPS/BNL/Widiba/Credem etc. cards; N26/Revolut/Wise |
| 8 | EB May 2026 changelog | https://enablebanking.com/blog/2026/06/12/enable-banking-changelog-may-2026 | S | H | Crédit Agricole IT and Mediobanca cards; Hype; Sella |
| 9 | EB API reference + OpenAPI | https://enablebanking.com/docs/api/reference/ ; https://enablebanking.com/docs/api/reference/enablebanking-api.yaml | C7, S | H | API facts (see `enable-banking-api-20261005.md`) |
| 10 | EB widgets | https://enablebanking.com/docs/api/widgets | C7 | H | Terms-consent step |
| 11 | OBIE register: Enable Banking Oy | https://www.openbanking.org.uk/regulated-providers/enable-banking-oy/ | S | M | FIN-FSA registered AISP, business ID |
| 12 | EB official samples | https://github.com/enablebanking/enablebanking-api-samples | G | H | JWT claims, endpoints |
| 13 | Firefly III EB importer + docs | https://github.com/firefly-iii/data-importer ; https://docs.firefly-iii.org/tutorials/data-importer/eb/ | G, S | M | Independent client; 180-day session in restricted mode |
| 14 | GoCardless sign-ups disabled | https://bankaccountdata.gocardless.com/new-signups-disabled ; https://actualbudget.org/docs/advanced/bank-sync/gocardless/ | S | H/M | Closed since July 2025; 50 free connections historically |
| 15 | Yapily docs: consents, registration, sandbox | https://docs.yapily.com/data/financial-data-resources/financial-data-consents ; https://docs.yapily.com/getting-started/integration-setup/registration ; https://docs.yapily.com/resources/sandbox/overview | S | H | 180 d EEA; Yapily Connect; sandbox |
| 16 | Yapily website terms | https://www.yapily.com/legal/website-terms-of-use | S | H | 60-day trial application |
| 17 | tech.eu on Yapily | https://tech.eu/2026/10/02/we-prefer-to-remain-on-the-sidelines-says-yapily-boss-amid-open-banking-consolidation | S | M | 2025 turnover/profit, staff |
| 18 | Yapily pricing (third-party) | https://blog.finexer.com/yapily-pricing/ ; https://omr.com/en/reviews/product/yapily/pricing | S | L | "Not public; base + usage" |
| 19 | Tink pricing / FAQ / scale | https://tink.com/pricing/ ; https://tink.com/faq/ ; https://tink.com/scale/ | S | H | Contact sales; no PAYG; sandbox Demo Bank |
| 20 | Tink changelog / PSD2 intro | https://docs.tink.com/changelog ; https://docs.tink.com/resources/aggregation/introduction-to-psd2 | S | H | 180-day consent in Italy |
| 21 | Tink pricing (third-party) | https://merchantmachine.co.uk/open-banking-payments/tink/ ; https://blog.finexer.com/tink-pricing/ | S | L | €0.50/user claim |
| 22 | Visa US open-banking closure | https://www.fintechfutures.com/open-banking/visa-reportedly-closes-us-open-banking-operations | S | M | Tink strategy |
| 23 | finAPI prices | https://www.finapi.io/en/prices/ | S | H | Full price list, tiers, PSD2 licence fees |
| 24 | finAPI order / contract | https://www.finapi.io/en/order-now/ ; https://www.finapi.io/wp-content/uploads/2024/02/20240212_SaaS_Basic_Contract-English_Onlineversion.pdf | S | H | 24-month term, auto-renewal |
| 25 | finAPI PSD2 licence-as-a-service; coverage | https://www.finapi.io/en/products/open-banking/psd2-license/ ; https://documentation.finapi.io/access/european-coverage-together-with-partner ; https://www.finapi.io/en/products/country-coverage/ | S | H | Licence route; 223 Italian banks via partner |
| 26 | finAPI Web Form languages | https://documentation.finapi.io/webform/ | S | H | Italian UI |
| 27 | TrueLayer docs / third-party pricing | https://docs.truelayer.com/docs/data-api-basics ; https://www.softwaresuggest.com/truelayer | S | H/L | Italy providers; Develop/Scale claims |
| 28 | Salt Edge Partner Program / pricing cards | https://www.saltedge.com/products/account_information/partner_program ; https://www.f6s.com/software/salt-edge ; https://www.trustradius.com/products/salt-edge/pricing | S | H/L | Partner licence wording; Free/Growth card |
| 29 | Powens | https://www.powens.com/products/financial-data-aggregation ; https://www.softwareadvice.com/product/347231-Powens/ | S | H/L | Sales-gated |
| 30 | Plaid billing | https://plaid.com/docs/account/billing ; https://support.plaid.com/hc/en-us/articles/16110502116887 | S | H | EU = custom plans only |
| 31 | Token.io FAQ | https://token.io/faq | S | H | Licensing-as-a-service; BaFin passport |
| 32 | Fabrick Pass | https://fabrick.com/psd2/fabrick-pass ; https://www.fabrick.com/en-gb/product/aisp/ | S | H | AISP as a service |
| 33 | CBI Globe | https://www.cbiglobe.com/Help-Center/FAQ/L/0 ; https://www.cbiglobe.com/Wiki/index.php/3._TPP_onboarding | S | H | TPP-only |
| 34 | Ponto / Isabel | https://myponto.com/en/pricing/partner-paying-model/ ; https://apihub.isabel.eu/products/ponto-connect | S | H | €4 per account; 15 countries incl. IT |
| 35 | Bridge | https://openfinanceguide.com/en/glossary/bridge | S | L | Sales-gated, France focus |
| 36 | Fintecture | https://doc.fintecture.com/page/account-information | S | H | AIS API exists |
| 37 | Brite | https://docs.britepayments.com/products/data-solutions/ | S | H | Merchant data solutions |
| 38 | Klarna Kosma | https://tech.eu/2023/07/31/klarna-scraps-open-banking-brand-klarna-kosma/ ; https://www.finextra.com/newsarticle/42716/klarna-ditches-open-banking-brand | S | M | Brand retired |
| 39 | Third-party price signals | https://www.openbankingcompare.com/blog/open-banking-pricing-models ; https://www.g2.com/products/enable-banking/pricing | S | L | Plaid USD 500–2,000 minimums; EB "ramp-up" claim; open-banking.io €3 + €1 per account retail |
| 40 | Repo research | `docs/research/open-banking-providers.md`, `provider-cost-model.md`, `provider-capability-matrix.md` (2026-10-02/03); `italian-bank-connections-20261005.md` | R | — | Baseline, Yapily institution pages, legal parameters |
