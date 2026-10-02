import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const base = path.join(root, 'packages/brand')
const files = []
for (const dir of ['logo', 'icon', 'png', 'tokens', 'fonts'])
  for (const name of fs.readdirSync(path.join(base, dir)).sort()) {
    const relative = `${dir}/${name}`
    if (relative === 'tokens/assets-manifest.json') continue
    const buffer = fs.readFileSync(path.join(base, relative))
    const item = {
      path: relative,
      bytes: buffer.length,
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    }
    if (/\.png$/.test(name)) {
      const meta = await sharp(buffer).metadata()
      item.width = meta.width
      item.height = meta.height
    }
    files.push(item)
  }
fs.writeFileSync(
  path.join(base, 'tokens/assets-manifest.json'),
  JSON.stringify({ generatedAt: '2026-10-02', files }, null, 2) + '\n',
)
const purpose = (file) => {
  if (file.startsWith('logo/'))
    return file.includes('small')
      ? '16/24px optical bare mark'
      : file.includes('wordmark')
        ? 'Outlined brand name / header'
        : file.includes('lockup')
          ? 'Combined name and monogram'
          : 'Bare monogram'
  if (file.startsWith('icon/'))
    return file.includes('android-foreground')
      ? 'Transparent adaptive foreground, central 66% safe area'
      : file.includes('android-background')
        ? 'Full-bleed adaptive paper field'
        : file.includes('monochrome')
          ? 'Single-colour themed adaptive foreground'
          : file.includes('favicon')
            ? 'Small browser/UI mark, theme-specific'
            : file.includes('maskable')
              ? 'PWA maskable full-field composition'
              : file.includes('avatar')
                ? 'Social profile, OS/circle crop safe'
                : 'Store/app square, OS applies mask'
  if (file.startsWith('png/'))
    return file.includes('app-icon')
      ? 'Store/app raster'
      : file.includes('shelf')
        ? 'Procedural30-icon composition evaluation'
        : file.includes('proof')
          ? 'Accessibility/format expert evaluation'
          : file.includes('board')
            ? 'Identity/UI concept presentation, synthetic'
            : file.includes('sheet')
              ? '1:1 small-size evaluation'
              : 'Raster export / placement review'
  if (file.startsWith('fonts/'))
    return file.includes('LICENSE')
      ? 'Required SIL OFL copyright/licence notice'
      : 'Selected local font; static native or variable web'
  return file.includes('contrast')
    ? 'Measured WCAG pair evidence'
    : file.includes('palette-source')
      ? 'Reviewed immutable palette snapshot and provenance'
      : file.includes('colors')
        ? 'Direct light/dark semantic roles'
        : 'Generated token interchange / platform mirror'
}
const status = (file) =>
  file.startsWith('fonts/')
    ? 'Licensed OFL font/notice; coverage measured'
    : file.endsWith('.svg') && !file.includes('proof') && !file.includes('board')
      ? 'Generated vector — needs designer finalisation'
      : file.startsWith('png/')
        ? 'Generated evaluation/export; not user validation'
        : 'Generated source/evidence; build checked'
const rows = files
  .map(
    (file) =>
      `| \`packages/brand/${file.path}\` | ${path.extname(file.path).slice(1).toUpperCase()} | ${purpose(file.path)} | ${status(file.path)} |`,
  )
  .join('\n')
const doc = `# Brand assets

**Date:** 2026-10-02. **DECISION:** B li monogram, T3 Carta & Vinaccia, Geist/Newsreader/Geist Mono. Original programmatically generated artwork; no paid assets and no copied competitor logos. **Generated vector — needs designer finalisation** before public production. Finalisation is a release gate, not a claim that a designer has reviewed these files.

## Final deliverable inventory

Every final asset/token/font file is listed below. Exact byte sizes, raster dimensions and SHA256 are in \`packages/brand/tokens/assets-manifest.json\` (${files.length} indexed files, excluding the manifest's own circular hash). Main vectors are paths with no external font references; wordmark outlines use licensed Geist glyphs plus original l/dot geometry. App icon raster is 1024×1024, full-bleed opaque field. PNG 16/24 symbols use the optical small cut, PNG 32/64/1024 use the main mark.

| File | Format | Intended use | Status |
|---|---|---|---|
${rows}
| \`packages/brand/tokens/assets-manifest.json\` | JSON | Complete final asset checksums/dimensions | Generated inventory |

Package source/configuration: \`packages/brand/{package.json,tsconfig.json,tsconfig.build.json,README.md,src/index.ts}\`. \`dist/\` is a reproducible ignored build output, not another editable source. Exports are documented in the package README. Asset string paths are package-relative; consumers must resolve them with their bundler or copy to a static directory. No guessed HTTP/CDN/domain paths are embedded.

## Exploration and typography evidence

The complete existing A/B/C and T1/T2/T3 archives under \`packages/brand/explorations/\` remain original working evidence. Their inventory is in the three direction documents and palette generators, not duplicated into the final asset set. They are **explorations**, not production variants. New type evidence:

| Files | Use / evidence status |
|---|---|
| \`explorations/type/{comparison,numbers,glyphs}.{svg,png}\` | Actual full-binary outlined specimens, 6 families (+Mono glyph sample), inspected |
| \`explorations/type/{editorial-headline,editorial-label}.svg\` | True Newsreader outlines used on final board, avoid renderer family-name fallback |
| \`explorations/type/font-measurements.json\` | Coverage/features/digit widths/file sizes measured from 7 binaries |
| \`explorations/type/locale-examples.json\` | Actual Node 22.22/ICU77.1 default currency formatting, not domain arithmetic |
| \`explorations/type/source-fonts/{Inter,Manrope,PlusJakartaSans,InstrumentSans,Newsreader}-Variable.ttf\` | Complete official Google Fonts source binaries, replaces invalid ASCII evidence from old Latin-ext-only renderer inputs |
| \`explorations/type/source-fonts/sources.json\` and \`LICENSE-*-OFL.txt\` | Retrieval URLs/date/SHA256 and all required source licences |

FACT: selected fonts are SIL OFL 1.1; retained copyright/licence text permits embedding and redistribution subject to OFL terms. Full-font sizes differ from the raw research's Latin-subset estimates. Newsreader/Mono are optional route loads; main mobile faces are static Geist 400/500/600. Greek/all-world-script support is not claimed. French narrow-NBSP absence in Geist is documented; use the exact formatter's tested spacing/fallback.

## Reproduction and designer handoff

From repository root after frozen renderer install and root tooling activation:

\`\`\`bash
node tools/brand-render/build-final.mjs
python3 tools/brand-render/type-specimens.py # fontTools and Brotli required
node tools/brand-render/identity-board.mjs
node tools/brand-render/accessibility-proof.mjs
node tools/brand-render/icon-sheet.mjs packages/brand/icon/app-icon-ios-1024.svg packages/brand/png/icon-sheet.png --title "Lilleri B / T3 final"
node tools/brand-render/icon-sheet.mjs packages/brand/icon/favicon.svg packages/brand/png/favicon-sheet.png --title "Lilleri optical favicon"
node tools/brand-render/shelf.mjs packages/brand/icon/app-icon-ios-1024.svg packages/brand/png/shelf-seed3.png --seed3
node tools/brand-render/shelf.mjs packages/brand/icon/app-icon-ios-1024.svg packages/brand/png/shelf-seed11.png --seed11
pnpm --filter @lilleri/brand build
node tools/brand-render/inventory.mjs
\`\`\`

The shelf flags are \`--seed 3\` and \`--seed 11\` (separate argument); the command block above is corrected by the generator below. The generator intentionally preserves existing exploration files. Palette source is now an immutable reviewed snapshot, so a later exploration change cannot silently mutate consumer tokens. The remote exploration snapshot included invalid metadata \`id: #NANNANNAN\`; it is excluded from the final colour-role whitelist, and the final generator validates every hex.

Designer specification: preserve lowercase li rhythm, stem 144/foot136/grid1024, one rounded terminal, round dot radius 88, existing custom wordmark outlines and kerning. Refine optical balance/foot joining/curve tangency on actual screens and print. Review small-cut68-unit gap at 16/24px, mark clear space144 units, full app icon0.827 scale and Android safe area. Do not replace the mark with a stock glyph or a coin/graph. Review export geometry and logo minimum sizes; approve exact variant files, not only a presentation image.

Typeface/voice brief: adult Italian warmth without folklore, calm paper/ink with one wine action; serif editorial only; tabular amounts; no money count-up; line/dot action settling respects reduced motion. Product copy is concrete Italian, not bank jargon. Logo/source has no currency symbol, shield or mascot. Source inspiration/problem/weakness/improvement: crowded saturated finance icons → a clear name-linked small mark → generic letter-on-colour lacks a system → original outlined wordmark, warm neutrals, optical cut and visible explanation states.

## Verified limits

Build/typecheck and direct runtime token import executed; 19 exported asset paths exist; 80 required contrast pairs pass. Worst normal text light 4.650:1/dark5.939:1; functional outline floors 3.009:1/3.019:1. Icon16/24/32 and mono/light/dark proofs were visually inspected. Both shelves use 29 generic procedural stand-ins, not authentic competitors; positions/seeds are composition variations, not consumers or recognition times. CVD simulation is an expert aid using Machado 2009 linear-sRGB matrices; status text/signs/vector icons remain necessary.

UNKNOWN / OPEN QUESTION: legal naming/trademark/domain clearance, recruited user-study results, real app-grid competitor confusion, physical-device font rasterisation, VoiceOver/TalkBack, actual-screen contrast/reflow and store submission approval. Existing name research risks remain in \`naming-analysis.md\`. No evidence here claims these gates passed.
`
const corrected = doc
  .replaceAll('--seed3', '--seed 3')
  .replaceAll('--seed11', '--seed 11')
  .replace(
    'The shelf flags are `--seed 3` and `--seed 11` (separate argument); the command block above is corrected by the generator below. ',
    '',
  )
fs.writeFileSync(path.join(root, 'docs/brand/brand-assets.md'), corrected)
console.log(`Inventoried ${files.length} final files, raster sizes and checksums.`)
