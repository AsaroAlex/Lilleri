# Lilleri finance pictograms

The pictograms are original geometric drawings. They identify categories, account kinds and navigation without using bank marks, emoji or copied competitor assets. The source artwork and generated PNGs live in `apps/mobile/assets/finance`.

Run `node tools/finance-visuals/build.mjs` after installing the existing renderer dependencies in `tools/brand-render`. It renders every source at 192px (3x the 64px canvas), creates light/dark illustrations and transparent navigation variants, and updates the explicit Metro asset registry.

`CategoryVisual`, `AccountVisual` and `FinanceVisual` are decorative images. Pair them with a visible, accessible text label. Category mapping uses the operational `CategoryId` catalogue; unknown user categories get the neutral uncategorised pictogram without inferring a category from its name. Account illustration uses the account's declared `kind`.

Use `bare` for compact navigation/search icons and provide `color` when the icon should match a selected action. The default 40px category illustration and 24px bare navigation icon are intended to complement labels, not replace them.
