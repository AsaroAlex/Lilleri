# Generic locale-aware CSV mapping

`packages/financial-providers/src/csv-mapper.ts` provides the pure parser and preview for **E05.1**. It supports comma, semicolon and tab separators; an explicit Italian or British number convention; ISO dates, `dd/MM/yyyy`, and full Italian month names. It contains no bank templates, automatic delimiter/date/currency inference, network calls, writes, formula execution or money rounding. Real institution support must come from separately verified source fixtures.

The selected account identity is supplied by the trusted caller, not read from the CSV. HTTP callers must first authorise the owned account and keep the actual import transaction atomic. A saved mapping is versioned with `format: lilleri.csv-mapping.v1`; `validateCsvMapping` revalidates it, and `csvMappingDigest` produces a deterministic SHA-256 digest independent of object key order.

## Explicit mapping

```json
{
  "format": "lilleri.csv-mapping.v1",
  "delimiter": ";",
  "numberLocale": "it-IT",
  "dateFormat": "dd/MM/yyyy",
  "columns": {
    "externalId": "ID",
    "bookedOn": "Data contabile",
    "valueOn": "Data valuta",
    "amount": "Importo",
    "currency": "Valuta",
    "description": "Descrizione",
    "merchant": "Esercente",
    "reference": "Riferimento"
  }
}
```

Column names are trimmed and NFC-normalised, then matched exactly and case-sensitively. Blank names, duplicate normalised headers, reused mapping columns and missing selected columns fail validation. `inspectCsvLayout(csv, delimiter)` lists validated headers and row count before the user has configured a mapping; it returns no financial cell contents. Delimiter selection remains explicit.

Choose exactly one amount layout: `amount`, or both `debit` and `credit`. Separate debit/credit columns contain unsigned magnitudes; a debit becomes negative and a credit positive. An inactive side may be blank or zero. Two nonzero sides, two provided zero sides, both missing sides or a sign inside a side column are rejected. A single amount column may carry `+` or `-`.

Choose exactly one currency source: `columns.currency`, or `defaultCurrency`. Currency codes are canonical uppercase ISO codes supported by Lilleri's exponent table; no symbol/country/default inference fills an invalid cell. EUR, JPY and KWD use their actual 2-, 0- and 3-digit exponents. Amounts are canonical decimal strings and convert to exact `bigint` minor units. The final signed amount must fit PostgreSQL `bigint` (`−2^63` to `2^63−1`); a debit magnitude of `2^63` is valid when its signed result is `−2^63`.

`it-IT` declares comma decimals and optional correctly grouped dot thousands: `-1.234,56` becomes `-1234.56`, while `1.234` means `1234.00` EUR. `en-GB` declares dot decimals and optional correctly grouped comma thousands: `-1,234.50` becomes `-1234.50`. The parser refuses mixed grouping, exponent notation, currency symbols, parentheses, undeclared space grouping or a nonzero fractional remainder beyond the currency exponent. Extra fractional zeros may be removed exactly, as in the existing money normaliser.

`dateFormat` is required: `dd/MM/yyyy`, `yyyy-MM-dd` or `long-it`. Long Italian dates such as `2 ottobre 2026` require the Italian convention and use the full month name. Calendar validation rejects invalid leap days and year zero. An optional `valueDateFormat` can differ from the booking format only when a value-date column is mapped. Neither date is converted through a timezone or JavaScript locale guess.

The optional status column accepts canonical `pending`, `booked` and `reversed`; alternatively `statusValues` explicitly maps exact trimmed source labels to those values. Unknown labels fail the whole preview. Without a status column, the statement mapping declares booked records. No status comes from the transaction description.

## Preview, provenance and identity

`previewMappedCsv(csv, accountId, mapping)` returns file/mapping digests, headers, physical record starting lines, records, safe issue codes, warnings and duplicate candidates. Any row error returns **zero records**; a caller cannot accidentally import the valid subset. An oversized file returns a null file digest instead of hashing arbitrarily large input.

Each accepted row contains a canonical `ProviderTransaction` suitable for the existing `normalizeTransaction` function. Its provenance retains the original mapped cells, raw booking/value dates, separate canonical value date, identity method and content fingerprint. The financial domain currently has no value-date field: the `value_date_provenance` warning requires the importer to retain that provenance with the immutable source observation. The value date is never substituted for the booking or authorisation date. An unmapped column is not a retained original file; raw file storage and its 30-day lifecycle belong to the caller's import storage policy.

When an external ID column is mapped, every row must contain a nonblank ID; repeated IDs are rejected atomically. Identical purchases with two different external IDs stay separate. Canonical IDs use `csv:<external-id>`, consistent with the existing strict CSV importer.

When no external ID column is mapped, IDs use `csvgen:<file-digest>:<content-fingerprint>:<occurrence>`. The account is part of the content fingerprint. Re-importing the same bytes yields stable IDs; another file cannot silently reuse a generated identity merely because a purchase looks identical. Identical content rows within a file receive separate ordinals and remain separate records. Such rows are explicit review candidates and block default import. `parseMappedCsv` accepts them only when the caller supplies `acknowledgeGeneratedDuplicates: true` after showing the preview and binding that acknowledgement to the file and mapping digests.

The mapper never merges or deletes candidate duplicates. Matching against previously imported or synced ledger rows remains a separate, account-scoped reconciliation step. A generated identity warning is not evidence that matching purchases from two different files are the same financial event.

Spreadsheet formula-looking text (`=`, `+`, `-`, `@`, including leading whitespace) stays literal and receives a warning; it is never evaluated. A formula in a numeric field is invalid. The existing outbound CSV exporter still neutralises formula-looking text when producing spreadsheet files.

## Limits and evidence

Files are bounded to **256 KiB of UTF-8 bytes**, **1,000 data rows**, and **64 columns**. RFC quoted delimiters, doubled quotes, CR/LF/CRLF and multiline text are supported. UTF-8 BOM is accepted only at the start of the file. NUL, disallowed control characters, unpaired UTF-16 surrogates, interior BOM, malformed quotes, blank/colliding headers and inconsistent field counts fail before ingestion. Blank physical lines are ignored; an explicitly quoted empty record remains a record and is validated. Mapped fields have explicit length limits so trimmed whitespace cannot create an oversized retained row payload.

On 2026-10-03, **38 mapper scenarios** passed, including actual normaliser integration, exact signed-64 boundaries and currency exponents, Italian/British grouping, two date formats, real leap-year rules, debit/credit conflict cases, RFC quotes and physical line reporting, generated identity/review behaviour, literal formulas, byte/row/column bounds and atomic failure. The complete financial-provider package suite passed **85 tests**. Type checking and Biome checks passed for the new parser/tests.

Run:

```sh
. /workspace/.lilleri-toolchain/env.sh
pnpm --filter @lilleri/financial-providers typecheck
pnpm --filter @lilleri/financial-providers test
pnpm --filter @lilleri/financial-providers build
```

## Local API and reusable mappings

The local API registers `GET/POST /v1/import-mappings` and `PATCH /v1/import-mappings/:id`. A mapping belongs to one profile and account. Updates require its current `revision`; each successful change increments that revision and appends an immutable before/after audit event. Archiving hides a mapping from new imports while keeping its history. Migration `0021_saved_csv_mappings.sql` adds composite ownership foreign keys, household triggers, forced row-level security and append-only mapping/provenance history. Profile erasure removes all three tables' owned rows through cascading foreign keys.

`POST /v1/imports/mapped/layout` accepts `{csv, delimiter}`. `POST /v1/imports/mapped/preview` accepts `{accountId, csv, mapping}` or `{accountId, csv, mappingId}`. The account ID is the owned internal account ID returned by the overview. Preview performs no writes and returns safe row/column issue codes. Its `previewRevision` binds the file and mapping digests, saved mapping revision, account snapshot, manual balance revision and selected account's canonical ledger revisions/content hashes. The profile read lock makes these reads consistent with ordinary profile mutations.

`POST /v1/imports/mapped/commit` accepts the same source plus `previewRevision`, a new `requestId`, and the boolean `acknowledgeGeneratedDuplicates`. Commit locks the profile, rechecks the preview and rejects changed state with HTTP 409 `import_preview_stale`. Generated duplicate candidates require an explicit acknowledgement; HTTP 422 `import_duplicate_review_required` writes nothing. A stale response requires another user-reviewed preview. A request ID reused with different source, preview or acknowledgement fails with `idempotency_key_reused`; repeating an accepted request returns its original report even if the saved mapping was subsequently archived.

The commit feeds `ProviderTransaction` records directly to the atomic importer. Generated identities longer than the legacy canonical CSV parser's identifier limit are preserved. Ledger rows, exact manual balance changes, immutable balance audit, source observations, import receipt and mapped provenance commit together. A provenance persistence failure rolls back all of them. Existing strict canonical CSV imports continue to use their original parser and endpoint.

With the local profile encryption port configured, mapping names/definitions, mapping audit snapshots, transaction text and original mapped observation fields are encrypted under the profile key. Each new observation retains original mapped cells and date/identity provenance for the existing **30-day** raw-payload window. Unmapped cells and the complete original file are not retained. The separate immutable `mapped_import_provenance` table preserves the canonical value date and file/mapping hashes after raw-payload expiry. Ownership export includes decrypted reusable mappings, their history and this provenance through `exportMappedImportAudit`; it never exposes wrapping keys or internal household identifiers.

`MappedImportPanel` exposes explicit header selectors, locale/date and amount/debit-credit choices, owned account selection, saved mappings, row errors, preview and duplicate review. Raw file text remains volatile. Its required `resetKey` follows the current profile/authentication epoch, clears imported file contents and ignores stale in-flight responses. Edits invalidate the preview and acknowledgement; uncertain commit responses retain the same request ID so a deliberate retry remains idempotent.

CSV content remains bounded to 256 KiB; mapped routes separately allow at most 600,000 JSON body bytes so escaped tabs/newlines do not incorrectly fail a valid CSV. Row errors never include original financial cell contents. These limits apply to both inline and saved mappings.

Run the mapped integration suite with:

```sh
. /workspace/.lilleri-toolchain/env.sh
pnpm --filter @lilleri/api exec vitest run test/mapped-import.test.ts
# Set PG_TEST_DATABASE_URL to a dedicated synthetic PostgreSQL database for the same suite.
pnpm --filter @lilleri/api typecheck
pnpm --filter @lilleri/api build
```

On 2026-10-03, the **15 mapped API integration scenarios passed on both PGlite and PostgreSQL 16** with all 21 migrations. They include real scoped HTTP requests, encrypted original fields, exact balance changes, generated/external identity compatibility, duplicate review, concurrent/stale commits, mapping revisions/history/RLS, receipt retry after archive, value-date survival beyond raw expiry, erasure, injected persistence failure and JSON escaping overhead. API type checking and build passed.

Cross-source candidate decisions, verified per-bank fixtures, original file retention and native share-sheet acceptance remain separate integration boundaries. XLSX is not parsed by this module: adding it requires a reviewed maintained parser and ZIP/XML decompression/relationship/formula/resource limits, rather than a custom permissive XML loader.
