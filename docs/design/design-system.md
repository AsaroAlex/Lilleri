# Design system

**Status:** DECISION/specification, 2026-10-02; component availability must be checked in the application. The initial prototype may expose only Home, Movimenti and Inbox. This document defines the complete system, including public-launch and P1 flows. Product copy is Italian; monetary examples are synthetic.

## Source of truth and foundations

Use the published `@lilleri/brand` token export: `tokens.colors.light` / `tokens.colors.dark`, `tokens.typography`, `tokens.spacing`, `tokens.radius`, `tokens.elevation`, `tokens.motion`, `tokens.iconography`. JSON, TS and CSS mirrors live in `packages/brand/tokens/`. Colours are semantic roles, not copied hex values in components. Select one theme at the surface root; never mix light and dark roles inside a component.

```ts
import { tokens } from '@lilleri/brand';
const color = tokens.colors[theme]; // theme: 'light' | 'dark'
// Button: color.primary / color.onPrimary; body: color.textPrimary.
```

The chosen territory is **Carta & Vinaccia**. Light paper `#F7EFE7`, light surface `#FDF8F4`, wine primary `#782443`; dark paper `#140F0E`, dark surface `#1D1816`, dark primary `#D497A7`. These examples explain the decision; runtime always reads tokens. Olive is available as a supporting chart colour, not an alternative primary button colour.

| Colour role | Meaning and allowed use |
|---|---|
| `background`, `surface`, `surfaceElevated` | Page, grouped content, raised sheet/dialog. Dark mode uses surface steps rather than black shadows. |
| `textPrimary`, `textSecondary`, `textTertiary` | Main, supporting, metadata text. Tertiary still needs AA for its rendered size. Placeholder is not the label. |
| `primary`, `onPrimary`, `primarySoft`, `accent` | Main action, its label, gentle selected background, limited signature accents. Never an entire dashboard of wine panels. |
| `border`, `borderStrong` | Quiet decorative separation; meaningful control outline/focus. Light `border` is not sufficient for input affordances. |
| `success`, `warning`, `danger`, `info` | A state, paired with a label/icon. Use coloured text/outline on the normal surface unless a tested tinted pair exists. No guessed on-status text colour. |
| `positive`, `negative` | Supplementary inflow/outflow colour with explicit sign/word. A negative balance is not a moral judgement. |
| `chart[0…5]` | At most six series. Never assume every chart colour has text or control contrast on every surface. Use direct labels and a text equivalent. |

### Typography

Geist is the UI family. Use Newsreader only for restrained editorial display in welcome/marketing; GeistMono is for technical codes in support/developer contexts and never the transaction list. Font files and licence/source records belong to the brand package. Load real fonts before visual sign-off; fallback screenshots are not final typography evidence.

| Token scale key | Product purpose | Rules |
|---|---|---|
| `display`, `h1` | Welcome/editorial headline, page title | One per screen. Wrap naturally; no all-caps paragraph. |
| `h2`, `h3`, `title` | Section heading, sheet heading, card title | Hierarchy through size/weight, not different font families. |
| `body` | Main UI copy, controls, inputs | 16 pt baseline; scalable line height. |
| `bodySmall`, `label` | Secondary details and compact labels | Never shrink to fit an amount; expand row height instead. |
| `caption` | Source, date, supporting metadata | Not sole carrier of permission consequences/error recovery. |
| `amountLarge`, `amountMedium` | Primary aggregate and financial detail | Geist; tabular numerals (`tnum`), lining figures; sufficient width for sign, currency and separators. |

Read size, weight, line height and letter spacing from each scale token; do not add a local parallel scale. Italian uses `€ 12.438,72`, `−€ 42,50`, `+€ 2.100,00`; never concatenate an amount with a currency symbol. Format minor-unit/decimal-safe values through the shared formatter. Source precision is retained; calculations never use UI strings. Zero is `€ 0,00`; unknown is “Non disponibile”, not zero. Multi-currency totals require the base currency, FX date and estimate label; native row amounts retain their original currency.

### Layout, shape, elevation, iconography and motion

| Foundation | Specification |
|---|---|
| Spacing | `xs:4`, `sm:8`, `md:16`, `lg:24`, `xl:32`, `xxl:48` pt. Base 4 pt; use 8 pt rhythm between rows. Gutter 24, compact gutter 16. Do not introduce 13/17/23 px incidental gaps. |
| Radius | `sm:8` for chips/compact fields, `md:12` for buttons/inputs, `lg:20` for cards/sheets, `xl:28` for large surfaces, `pill:999` for a status chip. No pill-shaped financial input. |
| Elevation | Normal rows and cards use surface contrast. Token elevation only for sheets/dialogs/popovers; no shadow beneath every card. Dark elevation relies on `surfaceElevated`. |
| Icons | 24 px base optical grid; 16/20 supporting and 32 empty-state sizes from tokens. 2 px rounded strokes/caps/joins at 24 px, scaled consistently; 2 px safe inset. Fill only selected/semantic variants. Hand-adjust optical centre, do not stretch. |
| Targets | ≥44 ×44 pt hit area; 48 dp Android where practical; visible glyph need not fill it. |
| Motion | Durations/easings from tokens; one short response for save/connect/review. Real status events drive sync steps. Reduced motion replaces movement with a static check and short opacity transition. Never animate financial values through false intermediate amounts. |

## Shared component contract

Every component documents accessible name/role/value, theme, pressed/focused/disabled/loading behaviour and status semantics. Async operations keep the original content visible until the result is known. Disable only unavailable actions, with a nearby explanation; a disabled button never substitutes for an error message. Pressed state uses a token-based treatment verified for contrast; focus uses `borderStrong` with an offset visible on both themes.

### Buttons and inputs

| Component | Anatomy/variants | States and interaction | Tokens |
|---|---|---|---|
| Button | Label, optional leading icon; primary filled, secondary outline, quiet text, destructive labelled | Idle/pressed/focus/disabled/loading/success. ≥44 pt height. Loading retains label “Sto collegando…” and prevents duplicate submission. Quiet “Non ora” remains readily reachable. | `primary/onPrimary`, `textPrimary`, `danger`, `borderStrong`, `radius.md`, `spacing.md`, `typography.label`, motion |
| Text input | Persistent label, input, optional helper, inline error; text/e-mail/search/money | Empty/focus/filled/error/disabled/read-only. Error says what to fix and preserves entry. Enter advances only when valid; numeric input supports locale separators and minus. | `surface`, `textPrimary`, `textSecondary`, `borderStrong`, `danger`, `radius.md`, `body` |
| Toggle/checkbox | Visible label and consequence, control and optional help link | Checked/unchecked/focus/disabled. Optional permissions default off. Terms acceptance and privacy notice are distinct from permission switches. | `primary`, `onPrimary`, `borderStrong`, `body`, ≥44 target |

### Financial content

| Component | Anatomy/variants | States and interaction | Tokens |
|---|---|---|---|
| Card | Heading, short body, optional metric/status and one action; summary, informational, action | Rest/focus/loading/partial/error. A tappable card has one accessible action; nested button targets remain separate. No arbitrary fixed height. | `surface`, `textPrimary/Secondary`, `radius.lg`, `spacing.lg` |
| Amount display | Exact formatted value, sign and currency; optional “Stima”/period/source | Known/negative/zero/unknown/estimated/stale. Never truncate or ellipsise money. Large values wrap label/currency positioning or reduce hierarchy to `amountMedium`; retain readable font size. | `amountLarge/Medium`, tabular nums, `textPrimary`, optional `positive/negative` |
| Transaction row | Merchant initials/icon, two-line merchant, category chip, amount aligned right, date/status | Booked; “In attesa”; “Da rivedere”; transfer; refund; duplicate relation. Long merchant names use up to two lines then ellipsis; detail exposes full text. Amount is never truncated. At large text use a two-column then stacked layout. | `surface`, `textPrimary/Secondary`, `amountMedium` or body with `tnum`, `spacing.md`, `warning`, `radius.sm` |
| Category chip/icon | Icon + human category name; selected/editable/hidden | Text stays visible. Long category expands/wraps in detail; compact row offers full accessibility label. Colour is identity decoration, not state. “Privata” is textual. | `primarySoft`, `textPrimary`, `radius.sm/pill`, `label`, icon 16/20 |
| Chart | Heading/question, period, plot, direct labels, source/estimate and text table | Loaded/empty/loading/partial. Max six series; rest grouped “Altre” with drill-down. Use patterns/different markers plus hue. Selected point has keyboard/screen-reader equivalent. | `chart`, `textPrimary/Secondary`, `borderStrong`, typography/spacing |

A transfer row reads “Intesa → Revolut · Trasferimento”, one amount, and “Escluso dalle spese”; “Perché?” shows both original source rows. A card-settlement row reads “Addebito carta” and explicitly states the spend effect. Pending amounts remain distinguishable from booked totals. Do not hide a relationship merely to make the list tidy.

### Navigation and surfaces

| Component | Anatomy/variants | States and interaction | Tokens |
|---|---|---|---|
| Tab bar | Home, Movimenti, Inbox, Insight, Impostazioni; icon + label | Selected state has label/shape as well as colour. Inbox badge is count requiring action, not every import. Accessible destination name “Da rivedere”; test visible Inbox vs Da rivedere. Labels remain visible. | `surfaceElevated`, `primary`, `textSecondary`, icon24, target44 |
| Bottom sheet | Heading, close button, content, primary/secondary action | Short action choice or explanation; scroll at large text, full-height when necessary. Dismiss preserves unsaved work or asks only if work would be lost. Return focus. | `surfaceElevated`, `radius.lg`, `spacing.lg`, elevation |
| Modal | Heading, consequence, controls | Use for irreversible/destructive confirmation or authentication consequence, not routine congratulations. Clear cancel with equal readability. Do not stack modals. | `surfaceElevated`, `textPrimary`, `danger`, `radius.lg`, elevation |
| Banner | Status icon, title, one explanatory sentence, action, optional dismiss | Info/warning/error/success; connection expiry uses neutral warning, not a red catastrophe. Persistent while consequence remains. | `surface`, semantic foreground, `borderStrong` when needed, `bodySmall` |

Five destinations separate the core loop (Home overview, Movimenti evidence, Inbox corrections) from interpretation (Insight) and control (Impostazioni). Recurring items open from Insight; categories/rules from settings and relevant detail. This prevents a sixth tab. The prototype's three core tabs are a staged implementation, not a final IA change. On tablet/web, the same destinations form a labelled rail; no duplicated navigation.

### State components

| Component | Anatomy/states | Copy/behaviour | Tokens |
|---|---|---|---|
| Empty state | Short heading, honest reason, useful action if any | No movements: “Qui vedrai i movimenti” → “Collega un conto” or “Importa un file”. Empty Inbox: “Niente da rivedere.” No forced confetti/upgrade. Distinguish no data from filtered no results. | `textPrimary/Secondary`, `spacing.xl`, icon32 |
| Skeleton/loading | Static content outlines + specific status | “Sto recuperando i movimenti” only while that stage runs. No invented percent/ETA. Stop shimmer for reduced motion; provide “Continua più tardi”. | `surfaceElevated`, `border`, motion |
| Error state | Named cause if known, effect, available next action | “Fineco non risponde. I dati restano aggiornati alle 09:42.” → retry only when available. Unknown cause says so. No code/credential request. | `danger` or `warning`, `textPrimary`, `surface` |
| Offline/stale badge | Icon + “Non in linea” / “Aggiornato alle 09:42”; source detail | Show cached timestamp. Aggregate freshness uses the least fresh included source; partial totals explicitly qualify inclusions. No fake live pulse. | `textSecondary`, `warning`, `label`, `radius.pill` |
| Consent/connection chip | Text status, optional expiry | “Attivo”; “Scade il 28 ottobre”; “Da rinnovare”; “In pausa”; “Scollegato”. Dates from provider; unknown expiry says unavailable. Open connection detail. | `success/warning/info`, `textPrimary`, `radius.pill` |

### Product-specific components

| Component | Anatomy/states | Behaviour | Tokens |
|---|---|---|---|
| Insight card | One observation, amount/period, estimate/source qualifier, “Perché?”, one action | Inference appears as proposal, not fact. Explanation includes actual calculation, sources and limitations. Quiet-set data never generates proactive insights. | `surface`, `primarySoft` sparingly, `textPrimary/Secondary`, `amountMedium`, `radius.lg` |
| Review action row | Proposed category + reason, “Conferma”, category button, “Altre azioni” | Common actions one/two interactions. Menu contains Trasferimento, Dividi, Duplicato, Rimborso, Ignora. Swipe is optional equivalent; always undo. Split/refund linking P1 when available; do not expose dead buttons in beta. | `primary/onPrimary`, `warning`, `textPrimary`, `spacing.sm`, target44 |
| Rule prompt | Merchant/category/scope summary, “Sì, sempre”, “Solo questo movimento” | Correction is already saved. A rule never appears selected by default. Explain future impact; preview/backfill past entries is a separate choice with count. | `surfaceElevated`, `primary`, `textPrimary`, `radius.lg` |
| Paywall card | Named plan, concrete entitlement, total price/period, renewal/cancel text, CTA/close/restore | No timer, preselected permission, fake discount, account deletion pressure or correctness gating. Price is labelled hypothesis in prototypes. Gratis continues without payment; safety/export/review remain available. | `surface`, `primary/onPrimary`, `textPrimary/Secondary`, `radius.lg`, `title/body` |

## Dark mode and implementation quality

Respect system preference plus explicit app setting. In dark mode use the dark semantic palette, independent tested chart pairings and `surfaceElevated` for raised content. Do not invert logos or photos with a CSS filter. Amount, consent, stale, error, focus and disabled states must receive a separate screenshot; light passing is not dark passing. No hardcoded white modal or black text on a dark primary button.

The [visual quality gate](visual-quality-gate.md) is the release checklist. The [flows](user-flows.md) specify source-of-truth states and recovery; [wireframes](wireframes.md) specify hierarchy. A component is complete only when real/synthetic-fixture status, keyboard/screen-reader behaviour, large type, both themes and undo/error paths are verified. Do not advertise unimplemented specification as shipped functionality.
