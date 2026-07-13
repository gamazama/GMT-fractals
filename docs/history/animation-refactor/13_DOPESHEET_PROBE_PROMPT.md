# DopeSheet load probe — diagnostic

**Purpose:** before committing to a canvas DopeSheet rewrite, measure where the actual cost is at high keyframe counts. The graph editor work taught us two hard lessons: (a) intuition about cost location was wrong twice in a row before the canvas work succeeded, and (b) the metric you reach for first is often wrong — the canvas graph editor's win didn't show up in `Timeline:Graph` per-commit ms but did show up in `workerFps`, `longTaskTotalMs`, and `mainFps`. This probe captures dope-sheet costs with the same instrumentation that made the graph work readable, so the canvas DopeSheet implementation (planned in [`14_CANVAS_DOPESHEET_PROMPT.md`](./14_CANVAS_DOPESHEET_PROMPT.md)) targets the right thing.

**Status:** ready for fresh session. **Estimated effort:** half a day to a day.

**Outcome:** [`15_DOPESHEET_PROBE_FINDINGS.md`](./15_DOPESHEET_PROBE_FINDINGS.md) (does not yet exist). The findings either confirm the canvas-DopeSheet hypothesis (proceed to `14`) or redirect to a cheaper fix (engineStore narrowing for `useTrackAnimation`, throttled `TrackRow.tick`, etc.).

## The hypothesis being tested

At 9000+ keyframes spread across many tracks, the dope-sheet's user-visible lag comes from a **combination** of:

1. **DOM-per-keyframe rendering.** Every visible `<KeyframeDiamond>` is a React component that mounts/unmounts as the viewport shifts, plus registers/unregisters in the module-level `diamondState.diamonds` map. Per-scroll-tick churn is high.
2. **`TrackRow.tick` per-RAF walk of every visible diamond.** While paused, [`TrackRow.tsx:55-99`](dev/components/timeline/TrackRow.tsx#L55) iterates `diamondState.diamonds` and does a linear `keyframes.find` per playhead-aligned diamond + a `getLiveValue` (Bezier eval) per match. Cost scales with visible diamond count × playhead-adjacency.
3. **`liveValueState.displays` per-RAF iteration**, [`TrackRow.tsx:43-52`](dev/components/timeline/TrackRow.tsx#L43). Called every frame regardless of play state. Each entry does a `getLiveValue` (Bezier interpolation) + `innerText` write. Cost = O(visible track rows).
4. **React reconciliation per anim-notification** of the whole `<DopeSheet>` subtree, same as the `Timeline:Graph` problem documented in [`08_ENGINE_PROBE_FINDINGS.md`](./08_ENGINE_PROBE_FINDINGS.md). Not the dominant cost during graph-play (we proved), but might be different in dope-* scenarios where the React tree is heavier.

Canvas DopeSheet would eliminate (1), (2), and (3) entirely — same architecture as canvas GraphEditor. It would NOT eliminate (4); that's the deferred AnimationDocument work.

**The probe's job is to weigh those four against each other and tell us which dominate.**

## Read first

1. **[`08_ENGINE_PROBE_FINDINGS.md`](./08_ENGINE_PROBE_FINDINGS.md)** + **[`11_CANVAS_GRAPH_REPORT.md`](./11_CANVAS_GRAPH_REPORT.md)** — the prior probe + canvas work. Particularly the "metric trap" lesson (per-commit ms vs longTasks vs workerFps).
2. **[`01_AUDIT.md`](./01_AUDIT.md)** §1, §2, §8 — the dopesheet-specific cost descriptions (DopeSheet, TrackRow, KeyframeDiamond, `TrackRow.tick`, viewport-virtualisation churn).
3. **The code under test:**
   - `dev/components/timeline/DopeSheet.tsx` (~499 lines)
   - `dev/components/timeline/TrackRow.tsx` (~316 lines) — note the module-level `diamondState`, `groupDiamondState`, `liveValueState` maps + the `tick()` function (already wired into the engine's tick driver, see `engine-gmt/renderer/GmtRendererTickDriver.tsx`).
   - `dev/components/timeline/TrackGroup.tsx` (~171 lines)
   - `dev/hooks/useDopeSheetInteraction.ts` (~530 lines) — interactions (drag, marquee, transform).
4. **`dev/debug/bench-perf-timeline.mts`** — bench harness, post `f331a96` so per-commit median ms is available.
5. **`dev/debug/canvas-graph-heavy-after-step4.json`** — most recent baseline; the comparable post-canvas-graph state.

## Protocol

### Step 1 — Worktree

```
git worktree add ../dev-probe-dopesheet probe/dopesheet
cd ../dev-probe-dopesheet
```

### Step 2 — Capture baseline at the heavy seed used for graph editor

The default bench seed is 882 keys, too small to make dope-sheet costs dominant. Reuse the 9000-key heavy seed pattern from the canvas graph work.

```
npx tsx debug/runWithServer.mts -- npx tsx debug/bench-perf-timeline.mts --heavy
cp debug/bench-perf-timeline-latest.json debug/dopesheet-probe-baseline.json
```

If `--heavy` flag isn't wired into `bench-perf-timeline.mts`, look for `HEAVY_SEED_FRAMES` (line ~55) and force its use for this probe — either via an env var or by temporarily flipping the default. Document whichever path you take so the post-canvas comparison is apples-to-apples.

### Step 3 — Read the four dope-* scenarios

Focus on these four (ignore graph-* — those landed already):

- `dope-idle` — view mounted, nothing happening. Should be cheap; if it's not, something is firing per-RAF without reason.
- `dope-scrub` — drag the playhead end-to-end. The hot scenario for `TrackRow.tick`'s diamond dirty-state check.
- `dope-zoom` — wheel zoom in/out. Heavy mount/unmount churn as the visible window changes.
- `dope-play` — 4 seconds of playback. Should be largely vsync-bound today (probe will confirm).

For each, capture:

- `frameDts` p50 / p5 / max → tells you what the user feels.
- `workerFps` → tells you whether render is keeping up.
- `mainFps` p50 / p5 → tells you whether the main thread is keeping up.
- `longTaskCount` / `longTaskTotalMs` → tells you whether anything is blocking past 50 ms.
- React Profiler top-5 by `medianMs` per commit AND by `totalActualMs`:
  - `Timeline:DopeSheet`
  - `Timeline:TrackGroup` (if present)
  - `Timeline:TrackRow` (if present)
  - `Item:widget:formula-params` (sanity: should match the graph-play behaviour)
  - Any others above 1 ms median.
- Bench output for the `TrackRow.tick` work specifically — if it's not visible in any Profiler boundary (it isn't React; it's a TickRegistry consumer), instrument it via `window.__trackRowTickStats` for the probe. Pattern below.

### Step 4 — Spot-instrument `TrackRow.tick` and per-RAF callbacks

Add a per-iteration counter to `TrackRow.tsx`'s `tick()` to measure the loop cost separately from React reconciliation. Throwaway instrumentation — strip before commit.

```ts
// in TrackRow.tsx tick(), at top:
if (typeof window !== 'undefined') {
  const stats = ((window as any).__trackRowTickStats ||= { calls: 0, totalMs: 0, displayLoopMs: 0, diamondLoopMs: 0 });
  stats.calls++;
  // ... wrap the displays loop and the diamonds loop with performance.now() deltas.
  // Push totals into stats so the bench can read them at scenario end.
}
```

Add a hook in `bench-perf-timeline.mts`'s scenario-end snapshot to capture `window.__trackRowTickStats` per scenario into the persisted JSON.

This gives you a fourth metric beyond what the bench already shows: imperative per-RAF cost outside the React reconciliation framework.

### Step 5 — Categorise the cost

After capturing, attribute the dope-* time across these buckets:

| Bucket | How to read it |
|---|---|
| **Mount/unmount churn** | `dope-zoom`'s React Profiler shows committed components rising/falling; component count delta during zoom. |
| **`TrackRow.tick` imperative cost** | `__trackRowTickStats.diamondLoopMs` + `displayLoopMs` per scenario. |
| **React reconciliation fanout** | `Item:*` profilers committing at anim-notification rate (~480/4s) with non-trivial `medianMs`. |
| **Paint + layout** | `longTaskTotalMs` non-zero in any dope-* scenario; or `mainFps p5` below 30 fps. |

The pattern that justifies canvas DopeSheet is: **non-trivial mount/unmount churn during zoom AND non-trivial `TrackRow.tick` imperative cost AND visible long tasks in scrub/play**. Two out of three is still strong; one out of three suggests a narrower fix.

### Step 6 — Decide

**Strong case for canvas DopeSheet** (proceed to `14_CANVAS_DOPESHEET_PROMPT.md`):
- `dope-zoom` has visible mount/unmount churn (component count fluctuates >50 per zoom tick).
- `__trackRowTickStats.diamondLoopMs` is non-trivial (>2 ms per RAF when paused with many diamonds visible).
- `dope-scrub` shows `longTaskTotalMs` > 100 ms or `mainFps p5` < 50 fps.

**Partial case** (canvas DopeSheet still right but lower priority):
- Mount/unmount churn present but small; `TrackRow.tick` is the dominant cost.
- → Implement just the `TrackRow.tick` displacement: have the bench wire show whether replacing the imperative tick with a sparse per-track subscription (similar to `useTrackKeyframes` from the spike, except aimed at the dirty-state diamonds rather than at `useTrackAnimation`) recovers most of the win.

**Weak case** (canvas DopeSheet has small ROI; don't ship):
- All dope-* scenarios already at vsync, no long tasks, `TrackRow.tick` < 0.5 ms.
- → The lag the user feels isn't in the dope sheet; investigate elsewhere.

### Step 7 — Findings doc

Write `15_DOPESHEET_PROBE_FINDINGS.md` adjacent. Sections:

1. **Result line:** "Canvas DopeSheet justified — strong case." / "Partial case — TrackRow.tick is the dominant cost." / "Weak case — investigate elsewhere."
2. **Bench delta from canvas-graph baseline to probe baseline** for each dope-* scenario.
3. **`__trackRowTickStats`** per scenario (displays loop + diamonds loop) in milliseconds.
4. **React Profiler top-5 by medianMs** for each dope-* scenario.
5. **Component mount/unmount** observation during dope-zoom (counts or qualitative).
6. **Recommendation:** if strong case, sign off `14_CANVAS_DOPESHEET_PROMPT.md` to start. If partial, scope the smaller fix and skip `14` for now. If weak, redirect.
7. **Worktree cleanup status.**

### Step 8 — Cleanup

Strip the throwaway instrumentation. Land findings + bench artefacts on `dev`; probe branch is throwaway.

## Out of scope

- Implementing the canvas DopeSheet (that's `14`).
- Implementing the TrackRow.tick replacement (decide first, then plan).
- Anything touching the graph editor (it shipped, leave it alone).
- AnimationDocument refactor (deferred).
- Engine-store narrowing (probed; produces no signal in isolation).

## Pause points

- **After Step 3 (baseline captured).** Confirm the numbers match expectations before going deeper. If dope-* is already at vsync, the rest of the probe is largely confirming a null result; flag and discuss before instrumenting Step 4.
- **After Step 4 (TrackRow.tick instrumented).** Review the imperative cost numbers before writing the categorisation in Step 5. The instrumentation is throwaway and if the numbers are obviously decisive, the categorisation is straightforward.

## Pre-flight

- [ ] On `dev` HEAD with no local WIP.
- [ ] Canvas graph editor work in place (commit `e1b8699` or later — the polyline cache fix from `b667cfe` should be present).
- [ ] Bench seed cache exists; force-heavy seed path identified.
- [ ] `npm run typecheck` passes.

## Why I think this probe will return "strong case"

(Not part of the protocol — write your own conclusion. This is for context only.)

The graph editor canvas work's win was in `workerFps` / `longTasks` / `mainFps`, not in `Timeline:Graph` per-commit ms. That win came from removing one specific kind of per-frame main-thread cost (heavy canvas paint). The dope sheet has *more* sources of per-frame main-thread cost than the graph editor did:

- Graph editor: one big drawGraph call, eliminated by the cache → win.
- Dope sheet: many small DOM operations (mount/unmount of KeyframeDiamonds during scroll, inline-style writes in TrackRow.tick, per-RAF text content writes for live values), plus React reconciliation across a wider component tree, plus the same anim-notification fanout we've already proven systemic.

The mount/unmount cost in particular doesn't appear in React Profiler boundaries the same way — it shows up as longTasks during scroll. So the probe needs to look at `longTaskTotalMs` during `dope-zoom` specifically.

If the probe returns "strong case" the canvas DopeSheet implementation should be a similar-shape effort to the canvas graph editor (~1-2 weeks) and produce a win in the same metrics.
