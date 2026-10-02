# Colour territories — consolidated comparison

**Date:** 2026-10-02. **Evidence:** existing T1/T2/T3 JSON, swatches, semantics, shelf and `territories-compare.png` under `packages/brand/explorations/colour/`. This document completes the existing explorations; it does not restart them.

The earlier research labels **T1 olive / T2 cotto / T3 amaranto**. The actual colour generators label **T1 Carta & Cotto / T2 Carta & Oliva / T3 Carta & Vinaccia**. File names/JSON names govern this comparison. Logo A uses cotto, B wine, C olive. Do not infer hue from a research territory number alone.

| Existing file territory | Expert strengths | Critique | Decision |
|---|---|---|---|
| T1 `t1.json` Carta & Cotto | Warm, material, readable on paper; ties A's two tiles to Italian earth | Same hue family as Satispay's orange; red-adjacent semantics can feel corrective; A's animated story outweighs static proof | Runner-up; carry warmth and settling motion, not the hue |
| T2 `t2.json` Carta & Oliva | Quiet, tactile; separates finance from neon; pleasant dark sage | Green-bank/eco associations; green status vs brand requires careful label separation; C can read olive/washer | Keep neutral restraint; no secondary olive signature in final system |
| **T3 `t3.json` Carta & Vinaccia** | Strong small mark; wine ink on warm paper; adult editorial character, separate teal inflows | Heavy if it covers full screens; possible loss/red reading; dark rosy accent could become cosmetic if overused | **DECISION:** final semantic palette; 80–90% neutral area, 5–10% signature; ink for ordinary expenses |

FACT: generated source includes text/semantic roles and `borderStrong` with contrast floors on every background/surface/elevated surface. Final `tokens/contrast-report.json` checks 80 pairs: normal-text worst light **4.650:1**, dark **5.939:1**; functional outlines worst light **3.009:1**, dark **3.019:1**. Decorative border, primarySoft and charts are excluded from text claims. Non-text chart fills need direct text labels and visible boundaries; colour alone is never the encoding.

The final palette uses warm night `#140F0E`, not B's exploratory cooler night `#1E2030`. This is a considered graft from A/C's material warmth. Light primary `#782443`; dark primary `#D497A7`; light paper `#F7EFE7`; dark text `#F3EBE4`. Full roles are in `packages/brand/tokens/colors.json`. The reviewed `tokens/palette-source.json` snapshot adopts the later remote chart order (wine/ochre/teal/clay/blue/green) and elevated paper `#FEFEFD`. Invalid exploration metadata `id: #NANNANNAN` is excluded; final generation rejects malformed hex. Exploration versions can change without silently mutating final tokens.

FACT: `png/color-vision-proof.png` renders normal/protanopia/deuteranopia/tritanopia/grayscale semantic samples using Machado 2009 severity-100 matrices. Expert finding: warning/danger/success can converge in some simulations, so labels, vector icons and signs remain mandatory. Simulation is not a diagnosis or proof of usability for every visual impairment. OPEN QUESTION: actual user testing, named-competitor confusion study and screen-based accessibility verification. Generic procedural shelf renders are not competitor testing or a recognition-time experiment.
