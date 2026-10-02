# ADR-0009: Idempotent ingestion and conservative reconciliation

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; implementation team
- **Decision gate:** D scoped design; real-bank beta and Gate E remain separately gated

## Context

FACT: [matching research](../research/raw/reconciliation-and-data-model-patterns.md) describes unstable IDs, duplicate overlaps, pending/booked variation and repeated purchases. FACT: current normalisation makes a namespaced canonical ID from profile/connection/provider/account/source ID without status. ASSUMPTION: suppressing legitimate spending through a fuzzy duplicate is more harmful than asking for review. Source retry identity and financial relationship inference therefore need separate contracts.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| Immutable observations + canonical revisions + reversible matches | Source evidence preserved; exact/strong links first | Replayable, auditable and correction-safe | More explicit state and ambiguity handling | Current port/domain, matching research |
| Amount/date/merchant fingerprint as sole identity | Simple automatic dedup | Easy implementation, low review count | Deletes same-price repeat purchases and changed pending | Adversarial scenario in research/brief |
| Full double-entry event-sourced ledger now | All derived views from immutable events | Strong accounting potential | Large domain/operations burden beyond PFM slice | Raw modelling alternatives; no current need |

Proposal: use a rich fingerprint plus fuzzy windows to auto-merge. Critique: any fingerprint without an occurrence/stable reference collapses valid repeated purchases; confidence scores are not calibration. Counterproposal: namespaced observation keys for retries, separate conservative evidence-based links and sticky user overrides. Decision: adopt the safer two-identity design.

## Decision

DECISION: persist observations with status/version/content identity and canonical transactions with stable ID/revision. Stable provider IDs are accepted only with adapter evidence. Retry/overlap must not create extra spending; changed source facts create a new observation/revision. Fallback source identity includes occurrence context; identical CSV rows within a file survive, while reimport of the same file/mapping is idempotent. Cross-source duplicate reconciliation is a separate decision, never a UNIQUE amount/date constraint.

Pure reconciliation checks scope, account relationship, currency/sign/exact amount and documented reference before confirmation. Merchant/date similarity alone suggests. Pending→booked, duplicate, transfer, card settlement, refund and cash-wallet relationships preserve source records and expose reasons/version/evidence. Refund allocation cannot exceed proven debit/remaining refundable amount. Split/shared reimbursements are designed but deferred until conservation/persistence tests. Confirm/reject/undo overrides are durable; replay cannot overwrite one-shot corrections or recreate rejected matches unchanged. DB checkpoint/cursor writes are atomic, and future asynchronous effects use idempotent outbox/consumer processing.

## Consequences

Positive: exact summaries can exclude proven duplicate/pending/transfer/settlement representations while preserving legitimate purchases and refund facts. Negative: weak identifiers produce more review and some duplicate uncertainty; this is an accepted trust trade-off. Explanations derive from actual evidence, not invented prose. Undo restores derived eligibility/category effects with revision checks; it never deletes provider source records. Historical balances cannot be computed from partial history as if opening balance were known.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Over-merge suppresses real spending | Medium | Critical | Strong evidence plus ambiguity/repeat-purchase tests | Audited mismatch or frequent undo |
| Retry/replay erases correction | Medium | High | Durable feedback precedence and revision tests | Category/match reverts after sync |
| Cursor advances before page commit | Medium | High | Atomic observations/checkpoint and fault injection | Valid source records missing without quarantine |

## Revisit conditions

Revisit heuristics after labelled real-provider pilot data and audited precision/coverage. Do not lower automation thresholds merely to reduce inbox volume. Add statistical/embedding candidates only if a measured gap remains and evaluation/privacy gates pass. Reopen identity mapping when provider IDs change, with explicit migration/replay plan.

## References

- [Reconciliation design](../architecture/reconciliation-engine.md); [pipeline](../architecture/data-pipeline.md).
- [Domain](../architecture/domain-model.md); [raw model research](../research/raw/reconciliation-and-data-model-patterns.md).
- [ADR-0006](0006-money-and-time-representation.md).
