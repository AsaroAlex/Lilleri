# Typography decision

**DECISION — 2026-10-02:** Geist for UI, body, amounts and labels; Newsreader only for generous editorial headlines; Geist Mono for IBANs, identifiers and copyable codes. No paid fonts. This is expert evaluation, not user validation.

## Evidence and the correction made during evaluation

FACT: `packages/brand/explorations/type/comparison.png`, `numbers.png` and `glyphs.png` render actual outlined glyphs, not screenshots of fallback fonts. `type-specimens.py` explicitly applies the font's GSUB `tnum` substitution and uses its advance widths. `font-measurements.json` records binary size, axes, coverage and digit widths. Sources, retrieval date and SHA256 for full Google Fonts files are in `source-fonts/sources.json`; Geist/Geist Mono come from the installed `geist` npm package, with the committed toolkit copies as inputs.

The toolkit's existing Inter/Manrope/Plus Jakarta/Instrument TTFs were **Latin-ext subsets without ASCII**. Initial specimens exposed `.notdef` boxes. Those renders were rejected and replaced using complete upstream files from `https://github.com/google/fonts/tree/main/ofl`. Existing exploration assets were preserved. This means older typeface-comparison screenshots are not reliable evidence of the affected families' basic glyphs. The new outlined specimens are the decision evidence.

All seven tested full binaries contain `0123456789€£$àèéìòùßñçœğșț`. All have equal-width digits after `tnum` (or by default in Geist Mono). Test glyph coverage is not a claim of support for every script. CHF is written as letters, not the obsolete franc sign.

## Six-family comparison

Legibility and brand fit are expert hypotheses based on the three rendered sheets. Metrics are measured facts. Competitor attribution comes from `docs/research/raw/typography-options.md`; unknown usage stays unknown.

| Family | Reading at 14/20/32 px | Figures / ambiguous glyphs | Variable axes, range | Actual TTF bytes | Licence / distribution / competitor risk |
|---|---|---|---|---:|---|
| **Geist** | Open amounts, substantial punctuation, compact rows | `tnum` 0.600em; tailed l distinguishes it from straight I; zero unslashed, O/0 still similar | wght 100–900 | 169,056 | SIL OFL 1.1; bundled TTF/static faces, npm `geist`; no verified PFM exclusivity, association with Vercel/dev products is a risk |
| Inter | Very clear, slightly wider amounts | `tnum` 0.648em; plain I/l in default, alternates available; slashed-zero feature | opsz 14–32, wght 100–900 | 876,576 | OFL; `@fontsource-variable/inter`; Wise UI usage verified in raw research, high generic-category risk |
| Manrope | Warm bowls, small thousands point/comma at 14 px | `tnum` 0.620em; plain I/l, no slashed zero | wght 200–800 | 164,700 | OFL; Fontsource; no verified competitor attribution; insufficient ambiguity separation by default |
| Plus Jakarta Sans | Geometric and pleasant, long rows | `tnum` 0.600em; default I/l similar | wght 200–800 | 176,288 | OFL; Fontsource; competitor usage unknown, generic startup associations are expert hypothesis |
| Instrument Sans | Crisp, less available weight breadth | `tnum` 0.600em; default I/l similar | wdth 75–100, wght 400–700 | 194,336 | OFL; Fontsource; competitor usage unknown, proposed N26 attribution unverified |
| Newsreader | Warm editorial texture, smaller x-height in small rows | tabular digits 0.550em; serif I/l/1; unslashed zero | opsz 6–72, wght 200–800 | 451,664 | OFL; Fontsource; no verified PFM attribution; editorial role only |

**Proposal → critique → counterproposal → decision:** choose Geist everywhere for consistency. Critique: this can look like developer software and default I/0 are not maximally distinct. Counterproposal: use Inter alternates or a serif. Decision: retain Geist's visible l tail and clear amount punctuation in UI; use Newsreader to add adult warmth in marketing; use Geist Mono's serif I, tailed l and slashed zero for codes. Do not introduce serif amounts or another UI sans. The custom outlined wordmark is not ordinary Geist typesetting.

## Implementation and licence

FACT: packaged Geist static TTFs are Regular 90,344 bytes, Medium 90,356, Semibold 90,436. Full variable web WOFF2 files are Geist 69,824 bytes, Newsreader 215,100 and Geist Mono 71,136. These are actual bundled builds, not the raw research's Latin-only subset estimates. Load only Geist on product routes; defer Newsreader to editorial/marketing and Mono to code screens. `packages/brand/fonts/LICENSE-*-OFL.txt` travels with fonts. Production may subset required scripts after coverage testing, retaining OFL terms.

Web: local `@font-face` or `next/font/local`, weights 100–900 for Geist, `font-display: swap`; `font-variant-numeric: tabular-nums lining-nums` on amounts. Native: bundle static faces with `expo-font`; use distinct family names per face if the platform does not reliably select weight; use `fontVariant: ['tabular-nums']`. Do not assume web OpenType feature support exactly matches an Expo/Hermes build. Never silently fall back to a different family for a money amount. Check real iOS/Android before release. Serif default opsz is 18; editorial headlines explicitly opt into appropriate optical size.

## Type scale

Canonical machine source: `packages/brand/src/index.ts` / `tokens/tokens.ts`, `typography.scale`. Sizes are logical native units / CSS px before user scaling. Token `letterSpacing` is mobile px; use measured proportional tracking on large web headlines, never condensed data rows.

| Role | Mobile size / line / weight | Web size / line / weight | Tracking mobile | Family |
|---|---|---|---|---|
| Display | 48 / 52 / 500 | 72 / 76 / 500 | −1.2 | Newsreader |
| H1 | 32 / 38 / 600 | 48 / 54 / 600 | −0.6 | Geist |
| H2 | 26 / 32 / 600 | 32 / 38 / 600 | −0.4 | Geist |
| H3 | 22 / 28 / 600 | 24 / 30 / 600 | −0.2 | Geist |
| Title | 18 / 24 / 600 | 20 / 26 / 600 | 0 | Geist |
| Body | 16 / 24 / 400 | 16 / 24 / 400 | 0 | Geist |
| Body Small | 14 / 20 / 400 | 14 / 20 / 400 | 0 | Geist |
| Label | 14 / 20 / 600 | 14 / 20 / 600 | 0 | Geist |
| Caption | 12 / 18 / 500 | 12 / 18 / 500 | 0 | Geist |
| Amount Large | 36 / 42 / 500 | 48 / 54 / 500 | −0.6 | Geist, tabular |
| Amount Medium | 22 / 28 / 500 | 26 / 32 / 500 | −0.2 | Geist, tabular |

Caption is supplementary only. Body/consent/error/review text never below 14, preferred 16. Dynamic Type, 200% web text zoom, line wrapping and no fixed-height text containers are requirements. A million-euro amount wraps currency to a second line before digits are truncated; never ellipsise monetary values. Allow comfortable line-height for French/German copy growth.

## Currency and locale contract

FACT: Node v22.22.0, ICU 77.1 defaults measured in `locale-examples.json`:

| Locale | 12438.72 EUR | −1234.56 EUR |
|---|---|---|
| it-IT | `12.438,72 €` | `-1234,56 €` |
| de-DE | `12.438,72 €` | `-1.234,56 €` |
| fr-FR | `12 438,72 €` | `-1 234,56 €` |
| es-ES | `12.438,72 €` | `-1234,56 €` |
| en-GB | `€12,438.72` | `-€1,234.56` |

Italian/Spanish CLDR defaults omit grouping on four-digit amounts; product DECISION: the exact formatter in `@lilleri/money` consistently groups thousands for financial scanning, uses a true minus `−`, and uses NBSP for amount/currency. Do not implement financial arithmetic with the float values used in this visual formatting experiment: domain amounts remain bigint minor units. User locale determines separator/placement; account currency determines currency code and minor-unit precision. Show currency code alongside ambiguous `$` totals. Do not aggregate unlike currencies without an explicit FX date/source. Spoken screen-reader labels say currency name and debit/credit direction.

Geist lacks U+202F (narrow NBSP) in the tested binary. French output needs a tested font fallback or deliberate NBSP spacing in the exact formatter; absence must never create `.notdef` boxes. Hermes Intl support depends on the shipped build: verify all five locales; the shared deterministic formatter is the fallback contract, not random device defaults.

## Misuse and remaining validation

No ultra-light amounts, fake bold, uppercase paragraphs, stretched wordmark, outlined UI text, italic decimals, animated digit count-ups, squeezed tracking to fit money, or monospace across the whole product. Do not assume a tailed l solves O/0 confusion in an IBAN. OPEN QUESTION: Android/iOS physical-device rasterisation, assistive-tech pronunciation, large-type row reflow and 20-person amount-reading/comprehension study. No such study has been conducted.
