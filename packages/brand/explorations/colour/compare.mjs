// Renders territories-compare.png: the three territories side by side, light and dark, on the
// brand's hero moment (the empty Review Inbox), so the territories can be judged on the same screen.
// Usage: node compare.mjs   (reads t1/t2/t3.json next to this file)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here = path.dirname(fileURLToPath(import.meta.url))
const TOOLS = process.env.BRANDTOOLS || '/tmp/claude-0/-home-user-Lilleri/aa688b9e-d7be-59d9-9317-1813d675187c/scratchpad/brandtools'
const { renderSvg, esc } = await import(path.join(TOOLS, 'lib.mjs'))

const pals = ['t1', 't2', 't3'].map(n => JSON.parse(fs.readFileSync(path.join(here, `${n}.json`), 'utf8')))
const PW = 360, PH = 700, GAP = 28, PAD = 28
const W = PAD * 2 + 3 * PW + 2 * GAP, H = PAD * 2 + 2 * PH + GAP + 40
const font = 'Geist'

function phone(t, x, y, title) {
  let s = `<rect x="${x}" y="${y}" width="${PW}" height="${PH}" rx="32" fill="${t.background}"/>`
  const l = x + 24
  s += `<text x="${l}" y="${y + 52}" font-family="${font}" font-size="22" font-weight="600" letter-spacing="-0.5" fill="${t.textPrimary}">lilleri</text>`
  s += `<circle cx="${x + PW - 36}" cy="${y + 45}" r="14" fill="${t.surface}" stroke="${t.border}"/>`
  s += `<text x="${l}" y="${y + 100}" font-family="${font}" font-size="13" fill="${t.textSecondary}">Saldo di tutti i conti</text>`
  s += `<text x="${l}" y="${y + 140}" font-family="${font}" font-size="36" font-weight="600" letter-spacing="-1" fill="${t.textPrimary}">12.438,72 €</text>`
  // hero: empty inbox
  s += `<rect x="${l}" y="${y + 168}" width="${PW - 48}" height="118" rx="20" fill="${t.surface}" stroke="${t.border}"/>`
  s += `<circle cx="${l + 32}" cy="${y + 212}" r="14" fill="${t.primary}"/>`
  s += `<path d="M${l + 25} ${y + 212} l5 5 l9 -10" fill="none" stroke="${t.onPrimary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
  s += `<text x="${l + 58}" y="${y + 208}" font-family="${font}" font-size="17" font-weight="600" fill="${t.textPrimary}">Niente da fare oggi.</text>`
  s += `<text x="${l + 58}" y="${y + 230}" font-family="${font}" font-size="13" fill="${t.textSecondary}">Tutti i movimenti sono al loro posto.</text>`
  s += `<text x="${l + 58}" y="${y + 266}" font-family="${font}" font-size="13" font-weight="600" fill="${t.accent}">Vedi le regole</text>`
  // month card
  s += `<rect x="${l}" y="${y + 304}" width="${PW - 48}" height="96" rx="20" fill="${t.surface}" stroke="${t.border}"/>`
  s += `<text x="${l + 20}" y="${y + 332}" font-family="${font}" font-size="13" fill="${t.textSecondary}">Spese di ottobre</text>`
  s += `<text x="${l + 20}" y="${y + 362}" font-family="${font}" font-size="22" font-weight="600" fill="${t.textPrimary}">1.284,10 €</text>`
  s += `<text x="${x + PW - 44}" y="${y + 362}" text-anchor="end" font-family="${font}" font-size="12" fill="${t.textTertiary}">media 1.146,00 €</text>`
  let bx = l + 20
  const seg = [38, 22, 14, 11, 9, 6]
  seg.forEach((v, i) => { const w = Math.round((PW - 88) * v / 100) - 2; s += `<rect x="${bx}" y="${y + 376}" width="${w}" height="8" rx="${i === 0 ? 4 : 0}" fill="${t.chart[i]}"/>`; bx += w + 2 })
  // rows
  const rows = [['Esselunga', 'Spesa · oggi', '−84,30 €', t.textPrimary], ['Stipendio Acme S.r.l.', 'Entrata · 27 set', '+2.350,00 €', t.positive], ['Fineco → Intesa', 'Trasferimento tra tuoi conti', '500,00 €', t.textSecondary], ['TARI Comune di Firenze', 'Rata · scade il 16 ott', '−212,00 €', t.textPrimary]]
  let ry = y + 430
  for (const [m, sub, amt, col] of rows) {
    s += `<circle cx="${l + 18}" cy="${ry + 10}" r="16" fill="${t.surface}" stroke="${t.border}"/>`
    s += `<text x="${l + 46}" y="${ry + 6}" font-family="${font}" font-size="14" font-weight="500" fill="${t.textPrimary}">${esc(m)}</text>`
    s += `<text x="${l + 46}" y="${ry + 24}" font-family="${font}" font-size="12" fill="${t.textSecondary}">${esc(sub)}</text>`
    s += `<text x="${x + PW - 24}" y="${ry + 14}" text-anchor="end" font-family="${font}" font-size="14" font-weight="600" fill="${col}">${esc(amt)}</text>`
    ry += 56
  }
  // button + candid sync line
  s += `<rect x="${l}" y="${y + PH - 76}" width="${PW - 48}" height="48" rx="24" fill="${t.primary}"/>`
  s += `<text x="${x + PW / 2}" y="${y + PH - 46}" text-anchor="middle" font-family="${font}" font-size="15" font-weight="600" fill="${t.onPrimary}">Collega un conto</text>`
  s += `<text x="${x + PW / 2}" y="${y + PH - 12}" text-anchor="middle" font-family="${font}" font-size="11" fill="${t.textTertiary}">Sola lettura · consenso Intesa scade il 14 mar</text>`
  s += `<text x="${x}" y="${y - 10}" font-family="${font}" font-size="14" font-weight="600" fill="#111">${esc(title)}</text>`
  return s
}
let body = `<rect width="${W}" height="${H}" fill="#9A9AA3"/>`
pals.forEach((p, i) => {
  const x = PAD + i * (PW + GAP)
  body += phone(p.light, x, PAD + 30, `${p.name} — light`)
  body += phone(p.dark, x, PAD + 30 + PH + GAP + 10, `${p.name} — dark`)
})
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`
const out = path.join(here, 'territories-compare.png')
fs.writeFileSync(out, renderSvg(svg))
console.log('wrote', out)
