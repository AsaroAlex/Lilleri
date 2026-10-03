# Zero-investment launch validation

Checked on 2026-10-04 (Europe/Rome), against the published synthetic application
based on `aa3c527933b87d5e364d5677448a2f4aa7310e70`.

- Frozen-lockfile offline installation used the existing dependency store. No
  dependency or lockfile change was needed.
- All 15 bootstrap/economics regressions pass. They cover fee/VAT arithmetic,
  recognised annual revenue versus available cash, contractual cash coverage,
  unresolved costs, disabled activation, inherited credential removal, provider
  and browser-origin guards, CLI rejection and supported cent precision.
- API, client and Next production builds pass; `/piani` is prerendered.
- `check:zero` passes with prepared builds and free ports. Running it while the
  preview is active rejects the occupied port and leaves the original API healthy.
- `dev:zero` builds and starts a separate PGlite synthetic archive, API on
  `127.0.0.1:3191` and Expo web on `localhost:8181`.
- Seven browser checks pass: navigation to plans at 320/700/1280 px without
  horizontal overflow, actual Expo overview loading (five accounts, 35 synthetic
  transactions), the alternative loopback CORS origin, public-origin rejection
  and no JavaScript errors. The Expo localhost server was reached through
  `localhost`; the alternative IPv4 origin was checked directly against the API.

The origin regression tests also exercise financial reads and preflight from both
explicit preview origins, with public and unlisted local origins rejected. CI
includes the bootstrap/economics suite alongside the existing checks.

This validates a local synthetic launch workflow and a planning calculator. It
does not establish commercial deployment, production readiness, real-bank access,
paid conversion or profitability. Concurrent unfinished financial features are
outside this delivery. Existing dependency findings remain tracked in STATUS.
