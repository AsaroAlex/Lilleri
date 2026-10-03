# Local portable ZIP export

Status: implemented local slice of E18.2, 2026-10-03. The existing `GET /v1/export` JSON response remains available. `GET /v1/export/archive` downloads a ZIP without creating a public or expiring link, an external delivery job, or a new storage copy on the server.

## Boundary and consistency

The archive route uses the same `DemoService.export()` result as the JSON route. Financial records are read inside that existing repeatable-read transaction. The route validates the response through its existing export DTO before generating files; local identity metadata is appended through the already curated identity exporter and is read separately. This does not claim an atomic snapshot spanning identity and financial tables.

The session-derived profile and recent reauthentication requirements match JSON export. Request parameters cannot select a profile. The builder additionally checks record profile IDs, account/connection/transaction references, account and transaction currencies, and revocation-job connection ownership. Foreign records or invalid snapshot data fail the whole archive. Expired raw payloads are already omitted by the existing exporter; the builder also refuses snapshots that contain raw payloads at or after their expiry.

Password hashes, tokens, private keys, authenticator secrets, recovery codes, cookies and similar credential fields are not archive content. The root DTO strips unexpected properties; the builder fails if a recognized credential key nevertheless appears in the snapshot. Identity account information, acceptance records and curated session metadata remain personal export data. Session IDs and expiry metadata do not include authentication tokens.

## Files and format

The ZIP has eleven fixed paths and no filename derived from user-entered account names:

| File | Contents |
|---|---|
| `data.json` | Complete schema-validated export snapshot, including current normalized records, provenance and nonexpired raw payloads. |
| `transactions.csv` | All canonical transaction fields plus current category/source/review status. |
| `links.csv` | Current inferred or decided reconciliation matches, evidence, source revision token and any stored decision revision/time. |
| `accounts.json` | Account records with their exact balances. |
| `rules.json` | Current rule definitions, state and revisions. |
| `categories.json` | Existing canonical category definitions and the prototype’s visible category dictionary; `formatVersion=1`. |
| `consents.json` | Stored grant and revocation records. |
| `events.jsonl` | Available feedback, decisions, rule/manual/settings audit, sync records, consent changes, source-observation metadata and identity acceptances. |
| `schema.json` | JSON Schema 2020-12 describing `data.json` and its nested structures. |
| `manifest.json` | Archive/export versions, profile, timezone, currencies, counts, CSV columns and per-file byte counts/SHA-256 digests. |
| `README.txt` | Italian instructions, money encoding and safe spreadsheet import guidance. |

`events.jsonl` serializes records actually available in the snapshot. Immutable rule/manual/settings events retain their provenance, while feedback and reconciliation decisions represent the latest stored record; no deleted or superseded earlier decision is fabricated. Source-observation events contain metadata only, avoiding a duplicate raw payload copy. Full current source payloads, when still retained, belong in `data.json`.

All money is an exact decimal string of integer minor units. No money passes through a JavaScript number, rounding step or currency conversion. JPY zero-decimal and KWD three-decimal amounts use the same explicit encoding. The manifest lists currencies separately. The schema is structural; cross-record ownership and source currency constraints are enforced by the builder and existing domain/API boundaries.

CSV uses UTF-8, commas, CRLF record endings and standard doubled-quote escaping. Text beginning with `=`, `+`, `-` or `@`, including after leading whitespace or invisible format characters, receives an apostrophe prefix. Leading tab/CR/LF text receives the same prefix. Validated numeric minor-unit columns contain only canonical signed integer strings and retain their exact original digits. Since CSV cannot declare spreadsheet cell types, users should import `amount_minor` as text to avoid automatic large-number rounding. The README and manifest document this. Original text in `data.json` is unchanged; CSV is a safe tabular projection rather than a way to recover original text by stripping arbitrary apostrophes.

The manifest lists digests for the other ten files, excluding itself to avoid a self-hash. These are consistency checks, not digital signatures. JSON Schema identifies the current format with `urn:lilleri:data-export:schema:v1` and rejects undocumented snapshot fields. Archive filenames are `lilleri-export-YYYY-MM-DD.zip`, derived only from the export timestamp.

## Implementation and validation

`apps/api/src/data-export.ts` uses pinned `fflate@0.8.3` asynchronous ZIP generation. Official npm metadata was checked on 2026-10-03: MIT, Node ESM/CommonJS exports, no runtime dependencies. Package integrity and the repository’s dependency audit remain recorded through the lockfile and root validation. The implementation adds no ZIP binary codec.

Generation accepts at most 32 MiB of combined uncompressed file content, including the manifest. Oversized snapshots fail with `422 export_too_large`; invalid or unscoped snapshots fail with `500 invalid_export_snapshot`; no partial archive is returned. No temporary export files are written. Response headers set attachment filename, `application/zip`, `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. OpenAPI documents a binary ZIP response.

The eight `apps/api/test/data-export.test.ts` scenarios pass against PGlite and PostgreSQL: actual route/ZIP/header/file hashes, schema validation without coercing numeric money, exact large money and separate currencies, Unicode/quote/formula behavior, genuine audit and acceptance records, scope/credential defenses, expiry boundaries, size cap/OpenAPI and erasure. Identity integration also exercises the ZIP route’s reauthentication and encoded-path boundary.

Expiring download links, background export jobs, a production retention/delivery service, scale guarantees for arbitrary datasets and full historical event sourcing remain future work. This route provides a local download only and introduces no real bank access.
