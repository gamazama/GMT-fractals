# UI perf — session handoff

**Last updated:** 2026-05-03 by the UI-perf framework session.
**Status:** Bench framework extended for UI-perf work (per-area React
attribution, GPU draw / RT counters, baseline auto-diff). First findings
documented below.

**Previous shader-perf sessions** (1–4, ending 2026-05-02) shipped GPU
shader optimizations and authored the methodology now applied to UI work.
Their handoff content is preserved below the new section.

This doc captures what the shader-perf work learned that's relevant to
UI-perf work, points you at the right tools, and flags known issues we
saw but didn't fix.

---

## Current bench capabilities (post 2026-05-03 framework session)

`debug/bench-perf.mts` — full-pipeline bench. Six scenarios (orbit, slider,
idle, mutation, stress-orbit, stress-slider) at pinned 1920×1080, 3 runs
each, ~95s total. Run via:

```
npm run bench:perf              # vite already up on :3400
npm run bench:perf:with-server  # spawns vite for the run
npm run bench:perf:gate         # exit 2 on regression vs baseline
```

Outputs `debug/bench-perf-latest.json` + timestamped archive +
`debug/bench-perf-baseline.json` (when overwritten manually).

### Per-area React attribution
12 `<BenchProfiler>` boundaries are wrapped around major chrome regions
in `app-gmt/AppGmt.tsx`: TopBarHost, Dock:left, Dock:right, R3FCanvas,
GmtNavigationHud:top, GmtNavigationHud:bottom, HudHost:top, HudHost:bottom,
DomOverlays, TimelineHost, FloatingPanel:*, FormulaWorkshop. The wrapper
(`engine-gmt/utils/BenchProfiler.tsx`) is zero-overhead in normal runs —
it only attaches `<React.Profiler>` when `window.__bench.onRender` is
present (set by the bench's init script before React mounts).

Per-scenario console output shows top-3 hotspots inline:

```
[bench] scenario: idle
  3/3 runs: wkrFps=60.0  main p5=59.5  notify=16  posts=240
    react: Dock:right 171.1ms/240c  TopBarHost 8.3ms/16c  DomOverlays 6.1ms/8c
```

End-of-run pivot table: per-id × per-scenario `totalActualMs / commitCount`.

### GPU draw / RT activity
`renderWorker.ts` instruments `readRenderTargetPixels` and `setRenderTarget`
calls plus snapshots `THREE.WebGLRenderer.info`, exposed via the new
`GET_RENDER_INFO` worker RPC and `WorkerProxy.getRenderInfo()`. The bench
brackets each scenario with two snapshots and emits the diff. Surfaced
as a `gpu:` line under each scenario:

```
    gpu: frames=494  draws=0 (0.0/f)  rtSwitch=908 (1.8/f)  readPx=28  tex=8 prog=3
```

Why these specific counters: drawCalls is the canonical "how much work"
metric, RT switches signal hidden extra passes (the user's "navigation
2nd render target" concern), readRenderTargetPixels is a known sync GPU
stall pattern.

### postMessage payload sampling
1-in-16 stringify-sample to estimate `workerPostBytes` per scenario
without the 0.5fps overhead the previous always-stringify approach hit.
Estimator: `avg(sampledBytes) × totalPostCount`.

### Auto-diff vs baseline
End-of-run diff against `debug/bench-perf-baseline.json`. Per-scenario
verdict (✓/WARN/FAIL) on each metric. Strict-zero tolerance for RT
switches and readPx (any increase is FAIL). Pass `--gate` to make
regressions exit non-zero (CI-friendly).

To save current as baseline:
```
cp debug/bench-perf-latest.json debug/bench-perf-baseline.json
```

`debug/bench-perf-baseline.json` is gitignored — keep it local per-machine.

### What's NOT instrumented (yet)
- Per-`setRenderTarget`-call origin labelling. Knowing `rtSwitch=1.8/f` is
  high but not which subsystem owns the second pass. Next move: a tiny
  push/pop label stack in renderWorker so each switch records its caller.
- React fiber-level attribution. Currently only 12 chrome-area boundaries.
  Drilling into AutoFeaturePanel internals would need either DevTools-
  hook injection or per-row Profilers — defer until the chrome cost is
  known.
- Worker GC pauses. `performance.memory` is main-thread-only.

---

## Resolved findings (2026-05-03 session)

After the framework session above, four candidate findings were chased
in a single sitting. Three resolved with measurable wins; one was
re-classified as "expected behavior, defer."

### Headline: convergence pass + Slider per-RAF re-render

These were the two big wins. Commits and bench numbers:

| Commit | Fix | Bench delta |
|---|---|---|
| `7a05b73` | Gate viewport convergence pass on RegionOverlay consumer flag | idle: rtSwitch -58, readPx -28, frames -29 |
| `405c2d8` | Narrow `useAnimationStore` subs in `useTrackAnimation` + `BaseVectorInput` | idle Dock:right: 173ms/240c → **13ms/8c** (-93%, -97%) |
| `46bf555` | Narrow AppGmt root subscription (defensive, no bench delta but architecturally cleaner) | — |

The convergence-gate fix: `engine/RenderPipeline.ts` ran a convergence
measurement every 8 accumulation samples (1 render + 2 setRenderTarget
swaps + 1 sync readPixels). The only consumer of the result is
`engine-gmt/components/viewport/RegionOverlay.tsx`. When no region is
drawn, the work was discarded. Now gated behind a worker flag toggled
on RegionOverlay mount/unmount via a new `SET_CONVERGENCE_NEEDED`
message.

The re-render fix: `useTrackAnimation` and `BaseVectorInput` were
destructuring `useAnimationStore()` (full-store sub). Probe revealed
**~60 no-op `set()` calls per second on animationStore** from somewhere
in the engine (values equal to previous, but Zustand still notifies).
With the full sub, every Slider and Vec input in every mounted panel
re-rendered 60×/sec — Formula panel mounts ~10 of these → 240 commits
per 4s idle. Narrow per-field subs (`sequence`/`currentFrame`/`isRecording`
only, actions via `getState()`) drops it to 8/scenario.

### Re-classified: rtSwitch=1.8/f was structural, not a navigation issue

The original "2nd render targets in navigation" hint was a misread of
the bench output. Confirmed by per-scenario decomposition: idle, orbit,
and stress-orbit all show the same 1.8 rtSwitch/render rate, which is
the structural cost of Three.js' internal `setRenderTarget` calls during
each `renderer.render()` plus our explicit canvas bind in
`handleRenderTick.ts:135`. The 0.8 *extra* switches above the structural
1.0 came from the convergence pass — fixed by `7a05b73`. Post-fix:
~1.5/render, which matches the structural floor.

### Deferred: TopBar / DomOverlays per-slider-step cost

Both commit ~125 times during the slider scenario (matching the 120
`setQuality` calls + a handful of incidentals). Per-commit cost
~0.8ms. Total ~100ms over a 4s heavy-drag scenario.

This is the "real cost of actual user input" rather than a bug.
PauseControls subscribes to `accumulationCount`, which gets reset on
every `setQuality` (via the RESET_ACCUM event), so it re-renders once
per slider step. Could be eliminated with stricter memoization or by
narrowing PauseControls' display to only the values that actually
change visibly per step. Left as a future follow-up — the cost only
shows up during heavy interaction and isn't catastrophic.

### Open follow-up: root cause of the 60Hz no-op `set()` calls

Probe (`debug/probe-fpw.mts`, since deleted) showed all 240 anim-store
notifications per 4s idle were no-ops — Zustand fired but no field
value actually changed. The calls don't go through
`useAnimationStore.setState`, so they're slice-bound `set` from a
closure. Likely candidate: a tick loop calling `seek`/`setIsScrubbing`/
`setCurrentFrame` without an equality gate. Hard to find without
per-action instrumentation.

The consumer-side narrowing (`405c2d8`) already neutralizes the React
impact, so this isn't urgent — but the calls still flow through
Zustand's notify pipeline (~240 fires per 4s of background subscriber
work). Worth a separate session.

---

## Initial findings (2026-05-03 baseline run)

Run on default scene (Mandelbulb), 1920×1080×1 DPR, headed Chrome,
Windows 10 / RTX 2070.

### Headline issue: Dock:right re-renders every RAF, even idle
- idle: **240 commits in 240 frames** → once per RAF. 171 ms total.
- slider: 240 commits, 266 ms.
- mutation: 240 commits, 251 ms.
- orbit / stress-orbit: 142 commits (lower because orbit tick rate is
  slower than RAF in stress).

`Dock.tsx` already uses granular Zustand selectors (each field one
`useEngineStore(s => s.X)`). The cost comes from the parent —
`AppGmt.tsx:94` does `const state = useEngineStore();` (full subscription)
which re-runs AppGmt on every store mutation, causing Dock's function
body to re-execute even though its selectors return stable values.

This matches the deferred item #2 from `project_appgmt_perf_bench.md`:
"AppGmt root narrow subscription via useShallow + getState() pass-throughs
— high variance; one orbit run rendered black canvas." The bench can now
*verify* the fix without that 4%-coverage regression slipping through —
coverage is already a captured metric.

### Confirmed: extra render-target switches per frame
`rtSwitch=1.8/f` at idle (60fps × 1.8 = 108 switches/sec). A bare app
should be ~1.0–1.5 (canvas + maybe one post pass). The 0.8 extra switches
are unaccounted. User's "2nd render targets in navigation" intuition was
correct.

Two known candidate causes (call sites grep'd):
1. `usePhysicsProbe.ts:130` — Direct mode reads from
   `pipeline.getPreviousRenderTarget()` then `readPixels`. Worker mode
   uses shadow state so this *shouldn't* fire in app-gmt.
2. `FractalEngine.ts:546` — `pipeline.readPixels` allocates a fresh
   `WebGLRenderTarget` per call.

Next move: label each `setRenderTarget` with its caller so the bench
can attribute the extra 0.8 switches/frame to one subsystem.

### readPx = 28 during idle scenario
Depth probe is reading 12% of frames even with no movement (idle
scenario is 240 RAFs of zero input, 28 readbacks). Worth checking
`usePhysicsProbe` debounce / change-detection logic.

### Slider/mutation panel cost
`TopBarHost` and `DomOverlays` both ~90 ms during slider/mutation, ~125
commits each (matches the per-step rate). Both subscribe to something
that ticks per slider step. Granular selector audit needed.

---

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
