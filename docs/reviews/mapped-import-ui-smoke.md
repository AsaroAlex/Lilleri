# Mapped CSV web flow

`apps/mobile/MappedImportPanel.tsx` exposes the scoped mapped-import API through the existing five-tab Expo app. Under Movimenti, **CSV personalizzato** opens a three-step flow: choose an owned account and inspect the CSV header; associate its columns and locale; inspect the exact normalized rows before submitting them.

The delimiter, number/date formats, signed amount or separate debit/credit columns, fixed or per-row currency, external identifiers, distinct value date, merchant/reference and optional exact status aliases are explicit inputs. The file chooser checks 256 KiB before reading; pasting is also available. Saved definitions belong to an owned account, use the current revision when edited/archived/restored and retain imported financial history. The UI selects internal account IDs; provider account IDs in preview records are never used as ownership decisions.

Every input change clears the preview and duplicate acknowledgement. Rows without external identifiers disclose their file-content identity. Identical generated rows require a separate gesture to keep all of them; they are not silently collapsed. The commit uses the exact preview input and revision. A lost response retains its command ID for an explicit retry. A 409 discards the decision and requires a fresh preview without replaying the write. Successful import clears the CSV, preview and acknowledgement.

CSV text, file names, previews, pending IDs and notices exist only in component memory. Profile/reset-key changes immediately hide the old scope and clear it; requests, callbacks and file reads use epoch/version guards. Unmount ignores pending old responses. A new principal cannot inherit a previous preview or acknowledgement.

## Local synthetic browser validation

`tools/mapped-import-ui-smoke.cjs` requires the current synthetic `DEMO_MODE=1` API, current Expo bundle, Playwright and Chromium. Use an isolated archive without competing writers. It creates a dedicated synthetic manual account and leaves its audit/import rows for inspection. It does not provide native-device or real-bank evidence.

```sh
. /workspace/.lilleri-toolchain/env.sh
node tools/mapped-import-ui-smoke.cjs http://localhost:8082 http://127.0.0.1:3004
```

The helper checks owned account selection and explicit headers/formats; exact Italian money and separate value dates; preview invalidation; a simulated lost success reply after an actual server commit followed by the same command ID; stable-ID reimport; explicit generated-duplicate acknowledgement and its reset after editing; stale preview refusal after an intervening actual account change; saved mapping archive/restore; 320px reflow and 44px controls; ignored delayed errors after unmount; and zero browser JavaScript errors.

The result is written to `/tmp/lilleri-mapped-import-ui.json`, or the private path selected by `LILLERI_MAPPED_SMOKE_REPORT`. The report contains check names and an error summary rather than CSV rows or credentials. Source TypeScript/Biome checks passed; actual browser execution is recorded separately after the current runtime becomes available.

On 2026-10-03 the current API3004/Expo web8082 run passed **9/9 groups**, with **zero browser JavaScript errors**. The final result and log are `/workspace/.lilleri-validation/completion-mapped-ui.json` and `completion-mapped-ui.log`. Exact EUR balances use integer arithmetic: opening 200000 minor units, expense −123456 and income +1000 leave 77544; keeping both reviewed −250 rows leaves 77044; a separate +1 intervention and the later −300 import leave 76745. The lost-reply scenario commits on the actual server and retries the identical command ID. The delayed old-error scenario uses an explicitly simulated browser response.
