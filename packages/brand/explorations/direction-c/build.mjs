// Direction C — builds the deliverable SVGs into the exploration folder.
// Usage: node build.mjs [--dx N] [--dy N] [--r N] [--scale 0.62] [--dots on|off]
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const sharp = createRequire('/tmp/claude-0/-home-user-Lilleri/aa688b9e-d7be-59d9-9317-1813d675187c/scratchpad/brandtools/package.json')('sharp')
import { renderSvg } from '/tmp/claude-0/-home-user-Lilleri/aa688b9e-d7be-59d9-9317-1813d675187c/scratchpad/brandtools/lib.mjs'
import { superellipsePath } from './geometry.mjs'

const OUT = '/home/user/Lilleri/packages/brand/explorations/direction-c'
fs.mkdirSync(OUT, { recursive: true })
const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }

// ---- tokens ----
export const T = {
  paper: '#F6F1E7', ivory: '#FBF8F2', ink: '#1F1B17', inkSoft: '#6B635A', line: '#E3DCCF',
  olive: opt('--olive', '#56673F'), sage: '#A7B58B', night: '#15130F', nightSurface: '#1F1B17', inkDark: '#F3EDE2',
}

// ---- geometry (1024 grid) ----
const G = {
  cx: 512, cy: 512, a: 360, b: 340, nTop: Number(opt('--ntop', 2.9)), nBottom: Number(opt('--nbottom', 3.4)), // outer pebble 720 x 680
  dx: Number(opt('--dx', 0)), dy: Number(opt('--dy', -54)), r: Number(opt('--r', 158)), // the opening
}
/** The mark as one evenodd path, centred at (cx, cy) and scaled by k (1 = the 1024 grid). */
const markPathAt = (cx, cy, k, fill) => {
  const o = superellipsePath({ cx, cy, a: G.a * k, b: G.b * k, nTop: G.nTop, nBottom: G.nBottom, segs: 24 })
  const h = superellipsePath({ cx: cx + G.dx * k, cy: cy + G.dy * k, a: G.r * k, b: G.r * k, n: 2, segs: 16 })
  return `<path d="${o} ${h}" fill="${fill}" fill-rule="evenodd"/>`
}
const markPath = (fill) => markPathAt(G.cx, G.cy, 1, fill)
const comment = `<!-- Lilleri, Direction C "il lillero": one matte pebble (superellipse 720x680 on a 1024 grid, exponent ${G.nTop} for the top half and ${G.nBottom} for the bottom half, so the top is rounder and the base flatter) with one round opening (r=${G.r}) set ${-G.dy} units above centre${G.dx ? ` and ${G.dx} to the side` : ''}: the weight settles at the bottom. Walls: top ${G.b + G.dy - G.r}, bottom ${G.b - G.dy - G.r}, sides ${G.a - G.r}. One colour, no strokes, evenodd fill. -->`

const svgMark = (fill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">\n  ${comment}\n  ${markPath(fill)}\n</svg>\n`
fs.writeFileSync(path.join(OUT, 'symbol.svg'), svgMark(T.olive))
fs.writeFileSync(path.join(OUT, 'symbol-mono.svg'), svgMark('#000000'))
fs.writeFileSync(path.join(OUT, 'symbol-dark.svg'), svgMark(T.sage))

// app icon: paper field, pebble scaled about the centre
const scale = Number(opt('--scale', 0.66))
const appIcon = (bg, fill, note) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">\n  <!-- Lilleri, Direction C app icon: ${note}, the lillero at ${Math.round(scale * 100)}% of the field (pebble ${Math.round(720 * scale)} x ${Math.round(680 * scale)}, opening r=${Math.round(G.r * scale)}). The OS masks the corners. -->\n  <rect width="1024" height="1024" fill="${bg}"/>\n  ${markPathAt(512, 512, scale, fill)}\n</svg>\n`
fs.writeFileSync(path.join(OUT, 'app-icon.svg'), appIcon(T.paper, T.olive, 'warm paper field'))
// night variant (Android themed icons / iOS dark appearance)
fs.writeFileSync(path.join(OUT, 'app-icon-dark.svg'), appIcon(T.night, T.sage, 'night field (dark-appearance variant)'))

// ---- wordmark ----
const F = 176, LS = -0.01 // font-size, tracking em
const dots = opt('--dots', 'on') === 'on'
const word = dots ? 'lıllerı' : 'lilleri'
const textEl = (fill) => `<text x="0" y="${F}" font-family="Geist" font-weight="500" font-size="${F}" letter-spacing="${LS * F}" fill="${fill}">${word}</text>`

/** Ink bbox of an svg rendered at 1:1 (viewBox units == px). */
async function inkBBox(svg, w, h) {
  const png = renderSvg(svg)
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true })
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels
    if (data[i + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  return { x0, y0, x1, y1, data, info }
}

const probeW = 900, probeH = 300
const probe = (t) => `<svg xmlns="http://www.w3.org/2000/svg" width="${probeW}" height="${probeH}" viewBox="0 0 ${probeW} ${probeH}">${t}</svg>`
const bb = await inkBBox(probe(textEl('#000')), probeW, probeH)
// measure the i-dots from the dotted rendering (XOR of dotted vs dotless)
const dotted = await inkBBox(probe(textEl('#000').replace(word, 'lilleri')), probeW, probeH)
const dotless = await inkBBox(probe(textEl('#000').replace(word, 'lıllerı')), probeW, probeH)
const cols = new Map() // x -> [ymin,ymax] for xor pixels
for (let y = 0; y < probeH; y++) for (let x = 0; x < probeW; x++) {
  const i = (y * probeW + x) * 4
  const a = dotted.data[i + 3] > 40, b = dotless.data[i + 3] > 40
  if (a && !b) { const c = cols.get(x) || [y, y]; c[0] = Math.min(c[0], y); c[1] = Math.max(c[1], y); cols.set(x, c) }
}
const xs = [...cols.keys()].sort((p, q) => p - q)
const dotBoxes = []
let cur = null
for (const x of xs) {
  if (cur && x === cur.x1 + 1) { cur.x1 = x; cur.y0 = Math.min(cur.y0, cols.get(x)[0]); cur.y1 = Math.max(cur.y1, cols.get(x)[1]) }
  else { cur = { x0: x, x1: x, y0: cols.get(x)[0], y1: cols.get(x)[1] }; dotBoxes.push(cur) }
}
console.log('wordmark ink bbox', { x0: bb.x0, y0: bb.y0, x1: bb.x1, y1: bb.y1 }, 'dots', dotBoxes)

// build the wordmark svg with a tight viewBox (4 units padding) and pebble dots
const pad = 4
const vb = { x: bb.x0 - pad, y: Math.min(bb.y0, ...dotBoxes.map(d => d.y0)) - pad, w: 0, h: 0 }
vb.w = bb.x1 + pad - vb.x; vb.h = bb.y1 + pad - vb.y
const dotMark = (fill) => dotBoxes.map(d => {
  const w = d.x1 - d.x0 + 1, h = d.y1 - d.y0 + 1
  const cx = (d.x0 + d.x1 + 1) / 2, cy = (d.y0 + d.y1 + 1) / 2
  const k = 1.12 // slightly larger than Geist's dot so the pebble reads
  return `<path d="${superellipsePath({ cx, cy, a: (w / 2) * k * 1.06, b: (h / 2) * k, n: 3.3, segs: 16 })}" fill="${fill}"/>`
}).join('')
const wordmarkSvg = (textFill, dotFill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">\n  <!-- Lilleri wordmark, Direction C: Geist Medium (500), lowercase, tracking -0.01em; the two i-dots are tiny lilleri (same superellipse as the symbol) in the signature colour. Text-based at this stage. -->\n  ${textEl(textFill)}${dots ? dotMark(dotFill) : ''}\n</svg>\n`
fs.writeFileSync(path.join(OUT, 'wordmark.svg'), wordmarkSvg(T.ink, T.olive))
fs.writeFileSync(path.join(OUT, 'wordmark-dark.svg'), wordmarkSvg(T.inkDark, T.sage))
fs.writeFileSync(path.join(OUT, 'wordmark-mono.svg'), wordmarkSvg('#000000', '#000000'))

// ---- horizontal lockup ----
// symbol height = ascender height of the wordmark (top of l to baseline)
const ascTop = bb.y0, base = F // baseline y in probe space
const asc = base - ascTop
const symH = asc * Number(opt('--symk', 0.84)) // symbol a little smaller than the ascender, optically centred on it
const symW = symH * (720 / 680)
const symScale = symH / 680 // mark units -> px
const gap = F * Number(opt('--gap', 0.26))
const sx = bb.x0 - gap - symW // place symbol left of text
const symX = sx, symY = base - asc / 2 - symH / 2 // vertical centre of the symbol = middle of the ascender height
const lockup = (textFill, symFill, dotFill) => {
  const lvb = { x: symX - pad, y: vb.y, w: bb.x1 + pad - (symX - pad), h: vb.h }
  const nest = markPathAt(symX + symW / 2, symY + symH / 2, symScale, symFill)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${lvb.x} ${lvb.y} ${lvb.w} ${lvb.h}">\n  <!-- Lilleri horizontal lockup, Direction C: symbol height = ${opt('--symk', 0.84)} x the ascender height of the wordmark, centred on the ascender mid-line; gap = ${opt('--gap', 0.26)} em. -->\n  ${nest}\n  ${textEl(textFill)}${dots ? dotMark(dotFill) : ''}\n</svg>\n`
}
fs.writeFileSync(path.join(OUT, 'lockup-horizontal.svg'), lockup(T.ink, T.olive, T.olive))
fs.writeFileSync(path.join(OUT, 'lockup-horizontal-dark.svg'), lockup(T.inkDark, T.sage, T.sage))

// ---- palette ----
const palette = {
  name: 'Direction C — Carta, Inchiostro, Oliva (ceramic object)', font: 'Geist',
  light: { background: T.paper, surface: T.ivory, surfaceDeep: '#EFE9DC', textPrimary: T.ink, textSecondary: T.inkSoft, border: T.line, primary: T.olive, onPrimary: T.ivory, accent: T.olive, accentSoft: '#D9DFC9', success: '#2E6B5A', warning: '#8A5A12', danger: '#8F3B22', info: '#2F5C8A' },
  dark: { background: T.night, surface: T.nightSurface, surfaceDeep: '#2A2520', textPrimary: T.inkDark, textSecondary: '#B5AC9E', border: '#332D27', primary: T.sage, onPrimary: T.night, accent: T.sage, accentSoft: '#36402A', success: '#7FC4B4', warning: '#E3B45B', danger: '#E0907A', info: '#8FB6E0' },
}
fs.writeFileSync(path.join(OUT, 'palette.json'), JSON.stringify(palette, null, 2) + '\n')
console.log('built into', OUT, { G, scale, symH: Math.round(symH), gap: Math.round(gap) })
