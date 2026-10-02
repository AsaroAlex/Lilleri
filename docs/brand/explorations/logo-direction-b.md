# Logo exploration — Direction B: "The double l" → the *li* monogram

**Project:** LILLERI (consumer PFM, Italy-first then Europe).
**Document type:** identity exploration, one of several parallel directions. Not a decision.
**Date:** 2026-10-02 (second run of this direction; the first run's "ll" mark is kept as iteration 00 and explained in §14).
**Files:** `packages/brand/explorations/direction-b/` (SVG sources, PNG renders, `build.mjs` that regenerates every SVG; full list in §15).
**Inputs honoured:** `brand-strategy.md` (§8 lowercase wordmark, §10 anti-patterns, §11 "no € in the mark", §12 one signature colour), `naming-analysis.md` (D6 lowercase, distinct `l`; §4 the double-l/single-r spelling risk), `docs/research/brand-competitor-analysis.md` (§3 palette census, §4 shape landscape, §7 clichés, §9 territory T3), `typography-options.md` §7 (Geist Sans).

**Labels.** FACT = measured here (a contrast ratio, a pixel render, a coordinate). HYPOTHESIS = anything about how people will read the mark; none of it is user-tested. DECISION = a choice made inside this direction only.

---

## 1. Concept

Lilleri is seven letters, five of them stems: **l·i·l·l·e·r·i**. The word is made of two kinds of stem — the stem with a foot (`l`, three times) and the stem with a dot (`i`, twice). Direction B builds the whole identity from that one observation.

- **The symbol is `li`:** one `l` and one `i`, side by side. The `l` is tall, flat-topped and ends in a single round terminal — a foot that curls right and stops. The `i` is shorter and carries a round dot, larger than the stem, at the height of the `l`'s top. Nothing else: no frame, no field inside the symbol, no ligature.
- **The wordmark is `lilleri`**, lowercase, set from Geist Sans 600 outlines with the three `l`s redrawn to the symbol's foot and the two `i` dots replaced by the symbol's round dot. The "double l" the brief asks for lives in the wordmark, where it is the word's visual spine; the symbol takes one of each stem so that a 16 px favicon still has a *focal point*.
- **One stroke logic everywhere:** stem, foot with a round terminal, round dot. The symbol's `l` is the wordmark's `l` (same stem-to-height ratio, same foot construction); the symbol's dot is the wordmark's dot. A reader who has seen the icon recognises the word, and the other way round.

**Why `li` and not `ll` (the previous run).** The pure double-l was built first — in the previous run and again here in rounds 1–2 (`iterations/00-previous-run/`, `01-eight-constructions.png`, `02-ll-vs-li-refinement.png`). What the renders showed: two equal stems with feet have no focal point, read as a pause glyph or "11" at 16 px, and make the horizontal lockup stutter ("ll lilleri"). The previous run's larger hooked feet also read as boots. Adding the `i` gives the mark a second rhythm (tall–short), a round focal point that survives at 2–3 px, and a quieter lockup. It also gives the dot a product life (§2).

**Why lowercase.** DECISION already taken (`brand-strategy.md` §8, `naming-analysis.md` D6) and confirmed by the render: in capitals the pair becomes "LI" — lithium, or the first half of a bank name — and the dot disappears. Lowercase keeps the warmth and the dot.

## 2. Meaning

| Reading | What it carries | Status |
|---|---|---|
| **`l` — the stem that settles** | Tall, upright, and the only curve in the mark is where it meets the ground: the foot. *Sistemare* — the tidy-up — happens quietly at the baseline. This is the brand's half of the promise: "Lilleri sistema" | HYPOTHESIS (intended reading) |
| **`i` — the stem that asks** | Shorter, with a dot: the one thing that needs you. "Ti chiede solo quando ha un dubbio." The dot is the Review Inbox badge, the bullet in a list, the separator in the two-beat tagline (*Tu spendi · Lilleri sistema*). The brand's signature dot comes from its own name | HYPOTHESIS; cheap to prototype in the app |
| **The first beat of the name** | `li` is the stressed syllable — LÌL-le-ri (`naming-analysis.md` §3). The symbol is how the name starts and how it sounds | FACT (stress) / HYPOTHESIS (recall effect) |
| **Two heights, one baseline** | Tall and short share one baseline: things of different sizes, correctly aligned. Quietly architectural — a post and a bollard, a column and its lantern — without being a picture of anything | HYPOTHESIS |
| **The dot sits above the short stem, level with the tall one** | The negative space between the dot and the `i` is the only open "channel" in the mark: the one line still open in the inbox | HYPOTHESIS; a brand-book metaphor, not something users must decode |

What it must **not** mean, and how that is handled: not "Li" the chemical symbol (lowercase, dot larger than a text dot, warm colour, paper field); not a bar chart (one foot, one dot — nothing repeats); not two cypresses (the dot and the foot); not a smiling face (the dot is single and offset, the foot is not a mouth).

## 3. Construction notes

All geometry is in `symbol.svg` (viewBox 0 0 1024 1024). The mark sits on an **8-unit grid (128 cells)**; every coordinate in the three paths is an integer on that grid, so the file has no rounding noise. `build.mjs` regenerates every SVG from these constants.

| Element | Value (1024 box) | Cells | Ratio to stem *S* |
|---|---|---|---|
| Stem width *S* | 144 | 18 | 1 |
| `l` height (top 128 → baseline 896) | 768 | 96 | 5.33 S |
| `i` height (top 432 → baseline 896) | 464 | 58 | 3.22 S = 0.60 × `l` height |
| Gap between stems *G* | 176 | 22 | 1.22 S |
| Foot thickness *T* | 136 | 17 | 0.94 S (horizontals read heavier than verticals; the foot is 6 % thinner) |
| Foot inner radius | 40 | 5 | 0.28 S |
| Foot outer radius | 176 | 22 | inner + T, tangent to the stem and the baseline |
| Flat run before the terminal | 24 | 3 | 0.17 S |
| Terminal | semicircle, r = 68 | 8.5 | T / 2 — the single rounded terminal |
| Foot reach beyond the stem's right edge | 132 | 16.5 | 0.92 S |
| Clearance, foot terminal → `i` stem | 44 | 5.5 | 0.69 px at 16 px (allowed to close), 2.6 px at 60 px |
| Dot | circle, r = 88 (Ø 176) | 11 | Ø = 1.22 S; top edge level with the `l` top |
| Dot → `i` stem gap | 128 | 16 | 0.89 S |
| Stem top corners | r = 16 | 2 | 0.11 S — softens the flat top without turning the stem into a pill |
| Mark bounding box | 280–744 × 128–896 | 58 × 96 | 45 % × 75 % of the box, centred on x = 512 |

Stem tops are flat with a 16-unit corner: round pill tops (sketch V6) read as cute, hard corners read as cold; the small radius is the compromise and leaves the foot's terminal as the **only** fully round end. The `i` stands flat on the baseline (no foot, no rounding) so the two stems are clearly different objects.

**Wordmark (`wordmark.svg`, 1000 UPM).** `e`, `r` and the `i` stem are Geist Sans 600 outlines extracted with fontTools from the variable font at wght 600 (OFL 1.1; re-using outlines in a logo is permitted, the font is not redistributed under its reserved name). Geist's stem is 128 and its `l` is 710 tall (5.55 S against the symbol's 5.33 S). The `l` is redrawn with the symbol's construction scaled to the text stem: foot thickness 120 (0.94 S), inner radius 36 (0.28 S), run 16 (0.12 S — shorter than the symbol's 0.17 S, an optical compensation for text), terminal r 60, top-corner r 14; its foot reaches 112 beyond the stem where Geist's tapered foot reaches 74, and its advance is 344 against Geist's 297. The `i` dot is a circle of r 67 (Ø 134 = 1.05 S — smaller than the symbol's 1.22 S so it does not overpower the x-height) centred 663 above the baseline, so its top overshoots the `l` by 20 units. Kerning: Geist's own pairs for e→r (−10) and r→i (−26); custom pairs after the wider `l`: l→i −34, l→l −34, l→e −36, i→l −7. The viewBox is tight to the outlines with an 80-unit margin.

**Lockups.** `lockup-horizontal.svg`: symbol stem height = 1.16 × the wordmark's `l` height, baselines aligned, gap 0.6 × `l` height (0.75 was tried first and left the symbol stranded), symbol in Amaranto, wordmark in Inchiostro. `lockup-stacked.svg`: symbol at 1.9 × `l` height centred above the wordmark, gap 0.6 × `l` height. `wordmark-signature.svg`: the wordmark alone with its two dots in Amaranto — no symbol needed, the dots *are* the signature; recommended for the in-app header and e-mail footers.

**App icon (`app-icon.svg`).** Square, no corner radius (the OS masks it). Field **Carta d'icona `#EFE7D8`** — one step deeper than the UI paper so the square keeps a silhouette on light wallpapers — with the mark scaled to 0.827 (mark height 635 = 62 % of the field) and centred. `app-icon-inverse.svg` (Amaranto field, Carta mark) is the alternative for Android themed icons and for very light wallpapers; it is deliberately *not* the primary because it is the "letter on a flat colour field" pattern the research tells us to avoid (`brand-competitor-analysis.md` §4, §7).

## 4. Colour

One signature colour plus the warm paper/ink neutral system (DECISION D2 of the competitor analysis). The signature is **T3 — Amaranto** from the three shortlisted territories: a deep wine at hue 339°, saturation 56 %, lightness 28 % (FACT, computed). It was chosen here because (a) Direction A already explores T1 olive, so the two directions give the review a real colour comparison; (b) a bookish, inky wine suits a *typographic* mark — it reads as printer's ink and bookplate, not as "money green" or "trust blue"; (c) it is the most premium of the three territories and has no Satispay-hue collision to clear (T2's gate).

| Role | Name | Hex | Where |
|---|---|---|---|
| Signature | **Amaranto** | `#6E1F3B` | symbol, dots in the signature wordmark, primary button |
| Signature on dark | **Rosa antico** | `#D6A4AF` | symbol and buttons on Notte surfaces |
| Neutral ink | **Inchiostro** | `#1F1B17` | wordmark, text, light-mode UI |
| Paper | **Carta** | `#F6F1E7` | light background |
| Icon paper | **Carta d'icona** | `#EFE7D8` | app-icon field, deep surfaces |
| Night | **Notte** | `#1E2030` | dark background (the slightly cooler night ink that T3 proposes) |
| Night surface | **Notte chiara** | `#2B2F4A` | dark cards |

WCAG 2.x contrast (FACT, `contrast.mjs`, 2026-10-02):

| Pair | Ratio | Level |
|---|---|---|
| Amaranto on white `#FFFFFF` | **10.93 : 1** | AAA |
| Amaranto on Carta `#F6F1E7` | **9.71 : 1** | AAA |
| Amaranto on Carta d'icona `#EFE7D8` | 8.89 : 1 | AAA |
| Amaranto on iOS light home `#F2F2F7` | 9.79 : 1 | AAA |
| Carta on Amaranto (reversed button, inverse icon) | 9.71 : 1 | AAA |
| Inchiostro on Carta / on white | 15.20 : 1 / 17.11 : 1 | AAA |
| Rosa antico on Notte `#1E2030` | **7.50 : 1** | AAA |
| Rosa antico on Notte chiara | 6.09 : 1 | AA |
| **Amaranto on Notte** | **1.47 : 1** | **fail** → the wine symbol is never placed on dark surfaces; `symbol-dark.svg` exists for that |
| **Rosa antico on Carta** | **1.91 : 1** | **fail** → the rose symbol is never placed on paper |
| Carta d'icona vs iOS light home | 1.10 : 1 | not a text pair; the icon's silhouette on a flat light wallpaper relies on warmth, not contrast (§6) |

Because the signature is red-adjacent, the semantic colours were chosen so nothing negative is ever wine (rule 3 of `brand-competitor-analysis.md` §9): danger is a burnt orange `#A94A1E` (hue 19°, 5.06 : 1 on Carta), warning an ochre `#6F5A14` (5.92 : 1), success a teal green `#1F6B5E` (5.61 : 1); negative amounts are printed in ink with the sign. The full token set and the mock home screen are in `palette.json` / `palette.png`; the matrix is `contrast-report.txt` (every text role ≥ AA on every surface in both themes; `border` and `accentSoft` are non-text and fail by design).

## 5. Strengths

1. **Honest derivation, no metaphor to learn.** The symbol is the first beat of the name in the name's own letters; the wordmark is the same hand. Nothing has to be explained, and nothing is a coin, a chart or a shield.
2. **A focal point that survives 16 px.** The round dot is a 2–3 px blob at favicon size and still says "i"; the tall/short rhythm says "l·i". The previous run's "ll" had neither (§9, `icon-sheet.png` vs `iterations/00-previous-run/icon-sheet.png`).
3. **The signature dot has a product life.** Inbox badge, list bullet, tagline separator, the "·" between date and category in every transaction row: the identity's smallest element is already in the UI, which is how a calm brand gets remembered — by repetition, not by volume.
4. **Stands out on a home screen for the right reason.** In both shelf seeds the Lilleri square is the only warm paper icon among 29 saturated ones (§8). It differentiates by restraint, which is the brand's position, and the deep wine reads "ink" rather than "alert".
5. **Calm, warm, not cute.** Flat tops with a small corner, one round terminal, one dot: it is typographic rather than illustrated. Nothing in it is a mascot, a gradient or a neon.
6. **Monochrome- and dark-proof.** Three solid paths, one colour; the Rosa antico variant clears AAA on Notte.
7. **One motion for free.** The dot is the natural anchor for the brand's single branded motion ("things settling into order"): the `l` lands first, the `i` second, the dot last — and the same dot becomes the inbox count.

## 6. Weaknesses (and what was done about them)

1. **It is a lettermark, and lettermarks are the category's most common pattern** (Revolut R, Venmo V, Lydia L, Emma e; `brand-competitor-analysis.md` §4). The research's D4 asks for a *non-letter* symbol. This direction argues the exception — two lowercase letters with their own stroke logic, on paper rather than a saturated field — but a judging panel may rightly prefer an abstract direction. Honest rating: originality 3/5.
2. **`li` is the beginning of "Lili"** (US small-business bank, `naming-analysis.md` §10.2) and of "Lilleri" itself. The design borrows nothing from Lili (whose letterforms could not be fetched), but figurative-mark clearance must cover LILI/LILLI in classes 9/36/42 and a side-by-side with Lili's wordmark is mandatory before adoption. Rated medium in §12.
3. **The brief's title is "the double l"; the symbol is `l` + `i`.** The double l is carried by the wordmark, not the icon. If the review wants the pair literally in the symbol, the "ll" from rounds 1–2 (V1b) is the fallback — with the documented cost at 16 px and in the lockup.
4. **The icon field is nearly invisible on a flat light wallpaper** (1.10 : 1 vs iOS light home). Real wallpapers are rarely flat `#F2F2F7`, and the wine mark alone still reads, but this must be checked on devices; `app-icon-inverse.svg` is the fallback and, honestly, performs *better* at 16 px on light backgrounds (`icon-sheet-inverse.png`).
5. **Wine is red-adjacent.** Mitigated by the semantic palette (§4) and by never using the signature for amounts, but a "loss" reading of the icon cannot be excluded until tested. The dark-mode Rosa antico sits at hue 347°, near Klarna's pink (344°); the difference is saturation (38 % vs 100 %) and context. It was muted once already (from `#E0A3B6`); it must never be brightened.
6. **Geist provenance.** `e`, `r` and the `i` stem are Geist 600 glyphs; the wordmark is ownable through the three `l`s and the two dots (5 of 7 letters carry custom detail), but a designer should decide whether to redraw `e` and `r` or accept a typographic wordmark.
7. **Residual mis-readings:** "Li" (lithium), a lowercase two-letter monogram in the LinkedIn "in" genre, a face. Flat tops, the oversized dot and the paper field reduce them; none goes to zero. Test with the icon-confusion study (`brand-strategy.md` §13).
8. **The foot's outer arc is a plain circle.** Fine at icon sizes; above 256 px it looks a touch heavy-bottomed and needs an optical curve (§13).

## 7. Memorability — 3.5 / 5

Reproducible from memory with a pen ("an l with a hook and an i with a big dot"), tied to the first sound of the name, and reinforced every time the dot appears in the product. Against that: lettermarks are forgettable as a genre, and `li` on its own carries no story — the story has to come from the Tuscan name and the paper/wine world around it. Recall will depend on consistency (paper field, Amaranto, the dot everywhere) more than on the shape. HYPOTHESIS; measure with the 7-day recall test already planned in `brand-strategy.md` §13.

## 8. App Store / home-screen recognisability — 4 / 5 (synthetic test only)

What the shelf test showed (`shelf.png`, seed 3, slot 6 = row 2, column 1; `shelf-seed11.png`, seed 11, slot 27 = row 5, column 4):

- The Lilleri square was the **only warm, light icon** among 29 generic finance icons in both seeds. Seed 11 is the harder one: it contains two pastel-pink icons ("Money", "Fund") and two lime ones in the same rows; the paper square still separates because it is desaturated and warm while they are cold or loud, and the wine `li` is the only dark-on-light glyph on the screen.
- The glyph is readable at 60 px in both: the `l` foot reads as a foot, the dot as a dot; the icon's label "Lilleri" and the glyph reinforce each other (the icon spells the start of the word).
- Caveat: the shelf contains no real competitors. On an Italian phone the neighbours are Satispay (vivid orange), Revolut (black), PayPal (blue), N26 (teal), Intesa (dark green): all saturated or dark, so a paper field keeps its advantage; but this is HYPOTHESIS until the 20-user icon-confusion test (`brand-competitor-analysis.md` Q6) is run. The tests that matter most for this direction: wine-on-paper next to UniCredit's red at 60 px, and the paper square on a white wallpaper.

## 9. Legibility at 16 / 24 / 32 px

From `icon-sheet.png` (app icon, field included) and `favicon-sheet.png` (bare symbol), rendered 1 : 1:

| Size | What is visible | Verdict |
|---|---|---|
| **32 px** | Tall stem with its foot and terminal, short stem, round dot, the gap between dot and stem; clearly "li" | Good |
| **24 px** | Both stems, the foot as a hook, the dot as a 3 px circle; still "li" | Good |
| **16 px** | Two 2 px stems of different heights, the foot as a 1 px nub, the dot as a 2–3 px blob; the clearance between foot and `i` closes. Reads as "li" with the field, as "li"/"lı·" bare on white | Acceptable as a favicon on light tabs; on dark browser chrome the bare wine symbol disappears (1.47 : 1) — use the paper-field icon or the Rosa antico symbol |

No stroke is below 1/24 of the icon (thinnest stroke is the foot, 136/1024 = 1/7.5; the 44-unit clearance is allowed to close). Recommendation: the favicon set uses the **paper-field icon** (survives light and dark tabs) and a pixel-snapped master for 16 and 32 px (§13).

## 10. Dark / light behaviour

- **Light (Carta):** Amaranto symbol, Inchiostro wordmark — `lockup.png`, `wordmark.png`, `lockup-stacked.png`. In `wordmark-signature.png` the two wine dots read as a highlight, which is the intended hierarchy: ink carries the word, wine carries the signature.
- **Dark (Notte):** Rosa antico symbol, Carta wordmark — `dark-lockup.png`, `lockup-stacked-dark.png`, `symbol-dark@256.png`. The rose at 7.5 : 1 keeps the mark soft rather than neon; the cooler Notte keeps the warm paper text from looking yellow.
- **Rule:** the wine symbol is never placed on Notte/Inchiostro (1.47 : 1); the rose symbol is never placed on Carta (1.91 : 1). Light mode is the brand's native mode (`brand-strategy.md` §10, "crypto-bro" row), and the app icon stays paper in both modes.

## 11. Monochrome behaviour

`symbol-mono.svg` (pure `#000`) is identical geometry; the mark is a silhouette with no inner detail or overlap, so it survives single-colour print, embossing, engraving and one-colour stamps unchanged (`symbol-mono@256.png`). Reversed (paper on ink or on wine) it also works — `app-icon-inverse.svg` is that test. The wordmark is one colour by default; the two-tone signature version is optional. No version depends on colour to be understood.

## 12. Similarity risks (described, never copied)

| Brand | Their mark (from the research tables, not reproduced) | Risk | Why |
|---|---|---|---|
| **Revolut** | Bold capital "R" with a diagonal cut, white on near-black | Low | Different letters, case and field; only the "letter as icon" genre is shared |
| **N26** | "N26" wordmark on teal; no symbol | Low | No digits, no teal; the tall/short pair does not read as "26" |
| **Klarna** | Wordmark with a full stop; Klarna pink `#FFB3C7` | Low–medium (colour, dark mode only) | The dark-mode Rosa antico shares Klarna's hue band (347° vs 344°) at a third of the saturation; light mode shares nothing. Keep the rose muted |
| **Satispay** | Two intertwined looping strokes on vivid orange `#FF3D00`; lowercase wordmark | Low | Different hue (339° vs 14°), different construction (ours is upright and separate, theirs loops and interlocks) |
| **Wise** | Merged-letterform wordmark; bright green on forest green | Very low | Nothing shared |
| **Curve** | Minimal wordmark, dark with a blue accent | Very low | Nothing shared |
| **Monzo** | Lowercase wordmark; hot coral | Low | Lowercase wordmarks are the European default; shape and colour differ |
| **Lydia** | Capital "L", white on bright blue `#0180FF` | Low–medium | The closest *idea*: an L-shape as the icon. Ours is lowercase, paired with an `i`, warm on paper; a hostile reading is "a lowercase Lydia with a dot". Include in the test |
| **Lili (US)** | Lowercase "lili" wordmark (ASSUMPTION on its exact form; not fetched) | **Medium, driven by the name** | Our symbol *is* the first two letters of their name. The design borrows nothing specific, but clearance must cover LILI/LILLI in 9/36/42 (`naming-analysis.md` R4) and a visual side-by-side is mandatory |
| **Emma** | Lowercase "e" on purple/lilac | Very low | Different letter and palette |
| **Monarch** | "M"/butterfly on indigo | Very low | Nothing shared |
| **Copilot** | Bright glyph on a dark icon | Very low | Opposite value structure |
| **YNAB** | "YNAB" wordmark on blue | Very low | Nothing shared |
| **Generic / outside the list** | Two-letter lowercase monograms (the LinkedIn "in" genre); "Li" lithium; double-l fashion monograms; UniCredit red `#DB0011` for the wine | Low–medium | Genre, not design, similarity; the wine is 16° and half the saturation away from UniCredit's red, but both are "reds" at a glance — part of the 60 px test |

Net: no competitor is copied or closely approached; the two items to carry into clearance and user testing are **Lili (name + `li`)** and **Lydia (L-as-icon idea)**, plus the colour check against UniCredit red and Klarna pink.

## 13. What a human designer should refine

1. **Optical curves.** Replace the circular outer arc of the foot with a compensated curve so the foot is not heavy-bottomed above 256 px; check whether the 6 % thinner foot needs more at small sizes.
2. **Pixel masters.** Cut dedicated 16 px and 32 px versions (stems on whole pixels, dot snapped to 3 px, foot shortened by one unit) and a 1-bit favicon; decide the favicon = paper-field icon.
3. **Wordmark ownership.** Redraw `e` and `r` in the same spirit or accept the typographic wordmark; re-kern the l-pairs on a printed proof; decide whether the symbol's dot (1.22 S) and the wordmark's (1.05 S) should converge.
4. **Lockup policy.** Stacked as primary; `wordmark-signature` for the in-app header; horizontal only for co-branding strips. Define clear space in units of the stem width *S* (proposal: 1 S around the mark, measured from the dot and the terminal).
5. **Icon field on real wallpapers.** Test Carta d'icona on iOS light/dark and Android Material You; decide between the paper icon, a 2-unit Amaranto keyline and the inverse icon for light wallpapers and for the Android monochrome layer.
6. **Colour system.** Deuteranopia/protanopia simulation (wine vs the burnt-orange danger); confirm Amaranto vs UniCredit red and Rosa antico vs Klarna pink at 60 px with the 20-user test; define the tinted surface for the inbox banner (`accentSoft`) so it never reads as an error state.
7. **The dot as a system.** Prototype the dot as inbox badge, list bullet and tagline separator; set its size relative to text (proposal: 0.5 em) so the product and the mark agree.
8. **Motion.** Prototype the one branded motion: `l` lands, `i` lands, dot settles last; the dot's landing is the "niente da fare" moment.
9. **Clearance.** Figurative-mark search for `li`/`ll` monograms and for LILI/LYDIA marks in 9/36/42 before any public use (gating item in `naming-analysis.md` D4).

## 14. Iteration log (what was seen, what changed)

| Round | What was rendered | What I saw | Change |
|---|---|---|---|
| 00 — previous run (`iterations/00-previous-run/*.png`) | "ll": two equal stems, large hooked feet, olive on paper | Feet read as boots/J-hooks; first foot closes onto the second stem and the pair reads "u" at 16–24 px; no focal point; "ll lilleri" stutters | Rebuilt from sketches; colour moved to T3 so the two directions compare |
| 01 (`iterations/01-eight-constructions.png`) | Eight constructions at 256/64/32/16 px: tight-foot ll, feet outward, feet inward, li + dot, stepped ll, round-top ll, plain stem + l, flat-cut control | Feet outward/inward read "JL"/"LJ" — dead. Stepped ll reads as a sizing error. Round tops read cute. Flat-cut feet are colder with no gain. Two survivors: tight ll (V1) and li + dot (V4) — V4 the only one with a focal point at 16 px | Carry V1 and V4 into refinement |
| 02 (`iterations/02-ll-vs-li-refinement.png`) | V1b ll with soft tops; V1c long exit foot; V4b/c/d li with dot at 1.25 / 1.0 / 1.4 S; V4e lighter weight; each with a 60 px dark-shelf cell and a Geist lockup | Long exit adds a "u" base. Dot at 1.0 S loses the signature; 1.4 S tips into cute; 1.25 S right. Lighter weight is more premium at 256 but thinner at 16. "li lilleri" stutters less than "ll lilleri" | Final: li, S 144, dot Ø 1.22 S, 8-unit grid, 16-unit top corners |
| 03 (first full deliverable set) | Symbol, wordmark from Geist outlines with redrawn `l` and round dots, lockups, icon sheets, favicon sheet, two shelf seeds, palette sheet | Reads at every size; paper icon unique on both shelves; bare wine symbol invisible on dark tabs (1.47 : 1); lockup gap (0.75 × l height) too wide; dark-mode rose `#E0A3B6` drifts toward BNPL pink; warning and danger too close in hue | Gap → 0.6; symbol foot run 32 → 24 (closer to the wordmark's proportion); rose → `#D6A4AF` (7.50 : 1 AAA); warning `#6F5A14`, danger `#A94A1E` |
| 04 (final renders in the folder) | Everything re-rendered | Lockup balanced; rose reads warm, not pink; 16 px unchanged (good) | — |

## 15. Files

All under `packages/brand/explorations/direction-b/`:

| File | What |
|---|---|
| `symbol.svg` | Symbol, 1024 viewBox, transparent, Amaranto |
| `symbol-mono.svg` | Symbol in `#000000` |
| `symbol-dark.svg` | Symbol in Rosa antico for dark backgrounds |
| `app-icon.svg` | iOS-style icon, Carta d'icona field, no corner radius |
| `app-icon-inverse.svg` | Alternative inverse icon (Amaranto field, Carta mark) |
| `wordmark.svg` / `wordmark-dark.svg` | Wordmark in Inchiostro / in Carta |
| `wordmark-signature.svg` | Wordmark with the two dots in Amaranto |
| `lockup-horizontal.svg` / `lockup-horizontal-dark.svg` | Horizontal lockup, light / dark |
| `lockup-stacked.svg` / `lockup-stacked-dark.svg` | Stacked lockup, light / dark |
| `palette.json` | Light/dark token set used for the palette sheet |
| `build.mjs` | Generator for every SVG above (constants in §3); expects the shared brand toolkit at `../brandtools/lib.mjs` and `geist.json` beside it |
| `geist.json`, `extract-geist.py` | Geist Sans 600/500 outlines, advances and kern pairs for `l i e r` (1000 UPM) and the fontTools script that produced them |
| `symbol@256.png` | Symbol render, 256 px on Carta |
| `symbol-mono@256.png`, `symbol-dark@256.png` | Mono on white; Rosa antico on Notte |
| `wordmark.png`, `wordmark-signature.png` | Wordmark renders on Carta |
| `lockup.png`, `dark-lockup.png` | Horizontal lockup, light / dark |
| `lockup-stacked.png`, `lockup-stacked-dark.png` | Stacked lockup, light / dark |
| `icon-sheet.png` | App icon at 256→16 px on four backgrounds, 1 : 1 |
| `icon-sheet-inverse.png` | Inverse icon sheet |
| `favicon-sheet.png` | Bare symbol at 256→16 px (favicon case; shows the dark-tab failure) |
| `shelf.png` (seed 3), `shelf-seed11.png` (seed 11) | Recognition test among 29 generic finance icons |
| `palette.png`, `contrast-report.txt` | Palette swatches with mock home screen; WCAG matrix |
| `iterations/00-previous-run/{icon-sheet,lockup,wordmark}.png` | The first run's "ll" mark, kept for the record |
| `iterations/01-eight-constructions.png`, `iterations/02-ll-vs-li-refinement.png` | Rounds 01–02 as described in §14 |
| `iterations/lshape-sketch-helper.mjs` | The parametric `l` builder used for the sketch sheets |

Rendering was done with the shared toolkit (`render.mjs`, `icon-sheet.mjs`, `shelf.mjs`, `palette-sheet.mjs`, `contrast.mjs`); every SVG uses only `<path>`/`<rect>`/`<g>` with plain attributes — no filters, CSS classes, text elements or external references.

---

## Decisions / Recommendations (within this direction)

| # | Item | Type |
|---|---|---|
| B1 | Symbol = `li`: one `l` with a single round foot terminal, one shorter `i` with an oversized round dot; flat tops with a small corner; no ligature, no frame | DECISION (design, this direction) |
| B2 | Wordmark lowercase, Geist Sans 600 outlines with the three `l`s redrawn to the symbol's foot and the two dots round | DECISION (design) |
| B3 | Signature colour Amaranto `#6E1F3B` on the Carta/Inchiostro system; Rosa antico `#D6A4AF` on Notte; wine never on dark, rose never on paper; nothing negative is ever wine | DECISION (design) |
| B4 | Primary lockup = stacked; in-app header = `wordmark-signature`; horizontal lockup only for co-branding strips | RECOMMENDATION |
| B5 | App icon = paper field with wine mark; inverse icon only for the Android themed layer and, pending the device test, very light wallpapers | RECOMMENDATION |
| B6 | Fallback if the review insists on the literal pair: the "ll" of round 02 (V1b), accepting the 16 px and lockup costs | RECOMMENDATION |
| B7 | Before any adoption: 20-user icon-confusion test vs Satispay, UniCredit, Lydia, Klarna at 60 px; figurative-mark clearance for `li`/`ll` monograms and LILI/LYDIA | RECOMMENDATION (gating) |

## Open questions

| # | Question | How to resolve |
|---|---|---|
| Q1 | Does a judging panel accept a lettermark against the research's "non-letter symbol" direction (D4)? | Compare with the abstract directions side by side at 60 px and in the lockup |
| Q2 | Does `li` read as "Lili" to anyone who knows the US brand, and does Lili hold EU/IT marks? | Side-by-side with Lili's wordmark; TMview "LILI" in 36/9/42 (`naming-analysis.md` Q2) |
| Q3 | Wine vs UniCredit red, rose vs Klarna pink at icon size on real devices | Phase 2 icon-confusion test (`brand-strategy.md` §13) |
| Q4 | Does "li" read as lithium, a face, or a Lydia derivative to Italian users? | Same test, open-ended "what do you see" question |
| Q5 | Paper icon vs inverse icon on light wallpapers | Device test on iOS and Android, five wallpapers |
| Q6 | Is the dot wanted as the Review Inbox badge, and at what size relative to text? | In-app prototype with the design system |
