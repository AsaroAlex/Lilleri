# Brand guidelines

**DECISION — 2026-10-02.** Original generated artwork is implementation-ready; designer finalisation, legal clearance and real user/device validation remain release gates. Refer to `brand-identity.md`, `brand-jury.md` and `brand-assets.md`; do not treat these guidelines as a trademark registration.

## Clear space and minimum size

Measure clear space from visible artwork, not SVG canvas. Symbol: at least one stem width144/1024 of the main grid on all sides. Wordmark: at least one wordmark stem width around the visible lettering. Horizontal/vertical lockups: at least one wordmark l stem width around the combined visible bounds. Partner marks have their own required clear space; use whichever separation is greater. Nothing occupies the dot's space or turns the symbol into punctuation within a sentence.

| Size/context | Required asset / use |
|---|---|
| 16px | Optical `icon/favicon.svg` (light), `favicon-on-dark.svg` (dark); no wordmark/lockup |
| 24px | Optical bare symbol in dense UI; interactive area still≥44; labelled if functional |
| 32px | Main bare symbol acceptable; app icon only where platform already supplies app name |
| 64px | App icon and avatar; wordmark can appear beside icon with comfortable separation |
| 1024px | Store raster from full-bleed square SVG; no baked corner radius/shadow/transparency in iOS raster |
| Wordmark | Minimum visible lettering height20px; small legal/footer16px only after manual inspection |
| Horizontal lockup | Minimum rendered width140px; preferred180px+ for first encounter |
| Vertical lockup | Minimum rendered width96px; avoid navigation/header |

FACT: final16/24/32/64 renders, full icon sheet and light/dark/mono proof are stored under `packages/brand/png`. Expert finding: main icon retains li+dot at 16 but its inner gap is cramped; use the optically larger, shortened-foot favicon at 16/24. Do not claim anyone measured recognition time. Raster screenshot scaling/browser zoom can hide failure; inspect100% pixel size.

## Colour and typography

Wine `#782443` on warm light ground; rose `#D497A7` on warm dark ground; ink/cream for wordmark. Use supplied asset variants. Wine on dark and rose on paper have inadequate contrast for these roles; do not choose by aesthetic preference. Symbol accepts one solid ink for mono use; artwork never receives gradients, patterned fills or multicolour segments. Photo grounds require a quiet solid panel and inspected contrast. Decorative `border` cannot communicate required control boundaries; use `borderStrong`.

Do use semantic colour roles, neutral debits with−, labelled status vector icons, direct chart labels and proper target size. Do not use wine for losses, a green amount as the only evidence of income, or pale text to signal a disabled reason. Error text remains readable. Colour-vision proofs are expert aids; they do not constitute WCAG certification of screens.

Do use local licensed Geist/Newsreader/Mono assets with tabular figures on amounts. Do not recreate the wordmark by typing “lilleri”, substitute a system serif, fake weight, stretch/compress paths, alter letter spacing, uppercase the wordmark, crop feet/dots, use tiny thin amounts or ellipsise monetary values. UI essentials remain≥14 logical units, preferred16, and scale with device settings.

## Incorrect usage with reasons

| Misuse | Why it breaks the system |
|---|---|
| Rotate/mirror the l or exchange l/i | Removes the name-linked stem rhythm |
| Bring dot down into the stem / enlarge as eye | Creates another glyph or a childish face |
| Rebuild two l stems instead of li | Loses focal point; repeats rejected pause/11 construction |
| Animate balance through intermediate digits | Displays values that never existed |
| Draw rounded outer iOS corners | OS mask doubles corner treatment and shrinks meaningful art |
| Put foreground outside adaptive safe area | Android masks can cut the l foot/dot |
| Put wine on dark / rose on pale paper | Violates supplied contrast contract |
| Add shadow, bevel, shield, chart, euro or coin | Competes with simple identity and invites misleading finance associations |
| Use lettermark without name on first marketing exposure | Spelling/name learning requires wordmark |
| Use decorative dot as only consent status | People and assistive technology need state text |

## Bank/provider co-branding

Connection screen identifies actual institution by verified name and separately the licensed provider in plain copy. Institution logos may be used only from permitted current brand assets/licence; use a neutral initials/name placeholder otherwise. Do not imply partnership by aligning logos in a shared lockup or colouring a bank logo wine. Example: “Collega Intesa Sanpaolo” / “Il collegamento è gestito da [provider autorizzato]. Accesso in sola lettura.” Never fill the provider placeholder in a live release with a guessed entity. Demo: “Banca dimostrativa · dati sintetici”, no authentic-bank credential prompt.

## Store screenshots and landing direction

Store story uses real implemented screens, synthetic data clearly labelled, ample paper and one concise Italian proposition per frame. Suggested order: “I tuoi conti, una vista chiara.” → “Un trasferimento, una volta sola.” → “Solo i movimenti da controllare.” → “Le tue regole vengono prima.” → “Sai cosa leggiamo. Decidi tu.” Claims must match tested capabilities and coverage. No impossible live balance totals, invented testimonials, unsupported bank logos or unreadable mini dashboards. Current platform screenshot/icon rules need recheck at submission.

Landing: one Newsreader editorial sentence, Geist explanation, original outlined wordmark and a calm useful product example. Dominant CTA for current prototype is “Esplora la demo”, with “Dati sintetici. Nessun conto reale collegato.” Beta wait-list collection appears only with its implemented privacy policy/action. Price cards show Gratis/Plus hypothesis values and actual scope; Famiglia does not appear as a purchasable plan. Status/footer must distinguish demo from service availability.

## Other applications

Avatar: supplied `social-avatar.svg` with full field, not a cropped wordmark. Email signature: small outlined wordmark, sender name/role, URL only once chosen and verified, no promotional GIF or speculative legal entity. Print uses single solid ink and adequate clear space; designer verifies minimum material tolerances. Motion follows `visual-language.md`; no autonomous mascot/sound identity.

Legal line template (not legal advice): “Lilleri è un servizio di organizzazione delle finanze personali. [Entità legale e informazioni verificate].” Do not write “banca”, imply deposit protection, promise advice or name a regulated authorisation that has not been established. Legal team supplies live provider/entity disclosures. Font copyright/OFL notices ship in the asset package. The Lilleri wordmark/monogram's rights and name availability remain open legal questions.
