# Hosted release readiness inspection

Date: 2026-10-04. `apps/api/src/hosted-readiness.ts` and
`tools/hosted-readiness.mjs` implement a zero-network inspection of proposed hosted
configuration. They do not start a service, create infrastructure, send email,
read a key store, connect to PostgreSQL or approve a release. The Railway service
remains a shared synthetic preview; its existing archive and synthetic guards are
unchanged.

## Executable check

Build the API and its dependencies with the pinned toolchain, then run the check
without arguments:

```sh
. /workspace/.lilleri-toolchain/env.sh
pnpm exec turbo run build --filter=@lilleri/api
node tools/hosted-readiness.mjs
```

The report has format `lilleri.hosted-readiness.v1`. Every gate contains only an
identifier, a fixed categorical status/code and the names of relevant variables.
No input value, connection URL, sender, credential, key reference or provider
exception is returned. Missing/malformed input is reported without an external
call. An unavailable build or an unsupported argument returns a generic error
and exit code 1. A completed inspection returns exit code 2 because
`productionReady` remains false, including when `configurationComplete` is true.
There is no force, live-probe or activation option.

`configured` means syntax and declared relationships are consistent. It does not
mean the resource exists or a contract, notice, role or restore has been verified.
The separate `unverified` gates retain those outstanding checks. The `blocked`
gates identify missing runtime integrations. No environment variable turns
either category into completed evidence.

## Configuration inputs

These are inputs to this inspection and proposed integration boundaries. They
are **not a supported production environment switch for `server.ts`**. Put
credentials in protected host variables for a separately reviewed hosted
environment. Do not add them to the public preview, Git, browser variables,
command arguments, screenshots or chat. References identify evidence or
resources; they are not key bytes, documents or an approval mechanism.

| Boundary | Inspection inputs | Validation and outstanding evidence |
| --- | --- | --- |
| Release mode | `NODE_ENV=production`, `HOSTED_AUTH_MODE=1` | Demo/local mode, PGlite/local vault and disabled TLS are rejected. The default server still cannot run this hosted mode. |
| Identity | `HOSTED_AUTH_BASE_URL`, `HOSTED_AUTH_SECRET`, `HOSTED_AUTH_TERMS_VERSION` | The existing hosted constructor enforces an exact public HTTPS origin, a secret of at least 32 characters and a non-synthetic version. |
| Email | `IDENTITY_MAIL_PROVIDER=resend`, `IDENTITY_MAIL_API_KEY`, `IDENTITY_MAIL_FROM` | The real Resend delivery adapter can be constructed without sending. Account entitlement, verified sender/domain, processor review, acceptance and inbox delivery remain unverified. |
| Notices | `HOSTED_AUTH_TERMS_URL`, `HOSTED_AUTH_PRIVACY_URL`, `HOSTED_NOTICE_REVIEW_REFERENCE` | Distinct same-origin HTTPS notice destinations without queries/fragments are required. Actual content, publication, version correspondence and legal approval remain unverified. |
| Browser | `EXPO_PUBLIC_HOSTED_AUTH_MODE=1`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_HOSTED_AUTH_TERMS_VERSION`, `EXPO_PUBLIC_HOSTED_AUTH_TERMS_URL` | Origin/version/destination must match the server. Public local auth must be disabled. Public variable names suggesting secrets, passwords, API keys, tokens, credentials or database URLs fail the inspection. The synthetic preview build explicitly keeps hosted mode disabled. |
| PostgreSQL | `DATABASE_URL`, `DATABASE_RUNTIME_URL`, `DATABASE_RESIDENCY=EU`, `DATABASE_REGION` | Distinct decoded principals must target the same database/host/port. Both URLs require `sslmode=verify-full`; parameter overrides of principal/host/role and duplicate TLS parameters are rejected. Optional `sslrootcert`, `sslcert` and `sslkey` references are inspected as configuration only. Actual certificate checks, EU placement, RLS and role privileges require an authenticated deployment check. |
| KMS | `KEY_MANAGEMENT_KIND=external`, `KEY_MANAGEMENT_PROVIDER`, `KEY_MANAGEMENT_KEY_REFERENCE` | A declared external provider/reference cannot substitute for a working `KeyManagementPort`. Independent durability, unwrap authorization, candidate cleanup and idempotent profile-key destruction must be implemented and exercised. |
| Deletion journal | `DELETION_JOURNAL_KIND=external`, `DELETION_JOURNAL_STORE_REFERENCE`, `DELETION_JOURNAL_SIGNING_KEY_REFERENCE`, `DELETION_JOURNAL_CURRENTNESS_REFERENCE` | Local source-journal paths/signing-key files are rejected. Real independent durable storage, authenticated currentness and restore fencing remain unverified. These references do not define or certify a new consistency protocol. |
| Backup/restore | `HOSTED_BACKUP_POLICY_REFERENCE`, `HOSTED_RESTORE_DRILL_REFERENCE` | Require independently checked evidence for the hosted deployment, including deletion replay before traffic and current-key effects. A local PostgreSQL drill remains synthetic evidence. |
| Provider | `FINANCIAL_PROVIDER=yapily` or `enable-banking`, `FINANCIAL_PROVIDER_ACCOUNT_REFERENCE`, `FINANCIAL_PROVIDER_CONTRACT_REFERENCE`, `FINANCIAL_PROVIDER_SCOPE_REVIEW_REFERENCE` | References declare the intended account, contract and scope review. Actual entitlement, authorized institutions/scopes and consent/revocation behavior remain unverified. No credentials are requested by this zero-network inspection. |

`hostedIdentityOptionsFromEnvironment` is an explicit dependency factory for the
implemented identity/mail library integration. It returns the sensitive options
and a real mandatory delivery port without invoking that port. Trusted callers
must never log or serialize those options. It does not call `createApp`, install
a financial scope or bypass demo/local guards. Rejected input produces a generic
configuration error without attaching malformed URLs or transport exceptions.

## Remaining release dependencies

The report always retains three implementation blockers in the current code:

1. A separately reviewed hosted entry point that supplies authenticated financial
   scope and all production dependencies. The existing synthetic entry point is
   deliberately unchanged.
2. An external key adapter and independently durable deletion/source-journal
   runtime integration. The existing filesystem `SourceErasureJournal` rejects
   external keys/production. Renaming a local store is not an implementation.
3. An official provider adapter integrated with the durable sync/lifecycle
   orchestration. A sandbox reader/readiness harness alone does not complete this
   path or authorize a real-account beta.

Resources must then be checked in dependency order: approved published notices
and mail delivery; EU PostgreSQL with verified TLS and separate credentials;
external key/journal behavior; deletion-aware restore and session invalidation;
provider contract/scopes and sandbox consent/revocation; a controlled real-data
release. Identity, operational provisioning and provider-account preparation can
proceed in parallel while their runtime dependencies remain explicit.

The synthetic PostgreSQL operations drill and the local deletion-aware restore
prove only their configured synthetic replay boundary. Neither their report nor
its reference completes `hosted_deletion_aware_restore` in this inspection. See
[deletion-aware restore](deletion-aware-restore.md) and
[hosted identity](../architecture/hosted-identity.md).

## Verification

The API tests cover empty and fully declared configuration, zero mail calls,
preserved hosted-origin/terms restrictions, synthetic-mode mixtures, malformed
mail configuration, same-origin notices/browser configuration, weaker or
overridden PostgreSQL TLS/targets/principals, local-store relabeling and removal
of sensitive input from reports/errors. Run:

```sh
pnpm --filter @lilleri/api exec vitest run test/hosted-readiness.test.ts
```

On 2026-10-04, all 49 configuration tests passed, the API type check and build
passed, and three executed CLI checks confirmed safe missing-input output,
secret redaction/public-token detection and generic rejection of arguments.
These checks used no real provider credentials, mail, bank or database connection.
