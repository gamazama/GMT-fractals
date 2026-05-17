# Animation refactor — diagnostic spike

**Purpose:** empirically validate the architectural diagnosis driving the planned 6-7 week animation refactor *before* the refactor begins. This is a 2-3 day, throwaway-branch exercise. The output is a findings report that either confirms the diagnosis (proceed to Phase 0) or invalidates it (rethink before committing).

**Background, one paragraph.** The animation system in `h:/GMT/workspace-gmt/dev` lags at thousands of keyframes — recording, playback, scrub, even idle. A design pass (see referenced docs) concluded the root cause is that animation data lives in a Zustand slice that fans out to every consumer via React subscriptions, with every keyframe rendered as its own DOM element. The proposed fix is a large refactor (`AnimationDocument` data layer + canvas-rendered timeline + per-track subscriptions). Before committing 6-7 weeks of foundation work, this spike validates the diagnosis with one minimal change: convert `useTrackAnimation` (the hook every animatable Slider in the app uses) to subscribe to a *single track* instead of the entire `sequence`. If the model is right, this single change should measurably drop React re-renders and frame time during recording and idle. If it doesn't, the diagnosis is wrong somewhere.

## Read first (in order)

1. **`docs/animation-refactor/01_AUDIT.md`** — the 30-entry-point inventory + the diagnosis. Sections 1, 2, 9 are load-bearing.
2. **`docs/animation-refactor/02_RATIONALE.md`** — the original refactor proposal, with self-pushback section. Sets the stakes.
3. **`docs/animation-refactor/03_SPEC.md`** — the v2 module API spec the refactor will implement. Phase 0 begins after the spike validates the diagnosis.
4. The current code under test:
   - **`dev/hooks/useTrackAnimation.ts`** — 85 lines. Called by every animatable Slider. Currently subscribes to `s.sequence` (the whole tree).
   - **`dev/components/timeline/TrackRow.tsx`** — 316 lines. Receives `sequence` as a prop; passes the same prop chain into every visible keyframe diamond.
   - **`dev/store/animation/sequenceSlice.ts`** — the writer side. `batchAddKeyframesMultiRange` is the recording-flush hot path; note it already clones the touched track for ref equality (line ~260).

## Bench infrastructure (already in place)

- **`dev/debug/bench-perf-timeline.mts`** — Playwright-driven bench that boots app-gmt, seeds a heavy keyframe sequence (1500 frames × 6 camera tracks per `HEAVY_SEED_FRAMES`/`HEAVY_SEED_TRACK_IDS` at lines 55-59), then measures six scenarios across 3 runs each:
  - `dope-idle`, `dope-scrub`, `dope-zoom`
  - `graph-idle`, `graph-scrub`, `graph-zoom`
- Per-run metrics include `storeNotifyCount`, `frameDts` (p50/p5), React profiler `actualMs` per component, `longTaskTotalMs`, `workerFps`, heap delta.
- **`dev/debug/bench-perf-timeline-baseline.json`** — existing baseline. Don't trust it for the spike (may be stale); regenerate fresh per the protocol below.
- Run with: `npx tsx debug/runWithServer.mts -- npx tsx debug/bench-perf-timeline.mts` (auto-spawns vite if not running), or `npx tsx debug/bench-perf-timeline.mts` if vite already on :3400.
- Output: `debug/bench-perf-timeline-latest.json` + timestamped archive in `debug/`.

## Protocol

Execute each step in order. Don't skip steps; don't optimise prematurely.

### Step 1 — Worktree

Create a git worktree so the spike is isolated from `main`:

```
git worktree add ../dev-spike-pertrack-sub spike/pertrack-sub
cd ../dev-spike-pertrack-sub
```

All work happens in `../dev-spike-pertrack-sub`. The original `dev/` stays untouched.

### Step 2 — Pre-change baseline

From the worktree:

```
npx tsx debug/runWithServer.mts -- npx tsx debug/bench-perf-timeline.mts
cp debug/bench-perf-timeline-latest.json debug/spike-pre.json
```

Verify the seed cache exists at `debug/bench-perf-timeline-seed.json`. If not, the first run will record it (adds ~25s); subsequent runs are faster.

### Step 3 — Apply the change

**Three edits. No more.** Resist scope creep — this is a spike, not Phase 0.

**3a.** Add a helper hook at the top of `dev/hooks/useTrackAnimation.ts` (or a new `dev/hooks/useTrackKeyframes.ts`):

```ts
import { shallow } from 'zustand/shallow';
import { useAnimationStore } from '../store/animationStore';
import type { Keyframe } from '../types';

export const useTrackKeyframes = (tid: string | undefined): readonly Keyframe[] | undefined =>
    useAnimationStore(
        (s) => (tid ? s.sequence.tracks[tid]?.keyframes : undefined),
        shallow,
    );
```

Note: `subscribeWithSelector` middleware is already enabled on the store (see `dev/store/animation/sequenceSlice.ts` `StateCreator` signature). `shallow` from `zustand/shallow` bails when the array reference is unchanged. Since `batchAddKeyframesMultiRange` clones the touched track (`sequenceSlice.ts:260`, `:364`), untouched tracks' keyframes arrays preserve referential identity — bail fires correctly.

**3b.** In `dev/hooks/useTrackAnimation.ts`, replace the `sequence` selector with the new hook:

```ts
// OLD:
const sequence = useAnimationStore((s) => s.sequence);
// ...
if (!trackId || !sequence.tracks[trackId]) return 'none';
const track = sequence.tracks[trackId];

// NEW:
const keyframes = useTrackKeyframes(trackId);
// ...
if (!trackId || !keyframes) return 'none';
// Replace `track.keyframes` references with `keyframes` directly.
// For the few sites that need `track` itself (e.g., reading `track.label`),
// either pass label as a prop (already done — `label` is an arg) or fetch
// lazily via useAnimationStore.getState() at call time (not in a selector).
```

Preserve the existing action selectors (`addTrack`, `addKeyframe`, `removeKeyframe`, `snapshot`) — they're already stable refs via the Object.is bail-out and don't need changing.

**3c.** In `dev/components/timeline/TrackRow.tsx`, convert the component to read its own keyframes via the hook instead of via the `sequence` prop:

```ts
// In TrackRow:
const keyframes = useTrackKeyframes(tid);
const flat = useMemo(() => isFlatTrack(keyframes ?? []), [keyframes]);
const visibleSlice = useMemo(() => {
    if (!keyframes || keyframes.length === 0) return keyframes ?? [];
    // ... existing visibleSlice logic, but use `keyframes` instead of `track?.keyframes` ...
}, [keyframes, frameWidth, visibleMinPx, visibleMaxPx]);
```

Leave the `sequence` prop on `TrackRow` for now (other reads still go through it — label, hidden flag). The spike is testing the *keyframe subscription* specifically; full prop removal is Phase 0 work.

Do NOT touch: DopeSheet, TrackGroup, GraphEditor, GraphSidebar, useDopeSheetInteraction, useGraphInteraction, the slice writers, or anything else. The spike is three files.

### Step 4 — Post-change measurement

```
npx tsx debug/runWithServer.mts -- npx tsx debug/bench-perf-timeline.mts
cp debug/bench-perf-timeline-latest.json debug/spike-post.json
```

### Step 5 — Diff and decide

Write a node/tsx diff script (or use `jq`) to compute the deltas between `spike-pre.json` and `spike-post.json`. Required deltas per scenario:

- `storeNotifyCount` (absolute + %)
- `frameDts` p50 and p5 (absolute ms + %)
- `longTaskTotalMs`
- Top 5 components in `profilers` by `totalActualMs`, before/after

### Pass criteria

The diagnosis is **confirmed** if AT LEAST TWO of the following hold across the dope-* scenarios:

- `storeNotifyCount` drops 30%+ in `dope-idle` or `dope-scrub`.
- `frameDts` p50 improves 15%+ in `dope-idle` or `dope-scrub`.
- React profiler `actualMs` for any `useTrackAnimation` consumer (Sliders) drops 50%+.

### Partial-gain interpretation

If `storeNotifyCount` drops but `frameDts` doesn't move → React reconciliation isn't the dominant cost; paint is. **The refactor plan still holds**, but Phase 0's priority shifts: canvas DopeSheet (currently Phase 6 of the audit's expanded plan) becomes higher priority, and per-track subscription work is lower-value than initially modeled.

### Fail criteria

The diagnosis is **invalidated** if:

- `storeNotifyCount` doesn't drop at all → something else upstream is generating the notifications (possible: the no-op set() flood mentioned in `useTrackAnimation.ts:13-15` is the dominant source, not the keyframe writes). Investigate before any refactor work.
- The change breaks rendering (visible regression in dope-idle or scrub) → the assumption that `batchAddKeyframesMultiRange` preserves untouched-track ref equality is wrong somewhere. Audit `sequenceSlice.ts` writers carefully.

### Step 6 — Findings doc

Write `docs/animation-refactor/06_SPIKE_FINDINGS.md` with:

1. **Result line.** "Diagnosis confirmed" / "Diagnosis partial — paint dominant" / "Diagnosis invalidated".
2. **Bench delta table.** All 6 scenarios × the metrics in Step 5.
3. **Observed surprises.** Anything that didn't match the expected model — including null results.
4. **Recommendation for Phase 0.** Confirmed → proceed as planned in `03_SPEC.md` §10. Partial → revised phase order. Invalidated → next investigation steps.
5. **Worktree cleanup status.** Branch + worktree path; whether retained for reference or deleted.

### Step 7 — Cleanup

The spike branch is a throwaway. Once findings are written:

```
cd h:/GMT/workspace-gmt/dev    # back to main worktree
git worktree remove ../dev-spike-pertrack-sub
git branch -D spike/pertrack-sub   # only after confirming findings doc is committed to main
```

If the diagnosis is confirmed, the actual `useTrackKeyframes` implementation lands in Phase 0 (likely Phase 0 step 2 or 4); it does not land directly from the spike branch.

## Scope guards — do not

- Build the AnimationDocument.
- Touch the canvas DopeSheet (it doesn't exist yet).
- Migrate any consumer other than `useTrackAnimation` and `TrackRow`.
- Optimise things you notice along the way (note them in findings instead).
- Land the spike change on `main`.
- Skip the bench in favour of "it looks faster."

## Output checklist

When complete:

- [ ] `docs/animation-refactor/06_SPIKE_FINDINGS.md` exists on `main`, committed.
- [ ] `debug/spike-pre.json` and `debug/spike-post.json` exist on `main` (so findings are reproducible), committed.
- [ ] Spike branch + worktree removed.
- [ ] One-line summary in conversation: "Diagnosis [confirmed/partial/invalidated]; see docs/animation-refactor/06_SPIKE_FINDINGS.md."

Total time: 2-3 days. Most of that is bench wall-clock (~10 min per run × 4-6 runs for variance) and writing the findings honestly.
