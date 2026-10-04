# Parallel development and release order

**Updated:** 2026-10-04, Europe/Rome. This executes the seven next-step phases requested by the founder. The existing [execution plan](../product/execution-plan.md) and its E00–E39 acceptance criteria remain authoritative. All development fixtures and browser writes are synthetic.

## Dependency order

| Track | Independent work | Integration dependency | Acceptance boundary |
| --- | --- | --- | --- |
| Preview and feedback | Compile the financial web UI once and serve exported assets; retain the current archive | None; already deployed as `3efd4ab` | Railway SUCCESS, fresh HTTPS health/demo reads and unchanged exact accounts. Public user feedback is still needed. |
| Sync correctness | Missing-ID ordinal identity, renewal aliases and immutable source audit | Complete bounded provider snapshots and retained consent revisions | Ambiguous identities stop atomically; source evidence never becomes a guessed match. |
| Pending and Inbox | Explicit pending transitions, carry compatible corrections, revisioned replacement and source-removal choices/undo | Canonical sync identity | Search, totals and Inbox share one lifecycle predicate. Ownership retains source records and decision history. |
| History recovery | Exact late-renewal intervals and CSV/XLSX recovery with seven-day candidates | Retained sources and ordinary reversible duplicate decisions | Explicit row choices preserve both sources; reimport respects earlier decisions, including undo after raw expiry. |
| Ledger and currencies | Scoped full-history search, bounded continuation, 90-day actual history and original/billed FX evidence | Authoritative pending/source decision projection | Cursor conflicts require a new read. Money remains exact and currencies separate; unprovided FX evidence stays unknown. |
| Identity and infrastructure | HTTPS account verification/recovery contracts, secure cookies, configuration readiness and PostgreSQL backup/restore drill | Real mail, approved notices, external keys and a current independent deletion journal before activation | Test delivery and a local restore drill do not establish deployed production delivery or recovery. |
| Official bank sandbox | Documented Yapily Modelo read adapter and zero-I/O prerequisite check | Issued application/consent and server lifecycle/source-admission integration | The read adapter is unregistered. Account creation, redirect/exchange, renewal/revocation and complete admitted sync remain separate work. No live-bank coverage claim. |

The correctness, import, ledger, identity and infrastructure tracks use isolated worktrees and can advance concurrently. Their integration happens on `codex/roadmap-integration`; only a tested combined increment is pushed normally to `claude/admiring-hypatia-yzh6nq` for Railway. No applied migration is rewritten, and no archive is reset to obtain a passing test.

## Combined release gate

1. Preserve the existing migration checksums and add only new migrations.
2. Run repository lint, typechecks and meaningful unit/API checks, including an isolated PostgreSQL target.
3. Build the compiled preview and exercise real browser flows on a new isolated archive: full-history search/detail/back, recovery import, explicit source decisions, exact manual amounts, locale and ownership export.
4. Keep hosted identity disabled in the synthetic preview. Configure real services through protected environment variables only after their runtime contracts are implemented and verified.
5. Publish the tested commit, wait for Railway SUCCESS, and verify fresh public responses and unchanged retained account identities/balances.

## External and implementation gates

The Railway synthetic preview is available. No issued bank application/consent, real mail credentials, approved public terms, external KMS or durable remote deletion-journal service has been supplied. The current journal implementation deliberately accepts only local synthetic keys and storage. Choosing a remote consistency/currentness contract is necessary before a real hosted runtime can use it. EU PostgreSQL provisioning, least-privilege runtime credentials, deployed backup/PITR, alert routing and recovery drills must be verified on the selected infrastructure.

These resources do not stop independent local work. They also do not erase remaining implementation: an unregistered sandbox reader still needs server lifecycle and source admission, and production readiness checks do not implement a remote journal. The next release records completed evidence and remaining software separately; it does not mark the whole banking MVP complete.
