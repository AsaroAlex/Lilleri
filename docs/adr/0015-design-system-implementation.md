# ADR-0015: Design system implementation

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Brand/design owner; architecture decision owner; mobile and web implementation owners
- **Decision gate:** D for implementation approach; F and G need their separate validation evidence

## Context

FACT: the [design specification](../design/design-system.md) defines shared semantic tokens, Carta & Vinaccia light/dark roles, Geist UI typography, tabular amounts and restrained Newsreader editorial use. FACT: the [visual gate](../design/visual-quality-gate.md) requires actual screens, large type, financial edge cases and assistive interaction evidence; creating tokens or building an app does not pass it. ASSUMPTION: the initial Expo shell and Next landing share foundations but have different platform semantics. UNKNOWN: complete rendered/device coverage until the implementation records it. This ADR accepts the implementation method; it does not claim a complete component library or tested native accessibility.

## Options considered

| Option | Summary | Pros | Cons | Raw evidence |
| --- | --- | --- | --- | --- |
| Shared brand tokens with native StyleSheet and web CSS | One foundation; platform-specific components | Minimal Expo dependency surface; explicit semantic access | Some separate component implementation | [Design system](../design/design-system.md); [stack research](../research/raw/tech-stack-options.md) |
| NativeWind/universal utility styling | Shared utility vocabulary across platforms | Familiar web-style composition | Native tooling/version dependency; not required for shell | Stack options; no current comparative product benchmark |
| Large cross-platform component framework | Shared primitives and themed package | More prefabricated controls | Bundle, abstraction and visual-customisation cost | [Toolchain spikes](../research/raw/toolchain-spikes.md); no finished-library evaluation |

Proposal: adopt a universal styling/component framework to guarantee consistency. Critique: consistency comes from semantic foundations, accessibility and review; a framework can add native upgrade risk before actual reuse is known. Counterproposal: share tokens/assets/fonts, implement a small platform-appropriate set and extract reusable components after demonstrated duplication. Decision: use React Native StyleSheet for the current shell and shared brand-derived CSS for web; no unnecessary NativeWind/native dependency.

## Decision

DECISION: `@lilleri/brand` owns semantic colour roles, typography, spacing, radius, elevation, motion, iconography and licensed asset references. TypeScript/JSON/CSS representations derive from one reviewed source with a drift check when mirrors are consumed. Applications select a coherent light/dark theme at the surface root. Components read roles such as primary/onPrimary and textPrimary rather than copying palette hex values or inventing a parallel type/spacing scale. Future implementation changes must preserve the brand package contract.

Use native `StyleSheet` and standard Expo/React Native primitives for actual mobile screens; web uses corresponding CSS variables and native HTML semantics. Share pure token values and financial formatting, not assumptions that a DOM button and native Pressable have identical behaviour. Introduce `@lilleri/ui` only when real consumers justify it. Current prototypes expose delivered actions; a specification table is not permission to show inactive advanced controls.

Every implemented financial component handles known, unknown, zero, negative, pending, stale and partial states. Use exact bigint formatting from `@lilleri/money`; never truncate an amount or convert to Number to fit a widget. Rows grow or stack at large type. Signs, labels/icons and chart text equivalents carry meaning alongside colour. Target 44-point hit areas, Android 48 dp where practical, system text scaling, logical screen-reader order, visible web focus and reduced motion. Never animate financial amounts through fabricated intermediate values or use fake progress.

Load actual approved font files before typography sign-off; fallback rendering is limited evidence. Test tabular numbers and symbol coverage, both theme pairings, long names and large/multiple-currency values. Capture the [visual matrix](../design/visual-quality-gate.md) with synthetic fixtures and explicit PASS/FAIL/NOT RUN scope. Expo web export and screenshots do not establish VoiceOver/TalkBack or store-device performance.

## Consequences

- Positive: brand foundations stay shared while the first working slice remains small and compatible with Expo's validated dependencies.
- Accepted trade-offs: mobile/web components need separate platform behaviour and review; token consistency alone cannot certify accessibility.
- Easier: palette/type changes and financial presentation review. Harder: keeping generated token mirrors aligned and collecting actual native evidence rather than treating screenshots as proof.

## Risks

| Risk | Likelihood | Impact | Mitigation | Early warning signal |
| --- | --- | --- | --- | --- |
| Token mirrors or local colours diverge | Medium | Medium | Single source, mirror drift check and component review | Same semantic role differs across clients |
| Money clips at large type or compact width | Medium | High | Exact-value fixtures, growing/stacked rows, no amount ellipsis | Missing sign, currency or final digits |
| Screenshot polish hides inaccessible action | Medium | High | Assistive-device, target and keyboard checks | Gesture-only correction or unnamed button |

## Revisit conditions

Revisit component/styling tooling when repeated platform work, measured performance or unsupported native requirements justify it. Adopt a library only after a working financial screen comparison and compatible Expo export/device evidence. Reopen tokens/font choice for measured legibility, contrast or recognition failures; do not add a framework merely to match a proposed repository tree.

## References

- [Design system](../design/design-system.md); [design principles](../design/design-principles.md); [visual gate](../design/visual-quality-gate.md), specifications dated 2026-10-02.
- [Brand strategy](../brand/brand-strategy.md); [typography evidence](../research/raw/typography-options.md), source limitations retained there.
- [ADR-0003 stack](0003-technology-stack.md); [ADR-0006 exact money](0006-money-and-time-representation.md).
