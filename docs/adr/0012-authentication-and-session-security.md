# ADR-0012: Authentication strategy and session security release boundary

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Architecture decision owner; implementation team
- **Decision gate:** D scoped design; real-bank beta and Gate E remain separately gated

## Context

FACT: historical [better-auth spike](../research/raw/toolchain-spikes.md) constructed a handler and passkey plugin; it did not perform registration, sign-in, recovery, mobile linking, refresh rotation or revocation. Current target is a synthetic loopback-only demo, not real-user authentication. ASSUMPTION: passkeys plus safe recovery and database-backed sessions can reduce account-takeover risk, but recovery/support paths are often weaker than the primary factor. A profile header is not authentication.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| Explicit mock identity now; evaluate better-auth for beta | Server-selected synthetic profile, then real session integration | No credentials required locally; owns EU-hosted session store | Team must verify auth/recovery/device flows | Current scope and historical construction spike |
| Managed OIDC identity vendor | Contracted authentication/session service | Outsourced primitives and mature ops | Residency/price/vendor dependency unknown until review | Vendor research with uncertainty |
| Custom password/session implementation | Fully in-house auth code | Maximum code control | High security/recovery maintenance and no justified benefit | Threat-model risks; no production evidence |

Proposal: better-auth with passkeys immediately. Critique: a library constructor is not security evidence and a synthetic app does not need a partially configured identity system. Counterproposal: clearly restrict local demo, accept better-auth as the beta candidate, and make every real auth/session/recovery path a tested release prerequisite. Decision: this staged strategy.

## Decision

DECISION: mock identity is server-selected, explicitly synthetic, bound to loopback by default and forbidden in production configuration. No client header can arbitrarily choose an existing financial profile. A production/remote deployment fails closed until a real authenticated principal and authorised memberships are implemented. Better-auth is the preferred beta integration candidate, not a claim of shipped passkeys/MFA.

Before real-user beta, test registration/sign-in/out, verification, session expiry, all-session/device revocation, account recovery, compromised-session response, step-up for export/deletion/linking, mobile secure storage and app/domain association. Passkey relying-party origins and Apple/Android app links must be verified, with safe lost-device recovery. Browser cookie sessions require Secure/HttpOnly/SameSite plus CSRF/origin defences for state-changing requests. Any refresh-token design needs rotation/reuse detection and atomic revocation; database sessions must validate lifecycle rather than merely accept opaque strings. Bank OAuth flows separately validate state/PKCE/nonce where applicable and do not expose provider tokens to mobile. All resource access checks object profile membership regardless of authentication success.

## Consequences

Positive: the setup proves the financial loop without secrets or fake security promises. Future auth remains replaceable behind a principal/membership boundary. Negative: no public or real-user service can be launched from the local mock configuration; actual passkey/device/recovery testing is work still needed. Passkeys alone do not stop social engineering, insecure support impersonation or leaked sessions. Biometric app unlock is a local convenience gate, not proof of server identity. Security/privacy functions never require a paid tier.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Demo identity exposed on public interface | Medium | Critical | Loopback bind, environment guard and no real data | Runtime accepts mock auth in production |
| Recovery bypasses strong sign-in | Medium | Critical | Step-up, bounded recovery and takeover tests | Support/email action grants unaudited access |
| Authenticated user accesses another profile | Medium | Critical | Membership checks and cross-tenant tests on every command | ID/header controls repository scope |

## Revisit conditions

Revisit auth vendor after actual device/recovery flow tests, maintenance/advisory issues or residency/contract changes. Production deployment is blocked until identity controls have code and runtime evidence. A move from mock to real auth is a distinct release milestone, not an environment variable quietly enabled during setup.

## References

- [Threat model](../security/threat-model.md); [security architecture](../security/security-architecture.md).
- [Historical auth spike](../research/raw/toolchain-spikes.md); [API contract](../architecture/api-contract.md).
- [ADR-0013](0013-deployment-and-environments.md).
