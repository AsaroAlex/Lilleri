# Product interface and shared access release — 2026-10-05

The requested product-language cleanup removes preview/demo badges, repeated
introductory and footer notices, and the obsolete mock-source management inside
Privacy. Italian and English workflows say Review/Check before imports and rule
activation; inactive rules remain inactive until explicitly activated. Web metadata
and download filenames use Lilleri without demo branding. Source provenance,
internal API modes, finance semantics and archived fixture ownership are unchanged.

Public shared financial profiles are read-only after fixture retirement. The server
checks every mutating method before JSON parsing, including deletion, profile settings,
consents and audited archive export. Existing bank-writer 409 responses remain.
The durable retirement record prevents changing the launch flag from bypassing this
restriction. Authenticated owners retain export, edits and reauthenticated erasure.

Public Settings offers source availability, device display preferences and privacy
information. Language and time zone apply immediately and store only validated display
fields in browser storage; another device and the server profile stay unchanged.
Missing fixture-mode metadata also fails closed. Authenticated empty profiles have
manual-account shortcuts in Home and Transactions. Bank routes still report their
actual availability; protected hosted identity and live bank activation are unfinished.

Validation: repository check 23/23; API 592 passed, 3 skipped in 48 files on PGlite;
mobile 62; provider 337. Shared guard/retirement focused checks passed 10/10 on actual
PostgreSQL. Read-only browser acceptance checks both languages and themes at
320/390/768/1440px, preference isolation/reload, unavailable-data retry and public
privacy controls, including missing fixture metadata: 8 groups and 134 surfaces.
Separate bank acceptance covers 18 services at 320–1440px.
Browser helpers abort any attempted API write. Older writing helpers have updated
selectors and syntax checks but were not rerun on the shared empty runtime.

Published commit `c837feb4ddc46231931866aee17c581a1db5c140`, Railway deployment
`dad4c7dc-1254-479b-88be-082606471cc5` **SUCCESS**, verified at 09:14 UTC / 11:14
Europe/Rome. The exact final bundle
`/_expo/static/js/web/index-719eb38f70b1f9c87fc34a68c430054e.js` and public
health/directory/overview/export returned HTTP 200. Active finance remains empty;
all 5 owned accounts, 35 transactions, one connection and the full retirement audit
compare identical before and after publication. No financial mutation was sent to
the public service. The owned empty local runtime was stopped with its archive retained.

Inspect `product-release-20261005.json` for bounded release evidence. No migrations,
Railway variables, volume paths or provider resources changed. Personal access and
live bank activation remain pending; UI cleanup does not activate either capability.
