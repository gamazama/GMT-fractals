---
source: components/AutoFeaturePanel.tsx
lines: 1-702
last_verified_sha: 858f268982da1b084af7c97f66b2acc99e59a4c2
additional_sources:
  - components/Slider.tsx
  - components/Knob.tsx
  - components/CompilableFeatureSection.tsx
  - components/registry/ComponentRegistry.tsx
  - components/contexts/StoreCallbacksContext.tsx
  - components/inputs/index.ts
  - components/inputs/types.ts
  - components/inputs/ScalarInput.tsx
  - components/inputs/primitives/DraggableNumber.tsx
  - components/inputs/primitives/FormatUtils.ts
  - components/inputs/hooks/useDragValue.ts
  - components/inputs/hooks/useEditMode.ts
  - components/vector-input/index.tsx
  - components/vector-input/types.ts
  - components/vector-input/BaseVectorInput.tsx
  - components/vector-input/VectorAxisCell.tsx
  - components/vector-input/DualAxisPad.tsx
  - components/vector-input/RotationHeliotrope.tsx
  - components/gradient/GradientContextMenu.tsx
  - components/graph/GraphCanvas.tsx
  - components/graph/GraphSidebar.tsx
  - components/graph/GraphToolbar.tsx
  - components/graph/GraphSelectionBBox.tsx
  - components/layout/Dock.tsx
  - components/layout/DropZones.tsx
  - components/panels/engine/EngineFeatureRow.tsx
  - components/timeline/DopeSheet.tsx
  - components/timeline/DopeSheetCanvas.tsx
  - components/timeline/TrackRow.tsx
  - components/timeline/AudioStrip.tsx
  - components/timeline/TimelineRuler.tsx
  - components/timeline/TimelineToolbar.tsx
  - components/timeline/KeyframeInspector.tsx
  - components/timeline/KeyframeContextMenu.tsx
  - components/timeline/SelectionTransformBar.tsx
  - components/timeline/TimeNavigator.tsx
  - components/timeline/TrackGroup.tsx
  - components/timeline/exportHelpers.ts
  - components/timeline/exportModulations.ts
  - components/viewport/CompositionOverlay.tsx
  - docs/engine/05_Shared_UI.md
audited: 2026-05-20T09:09:37Z
audited_by: claude-opus-4-7
public_api:
  - AutoFeaturePanel
  - buildLogMapping
  - default
  - BaseSlider
  - DraggableNumber
  - RawDraggableNumber
  - formatDisplay
  - Knob
  - RawKnob
  - CompilableFeatureSection
  - componentRegistry
  - ComponentRegistry
  - FeatureComponentProps
  - StoreCallbacksProvider
  - useStoreCallbacks
  - StoreCallbacks
  - ScalarInput
  - ScalarInputProps
  - DraggableNumberProps
  - CustomMapping
  - AXIS_CONFIG
  - getMapping
  - piMapping
  - linearMapping
  - createLogMapping
  - useDragValue
  - useEditMode
  - Vector2Input
  - Vector3Input
  - Vector4Input
  - BaseVectorInput
  - BaseVectorInputProps
  - VectorAxisCell
  - DualAxisPad
  - RotationHeliotrope
  - EngineFeatureRow
  - EngineStatus
  - Dock
  - DropZones
  - CompositionOverlay
  - GraphCanvas
  - GraphSidebar
  - GraphToolbar
  - GraphSelectionBBox
depends_on:
  - e01-feature-system
  - e03-animation
  - e08-shortcuts-undo
  - e10-engine-features
---

# Shared UI

Reusable React primitives and small composite components that sit between the DDFS feature registry and the actual store-bound app shells. The headline primitive is `AutoFeaturePanel` (`components/AutoFeaturePanel.tsx:83`) — the renderer that walks a feature's `params` and emits the right input control for every type. Most of the rest is a layered scalar/vector input stack (`Slider` / `Knob` / `Vector*Input` → `ScalarInput` → `DraggableNumber`), plus a few connected utilities (`Dock`, `DropZones`, `CompositionOverlay`) and the timeline/graph subtrees.

This subsystem is **mid-migration** away from direct `useEngineStore` imports inside primitives. Today only `Slider` consumes `StoreCallbacksContext` (`components/Slider.tsx:2,214`); `Knob`, `Vector*Input`, `Dock`, `DropZones`, and `AutoFeaturePanel` itself still import the store directly. See the Invariants section.

## Public API

### Top-level primitives (`components/`)

| File | Exports | Purpose |
|------|---------|---------|
| `components/AutoFeaturePanel.tsx` | `AutoFeaturePanel` (`components/AutoFeaturePanel.tsx:83`), `buildLogMapping` (`components/AutoFeaturePanel.tsx:58`) | DDFS panel renderer. Reads `feature.params` and emits ToggleSwitch / Dropdown / Knob / Slider / Vector{2,3,4}Input / SmallColorPicker / EmbeddedColorPicker / `AdvancedGradientEditor` (lazy at `components/AutoFeaturePanel.tsx:19`) / image upload / `EngineFeatureRow`. |
| `components/Slider.tsx` | `default` (animation-aware `Slider` at `components/Slider.tsx:205`), `BaseSlider` (`components/Slider.tsx:116`), `RawDraggableNumber` (`components/Slider.tsx:50`), `DraggableNumber` (`components/Slider.tsx:178`), `formatDisplay` re-export (`components/Slider.tsx:25`) | Layered float/int slider stack. All four delegate to `ScalarInput`. |
| `components/Knob.tsx` | `Knob` (`components/Knob.tsx:167`), `RawKnob` (`components/Knob.tsx:23`) | Rotary input — pure `RawKnob` paints the arc; connected `Knob` wraps it with interaction-start/end via two granular store selectors. |
| `components/CompilableFeatureSection.tsx` | `CompilableFeatureSection` (`components/CompilableFeatureSection.tsx:41`) | DDFS section with compile-vs-runtime param split. Two sub-modes (hybrid + compile-only) documented in the file header (`components/CompilableFeatureSection.tsx:25-39`). |

### Registry + context (`components/registry/`, `components/contexts/`)

| File | Exports | Purpose |
|------|---------|---------|
| `components/registry/ComponentRegistry.tsx` | `componentRegistry` singleton (`components/registry/ComponentRegistry.tsx:47`), `ComponentRegistry` class (`components/registry/ComponentRegistry.tsx:23`), `FeatureComponentProps` (`components/registry/ComponentRegistry.tsx:8`) | Global id → React component map. `register/get/has/ids`. Stores `React.ComponentType<any>` to avoid 28 cast sites — rationale at `components/registry/ComponentRegistry.tsx:15-21`. |
| `components/contexts/StoreCallbacksContext.tsx` | `StoreCallbacksProvider` (`components/contexts/StoreCallbacksContext.tsx:18`), `useStoreCallbacks` (`components/contexts/StoreCallbacksContext.tsx:20`), `StoreCallbacks` (`components/contexts/StoreCallbacksContext.tsx:4`) | The only React context in the engine UI today. Surface: `handleInteractionStart`, `handleInteractionEnd`, `openContextMenu` (`components/contexts/StoreCallbacksContext.tsx:4-8`). NOOP fallback at `components/contexts/StoreCallbacksContext.tsx:10-14`. |

### Unified scalar input stack (`components/inputs/`)

| File | Exports | Purpose |
|------|---------|---------|
| `components/inputs/index.ts` | Barrel: `ScalarInput`, `DraggableNumber`, `formatDisplay`, `piMapping`, `linearMapping`, `createLogMapping`, `getMapping`, `ValueMapping`, `useDragValue`, `useEditMode`, `ScalarInputProps`, `DraggableNumberProps`, `AxisConfig`, `CustomMapping`, `AXIS_CONFIG` (`components/inputs/index.ts:1-18`) | Public entry to the unified scalar input layer. |
| `components/inputs/ScalarInput.tsx` | `ScalarInput` (`components/inputs/ScalarInput.tsx:18`) | The canonical full-featured single-value primitive used by both `Slider` and `VectorAxisCell`. Handles label/header/track/live-indicator/default-marker/drag (`components/inputs/ScalarInput.tsx:62-100`). |
| `components/inputs/types.ts` | `ScalarInputProps` (`components/inputs/types.ts:59`), `DraggableNumberProps` (`components/inputs/types.ts:11`), `CustomMapping` (`components/inputs/types.ts:218`), `AxisConfig` (`components/inputs/types.ts:152`), `AXIS_CONFIG` (`components/inputs/types.ts:161`) | Prop + axis-config types. `AXIS_CONFIG` is duplicated in `components/vector-input/types.ts:13` — both are referenced by code. |
| `components/inputs/primitives/DraggableNumber.tsx` | `DraggableNumber` primitive | Pointer-drag number editor used by ScalarInput. |
| `components/inputs/primitives/FormatUtils.ts` | `formatDisplay`, `piMapping`, `linearMapping`, `createLogMapping`, `getMapping`, `computePercentage`, `ValueMapping` type | Display/parse helpers + the canonical mapping definitions consumed by `ScalarInput`. |
| `components/inputs/hooks/useDragValue.ts` | `useDragValue` | Drag-to-scrub state + handlers used by `DraggableNumber`. |
| `components/inputs/hooks/useEditMode.ts` | `useEditMode` | Click-to-enter-text-edit toggle for `DraggableNumber`. |

### Vector input stack (`components/vector-input/`)

| File | Exports | Purpose |
|------|---------|---------|
| `components/vector-input/index.tsx` | `Vector2Input` (`components/vector-input/index.tsx:21`), `Vector3Input` (`components/vector-input/index.tsx:166`), `Vector4Input` (`components/vector-input/index.tsx:310`); re-exports `BaseVectorInput`, `VectorAxisCell`, `DualAxisPad`, `RotationHeliotrope`, all of `./types` (`components/vector-input/index.tsx:445-449`) | Animation-connected vec2/3/4 inputs. Each wires `useAnimationStore` recording + `KeyframeButton` status detection. |
| `components/vector-input/types.ts` | `BaseVectorInputProps` (`components/vector-input/types.ts:59`), `VectorAxisCellProps`, `DualAxisPadProps`, `ConnectedVectorInputProps`, `AXIS_CONFIG` (`components/vector-input/types.ts:13`) | Local prop types. Note the second `AXIS_CONFIG` here vs `components/inputs/types.ts:161` — both ship. |
| `components/vector-input/BaseVectorInput.tsx` | `BaseVectorInput` (`components/vector-input/BaseVectorInput.tsx:43`) | Pure vector input — axis cells, optional dual-axis pads, rotation gizmo. |
| `components/vector-input/VectorAxisCell.tsx` | `VectorAxisCell` (`components/vector-input/VectorAxisCell.tsx:12`) | One axis row inside `BaseVectorInput`. Wraps `ScalarInput`. |
| `components/vector-input/DualAxisPad.tsx` | `DualAxisPad` (`components/vector-input/DualAxisPad.tsx:5`) | 2D drag pad for mixing two axes simultaneously. |
| `components/vector-input/RotationHeliotrope.tsx` | `RotationHeliotrope` (`components/vector-input/RotationHeliotrope.tsx:27`), default export (`components/vector-input/RotationHeliotrope.tsx:443`) | 3D-axis rotation gizmo visualisation for vec3 rotation inputs. |

### Layout / panels / viewport / gradient

| File | Exports | Purpose |
|------|---------|---------|
| `components/layout/Dock.tsx` | `Dock` (`components/layout/Dock.tsx:23`) | Left/right dock container — tabs, drag-reorder, collapsed mode. Uses granular `useEngineStore` selectors throughout (`components/layout/Dock.tsx:32-47`). |
| `components/layout/DropZones.tsx` | `DropZones` (`components/layout/DropZones.tsx:5`) | Drop-target overlays during panel drag. Granular selectors at `components/layout/DropZones.tsx:9-17`. |
| `components/panels/engine/EngineFeatureRow.tsx` | `EngineFeatureRow` (`components/panels/engine/EngineFeatureRow.tsx:26`), `EngineStatus` type (`components/panels/engine/EngineFeatureRow.tsx:6`), `EngineFeatureRowProps` (`components/panels/engine/EngineFeatureRow.tsx:8`) | Dense row used by `AutoFeaturePanel` when `variant === 'dense'` (`components/AutoFeaturePanel.tsx:227`). |
| `components/viewport/CompositionOverlay.tsx` | `CompositionOverlay` (`components/viewport/CompositionOverlay.tsx:18`), default re-export (`components/viewport/CompositionOverlay.tsx:316`) | Rule-of-thirds / golden / spiral / safe-area SVG overlay. Reads `compositionOverlay` + `compositionOverlaySettings` from the store (`components/viewport/CompositionOverlay.tsx:19-20`). |
| `components/gradient/GradientContextMenu.tsx` | `ContextMenu` (`components/gradient/GradientContextMenu.tsx:43`), default re-export (`components/gradient/GradientContextMenu.tsx:136`) | Portal-based gradient-stop context menu with `LazyGradientPreview` (`components/gradient/GradientContextMenu.tsx:19`) using an `IntersectionObserver` to defer the gradient swatch paint. |

### Animation curve editor (`components/graph/`)

| File | Exports | Purpose |
|------|---------|---------|
| `components/graph/GraphCanvas.tsx` | `GraphCanvas` (`components/graph/GraphCanvas.tsx:44`) | Two-canvas back+overlay curve renderer. `currentFrame` is intentionally excluded from the back-canvas dep list — see file. |
| `components/graph/GraphSidebar.tsx` | `GraphSidebar` (`components/graph/GraphSidebar.tsx:39`) | Track list + live-value column for the curve editor. |
| `components/graph/GraphToolbar.tsx` | `GraphToolbar` (`components/graph/GraphToolbar.tsx:94`) | Fit / normalize / bake / smooth / simplify buttons. |
| `components/graph/GraphSelectionBBox.tsx` | `GraphSelectionBBox` (`components/graph/GraphSelectionBBox.tsx:49`) | Scale / translate handles around a selected key-range. |

### Timeline (`components/timeline/`)

| File | Purpose |
|------|---------|
| `components/timeline/DopeSheet.tsx` | Dope-sheet panel composing rows, ruler, group headers, audio strip, selection-transform bar (`components/timeline/DopeSheet.tsx:1-20`). |
| `components/timeline/DopeSheetCanvas.tsx` | Single-canvas painter for every keyframe row (single canvas paints all rows, picking is done by the renderer module). |
| `components/timeline/TrackRow.tsx`, `components/timeline/TrackGroup.tsx` | One animation track row / collapsible group. |
| `components/timeline/TimelineRuler.tsx`, `components/timeline/TimeNavigator.tsx`, `components/timeline/TimelineToolbar.tsx` | Frame ruler + scrubber + tool bar (zoom, snap, fps). |
| `components/timeline/KeyframeContextMenu.tsx`, `components/timeline/KeyframeInspector.tsx`, `components/timeline/SelectionTransformBar.tsx` | Keyframe right-click menu, detail inspector, multi-select transform handles. |
| `components/timeline/AudioStrip.tsx` | Waveform + clip-drag strip for audio tracks. |
| `components/timeline/exportHelpers.ts`, `components/timeline/exportModulations.ts` | Helpers consumed by the video/modulation export paths. |

### What is NOT in this subsystem

Aspirational items that the docs-existing `docs/engine/05_Shared_UI.md` lists but the code does not ship: `AnimationContext`, `UndoContext`, `ContextMenuContext`, `ShortcutContext`, `FeatureCompileContext` providers, and the `useFeatureParam(featureId, paramId)` hook. `components/contexts/` contains exactly one file today (`components/contexts/StoreCallbacksContext.tsx`). See followup q-088 for the partial-migration status (full path: `plans/doc-audit-state/survey/_followups/q-088.md`).

## Architecture

- **Slider layering.** `Slider` default (`components/Slider.tsx:205`) is animation-aware; `BaseSlider` (`components/Slider.tsx:116`) is the pure full slider; `RawDraggableNumber` (`components/Slider.tsx:50`) is the pure drag-only number. All three delegate to `ScalarInput` (`components/inputs/ScalarInput.tsx:18`) via the `'full'` / `'minimal'` variant (`components/Slider.tsx:76`, `components/Slider.tsx:160`, `components/Slider.tsx:307`). `BaseSlider` and `Slider` pass *unmapped* `min`/`max` to `ScalarInput` — explicit "double-mapping bug" fix noted at `components/Slider.tsx:142-144` and `components/Slider.tsx:289-291`.

- **Connected vs raw split.** Every pure primitive has a connected sibling that adds undo / interaction-start / context-menu glue. `Slider` consumes those via `useStoreCallbacks()` (`components/Slider.tsx:214`); `Knob` consumes the same two callbacks via direct granular store selectors (`components/Knob.tsx:175-176`) and has a block comment justifying that choice (`components/Knob.tsx:168-177`). This inconsistency is a live migration item — see followup q-088 (`plans/doc-audit-state/survey/_followups/q-088.md:21-25`).

- **`AutoFeaturePanel` is the DDFS UI renderer.** Given `featureId`, it reads the feature from `featureRegistry` (`components/AutoFeaturePanel.tsx:3,87`), pulls the slice state (or `forcedState` when supplied by a parent), reads `liveModulations`, then walks `feature.params` and emits the right primitive per `config.type` (`components/AutoFeaturePanel.tsx:204-454`). Renderable types: `color` (`components/AutoFeaturePanel.tsx:270`), `boolean` (`components/AutoFeaturePanel.tsx:285`), `float`/`int` (`components/AutoFeaturePanel.tsx:309`) with `options` → Dropdown or `ui === 'knob'` → Knob (`components/AutoFeaturePanel.tsx:349`), `vec2`/`vec3`/`vec4` (`components/AutoFeaturePanel.tsx:380-405`), `image` (`components/AutoFeaturePanel.tsx:407`), `gradient` (`components/AutoFeaturePanel.tsx:442`).

- **Composed-vec params.** A param with `config.composeFrom = [xKey, yKey, zKey?]` assembles a `THREE.Vector*` from individual scalar slice fields on read (`components/AutoFeaturePanel.tsx:217-223`) and decomposes back to scalar updates on write (`components/AutoFeaturePanel.tsx:123-131`). Decomposition runs **before** the override-route fork so compose works inside `CompilableFeatureSection` — bug-fix comment at `components/AutoFeaturePanel.tsx:114-122` ("Local Rotation sliders don't move anything" regression).

- **Update routing in `handleUpdate`.** Four ordered layers at `components/AutoFeaturePanel.tsx:109-166`: (1) decompose composed param to scalar updates; (2) if `onChangeOverride` is provided defer to caller for each scalar (used by `components/CompilableFeatureSection.tsx:275` and the engine pending-changes UI); (3) if `config.onUpdate === 'compile'` and no override, imperatively `movePanel('Engine', 'left')` + emit `engine_queue` on `FractalEvents` after a 50 ms delay (`components/AutoFeaturePanel.tsx:147-153`); (4) confirmation gate via `config.confirmation` (`components/AutoFeaturePanel.tsx:156-159`); (5) batched setter call (`components/AutoFeaturePanel.tsx:164`).

- **Dynamic config / visibility / max-ref.** `config.dynamicConfig(sliceState)` recomputes per-render label/min/max overrides (`components/AutoFeaturePanel.tsx:207-210`); `config.dynamicVisible(sliceState)` prunes the tree (`components/AutoFeaturePanel.tsx:462`); `config.dynamicMaxRef` resolves to another param's value for the effective max (`components/AutoFeaturePanel.tsx:356-359`). Condition gating uses `checkParamActive(config.condition, sliceState, globalState, config.parentId)` (`components/AutoFeaturePanel.tsx:460`), and `config.isAdvanced && !advancedMode` prunes advanced controls (`components/AutoFeaturePanel.tsx:463`).

- **Parent / child nesting.** Any param whose `parentId === id` becomes a nested child of `id`'s renderNode (`components/AutoFeaturePanel.tsx:465-466`) and is rendered inside a bracketed-children layout (`components/AutoFeaturePanel.tsx:506-519`). Matching `customUI` entries are appended (`components/AutoFeaturePanel.tsx:468-474`). When the parent toggle is rendered outside the panel body (typically as a section header), the `liftChildrenOf` prop opts the children back to root (`components/AutoFeaturePanel.tsx:534`, `components/AutoFeaturePanel.tsx:660`).

- **Layout adjacency.** Two consecutive `config.layout === 'half'` params pair into one flex row (`components/AutoFeaturePanel.tsx:557-564`).

- **Collapsible groups.** When `feature.groups[id].collapsible` is true and the panel is not group-filtered, `buildFlatItems(groupedParams[id])` is wrapped in `CollapsibleSection` (`components/AutoFeaturePanel.tsx:580-649`). `groupFilter` mode renders one group only and surfaces its `helpId` on the outer wrapper (`components/AutoFeaturePanel.tsx:670-673`).

- **Vector animation binding.** `deriveTrackBinding({ featureId, paramKey, axes, composeFrom })` returns `{ trackKeys, trackLabels }` per axis (`components/AutoFeaturePanel.tsx:383`, `components/AutoFeaturePanel.tsx:392`, `components/AutoFeaturePanel.tsx:402`); the scalar branch uses an empty `axes` (`components/AutoFeaturePanel.tsx:364`). Live values come from `liveModulations` via `readLiveVec` (`components/AutoFeaturePanel.tsx:384`, `components/AutoFeaturePanel.tsx:393`, `components/AutoFeaturePanel.tsx:403`).

- **Dense variant.** `variant === 'dense'` routes booleans + numerics through `EngineFeatureRow` (`components/AutoFeaturePanel.tsx:227-268`) instead of full primitives. Status is derived as `pending`/`synced` from `pendingChanges` when `config.onUpdate === 'compile'` (`components/AutoFeaturePanel.tsx:230-233`).

- **Confirmation modal.** `config.confirmation` produces a Cancel/Confirm overlay rendered absolute-positioned over the panel body (`components/AutoFeaturePanel.tsx:683-699`); the modal stays in-panel rather than escalating to a global dialog.

- **`CompilableFeatureSection` two modes.** Mode A "hybrid": `runtimeToggleParam` flips a uniform instantly when the feature is already compiled (`components/CompilableFeatureSection.tsx:132-137`); a separate `compileParam` controls inclusion in the shader, with `CompileBar` (`components/CompilableFeatureSection.tsx:325`) prompting the user. Mode B "compile-only" (no runtime toggle): the header toggle buffers `pendingToggle` (`components/CompilableFeatureSection.tsx:94`, `components/CompilableFeatureSection.tsx:138-148`) and the user must click Compile to apply.

- **`isOn` priority.** `pendingToggle` wins, then runtime uniform, then compile gate (`components/CompilableFeatureSection.tsx:107-111`). `needsCompile` triggers the CompileBar render (`components/CompilableFeatureSection.tsx:117`).

- **Override-vs-default config resolution.** `PanelRouter` forwards every PanelItem field including `undefined`, which would clobber the feature's own `panelConfig` if spread directly. `CompilableFeatureSection` strips undefineds before merging — bug-fix comment at `components/CompilableFeatureSection.tsx:54-72`.

- **Atomic compile flip.** `handleCompile` writes `{compileParam: true, runtimeToggleParam: true}` in **one** setter call (`components/CompilableFeatureSection.tsx:180-193`) so a first-time enable can't land in the "uniform on, shader unbuilt" intermediate state. `handleUnload` flips both off in one call (`components/CompilableFeatureSection.tsx:200-207`).

- **Compile-settings sub-section.** Inner `AutoFeaturePanel` with `whitelistParams={compileSettingsParams}`, `forcedState={mergedState}` (forces both gates to true so child conditions evaluate), and `onChangeOverride={handleCompileParamChange}` (`components/CompilableFeatureSection.tsx:271-277`). `mergedState` memo at `components/CompilableFeatureSection.tsx:122-128`.

- **Runtime body.** Same `AutoFeaturePanel` again but with `excludeParams=fullExclude` (compile param + runtime toggle + explicit excludes + compile-settings params; `components/CompilableFeatureSection.tsx:233-239`) and `liftChildrenOf={runtimeToggleParam}` so children of the runtime toggle (rendered in the section header) appear inside the body.

- **`componentRegistry` is a global singleton.** Created at module load (`components/registry/ComponentRegistry.tsx:47`); `register` warns then overwrites (`components/registry/ComponentRegistry.tsx:27-30`); `get` returns `undefined` for unknown ids (`components/registry/ComponentRegistry.tsx:33`). Used by `AutoFeaturePanel` for `customUI` resolution (`components/AutoFeaturePanel.tsx:472`, `components/AutoFeaturePanel.tsx:663`). The widened `React.ComponentType<any>` (`components/registry/ComponentRegistry.tsx:21`) is intentional — bespoke panels (StateLibrary, FormulaSelect) register with arbitrary prop shapes alongside DDFS feature components.

- **`StoreCallbacksContext` minimal surface.** Three callbacks only (`components/contexts/StoreCallbacksContext.tsx:4-8`); the NOOP fallback (`components/contexts/StoreCallbacksContext.tsx:10-14`) means primitives drop into a tree without a provider and silently lose undo / context-menu integration.

- **Granular-selector convention.** Every connected component doing high-frequency interaction reads only the specific store fields it needs, with a comment citing the fluid-toy max-depth-guard cascade: `Knob` (`components/Knob.tsx:168-177`), `Dock` (`components/layout/Dock.tsx:24-31`), `DropZones` (`components/layout/DropZones.tsx:6-8`), `Vector2Input` / `Vector3Input` / `Vector4Input` (`components/vector-input/index.tsx:27-37`). `AutoFeaturePanel` also reads global state imperatively via `useEngineStore.getState()` for condition evaluation to avoid a full-store subscription (`components/AutoFeaturePanel.tsx:95-98`).

- **Vector animation recording.** `Vector2Input` snapshots + `addTrack` per axis on drag start (`components/vector-input/index.tsx:43-55`) and `addKeyframe` per axis on drag end (`components/vector-input/index.tsx:57-68`). `KeyframeButton` status uses dirty-detection: `keyed-dirty` if value diverged from the keyframe under playhead, `dirty`/`partial` if the track exists but no key at current frame (`components/vector-input/index.tsx:76-111`).

## Invariants

- **No primitive is store-pure today.** `Slider.tsx`, `Knob.tsx`, every `Vector*Input`, `Dock`, `DropZones`, and `AutoFeaturePanel` all read `useEngineStore` (or `useAnimationStore`) directly. The "primitives must not import the store" rule from `docs/engine/05_Shared_UI.md:5` is aspirational — see Historical context.

- **`Slider` silently degrades without `trackId`.** `useTrackAnimation(undefined, ...)` (`components/Slider.tsx:215`) returns `status: 'none'` and a no-op toggle, so the slider works without animation wiring but with no visible indication that the dependency exists.

- **Composed-param decomposition must run before `onChangeOverride`.** The bug-fix comment at `components/AutoFeaturePanel.tsx:114-122` exists because skipping decomposition on the override path broke "Local Rotation" vec3 sliders inside `CompilableFeatureSection`. Don't move the decomposition below the override fork.

- **`buildLogMapping` is exported from `AutoFeaturePanel.tsx` for hand-rolled sliders** (`components/AutoFeaturePanel.tsx:58`). A separate `getMapping` lives in `components/inputs/primitives/FormatUtils.ts` (re-exported via `components/inputs/index.ts:8`). The local `getMapping` in `components/AutoFeaturePanel.tsx:69` is a switch-on-`scale` wrapper that *calls* `buildLogMapping`. The two `getMapping` names are not the same function.

- **`compileSettingsParams` are auto-stripped from runtime body.** A feature that wants the same param visible in both compile-settings and runtime panels will see it filtered out of runtime by `fullExclude` (`components/CompilableFeatureSection.tsx:233-239`).

- **`ComponentRegistry.register` warns but overwrites** (`components/registry/ComponentRegistry.tsx:27-30`). Last-registered wins. Plugin load order matters; there is no namespacing.

- **`StoreCallbacksContext` missing provider is silent.** The NOOP fallback (`components/contexts/StoreCallbacksContext.tsx:10-14`) means a `<Slider>` rendered outside `StoreCallbacksProvider` still works, but undo + context-menu integration vanish without warning.

- **`componentRegistry` is a module-level singleton.** No cleanup, no per-app instances, no test isolation (`components/registry/ComponentRegistry.tsx:47`). HMR can hit the overwrite-warn path during dev re-renders.

- **`onUpdate: 'compile'` default route is hardcoded to the GMT app.** `useEngineStore.getState().movePanel('Engine', 'left')` + `FractalEvents.emit('engine_queue', ...)` at `components/AutoFeaturePanel.tsx:147-153`. Both `'Engine'` and `'engine_queue'` are GMT-app concepts; non-GMT hosts (`fluid-toy`, `fractal-toy`, `demo`) would silently break their layout. The 50 ms `setTimeout` is racing EnginePanel mount. See followup q-089 (full path: `plans/doc-audit-state/survey/_followups/q-089.md`).

- **`forcedState` flows through props only.** Child `AutoFeaturePanel` instances inside `CompilableFeatureSection` get `forcedState={mergedState}` (`components/CompilableFeatureSection.tsx:274`), but their `globalStateRef` still reads live store state for condition evaluation (`components/AutoFeaturePanel.tsx:96-98`). Compile-settings params that depend on each other can mismatch.

- **`React.lazy(AdvancedGradientEditor)` is per-import** (`components/AutoFeaturePanel.tsx:19`). First gradient-param render may flash because `Suspense fallback={null}` at `components/AutoFeaturePanel.tsx:445`.

- **`components/topbar/` is empty.** The directory is present but contains no files; assume placeholder.

- **`AXIS_CONFIG` is duplicated.** Defined in both `components/inputs/types.ts:161` and `components/vector-input/types.ts:13`. Both definitions are exported and imported by different consumers — keep them in sync.

## Interactions with other subsystems

- **e01-feature-system** — `AutoFeaturePanel` imports `featureRegistry`, `ParamConfig`, `ParamCondition`, `CustomUIConfig`, `GroupConfig` from `engine/FeatureSystem` (`components/AutoFeaturePanel.tsx:3`). `CompilableFeatureSection` imports `featureRegistry`, `CompilablePanelConfig` (`components/CompilableFeatureSection.tsx:3`). The entire DDFS contract — `params`, `customUI`, `groups`, `panelConfig`, `onUpdate: 'compile'` — flows in from this subsystem.

- **e03-animation** — `Slider` imports `useTrackAnimation` (`components/Slider.tsx:5`). `Vector{2,3,4}Input` import `useAnimationStore` and `evaluateTrackValue` (`components/vector-input/index.tsx:5,10`). `AutoFeaturePanel` consumes `deriveTrackBinding` + `readLiveVec` from `engine/animation/trackBinding` (`components/AutoFeaturePanel.tsx:27`) for per-axis track ids and live values. `KeyframeButton` status logic mirrors `useTrackAnimation` semantics across both connected sliders and vector inputs.

- **e08-shortcuts-undo** — `Slider`, `Knob`, and `Vector*Input` call `handleInteractionStart('param')` / `handleInteractionEnd()` on drag boundaries (`components/Slider.tsx:249,255`; `components/Knob.tsx:182,186`; `components/vector-input/index.tsx:44,67`). These pair with the per-scope undo transaction system. `Slider`'s right-click "Reset to Default" bracket also goes through these (`components/Slider.tsx:231-235`).

- **e10-engine-features** — `EngineFeatureRow` is the dense renderer used by the GMT Engine Panel pending-changes UI (`components/panels/engine/EngineFeatureRow.tsx:26`); the same panel listens for `'engine_queue'` events emitted by `components/AutoFeaturePanel.tsx:150` (per followup q-089).

- **Help / context-menu plumbing** — `Slider` and `AutoFeaturePanel` call `collectHelpIds(e.currentTarget)` (`components/Slider.tsx:4,239`; `components/AutoFeaturePanel.tsx:13,189`) and `openContextMenu` (via either `StoreCallbacksContext` for `Slider` or direct store read for `AutoFeaturePanel` at `components/AutoFeaturePanel.tsx:101`). The `data-help-id` attribute set on every rendered control (`components/AutoFeaturePanel.tsx:492`) is what `collectHelpIds` walks. `types/help.ts` and `utils/helpUtils.ts` are unclaimed by any subsystem — see followup q-073 (`plans/doc-audit-state/survey/_followups/q-073.md:26-33`).

## Known issues / Phase 2 carry-in

- **Doc-rewrite (review-#4).** `docs/engine/05_Shared_UI.md` is largely aspirational — multiple primitives listed there don't exist as documented (`<ColorPicker>`, `<TabBar>`, `<ContextMenu>`, `<NumberInput>`, `<Hint>` with the documented contexts; `useFeatureParam`; `AnimationProvider`/`UndoProvider`/`ContextMenuProvider`/`ShortcutProvider`/`FeatureCompileContext`). Eleven orphan-sweep candidates were raised from `e13-shared-ui` alone — see Survey "Open questions" block at `plans/doc-audit-state/survey/e13-shared-ui.md:219-232`. Per the Phase 2 disposition this module doc supersedes for current API; the old doc is preserved for design rationale.

- **q-088 — `Knob` vs `Slider` context coupling.** `Knob`'s connected wrapper uses two granular `useEngineStore` selectors (`components/Knob.tsx:175-176`) while `Slider` uses `useStoreCallbacks()` (`components/Slider.tsx:214`). Followup q-088 (`plans/doc-audit-state/survey/_followups/q-088.md`) concludes the migration is a one-line swap once every host memoises `storeCallbacks` (verified for `fluid-toy/FluidToyApp.tsx:67-71`; the other three hosts should be re-checked) and the fluid-toy max-depth claim is re-tested empirically. Same migration applies to `Dock`, `DropZones`, and `Vector*Input` (the last reads `useAnimationStore`, so it needs either a context-surface expansion or remains direct).

- **q-089 — `onUpdate: 'compile'` default route hardcodes GMT.** `components/AutoFeaturePanel.tsx:146-153` imperatively calls `movePanel('Engine', 'left')` + `FractalEvents.emit('engine_queue', ...)`. Both names are GMT-app concepts; `engine-gmt/components/panels/EnginePanel.tsx` is the only listener today. Followup q-089 (`plans/doc-audit-state/survey/_followups/q-089.md`) recommends a `compileRouter` capability on the store, defaulted to GMT, overridable per app. Until a second app surfaces compile-mode params via `AutoFeaturePanel`, this is documentation work, not a refactor. The 50 ms `setTimeout` at `components/AutoFeaturePanel.tsx:148` is racing EnginePanel mount — it disappears once the route is a registered capability.

- **Pending followup q-090 (defensively skipped).** Carry-in for `e13-shared-ui` enumerates review-#4, q-088, q-089. The Phase 2 brief notes a pending q-090 was anticipated but no `q-090.md` exists in `plans/doc-audit-state/survey/_followups/`; treating as deferred and not relying on its content here. Re-check once authored.

- **Orphan-sweep candidates raised by the survey (unclaimed today).** From `plans/doc-audit-state/survey/e13-shared-ui.md:219-232`: `components/Histogram.tsx`, `components/HistogramProbe.tsx`, `components/PerformanceMonitor.tsx`, `components/StateDebugger.tsx`, `components/StateLibraryPanel.tsx`, `components/MobileControls.tsx`, `components/HelpBrowser.tsx`, `components/LoadingScreen.tsx`, `components/ViewportArea.tsx`, `components/CategoryPickerMenu.tsx`, `components/InteractionPicker.tsx`, `components/ParameterSelector.tsx`, `components/Timeline.tsx` + `components/TimelineHost.tsx` vs `components/timeline/` subdir, `components/CompositionOverlayControls.tsx` vs `components/viewport/CompositionOverlay.tsx`, `components/Histogram.tsx`/`Hint.tsx`/`StatusDot.tsx`/`DotToggle.tsx`/`SectionLabel.tsx`/`CollapsibleSection.tsx`, plus `utils/helpUtils.ts` + `types/help.ts` (per followup q-073, full path `plans/doc-audit-state/survey/_followups/q-073.md`), plus `hooks/useHelpContextMenu.ts` + `hooks/useGlobalContextMenu.ts`, plus the empty `components/topbar/` directory.

## Historical context

This doc supersedes `docs/engine/05_Shared_UI.md` for current API and invariants. The original is preserved for design rationale and aspirations:

> the opt-in context pattern itself as a target design (one capability per context, providers wrap subtrees, consumers gracefully degrade); the `AdvancedGradientEditor` litmus-test framing as the clearest test of the pure-primitive rule (`docs/engine/05_Shared_UI.md:92-103`); the OKLab rationale from the GMT session retrospective ("colors washing out" until OKLab was adopted; `docs/engine/05_Shared_UI.md:107-108`); the audit-gate aspiration that before 1.0 every primitive should be greppable as free of `useEngineStore` / `useFractalStore` imports (`docs/engine/05_Shared_UI.md:198`); and the long-term Tailwind→CSS-variables direction (on the table, not scheduled; `docs/engine/05_Shared_UI.md:168`).

Today only `StoreCallbacksContext` exists from the five aspirational contexts; `AdvancedGradientEditor` is lazy-loaded inside `AutoFeaturePanel` rather than registered as a top-level engine primitive; OKLab interpolation lives in `utils/colorUtils.ts` (consumed by gradient + animation interpolators) but is not enforced as the default at the primitive layer; the audit-gate would fail today for `Slider`, `Knob`, every `Vector*Input`, `Dock`, `DropZones`, `Histogram`, `EngineFeatureRow`, and `AutoFeaturePanel`. The migration roadmap implied by the original doc is real but partial — followup q-088 spells out the next concrete step (one-line `Knob` swap onto `StoreCallbacksContext` after host memoisation audit).
