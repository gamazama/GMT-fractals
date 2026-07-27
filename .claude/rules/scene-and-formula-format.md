---
paths:
  - "engine-gmt/utils/FormulaFormat.ts"
  - "utils/SceneFormat.ts"
  - "engine-gmt/features/fragmentarium_import/**"
---

# GMF save/load, scene serialisation, Formula Workshop

Read first: JSDoc on `engine-gmt/utils/FormulaFormat.ts` and `utils/SceneFormat.ts`;
JSDoc on `engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx` (the V3/V4
importer and the `importSource` lifecycle).

Decisions: ADRs 0052-0053 (save/load), ADR-0058 (Formula Workshop).

## Migrations are the risk

Every field added to a scene has to survive a round-trip from an older file.
Adding a field without a migration means old scenes silently lose it. The migration
chain is versioned — append to it, don't renumber.

`?s=<id>` share-by-link round-trips through backend GMF, so a format change affects
shared links too, not just local saves.

## Guards

```
npm run test:gmf
npm run test:migrations
npm run smoke:migrations
npm run test:frag
npm run test:frag:integration
npm run smoke:share-link
npm run smoke:gallery-link
```