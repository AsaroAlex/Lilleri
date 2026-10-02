# Non-functional requirements and release gates

**Date:** 2026-10-02 · **Status:** Design targets, not measured promises or SLAs.

## Stages and targets

DECISION: the local mock walking skeleton proves product/financial contracts with synthetic data. A controlled real-bank beta needs operational controls and legal/provider prerequisites. Public production targets require measurement and staffing; they cannot be inferred from a passing local test or cloud feature list.

| Requirement | Mock walking skeleton | Controlled real-bank beta target | Production planning target |
| --- | --- | --- | --- |
| Availability | Local process; no SLA | HYPOTHESIS 99.5% monthly API excluding planned maintenance, track provider separately | HYPOTHESIS 99.9% once on-call and evidence support it |
| Read latency | Report measured local smoke result | HYPOTHESIS p95 ≤500 ms for bounded lists under stated load | HYPOTHESIS p95 ≤300 ms after profiling |
| Sync | Deterministic bounded fixture, retries testable | HYPOTHESIS ≥98% complete eligible runs over rolling 7d; external outages separately visible | HYPOTHESIS ≥99% complete eligible runs; no silent skips |
| Freshness | Fixture dates and actual run time visible | Actual provider/institution cadence and allowances; no universal 'real-time' | Contract-dependent; source timestamps always displayed |
| First value | Full mock connect→sync→summary→review flow | HYPOTHESIS first useful summary ≤2min after bank authorisation for supported sources | Calibrate by institution; partial state honest |
| Financial correctness | Exact bigint/currency/date, conservative matching, sticky corrections tests | All covered invariants, labelled pilot audit, tenant/concurrency tests | Continuous stratified precision/undo monitoring |
| RPO | Reset synthetic data; no durability claim | HYPOTHESIS ≤1h, tested backup/WAL configuration | HYPOTHESIS ≤15min with proven PITR |
| RTO | Manual local restart/reset | HYPOTHESIS ≤8h, timed restore rehearsal | HYPOTHESIS ≤4h once staffed/tested |
| Security | No bank secrets/real data; loopback demo identity | Gate E beta controls verified; real auth/tenant/secret tests | Continuous access/audit/scan/incident management |
| Accessibility | Document and inspect loading/error/empty/large-money states | WCAG AA target, screen reader/dynamic type/reduced motion testing | Regression and actual assistive-device testing |
| Privacy rights | No real-user processing claim | Export/deletion/revocation tested by class/vendor/backup boundary | Monitor request deadlines and restore tombstones |
| Scale | Bounded synthetic pages/fixtures | HYPOTHESIS load scenario: 1k users, ≤5 accounts/user, uneven sync bursts | Test 10k→100k incremental load; no claim of proven 1M |
| Cost | No bought service; bank/AI fee zero | Actual bill by connected account/user; AIS price UNKNOWN | Gate C cost assumptions re-evaluated against invoices |

These are internal objectives to validate, not public guaranteed service levels. A provider outage does not become API availability downtime if stale data remains accessible; sync/freshness metrics still reflect it. Reporting exclusions must be explicit and not game the denominator.

## Hard invariants and data handling

DECISION: no floating-point money, unsafe JSON numeric amounts, mixed-currency sums without explicit FX, source deletion via an inference, cross-profile links, hidden ambiguous merges or overwrite of a sticky correction. Store booked/value calendar dates separately from instants. Provider credentials/IBANs are not needed in the mock. Real data requires encryption, least privilege, scoped authorisation, minimised telemetry, reviewed retention and an incident plan; 'encrypted at rest' does not replace tenant checks.

Synthetic tests cover large/negative amounts, supported zero/three-decimal currencies, retries, status transitions, duplicate overlaps, same-price repeated purchases, known transfers/settlements, refunds and undo. Designed split/shared, custom taxonomy, actual bank callbacks, multi-worker queues and offline writes cannot be called complete until tested. PGlite is not evidence for roles/RLS, multi-process locking, network TLS or managed backup/PITR.

## Reliability and deployment gates

Before real-bank beta: confirm provider legal route, contracted supported institutions/account types/history and prices; finish privacy assessment/DPIA decision and required notices; verify auth/recovery/revocation, cross-tenant denial, sync revocation fence, real-PG migrations and concurrency, encryption/secrets, retention/export/deletion and restore. Backup configuration must be exercised with a removed profile/key to prove deleted data stays unavailable. Time and record restore, not just snapshot creation.

Bound jobs/pages, provider quota windows, body/file sizes and execution time. Quarantine failures and present partial/stale states; never change all accounts' freshness from one successful page. Real queue processing is at least once with idempotent effects; not exactly-once delivery. Upgrade versions only after current compatibility tests; current package manifests supersede old research version recommendations.

## Measurement and revisit

Every performance result records hardware/runtime, dataset/load/concurrency, duration and percentiles, with synthetic versus real scope. Reopen architecture for sustained measured DB/worker contention, a needed independent module/team boundary, unacceptable real-provider completeness or a failed restore target. Reopen cost/automation policy if cost exceeds unit-economics gates or audited over-merge harms trust. Public production launch remains blocked until [security baseline](../security/security-architecture.md) and [incident/DR drills](../security/incident-response.md) have evidence.

References: [brief](../BRIEF.md), [product metrics](../product/metrics.md), [business cost architecture](../business/cost-architecture.md), [provider coverage](../research/provider-capability-matrix.md). UNKNOWN: actual beta latency, availability, provider unit cost and restoration time; no deployment has established them here.
