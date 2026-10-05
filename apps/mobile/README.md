# Lilleri mobile prototype

Expo / React Native app with a web export. In the default demo it uses the local synthetic API, real banking connections are unavailable and authentication is disabled. The optional local identity mode supports synthetic local accounts and sessions; it remains restricted to loopback development.

The hosted build (`EXPO_PUBLIC_HOSTED_AUTH_MODE=1`, produced by `tools/production/build.mjs`) adds email sign-in, the Plus subscription screen (Stripe Checkout and Customer Portal) and real bank connections through the server's Enable Banking redirect flow (`BankInstitutionPicker`). See the [production release runbook](../../docs/operations/production-release.md).

From the repository root, after installing dependencies and building shared packages:

```sh
pnpm --filter @lilleri/api dev
pnpm --filter @lilleri/mobile dev --web
```

The API defaults to `http://127.0.0.1:3001`, binds only to loopback, and refuses to start in production mode. Set `EXPO_PUBLIC_API_URL` before starting/exporting if the local API uses another configured loopback URL or port. The current server does not support access over a LAN. A native device's loopback refers to that device; native-device connectivity and execution remain unverified.

```sh
pnpm --filter @lilleri/mobile typecheck
pnpm --filter @lilleri/mobile build
python3 -m http.server 8081 --bind 127.0.0.1 --directory apps/mobile/dist
```

The production web export bundles the original local fonts and light/dark brand assets. The app preserves displayed data after a failed refresh, uses current transaction revisions for corrections, and requires explicit confirmation before disconnecting or deleting. Deleting the demo profile creates a persistent tombstone; it does not silently reseed on reload. Prepare a new local database to start over.
