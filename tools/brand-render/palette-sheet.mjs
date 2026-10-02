// Usage: node palette-sheet.mjs palette.json out.png
// Renders swatches for each role (light + dark) and a mock "home" card + transaction rows in both themes
// using the palette, so a judge can see the palette applied to real UI, with large amounts.
import fs from 'node:fs'
import { contrast, esc, renderSvg } from './lib.mjs'

const [, , input, output] = process.argv
if (!input || !output) {
  console.error('usage: node palette-sheet.mjs palette.json out.png')
  process.exit(1)
}
const pal = JSON.parse(fs.readFileSync(input, 'utf8'))
const font = pal.font || 'Geist'
const W = 1400
const themes = ['light', 'dark'].filter((t) => pal[t])
const swatchW = 150,
  swatchH = 86,
  perRow = 8

function mock(t, x0, y0) {
  const g = (k, d) => t[k] || d
  const bg = g('background', '#fff'),
    sf = g('surface', '#fff'),
    tp = g('textPrimary', '#111'),
    ts = g('textSecondary', '#666')
  const pr = g('primary', '#333'),
    onPr = g('onPrimary', '#fff'),
    br = g('border', '#ddd'),
    ac = g('accent', pr)
  const ok = g('success', '#2a7'),
    warn = g('warning', '#c80'),
    dn = g('danger', '#c33')
  const rows = [
    ['Esselunga', 'Spesa · oggi', '-€ 84,30', tp],
    ['Netflix', 'Abbonamento · 1 ott', '-€ 15,99', tp],
    ['Stipendio Acme S.r.l.', 'Entrata · 27 set', '+€ 2.350,00', ok],
    ['Bonifico a Conto Risparmio', 'Trasferimento', '€ 500,00', ts],
    ['Rimborso Amazon', 'Rimborso · 25 set', '+€ 29,90', ok],
  ]
  let s = `<rect x="${x0}" y="${y0}" width="420" height="760" rx="36" fill="${bg}"/>`
  s += `<text x="${x0 + 28}" y="${y0 + 56}" font-family="${font}" font-size="15" fill="${ts}">Saldo totale</text>`
  s += `<text x="${x0 + 28}" y="${y0 + 100}" font-family="${font}" font-size="40" font-weight="600" fill="${tp}">€ 12.438,72</text>`
  s += `<rect x="${x0 + 28}" y="${y0 + 128}" width="364" height="112" rx="20" fill="${sf}" stroke="${br}"/>`
  s += `<text x="${x0 + 48}" y="${y0 + 160}" font-family="${font}" font-size="14" fill="${ts}">Questo mese</text>`
  s += `<text x="${x0 + 48}" y="${y0 + 196}" font-family="${font}" font-size="26" font-weight="600" fill="${tp}">€ 1.284,10</text>`
  s += `<text x="${x0 + 372}" y="${y0 + 196}" text-anchor="end" font-family="${font}" font-size="14" fill="${warn}">+12% vs media</text>`
  s += `<rect x="${x0 + 48}" y="${y0 + 212}" width="324" height="8" rx="4" fill="${br}"/><rect x="${x0 + 48}" y="${y0 + 212}" width="210" height="8" rx="4" fill="${pr}"/>`
  s += `<rect x="${x0 + 28}" y="${y0 + 256}" width="364" height="56" rx="16" fill="${ac}" opacity="0.14"/>`
  s += `<text x="${x0 + 48}" y="${y0 + 290}" font-family="${font}" font-size="15" font-weight="500" fill="${tp}">3 movimenti da controllare</text>`
  s += `<text x="${x0 + 372}" y="${y0 + 290}" text-anchor="end" font-family="${font}" font-size="15" font-weight="600" fill="${pr}">Controlla</text>`
  let y = y0 + 340
  for (const [m, sub, amt, col] of rows) {
    s += `<circle cx="${x0 + 50}" cy="${y + 16}" r="18" fill="${sf}" stroke="${br}"/>`
    s += `<text x="${x0 + 80}" y="${y + 12}" font-family="${font}" font-size="16" font-weight="500" fill="${tp}">${esc(m)}</text>`
    s += `<text x="${x0 + 80}" y="${y + 32}" font-family="${font}" font-size="13" fill="${ts}">${esc(sub)}</text>`
    s += `<text x="${x0 + 388}" y="${y + 20}" text-anchor="end" font-family="${font}" font-size="16" font-weight="600" fill="${col}">${esc(amt)}</text>`
    y += 64
  }
  s += `<rect x="${x0 + 28}" y="${y0 + 680}" width="364" height="52" rx="26" fill="${pr}"/>`
  s += `<text x="${x0 + 210}" y="${y0 + 713}" text-anchor="middle" font-family="${font}" font-size="16" font-weight="600" fill="${onPr}">Collega un conto</text>`
  s += `<text x="${x0 + 28}" y="${y0 + 752}" font-family="${font}" font-size="12" fill="${dn}">Il collegamento con Intesa deve essere rinnovato</text>`
  return s
}

let body = '',
  y = 24
const roleRows = Math.max(...themes.map((t) => Math.ceil(Object.keys(pal[t]).length / perRow)))
const swatchBlockH = roleRows * (swatchH + 12) + 40
const H = 24 + themes.length * (swatchBlockH + 20) + 800
body += `<rect width="${W}" height="${H}" fill="#9A9AA3"/>`
body += `<text x="24" y="${y + 16}" font-family="Geist" font-size="22" font-weight="600" fill="#111">${esc(pal.name || input)}</text>`
y += 36
for (const t of themes) {
  const roles = Object.entries(pal[t])
  body += `<text x="24" y="${y + 14}" font-family="Geist" font-size="15" font-weight="600" fill="#111">${t}</text>`
  y += 24
  roles.forEach(([k, v], i) => {
    const x = 24 + (i % perRow) * (swatchW + 12),
      yy = y + Math.floor(i / perRow) * (swatchH + 12)
    const lab = contrast('#111111', v) > contrast('#FFFFFF', v) ? '#111111' : '#FFFFFF'
    body += `<rect x="${x}" y="${yy}" width="${swatchW}" height="${swatchH}" rx="10" fill="${v}"/>`
    body += `<text x="${x + 10}" y="${yy + 22}" font-family="Geist" font-size="12" font-weight="600" fill="${lab}">${esc(k)}</text>`
    body += `<text x="${x + 10}" y="${yy + 42}" font-family="GeistMono" font-size="12" fill="${lab}">${esc(v)}</text>`
    const bg = pal[t].background
    if (bg && k !== 'background')
      body += `<text x="${x + 10}" y="${yy + 64}" font-family="Geist" font-size="11" fill="${lab}">${contrast(v, bg).toFixed(2)}:1 vs bg</text>`
  })
  y += roleRows * (swatchH + 12) + 20
}
themes.forEach((t, i) => {
  body += mock(pal[t], 24 + i * 460, y)
})
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`
fs.writeFileSync(output, renderSvg(svg))
console.log('wrote', output)
