# GMT Development Changelog (v0.9.3 dev)

Chronological log of significant changes during the v0.9.3 development cycle (engine-extraction trunk; merges to `main` once stable).

## 2026-04-30

### Bucket render: redesigned panel + UI primitives

**User-facing**
- The High Quality Render popover no longer covers the canvas while a render is in flight. When you hit Export the panel collapses to a compact pill — same anchor under the topbar icon — that just shows the progress bar plus a tile counter, elapsed time, and an **ETA range** (±10%, computed locally). Stop button stays one click away. Setup-side controls, which used to dim out behind the rendering view, are simply gone until the render finishes.
- Action buttons (Refine / Preview / Export / Stop / Match Viewport) now use the standard GMT button style, matching the rest of the topbar and AutoFeaturePanel chrome.
- New **Ratio** dropdown beside Width/Height. Pick *Free*, or any of the standard aspect ratios (1:1, 16:9, 21:9, 4:3, 4:5, 9:16, 2.35:1, 2:1) — editing one dimension recomputes the other. The same ratio list now drives the viewport "fit to window" dropdown, the Quality > Resolution Ratio dropdown, and this one — they're all sourced from a single module.
- Output Size **Preset** list expanded: SVGA, Skybox sizes, three 21:9 sizes (Ultrawide 2560×1080, UWQHD 3440×1440, 5K2K 5120×2160), and additional square presets are now available everywhere the resolution dropdown appears (Quality > Resolution and bucket render share the list).
- Tile Grid laid out as a single row (`Columns [N] × Rows [M]`); panel itself is 32 px narrower.
- Slider helper text in the bucket panel now uses the same `<Hint>` component as the rest of the app, so the global hint-toggle hotkey hides them along with everything else.

**Mechanism**
- New `dev/data/resolutionPresets.ts` — single source for `ASPECT_RATIOS` (viewport fit-to-window), `ASPECT_LOCK_OPTIONS` (W/H ratio-lock dropdowns; Free + 8 ratios), and `RESOLUTION_PRESETS` (18 pixel sizes, union of what bucket and Quality previously had separately). Three call sites now import from one module: `engine/plugins/viewport/FixedResolutionControls.tsx`, `engine-gmt/components/panels/quality/QualityRenderControls.tsx`, `engine/plugins/topbar/BucketRenderPanel.tsx`.
- New `dev/components/Hint.tsx` — extracted from `AutoFeaturePanel`'s local `renderHint` helper. Reads `showHints` itself, so callers don't need to gate the render. AutoFeaturePanel's 5 `renderHint(...)` call sites now use `<Hint>` directly; the wrapper helper was deleted.
- New `dev/components/NumberInput.tsx` — labeled `DraggableNumber` with the standard `h-6 bg-black/40 rounded border` chrome that was inlined 6× across BucketRenderPanel and QualityRenderControls. Both files now use the shared component.
- New `dev/utils/resolutionUtils.ts` exports `snap8(n, min=64)` — the GPU-friendly multiple-of-8 rounder that previously appeared inline in three files (BucketRenderPanel, QualityRenderControls, FixedResolutionControls).
- `calcEtaRange(elapsedSec, done, total)` consolidated in `dev/components/timeline/exportHelpers.ts` (alongside `formatTimeWithUnits`). Was triplicated in `engine-gmt/.../exportRunner.ts`, `fluid-toy/.../exportRunner.ts`, and inline in BucketRenderPanel; all four sites now import the same function.
- `BucketRenderPanel`'s `BUCKET_STATUS` event handler now performs change-detection before calling `setProgress` / `setTileInfo`, so engine-rate status events don't trigger a React re-render every tick when nothing has actually moved.
- `BucketRenderPanel`'s match-viewport-aspect `useEffect` had no dependency array and was running every render. Now declares `[matchViewportAspect, outputWidth, outputHeight, viewportPixels]` and reads `viewportPixels` from the existing memo instead of re-grabbing store state inside the effect body.

Docs: [docs/engine/05_Shared_UI.md](engine/05_Shared_UI.md) catalog updated with `<Hint>` and `<NumberInput>`; help topic `bucket.render` updated to describe the rendering view's tile/elapsed/ETA stat strip and the new Ratio dropdown.

### Undo: per-scope stacks (camera/param no longer conflate)

**User-facing**
- Pressing Ctrl+Z to undo a parameter change reliably undoes a parameter change. Previously, if a camera gesture had landed on top of the shared undo stack (easy to trigger when reaching for a slider right after orbiting), Ctrl+Z would roll back the camera move instead. Ctrl+Shift+Z still owns camera undo; Ctrl+Z over the timeline still owns animation undo.
- The Camera menu's "Undo Move" / "Redo Move" items now enable/disable based on whether a camera move actually exists to undo, rather than lighting up whenever any parameter edit happens to be in history.

**Mechanism**
- `historySlice` split from one unified stack with scope tags into four typed stacks: `paramUndoStack` / `paramRedoStack` / `cameraUndoStack` / `cameraRedoStack`. `MAX_STACK = 50` per lane independently.
- `scope` is now required on `undo` / `redo` / `canUndo` / `canRedo` / `peekUndo` / `peekRedo` — the unscoped form is gone. Type signature forces every call site to declare which lane.
- New typed entry points: `beginParamTransaction()`, `endParamTransaction()`, `pushCameraTransaction(state: CameraState)`. Replaces the runtime-overloaded `handleInteractionStart(mode | CameraState)`. Old name kept as a back-compat shim.
- `engine/plugins/Undo.tsx`: global Ctrl+Z / Ctrl+Y / Mod+Shift+Z hotkeys and the topbar UndoButton/RedoButton all pass `'param'`. Camera Ctrl+Shift+Z handled by app-gmt's priority-10 `gmt.undoCameraMove` registration as before.
- `engine-gmt/topbar.tsx`: Camera menu's "Undo Move" / "Redo Move" disabled-checks now use `canUndo('camera')` / `canRedo('camera')` (were reading the unified stack length — same bug class).
- `app-gmt/AppGmt.tsx`: `GmtNavigation.onStart` calls `pushCameraTransaction(s)` directly. The `as any` cast is gone; the entry point is properly typed `(state: CameraState) => void`.

Docs: [06_Undo_Transactions.md](engine/06_Undo_Transactions.md) rewritten; [20_Fragility_Audit.md § F2b](engine/20_Fragility_Audit.md#f2b--undo-lane-conflation) updated with the regression-then-fix history; [07_Shortcuts.md](engine/07_Shortcuts.md) keybinding table updated.

## 2026-04-29

### Fluid-toy: smooth-source TSAA bake — palette + collision + motion

**User-facing**
- The fractal palette and the collision walls now look genuinely smooth as TSAA accumulates, instead of speckling at low sample counts. The fluid no longer gets driven by sub-pixel jitter noise; flow settles cleanly within a few frames.
- New "Coupling" tab layout: an **Operator** dropdown (Gradient / Curl / Direct / Temporal Δ / Hue) and a **Source** dropdown (Smooth potential / Distance estimate / Stripe average / Palette luminance / Collision mask). 5 × 5 = 25 motion configurations, with per-option hints that swap as you change the selection.
- Coupling and Palette presets calibrated for the new pipeline; old presets keep working (legacy `iterate` enum value drives Direct, `c-track` drives Temporal Δ).

**Mechanism**
- The Julia render pass now writes **smooth, mean-poolable derived quantities** instead of raw evaluator state. `outFx.rgb` carries the pre-baked palette colour (per-eval gradient lookup + interior blend), `outFx.a` carries the collision-mask iso (collision LUT × exterior). σ/√N convergence under TSAA actually delivers a smooth image — averaging raw `z` / `iters` / `minT` was averaging meaningless intermediate values at the set boundary.
- Standalone `FRAG_MASK` pass and its `progMask` / `maskTex` / `computeMask` / readback removed. Every shader that read `texture(uMask, vUv).r` now reads `.a` from the Julia outFx; the CPU mask readback blits attachment 1.
- `outMain` repurposed for **four smooth motion sources**: distance estimate, smooth potential, stripe average, dye-injection gate. Palette luminance derived in the motion shader from `outFx.rgb`. The MRT dropped from 3 attachments back to 2 (~33% bandwidth cut on the Julia pass).
- New (Operator × Source) factoring in `FRAG_MOTION`. Per-source magnitude compensation via `× 0.1 * uMaxIter` keeps legacy `forceGain` calibrations in the right ballpark.
- TSAA boolean collapsed into `tsaaSampleCap`: `1` = OFF (no jitter, no blend, downstream reads `juliaCur`), `> 1` = active, `0` = infinite.

### Fluid-toy: retire bespoke orbit, route modulation through liveMod merge

**User-facing**
- The legacy "Auto-orbit c" subsection on the Coupling tab is gone. Auto-orbit is now expressed as two normal LFO entries authored via the **Modulation panel** — full waveform / period / amplitude / phase / smoothing control per LFO, plus the ability to modulate any DDFS param (not just juliaC).
- LFOs targeting any feature param now actually drive the engine. Previously the modulation indicator on a slider would light up but the renderer kept reading the raw slice value (e.g. brush size, dye inject didn't actually modulate).

**Mechanism**
- New `applyLiveMod(slice, featureId, liveMod)` helper in `engine/typedSlices.ts`: returns a slice copy with `liveModulations` overrides applied (scalars by `featureId.field`, vec axes by `featureId.field_x`). Returns the original reference unchanged when nothing's modulated to avoid spurious re-renders.
- `useEngineSync` now wraps each slice in `useMemo(() => applyLiveMod(slice, id, liveMod))` and passes the modulated copy to the existing `sync<X>ToEngine` functions. Sync functions are unchanged from before — they just see slices that already include modulations.
- `readBrushParams` (imperative path called from pointer/RAF) reads `state.liveModulations` directly via the same helper.
- `syncJuliaToEngine` split into a slice-driven full sync + a liveMod-driven juliaC-only sync, so orbit modulation can't clobber gesture-set `engine.params.center/zoom` mid-pan.
- `presets/data.ts` legacy `orbit: { enabled, radius, speed }` migrated to `animations: orbitPair(radius, speed)` — two Sine LFOs at 90° phase. `applyRefPreset` pushes `preset.animations ?? []` into `state.animations` on every load (replaces wholesale, so swapping presets cleans up prior LFOs).
- `installModulationUI()` registers the engine's `lfo-list` widget; new "Modulation" panel in `panels.ts` hosts it via `items: [{ type: 'widget', id: 'lfo-list' }]`.
- `orbitTick.ts` deleted; `installOrbitSync()` call removed from `main.tsx`. Coupling feature drops `orbitEnabled / orbitRadius / orbitSpeed` params.

### Fluid-toy: panel restructure + dynamic dropdown hints

**User-facing**
- Panel layout split: **Left dock** = View, Fractal (hidden), Deep Zoom, Palette, Modulation, Presets. **Right dock** = Coupling, Fluid, Collision, Brush, Post-FX, Composite.
- The View panel now hosts the saved-views library at the top (replaces the old separate "View Manager" tab). 5 default saved views seeded on first install (Mandelbrot Home, Julia Classic, Julia Dendrite, Julia San Marco, Mandelbrot Seahorse Valley) so the panel isn't empty on first launch. Pan / zoom / juliaC happen on the canvas; fine-grained adjustments live on the hidden Fractal tab.
- Multi-section tabs (Coupling / Fluid / Brush / Palette / Post-FX / Composite) use section headers + filtered feature rows so related params group visually.
- Dropdown hints are now **per-option** — the small italic caption beneath each enum dropdown swaps as you change the selection. forceMode / forceSource / colorMapping (14 modes) / dyeBlend / dyeDecayMode / kind / show / toneMapping all carry contextual one-line hints.
- `julia.juliaC` is hidden when the fractal kind is Mandelbrot (Mandelbrot uses pixel coords as c — the slice value is ignored, so the slider was a no-op there).
- Retired `fluidStyle` (plain / electric / liquid) — the variants didn't actually do anything in the current shader.

**Mechanism**
- `engine/PanelManifest.ts` already supported `items: [{ type: 'section' | 'feature' | 'widget', ... }]`. Used `whitelistParams` to slice each feature into multiple sections.
- New optional `hint` field on `engine/FeatureSystem.ts:ParamOption` plus new `optionHints` parameter on `defineEnumParam`, threaded into the generated options list. `AutoFeaturePanel` finds the current option after every dropdown render and emits a small italic caption row (`text-[9px]`, gray, `break-words`).
- `dyeBlend` moved Palette → Fluid (it's a dye-mixing knob, not a colour-mapping one). `fluidStyle` enum, `FluidStyle` type, `FLUID_STYLES` export, `fluidStyle` field on `FluidParams`, default value, and `apply.ts` mapping all dropped together.
- `viewLibrary.ts` `seedDefaultViews()` runs once on install and writes hardcoded snapshots into `state.savedViews` only when the array is empty — never overwrites a user's library.

## 2026-04-28

### Fluid-toy: deep-zoom Mandelbrot/Julia, working past 1e-30

**User-facing**
- Fluid-toy now zooms past the f32 wall (~1e-7) and the f64 pan wall (~1e-15), all the way to ~1e-30 cleanly. The fractal stays sharp and the fluid keeps flowing, no quantising, no jump-back on release. Verified with a single drag-zoom from 1e-15 down to 1e-20 — smooth the whole way.
- A **Fractal panel** "Deep zoom" toggle drops the slider's hardMin from 1e-5 to 1e-300 and switches the kernel to the perturbation path. Mouse wheel + middle-drag drive deeper than the slider's range.
- Variable power (z² through z⁸) and Julia mode both supported in deep zoom; the LA / AT acceleration is still Mandelbrot+power-2 only (their step rules are d=2-specific), but the orbit-only path renders any combination.
- Pan and zoom feel right at every depth — the previous "snap to coarse grid on release" artifact is gone.

**Mechanism**
- **Reference-orbit perturbation kernel.** Worker (`fluid-toy/deepZoom/deepZoomWorker.ts`) builds a BigInt fixed-point reference orbit, packs it as RGBA32F texels, and ships it main-thread. The Julia shader runs `dz' = 2·Z·dz + dz² + dc` against the orbit instead of iterating directly — this is what unlocks zooms past f32. Adapted from FractalShark's algorithm.
- **LA + AT acceleration.** A merge-tree of linear-approximation nodes (`fluid-toy/deepZoom/laBuilder.ts`) lets the shader skip ~99% of orbit iterations in a few hundred LA steps. AT (Approximation Terms, `fluid-toy/deepZoom/atBuilder.ts`) front-loads the iteration with a polynomial expansion when the per-pixel `|dc|` is small enough. Both gated to Mandelbrot kind + power 2.
- **Double-double pan accumulator.** `fluid-toy/deepZoom/dd.ts` adds Dekker two-sum primitives. Pan / wheel / middle-zoom gestures track the centre as a `(hi, lo)` f64 pair so sub-ulp pan deltas (typical at zoom <1e-15) survive accumulation. The engine packs `(paramCenter+paramLow) − (refCenter+refLow)` into the shader uniform via DD-subtraction so the lo word reaches the GPU.
- **HPReal.fromNumber rewrite.** Previously converted via `fracPart × 2^53`, which rounded sub-1.1e-16 inputs (the typical lo word at deep zoom) to zero. Now extracts the IEEE-754 (mantissa, exp) directly and shifts to fixed-point — preserves all 53 bits regardless of magnitude. The "snap to coarse grid on release" symptom was this rounding kicking in only on orbit rebuild.
- **HDR-packed shader uniforms.** Plain f32 underflows past ~1e-38; `(mantissa, exp)` packing reaches zoom 1e-300+ at the JS→GLSL boundary.

### Fluid-toy: refactor pass — split god class + sync hooks + per-gesture files

**Mechanism (no user-facing change — pure organisation)**
- `fluid/FluidEngine.ts` 2245 → 1798 by extracting four cohesive units:
  - `DeepZoomController` — refOrbit + LA + AT GPU state, exposed as `engine.deepZoom`
  - `BloomChain` — Jimenez 2-level dual-filter chain owning its programs + FBOs
  - `GpuTimerManager` — Julia-pass GPU timer (begin/end around the draw, EWMA poll)
  - `GradientLutManager` — main + collision LUT slots
- `fluid/shaders.ts` (1706 lines) split into `fluid/shaders/{common,julia,sim,display,utility,index}.ts` grouped by render stage.
- `FluidToyApp.tsx` 372 → 214 by lifting all DDFS slice → engine pushes into `useEngineSync.ts`, and the orbit/LA/AT rebuild loop into `useDeepZoomOrbit.ts`.
- `pointer/handlers.ts` 427 → 133 dispatcher; six gestures (pan, zoom, wheel, splat, pickC, resizeBrush) in `pointer/gestures/`, sharing a tiny `GestureCtx` (refs + callbacks bag).
- `fluid-toy/CODE_MAP.md` added as the navigation index.

### engine-gmt: split RenderPopup + extract CompileScheduler + handleRenderTick

**Mechanism**
- `engine-gmt/components/timeline/RenderPopup.tsx` 1046 → 299 + 4 focused files (`types.ts`, `exportRunner.ts`, `ConfigView.tsx`, `RenderingView.tsx`). Behaviour preserved exactly — every closure dependency the runner needs is bundled into a deps object the parent constructs.
- `engine-gmt/engine/FractalEngine.ts` 933 → 711. The off-thread shader compile pipeline (9 fields + 4 methods, ~225 lines) extracted into `engine-gmt/engine/CompileScheduler.ts`. External readers (`engine.isCompiling`, `engine.hasCompiledShader`, `engine.lastCompileDuration`) become getter delegates so call sites in WorkerProxy / renderWorker / FormulaParamsWidget don't change.
- `engine-gmt/engine/worker/renderWorker.ts` 796 → 678. The 130-line per-frame tick body hoisted into `engine-gmt/engine/worker/handleRenderTick.ts` with two interfaces bundling the live refs (engine/renderer/camera/displayScene/...) and the tick hooks (incTickCount / postMsg / getShadowState).
- Verified end-to-end with `smoke:engine-gmt` (boot), `smoke:formula-switch` (preview→full hot-swap), `smoke:anim-vec2` (binder writes), `smoke:bc-drag` (pointer interaction).
- Engine cleanup plan written to `plans/engine-cleanup.md`. After hands-on review the remaining big files (rest of worker dispatch, WorkerProxy, WorkerExporter, AdvancedGradientEditor, BucketRenderer, AutoFeaturePanel) were judged not worth refactoring — they're large but cohesive, splitting would be ceremony without clarity gain. `Navigation.tsx` (1261) got an architecture comment block at the top instead of a split — same conclusion: complexity is intrinsic, comprehension help wins over mechanical extraction.

## 2026-04-27

### Fluid-toy: render-scale system replaces sim-resolution + Fixed mode + bilinear reprojection

**User-facing**
- The "Sim resolution" slider is gone. Render resolution is now driven by **mode** (Full / Fixed) × **Render scale** (segmented picker: 0.25× 0.5× 0.75× 1× 1.5× 2×) × adaptive quality. The sim grid and the canvas drawing buffer share one resolution, derived from those three knobs. One mental model instead of three.
- **Fixed mode works.** Picking Fixed (or dragging the resolution pill in the top-left) sets the canvas to a specific pixel size, letterboxed in the viewport with a centred render box. The fluid sim and fractal render at exactly those dimensions. Render scale still multiplies on top — e.g. Fixed 1920×1080 + 0.5× → renders at 960×540, displayed at 1920×1080. Previously fluid-toy ignored Fixed mode entirely; the canvas stretched to fit the window regardless and the drawing buffer never matched.
- **Resolution changes (slider, mode switch, adaptive nudge, window resize) no longer wipe dye, velocity, or fractal accumulation.** A bilinear blit reprojects everything into the new-size FBOs in one frame.
- Adaptive resolution now produces real performance gains during navigation. The Julia iteration grid, fluid sim, and canvas all scale together with `qualityFraction` — previously only canvas/bloom/refraction-post-fx were scaling.
- Default render scale is 1.0 (match CSS pixels). Retina users who want the full sharpness of their display set 2.0 explicitly; 0.5× and below are good for heavy fractals at deep iter depths.

**Mechanism**
- **`renderScale` field on viewportSlice.** [`store/slices/viewportSlice.ts`](../store/slices/viewportSlice.ts) gains `renderScale: number` (default 1.0) + `setRenderScale(v)` setter (clamps to [0.1, 4]). New `RENDER_SCALE_STEPS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0]` constant for the UI to snap to. Type added to [`types/store.ts`](../types/store.ts) `EngineStoreState`.
- **`<RenderScaleControl>` segmented picker.** Mounted inside [`engine/plugins/viewport/ViewportModeControls.tsx`](../engine/plugins/viewport/ViewportModeControls.tsx) so it sits next to the Fill / Fixed pill in the viewport's top-left. Clicking a step calls `setRenderScale`; the active step highlights.
- **One render dimension on FluidEngine.** [`fluid-toy/fluid/FluidEngine.ts`](../fluid-toy/fluid/FluidEngine.ts) drops `params.simResolution`, `params.autoQuality`, the private `simAspect` field, and the public `setSimAspect()` / `resize()` methods. New single entry point: `setRenderSize(w, h)` that sizes both the canvas drawing buffer and the sim/fractal FBOs in one call. `simW × simH` is the only resolution the engine knows about.
- **Bilinear reprojection on resolution change.** New `reallocateAt(w, h)` on FluidEngine creates fresh FBOs at the new size, blits surviving content (`dye.read`, `velocity.read`, `juliaTsaa`) through new `progCopy` (single-tap) and `progCopyMrt` (two-attachment MRT) shaders with `LINEAR` filtering, then frees the old. New `FRAG_COPY` and `FRAG_COPY_MRT` shaders in [`fluid-toy/fluid/shaders.ts`](../fluid-toy/fluid/shaders.ts). `tsaaSampleIndex` is preserved — partial accumulation continues across resolution changes without a visible reset.
- **App-level resize formula.** [`fluid-toy/FluidToyApp.tsx`](../fluid-toy/FluidToyApp.tsx) resize useEffect now reads `resolutionMode`, `fixedResolution`, `renderScale`, and `quality` from the store and computes `finalW = round(baseW × renderScale × quality)` (same for H). `baseW/H` is `canvasPixelSize / DPR` in Full mode (CSS pixels) or `fixedResolution` in Fixed mode (CSS pixels). One `engine.setRenderSize(finalW, finalH)` call per change; `engine.redraw()` immediately after to suppress the canvas-clear black flash.
- **Sim slice cleanup.** [`fluid-toy/features/fluidSim.ts`](../fluid-toy/features/fluidSim.ts) drops the `simResolution` param + slider. [`fluid-toy/presets/apply.ts`](../fluid-toy/presets/apply.ts) and `presets/data.ts` drop the field from each preset blob. Save format is early-prototype so no migration shim needed. Dead `ADAPTIVE_*` constants removed from [`fluid-toy/constants.ts`](../fluid-toy/constants.ts) — those were stub values for a fluid-side adaptive loop that never shipped (the engine-side adaptive in `viewportSlice` superseded it).

### Fluid-toy: adaptive resolution overhaul + Pause button polish

**User-facing**
- Fluid-toy adaptive resolution no longer flickers on slider drags or when moving the mouse off the canvas. Adaptive now engages **only** when the fractal accumulator is actually invalidated (camera pan/zoom, Julia c, palette mapping). Unrelated sliders (vorticity, dissipation, brush, dye colour) drag at full resolution. Once the fractal has accumulated halfway to its sample cap, adaptive locks off entirely until the next genuine fractal-invalidating change.
- Fluid simulation no longer resets on adaptive nudges. Dye and velocity persist through every quality change; only a real window resize reallocates sim FBOs.
- Black-flash on adaptive nudges is gone.
- Pause/Play button is wider, shows both icons (Play / Pause inline; the active state is bright, the other dims), and the accumulation-progress fill is more prominent — `~2×` the previous opacity plus a 1px right-edge accent line so the front of the fill reads clearly. Engine-wide change — GMT picks it up automatically.
- Pause popover sample readout (`<n>/<cap> samples`) now actually ticks. Previously stuck at `0/256` because nothing in fluid-toy reported accumulation back to the store. Default cap for fluid-toy is now 64 (was 256, GMT-sized).
- Once TSAA reaches its cap, the fractal pass is skipped each frame until any Julia-affecting param changes. The freed GPU time goes to the fluid sim.

**Mechanism**
- **Sim-grid decoupling.** [`fluid-toy/features/fluidSim.ts`](../fluid-toy/features/fluidSim.ts) no longer multiplies `simResolution` by `qualityFraction`. The sim grid runs at the user's chosen size full-time. [`fluid-toy/fluid/FluidEngine.ts`](../fluid-toy/fluid/FluidEngine.ts) gains a `simAspect` field driven by the new `setSimAspect(aspect)` method; `allocateTextures` reads it instead of `canvas.width / canvas.height`. Adaptive-quality canvas resizes (which round-trip through `Math.floor`/`Math.round` and drift the aspect by ±1 pixel) no longer shift `simW` and trip the sim FBO reallocation guard. `FluidEngine.resize()` now only touches the canvas + bloom FBOs; sim FBOs only reallocate on real window resize via `setSimAspect`.
- **Black-flash fix.** New `FluidEngine.redraw()` calls `displayToScreen()` only — re-blits the existing `juliaTsaa` + dye/velocity to the canvas without advancing the sim or re-rendering the fractal. [`fluid-toy/FluidToyApp.tsx`](../fluid-toy/FluidToyApp.tsx) calls it after `engine.resize()` so the canvas is repainted before the browser compositor reads the freshly-cleared drawing buffer. Cheaper than a full `frame()` — skips the `gl.readPixels` GPU→CPU stall in `readMaskToCPU` and the ten-pass fluid sim step.
- **Adaptive-only-on-accum-drop.** [`engine/AdaptiveResolution.ts`](../../engine/AdaptiveResolution.ts) gains an opt-in `gateOnAccumOnly: boolean` input. When true, both `isInteracting` and `!mouseOverCanvas` are dropped from the activity-tracking and `needsAdaptive` predicates — the only signal that engages adaptive is an `accumCount < prevAccumCount` event (which fluid-toy's TSAA hash check raises only on Julia-affecting param changes). Wired through `ViewportAdaptiveConfig.engageOnAccumOnly` and on by default for fluid-toy. GMT's worker-side adaptive is unaffected (the flag is opt-in).
- **Sample-cap-aware deep-accum gate.** [`engine/AdaptiveResolution.ts`](../../engine/AdaptiveResolution.ts) also gains `accumThreshold?: number` — when set, overrides the FPS-derived 8–50 default. [`store/slices/viewportSlice.ts`](../../store/slices/viewportSlice.ts) computes `Math.floor(sampleCap * 0.5)` so once the fractal has accumulated halfway to the user's cap, adaptive can't re-engage until the accumulator actually drops.
- **Accumulation reporting.** [`fluid-toy/useFluidEngine.ts`](../fluid-toy/useFluidEngine.ts) RAF loop pushes `engine.getAccumulationCount()` into the store at ~10 Hz with a per-call no-op guard. [`store/slices/renderControlSlice.ts`](../../store/slices/renderControlSlice.ts) `reportAccumulation` setter now early-returns when the value is unchanged so future callers without their own throttling can't spam Zustand subscribers either.
- **Fractal pass skip when converged.** [`fluid-toy/fluid/FluidEngine.ts`](../fluid-toy/fluid/FluidEngine.ts) `frame()` skips both `renderJulia()` and `runTsaaBlend()` when `tsaaSampleIndex >= tsaaSampleCap`. `updateTsaaHash()` resets the index on any Julia-affecting param change, so scrubs / camera moves re-engage rendering on the next frame. `tsaaSampleCap === 0` disables the short-circuit (infinite accumulation), matching the popover's `0 = Infinite` semantic. The `1_000_000` workaround that previously lived in `FluidToyApp` is gone — the sentinel is now the engine's contract.
- **Pause/Play UI refresh.** [`engine/plugins/topbar/PauseControls.tsx`](../../engine/plugins/topbar/PauseControls.tsx) — three-tone lookup table (`paused / done / active`) keeps border, fill, edge accent, and icon colour in sync. Width grew from `p-0.5` to `flex … gap-1.5 px-2 py-1`. Both icons are rendered inline; the inactive icon dims to `text-gray-600`. Fill opacity bumped from `/15`–`/20` to `/30`–`/35`; new 1px right-edge accent at `/60` opacity tracks the fill front for visibility against similarly-toned topbar backgrounds. Width / left transitions on the fill animate the progress smoothly instead of snapping per-frame.
- **Type dedupe.** `ViewportAdaptiveConfig` was duplicated (with already-drifting comments) across [`engine/plugins/Viewport.tsx`](../engine/plugins/Viewport.tsx) and [`types/store.ts`](../types/store.ts). Canonical definition moved to [`types/viewport.ts`](../types/viewport.ts) (a leaf type module) and both sites import from there. `EngineStoreState['adaptiveConfig']` is now `ViewportAdaptiveConfig`.

### Fluid-toy: pan/zoom store-bypass + max-depth React-subscriber cascade fix

**User-facing**
- Fluid-toy pan (right-drag), middle-drag zoom and wheel zoom no longer trip React's `Maximum update depth exceeded` warning under load. Pan / zoom are visibly smoother, especially with the fractal panel + Views panel both open.
- Slider drags (e.g. gradient bias inside `AdvancedGradientEditor`) no longer stutter after a few seconds of dragging.
- Fluid-toy fractal background now keeps accumulating across non-fractal param changes (brush size, exposure, vorticity, dye colour …). Previously every feature setter emitted the engine-wide `reset_accum` event which fluid-toy's TSAA listener treated as a full restart; now the fractal background only resets when an actual fractal-affecting parameter changes.

**Mechanism**
- **Pointer-gesture store-bypass** in [`fluid-toy/FluidPointerLayer.tsx`](../fluid-toy/FluidPointerLayer.tsx). During pan/middle-drag/wheel, center+zoom now route directly to `FluidEngine.setParams` (a `pendingViewRef` keeps the latest value) instead of `setJulia({center,zoom})`. The store sees a single `setJulia` commit on `pointerup` (drag) or after a 100 ms wheel-idle debounce. With dozens of `useEngineStore`-subscribed components in the panel tree, every per-pointermove `setJulia` was triggering a 50+ subscriber cascade — exactly what trips React 18's nested-update guard. Same pattern engine-gmt's cursor-anchored navigation uses for orbit/zoom (treadmill absorb).
- **Granular selectors** instead of `useEngineStore()` no-selector in the high-volume subscribers (each one was re-rendering on every store update):
  - [`fluid-toy/FluidToyApp.tsx`](../fluid-toy/FluidToyApp.tsx) — split the whole-state subscription into `panels` / `contextMenu` / a handful of stable action-function refs. Floating `PanelRouter` instances now receive `useEngineStore.getState()` as an imperative snapshot, since their child components handle their own per-slice subscriptions.
  - `DomOverlays` factored into a per-overlay `DomOverlayInstance` that subscribes only to its specific slice.
  - [`components/Knob.tsx`](../components/Knob.tsx), [`components/ToggleSwitch.tsx`](../components/ToggleSwitch.tsx), [`components/vector-input/index.tsx`](../components/vector-input/index.tsx), [`components/layout/Dock.tsx`](../components/layout/Dock.tsx), [`components/layout/DropZones.tsx`](../components/layout/DropZones.tsx), [`components/DraggableWindow.tsx`](../components/DraggableWindow.tsx), [`components/FeatureSection.tsx`](../components/FeatureSection.tsx), [`components/CompilableFeatureSection.tsx`](../components/CompilableFeatureSection.tsx) — converted destructured `useEngineStore()` reads to one selector per field. Most fields are stable function refs (created once at store init) so the selectors return the same value every store update and never trigger re-renders.
- [`engine/animation/AnimationSystem.tsx`](../engine/animation/AnimationSystem.tsx) — `setLiveModulations` now compares values and only writes when something actually changed. Previously it wrote a fresh `{}` every frame, replacing the store value's reference and forcing every subscriber to re-render every animation tick — major contributor to the per-pointer-event update budget.
- [`fluid-toy/FluidToyApp.tsx`](../fluid-toy/FluidToyApp.tsx) — replaced inline `?? {}` in the `liveModulations` selector with a module-level `EMPTY_MODS` constant. `?? {}` returns a new object every selector call, defeating Zustand's reference-equality re-render gate.
- [`components/AdvancedGradientEditor.tsx`](../components/AdvancedGradientEditor.tsx) — added a `justEmittedRef` flag so the prop-sync `useEffect` skips its `setKnots` when our own `emitChange` caused the prop to change. Without it, `emitChange → setKnots(local) + onChange(parent) → parent commits → useMemo re-derives stops → useEffect[stops] fires → setKnots again` could saturate React's update budget mid-drag under load.
- [`fluid-toy/fluid/FluidEngine.ts`](../fluid-toy/fluid/FluidEngine.ts) — removed the global `FRACTAL_EVENTS.RESET_ACCUM` listener in the FluidEngine ctor. The hash check in `updateTsaaHash()` already covers every fractal-affecting parameter (kind, juliaC, center, zoom, power, maxIter, colorIter, escapeR, colorMapping, trapCenter/Radius/Normal/Offset, stripeFreq) and is the sole authority for accumulator restarts. The generic event was firing on every DDFS feature setter (brush, fluidSim, postFx, …) and unnecessarily wiping the fractal background.
- [`fluid-toy/FluidToyApp.tsx`](../fluid-toy/FluidToyApp.tsx) — `tsaaSampleCap` is now pinned to 64 in fluid-toy directly. The engine-level `sampleCap` (default 256) is sized for GMT's path-traced renderer; with K=4-per-frame TSAA + Halton blue-noise sub-cell refinement, fluid-toy's fractal background visually settles by frame ~64.

### Fluid-toy: progressive-grid TSAA convergence + Sobel/Vogel refraction polish

**User-facing**
- Fluid-toy fractal background converges noticeably faster and looks cleaner. With the grid jitter mode (default), the first 4 frames after any view change deliver a 4×4 stratified-grid average, then frames 5+ progressively refine via deterministic blue-noise sub-cell offsets — 4× cheaper per frame than the previous K=16 approach with continuing improvement out to ~64 frames.
- New **Refract roughness** slider (post-FX panel, gated on `Refraction > 0`). 0 = polished glass (single-tap, current default); 1 = ~5px Vogel-disc blur for a frosted-glass scatter. Mask + walls blur in step so glass edges stay consistent with the refracted fractal behind them.
- Existing **Refract smooth** slider actually smooths now. It used to spread a 4-tap forward-difference further apart (smoother stencil but the gradient was just as noisy); now it controls the stencil width of a Sobel 3×3 — mathematically a Gaussian blur composed with a central difference. Cranking it produces calm low-frequency liquid waves instead of the previous pixely slope. Caustic glints are also rounder (9-point Laplacian replaces 5-point — no preferential x/y axis bias).

**Mechanism**
- **K-sampling + grid lattice** in [`fluid-toy/fluid/shaders.ts`](../fluid-toy/fluid/shaders.ts) `FRAG_JULIA`. The Julia eval body extracted into an `evalJulia(uvJ, …)` helper; `main()` runs it K times with K different sub-pixel offsets, raw-averages the outputs, and pushes one averaged sample per frame to the TSAA accumulator. New uniforms `uPerFrameSamples` (K, default 4), `uGridSize` (lattice cell count, default 16), `uTsaaSampleIndex` (current accumulator frame), `uJitterMode` (0 = blue-noise, 1 = grid).
- **Progressive-grid logic**: with K=4 and gridSize=16, one round = 4 frames. Frame F visits cells `[F*K .. F*K+K-1]` of the 16-cell lattice. After 4 frames the accumulator equals a single-frame K=16 grid result. Round 1+ shifts the cell sample to a sub-cell offset taken from the blue-noise texture (stepped by R2 per round, sampled via `getStableBlueNoise4` so all pixels see the same offset → no per-pixel shimmer). After 16 frames there are 4 rounds × 16 cells = 64 unique sub-positions per pixel; after 64 frames there are 256.
- **Sobel 3×3 gradient + 9-point Laplacian** in [`fluid-toy/fluid/shaders.ts`](../fluid-toy/fluid/shaders.ts) `FRAG_DISPLAY`. Replaced 4-tap forward differences `(lR-lL, lU-lD)` with a proper Sobel 3×3 (= Gaussian blur ⊗ central difference) for the refraction gradient, and the 5-point Laplacian `(lL+lR+lU+lD - 4*lC)` with a 9-point form `(8 neighbours - 8*lC)` for caustics. Same number of texture taps as the previous code when caustics is also enabled.
- **Vogel-disc roughness** in `FRAG_DISPLAY`. New uniform `uRefractRoughness` (0..1). When > 0, the fractal sample at `uv + refractOffset` is scattered across 8 Vogel-disc taps (golden-angle spiral — even disc coverage at small N) plus the centre tap. Each tap is gradient-mapped individually before averaging — same reasoning as the K-loop fractal AA: averaging raw `j`/`aux` at fractal boundaries gives meaningless intermediate iterations. The mask reads the same kernel so wall edges blur in step. Dye + velocity stay sharp.
- New params: `tsaaPerFrameSamples`, `tsaaGridSize`, `tsaaJitterMode`, `refractRoughness` on `FluidParams`. New DDFS field `refractRoughness` on [`fluid-toy/features/postFx.ts`](../fluid-toy/features/postFx.ts).

### Engine: pre-existing bug fixes surfaced when fluid-toy / fractal-toy went live

**Mechanism**
- [`engine/PanelManifest.ts`](../engine/PanelManifest.ts) — switched `useEngineStore` from a runtime import to a type-only import + lazy `globalThis.__engineStore` accessor. Module-level import of `useEngineStore` evaluated `engineStore.ts`, which froze the feature registry — and `PanelManifest` is reachable from `formulaRegistry.registerFormula → addPanel`, which fractal-toy calls during its registerFeatures phase BEFORE the store should be created. Result was `FeatureRegistryFrozenError: Feature "mandelbulb" registered after featureRegistry was frozen`. With the lazy accessor, `addPanel` becomes a no-op-on-store when called pre-boot (panel still pushed to `_byId`); `applyPanelManifest` was switched to iterate the full accumulated `_byId` so the pre-boot panel registrations get seeded into the store when setup runs.
- [`store/engineStore.ts`](../store/engineStore.ts) — publishes `useEngineStore` to `globalThis.__engineStore` after `create()` returns, for the PanelManifest lazy accessor.
- [`engine/utils/createBlueNoiseWebGL2.ts`](../engine/utils/createBlueNoiseWebGL2.ts) — `img.onload` callback now guards with `gl.isContextLost() || !gl.isTexture(texture)` before binding. Under React StrictMode + HMR, the fluid-toy WebGL context can be torn down before the blue-noise PNG finishes loading, leaving a `WebGL: INVALID_OPERATION: bindTexture: attempt to use a deleted object` warning.

### Camera shortcuts wired + saved-camera toast + fluid-toy smooth view tween

**User-facing**
- Camera Manager hotkeys finally work: **Ctrl+1..9** saves the current view to a slot, **1..9** recalls it. The Camera menu's Slot N entries now do the same and show a ✓ once a slot is filled.
- Saving to a slot pops a small **"Camera N saved"** toast under the topbar (2s) and lights a notification dot on the **View Manager** menu item for 5s — so you know the save landed even with the Manager closed.
- Pressing **Ctrl+5** when only 2 cameras are saved no longer silently appends as the 3rd entry mislabelled "5". Now warns: *"Slot 5 unavailable — only 2 slots are filled"*. Slots fill sequentially.
- Fluid-toy "Views" gets the same toast + dot + ✓ for free, and **switching between saved views now smoothly animates** over 500ms (center, julia C, zoom in log-space, power) — was an instant jarring snap.

**Mechanism**
- `installGmtCameraSlice` was calling only the inner `installStateLibrarySlice` — not the outer `installStateLibrary` bundle that actually registers the keyboard slot shortcuts. Switched to the bundle. `installCamera({hideShortcuts: true})` in app-gmt suppresses the legacy `@engine/camera` shortcut bindings whose adapter was never registered (silent no-ops that won the tie-break).
- Promoted the saved-toast pattern to the engine: `installStateLibrarySlice` now writes `${arrayKey}_savedToast` and `${arrayKey}_notifyDot` transient store fields with timer cleanup. New `<StateLibraryToast arrayKey={...}/>` component renders the pill with success/warning tones. Auto-mounted by `installStateLibrary` next to the menu when one is configured. Field names exported via `toastFieldKey()` / `dotFieldKey()` helpers.
- `MenuButtonItem.label` and `MenuToggleItem.label` now accept `string | (() => string)` (matching the existing `disabled: boolean | (() => boolean)`). Drives the live ✓ on filled slots and the ● on the View Manager item.
- `lerp` and `easeInOutQuad` lifted to `engine/math/Easing.ts` for fluid-toy's `tweenView` and any future ad-hoc tweens.

## 2026-04-26

### Cursor-anchored orbit/zoom + worker offset-sync race fix

**User-facing**
- Orbit-mode left-drag now rotates around whatever's under the mouse cursor, like Blender. The cursor pixel stays put while the world rotates around it.
- Wheel and middle-drag zoom both anchor the same way — the point under the cursor stays fixed; you zoom toward/away from it.
- Right-drag pan unchanged (still drei native).
- A small crosshair-with-dot toggle in the DST HUD pill flips between cursor-anchored and the original centre-pivot behaviour. Default on; click to switch. A pivot reticle dot tracks the cursor when a fractal surface is under it.
- Subjective smoothness now matches drei's native OrbitControls even under render strain. Every interaction now resets accumulation immediately (no more motion-blur stutter on wheel/middle/pan that previously slipped past the position-delta detection).

**Mechanism**
- New custom handlers in [`engine-gmt/navigation/Navigation.tsx`](../engine-gmt/navigation/Navigation.tsx) for left-drag rotate, wheel zoom and middle-drag zoom replace drei's `ROTATE` / `DOLLY` / `MIDDLE_DOLLY`. drei still owns `PAN`. When the toggle is off, the custom handlers self-gate at the top and drei's full native path runs (mouseButtons + enableZoom flip via the toggle).
- **Math (rotate)**: rotate `(camera.position − pivot)` and `camera.quaternion` by the same composite quaternion (azimuth around frozen `gestureUp` captured at pointerdown × polar around post-azimuth `camera.right`). Both rotations share the axis, so the pivot's direction-from-camera stays invariant in camera-space → cursor pixel stays put. `gestureUp` frozen for the gesture's duration; recaptured on next pointerdown so Q/E roll between gestures still applies, but azimuth doesn't drift within a drag.
- **Math (zoom)**: pure translation along the cursor→pivot ray — `camera = pivot + (camera − pivot) × f`. No `lookAt`; orientation unchanged.
- **Treadmill handover**: every gesture event absorbs `camera.position` into `engine.sceneOffset` immediately (via existing `absorbOrbitPosition`). The local pivot is shifted into the new local frame to compensate (`pivot.sub(camera.position)` before absorb). End-of-gesture absorbs become no-ops, eliminating the end-of-gesture snap. For pan, drei owns the camera so the absorb runs in `useFrame` priority 0 with `keepTarget=true` (a new option that shifts target into the new local frame instead of resetting to forward — keeps drei's pan-distance-based sensitivity stable).
- **Hover pre-pick**: cursor anchoring needs the world-space surface point under the cursor at the moment of click. We pre-pick on `pointermove`, throttled by an in-flight gate (only one async pick at a time) plus a 10 px movement gate to skip parked-cursor picks. Cached in world space (`hoverPivotWorldRef`) so it stays valid across treadmill absorbs; localized at gesture start via the current `sceneOffset`. Skips during all gestures (pan / wheel / middle / custom orbit).
- **Up-pole stability**: previous design used the live `camera.up` for azimuth, which polar tilts gradually rotated off vertical → up-pole tumbled across drags. Frozen `gestureUp` made each drag a clean turntable. `camera.up` is also locked to `gestureUp` throughout the drag so drei's `lookAt` (when re-enabled at gesture end) doesn't fight the rotation.
- **Synchronous application**: rotation math runs inside `pointermove`, not deferred to `useFrame`. (We tried deferral; agent research confirmed drei's smoothness comes specifically from per-event apply — deferring adds a full render-frame of latency that perceptibly chunks under strain. The math itself is microseconds; coalescing wasn't worth it.)
- **Drei coexistence**: when toggle is on, drei is force-disabled synchronously at custom-gesture start (`orbitRef.enabled = false`) so its priority −1 useFrame `lookAt(target)` doesn't fight our rotation. Re-enabled by the gating logic in `useFrame` when the gesture ends. When toggle is off, drei stays enabled subject to lock predicates only — fixes a regression where wheel-only interactions silently no-opped because drei's `enabled` flag was tied to a pointerdown-pointerup latch that never fired for wheel-only events.
- **Accumulation reset**: per-event/per-frame absorb keeps `camera.position` at (0,0,0) every frame, so `useFrame`'s `posChanged` / `rotChanged` checks (which compare frame-to-frame) miss the actual view change. Each custom handler now sets `engine.dirty = true` directly, where it knows the view has moved.

### Fix: worker `RENDER_TICK` overwrite drops `syncOffset` flag

A subtle race in the worker's `RENDER_TICK` buffering caused occasional permanent main↔worker `sceneOffset` desyncs (~1 in 12 interactions, then all subsequent picks landed at the wrong world point until app reload).

The worker buffers the latest pending tick (`_pendingTick = msg`) — if two ticks arrived between worker drains, the newer overwrote the older. When the older had `syncOffset: true` (from a main-thread treadmill absorb) and the newer didn't, the flag was lost — the worker's `RENDER_TICK` handler conditionally writes `engine.virtualSpace.state = msg.offset` only when `syncOffset` is true (other paths use `OFFSET_SHIFT` / `OFFSET_SET`), so the worker's `virtualSpace` never updated. Main kept absorbing into its own `engine.sceneOffset`; worker stayed at the pre-absorb value. Every subsequent `pickWorldPosition` returned coords against the worker's stale offset, which main localized against its newer offset → cursor pivot off by exactly the lost delta, permanently.

Fix in [`engine-gmt/engine/worker/renderWorker.ts:RENDER_TICK case`](../engine-gmt/engine/worker/renderWorker.ts) — when overwriting `_pendingTick`, propagate `syncOffset` forward if either tick has it. The offset *value* in the new tick is already correct (`queueOffsetSync`'s shadow set keeps `engine.sceneOffset` synchronous on main); only the flag had to survive the merge.

### Misc
- `engine-gmt/features/navigation.ts` — new `orbitCursorAnchor` boolean param (default true, hidden from auto-panel; exposed as the DST HUD pill toggle).
- `engine-gmt/navigation/HudOverlay.tsx` — added the cursor-anchor toggle button inside the DST HUD pill (Orbit mode only). Even-pixel SVG sizing and `display: block` on the icon to fix a visible sub-pixel offset in the small button.

## 2026-04-25

### Fix: FOV Dolly Link — correct WorkerProxy import in scene_widgets

`engine-gmt/components/panels/scene_widgets.tsx` imported `getProxy` from `'../../../engine/worker/WorkerProxy'` (3 levels up = project root → the engine-core extraction stub). The stub's `_shadow.lastMeasuredDistance` defaults to `1` and is never updated. `handleDollyStart` read `probeDist = 1`, which passes the range guard `(> 0.0001 && < 900)`, so the dolly always assumed the subject was 1 unit away regardless of camera depth — making the zoom-and-move compensation wildly wrong.

Fix: changed import to `'../../engine/worker/WorkerProxy'` (2 levels up = `engine-gmt/` → the real engine-gmt proxy that receives `FRAME_READY` with live `lastMeasuredDistance`).

This is the same duplicate-module-state pattern as the Key Cam dirty bug (ViewportRefs). `scene_widgets.tsx` was 2 directories deep inside `engine-gmt/`, so the 3-level import climbed out of the overlay entirely; all other engine-gmt files using `'../../../engine/worker/WorkerProxy'` are ≥3 directories deep and correctly land on the engine-gmt copy.

## 2026-04-20

### Image-sequence export: PNG (RGBA) + JPG (per-pass)

**User-facing**
- Two new format dropdown entries: **PNG Sequence (RGBA)** and **JPG Sequence (per pass)**.
- Selecting either enables a **Select Output Folder…** button (instead of the usual "Output File"). The user picks a directory and the render writes per-frame files into it named `{project}_v{n}_{WxH}_{00000}.{ext}`.
- **PNG** merges the beauty and alpha passes into a single RGBA PNG per frame (RGB from beauty, A from the anti-aliased coverage mask). If depth is also selected, it goes out as a separate greyscale PNG per frame (`…_depth_00000.png`).
- **JPG** writes one file per pass per frame (`…_beauty_00000.jpg`, `…_alpha_00000.jpg`, `…_depth_00000.jpg`) — JPG can't carry alpha, so pass separation is the only sensible option.
- Chrome / Edge only: image sequences depend on the File System Access API's directory picker. Firefox / Safari show an inline amber notice and the button is disabled when that API isn't present.

**Mechanism**
- [`data/constants.ts`](../data/constants.ts) — two new `VIDEO_FORMATS` entries with `imageSequence: true`; the existing video entries get `imageSequence: false`.
- [`engine/codec/VideoExportTypes.ts`](../engine/codec/VideoExportTypes.ts) — `VideoExportConfig` gains `passes?: ExportPass[]` (image mode: all selected passes in one session) and `imageSequenceBaseName?: string`. The per-pass `pass` field still drives video mode.
- [`engine/worker/WorkerProtocol.ts`](../engine/worker/WorkerProtocol.ts) / [`WorkerProxy.ts`](../engine/worker/WorkerProxy.ts) — `EXPORT_START` accepts an optional `dirHandle: FileSystemDirectoryHandle`. `FileSystemDirectoryHandle` is structured-cloneable across `postMessage` since the File System Access API landed in workers, so it rides in the message body — no transferable entry needed.
- [`engine/worker/WorkerExporter.ts`](../engine/worker/WorkerExporter.ts) — the session is now video-vs-image-tagged; video-specific fields (`encoder`, `packetSource`, `output`, `muxerChain`) are optional and only created in video mode. Image mode holds `dirHandle` + `imageWriteChain` instead. `renderFrame` branches: `renderFrameVideo` runs one pass + encodes one chunk (prior behavior); `renderFrameImageSequence` loops over `config.passes` per frame, copies each pass's `pixelBuffer` snapshot into a map, then schedules `writeFrameFiles` onto the write chain so disk I/O overlaps with the next frame's GPU work. Files are encoded in-worker via `OffscreenCanvas.convertToBlob('image/png' | 'image/jpeg')` and streamed into `dirHandle.getFileHandle(name, {create: true}).createWritable()`. `finish()` drains the write chain before posting `EXPORT_COMPLETE`; `cancel()` drops the session (partial files on disk are kept — they're valid frames).
- Bloom is skipped on the alpha and depth passes inside `renderOnePass` — those are greyscale luminance data that bloom would smear, changing the "meaning" of the value. Beauty still bloomsa as always.
- [`components/timeline/RenderPopup.tsx`](../components/timeline/RenderPopup.tsx) — new `handleImageSequenceExport` takes the image path: `showDirectoryPicker({mode: 'readwrite'})`, sets up the same per-frame pump as video but with `config.passes` populated, awaits `finishExport()` at the end. The start button relabels to **Select Output Folder…** when an image format is chosen, and disables with a notice when the File System Access API isn't available.
- Format-support check in `RenderPopup` short-circuits to `supported = true` for image sequences — they don't go through `Mediabunny.canEncodeVideo`.

**Performance**
- PNG + alpha selected → 2× GPU work per frame (beauty pass, then alpha pass, both at full accumulation). Still roughly half the cost of running two separate video exports because the per-frame state setup (camera, offset, uniforms) happens once.
- PNG encode cost: `OffscreenCanvas.convertToBlob` at 1080p is ~10-30ms per frame, dwarfed by the accumulation work — and it runs on the write chain, so frame N+1's accumulation overlaps frame N's encode/write.

### Multi-pass video export: beauty, alpha, depth

**User-facing**
- The render dialog now has a **Passes** row with three checkboxes: **Beauty**, **Alpha**, **Depth**. At least one must be selected.
- Beauty is the normal tone-mapped video we've always exported. Alpha is an anti-aliased black-and-white matte (white = surface, black = sky). Depth is a linear greyscale distance map (near = black, far = white), normalized to a user-configurable range.
- Checking **Depth** reveals a **Near / Far (world units)** control row with a **Use fog range** shortcut — if the scene's atmosphere fog is enabled, that one click copies the current fog start/end into the depth range.
- While a pass renders, the viewport preview now shows that pass being rendered (alpha or depth as it goes into the file), not the beauty image it used to show regardless.
- When more than one pass is selected, each pass produces its own file named `{project}_{pass}_v{n}.{ext}`. Disk-mode exports show a separate save dialog per file; RAM-mode triggers downloads sequentially.

**Mechanism**
- Three new uniforms in [`engine/UniformSchema.ts`](../engine/UniformSchema.ts) / [`UniformNames.ts`](../engine/UniformNames.ts): `uOutputPass` (0=beauty, 1=alpha, 2=depth), `uDepthMin`, `uDepthMax`. They live in the base schema so the main fractal shader, the viewport's `displayMaterial`, and the `exportMaterial` all share the *same* uniform reference via `createPostProcessMaterial`'s "SHARED REFERENCE" loop. Setting `engine.mainUniforms.uOutputPass.value = 1` atomically retargets all three — which is what makes the viewport preview follow the pass being rendered.
- [`shaders/chunks/main.ts`](../shaders/chunks/main.ts) branches the alpha write at the end of `main()`. In beauty/depth passes the projected camera distance still goes into alpha (the physics probe relies on it). In alpha pass, a per-sample binary `step(depth, 900.0)` (MISS_DIST=1000, 100-unit margin for DoF jitter) goes in instead. The existing Halton-jittered TAA accumulation then averages the 0/1 values across sub-pixel samples — which is exactly what sub-pixel coverage AA looks like. Zero extra render cost; the anti-aliasing comes out of the accumulation buffer for free.
- [`shaders/chunks/post_process.ts`](../shaders/chunks/post_process.ts) — alpha branch reads the accumulated fractional coverage straight out of `tex.a` (no thresholding). Depth branch normalizes `tex.a` against `uDepthMin` / `uDepthMax` (was hardcoded to `MAX_SKY_DISTANCE = 50`). Both branches skip tone mapping and post-process feature injections.
- [`engine/worker/WorkerExporter.ts`](../engine/worker/WorkerExporter.ts) sets `uOutputPass` / `uDepthMin` / `uDepthMax` via `mainUniforms` at session start; cleanup resets `uOutputPass` to 0. The focus-lock depth probe is now gated on `pass !== 'alpha'` — otherwise it would read the binary-coverage alpha and trash `lastMeasuredDistance`.
- [`engine/codec/VideoExportTypes.ts`](../engine/codec/VideoExportTypes.ts) — new `ExportPass` type; `pass`, `depthMin`, `depthMax` optional fields on `VideoExportConfig`.
- [`components/timeline/RenderPopup.tsx`](../components/timeline/RenderPopup.tsx) — the export function wraps its per-frame pump in an outer loop over the selected passes. Progress UI resets between passes and the status text reads `Pass 2/3 (Alpha) — …` in multi-pass runs. Focus lock only adjusts DOF during the beauty pass. When Depth is checked, two `DraggableNumber` inputs for near / far world-unit clips show up alongside a **Use fog range** shortcut that reads the live atmosphere feature state.

**Performance**
- Viewport hot path (default `uOutputPass = 0`) adds one ternary in `main.ts` — GLSL compiles ternaries to a `select`, so this is a single GPU op, no branch divergence. Post-process adds two `if` comparisons that both fall through at default. Inner trace / SDF / iteration loops are untouched. `npm run test:baseline` regenerates clean (42/42 formulas compile).

**Outstanding (next phase)**
- PNG + JPG image-sequence format entries and the `showDirectoryPicker` flow for image sequences.
- EXR image-sequence writer (minimal half-float scanline format).

### Video export overhaul: exact resolution, exact fps in Firefox, drop H264 workaround

**User-facing**
- **Resolution.** Picking **1920×1080** in the render dialog now exports a 1920×1080 file (was 1920×1072). All standard presets export at their nominal size.
- **Firefox fps.** Exports from Firefox now play back at the requested fps. Before this batch, 60 fps came out as ~58.85 fps and 30 fps as ~29.42 fps — a one-frame timing drift that compounded across all clip lengths.
- **Firefox bitrate notice.** When the bitrate slider is set above ~12 Mbps and the format is H.264, the render dialog now shows: *"Firefox caps H.264 output at ~31 Mbps regardless of this setting."* This is an OpenH264 limitation that can't be worked around in JS.

**Mechanism**
- **mediabunny 1.34.0 → 1.40.1.** Catches up on a CTS-offset fix in fMP4 muxing, GOP timestamp validation, and `visibleRect` / non-square-pixel support. Confirmed v1.34+ already auto-extracts the AVC decoder configuration record from AnnexB packet data, so our hand-rolled `H264Converter.ts` (originally added "for WMP compatibility") is now redundant — deleted, along with the "wait for SPS/PPS before adding video track" guard. `halton()` moved to its own file.
- **Resolution alignment 16 → 2.** WebCodecs encoders pad internally to macroblock size and signal display crop in the bitstream; we don't need to floor to a 16-pixel grid. The 16-aligned floor was shaving any height not divisible by 16 (1080 → 1072, 1350 → 1344).
- **Firefox fps fix — three layered causes:**
  1. Firefox's `VideoEncoder` doesn't echo back the per-frame `duration` we set on the source `VideoFrame` — it returns its own default (~33333 µs, a 30 fps assumption).
  2. Firefox adds a one-frame leading-latency offset to every `chunk.timestamp`, regardless of `latencyMode`.
  3. Mediabunny writes the file's total duration as `lastSample.timestamp + lastSample.duration`, so both quirks compound into a ~`60 × N/(N+1)` reported fps.

  Fix in [`WorkerExporter.handleEncodedChunk`](../engine/worker/WorkerExporter.ts): hardcode duration to `1 / fps`, and reconstruct PTS as `chunk.timestamp − firstChunkOffsetMicros`. The `keyFrame: true` on input-frame 0 guarantees the first decoded chunk is the I-frame at PTS = 0, so the captured offset is exactly Firefox's leading-latency shift (zero on Chrome). B-frame-safe because each chunk's `chunk.timestamp` is still its true PTS.
- **Bitrate config.** Encoder uses `latencyMode: 'quality'` (B-frames + aggressive motion estimation) and `bitrateMode: 'constant'` (Firefox's default `'variable'` under-runs the target on smooth fractal regions).
- **Firefox H.264 bitrate cap.** Firefox uses Cisco's binary OpenH264 (Mozilla can't ship libavcodec because of MPEG-LA royalties). Cisco's binary is built with a Level 4.0 ceiling — MaxBR ≈ 31 Mbps for High profile — regardless of the level we request in the codec string. The cap is upstream of WebCodecs, so all we can do is surface it in the UI.

**Files**
- `package.json` — `mediabunny` 1.34.0 → 1.40.1.
- `engine/worker/WorkerExporter.ts` — alignment 16 → 2; AVCC conversion + SPS/PPS wait deleted; `addVideoTrack` now passes only `frameRate`; encoder config switched to `latencyMode: 'quality'` + `bitrateMode: 'constant'`; `handleEncodedChunk` hardcodes duration to `1/fps` and normalizes PTS by subtracting the first chunk's offset (new `firstChunkOffsetMicros` session field).
- `engine/codec/halton.ts` (new), `engine/codec/H264Converter.ts` (deleted).
- `engine/FractalEngine.ts` — import path updated.
- `components/timeline/RenderPopup.tsx` — Firefox + H.264 + > 12 Mbps inline notice (`isFirefoxH264BitrateCapped`).
- Docs: `06_Troubleshooting_and_Quirks.md`, `07_Code_Health.md`, `08_File_Structure.md`.

**Outstanding (separate sessions)**
- Animation appears 2× faster after switching `animStore.fps` 30 → 60 — UX issue: keyframes are stored as integer frame indices, not seconds, so changing fps without rescaling halves the wall-clock duration. Needs design call (auto-rescale vs. warn).
- Alpha-channel video export (Resolume / VFX use case) — needs new format entry (WebM/VP9 with `alpha: 'keep'`), RGBA pixel buffer + RGBA render target, and verification that the sky/post pipeline writes meaningful alpha.

## 2026-04-18

### Pixel threshold invariant across all internal scaling

**User-facing**
- **Pixel Threshold** (Quality panel) now means the same thing regardless of resolution. Previously, when adaptive resolution downscaled the render buffer, the effective hit threshold grew proportionally — a `0.5` setting that looked crisp at full resolution became sloppy at half res. After the fix, `0.5` means "half of a viewport pixel" across adaptive downscale, DPR changes, and SSAA bucket upscale.

**Mechanism**
- `uPixelSizeBase` now represents the **viewport pixel** world size, not the physical render pixel. Computed in `UniformManager.syncFrame()` as `height * 2.0 / (resolution.y * _adaptiveScale)`. Adaptive downscale increases `_adaptiveScale`, which cancels the shrink in `resolution.y`, keeping `uPixelSizeBase` stable.
- Combined with the existing `uDetail / uInternalScale` compensation in `trace.ts`, threshold is invariant to DPR *and* adaptive scale. Matches the invariant the SSAA bucket override was already enforcing for its case.
- Other consumers (`pathtracer`, `material_eval`, `pbr`, `reflections`) use `uPixelSizeBase / uInternalScale` unchanged — they benefit automatically from the stronger `uPixelSizeBase` semantics.

### Bucket render first-frame aspect stretch fix

**Bug**
- Toggling a panel immediately before triggering a bucket render occasionally produced a stretched first render. Second try looked correct. Cause: `UniformManager.syncFrame()` skips the `cam.aspect`↔canvas sync during bucket rendering, so if a canvas resize hadn't been processed yet, the first bucket inherited a stale aspect.

**Fix**
- One-shot `cam.aspect` sync at the top of the worker's `BUCKET_START` handler, before `BucketRenderer.start()` captures `originalSize`. Reads current renderer buffer dims and corrects `cam.aspect` if drifted by more than 0.001. No per-frame overhead.

**Files**
- `engine/managers/UniformManager.ts` — viewport-pixel `uPixelSizeBase`.
- `shaders/chunks/trace.ts` — cleanup; restored `effectiveDetail = uDetail / uInternalScale`; dropped the pointless `pixelSizeScale` alias; consolidated comments.
- `engine/worker/renderWorker.ts` — one-shot aspect sync at bucket start.
- `docs/07_Code_Health.md` — `uPixelSizeBase` formula description updated.

## 2026-04-17

### V3/V4 pipeline catalog + auto-pick in Workshop library

**User-facing**
- **Pipeline tristate**: the "V4 pipeline (beta)" checkbox in the Formula Workshop footer is now a three-way `[auto] [v3] [v4]` selector. `auto` reads a per-formula compatibility catalog and picks the pipeline that renders each formula correctly. `v3` / `v4` force that pipeline regardless.
- **Compat badges**: search results and both category browsers (Frag and DEC) now show a small `V3` or `V4` badge next to each formula. Green V3 = engine-feature compat (interlace, hybrid fold, burning ship). Cyan V4 = self-contained, simpler but no feature composition.
- **"Show broken" toggle** next to the Workshop search bar. Default off — hides the 168 formulas that neither pipeline can render.
- **Dice rolls skip broken formulas** by default. The two random-formula buttons reroll from only the 326 working formulas; "show broken" flips this.

**Architecture / data**
- **New artifact `public/formulas/v3-v4-catalog.json`**: per-formula verdict `{ v3: pass|fail|skip, v4: same, recommended: 'v3'|'v4'|'none' }` for every entry in `public/formulas/manifest.json`. Built from V3 and V4 harness snapshots.
- **Recommendation policy**: V3 when V3 passes (engine-feature compat); else V4 if V4 passes; else `'none'`. One function in the build script — easy to flip.
- **Build script**: `npm run catalog:build` (wraps `npx tsx debug/build-v3-v4-catalog.mts`). Snapshot-based, manually regenerated.

**Code changes**
- `public/formulas/v3-v4-catalog.json` (new, generated)
- `debug/build-v3-v4-catalog.mts` (new)
- `features/fragmentarium_import/formula-library.ts` — catalog loader; new exports `getFormulaCompat`, `getRecommendedPipeline`, types `FormulaCompat` / `RecommendedPipeline`. `pickRandom` gains predicate parameter for compat filtering.
- `features/fragmentarium_import/FormulaWorkshop.tsx` — `useV4Pipeline` boolean → `pipelineMode: 'auto'|'v3'|'v4'` + `currentEntryId` tracking. Effective pipeline resolved via `useMemo`. Selection handlers set `currentEntryId`. Dice buttons filter via predicate.
- `components/CategoryPickerMenu.tsx` — `PickerItem` gains optional `badge` field.
- `package.json` — new `catalog:build` script.

**Research doc (retires Strategy I, retargets future work)**
- `docs/research/hybrid-formula-architecture-comparison.md` (new) — GMT's per-iteration contract compared against Mandelbulber2 / Fragmentarium / Fraktaler 3. Finding: GMT's contract mirrors Mandelbulber2's. The impedance with Fragmentarium's full-DE shape is a one-time import cost, not an architectural flaw. "Strategy I" (engine-side fix for self-contained hybrid compat) retired as fighting-the-grain.
- `docs/24_Formula_Interlace_System.md` §8 — cross-links Mandelbulber's `seq[i] → formula_idx` as the concrete target shape for N-formula hybrid generalization.
- `docs/26_Formula_Workshop_V4_Plan.md` §0.1 — revised direction: per-iter emitter opt-in only, V3-fallback deferred, AI-assisted `.frag → .ts` elevated, N-formula hybrid flagged as the real feature gap.

**V4 per-iteration emitter — landed but parked**
- `features/fragmentarium_import/v4/emit/per-iteration.ts` (new, ~720 LOC) — reuses V3's pattern detectors to emit per-iteration formulas from V4 analysis output.
- `features/fragmentarium_import/v4/emit/index.ts` — dispatcher with parse-check fallback, gated behind `globalThis.V4_ENABLE_PER_ITER`. Default path routes to `emitSelfContained`.
- Measured: 330 total passes with per-iter dispatched first vs 394 self-contained-only — a net regression. Foundation kept for future iteration, not promoted.

**Catalog numbers (v0.9.2 branch, 2026-04-17 snapshot)**
- 494 formulas in the library manifest
- V3 recommended: 219 (201 both-pass + 18 V3-only)
- V4 recommended: 107 (V4-only wins)
- Hidden: 168 (neither renders)
- Total usable: 326

## 2026-04-14

### Modular Graph Builder — Correctness, Undo/Redo, UX Overhaul

**Bug Fixes (Correctness)**

- **DCE uniform mismatch fixed**: `updateModularUniforms` now performs the same backward dead-code-elimination walk as `compileGraph`. Previously, dead (disconnected) nodes consumed uniform slots differently from the compiler, causing live node params to read wrong values after a dead node's slider was adjusted. Fix: both now share `buildInputsByTarget` / `buildLiveNodeIds` utilities from `utils/GraphCompiler.ts`. (`engine/MaterialController.ts` updated to pass edges to `syncModularUniforms`.)
- **Condition mod/rem as runtime uniforms**: Previously, `mod` and `rem` condition values were baked as GLSL integer literals — every slider drag caused a full shader recompile. Now they are allocated as `uModularParams[N]` / `uModularParams[N+1]` slots (written before the node's own params). Only toggling `condition.active` triggers recompile.
- **`uModularParams` GLSL conditional declaration**: Added `backingOnly: true` flag to `UniformDefinition`. Uniform still creates a Three.js backing for all formulas, but the GLSL `uniform float uModularParams[64]` declaration is now only emitted for `formula === 'Modular'` shaders. Files: `engine/UniformSchema.ts`, `shaders/chunks/uniforms.ts`, `features/core_math.ts`.
- **`isStructureEqual` refined**: `mod` and `rem` are no longer checked (they're runtime). Only `condition.active` is structural. Binding comparison simplified to `JSON.stringify(bindings ?? {})`.

**Undo / Redo**

- **Graph snapshot in history**: `getParamSnapshot` in `store/slices/historySlice.ts` now includes `graph` in the snapshot. Previously, undo restored the flat pipeline but reconstructed node positions via `pipelineToGraph` (vertical stack, losing user layout). Now undo restores exact node positions.
- **Keyboard shortcuts**: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z trigger `undoParam` / `redoParam` from within the graph editor (keydown listener, skips inputs/textareas).
- **Interaction pairs**: All mutations in `FlowEditor` (connect, delete node, delete edge, node drag, param change) now call `handleInteractionStart('param')` before and `handleInteractionEnd()` after.
- **`captureStateForKeys` helper**: Extracted from duplicated code in `undoParam` / `redoParam` in `historySlice.ts`.

**Graph Editor UX**

- **Panel height fixed**: `PanelRouter.tsx` hardcoded `h-[600px]` replaced with `h-full`. Graph editor now fills the available panel height.
- **Tab zoom/pan persistence**: Zoom and pan position survive tab switches via module-level `persistedViewport` (a `useRef` would reset on unmount/remount). Restored via `reactFlowInstance.setViewport()` in `onInit`.
- **Graph reference sync**: Store→Flow sync now triggers on `state.graph !== lastGraph.current` in addition to `pipelineRevision` change. Catches undo of drag-only changes (position moves) and structural changes when `autoCompile` is off.
- **fitView removed from auto-update**: Only runs on initial mount (and "Reset View" if triggered); no longer disrupts user zoom on every node change.

**Node UX**

- **Node enable/disable toggle** (`ShaderNode.tsx`): Checkbox in header enables/disables the node. Card gets `opacity-40` when disabled. Disabled nodes are skipped by the compiler (no GLSL emitted, no uniform slots consumed).
- **Category colors expanded**: Purple for Primitives, gray for Utils (previously un-colored). Description tooltip on header span (`title={def?.description}`).
- **Binding changed to dropdown** (`NodeParams.tsx`): Replaced the link-icon cycle (click to advance through ParamA–ParamF) with an explicit `<select>` dropdown showing `—` / A / B / C / D / E / F. Clear by selecting `—`.
- **Condition labels renamed**: "Modulo" → "Interval (every N iters)", "Remainder" → "Starting Iteration". Live description: `"Run every {mod} iterations, starting at #{rem}"`. `rem` clamped to `[0, mod-1]` when `mod` decreases. Condition sliders wired with `onDragStart`/`onDragEnd` for undo.
- **GraphContextMenu Escape key** (`GraphContextMenu.tsx`): Escape closes the right-click add-node menu.
- **Minimap category colors**: Color-coded node blobs in MiniMap by category (was all `#333`). Start/End nodes are green/pink.
- **Cycle detection feedback**: When a connection would create a cycle, visible feedback via `openGlobalMenu` (previously silent — edge just disappeared).

**Ghost Insert UX**

- Selecting a node type from the dropdown or right-click context menu activates **ghost insert mode**: cursor becomes crosshair, ghost tooltip follows the mouse, all edges highlight cyan (non-CSG only).
- Click a highlighted edge → inserts node between source and target (splits edge into two).
- Click empty canvas → places node at cursor.
- Escape → cancels.
- CSG nodes (dual-input) skip edge highlighting; pane placement still works.
- `clientToFlow(clientX, clientY)` helper added — subtracts container `getBoundingClientRect()` before calling `project()`. Fixes placement coordinates (raw `clientX/Y` are viewport-relative; `project()` expects container-relative).

**Auto-Reconnect on Delete**

- Deleting a non-CSG node via × button or context menu → the primary incoming edge and outgoing edge are bridged into a new direct connection. CSG nodes are excluded (ambiguous which input chain to reconnect).
- `skipNextOnNodesDelete` ref prevents `onNodesDelete`'s `syncToStore` from racing against the bridge edge write in `handleRemoveNode`.

- Files: `components/PanelRouter.tsx`, `components/panels/flow/FlowEditor.tsx`, `components/panels/flow/GraphContextMenu.tsx`, `components/panels/flow/ShaderNode.tsx`, `components/panels/node-editor/NodeParams.tsx`, `engine/FractalEngine.ts`, `engine/MaterialController.ts`, `engine/UniformSchema.ts`, `features/core_math.ts`, `shaders/chunks/uniforms.ts`, `store/slices/historySlice.ts`, `utils/GraphCompiler.ts`, `utils/graphAlg.ts`

## 2026-04-13

### Fragility Refactors — Module-Level State, Worker Timeouts, Event Bus

- **CompileGate extracted**: `store/CompileGate.ts` is now a standalone singleton (`compileGate`) replacing three module-level exports from `fractalStore.ts` (`queueCompileAfterSpinner`, `flushCompileWork`, `consumeNewCycle`). Eliminates circular-import risk and makes the gate unit-testable in isolation.
- **WorkerProxy pending-request consolidation**: 7 copy-pasted async request patterns (each with its own Map + timeout + resolve) collapsed into `_pendingRequest<T>()` / `_resolveRequest<T>()` helpers. `_clearAllTimers()` added and called on crash/restart — previously timeouts leaked. `_exportStartTimer` / `_exportFinishTimer` moved from module-level to instance fields.
- **FractalEvents for hint reset**: `useTutorialHints.ts` no longer exports a mutable function ref (`getResetHintsFn`). `SystemMenu` now fires `FractalEvents.emit(FRACTAL_EVENTS.RESET_HINTS)` and the hook subscribes/unsubscribes via `useEffect`. Decoupled and GC-safe.
- **FpsCounter frame counter**: `registerWorkerFrameCounter` module-level export removed from `WorkerProxy.ts`; counter registration moved to `getProxy().registerFrameCounter(cb)` on the proxy instance.

### Bug Fixes — Tester-Reported Issues

- **Video export filename**: Both save-dialog and RAM-mode download paths now use `getExportFileName()` from `utils/fileUtils.ts` — produces `GMT_ProjectName_v1_1920x1080.mp4` matching snapshot and bucket render naming.
- **Undo for world picking**: Focus-pick and Julia-pick now call `handleInteractionStart('param')` / `handleInteractionEnd()` so Ctrl+Z reverts both dofFocus and julia offset changes.
- **Julia picking performance**: `PickingController` now has a `measureDistanceFast()` single-pixel path (vs the 3×3 neighborhood = 9 GPU readbacks used for accuracy). Threaded as `fast?: boolean` through `PICK_WORLD_POSITION`, `FractalEngine`, and `WorkerProxy`. Julia drag uses the fast path; initial click keeps the accurate 3×3 read. ~9× fewer GPU stalls per drag frame.
- **Histogram loading indicator**: Auto-update dot on the histogram header is now **orange** while data is being fetched, green when idle+active, gray when off. `histogramLoading` state wired through `HistogramProbe → ViewportArea → features/ui.tsx → ColoringHistogram → Histogram`.
- **Adaptive resolution suppression**: `adaptiveSuppressed` flag added to store. Set to `true` on mount by both `RenderPopup` (video export) and `BucketRenderControls`. `AdaptiveResolution` treats this as `dynamicScaling: false` regardless of user setting — prevents scaling from interfering with frame-time sampling during export setup.

### Camera Lock — Orbit Controls Stale Closure Fix

- **Root cause**: `useFrame` in `Navigation.tsx` overwrites `orbitRef.current.enabled` every frame using the captured `disableMovement` value from the render closure — which was always `false` at the time orbit controls mounted. Bucket render and video export started later, but the closure never updated.
- **Fix**: Inside `useFrame`, `disableMovement` replaced with a fresh read: `selectMovementLock(useFractalStore.getState())`. `selectMovementLock` checks `isGizmoDragging`, `interactionMode`, `isExporting`, and `isBucketRendering` — single source of truth.
- **Cleanup**: Removed the redundant `onStart` guard in OrbitControls (was a band-aid) and the unnecessary synchronous `setIsBucketRendering(true)` call in `BucketRenderControls`.

### Bucket Render — Popover Stale Closure Fix

- **Bug**: The bucket render popover closed when the user clicked outside during an active render — the outside-click handler checked `state.isBucketRendering` captured at render time (always `false` when menu first opened).
- **Fix**: `useFractalStore.getState().isBucketRendering` read fresh at click time in `RenderTools.tsx`.

### Code Deduplication — Shared Helpers

- `WorkerProxy._pendingRequest()` — 7 async request patterns → 1 helper
- `RenderPopup.calcEtaRange()` — inline ETA math deduplicated
- `useInteractionManager.recordPickKeyframes()` — keyframe recording extracted
- `Navigation.calcOrbitTarget()` — 4 instances of orbit target math unified
- `features/ui.tsx useHistogramRegistration()` — register/unregister boilerplate extracted
- `BucketRenderControls.withRenderAction()` — start/stop action wrapper extracted

- Files: `store/CompileGate.ts` (NEW), `engine/worker/WorkerProxy.ts`, `engine/worker/WorkerProtocol.ts`, `engine/worker/renderWorker.ts`, `engine/FractalEngine.ts`, `engine/FractalEvents.ts`, `engine/controllers/PickingController.ts`, `hooks/useInteractionManager.ts`, `hooks/useTutorialHints.ts`, `components/Navigation.tsx`, `components/timeline/RenderPopup.tsx`, `components/topbar/SystemMenu.tsx`, `components/topbar/BucketRenderControls.tsx`, `components/topbar/RenderTools.tsx`, `components/topbar/AdaptiveResolution.tsx`, `components/topbar/FpsCounter.tsx`, `components/Histogram.tsx`, `components/HistogramProbe.tsx`, `components/ViewportArea.tsx`, `components/CompilingIndicator.tsx`, `components/panels/gradient/ColoringHistogram.tsx`, `features/ui.tsx`, `store/fractalStore.ts`, `store/slices/rendererSlice.ts`, `types/store.ts`

## 2026-04-11

### Gradient Blend Space — HSV / Oklab Interpolation
- **Feature**: Gradient stop interpolation now supports 4 blend modes: RGB, HSV (shortest hue path), HSV Far (longest hue path), and Oklab (perceptually uniform, default).
- **Problem solved**: RGB interpolation produces muddy, desaturated midpoints when blending between saturated colors (e.g. red→cyan → grey). Oklab maintains perceptual lightness and chroma.
- **Implementation**: Uses Oklch (cylindrical Oklab) for interpolation — hue angle, chroma, and lightness are interpolated separately to preserve saturation. Falls back to rectangular Oklab for near-achromatic colors where hue is undefined.
- **UI**: Clickable blend space label on the left side of the gradient editor header. Cycles through RGB → HSV → HSV Far → Oklab. Also available in the gradient right-click context menu under "Blend Mode". Non-default modes highlight in cyan.
- **Architecture**: `BlendColorSpace` type added to `GradientConfig` as `blendSpace` property. `blendLerp()` dispatcher in colorUtils handles all interpolation routing. CSS preview approximates non-RGB blends by sampling 12 intermediate stops per segment.
- **Default**: Oklab is the default for new and existing gradients without an explicit `blendSpace`. Backward compatible — existing scenes with authored RGB gradients will see slightly different (generally improved) blending.
- Files: `types/graphics.ts`, `utils/colorUtils.ts`, `components/AdvancedGradientEditor.tsx`

### URL Sharing — Fix Formula Loading from Shared Links
- **Bug**: Loading a scene from a `#s=` URL link loaded the default Mandelbulb instead of the correct formula
- **Root cause**: `bootEngine()` (50ms timeout) raced with `import('../formulas')` (async chunk load). When the formula chunk took >50ms, boot read the store while it still had default state. The subsequent CONFIG from `loadScene` was dropped because `proxy.isBooted` was false.
- **Fix**: `useAppStartup` exposes an `isHydrated` flag set after formula import + URL parse + `loadScene` completes. `LoadingScreen` gates `bootEngine()` on this flag.
- Files: `hooks/useAppStartup.ts`, `App.tsx`, `components/LoadingScreen.tsx`

### Camera Roll (Q/E) — Fix Rotation Lost on Scene Load
- **Bug**: Loading a scene file in Orbit mode stripped the roll (Q/E) component of the camera rotation
- **Root cause**: The teleport handler updated the orbit target but not `camera.up`. OrbitControls' `lookAt` used the stale up vector `(0,1,0)` and stripped roll.
- **Fix**: `camera.up` is now updated from the teleported quaternion before the orbit target update, matching what `initOrbitPivot` already does.
- Files: `components/Navigation.tsx`

### Compile Spinner Gate — Event-Driven Compile Sequencing
- **Problem**: The "Loading Preview..." spinner wasn't visible before GPU-blocking preview shader compilation. Various timing approaches (setTimeout, rAF, double-rAF, worker ACK) all had race conditions.
- **Solution**: Event-driven architecture where the spinner literally causes compilation:
  1. `setFormula`/`loadScene` call `queueCompileAfterSpinner()` which stores compile work and emits `IS_COMPILING` — no CONFIG is sent yet
  2. `CompilingIndicator` renders, its ref callback (`pingRef`) fires when the DOM is committed
  3. After `rAF → setTimeout(0)` (browser has painted), `flushCompileWork()` sends all CONFIGs + `CONFIG_DONE` to the worker
  4. Worker receives `CONFIG_DONE` → `fireCompile()` → deterministic compile start
- **State machine**: `consumeNewCycle()` flag distinguishes user-initiated cycles from worker status updates. `awaitingFlushRef` blocks stale `false` events from previous compiles. `statusRef` prevents false→false transitions from flashing the green bar.
- **Debounce**: `scheduleCompile` no longer emits `IS_COMPILING` (main thread handles it). 200ms fallback timer for non-gated compiles (feature toggles). `CONFIG_DONE` cancels the timer for deterministic start.
- **Redundant preview fix**: `_lastCompiledFormula` set before yields so concurrent `performCompilation` takes `keepCurrent` path instead of doing a second preview.
- Files: `store/fractalStore.ts`, `components/CompilingIndicator.tsx`, `engine/FractalEngine.ts`, `engine/worker/renderWorker.ts`, `engine/worker/WorkerProtocol.ts`

### Compile Timing Logs
- Permanent (not DEV-gated) `console.log` for every compile: `[Compile] Preview:`, `[Compile] Single-stage:`, `[Compile] Two-stage:` with formula name and per-phase breakdown.
- Silenced verbose DEV logs from `ShaderBuilder`, `MaterialController`, and `FractalEngine` intermediate stages.
- Files: `engine/FractalEngine.ts`, `engine/ShaderBuilder.ts`, `engine/MaterialController.ts`

## 2026-04-09

### Tutorial Hints — Contextual Whisper System
- **Behavior-adaptive hints**: 32 contextual tips that surface in the HUD based on user activity — tracks panels opened, parameters changed, formulas switched, snapshots taken, and session age
- **Progressive disclosure**: Hints are prioritized and gated by preconditions (e.g. "discover panels" only fires if the user hasn't opened any yet; "path tracing" only after advanced mode + lighting engagement)
- **Persistence**: Behavioral profile and show counts persist to localStorage; hints respect `maxShows` limits and cooldowns to avoid repetition
- **Smooth transitions**: `HintDisplay` component fades between hints; falls back to static navigation cheat-sheet when no contextual hint is active
- **Dismiss to advance**: Clicking a hint skips to the next eligible one; dismissed hints are excluded from the current rotation cycle
- **Help integration**: Hints with `helpTopicId` show a "?" button that opens the relevant help topic
- **Reset Tips**: New button in System Menu clears all hint history and behavioral profile via `FractalEvents.emit(FRACTAL_EVENTS.RESET_HINTS)`
- Files: `data/tutorialHints.ts` (NEW), `hooks/useTutorialHints.ts` (NEW), `components/tutorial/HintDisplay.tsx` (NEW), `App.tsx`, `components/ViewportArea.tsx`, `components/HudOverlay.tsx`, `components/topbar/SystemMenu.tsx`

### HUD Overlay — Split Fade Timing
- **Two-layer fade**: Crosshair fades after 2s of inactivity (unchanged), bottom pill cluster (speed, distance, hints, reset button) now stays visible for 10s before fading
- **Independent refs**: `crosshairFadeTimeout` and `bottomFadeTimeout` replace the single `fadeTimeout`; `bottomClusterRef` wraps the bottom section as a separate opacity target
- Files: `components/HudOverlay.tsx`

### ScalarInput — Custom Track Interaction
- **Replaced `<input type="range">`** with pointer-capture drag system for consistent cross-browser behavior
- **Click-to-set**: Clicking anywhere on the track jumps to that value immediately, then transitions to drag mode
- **Precision modifiers**: Hold Shift for 10× speed, Alt for 0.1× precision — modifier changes mid-drag re-anchor correctly
- **Custom thumb**: `data-role="thumb"` element with `cursor-ew-resize` replaces browser-native slider thumb
- Files: `components/inputs/ScalarInput.tsx`

### Quality Panel — Grouped Raymarching Controls
- **Whitelist-based grouping**: Raymarching section now uses `whitelistParams` to show controls in logical groups: Max Ray Steps | Step tuning (fudge, relaxation, jitter) | Detail & threshold | Distance metric & estimator
- **Max Steps always visible**: Removed `isAdvanced: true` from `maxSteps` param — now shown in all modes
- Files: `components/panels/QualityPanel.tsx`, `features/quality.ts`

### Hard Cap Constants
- **Extracted magic numbers**: `DEFAULT_HARD_CAP` (2000) and `MOBILE_HARD_CAP` (256) defined in `data/constants.ts`, replacing scattered `500`/`2000`/`256` literals across engine, store, and UI code
- Files: `data/constants.ts`, `engine/FractalEngine.ts`, `engine/HardwareDetection.ts`, `engine/managers/ConfigManager.ts`, `features/quality.ts`, `store/fractalStore.ts`, `components/panels/HardwarePreferences.tsx`

## 2026-04-08

### Mesh Export — Preview Camera Overhaul
- **Pan support**: Right-click or middle-click drag pans the view in both SDF and mesh preview modes
- **Camera preset toolbar**: Bottom-bar buttons for Front/Back/Left/Right/Top/Bottom views plus Center (reset pan)
- **Controls hint overlay**: Shows "LMB orbit · RMB pan · Scroll zoom · Shift snap" below the toolbar
- **Mesh preview pan**: Right-click/middle-click pans the wireframe preview; camera presets sync to mesh rotation
- **Preview reset on re-generate**: Clicking Generate now clears the previous mesh result, switching back to slice preview mode instead of staying stuck on the old mesh wireframe

### Mesh Export — VDB Color Grids
- **Optional Cd vec3s grid**: "Include color grids" checkbox in the export panel (off by default for performance)
- **GPU orbit-trap color sampling**: After SDF pass, walks all active density voxels, packs positions into a texture, runs the color shader, and builds a `Vec3VDBTree`
- **Standard OpenVDB format**: Color exported as a single `Cd` grid with type `Tree_vec3s_5_4_3` — loads natively in Houdini, Blender, and other VDB-compatible tools
- **Multi-grid interleaved layout**: Descriptor + offsets + data written per grid (not batched), matching the OpenVDB spec
- **vec3s tree writer**: New `Vec3LeafNode`, `Vec3Node4`, `Vec3VDBTree` types with `addVec3LeafBlock()`, `optimizeVec3Tree()`, and `_writeVec3Tree()` serializer (12-byte Vec3f background, `u8(6)` compression enum, 3×float32 per voxel)
- **VDB filenames**: Now include resolution, content tag (`-density` or `-density-color`), and timestamp

### Mesh Export — Preview Fixes
- **Missing uniform locations**: Quality uniforms (`uFudgeFactor`, `uDetail`, `uPixelThreshold`) and bounds uniforms (`uClipBounds`, `uBoundsMin`, `uBoundsMax`) were declared in the shader and set each frame, but their locations were never looked up — WebGL silently returned null, so all quality sliders had no effect
- **Quality slider labels**: Changed from `variant="compact"` (no label) to `variant="full"` so Surface Threshold, Fudge Factor, Ray Detail, and Pixel Threshold are visible with labels
- **Quality changes now trigger re-render**: `_qualitySettings` was subscribed but missing from the `useEffect` dependency array that calls `requestRender()`
- **Ortho fudge compensation**: Preview applies 0.75× multiplier on fudge factor to compensate for orthographic ray overshooting (parallel rays are more prone to missing thin features than perspective rays)

### Mesh Export — Shader Cache-Busting
- `Date.now()` timestamp comment embedded in generated SDF, color, and preview GLSL source to prevent stale browser/driver shader caches

## 2026-03-27

### Bucket Renderer Fixes

- **Scissor-based compositing** replaces shader UV discard for tile compositing. Each bucket stores integer pixel bounds (`pixelX/pixelY/pixelW/pixelH`); compositing uses `gl.setScissor()` for pixel-perfect boundaries. Eliminates 1px black stripe artifacts between adjacent tiles caused by float precision mismatch between render and composite shader `vUv` computations.
- **Half-pixel render region expansion**: `uRegionMin`/`uRegionMax` are padded by 0.5px in UV space so boundary pixels are always rendered. The scissor rect clips precisely.
- **State lock during bucket render**: Three-layer protection prevents mid-render corruption: (1) worker message filter drops all messages except `BUCKET_STOP`/`RENDER_TICK`, (2) main thread sets `isExporting=true` to lock camera/UI via `selectMovementLock`, (3) WorkerDisplay ResizeObserver skips during `isBucketRendering`.
- **Accurate size estimation**: New `canvasPixelSize` store field tracked by WorkerDisplay ResizeObserver. In Fixed resolution mode, UI components use `fixedResolution * dpr` directly instead of relying on observer timing. Fixes wrong output size shown in bucket render panel and video export time estimation.
- **Popover stays open**: Bucket render controls popover no longer closes on outside click while rendering.

### Viewport Quality System

- **New per-subsystem scalability system** replaces the old flat ENGINE_PROFILES approach. The store always holds the user's full-quality authored intent; a per-subsystem tier overlay controls what actually compiles. Switching viewport quality writes tier overrides to the store via DDFS feature setters — the existing CONFIG pipeline handles recompilation automatically.
- **Four rendering subsystems** with ordered quality tiers: Shadows (Off/Hard/Soft/Full), Reflections (Off/Env Map/Raymarched/Full), Lighting (Preview/Path Traced/PT+NEE), Atmosphere (Off/Fast Glow/Color Glow/Volumetric). Each tier defines a sparse override map of feature params.
- **Six master presets**: Preview (instant compile, no advanced lighting), Fastest, Lite, Balanced (default), Full, Ultra. Ultra and the Lighting subsystem are advanced-mode only.
- **Top-bar ViewportQuality dropdown** with master preset selection, per-subsystem tier dropdowns, compile time estimates, and Apply button for batched recompilation. PT-aware: when path tracer is active, direct-render subsystems (Shadows, Reflections) dim, and a purple Path Tracer section appears with editable controls for Max Bounces (runtime slider), GI Strength (runtime slider), Sample All Lights (compile toggle), and Environment NEE (compile toggle).
- **Hardware detection** at boot via `detectHardwareProfileMainThread()` — probes Float32 render target support, mobile detection via pointer/viewport heuristics, GPU renderer string analysis. Sets hardware caps (precision, buffer format, loop cap) that are applied as a ceiling in `getShaderConfigFromState()` Stage 3.
- **Hardware Preferences modal** accessible from System Menu — lets users override detected precision, buffer format, and hard loop cap. Renders via `createPortal` to `document.body` for correct stacking context.
- **Engine Panel moved to advanced mode.** The toggle is now inside the Advanced Mode section of the System Menu. The old ENGINE_PROFILES dropdown has been removed from SystemMenu.
- **Quality feature hardware params hidden** (`precisionMode`, `bufferPrecision`, `compilerHardCap`) — marked `hidden: true` in DDFS, managed by Hardware Preferences modal instead of Engine Panel.
- **Three-layer config pipeline**: Stage 1 (authored state) → Stage 2 (subsystem tier overrides, written directly to store) → Stage 3 (hardware caps, applied as overlay in `getShaderConfigFromState()`).
- **TSS toggle removed** from top bar and Quality panel. Accumulation is always on — the toggle was not wired to anything useful and confused users.
- **Top bar layout reorganized**: FPS counter → Pause button → divider → Viewport Quality dropdown → Path Tracer toggle. Previously the PT toggle was separated from the quality controls.
- **Preview preset** shows "lighting disabled" inline label and has corrected compile time estimate (~2s instead of ~4s).
- Files: `types/viewport.ts` (NEW), `store/slices/scalabilitySlice.ts` (NEW), `engine/HardwareDetection.ts` (NEW), `components/topbar/ViewportQuality.tsx` (NEW), `components/panels/HardwarePreferences.tsx` (NEW), `store/fractalStore.ts`, `types/store.ts`, `components/topbar/RenderTools.tsx`, `components/topbar/SystemMenu.tsx`, `components/panels/EnginePanel.tsx`, `components/panels/QualityPanel.tsx`, `features/quality.ts`, `hooks/useAppStartup.ts`

## 2026-03-21

### GMF as Primary Save Format

- **GMF replaces JSON for all scene saves.** System Menu "Save Scene" now produces `.gmf` files containing formula shader code + full scene state (camera, lighting, features, animations). JSON is retained for backward-compatible loading only.
- **PNG metadata now embeds GMF** instead of JSON. Snapshots and bucket renders embed the full GMF string, so imported/custom formulas survive PNG roundtrips.
- **Formula-only GMF loading improved.** FormulaGallery and FormulaSelect now use `loadGMFScene()` with full scene preset application (camera, features) instead of formula-switch-only.
- **URL sharing disabled for imported formulas.** Share button shows "N/A (Imported)" tooltip for Workshop-imported formulas (shader code too large for URL).
- **Legacy support preserved.** Old `.json` presets, old formula-only `.gmf` files, and old PNGs with JSON metadata all load correctly.
- **Worker registration.** Loading a GMF with an unknown formula now emits `REGISTER_FORMULA` to sync the worker thread's registry.
- **GMF API docs updated.** The embedded shader API reference now documents vec2/3/4 params, distance metrics, and rotation helpers.
- Files: `utils/FormulaFormat.ts`, `components/topbar/SystemMenu.tsx`, `components/topbar/CameraTools.tsx`, `components/LoadingScreen.tsx`, `components/panels/formula/FormulaGallery.tsx`, `components/panels/formula/FormulaSelect.tsx`, `engine/BucketRenderer.ts`, `engine/worker/WorkerProxy.ts`, `store/fractalStore.ts`

### Bucket Rendering: Offline Post-Processing & SSAA

- **Offline post-processing pipeline:** Each bucket accumulates raw linear HDR without tone mapping or bloom. After all buckets complete, the full post-processing chain (Bloom → Chromatic Aberration → Color Grading → Tone Mapping) runs once on the composited image. Ensures spatial effects work correctly across the full image rather than per-bucket.
- **SSAA pixelSizeBase override:** During supersampled bucket renders (upscale > 1×), `FractalEngine` overrides `uPixelSizeBase` each frame to keep trace precision, normals, and shadow computation at viewport resolution. Prevents double-precision artifacts from inflated render targets.
- **Center-first spiral bucket order:** Buckets now render in a spiral from the center outward instead of bottom-left to top-right, giving faster visual feedback on the important region.
- **Bucket-aware frame count:** During bucket rendering, `uFrameCount` uses per-bucket `accumulationCount` for deterministic R2 noise sequences. `resetAccumulation()` is skipped during bucket rendering (managed by BucketRenderer).
- Files: `engine/BucketRenderer.ts`, `engine/FractalEngine.ts`, `engine/RenderPipeline.ts`

### Async Convergence Measurement

- **GPU fence-based readback:** New `startAsyncConvergence()` method renders the convergence diff pass and inserts a GL sync fence. `pollConvergenceResult()` checks fence status without blocking the GPU pipeline. Cached `lastConvergenceResult` returned on subsequent frames.
- **Dynamic convergence target sizing:** Convergence render target now resizes to match the measured region's actual pixel dimensions (capped at 256×256). Previously hardcoded at 64×64, which sampled only ~0.2% of a 1080p viewport. Both bucket rendering and viewport convergence benefit.
- **Viewport convergence polling:** `RenderPipeline.render()` now runs periodic async convergence measurement every 8 frames during normal accumulation. Reads active render region from `uRegionMin`/`uRegionMax` uniforms. Skipped during bucket rendering. Result exposed via `WorkerShadowState.convergenceValue`.
- **Default convergence threshold** changed from 0.1% to 0.25%.
- **Legacy path preserved:** `measureConvergence()` kept for non-bucket paths where synchronous readback is acceptable.
- Files: `engine/RenderPipeline.ts`, `engine/BucketRenderer.ts`, `engine/worker/WorkerProtocol.ts`, `engine/worker/WorkerProxy.ts`, `engine/worker/renderWorker.ts`

### Region Rendering Overhaul

- **Region overlay with live stats:** New `RegionOverlay` component in `ViewportArea.tsx` shows pixel dimensions, live sample count, click-to-cycle sample cap, live convergence value vs threshold, and clear button. Replaces the old minimal "Active Region" label.
- **Resize handles:** 8 directional handles (`n/s/e/w/ne/nw/se/sw`) with `data-handle` attributes, visible on hover. Previously the hook checked for handles but no DOM elements existed.
- **Draw preview:** Region is now visible while drawing (dashed cyan border) via `drawPreview` from `useRegionSelection`. Previously the overlay was hidden during the selection phase (`!isSelectingRegion` guard).
- **Sample cap boot sync:** `sampleCap` is now re-sent to the worker in the `onBooted` callback, fixing a race where the initial `SET_SAMPLE_CAP` message arrived before the worker engine existed, leaving the pipeline at infinite samples.
- Files: `components/ViewportArea.tsx`, `hooks/useRegionSelection.ts`, `store/fractalStore.ts`

### Formula Library & Runtime Discovery

- **`public/formulas/` directory:** Runtime formula library with `manifest.json`, `dec.json` (316 DEC formulas), and 178 passing `.frag` files organized by author folder.
- **Build pipeline:** `build-formula-manifest.mts` generates the manifest; `build-passing-lists.mts` generates `passing-formulas.ts` from validator JSONL results.
- **`formula-library.ts`:** Curated registry with category inference, author attribution, and random formula picker. Used by FormulaGallery and Workshop "Random" buttons.
- **Shader validator:** `debug/shader-validator.mts` — live GLSL + WebGL GPU validation tool with web dashboard. Tests all frag + DEC sources through the V3 pipeline with an ENGINE_SCAFFOLD mirroring the real GMT shader context. Results: 238/271 frag GLSL pass, 316/333 DEC pass, 181 WebGL GPU verified.
- Files: `features/fragmentarium_import/formula-library.ts`, `features/fragmentarium_import/passing-formulas.ts`, `features/fragmentarium_import/random-formulas.ts`, `public/formulas/`, `debug/shader-validator.mts`, `debug/build-formula-manifest.mts`, `debug/build-passing-lists.mts`

### Frag Importer V3 Rewrite (V2 Removed)

- **V3 pipeline:** New `features/fragmentarium_import/v3/` with `analyze/` (globals, params, preprocess, functions, init) and `generate/` (full-de, get-dist, init, loop-body, patterns, rename, slots, uniforms) modules.
- **V3 improvements:** HLSL alias handling, multi-line global declarations, literal inits at file scope, engine function collision rename, deterministic slot assignment, scalar DR accumulator detection, for-loop increment extraction, paren-aware comma splitting.
- **V2 removed:** Deleted `ast-parser.ts`, `uniform-parser.ts`, `code-generator.ts`, `init-generator.ts`, `loop-extractor.ts`, `pattern-detector.ts`, `detection.ts`, `preview.ts`. V3 compat adapter (`v3/compat.ts`) bridges to the Workshop.
- **Test suites:** `test-frag-integration.mts` (full pipeline), `test-frag-v3-analysis.mts`, `test-frag-v3-generation.mts`, `test-dec-formulas.mts` (339 DEC functions).
- Files: `features/fragmentarium_import/v3/`, `features/fragmentarium_import/types.ts`, `features/fragmentarium_import/index.ts`, `features/fragmentarium_import/transform/variable-renamer.ts`, `debug/test-frag-*.mts`

### UI Component Library

- **`CategoryPickerMenu.tsx`:** Generic two-column portal dropdown with viewport-aware positioning (smart flipping, spillover handling). Supports categorized items with disabled/selected states. Used by ParameterSelector and LFO target picker.
- **`DynamicList.tsx`:** Reusable list component family (container, item, group, search) with accent theme system (cyan/purple/amber). Used by LfoList.
- **`data/theme.ts`:** Centralized semantic theme tokens for Tailwind classes — accent, secondary, warning, danger, surface, text, borders. Composite tokens for common patterns (tabActive, nestedContainer, etc.). Enables single-file theme changes.
- **ParameterSelector refactor:** Extracted `buildCategories()` helper, uses CategoryPickerMenu, proper feature ordering (priority list then alphabetical), `MAX_LIGHTS` instead of hardcoded 3.
- **LfoList refactor:** Converted to DynamicList + DynamicListItem with purple accent. Declarative layout replaces manual div nesting.
- Files: `components/CategoryPickerMenu.tsx`, `components/DynamicList.tsx`, `data/theme.ts`, `components/ParameterSelector.tsx`, `components/panels/formula/LfoList.tsx`

### Drawing Overlay Projection Refactor

- **`OverlayProjection.ts`:** Shared 3D→2D projection utilities for overlays (light gizmos, drawing tools). Pre-allocated temp vectors eliminate per-frame GC pressure. Consistent behind-camera culling, view-depth calculation, screen coordinate safety clamping.
- **DrawingOverlay.tsx:** Refactored to use centralized projection via `getOverlayViewport`, `projectWorldToXY`, `preciseToWorld`. Removed duplicated projection math and per-frame Vector3/Quaternion allocations.
- Files: `engine/overlay/OverlayProjection.ts`, `features/drawing/DrawingOverlay.tsx`

### Misc Cleanup

- **Deleted stray files:** `LICENSE.txt` (GPL-3.0 defined in package.json), `googlef57afa274804ba8c.html` (Google verification), `debug/trace-dec.mts` (replaced by test-dec-formulas.mts).
- **Theme token integration:** `CollapsibleSection`, `SectionLabel`, `ToggleSwitch`, `Icons`, `LoadingScreen`, `GradientContextMenu` updated to use `data/theme.ts` tokens.
- **GizmoMath refactor:** Consolidated gizmo math utilities in `features/lighting/utils/GizmoMath.ts`.
- **Legacy preset support:** `fractalStore.ts` now registers embedded `_formulaDef` from old JSON presets into the runtime formula registry.
- **ReSTIR GI prototype:** `prototype/restir-gi/` — WIP global illumination prototype (not integrated).

## 2026-03-20

### Formula Workshop Cleanup & Degree/Radian Fix

- **Degree/radian bug fixed:** `param-builder.ts` was converting isDegrees params to radians (dividing by π), but Fragmentarium GLSL expects degrees. Introduced `scale: 'degrees'` mode — keeps internal values in degrees, displays π notation in UI (`360° → "2.00π"`). Distinct from DDFS `scale: 'pi'` where internal values are radians.
- **Workshop UI touchup:** Toolbar (Browse Library, Random Frag, Random DEC, Load File) moved outside source section so buttons are always visible. Source editor now resizable via drag handle (100–800px). Preview button restored (was defined but missing from JSX — regression).
- **Workshop code cleanup:** Extracted `runTransform()` helper deduplicating 3× V3→V2 fallback patterns. Extracted `ParamTable` component with memoized grouping. All handlers wrapped in `useCallback`. Removed debug console.logs and dead code.
- **formula-library.ts cleanup:** Imports moved to top, regex fix (`2\.0?` → `2(?:\.0)?`), array spread optimization in `inferDECCategory`.
- **FormulaPanel degrees scale:** New `scale: 'degrees'` handler with `customMapping` (toSlider/fromSlider using 1/180 factor) and `overrideInputText` for π display.
- Files: `features/fragmentarium_import/FormulaWorkshop.tsx`, `features/fragmentarium_import/workshop/param-builder.ts`, `components/panels/FormulaPanel.tsx`, `features/fragmentarium_import/formula-library.ts`, `components/vector-input/types.ts`

### Canvas Resolution Fix on Initial Load

- **Physical pixel mismatch:** `setupEngine()` in `renderWorker.ts` was setting `uResolution` and `pipeline.resize()` with CSS pixels instead of physical pixels (CSS × DPR). The bloom pass already used the correct `initPhysW`/`initPhysH` values — now the pipeline and uniforms do too.
- **Stale closure in post-compile resize:** `WorkerTickScene`'s `checkReady` effect captured `size` and `dpr` at mount time (empty deps `[]`). During the long async shader compilation, the viewport could change (layout shifts, dock panels). The post-compile re-push then overwrote correct dimensions with stale values. Fixed by tracking the latest size in a `useRef`.
- Files: `engine/worker/renderWorker.ts`, `components/WorkerTickScene.tsx`

### Distance Probe Sky Threshold & Cleanup

- **Sky threshold capped at 10.0:** Depth values ≥ 10 are now treated as sky hits (was 1000). Prevents navigation speed explosions when looking at open space.
- **Sky fallback behavior:** When looking at sky with no prior valid measurement, defaults to DST 1.0. When a valid measurement exists, keeps it unchanged. HUD shows `DST X.XXXX (sky)` instead of `DST INF`.
- **Consistent threshold:** Updated in `usePhysicsProbe.ts`, `WorkerDepthReadback.ts`, and `WorkerExporter.ts`.
- **usePhysicsProbe cleanup:** Removed unused imports (`useEffect`, `THREE`), unused refs (`camera`, `shaderCompiledRef`, `depthBuffer`), dead `distMinRef` (always mirrored `distAverageRef`, never consumed). Extracted HUD helpers (`formatDist`, `updateDistHud`, `updateResetButton`, `updateSpeedHud`). ~247 → ~160 lines.
- Files: `hooks/usePhysicsProbe.ts`, `engine/worker/WorkerDepthReadback.ts`, `engine/worker/WorkerExporter.ts`

### Instant Drag Feedback (Direct DOM Updates)

- **DraggableNumber instant display:** During drag, the display text is updated via direct DOM manipulation (`displayRef.textContent`) on every pointer move, bypassing the React render cycle. The `onImmediateChange` callback propagates the raw value to the parent for fill bar updates.
- **ScalarInput fill bar sync:** Fill bars (`fillBarRef`, `fullTrackFillRef`) and range input track are updated synchronously during drag via `handleImmediateChange`. Uses refs attached to the compact fill bar (`data-role="fill"`) and full track bar.
- **BaseVectorInput `pushAxisToDOM`:** For DualAxisPad drag, linked-mode drag, direction mode, and rotation heliotrope — where the drag source isn't the DraggableNumber itself — BaseVectorInput queries the container (`sliderRowRef`) for axis cells by `data-axis-index` attribute, then updates `[data-role="value"]` text and `[data-role="fill"]` width directly.
- **`computePercentage` utility:** Extracted to `FormatUtils.ts` — shared percentage calculation (value → 0-100% with optional mapping) used by both ScalarInput and BaseVectorInput's DOM push.
- **`useDragValue` hook:** Now exposes `immediateValueRef` (a ref updated synchronously during drag) so DraggableNumber can read the latest value without waiting for React state.
- **Type fix:** Added `vec4A/B/C` to `FractalParameter.id` union and `'vec4'` to `type` union in `types/fractal.ts`.
- Files: `components/inputs/primitives/DraggableNumber.tsx`, `components/inputs/ScalarInput.tsx`, `components/inputs/hooks/useDragValue.ts`, `components/vector-input/BaseVectorInput.tsx`, `components/vector-input/VectorAxisCell.tsx`, `components/inputs/primitives/FormatUtils.ts`, `types/fractal.ts`

## 2026-03-19

### Vec4 Input Support

- **Vector input components now support vec4 (XYZW):** Both `BaseVectorInput` (THREE.Vector4) and `VectorInput` (plain object `{x,y,z,w}`) detect a W component and render a fourth axis.
- **W axis styling:** Purple (`#a855f7`) following the X=red, Y=green, Z=blue convention. Added to `AXIS_CONFIG` in both type files.
- **WZ dual axis pad:** Draggable 2D pad between Z and W sliders for simultaneous manipulation.
- **`Vector4Input` connected component:** Full animation/keyframe support matching `Vector2Input`/`Vector3Input` pattern.
- **AutoFeaturePanel `vec4` case:** Features declaring `type: 'vec4'` params in DDFS now auto-render with 4 axes, track keys, and `composeFrom` decomposition.
- **Type updates:** `VectorInputProps`, `BaseVectorInputProps`, axis bounds/mapping/update functions, toggle mode, and linked mode all extended to accept `'w'` axis.
- Files: `components/inputs/types.ts`, `components/inputs/VectorInput.tsx`, `components/vector-input/types.ts`, `components/vector-input/BaseVectorInput.tsx`, `components/vector-input/index.tsx`, `components/AutoFeaturePanel.tsx`

## 2026-03-17

### Area Lights Compile/Runtime Split

- **Two-level control:** `ptStochasticShadows` (compile-time, `onUpdate: 'compile'`) gates stochastic shadow code generation. `areaLights` (runtime, `uAreaLights` uniform) toggles stochastic path at runtime.
- **Defaults:** Compiled on init (`ptStochasticShadows: true`), but turned off (`areaLights: false`). Balanced preset enables both; Lite disables compile.
- **UI:** Runtime "Area" toggle button in shadow popup (top bar), hidden when not compiled. Compile toggle in Engine panel.
- **Removed:** Area lights switch from Quality panel (now controlled by compile toggle + runtime toggle).
- Files: `features/lighting/index.ts`, `features/lighting/components/ShadowControls.tsx`, `features/engine/profiles.ts`, `shaders/chunks/lighting/pbr.ts`, `shaders/chunks/pathtracer.ts`, `shaders/chunks/ray.ts`, `components/panels/QualityPanel.tsx`

### CompilableFeatureSection Component

- **New reusable component** (`components/CompilableFeatureSection.tsx`): DDFS-driven UI for features with compile/runtime split. Reads `panelConfig` from feature registry or accepts explicit props.
- **Pattern:** Runtime toggle (instant on/off) + compile gate (shader rebuild) + compile settings sub-section + runtime params. Status dots (active/pending). Compile bar with Compile button + engine icon button.
- **Engine queue integration:** Engine icon opens Engine panel and queues compile flag + any pending compile settings via `engine_queue` event pattern.
- **`panelConfig` added to `FeatureDefinition`:** Declarative UI configuration for compilable sections.
- **Applied to:** Volumetric Scatter (via `panelConfig`), Hybrid Box Fold (via explicit props).
- Files: `components/CompilableFeatureSection.tsx`, `engine/FeatureSystem.ts`, `features/volumetric/index.ts`, `components/panels/ScenePanel.tsx`, `components/panels/FormulaPanel.tsx`

### DDFS Overhaul (P1-P2)

- **P1 — ShaderBuilder assembly order:** Added comprehensive assembly order comment block (positions 1-17) and JSDoc comments on all injection API methods with scope variables and usage examples.
- **P2 — Named params:** `setDistOverride()` now takes a named object (`init`, `inLoopFull`, `inLoopGeom`, `postFull`, `postGeom`). `addVolumeTracing(marchCode, finalizeCode)` and `addHybridFold(init, preLoop, inLoop)` use named params. Internal field names updated to match.
- **P3 — Accumulative hooks:** `addPostMapCode()` and `addPostDistCode()` added for accumulative injection inside `map()`/`mapDist()`.
- **P4 — Water plane extraction:** All water-specific code removed from `de.ts` and `material_eval.ts`. Water feature now injects via `addPostMapCode`, `addPostDistCode`, `addMaterialLogic`, and `addDefine`.
- Files: `engine/ShaderBuilder.ts`, `features/core_math.ts`, `features/volumetric/index.ts`, `features/geometry/index.ts`, `features/water_plane.ts`, `shaders/chunks/de.ts`, `shaders/chunks/material_eval.ts`

## 2026-03-16

### Unified Camera Coordinate System

**Architecture:**
- **Canonical camera state:** `cameraPos` has been removed from the store entirely — it was always `(0,0,0)`. All world position lives in `sceneOffset` (high-precision `PreciseVector3`). The field remains in the `Preset` type for backwards-compatible serialization; `applyPresetState()` absorbs it into `sceneOffset` on load. Navigation's debounced store write normalizes by folding `camera.position` into `sceneOffset` after every interaction.
- **`targetDistance` unified:** Always means physics-based surface distance (from raymarching probe), never orbit radius. Removed the orbit-mode override that wrote `camera.position.length()` to `targetDistance`.
- **`isOrbit` removed from VirtualSpace:** `updateSmoothing()` in `PrecisionMath.ts` no longer takes an `isOrbit` parameter. Both modes use the same lerp-based smoothing path. Removed from `FractalEngine.ts` call site as well.
- **Shadow unified offset:** Navigation computes `sceneOffset + camera.position` every frame as a shadow ref, so canonical world position is always available for reads regardless of orbit interaction state.
- **`initOrbitPivot()` helper:** Unified orbit setup used on initial load, mode switch, camera unlock, teleport, and animation stop. Sets orbit target at `camera.position + forward * surfaceDistance` without manipulating `sceneOffset` (avoids `OFFSET_SET` to worker which resets accumulation).
- **Mode-agnostic engine:** `cameraMode` in `renderState` is informational only (HUD display). Zero engine-level branching on camera mode in VirtualSpace, FractalEngine, renderWorker, animation, camera manager, or preset system.
- **Simplified mode switching:** `absorbOrbitPosition()` folds residual orbit position into offset on Orbit→Fly switch. Fly→Orbit just calls `initOrbitPivot()`. Removed `syncOrbitTargetToCamera()` and forced OrbitControls remount (`orbitControlsKey`).
- **Mode-agnostic `useInteractionManager`:** Light drag position absorption now checks `cam.position.lengthSq() > 1e-8` instead of `state.cameraMode === 'Fly'`.

**Impact:**
- Animation timeline, camera manager, preset system, and undo/redo no longer need to know about Orbit vs Fly mode.
- Camera saves from Orbit mode load correctly in Fly mode (and vice versa) with consistent surface distance.
- No visual jumps or accumulation resets during orbit interactions.

- Files: `components/Navigation.tsx`, `engine/PrecisionMath.ts`, `engine/FractalEngine.ts`, `hooks/useInteractionManager.ts`, `types/common.ts`

### Camera Manager Overhaul

**New features:**
- **Drag-to-reorder:** Saved cameras can be reordered via drag handles in the camera list.
- **Update camera button:** Active cameras show an amber overwrite button when the view has drifted from the saved state, with a `*` modified indicator.
- **Smooth transitions:** Switching between saved cameras now lerps position (smoothstep) and slerps rotation over 0.5s. User input cancels the transition instantly.
- **Thumbnails:** New cameras auto-capture a 128x128 thumbnail from the current render. Displayed in the camera list for visual identification.
- **Duplicate camera:** Copy button clones a saved camera with all state (position, rotation, optics) and "(copy)" suffix.
- **Keyboard shortcuts:** `Ctrl+1` through `Ctrl+9` instantly switch to saved camera slots 1-9. Shortcut hints shown in the camera list.
- **Unified position display:** Collapsible section showing live XYZ position and rotation in unified coordinates (high-precision).
- **Export/Import cameras:** Export saved cameras as JSON, import from file. Cameras are also persisted in presets and PNG snapshot metadata.
- **Frame fractal button:** Auto-adjusts camera distance based on the physics probe's distance estimate for comfortable framing.
- **Delete confirmation:** Delete now requires a second click within 3s to confirm, preventing accidental camera loss.

**Store fixes:**
- **Undo stack cap:** Camera undo/redo stacks now capped at 50 entries (was unbounded).
- **Clear undo on formula change:** Camera undo/redo stacks cleared when switching formulas (old positions are meaningless for new fractals).
- **Typed optics accessor:** Replaced `as any` casts for `setOptics` with a typed helper function `getSetOptics()` in cameraSlice.

**Architecture:**
- New `camera_transition` event in FractalEvents for smooth animated camera moves (distinct from instant `camera_teleport`).
- `duplicateCamera` and `reorderCameras` actions added to cameraSlice and FractalActions interface.
- `savedCameras` field added to `Preset` type — cameras now persist in presets, share strings, and PNG snapshots.

### Gradient Editor Improvements

**Bug fixes:**
- **Step interpolation mismatch:** GPU texture generation used `t < 0.5 ? 0 : 1` (midpoint switch) while the CSS preview held the left color until the boundary. Texture now uses `t = 0` to match the preview — step mode holds each stop's color for its full segment.
- **Histogram phase preview broken:** `backgroundPosition: ${phase * 100}%` used CSS percentage semantics (relative to `container - tile`) which gives zero shift for `repeats=1` and wrong values for all other repeat counts. Replaced with a clipped inner div using `translateX` for correct phase visualization at all repeat values.
- **Undo flooding on gradient sliders:** Position and Bias sliders called `handleInteractionStart`/`End` on every onChange tick, but the Slider component already manages its own drag lifecycle snapshots. Removed the redundant wrapping so only one undo snapshot is created per drag operation.

**UX:**
- **Gradient section padding:** Added horizontal padding so edge knot handles and drag selections aren't clipped.
- **Step-aware knot creation:** Clicking to add a knot in a Step segment now inherits the held color instead of interpolating.
- **Ctrl+Drag to duplicate:** Ctrl+drag a knot handle or the multi-selection drag area to duplicate knots.
- **Multi-selection redesign:** Replaced the bottom-hanging purple bracket with inline cyan selection: tinted background with dashed bottom edge for drag affordance, and `[` `]` bracket handles for scaling. Dragging a bracket past the opposite side inverts knot positions.
- **Bias handles hidden for Step:** Diamond bias handles are suppressed for step-interpolated segments where they have no effect.
- **Distinct cursor for selection drag:** Selection drag area uses `cursor-move` (four-way arrows) to differentiate from individual knot handles (`cursor-grab`).
- **Presets button visibility:** Presets button now has a visible border and text label ("Presets") instead of just an icon.

- Files: `components/AdvancedGradientEditor.tsx`, `components/Histogram.tsx`, `utils/colorUtils.ts`, `data/help/topics/ui.ts`

## 2026-03-14

### Light Gizmo Improvements

**Bug fixes:**
- **Headlamp mode flip during drag:** `useInteractionManager.ts` unconditionally set `fixed: false` on every pointermove during CenterHUD panel drag, overriding headlamp mode for already-visible lights. Now only forces world-space when placing an inactive light for the first time.
- **Anchor icon lag:** Gizmo label read `fixed` from React props (potentially stale during drag). Now subscribes directly to the store via `useFractalStore` selector.
- **DrawnShape SyntaxError:** `features/types.ts` and `types/store.ts` used value imports for type-only symbols, causing esbuild to emit missing exports. All type-only imports/re-exports now use `import type` / `export type`.

**Architecture:**
- **Stable light IDs:** Added `id: string` to `LightParams` with monotonic `generateLightId()` counter. Gizmo refs keyed by ID instead of array index. `draggedLightIndex` changed from `number` to `string` (light ID) across store, CenterHUD, and useInteractionManager. One-time migration via `ensureLightIds()` for legacy state.
- **uLightDir sign convention:** Direction negated once at boundary in `UniformManager.ts` (now stores "toward light"). Removed per-consumer negation from `pbr.ts`, `pathtracer.ts`, and `volumetric_scatter.ts`. Updated CLAUDE.md shader conventions.
- **Skip unused uniforms:** `UniformManager.ts` skips falloff/falloffType/position/radius/softness for directional lights (shader ignores them).

**Performance:**
- **Visibility culling in tick:** `LightGizmo.tick()` reads lights once and skips hidden/directional lights entirely (no function call overhead). Added `hide()` method to SingleLightGizmo imperative handle.

**UX:**
- **Gizmo visibility outside canvas:** Removed `overflow-hidden` from LightGizmo container and DomOverlays wrapper in `ViewportArea.tsx`.
- **Snap/grid support:** Shift-drag snaps light position to 0.25 world-unit grid increments.
- **Light duplication:** New `duplicateLight(index)` action. Duplicate button (copy icon) added to light settings popup header.

- Files: `features/lighting/LightGizmo.tsx`, `features/lighting/components/SingleLightGizmo.tsx`, `features/lighting/components/LightControls.tsx`, `features/lighting/index.ts`, `types/graphics.ts`, `types/store.ts`, `store/slices/uiSlice.ts`, `hooks/useInteractionManager.ts`, `components/topbar/CenterHUD.tsx`, `components/ViewportArea.tsx`, `engine/managers/UniformManager.ts`, `shaders/chunks/lighting/pbr.ts`, `shaders/chunks/pathtracer.ts`, `shaders/chunks/lighting/volumetric_scatter.ts`, `features/types.ts`, `CLAUDE.md`

## 2026-03-13

### Code Splitting (React.lazy)
Main index bundle reduced from ~1,768 KB to ~915 KB (~48% reduction).
- **App.tsx**: Timeline, FormulaWorkshop, HelpBrowser converted to `React.lazy()` with `<Suspense fallback={null}>`
- **features/ui.tsx**: `lazify()` helper wraps lazy components with Suspense for the component registry. FlowEditor, AudioPanel, AudioSpectrum, DebugToolsOverlay lazified.
- **DebugToolsOverlay.tsx**: ShaderDebugger and StateDebugger lazy-loaded internally
- **AutoFeaturePanel.tsx**: AdvancedGradientEditor lazy-loaded
- Unused AdvancedGradientEditor imports removed from RenderPanel and ColoringHistogram
- VideoExporter already used dynamic `import()` — no change needed
- Files: `App.tsx`, `features/ui.tsx`, `features/debug_tools/DebugToolsOverlay.tsx`, `components/AutoFeaturePanel.tsx`, `components/panels/RenderPanel.tsx`, `components/panels/gradient/ColoringHistogram.tsx`

### Dead Code & Param Cleanup
- Deleted `components/App.tsx` (stale duplicate, not imported anywhere — root `App.tsx` is the real entry)
- Removed dead `scaleX`/`scaleY` params from `features/texturing.ts` (no uniform → rendered in UI but had no shader effect). Working control is `textureScale` (vec2, `uTextureScale`).

### Documentation & Help System
- Version bump to 0.8.9 (package.json, CLAUDE.md, docs)
- About page: version display, Claude credit, tech stack, fractal reference links
- Help topics added: Reflections, Volumetric Scatter, Water Plane, Geometry & Transforms (9 fold types), Camera Manager, Webcam Overlay, Borromean/KaliBox/MandelMap formulas
- Keyboard shortcuts documented: Backtick (Advanced Mode), B (Broadcast), Space (Play/Pause)
- `docs/01_System_Architecture.md`: TickRegistry section added, WorkerProxy path fixed
- `docs/08_File_Structure.md`: comprehensive rewrite (worker/, geometry/folds/, volumetric/, new primitives, removed stale entries)
- `.gitignore`: added `fractal_generator_*.glsl` pattern
- Stale `MandelbulbScene.tsx` comment reference removed from `shaders/chunks/post.ts`

## 2026-03-12

### Path Tracer Cleanup & Performance
Major refactor of `shaders/chunks/pathtracer.ts` addressing bugs, duplication, and performance.

**Bug fixes:**
- **Fog on sky miss always maxed out:** `smoothstep(uFogNear, uFogFar, uFogFar)` always returned 1.0 — added `uFogFar < 1000.0` guard and changed input to `uFogFar * 0.95` so fog responds to settings
- **Russian roulette random correlation:** Termination decision reused `randType` (already consumed by spec/diff bounce selection), biasing termination per bounce type. Now uses a decorrelated `fract(blueNoise.r * 1.618 + 0.7)`

**Shared helpers extracted** (`shaders/chunks/lighting/shared.ts`, injected as `LIGHTING_SHARED`):
- `buildTangentBasis(n, out t, out b)` — consistent tangent frame used by cosine hemisphere, GGX importance sampling, and shadow jitter (replaced 3 inconsistent inline constructions)
- `fresnelSchlick(cosTheta, F0)` — single Schlick implementation shared across pbr.ts, pathtracer.ts, and env NEE (replaced 5+ inline `pow(1-x, 5)` expressions)
- `intersectLightSphere(ro, rd)` → `vec2(fade, index)` — shared ray-sphere test for visible light spheres (replaced ~25-line duplicated blocks in pathtracer.ts and shading.ts)

**Hoisted Fresnel computation:** `F0`, `F_surface`, `viewDir`, `NdotV` computed once per bounce before NEE. Previously F0/F were computed 3 times (NEE, env NEE, bounce selection) with identical inputs.

**Unified Smith-GGX:** Path tracer used height-correlated Smith (`2n/(n + sqrt(a² + (1-a²)n²))`, 2× `sqrt` per term). Replaced with Schlick-GGX (`n/(n(1-k) + k)`, `k = a/2`) matching pbr.ts — eliminates visual discrepancy between Direct and PT modes and removes per-term `sqrt`.

**Lean bounce tracer (`traceSceneLean`):**
- `getTraceGLSL()` now accepts optional `functionName` parameter
- In PT mode, `ShaderBuilder` emits a second `traceSceneLean()` with empty volume body/finalize code
- Bounce rays and env NEE visibility tests call `traceSceneLean`, skipping per-step volume accumulation (density, glow, scatter) that was being computed and discarded
- Primary camera ray still uses full `traceScene()` with volume effects

**PI/TAU constants:** Added `#define PI 3.14159265` and `#define TAU 6.28318530` in `math.ts`. Replaced all `3.14159` / `6.283185` / local `float pi` literals across pathtracer.ts, pbr.ts, volumetric_scatter.ts, and ray.ts. `phi` (golden ratio) already existed as a global const.

- Files: `shaders/chunks/pathtracer.ts`, `shaders/chunks/lighting/shared.ts` (new), `shaders/chunks/lighting/pbr.ts`, `shaders/chunks/lighting/shading.ts`, `shaders/chunks/lighting/volumetric_scatter.ts`, `shaders/chunks/math.ts`, `shaders/chunks/ray.ts`, `shaders/chunks/trace.ts`, `engine/ShaderBuilder.ts`, `features/lighting/index.ts`

## 2026-03-11

### PBR Specular Upgrade (Cook-Torrance)
- Replaced Blinn-Phong specular with GGX distribution + Smith-GGX geometry term
- Tighter highlight core with natural long tail at all roughness levels
- Geometry attenuation correctly darkens specular at grazing angles
- `NdotV` hoisted outside light loop (was recomputed per-light)
- Files: `shaders/chunks/lighting/pbr.ts`

### Reflection/Metallic Fixes
- **Metallic on bounces:** Reflection bounce PBR was hardcoded to `metallic=0.0` — now uses `uReflection` so reflected surfaces show correct metallic shading
- **Normal orientation:** Added `dot(r_n, -currRd) < 0` flip to fix back-face lighting in concave fractal geometry (caused asymmetric "lit from inside" on one side)
- **Bounce shadows:** Enabled shadow computation on reflection hits, gated by `!isMoving` for performance (accumulates when still, skipped during interaction)
- **Fresnel weighting mismatch:** `simpleEnv` fallback was missing `F * uSpecular` weighting — created brightness discontinuity when Raymarch Mix < 1.0
- **Adaptive reflection bias:** Replaced hardcoded `0.01` offset with `max(0.001, pixelSizeScale * d * 2.0)` — prevents self-intersection at deep zoom and detachment when zoomed out
- **Cached reflect direction:** `reflect(-v, n)` computed once, reused for trace and simpleEnv (was computed twice)
- **Hit refinement:** Reflection tracer retreats by `d * 0.5` at hit before evaluating orbit traps — reduces color noise at glancing angles
- **Roughness cutoff default:** Changed from 0.5 to 0.62
- Files: `shaders/chunks/lighting/shading.ts`, `features/reflections/shader.ts`, `features/reflections/index.ts`

### Fog System Cleanup
- **`uFogColorLinear` uniform:** `InverseACESFilm(uFogColor)` precomputed on CPU once per frame, replacing 5+ per-pixel quadratic solves across shading, post, main, and pathtracer
- **Env fog consistency:** Replaced hardcoded `0.8` blend with `smoothstep(uFogNear, uFogFar, uFogFar)` — env fog now responds to fog range settings
- **Pathtracer sky fog:** Replaced hardcoded distance `100.0` with `uFogFar`
- **Double-fog fix:** Removed distance fog from reflection HIT path — `post.ts` applies single primary-distance fog to composed pixel
- **Fog helpers:** `applyEnvFog()` and `applyDistanceFog()` extracted in shading.ts
- Files: `shaders/chunks/lighting/shading.ts`, `shaders/chunks/post.ts`, `shaders/chunks/main.ts`, `shaders/chunks/pathtracer.ts`, `engine/UniformNames.ts`, `engine/UniformSchema.ts`, `engine/managers/UniformManager.ts`

### Shading Code Cleanup
- Extracted `sampleLightSphereOrEnv()` helper from inline 35-line light sphere intersection block
- Removed unused `isMobile` parameter from `getShadingGLSL()`
- Added Fresnel variant documentation comments (Schlick vs Schlick-Roughness)
- Files: `shaders/chunks/lighting/shading.ts`, `features/lighting/index.ts`

## 2026-03-10

### Two-Stage Shader Compilation
- Solves 14-19s compile block on Windows/Chrome (fxc inlines formula 10+ times)
- Preview shader with colored N·L lighting stubs compiles in <1s, renders immediately
- Full shader compiles async via `KHR_parallel_shader_compile` + 1x1 FBO dummy scene
- Three paths in `performCompilation()`: two-stage (formula change), keepCurrent (engine settings), single-stage (fallback)
- Generation counter (`_compileGeneration`) cancels stale compiles on rapid formula switches
- `CompilingIndicator.tsx`: "Compiling Lighting..." (two-stage) or "Compiling Shader..." (keepCurrent)
- Bug fixes: `buildFullMaterial` uses local `targetMode` stored as `_gmtMode`; `modeChanged` gated with `!rebuildNeeded`

### Step Jitter Parameter
- Exposed hardcoded stochastic ray jitter as `stepJitter` quality param (uniform `uStepJitter`)
- Files: `features/quality.ts`, `shaders/chunks/trace.ts`

## 2026-03-09

### Worker Frame Transfer Optimization (Session 4+5)
- Auto-presenting OffscreenCanvas replaces `transferToImageBitmap()` (eliminated 26ms GPU stall)
- PBO async depth readback avoids `glFinish()`
- MessageChannel tick scheduling

### Bucket Render Worker Migration (Session 4+5)
- Full protocol: BUCKET_START/STOP/STATUS/IMAGE
- `BucketRenderControls.tsx` rewritten to use WorkerProxy
- `compositeCurrentBucket()` disables `gl.autoClear` during render

### Video Export Fixes (Session 4+5)
- `FileSystemWritableFileStream` wrapped in plain `WritableStream` proxy (not transferable via postMessage)
- Matrix3/4 serialization: `MaterialController.setUniform` handles plain `{elements: [...]}` from structured clone

### Focus Pick & Light Gizmos (Session 3)
- Focus pick depth snapshot system (3-phase protocol: START → capture depth buffer → SAMPLE from stored buffer → END)
- Focus Lock toggle: replaces "Auto-Centre", syncs `dofFocus = lastMeasuredDistance` in `usePhysicsProbe`
- Light gizmo cleanup: removed dead `engine.virtualSpace` branches, fixed worker-mode coordinate conversion
- Fly mode light drag-in offset absorption (`lightDragSyncedRef` in useInteractionManager)
- R3F camera FOV sync from `optics.camFov` each frame

### Blue Noise Overhaul (Session 2)
- Replaced grayscale 128x128 PNG with `LDR_RGBA_0.png` (4 independent channels)
- Fixed `createImageBitmap` premultiplied alpha corruption (`premultiplyAlpha: 'none'`)
- Fixed R2 temporal offset (old `fract(n*PHI)` identical for integer n → 45° streaks)
- Worker fetch URL derives page base from worker URL for production

### TickRegistry (Session 2)
- Phase-based tick orchestrator replacing hardcoded sequence in WorkerTickScene
- Phases: SNAPSHOT → ANIMATE → OVERLAY → UI
- Light gizmo fixes: prefer worker shadow state over stale store offset during fly mode
- RenderPopup fix: use `engine.accumulationCount` shadow state (not `engine.pipeline`)

### Worker Phase 2 Features (Session 1)
- Histogram probe RPC, GPU info via BOOTED message, perf monitor via shadow state
- Accumulation flash fix: removed `wasActiveRef` dirty kick — engine threshold detection handles deceleration
- Post-param accumulation fix: removed `isUserInteracting` from `isCameraInteracting`
- Snapshot fix: `!engine.isBooted` guard (renderer is always null in worker mode)

## 2026-03-07

### Shadow Regression Fix
- Root cause 1: `lVec = uLightDir[i]` negation removed in `pbr.ts` → restored `lVec = -uLightDir[i]`
- Root cause 2: Quilez 2015 soft shadow formula drove `res` too low → reverted to simple formula
- Root cause 3: Directional `distToLight = 10000.0` accumulated near-misses → reduced to `100.0`
- Threshold tightened from `t * 0.0005` to `t * 0.0001` in `GetSoftShadow`
- Same direction fix applied to `pathtracer.ts` for PT mode

### Volumetric Scatter
- Beer-Lambert fog with HG phase function, stochastic sampling
- Emissive surface color scatter via orbit trap layer 1
- `fogAnisotropy` (uPTFogG) moved to atmosphere fog section
- `fogDensity` uses log scale, max 0.5

### Engine Panel Tooltip Fix
- Portal-based tooltip detects panel side and opens on opposite side with correct arrow

## 2026-03-06

### Fragmentarium Importer Refactor
- Old monolithic `GenericFragmentariumParserV2.ts` split into `parsers/`, `transform/`, `workshop/`
- Entry: `FormulaWorkshop.tsx` → `detection.ts` → `ast-parser.ts` → `code-generator.ts`
- getDist generation: 3 paths (accumulator, expression, fallback)
- Test suite: 40/40 passing (`npx tsx debug/test-frag-importer.mts`)
- Docs 13/15/16/17/18 (obsolete) deleted

### Vec Formula Parameters
- `vec2A/B/C`, `vec3A/B/C` (uniforms `uVec2A-C`, `uVec3A-C`)
- Per-axis animation targeting

### Unified Input System
- `components/inputs/` + `components/vector-input/` replaces deleted Vector2Pad / Vector3Input

## 2026-03-05

### PT Quality Parameters
- Rim light fix (bounce 0 only), visible light spheres, PixelSizeBase uniform

## 2026-03-03

### Vector Controls Enhancement
- Rotation mode with heliotrope direction visualizer
- Unit toggle (degrees/radians) via right-click context menu
- Double-click axis labels to reset to default
- Alt-drag skips step quantization for full precision
- Fixed double-mapping bug in slider min/max

### Code Health
- `shaderGenerator` removed from FeatureDefinition (dead code)
- `shader` → `postShader` rename in FeatureDefinition
- `ShaderConfig` extracted to `engine/ShaderConfig.ts`
- Category 2 `any` fixes: inject config, ParamCondition, ParamOption, EngineInputEvent, compileTimer
- `utils/FragmentariumParser.ts` duplicate removed
