---
source: engine/animation/trackBinding.ts
lines: 106
last_verified_sha: f78d0b9a952bf6aee8efa6a0191c89b715f3fe0a
additional_sources:
  - engine/FeatureSystem.ts
  - store/createFeatureSlice.ts
  - utils/PresetLogic.ts
  - engine/AnimationEngine.ts
  - store/slices/historySlice.ts
  - engine/typedSlices.ts
  - components/AutoFeaturePanel.tsx
  - engine/features/setFeature.ts
  - engine/animation/binderRegistry.ts
audited: 2026-05-20T10:18:22Z
audited_by: claude-opus-4-7
public_api:
  - deriveTrackBinding
  - TrackBindingInput
  - TrackBinding
  - readLiveVec
  - featureRegistry
  - createFeatureSlice
  - applyPresetState
  - getBinder
  - beginParamTransaction
  - setSlice
  - setFeature
  - binderRegistry
depends_on: []
---

# DDFS string contracts — set${FeatureId} and ${featureId}.${paramKey}_<axis>

Two load-bearing string conventions glue the DDFS feature pipeline together with **no type enforcement**: (1) the auto-setter name `set${FeatureId}` materialised by `createFeatureSlice` and consumed by four downstream sites that derive the same name by string concatenation; and (2) the animation track-id form `${featureId}.${paramKey}` for scalars / `${featureId}.${paramKey}_<axis>` for vec axes (UNDERSCORE form), produced canonically by `deriveTrackBinding` and read back by `AnimationEngine.getBinder` case 4. Both conventions are pure strings — a typo in either is silent at compile time and produces a runtime no-op (preset round-trip drops the feature, animation track does not animate). This doc consolidates the rules so adding a new DDFS feature/param does not regress F6/F12/F13 (the fragility-audit IDs for setter-name mismatch and vec-axis form drift).

## Contract 1: set${FeatureId} auto-setter naming

### Definition

Given a `FeatureDefinition` with `id: string`, `createFeatureSlice` installs a Zustand store action under the key:

```
set${id.charAt(0).toUpperCase() + id.slice(1)}
```

i.e. PascalCase upper-first of the feature id, prefixed by `set`. So feature id `julia` becomes `setJulia`; id `coloring` becomes `setColoring`. The convention is materialised at `store/createFeatureSlice.ts:58` (`const actionName = \`set${feat.id.charAt(0).toUpperCase() + feat.id.slice(1)}\``). The setter body itself does the sanitisation, `onSet` extras merge, composite re-emission, and the batched `FractalEvents.emit('config', ...)` — see `store/createFeatureSlice.ts:60-235` and `docs/modules/engine/feature-system.md` for the per-call behaviour.

### Consumer sites (the four that re-derive the name)

Four sites outside `createFeatureSlice` iterate `featureRegistry.getAll()` (or accept an id directly) and **independently re-derive** the same `set${PascalId}` string. There is no shared helper; each call site does its own concat. A typo or a feature id with a non-letter first char would break all four silently.

| # | Site | What it does | Anchor |
|---|------|--------------|--------|
| 1 | `applyPresetState` (preset load) | Iterates `featureRegistry.getAll()`, derives the setter, calls it with `preset.features[feat.id]` (defaults backfilled, vec/color re-wrapped in THREE.*). Missing setter → silent `return` per feature; the preset entry is dropped. | `utils/PresetLogic.ts:75-107` |
| 2 | `AnimationEngine.getBinder` case 4 (universal DDFS resolver) | Splits the track id on `.`, looks up `featureRegistry.get(parent)`, derives the setter, and writes either `setter({ [child]: v })` (scalar) or `writeVecAxis(base, axis)` (vec). Missing setter → `console.warn` and no binder is cached (the track silently does not animate). | `engine/AnimationEngine.ts:151-208` |
| 3 | `beginParamTransaction` (undo snapshot) | Iterates `featureRegistry.getAll()` and deep-clones each feature slice into the snapshot keyed by `feat.id`. The diff at `endParamTransaction` compares per-feature-id. This site does **not** derive the setter — it reads slice state directly, so an id with no matching setter still snapshots correctly. Listed here as the fourth canonical iterator over `featureRegistry.getAll()` (per q-013); the setter-name dependency lives in the other three. | `store/slices/historySlice.ts:96-107` |
| 4 | `typedSlices.setSlice` (imperative typed write) | Derives `set${Capitalize<id>}` from the passed slice id and looks up the store action. Missing setter → `console.warn('[typedSlices] no "${setterName}" on store for slice "...")` and no-op. The TypeScript `Capitalize<>` mapping at `types/store.ts:52-54` provides type-level visibility but not runtime enforcement. | `engine/typedSlices.ts:102-114` |

A fifth derivation lives in `engine/features/setFeature.ts:56-57` (the type-parameterised escape hatch used by engine-fork unit tests): `\`set${id.charAt(0).toUpperCase()}${id.slice(1)}\``. Same convention.

A sixth and seventh derivation lives in the **UI writer side** — `components/AutoFeaturePanel.tsx:107` and the sibling section wrappers (`components/CompilableFeatureSection.tsx:86`, `components/CompileDropdownSection.tsx:41`, `components/RuntimeSection.tsx:33`, `components/FeatureSection.tsx:57`, `store/slices/scalabilitySlice.ts:47`) — each `useMemo`s `setterName = \`set${capId}\`` and looks it up on the store. These are not "auto-wiring sites" in the q-013 sense (they don't iterate the registry — they receive `featureId` as a prop), but they participate in the same convention.

### Footguns

- **Silent setter-name mismatch (F6).** If a feature is registered with an id whose case is unexpected (e.g. `'envMap'` vs `'envmap'`), every consumer above produces a different string from what `createFeatureSlice` installed. The setter is missing; preset apply drops the feature, the animation binder warns once and never animates, `setSlice` warns and no-ops. There is no `register()`-time check that the resulting setter name is unique or even valid. The escape hatch is `binderRegistry.register({ id, write })` (`engine/animation/binderRegistry.ts:14-15`, header comment explicitly notes F6) — but that fixes only the animation case.
- **Feature ids with non-letter first chars or special chars** would produce malformed setter names (`set1Light`, `set-Light`). The registry does not reject these. Convention: PascalCase or camelCase TS-identifier-shaped ids only.
- **Non-letter first char + Capitalize**: `id.charAt(0).toUpperCase()` returns the original char unchanged for non-letter codepoints — `setterName('1light') === 'set1light'`. The TS type-system `Capitalize<>` mapping (`types/store.ts:53`) is equivalent. Either way the resulting key is a valid JS object key but no longer matches the lookup keys the rest of the pipeline expects to find by typed inference.
- **Renaming a feature id breaks every saved preset.** A preset's `features[oldId]` block becomes unreachable because `setterName(newId) !== setterName(oldId)`. There is no rename map.

## Contract 2: ${featureId}.${paramKey}_<axis> track-id convention

### Definition

The animation pipeline addresses each animatable DDFS param by a string "track id". The canonical form is produced by `deriveTrackBinding` (`engine/animation/trackBinding.ts:63-84`):

| Param shape | Track id form | Example |
|-------------|---------------|---------|
| Scalar (`float`, `int`, `boolean`) | `${featureId}.${paramKey}` | `julia.power` |
| `vec2` | `${featureId}.${paramKey}_x`, `_y` | `julia.juliaC_x`, `julia.juliaC_y` |
| `vec3` | + `_z` | `geometry.preRotation_x`, `_y`, `_z` |
| `vec4` | + `_w` | `coloring.layer1Tint_x`..`_w` |
| `composeFrom` (compound widget) | One scalar track per listed key — `${featureId}.${composeFromKey}`, **no axis suffix** | `camera.orbitTheta`, `camera.orbitPhi`, `camera.distance` |

The **UNDERSCORE form** between the param key and the axis letter is the contract — not a dot. This is the part that drift-bit GMT historically (F12/F13). The file's header comment (`engine/animation/trackBinding.ts:1-30`) is the authoritative spec: "It must match across all three or vec params silently stop animating (F12/F13)."

### Authoritative form and three readers

`deriveTrackBinding` is the canonical producer. Three readers consume its output and must understand the form identically:

| Reader | Reads | Anchor |
|--------|-------|--------|
| `AnimationEngine.getBinder` (keyframe playback) | Splits the track id on `.`, then matches `child` against `/^(.+)_([xyzw])$/` for the UNDERSCORE form (`engine/AnimationEngine.ts:181-192`). Falls back to a DOT-form path-segment match (`engine/AnimationEngine.ts:199-201`, see escape hatch below). Final fallback: scalar `setter({ [child]: v })` at `engine/AnimationEngine.ts:204`. | `engine/AnimationEngine.ts:146-210` |
| `AnimationSystem.tick` modulation dispatch (LFO / rule offsets) | Per-axis dispatch via `applyLiveMod` (`engine/typedSlices.ts:166-202`) — scalar lookup at `${featureId}.${key}`, vec lookup at `${featureId}.${key}_${axis}` per axis. | `engine/animation/AnimationSystem.tsx` (consumer of `liveModulations` map keyed by track id) |
| `AutoFeaturePanel` (UI writer) and `Slider` / `VectorAxisCell` (per-axis keyframe buttons, live-value indicators) | Calls `deriveTrackBinding` and forwards the resulting `trackKeys[]` into `trackId` props on per-axis inputs. The UI never spells the convention itself — it always goes through `deriveTrackBinding`. | `components/AutoFeaturePanel.tsx` (track-binding consumer); `engine/animation/trackBinding.ts:63-84` (producer) |

`readLiveVec(liveModulations, binding)` (`engine/animation/trackBinding.ts:93-106`) is the matching read-side helper for UI components that need to display a modulated vec value: it indexes `liveModulations` by each `trackKey` and rebuilds a `THREE.Vector2/3/4`, returning `undefined` only when every axis is unmodulated.

### DOT-form escape hatch (legacy, do not produce)

`engine/AnimationEngine.ts:194-201` accepts a third path-segment form `feature.param.axis` (e.g. `julia.juliaC.x`) **for backward compat only**. The inline comment is explicit: "Never produced by AutoFeaturePanel, but keyframes may exist in saved scenes from early phase-5 builds." The DOT form goes through the same `writeVecAxis(base, axis)` writer (`engine/AnimationEngine.ts:164-174`) — same semantics, different surface form. New tracks MUST use the UNDERSCORE form; the DOT form is read-only.

### Footguns

- **UNDERSCORE-form precedence.** The matcher at `engine/AnimationEngine.ts:181-192` requires the base name to exist as a vec-shaped object in the slice. A scalar literally named `power_x` would be parsed as `power` + axis `x` first; only the slice-lookup miss makes it fall through to scalar branch `engine/AnimationEngine.ts:204`. Avoid scalar param names with a trailing `_x|_y|_z|_w`.
- **DOT form drift.** Encoding a vec axis as `feature.param.axis` in keyframe data added after phase-5 is wrong — it works only as a read-side backward-compat path. There is no save-side code that produces this form today.
- **`composeFrom` widgets do not get axis suffixes.** A compound vec widget that bundles `orbitTheta` + `orbitPhi` + `distance` produces three scalar tracks. Treating them as `camera.orbit_x` would break — see `engine/animation/trackBinding.ts:66-71` and the header comment at `engine/animation/trackBinding.ts:17-23`.
- **`gradient` / `image` / `complex` param types are not animatable.** `AnimationEngine.scrub` skips tracks whose `type !== 'float'` (`engine/AnimationEngine.ts:305`). The binding can still be derived for them, but nothing will move at playback.

## Rules for adding a new feature/param that participates in DDFS

These are MUST-hold rules. Violations are silent at compile time.

1. **Feature `id` MUST be a valid TS-identifier-shaped token** — letters/digits/underscore, first char a letter. `set${capitalised id}` is string-concatenated by `store/createFeatureSlice.ts:58` and consumed by six+ sites. Spaces, dots, hyphens, or leading digits produce malformed setter keys.
2. **Feature `id` SHOULD be PascalCase or camelCase.** All `${id.charAt(0).toUpperCase() + id.slice(1)}` consumers produce the same string only if the rest of the id is treated as-is; mixing snake-case or kebab-case will pass through but reads awkwardly (`set_my_feature_X` is valid JS but breaks the convention).
3. **Param `key` MUST be a valid TS-identifier-shaped token** without trailing `_x|_y|_z|_w` for scalars. A scalar param literally named `foo_x` would be misread by `AnimationEngine.getBinder` case 4 as `foo` + axis `x` if a sibling vec `foo` exists.
4. **Vec params MUST use the UNDERSCORE form in track ids** (`feature.param_x`), not the DOT form (`feature.param.x`). Always call `deriveTrackBinding` from `engine/animation/trackBinding.ts`; never spell the convention yourself.
5. **Compound widgets MUST use `composeFrom`.** Do not invent ad-hoc `feature.vec_widget` track ids for widgets that bundle scalar params — `deriveTrackBinding` will emit per-scalar tracks, which is what every reader expects.
6. **Use `binderRegistry.register({ id, write })` when the slice setter doesn't follow the convention.** Features that route writes through non-standard channels (composite cameras, split-precision sceneOffset events) MUST register an explicit binder before the engine sees the track id — `binderRegistry.lookup(id)` wins over the case-4 DDFS fallback (`engine/AnimationEngine.ts:74-87`).
7. **Do not depend on `set${Feature}` by name-inference outside the four documented consumer sites.** New code that wants to write a feature slice from outside the auto-setter system MUST use `setSlice(id, patch)` (`engine/typedSlices.ts:102-114`) or `setFeature(feature, patch)` (`engine/features/setFeature.ts:59-69`) for the typed surface. Inline `state['set' + cap(id)]` lookups duplicate the convention without type safety and silently break on rename.

## Invariants

- **The auto-setter is the canonical entry point.** Every per-param store write that goes through the DDFS pipeline (sanitisation, `onSet`, composite re-emission, CONFIG-event batching, accumulation reset) MUST go through `set${FeatureId}` — direct `set({[featId]: ...})` writes bypass all of that (`store/createFeatureSlice.ts:60-235`).
- **`featureRegistry.getAll()` is the iteration source for all four auto-wiring sites.** The order is topologically sorted by `dependsOn` (`engine/FeatureSystem.ts:444-448, 543-595` — see `docs/modules/engine/feature-system.md`). Adding a new auto-wiring site MUST iterate this list, not the raw store keys.
- **`deriveTrackBinding` is the canonical producer.** UI components MUST NOT hand-construct track ids; they MUST call `deriveTrackBinding` (`engine/animation/trackBinding.ts:63-84`) and forward `trackKeys[]`. Hand-spelling is how F12/F13 happened.
- **`binderRegistry.lookup(id)` wins over the case-4 DDFS fallback.** The check happens BEFORE any name-inference in `AnimationEngine.getBinder` (`engine/AnimationEngine.ts:74-87`). Apps with non-standard write paths MUST register binders, not rely on the registry catching them.
- **The DOT form is read-only.** Never produced; only consumed for backward-compat with phase-5-era saved scenes (`engine/AnimationEngine.ts:194-201`).
- **`AppFeatureSlices` (typed-slice declaration-merging surface) is for type-system visibility only.** It does not enforce at runtime. A slice id missing from `AppFeatureSlices` still works through `setSlice` if the matching setter exists; a slice id present with a typo in the registration produces a missing setter and `setSlice` warns + no-ops (`engine/typedSlices.ts:75, 102-114`).

## Interactions with other subsystems

- **`docs/modules/engine/feature-system.md`** — owns `featureRegistry`, `createFeatureSlice`, `set${FeatureId}` materialisation (the producer side of contract 1). The Invariants table in that doc lists both string contracts; this doc is the canonical reference they cite.
- **`docs/modules/engine/animation.md`** — owns `AnimationEngine.getBinder` (the case-4 consumer of contract 1 plus the reader of contract 2), `binderRegistry` (the escape hatch), and `AnimationSystem.tick` (the modulation-dispatch reader of contract 2 via `applyLiveMod`).
- **`docs/modules/engine/shared-ui.md`** — owns `AutoFeaturePanel`, `Slider`, `VectorAxisCell`, and the per-axis keyframe-button wiring (the writer-side consumer of contract 2 via `deriveTrackBinding`).
- **`docs/modules/engine/features.md`** — covers `setFeature` and the typed-feature surface (the typed-imperative variant of contract 1 consumers).
- **`utils/PresetLogic.ts` (load path)** — consumer site #1 for contract 1. See `docs/modules/engine/feature-system.md` Interactions.
- **`store/slices/historySlice.ts` (undo)** — consumer site #3 for contract 1 (iterates the registry but does not derive the setter — direct slice read).

## Known issues / Phase 2 carry-in

| Kind | Item | Site | Source |
|------|------|------|--------|
| doc-rewrite | DDFS auto-wiring crosses four sites with NO type enforcement on the `set${FeatureId}` string. Each call site re-derives the name by string concat; a typo or non-conventional feature id breaks all consumers silently. The fragility-audit `F6` row is the historical write-up. This doc is the canonical reference; `docs/modules/engine/feature-system.md` Invariants links to it. | `store/createFeatureSlice.ts:58`; `utils/PresetLogic.ts:76`; `engine/AnimationEngine.ts:155`; `engine/typedSlices.ts:106` | q-013 |
| doc-rewrite | Track-id convention `${featureId}.${paramKey}` / `${featureId}.${paramKey}_<axis>` is the second load-bearing string contract. UNDERSCORE form is canonical; DOT form is legacy read-only. The producer is `deriveTrackBinding`; three readers (`AnimationEngine.getBinder`, `AnimationSystem.tick`, `AutoFeaturePanel`) consume independently. Drift = F12/F13 silent-no-animate. | `engine/animation/trackBinding.ts:63-84`; `engine/AnimationEngine.ts:181-205` | q-013, q-014 |
| cleanup-opportunity | The six+ UI writer sites that each `useMemo` `setterName = \`set${cap(id)}\`` could route through `setSlice` instead, removing the inline string-concat duplication. The escape hatches (`setFeature`, `setSlice`) already exist; the section wrappers predate them. | `components/AutoFeaturePanel.tsx:107`; `components/CompilableFeatureSection.tsx:86`; `components/CompileDropdownSection.tsx:41`; `components/RuntimeSection.tsx:33`; `components/FeatureSection.tsx:57`; `store/slices/scalabilitySlice.ts:47` | q-013 (observation) |
| cleanup-opportunity | `register()` does not validate that the resulting `set${FeatureId}` would be a valid JS identifier or unique. A boot-time check in `featureRegistry.register` or `freeze()` would catch malformed ids before any consumer hits the silent-no-op path. | `engine/FeatureSystem.ts:374-396, 399-404` | (observation) |

## Historical context

No prior doc covered these two contracts as a standalone reference. The fragments that exist are:

- **`engine/animation/trackBinding.ts:1-30`** — the file header is the de-facto authoritative spec for contract 2. It names F12/F13 directly and explains the composeFrom carve-out.
- **`engine/animation/binderRegistry.ts:1-25`** — the file header explains the escape hatch for both contracts (non-standard setters → register an explicit binder).
- **`docs/engine/20_Fragility_Audit.md` F6 (READ-ONLY historical doc)** — the original write-up of the silent setter-name mismatch. It motivated the convention but did not document the four-site fan-out.
- **`docs/engine/02_Feature_Registry.md` (READ-ONLY historical doc)** — describes an aspirational `defineFeature(...)` API with stricter enforcement that did not ship; the current code relies on convention instead.
- **`docs/engine/08_Animation.md:53-54` (READ-ONLY historical doc)** — names case 4 / case 5 in the binder-resolution chain. Treats both DOT and UNDERSCORE forms as live without naming the legacy carve-out.
- **`CLAUDE.md:73`** — one-line author guidance: "Don't depend on `set${Feature}` by name-inference in animation — the engine auto-binds via the registry. If you need a custom binder, `binderRegistry.register()` it explicitly."

This module doc supersedes those fragments as the canonical reference for both string contracts.
