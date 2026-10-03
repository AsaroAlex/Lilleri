# Privacy web flow validation

Source scope: `apps/mobile/PrivacyControlsPanel.tsx`, the root App privacy entry, scoped privacy routes and audited metadata. This is the available local synthetic surface. It does not enable external AI, identified analytics, native push, an OS permission or legally approved production consent text.

On 2026-10-03 the current compiled API on port 3004 and freshly cleared Expo web bundle on port 8082 passed **10/10 actual browser groups**, with **zero browser JavaScript errors**. The disposable archive used frozen migrations through 0022. No other demo writer ran during this test.

The runner verified:

1. No opt-in controls for unavailable external AI or identified analytics.
2. Persisted rules-only mode removes actual merchant-dictionary classifications while retaining the owned accounts and transactions.
3. A new explicit choice reverses rules-only mode.
4. Current draft disclosure evidence grants only the available optional in-app service preference, while native push remains disabled and OS permission remains unknown.
5. An explicitly injected **synthetic obsolete-grant response** leaves the effective checkbox off and exposes independent withdrawal. Its actual server request contains only the current revision and `action: revoked`. The dedicated backend suite separately exercises genuinely obsolete stored disclosure evidence; this injected response establishes UI availability.
6. Withdrawal leaves the owned export accessible.
7. Independent quiet/private transaction flags persist; canonical finance and the owned transaction remain unchanged, and the export includes their privacy metadata.
8. An intervening accepted server change produces one rejected stale browser PATCH, refreshes the saved flags and requires another gesture. The UI does not resubmit automatically.
9. Controls have at least 48-point targets; 390px and 320px layouts have no horizontal overflow.
10. Browser reload preserves saved choices; cleanup restores rules-only/quiet/private to false and withdraws optional service delivery while retaining the choice audit and original financial facts.

The run exposed missing web checkbox state in the installed React Native Web adapter. The panel now supplies explicit `aria-checked`, `aria-disabled` and selected-button `aria-pressed` while retaining native `accessibilityState`. The final fresh-bundle run verifies the actual DOM state rather than only source props. A focused read-only review also confirmed ownership/RLS, optimistic updates and audit erasure, and verified the obsolete-grant withdrawal fix. Source review does not substitute for the executed tests.

The final report is `/workspace/.lilleri-validation/privacy-ui-smoke.json`; captured output is `/workspace/.lilleri-validation/privacy-ui-smoke.log`. Both belong to this final successful run. Earlier stale-bundle and helper-selector attempts are excluded from the successful count.

To reproduce, use a disposable synthetic demo archive, current services, Playwright and Chromium, and an exclusive writer slot:

```sh
. /workspace/.lilleri-toolchain/env.sh
LILLERI_PRIVACY_SMOKE_REPORT=/tmp/lilleri-privacy-ui.json \
  node tools/privacy-ui-smoke.cjs http://localhost:8082 http://127.0.0.1:3004
```

The helper verifies synthetic mode and initial unflagged metadata, then restores its flags/preferences in final cleanup. It does not erase the archive or its choice audit. Do not run it on personal data or concurrently with another fixture writer. Local browser evidence does not establish native-device behavior or production/legal approval.
