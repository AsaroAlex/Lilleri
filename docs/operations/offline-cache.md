# Encrypted read-only web cache (E20.1)

`apps/mobile/src/offline` provides a browser cache for an already verified server overview. It preserves the original accounts, money strings, inbox/analysis and summary together. It never recalculates balances from a transaction subset. A consumer must disable mutations while showing an offline snapshot and visibly display `savedAt`, the snapshot deadline and its stale/read-only status.

The scope is a web prototype with one complete bounded snapshot. The cache does not itself truncate a larger archive to 90 days; a future server projection must supply the complete bounded 90-day view and its authoritative balances/summary. Native secure storage and device-keystore integration are explicitly unavailable. Queued writes (E20.2) are not implemented.

## Authorization and integration

Create `createWebOfflineCache<DemoOverview>({ validateSnapshot, onDiscard })` once per mounted application instance. The validator must recognize the complete original server view. The cache additionally checks that `snapshot.profile.id` exactly matches the verified authorization profile. Pass a current online `LocalIdentitySession` to `authorize({ mode: 'authenticated', session, identityEpoch })`; `session.expiresAt` is the actual local-identity expiry. Do not invent a principal from HTTP input, extend expiry or restore an authorization from storage.

The actual Expo App now integrates that boundary. It captures the original
`LocalIdentityPanel` verified session callback, uses the real profile/session/epoch
and pins the complete serialized overview from the current successful online read.
A partial or recomputed view cannot match that pin. Network failures and browser
offline events may display the encrypted saved snapshot with visible save/expiry
times; structured HTTP failures, including source-erasure guards, never restore a
previous saved view. HTTP 401/403 removes authorization. The central App API gate
blocks every public financial method while disconnected except the overview retry,
including child generic requests, JSON export and ZIP creation. Dynamic settings,
permissions and source panels are hidden offline; the saved overview, transactions,
review evidence and recurring estimates remain readable without queued writes.

Every source/profile DELETE path drops the cache key before the fetch starts,
including unsuccessful or uncertain erasure attempts. Automatic expiry clears
displayed offline financial data through the synchronous discard callback. A
successful current online overview restores action availability after revalidation;
an earlier rejected action is never replayed.

An offline browser cannot discover an erasure or revocation performed on a separate
device or by the server. The short snapshot deadline and actual identity expiry
bound that retained device copy; the next online failure clears it. This is not a
claim that remote erasure instantly destroys every device copy. Received local
logout/session invalidation and this App's own erasure attempt do discard its key.

The synthetic demo requires `authorize({ mode: 'demo', profileId, sessionId, identityEpoch, ttlMs })` with an explicit TTL. The exported `OFFLINE_CACHE_LIMITS` is the single source of browser policy limits:

| Limit | Value |
|---|---:|
| Plaintext complete snapshot | 512 KiB |
| Encrypted snapshot | Plaintext plus the 16-byte GCM tag |
| Persistent snapshots | One |
| Default stale age | 5 minutes |
| Maximum configurable stale age | 15 minutes |
| Maximum explicit demo authorization TTL | 15 minutes |
| JSON depth / visited nodes / array entries | 32 / 32,000 / 10,000 |

Call `writeVerified(overview)` only after a successful current online fetch, with the current identity epoch fenced by the caller too. Read returns either `{ status: 'ready', snapshot, savedAt, expiresAt, readOnly: true }` or an empty/expired/invalid/unsupported status. A read never renews expiry. No cache method sends a financial request or enqueues a mutation.

On logout, HTTP 401, locally observed session revocation, profile change or deletion, call `discard` with the corresponding reason. It synchronously drops the active authorization and fences pending operations before the asynchronous conditional storage cleanup. `onDiscard` fires synchronously so the consumer can clear any currently displayed offline snapshot; it also fires when authorization starts, and for automatic expiry, corruption and clock rollback. Displayed plaintext remains the consumer's responsibility after a successful read. Unknown remote revocation cannot be discovered while disconnected: the real session expiry and short cache deadline cap this window, and the next online authorization check must discard a rejected session.

Every new page instance starts without a usable key and clears the previous encrypted record before accepting a new authorization. Reload while offline cannot restore a session or decrypt yesterday's snapshot. Multiple tabs have different volatile keys and can invalidate each other's single persistent slot; they fail closed rather than share a key.

## Storage and cryptography

The official browser WebCrypto implementation generates an AES-256-GCM key with `extractable: false`. The key is held only by the current in-memory authorization. IndexedDB database `lilleri-encrypted-read-cache-v1` contains a single `ciphertext/current` record: encrypted binary, a fresh 96-bit IV, format version, opaque random authorization ID, hashed context, sequence, byte count and expiry/save timestamps. No plaintext financial fields, user/profile/session identifiers, cookies, bearer tokens, original imported workbooks or keys are written to storage.

GCM associated data binds the format, profile, session, user, identity epoch, real authorization expiry, random authorization ID, sequence, timestamps and plaintext size. A new authorization uses a new key. Invalid metadata, foreign context, modified ciphertext, replay of an older same-page snapshot, malformed JSON, wrong profile and unsupported storage fail closed. Pending encryption/decryption and IndexedDB transactions check their authorization lease before and after asynchronous boundaries. Conditional cleanup prevents an older discarded session from deleting a newly authorized snapshot.

Both wall and monotonic clocks must move forward. A rollback invalidates the key. The effective clock cannot extend a deadline by holding back wall time; expiry is checked before/after storage and decryption and after payload validation. A browser timer also discards an expired authorization and signals the consumer without waiting for another read. Transient plaintext byte buffers are zeroed after use; ordinary rendered JavaScript values still exist in application memory while authorized.

## Verification

With the repository's pinned toolchain active:

```sh
pnpm exec vitest run apps/mobile/src/offline/cache.test.ts
pnpm --filter @lilleri/mobile typecheck
node tools/offline-cache-browser-smoke.cjs
pnpm exec vitest run apps/mobile/src/offline-api.test.ts
node tools/offline-ui-smoke.cjs http://localhost:8082 http://127.0.0.1:3004
```

The API-gate tests exercise the real API client with an observed fetch port: blocked
public methods send no request, and destructive requests invalidate before even a
failed HTTP response. `offline-ui-smoke.cjs` is the actual App browser helper,
covering Chromium IndexedDB, offline navigation/read-only controls, expiry, reload,
structured HTTP failure and authorization invalidation. Its browser clock advances
the expiry timer explicitly; it does not claim five elapsed wall-clock minutes or
native device validation. Run it only after source/deployment freeze with no other
synthetic financial writer, and report executed counts from its saved evidence.
The source-erasure check uses the actual data choice and acknowledgement controls,
then intercepts the resulting DELETE entirely inside Chromium. It waits for stored
ciphertext removal before returning a synthetic failure and checks that subsequent
network loss cannot restore that copy. It performs no source deletion on the server;
the report distinguishes this intercepted request from unexpected writes and compares
the actual server financial snapshot before and after the run.

The current App run passed **10/10 groups**, with zero uncaught page errors and zero
unexpected writes. Evidence is saved in
`/workspace/.lilleri-validation/continuation-offline-ui.json` and its `.log` companion.
The sole intended DELETE was intercepted locally, with `{data:'erase'}`, and never
forwarded. Actual encrypted IndexedDB storage, read-only controls, timed expiry,
online revalidation, source-erasure failure followed by network loss, reload refusal,
HTTP 500 refusal and HTTP 401 invalidation were exercised. Expiry used Chromium's
virtual clock. The shared economic invariant compares every transaction, all account
facts and complete analysis. It permits only monotonic, nonfuture freshness updates
on already confirmed `mock-italian` accounts; local account timestamps cannot change.
The first attempt is retained separately: all nine functional groups passed, and the
original byte-exact snapshot comparison detected those automatic mock freshness dates.

The unit suite uses actual WebCrypto, deterministic clock and delayed-storage ports. The standalone browser harness compiles the current production cache modules into a temporary directory, serves only that independent fixture on loopback and exercises real Chromium IndexedDB/WebCrypto. It contacts no financial API and writes no shared financial archive. It checks ciphertext-only storage, non-exportable keys, exact money, original summary, actual session expiry, reload refusal, the five identity boundaries, clock rollback, GCM/AAD corruption, delayed read/write fencing, valid-ciphertext replay refusal, bounds, native unavailability, automatic expiry and the production canceled-storage lease. Its JSON report contains check names and error categories only; the default path is `/tmp/lilleri-offline-cache-browser.json`.
