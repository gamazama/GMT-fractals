---
subsystem_id: e01-feature-system
audited_at: 2026-05-19T00:00:00Z
files:
  - path: engine/FeatureSystem.ts
    blob_sha: 7fba0a649d055378d42f81ccd30f47f01854f815
    lines_read: [1, 649]
  - path: engine/defineEnumParam.ts
    blob_sha: e4766f05336e57f898d593e9aecbcf1bf3c42ffb
    lines_read: [1, 105]
  - path: engine/typedSlices.ts
    blob_sha: 6d8f1fcc3f57b7788caeace86c8d909fee29e3ae
    lines_read: [1, 202]
  - path: store/createFeatureSlice.ts
    blob_sha: d219872b3702079e4a4f1b444af6d658d4ab1a26
    lines_read: [1, 255]
---

## Public API surface

- `ParamType` union: `'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'boolean' | 'gradient' | 'image' | 'complex'` (engine/FeatureSystem.ts:7)
- `ScaleType` union: `'linear' | 'log' | 'square' | 'root' | 'pi'` (engine/FeatureSystem.ts:8)
- `ParamCondition` interface (engine/FeatureSystem.ts:10-19)
- `ParamOption` interface with `disabledIf` predicate (engine/FeatureSystem.ts:21-36)
- `TextureConfig` interface (engine/FeatureSystem.ts:38-45)
- `CustomUIConfig` interface (engine/FeatureSystem.ts:47-53)
- `ParamConfig` interface (engine/FeatureSystem.ts:55-125)
- `FeatureTabConfig` interface (engine/FeatureSystem.ts:135-143)
- `FeatureViewportConfig` interface (engine/FeatureSystem.ts:145-149)
- `FeatureMenuConfig` interface (engine/FeatureSystem.ts:151-156)
- `FeatureMenuItem` interface (engine/FeatureSystem.ts:158-163)
- `FeatureInteractionConfig` interface (engine/FeatureSystem.ts:165-168)
- `FeatureEngineConfig` interface (engine/FeatureSystem.ts:170-176)
- `GroupConfig` interface (engine/FeatureSystem.ts:179-189)
- `FeatureDefinition` interface (engine/FeatureSystem.ts:191-255)
- `CompilablePanelConfig` interface (engine/FeatureSystem.ts:267-278)
- `CompileDropdownPanelConfig` interface (engine/FeatureSystem.ts:288-298)
- `RuntimePanelConfig` interface (engine/FeatureSystem.ts:304-314)
- `FeatureRegistryFrozenError` class (engine/FeatureSystem.ts:326-343)
- `DuplicateFeatureError` class (engine/FeatureSystem.ts:352-361)
- `featureRegistry` singleton (engine/FeatureSystem.ts:598)
- `validateComponentRefs(componentRegistry)` returns missing-refs array (engine/FeatureSystem.ts:615-649)
- `EnumParam<Values>` / `DefineEnumParamOptions<Values>` interfaces (engine/defineEnumParam.ts:29-53)
- `defineEnumParam(values, label, options?)` helper (engine/defineEnumParam.ts:79-105)
- `SliceFromParams<P>` type alias (engine/typedSlices.ts:66-68)
- `AppFeatureSlices` interface — declaration-merging target (engine/typedSlices.ts:72)
- `AppSliceId` type (engine/typedSlices.ts:75)
- `useSlice(id)`, `getSlice(id)`, `setSlice(id, patch)` (engine/typedSlices.ts:83-114)
- `useLiveModulations()` hook with stable empty fallback (engine/typedSlices.ts:131-133)
- `subscribeSlice(id, listener)` (engine/typedSlices.ts:142-150)
- `applyLiveMod(slice, featureId, liveMod)` pure merge (engine/typedSlices.ts:166-202)
- `FeatureSlice` interface alias and `createFeatureSlice` StateCreator (store/createFeatureSlice.ts:12-16)

## Architecture

- `FeatureDefinition` bundles identity, params, optional `state`/`actions`, UI configs (tab/viewport/menu/customUI), `panelConfig`, `engineConfig`, `extraUniforms`, `dependsOn`, `inject`, and `postShader` (engine/FeatureSystem.ts:191-255).
- `FeatureRegistry` is a class instantiated once and exported as the `featureRegistry` singleton at module scope (engine/FeatureSystem.ts:363,598).
- Registration deduplicates: same def object is a no-op; different def with same id replaces with `console.warn` in dev (HMR path), throws `DuplicateFeatureError` in prod (engine/FeatureSystem.ts:374-396).
- After `freeze()`, new-id registrations throw `FeatureRegistryFrozenError` in dev and `console.warn`-no-op in prod (engine/FeatureSystem.ts:399-404).
- Dev `freeze()` captures up to 10 frames of stack via `new Error('freeze trace').stack` so a later frozen-error can point at the importing module (engine/FeatureSystem.ts:425-433).
- `dependsOn` validates against currently-registered features only at `register()` — unknown deps log a warning but registration proceeds (engine/FeatureSystem.ts:407-413).
- `getAll()` returns a topologically sorted, cached list using Kahn's algorithm with stable tie-breaking on registration index (engine/FeatureSystem.ts:444-448,543-595).
- Dependency cycles are detected post-sort by length mismatch, logged via `console.error`, and the unsorted registration order is returned as a fallback (engine/FeatureSystem.ts:587-592).
- `getUniformDefinitions()` maps each param's `uniform` to a `UniformDefinition`, normalising `color`→`vec3`, `boolean`→`float (0|1)`, `image`/`gradient`→`sampler2D` (null default), then appends each feature's `extraUniforms` (engine/FeatureSystem.ts:511-538).
- `getDictionary()` returns hard-coded preset-alias map plus `features.children[<id>] = { _alias, children: {paramKey: shortId} }` keyed by `shortId` only — params without `shortId` are absent from the dictionary (engine/FeatureSystem.ts:477-509).
- `validateComponentRefs` walks `viewportConfig.componentId` and every entry in `customUI[]`, logging warnings (not errors) in dev for missing ids; intentionally not auto-called from `freeze()` because the component registry is populated later (engine/FeatureSystem.ts:600-649).
- `createFeatureSlice` calls `registerFeatures()` then `registerDefaultPresetFields()` and immediately freezes both `featureRegistry` and `presetFieldRegistry` before iterating `getAll()` to build the slice (store/createFeatureSlice.ts:20-32).
- For each feature, initial state seeds from `feat.state` first, then each non-`composeFrom` param's `default` if undefined; composite (`composeFrom`) params build a reverse `compositeParams[dep] = key` map (store/createFeatureSlice.ts:34-55).
- The auto-setter name is `set${id with capitalised first letter}` (store/createFeatureSlice.ts:58).
- The setter sanitises incoming values: `vec2`→`THREE.Vector2`, `vec3`→`THREE.Vector3`, `color`→`THREE.Color` (accepting string/number/`{r,g,b}` shapes) (store/createFeatureSlice.ts:70-88).
- `onSet` hooks run after sanitisation; their returned extras are merged only when the key is NOT in the original `updates` (prevents preset-batch overrides) (store/createFeatureSlice.ts:90-104).
- Each touched param contributes to a `configUpdates[feat.id]` payload, skipping `type === 'image'`; the bundle is emitted once via `FractalEvents.emit('config', configUpdates)` at the end of the setter (store/createFeatureSlice.ts:119-128,228-230).
- Uniform routing per param-type: `image`→`FractalEvents.emit('texture',…)` with auto-enable for `envMapData`/`layer1Data`; `gradient`→buffer via `generateGradientTextureBuffer` then `uniform` event with `{isGradientBuffer:true, buffer}`; everything else → `uniform` event with boolean→float and color→`THREE.Color` coercion (store/createFeatureSlice.ts:130-182).
- Composite uniforms (`composeFrom`) re-emit when any dependency changes: gradient re-buffers, `vec2`/`vec3` rebuild via `THREE.Vector2`/`Vector3` from `composeFrom` order (store/createFeatureSlice.ts:186-222).
- `shouldReset` is set whenever a touched param lacks `noReset`; at end of setter, emits `reset_accum` (store/createFeatureSlice.ts:61,117,232-234).
- Custom `actions` reducers receive the current slice state and a payload, merge any returned partial back into the slice, and emit `reset_accum` (store/createFeatureSlice.ts:238-251).
- `defineEnumParam` synthesises a `type: 'float'` ParamConfig with `options[]` of `{label, value: i, hint}`, a `fromIndex` clamper that falls back to default for NaN/out-of-range, and the original tuple (engine/defineEnumParam.ts:79-105).
- `typedSlices.useSlice/getSlice/setSlice` are typed pass-throughs to `useEngineStore`; the setter is conventionally `set${Id}` and a missing setter logs a `[typedSlices]` warning and no-ops (engine/typedSlices.ts:83-114).
- `applyLiveMod` walks slice keys: scalars look up `featureId.key` in liveMod; vec-shaped objects override per-axis via `featureId.key_x|y|z|w`; returns the same slice reference if nothing was touched, otherwise a fresh object (engine/typedSlices.ts:166-202).
- `useLiveModulations` uses a module-frozen `EMPTY_LIVE_MODS` constant as the selector fallback to avoid breaking zustand's reference-equality re-render gate (engine/typedSlices.ts:121,131-133).

## Invariants and gotchas

- `featureRegistry.register()` accepts the SAME def object as a no-op (HMR-safe) but treats different def objects with same id differently between dev (replace+warn) and prod (throw) (engine/FeatureSystem.ts:378-396).
- `freeze()` is idempotent and only captures the freeze-stack in dev when `import.meta.env?.DEV` is truthy — guarded with `typeof import.meta !== 'undefined'` for non-Vite consumers (engine/FeatureSystem.ts:426-433).
- Dependency cycles do NOT throw — they `console.error` and silently return registration order, contradicting the doc claim "throws if a dependency cycle is detected" on the `getAll` jsdoc itself (engine/FeatureSystem.ts:443-447 vs 587-592).
- `validateComponentRefs` is opt-in; apps must call it after UI registration. Missing component ids are warnings, not throws, because `AutoFeaturePanel` silently skips them (engine/FeatureSystem.ts:632-647).
- Param `type: 'image'` is excluded from the `config` event payload because of large data URLs, so ConfigManager never sees image params via the bundled CONFIG channel (store/createFeatureSlice.ts:125-128).
- `setX(updates)` re-runs setter logic on every key regardless of value change — there is no `oldValue !== newValue` guard. Every call also runs the full uniform emit path (store/createFeatureSlice.ts:65-184).
- The auto-setter writes `THREE` instances back into state when the input was a plain `{x,y}` object — slice readers see Three classes, not POJOs (store/createFeatureSlice.ts:76-86).
- `onSet`'s contract: extras only apply for keys not already in the user-provided `updates` object — used to let preset loads override defaults (store/createFeatureSlice.ts:94-104).
- `composeFrom` uniforms only fire for non-gradient cases when the composite has both `composeFrom` AND `uniform` set; gradients re-buffer using the gradient param's own value, not the `composeFrom` values (store/createFeatureSlice.ts:188-220).
- `defineEnumParam` synthesises numeric-index enums (default `type: 'float'`); apps must map index→string via `fromIndex` at the boundary. There is no string-typed enum codepath in `ParamType` (engine/FeatureSystem.ts:7 vs engine/defineEnumParam.ts:90-92).
- `AppFeatureSlices` defaults to `{}`; apps MUST declaration-merge to get typed access. `useSlice`/`getSlice` still cast through `any` internally (engine/typedSlices.ts:72,84,93).
- `useLiveModulations` requires the store to expose `s.liveModulations`; otherwise the fallback `EMPTY_LIVE_MODS` is returned (engine/typedSlices.ts:131-133).
- Custom `actions` reducers receive the slice state directly (not a draft) and must return a plain partial; they always trigger `reset_accum` whenever updates is non-empty (store/createFeatureSlice.ts:240-249).

## Drift from existing doc (dev/docs/engine/02_Feature_Registry.md)

| Doc claim | Current code | Severity |
|---|---|---|
| `defineFeature({...})` is the registration API | No `defineFeature` export exists; consumers use `featureRegistry.register(def)` directly with a `FeatureDefinition` literal (engine/FeatureSystem.ts:374,598) | break |
| Param type `enum` exists with default `<Dropdown>` and validated options | `ParamType` has no `'enum'` member; enums are implemented as `type: 'float'` with `options[]` and an external `defineEnumParam` helper (engine/FeatureSystem.ts:7; engine/defineEnumParam.ts:90) | break |
| Param type `string` exists with `<TextInput>` and step interpolation | `ParamType` has no `'string'` member (engine/FeatureSystem.ts:7) | break |
| Param type `bool` is the boolean key | The code uses `'boolean'`, not `'bool'` (engine/FeatureSystem.ts:7) | warn |
| Lifecycle hooks `onActivate`, `onDeactivate`, `onParamChange`, `shouldRender` and `ctx` object | `FeatureDefinition` defines no such hooks; only `actions` reducers and per-param `onSet` exist (engine/FeatureSystem.ts:191-255; store/createFeatureSlice.ts:90-104,238-249) | break |
| `ctx.read(unlistedId)` throws `FeatureIsolationError` in dev | No `FeatureIsolationError`, no `ctx`, no read enforcement in code (engine/FeatureSystem.ts grep) | break |
| Registry frozen post-construction; `register()` throws in dev / no-ops in prod | Matches: `FeatureRegistryFrozenError` thrown in dev, warn+no-op in prod (engine/FeatureSystem.ts:399-404) | info |
| Duplicate IDs throw immediately at registration | Only enforced in PROD (`DuplicateFeatureError`); dev replaces with warn to support HMR (engine/FeatureSystem.ts:382-396) | warn |
| Dependency graph rejects cycles | `getAll()` jsdoc says "Throws if a dependency cycle is detected" but implementation logs `console.error` and returns registration order (engine/FeatureSystem.ts:443-447 vs 587-592) | warn |
| `cacheKey(state)` skips re-injection per feature | No `cacheKey` field on `FeatureDefinition`; shader cache lives elsewhere (engine/FeatureSystem.ts:191-255) | break |
| `dependsOn` enforced at boot; unknown dep is hard failure | Unknown dep at register time is a `console.warn`; missing dep at sort time is skipped silently (engine/FeatureSystem.ts:408-412,560) | warn |
| `tabConfig.dock` and `defaultActive` auto-place panels | `FeatureTabConfig` is `{label, iconId?, condition?}` — dock/order moved to PanelManifest per comment (engine/FeatureSystem.ts:127-143) | break |
| `ui: { panel: 'auto' | 'custom' }` field on feature | No `ui` field exists; UI rendering is driven by `panelConfig` / `customUI` / `tabConfig` (engine/FeatureSystem.ts:191-255) | break |
| Setter pushes an undo entry | `createFeatureSlice` setter does not interact with any history slice; it emits `config` and `reset_accum` only (store/createFeatureSlice.ts:60-235) | warn |
| `useFeatureParam(featureId, paramId)` is the subscription primitive | No such hook in audited files; only `useSlice`, `getSlice`, `subscribeSlice` exist in typedSlices.ts (engine/typedSlices.ts:83-150) | warn |
| Adding a param auto-derives animation tracks, preset round-trip, undo, UI | Code wires UI panel, uniforms, config events, and reset; animation/preset/undo derivations are not in these four files (store/createFeatureSlice.ts:34-251) | info |
| `engineConfig`, `panelConfig`, `compileSettingsParams`, `CompileDropdownPanelConfig`, `RuntimePanelConfig` exist | Present in code but undocumented in 02_Feature_Registry.md (engine/FeatureSystem.ts:170-176,267-314) | info |
| `defineEnumParam` exists as a codified pattern | Not mentioned in 02_Feature_Registry.md (engine/defineEnumParam.ts) | info |
| `typedSlices.ts` declaration-merging API exists | Not mentioned in 02_Feature_Registry.md (engine/typedSlices.ts) | info |
| `applyLiveMod` and `useLiveModulations` are part of the public API | Not mentioned in 02_Feature_Registry.md (engine/typedSlices.ts:121-202) | info |

## Open questions

- Where is the animation-track / preset / undo wiring promised by the doc actually performed? Outside the four-file scope (likely in `engine/features/` registrar or the `presetFieldRegistry`).
- `registerFeatures()` from `engine/features` and `registerDefaultPresetFields()` from `utils/defaultPresetFields` — out of scope here; they determine what features the slice actually sees.
- `FractalEvents` channels (`config`, `uniform`, `texture`, `reset_accum`) — defined in `engine/FractalEvents.ts`, out of scope for this audit.
- `ConfigManager.update()` (referenced in code comment at store/createFeatureSlice.ts:120-123) governs compile vs runtime semantics — lives outside these files.
- `generateGradientTextureBuffer` (utils/colorUtils) is the gradient→sampler bridge — out of scope but load-bearing for `composeFrom` gradient re-emission.
- `PanelManifest` is referenced (engine/FeatureSystem.ts:131) as the new home for dock/order/visibility — its surface is not audited here.
- `presetFieldRegistry` is frozen alongside `featureRegistry` in `createFeatureSlice` (store/createFeatureSlice.ts:31) but its API is not in these four files.
- Whether `image` params being skipped from the CONFIG event payload (store/createFeatureSlice.ts:125-128) interacts correctly with GMF preset round-trip is unclear from these files alone.
