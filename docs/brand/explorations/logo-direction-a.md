# Logo exploration — Direction A: "Settling into order" (working name: *Posa*)

**Project:** LILLERI (consumer PFM, Italy-first then Europe).
**Document type:** identity exploration, one of three directions (Phase 2). Not a final identity.
**Date:** 2026-10-02.
**Inputs:** `docs/brand/brand-strategy.md`, `docs/brand/messaging-framework.md`, `docs/brand/naming-analysis.md`, `docs/research/brand-competitor-analysis.md` (§3 palette census, §4 shape landscape, §7 clichés, §9 territory T1), `docs/research/raw/typography-options.md` (§6–§7).
**Assets:** `packages/brand/explorations/direction-a/` (SVG sources, PNG renders, process sheets). All renders were made with the Phase-2 rendering toolkit (resvg) and inspected at 1:1 pixels; everything stated below about legibility is what was *seen* in those renders, not inferred.

**Labels.** FACT = measured or computed (contrast ratios, pixel sizes, what the renders show). HYPOTHESIS = a reading that must be tested with users. DECISION = a choice made inside this direction. OPEN = for the human designer.

---

## 1. Concept

**Two tiles. The lower one is settled. The upper one is in its last ten degrees of coming to rest.**

The product promise is that scattered things settle into order by themselves ("Tu spendi. Lilleri sistema."). The mark is the freeze-frame of that promise one instant before it completes: a stack of two soft rounded tiles — the same shape, the same colour — where the bottom tile is perfectly level and the top tile is hinged on one end, its other end still lifted by 10°. Nothing is pushing it. It is simply landing.

Italian working name: **Posa** (*posarsi* = to come to rest; *la posa* is also what a mason calls laying a tile). The two tiles are *tessere* — the units of a mosaic, the thing that has exactly one right place ("Ogni movimento al suo posto", finalist line #7).

Why two elements and not three or four: the brief allowed 2–4; every three-element version tested (stacks of three slabs, three pebbles, a slab with a pebble) lost its meaning at 24 px and below — three horizontal slabs become a hamburger menu, three pebbles become a dot cluster, a pebble on a slab becomes an avatar (see `process-01-first-sketches.png`, `process-02-second-sketches.png`). Two chunky tiles keep one silhouette at 16 px and still carry the story at 24 px and above.

## 2. Meaning (what a user may read into it, in order of likelihood — HYPOTHESIS)

| Reading | Link to the brand |
|---|---|
| Two things stacking neatly, the top one landing | "Si sistema da sé" — order arriving by itself; the brand's one motion |
| A soft "=" sign | *Il conto torna* — the accounts balance; two legs of a transfer become one; pending = booked |
| Two tiles / two stones at rest | Calm, weight, "a posto"; the Tuscan *tessera* without folklore |
| A ledger line with a second line being filed onto it | One correct record, kept in order |

The mark deliberately contains no letter, no coin, no chart, no arrow, no shield, no flag, no currency sign. It is not derived from the name; the wordmark carries the name, the mark carries the promise (consistent with `brand-strategy.md` §9 "a warm paper field with a small ink mark").

## 3. Construction notes

Grid: 1024 × 1024 units, `viewBox="0 0 1024 1024"`. Solid fills only; no strokes, no gradients, no transforms other than one rotation (which can be baked into a path by the designer).

| Element | Value | Note |
|---|---|---|
| Tile size | 680 × 290 units (aspect 2.34 : 1) | Chunky enough to read as a *tile*, not a line; the 3 : 1 and thinner versions read as a typed "=" or menu lines (see `process-03-proportions.png`, V1) |
| Corner radius | 104 units = 0.36 × tile height | Soft but not a capsule (a full pill reads as medicine); the designer should convert to a superellipse (see §13) |
| Bottom tile | x 190–870, y 590–880, level | The settled state |
| Top tile | same size, hinged on its **bottom-left corner** at (190, 534), rotated −10° | Right end lifted by 680 · sin 10° ≈ 118 units |
| Seam at the seated end | ≈ 72 units (hinge sits 56 above the bottom tile; the rounded corner rises ~16 more) | = 1/14 of the frame; 1.0 px at 16 px in the app icon. This seam must never close: at 10° with the earlier right-hand hinge it closed and the two tiles merged into one jaw-shaped blob (process round 4; corrected) |
| Gap at the lifted end | ≈ 154 units | 2.1 px at 16 px in the app icon |
| Mark bounding box | 714 × 734 units, centred optically by measuring the rendered pixels (bbox 156–869 × 146–879) | ≈ 70 % of the frame |
| Thinnest feature | the 72-unit seam | Above the brief's 1/24 rule (43 units) |
| App icon | field `#F1EADC`, mark scaled 0.889 → ≈ 62 % of the icon width | iOS masks the corners; no corner radius drawn |
| Wordmark | "lilleri", lowercase, Geist 600, −0.025 em tracking, ink `#1F1B17` | Text element at this stage; Geist's tailed `l` and square `i` dots echo the tiles (`naming-analysis.md` D6 asks for a distinct `l`) |
| Lockup | mark height = ascender height of the `l`; mark bottom on the baseline; gap = 0.55 × that height | Tested 0.42–0.70; 0.42 was tight, 0.70 fell apart (see process round 5) |
| Clear space (proposed) | one tile height (290 units at mark scale) on all sides | OPEN — to be confirmed in the brand book |

Tilt angle: 8°, 10° and 12° were rendered side by side at 64–16 px. 8° disappears at 24 px; 12° looks like tipping at 100 px; **10° is the DECISION** (reads at 24 px, calm at 256 px).

## 4. Colour

Territory **T1 — Carta, Inchiostro, Oliva** from `docs/research/brand-competitor-analysis.md` §9, with one change: the olive was deepened from the research starting point `#4F5D3A` (6.30 : 1 on paper, AA) to **`#43522D`** so that the mark passes AAA on every paper tone and keeps its presence at 16 px (the lighter olive went grey-green at that size in the renders).

Exactly one signature colour. The semantic colours (positive, negative, warning, info) are separate and never share the olive hue: positives are a teal, not a green, so olive never means "gain" (research rule).

| Role | Name | Hex | Contrast (FACT, WCAG 2.x) |
|---|---|---|---|
| Signature | Oliva | `#43522D` | 7.51 : 1 on Carta `#F6F1E7` (AAA); 8.46 : 1 on white (AAA); 7.06 : 1 on the icon field `#F1EADC` (AAA); 7.98 : 1 on Avorio `#FBF8F2` (AAA) |
| Paper (brand background) | Carta | `#F6F1E7` | Ink on it 15.20 : 1 (AAA) |
| Paper, deeper (app-icon field, secondary surfaces) | Carta scura | `#F1EADC` | Ink on it 14.29 : 1 (AAA); only 1.20 : 1 against pure white and 1.07 : 1 against the iOS light home screen `#F2F2F7` — see weaknesses |
| Card surface | Avorio | `#FBF8F2` | — |
| Ink (text, wordmark) | Inchiostro | `#1F1B17` | as above |
| Secondary text | — | `#6B635A` | 5.24 : 1 on Carta (AA) |
| Signature on dark | Salvia | `#9FB084` | 7.97 : 1 on Notte `#15130F` (AAA); 7.35 : 1 on the dark surface `#1F1B17` (AAA). Chosen over `#A7B58B` (8.50 : 1, reads pastel) and `#8FA37E` (6.81 : 1, reads muddy) in a side-by-side render |
| Dark background | Notte | `#15130F` | Dark text `#F3EDE2` on it 15.92 : 1 |
| Semantic (light) | positive teal `#1F6B5E` 5.61 : 1 · warning `#8A5A12` 5.25 : 1 · negative `#A8352C` 5.81 : 1 · info `#2F5C8A` 6.18 : 1 | all AA on Carta |

Full token set in `palette.json`; applied to a mock home screen in `palette-sheet.png` (light and dark).

## 5. Strengths

1. **It says the product truth without a metaphor from the finance drawer.** No coin, chart, wallet, card, lock or letter; the composition itself is the promise (reconciliation, "il conto torna", things in their place).
2. **One silhouette at every size.** Two solid masses; the smallest feature is 1/14 of the frame. It held at 16 px in every render, on light and dark.
3. **The app icon is found instantly.** In both shelf tests (`shelf.png` seed 3, slot 6; `shelf-seed11.png` seed 11, slot 27) the cream square with the olive tiles was the only warm, light, desaturated icon on a grid of 29 saturated squares.
4. **Native to the warm paper system** the strategy already decided on (D2 in the competitor analysis, "calm not cold"). Olive on cream is the opposite of the category's cold black-on-white premium default and of its neon.
5. **It comes with the brand's one motion built in.** The 10° → 0° settle is the signature animation (splash, empty-inbox state, a transaction being reconciled); the 0° state is a second, legitimate form of the mark for "all in order".
6. **Works in one colour** (mono, reversed, embossed, print) with no loss of construction.
7. **Travels.** No Italian flag, no dialect joke, no currency; a Tuscan *tessera* for those who know, two tiles for everyone else.

## 6. Weaknesses (honest)

1. **The idea lives in the tilt, and the tilt is the first thing to go.** At 16 px the mark is "two soft bars"; the story returns at 24 px and is clear from 32 px. At favicon size the mark is distinctive only together with its colour and field.
2. **Static ambiguity: settling or slipping?** A single frame of a tilted tile can read as *misaligned* (the wrong state) rather than *about to align*. This is the HYPOTHESIS to test first; the motion resolves it, a still image may not.
3. **Formal neighbours.** Two stacked horizontal bars sit in the family of "=", the two-line menu, the card-with-stripe glyph (three of the generic shelf icons are exactly that) and the "layers" icon. The tilt and the equal tile heights are what separate it.
4. **Furniture reading.** At large sizes the two rounded tiles can read as two cushions or a mattress and pillow. Warm, but not finance. Superellipse corners (§13) will reduce it.
5. **Light-on-light edge.** The paper icon field has no contrast against a flat white or `#F2F2F7` background; on a photo wallpaper (the usual case) and in the App Store (hairline border) this is handled, on a plain light wallpaper the square softens into the background (seen in the "iOS home (light)" row of `icon-sheet.png`).
6. **No link to the name.** The mark does not teach "Lilleri"; the wordmark must do that work on its own, which argues for the lockup, not the symbol alone, in early communication.
7. **Olive is a narrow road.** Cooler or darker and it reads military/khaki; lighter and it reads "organic/eco". The hue must be locked and never desaturated further in UI tints.

## 7. Memorability

Medium-high (HYPOTHESIS). It is *nameable* ("le due tessere", "the two green tiles", "the settling =") — the test that single-letter icons fail — and it has one gesture to remember. Most of the memory, however, is carried by the colour pair (olive on cream); in black the mark is more generic than in colour. Expected to be more memorable than a letter-on-colour icon and less than a figurative symbol with a strong silhouette (a star, a butterfly). The empty-inbox animation is the memory hook the still image lacks.

## 8. Scalability

High (FACT for geometry). Solid fills, two elements, minimum feature 1/14 of the frame, no strokes to thin out. From 16 px to signage without a redrawn version, although §13 recommends a size-specific favicon cut with a stronger tilt. The settled 0° tile also scales *down* into a UI element (a list row, a progress block) and *out* into a pattern (rows of tiles as a ledger texture) without new drawing.

## 9. App Store / home-screen recognisability (what the shelf test showed)

- Seed 3 (`shelf.png`): Lilleri at slot 6, second row, first column. On a near-black home screen it is the only warm, light square; the olive glyph is quiet enough that the square itself is the first thing seen. Found before reading any label.
- Seed 11 (`shelf-seed11.png`): slot 27, bottom row. This seed has two pastel-pink squares and one pink-with-bars, the nearest neighbours in lightness; the cream square still reads as a different family (warm neutral, not pink) and the olive glyph does not resemble the black bar-chart glyph on the pink icon.
- A control run with an **olive field and cream tiles** (`process-05-shelf-olive-field-rejected.png`) was clearly less findable: it fell into the group of near-black and dark-green squares. DECISION: paper field.
- Where it is weakest at 60 px: the glyph is formally closest to the "card" glyphs (a rounded rect with a horizontal stripe). The equal tile heights and the tilt distinguish it; on a real home screen the test that matters is next to Satispay, Revolut, N26, PayPal and Intesa (`brand-competitor-analysis.md` D7), which this toolkit cannot reproduce — see §13.

## 10. Legibility at 16 / 24 / 32 px (FACT, from `icon-sheet.png`, 1:1 pixels)

| Size | Tile | Seam (seated end) | Gap (lifted end) | What is seen |
|---|---|---|---|---|
| 16 px (icon) | 9.4 × 4.0 px | 1.0 px | 2.1 px | Two olive bars in a cream square; the wedge is a hint, the mark is a recognisable blob of the right colour |
| 24 px | 14.2 × 6.0 px | 1.5 px | 3.2 px | Two tiles, the top one visibly askew |
| 32 px | 18.9 × 8.1 px | 2.0 px | 4.3 px | The settling reads; corners start to show |
| 48–64 px | — | — | — | Full construction, the hinge/wedge story is clear |
| 16 px, symbol alone (no field) | 11.2 px wide, tiles 4.5 px | 1.1 px | — | Holds as "two bars"; use the icon with its field wherever possible below 24 px |

## 11. Dark / light behaviour

Light is the brand's native mode (strategy §10). On light: Oliva `#43522D` on Carta/white, AAA. On dark: Salvia `#9FB084` on Notte `#15130F`, AAA, with the wordmark in `#F3EDE2` (`dark-lockup.png`). The dark mark is the same geometry in a different fill — no re-drawing. For iOS 18 icon variants: light = as delivered; dark = Notte field with Salvia tiles; tinted = the mono symbol as an alpha mask (OPEN: produce the three files).

## 12. Monochrome behaviour

`symbol-mono.svg` (pure `#000000`) is the same construction and loses nothing structurally: no stroke, no gradient, no secondary colour. What it loses is warmth and part of its distinctiveness (in black the "=" and "two-line menu" readings get stronger). Reversed white on black works identically. One-colour print, embossing and engraving are all possible.

## 13. Similarity risks versus named competitors (described, never copied)

| Brand | Their mark (from the research; ASSUMPTION where noted) | Risk | Why |
|---|---|---|---|
| Revolut | White "R" with a diagonal cut on near-black | Negligible | Letter vs abstract; black vs cream |
| N26 | "N26" wordmark on teal `#088177` | Negligible | Wordmark-only; teal vs olive (175° vs ~85°, saturated vs desaturated) |
| Klarna | Wordmark with full stop, Klarna Pink | Negligible | — |
| Satispay | Rounded intertwined loop on orange `#FF3D00` (Koto, May 2024) | Low | Shares only a "soft rounded" formal language; loops vs tiles, orange vs olive. The icon-confusion test the research mandates (20 users, 60 px) is still required because Satispay is the most recognised Italian icon |
| Wise | Bright green `#9FE870` on forest `#163300`, merged-letterform wordmark | Low–medium | The only neighbour in the green family. Olive is warm, dark and desaturated; the cream field keeps the icon out of the "green square" group. If the icon field ever became olive, this risk rises (see the rejected control) |
| Curve | Minimal wordmark, dark icon with blue accent (ASSUMPTION) | Negligible | — |
| Monzo | Hot Coral `#FF4F40`; the icon echoes the card | Low–medium (form, not colour) | Two stacked bars can read as a card; Monzo's coral vs our olive keeps them apart, but the "card" family reading is the one to watch |
| Lydia / Sumeria | Lydia blue "L"; Sumeria greys and deep greens | Low | Letter vs abstract; Sumeria's deep greens are cooler and used without a cream field (ASSUMPTION) |
| Lili | US business banking; mark UNKNOWN in the research | UNKNOWN (visual) / known (name) | The research flags the *name* similarity (LIL-), not the mark. Lili's icon must be checked before any filing of a figurative mark |
| Emma | Purple lowercase "e" (ASSUMPTION) | Negligible | — |
| Monarch | Butterfly/"M" on indigo (ASSUMPTION) | Negligible | — |
| Copilot | Dark icon with a bright glyph (ASSUMPTION) | Negligible | Dark field vs cream |
| YNAB | "YNAB" wordmark on blue | Negligible | — |
| Generic | "=" glyph, two-line menu, "layers", card-with-stripe, "pause" if rotated | Medium | The real similarity risk of this direction is generic, not a competitor; the tilt, the equal heights and the colour pair are the defence. A figurative-mark search for stacked rounded bars (classes 9/36/42) is recommended alongside the word-mark clearance in `naming-analysis.md` |

## 14. What a human designer should refine (OPEN)

1. **Superellipse tiles.** Replace the rounded rectangles with a true squircle (iOS-icon curvature, n ≈ 4–5) so the tiles read as stone/tessera, not as UI buttons or cushions; keep the 0.36 radius-to-height ratio as the starting point.
2. **Size-specific cuts.** 10° at ≥ 48 px; 13–14° in a dedicated 16–32 px favicon/notification cut so the wedge survives (the seam must stay ≥ 1 px: at a stronger tilt the hinge offset has to be recomputed, as the round-4 merge showed).
3. **Settling vs slipping test.** Ten users, still image only, "what is happening?" If "falling/misaligned" wins, test the mirrored hinge (seated end on the right) and a 6° variant before abandoning the tilt.
4. **The motion.** Specify the one brand motion: 10° → 0° with an ease-out and no bounce (bounce reads playful); the 0° state is the empty-inbox hero ("Niente da fare oggi.").
5. **Wordmark.** Draw "lilleri" rather than typeset it: match the `l` tail radius and the `i`-dot squares to the tile corner, equalise the three `l`s, fix tracking per size, define clear space = one tile height. The Newsreader serif alternate (`wordmark-alt-newsreader.png`) is more distinctive and more "premium Italian" but risks "old-fashioned" and splits the type system; keep it as a marketing-display option only, per `typography-options.md` §7.
6. **Icon field edge.** Test the icon on five common light wallpapers; if the edge is lost, darken the field to about `#ECE4D4` for the icon only, or rely on the iOS 18 dark/tinted variants.
7. **Colour discipline.** Lock Oliva `#43522D` and Salvia `#9FB084`; run deuteranopia/protanopia simulation against the positive teal and negative red; confirm olive is never used for a positive amount or a success state.
8. **The real shelf.** Place the icon next to the actual Satispay, Revolut, N26, PayPal and Intesa icons at 60 px on iOS and Android (the research's rule 4); record the 2-second "which is which" rate (target ≤ 10 % confusion).
9. **Pattern and UI derivatives.** Derive the list-row block, the progress block and a tile pattern from the settled tile so the mark lives inside the product, not only on the icon.
10. **Figurative-mark search** for stacked rounded bars, classes 9/36/42, together with the word-mark clearance.

## 15. Files (relative to the repository root)

Deliverables, `packages/brand/explorations/direction-a/`:

| File | What it is |
|---|---|
| `symbol.svg` | The mark, Oliva on transparent, `viewBox 0 0 1024 1024` |
| `symbol-mono.svg` | Same construction in `#000000` |
| `symbol-dark.svg` | Same construction in Salvia `#9FB084` for dark backgrounds |
| `app-icon.svg` | iOS-style icon, field `#F1EADC`, mark at 62 % width, no rounded corners (OS mask) |
| `wordmark.svg` | "lilleri", Geist 600, −0.025 em, ink; cropped viewBox |
| `wordmark-alt-newsreader.svg` | Serif alternate (Newsreader 500) for the designer's consideration only |
| `lockup-horizontal.svg` | Mark + wordmark, light |
| `lockup-horizontal-dark.svg` | Mark + wordmark, dark fills |
| `palette.json` | Token set used for the palette sheet |
| `symbol@256.png` | Mark at 256 px on Carta |
| `symbol-mono@256.png` | Mono mark at 256 px on white |
| `app-icon@256.png` | App icon at 256 px |
| `wordmark.png` | Wordmark render on Carta |
| `wordmark-alt-newsreader.png` | Serif alternate render |
| `lockup.png` | Horizontal lockup on Carta |
| `dark-lockup.png` | Horizontal lockup on Notte |
| `icon-sheet.png` | App icon at 256 → 16 px on white, dark, iOS light and iOS dark backgrounds, 1:1 px |
| `shelf.png` | Recognition test, seed 3 (Lilleri at slot 6) |
| `shelf-seed11.png` | Recognition test, seed 11 (Lilleri at slot 27) |
| `palette-sheet.png` | Swatches with contrast ratios and a mock home screen, light and dark |

Process (kept so the iteration can be audited):

| File | What it shows |
|---|---|
| `process-01-first-sketches.png` | Round 1: three-slab stack (tilt / nudge / big gap), two slabs, three pebbles, pebble-on-slab — the hamburger, dot-cluster and avatar readings that eliminated them |
| `process-02-second-sketches.png` | Round 2: tall stack, two slabs with seam, decreasing pyramid, "=", short-on-long, two squares |
| `process-03-proportions.png` | Round 3: the two-tile mark at four proportions; V2 chosen |
| `process-04-wordmark-typefaces.png` | Geist, Manrope, Plus Jakarta Sans, Instrument Sans, Newsreader at 96/24/16/12 px |
| `process-05-shelf-olive-field-rejected.png` | The olive-field icon on the shelf (rejected: less findable) |

## Decisions in this direction

| # | Decision | Type |
|---|---|---|
| A1 | Two tiles, not three; 680 × 290, radius 0.36 h; hinge on the seated end with a guaranteed 72-unit seam; tilt 10° | DECISION |
| A2 | Signature Oliva `#43522D` (deepened from the research's `#4F5D3A` for AAA and 16-px presence); Salvia `#9FB084` on dark; paper field for the app icon | DECISION |
| A3 | Wordmark set in Geist 600 lowercase at this stage; serif alternate documented, not adopted | DECISION (pending custom drawing) |
| A4 | Lockup rule: mark height = `l` ascender height, bottom on baseline, gap 0.55 × height | DECISION |
| A5 | The 10° → 0° settle is proposed as the brand's single motion; the 0° state is a legitimate secondary form | RECOMMENDATION |

## Open questions

| # | Question | How to resolve |
|---|---|---|
| Q1 | Does the still mark read as settling or as slipping? | 10-user still-image test (§14.3) |
| Q2 | Confusion rate at 60 px next to Satispay, Revolut, N26, PayPal, Intesa | Real-icon shelf test (§14.8) |
| Q3 | Does the cream field survive light wallpapers and Android adaptive-icon masks? | Device test on 5 wallpapers, Android 13+ themed icons |
| Q4 | Lili's figurative mark and any registered stacked-bar marks in 9/36/42 | Trademark search with the word-mark clearance |
| Q5 | Custom wordmark vs typeset Geist; serif for marketing display or not | Designer refinement + the 20-user name-recall test already planned in `naming-analysis.md` |
