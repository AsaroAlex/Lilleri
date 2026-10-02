// Usage: node shelf.mjs <icon.svg> <out.png> [--seed 7] [--label "Lilleri"]
// "Would I recognise Lilleri among 30 finance apps?" test.
// Composes a 6x5 phone-like home-screen grid of 29 procedurally generated generic finance-app
// icons (NOT competitor logos: coloured rounded squares with letters, dots, bars, arrows,
// coins, cards, chart shapes in the hues that dominate the category) plus the candidate icon
// at a seeded random position. Icons are 60px (iOS size at 1x); rendered at 2x for sharpness.
import fs from 'node:fs'
import { esc, place, readSvg, renderSvg } from './lib.mjs'

const [, , input, output, ...rest] = process.argv
if (!input || !output) {
  console.error('usage: node shelf.mjs <icon.svg> <out.png> [--seed N] [--label L]')
  process.exit(1)
}
const opt = (n, d) => {
  const i = rest.indexOf(n)
  return i >= 0 ? rest[i + 1] : d
}
const seed = Number(opt('--seed', 7))
const label = opt('--label', 'Lilleri')
let s = seed * 9301 + 49297
const rnd = () => {
  s = (s * 9301 + 49297) % 233280
  return s / 233280
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]

const hues = [
  '#1A56DB',
  '#0052CC',
  '#2563EB',
  '#0EA5E9',
  '#1E3A8A',
  '#00B9FF',
  '#16A34A',
  '#22C55E',
  '#059669',
  '#7C3AED',
  '#6D28D9',
  '#8B5CF6',
  '#EC4899',
  '#F43F5E',
  '#F59E0B',
  '#111111',
  '#000000',
  '#1F2937',
  '#DC2626',
  '#0F766E',
  '#0891B2',
  '#FACC15',
  '#CCFF00',
  '#FFB3C7',
  '#4F46E5',
  '#2DD4BF',
  '#FB923C',
  '#1E40AF',
  '#047857',
]
const names = [
  'Bank',
  'Pay',
  'Cash',
  'Wallet',
  'Budget',
  'Coin',
  'Money',
  'Save',
  'Spend',
  'Fin',
  'Card',
  'Invest',
  'Trade',
  'Split',
  'Plan',
  'Track',
  'Vault',
  'Fund',
  'Credit',
  'Buddy',
  'Ledger',
  'Nest',
  'Flow',
  'Pocket',
  'Mint',
  'Zen',
  'Count',
  'Numa',
  'Stash',
  'Yield',
]

function genericIcon(i) {
  const bg = pick(hues)
  const light = ['#FACC15', '#CCFF00', '#FFB3C7', '#2DD4BF', '#22C55E'].includes(bg)
  const fg = light ? '#111111' : '#FFFFFF'
  const kind = i % 8
  const name = names[i % names.length]
  let glyph = ''
  switch (kind) {
    case 0:
      glyph = `<text x="50" y="68" text-anchor="middle" font-family="Geist" font-weight="700" font-size="52" fill="${fg}">${name[0]}</text>`
      break
    case 1:
      glyph = `<rect x="22" y="56" width="12" height="22" rx="3" fill="${fg}"/><rect x="44" y="40" width="12" height="38" rx="3" fill="${fg}"/><rect x="66" y="26" width="12" height="52" rx="3" fill="${fg}"/>`
      break
    case 2:
      glyph = `<circle cx="50" cy="50" r="24" fill="none" stroke="${fg}" stroke-width="8"/><text x="50" y="59" text-anchor="middle" font-family="Geist" font-weight="700" font-size="26" fill="${fg}">€</text>`
      break
    case 3:
      glyph = `<rect x="20" y="32" width="60" height="38" rx="6" fill="${fg}"/><rect x="20" y="42" width="60" height="8" fill="${bg}"/>`
      break
    case 4:
      glyph = `<path d="M22 70 L42 48 L56 60 L78 32" fill="none" stroke="${fg}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`
      break
    case 5:
      glyph = `<circle cx="36" cy="50" r="14" fill="${fg}"/><circle cx="64" cy="50" r="14" fill="${fg}" opacity="0.6"/>`
      break
    case 6:
      glyph = `<text x="50" y="66" text-anchor="middle" font-family="Geist" font-weight="800" font-size="40" fill="${fg}" letter-spacing="-2">${name.slice(0, 2).toLowerCase()}</text>`
      break
    default:
      glyph = `<path d="M30 30 h40 v40 h-40 z" fill="none" stroke="${fg}" stroke-width="8" stroke-linejoin="round"/><circle cx="50" cy="50" r="7" fill="${fg}"/>`
  }
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${bg}"/>${glyph}</svg>`,
    name,
  }
}

const cols = 6,
  rows = 5,
  icon = 60,
  gapX = 36,
  gapY = 44,
  padX = 30,
  padY = 60,
  labelH = 16
const W = padX * 2 + cols * icon + (cols - 1) * gapX
const H = padY * 2 + rows * (icon + labelH) + (rows - 1) * gapY
const candidate = readSvg(input)
const slot = Math.floor(rnd() * cols * rows)
let body = `<rect width="${W}" height="${H}" fill="#101014"/>`
let n = 0
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const idx = r * cols + c
    const x = padX + c * (icon + gapX),
      y = padY + r * (icon + labelH + gapY)
    let svg, name
    if (idx === slot) {
      svg = candidate
      name = label
    } else {
      ;({ svg, name } = genericIcon(n++))
    }
    // iOS mask: nested svg with rounded clip
    body += `<clipPath id="m${idx}"><rect x="${x}" y="${y}" width="${icon}" height="${icon}" rx="13.4"/></clipPath><g clip-path="url(#m${idx})">${place(svg, x, y, icon, icon)}</g>`
    body += `<text x="${x + icon / 2}" y="${y + icon + 13}" text-anchor="middle" font-family="Geist" font-size="11" fill="#FFFFFF">${esc(name)}</text>`
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`
fs.writeFileSync(output, renderSvg(svg, { width: W * 2 }))
console.log('wrote', output, 'candidate at slot', slot)
