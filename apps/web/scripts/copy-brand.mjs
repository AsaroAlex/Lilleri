import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const brand = fileURLToPath(new URL('../../../packages/brand/', import.meta.url))
const destination = path.join(root, 'public/brand')
await mkdir(destination, { recursive: true })
for (const file of [
  'lilleri-lockup-horizontal.svg',
  'lilleri-lockup-horizontal-on-dark.svg',
  'lilleri-symbol.svg',
  'lilleri-symbol-on-dark.svg',
]) {
  await copyFile(path.join(brand, 'logo', file), path.join(destination, file))
}
