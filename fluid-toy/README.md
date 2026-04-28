# fluid-toy

Browser fluid sim driven by a Julia/Mandelbrot field. Engine-native app — every
generic concern (DDFS, viewport, save/load, animation, undo, shortcuts, topbar,
camera/views) lives in [engine/](../engine/) or its core plugins; this folder
holds only fluid-toy's domain (FluidEngine, brush, gestures, presets).

**Live at:** [http://localhost:3400/fluid-toy.html](http://localhost:3400/fluid-toy.html) (`npm run dev`).
**Reference (frozen):** [stable/toy-fluid/](../../stable/toy-fluid/) is the original
useState/RAF prototype, kept for sanity-checking visual parity. Don't port new
work back to it.

For a complete, line-by-line index of every file see [CODE_MAP.md](CODE_MAP.md).

---

## Where to find things

```
fluid-toy/
├── main.tsx                    boot — installs every core plugin, registers
│                               features, mounts <FluidToyApp>. Read this
│                               first to understand the wiring order.
├── registerFeatures.ts         featureRegistry side-effect calls. MUST run
│                               before main.tsx touches the store. Comment
│                               at the top explains why.
├── setup.ts                    one-call panel-manifest install (post-boot).
├── storeTypes.ts               TYPE-ONLY. Declares fluid-toy slices into
│                               AppFeatureSlices + FeatureStateMap. Read
│                               docs/engine/16_Type_Augmentation.md before
│                               touching this.
├── migrations.ts               registerMigration v1 (preset shape changes).
├── constants.ts                gesture sensitivity / drag thresholds.
├── panels.ts                   PanelManifest (which panels appear in which
│                               dock).
│
├── FluidToyApp.tsx             ~210 line shell. Wires store callbacks, mounts
│                               viewport, calls useEngineSync + useDeepZoomOrbit.
├── FluidPointerLayer.tsx       46 lines. Mounts the pointer/ hooks.
├── useFluidEngine.ts           Boots FluidEngine, owns the RAF loop, ticks
│                               the brush runtime.
├── useEngineSync.ts            One hook that pushes every DDFS slice into
│                               the engine via per-feature sync<X>ToEngine.
│                               Adding a feature = one line here.
├── useDeepZoomOrbit.ts         Worker-built reference orbit + LA + AT
│                               rebuild loop. Only fires when deepZoom.enabled.
│
├── features/                   one file per DDFS feature. Each exports a
│                               FeatureDefinition AND a sync<X>ToEngine
│                               function.
│   ├── julia.ts                Fractal kind / Julia c / iter / power / view
│   ├── deepZoom.ts             BigInt orbit + LA + AT toggles
│   ├── coupling.ts             Force-law + auto-orbit
│   ├── palette.ts              Gradient + colour mapping + dye-blend
│   ├── collision.ts            Wall masks
│   ├── fluidSim.ts             Vorticity / dissipation / sim grid / dye decay
│   ├── postFx.ts               Tone map / bloom / aberration / refraction
│   ├── composite.ts            Show mode + julia/dye/velocity mix
│   ├── brush.ts                Mode / size / colour / particle emitter
│   └── presets.ts              Preset chip grid (UI only — applier is presets/apply.ts)
│
├── pointer/                    canvas pointer + wheel dispatcher.
│   ├── types.ts                PointerMode + PointerState shape
│   ├── modifiers.ts            useModifierKeys (B / C sticky modifiers)
│   ├── contextMenu.ts          right-click menu
│   ├── handlers.ts             dispatcher — routes events to the right
│   │                           gesture file based on button / modifiers / mode
│   └── gestures/               one file per gesture
│       ├── types.ts            GestureCtx (refs + callbacks bag)
│       ├── zoomBounds.ts       effectiveMinZoom() shared by zoom + wheel
│       ├── pan.ts              right-drag pan (DD-precision centre)
│       ├── zoom.ts             middle-drag exponential zoom
│       ├── wheel.ts            cursor-anchored wheel zoom (factory; commit timer)
│       ├── splat.ts            left-drag brush emit
│       ├── pickC.ts            C+drag drag-Julia-c
│       └── resizeBrush.ts      B+drag log-scaled brush resize
│
├── brush/                      brush + particle emitter (rendering only)
│   ├── color.ts                rainbow / solid / gradient / velocity colour
│   ├── particles.ts            spawn / step
│   ├── emitter.ts              per-frame + per-stroke runtime
│   ├── readParams.ts           BrushSlice → BrushParams snapshot
│   │                           ⚠️  NOT re-exported from index.ts (see below)
│   └── index.ts                barrel — read the comment at the bottom
│
├── presets/
│   ├── data.ts                 the curated reference presets
│   └── apply.ts                ref-preset → DDFS slice setters
│
├── components/                 fluid-toy-only React components
│   ├── DomOverlays.tsx         feature viewport overlays (DOM type)
│   ├── HotkeysCheatsheet.tsx   bottom-left hint pill
│   ├── JuliaCPicker.tsx        c-picker mounted under juliaC slider
│   ├── MandelbrotPicker.tsx    full picker canvas
│   ├── PresetGrid.tsx          preset chip row
│   ├── QualityBadge.tsx        adaptive q% pill
│   ├── ViewLibraryPanel.tsx    saved-views panel (engine StateLibrary)
│   ├── DeepZoomStatus.tsx      diag overlay (orbit length / LA stats / GPU ms)
│   └── DeepZoomBench.tsx       A/B benchmark for deep-zoom perf knobs
│
├── viewLibrary.ts              installStateLibrary call + JuliaViewState +
│                               type augmentation (see Type Augmentation doc)
├── hotkeys.ts                  Space / R / O / Home registrations
├── engineHandles.ts            cross-tree handles (engine ref, brush runtime,
│                               cursor state) — typed, not globals
│
├── deepZoom/                   reference-orbit perturbation pipeline (worker-
│                               built BigInt orbit + LA merge tree + AT)
│   ├── HighPrecComplex.ts      fixed-point BigInt complex arithmetic
│   ├── HDRFloat.ts             (mantissa, exp) packing for shader uniforms
│   ├── dd.ts                   Dekker double-double primitives (sub-f64 pan)
│   ├── referenceOrbit.ts       orbit builder (Mandelbrot + Julia, power 2..8)
│   ├── laBuilder.ts            LA merge tree
│   ├── LAInfoDeep.ts           LA node algebra
│   ├── laParameters.ts         LA tuning
│   ├── atBuilder.ts            AT (Approximation Terms) front-load
│   ├── deepZoomWorker.ts       worker entry; transferable orbit + LA + AT
│   ├── laRuntime.ts            main-thread proxy + singleton
│   ├── diagnostics.ts          Zustand diag store consumed by DeepZoomStatus
│   └── benchmark.ts            A/B perf bench for DeepZoomBench
│
└── fluid/
    ├── FluidEngine.ts          ~1.8k lines. WebGL pipeline orchestrator.
    │                           Owns the per-concern controllers below.
    ├── DeepZoomController.ts   refOrbit + LA + AT GPU state. App drives via
    │                           engine.deepZoom.xxx. bindUniforms() per frame.
    ├── BloomChain.ts           Jimenez 2-level dual-filter bloom. Owns its
    │                           three programs + scratch FBOs.
    ├── GpuTimerManager.ts      EXT_disjoint_timer_query wrapper. begin / end
    │                           around the Julia draw, poll() drains EWMA.
    ├── GradientLutManager.ts   1-D LUT slots (main colour + collision B&W).
    └── shaders/                shader programs grouped by render stage
        ├── common.ts           OKLab, gradient sampler, vertex
        ├── julia.ts            fractal kernel (with deep-zoom path)
        ├── sim.ts              fluid pipeline (motion, advect, pressure, ...)
        ├── display.ts          composite + bloom + TSAA blend + interior mask
        ├── utility.ts          clear / copy / reproject
        └── index.ts            re-exports
```

---

## How to add a feature

5-step recipe — one file, three small touches elsewhere:

1. **`features/<name>.ts`** — export a `FeatureDefinition` and a
   `sync<Name>ToEngine(engine, slice, …)` function. Pattern: copy the
   smallest existing feature ([composite.ts](features/composite.ts) at 78 lines).

2. **`registerFeatures.ts`** — `featureRegistry.register(YourFeature)`.

3. **`storeTypes.ts`** — add `<name>: <Name>Slice` to BOTH the
   `AppFeatureSlices` and `FeatureStateMap` augmentations. (See
   [docs/engine/16_Type_Augmentation.md](../docs/engine/16_Type_Augmentation.md)
   for why both.)

4. **`useEngineSync.ts`** — one `useSlice('<name>')` call + one
   `useEffect(() => { ... sync<Name>ToEngine(e, slice); ... }, [slice, ...])`
   line. Pattern matches every other slice in the file.

5. **`panels.ts`** — add an entry if the feature gets its own panel tab.
   (Many tabs aggregate multiple slices — see Palette / Fluid for examples.)

That's it. The feature is now: animatable (every DDFS param), undoable
(history snapshots iterate the registry), savable (preset round-trips
include feature state), and visible in AutoFeaturePanel.

---

## Things that look weird but are deliberate

### `brush/index.ts` does not re-export `readBrushParams`

Several feature files reach the brush barrel via `engineHandles` for
`brushHandles`. DDFS feature registration runs **before** the store is
constructed (the registry freezes on first store touch). Anything pulling
`useEngineStore` into the import chain at registration time blocks
`registerFeatures.ts` from completing.

`readBrushParams` imports `useEngineStore`. Importing it via the barrel
would chain: `palette.ts → engineHandles → brush (barrel) → readParams →
useEngineStore`, freezing the registry mid-feature-registration.

Consumers (`useFluidEngine.ts`, `pointer/handlers.ts`) import directly from
`./brush/readParams`. The constraint is documented inline in
[brush/index.ts](brush/index.ts).

### Pan / middle-drag / wheel bypass the store during the gesture

The gesture files in [pointer/gestures/](pointer/gestures/) write
`engine.setParams({ center, zoom })` directly during the gesture and stash
the pending value in `pendingViewRef`; the store gets one `setJulia` commit
on pointerup (drag, in [handlers.ts](pointer/handlers.ts)'s `onUp`) or
after a 100ms idle timer (wheel, in [wheel.ts](pointer/gestures/wheel.ts)).

`setJulia` per pointermove triggers Zustand's full subscriber notification.
With dozens of `useEngineStore` consumers in the panel tree, that's enough
cascading re-renders to trip React 18's max-depth guard. The bypass
matches engine-gmt's cursor-anchor navigation pattern.

### `useLiveModulations()` returns a frozen `EMPTY_MODS` when no mods exist

`useEngineStore((s) => s.liveModulations ?? {})` would create a fresh
object every selector eval, defeating Zustand's reference-equality
re-render gate. The hook in [engine/typedSlices.ts](../engine/typedSlices.ts)
hides the sentinel.

### `sync<X>ToEngine` lives in the feature file, not the app

Adding a feature should be one file. The sync function is part of that
contract — it's the authoritative mapping of the DDFS slice into the
engine's setParams. Keeps FluidToyApp thin (~200 lines) and means the
push logic is co-located with the param defaults that drive it.

### Store-key augmentation lives next to the install call

`viewLibrary.ts` declare-merges `savedViews` / `addView` / etc. into
`EngineStoreState` and `EngineActions` at the same site that calls
`installStateLibrary`. The keys are configurable strings — only the
consumer knows what names it picked. See [docs/engine/16_Type_Augmentation.md](../docs/engine/16_Type_Augmentation.md).

---

## Running and testing

```bash
npm run dev                          # vite at :3400
npm run smoke:fluid-toy              # headless DDFS + preset round-trip
npm run smoke:orbit                  # auto-orbit visual check
npm run smoke:pause-controls         # topbar pause flow
npm run smoke:fluid-brush            # brush splat + particle emitter (FLAKY — Chromium GPU watchdog)
npm run smoke:fluid-presets          # preset apply (FLAKY — UI selector timing)
```

Smokes that need a running browser fail-loudly hit `localhost:3400` directly.
If you're not running `npm run dev` in another terminal, use the wrapper:

```bash
npm run smoke:with-server -- npm run smoke:fluid-brush
```

It boots vite on a free port, sets `ENGINE_URL`, runs the smoke, kills vite.

---

## Where to look when something breaks

| Symptom | Look here |
|---|---|
| "X slice missing" / blank panel | [registerFeatures.ts](registerFeatures.ts) — likely freeze-before-register; check imports for transitive `useEngineStore` |
| Type error on `setX` / `state.x` | [storeTypes.ts](storeTypes.ts) — slice missing from one of the two augmentation targets |
| Brush colour wrong / no splats | [brush/](brush/) + [pointer/gestures/splat.ts](pointer/gestures/splat.ts) |
| Pan / zoom snaps back / jitters | [pointer/handlers.ts](pointer/handlers.ts) dispatcher + the relevant gesture file ([pan.ts](pointer/gestures/pan.ts) / [zoom.ts](pointer/gestures/zoom.ts) / [wheel.ts](pointer/gestures/wheel.ts)) — pendingViewRef commit at onUp / wheel idle timer |
| Deep-zoom quantizing past 1e-15 | [pointer/gestures/](pointer/gestures/) DD pan accumulator + [deepZoom/HighPrecComplex.ts](deepZoom/HighPrecComplex.ts) `fromNumber` extracts IEEE-754 mantissa/exp |
| Modulation not driving a target | Check `state.animations` has the LFO entry; `state.liveModulations[target]` should update each frame; sync function for that feature must read liveMod via `applyLiveMod` (see useEngineSync.ts) |
| Preset load drops a field | Field is on a slice not in [presets/apply.ts](presets/apply.ts), or shape changed without a [migrations.ts](migrations.ts) entry |
| Adaptive quality stuck low | engine — see [docs/engine/10_Viewport.md](../docs/engine/10_Viewport.md) and [docs/engine/11_TSAA.md](../docs/engine/11_TSAA.md) |
| Saved-views panel placeholder | [viewLibrary.ts](viewLibrary.ts) install ordering — must run AFTER installMenu/installShortcuts and BEFORE setupFluidToy |

---

## Cross-refs

- [docs/engine/01_Architecture.md](../docs/engine/01_Architecture.md) — three-tier model
- [docs/engine/02_Feature_Registry.md](../docs/engine/02_Feature_Registry.md) — `defineFeature` shape
- [docs/engine/03_Plugin_Contract.md](../docs/engine/03_Plugin_Contract.md) — boot order & freeze semantics
- [docs/engine/14_Panel_Manifest.md](../docs/engine/14_Panel_Manifest.md) — how panels.ts works
- [docs/engine/16_Type_Augmentation.md](../docs/engine/16_Type_Augmentation.md) — store-typing pattern
- [docs/engine/12_App_Handles.md](../docs/engine/12_App_Handles.md) — engineHandles.ts pattern
