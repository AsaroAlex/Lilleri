// Parametric lowercase-l builder for Direction B sketches. All coordinates integers where possible.
// l(x, top, base, S, T, ri, run, dir): stem left edge at x (for dir=+1), width S, from y=top to baseline y=base.
// Foot: thickness T, inner radius ri, flat run `run` after the inner arc, round terminal radius T/2.
// dir=+1 foot to the right; dir=-1 foot to the left (mirrored, x is then the stem's RIGHT edge).
export function lPath(x, top, base, S, T, ri, run, dir = 1, { flatCut = false, roundTop = false } = {}) {
  const ro = ri + T
  const cx = x + dir * (S + ri + run)   // terminal centre x
  const r = T / 2
  const sw = dir === 1 ? 1 : 0           // sweep flags flip when mirrored
  const sw2 = dir === 1 ? 0 : 1
  let d = ''
  if (roundTop) {
    // top as a semicircle of radius S/2
    d += `M${x} ${top + S / 2} A${S / 2} ${S / 2} 0 0 ${sw} ${x + dir * S} ${top + S / 2} `
  } else {
    d += `M${x} ${top} H${x + dir * S} `
  }
  d += `V${base - T - ri} A${ri} ${ri} 0 0 ${sw2} ${x + dir * (S + ri)} ${base - T} `
  if (flatCut) {
    d += `H${cx + dir * r} V${base} `
  } else {
    d += `H${cx} A${r} ${r} 0 0 ${sw} ${cx} ${base} `
  }
  d += `H${x + dir * ro} A${ro} ${ro} 0 0 ${sw} ${x} ${base - ro} Z`
  return d
}
export function stemPath(x, top, base, S, { roundTop = false, roundBottom = false } = {}) {
  let d = roundTop ? `M${x} ${top + S / 2} A${S / 2} ${S / 2} 0 0 1 ${x + S} ${top + S / 2} ` : `M${x} ${top} H${x + S} `
  d += roundBottom ? `V${base - S / 2} A${S / 2} ${S / 2} 0 0 1 ${x} ${base - S / 2} Z` : `V${base} H${x} Z`
  return d
}
