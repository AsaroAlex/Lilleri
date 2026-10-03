# Local Italian and British English presentation

Status: implemented locally on 2026-10-03 for synthetic data and local identity. English UI availability does not establish UK bank coverage, approved notices or market launch. Native/device validation and editorial approval are separate evidence.

## Catalogue and display boundary

The mobile [catalogue](../../apps/mobile/src/i18n/catalogue.ts) pairs explicit `it-IT` master and `en-GB` messages. Feature namespaces merge into one typed key union; screens use `useI18n()` with captured locale/timezone. [ADR-0018](../adr/0018-internationalization.md) and the [tone guide](../brand/tone-of-voice.md) govern wording.

`intl-messageformat` is pinned to **12.1.2**, with lockfile integrity. The maintained library handles ICU plurals, selections, dates and times; there is no handwritten ICU parser. Tests parse every message, format both languages, check placeholder parity and enforce the explicit copy vocabulary/exclamation-mark lint. Complete messages carry named arguments. Counts are finite safe numbers; amounts are preformatted exact Money strings.

Descriptions, account names, custom merchant/category labels and imported content remain original data. Public problem codes map to explicit translations; unknown exceptions yield a generic failure. Parent auth handlers receive original errors first. Stored UI messages use keys and bounded codes, allowing later rendering in either language without retaining exception detail.

`tools/lint-ui-copy.mjs` checks 13 maintained UI consumers using the JSX AST: inline text/control/accessibility labels, concatenated template labels, raw errors, single-language explanations and fixed display locales. Its regression fixtures exercise real source structures. Original CSV samples and a machine calendar builder are data. Local validation-error messages are allowed only where all constructions use catalogue calls and a dominating `instanceof` branch distinguishes them from API errors. The guard does not certify every possible future rendering technique or editorial/legal quality.

## Exact money, dates and categories

These hand-reviewed money fixtures are enforced in the money/i18n tests. Spaces shown below are non-breaking. Formatter capability beyond IT/EN does not imply a translated UI.

| Locale | EUR 1234.56 | Convention |
|---|---|---|
| `it-IT` | `1.234,56 €` | Decimal comma, grouped dots, NBSP before symbol |
| `en-GB` | `€1,234.56` | Decimal point, grouped commas |
| `en-IE` | `€1,234.56` | Formatter capability only |
| `de-DE` | `1.234,56 €` | Formatter capability only |
| `fr-FR` | `1 234,56 €` | Explicit formatter policy uses NBSP for grouping/symbol spacing |

Existing financial columns can explicitly choose `symbolPosition: 'before'`; grouping/decimals still follow locale. Unicode minus and tabular figures remain. Accessible amounts name sign/currency, with EUR/GBP/USD/CHF/JPY names and an ISO-code fallback. Tests retain all digits above `Number.MAX_SAFE_INTEGER`, negative unit values, JPY zero decimals and KWD three decimals. No currency conversion is implied.

`calendarDate(YYYY-MM-DD)` validates an actual calendar day and uses a fixed UTC calendar representation; profile timezone cannot shift booking/authorisation/value dates. `calendarMonth` follows the same rule. Instants and ICU date/time placeholders use the captured IANA timezone. Missing dates remain unavailable. DST fixtures cover Rome/New York; invalid leap days and zones are refused.

Canonical leaves and non-selectable parents use actual `canonical-taxonomy-local-v1` identifiers and bilingual labels. Legacy `ledger-local-v1` retains its original semantics, including bars/restaurants for `food`. Unknown versions/IDs yield an unclassified label. Exported label snapshots and user-owned names are not rewritten.

## Persisted language and identity

`PATCH /v1/settings` supports exactly `it-IT`/`en-GB`, complete existing name/timezone values and expected revision. Frozen migration `0026_profile_locales.sql` broadens the constraint without rewriting history. A mutation captures one instant, locks the profile, increments revision and appends immutable before/after settings atomically. Stale edits return `409 settings_changed`; the UI refetches and requires a new gesture. Name/zone edits retain the chosen locale.

LanguagePicker changes a draft; saving adopts authoritative settings. Reload reads persistence. Settings reads/writes/refreshes/callbacks stay fenced to their originating request/session epoch. Locale changes do not restart auth polling, reuse secret input, replay sensitive operations or change the principal. App adopts preferences only after the effective profile is known.

JSON and ZIP retain exact financial facts and all Italian/English settings history. Notification titles are translated by known type **and text version**, with a generic review label for unknown versions. Historical audit text stays original. Synthetic privacy disclosure remains verbatim, explicitly labelled Italian/versioned in the English screen; translation confers no legal clearance or unavailable external-AI feature.

## English term glossary

Implementation glossary based on the brand master. External brand/native-editor sign-off is not recorded; this local team UI is not approved international marketing.

| Italian | British English | Meaning |
|---|---|---|
| Movimento / Movimenti | Transaction / Transactions | Original financial record |
| Contabilizzato / In attesa | Booked / Pending | Source booking versus authorisation |
| Conto / Collegamento | Account / Connection | Financial account versus data access |
| Trasferimento tra tuoi conti | Transfer between your accounts | Own-account legs, not new spending |
| Addebito carta / Rimborso | Card settlement / Refund | Settlement versus linked expense credit |
| Da rivedere / Da controllare | Review / Needs review | Attention, not numerical confidence |
| Categoria / Regola / Correzione | Category / Rule / Correction | Taxonomy, matching choice, explicit precedence |
| Esercente | Merchant | Recognised payee; source remains available |
| Riconciliazione | Reconciliation | Evidence-supported record relationship |
| Duplicato / Unisci / Dividi | Duplicate / Merge / Split | Reversible resolution, preserved exact total |
| Ricorrente / Abbonamento | Recurring payment / Subscription | Observed pattern versus confirmed kind |
| Stipendio / Rata | Salary / Instalment | Confirmed kind, not assumed contract |
| Stima / Margine / Spesa netta | Estimate / Buffer / Net spending | Uncertainty, selected reserve, expenses minus linked refunds |
| Aggiorna / Ultimo aggiornamento | Refresh / Last updated | Actual completed acquisition time |
| Rinnova / Ricollega | Renew / Reconnect | Provider-supported next action |
| Consenso all’accesso | Access consent | Provider access, distinct from local preferences |
| Permessi e privacy | Permissions and privacy | Separate purpose choices/metadata |
| Avvisi essenziali / facoltativi | Essential / optional notices | Security/rights versus service choice |
| Quieto / Riservato | Quiet / Private | Excluded from insights; retained in ledger/export |
| I tuoi dati / Esporta / Elimina | Your data / Export / Delete | Actual ownership consequences |
| Perché? / Annulla | Why? / Undo | Applied evidence/reversibility |
| Gratis / Beta gratuita | Free / Free beta | Actual capability policy, no purchase claim |

## Verification and remaining evidence

The mobile test command includes the eight ICU/i18n groups. Three domain settings groups and ten API groups cover supported/invalid locales, one captured audit instant, competing revisions, original financial invariance and compatible JSON/ZIP history. API groups run on fresh PGlite and dedicated PostgreSQL 16; the real-PG log is outside the repository at `.lilleri-validation/i18n-settings-postgres.log`. Coordinated browser evidence is recorded separately, rather than inferred from typechecks.

Spanish/French/German UI, per-market trust notices, native screen-reader pronunciation, device locale discovery and external editorial/legal review remain separate work.
