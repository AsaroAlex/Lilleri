# Logo exploration — Direction C: "il lillero" (one matte object)

**Project:** LILLERI (consumer PFM, Italy-first then Europe).
**Document type:** identity exploration, Direction C of three (A = "si posa" settling sheet, cotto; B = "li" letter-pair, wine; C = this document, olive object).
**Date:** 2026-10-02. **Status:** exploration, not a decision. Everything here is HYPOTHESIS until the Phase 2 user tests in `docs/research/brand-competitor-analysis.md` §9 are run.
**Files:** `packages/brand/explorations/direction-c/` (full list in §15). The geometry was generated with `build.mjs` and `geometry.mjs` in that folder, which import the rendering toolkit from the session scratchpad.

---

## 1. Concept

**Il lillero** — one piece of money, kept. A single matte pebble in olive on warm paper, with one round opening set towards the top. Nothing else: no letter, no coin, no chart, no second colour on the mark.

The object is deliberately between two things people already hold: the *pietra forata* (a pebble with a natural hole, carried in the pocket for luck in Tuscan and wider Mediterranean folk habit) and the *worry stone* (a smooth pebble you rub to calm down). Both are warm, tactile, adult objects, and both are about *keeping* and *calm* rather than *earning*. The brief for this direction asked for "a thing inside a thing: your money, held"; here the thing inside is the opening itself — the place where the stone is held, by a cord or a thumb.

Art-direction reference: Italian still life and ceramics rather than fintech gloss — Morandi's dusty, matte colour; a matte olive glaze on an unglazed clay body; a Bitossi bead rather than a Vespa or a Tuscan hill. "Italian like Olivetti and a well-set table, not like a souvenir shop" (`brand-strategy.md` §11).

## 2. Meaning

| Layer | What the mark says | How it is carried |
|---|---|---|
| The name | *Lillero* is the singular of *lilleri*: one unit of money. The mark is one lillero — the brand's noun made into an object | Onboarding tells it in two sentences ("Lilleri, in Toscana, sono i soldi. Questo è un lillero: uno, tenuto da parte."), then never again |
| Kept, not spent | A stone with a hole is a stone you keep (a charm, a pendant); the opening is where it hangs. "Your money, held" | The opening is the only feature; it is never filled, never decorated |
| Settled | The opening sits high, so the mass sits low: the object rests on its base and cannot roll. "Ogni movimento al suo posto"; *a posto* | Exponent 2.9 on the top half, 3.4 on the bottom (rounder top, flatter base) |
| Calm from clarity | One shape, one colour, one cut — nothing to decode | Rule: the mark is never tinted, outlined, gradiented or given a highlight |
| Motion (idea, not built) | Items drop through the opening and settle in the stone — the one branded motion the research asks for ("things settling into order") | To prototype in Phase 2; the opening gives the motion a literal place to happen |

What the mark deliberately is **not**: a coin (it is not round and has no rim or face), a € sign, a lock or shield (the opening is high and open, not a keyhole), a letter (no "L" or "O" lettermark reading was accepted — see §13 on the "O" risk), a mascot (no face: the opening is centred, not offset sideways, precisely to avoid the one-eye reading that the earlier sketches showed).

## 3. Construction notes

Grid: 1024 × 1024. All numbers below are grid units. Source: `symbol.svg`.

| Element | Specification |
|---|---|
| Outer form | Superellipse centred at (512, 512), half-axes 360 × 340 → 720 wide × 680 high (aspect 1.06:1, slightly wider than tall so it reads as a pebble, not as the iOS icon squircle). Exponent **2.9 for the top half**, **3.4 for the bottom half** (n = 2 would be an ellipse, n = 5 the iOS icon). The top is therefore rounder and the base flatter: the object sits. Drawn as 24 cubic Bézier segments with chord-based (Catmull-Rom) tangents; the file is one `<path>` |
| Opening | A true circle, r = 158 (diameter 316 = 43.9 % of the pebble width), centre at (512, 458), i.e. 54 units above the pebble centre. Perfect circle inside a soft square on purpose: precision inside warmth ("the Sage's clarity with the Caregiver's manners") |
| Walls | Top 128 (= 1/8 of the grid, the thinnest wall), sides 202, diagonals ≈ 200, bottom 236. Ratio top : bottom = 1 : 1.84 — enough for the "settled" reading without the top wall breaking at 16 px |
| Strokes | None. One filled path with `fill-rule="evenodd"`; the opening is a real cut, so the ground always shows through. Minimum feature (the top wall) is 1/8 of the mark, well above the 1/24 rule |
| App icon | Paper field `#F6F1E7`, pebble scaled to 66 % of the field (475 × 449, opening r = 104). Margins ≈ 274 units on the sides, which keeps the object inside Apple's and Android's safe zones; the OS masks the corners. The field is deliberately *not* the signature colour (see §9) |
| Clear space | Half the pebble height (340 units at symbol scale) on all sides. Minimum sizes: app icon 24 px; bare symbol 16 px |
| Wordmark | `lilleri` in **Geist Medium (500)**, lowercase (per `naming-analysis.md` D6), tracking −0.01 em. The two i-dots are replaced by tiny lilleri: the same superellipse (n = 3.3, aspect 1.06), 1.12 × the size of Geist's own dot, in the signature colour. Text-based at this stage (the glyphs are live text; the dots are paths placed from a pixel measurement of the rendered glyphs). Geist was chosen for its tailed `l`, which gives l-i-l-l a rhythm and separates `l` from `i`; Newsreader 500 was the warm alternative, Manrope/Plus Jakarta were rejected for their plain `l` (see `process-06-wordmark-typefaces.png`) |
| Horizontal lockup | Symbol height = 0.84 × the ascender height of the wordmark (≈ 0.60 em), vertically centred on the ascender mid-line; gap = 0.26 em. At 1.0 × ascender the symbol overpowered the Medium-weight letters (iteration 1), so it was reduced |

## 4. Colour

Territory **T1 — Carta, Inchiostro, Oliva** from `docs/research/brand-competitor-analysis.md` §9, chosen because Direction A already explores cotto (T2) and Direction B wine (T3); it also sidesteps the Satispay hue gate entirely. The olive was lightened one step from the research's `#4F5D3A` after the 60-px tests: at icon size `#4F5D3A` read as near-black, `#56673F` still reads as a green glaze while staying text-safe.

| Role | Hex | On white `#FFFFFF` | On paper `#F6F1E7` | On ivory `#FBF8F2` | Notes |
|---|---|---|---|---|---|
| **Signature: oliva** | `#56673F` | **6.16:1** (AA; AAA large) | **5.47:1** (AA; AAA large) | 5.81:1 (AA) | Mark, buttons, links, positive accents. Non-text contrast (WCAG 1.4.11, ≥ 3:1) passes everywhere on light grounds |
| Ivory on oliva (button label) | `#FBF8F2` on `#56673F` | — | — | 5.81:1 (AA) | |
| Paper (ground) | `#F6F1E7` | — | — | — | Hue ≈ 40°, the warm neutral every cold-monochrome competitor lacks |
| Ivory (surface) | `#FBF8F2` | | | | Cards on paper |
| Ink (text) | `#1F1B17` | 17.11:1 (AAA) | 15.20:1 (AAA) | 16.14:1 (AAA) | |
| Ink soft (secondary text) | `#6B635A` | | 5.24:1 (AA) | | |
| **Dark-mode signature: salvia** | `#A7B58B` | on night `#15130F` **8.50:1** (AAA); on `#1F1B17` 7.84:1 (AAA) | | | The olive itself fails on dark grounds (3.01:1 on `#15130F`, 2.78:1 on `#1F1B17`) and must never be used there |
| Night (dark ground) / dark text | `#15130F` / `#F3EDE2` | 15.92:1 (AAA) | | | Warm near-black, not cold |

Semantic colours in `palette.json` are placeholders chosen not to collide with the signature: success `#2E6B5A` (blue-green, hue ≈ 163° against olive's ≈ 86°), warning `#8A5A12`, danger `#8F3B22` (cotto — never used for the brand), info `#2F5C8A`. **Open question:** `typography-options.md` §8 puts positive amounts "in accent" while `brand-competitor-analysis.md` §9 says semantic colours "never collide with the signature"; a deuteranopia simulation of olive vs the success green is required before either rule is adopted. The full matrix is in `palette-sheet.png`; the mock home screen there shows the olive as button and progress fill on paper, and the sage equivalent on night.

## 5. Strengths

- **The only paper-coloured tile on the shelf.** In both recognition tests the icon is the single light, warm, unsaturated square among 29 saturated ones; it is found in under a second without searching for a glyph (§10).
- **An object, not a letter.** Nothing in the competitor set (`brand-competitor-analysis.md` §4) is a quiet abstract object; the category is wordmarks and letters-in-squares.
- **One colour, one path, one cut.** It prints in one ink, embosses, cuts as a sticker, and — fittingly — can literally be made in glazed ceramic; the opening is a real hole, so the mark works on any ground in positive and negative without a second version.
- **Nameable in one phrase** ("the olive stone with the hole"), which is the practical test of memorability.
- **The wordmark and the symbol share a part**: the i-dots are small lilleri, so the name carries the object even where the symbol is absent.
- **International by construction**: no €, no flag, no coin; the Tuscan story is told, not drawn.
- **Scales both ways**: the bare symbol holds at 16 px; at poster size the flat form stays calm.

## 6. Weaknesses

- **It is quiet.** A paper-field icon depends on the OS icon shadow or border: in the icon sheet's white row the tile edge nearly dissolves, and on a home screen with Apple's own light icons (Notes, Reminders, Files) the field is no longer unique — the olive object has to do the work alone.
- **The opening is the only feature.** With the full-field app icon at 16 px the top wall is ≈ 1.3 px and renders as a half-tone; the favicon must use the bare symbol, not the icon.
- **Abstract objects carry no money meaning by themselves.** The link to "lillero" must be told once; without it the mark can be read as a bead, a button, a washer, a toggle — or, in this colour, a **pitted olive**. That last reading is the one to test first (§14).
- **Olive is semantically loaded**: "eco", "military", "positive/green" readings; it must never be the colour of a positive amount if the success colour is also green (§4 open question).
- **The soft-square silhouette is close to the OS icon mask.** The 1.06 aspect, the 2.9/3.4 exponents and the 66 % scale keep it from reading as "a squircle inside a squircle", but a designer will want to push the pebble asymmetry further by hand.
- **Warmth is carried entirely by colour and curvature**; in pure black (the mono version) the mark is cooler and more "technical" than in olive.

## 7. Memorability

Medium-high (HYPOTHESIS). Drivers: a single nameable feature (the hole), an unusual object class for the category, and the repetition of the object in the wordmark's i-dots. Detractors: quietness (it can be overlooked before it is remembered) and the generic "o-with-a-hole" family it belongs to outside fintech (§13). Suggested measure: unaided description after one use ("draw the Lilleri icon"); pass if ≥ 60 % draw a rounded shape with a hole in the upper half.

## 8. Scalability

- **Down:** app icon reads at 64/48/32/24 px; at 16 px it is a pale square with a dark blob and a lighter dot (recognisable, at its limit). Bare symbol reads at 32/24/16 px with the opening intact (top wall 2 px at 16 px). Tested on white, near-black, iOS light and iOS dark grounds (`icon-sheet.png`, `icon-sheet-mono-symbol.png`).
- **Up:** the form has no detail to break at large sizes; at poster and packaging scale the brand will want a *material* rendering (matte ceramic, paper grain) that the flat vector cannot supply — that is a campaign asset decision, not a mark change. In product the mark stays flat.
- **Across media:** single evenodd path; no strokes, gradients, filters, text or external references in the symbol files. Vector size: 2 KB.

## 9. App Store / home-screen recognisability (what the shelf test showed)

`shelf.png` (seed 3, candidate at slot 6 — row 2, column 1) and `shelf-seed11.png` (seed 11, slot 27 — row 5, column 4), each among 29 generated finance-app icons (letters, bar charts, €-coins, cards, rising lines, dot pairs, in the category's blues, greens, purples, pinks, orange, lime, black).

- In both grids the Lilleri tile is located immediately: it is the only paper-toned, unsaturated square, and the only one whose figure is *darker* than its field (every neighbour is a white glyph on a saturated field). The recognition cue is the quietness itself, which is the strategy's intended mechanism ("a warm paper field with a small ink mark" — `brand-strategy.md` §9).
- The olive object at 60 px reads as a dark green pebble with a light hole; it is not confused with the € coins (round, ringed, white on colour) or the dot-pair icons (two solid dots). The nearest visual neighbour on the shelf is the "Track"/"Save" square-ring icon (a frame with a dot), which is why the concentric-ring variants were rejected in sketch 1.
- Weakness observed: at 60 px the olive is close in value to the black icons; the hue is readable but not loud. On a home screen next to *real* light icons the field advantage shrinks and the object must carry recognition (§6). The planned 60-px test against Satispay, Revolut, N26, PayPal and Intesa (`brand-competitor-analysis.md` §9 rule 4) remains necessary.
- A dark-field variant (`app-icon-dark.svg`: sage pebble on night) was rendered for Android themed icons and the iOS dark appearance; the tinted iOS variant can be produced directly from `symbol-mono.svg` because the mark is one colour.

## 10. Legibility at 16 / 24 / 32 px (observed, 1:1 renders)

| Size | App icon (`icon-sheet.png`) | Bare symbol (`icon-sheet-mono-symbol.png`) |
|---|---|---|
| 32 px | Pebble ≈ 21 px, opening ≈ 9 px, top wall ≈ 2.6 px: a clear object with a hole; the flatter base is just perceptible | Full form, opening and settled mass obvious |
| 24 px | Pebble ≈ 16 px, opening ≈ 7 px, top wall ≈ 2 px: still an object with an opening | Clear; this is the recommended minimum for the icon in UI chrome |
| 16 px | Pebble ≈ 10–11 px, opening ≈ 4–5 px, top wall ≈ 1.3 px (half-tone): a dark blob with a pale dot; the silhouette is right, the base flattening is lost | Opening ≈ 5 px, top wall 2 px: reads as the mark. **Use this for favicons**, with the opening showing the page background |

Anti-aliasing softens the paper tile's edge on white at every size below 64 px; on dark grounds the tile reads as a bright square and the object as its only content.

## 11. Dark / light behaviour

- **Light (native mode of the brand):** olive on paper; ivory surfaces; ink text. The icon stays paper in both OS modes — a brand choice (light is the native mode; `brand-strategy.md` §10) — with the night variant offered for themed launchers.
- **Dark:** the signature switches to sage `#A7B58B` on night `#15130F`; the opening shows the night ground. `dark-lockup.png` shows sage symbol + `#F3EDE2` wordmark + sage i-dots: the pair reads as the same brand, lighter in weight. The olive is **not** used on dark grounds (3.01:1 fails text, barely passes non-text), so the two-colour rule is olive-on-light / sage-on-dark, never mixed.
- On a mid-grey or photographic ground, use the mono version in ink or in ivory, never the olive.

## 12. Monochrome behaviour

`symbol-mono.svg` (pure `#000000`) is the same path, so monochrome is not a reduction but the definition: one colour, one evenodd fill, a real cut-out. It works in positive (ink on paper), negative (ivory on ink), as a 1-colour favicon, in print, embossing, laser-cut and ceramic. The wordmark's i-dots become ink in `wordmark-mono.svg`. The only loss in mono is warmth, which the olive otherwise supplies; in black the form reads slightly more "technical" (a soft fitting, a washer) — acceptable for favicons and documents, not for the primary identity.

## 13. Similarity risks

Honest assessment, no competitor logo was copied or reproduced; descriptions come from `docs/research/brand-competitor-analysis.md` §2 and general knowledge (ASSUMPTION where marked).

| Brand | Their identity (as documented) | Risk | Why |
|---|---|---|---|
| Revolut | White "R" with a cut, on near-black | Negligible | Letter on dark field vs object on paper |
| N26 | "N26" wordmark on teal `#088177` | Low | Both green family, but teal 175° saturated vs olive ≈ 86° desaturated; wordmark vs object |
| Klarna | Wordmark with full stop, pink `#FFB3C7` | Negligible | |
| Satispay | Rounded intertwined loop, white on orange `#FF3D00` | Low | Different hue, field logic inverted (dark figure on light field). Still part of the 60-px test because of its reach |
| Wise | Green-on-green wordmark / flag-like mark, forest `#163300`, bright `#9FE870` | **Low–moderate on colour only** | The nearest hue neighbour in the set; Wise's greens are far more saturated and its mark is typographic. The dark-mode sage sits in the same region as Wise's bright green at much lower chroma — keep sage dull |
| Curve | Minimal wordmark, dark icon | Negligible | |
| Monzo | Lowercase wordmark, Hot Coral | Negligible | Shared only the lowercase habit |
| Lydia | "L" in a rounded square, blue | Negligible | |
| Lili | US SMB banking; mark not documented in the research (UNKNOWN) | Name-level risk only (`naming-analysis.md` §10.2) | Visual risk cannot be assessed; check its icon when the clearance search runs |
| Emma | Lowercase "e" icon, purple | Negligible | |
| Monarch | Butterfly / "M" on indigo | Negligible | |
| Copilot | Dark icon with bright glyph (ASSUMPTION) | Negligible | |
| YNAB | Wordmark on blue | Negligible | |

Outside the brief's list, the real look-alike family is generic rather than fintech: ring and bead marks (Oura's ring, Nest's ring — both centred and thin; this mark is thick, eccentric and soft-square), Tile's square-with-corner-hole (small hole at the corner, blue), "O" lettermarks, and the pitted-olive reading introduced by the colour. The eccentric opening, the settled mass and the paper field are the three things that separate it; if any one is removed (centred hole, thin wall, saturated field) the mark falls into that family.

## 14. What a human designer should refine

1. **Draw the outline by hand.** The superellipse is left-right symmetric and mathematically exact; optical corrections (1–2 % overshoot at the widest points, a touch more softness at the lower corners, a check of the join between the 2.9 and 3.4 halves at the equator) will make it feel made rather than computed.
2. **Optically place the opening.** It is at the mathematical position (54 up); with the heavier base it may want to move 2–6 units, and a very slightly squashed circle (aspect 1.02–1.04, wider) may sit better in the soft square. Keep the top wall ≥ 1/8 of the mark.
3. **Test the readings** with 20 Italian users (Tuscany vs Milan vs South): "what is this?" — record "olive/food", "eye", "button/bead", "stone with a hole", "coin". Pass if "coin" ≤ 5 % and "food" ≤ 20 %; if food exceeds that, deepen or grey the olive before changing the form.
4. **Run the 60-px confusion test** against Satispay, Revolut, N26, PayPal, Intesa (and Wise for the colour), plus a deuteranopia/protanopia simulation of olive vs the success green and of sage vs the warning yellow in dark mode.
5. **Outline the wordmark** and tune it: kern the `l`–`l` and `l`–`i` pairs (Geist's tailed `l` opens a gap before `i`), decide the i-dot pebble size (1.12 × now; try 1.05–1.20), and consider a bespoke tail that echoes the pebble's flat base.
6. **Decide the icon field for white contexts**: paper `#F6F1E7` as is, or ivory with a 1-unit darker rim, so the tile keeps an edge in the App Store on white and on Android launchers without a border. Produce the iOS 18 light / dark / tinted set from `app-icon.svg`, `app-icon-dark.svg` and `symbol-mono.svg`.
7. **Prototype the motion**: a transaction row settles through the opening into the stone (the "things settling into order" motion); the empty Review Inbox ends on the still mark.
8. **Counsel**: file the figurative mark alongside the word mark (classes 9, 42, then 36); a simple geometric device will be examined for distinctiveness, and the eccentric opening plus the paper/olive combination is what makes it distinctive — document that.
9. **Material study** (campaign, not product): one photograph of the object in matte glazed ceramic on paper would set the tone for the whole identity faster than any illustration system.

## 15. Iteration record and file list

**How it was iterated (what changed because of what was seen):**

| Round | Sheet | What I saw | What changed |
|---|---|---|---|
| 1 | `process-01-first-sketches.png` | Concentric ring = washer/lens; nested ring + stone = camera dial; chamfer = tag/ticket; corner notch = a defect; squircle hole inside squircle = a frame. Also a geometry bug (Bézier handles exploding at the axis points) | Dropped facet, notch, nested and concentric; rebuilt the curve with chord-based tangents |
| 2 | `process-02-dimple-placement.png` | A small round dimple up-left reads as an eye, and in olive at 60 px as a green olive with a pimento; the tilted pebble is charming but "hand-placed" drifts toward craft/souvenir | Enlarged the opening (≥ 0.46 of width) so it reads as a hole, not an eye |
| 3 | `process-03-opening-size.png` | Eccentric up-left still faintly eye-like; soft-squircle hole = frame; squarer outline = generic tile; hole pushed left = "looking"; very thin top wall breaks at 16 px | Narrowed to: hole up-centre (symmetric, calm, mass settled) with the top wall ≥ 1/8 |
| 4 | `process-04-final-candidates.png` | Slight horizontal offsets look like errors; a larger, lower hole becomes a washer/"O"; a taller pebble drifts toward a padlock body | Fixed r = 158 at 54 above centre, pebble wider than tall |
| 5 | `process-05-softness-olive-scale.png` + first full renders | Lockup symbol at full ascender height overpowered Geist 500; the pebble at 62 % of the icon felt small at 60 px; n = 3.3 leaned "tile"; `#4F5D3A` read near-black at 60 px | Symbol 0.84 × ascender, gap 0.26 em; icon scale 66 %; exponents 2.9/3.4; olive `#56673F` |

**Files** (relative to `packages/brand/explorations/direction-c/`):

| File | What |
|---|---|
| `symbol.svg` | The mark, olive `#56673F`, viewBox 0 0 1024 1024, transparent |
| `symbol-mono.svg` | Same path, `#000000` |
| `symbol-dark.svg` | Same path, sage `#A7B58B` for dark grounds |
| `app-icon.svg` | Paper field + mark at 66 %, 1024 viewBox, square (OS masks corners) |
| `app-icon-dark.svg` | Night field + sage mark (themed / dark-appearance variant) |
| `wordmark.svg` / `wordmark-dark.svg` / `wordmark-mono.svg` | Geist 500 lowercase, pebble i-dots (olive / sage / black) |
| `lockup-horizontal.svg` / `lockup-horizontal-dark.svg` | Symbol + wordmark, light / dark |
| `palette.json` | Light and dark token sets used for the contrast matrix and the mock screens |
| `build.mjs`, `geometry.mjs` | Generators (import the scratchpad toolkit; reproducible from the numbers in §3) |
| `symbol@256.png` | Mark on paper at 256 px |
| `symbol-mono@256.png`, `symbol-dark@256.png`, `app-icon@256.png` | Mono on white, sage on night, app icon at 256 px |
| `wordmark.png` | Wordmark on paper |
| `lockup.png` | Horizontal lockup on paper |
| `dark-lockup.png` | Horizontal lockup on night |
| `icon-sheet.png` | App icon at 256→16 px on white, near-black, iOS light, iOS dark (1:1) |
| `icon-sheet-dark-variant.png` | Night-variant icon, same sheet |
| `icon-sheet-mono-symbol.png` | Bare mono symbol, same sheet (favicon test) |
| `shelf.png` | Recognition test, seed 3 (candidate at slot 6) |
| `shelf-seed11.png` | Recognition test, seed 11 (candidate at slot 27) |
| `palette-sheet.png` | Swatches with contrast vs background, plus mock home screens in light and dark |
| `process-01-first-sketches.png` … `process-05-softness-olive-scale.png` | The five iteration sheets described above |
| `process-06-wordmark-typefaces.png` | Geist 400/500/600, Manrope, Plus Jakarta, Instrument Sans, Newsreader 500/600, Inter — "lilleri" at 96/32/16 px |

## Decisions / Recommendations

| # | Item | Type |
|---|---|---|
| C1 | Direction C proposes "il lillero": one olive pebble with one high opening on a paper field; geometry as in §3 | RECOMMENDATION (exploration) |
| C2 | Signature colour oliva `#56673F` on paper `#F6F1E7`, sage `#A7B58B` on night `#15130F`; olive never on dark grounds | RECOMMENDATION |
| C3 | Favicons use the bare symbol, never the full-field icon | RECOMMENDATION |
| C4 | Wordmark in Geist 500 lowercase with pebble i-dots; outline and kern before any public use | RECOMMENDATION |
| C5 | Gates before selection: the "what is this?" reading test (coin ≤ 5 %, food ≤ 20 %), the 60-px confusion test, the colour-blind simulation of olive vs success green | OPEN QUESTION |
