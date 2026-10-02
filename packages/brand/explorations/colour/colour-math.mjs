// Colour maths for the Lilleri colour exploration: OKLab/OKLCH, WCAG 2.x contrast, Machado-Oliveira-Fernandes (2009)
// CVD simulation at severity 1.0 (the same model the dataviz validator is calibrated to), and OKLab ΔE×100.
export const s2lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
export const lin2s = c => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
export const hex2lin = hex => { const h = hex.replace('#', ''); return [0, 2, 4].map(i => s2lin(parseInt(h.slice(i, i + 2), 16) / 255)) }
export const lin2hex = lin => '#' + lin.map(v => Math.round(lin2s(v) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
export function lin2oklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]
}
export function oklab2lin([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
}
export const oklab = hex => lin2oklab(hex2lin(hex))
export function oklch(hex) { const [L, a, b] = oklab(hex); let h = Math.atan2(b, a) * 180 / Math.PI; if (h < 0) h += 360; return [L, Math.hypot(a, b), h] }
export function fromOklch(L, C, h) {
  // reduce chroma until in gamut
  for (let c = C; c >= 0; c -= 0.002) {
    const lin = oklab2lin([L, c * Math.cos(h * Math.PI / 180), c * Math.sin(h * Math.PI / 180)])
    if (lin.every(v => v >= -0.0005 && v <= 1.0005)) return lin2hex(lin)
  }
  return lin2hex(oklab2lin([L, 0, 0]))
}
export const lum = hex => { const [r, g, b] = hex2lin(hex); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}
export const simulate = (hex, kind) => { const l = hex2lin(hex); return lin2hex(MACHADO[kind].map(r => r[0] * l[0] + r[1] * l[1] + r[2] * l[2])) }
export const dE = (a, b, kind) => { const x = oklab(kind ? simulate(a, kind) : a), y = oklab(kind ? simulate(b, kind) : b); return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) }
export const fmt = hex => { const [L, C, h] = oklch(hex); return `${hex} L${L.toFixed(3)} C${C.toFixed(3)} h${h.toFixed(0)}` }
/** Find the lightest (dir=-1 → darkest-first search) L for hue/chroma that reaches target contrast vs bg. */
export function fitL(C, h, bg, target, { dark = false } = {}) {
  // for light bg: find the highest L that still meets target (lightest passing colour)
  // for dark bg: find the lowest L that meets target
  let best = null
  for (let L = dark ? 0.3 : 0.95; dark ? L <= 0.98 : L >= 0.05; L += dark ? 0.0025 : -0.0025) {
    const hex = fromOklch(L, C, h)
    if (contrast(hex, bg) >= target) { best = hex; break }
  }
  return best
}
