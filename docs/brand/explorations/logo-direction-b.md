# Logo exploration — Direction B: "The double l" (*le due aste*)

**Project:** LILLERI (consumer PFM, Italy-first then Europe).
**Document type:** identity exploration, one of several parallel directions. Not a decision.
**Date:** 2026-10-02.
**Files:** `packages/brand/explorations/direction-b/` (SVG sources + PNG renders; list at the end).
**Inputs honoured:** `brand-strategy.md` (§8 lowercase wordmark, §10 anti-patterns, §11 "no € in the mark"), `naming-analysis.md` (D6 lowercase, tailed `l`), `docs/research/brand-competitor-analysis.md` (§3 palette census, §4 shape landscape, §7 clichés, §9 territory T1), `typography-options.md` §7 (Geist Sans).

**Labels.** As elsewhere in the repository: FACT (measured here, e.g. a contrast ratio or a pixel render), ASSUMPTION, HYPOTHESIS (anything about how people will read the mark — none of it is user-tested), DECISION (a choice made inside this direction only).

---

## 1. Concept

The name's most distinctive visual feature is the pair of `l`s in the middle of **li·ll·eri**. Direction B makes that pair the symbol: **two tall stems, flat on top, each ending in a foot that curls to the right and finishes in a single round terminal.** Nothing else — no frame, no dot, no field inside the symbol itself.

The symbol is not drawn *next to* the wordmark's logic; it *is* the wordmark's logic. The lowercase wordmark `lilleri` is set from Geist Sans 600 outlines (the UI typeface recommended by the typography research), with the three `l`s redrawn to the same construction as the symbol: the Geist `l` already has a small right-curling foot; the brand `l` keeps Geist's stem and height and gives the foot a longer run and a round terminal. The symbol is therefore the wordmark's `ll` with heavier stems and a wider gap. One terminal detail — the round end of the foot — is the single ownable gesture, and it appears three times in the wordmark and twice in the symbol.

**Why `ll` and not `li`.** A `li` ligature with a signature dot was considered and rejected on sight (iterations 01 and 01b): a tall stem beside a shorter stem reads as "Li" — half of the US brand *Lili*, and one step from Lydia's "L". The pair of equal `l`s reads unambiguously as a pair, and it is the pair, not the first syllable, that people mis-spell (`naming-analysis.md` §4: *Lileri*). The symbol literally teaches the spelling.

**Why lowercase.** DECISION already taken in `brand-strategy.md` §8 and `naming-analysis.md` D6, and confirmed here for a design reason: in capitals, LILLERI becomes an I-L-L-I picket fence and the pair disappears; in lowercase the ascender/x-height rhythm (l-i-l-l-e-r-i) makes the two `l`s stand out as the tallest, closest pair in the word. Lowercase is also warmer and less bank-like, which the brand needs (§10 anti-patterns: *bank-like, corporate, cold*).

## 2. Meaning

| Reading | What it carries | Status |
|---|---|---|
| **Two stems, side by side** | Two records that agree. The two legs of a transfer, pending and booked, what you spent and what the bank says: two things standing together, same height, same weight — the quiet picture of *reconciled* | HYPOTHESIS (the intended reading) |
| **The foot** | The one rounded gesture in an otherwise upright, architectural mark: the tidy-up, *sistemare*. Something that settles. It is also the only part of the mark that moves in the brand's single branded motion ("things settling into order"): stems slide in, feet land last | HYPOTHESIS |
| **The paper channel** | The negative space between the stems is a tall column of paper closed at the foot — the brand's whitespace, "the one line that is still open" (the Review Inbox) | HYPOTHESIS; a metaphor for the brand book, not something users must decode |
| **Quietly architectural** | Two uprights with feet: a colonnade's rhythm, a doorway, two people standing. "Italian like Olivetti and a well-set table" (`brand-strategy.md` §11), not a postcard | HYPOTHESIS |
| **The spelling** | Double `l`, single `r`: the mark fixes in memory the thing people get wrong when they type the name | HYPOTHESIS, cheap to test (dictation test in `naming-analysis.md` checklist 9) |

What it must **not** mean, and how that is handled: not a bar chart (equal heights, feet instead of flat bases, no third bar); not a pause button (flat tops *and* asymmetric feet, never two plain pills); not "11" or Roman "II" (the feet); not two cypresses (the feet again, and the flat tops — a tree would have neither; this reading is still a residual risk in olive, see §6).

## 3. Construction notes

All geometry is in `symbol.svg` (viewBox 0 0 1024 1024). The mark sits on an **8-unit grid (128 cells)**; every coordinate in the final path is an integer on that grid, so the file has no rounding noise.

| Element | Value (1024 box) | In cells | Ratio |
|---|---|---|---|
| Stem width *S* | 152 | 19 | 1 |
| Stem height (top 128 → baseline 896) | 768 | 96 | 5.05 S |
| Gap between stems *G* | 224 | 28 | 1.47 S |
| Foot thickness *T* | 144 | 18 | 0.95 S — horizontals read heavier than verticals, so the foot is 5 % thinner than the stem (optical correction) |
| Foot inner radius | 48 | 6 | 0.32 S |
| Foot outer radius | 192 | 24 | inner + T (concentric-looking, tangent to stem and baseline) |
| Flat run before the terminal | 56 | 7 | 0.37 S |
| Terminal | semicircle, r = 72 | 9 | T/2 — the one rounded detail |
| Foot reach beyond the stem's right edge | 176 | 22 | 1.16 S |
| Clearance between foot 1 and stem 2 | 48 | 6 | ≈ 0.75 px at 16 px (closes), 3 px at 64 px |
| Mark bounding box | 160–864 × 128–896 | 88 × 96 cells | 69 % × 75 % of the icon; centred on 512 |

Stem tops are **flat**: the first round of iterations used fully rounded pill stems and read as "cute/childish" (see `iterations/01-…png`); flat tops restore the typographic, slightly architectural tone, and leave the foot terminal as the *only* round end, which is the brief's "single rounded terminal detail".

**Wordmark (`wordmark.svg`).** Geist Sans 600 outlines at 1000 UPM, extracted with fontTools from the variable font at `wght=600` (OFL 1.1; outlines reused in a logo are permitted, the font itself is not redistributed under its reserved name). The `i`, `e`, `r` are untouched Geist glyphs. The `l` is redrawn with the symbol's construction scaled to text: stem 128 (Geist's own stem), height 710 (Geist's cap height), foot thickness 104 (0.81 S), inner radius 36, outer radius 140, run 44, terminal r 52; the foot reaches 132 beyond the stem where Geist's flat-cut foot reaches 79. Tracking −12/1000 em; optical kerns r–i −24, e–r −6, l–i −4. The wordmark viewBox is tight to the ascender and baseline with an 80-unit margin.

**Lockups.** `lockup-horizontal.svg`: symbol stem height = 1.18 × wordmark `l` height (tested 1.00 / 1.18 / 1.35, see `iterations/lockup-scale-*.png`; 1.00 reads as a stutter, 1.35 overpowers the name), gap = 0.42 × symbol height, baselines aligned, symbol in Oliva, wordmark in Inchiostro. `lockup-stacked.svg`: symbol at 1.6 × `l` height centred above the wordmark, gap 0.55 × `l` height — this is the lockup I would recommend as primary (§6). `wordmark-signature.svg`: the wordmark alone with its `ll` in Oliva — the most economical "lockup" of all, and the one for the in-app header.

**App icon (`app-icon.svg`).** Square, no corner radius (the OS masks it), field **Carta d'icona `#F1EADB`** — a step deeper than the UI paper so the square keeps a silhouette on light wallpapers — with the symbol in Oliva at the same size as `symbol.svg`. `app-icon-inverse.svg` (Oliva field, paper stems) is an alternative for Android themed icons and for dark wallpapers, *not* the primary: it is the "letter on a flat colour field" pattern the research tells us to avoid.

## 4. Colour

One signature colour plus the warm paper/ink neutral system (DECISION D2 of the competitor analysis). The signature is **T1 — Oliva** from the three shortlisted territories: desaturated olive is the only green nobody in the sample owns, it reads "ink on a ledger" rather than "money green", and — unlike T2 cotto — it has no Satispay hue collision to clear.

| Role | Name | Hex | Where |
|---|---|---|---|
| Signature | **Oliva** | `#4F5D3A` | symbol, `ll` in the signature wordmark, primary button |
| Signature on dark | **Salvia** | `#B7C59E` | symbol and buttons on Notte/Inchiostro surfaces |
| Neutral ink | **Inchiostro** | `#1F1B17` | wordmark, text, dark surfaces |
| Paper | **Carta** | `#F6F1E7` | light background |
| Icon paper | **Carta d'icona** | `#F1EADB` | app-icon field only |
| Night | **Notte** | `#15130F` | dark background |

WCAG 2.x contrast (FACT, computed with `contrast.mjs` on 2026-10-02):

| Pair | Ratio | Level |
|---|---|---|
| Oliva on white `#FFFFFF` | **7.10 : 1** | AAA |
| Oliva on Carta `#F6F1E7` | **6.30 : 1** | AA (AAA for large text / UI) |
| Oliva on Carta d'icona `#F1EADB` | 5.92 : 1 | AA |
| Inchiostro on Carta | 15.20 : 1 | AAA |
| Inchiostro on white | 17.11 : 1 | AAA |
| Carta on Oliva (reversed button / inverse icon) | 6.30 : 1 | AA |
| White on Oliva | 7.10 : 1 | AAA |
| Salvia on Notte `#15130F` | 10.15 : 1 | AAA |
| Salvia on Inchiostro `#1F1B17` | 9.36 : 1 | AAA |
| **Oliva on Notte** | **2.61 : 1** | **fail** → the olive symbol must never be used on dark surfaces; `symbol-dark.svg` (Salvia) exists for that |
| Carta d'icona vs iOS light home `#F2F2F7` | 1.07 : 1 | not a text pair; shows that the icon's silhouette on a flat light wallpaper relies on warmth, not contrast |

The full light/dark token set with a mock home screen is in `palette.json` / `palette.png` and the matrix in `contrast-report.txt`. One flaw is visible there and is logged in §6: the semantic *success* green (`#3F6B45`) is too close in hue to the Oliva signature.

## 5. Strengths

1. **Honest derivation.** The symbol is the name's own most distinctive feature; no metaphor has to be learned, and the mark teaches the spelling (two `l`s) that users get wrong.
2. **One stroke logic everywhere.** Stem + foot + round terminal is the entire vocabulary; the wordmark's three `l`s carry it, so symbol and wordmark are recognisably the same hand without the symbol having to be present.
3. **Survives small.** No stroke is thinner than 1/6.7 of the icon; two stems with feet are legible at 24 px and still a "pair" at 16 px (§9).
4. **Stands out on a home screen for the right reason.** In both shelf seeds the Lilleri square is the only paper-coloured icon among 29 saturated ones, and the glyph is readable at 60 px (§8). It differentiates by *restraint*, which is the brand's position.
5. **Calm, not cute; warm, not cold.** Flat tops and tight inner radii keep it typographic; the single round terminal and the paper/olive pairing keep it warm. It does not look like a bank, a crypto app or a toy.
6. **Monochrome- and dark-proof.** The mark is a silhouette: one colour, no gradients; the Salvia variant clears AAA on dark.
7. **Cheap to animate and to build.** Two paths; the foot terminal is a natural anchor for the brand's one motion ("settling"); the Review Inbox badge can be the brand's dot (from the two `i`s) without inventing a new shape.

## 6. Weaknesses (and what was done about them)

1. **It is a lettermark, and lettermarks are the category's most common pattern** (Revolut R, Venmo V, Lydia L, Emma e; `brand-competitor-analysis.md` §4). The research's D4 asks for a *non-letter* symbol. This direction argues the exception — a *pair* of lowercase letters with a signature terminal, on paper rather than a saturated field — but a judging panel may rightly prefer an abstract direction. Honest rating: originality 3/5.
2. **The horizontal lockup stutters: "ll lilleri".** Inherent to any symbol that is also the word's letters. Mitigations delivered: symbol at 1.18 × the `l` height and a wide gap; a stacked lockup (recommended primary); and `wordmark-signature.svg`, where the symbol lives *inside* the word as the olive `ll` — no stutter, and it teaches the icon. Recommendation: the horizontal lockup is for narrow co-branding strips only.
3. **At 16 px the feet merge with the next stem and the pair reads "u"-ish** (see `favicon-sheet.png`). Still a recognisable two-stem silhouette; a human should cut a pixel-snapped 16/32 px master (§12).
4. **Residual mis-readings:** two cypresses (in olive), two commas / low quotation marks („) at 60 px, "LL", a pause glyph. Flat tops and feet reduce all of these; none goes to zero. Test with the icon-confusion study (brand-strategy §13).
5. **The semantic success green collides with the signature** in `palette.json` (`#3F6B45` vs `#4F5D3A`). Violates rule 3 of the competitor analysis §9 (semantic colours never collide with the signature). Fix in the design system: positive amounts in ink with the sign, or a clearly different hue; not solved here.
6. **The icon field is nearly invisible on a flat light wallpaper** (1.07 : 1 vs iOS light home). Real wallpapers are rarely flat `#F2F2F7`, and the glyph alone still reads, but it must be checked on devices; a 2-unit keyline or the inverse icon are the fallbacks.
7. **Geist provenance.** `i`, `e`, `r` are Geist 600 glyphs; a wordmark that is 4/7 a free typeface is ownable only through the `l`s. A designer should either redraw `e` and `r` in the same spirit or accept this as a typographic wordmark.
8. **The foot's circular arcs look slightly heavy-bottomed above 256 px** (the outer radius is a plain circle). Fine at icon sizes; needs an optical curve for print.

## 7. Memorability — 3.5 / 5

Reproducible from memory with a pen ("two l's with hooks"), tied to the name's rhythm (lil-le-ri) and to the one thing people must remember to spell it right. Against that: lettermarks are forgettable as a genre, and `ll` carries no story on its own — the story has to come from the Tuscan name and the paper/olive world around it. Recall will depend on consistency (paper field, olive, the foot terminal everywhere) more than on the shape. HYPOTHESIS; measure with the 7-day recall test already planned in `brand-strategy.md` §13.

## 8. App Store / home-screen recognisability — 4 / 5 (synthetic test only)

What the shelf test showed (`shelf.png`, seed 3, slot 6 in row 2; `shelf-seed11.png`, seed 11, slot 27 in row 5):

- The Lilleri square was the **only light, warm-neutral icon** among 29 generic finance icons in both seeds; the eye lands on it within the first second even in seed 11, which also contains two pastel-pink and two lime icons (light-valued, but cold or saturated).
- The `ll` glyph is readable at 60 px in both; the feet read as feet, not as blobs.
- The icon's label "Lilleri" and the glyph reinforce each other (the pair in the icon is the pair in the word).
- Caveat: the shelf contains no real competitors. On an Italian phone the neighbours are Satispay (vivid orange field), Revolut (black), PayPal (blue), N26 (teal), Intesa (dark green): all saturated or dark, so a paper field keeps its advantage; but this is HYPOTHESIS until the 20-user icon-confusion test (`brand-competitor-analysis.md` Q6) is run — the test that matters most for this direction is olive-on-paper next to Intesa's dark green and N26's teal at 60 px.

## 9. Legibility at 16 / 24 / 32 px

From `icon-sheet.png` (app icon, field included) and `favicon-sheet.png` (bare symbol), rendered 1 : 1:

| Size | What is visible | Verdict |
|---|---|---|
| **32 px** | Two stems, both feet, the round terminals and the paper channel between them; clearly "ll" | Good |
| **24 px** | Two stems and two feet; terminals soften but the hook shape survives; still "ll" | Good |
| **16 px** | Two 2.4-px stems on a 3.5-px gap; the first foot touches the second stem, so the bottom reads as a shallow "u"; the right foot still shows as a nub. With the paper field, the icon reads as "a light square with a dark pair"; bare on white, as "ll/u" | Acceptable as a favicon on light tabs; on dark browser chrome use the Salvia symbol or the paper-field icon (olive on near-black is 2.6 : 1) |

No stroke is below 1/24 of the icon (the thinnest element is the 48-unit clearance, which is allowed to close). Recommendation: the favicon set uses the **paper-field icon** (survives light and dark tabs) and a pixel-snapped master for 16 and 32 px (§12).

## 10. Dark / light behaviour

- **Light (Carta):** Oliva symbol, Inchiostro wordmark; `lockup.png`, `wordmark.png`, `lockup-stacked.png`. The olive is a quiet second tone next to the ink — in `wordmark-signature.png` the olive `ll` reads as a highlight, which is the intended hierarchy.
- **Dark (Notte):** Salvia symbol, Carta wordmark; `dark-lockup.png`, `lockup-stacked-dark.png`. Salvia at 10 : 1 on Notte keeps the mark soft rather than neon; it does not drift toward Wise's lime because its saturation is low.
- **Rule:** the olive symbol is never placed on Notte/Inchiostro (fails at 2.6 : 1); the sage symbol is never placed on Carta (fails the other way: Salvia on Carta 1.62 : 1, on white 1.83 : 1, FACT computed with `contrast.mjs`). Light mode is the brand's native mode (`brand-strategy.md` §10, "crypto-bro" row), and the icon stays paper in both modes.

## 11. Monochrome behaviour

`symbol-mono.svg` (pure `#000`) is identical geometry; the mark is a silhouette with no inner detail, so it survives single-colour print, embossing, engraving, laser-cut and one-colour stamps unchanged. Reversed (paper on ink or on olive) it also works — `app-icon-inverse.svg` is that test. The wordmark is likewise one colour. There is no version that depends on colour to be understood.

## 12. Similarity risks (described, never copied)

| Brand | Their mark (from the research tables, not reproduced) | Risk | Why |
|---|---|---|---|
| **Revolut** | Bold capital "R" with a diagonal cut, white on near-black | Low | Different letter, case, count and field; only the "letter as icon" genre is shared |
| **N26** | "N26" wordmark on teal, no symbol | Low | No "26"; two stems do not read as digits because of the feet; palette opposite |
| **Klarna** | Wordmark with a full stop, pink | Very low | Nothing shared |
| **Satispay** | Two intertwined looping strokes on vivid orange, lowercase wordmark | Low–medium conceptually, low visually | Both are "two strokes"; theirs loop and interlock on orange, ours stand straight on paper. Must still be in the 60-px confusion test because Satispay is the most recognised Italian icon |
| **Wise** | Merged-letterform wordmark; bright green on forest green | Low–medium (colour family) | Both "green"; Wise is neon lime on saturated forest, Lilleri is desaturated olive on paper. The risk is a lazy "another green fintech" reading, not confusion |
| **Curve** | Minimal wordmark, dark with a bright blue accent | Very low | Nothing shared |
| **Monzo** | Lowercase wordmark, hot coral | Low | Lowercase wordmarks are the European default; shape and colour differ |
| **Lydia** | Capital "L" in a bright-blue rounded square | **Medium-low** | The closest *idea*: an L-shape as the icon. Ours is lowercase, doubled, with rounded hooks instead of a sharp foot, no blue, no framing square. A hostile reading is "two Lydia L's on beige"; include in the test |
| **Lili (US)** | Lowercase "lili" wordmark (ASSUMPTION on its exact form; not fetched) | **Medium, driven by the name** | Our wordmark shares `lil` because the names do; the symbol `ll` is also "half of lili". The design does not borrow anything specific, but figurative-mark clearance must cover LILI/LILLI in classes 9/36/42 (`naming-analysis.md` R4) |
| **Emma** | Lowercase "e" on purple/lilac | Very low | Different letter and palette |
| **Monarch** | "M"/butterfly on indigo | Very low | Nothing shared |
| **Copilot** | Bright glyph on a dark icon | Very low | Opposite value structure |
| **YNAB** | "YNAB" wordmark on blue | Very low | Nothing shared |
| **Generic** | Pause glyph, "11", Roman "II", „ quotes, two cypresses, double-l fashion monograms | Low–medium | Flat tops and feet mitigate; a figurative-mark search for `ll` monograms is needed before filing |

Net: no competitor is copied or closely approached; the two items to carry into clearance and user testing are **Lydia (shape idea)** and **Lili (name + `ll`)**.

## 13. What a human designer should refine

1. **Optical curves.** Replace the circular outer arc of the foot with a superellipse/compensated curve so the foot does not look heavy-bottomed above 256 px; re-check the 5 % thinner foot at sizes where it may look too light.
2. **Pixel masters.** Cut dedicated 16 px and 32 px versions (stems on whole pixels, gap widened by one unit, feet shortened) and a 1-bit favicon.
3. **Wordmark ownership.** Redraw `e` and `r` in the same spirit (or accept the typographic wordmark deliberately); decide whether the `i` dots become round to echo the terminal — this is also where the brand's "dot" for the Review Inbox badge would come from; test square vs round.
4. **Lockup policy.** Stacked as primary; `wordmark-signature` for the in-app header and e-mail; horizontal only for co-branding strips. Define clear space in units of the stem width *S*.
5. **Icon field on real wallpapers.** Test the Carta d'icona field on iOS light/dark and Android Material You; decide between a 2-unit keyline and the inverse icon for the Android monochrome/themed layer.
6. **Colour system.** Fix the success-green collision (§6.5); run deuteranopia/protanopia simulations; confirm Oliva vs Intesa green and N26 teal at 60 px with the 20-user test; define Salvia's light-mode counterpart for tinted surfaces (e.g. the "3 movimenti da controllare" banner).
7. **Motion.** Prototype the one branded motion with the stems sliding in and the feet landing last; the terminal is the anchor.
8. **Clearance.** Figurative-mark search for double-`l` monograms and for LILI/LYDIA marks in 9/36/42 before any public use (gating item in `naming-analysis.md` D4).

## 14. Iteration log (what was seen, what changed)

| Round | What was rendered | What I saw | Change |
|---|---|---|---|
| 01 (`iterations/01-round-stems-rounded-caps.png`, `01b-…sheet.png`) | Round-capped pill stems, stroke 25 % of height; five variants: equal/two tails, stepped/one tail, big tail | Pill tops + small inner radii = socks/boots, "cute" (violates *not childish*). Stepped variants read "Li"/"U" (Lili/Lydia territory); big tail reads as capital L | Flat tops; lighter stems (≈ 15 %); abandon different heights |
| 02 (`iterations/02-flat-tops-first-foot.png`) | Flat tops, filled outlines, stroke 144–168; equal vs stepped; one vs two feet | Equal heights + two feet read cleanly as "ll"; step looks like a sizing error; foot still a big swoop. Custom monoline wordmarks (`wordmark-01`, `wordmark-02`) clearly inferior to Geist 600 | Tight inner radius + flat run + round terminal; wordmark from Geist outlines with a redrawn `l` |
| 03 (`iterations/03-foot-refinement-and-ligature.png`, `03n-ligature-sheet.png`) | Foot refined; ligature variant (first foot flowing into the second stem); long-foot variant; weights 144/160/176 | Ligature reads as "u" at every size — dead. Long foot drifts to uppercase "LL" (Lydia-adjacent). 152–160 is the right weight | Final: S 152, G 224, foot 48/56/144, terminal 72; 8-unit grid |
| 04 (deliverables; `iterations/lockup-scale-*.png`) | Lockup at 1.00/1.18/1.35; wordmark with kerning; icon sheet, favicon sheet, two shelf seeds, palette sheet | 1.00 stutters, 1.35 overpowers; r–i too loose (fixed, −24); paper icon unique on both shelves; olive fails on dark (Salvia variant); success green too close to olive (logged) | Added `wordmark-signature` and stacked lockup as the stutter fix |

## 15. Files

All under `packages/brand/explorations/direction-b/`:

| File | What |
|---|---|
| `symbol.svg` | Symbol, 1024 viewBox, transparent, Oliva |
| `symbol-mono.svg` | Symbol in `#000000` |
| `symbol-dark.svg` | Symbol in Salvia for dark backgrounds |
| `app-icon.svg` | iOS-style icon with Carta d'icona field (no corner radius) |
| `app-icon-inverse.svg` | Alternative inverse icon (Oliva field, paper stems) — test only |
| `wordmark.svg` / `wordmark-dark.svg` | Wordmark in Inchiostro / in Carta |
| `wordmark-signature.svg` | Wordmark with the `ll` in Oliva |
| `lockup-horizontal.svg` / `lockup-horizontal-dark.svg` | Horizontal lockup, light / dark |
| `lockup-stacked.svg` / `lockup-stacked-dark.svg` | Stacked lockup, light / dark |
| `palette.json` | Light/dark token set used for the palette sheet |
| `symbol@256.png` | Symbol render, 256 px on Carta |
| `symbol-mono.png` | Mono symbol, 256 px on white |
| `wordmark.png`, `wordmark-signature.png` | Wordmark renders on Carta |
| `lockup.png`, `dark-lockup.png` | Horizontal lockup, light / dark |
| `lockup-stacked.png`, `lockup-stacked-dark.png` | Stacked lockup, light / dark |
| `icon-sheet.png` | App icon at 256→16 px on four backgrounds, 1 : 1 |
| `favicon-sheet.png` | Bare symbol at 256→16 px (favicon case) |
| `icon-sheet-inverse.png` | Inverse icon sheet |
| `shelf.png` (seed 3), `shelf-seed11.png` (seed 11) | Recognition test among 29 generic finance icons |
| `palette.png`, `contrast-report.txt` | Palette swatches with mock home screen; WCAG matrix |
| `iterations/*.png` | Rounds 01–04 as described in §14 |

Rendering was done with the shared toolkit (`render.mjs`, `icon-sheet.mjs`, `shelf.mjs`, `palette-sheet.mjs`, `contrast.mjs`); the symbol and wordmark SVGs use only `<path>`/`<rect>` with plain attributes — no filters, CSS classes or external references.

---

## Decisions / Recommendations (within this direction)

| # | Item | Type |
|---|---|---|
| B1 | Symbol = two equal `l` stems with flat tops and a single round foot terminal; no step in height, no ligature, no dot | DECISION (design, this direction) |
| B2 | Wordmark lowercase, Geist Sans 600 outlines with the `l` redrawn to the symbol's construction | DECISION (design) |
| B3 | Signature colour Oliva `#4F5D3A` on the Carta/Inchiostro system; Salvia `#B7C59E` on dark; olive never on dark surfaces | DECISION (design) |
| B4 | Primary lockup = stacked; in-app header = `wordmark-signature`; horizontal lockup only for co-branding strips | RECOMMENDATION |
| B5 | App icon = paper field with olive mark; inverse icon only for Android themed layer | RECOMMENDATION |
| B6 | Before any adoption: 20-user icon-confusion test vs Satispay, Intesa, N26, Lydia at 60 px; figurative-mark clearance for `ll` monograms and LILI/LYDIA | RECOMMENDATION (gating) |

## Open questions

| # | Question | How to resolve |
|---|---|---|
| Q1 | Does a judging panel accept a lettermark against the research's "non-letter symbol" direction (D4)? | Compare with the abstract directions side by side at 60 px and in the lockup |
| Q2 | Olive vs Intesa green / N26 teal / Wise green at icon size on real devices | Phase 2 icon-confusion test (brand-strategy §13) |
| Q3 | Does "ll" read as cypresses or quotation marks to Italian users? | Same test, open-ended "what do you see" question |
| Q4 | Square or round `i` dot; is the dot the Review Inbox badge? | Designer refinement + in-app prototype |
| Q5 | Lili's EU/IT marks and any registered double-`l` figurative marks | Trademark clearance (`naming-analysis.md` checklist 1) |
