# Institution discovery and authorization contract

Local implementation: **2026-10-03**. Stories **E02.1**, the contract portion of **E02.5**, and the configuration/provenance portion of **E26.1**. This document describes the provider library; an API institution route and picker must use this contract before their acceptance is complete.

`FinancialDataProviderV2` extends the original provider port with `discoveryMetadata`, `listInstitutions` and `renewConnection`. The original port remains usable by existing injected test adapters. `hasExpandedProviderContract` detects method availability only; it does not certify the adapter or its output. Every returned catalogue and authorization is validated separately.

## Coverage

Each institution contains availability and evidence **per account kind** (`current`, `savings`, `card`, `cash`). Evidence has `synthetic`, `verified`, `unverified` or `unknown` status and applies to exactly one of `synthetic`, `sandbox` or `live` environments. Verified evidence requires an explicit reference and check timestamp. Synthetic evidence cannot be labelled verified; a sandbox check cannot authorize a live selection. Missing account kinds remain unknown. Display names never establish coverage.

`unknownInstitution` is the safe configuration entry for an institution whose actual support has not been measured. `institutionPickerDecision` permits a declared available fixture only in the synthetic environment and permits available verified coverage only in its recorded environment. Unknown, unverified, unavailable and environment-mismatched choices keep a manual fallback and deny connection. **The validator checks the shape of a trusted evidence assertion; it cannot establish that provider access, licence, clearance or the referenced measurement really exists.** Real operation must independently enforce those prerequisites.

`MockItalianProvider` lists only `synthetic-italian`, labelled “Istituto dimostrativo — dati sintetici”. It does not list or imply a working integration with any real bank. Its account-type history starts at the earliest booked date actually present in the supplied fixture; no observed records produce `null`, rather than an invented history window.

## Pagination and refresh metadata

`discoverInstitutions` validates and collects a complete bounded catalogue. Discovery metadata declares maximum page size, page count and UTF-8 cursor size. Validation rejects oversize responses, control characters, duplicate institution identities within/across pages, repeated cursors, empty advancing pages, provider/environment/version mismatches and unknown fields. Exhausting the page budget throws; a partial catalogue is never returned as complete. Opaque cursors are preserved without interpreting them as offsets. The mock transaction cursor separately accepts only canonical safe integer offsets at its seven-record page boundaries.

Provider metadata separately declares user-present refresh support and an unattended request budget with a source reference. `null` means unknown; zero means no unattended allowance. Neither means unlimited requests. The fixture's four requests per 86,400 seconds are explicitly a **synthetic fixture policy**, not a universal PSD2/provider/bank guarantee. A scheduling service must apply any stricter runtime, entitlement, provider, institution or grant budget and backoff.

## Authorization and renewal

`ProviderAuthorization` separates `consentExpiresAt`, `scaDueAt`, `providerSessionExpiresAt` and `tokenExpiresAt`, each nullable when unknown. A required action names the actual provider operation and method, its source reference and due date. Consent, SCA and session actions must match their corresponding term exactly; validators reject invented dates, contradictory mappings, duplicate actions and unsupported renewal methods. Unknown expiry supplies no reminder deadline and must not be treated as an indefinite grant. A token expiry is not consent renewal.

`validateProviderConnectionGrant` checks agreement between the legacy consent-expiry field and the detailed authorization. It rejects undeclared credential fields and redirects containing credentials or a non-HTTPS scheme. Synthetic grants cannot redirect externally. The legacy connection-create contract continues to require a known consent expiry; the richer authorization validator can represent unknown terms observed from a future adapter without inventing one for an accepted local connection.

The mock renewal is an in-place synthetic operation for an active grant. It refuses revoked connections and, when a grant generation is supplied, stale generations. Explicit connection creation is the separate regrant path and refuses an unknown institution identity. The mock never fabricates an external consent page or regulated entity. Backend access gates must additionally check current time, actual usable authorization, profile ownership and outstanding revocation before provider I/O; contract validation alone is not an access gate.

## Validation

The new contract scenarios cover provenance/environment refusal, unknown real-looking labels, account-type specificity, evidence/date contradictions, discovered history, opaque cursors, duplicates, version drift, page exhaustion, unknown/zero refresh budgets, canonical transaction cursors, separate authorization terms, active renewal/revoked/stale refusal, grant expiry agreement and credential/redirect rejection. Run:

```sh
. /workspace/.lilleri-toolchain/env.sh
pnpm --filter @lilleri/financial-providers typecheck
pnpm --filter @lilleri/financial-providers test
pnpm --filter @lilleri/financial-providers build
```

These tests use original synthetic fixtures and injected test assertions. They do not provide real institution coverage, provider licence/contract evidence, live connector health or official sandbox acceptance.
