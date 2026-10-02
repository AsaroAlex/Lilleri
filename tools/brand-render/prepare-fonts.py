"""Regenerate fonts/*.ttf from the npm font packages (requires: pip install fonttools brotli; pnpm install).
The committed TTFs are redistributed under the SIL Open Font License 1.1 (see LICENSE-*.txt)."""
from fontTools.ttLib import TTFont
import glob, os, shutil
here = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(here, 'fonts'), exist_ok=True)
woff2 = {
    'Inter': 'node_modules/@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2',
    'Newsreader': 'node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2',
    'Manrope': 'node_modules/@fontsource-variable/manrope/files/manrope-latin-ext-wght-normal.woff2',
    'PlusJakartaSans': 'node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-ext-wght-normal.woff2',
    'InstrumentSans': 'node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-ext-wght-normal.woff2',
}
for name, rel in woff2.items():
    src = os.path.join(here, rel)
    if not os.path.exists(src):
        alt = glob.glob(src.replace('latin-ext-', 'latin-'))
        src = alt[0] if alt else None
    if not src:
        print('missing', name); continue
    f = TTFont(src); f.flavor = None
    f.save(os.path.join(here, 'fonts', f'{name}-Variable.ttf')); print('converted', name)
for name, rel in {'Geist': 'node_modules/geist/dist/fonts/geist-sans/Geist-Variable.ttf', 'GeistMono': 'node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.ttf'}.items():
    src = os.path.join(here, rel)
    if os.path.exists(src):
        shutil.copy(src, os.path.join(here, 'fonts', f'{name}-Variable.ttf')); print('copied', name)
