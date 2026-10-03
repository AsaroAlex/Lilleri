# Source erasure and authenticated generation replay

The local **E02.7 / E18.3** foundation offers an explicit connection choice: revoke and retain the imported history, or revoke and erase that source's financial rows. Source erasure retains other sources in the same profile, the profile's shared DEK, grant revocation routing, immutable consent history and necessary user audit history. It does not report that a remote provider, processor or old physical backup has deleted data.

## Durable boundary

`SourceErasureService.erase` captures one server instant under profile→connection locks. It records the exact owned accounts, transaction/account pairs, observation/account pairs, financial command/account pairs, consent generations, revocation jobs and pending creation-intent routing. The footprint comes from present owned rows before erasure; missing references are never invented as evidence of erasure.

`SourceErasureJournal` writes and fsyncs an HMAC-SHA-256 authenticated intent outside the database. It also writes an exact receipt digest anchor into the current independent profile key-vault directory. Anchoring verifies the actual expected wrapping key. A wrong vault cannot acknowledge the intent. Journal and vault directories are independent, private, checked for ownership and symlinks, and excluded from database backups. The server defaults the journal to `${LOCAL_KEY_VAULT_PATH}-source-journal`; `SOURCE_ERASURE_JOURNAL_PATH` may select another independent directory.

The durable intent precedes SQL deletion. A rollback cannot rescind the recorded request. The loaded epoch advances after the intent file is synced, so later writes cannot obtain an old-generation signature. `assertSourceErasureReady` blocks financial access until every loaded intent has an authenticated applied database receipt. A second direct erase also observes this gate: it cannot create revision 2 while revision 1 awaits recovery. Boot recovery must finish before the API or workers start.

Migration **0028** stores each signed receipt as profile-encrypted JSON, with immutable profile/source/revision/digest metadata and an `appliedAt` transition. The receipt is staged before dependent snapshot redaction and marked applied only after the financial transaction completes. Its household reference survives profile removal without permitting arbitrary household reassignment. Its independent current filesystem record remains the recovery authority.

Filesystem journal IO is serialized across profiles. Each source chain starts at revision 1, has no gaps and uses monotone server erasure times. The owned export validator additionally requires a complete monotone application chain, exact source membership and the current trusted HMAC verifier. Nonempty erasure receipts cannot become valid merely because their JSON was copied into an export.

## Legitimate regrant and conservative restore

A later authorized regrant may reuse the same connection, account and canonical transaction IDs. Erasure therefore does not delete every row with that connection ID blindly. Post-write callbacks record encrypted, domain-separated HMAC proofs for actual persisted accounts, transactions, observations and financial commands. Each proof binds profile, source, consent generation, erasure revision, server capture instant, exact membership and logical financial content. Provider `observedAt` never grants permission to survive an erasure.

Account/transaction digests exclude observation freshness, revision-only changes and user classification scope. Transaction text is decrypted before hashing; randomized re-encryption does not invalidate provenance. Observation proofs bind the decrypted original payload when it is retained. Expired raw payload absence does not mint a new authorization or invalidate its already recorded metadata. Replacing retained raw content fails verification.

Migration **0031** binds new idempotency commands to an exact owned account/source with a composite foreign key, and adds `manual_command` proofs. A command signature covers operation, request hash, response, server time and its actual decrypted balance-audit events. Restoring an old cached response or audit event alongside a newer valid signature fails. Legacy financial commands are attributable through their actual audit/account reference or a recognized response account captured while the account exists. Unknown orphan financial caches keep the restore quarantined. Only the repository's strict count-only legacy import report may remain without a financial membership assertion.

Replay preserves only authenticated subsequent generations with their authenticated account parent. It removes captured old membership, deletes attached raw payloads, cancels old sync leases/stages, and redacts financial report references while retaining sync counters and lifecycle status. When an old generation is revoked it clears its sync checkpoint; preserved newer authorized facts retain theirs. Captured IDs moved to another profile, source or account are rejected instead of bypassing the selector. Unknown restored membership without a subsequent signed authorization remains quarantined.

Creation intents are cancelled inside erasure and replayed by exact authenticated IDs/routing. Unsettled grants still require independent compensation; early revocation acknowledgement does not prove that an in-flight create cannot settle later. Missing or incompatible restored creation intents refuse release. Understanding snapshots and preference history are redacted through the verified receipt callback, using captured source generations so a newer snapshot with reused IDs survives.

## Encryption and recovery limits

This source choice is **row erasure with mandatory restore replay**, not source-specific crypto-shredding. The shared profile DEK stays live because another source must remain usable. An offline old source backup can still decrypt against that profile key before replay. Whole-profile deletion destroys the current local wrapping keys through the separate [profile encryption lifecycle](profile-envelope-encryption.md); it preserves source anchors so current replay cannot silently forget previous source actions.

The local CLI requires the current `--source-journal` whenever source receipts or vault anchors exist. It authenticates the independently current global journal and then replays the current source store even if the older global file does not list every later source action. Quarantine is released only after key effects, creation cancellation and source/snapshot replay succeed. See [the restore procedure](../operations/deletion-aware-restore.md).

The adapter is local synthetic filesystem storage, not a cloud KMS or an external deletion attestation. Privileged rollback of both the independent journal and its vault, copying historical vault material, disk remanence, exported plaintext and provider-held copies remain outside this proof. Each independent receipt is bounded to 1,000,000 bytes (encrypted JSON has its separate 1 MiB bound) and finite protocol reference bounds; oversized footprints fail without truncation. The foundation does not establish production-scale deletion-stream acceptance or backup expiry.

## Executed evidence

On 2026-10-03, **20 source scenarios, 14 encryption scenarios and 8 deletion-restore scenarios passed on both PGlite and a fresh PostgreSQL 16 database** with the reviewed migration chain through 0031 (including 0030). The source scenarios include real closed/copied/reopened PGlite backups both before erasure and after legitimate regrant, preserved other-source data, wrong vault/stale journal refusal, crash/rollback recovery, same-process retry fencing, cross-source ID movement, manual cache/audit transplant rejection, legacy ambiguity, signed complete exports and concurrent journal IO.

The compiled CLI smoke executed **5 checks** against an actual offline database copy: missing current source store rejected; stale current store left a quarantine marker; normal opening of that failed restore rejected; current replay retained the other source and removed the old source; release digest and outstanding revocation count matched the current independent journal. The two driver logs are `/workspace/.lilleri-validation/completion-source-erasure-pglite.log` and `completion-source-erasure-postgres.log`; the CLI evidence is `completion-source-erasure-cli.json` with its companion `.log` in the same directory. These tests use synthetic grants and do not claim remote provider deletion.

```sh
. /workspace/.lilleri-toolchain/env.sh
pnpm --filter @lilleri/api exec vitest run test/source-erasure.test.ts test/encryption.test.ts test/deletion-restore.test.ts
pnpm --filter @lilleri/api build
node tools/source-erasure-restore-smoke.mjs /tmp/source-erasure-cli-report.json
```
