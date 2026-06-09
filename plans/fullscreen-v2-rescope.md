# Fullscreen-v2 RE-SCOPE — Gradient Explorer fullscreen overlay, second pass

**Date:** 2026-06-08
**Status:** FRESH RE-SCOPE on the merged foundation. **Supersedes** `plans/fullscreen-v2-scope.md`. **PENDING-HUMAN-REVIEW.**
**Workspace:** `h:/GMT/workspace-gmt/dev/` (all paths relative to here).

> **The old blocker is RESOLVED.** The early `fullscreen-v2-scope.md` was gated on the live-fractal carve and the
> P2 well migration both being in flight. **Both are now merged** — the `'fractal'` GeometryId + WebGL escape
> hatch is live in the overlay, and P2's `getRect?` SendTarget migration is settled. v2 builds on a stable
> foundation, not a moving target. The one remaining cross-stream tie is the planned P2-C well re-touch, which is
> orthogonal to everything below (open-path only, payload unchanged).

---

## Verdict (read this first)

**Fullscreen-v2 is a fan-outable polish + expansion phase, not one session.** The overlay today is a solid,
proven scaffold: a single component (`FullscreenGradientOverlay.tsx`) mounting a 2D canvas for six pure
geometries plus a WebGL canvas for the merged fractal mode, driven by a transient `fullscreenStore`. The v2 ask
is a grab-bag — splitscreen, SOTA dithering, mesh mode, fluid mode, an aesthetic/customizability overhaul of the
existing geometries, S-curve→spline, last-hero live-binding, a pseudo-3D parallax random-dots mode, animated
preview, all under a child-simple UX bar. These are **not equal in cost or risk**, and two of them
(mesh, fluid) are **carve-risk items** that must be gated exactly as the live-fractal carve was, or they will
regress mesh-export / fluid-toy.

**Recommendation:** decompose into **6 sub-streams behind one design gate** (the `GeometryParams` contract
redesign — every other stream threads through it). Ship a tight **v1-of-v2** = the contract + aesthetic/
customizability overhaul + live-binding + dithering, because those four share the same files and the same
"polish the modes we already have" context. Treat **splitscreen, spline, animated-preview, parallax-random** as
a second wave of additive features. Treat **mesh and fluid as their own gated carve initiative** (like
live-fractal), explicitly *after* the polish wave — they are the highest-effort, highest-risk, and lowest-
"makes-the-existing-thing-better" items. **The child-simple UX bar is a cross-cutting constraint on all of it,
not a stream.**

Overall effort: **~3–4 focused weeks** for the polish wave + feature wave; mesh+fluid is a separate **L–XL**
initiative on top.

---

## 1. Current state — what the overlay does now

**Component:** `gradient-explorer/FullscreenGradientOverlay.tsx` (~76–627). One overlay mounting:
- a **2D canvas** for the six pure geometries, painted synchronously via `renderGeometry` → `putImageData`;
- an optional **WebGL2 canvas** for `'fractal'` mode (lazy-loads `engine/fractal/FractalColorRenderer`, owns its
  own RAF loop, pan/zoom/wheel gestures mutate the renderer directly — no React re-render).

**Geometry registry:** `palette/core/rampGeometry.ts` — `GeometryId` union is
`'linear' | 'radial' | 'conic' | 'arched' | 'scurve' | 'random' | 'fractal'`, ordered by `GEOMETRIES`.
`isFractal` / `isStochastic` predicates branch the modes. The six pure mappers obey a **pure, DOM-free
`sampleGeometry` / `renderGeometry` contract** seeded by `mulberry32`, pinned **byte-identical** by
`debug/test-palette-rampgeometry.mts`. Fractal is the non-pure escape hatch (GPU-rendered, outside the contract).

**Params today:** `GeometryParams = { amount, seed }` — **stochastic-only**. Continuous geometries (radial/conic/
arched/scurve) are entirely hard-coded constants (e.g. S-curve uses a fixed Ken Perlin smootherstep; arched band
is `archCy=1.35, archR=2.3, archHalfWidth=0.3, archSpan=1.15`). There is **no per-geometry customization**.

**Store:** `palette/store/fullscreenStore.ts` — transient `useSyncExternalStore` (NOT DDFS, no persist, no undo),
CLOSED on reload. Holds `open/config/name/geom/seed/amount` + fractal knobs (`fractalPhase/fractalRepeats/
fractalMapping/fractalAnimate/fractalDeepZoom/fractalIterMul`). **Snapshot model:** `fs.config` is frozen at open
time (`useMemo[fs.config]`) — **editing stops does NOT update the preview**; you re-open to see edits.

**Render/export structure:** `ResizeObserver` on the stage drives repaint; canvas dims capped
(`CONTINUOUS_MAX_DIM=1440`, `RANDOM_MAX_DIM=1024`). PNG export branches 2D-canvas vs GL-canvas →
`canvasToPngBlob` (`SceneFormat.ts:129`) → `downloadBlob` with `stem-{geom}.png`. Opens via the `'fullscreen'`
SendTarget (`gradientTargets.ts:237`) or the ⛶ button.

---

## 2. The v2 feature set

Each entry: **what it is · reuse/carve path (cited) · effort (S/M/L) · risk.**

### 2.1 `GeometryParams` contract redesign — the GATE (not a feature, a precondition)
- **What:** extend `{amount, seed}` to carry per-geometry parameters (radial centre, conic angle/offset,
  scurve shape, arch radius/width/position, plus future mesh/fluid/dither fields).
- **Reuse/carve:** `rampGeometry.ts:56-61` `GeometryParams`; thread through `sampleGeometry`/`renderGeometry`
  (3 callsites) + `fullscreenStore`. Extend the determinism harness *first*.
- **Effort: S–M** (design-heavy, code-light).
- **Risk: M.** Must preserve byte-identical determinism + the pure contract; must leave `'fractal'` (and future
  mesh/fluid) as non-pure escape hatches that bypass `sampleGeometry`. **Decision 1** (tagged union vs flat
  optional fields) blocks implementation.

### 2.2 Aesthetic + customizability overhaul of existing modes
- **What:** expose the hard-coded continuous-geometry constants as live controls — radial centre (2D),
  conic angle/offset, arch radius/width/position, S-curve shape/amplitude; visual tuning per param.
- **Reuse/carve:** `ScalarInput` + `usePrecisionTrackDrag` (Shift×10 / Alt×0.1 already wired, used by fractal
  knobs at overlay `:491-532`); `DualAxisPad` for radial centre; `VectorInput::piMapping` for conic angle;
  `EasingPicker` discrete grid for S-curve shape; `EmbeddedColorPicker`'s responsive reflow pattern for the
  conditional per-geom toolbar (`:428-564` is already flex-wrap responsive).
- **Effort: S–M** (UI plumbing on top of the gate).
- **Risk: Low–M.** Toolbar real-estate growth → needs mobile responsiveness check; gates on a **visual smoke**
  per geometry (does radial-centre mapping feel intuitive?), not just determinism-green.

### 2.3 SOTA dithering
- **What:** high-quality dithering so 256-step ramps don't band — blue-noise (best), ordered/Bayer (fallback),
  error-diffusion (deferred).
- **Reuse/carve:** **blue-noise already shipped** — `engine/utils/createBlueNoiseWebGL2.ts` +
  `shaders/chunks/blue_noise.ts` (R2 temporal jitter), already consumed by `FractalColorRenderer`'s kernel
  (`engine/fractal/shaders/fractalKernel.ts`). Ordered Bayer = a trivial 4×4 GLSL matrix lookup. **No
  error-diffusion / Bayer chunks exist yet.**
- **Integration seam (Decision 3):** GLSL-native modes (fractal/mesh/fluid) dither *after* the gradient LUT
  lookup in the display shader. Pure-2D geometries paint via Canvas 2D and **cannot dither in GLSL** — options:
  (i) pre-dithered RGBA LUT in `renderGeometry`, (ii) Canvas-2D post-filter, (iii) OffscreenCanvas+WebGL.
  Recommend (i) for simplicity.
- **Effort: S–M** (S for blue-noise reuse + Bayer; M if 2D-canvas path needs the pre-dithered LUT).
- **Risk: Low.** Export caveat: temporal blue-noise jitter must resolve to a steady frame before PNG readback
  (disable jitter / accumulate before capture).

### 2.4 Last-hero / clicked-fav live binding
- **What:** when the active hero selection changes (a new pick, a clicked favourite), fullscreen auto-updates to
  show the new gradient instead of staying frozen on the open-time snapshot.
- **Reuse/carve:** `heroSelection.ts` `useActiveHeroSelection()` (active pick + payload); subscribe in the
  overlay / `fullscreenStore` and re-call `openFullscreen(config, name)` on hero change. The fractal mode already
  re-uploads the LUT cheaply (1024-byte texture write).
- **Effort: M.**
- **Risk: M.** Re-opening while open must be graceful. Inherits the **snapshot-vs-live tension** (Decision 5
  below): live-binding the *selection* is separate from live-binding *stop edits within the current selection* —
  the latter is the deeper question shared with live-fractal (`fullscreen-v2-scope.md:290-293` superseded note).

### 2.5 Splitscreen (horizontal)
- **What:** split the stage into two halves, each rendering independently (compare two geoms / two param
  variants / two gradients).
- **Reuse/carve:** keep the `ResizeObserver` + `paint()` structure; second stage div + second canvas; PNG export
  branch chooses `canvas[0]` / `canvas[1]` / composite. **No splitscreen code exists today.**
- **Effort: M.**
- **Risk: M.** Perf — 2× `renderGeometry` per frame for continuous geoms, 2× backing store; throttle to 30fps or
  use OffscreenCanvas if compositing. **Decision 6** (what the two halves compare + export filename convention)
  blocks design.

### 2.6 S-curve → spline mode
- **What:** replace the hard-coded smootherstep with a user-editable curve (Bézier control points).
- **Reuse/carve:** **no curve-editor precedent in the codebase.** v1 fallback: reuse `EasingPicker` discrete
  presets as the S-curve "shape" control (lands in 2.2). True spline = a new draggable-handle Bézier editor +
  cubic evaluation in `sampleGeometry` + 8-float-per-state serialization + determinism harness extension.
- **Effort: M–L** (curve-editor UX + math + determinism are the cost).
- **Risk: M.** Curve-editor UX design, math correctness, determinism-test bloat. **Recommend: ship the
  easing-picker shape control in the polish wave; defer the true Bézier editor to a later phase.**

### 2.7 Pseudo-3D parallax random-dots mode (draw-interactive)
- **What:** escalate the static 2D seeded-dot `random` mode to depth-layered parallax dots, optionally
  pointer-paintable.
- **Reuse/carve:** `fluid-toy/brush/particles.ts` particle structure + physics (gravity/drag, 300 cap) is a
  *reference*, but it's for in-fluid painting, not overlay-canvas UI. Current random is static seeded dots; no
  parallax / animation / interactivity precedent.
- **Effort: M–L** (depth layers + perspective warp; draw-interactivity is a separate interaction model on top).
- **Risk: M–L.** Large scope expansion; draw-interactivity must stay child-simple. **Recommend deferring to the
  feature wave or later; gate the interactive sub-feature behind a separate clarification of the interaction
  model (Decision: is draw-interactivity even in v2?).**

### 2.8 Animated preview (play/pause/scrub)
- **What:** animate a geom param (e.g. S-curve phase, conic angle, fractal phase) with local playback controls.
- **Reuse/carve:** **self-contained RAF loop + `mulberry32` seeded curves** — model on `FractalColorRenderer`'s
  RAF loop + the existing `fractalAnimate` knob. **Do NOT couple to `animationStore`/Timeline** (too heavy,
  scoped to the main timeline; keep playback local to the overlay).
- **Effort: M.**
- **Risk: M.** Per-frame determinism must stay testable; only animate the *current* geom (never grid + animation
  together — perf). Scope-creep magnet: keep to param animation, no keyframes. **Decision 7** (playback UI
  scope: autoplay-only vs play/pause/scrub).

### 2.9 MESH mode — **CARVE-RISK**
- **What:** a gradient-coloured heightfield / SDF surface as a fullscreen visual mode.
- **Reuse/carve:** the **fractal carve pattern is proven** (`engine/fractal/FractalColorRenderer.ts` carved from
  `FluidEngine` cleanly). Reuse `mesh-export/gpu/gpu-pipeline.ts` SDF formula system + shader factory for the
  heightfield evaluation; reuse the gradient LUT seam + blue-noise. New work: heightfield shader, ortho camera,
  per-normal/per-pixel gradient colouring. **Recommend per-pixel formula evaluation through an orthographic
  camera (no perspective, no mesh-gen) for v1** — defer true 3D mesh rendering.
- **Effort: M** (carve low-risk, but shader + camera are new).
- **Risk: M — carve MUST NOT regress mesh-export.** Gate exactly like live-fractal: extract-in-place / share the
  pipeline, run mesh-export's own checks before/after. **Decision: mesh coordinate domain** (ramp-pos→X /
  height→Y is the recommended simplest v1).

### 2.10 FLUID mode — **CARVE-RISK (highest)**
- **What:** embed the fluid sim as a fullscreen mode, with the frozen gradient colouring the fluid.
- **Reuse/carve:** reuse `fluid-toy/fluid/shaders/sim.ts` (motion/advect/divergence/pressure/vorticity/splat) +
  blue-noise + bloom chain. **The hard part:** `FluidEngine` is tightly coupled — the dye-injection path reads
  `FRAG_JULIA`'s MRT output (`engine/fractal/shaders/fractalKernel.ts`). Fullscreen-fluid must **decouple
  dye-injection from fractal iteration**, re-wiring it to a noise/particle-seeded dye field coloured by the
  frozen gradient LUT instead of the Mandelbrot luma.
- **Effort: M–L** (decoupling the dye path is the cost; shader-suite reuse is high).
- **Risk: M–L — carve MUST NOT regress fluid-toy.** Same extract-in-place + smoke-gate discipline as live-fractal
  (`smoke:fluid-toy`, `smoke:orbit`). **Decision: dye-seed source** (noise/particles vs a "lite" baked fractal) —
  clarify whether the user expects "my gradient colouring a real fluid".

### 2.11 Child-simple UX bar — **CROSS-CUTTING CONSTRAINT (not a stream)**
- **What:** every control added above must stay intuitive for a kid. As per-geom controls multiply, the toolbar
  must not become a cockpit.
- **Implication:** progressive disclosure — a small default control set per mode, advanced params behind a
  collapse/"more" affordance; random-mode's escalated controls hidden by default; sensible defaults so a mode
  looks good with zero tweaking. This constrains the design of 2.2, 2.5, 2.7, 2.8 and is a gate criterion on
  every visual-smoke review.

---

## 3. Sub-stream decomposition + phasing (the key deliverable)

**Batched by shared context** (per the project's session-scope lesson — don't over-fragment). One design gate,
then two product waves, then a separate gated carve initiative.

| Gate | **FS-V2-GATE · `GeometryParams` contract redesign** | — | Decision 1 (tagged union vs flat). Extend the determinism harness first. Leave non-pure escape hatch for fractal/mesh/fluid. Blocks every stream below. |
|------|----|----|----|

| Stream | Scope | Size | Depends on | File-set (primary) | Carve-risk |
|--------|-------|------|-----------|--------------------|-----------|
| **FS1 · Mode polish + customizability + dithering** | Per-geom controls (radial centre / conic angle / arch r-w-pos / S-curve easing-shape) via `GeometryParams`; conditional toolbar; blue-noise + Bayer dithering (GLSL modes) + pre-dithered LUT (2D). Child-simple progressive disclosure. | **M** | Gate | `rampGeometry.ts`, `FullscreenGradientOverlay.tsx`, `ScalarInput`/`DualAxisPad`/`EasingPicker`, `blue_noise.ts`, `test-palette-rampgeometry.mts` | none |
| **FS2 · Live-binding** | Subscribe `useActiveHeroSelection()`; auto-refresh overlay on hero change; resolve snapshot-vs-live (Decision 5). | **M** | Gate (config-refresh semantics) | `fullscreenStore.ts`, `FullscreenGradientOverlay.tsx`, `heroSelection.ts` | none |
| **FS3 · Splitscreen** | Two-stage layout; dual `paint()`/`ResizeObserver`; PNG export branch. | **M** | FS1 (per-geom params to compare) | `FullscreenGradientOverlay.tsx`, export path | none |
| **FS4 · Animated preview + parallax-random** | Self-contained RAF + seeded curves; play/pause/scrub (Decision 7); pseudo-3D parallax random dots (depth layers); optional draw-interactivity (separate clarification). | **M–L** | FS1 | `FullscreenGradientOverlay.tsx`, `rampGeometry.ts` (random), new RAF module | none |
| **FS5 · Spline mode** | True Bézier curve-editor + cubic eval in `sampleGeometry` + 8-float serialization + determinism cases. (Easing-shape v1 ships in FS1.) | **M–L** | FS1 | NEW curve-editor component, `rampGeometry.ts`, harness | none |
| **FS6 · MESH + FLUID carve** *(separate gated initiative)* | Carve gradient-coloured heightfield (mesh) + decoupled gradient-fluid from mesh-export / fluid-toy / FluidEngine, extract-in-place, share pipelines. Mount as non-pure escape-hatch modes. | **L–XL** | Gate + (FS1 dithering seam) | `engine/fractal/*` pattern, `mesh-export/gpu/gpu-pipeline.ts`, `fluid-toy/fluid/FluidEngine.ts` + `shaders/sim.ts` | **YES — gate like live-fractal; must not regress mesh-export or fluid-toy** |

**Recommended wave order:**
1. **Gate:** ratify `GeometryParams` design (Decision 1), extend determinism harness.
2. **Wave 1 — polish (v1-of-v2):** FS1 (mode polish + dithering) ‖ FS2 (live-binding). Shared "make existing
   modes better" context; both land the highest perceived value per effort.
3. **Wave 2 — features:** FS3 (splitscreen) → FS4 (animated + parallax) → FS5 (spline). Additive, each gates on
   a visual smoke under the child-simple bar.
4. **Wave 3 — carve initiative:** FS6 (mesh, then fluid), run like the live-fractal carve — extract-in-place,
   smoke-gate the source toys, runtime visual re-verify (concept-ok ≠ runtime-works, the S6 lesson).

---

## 4. Decisions for the user (numbered)

1. **`GeometryParams` contract shape** — tagged discriminated union (`{kind:'radial', cx, cy}`, type-safe, needs
   `sampleGeometry` signature change) vs flat optional fields (`{radialCx?, conicAngle?, …}`, simpler, less
   safe). *Recommend flat optional fields* for the pure mappers (no per-param switch), with fractal/mesh/fluid as
   non-pure escape hatches outside the contract. **Blocks the gate.**
2. **What makes v1-of-v2?** *Recommend:* FS1 (mode polish + dithering) + FS2 (live-binding). Defer splitscreen,
   spline, animated/parallax to wave 2; defer mesh+fluid to the wave-3 carve initiative.
3. **Dither approach + scope** — blue-noise (reuse, shipped) + ordered-Bayer fallback; error-diffusion deferred.
   2D-canvas path via pre-dithered LUT (recommended) vs Canvas-2D post-filter vs OffscreenCanvas. Must dithering
   appear in PNG export (→ steady-frame readback)? *Recommend: blue-noise+Bayer, pre-dithered LUT for 2D, dither
   visible in export via steady-frame capture.*
4. **Spline-editor style** — ship `EasingPicker` discrete-preset shape control now (FS1) and defer the true
   draggable-handle Bézier editor (FS5)? Or build the full curve editor up front? *Recommend: easing presets in
   FS1, Bézier editor as FS5.*
5. **Snapshot vs live (all modes)** — when the user edits gradient *stops* while fullscreen is open, should the
   preview update? (a) snapshot-only (re-open), (b) live-ramp (no undo, drifts from DDFS), (c) hybrid (live
   params + selection, frozen stops). FS2 live-*binds the selection*; this is the deeper *stop-edit* question.
   *Recommend (c) hybrid for v1*, revisit live stop-edit with the live-fractal "see your gradient in action" goal.
6. **Splitscreen layout** — what do the two halves compare: same gradient/two geoms, same gradient/two param
   variants, two gradients/one geom, or compare-vs-favourite? And export filename convention (`-split.png` /
   per-half). *Needs UX definition before FS3.*
7. **Animated-preview scope** — autoplay-only (set anim params, preview loops) vs full play/pause/scrub/speed.
   *Recommend: autoplay + a single play/pause toggle for v1*, scrub deferred. **And:** is parallax-random's
   *draw-interactivity* in v2 at all, or static-parallax only? *Recommend static parallax first, draw deferred.*
8. **Are mesh AND fluid both in scope, or phased?** *Recommend: both are a single wave-3 carve initiative
   (FS6), mesh first (lower coupling), fluid second; each gated like live-fractal. Confirm both belong in v2 vs
   spinning fluid into its own later initiative.*

---

## 5. Sequencing + open questions

**Sequencing vs other work.** The live-fractal carve and P2's `getRect?` well migration are **merged** — v2 no
longer waits on either. The one residual tie is P2-C's planned fullscreen-well re-touch (open-path only, payload
unchanged); v2's FS1/FS2 land independently and accept that one re-touch, exactly as `p2-scope.md:250-254`
records. v2 Phase-0's contract **must keep the non-pure escape hatch** for `'fractal'` (and future mesh/fluid).

**Open questions the surveyors flagged:**
- **Determinism-harness expansion** — every new param needs seeded pinning cases; coordinate with
  `test-palette-rampgeometry.mts`; generate a tabular geom×param×seed matrix to avoid file bloat.
- **Mesh heightfield domain** — ramp-pos→X/height→Y (simplest) vs polar (radial heightfield) vs full
  position×colour-component×brightness space. Recommend (a) first.
- **Fluid dye-seed** — noise/particle-seeded vs a "lite" baked fractal; affects whether it satisfies "see my
  gradient colour a real fluid". Clarify before FS6 fluid.
- **Deep-zoom for mesh/fluid** — fractal ships deep-zoom; mesh/fluid use shallow f32 (fluid has no zoom notion).
  Confirm shallow is sufficient for mesh.
- **Perf ceiling for dual-canvas + animation** — splitscreen × animation = 2× per-frame renderGeometry; no
  OffscreenCanvas/worker pooling today. Bounds whether FS3+FS4 can combine; may need async composition.
- **Tiling/repeat geometry** (a floated wave-2 idea) — is it a per-geometry post-processor (scale pos before
  ramp lookup) or a structural field change (multiple pos/cov layers)? Assess if pursued.
- **Child-simple validation owner** — who runs the per-geometry visual smoke and signs off the UX bar? Each
  visual stream gates on it, not just determinism-green.

---

## Appendix — primary citations

- **Overlay:** `gradient-explorer/FullscreenGradientOverlay.tsx:76-627` (paint `:112-141`, fractal `:179-284`,
  export `:404-415`, toolbar `:428-564`, fractal knobs `:491-532`).
- **Geometry contract:** `palette/core/rampGeometry.ts:30-47` (union), `:56-61` (`GeometryParams`),
  `:169-230` (continuous mappers + arch constants).
- **Store:** `palette/store/fullscreenStore.ts:55-71`.
- **Fractal renderer (carve precedent):** `engine/fractal/FractalColorRenderer.ts:1-142`;
  kernel `engine/fractal/shaders/fractalKernel.ts:1-100`.
- **Dithering:** `engine/utils/createBlueNoiseWebGL2.ts:1-80`; `shaders/chunks/blue_noise.ts:1-52`.
- **Mesh carve source:** `docs/gmt/30_Mesh_Export_Prototype.md`; `mesh-export/gpu/gpu-pipeline.ts`;
  `mesh-export/preview/mesh-preview.ts:1-106`.
- **Fluid carve source:** `fluid-toy/fluid/FluidEngine.ts:1-200`; `fluid-toy/fluid/shaders/{index,sim}.ts`;
  `fluid-toy/brush/particles.ts`.
- **UI components:** `ScalarInput.tsx` + `FormatUtils.ts` (`createLogMapping`, `usePrecisionTrackDrag`);
  `DualAxisPad`, `EasingPicker`, `EmbeddedColorPicker.tsx`, `GradientHoverPreview.tsx`.
- **Live-binding source:** `heroSelection.ts` (`useActiveHeroSelection`).
- **Targets / open path:** `gradientTargets.ts:237` (`'fullscreen'` SendTarget).
- **Export:** `utils/SceneFormat.ts:129`.
- **Determinism harness:** `debug/test-palette-rampgeometry.mts`.
- **Superseded / cross-stream:** `plans/fullscreen-v2-scope.md` (this doc supersedes it);
  `plans/gx-live-fractal-coloring-scope.md`; `plans/p2-scope.md:250-254`.

---

## Researched best-in-class approaches (web, 2026-06-08)

This section informs **HOW** each stream above is built — the sub-stream/phasing structure (§3) is unchanged. It
replaces "pick a reasonable algorithm" guesses with the SOTA path so build sub-streams don't re-derive them.

### Dithering (FS1, §2.3)
- **SOTA:** Blue-noise-sourced **TPDF (triangular-PDF) dither at ~1 LSB (1/255), applied at the END of the
  fragment shader just before the implicit 8-bit write.** Build TPDF by adding two blue-noise samples (or remap
  one uniform sample via `sign(v)*(1-sqrt(1-abs(v)))`); clamp amplitude near pure black/white
  (`min(c,1-c)`). **IGN** (`fract(52.9829189*fract(dot(fragCoord,vec2(0.06711056,0.00583715))))`) is the zero-asset
  fallback for the 2D-canvas path if bundling a texture is undesirable.
- **Why it wins:** quality ranks white-noise < ordered-Bayer (aliases into visible cross-hatch — avoid) <
  IGN < blue-noise. TPDF (vs uniform/RPDF) makes the error's first *and* second moments signal-independent for
  one extra add — it removes the residual band edges plain dither leaves. Blue noise's energy sits in
  high frequencies the eye suppresses, ideal for a STATIC ramp.
- **GX fit:** the repo already ships `createBlueNoiseWebGL2.ts` + `blue_noise.ts` (R2 jitter) consumed by the
  fractal kernel — reuse it for GLSL modes. For the static gradient, prefer a **static tile** (don't re-randomize
  per frame — it shimmers); if animating, advance by the R2 low-discrepancy offset, not white-noise reseed.
- **Cite:** bartwronski.com/2016/10/30/dithering-part-three-real-world-2d-quantization-dithering/ ·
  momentsingraphics.de/BlueNoise.html · blog.frost.kiwi/GLSL-noise-and-radial-gradient/

### Spline mode (FS5, §2.6)
- **SOTA:** **Monotone cubic (Fritsch-Carlson) as the DEFAULT interpolation**, with optional per-point modes
  (Linear / Constant / Catmull-Rom / Bézier) — the Houdini ramp model. Bake the curve to a 256/1024-entry **1D
  LUT texture** on edit; the shader just does a texture lookup (60fps regardless of curve complexity).
- **Why it wins:** a colour/value ramp REQUIRES shape preservation — Catmull-Rom and natural cubic B-splines
  overshoot below 0 / above 1 near non-monotone stops, producing phantom colours / clipped luminance the artist
  never placed. Monotone cubic clamps tangents so the curve stays in-range and never reverses — smooth but
  artifact-free, hence the safe ramp default. Bézier is the pro escape hatch.
- **GX fit:** an S-curve is literally a 3-stop monotone-cubic ramp (clean toe/shoulder, no clipping). UX:
  Houdini/Cavalry direct-manipulation — **click empty area = add point, drag = move, drag-off/right-click =
  delete, double-click = exact value.** Default monotone-cubic needs **NO tangent handles** for the common case
  (progressive disclosure — handles appear only when a point is switched to Bézier). This lets FS5 ship WITHOUT a
  tangent-handle UI, then layer Bézier later.
- **Cite:** en.wikipedia.org/wiki/Monotone_cubic_interpolation ·
  jb101.co.uk/2020/12/27/monotone-cubic-interpolation.html · sidefx.com/docs/houdini/network/ramps.html

### Mesh mode (FS6, §2.9)
- **SOTA:** Drive a displacement surface from the gradient itself — map ramp pos `u∈[0,1]` across one axis,
  use sampled **Rec.709 luminance** (`0.2126R+0.7152G+0.0722B`) as height `y=f(u)`. Render via vertex-shader
  displacement on a `PlaneGeometry` (vertex-texture-fetch the existing LUT) with **analytic central-difference
  normals**; IQ heightfield raymarching (`f(x,y,z)=y-h(x,z)`) is the resolution-independent fallback. Shade with
  a **single low-saturation neutral key + IQ soft shadows + cheap AO + exponential fog + subtle rim**; albedo =
  gradient LUT sample so geometry and colour are the same data.
- **Why it wins:** a gradient is inherently 1D, so a value-as-height terrain is the most legible 3D reading and
  never hides the colours. IQ's height-as-scalar-field is the canonical real-time technique with correct normals
  for free; a low-sat key avoids fighting the palette hues the user is designing.
- **GX fit:** mesh path is ~30-line vertex shader + central-diff normals reusing the LUT you already upload —
  cheaper than the §2.9 ortho-raymarch v1 and trivially 60fps. One "depth/relief" slider scales `y` (child-simple).
  Confirms shallow f32 is fine (§5 open question).
- **Cite:** iquilezles.org/articles/terrainmarching/ · iquilezles.org/articles/normalsSDF/

### Fluid mode (FS6, §2.10)
- **SOTA:** Classic **Stam Stable Fluids on the GPU** via the GPU Gems 3 ch.38 pipeline as productised by
  **Pavel Dobryakov's WebGL-Fluid-Simulation** (MIT): ping-pong FBOs running advection → curl → vorticity
  confinement → divergence → Jacobi pressure → gradient subtraction, with a separately-advected dye field; pointer
  splats add velocity+dye. Run sim at half/quarter res, display full-res. **Colourize by advecting a SCALAR
  density (or a 1D gradient-position coord) and indexing the gradient LUT** (`texture(gradientLUT, density)`) —
  NOT by advecting RGB (RGB advection greys toward the mean as colours mix; scalar-index keeps pure palette hues).
- **Why it wins:** unconditionally stable, runs on mobile, the 16k-star reference everyone forks. MLS-MPM /
  screen-space-fluid (Codrops 2025) is higher-fidelity but WebGPU + 3D-particle — overkill for a 2D coloured-dye
  overlay. Scalar-index colourization decouples physics from look, so editing the gradient instantly recolours the
  live fluid.
- **GX fit:** the only GX-specific change vs Dobryakov is swapping dye-RGB-from-hue → gradient-LUT sample (one
  display-shader line) + curl/vorticity sliders. Sharpens §2.10's "dye-seed source" decision: seed a scalar
  density via pointer/noise, index the LUT — this directly satisfies "my gradient colouring a real fluid."
- **Cite:** github.com/PavelDoGreat/WebGL-Fluid-Simulation ·
  developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu

### Parallax random-dots (FS4, §2.7)
- **SOTA:** **3–6 discrete depth layers** of soft additive-blended point sprites; per-layer parallax offset ∝
  depth × pointer/scroll delta (nearer = moves more); per-dot size grows + softness increases with nearness; far
  layers desaturate/dim (atmospheric haze). **Additive blend = order-independent** (no depth sort). Colour each
  dot by sampling the gradient LUT (index by layer depth or per-dot random `t`). WebGL2 **instanced rendering**
  (`drawArraysInstanced`) handles tens of thousands at 60fps. Interactivity: pointer = force/emitter (radial
  impulse + spawn-at-cursor, velocities damp back); for large counts keep position/velocity in **ping-pong float
  textures** — the SAME GPU-state machinery FLUID needs.
- **Why it wins:** speed-by-depth is the textbook depth cue; size/blur/desat-by-depth add the haze cue that
  separates flat from immersive. Discrete layers let you tune parallax/size/blur per layer cheaply.
- **GX fit:** dots literally sparkle the palette in 3D. Shares the ping-pong-FBO + pointer-splat infra with FLUID,
  so the two generative modes amortise one particle/state system. **Recommend start CPU-array (few thousand dots),
  promote to GPU-texture state only if count demands** — matches §2.7's child-simple "one brush-size slider."
- **Cite:** rocket-boots.github.io/webgl-starfield/ · ef-map.com/blog/starfield-depth-effects-subtle-immersion

### Splitscreen / comparison (FS3, §2.5)
- **SOTA:** **Single-canvas wipe with a draggable divider** (JuxtaposeJS / KnightLab before-after model), NOT two
  separate panes. Render both states into one full-bleed quad and reveal via `step(uSplitX, vUV.x)` — a one-line
  shader branch. Both panes share **one camera + one animation clock** (only the gradient data differs). Add an
  **A | B | Split** segmented toggle (sets `uSplitX` to 0/1/0.5). Back the divider with **WAI-ARIA slider
  semantics** (native `input[type=range]` styled as the handle, live `aria-valuenow`), an oversized invisible
  ~44px+ hit-strip, full-canvas drag, and a one-time "nudge" hint.
- **Why it wins:** the two states occupy the EXACT same pixels under identical lighting/phase, so the eye does
  pixel-level A/B diffing instead of saccading between half-res panes — critical for catching the small colour /
  banding deltas a gradient tool exists to show. Avoids the 2× full `renderGeometry` cost the §2.5 two-canvas
  sketch implies (one quad, two LUT samples, one mix).
- **GX fit:** **CHANGES §2.5's two-canvas/two-`ResizeObserver` plan** → one canvas + `uSplitX` uniform + a DOM
  handle binding pointermove→uniform. No second framebuffer, no second React render. Resolves Decision 6: compare
  two gradient/param states on the same geom+camera; export `-split.png` of the composite (or A|B via toggle).
- **Cite:** sliderrevolution.com/design/before-and-after-slider/ · nngroup.com/articles/direct-manipulation-analysis/

### Child-simple UX (cross-cutting, §2.11)
- **SOTA:** **Direct manipulation with sub-100ms continuous feedback and NO hidden modes** — every control is a
  draggable object ON the gradient (drag a stop, drag an angle handle), updating live (NN/g's ~0.1s incremental
  bar). Eliminate tool palettes / double-tap / pinch; single-direction drags ("primal gestures"). **Forgiveness:**
  invalid drags spring back with a soft bounce (never error); one-tap Undo; double-tap-to-reset on any handle.
  **Signifiers** (grab dots, faint divider arrow) announce affordances; a one-time idle "wiggle" on the primary
  handle teaches discoverability.
- **Why it wins:** NN/g/Norman (direct manipulation + <0.1s feedback + reversible) and kids-UX (Toca Boca
  "simplicity through elimination" + exaggerated grab feedback) converge. Crucially this does NOT dumb down pro
  capability — it removes chrome/modes, not features; forgiveness lets kids explore the FULL set fearlessly.
- **GX fit:** the gradient is already the star — bind stops/angle/spread directly onto it; 60fps uniform updates
  give the <100ms feedback for free. Tightens §2.11: progressive disclosure = signifier-driven, no modal "select
  tool then act," big hit targets + snap-to-grid for small hands.
- **Cite:** nngroup.com/articles/direct-manipulation-analysis/ · gapsystudio.com/blog/ux-design-for-kids/

### Animated preview (FS4, §2.8)
- **SOTA:** **LUT-offset palette cycling** the demoscene way (Mark Ferrari "Canvas Cycle") — keep gradient
  geometry static, animate a single `uPhase` uniform rotating the LUT offset (zero extra draw cost), plus
  **BlendShift** (one `mix()` interpolating between palette indices) so the cycle is smooth not steppy. Defaults:
  slow speed, obvious **Play/Pause** + speed slider. **Respect `prefers-reduced-motion`** (start paused when set);
  because auto-motion runs >5s, an explicit pause control is **required by WCAG 2.2.2**. The shared animation clock
  drives BOTH comparison panes so A/B stay phase-locked.
- **Why it wins:** LUT-offset cycling animates "for free" by changing an offset, not pixels — exactly a gradient
  tool's data model; BlendShift removes the visible stepping. Calm defaults + mandatory pause avoid the
  "overwhelming" failure while keeping the wow.
- **GX fit:** GX already has a palette/LUT — cycling is `uPhase` advanced by the overlay's local RAF clock
  (do NOT couple to `animationStore`, per §2.8). Confirms Decision 7: autoplay + single Play/Pause for v1, scrub
  deferred. Two tiny controls + a media-query check.
- **Cite:** effectgames.com/effect/article-Old_School_Color_Cycling_with_HTML5.html ·
  w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html

### Net effect on the plan
- **CONFIRMS** the codebase-grounded path for: **dithering** (blue-noise is already the recommended reuse —
  research just adds the TPDF distribution + static-tile detail), **mesh** (value-as-height heightfield +
  IQ shading matches the §2.9 ramp-pos→X/height→Y recommendation, and validates shallow f32), **fluid** (Stam
  pipeline + the planned dye-decouple), **animated preview** (local RAF, no animationStore; autoplay+pause v1),
  and the **child-simple bar** (direct-manipulation + progressive disclosure).
- **SHARPENS — dither algorithm:** the research names the exact recipe — **blue-noise-sourced TPDF at 1 LSB at the
  shader tail with a static tile**, and demotes ordered-Bayer (it aliases into cross-hatch) to last-resort, with
  **IGN** as the preferred zero-asset 2D fallback. §2.3 listed Bayer as the fallback; prefer IGN over Bayer.
- **CHANGES — splitscreen architecture:** the SOTA is a **single-canvas shader wipe with a draggable ARIA
  divider**, NOT §2.5's two-stage / two-`ResizeObserver` / two-canvas layout. This is cheaper (one quad, two LUT
  samples, one `mix()` — avoids 2× `renderGeometry`), more accurate (same-pixel A/B diffing), more accessible, and
  resolves Decision 6 (same geom+camera, `-split.png` export, A|B|Split toggle). **Build FS3 as a wipe, not split panes.**
- **CHANGES/SHARPENS — spline type & editor:** pin the default to **monotone cubic (Fritsch-Carlson)**, not
  generic Bézier/Catmull-Rom (which overshoot out-of-gamut on a colour ramp). Bake to a **1D LUT** so the shader
  just samples. Crucially this lets FS5 ship the full curve editor **with NO tangent-handle UI** (points alone
  define a smooth in-gamut curve); Bézier handles become a later per-point progressive-disclosure mode — lowering
  FS5's effort/risk vs §2.6's "true Bézier editor" framing.
- **SHARPENS — export (Decision 3):** route PNG export through the SAME dithered shader/FBO so dither bakes into
  the 8-bit PNG (the PNG has the identical quantization problem the screen does); only the 8-bit path needs it.

---

## RATIFIED PLAN + CORRECTIONS (2026-06-08, post user-decisions) — authoritative; supersedes conflicts above

**User gate decisions:**
- **GeometryParams = FLAT-OPTIONAL** (one params object, optional per-mode fields). This is the gate; everything threads through it.
- **v1-of-v2 = GO STRAIGHT FOR THE SPLASHY NEW MODES** (NOT the FS1/FS2 polish-first). Splitscreen / liquify / parallax / spline are the priority; mode-polish + live-binding fold in around them.
- **Dither bakes into the 8-bit PNG export.**

**CORRECTION — "spline mode" is a GEOMETRY/PATH mode (the earlier monotone-cubic finding §2.6 + its SOTA entry are VOID):**
- Spline mode = **the gradient flows along an editable spline PATH in 2D** (Adobe Illustrator Freeform-Gradient **"Lines"** mode is the exact reference). It has NOTHING to do with colour interpolation / gamut overshoot — that earlier finding answered the wrong question.
- **Path spline = centripetal Catmull-Rom (α=0.5)** — interpolates through the user's clicked points, auto-tangents (no Bézier handles), provably no cusps/self-intersection, good arc-length spacing.
- **Render:** CPU-tessellate the spline → polyline + a normalized **arc-length table**; fragment shader = nearest-segment via IQ `sdSegment` (the clamp factor gives the along-path param for free) → interpolate arc-length → **ramp coord `u` → LUT sample**; perpendicular distance drives the band falloff (smoothstep). Light shader; real-time on integrated GPUs (cap N≈64–128).
- **Interaction (child-simple):** click to add points, drag to move (live re-flow), click-on-path to insert, Delete to remove; seed a gentle default curve; **single path for v2**, multi-path additive later.
- **Effort: Low–Medium** (math/shader textbook; risk is interaction polish; resist scope-creep into full gradient-mesh).
- *Cite: Illustrator freeform-gradient Lines · IQ 2D SDFs (sdSegment) · centripetal Catmull-Rom · arc-length reparam.*

**CHANGE — MESH + FLUID are COMBINED into ONE mode: "LIQUIFY" (supersedes §2.9 mesh + §2.10 fluid):**
- **Concept:** the gradient is a **deformable 2D grid mesh** whose vertices carry UV into the 256-LUT. The user **directly shapes** the colour field (Photoshop-Liquify-style push/pull/grab) and can **optionally** let physics + smoothing act on that same mesh; colours follow the deformation. **Fluid is realized as MESH physics (soft-body), not a separate fluid sim** (matches the "fluid is a new module" decision).
- **★ Art-direction contract (the crux):** the user's deformation is **authoritative**; physics is an **optional, dampened, reversible** layer that relaxes/jiggles *toward the sculpted rest shape — never toward flat, never overriding the artist*. Toggle physics off → exactly what was sculpted remains.
- **Warp:** Liquify forward-warp **brushes** for interaction (push/pull/twirl/bloat/pucker/smooth/grab) over **MLS (rigid) handle solver** on a dense grid (closed-form, real-time, natural "real-object" feel). ARAP = future high-fidelity toggle, not v2.
- **Physics:** **XPBD** (Extended Position-Based Dynamics) — its per-constraint **compliance** maps 1:1 onto a **Stiffness** slider; **pin/freeze = compliance 0** (AE "Starch" model); substeps + edge damping; unconditionally stable. Smoothing = **Taubin λ|μ** (NOT plain Laplacian — that shrinks/melts the mesh).
- **WebGL2 render:** deform-the-mesh — dense grid (~128² ≈ 16k verts), CPU sim (MLS + XPBD + Taubin), vertex shader samples the LUT by a carried scalar so **colours stretch with the material**. Warp-field texture = cheap fallback. Per-frame: brush/handle input → set pins → XPBD substep (damped) → optional Taubin → upload.
- **Interaction (child-simple, professional, NO idle WIGGLE):** primary verb = direct grab-drag; small iconic brush set + restore (Liquify Reconstruct); physics = **one toggle (OFF by default) + 3 sliders** (stiffness/damping/smooth). Discoverability via **static signifiers only** — brush-ring cursor, visible handle dots, faint rest-grid overlay, generous touch targets; **no hidden modes** (toolbar always visible).
- **Effort/risk:** warp = M, low-risk (MLS textbook/closed-form); **XPBD physics = M–H, medium-risk — the one real risk is JS 60fps on ~16k verts** → mitigate with active-region-only solving, density tiers, later worker/GPU path (stability is NOT a risk); Taubin = low. The art-direction contract = low-code, high-design-importance.
- **Build order:** deformable grid + LUT-follow render → Liquify brush + MLS grab handles → freeze/pin + restore → Taubin smooth → XPBD jiggle (off by default) → static-signifier polish.
- *Cite: Schaefer et al. MLS (SIGGRAPH'06) · Macklin XPBD + Müller Ten-Minute-Physics · AE Puppet/Starch · PS Liquify · Taubin smoothing. (WebFetch was flaky — confirm exact MLS weight form / XPBD compliance update / Starch ranges against the source PDFs at implementation.)*

**CHANGE — child-simple UX (§2.11 / SOTA entry): DROP the idle "wiggle" hint.** Use static signifiers only (cursors, handle dots, faint affordance overlays); everything else in §2.11 stands.

**Net effect on phasing (§3):** FS6 mesh + FS6 fluid → **one LIQUIFY sub-stream** (a new module). Mode count drops; the two carve-risk flags collapse to one new-module build (no fluid-toy/mesh-export carve, so no source-toy regression gate). Spline (FS5) = the path-mode above. Order with v1=splashy-first: gate (flat-optional) → splitscreen + liquify + parallax + spline as the priority waves → polish/dithering/live-binding/animated fold in. **The first sub-stream is still the GeometryParams flat-optional gate** (everything threads through it), then the splashy modes.

---

## Mode plug-in seam (FROZEN — 2026-06-09, Session 1 landed on `exec/fs-gate-splitscreen`)

This is the **interface freeze** the parallel mode streams (Liquify / Spline / Parallax) code against. It is implemented and gate-green (tsc 0, `test:palette` green incl. the extended `rampGeometry` contract). **Consume it read-only / additively — do not edit the overlay core or the compositor to add a mode.**

### Files (the seam lives in `gradient-explorer/fullscreen/`)
- `modeRegistry.ts` — the `FullscreenMode` type + `registerFullscreenMode` / `getFullscreenMode` / `listFullscreenModes`.
- `ditherTail.ts` — `DITHER_TAIL_GLSL` (the shared TPDF blue-noise tail), `wrapModeFragment(body, extraUniforms)`, `VERT_QUAD`, `BLIT_MODE_BODY`, `RESERVED_UNIFORMS`.
- `FullscreenCompositor.ts` — the ONE shared WebGL2 surface; `presentRaster` (cpuRaster) + `presentMode` (glQuad), both ending in the dither tail; `uploadLut`, `setSize`, `dispose`; Canvas-2D fallback (no dither) when WebGL2 is absent.
- `modes/index.ts` — registers builtins at import; **a parallel mode adds its `import './xMode'` here**.
- `modes/geometryModes.tsx` — the 6 cpuRaster geometry modes + the `fractal` ownCanvas entry + the `RandomControls` exemplar.
- GATE: `palette/core/rampGeometry.ts` — `GeometryParams` (flat-optional) + `GEOM_DEFAULTS`.

### How to add a mode (additive — touch only your own module + one import line)
1. Write `modes/<id>Mode.ts(x)` exporting a `FullscreenMode` and calling `registerFullscreenMode(...)` (or export it and add to `BUILTIN_MODES`).
2. Add `import './<id>Mode';` to `modes/index.ts`.
3. That's it — the toolbar (`listFullscreenModes()`), the store (`geom` is a `string` mode id), export (`{stem}-{id}.png`), split, and the dither tail all pick it up.

### The three faces a mode declares
- **(a) params** — `paramFields: FullscreenParamField[]`: which **flat-optional** `GeometryParams` keys it reads, each with `{key,label,min,max,step,default}` (mirror `GEOM_DEFAULTS[key]`). The gate guarantees an omitted field renders byte-identically to its default.
- **(b) render** — exactly one `kind`:
  - `'cpuRaster'` → `raster(ctx) => Uint8ClampedArray`. **MUST stay pure + deterministic** (pinned by `test-palette-rampgeometry.mts`). The harness uploads it + presents through the dither tail. No RAF/DOM/side-effects.
  - `'glQuad'` → `fragBody` defining `vec3 modeColor(vec2 uv)` (+ optional `fragUniforms` decls, `uniformNames`, `setUniforms(gl, loc, ctx)`). The harness wraps it (preamble + `vec3 sampleLut(float t)` + dither tail), compiles once, renders a fullscreen quad. Read the gradient via `uLut` / `sampleLut`. **This is the path for Spline** (sdSegment over a control polyline → arc-length → `sampleLut`). The glQuad pipeline is proven in-tree (the cpuRaster blit IS a glQuad).
  - `'ownCanvas'` → the escape hatch: the mode mounts + drives its OWN canvas/renderer/RAF and bakes its own dither (include `DITHER_TAIL_GLSL` in its display shader). **This is the path for Liquify** (CPU mesh sim: MLS + XPBD + Taubin → vertex shader sampling the LUT) and likely **Parallax** (instanced sprites / ping-pong). The live `fractal` mode is the reference `ownCanvas`. NOTE: today the overlay hosts the single known ownCanvas mode (`fractal`) with its lifecycle inline + keyed on `kind === 'ownCanvas'`; a second ownCanvas mode needs the overlay to mount the mode's canvas/controls — coordinate that one overlay touch (it's the only non-additive spot).
- **(c) controls** — `Controls?: React.FC`: a **self-contained** panel reading ONLY the store + registry (see `RandomControls`). The overlay renders `activeMode.Controls` automatically.

### The render context (a mode reads colour ONLY from here, never the store)
`FullscreenModeContext = { ramp: RGB[256], lut: Uint8Array(1024), params: GeometryParams, width, height }`. The overlay RESOLVES the colour source: the open-time snapshot normally, or the **last-modified hero** (live) when split is on. Reading from `ctx` is what makes a mode work in both fullscreen and split unchanged.

### Frozen invariants
- `id` is stable (persisted in `fullscreenStore.geom`, used in export filenames). Don't rename a shipped id.
- `setUniforms` must NOT touch `RESERVED_UNIFORMS` (`uSrc uLut uResolution uBlueNoise uBlueNoiseRes uDither`).
- The shared dither is **static-tile TPDF blue-noise @ 1 LSB** at the fragment tail; every cpuRaster/glQuad mode inherits it (and it bakes into PNG export — same canvas, `preserveDrawingBuffer`). ownCanvas modes opt in via `DITHER_TAIL_GLSL`.
- The gate is **additive**: never change a `GEOM_DEFAULTS` value or make an existing field non-optional (it would break the byte-identical determinism pin).

### ⚠️ Splitscreen — built per USER definition, NOT the §2.5 / SOTA A/B shader-wipe
The user (twice, explicitly) redefined splitscreen: **the full app stays on TOP; the fullscreen preview docks on the BOTTOM**, with a draggable horizontal divider, and **the preview live-follows the colour of the last-modified hero**. So splitscreen shipped as a **presentation/layout toggle on the overlay** (not an in-quad A/B wipe mode): `fullscreenStore.split` + `splitY`, a WAI-ARIA `role="slider"` divider (oversized hit-strip, pointer-capture full-window drag, ↑/↓ keys), and the colour source switching to `useActiveHeroSelection()` while split is on. The docked pane renders whatever mode is active **through the compositor** (so it still exercises + proves the seam end-to-end + dither + export). The §2.5 two-canvas plan and the "Researched best-in-class … Splitscreen" A/B-wipe entry above are **superseded** by this for v2. Export = the live preview pane as `{stem}-split.png` (the app DOM above can't be rasterised into the composite).
