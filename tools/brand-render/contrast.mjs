// Usage:
//   node contrast.mjs "#1F1B17" "#F6F1E7"            -> ratio + WCAG level
//   node contrast.mjs palette.json                     -> matrix of text roles vs surface roles for light and dark
// palette.json shape: { "name": "...", "light": { "background": "#..", "surface": "#..", "textPrimary": "#..", ... }, "dark": {...} }
// Roles whose name starts with "text", "primary", "accent", "success", "warning", "danger", "info", "border" are
// checked against roles starting with "background" or "surface". Also checks primary/accent as a button fill vs its
// "on*" role if present (e.g. onPrimary).
import fs from 'node:fs'
import { contrast, wcagLevel } from './lib.mjs'

const [, , a, b] = process.argv
if (!a) {
  console.error('usage: node contrast.mjs <#fg> <#bg> | node contrast.mjs palette.json')
  process.exit(1)
}
if (b) {
  const r = contrast(a, b)
  console.log(
    `${a} on ${b}: ${r.toFixed(2)}:1 → ${wcagLevel(r)} (large text: ${wcagLevel(r, { large: true })})`,
  )
  process.exit(0)
}
const pal = JSON.parse(fs.readFileSync(a, 'utf8'))
for (const theme of ['light', 'dark']) {
  const t = pal[theme]
  if (!t) continue
  console.log(`\n== ${pal.name || a} — ${theme}`)
  const surfaces = Object.keys(t).filter((k) => /^(background|surface)/.test(k))
  const fgs = Object.keys(t).filter(
    (k) =>
      /^(text|primary|secondary|accent|success|warning|danger|info|border|link)/.test(k) &&
      !/^on/.test(k),
  )
  const header = ['role', ...surfaces].map((s) => s.padEnd(16)).join('')
  console.log(header)
  for (const f of fgs) {
    const cells = surfaces.map((s) => {
      const r = contrast(t[f], t[s])
      return `${r.toFixed(2)} ${wcagLevel(r).replace('fail (AA large only)', 'AAlg').padEnd(4)}`.padEnd(
        16,
      )
    })
    console.log(f.padEnd(16) + cells.join(''))
  }
  for (const k of Object.keys(t)) {
    const on = `on${k[0].toUpperCase()}${k.slice(1)}`
    if (t[on]) {
      const r = contrast(t[on], t[k])
      console.log(`${on} on ${k}: ${r.toFixed(2)} ${wcagLevel(r)}`)
    }
  }
}
