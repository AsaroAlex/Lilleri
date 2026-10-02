# ADR-0010: Deterministic intelligence and optional AI providers

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; implementation team
- **Decision gate:** D scoped design; real-bank beta and Gate E remain separately gated

## Context

FACT: [the brief](../BRIEF.md) explicitly prioritises financial correctness over AI and requires explicit rules to win. [AI research](../research/raw/ai-ml-transaction-intelligence.md) compares deterministic, personalised/statistical and model options but does not establish performance for Lilleri's future user base. FACT: [privacy](../compliance/privacy-model.md) flags special-category inference and third-party disclosure. ASSUMPTION: deterministic merchant rules and user feedback can produce useful first value without external model cost or sensitive payload transmission.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| Deterministic tiers first; optional constrained model port later | Rules/map/preferences, then evaluated abstaining models | Explainable, cheap local core; minimal exposure | Unknown merchants need review | Brief and current domain categories |
| LLM classify raw ledger immediately | General model context | Appealing demo flexibility | Disclosure, hallucination, arithmetic/error/cost and injection risk | AI/privacy research; no approved vendor contract |
| Buy all transaction enrichment | Vendor intelligence end to end | Less in-house mapping | Pricing/coverage/learning lock-in; unclear Italian accuracy | Provider/vendor matrix with UNKNOWN prices |

Proposal: AI abstraction with several model tiers. Critique: building unused clients and transmitting ledger text before a measured need adds risk and no proven value. Counterproposal: pure rules/map/feedback now, document model port and release tests without vendor calls. Decision: deterministic-first and no external AI in the walking skeleton.

## Decision

DECISION: direct user correction and explicit rules outrank scoped learned preferences, future evaluated personal model, global deterministic classification, LLM suggestion and Needs Review. Every result carries actual evidence/source and algorithmVersion. Current scores are heuristic confidence, not measured accuracy; future thresholds require stratified labelled evaluation and calibrated abstention. A one-shot choice stays transaction-specific; merchant scope is explicit and tenant-local.

Future intelligence layers add lightweight statistical model, embeddings or small/frontier LLM only for a demonstrated unresolved task. A ClassificationProvider accepts a minimal authorised-purpose DTO and validated constrained output; it cannot alter money, call tools or bypass rules. Financial chat uses scoped deterministic calculation tools, never raw-ledger arithmetic by LLM. Vendor permissions/DPA, data-transfer/residency/no-training/retention claims and special-category safeguards need verification before a call. EU region is not sufficient privacy evidence. Model/prompt/schema versions, safe token/latency/cost metadata and cache/deletion handling are mandatory; content logs are off by default. Descriptions are untrusted data against prompt injection.

## Consequences

Positive: zero current external AI fees, predictable financial semantics and real explainability. Negative: more unknown merchant review and possible slower expansion of classification coverage. This is preferable to fabricating certainty or leaking sensitive descriptions. Future vendor swap is easier through a port, but model evaluation and legal controls remain vendor-specific. Autopilot modes cannot relax correctness/tenant/consent invariants. Global training from feedback is a separate purpose, not implied by correcting one purchase.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Model contradicts explicit user correction | Medium | High | Deterministic precedence and replay tests | Repeated category reset after inference |
| Transaction description exposes sensitive data | High | High | No calls now; minimal purpose DTO and vendor/privacy gate | Raw merchant/description in logs or prompts |
| Confidence reported as measured accuracy | High | Medium | Label heuristics; audited labelled metrics | Claims of near-perfect classification without sample |

## Revisit conditions

Reopen when audited deterministic coverage shows a valuable gap, labels/evaluation justify a model and approved processing terms exist. Select the smallest adequate model, estimate actual marginal cost and require a kill switch. Disable a tier if measured error, privacy or cost guardrails fail.

## References

- [Classification design](../architecture/classification-engine.md); [AI research](../research/raw/ai-ml-transaction-intelligence.md), source dates/URLs retained there.
- [Privacy](../compliance/privacy-model.md), [consent](../compliance/consent-model.md).
- [Observability](../architecture/observability.md).
