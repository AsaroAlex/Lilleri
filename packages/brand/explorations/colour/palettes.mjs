// Source of truth for the three Lilleri colour territories.
// Every role is specified in OKLCH (design intent: lightness, chroma, hue) and exported to hex in t1.json,
// t2.json and t3.json. Roles that carry text are given a contrast floor ("min"): the generator nudges
// lightness (darker in light mode, lighter in dark mode) until the role reaches that floor against EVERY
// surface (background, surface, surfaceElevated) — so WCAG passes by construction, not by eyeballing.
//
// Usage: node palettes.mjs        (writes t1.json, t2.json, t3.json next to this file)
//
// Role contract (shared by all territories; see docs/brand/explorations/colour-territories.md §2):
//   background / surface / surfaceElevated  paper (light) or warm ink (dark) planes
//   textPrimary / textSecondary / textTertiary   ink ramp; all ≥ 4.5:1 on every surface
//   border          decorative hairline (no contrast requirement)
//   borderStrong    input outlines and focus-adjacent strokes; ≥ 3:1 (WCAG 1.4.11)
//   primary         the ONE signature colour: filled buttons, active states, links; ≥ 4.5:1 as text
//   onPrimary       text and icons on primary fills; ≥ 4.5:1 on primary
//   secondary       the quiet companion colour (secondary buttons, chips); ≥ 4.5:1 as text
//   accent          deep tone of the signature for emphasis and tinted highlight containers; ≥ 4.5:1
//   success / warning / danger / info   status; always shipped with an icon and a label
//   positive        inflows (income, refunds); always with "+" and a label
//   negative        negative balances / over-budget only; ordinary outflows stay textPrimary with "−"
//   chart[6]        categorical, fixed order; validated with the dataviz validator (see build.mjs)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

// ---- minimal OKLCH → sRGB hex (with chroma reduction to stay in gamut) and WCAG contrast ----
const lin2s = c => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055 }
const s2lin = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
function oklab2lin([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
}
export function oklch(L, C, h) {
  for (let c = C; c >= 0; c -= 0.001) {
    const lin = oklab2lin([L, c * Math.cos(h * Math.PI / 180), c * Math.sin(h * Math.PI / 180)])
    if (lin.every(v => v >= -0.0005 && v <= 1.0005)) return '#' + lin.map(v => Math.round(lin2s(v) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()
  }
}
const lum = hex => { const h = hex.slice(1); const [r, g, b] = [0, 2, 4].map(i => s2lin(parseInt(h.slice(i, i + 2), 16) / 255)); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
export const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }

/** Resolve a theme spec: surfaces first, then every other role, nudging L until `min` holds on all surfaces. */
function resolve(spec, mode) {
  const out = {}
  const surfaces = ['background', 'surface', 'surfaceElevated']
  for (const k of surfaces) out[k] = oklch(...spec[k])
  for (const [k, v] of Object.entries(spec)) {
    if (surfaces.includes(k) || k === 'chart') continue
    const [L0, C, h, min = 0, against] = v
    const targets = against ? [out[against]] : surfaces.map(s => out[s])
    let L = L0, hex = oklch(L, C, h)
    const step = mode === 'light' ? -0.0025 : 0.0025
    while (min && targets.some(t => contrast(hex, t) < min) && L > 0.05 && L < 0.99) { L += step; hex = oklch(L, C, h) }
    out[k] = hex
  }
  out.chart = spec.chart.map(([L, C, h]) => oklch(L, C, h))
  return out
}

// [L, C, h, minContrast?, against?]  — `against` defaults to all three surfaces.
const TEXT = 4.5, UI = 3

const T1 = {
  name: 'T1 — Carta & Cotto (warm paper & terracotta)',
  light: {
    background: [0.955, 0.014, 75], surface: [0.982, 0.008, 78], surfaceElevated: [0.996, 0.004, 80],
    textPrimary: [0.225, 0.014, 55, TEXT], textSecondary: [0.44, 0.016, 60, 6.5], textTertiary: [0.53, 0.016, 62, TEXT],
    border: [0.895, 0.016, 72], borderStrong: [0.64, 0.018, 65, UI],
    primary: [0.465, 0.105, 42, TEXT], onPrimary: [0.982, 0.008, 78, TEXT, 'primary'],
    secondary: [0.47, 0.032, 232, TEXT], accent: [0.38, 0.085, 40, TEXT],
    success: [0.48, 0.09, 150, TEXT], warning: [0.52, 0.095, 82, TEXT], danger: [0.47, 0.155, 8, TEXT], info: [0.48, 0.10, 258, TEXT],
    positive: [0.47, 0.075, 185, TEXT], negative: [0.47, 0.15, 6, TEXT],
    chart: [[0.55, 0.12, 42], [0.52, 0.10, 245], [0.70, 0.12, 82], [0.50, 0.11, 330], [0.62, 0.10, 135], [0.60, 0.10, 195]],
  },
  dark: {
    background: [0.175, 0.008, 60], surface: [0.215, 0.009, 60], surfaceElevated: [0.255, 0.010, 62],
    textPrimary: [0.945, 0.014, 78, TEXT], textSecondary: [0.80, 0.018, 72, 7], textTertiary: [0.70, 0.018, 70, TEXT],
    border: [0.31, 0.012, 60], borderStrong: [0.52, 0.015, 62, UI],
    primary: [0.72, 0.095, 45, TEXT], onPrimary: [0.20, 0.012, 50, TEXT, 'primary'],
    secondary: [0.76, 0.03, 232, TEXT], accent: [0.80, 0.065, 52, TEXT],
    success: [0.76, 0.10, 150, TEXT], warning: [0.80, 0.11, 82, TEXT], danger: [0.72, 0.12, 8, TEXT], info: [0.76, 0.08, 255, TEXT],
    positive: [0.78, 0.08, 185, TEXT], negative: [0.74, 0.11, 6, TEXT],
    chart: [[0.62, 0.12, 42], [0.60, 0.10, 245], [0.66, 0.11, 82], [0.58, 0.11, 330], [0.60, 0.10, 135], [0.62, 0.09, 195]],
  },
}

const T2 = {
  name: 'T2 — Carta & Oliva (olive & ink)',
  light: {
    background: [0.955, 0.014, 100], surface: [0.982, 0.008, 100], surfaceElevated: [0.996, 0.004, 100],
    textPrimary: [0.225, 0.012, 115, TEXT], textSecondary: [0.44, 0.014, 110, 6.5], textTertiary: [0.53, 0.014, 108, TEXT],
    border: [0.895, 0.016, 100], borderStrong: [0.64, 0.018, 105, UI],
    primary: [0.48, 0.068, 125, TEXT], onPrimary: [0.982, 0.008, 100, TEXT, 'primary'],
    secondary: [0.45, 0.035, 60, TEXT], accent: [0.38, 0.055, 125, TEXT],
    success: [0.48, 0.075, 192, TEXT], warning: [0.52, 0.10, 68, TEXT], danger: [0.50, 0.155, 28, TEXT], info: [0.48, 0.10, 258, TEXT],
    positive: [0.47, 0.075, 215, TEXT], negative: [0.50, 0.145, 28, TEXT],
    chart: [[0.56, 0.10, 125], [0.52, 0.11, 330], [0.70, 0.12, 80], [0.52, 0.10, 250], [0.58, 0.12, 40], [0.62, 0.10, 192]],
  },
  dark: {
    background: [0.175, 0.008, 105], surface: [0.215, 0.009, 105], surfaceElevated: [0.255, 0.010, 105],
    textPrimary: [0.945, 0.014, 100, TEXT], textSecondary: [0.80, 0.016, 105, 7], textTertiary: [0.70, 0.016, 105, TEXT],
    border: [0.31, 0.012, 105], borderStrong: [0.52, 0.015, 105, UI],
    primary: [0.76, 0.075, 125, TEXT], onPrimary: [0.20, 0.014, 125, TEXT, 'primary'],
    secondary: [0.78, 0.035, 62, TEXT], accent: [0.84, 0.06, 122, TEXT],
    success: [0.78, 0.075, 192, TEXT], warning: [0.80, 0.11, 75, TEXT], danger: [0.72, 0.13, 25, TEXT], info: [0.76, 0.08, 255, TEXT],
    positive: [0.78, 0.07, 215, TEXT], negative: [0.74, 0.12, 25, TEXT],
    chart: [[0.62, 0.10, 125], [0.60, 0.11, 330], [0.66, 0.11, 80], [0.60, 0.10, 250], [0.62, 0.11, 40], [0.62, 0.09, 192]],
  },
}

const T3 = {
  name: 'T3 — Carta & Vinaccia (warm paper & wine)',
  light: {
    background: [0.955, 0.013, 65], surface: [0.982, 0.007, 65], surfaceElevated: [0.996, 0.003, 65],
    textPrimary: [0.225, 0.014, 25, TEXT], textSecondary: [0.44, 0.016, 30, 6.5], textTertiary: [0.53, 0.016, 35, TEXT],
    border: [0.895, 0.015, 60], borderStrong: [0.64, 0.016, 40, UI],
    primary: [0.40, 0.12, 2, TEXT], onPrimary: [0.982, 0.007, 65, TEXT, 'primary'],
    secondary: [0.45, 0.03, 250, TEXT], accent: [0.33, 0.10, 0, TEXT],
    success: [0.48, 0.09, 155, TEXT], warning: [0.52, 0.095, 80, TEXT], danger: [0.52, 0.145, 40, TEXT], info: [0.48, 0.10, 255, TEXT],
    positive: [0.47, 0.075, 178, TEXT], negative: [0.52, 0.135, 42, TEXT],
    chart: [[0.50, 0.13, 2], [0.56, 0.10, 192], [0.70, 0.12, 82], [0.52, 0.10, 255], [0.62, 0.11, 135], [0.60, 0.12, 45]],
  },
  dark: {
    background: [0.175, 0.008, 40], surface: [0.215, 0.009, 40], surfaceElevated: [0.255, 0.010, 40],
    textPrimary: [0.945, 0.013, 65, TEXT], textSecondary: [0.80, 0.016, 50, 7], textTertiary: [0.70, 0.016, 45, TEXT],
    border: [0.31, 0.012, 40], borderStrong: [0.52, 0.014, 40, UI],
    primary: [0.74, 0.075, 2, TEXT], onPrimary: [0.21, 0.03, 5, TEXT, 'primary'],
    secondary: [0.76, 0.03, 250, TEXT], accent: [0.82, 0.055, 5, TEXT],
    success: [0.76, 0.10, 155, TEXT], warning: [0.80, 0.11, 82, TEXT], danger: [0.74, 0.12, 42, TEXT], info: [0.76, 0.08, 255, TEXT],
    positive: [0.78, 0.08, 178, TEXT], negative: [0.75, 0.11, 45, TEXT],
    chart: [[0.60, 0.12, 2], [0.62, 0.09, 192], [0.66, 0.11, 82], [0.60, 0.10, 255], [0.60, 0.10, 135], [0.64, 0.11, 45]],
  },
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [file, spec] of [['t1.json', T1], ['t2.json', T2], ['t3.json', T3]]) {
    const pal = { name: spec.name, font: 'Geist', light: resolve(spec.light, 'light'), dark: resolve(spec.dark, 'dark') }
    fs.writeFileSync(path.join(here, file), JSON.stringify(pal, null, 2) + '\n')
    console.log('wrote', file)
  }
}
