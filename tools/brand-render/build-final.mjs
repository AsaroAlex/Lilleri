// Consolidates the existing B exploration; never overwrites exploration assets.

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { contrast, renderSvg, svgInner } from './lib.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const out = path.join(root, 'packages/brand')
const b = path.join(out, 'explorations/direction-b')
// Snapshot preserves the exact reviewed values when upstream explorations evolve.
const source = JSON.parse(fs.readFileSync(path.join(out, 'tokens/palette-source.json'), 'utf8'))
const colors = {
  light: { ...source.light, primarySoft: '#F0DFE4' },
  dark: { ...source.dark, primarySoft: '#3B2530' },
}
for (const roles of Object.values(colors))
  for (const [role, value] of Object.entries(roles)) {
    for (const color of Array.isArray(value) ? value : [value])
      if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error(`Invalid hex role ${role}: ${color}`)
  }
for (const dir of ['logo', 'icon', 'png', 'tokens', 'src', 'fonts', 'explorations/type'])
  fs.mkdirSync(path.join(out, dir), { recursive: true })
const read = (name) => fs.readFileSync(path.join(b, name), 'utf8')
const write = (name, value) => fs.writeFileSync(path.join(out, name), value)
const json = (value) => JSON.stringify(value, null, 2) + '\n'
const remap = (svg) =>
  svg
    .replaceAll('#6E1F3B', colors.light.primary)
    .replaceAll('#D6A4AF', colors.dark.primary)
    .replaceAll('#1F1B17', colors.light.textPrimary)
    .replaceAll('#F6F1E7', colors.dark.textPrimary)
for (const [from, to] of [
  ['symbol.svg', 'lilleri-symbol.svg'],
  ['symbol-mono.svg', 'lilleri-symbol-mono.svg'],
  ['symbol-dark.svg', 'lilleri-symbol-on-dark.svg'],
  ['wordmark.svg', 'lilleri-wordmark.svg'],
  ['wordmark-dark.svg', 'lilleri-wordmark-on-dark.svg'],
  ['wordmark-signature.svg', 'lilleri-wordmark-signature.svg'],
  ['lockup-horizontal.svg', 'lilleri-lockup-horizontal.svg'],
  ['lockup-horizontal-dark.svg', 'lilleri-lockup-horizontal-on-dark.svg'],
  ['lockup-stacked.svg', 'lilleri-lockup-vertical.svg'],
  ['lockup-stacked-dark.svg', 'lilleri-lockup-vertical-on-dark.svg'],
])
  write('logo/' + to, remap(read(from)).replaceAll('Direction B', 'Lilleri consolidated identity'))
write('logo/lilleri-monogram.svg', fs.readFileSync(path.join(out, 'logo/lilleri-symbol.svg')))

// Small optical cut: remove 24 units of foot run; preserve the distinctive round end.
// Bare favicon is enlarged inside an 832-unit square. Stem gap is now 68 units.
const symbol = remap(read('symbol.svg'))
const smallInner = svgInner(symbol).replaceAll('H488', 'H464').replaceAll('488 896', '464 896')
const small = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="96 96 832 832"><!-- Optical cut for 16–24 px: foot shortened by 24 units; 68-unit clear gap. -->${smallInner}</svg>\n`
write('logo/lilleri-symbol-small.svg', small)
write('logo/lilleri-symbol-small-mono.svg', small.replaceAll(colors.light.primary, '#000000'))
write(
  'logo/lilleri-symbol-small-on-dark.svg',
  small.replaceAll(colors.light.primary, colors.dark.primary),
)
write('icon/favicon.svg', small)
write('icon/favicon-on-dark.svg', small.replaceAll(colors.light.primary, colors.dark.primary))
const mark = svgInner(symbol)
const k = 0.827,
  t = 512 * (1 - k)
const group = `<g transform="translate(${t} ${t}) scale(${k})">${mark}</g>`
const wrap = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${inner}</svg>\n`
const field = `<rect width="1024" height="1024" fill="${colors.light.background}"/>`
const full = wrap(field + group)
write('icon/app-icon-ios-1024.svg', full)
write(
  'icon/app-icon-ios-dark-1024.svg',
  full
    .replaceAll(colors.light.background, colors.dark.background)
    .replaceAll(colors.light.primary, colors.dark.primary),
)
write('icon/app-icon-android-foreground.svg', wrap(group))
write('icon/app-icon-android-background.svg', wrap(field))
write(
  'icon/app-icon-android-monochrome.svg',
  wrap(group.replaceAll(colors.light.primary, '#000000')),
)
write('icon/pwa-maskable-512.svg', full)
write('icon/social-avatar.svg', full)

const scale = {
  display: {
    size: 48,
    webSize: 72,
    weight: 500,
    lineHeight: 52,
    webLineHeight: 76,
    letterSpacing: -1.2,
    family: 'editorial',
  },
  h1: {
    size: 32,
    webSize: 48,
    weight: 600,
    lineHeight: 38,
    webLineHeight: 54,
    letterSpacing: -0.6,
    family: 'ui',
  },
  h2: {
    size: 26,
    webSize: 32,
    weight: 600,
    lineHeight: 32,
    webLineHeight: 38,
    letterSpacing: -0.4,
    family: 'ui',
  },
  h3: {
    size: 22,
    webSize: 24,
    weight: 600,
    lineHeight: 28,
    webLineHeight: 30,
    letterSpacing: -0.2,
    family: 'ui',
  },
  title: {
    size: 18,
    webSize: 20,
    weight: 600,
    lineHeight: 24,
    webLineHeight: 26,
    letterSpacing: 0,
    family: 'ui',
  },
  body: {
    size: 16,
    webSize: 16,
    weight: 400,
    lineHeight: 24,
    webLineHeight: 24,
    letterSpacing: 0,
    family: 'ui',
  },
  bodySmall: {
    size: 14,
    webSize: 14,
    weight: 400,
    lineHeight: 20,
    webLineHeight: 20,
    letterSpacing: 0,
    family: 'ui',
  },
  label: {
    size: 14,
    webSize: 14,
    weight: 600,
    lineHeight: 20,
    webLineHeight: 20,
    letterSpacing: 0,
    family: 'ui',
  },
  caption: {
    size: 12,
    webSize: 12,
    weight: 500,
    lineHeight: 18,
    webLineHeight: 18,
    letterSpacing: 0,
    family: 'ui',
  },
  amountLarge: {
    size: 36,
    webSize: 48,
    weight: 500,
    lineHeight: 42,
    webLineHeight: 54,
    letterSpacing: -0.6,
    family: 'ui',
    tabular: true,
  },
  amountMedium: {
    size: 22,
    webSize: 26,
    weight: 500,
    lineHeight: 28,
    webLineHeight: 32,
    letterSpacing: -0.2,
    family: 'ui',
    tabular: true,
  },
}
const typography = {
  fontUI: 'Geist',
  fontEditorial: 'Newsreader',
  fontCode: 'GeistMono',
  family: { ui: 'Geist', editorial: 'Newsreader', code: 'GeistMono' },
  webFamily: {
    ui: "'Geist', system-ui, sans-serif",
    editorial: "'Newsreader', Georgia, serif",
    code: "'GeistMono', monospace",
  },
  scale,
  numeralFeatures: ['tnum', 'lnum'],
}
const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 }
const radius = { sm: 8, md: 12, lg: 20, xl: 28, pill: 999 }
const motion = {
  instant: 0,
  fast: 120,
  normal: 180,
  slow: 280,
  easing: 'cubic-bezier(0.2, 0, 0, 1)',
  reducedMotion: { duration: 0, transform: 'none' },
}
const elevation = {
  flat: 'none',
  raised: '0 4px 16px rgb(34 25 24 / 8%)',
  overlay: '0 12px 32px rgb(34 25 24 / 16%)',
}
const iconography = { small: 16, default: 24, large: 32, stroke: 1.75, target: 44 }
const assets = {
  symbol: 'logo/lilleri-symbol.svg',
  symbolSmall: 'logo/lilleri-symbol-small.svg',
  symbolMono: 'logo/lilleri-symbol-mono.svg',
  symbolOnDark: 'logo/lilleri-symbol-on-dark.svg',
  wordmark: 'logo/lilleri-wordmark.svg',
  wordmarkOnDark: 'logo/lilleri-wordmark-on-dark.svg',
  wordmarkSignature: 'logo/lilleri-wordmark-signature.svg',
  lockup: 'logo/lilleri-lockup-horizontal.svg',
  lockupOnDark: 'logo/lilleri-lockup-horizontal-on-dark.svg',
  lockupVertical: 'logo/lilleri-lockup-vertical.svg',
  appIcon: 'png/app-icon-1024.png',
  adaptiveForeground: 'icon/app-icon-android-foreground.svg',
  adaptiveBackground: 'icon/app-icon-android-background.svg',
  favicon: 'icon/favicon.svg',
  socialAvatar: 'icon/social-avatar.svg',
  maskable: 'icon/pwa-maskable-512.svg',
  fontRegular: 'fonts/Geist-Regular.ttf',
  fontMedium: 'fonts/Geist-Medium.ttf',
  fontSemibold: 'fonts/Geist-Semibold.ttf',
}
write(
  'tokens/colors.json',
  json({
    $description:
      'Consolidated T3 roles. Source: tokens/palette-source.json; primarySoft is decorative only.',
    ...colors,
  }),
)
const dtcg = {
  $description:
    'Lilleri semantic tokens; px units for web, pt-equivalent logical units for native. Generated by tools/brand-render/build-final.mjs.',
}
dtcg.color = Object.fromEntries(
  Object.entries(colors).map(([mode, roles]) => [
    mode,
    Object.fromEntries(
      Object.entries(roles).map(([role, value]) => [
        role,
        { $type: Array.isArray(value) ? 'colorArray' : 'color', $value: value },
      ]),
    ),
  ]),
)
for (const [groupName, values] of Object.entries({
  spacing,
  radius,
  motion,
  elevation,
  typography,
  iconography,
}))
  dtcg[groupName] = Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      name,
      {
        $type: ['spacing', 'radius'].includes(groupName)
          ? 'dimension'
          : typeof value === 'number'
            ? 'number'
            : typeof value === 'string'
              ? 'string'
              : 'composite',
        $value: ['spacing', 'radius'].includes(groupName) ? { value, unit: 'px' } : value,
      },
    ]),
  )
write('tokens/tokens.json', json(dtcg))
const exports = { colors, typography, spacing, radius, motion, elevation, iconography, assets }
const ts =
  '// Generated by tools/brand-render/build-final.mjs. Runtime has no dependencies.\n' +
  Object.entries(exports)
    .map(([name, value]) => `export const ${name} = ${JSON.stringify(value, null, 2)} as const;`)
    .join('\n\n') +
  '\nexport const tokens = { colors, color: colors, typography, spacing, space: spacing, radius, motion, elevation, iconography } as const;\nexport type BrandTheme = keyof typeof colors;\nexport type BrandColorRole = keyof typeof colors.light;\nexport type BrandTypographyStyle = keyof typeof typography.scale;\n'
write('tokens/tokens.ts', ts)
write('src/index.ts', ts)
const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
let css = '/* Generated by tools/brand-render/build-final.mjs. */\n'
for (const mode of ['light', 'dark']) {
  css += `${mode === 'light' ? ':root, [data-theme="light"]' : '[data-theme="dark"]'} {\n`
  for (const [role, value] of Object.entries(colors[mode])) {
    if (Array.isArray(value))
      value.forEach((color, index) => {
        css += `  --lilleri-color-chart-${index + 1}: ${color};\n`
      })
    else css += `  --lilleri-color-${kebab(role)}: ${value};\n`
  }
  if (mode === 'light') {
    for (const [name, value] of Object.entries(spacing))
      css += `  --lilleri-space-${name}: ${value}px;\n`
    for (const [name, value] of Object.entries(radius))
      css += `  --lilleri-radius-${name}: ${value}px;\n`
    for (const [name, value] of Object.entries(typography.webFamily))
      css += `  --lilleri-font-${name}: ${value};\n`
    for (const [name, value] of Object.entries(scale))
      css += `  --lilleri-type-${kebab(name)}-size: ${value.webSize}px;\n  --lilleri-type-${kebab(name)}-line-height: ${value.webLineHeight}px;\n  --lilleri-type-${kebab(name)}-weight: ${value.weight};\n`
    css += `  --lilleri-motion-fast: ${motion.fast}ms;\n  --lilleri-motion-normal: ${motion.normal}ms;\n  --lilleri-motion-slow: ${motion.slow}ms;\n  --lilleri-motion-easing: ${motion.easing};\n`
  }
  css += '}\n'
}
css +=
  '.lilleri-amount { font-variant-numeric: tabular-nums lining-nums; }\n@media (prefers-reduced-motion: reduce) { :root { --lilleri-motion-fast: 0ms; --lilleri-motion-normal: 0ms; --lilleri-motion-slow: 0ms; } }\n'
write('tokens/tokens.css', css)

// Validate every text role on every surface; chart fills are reviewed independently.
const report = {
  measuredAt: '2026-10-02',
  method: 'WCAG 2.x relative luminance, sRGB',
  pairs: [],
  decorativeExcluded: ['border', 'primarySoft', 'chart'],
}
for (const mode of ['light', 'dark']) {
  const c = colors[mode]
  for (const role of [
    'textPrimary',
    'textSecondary',
    'textTertiary',
    'primary',
    'secondary',
    'accent',
    'success',
    'warning',
    'danger',
    'info',
    'positive',
    'negative',
    'borderStrong',
  ]) {
    const floor = role === 'borderStrong' ? 3 : 4.5
    for (const surface of ['background', 'surface', 'surfaceElevated']) {
      const ratio = contrast(c[role], c[surface])
      report.pairs.push({
        mode,
        role,
        background: surface,
        ratio: Number(ratio.toFixed(3)),
        floor,
        pass: ratio >= floor,
      })
      if (ratio < floor) throw new Error(`Contrast failure ${mode}.${role}/${surface}: ${ratio}`)
    }
  }
  const ratio = contrast(c.onPrimary, c.primary)
  report.pairs.push({
    mode,
    role: 'onPrimary',
    background: 'primary',
    ratio: Number(ratio.toFixed(3)),
    floor: 4.5,
    pass: ratio >= 4.5,
  })
  if (ratio < 4.5) throw new Error('Button contrast failure')
}
write('tokens/contrast-report.json', json(report))
write(
  'tokens/contrast-report.txt',
  report.pairs
    .map(
      (p) =>
        `${p.mode} ${p.role} on ${p.background}: ${p.ratio.toFixed(3)}:1 (${p.pass ? 'PASS' : 'FAIL'}, floor ${p.floor})`,
    )
    .join('\n') + '\n',
)

for (const size of [1024, 64, 32, 24, 16])
  write(`png/symbol-${size}.png`, renderSvg(size <= 24 ? small : symbol, { width: size }))
write('png/app-icon-1024.png', renderSvg(full, { width: 1024 }))
write(
  'png/app-icon-dark-1024.png',
  renderSvg(fs.readFileSync(path.join(out, 'icon/app-icon-ios-dark-1024.svg'), 'utf8'), {
    width: 1024,
  }),
)
for (const [from, to, bg, width] of [
  ['logo/lilleri-lockup-horizontal.svg', 'png/lockup-light.png', colors.light.background, 1400],
  [
    'logo/lilleri-lockup-horizontal-on-dark.svg',
    'png/lockup-dark.png',
    colors.dark.background,
    1400,
  ],
  ['logo/lilleri-wordmark.svg', 'png/wordmark.png', colors.light.background, 1000],
])
  write(to, renderSvg(fs.readFileSync(path.join(out, from), 'utf8'), { width, background: bg }))
const biome = path.join(root, 'node_modules/.bin/biome')
if (fs.existsSync(biome))
  execFileSync(
    biome,
    ['format', '--write', path.join(out, 'src/index.ts'), path.join(out, 'tokens')],
    { stdio: 'pipe' },
  )
console.log(
  `Brand consolidated: ${report.pairs.length} required contrast pairs passed. API: colors, typography, spacing, radius, motion, elevation, iconography, assets, tokens.`,
)
