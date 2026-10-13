---
paths:
  - "engine/FeatureSystem.ts"
  - "store/createFeatureSlice.ts"
  - "engine/features/setFeature.ts"
  - "engine/defineEnumParam.ts"
  - "engine/typedSlices.ts"
  - "utils/PresetLogic.ts"
---

# DDFS — Data-Driven Feature System

Read first: JSDoc at the top of `engine/FeatureSystem.ts`, then
[`docs/policy/ddfs-string-contract.md`](../../docs/policy/ddfs-string-contract.md) and
[`docs/policy/ddfs-auto-wiring.md`](../../docs/policy/ddfs-auto-wiring.md).

Decisions: ADRs 0007-0014, 0036-0037; ADR-0059 for `FeatureDefinition.requires` —
a feature's needs are reduced against the formula's declared capabilities by the pure
reducer in `engine-gmt/engine/compat/` (the formula side is in
[`gmt-formulas-and-graph.md`](./gmt-formulas-and-graph.md)).

## Invariants

- **The registry freezes at store construction.** Every `featureRegistry.register()`
  call must run before `createEngineStore()`. Late registration throws in dev,
  no-ops in prod.
- **Duplicate feature IDs are forbidden.** Re-registering the SAME def object is a
  no-op (HMR / double import). A DIFFERENT def under an existing id throws
  `DuplicateFeatureError` in prod but only `console.warn`s-and-replaces in dev, so a quiet
  dev console is not proof there is no collision.
- **Features are isolated — by convention, not by enforcement.** State lives at
  `store[featureId]`; reading another feature's state requires `dependsOn: ['otherId']`.
  `dependsOn` drives registration ORDER and a register-time existence check; nothing
  intercepts an undeclared read at runtime. Declare it anyway: the ordering is real and the
  declaration makes the dependency greppable.
- **Every DDFS param is animatable and undoable by construction.** Adding a param
  gets you keyframes + undo + preset round-trip with no per-feature wiring.
- Coordination between features uses bridges or derived values — never store
  reach-through, never feature A's setter poking feature B's state.
- Multi-axis params: scalar-state + `composeFrom`.

## Don't

- Don't add a manual Zustand slice for feature state. Use `defineFeature`.
- Don't depend on `set${Feature}` by name-inference in animation — the engine
  auto-binds via the registry. Custom binders go through `binderRegistry.register()`.
- Don't leave vestigial fields (`tabConfig.dock`, `defaultActive`, `aggregatesFrom`)
  on feature defs.

## Guards

```
npm run typecheck
npm run test:share-dictionary   # node-only: getDictionary() collision-free, memoised, and every
                                # feature slice round-trips through UrlStateEncoder
npm run smoke:interact
```

`smoke:interact` boots `demo.html` and is the only end-to-end proof that the generated
`set${Feature}` setter, `createFeatureSlice`'s type sanitiser and the preset round-trip
through `PresetLogic.sanitizeFeatureState` still work, on float, vec2 and color params.
Not covered: the registry-freeze and duplicate-id invariants, and `int`, `bool`, `enum`,
`gradient` and `image` params.
