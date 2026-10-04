# Lilleri identity

**DECISION — 2026-10-04:** the **li monogram + custom lowercase wordmark** in neutral graphite/light ink, Graphite & Blue semantic palette, Geist UI, Newsreader editorial. This colour revision supersedes T3; archived explorations retain the earlier decisions. See `brand-jury.md` for critique and scored rationale. **Status:** generated original vectors — needs designer finalisation before production. No trademark clearance or user-validation result is implied.

## Mark story and construction

The tall stem lands in a rounded foot; the shorter stem keeps one round dot. Lilleri's name supplies the rhythm: l·i·l·l·e·r·i. The dot becomes a quiet anchor in review counts and list structure; it never becomes an eye or mascot. The logo communicates calm order without currency signs, coins, charts, wallets, cards or shields.

FACT: main grid 1024; stem 144; l top128, baseline896; i top432; dot radius 88, centre(672,216). Foot thickness136, inside radius 40, single rounded terminal68; gap from foot to i44. Three filled paths, no font dependency, gradients or strokes. Wordmark: Geist 600 e/r/i outlines with independently redrawn l feet and round i dots; custom kerning retained from B's documented construction. Path provenance: `explorations/direction-b/build.mjs`, `geist.json`; final recolouring/optical cut in `tools/brand-render/build-final.mjs`.

For favicon16/24px, shorten foot run by24 units (foot-to-i gap 68), use viewBox96 96 832 832. This is optical compensation, not a different brand. Main monogram bounds x280–744/y128–896. iOS full-field square scales main mark0.827 about centre: y194.432–829.568, fully within the Android central 683-unit square. The monochrome adaptive foreground uses the same three paths, black with transparent ground. Maskable composition keeps the meaningful mark inside the central 80%-diameter circle; field bleeds edge to edge. OS masks corners; assets contain no baked rounded outer corners.

## Lockups and formats

Horizontal lockup: mark height1.16× wordmark l height, aligned baselines, gap 0.6× l height. Vertical: mark1.9× l height above wordmark; use only narrow covers/signage. In-product header uses outlined wordmark alone, optionally the signature-dot wordmark. Symbol alone serves app icon, avatar and favicon; early marketing uses the name alongside it to teach spelling. `lilleri-monogram.svg` is the same li symbol, not another icon. Minimum size/clear space in `brand-guidelines.md`.

## Palette and typography

Light mode uses neutral ground `#F5F5F7`, white surfaces, graphite `#1D1D1F` and action blue `#005AC1`. Dark mode uses near-black ground `#0B0C0F`, graphite surfaces, light ink `#F5F5F7` and action blue `#79ACFF`. The monogram and wordmark use the corresponding textPrimary ink, independently of the action accent. The current source values live in `tokens/palette-source.json`; semantic roles are exported through `tokens/colors.json`. Ordinary expense text retains a minus and neutral ink. Text/UI requirements pass 80 computed pairs; ratios and exclusions live in `tokens/contrast-report.json`.

Geist 400/500/600 covers body/amount/label. Newsreader500 marks large editorial headlines without entering transaction rows. Geist Mono is restricted to identifiers. Use tabular lining digits, locale-aware exact formatting and untruncated amounts. Details, binary measures and six-family comparison in `explorations/typography-decision.md`.

## System beyond the logo

Iconography: original or properly licensed24-unit line icons,1.75-unit stroke, round caps, optical fit to20-unit interior;16/32 variants inspect manually, all interactive targets≥44. Decorative dot is never the only status. Illustration: flat, matte paper shapes showing unrelated entries settling into aligned rows; limited shapes and no coins/human caricatures/fake merchant logos. Graphic device: one circle anchor, a calm baseline and generous text fields, borrowed from the mark's dot/foot relationship. Do not scatter logo parts as confetti.

Shape language: radius 8 chips,12 inputs/small cards,20 cards,28 sheets; pill only short actions/status chips. Flat surfaces precede shadows. One signature motion: an uncertain entry shifts a few logical pixels into alignment when a confirmed action succeeds. No balance count-up, fake completion or financial-data movement for entertainment. Reduced-motion switches to instant state replacement or short nonessential opacity change. More in `visual-language.md`.

Voice: precise, direct, respectful, nonjudgmental. “5 movimenti da controllare.” “Ultimo aggiornamento09:42.” “Puoi annullare.” Never praise overspending or scold users. Explainer “Perché?” shows evidence and limitations; neither “AI magic” nor banking jargon is a consumer headline. Marketing promises are commitments until measured; the current demo identifies synthetic data.

## Explorations and why they lost

**A — Si posa:** strongest reconciliation metaphor and a useful settling motion. Static small lifted sheet reads as two bars, lid or clapperboard; cotto raises Satispay-hue concern. Retain its single motion principle.

**B — li:** selected because symbol/wordmark share a custom stroke/dot logic and the name receives a readable spine. Weaknesses are short-letter uniqueness and small foot gap; the latter has an optical cut, the former requires legal/user review.

**C — Il lillero:** calm tactile object and robust hole; olive/washer/coin/wellness interpretations invite explanation and risk the brief's no-coin requirement. Retain material restraint, not the pebble symbol. All explorations remain credited and stored as evidence, not silently rewritten.

## Brand red-team log

| Finding | Severity | Resolution / remaining limit |
|---|---|---|
| B main foot gap closes at 16px | Major | Shorten foot in optical small cut, enlarge viewport; inspected final light/dark proof16/24px |
| Dark-ground favicon requires its own ink | Major | `favicon-on-dark.svg` uses light ink; the theme-specific supplied asset preserves contrast |
| Latin-ext-only toolkit fonts cannot judge ASCII | Major | Complete official binaries, explicit glyph outlines, new specimens and coverage measurements; old evidence downgraded |
| Renderer family-name fallback made editorial board sans | Major | Use actual Newsreader outlined headline and label in presentation; real fonts supplied for consumer font loaders |
| Later exploration metadata contains `#NANNANNAN` | Major | Whitelist actual colour roles into reviewed palette snapshot; validate every hex before final export; preserve exploration history |
| CVD samples collapse several hues | Major | Signs/text/vector status icons required; no red/green-only rule; chart labels/boundaries |
| Check glyph absent in renderer font | Minor | Evaluation proof uses drawn vector check instead of missing Unicode glyph |
| Warm palette rejected in the 2026-10-04 review | Major | Current light/dark themes use neutral planes and one blue action accent; both modes and proofs regenerated |
| “Connect once” implies no renewals | Major | Canonical message now “Collega i tuoi conti. Lilleri mette in ordine i movimenti e ti chiede quando serve.” Renewal disclosure retained |
| Shelf timing/consumer panel claims unsupported | Major | Document expert simulation, no recognition-time data; release study open |
| Ads/trial/plan draft can overpromise | Major | Launch Gratis/Plus only; optional offers and non-renewing preview marked hypotheses; no autocharge or never-ad absolute |
| Legal distinctiveness and designer craft not validated | Release gate | State finalisation/clearance as open; usable implementation assets do not imply launch approval |
