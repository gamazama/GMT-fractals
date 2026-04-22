# 02 — Feature Registry 🚧

The feature registry is the engine's central primitive. A **feature** bundles: state shape, UI params, optional shader contribution, lifecycle hooks, and dependency declaration. Registering a feature derives — automatically — its state slice, setter, UI panel, undo snapshot, animation bindings, and preset round-trip.

**Rule:** adding a new feature should be one file. If the boilerplate is growing, the registry is the wrong shape.

## The `defineFeature` shape

```ts
defineFeature({
  id: 'dye',
  name: 'Dye',
  category: 'Simulation',

  // WHAT IT OWNS — state is auto-namespaced under store.dye
  params: {
    dissipation:  { type: 'float', default: 0.98, min: 0.9, max: 1, step: 0.001, label: 'Dissipation' },
    gradient:     { type: 'gradient', default: DEFAULT_GRADIENT, label: 'Palette' },
    blendMode:    { type: 'enum', default: 'add', options: ['add','multiply','screen'], label: 'Blend' },
  },

  // WHAT IT DEPENDS ON — explicit, validated
  dependsOn: ['fluidSim'],   // dye reads fluidSim.resolution

  // LIFECYCLE — all optional
  onActivate:   (ctx) => { /* first time toggled on */ },
  onDeactivate: (ctx) => { /* and off */ },
  onParamChange: (diff, ctx) => { /* per-param updates */ },
  shouldRender:  (state) => state.dye.blendMode !== 'off',

  // SHADER CONTRIBUTION — optional, for apps using ShaderBuilder
  inject: (builder, cfg) => {
    builder.addUniform('float uDissipation');
    builder.addSection('fragmentColor', `color *= uDissipation;`);
  },

  // UI — default is AutoFeaturePanel; override only when needed
  ui: { panel: 'auto' },     // or { panel: 'custom', componentId: 'dye-custom-panel' }

  // VIEWPORT OVERLAY — optional, for features that render DOM on top
  viewportConfig: { componentId: 'overlay-brush-cursor', type: 'dom' },
})
```

## What gets auto-derived

At registration time, the registry emits:

1. **Zustand slice** at `store.dye` with default values.
2. **Setter** `store.setDye(partial)` that calls `onParamChange` and pushes an undo entry.
3. **Undo snapshot** inclusion (historySlice iterates `featureRegistry.getAll()`).
4. **Animation tracks** — one per param, id = `dye.dissipation`, `dye.gradient`, etc. Interpolator chosen from `param.type`.
5. **Preset serialization** — JSON round-trip via `SceneFormat`, PNG metadata embed via `@engine/scene-io`.
6. **UI panel** — `AutoFeaturePanel` rendered from `params` metadata; input component chosen per type.

**Rule:** if you add a param to `params`, all six derivations happen. Nothing else to wire.

## Param types and interpolators

| Type | Default input component | Animation interpolator | Undo comparator |
|---|---|---|---|
| `float` | `<Slider>` | linear lerp | `===` |
| `int` | `<Slider step=1>` | linear lerp + round | `===` |
| `bool` | `<ToggleSwitch>` | step (no interp) | `===` |
| `vec2` | `<VectorInput>` | per-component lerp | deep |
| `vec3` | `<VectorInput>` | per-component lerp | deep |
| `color` | `<ColorPicker>` | OKLab lerp (see [05_Shared_UI.md](05_Shared_UI.md#color)) | deep |
| `gradient` | `<AdvancedGradientEditor>` | whole-gradient crossfade (per-stop in future; see [08_Animation.md](08_Animation.md#gradient-tracks)) | deep |
| `enum` | `<Dropdown>` | step (no interp) | `===` |
| `string` | `<TextInput>` | step (no interp) | `===` |
| `image` | `<ImagePicker>` | step (no interp) | ref |

**Rule:** unknown types throw at registration. No silent dead tracks.
**Why:** fragility was discovered in the audit — the old `set${Feature}` path degraded silently when a setter name didn't match convention. Strict type registration catches this at boot.

## Isolation via `dependsOn`

**Rule:** a feature cannot read another feature's state unless it declares that feature in `dependsOn`.
**Why:** enables refactor safety. Renaming `audioMod.bandCount` must not require a codebase-wide search; the registry enforces the dependency graph so changes are local.

```ts
// In dye.ts
defineFeature({
  id: 'dye',
  dependsOn: ['fluidSim'],
  onParamChange: (diff, ctx) => {
    const res = ctx.read('fluidSim').resolution;  // OK — declared
    // const bands = ctx.read('audioMod').bands;  // THROWS in dev, WARNS in prod
  },
})
```

**Enforcement:**
- **Dev:** `ctx.read(unlistedId)` throws `FeatureIsolationError`.
- **Prod:** warns once to console; still returns the value (don't break users at runtime).
- **Dependency graph:** the registry computes the DAG at freeze time and rejects cycles.

## Lifecycle hooks

| Hook | Signature | When it fires |
|---|---|---|
| `onActivate` | `(ctx) => void` | First time the feature's `enabled` param flips to true, or once at boot if no toggle exists |
| `onDeactivate` | `(ctx) => void` | On toggle off |
| `onParamChange` | `(diff: Partial<State>, ctx) => void` | After each `setX()` call, with just the changed fields |
| `shouldRender` | `(state) => boolean` | Consulted per frame by shader pipeline / viewport overlay loop; skip work when false |

**`ctx` object:**
- `ctx.read(featureId)` — get another feature's current state (validated against `dependsOn`)
- `ctx.emit(eventName, payload)` — publish to the event bus
- `ctx.getGeneration()` — monotonic counter for cache keys

**Rule:** hooks must be synchronous and side-effect-local. No `setTimeout`, no network calls, no store writes outside the feature's own scope.
**Why:** these run in hot paths; async work breaks snapshot consistency.

## The registry's frozen state

**Rule:** after `createEngineStore()` runs, the registry is frozen. `featureRegistry.register()` throws in dev, no-ops in prod.
**Why:** state slices are snapshotted once at store construction. Late registration silently broke in GMT's extraction (see [20_Fragility_Audit.md F1](20_Fragility_Audit.md)). Freezing makes the timing error loud.

**Consequence for plugins:** all `registerFeatures.ts` side-effect imports must occur before the app's store-reading code runs. The three-step contract in [03_Plugin_Contract.md](03_Plugin_Contract.md) codifies this.

**Duplicate IDs:** second registration throws immediately at registration time (not at freeze). No silent overwrite — first-writer wins, second-caller learns.

## Component subscriptions — avoid re-render storms

**Rule:** UI components subscribe to one param at a time via `useFeatureParam(featureId, paramId)`, not the whole feature slice.
**Why:** a single top-level `useFractalStore(s => s.dye)` rerenders on every dye param change; per-param subscriptions cut it to just the relevant ones. GMT's audit flagged this pattern as a performance cliff.

```tsx
// GOOD
const dissipation = useFeatureParam('dye', 'dissipation');

// BAD (rerenders on every dye param change)
const dye = useFractalStore(s => s.dye);
```

## Cache-keyed re-injection

Features that contribute shader code have a `cacheKey(state)` method the builder consults. If the key is unchanged since last compile, `inject()` is skipped.

```ts
defineFeature({
  id: 'dye',
  cacheKey: (s) => `${s.blendMode}|${s.enabled}`,  // shader rebuilds only when mode/enabled change
  inject: (builder, cfg) => { … },
})
```

**Rule:** anything in `cacheKey` that's omitted silently rebuilds every frame. Anything included that doesn't actually affect the shader wastes rebuilds.

## Example: the demo feature (reference)

See [`demo/DemoFeature.ts`](../demo/DemoFeature.ts). Minimal: four params, no shader, one DOM overlay. Proves the registration → state → UI → overlay → preset round-trip end-to-end via `npm run smoke:interact`.

## Decisions

### 2026-04-22 — Registry frozen at store construction
**Decision:** post-construction `register()` throws in dev, no-ops in prod.
**Alternative:** warn-only. Rejected — audit showed warn-only produced silent bugs when imports ordered wrong.

### 2026-04-22 — Isolation via explicit `dependsOn`
**Decision:** features declare which other features they read; undeclared reads throw in dev.
**Alternative:** full store access with linting rules. Rejected — lint caught ~60% of GMT cases; the registry can enforce 100%.

### 2026-04-22 — First-class `mode` (via `enum` param type)
**Decision:** modes are a first-class param type with validated option lists, not ad-hoc strings.
**Alternative:** string param with convention. Rejected — loses auto-UI (dropdown vs text input) and auto-interpolation (step vs lerp).

### 2026-04-22 — Gradient interpolation is whole-gradient crossfade in v1
**Decision:** animating a gradient param interpolates the whole gradient linearly between keyframes. Per-stop easing is a future `gradient-track` specialization.
**Alternative:** per-stop interpolation in v1. Rejected — UX surface (which stop maps to which?) not worth the v1 complexity.

## Known fragilities

See [20_Fragility_Audit.md](20_Fragility_Audit.md):
- **F1** — late registration (mitigated by freeze)
- **F2** — duplicate IDs (mitigated by throw-on-register)

## Cross-refs

- Registration contract: [03_Plugin_Contract.md](03_Plugin_Contract.md)
- Auto-animation binders: [08_Animation.md](08_Animation.md)
- UI primitives that render param types: [05_Shared_UI.md](05_Shared_UI.md)
- Intra-feature coordination beyond `dependsOn`: [09_Bridges_and_Derived.md](09_Bridges_and_Derived.md)
