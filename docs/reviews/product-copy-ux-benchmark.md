# Product copy and task flows

Research and local implementation: 3 October 2026. Public first-party websites and help articles were reviewed. These observations identify patterns used by established products; they do not establish conversion rates, comparative usability scores or the quality of their private applications.

## Sources and decisions

| Source | Publicly documented pattern | Applied to Lilleri |
| --- | --- | --- |
| [Monarch product](https://www.monarch.com/) and [getting started](https://help.monarch.com/hc/en-us/articles/360048393272-Getting-Started-with-Monarch) | Overview first; a searchable transaction list; account setup followed by category review; manual accounts as an alternative | Landing explains actual tasks; Home shortcuts open manual account/import, review and monthly summary screens |
| [Copilot product](https://www.copilot.money/) and [quick start](https://help.copilot.money/en/articles/11157550-quick-start-guide) | Product examples next to the value proposition; a dashboard review queue; reviewing and saving a transaction | A concrete expense/transfer example remains visible beside the hero; review guidance names the user's choices |
| [Copilot transactions overview](https://help.copilot.money/en/articles/9554412-transactions-tab-overview) | Search, filters, details, manual entry and export are described as user tasks | App copy names transaction details, manual accounts and importing movements; navigation shortcuts use existing handlers |
| [Wallet by BudgetBakers](https://budgetbakers.com/en/products/wallet/) | Distinct tasks for expense tracking, planned payments and cash flow; practical FAQ | Landing has task sections and native expandable questions on adding accounts, import, transfers, recurring estimates and data controls |
| [Spendee](https://www.spendee.com/) | Overview, manual cash entry and separate currencies | Overview copy names income/spending/accounts, and manual account entry is reachable directly from Home |
| [YNAB](https://www.ynab.com/) | A short sequence from starting to planning; specific next actions | The demo section gives three steps using Lilleri's actual screen names |

## Implementation boundaries

Short conventional action labels and general interaction patterns are reused. Distinctive competitor paragraphs, testimonials, artwork, award badges, commercial promises, pricing and branded slogans are not reproduced. The Italian and British English copy describes Lilleri's existing local synthetic functions. This publication applies the Italian copy to the committed application; the paired English catalogue remains in the main chat's ongoing localisation work.

The landing has a working in-page demo path, clear local availability and a loopback-only application link on localhost/127.0.0.1. A hosted landing does not invent a publicly available banking app. FAQs use native details/summary, keyboard focus styling and real destinations. Home shortcuts navigate without saving financial data or changing onboarding state.

Import explanations preserve the reasons for stable transaction codes, row-content comparison, preview confirmation and retry from the same preview, while avoiding implementation terms such as request identity. Separate source/manual balance semantics and the estimated status of recurring dates remain explicit. No bank connectivity, cancellation of subscriptions, live push, investment tracking or guaranteed savings is implied.

Changes in this publication are limited to the landing, an independent Home shortcut component, Italian UI text, one semantic manual-import heading and browser selectors affected by the new labels. The Home keeps its financial summary before the shortcuts. API contracts, ledger behaviour, main-chat implementation state and financial test fixtures are outside this change.

## Initial combined-workspace verification

These checks covered the UI changes alongside the main chat's localisation candidate. They are historical evidence and are separate from the exact published revision checks below.


- Web and mobile TypeScript checks passed; all 8 existing ICU/copy catalogue tests passed after the final text edits. Biome passed on the 12 affected copy/component/browser-helper files.
- An isolated Next production build passed with webpack; the default Turbopack attempt in that temporary copy refused dependency symlinks outside its project root. No repository bundler configuration was changed.
- A fresh isolated Expo web export passed. The already running shared CI-mode Metro preview retained the previous bundle, so it was not used as evidence for the new UI.
- 10 landing browser checks passed: valid destinations, demo CTA, keyboard FAQ/focus, 320/390/650/900/1440 px reflow and dark theme. No JavaScript errors.
- 13 app browser checks passed: the three Home destinations, keyboard activation, CSV/XLSX import entry, the same five widths and 48 px targets, English display and the zero-review fallback. No JavaScript errors or attempted data writes.
- The browser served the fresh export through a browser-local route at an existing allowed loopback origin. GET responses came from the actual synthetic API; display-only English preferences and the zero-review queue were injected in the browser. Saved profile preferences and financial data were not changed. This is navigation/rendering evidence, not a new end-to-end import or native-device claim.

Local reports: `/tmp/lilleri-copy-ux-landing-report.json`, `/tmp/lilleri-copy-ux-app-report.json`. Screenshots: `/tmp/lilleri-copy-ux-landing-desktop.png`, `/tmp/lilleri-copy-ux-landing-320.png`, `/tmp/lilleri-copy-ux-landing-dark.png`, `/tmp/lilleri-copy-ux-app-desktop.png`, `/tmp/lilleri-copy-ux-app-320.png`. The exact publication checks and branch review are recorded below.


## Publication and branch review

The remote default branch is `claude/admiring-hypatia-yzh6nq`, based on `5bbdec9f1d17ce807f1bb01f14bd041099d8d6bf` at the start of this review. The remote has no other branches or existing pull requests. Local `work` is an ancestor of that revision (zero unique commits), so its changes are already integrated.

The shared checkout is actively being changed by the main chat. The publication was prepared in an independent Git clone against the committed revision. It contains no API, database, financial engine, dependency or lockfile changes. The new Home shortcut component accepts display strings from its parent and has Italian defaults, so it works with both the committed app and the ongoing localisation candidate. The latter continues to supply the paired catalogue strings.

The uncommitted sync, XLSX, merchant, recurrence, offline, localisation and privacy integrations remain with the main chat. Their partial files and known open review findings are not evidence of completed functionality and are not included in this publication. CSV imports remain the file format supported by the published app.

Exact publication verification:

- Frozen-lockfile installation passed.
- `pnpm check` passed: Biome, operational-configuration tests/guard, all workspace typechecks and 550 unit/API tests. Three PostgreSQL-specific tests were skipped in the local PGlite run; the PR CI will run its PostgreSQL integration job separately.
- `git diff --check` passed; the browser helpers also pass Node syntax checks.
- The full production build passed: default Next/Turbopack and a fresh Expo web export. The final desktop navigation label also passed the mobile typecheck and fresh export.
- 17 existing financial browser checks and 9 existing mapped-CSV checks passed against an isolated synthetic archive. They verify actual writes, stale-command denial, exact amounts, duplicate prevention, settings, export and clearing volatile import state.
- 22 landing/Home navigation checks passed on the final export: keyboard actions, real destinations, hosted-origin demo messaging, zero-review fallback, themes and 320/390/650/900/1440 px layouts. No JavaScript errors or attempted writes occurred in these read-only navigation checks. The zero-review case injects only display data in the browser.
- The browser proxy served this clone's fresh export at an already allowed loopback origin and forwarded API requests to this clone's isolated synthetic API. The main chat's running services and archive were not used.
- The first remote CI run exposed an existing rollback assertion that depended on PostgreSQL row order. The assertion now sorts complete records by ID before comparing them; counts, amounts, timestamps and every other field remain checked. This is a test-only correction, with no application/API change.
- Remote CI and merge status are tracked in [PR #1](https://github.com/AsaroAlex/Lilleri/pull/1). Merge requires successful checks on the latest PR head.
