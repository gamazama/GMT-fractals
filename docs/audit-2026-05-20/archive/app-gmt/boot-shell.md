---
source: app-gmt/main.tsx
lines: 1-486
last_verified_sha: c35901dd966a960c37e268df59472ff989978e5a
additional_sources:
  - app-gmt/AppGmt.tsx
  - app-gmt/registerFeatures.ts
  - app-gmt/HelpExtras.tsx
  - app-gmt/LoadingScreen.tsx
  - app-gmt/renderDialogExtras.tsx
audited: 2026-05-20T07:36:00Z
audited_by: claude-opus-4-7
public_api:
  - AppGmt
  - LoadingScreen
  - SupportGmtBody
  - AboutGmtBody
  - APP_GMT_DEFAULT_EXTRA
  - appGmtResolutionPresets
  - appGmtStartLabel
  - appGmtIsStartDisabled
  - appGmtCanEncode
  - AppGmtExtraFormFields
  - AppGmtExtraWarning
depends_on:
  - e01-feature-system
  - e02-tick-registry
  - e06-adaptive-resolution
  - e07-plugins-host
  - e08-shortcuts-undo
  - e09-camera-plugin
  - e12-mobile-layout
  - g01-renderer
  - g03-formula-registry
  - g05-engine-gmt-features
  - g08-save-load-gmf
  - a02-panels-layout
---

# App-GMT boot shell

`app-gmt/` is the thin shell that wires engine-core + engine-gmt plugins together at module-load time, hydrates the store from a share URL or formula default preset, and mounts the React root that finally drives the worker boot. The shell owns six files: a synchronous boot script (`app-gmt/main.tsx`), the React root (`app-gmt/AppGmt.tsx`), three GMT content modules consumed by engine-core plugin slots (`app-gmt/HelpExtras.tsx`, `app-gmt/LoadingScreen.tsx`, `app-gmt/renderDialogExtras.tsx`), and the side-effect feature/formula registrar (`app-gmt/registerFeatures.ts`). All GMT domain logic — formulas, renderer worker, navigation, panels, GMF I/O — lives in `engine-gmt/`; the shell is the assembly point.

## Public API

| Symbol | Source | Role |
|--------|--------|------|
| `AppGmt` | `app-gmt/AppGmt.tsx:94` | Root React component; mounts engine shell + GMT renderer canvas + R3F overlay |
| `LoadingScreen` | `app-gmt/LoadingScreen.tsx:46` | Splash with formula picker, Lite-render toggle, compile-progress bar; hosts the boot-trigger effect |
| `SupportGmtBody` | `app-gmt/HelpExtras.tsx:13` | Content for engine Help plugin's `support` modal slot |
| `AboutGmtBody` | `app-gmt/HelpExtras.tsx:15` | Content for engine Help plugin's `about` modal slot; lazily reads `proxy.gpuInfo` |
| `APP_GMT_DEFAULT_EXTRA` | `app-gmt/renderDialogExtras.tsx:24` | Default per-app extras passed to `installRenderDialog<AppGmtExtra>` |
| `appGmtResolutionPresets` | `app-gmt/renderDialogExtras.tsx:36` | Reactive preset list (Viewport / Screen / fixed sizes) |
| `appGmtStartLabel` | `app-gmt/renderDialogExtras.tsx:59` | Start-button label override for video vs image-sequence modes |
| `appGmtIsStartDisabled` | `app-gmt/renderDialogExtras.tsx:69` | Start-button gate (no passes selected, FSA-missing for image-seq) |
| `appGmtCanEncode` | `app-gmt/renderDialogExtras.tsx:83` | Capability probe; lets image-sequence formats bypass the encoder check |
| `AppGmtExtraFormFields` | `app-gmt/renderDialogExtras.tsx:115` | Form fields: pass selectors, depth range, SSAA, viewport-sample estimator |
| `AppGmtExtraWarning` | `app-gmt/renderDialogExtras.tsx:97` | Firefox H.264-cap warning banner |

`main.tsx` exports nothing; its statements run as side-effects at module-load and end by calling `ReactDOM.createRoot(...).render(<AppGmt/>)` (`app-gmt/main.tsx:482-486`).

## Architecture

### Boot chain (four stages, three files)

The actual boot trigger is `LoadingScreen`'s `[isHydrated]` effect, not a fixed `setTimeout` in `main.tsx`. The four stages, in order:

| Stage | Where | What happens |
|-------|-------|--------------|
| 1. Synchronous module-load | `app-gmt/main.tsx:17-477` | All side-effect imports + plugin installs run; store is hydrated from share URL or `Mandelbulb` default preset (`app-gmt/main.tsx:437-460`); `applyPanelManifest` runs (`app-gmt/main.tsx:462`); React root mounts (`app-gmt/main.tsx:482-486`) |
| 2. `useAppStartup` mount effect | `hooks/useAppStartup.ts:113-161` | Hardware detection, mobile preset auto-pick, then `setIsHydrated(true)` (`hooks/useAppStartup.ts:160`). Caller has already hydrated the store at stage 1, so `isHydrated` really signals "mount effect complete" |
| 3. `LoadingScreen` `[isHydrated]` effect | `app-gmt/LoadingScreen.tsx:155` | First commit after stage 2 calls `triggerBoot()`; `hasBootedRef` guards against double-fire (`app-gmt/LoadingScreen.tsx:75-80`) |
| 4. `bootEngine` queues compile | `hooks/useAppStartup.ts:75-106` | 50ms `setTimeout` yields so React flushes any pending `loadScene` writes, then reads the store, builds `ShaderConfig` + `InitialCamera`, emits `COMPILE_ESTIMATE`, and queues `bootRenderer(...)` through `compileGate.queue` (`hooks/useAppStartup.ts:100-105`). `bootRenderer` is the `gmtRenderer.boot(config, camera)` callback (`app-gmt/AppGmt.tsx:126-132`) |

The actual `setTimeout(..., 50)` lives inside stage 4, not at the top-level of `main.tsx`. Re-entrancy is blocked by `bootRequestedRef` (`hooks/useAppStartup.ts:60,66-69`) unless `force=true` is passed — that path is taken on formula-switch and file-load (`app-gmt/LoadingScreen.tsx:90,106`).

### Module-load order in `main.tsx`

Order is load-bearing. Wrong order → silent registry freeze, missing panels, or black screen.

| # | Statement | Why this position |
|---|-----------|-------------------|
| 1 | `import './registerFeatures'` (`app-gmt/main.tsx:17`) | ES module hoisting puts all imports before any top-level statement. `registerFeatures.ts` registers 26 features + 42 formulas BEFORE any later import transitively touches `engineStore` (which freezes the registry via `createFeatureSlice`) (`app-gmt/registerFeatures.ts:14-23`) |
| 2 | `import '../engine/plugins/camera/presetField'` (`app-gmt/main.tsx:20`) | Plugin preset fields register into `presetFieldRegistry` before the store is constructed |
| 3 | `import '../engine-gmt/store/gmtPresetFields'` (`app-gmt/main.tsx:22`) | GMT-specific preset fields (e.g. top-level `lights`) registered before store init |
| 4 | `registerUI()` + `registerGmtUi()` (`app-gmt/main.tsx:95-101`) | Component IDs referenced by feature `viewportConfig`/`customUI[]` must exist before `applyPanelManifest` runs |
| 5 | `installGmtCameraSlice()` + `installGmtModularSlice()` (`app-gmt/main.tsx:107-112`) | Store-shape patches must land before any component reads `savedCameras`, `graph.nodes`, etc. |
| 6 | Resolvers wired: `setFormulaPresetResolver`, `setCompileEstimator`, `setFormulaParamResolver` (`app-gmt/main.tsx:118-131`) | Engine-core has no direct coupling to engine-gmt's `FractalRegistry`; these resolvers decouple the dependency |
| 7 | Engine plugins installed: `installViewport`, `installTopBar`, `installPwaUpdate`, `installSceneIO`, `installGallery`, `installModulation`, `installModulationUI`, `installShortcuts`, `installUndo`, `installCamera`, `installMenu`, `installTutorial`, `installHelp`, `installHud`, `installRenderDialog` (`app-gmt/main.tsx:136-309`) | Standard engine-core plugin install order; menu items registered after `installMenu` |
| 8 | Camera binders + key-track registration (`app-gmt/main.tsx:273-287`) | Animation system reads track IDs at first play; must be registered before first frame |
| 9 | `registerGmtTopbar(...)` (`app-gmt/main.tsx:318-323`) | Runs AFTER `installMenu`/`installCamera` so their registries exist |
| 10 | DEV-only `validateComponentRefs(componentRegistry)` (`app-gmt/main.tsx:329-336`) | Lazy-imported; catches typos in feature → componentId references at boot |
| 11 | `installGmtRenderer({...})` (`app-gmt/main.tsx:339-342`) | Wires GMT renderer plugin's `onBooted` / `onCrash` callbacks |
| 12 | GMT shortcuts registered (`app-gmt/main.tsx:346-430`) | After `installShortcuts`; includes the priority-10 camera-undo override |
| 13 | Boot-preset hydration (`app-gmt/main.tsx:437-460`) | `#s=` share URL takes precedence over `Mandelbulb` defaultPreset; `loadScene({preset})` flushes all DDFS slices via the presetFieldRegistry |
| 14 | `applyPanelManifest(GmtPanels)` (`app-gmt/main.tsx:462`) | Reads frozen featureRegistry + componentRegistry; declares panel layout |
| 15 | `ReactDOM.createRoot(...).render(<AppGmt/>)` (`app-gmt/main.tsx:482-486`) | Worker boot is no longer driven from here — it's triggered downstream by `LoadingScreen`'s `[isHydrated]` effect |

### Viewport, render-scale, and adaptive tuning

`installViewport` is configured for GMT's expensive path-tracing workload: `targetFps: 30`, `minQuality: 0.35`, `interactionDownsample: 0.55`, `activityGraceMs: 100`, `alwaysActive: false` (`app-gmt/main.tsx:136-143`). `setRenderScaleSource` overrides the engine's default in-canvas render-scale pill to read/write `aaLevel` instead of `viewportSlice.renderScale`, so the pill and the Quality > Resolution > Internal Scale dropdown share a single source of truth (`app-gmt/main.tsx:152-159`). The `use` field returns hooks at runtime; the safety of this pattern is documented in the engine's `RenderScaleSource` JSDoc and relies on the two-component split inside `ViewportModeControls` so hooks are always called unconditionally from a function component.

### SceneIO wiring (GMF as primary save format)

`installSceneIO` is wired with GMT's worker canvas, `'gmf'` extension, the snapshot anchor used by the tutorial, and custom `parseScene` / `serializeScene` callbacks (`app-gmt/main.tsx:168-210`). `parseScene` calls `loadGMFScene(content)`; if the file carries an embedded formula def not already in `gmtRegistry`, it registers the def and emits `REGISTER_FORMULA` so the shader pipeline picks it up (`app-gmt/main.tsx:188-198`). `serializeScene` casts the engine-core `Preset` (where `formula: string`) to engine-gmt's narrower `FormulaType` union — the runtime shape is identical (`app-gmt/main.tsx:204-209`).

### Shortcut registration: priority-10 camera undo

`Ctrl+Shift+Z` / `Ctrl+Shift+Y` are registered with `priority: 10` (`app-gmt/main.tsx:415-430`) so they beat engine-core's `Mod+Shift+Z` redo alias on insertion-order tie-breaks. The comment block at `app-gmt/main.tsx:407-414` documents this as the intentional suppression of the Mac redo alias; GMT's UX contract is "Ctrl+Shift+Z is camera-undo, full stop."

### React root composition

`AppGmt` (`app-gmt/AppGmt.tsx:94`) subscribes to the store with narrow per-field selectors rather than a single `useEngineStore()` call, to avoid re-rendering every child on unrelated store mutations (`app-gmt/AppGmt.tsx:95-122` — profile-verified per `docs/UI_PERF_HANDOFF.md`). It wraps the shell in `StoreCallbacksProvider`, mounts the engine plugins' hosts (`TopBarHost`, `HudHost`, `Dock`, `DropZones`, `TimelineHost`, `HelpOverlay`, `TutorialRunner`, `TutorialOverlay`, `MobileMenuHost`), and composes the viewport: `GmtRendererCanvas` paints the worker output, R3F `<Canvas>` sits on top transparently hosting `<GmtRendererTickDriver>` (sends `RENDER_TICK` each frame) and `<GmtNavigation>` (orbit/fly input + `setSceneOffset`) (`app-gmt/AppGmt.tsx:275-302`). Floating panels, region overlays, preview-ghost, histogram drivers, and the global context menu hang off the same root.

`setSceneOffset` in `AppGmt` deliberately delegates to the store's `setSceneOffset` action (`app-gmt/AppGmt.tsx:193-195`) rather than mutating state locally — `cameraSlice` updates both the store AND `engine.virtualSpace.state` in lockstep and emits `OFFSET_SET` to the worker. Inline mutation would diverge the two and break the Key Cam dirty check.

### Loading screen content

`LoadingScreen` renders the GMT wordmark + rotating subtitle, the compile-progress bar (driven by `CompileProgressStore.selectProgress` via rAF), the CPU Julia spinner (`LoadingRendererCPU`), a formula picker with thumbnail previews, a "Load From File…" entry (routes through `loadSceneFile` → the SceneIO-registered GMF parser), and a Lite-Render toggle (`app-gmt/LoadingScreen.tsx:46-263`). Boot is triggered separately by the `[isHydrated]` effect; the rAF loop is purely a view (`app-gmt/LoadingScreen.tsx:119-153`). Fade-out gates on `isReady && phase === 'done' && !menuOpen` (`app-gmt/LoadingScreen.tsx:140`).

### Render-dialog extras (multi-pass + estimator)

`renderDialogExtras.tsx` plugs into the engine's generic render-dialog plugin. The plugin owns scaffolding (form, progress, ETA, stop/resume, capability/disk-mode); this file owns GMT-specific extras (`app-gmt/renderDialogExtras.tsx:1-5`): beauty/alpha/depth pass selectors, depth-range fields with "Use fog range" shortcut (`app-gmt/renderDialogExtras.tsx:204-247`), internal-scale (SSAA) slider (`app-gmt/renderDialogExtras.tsx:251-261`), Firefox H.264 cap warning (`app-gmt/renderDialogExtras.tsx:95-110`), and the viewport-sample-time estimator that polls `proxy.accumulationCount` and computes `estTotalSeconds = (frameDuration * resolutionMultiplier * frameCount)` (`app-gmt/renderDialogExtras.tsx:139-166`). The form's `useEffect` keeps the live preview's TSAA cap in sync with `samplesPerFrame` and suppresses adaptive resolution while mounted (`app-gmt/renderDialogExtras.tsx:125-135`).

## Invariants

### Three "ready"-ish flags — disambiguate

The boot pipeline carries three near-identically-named flags. Conflating them deadlocks the boot or fades the splash before the first frame.

| Flag | Set at | Read at | What it really means |
|------|--------|---------|----------------------|
| `isHydrated` | `hooks/useAppStartup.ts:160` (after hw-detect + mobile auto-pick) | `app-gmt/LoadingScreen.tsx:155` | **Boot trigger.** Misnamed — store is hydrated synchronously by `main.tsx` at module-load. What this flag actually signals is "useAppStartup's mount effect has completed; safe to boot." |
| `isReady` | `engine-gmt/renderer/GmtRendererTickDriver.tsx:117-118` (after `proxy.isBooted && !proxy.isCompiling`) | `app-gmt/LoadingScreen.tsx:140` (rAF fade-out gate) | **Fade-out gate.** Producer/consumer pair with `isHydrated`: `isHydrated → bootEngine → gmtRenderer.boot → worker compile → proxy.isBooted → !proxy.isCompiling → onLoaded() → isReady`. Cannot gate the boot itself (circular dependency). |
| `_isSceneReady` (parameter) | passed as 1st arg to `useAppStartup(isSceneReady, …)` (`app-gmt/AppGmt.tsx:145`) | nowhere — leading underscore signals unused (`hooks/useAppStartup.ts:53`) | **Dead.** Phase-2 cleanup target — drop the parameter. |

The fade-out is double-gated: `isReady` (worker has produced output) AND `cp.phase === 'done'` (compile-progress bar has visibly reached 100%). Both are required so a fast compile doesn't snap the bar from 73% to gone (`app-gmt/LoadingScreen.tsx:140`).

### Other invariants

- **ES-module hoisting forces side-effect imports.** `registerFeatures.ts` must be imported, not called — any subsequent import (e.g. `AppGmt → engineStore`) freezes the registry, and `createFeatureSlice` runs once at first access (`app-gmt/registerFeatures.ts:4-7`).
- **Boot preset must precede worker boot.** `loadScene({preset})` populates every DDFS slice via the presetFieldRegistry; without it, `getShaderConfigFromState` reads undefined slices and the worker boots a half-formed shader (`app-gmt/main.tsx:432-460`). If no preset is found, the shell logs a warning at `app-gmt/main.tsx:459` and boots un-hydrated.
- **Boot is double-guarded against double-fire.** `LoadingScreen.triggerBoot` uses `hasBootedRef` (`app-gmt/LoadingScreen.tsx:75-80`); `useAppStartup.bootEngine` checks `bootRequestedRef` AND `opts.isBootedOrRequested?.()` (`hooks/useAppStartup.ts:60,66-69`). Even a remount cannot double-boot the worker.
- **Formula-switch / file-load force-reboot.** `handleSelectFormula` and `handleFile` call `bootEngineRef.current(true)` only if `hasBootedRef.current` is set (`app-gmt/LoadingScreen.tsx:90,106`). Selecting a formula before the first auto-boot is silent — the upcoming auto-boot picks up the new formula because `loadScene` already updated the store.
- **`LoadingScreen` never re-mounts.** Once `isVisible` flips false at `app-gmt/LoadingScreen.tsx:157`, the component returns null forever. Booting a new formula post-hide goes through the in-app Formula panel, not `LoadingScreen`.
- **`setSceneOffset` must delegate to the store action** (`app-gmt/AppGmt.tsx:193-195`). Inline updates leave `engine.virtualSpace.state` stale and break the Key Cam dirty check.
- **Dev-mode-only service worker cleanup.** `app-gmt/main.tsx:86-93` unregisters stale SWs and clears caches only when `import.meta.env.DEV` — preview builds may leave debris; this is intentional.
- **`registerGmtTopbar` runs AFTER `installMenu`/`installCamera`.** It registers items in the menu/camera registries those plugins own (`app-gmt/main.tsx:318-323`).

## Interactions with other subsystems

| Subsystem | Where the shell touches it |
|-----------|---------------------------|
| `e01-feature-system` | `app-gmt/registerFeatures.ts:14-15` (`registerGmtFeatures()`), `app-gmt/main.tsx:329-336` (DEV `validateComponentRefs`), feature/component registry frozen on store init |
| `e02-tick-registry` | `GmtRendererTickDriver` mounted inside R3F `<Canvas>` runs the tick phases each frame (`app-gmt/AppGmt.tsx:283-302`) |
| `e06-adaptive-resolution` | `installViewport({...})` config for GMT's PT load (`app-gmt/main.tsx:136-143`); `setRenderScaleSource` overrides the default pill source (`app-gmt/main.tsx:152-159`); `setAdaptiveSuppressed` toggled by render-dialog mount (`app-gmt/renderDialogExtras.tsx:132-135`) |
| `e07-plugins-host` | `installTopBar`, `installSceneIO`, `installMenu`, `installHelp`, `installHud`, `installRenderDialog`, `installPwaUpdate`, `installPauseControls`, `installTutorial` all wired in `app-gmt/main.tsx:165-309` |
| `e08-shortcuts-undo` | `installShortcuts` + `installUndo` at `app-gmt/main.tsx:238-239`; GMT shortcuts registered at `app-gmt/main.tsx:346-430` (Tab, backtick, B, Escape, Ctrl+Shift+Z/Y); priority-10 camera-undo override |
| `e09-camera-plugin` | `installCamera({ hideShortcuts: true })` (`app-gmt/main.tsx:245`); engine-camera's shortcut bindings suppressed in favour of GMT's state-library Mod+1..9 |
| `e12-mobile-layout` | `useMobileLayout()` consumed at `app-gmt/AppGmt.tsx:118`; mobile-only Dock-swap (`app-gmt/AppGmt.tsx:356-359`), Timeline-mount gate (`app-gmt/AppGmt.tsx:367`), MobileControls / LandscapeGate / MobileScrollIntro |
| `g01-renderer` | `installGmtRenderer({...})` (`app-gmt/main.tsx:339-342`); `bootRenderer` callback wraps `gmtRenderer.boot(config, camera)` (`app-gmt/AppGmt.tsx:126-132`); `GmtRendererCanvas` painted underneath R3F (`app-gmt/AppGmt.tsx:275-278`) |
| `g03-formula-registry` | `setFormulaPresetResolver` decouples engineStore from `registry.get(f).defaultPreset` (`app-gmt/main.tsx:118`); `setFormulaParamResolver` for the LFO/modulation dropdown (`app-gmt/main.tsx:131`); formula self-registration via `import '../engine-gmt/formulas/index'` (`app-gmt/registerFeatures.ts:19`); `LoadingScreen` formula picker reads `registry.getAll()` (`app-gmt/LoadingScreen.tsx:117`) |
| `g05-engine-gmt-features` | `registerGmtFeatures()` registers 26 GMT DDFS features (`app-gmt/registerFeatures.ts:14`); `installGmtCameraSlice()` + `installGmtModularSlice()` patch the store (`app-gmt/main.tsx:107-112`) |
| `g08-save-load-gmf` | `installSceneIO` wires `loadGMFScene` / `saveGMFScene` as `parseScene` / `serializeScene` (`app-gmt/main.tsx:168-210`); embedded-formula auto-register on load (`app-gmt/main.tsx:188-198`) |
| `a02-panels-layout` | `registerGmtUi()` registers GMT widget componentIds (`app-gmt/main.tsx:101`); `applyPanelManifest(GmtPanels)` declares the 10-panel layout (`app-gmt/main.tsx:462`) |

## Known issues / Phase 2 carry-in

### PRODUCTION BUG: silent 30s timeout in GmtRendererTickDriver

`engine-gmt/renderer/GmtRendererTickDriver.tsx:90-94` polls `proxy.isBooted` up to 300 times at 100ms intervals. If the worker never boots — and there is no error path that surfaces this — the loop logs a single `console.error('[GmtRendererTickDriver] Worker boot timeout after 30s')` and returns without ever calling `onLoaded()`. `isReady` stays `false` forever; the LoadingScreen's fade-out gate (`app-gmt/LoadingScreen.tsx:140`) never fires; the splash is stuck with no error UI. `CompileProgressStore` may still reach `phase === 'done'` independently, but the `isReady &&` clause blocks fade-out. The user sees a frozen progress bar.

This is reachable in production. Fix should either surface an error-state branch through the LoadingScreen or fail loudly. Evidence: `plans/doc-audit-state/survey/_followups/q-002.md`.

### Drift: README's "step 7 with setTimeout" framing

`app-gmt/README.md:70` describes boot as `setTimeout(() => gmtRenderer.boot(config, cam), 100)` at the bottom of `main.tsx`. This is wrong:

- The `setTimeout` is 50ms, not 100ms.
- It lives inside `bootEngine` at `hooks/useAppStartup.ts:75-106`, not at `main.tsx`'s top level.
- The actual trigger is `LoadingScreen`'s `[isHydrated]` effect (`app-gmt/LoadingScreen.tsx:155`), which fires after `useAppStartup`'s mount effect, not "after React mounts the canvas" in any vague sense.
- `app-gmt/main.tsx:464-468` already carries a comment noting the boot has moved into the LoadingScreen → useAppStartup chain.

The full chain is documented in this doc's Architecture section and in `plans/doc-audit-state/survey/_followups/q-001.md`.

### Cleanup: dead `_isSceneReady` parameter

`hooks/useAppStartup.ts:53` takes `_isSceneReady` as its first positional argument; the leading underscore signals "unused" and the hook never references it. `AppGmt` still passes `isSceneReady` at `app-gmt/AppGmt.tsx:145` only because the signature demands it. Safe removal — drop the param from both call site and signature. Evidence: `plans/doc-audit-state/survey/_followups/q-001.md` (related findings) and `q-002.md`.

### Drift: README file map omits three files

`app-gmt/README.md:13-25` lists only `main.tsx`, `registerFeatures.ts`, `AppGmt.tsx`, `LoadingScreen.tsx`. `HelpExtras.tsx` and `renderDialogExtras.tsx` exist and are part of the shell. The README's "No more files belong here" assertion (`app-gmt/README.md:27`) is contradicted by both files. Low severity — both are GMT-specific content modules for engine plugin slots, not a structural drift.

## Historical context

`app-gmt/README.md` remains the canonical "I'm starting work on app-gmt" onboarding entry point per `docs/DOCS_INDEX.md`'s per-app-README rule. This module doc captures the current state of the boot chain at depth and supersedes the README's boot-order section (`app-gmt/README.md:60-72`) where they diverge — see the carry-in items above. The README's file-map, GMF-format pointer, adding-a-feature checklist, and shortcuts table remain accurate.

The three-file plugin pattern (engine-plugin scaffolding + app-specific content modules) referenced in `app-gmt/HelpExtras.tsx:1-5` and `app-gmt/renderDialogExtras.tsx:1-5` is the recurring shape for engine-plugin integration: Help's `support` / `about` slots, RenderDialog's `extraFormFields` / `extraWarning`, SceneIO's `parseScene` / `serializeScene` callbacks all follow it. Each plugin owns the scaffold; the app owns the content.
