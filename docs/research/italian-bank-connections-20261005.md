# Italian bank connections: catalogue evidence and activation boundary

**Verified:** 2026-10-05. **Scope:** Italy-first personal account information, including the major banks requested by the user. **Baseline inspected:** Lilleri `0984816`; the published runtime has an empty synthetic catalogue and no configured live-provider application credentials. This research verifies public documentation, not a successful Lilleri bank connection.

## Decision

Provide a searchable catalogue of recognisable Italian bank brands with separate bank, card and wallet entries. A catalogue entry means the user can find the institution and its available route; it must not imply that an automatic connection is activated. Use the server-side, application-specific provider discovery response to enable an automatic connection. Neither a public bank website nor a provider's marketing coverage count establishes access for Lilleri.

The existing Yapily preference remains a candidate for the bank integration. Its current first-party documentation explicitly describes a delegated **Yapily Connect** licensing and registration route; the individual institution configuration pages mostly describe the alternative route for already regulated TPPs using their own eIDAS certificates. Do not tell the user that they must obtain their own AISP licence or eIDAS certificates when evaluating Connect. Lilleri still needs an accepted arrangement, a provider application with the required live institutions registered, and an operational protected account/consent/data-storage runtime. [Y1, Y2]

Enable Banking remains a useful alternative for measuring real Italian account support: its documented restricted-production mode permits data access only to each own account explicitly linked to the application. Linking one account does not enable the user's other accounts or unrestricted access for other users. Full activation requires the provider's contractual and customer-verification process. This is a candidate pilot route, not an activated Lilleri integration. [E4, E5]

## Recommended brand catalogue

The following identifiers are **Lilleri brand identifiers proposed for presentation**, not provider institution IDs. Match a selected provider institution using authoritative metadata and explicit bindings; search aliases must never silently select a different corporate, card or banking-group institution. Canonical display names can differ from the legal names returned by the provider.

| Proposed brand ID | Display name | Useful search aliases | Presentation kind | Documentation verified; practical caveat |
| --- | --- | --- | --- | --- |
| `intesa-sanpaolo` | Intesa Sanpaolo | Intesa; Sanpaolo; XME | bank | Yapily AIS registration documented. Enable Banking describes redirect/SCA and its April 2026 release names card-account coverage. Keep Isybank/Fideuram as distinct provider institutions if discovered. [Y3, E1, E3] |
| `unicredit` | UniCredit | Uni Credit | bank | Yapily AIS registration documented. Enable Banking reports no credit-card accounts through the bank's PSD2 interface; IBAN-bearing prepaid cards such as GENIUS CARD are distinct. Do not turn a Buddy brand match into a UniCredit account connection without an explicit binding. [Y4, E1] |
| `banco-bpm` | Banco BPM | BPM; Banco Popolare; YouApp | bank | Yapily AIS registration documented; Enable Banking's March release reports Banco BPM card-account coverage. Current account and card routes still require the provider's institution/account capabilities. [Y5, E2] |
| `bper` | BPER Banca | BPER; Banca Popolare Emilia Romagna | bank | Yapily publishes `bper`; `bper_card` and corporate variants are also listed, but their table's support cells are blank. Enable Banking requires a choice between BPER Banca and BPER Banca Carte. [Y6, E1, E2] |
| `credit-agricole-italia` | Crédit Agricole Italia | Credit Agricole; Cariparma; FriulAdria | bank | Yapily publishes retail and business/corporate variants. Enable Banking reports credit-card accounts unavailable through PSD2 and IBAN-bearing cards supported. Cariparma/FriulAdria search must show the matching institution rather than assume all variants are interchangeable. [Y7, E1] |
| `monte-paschi-siena` | Monte dei Paschi di Siena | MPS; Montepaschi; Banca MPS | bank | Yapily AIS registration documented; Enable Banking's April release reports card-account access. Yapily's page has a copied instruction referring to Banco di Sardegna, so that instruction is not an authoritative MPS binding. [Y8, E3] |
| `bnl` | BNL BNP Paribas | BNL; Banca Nazionale del Lavoro | bank | Yapily AIS registration documented; Enable Banking's April release reports card-account access. BNL-distributed Amex products must not be assumed to appear in a BNL AIS feed. [Y9, E3] |
| `fineco` | Fineco | FinecoBank; Finecobank | bank | Yapily AIS registration documented; Enable Banking's March release explicitly adds Finecobank card accounts. Securities and the trading-only product are not automatically payment-account coverage. [Y10, E2] |
| `mediolanum` | Banca Mediolanum | Mediolanum | bank | Yapily publishes `bancamediolanum_it`; Enable Banking reports no credit-card accounts in the bank's open-banking API. [Y11, E1] |
| `ing` | ING | ING Direct; Conto Corrente Arancio; Conto Arancio | bank | Enable Banking explicitly documents Italian current, savings, prepaid and Mastercard Gold card-account access. Yapily's retrieved ING configuration is filed under the UK and does not itself establish an Italian institution binding. [E1] |
| `bancoposta` | BancoPosta | Banco Posta; Poste Italiane | bank | Yapily documents Poste Italiane AIS. Enable Banking explicitly requires BancoPosta and Postepay selection before bank authentication. Do not present one as an alias that automatically connects the other. [Y12, E1] |
| `postepay` | Postepay | PostePay; Poste Italiane; Postepay Evolution | card | Enable Banking documents distinct personal/business flows and IBAN/nominal-prepaid differences. Some Postepay-branded debit cards belong to a BancoPosta account; avoid creating a duplicate card-account ledger from the brand alone. [E1, E2] |
| `n26` | N26 | N 26 | bank | Yapily documents AIS on the newer Berlin Group integration and a **pre-authorisation/decoupled** flow; the Token IO integration is being deprecated. Enable Banking documents cross-border listing. A single-redirect Modelo adapter cannot be assumed to cover N26. [Y13, Y14, E3] |
| `revolut` | Revolut | Revolut Bank | bank | Yapily's page explicitly distinguishes UK registration from Revolut EU accounts and contains a `revolut` example. Enable Banking lists personal Revolut separately from RevolutBusiness. EU coverage and retail capability still need the actual application response. [Y15, E3, E6] |

Additional useful Italian catalogue candidates are **Credem**, **Banca Sella**, **Widiba**, **BBVA Italia**, and the cooperative groups **BCC Iccrea** and **Cassa Centrale**. They must receive their own documented routes before automatic activation. Yapily publishes Credito Emiliano AIS configuration [Y16], while Enable Banking documents BBVA Italy [E1] and Widiba/Credem card-account updates [E3]. BCC/Allitude pages list many specific local-bank IDs: a group tile can help users find their BCC, but cannot itself stand in for the customer's ASPSP. CartaBCC and Numia can also be separate card brands. [Y17, Y18, E1]

## Provider IDs actually published in the retrieved material

These are documentation observations, not permission to hardcode a live connection. Store them as evidence or candidate bindings; `GET /institutions` from the enabled application remains authoritative for the current ID, country, environment and features.

| Provider | Published candidate institution ID | Evidence |
| --- | --- | --- |
| Yapily | `bper` | BPER configuration table explicitly says supported. `bper_corporate` and `bper_card` are listed with blank support cells; validate independently. [Y6] |
| Yapily | `ca_cariparma_spa`; `ca_friuladria` | Crédit Agricole table marks these supported. It also separately lists `-business`, `-nowbanking_corporate`, and `-net2_corporate` for each retail root. [Y7] |
| Yapily | `bancamediolanum_it` | Mediolanum/Cedacri table explicitly publishes this ID. Other banks in the same registration group retain their own IDs. [Y11] |
| Yapily | `revolut` | Published in a payment example on the page that explicitly describes Revolut EU. It does not prove Italian AIS support or retail availability in Lilleri's application. [Y15] |
| Yapily | Per-local-bank BCC IDs, e.g. `bcc_milano`, `bcc_roma`, `bcc_iccrea` | BCC group table publishes these among many entries; choose the exact bank the user holds an account with. [Y17] |

No authoritative live ID was recovered from the retrieved public configuration pages for Intesa, UniCredit, Banco BPM, MPS, BNL, Fineco or Poste. Do not infer IDs by lowercasing the bank's display name. The public tutorial's `modelo-sandbox` is explicitly a sandbox institution and never belongs in the real Italian bank picker. [Y19, Y20]

## Discovery and activation rules

1. Call Yapily discovery on the server with the application credentials. `GET /institutions` means institutions **within that application**, not every institution advertised by Yapily. Never expose its Basic Auth credentials to the mobile bundle. [Y19]
2. For an Italy retail automatic-feed candidate, require the response's exact institution ID, `environmentType: LIVE`, applicable `countries[].countryCode2: IT`, and the required AIS capabilities. Yapily's tutorial explicitly requires `ACCOUNTS` and `ACCOUNT_TRANSACTIONS`; also check initiation capabilities for the implemented authorisation flow. Country coverage alone cannot establish the returned account type. [Y19, Y20]
3. Verify the institution's actual registration and the selected flow. N26 requires pre-authorisation followed by account authorisation and consent-status polling; an `authorisationUrl` is not guaranteed for every institution or step. Do not activate a tile merely because account reads are supported. [Y2, Y13]
4. Obtain the user's consent at the provider/bank, then verify the consent, institution, application user, exact feature scope, owner, and current grant generation before admitting financial data. Sandbox tests are useful protocol verification but are not live acceptance evidence.
5. Display the actual retrieved accounts and supported products. Do not promise all credit-card transactions, savings, investments, a universal history depth, or a fixed consent lifetime based on a bank name. The provider's Italian documentation records material product and authentication differences. [E1–E3]
6. Importing an exported statement is a separate, explicit route; opening the institution's own website is another. Neither changes the connection status to active. Real financial uploads must stay behind protected personal access, including for Amex or Satispay.

For Enable Banking, the analogous discovery endpoint is `GET /aspsps` with country, `psu_type` and service filters. Its ASPSP names, auth methods, account capabilities and restricted-production whitelist must be checked in the selected application. A historical integration changelog establishes that a connector was released, not its current success rate or Lilleri's admission to it. [E7]

## American Express and Satispay boundary

American Express should be a distinct **card** entry, and Satispay a distinct **wallet** entry. Yapily's AMEX page explicitly lists `amex-ob_eu` for Norway, France, Sweden and Finland; this does **not** establish Amex Italy coverage. The Amex Italy consumer help page verifies account statements in PDF in the Amex app. Its Amazon Business material describes different business exports; it is not evidence for a consumer CSV/XLSX preset. No exact consumer CSV/XLSX schema was verified. [Y22, A1, A2]

Satispay publishes an official XS2A portal, but no usable consumer AIS schema, onboarding or provider entitlement was verified from it. Its documented `GET payments` merchant API is shop-scoped, not a consumer wallet feed. Its consumer material confirms individual PDF payment receipts, which are not a structured account transaction-history export. Keep automatic availability unverified until a provider supplies the relevant Italian consumer-account institution and financial-read/consent contract. Do not promise a native Satispay CSV mapping without a verified export format. [S1–S3]

## Verified official public website links

These are useful secondary navigation targets, freshly retrieved on 2026-10-05. They are **institution websites**, not Lilleri consent or account-sync endpoints. Label them accordingly and keep them separate from any connect button.

| Institution | Official website |
| --- | --- |
| Intesa Sanpaolo | https://www.intesasanpaolo.com/ |
| UniCredit | https://www.unicredit.it/it/privati.html |
| Banco BPM | https://www.bancobpm.it/ |
| BPER | https://www.bper.it/ |
| Crédit Agricole Italia | https://www.credit-agricole.it/ |
| MPS | https://www.mps.it/ |
| BNL | https://bnl.it/it/Individui-e-Famiglie |
| Fineco | https://it.finecobank.com/ |
| Mediolanum | https://www.bancamediolanum.it/ |
| ING | https://www.ing.it/ |
| BancoPosta | https://www.poste.it/conti-correnti-bancoposta |
| Postepay | https://www.postepay.it/ |
| N26 | https://n26.com/it-it |
| Revolut Italia | https://www.revolut.com/it-IT/ |

The old BancoPosta `.html` path did not yield a retrieved page; the current extensionless path above did. Successful public-page extraction establishes an official destination, not a successful private login or financial export.

## Sources and quality

All sources below were read through Exa on **2026-10-05**, using full-page extraction for the operational claims. Some large API pages were also checked through focused search excerpts; no authenticated provider catalogue or real financial account was accessed.

**Yapily quality:** first-party implementation documentation maintained by the API operator; suitable for endpoint/configuration facts, with commercial incentives for its product claims. Institution pages are undated. The MPS page has a copied-bank instruction, BPER/BCC tables contain sparse support cells, and an API example retains old generic consent-lifetime wording. These are reasons to verify current configuration and actual consent metadata, not infer guarantees. The licensing pages explain both direct and delegated routes; individual institution pages should not be read without that context.

- **Y1:** [Licensing & Registration](https://docs.yapily.com/concepts/licensing-and-registration).
- **Y2:** [Registration introduction, including delegated registration and testing](https://docs.yapily.com/getting-started/integration-setup/registration).
- **Y3:** [Intesa Sanpaolo configuration](https://docs.yapily.com/institution-configurations/italy/Intesa-Sanpaolo).
- **Y4:** [UniCredit configuration](https://docs.yapily.com/institution-configurations/italy/Unicredit).
- **Y5:** [Banco BPM configuration](https://docs.yapily.com/institution-configurations/italy/Banco-BPM).
- **Y6:** [CBI Globe BPER](https://docs.yapily.com/institution-configurations/italy/CBI-Globe-BPER).
- **Y7:** [CBI Globe Crédit Agricole](https://docs.yapily.com/institution-configurations/italy/CBI-Globe-Credit-Agricole).
- **Y8:** [MPS configuration](https://docs.yapily.com/institution-configurations/italy/Banca-Monte-dei-Paschi-Di-SIENA).
- **Y9:** [BNL configuration](https://docs.yapily.com/institution-configurations/italy/Banca-BNL).
- **Y10:** [Fineco configuration](https://docs.yapily.com/institution-configurations/italy/Fineco).
- **Y11:** [Cedacri and Banca Mediolanum](https://docs.yapily.com/institution-configurations/italy/CEDACRI-and-Banca-Mediolanum).
- **Y12:** [Poste Italiane configuration](https://docs.yapily.com/institution-configurations/italy/Poste-Italiane).
- **Y13:** [N26 current integration and decoupled AIS](https://docs.yapily.com/institution-configurations/germany/N26).
- **Y14:** [N26 Token IO deprecation notice](https://docs.yapily.com/institution-configurations/germany/N26-Token-IO).
- **Y15:** [Revolut, including EU accounts](https://docs.yapily.com/institution-configurations/uk/Revolut).
- **Y16:** [Credito Emiliano configuration](https://docs.yapily.com/institution-configurations/italy/Credito-Emiliano).
- **Y17:** [CBI Globe BCC, specific-bank institution IDs](https://docs.yapily.com/institution-configurations/italy/CBI-Globe-BCC).
- **Y18:** [CBI Globe Allitude, specific-bank institution IDs](https://docs.yapily.com/institution-configurations/italy/CBI-Globe-Allitude).
- **Y19:** [Get Institutions: application-scoped response and metadata](https://docs.yapily.com/api-reference/institutions/get-institutions).
- **Y20:** [Account/transaction-data tutorial, capability filtering](https://docs.yapily.com/data/tutorial-account-and-trans-data).
- **Y21:** [Documentation index, institution paths](https://docs.yapily.com/llms.txt).
- **Y22:** [AMEX configuration and explicit country scope](https://docs.yapily.com/institution-configurations/uk/AMEX) (verified by the parallel wallet/card research).

**Enable Banking quality:** first-party API operator's operational documentation and dated release notes, with explicit unsupported-card and registration limitations. These provide useful per-product evidence, but do not independently prove present connector uptime or contractual access for Lilleri. The public country-filtered integrations page did not expose its full dynamic list in extraction; no list was reconstructed from guessed IDs.

- **E1:** [Open Banking Specifics in Italy](https://enablebanking.com/docs/markets/it).
- **E2:** [March 2026 changelog, published 2026-04-08](https://enablebanking.com/blog/2026/04/08/enable-banking-changelogmarch-2026).
- **E3:** [April 2026 changelog, published 2026-05-14](https://enablebanking.com/blog/2026/05/14/enable-banking-changelog-april-2026).
- **E4:** [Whitelisting own accounts for restricted production](https://enablebanking.com/docs/api/linked-accounts/).
- **E5:** [Control Panel: application activation and requirements](https://enablebanking.com/docs/api/control-panel/).
- **E6:** [Revolut institution page, personal and business connectors](https://enablebanking.com/open-banking-apis/LT304580906).
- **E7:** [API reference, ASPSP discovery and application environments](https://enablebanking.com/docs/api/reference) (focused excerpts used for the discovery filters and application environment semantics).

**Bank website quality:** first-party consumer landing pages verified the official destination and visible brand/product identity only. Their sales copy was not used as API coverage evidence. No credential, transaction, IBAN or private financial information was supplied or collected during this research.

**Amex/Satispay quality:** first-party consumer help and provider/merchant developer references, verified by the parallel wallet/card research. Consumer PDF statements/receipts are useful route evidence but do not establish a machine-readable schema. Merchant and business material must retain its account-type scope.

- **A1:** [Amex Italy: accessing statements in the app](https://www.americanexpress.com/it/servizio-clienti/faq.come-posso-accedere-ai-miei-estratti-conto-nell-app-amex.html).
- **A2:** [Amex Italy Amazon Business material](https://www.americanexpress.com/it-it/business/amazon-business/).
- **S1:** [Satispay official Open Banking portal](https://openbanking.satispay.com/); its [documentation index](https://openbanking.satispay.com/llms.txt) did not establish a consumer AIS contract in the retrieved material.
- **S2:** [Satispay merchant API: get list of payments](https://developers.satispay.com/reference/get-list-of-payments).
- **S3:** [Satispay consumer PDF payment receipt explanation](https://www.satispay.com/it-it/blog/welfare-benefits/valore-legale-ricevuta-pagamento-satispay/).
