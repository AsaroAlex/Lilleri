# Brand competitor analysis: fintech and PFM identities, the crowded parts of the wheel, and where Lilleri can stand

**Project:** LILLERI (greenfield consumer PFM, Italy-first then Europe).
**Document type:** synthesised research (polished from `docs/research/raw/brand-competitor-analysis.md`, with a web-search closing pass).
**Verification date for every claim:** 2026-10-02.
**Owner:** brand strategy / senior brand design.

## Scope note

This document answers one question: *what do the brands Lilleri will sit next to on an Italian phone look, sound and feel like, and which territories are still free?* It covers 40 brands (Italian incumbents and neobanks, EU/UK challengers, payment and BNPL brands, investing apps, PFM/budgeting apps), maps the palette and logo-shape landscape, lists the typography and illustration trends, names the clichés to avoid, and ends with a shortlist of **three colour/visual territories to explore in the identity phase**. It does **not** finalise a palette, a mark or a typeface; those are Phase 2 decisions.

**How to read the labels.** FACT = verified against a cited source on 2026-10-02; where the source is a search-engine snippet of an official page (page itself not fetched), the FACT is graded *medium*. ASSUMPTION = recollection or inference, plausible, unverified. HYPOTHESIS = belief to test with users or data. DECISION = a choice made here. UNKNOWN = could not be established; a verification route is given. Reliability: high = primary file, package or official page read directly; medium = official page seen as a snippet or reputable secondary; low = blog, dataset of unknown provenance, recollection.

## 0. Method and what changed versus the raw document

| Channel | What it gave | Reliability | Status |
|---|---|---|---|
| Primary design-system packages on npm (Wise `@transferwise/neptune-tokens` 8.26.0 and `neptune-css` 14.29.4; Revolut `@revolut/ui-kit` 14.16.2; Qonto `@qonto/login-button` 0.5.1) | Full palettes, font families and files for Wise and Revolut; Qonto's font stack, near-black and lavender accent | high | Carried over from the raw document (S2, S3, S4) |
| `simple-icons` 16.33.0 (published 2026-09-27) | One "official" hex per brand with the maintainer's source URL; monochrome SVG of the mark; hue census of 53 finance brands | medium–high | Carried over (S1, E6, E15, E17) |
| Developer documentation via Context7 (Revolut, Satispay, Klarna, Nexi, PayPal, Google Pay, Wise) | Logo-usage rules, button colours, asset names | high | Carried over (S6–S12) |
| GitHub public code (Qonto FAQ repo, payment-icon libraries, `dottxn/brandkit`, Monzo DESIGN.md files) | Corroboration and conflicts; Satispay red used by third-party icon sets | low–medium | Carried over (S15) |
| **Web search, closing pass (this document)** — 16 queries executed on 2026-10-02 (raw document had 0 of 30 attempted) | Search-engine snippets of official brand pages, agency case studies and design press for Satispay, Wise, Monzo, N26, Scalapay, Nexi, isybank, Qonto, PayPal, Robinhood, Sumeria, Hype, Revolut, Trade Republic | medium (official page quoted in a snippet; pages not fetched because WebFetch is blocked) | **New** (WB-01…WB-14 in Sources) |
| Recollection (model knowledge to mid-2026) | Logo descriptions, tone, positioning | low | Always labelled ASSUMPTION / HYPOTHESIS |

**Material changes made by the closing pass (read these first):**

| # | Raw document said | Now | Status | Source |
|---|---|---|---|---|
| C1 | Satispay is red, official hex UNKNOWN, working value `~#EF4323` | **Satispay rebranded for its tenth anniversary in May 2024 (studio Koto): primary colour is now a vivid orange `#FF3D00` (shades `#E53700`, `#B52B00`), with an aubergine `#290402` replacing black for titles and dark buttons; softer rounded intertwined symbol, softer wordmark font, claim "People Paying People".** The hue (14°) sits next to the terracotta territory proposed for Lilleri (13–14°), which changes the reading of §8 and §9. | FACT (medium: Satispay's own blog page title and four Italian trade outlets seen as snippets; hex values from a third-party design-system capture, so the exact tokens are medium-low) | WB-01 |
| C2 | Wise 2023 rebrand "by Ragged Edge" was ASSUMPTION | Confirmed: Ragged Edge (London), launched 1 March 2023 across 175 countries; green replaces "fintech blue"; Wise Sans derived from Parafina; "graphic tapestries"; Wise reports +10 % conversion and +23 % card orders after launch | FACT (medium: agency case study and Creative Review seen as snippets) | WB-02 |
| C3 | Monzo coral hex in conflict (`#FF4F40` vs `#FF5C59`) | Hot Coral `#FF4F40` (RGB 255/79/64) confirmed as the signature colour; Monzo's October 2022 "makeover" doubled down on it with an expanded palette; display face MonzoSansDisplay | FACT (medium) | WB-03 |
| C4 | N26 typeface UNKNOWN, single hex `#48AC98` | N26's 2018 rebrand: teal primary `#088177`, deep teal `#003B39`, "sand" `#C6B29F`, plus rhubarb and petrol blue; house grotesk "N26" with "N26-Extended" for display. The simple-icons hex `#48AC98` is a lighter teal and should not be used as N26's reference | FACT (medium) | WB-04 |
| C5 | Scalapay pink, hex UNKNOWN | Official brand repository: Royal Blue `#5666F0`, Azalea pink `#F7CACE`, white, Mako grey `#3A4045` | FACT (medium) | WB-05 |
| C6 | Nexi deep blue, hex UNKNOWN | Nexi blue `#2D32AA` ("Governor Bay"), with white and `#0F0F0F` | FACT (medium-low: logo-asset sites, not Nexi's own media kit) | WB-06 |
| C7 | isybank "younger, brighter identity" ASSUMPTION | isybank launched 15 June 2023; brand strategy, name, logo, CX and launch campaign by **Accenture Song**; minimalist identity with a **tricolore tail** rising from the logo; concept "digital, essential, open"; lines "Semplicemente banca" and "Quello che ti serve, quando ti serve" | FACT (medium: Intesa Sanpaolo press kit and Accenture newsroom seen as snippets) | WB-07 |
| C8 | Qonto moved to black/white "around 2021–22", agency UNKNOWN | Qonto rebranded in 2021–22 with **Koto**: black as primary, PolySans replacing Nevo, lavender (brightened from the old purple-blue) plus mint, peach and mustard pastels, four-petal emblem kept as favicon, capital "Q" | FACT (medium: Qonto's own Medium post and French design press) | WB-08 |
| C9 | PayPal 2024 rebrand by Pentagram ASSUMPTION; monogram/button colours in conflict | Pentagram (Andrea Trabucco-Campos) with PayPal's in-house team, September 2024: black wordmark in custom **PayPal Pro** (a customised LL Supreme by Lineto), monogram separated from the wordmark and de-rounded, blues kept only as accents on black/white, motion language built on payment gestures. Whether the checkout button default moved from gold to black is still UNKNOWN (SDK docs still recommend `paypal-gold`, S10) | FACT (medium: It's Nice That, Creative Review, Fast Company seen as snippets) | WB-09 |
| C10 | Robinhood 2024 rebrand by Porto Rocha ASSUMPTION | Confirmed: October 2024, Porto Rocha; black-and-white palette, simplified feather, typographic system of **Robinhood Phonic** (sans) and **Martina Plantijn** (serif headlines), technical illustration; stated goal "the right place for serious investors" | FACT (medium) | WB-10 |
| C11 | Lydia → Sumeria split 2024, Sumeria identity ASSUMPTION | Sumeria launched mid-May 2024 as Lydia's current-account brand; identity moved from Lydia's bright blue to greys and deep greens, "more mature and minimalist"; first campaign by agency Bruno (hands-only, overhead sketches) | FACT (medium) | WB-11 |
| C12 | Hype "Banca Sella group" over-simplified; merger rumoured | **HYPE was incorporated by merger into Banca Sella S.p.A. on 1 April 2026** (Sella group privacy notice and group page). Visual identity still UNKNOWN (no brand page surfaced; Instagram handle `@hypeapp`) | FACT (medium) for the merger; UNKNOWN for the identity | WB-12 |
| C13 | Revolut 2023 agency in conflict (in-house vs Pentagram) | Brand New (UnderConsideration) carries an entry "New Logo for Revolut" (2023); coverage describes it as Revolut's third brand evolution since 2015, Aeonik Pro as the new typeface, branded candid photography and expanded 3D. **Agency still UNKNOWN** — no snippet names one | FACT (medium) for the entry and typeface; UNKNOWN for the agency | WB-13 |
| C14 | Trade Republic "serif-leaning refresh possible" | A 2024 logo file exists (Wikimedia "Trade Republic Logo 2024.svg"); no evidence of a serif typeface surfaced. Downgraded to UNKNOWN; do not cite Trade Republic as a serif example | UNKNOWN | WB-14 |

Everything not listed above is carried over from the raw document with its original label.

---

## 1. Evidence ledger (hard data points, condensed)

| # | Claim | Status | Source |
|---|---|---|---|
| E1 | Revolut brand colour recorded by simple-icons is near-black `#191C1F`; ui-kit 14.16.2 sets `--rui-color-black: #191c1f`, ships `AeonikPro-Black-Capitalised.woff2` and `AeonikPro-Medium.woff2`, maps `--rui-font-brand` to Inter; user-selectable near-black "theme backgrounds" (blue 210°, deep-blue 240°, green 170°, teal 190°, orange 22°, purple 280°, holo) and accents cold-blue `#0666EB`, blue `#4F55F1`, deep-purple `#805CF5`, pink `#FF50A4`, teal `#00A87E`, lime `#CBDD00` | FACT (high) | S1, S3 |
| E2 | Wise tokens: display `Wise Sans` (Heavy), body `Inter`; personal theme forest green `#163300`, bright green `#9FE870`, ink `#0E0F0C`, positive `#054D28`, negative `#CB272F`; a legacy "navy" theme still ships the pre-2023 blue `#00B9FF` | FACT (high) | S2 |
| E3 | Qonto login button: `"PolySans", "Manrope", "Roboto"`, background `#1D1D1B`, accent `#D5C8FB`, radius 6 px; PolySans also in Qonto's own help-centre HTML | FACT (high) | S4, S15a |
| E4 | simple-icons hexes (one per brand): Wise `#9FE870`, Klarna `#FFB3C7`, N26 `#48AC98`, Monzo `#14233C`, Starling `#6935D3`, Fineco `#00549F`, PayPal `#002991`, Cash App `#00C244`, Venmo `#008CFF`, Robinhood `#CCFF00`, bunq `#3394D7`, Lydia `#0180FF`, Apple Pay `#000000`, Google Pay `#4285F4`, Nubank `#820AD1`, Stripe `#635BFF`, Coinbase `#0052FF`, Tide `#4050FB`, Zelle `#6D1ED4`, Adyen `#0ABF53`, Afterpay `#B2FCE4`, Square `#3E4348`, Actual Budget `#6B46C1` | FACT (that these are the recorded values) | S1 |
| E5 | Hue census of 53 finance brand hexes in simple-icons: blue 22 (42 %), green 6, purple 6, black/grey 5, red 4, yellow 3, lime 2, orange 2, teal 2, pink 1 | FACT (computed) | S1 |
| E6 | Satispay's online button asset is `en-pay-red.svg`; third-party icon libraries render it `#EF4323` / `#F94C43` / `#EF373F` | FACT (that these files exist); **superseded for the current identity by C1** | S7, S15b |
| E7 | PayPal 2022 datasets record two blues `#003087` + `#009CDE`; simple-icons now records `#002991` | FACT | S5, S1 |
| E8 | Google Pay mark clear space = half the height of the capital "G"; buttons black or white | FACT | S11 |
| E9 | Typography research in this repository: Inter is Wise's body face (first-party CSS); Geist Sans is the recommended Lilleri UI face; Aeonik, Circular, Euclid Circular flagged as fintech category clichés | FACT (first-party for Wise) / DECISION pending for Geist | `docs/research/raw/typography-options.md` |

---

## 2. Per-competitor identity table

Column key: **Mark / icon** = concept, not reproduction. **Type** = wordmark style and named typeface when known. **Palette** = hex when documented. **IT reach** = recognizability in Italy (HYPOTHESIS unless stated; no survey exists — see Open questions). Every cell without a source ID is ASSUMPTION.

### 2A. Italian-born and Italy-dominant brands (the home-screen neighbours)

| Brand | Mark / icon | Type | Palette | Tone & visual language | Positioning · IT reach | Rebrand 2021–26 | Status / sources |
|---|---|---|---|---|---|---|---|
| **Satispay** | Rounded intertwined symbol (two strokes looping, all corners softened) on an orange field; lowercase wordmark | Soft geometric sans (name UNKNOWN) | Orange `#FF3D00` (`#E53700`, `#B52B00`), aubergine `#290402` for text/dark UI, white | Warm, human, everyday Italian; "People Paying People"; merchant stickers everywhere | Mass-market national champion (6.5 M users, 450 k+ merchants per its own copy); IT reach: very high | **May 2024, Koto** (10th anniversary): red → orange, rounder symbol, softer type | FACT (medium) WB-01; user numbers from `competitors-italy-and-ai-first.md` W-02/W-03 |
| **Hype** (Banca Sella; merged into Banca Sella S.p.A. 1 Apr 2026) | Uppercase "HYPE" wordmark; dark app icon | Heavy sans (ASSUMPTION) | UNKNOWN | Youth, promo-driven, cashback; "Radar" spending view | Mass, under-35; IT reach: high among young adults | Identity refresh plausible around the merger — UNKNOWN | FACT (medium) for the merger WB-12; rest ASSUMPTION/UNKNOWN |
| **isybank** (Intesa Sanpaolo) | Minimal wordmark with a **tricolore tail** rising from the logo and framing messages | Clean sans (name UNKNOWN) | Dark base with green/white/red tail (exact hexes UNKNOWN) | "Digital, essential, open"; "Semplicemente banca"; "Quello che ti serve, quando ti serve" | Incumbent's digital bank for a young mass market; IT reach: high (referral promos) | Launched 15 Jun 2023, Accenture Song | FACT (medium) WB-07 |
| **Intesa Sanpaolo** | Nested arches symbol + two-word wordmark | Corporate serif/sans mix | Dark green family (hex UNKNOWN) | Institutional, cultural sponsorship, trust | Incumbent #1; universal reach; "XME Banks" aggregates other banks' accounts | — | ASSUMPTION; XME Banks FACT per `competitors-italy-and-ai-first.md` V-09 |
| **UniCredit / buddybank** | Red sphere with white diagonal + wordmark; buddybank black/white typographic | Corporate sans | Red family (hex UNKNOWN) | Institutional; buddybank "iPhone-native" minimal | Incumbent #2; universal reach | Group harmonisation plausible, UNKNOWN | ASSUMPTION |
| **Postepay / Poste Italiane** | Yellow-and-blue card brand; unified Poste app since 9 Oct 2025 | — | Yellow + blue (hexes UNKNOWN) | Popular, state-adjacent | Universal reach; 30 M+ Postepay cards | Standalone Postepay app retired into the Poste Italiane app (9 Oct 2025, low-medium) | ASSUMPTION; app merger per `competitors-italy-and-ai-first.md` Y-30/V-12 |
| **Nexi** | Lowercase "nexi" wordmark, no symbol | Geometric sans | Blue `#2D32AA`, white, `#0F0F0F` | Corporate, infrastructural, B2B-first | POS/card infrastructure name; IT reach: high as a word on receipts | Group consolidation after SIA/Nets (ASSUMPTION) | FACT (medium-low) WB-06 for the hex |
| **Scalapay** | Lowercase wordmark; pink logo variants for e-commerce | Geometric sans | Royal Blue `#5666F0`, Azalea `#F7CACE`, white, Mako `#3A4045` | Fashion/retail BNPL, pastel pink fields | Mass at checkouts; IT reach: high online | — | FACT (medium) WB-05 |
| **Fineco** | "FinecoBank" wordmark | Classic corporate sans | Blue `#00549F` | Dense trading-platform register | Mass-affluent; IT reach: high | — | S1 + ASSUMPTION |
| **Mooney** (ex SisalPay) | Lowercase rounded wordmark | Rounded sans | UNKNOWN | Proximity payments, tobacconists; warm, popular | Mass, physical network; IT reach: medium–high | SisalPay → Mooney 2020 | ASSUMPTION |
| **Moneyfarm** | Lowercase wordmark with "m" mark | Sans | UNKNOWN | Advisory, reassuring | Mass-affluent robo; IT reach: medium | — | ASSUMPTION |
| **Tinaba** (Banca Profilo) | Wordmark | Sans | UNKNOWN | Education-led ("Investiamo" channel) | Niche; IT reach: low–medium | — | ASSUMPTION |

### 2B. European and UK challengers

| Brand | Mark / icon | Type | Palette | Tone & visual language | Positioning · IT reach | Rebrand 2021–26 | Status / sources |
|---|---|---|---|---|---|---|---|
| **Revolut** | Bold "R" lettermark with a diagonal cut; white R on black icon | All-caps custom sans wordmark; **Aeonik Pro** display, Inter UI | Near-black `#191C1F` + white; many tinted near-black product themes and accents (E1) | Glossy 3D, "holo", candid photography, dense feature marketing; confident, global | Super-app with a Plus/Premium/Metal/Ultra ladder; IT reach: very high | 2023 identity (third since 2015); agency UNKNOWN | FACT (high) S1/S3; FACT (medium) WB-13 |
| **N26** | "N26" wordmark only; wordmark on teal icon | House grotesk "N26", "N26-Extended" display | Teal `#088177`, deep teal `#003B39`, sand `#C6B29F`, rhubarb, petrol blue | Minimal, white space, transparent/metal cards; calm, precise | Digital bank with You/Metal tiers; IT reach: high among digital natives | 2018 rebrand (teal replaced earlier palette) | FACT (medium) WB-04 |
| **Wise** | Merged-letterform wordmark; bright-green mark on forest green | **Wise Sans** (Parafina-derived) display; Inter body | Forest `#163300`, bright `#9FE870`, ink `#0E0F0C` | Bold flat illustration, "tapestries", big type; "money without borders" | International money; IT reach: medium–high | **1 Mar 2023, Ragged Edge**; blue → green | FACT (high) S2; FACT (medium) WB-02 |
| **Monzo** | Lowercase wordmark; icon echoes the Hot Coral card | MonzoSansDisplay / MonzoSansText | Hot Coral `#FF4F40` on a near-achromatic canvas; navy `#14233C` recorded by simple-icons | Plain-English wit, flat illustration | Mass, friendly; IT reach: low (UK only) | Oct 2022 refresh: expanded palette "doubling down" on Hot Coral | FACT (medium) WB-03 |
| **Starling** | Star symbol + lowercase wordmark | Humanist sans | Purple `#6935D3`, teal secondary | Grown-up, calm | Mass, mature; IT reach: low | UNKNOWN | S1 + ASSUMPTION |
| **bunq** | Lowercase rainbow wordmark; "b" icon | Rounded sans | Blue `#3394D7` recorded; multi-colour | Playful, "bank of The Free", trees | Mass with tiers; IT reach: low–medium | UNKNOWN | S1 + ASSUMPTION |
| **Qonto** (business) | Wordmark-led black/white; four-petal emblem as favicon; capital "Q" | **PolySans** | Black `#1D1D1B`; lavender `#D5C8FB`; mint, peach, mustard pastels | Editorial, typographic, calm, occasional 3D objects | SME/freelancer, premium-feel; IT reach: medium among freelancers | **2021–22, Koto** | FACT (high) S4; FACT (medium) WB-08 |
| **Lydia / Sumeria** | Lydia: blue wordmark; Sumeria: minimal, grey and deep green | Lydia geometric sans; Sumeria serif-leaning (ASSUMPTION) | Lydia blue `#0180FF`; Sumeria greys + deep greens (hexes UNKNOWN) | Sumeria: mature, minimalist; campaign by agency Bruno (hands-only sketches) | FR-centric; IT reach: very low | Sumeria launched May 2024 | FACT (medium) WB-11 |
| **Trade Republic** | Wordmark-led; dark icon | Modern sans; serif claim withdrawn (C14) | Monochrome (hexes UNKNOWN) | Austere, savings-and-wealth minimalism | Mass-affluent savers; IT reach: high among young investors | 2024 logo file exists; details UNKNOWN | UNKNOWN WB-14 |
| **Curve** | Minimal wordmark; dark icon | Geometric sans | Dark + bright blue accent (UNKNOWN) | Card-centric minimal | Mass with metal tiers; IT reach: low–medium | UNKNOWN | ASSUMPTION |

### 2C. Payments, BNPL, wallets and US references

| Brand | Mark / icon | Type | Palette | Tone | Positioning · IT reach | Rebrand 2021–26 | Status / sources |
|---|---|---|---|---|---|---|---|
| **PayPal** | "PP" monogram (de-rounded, separable) + black wordmark | **PayPal Pro** (custom LL Supreme, Lineto) | Black/white base; blues `#002991` as accent | Stripped-back, large type, gesture-based motion | Universal; IT reach: very high | **Sep 2024, Pentagram** | FACT (medium) WB-09; S1/S5 |
| **Klarna** | Wordmark with full stop; pink icon | Custom geometric sans | Klarna Pink `#FFB3C7` + black | Saturated pink, fashion/pop collage, "smoooth" | Mass BNPL/shopping; IT reach: high | No logo change known | S1, S8 + ASSUMPTION |
| **Apple Wallet / Apple Pay** | Stack of coloured cards; black Apple Pay mark | SF Pro | Black/white; card colours only | Product photography, white space, calm | Premium-by-default, mass reach | — | S1 + ASSUMPTION |
| **Google Wallet / Pay** | Stacked colourful cards; "G Pay" | Google Sans | Google blue `#4285F4` + red/yellow/green | Material, friendly, flat | Mass on Android | Google Pay → Wallet 2022 | S1, S11 + ASSUMPTION |
| **Cash App** | "$" on green rounded square | Chunky custom display (CashMarket / Cash Sans per secondary source) | Green `#00C244` (official current value UNKNOWN; `#00D632` also cited) | Street culture, 3D, bold wordplay | Mass US; IT reach: low | Identity evolution 2023–25 (ASSUMPTION) | S1, S5 + ASSUMPTION |
| **Venmo** | "V" in rounded square | Geometric sans | Blue `#008CFF` | Social, emoji-rich | Mass US; IT reach: low | UNKNOWN | S1 |
| **Robinhood** | Simplified feather | **Robinhood Phonic** sans + **Martina Plantijn** serif headlines | Black and white; lime `#CCFF00` legacy accent | Technical illustration, "less is more", serious-investor positioning | Retail investing; IT availability UNVERIFIED | **Oct 2024, Porto Rocha** | FACT (medium) WB-10; S1 |

### 2D. PFM and budgeting apps (the direct category)

| Brand | Mark / icon | Type | Palette | Tone | Positioning · IT reach | Rebrand 2021–26 | Status |
|---|---|---|---|---|---|---|---|
| **Emma** (UK) | Lowercase wordmark; purple icon | Rounded sans | Purple/lilac (hex UNKNOWN) | Chatty, Gen-Z, confetti/emoji | Freemium; not available in Italy | UNKNOWN | ASSUMPTION; availability FACT per `competitors-eu-uk.md` S-19 |
| **Snoop** (UK) | Cartoon mascot | Rounded sans | Pink/coral + dark purple (UNKNOWN) | Cheeky money-saving feed | Freemium, UK only | UNKNOWN | ASSUMPTION |
| **Plum** (UK, in IT) | "P"/plum glyph (mascot historically) | Rounded sans | Plum purple + bright green (UNKNOWN) | Friendly automation, light humour | Savings/invest app; IT App Store 3.4/5 | UNKNOWN | ASSUMPTION; rating FACT per `competitors-eu-uk.md` S-11 |
| **Monarch** (US) | "M"/butterfly mark on indigo | Humanist sans | Deep indigo + warm accent (UNKNOWN) | Calm household finance, premium subscription | US/CA only | Refresh 2025 UNKNOWN | ASSUMPTION |
| **Copilot** (US) | Dark icon with bright glyph | SF-based | Dark UI, vivid category colours | Design-led, playful 3D | Apple-only premium | Continuous | ASSUMPTION |
| **YNAB** (US) | "YNAB" wordmark on blue | Friendly bold sans | Blue (UNKNOWN) | Method-first, educational, warm | Premium subscription; Plaid in Italy since Feb 2025 | Refresh 2021–23 (ASSUMPTION) | ASSUMPTION |
| **Rocket Money** (US) | Rocket symbol | Sans | Red + black/white | Utility, "cancel subscriptions" | Freemium US | Truebill → Rocket Money 2022 | ASSUMPTION |
| **Cleo** (UK/US) | Wordmark; AI persona | Quirky display + sans | Electric blue | Meme-literate, "roast mode" | Freemium; lending-led | Refresh 2022 (ASSUMPTION) | ASSUMPTION |
| **Wallet by BudgetBakers** (CZ) | Literal wallet glyph | Sans | Blue | Functional utility | Italian creators' default tracker | UNKNOWN | ASSUMPTION; usage FACT per `competitors-italy-and-ai-first.md` Y-02/Y-03 |
| **Spendee** (CZ) | "S" mark, teal/green gradient | Sans | Teal/green gradient | Colourful categories | Freemium; Italian reviews dominated by sync complaints | UNKNOWN | ASSUMPTION |
| **Splitwise** (US) | "S" in rounded square | Rounded sans | Teal-green (~`#5BC5A7`, unverified) | Social, practical | Shared expenses; IT reach: medium–high | UNKNOWN | ASSUMPTION |
| **Finanzguru** (DE) | Wordmark; icon UNKNOWN | UNKNOWN | UNKNOWN | Contract-ledger utility; 2026 Toni Kroos campaign | >3 M users, DACH only | UNKNOWN | ASSUMPTION; scale FACT per `competitors-eu-uk.md` S-68 |

---

## 3. Palette landscape (which hues are crowded)

Data layer = E5 (53 brand hexes). Perception layer = per-brand facts above plus recollection (ASSUMPTION where no hex is given). Hue angles computed on 2026-10-02 (HSL).

| Hue band | Verified occupants | Recollection-layer occupants | Crowding | Reading for Lilleri |
|---|---|---|---|---|
| **Blue** (200–250°) | Venmo, Lydia, bunq, Fineco `#00549F`, PayPal `#002991`, Google Pay, Coinbase, Tide, Stripe, Visa, Amex, Monzo navy, **Nexi `#2D32AA` (238°)**, **Scalapay Royal Blue `#5666F0` (234°)** — 24 of 55 | Curve, YNAB, Cleo, Wallet, Monarch indigo, Postepay blue, Mediolanum, BPER | **Saturated** (>40 %) | "Trust blue" is the default of incumbents, infrastructure (Nexi) and US fintech. A blue Lilleri is invisible on the home screen. Avoid as primary. |
| **Green** (100–175°) | Cash App, Adyen, Afterpay mint, **N26 teal `#088177` (175°)**, Wise forest `#163300` (94°, borderline) | Intesa Sanpaolo green, Sumeria deep greens, Spendee, Splitwise, Flowe | **High**, semantically loaded ("money", "positive", "eco") | Saturated and deep greens are taken (N26, Intesa, Wise, now Sumeria). Muted **olive/sage (84–92°, low saturation)** is still unoccupied — the distinction must be carried by saturation and warmth, not hue alone. |
| **Lime / yellow-green** (70–100°) | Wise `#9FE870`, Robinhood `#CCFF00` (legacy) | Revolut lime accent | Medium, loud owners | Neon lime reads "trading/crypto". Avoid. |
| **Purple / violet** (250–290°) | Starling, Nubank, Zelle, Actual Budget; Qonto lavender `#D5C8FB` accent | Emma, Plum, Snoop, Monarch indigo, Revolut purple theme | **High** in the PFM/neobank lane | Purple is the 2016–23 "friendly non-bank" cliché. Accent at most. |
| **Red** (345–15°) | HSBC, Mastercard, MoneyGram; Scalapay Azalea `#F7CACE` (355°, pastel) | UniCredit red, Rocket Money, Revolut deep-pink | Medium; strong Italian occupant (UniCredit) | Bright red carries "loss/alert" risk in a finance UI. A deep wine/amaranth (339°) is free but must never encode negatives. |
| **Orange / coral** (0–40°) | **Satispay `#FF3D00` (14°, S 100 %)**, Monzo Hot Coral `#FF4F40` (5°), Payoneer, Discover | Mooney (possible), Revolut orange theme | **Medium, but with the single most recognised Italian fintech as owner since May 2024** | **Reading changed versus the raw document:** the terracotta candidates (`#C4583A` 13°, `#A8462C` 13°, `#8F3B22` 14°) share Satispay's hue; they differ only in saturation (54–62 % vs 100 %) and lightness. Earthy terracotta is *not* owned, but at 60 px on a phone next to Satispay it must be proven distinct, not assumed (see §9, T2). |
| **Yellow / ochre** (40–70°) | Commerzbank, Binance, Western Union | Postepay yellow, PayPal gold button, N26 "sand" `#C6B29F` (as neutral) | Low in apps; strong Italian association with Postepay | Muted ochre is free as an accent; bright yellow is Postepay's. |
| **Teal / cyan** (175–200°) | Barclays, Mercado Pago; N26 borders this band | Splitwise, Spendee, Revolut teal theme | Medium | N26 now owns teal in Italy. Avoid. |
| **Black / near-black / white** | Revolut `#191C1F`, Qonto `#1D1D1B`, Apple Pay, Square, **PayPal 2024 black wordmark**, **Robinhood 2024 B/W**, Trade Republic, buddybank | Copilot dark, Curve | **Rising fast**: the 2021–25 "premium monochrome" wave | Cold black on pure white is now the premium *default*, not a differentiator. A **warm paper-and-ink neutral** (`#F6F1E7` / `#1F1B17`, both ~30–40° warm) is still free: every monochrome competitor uses cold blacks on pure white. |

**Summary (FACT for the data layer, HYPOTHESIS for the reading):** blue is saturated; green, teal, purple and pink are owned by category leaders; neon is a trading code; cold monochrome is the new premium default; **orange-red is now Satispay's in Italy**. The parts of the wheel that remain effectively unoccupied by any fintech or PFM brand in the sample are *desaturated* and *warm*: olive/sage, wine/amaranth, ochre/sand, and a warm paper neutral. Terracotta remains plausible only if it can be shown to read as "earth" rather than "Satispay, dimmed".

---

## 4. Logo-shape landscape

| Shape family | Occupants | Reading |
|---|---|---|
| **Wordmark only, no symbol** | Wise, N26, Klarna, Monzo, Fineco, Nexi, Qonto (emblem demoted to favicon), Trade Republic, bunq, Curve, isybank (wordmark + tricolore tail) | The dominant European 2016–23 pattern: the *name* is the logo; the icon is the initial or wordmark on a colour field. |
| **Single letter in a rounded square (icon-first)** | Revolut "R", Venmo "V", Cash App "$", Lydia "L", Emma "e" | Optimised for 60 px; risk of sameness. |
| **Abstract symbols** | Satispay's intertwined loop (now rounder), Starling star, Robinhood feather (simplified), PayPal monogram, Monarch, Intesa arches, UniCredit sphere | Still rare among 2020s challengers outside Satispay. A quiet abstract symbol that is *not* a coin or a chart is a differentiation lever. |
| **Literal objects** | Wallet by BudgetBakers, Apple/Google Wallet card stacks, Rocket Money | Category-generic. Avoid. |
| **Mascots / characters** | Snoop, Plum (historic), Cleo persona | UK Gen-Z budgeting code; incompatible with calm-premium. |
| **Multi-colour letterforms** | bunq, Google Pay/Wallet | Consumer-tech playful. |
| **National-flag cues** | isybank tricolore tail | Now occupied by an incumbent's digital bank; a tricolore on Lilleri would read as "isybank's cousin". |

**Reading for Lilleri (HYPOTHESIS):** the unoccupied combination is *lowercase wordmark + a small, quiet, non-literal symbol that encodes "things settling into order"*, with an app icon that is **not** a letter on a flat saturated field and **not** a flag.

---

## 5. Typography trends

| Trend | Evidence | Status |
|---|---|---|
| Custom display face + Inter for UI | Wise (Wise Sans + Inter, first-party CSS); Revolut (Aeonik Pro bundled, Inter as brand font variable) | FACT (high) S2, S3 |
| Custom geometric/grotesk display for "serious but modern" | Qonto PolySans; PayPal Pro (LL Supreme base); Robinhood Phonic; N26 house grotesk + N26-Extended | FACT (medium) WB-08, WB-09, WB-10, WB-04 |
| Serif revival for "wealth / maturity" | Robinhood 2024 pairs a serif (Martina Plantijn) with its sans; Sumeria "serif-leaning" (ASSUMPTION); Trade Republic serif claim withdrawn | FACT (medium) for Robinhood only; HYPOTHESIS as a trend |
| Softer, rounder type for warmth | Satispay 2024 "softer font"; Monzo rounded display | FACT (medium) WB-01, WB-03 |
| Capitalised all-caps display | Revolut `AeonikPro-Black-Capitalised` | FACT (high) S3 |
| System type as the whole identity | Apple Wallet/Card, Google Wallet, Copilot | ASSUMPTION |

**Reading (HYPOTHESIS):** differentiation lives in the display face and in the numerals, because a PFM shows numbers more than words. The sibling typography research recommends Geist Sans (tabular figures, tailed `l`, compact amounts) for UI and Newsreader for marketing display, and flags Inter (Wise's body face), Aeonik (Revolut), Circular and Euclid Circular as category clichés. Lilleri's three consecutive `l`-shapes (l-i-l-l) make the choice of a distinct lowercase `l` a wordmark requirement, not a nicety.

---

## 6. Iconography and illustration trends

| Pattern | Who | Note |
|---|---|---|
| 3D-rendered objects, glossy cards, holo on near-black | Revolut (theme facts E1; render style ASSUMPTION), crypto brands | The "premium tech" cliché of 2021–25 |
| Flat, bold, editorial illustration with oversized type | Wise ("tapestries"), Monzo, Klarna collage | Campaign-led, loud |
| Documentary / product photography, white space | N26, Apple, Qonto, Trade Republic, Revolut 2023 (candid photography), PayPal 2024 | The "calm" register, mostly on cold neutrals |
| Hands-only, overhead product sketches | Sumeria campaign (agency Bruno) | A quieter, human register worth noting |
| Technical/diagrammatic illustration | Robinhood 2024 | "Serious investor" code |
| Merchant logos in circles as the feed's texture | Revolut, Monzo, Emma, Copilot, Monarch | In a PFM the merchant logos *are* the iconography; the brand must coexist with hundreds of third-party colours |
| Emoji / coloured-circle category icons | Copilot, Monarch, Emma, YNAB | Playful; conflicts with calm unless restrained |
| Mascots | Snoop, Plum, Cleo | UK budgeting code |
| Gesture-based motion | PayPal 2024 (tap, click, swipe) | Motion as a brand asset is now mainstream in payments |

**Reading (HYPOTHESIS):** a calm-premium PFM should treat *merchant logos and numbers* as the hero, keep brand illustration minimal (paper-like surfaces, restrained line icons) and own **one signature motion: items settling into order** (two strokes becoming one; a list snapping level) rather than a static illustration set.

---

## 7. Clichés to avoid (with who uses them)

| Cliché | Seen at | Why Lilleri avoids it |
|---|---|---|
| Neon/lime on black, gradients, "holo" | Revolut themes (FACT), Robinhood legacy lime, crypto | Reads "trading/speculation", not "in order" |
| Coins, coin stacks, €/$ glyphs | Cash App "$", countless PFM icons | Generic and currency-bound; Lilleri goes to Europe |
| Rising charts / arrows | Trading apps, robo-advisers | Promises growth; Lilleri promises order and correctness |
| Piggy banks, wallets, rockets | Savings apps, Wallet by BudgetBakers, Rocket Money | Childish or category-generic |
| "Smart", "AI-powered", sparkles | Many 2025–26 AI-branded apps | Hype vocabulary contradicts calm; the research flags opaque AI claims as a trust risk (`competitors-us.md` §6.14) |
| Purple as "we're the friendly non-bank" | Starling, Nubank, Zelle, Emma, Plum | Over-used lane |
| Hot coral / pastel pink / vivid orange | Monzo, Klarna, Scalapay, **Satispay 2024** | Owned by others; in Italy orange-red = Satispay |
| Tricolore / flag cues | isybank | Occupied; also "Made in Italy" kitsch for a product that must travel |
| Mascots and chat-bot personas | Snoop, Plum, Cleo | Incompatible with premium calm; Cleo's FTC case shows the persona's trust cost |
| Letter-on-flat-colour app icon | Revolut, Venmo, Cash App, Lydia | Home-screen sameness |
| Cold black on pure white | Revolut, Qonto, Apple, PayPal 2024, Robinhood 2024 | Now the premium default; be premium *and* warm instead |
| Shields and locks for "security" | Bank apps | Signal security through clarity and plain language, not icons |
| Taglines claiming "simple" | isybank "Semplicemente banca", Satispay, dozens of trackers | "Simple" is table stakes vocabulary in Italy; it no longer differentiates (see `docs/brand/messaging-framework.md`) |

---

## 8. White-space opportunities

| Dimension | Unoccupied space (HYPOTHESIS) | Evidence of non-occupation |
|---|---|---|
| Colour | Warm paper + warm ink neutral base; a single desaturated, earthy signature (olive/sage, wine, or a proven-distinct cotto) | §3 census; every monochrome competitor is cold; every warm competitor is saturated (Satispay, Monzo, Klarna) |
| Mark | Lowercase wordmark + quiet abstract "settling" symbol | §4: symbols are rare among challengers; none encodes reconciliation |
| Type | Humanist or soft-grotesk UI face with tabular numerals and a distinct `l`; optional transitional serif for marketing display | §5; typography research |
| Motion | "Things falling into order" as the one branded motion | §6; competitors use gestures (PayPal) or 3D (Revolut), none uses reconciliation itself as motion |
| Voice | Calm competence: short declaratives, present tense, no exclamation marks, precise numbers; Italian-first | Satispay (warm/human), isybank (essential), Revolut (hype), Cleo/Snoop (chatty): nobody owns "precise and calm" in Italian consumer fintech |
| Trust surface | Visible mechanism: "why" per categorisation, consent countdown, named sync states, export/delete in the open | The research found no competitor marketing consent-expiry UX or explainable categorisation (`user-pain-points.md` §H, `competitors-eu-uk.md` §11.6) |

---

## 9. Shortlist: three colour/visual territories to explore (not a palette decision)

Contrast ratios computed on 2026-10-02 (WCAG 2.x; AA normal text ≥ 4.5:1, AA large/UI ≥ 3:1, AAA ≥ 7:1). Hex values are *starting points for exploration*. All three share the same base; they differ in the single signature colour and the register it brings.

| Territory | Base + signature (candidate hexes) | Rationale | Accessibility (computed) | Nearest competitors / risks | What Phase 2 must test |
|---|---|---|---|---|---|
| **T1 — Carta, Inchiostro, Oliva** (paper, ink, olive) | Paper `#F6F1E7`, ivory `#FBF8F2`, ink `#1F1B17`; signature olive `#4F5D3A`, sage `#8FA37E` for fills | The ledger finally filed; Tuscan hills without folklore; growth and calm without "cash green". Pairs naturally with a paper base and with merchant logos of any colour. Desaturated green is absent from the whole sample. | Ink on paper 15.2:1 (AAA); olive on paper 6.3:1 (AA); ivory on olive 6.7:1 (AA); sage only as a fill with ink text (6.3:1). | Wise forest green (darker, cooler, 94° but saturated), N26 teal (175°), Intesa dark green (ASSUMPTION), Sumeria deep greens, Spendee/Splitwise. Risk: "organic/eco" codes; risk of reading as "another green bank" if saturation creeps up. | Side-by-side at 60 px next to N26, Wise, Intesa, Satispay; deuteranopia simulation; check that olive and any red/negative semantic colour never mean opposite things. |
| **T2 — Carta, Inchiostro, Cotto** (paper, ink, terracotta/cotto) | Same base; signature deep cotto `#8F3B22` (text-safe) or `#A8462C`; lighter `#C4583A` only for large UI | Mediterranean earth, home, warmth without alarm; Italian-born without flags. **Caveat added by this pass:** hue 13–14° equals Satispay's new orange `#FF3D00`; the difference is saturation (54–62 % vs 100 %) and lightness. Earthy cotto is unoccupied, "Satispay dimmed" is not. | `#8F3B22` on paper 6.6:1 (AA); ivory on `#8F3B22` 7.0:1 (AAA); `#A8462C` on paper 5.2:1 (AA); `#C4583A` on paper 3.9:1 (large/UI only). Never encode negative amounts in cotto. | **Satispay `#FF3D00` (May 2024)**, Monzo Hot Coral (5°), Mooney (possible), Rocket red. Risk: confusion with the most recognised Italian fintech at icon size; red-adjacent "alert" reading. | The decisive test: a Lilleri cotto icon next to the Satispay icon on an iOS and an Android home screen, 20 Italian users, "which is which" after 2 s. If confusion > 10 %, drop T2 or move to the deepest cotto. |
| **T3 — Carta, Notte, Amaranto** (paper, night ink, wine) | Same paper base with a slightly cooler night ink `#2B2F4A` for dark surfaces; signature wine/amaranth `#6E1F3B` | Velvet, wine, grown-up Italian luxury; the most "premium" of the three; distinct from every neon and every blue. | Wine on paper 9.7:1 (AAA); ivory on wine 10.3:1 (AAA); night ink on paper 11.6:1 (AAA). | UniCredit red (353°, saturated), HSBC/Mastercard red, Scalapay Azalea (pastel 355°), Starling/Nubank purple (if the wine drifts cooler). Risk: red-adjacent = "loss"; must never be the negative-amount colour; can feel heavy in a daily-use app. | Test warmth vs coldness of the night ink; check that wine stays clearly distinct from UniCredit red and from the negative semantic colour; test with 25–35-year-olds for "old-fashioned" readings. |

**Explicitly not shortlisted:** Notte & Glicine (indigo + wisteria) — the purple lane is crowded; Ocra & Sabbia — Postepay yellow association, and ochre fails text contrast (2.4:1); Verdigris/Acqua — now blocked by N26's teal in Italy.

**Rules that apply to all three (DECISION for Phase 2):** (1) warm paper and ink are the base in every territory; (2) exactly one signature colour; (3) semantic colours for positive/negative amounts are chosen separately and never collide with the signature; (4) every candidate is tested at 60 px next to Satispay, Revolut, N26, PayPal and Intesa; (5) no palette is final until the colour-blind simulation and the app-icon test are documented in `docs/brand/`.

---

## 10. Verbal and naming notes (cross-references)

- The verbal territory ("in ordine", "si sistema", "chiaro", "niente da fare") and the tagline evaluation live in `docs/brand/messaging-framework.md`.
- Name hygiene (domains, handles, trademark, collisions, the Tuscan meaning) lives in `docs/brand/naming-analysis.md`. Two facts from the closing pass affect brand design directly: `lilleri.it` hosts an unrelated engineering firm, and a Tuscan barter market called "Lillero" used "lilleri" as its unit of exchange from 2019 until its closure in December 2025 (FACT, medium, WB-15) — evidence that the word is "thinkable" as a money name, and a reminder that the Tuscan pun must be used with restraint.

---

## Decisions / Recommendations

| # | Decision or recommendation | Type | Rationale |
|---|---|---|---|
| D1 | Do not use blue, teal, saturated green, purple, pink, neon lime or vivid orange-red as Lilleri's signature colour | DECISION | §3: every band is owned; orange-red became Satispay's in May 2024 (C1) |
| D2 | Base every identity exploration on a warm paper-and-ink neutral system | DECISION | The only monochrome register not used by Revolut, Qonto, Apple, PayPal, Robinhood or Trade Republic |
| D3 | Explore exactly three signature territories in Phase 2: T1 olive, T2 deep cotto (with the Satispay confusion test as a gate), T3 wine | DECISION | §9 |
| D4 | Mark direction: lowercase wordmark + a small abstract "settling into order" symbol; no letter-on-flat-field icon, no coin/chart/wallet/flag | DECISION (direction, not design) | §4, §7 |
| D5 | Type direction: UI face with tabular figures and a distinct lowercase `l` (Geist Sans recommended by the typography research); optional serif for marketing display only; no Inter/Aeonik/Circular/Euclid | RECOMMENDATION | §5; `typography-options.md` |
| D6 | Own one branded motion — items settling into order — and keep illustration minimal | RECOMMENDATION | §6, §8 |
| D7 | Treat Satispay, isybank and Revolut as the three identities Lilleri must be visibly different from on an Italian home screen | DECISION | Highest Italian recognizability (HYPOTHESIS pending the awareness survey) |
| D8 | Run the 200-respondent aided-awareness and icon-confusion study before any palette is frozen | RECOMMENDATION | No survey exists; all "IT reach" cells are hypotheses |

## Open questions

| # | Question | How to verify |
|---|---|---|
| Q1 | Exact official hex values and typefaces for Hype, Intesa Sanpaolo, UniCredit/buddybank, isybank, Mooney, Trade Republic, Sumeria, Emma, Plum, Monarch, YNAB, Spendee, Wallet | Brand/press pages once egress allows; sample App Store icons and document the method |
| Q2 | Whether Satispay's `#FF3D00` tokens are the official brand values (they come from a third-party design-system capture) | Read satispay.com/it-it/blog/mondo-satispay/nuova-identita and developers.satispay.com/reference/logo |
| Q3 | Revolut 2023 identity agency (in-house vs Pentagram) | Brand New entry WB-13 body; pentagram.com/work |
| Q4 | Did Hype refresh its identity at the 1 Apr 2026 merger into Banca Sella? | hype.it, App Store listing history, Sella group press |
| Q5 | Italian aided-awareness ranking of Satispay, PayPal, Revolut, Intesa, isybank, UniCredit, Fineco, Hype, Klarna, Scalapay, Nexi, Postepay, N26 | 200-respondent survey, Phase 1 |
| Q6 | Icon-confusion rate of each Lilleri territory against Satispay/N26/Revolut/Intesa at 60 px | 20-user test, Phase 2 |
| Q7 | Monzo/Cash App/PayPal secondary-source hex conflicts (Cash App `#00C244` vs `#00D632`; PayPal monogram one blue vs two) | Official press pages |
| Q8 | Whether Robinhood is available in Italy (affects whether its B/W + serif system is a local reference) | robinhood.com/eu |

## Sources

Carried over from the raw document (all verified 2026-10-02; see `docs/research/raw/brand-competitor-analysis.md` for the full locator list):

| ID | Source | Reliability |
|---|---|---|
| S1 | `simple-icons` npm 16.33.0 (2026-09-27): https://registry.npmjs.org/simple-icons/-/simple-icons-16.33.0.tgz and the maintainer-cited brand pages (wise.design, klarna.design, venmo.com/about/brand, press.robinhood.com, cash.app/press, monzo.com/press, starlingbank.com/media, developer.revolut.com marketing guidelines, press.bunq.com, lydia-app.com press, developer.apple.com/apple-pay/marketing, pay.google.com/about, newsroom.paypal-corp.com, finecobank.com, n26.com) | medium–high |
| S2 | Wise `@transferwise/neptune-tokens` 8.26.0 and `@transferwise/neptune-css` 14.29.4: https://registry.npmjs.org/@transferwise/neptune-tokens ; https://registry.npmjs.org/@transferwise/neptune-css | high |
| S3 | Revolut `@revolut/ui-kit` 14.16.2: https://registry.npmjs.org/@revolut/ui-kit | high |
| S4 | Qonto `@qonto/login-button` 0.5.1: https://registry.npmjs.org/@qonto/login-button | high |
| S5 | `brand-colors` npm 2.1.1 (2022): https://registry.npmjs.org/brand-colors | low–medium |
| S6–S12 | Developer docs via Context7: Revolut logo/button/marketing guidelines; Satispay web-button docs; Klarna payments API; Nexi go-live checklist; PayPal JS SDK v6; Google Pay brand guidelines; Wise embedded flows | high |
| S15 | GitHub public code (Qonto FAQ repo; `activemerchant/payment_icons` etc. Satispay SVGs; `dottxn/brandkit`; Monzo DESIGN.md files; SEPA PSP directory copy; "lilleri" matches) | low–medium |
| S16 | npm registry re-check 2026-10-02 | high |
| T1 | `docs/research/raw/typography-options.md` (Wise Inter/Wise Sans first-party; Geist recommendation) | high for the first-party facts |

Added by the closing web-search pass (search-engine snippets seen 2026-10-02; pages not fetched; reliability medium unless noted):

| ID | Source | URL(s) | Used for |
|---|---|---|---|
| WB-01 | Satispay, "Satispay lancia la nuova identità di brand"; ItaliaOggi "Satispay, 10 anni e una nuova identità"; Inside Marketing; Roba da Grafici; Vending News; oh-my-design Satispay design-system capture (hexes); Satispay developer logo reference | https://www.satispay.com/it-it/blog/mondo-satispay/nuova-identita/ ; https://www.italiaoggi.it/news/satispay-10-anni-e-una-nuova-identita-2631828 ; https://www.insidemarketing.it/satispay-nuova-identita-marca-2024/ ; https://www.robadagrafici.net/10-anni-di-satispay-nuova-identita-per-il-circuito-nato-per-semplificare-i-pagamenti/ ; https://www.vendingnews.it/una-nuova-brand-identity-per-i-dieci-anni-di-satispay/ ; https://oh-my-design.kr/design-systems/satispay ; https://developers.satispay.com/reference/logo | C1, §2A, §3, §9 |
| WB-02 | Ragged Edge, "Wise rebrand"; Creative Review; Tearsheet | https://raggededge.com/partnerships/wise ; https://www.creativereview.co.uk/wise-rebrand-ragged-edge/ ; https://tearsheet.co/marketing/from-safe-blue-to-citrus-green-how-wise-rebranded-to-an-identity-that-is-exciting-and-good-for-its-bottom-line/ | C2 |
| WB-03 | Monzo on X (expanded palette, Oct 2022); Monzo blog "We've had a little makeover"; shadcn/oh-my-design Monzo captures | https://x.com/monzo/status/1581946225443897345 ; https://monzo.com/blog/weve-had-a-little-makeover ; https://www.shadcn.io/design/monzo | C3 |
| WB-04 | N26 blog "Introducing our new look N26 branding"; shadcn N26 capture; Mobbin N26 palette; N26 brand-book Medium post | https://n26.com/en-eu/blog/n26-new-logo-new-colors ; https://www.shadcn.io/design/n26 ; https://mobbin.com/colors/brand/n26 ; https://medium.com/insiden26/brand-guidelines-how-to-get-started-and-maintain-them-38e48a819039 | C4 |
| WB-05 | Scalapay Universe brand repository; Brandfetch Scalapay | https://universe.scalapay.com/brand/repository/ ; https://brandfetch.com/scalapay.com | C5 |
| WB-06 | logotyp.us Nexi; Brandfetch nexigroup.com | https://logotyp.us/logo/nexi/ ; https://brandfetch.com/nexigroup.com | C6 (medium-low) |
| WB-07 | Intesa Sanpaolo press kit isybank; Accenture newsroom; Brand News; isybank launch-campaign PDF | https://group.intesasanpaolo.com/en/newsroom/all-news/news/2023/press-kit-isybank ; https://newsroom.accenture.it/it/news/2023/intesa-sanpaolo-lancia-isybank-accenture-song-firma-brand-strategy-design-e-comunicazione ; https://brand-news.it/brand/finanza/banche/arriva-isybank-banca-digitale-di-intesa-sanpaolo-con-brand-strategy-design-e-comunicazione-firmati-da-accenture-song/ ; https://group.intesasanpaolo.com/content/dam/portalgroup/repository-documenti/newsroom/isybank/en/5_Isybank_launch_campaign_EN.pdf | C7 |
| WB-08 | Qonto, "Forging a new identity for the Qonto brand"; Logonews; Blog du Modérateur; Maddyness | https://medium.com/qonto-way/forging-a-new-identity-for-the-qonto-brand-762852d3ec41 ; http://logonews.fr/2022/04/29/la-licorne-qonto-prend-du-galon-et-laffirme-dans-une-nouvelle-identite/ ; https://www.blogdumoderateur.com/interview-comment-qonto-change-identite-visuelle-soutenir-croissance/ | C8 |
| WB-09 | It's Nice That; Creative Review; Fast Company on PayPal/Pentagram | https://www.itsnicethat.com/articles/pentagram-paypal-rebrand-graphic-design-project-190924 ; https://www.creativereview.co.uk/paypal-branding-identity-pentagram/ ; https://www.fastcompany.com/91192676/paypal-brand-refresh | C9 |
| WB-10 | Porto Rocha Robinhood case; Transform magazine; rebrand.gallery | https://www.portorocha.com/robinhood ; https://www.transformmagazine.net/articles/2024/financial-platform-robinhood-introduces-new-minimal-visual-identity/ ; https://www.rebrand.gallery/rebrand/robinhood | C10 |
| WB-11 | Hyperealist "Le rebranding de Lydia Comptes en Sumeria"; e-marketing.fr (agence Bruno); banque-en-ligne-info | https://www.hyperealist.com/blog-posts/le-rebranding-de-lydia-comptes-en-sumeria ; https://www.e-marketing.fr/Thematique/marques-1296/strategie-marque-2250/Breves/sumeria-lydia-presente-premiere-campagne-orchestree-agence-bruno-485247.htm ; https://www.banque-en-ligne-info.com/sumeria-la-nouvelle-marque-de-lydia/ | C11 |
| WB-12 | Sella group "Hype"; Banca Sella privacy notice (merger 1 Apr 2026); HYPE Instagram | https://www.sellagroup.eu/chi-siamo/hype ; https://www.sella.it/-/informativa-hype ; https://www.instagram.com/hypeapp/ | C12 |
| WB-13 | Brand New "New Logo for Revolut" (2023); fintechbranding.studio; Medium analysis | https://www.underconsideration.com/brandnew/archives/new_logo_for_revolut_2023.php ; https://fintechbranding.studio/revolut-brand-refresh ; https://medium.com/@arushidesigns01/revoluts-brand-evolution-a-look-at-the-old-vs-new-design-a576b57d8c3e | C13 |
| WB-14 | Wikimedia "Trade Republic Logo 2024.svg"; madebycru.com Trade Republic branding | https://commons.wikimedia.org/wiki/File:Trade_Republic_Logo_2024.svg ; https://www.madebycru.com/work/branding-b2c-fintech-onlinebroker-traderepublic | C14 (negative result) |
| WB-15 | Lillero, "Il vero mercato del baratto" (Capannori); intoscana.it; Lucca in Diretta (closure 16 Dec 2025) | https://lillerobaratto.it/ ; https://www.intoscana.it/it/capannori-lillero-il-vero-mercato-del-baratto/ ; https://www.luccaindiretta.it/capannori-e-piana/2025/12/16/parezzana-saluta-lillero-chiude-il-mercato-del-baratto/487546 | §10 |
| U1 | Still unreachable on 2026-10-02 (WebFetch blocked): the pages above were not opened; revolut.com/brand, wise.design, klarna.design, hype.it, intesasanpaolo.com brand pages, unicreditgroup.eu media, brandfetch.com pages | — | Explains the "medium" grade on every WB fact |
