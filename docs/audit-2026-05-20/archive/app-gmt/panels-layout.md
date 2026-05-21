---
source: engine-gmt/panels.ts
lines: 1-471
last_verified_sha: cbbbe7821652201674adad9ab2fbe653dba46a49
additional_sources:
  - engine-gmt/topbar.tsx
  - engine-gmt/topbar/AdaptiveResolution.tsx
  - engine-gmt/topbar/CenterHUD.tsx
  - engine-gmt/topbar/GmtBucketController.ts
  - engine-gmt/topbar/Logo.tsx
  - engine-gmt/topbar/ShareLinkButton.tsx
  - engine-gmt/topbar/ViewportQuality.tsx
  - engine-gmt/index.ts
  - engine-gmt/storeTypes.ts
audited: 2026-05-20T08:55:00Z
audited_by: claude-opus-4-7
public_api:
  - GmtPanels
  - registerGmtTopbar
  - GmtTopbarOptions
  - AdaptiveResolution
  - CenterHUD
  - GmtBucketController
  - GmtLogo
  - ShareLinkButton
  - copyShareLink
  - ShareLinkStatus
  - ViewportQuality
  - installGmtRenderer
  - gmtRenderer
  - InstallGmtRendererOptions
  - GmtRendererCanvas
  - GmtRendererTickDriver
  - getProxy
  - registerGmtFeatures
depends_on:
  - a01-boot-shell
  - e07-plugins-host
  - e13-shared-ui
  - e12-mobile-layout
  - e01-feature-system
  - g05-engine-gmt-features
---

# Panels + Topbar layout (engine-gmt)

The app-gmt shell hands its dock layout and topbar composition over to a single manifest array and a single registration function inside `engine-gmt/`. `engine-gmt/panels.ts:19` exports `GmtPanels: PanelManifest` — the 11-panel definition the engine `Dock` + `PanelRouter` consume. `engine-gmt/topbar.tsx:196` exports `registerGmtTopbar()` — a one-shot side-effect call that injects GMT's left-slot tools (logo, FPS, pause, quality, adaptive, PT toggle, render region, bucket render), the center-slot Light Studio HUD, and the right-slot Camera + System menus. Together these two modules carry GMT's entire chrome surface; the bespoke widgets they slot in live under `engine-gmt/topbar/`. The package's public API is re-exported through `engine-gmt/index.ts:24` so the app boot file only imports `@engine-gmt`.

## Public API

| Symbol | Source | Role |
|--------|--------|------|
| `GmtPanels` | `engine-gmt/panels.ts:19` | 11-panel `PanelManifest` (Graph, Formula, Scene, Light, Shader, Gradient, Quality, Audio, Drawing, Engine, Camera Manager) |
| `registerGmtTopbar` | `engine-gmt/topbar.tsx:196` | Side-effect: registers all GMT topbar items + Camera/System menus. Call AFTER `installTopBar`/`installMenu`/`installCamera`. |
| `GmtTopbarOptions` | `engine-gmt/topbar.tsx:184` | Optional callbacks: `openCameraManager`, `openFormulaWorkshop`, `resetCamera` |
| `AdaptiveResolution` | `engine-gmt/topbar/AdaptiveResolution.tsx:15` | Left-slot toggle for `quality.dynamicScaling`; surfaces Off/Auto/Locked/Always state |
| `CenterHUD` | `engine-gmt/topbar/CenterHUD.tsx:30` | Center-slot Light Studio (3-light collapsed / 8-light 3x3 expanded, shadow + gizmo toggles) |
| `GmtBucketController` | `engine-gmt/topbar/GmtBucketController.ts:18` | `BucketRenderController` impl that bridges the generic BucketRenderPanel to `WorkerProxy` and GMT preset serialization |
| `GmtLogo` | `engine-gmt/topbar/Logo.tsx:17` | Left-slot wordmark + click-to-rename project popover (name / author / version) |
| `ShareLinkButton` | `engine-gmt/topbar/ShareLinkButton.tsx:56` | Right-slot button copying a `#s=…` URL; flashes Copied / Long / N/A |
| `copyShareLink` | `engine-gmt/topbar/ShareLinkButton.tsx:25` | Awaitable helper returning `ShareLinkStatus` ('copied' \| 'long' \| 'na') |
| `ShareLinkStatus` | `engine-gmt/topbar/ShareLinkButton.tsx:13` | Status union for share-link feedback |
| `ViewportQuality` | `engine-gmt/topbar/ViewportQuality.tsx:22` | Quality preset / subsystem-tier dropdown; PT-aware editable controls (bounces, GI, NEE) |
| `installGmtRenderer`, `gmtRenderer`, `InstallGmtRendererOptions` | `engine-gmt/index.ts:24-28` | Re-exports from `renderer/install` (renderer install lives in g01) |
| `GmtRendererCanvas`, `GmtRendererTickDriver` | `engine-gmt/index.ts:30-31` | Re-exports the canvas + tick-driver components |
| `getProxy` | `engine-gmt/index.ts:35` | Re-export of the `WorkerProxy` singleton accessor |
| `registerGmtFeatures` | `engine-gmt/index.ts:42` | Re-export of `features/index.ts`'s `registerFeatures` (the 26 DDFS features) |

`engine-gmt/storeTypes.ts:39` adds no runtime exports — it `declare module`-augments the engine-core `FeatureStateMap` and `FeatureCustomActions` so the 18 GMT feature slices (coreMath, geometry, interlace, lighting, lightSpheres, ao, reflections, atmosphere, volumetric, materials, waterPlane, coloring, texturing, quality, droste, optics, navigation, drawing) typecheck on the shared store (`engine-gmt/storeTypes.ts:42-61`). It must be imported once before the store is constructed (`engine-gmt/storeTypes.ts:17`).

## Architecture

- **Single manifest, no per-feature dock declarations.** `GmtPanels` is one literal array of `PanelDefinition`s; no panel state lives on individual features. The engine's `Dock` and `PanelRouter` read it via `applyPanelManifest` (see `docs/engine/14_Panel_Manifest.md:1`). One feature can appear in multiple panels — Coloring shows in both Gradient and Scene, Geometry shows four times in Formula as separate compilables (`engine-gmt/panels.ts:51-109`).
- **`items: [...]` everywhere — the `features:` shorthand is unused.** GMT's panels declare composition with explicit `items` arrays. The shorthand still exists on `PanelDefinition` and sibling apps (fluid-toy, fractal-toy) use it, but every GMT panel needs at least one of `groupFilter` / `whitelistParams` / `compilable` / accordion section / conditional sub-block, none of which the shorthand can express (`engine-gmt/panels.ts:139-411`).
- **Eleven panels, two docks plus one hidden-left dock.** Nine on `right` — Graph (order 1, Modular-only), Formula (10), Scene (20), Light (30, advanced), Shader (40), Gradient (50), Quality (60), Audio (70, audio-enabled-only), Drawing (80, drawing-enabled-only). One on `left` — Engine (10, dev-only). One more `left` — Camera Manager (20) labelled "View Manager" in the UI; the left dock surfaces on demand (`engine-gmt/panels.ts:19-470`).
- **Three compilable section variants.** `compilable` wraps a feature in `<CompilableFeatureSection>` with optional `compileParam` + `runtimeToggleParam` + `compileSettingsParams` (e.g. Shadows at `engine-gmt/panels.ts:221-230`). `compile-dropdown` is compile-only with no gate (Distance Estimator at `engine-gmt/panels.ts:117-123`). `runtime-section` is a header toggle backed by a runtime param (Julia / Offset at `engine-gmt/panels.ts:51-76`). All three route through the central CompileBar so toggling never leaks into the Engine panel.
- **Predicates carry visibility.** `showIf` accepts either a dotted-path string or `(state) => boolean`. Examples: `'advancedMode'` (engine-gmt/panels.ts:210, 449), `'audio.isEnabled'` (engine-gmt/panels.ts:424), `'drawing.enabled'` (engine-gmt/panels.ts:434), `(s) => s.formula === 'Modular'` for the Graph panel (`engine-gmt/panels.ts:28`), and a juliaType lookup against the FractalRegistry for the Julia section (`engine-gmt/panels.ts:58-63`).
- **`labelFn` lets sections rename dynamically.** Julia/Offset's label resolves from the current formula's (or interlace partner's) `juliaType` via a callback rather than a static string (`engine-gmt/panels.ts:64-75`).
- **Bespoke components escape the manifest entirely.** Five panels (Graph, Audio, Drawing, Engine, Camera Manager) declare `component:` and skip `items`. The string IDs resolve via `componentRegistry` lookups registered from `engine-gmt/features/ui.tsx:162-176` (`panel-drawing`, `panel-engine`, `panel-cameramanager`, `panel-graph`; `panel-audio` is registered alongside).
- **Topbar mirrors gmt-0.8.5's RenderTools layout.** Left slot: Logo → div → FPS → Pause → div → ViewportQuality → AdaptiveResolution → PT toggle → PlayingBadge → RenderRegion → BucketRender (`engine-gmt/topbar.tsx:230-240`). Center slot: CenterHUDWrapper (`engine-gmt/topbar.tsx:249-254`). Right slot: ShareLinkButton → SlotToast → Camera menu (order 29) → System menu (order 30) (`engine-gmt/topbar.tsx:257-280, 351-359`).
- **`registerGmtTopbar` unregisters engine-core defaults and reuses them in the left slot.** It expects the app to have called `installTopBar({ hideDefaults })` so the default project-name / FPS / adaptive items don't double up (`engine-gmt/topbar.tsx:227-229`). FPS and PauseControls are then re-registered in the left slot at orders 2-3 (`engine-gmt/topbar.tsx:232-233`).
- **Camera menu wires the saved-camera state library.** "Reset Position" calls the registered `resetCamera` callback (default: read `defaultPreset` from the formula registry — `engine-gmt/topbar.tsx:200-222`). "View Manager" calls `openCameraManager` (default logs `'[gmt] Camera Manager panel not registered yet'` — `engine-gmt/topbar.tsx:198`). Nine Slot 1..9 items click-to-recall when filled, click-to-save when empty, marked with ✓ when occupied (`engine-gmt/topbar.tsx:329-348`).
- **System menu opens with a fixed prefix then auto-populates from the feature registry.** Static head: Open Fluid Toy, separator, Formula Workshop, Hardware Settings, separator (`engine-gmt/topbar.tsx:363-388`). Mobile surrogates: a Quality section, a custom MobileQualityMenuItem grid, a "Reduce Quality on Touch" toggle, a separator — all gated by `isMobileSnapshot()` (`engine-gmt/topbar.tsx:391-428`). Dynamic body: every feature with a `menuConfig` becomes a toggle (`engine-gmt/topbar.tsx:435-455`); every feature with `menuItems[]` flattens to per-item toggles (`engine-gmt/topbar.tsx:460-478`). Static tail: Invert Y, Hide Interface, Advanced Mode, advanced-only Engine Config Panel + Mesh Export + UI Layout (`engine-gmt/topbar.tsx:483-577`).
- **Two distinct topbar uses for the mobile-layout API.** `desktopOnly = () => !isMobileSnapshot()` (a non-reactive `getState()` read — `engine-gmt/topbar.tsx:47`) gates menu / topbar `when:` predicates. Inside the React tree, `CenterHUDWrapper` uses the `useMobileLayout()` hook so re-render reactivity is preserved (`engine-gmt/topbar.tsx:245-247`).
- **`ViewportQuality` stages changes in a local "pending" bag until Apply.** Preset selection, per-subsystem tier overrides, and PT compile-time params (ptNEEAllLights / ptEnvNEE) are written into `pendingSubsystems` / `pendingPTCompile`; runtime params (ptBounces, ptGIStrength) push through `setLighting` instantly (`engine-gmt/topbar/ViewportQuality.tsx:50-100`). The popover closes on outside click and the staged bag is cleared (`engine-gmt/topbar/ViewportQuality.tsx:72-83`).
- **`AdaptiveResolution` displays four mutually exclusive states.** Off (dynamicScaling false), Auto (active + cursor over canvas), Always (active + cursor off canvas, amber), Locked (active + accumulationCount ≥ 8, green) — the Locked label tells the user the accumulator has converged and further reduction won't apply (`engine-gmt/topbar/AdaptiveResolution.tsx:32-49`).
- **`GmtBucketController` is the only GMT-aware seam in the BucketRender flow.** It implements the generic `BucketRenderController` interface but injects GMT-specific export metadata (`preset`, `name`, `version`) only when `exportImage=true` (`engine-gmt/topbar/GmtBucketController.ts:21-35`). Preview-region and stop calls pass through to `WorkerProxy` unchanged.
- **`CenterHUD` owns the per-light hover/popup choreography.** Local state — `hoveredLight`, `activeMenuIndex`, `isExpanded`, `menuBridge` — plus four ref-based timeouts implement a 700 ms transparent "bridge" portal after a context menu closes so the popup survives the mouse traverse (`engine-gmt/topbar/CenterHUD.tsx:40-48, 56-73`). A 600 ms hover-leave timeout extends popup lifetime while the mouse moves toward it. The companion dock panel `LightPanelControls` does **not** share this state — it uses a single tab-selection int and reads/writes `state.lighting` directly (see followup q-006).
- **`activeLightPopup` is a module-mutable singleton that bridges the topbar to the viewport gizmo.** `CenterHUD` writes its hovered/active index into both `activeLightPopup.index` (from `engine-gmt/features/lighting/utils/GizmoMath`) and `state.openLightPopupIndex` so the gizmo range-circle and tutorial trigger can subscribe without a per-frame React render (`engine-gmt/topbar/CenterHUD.tsx:76-81`).
- **`ShareLinkButton` returns a 3-state result.** `copyShareLink()` produces `'copied' | 'long' | 'na'`. URL > 4096 chars triggers an animation-stripping fallback; imported / Workshop formulas (those not in the FractalRegistry) short-circuit to `'na'` without touching the clipboard (`engine-gmt/topbar/ShareLinkButton.tsx:25-45`).
- **`GmtLogo` doubles as the project-rename popover.** Clicking the project-name subtitle opens a Popover with editable name / author / version inputs that write through `setProjectSettings` (`engine-gmt/topbar/Logo.tsx:50-110`).
- **`storeTypes.ts` is purely type-side.** Importing it once before the store boot lets `useEngineStore((s) => s.optics)` etc. typecheck across verbatim-ported GMT code without any runtime cost (`engine-gmt/storeTypes.ts:10-17`). `LightingActions` is the only feature shipping a `FeatureCustomActions` augmentation today (`engine-gmt/storeTypes.ts:40`).

## Invariants

- **Panel `order` is logical, not DOM-positional.** Dock sorts by it within a dock; ties between two panels at the same order are undefined. The numbers carry deliberate gaps (10/20/30…) so future inserts don't have to renumber.
- **Compile-spinner ownership lives at `engine-gmt/engine/CompileScheduler`, not in panel UI.** The compilable section components surface the scheduler's compile state — they must not emit their own optimistic "compiling…" flashes. See `docs/engine/14_Panel_Manifest.md:1` for the original contract and the migration notes that removed the UI-side emits.
- **`featureRegistry.getMenuFeatures()` / `getExtraMenuItems()` pre-filter by config presence.** Features that do not declare `menuConfig` are absent from the first iterator; features without `menuItems[]` contribute nothing to the second (see followup q-007 — `engine/FeatureSystem.ts:456-470`). The topbar adds no additional filter beyond the per-item `when:` predicate.
- **The Camera Manager panel's id and label diverge intentionally.** `id: 'Camera Manager'` is the canonical PanelId used by `cameraSlice` and `togglePanel` calls; `label: 'View Manager'` is the user-visible string everywhere (`engine-gmt/panels.ts:465-466`).
- **`engine-gmt/topbar.tsx:198` default `openCameraManager` callback fires only when the host app forgot to wire it.** The `panel-cameramanager` component itself **is** registered at `engine-gmt/features/ui.tsx:175` — the log message is misleading and should read "openCameraManager callback not wired by host app" (see followup q-005).
- **`engine-gmt/panels.ts:453-458` comment block is stale.** It describes the panel's previous `dock: 'float'` + `isCore: false` configuration; the actual entry uses `dock: 'left', order: 20`. The two comment blocks should be merged (see followup q-005).
- **Quality panel's `shadow_quality` removal is documented in-place.** The legacy entry's groupFilter never matched any params (the group did not exist on the feature def). The comment at `engine-gmt/panels.ts:384-386` records the move to Light panel as compilable.
- **Geometry feature reappears 4× in Formula panel.** Each compilable entry has its own `compileParam` / `runtimeToggleParam` / `runtimeGroup` and is independent — the feature id is shared but no state is implicitly multiplexed (`engine-gmt/panels.ts:51-109`).
- **PT-runtime vs PT-compile params take two distinct paths.** `ptBounces` / `ptGIStrength` push through `setLighting` instantly; `ptNEEAllLights` / `ptEnvNEE` stay in `pendingPTCompile` until Apply, then the compile pipeline rebuilds (`engine-gmt/topbar/ViewportQuality.tsx:36-42, 53, 98-100`).
- **`isMobileSnapshot()` is a non-reactive `getState()` read — only safe in `when:` callbacks.** TopBarHost re-evaluates predicates on every relevant store update, so reactivity comes from the host's subscription. Inside React render, use `useMobileLayout()` instead (`engine-gmt/topbar.tsx:44-47, 245-247`; see followup q-008).
- **`registerGmtTopbar` is a side-effect, not a component.** It must be called exactly once at boot, after the engine-core `installTopBar`/`installMenu`/`installCamera` plugins have installed their slots (`engine-gmt/topbar.tsx:1-13`).
- **Engine Config menu item also opens the Engine panel.** Toggling `engineSettings.showEngineTab` reveals the panel (showIf gate) *and* calls `togglePanel('Engine', true)` to surface the (hidden-by-default) left dock — symmetric with the View Manager flow (`engine-gmt/topbar.tsx:544-552`).

## Interactions with other subsystems

- **a01-boot-shell.** The boot script imports `GmtPanels` and feeds it to `applyPanelManifest`, then calls `registerGmtTopbar(...)` with the app's openCameraManager / openFormulaWorkshop / resetCamera callbacks. The shell's HelpExtras / LoadingScreen / renderDialogExtras are unrelated to this subsystem.
- **e07-plugins-host.** Consumes the `topbar` and `menu` plugins (`engine-gmt/topbar.tsx:17-18`); `registerGmtTopbar` calls `topbar.register` / `menu.register` / `menu.registerItem` to populate slots created by `installTopBar` / `installMenu` / `installCamera`. Also uses `installBucketRender` (`engine-gmt/topbar.tsx:34, 240`) which surfaces the bucket-render UI through engine-core's TopBar plugin.
- **e13-shared-ui.** `<CompilableFeatureSection>` (consumed by every `compilable` / `compile-dropdown` / `runtime-section` manifest entry) lives in engine-core's shared UI. `Popover`, `DraggableNumber`, `CheckIcon`, and the `componentRegistry` itself are all engine-core primitives.
- **e12-mobile-layout.** `useMobileLayout` (hook form) and `isMobileSnapshot` (predicate form) are both consumed; the resize listener + uiModePreference live in that subsystem.
- **e01-feature-system / g05-engine-gmt-features.** `featureRegistry.getMenuFeatures()` and `getExtraMenuItems()` drive the System menu's dynamic body. The 26 GMT features must already be registered (typically via `registerGmtFeatures()` at module load) for the menu to populate.
- **g01-renderer (worker proxy).** `getProxy()` is used by `AdaptiveResolution` (reads `accumulationCount` for the Locked state) and by `GmtBucketController` (delegates start/stop/preview-region calls).
- **g08-save-load-gmf.** Mesh Export menu item calls `saveGMFScene(getPreset())` and stashes the result in `localStorage` under `gmt-mesh-export-scene` before opening `mesh-export.html` (`engine-gmt/topbar.tsx:556-569`).
- **`engine-gmt/features/ui.tsx` (g05 territory).** Registers all bespoke panel components and inline manifest widgets the panel manifest references by string (`panel-graph`, `panel-engine`, `panel-cameramanager`, `panel-audio`, `panel-drawing`, `quality-render-controls`, `formula-params`, `light-panel-controls`, `lfo-list`, the gradient layer previews, etc. — `engine-gmt/features/ui.tsx:141-176`).
- **`engine-gmt/features/lighting`.** `CenterHUD` imports `LightOrb`, `LightSettingsPopup`, `ShadowSettingsPopup`, `getLightFromSlice`, `activeLightPopup`, `buildCoreLightMenuItems` from the lighting feature (`engine-gmt/topbar/CenterHUD.tsx:21-26`). The companion `LightPanelControls` widget (referenced by the Light panel manifest entry) does not share state with `CenterHUD` (followup q-006).

## Known issues / Phase 2 carry-in

- **Stale comment block at `engine-gmt/panels.ts:453-458`** describes a prior `dock: 'float'` + `isCore: false` config that no longer matches the actual entry (`dock: 'left', order: 20` at lines 464-470). Should be deleted or merged with the View Manager block at 459-463. (Source: followup q-005.)
- **Misleading log at `engine-gmt/topbar.tsx:198`** reads "Camera Manager panel not registered yet" but the panel component is registered at `engine-gmt/features/ui.tsx:175`. The fallback should say "openCameraManager callback not wired by host app" instead. (Source: followup q-005.)
- **`activeLightPopup` is an undocumented module-mutable singleton.** It bypasses the store specifically so per-frame gizmo reads don't trigger React re-renders. If a future "edit light from dock panel" interaction wants to drive the same gizmo highlight, `LightPanelControls` would need to write it too. (Source: followup q-006.)
- **Two shadow-popup surfaces.** `CenterHUD` opens a portal popup driven by `state.shadowPanelOpen`; `LightPanelControls` inlines `<AutoFeaturePanel featureId="lighting" groupFilter="shadows" />`. Two paths to the same params — neither is wrong but the divergence is worth knowing when editing shadow UI. (Source: followup q-006.)
- **No drift carry-in from `phase-2-carry-in.json`** — the subsystem entry is empty (`by_subsystem["a02-panels-layout"]` is `{}`); all five followups (q-004 through q-008) have been answered and folded into Architecture / Invariants / Interactions above.

## Historical context

- `docs/engine/14_Panel_Manifest.md` (still current, supplementary). Captures the full `PanelDefinition` type contract — including the `features: string[]` + `widgets: { before, after, between }` shorthand that GMT does not use — plus the four-path composition resolution order (`component` > `items` > `features`+`widgets` > empty), the compile-spinner ownership contract, and the migration deletions list (FeatureTabConfig fields removed, applyDefaultPanelLayout deleted, `featureRegistry.getTabs()` removed, PanelRouter hardcoded special-cases removed). Use it as the type reference; this module doc covers GMT's actual manifest pattern.
- The "GMT skips `features:` shorthand" question was answered in followup q-004 (`plans/doc-audit-state/survey/_followups/q-004.md`): consistency choice driven by every GMT panel needing at least one filter / compilable / accordion section the shorthand can't express. fluid-toy and fractal-toy use the shorthand for trivial single-feature panels. The shorthand is not deprecated.
- Phase 1 survey at `plans/doc-audit-state/survey/a02-panels-layout.md` listed six drift rows against the existing doc (all warn/info, no break-severity) — three around `features:` shorthand non-use and `widgets` object non-use, one confirming `showIf` predicate forms match, two confirming topbar / panel registration are separate plugins. The Phase 2 disposition (`plans/doc-audit-state/phase-2-disposition.json`) classified it as `minor-edits`: this new module doc covers GMT's actual usage; the old doc stays as the full PanelDefinition contract reference.
- The original (gmt-0.8.5) topbar layout the current `registerGmtTopbar` mirrors lived in `RenderTools.tsx` — see the comment block at `engine-gmt/topbar.tsx:1-13`. Same group order (Logo | div | FPS | Pause | div | Quality | Adaptive | PT | Region | Bucket), same right-side Camera + System menus.
