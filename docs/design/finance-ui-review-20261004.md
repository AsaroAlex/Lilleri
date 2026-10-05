# Finance UI review — 4 October 2026

## Scope and release status

This review covers the finance interface and explicit retirement of synthetic fixtures prepared at `ba1eff206dc6f512bd7bb6fc5f4bd514f5a2952d`. The user requested clearer accounts and transactions, original category illustrations, compact search and filters, understandable review decisions, and Privacy inside Settings. It also covers the request to remove test data before trying personal bank connections.

Published on 5 October 2026 at [Lilleri](https://lilleri-production.up.railway.app/): commit `875973dbd2b8780f0c8981e2c0f8ee89ad7dc1df`, Railway deployment `a7fb1b6c-619f-4a16-a24f-b9eb2d0f89d9` **SUCCESS**. The bank-setup heading semantics and final empty browser acceptance passed. Fresh public health, exact new JavaScript asset, overview, search and projection reads returned 200; active records are zero. A read-only public ownership export retains all 35 mock transactions, 5 accounts and 1 connection, with retirement revision 1 and one immutable event after the second deployment. [Release evidence](../operations/finance-ui-clean-release-20261005.json).

## Applied design changes

| Area | Resulting behaviour |
| --- | --- |
| Home | A compact spending summary selects one currency at a time on narrow screens and shows currencies side by side on wide screens; EUR and GBP remain separate. Income and pending movements remain visible, while calculation explanations expand on demand. Account tiles use original finance illustrations, names and complete balances. The review prompt follows the accounts. |
| Accounts and categories | Original, consistent illustrations distinguish banks, cards, cash, savings and spending categories. Text labels accompany the images; institution identities and logos are not invented. |
| Movements | Transactions group under dated headings. Each row combines category illustration, merchant, category/account and a right-aligned exact amount. Exceptional states remain visible. Long amounts adapt on narrow screens. |
| Search and filters | Search, history period and a compact expandable filter toolbar replace repeated control boxes. Account, currency and date criteria remain available; active criteria can be removed or cleared. The status selector groups All, Pending and Review. |
| Review decisions | Category selection and reconciliation have explicit prompts and action effects. Supporting detail expands when needed; already verified decisions are secondary and can still be undone. Source decisions preserve stale-proof rejection and the separate confirmation for removing a source transaction from the active view. |
| Settings | Settings replaces Privacy in primary navigation. Privacy and data controls, permissions, ownership export and deletion remain reachable inside it. Navigation uses the same illustrated icon family on desktop and mobile. |
| Empty state | A wallet illustration and “Prepare the connection” action explain the next step without fabricated amounts or charts. The interface states that personal access and a bank connection still need configuration. |

The financial hierarchy remains source-backed: account balances are observations, spending is a period aggregate, pending movements are separate, and privacy exclusions remain effective. No budget progress or converted total is fabricated.

## Competitor references

The following official pages were read for interaction patterns, not copied artwork or brand styling:

- [Wallet: Working with Filters](https://support.budgetbakers.com/hc/en-us/articles/7076754432146-Working-with-Filters) documents period, account and category filtering.
- [Wallet: Dashboard cards and widgets](https://help.budgetbakers.com/wallet/a/add-or-modify-dashboard-cards-widgets-7150077480850) prioritises accessible financial summaries and warns that duplicate transactions affect statistics.
- [Money Manager: Home tab](https://help.realbyteapps.com/hc/en-us/articles/360046150874-Home-tab) documents search, filters and daily/calendar views for navigating transaction history.

## Verification

The release owner completed the following checks. The reviewer independently inspected the listed screenshots and read the visual, interactive and preservation reports.

- `pnpm check`: 23/23 gates passed. API tests: 583 passed and 3 skipped on PGlite; 585 passed and 1 skipped on PostgreSQL. Provider tests: 265 passed.
- Visual acceptance: 14 checks passed, including widths 320, 390, 599, 768, 960, 1024, 1180, 1280 and 1440px; complete monetary amounts, separate currency selection, date grouping, expandable filters at 320px, nested Privacy/export access, and dark appearance without browser errors.
- Interactive browser flows: 8 checks passed, including search/detail/back navigation, exact manual money, reload persistence, English preference persistence and verified same-origin ZIP export. These ran in an isolated seeded fixture before enabling the empty shared-preview guard.
- Source decision flows: 5 baseline and 7 guided checks passed. Financial decision proof and destructive-action safeguards remain intact.
- Archive transition: an isolated seeded archive retired 35 proven mock transactions, 5 mock accounts and 1 mock connection while preserving one manual transaction, account and connection. The manual balance remained exactly EUR 97.75. Personal writes were blocked before payload parsing, mock reconnect was blocked, and the synthetic institution catalogue was empty.
- Final UI-only refinements passed mobile typecheck/build and targeted browser acceptance after the full repository check: empty Home/setup/ledger/nested Privacy at 320–1440px, and a read-only account observation at 23:30 UTC displaying the next date in Europe/Rome without changing money.

Evidence is stored in the workspace validation directory:

| Evidence | File |
| --- | --- |
| Populated mobile Home | `/workspace/.lilleri-validation/finance-final-mobile.png` |
| Narrow ledger | `/workspace/.lilleri-validation/finance-final-ledger-320.png` |
| Empty desktop/mobile | `/workspace/.lilleri-validation/finance-empty-desktop.png`, `/workspace/.lilleri-validation/finance-empty-mobile.png` |
| Visual acceptance | `/workspace/.lilleri-validation/finance-visual-acceptance.json` |
| Interactive flows | `/workspace/.lilleri-validation/finance-interactive-ui.json` |
| Preservation | `/workspace/.lilleri-validation/finance-clean-preservation.json` |
| Guided source decisions | `/workspace/.lilleri-validation/guided-source-decisions-ui.json` |

The independent backend review found two active-view remnants: mock merchant resolutions and old mock sync issues in mixed accounts. Both were corrected before integration. Separate PGlite probes confirmed empty merchant resolutions, preservation of a valid `keep_manual` decision as a manual movement in overview and ledger, and rejection of malformed personal CSV/manual JSON before parsing.

## Actual limits

No further blocking layout issue was identified in the inspected final screenshots. User comprehension and preferences still need feedback on the published result; these checks establish rendering and functioning paths, not a usability study.

Synthetic fixture retirement removes proven test records from active views; it is not physical erasure of the owned archive. Canonical rows, user edits and immutable audit remain retained and exportable. Manual and genuine CSV records, explicit `keep_manual` decisions and mixed accounts remain protected. Removing the launch flag does not silently restore mock data.

Live bank connectivity is not active. No real provider resources or authorised personal connection have been supplied. The shared empty preview refuses personal financial payloads until protected access exists; it must not be presented as a private financial account. The setup screen prepares the required configuration rather than simulating a successful bank connection.
