// Direction C generator: superellipse "lillero" pebble sketches.
// Usage: node gen.mjs sketch2 <out.png>
import fs from 'node:fs'
import { renderSvg, place, esc } from '/tmp/claude-0/-home-user-Lilleri/aa688b9e-d7be-59d9-9317-1813d675187c/scratchpad/brandtools/lib.mjs'

const r2 = (v) => Math.round(v * 100) / 100

/** Superellipse as a closed cubic-Bezier path. nTop / nBottom let the pebble be rounder on top and flatter below.
 *  Tangents are Catmull-Rom (chord based), which stays finite at the axis points (the analytic tangent does not). */
export function superellipsePath({ cx, cy, a, b, n = 3.3, nTop, nBottom, rot = 0, segs = 24 }) {
  const rad = (rot * Math.PI) / 180
  const pt = (t) => {
    const c = Math.cos(t), s = Math.sin(t)
    const nn = s < 0 ? (nTop ?? n) : (nBottom ?? n) // svg y grows downward: sin<0 is the top half
    const e = 2 / nn
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), e)
    const y = b * Math.sign(s) * Math.pow(Math.abs(s), e)
    return [cx + x * Math.cos(rad) - y * Math.sin(rad), cy + x * Math.sin(rad) + y * Math.cos(rad)]
  }
  const dt = (2 * Math.PI) / segs
  const P = []
  for (let i = 0; i < segs; i++) P.push(pt(i * dt))
  const T = P.map((_, i) => {
    const p = P[(i - 1 + segs) % segs], q = P[(i + 1) % segs]
    const v = [q[0] - p[0], q[1] - p[1]]; const L = Math.hypot(v[0], v[1]) || 1
    return [v[0] / L, v[1] / L]
  })
  let d = `M${r2(P[0][0])} ${r2(P[0][1])}`
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % segs
    const chord = Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1])
    const k = chord / 3
    const c1 = [P[i][0] + T[i][0] * k, P[i][1] + T[i][1] * k]
    const c2 = [P[j][0] - T[j][0] * k, P[j][1] - T[j][1] * k]
    d += ` C${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(P[j][0])} ${r2(P[j][1])}`
  }
  return d + ' Z'
}

export const INK = '#1F1B17', PAPER = '#F6F1E7', OLIVE = '#4F5D3A', SAGE = '#A7B58B', NIGHT = '#15130F'

const rotOff = (dx, dy, deg) => { const r = (deg * Math.PI) / 180; return [512 + dx * Math.cos(r) - dy * Math.sin(r), 512 + dx * Math.sin(r) + dy * Math.cos(r)] }

/** Pebble with a dimple. opts: outer {a,b,nTop,nBottom}, dimple {dx,dy,a,b,n}, rot */
export function pebble({ outer, dimple, rot = 0, fill = INK }) {
  const o = superellipsePath({ cx: 512, cy: 512, ...outer, rot })
  if (!dimple) return `<path d="${o}" fill="${fill}"/>`
  const [cx, cy] = rotOff(dimple.dx, dimple.dy, rot)
  const d = superellipsePath({ cx, cy, a: dimple.a, b: dimple.b, n: dimple.n, rot })
  return `<path d="${o} ${d}" fill="${fill}" fill-rule="evenodd"/>`
}

export const svg1024 = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${body}</svg>`

/** App-icon mock: paper field + pebble scaled to `scale` of the field. */
export function iconField(markBody, { bg = PAPER, scale = 0.62 } = {}) {
  // scale the 1024 mark about its centre by nesting an svg
  const s = 1024 * scale, off = (1024 - s) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="${bg}"/><svg x="${off}" y="${off}" width="${s}" height="${s}" viewBox="0 0 1024 1024">${markBody}</svg></svg>`
}

export function sheet(variants, { title, bg = PAPER, fg = INK, sizes = [160, 64, 32, 24, 16] } = {}) {
  const pad = 24, colW = 620, rowH = 200
  const W = pad * 2 + colW * 3
  const rows = Math.ceil(variants.length / 3)
  const H = 56 + rows * rowH + pad
  let body = `<rect width="${W}" height="${H}" fill="${bg}"/><text x="${pad}" y="36" font-family="Geist" font-size="18" font-weight="600" fill="${fg}">${esc(title)}</text>`
  variants.forEach(([name, mark, extra], i) => {
    const x0 = pad + (i % 3) * colW, y0 = 56 + Math.floor(i / 3) * rowH
    let x = x0
    for (const s of sizes) {
      body += place(svg1024(mark), x, y0 + (160 - s) / 2, s, s)
      x += s + 14
    }
    if (extra) for (const e of extra) { // 60px icon mocks with iOS-like mask
      const id = `m${i}${x}`
      body += `<clipPath id="${id}"><rect x="${x}" y="${y0 + 50}" width="60" height="60" rx="13.4"/></clipPath><g clip-path="url(#${id})">${place(e, x, y0 + 50, 60, 60)}</g>`
      x += 72
    }
    body += `<text x="${x0}" y="${y0 + 184}" font-family="Geist" font-size="13" fill="${fg}">${esc(name)}</text>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`
}

const [, , cmd, out] = process.argv
if (cmd === 'sketch2') {
  const O1 = { a: 360, b: 340, nTop: 3.0, nBottom: 3.6 } // pebble: rounder top, flatter bottom
  const O2 = { a: 360, b: 340, n: 3.3 } // symmetric squircle (control)
  const defs = [
    ['A squircle, round dimple up-left', { outer: O2, dimple: { dx: -70, dy: -60, a: 140, b: 140, n: 2 } }],
    ['B pebble (3.0/3.6), round dimple up-left', { outer: O1, dimple: { dx: -70, dy: -60, a: 140, b: 140, n: 2 } }],
    ['C pebble, soft dimple n2.5 up-left', { outer: O1, dimple: { dx: -70, dy: -60, a: 145, b: 140, n: 2.5 } }],
    ['D pebble, round dimple up-centre (charm)', { outer: O1, dimple: { dx: 0, dy: -90, a: 135, b: 135, n: 2 } }],
    ['E pebble, round dimple low-centre (settled)', { outer: O1, dimple: { dx: 0, dy: 95, a: 135, b: 135, n: 2 } }],
    ['F pebble tilt -10, round dimple up-left', { outer: O1, dimple: { dx: -70, dy: -60, a: 140, b: 140, n: 2 }, rot: -10 }],
    ['G pebble tilt -10, soft dimple up-left', { outer: O1, dimple: { dx: -70, dy: -60, a: 145, b: 140, n: 2.5 }, rot: -10 }],
    ['H pebble wide 1.12, soft dimple up-left', { outer: { a: 372, b: 332, nTop: 3.0, nBottom: 3.6 }, dimple: { dx: -80, dy: -55, a: 145, b: 138, n: 2.5 } }],
    ['I pebble, larger dimple 0.46', { outer: O1, dimple: { dx: -60, dy: -55, a: 165, b: 160, n: 2.5 } }],
  ]
  const vs = defs.map(([name, spec]) => {
    const mono = pebble({ ...spec, fill: INK })
    const light = iconField(pebble({ ...spec, fill: OLIVE }), { bg: PAPER })
    const dark = iconField(pebble({ ...spec, fill: SAGE }), { bg: NIGHT })
    const oliveField = iconField(pebble({ ...spec, fill: PAPER }), { bg: OLIVE })
    return [name, mono, [light, dark, oliveField]]
  })
  fs.writeFileSync(out, renderSvg(sheet(vs, { title: 'Direction C — sketch 2: pebble + dimple variants; mono at 160/64/32/24/16, then 60 px icon mocks (paper, night, olive field)' })))
  console.log('wrote', out)
}
if (cmd === 'sketch3') {
  const O = { a: 360, b: 340, n: 3.3 }
  const defs = [
    ['J n3.3, circle hole 0.46 at (-60,-55)', { outer: O, dimple: { dx: -60, dy: -55, a: 165, b: 165, n: 2 } }],
    ['K n3.3, soft hole n2.5 0.46', { outer: O, dimple: { dx: -60, dy: -55, a: 168, b: 160, n: 2.5 } }],
    ['L squarer n3.8, circle hole 0.46', { outer: { a: 360, b: 340, n: 3.8 }, dimple: { dx: -65, dy: -60, a: 165, b: 165, n: 2 } }],
    ['M n3.3, circle hole 0.50', { outer: O, dimple: { dx: -55, dy: -50, a: 180, b: 180, n: 2 } }],
    ['N n3.3, hole 0.46 pushed left (-85,-35)', { outer: O, dimple: { dx: -85, dy: -35, a: 165, b: 165, n: 2 } }],
    ['O n3.3, hole 0.46 up-centre (0,-70)', { outer: O, dimple: { dx: 0, dy: -70, a: 165, b: 165, n: 2 } }],
    ['P pebble 3.0/3.6, hole 0.46, tilt -8', { outer: { a: 360, b: 340, nTop: 3.0, nBottom: 3.6 }, dimple: { dx: -60, dy: -55, a: 165, b: 165, n: 2 }, rot: -8 }],
    ['Q wide 1.10, n3.3, hole 0.46', { outer: { a: 372, b: 338, n: 3.3 }, dimple: { dx: -65, dy: -50, a: 165, b: 165, n: 2 } }],
    ['R n3.3, hole 0.42 more eccentric (-75,-70)', { outer: O, dimple: { dx: -75, dy: -70, a: 150, b: 150, n: 2 } }],
  ]
  const vs = defs.map(([name, spec]) => {
    const mono = pebble({ ...spec, fill: INK })
    const light = iconField(pebble({ ...spec, fill: OLIVE }), { bg: PAPER })
    const dark = iconField(pebble({ ...spec, fill: SAGE }), { bg: NIGHT })
    const oliveField = iconField(pebble({ ...spec, fill: PAPER }), { bg: OLIVE })
    return [name, mono, [light, dark, oliveField]]
  })
  fs.writeFileSync(out, renderSvg(sheet(vs, { title: 'Direction C — sketch 3: eccentric hole sizes and placements; mono 160/64/32/24/16, then 60 px icon mocks (paper, night, olive field)' })))
  console.log('wrote', out)
}
if (cmd === 'sketch4') {
  const O = { a: 360, b: 340, n: 3.3 }
  const defs = [
    ['O1 up-centre (0,-52) r160: walls top 128 / bottom 252', { outer: O, dimple: { dx: 0, dy: -52, a: 160, b: 160, n: 2 } }],
    ['O2 slight offset (-24,-52) r160', { outer: O, dimple: { dx: -24, dy: -52, a: 160, b: 160, n: 2 } }],
    ['J2 up-left (-60,-55) r160', { outer: O, dimple: { dx: -60, dy: -55, a: 160, b: 160, n: 2 } }],
    ['O3 up-centre (0,-60) r150: walls 130 / 250', { outer: O, dimple: { dx: 0, dy: -60, a: 150, b: 150, n: 2 } }],
    ['O4 up-centre (0,-40) r170: walls 130 / 210', { outer: O, dimple: { dx: 0, dy: -40, a: 170, b: 170, n: 2 } }],
    ['O5 up-centre, taller pebble 340x360 (0,-60) r160', { outer: { a: 340, b: 360, n: 3.3 }, dimple: { dx: 0, dy: -60, a: 160, b: 160, n: 2 } }],
  ]
  const vs = defs.map(([name, spec]) => {
    const mono = pebble({ ...spec, fill: INK })
    const light = iconField(pebble({ ...spec, fill: OLIVE }), { bg: PAPER })
    const dark = iconField(pebble({ ...spec, fill: SAGE }), { bg: NIGHT })
    const oliveField = iconField(pebble({ ...spec, fill: PAPER }), { bg: OLIVE })
    return [name, mono, [light, dark, oliveField]]
  })
  fs.writeFileSync(out, renderSvg(sheet(vs, { title: 'Direction C — sketch 4: final candidates; mono 160/64/32/24/16, then 60 px icon mocks (paper, night, olive field)' })))
  console.log('wrote', out)
}
if (cmd === 'sketch5') {
  // three variables: outline softness, icon scale, olive tone. Each row: 160 mono, 64, 32, 24, 16, then 60px icons at scale 0.62 / 0.66 / 0.70 on paper
  const H = { dx: 0, dy: -54, a: 158, b: 158, n: 2 }
  const outs = [['n3.3 (current)', { a: 360, b: 340, n: 3.3 }], ['n3.0 softer', { a: 360, b: 340, n: 3.0 }], ['n2.9 top / 3.4 bottom', { a: 360, b: 340, nTop: 2.9, nBottom: 3.4 }]]
  const olives = [['#4F5D3A', '#4F5D3A'], ['#56673F', '#56673F'], ['#5C6D40', '#5C6D40']]
  const vs = []
  for (const [on, outer] of outs) for (const [cn, col] of olives) {
    const spec = { outer, dimple: H }
    const mono = pebble({ ...spec, fill: INK })
    const icons = [0.62, 0.66, 0.70].map((sc) => iconField(pebble({ ...spec, fill: col }), { bg: PAPER, scale: sc }))
    vs.push([`${on} · olive ${cn} · icons at 62/66/70%`, mono, icons])
  }
  fs.writeFileSync(out, renderSvg(sheet(vs, { title: 'Direction C — sketch 5: outline softness x olive tone; icons at 62/66/70% of field (60 px, iOS mask)' })))
  console.log('wrote', out)
}
