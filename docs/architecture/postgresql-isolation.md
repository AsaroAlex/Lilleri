# Reserved tenancy and PostgreSQL financial isolation

The implementation reserves `household_id` on the financial schema, with one personal household per financial profile. It adds `account_members`, fills an owner membership for every account, and reserves `scope = personal | business` on transactions and classification rules. There is no sharing, invitation or business-account feature. API/domain DTOs continue to describe the existing personal profile; database-only scope metadata is projected out of the financial export contract.

Migration `0015_tenancy_rls.sql` enables **and forces** row-level security on the financial tables, households, identity memberships and the identity user deletion boundary. Composite household/account and household/profile constraints accompany the existing profile-scoped references. Inserting a financial row derives its household from the profile and rejects a supplied mismatch or later tenant reassignment. Independent revocation, profile-deletion and key-deletion journals retain their household after profile erasure; minimal orphan routing fixtures can create a household skeleton without resurrecting a profile.

## Proposal and boundary

Proposal: make every HTTP financial query use a non-owner PostgreSQL role with transaction-local tenant context. Critique: an owner connection, session-level settings or an RLS migration unused by the API would not establish isolation. Authentication, profile bootstrap and cross-profile maintenance also cannot run behind an unset ordinary financial scope.

Counterproposal and adopted local implementation: `DatabaseHandle.db` is explicitly trusted and serves migrations, identity, bootstrap and maintenance. `DatabaseHandle.withProfile(profileId, callback, options)` resolves the reserved household through that trusted boundary and runs the entire financial callback in a separate transaction. It sets `app.profile_id`, `app.household_id` and `app.identity_user_id` with `set_config(..., true)`. Scope policies require both profile and household; an unset/empty context exposes zero rows. The API wrapper constructs financial services from the callback's database and waits for commit before sending a successful response. Existing service transactions become nested savepoints; read snapshot isolation is selected on the outer request transaction.

PostgreSQL can use an independently provisioned `runtimeUrl`. Startup rejects a runtime credential that is a table owner, superuser, `BYPASSRLS`, database/role administrator, a member of a privileged owner/admin role or a member of the trusted group. It requires membership of `lilleri_runtime`, and checks that trusted/runtime connections address the same database. This check pins both sessions and verifies two fresh random advisory-lock challenges in their database namespace; database names and network endpoint metadata alone are insufficient for Unix sockets, which report null endpoints. All temporary locks are released before clients return to their pools; query or cleanup failure destroys the affected sessions and fails startup. No statistics-view privilege or new migration is required. Runtime credentials never apply migrations. Passwords do not belong in SQL migrations, documents, logs or Git.

For deterministic PGlite and local PostgreSQL without `runtimeUrl`, the helper uses `SET LOCAL ROLE lilleri_runtime` on the trusted session. `runtimeRoleMode` records `trusted-session-role`, versus `separate-credential` for an independent login. Startup validates the assumed runtime role and its memberships in this mode too. This fallback executes financial statements under a non-owner role, but the session originally authenticated with trusted authority and can reset its role. It does not establish a separate credential boundary against arbitrary SQL execution. Real PostgreSQL tests use an actual non-owner login to establish the stronger financial-query boundary.

The trusted credential is currently retained by the local API process for explicitly trusted tasks. This is not a claim that every task/process has production least privilege or that a compromised application process cannot use its trusted authority. Production credential separation, deployment/network controls, TLS, operational access reviews and independent security acceptance remain separate gates.

## Credentials and grants

The migration creates non-login `lilleri_runtime` and `lilleri_trusted` groups, or validates existing groups. The migration credential needs role-provisioning authority for a fresh database; environments without `CREATEROLE` must pre-provision the reviewed groups. The migration owner joins the trusted group and can assume the runtime role for local fallback checks.

An operator can provision an independent runtime login using the following shape, with the password supplied through the database's secure credential workflow:

```sql
CREATE ROLE lilleri_api LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT lilleri_runtime TO lilleri_api;
-- Set a generated password with psql \password or an independently managed secret workflow.
```

Do not grant `lilleri_trusted`, migration ownership or an administrative group to that login. Supply its connection string privately as `DATABASE_RUNTIME_URL`; `DATABASE_URL` remains the local trusted/migration connection. Application code must use `withProfile` for all financial HTTP reads and writes. Identifiers come from the authenticated membership or trusted demo configuration, never a caller-selected profile in a JSON body. A worker that performs global enumeration uses its explicit trusted boundary, then must scope any ordinary per-profile financial work. A callback must await its database work before returning and must not retain the transaction handle for future requests.

## Atomic identity erasure

Only the profile deletion request supplies `identityUserId`, captured from the verified server-side principal. Before starting the runtime transaction, `withProfile` separately verifies that this user holds the profile's owner membership. Other requests set the identity context to an empty string.

The runtime role can read the `id` column and delete matching rows from `identity_users`; its RLS policy allows only the verified identity context. It cannot read email, password, tokens, MFA seeds, recovery codes, sessions, passkeys or membership tables. Deleting the identity user cascades credentials in the same financial transaction. A failure rolls back credentials, financial erasure, tombstones and revocation staging together. Key-deletion journals permit own-profile `SELECT` and `INSERT` staging only; completion remains trusted, and monotonic SQL triggers forbid destructive journal rewrites.

## Verification and limits

`apps/api/test/rls.test.ts` runs deterministic PGlite checks and, when `PG_TEST_DATABASE_URL` is supplied, provisions a disposable random-password login with ordinary runtime grants. Credentials and role-provisioning errors are not printed. It verifies populated fixtures for both profiles across the reserved financial tables, catalog `ENABLE`/`FORCE`, missing-predicate reads, zero-row foreign updates/deletes or stronger privilege denial, mismatched writes, nested rollback, concurrent tenant callbacks, and the same non-owner pooled connection after commit/rollback. It also covers scoped HTTP financial routes, exact money/export DTOs, owner-gated atomic credential deletion, authenticated encrypted erasure with injected rollback and a post-commit certificate, rejection of owner or mismatched-database runtime credentials, and quarantine refusal for restored PGlite copies.

An additional regression uses `PG_TEST_OTHER_CLUSTER_URL` for an independently provisioned second local cluster with the same database name, alongside a Unix-socket `PG_TEST_DATABASE_URL`. Both databases return identical null endpoint metadata. The separate runtime target must be rejected, and no runtime advisory verification locks may remain. This fixture is optional in the ordinary single-cluster run and is exercised separately with two disposable local PostgreSQL clusters; it does not establish transport encryption or production deployment isolation.

A SQL application role can set custom PostgreSQL context values; the server-side scope helper is the trusted source of those values. These policies defend against missing tenant predicates and accidental cross-profile references. They do not turn arbitrary SQL execution or application compromise into safe behavior. Parameterized queries, authorization and composite foreign keys remain necessary.

PGlite checks are not network-role evidence. Disposable local PostgreSQL establishes only the exercised role, transaction, pool and query scenarios; no deployed RLS acceptance, managed identity, backup/PITR, encryption-KMS, real household sharing or production readiness follows. The rest of E06.1, including the complete ledger/event/FX model, is tracked independently in the execution plan.
