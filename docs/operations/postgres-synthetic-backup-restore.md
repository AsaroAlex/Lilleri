# PostgreSQL synthetic backup and deletion-aware restore

`tools/postgres-operations.mjs` extends the existing deletion-aware recovery boundary to actual PostgreSQL custom dumps. It operates exclusively on disposable local synthetic databases. It does not configure Railway PostgreSQL, copy the Railway preview archive, provision a production backup service, or enable real banking data.

Running the command without arguments, or with `readiness`, performs no database connection, configuration-file read, Docker call or backup operation. It reports the execution requirements. Every operation requires `--execute --scope=local-synthetic` and a private configuration file. The dedicated source database name must start with `lilleri_synthetic_`; a restore must use a new `lilleri_restore_synthetic_` database. A production name or nonlocal endpoint is refused before connection. The maintenance login must be an administrator in the disposable isolated cluster; runtime credentials are neither accepted nor printed.

## Configuration and independent material

Build the API and its dependencies before execution:

```sh
. /workspace/.lilleri-toolchain/env.sh
pnpm exec turbo run build --filter=@lilleri/api
node tools/postgres-operations.mjs readiness
```

Keep the configuration in an existing private regular file (mode `0600`, owned by the operator), outside backup directories. This is the strict shape for locally installed `pg_dump`/`pg_restore` tooling:

```json
{
  "format": "lilleri.postgres-operations-config.v1",
  "scope": "local-synthetic",
  "maintenanceUrl": "postgres://MAINTENANCE_LOGIN@127.0.0.1/lilleri_synthetic_recovery_fixture",
  "transport": null
}
```

Use PostgreSQL 16 tooling and an isolated synthetic PostgreSQL 16 cluster. Private Unix-socket URLs are also supported. The test transport is a Docker container named `lilleri-postgres-ops-` followed by ten lowercase hexadecimal characters, with `transport: {"type":"docker","container":"ISOLATED_CONTAINER_NAME","socketDirectory":"/var/run/postgresql"}`. Its image must be `postgres:16`, its network must be `none`, and Docker inspection must confirm that the maintenance URL's host socket is the same directory mounted at `/var/run/postgresql`. This prevents tooling and JavaScript sessions from silently targeting different clusters. The script inspects mounts, image and network only; it does not print container environment values.

Set `POSTGRES_OPERATIONS_CONFIG_FILE` to the private configuration path, or supply `--config`. Supply two different, independently retained signing keys through `POSTGRES_BACKUP_SIGNING_KEY_FILE` and `DELETION_JOURNAL_KEY_FILE`. Each file must be private and contain 32 raw random bytes or 64 hexadecimal characters. `DELETION_JOURNAL_KEY_ID` identifies the current global journal generation (default `local-deletion-journal-v1`). The restore refuses identical backup and deletion signing keys.

The independently current key vault, source-erasure journal, global deletion journal, signing keys and trusted digests must stay outside backup directories. Wrapped profile DEKs are ordinary encrypted database rows and are present in the dump; the wrapping keys and source/global journal signing secrets are not. A historical wrapped DEK cannot replace the current independent vault. The local synthetic vault and source-journal adapter are mandatory in this tool; a contracted external KMS/journal adapter remains separate production work.

## Backup and current journal

Create a backup in a **new** directory. The operation never overwrites an existing archive:

```sh
POSTGRES_OPERATIONS_CONFIG_FILE=/private/current/config.json \
POSTGRES_BACKUP_SIGNING_KEY_FILE=/private/current/backup-signing.key \
node tools/postgres-operations.mjs backup --execute --scope=local-synthetic \
  --archive=/private/synthetic-backup-new
```

`pg_dump --format=custom` uses an exported read-only repeatable-read snapshot. The same transaction captures the applied migration checksums and the complete public-table RLS inventory. The resulting private archive contains `database.dump` and `manifest.json`. The HMAC-SHA-256 manifest authenticates exact dump byte count/checksum, migration checksums, RLS flags, server version and creation time. A failed operation does not produce an accepted manifest. The tool prints aggregate counts and a manifest digest; retain that digest independently rather than trusting a digest found inside the archive. Backup signatures authenticate integrity and do not encrypt the dump: protect the archive as sensitive synthetic financial/identity content.

After a profile/source deletion and its independent key effects, export a new global journal from the current source database:

```sh
POSTGRES_OPERATIONS_CONFIG_FILE=/private/current/config.json \
DELETION_JOURNAL_KEY_FILE=/private/current/deletion-signing.key \
node tools/postgres-operations.mjs journal --execute --scope=local-synthetic \
  --journal=/private/current/global-journal-new.json \
  --key-vault=/private/current/vault \
  --source-journal=/private/current/source-journal
```

The journal export refuses an existing output file. Record its digest and issued time in the independent current recovery store. A valid signature is insufficient evidence of freshness: the restore requires the latest independently supplied digest and a minimum issued time. Source-journal anchors in the current vault also prevent replacement with an empty or stale source store. Updating and retaining this independent journal automatically after each erasure is not established by this manual drill.

## Restore quarantine

```sh
POSTGRES_OPERATIONS_CONFIG_FILE=/private/current/config.json \
POSTGRES_BACKUP_SIGNING_KEY_FILE=/private/current/backup-signing.key \
DELETION_JOURNAL_KEY_FILE=/private/current/deletion-signing.key \
node tools/postgres-operations.mjs restore --execute --scope=local-synthetic \
  --archive=/private/synthetic-backup-new \
  --target=lilleri_restore_synthetic_review_20261004 \
  --trusted-backup-digest=INDEPENDENT_MANIFEST_SHA256 \
  --journal=/private/current/global-journal-new.json \
  --trusted-journal-digest=INDEPENDENT_LATEST_JOURNAL_SHA256 \
  --minimum-issued-at=2026-10-04T12:00:00.000Z \
  --key-vault=/private/current/vault \
  --source-journal=/private/current/source-journal
```

The manifest, exact dump bytes, reviewed migration checksums and current global journal are authenticated before creating a database. Existing destinations are refused. The target starts with `ALLOW_CONNECTIONS=false`, PUBLIC CONNECT is revoked, and every non-superuser's explicit CONNECT grant is revoked. Only trusted maintenance connections are enabled briefly for the atomic `pg_restore`; all non-superusers remain denied. The tool pins its maintenance replay session, disables new connections after import, and verifies that restored migration/RLS inventories equal the authenticated snapshot.

The existing authenticated replay then removes erased profiles and their restored identities, replays source-only erasures and creation-intent cancellation, reapplies key tombstones with the current independent vault, destroys current profile keys idempotently, invalidates all restored sessions/reset/verification tokens, and preserves outstanding provider revocation work. A stale source journal or failed independent key effect leaves the new database quarantined. Retry into another new database after investigating; do not overwrite or promote the failed database.

Even successful replay leaves **`ALLOW_CONNECTIONS=false` and PUBLIC CONNECT revoked**. The aggregate `lilleri.postgres-restore.v1` receipt identifies the accepted backup/journal digests and explicitly requires operator release. `safeToOpenLocally` inside its replay result means that the configured local replay completed; it does not promote the database or claim production safety. The database comment distinguishes unreplayed quarantine from replay awaiting operator release. An administrator can bypass these operational controls deliberately; such an administrator is inside the trust boundary.

A production release procedure must separately verify the complete current migration chain, current independent erasure streams/key service, TLS/residency, the approved runtime login and its non-owner RLS privileges, retained data and revocation state, then grant only that login the required CONNECT privilege and enable connections. This synthetic tool intentionally performs no such promotion. Restore neither copies historical vault/journal backups nor clears deletion tombstones to reseed data.

## Verified local drill and remaining acceptance

On 2026-10-04 the actual isolated PostgreSQL 16 drill passed **8 checks**, with **31 applied migration checksums**: custom snapshot dump, altered checksum/latest digest rejection before target creation, stale-source quarantine, profile/source deletions after backup remaining deleted, exact positive/negative minor amounts above JavaScript's safe integer limit, surviving ciphertext decrypted with the current vault, forced RLS and token invalidation, and refusal of an existing target or normal connections after replay. The report is `/workspace/.lilleri-validation/postgres-operations-drill-20261004.json`; its `productionBackupAccepted` remains `false`.

Run the no-network guard/authentication tests with `node --test tools/postgres-operations.test.mjs`. The actual drill needs an explicitly selected private admin URL file and the already provisioned isolated cluster:

```sh
node tools/postgres-operations-smoke.mjs --execute --scope=local-synthetic \
  --admin-url-file=/private/isolated-postgres/admin-url \
  --container=lilleri-postgres-ops-0123456789 \
  --report=/private/isolated-postgres/drill-report.json
```

The drill creates and removes only its fresh synthetic databases and disposable files. It does not stop the shared isolated cluster or modify other test databases. Invoking it without explicit execution flags prints requirements and performs no drill I/O.

Production acceptance still requires an approved EU PostgreSQL service with separate maintenance/runtime credentials and verified TLS/RLS, external KMS and independently current deletion/source journals, an encrypted off-cluster backup store with access/retention/expiry policy, provider and identity data deletion obligations, scheduled restore drills with RPO/RTO and alerting, and measured evidence from the actual deployed infrastructure. Local dump success is not evidence of Railway production PITR, processor deletion, backup expiry, lawful retention or recovery of a real user's bank data. See [the existing deletion-aware boundary](deletion-aware-restore.md) for journal trust and replay details.

The combined integration was rerun on 2026-10-04 against all **36 migration checksums**:
**8/8 checks passed**, including the newer identity, pending, quota and FX tables.
Report: `/workspace/.lilleri-validation/roadmap-postgres-drill.json`. Targets remained
quarantined; `productionBackupAccepted` is still `false`. The complete PostgreSQL API
regression passed 581 tests with one skip across 45 files in the same isolated cluster.
