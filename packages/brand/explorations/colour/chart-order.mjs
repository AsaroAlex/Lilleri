// Searches the categorical chart order for each territory: slot 1 is fixed to the signature family, the other five
// families are permuted, and each slot's lightness is stepped inside an aesthetic window per hue family. A candidate
// must keep OKLCH chroma >= 0.10 and >= 3:1 against every surface; an order is scored on the worst ADJACENT pair
// (including slot 6 -> slot 1, because spending donuts wrap) under protanopia/deuteranopia, with the normal-vision
// floor (>= 15) as a hard gate. One order is chosen per territory for BOTH modes, so a category keeps its hue when
// the theme changes. Output: chart-order.json (read by palettes.mjs).
// Usage: node chart-order.mjs   (needs t1/t2/t3.json for the surfaces; ~15 s)
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fromOklch, oklch, oklab, simulate, contrast } from './colour-math.mjs'
import fs from 'node:fs'
const dir = path.dirname(fileURLToPath(import.meta.url)) + '/'
// [hue, chroma, [lightL..], [darkL..]]  aesthetic windows per hue family
const W = {
  cotto: [42, 0.125, [0.51, 0.56], [0.58, 0.63]],
  clay: [45, 0.125, [0.50, 0.59], [0.56, 0.64]],
  olive: [125, 0.11, [0.51, 0.56], [0.57, 0.63]],
  wine: [2, 0.135, [0.465, 0.50], [0.55, 0.60]],
  blue: [250, 0.115, [0.47, 0.59], [0.55, 0.65]],
  ochre: [82, 0.12, [0.59, 0.645], [0.62, 0.67]],
  plum: [330, 0.12, [0.50, 0.62], [0.55, 0.65]],
  green: [138, 0.12, [0.50, 0.60], [0.55, 0.65]],
  teal: [200, 0.115, [0.56, 0.625], [0.57, 0.66]],
}
const terr = { t1: ['cotto','blue','ochre','plum','green','teal'], t2: ['olive','plum','ochre','blue','clay','teal'], t3: ['wine','teal','ochre','blue','green','clay'] }
const perms = a => a.length <= 1 ? [a] : a.flatMap((x,i) => perms([...a.slice(0,i),...a.slice(i+1)]).map(p => [x,...p]))
const d = (A,B) => 100*Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2])
const out = {}
for (const [t, fams] of Object.entries(terr)) {
  const pal = JSON.parse(fs.readFileSync(dir + t + '.json','utf8'))
  out[t] = {}
  for (const mode of ['light','dark']) {
    const surf = [pal[mode].background, pal[mode].surface, pal[mode].surfaceElevated]
    const cand = fams.map(f => { const [h,C,wl,wd] = W[f]; const [a,b] = mode==='light'?wl:wd; const res=[]; for (let L=a; L<=b+1e-9; L+=0.015) { const hex=fromOklch(L,C,h); const c=oklch(hex)[1]; const cr=Math.min(...surf.map(s=>contrast(hex,s))); if (c>=0.1005 && cr>=3) res.push({hex,L,n:oklab(hex),p:oklab(simulate(hex,'protan')),de:oklab(simulate(hex,'deutan'))}) } if(!res.length) console.log('no cand',t,mode,f); return res })
    out[t][mode]={cand}
  }
  let jbest=null
  for (const order of perms([1,2,3,4,5])) {
    const idx=[0,...order]; const per={}
    for (const mode of ['light','dark']) {
      const cand=out[t][mode].cand; let best=null
      {
        const rec=(i,ch)=>{ if(i===6){ let mc=1e9,mn=1e9; for(let k=0;k<6;k++){const a=ch[k],b=ch[(k+1)%6]; mc=Math.min(mc,d(a.p,b.p),d(a.de,b.de)); mn=Math.min(mn,d(a.n,b.n))} if(mn<15) return; const s=mc+0.15*mn; if(!best||s>best.s) best={s,mc,mn,hex:ch.map(c=>c.hex),fam:idx.map(j=>fams[j])}; return } for(const c of cand[idx[i]]) rec(i+1,[...ch,c]) }
      rec(0,[])
      }
      per[mode]=best
    }
    if(!per.light||!per.dark) continue
    const js=Math.min(per.light.s,per.dark.s)
    if(!jbest||js>jbest.js) jbest={js,per}
  }
  out[t]={light:jbest.per.light,dark:jbest.per.dark}
  for (const mode of ['light','dark']) { const b=jbest.per[mode]; console.log(t,mode,`minCVD ${b.mc.toFixed(1)} minNormal ${b.mn.toFixed(1)}`, b.fam.join(','), JSON.stringify(b.hex)) }
}
for (const t of Object.keys(out)) for (const m of ['light','dark']) delete out[t][m].s
fs.writeFileSync(dir + 'chart-order.json', JSON.stringify(Object.fromEntries(Object.entries(out).map(([t,v]) => [t, { order: v.light.fam, light: v.light.hex, dark: v.dark.hex, minCvd: { light: +v.light.mc.toFixed(1), dark: +v.dark.mc.toFixed(1) }, minNormal: { light: +v.light.mn.toFixed(1), dark: +v.dark.mn.toFixed(1) } }])), null, 2) + '\n')
