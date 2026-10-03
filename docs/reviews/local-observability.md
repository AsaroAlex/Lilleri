# Local safe observability — E00.4–E00.5

The local API can collect structured operational counters and sampled traces without copying request bodies, headers, URL/query parameters, financial records, user/profile/household identifiers or raw errors. This is a local engineering baseline. No real DPO review, legal exemption, demonstrated anonymity, external dashboard/alert routing or production telemetry acceptance is claimed.

## Interfaces and integration

- `createObservability` defaults to 10% trace sampling, bounded 200-record in-memory trace retention, and enabled bounded operational metrics. It uses official `@opentelemetry/api` and `@opentelemetry/sdk-trace-base`; no global provider, HTTP auto-instrumentation or network exporter is registered.
- `registerObservabilityHooks(app, instance)` measures actual request status and duration using matched route templates. Unknown paths collapse to the fixed `unknown` operation. Only operation, status/error class and duration bucket survive structured logs/traces. Sampled export drops trace/span IDs, times, resource/process attributes, HTTP attributes and events.
- The operation catalogue has 24 fixed entries, including privacy, local notifications, masked support, consent lifecycle, monthly insights and safe-to-spend; registered mapped-import routes share `imports`. Route parameters and query strings never become labels. Maintenance has exactly three tasks: retention, revocation and notifications, with bucket-only structured logs and aggregate counters.
- `setConfiguration({ traceSampleRatio, metricsEnabled })` validates atomically and affects subsequent real span sampling and metric increments. Changing a runtime setting has a concrete effect. Existing process counters remain readable until shutdown/restart.
- `recordSync`, `recordMaintenance`, `recordInbox`, `recordDecision` and `recordFailure` accept fixed enums and bounded non-negative counts only. Inputs are validated before counter mutations. Financial amounts, category labels and any identifiers have no place in these interfaces.
- The server supplies its collector to the application, which mounts `GET /internal/metrics` for aggregate Prometheus process counters and `GET /internal/observability` for a read-only operator view of HTTP, sync, inbox/decisions and maintenance. The view has no scripts or external assets. The server accepts only a loopback listening host and the application applies its host/origin guards. These routes are a local diagnostics surface outside financial customer routes; no separate production administrator identity or public deployment is established.
- `shutdown()` drops all process telemetry. Log/sink errors increment a bounded failure metric and cannot stop financial operations.

## Semantic catalogue and consent boundary

`observability-catalogue.ts` includes every event in PRD §7 with version `2026-10-03.1`. Strict schemas permit only bounded, approved enums, booleans and count/time buckets. A recursive forbidden-property lint rejects financial content, identifiers, tokens, URLs/queries and error content, including nested/canonicalized key spellings. It rejects accessors without invoking them, unusual prototypes, cycles and oversized structures. Unknown fields and unapproved string values fail the strict event schema. Institution provenance is limited to `synthetic`/`unknown`; a bank's name or an unverified provider label cannot become a telemetry dimension.

Registration does not imply implemented behaviour: planned automation, renewal and billing events reject emission. The runtime's necessary operational counters are separate from optional product analytics.

Optional individual semantic delivery is disabled by default. Enabling a trusted local semantic sink still requires `consentGranted=true` for each emitted event, derived by its producer from an authoritative consent state. This module does not establish that state or provide a customer consent UI. No current producer should turn this on without the permission lifecycle and release review. There are no consent-based identifiers in either mode.

The default process aggregate view suppresses semantic cells smaller than five, bounds storage to 512 distinct cells, and keeps only enum dimensions and counts. Suppression and lack of identifiers do **not** prove irreversible anonymity or a lawful consent exemption. Aggregation/re-identification/device-access assessment remains a privacy gate before real-data use. Process shutdown purges these cells; this local module provides no event archive or 13-month retention claim.

## Local evidence

`pnpm --filter @lilleri/api exec vitest run test/observability.test.ts` runs 15 collector and in-process Fastify tests. They verify the catalogue, recursive forbidden properties, strict values, consent default, aggregation bounds, safe HTTP requests/errors, sampling/runtime changes, cumulative request histogram, counter validation, sink failure isolation and shutdown purge. The added registered-route case uses fixture Fastify handlers for privacy, notifications, consent, support, imports and understanding; it verifies operation mapping and redaction without invoking database-backed application services or SQL scopes. Tests deliberately put synthetic sentinel data in URL/query/headers/body/results/errors, then assert it is absent from every log, metric, trace, Prometheus output and dashboard.

Database boundaries and producer integration have separate evidence. `request-scope.test.ts` and `rls.test.ts` exercise financial SQL isolation; `notifications-app.test.ts` runs the actual application against PGlite/PostgreSQL to verify the archive and sync notification producers. Those checks are not additional database scenarios inside the 15-case observability suite.

Real providers, export pipelines, alert destinations/rotations, incident thresholds and human response drills need their own reviewed deployment/evidence. Local tests do not close those gates.
