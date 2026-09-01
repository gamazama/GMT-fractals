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

Decisions: ADRs 0007-0014, 0036-0037.

## Invariants

- **The registry freezes at store construction.** Every `featureRegistry.register()`
  call must run before `createEngineStore()`. Late registration throws in dev,
  no-ops in prod.
- **Duplicate feature IDs are forbidden.** Re-registering the SAME def object is a
  no-op (HMR / double import). A DIFFERENT def under an existing id throws
  `DuplicateFeatureError` in prod but only `console.warn`s-and-replaces in dev,
  because Vite HMR legitimately produces fresh def objects. Don't read a quiet dev
  console as proof there is no collision — that path fails loudly only in a
  production build.
- **Features are isolated — by convention, not by enforcement.** State lives at
  `store[featureId]`. Reading another feature's state requires `dependsOn:
  ['otherId']` in the feature def. `dependsOn` drives registration ORDER and a
  register-time existence check; **nothing intercepts an undeclared read at
  runtime.** (Corrected 2026-09-01 — this bullet previously claimed "undeclared
  access throws in dev, warns in prod". Grep `dependsOn` in
  `engine/FeatureSystem.ts`: the only uses are the topological sort and the
  registration check.) Declare it anyway; the ordering is real and the
  declaration is what makes the dependency greppable.
- **Every DDFS param is animatable and undoable by construction.** Adding a param
  gets you keyframes + undo + preset round-trip with no per-feature wiring.
- Coordination between features uses bridges or derived values — never ad-hoc store
  reach-through, never feature A's setter poking feature B's state.

## Don't

- Don't add a manual Zustand slice for feature state. Use `defineFeature`.
- Don't depend on `set${Feature}` by name-inference in animation — the engine
  auto-binds via the registry. Custom binders go through `binderRegistry.register()`.
- Don't leave vestigial fields (`tabConfig.dock`, `defaultActive`, `aggregatesFrom`)
  on feature defs. Delete or migrate as you go.

## Multi-axis params

Scalar-state + `composeFrom` is the pattern for params with more than one axis.

## Guards

This rule carried NO guard block until 2026-07-29, which read as "nothing covers
DDFS at runtime". Something does:

```
npm run typecheck
npm run smoke:interact
```

`smoke:interact` boots `demo.html` and is the only end-to-end proof that the
auto-generated `set${Feature}` setter, `createFeatureSlice`'s type sanitiser and
the preset round-trip through `PresetLogic.sanitizeFeatureState` all still work.
It exercises four param types on the Demo feature — float, vec2, color and the
save/load path for each. Falsified 2026-07-29 five ways, each reverted: making
the float branch swallow writes reds "state mutation did not persist"; making the
vec2 branch write `Vector2(0, 0)` reds "vec2 param did not persist"; hard-coding
the color branch reds "color param did not persist"; and breaking only
`sanitizeFeatureState` (grep `getHexString`) reds the round-trip half alone,
proving the store-side and serialisation-side assertions isolate.

Two things it does NOT cover, so do not read a green run as more than it is. The
registry-freeze and duplicate-id invariants above have no runtime guard — the
`DuplicateFeatureError` path in particular only throws in a **production** build,
so a quiet dev console proves nothing. And the Demo feature exercises four param
types out of the full `defineFeature` set; `int`, `bool`, `enum`, `gradient` and
`image` params round-trip unguarded.