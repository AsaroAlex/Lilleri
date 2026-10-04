import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { esc, hexToRgb, place, renderSvg } from './lib.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const out = path.join(root, 'packages/brand')
const colors = JSON.parse(fs.readFileSync(path.join(out, 'tokens/colors.json'), 'utf8'))
const read = (file) => fs.readFileSync(path.join(out, file), 'utf8')
const profiles = {
  normal: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
  grayscale: [
    [0.2126, 0.7152, 0.0722],
    [0.2126, 0.7152, 0.0722],
    [0.2126, 0.7152, 0.0722],
  ],
}
function simulate(hex, matrix) {
  const linear = hexToRgb(hex).map((n) => {
    const c = n / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return (
    '#' +
    matrix
      .map((row) =>
        Math.max(
          0,
          Math.min(
            1,
            row.reduce((a, v, i) => a + v * linear[i], 0),
          ),
        ),
      )
      .map((c) => Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)))
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  )
}
let body = `<rect width="1440" height="1450" fill="${colors.light.background}"/><text x="40" y="48" font-family="Geist" font-size="28" fill="${colors.light.textPrimary}">Lilleri — semantic colour proof</text><text x="40" y="78" font-family="Geist" font-size="16" fill="${colors.light.textSecondary}">Machado et al. (2009), severity 100 matrices in linear sRGB. Simulation is an expert aid.</text>`
const labels = [
  ['primary', 'Controlla'],
  ['success', 'Collegato'],
  ['warning', '! Da rinnovare'],
  ['danger', '× Non riuscito'],
  ['info', 'i Aggiornamento'],
  ['positive', '+ Entrata'],
  ['negative', '− Saldo negativo'],
]
let y = 104
for (const [profile, matrix] of Object.entries(profiles)) {
  body += `<text x="40" y="${y + 24}" font-family="Geist" font-size="20" fill="${colors.light.textPrimary}">${profile}</text>`
  for (const [mode, dy] of [
    ['light', 40],
    ['dark', 128],
  ]) {
    const c = colors[mode]
    body += `<rect x="40" y="${y + dy}" width="1360" height="76" rx="12" fill="${simulate(c.surface, matrix)}"/>`
    labels.forEach(([role, label], i) => {
      const x = 56 + i * 189
      body += `<circle cx="${x + 9}" cy="${y + dy + 20}" r="9" fill="${simulate(c[role], matrix)}"/><text x="${x}" y="${y + dy + 55}" font-family="Geist" font-size="16" font-weight="500" fill="${simulate(c.textPrimary, matrix)}">${esc(label)}</text>`
      if (role === 'success')
        body += `<path d="M${x + 3} ${y + dy + 20} l4 4 l8 -8" fill="none" stroke="${simulate(c.surface, matrix)}" stroke-width="2"/>`
    })
  }
  y += 242
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 1450">${body}</svg>`
fs.writeFileSync(path.join(out, 'png/color-vision-proof.svg'), svg)
fs.writeFileSync(path.join(out, 'png/color-vision-proof.png'), renderSvg(svg))
let proof = '<rect width="1200" height="710" fill="#D2D2D7"/>'
for (const [label, file, ground, ink, x, y] of [
  [
    'Light',
    'logo/lilleri-symbol-small.svg',
    colors.light.background,
    colors.light.textPrimary,
    0,
    0,
  ],
  ['Dark', 'icon/favicon-on-dark.svg', colors.dark.background, colors.dark.textPrimary, 600, 0],
  ['Mono positive', 'logo/lilleri-symbol-small-mono.svg', '#FFFFFF', '#000000', 0, 355],
  ['Mono reverse', 'logo/lilleri-symbol-small-mono.svg', '#000000', '#FFFFFF', 600, 355],
]) {
  proof += `<rect x="${x}" y="${y}" width="600" height="355" fill="${ground}"/><text x="${x + 24}" y="${y + 35}" font-family="Geist" font-size="20" fill="${ink}">${label}</text>`
  let asset = read(file)
  if (label === 'Mono reverse') asset = asset.replaceAll('#000000', '#FFFFFF')
  for (const [size, dx] of [
    [128, 30],
    [64, 210],
    [32, 330],
    [24, 416],
    [16, 496],
  ]) {
    proof += place(asset, x + dx, y + 80, size, size)
    proof += `<text x="${x + dx}" y="${y + 264}" font-family="Geist" font-size="14" fill="${ink}">${size}px</text>`
  }
}
fs.writeFileSync(
  path.join(out, 'png/light-dark-mono-proof.png'),
  renderSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 710">${proof}</svg>`),
)
console.log('Wrote light/dark/mono and colour-vision evaluation proofs.')
