# American Express Italy and Satispay connection routes

Evidence reviewed on 2026-10-05 for the requested Italian bank/card/wallet picker. This document separates an institution's published interface from a connection that Lilleri can actually offer. Neither a named catalogue entry nor a link to the provider's website establishes live coverage.

## Delivery decision

| Product | First-party evidence | Lilleri route now | What must be verified before automatic connection |
| --- | --- | --- | --- |
| American Express personal card issued in Italy | Amex Italy documents downloadable PDF statements. Yapily's Amex configuration lists UK and Norway/France/Sweden/Finland; Italy is absent from that published country list. | Include a distinct card entry with coverage pending and official statement-help link. A protected manual card account is a fallback; CSV/XLSX mapping is available only when the owner actually has an appropriate file. Do not offer PDF ingestion. | A provider must confirm the specific Italian issuer, card product and application entitlement, then return an eligible live institution through its authenticated discovery endpoint. Complete live authorization, renewal/revocation and owner-scoped ingestion before enabling Connect. |
| American Express Amazon Business card in Italy | The product page explicitly documents CSV for detailed Amazon.it/Amazon Business transactions and PDF or Excel statements. It explicitly addresses non-consumer cards. | The generic mapped importer can inspect an actual CSV or supported XLSX in a protected account. The documented product-specific export does not establish a personal-card template. | Exact export schema, sign conventions, dates, currencies, statuses and stable transaction IDs require a verified sample/schema. The CSV's Amazon-specific scope must not be presented as the complete card feed. |
| Satispay consumer account | An official Open Banking portal describes PSD2 XS2A and explicitly separates Satispay Business API. An official consumer article documents individual PDF receipts. | Include a distinct wallet entry with coverage pending and official Open Banking/help links. Use a protected manual wallet account when automatic coverage has not been established. Individual PDF receipts cannot be uploaded to the CSV/XLSX importer. | Obtain an official, usable AIS specification/onboarding procedure or verify a licensed aggregator's entitled Satispay institution for Italian consumer accounts. Test balances, transaction coverage, consent lifecycle and revocation. The publicly retrieved index alone does not establish these capabilities. |
| Satispay Business shop | Official merchant help documents transaction CSV/XLS exports; the payments API is explicitly scoped to a shop and the shop KeyID. | A separate merchant-export route may use explicit generic CSV mapping in a protected account. This is not a consumer-wallet connection. | Exact export schema and accounting treatment for gross/net/fees/refunds/payouts; merchant ownership and shop scope. Legacy XLS is not supported by Lilleri's XLSX reader. |

No Amex- or Satispay-specific import preset is added in this research slice: none of the official pages reviewed supplies the exact column schema, amount direction or row identity contract needed to create one safely. The absence of a retrieved schema is a verification gap, not a claim that the provider cannot export one.

## American Express evidence and user route

[Amex Italy: access statements in the app](https://www.americanexpress.com/it/servizio-clienti/faq.come-posso-accedere-ai-miei-estratti-conto-nell-app-amex.html) states:

> “Puoi scaricare i tuoi estratti in formato PDF direttamente dall'App. Dalla sezione ‘Conto Carta’ seleziona la voce ‘Transazioni ed Estratto Conto’, scegli l’estratto conto da visualizzare e clicca su ‘Estratto Conto in PDF’ per effettuare il download.”

This is a confirmed owner-facing download path, not an automated import integration. [EstrattOnline](https://www.americanexpress.com/it/benefici/Paperless.html) also describes PDF and availability of previous statements.

[Yapily: AMEX institution configuration](https://docs.yapily.com/institution-configurations/uk/AMEX) publishes:

| Institution | Identifier | Published countries |
| --- | --- | --- |
| American Express UK | `amex-ob_uk` | United Kingdom |
| American Express Europe | `amex-ob_eu` | Norway, France, Sweden, Finland |
| American Express Sandbox | `amex-ob-sandbox` | United Kingdom, Norway, France, Sweden, Finland |

It requires manual application registration with Amex and active eIDAS certificates for production. It specifies a separate consent for each main card account, no separately consented supplementary card, one active consent per account/client, and fixed account/balance/transaction permissions. Those operational details are evidence for these published countries; they must not be transplanted to Italy. The word “Europe” in an identifier is not a country entitlement.

[American Express Amazon Business Italy](https://www.americanexpress.com/it-it/business/amazon-business/) documents a detailed CSV for transactions on Amazon.it and Amazon Business Italia, plus PDF or Excel statements. Its notes expressly identify the products as issued to non-consumers. Excel is not a guarantee of an OOXML `.xlsx` file meeting Lilleri's supported subset. The page does not document headers, signs or transaction identifiers, so it is insufficient for a verified preset.

[Amex's general Open Banking overview](https://www.americanexpress.com/en-us/company/open-banking/) describes authorized data sharing through an Amex-hosted window and discourages sharing the customer's username/password with a financial service provider. It is a US/general overview; it does not prove Italy coverage. The [developer product page](https://developer.americanexpress.com/products/account-financials-psd2/overview) and [Open Banking page](https://developer.americanexpress.com/open-banking) yielded only a portal shell in the retrieval used here. No Italian supported-country claim can be extracted from that shell.

A further Tink check found no current first-party confirmation of Amex Italy: its [Italy aggregation capability page](https://docs.tink.com/market-capabilities/aggregation?market=IT) yielded a documentation shell, while the [official Italian provider status page](https://tinkitaly.statuspage.io/) lists Italian providers without Amex or Satispay. An omitted name is not proof of universal non-support; authenticated discovery and provider confirmation remain necessary. A historical secondary article or the generic claim that Tink aggregates credit cards cannot establish this application’s current Amex Italy entitlement.

Suggested Italian product copy:

> **American Express** — “Stiamo verificando il collegamento per le carte emesse in Italia. Puoi consultare l’estratto conto nell’App Amex; per l’importazione serve un file CSV o XLSX, se disponibile per la tua carta.”

Avoid a universal “Importa estratto conto Amex” action that leads to a PDF-incompatible upload without explaining the file requirement.

## Satispay evidence and user route

[Satispay Open Banking](https://openbanking.satispay.com/) describes XS2A as allowing customers to use third parties for account information or transactions and explicitly links out to the separate Business API. Its [machine-readable documentation index](https://openbanking.satispay.com/llms.txt), retrieved on the review date, lists only [OBA Performance Metrics](https://openbanking.satispay.com/docs/oba-performance-metrics.md). The retrieved getting-started page repeats the general welcome; the reference getting-started page has a generic placeholder. No authenticated institution entitlement, account/transaction response schema, sandbox onboarding instructions, consent endpoint or certificate requirements were verified from those pages. This is not evidence that such materials do not exist; access or a provider agreement may be needed.

[Satispay consumer receipt article](https://www.satispay.com/it-it/blog/welfare-benefits/valore-legale-ricevuta-pagamento-satispay/) documents an individual transaction receipt with identifier, date/time, payer/payee, amount and status, and says the receipt can be exported as PDF. Its published route is: app → Profilo → search for the transaction → select it → download/share PDF. The article does not provide a bulk personal-wallet CSV/XLSX schema. Its general wording about exporting transaction data must not be used to infer one.

[Satispay Business welcome](https://developers.satispay.com/docs/welcome) explicitly describes accepting Satispay payments for businesses. [Get shop payments](https://developers.satispay.com/reference/get-list-of-payments) states:

> “API to retrieve the list of payments for a specific shop. The payments will be shop scoped based on the KeyID used in the authorisation header.”

This API and shop activation/RSA keys must not be reused as a consumer wallet-history connector. A merchant's refunds/payment authorizations cannot be treated as the user's account-information consent.

[Business Dashboard introduction](https://support.satispay.com/it/articles/introduzione-al-pannello-di-controllo) verifies transaction history with fees as `.csv/.xls` and payouts as `.csv/.xls/PDF`. [Business payout transaction report](https://support.satispay.com/it/articles/come-scaricare-il-report-delle-transazioni-collegate) documents Versamenti → select payout → Richiedi Report → choose `.csv/.xls` → Report for the resulting download. Neither provides a column/sign schema. These instructions apply to Business, not to the consumer app.

Suggested Italian product copy:

> **Satispay** — “Il collegamento del wallet è in verifica. Le integrazioni per negozi sono separate: non collegano lo storico del tuo account personale.”

Do not promise Satispay Invest holdings, savings goals, reward points, a personal IBAN or pending transactions from the general XS2A welcome. Those fields need separate explicit evidence.

## Existing importer constraints

The current path is `apps/mobile/MappedImportPanel.tsx` → `packages/api-client/src/mapped-import.ts` → `apps/api/src/mapped-import.ts`, with `packages/financial-providers/src/csv-mapper.ts` normalization and the bounded XLSX reader described in [the XLSX operations guide](../operations/xlsx-import.md).

- CSV mapping explicitly selects delimiter, Italian/British numeric convention, booking date convention, columns, currency source and optional status vocabulary. There is no guessed bank layout.
- A signed amount column is used as supplied; expense rows must be negative. Alternatively, unsigned debit/credit columns normalize to `credit - debit`. A card statement that lists purchases as positive charges needs a verified direction transformation or explicit debit mapping; selecting that column as signed amount would misclassify spending as income.
- Booking date and value date remain separate. A card transaction date is not silently substituted for booking date. CSV supports `dd/MM/yyyy`, `yyyy-MM-dd` or Italian long dates; an unknown format needs explicit conversion/review.
- The import path supports CSV and a conservative XLSX subset, not PDF or legacy XLS. XLSX dates must be text in the chosen convention; numeric/Excel date cells are currently refused.
- If the file lacks a reliable external transaction ID, generated file identities and duplicate review remain explicit. Merchant gross receipts, fees, refunds and payouts cannot be summed indiscriminately as independent income without accounting review.
- The public empty preview requires protected personal access before real imports. Adding catalogue/help links must preserve its early identity rejection and cannot turn on synthetic reconnect/reseeding.

A future preset requires a provider-issued schema or a deliberately sanitized owner-provided sample, synthetic fixtures covering purchase/refund/payment/fee/foreign-currency cases, exact decimal validation, booking/value-date handling, duplicates/replay and an explicit owner-reviewed preview. It must remain product-specific and not advertise all cards/wallets as supported.

## Source assessment and search scope

This workstream requested 101 search results across 15 focused searches; Exa returned 71 distinct result URLs after URL deduplication. Only the first-party sources above are used to establish support claims. Search results outside scope were reviewed as leads or rejected, including Switzerland/US-specific Amex exports, unrelated payment APIs, directory summaries, retailer accounting articles and personal/company profiles.

| Source family | Quality and limitation |
| --- | --- |
| Amex Italy help and product pages | Issuer-authored instructions; exact country/product scope is stated. Consumer PDF and Amazon Business spreadsheet claims are kept separate. |
| Yapily technical institution configuration | Integrator-authored operational requirements and concrete institution IDs/countries. Does not prove Lilleri's entitlement or broader Italy coverage. |
| Satispay Open Banking portal | First-party XS2A statement; publicly retrieved documentation is incomplete for implementation and not a live compatibility proof. |
| Satispay Business API reference and help | Provider-authored explicit shop scope/export instructions. Merchant-only scope prevents reusing this as consumer aggregation evidence. |
| Satispay consumer receipt article | First-party instructions and PDF receipt details; a broad marketing sentence cannot establish an undocumented CSV layout or AIS schema. |

Third-party integration studios claim a Satispay Berlin Group/OpenAPI route, eIDAS requirements and even investment/loyalty coverage. The publicly retrieved official portal did not substantiate those details. They are not used to invent request paths, authentication flows or supported fields. Third-party PDF converter pages likewise do not establish an official personal-wallet export format or justify sending financial files to another service.
