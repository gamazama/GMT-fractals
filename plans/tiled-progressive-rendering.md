# Tiled Progressive Rendering — keeping the UI responsive while rendering

**Status:** design / for discussion (2026-06-15) — owner decisions folded in for §6 seed, §7 handoff, §9 stop.
**Problem owner:** perf — "UI unresponsive while the canvas renders expensive fractals (down to <1fps even switching tabs / scrolling)."

---

## 1. Goal & non-goals

**Goal.** When the scene is static (idle — most of the time), keep the UI at a user-chosen
frame rate while the fractal still converges to **full resolution and full quality**. No
quality sacrifice during idle — the idle convergence is the product.

**Mechanism.** Stop submitting one monolithic full-screen raymarch per frame. Instead, render
the screen in **horizontal bands, one band per displayed frame**, sized so each frame is a
short GPU submit the browser compositor can interleave UI paints between. The whole screen
advances **one sample at a time, uniformly** (coordinated accumulation), refining over ~0.5–2s.

**Non-goals.**
- Not touching the **interaction** path — the existing adaptive-resolution downscale during
  camera/param gestures already gives fast feedback and stays as-is.
- Not an automatic idle resolution drop (rejected — destroys idle quality, which is the point).
- Not fixing animation-playback/scrub main-thread jank (separate problem; out of scope).

---

## 2. Root cause recap (why this works)

Two confirmed causes (full diagnosis in memory `project_app_gmt_render_responsiveness`):

1. **No cost-driven quality fallback for non-interactive frames** — adaptive res is gated on
   interaction sessions only ([UniformManager.ts:149](../engine-gmt/engine/managers/UniformManager.ts#L149)),
   so an idle expensive scene renders full-cost forever.
2. **Each frame is one un-preemptible full-screen `drawArrays`** ([RenderPipeline.ts:661](../engine/RenderPipeline.ts#L661))
   into a float FBO. Rendering is on a worker (OffscreenCanvas — main thread does zero canvas
   paint), but the GPU is a single shared resource (one GPU process, ANGLE→D3D11 on Windows),
   so the long draw monopolizes the GPU command queue and the compositor that paints the React
   UI stalls behind it. Long enough → Windows 2s TDR watchdog → desktop freeze (already seen).

Tiling attacks #2 directly (bounded GPU submit per frame → compositor breathes, no TDR) and
makes #1 moot for idle (full res, just spread over time). Verdict from the main-thread audit:
GPU-starvation-dominated, **not** main-thread-CPU-bound — so chunking GPU work is the fix.

---

## 3. Architecture — three render modes

The worker already receives `interacting` (bool) and `isSceneAnimating` in `renderState`. Mode
selection per frame:

| Mode | When | How it renders |
|------|------|----------------|
| **Interaction** | a gesture is in flight (`interacting`) | full-screen, adaptive **low-res**, 1 sample, every tick — **unchanged** (existing path) |
| **Playback** | `isSceneAnimating` (timeline playing/scrubbing) | already routes to adaptive resolution (existing path, **unchanged**) — image changes every frame, cannot accumulate, so no tiling |
| **Idle** | static scene (`!interacting && !animating`), not converged | **NEW** — tiled progressive: one band per frame, full res, coordinated accumulation, until converged → stop |

Interaction & Playback share the existing full-frame path. Only **Idle** is new.

---

## 4. The accumulation scheme (the crux)

### 4.1 What exists today
- In-shader temporal averaging: `finalCol = mix(history, sample, uBlendFactor)`
  ([main.ts:88](../engine-gmt/shaders/chunks/main.ts#L88)), with `uBlendFactor = 1/accumulationCount`
  set CPU-side at [RenderPipeline.ts:633](../engine/RenderPipeline.ts#L633).
- `accumulationCount` is a **single global scalar**, incremented once per `render()`
  ([:629-631](../engine/RenderPipeline.ts#L629-L631)). It assumes every pixel of `history` holds
  the mean of the *same* N−1 samples.
- Ping-pong: write/read targets chosen by `writeIndex`, swapped after the draw ([:636-637, :671](../engine/RenderPipeline.ts#L636)).
- **Region copy-forward already in the shader** ([main.ts:77-80](../engine-gmt/shaders/chunks/main.ts#L77-L80)):
  pixels outside `uRegionMin/uRegionMax` do `pc_fragColor = history` and `return` **before** the
  expensive `traceScene`. So a region-masked draw (a) skips the cost outside the band and
  (b) copies history forward outside the band → **the buffer stays complete every frame**.

### 4.2 Why naive "scissor one band + keep global blend" breaks
If we render band-by-band but leave `blend = 1/accumulationCount` (incremented per frame):
when band *b* is drawn on global frame *f*, blend = 1/*f*, but band *b* has only been sampled
*k ≪ f* times. The new sample is weighted far too lightly → bands freeze near their first sample,
with per-band brightness discontinuities. The global counter cannot express "this band is on its
*k*-th sample." This is the failure to avoid.

### 4.3 The fix — pass-indexed blend + region copy-forward (no extra blit, no shader change)
Drive accumulation by a **whole-screen pass counter**, not a per-frame counter.

Worker-side scheduler state:
- `passIndex` — number of **complete** passes finished = samples every pixel has. Starts 0.
- `cursor` — how far the current pass has swept the screen (center-out).
- `bandRows` — band height this frame (controller output; §6).

Per idle frame, render **one contiguous band** = current region:
1. Set region uniforms: `uRegionMin = (0, y0)`, `uRegionMax = (1, y1)` for the band.
2. Set **blend override**: `blend = (passIndex === 0) ? 1.0 : 1.0 / (passIndex + 1)`.
   - First pass (passIndex 0): `1.0` → replace (band has no prior sample).
   - Later passes: `1/(passIndex+1)`, **constant for every band in the pass**, so when the
     cursor wraps, every pixel has received exactly its (passIndex+1)-th sample at the *same*
     weight → the global-mean invariant holds, **no seams**.
3. `pipeline.render()` in **tiled mode**: uses the blend override (not `1/accumulationCount`)
   and does **not** auto-increment `accumulationCount`. The shader does the rest — band pixels
   blend a fresh sample, everything else copies history forward → complete buffer, expensive
   work confined to the band.
4. Advance `cursor`. **On wrap:** `passIndex++`, set `accumulationCount = passIndex` (so the
   existing sample-cap auto-stop and convergence logic keep working in samples-per-pixel), and
   flag a bloom recompute (§8).

**Ping-pong is preserved as-is.** Each `render()` swaps `writeIndex`; because the shader copies
history forward outside the band, every swap produces a *complete* new buffer (full copy of the
prior frame + the one band updated). No separate copy-forward blit is needed — this is the key
simplification the shader's region path buys us.

### 4.4 Code touch-points for §4
- [RenderPipeline.ts:612-700](../engine/RenderPipeline.ts#L612) `render()`: add `_tiledMode` flag
  + `_blendOverride: number|null`; gate the `accumulationCount++` ([:628-631](../engine/RenderPipeline.ts#L628))
  and the blend ([:633](../engine/RenderPipeline.ts#L633)) on it: `const blend = this._blendOverride ?? (1/this.accumulationCount);`
- No shader change (`main.ts` region path already does copy-forward).
- `uRegionMin/uRegionMax` (`Uniforms.RegionMin/RegionMax`) already exist and are already read by
  the pipeline ([:692-695](../engine/RenderPipeline.ts#L692)) — the scheduler sets them per band.
- `setBucketScissor()` ([:592](../engine/RenderPipeline.ts#L592)) is **optional** here: the region
  path already skips the cost via early-`return`, but adding the scissor avoids even rasterizing
  the out-of-band fragments (saves the full-screen copy-forward cost). Start without it; add if
  the copy-forward overhead shows up. (If used, it must be set AFTER `setRenderTarget` per the
  invariant at [:597-603](../engine/RenderPipeline.ts#L597).)

### 4.5 Accumulation method: running-average (kept), not sum-and-divide

Came up in review (vs. a Redshift renderer dev): a classic path-tracer keeps an **fp32 sum** and
divides by pass count only at display; GMT keeps a **running mean** in the buffer
(`mix(history, sample, 1/(pass+1))`). Sum-and-divide is marginally more accurate at very high sample
counts (and for HDR outliers) — why offline renderers use it. **Not worth switching the live path:**
- GMT's live buffer is **fp32 (`THREE.FloatType`) by default** ([RenderPipeline.ts:300-302](../engine/RenderPipeline.ts#L300)),
  optional fp16 behind the `bufferPrecision` flag. In fp32 the running-mean's bias only appears at
  N ≈ 10⁶–10⁷ samples — far beyond any interactive count.
- Running-mean's advantage *for us*: **every intermediate buffer is a directly-displayable valid
  mean** → partial passes display correctly with no per-pixel count. Sum-and-divide needs a per-pixel
  sample count (or divide-by-pass + a frontier brightness seam mid-pass) — more surgery, worse for
  progressive display.
- One-line change for tiling (blend override) vs. additive shader + display-divide + count buffer.

So: keep fp32 running-average for the live/tiled path. Sum-and-divide stays the right tool for the
**offline/final-quality** path (bucket/export); unifying the viewport toward it is a possible future
step, orthogonal to responsiveness. (fp16 buffer mode degrades the running-mean earlier — but a sum
in fp16 is worse; that mode is preview-grade by design.)

---

## 5. The worker loop / scheduler

### 5.1 Today
Main thread posts `RENDER_TICK` every rAF; worker buffers the latest and self-paces via a
`MessageChannel` ping ([renderWorker.ts:270-283, :394-416](../engine-gmt/engine/worker/renderWorker.ts#L270)).
One tick → one full-screen sample in `handleRenderTick` ([handleRenderTick.ts:109](../engine-gmt/engine/worker/handleRenderTick.ts#L109)).
There is no worker rAF.

### 5.2 Target — worker-owned idle loop (vsync back-pressure)
- **Interaction/Playback:** unchanged — main-thread tick → full-frame low-res render.
- **Idle:** when a state-change tick settles into a static scene, the worker enters a
  self-driven **`self.requestAnimationFrame`** loop. Each rAF:
  1. render one band (§4.3), advance cursor/passIndex,
  2. recompute bloom only if a pass just completed (§8),
  3. blit + `gl.flush()`,
  4. if not converged, schedule the next rAF; if converged, **stop** (cancel rAF — no GPU work
     while fully converged; today the app keeps rendering — this is a battery/thermal win).
- **Interruption:** any new `RENDER_TICK` carrying a camera/param change cancels the idle loop,
  resets accumulation (passIndex/cursor → 0, re-seed §7), and the next frame re-selects mode.

Why worker rAF (not the MessageChannel pacing) for idle: rAF is vsync-gated, giving natural
back-pressure so we never queue GPU work faster than it drains (research-confirmed; avoids the
unbounded-queue failure mode). `gl.flush()` between frames encourages eager execution. Do **not**
use `desynchronized` for this path (tears / shows bands appearing one-by-one).

### 5.3 Fallback / interim
If worker-rAF start/stop coordination is fiddly, an interim is "one band per incoming main tick"
(reuse the existing `_tickChannel` pacing, no worker rAF). Simpler, but the main thread keeps
running its rAF during idle and back-pressure leans on the driver's command-buffer blocking.
Recommend going straight to worker rAF; keep this as the fallback.

---

## 6. Budget controller + FPS target slider

**Control signal = main-thread FPS** (it already measures rAF delta every 500ms at
[GmtRendererTickDriver.tsx:231](../engine-gmt/renderer/GmtRendererTickDriver.tsx#L231)). Main-thread
rAF cadence reflects compositor health — exactly the UI-smoothness we care about. The worker's own
GPU frame time is a poor signal (vsync hides headroom), so we drive off the main-thread FPS instead.

**Controller (AIMD).** The user sets a **target FPS**. The worker adjusts `bandRows`:
- main FPS **below** target → compositor is starving → **multiplicatively shrink** `bandRows`.
- main FPS **at** target with margin → **additively grow** `bandRows` (probe for more convergence
  throughput) until it nudges the FPS, then back off.
- clamp `bandRows ∈ [1 row, full screen]`; smooth over the 500ms FPS window.

**Initial band size — seed from existing data, not a blind default.** AdaptiveResolution already
keeps a full-res cost EMA (`fullResFrameMs`). Initial `bandRows ≈ clamp((targetFrameMs /
fullResFrameMs) × screenHeight)` — e.g. an 800ms full-screen cost with a 12ms budget → ~1.5% of
height (~16 rows at 1080p). Only on a true cold start (no cost history) fall back to a conservative
default; AIMD refines from the seed. This is the empirically-tuned part ("see how it feels") —
expect to iterate on the seed and AIMD constants once it's running.

**FPS target slider (new control).** Lives in the quality feature
([engine-gmt/features/quality.ts](../engine-gmt/features/quality.ts), alongside `adaptiveTarget`/
`dynamicScaling`), flows to the worker via the `renderState.quality` block that already ships each
tick. Semantics for users: *"keep the UI at ≥ N fps; spend the rest of the GPU converging the
image."* Higher = smoother UI, slower convergence. Lower = faster convergence, less smooth.
- Proposed range 30–120, **default 60**. (Open: §13.3.)
- It governs the **idle** controller. Interaction keeps its own `adaptiveTarget`.

---

## 7. First-pass coherence / interaction→idle handoff

**Decided (owner):** the seed is **display-only — never blended into the accumulation buffer.**
The accumulation buffer always holds pure full-res samples; a low-res seed must never contaminate
the converged image.

- **No-resize case** (cheap scene, or interaction didn't downscale): the accumulation buffer
  already retains the last full-res image (reset fires only on resize), so idle tiling just keeps
  refining it and the display shows it throughout — **already works, nothing to build.** (This is
  the existing "leaves the last image on screen if not resized" behavior.)
- **Resize case** (interaction downscaled, so the low-res→full-res handoff resizes + clears the
  buffer): retain the **last displayed frame in a separate texture** (upscaled) and have the
  display blit composite it for the regions the current pass hasn't covered yet. The accumulation
  buffer fills with pure full-res samples underneath; once pass 0 reaches full coverage the seed
  texture is unused. Screen never flashes black, and the seed stays strictly in the display layer,
  out of accumulation. This just extends the existing retention across the one handoff resize.

---

## 8. Bloom & display timing

- **Display blit:** every frame (cheap). Buffer is always complete (§4.3) so the user sees
  smooth progressive refinement.
- **Bloom:** today ~19 draws per full frame ([handleRenderTick.ts:122-131](../engine-gmt/engine/worker/handleRenderTick.ts#L122)).
  Running it every *band* frame would multiply bloom cost by the band count and is unnecessary.
  **Gate bloom to pass boundaries** — recompute only when `cursor` wraps (a pass completed),
  cache its output, and the display blit uses the cached bloom between passes. Bloom then updates
  ~once per pass (~0.5–2s) — same total bloom work as one full frame today, and per-frame cost
  stays bounded to (one band raymarch + copy-forward + blit).

---

## 9. Reset, convergence, stop

- **Reset triggers** (camera nudge, param change, RESIZE size-change, OFFSET_SET) already call
  `engine.resetAccumulation()` ([renderWorker.ts:358, :419, :426](../engine-gmt/engine/worker/renderWorker.ts#L358)).
  The scheduler must reset on the same signal: `passIndex=0`, `cursor=0`, re-seed (§7).
- **Stop = the user-set sample cap** (the existing "render N samples then stop"). When `passIndex`
  reaches the cap, **cancel the worker rAF loop entirely** — not just no-op `render()` as today
  ([RenderPipeline.ts:616](../engine/RenderPipeline.ts#L616)) — so the GPU actually goes idle
  (battery/thermal). The cap is now the load-bearing stop condition, so **harden + document it**
  (owner flagged it may need strengthening).
- **No per-frame convergence detection** — it costs an extra readback pass and runs bucket-only
  today ([RenderPipeline.ts:684](../engine/RenderPipeline.ts#L684)); not the focus, leave as-is.
- **No per-band convergence early-out** — heavy scenes converge fairly evenly across the frame, so
  skipping "cheap sky" bands saves little for the complexity. Skip it.
- *Later, optional (out of scope now):* a cleverly-timed occasional convergence check to early-stop
  when the user set the cap too high.
- **To verify in M2:** nothing assumes a continuously-running loop — depth readback
  ([handleRenderTick.ts:194](../engine-gmt/engine/worker/handleRenderTick.ts#L194)), overlays,
  gizmos should run on the last frame of a pass, not require a live render.

---

## 10. Reuse inventory

| Need | Reuse | Source |
|------|-------|--------|
| Band/region masking + copy-forward | **shader region path** (no change) | [main.ts:77-80](../engine-gmt/shaders/chunks/main.ts#L77) |
| Region uniforms | `uRegionMin/uRegionMax` already plumbed & read | [RenderPipeline.ts:692](../engine/RenderPipeline.ts#L692) |
| Optional cost clip | `setBucketScissor()` (post-setRenderTarget) | [RenderPipeline.ts:592](../engine/RenderPipeline.ts#L592) |
| Tile/band grid + center-out order | `BucketRunner` `startImageTile`/spiral | [engine/export/BucketRunner.ts](../engine/export/BucketRunner.ts) |
| Worker self-pacing pattern | `_tickChannel` scheduler | [renderWorker.ts:270](../engine-gmt/engine/worker/renderWorker.ts#L270) |
| FPS measurement | main-thread 500ms sampler | [GmtRendererTickDriver.tsx:231](../engine-gmt/renderer/GmtRendererTickDriver.tsx#L231) |
| Controller math (sqrt-ratio feedback) | `AdaptiveResolution` philosophy | [engine/AdaptiveResolution.ts](../engine/AdaptiveResolution.ts) |
| Settings flow | `quality` feature → `renderState.quality` | [engine-gmt/features/quality.ts](../engine-gmt/features/quality.ts) |

**Not reusable:** `BucketRenderer`'s *schedule* (converges each tile fully before moving on — the
opposite policy); the live path accumulates in the ping-pong target directly, no per-tile composite.

---

## 11. Phasing / milestones

1. **M1 — Pass-indexed blend in the pipeline.** Add `_tiledMode` + `_blendOverride` to
   `render()`; unit-prove the global-mean invariant holds rendering full-screen-as-one-band
   (should be byte-identical to today's accumulation). No loop change yet.
2. **M2 — Band scheduler, fixed band height, worker rAF idle loop.** One band per frame,
   center-out, pass-indexed blend, region copy-forward; stop on converge. Hardcode `bandRows`.
   Verify no seams, smooth UI, full-res convergence.
3. **M3 — Handoff seed** (§7) so there's no first-pass black sweep.
4. **M4 — Bloom at pass boundaries** (§8).
5. **M5 — FPS-target controller + slider** (§6). Wire the main-thread FPS feedback; expose the
   control.
6. **M6 — Convergence stop / battery** polish; optional 2D-tile fallback for deep zoom.

Each milestone is independently testable and visually verifiable.

---

## 12. Test plan
- `npm run test:baseline` / `test:hybrid` — accumulation math unchanged for full-frame mode (M1
  must be byte-identical with tiled mode off).
- `npm run test:render` (GPU, one canonical scene) — visual: no band seams, progressive refine,
  converged frame matches non-tiled reference.
- Manual: an expensive scene + scroll a list / switch tabs → UI stays at the FPS target; deep
  zoom → no TDR freeze; converged scene → GPU goes idle (no busy-render).

---

## 13. Open questions to discuss

1. ~~Handoff seed~~ **RESOLVED (§7):** display-only seed, never mixed into accumulation. No-resize
   case already works; resize case composites a retained display texture for uncovered regions
   during pass 0.
2. ~~Band order~~ **DECIDED:** expose as a user/perf **option** (center-out, top-down, …) — owner
   wants choices since order can carry perf implications.
3. **FPS-target slider:** default **60** (confirmed); range 30–120 (proposed); idle-only;
   per-device-remembered?; label wording — refine during M5.
4. ~~Convergence stop~~ **RESOLVED (§9):** stop on the user-set sample cap (cancel the rAF loop so
   the GPU idles); no per-frame/per-band convergence detection (costs extra, bucket-only today);
   harden + doc the cap. Residual check in M2: nothing assumes a continuously-running loop.
5. **Loop ownership:** decide empirically during M2 — worker-rAF idle loop vs one-band-per-main-tick
   interim, whichever is cleanest in the GMT worker architecture (owner: "see as we build").
6. **Deep zoom / extreme per-pixel cost:** when one row > budget, fall back to 2D tiles (region
   box already supports it) — v1 bands only, add 2D in M6 if needed.
7. ~~Playback~~ **RESOLVED:** playback already routes to adaptive resolution (which we're not
   touching), so it's handled — no tiling on playback. (Owner: revisit only if it "feels" wrong.)
8. **Bloom cadence:** acceptable that bloom/"final look" updates ~once per pass (~0.5–2s) during
   convergence rather than continuously?
