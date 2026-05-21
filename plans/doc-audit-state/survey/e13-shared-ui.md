---
subsystem_id: e13-shared-ui
audited_at: 2026-05-19T00:00:00Z
files:
  - path: components/Slider.tsx
    blob_sha: a7208570d96e9b4f6174fb290fc532a6599e4f29
    lines_read: [1, 332]
    tier: A
  - path: components/Knob.tsx
    blob_sha: d24c70f7f5d724ac761404ed70245cca71f2f060
    lines_read: [1, 192]
    tier: A
  - path: components/AutoFeaturePanel.tsx
    blob_sha: 858f268982da1b084af7c97f66b2acc99e59a4c2
    lines_read: [1, 702]
    tier: A
  - path: components/CompilableFeatureSection.tsx
    blob_sha: 7f6fcfd63e35384347b4f89e8ecefd58e1a73b20
    lines_read: [1, 365]
    tier: A
  - path: components/registry/ComponentRegistry.tsx
    blob_sha: 03faf92e84542659b848547e95de69cc338cac32
    lines_read: [1, 53]
    tier: A
  - path: components/contexts/StoreCallbacksContext.tsx
    blob_sha: 60c81efa3c7826b833cb346cc1aebf327041f63f
    lines_read: [1, 21]
    tier: A
  - path: components/inputs/index.ts
    blob_sha: 20043aea5897f3606fd1dcae2af8860215000774
    lines_read: [1, 19]
    tier: B
  - path: components/inputs/types.ts
    blob_sha: e292a779fd5d7348297345bb5e1ae1b27b92df70
    lines_read: [1, 224]
    tier: B
  - path: components/inputs/ScalarInput.tsx
    blob_sha: fe0d2c0e41952a700b9c9d67228cd4ee466b3538
    lines_read: [1, 40]
    tier: B
  - path: components/inputs/VectorInput.tsx
    blob_sha: fa0517c7710525c33bdaeff996e1ccc07200759e
    lines_read: [0, 0]
    tier: B
  - path: components/inputs/primitives/index.ts
    blob_sha: eb4e79f3aa0215f08c3b1f3dd2e42240b301d061
    lines_read: [0, 0]
    tier: B
  - path: components/inputs/hooks/index.ts
    blob_sha: 8c79132c98defb4b78e23d5ae10bd141098d7f2f
    lines_read: [0, 0]
    tier: B
  - path: components/vector-input/index.tsx
    blob_sha: 55ecfce6e9a74b8b7b8fa55a0dd067250d6e2285
    lines_read: [1, 450]
    tier: B
  - path: components/vector-input/types.ts
    blob_sha: da41290091b0b96cf1d07ab5a1d26e6fd59e18f2
    lines_read: [1, 112]
    tier: B
  - path: components/vector-input/BaseVectorInput.tsx
    blob_sha: 38dfd57071fd7eb762e40ea06fe12875df8147cb
    lines_read: [1, 40]
    tier: B
  - path: components/gradient/GradientContextMenu.tsx
    blob_sha: 7cc876634374c1261383d6a5cd2a48ab18f79755
    lines_read: [1, 30]
    tier: B
  - path: components/graph/GraphCanvas.tsx
    blob_sha: d5d770a1af928a76ab86a76504429902615b0bc8
    lines_read: [1, 40]
    tier: B
  - path: components/graph/GraphSidebar.tsx
    blob_sha: 46df56f4a051ada69beb151aa62007b307bb340f
    lines_read: [1, 30]
    tier: B
  - path: components/graph/GraphToolbar.tsx
    blob_sha: 76f0bdb06d34fdb73260e800b21ede5d6a31227e
    lines_read: [1, 30]
    tier: B
  - path: components/graph/GraphSelectionBBox.tsx
    blob_sha: b3022e6d6e3a486dac97f2074bfdc19ae7e33251
    lines_read: [1, 30]
    tier: B
  - path: components/layout/Dock.tsx
    blob_sha: 66bc4399dd3c8a85753413b20da29beb99668ae2
    lines_read: [1, 40]
    tier: B
  - path: components/layout/DropZones.tsx
    blob_sha: 4ce6896c85f811ba341977ec2e7af4ef6e521123
    lines_read: [1, 30]
    tier: B
  - path: components/panels/engine/EngineFeatureRow.tsx
    blob_sha: ecf7c850e53c051cc8a0f5993cd654f0635f2da1
    lines_read: [1, 50]
    tier: B
  - path: components/timeline/DopeSheetCanvas.tsx
    blob_sha: 8d0c6270f706a238d450335df0e517afae1dba6c
    lines_read: [1, 50]
    tier: B
  - path: components/timeline/AudioStrip.tsx
    blob_sha: e708b5d59ae8ab0b6a8c0a6be59899858782cea3
    lines_read: [1, 30]
    tier: B
  - path: components/timeline/TrackRow.tsx
    blob_sha: 419a045980bf0a5697d9baf927987c3897cbda10
    lines_read: [1, 30]
    tier: B
  - path: components/timeline/TimelineRuler.tsx
    blob_sha: 4198e7a45d0bb537ba4f8756e7a93f6e6c0bcc0a
    lines_read: [0, 0]
    tier: B
  - path: components/viewport/CompositionOverlay.tsx
    blob_sha: 2cba262359e202ef9d71571484be122886249c66
    lines_read: [1, 40]
    tier: B
  - path: docs/engine/05_Shared_UI.md
    blob_sha: 7d5782a5dcee2ff57e08c66ce326b1426aa97549
    lines_read: [1, 205]
    tier: reference
---

## Public API surface

### Tier A primitives + composites
- `Slider.tsx:331` — `default export Slider` (animation-aware + reset marker); also `RawDraggableNumber:50`, `DraggableNumber:178`, `BaseSlider:116`, re-exports `formatDisplay` from `./inputs:25`.
- `Knob.tsx:167` — connected `Knob`; pure `RawKnob:23`. Reads `handleInteractionStart/End` via two granular `useEngineStore` selectors (`Knob.tsx:175-176`) — note this is direct store, not the StoreCallbacksContext used by Slider.
- `AutoFeaturePanel.tsx:83` — main DDFS panel renderer. Exports `buildLogMapping:58` (canonical log-slider mapping). Props at `:30-52` include `whitelistParams`, `excludeParams`, `forcedState`, `onChangeOverride`, `pendingChanges`, `liftChildrenOf`, `variant: 'default' | 'dense'`.
- `CompilableFeatureSection.tsx:41` — DDFS section with compile/runtime split; `CompilablePanelConfig` partial override props at `:18`. Two modes documented at `:25-39`. `CompileBar` internal at `:325`.
- `registry/ComponentRegistry.tsx:23-47` — `class ComponentRegistry` with `register/get/has/ids` and singleton `componentRegistry:47`. `FeatureComponentProps:8`. Component type widened to `React.ComponentType<any>` (`:21`) to avoid 28 cast sites.
- `contexts/StoreCallbacksContext.tsx:16-20` — `StoreCallbacksContext`, `StoreCallbacksProvider`, `useStoreCallbacks()`. NOOP fallback at `:10-14`. Surface: `handleInteractionStart`, `handleInteractionEnd`, `openContextMenu`.

### Tier B subdir roles
- `components/inputs/` (`index.ts:1-19`) — unified scalar input layer. `ScalarInput` (the canonical full primitive), `DraggableNumber` primitive, `useDragValue`/`useEditMode` hooks, `ValueMapping`/`piMapping`/`linearMapping`/`createLogMapping`/`getMapping`/`formatDisplay` (`primitives/FormatUtils`). Types include `ScalarInputProps`/`DraggableNumberProps`/`CustomMapping`/`AxisConfig` + `AXIS_CONFIG`.
- `components/vector-input/` (`index.tsx:1-450`) — animation-connected `Vector2Input`/`Vector3Input`/`Vector4Input` wrappers around `BaseVectorInput`. Each wires `useAnimationStore` recording + keyframe-status detection + `KeyframeButton` header-right. Re-exports `BaseVectorInput`, `VectorAxisCell`, `DualAxisPad`, `RotationHeliotrope`.
- `components/gradient/` — single file `GradientContextMenu.tsx`; portal-based context menu with `LazyGradientPreview` (IntersectionObserver-gated preview).
- `components/graph/` — animation curve editor: `GraphCanvas` (two-canvas back+overlay paint with currentFrame excluded from back deps), `GraphSidebar` (track list + live values), `GraphToolbar` (fit/normalize/bake/smooth/simplify), `GraphSelectionBBox` (scale/translate handles).
- `components/inputs/hooks/` — `useDragValue`, `useEditMode` (drag-to-scrub + text-edit toggle for `DraggableNumber`).
- `components/inputs/primitives/` — `DraggableNumber` primitive + `FormatUtils.ts` (mappings, percent compute, display formatting).
- `components/layout/` — `Dock` (left/right panel container, tabs, drag-reorder; all granular `useEngineStore` selectors per comment at `Dock.tsx:23-30`) + `DropZones` (drop-target overlays during panel drag).
- `components/panels/` — only nested `panels/engine/EngineFeatureRow.tsx` (dense-mode row used by `AutoFeaturePanel.tsx:227` when `variant === 'dense'`). No barrel.
- `components/timeline/` — keyframe UI: `DopeSheet` + canvas-overlay `DopeSheetCanvas` (single canvas paints all rows), `TrackRow`, `TrackGroup`, `KeyframeContextMenu`, `KeyframeInspector`, `SelectionTransformBar`, `TimeNavigator`, `TimelineRuler`, `TimelineToolbar`, `AudioStrip` (waveform + clip drag), `exportHelpers.ts` + `exportModulations.ts`.
- `components/topbar/` — empty directory (no files).
- `components/vector-input/` — see above.
- `components/viewport/` — single file `CompositionOverlay.tsx` (rule-of-thirds / golden / spiral / safe-area overlays driven by store state).

## Architecture (10-25 bullets)

- The slider stack is layered: `Slider:default` (animation-aware) → `BaseSlider:116` (pure full slider) → `RawDraggableNumber:50` (pure drag) → all delegating to `ScalarInput` from `components/inputs` (`Slider.tsx:66,146,292`). `BaseSlider` and `Slider` both pass unmapped `min`/`max` to `ScalarInput` to avoid a "double-mapping bug" called out at `Slider.tsx:142-144,289-291`.
- `Slider.tsx:215` consumes `useTrackAnimation(trackId, value, label)` (a hook outside `components/`) and `useStoreCallbacks()` (`:214`) — animation + interaction-start/end and global context menu are *not* hardcoded into the primitive, they're hook/context-injected. This is the closest existing thing to the doc's "opt-in context" pattern.
- `Knob.tsx:167-189` is split into pure `RawKnob` + connected `Knob`, but the connected wrapper imports `useEngineStore` directly (`Knob.tsx:3,175-176`) instead of going through `StoreCallbacksContext` — inconsistent with `Slider.tsx`. The block comment at `Knob.tsx:168-177` explains why selectors are granular (avoid full-store subscription cascade in fluid-toy).
- `AutoFeaturePanel.tsx:83` is *the* DDFS renderer: for a given `featureId`, reads `featureRegistry`, slice state (or `forcedState`), `liveModulations`, then walks `feature.params` rendering one of: ToggleSwitch, Dropdown (if `config.options`), Knob (if `config.ui === 'knob'`), Slider (default float/int), Vector2/3/4Input, SmallColorPicker/EmbeddedColorPicker, AdvancedGradientEditor (`React.lazy` at `:19`), image-file upload tile, or `EngineFeatureRow` (dense variant).
- Composed-vec params: `config.composeFrom` (e.g. `[xKey, yKey, zKey]`) assembles a THREE.Vector* from scalar slice fields (`AutoFeaturePanel.tsx:217-223`) and decomposes back into scalar setter updates (`:123-131`). The decomposition runs **before** the override-route fork so compose works inside `CompilableFeatureSection` — explicit bug-fix note at `:114-122`.
- The handler routing at `AutoFeaturePanel.tsx:109-166` has four layers: (1) decompose composed params → (2) if `onChangeOverride` provided, defer to caller (used by `CompilableFeatureSection` and engine-panel-pending UI); (3) if `config.onUpdate === 'compile'` and no override, redirect by `movePanel('Engine','left')` + `FractalEvents.emit('engine_queue', ...)`; (4) confirmation gate; (5) batched setter call.
- `dynamicConfig(sliceState)` (`AutoFeaturePanel.tsx:207-210`) lets a param recompute its config (label/min/max/etc.) from current slice state per render. `dynamicVisible` (`:462`) does the same for visibility. `dynamicMaxRef` (`:356-359`) reads another param's value as the effective max.
- Condition gating: `checkParamActive(config.condition, sliceState, globalState, config.parentId)` (`AutoFeaturePanel.tsx:460`) and `config.isAdvanced && !advancedMode` (`:463`) prune the tree. `config.helpId` is surfaced via `data-help-id` (`:492`) for the right-click help menu.
- Parent/child nesting: any param with `parentId === id` becomes a nested child of its parent's `renderNode` (`:465-466`), rendered inside a bracketed-children layout at `:506-519`. `customUI` entries with matching `parentId` are appended (`:468-474`). When parent is rendered elsewhere (e.g. as section header), `liftChildrenOf` opts the children back to root (`:534`, `:660`).
- Layout adjacency: `config.layout === 'half'` pairs two consecutive half-width params into a flex row (`AutoFeaturePanel.tsx:557-564`). Knob has its own half/full container at `:349`.
- Collapsible groups: `feature.groups` + `groupConfigs[id].collapsible` (`AutoFeaturePanel.tsx:580-649`) build a per-group `CollapsibleSection` whose body is `buildFlatItems(groupedParams[id])`. `groupFilter` prop renders one group only and surfaces its `helpId` on the outer wrapper (`:670-673`).
- Vector animation binding: `deriveTrackBinding({ featureId, paramKey, axes, composeFrom })` returns `{ trackKeys, trackLabels }` per-axis (`AutoFeaturePanel.tsx:383,392,402`); scalar branch uses empty `axes` (`:364`). Live values pulled from `liveModulations` via `readLiveVec` (`:384,393,403`).
- `CompilableFeatureSection.tsx:41-312` is two-mode (`:25-40`): hybrid (runtime toggle + compile gate) vs compile-only. `isOn` priority chain at `:107-111`: pending toggle > runtime uniform > compile gate. `needsCompile` at `:117` triggers `CompileBar` rendering.
- Override-vs-default config resolution at `CompilableFeatureSection.tsx:64-73`: PanelRouter forwards every field including `undefined`, which would clobber `panelConfig` if spread directly. Strips undefineds — explicit bug-fix note at `:54-63`.
- The `CompilableFeatureSection`'s `handleCompile:180-193` flips compile + runtime-toggle params **atomically in one setter call** to avoid the in-between state where uniform is on but shader is unbuilt. `handleUnload:200-207` flips both off.
- Compile-settings sub-section: a separate inner `AutoFeaturePanel` with `whitelistParams={compileSettingsParams}`, `forcedState={mergedState}` (which forces compile/runtime toggles to true so child conditions evaluate), and `onChangeOverride={handleCompileParamChange}` (`:271-277`). `mergedState` rebuilt via memo at `:122-128`.
- Runtime body: same `AutoFeaturePanel` again but `excludeParams=fullExclude` (compile param + runtime toggle + explicit excludes + compile-settings params; `:233-239`) and `liftChildrenOf={runtimeToggleParam}` so children of the runtime toggle (rendered in the header) appear inside the body.
- `ComponentRegistry` is a single global singleton (`registry/ComponentRegistry.tsx:47`) with no namespacing or per-app instances. Used by `AutoFeaturePanel.tsx:472,663,14` to resolve `customUI` `componentId` entries, and (per inline note `:49-52`) is also where `features/ui.tsx`-style code registers bespoke panels (StateLibrary, FormulaSelect, …) with arbitrary prop shapes — hence the widened `React.ComponentType<any>`.
- `StoreCallbacksContext` exists as one of only two files in `components/contexts/`. NOOP default callbacks (`:10-14`) make a primitive that uses `useStoreCallbacks()` safe to drop into a tree without a provider — interactions just no-op (no key-binding to undo, no global context menu). Surface is minimal: only interaction-start/end + openContextMenu.
- The two architecturally connected patterns (StoreCallbacksContext + ComponentRegistry) are the engine's nascent "opt-in context" + "feature → component lookup" layers; no `AnimationContext` / `UndoContext` / `ShortcutContext` / `FeatureCompileContext` exist as React contexts — those capabilities are baked into hooks (`useTrackAnimation`) or direct `useEngineStore` calls (`useAnimationStore` in `vector-input/index.tsx:33-37`).
- Dense `variant` (`AutoFeaturePanel.tsx:227-268`) is a separate code path that renders rows via `panels/engine/EngineFeatureRow` instead of full primitives — used by the Engine Panel showing pending vs synced compile state.
- `confirming` overlay (`AutoFeaturePanel.tsx:683-699`) is an in-panel Cancel/Confirm modal that fires when `config.confirmation` is set and the user is enabling a boolean — gates destructive toggles.
- Animation-recording vector inputs (`vector-input/index.tsx:42-69` etc.) snapshot + `addTrack` per axis on drag start and `addKeyframe` on drag end. `KeyframeButton` status uses dirty-detection: `keyed-dirty` if value diverged from the keyframe under playhead, `partial`/`dirty` if track exists but no key at current frame (`:76-111`).
- All connected components doing high-frequency interaction (Knob, Dock, DropZones, Vector*Input) use granular `useEngineStore((s) => s.field)` selectors with a comment block citing the "fluid-toy max-depth guard" cascade (`Knob.tsx:168-177`, `Dock.tsx:23-30`, `DropZones.tsx:7-9`, `vector-input/index.tsx:29-37`). This is a project-wide convention.

## Invariants and gotchas

- **No primitive is store-pure today.** `Slider.tsx`, `Knob.tsx`, `Vector*Input`, and `Dock`/`DropZones` all `useEngineStore` directly. `Slider` partially goes through `StoreCallbacksContext` but still imports `useTrackAnimation` (which itself reads the store) at `Slider.tsx:5`.
- **Slider's `Slider` default export silently degrades** when `trackId` is absent — `useTrackAnimation(undefined, ...)` returns `status: 'none'` and no-op `toggleKey`. Safe to use without animation but doesn't make the dependency obvious.
- **Composed-param decomposition runs before `onChangeOverride`.** Important for `CompilableFeatureSection` containing vec3 sliders — explicit bug-fix comment at `AutoFeaturePanel.tsx:114-122` references "Local Rotation sliders don't move anything" regression.
- **`buildLogMapping` is exported from `AutoFeaturePanel.tsx:58`** for hand-rolled sliders, but a *second* `getMapping` exists in `components/inputs/primitives/FormatUtils` (re-exported via `inputs/index.ts:8`) — they aren't the same. AutoFeaturePanel's local `getMapping:69` is a switch-on-`scale` wrapper that calls `buildLogMapping`.
- **`compileSettingsParams` are auto-stripped from runtime body.** If a feature both declares compile settings AND wants them visible in the runtime panel, you'd get them removed by `fullExclude` (`CompilableFeatureSection.tsx:237`).
- **`ComponentRegistry.register` warns but overwrites** (`:27-30`) — last-registered wins. Plugin load order matters; no namespacing.
- **`StoreCallbacksContext` NOOP fallback** means missing provider is silent. A `<Slider>` outside `StoreCallbacksProvider` works but undo/contextmenu integration vanishes with no warning.
- **`componentRegistry` is a module-level singleton** — no cleanup, no per-app instance, no test isolation. Re-renders/HMR can hit the overwrite-warn path.
- **`onUpdate: 'compile'` default route is hardcoded** to `movePanel('Engine','left')` + `engine_queue` event (`AutoFeaturePanel.tsx:147-153`). This couples DDFS to a specific panel id ("Engine") — not pluggable.
- **`forcedState` only flows through props** — child `AutoFeaturePanel` instances inside `CompilableFeatureSection` get `forcedState={mergedState}` but their `globalStateRef` still reads live store state (`:96-98`) for condition evaluation. Mismatch possible if compile settings depend on each other.
- **`React.lazy(AdvancedGradientEditor)`** at `AutoFeaturePanel.tsx:19` is per-import and may cause flash-of-nothing on first gradient param render; `Suspense fallback={null}` at `:445`.
- **`components/topbar/`** is an empty directory — probably a placeholder.

## Drift from existing doc (dev/docs/engine/05_Shared_UI.md)

The doc presents an *aspirational* opt-in-context primitive library; the actual codebase is mid-migration with a single `StoreCallbacksContext` and direct-store imports everywhere else.

| Doc claim | Actual code | File:line |
|---|---|---|
| "Primitives are engine-level, pure, and shared across apps" (doc:3) | Slider/Knob/Vector* all import `useEngineStore`/`useAnimationStore`/`useTrackAnimation` directly | `Slider.tsx:5`, `Knob.tsx:3,175-176`, `vector-input/index.tsx:4,5` |
| "A primitive must not import the store" (doc:5) | Knob does (`useEngineStore`), Dock does, Vector*Input does, AutoFeaturePanel does | `Knob.tsx:3`, `Dock.tsx:2`, `vector-input/index.tsx:4`, `AutoFeaturePanel.tsx:4` |
| `<Slider>` consults `AnimationContext`, `UndoContext` (doc:13) | Slider uses `StoreCallbacksContext` (only `openContextMenu`/`handleInteraction*`) + `useTrackAnimation` hook directly. No `AnimationContext` / `UndoContext` React contexts exist | `Slider.tsx:2,5`; `components/contexts/` contains only `StoreCallbacksContext.tsx` |
| `<ColorPicker>` listed as primitive (doc:20) | Code has `SmallColorPicker` and `EmbeddedColorPicker` (no unified `ColorPicker`) | `components/SmallColorPicker.tsx`, `components/EmbeddedColorPicker.tsx` (per AutoFeaturePanel imports `:7-8`) |
| `<TabBar>` primitive (doc:18) | Code has `TabStrip.tsx` (different name) | `components/TabStrip.tsx` |
| `<ContextMenu>` primitive consuming `ContextMenuContext` (doc:28) | Code has `GlobalContextMenu.tsx` reached via `openContextMenu` callback on `StoreCallbacksContext`; no `ContextMenuContext` exists | `components/GlobalContextMenu.tsx`, `StoreCallbacksContext.tsx:7` |
| "Each capability has a dedicated context" with `AnimationProvider`/`UndoProvider`/`ContextMenuProvider`/`ShortcutProvider`/`FeatureCompileContext` (doc:43-90) | Only `StoreCallbacksProvider` exists; the other four are not implemented anywhere in `components/contexts/` | `components/contexts/` directory listing (1 file) |
| `<AutoFeaturePanel>` "Iterates a feature's params, renders the appropriate primitive per type" (doc:33) | Accurate, but doc omits: `whitelistParams`, `excludeParams`, `forcedState`/`onChangeOverride` (used by CompilableFeatureSection + Engine Panel), `liftChildrenOf` (parent-toggle-in-header pattern), `variant: 'dense'`, `dynamicConfig`/`dynamicVisible`/`dynamicMaxRef`, `composeFrom` decomposition, confirmation modal | `AutoFeaturePanel.tsx:30-52,114-131,683-699` |
| `<CompilableFeatureSection>` "compile-vs-runtime param split UI" via `FeatureCompileContext` (doc:25,88) | Component reads `feature.panelConfig` directly via `featureRegistry`; no React context involved. Two modes (hybrid vs compile-only) and `pendingToggle` buffering not documented | `CompilableFeatureSection.tsx:43-44,94-117` |
| `useFeatureParam(featureId, paramId)` "canonical binding hook" (doc:144-158) | No such hook exists. AutoFeaturePanel reads slice state via `useEngineStore(state => (state as any)[featureId])` (`:89`) and reads global state imperatively via `getState()` (`:96-98`) | grep for `useFeatureParam` returns nothing in `components/` |
| `componentRegistry.register('my-panel', X)` (doc:124-127) | Accurate. Singleton at `registry/ComponentRegistry.tsx:47`. Doc omits the type widening to `ComponentType<any>` and the rationale (28 cast sites) at `:21` | `registry/ComponentRegistry.tsx:21,47` |
| "if a feature's referenced componentId doesn't exist… warns once in dev" (doc:129-130) | Actual `componentRegistry.get` returns `undefined`; AutoFeaturePanel silently skips when `Component` is falsy (`:472-473`, `:663-664`). No warn-once. Note `register()` warns on **overwrite**, not on missing lookup | `registry/ComponentRegistry.tsx:27-30,33-34`; `AutoFeaturePanel.tsx:472,663` |
| Viewport overlays "registered by features, rendered by `<ViewportArea>`" (doc:132-142) | Not audited in this iteration; `components/viewport/` contains only `CompositionOverlay.tsx` which reads from store directly, not from a viewport registry | `components/viewport/CompositionOverlay.tsx:18-21` |
| `<Histogram>` primitive (doc:27) | `components/Histogram.tsx` exists but it imports the store; treat as connected-not-primitive (not Tier-A-read, flagged for orphan sweep) | `components/Histogram.tsx` |
| "Audit gate: grep every primitive for `useEngineStore` / `useFractalStore`" (doc:198) | Such an audit would fail today for Slider, Knob, every Vector*Input, Dock, DropZones, Histogram, EngineFeatureRow (via DraggableNumber→Slider), AutoFeaturePanel | multiple |

**Recommendation: rewrite.** The doc describes a target architecture that doesn't match the implementation. Either (a) recast the doc as a migration roadmap with current state vs target state explicit, or (b) document the actual `StoreCallbacksContext` + DDFS pattern (panelConfig, composeFrom, dynamic*, liftChildrenOf) and treat the multi-context vision as a separate forward-looking note. The current doc will mislead anyone writing a new primitive.

## Open questions

- The mismatch between Slider (uses `StoreCallbacksContext`) and Knob (uses `useEngineStore` directly) — is the intent to migrate Knob to the same context? If so, what stops it from being a one-line fix today?
- Should `AutoFeaturePanel`'s `onUpdate: 'compile'` default route be configurable per app (currently hardcoded `movePanel('Engine','left')` + `FractalEvents.emit('engine_queue', ...)`)?
- `components/topbar/` is empty — was content moved elsewhere or never built?

Orphan-sweep candidate: components/Histogram.tsx — listed as primitive in 05_Shared_UI.md:27 but not in Tier A claim list; need to confirm whether to genericize or strip.
Orphan-sweep candidate: components/HistogramProbe.tsx — companion to Histogram; same disposition.
Orphan-sweep candidate: components/PerformanceMonitor.tsx — UI primitive not claimed by any tier or doc section.
Orphan-sweep candidate: components/StateDebugger.tsx — dev-only debug UI; confirm it should live in engine vs app layer.
Orphan-sweep candidate: components/StateLibraryPanel.tsx — referenced by ComponentRegistry comment (`:50-52`) but not in any doc section.
Orphan-sweep candidate: components/MobileControls.tsx — see docs/engine/17_Mobile_Layout.md; verify ownership.
Orphan-sweep candidate: components/HelpBrowser.tsx — help system surface; not part of shared-UI claim list.
Orphan-sweep candidate: components/LoadingScreen.tsx — app chrome; confirm shared-UI vs app-shell layer.
Orphan-sweep candidate: components/ViewportArea.tsx — referenced by 05_Shared_UI.md:140 as the viewport-overlay host but living at the top level, not under `viewport/`.
Orphan-sweep candidate: components/CategoryPickerMenu.tsx, components/InteractionPicker.tsx, components/ParameterSelector.tsx — selector widgets; verify each belongs in shared-UI vs app-specific.
Orphan-sweep candidate: components/topbar/ — empty directory; delete or fill.
Orphan-sweep candidate: components/Timeline.tsx + components/TimelineHost.tsx at top level vs `components/timeline/` subdir — confirm intended split (host wrapper vs panel content).
Orphan-sweep candidate: components/CompositionOverlayControls.tsx (top-level) vs components/viewport/CompositionOverlay.tsx — control panel vs render overlay split; verify intentional.
Orphan-sweep candidate: components/Histogram.tsx, components/Hint.tsx, components/StatusDot.tsx, components/DotToggle.tsx, components/SectionLabel.tsx, components/CollapsibleSection.tsx — small leaf primitives; ensure they're either documented in 05_Shared_UI.md or marked app-internal.
