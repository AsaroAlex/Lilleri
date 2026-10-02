// Build script for the colour-territory exploration.
// Usage: node build.mjs [t1.json t2.json t3.json]   (defaults to all three next to this file)
//
// For each palette it:
//   1. runs the shared contrast matrix (brandtools/contrast.mjs) on the canonical JSON;
//   2. checks the roles the shared tool does not cover: positive/negative amounts, chart colours,
//      onPrimary, and a few "must not collide" pairs (primary vs danger/negative, primary vs positive);
//   3. renders the shared palette sheet (brandtools/palette-sheet.mjs) from a temporary copy without the
//      `chart` arrays — that tool iterates every key as a hex and cannot render an array;
//   4. renders t<N>-semantics.png: amounts with sign + label, status chips, the six chart colours as a
//      stacked bar with legend, and a protanopia/deuteranopia simulation of the colours that carry meaning.
//
// The brand toolkit lives in the session scratchpad; override with BRANDTOOLS=/path if it moves.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const TOOLS = process.env.BRANDTOOLS || '/tmp/claude-0/-home-user-Lilleri/aa688b9e-d7be-59d9-9317-1813d675187c/scratchpad/brandtools'
const { renderSvg, contrast, esc } = await import(path.join(TOOLS, 'lib.mjs'))

const inputs = process.argv.slice(2).length ? process.argv.slice(2) : ['t1.json', 't2.json', 't3.json'].map(f => path.join(here, f))

// --- colour maths (OKLab + Machado 2009 CVD simulation, same model as the dataviz validator) ---
const s2lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
const lin2s = c => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const linOf = hex => { const h = hex.slice(1); return [0, 2, 4].map(i => s2lin(parseInt(h.slice(i, i + 2), 16) / 255)) }
const hexOf = lin => '#' + lin.map(v => Math.round(lin2s(v) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
}
const simulate = (hex, kind) => { const l = linOf(hex); return hexOf(MACHADO[kind].map(r => r[0] * l[0] + r[1] * l[1] + r[2] * l[2])) }
function oklab(hex) {
  const [r, g, b] = linOf(hex)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]
}
const dE = (a, b, kind) => { const x = oklab(kind ? simulate(a, kind) : a), y = oklab(kind ? simulate(b, kind) : b); return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) }
const lvl = r => r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA-large' : 'FAIL'

for (const input of inputs) {
  const pal = JSON.parse(fs.readFileSync(input, 'utf8'))
  const base = path.basename(input, '.json')
  const outDir = path.dirname(input)
  console.log(`\n################ ${pal.name}`)

  // 1. shared contrast matrix
  console.log(execFileSync('node', [path.join(TOOLS, 'contrast.mjs'), input], { encoding: 'utf8' }))

  // 2. extra checks
  for (const theme of ['light', 'dark']) {
    const t = pal[theme]
    console.log(`-- extra checks (${theme})`)
    for (const role of ['positive', 'negative']) for (const sf of ['background', 'surface', 'surfaceElevated']) {
      const r = contrast(t[role], t[sf]); console.log(`  ${role.padEnd(9)} on ${sf.padEnd(15)} ${r.toFixed(2)}  ${lvl(r)}`)
    }
    const r = contrast(t.onPrimary, t.primary); console.log(`  onPrimary on primary        ${r.toFixed(2)}  ${lvl(r)}`)
    t.chart.forEach((c, i) => { const r = contrast(c, t.background); console.log(`  chart[${i}] ${c} on background ${r.toFixed(2)}  ${r >= 3 ? 'ok (>=3:1 mark)' : 'needs label/table relief'}`) })
    for (const [a, b] of [['primary', 'danger'], ['primary', 'negative'], ['primary', 'positive'], ['positive', 'negative'], ['primary', 'warning']]) {
      console.log(`  ΔE ${a}↔${b}: normal ${dE(t[a], t[b]).toFixed(1)} · protan ${dE(t[a], t[b], 'protan').toFixed(1)} · deutan ${dE(t[a], t[b], 'deutan').toFixed(1)}`)
    }
  }

  // 3. shared palette sheet, from a copy without arrays
  const stripped = JSON.parse(JSON.stringify(pal))
  for (const theme of ['light', 'dark']) delete stripped[theme].chart
  const tmp = path.join(os.tmpdir(), `${base}-nochart.json`)
  fs.writeFileSync(tmp, JSON.stringify(stripped))
  execFileSync('node', [path.join(TOOLS, 'palette-sheet.mjs'), tmp, path.join(outDir, `${base}.png`)], { stdio: 'inherit' })

  // 4. semantics sheet
  const font = pal.font || 'Geist'
  const W = 1400, colW = 660
  function panel(t, x0, y0) {
    let s = `<rect x="${x0}" y="${y0}" width="${colW}" height="900" rx="24" fill="${t.background}"/>`
    const tx = x0 + 32
    s += `<text x="${tx}" y="${y0 + 44}" font-family="${font}" font-size="18" font-weight="600" fill="${t.textPrimary}">Movimenti — segno + etichetta + colore</text>`
    const rows = [
      ['Stipendio Acme S.r.l.', 'Entrata · 27 set', '+1.250,00 €', t.positive],
      ['Esselunga', 'Spesa · oggi', '−84,30 €', t.textPrimary],
      ['Bonifico a Conto Risparmio', 'Trasferimento tra tuoi conti', '500,00 €', t.textSecondary],
      ['Scoperto Conto Fineco', 'Saldo negativo · da controllare', '−312,40 €', t.negative],
      ['Rimborso Amazon', 'Rimborso · 25 set', '+29,90 €', t.positive],
    ]
    let y = y0 + 80
    for (const [m, sub, amt, col] of rows) {
      s += `<rect x="${tx}" y="${y - 8}" width="${colW - 64}" height="56" rx="14" fill="${t.surface}" stroke="${t.border}"/>`
      s += `<text x="${tx + 16}" y="${y + 16}" font-family="${font}" font-size="15" font-weight="500" fill="${t.textPrimary}">${esc(m)}</text>`
      s += `<text x="${tx + 16}" y="${y + 36}" font-family="${font}" font-size="12" fill="${t.textSecondary}">${esc(sub)}</text>`
      s += `<text x="${x0 + colW - 48}" y="${y + 26}" text-anchor="end" font-family="${font}" font-size="16" font-weight="600" fill="${col}">${esc(amt)}</text>`
      y += 64
    }
    y += 24
    s += `<text x="${tx}" y="${y}" font-family="${font}" font-size="18" font-weight="600" fill="${t.textPrimary}">Stati — sempre con icona e testo</text>`
    y += 20
    const chips = [['success', 'Collegato', '✓'], ['warning', 'Consenso scade il 14 mar', '!'], ['danger', 'Intesa non risponde dalle 9:10', '×'], ['info', 'Riproviamo alle 13:00', 'i']]
    let cx = tx
    for (const [role, label, glyph] of chips) {
      const wdt = 14 + label.length * 7.6 + 30
      s += `<rect x="${cx}" y="${y}" width="${wdt}" height="34" rx="17" fill="${t[role]}" opacity="0.14"/>`
      s += `<circle cx="${cx + 18}" cy="${y + 17}" r="8" fill="${t[role]}"/><text x="${cx + 18}" y="${y + 21}" text-anchor="middle" font-family="${font}" font-size="11" font-weight="700" fill="${t.background}">${glyph}</text>`
      s += `<text x="${cx + 32}" y="${y + 22}" font-family="${font}" font-size="13" font-weight="500" fill="${t[role]}">${esc(label)}</text>`
      cx += wdt + 10
      if (cx > x0 + colW - 200) { cx = tx; y += 42 }
    }
    y += 70
    s += `<text x="${tx}" y="${y}" font-family="${font}" font-size="18" font-weight="600" fill="${t.textPrimary}">Categorie — sei colori, ordine fisso</text>`
    y += 20
    const cats = ['Casa', 'Spesa', 'Trasporti', 'Ristoranti', 'Salute', 'Altro']
    const vals = [38, 22, 14, 11, 9, 6]
    let bx = tx
    const barW = colW - 64
    vals.forEach((v, i) => {
      const w = Math.round(barW * v / 100) - 2
      s += `<rect x="${bx}" y="${y}" width="${w}" height="28" rx="${i === 0 ? 6 : 0}" fill="${t.chart[i]}"/>`
      bx += w + 2
    })
    y += 48
    cats.forEach((c, i) => {
      const lx = tx + (i % 3) * 200, ly = y + Math.floor(i / 3) * 28
      s += `<rect x="${lx}" y="${ly - 11}" width="14" height="14" rx="4" fill="${t.chart[i]}"/>`
      s += `<text x="${lx + 22}" y="${ly}" font-family="${font}" font-size="13" fill="${t.textPrimary}">${esc(c)}</text><text x="${lx + 110}" y="${ly}" font-family="${font}" font-size="13" fill="${t.textSecondary}">${vals[i]} %</text>`
    })
    y += 70
    s += `<text x="${tx}" y="${y}" font-family="${font}" font-size="18" font-weight="600" fill="${t.textPrimary}">Simulazione daltonismo</text>`
    y += 14
    const roles = ['primary', 'positive', 'negative', 'danger', 'warning', 'success']
    const kinds = [['normale', null], ['protanopia', 'protan'], ['deuteranopia', 'deutan']]
    roles.forEach((r, ri) => {
      s += `<text x="${tx + 148 + ri * 84}" y="${y + 12}" text-anchor="middle" font-family="${font}" font-size="11" fill="${t.textTertiary}">${r}</text>`
    })
    kinds.forEach(([name, kind], ki) => {
      const yy = y + 18 + ki * 44
      s += `<text x="${tx}" y="${yy + 26}" font-family="${font}" font-size="12" fill="${t.textSecondary}">${name}</text>`
      roles.forEach((r, ri) => {
        const c = kind ? simulate(t[r], kind) : t[r]
        s += `<rect x="${tx + 110 + ri * 84}" y="${yy + 6}" width="76" height="30" rx="8" fill="${c}"/>`
      })
    })
    return s
  }
  const H = 980
  let body = `<rect width="${W}" height="${H}" fill="#9A9AA3"/>`
  body += `<text x="24" y="36" font-family="Geist" font-size="20" font-weight="600" fill="#111">${esc(pal.name)} — semantics</text>`
  body += panel(pal.light, 24, 56) + panel(pal.dark, 24 + colW + 32, 56)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`
  fs.writeFileSync(path.join(outDir, `${base}-semantics.png`), renderSvg(svg))
  console.log('wrote', path.join(outDir, `${base}-semantics.png`))
}
