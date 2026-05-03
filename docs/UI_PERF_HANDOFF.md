# UI perf — session handoff

**Last updated:** 2026-05-03 by the shader-perf session (Sessions 1–4).
**Next session focus:** UI performance — React render cost, Zustand
subscriptions, worker round-trips, slider responsiveness, panel re-render
churn, R3F overlay tick cost.

This doc captures what the shader-perf work learned that's relevant to
UI-perf work, points you at the right tools, and flags known issues we
saw but didn't fix.

---

## Use the right bench tool

We had two perf benches in this codebase:

- `debug/bench-shader.mts` — **GPU-only** timing harness. Snapshots the
  live shader + uniforms, replays in a bare WebGL2 canvas, measures via
  `EXT_disjoint_timer_query_webgl2`. Strips React/Zustand/worker out of
  the picture so a regression here is unambiguously a shader change.
  **Not the right tool for UI work** — by design it cuts out everything
  you care about.

- `debug/bench-perf.mts` — **Full-pipeline** bench. Boots app-gmt in
  headless Chromium at pinned viewport/DPR, waits for a deterministic
  boot signal, runs frames through the real React + Zustand + worker
  + GPU stack. Measures bench-perf-relevant numbers (frame time,
  scripting time, paint time, etc.). **This is your tool.** Currently
  untracked at `debug/bench-perf.mts` — the user authored it and was
  iterating on it.

Coordination: both benches acquire `debug/.bench.lock` so they can't run
concurrently (helper at `debug/helpers/bench-lock.mts`). Polite-wait by
default.

---

## Methodology that worked for shader perf — applies directly here

The shader-perf sessions tried ~30 candidate optimizations and only ~6
landed. The methodology that saved us from chasing bad ideas:

1. **Measure first, code-read second.** Bench permutations of existing
   flags before changing any code. Build a cost-attribution table. Then
   you know *which file to read first* instead of letting code-reading
   bias you toward whatever happens to look ugly.

2. **Form a hypothesis about WHY a candidate should win on the actual
   stack** (not just "this looks slow"). For shader work the stack was
   ANGLE/D3D11/fxc; for UI it's React/V8/Chrome. The compiler/runtime
   does a LOT of work you don't see, and most "obviously slow" things
   are already optimized away. If you can't articulate why React/V8
   wouldn't already be doing this, drop the candidate.

3. **Bench-verify each candidate independently.** One change at a time,
   two-run average to filter noise. The bench's median is far more
   stable than mean — trust median deltas above ~0.5%, ignore below as
   noise.

4. **Revert on neutral.** Not "keep just in case." Actually revert. The
   code stays clean and the next reader trusts the file.

5. **Document what didn't work and why.** The graveyard of attempted
   optimizations is more valuable than the wins — it stops future
   sessions from re-exploring bad paths. We kept this discipline in
   `BENCH_SHADER_HANDOFF.md` and it paid off across 4 sessions.

6. **Pixel-perfect reference for correctness.** For shader work this
   was MAE 0.00 / max 5 against a locked PNG reference. For UI work the
   equivalent is "no visible regression in interaction feel" + "no
   broken renders" — harder to automate, but consider snapshotting
   panel layouts / interaction transcripts as references.

---

## Stack-specific lessons that DON'T generalize to UI

Most of what we learned was about the GLSL → ANGLE → HLSL → fxc → D3D11
shader compilation pipeline. **None of that matters for UI work.**

What DOES generalize is the meta-lesson: the runtime/compiler is much
smarter than your audit, so empirical bench beats reading code.

---

## GMT architecture for UI perf

The non-obvious bits to know:

### Engine-Bridge pattern
React state NEVER directly drives the render loop. `EngineBridge.tsx`
mediates between React (Zustand) and `engine/FractalEngine.ts`. State
flows: Zustand → EngineBridge → worker via RENDER_TICK messages → engine
tick. **Worker boundary is a serialization point** — Three.js Vector3 →
flat array, Matrix3 → `{mat3}`, Texture → `{__sampler}` sentinel. Every
slider drag flows through this serialization.

### Worker model
Rendering runs on a Web Worker with OffscreenCanvas. The main thread
never touches WebGL directly. Implication for UI perf: the React side
can't directly measure GPU time; you have to rely on `performance.now()`
deltas captured from worker postMessage timing or browser DevTools.

### DDFS (Data-Driven Feature System)
Features define their own state, UI params, and shader injection.
`AutoFeaturePanel.tsx` auto-generates UI from feature defs. This means:
- Adding a feature parameter → automatically gets a slider
- A feature's `mode: 'compile'` field controls whether changes trigger
  recompile (~10s) vs uniform update (instant)
- **A poorly-marked feature can cause a recompile on slider drag** —
  this is the worst UX bug class for this app

### Compile vs runtime updates
- `mode: 'compile'` features trigger shader rebuild via
  `CompileScheduler` → 2-10 seconds of waiting before result is visible
- `mode: 'runtime'` features just update a uniform → instantaneous
- **Hard rule from prior sessions: sliders MUST stay runtime.** A
  recompile on slider drag breaks artist UX. Recently-shipped session
  history strictly enforces this.

### TickRegistry
Phase-based tick orchestrator (SNAPSHOT → ANIMATE → OVERLAY → UI).
Don't bypass with ad-hoc useFrame hooks — that desyncs the worker.

---

## Recently-touched perf-relevant files

Worth knowing where work has happened:

- `app-gmt/AppGmt.tsx` — root component
- `engine-gmt/renderer/GmtRendererCanvas.tsx` — DOM canvas + DPR. **Has
  the 1278×718 fixed-resolution bug** (see Known Issues below)
- `engine-gmt/components/EngineBridge.tsx` — React↔engine mediator.
  Heavy traffic crossroad.
- `engine-gmt/components/WorkerTickScene.tsx` — R3F scene that runs
  the per-frame TickRegistry tick + sendRenderTick to worker. Per-frame
  work concentrated here.
- `engine-gmt/components/AutoFeaturePanel.tsx` — auto-generated panel UI
- `engine-gmt/engine/worker/WorkerProxy.ts` — worker proxy interface
- `engine-gmt/engine/worker/renderWorker.ts` — worker entry point
- `engine-gmt/engine/CompileScheduler.ts` — debounces shader recompiles
- `engine-gmt/store/engineStore.ts` — Zustand store; recent commits show
  ongoing subscription-narrowing work

The user's recent commits show explicit ongoing UI perf focus:
- `perf: HudOverlay self-subscribes; drop state/actions props`
- `perf: narrow DomOverlays store subscription per-overlay`
- `Decouple shared UI primitives from fractalStore via context`

So the user already has a thread on this. Pick it up.

---

## Known UI / perf-relevant issues we observed but didn't fix

### 1. Fixed-resolution mode reads CSS-measured size (1278×718 bug)
[GmtRendererCanvas.tsx:77-86](../engine-gmt/renderer/GmtRendererCanvas.tsx#L77-L86)

User asks for 1280×720 in fixed-resolution mode. The renderer measures
the container via `getBoundingClientRect()` then sets canvas.width to
`measuredWidth × dpr`. CSS layout drifts ~2 pixels (1px border / inset),
so you get 1278×718. **Bug:** in fixed-resolution mode, should use
`state.fixedResolution` directly, not the measured rect. The
ResizeObserver at line 118 makes the same mistake. ~30 min fix.

### 2. Bench harness silent-timeout-on-error pattern (now fixed)
The bench harness used to silently timeout 30s on shader compile errors
or page errors. We fixed this in `debug/bench-shader.mts` —
`captureLiveSnapshot` now dumps engine state + last 10 console messages
on boot timeout, and aborts immediately on fatal patterns (GLSL
compile errors, JS exceptions, module-load failures). **Same pattern is
worth applying to bench-perf.mts** if it has equivalent silent-timeout
behavior.

### 3. PT shader compile time is 10+ seconds
Not strictly a UI bug, but: switching render mode (Direct ↔
PathTracing) blocks the user for 10s+ while fxc compiles. The compile
is fully on the worker side; main thread isn't blocked, but the user
sees no result. UI feedback during compile is via the
`is_compiling` event. Worth checking that the indicator is responsive
and informative during this wait.

### 4. PNG metadata embedding works
We added `tEXt` chunk embedding in bench output PNGs (perf numbers,
shader hash, timestamp, scene config visible via `exiftool image.png`).
Useful pattern if UI bench wants to embed run metadata in screenshots.

---

## Useful tools shipped this session

All under `debug/`:

- `bench-shader.mts` — GPU-only shader bench. Has `--scene=<gmf-path>`
  flag for loading saved GMF scenes, plus `--render-mode`,
  `--pt-bounces`, `--pt-area-lights`, `--pt-nee-all`, `--pt-env-nee`,
  `--reflection-mode`, `--material`, `--no-shadows`, `--no-env`,
  `--app-timeout`. Comprehensive scene-config matrix in the bench.
- `helpers/image-diff.mts` — pixel MAE/RMSE/maxErr between N PNGs via
  headless Playwright canvas. Used to verify patches are bias-neutral
  when the bench's auto-diff is skipped (PT scenes have no locked
  reference). **Useful for UI work** to compare before/after panel
  layout screenshots or interaction sequence captures.
- `helpers/bench-lock.mts` — cross-process bench mutex. Both benches
  use this to avoid concurrent runs.

---

## Likely UI perf hotspots to investigate first

Educated guesses based on architecture:

1. **Slider drag responsiveness.** Does dragging a runtime slider stay
   smooth (~16ms/frame) or does the engine re-tick at every state
   update? Likely candidate: subscription granularity in EngineBridge
   or WorkerTickScene.

2. **Panel re-render churn.** `AutoFeaturePanel` may re-render the
   whole tree on any feature state change. React DevTools profiler
   would show this in seconds.

3. **Worker round-trip per frame.** RENDER_TICK message has full state
   serialization. Big state = big serialize cost. Bench it: how many
   bytes does a single message marshal?

4. **R3F per-frame overhead.** The R3F overlay does its own scene
   render on top of the worker output. Could be cheap or expensive
   depending on what's in it.

5. **Initial boot time.** From "click app-gmt.html" to "first painted
   frame" — Vite HMR + TS compile + Zustand init + worker spawn +
   first shader compile. Probably 3-5 seconds. Splitting the critical
   path could feel like a major win.

6. **DOM overlay paint cost.** Lots of HUD/overlays drawing on top of
   the canvas. Each one is a React tree. Recent commits suggest the
   user has been narrowing these subscriptions — may already be in
   good shape.

---

## User collaboration patterns (worth carrying forward)

What worked across the shader-perf sessions:

- **Numbered plans before implementation.** User prefers seeing the
  shape of the work before code lands. Especially for multi-step
  changes.
- **Two-run bench averages, image diffs, eyeball verification.** User
  visually validates changes themselves; don't burn time on screenshot
  smoke automation.
- **Real algorithmic improvements over knob-tuning.** When a candidate
  is "lower the threshold from X to Y" the user prefers to skip it.
  When it's "the existing math has a bug / a better formulation /
  removes redundant work" → ship it.
- **Honest reverts.** "I tried this, it didn't move the bench, here's
  why" is much better received than "let me ship it just in case."
- **User catches mistakes.** Even when given autonomy, they're watching.
  This session: caught my wrong claim about metallic uniforms, caught
  the no-area-light-reflections issue with my mirror override. Trust
  but verify cuts both ways — they verify too.
- **Autonomy when framed.** "Take the lead, I'll watch if anything is
  going wrong" → no approval gates needed. But unprompted, default to
  small confirm-before-commit.

---

## Reference docs in this codebase

- `docs/BENCH_SHADER_HANDOFF.md` — the model handoff doc. Style: full
  procedure, what worked, what didn't, lessons distilled. Worth reading
  even though it's GPU-perf not UI-perf — the methodology generalizes.
- `plans/area-lights.md` — example feature-plan style: phased,
  bench-verifiable per phase, with open questions and references.
- `CLAUDE.md` (in `stable/`) — project conventions, key files,
  architecture patterns. Read before changing core architecture.

---

## Summary

You inherit:
- A working full-pipeline bench (`bench-perf.mts`)
- Documented methodology that survived 4 sessions of shader-perf work
- A specific known UI bug to fix as a warm-up (1278×718 fixed-res)
- An architecture map of where UI/state/render flows cross
- A user who prefers measure-first, real-algo, honest-revert
  collaboration

Good hunting.
