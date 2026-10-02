# ADR-0001: Documentation language and evidence conventions

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; implementation team
- **Decision gate:** D for the scoped mock-first architecture; not a real-data release approval

## Context

FACT: the [brief](../BRIEF.md) asks for English repository documentation and an Italian-first product. Research contains quickly changing provider capabilities, prices and legal readings. The previous state/workflow files retain machine paths and historical versions that are no longer reliable operational instructions. The risk is not merely editorial: an unlabelled hypothesis can become a false bank-coverage, pricing or security promise. ASSUMPTION: engineers and specialists will work asynchronously and need durable reasons rather than conversational history.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| English docs, Italian product | Shared technical documentation with Italian copy | Consistent handoffs and Italian usability | Requires translation discipline | BRIEF language instruction |
| Italian everywhere | Local team documentation and product | Low translation effort now | Harder EU hiring and expansion | Product Italy-first, not engineering-only Italian |
| English product and docs | One language globally | Simplest text inventory | Poor fit to primary market | Product brief and personas |

Proposal: use English for durable docs and Italian for consumer copy. Critique: simply tagging everything FACT can launder old or inaccessible evidence. Counterproposal: attach source, verification date, reliability and explicit scope; preserve UNKNOWN. Decision: adopt the split with evidence labels and current repository/run results as implementation authority.

## Decision

DECISION: English Markdown architecture, ADR, research and engineering docs; Italian user-facing flows with stable translation keys. Use FACT / ASSUMPTION / HYPOTHESIS / DECISION / OPEN QUESTION / UNKNOWN. A FACT states exactly what was observed and when; a retained research report is not fresh independent verification. Refer to source documents with relative links and preserve their uncertainty. File paths and current package versions come from the checked-out repository. Never identify a designed control as implemented or a synthetic fixture as real bank support.

Each accepted ADR records context, alternatives, criticism, decision, consequences, risks and revisit triggers. Accepted means the approach is chosen; it does not mean authentication, KMS or backups exist. Real-data release gates have separate evidence. Keep the original ADR template and stable numbered filenames. Mark supersession explicitly rather than silently replacing the old decision. Product promises derive from implemented capability and legal/vendor permission, not from a roadmap.

## Consequences

Positive: specialists can review shared language and reconstruct decisions. Italian copy remains natural and readable; technical caveats stay in documentation unless they change a consumer decision. Negative: translation/catalogue maintenance and evidence updates cost time. Static scores and cost ranges remain labelled judgements. A source may establish a vendor marketing claim without establishing actual bank field completeness. This distinction should survive summaries, STATUS and user-facing release notes.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Old evidence promoted to current fact | Medium | High | Record source/verification scope and recheck before purchase/beta | Versions or laws contradict source |
| Designed controls described as complete | Medium | High | Separate implemented/tested/gated status and link artifacts | Release claims without command or deployment evidence |

## Revisit conditions

Revisit if the engineering team primarily needs another documentation language, product expands, or evidence labels fail to distinguish observed facts from recommendations. Before any real-bank release, refresh provider/legal/price claims with authorised sources. Fix stale operational instructions as ordinary maintenance without reopening the language decision.

## References

- [Brief](../BRIEF.md) (mandate dated 2026-10-02).
- [Research evidence index](../research/raw/README.md), sources dated in each document.
- [System architecture](../architecture/system-architecture.md); [ADR template](0000-adr-template.md).
