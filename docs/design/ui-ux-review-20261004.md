# UI and UX decision review — 2026-10-04

**Status:** implementation review. The revised palette and application source have been inspected; final compiled-web acceptance and the Railway rollout are pending at the time of writing.

The user rejected the warm colours and requested a clearer, more considered interface. The response is a neutral financial workspace: amounts and their meaning lead, navigation stays predictable, and blue identifies actions and selection. This record describes decisions implemented in Lilleri; it makes no claim of Apple affiliation, external design certification, or native-device acceptance.

## Decisions applied

| Finding | Applied change | Why it helps |
|---|---|---|
| Warm surfaces, wine accents and oversized editorial headings competed with financial content. | Regenerated semantic tokens and logo assets use Graphite & Blue. Operational page headings use Geist at 28 px on compact screens and 36 px on wide screens; section titles use 18 px. Currency labels and ordinary metadata are neutral. | The data carries the visual emphasis. A single interaction accent makes controls and selection easier to recognise. |
| Home spent too much vertical space explaining what to do before showing the account picture. | The review notice is now a compact count and quiet action above the financial snapshot. The summary and account register remain adjacent on wide screens and stack on compact screens. Recent transactions now precede the tools menu. | The count remains easy to find while the overview reaches useful evidence sooner. Tools support the overview rather than interrupting it. |
| Repeated branding and decorative indices added noise to routine navigation. | The 200 px desktop rail retains named destinations and an explicit selected state, with the decorative destination numbers removed. Repeated signature graphics were removed. The shorter synthetic-data introduction appears on Home; the persistent header badge remains visible. | People can locate their destination without reading ornamental structure. Demo status stays clear without repeating the same paragraph on every tab. |
| “Gestisci” beside the accounts opened Privacy, and a manual-entry tool had an ambiguous import label. | The account action is now “Fonti” and opens the existing connections screen directly. The separate manual tool is labelled “Conti e movimenti manuali”; mapped file import remains available through its own action. | Action names describe their actual destinations and distinguish source management, manual records and mapped file import. |
| Category-review cards explained the issue but left the next step implicit in a clickable transaction row. | Each category-review card adds “Scegli la categoria”, opening an existing transaction detail from that card. | The required gesture is explicit. The established detail, correction and revision checks remain the decision path. |
| Privacy began with several filled navigation buttons competing for attention. | Service notices and connections use quiet navigation actions. The existing privacy controls, settings, export and separately placed deletion controls remain available. | Navigation links carry less weight than actions that change or remove data. |

## Colour and financial content

The palette source is [palette-source.json](../../packages/brand/tokens/palette-source.json); runtime components consume the generated [brand export](../../packages/brand/src/index.ts). The [visual-language decision](../brand/visual-language.md) records the revised direction. Earlier warm-palette explorations and dated screenshots remain historical evidence.

| Role | Light | Dark |
|---|---|---|
| Page / surface | `#F5F5F7` / `#FFFFFF` | `#0B0C0F` / `#15171C` |
| Main / supporting text | `#1D1D1F` / `#515154` | `#F5F5F7` / `#B8BBC4` |
| Action / selected tint | `#005AC1` / `#EAF2FF` | `#79ACFF` / `#172B47` |

The mark uses neutral ink. Success, warning and error colours retain semantic meaning alongside text; blue is not a financial-direction encoding. Amounts retain Geist tabular figures, their signs and currencies. EUR and GBP remain separate. Account balances, period spending, booked income and pending balances keep distinct labels. These presentation changes do not introduce exchange-rate aggregation, invented charts or bank-connectivity claims.

The generated [contrast report](../../packages/brand/tokens/contrast-report.json), measured on 2026-10-04 using WCAG 2.x sRGB relative luminance, records **80 of 80 required pairs passing**: text roles and button labels meet 4.5:1; `borderStrong` control boundaries meet 3:1. This is token-pair evidence, not a claim that every rendered state or chart colour has been tested. Decorative `border` is not the required outline for a meaningful control.

## Acceptance scope

The review inspected the preceding desktop, 390 px and 320 px Home captures, dark Home and ledger captures, plus read-only navigation through Inbox, recurring items and Privacy. Applied behaviour was checked in [App.tsx](../../apps/mobile/App.tsx), [HomeQuickActions.tsx](../../apps/mobile/src/HomeQuickActions.tsx) and the [Italian/English messages](../../apps/mobile/src/i18n/app-messages.ts). Those earlier warm captures are not evidence of the final neutral render.

Before recording release acceptance, verify the compiled app in both themes at 320, 390 and desktop widths: heading and navigation reflow, complete money values, visible keyboard focus, clear selected tabs, and the account/source and category-review destinations. Exercise search, import, correction/undo and export through the existing browser workflows. Check zoom at 200% and reduced motion. A terminal successful Railway deployment and fresh public checks are needed before recording the change as published.

This review does not establish physical-device accessibility or user comprehension. Those remain separate validation tasks.
