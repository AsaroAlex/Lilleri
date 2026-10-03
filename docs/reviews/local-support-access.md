# Local masked support access — E24.3

The local slice provides user grants, immutable access audit and a dual-approval workflow for **masked diagnostics only**. It does not unlock transaction content, decrypted provider payloads, account names, email addresses, merchants, descriptions or balances. Full production emergency content access remains unimplemented pending trusted operator identity, justified scope and release review. Synthetic tests are not human approvals or an incident drill.

## User boundary

The application registers only `GET/POST /v1/support-access` and `POST /v1/support-access/:id/revoke`. The server derives the financial profile from its existing principal, applies `FinancialScope`, and requires the owner for grant/revoke. Requests carry a structured ticket reference (`TKT_` plus 8–32 uppercase letters/digits), a reason enum and a duration between one and 15 minutes. They cannot supply a profile, operator identity or approval.

Every grant and revocation creates an immutable event in the same transaction. An optimistic revision prevents stale revocation commands; repeated revocation at the current revision returns the existing result. Grant expiry cannot be extended by editing the row. A new grant requires a fresh user action. Status reports the most recent 100 grants/requests without exposing staff identity; the complete profile-scoped journal is available through `SupportAccessService.export()` for data-rights integration.

## Trusted operator boundary

`SupportOperatorService` has no HTTP registration or CLI that accepts asserted actors. It requires an injected trusted `SupportOperatorIdentityPort.authenticate()` implementation for each action and a server allowlist. No adapter or operators are configured by default. Unit tests explicitly inject synthetic authenticated principals; these are not an operational staff identity implementation.

Principals have opaque operator IDs, MFA assurance and authentication no older than five minutes. An allowlist permission is independently required for ordinary `read`, emergency `request`, `approve` or `break_glass_read`. Ordinary support readers need an active user grant. Emergency requesters can receive only `request`/`break_glass_read`, so they cannot bypass dual approval through the ordinary read method.

Each emergency request is bound to the exact profile and active user grant. Its expiry is the earlier of the user-grant expiry and 15 minutes after request. The requester cannot approve itself; two distinct allowlisted, freshly authenticated approvers must approve before the requester can read. An approver alone receives no reading permission. A duplicate approval cannot manufacture a second approver. Approval/request/read events record the opaque authenticated operator, scoped request/grant and time, without financial content or free-form reasons.

Both ordinary and emergency reads return only total account/transaction counts and aggregate provider-class/status counts (`synthetic`, `manual`, `unknown`). These metadata remain potentially personal; masked does not mean anonymous. The trusted adapter must map real staff authentication to allowlisted opaque principals and implement staff credential/role revocation before any operational use. No real operator identity, staffing or legal approval is inferred.

## SQL and concurrent access

Migration `0018_support_access.sql` adds household/profile foreign keys, the reserved household trigger, `ENABLE`/`FORCE ROW LEVEL SECURITY`, and own-profile read policies. The financial runtime can create/revoke user grants and insert user audit events. It cannot insert approvals/requests or forge operator audit events. Approval validation additionally rejects self-approval, duplicate identities, more than two approvals, expired requests/grants and revoked grants.

Grant operations, approvals and reads lock the financial profile then the grant in a consistent order. Revocation commits before any subsequent read is permitted; expiry is checked under the same lock. A read that completed before revocation is recorded. The workflow does not pretend to retroactively retract an already completed response.

Requests, approvals and audit events reject SQL updates and direct deletion. The journal permits deletion only through profile erasure; foreign-key cascades remove its whole scope. A deleted profile therefore cannot retain an active grant or accept a support read. Root deployment/backup deletion guarantees remain separate.

## Verification

`pnpm --filter @lilleri/api exec vitest run test/support-access.test.ts` runs 14 tests covering user input/revisions, allowlist/MFA, zero/one/two approvers, self/duplicate approval, role separation, exact expiry/clock rewind, revocation after approval, cross-profile access, actual scoped SQL privilege/RLS denial, concurrent duplicate/revoke attempts, immutable audit and profile-erasure cascade, authenticator failure, and actual user routes with no privileged approval endpoint.

Use an isolated synthetic PostgreSQL database through `PG_TEST_DATABASE_URL` for the same suite. PGlite evidence alone does not establish an external IAM control, production least privilege or a human incident drill. The E24.4 tabletop, operator identity integration, external review and any expanded content scope remain open.

On 2026-10-03 the 14 tests passed both on fresh PGlite and real PostgreSQL in isolated synthetic database `lilleri_support_20261003_1935`. These are 14 unique scenarios, not 28 distinct tests. Migration 0018 is frozen at SHA-256 `31d14459822f7cf34297e2b235ead593fc569dd4f985e20d2e570ca641ff3b12`. The local journal lasts until profile erasure; a separately reviewed finite production security/support audit-retention policy and deletion process are still required.
