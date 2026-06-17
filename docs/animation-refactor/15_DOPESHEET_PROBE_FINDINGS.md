# DopeSheet load probe — findings

**Status:** complete (2026-05-17)
**Probe branch:** `probe/dopesheet` in worktree `h:/GMT/workspace-gmt/dev-probe-dopesheet`
**Protocol followed:** [`13_DOPESHEET_PROBE_PROMPT.md`](./13_DOPESHEET_PROBE_PROMPT.md). The prompt's three guiding hypotheses turned out to be partly stale relative to the current codebase; the actual cost lives in adjacent channels. Both pause points were respected.
**Artefacts:** `debug/dopesheet-probe-baseline.json`, `debug/dopesheet-probe-instrumented.json`, plus the corresponding `.log` files capturing the full bench output.

## Result line

**Modified strong case for canvas DopeSheet.** The prompt's hypotheses don't map cleanly — two of three (mount/unmount churn during zoom, `TrackRow.tick` imperative cost) are falsified, the third (long tasks in scrub/play) is strongly confirmed. But the probe surfaced a fifth dimension the prompt didn't predict: **`dope-select-track` is catastrophic** (8 fps worker, 5 fps main, 137 ms per `Timeline:DopeSheet` commit caused by ~9000 `<KeyframeDiamond>` nodes reconciling on each selection change). That, combined with ~6050 ms of unaccounted-for long-task time during `dope-scrub` that we couldn't attribute to any React boundary or imperative tick, points at the **DOM-diamond count itself** as the load-bearing variable. Canvas DopeSheet eliminates the diamond DOM entirely and would fix both. Proceeding to [`14_CANVAS_DOPESHEET_PROMPT.md`](./14_CANVAS_DOPESHEET_PROMPT.md) is justified — with the explicit caveat that `dope-play` smoothness will only partially recover (the 3245 ms of React anim-notification fanout in play is the systemic `08`-doc problem; canvas DopeSheet won't touch it, AnimationDocument will).

## How the hypotheses landed

| Hypothesis (from prompt) | Result |
|---|---|
| 1. DOM mount/unmount churn during zoom | **Falsified** at 9000-key seed. `dope-zoom` at vsync, zero long tasks. |
| 2. `TrackRow.tick` per-RAF imperative cost | **Falsified** — `tick` is **dead code in dev**. Instrumentation counter (`__trackRowTickStats`) was never initialised in any scenario. No file imports the exported `tick`. Grep result inline below. |
| 3. `liveValueState.displays` per-RAF | **Falsified** — same `TrackRow.tick` path. |
| 4. React reconciliation per anim-notification | **Partly confirmed** — `dope-play` shows 3245 ms of React work distributed across `Dock:right` (757 ms), `Item:widget:formula-params` (398 ms), `TopBarHost` (478 ms), etc. This is *exactly* the systemic fanout documented in [`08_ENGINE_PROBE_FINDINGS.md`](./08_ENGINE_PROBE_FINDINGS.md), not a DopeSheet-specific cost. Canvas DopeSheet will not address it. |
| 5. **New:** per-selection DopeSheet reconciliation | **Strongly present.** `Timeline:DopeSheet` median = **137 ms/commit × 10 commits** during `dope-select-track`, lining up with `DopeSheet.tsx:39-44`'s own comment that "DopeSheet's render is ~135ms (it spits out ~9000 DOM diamonds)". |
| 6. **New:** browser layout/paint from 9000 DOM diamonds during scrub | **Implicated by elimination.** `dope-scrub` has 7034 ms of long-task time but only 985 ms of React work and 0 ms of `TrackRow.tick` work. The remaining ~6050 ms is non-attributable to any JS we measured. Most plausible: browser layout reflow from 9000 absolutely-positioned divs sharing a parent with the moving `PlayheadCursor`, compounded with whatever main-thread work `AnimationSystem.tick` does during `eng.scrub(f)` (not separately instrumented this probe). |

## Bench numbers (9000 keys / 6 tracks, heavy seed)

Two runs of the full bench. Numbers are median across 3 runs/scenario. Baseline run came first; instrumented run was the same harness with the `TrackRow.tick` instrumentation patched in. The two runs reproduce within noise (~5%), so they're treated as one baseline below.

| scenario | wkrFps | mainP5 | longTasks (ms) | React Σ (ms) | unaccounted (ms) | anim.notify | eng.notify |
|---|---:|---:|---:|---:|---:|---:|---:|
| dope-idle | 60 | 60 | 0 | 67 | — | 0 | 8 |
| **dope-scrub** | **16** | **15** | **119 (7099)** | 985 | **+6114** | 121 | 257 |
| dope-play | 26 | 15 | 31 (2012) | 3245 | (React > longTask) | 482 | 983 |
| dope-zoom | 55 | 58 | 0 | 63 | — | 0 | 9 |
| **dope-select-track** | **8** | **5** | 7 (1387) | 1987 | -600 | 7 | 3 |
| graph-idle | 60 | 60 | 0 | 60 | — | 0 | 8 |
| graph-scrub | 59 | 60 | 0 | — | — | 121 | 247 |
| graph-play | 40 | 30 | 0 | — | — | 480 | 973 |
| graph-zoom | 60 | 60 | 0 | — | — | 0 | 12 |
| graph-select-track | 60 | 60 | 0 | — | — | 7 | 0 |

The graph-* row block is included to verify the canvas-graph work is intact under the same heavy seed — it is.

## React Profiler attribution (median per-commit ms × commit count) — dope-* only

Only profilers with `medianMs > 0` or `totalActualMs > 1` listed.

### dope-scrub (135 anim-rate React commits over 7.3 s — bench's wall clock blew past the intended 4 s because of the lag)

| Profiler | medianMs | n commits | totalMs |
|---|---:|---:|---:|
| TimelineHost | 0.60 | 135 | 85.6 |
| **Timeline:DopeSheet** | **0.000** | 135 | 6.4 |
| Dock:right | 1.60 | 135 | 226.1 |
| Dock:right/PanelRouter:Formula | 1.40 | 135 | 194.0 |
| TopBarHost | 0.70 | 257 | 148.2 |
| Item:widget:formula-params | 0.90 | 135 | 119.0 |
| DomOverlays | 0.80 | 135 | 108.4 |

**Key observation: `Timeline:DopeSheet` medianMs is 0.0 during scrub.** The DopeSheet subtree itself is not rendering — its `React.memo` props don't change on `seek()`, and inner subscribers don't fire on `currentFrame`. The 985 ms of React work during scrub is entirely the systemic anim-notification fanout (`Dock:right`, `formula-params`, etc.) — **identical in shape to what `08_ENGINE_PROBE_FINDINGS.md` already documented for `graph-play`.**

### dope-play

| Profiler | medianMs | n | totalMs |
|---|---:|---:|---:|
| TimelineHost | 0.60 | 482 | 278.1 |
| Timeline:DopeSheet | 0.00 | 482 | 22.6 |
| Dock:right | 1.50 | 482 | 754.7 |
| Dock:right/PanelRouter:Formula | 1.30 | 482 | 644.7 |
| TopBarHost | 0.50 | 964 | 477.7 |
| Item:widget:formula-params | 0.80 | 482 | 397.7 |
| DomOverlays | 0.70 | 482 | 351.8 |

Same story: DopeSheet is free; cost is systemic fanout at anim-notification rate.

### dope-zoom (essentially idle from React's perspective)

| Profiler | medianMs | n | totalMs |
|---|---:|---:|---:|
| TimelineHost | 0.50 | 12 | 4.7 |
| Dock:right | 1.70 | 9 | 15.7 |

12 commits across a 4 s scenario = ~3 commits/sec. Zoom doesn't propagate enough state changes to trigger anim-rate fanout. Hypothesis 1 falsified.

### dope-select-track (the dramatic finding)

| Profiler | medianMs | n | totalMs |
|---|---:|---:|---:|
| **TimelineHost** | **138.1** | 10 | 987.4 |
| **Timeline:DopeSheet** | **137.4** | 10 | 980.4 |
| Dock:right | 1.70 | 3 | 5.0 |
| Item:widget:formula-params | 0.90 | 3 | 2.6 |

Per-selection cost: a single `setTrackSelection()` triggers one DopeSheet render at **137 ms**. With 6 tracks selected sequentially + 1 deselect = 7 expected commits (actual 10 — extra commits likely from the warm-up + cleanup). Math checks out: 9000 KeyframeDiamonds × ~15 µs reconciliation each ≈ 135 ms. This is the canonical reconciliation-scales-with-DOM-element-count problem.

## `__trackRowTickStats` (probe instrumentation)

```
{ undefined in every scenario }
```

`window.__trackRowTickStats` was never initialised, which means the `tick` export from `TrackRow.tsx` was never called. Grep confirms:

```
$ grep -rn "tick.*TrackRow\|TrackRow.*tick\|import.*tick.*from.*timeline" --include="*.ts" --include="*.tsx"
components/timeline/TrackGroup.tsx:118:    // Increase Z-Index to 30 to match TrackRow sticky header, …  (comment only)
```

No import of `tick` from `TrackRow`. `GmtRendererTickDriver.tsx:57` mentions `'trackRowTick' UI (features/animation/TrackRow)` in a Phase-C-shell comment but the registration is not present (commented out per the doc preamble).

Conclusion: **the dev fork has already removed the `TrackRow.tick` orchestration**. The `tick` function still exists in source but is unreachable. This invalidates `01_AUDIT.md` §2's named cost on `dev/` (it may still be present in the stable build — not verified). It also means the "Partial case" decision rule from the prompt is moot.

## Component mount/unmount observation during dope-zoom

Not directly instrumented, but inferred: `dope-zoom` shows only 9–12 React commits over 4 s, and zero long tasks. If the visible-slice churn from `TrackRow.tsx:229` were dominant, we'd see commit count tracking zoom-step count (`ZOOM_STEPS=60` × 2 = 120 wheel events) and non-zero long-task time. We see neither. Either:

- Wheel-zoom in the harness doesn't actually change `frameWidth` enough to flip many keyframes across the `visibleMinPx/visibleMaxPx` boundary per tick (the heavy seed packs 1500 frames into ~1.07 px/frame at fit-to-view, so a wheel-tick that nudges frameWidth by ~10% only shifts the boundary by ~1 frame's worth of keys), OR
- The binary-search virtualisation in `visibleSlice` is fast enough that re-running it per wheel-tick is cheap, AND React's reconciliation of the resulting near-identical key set is cheap too.

Either way, `dope-zoom` is not load-bearing at this seed. **Hypothesis 1 falsified.**

## What we *didn't* measure

The 6050 ms of unaccounted-for `dope-scrub` long-task time is the biggest open question. Plausible attributions:

1. **Browser layout reflow** from `PlayheadCursor`'s `currentFrame` change re-laying-out the dope-sheet's overflow container, with 9000 absolutely-positioned diamond children participating in the layout pass. Each `seek()` fires `scroll` and `scrollLeft` updates downstream of `useEffect` reactions. Empirical hand-wave fits.
2. **`AnimationSystem.tick`** evaluating 9000 keyframes through binders on each `eng.scrub(f)` call. Not instrumented this probe.
3. **Worker postMessage** — `dope-scrub` issues 598 posts over 7 s = 85/sec, which is high. Each post may be serialising a non-trivial uniform map.

The probe didn't separate these. The next bench enhancement worth queueing is **`performance.measure()` instrumentation in `AnimationSystem.tick`** so `eng.scrub`'s share of main-thread time becomes attributable. Trivial change, high ROI.

## Decision — does canvas DopeSheet ship?

The prompt's three-case framework doesn't fit:

- "Strong case" required mount/unmount churn + `TrackRow.tick` cost + long tasks. Got: 0 + 0 + ✓.
- "Partial case" hinged on `TrackRow.tick` being dominant. It's not — it's gone.
- "Weak case" required `dope-*` already at vsync. They're not (scrub, play, select are all far below).

So I'm calling it a **modified strong case** for canvas DopeSheet, rationale:

1. **`dope-select-track` is the dramatic Stage-1 win.** Single-selection bursts of 137 ms reconciliation are the most user-visible "click a track and the app freezes" symptom, and the canvas approach makes selection-state updates O(viewport-pixels) instead of O(keyframe-count). This alone is sufficient justification given the prompt's framing of "the lag the user feels."
2. **`dope-scrub` has 6050 ms of non-React main-thread time correlated with the DOM-diamond count**, even if we couldn't pin the exact channel. Canvas DopeSheet eliminates the 9000 diamond DOM, so whichever combination of (1) layout reflow and (2) keyframe-evaluation cost drives the unaccounted time, removing the diamonds removes any layout contribution. We'll learn how much by re-running the bench post-canvas-DopeSheet.
3. **`dope-play` will *not* fully recover.** Its 3245 ms of React fanout is the systemic anim-notification problem from `08_ENGINE_PROBE_FINDINGS.md`, unchanged. Canvas DopeSheet drops `Timeline:DopeSheet` from ~22 ms to ~0 — a small absolute win on play. The remaining ~3000 ms only goes away with AnimationDocument. **Set user expectations accordingly when shipping canvas DopeSheet.**

Concretely: proceed to [`14_CANVAS_DOPESHEET_PROMPT.md`](./14_CANVAS_DOPESHEET_PROMPT.md). The implementation effort is similar shape to the canvas graph editor — Step 4 (`KeyframeDiamond` removal + canvas-based draw, selection-state as a hashed key on a separate overlay canvas similar to the graph's `SoftSelectionMaskCache`) should ship the win. Expected post-canvas bench delta:

| scenario | before | expected after |
|---|---|---|
| dope-scrub workerFps | 16 | ≥ 45 (matches `graph-scrub`'s 59 minus the residual anim-notify fanout) |
| dope-scrub longTaskMs | 7034 | ≤ 1500 |
| dope-select-track workerFps | 8 | ≥ 55 |
| dope-select-track DopeSheet medianMs | 137 | ≤ 5 |
| dope-play workerFps | 26 | 30–40 (small canvas win; main improvement awaits AnimationDocument) |
| dope-zoom | vsync | vsync (unchanged) |

If the actual post-canvas bench shows dope-scrub still has > 3000 ms long tasks, the residual is `AnimationSystem.tick` and the next probe should instrument that. If it's < 1500 ms, the canvas refactor settled the question.

## Spec amendments / corrections to the prompt

1. **`TrackRow.tick` is dead code in dev.** The prompt's Step 4 instrumentation pattern (and the `01_AUDIT.md` §2 entry it derives from) is stale for this codebase. The instrumentation patch is still useful as a regression detector — if a future refactor re-wires the tick path, the counter will detect it — but it should not be expected to produce signal in 2026-05-17 dev/.
2. **The bench's heavy-seed flag is `--seed=heavy`**, not `--heavy` as the prompt suggested. The flag exists in `bench-perf-timeline.mts:682`. Heavy seed = 1500 frames × 6 tracks = 9000 keyframes, matching the canvas-graph baseline exactly. No code change required.
3. **`dope-zoom` should be removed from the prompt's "expected to be heavy" scenario list** — at the heavy seed it's at vsync. If `01_AUDIT.md` §2 lists viewport-virtualisation churn as a cost, that claim needs re-validation against a denser seed (e.g. 15000+ keyframes with frameWidth deliberately set to expose more boundary churn) before it can be relied upon.

## Probe code retention

- `components/timeline/TrackRow.tsx` — `__trackRowTickStats` instrumentation added inside `tick()`. **Strip before merge.** Useful as a regression check only; not load-bearing.
- `debug/bench-perf-timeline.mts` — `TrackRowTickStats` interface, `mergeTrackRowStats`, scenario-loop capture, console table. **Strip before merge.** Bench should remain bench; this is one-shot diagnostic scaffolding.
- `debug/dopesheet-probe-baseline.{json,log}` and `debug/dopesheet-probe-instrumented.{json,log}` — landed on `dev` alongside this doc.

## Worktree cleanup status

- **Branch:** `probe/dopesheet` exists locally; not pushed.
- **Worktree path:** `h:/GMT/workspace-gmt/dev-probe-dopesheet`, still mounted (node_modules junction to `dev/node_modules`).
- **Retention:** keep until canvas DopeSheet work begins (the instrumentation pattern is reusable). Otherwise tear down after 30 days of inactivity: `git worktree remove ../dev-probe-dopesheet && git branch -D probe/dopesheet`.

The findings doc + the four `debug/dopesheet-probe-*` artefacts land on `dev` (not on the probe branch) so they survive a branch deletion.