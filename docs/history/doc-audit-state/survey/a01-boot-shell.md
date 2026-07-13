---
subsystem_id: a01-boot-shell
audited_at: 2026-05-19T00:00:00Z
files:
  - path: app-gmt/main.tsx
    blob_sha: c35901dd966a960c37e268df59472ff989978e5a
    lines_read: [1, 486]
  - path: app-gmt/AppGmt.tsx
    blob_sha: 69939e9ac3c040ff4b19cf4502d95967f96cbd43
    lines_read: [1, 418]
  - path: app-gmt/registerFeatures.ts
    blob_sha: 65bcf83d48f96de01fd97b180fa1b49bb1f66cd3
    lines_read: [1, 23]
  - path: app-gmt/HelpExtras.tsx
    blob_sha: f999180c932f8f685d79fd0a8ac10349d0dd610a
    lines_read: [1, 66]
  - path: app-gmt/LoadingScreen.tsx
    blob_sha: 148e64c17156238a10a9b267f7abebe55077d486
    lines_read: [1, 263]
  - path: app-gmt/renderDialogExtras.tsx
    blob_sha: b595c4a14c5434e19e6f8e235d5cbbefd8233222
    lines_read: [1, 296]
---

## Public API surface

- AppGmt: Root React component exported from app-gmt/AppGmt.tsx:94, wires the full app shell (layout + viewport + overlays)
- LoadingScreen: Splash-screen component exported from app-gmt/LoadingScreen.tsx:46, shown during worker shader compilation
- SupportGmtBody, AboutGmtBody: Help plugin bodies exported from app-gmt/HelpExtras.tsx:13,15
- APP_GMT_DEFAULT_EXTRA, appGmtResolutionPresets, appGmtStartLabel, appGmtIsStartDisabled, appGmtCanEncode, AppGmtExtraFormFields, AppGmtExtraWarning: Render dialog configuration + form components exported from app-gmt/renderDialogExtras.tsx:24-296
- registerFeatures() invoked via side-effect import in app-gmt/registerFeatures.ts:14-15

## Architecture (13 citations)

- Entry point boot order is strict and sequential: main.tsx:17 imports registerFeatures as the very first statement (ES module hoisting ensures it runs before anything else touches the feature registry). Comments at main.tsx:12-16 explain why side-effect imports are mandatory.
- Feature registration freezes on store init: registerFeatures.ts:4-7 documents that featureRegistry is frozen once createFeatureSlice runs, so registration MUST be a side-effect import, not a function call below the imports.
- 26 GMT features + 42 formulas are auto-registered: registerFeatures.ts:14-15 registers GMT features via registerGmtFeatures(), and registerFeatures.ts:19 barrel-imports all 42 formulas which self-register into FractalRegistry on module load.
- Boot preset hydration from share URL or formula default: main.tsx:437-452 reads window.location.hash for #s=... share strings, parses via parseShareString(), and falls back to the active formula's defaultPreset if no URL is present.
- Boot preset seeding must precede worker boot: main.tsx:453-460 calls loadScene() with the boot preset so the store is hydrated with all DDFS slices before getShaderConfigFromState() is called.
- Worker boot is deferred after React mount: main.tsx:339-342 installs the GMT renderer plugin, which boots asynchronously. Comments at main.tsx:464-468 explain that boot is driven by LoadingScreen -> useAppStartup.bootEngine after progress reaches 100%.
- Viewport adaptive quality targets 30 FPS: main.tsx:136-143 installs viewport with targetFps: 30, minQuality: 0.35, interactionDownsample: 0.55 — tuned for GMT's expensive path tracing / Mandelbulb raymarch.
- Camera mode toggle (Tab) manages state in engineStore: main.tsx:346-355 registers gmt.toggleCameraMode shortcut, reading/writing state.cameraMode ('Orbit' vs 'Fly'). AppGmt.tsx:116 subscribes to this field.
- Camera undo/redo (Ctrl+Shift+Z/Y) bypasses engine-core's tie-break: main.tsx:415-430 sets priority 10 to win over engine-plugin's Mod+Shift+Z (which defaults priority 0). Comment at main.tsx:407-414 documents the conflict and intentional suppression of Mac redo-alias.
- AppGmt subscribes per-field, not full-store: AppGmt.tsx:95-122 shows narrow field subscriptions (panels, isBroadcastMode, etc.) instead of one useEngineStore() to avoid re-rendering every child on every store mutation. AppGmt.tsx:98-100 cites performance profiling in docs/UI_PERF_HANDOFF.md.
- GmtRendererTickDriver sends RENDER_TICK each frame via R3F useFrame: AppGmt.tsx:283-302 mounts inside the transparent R3F Canvas, alongside GmtNavigation which handles Orbit/Fly input and calls setSceneOffset().
- Render dialog multi-pass + depth + SSAA form is GMT-specific: renderDialogExtras.tsx:115-296 exports AppGmtExtraFormFields which adds Beauty/Alpha/Depth checkboxes, depth-range sliders, internal-scale (SSAA), and a viewport-sample-time estimator. Comments at renderDialogExtras.tsx:1-5 explain the plugin owns scaffolding; GMT owns extras.
- LoadingScreen formula dropdown works pre-boot: LoadingScreen.tsx:82-91 handles handleSelectFormula, calling loadScene() with the selected formula's defaultPreset, then re-boots if already booted. The dropdown is interactive during compile, allowing formula switch before the scene is ready.

## Invariants and gotchas

- ES module imports hoist — side-effect registration can't be a function call: registerFeatures.ts MUST be imported first in main.tsx, not called as a function. Any subsequent import that touches engineStore will freeze the registry before features are registered.
- Boot preset hydration is idempotent but order-sensitive: If no boot preset is found (!bootPreset), the worker boots "un-hydrated" and logs a warning at main.tsx:459. The preset must be loaded BEFORE useAppStartup triggers worker compilation.
- Camera shortcuts conflict on Mac: The Ctrl+Shift+Z (camera undo) binding shadows engine-plugin's Mod+Shift+Z (redo alias) only because priority 10 is set. Without this override, the bindings would tie-break by insertion order (engine-plugin wins, silently stealing the key).
- Service worker cleanup runs in dev mode only: main.tsx:86-93 unregisters stale service workers + caches only if import.meta.env.DEV, so preview builds may leave debris. This is intentional dev-mode cleanup, not production logic.
- setSceneOffset in AppGmt must delegate to store, not call directly: AppGmt.tsx:193-195 shows that setSceneOffset MUST call the store's action, not mutate state locally. Inline updates would leave engine.virtualSpace.state stale and break Key Cam dirty checks (see AppGmt.tsx:186-191).
- GMF round-trip casts Preset's formula: string to FormulaType: main.tsx:205-208 documents that the cast is safe (engine-gmt narrows formula to a known union, but runtime shape is identical). The serializer only reads formula to look up the registry, which accepts any string.
- LoadingScreen never re-mounts after first hide: Once isVisible becomes false at LoadingScreen.tsx:157, the component returns null and never re-renders, so the spinner + formula picker are permanently gone. Booting a new formula post-hide relies on the in-app UI (Formula panel, not LoadingScreen).

## Drift from existing doc (app-gmt/README.md)

| Doc claim | Current code | Severity |
|-----------|--------------|----------|
| "Step 7: setTimeout(() => gmtRenderer.boot(config, cam), 100) starts the worker after React mounts the canvas" (README line 70) | AppGmt.tsx:145-147 shows boot is driven by useAppStartup(isSceneReady, {...}) returning bootEngine, which is called by LoadingScreen.tsx:155 when isHydrated becomes true. No explicit setTimeout visible here. | warn |
| "No more files belong here" (README line 27) | HelpExtras.tsx, LoadingScreen.tsx, and renderDialogExtras.tsx exist in app-gmt/ but are not mentioned in README's file map (which lists only main.tsx, registerFeatures.ts, AppGmt.tsx). | info |
| File map omits HelpExtras.tsx, LoadingScreen.tsx, renderDialogExtras.tsx | These files are present and audited; they are GMT-specific but not in the file map. | info |

## Open questions

- When exactly does gmtRenderer.boot() run? The README says "step 7" with a setTimeout, but the code flow shows AppGmt passes bootRenderer callback to useAppStartup, which is called by LoadingScreen after hydration. The actual boot invocation is in engine/hooks/useAppStartup.ts (outside the audit scope). Recommend cross-checking against that file.
- Why does LoadingScreen require both isReady and isHydrated flags? isReady tracks R3F Canvas mount (GmtRendererTickDriver.onLoaded), and isHydrated tracks store hydration. The interdependency is clear in LoadingScreen.tsx:155, but the contract between them and bootEngine invocation should be documented in useAppStartup.ts.
- Does setRenderScaleSource() really use hooks inside a non-component callback? main.tsx:152-159 shows setRenderScaleSource({ use: () => useEngineStore(s => ...) }) — the use function returns a hook call at runtime. This is unconventional (hooks in callbacks are usually forbidden). Verify this pattern is intentional and safe.
