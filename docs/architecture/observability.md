# Observability without financial-data leakage

**Date:** 2026-10-02 · **Status:** Accepted metric and logging design. Instrumentation implementation needs code/run evidence.

## Signals and collection

DECISION: use allowlisted structured logs at API/job boundaries, deterministic engine result counts, and request/run IDs. Pino is the candidate logger; OpenTelemetry traces and EU error monitoring are later integrations subject to data-handling review. Logs contain event/code, request/run ID, service/version, provider code, stage, elapsed time and counts. They exclude descriptions, amounts, balances, merchant names, categories of individual transactions, IBAN/PAN, payloads, tokens, cookies, authorization headers, email, arbitrary URLs/query strings and prompt text. Hashing an IBAN or user ID does not make it anonymous.

Use low-cardinality labels: environment/provider/stage/algorithm version/coarse failure class. Transaction/account/user IDs belong only in access-controlled operational correlation when necessary, never unbounded metric labels or product analytics. Error messages are allowlisted codes and safe templates; crash breadcrumbs/session replay on financial screens are off. A sampled trace must not capture request/response bodies or SQL bindings. Synthetic test fixtures should verify redaction using sentinel tokens and descriptions.

## Metric definitions

Grain and denominators prevent a partial sync from looking successful. These definitions refine the [product metric plan](../product/metrics.md); targets remain HYPOTHESIS until pilot measurement.

| Metric | Definition / grain | Interpretation |
| --- | --- | --- |
| sync_success_rate | Complete successful runs / attempted eligible runs, by provider/institution/window | Report partial, expired and quarantined runs separately |
| sync_duration | End-to-end complete/partial run duration histogram; p50/p95 | Separate provider wait, DB and engine time |
| transactions_imported | Newly persisted canonical transactions and observations, separately | Retry observations are not user transaction growth |
| duplicate_rate | Confirmed extra representations / ingested observations, by source pair | High/low alone says nothing about correctness |
| reconciliation_auto_rate | Auto-confirmed eligible decisions / eligible relationship candidates | Pair with audited precision and undo rate |
| classification_auto_rate | Auto-assigned eligible booked transactions / eligible booked transactions | Always disclose abstention/exclusions |
| classification_accuracy | Correct audited classifications / independently labelled sample | User non-correction is not ground truth |
| review_rate | Transactions routed to action-required review / eligible canonical transactions | Low is valuable only with audited low error |
| correction_rate | User corrected automatic decisions / shown automatic decisions | Deduplicate repeat correction events |
| connection_failure_rate | Connections with unresolved sync/auth failure / attempted connections | Distinguish bank outage and session expiry |
| consent_expiry_rate | Connections entering source-reported expiry / active connections | No hardcoded 180-day timer |
| ai_cost_per_active_user | Invoiced plus accrued model cost / eligible active users, same month/currency | Zero current external calls; missing invoice data is unknown |
| provider_cost_per_active_user | Allocated fixed/minimum/usage provider charges / connected active users | Include minimum commitment; pricing UNKNOWN until contract |
| source_freshness | Current time − last complete source snapshot instant | A successful partial page must not reset all-account freshness |
| silent_skip_count | Valid source records lacking observation/result or recorded quarantine | Any unexplained skip needs investigation |
| pending_match_precision | Audited correct replacements / audited confirmed replacements | Over-merging can hide financial events |
| transfer_precision_recall | Correct confirmed pairs / confirmed pairs; found true pairs / labelled true pairs | Report missing-leg subset independently |
| deletion_completion | Requests completed by class/vendor/backup policy within target / requests | UI response is not deletion evidence |

Balances can be reconciled only over known complete windows with a valid opening balance, matching currency/type and timestamps. No balance-equality alarm from partial history or an available balance that includes pending while flows are booked. An unknown coverage interval produces an 'insufficient evidence' state. Recurring next-date/amount accuracy uses labelled predictions and explicit tolerance; price-change alerts are estimates.

## Dashboards and alerts

Designed operator dashboard: complete/partial/failed sync runs, provider auth/quota/outage codes, source freshness, page stalls/quarantine, DB latency/locks, job retries/dead letters, ingestion-to-summary delay, correction/undo precision and retention/deletion job age. Product dashboard: honest first-value completion, actionable review load, correction friction and audited automatic correctness; no target for addictive engagement. Business dashboard: connected-account usage and actual invoice allocation, not a vendor list-price guess.

Targets for a pilot are in [NFR](nfr.md). Alerts start with correctness/security: tenant authorisation failures/spikes, unexpected token/redaction sentinel, silent skips, revoked-generation writes, failed backup/restore check, stuck deletion and broad provider failures. Latency and freshness alerts use sustained windows and a minimum event count; one synthetic failure does not page a person. Runbook links point to [incident response](../security/incident-response.md). Each alert has owner, severity, safe context and a suppression policy for acknowledged provider maintenance.

## Product analytics and retention

Semantic events such as `connection_completed`, `sync_completed`, `review_resolved`, `classification_corrected` carry only approved versioned enum/count buckets. No amounts, descriptions, merchants, raw category histories, advertising IDs or financial screen replays. Consent and permitted purpose are evaluated before optional collection; no-consent collection is not called anonymous without testing identifiability. Aggregation and rotating identifiers need privacy review.

Log/trace retention follows the [retention schedule](../compliance/data-retention.md), with short operational periods and access audits. No production debugging payload added 'temporarily' without a documented scope, TTL and lawful purpose. Future AI logs keep model/prompt/schema versions, counts, latency and exact billed cost metadata without content. External dashboards/error processors require EU/data-transfer assessment and verified scrubbing. The current local skeleton needs safe developer diagnostics, not a monitoring service purchase.
