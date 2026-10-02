"""Build outlined specimens from the actual local font binaries and record measurements.
GSUB tnum substitutions are applied explicitly to figures; no browser fallback is involved.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
import json, html, shutil

ROOT = Path(__file__).resolve().parents[2]
FONT = ROOT / 'tools/brand-render/fonts'
OUT = ROOT / 'packages/brand/explorations/type'
BUNDLE = ROOT / 'packages/brand/fonts'
OUT.mkdir(parents=True, exist_ok=True)
BUNDLE.mkdir(parents=True, exist_ok=True)
families = ['Geist', 'Inter', 'Manrope', 'PlusJakartaSans', 'InstrumentSans', 'Newsreader']
cache = {}
def font_path(family):
    full = OUT / 'source-fonts' / f'{family}-Variable.ttf'
    return full if full.exists() else FONT / f'{family}-Variable.ttf'
def face(family, weight=400):
    key = (family, weight)
    if key not in cache:
        f = TTFont(font_path(family))
        axes = {a.axisTag: a.defaultValue for a in f['fvar'].axes}
        axes['wght'] = weight
        if 'opsz' in axes: axes['opsz'] = 32
        cache[key] = instantiateVariableFont(f, axes, inplace=False)
    return cache[key]

def substitutions(f, feature):
    mapping = {}
    if 'GSUB' not in f: return mapping
    table = f['GSUB'].table
    for rec in table.FeatureList.FeatureRecord:
        if rec.FeatureTag == feature:
            for idx in rec.Feature.LookupListIndex:
                for sub in table.LookupList.Lookup[idx].SubTable:
                    if hasattr(sub, 'ExtSubTable'): sub = sub.ExtSubTable
                    mapping.update(getattr(sub, 'mapping', {}))
    return mapping

def outlined(family, text, x, y, size, weight=400, tnum=False, fill='#221918'):
    f = face(family, weight)
    cmap = f.getBestCmap(); glyphset = f.getGlyphSet(); units = f['head'].unitsPerEm
    mapping = substitutions(f, 'tnum') if tnum else {}
    paths = []; pen_x = 0
    for ch in text:
        glyph = cmap.get(ord(ch), '.notdef'); glyph = mapping.get(glyph, glyph)
        pen = SVGPathPen(glyphset); glyphset[glyph].draw(pen)
        d = pen.getCommands()
        if d: paths.append(f'<path transform="translate({pen_x} 0)" d="{d}"/>')
        pen_x += f['hmtx'].metrics[glyph][0]
    scale = size / units
    return f'<g fill="{fill}" transform="translate({x} {y}) scale({scale} {-scale})">' + ''.join(paths) + '</g>'

def label(text, x, y, size=16, fill='#5B4F4D'):
    return f'<text x="{x}" y="{y}" font-family="Geist" font-size="{size}" fill="{fill}">{html.escape(text)}</text>'

def sheet(name, title, rows, height):
    content = '<rect width="1440" height="%s" fill="#F7EFE7"/>' % height
    content += label(title, 48, 46, 26, '#782443')
    content += label('Actual outlined local binaries · tnum applied to amount rows · expert inspection, no user test', 48, 78)
    content += ''.join(rows)
    (OUT / f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 {height}">{content}</svg>\n')

rows = []
for idx, family in enumerate(families):
    y = 140 + idx * 235
    rows += [label(family + ' 400 / 500', 48, y, 18, '#782443'),
             outlined(family, 'Il1 O0 lilleri', 48, y+42, 32),
             outlined(family, '12.438,72 €    −1.234,56 €    +2.350,00 €', 48, y+94, 36, 500, True),
             outlined(family, '€ £ $ CHF    àèéìòù ß ñ ç œ ğ ș ț', 48, y+136, 24),
             outlined(family, 'Esselunga · Alimentari · Da controllare', 48, y+176, 16)]
sheet('comparison', 'Lilleri — six UI/type candidates', rows, 1570)
rows = []
for idx, family in enumerate(families):
    y = 144 + idx * 185
    rows += [label(family + ' · tabular figures', 48, y, 18, '#782443')]
    for n, amount in enumerate(['111.111,11 €', '888.888,88 €', '−1.234.567,89 €']):
        rows.append(outlined(family, amount, 48, y+44+n*38, 28, 500, True))
    rows.append(outlined(family, '12.438,72 €', 770, y+45, 14, 500, True))
    rows.append(outlined(family, '12.438,72 €', 770, y+89, 20, 500, True))
    rows.append(outlined(family, '12.438,72 €', 770, y+139, 32, 500, True))
sheet('numbers', 'Lilleri — real amounts and equal-width digit alignment', rows, 1340)
rows = []
for idx, family in enumerate(['Geist', 'GeistMono', 'Inter', 'Manrope', 'PlusJakartaSans', 'InstrumentSans', 'Newsreader']):
    y = 144 + idx * 135
    rows += [label(family, 48, y, 18, '#782443'), outlined(family, 'I l 1    O 0    € £ $ CHF    àèéìòù ß ñ ç œ', 48, y+65, 36)]
sheet('glyphs', 'Lilleri — ambiguous glyphs, currencies and European accents', rows, 1160)

# Used by the presentation board: actual outlines prevent font-family fallback.
for filename, copy, width, height, size in [('editorial-headline', 'I tuoi soldi, una vista chiara.', 1312, 100, 66), ('editorial-label', 'Newsreader', 350, 60, 38)]:
    (OUT/f'{filename}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">' + outlined('Newsreader', copy, 0, size+2, size, 500) + '</svg>\n')

measurements = []
test = '0123456789€£$àèéìòùßñçœğșț'
for family in families + ['GeistMono']:
    f = TTFont(font_path(family)); cmap = f.getBestCmap()
    features = sorted({r.FeatureTag for table in ['GSUB', 'GPOS'] if table in f for r in f[table].table.FeatureList.FeatureRecord})
    tab = substitutions(f, 'tnum')
    widths = [f['hmtx'].metrics[tab.get(cmap[ord(ch)], cmap[ord(ch)])][0] for ch in '0123456789']
    measurements.append({'family': family, 'source': str(font_path(family).relative_to(ROOT)), 'version': f['name'].getDebugName(5), 'bytes': font_path(family).stat().st_size,
                         'axes': {a.axisTag: [a.minValue, a.defaultValue, a.maxValue] for a in f['fvar'].axes},
                         'features': features, 'tnum_digit_widths': widths, 'unitsPerEm': f['head'].unitsPerEm,
                         'missing_test_glyphs': [c for c in test if ord(c) not in cmap], 'narrow_nbsp_present': 0x202f in cmap})
(OUT/'font-measurements.json').write_text(json.dumps(measurements, indent=2, ensure_ascii=False)+'\n')

# Static mobile faces avoid platform-dependent variable weight selection.
for weight, style in [(400,'Regular'), (500,'Medium'), (600,'Semibold')]:
    f = face('Geist', weight)
    for n in f['name'].names:
        if n.nameID in [1, 16]: n.string = 'Geist'.encode(n.getEncoding())
        if n.nameID in [2, 17]: n.string = style.encode(n.getEncoding())
        if n.nameID == 6: n.string = f'Geist-{style}'.encode(n.getEncoding())
    f.save(BUNDLE/f'Geist-{style}.ttf')
for family in ['Geist', 'Newsreader', 'GeistMono']:
    shutil.copyfile(font_path(family), BUNDLE/f'{family}-Variable.ttf')
    f = TTFont(font_path(family)); f.flavor = 'woff2'; f.save(BUNDLE/f'{family}-Variable.woff2')
    license_family = 'Geist' if family == 'GeistMono' else family
    shutil.copyfile(FONT/f'LICENSE-{license_family}-OFL.txt', BUNDLE/f'LICENSE-{family}-OFL.txt')
print('Wrote three outlined type specimen sheets, measured seven fonts, bundled licensed selected fonts.')
