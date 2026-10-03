# Local synthetic identity implementation

**Date:** 2026-10-03. This opt-in implementation runs on HTTP loopback with synthetic financial data. Both local identity and the existing demo reject production configuration. It does not authorise a public service, real bank data, native authentication or account recovery operations.

## Startup and browser boundary

Build the API, then start `@lilleri/api` with `LOCAL_AUTH_MODE=1`, a locally generated `LOCAL_AUTH_SECRET` of at least 32 characters and `LOCAL_AUTH_BASE_URL=http://localhost:3001`. Set `DEMO_MODE=0` (the root dev script defaults an unset value to demo mode). Set `EXPO_PUBLIC_LOCAL_AUTH_MODE=1` and `EXPO_PUBLIC_API_URL=http://localhost:3001` before starting/exporting Expo, and use localhost for both browser and API so Strict cookies work. The secret belongs in the local process environment and must be reused to reopen its synthetic identity database; it is never committed. Use `pnpm --filter @lilleri/api start`. The existing demo startup remains a separate mode.

Better Auth 1.7.7 and its supported Drizzle adapter persist credentials and sessions. Passkeys use `@better-auth/passkey` 1.7.7. Password hashing, challenge verification, encrypted TOTP secret/backup-code storage and recovery-code consumption use those libraries. Browser session cookies have HttpOnly and SameSite=Strict. Their HTTP loopback configuration deliberately lacks Secure; the server rejects production and public origins instead of presenting this as a production cookie configuration. State-changing requests require an exact configured Origin. Cookie caching is disabled and each financial request checks the database session, expiry, absolute 90-day session age and current profile membership. The API never authenticates with profile headers, bearer-like user IDs or financial object IDs.

Signup requires `adultAttested: true` and `termsVersion: "local-synthetic-terms-v1"` alongside name, e-mail and a 12–128-character password. A creation-time acceptance record stores separate self-attestation and local draft terms events; it is not proof of legal age or counsel-approved terms. The resulting owned profile has no accounts, connections or transactions until the user explicitly creates local accounts or connects the synthetic source. A request cannot select someone else's profile. Viewer memberships cannot mutate, and only an owner can delete the financial profile.

An injected `deliverVerification` adapter can enforce e-mail verification before password sign-in. Integration tests exercise delivery, verification and sign-in with a private in-memory sink. The standalone local server has no e-mail delivery adapter and allows clearly synthetic unverified accounts. Verification deliverability, password reset and safe lost-device/support recovery remain release prerequisites.

## Implemented routes

| Route | Local contract |
| --- | --- |
| `/api/auth/sign-up/email`, `/api/auth/sign-in/email`, `/api/auth/sign-out`, `/api/auth/get-session` | Supported Better Auth browser flow; response bodies omit session and provider tokens |
| `/api/auth/passkey/*` | Supported registration, authentication, list, rename and delete paths; challenge/origin/RP/signature checks and signed user-verification enforcement |
| `/api/auth/two-factor/enable` | Password-protected TOTP setup returns an enrollment URI and ten backup codes for the user's in-memory setup screen |
| `/api/auth/two-factor/verify-totp` | Confirms setup or completes a pending password sign-in; password alone cannot access financial routes after enrollment |
| `/api/auth/two-factor/verify-backup-code` | Completes a pending sign-in with an encrypted stored backup code; repeat and concurrent consumption are rejected |
| `/api/auth/two-factor/disable`, `/api/auth/two-factor/get-totp-uri`, `/api/auth/two-factor/generate-backup-codes` | Supported library management; recent authentication or an active step-up grant is required |
| `GET /v1/auth/principal` | Current trusted user, session, membership profile and role |
| `GET /v1/auth/sessions` | Owned active session IDs, timestamps and a current-session marker; no tokens, IPs or user agents |
| `DELETE /v1/auth/sessions/{id}`, `DELETE /v1/auth/sessions` | Owned single-session or all-session revocation, effective on the next request |
| `POST /v1/auth/reauthenticate` | `{password,code?}` verifies the password and requires a TOTP code if enrolled; grants five-minute step-up to that database session |

Export, disconnect and deletion require that five-minute grant and return `401 reauthentication_required` when absent or expired. Clients ask for authentication, refresh visible state and require a new explicit action; they must not automatically replay the protected command. Guards use the registered route identity, so percent-encoded paths cannot bypass them. Credential enrollment/management requires either authentication within five minutes or a current step-up grant. The local export also includes the authenticated user and acceptance/session metadata, excluding credentials, TOTP seeds, backup codes and session tokens. Financial deletion atomically commits its erasure/tombstone/revocation work and removes this principal's credentials, passkeys, TOTP recovery state, memberships and sessions before returning success. Credential cleanup shares the financial transaction, so failure rolls back both and concurrent session revocation does not interrupt an already authorised erasure.

## Executed evidence and remaining gates

`pnpm --filter @lilleri/api exec vitest run test/identity.test.ts` passes twelve integration scenarios using PGlite, including forged/expired/revoked cookies, cross-profile IDs/cursors/session attacks, removed/viewer memberships, encoded sensitive routes, atomic identity/financial erasure rollback and revocation interleaving, step-up expiry, Origin rejection, atomic local login quotas ignoring forwarding headers, bounded reauthentication attempts, verification delivery and TOTP/recovery lifecycle. Tests use no real e-mail, financial data or credentials.

After building the packages and API, `node tools/identity-passkey-smoke.mjs` runs Chromium and Playwright with a virtual CTAP2 authenticator. It verifies actual registration/sign-out/passkey sign-in, registration/authentication replay rejection, signed absent-user-verification rejection, tampered origin rejection, malformed persisted public-key rejection and session revocation. An optional first argument selects a Chromium executable. This is browser and virtual-authenticator evidence; native devices, biometrics, secure mobile storage, app/domain associations, accessibility and safe lost-device recovery remain unverified.

Local login/reauthentication quotas are bounded single-process controls, not distributed production abuse prevention. TOTP uses the library's time-window verification semantics; the backup-code one-use and WebAuthn challenge replay evidence do not imply a separate TOTP anti-replay counter. TLS, production Secure cookies, real delivery/recovery, protected authentication audit retention, session/verification cleanup, secret rotation/KMS, non-owner database roles, production RLS and independent staging security tests remain beta gates under [ADR-0012](../adr/0012-authentication-and-session-security.md).

## Client lifecycle evidence

The local identity panel stays mounted while its financial routes are hidden. Financial and security responses are fenced by their starting identity epoch; logout, revocation, erasure and a principal change clear both visible financial data and ephemeral enrollment secrets. Session renewal for the same principal preserves navigation but invalidates responses from the previous session. Cross-tab broadcasts clear state without waiting for the periodic session check. A protected action is never replayed automatically after step-up.

`tools/identity-ui-smoke.cjs` executed sixteen browser groups with zero JavaScript errors, including virtual UV passkey sign-in, TOTP/recovery, step-up and an explicit fresh export gesture, delayed overview/principal/setup/old-panel 401 responses, cross-tab logout, current-session revocation, immediate erasure, fresh signup after erasure and 320 px reflow. This is synthetic browser evidence, not biometric/device, delivery or production recovery acceptance.

When switching demo/auth mode or the public API URL, Expo must clear its transform cache. The workspace build/dev scripts use `--clear`; direct `expo export`/`expo start` commands must do the same. A final probe found the default-demo bundle reused during an opt-in export until Metro was cleared. A client build using stale public values must not be accepted as identity evidence.
