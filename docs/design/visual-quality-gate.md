# Visual quality gate

**Date:** 2026-10-02. **Status:** executable review specification; not a certification. This document distinguishes evidence from planned checks. [Wireframes](wireframes.md) and [design system](design-system.md) are specifications, not proof that a screen is implemented. Gate F requires conceptual usability validation; Gate G requires brand craft/recognition evidence. Neither is passed merely by creating documents or tokens.

## Evidence and outcome rules

For every run record commit/build, platform/OS/browser, viewport, device text scale, theme, locale, motion setting, fixture name, screenshot/video path and reviewer. Use synthetic fixture data only in the repository. A check can be **PASS** (evidence attached), **FAIL** (finding/action), **NOT RUN**, or **NOT APPLICABLE** (reason). Do not turn an unimplemented flow into a passing empty screenshot.

Release-blocking failures: incorrect/truncated financial amount; unsupported zero instead of unknown; stale/partial data shown as live/complete; consent/permission action obscured; destructive/paid consequence hidden; inaccessible primary action; missing alternative to gesture; body/control contrast failure; loss of rule/undo/source evidence; any real credential/PII in screenshot; a public claim stronger than implementation/provider/counsel evidence. Brand-only polish issues are major/minor unless they prevent recognition or legibility.

## Required visual and behaviour matrix

At minimum capture Home, Movimenti, transaction detail, Inbox (populated/empty), institution picker/trust moment, sync, connection management, privacy/export/delete and supported launch paywall. For each implemented screen run both themes at **320/375 px compact** and **430 px large mobile** equivalent; also native small/large device sizes and tablet/desktop surfaces where actually supported. Web reflow tests 320 CSS px and 200% text/400% zoom where applicable. Native text scaling uses platform maximum accessibility sizes with stacked layouts.

| Check | Fixture/action | Pass condition / verification |
|---|---|---|
| Light and dark | Same fixture/theme toggle + system theme | All surfaces, text, chart, focus, disabled, error and modal colours read matching semantic tokens. Actual foreground/background pairings tested; no white modal or black-on-dark-primary label. Screenshots independently inspected. |
| Small and large device | 320/375 and 430 px; native device pair; landscape where supported | No horizontal overflow of normal content, hidden CTA, clipped top/safe-area/tab label. Insets and keyboard handled. Large screens grow margins, not text columns without limit. |
| Dynamic Type / large text | 100%, 150%, 200% and native largest accessibility sizes | Amount/sign/currency remain complete; rows grow/stack; sheet scrolls; fixed controls do not overlap; all words/actions available. Never disable OS scaling to pass. |
| Text/non-text contrast | Automated contrast computation + inspect rendered roles | Body ≥4.5:1, large text ≥3:1, meaningful controls/focus/chart marks ≥3:1. Verify on actual surface, including selected/pressed/error. Thin decorative border may be lower only when it carries no affordance. |
| Focus/keyboard | Tab/Shift-Tab/Enter/Escape, visible focus, sheet launch/dismiss | Logical order; no trap outside modal; focus not obscured; returns to launcher; actions work without mouse. Native switch/keyboard checks where supported. |
| Screen reader | VoiceOver/TalkBack + web accessibility tree | Correct headings, names, role/value/state; amount including sign/currency; selected tab; error association; grouped rows. No duplicate logo/amount reading. Completion announced once. |
| Touch targets | Measure bounding/hit rects, test adjacent targets | ≥44×44 pt, ≥48 dp Android where practical; non-overlap; close/menu/category controls pass. Icon glyph size is not accepted as hit size evidence. |
| Reduced motion | OS/browser reduce-motion enabled; sync/save/complete | No spatial travel/count-up/shimmer dependency; same state/action/undo visible; no flashing. Actual waiting state persists with text. |
| Colour independence | Grayscale, simulated colour-vision deficiency | Signs, text statuses and chart markers/patterns preserve meaning. Transfers, expenses, warnings and selected nav do not rely on red/green or hue alone. |
| Long merchant | “SUMUP *BAR CENTRALE DI GIUSEPPE E FIGLI SOCIETÀ A RESPONSABILITÀ LIMITATA”; 80+ chars | List two-line truncation with full accessibility label; detail full wrapping; money intact; actions not pushed out. No made-up shortened merchant. |
| Long category / locale | “Manutenzione e spese straordinarie della casa”; German/French long strings in pseudo-locale | Wrap/expand, no overlapping icon/control, category available in detail/accessibility name. No concatenated translated fragments. |
| Large positive value | **€ 1.234.567,89**, multi-million balance/list and headline | Entire value/sign/currency readable at 100/200%; tabular figures; no ellipsis/scientific notation unless an explicitly labelled chart scale. Minor-unit exactness checked against fixture. |
| Negative and zero | **−€ 1.234,56**, **€ 0,00**, negative balance, refund vs inflow | Explicit sign/meaning; no colour-only state; no “good/bad” copy. Zero differs from unavailable. Refund retains linked expense/period policy. |
| Multiple currencies | EUR, GBP, USD, CHF; original `CHF 1’234.50` value | Shared locale formatter uses actual currency/precision; original amount available; any conversion states base currency, FX date and estimate. Never add raw EUR + USD values. |
| Pending to booked | Pending amount/date → final amount/date + identity link | Pending “In attesa” shown; totals follow booked/pending policy; no duplicate/fake second row; navigation stable; explanation survives transition. |
| Empty | 0 source rows, no review items, no insights, no recurring items | Honest distinct empty reasons; no zero placeholder balance; useful connect/import action where appropriate. Empty Inbox has no forced action or upsell. |
| No search results | Valid 100-row dataset + unmatched query | “Nessun risultato per…” and clear filters/search, not “Nessun movimento”; saved content unchanged. |
| Loading | Delayed provider/pipeline stages, missing balances | Real stage events only; no invented progress/%/ETA; skeleton never looks like actual money; leave/return supported. Reduced-motion state checked. |
| Error | Bank timeout, unknown cause, failed save/rule/export | Human cause/effect/recovery; prior data/entry preserved; unknown cause acknowledged; no debug code/credential prompt. Correction success distinguished from rule failure. |
| Account disconnected | Revoked/expired/paused source with cached history | Explicit status, last good refresh, retained/exportable history, correct Ricollega/revoke consequence. Pause does not claim revocation. Provider expiry never fabricated. |
| Offline / stale | Cached accounts with different ages, no network | Aggregate qualifier describes least fresh included source; real last success does not advance after failed retries; unavailable writes not shown saved. |
| Partial sync / missing rows | Two sources success, one failure; skipped row; mismatch | Incomplete sources/counts explicit before headline. No phantom balanced account; mismatch review/action; no complete-success ceremony. |
| 100+ transactions | 150 and 1,000 synthetic rows, filters, jump/detail/back | Smooth virtualisation, stable IDs/grouping; no missing/duplicated rows; exact amount rendering; restored scroll/filter and accessible discoverability. |
| Zero transactions | Connected account with real balance but no returned movements | Balance remains actual; “Nessun movimento disponibile per il periodo” explains scope. Do not substitute failure copy or assert no spending universally. |
| Swipe/action alternatives | Confirm/category/transfer/duplicate with gestures disabled | Labelled buttons/menu equivalent; screen-reader discoverable; no accidental destructive action; undo works after navigation. |
| Split and reconciliation | Sum mismatch, same amount distinct purchases, unpaired transfer, partial refund | No invalid split save; no fabricated other leg; preview/undo; no parent+children/double-source double count. P1 screens blocked from release until implemented. |
| Consent and AI refusal | Provider decline; short/unknown expiry; Non ora for external AI and push | First value/core/Plus remain usable; no external sharing before permission; providers named correctly; optional/required controls clearly separate. |
| Plan and billing | Gratis limit, pending purchase, annual/monthly, restore, downgrade | Whole price/period/renewal/cancel visible; no surprise charge; data/export/security/correctness retained. Hypothetical prototype prices never look like an active checkout. |
| Sensitive data | Quiet-set merchant, hidden category, screen-preview/push | No proactive sensitive narrative or analytics property; lock-screen notification contains no merchant/amount/account. Screenshots use synthetic content. |
| Without-logo recognition | Same five screens with mark/name hidden, both themes, grayscale | Consistent warm paper/wine, Geist/tabular amounts, whitespace and paired-line/dot grammar. Independent participants can group/describe the system; target remains hypothesis until study. |

## Content and correctness review

Review amount rendering independently from brand aesthetics. Compare formatted amounts to expected minor units, transfer exclusions, card-settlement policy and booked/pending totals. Charts cannot become the only route to evidence. A chart with six colours is not accessible merely because it has six colours; direct labels, markers/table and actual mark contrast are required. When a token cannot meet a meaningful mark contrast on its background, use a tested strong outline/alternate visual treatment rather than claiming universal palette compliance.

Review each explanation against stored evidence and each marketing sentence against delivered behaviour. “643 movimenti” and “5 da rivedere” are synthetic reference copy, not default app data. Read-only wording requires the selected provider's verified product scope. EU/no-retention AI promises require contractual evidence. Deletion/retention dates require the ratified policy. Pricing €4,99/month and €39,99/year is a hypothesis until authorised launch pricing is recorded.

## Evidence register at authoring

| Area | Current evidence | Status |
|---|---|---|
| Design principles, component contracts, flows, ASCII information hierarchy | Documents in `docs/design/` | **SPECIFIED**; not rendered/user validated |
| Brand mark/palette/type renders and measured palette pairings | `packages/brand/png/{icon-sheet,light-dark-mono-proof,color-vision-proof,identity-board,shelf-seed3,shelf-seed11}.png`; `explorations/type/{comparison,numbers,glyphs}.png`; `tokens/contrast-report.json` | **PASS for asset/render engineering and expert inspection**, 2026-10-02: 80 required pairings, lowest text 4.650:1 light / 5.939:1 dark, functional outlines 3.009:1 / 3.019:1. No claim of actual-screen/participant compliance; decorative/chart exclusions explicit |
| Complete mobile screens in light/dark, both sizes | None attached to this document | **NOT RUN** here; prototype build may separately demonstrate a subset |
| VoiceOver/TalkBack/large text and keyboard | No recorded session in this document | **NOT RUN** |
| Moderated usability / without-logo grouping | No Lilleri participant results yet | **NOT RUN**; hypotheses remain open |
| Provider consent and production identity | Provider/contract selection pending verification | **NOT RUN** for live access; placeholders are production blockers |
| Real billing/downgrade and P1 advanced flows | Design specification only unless separately implemented | **NOT RUN** |

Before public release replace or append the register with actual run evidence, defects and rerun results. A green lint/build is useful engineering evidence; it does not pass this visual gate.

## Review procedure and sign-off

1. Engineer/QA prepares the deterministic fixture and build; product designer captures the matrix without personal data.
2. Designer reviews hierarchy, theme, type/amounts and brand consistency; accessibility reviewer checks semantics/assistive interaction, not screenshots alone.
3. Fintech/data reviewer checks totals/status/evidence; privacy reviewer checks permission/retention/sensitive narrative; business reviewer checks complete pricing and cancel consequences.
4. Record blocker/major/minor findings by screen/component. Fix, rerun affected cases and preserve before/after evidence. Do not rerun unrelated checks after harmless copy changes unless layout/meaning changed.
5. Gate passes only with all release-blocking cases passed and P1/Later features absent or honestly staged. For an internal mock demo, explicitly name excluded live-provider/billing/user-study checks; do not report public-release readiness.

Ownership is a proposed review responsibility, not evidence these reviewers have signed. Human/provider/legal prerequisites remain the separately recorded blockers; this checklist does not manufacture approval.
