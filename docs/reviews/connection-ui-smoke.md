# Connection web flow validation

Source scope: `apps/mobile/ConnectionsPanel.tsx`, the root App management entry, connection additions to `@lilleri/api-client`, provider discovery and scoped consent lifecycle routes. This is a local synthetic Expo web surface; it does not provide real bank support, official sandbox, regulated-provider copy acceptance or native-device evidence.

The panel retains the existing five tabs. It shows per-account-type coverage and labels the fixture as a simulation. A configured unknown/unverified or environment-mismatched institution offers a manual fallback. It never enables a real-bank selection in the current synthetic runtime. Connection rows show actual consent, SCA, provider-session and token dates separately, saved freshness and plain-language lifecycle state. Pause/resume/renew use the current server revision. The event history labels inferred legacy events distinctly from provider/user events.

The panel keeps catalogue, lifecycle, error/notice, history and pending flags in volatile component memory. Every response and callback is fenced by the parent identity epoch and profile, including session renewal. A scope change immediately prevents rendering the previous scope's state before the effect clears it. Unmount invalidates pending reads. Mutation conflicts refresh evidence once and require another user gesture; a step-up error is passed to the parent's existing identity handler without replaying the action.

## Reproducible browser helper

`tools/connection-ui-smoke.cjs` requires a current `DEMO_MODE=1` API and current Expo web bundle with a **new isolated synthetic `PGLITE_PATH`**, Playwright and Chromium. It appends lifecycle audit events and leaves the connection active. Do not run it against a personal archive or concurrently with another writer on the same fixture profile.

```sh
. /workspace/.lilleri-toolchain/env.sh
node tools/connection-ui-smoke.cjs http://localhost:8081 http://127.0.0.1:3004
```

The helper checks:

1. Five tabs, four account kinds, truthful synthetic coverage, separate provider terms and 44px web controls.
2. Actual pause and denied sync, with unchanged consent generation/dates and financial snapshot.
3. Provider renewal preserving an existing pause and financial facts.
4. A stale revision from an intervening accepted command: one rejected browser request, refreshed evidence and no automatic resume.
5. A fresh explicit resume and unchanged original audit prefix/accepted-event sequence.
6. 320px reflow of history and controls without horizontal overflow.
7. An explicitly injected **synthetic unknown coverage browser fixture** with manual fallback; a separate actual server request refuses that unknown selection. This is a UI refusal scenario, not provider coverage evidence.
8. A delayed history error after panel unmount leaving the current page untouched.
9. Zero browser JavaScript errors.

The default machine-readable report is `/tmp/lilleri-connection-ui.json`; `LILLERI_CONNECTION_SMOKE_REPORT` selects another private validation path. Reports contain group names and error summaries rather than financial descriptions or credentials. Source typechecks/Biome and API lifecycle scenarios are separate from an executed browser result. Actual browser execution is recorded only after the current server/bundle are available.

On 2026-10-03 the current synthetic API3004/Expo web8082 run passed **9/9 groups** with **zero browser JavaScript errors**. The final report is `/workspace/.lilleri-validation/completion-connection-ui.json`. The unknown-coverage group uses the disclosed injected synthetic browser fixture and an actual server refusal; it establishes no real institution coverage.
