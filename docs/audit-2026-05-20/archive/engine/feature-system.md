---
source: engine/FeatureSystem.ts
lines: 649
last_verified_sha: 7fba0a649d055378d42f81ccd30f47f01854f815
additional_sources:
  - engine/defineEnumParam.ts
  - engine/typedSlices.ts
  - store/createFeatureSlice.ts
audited: 2026-05-20T09:00:00Z
audited_by: claude-opus-4-7
public_api:
  - type ParamType
  - type ScaleType
  - ParamCondition
  - ParamOption
  - TextureConfig
  - CustomUIConfig
  - ParamConfig
  - FeatureTabConfig
  - FeatureViewportConfig
  - FeatureMenuConfig
  - FeatureMenuItem
  - FeatureInteractionConfig
  - FeatureEngineConfig
  - GroupConfig
  - FeatureDefinition
  - CompilablePanelConfig
  - CompileDropdownPanelConfig
  - RuntimePanelConfig
  - FeatureRegistryFrozenError
  - DuplicateFeatureError
  - featureRegistry
  - validateComponentRefs
  - EnumParam
  - DefineEnumParamOptions
  - defineEnumParam
  - SliceFromParams
  - AppFeatureSlices
  - type AppSliceId
  - useSlice
  - getSlice
  - setSlice
  - useLiveModulations
  - subscribeSlice
  - applyLiveMod
  - FeatureSlice
  - createFeatureSlice
depends_on:
  - e03-animation
  - e04-shader-builder
---

# Feature System + DDFS Core

The feature system is the engine's Data-Driven Feature System (DDFS) substrate: features declare their identity, parameter schema, UI metadata, and optional shader injection as a plain `FeatureDefinition` literal, register it into a module-scope `featureRegistry` singleton before store construction, and the engine then auto-derives a Zustand state slice, a convention-named setter (`set${FeatureId}`), uniform definitions, and CONFIG/UNIFORM/TEXTURE event traffic for the renderer — with no per-feature glue code on the engine side. The four files in this subsystem own the registry, the slice builder, the numeric-index enum helper, and the typed-slice declaration-merging surface that apps use for type-safe reads/writes.

## Public API

### `engine/FeatureSystem.ts` — registry + definition types

- **`type ParamType`** — Union of value-shape tags `'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'boolean' | 'gradient' | 'image' | 'complex'`. Drives sanitisation in the auto-setter, uniform-routing on the CONFIG channel, and the GLSL type emitted by `getUniformDefinitions` (engine/FeatureSystem.ts:7).
- **`type ScaleType`** — Slider/knob scale shape for UI: `'linear' | 'log' | 'square' | 'root' | 'pi'`. Read by sliders/knobs; the registry itself does not interpret it (engine/FeatureSystem.ts:8).
- **`ParamCondition`** — Predicate language for `condition?` fields on params and feature tabs. Supports `param/gt/lt/eq/neq/bool` and recursive `and/or` (engine/FeatureSystem.ts:10-19).
- **`ParamOption`** — Dropdown option `{label, value, hint?, estCompileMs?, disabledIf?}`. The `disabledIf` predicate runs against the engine store to gate options by formula capability (engine/FeatureSystem.ts:21-36).
- **`TextureConfig`** — THREE texture-flags carrier for image params (mapping, wrap, filter, mipmaps) (engine/FeatureSystem.ts:38-45).
- **`CustomUIConfig`** — Reference to a component-registry id `{componentId, group?, props?, condition?, parentId?}` for slotting bespoke React into an auto-generated panel (engine/FeatureSystem.ts:47-53).
- **`ParamConfig`** — The DDFS param descriptor. Identity (`type`, `default`, `label`, `shortId?`, `uniform?`), UI hints (`min/max/step/group/description/helpId/hidden/ui/scale/format/options/layout`), composition (`composeFrom`, `parentId`, `condition`, `dynamicConfig`, `dynamicVisible`), and lifecycle (`onSet`, `onUpdate: 'uniform' | 'compile'`, `noReset`, `estCompileMs`) (engine/FeatureSystem.ts:55-125).
- **`FeatureTabConfig`** — `{label, iconId?, condition?}`. Dock/order/default-active were stripped from this struct when `PanelManifest` took over panel layout (engine/FeatureSystem.ts:127-143).
- **`FeatureViewportConfig`** — Overlay component `{componentId, renderOrder?, type?: 'scene' | 'dom'}` (engine/FeatureSystem.ts:145-149).
- **`FeatureMenuConfig` / `FeatureMenuItem`** — System-menu toggle and sub-item shapes (engine/FeatureSystem.ts:151-163).
- **`FeatureInteractionConfig`** — Camera-blocking flags for interactive overlays `{blockCamera?, activeParam?}` (engine/FeatureSystem.ts:165-168).
- **`FeatureEngineConfig`** — Master enable/disable toggle that ShaderFactory consults `{toggleParam, mode: 'compile' | 'runtime', label, description?, groupFilter?}` (engine/FeatureSystem.ts:170-176).
- **`GroupConfig`** — Optional metadata for parameter groups `{label, collapsible?, description?, helpId?}` (engine/FeatureSystem.ts:179-189).
- **`FeatureDefinition`** — The unit registered into `featureRegistry`. Bundles identity, `params`, optional `state`/`actions`, the UI configs above, `panelConfig`, `engineConfig`, `extraUniforms`, `dependsOn`, `inject(builder, config, variant)`, and `postShader` (engine/FeatureSystem.ts:191-255).
- **`CompilablePanelConfig`** — Compile-gate + optional runtime body section shape, used by `<CompilableFeatureSection>` and mirrored on PanelManifest's `compilable` variant (engine/FeatureSystem.ts:267-278).
- **`CompileDropdownPanelConfig`** — Compile-only dropdown section (no on/off gate). Example: Distance Estimator (engine/FeatureSystem.ts:288-298).
- **`RuntimePanelConfig`** — Pure-runtime collapsible section with no compile mechanics. Example: Julia / Offset (engine/FeatureSystem.ts:304-314).
- **`FeatureRegistryFrozenError`** — Thrown in dev when `register()` runs after `freeze()`. Constructor accepts an optional `freezeStack` so the error message points at the import that prematurely triggered store construction (engine/FeatureSystem.ts:326-343).
- **`DuplicateFeatureError`** — Thrown in production when two different def objects share an id. Dev replaces with warn to support HMR (engine/FeatureSystem.ts:352-361).
- **`featureRegistry`** — Module-singleton `FeatureRegistry` instance. Public methods: `register(def)`, `freeze()`, `isFrozen()`, `get(id)`, `getAll()` (topologically sorted), `getViewportOverlays()`, `getMenuFeatures()`, `getExtraMenuItems()`, `getEngineFeatures()`, `getDictionary()`, `getUniformDefinitions()` (engine/FeatureSystem.ts:363-598).
- **`validateComponentRefs(componentRegistry)`** — Opt-in dev validator that walks every feature's `viewportConfig.componentId` and each `customUI[]` entry against the supplied component registry; returns `{featureId, componentId, site}[]` for missing ids and warns (not errors) in dev (engine/FeatureSystem.ts:615-649).

### `engine/defineEnumParam.ts` — numeric-index enum helper

- **`EnumParam<Values>`** — Generic wrapper `{config: ParamConfig, fromIndex: (idx?) => Values[number], values: Values}` so a feature declares its enum tuple once and gets back the DDFS param plus the boundary resolver (engine/defineEnumParam.ts:29-37).
- **`DefineEnumParamOptions<Values>`** — `{defaultIndex?, optionLabels?, optionHints?, extra?}` — overrides per-value labels, per-option hint text, and lets callers merge extra `ParamConfig` fields (engine/defineEnumParam.ts:39-53).
- **`defineEnumParam(values, label, options?)`** — Synthesises a `type: 'float'` ParamConfig with `options: [{label, value: i, hint}]` and returns a `fromIndex` that clamps NaN / out-of-range back to the default. Apps map the integer slice value to the canonical string at the engine boundary (engine/defineEnumParam.ts:79-105).

### `engine/typedSlices.ts` — declaration-merging accessors

- **`SliceFromParams<P>`** — Type-level mapping that reconstructs a slice shape from a DDFS `params` record; each `ParamType` maps to its runtime representation (number / boolean / `{x,y,...}` / `THREE.Color` shape / `GradientConfig`) with `any` fallback for `image` and `complex` (engine/typedSlices.ts:54-68).
- **`AppFeatureSlices`** — Empty interface that apps augment via `declare module '@engine/typed-slices'` to register their feature shapes. The base interface is intentionally empty so each app owns its own augmentation (engine/typedSlices.ts:70-72).
- **`type AppSliceId`** — `keyof AppFeatureSlices`. Union of slice ids the app has declared (engine/typedSlices.ts:75).
- **`useSlice(id)` / `getSlice(id)` / `setSlice(id, patch)`** — Hook, imperative read, and imperative write. `setSlice` derives the setter name `set${Id with capitalised first letter}` and logs a `[typedSlices]` warning + no-ops if the setter is missing (engine/typedSlices.ts:83-114).
- **`useLiveModulations()`** — Subscribes to `state.liveModulations`. Returns a module-frozen `EMPTY_LIVE_MODS` fallback so the selector keeps a stable reference when the field is undefined (engine/typedSlices.ts:121,131-133).
- **`subscribeSlice(id, listener)`** — Imperative zustand subscription wired to a slice-id selector for non-React consumers (orbit ticks, brush RAF loops); returns an unsubscribe fn (engine/typedSlices.ts:142-150).
- **`applyLiveMod(slice, featureId, liveMod)`** — Pure merge that overlays `liveModulations` onto a slice snapshot. Scalars look up `featureId.key`; vec-shaped fields look up `featureId.key_<axis>` per axis. Returns the same reference if nothing was touched (engine/typedSlices.ts:166-202).

### `store/createFeatureSlice.ts` — the slice builder

- **`FeatureSlice`** — Untyped record alias `{[key: string]: any}` used as the generic carrier shape (store/createFeatureSlice.ts:12-14).
- **`createFeatureSlice`** — Zustand `StateCreator` consumed by `createEngineStore`. Calls `registerFeatures()`, then `registerDefaultPresetFields()`, freezes both `featureRegistry` and `presetFieldRegistry`, then iterates `featureRegistry.getAll()` to seed initial state and install one auto-setter per feature plus reducers for each `actions[name]` entry (store/createFeatureSlice.ts:16-254).

## Architecture

- `FeatureDefinition` is the registration unit: identity + params + optional `state/actions` + UI configs + `panelConfig` + `engineConfig` + `extraUniforms` + `dependsOn` + `inject`/`postShader`. Both `inject` and `postShader` are optional; apps that only need state + uniforms register a definition with no shader hooks (engine/FeatureSystem.ts:191-255).
- `FeatureRegistry` is a single class instantiated once at module scope and exported as `featureRegistry`; every importer sees the same instance (engine/FeatureSystem.ts:363,598).
- `register(def)` deduplicates: same object reference is a no-op (HMR-safe); different object with the same id replaces with a `console.warn` in dev (HMR is assumed) and throws `DuplicateFeatureError` in prod (engine/FeatureSystem.ts:374-396).
- After `freeze()`, new-id registrations throw `FeatureRegistryFrozenError` in dev and `console.warn`+no-op in prod, matching the project-wide "throw in dev, warn in prod for graceful-degrade failures" policy (engine/FeatureSystem.ts:399-404).
- Dev `freeze()` captures up to 10 stack frames via `new Error('freeze trace').stack`; the captured trace is rendered into a later `FeatureRegistryFrozenError` so the diagnostic points at the import that prematurely triggered store construction (engine/FeatureSystem.ts:425-433).
- `dependsOn` is validated at `register()` only against features already registered at that moment — unknown deps log a warning but the registration proceeds (engine/FeatureSystem.ts:407-413).
- `getAll()` returns a topologically sorted list using Kahn's algorithm with stable tie-breaking on registration index; the result is cached and invalidated when `register()` mutates the registry (engine/FeatureSystem.ts:444-448,543-595).
- `getUniformDefinitions()` walks every param's `uniform` and normalises types for GLSL: `color` → `vec3`, `boolean` → `float` (1.0 / 0.0), `image`/`gradient` → `sampler2D` with null default; then appends each feature's `extraUniforms` (engine/FeatureSystem.ts:511-538).
- `getDictionary()` returns a hard-coded preset-alias map (`'formula' → 'f'`, `'cameraRot' → 'cr'`, ...) plus a per-feature children block keyed by `shortId` only — params without `shortId` are absent from the dictionary (engine/FeatureSystem.ts:477-509).
- `validateComponentRefs` is opt-in. It is not auto-called from `freeze()` because the component registry is populated after the feature registry freezes; apps invoke it after their UI registration phase (engine/FeatureSystem.ts:600-649).
- `createFeatureSlice` is the boot pipeline: `registerFeatures()` from `engine/features` → `registerDefaultPresetFields()` from `utils/defaultPresetFields` → both registries freeze → iterate `getAll()` to build per-feature state and setter (store/createFeatureSlice.ts:20-32).
- Initial state seeds first from `feat.state`, then each non-`composeFrom` param's `default` when the key is undefined; composite (`composeFrom`) params build a reverse `compositeParams[dep] = key` map so dependency writes re-fire the composite uniform (store/createFeatureSlice.ts:34-55).
- The auto-setter name is `set${id with capitalised first letter}` — a string convention with no type enforcement and four documented downstream consumers (preset apply, animation binder, history snapshot, typed-slice helper) (store/createFeatureSlice.ts:58).
- The setter sanitises incoming values before merging: `vec2` → `THREE.Vector2`, `vec3` → `THREE.Vector3`, `color` → `THREE.Color` (accepting `string`, `number`, or `{r,g,b}` shapes) (store/createFeatureSlice.ts:70-88).
- `onSet` hooks fire after sanitisation; their returned extras merge into the update batch only when the key is NOT already in the user-provided `updates` — used so preset-loads can override defaults even when an `onSet` would otherwise compute them (store/createFeatureSlice.ts:90-104).
- Each touched param contributes to a `configUpdates[feat.id]` payload — except `type === 'image'`, which is skipped because data URLs can be many MB. The bundle is emitted once via `FractalEvents.emit('config', configUpdates)` at the end of the setter so `ConfigManager.update()` sees one batched diff (store/createFeatureSlice.ts:119-128,228-230).
- Uniform routing per type: `image` → `FractalEvents.emit('texture', {textureType, dataUrl})` with auto-enable for `envMapData` / `layer1Data`; `gradient` → buffer via `generateGradientTextureBuffer` then a `uniform` event with `{isGradientBuffer: true, buffer}`; everything else → `uniform` event with `boolean` → float and `color` → `THREE.Color` coercion (store/createFeatureSlice.ts:130-182).
- Composite (`composeFrom`) uniforms re-emit when any dependency changes: gradients re-buffer the whole gradient param value (the `values` array is ignored for gradient composites); `vec2`/`vec3` rebuild from `composeFrom` order via `THREE.Vector2`/`Vector3` (store/createFeatureSlice.ts:186-222).
- `shouldReset` accumulates across every param-write that lacks `noReset`; at the end of the setter `FractalEvents.emit('reset_accum', undefined)` fires once to invalidate the path-tracer accumulator (store/createFeatureSlice.ts:61,117,232-234).
- Custom `actions` reducers receive the current slice state directly (not a Zustand draft) and a payload; their returned partial is merged into the slice via `set({[feat.id]: ...})` and an unconditional `reset_accum` follows whenever updates is non-empty (store/createFeatureSlice.ts:238-251).
- `defineEnumParam` synthesises a `type: 'float'` ParamConfig with `options[]` of `{label, value: i, hint}`, a `fromIndex` clamper that returns the default for NaN / out-of-range, and the original tuple — there is no string-typed enum codepath in `ParamType` (engine/defineEnumParam.ts:79-105).
- `typedSlices.useSlice` / `getSlice` / `setSlice` are typed pass-throughs to `useEngineStore`; the setter is conventionally `set${Id}` and a missing setter logs `[typedSlices] no "${setterName}" on store for slice "..."` and no-ops (engine/typedSlices.ts:83-114).
- `applyLiveMod` walks slice keys: scalars look up `featureId.key` in liveMod; vec-shaped objects override per axis via `featureId.key_x|y|z|w`; returns the same slice reference if nothing was touched, otherwise a fresh object (engine/typedSlices.ts:166-202).
- `useLiveModulations` uses a module-frozen `EMPTY_LIVE_MODS = Object.freeze({})` as the selector fallback so the same reference flows through every render — `?? {}` inline in a selector would create a fresh object each eval and defeat zustand's reference-equality re-render gate (engine/typedSlices.ts:116-133).

## Invariants

- The `featureRegistry` singleton MUST be populated by side-effect imports before any module that touches `useEngineStore.getState()` runs, because the store's `createFeatureSlice` calls `freeze()` immediately after iterating `getAll()` (store/createFeatureSlice.ts:20-32).
- Same-def-object re-register is a no-op; different-def-same-id is dev-replace-with-warn / prod-throw. This means HMR survives but a real duplicate-id bug is silent in dev and fatal in prod (engine/FeatureSystem.ts:378-396).
- `freeze()` is idempotent. The dev freeze-stack capture is guarded by `typeof import.meta !== 'undefined' && import.meta.env?.DEV` so non-Vite consumers (e.g. headless test harness) don't crash on the import-meta access (engine/FeatureSystem.ts:426-433).
- Dependency cycles are NOT thrown — they `console.error` and silently return registration order as the fallback. JSDoc updated 2026-05-20 to match this behaviour (engine/FeatureSystem.ts:441-448, 587-595).
- `validateComponentRefs` is opt-in. It only warns (never throws) because some `customUI` references are legitimately app-conditional — `AutoFeaturePanel` silently skips unresolved customUI at render time, so a missing id is a soft fail (engine/FeatureSystem.ts:632-647).
- The auto-setter name `set${capitalised id}` is a load-bearing string convention with **no type enforcement**. Four downstream consumers iterate `featureRegistry.getAll()` and derive the same name: PresetLogic's `applyPresetState`, AnimationEngine's `getBinder` (case 4), historySlice's `beginParamTransaction`, and `typedSlices.setSlice` — see "Interactions with other subsystems" below.
- The track-id convention `${featureId}.${paramKey}` (scalars) and `${featureId}.${paramKey}_<axis>` (vec axes, UNDERSCORE form) is the second load-bearing string contract. Authoritative form is in `engine/animation/trackBinding.ts`; the AutoFeaturePanel writer side and `getBinder` reader side both consult it. The DOT form `paramKey.axis` is legacy and lives only in the binder's case-4 escape hatch (see q-013).
- `image`-typed params are deliberately excluded from the `config` event payload because data URLs can be many MB; texture restoration uses the dedicated `texture` event channel. The slice state still contains the image value, so GMF save (which JSON-serialises `featureStates`) is unaffected — q-020 verified PASS (store/createFeatureSlice.ts:125-128).
- `setX(updates)` re-runs setter logic on every key regardless of value change — there is no `oldValue !== newValue` guard. Every call walks the full uniform-emit path; the value-equality short-circuit lives downstream in `ConfigManager.areValuesEqual` (store/createFeatureSlice.ts:65-184).
- The auto-setter writes THREE class instances back into slice state when the input was a plain `{x,y}` / `{r,g,b}` object — slice readers therefore see `THREE.Vector2` / `Vector3` / `Color`, not POJOs (store/createFeatureSlice.ts:76-86).
- `onSet`'s extras-only-for-untouched-keys contract is what lets preset loads provide both an `interlaceFormula` and `interlaceParamA` in the same batch without an onSet on `interlaceFormula` clobbering the explicitly-loaded `interlaceParamA` value (store/createFeatureSlice.ts:94-104).
- `composeFrom` gradient uniforms re-buffer using the gradient param's own value, NOT the composed sub-param `values` array — this asymmetry with non-gradient composites is deliberate and called out in the inline comment (store/createFeatureSlice.ts:186-210).
- `defineEnumParam` synthesises NUMERIC-INDEX enums backed by `type: 'float'`. Apps must map index → string via `fromIndex` at the engine boundary. There is no string-typed enum codepath in `ParamType` (engine/FeatureSystem.ts:7; engine/defineEnumParam.ts:90-92).
- `AppFeatureSlices` is empty by design — apps MUST `declare module '@engine/typed-slices'` to get typed access. `useSlice` / `getSlice` still cast through `any` internally so the empty-base case keeps working at runtime (engine/typedSlices.ts:72,84,93).
- `useLiveModulations` only works correctly if the store exposes `s.liveModulations` somewhere; otherwise every render returns the frozen `EMPTY_LIVE_MODS` (engine/typedSlices.ts:131-133).
- Custom `actions` reducers receive the slice state directly (not an Immer draft) and must return a plain `Partial<…>`; they always trigger `reset_accum` whenever updates is non-empty, regardless of `noReset` semantics elsewhere (store/createFeatureSlice.ts:240-249).

## Interactions with other subsystems

### Outgoing (this subsystem imports)

| From | What we use | Where |
|------|-------------|-------|
| `engine/ShaderBuilder` | `ShaderBuilder`, `RenderVariant` types for `inject(builder, config, variant)` callbacks | engine/FeatureSystem.ts:2 |
| `engine/ShaderConfig` | `ShaderConfig` (the merged source of truth `ConfigManager` owns) | engine/FeatureSystem.ts:3 |
| `engine/UniformSchema` | `UniformDefinition` shape for `getUniformDefinitions()` + `extraUniforms` | engine/FeatureSystem.ts:5 |
| `engine/FractalEvents` | `FractalEvents.emit(…)` on `config`, `uniform`, `texture`, `reset_accum` from the auto-setter | store/createFeatureSlice.ts:6 |
| `engine/features` | `registerFeatures()` — engine-core's six generic features registrar | store/createFeatureSlice.ts:5 |
| `utils/PresetFieldRegistry` | `presetFieldRegistry.freeze()` — the sibling registry for non-feature scene fields | store/createFeatureSlice.ts:8 |
| `utils/defaultPresetFields` | `registerDefaultPresetFields()` — boot-time registrar for `cameraRot` / `targetDistance` / `sceneOffset` / `cameraMode` / `savedCameras` | store/createFeatureSlice.ts:9 |
| `utils/colorUtils` | `generateGradientTextureBuffer(value)` — gradient → 256×1 RGBA byte buffer | store/createFeatureSlice.ts:7 |
| `store/engineStore` | `useEngineStore` for typed-slice accessors | engine/typedSlices.ts:40 |

### Incoming (representative consumers of `featureRegistry.getAll()`)

| Consumer | What it does | Where |
|----------|--------------|-------|
| `utils/PresetLogic.applyPresetState` | Iterates registry; derives `set${FeatureId}`; calls it with `preset.features[feat.id]` block. The first of four sites that depend on the `set${FeatureId}` string convention (q-013). | `utils/PresetLogic.ts` (load path) |
| `engine/AnimationEngine.getBinder` (case 4) | Universal DDFS resolver: splits the track id on `.`, looks up `featureRegistry.get(parent)`, derives `set${Parent}`, writes scalar or per-axis vec using the `_x/_y/_z/_w` UNDERSCORE convention. The track-id contract lives in `engine/animation/trackBinding.ts` (q-013, e03-animation). | `engine/AnimationEngine.ts` |
| `store/slices/historySlice.beginParamTransaction` | Snapshots every feature slice by iterating `getAll()` and deep-cloning the slice for each id; the diff at `endParamTransaction` compares per-feature-id (q-013, e08-shortcuts-undo). | `store/slices/historySlice.ts` |
| `engine/typedSlices.setSlice` | Derives `set${Id}` and looks up the store action; logs `[typedSlices] no "${setterName}" on store` and no-ops if missing (engine/typedSlices.ts:106-113). |
| `engine-gmt/engine/managers/ConfigManager` | Consumer of the `config` events emitted by the auto-setter; classifies per-param `onUpdate === 'compile'` versus runtime, mirrors gradient-stop arrays, drives `rebuildNeeded / uniformUpdate / modeChanged / needsAccumReset` (q-016, e04-shader-builder). | `engine-gmt/engine/managers/ConfigManager.ts` |
| `engine-gmt/engine/FractalEngine.updateConfigInternal` | Subscribes to `FRACTAL_EVENTS.CONFIG`, threads the result of `ConfigManager.update` into compile + uniform-sync paths (q-015, q-016, g01-renderer). | `engine-gmt/engine/FractalEngine.ts` |
| `engine-gmt/engine/MaterialController` | Consumer of the `uniform` channel's `{isGradientBuffer: true, buffer}` payloads; allocates `THREE.DataTexture` per gradient layer (q-017). | `engine-gmt/engine/MaterialController.ts` |
| `engine/PanelManifest` | Consumer of `FeatureTabConfig` + `CompilablePanelConfig` + `CompileDropdownPanelConfig` + `RuntimePanelConfig` via PanelItem variants `feature` / `compilable` / `compile-dropdown` / `runtime-section` (q-018, render-pipeline subsystem). | `engine/PanelManifest.ts` |
| `components/AutoFeaturePanel` | The default panel renderer; consumes `params`, `groups`, `customUI`, `tabConfig`, `condition` to build sliders / knobs / dropdowns and emit `data-help-id` attributes. | `components/AutoFeaturePanel.tsx` |

`depends_on` lists `e03-animation` (for the track-id contract this subsystem co-owns with `trackBinding.ts`) and `e04-shader-builder` (for the `ShaderBuilder` + `RenderVariant` types `inject` callbacks consume). Most other consumer relationships are incoming.

## Known issues / Phase 2 carry-in

| Kind | Item | Site | Source |
|------|------|------|--------|
| doc-rewrite-target | `docs/engine/02_Feature_Registry.md` is aspirational — it describes a `defineFeature(…)` registration API, lifecycle hooks (`onActivate/onDeactivate/onParamChange/shouldRender/ctx`), a `FeatureIsolationError`, a `cacheKey` field, an `enum` / `string` `ParamType`, a `bool` (vs `boolean`) key, tab-dock auto-placement, and a `useFeatureParam` hook — none of which exist in the code today. This module doc supersedes that one for current API. | n/a (whole file) | f-001 (carry-in) |
| _not-a-bug (re-checked 2026-05-20)_ | q-019 reported a `DuplicatePresetFieldError` prod-boot crash from `engine/plugins/camera/presetField.ts` allegedly re-registering the 5 keys that `utils/defaultPresetFields.ts` registers. Re-verifying current code: `engine/plugins/camera/presetField.ts:20-26` only registers `cameraSlots`; `engine-gmt/store/gmtPresetFields.ts` only registers `lights` + `pipeline`; `utils/defaultPresetFields.ts` owns the 5 non-overlapping keys. **No overlap → no crash path today.** Either q-019 misread the code, or the duplicate path was removed between the followup and now. Keeping this row as a historical correction so future audits don't re-flag the resolved finding. | engine/plugins/camera/presetField.ts; utils/defaultPresetFields.ts; engine-gmt/store/gmtPresetFields.ts | q-019 |
| drift _(FIXED 2026-05-20)_ | `getAll()` jsdoc updated to match the implementation (logs `console.error` and falls back to registration order on cycle; does NOT throw). | engine/FeatureSystem.ts:441-448 | f-002 |
| doc-rewrite | DDFS auto-wiring crosses four sites (PresetLogic, AnimationEngine, binderRegistry, historySlice). Load-bearing string conventions `set${FeatureId}` and `${featureId}.${paramKey}_<axis>` are NOT type-enforced. Documented under "Invariants" + "Interactions" above. | engine/FeatureSystem.ts:374; engine/animation/trackBinding.ts | q-013 |
| doc-rewrite | Two-registry boot pattern: `featureRegistry` + `presetFieldRegistry` both populated and frozen during `createFeatureSlice`. The second registry is the F3 fragility-audit fix that externalised the hardcoded non-feature scene fields. Documented under "Architecture" + "Outgoing" above. | store/createFeatureSlice.ts:20-31; utils/PresetFieldRegistry.ts | q-014, q-019 |
| cleanup | Setter has no `oldValue !== newValue` guard; every key in `updates` triggers the full sanitise + emit path even when the value is unchanged. The value-equality short-circuit is downstream in `ConfigManager.areValuesEqual` (1e-6 tolerance, THREE class equality, JSON-stringify arrays). | store/createFeatureSlice.ts:65-184 | q-016 |
| drift | `composeFrom` gradient uniforms re-buffer the whole gradient param value, not the composed sub-param `values` array. Inline comment exists but the asymmetry with non-gradient composites is doc-worthy. | store/createFeatureSlice.ts:186-210 | q-017 |
| drift | `MaterialController.setGradient` hard-codes a layer → uniform mapping (`uGradientTexture`, `uGradientTexture2`, `uEnvGradient`). New DDFS gradient layers added beyond layer 3 bypass this helper and must rely on the `uniform` event path. | (downstream — engine-gmt/engine/MaterialController.ts) | q-017 |

## Historical context

This doc supersedes `docs/engine/02_Feature_Registry.md` for the current API and invariants. The original is preserved as historical / aspirational reference for design rationale items the live code does not yet implement:

- **"One file per feature" aspiration** — each feature confined to a single file declaring identity + params + UI + shader injection, with the engine deriving everything else from that declaration. The current code partially realises this (params, UI, uniforms, CONFIG events are auto-derived from a `FeatureDefinition` literal), but animation / preset / undo derivations live in four separate consumer sites that iterate `featureRegistry.getAll()` rather than the registry self-deriving them (q-013).
- **Six auto-derivations enumerated** — Zustand slice, setter, undo snapshot, animation tracks, preset serialization, UI panel. The current code wires (1) slice + setter + UI uniforms + config events + reset_accum here in `createFeatureSlice`; (2) animation tracks via `AnimationEngine.getBinder` case 4; (3) preset round-trip via `PresetLogic.applyPresetState`; (4) undo snapshot via `historySlice.beginParamTransaction`. All four iterate the registry; none is in the four-file scope of this subsystem.
- **GMT audit findings that motivated strict enforcement** — silent setter-name mismatch (pre-`set${FeatureId}`-convention era), per-leaf-aware subscriptions (which became `useFeatureParam` in the old doc — not in the current code; consumers use `useSlice` + selector reads), and the GMT lint catching only ~60% of isolation violations that motivated explicit `dependsOn`.
- **Per-stop gradient interpolation as future work** — v1 ships whole-gradient crossfade; per-stop interpolation is the future direction the old doc captures.

Items in the old doc that are simply not implemented today (and should be cross-checked before any reader treats them as current contract): `defineFeature(…)` registration API; `enum` and `string` as first-class `ParamType` members (current code uses `type: 'float'` + `options[]` + the external `defineEnumParam` helper, and there is no string-typed enum codepath at all); `bool` instead of `boolean`; lifecycle hooks `onActivate` / `onDeactivate` / `onParamChange` / `shouldRender` and the `ctx` object; `FeatureIsolationError` and `ctx.read(unlistedId)` enforcement; `cacheKey(state)` on `FeatureDefinition`; `tabConfig.dock` and `defaultActive` (moved to `PanelManifest`); `ui: { panel: 'auto' | 'custom' }`; the auto-setter pushing an undo entry (`historySlice` snapshots externally, the setter itself never touches history); `useFeatureParam(featureId, paramId)` as the canonical subscription hook (not present in any audited file).
