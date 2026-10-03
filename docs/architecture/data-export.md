# Local portable ZIP export

Status: implemented local slice of E18.2, 2026-10-03. The existing `GET /v1/export` JSON response remains available. `GET /v1/export/archive` reads the same portable ZIP without side effects. `POST /v1/export/archive` with `{}` represents an explicit export action and records its in-app completion notice. Neither creates a public or expiring link, an external delivery job, or a new storage copy on the server.

## Boundary and consistency

The archive route uses the same `DemoService.export()` result as the JSON route. Financial records are read inside that existing repeatable-read transaction. The route validates the response through its existing export DTO before generating files; local identity metadata is appended through the already curated identity exporter and is read separately. This does not claim an atomic snapshot spanning identity and financial tables.

The session-derived profile and recent reauthentication requirements match JSON export. Request parameters cannot select a profile. The builder additionally checks record profile IDs, account/connection/transaction references, account and transaction currencies, and revocation-job connection ownership. Foreign records or invalid snapshot data fail the whole archive. Expired raw payloads are already omitted by the existing exporter; the builder also refuses snapshots that contain raw payloads at or after their expiry. PostgreSQL reads use the existing non-owner profile-scoped transaction; `ownership-export.ts` performs its reads sequentially on that same transaction client.

Password hashes, tokens, private keys, authenticator secrets, recovery codes, cookies and similar credential fields are not archive content. The root DTO strips unexpected properties; the builder fails if a recognized credential key nevertheless appears in the snapshot. Identity account information, acceptance records and curated session metadata remain personal export data. Session IDs and expiry metadata do not include authentication tokens.

## Files and format

The ZIP has eleven fixed paths and no filename derived from user-entered account names:

| File | Contents |
|---|---|
| `data.json` | Complete schema-validated export snapshot, including current normalized records, provenance, nonexpired raw payloads and available ownership/audit additions described below. |
| `transactions.csv` | All canonical transaction fields plus current category/source/review status. |
| `links.csv` | Current inferred or decided reconciliation matches, evidence, source revision token and any stored decision revision/time. |
| `accounts.json` | Account records with their exact balances. |
| `rules.json` | Current rule definitions, state and revisions. |
| `categories.json` | Existing canonical category definitions and the prototype’s visible category dictionary; `formatVersion=1`. |
| `consents.json` | Stored grant and revocation records. |
| `events.jsonl` | Available feedback, decisions, rule/manual/settings audit, sync records, consent changes, source-observation metadata, identity acceptances and consent/support/privacy/notification audit records. |
| `schema.json` | JSON Schema 2020-12 describing `data.json` and its nested structures. |
| `manifest.json` | Archive/export versions, profile, timezone, currencies, counts, CSV columns and per-file byte counts/SHA-256 digests. |
| `README.txt` | Italian instructions, money encoding and safe spreadsheet import guidance. |

`events.jsonl` serializes records actually available in the snapshot. Immutable rule/manual/settings events retain their provenance, while feedback and reconciliation decisions represent the latest stored record; no deleted or superseded earlier decision is fabricated. Source-observation events contain metadata only, avoiding a duplicate raw payload copy. Full current source payloads, when still retained, belong in `data.json`.

The version-1 schema accepts these optional additions without making historical version-1 snapshots invalid:

| Property | Portable records and constraints |
|---|---|
| `consentLifecycles`, `consentEvents` | Persisted lifecycle revisions and immutable grant/renewal/pause/resume/revocation/provider events. Provider conditions are named `terms`, preserving consent, SCA, session and token-expiry clocks without a credential field named `authorization`. Export does not call the provider or invent a persisted lifecycle for an untouched legacy connection. |
| `supportAccess` | All owned grants, requests, approvals and action events, including expired or revoked records. Operator identifiers are pseudonyms, not anonymous data; staff email, names and authentication factors are absent. Grant/request/approval/action references must remain inside the exported profile and access windows. |
| `privacy` | Rules-only settings, transaction quiet/private flags, all three local purpose preference records and their immutable change events. Flags reference canonical transactions still present in the ledger; private and quiet records remain portable. Text versions, SHA-256 hashes, local preference provenance and re-prompt deadlines survive export. Preference evidence does not claim an external AI, analytics or native push service is enabled. |
| `notifications` | Preferences, all owned notification states and audit events, plus the complete delivered feed projection. Feed titles derive from the fixed stored text version and contain no dynamic financial text. Export includes the owned history beyond the application's 100-item feed window and preserves mandatory security/data-rights notices independently of optional notification permission. |
| `mappedImports` | All saved CSV mappings, including archived records, decrypted names/definitions, immutable before/after mapping revisions, and each mapped observation's file/mapping digests, row number, identity strategy and normalized `valueOn`. Permanent value-date provenance survives raw payload expiry; original raw columns remain subject to the existing payload retention period. |

The builder rejects duplicate identities or revisions, foreign references, impossible timestamps and missing revisions in these stored histories. Consent events use `consent_lifecycle`; support facts use `support_grant_record`, `support_request_record` and `support_approval_record`, while actual support actions use `support_access`. Privacy actions use `privacy_profile`, `privacy_transaction` and `privacy_permission`; notification actions and preference changes use `notification`. Mapping changes use `csv_mapping`; durable import facts use `mapped_import_provenance`. These types remain distinct from the older consent-grant facts and current reconciliation decisions. Reserved household columns are projected out of every public ownership record.

Historical consent producers captured the event timestamp shortly after updating its lifecycle head. Export preserves both original timestamps: the current head must fall between the previous event and its matching latest event, and event timestamps must follow revision order. Saved mapping snapshots likewise fall between the preceding event and their corresponding append event, preserving the original append latency. Latest terms, provider metadata, consent identity and mapping identities, contents and complete revision chains still have to agree; exporting never repairs or rewrites the immutable journal.

An explicit `POST /v1/export/archive` produces its export completion notification after the financial snapshot has been captured, inside the request's financial transaction. It appears in later snapshots. Its occurrence deduplicates by export time, and notification failure cannot block the data-rights export. GET export routes remain read-only. This does not add an invented audit event to the snapshot being downloaded.

All money is an exact decimal string of integer minor units. No money passes through a JavaScript number, rounding step or currency conversion. JPY zero-decimal and KWD three-decimal amounts use the same explicit encoding. The manifest lists currencies separately. The schema is structural; cross-record ownership and source currency constraints are enforced by the builder and existing domain/API boundaries.

CSV uses UTF-8, commas, CRLF record endings and standard doubled-quote escaping. Text beginning with `=`, `+`, `-` or `@`, including after leading whitespace or invisible format characters, receives an apostrophe prefix. Leading tab/CR/LF text receives the same prefix. Validated numeric minor-unit columns contain only canonical signed integer strings and retain their exact original digits. Since CSV cannot declare spreadsheet cell types, users should import `amount_minor` as text to avoid automatic large-number rounding. The README and manifest document this. Original text in `data.json` is unchanged; CSV is a safe tabular projection rather than a way to recover original text by stripping arbitrary apostrophes.

The manifest lists digests for the other ten files, excluding itself to avoid a self-hash. These are consistency checks, not digital signatures. JSON Schema identifies the current format with `urn:lilleri:data-export:schema:v1` and rejects undocumented snapshot fields. Archive filenames are `lilleri-export-YYYY-MM-DD.zip`, derived only from the export timestamp.

## Implementation and validation

`apps/api/src/data-export.ts` uses pinned `fflate@0.8.3` asynchronous ZIP generation. Official npm metadata was checked on 2026-10-03: MIT, Node ESM/CommonJS exports, no runtime dependencies. Package integrity and the repository’s dependency audit remain recorded through the lockfile and root validation. The implementation adds no ZIP binary codec.

Generation accepts at most 32 MiB of combined uncompressed file content, including the manifest. Oversized snapshots fail with `422 export_too_large`; invalid or unscoped snapshots fail with `500 invalid_export_snapshot`; no partial archive is returned. No temporary export files are written. Response headers set attachment filename, `application/zip`, `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. OpenAPI documents a binary ZIP response.

The targeted `apps/api/test/data-export.test.ts` scenarios cover the actual route/ZIP/header/file hashes, schema validation without coercing numeric money, exact large money and separate currencies, Unicode/quote/formula behavior, genuine audit and acceptance records, scope/credential defenses, expiry boundaries, size cap/OpenAPI and erasure. The ownership fixture creates real consent pause/resume events, a revoked support grant with two-person approval, rules-only and quiet/private changes, explicit grant/deny/revoke preference evidence, and delivered/seen mandatory and optional notifications. Mapping fixtures perform real profile-scoped commits with plaintext and encrypted storage, preserve exact Italian amounts and value dates, and verify provenance after raw expiry. Adversarial snapshots verify that foreign IDs, lost audit revisions, invented titles or future clocks produce no archive. Both database drivers validate the same archive contract. Identity integration also exercises the ZIP route's reauthentication and encoded-path boundary.

Expiring download links, background export jobs, a production retention/delivery service, scale guarantees for arbitrary datasets and full historical event sourcing remain future work. This route provides a local download only and introduces no real bank access.
