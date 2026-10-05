# ADR-0007: Open-banking provider strategy and mock-first delivery

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; implementation team
- **Decision gate:** D scoped design; real-bank beta and Gate E remain separately gated

## Context

FACT: [provider research](../research/open-banking-providers.md) nominates Yapily conditionally, Enable Banking as fallback, Tink as challenger and Fabrick for parallel enquiry. Those are research decisions, not executed contracts or proof of Italian account-type completeness. Prices, field-level pilot results and the legal route remain UNKNOWN. [Revised legal questions](../compliance/legal-open-questions.md) explicitly gate real-data access. ASSUMPTION: reconciliation quality depends on actual pending, identifiers, counterparty fields and refresh behaviour, not just bank counts. No personal bank login belongs in this setup.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| Mock → official sandbox → conditional primary/fallback | Build domain independently, then evaluate nominated vendors | Reproducible no-credential setup, preserves competition | Real coverage remains unproven | Provider matrix and legal open questions |
| Select/pay primary immediately | Integrate one vendor end to end | Faster commercial focus if terms fit | Could bind wrong legal route, cost or incomplete data | Quotes/permission UNKNOWN |
| Direct bank APIs / own AISP route | Full control over integration | Reduced aggregator dependency in theory | Licensing, certificates, per-bank work, operational cost | Raw regulatory/provider research |

Proposal: dual-provider architecture with Yapily primary and Enable fallback. Critique: two live adapters before a contract doubles work and implies legal permission. Counterproposal: one mock and a vendor-independent port now; official sandbox only with authorised credentials, then contracted field-quality pilot. Decision: retain the conditional shortlist, not a commercial commitment.

## Decision

DECISION: implement the synthetic Italian provider first; merchant/institution fixture names never claim live support. A real adapter starts with an official sandbox and provider permission. Real-bank beta requires written confirmation of licence route/roles, contract/DPA, supported institutions/account types/history and actual quote economics plus consent/security/privacy gates. No restricted-production personal-account exercise is performed automatically in this environment.

RFP asks named Italian institutions, card/prepaid account completeness, pending/stable ID behaviour, available/booked balances, history per institution, source timestamps, expiry/SCA/token distinctions, unattended rate allowance, callbacks, revoke/delete behaviour, incident SLA, subprocessors/transfers and fixed/minimum/per-account charges. Run a consented authorised pilot with coverage/fill-rate, replay and match precision fixtures. Use primary plus fallback only when contract/pilot evidence shows value; a fallback is not a promise that switching recreates lost history. Institution/source identities are namespaced so vendor migration remains reviewable.

## Personal real-account pilot — 2026-10-05

The user requests a way to connect their actual accounts. Current first-party
Enable Banking documentation supplies a bounded route distinct from a public
beta: a Production application activated by linking each own account, for
individual personal use or evaluation. The January 2026 terms provide free access
within those restrictions. Provider console linking must be followed by a new API
authorization. It neither activates third-party accounts nor grants commercial use.

Prepare one isolated personal AIS client and operator tool for this route. Keep
session material and any financial capture encrypted locally outside the repository
and shared preview; do not pass it into the current synthetic ledger or change its
admission flags. Fresh application/ASPSP metadata, exact country/bank and registered
HTTPS callback, a one-request state/code exchange, paginated reads and session
closure are the executable scope. Source protocol tests are not official live
acceptance. Missing provider registration/key material and bank SCA remain explicit.

This changes the first own-account pilot choice to Enable Banking, without choosing
or purchasing a commercial provider contract. The broader conditional shortlist
and hosted release boundaries remain unresolved. The current public Railway
application still has no authenticated live financial runtime. See the
[personal setup guide](../operations/enable-banking-personal.md) and its linked
first-party sources for eligibility, callback and coverage limits.

## Consequences

Mock delivery is unblocked by unknown contracts and validates the core value before paying for aggregation. Negative: real-bank completeness, refresh and beta date cannot be promised. The shortlist may change after current registry verification and quotes. Source-specific data minimisation and revocation requirements may force adapter changes. Users see real supported institutions only after validation; no 'all Italian banks' copy based on dated marketing coverage. Vendor licensing and data-recipient route are legal questions for counsel/provider, not resolved by an ADR.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Incorrect legal route or controller assumption | Medium | Critical | Written counsel/provider determination before real data | Contract names different regulated entity/role |
| Good bank count but missing card/pending fields | High | High | Field-level pilot and per-institution capability UX | High review/missing-history rates |
| Minimum/provider cost breaks unit economics | Medium | High | Actual RFP quote scenarios and commitment review | Cost exceeds Gratis/Plus scenario guardrail |

## Revisit conditions

Reopen nomination after fresh regulatory/registry evidence, an unfavourable quote, failed field-level pilot, repeated outage or route change. Do not escalate to a second real adapter before the first pilot identifies a concrete gap and permission/cost supports it. Refresh variable evidence at contract time.

## References

- [Provider decision](../research/open-banking-providers.md), [capability matrix](../research/provider-capability-matrix.md), verified-source dates retained there.
- [Legal open questions](../compliance/legal-open-questions.md); [data-source feasibility](../research/data-sources-feasibility.md).
- [ADR-0008](0008-financial-provider-abstraction-layer.md).
