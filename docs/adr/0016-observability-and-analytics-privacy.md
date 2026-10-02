# ADR-0016: Observability and analytics privacy

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture and operations owners; product measurement owner; controller with privacy advice
- **Decision gate:** D for telemetry design; E and real-data privacy approval remain open

## Context

FACT: financial descriptions, merchants and amounts can reveal personal or sensitive information, as assessed in the [privacy model](../compliance/privacy-model.md). Pseudonymous identifiers are still personal data. FACT: the [observability design](../architecture/observability.md) defines complete/partial sync, source freshness, correction and audited precision metrics rather than treating import volume as correctness. ASSUMPTION: a small team needs safe operational diagnosis before broad product experimentation. UNKNOWN: which EU-hosted monitoring/analytics suppliers satisfy actual contracts, data paths and prices. The synthetic skeleton requires useful developer diagnostics, not third-party collection or monitoring service purchase.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| Allowlisted first-party operations; optional semantic analytics | Minimal structured signals, reviewed event catalogue | Stronger content boundary; honest reliability metrics | Requires deliberate schema and privacy review | [Metric plan](../product/metrics.md); [privacy research](../research/raw/regulatory-landscape.md) |
| Broad hosted SDK/replay by default | Automatic crashes, breadcrumbs and sessions | Convenient debugging and funnel exploration | High leakage/transfer risk; excessive financial-screen capture | [Privacy model](../compliance/privacy-model.md) exclusions |
| No telemetry | Avoid collection entirely | Smallest initial instrumentation | Silent failures and deletion delays remain invisible | [Pain-point research](../research/raw/user-pain-points.md) |

Proposal: instrument every screen with an analytics/error SDK. Critique: defaults can upload payloads, URLs and financial breadcrumbs; consent or a hash does not make unrestricted collection lawful or anonymous. Counterproposal: instrument defined operational boundaries with content-free allowlists, and review optional product analytics separately. Decision: choose the minimal schema-first approach, with external integrations gated.

## Decision

DECISION: structured API/job logs contain approved event/error code, request/run correlation ID, service/build, stage, duration, counts and approved provider metadata. Use Pino as the logger direction; OpenTelemetry and an EU-hosted error/metric service are future options after useful integrations and processor review. Never record amounts/balances, descriptions, merchants, individual categories, IBAN/PAN, counterparties, payloads, prompt text, tokens, cookies, authorization headers, email or arbitrary URL/query/SQL bindings. Error output uses safe templates. Default financial-screen replay, body capture and unrestricted breadcrumbs are off.

Low-cardinality labels use environment, stage, coarse error and algorithm/provider versions. User/account/transaction IDs are not metric dimensions or analytics properties. Necessary restricted operational correlation is purpose-assessed and access-controlled. Verify collection before upload using synthetic sentinel secrets and financial strings; downstream scrubbing alone is insufficient.

Product analytics uses a versioned allowlisted semantic event registry, typed enums and coarse count/time buckets. Optional identifiers/device access are disabled until applicable consent or a demonstrated exemption and lawful basis are established. Refusal/withdrawal stops consent-based collection and triggers the reviewed deletion workflow. Rotating IDs, truncated IPs and aggregate counts do not automatically establish anonymity. External processors require role, location/remote-access, DPA, transfer, retention and deletion evidence; EU hosting is only one input.

Report eligible complete syncs separately from partial, expired and quarantined runs. Source freshness derives from actual successful source snapshots. Pair automation coverage with audited precision, abstention, undo and correction; non-correction is not ground truth. A confidence score is not measured accuracy. Prioritise silent skips, cross-tenant failures, revoked writes, deletion/backup failures and broad source outages. Every alert has a safe context, owner and response path. Latency/engagement targets remain hypotheses; sessions are not a product objective.

Follow the reviewed [retention schedule](../compliance/data-retention.md): analytics up to 13 months only when justified, crashes up to 90 days, security logs six months by default with justified exceptions, full IP normally up to seven days. Those proposed class periods are ceilings requiring necessity, not permission to retain all routine logs that long. External AI is disabled; future metrics record version/count/cost/latency without routine content.

## Consequences

- Positive: developers can diagnose correctness and reliability while reducing financial-content copying.
- Accepted trade-offs: some debugging needs deliberate isolated evidence collection; product cohort analysis requires reviewed identifiers or limited aggregation.
- Easier: predictable event contracts and rights handling. Harder: auditing SDK defaults, rare-cell identification and telemetry copies across vendors.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| New SDK uploads raw financial context | Medium | Critical | Pre-upload allowlist, sentinel test and SDK/network audit | Description or token in exported event |
| Automation metric hides over-merging | Medium | High | Audited precision/coverage pairs and denominators | Review falls while undo/errors increase |
| Small cells or IDs treated as anonymous | Medium | High | Re-identification assessment and reviewed collection mode | Individual user identifiable in a dashboard |

## Revisit conditions

Reopen on an actual monitoring need, supplier quote/contract, privacy-basis decision, SDK change or unexplained correctness incident. New event fields require registry/purpose review. Refresh thresholds after labelled pilot measurement; vendor activation and a real-data release need their separate evidence, not this accepted design alone.

## References

- [Observability](../architecture/observability.md); [NFR](../architecture/nfr.md); [product metrics](../product/metrics.md).
- [Privacy model](../compliance/privacy-model.md); [retention](../compliance/data-retention.md), proposed reviews dated 2026-10-02.
- [Raw regulatory evidence](../research/raw/regulatory-landscape.md); [pain points](../research/raw/user-pain-points.md), dates and verification limitations retained there.
