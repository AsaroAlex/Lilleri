# ADR-0014: Monetization architecture

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; business, product and privacy owners
- **Decision gate:** D for billing boundaries; C remains conditional and commercially unvalidated

## Context

FACT: the revised [business model](../business/business-model.md) chooses Lilleri Gratis and Lilleri Plus as the launch ladder, with Famiglia Later and Pro reserved for professional workflows. Prices of €4.99/month and €39.99/year are HYPOTHESES, not approved offers. FACT: its revised Base scenario has negative contribution per 1,000 MAU before fixed/minimum costs; provider prices, Italian purchase conversion and retention are UNKNOWN. A free beta cannot prove paid economics. ASSUMPTION: future store and web channels will need one product entitlement model. The current synthetic walking skeleton collects no payments and needs no billing SDK, webhook or checkout.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| RevenueCat plus Stripe behind adapters | Candidate store subscription coordination and possible web checkout | One domain entitlement vocabulary; avoids custom store client orchestration | Added processors/cost; contracts and store rules unverified | [Vendor research](../research/raw/build-vs-buy-and-vendors.md); [business inputs](../research/raw/business-and-cost-inputs.md) |
| Direct Apple/Google and Stripe | Own native receipts and web billing integration | Fewer subscription intermediaries | More lifecycle, receipt and support responsibility | [Pricing analysis](../business/pricing-analysis.md) release requirements |
| Web-only or immediate hard paywall | One checkout or paid core from start | Simpler apparent billing surface | Store eligibility, Italian demand and trust consequences unknown | [Business model](../business/business-model.md) options A–G |

Proposal: implement all four plans and a renewing trial immediately. Critique: that bundles unavailable household/AI capabilities, assumes store economics and risks surprise charges. Counterproposal: keep the mock and beta free; design a minimal entitlement port for one future paid tier, with a separately authorised purchase. Decision: accept the adapter strategy without activating commercial services.

## Decision

DECISION: future billing is a boundary around verified payment facts, not a dependency of financial engines. Prefer RevenueCat for native subscriptions and Stripe for a legally/store-permitted web channel, conditional on actual fees, capabilities, processor terms and channel economics. Choosing this direction does not buy services or promise either route. Keep provider customer/product/receipt identifiers inside adapters. Domain entitlements use stable capability IDs independent of translated plan labels and vendor SKU names. Create a package only when an implemented caller needs it.

The server derives paid access from authenticated, verified receipt/provider state. Signed webhook events are persisted/deduplicated, tolerate delayed/out-of-order delivery and are reconciled against authoritative state. Model active, pending, grace, expired, cancelled and refunded states explicitly. A client receipt or local flag cannot grant access. Test restore across devices, renewal failure, refund, revocation and channel-specific cancellation before checkout. Store billing, VAT, eligibility, fee stacking, merchant responsibilities and price-change rules need current terms and tax/legal review.

The proposed 30-day Plus preview is non-renewing, requires no payment details and never automatically charges. It is a hypothesis requiring an implemented entitlement lifecycle; real purchase is a separate explicit action. On expiry/downgrade, users choose supported Gratis sources after clear notice; additional future sync may pause according to approved terms. Retained data remains viewable, correctable and exportable under disclosed retention. Security, privacy/AI opt-outs, consent safety, categorisation/learning/rules, reconciliation/evidence/undo and deletion/portability never require payment. Billing outages cannot disable those protections.

Famiglia requires actual controlled sharing, member isolation and rights workflows before any SKU. Pro has no consumer launch entitlement. Ads/offers are absent from launch; hypothetical partner revenue is zero. Feature flags may disable a commercial flow but cannot substitute for entitlement verification or legal consent.

## Consequences

- Positive: channel-specific payment changes stay outside exact-money/domain logic; the plan ladder remains understandable.
- Accepted trade-offs: receipt reconciliation and customer support still need implementation; a billing intermediary does not guarantee store compliance or positive margins.
- Easier: free correctness and graceful downgrade. Harder: proving real paid retention and net revenue after taxes, channel costs and provider minimum invoices.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Paid state wrong after late/refunded event | Medium | High | Idempotent event processing, authoritative reconciliation and lifecycle tests | Client/server entitlement disagreement |
| Free AIS liability exceeds paid contribution | High | High | Quotes, account-level invoices and approved envelope; no speculative offer subsidy | Actual paid-cohort subsidy breaches guardrail |
| Downgrade obstructs rights or correctness | Medium | Critical | Explicit ungated invariants and degraded-state tests | Export/correction asks for an upgrade |

## Revisit conditions

Reopen on written billing/AIS quotes, current store terms, measured paid cohorts, failed cancellation comprehension or material processor-transfer concerns. Review Gratis limits against the current business guardrail, including its unavailable denominator during an all-free beta. Any move to a hard paywall, ads or account-data offers requires a separate evidenced business/legal decision.

## References

- [Business model](../business/business-model.md); [pricing analysis](../business/pricing-analysis.md); [unit economics](../business/unit-economics.md), internal review 2026-10-02.
- [Vendor evidence](../research/raw/build-vs-buy-and-vendors.md); [business inputs](../research/raw/business-and-cost-inputs.md), verification limits retained in source documents.
- [Privacy model](../compliance/privacy-model.md); [ADR-0017 flags](0017-feature-flags.md).
