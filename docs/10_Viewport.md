# 10 — Viewport 🚧

The core plugin that owns viewport **dimensions**, **interaction state**, and **adaptive quality**. Shared between every WebGL-backed app (GMT, toy-fluid, future prototypes).

**Rule:** viewport size, DPR, fixed/full mode, resize signals, interaction flags, and FPS-driven quality scaling are engine concerns. How the app's canvas and render engine respond to those signals is the app's concern.

## Why a plugin, not engine core

Both GMT and toy-fluid re-invented most of this:
- GMT: `ViewportArea.tsx` + `FixedResolutionControls.tsx` + `rendererSlice.ts` (canvasPixelSize, dpr, resolutionMode, fixedResolution) + `PerformanceMonitor.tsx` (FPS probe + suggestions) + `features/quality.ts` (dynamicScaling + adaptiveTarget + interactionDownsample) + `engine/FractalEngine.ts` (holdForAdaptive grace logic).
- toy-fluid: bespoke RAF loop with `effectiveSimRes`, low/high FPS streaks, change cooldowns, exponential FPS smoothing, its own ResizeObserver on the canvas, `simResolution` as its quality signal.

The viewport concerns overlap 80% — size modes, DPR, interaction-based downsample, adaptive quality target, grace period. The 20% that differs is what each engine does with the "reduce quality" signal (GMT lowers DPR + MSAA; toy-fluid lowers sim grid resolution). That 20% stays app-level; the 80% is the plugin.

## Scope

### The plugin owns
- **Size management**: mode (`'Full' | 'Fixed' | 'Custom'`), fixed-resolution, DPR, canvas physical-pixel size, post-sidebar flex measurement.
- **Interaction state**: `isInteracting`, `interactionMode` (`'none' | 'camera' | 'drawing' | 'paint' | 'selecting_*' | string`), mouse-over-canvas.
- **FPS tracking**: smoothed + instantaneous, with exclusions (paused, scrubbing, tab-hidden, compiling, exporting).
- **Adaptive quality loop**: emits a `qualityFraction: number` in `[0, 1]` (1 = full quality, 0 = minimum) based on FPS target + change cooldown + grace period.
- **Authoritative measurement**: one ResizeObserver on the post-sidebar `flex-1` div. No competing observers elsewhere.
- **UI**: `<FixedResolutionControls>`, `<PerformanceWarning>` (suggestions), `<AdaptiveResolutionBadge>` (topbar).

### The plugin does NOT own
- The actual `<canvas>` element — apps render their own inside a slot.
- Render-engine-specific knobs (MSAA samples, shader quality modes, sample cap, accumulation count) — these belong to each app's render plugin.
- The meaning of "reduce quality" — plugin emits `qualityFraction`; app maps it to its render-engine's knobs (DPR, sim resolution, whatever).
- Export sizing (bucket render output, video frame dimensions) — app's export system.

## Public API

### Hook (React integration)

```ts
const {
  width, height, dpr,
  physicalSize,    // [w*dpr, h*dpr]
  logicalSize,     // [w, h]
  mode,            // 'Full' | 'Fixed' | 'Custom'
  isInteracting,
  interactionMode, // string tag, app-interpreted
  isMouseOverCanvas,
  qualityFraction, // [0, 1]
  fps, fpsSmoothed,
} = useViewport();
```

### Imperative API

```ts
viewport.setMode('Full' | 'Fixed' | 'Custom'): void;
viewport.setFixedResolution(w: number, h: number): void;   // snap-to-8 enforced
viewport.setInteracting(mode: string | false): void;        // false → 'none'
viewport.setAdaptive(opts: {
  enabled?: boolean;
  targetFps?: number;        // 0 = off, otherwise auto-adjust
  minQuality?: number;       // default 0.25
  graceMs?: number;          // default 1000 — no down-scale during this after an accum-relevant event
  changeCooldownMs?: number; // default 500
}): void;
```

### Subscriptions

```ts
viewport.onResize((logicalSize, physicalSize, dpr) => { /* app canvas resizes here */ });
viewport.onQualityChange((fraction) => { /* app maps to its knobs */ });
viewport.onModeChange((mode) => { /* app responds to Fixed/Full switch */ });
```

### Reporting (app → plugin)

```ts
viewport.reportFps(fps: number);             // app's RAF loop or R3F useFrame
viewport.holdAdaptive(durationMs?: number);  // "don't downscale for N ms" — e.g. accumulation just started
viewport.suppressAdaptive(true | false);     // hard disable (e.g. during export)
```

## State shape

Under `store.viewport`:

```ts
interface ViewportState {
  // Size
  mode: 'Full' | 'Fixed' | 'Custom';
  fixedResolution: [number, number];        // logical pixels, snap-to-8
  dpr: number;                              // [1, maxDprForDevice]
  canvasPixelSize: [number, number];        // PHYSICAL pixels of the flex-1 div, authoritative

  // Interaction
  interactionMode: string;                  // 'none' | app-defined tags
  isMouseOverCanvas: boolean;

  // Adaptive
  adaptive: {
    enabled: boolean;
    targetFps: number;                      // 0 = off (use interactionDownsample only)
    interactionDownsample: number;          // [1, 4] fallback when targetFps=0
    minQuality: number;                     // [0, 1], default 0.25
    graceMs: number;
    changeCooldownMs: number;
  };
  qualityFraction: number;                  // current, [0, 1]
  adaptiveSuppressed: boolean;              // app hard-override during export etc.

  // Perf probe
  fps: number;                              // instantaneous, last sample window
  fpsSmoothed: number;                      // exponential decay
}
```

Setters wrapped with undo via `@engine/undo` (scope: `'viewport'`) — changing Fixed resolution is undoable; transient FPS/qualityFraction writes are not (they're `undoable: false` per-param in the slice's internal convention).

## UI components (provided)

| Component | Where rendered | What it does |
|---|---|---|
| `<FixedResolutionControls>` | Viewport top-left when `mode === 'Fixed'` | Drag-to-resize + aspect-ratio preset menu + "Fill" button |
| `<PerformanceWarning>` | Viewport top-right when FPS sustained low | Dismissible warning + fix suggestions |
| `<AdaptiveResolutionBadge>` | TopBar right slot | Off / Locked / Auto / Always states; click toggles |
| `<ViewportArea canvasSlot={…} />` | App root (replaces current ViewportArea) | Flex host, ResizeObserver, DOM overlay layer, accepts app's canvas via `canvasSlot` prop |

Suggestions exposed by `<PerformanceWarning>` come from a **registerable suggestion registry**:

```ts
viewport.registerSuggestion({
  id: 'reduce-resolution',
  predicate: (state) => state.canvasPixelSize[0] > 480,
  label: 'Reduce Resolution',
  badge: '-33%',
  apply: () => { /* app-provided action */ },
});
```

GMT registers its own (reset AA scale, enable Lite mode, etc.); toy-fluid registers "lower simResolution" etc. Plugin ships with the generic `reduce-resolution` and `enable-adaptive` defaults.

## Audit table — current → plugin

| Current GMT/engine symbol | Where today | Classification | Plugin destination |
|---|---|---|---|
| `canvasPixelSize` | `rendererSlice.ts:61` | GENERIC | `viewport.canvasPixelSize` |
| `setCanvasPixelSize` | `rendererSlice.ts:131` | GENERIC | internal; apps read only |
| `dpr` | `rendererSlice.ts:32` | GENERIC | `viewport.dpr` |
| `setDpr` | `rendererSlice.ts:63` | GENERIC | `viewport.setDpr` (but wrapped: DPR is adaptive's internal knob for GMT) |
| `resolutionMode` | `uiSlice.ts:102` | GENERIC | `viewport.mode` |
| `fixedResolution` | `uiSlice.ts:103` | GENERIC | `viewport.fixedResolution` |
| `setResolutionMode` / `setFixedResolution` | `uiSlice.ts:199-200` | GENERIC | `viewport.setMode` / `setFixedResolution` |
| `getCanvasPhysicalPixelSize()` | `fractalStore.ts:211` | GENERIC | `viewport.physicalSize` derived |
| `isUserInteracting` | fractalStore | GENERIC | `viewport.isInteracting` |
| `interactionMode` | fractalStore | GENERIC (open string) | `viewport.interactionMode` |
| `adaptiveSuppressed` | `rendererSlice.ts:47` | GENERIC | `viewport.adaptiveSuppressed` |
| `setMouseOverCanvas` / `isMouseOverCanvas` | `engine/worker/ViewportRefs.ts` | GENERIC (misplaced in worker folder) | `viewport.isMouseOverCanvas` |
| `FixedResolutionControls.tsx` | `components/viewport/` | GENERIC | plugin component, unchanged |
| `PerformanceMonitor.tsx` frame-timestamp probe | `components/PerformanceMonitor.tsx:29-104` | SEMI-GENERIC | split: FPS measurement → plugin; suggestions → registry |
| `PerformanceMonitor.tsx` UI + suggestions | `components/PerformanceMonitor.tsx:106-300` | SEMI-GENERIC | `<PerformanceWarning>` + suggestion registry |
| `AdaptiveResolution.tsx` topbar badge | `components/topbar/` | GENERIC | `<AdaptiveResolutionBadge>` |
| `features/quality.ts` `dynamicScaling` | feature param | **semi — policy is generic, some knobs fractal** | `viewport.adaptive.enabled` |
| `features/quality.ts` `adaptiveTarget` | feature param | GENERIC | `viewport.adaptive.targetFps` |
| `features/quality.ts` `interactionDownsample` | feature param | GENERIC | `viewport.adaptive.interactionDownsample` |
| `FractalEngine.ts` `holdForAdaptive` grace | `engine/FractalEngine.ts:709-713` | SEMI-GENERIC | `viewport.holdAdaptive()` API; policy generic |
| `accumulationCount >= 8 → locked` | FractalEngine + AdaptiveResolution.tsx | **fractal-specific** | Apps call `viewport.holdAdaptive(…)` based on their own state |
| `aaLevel`, `aaMode`, `msaaSamples` | `rendererSlice.ts:33-34,64-83` | **fractal-specific** | stay in GMT plugin |
| `accumulation`, `previewMode`, `renderMode`, `sampleCap` | `rendererSlice.ts:37-44` | **fractal-specific** | stay in GMT plugin |
| `isExporting`, `isBucketRendering` | `rendererSlice.ts:46,52` | **fractal-specific** (for now) | stay in GMT; plugin reads via `suppressAdaptive` |
| `renderRegion`, `previewRegion` | `rendererSlice.ts:48-49` | SEMI-GENERIC (any app might want crop) | defer to future; stay app-level for now |
| `convergenceThreshold` | `rendererSlice.ts:59` | **fractal-specific** (path-trace) | stay in GMT plugin |
| toy-fluid `effectiveSimRes` | `ToyFluidApp.tsx:195-243` | app-specific QUALITY knob | app subscribes to `onQualityChange`, maps to simResolution |
| toy-fluid smoothed FPS + streaks | `ToyFluidApp.tsx` | GENERIC (policy) | plugin's adaptive loop |
| toy-fluid ResizeObserver on canvas | `ToyFluidApp.tsx:300-306` | REDUNDANT | replaced by `viewport.onResize` |

## Integration patterns

### Toy-fluid's consumption

```tsx
// Viewport overlay feature:
const FluidCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FluidEngine | null>(null);
  const { physicalSize, onResize, onQualityChange } = useViewport();

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    engineRef.current = new FluidEngine(cv);
    engineRef.current.resize(physicalSize[0], physicalSize[1]);

    const offResize  = viewport.onResize(([_, __], [pw, ph]) => engineRef.current?.resize(pw, ph));
    const offQuality = viewport.onQualityChange((f) => {
      const targetSimRes = 512 * Math.max(0.25, f);
      engineRef.current?.setParams({ simResolution: targetSimRes });
    });

    return () => { offResize(); offQuality(); engineRef.current?.dispose(); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};
```

### Fractal-toy's consumption

```tsx
const FractalCanvas: React.FC = () => {
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const { dpr, physicalSize } = useViewport();

  useEffect(() => {
    const fractalEngine = new FractalEngine(threeCanvasRef.current!);
    fractalEngine.setSize(physicalSize[0], physicalSize[1]);

    const offResize = viewport.onResize((_l, p, dpr) => fractalEngine.setSize(p[0], p[1], dpr));
    const offQuality = viewport.onQualityChange((f) => {
      // GMT maps fraction → internal render scale.
      fractalEngine.setInternalScale(f);
      // On accumulation start, hold adaptive to avoid thrashing:
      if (fractalEngine.accumulationJustStarted) viewport.holdAdaptive(1500);
    });

    return () => { offResize(); offQuality(); fractalEngine.dispose(); };
  }, []);

  return <canvas ref={threeCanvasRef} className="absolute inset-0" />;
};
```

### `<ViewportArea>` gets a slot

Today's engine-side ViewportArea has a hardcoded `<Canvas>` (R3F) inside its `canvasContainerRef`. Plugin version accepts a slot:

```tsx
<ViewportArea
  canvasSlot={<FluidCanvas />}
  // or <FractalCanvas /> for the fractal-toy
/>
```

The R3F `<Canvas>` that currently lives in engine/ViewportArea.tsx becomes optional — probably a plugin of its own (`@engine/r3f-overlay`) when the GMT port lands, since it's R3F-specific.

## Lifecycle

1. **Boot**: `installViewport({ initialMode, initialFixedResolution, adaptive })` registers the slice, seeds defaults, registers `<FixedResolutionControls>` + `<PerformanceWarning>` components, registers TopBar slot items (if `@engine/topbar` installed).
2. **Mount**: `<ViewportArea>` renders; its ResizeObserver fires → `canvasPixelSize` updates → subscribers (`onResize` + `useViewport` consumers) run.
3. **App canvas mount**: app's canvas in `canvasSlot` reads initial size via `useViewport()`, subscribes to `onResize`/`onQualityChange`, creates its render engine.
4. **Steady state**: each frame the app's tick calls `viewport.reportFps(fps)`. Plugin's adaptive loop checks streaks, maybe emits `onQualityChange`. App maps to its knobs.
5. **User interacts**: `viewport.setInteracting('camera')` → `isInteracting` flips → `qualityFraction` drops to `interactionDownsample` level → app subscribes notice → render drops quality.
6. **Interaction ends**: after grace (`graceMs`), quality climbs back. Apps that need to hold (e.g. accumulation just started) call `viewport.holdAdaptive(1500)`.
7. **Export**: app calls `viewport.suppressAdaptive(true)` before export; `false` after.

## Open questions

1. **R3F `<Canvas>` — plugin or not?** Engine's ViewportArea currently hardcodes it for DOM+Scene overlays. With `canvasSlot` the app-owned render canvas is separate, but the overlay `<Canvas>` is still engine-provided. Options:
   - (a) Keep engine's `<Canvas>` for the overlay layer, apps can ignore/remove it if they only need DOM overlays (toy-fluid doesn't need Three.js).
   - (b) Move R3F to its own `@engine/r3f-overlay` plugin — opt-in per app.
   - **Lean: (b) when the GMT port lands; (a) for now** since the engine already has it and toy-fluid tolerates an unused transparent Canvas layer.

2. **`renderRegion` / `previewRegion` — plugin or app?** These are GMT features (crop selection for export/preview) but conceptually any 2D/3D app might want them. Deferring — they stay in the renderer slice / GMT plugin until a second app wants them.

3. **Pre-existing `renderRegion` lives in uiSlice/rendererSlice, not a feature** — moving to plugin means breaking undo if not careful. Plan: leave where it is; wrap into an optional viewport extension later.

4. **Snap-to-8 everywhere?** GMT snaps fixed resolution to 8 for GPU alignment. Toy-fluid may or may not need this. Default: plugin snaps; apps can opt out per-call with `viewport.setFixedResolution(w, h, { snap: false })`.

5. **Mobile DPR default of 1.0** (see `rendererSlice.ts:32`) — plugin should encode this or let apps decide?
   **Decided 2026-04-22**: viewport plugin does NOT bake in a mobile-detection heuristic. A future `@engine/environment` (or similarly named) plugin exposes environmental signals (`isMobile`, `isFirefox`, `maxGPUTextureSize`, `hardwareConcurrency`, touch-vs-mouse, etc.); viewport consults it via bridge. Until that plugin exists, apps pass `installViewport({ initialDpr })` explicitly.

## Decisions

### 2026-04-22 — Plugin owns dimensions + interaction + adaptive; app owns canvas + quality mapping
**Decision:** the plugin emits signals (size, FPS-tested qualityFraction); apps map signals to their render engines' actual knobs.
**Alternative:** plugin owns more (render-engine knobs). Rejected — couples to a specific render strategy; GMT's MSAA vs toy-fluid's simResolution cannot be unified.

### 2026-04-22 — `qualityFraction` is `[0, 1]`, not an enum
**Decision:** continuous scalar, not 'Preview' | 'Standard' | 'Full' tags.
**Rationale:** both apps want smooth ramps (toy-fluid visibly steps simResolution; GMT scales DPR continuously). Enum loses information; apps can threshold fractions to enum semantics if they want.

### 2026-04-22 — Registerable suggestion list for `<PerformanceWarning>`
**Decision:** plugin's perf warning UI consults a suggestion registry. Apps register domain-specific fixes.
**Alternative:** plugin ships hardcoded suggestions. Rejected — "Enable Lite Mode" is fractal-specific; "Lower simResolution" is fluid-specific.

### 2026-04-22 — One authoritative ResizeObserver (on flex-1 div)
**Decision:** plugin's `<ViewportArea>` observes the post-sidebar flex container, not the canvas itself. Apps read `canvasPixelSize` from the store.
**Rationale:** matches current GMT pattern documented in-code — multiple observers race; the flex-1 div is the real canvas area after dock toggles. Toy-fluid's bespoke observer on the canvas element is a victim of this (WorkerDisplay-style edge cases).

### 2026-04-22 — Canvas ownership: app slots its canvas into `<ViewportArea canvasSlot={…}>`
**Decision:** no hardcoded canvas element in the plugin. Slot prop.
**Alternative:** plugin creates the canvas, exposes ref. Rejected — apps have different canvas-creation needs (WebGL2 vs OffscreenCanvas vs transferBitmap).

### 2026-04-22 — Environmental signals (mobile detection, etc.) are NOT viewport-plugin-internal
**Decision:** a future `@engine/environment` plugin owns `isMobile`, `isFirefox`, GPU / memory queries, etc. Viewport consults it via bridge. Apps in the interim pass explicit `initialDpr` etc. to `installViewport`.
**Rationale:** mobile detection is a shared environmental concern (GMT had it in both `rendererSlice.ts` and `hardware.ts`). Baking into viewport couples two orthogonal concerns. Per the engine's clean-dev-experience principle: each plugin solves one thing; coordination is explicit via bridges.

## Known fragilities

See [20_Fragility_Audit.md](20_Fragility_Audit.md). No new fragilities from this design; open items relevant:
- Authoritative-ResizeObserver rule must be enforced or GMT's flex-1 vs canvas-observer race returns.
- Future `@engine/topbar` plugin must coordinate slot registration for `<AdaptiveResolutionBadge>` (right slot).

## Extraction sequence

1. **Audit ✓** — this doc.
2. **Move current fields** — `viewportSlice.ts` (resolutionMode, fixedResolution, canvasPixelSize, dpr, isMouseOverCanvas, interactionMode flags). Move `isMouseOverCanvas` out of `engine/worker/ViewportRefs.ts`. GMT-specific fields stay in `rendererSlice.ts`.
3. **Move FPS probe** — `PerformanceMonitor.tsx`'s `tick()` function becomes the plugin's adaptive loop. The UI splits into `<PerformanceWarning>` (plugin) + suggestion registrations (apps).
4. **Adaptive loop** — `viewport.setAdaptive(opts)`, `qualityFraction`, `onQualityChange`. Consolidates GMT's `features/quality.ts` adaptive logic + toy-fluid's adaptive code.
5. **Canvas slot** — add `canvasSlot` prop to `<ViewportArea>`; R3F `<Canvas>` becomes the default (or opt-out) overlay layer.
6. **Install API** — `installViewport()`; plugin packaged as `engine/plugins/Viewport.tsx` alongside `RenderLoop.tsx`.

Each step is a small commit, verifiable via smoke tests + a manual check of Fixed/Full mode toggling.

## Cross-refs

- Architecture tier: [01_Architecture.md § canvas-and-viewport](01_Architecture.md#canvas-and-viewport)
- Core plugins overview: [04_Core_Plugins.md](04_Core_Plugins.md)
- TopBar integration point: [04_Core_Plugins.md § @engine/topbar](04_Core_Plugins.md#engine-topbar)
- Render loop driver: `engine/plugins/RenderLoop.tsx` (ships today, F4 fix)
