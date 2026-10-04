import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '../brand-render/node_modules/@resvg/resvg-js/index.js'

// Original Lilleri pictograms. Static PNGs work on both native and web without
// installing an SVG runtime. SVG sources remain inspectable and reproducible.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const destination = path.join(root, 'apps/mobile/assets/finance')
fs.mkdirSync(destination, { recursive: true })

const palettes = {
  blue: ['#EAF0FA', '#355989', '#D2E2F5', '#203047', '#B1CCF0', '#304868'],
  green: ['#EAF1E9', '#315943', '#D2E6D5', '#22362A', '#B3D4BC', '#34503D'],
  violet: ['#F0ECF6', '#634F83', '#DED6EC', '#302A3D', '#CDBBE8', '#493F5D'],
  sand: ['#F2EEE5', '#766447', '#E7DDBF', '#352F24', '#DECDAB', '#4D4330'],
  orange: ['#F7ECE1', '#856041', '#EDD8BC', '#382E24', '#E6C6A2', '#534130'],
  teal: ['#E8F1F1', '#356064', '#CEE4E5', '#203437', '#AFD2D5', '#314C50'],
  slate: ['#EAEDF2', '#465167', '#D3DBE7', '#292F3C', '#C2CCDD', '#3E475A'],
}

const drawings = {
  income: [
    'green',
    (_c, f) =>
      `<path fill="${f}" d="M17 28h31v21H17z"/><path d="M17 28h31v21H17zM18 29v-7h23v6"/><path d="M38 37h10v6H38z"/><path d="M27 29V15m-6 6 6-6 6 6"/>`,
  ],
  groceries: [
    'green',
    (c, f) =>
      `<path fill="${f}" d="m16 29 5 21h25l5-21z"/><path d="m16 29 5 21h25l5-21zM25 29l7-13m8 13-7-13M26 36v8m7-8v8m7-8v8"/><path fill="${c}" stroke="none" d="M41 19c6-1 9 1 9 5-5 1-8 0-9-5Z"/>`,
  ],
  shopping: [
    'violet',
    (_c, f) =>
      `<path fill="${f}" d="M20 24h27l3 27H17z"/><path d="M20 24h27l3 27H17zM27 27V20a6 6 0 0 1 12 0v7"/><path d="m27 38 4 4 8-8"/>`,
  ],
  food: [
    'orange',
    (_c, f) =>
      `<circle fill="${f}" cx="35" cy="33" r="14"/><circle cx="35" cy="33" r="14"/><path d="M15 16v12m-4-12v9a4 4 0 0 0 8 0v-9m-4 13v21M53 17v33m0-33c-5 4-6 10-6 17h6"/>`,
  ],
  transport: [
    'blue',
    (c, f) =>
      `<path fill="${f}" d="m21 20-5 14v12h34V34l-5-14z"/><path d="m21 20-5 14v12h34V34l-5-14zM18 33h30M22 46v5m22-5v5"/><path fill="${c}" stroke="none" d="M22 37h5v4h-5zm17 0h5v4h-5z"/>`,
  ],
  utilities: [
    'sand',
    (_c, f) =>
      `<path fill="${f}" d="M20 29v22h27V29L33 16z"/><path d="m14 30 19-18 19 18M20 29v22h27V29M28 51V37h10v14M43 16h5v10"/>`,
  ],
  subscriptions: [
    'blue',
    (_c, f) =>
      `<rect fill="${f}" x="16" y="18" width="34" height="30" rx="7"/><rect x="16" y="18" width="34" height="30" rx="7"/><path d="m29 26 10 7-10 7zM24 53h19"/>`,
  ],
  health: [
    'teal',
    (_c, f) =>
      `<rect fill="${f}" x="16" y="24" width="35" height="27" rx="6"/><rect x="16" y="24" width="35" height="27" rx="6"/><path d="M27 24v-5h13v5M28 37h11m-6-5v10"/>`,
  ],
  travel: [
    'violet',
    (_c, f) =>
      `<rect fill="${f}" x="20" y="23" width="29" height="28" rx="5"/><rect x="20" y="23" width="29" height="28" rx="5"/><path d="M28 23v-6h13v6M28 29v15m13-15v15M26 51v3m17-3v3"/><path d="m13 25 3-5m-4-3 5 3"/>`,
  ],
  transfer: ['blue', (_c, _f) => `<path d="M15 24h35m-9-9 9 9-9 9M50 43H15m9-9-9 9 9 9"/>`],
  uncategorised: [
    'sand',
    (c, f) =>
      `<rect fill="${f}" x="19" y="15" width="28" height="37" rx="5"/><rect x="19" y="15" width="28" height="37" rx="5"/><path d="M27 29a6 6 0 0 1 12 0c0 5-6 4-6 10"/><circle fill="${c}" stroke="none" cx="33" cy="44" r="1.6"/>`,
  ],
  bank: [
    'blue',
    (_c, f) =>
      `<path fill="${f}" d="m14 27 19-13 19 13z"/><path d="m14 27 19-13 19 13zM17 48h32M13 53h40M21 32v16m12-16v16m12-16v16"/>`,
  ],
  cash: [
    'green',
    (_c, f) =>
      `<path fill="${f}" d="M14 24h39v25H14z"/><path d="M14 24h39v25H14zM21 19h25M22 14h23"/><circle cx="33" cy="36" r="6"/><path d="M19 29h3m23 15h3"/>`,
  ],
  card: [
    'slate',
    (_c, f) =>
      `<rect fill="${f}" x="17" y="25" width="37" height="24" rx="5"/><rect x="17" y="25" width="37" height="24" rx="5"/><path d="M12 34V20a5 5 0 0 1 5-5h28M17 32h37M24 41h8m14 0h2"/>`,
  ],
  savings: [
    'violet',
    (_c, f) =>
      `<path fill="${f}" d="M22 29h24l4 9v13H18V38z"/><path d="M22 29h24l4 9v13H18V38zM22 29h24M25 35h18"/><circle cx="34" cy="18" r="8"/><path d="M34 15v6m-2-3h4"/>`,
  ],
  search: [
    'slate',
    (_c, f) =>
      `<circle fill="${f}" cx="29" cy="29" r="13"/><circle cx="29" cy="29" r="13"/><path d="m39 39 13 13"/>`,
  ],
  review: [
    'sand',
    (_c, f) =>
      `<rect fill="${f}" x="19" y="20" width="28" height="33" rx="5"/><rect x="19" y="20" width="28" height="33" rx="5"/><path fill="${f}" d="M26 15h14v9H26z"/><path d="M26 15h14v9H26zM26 37l5 5 10-11"/>`,
  ],
  settings: [
    'slate',
    (_c, f) =>
      `<path fill="${f}" d="m29 14 8 0 2 6 5 3 6-1 4 7-4 5v6l4 4-4 7-6-1-5 3-2 6h-8l-2-6-5-3-6 1-4-7 4-4v-6l-4-5 4-7 6 1 5-3z" transform="translate(0 -4)"/><path d="m29 14 8 0 2 6 5 3 6-1 4 7-4 5v6l4 4-4 7-6-1-5 3-2 6h-8l-2-6-5-3-6 1-4-7 4-4v-6l-4-5 4-7 6 1 5-3z" transform="translate(0 -4)"/><circle cx="33" cy="32" r="8"/>`,
  ],
  recurring: [
    'blue',
    (_c, _f) =>
      `<path d="M16 28a18 18 0 0 1 32-8m-2-9 2 9-9-1M50 37a18 18 0 0 1-32 9m2 9-2-9 9 1M33 23v11l7 4"/>`,
  ],
  wallet: [
    'blue',
    (c, f) =>
      `<path fill="${f}" d="M15 23h36v27H15z"/><path d="M15 23h36v27H15zM15 23v-6h29v6M39 33h12v10H39z"/><circle fill="${c}" stroke="none" cx="43" cy="38" r="1.6"/>`,
  ],
  filter: [
    'slate',
    (_c, f) =>
      `<path d="M15 21h34M15 33h34M15 45h34"/><circle fill="${f}" cx="25" cy="21" r="4"/><circle fill="${f}" cx="40" cy="33" r="4"/><circle fill="${f}" cx="28" cy="45" r="4"/>`,
  ],
  plus: ['blue', (_c, _f) => `<path d="M33 17v32M17 33h32"/>`],
  link: [
    'blue',
    (_c, _f) =>
      `<path d="m30 23 7-7a9 9 0 0 1 13 13l-8 8a9 9 0 0 1-13 0M36 43l-7 7a9 9 0 0 1-13-13l8-8a9 9 0 0 1 13 0M25 41l16-16"/>`,
  ],
}

function svgFor(key, mode) {
  const [palette, draw] = drawings[key]
  const p = palettes[palette]
  const dark = mode === 'dark'
  const background = p[dark ? 3 : 0]
  const ink = p[dark ? 4 : 1]
  const fill = mode === 'bare' ? 'none' : p[dark ? 5 : 2]
  const backdrop =
    mode === 'bare' ? '' : `<rect width="64" height="64" rx="21" fill="${background}"/>`
  const viewBox = mode === 'bare' ? '10 10 46 46' : '0 0 64 64'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${backdrop}<g fill="none" stroke="${ink}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${draw(ink, fill)}</g></svg>`
}

for (const key of Object.keys(drawings)) {
  for (const mode of ['light', 'dark', 'bare']) {
    const svg = svgFor(key, mode)
    fs.writeFileSync(path.join(destination, `${key}-${mode}.svg`), `${svg}\n`)
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 192 } }).render().asPng()
    fs.writeFileSync(path.join(destination, `${key}-${mode}.png`), png)
  }
}

// Home deliberately shares the recognizable home-and-roof category pictogram.
const aliases = { home: 'utilities' }
const keys = [...Object.keys(drawings), ...Object.keys(aliases)]
const registry = [
  '// Generated by tools/finance-visuals/build.mjs. Metro needs literal asset paths.',
  "import type { ImageSourcePropType } from 'react-native'",
  '',
  'export const financeAssets = {',
]
for (const mode of ['light', 'dark', 'bare']) {
  registry.push(`  ${mode}: {`)
  for (const key of keys) {
    registry.push(
      `    ${key}: require('../assets/finance/${aliases[key] ?? key}-${mode}.png') as ImageSourcePropType,`,
    )
  }
  registry.push('  },')
}
registry.push('} as const', '', 'export type FinanceArtwork = keyof typeof financeAssets.light', '')
fs.writeFileSync(path.join(root, 'apps/mobile/src/finance-assets.ts'), registry.join('\n'))
const columns = 6
const cellWidth = 150
const cellHeight = 124
const sheetWidth = columns * cellWidth
const rows = Math.ceil(keys.length / columns)
const sheetHeight = rows * cellHeight + 48
const tiles = keys
  .map((key, index) => {
    const artwork = svgFor(aliases[key] ?? key, 'light')
    const inner = artwork.slice(artwork.indexOf('>') + 1, artwork.lastIndexOf('</svg>'))
    const x = (index % columns) * cellWidth
    const y = Math.floor(index / columns) * cellHeight + 28
    return `<svg x="${x + 43}" y="${y}" width="64" height="64" viewBox="0 0 64 64">${inner}</svg><text x="${x + 75}" y="${y + 87}" text-anchor="middle" font-size="14" fill="#515154">${key}</text>`
  })
  .join('')
const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${sheetHeight}" viewBox="0 0 ${sheetWidth} ${sheetHeight}"><rect width="100%" height="100%" fill="#F5F5F7"/><g font-family="Geist">${tiles}</g></svg>`
const fontPath = path.join(root, 'packages/brand/fonts/Geist-Regular.ttf')
fs.writeFileSync(
  path.join(destination, 'contact-sheet.png'),
  new Resvg(sheet, {
    font: { fontFiles: [fontPath], loadSystemFonts: false, defaultFontFamily: 'Geist' },
  })
    .render()
    .asPng(),
)
console.log(
  `Rendered ${Object.keys(drawings).length} original pictograms in light, dark and bare variants.`,
)
