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
privacy controls, including missing fixture metadata: 8 groups and 134 surfaces. Separate bank acceptance covers 18 services at 320–1440px.
Browser helpers abort any attempted API write. Older writing helpers have updated
selectors and syntax checks but were not rerun on the shared empty runtime.

Publication verification and archive comparison will be recorded in
`product-release-20261005.json` after the functional deployment succeeds. No migrations,
Railway variables, volume paths or provider resources are changed by this release.
