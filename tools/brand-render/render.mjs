// Usage: node render.mjs <in.svg> <out.png> [--width 1024] [--bg "#ffffff"]
import fs from 'node:fs'
import { readSvg, renderSvg } from './lib.mjs'

const [, , input, output, ...rest] = process.argv
if (!input || !output) {
  console.error('usage: node render.mjs <in.svg> <out.png> [--width N] [--bg #hex]')
  process.exit(1)
}
const opt = (name, def) => {
  const i = rest.indexOf(name)
  return i >= 0 ? rest[i + 1] : def
}
const width = Number(opt('--width', 0)) || undefined
const background = opt('--bg', undefined)
fs.writeFileSync(output, renderSvg(readSvg(input), { width, background }))
console.log('wrote', output)
