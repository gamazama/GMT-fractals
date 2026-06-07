# Scope: Fullscreen Gradient Overlay — v2 (parametric geometries, live preview, comparison)

> **Status:** DRAFT — autonomous overnight scoping probe; PENDING-HUMAN-REVIEW.
> **Date:** 2026-06-07
> **Goal:** Take the shipped S6 fullscreen gradient overlay (6 static geometry maps of the current
> ramp) and turn it into a richer "see your gradient as a surface" workspace: per-geometry
> parametric controls, more geometries, optionally a live/animated preview and a side-by-side
> comparison grid. This doc scopes the work, sizes it, and surfaces the decisions the probe cannot
> make alone.

---

## TL;DR

- **v2 is mostly additive over a clean core.** `rampGeometry.ts` is a pure, DOM-free, deterministic
  library (6 mappers + seeded PRNG) with a passing determinism contract. Most of v2 is "extend the
  pure switch + grow the toolbar", not a rewrite.
- **The highest-wow / lowest-cost first slice is per-geometry parametric controls** (radial centre,
  conic angle offset, S-curve shape, arch radius/width/position). These are currently hard-coded
  constants (`rampGeometry.ts:170-173`, radial norm `:167`, conic `:192-194`, scurve `:197`). The
  UI primitives already exist (`ScalarInput`, `DualAxisPad`, `usePrecisionTrackDrag`). **Effort S/M.**
- **The one real architecture decision is the `GeometryParams` shape.** Today it's stochastic-only
  `{ amount, seed }`. v2 needs a per-geometry tagged param set. Get this contract right once and
  every later geometry/control is a small addition. **Must preserve byte-identical determinism**
  (the test harness pins it).
- **Live/animated preview and comparison-grid are real but optional escalations** (M and M-L). They
  do not block the parametric slice and can be deferred or dropped.
- **The sequencing question is the sharp edge, not the code.** Fullscreen v2 collides with two
  in-flight streams: **P2 drag** (migrates the fullscreen well from frozen interface (b) HTML5
  drop-well → frozen interface (c) SendTarget) and the **live-fractal coloring mode** (adds a
  `'fractal'` GeometryId + a WebGL2 canvas branch into the same overlay). All three touch
  `FullscreenGradientOverlay.tsx`. v2 parametric controls can land **independently and first** if we
  accept a later re-touch when P2/live-fractal merge.
- **Named hazard:** S6 itself was once premature-merged on "concept ok" then backed out when
  runtime-broken (`execution-progress.md:447-452`). **Gates-green ≠ runtime-good for this overlay.**
  Every v2 slice needs a real visual smoke before it counts as done.

---

## 1. Current state (what S6 / fullscreen does today)

Shipped baseline (merged 94e8e5d; note re-merge/runtime caveat in §5).

- **Six static geometries**, selector order = `GEOMETRIES` array (`rampGeometry.ts:34`):
  Linear (horizontal sweep), Radial (corner→1, isotropic), Conic (atan2 angle 0–2π), Arched (curved
  band, hard-coded shape), S-curve (Perlin smootherstep on x), Randomized (seeded soft-disk field).
- **Pure render pipeline**: `renderStopsToRamp` (RGB[256]) → `sampleGeometry` (pos/cov float field)
  → `renderGeometry` (RGBA `Uint8ClampedArray`) → `ctx.putImageData`. No React/Canvas/THREE inside
  `rampGeometry.ts`.
- **Determinism contract**: `mulberry32` PRNG (`rampGeometry.ts:76-84`); same `(geom, params, seed,
  w, h, ramp)` → byte-identical output. Pinned by `debug/test-palette-rampgeometry.mts`.
- **Opening**: ⛶ button in `GeneratorStage.tsx` (~line 365) calls `openFullscreen(config,
  'Generated')`; also opens via the **'fullscreen' drop-well** (FAVIENT_DND_MIME, `readFavientDrag`,
  `FullscreenGradientOverlay.tsx:58-70`). Mounted as a portal from `GradientExplorerApp.tsx`.
- **State**: `fullscreenStore.ts` — transient `useSyncExternalStore`, NOT DDFS. Holds
  `open/config/name/geom/seed/amount`. Display-only snapshot; never writes back to the gradient.
  Resets to CLOSED on page reload.
- **Export**: synchronous `canvasToPngBlob` → `downloadBlob`, filename `stem-{geom}.png`
  (`SceneFormat.ts:129-155`). Esc closes.
- **Repaint**: `ResizeObserver` on stage repaints on resize + on geom/seed/amount change; canvas
  resized only on dimension change. Continuous geoms cap at 1440px, stochastic at 1024px.

**Key files:** `gradient-explorer/FullscreenGradientOverlay.tsx`,
`palette/core/rampGeometry.ts`, `palette/store/fullscreenStore.ts`,
`debug/test-palette-rampgeometry.mts`, `store/dropWellRegistry.ts`, `palette/core/favientDnd.ts`.

---

## 2. The v2 feature set

Each item: **what it is · precedent to consume · effort · risk.**

### 2.1 Per-geometry parametric controls  — **EFFORT S/M · the v1-of-v2 core**

**What:** expose the constants that are currently frozen.
- Radial: centre `(cx, cy)` instead of fixed corner→1 (`rampGeometry.ts:167,189`).
- Conic: angle offset (rotate the 0-point), maybe direction (`rampGeometry.ts:192-194`).
- S-curve: shape parameter — pick an easing or tune amplitude, vs fixed smootherstep
  (`rampGeometry.ts:197`).
- Arched: radius / width / vertical position (`archCy=1.35, archR=2.3, archHalfWidth=0.3,
  archSpan=1.15`, `rampGeometry.ts:170-173`).

**Precedent to consume:**
- `components/inputs/ScalarInput.tsx` (compact variant) + `usePrecisionTrackDrag.ts` — single scalars
  (radius, width, angle, amplitude). Shift ×10 / Alt ×0.1 already wired.
- `components/vector-input/DualAxisPad.tsx` — radial-centre 2-axis picker (X/Y offset from centre),
  proportional mode on middle-click.
- `components/vector-input/VectorInput.tsx::piMapping` — conic/arch angle as π-units / wrapped 0–2π.
- S-curve shape: `palette/core/easings.ts` (25 pure Penner curves) via the `EasingPicker.tsx`
  discrete-grid pattern is the cheapest; a smootherstep-amplitude slider is even cheaper; a custom
  Bézier editor has no precedent (avoid for v1).

**Risk:** LOW-MED. The real work is the `GeometryParams` type redesign (see §2.7) + threading
per-geom fields through `sampleGeometry`/`renderGeometry` + the toolbar showing controls
*conditionally per geometry*. Determinism test must gain cases for each new param. Toolbar real
estate grows — needs a tidy conditional layout (precedent: `EmbeddedColorPicker` responsive reflow,
S5).

### 2.2 New geometries: Diamond / Mirror / Bands / tiling — **EFFORT S each (mostly) · varies**

**What:** more mappers. Diamond (Chebyshev/L1 distance), Mirror (fold x at 0.5), Bands
(quantize/repeat position), tiling (modulo field).

**Precedent to consume:** `rampGeometry.ts` switch (`sampleGeometry`, lines ~184-214) — Diamond,
Mirror, Bands are small additions (one branch each, full coverage, pure). `GEOMETRIES` array insert
(`:34`) mirrors `EASING_NAMES`.

**Risk:** LOW for distance/fold/quantize geoms. **MED for tiling** — may need a different field
topology (repeated sub-domains) that doesn't fit the single pos/cov-per-pixel assumption cleanly;
assess before promising. Each new geom must be added to the determinism harness.

### 2.3 Live / animated preview — **EFFORT M · optional escalation**

**What:** time-driven motion (e.g. conic angle sweep, S-curve phase, random re-seed loop, ramp
phase scroll) with play/pause/scrub, instead of one-shot static paint.

**Precedent to consume:**
- `engine/TickRegistry.ts::registerTick` (ANIMATE phase) + `engine/plugins/RenderLoop.tsx` RAF
  driver — but note the **singleton-per-realm** constraint; a self-contained `requestAnimationFrame`
  loop mirroring the existing `paint()` closure is lighter and avoids coupling the overlay to the
  engine tick list.
- `components/timeline/TimelineToolbar.tsx` — play/pause/scrubber UI if a true timeline is wanted.
- `engine/components/modulation/LfoList.tsx::WaveformPreview` — if motion is LFO-driven rather than
  keyframed.
- `mulberry32` seeded curves for deterministic, loopable parameter animation.

**Risk:** MED. Determinism contract becomes time-parameterised (tests must pin frame N output).
Perf: animating one geom is cheap; animating the comparison grid every frame is not (see §2.5).
**Scope-creep magnet** — keep it to "animate the current geom's params", NOT a full keyframe system.
Explicitly DO NOT couple to `ChannelGraphEditor`/animation `animationStore` (too heavy, docs scoped
to animation).

### 2.4 Apply-to-content preview (gradient on a fractal/image) — **EFFORT M-L · overlaps live-fractal**

**What:** show the ramp coloring real content, not just an abstract 2D map.

**Precedent / coordination:** this is essentially the **live-fractal coloring mode**
(`plans/gx-live-fractal-coloring-scope.md`) — a `'fractal'` GeometryId + WebGL2 canvas branch +
`setGradientBuffer(rgba256)` seam (already byte-identical via `renderStopsToBuffer`). Do NOT build a
second apply-to-content path. **Treat this as out-of-scope for v2-proper and defer to the
live-fractal initiative**, coordinating insertion points (§5).

**Risk:** HIGH if duplicated. The live-fractal scope already owns 5 insertion points into this same
overlay and an unresolved snapshot-vs-live design tension (§3.4 of that doc).

### 2.5 Comparison / grid view — **EFFORT M · optional escalation**

**What:** tile all geometries (or several param variants) side-by-side, e.g. a 2×3 gallery, instead
of one-at-a-time.

**Precedent to consume:** `engine-gmt/.../FormulaPicker.tsx` (sidebar + grid + view toggle) or
`fluid-toy/components/PresetGrid.tsx` (2-col chip grid) for layout; core math is already pure so it's
N calls to `renderGeometry` tiled onto one canvas (or N small canvases).

**Risk:** MED. Static grid is fine. Grid + live animation = N× per-frame renders → needs
`OffscreenCanvas`/worker or render budgeting. Recommend **static grid only** if shipped, and never
combine with §2.3 in v1.

### 2.6 Zoom / pan — **EFFORT S/M · optional, low priority**

**What:** camera transform on the overlay canvas to inspect detail.

**Precedent to consume:** `palette/components/PickerWall.tsx` zoom/pan gestures (middle-drag zoom,
right-drag pan, scroll reset) — migrate the gesture math; apply as a CSS/canvas transform layer.

**Risk:** LOW-MED. For continuous geoms a transform is purely cosmetic (could just re-sample at a
sub-rect for true detail). Lowest user value of the set; defer.

### 2.7 Cross-cutting: the `GeometryParams` contract — **EFFORT S (design) · gates everything above**

**What:** today `GeometryParams = { amount: number; seed: number }` (stochastic-only). v2 needs a
per-geometry tagged/discriminated set, e.g. a base `{ amount; seed }` plus optional per-geom fields
(`radialCx, radialCy, conicAngleOffset, scurveShape, archCy, archR, archHalfWidth, archSpan`), read
by `sampleGeometry` per `geom`. Keep `fullscreenStore` shape extension transient/view-only — no DDFS,
no undo, no persistence.

**Precedent:** `GeometryParams` is already extensible by design (surveyor note); `EASING_NAMES`-style
ordered lists; `fullscreenStore` `useSyncExternalStore` extension.

**Risk:** MED — this is the one decision that, if rushed, forces a later rewrite. Must (a) not break
`renderGeometry`/`sampleGeometry` callers, (b) preserve byte-identical determinism, (c) keep
`rampGeometry.ts` DOM-free. **Do this design first, ratify, then build controls on top.**

---

## 3. Phasing proposal (no-throwaway, incremental)

Each phase ends with a **real visual smoke** (not just gates), per the S6 hazard.

- **Phase 0 — `GeometryParams` contract (S, design+plumbing).** Redesign the param type, thread it
  through `sampleGeometry`/`renderGeometry`, extend `fullscreenStore`, extend the determinism
  harness. No new UI yet; existing 6 geoms render identically. This is the foundation; everything
  else is additive on it.
- **Phase 1 — Parametric controls (S/M) — *the cheapest high-wow slice*.** Conditional toolbar
  controls per geometry (radial centre via DualAxisPad, conic angle, arch radius/width/pos, S-curve
  shape via easing picker). This alone transforms the overlay from "6 fixed pictures" to "an
  explorable surface". **Ship this first; it stands alone.**
- **Phase 2 — New geometries (S each).** Diamond, Mirror, Bands as pure switch additions + harness
  cases. Tiling only after topology assessment. Pure additive, no UI rework beyond a `GEOMETRIES`
  insert.
- **Phase 3 (optional) — Static comparison grid (M).** Tile geoms/variants. Layout from PresetGrid /
  FormulaPicker. Static only.
- **Phase 4 (optional) — Animated preview (M).** Self-contained RAF loop animating the current geom's
  params; play/pause; deterministic per-frame. NOT combined with the grid in this phase. NOT coupled
  to animationStore.
- **Deferred / coordinate elsewhere:** apply-to-content (= live-fractal initiative, §2.4); zoom-pan
  (§2.6, lowest value).

**Cheapest high-wow first slice = Phase 0 + Phase 1.** Everything after is genuinely optional and
non-throwaway.

---

## 4. Frozen-interface + integration impact (and sequencing)

Three streams touch `FullscreenGradientOverlay.tsx`. v2 must be sequenced against them.

### 4.1 Drop-well (b) → SendTarget (c) — P2 migration
- Today the overlay registers the **'fullscreen' well** via frozen interface **(b)** `DropWell`
  (`dropWellRegistry.ts`, accepts(types)/onDrop(dt)). **P2 migrates this to frozen interface (c)**
  `SendTarget<P>` with an **additive `getRect?(): DOMRect|null`** amendment for pointer hit-testing
  (`p2-drag-interaction-scope.md:262-270`).
- **v2 impact:** v2 parametric controls do NOT touch the well registration or the drag payload.
  `GeometryParams` extension is orthogonal to (b)/(c). So **v2 can land before P2** — but the
  *opening path* will be re-touched by P2. Low collision (different lines), but re-verify the open
  path after P2 merges.
- **(c)-amendment `getRect?` is "assumed ratified, not signed off"** — that's a P2 blocker, not a v2
  blocker. v2 does not depend on it.

### 4.2 Live-fractal coloring mode
- Adds a `'fractal'` `GeometryId` (`rampGeometry.ts:31` union), a WebGL2 canvas + RAF branch in the
  overlay paint, dual-canvas ResizeObserver sizing, and a PNG-export branch choosing the GL canvas.
- **v2 impact / collision:** **both v2 and live-fractal extend the `GeometryId` union and the geom
  switch, and both add geom-specific state.** This is the highest-collision pair. The `'fractal'`
  geom is special (it's a live renderer, not a pure mapper) so it sits *outside* the
  `GeometryParams` pure contract — which actually keeps them separable IF Phase 0's param design
  treats `'fractal'` as a non-pure escape hatch. Coordinate the union edit.

### 4.3 Sequencing recommendation
- **v2 Phase 0 + 1 can land independently and first.** They are additive to the pure library and the
  transient store; they don't depend on P2's drag kernel or live-fractal's GL canvas.
- **Accept one planned re-touch:** when P2 migrates the well and when live-fractal adds `'fractal'`,
  the overlay's open-path and union/switch get edited again. Design Phase 0's param union to leave
  room for a non-pure `'fractal'` member so live-fractal slots in without reshaping the contract.
- **Do not build apply-to-content inside v2** — it is the live-fractal initiative.

### 4.4 The runtime ≠ gates hazard (explicit)
S6 was premature-merged on "concept ok", then **backed out when runtime-broken**; integration branch
was at one point @ 96cfa51 with S6 removed; re-merge pending a runtime fix on `exec/s6-fullscreen @
3cfb400`, **completion/visual-confirm unknown** (`integration` / `execution-progress.md:447-452`).
**Action:** confirm the S6 re-merge is actually live and visually correct *before* starting v2 on top
of it. Every v2 phase gates on a real visual smoke, not just `test:palette-rampgeometry` green.

---

## 5. Decisions for the user (morning queue)

1. **Confirm S6 is actually live + visually correct on `integration` / dev** before any v2 work
   starts (runtime ≠ gates hazard, §4.4). Is the `3cfb400` re-merge done?
2. **Sequencing: v2 before or after P2 and live-fractal?** Probe recommends **v2 Phase 0+1 lands
   independently and first**, accepting one planned re-touch when P2 and live-fractal merge. Approve,
   or hold v2 until P2/live-fractal land to avoid the re-touch?
3. **Which geometries make v1-of-v2?** Probe recommends parametrizing the existing 6 (Phase 1) +
   adding Diamond/Mirror/Bands (Phase 2). Include tiling (needs topology assessment, may slip)? Any
   geometry you specifically want first?
4. **S-curve shape control style:** discrete easing-preset picker (cheapest, reuses `EasingPicker`),
   single smootherstep-amplitude slider (cheapest of all), or interactive Bézier editor (no
   precedent, more work)? Probe recommends easing-preset picker.
5. **Is animated preview in scope for v2?** (Phase 4, M, scope-creep risk.) If yes, constrain to
   "animate current geom's params only", not a keyframe timeline?
6. **Is the comparison/grid view in scope for v2?** (Phase 3, M.) Static-only if yes? It must never
   combine with animation in the same phase (perf).
7. **Apply-to-content / live-fractal:** confirm this stays owned by the live-fractal initiative and
   is OUT of v2 scope (avoids a duplicate apply path).

---

## 6. Open questions / unknowns (surveyor-flagged)

- **Intent of the existing geometries:** the math is documented but not the *why* — are these 6
  user-facing creative tools or internal diagnostics? Affects how much polish/parametrization each
  deserves.
- **Tiling topology:** does a tiling/repeat geometry fit the single pos/cov-per-pixel field, or does
  it need a structurally different sampler? Unassessed.
- **`getRect?` ratification (P2):** assumed ratified but not signed off — blocks P2's well migration,
  indirectly affects when v2's open path gets re-touched.
- **ImageStage coexistence (P2):** OS file-drag stays HTML5; in-app pointer drag is (c). When the
  fullscreen well migrates to (c), HTML5 file-drop and pointer-drag must be mutually exclusive by
  origin — no collision testing exists yet. Not v2-owned but shares the overlay.
- **Snapshot vs live ramp:** the overlay paints from a frozen config snapshot taken at open
  (`useMemo[fs.config]`); editing stops does NOT update the preview. v2 parametric controls inherit
  this — is "edit stops, see it live in fullscreen" expected for v2, or is re-open acceptable?
  (Shared tension with live-fractal §3.4.)
- **Perf ceiling for grid + animation:** no `OffscreenCanvas`/worker path for the overlay today;
  N-geom-per-frame would need one. Bounds whether Phase 3+4 can ever combine.
