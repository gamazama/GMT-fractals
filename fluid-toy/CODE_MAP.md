# fluid-toy — code map

Reading this once should let you find any file without grep. Architecture
overview lives in [README.md](README.md); this doc is purely the index.

## Boot & shell

- **[main.tsx](main.tsx)** — entry point. Installs engine plugins (topbar,
  hud, undo, modulation, camera, scene-io, …), registers feature slices,
  registers panels, mounts `<FluidToyApp />`.
- **[FluidToyApp.tsx](FluidToyApp.tsx)** — app shell. Composes the
  engine-boot hook, sync hooks, and JSX. No imperative engine code lives
  here — it's all in dedicated hooks.
- **[useFluidEngine.ts](useFluidEngine.ts)** — boots `FluidEngine` on the
  canvas + runs the RAF loop + brush particle tick.
- **[useEngineSync.ts](useEngineSync.ts)** — pushes every DDFS slice
  (julia, deepZoom, palette, collision, fluidSim, postFx, composite) into
  the engine via per-feature `sync<X>ToEngine` functions.
- **[useDeepZoomOrbit.ts](useDeepZoomOrbit.ts)** — orbit/LA/AT rebuild
  loop + GPU-time poll for the diagnostics overlay.

## State & registry

- **[storeTypes.ts](storeTypes.ts)** — `JuliaSlice`, `BrushSlice`, etc.
  auto-derived from each feature's params.
- **[registerFeatures.ts](registerFeatures.ts)** — wires all feature
  definitions into the engine's feature registry.
- **[features/](features/)** — one file per DDFS feature. Each exports a
  `<X>Feature: FeatureDefinition` and a `sync<X>ToEngine(engine, slice)`
  function.
- **[panels.ts](panels.ts)** — dock-panel layout. Left dock: View
  (saved-views widget), Fractal (hidden), Deep Zoom, Palette,
  Modulation (lfo-list widget), Presets. Right dock: Coupling, Fluid,
  Collision, Brush, Post-FX, Composite. Multi-section tabs use
  `items: [{ type: 'section', label }, { type: 'feature', whitelistParams }]`
  to slice features into user-facing groups; renders auto-generated
  via `AutoFeaturePanel`.
- **[migrations.ts](migrations.ts)** — preset format migrations.
- **[constants.ts](constants.ts)** — pixel thresholds, zoom bounds,
  drag sensitivities.
- **[viewLibrary.ts](viewLibrary.ts)** — saved-view (HOME/named) list.
- **[hotkeys.ts](hotkeys.ts)** — keyboard shortcut registrations.
- **[engineHandles.ts](engineHandles.ts)** — refs the RAF tick reads each
  frame: cursor pos/vel, brush runtime state.

## Render core (`fluid/`)

- **[fluid/FluidEngine.ts](fluid/FluidEngine.ts)** — WebGL2 render
  orchestrator: shader compile, FBO lifecycle, sim step, render passes,
  MRT TSAA. Owns the per-concern controllers below.
- **[fluid/DeepZoomController.ts](fluid/DeepZoomController.ts)** —
  reference-orbit + LA + AT GPU state. App drives via
  `engine.deepZoom.xxx`. `bindUniforms()` packs every deep-zoom uniform
  onto the Julia program once per frame.
- **[fluid/BloomChain.ts](fluid/BloomChain.ts)** — Jimenez 2-level
  dual-filter bloom. Owns the three bloom programs + scratch FBOs.
  `process(w, h, threshold, renderSource)` runs the chain, returns the
  glow texture.
- **[fluid/GpuTimerManager.ts](fluid/GpuTimerManager.ts)** —
  EXT_disjoint_timer_query_webgl2 wrapper. `begin()`/`end()` brackets
  the Julia draw, `poll()` drains completed queries into the EWMA.
- **[fluid/GradientLutManager.ts](fluid/GradientLutManager.ts)** — 1-D
  LUT textures (main colour ramp + collision B&W). `setBuffer(slot, buf)`
  on user gradient edits; `ensure(slot)` allocates a placeholder.
- **[fluid/shaders/](fluid/shaders/)** — shaders grouped by render
  stage:
  - `common.ts` — OKLab, gradient sampler, vertex
  - `julia.ts` — fractal kernel (with deep-zoom path)
  - `sim.ts` — fluid pipeline (motion, advect, pressure, vorticity, …)
  - `display.ts` — composite + bloom + TSAA blend + interior mask
  - `utility.ts` — clear / copy / reproject
  - `index.ts` — re-exports

## Pointer / gestures (`pointer/`)

- **[pointer/handlers.ts](pointer/handlers.ts)** — thin dispatcher.
  Attaches DOM listeners, routes events to the right gesture file based
  on button + modifier keys + current `mode`.
- **[pointer/gestures/](pointer/gestures/)** — one file per gesture:
  - `pan.ts` — right-drag pan (DD-precision centre)
  - `zoom.ts` — middle-drag exponential zoom (DD-precision anchor)
  - `wheel.ts` — cursor-anchored wheel zoom (factory; owns commit timer)
  - `splat.ts` — left-drag brush emit
  - `pickC.ts` — C+drag drag-Julia-c
  - `resizeBrush.ts` — B+drag log-scaled brush resize
  - `zoomBounds.ts` — `effectiveMinZoom()` shared by zoom + wheel
  - `types.ts` — `GestureCtx` (refs + callbacks bag)
- **[pointer/types.ts](pointer/types.ts)** — `PointerState`,
  `PendingView`. Mode + per-gesture scratch (DD anchors, etc.).
- **[pointer/modifiers.ts](pointer/modifiers.ts)** — global modifier-key
  state (mods.b, mods.c, …) + `precisionMultiplier(shift, alt)`.
- **[pointer/contextMenu.ts](pointer/contextMenu.ts)** — right-click menu
  builder.

## Deep zoom (`deepZoom/`)

Reference-orbit perturbation pipeline. Worker-side does the heavy
BigInt math; main thread drives uploads via `engine.deepZoom.xxx`.

- **[deepZoom/HighPrecComplex.ts](deepZoom/HighPrecComplex.ts)** —
  fixed-point BigInt complex arithmetic; `HPReal.fromNumber` extracts
  IEEE-754 (mantissa, exp) directly so DD lo words survive.
- **[deepZoom/dd.ts](deepZoom/dd.ts)** — Dekker double-double primitives
  (`twoSum`, `ddAddF64`, `ddSub`).
- **[deepZoom/HDRFloat.ts](deepZoom/HDRFloat.ts)** — `(mantissa, exp)`
  pair for shader uniforms past 1e-38.
- **[deepZoom/referenceOrbit.ts](deepZoom/referenceOrbit.ts)** — orbit
  builder (Mandelbrot + Julia, power 2..8).
- **[deepZoom/laBuilder.ts](deepZoom/laBuilder.ts)** — LA merge tree.
- **[deepZoom/LAInfoDeep.ts](deepZoom/LAInfoDeep.ts)** — LA node algebra.
- **[deepZoom/laParameters.ts](deepZoom/laParameters.ts)** — LA tuning.
- **[deepZoom/atBuilder.ts](deepZoom/atBuilder.ts)** — AT (Approximation
  Terms) front-load.
- **[deepZoom/deepZoomWorker.ts](deepZoom/deepZoomWorker.ts)** — worker
  entry; serialises orbit + LA + AT for transferable upload.
- **[deepZoom/laRuntime.ts](deepZoom/laRuntime.ts)** — main-thread
  worker proxy + singleton.
- **[deepZoom/diagnostics.ts](deepZoom/diagnostics.ts)** — Zustand
  diag store consumed by `DeepZoomStatus`.
- **[deepZoom/benchmark.ts](deepZoom/benchmark.ts)** — A/B perf bench
  for the diagnostics panel.

## UI components (`components/`)

- `DomOverlays.tsx`, `JuliaCPicker.tsx`, `MandelbrotPicker.tsx`,
  `ViewLibraryPanel.tsx`, `PresetGrid.tsx`, `HotkeysCheatsheet.tsx`,
  `QualityBadge.tsx`, `DeepZoomStatus.tsx`, `DeepZoomBench.tsx`.

## Brush (`brush/`)

- `index.ts` — `beginStroke`, `emitPressSplat`, `emitStrokeSplat`.
- `emitter.ts` — splat emission + arc-length spacing.
- `particles.ts` — RAF-tick particle simulation.
- `color.ts` — colour synthesis from current brush params.
- `readParams.ts` — read brush slice into a frame-local snapshot.

## Presets (`presets/`)

- `data.ts` — built-in preset list.
- `apply.ts` — apply a preset blob to all feature slices.
