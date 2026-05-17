# Animation refactor spike — findings

**Status:** complete (2026-05-17)
**Spike branch:** `spike/pertrack-sub` in worktree `h:/GMT/workspace-gmt/dev-spike-pertrack-sub`
**Protocol followed:** [`05_SPIKE_PROMPT.md`](./05_SPIKE_PROMPT.md), with bench instrumentation patches noted below.
**Artefacts:** `debug/spike-pre.json`, `debug/spike-post.json`, `debug/spike-probe2.json` (committed alongside this doc — see Step 5 of the prompt).

## Result line

**Diagnosis invalidated for the named consumer (`useTrackAnimation`). Redirected to the engineStore-driven panel re-render path.** The per-track keyframes subscription is a sound primitive but it does not, in isolation, reduce Slider re-renders or frame time under any tested scenario. A follow-up probe localised the issue further: removing *every* animationStore subscription from `useTrackAnimation` except per-track keyframes ALSO produced no measurable effect. The Slider re-render cause is elsewhere — most likely engineStore notifications driving panel-level re-renders.

The architectural proposal in [`02_RATIONALE.md`](./02_RATIONALE.md) remains internally consistent, but its stated mechanism for *why* the user-reported lag occurs is not supported by this measurement. Phase 0 should not begin until the actual fanout source is identified.

## Methodology corrections

The original spike prompt called for measuring `storeNotifyCount`, p50/p5 `frameDts`, and a Slider profiler dropping ≥50%. Two of those three metrics were instrumented against the wrong target in the original bench:

1. **`bench-perf-timeline.mts` hooked engineStore (`window.__engineStore || window.__store`), not animationStore.** The bench's `storeNotifyCount` was never measuring the axis the spike change affects. Patched by adding a parallel `animStoreNotifyCount` counter that subscribes to `window.useAnimationStore`. See diff in `bench-perf-timeline.mts:190-208`.

2. **TrackRow viewport virtualisation clipped most seeded keys.** With 2550 keys × default `frameWidth=8`, the visible window only renders a small fraction of the seed. Patched by exposing `__timelineSetFrameWidth` from `Timeline.tsx:75-86` (debug-only seam, sibling of `__timelineSetMode`) and adding a fit-to-viewport step in the bench after seeding (`bench-perf-timeline.mts:727-745`).

A third correction was discussed and skipped per scope: adding a modulation-recording scenario (the actual user-reported lag context). The existing `dope-play` and `graph-play` scenarios with `isRecording=true` / `recordCamera=true` were judged a sufficient first proxy, given the spike's null result on every scenario including those. A future spike targeting modulation-record specifically remains warranted.

### Pass criteria as written vs the actual mechanism

The criteria — "`storeNotifyCount` drops ≥30% in dope-idle or dope-scrub" — cannot fire even on a working change, because:
- `dope-idle` has zero animation-store writes (0 anim.notify, both pre and post).
- `dope-scrub` writes only `currentFrame` (121 anim.notify, all of them frame seeks; no sequence changes).
- The spike's mechanism only fires when sequence writes happen *to other tracks while a slider's own track is untouched* — which the bench does not exercise.

The diff script was extended to also check `dope-play` / `graph-play` (where ≈480 anim.notifies/scenario fire from `recordCamera`). Even there, no signal.

## Bench delta tables

Seed: 6 tracks / 2550 keyframes (`HEAVY_SEED_TRACK_IDS`, ~25 s of recording at 60 fps).
Hardware: Windows 10, Chrome (Playwright-managed), 1920×1080 viewport.
Runs: n=3, medians reported.

### Pre (no spike edits) vs Post (per-track keyframes sub in `useTrackAnimation` + `TrackRow`)

| Scenario | eng.notify | anim.notify | frameDt p50 | frameDt p5 | `Item:widget:formula-params` ms / commits |
|---|---|---|---|---|---|
| dope-idle | 8 → 8 | 0 → 0 | 16.7 → 16.7 ms | 16.8 → 16.8 ms | 9.4 / 8 → 9.6 / 8 |
| dope-scrub | 263 → 263 | 121 → 121 | 16.7 → 16.7 | 33.4 → 33.4 | 108.3 / 133 → 108.1 / 133 |
| dope-play | 972 → 975 | 480 → 482 | 16.7 → 16.7 | 33.4 → 33.4 | 369.9 / 480 → 378.0 / 482 |
| dope-zoom | 12 → 12 | 0 → 0 | 16.7 → 16.7 | 16.8 → 16.8 | 10.7 / 12 → 11.1 / 12 |
| graph-idle | 8 → 8 | 0 → 0 | 16.7 → 16.7 | 16.8 → 16.8 | 6.8 / 8 → 6.8 / 8 |
| graph-scrub | 267 → 269 | 121 → 121 | 33.3 → 33.3 | 33.8 → 50.0 | 107.7 / 136 → 106.4 / 137 |
| graph-play | 933 → 935 | 456 → 457 | 50.0 → 50.0 | 50.1 → 50.1 | 358.1 / 457 → 352.6 / 457 |
| graph-zoom | 12 → 14 | 0 → 0 | 16.7 → 16.7 | 16.8 → 16.8 | 10.7 / 12 → 10.7 / 12 |

Every value is within ±3 % run-to-run noise. The single >5 % swing — `graph-scrub` p5 frame time going from 33.8 ms to 50.0 ms — is a regression direction and within the variance of an n=3 measurement; not a real signal.

### Probe 2 (all non-keyframe subs in `useTrackAnimation` replaced with lazy `getState()` reads)

Question: is `currentFrame`'s per-frame subscription the dominant re-render trigger?

| Scenario | `Item:widget:formula-params` ms / commits, pre → probe2 |
|---|---|
| dope-idle | 9.4 / 8 → 8.7 / 8 |
| dope-scrub | 108.3 / 133 → 105.1 / 133 |
| dope-play | 369.9 / 480 → 364.9 / 482 |
| graph-scrub | 107.7 / 136 → 104.2 / 137 |
| graph-play | 358.1 / 457 → 348.4 / 460 |

Answer: no. Removing every animation-store subscription except per-track keyframes did not drop commit count or total render time. The Sliders re-render at the same rate regardless of what `useTrackAnimation` subscribes to.

`Item:widget:formula-params` commits correlate more closely with eng.notify count than with anim.notify count (~480 commits ≈ 480 worker frames during dope-play). The widget appears to re-render on every engine-tick, propagated by something upstream — most plausibly engineStore-derived props (live uniform values, modulation state, or similar).

## Observed surprises

1. **`useTrackAnimation`'s subscription set has no measurable effect on Slider render frequency.** Probe 2 collapsed seven subscriptions to one and changed nothing. This was the spike's strongest null result and the most informative finding — it relocates the entire investigation away from the animation-store.

2. **`Timeline:DopeSheet` and `Timeline:Graph` commit counts also didn't drop.** TrackRow's per-track sub bails correctly when its own keyframes array is unchanged, but the parent `DopeSheet` / `Graph` components still re-render on every sequence change because *they* hold the broad subscription. The child-side bail only saves work *within* a single re-render of the parent — it doesn't reduce parent commit frequency.

3. **`dope-idle` shows zero animation-store writes**, confirming the pass criteria as written (idle / scrub) were never going to fire even on a working change. The spike doc's choice of scenarios pre-supposed the mechanism would manifest in idle React reconciliation cost, which it doesn't.

4. **Frame times are vsync-pinned in every scenario except `*-play`.** dope-idle / dope-scrub / dope-zoom all sit at 16.7 ms p50, meaning CPU isn't saturated even with 2550 keys × six tracks fit-to-view. The user-reported lag — playback / scrub / record — manifests in dope-play (33 ms p5 = 30 fps tail) and graph-play (50 ms = 20 fps) where actual work overflows the budget. Whatever fix lands has to target those scenarios specifically.

5. **`graph-play` `TimelineHost` totalActualMs is ~5 300 ms over ~457 commits ≈ 11.6 ms/commit.** This is the single biggest cost in the bench, and the spike didn't touch it. The Graph editor's per-redraw cost (polyline resampling, soft-selection mask) noted in `02_RATIONALE.md` §1 is the dominant load-bearing inefficiency in playback at scale, and is independent of the per-track-sub question.

## Recommendation for Phase 0

Hold Phase 0 as currently scoped. Three concrete next steps before the refactor commits:

1. **Find the actual Slider re-render trigger.** Probe whether `Item:widget:formula-params`'s 480 commits/dope-play come from:
   - engineStore subscriptions inside the panel or its children (most likely — eng.notify count nearly matches commit count),
   - props cascading from the panel container (e.g. a `Dock:right/PanelRouter:Formula` parent that subscribes to a frequently-changing engineStore field and passes derived values down),
   - or the `Slider` component itself reading live uniform values.

   Hypothesis to test: narrowing the engineStore subscription on whichever parent re-renders the formula widget will drop Slider commits proportionally. If true, this is a much smaller refactor than `AnimationDocument` and addresses the user-reported lag directly.

2. **Reorder the audit's phase plan.** The audit ([`01_AUDIT.md`](./01_AUDIT.md) §11) ordered AnimationDocument → ModulationRuntime → Recorder → AudioRuntime → Player → Engine → canvas DopeSheet → canvas GraphEditor → cleanup. The spike result argues canvas DopeSheet / GraphEditor (phases 6-7) should move much earlier — possibly first — because they short-circuit the parent-re-render fanout that the spike just demonstrated dominates Slider cost. A canvas DopeSheet would not subscribe to sequence in React at all; it would read from a class document directly in `requestAnimationFrame`. That single change removes the entire fanout cascade the spike was trying to attack from below.

3. **Add a modulation-recording scenario to the bench before any further work.** The user-reported pain is recording-modulation-into-a-heavy-timeline. The existing scenarios use `isRecording` + `recordCamera` (manual key-record per-frame), not modulation-record (`batchAddKeyframesMultiRange` flushing per 400 ms). The two have different fanout shapes and the bench can't speak to the actual lag context until the second one is wired.

The `AnimationDocument` design from `02_RATIONALE.md` is not invalidated by this spike — its undo, write-API, and version-counter design are sound. What's invalidated is the claim that switching consumers (`useTrackAnimation`, `TrackRow`) to per-track subscriptions would meaningfully improve the user-visible lag. The document architecture might still be the right long-term store, but its immediate ROI is much smaller than `02_RATIONALE.md` projected, and other work (canvas renderers, engineStore narrowing) appears more leveraged for the specific lag complaint that motivated the refactor.

## Bench instrumentation patches (carried into spike branch)

These two patches stay in the spike worktree and should be ported back to `dev` regardless of what happens with the refactor — they improve bench fidelity for any future animation-perf work.

1. **`debug/bench-perf-timeline.mts`**: added `animStoreNotifyCount` (parallel counter on `window.useAnimationStore.subscribe`), threaded through `start()` / `snapshot()` / `summarise()` / `snapshotToMetrics()` / `ScenarioMetrics` type and console summary table. ~15 lines.
2. **`debug/bench-perf-timeline.mts`** + **`components/Timeline.tsx`**: added `__timelineSetFrameWidth` window seam and a fit-to-viewport step in the bench right after the seed applies. Ensures TrackRow virtualisation does not silently discard most seeded keyframes from the measured render path. ~20 lines.

## Worktree cleanup status

- **Branch:** `spike/pertrack-sub` exists in the local repo; not pushed.
- **Worktree path:** `h:/GMT/workspace-gmt/dev-spike-pertrack-sub`, still mounted.
- **Retention recommendation:** keep until the bench instrumentation patches are cherry-picked back to `dev` and the engineStore-fanout follow-up probe has at least its baseline run captured. After that, the per-track-sub edits themselves can be discarded (`git worktree remove ../dev-spike-pertrack-sub && git branch -D spike/pertrack-sub`) — they don't ship to `dev`.

The findings doc and the three `debug/spike-*.json` artefacts must land on `dev` (not on the spike branch) so future readers don't lose them when the throwaway branch is deleted.
