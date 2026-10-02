# Lilleri public project page

Next.js landing page with local Geist and Newsreader fonts, original brand artwork, responsive layouts and explicit development-stage copy. It has no signup form, email capture, real banking connection or tracking integration.

From the repository root:

```sh
pnpm --filter @lilleri/web dev
pnpm --filter @lilleri/web typecheck
pnpm --filter @lilleri/web build
pnpm --filter @lilleri/web start
```

`predev`, `prebuild` and `prestart` copy the required original SVG files from `packages/brand` to ignored `public/brand`. No symlinks or external font downloads are needed. The page uses local anchor destinations for its project/privacy actions and supports system dark mode plus an explicit theme control.
