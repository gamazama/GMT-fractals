---
paths:
  - "engine-gmt/utils/FormulaFormat.ts"
  - "utils/SceneFormat.ts"
  - "utils/UrlStateEncoder.ts"
  - "utils/Sharing.ts"
  - "engine-gmt/features/fragmentarium_import/**"
---

# GMF save/load, scene serialisation, Formula Workshop

Read first: JSDoc on `engine-gmt/utils/FormulaFormat.ts` and `utils/SceneFormat.ts`;
JSDoc on `engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx` (the V3/V4
importer and the `importSource` lifecycle).

Decisions: ADRs 0052-0053 (save/load), ADR-0058 (Formula Workshop).

## Migrations are the risk

Every field added to a scene has to survive a round-trip from an older file: without a
migration, old scenes silently lose it. The migration chain is versioned — append to it,
don't renumber. `?s=<id>` share-by-link round-trips through backend GMF, so a format
change affects shared links too.

## Guards

```
npm run test:gmf
npm run test:migrations
npm run smoke:migrations
npm run test:frag
npm run test:frag:integration
npm run test:frag:catalog-drift   # node-only, ~10 s: no catalog `pass` row errors under its pipeline today
npm run test:share-dictionary   # node-only, ~1 s: the share dictionary and a full-slice round-trip
npm run smoke:share-link
npm run smoke:gallery-link
```

- `npm run test:frag:integration:discover` is the full ~580-file sweep, diagnostic-only and
  permanently red: 289 by-design rejections and 18 real importer gaps (unsupported
  `samplerCube` / texture uniform syntax, two parser null-derefs). Run it before concluding
  the importer handles a given family of formulas.
- `npm run test:frag:v` is `test:frag` with `--verbose`: it prints the generated GLSL for
  the formula that failed.
- `npm run smoke:gallery-link` **skips at exit 0** on a build with no `VITE_SUPABASE_*`, so
  a green run on a fresh checkout proves nothing about this path.
- `report:frag:scan` is **a report, not a guard**: it exits 0 whatever it finds (1 only on
  zero `.frag` files).
