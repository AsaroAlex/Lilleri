# Logo exploration — Direction A: "Settling into order" (working name: *Si posa*)

**Project:** LILLERI (consumer PFM, Italy-first then Europe).
**Document type:** identity exploration, one of several parallel directions (Phase 2). Not a final identity, not a decision.
**Date:** 2026-10-02 (second pass of Direction A; it replaces the first pass in full).
**Inputs:** `docs/brand/brand-strategy.md` (§4 personality, §9 "which visual element", §10 anti-patterns, §11 "no € in the mark"), `docs/brand/messaging-framework.md` (§1 territories, §4 "Tu spendi. Lilleri sistema."), `docs/brand/naming-analysis.md` (D6 lowercase wordmark, tailed `l`), `docs/research/brand-competitor-analysis.md` (§3 palette census, §4 shape landscape, §7 clichés, §9 territory T2 and its Satispay caveat), `docs/research/raw/typography-options.md` (§7 Geist Sans).
**Assets:** `packages/brand/explorations/direction-a/` (SVG sources, PNG renders, process sheets; full list in §16). Every render was made with the Phase-2 toolkit (resvg) and inspected at 1:1 pixels; every statement below about legibility is what was *seen* in those renders, not inferred.

**Labels.** FACT = measured or computed (contrast ratios, pixel sizes, what a render shows). HYPOTHESIS = a reading that must be tested with users. DECISION = a choice made inside this direction only. OPEN = for the human designer.

---

## 1. Concept

**A level base and a thin sheet coming to rest on it.**

The brand promise is that scattered things settle into order by themselves ("Tu spendi. Lilleri sistema."; "I tuoi soldi, in ordine. Da soli."). The mark is the last frame before that happens: a solid, settled slab — *il registro*, the one correct record — and above it a thin, light sheet — *il movimento*, the single transaction — already seated at its left end and still eight degrees up at its right. Nothing is pushing it; it is landing.

The two elements are deliberately unequal. The first pass of this direction (two equal tiles, one tilted) read as an "=" sign and as a two-line menu at 16 px, because two equal bars *are* those glyphs. Giving the two elements different weights fixes that: a heavy thing that is settled and a light thing that is settling is a silhouette the category does not use, and it carries the brand's two registers in one shape — **weight** (trust, correctness, "a posto") below and **lightness** (*leggera, non superficiale*) above.

Italian working name: **Si posa** ("it settles / it comes to rest"), the same verb family as *posare* (to lay a tile) and the same two-beat rhythm as the tagline. Two things no user needs to decode: the elements are *tessere* (tiles) in terracotta, the material of every Tuscan roof and floor; and the sheet is paper, the brand's own surface.

## 2. Meaning (what a user may read, in order of likelihood — HYPOTHESIS)

| Reading | What it carries for the brand |
|---|---|
| Something light landing on something solid | "Si sistema da sé": order arriving without effort; the brand's one motion |
| A sheet filed onto a stack | One record, kept; every movement in its place ("Ogni movimento al suo posto") |
| A tile laid on a slab (*posa*) | Craft, stone, Italy without flags; "Italian like a well-set table" |
| A lid about to close | Done, closed, nothing left to do (the empty Review Inbox: "Niente da fare.") |
| Two strokes becoming one line | Reconciliation: pending and booked, the two legs of a transfer, one movement — the second concept the strategy named in §9 |

The mark contains no letter, no coin, no chart, no arrow, no shield, no lock, no flag, no currency sign, no card. It is not derived from the name; the wordmark carries the name, the mark carries the promise (`brand-strategy.md` §9: "a warm paper field with a small ink mark").

## 3. How it was arrived at (three rounds, what was seen)

| Round | What was rendered | What the 1:1 renders showed | Outcome |
|---|---|---|---|
| 1 — ten sketches (`process-01-round1-ten-sketches.png`) | Two tiles tilted (control); two bricks + one bridging; three pebbles; bar + dot; bar with a dip + pebble; long bar + short bar flush right; base + 62 % lid; three bars; slab + square block; slab + two short tiles — all at 128/64/48/32/24/16 px on paper and on dark | Three pebbles = club suit / Asana; bricks = club/cloud blob at 16 px; three bars = hamburger menu; bar with dip + pebble = hat / avatar; slab + two tiles = bus/face; slab + block = chair; lid at 62 % and 12° = laptop | Only the two-tile control and "bar + dot" survived at 16 px; the equal-tile control still read as "=" |
| 2 — stacks and *punto* (`process-02-round2-stacks-and-punto.png`) | Square-silhouette two-tile stacks (tilt 8/12, mirrored), **heavy base + thin sheet**, bar + dot floating / touching / side by side, cairn of three tiles, three thin tiles, tiles + dot | Dot touching the bar = key / match; dot beside the bar = Morse "·–"; cairn = seated figure; tiles + dot = text block with a badge. **The thin sheet over a heavy base was the only composition whose silhouette at 16 px was not "two bars"**: a block with a line above it, tilt visible from 24 px | The *foglio* (sheet) family chosen for round 3; "bar + dot" kept as the runner-up (§15) |
| 3 — sheet variants (`process-03-round3-foglio-variants.png`) | Sheet full-length / 85 % / tilt 6 / thinner / touching the hinge / taller box base / hinge on the right, plus two-tile and bar + dot controls, all with the icon field | 85 % sheet looks like a peeling label; touching the hinge reads as an *open* box (not settled); the taller base reads as a jewellery box; the right-hand hinge makes the sheet look as if it is sliding off; tilt 6° is lost at 24 px; the thinner sheet (120) reads lighter but is 1.2 px at 16 px in the icon | Full-length sheet, hinge at the left, floating (seam 60), tilt 8°, sheet 140 — DECISION |
| Corner craft (`process-08-first-smoothing-attempt.png`, `process-07-corner-exponent-bug.png`) | Two attempts at continuous-curvature corners | First attempt rendered faceted ("chamfered stone"); second attempt used the wrong superellipse exponent and produced concave *notched* corners (a ticket stub) — caught in the 512 px render, not in the SVG | Corners are now a true superellipse with n = 2.8 (between a circle and a square), which reads as stone at 256 px and as a plain rounded block at 16 px |
| Lockup (`process-06-lockup-scales.png`) | Mark at 1.00 / 0.92 / 0.85 of the `l` ascender height, gaps 0.50 / 0.42 / 0.40 | At 1.00 the slab outweighs the type; at 0.85 the mark looks like a footnote; 0.92 with gap 0.42 balances at 900 px and at 220 px | DECISION: 0.92 / 0.42 |

## 4. Construction notes

Grid: 1024 × 1024 units, `viewBox="0 0 1024 1024"`. Solid fills only. Two closed paths. No strokes, no gradients, no transforms in the file (the rotation is baked into the sheet's path so the file is one plain path per element).

| Element | Value | Note |
|---|---|---|
| Base (*il registro*) | 672 × 340 units, corner radius 120 (0.35 × height), superellipse exponent n = 2.8 | Level; the settled state. 2 : 1 proportion keeps it a slab, not a line (3 : 1 and thinner read as a dash or a typed "=") |
| Sheet (*il movimento*) | 672 × 140 units, corner radius 58 (0.41 × height), same exponent | Same length as the base so the two read as a pair; 0.41 × height keeps the ends slightly squared (a full pill reads as a capsule) |
| Weight ratio | sheet : base = 140 : 340 = 0.41 | The ratio that separates "a light thing on a heavy thing" from "two bars"; 0.35 looked like a hairline at 16 px, 0.5 drifted back toward "=" |
| Hinge | sheet rotated −8° about its bottom-left corner, which floats **60 units above** the base's top edge | The seam never closes: a touching hinge reads as an open box (round 3). Right end rises 672 · sin 8° ≈ 93 units, so the gap at the lifted end is ≈ 153 units |
| Tilt | 8° (DECISION) | 6° disappears at 24 px; 12° tips; 8–9° read at 24 px and stay calm at 256 px |
| Mark bounding box | 685 × 626 units: x 169–855, y 187–813 | 67 % × 61 % of the frame; the union of both elements is centred and then raised by 1.2 % of the frame for the optical centre |
| Thinnest feature | the sheet, 140 units = 1/7.3 of the frame; the seam, 60 units = 1/17 | Both above the brief's 1/24 (43 units) minimum |
| App icon | field Carta scura `#EFE6D5`, mark scaled 0.68 about the centre → base 457 units wide (45 % of the icon), total mark 466 × 426 | No rounded corners drawn; the OS masks them. A dark-mode icon variant (`app-icon-dark.svg`: Notte field `#1F1B17`, mark in Cotto chiaro) is supplied for iOS 18 |
| Wordmark | "lilleri", lowercase, **Geist Sans 600**, tracking −0.02 em, Inchiostro `#1F1B17` | Typeset at this stage (a `<text>` element). Chosen over Manrope, Plus Jakarta Sans, Instrument Sans, Inter and Newsreader in `process-05-wordmark-typefaces.png`: Geist is the only sans in the set whose `l` has a tail, which `naming-analysis.md` D6 requires so that l-i-l-l does not become a picket fence, and its square `i`-dots echo the tile corners |
| Lockup | mark height = 0.92 × ascender height of the `l`; mark bottom on the baseline; gap = 0.42 × ascender | `lockup-horizontal.svg`; dark version with the same geometry |
| Clear space (proposed) | one sheet height (140 units at mark scale) on all sides, measured from the bounding box | OPEN |

## 5. Colour

Territory **T2 — Carta, Inchiostro, Cotto** from `docs/research/brand-competitor-analysis.md` §9, chosen for this direction because the elements are tiles and terracotta is the material of a tile; the other directions explore olive, so the studio gets a real colour comparison, not three variations on one hue. The research's starting value `#8F3B22` (6.62 : 1 on paper, AA) was deepened to **`#86371F`** so that the signature passes **AAA on paper, white and ivory** and keeps presence at 16 px (`process-04-colourways.png` compared `#8F3B22`, `#7A3219`, olive, amaranth and ink in the icon at 60/40/29 px).

Exactly one signature colour. Semantic colours are separate and never share the cotto hue: positive amounts are a teal, **negative amounts are shown in ink with the sign, never in a red**, and the error colour is a plum (`#7E2A4C`, hue ≈ 335°) so that nothing red-adjacent competes with the signature — the rule the research set for T2 ("never encode negatives in cotto").

| Role | Name | Hex | Contrast (FACT, WCAG 2.x, computed with `contrast.mjs`) |
|---|---|---|---|
| Signature | Cotto | `#86371F` | **7.23 : 1 on Carta `#F6F1E7` (AAA)**; **8.14 : 1 on white (AAA)**; 7.68 : 1 on Avorio `#FBF8F2` (AAA); 6.57 : 1 on the icon field `#EFE6D5` (AA) |
| Paper (brand background) | Carta | `#F6F1E7` | Ink on it 15.20 : 1 (AAA) |
| Paper, deeper (icon field, secondary surfaces) | Carta scura | `#EFE6D5` | Ink on it 14.56 : 1; only 1.24 : 1 against white and 1.11 : 1 against the iOS light home screen `#F2F2F7` — see §7 |
| Card surface | Avorio | `#FBF8F2` | — |
| Ink (text, wordmark) | Inchiostro | `#1F1B17` | as above |
| Secondary text | — | `#6B635A` | 5.24 : 1 on Carta (AA) |
| Signature on dark | Cotto chiaro | `#E09A7A` | 8.02 : 1 on Notte `#15130F` (AAA); 7.39 : 1 on the dark surface `#1F1B17` (AAA). Chosen over `#E3A58C` (8.86 : 1, reads peach) and `#DC9470` (6.94 : 1 on the surface, misses AAA) |
| Dark background | Notte | `#15130F` | Dark text `#F3EDE2` on it 15.92 : 1 |
| Semantic (light) | positive teal `#1F6B5E` 5.61 : 1 · warning ochre `#8A5A12` 5.25 : 1 · error plum `#7E2A4C` 8.03 : 1 · info `#2F5C8A` 6.18 : 1 | all AA or better on Carta |
| Semantic (dark) | `#7FC4B4` 9.24 : 1 · `#E3B45B` 9.67 : 1 · `#E39AB5` 8.44 : 1 · `#8FB6E0` 8.78 : 1 | all AAA on Notte |

Full token set in `palette.json`; applied to a mock home screen in `palette-sheet.png` (light and dark). In the mock, cotto carries the one button, the progress fill and the "Controlla" link; the renewal warning is plum, income is teal, expenses are ink — the signature is never a signal of good or bad.

**Hue honesty (FACT):** Cotto `#86371F` is hue 14°, saturation 62 %, lightness 32 %. Satispay's orange `#FF3D00` is hue 14°, saturation 100 %, lightness 50 %. Same hue; the separation is entirely in saturation, lightness and the cream field. This is the research's T2 caveat and it is the first thing to test (§13, §15).

## 6. Strengths

1. **It says the product truth with the product's own vocabulary** — a record and a movement — and with nothing from the finance drawer: no coin, chart, wallet, card, lock, letter or €.
2. **Two weights, one silhouette.** The unequal elements give a shape that is not "=", not a menu, not a bar chart and not a letter; at 16 px it is "a block with a line", which no neighbour on the shelf has.
3. **Found instantly on the shelf** (§9): the only warm, light, desaturated square among 29 saturated ones in both seeds, and the only dark glyph on a light field apart from one pink icon.
4. **Native to the warm paper system** the research decided on (D2): cotto on cream is the opposite of the category's cold black-on-white premium default and of its neon.
5. **The brand's one motion is built in.** 8° → 0° with the sheet settling flush on the base is the signature animation (splash, a transaction being reconciled, the inbox reaching zero); the 0° state is a second, legitimate static form.
6. **Works in one colour** (mono, reversed, embossed, engraved, die-cut) with no loss of construction, because the story is in the proportions, not the colour.
7. **Travels.** No flag, no dialect joke, no currency. Terracotta reads "Mediterranean" to a European and "warm" to everyone else.

## 7. Weaknesses (honest)

1. **The idea lives in the tilt and the gap, and both shrink first.** At 16 px the mark is "a block with a line above it"; the settling reads from 24 px and is unambiguous from 32 px.
2. **Lid readings.** At 128 px and above a thin sheet floating over a slab can read as a box with its lid ajar, a laptop seen from the side, or — the closest formal neighbour — a film clapperboard (*ciak*). The floating seam and the terracotta reduce it; they do not remove it. HYPOTHESIS to test with a still image.
3. **A rising diagonal.** The sheet slopes up to the right. In isolation a rising line is a growth cue the brief forbids; here the slab beneath it and the sheet's thickness make it a thing, not a line, and the mirrored version (sheet descending to the right) read as *slipping* in round 3. To be tested; if "trend" is ever reported, lower the tilt to 7° rather than mirror.
4. **Same hue as Satispay.** The most recognised Italian fintech icon is a saturated orange square; Lilleri's is a cream square with a deep cotto mark. Different objects, same hue. The research's gate test (20 users, 60 px, 2 s) is mandatory before this colour is frozen; the olive fallback is in `process-04-colourways.png` and costs nothing to switch to.
5. **Light-on-light edge.** The paper field is 1.11 : 1 against the iOS light home screen; on a plain light wallpaper the square softens into the background (seen in the "iOS home (light)" row of `icon-sheet.png`). Photo wallpapers, the App Store's hairline border and the dark-mode variant handle the usual cases.
6. **No link to the name.** The mark does not teach "Lilleri"; the wordmark must, which argues for the lockup rather than the symbol alone in early communication.
7. **Thin element in tinted-icon modes.** In iOS "tinted" icons the 1.5 px sheet at 16 px may vanish; a size-specific cut with a 170-unit sheet is the fix (§15).

## 8. Memorability

Medium-high (HYPOTHESIS). The mark is *nameable* — "the tile landing", "la tessera che si posa", "the sheet on the block" — which single-letter icons are not, and it has one gesture to remember. The colour pair (cotto on cream) does much of the work at 60 px; in black the mark is more generic than in colour. Expected to be more memorable than any letter-on-colour icon in the set and less than a figurative silhouette with a strong outline (a star, a feather). The settle animation is the memory hook the still image lacks.

## 9. App Store / home-screen recognisability (what the shelf test showed, FACT for the renders)

- **Seed 3 (`shelf.png`):** Lilleri at slot 6 (second row, first column). On a near-black home screen it is the only warm, light square; the eye lands on the square before the glyph. Found before reading any label.
- **Seed 11 (`shelf-seed11.png`):** slot 27 (bottom row, fourth column). This seed has three pink squares (Money, Fund, Flow), the nearest neighbours in lightness; the cream square still reads as a different family (warm neutral, not pink), and the cotto block-and-line does not resemble the black bar chart on the pink Fund icon.
- **Glyph neighbours at 60 px:** the generic "card" icons (a rounded rectangle with a horizontal stripe) are the closest family. Lilleri's base has no stripe and its sheet floats above the slab at an angle, so at 60 px the pair reads as "slab + lid", not "card". The dark glyph on a light field is itself a differentiator: every other icon on the shelf is a white glyph on a saturated field.
- **What the toolkit cannot show:** the real neighbours. The research's rule 4 (60 px next to Satispay, Revolut, N26, PayPal and Intesa on iOS and Android) is the test that matters, and for this colour it is the gate (§15).

## 10. Legibility at 16 / 24 / 32 px (FACT, measured from `icon-sheet.png` at 1 : 1)

| Size | Base | Sheet | Seam at the hinge | Gap at the lifted end | What is seen |
|---|---|---|---|---|---|
| 16 px (icon) | 7.1 × 3.6 px | 1.5 px | 0.6 px (merges) | 1.6 px | A cream square with a solid cotto block and a thin line above it; the line is visibly not parallel to the block |
| 24 px | 10.7 × 5.4 px | 2.2 px | 1.0 px | 2.4 px | Block and sheet, the sheet clearly tilted; the wedge opens to the right |
| 32 px | 14.3 × 7.2 px | 3.0 px | 1.3 px | 3.3 px | The settling reads; the seam at the hinge appears; corners start to show |
| 48–64 px | — | — | — | — | Full construction; superellipse corners legible at 64 px |
| 16 px, symbol alone (no field) | 10.7 × 5.3 px | 2.2 px | 0.9 px | 2.4 px | Holds as "block + line" on white and on dark; below 24 px prefer the icon with its field |

## 11. Dark / light behaviour

Light is the brand's native mode (`brand-strategy.md` §10). On light: Cotto `#86371F` on Carta, white or ivory, AAA. On dark: Cotto chiaro `#E09A7A` on Notte, AAA, with the wordmark in `#F3EDE2` (`dark-lockup.png`). The dark mark is the same geometry with a different fill; nothing is redrawn. iOS 18 icon variants: light = `app-icon.svg`; dark = `app-icon-dark.svg` (Notte field, Cotto chiaro mark, `icon-sheet-dark-variant.png`); tinted = `symbol-mono.svg` as the alpha mask (OPEN: the thin sheet needs the size-specific cut of §15).

## 12. Monochrome behaviour

`symbol-mono.svg` (pure `#000000`) is the same construction and loses nothing structurally: no stroke, no gradient, no second colour. What it loses is warmth and part of the colour-borne distinctiveness; in black the "lid / clapperboard" readings are a little stronger. Reversed white on black works identically (`symbol-dark@256.png` shows the tint; a pure-white version is the same file with the fill changed). One-colour print, embossing, engraving and die-cutting are all possible; the 60-unit seam is the only feature that needs a minimum size in print (≈ 0.3 mm at a 5 mm mark).

## 13. Similarity risks versus named competitors (described from the research, never copied)

| Brand | Their mark (from `brand-competitor-analysis.md`; ASSUMPTION where it says so) | Risk | Why |
|---|---|---|---|
| Revolut | White "R" with a diagonal cut on near-black `#191C1F` | Negligible | Letter vs object; black vs cream |
| N26 | "N26" wordmark on teal `#088177` | Negligible | Wordmark-only; teal vs cotto |
| Klarna | Wordmark with a full stop, Klarna Pink `#FFB3C7` | Negligible | — |
| **Satispay** | Rounded intertwined loop on orange `#FF3D00` (Koto, May 2024) | **Medium (colour), low (form)** | Identical hue 14°; separation only by saturation (62 % vs 100 %), lightness (32 % vs 50 %) and the cream field vs a solid orange square. Form is unrelated (two straight tiles vs a loop). The 20-user, 60 px, 2-second confusion test is the gate; ≤ 10 % confusion or switch to olive |
| Wise | Bright green `#9FE870` on forest `#163300`, merged-letterform wordmark | Negligible | Opposite colour family; wordmark-led |
| Curve | Minimal wordmark, dark icon with a blue accent (ASSUMPTION) | Negligible | — |
| Monzo | Hot Coral `#FF4F40` (hue 5°); the icon echoes the card | Low | Coral is nearby in hue but saturated and light; the "card" family reading is the one to watch, and the floating sheet keeps the mark out of it |
| Lydia / Sumeria | Lydia blue "L"; Sumeria greys and deep greens | Negligible | Letter vs object; cool vs warm |
| Lili | US business banking; mark UNKNOWN in the research | UNKNOWN (visual) / known (name) | The research flags the *name*, not the mark; Lili's icon must be checked before any figurative filing |
| Emma | Purple lowercase "e" (ASSUMPTION) | Negligible | — |
| Monarch | Butterfly / "M" on indigo (ASSUMPTION) | Negligible | — |
| Copilot | Dark icon with a bright glyph (ASSUMPTION) | Negligible | Dark field vs cream |
| YNAB | "YNAB" wordmark on blue | Negligible | — |
| Generic forms | Clapperboard; open box / lid; laptop profile; "card with a stripe"; "=" if the sheet thickens | Medium | The real similarity risk of this direction is generic, not a competitor. Defences: unequal weights, the floating seam, stone corners, cotto on cream. A figurative-mark search for "slab with tilted bar" in classes 9/36/42 is recommended with the word-mark clearance |

## 14. Why this instead of the runner-up ("bar + dot")

"Il punto" — a level bar with a dot settling onto its right end — was the cleanest alternative in rounds 1–3 and has a strong verbal hook (*fare il punto* = to take stock; *mettere un punto* = to settle a matter; the dots of the two `i`s and the two full stops of the tagline). It was not chosen because at 16 px it is a dash and a speck, because rotated 90° it is a lowercase "i" (a letter icon by another route), and because "a ball above a bar" reads as bouncing, not settling. It is recorded in `process-02-round2-stacks-and-punto.png` (R5–R7) and `process-03-round3-foglio-variants.png` (P1) in case the designer wants to revisit it.

## 15. What a human designer should refine (OPEN)

1. **The Satispay gate, first.** Place `app-icon.svg` at 60 px next to the real Satispay, Revolut, N26, PayPal and Intesa icons on an iOS and an Android home screen; 20 Italian users, "which is Satispay?" after 2 s. If confusion > 10 %, rebuild the same mark in Oliva `#43522D` (`process-04-colourways.png`, row 3) — nothing else changes.
2. **Settling vs lid vs trend.** Ten users, still image only, "what is happening?". If "opening" or "rising" beats "landing", try tilt 7° and a 48-unit seam before anything else; do not mirror the hinge (round 3 showed the mirrored sheet slipping).
3. **True superellipse curves.** The paths are sampled polylines (14 points per quarter corner, invisible at any size rendered). Redraw each corner as a G2 continuous curve in the drawing tool so the file is editable and the outline is clean at signage size.
4. **Size-specific cuts.** ≥ 48 px as delivered; a 16–32 px cut with the sheet at 170 units and the seam at 72 so that the sheet survives iOS tinted icons and 1-bit favicons.
5. **The motion.** Specify the one brand motion: 8° → 0° with an ease-out and no bounce (bounce reads playful); the 0° state is the empty-inbox hero ("Niente da fare oggi.").
6. **Wordmark.** Draw "lilleri" rather than typeset it: match the `l`-tail radius and the `i`-dot squares to the tile corners, equalise the three `l`s, set tracking per size, and define clear space = one sheet height. Keep Geist 600 as the fallback.
7. **Icon field edge.** Test on five common light wallpapers; if the edge is lost, deepen the field to about `#EAE0CC` for the icon only, or rely on the iOS 18 dark/tinted variants.
8. **Colour discipline.** Lock Cotto `#86371F` and Cotto chiaro `#E09A7A`; run deuteranopia/protanopia simulations against the teal positive and the plum error; confirm cotto never marks a negative amount or an error state.
9. **UI derivatives.** Derive the list-row block, the progress fill and a tile pattern from the settled base so the mark lives inside the product, not only on the icon; the sheet at 0° is a natural "reconciled" row marker.
10. **Figurative-mark search** for "slab with a tilted bar" in classes 9/36/42, with the word-mark clearance in `naming-analysis.md`.

## 16. Files (relative to the repository root)

Deliverables, `packages/brand/explorations/direction-a/`:

| File | What it is |
|---|---|
| `symbol.svg` | The mark, Cotto `#86371F` on transparent, `viewBox 0 0 1024 1024`, two paths |
| `symbol-mono.svg` | Same construction in `#000000` |
| `symbol-dark.svg` | Same construction in Cotto chiaro `#E09A7A` for dark backgrounds |
| `app-icon.svg` | iOS-style icon, field `#EFE6D5`, mark at 0.68, no rounded corners (OS mask) |
| `app-icon-dark.svg` | Dark-mode icon variant, field `#1F1B17`, mark in Cotto chiaro |
| `wordmark.svg` / `wordmark-dark.svg` | "lilleri", Geist 600, −0.02 em, ink / dark ink |
| `lockup-horizontal.svg` / `lockup-horizontal-dark.svg` | Mark + wordmark, light / dark fills |
| `palette.json` | Token set used for the palette sheet |
| `symbol@256.png` | Mark at 256 px on Carta |
| `symbol@1024.png` | Mark at 1024 px on Carta (corner inspection) |
| `symbol-mono@256.png` | Mono mark at 256 px on white |
| `symbol-dark@256.png` | Dark-tint mark at 256 px on Notte |
| `app-icon@256.png` / `app-icon-dark@256.png` | App icon at 256 px, light and dark variants |
| `wordmark.png` | Wordmark render on Carta |
| `lockup.png` | Horizontal lockup on Carta |
| `dark-lockup.png` | Horizontal lockup on Notte |
| `icon-sheet.png` | App icon at 256 → 16 px on white, dark, iOS light and iOS dark backgrounds, 1 : 1 px |
| `icon-sheet-dark-variant.png` | The dark icon variant on the same four backgrounds |
| `shelf.png` | Recognition test, seed 3 (Lilleri at slot 6) |
| `shelf-seed11.png` | Recognition test, seed 11 (Lilleri at slot 27) |
| `palette-sheet.png` | Swatches with contrast ratios and a mock home screen, light and dark |

Process (kept so the iteration can be audited):

| File | What it shows |
|---|---|
| `process-01-round1-ten-sketches.png` | Round 1: ten compositions at 128–16 px on paper and dark; the club-suit, hamburger, avatar, laptop and bus readings that eliminated eight of them |
| `process-02-round2-stacks-and-punto.png` | Round 2: square-silhouette stacks, the heavy-base + thin-sheet idea (R4), the *punto* family (R5–R7), cairn, three tiles, tiles + dot |
| `process-03-round3-foglio-variants.png` | Round 3: seven sheet variants with the icon field, plus two-tile and bar + dot controls |
| `process-04-colourways.png` | Cotto `#8F3B22`, `#7A3219`, Oliva, Amaranto and Inchiostro: symbol at 240 px, icon at 60/40/29 px on dark and light grounds, dark tint on Notte, with contrast ratios |
| `process-05-wordmark-typefaces.png` | Geist 500/600/700, Manrope, Plus Jakarta Sans, Instrument Sans, Inter, Newsreader 500/600 at 96/32/20/13 px, plus "Lilleri Plus" |
| `process-06-lockup-scales.png` | Mark at 1.00 / 0.92 / 0.85 of the ascender, gaps 0.50 / 0.42 / 0.40 |
| `process-07-corner-exponent-bug.png` | The concave-corner render that the wrong superellipse exponent produced (caught at 512 px) |
| `process-08-first-smoothing-attempt.png` | The faceted first attempt at smooth corners |

## Decisions in this direction

| # | Decision | Type |
|---|---|---|
| A1 | Two unequal elements: base 672 × 340 r120, sheet 672 × 140 r58, superellipse n = 2.8; hinge at the left floating 60 units above the base; tilt 8° | DECISION |
| A2 | Signature Cotto `#86371F` (deepened from the research's `#8F3B22` for AAA on paper and white); Cotto chiaro `#E09A7A` on dark; paper field `#EFE6D5` for the icon; negatives in ink, errors in plum, never red | DECISION (conditional on the Satispay gate) |
| A3 | Wordmark typeset in Geist Sans 600 lowercase at this stage; custom drawing recommended | DECISION (pending custom drawing) |
| A4 | Lockup rule: mark height = 0.92 × `l` ascender, bottom on the baseline, gap 0.42 × ascender | DECISION |
| A5 | The 8° → 0° settle is proposed as the brand's single motion; the 0° state is a legitimate secondary form | RECOMMENDATION |
| A6 | "Bar + dot" (*il punto*) recorded as the runner-up, not developed | DECISION |

## Open questions

| # | Question | How to resolve |
|---|---|---|
| Q1 | Confusion rate with Satispay at 60 px (same hue) | Real-icon shelf test, 20 users (§15.1); olive fallback ready |
| Q2 | Does the still mark read as settling, as a lid opening, or as a rising line? | 10-user still-image test (§15.2) |
| Q3 | Does the cream field survive light wallpapers and Android adaptive-icon masks? | Device test on 5 wallpapers, Android 13+ themed icons |
| Q4 | Lili's figurative mark and any registered "slab + bar" marks in 9/36/42 | Trademark search with the word-mark clearance |
| Q5 | Custom wordmark vs typeset Geist | Designer refinement + the name-recall test already planned in `naming-analysis.md` |
