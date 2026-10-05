# @lilleri/brand

Dependency-free semantic tokens and original Lilleri vectors, with licensed fonts. Design decision: original B li geometry / Graphite & Blue (2026-10-04 design review). The original geometry is preserved. Neutral graphite/light ink carries the mark; blue identifies actions and selected states. Name/trademark clearance and user/device studies are not complete.

```ts
import { colors, tokens, typography, spacing, radius, assets } from '@lilleri/brand';
const theme = colors.light; // or colors.dark
const card = { backgroundColor: theme.surface, borderRadius: radius.lg, padding: spacing.md };
const body = typography.scale.body; // native size/lineHeight; webSize/webLineHeight
```

Exports: `colors`, `typography`, `spacing`, `radius`, `motion`, `elevation`, `iconography`, `assets`, `tokens`; types `BrandTheme`, `BrandColorRole`, `BrandTypographyStyle`. `tokens.colors` and `tokens.color` refer to the same themes; `tokens.spacing` and `tokens.space` refer to the same spacing. Asset strings are package-relative paths, not absolute filesystem paths or HTTP URLs. Resolve/copy assets through the consuming framework, e.g. `@lilleri/brand/assets/fonts/Geist-Regular.ttf`. No React, browser, font loader or network code is included.

```css
@import '@lilleri/brand/tokens.css';
/* --lilleri-color-primary, --lilleri-color-text-primary, etc. */
/* [data-theme="dark"] sets the dark roles. Honor the user's theme preference. */
```

Subpaths: `@lilleri/brand/tokens.css`, `/tokens.json` (DTCG-like design interchange), `/colors.json` (direct semantic themes), `/assets/*` (logo/icon/png/fonts files). CSS chart tokens are1-based (`--lilleri-color-chart-1`), TS chart array0-based. JSON `colorArray`/`composite` are documented extensions rather than a claim of strict DTCG conformance. Native tokens use logical units; web scale has explicit CSS px sizes. Essential touch target44.

Canonical generation: `node tools/brand-render/build-final.mjs`; proof generation: `node tools/brand-render/accessibility-proof.mjs`; type specimens: `python3 tools/brand-render/type-specimens.py` with fontTools + Brotli installed. Existing full font sources and recorded SHA256 are included in explorations/type; no download is required to regenerate. Renderer prerequisite: frozen install in tools/brand-render. This package itself only needs root TypeScript for build.

The product header uses the wordmark alone, avoiding a repeated “li” before “lilleri”. Web loads the outlined light/dark SVGs; native uses the transparent 1000px `png/wordmark.png` and `png/wordmark-dark.png` fallbacks. The separate monogram remains available for app icons and other compact placements.

Validation: `pnpm --filter @lilleri/brand build` / `typecheck`; generation asserts80 required text/UI contrast pairs. `tokens/contrast-report.json` records every pair. Decorative borders/tints/chart fills are excluded; use labels/outlines for charts. The new glyph specimen workflow corrected older Latin-ext-only toolkit font inputs. Final assets/font licence inventory and source assumptions are in `docs/brand/brand-assets.md`.
