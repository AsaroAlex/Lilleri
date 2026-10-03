# Local deletion-aware restore and deletion receipts

`apps/api/src/deletion-restore.ts` implements a local recovery boundary for **E18.3 / E24.5**. It authenticates an independent current deletion journal, replays tombstones before traffic, removes restored financial profiles and their associated identity users, invalidates every restored session and verification/reset token, and preserves grant-specific revocation work. `tools/deletion-restore.mjs` clones an offline PGlite snapshot into a fresh quarantine directory and releases it only after replay and configured independent key destruction complete.

This is a local synthetic recovery drill. It does not establish production PITR, backup expiry, physical media sanitisation, processor deletion, lawful retention, a contracted KMS, or protection against restoration of historical key-vault backups. A PostgreSQL production restore needs the same quarantine/replay boundary inside its deployment procedure; this tool does not operate `pg_restore` or publish a database.

## Journal contents and trust

The strict `lilleri.deletion-journal.v1` format contains only issued time, profile deletion tombstones, key destruction tombstones, and grant-specific revocation routing/status. It excludes balances, transactions, descriptions, names, email addresses, authentication tokens, provider credentials and encryption key material. Opaque profile, grant and connection identifiers are pseudonymous data: protect the journal and limit access. HMAC-SHA-256 authenticates integrity; it does not encrypt the journal.

The signing key, current key vault, current journal and its latest digest must remain **outside database snapshots**. A valid signature alone does not prove that a journal is current. Replay also requires the digest independently recorded for the latest journal and a trusted minimum issued time. An older correctly signed journal is rejected when it disagrees with that latest digest. The operator must obtain these trust inputs from the independent current recovery store, never from the stale snapshot being restored.

The signing key file is a private regular file (mode `0600`), containing 32 random bytes or 64 hexadecimal characters. It is supplied through `DELETION_JOURNAL_KEY_FILE`; `DELETION_JOURNAL_KEY_ID` identifies the signing-key generation. The script never prints the key or detailed JSON/schema errors. Its output contains the journal digest, issued time and aggregate counts.

## Local procedure

Build the current packages first:

```sh
. /workspace/.lilleri-toolchain/env.sh
pnpm build
```

For a backup, stop the local API and workers, close PGlite cleanly, then copy its database directory into an offline snapshot. Never include the independent key-vault directory or the current deletion journal in this copy. Keep the snapshot quarantined from any running API.

After erasure transactions and their key effects, export a **new** current journal; the command refuses to overwrite an existing file:

```sh
DELETION_JOURNAL_KEY_FILE=/private/current-recovery/journal-signing-key \
node tools/deletion-restore.mjs journal \
  --database-path=/private/local-db \
  --journal=/private/current-recovery/deletion-journal-current.json \
  --key-vault=/private/current-key-vault
```

Record the resulting digest and issued time in the independent latest recovery store. The current journal must advance after every relevant erase and updated key/revocation effect before it is used for recovery. This local command does not provide an external durable deletion stream or automatic independent journal delivery.

Restore only to a **new** directory, supplying the digest and minimum issued time from that independent current store:

```sh
DELETION_JOURNAL_KEY_FILE=/private/current-recovery/journal-signing-key \
node tools/deletion-restore.mjs restore \
  --snapshot=/private/offline-backup-before-erasure \
  --restore-path=/private/quarantined-new-restore \
  --journal=/private/current-recovery/deletion-journal-current.json \
  --trusted-digest=REPLACE_WITH_INDEPENDENT_LATEST_SHA256 \
  --minimum-issued-at=2026-10-03T10:01:00.000Z \
  --key-vault=/private/current-key-vault
```

A journal containing key tombstones requires the independent current key adapter. The current vault directory must already exist; the restore command does not silently create a replacement empty vault. Restored wrapped DEKs cannot substitute for that adapter. Key replay executes inside the financial deletion transaction; independent destruction runs after commit and must succeed before the tool releases the restore. It invokes destruction again when the journal already records a completed key tombstone. A destruction failure leaves the financial tombstone committed and the restore quarantined. Investigate the adapter, then retry into another fresh restore directory; the command refuses to overwrite the failed copy.

The tool creates `.lilleri-restore-quarantine` before opening the restored database. Successful replay records `.lilleri-restore-release.json`, closes the database, and removes the quarantine marker. Start the local API only after this successful result. The marker is an operational gate within the trusted local filesystem, not protection against an administrator who deliberately edits recovery files or bypasses the opener.

## Replay behaviour

- Verify schema, signature, latest digest and minimum issued time before the first database mutation.
- For each deletion, inspect restored identity membership and consent generations before cascades; enqueue restored grant revocations that the journal has not already captured.
- Preserve the original erasure time, remove the restored profile and associated identity users, and retain independent revocation jobs.
- Restore current revocation acknowledgement/status without extending existing deadlines. Reset restored `running` leases to `pending`; a historical lease must not authorise a new acknowledgement.
- Replay key tombstones and remove restored wrapped keys; invoke the current key adapter's idempotent destruction after commit.
- Invalidate **all** restored sessions and one-time verification/reset tokens, including tokens that are not foreign-key-linked to a financial profile. Surviving users must authenticate again.
- Retain profile tombstones so the normal demo bootstrap cannot recreate an erased profile. Replay is idempotent: repeated replay removes no additional already-erased profiles and preserves outstanding revocations.

The returned `safeToOpenLocally` applies to this configured local recovery boundary. Outstanding revocation jobs remain explicit and continue through the existing durable worker; they do not become confirmed merely because local financial data was deleted.

The current migration chain includes `0022_audit_parent_erasure.sql`. It preserves append-only direct-write protections while allowing immutable consent, notification and CSV/provenance descendants to follow their existing exact parent foreign-key cascades. Restored profile erasure can therefore remove these newly added audit rows; independent grant revocation work remains outside those cascades. A physical owned-source deletion removes its attached history while preserving independent profile/support history. The current recovery journal records profile/key tombstones and grant revocations; it does not provide a separate replay record for source-only erasure.

## Deletion certificate

`createDeletionCertificate` requires a committed profile tombstone and refuses a surviving profile. Its `lilleri.deletion-certificate.v1` receipt contains an opaque deletion reference, timestamps, local financial deletion status, configured key status and completed/outstanding/failed revocation counts. It contains no profile ID or financial/identity content. `externalProcessors: not_verified` and `backupPolicy: latest-authenticated-journal-replay-required` are deliberate factual limits.

The receipt is a local application record, not a signature by an external processor or a legal assurance that every backup or identity artefact has been destroyed. The HTTP deletion flow must capture it for the deleting owner before clearing the authenticated session; it must not add a public profile-ID lookup endpoint.

## Verification

The targeted test suite includes strict authentication/tamper tests, rollback fencing of older correctly signed journals, unrelated/duplicate records, zero writes for rejected journals, rollback when key replay fails, and withheld release when independent key destruction fails. Two filesystem drills close and copy actual PGlite directories:

1. A backup taken before erasure restores 35 synthetic financial transactions and an identity/session/token. Replaying the independent current journal removes those rows, preserves outstanding grant revocations, and blocks reseeding.
2. A backup taken before DEK destruction restores historical wrapped keys. The current independent local key vault rejects old ciphertext before and after replay; imported destroyed timestamps still trigger an idempotent current-vault destruction check.

On 2026-10-03, all **8 scenarios passed** against PGlite (13.94 seconds) and a fresh PostgreSQL 16 database (16.77 seconds, 17 checksum migrations). The two filesystem-copy scenarios deliberately use PGlite in both configurations. The compiled CLI was also exercised with an actual 35-row encrypted snapshot: normal opening was permitted only after release, restored financial/profile counts were zero, one grant revocation remained outstanding, the independent local key effect completed, and the release digest matched the independently supplied latest digest. Its aggregate evidence is saved outside the checkout in `/workspace/.lilleri-validation/deletion-cli-smoke-report.json`.

Run `pnpm --filter @lilleri/api exec vitest run test/deletion-restore.test.ts`. Keep integrated evidence in `PROJECT_STATE.md`/`docs/STATUS.md`; do not infer production backup acceptance from local test success.
