# Scope: Live Deep-Zoom Mandelbrot as a Gradient-Explorer Coloring Mode

> **Status:** RESEARCH / DESIGN PROBE — planning only, no code written.
> **Date:** 2026-06-06
> **Goal:** (A) extract dev/fluid-toy's deep-zoom Mandelbrot + gradient-mapping into a reusable
> engine-core library; (B) add it as a "live fractal" coloring mode in the Gradient Explorer's
> fullscreen overlay so the user's current 256-step ramp colors a live Mandelbrot ("see your
> gradient in action"). Same extract-in-place / shared-lib promotion pattern used for the
> `gmtGradient` collapse.

---

## TL;DR

- **The gradient-mapping is already clean.** fluid-toy colors the fractal by sampling a **256×1
  RGBA8 LUT** (`uGradient`) at a `[0,1]` coordinate derived from smooth-iteration count. The GX
  ramp seam (`renderStopsToBuffer` → `Uint8Array[1024]`, RGBA8 256×1) is **byte-identical** to what
  the LUT manager wants. No palette seam needed — it's already a `setColormap(rgba256)` shape.
- **The fractal renderer is decoupled from the fluid sim** — but **tightly coupled to the
  monolithic `FluidEngine.ts`** (~1.8k lines) which owns the GL context, FBOs, shader compile, and
  RAF loop. Extraction = carve a minimal `DeepZoomMandelbrotRenderer` out of FluidEngine.
- **The big fork:** the *deep-zoom precision stack* (perturbation + LA + AT + BigInt reference
  orbit, built on a Web Worker — 12 files, ~24k tokens) is an **XL** lift. A **shallow float32
  Mandelbrot MVP** that still consumes the ramp is **S/M** and delivers 90% of the "see your
  gradient in action" value. **Recommend phasing: ship the MVP first, gate deep-zoom behind it.**
- **The integration surface is small and known** — 5 insertion points in
  `FullscreenGradientOverlay.tsx` + `rampGeometry.ts`. The overlay already has a PNG export path
  that works unchanged on a WebGL canvas.
- **One design tension to resolve up front:** the overlay paints from a **frozen config snapshot**
  taken at open time — it does **not** live-update as you edit stops. "See your gradient in action"
  implies live; decide whether to live-subscribe the fractal mode to the editor stops or keep the
  snapshot + re-open model (see §3.4).

---

## 1. WHAT fluid-toy's deep-zoom actually is

### 1.1 Precision technique — perturbation + LA + AT (worker-built)

Full Imagina/Mandelbulber-class stack, **not** just emulated extended precision:

| Layer | What | File |
|---|---|---|
| Reference orbit | One high-precision orbit at view center; BigInt fixed-point, written to an RGBA32F texture `[Z.re, Z.im, |Z|², 0]` per iter | `fluid-toy/deepZoom/referenceOrbit.ts:66-105` |
| BigInt arithmetic | `HPReal` = BigInt mantissa + int exponent; precision bits chosen from zoom/maxIter | `fluid-toy/deepZoom/HighPrecComplex.ts:28-96` |
| Double-double pan | Dekker two-sum `(hi, lo)` center so sub-f64 pan deltas survive | `fluid-toy/deepZoom/dd.ts`, `pointer/gestures/pan.ts:58-59` |
| Per-pixel deltas | Perturbation `dz' = 2·Z·dz + dz² + dc` in plain **f32**, with rebasing when `|z|<|dz|` | `fluid-toy/shaders/julia.ts:407-431, 543-575` |
| Linear Approximation (LA) | 2-pass merge tree; each node = K reference iters as `dz_out = ZCoeff·dz + CCoeff·dc`; ~100k nodes for 50k iters (~6 MB RGBA32F) | `fluid-toy/deepZoom/laBuilder.ts:75-250`, `LAInfoDeep.ts:60-82` |
| Approximation Terms (AT) | Front-loads early iters as a transformed `z²+c'` loop, zero texture reads; gated on screen `|dc|²` validity | `fluid-toy/deepZoom/atBuilder.ts:1-100` |
| Worker | Orbit + LA + AT built off-thread, transferred as buffers | `fluid-toy/deepZoom/deepZoomWorker.ts`, `laRuntime.ts` |

**To GPU:** orbit → `uRefOrbit` RGBA32F texture; LA table → `uLATable` (3 texels/node) RGBA32F;
AT → ~9 float uniforms (`fluid/DeepZoomController.ts:95-138`).

**Depth & fallback:** plain f32 ≈ 1e-7; perturbation + DD pan ≈ 1e-15…1e-30
(`features/deepZoom.ts:47-50`); LA+AT practical screen depth ~1e-300 (`constants.ts` `MIN_ZOOM_DEEP`).
Shallow path is the same shader: `bool deep = (uDeepZoomEnabled != 0) && (uRefOrbitLen > 1)`
(`shaders/julia.ts:403`) — when off, it's a vanilla f32 Mandelbrot/Julia in the same kernel.
**This matters: the shallow renderer is free — it's the same shader with the deep path disabled.**

### 1.2 Antialiasing / quality

- **TSAA** — blue-noise per-frame subpixel jitter (`shaders/julia.ts:100-138`), EWMA accumulator
  blend (`shaders/display.ts`, see README:258), with per-frame mean-pooling of K jittered samples
  before accumulation (`julia.ts:105-116`).
- **Adaptive** — `tsaaSampleCap` / `tsaaPerFrameSamples` uniforms; accumulation resets on any
  fractal-affecting change via a version hash (`DeepZoomController.ts:79-80`).
- **GPU timing** — optional `EXT_disjoint_timer_query_webgl2` (`GpuTimerManager.ts`).

### 1.3 Gradient mapping — **already ramp/DataTexture-based (clean reuse)**

This is the crucial finding. **Yes, it is already a 256-step LUT / DataTexture path. No palette
coupling, no seam needed.**

- LUT = **256×1 RGBA8** texture, `GRADIENT_LUT_WIDTH = 256` (`constants.ts:42`), uploaded as a
  1024-byte `Uint8Array`:
  ```ts
  // fluid/GradientLutManager.ts:32-53
  setBuffer(slot, buf /* Uint8Array, 256*4 */) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, buf); // LINEAR filtered
  }
  ```
- Shader maps fractal data → `[0,1]` then samples the LUT:
  ```glsl
  // fluid/shaders/common.ts:64-101
  float t0 = colorMappingT(j, aux);                 // mode 0 = smoothI*0.05, +12 other modes
  float t  = fract(t0 * uGradientRepeat + uGradientPhase);
  vec4 color = texture(uGradient, vec2(t, 0.5));     // the 256×1 ramp
  ```
- Engine API: `engine.setGradientBuffer(buf: Uint8Array)` → `gradientLutManager.setBuffer('main', buf)`.
  Repeat/phase/mapping-mode are plain scalar uniforms — **zero DDFS/store coupling**.

**Reuse verdict:** drop GX's `renderStopsToBuffer()` output straight into `setGradientBuffer()`.
The two formats already match (256×1, RGBA8, straight alpha, no premultiply). This is the cleanest
possible seam — effectively a ready-made `setColormap(rgba256)`.

### 1.4 Pan/zoom API surface

No public `setCenter`; gestures call `engine.setParams({ center:[x,y], centerLow:[lo,lo], zoom })`
directly during drag (bypassing the store), committing one store update on pointerup/idle
(`pointer/gestures/pan.ts:19-72`, `zoom.ts`, `wheel.ts`; README:189-200). Center is **double-double**.
Orbit/LA rebuild triggers on c-change, >2× zoom from build zoom, or pan past validity radius.

---

## 2. EXTRACT to engine-core

### 2.1 Coupling map (what blocks a standalone lib)

| Layer | Coupling | Effort |
|---|---|---|
| Precision (BigInt, DD, LA, AT) — `deepZoom/*` (12 files, ~24k tok) | **None.** Pure CPU/worker algorithms. | Copy as-is |
| Gradient LUT — `GradientLutManager.ts` | **None.** Texture-only, self-contained. | Copy as-is |
| GPU state — `DeepZoomController.ts` | Minimal; needs WebGL2 + texture units only | Light |
| Shader `julia.ts` (kernel) | Bound to FluidEngine uniform names; calls `colorMappingT` | Moderate (extract kernel + uniform adapter) |
| Shader `display.ts` (composite) | Carries motion-viz + bloom logic to strip | Moderate |
| `FluidEngine.ts` (~1.8k lines) | **Tight.** Owns GL ctx, FBOs, compile, RAF, *and* the fluid sim (motion/advect/pressure/dye/vorticity/bloom) | **Major carve** |
| App layer (`FluidToyApp`, `features/`, `pointer/`, `brush/`) | Full app | Not extracted — reimplement thin host |

**Key fact:** the fractal render does **not** depend on the fluid sim. The only link is the *motion*
shader reading the Julia texture to drive velocity — already gated off by `disableFluid`
(`features/deepZoom.ts:92-98`). So the carve is "lift the fractal+gradient+deepzoom passes out of
FluidEngine, leave the sim behind."

### 2.2 Proposed reusable boundary + API

A new core module (no React, no store, no DDFS) — proposed location
**`engine/fractal/DeepZoomMandelbrot/`** (sibling to other engine GL infra), or a dedicated
`engine-core` package if one exists for W8/W10/W4-style promotions. Public API:

```ts
class DeepZoomMandelbrot {
  constructor(canvas: HTMLCanvasElement | OffscreenCanvas);   // creates its own WebGL2 ctx
  setRenderSize(w: number, h: number): void;
  setParams(p: Partial<FractalParams>): void;                 // center, centerLow, zoom, maxIter,
                                                              // power, kind, juliaC, colorMapping,
                                                              // gradientRepeat, gradientPhase, deepZoomEnabled, …
  setColormap(rgba256: Uint8Array /* 1024 bytes */): void;    // == setGradientBuffer; THE ramp seam
  render(): void;                                              // julia pass + display pass (+ TSAA accumulate)
  // deep-zoom orchestration (optional / Phase 2):
  deepZoom: { setReferenceOrbit, setLATable, setAT, clear… };
  dispose(): void;
}
```

The orbit/LA/AT *builder* (worker side) stays a separate module the host drives, exactly as
`useDeepZoomOrbit.ts` does today — the renderer just consumes the resulting textures via
`deepZoom.setReferenceOrbit(...)`.

### 2.3 Extract-in-place so fluid-toy keeps working

Mirror the `gmtGradient` collapse: move the carved renderer into the shared core module, then have
**fluid-toy's `FluidEngine` compose/delegate to it** (or share the same shader strings + LUT manager
+ deepZoom builders) rather than duplicating. The shaders (`common.ts`, `julia.ts`, `display.ts`)
and the entire `deepZoom/` folder become the shared library; FluidEngine keeps the sim passes and
calls into the shared fractal passes. Fluid-toy smokes (`npm run smoke:fluid-toy`, `smoke:orbit`)
gate the no-regression.

### 2.4 MVP vs full extraction — the load-bearing decision

| | Shallow MVP | Full deep-zoom |
|---|---|---|
| Files | `julia.ts` (deep path off) + `display.ts` (stripped) + `common.ts` + `GradientLutManager` + a ~200-line `DeepZoomMandelbrot` host | + all of `deepZoom/*` (12 files) + `DeepZoomController` + worker + DD pan |
| Depth | ~1e-7 (plenty for "see your gradient") | ~1e-300 |
| Worker | none | required |
| Effort | **S–M** | **+L (→ XL overall)** |

The same shader serves both (deep path is a uniform toggle), so **the MVP is a strict subset** — no
throwaway work. Ship shallow first; deep-zoom is a clean follow-on that flips `deepZoomEnabled` and
wires the worker.

---

## 3. INTEGRATE as a GX fullscreen coloring mode

Target (S6, just merged): `gradient-explorer/FullscreenGradientOverlay.tsx`,
`palette/core/rampGeometry.ts`, `palette/store/fullscreenStore.ts`,
ramp seam `palette/core/gmtGradient.ts` → `utils/colorUtils.ts`.

### 3.1 How the overlay paints today

Display-only modal; six pure-2D geometries (`rampGeometry.ts:30-41` `GeometryId` union +
`GEOMETRIES` array), selected into `fullscreenStore.geom`. Paint is **synchronous, no RAF**:

```ts
// FullscreenGradientOverlay.tsx:95-116
const ctx = canvas.getContext('2d');
const buf = renderGeometry(ramp, fs.geom, { amount: fs.amount, seed: fs.seed }, w, h); // Uint8ClampedArray
ctx.putImageData(...);
```
Driven by `useEffect([fs.open, paint])` + a `ResizeObserver` on the stage
(`:119-137`). Canvas is `absolute inset-0 w-full h-full` inside a `flex-1 relative` stage (`:224-230`).

### 3.2 The ramp seam (already perfect)

```ts
// utils/colorUtils.ts:345-379 (re-exported via palette/core/gmtGradient.ts:16-19)
renderStopsToRamp(stops, blendSpace, colorSpace): RGB[]          // RGB[256], floats 0-255
renderStopsToBuffer(stops, blendSpace, colorSpace): Uint8Array   // 1024 bytes, RGBA8, alpha=255
```
Overlay already computes `ramp = renderStopsToRamp(fs.config.stops, …)` (`:87-93`). The fractal mode
calls **`renderStopsToBuffer(...)`** instead and uploads it as the colormap texture — byte-compatible
with `GradientLutManager.setBuffer` / `setColormap`. **No new ramp path; no palette invention.**

### 3.3 Five insertion points

1. **`rampGeometry.ts:30-44`** — add `'fractal'` to `GeometryId` + `GEOMETRIES`; extend
   `isStochastic()` if reroll is wanted. (No `sampleGeometry` case — fractal bypasses the 2D path.)
2. **`FullscreenGradientOverlay.tsx` paint (`:95-116`)** — branch: if `fs.geom === 'fractal'`, drive
   the WebGL renderer instead of the 2D canvas; this branch also needs an **RAF loop** (TSAA
   accumulation + pan/zoom are animated, unlike the synchronous 2D paint).
3. **JSX stage (`:224-230`)** — add a sibling `<canvas ref={glCanvasRef}>` mounted only when fractal
   mode is active (first GL canvas in the whole GX app).
4. **`exportPng` (`:139-146`)** — pick `glCanvasRef` when fractal; `canvasToPngBlob` (`SceneFormat.ts:129`)
   works on a WebGL canvas unchanged. ⚠ For WebGL, set `preserveDrawingBuffer: true` **or** render
   on-demand immediately before `toBlob` so the buffer isn't cleared.
5. **`ResizeObserver` (`:130-137`)** — resize both canvases; reconfigure the GL viewport + FBOs.

`fullscreenStore.ts` needs **no shape change** — `seed`/`amount` already exist and map naturally to
reroll-view / zoom-or-iter. Add fractal-specific transient state (center, zoom) as overlay-local
`useRef` (not store) to match fluid-toy's gesture-bypass pattern and avoid Zustand re-render cascades.

### 3.4 ⚠ Design tension: snapshot vs live ramp

`fs.config` is a **frozen snapshot captured at open time** — editing stops does **not** update the
overlay today (`:87-93`, store snapshot at open). "See your gradient in action" reads as *live*. Two
options (pick before building):

- **(a) Live-subscribe** the fractal mode to the editor's working stops, re-running
  `renderStopsToBuffer` + `setColormap` on each edit. Best UX, slightly more wiring (a live selector
  into the overlay; only for fractal mode to avoid changing 2D behavior).
- **(b) Keep snapshot model** — user opens fullscreen to preview; edits require re-open. Zero new
  wiring, consistent with current 2D modes, weaker "in action" feel.

**Recommendation: (a) for the fractal mode only.** It's the whole point of the feature; the LUT
re-upload is a 1024-byte texture write per edit (negligible) and resets TSAA accumulation cleanly.

### 3.5 Pan/zoom + reroll/amount controls

- **Pan/zoom:** port fluid-toy's gesture pattern (right-drag pan, wheel zoom) writing directly to the
  renderer + RAF, committing nothing to the store (overlay-local refs). For MVP, shallow zoom needs
  only f64 center; deep zoom later adds the DD `centerLow` + orbit rebuild.
- **`amount` slider** → map to zoom depth or `maxIter` (so the slider "dives" the fractal).
- **`seed` / reroll** → jump to a curated interesting center (a small table of nice coordinates), so
  each reroll reframes the gradient on fresh structure — mirrors the stochastic 2D modes.

### 3.6 Export PNG

Reuse S6's path: `canvasToPngBlob(glCanvas)` → `downloadBlob(blob, "${stem}-fractal.png")`
(`FullscreenGradientOverlay.tsx:139-146`, `SceneFormat.ts:129-155`). Only caveat is the
`preserveDrawingBuffer` / render-before-capture note in §3.3.4.

---

## 4. ARCHITECTURE + EFFORT

### 4.1 WebGL / shader needs
- **WebGL2 required** (RGBA32F orbit/LA textures, `textureLod`, integer uniforms). fluid-toy is
  WebGL2-only.
- New, self-contained GL context in the overlay — **no engine GL infra to reuse** (see §4.4). Stands
  alone.
- Optional ext: `EXT_disjoint_timer_query_webgl2` (perf only — skip for GX).

### 4.2 GPU perf + precision variance (ties to `project_render_4k_gap`)
- Mandelbrot at high `maxIter` is fragment-heavy; cap render resolution like the 2D path already does
  (`CONTINUOUS_MAX_DIM`/`RANDOM_MAX_DIM`, `FullscreenGradientOverlay.tsx:95-116`) and lean on TSAA to
  refine a downscaled buffer.
- **Precision variance is real and hardware-dependent** — the same float32-limit / ANGLE-lowering
  concerns logged in `project_render_4k_gap` apply. Mid/low GPUs and ANGLE/D3D11 may quantize the
  shallow path earlier than ~1e-7. Deep-zoom's LA/AT mitigate this at depth but add their own
  GPU-precision sensitivity (RGBA32F texture sampling). **Bench across GPUs before promising depth.**
- Mobile/tiler GPUs: cap iterations + resolution aggressively; consider a "reduce quality" floor.

### 4.3 Bundle size
- Shallow MVP: a few shader strings + a ~200-line host + LUT manager. **Small.**
- Deep-zoom: + `deepZoom/*` (~24k tokens of TS) + a worker chunk. The worker is lazy-loadable, so it
  need not bloat the GX initial bundle if code-split behind fractal-mode activation.

### 4.4 Reuse vs standalone
**Stands alone.** GX deliberately installs no viewport/render loop (`docs/modules/gradient-explorer/app.md:24-28,
105-108`) and has **zero existing WebGL** in `palette/` or `gradient-explorer/`. This is the first GL
canvas in the app — correctly scoped to the overlay only.

### 4.5 Effort estimate

| Scope | Effort | Notes |
|---|---|---|
| Carve `DeepZoomMandelbrot` (shallow) from FluidEngine + share shaders | **M** | The monolith carve is the bulk |
| GX fullscreen fractal mode (5 insertion points + RAF + live ramp) | **S–M** | Seam is small and known |
| Pan/zoom gestures (shallow, f64) | **S** | Port pattern |
| **Shallow MVP total** | **M (≈ L if FluidEngine carve is messy)** | Ships "see your gradient in action" |
| + Deep-zoom (extract `deepZoom/*` + worker + DD pan + orbit rebuild loop + cross-GPU bench) | **+L → XL overall** | Phase 2 |

---

## 5. RISKS

1. **No-viewport principle.** Must stay a scoped, opt-in GL canvas mounted *only* in the fullscreen
   overlay, unmounted with it — never a shell viewport (`app.md:24-28,105-108`). Mitigation: GL
   canvas lives behind `fs.geom === 'fractal'` and disposes on overlay close.
2. **FluidEngine carve risk.** FluidEngine (~1.8k lines) interleaves fractal + sim + bloom + display.
   Mis-carving could regress fluid-toy. Mitigation: extract-in-place / shared-shader (§2.3); gate on
   `smoke:fluid-toy` + `smoke:orbit`; carve the *passes*, not a rewrite.
3. **float32 depth limit on WebGL.** Shallow path quantizes ~1e-7 and earlier under ANGLE/D3D11 on
   weaker GPUs (`feedback_angle_d3d11_optimizer`, `project_render_4k_gap`). Deep zoom *needs*
   perturbation — but that's Phase 2. MVP must bound zoom so it never visibly mush-quantizes.
4. **GPU perf / precision variance across hardware.** Heavy fragment load + RGBA32F sampling.
   Mitigation: resolution cap + TSAA refine + iteration ceiling; bench on a low-tier GPU before
   shipping depth claims.
5. **Snapshot-vs-live ramp** (§3.4) — if left as snapshot, "in action" underdelivers. Decide up front.
6. **Touch / mobile** — gesture port must handle touch pan/zoom (pinch); tiler GPUs need quality
   floors. fluid-toy's gestures are pointer-based; verify pinch path.
7. **Bundle creep** — keep the deep-zoom worker code-split behind fractal-mode activation so GX's
   initial load isn't taxed.

---

## Recommended phasing

1. **Phase 0 — carve shared lib.** Lift fractal+gradient passes out of `FluidEngine` into a shared
   `DeepZoomMandelbrot` (deep path present but default-off); refactor fluid-toy to delegate; green
   the fluid smokes. *(M)*
2. **Phase 1 — GX shallow fractal mode.** 5 insertion points, RAF loop, live ramp (§3.4a), pan/zoom,
   reroll table, PNG export. Ship "see your gradient in action." *(S–M)*
3. **Phase 2 — deep zoom.** Wire `deepZoom/*` + worker + DD pan + orbit/LA/AT rebuild; cross-GPU
   bench; mobile pinch. *(L)*

---

## Appendix — primary citations

- **Precision:** `fluid-toy/deepZoom/{referenceOrbit,HighPrecComplex,dd,laBuilder,LAInfoDeep,atBuilder,deepZoomWorker,laRuntime}.ts`; shader deep path `fluid-toy/shaders/julia.ts:403-575`.
- **Gradient LUT:** `fluid-toy/fluid/GradientLutManager.ts:32-53`; sampler `fluid-toy/fluid/shaders/common.ts:64-101`; `constants.ts:42`.
- **GPU upload:** `fluid-toy/fluid/DeepZoomController.ts:79-138`.
- **Gestures:** `fluid-toy/pointer/gestures/pan.ts:19-72`, `zoom.ts`, `wheel.ts`; README:189-200.
- **GX overlay:** `gradient-explorer/FullscreenGradientOverlay.tsx:87-146,224-230`.
- **Ramp seam:** `utils/colorUtils.ts:345-379` via `palette/core/gmtGradient.ts:16-19`.
- **Geometry registry:** `palette/core/rampGeometry.ts:30-44,228-264`.
- **Store:** `palette/store/fullscreenStore.ts:24-92`.
- **Export:** `utils/SceneFormat.ts:129-155`.
- **No-viewport principle:** `docs/modules/gradient-explorer/app.md:24-28,105-108`.
