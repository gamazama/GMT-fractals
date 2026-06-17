---
subsystem_id: e06-adaptive-resolution
audited_at: 2026-05-19T00:00:00Z
files:
  - path: engine/AdaptiveResolution.ts
    blob_sha: 906da1c4e2db811f84bcb8b79d8266b6f726a079
    lines_read: [1, 286]
  - path: engine/HardwareDetection.ts
    blob_sha: 4e61916f8d9bdfc8ac627d7d485e41ed38c2f5c8
    lines_read: [1, 64]
  - path: engine/plugins/Viewport.tsx
    blob_sha: e2a80b51fbafb07bc6c85d0338880912b41b6b76
    lines_read: [1, 188]
  - path: engine/plugins/viewport/AdaptiveResolutionBadge.tsx
    blob_sha: e8ce75956c2a669c835bea8e17e6918459c1ff43
    lines_read: [1, 93]
  - path: engine/plugins/viewport/FixedResolutionControls.tsx
    blob_sha: 9883c4491fdf5f343e0d813ccb289f46a6355773
    lines_read: [1, 234]
  - path: engine/plugins/viewport/ViewportFrame.tsx
    blob_sha: 119f7891c6fe7cb0871ec6d251d090da4d3a4733
    lines_read: [1, 226]
  - path: engine/plugins/viewport/ViewportModeControls.tsx
    blob_sha: cecaba9a4df1b80337bbc26cb5e9a30ec8ec230c
    lines_read: [1, 153]
---

## Public API surface

### engine/AdaptiveResolution.ts (pure module)
- `AdaptiveResolutionState` interface (engine/AdaptiveResolution.ts:48)
- `AdaptiveResolutionInput` interface (engine/AdaptiveResolution.ts:70)
- `AdaptiveResolutionResult` interface (engine/AdaptiveResolution.ts:113)
- `createAdaptiveResolutionState(): AdaptiveResolutionState` (engine/AdaptiveResolution.ts:124)
- `getAdaptiveGrace(stillFps: number): number` (engine/AdaptiveResolution.ts:142)
- `tickAdaptiveResolution(state, input): AdaptiveResolutionResult` (engine/AdaptiveResolution.ts:146)

### engine/HardwareDetection.ts
- `detectHardwareProfile(gl?: WebGL2RenderingContext): HardwareProfile` (engine/HardwareDetection.ts:13)
- `detectHardwareProfileMainThread(): HardwareProfile` (engine/HardwareDetection.ts:62)

### engine/plugins/Viewport.tsx
- `type ViewportAdaptiveConfig` re-export from `../../types/viewport` (engine/plugins/Viewport.tsx:26)
- `interface RenderScaleSource` (engine/plugins/Viewport.tsx:43)
- `setRenderScaleSource(source | null): void` (engine/plugins/Viewport.tsx:58)
- `getRenderScaleSource(): RenderScaleSource | null` (engine/plugins/Viewport.tsx:63)
- `installViewport(options?: Partial<ViewportAdaptiveConfig>)` (engine/plugins/Viewport.tsx:72)
- `uninstallViewport()` (engine/plugins/Viewport.tsx:98)
- `viewport` imperative object: `frameTick()`, `reportFps(fps)`, `holdAdaptive(durationMs?)`, `suppressAdaptive(v)`, `setConfig(cfg)` (engine/plugins/Viewport.tsx:106-139)
- React hooks: `useQualityFraction()` (145), `useViewportSize()` (149), `useViewportFps()` (156), `useViewportInteraction()` (164), `useViewportMode()` (168)
- Re-exports: `ViewportFrame`, `ViewportFrameProps`, `ViewportModeControls`, `ViewportModeControlsProps`, `FixedResolutionControls`, `AdaptiveResolutionBadge`, `AdaptiveResolutionBadgeProps` (engine/plugins/Viewport.tsx:182-188)

### engine/plugins/viewport/* components
- `AdaptiveResolutionBadge: React.FC<{ className? }>` (engine/plugins/viewport/AdaptiveResolutionBadge.tsx:41)
- `FixedResolutionControls: React.FC<FixedResolutionControlsProps>` — non-exported prop type (engine/plugins/viewport/FixedResolutionControls.tsx:22)
- `ViewportFrame: React.FC<ViewportFrameProps>` (engine/plugins/viewport/ViewportFrame.tsx:87) with props `children`, `showModeControls`, `shouldResize`, `className`, `innerClassName`, `fixedPadding`, `outerOverlay`
- `ViewportModeControls: React.FC<ViewportModeControlsProps>` (engine/plugins/viewport/ViewportModeControls.tsx:96) with props `top`, `left`, `availableWidth`, `availableHeight`

## Architecture

- Adaptive-resolution decision logic is a pure, DOM/THREE-free module shared by GMT's worker (`engine-gmt/.../UniformManager.ts`) and the engine-core viewport plugin (`store/slices/viewportSlice.ts`) (engine/AdaptiveResolution.ts:1-13).
- State is mutated in place each tick to avoid per-frame allocations; caller must set `state.selfResized = true` when it resizes in response to the result (engine/AdaptiveResolution.ts:43-46, 64-65).
- Activity tracking has two triggers: explicit `isInteracting` (gated by `gateOnAccumOnly`), and an external accumulation reset (accumCount dropped while `selfResized` is false) (engine/AdaptiveResolution.ts:176-182).
- Suppression is the highest-priority short-circuit: forces `scale=1.0`, clears active state, and exits early returning `needsAdaptive=false` (engine/AdaptiveResolution.ts:159-167).
- "Deep accumulation" protection: only full-res samples count (`fullResAccum = accumCount` iff `scale <= 1.001`); FPS-scaled threshold default `clamp(round(stillFps), 8, 50)` overridable via `accumThreshold` (engine/AdaptiveResolution.ts:191-205).
- Grace period scales inversely with stillFps: `clamp(2000 / max(1, stillFps), 100, 3000)` ms — 1fps → 2s, 30fps+ → 100ms (engine/AdaptiveResolution.ts:142-144).
- Adaptive engagement formula: `dynamicScaling && !isDeepAccumulation && (alwaysActive || activitySignal)` where `activitySignal` in normal mode is `(isInteracting || !mouseOverCanvas || timeSinceActivity < grace)`, in `gateOnAccumOnly` is just `timeSinceActivity < grace` (engine/AdaptiveResolution.ts:216-219).
- Smart-adaptive seeding: when `activeLast === 0`, jumps to `sqrt(adaptiveTarget / stillFps)` if `stillFps < adaptiveTarget`, else 1.0; sets `firstWindow=true` (engine/AdaptiveResolution.ts:227-239).
- First sample window: 200ms, EMA blend = 1.0 (jump to ideal). Subsequent windows: 500ms, blend = 0.3 (smooth) (engine/AdaptiveResolution.ts:242-247).
- `holdUntilMs` only blocks further downscale (`nextScale > state.scale`); upscale is always allowed during hold (engine/AdaptiveResolution.ts:250-256).
- Manual mode (`adaptiveTarget <= 0`) sets `state.scale = max(1.0, interactionDownsample || 2.0)` (engine/AdaptiveResolution.ts:261-264).
- Settled-state branch tracks `stillFps` via 500ms sample windows and `>2 frame` guard; resets `scale=1.0` and active counters so the next disturbance re-seeds (engine/AdaptiveResolution.ts:268-283).
- HardwareDetection probes Float32 render-target support via a 1×1 RGBA32F framebuffer round-trip when a `WebGL2RenderingContext` is provided, otherwise (main thread) falls back to mobile heuristic for the `supportsFloat32` flag (engine/HardwareDetection.ts:18-38).
- Mobile detection uses `matchMedia('(pointer: coarse)')` OR `window.innerWidth < 768` (engine/HardwareDetection.ts:14-16).
- Hardware tier derivation: `low` = mobile && !float32; `mid` = mobile; `high` = otherwise (engine/HardwareDetection.ts:42-44).
- `HardwareProfile.caps` derived: `precisionMode = isMobile ? 1 : 0`, `bufferPrecision = supportsFloat32 ? 0 : 1`, `compilerHardCap = isMobile ? MOBILE_HARD_CAP : DEFAULT_HARD_CAP` (engine/HardwareDetection.ts:50-55).
- `installViewport` is idempotent via module-level `_installed` flag; the same call accepts a partial config override that is forwarded to the store's `setAdaptiveConfig` (engine/plugins/Viewport.tsx:31, 72-75).
- The plugin's only direct store subscription is on `isUserInteracting`: on a true-edge it imperatively drops `qualityFraction` to `cfg.interactionDownsample` ONLY when `cfg.targetFps === 0` (manual mode); smart mode is seeded by the next `reportFps` tick (engine/plugins/Viewport.tsx:77-94).
- `viewport.frameTick()` delegates to `reportFps(0)`; the store's `reportFps` is the unified entry point and computes fps internally from a rolling timestamp buffer when called with 0 (engine/plugins/Viewport.tsx:108-118).
- The in-canvas render-scale pill has a pluggable source via `RenderScaleSource` registration — default reads/writes `viewportSlice.renderScale`; GMT injects a source pointing at `quality.aaLevel` (engine/plugins/Viewport.tsx:34-63, engine/plugins/viewport/ViewportModeControls.tsx:42-94).
- `ViewportFrame` is the SOLE authoritative writer of `canvasPixelSize` via a `ResizeObserver` on its outer flex-filled div; `dpr` multiplier is read from `window.devicePixelRatio` per push and floored (engine/plugins/viewport/ViewportFrame.tsx:103-136).
- ViewportFrame writes via `getBoundingClientRect()` once immediately on mount in addition to the observer, to seed pre-first-resize state (engine/plugins/viewport/ViewportFrame.tsx:126-129).
- `shouldResize` predicate gates only the store write, not the local `viewportSize` state — local layout still tracks size even when writes are suppressed (engine/plugins/viewport/ViewportFrame.tsx:108-115).
- ViewportFrame's `onMouseEnter` / `onMouseLeave` is the only place `setMouseOverCanvas` is called from this subsystem; this fix was added because the legacy ViewportArea had wired it but ViewportFrame had not, leaving adaptive engaged indefinitely (engine/plugins/viewport/ViewportFrame.tsx:180-189).
- Fixed-mode inner container forces `boxSizing: 'content-box'` to defeat Tailwind's preflight `border-box`, so the 1px border doesn't shrink saved images by 2px in each dimension (engine/plugins/viewport/ViewportFrame.tsx:146-163).
- Fixed-mode fit scale: `min(1.0, (viewportW - fixedPadding) / fw, (viewportH - fixedPadding) / fh)` — never upscales above 1.0 (engine/plugins/viewport/ViewportFrame.tsx:142-144).
- ViewportFrame renders `CompositionOverlay` as an in-frame sibling inside the inner sized container, and `outerOverlay` as a sibling of the inner container (viewport-relative, doesn't shrink in Fixed mode) (engine/plugins/viewport/ViewportFrame.tsx:200-223).
- `AdaptiveResolutionBadge` reads `adaptiveConfig`, `adaptiveSuppressed`, and consults `isMouseOverCanvas()` (imported from `engine/worker/ViewportRefs`) to pick between Auto/Always/Locked/Off visuals (engine/plugins/viewport/AdaptiveResolutionBadge.tsx:42-82).
- Badge click handler: when re-enabling and `targetFps <= 0`, it seeds `targetFps = 30` ("turn adaptive on" implies smart mode) (engine/plugins/viewport/AdaptiveResolutionBadge.tsx:55-60).
- `FixedResolutionControls` drag affordance: dragging up/right by 4px per step (coarse) plus left/right at 20px per step (fine), summed and multiplied by 8 px-per-step; aspect ratio is locked to startW/startH (engine/plugins/viewport/FixedResolutionControls.tsx:65-83).
- Aspect-ratio preset application keeps a 40px padding around the available area, fits by height if `screenRatio > targetRatio` else by width; `'Max'` ignores the ratio entirely (engine/plugins/viewport/FixedResolutionControls.tsx:96-127).
- Custom resolution dialog uses a `latestRef` to keep keydown listener pinned with a stable empty dep array while still reading current state (engine/plugins/viewport/FixedResolutionControls.tsx:202-216).
- The render-scale pill is only rendered in Fixed mode (top-centre); Full mode shows just the "Fixed" mode-switch button (engine/plugins/viewport/ViewportModeControls.tsx:107-152).

## Invariants and gotchas

- AdaptiveResolution is pure: caller owns buffer resize, accumulation reset, and must set `selfResized=true` before the next tick if it resized in response — failure causes the caller's own resize to be counted as activity and re-engage adaptive (engine/AdaptiveResolution.ts:43-46, 178-182).
- `state.scale` floor is 1.0 and ceiling is `1 / max(0.01, minQuality)`; values clamped on every assignment in smart mode (engine/AdaptiveResolution.ts:151-152, 230-231, 249).
- `gateOnAccumOnly` disables BOTH the `isInteracting` activity write (engine/AdaptiveResolution.ts:176) AND the `isInteracting || !mouseOverCanvas` clauses of `activitySignal` (engine/AdaptiveResolution.ts:216-218) — used by fluid-toy because unrelated UI drags don't invalidate its accumulator.
- `alwaysActive` bypasses `mouseOverCanvas`/`grace` but does NOT bypass deep-accum or `suppressed` (engine/AdaptiveResolution.ts:219).
- `holdUntilMs` allows upscale, only blocks downscale; comparison is strict `nextScale > state.scale` (engine/AdaptiveResolution.ts:251-256).
- `fullResAccum` resets to 0 whenever `scale > 1.001` — protection only re-activates after the system returns to full res long enough to accumulate (engine/AdaptiveResolution.ts:191-195).
- `installViewport` is idempotent — but `setAdaptiveConfig(options)` runs on EVERY call regardless of the `_installed` flag (engine/plugins/Viewport.tsx:73-75).
- ViewportFrame's `useLayoutEffect` intentionally omits `shouldResize` from deps (eslint-disable) — predicate must be ref-stable or it works via captured closure (engine/plugins/viewport/ViewportFrame.tsx:132-136).
- HardwareDetection probe creates+deletes GL objects each call; safe to call repeatedly but not free. There is no caching — caller should call once at boot (engine/HardwareDetection.ts:6-8 comment, 18-34 implementation).
- `AdaptiveResolutionBadge` uses `isMouseOverCanvas()` from `engine/worker/ViewportRefs` — this is a module-level ref, NOT a Zustand subscription, so the badge will NOT re-render automatically when the mouse crosses the canvas; only on the next adaptive state change (engine/plugins/viewport/AdaptiveResolutionBadge.tsx:27, 48).
- FixedResolutionControls drag uses inverted axes: dragging LEFT or UP increases size; this is documented in the title attribute but unintuitive (engine/plugins/viewport/FixedResolutionControls.tsx:62-64, 142).
- All `snap8` operations come from `utils/resolutionUtils` — width is the input axis, height derived from aspect, then both snapped to 8 independently (engine/plugins/viewport/FixedResolutionControls.tsx:80-82).
- The `RenderScaleControl` indirection (DefaultScalePill vs CustomScalePill) exists specifically to avoid conditional hook calls — `source.use()` is a hook and must not be called when source is null (engine/plugins/viewport/ViewportModeControls.tsx:42-45 comment).

## Drift from existing doc (dev/docs/engine/10_Viewport.md)

| Doc claim | Current code | Severity |
|---|---|---|
| Hook is `useViewport()` returning a single bundled object with width/height/dpr/physicalSize/logicalSize/mode/isInteracting/interactionMode/isMouseOverCanvas/qualityFraction/fps/fpsSmoothed (doc:38-50) | No `useViewport()` exists. Plugin exports five granular hooks: `useQualityFraction`, `useViewportSize`, `useViewportFps`, `useViewportInteraction`, `useViewportMode` (Viewport.tsx:145-172) | break |
| Imperative API exposes `viewport.setMode`, `setFixedResolution`, `setInteracting`, `setAdaptive` (doc:54-69) | `viewport` object exposes only `frameTick`, `reportFps`, `holdAdaptive`, `suppressAdaptive`, `setConfig` (Viewport.tsx:106-139); mode/fixedResolution/interaction setters live on the store directly | break |
| Subscriptions API: `viewport.onResize(...)`, `viewport.onQualityChange(...)`, `viewport.onModeChange(...)` (doc:73-77) | No such subscription helpers exist; consumers use Zustand selectors directly | break |
| `setAdaptive` accepts `targetFps`, `minQuality`, `graceMs`, `changeCooldownMs`, `alwaysActive`, `engageOnAccumOnly` (doc:58-68) | `installViewport`/`setConfig` accept `ViewportAdaptiveConfig` (re-exported from `types/viewport`); naming uses `gateOnAccumOnly` in AdaptiveResolution.ts:110, doc spells it `engageOnAccumOnly` | warn |
| State shape under `store.viewport` namespace with nested `adaptive` sub-object (doc:89-119) | Fields are flat on `engineStore` (e.g. `adaptiveConfig`, `adaptiveSuppressed`, `qualityFraction`, `canvasPixelSize`, `dpr`, `resolutionMode`, `fixedResolution`, `isUserInteracting`, `renderScale`); no `viewport.*` namespace observable in the code under audit | break |
| Mode enum: `'Full' \| 'Fixed' \| 'Custom'` (doc:55, 96) | Only `'Full' \| 'Fixed'` used in code (Viewport.tsx:171, ViewportFrame.tsx:138, ViewportModeControls.tsx:107-150) | warn |
| `<ViewportArea canvasSlot={…}>` is the host component (doc:130, 236-247, 313) | Component is named `<ViewportFrame>` and accepts `children` (no `canvasSlot` prop). `outerOverlay` is the sibling prop. (ViewportFrame.tsx:46-95) | break |
| `<PerformanceWarning>` ships with the plugin and consults a `viewport.registerSuggestion(...)` registry (doc:128, 131-144, 285-287) | No `<PerformanceWarning>` and no `registerSuggestion` API present in any audited file or exported from Viewport.tsx | break |
| `<AdaptiveResolutionBadge>` is mounted in TopBar right slot (doc:129) | Component exists and is exported, but TopBar slot wiring is not present in the audited surface; apps mount it manually (AdaptiveResolutionBadge.tsx) | info |
| `setMouseOverCanvas`/`isMouseOverCanvas` moves from `engine/worker/ViewportRefs.ts` to the plugin (doc:161, 310) | Still imported from `engine/worker/ViewportRefs` by both ViewportFrame.tsx:44 and AdaptiveResolutionBadge.tsx:27 | warn |
| Render-scale destination is `viewport.renderScale` (doc:21) | Field is flat `renderScale` on engineStore; `RENDER_SCALE_STEPS` is imported from `store/slices/viewportSlice` (ViewportModeControls.tsx:21) | warn |
| Hardware detection lives in a future `@engine/environment` plugin (doc:272-273, 297-299) | `engine/HardwareDetection.ts` ships today as a module function — not a plugin, no install API, no environment plugin namespace | warn |
| Adaptive algorithm unified — slice and worker call the same pure module (doc:7) | Confirmed accurate. `AdaptiveResolution.ts` header explicitly documents the dual-caller pattern (AdaptiveResolution.ts:1-13) | info |
| Suggestion registry / `<PerformanceWarning>` lifecycle in Lifecycle section (doc:251) | Neither symbol present | break |
| `viewport.holdAdaptive(durationMs?)` defaults to `adaptiveConfig.graceMs` (doc:62-63) | Default behaviour delegates to store's `holdAdaptive` — not visible in audit files; signature matches (Viewport.tsx:124-126) | info |

Recommendation: rewrite. The doc describes a planned design (`useViewport()` hook, `viewport.onResize/onQualityChange/onModeChange`, `<ViewportArea canvasSlot>`, `<PerformanceWarning>` + suggestion registry, `viewport.*` store namespace, Custom mode, environment plugin) that the code does not implement. At least 8 break-level mismatches, including names and shapes of the primary public APIs. A few items (algorithm unification, hold semantics, badge component) match.

## Open questions

- Where does `ViewportAdaptiveConfig` live in full? It is re-exported from `types/viewport` (Viewport.tsx:26) but the type definition was outside the audit claim list — confirm field names (`enabled`, `targetFps`, `interactionDownsample`, `alwaysActive`, `gateOnAccumOnly`, `graceMs`?) before the rewrite.
- `store/slices/viewportSlice.ts` is referenced by both Viewport.tsx (interaction subscription) and ViewportModeControls.tsx (`RENDER_SCALE_STEPS` import) but is outside the audit claim — it owns the actual `reportFps`/`holdAdaptive`/`setAdaptiveConfig`/`setAdaptiveSuppressed`/`setResolutionMode`/`setFixedResolution`/`setRenderScale`/`setCanvasPixelSize` implementations.
- `engine-gmt/engine/managers/UniformManager.ts` is named as the worker-side caller of `tickAdaptiveResolution` (AdaptiveResolution.ts:5-6) — out of scope but the contract for `selfResized` ownership lives there.
- `engine/worker/ViewportRefs.ts` owns `setMouseOverCanvas`/`isMouseOverCanvas` (used by ViewportFrame.tsx:44 and AdaptiveResolutionBadge.tsx:27) — needs its own audit to confirm it's still ref-based vs store-based.
- `data/constants.ts` defines `DEFAULT_HARD_CAP` and `MOBILE_HARD_CAP` used by HardwareDetection.ts:3 — confirm their values for tier semantics.
- `types/viewport.ts` defines `HardwareProfile` (HardwareDetection.ts:2) — out of audit; needed to document the full caps shape.
- `components/viewport/CompositionOverlay.tsx` is rendered inside `ViewportFrame` (ViewportFrame.tsx:43, 206-209) — composition guides are an undocumented co-mounted overlay, possibly worth treating as part of the viewport subsystem.
- Are there any other callers of `installViewport`/`setRenderScaleSource` beyond GMT? The plugin clearly accommodates multi-app use; an app-side audit would confirm which apps register a custom render-scale source.
