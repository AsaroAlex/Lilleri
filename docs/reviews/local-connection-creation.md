# Local synthetic connection creation

The HTTP integration previously awaited institution discovery and provider grant
creation while holding the scoped SQL transaction. `ConnectionCreationCoordinator`
separates committed preparation, provider I/O and a short revalidated apply. Its
current adapter is the in-process synthetic provider; this is not a live banking
authorization flow or evidence of a vendor idempotency contract.

Preparation locks the owning profile, reserves one open intent for the exact
profile/provider/institution and records a server-generated connection and consent
generation before provider I/O. The immutable baseline digest covers the profile,
connection, retained consents and consent-lifecycle revision, including ABA changes.
Discovery and grant calls run after that transaction commits. Apply rechecks the
same generation, deadline, current profile, lifecycle and outstanding revocations;
the connection, consent, lifecycle and applied intent commit together with one
fact timestamp. Caller cancellation or deadline expiry during SQL writes rolls
back the apply. Provider failures expose a bounded problem code, never raw errors.

Revocation and deletion cancel pending intents inside their scoped transaction.
The durable intent retains minimal exact-grant routing after profile deletion, so
the trusted compensator does not depend on a deleted profile or an HTTP target.
It queues grant-specific revocation through the existing outbox. Provider creation
is never retried or redispatched by recovery. An uncertain generation blocks a new
creation for that institution until its safety condition is actually established.

An acknowledgement of revocation before grant settlement does not prove a
permanent generation tombstone. Recovery therefore keeps unknown-settlement
intents open even after such an acknowledgement. An actually resolved local grant
marks settlement and rearms that exact revocation job; only a subsequent
acknowledgement can close the intent. A rejected provider promise also preserves
unknown settlement. If a crash loses the settlement observation, this local
implementation conservatively retains the fence. A future network adapter needs
reviewed remote finality or permanent generation-tombstone evidence before adding
automatic release; `grantSpecificRevocation` alone is insufficient.

`closeConnectionCreationWork()` stops admission synchronously and waits for full
creation requests, discovery, late provider settlement and compensation. The server
must await it before closing the database/provider during graceful shutdown. A
forced process shutdown may leave an uncertain intent, which startup recovery
keeps fenced. Recovery uses a bounded batch and rotates checked rows so a blocked
intent cannot indefinitely starve other profiles.

The existing revocation pump also awaits `afterBatch(settings, now)` for each
configured bounded cycle, including zero-job and operator-paused cycles. The
server binds trusted intent recovery there without adding a second timer or any
provider I/O while disabled. Shutdown drains this callback, and callback failures
use the existing bounded storage-failure signal. Three new actual-database
maintenance tests and the existing nine outbox tests pass on both drivers.

Source-erasure receipts capture only `{id, providerId, connectionId, consentId}`
for exact nonterminal intents. Restore replay requires the original profile and
connection plus authenticated receipt IDs. Missing or inconsistent targets fail
quarantine; unrelated sources remain untouched. The receipt owner separately
checks the immutable provider and consent routing.

Ownership export reads actual own-profile intent state and timestamps, omitting
household routing, credentials and provider payloads. Its strict schema validates
applied consent references, exact revocation targets and signed source-erasure
references for removed financial rows. An orphan intent legitimately has no
connection/consent row because preparation precedes financial insertion. These
records are state facts, not an invented historical event stream.

Migration `0029_connection_creation.sql` is frozen with SHA-256
`287b2830fb4a3255cec594d846cab8a979a9d1ccc20617104b7b494f00f9aa7c`.
The isolated tests use normal migration loading on PGlite and PostgreSQL 16.15.
The final 17 cases passed on both drivers. The suite also checks
early acknowledgement followed by late grant creation, failed-closed receipt
replay, strict own-profile export, protection of a newer provider generation and
graceful shutdown. Logs are recorded as
`.lilleri-validation/next-connection-creation-{pglite,postgres}.log` outside the
checkout. API type checking and scoped Biome checks also pass.
