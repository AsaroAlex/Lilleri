import { Resvg } from '@resvg/resvg-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const FONT_DIR = path.join(here, 'fonts')
export const fontFiles = () => fs.readdirSync(FONT_DIR).filter(f => /\.(ttf|otf)$/i.test(f)).map(f => path.join(FONT_DIR, f))

/** Render an SVG string to a PNG buffer. width: output width in px (keeps aspect). */
export function renderSvg(svg, { width, background } = {}) {
  const opts = {
    font: { fontFiles: fontFiles(), loadSystemFonts: false, defaultFontFamily: 'Geist' },
    ...(width ? { fitTo: { mode: 'width', value: width } } : {}),
    ...(background ? { background } : {}),
  }
  return new Resvg(svg, opts).render().asPng()
}

export function readSvg(file) {
  return fs.readFileSync(file, 'utf8')
}

/** Wrap an inner SVG (expected to have a viewBox) so it renders at size px inside an outer canvas. */
export function svgViewBox(svg) {
  const m = svg.match(/viewBox="([^"]+)"/)
  if (!m) throw new Error('SVG must declare a viewBox')
  const [x, y, w, h] = m[1].trim().split(/[\s,]+/).map(Number)
  return { x, y, w, h }
}

/** Return inner markup of an svg (children of <svg>), stripping xml prolog. */
export function svgInner(svg) {
  const s = svg.replace(/<\?xml[^>]*>/, '').trim()
  const open = s.indexOf('>') + 1
  const close = s.lastIndexOf('</svg>')
  return s.slice(open, close)
}

/** Build a nested <svg> element placing the given svg at x,y with size w,h. */
export function place(svg, x, y, w, h) {
  const vb = svgViewBox(svg)
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" preserveAspectRatio="xMidYMid meet">${svgInner(svg)}</svg>`
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
/** WCAG 2.x contrast ratio between two hex colours. */
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}
export function wcagLevel(ratio, { large = false } = {}) {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return large ? 'AAA' : 'AA'
  if (ratio >= 3) return large ? 'AA' : 'fail (AA large only)'
  return 'fail'
}
export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
