# Lilleri — Typography Options Research

**Scope.** Typeface selection for Lilleri (consumer PFM, Italy-first then Europe; React Native/Expo mobile, Next.js web and marketing; many amounts such as `€ 12.438,72` and `-€1.234,56`; "calm premium" tone). Covers licence/cost, variable-font availability, weights, OpenType numeral features (tnum/lnum/zero), 1-I-l / 0-O distinguishability, currency and European diacritic coverage, hinting, packaging (`@expo-google-fonts`, `@fontsource`, `next/font`), file sizes, a shortlist and recommendation, a type scale, misuse risks, Italian/EU number-formatting rules and accessibility notes.

**Verification date:** 2026-10-02. **Author:** research subagent, Phase 0.

**Evidence method and limits (read first).**

- The session's web-search budget was exhausted before this task started, and the egress proxy blocks almost every website (`rsms.me`, `fonts.google.com`, `fontshare.com`, `klim.co.nz`, every commercial foundry, every fintech site, MDN, W3C's www site, Expo docs site). What *was* reachable: `registry.npmjs.org` (package tarballs), `raw.githubusercontent.com` (repository files, including the canonical `google/fonts` repository), `fonts.googleapis.com`, `pypi.org`, and the Context7/GitHub MCP tools (GitHub MCP limited to code search).
- Consequently most "variable" claims below are **measured directly from the font binaries** (fontTools 4.66.1 on the TTFs published in `google/fonts`, the `inter-ui` and `geist` npm packages, and one vendored Fontshare file), from **licence texts fetched from the upstream repositories**, from **npm registry metadata**, and from **Node 22.22 (ICU 77.1 / CLDR 47)** for `Intl.NumberFormat`. These are labelled FACT with the file/URL used.
- Commercial-foundry prices, first-party fintech brand pages and Italian bank UI conventions could **not** be fetched; those are labelled ASSUMPTION / HYPOTHESIS / UNKNOWN with a verification route. Satoshi, General Sans and Cabinet Grotesk binaries could not be retrieved (GitHub copies were Git-LFS pointers); only Switzer was analysed as a Fontshare proxy.
- Label key: **FACT** = verified from a primary source today; **ASSUMPTION** = from training knowledge or secondary source, plausible, unverified; **HYPOTHESIS** = inference; **UNKNOWN** = not determinable here.

---

## 1. Executive summary

1. **Recommended primary: Geist Sans (OFL, Vercel)** — tabular figures, tailed `l`, alternate `I` (ss05), 9 weights + italics, Latin-Ext + Cyrillic, compact amounts (`€ 12.438,72` = 5.58 em vs Inter 6.01 em), 28 KB Latin woff2, first-class `next/font` package and `@expo-google-fonts/geist`. Caveats: no Greek, no slashed-zero feature, missing `U+202F` (French thousands separator) and a few non-EU currency glyphs. **Safe alternative: Inter 4.1** (largest feature set and coverage of any candidate, but widest amounts, biggest files, and the body face of Wise and Revolut per third-party audits, so least differentiating).
2. **Optional display: Newsreader (OFL, Production Type)** for marketing and hero numbers on web only (optical-size axis 6–72, tabular figures, italics). **Lighter alternative: Instrument Serif** (display only, no tabular figures). Do not put a display face inside transactional mobile screens.
3. **Mono/data face: not needed for amounts** (tabular figures in the primary face suffice). Use **Geist Mono** (22 KB, slashed zero by default) only for IBAN/BIC/reference codes.
4. **Disqualified for amounts (measured):** DM Sans (no `tnum` and proportional digits in the Google Fonts v4.004 build), Urbanist, Lexend, Fraunces, Instrument Serif (no tabular figures); Manrope (period glyph 0.060 em — the decimal comma/thousands point is nearly invisible at 14 px).
5. **Number formatting:** `Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR'})` yields `"12.438,72 €"` and `"-1234,56 €"` (no separator for four-digit integers because Italian CLDR sets `minimumGroupingDigits = 2`). Lilleri must set `useGrouping: 'always'` (→ `"1.234,56 €"`), and must not rely on `formatToParts`, `signDisplay` or compact notation on iOS Hermes. A shared, unit-tested formatter package is required so backend PDFs, web and app agree.
6. **Platform reality (FACT, npm 2026-10-02):** Expo SDK 57.0.26 is `latest`; the SDK-57 docs say variable fonts "do not have support across all platforms — use static fonts". SDK 58 (`next` = 58.0.2, React Native 0.88.0-rc.3) adds native variable-font support (Android 10+) and `fontVariationSettings`. Plan: static instances on native now, variable on web, migrate native to variable after SDK 58 ships.

---

## 2. Platform constraints that shape the choice

| Topic | Finding | Status / source |
|---|---|---|
| Expo stable version | `expo@57.0.26` is `latest`; `next` tag = `58.0.2`; `canary` = 58.0.0-canary-20260909. `react-native@0.87.1` latest, `0.88.0-rc.3` next. | FACT — `npm view expo dist-tags`, `npm view react-native dist-tags`, 2026-10-02 |
| Variable fonts on native (current SDK) | SDK-57 docs: "Variable fonts, including variable font implementations in OTF and TTF, do not have support across all platforms. For full platform support, use static fonts. Alternatively, use fontTools … to extract the specific axis configuration". | FACT — https://raw.githubusercontent.com/expo/expo/sdk-57/docs/pages/develop/user-interface/fonts.mdx (high) |
| Variable fonts on native (next SDK) | Main-branch docs: "Android and iOS support variable fonts in SDK 58 and later"; Android reads `wght` only (Android 10+; older versions render default weight and fake bold); iOS selects **named instances**; RN 0.88 adds `fontVariationSettings` style prop on both platforms (Android 8+). Config plugin: `ttf`/`otf` on both; `woff`/`woff2` iOS only. `useFonts` reads the weight axis only. | FACT — https://raw.githubusercontent.com/expo/expo/main/docs/pages/develop/user-interface/fonts.mdx (high; describes unreleased SDK) |
| Tabular numerals in RN | `fontVariant` style prop accepts `'tabular-nums'`, `'lining-nums'`, `'oldstyle-nums'`, `'proportional-nums'`, `'small-caps'` (array or space-separated string). | FACT — https://raw.githubusercontent.com/facebook/react-native-website/main/docs/text-style-props.md (high). Doubt: per-platform behaviour not stated in the doc; verify on Android. |
| `fontVariationSettings` in RN | Documented (object or CSS string, e.g. `{wght: 500}`), "for variable fonts". | FACT — same file (main branch; ships with RN 0.88 per Expo docs) |
| Dynamic Type / scaling props | `allowFontScaling` (default `true`), `maxFontSizeMultiplier` (0 = no max), `dynamicTypeRamp` (iOS, `caption2`…`largeTitle`), `adjustsFontSizeToFit`, `minimumFontScale`. | FACT — https://raw.githubusercontent.com/facebook/react-native-website/main/docs/text.md (high) |
| `@expo-google-fonts/*` | v0.4.x packages exist for every OFL family evaluated (incl. `atkinson-hyperlegible-next`, `geist`, `geist-mono`, `bricolage-grotesque`, `newsreader`, `instrument-serif`). Each ships **static, full-glyph-set TTFs per weight** (e.g. `Inter_400Regular.ttf` = 334 KB, `Geist_400Regular.ttf` = 89 KB) plus `useFonts`; licence `MIT AND OFL-1.1`. No variable file. | FACT — tarballs inspected; `npm view … version` (high) |
| `@fontsource-variable/*` | v5.3.0 (published 2026-07-19) for every family; per-subset woff2 with `unicode-range`; Inter package exposes `wght`, `opsz` and `standard` (both axes) CSS files, family name `'Inter Variable'`. Fontsource builds come from `google/fonts`. | FACT — tarballs + `metadata.json` (high) |
| `geist` npm | v1.7.2 (2026-06-01), licence "SIL OPEN FONT LICENSE", `peerDependencies: next >= 13.2`; exports `geist/font/sans`, `geist/font/mono`, `geist/font/pixel`, plus `*-non-variable`; ships `Geist-Variable.woff2` (69.7 KB), `Geist-Variable.ttf` (169 KB), static TTF/woff2 per weight. Next < 15 needs `transpilePackages: ['geist']`. | FACT — package contents + README (high) |
| `inter-ui` npm (official alternate distribution) | v4.1.1 (2025-06-22), OFL-1.1; CHANGELOG: "4.1.0 — Updated font files to Inter 4.1 release". Ships `InterVariable.woff2` 352 KB (full) / 100 KB (Latin subset), `InterVariable-Italic`, and **InterDisplay** static woff2 (18 styles, ~27–30 KB each Latin). Doubt: the `name` table in `InterVariable.woff2` still reads "Version 4.001;git-9221beed3". | FACT — package inspected (high); version-string discrepancy noted |
| Google Fonts build of Inter | `Inter[opsz,wght].ttf` version string "4.001;git-66647c0bb", italics present (`Inter-Italic[opsz,wght].ttf`), served as `v20` by the CSS API with 7 subsets. The rsms README still says "Should I use Inter from Google Fonts? No, unless you have no other choice (outdated, no italics)" — partly stale (italics are now there) but the build is 4.0, not 4.1. | FACT — google/fonts repo, CSS API, https://raw.githubusercontent.com/rsms/inter/master/README.md (high) |
| Hermes `Intl` (RN JS engine) | `Intl.NumberFormat.format` supported on both platforms; **`formatToParts` Android-only**; **iOS does not support `notation: 'compact'`, `compactDisplay`, `signDisplay`**; Android 11 has "rough edges" with `signDisplay`, `style:'unit'`, compact; Android ≤10 further issues. Uses platform ICU, so output varies by OS version. Doc targets ECMA-402 7th ed. (2020) — may be stale. | FACT — https://raw.githubusercontent.com/facebook/hermes/main/doc/IntlAPIs.md (medium: age unknown) |

**Implications.** (a) Any choice must exist as static cuts for native today → every OFL family evaluated qualifies via `@expo-google-fonts` or by instancing with fontTools; Fontshare fonts **cannot** be instanced/subset legally (see §3.2). (b) Tabular figures are a style prop in RN, so the font must actually carry `tnum` (or have tabular digits by default). (c) Amount formatting cannot depend on `formatToParts` on iOS.

---

## 3. Licence landscape

### 3.1 SIL Open Font License 1.1 (all Google-Fonts candidates)

- Verified OFL 1.1 texts: Inter (`Copyright (c) 2016 The Inter Project Authors`, RFN "Inter"), Geist (`Copyright (c) 2023 Vercel, in collaboration with basement.studio`), Atkinson Hyperlegible Next (`Copyright 2020-2024 The Atkinson Hyperlegible Next Project Authors`), IBM Plex (RFN "Plex"); every other candidate carries `license: "OFL"` in its `google/fonts` `METADATA.pb`. **FACT** (files fetched 2026-10-02; high).
- OFL permits: use, bundling, embedding in apps and web, modification, subsetting, redistribution, selling *with* software; forbids selling the font alone and using Reserved Font Names on modified versions (rename if you subset/instance and redistribute — internal app bundles are fine; `@fontsource` already ships subsets under the original names, which is tolerated practice but strictly an RFN grey zone — **ASSUMPTION**, low impact). Expo's README: "You can use these fonts freely in your products & projects – print or digital, commercial or otherwise. However, you can't sell the fonts on their own." **FACT** (expo/google-fonts README).
- **Atkinson Hyperlegible Next licence (asked to check for 2025):** OFL 1.1 confirmed in the Google Fonts repository (`googlefonts/atkinson-hyperlegible-next/OFL.txt`, README "This Font Software is licensed under the SIL Open Font License, Version 1.1"), `date_added: 2025-01-07`, designer "Braille Institute, Applied Design Works, Elliott Scott, Megan Eiswerth, Letters From Sweden", version 2.001 (20 Nov 2024). **FACT** (high). Doubt: the Braille Institute's own site may distribute under its own EULA; the Google Fonts build is the OFL one — use that build.
- Cost: €0 for all OFL families.

### 3.2 Fontshare — ITF Free Font License v2.0 (Satoshi, General Sans, Switzer, Cabinet Grotesk …)

Text verified from two vendored copies on GitHub ("ITF Free Font License (FFL) Version 2.0 – 17 Aug 2026"). **FACT** (medium-high: mirrors, not fontshare.com; identical across both copies).

| Clause | What it says | Effect on Lilleri |
|---|---|---|
| §01 Grant | "non-exclusive, non-assignable, non-transferable and terminable license … for personal or commercial purposes, free of charge"; "any media, including Print, Websites, **Mobile or Desktop Applications** … Games"; "You may self-host … including through standard webfont technologies such as CSS @font-face"; "You may embed the Font Software in mobile or desktop applications"; logos may be trademarked. | Commercial app + web + marketing use is **allowed** at no cost. |
| §02 Limitations | "You may **not modify, edit, adapt … subsetting, format conversion**, or altering font names … metadata" without written consent; may not redistribute "through another font website, font library, marketplace, **repository**"; "may not provide the Font Software directly to external designers, agencies, contractors"; may not make it selectable for third-party users in a SaaS/design tool. | **No subsetting, no woff2 conversion, no static instancing** → cannot run the usual web-perf pipeline or fontTools instancing for RN; committing the files to a public monorepo is arguably "repository" redistribution; every contractor must download their own copy. Expo SDK 57 native would need ITF-provided static cuts. |
| §05 Derivative Work | Any modification is a derivative work requiring consent. | Same as above. |
| §06–§08 | No warranty; no obligation to maintain; Fontshare API may be withdrawn; termination with 30-day cure, proof of deletion on request. | Operational risk: no update guarantee; licence is terminable. |

Verdict: Fontshare fonts are usable commercially, but the modification ban and "terminable" nature make them a poor fit for a monorepo with font subsetting/instancing. Satoshi in particular is saturated in startup landing pages since ~2021 (**ASSUMPTION**).

### 3.3 Commercial foundries (prices ASSUMPTION unless stated)

No foundry site was reachable, and no public price list could be fetched. Orders of magnitude below are from training knowledge (2024–2025) and must be re-quoted from the foundry pages before any decision. Licensing is almost always split by channel (Desktop / Web by page-views or domains / **App** per app title or per install band / ePub / Server), so an app + web + desktop bundle is typically 3 licences.

| Family (foundry) | Licence shape | Order of magnitude (ASSUMPTION, low reliability) | Notes |
|---|---|---|---|
| Söhne, Söhne Mono, Untitled Sans (Klim) | Desktop (per user), Web (per site), App (per app), ePub, Server; separate families for Breit/Schmal/Mono | single style ≈ US$50–100 per channel; full Söhne family desktop ≈ US$1–2k; app + web + desktop for a small company ≈ US$3–10k | Söhne = ChatGPT/OpenAI and (believed) Stripe UI face — strong "AI/Stripe" association (ASSUMPTION). Excellent tabular figures. |
| Graphik (Commercial Type) | Desktop/Web/App per style | hundreds of US$ per style per channel; family thousands | Widely used by media; feels corporate. |
| Aeonik / Aeonik Pro (CoType) | per style, per channel; Aeonik Pro = extended set | ≈ £50–80 per style desktop; family £500+; app licence separate | Third-party site audit attributes Revolut's display face to "Aeonik Pro" (§5). **Avoid** for differentiation. |
| Matter, Roobert (Displaay) | per style, per channel | ≈ €40–70 per style; app licences separate | Roobert widely used by crypto/fintech brands (ASSUMPTION). |
| PP Neue Montreal (Pangram Pangram) | "free for personal use" trial; commercial per style per channel | ≈ US$40–60 per style per channel | Commercial app use requires paid licence — the free download is **personal use only** (ASSUMPTION, high confidence). |
| Suisse Int'l, Euclid Circular (Swiss Typefaces) | per style per channel, CHF | expensive; family CHF thousands; app licence quote-based | Euclid Circular extremely common in fintech/SaaS → avoid. |
| ABC Diatype / ABC Favorit (Dinamo) | per style per channel; free trials | ≈ €60–120 per style per channel | Diatype used by many design-led startups. |
| Basier (Atipo) | pay-what-you-want / low fixed price, broad licence | ≈ €40–150 for a family | Cheapest commercial option; licence terms for app embedding to verify. |
| TT Commons (TypeType) | per style per channel; app by installs | ≈ US$30–60 per style | Affordable; large language coverage. |
| Neue Haas Grotesk (Monotype) | Monotype Fonts subscription or perpetual per style; app by downloads | expensive, enterprise-style | Helvetica lineage; generic. |
| GT America (Grilli Type) | per style per channel | ≈ CHF 60–100 per style per channel | Popular with agencies; app licence separate. |
| Circular (Lineto) | quote-based, per channel | expensive, opaque | Used by Spotify/Airbnb historically and many fintechs → **avoid** (ASSUMPTION). |
| Inter Display | **OFL, free** — part of Inter 4 (opsz axis 32 = Display; InterDisplay statics in `inter-ui`) | €0 | **FACT** (files inspected). |

How to verify: fetch each foundry's licence page and request an "App + Web + Desktop" quote for 1 app title, 1 domain, ≤5 desktop users; record the price in a `docs/research/raw/typography-prices.md` with date.

---

## 4. Master comparison — OFL candidates (measured from `google/fonts` TTFs, 2026-10-02)

Legend: *tnum* = `tnum` feature present (Y) / digits tabular by default (D) / neither (**NO**). *Amount width* = advance width of `€ 12.438,72` with tabular digits, in em (and px at 32 px). *Period h* = height of the `.` glyph in em (proxy for how visible the Italian thousands point / decimal comma is; comma depth in parentheses). *I/l/1* from outline point counts: plain `I` = 4 pts; serifed `I` ≥ 12; tailed `l` ≥ 9. Coverage: ✔ = all test glyphs present (digits, € £ $ ¥, % ‰, −, àèéìòù ßẞ ñ ç ø å æ œ, Polish/Czech/Hungarian/Romanian incl. ș ț, Turkish). "Extra ¤" = ₣ ₤ ₺ ₽ ₹ ₩ ₿ present.

| Family | Ver. (GF build) | Axes / weights / italic | tnum | lnum/onum | zero feat. | I / l / 1 | Amount width em (px@32) | Period h (comma depth) | Coverage | Extra ¤ | U+202F | TTF KB (var) | woff2 KB (latin, wght) | x-h / cap-h |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Inter** | 4.001 (upstream 4.1.1) | opsz 14–32, wght 100–900, italic | Y | pnum (lnum default) | **zero.slash** + ss02/ss04 "Disambiguation", cv01 alt 1, cv05 l tail, cv08 I serif, ss01 open digits | plain / plain / 8-pt (alternates via cv) | 6.011 (192) | 0.132 (0.175) | ✔ + Greek + Cyrillic | all | ✔ | 856 | 47 (73 with opsz) | 0.546 / 0.728 |
| **Geist** | 1.800 | wght 100–900, italic | Y | pnum | none (ss09 "Alt numbers") | plain / **tailed** / 11-pt; ss05 "Alt I", ss03 "Alt l" | 5.579 (178) | 0.113 (0.156) | ✔ + Cyrillic, no Greek | none (missing ₣₤₺₩₿) | ✗ | 165 | 28 | 0.530 / 0.710 |
| Manrope | 4.505 | wght 200–800, **no italic** | Y | pnum | none | plain / plain / 7-pt | 5.626 (180) | **0.060** (0.091) ⚠ | ✔ + Greek + Cyrillic | all but ₤ | ✗ | 161 | 24 | 0.540 / 0.720 |
| DM Sans | 4.004 | opsz 9–40, wght 100–1000, italic | **NO** ⚠ | none | none | plain / plain / 7-pt | 5.308 (170, proportional) | 0.114 (0.123) | ✔ | missing ₣₤₩₿ | ✗ | 234 | 36 | 0.526 / 0.700 |
| Plus Jakarta Sans | 2.071 | wght 200–800, italic | Y | pnum | none | plain / plain / 6-pt | 5.703 (183) | 0.110 (0.130) | ✔ | **all** | ✗ | 172 | 26 | 0.536 / 0.745 |
| Figtree | 2.002 | wght 300–900, italic | Y | pnum | none; ss02 "Disambiguation" | plain / plain / 12-pt | 5.645 (181) | 0.092 (0.116) | ✔ but **missing ‰ ≈** | missing ₣₤₺₽₩₿ | ✗ | 61 | 19 | 0.500 / 0.700 |
| Instrument Sans | 1.000 | wdth 75–100, wght **400–700**, italic | Y | pnum | none; ss12 "Alternate Currency" | plain / plain / 14-pt | 5.611 (180) | 0.103 (0.144) | ✔ but missing ± ≈ ≤ ≥ | missing most | ✗ | 190 | 29 | 0.510 / 0.720 |
| Onest | 2.001 | wght 100–900, no italic | Y | pnum | none | plain / plain / 10-pt | 6.193 (198) | 0.120 (0.121) | ✔ + Cyrillic | missing ₣₤₹₩₿ | ✔ | 189 | 32 | 0.527 / 0.707 |
| Outfit | 1.100 | wght 100–900, no italic | Y | pnum | none | plain / plain / 2-contour 1 | 5.659 (181) | 0.081 (0.102) | missing ‰ ≈ ≤ ≥ | missing most | ✗ | 108 | 31 | **0.460** / 0.676 |
| Public Sans | 2.001 | wght 100–900, italic | Y (0.70 em, wide) | lnum + onum | none | plain / tailed / 10-pt | 6.460 (207) | 0.077 (0.111) | missing ẞ | missing ₽₿ | ✗ | 101 | 26 | 0.517 / 0.723 |
| IBM Plex Sans | 3.201 | wdth 75–100, wght 100–**700**, italic | D (0.60 em) | lnum + onum | **zero** (ss03 slashed, ss04 dotted) | **serifed** / tailed / 12-pt | 5.605 (179) | 0.129 (0.133) | ✔ + Greek + Cyrillic | all but ₣ | ✔ | 537 | 23 (static 400) | 0.516 / 0.698 |
| Source Sans 3 | 3.052 | wght 200–900, italic | D (**0.472 em**, narrowest) | lnum + onum, smcp | **zero** (cv19 slashed, cv18 dotted) | plain (cv01 serifed) / tailed / 13-pt | **4.392 (141)** | 0.078 (0.150) | ✔ + Greek + Cyrillic | all but ₿ | ✔ | 631 | 28 (latin-ext 58) | **0.478** / 0.660 |
| Atkinson Hyperlegible Next | 2.001 | wght 200–800, italic | Y (pnum default) | — | default 0 **slashed** (3 contours) | **serifed** / **tailed** / 10-pt | 5.788 (185) | 0.130 (0.133) | ✔ Latin only | missing most | ✗ | 112 | 33 | 0.496 / 0.668 |
| Sora | 2.000 | wght 100–800, no italic | Y | — | none | plain / tailed / 7-pt | 6.160 (197) | 0.122 (0.157) | ✔ Latin only | missing most | ✗ | 109 | 32 | 0.534 / 0.730 |
| Urbanist | 1.303 | wght 100–900, italic | **NO** | — | none | plain / plain / 6-pt | 4.657 (149, proportional) | 0.080 (0.056) | **missing ł Ł** | missing most | ✗ | 83 | 27 | 0.500 / 0.700 |
| Lexend | 1.007 | wght 100–900, no italic | **NO** | — | zero (zero.zero) | serifed / plain / 2-contour 1 | 5.287 (169, proportional) | 0.150 (0.179) | ✔ | all but ₿ | ✗ | 172 | 38 | 0.525 / 0.700 |
| Hanken Grotesk | 3.013 | wght 100–900, italic | D (0.56 em) | — | none | plain / tailed / 12-pt | 5.220 (167) | 0.116 (0.154) | ✔ Latin (Cyrillic test glyphs missing despite `cyrillic-ext` subset) | missing most | ✗ | 130 | 33 | 0.493 / 0.697 |
| Schibsted Grotesk | 1.100 | wght **400–900**, italic | Y | — | zero (zero.zero) | serifed / tailed / 12-pt | 6.627 (212, widest) | **0.148** (0.156) | ✔ (+ some Greek) | all but ₣₤ | ✗ | 172 | 45 | 0.527 / 0.703 |
| Bricolage Grotesque (display) | 1.001 | opsz 12–96, wdth 75–100, wght 200–800, no italic; **default instance = opsz 96 / wght 800** ⚠ | Y | lnum + onum | none | plain / plain / 9-pt | 5.382 (172) | 0.181 (0.129) | ✔ | all but ₣ | ✔ | 399 | 40 | 0.528 / 0.660 |
| Fraunces (display serif) | 1.000 | opsz 9–144, wght 100–900, SOFT, WONK, italic; **default instance = wght 900** ⚠ | **NO** | — | none | serifed / serifed / serifed | 6.042 (193, proportional) | 0.243 (0.203) | ✔ | all but ₿ | ✗ | 352 | 35 | 0.482 / 0.700 |
| Newsreader (text/display serif) | 1.003 | opsz 6–72, wght 200–800, italic | Y (tabular default 0.55 em) | — | none | serifed / tailed / 12-pt | 5.072 (162) | 0.119 (0.175) | ✔ | all but ₿ | ✗ | 441 | 56 | **0.426** / 0.670 |
| Instrument Serif (display) | 1.000 (static) | 400 + italic only | **NO** | — | none | serifed / serifed / serifed | 3.713 (119, proportional) | 0.105 (0.163) | ✔ (missing ± ≈ ≤ ≥) | missing most | ✗ | 68 (static) | 21 | 0.510 / 0.720 |
| Geist Mono (mono) | 1.701 | wght 100–900, italic | D (0.60 em) | — | **default 0 slashed** (ss09 un-slashes), ss11 coding ligatures | serifed / tailed / 2-contour 1 | 6.600 (211) | 0.122 (0.162) | ✔ + Cyrillic | missing ₣₤₺₩₿ | ✗ | 168 | 22 | 0.530 / 0.710 |
| Atkinson Hyperlegible Mono (mono) | 2.001 | wght 200–800, italic | D (0.632 em) | — | zero → zero.zero; default 0 already 3-contour | serifed / tailed / 14-pt | 6.952 (222) | 0.104 (0.138) | ✔ Latin only | missing most | ✗ | 53 | 17 | 0.496 / 0.668 |
| Switzer (Fontshare, FFL) | 1.200 | wght 100–900 (variable), italic separate | D (0.576 em) | — | none; no `case`, no `tnum` | plain / plain / 2-contour 1 | 5.264 (168) | 0.108 (0.165) | ✔ Latin only (missing ẞ) | missing most | ✗ | 141 (**unhinted**, no `prep`) | n/a (conversion forbidden) | 0.531 / 0.750 |

Sources for the whole table: `https://raw.githubusercontent.com/google/fonts/main/ofl/<family>/METADATA.pb` and the TTFs listed there (fetched 2026-10-02); fontTools analysis script in the session scratchpad; woff2 sizes from `@fontsource-variable/*@5.3.0` tarballs; Switzer from a vendored copy at `github.com/Tez-cyber/new-portfolio` (medium reliability — could be an older Fontshare build). All FACT unless marked.

Hinting/rendering notes (FACT from tables): every `google/fonts` TTF carries a `prep` table and a `gasp` table (`65535 → 15`, i.e. grid-fit + grayscale + ClearType symmetric smoothing at all sizes), i.e. they are auto-hinted TrueType builds, which is what Android (FreeType) and Windows benefit from; iOS/macOS ignore TrueType instructions. The upstream `inter-ui` `InterVariable.woff2` is **unhinted** (no `prep`, no `gasp`), fine for web on Apple devices, slightly less crisp on Windows — use the hinted `google/fonts`/Fontsource build for web if Windows crispness matters. IBM Plex Sans additionally has `fpgm/cvt` (manual hinting) and a `gasp` range `9 → 10` (no grid-fitting below 10 ppem). Switzer (Fontshare) ships without hinting instructions.

Vertical metrics (FACT): Plus Jakarta Sans (`win` 1.652 vs `typo` 1.26), Lexend (1.59 vs 1.25), Bricolage (1.56 vs 1.20), Onest (1.546 vs 1.275), Sora (1.54 vs 1.26), Inter GF build (1.43 vs 1.21) have `usWinAscent/Descent` much larger than typo metrics; `USE_TYPO_METRICS` is set in all, but Android's `includeFontPadding` and some RN layouts still use `hhea`/`win` values → set explicit `lineHeight` on every text style and `includeFontPadding: false` on Android (RN prop exists — FACT, text-style-props.md) to avoid platform-dependent row heights.

---

## 5. What fintechs use (verify before relying on any of this)

| Brand | Claim | Status | Source / how to verify |
|---|---|---|---|
| Revolut | Display "Aeonik Pro" (weights 500, huge negative tracking); body/UI **Inter**; Arial fallback in some buttons | HYPOTHESIS (third-party automated site audit, not first-party) | `yc-software/qm` templates/revolut.md (low). Verify: inspect `revolut.com` CSS `@font-face` names and the iOS app bundle fonts. |
| Wise | Display "Wise Sans" (proprietary, weight 900, line-height 0.85, `calt`); body/UI **Inter** (600 as default body weight) | HYPOTHESIS (same audit set) | `yc-software/qm` templates/wise.md (low-medium). Verify as above. |
| Coinbase | Proprietary four-font system: CoinbaseDisplay / CoinbaseSans / CoinbaseText / CoinbaseIcons | HYPOTHESIS | templates/coinbase.md (low) |
| Stripe | Proprietary faces; audit substitutes Source Sans 3 / Source Code Pro. Training knowledge says Stripe's current UI face is **Söhne** (Klim). | ASSUMPTION (low) | Inspect stripe.com `@font-face`. |
| N26 | "Instrument"? | **UNKNOWN** — no evidence retrievable. Training memory suggests N26 uses a custom/licensed grotesque, not Instrument Sans. | Inspect n26.com CSS; check App Store screenshots. |
| Klarna | Custom "Klarna Text/Display" | ASSUMPTION (low) | Inspect klarna.com CSS. |
| Monzo | "Inter"? | **UNKNOWN** | Inspect monzo.com CSS / app bundle. |
| Satispay (IT) | — | **UNKNOWN** | Inspect satispay.com CSS; app bundle. |
| Monarch, Copilot ("Inter"?), YNAB ("Figtree"?) | — | **UNKNOWN** (YNAB/Figtree plausible but unverified) | Inspect each web app's CSS. |
| Söhne usage by competitors | OpenAI/ChatGPT (high confidence), Stripe (medium) | ASSUMPTION | Inspect CSS. |

Takeaway even at low reliability: **Inter is the de-facto body face of at least two European neobanks** per these audits, so using Inter buys zero differentiation; Aeonik, Circular and Euclid Circular are category clichés to avoid for a "premium calm" brand that wants to look like itself.

---

## 6. Shortlist

### 6.1 Five primary candidates (UI, body, amounts)

| # | Family | Pros for `€ 12.438,72` / `-€1.234,56` | Cons | Fit for "calm premium" |
|---|---|---|---|---|
| 1 | **Geist Sans** (OFL) | `tnum` (0.60 em, compact: 178 px @32 px), tailed `l`, ss05 alt `I`, deep/tall comma (0.269 em, depth 0.156) clearly distinct from the 0.113 em period → `12.438,72` reads unambiguously; weights 100–900 + italics; 28 KB Latin woff2; `next/font` package; hinted GF build; Expo package | No slashed zero (irrelevant inside amounts, matters for IBANs — use Geist Mono); no Greek; missing ₺ ₩ ₿ ₣ ₤ (₿ matters if crypto balances are shown — fallback font will render it); missing U+202F (fr-FR thousands separator → replace with U+00A0 in the formatter); Vercel/dev-tool association | High: neutral Swiss-grotesque with warmth; less "SaaS default" than Inter |
| 2 | **Inter 4.1** (OFL) | Richest numeral toolkit (tnum, slashed zero, open digits, alt 1, disambiguation sets), opsz axis incl. Display cut, complete European + Greek + Cyrillic + all currency glyphs + U+202F/U+2007; mature hinting; everywhere (Expo, Fontsource, inter-ui, next/font/google) | Widest amounts (192 px @32 px, +8 % vs Geist); biggest files (47–73 KB Latin woff2; 334 KB per static TTF on native); body face of Wise/Revolut (low differentiation); GF build lags upstream (4.0 vs 4.1) | Medium: perfectly competent, visually generic |
| 3 | **Atkinson Hyperlegible Next** (OFL) | Best raw legibility: serifed I, tailed l, slashed 0 by default, tnum; large period (0.130 em); 200–800 + italics; 33 KB; OFL confirmed 2025 | Latin only; missing extra currency glyphs; the "accessibility font" look is utilitarian rather than premium; pnum default → must set tnum everywhere | Medium-low for premium, high for accessibility-led positioning |
| 4 | **Source Sans 3** (OFL) | Most compact amounts (141 px @32 px), tabular by default, slashed/dotted zero options, small caps, 2 478 glyphs incl. Greek/Cyrillic, U+202F; 200–900 + italics; hinted | Low x-height (0.478) → needs +1 px vs Geist for equal apparent size; small period (0.078 em) → thousands point weak at 12–14 px; reads as "Adobe/neutral", slightly dated | Medium |
| 5 | **IBM Plex Sans** (OFL) | Tabular by default (0.60 em), slashed and dotted zero, lnum/onum, serifed I + tailed l, wdth axis, Greek/Cyrillic, U+202F; big period (0.129 em) | Max weight 700; 537 KB variable TTF (static per-weight cuts fine); strong IBM/engineering flavour; fewer "friendly" cues | Medium-high (serious, trustworthy) |

Near-misses: **Plus Jakarta Sans** (all currency glyphs, tnum, friendly; but plain I/l, very wide €, win-metrics inflation on Android) and **Hanken Grotesk** (tabular default, compact, neutral; plain I; Latin-centric). **Rejected for amounts:** Manrope (0.060 em period — in a 14 px row the thousands point is < 1 px; also no italics), DM Sans (no tnum in GF build — doubt: upstream may differ, verify), Urbanist, Lexend, Outfit (x-height 0.46 and missing ‰/≈ — display only), Public Sans (0.70 em tabular digits are the widest, € narrower than digits).

### 6.2 Three display candidates

| Family | Pros | Cons | Use |
|---|---|---|---|
| **Newsreader** (OFL, serif) | opsz 6–72 so it holds up from 18 px to hero sizes, tabular figures by default (hero amounts possible), 200–800 + italics, calm editorial "private-bank" tone | 56 KB Latin woff2; x-height 0.426 → nothing below 18 px; serif digits in a sans UI must be used sparingly | Marketing headlines, landing hero amount, quarterly report covers |
| **Instrument Serif** (OFL, serif) | Single 21 KB style + italic, very elegant and currently fashionable, pairs with Instrument Sans/Geist | No weights, **no tabular figures**, no ± ≈ ≤ ≥ | Marketing headlines only, never numbers |
| **Bricolage Grotesque** (OFL, grotesque) | opsz 12–96 + wdth + wght, tnum, lnum/onum, large period (0.181 em), strong character | Default instance is opsz 96 / wght 800 (static instancing must pin axes); no italics; personality may fight "calm" | Campaign/marketing headlines if the brand wants more edge |

Inter Display (OFL, free) is the display option if Inter is chosen as primary — then no second family is needed.

---

## 7. Recommendation

1. **Primary (UI, body, all amounts): Geist Sans**, static cuts (`@expo-google-fonts/geist` 400/500/600/700 + italics where needed) on native under Expo SDK 57; `Geist-Variable.woff2` via `geist/font/sans` (Next.js) on web; switch native to the variable file when SDK 58 is adopted. Enable `fontVariant: ['tabular-nums']` / `font-variant-numeric: tabular-nums` on every amount, column and timer; enable `ss05` (alt I) globally only after a visual check. Fallback stack: `Geist, 'Geist Fallback', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`. **Decision quality:** this is a recommendation from measured data, not from a rendered specimen; before freezing, render the two reference amounts at 12/14/16/20/32/48 px on an iPhone (iOS 17+), a mid-range Android (FreeType) and Windows Chrome, next to Inter and Plex, and pick on screen. If the team prefers maximum coverage/features over differentiation, pick **Inter 4.1** instead (self-host `inter-ui` on web; `@expo-google-fonts/inter` on native) — nothing else changes in this document.
2. **Display (optional, web/marketing only): Newsreader** 500–600 for headlines and hero amounts, italics for emphasis; never inside the mobile app's transactional screens. Skip entirely for MVP if the design team wants a single-family system — Geist at 600 with −2 % tracking is a good display.
3. **Mono/data face: optional, Geist Mono** at 100 % of body size for IBAN, BIC, transaction IDs, OTP codes (slashed 0, tailed l, serifed I by default). Not for amounts: tabular figures in Geist Sans already align columns, and a monospace amount is 18 % wider (211 vs 178 px) and looks like a terminal.
4. **Budget: €0** in font licences. Keep the option to commission a custom display wordmark later.

---

## 8. Proposed type scale (Geist Sans metrics: cap-height 0.71 em, x-height 0.53 em, native line-height 1.30)

Letter-spacing is given in em for web and converted to px for RN (RN `letterSpacing` is in logical px). Line-heights are absolute px (set them explicitly on every style; see vertical-metrics note). Weights 400/500/600 only in UI; 700 reserved for a few labels; never 300 for text.

| Token | Mobile (RN, dp) | Web (px) | Weight | Tracking | Numerals | Notes |
|---|---|---|---|---|---|---|
| Display | 40 / 44 | 56 / 60 (md), 72 / 76 (lg) | 600 (Geist) or Newsreader 500 | −0.02 em (RN −0.8) | tnum if numeric | Marketing/hero; `dynamicTypeRamp: 'largeTitle'` |
| H1 | 32 / 38 | 40 / 46 | 600 | −0.015 em (RN −0.5) | — | Screen titles; `largeTitle` ramp |
| H2 | 26 / 32 | 32 / 38 | 600 | −0.01 em (RN −0.3) | — | Section titles; `title1` |
| H3 | 22 / 28 | 24 / 30 | 600 | −0.005 em | — | Card titles; `title2` |
| Title | 18 / 24 | 18 / 26 | 600 | 0 | — | Row titles; `headline` |
| Body | 16 / 24 | 16 / 24 (17 / 26 for long reads) | 400 | 0 | pnum | `body` ramp; max line length 60–70 chars on web |
| Body Small | 14 / 20 | 14 / 20 | 400 | 0 | pnum | Secondary text; `subheadline` |
| Label | 13 / 16 | 13 / 18 | 500 | +0.01 em; uppercase labels +0.06 em (RN +0.8) | tnum | Buttons, chips, table headers; `footnote` |
| Caption | 12 / 16 | 12 / 16 | 400 | +0.01 em | tnum | Dates, meta; never below 12; `caption1` |
| Amount Large | 40 / 44 (balance) | 48 / 52 | 600 | −0.02 em (RN −0.8) | **tnum**, decimals at 60 % size weight 500 baseline-aligned, `€` at 70 % size | `maxFontSizeMultiplier: 1.5`, `adjustsFontSizeToFit` with `minimumFontScale 0.7` for 9-digit balances |
| Amount Medium | 20 / 24 | 22 / 28 | 600 | −0.01 em (RN −0.2) | **tnum** | Transaction detail, card totals |
| Amount Small (rows) | 16 / 24 | 16 / 24 | 500 | 0 | **tnum**, right-aligned | Transaction list; negative in text colour + sign, positive in accent; never colour-only |

Rules: tracking tightens only above 20 px; body and smaller use 0 or positive tracking; tabular numerals in every table/list cell and every animated counter; `includeFontPadding: false` on Android; `allowFontScaling` stays `true` everywhere with per-style `maxFontSizeMultiplier` (1.3 for Display/H1, 1.5 for amounts, 2.0 for body). Web: `font-size-adjust` is not needed if Geist is the only face; set `font-feature-settings: "tnum"` only on number containers, not globally (it changes width of digits inside prose).

---

## 9. Incorrect-usage risks (checklist)

| Risk | Why it matters | Mitigation |
|---|---|---|
| Proportional digits in lists/tables | Decimal commas don't align; animated counters jitter | `tabular-nums` on every numeric element; lint rule for `Amount` components |
| Forgetting that `@expo-google-fonts` cuts are full-glyph (334 KB each for Inter, 89 KB for Geist) | App bundle grows by weight × style; cold start | Ship only 400/500/600 (+ one italic); subset via fontTools (OFL allows; FFL does not) |
| Using `useFonts` instead of the config plugin on native | Fonts load after first render → layout shift | Embed via `expo-font` config plugin; `useFonts` only on web |
| Loading a variable TTF on Android < 10 or Expo SDK 57 | Renders default weight + synthetic bold | Static instances until SDK 58; test on API 28 device |
| Fonts with default instance ≠ Regular (Bricolage opsz 96/wght 800; Fraunces wght 900; Outfit wght 100; Public Sans wght 100; DM Sans opsz 9; Figtree wght 300) | Platform ignoring axes shows the wrong cut | Pin axes when instancing; never load those variable TTFs raw on native |
| Weight 300/200 for body or amounts | Fails contrast at small sizes; thin strokes blur on Android | UI uses 400–600 only |
| Mixing two neo-grotesques (e.g. Geist + Inter) | Looks like a bug | One sans; optional serif for display only |
| Letter-spacing in RN given in em-like numbers | RN `letterSpacing` is px; copying "−0.02" from CSS does nothing | Convert per size (−0.02 em × 40 px = −0.8) |
| Relying on `win` metrics / `includeFontPadding` | Android rows taller than iOS; baseline drift | Explicit `lineHeight`; `includeFontPadding: false` |
| `font-feature-settings` globally on web | Overrides `font-variant-*`, breaks kerning in some browsers | Prefer `font-variant-numeric: tabular-nums` scoped to numbers |
| Formatting with hyphen-minus vs minus | `-€1.234,56` with U+002D looks like a dash; U+2212 is wider and matches `+` | Display with U+2212 (all candidates have it); keep U+002D in inputs, CSV, clipboard |
| Colour-only sign for income/expense | WCAG 1.4.1; colour-blind users | Always print the sign; optional icon |
| Fontshare fonts in the monorepo | FFL v2.0 forbids subsetting, format conversion, redistribution via repositories, handing to contractors; licence is terminable | Avoid; if ever used, pull from fontshare at build time, never commit |
| PP Neue Montreal "free" download | Personal use only (ASSUMPTION) | Buy a licence or do not use |
| Using Inter from Google Fonts for web | GF build is 4.001; upstream is 4.1 | Self-host `inter-ui` if Inter is chosen |
| Greek/Cyrillic markets with Geist | Greek missing → system fallback mixes faces | Add a per-script fallback (Inter or Noto Sans) in the stack, or choose Inter |
| French formatting with Geist | U+202F missing → fallback glyph width mismatch | Formatter replaces U+202F with U+00A0 |
| Display serif used for amounts in the app | Serif digits + tabular alignment OK in Newsreader but no slashed zero, lower contrast at 14 px | Serif only ≥ 24 px, web/marketing |

---

## 10. Number formatting rules — Italian locale and other EU locales

### 10.1 What `Intl.NumberFormat` produces (FACT — Node v22.22.0, ICU 77.1, CLDR 47, run 2026-10-02; browsers with current ICU should match, Safari/JavaScriptCore and Hermes may differ — verify on device)

Options: `{style:'currency', currency:'EUR'}` unless stated. Characters: `␣` = U+00A0 no-break space, `⍽` = U+202F narrow no-break space, `’` = U+2019.

| Locale | 12438.72 | −1234.56 | `currencySign:'accounting'` | `currencyDisplay:'code'` | CHF 1234.56 | GBP 1234.56 | Decimal 1 234 567.891 | Percent 0.1234 |
|---|---|---|---|---|---|---|---|---|
| **it-IT** | `12.438,72␣€` | `-1234,56␣€` ⚠ | `-1234,56␣€` | `1234,56␣EUR` | `1234,56␣CHF` | `1234,56␣£` | `1.234.567,89` | `12,3%` |
| it-CH | `€-1234.56` (no group for 4 digits; `.` decimal) | — | — | — | `CHF-1234.56` | — | — | — |
| de-DE | `12.438,72␣€` | `-1.234,56␣€` | `-1.234,56␣€` | `1.234,56␣EUR` | `1.234,56␣CHF` | `1.234,56␣£` | `1.234.567,89` | `12,3␣%` |
| de-AT | `€␣12.438,72` | `-€␣1.234,56` | same | `EUR␣1.234,56` | `CHF␣1.234,56` | `£␣1.234,56` | `1␣234␣567,89` | `12,3␣%` |
| de-CH | `EUR␣12’438.72` | `EUR-1’234.56` | same | `EUR␣1’234.56` | `CHF␣1’234.56` | `£␣1’234.56` | `1’234’567.89` | `12.3%` |
| fr-FR | `12⍽438,72␣€` | `-1⍽234,56␣€` | `(1⍽234,56␣€)` | `1⍽234,56␣EUR` | `1⍽234,56␣CHF` | `1⍽234,56␣£GB` | `1⍽234⍽567,89` | `12,3␣%` |
| fr-CH | `12⍽438.72␣€` | `-1⍽234.56␣€` | `(…)` | — | `1⍽234.56␣CHF` | — | `1⍽234⍽567,89` | `12,3%` |
| es-ES | `12.438,72␣€` | `-1234,56␣€` ⚠ | `-1234,56␣€` | `1234,56␣EUR` | `1234,56␣CHF` | `1234,56␣GBP` | `1.234.567,89` | `12,3␣%` |
| nl-NL / nl-BE | `€␣12.438,72` | `€␣-1.234,56` | `(€␣1.234,56)` | `EUR␣1.234,56` | `CHF␣1.234,56` | `£␣1.234,56` | `1.234.567,89` | `12,3%` |
| pt-PT | `12⍽438,72␣€` | `-1234,56␣€` ⚠ | `(1234,56␣€)` | `1234,56␣EUR` | — | `1234,56␣£` | `1⍽234⍽567,89` | `12,3%` |
| en-IE / en-GB | `€12,438.72` | `-€1,234.56` | `(€1,234.56)` | `EUR␣1,234.56` | `CHF␣1,234.56` | `£1,234.56` | `1,234,567.89` | `12.3%` |
| pl-PL | `12⍽438,72␣€` | `-1234,56␣€` ⚠ | `(1234,56␣€)` | — | — | `1234,56␣GBP` | `1⍽234⍽567,89` | `12,3%` |
| sv-SE / fi-FI | `12⍽438,72␣€` | `−1⍽234,56␣€` (U+2212!) | same | — | — | `1⍽234,56␣GBP` / `£` | `1⍽234⍽567,89` | `12,3␣%` |
| da-DK / el-GR | `12.438,72␣€` | `-1.234,56␣€` | same | — | — | `1.234,56␣£` | `1.234.567,89` | `12,3␣%` / `12,3%` |
| cs-CZ | `12⍽438,72␣€` | `-1⍽234,56␣€` | same | — | — | `1⍽234,56␣£` | `1⍽234⍽567,89` | `12,3␣%` |
| hu-HU / ro-RO | `12⍽438,72␣EUR` / `12.438,72␣EUR` (code, no symbol) | `-1234,56␣EUR` / `-1.234,56␣EUR` | — | — | — | — | — | — |

`formatToParts` for it-IT −1234.56: `minusSign "-"`, `integer "1234"`, `decimal ","`, `fraction "56"`, `literal " "`, `currency "€"`. Code points of `"-1234,56 €"`: `2d 31 32 33 34 2c 35 36 a0 20ac`.

Other it-IT facts: `signDisplay:'always'` → `+1234,56 €`; `signDisplay:'exceptZero'` on 0 → `0,00 €`; `notation:'compact'` → `1,2 Mln €`; `currencyDisplay:'narrowSymbol'` → same `€`; `currencyDisplay:'name'` → `1234,56 euro`; `maximumFractionDigits:0` → `12.439 €`; `useGrouping:'always'` → `1.234,50 €` and `1.234.567,50 €`; `Intl.DateTimeFormat('it-IT',{dateStyle:'medium'})` → `2 ott 2026`, default → `2/10/2026`.

### 10.2 Why four-digit amounts lose the separator (FACT)

CLDR `it.xml` sets `<minimumGroupingDigits>2</minimumGroupingDigits>` (also `es.xml`; root/de/fr/nl inherit 1), and `<currencyFormat> <pattern>#,##0.00 ¤</pattern>` (symbol after, space before). `de_AT.xml` and `nl.xml` use `¤ #,##0.00` (symbol first), `de_CH.xml` uses `¤ #,##0.00;¤-#,##0.00` with `'` as group separator and `.` decimal. Source: https://raw.githubusercontent.com/unicode-org/cldr/main/common/main/{it,es,de_AT,de_CH,nl,fr,root}.xml (high).

### 10.3 What Italian banks and fintechs display (UNKNOWN / HYPOTHESIS)

Bank and fintech sites were unreachable. From training knowledge (**HYPOTHESIS, low reliability**): Italian bank statements and most banking apps print the thousands separator from 1.000 upwards (`1.234,56`), and both `€ 1.234,56` (symbol first, e.g. many app balance headers and card UIs) and `1.234,56 €` (CLDR/typographic convention, print, invoices) are common; the symbol-first form dominates in compact mobile UI. How to verify: capture screenshots of the transaction lists of Intesa Sanpaolo, UniCredit, Fineco, Hype, Satispay, Revolut IT, N26 IT and tally symbol position, separator behaviour for 1 000–9 999, sign placement and decimal styling; log in `docs/research/raw/amount-display-survey.md`.

### 10.4 Rules for Lilleri (recommendation)

1. **Canonical Italian display:** thousands `.`, decimals `,`, always two decimals, grouping from 1.000 (`useGrouping: 'always'`), sign before the number, currency symbol per locale rule but **consistent within a screen**. Default to the CLDR order for prose and exports (`12.438,72 €`), and allow a `symbolFirst` variant (`€ 12.438,72`) for amount columns and balance headers once the user survey in 10.3 confirms it reads more naturally; never mix the two in one list. Separate symbol and number with U+00A0 (never a breaking space).
2. **Negative amounts:** `-1.234,56 €` / `-€ 1.234,56` (sign before everything), rendered with U+2212 for display, U+002D in inputs/exports; never parentheses in it-IT (accounting style is used by fr/nl/pt/en but not it/de); never red-only.
3. **Positive sign** only on deltas/budget variance (`signDisplay:'exceptZero'`), not on balances.
4. **Compact amounts** (`1,2 Mln €`) only in charts; never for balances.
5. **Decimal styling:** decimals may be reduced to 60 % size at Amount Large, never hidden; cents always present for money (`maximumFractionDigits: 2`), percentages one decimal (`12,3%` without space in it-IT; `12,3 %` with NBSP in de/fr).
6. **Multi-currency:** symbol for EUR/GBP/USD/CHF per locale table (CHF is always the ISO code `CHF`, before the number in de-CH, after in it-IT); ISO code for anything else; `currencyDisplay:'code'` fallback when the font lacks the glyph (Geist lacks ₺ ₩ ₿ ₣ ₤).
7. **Implementation:** a shared `@lilleri/money` package with a pure formatter driven by a pinned, hand-reviewed table (locale → group/decimal/pattern/minimumGroupingDigits/space characters) for it, it-CH, de, de-AT, de-CH, fr, fr-CH, es, nl, pt, en-IE, pl, sv, fi, da, cs, el; unit tests assert equality with Node ICU output for all cases above except the deliberate deviations (grouping-always, U+2212, symbol-first variant). Rationale: Hermes iOS lacks `formatToParts` and `signDisplay`, platform ICU versions differ, and backend PDFs/CSV must match the app byte-for-byte. Replace U+202F with U+00A0 in fr output when the font lacks U+202F.
8. **Inputs:** accept both `,` and `.` as decimal on Italian keyboards (iOS numeric pad shows `,` for it-IT), strip thousands separators, store integer cents.

---

## 11. Accessibility notes

| Topic | Rule | Status / source |
|---|---|---|
| Contrast | Text ≥ 4.5:1; large text (≥ 18 pt ≈ 24 px regular, or ≥ 14 pt ≈ 18.66 px bold) ≥ 3:1; ratios are not rounded (4.499:1 fails); non-text UI parts 3:1 (1.4.11). | FACT — https://raw.githubusercontent.com/w3c/wcag/main/understanding/20/contrast-minimum.html (high) |
| Text resize | Content must remain usable at 200 % text scaling (1.4.4). | FACT — https://raw.githubusercontent.com/w3c/wcag/main/understanding/20/resize-text.html (high) |
| Dynamic Type (RN) | `allowFontScaling` default `true`; cap with `maxFontSizeMultiplier` per style (never 0/none on amounts); map styles to `dynamicTypeRamp` on iOS so the OS ramp is honoured; test at the largest accessibility size with `adjustsFontSizeToFit` on balances. | FACT — RN text.md (high) |
| Minimum sizes | 12 px/sp smallest UI text; 11 pt is the iOS HIG floor and 12 sp Material's; amounts in lists ≥ 16. | ASSUMPTION (platform guidelines not fetchable; widely documented) |
| Weight | ≥ 400 for text ≤ 16 px; thin weights fail contrast on low-DPI Android. | ASSUMPTION (typographic practice) |
| Glyph disambiguation | Choose a face whose `l` has a tail and whose `I` is distinct (Geist tailed l; enable ss05), slashed 0 in codes (Geist Mono / Inter `zero`). | FACT (measured) |
| Decimal comma visibility | Period/comma glyphs ≥ 0.10 em tall (Geist 0.113, Inter 0.132, Plex 0.129; Manrope 0.060 and Public Sans 0.077 fail at 12–14 px). | FACT (measured) |
| Colour independence | Sign and/or label for income/expense; red/green plus icon for colour-blind users. | WCAG 1.4.1 (ASSUMPTION of exact text; principle FACT) |
| Screen readers | Use U+00A0 between number and symbol so VoiceOver/TalkBack read one amount; provide `accessibilityLabel` with the long form (`1.234,56 euro`) via `currencyDisplay:'name'`. | HYPOTHESIS (verify with VoiceOver on it-IT) |
| Motion | Respect reduced-motion for counting animations; tabular figures avoid layout jitter during animation. | ASSUMPTION |
| Line length / spacing | 45–75 characters per line for body on web; line-height ≥ 1.4 for body (1.5 recommended), ≥ 1.1 for display. | ASSUMPTION (WCAG 1.4.12 text-spacing test expects 1.5 line-height tolerance) |

---

## 12. Open questions

1. Rendered side-by-side specimen (Geist vs Inter vs Plex) on iOS/Android/Windows at 12–48 px — not possible in this sandbox.
2. Italian user expectation for symbol position (`€ 1.234,56` vs `1.234,56 €`) and separator from 1.000 — needs the bank/fintech screenshot survey.
3. Expo SDK 58 GA date and real-device behaviour of variable Geist on Android 10–14 and iOS named instances.
4. Hermes `Intl` status in RN 0.87/0.88 (the Hermes doc may predate improvements).
5. Whether upstream DM Sans has `tnum` (GF v4.004 build has none).
6. Commercial price quotes if a bespoke/commercial display face is ever wanted.
7. First-party confirmation of competitor typefaces (Revolut, N26, Wise, Satispay, Monzo, Klarna).

---

## Sources

| # | Source | URL | Pub. date (if visible) | Verified | Reliability | Used for |
|---|---|---|---|---|---|---|
| 1 | google/fonts METADATA.pb for 24 families | https://raw.githubusercontent.com/google/fonts/main/ofl/{inter,geist,geistmono,manrope,dmsans,plusjakartasans,figtree,instrumentsans,onest,outfit,publicsans,ibmplexsans,sourcesans3,atkinsonhyperlegiblenext,atkinsonhyperlegiblemono,sora,urbanist,lexend,hankengrotesk,schibstedgrotesk,bricolagegrotesque,fraunces,newsreader,instrumentserif}/METADATA.pb | varies (`date_added` fields) | 2026-10-02 | high | licence, designer, axes, subsets |
| 2 | google/fonts variable TTFs (filenames from #1) | same base path | — | 2026-10-02 | high | all measured OpenType/coverage/metric data (fontTools 4.66.1) |
| 3 | Inter README + LICENSE | https://raw.githubusercontent.com/rsms/inter/master/README.md , …/LICENSE.txt | — | 2026-10-02 | high | OFL, features, GF caveat, Display note |
| 4 | Geist LICENSE + next package README | https://raw.githubusercontent.com/vercel/geist-font/main/LICENSE.txt , …/packages/next/README.md | — | 2026-10-02 | high | OFL, `geist` usage |
| 5 | Atkinson Hyperlegible Next README + OFL.txt | https://raw.githubusercontent.com/googlefonts/atkinson-hyperlegible-next/main/README.md , …/OFL.txt | 20 Nov 2024 (v2.001) | 2026-10-02 | high | 2025 licence check |
| 6 | IBM Plex LICENSE | https://raw.githubusercontent.com/IBM/plex/master/LICENSE.txt | — | 2026-10-02 | high | OFL + RFN |
| 7 | ITF Free Font License v2.0 (mirrors) | https://raw.githubusercontent.com/Mixar-AI/mixar-app/main/LICENSES/LicenseRef-ITF-FFL.txt ; https://raw.githubusercontent.com/pc-style/x-md/main/docs-assets/fonts/LICENSE-Satoshi.txt | 17 Aug 2026 | 2026-10-02 | medium-high (mirrors) | Fontshare terms |
| 8 | Switzer-Variable.ttf (vendored) | https://raw.githubusercontent.com/Tez-cyber/new-portfolio/master/src/app/fonts/switzer/fonts/Switzer-Variable.ttf | — | 2026-10-02 | medium | Fontshare font analysis |
| 9 | expo/google-fonts README | https://raw.githubusercontent.com/expo/google-fonts/main/README.md | — | 2026-10-02 | high | package model, licensing FAQ |
| 10 | Expo fonts guide (SDK 57 branch) | https://raw.githubusercontent.com/expo/expo/sdk-57/docs/pages/develop/user-interface/fonts.mdx | — | 2026-10-02 | high | variable-font support today |
| 11 | Expo fonts guide (main branch) | https://raw.githubusercontent.com/expo/expo/main/docs/pages/develop/user-interface/fonts.mdx | — | 2026-10-02 | high (unreleased SDK) | SDK 58 variable fonts, config plugin formats |
| 12 | Context7 /websites/expo_dev | expo-font / fonts pages | — | 2026-10-02 | high | useFonts, config plugin |
| 13 | React Native Text style props | https://raw.githubusercontent.com/facebook/react-native-website/main/docs/text-style-props.md | — | 2026-10-02 | high | fontVariant, fontVariationSettings, includeFontPadding |
| 14 | React Native Text props | https://raw.githubusercontent.com/facebook/react-native-website/main/docs/text.md | — | 2026-10-02 | high | Dynamic Type props |
| 15 | Hermes Intl APIs | https://raw.githubusercontent.com/facebook/hermes/main/doc/IntlAPIs.md | ECMA-402 7th ed. reference (2020) | 2026-10-02 | medium | Intl limitations on iOS/Android |
| 16 | CLDR locale data | https://raw.githubusercontent.com/unicode-org/cldr/main/common/main/{it,es,fr,nl,de,de_AT,de_CH,root}.xml | — | 2026-10-02 | high | patterns, minimumGroupingDigits |
| 17 | Node.js Intl run | local `node v22.22.0` (ICU 77.1, CLDR 47) | — | 2026-10-02 | high | all `Intl.NumberFormat` outputs |
| 18 | npm registry | `npm view` for expo, expo-font, react-native, next, geist, inter-ui, @expo-google-fonts/*, @fontsource-variable/* | publish dates in output | 2026-10-02 | high | versions, dates, package contents |
| 19 | Google Fonts CSS API | https://fonts.googleapis.com/css2?family=… | — | 2026-10-02 | high | served versions (Inter v20), subsets, axes |
| 20 | WCAG Understanding 1.4.3 / 1.4.4 | https://raw.githubusercontent.com/w3c/wcag/main/understanding/20/contrast-minimum.html , …/resize-text.html | — | 2026-10-02 | high | contrast, resize |
| 21 | Third-party brand audits (Revolut, Wise, Coinbase, Stripe) | https://raw.githubusercontent.com/yc-software/qm/main/skills-seed/popular-web-designs/templates/{revolut,wise,coinbase,stripe}.md | — | 2026-10-02 | low | fintech typeface hypotheses |
| 22 | Training knowledge | — | ≤ 2026-06 | — | low | commercial pricing, foundry licence shapes, Italian bank conventions (all marked ASSUMPTION/HYPOTHESIS) |
