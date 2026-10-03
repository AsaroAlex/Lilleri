# Ingestion and replay pipeline

**Date:** 2026-10-02 · **Status:** Accepted contract. Mock pipeline now; durable real-provider operation is a separate implementation gate.

## Ports and stages

FACT: [FinancialDataProvider](../../packages/financial-providers/src/index.ts) is a provider-independent TypeScript port. Its current mock capabilities are `accountInformation: true`, `payments: false`, `synthetic: true`; connection creation returns a synthetic expiry and no bank redirect. DECISION: later adapters must declare actual per-institution pending/history/stable-ID/rate-limit behaviour rather than invent universal coverage. Source facts: [provider matrix](../research/provider-capability-matrix.md), [raw matching research](../research/raw/reconciliation-and-data-model-patterns.md), [consent model](../compliance/consent-model.md).

| Stage | Input → output | Failure / correctness boundary |
| --- | --- | --- |
| Admission | Authorised profile, connection, sync request → bounded run | Reject revoked/expired or wrong profile; one active run per connection |
| Fetch | ProviderContext + account + cursor → ProviderPage | Typed temporary/auth/quota/unsupported errors; no bank secrets in logs |
| Validate | Provider fields → structurally valid source record | Require scoped account/source identity, known currency, status and valid date; quarantine malformed records |
| Normalise | Decimal strings → exact bigint, calendar fields, namespaced IDs | Never parse money through Number; retain original description plus deterministic merchant key |
| Persist | Observations + canonical revisions + cursor → checkpoint | Transactional; cursor never advances before required observations persist |
| Enrich | Minimal raw names → known merchant aliases | No invented merchant site/logo/MCC; inferred aliases are reversible |
| Reconcile | Scoped records + user overrides → relationship decisions | Strong references first; fuzzy candidates need review |
| Classify | Records + rules + sticky feedback → category result | Explicit correction/rule wins; replay respects user scope |
| Recurring | Booked eligible history → versioned suggestions | Exclude confirmed duplicate/transfer/pending legs; estimate labelled |
| Understand | Accepted eligible facts → exact per-currency summary | Balance snapshots distinct from movement totals; no fabricated FX |
| Notify later | Permitted semantic event → bounded delivery | No financial descriptions/amounts in push by default |

The current local mock runs synchronously with a bounded fixture and commits a whole collected batch; it does not persist/resume a bank page cursor. It reports complete/failure honestly; it is not an asynchronous bank scheduler. Production page processing and asynchronous publication need an outbox/job system before claiming resilient unattended sync.

## Two identities

DECISION: `canonicalTransactionId` is stable over status updates when an adapter supplies a genuinely stable transaction identity: hash of profile + connection + provider + providerAccountId + providerTransactionId. Current normalisation excludes status from that ID. An immutable `observationKey` additionally includes status/source version or content digest; re-observing unchanged payload does not create another financial transaction. Changed data creates an observation/revision, not a second expenditure.

Provider identifiers have documented stability classes. A transient ID must not become a permanent uniqueness promise. An adapter's fallback fingerprint includes source account, reference, exact currency/amount, booked/value dates, normalised original fields and source occurrence identity. Never dedup by amount+date alone. Designed generic import fallback: CSV repeated identical rows use file digest, row/occurrence ordinal and import mapping version: importing a file twice is idempotent while two purchases within the same file survive. The current strict CSV parser instead requires a supplied stable row ID and rejects repeated IDs; generic mapping/fallback import UI is deferred. Cross-source matches use a separate evidence decision. Reconnecting via a new connection must not silently imply either a duplicate or a new account; account-link review is required where stable ownership cannot be established.

## Transactions, retries and partial failure

Designed production contract: one account page commit writes observations, canonical mapping, processed-page digest and next cursor together. Cursors are opaque and scoped to provider/account/query window/version. A crash before commit repeats the same page; after commit, the checkpoint/outbox ensures downstream work resumes. Pagination has a page/deadline cap and rejects repeated/invalid cursors. Each account can succeed independently; connection success distinguishes complete, partial and failed. Old successful balances/data remain visible with `lastSuccessfulSyncAt` when a later request fails.

At-least-once workers recheck consent before fetch and before commit; revocation marks a generation fence so a queued old generation cannot write or notify. Retry only transient network/429/5xx failures with bounded exponential backoff and jitter; honour Retry-After and provider budgets. Auth/expiry errors suspend and ask for renewal. Schema errors go to a scoped quarantine with code/version/digest, not indefinite retries. Dead-letter records have ownership and a reprocessing reason. Retrying an account never resets another account's cursor.

FACT (retained research, not a universal current quota): PSD2 sources describe four unattended accesses within24hours in defined circumstances, with higher frequency subject to applicable bank/user agreement. This is not a guarantee of four successful fresh results. DECISION: configure per-provider/institution allowances, rolling windows and safety reserve; distinguish attended access and provider-managed refresh. Actual consent/SCA/token expiry and history depth are read from provider metadata. No UI promise of a universal 180 days or 90 days of history.

## Replay, retention and telemetry

Reprocessing reads retained normalised observations, algorithmVersion and durable feedback. It creates a new derived version, compares affected totals, preserves user locks/rejected matches, and can revert that version. Replay is not a new provider fetch and cannot resurrect erased records. Raw real-provider payloads are unnecessary for the synthetic demo. Proposed real-provider TTL is 30 days after normalisation; a justified documented exception may reach 90 days; quarantine payload TTL seven days. The [retention schedule](../compliance/data-retention.md) is authoritative, and encryption/retention jobs need implementation evidence before real data.

The synthetic implementation separates immutable observation metadata from `observation_payloads`, with a fixed 30-day expiry from the original ingest instant. Ingestion writes raw content only for a new observation; retry after expiry cannot rehydrate it or extend its clock. Export retains provenance metadata and includes `payload`/`payloadExpiresAt` only before expiry. An explicit, profile-scoped cleanup batch removes up to 100 expired payloads by default (maximum 1,000), leaving canonical transactions and their financial results intact. PGlite and real-PostgreSQL scenario tests cover the boundary, bounded cleanup, replay, tenant isolation and deletion cascades; the legacy migration test intentionally uses PGlite. Automatic production scheduling, quarantine/exception retention and backup restoration are separate, unverified work.

Telemetry allowlists run/stage/provider code, elapsed duration, counts, coarse error codes and algorithm versions. No raw description, IBAN, access token, payload, amount or balance in logs. Trace IDs correlate API/job work without becoming analytics identifiers. Alert on silent skips, cursor stalls, repeated page digests, revocation races and stage failures; quarantine counts are part of sync completion, never hidden by a success badge.

Tests must prove replay idempotency, failed-page rollback, retry preservation, stable-ID status transitions, different purchases with identical amount/date, malicious account IDs, cross-profile references, consent expiry/revocation, exact amounts, duplicate file imports and undo. PGlite tests do not establish multi-worker delivery, PostgreSQL role/RLS or pg-boss correctness; real-PG integration is required for those paths.
