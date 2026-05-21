---
subsystem_id: a02-panels-layout
audited_at: 2026-05-19T20:00:00Z
files:
  - path: engine-gmt/panels.ts
    blob_sha: cbbbe7821652201674adad9ab2fbe653dba46a49
    lines_read: [1, 471]
  - path: engine-gmt/topbar.tsx
    blob_sha: e611ec5fde88b4f950e33cf6081f9287311229ff
    lines_read: [1, 644]
  - path: engine-gmt/topbar/AdaptiveResolution.tsx
    blob_sha: 43ce5dcda6ed5a5aa92cbc39f6ec50688d4783d5
    lines_read: [1, 61]
  - path: engine-gmt/topbar/CenterHUD.tsx
    blob_sha: 71a8c3bf7a94d6703e51542f89636f08c8cdb42e
    lines_read: [1, 354]
  - path: engine-gmt/topbar/GmtBucketController.ts
    blob_sha: 7331f7c6e47a6d6c14108d8af69d7be03a8cd771
    lines_read: [1, 58]
  - path: engine-gmt/topbar/Logo.tsx
    blob_sha: 7bc354c62e16385ab553e22fbc7df4535092eb4f
    lines_read: [1, 113]
  - path: engine-gmt/topbar/ShareLinkButton.tsx
    blob_sha: 1cb30c55c03e4bdfcca490ddfc894cb45df64ba7
    lines_read: [1, 99]
  - path: engine-gmt/topbar/ViewportQuality.tsx
    blob_sha: c51049183acf86262d29660367a3c824f77c1e83
    lines_read: [1, 322]
  - path: engine-gmt/index.ts
    blob_sha: c437ab5150833eab6d6bbb0f80ae6c2ba86966c5
    lines_read: [1, 52]
  - path: engine-gmt/storeTypes.ts
    blob_sha: 5229a09e6d44c3d7731b87bc6021d6a252a4a046
    lines_read: [1, 63]
---

## Public API surface

**panels.ts**
- `GmtPanels: PanelManifest` — array of 11 panel definitions (engine-gmt/panels.ts:19)

**topbar.tsx**
- `registerGmtTopbar(options?: GmtTopbarOptions): void` — topbar registration entry point (engine-gmt/topbar.tsx:196)
- `GmtTopbarOptions` interface — optional callbacks for CameraManager, FormulaWorkshop, resetCamera (engine-gmt/topbar.tsx:184-194)

**index.ts (public barrel)**
- `installGmtRenderer`, `gmtRenderer`, `InstallGmtRendererOptions` (engine-gmt/index.ts:24-28)
- `GmtRendererCanvas`, `GmtRendererTickDriver` (engine-gmt/index.ts:30-31)
- `getProxy()` from worker/WorkerProxy (engine-gmt/index.ts:35)
- `registerGmtFeatures()` (engine-gmt/index.ts:42)
- Feature state type exports (CoreMathState, GeometryState, ..., DebugToolsState) (engine-gmt/index.ts:45-51)

**storeTypes.ts**
- Zero direct exports; module-augmentation extends `FeatureStateMap` and `FeatureCustomActions` (engine-gmt/storeTypes.ts:39-62)

## Architecture (10-25 bullets)

- Panel manifest isolation: panels declared once at app level (engine-gmt/panels.ts:19), decoupling composition from individual features. GMT has ~26 features but only 11 panels (engine-gmt/panels.ts:1-14).
- 11 panels across two docks: nine on 'right' (Graph, Formula, Scene, Light, Shader, Gradient, Quality, Audio, Drawing), one on 'left' (Engine), one floating (Camera Manager) (engine-gmt/panels.ts:19-471).
- Manifest-driven composition via `items: [...]` arrays. Each item is one of: feature, widget, compilable, compile-dropdown, runtime-section, accordion, separator (engine-gmt/panels.ts:23-130, 138-412).
- `showIf` predicates control visibility: Graph only when formula='Modular' (engine-gmt/panels.ts:28), Light/Engine only in advancedMode (engine-gmt/panels.ts:210, 449), Audio/Drawing only when feature enabled (engine-gmt/panels.ts:424, 434).
- Three compilable section variants: `compilable` (boolean gate + optional compile-settings + runtime body), `compile-dropdown` (compile-only dropdowns, no gate), `runtime-section` (pure-runtime header toggle) (engine-gmt/panels.ts:82-109, 117-123, 52-76).
- Feature reuse across panels: Coloring appears in both Gradient and Scene; Geometry appears 4 times in Formula as separate compilables (Julia, LocalRotation, BurningMode, HybridBox), each with distinct compileParam/runtimeToggleParam/runtimeGroup (engine-gmt/panels.ts:43, 174, 81-109, 51-109).
- Bespoke widgets slotted via `type: 'widget'` items: 'formula-params' (engine-gmt/panels.ts:43), 'quality-render-controls' (engine-gmt/panels.ts:380), 'light-panel-controls' (engine-gmt/panels.ts:213).
- Accordion sections for collapsible groups: Gradient panel uses three sections (Layer 1, Layer 2, Noise) with conditional rendering and header widgets (engine-gmt/panels.ts:281-346).
- Topbar mirrors gmt-0.8.5 RenderTools layout: Left = Logo → FPS → Pause → Quality → Adaptive → PT → Badge → Region → Bucket; Center = Light Studio HUD; Right = Camera/System menus (engine-gmt/topbar.tsx:225-240, 242-254, 271-359).
- Feature-driven menu items: System menu auto-generates toggles from each feature's `menuConfig.toggleParam` and `menuItems[]` entries, gated by advancedOnly predicate (engine-gmt/topbar.tsx:435-478).
- Camera slot persistence via savedCameras state-library: nine menu items for slots 1-9, click recalls or saves depending on slot fullness, mirrors keyboard hotkeys 1-9 (engine-gmt/topbar.tsx:329-348).
- PT mode awareness: ViewportQuality.tsx surfaces editable PT controls (Max Bounces, GI Strength, NEE toggles) only when PT is active, dims direct-render subsystems (engine-gmt/topbar/ViewportQuality.tsx:234-297).
- Mobile menu surrogates: mobile hides desktop topbar items (Quality, Adaptive, Region, Bucket) behind System menu as `MobileQualityMenuItem` and mobile-specific toggles (engine-gmt/topbar.tsx:391-428).
- Topbar divider component: `TopBarDivider` (h-6 w-px bg-white/10 mx-1) inserted between logical groups in left slot, gated by `desktopOnly` predicate (engine-gmt/topbar.tsx:40-42, 231, 234).
- Center HUD light studio: CenterHUD.tsx registers as topbar center-slot component, 3-light collapsed view scales to 8-light 3x3 grid with context menus, drag-to-gizmo, shadow settings (engine-gmt/topbar/CenterHUD.tsx:1-16, 30-352).
- Bucket render controller bridges UI to worker: GmtBucketController implements BucketRenderController, wraps WorkerProxy to start/stop bucket renders, passes preset+name+version when exportImage=true (engine-gmt/topbar/GmtBucketController.ts:18-35).
- storeTypes.ts is a zero-runtime type bridge: declaration-merge adds 17 feature slices to FeatureStateMap; downstream code reads `store.optics` etc. with full TypeScript support (engine-gmt/storeTypes.ts:39-62).
- LightingActions interface merged into FeatureCustomActions; all 17 feature state types imported from their own feature modules and re-declared in the merged interface (engine-gmt/storeTypes.ts:37-40, 42-62).

## Invariants and gotchas

- Panel order numbers do not denote DOM position — they denote logical render order within each dock. Dock.tsx sorts by order; multiple panels with the same order have undefined tie-break.
- Formula panel's Julia section uses `labelFn`: header text switches between "Julia" and "Offset" based on formula's juliaType via callback, not static label (engine-gmt/panels.ts:64-75).
- Geometry feature appears 4 times in Formula panel as separate compilables (Julia gate, Local Rotation, Burning Mode, Hybrid Box). The feature ID is reused but each compilable item is independent (engine-gmt/panels.ts:51-109).
- Shadows split: compile+runtime controls live in Light panel (engine-gmt/panels.ts:222-230), while shadow_quality groupFilter in Quality panel is now a no-op (group never existed in feature def) (engine-gmt/panels.ts:384-386).
- CenterHUD vibration callback: optional, default `(ms) => navigator.vibrate?.(ms)`, can be overridden by apps via wrapper for custom haptic feedback (engine-gmt/topbar.tsx:246-248, engine-gmt/topbar/CenterHUD.tsx:30).
- Mobile menu items use `when: isMobileSnapshot()` custom predicate, while desktop uses `desktopOnly` (engine-gmt/topbar.tsx:391-423).
- ViewportQuality pending-state batching: subsystem tier changes stage in `pendingSubsystems` until Apply; pending shows as "Pending..." with amber highlight; clicking outside cancels (engine-gmt/topbar/ViewportQuality.tsx:49-135).
- PT params dual-pathway: ptBounces/ptGIStrength are runtime (instant via setLighting, no compile); ptNEEAllLights/ptEnvNEE are compile-time and batched until Apply (engine-gmt/topbar/ViewportQuality.tsx:36-42, 238-295).
- Active light popup sync across CenterHUD and viewport: `activeLightPopup.index` (module-level mutable object) plus `store.openLightPopupIndex` both track hovered/active light, used by gizmo rendering and tutorial trigger (engine-gmt/topbar/CenterHUD.tsx:76-81).
- Shadow menu bridge prevents hover flicker: when context menu closes, a transparent bridge div renders at the menu's last position for 700ms to prevent immediate popup hide if mouse stationary (engine-gmt/topbar/CenterHUD.tsx:53-73).
- ShareLinkButton returns status: copyShareLink() returns 'copied' | 'long' | 'na'; 4096-char URL limit triggers animation-stripping fallback (engine-gmt/topbar/ShareLinkButton.tsx:25-45).

## Drift from existing doc (dev/docs/engine/14_Panel_Manifest.md)

| Doc claim | Current code | Severity |
|-----------|--------------|----------|
| PanelDefinition has `features?: string[]` field | GMT panels.ts uses `items: [...]` exclusively; `features:` shorthand not used | warn |
| PanelDefinition has `widgets: { before, after, between }` field | GMT never uses `widgets` object; all widget composition is via `type: 'widget'` items inside `items: [...]` | warn |
| Example abridged GMT panels use `features: ['coreMath', 'geometry']` shorthand | Actual GMT panels use `items: [{ type: 'feature', id: 'coreMath' }, ...]` throughout | warn |
| PanelRouter composition path: "#3 `features: [...] + widgets: {…}` — shorthand" | No consumers of this shorthand in GMT | warn |
| `showIf` predicate: "dotted-path string or function" | Both forms used: string `'advancedMode'` and function `(s) => s.formula === 'Modular'` — matches spec | info |
| Topbar registration is separate from panel registration | Confirmed: registerGmtTopbar() distinct from installTopBar/installMenu | info |

## Open questions

1. Why does GMT manifest avoid `features:` shorthand entirely? Even simple panels use `items: [...]` — technical blocker or consistency choice?
2. Camera Manager panel (engine-gmt/panels.ts:464-470) has `dock: 'left', order: 20, component: 'panel-cameramanager'` but topbar.tsx has no explicit registration. Is it registered elsewhere? Comment says "Opens as a floating panel on demand via Camera menu" but dock is 'left' not 'float'.
3. Light panel's per-light widget state sharing: CenterHUD.tsx has complex per-light state (hoveredLight, activeMenuIndex, menuBridge timeout). Does light-panel-controls widget manage similar state, or independent? Both write to state.lighting but CenterHUD state appears local.
4. Feature-driven menu items generation (engine-gmt/topbar.tsx:435-478): are `featureRegistry.getMenuFeatures()` / `getExtraMenuItems()` defined in engine-core? Do they pre-filter by feature.menuConfig presence?
5. Mobile adaptive layout coupling: `useMobileLayout` / `isMobileSnapshot` imports — Zustand selector or context provider? Sync with global engine store unclear.
