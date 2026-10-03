# Zero-investment bootstrap

These dependency-free Node tools apply the founder's zero-initial-investment constraint to local development and economic planning. They do not deploy, open a checkout, contact a vendor or establish production readiness. Use Node 22.12+ and the installed, locked workspace dependencies.

## Start

From the repository root, activate the supplied toolchain if needed, then run:

```sh
pnpm economics:zero
pnpm check:zero
pnpm dev:zero
```

`economics:zero` reads the checked-in zero-cash scenario. Unknown costs stay unknown: the output does not invent profitability from an all-free beta. It reports a bank expansion block, not a purchase decision.

`check:zero` verifies the policy, current synthetic API entry point, existing builds and available ports without starting services, changing configuration or writing an archive. If builds are absent, `dev:zero` prepares them. Preparation uses the installed dependencies in offline mode; it does not install dependencies or call a cloud build service.

`dev:zero` builds API/client/brand dependencies, then starts:

| Service | Address |
| --- | --- |
| Synthetic API | `http://127.0.0.1:3191` |
| Expo browser preview | `http://localhost:8181` |

Only those two services are started; the Next project site remains separate. Ports occupied by another service cause startup to stop, leaving that service running. Press Ctrl+C to stop the preview. To use existing builds, run `node tools/bootstrap/run.mjs`; for just the API, add `--api-only`.

The launcher sets `DEMO_MODE=1`, binds the API to loopback, removes inherited provider/payment/cloud database credentials and `NODE_OPTIONS`, disables Expo dotenv loading, telemetry and online Expo operations, and uses embedded PGlite. It checks the source and built API for the current hardcoded synthetic provider and explicit browser origin permission. The API's loopback origin allowlist includes `localhost:8181` and `127.0.0.1:8181` for this separate preview; public origins remain rejected. These conservative checks are not a general network firewall or an audit of arbitrary future code.

Data is separate from the normal development archive, in ignored `.lilleri/zero-budget/data`. The local key vault is under the operating system user's home, `.lilleri-zero-budget/<repository-path-hash>/keys`, outside the database backup directory. The launcher also reserves a separate source-erasure journal path for API versions that implement that journal; setting the variable does not deliver source erasure. Preserve the vault when reopening an archive. Do not copy its keys into database backups. Synthetic demo limitations remain in force: use invented data, not real financial records. Existing development services and their databases are not reconfigured.

`policy.json` is the contract for this launcher and calculator, not the API's global runtime configuration or subscription entitlement source. It refuses paid external services, bank activation, checkout and free expiry. The rest of the application keeps its existing synthetic behaviour.

## Calculate a funded scenario

Copy `scenario.json` to a new file outside version control and replace its estimates with measured costs. It contains no customer identities or credentials. Then run:

```sh
node tools/bootstrap/report.mjs --scenario=/absolute/path/to/scenario.json
node tools/bootstrap/report.mjs --scenario=/absolute/path/to/scenario.json --json
pnpm test:bootstrap
```

The tool reads only and prints to stdout. It never overwrites an input. All financial inputs are integer euro cents; percentages are basis points (1,500 = 15%). Counts represent subscribers in the recognised monthly revenue base, not assumed purchases this month. Aggregate rounding is explicit integer cent arithmetic.

- Annual payments contribute one twelfth of their net charge to recognised monthly revenue. They are never automatically added to available cash.
- `cashAvailableAfterObligationsCents` must be actually collected, unrestricted funds after taxes and other existing obligations; expected sales are not cash. The proposed new bank obligation is assessed separately.
- VAT is removed from gross revenue. PSP and optional Billing percentage fees apply to the gross charge; the fixed processing fee is charged once per payment. A monthly subscription incurs that fee each month; an annual payment incurs it once annually. Stripe Billing's 0.7% is included in the example, not silently omitted from recurring checkout economics.
- `monthlyNetInvoiceCents` is the provider expense net of recoverable VAT. `monthlyCashInvoiceCents` is the actual cash outflow including applicable taxes/fees. Include users in all plans, minimums, licensing and extras in the quote. Zero connected users does not cancel a contract's minimum invoice.
- Setup, the full contractual commitment and at least twelve months of recurring costs/reserves must fit available cash. A longer contract length extends the reserve.
- The example 10% refund reserve is a planning assumption, not measured refund behaviour. Other costs must be quantified rather than erased from `unknownCosts` without evidence.
- Missing quote terms, incomplete delivery/billing, licence route, unresolved costs or insufficient cash prevent an expansion conclusion. Input booleans are declarations for planning, not authenticated evidence.
- Even an `eligible-for-further-review` result leaves checkout and bank access disabled. There is no automatic deployment or activation.

The finAPI table is a public **active-contract** benchmark, ex VAT, one included country, without add-ons. It includes the €260 minimum even at zero users. Italy/partner applicability and all extras still require an actual written quote. The bootstrap purchases no such contract, so its bank invoice is zero.

See [the launch decision and primary sources](../../docs/business/zero-investment-launch.md) for the commercial sequence and remaining costs.
