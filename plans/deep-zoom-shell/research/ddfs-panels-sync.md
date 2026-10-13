# DDFS features, panels and renderer sync — what a deep-zoom gmt-shell builder needs

Reader: ddfs-panels-sync. Read-only pass, 2026-10-07, worktree `deep-zoom` (branch `deep-zoom-tool`).
All paths are relative to the worktree root. Every fact names the file and the symbol read.
Nothing was compiled or run; anything reasoned rather than read is in "Unverified" at the end.

---

## 1. Verified facts

### 1.1 What a feature is

`engine/FeatureSystem.ts`, `interface FeatureDefinition`. A plain object literal. The engine derives
a state slice at `store[id]`, one setter, panel rows, undo, preset round-trip and keyframe binding.

Fields (all read in `FeatureDefinition`):

| Field | Meaning |
|---|---|
| `id` | slice key and the root of the setter name. Unique per app. |
| `shortId?` | share-link alias; must be globally unique among features (`getDictionary` throws in dev on a clash). |
| `name`, `category` | display / grouping strings. |
| `params: Record<string, ParamConfig>` | the parameters. |
| `groups?: Record<string, GroupConfig>` | `{ label, collapsible?, description?, helpId? }` for a param `group`. |
| `state?` | extra slice state not covered by params (seeded by `Object.assign(initialState, feat.state)` in `store/createFeatureSlice.ts`). |
| `actions?` | `Record<string, (sliceState, payload) => Partial<slice>>` — each becomes a top-level store action of that exact name. |
| `holdsLiveSession?` | predicate; while true a preset load leaves the whole slice alone. |
| `tabConfig?` | `{ label, iconId?, condition? }` — label/icon only. Dock placement is NOT here; it is in the panel manifest. |
| `viewportConfig?` | `{ componentId, renderOrder?, type?: 'scene' | 'dom' }` — a viewport overlay from the component registry. |
| `menuConfig?`, `menuItems?` | `{ label, toggleParam, ... }` — on/off entries in the system menu. |
| `interactionConfig?` | `{ blockCamera?, activeParam? }`. |
| `customUI?` | `CustomUIConfig[]` — registered components inserted into the auto panel (see 1.6). |
| `panelConfig?`, `engineConfig?`, `extraUniforms?`, `requires?`, `inject?`, `postShader?` | GMT shader-pipeline fields. A shell with an external renderer leaves them out. |
| `dependsOn?: string[]` | registration ORDER and a register-time warning only. Nothing blocks an undeclared read. |

### 1.2 Parameter types — the full list

`engine/FeatureSystem.ts`:

```ts
export type ParamType = 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'color' | 'boolean' | 'gradient' | 'image' | 'complex';
export type ScaleType = 'linear' | 'log' | 'log1p' | 'square' | 'cube' | 'root' | 'pi';
```

There is no string type, no enum type, no button/action type and no read-only type.
An enum is a `float` holding an index plus `options[]` (`engine/defineEnumParam.ts`, the `@assumption`
on `defineEnumParam`: "There is NO string-typed enum codepath in `ParamType`").

`ParamConfig` fields a shell will use: `type`, `default`, `label`, `min`, `max`, `step`, `scale`,
`description` (hint text, shown when the store's `showHints` is on), `helpId`, `group`, `hidden`,
`isAdvanced` (hidden unless `advancedMode`), `ui?: 'slider' | 'knob' | 'numeric' | 'checkbox'`,
`format?: (v) => string`, `options?: ParamOption[]`, `layout?: 'full' | 'half' | 'embedded'`,
`parentId` (nest under another param; shown when the parent is truthy), `condition`,
`dynamicConfig`, `dynamicVisible`, `onSet` (returns extra slice updates), `rangePairWith` + `rangeLabel`
(two floats as one dual-thumb row), `userScoped` (device pref, never overwritten by a loaded scene),
`preserveOnApply`, `confirmation` (asks before a boolean goes true), `shortId`, `composeFrom`.
`uniform`, `onUpdate: 'compile'`, `noAccumReset`, `estCompileMs`, `textureSettings` are GMT-pipeline fields.

What the auto panel draws per type — `components/AutoFeaturePanel.tsx`, the `config.type === …` chain:

| Param | Control |
|---|---|
| `boolean` | `ToggleSwitch`; `ui: 'checkbox'` gives a checkbox; `options` on a boolean gives labelled two-way toggle |
| `float` / `int` with `options` | `Dropdown` (current option's `hint` shown under it) |
| `float` / `int`, `ui: 'knob'` | `Knob` |
| `float` / `int` with `rangePairWith` | one `QualityRangePad` row for both params |
| `float` / `int` otherwise | `Slider` (uses `min`, `max`, `step`, `scale`) |
| `vec2` / `vec3` / `vec4` | `Vector2Input` / `Vector3Input` / `Vector4Input` |
| `color` | `EmbeddedColorPicker` |
| `gradient` | `AdvancedGradientEditor` (lazy, through `lazyWithFallback`) |
| `image` | image slot |
| `complex` | no branch found — falls to `return null` |

`float` and `int` share one branch (`if (config.type === 'float' || config.type === 'int')`).

### 1.3 Conditions (conditional visibility)

`engine/FeatureSystem.ts` `interface ParamCondition` and `utils/paramConditions.ts` `evaluateCondition`:

```ts
export interface ParamCondition {
    param?: string; gt?: number; lt?: number;
    eq?: string | number | boolean; neq?: string | number | boolean;
    bool?: boolean; or?: ParamCondition[]; and?: ParamCondition[];
}
```

- `param` names a param in the SAME slice. A leading `$` reads the whole store by dotted path:
  `condition: { param: '$deepZoom.autoIter', eq: false }` (`fluid-toy/features/julia.ts`, `maxIter`).
- An array of conditions is AND (`checkParamActive`: `condition.every(...)`).
- No operator given → truthiness (`boolean` as is, `number > 0`).
- `eq` / `neq` use loose `==` / `!=`.
- `parentId` with no condition → visible when the parent value is truthy.
- `dynamicVisible(sliceState)` runs after `condition`.

### 1.4 Verified feature snippets (copy these shapes)

Boolean, log-scaled float with a condition, int with an AND condition — `fluid-toy/features/deepZoom.ts`:

```ts
import type { FeatureDefinition } from '../../engine/FeatureSystem';

export const DeepZoomFeature: FeatureDefinition = {
    id: 'deepZoom',
    name: 'Deep Zoom',
    category: 'Fractal',
    tabConfig: { label: 'Deep Zoom' },
    params: {
        enabled:  { type: 'boolean', default: false, label: 'Enable deep zoom', description: '…' },
        autoIter: { type: 'boolean', default: true,  label: 'Auto iterations',  description: '…' },
        iterMul: {
            type: 'float',
            default: 1, min: 0.01, max: 8, step: 0.25,
            scale: 'log',
            label: 'Iteration ×',
            condition: { param: 'autoIter', bool: true },
            description: '…',
        },
        maxRefIter: {
            type: 'int',
            default: 50_000, min: 5_000, max: 500_000, step: 1_000,
            label: 'Reference orbit length',
            condition: { and: [{ param: 'enabled', bool: true }, { param: 'autoIter', bool: false }] },
            description: '…',
        },
    },
};
```

Enum — `engine/defineEnumParam.ts` `defineEnumParam(values, label, { defaultIndex?, optionLabels?, optionHints?, extra? })`
returns `{ config, fromIndex, values }`. Use — `fluid-toy/features/composite.ts`:

```ts
import { defineEnumParam } from '../../engine/defineEnumParam';

const showParam = defineEnumParam(
    ['composite', 'julia', 'dye', 'velocity'] as const,
    'Show',
    { defaultIndex: 1, optionLabels: { /* value → label */ } },
);
// in the feature:   params: { show: showParam.config }
// at the renderer:  showParam.fromIndex(slice.show)   // index → 'julia'
```

Spread to add fields — `fluid-toy/features/palette.ts`: `colorMapping: { ...colorMappingParam.config, description: '…' }`.

Gradient — `fluid-toy/features/palette.ts`:

```ts
gradient: {
    type: 'gradient', default: DEFAULT_DYE_GRADIENT, label: 'Palette',
    description: '…',
},
interiorGradient: {
    type: 'gradient', default: DEFAULT_INTERIOR_GRADIENT, label: 'Interior gradient',
    condition: { param: 'interiorMode', neq: INT_SOLID },
},
```

The slice value is a `GradientConfig` (`engine/typedSlices.ts`, `ParamValue`). With no `uniform` set
the engine does nothing with it; the app bakes it for its renderer (top comment of `palette.ts`:
"FluidToyApp subscribes to the slice, bakes the gradient to an LUT buffer via utils/colorUtils").

vec2, hidden param, cross-feature condition — `fluid-toy/features/julia.ts`:

```ts
center:    { type: 'vec2', default: { x: 0, y: 0 }, min: -2, max: 2, step: 0.01, label: 'Center' },
centerLow: { type: 'vec2', default: { x: 0, y: 0 }, min: -1, max: 1, step: 1e-12, label: 'Center (low bits)', hidden: true },
maxIter:   { type: 'int', default: 310, min: 16, max: 512, step: 1, label: 'Iterations (cap)',
             condition: { param: '$deepZoom.autoIter', eq: false } },
```

### 1.5 Setters — naming and calling

`store/createFeatureSlice.ts`:

```ts
const actionName = `set${feat.id.charAt(0).toUpperCase() + feat.id.slice(1)}`;
slice[actionName] = (updates: any) => { … }
```

- One setter per feature, taking a PARTIAL patch: `useEngineStore.getState().setJulia({ center, zoom })`.
- The name is a string convention re-derived at ~20 sites (the file's own `@assumption`), including
  `utils/PresetLogic.ts` `applyPresetState`, `engine/AnimationEngine.ts` (binder case "4. Universal DDFS
  Resolver"), `store/slices/historySlice.ts` `applyStateRestore`, `engine/typedSlices.ts` `setSlice`.
  Renaming a feature id renames the setter everywhere.
- **No equality gate.** The setter always does `return { [feat.id]: next }` with a fresh object, so
  every call changes the slice reference even when the values are identical. Subscribers re-fire.
- It converts `vec2`/`vec3` to `THREE.Vector2`/`Vector3` and `color` to `THREE.Color` on write.
- It always emits `FractalEvents.emit('config', …)` and, when any changed param lacks `noAccumReset`,
  `FractalEvents.emit('reset_accum')`. `uniform` events only fire for params that declare `uniform`.
- `actions` reducers become store actions under their own name and do a plain `set` + `reset_accum`.

Typed helpers — `engine/typedSlices.ts`: `useSlice(id)`, `getSlice(id)`, `setSlice(id, patch)`,
`subscribeSlice(id, (next, prev) => …)` (non-React, returns unsubscribe), `useLiveModulations()`,
`applyLiveMod(slice, featureId, liveMod)`.

Typing the store for an app — `fluid-toy/storeTypes.ts` (type-only file, no runtime import needed):

```ts
import type { SliceFromParams } from '../engine/typedSlices';
import type { JuliaFeature } from './features/julia';

export type JuliaSlice = SliceFromParams<typeof JuliaFeature['params']>;

declare module '../engine/typedSlices' {
    interface AppFeatureSlices { julia: JuliaSlice; }
}
declare module '../engine/features/types' {
    interface FeatureStateMap { julia: JuliaSlice; }
}
```

The second block is what makes `useEngineStore.getState().setJulia(...)` typed.

### 1.6 Custom widgets — the component registry

`components/registry/ComponentRegistry.tsx`: `componentRegistry.register(id, Component)`, `.get(id)`,
`.has(id)`, `.ids()`. A module singleton. It has NO freeze; re-registering an id warns and overwrites.

Two ways a registered component reaches a panel:

1. Manifest widget item — `components/PanelRouter.tsx` `renderWidget`:
   ```tsx
   return <Component key={…} {...props} {...(extraProps ?? {})} />;
   ```
   Props received: `state`, `actions`, `onSwitchTab` (`interface WidgetProps`) plus the item's `props`.
   A missing id logs `[PanelRouter] widget "<id>" not in componentRegistry` and renders nothing.
2. Feature `customUI` entry — `components/AutoFeaturePanel.tsx`:
   ```tsx
   <Component featureId={featureId} sliceState={sliceState} actions={actions}
              hints={effectiveHints} keyframes={keyframes} {...c.props} />
   ```
   `CustomUIConfig = { componentId, group?, props?, condition?, parentId?, placement?: 'top' | 'bottom' }`.

When to register (verified practice, `fluid-toy/registerFeatures.ts` and `fluid-toy/main.tsx`):
store-free widgets used by `customUI` are registered in `registerFeatures.ts`
(`componentRegistry.register('julia-c-picker', JuliaCPicker)`); widgets that import the store are
registered in `main.tsx` after the install calls (`componentRegistry.register('panel-views', ViewLibraryPanel)`,
`'palette-fit'`, `'iteration-readout'`), before `setupFluidToy()`.

`validateComponentRefs(componentRegistry)` (`engine/FeatureSystem.ts`) is an opt-in dev check for
`customUI` / `viewportConfig` ids. It does not check manifest widget ids.

### 1.7 The panel manifest — every item type

`engine/PanelManifest.ts`.

`PanelDefinition`: `id` (also the store PanelId and default tab label), `label?`, `dock: 'left' | 'right' | 'float'`
(`types/store.ts` `DockZone`), `order`, `active?`, `showIf?`, `helpId?`, then content — `items?` |
`features?` (+ `widgets?: { before, after, between }`) | `component?` — and `isCore?` (default true: no close
button when floating), `floatable?` (default true), `chrome?: 'window' | 'bare'` (bare = float-only).
Resolution order in `PanelRouter`: `component` wins, else `items`, else `features`.

`PanelItem` union (all carry optional `showIf` and `helpId`):

| `type` | Fields | Renders |
|---|---|---|
| `'feature'` | `id`, `groupFilter?`, `whitelistParams?`, `labelOverrides?`, `liftChildrenOf?`, `excludeParams?`, `className?` | `AutoFeaturePanel` |
| `'widget'` | `id`, `props?` | registered component |
| `'section'` | `label` | `SectionLabel` header |
| `'separator'` | `variant?: 'fade'` | `SectionDivider` |
| `'collapsible'` | `label`, `items: PanelItem[]`, `defaultOpen?` | `CollapsibleSection variant="section"`, nestable, closed unless `defaultOpen` |
| `'accordion'` | `sections: PanelAccordionSection[]` | `Accordion`; a section has `id`, `label`, `items`, `headerWidget?`, `closedBadge?`, `activePredicate?`, `defaultOpen?`, `group?` (exclusive), `groupFallback?`, `showIf?` |
| `'compilable'` | `id` + `CompilablePanelConfig` overrides, `labelFn?` | `CompilableFeatureSection` (GMT compile gate) |
| `'compile-dropdown'` | `id` + `CompileDropdownPanelConfig` overrides | `CompileDropdownSection` |
| `'runtime-section'` | `id`, `runtimeToggleParam?`, `runtimeGroup?`, `runtimeExcludeParams?`, `label?`, `labelFn?` | `RuntimeSection`: header toggle bound to a boolean param, body = that feature's params |

`showIf` is a dotted store path string (`'audio.isEnabled'`) or `(state) => boolean` (`evalShowIf`).

Verified manifest with sections, a widget and a `showIf` — `fluid-toy/panels.ts`:

```ts
import type { PanelManifest } from '../engine/PanelManifest';

export const FluidToyPanels: PanelManifest = [
    {
        id: 'View', dock: 'left', order: 0, active: true,
        items: [
            { type: 'widget', id: 'panel-views' },
            { type: 'section', label: 'Iterations' },
            { type: 'widget', id: 'iteration-readout' },
            { type: 'feature', id: 'deepZoom', whitelistParams: ['autoIter', 'iterMul'] },
            { type: 'feature', id: 'julia', whitelistParams: ['maxIter'] },
        ],
    },
    { id: 'Presets', dock: 'left', order: 5, features: ['presets'] },
    {
        id: 'Post-FX', dock: 'right', order: 4,
        items: [
            { type: 'section', label: 'Tone' },
            { type: 'feature', id: 'postFx', whitelistParams: ['toneMapping', 'exposure', 'vibrance'] },
            { type: 'section', label: 'Glass', showIf: fluidOn },
            { type: 'feature', id: 'postFx', whitelistParams: ['refraction', 'caustics'], showIf: fluidOn },
        ],
    },
];
```

One feature may appear in many items and many panels; the params stay on one slice, so undo, presets
and keyframes address them as `featureId.paramName` (file header of `fluid-toy/panels.ts`).

A collapsible is the same shape (type read in `PanelItem`; no fluid-toy usage found):

```ts
{ type: 'collapsible', label: 'Advanced', defaultOpen: false, items: [
    { type: 'feature', id: 'dzQuality', whitelistParams: ['…'] },
    { type: 'widget', id: 'dz-telemetry', props: { compact: true } },
] },
```

### 1.8 Seeding and docking at startup

`fluid-toy/setup.ts`:

```ts
export const setupFluidToy = () => {
    applyPanelManifest([...FluidToyPanels, feedbackPanelEntry()]);
    useEngineStore.getState().setDockCollapsed('left', false);
};
```

`applyPanelManifest` (`engine/PanelManifest.ts`): merges definitions into a module registry; if the
store is not live yet (`peekLiveStore()` null) it returns and the next call sweeps everything in;
otherwise it writes `state.panels[id] = { id, location: def.dock, order, isCore, floatable, isOpen }`
and picks one active tab per dock (`active: true` with the lowest `order`, else the current one, else
the lowest order), setting `activeLeftTab` / `activeRightTab`. `addPanel(def)` appends one at runtime.

The left dock is collapsed by default (comment in `fluid-toy/setup.ts`; persisted key
`gmt.isLeftDockCollapsed` in `store/slices/uiSlice.ts`), which is why the app opens it explicitly.

The shell component mounts the hosts — `fluid-toy/FluidToyApp.tsx`: `TopBarHost`, `Dock side="left"`,
`ViewportFrame` (with `HudHost` inside), `Dock side="right"`, `TimelineHost`, `SettingsHost`,
and `PanelRouter` with the whole state. `fractal-toy/setup.ts` is one line:
`export const setupFractalToy = () => applyPanelManifest(FractalToyPanels);`.

### 1.9 Boot order (the three-file contract)

`fractal-toy/main.tsx` header and `fluid-toy/main.tsx`:

1. `import './registerFeatures';` FIRST — all `featureRegistry.register(...)`.
2. Plugin preset-field side-effect imports (`import '../engine/plugins/camera/presetField';`).
3. `registerUI()`, then the `install*()` calls, then store-aware widget registration.
4. `setupX()` → `applyPanelManifest(...)`.
5. `ReactDOM.createRoot(...).render(<AppErrorBoundary><React.StrictMode><App/></React.StrictMode></AppErrorBoundary>)`.

The store is LAZY — `store/engineStore.ts` `ensureStore()`: the zustand store is created on the first
hook call / `getState()` / `setState()` / `subscribe()`, not on import. That first use runs
`createFeatureSlice`, which calls `featureRegistry.freeze()`. In `fluid-toy/main.tsx` the first use is
`useEngineStore.getState().setSampleCap(64)`, right after `registerUI()`.

### 1.10 Pushing store changes into an external renderer

`fluid-toy/useEngineSync.ts` — one hook, one effect per slice, each feature file owns its sync function:

```ts
export const useEngineSync = (engineRef: RefObject<FluidEngine | null>): void => {
    const deepZoom = useSlice('deepZoom');
    const postFx   = useSlice('postFx');
    const liveMod  = useLiveModulations();

    const postFxMod = useMemo(() => applyLiveMod(postFx, 'postFx', liveMod), [postFx, liveMod]);

    useEffect(() => { const e = engineRef.current; if (e) syncDeepZoomToEngine(e, deepZoom); }, [deepZoom, engineRef]);
    useEffect(() => { const e = engineRef.current; if (e) syncPostFxToEngine(e, postFxMod); }, [postFxMod, engineRef]);
};
```

and in the feature file (`fluid-toy/features/deepZoom.ts`):

```ts
export const syncDeepZoomToEngine = (engine: FluidEngine, deepZoom: DeepZoomSlice): void => {
    engine.setParams({ deepZoomEnabled: deepZoom.enabled, autoIter: deepZoom.autoIter, iterMul: deepZoom.iterMul });
};
```

`applyLiveMod` returns the SAME slice reference when no modulation touches it, so an effect only
re-fires on a user edit or an active LFO (`engine/typedSlices.ts`, `@assumption` on `applyLiveMod`).
Skipping `applyLiveMod` is a known footgun: the row shows modulation but the renderer never sees it.

How fluid-toy avoids the renderer and the store fighting over a value the renderer changes itself
(the view during a gesture) — three verified pieces:

- Gestures write the renderer directly and commit to the store ONCE, on pointer-up
  (`fluid-toy/pointer/handlers.ts` `onUp`):
  ```ts
  if (pendingViewRef.current) {
      const pending = pendingViewRef.current;
      pendingViewRef.current = null;
      useEngineStore.getState().setJulia({ center: pending.center, centerLow: pending.centerLow, zoom: pending.zoom });
  }
  …
  handleInteractionEnd();
  ```
- The effect that pushes the gesture-owned fields does NOT depend on per-frame modulation
  (`useEngineSync.ts`: `[julia, engineRef]` with the comment "modulation ticks would otherwise refire it
  every frame and clobber gesture-set engine.params.center/zoom with stale store values").
- A second, narrow sync pushes only the modulated field (`syncJuliaCToEngine` → `engine.setParams({ juliaC })`).

There is no generic echo guard in the engine. Because the setter has no equality gate (1.5), writing
a value the renderer reported back into the store re-fires the sync effect and pushes it again.

### 1.11 What a feature gets automatically

- **Undo.** `store/slices/historySlice.ts` `getParamSnapshot` loops `featureRegistry.getAll()` and
  JSON-clones every feature slice; `beginParamTransaction` / `endParamTransaction` diff and push;
  `applyStateRestore` replays through `set<Feature>`. Slider drags are already wrapped
  (`AutoFeaturePanel.tsx`: `handleInteractionStart('param')` … `handleInteractionEnd()`). A custom
  gesture calls the same pair (`fluid-toy/pointer/handlers.ts`). Stack cap `MAX_STACK = 50`.
- **Presets / scene files.** `utils/PresetLogic.ts` `applyPresetState` loops the registry and calls
  each feature's setter with the file's values; a param missing from the file goes back to its
  `default`; `userScoped` params keep the live value; `holdsLiveSession` skips the slice.
- **Keyframes.** Track id is `${featureId}.${paramKey}`, vector axes `${featureId}.${paramKey}_x`
  (`store/createFeatureSlice.ts` `@assumption`). `engine/AnimationEngine.ts` case "4. Universal DDFS
  Resolver" finds the feature and writes through `set<Feature>`. The auto panel draws a keyframe
  diamond on each animatable row (`KeyframeButton`; `keyframes` prop defaults true).
- **Modulation.** `liveModulations` holds the modulated value per `featureId.paramKey`; the app merges
  it with `applyLiveMod` (1.10). Needs `installModulation()` (`fluid-toy/main.tsx`).
- **Share links.** `featureRegistry.getDictionary()` builds aliases from `shortId`s.

### 1.12 Traps

1. **Registry freeze.** `FeatureRegistry.register` after `freeze()` throws `FeatureRegistryFrozenError`
   in dev and warns + drops the feature in prod. The freeze happens on FIRST STORE USE. Any
   module-scope `useEngineStore.getState()` / hook call / `subscribe` that runs before
   `registerFeatures` finishes freezes early. In dev the error prints the stack that froze it.
2. **Duplicate ids.** Same object twice = no-op. A different object under an existing id: dev warns
   and REPLACES (HMR path), prod throws `DuplicateFeatureError`. A quiet dev console proves nothing.
   `fluid-toy` already owns the id `deepZoom` (`fluid-toy/features/deepZoom.ts`) — harmless across
   separate entry pages, a collision if both ever load in one bundle.
3. **Share-link alias clashes.** Two features with one `shortId`, or two params in a feature on one
   wire key, throw in dev inside `getDictionary()` and silently drop state in prod.
4. **isolatedModules.** Type-only imports must be `import type` (`fluid-toy/storeTypes.ts` and
   `fluid-toy/features/deepZoom.ts` do this). `engine/FeatureSystem.ts` itself notes its
   `import type { UniformDefinition }` is load-bearing against an import cycle.
5. **`engine/typedSlices.ts` imports the store at module scope** (`import { useEngineStore } from '../store/engineStore'`).
   Importing it does not create the store (lazy), but calling `getSlice` / `setSlice` at module scope would.
   Feature files take only `import type` from it.
6. **`onUpdate: 'compile'` is wired to GMT.** `AutoFeaturePanel.tsx` `handleUpdate`:
   ```ts
   if (config?.onUpdate === 'compile') {
       useEngineStore.getState().movePanel('ShaderCompiler', 'left');
       setTimeout(() => { … FractalEvents.emit('engine_queue', { featureId, param: k, value: v }); }, 50);
       return;
   }
   ```
   The value is NOT written to the store. In a shell without GMT's compiler panel the control does nothing.
7. **Every setter call emits `config` and usually `reset_accum`** on `FractalEvents`, whether or not
   anything listens.
8. **`vec2` values become `THREE.Vector2` in the store**, while the undo snapshot is a JSON clone.
   Read `.x` / `.y`; do not rely on identity or on plain-object equality.
9. **`dependsOn` enforces nothing at read time.** A cycle logs `console.error` and falls back to
   registration order.
10. **`components/AutoFeaturePanel.tsx` imports `../engine-gmt/interaction/interactionSources`**, and
    `fluid-toy/setup.ts` imports `../engine-gmt/feedback`. A shell that uses the auto panel pulls a
    slice of `engine-gmt` into its bundle.

---

## 2. Blueprint for the deep-zoom shell (this area only)

Folder: a new app directory beside `fluid-toy/` (the old `deep-zoom/` shell is the thing being replaced;
the architect decides whether to rebuild in place). Files mirror fluid-toy one for one:

```
<shell>/registerFeatures.ts   featureRegistry.register(...) + store-free widget registration
<shell>/features/*.ts         one FeatureDefinition + one sync<X>ToHost per file
<shell>/storeTypes.ts         SliceFromParams + the two declare-module blocks
<shell>/panels.ts             PanelManifest
<shell>/setup.ts              applyPanelManifest + setDockCollapsed
<shell>/useHostSync.ts        the useEngineSync twin, against the host interface
<shell>/host.ts               the one renderer-facing interface (iframe handles today, module later)
<shell>/main.tsx              boot order of 1.9
```

**Features.** Group the renderer's ~60 state variables and its `CTLS` table into a handful of features
by what the user is doing, not by renderer internals — for example look/lighting, colour (with a
`gradient` param), quality/performance, kernel (iterations, BLA), navigation feel. Ids must be new and
not `deepZoom`. Each param copies its range, step and default from the matching `CTLS` row; mode
selectors go through `defineEnumParam` and the sync function maps back with `fromIndex`. Labels carry
names and numbers only; explanations go in `description`.

**Sync.** One hook with one effect per feature, each calling `sync<X>ToHost(host, sliceMod)` where
`sliceMod = applyLiveMod(slice, id, liveMod)`. Sync functions talk to `host` only. Leave `uniform` and
`onUpdate` off every param — the shell's renderer is not the `FractalEvents` pipeline.

**Values the renderer changes itself.** Split by who owns the value:

- Renderer-owned and continuous (the view: position, orientation, depth, anything `diveTo` moves) —
  do NOT mirror per frame into a DDFS param. Follow fluid-toy: the renderer holds it live, and the
  shell commits it at rest (end of a gesture or dive) inside a `handleInteractionStart('param')` /
  `handleInteractionEnd()` pair so it lands as one undo step. The view needs more digits than a
  number holds at 1e-77, so it cannot be a `float`/`vec` param (see gaps).
- Store-owned settings the renderer may adjust (an auto mode nudging a value) — keep the renderer's
  report out of the store, show it through a registered read-out widget
  (`{ type: 'widget', id: 'dz-…-readout' }`, the `iteration-readout` pattern), and leave the param as
  the user's request.
- If a value truly must flow both ways, guard in the sync layer, because the setter will not. Sketch
  (blueprint, not existing code):

  ```ts
  // useHostSync.ts — one cache per feature
  const lastPushed = useRef<Record<string, unknown>>({});

  // store → host: push only keys that differ from what the host was last told
  useEffect(() => {
      const patch: Record<string, unknown> = {};
      for (const k of Object.keys(sliceMod)) {
          if (!Object.is(lastPushed.current[k], sliceMod[k])) patch[k] = lastPushed.current[k] = sliceMod[k];
      }
      if (Object.keys(patch).length) host.set(patch);
  }, [sliceMod, host]);

  // host → store: record first, then write only real differences
  const onHostChanged = (k: string, v: number) => {
      if (Object.is(lastPushed.current[k], v)) return;      // our own push coming back
      lastPushed.current[k] = v;                            // so the effect above skips it
      if (getSlice('dzQuality')[k] !== v) setSlice('dzQuality', { [k]: v });
  };
  ```

**Panels.** One manifest. Tabs in the left and right docks, `section` headers and `collapsible`
roll-ups for advanced groups, `whitelistParams` to split one feature across sections. The depth gauge,
telemetry lines, locations list and record controls are registered widgets referenced as
`{ type: 'widget', id }` — never `component: 'panel-…'`. A feature with an on/off master param can be
shown as `{ type: 'runtime-section', id, runtimeToggleParam }`.

**Startup.** `setup.ts` = `applyPanelManifest(Panels)` + `setDockCollapsed('left', false)` if the left
dock should be open on first run.

**Typing.** `storeTypes.ts` with both `declare module` blocks; see the unverified note on `satisfies`.

**Checks to plan for** (not run here): a smoke that opens every panel tab and asserts labels rendered;
`validateComponentRefs(componentRegistry)` after widget registration in dev.

---

## 3. Gaps — what the engine cannot do yet

Stated generically; each with the interim workaround.

1. **No high-precision number type.** `ParamType` tops out at f64 `float` and f64 vectors. A value
   that needs more digits (a deep-zoom centre) has no param type, so it gets no panel row, keyframe or
   automatic preset field. fluid-toy's workaround is a hidden second `vec2` holding the low word
   (`julia.centerLow`), good to about 1e-30. *Interim:* keep such values renderer-owned and carry them
   as an opaque blob through the Camera plugin's adapter (`camera.register({ featureId, captureState, applyState })`,
   seen in `fluid-toy/main.tsx`) or a feature `state` field. *Generic fix:* a string-backed
   high-precision param type.
2. **No string, action/button or read-only param type.** Text fields, "do it now" buttons and live
   read-outs cannot be declared as params. *Interim:* registered widgets (`type: 'widget'` or `customUI`).
3. **The feature setter has no equality gate and no "from the renderer" channel.** Any write re-fires
   every subscriber, so two-way sync needs an app-side guard (sketch in section 2). *Generic fix:* an
   origin tag or an equality short-circuit in `createFeatureSlice`.
4. **Compile-gated params are hard-wired to GMT.** `onUpdate: 'compile'` opens a panel id
   `'ShaderCompiler'` and emits `engine_queue`; no other app can supply its own "apply on confirm"
   route. *Interim:* don't use `onUpdate: 'compile'`; for settings that force a slow rebuild, use a
   plain param and let the sync function debounce, or a widget with an explicit apply button.
   *Generic fix:* a registrable handler for compile-mode writes.
5. **The manifest's `feature` item cannot pass `hints`, `keyframes`, `variant`, `isDisabled` or
   `disabledParams`.** `AutoFeaturePanel` accepts them; `PanelRouter.renderItem` forwards only
   `groupFilter`, `whitelistParams`, `labelOverrides`, `liftChildrenOf`, `excludeParams`, `className`.
   A shell cannot hide keyframe diamonds for one panel from the manifest. *Interim:* accept the
   defaults. *Generic fix:* add those optional fields to the `'feature'` PanelItem.
6. **Manifest widget ids are not validated.** `validateComponentRefs` covers `customUI` and
   `viewportConfig` only; a mistyped `{ type: 'widget', id }` is a console warning and an empty gap at
   render. *Interim:* a smoke that opens every panel. *Generic fix:* extend the validator to walk the manifest.
7. **Setters always emit `config` / `reset_accum` on the GMT event bus,** and the auto panel imports
   from `engine-gmt`. Engine-core is not fully free of GMT plumbing for a non-GMT renderer. *Interim:*
   ignore the events. *Generic fix:* out of scope here; note for the engine backlog.
8. **`dependsOn` is ordering only.** Cross-feature reads (a `$feature.param` condition, a sync function
   taking two slices) are unchecked. *Interim:* declare `dependsOn` anyway so it is greppable.

---

## 4. Unverified

- **Typed slices under a `: FeatureDefinition` annotation.** Reasoned, not compiled: fluid-toy declares
  `export const DeepZoomFeature: FeatureDefinition = {…}`, which widens `params` to
  `Record<string, ParamConfig>`; `SliceFromParams` over that would give an index signature of `any`
  rather than per-key types. If so, fluid-toy's slices are loosely typed and a new shell should write
  `export const X = {…} satisfies FeatureDefinition` (TypeScript is `^5.4.3` in `package.json`) to get
  real inference. Check with one deliberate type error before relying on either form.
- Whether an `int` slider rounds to whole numbers beyond what `step` gives (the branch is shared with `float`; `Slider` not opened).
- Whether toggles, dropdowns and the gradient editor each produce an undo entry (only the slider drag wrap was read).
- How `feat.state` extras behave on preset load beyond the first lines of `applyPresetState` (`nextState` starts from `feat.state`); and whether they are written into saved files.
- What `registerFeatures()` from `engine/features` (called inside `createFeatureSlice`) registers by default, and which top-level store keys a feature id must not collide with.
- Whether keyframe diamonds appear / work when no timeline is installed.
- `Dock`, `ViewportFrame`, `TimelineHost`, `movePanel` and floating-panel behaviour (`dock: 'float'`, `chrome: 'bare'`) — types read, components not opened.
- `fractal-toy/renderer/formulaRegistry.ts` (`registerFormula` → `addPanel`) and `fractal-toy/FractalToyApp.tsx` sync path — only the registration, setup and manifest files were read.
- `engine/features/types.ts` `FeatureStateMap` (augmented by `storeTypes.ts`; the file itself not opened).
- `accordion`, `compilable`, `compile-dropdown`, `runtime-section` rendering — types read in `PanelManifest.ts`, their components not opened.
- The comment in `fluid-toy/registerFeatures.ts` that importing a store-aware widget "would freeze the registry" predates the lazy store in `store/engineStore.ts`; with `ensureStore()` an import alone should not freeze. Not tested — keep fluid-toy's ordering.
- The README / HANDOFF of `mandelbulb_deepzoom` and the `CTLS` table were not opened; the feature grouping in section 2 is a shape, not a mapping.
