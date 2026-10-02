# @lilleri/brand-render

Small Node toolkit used during the brand phase to render SVG assets with embedded fonts and to
judge them at real sizes. All scripts take plain SVG files (must declare a `viewBox`; no CSS
classes, filters or external references).

```bash
cd tools/brand-render && pnpm install            # resvg, sharp and the font packages
node render.mjs in.svg out.png --width 1024 --bg "#F6F1E7"
node icon-sheet.mjs app-icon.svg sheet.png --title "Lilleri"   # 256→16 px on light/dark, 1:1 px
node shelf.mjs app-icon.svg shelf.png --seed 3                  # icon among 29 generic finance icons
node contrast.mjs "#1F1B17" "#F6F1E7"                           # WCAG 2.x ratio + level
node contrast.mjs palette.json                                  # matrix for light/dark roles
node palette-sheet.mjs palette.json sheet.png                   # swatches + mock home screen
```

Fonts available to the renderer by family name: `Geist`, `GeistMono`, `Inter`, `Newsreader`,
`Manrope`, `PlusJakartaSans`, `InstrumentSans` (variable TTFs in `fonts/`, SIL OFL 1.1, see the
LICENSE files there; regenerate with `python3 prepare-fonts.py` after `pip install fonttools brotli`).

The generic icons in `shelf.mjs` are procedurally generated placeholders, not competitor logos.
