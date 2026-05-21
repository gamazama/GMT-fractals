---
source: engine/AdaptiveResolution.ts
lines: 286
last_verified_sha: 906da1c4e2db811f84bcb8b79d8266b6f726a079
additional_sources:
  - engine/HardwareDetection.ts
  - engine/plugins/Viewport.tsx
  - engine/plugins/viewport/ViewportFrame.tsx
  - engine/plugins/viewport/ViewportModeControls.tsx
  - engine/plugins/viewport/FixedResolutionControls.tsx
  - engine/plugins/viewport/AdaptiveResolutionBadge.tsx
audited: 2026-05-20T09:01:29Z
audited_by: claude-opus-4-7
public_api:
  - AdaptiveResolutionState
  - AdaptiveResolutionInput
  - AdaptiveResolutionResult
  - createAdaptiveResolutionState
  - getAdaptiveGrace
  - tickAdaptiveResolution
  - detectHardwareProfile
  - detectHardwareProfileMainThread
  - type ViewportAdaptiveConfig
  - RenderScaleSource
  - setRenderScaleSource
  - getRenderScaleSource
  - installViewport
  - uninstallViewport
  - viewport
  - useQualityFraction
  - useViewportSize
  - useViewportFps
  - useViewportInteraction
  - useViewportMode
  - ViewportFrame
  - ViewportFrameProps
  - ViewportModeControls
  - ViewportModeControlsProps
  - FixedResolutionControls
  - AdaptiveResolutionBadge
  - AdaptiveResolutionBadgeProps
depends_on:
  - e02-tick-registry
---

# Adaptive Resolution + Hardware Detection + Viewport

This subsystem owns three layered concerns that together govern how an app's render targets are sized and how aggressively their pixel count is reduced under load. The pure decision module (`engine/AdaptiveResolution.ts`) is an FPS-driven downsample-factor calculator with no DOM, no THREE, and no worker assumptions; it is shared verbatim between the GMT worker's `UniformManager` and the main-thread `viewportSlice`. `engine/HardwareDetection.ts` produces a one-shot `HardwareProfile` (tier / mobile / Float32 / loop caps) consumed at boot to bias the adaptive defaults. `engine/plugins/Viewport.tsx` plus the four components under `engine/plugins/viewport/` form the app-facing surface: the `viewport.*` imperative API, five granular React hooks, the authoritative `ResizeObserver`, the Fixed/Full mode chrome, and the on/off badge.

## Public API

### Pure decision module — `engine/AdaptiveResolution.ts`

| Symbol | Kind | Summary |
|---|---|---|
| `AdaptiveResolutionState` | interface | Per-caller mutable state — `scale`, `activeFrames`, `firstWindow`, `stillFps`, `lastActivityTime`, `prevAccumCount`, `selfResized`, `fullResAccum` (engine/AdaptiveResolution.ts:48-68). |
| `AdaptiveResolutionInput` | interface | Per-tick input — `now`, `accumCount`, `isInteracting`, `mouseOverCanvas`, `dynamicScaling`, `adaptiveTarget`, `interactionDownsample` plus optional `minQuality`, `alwaysActive`, `holdUntilMs`, `suppressed`, `accumThreshold`, `gateOnAccumOnly` (engine/AdaptiveResolution.ts:70-111). |
| `AdaptiveResolutionResult` | interface | Per-tick output — `scale` (downsample factor, 1 = full res), `needsAdaptive`, `grace` (engine/AdaptiveResolution.ts:113-122). |
| `createAdaptiveResolutionState()` | function | Allocate a fresh state object — `scale: 1`, `stillFps: 60`, everything else zero/false (engine/AdaptiveResolution.ts:124-138). |
| `getAdaptiveGrace(stillFps)` | function | FPS-scaled grace period in ms: `clamp(2000 / max(1, stillFps), 100, 3000)` — 1 fps → 2 s, 30 fps+ → 100 ms (engine/AdaptiveResolution.ts:142-144). |
| `tickAdaptiveResolution(state, input)` | function | The whole algorithm. Mutates `state` in place, returns `{scale, needsAdaptive, grace}` (engine/AdaptiveResolution.ts:146-286). |

### Hardware probe — `engine/HardwareDetection.ts`

| Symbol | Kind | Summary |
|---|---|---|
| `detectHardwareProfile(gl?)` | function | Build a `HardwareProfile`. With a WebGL2 context, probes Float32 render-target support via a 1×1 RGBA32F framebuffer; without one, falls back to the mobile heuristic (engine/HardwareDetection.ts:13-56). |
| `detectHardwareProfileMainThread()` | function | Thin wrapper that calls `detectHardwareProfile()` with no GL context, for the main thread (engine/HardwareDetection.ts:62-64). |

The `HardwareProfile` shape itself is defined in `types/viewport.ts` (see followup q-045) and is not re-exported from this module.

### Plugin entry — `engine/plugins/Viewport.tsx`

| Symbol | Kind | Summary |
|---|---|---|
| `type ViewportAdaptiveConfig` | re-export | Re-exported from `types/viewport` so existing `@engine/viewport` imports still resolve (engine/plugins/Viewport.tsx:26). |
| `RenderScaleSource` | interface | `{ use(): [number, (v: number) => void]; steps: readonly number[]; formatLabel?: (v: number) => string }` — pluggable source for the in-canvas render-scale pill (engine/plugins/Viewport.tsx:43-51). |
| `setRenderScaleSource(source)` | function | Register or clear the pill's source; called once at boot by apps whose render-scale knob is not `viewportSlice.renderScale` (engine/plugins/Viewport.tsx:58-60). |
| `getRenderScaleSource()` | function | Internal accessor used by the mode-controls component to pick `DefaultScalePill` vs `CustomScalePill` (engine/plugins/Viewport.tsx:63). |
| `installViewport(options?)` | function | Install once at boot. `options: Partial<ViewportAdaptiveConfig>` is merged into the store via `setAdaptiveConfig` on every call regardless of the idempotency guard (engine/plugins/Viewport.tsx:72-95). |
| `uninstallViewport()` | function | Tear-down for tests / hot-reload (engine/plugins/Viewport.tsx:98-102). |
| `viewport` | object | Imperative façade: `frameTick()`, `reportFps(fps)`, `holdAdaptive(durationMs?)`, `suppressAdaptive(v)`, `setConfig(cfg)` — all delegate to the store (engine/plugins/Viewport.tsx:106-139). |
| `useQualityFraction()` | hook | Subscribe to the scalar `qualityFraction` (engine/plugins/Viewport.tsx:145-146). |
| `useViewportSize()` | hook | `{ canvasPixelSize, dpr }` (engine/plugins/Viewport.tsx:149-153). |
| `useViewportFps()` | hook | `{ fps, fpsSmoothed }` (engine/plugins/Viewport.tsx:156-160). |
| `useViewportInteraction()` | hook | Boolean `isUserInteracting` (engine/plugins/Viewport.tsx:164-165). |
| `useViewportMode()` | hook | `{ mode, fixedResolution }` (engine/plugins/Viewport.tsx:168-172). |
| `ViewportFrame`, `ViewportFrameProps` | component + props | Re-exported (engine/plugins/Viewport.tsx:182-183). |
| `ViewportModeControls`, `ViewportModeControlsProps` | component + props | Re-exported (engine/plugins/Viewport.tsx:184-185). |
| `FixedResolutionControls` | component | Re-exported (engine/plugins/Viewport.tsx:186); the props interface is intentionally not exported. |
| `AdaptiveResolutionBadge`, `AdaptiveResolutionBadgeProps` | component + props | Re-exported (engine/plugins/Viewport.tsx:187-188). |

### Component leaves — `engine/plugins/viewport/*`

| Symbol | Defined in | Role |
|---|---|---|
| `ViewportFrame` (engine/plugins/viewport/ViewportFrame.tsx:87) | `engine/plugins/viewport/ViewportFrame.tsx` | The host component; owns the authoritative `ResizeObserver` and the Fixed/Full layout split. |
| `ViewportFrameProps` (engine/plugins/viewport/ViewportFrame.tsx:46) | same | `children`, `showModeControls`, `shouldResize`, `className`, `innerClassName`, `fixedPadding`, `outerOverlay`. |
| `ViewportModeControls` (engine/plugins/viewport/ViewportModeControls.tsx:96) | `engine/plugins/viewport/ViewportModeControls.tsx` | Top-left mode chrome plus the top-centre render-scale pill (Fixed only). |
| `ViewportModeControlsProps` (engine/plugins/viewport/ViewportModeControls.tsx:24) | same | `top`, `left`, `availableWidth`, `availableHeight`. |
| `FixedResolutionControls` (engine/plugins/viewport/FixedResolutionControls.tsx:22) | `engine/plugins/viewport/FixedResolutionControls.tsx` | Drag-resizable pixel-dimensions label + aspect-ratio preset menu + Custom dialog + Fill button. |
| `AdaptiveResolutionBadge` (engine/plugins/viewport/AdaptiveResolutionBadge.tsx:41) | `engine/plugins/viewport/AdaptiveResolutionBadge.tsx` | Four-state pill (Off / Locked / Auto / Always). |
| `AdaptiveResolutionBadgeProps` (engine/plugins/viewport/AdaptiveResolutionBadge.tsx:36) | same | `{ className? }`. |

`ViewportAdaptiveConfig`'s canonical seven-field roster (`enabled`, `targetFps`, `minQuality`, `interactionDownsample`, `activityGraceMs`, `alwaysActive`, optional `engageOnAccumOnly`) lives in `types/viewport.ts` per followup q-040; the field names in the plugin's installer signature are the same.

## Architecture

### The pure decision module

- `engine/AdaptiveResolution.ts` is the single source of truth for the FPS-feedback algorithm. The header comment names both callers: the GMT worker's `UniformManager` and the main-thread `viewportSlice` (engine/AdaptiveResolution.ts:1-13).
- Inputs in, decision out. The module owns no buffer; the caller owns resize, accumulation reset, and quality application (engine/AdaptiveResolution.ts:11-13, 43-46).
- State is mutated in place each tick to avoid per-frame allocations (engine/AdaptiveResolution.ts:43).
- Suppression is the highest-priority short-circuit: forces `scale = 1.0`, clears active state, returns `needsAdaptive = false` (engine/AdaptiveResolution.ts:159-167).
- Activity tracking has two triggers: explicit `isInteracting` (gated off in `gateOnAccumOnly` mode), and an external accumulation reset (`accumCount < prevAccumCount && !selfResized`) (engine/AdaptiveResolution.ts:176-182).
- Deep-accumulation protection: only full-res samples count (`fullResAccum = accumCount` iff `scale <= 1.001`); the threshold defaults to `clamp(round(stillFps), 8, 50)` and is overridable via `accumThreshold` (engine/AdaptiveResolution.ts:191-205).
- Grace period scales inversely with `stillFps`: 1 fps → 2 s, 30 fps+ → 100 ms (engine/AdaptiveResolution.ts:142-144).
- Adaptive engagement formula: `dynamicScaling && !isDeepAccumulation && (alwaysActive || activitySignal)`. In normal mode `activitySignal = (isInteracting || !mouseOverCanvas || timeSinceActivity < grace)`; in `gateOnAccumOnly` it collapses to `timeSinceActivity < grace` (engine/AdaptiveResolution.ts:216-219).
- Smart-adaptive seeding: when `activeLast === 0`, jump to `sqrt(adaptiveTarget / stillFps)` (clamped to `[1, maxScale]`) if `stillFps < adaptiveTarget`, else 1.0; flip `firstWindow = true` (engine/AdaptiveResolution.ts:227-239).
- First sample window: 200 ms, EMA blend = 1.0 (jump to ideal). Subsequent windows: 500 ms, blend = 0.3 (smooth) (engine/AdaptiveResolution.ts:242-247).
- `holdUntilMs` only blocks further downscale (`nextScale > state.scale`); upscale is always permitted during hold (engine/AdaptiveResolution.ts:250-256).
- Manual mode (`adaptiveTarget <= 0`) sets `state.scale = max(1.0, interactionDownsample || 2.0)` (engine/AdaptiveResolution.ts:261-264).
- Settled-state branch tracks `stillFps` via 500 ms sample windows with a `>2 frame` guard, then resets `scale = 1.0` and the active counters so the next disturbance re-seeds (engine/AdaptiveResolution.ts:268-283).

### Hardware detection

- `engine/HardwareDetection.ts:13-56` builds the profile from two probes: a `matchMedia('(pointer: coarse)') || innerWidth < 768` mobile heuristic (engine/HardwareDetection.ts:14-16) and an optional Float32 framebuffer round-trip (engine/HardwareDetection.ts:20-34).
- Tier derivation: `low` = mobile && !float32; `mid` = mobile; `high` = otherwise (engine/HardwareDetection.ts:41-44).
- Caps shape (consumed by the shader-precision and iteration-cap layers): `precisionMode = isMobile ? 1 : 0`, `bufferPrecision = supportsFloat32 ? 0 : 1`, `compilerHardCap = isMobile ? MOBILE_HARD_CAP : DEFAULT_HARD_CAP` (engine/HardwareDetection.ts:50-55).
- Per followup q-044, `DEFAULT_HARD_CAP = 2000` and `MOBILE_HARD_CAP = 256` (units: raymarch/DE loop iteration count, *not* pixels). `compilerHardCap` flattens both mobile tiers to the same 256 ceiling.
- Per followup q-045, the `HardwareProfile` interface itself lives at `types/viewport.ts:101-110` and has four top-level fields (`tier`, `isMobile`, `supportsFloat32`, `caps`) — `supportsFloat32` and `caps.bufferPrecision` are redundant signals flagged as a drift risk by that followup.

### Plugin install + render-scale source

- `installViewport(options?)` is idempotent via the module-scope `_installed` flag, but `setAdaptiveConfig(options)` runs on *every* call so callers can reconfigure without uninstalling (engine/plugins/Viewport.tsx:30-31, 72-95).
- The plugin's only direct store subscription is on `isUserInteracting`. On the false→true edge it imperatively drops `qualityFraction` to `cfg.interactionDownsample` *only* when `cfg.targetFps === 0` (manual mode); in smart mode the next `reportFps` tick handles seeding (engine/plugins/Viewport.tsx:77-94).
- The render-scale source indirection (engine/plugins/Viewport.tsx:34-63) exists so the in-canvas pill can target different store fields per app. The default reads/writes `viewportSlice.renderScale`; GMT registers a custom source pointing at `quality.aaLevel`. Per followup q-047, only `app-gmt/main.tsx:152` calls `setRenderScaleSource` today; `fluid-toy` and `fractal-toy` use the default.
- `viewport.frameTick()` is sugar for `reportFps(0)`; the slice's `reportFps` is the unified entry point and computes fps internally from a rolling timestamp buffer when called with 0 (engine/plugins/Viewport.tsx:106-118).
- `viewport.holdAdaptive(durationMs?)` defaults to `adaptiveConfig.activityGraceMs * 4` per followup q-041 (the inline comment at engine/plugins/Viewport.tsx:121 still says `adaptiveConfig.graceMs` — a stale name).
- React hooks at engine/plugins/Viewport.tsx:145-172 are deliberately granular (five separate selectors) rather than one bundled `useViewport()`, so each consumer re-renders only when its tracked slice of state changes.

### ViewportFrame: authoritative ResizeObserver + Fixed/Full layout

- `ViewportFrame` is the sole authoritative writer of `canvasPixelSize` (engine/plugins/viewport/ViewportFrame.tsx:103-136). It observes the outer flex-filled div; `dpr` is read from `window.devicePixelRatio` per push and floored.
- Mount-time seed: `getBoundingClientRect()` is read once immediately in addition to the observer, so consumers see a non-zero size before the first ResizeObserver callback fires (engine/plugins/viewport/ViewportFrame.tsx:126-129).
- `shouldResize` predicate gates the *store write* only — the local `viewportSize` state still updates so layout maths stay current even when writes are suppressed (engine/plugins/viewport/ViewportFrame.tsx:108-115).
- `onMouseEnter` / `onMouseLeave` is the only place `setMouseOverCanvas` is called from this subsystem; the in-source comment at engine/plugins/viewport/ViewportFrame.tsx:180-189 documents the legacy bug this fix addressed.
- Fixed-mode inner container forces `boxSizing: 'content-box'` to defeat Tailwind preflight's `border-box`. Without this, the 1 px outline at engine/plugins/viewport/ViewportFrame.tsx:161 would shrink saved images by 2 px in each dimension (engine/plugins/viewport/ViewportFrame.tsx:146-163).
- Fixed-mode fit scale: `min(1.0, (viewportW - fixedPadding) / fw, (viewportH - fixedPadding) / fh)` — never upscales above 1.0 (engine/plugins/viewport/ViewportFrame.tsx:142-144).
- `CompositionOverlay` is rendered as an in-frame sibling of `children` inside the inner sized container; `outerOverlay` is rendered as a sibling of the inner container, so it stays viewport-relative and does not shrink in Fixed mode (engine/plugins/viewport/ViewportFrame.tsx:200-223). Followup q-046 documents the composition-overlay subsystem in full; treat it as part of this surface.

### ViewportModeControls + render-scale pill

- The pill is rendered only in Fixed mode, top-centred; Full mode shows just the "Fixed" mode-switch button (engine/plugins/viewport/ViewportModeControls.tsx:107-152).
- `RenderScaleControl` picks `DefaultScalePill` vs `CustomScalePill` once and never conditionally calls hooks, because `source.use()` is itself a hook (engine/plugins/viewport/ViewportModeControls.tsx:42-45 comment, 75-94).
- Default steps come from `RENDER_SCALE_STEPS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0]` in `store/slices/viewportSlice.ts:73` (per followup q-041); custom sources supply their own steps.

### FixedResolutionControls

- Drag affordance is a deliberate axis-inversion: up/right by 4 px per step (coarse) plus left/right by 20 px per step (fine), summed and multiplied by 8 px-per-step. Aspect ratio is locked to the drag-start `startW/startH` (engine/plugins/viewport/FixedResolutionControls.tsx:65-83). The title attribute at engine/plugins/viewport/FixedResolutionControls.tsx:142 documents the inversion to users.
- Aspect-ratio preset application keeps a 40 px padding around the available area, fits by height when `screenRatio > targetRatio` and by width otherwise; `'Max'` ignores the ratio entirely (engine/plugins/viewport/FixedResolutionControls.tsx:96-127).
- All `snap8(...)` rounding goes through `utils/resolutionUtils`. Width is the input axis; height is derived from aspect and then snapped to 8 independently (engine/plugins/viewport/FixedResolutionControls.tsx:80-82).
- The Custom dialog's keydown listener uses a `latestRef` to keep `keydown` pinned with a stable empty dep array while still reading current state (engine/plugins/viewport/FixedResolutionControls.tsx:202-216).

### AdaptiveResolutionBadge

- Reads `adaptiveConfig` + `adaptiveSuppressed` from the store and consults `isMouseOverCanvas()` (a ref, not a selector — see Invariants) to pick between Off / Locked / Auto / Always visuals (engine/plugins/viewport/AdaptiveResolutionBadge.tsx:42-82).
- Click handler: when re-enabling and `targetFps <= 0`, it seeds `targetFps = 30` so "turn adaptive on" never lands the user in manual mode (engine/plugins/viewport/AdaptiveResolutionBadge.tsx:50-60).

## Invariants

- **Caller owns `selfResized`.** The caller MUST set `state.selfResized = true` when it resizes its renderer in response to `result.scale` changing — otherwise its own accumulation reset is read as scene activity and adaptive re-engages immediately (engine/AdaptiveResolution.ts:43-46, 176-182). The module auto-clears the flag every tick (engine/AdaptiveResolution.ts:165, 182), so the caller never has to clear it; the contract is single-tick-lifetime. Per followup q-042 the only writer in dev/ today is `engine-gmt/engine/managers/UniformManager.ts:137`; the main-thread `viewportSlice` does not need it because it does not synchronously reset accumulation in response to its own scale changes.
- **`state.scale` is bounded `[1.0, 1 / max(0.01, minQuality)]`.** The ceiling is applied on every smart-mode assignment (engine/AdaptiveResolution.ts:151-152, 230-231, 249).
- **`gateOnAccumOnly` disables BOTH the `isInteracting` activity write AND the `isInteracting || !mouseOverCanvas` clauses of `activitySignal`.** Used by fluid-toy because unrelated UI drags do not invalidate its accumulator (engine/AdaptiveResolution.ts:176, 216-219).
- **`alwaysActive` bypasses `mouseOverCanvas` and the grace window but does NOT bypass deep-accum or `suppressed`.** Live sims still go to full res when the user has earned a long-accumulated result and during export flows (engine/AdaptiveResolution.ts:219).
- **`holdUntilMs` only blocks downscale.** The comparison is strict `nextScale > state.scale`; upscale is always permitted during the hold (engine/AdaptiveResolution.ts:251-256).
- **`fullResAccum` resets to 0 whenever `scale > 1.001`.** Deep-accumulation protection only re-activates after the renderer has returned to full res long enough to accumulate again (engine/AdaptiveResolution.ts:191-195).
- **`installViewport` is idempotent on its subscription wiring, but `setAdaptiveConfig` runs every call.** A second `installViewport({ targetFps: 60 })` will not double-subscribe, but the config WILL be applied (engine/plugins/Viewport.tsx:73-75).
- **`mouseOverCanvas` is a ref, not a Zustand selector.** Per followup q-043, `setMouseOverCanvas` / `isMouseOverCanvas` in `engine/worker/ViewportRefs.ts` are backed by a module-scope `let _mouseOverCanvas = false`. This is intentional: the adaptive-resolution hot path polls every frame and must not trigger React reconciliation on hover changes. The badge therefore does NOT re-render automatically when the mouse crosses the canvas — only on the next adaptive state change.
- **`ViewportFrame`'s `useLayoutEffect` intentionally omits `shouldResize` from its dep array** (`eslint-disable-next-line react-hooks/exhaustive-deps`). The predicate must therefore be ref-stable or work via captured closure (engine/plugins/viewport/ViewportFrame.tsx:132-136).
- **HardwareDetection is not cached.** Each `detectHardwareProfile(gl)` call allocates and deletes a GL framebuffer + texture. It is safe to call repeatedly but not free; callers should detect once at boot (engine/HardwareDetection.ts:6-8 comment, 22-34).
- **`name` (FixedResolutionControls drag) inverts the axis intentionally.** Dragging LEFT or UP increases size; the inversion is documented in the title at engine/plugins/viewport/FixedResolutionControls.tsx:142.
- **The `RenderScaleControl` indirection (DefaultScalePill vs CustomScalePill) is load-bearing.** `source.use()` is a hook and must not be called conditionally; the two-component split lets React see a stable hook tree (engine/plugins/viewport/ViewportModeControls.tsx:42-45 comment).

## Interactions with other subsystems

- **Tick registry (e02-tick-registry).** `viewport.frameTick()` is meant to be called once per frame; in apps that use the bundled `<RenderLoopDriver />` it lands inside a registered tick. There is no hard contract that the call live in a specific phase — `reportFps` is a state-write, not a phase-sensitive read.
- **Engine store / viewportSlice.** Per followup q-041, `store/slices/viewportSlice.ts` owns the implementations of `reportFps`, `holdAdaptive`, `setAdaptiveConfig`, `setResolutionMode`, `setFixedResolution`, `setRenderScale`, `setCanvasPixelSize` (and the `RENDER_SCALE_STEPS` constant). `setAdaptiveSuppressed` lives on `store/slices/renderControlSlice.ts`; `viewportSlice.reportFps` reads `state.adaptiveSuppressed` but does not own it.
- **GMT worker — `engine-gmt/engine/managers/UniformManager.ts`.** Per followup q-042, this is the second caller of `tickAdaptiveResolution`. It calls every frame from `syncFrame()` and is the only writer of `selfResized` in dev/, set at `engine-gmt/engine/managers/UniformManager.ts:137` immediately before `pipeline.resetAccumulation()`.
- **App boot — `hooks/useAppStartup.ts`.** Per followup q-083, this is where mobile auto-pick / adaptive-resolution overrides are applied at boot. The hook is owned by `a01-boot-shell`; this subsystem only consumes the resulting `HardwareProfile`.
- **Three host apps.** Per followup q-047, `app-gmt/main.tsx:136`, `fluid-toy/main.tsx:91`, and `fractal-toy/main.tsx:63` all call `installViewport(...)` with their own tuned configs. Only `app-gmt/main.tsx:152` registers a custom render-scale source. `fluid-toy` is the only caller using `engageOnAccumOnly: true`.
- **Composition overlay — `components/viewport/CompositionOverlay.tsx`.** Per followup q-046, `ViewportFrame` mounts this overlay unconditionally inside its inner sized container (engine/plugins/viewport/ViewportFrame.tsx:206-209); it returns `null` when the overlay type is `'none'`, so the runtime cost is zero when disabled. State for the overlay lives on the engine-core `uiSlice`; controls live in `components/CompositionOverlayControls.tsx`. Both GMT and fluid-toy's View Manager footer mount the controls; the overlay itself ships with every app.

## Known issues / Phase 2 carry-in

- **Survey field-name drift on `ViewportAdaptiveConfig`.** Per followup q-040 (carry-in `review-#1`/`q-040`), the e06 survey listed `graceMs` and `gateOnAccumOnly`, but the canonical type is `activityGraceMs` and `engageOnAccumOnly`, and the survey missed `minQuality` (required, default 0.25). The seven-field roster in this doc follows q-040, not the survey. Note that the inline JSDoc at engine/plugins/Viewport.tsx:121 still says "graceMs" — a stale source-comment, not a real public-API name.
- **`supportsFloat32` and `caps.bufferPrecision` are redundant signals.** Per followup q-045, the boolean and the enum carry the same information; either could be derived from the other. Drift risk if one is ever mutated independently.
- **`types/viewport.ts` is misnamed-by-scope.** Per followup q-045, it owns not just viewport types but `HardwareProfile`, `ScalabilityState`, and the full `SUBSYSTEM_*` / `SCALABILITY_PRESETS` tables. File-structure cleanup candidate.
- **Mobile-detect heuristic is duplicated.** `engine/HardwareDetection.ts:14-16` and `hooks/useMobileLayout.ts:5-7` each carry an independent copy of `matchMedia('(pointer: coarse)') || innerWidth < 768`. Per followup q-083 they are independent; if either threshold changes, the other will silently drift.
- **`engine-gmt/engine/HardwareDetection.ts` duplicates `engine/HardwareDetection.ts`.** Per followup q-044's related findings, this is the recurring duplicate-module-state pattern across the engine/engine-gmt fork.
- **`reportFps` throttle asymmetry.** Per followup q-041 related-findings, when quality crosses the 5 % delta threshold but the 500 ms sample-stamp is not yet due, `_lastStateUpdateMs` is not updated. Rapid quality crossings can therefore write `qualityFraction` every frame without updating `fps` / `fpsSmoothed`. Probably fine (HUD-only) but worth noting.
- **No `setAdaptive` / `setMode` / `onResize` / `onQualityChange` / `onModeChange` / `useViewport` / `<ViewportArea canvasSlot>` / `<PerformanceWarning>`.** None of the planned-but-not-built surface from `docs/engine/10_Viewport.md` exists in code. Apps that need imperative mode/resolution changes use the store actions directly; consumers subscribe via Zustand selectors. The five granular hooks plus the `viewport` imperative façade are the entire React-facing API.

## Historical context

This doc supersedes `docs/engine/10_Viewport.md` for current API and invariants. The original is preserved for design rationale and aspirations:

- The 80 %/20 % framing: size modes / DPR / adaptive are shared across apps; what "reduce quality" *means* is app-specific (GMT lowers DPR, toy-fluid lowers sim grid, fractal-toy lowers internal render scale).
- The full audit-table classification methodology (GENERIC / SEMI-GENERIC / fractal-specific / app-specific) that mapped each pre-extraction GMT symbol onto a plugin destination.
- The GMT-vs-toy-fluid duplication story that motivated extracting the viewport plugin in the first place.
- Rejected alternatives: `qualityFraction` as an enum (continuous `[0, 1]` is the chosen shape); plugin-creates-canvas (canvas ownership stays with the app); plugin bakes mobile detection (kept separate as a future `@engine/environment` plugin).
- The six-step extraction sequence, intended as a plan document rather than a description of the current shape.
- The future `@engine/environment` plugin scope: `isMobile`, `isFirefox`, `maxGPUTextureSize`, `hardwareConcurrency`, touch-vs-mouse. Today these signals are still resolved ad-hoc (`HardwareDetection.ts`, `useMobileLayout.ts`); the plugin has not landed.

The doc's adaptive-algorithm-unification claim (the pure module in `engine/AdaptiveResolution.ts` shared with the GMT worker's `UniformManager.syncFrame`) is the one piece that matches today's code exactly; everything else in its API tables describes a design that was never built. See the e06 survey at `plans/doc-audit-state/survey/e06-adaptive-resolution.md:111-131` for the full drift table.
