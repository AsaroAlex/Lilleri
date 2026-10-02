// Direction B build: writes SVG deliverables + composite iteration sheets. Renders are done by the toolkit afterwards.
import fs from 'node:fs'
import path from 'node:path'
import { renderSvg, place, esc } from '../brandtools/lib.mjs'
const OUT = process.argv[2] || '/home/user/Lilleri/packages/brand/explorations/direction-b'
fs.mkdirSync(OUT, { recursive: true })
const C = { amaranto: '#6E1F3B', rosa: '#D6A4AF', carta: '#F6F1E7', avorio: '#FBF8F2', cartaIcona: '#EFE7D8', inchiostro: '#1F1B17', notte: '#1E2030', notteChiara: '#2B2F4A', testoNotte: '#F3EFE6' }

// ---------- SYMBOL (1024 box, 8-unit grid) ----------
const top = 128, base = 896, S = 144, T = 136, ri = 40, run = 24, r = T / 2, rc = 16, G = 176, xh = 432, dotR = 88
const ro = ri + T, x0 = 280, cx = x0 + S + ri + run, ix = x0 + S + G, dotCx = ix + S / 2, dotCy = top + dotR
const lD = `M${x0} ${top + rc} A${rc} ${rc} 0 0 1 ${x0 + rc} ${top} H${x0 + S - rc} A${rc} ${rc} 0 0 1 ${x0 + S} ${top + rc} V${base - T - ri} A${ri} ${ri} 0 0 0 ${x0 + S + ri} ${base - T} H${cx} A${r} ${r} 0 0 1 ${cx} ${base} H${x0 + ro} A${ro} ${ro} 0 0 1 ${x0} ${base - ro} Z`
const iD = `M${ix} ${xh + rc} A${rc} ${rc} 0 0 1 ${ix + rc} ${xh} H${ix + S - rc} A${rc} ${rc} 0 0 1 ${ix + S} ${xh + rc} V${base} H${ix} Z`
const dotD = `M${dotCx - dotR} ${dotCy} A${dotR} ${dotR} 0 1 0 ${dotCx + dotR} ${dotCy} A${dotR} ${dotR} 0 1 0 ${dotCx - dotR} ${dotCy} Z`
const comment = `<!-- Lilleri, Direction B "li": the stem that settles (l, foot with one round terminal) and the stem that asks (i, the signature dot). 8-unit grid: stem ${S}, foot ${T}, inner radius ${ri}, run ${run}, terminal r ${r}, gap ${G}, i height ${base - xh}, dot r ${dotR}, top-corner radius ${rc}. -->`
const mark = (fill) => `<path d="${lD}" fill="${fill}"/><path d="${iD}" fill="${fill}"/><path d="${dotD}" fill="${fill}"/>`
const svg1024 = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">\n  ${comment}\n  ${inner}\n</svg>\n`
fs.writeFileSync(path.join(OUT, 'symbol.svg'), svg1024(mark(C.amaranto)))
fs.writeFileSync(path.join(OUT, 'symbol-mono.svg'), svg1024(mark('#000000')))
fs.writeFileSync(path.join(OUT, 'symbol-dark.svg'), svg1024(mark(C.rosa)))
// app icon: field + mark scaled to 0.62 of the field height (mark is 768 tall -> 635), centred
const k = 0.827, tx = 512 - 512 * k, ty = 512 - 512 * k
const iconSvg = (field, fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">\n  <!-- iOS-style app icon, no corner radius (the OS masks it). Field ${field}; mark scaled ${k} and centred. -->\n  <rect width="1024" height="1024" fill="${field}"/>\n  <g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${k})">${mark(fill)}</g>\n</svg>\n`
fs.writeFileSync(path.join(OUT, 'app-icon.svg'), iconSvg(C.cartaIcona, C.amaranto))
fs.writeFileSync(path.join(OUT, 'app-icon-inverse.svg'), iconSvg(C.amaranto, C.carta))

// ---------- WORDMARK (Geist 600 outlines, 1000 UPM, y-up; l and i-dot redrawn) ----------
const geist = JSON.parse(fs.readFileSync('geist.json', 'utf8'))['600']
const g = geist.glyphs
const ts = 128, tTop = 710, tT = 120, tRi = 36, tRun = 16, tR = 60, tRc = 14, tRo = tRi + tT
const tx0 = 70, tcx = tx0 + ts + tRi + tRun
// y-up path for custom l (baseline 0, top 710)
const lText = `M${tx0} ${tTop - tRc} A${tRc} ${tRc} 0 0 0 ${tx0 + tRc} ${tTop} H${tx0 + ts - tRc} A${tRc} ${tRc} 0 0 0 ${tx0 + ts} ${tTop - tRc} V${tT + tRi} A${tRi} ${tRi} 0 0 1 ${tx0 + ts + tRi} ${tT} H${tcx} A${tR} ${tR} 0 0 0 ${tcx} 0 H${tx0 + tRo} A${tRo} ${tRo} 0 0 0 ${tx0} ${tRo} Z`
const lAdv = tcx + tR + 34
const ixh = 534, iDotR = 67, iDotCy = ixh + 62 + iDotR, iCx = tx0 + ts / 2
const iStem = `M${tx0} ${ixh - tRc} A${tRc} ${tRc} 0 0 0 ${tx0 + tRc} ${ixh} H${tx0 + ts - tRc} A${tRc} ${tRc} 0 0 0 ${tx0 + ts} ${ixh - tRc} V0 H${tx0} Z`
const iDot = `M${iCx - iDotR} ${iDotCy} A${iDotR} ${iDotR} 0 1 0 ${iCx + iDotR} ${iDotCy} A${iDotR} ${iDotR} 0 1 0 ${iCx - iDotR} ${iDotCy} Z`
const iAdv = g.i.adv
const kern = { li: -34, il: -7, ll: -34, le: -36, er: -10, ri: -26 }
function wordmark(ink, dot) {
  const word = 'lilleri'; let pen = 0; let out = ''
  for (let n = 0; n < word.length; n++) {
    const ch = word[n]
    if (n > 0) pen += kern[word[n - 1] + ch] || 0
    if (ch === 'l') { out += `<path transform="translate(${pen} 0)" d="${lText}" fill="${ink}"/>`; pen += lAdv }
    else if (ch === 'i') { out += `<path transform="translate(${pen} 0)" d="${iStem}" fill="${ink}"/><path transform="translate(${pen} 0)" d="${iDot}" fill="${dot}"/>`; pen += iAdv }
    else { out += `<path transform="translate(${pen} 0)" d="${g[ch].d}" fill="${ink}"/>`; pen += g[ch].adv }
  }
  return { inner: out, width: pen }
}
const M = 80, wmTop = iDotCy + iDotR, wmBottom = -12
const wmBox = (w) => ({ W: w + 2 * M, H: wmTop - wmBottom + 2 * M })
function wordmarkSvg(ink, dot) {
  const { inner, width } = wordmark(ink, dot); const { W, H } = wmBox(width)
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">\n  <!-- lilleri, lowercase. Geist Sans 600 outlines (OFL) for e, r and the i stem; l redrawn with the symbol's foot (stem ${ts}, foot ${tT}, inner radius ${tRi}, run ${tRun}, terminal r ${tR}); i dot replaced by the signature round dot (r ${iDotR}). 1000 UPM, baseline at y=${M + wmTop}. -->\n  <g transform="translate(${M} ${M + wmTop}) scale(1 -1)">${inner}</g>\n</svg>\n`, width, W, H }
}
const wm = wordmarkSvg(C.inchiostro, C.inchiostro)
fs.writeFileSync(path.join(OUT, 'wordmark.svg'), wm.svg)
fs.writeFileSync(path.join(OUT, 'wordmark-dark.svg'), wordmarkSvg(C.carta, C.carta).svg)
fs.writeFileSync(path.join(OUT, 'wordmark-signature.svg'), wordmarkSvg(C.inchiostro, C.amaranto).svg)

// ---------- LOCKUPS ----------
// horizontal: symbol mark height = 1.16 x wordmark l height; baselines aligned; gap 0.6 x l height
function lockupH(symFill, ink, dot) {
  const scale = (1.16 * tTop) / (base - top)        // symbol units -> wordmark units
  const symW = 1024 * scale, symH = 1024 * scale
  const gap = 0.6 * tTop
  const { inner, width } = wordmark(ink, dot)
  const markLeft = x0 * scale, markRight = (ix + S) * scale
  const W = (markRight - markLeft) + gap + width + 2 * M
  const H = (base - top) * scale + 2 * M + 40
  const baselineY = M + (base - top) * scale + 20
  const symX = M - markLeft, symY = baselineY - base * scale
  const wmX = M + (markRight - markLeft) + gap
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}">\n  <!-- Horizontal lockup: symbol at 1.16 x the wordmark's l height, baselines aligned, gap 0.6 x l height. -->\n  <g transform="translate(${symX.toFixed(1)} ${symY.toFixed(1)}) scale(${scale.toFixed(4)})">${mark(symFill)}</g>\n  <g transform="translate(${wmX.toFixed(1)} ${baselineY.toFixed(1)}) scale(1 -1)">${inner}</g>\n</svg>\n`
}
fs.writeFileSync(path.join(OUT, 'lockup-horizontal.svg'), lockupH(C.amaranto, C.inchiostro, C.inchiostro))
fs.writeFileSync(path.join(OUT, 'lockup-horizontal-dark.svg'), lockupH(C.rosa, C.carta, C.carta))
// stacked: symbol at 1.9 x l height centred above the wordmark, gap 0.6 x l height
function lockupS(symFill, ink, dot) {
  const scale = (1.9 * tTop) / (base - top); const { inner, width } = wordmark(ink, dot)
  const markH = (base - top) * scale, markW = (ix + S - x0) * scale, gap = 0.6 * tTop
  const W = Math.max(width, markW) + 2 * M, H = markH + gap + (wmTop - wmBottom) + 2 * M
  const symX = (W - markW) / 2 - x0 * scale, symY = M - top * scale
  const wmX = (W - width) / 2, baselineY = M + markH + gap + wmTop
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}">\n  <!-- Stacked lockup: symbol at 1.9 x the wordmark's l height, centred, gap 0.6 x l height. -->\n  <g transform="translate(${symX.toFixed(1)} ${symY.toFixed(1)}) scale(${scale.toFixed(4)})">${mark(symFill)}</g>\n  <g transform="translate(${wmX.toFixed(1)} ${baselineY.toFixed(1)}) scale(1 -1)">${inner}</g>\n</svg>\n`
}
fs.writeFileSync(path.join(OUT, 'lockup-stacked.svg'), lockupS(C.amaranto, C.inchiostro, C.inchiostro))
fs.writeFileSync(path.join(OUT, 'lockup-stacked-dark.svg'), lockupS(C.rosa, C.carta, C.carta))

// ---------- PALETTE ----------
const palette = { name: 'Direction B — Carta, Notte, Amaranto', font: 'Geist',
  light: { background: C.carta, surface: C.avorio, surfaceDeep: C.cartaIcona, textPrimary: C.inchiostro, textSecondary: '#6B635A', border: '#E3DCCF', primary: C.amaranto, onPrimary: C.carta, accent: C.amaranto, accentSoft: '#EBD3DA', success: '#1F6B5E', warning: '#6F5A14', danger: '#A94A1E', info: '#4B5C7A' },
  dark: { background: C.notte, surface: C.notteChiara, surfaceDeep: '#363A58', textPrimary: C.testoNotte, textSecondary: '#B9B5C2', border: '#3B3F5C', primary: C.rosa, onPrimary: C.notte, accent: C.rosa, accentSoft: '#4A2A3A', success: '#7FC4B4', warning: '#E3B45B', danger: '#F0A070', info: '#9DB3D6' } }
fs.writeFileSync(path.join(OUT, 'palette.json'), JSON.stringify(palette, null, 2) + '\n')
console.log('wrote SVGs to', OUT, '| wordmark width', wm.width, 'box', wm.W, wm.H)
