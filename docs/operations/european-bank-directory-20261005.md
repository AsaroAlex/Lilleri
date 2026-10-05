# European bank directory release — 2026-10-05

The bank selector adds 44 country-specific consumer services to the existing 18
Italian choices: 62 entries across 16 markets, comprising 59 bank entries, two card
services and one wallet. Countries describe the consumer account market, not the
bank headquarters or currently available provider coverage. Existing Italian IDs,
URLs and statement evidence remain unchanged.

Markets: Italy, France, Germany, Spain, Portugal, Netherlands, Belgium, Austria,
Ireland, United Kingdom, Switzerland, Sweden, Denmark, Norway, Finland and Poland.
New examples include BNP Paribas, Société Générale, Deutsche Bank, BBVA, Santander,
bunq, Monzo and Starling. ING, N26 and Nordea retain distinct country-specific entries.
Concrete consumer bank choices replace ambiguous regional-group directories.
Official consumer URLs and retrieval limitations are documented in
`../research/european-bank-directory-20261005.md`.

Home → Choose your bank starts with Italy. The compact Country selector offers all
16 countries and All countries. Country, type and text search intersect; recovery
from an empty search preserves the chosen country. Cards and details show translated
country labels, and accessible names distinguish entries sharing a brand. Switching
country dismisses the previous detail; the explicit back action restores search
focus. Legacy Italian responses without country fields still work. Unknown explicit
country codes are not relabelled Italy. Public profiles remain read-only.

The API uses the European directory builder. The Italian builder remains an 18-entry
compatibility wrapper. Exact trusted institution bindings must match each entry's
country as well as provider, live consent admission and verified account type.
All current automatic routes still require configuration; statement formats for new
banks remain unverified. No credentials, live callbacks, financial source activation,
SQL migrations or Railway resource/configuration changes are part of this release.

Validation: targeted provider directory 25 tests, API 3 tests on PGlite and actual
PostgreSQL. Browser acceptance passed 9 European groups/56 layouts at 320–1440px,
both languages/themes, all 16 country filters, all 62 choices, same-brand markets,
alias/accent search, combined filters, focus, unavailable-directory retry and reload.
Existing Italian acceptance passed 6 groups and product/privacy/preferences acceptance
passed 8 groups/134 surfaces. No API writes, finance changes or shared preference
changes occurred. Full repository check passed 23/23 tasks: API 592 passed/3 skipped
in 48 files, provider 343 and mobile 66.

Published commit `d377327e67310086833e220543c11c0bb21c3413`, Railway deployment
`804c2af2-1ab5-4a99-9719-ec7d592f3e51` **SUCCESS**, verified at 09:41 UTC / 11:41
Europe/Rome. The exact tested bundle
`/_expo/static/js/web/index-ac1a7308521b77d2d05060977c6ac5c6.js`, health, directory,
overview and ownership export returned HTTP 200. Public directory exposes the expected
62 entries in 16 countries, all configuration required. Active finance remains empty;
all 5 owned accounts, 35 transactions, one connection and the complete immutable
fixture-retirement audit compare identical before and after publication. No financial
validation mutation was sent publicly. The owned local runtime was stopped with its
archive preserved. Bounded proof: `european-bank-directory-release-20261005.json`.
