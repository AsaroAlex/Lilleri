# Italian bank, card and wallet selection

Date: 2026-10-05, Europe/Rome. The user requested the major Italian banks,
American Express and Satispay and already authorized tested Railway publication.

## Delivered behavior

Home opens a compact, searchable selector containing 18 services: 15 banks,
Postepay and American Express cards, and Satispay. Banks include Intesa Sanpaolo,
UniCredit, Banco BPM, BPER, Crédit Agricole Italia, MPS, BNL, Fineco, Mediolanum,
ING, BancoPosta, Credem, Widiba, N26 and Revolut. BancoPosta and Postepay remain
separate. Aliases, spacing, punctuation and accents are searchable. Selection opens
a focused detail panel on phones and a sidebar on wider screens. Official links
open in another tab. The duplicated heading/introduction was removed from the
empty preview to give the bank list more space.

`GET /v1/connection-directory` is public, read-only metadata. It does not enter
financial owner scope, accept a profile selector or create a bank connection.
Host/origin and no-store protections remain. Brand IDs are independent of provider
institution IDs. A future trusted capability owner must supply exact institution
bindings, live per-account-kind evidence, protected access and an admitted consent
route before availability can be reported. The current runtime supplies no such
live capability and all 18 automatic routes remain `configuration_required`.

The server-only `YapilyLiveInstitutionDiscovery` reads the specific authorized
application's official `GET /institutions` catalogue. It admits only declared LIVE
institutions with IT coverage, preserves exact IDs and separates declared feature
codes from availability. Unknown account kinds stay unknown. Bounded complete
responses, fixed HTTPS origin, private credentials, errors, cancellation and
deadlines are tested. It is a library adapter, not a registered production bank
provider, a consent flow or a claim of live application entitlement.

## Amex and Satispay

The personal Amex Italy PDF statement guide and Satispay personal PDF receipt
guide are linked. Personal CSV/XLSX exports are unverified, so neither service
advertises a working file import. Lilleri currently imports CSV/XLSX, not PDF.
Amex's published Yapily European route does not establish Italian coverage.
Satispay has an official XS2A portal, distinct from its shop-scoped Business API;
consumer AIS onboarding and actual application coverage remain unverified.

Sources and institution-specific caveats are recorded in
[Italian coverage](../research/italian-bank-connections-20261005.md) and
[Amex/Satispay](../research/amex-satispay-20261005.md).

## Validation

The repository check passed 23/23 tasks: API 586 passed and 3 skipped across 47
files on PGlite; provider 337 tests; mobile 48 tests. The three new API tests also
passed on an isolated actual PostgreSQL database. No migrations were added or
edited. Final copy changes passed mobile tests and copy checks; the final heading
change passed mobile typecheck and browser acceptance.

Read-only Chromium acceptance checks the actual empty preview: all issuer names,
alias/accent search, empty results, bank/card/wallet filters, detail/back focus,
official HTTPS links, 320/390/599/768/960/1440px layouts, light/dark themes and
reload preservation. Additional checks cover a failed directory request followed
by a successful explicit retry and English/dark display. The English locale is a
GET response fixture, not a saved setting. No financial browser writes occur.

Reproducible helper: `tools/bank-connections-ui-smoke.cjs`. Local proof is in
`/workspace/.lilleri-validation/bank-directory-{check,ui,extra-ui,postgres}.log`
and corresponding browser JSON reports. The preview uses a new empty archive;
existing archives, key vaults and recovery paths are preserved.

## Activation remaining

Railway still runs the empty synthetic preview. Production protected identity,
the chosen licensed bank provider/application entitlement, durable live consent
and callback ownership, renewal/revocation/sync admission, and protected runtime
storage must be completed before real balances or transactions can be connected.
The question asking whether a provider account already exists remains unanswered.
Adding provider credentials alone does not activate this release. Amex Italy and
Satispay personal coverage must be verified for the actual service and account.

No Railway variable, region, volume mount, database/recovery path, key namespace
or replica setting is changed by this release. The retired 35 transactions,
5 accounts and 1 connection remain owned in the existing archive.
