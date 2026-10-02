import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { esc, place, renderSvg } from './lib.mjs'

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../packages/brand')
const pal = JSON.parse(fs.readFileSync(path.join(out, 'tokens/colors.json'), 'utf8'))
const text = (s, x, y, size, fill, weight = 400, extra = '') =>
  `<text x="${x}" y="${y}" font-family="Geist" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${esc(s)}</text>`
let body = `<rect width="1440" height="1380" fill="${pal.light.background}"/>`
body += place(
  fs.readFileSync(path.join(out, 'logo/lilleri-lockup-horizontal.svg'), 'utf8'),
  64,
  44,
  650,
  185,
)
body += place(
  fs.readFileSync(path.join(out, 'explorations/type/editorial-headline.svg'), 'utf8'),
  64,
  234,
  1312,
  100,
)
body += text(
  'Identity / UI concept · synthetic examples · expert evaluation, no user validation',
  64,
  352,
  19,
  pal.light.textSecondary,
)
function screen(c, x, heading) {
  const y = 420
  let s = `<rect x="${x}" y="${y}" width="430" height="862" rx="28" fill="${c.background}" stroke="${c.borderStrong}"/>`
  s += text(heading, x + 24, y + 38, 16, c.textSecondary, 500)
  s += text('Ciao, Giulia', x + 24, y + 92, 24, c.textPrimary, 600)
  s += text('Saldo dei conti dimostrativi', x + 24, y + 136, 14, c.textSecondary)
  s += text('12.438,72 €', x + 24, y + 184, 36, c.textPrimary, 500)
  s += text('Dati sintetici · aggiornato alle 09:42', x + 24, y + 215, 14, c.textTertiary)
  s += `<rect x="${x + 24}" y="${y + 249}" width="382" height="132" rx="20" fill="${c.surface}"/>`
  s += `<circle cx="${x + 48}" cy="${y + 277}" r="5" fill="${c.primary}"/>`
  s += text('5 movimenti da controllare', x + 62, y + 284, 18, c.textPrimary, 600)
  s += text('Una categoria manca. Decidi tu.', x + 44, y + 319, 14, c.textSecondary)
  s += text('Controlla i movimenti', x + 44, y + 356, 16, c.primary, 600)
  s += text('Questo mese', x + 24, y + 435, 18, c.textPrimary, 600)
  s += text('Spesa riconosciuta', x + 24, y + 469, 14, c.textSecondary)
  s += text('1.284,10 €', x + 24, y + 506, 26, c.textPrimary, 500)
  s += text('Trasferimenti interni esclusi', x + 24, y + 536, 14, c.textTertiary)
  const rows = [
    ['Esselunga', 'Alimentari · 2 ottobre', '−84,30 €', c.textPrimary],
    ['Stipendio dimostrativo', 'Entrata · 27 settembre', '+2.350,00 €', c.positive],
    ['Conto A → Conto B', 'Trasferimento · da confermare', '500,00 €', c.textPrimary],
  ]
  rows.forEach(([merchant, sub, amount, fill], i) => {
    const yy = y + 581 + i * 75
    s += `<circle cx="${x + 35}" cy="${yy + 8}" r="5" fill="${c.primary}"/>`
    s += text(merchant, x + 50, yy + 10, 16, c.textPrimary, 500)
    s += text(sub, x + 50, yy + 34, 14, c.textSecondary)
    s += text(amount, x + 398, yy + 10, 16, fill, 500, 'text-anchor="end"')
  })
  s += `<rect x="${x + 24}" y="${y + 800}" width="382" height="44" rx="22" fill="${c.primary}"/>`
  s += text('Esplora i movimenti', x + 215, y + 829, 16, c.onPrimary, 600, 'text-anchor="middle"')
  return s
}
body += screen(pal.light, 64, 'LIGHT · SCREEN WITHOUT THE LOGO')
body += screen(pal.dark, 540, 'DARK · SCREEN WITHOUT THE LOGO')
body += text('Geist', 1030, 460, 28, pal.light.textPrimary, 600)
body += text('UI · amounts · labels', 1030, 492, 16, pal.light.textSecondary)
body += place(
  fs.readFileSync(path.join(out, 'explorations/type/editorial-label.svg'), 'utf8'),
  1030,
  515,
  350,
  60,
)
body += text('Editorial only', 1030, 588, 16, pal.light.textSecondary)
;[
  ['primary', 'Wine'],
  ['textPrimary', 'Ink'],
  ['surface', 'Paper surface'],
  ['positive', 'Inflow'],
  ['danger', 'Error'],
].forEach(([role, label], i) => {
  const y = 650 + i * 100
  body += `<rect x="1030" y="${y}" width="60" height="60" rx="12" fill="${pal.light[role]}" stroke="${pal.light.border}"/>`
  body += text(label, 1110, y + 22, 16, pal.light.textPrimary, 500)
  body += text(pal.light[role], 1110, y + 49, 14, pal.light.textSecondary)
})
body += text('One glance.', 1030, 1200, 24, pal.light.textPrimary, 600)
body += text('One insight.', 1030, 1238, 24, pal.light.textPrimary, 600)
body += text('One action.', 1030, 1276, 24, pal.light.primary, 600)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 1380">${body}</svg>\n`
fs.writeFileSync(path.join(out, 'png/identity-board.svg'), svg)
fs.writeFileSync(path.join(out, 'png/identity-board.png'), renderSvg(svg))
console.log('Wrote final identity presentation board.')
