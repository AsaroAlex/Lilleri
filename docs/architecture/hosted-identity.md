# Explicit hosted identity integration

Date: 2026-10-04. FACT: the hosted constructor, delivery adapter, paired browser
interface and synthetic verification described here are implemented. This is a
separate opt-in application capability; the default server still rejects
production demo/local authentication. The Railway demo is not upgraded into a
public user service by this change.

## Configuration and application boundary

`createApp` accepts `hostedIdentity: {baseURL, secret, termsVersion, delivery}` and
requires its server-derived `financialScope`. `baseURL` must be an exact HTTPS
origin on the standard port with a DNS host. Only that same browser origin is
accepted. Host headers must equal its configured host; forwarding headers cannot
select a different authentication origin. It rejects simultaneous local/demo
identity, a preselected financial profile and automatic source seeding. Signup
creates an empty owned profile. The existing local and demo production refusal
guards remain intact.

The browser uses `EXPO_PUBLIC_HOSTED_AUTH_MODE=1`,
`EXPO_PUBLIC_API_URL=<the same HTTPS origin>`,
`EXPO_PUBLIC_HOSTED_AUTH_TERMS_VERSION=<reviewed version>` and
`EXPO_PUBLIC_HOSTED_AUTH_TERMS_URL=<same-origin published terms URL>`.
`EXPO_PUBLIC_LOCAL_AUTH_MODE` must be disabled. Both client and server reject
the local synthetic terms draft. Version/URL configuration is not proof of legal
approval: the reviewed notice itself must be supplied and published before use.
The interface links that notice and requires adult self-attestation and explicit
terms acceptance. It preserves the separate local synthetic copy when that mode
is selected. Native sign-in remains unavailable pending device validation.

Passwords, hashing, passkeys and MFA remain Better Auth1.7.7 integrations. Hosted
sessions require verified e-mail, use Secure/HttpOnly/SameSite=Strict host-only
cookies with the `__Secure-lilleri-hosted` prefix, validate current DB membership
and enforce an absolute30-day lifetime. Cookie caching stays disabled. Sensitive
financial actions retain their five-minute identity confirmation and require a
new explicit action afterward. Client financial state remains fenced by the
verified user/session/profile epoch.

Migration0036 adds HMAC-only atomic quota buckets shared across service instances.
They contain neither e-mail addresses nor caller-supplied IPs. Untrusted forwarding
headers cannot create new buckets. These deliberately conservative service-wide
limits bound a small controlled beta; they are not a claim of scalable edge abuse
prevention. Trusted edge controls and load-based capacity review remain separate.

## Delivery and recovery

`createResendIdentityDelivery({apiKey,from,baseURL})` is a concrete configurable
HTTPS adapter with a fixed `https://api.resend.com/emails` endpoint, a10-second
timeout and rejected redirects. It sends only recipient, configured sender and
the verification/recovery message. It awaits a successful provider receipt; this
is provider acceptance, not inbox-delivery evidence. The provider API reference is
[Send email](https://resend.com/docs/api-reference/emails/send-email).
UNKNOWN: real credentials, sender/domain verification, current account entitlement,
deliverability, pricing, processor/DPA review and actual provider API acceptance
have not been exercised. No account was created and no real message was sent.

The mandatory `IdentityDelivery` port has `sendVerification` and
`sendPasswordReset` functions. Environment recommendations for a separately
reviewed runtime are `HOSTED_AUTH_MODE`, `HOSTED_AUTH_BASE_URL`,
`HOSTED_AUTH_SECRET`, `HOSTED_AUTH_TERMS_VERSION`, `IDENTITY_MAIL_PROVIDER=resend`,
`IDENTITY_MAIL_API_KEY` and `IDENTITY_MAIL_FROM`. These names are recommendations;
the existing default `server.ts` does not consume them or activate this service.
Secrets must come from the host's protected environment, never public Expo
variables, repository files, command arguments or logs.

Hosted signup requires verification. Resend is available after delivery failure.
Mail exceptions are tracked per request because Better Auth catches its awaited
background-task errors. A failed transport returns503 with a safe error code
instead of a false signup/recovery success. An unregistered address receives the
library's generic recovery response and no message.

Recovery adds `POST /api/auth/request-password-reset`,
`GET /api/auth/reset-password/:token`, `POST /api/auth/reset-password` and
`POST /api/auth/send-verification-email`. Callback destinations are checked
against the same exact origin independently of the library's ambient trusted
origin settings. Reset tokens expire in15 minutes and are consumed atomically.
The password update and all-session revocation run together on one transaction-
bound supported library adapter. A failure revoking sessions rolls back the
password change and token consumption. Concurrent reset requests have one winner.
Reset preserves enrolled MFA; the new password alone cannot bypass it.

The browser callback is `/?identity=recover`. It takes the token into volatile
memory and immediately removes token/error/marker parameters from history.
The form requires matching new-password fields. Success clears identity state,
announces revocation to other tabs and returns to a new sign-in gesture. No
financial operation is replayed. The hosting layer must serve the static app with
`Referrer-Policy: no-referrer`, avoid logging callback query strings and keep
third-party resources off recovery pages. The API also sets that referrer policy.
Email-only recovery does not disable MFA or bypass a lost-second-factor gate.

## Executed synthetic evidence

- API: existing12 local-identity integration cases and15 hosted/mail cases pass
  on both PGlite and isolated PostgreSQL16. Hosted cases include verification, Secure cookie attributes,
 30-day session limits, membership isolation, missing/cross origins, callback
  spoofing, recovery expiry/replay/concurrency, an actual SQL-trigger failure
  proving reset/revocation rollback, retained MFA and transport failure handling.
- Mobile: six new recovery/client contract cases and the existing35 cases pass.
  They verify configured terms, same-origin redirects, token removal, private POST
  token submission, safe errors and the absence of automatic sign-in/financial
  command replay.
- `tools/hosted-identity-ui-smoke.cjs`: five actual browser groups pass with zero
  page errors. The script creates an isolated in-memory PGlite archive and a
  loopback-only HTTPS server with an ephemeral self-signed certificate accepted
  only by its private Chromium context. It exercises signup acceptance, resend,
  verification, actual Secure cookie storage, reset/history removal, new-password
  sign-in, invalid links,320px reflow and a visible delivery outage.
  It uses a private memory mailbox, not a provider. It is not deployed-TLS,
  real deliverability, native device or real-user acceptance evidence.

Release blockers remain external KMS and independently current durable erasure
journal/anchors, deployed PostgreSQL/TLS/non-owner credentials, backup/restore
proof, approved notices and processors, real mail sender/credentials, trusted
public origin and end-to-end staging validation. Existing filesystem key/journal
providers explicitly remain local-synthetic and cannot satisfy those gates.
