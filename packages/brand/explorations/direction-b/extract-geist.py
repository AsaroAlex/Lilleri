# Extract Geist Sans glyph outlines (wght=600 and 500) as SVG path data at 1000 UPM, y-up.
import json, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
src = '/tmp/claude-0/-home-user-Lilleri/aa688b9e-d7be-59d9-9317-1813d675187c/scratchpad/brandtools/fonts/Geist-Variable.ttf'
out = {}
for w in (500, 600):
    f = TTFont(src)
    inst = instantiateVariableFont(f, {'wght': w})
    gs = inst.getGlyphSet(); cmap = inst.getBestCmap(); hmtx = inst['hmtx']
    upm = inst['head'].unitsPerEm
    d = {'upm': upm, 'xHeight': inst['OS/2'].sxHeight, 'capHeight': inst['OS/2'].sCapHeight, 'ascender': inst['hhea'].ascent, 'glyphs': {}}
    for ch in 'lier':
        gn = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[gn].draw(pen)
        d['glyphs'][ch] = {'name': gn, 'adv': hmtx[gn][0], 'lsb': hmtx[gn][1], 'd': pen.getCommands()}
    # ascender of l = bounds
    from fontTools.pens.boundsPen import BoundsPen
    for ch in 'lier':
        bp = BoundsPen(gs); gs[cmap[ord(ch)]].draw(bp); d['glyphs'][ch]['bounds'] = bp.bounds
    # kerning pairs via GPOS (flattened best-effort)
    kern = {}
    try:
        gpos = inst['GPOS'].table
        for lk in gpos.LookupList.Lookup:
            for st in lk.SubTable:
                if st.LookupType == 9: st = st.ExtSubTable
                if st.LookupType != 2: continue
                if st.Format == 1:
                    cov = st.Coverage.glyphs
                    for i, ps in enumerate(st.PairSet):
                        for pvr in ps.PairValueRecord:
                            v = pvr.Value1.XAdvance if pvr.Value1 and hasattr(pvr.Value1, 'XAdvance') else 0
                            if v: kern[(cov[i], pvr.SecondGlyph)] = v
                elif st.Format == 2:
                    cov = st.Coverage.glyphs
                    c1 = st.ClassDef1.classDefs; c2 = st.ClassDef2.classDefs
                    for g1 in cov:
                        k1 = c1.get(g1, 0)
                        for g2 in gs.keys():
                            k2 = c2.get(g2, 0)
                            rec = st.Class1Record[k1].Class2Record[k2]
                            v = rec.Value1.XAdvance if rec.Value1 and hasattr(rec.Value1, 'XAdvance') else 0
                            if v and (g1, g2) not in kern: kern[(g1, g2)] = v
    except Exception as e:
        print('kern error', e, file=sys.stderr)
    names = {d['glyphs'][c]['name']: c for c in 'lier'}
    d['kern'] = {f'{names[a]}{names[b]}': v for (a, b), v in kern.items() if a in names and b in names}
    out[w] = d
json.dump(out, open('geist.json', 'w'))
for w in out:
    g = out[w]
    print(w, 'xh', g['xHeight'], 'cap', g['capHeight'], {c: (g['glyphs'][c]['adv'], g['glyphs'][c]['bounds']) for c in 'lier'}, g['kern'])
