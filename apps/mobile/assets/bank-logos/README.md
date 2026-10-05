# Bank and service artwork

50 existing marks identify 55 exact service IDs in the bank directory, including all 18 Italian services. Unverified services retain their text monogram. The component uses local SVG on web and generated transparent PNG on native, with a white plate in both themes and no colour tinting.

`sources.json` records each original repository, commit, file or sprite symbol, corroborating source, original and bundled SHA-256, transformation, and rights information. Simple Icons paths retain their original geometry; the root fill uses the colour in that project's brand metadata. Other SVG contents are unchanged. MPS and Swedbank embed the original 136 × 136 PNG; their displayed size is capped according to device pixel density. No runtime logo lookup or third-party image request is used.

From the repository root, regenerate native PNGs and the explicit platform registries with:

```sh
node tools/bank-logos/build.mjs
pnpm exec biome format --write apps/mobile/src/bank-logo-assets.ts apps/mobile/src/bank-logo-assets.web.ts
```

The generator checks bundled source hashes, rejects active content and external resources, and requires a resolution limit for embedded raster artwork. Only verified directory IDs are mapped; parent-company or similarly named logos are not inferred.

The original owners retain all trademark rights. Included upstream notices cover Simple Icons (CC0), PayPal SDK Logos and Juspay Hyperswitch Web (Apache 2.0), and Auraveni Global Bank Logos (MIT). VectorLogoZone states that modifications to its logos are public domain while original logo rights remain with their owners; this does not apply its website software licence to the marks. MultiSafepay provides the Postepay payment-method asset without a stated repository licence. The existing Mediolanum vector is corroborated by the Commons `PD-textlogo`/`PD-USonly` file record. Per-asset details are in the manifest; original licence files are in `licenses/`.
