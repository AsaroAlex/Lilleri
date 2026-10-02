// Usage: node icon-sheet.mjs <icon.svg> <out.png> [--title "Direction A"]
// Renders a square icon SVG (any viewBox) at 1024/512/256/128/64/48/32/24/16 px on light and dark
// backgrounds, with labels, so the result can be judged at real sizes (sheet is rendered 1:1).
import fs from 'node:fs'
import { esc, place, readSvg, renderSvg } from './lib.mjs'

const [, , input, output, ...rest] = process.argv
if (!input || !output) {
  console.error('usage: node icon-sheet.mjs <icon.svg> <out.png> [--title T]')
  process.exit(1)
}
const ti = rest.indexOf('--title')
const title = ti >= 0 ? rest[ti + 1] : input
const icon = readSvg(input)
const sizes = [256, 128, 64, 48, 32, 24, 16]
const pad = 24
const rowH = 256 + 56
const W = 1240
const rows = [
  { bg: '#FFFFFF', fg: '#222222', label: 'light' },
  { bg: '#0E0E10', fg: '#DDDDDD', label: 'dark' },
  { bg: '#F2F2F7', fg: '#222222', label: 'iOS home (light)' },
  { bg: '#1C1C1E', fg: '#DDDDDD', label: 'iOS home (dark)' },
]
let y = 48
let body = `<rect width="${W}" height="${48 + rows.length * (rowH + pad)}" fill="#E9E9EE"/>
<text x="${pad}" y="32" font-family="Geist" font-size="20" font-weight="600" fill="#111">${esc(title)} — icon sheet (1:1 px)</text>`
for (const r of rows) {
  body += `<rect x="0" y="${y}" width="${W}" height="${rowH}" fill="${r.bg}"/>`
  let x = pad
  for (const s of sizes) {
    const cy = y + 16 + (256 - s) / 2
    body += place(icon, x, cy, s, s)
    body += `<text x="${x + s / 2}" y="${y + 16 + 256 + 24}" text-anchor="middle" font-family="Geist" font-size="13" fill="${r.fg}">${s}px</text>`
    x += s + (s >= 128 ? 40 : 28)
  }
  body += `<text x="${W - pad}" y="${y + 24}" text-anchor="end" font-family="Geist" font-size="13" fill="${r.fg}">${esc(r.label)}</text>`
  y += rowH + pad
}
const H = y
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`
fs.writeFileSync(output, renderSvg(svg))
console.log('wrote', output)
