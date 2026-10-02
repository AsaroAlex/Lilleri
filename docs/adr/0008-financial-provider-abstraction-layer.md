# ADR-0008: Financial provider abstraction

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; implementation team
- **Decision gate:** D scoped design; real-bank beta and Gate E remain separately gated

## Context

FACT: [current port](../../packages/financial-providers/src/index.ts) exposes capabilities, createConnection, refreshConnection, listAccounts, getBalances, getTransactions and disconnect using ProviderContext. The mock has synthetic account-information capability and no payments. FACT: [provider matrix](../research/provider-capability-matrix.md) records substantial institution/account-specific differences. ASSUMPTION: Lilleri's core reconciliation/classification should survive changing aggregators without embedding vendor payloads or guessed permissions in financial logic.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| Canonical port plus isolated adapters | Internal scoped accounts/observations and typed source mapping | Testable synthetic implementation and portability | Mapping/stability policy must be maintained | Current domain/provider source |
| Vendor SDK throughout backend/domain | Direct payload use | Less initial mapping code | Deep coupling, source-specific assumptions in engines | Vendor fields vary in research |
| Lowest-common-denominator generic JSON | Flexible payload blobs | Easy new fields | No exact semantics/type guarantees, hidden assumptions | Incompatible with brief/domain invariants |

Proposal: one interface common to all providers. Critique: a simple yes/no capability can hide bank-specific pending/expiry/history limits; SDK IDs may not be stable. Counterproposal: retain a minimal working port and extend capability metadata from evidence when real adapters arrive. Decision: canonical typed mapping with source provenance and explicit unsupported/unknown behaviour.

## Decision

DECISION: provider adapters alone know SDK/OAuth/schema specifics. ProviderContext holds server-authorised profile/connection scope; account references are validated under that scope. Map exact decimal strings into Money, preserve raw description and source calendar fields, namespace account/transaction IDs and distinguish source observation identity from canonical identity. Domain/engines never import a provider SDK. Mobile never receives provider access tokens or credentials.

The current capability object means only synthetic account-information/no-payment support. Real adapters must add documented per-institution/account stable-ID, pending/history, rate-limit and expiry semantics; unknown data remains unknown, not false confidence from a global flag. Paging cursors are opaque and account-scoped. Errors distinguish retryable network/quota failures, renewal/revocation, unsupported operation and invalid payload. Disconnect immediately fences future local jobs and records provider revocation outcome; local denial does not falsely guarantee remote revocation succeeded. Contract tests run synthetic fixtures first and vendor sandbox payloads later under permission.

## Consequences

Positive: engines and persistence can be tested without credentials, and vendor migration affects mapping rather than every financial rule. Negative: canonical mapping costs work and can lose useful fields unless versioned with provenance. Raw payload retention is a short justified exception, not a permanent substitute for canonical modelling. A common interface is not evidence all banks support every operation. A future provider-specific extension can exist at the adapter boundary without leaking into core financial semantics.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Unstable provider ID treated as transaction truth | High | High | Stability class and observation/canonical separation | Retry creates new IDs or pending loses link |
| Malicious/incorrect account reference crosses profile | Medium | Critical | Server scope, normaliser checks and composite DB FKs | Account not in listed scoped connection |
| Capability flag overpromises support | Medium | High | Institution-specific metadata and honest UX | Card/pending/history absent in pilot |

## Revisit conditions

Extend the port only for a verified source feature required by product behaviour. Revisit capability design at the first real-provider sandbox/pilot. Breaking semantic changes version the adapter mapping and require replay/correction-preservation tests. Do not generalise a one-vendor quirk as a universal rule.

## References

- [Port implementation](../../packages/financial-providers/src/index.ts); [domain](../../packages/domain/src/index.ts).
- [Pipeline](../architecture/data-pipeline.md); [provider matrix](../research/provider-capability-matrix.md).
- [ADR-0007](0007-open-banking-provider-strategy.md), [ADR-0009](0009-ingestion-idempotency-and-reconciliation-engine.md).
