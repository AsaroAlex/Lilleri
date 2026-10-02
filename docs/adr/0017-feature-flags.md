# ADR-0017: Feature flags

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; product and security owners
- **Decision gate:** D for configuration design; flags cannot close legal/security release gates

## Context

FACT: the [brief](../BRIEF.md) requests simple flags and separate environments. The current scope is a mock-only connect, sync, understand and correction loop; real provider access, external AI, billing and household sharing remain distinct gated capabilities. ASSUMPTION: a small team needs explicit safe defaults and a way to disable a failing optional flow, without a commercial experimentation platform. UNKNOWN: whether rapid remote rollout will be operationally necessary. A flag indicates availability policy; it cannot establish identity, tenant membership, consent, receipt validity or permission to collect real data.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| Typed environment/config flags initially | Validated startup configuration with safe defaults | Minimal dependencies, explicit local behaviour | Changes generally need restart/release | [System architecture](../architecture/system-architecture.md); [brief](../BRIEF.md) |
| Database-backed flags when needed | Restricted server registry, cached resolution and audit | Remote disable/cohort policy without new SaaS | Cache consistency, access and administration burden | [Modular proposal](../architecture/proposals/proposal-modular.md) |
| Hosted flag/experimentation platform | Remote rules and analytics integrations | Mature rollout tooling | Cost, processor/identifier exposure and operational dependency | [Vendor research](../research/raw/build-vs-buy-and-vendors.md) |

Proposal: introduce a remote flag service for every planned feature. Critique: many planned features are absent, and a rollout platform adds identity/data exposure without a current user. Counterproposal: use a small explicit configuration schema now; add a database registry only for demonstrated remote-control needs. Decision: choose environment/config flags for the current slice, with a documented future transition.

## Decision

DECISION: declare each flag's key, type, default, owner, purpose, allowed environment and removal/review date. Parse known configuration explicitly; reject invalid combinations and unknown dangerous modes rather than silently coercing strings. Current defaults select synthetic provider behaviour and disable external AI, real bank access, paid checkout and household exposure. These defaults are requirements for implementation verification, not a claim that every named flag already exists. Do not create a flag for an absent package merely to advertise a roadmap.

Resolve authoritative capability decisions on the server. A client may receive an allowlisted presentation snapshot containing no secrets, financial data or internal targeting rules. Hiding a button does not disable its endpoint. Conversely, enabling UI does not authorise a route: the handler still checks authentication, membership, ownership, lawful consent, provider state, financial invariants and applicable verified entitlements. No flag may turn off tenant isolation, exact-money validation, sticky-correction precedence, revocation fencing, required audit or privacy/deletion safeguards.

Before a real-data release, a non-mock mode requires its independent legal/provider, DPIA/vendor and implemented-control approval record. A configuration value cannot bypass that gate. Optional external AI additionally requires permitted purpose and explicit applicable permission for each subject/operation. Billing activation requires verified channel lifecycle/receipts. Development identities stay local/synthetic; setting an environment name to production cannot make them production authentication.

If operations later need remote kill switches, implement a small database-backed server registry with restricted writes, versioned changes, expiry, audit and bounded cache invalidation. Workers check relevant capability and consent state before external work and commit. An off switch must stop future processing and fence stale jobs; it does not retract prior disclosure, erase records or cancel vendor contracts automatically. Define safe fallback behaviour and test disabling during work. Unknown/unavailable optional configuration falls back off while the core retained-data experience remains usable.

Use stable cohort rules only when a justified experiment needs them; do not target by sensitive financial conditions or send identities to a third-party flag service without review. Core correctness is identical across cohorts. Remove finished experiments and stale switches rather than accumulating permanent parallel behaviours.

## Consequences

- Positive: configuration is inspectable and cheap; availability policy remains separate from access and financial rules.
- Accepted trade-offs: current changes require a release/restart; real remote disable needs distributed cache/job semantics and restricted administration.
- Easier: safe optional rollout and clear ownership. Harder: testing combinations and proving an off switch stops in-flight external processing.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Flag becomes an authorisation shortcut | Medium | Critical | Independent route checks and denial tests | Hidden route accepts arbitrary profile ID |
| Stale worker/cache ignores disable | Medium | High | Bounded cache, recheck and generation fence | External call occurs after recorded disable |
| Forgotten flags multiply behaviours | High | Medium | Owner/expiry/removal discipline | Expired experiment still changes financial output |

## Revisit conditions

Add database flags when a measured incident/rollout requirement cannot wait for deployment. Consider hosted tooling only after evidence that the small registry is insufficient and processor/cost review passes. Review every switch at expiry, and reopen design if configuration failure can compromise access, correctness or revocation.

## References

- [Brief](../BRIEF.md); [system architecture](../architecture/system-architecture.md); [pipeline](../architecture/data-pipeline.md).
- [Privacy model](../compliance/privacy-model.md); [consent model](../compliance/consent-model.md), proposed reviews dated 2026-10-02.
- [ADR-0014 billing](0014-monetization-architecture.md); [vendor research](../research/raw/build-vs-buy-and-vendors.md), retained source dates.
