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
- **Features are isolated.** State lives at `store[featureId]`. Reading another
  feature's state requires `dependsOn: ['otherId']` in the feature def. Undeclared
  access throws in dev, warns in prod.
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