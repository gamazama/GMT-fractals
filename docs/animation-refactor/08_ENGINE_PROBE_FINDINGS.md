# Engine-fanout probe — findings

**Status:** complete (2026-05-17)
**Probe branch:** `probe/engine-fanout` in worktree `h:/GMT/workspace-gmt/dev-probe-engine-fanout`
**Protocol followed:** [`07_ENGINE_PROBE_PROMPT.md`](./07_ENGINE_PROBE_PROMPT.md), with deviations noted below.
**Artefacts:** `debug/probe-pre.json`, `debug/probe-post.json`, `debug/probe-post-c.json`, `debug/probe-post-d.json` (committed alongside this doc).

## Result line

**Hypothesis invalidated.** Narrowing the three identified broad `useEngineStore` subscriptions in the formula-params chain (PanelRouter:251, FormulaParamsWidget:53, App.tsx:34) plus a fourth narrowing of `useTrackAnimation`'s `currentFrame` produced **zero impact** on `Item:widget:formula-params` commit count — bit-for-bit 480 commits in every variant during dope-play. The probe surfaced two more important truths in the process: (a) the bench's commit-count metric is misleading on its own, and (b) the actual user-visible cost is in `Timeline:Graph`'s per-redraw polyline work, not in React fanout from animation/engine stores.

**Redirect:** the canvas DopeSheet / GraphEditor work (already on the table as recommendation #2 in [`06_SPIKE_FINDINGS.md`](./06_SPIKE_FINDINGS.md)) becomes the next concrete piece of work — not another store-narrowing probe.

## Protocol deviations

The probe prompt called for four sequential phases (locate chain → inventory subs → counter-instrument → narrow). The chain was located by grep in five minutes, surfacing two whole-store subscriptions written as one-liners — `useEngineStore((s) => s)` and bare `useEngineStore()`. Per the user's call at PAUSE 1, the inventory + counter-instrumentation phases were skipped in favour of going directly to Step 5 (apply narrowing + measure). Four progressively wider narrowing variants were tested instead of one.

The skip was a measured risk: if any narrowing had shown signal, the protocol would have been validated. They didn't, so the result speaks for itself.

## The chain

Three broad subscriptions identified (counts from grep):

```
App                                       [App.tsx:34]     const state = useEngineStore();
  Dock:right                              [Dock.tsx]       (clean — 14 narrow selectors)
    Dock:right/PanelRouter:Formula        [BenchProfiler boundary]
      PanelRouter (memo)                  [PanelRouter.tsx:251] useEngineStore((s) => s);
        Item:widget:formula-params        [BenchProfiler boundary]
          FormulaParamsWidget             [FormulaParamsWidget.tsx:53] const store = useEngineStore();
            <Slider>, <Vector*Input>, ... (all use useTrackAnimation which subs to s.sequence, s.currentFrame, s.isRecording)
```

Each subscription, by code reading, looked load-bearing — and each was tested.

## Bench deltas (probe-pre vs each variant)

All variants compared to the same baseline (`probe-pre.json`, seed: 6 tracks / 1854 keys). dope-play / graph-play scenarios shown; other scenarios produced equivalent null deltas.

### Variant A — PanelRouter narrowed + FormulaParamsWidget split (per-field selectors, liveModulations read via `getState()`)

| Profiler | dope-play commits | dope-play totalMs | graph-play commits | graph-play totalMs |
|---|---|---|---|---|
| `Item:widget:formula-params` | 480 → 480 | 372.0 → 376.5 | 482 → 482 | 379.0 → 366.6 |
| `Dock:right/PanelRouter:Formula` | 480 → 480 | 608.1 → 614.4 | 482 → 482 | 614.7 → 599.5 |

### Variant C — Also App.tsx narrowed (12 per-field selectors)

| Profiler | dope-play commits | dope-play totalMs |
|---|---|---|
| `Item:widget:formula-params` | 480 → 480 | 372.0 → 364.9 |
| `Dock:right/PanelRouter:Formula` | 480 → 480 | 608.1 → 600.3 |
| `TimelineHost` (downstream of App) | 480 → 480 | 268.7 → 250.0 |

### Variant D — Also `useTrackAnimation` `currentFrame` lazy via `getState()` (Sliders' status no longer updates on playhead moves)

| Profiler | dope-play commits | dope-play totalMs |
|---|---|---|
| `Item:widget:formula-params` | 480 → 480 | 372.0 → 374.9 |

Every commit-count delta across all variants and all scenarios: 0% (or 1-2 commits drift, within run noise). Total-actual-ms deltas: ±3% throughout, also within noise.

## The smoking gun (which was a red herring)

What we found instead, in the React attribution table from Variant D:

**Every profiler boundary in the entire app commits exactly 480 times during dope-play.** Not just formula-params. The full list:

| Profiler | dope-play commits | per-commit ms |
|---|---|---|
| Dock:right | 480 | 1.50 |
| Dock:right/PanelRouter:Formula | 480 | 1.28 |
| Item:widget:formula-params | 480 | 0.78 |
| Item:widget:lfo-list | 480 | 0.05 |
| Item:feature:geometry:transform | 480 | 0.08 |
| Item:feature:geometry:burning | 480 | 0.07 |
| Item:feature:geometry:julia | 480 | 0.06 |
| Item:compilable:geometry | 480 | 0.06 |
| Item:compilable:interlace | 480 | 0.05 |
| Dock:left | 480 | 0.06 |
| R3FCanvas | 480 | 0.06 |
| HudHost:top/bottom | 480 | <0.01 |
| GmtNavigationHud:bottom | 480 | 0.08 |
| TopBarHost | 960 (2× — more subs) | 0.46 |

In graph-play (where the real lag lives):

| Profiler | graph-play commits | per-commit ms |
|---|---|---|
| **Timeline:Graph** | 480 | **6.95** |
| Dock:right | 480 | 1.55 |
| Item:widget:formula-params | 480 | 0.81 |

**The commit count (480) tracks `anim.notify` count exactly across every boundary.** It's not measuring localized work in any specific subtree — it's measuring how often React's scheduler walks through that subtree per animationStore notification. Cheap walks everywhere (~0.05-1 ms per boundary), one expensive walk: `Timeline:Graph` at ~7 ms each, totalling 3.3 seconds of CPU over a 4-second `graph-play` scenario.

That 3.3 s is the actual user-visible lag. Not the React fanout — the per-redraw polyline computation in `utils/GraphRenderer.drawGraph` (already flagged in [`02_RATIONALE.md`](./02_RATIONALE.md) §1 as "polyline resampling — playhead nudge, marquee, selection").

## Observed surprises

1. **Commit count is a near-useless metric in isolation.** It correlates with notification rate, not with per-subtree work. Multiplying commit count by per-commit ms gives the actual cost; the count alone is a scheduler-passes proxy. Both this probe and the first spike's earlier confusion came from reading commit count without that division.

2. **No narrow-sub edit could move the count.** All four variants kept identical 480-commit counts. This rules out the entire family of "narrow this one subscription" fixes for the user-reported lag — there's no individual broad subscription whose removal would reduce React scheduler passes. The fix has to address either (a) the per-commit work in `Timeline:Graph`, or (b) the upstream tick rate (fewer animationStore notifications per worker frame).

3. **The fanout is system-wide.** Every profiled boundary across every panel commits at notification rate — including ones that look like they have no business re-rendering (R3FCanvas, Dock:left). This is the consequence of having many `useSyncExternalStore` consumers throughout the tree, each independently rendering when their narrow slice fires. Healthy in isolation, but it makes commit-count an unhelpful diagnostic.

4. **`Timeline:Graph` is the dominant cost during graph-play by an order of magnitude.** 6.95 ms per commit vs 0.05–1.55 ms for every other boundary. The bench's `dope-*` scenarios are essentially vsync-bound; `graph-play` is the only one CPU-bound, and it's bound on Graph rendering, not on React reconciliation.

5. **The probe's three smoking-gun subscriptions are real footguns** (and `docs/UI_PERF_HANDOFF.md` + `docs/CHANGELOG_DEV.md` already document past campaigns to clean up the same pattern in other files), but in the formula-params chain specifically, narrowing them produced no measurable benefit. They're worth fixing for code-hygiene reasons (one set of `set()` calls touches fewer subscribers), but not for the user-reported lag.

## Recommendation

**Stop diagnostic probes on the React-fanout axis.** The narrowing hypothesis has been tested four ways and produced no signal. Two productive next steps:

1. **Start the canvas GraphEditor work** (originally phase 7 of the audit's expanded plan, recommended in `06_SPIKE_FINDINGS.md` #2). `Timeline:Graph` at ~7 ms/commit × 480 commits = 3.3 s of CPU per 4 s scenario. A canvas-cached polyline strategy (per-track polyline keyed by `trackVersion + viewport`, soft-selection mask cached on selection changes) eliminates per-tick resampling cost. The architecture is sketched in `02_RATIONALE.md` §7 — that section's hypothesis is plausible without further probing, since the cost is now empirically located.

2. **Defer the AnimationDocument / per-track-sub work** until the canvas refactor has shipped and the system has re-equilibrated. The fan-out subscriptions remain valid code-hygiene targets but produce no user-visible improvement on their own. Whatever subscriptions remain after the canvas work can be tackled with measurement-first probes once the load picture changes.

A third, smaller follow-up worth queueing — but not blocking on:

3. **Improve the bench's metric stack.** Add a "per-commit median ms" derived column to the React attribution table so the diagnostic confusion this probe ran into (commit count without per-commit cost = misleading) doesn't recur. Trivial bench change; high ROI for any future perf work.

## Probe code retention

Four edits remain on the probe branch but **none should ship**:

1. `App.tsx:34` — split into 12 per-field selectors. Lossless refactor in shape, but App reads more than 12 fields (the adapter object `const state: any = {...}` is incomplete and would shed reactivity for fields not listed). Treat as a sketch, not a fix.
2. `components/PanelRouter.tsx:251` — narrowed to `formula | interlace | advancedMode`. Other panels' `showIf` predicates (e.g. `waterPlane.waterEnabled`, `audio.isEnabled`) would go stale. Sketch only.
3. `engine-gmt/components/panels/formula/FormulaParamsWidget.tsx:53` — narrowed + `liveModulations` read via `getState()`. The latter regresses live-value badge updates during play; the former is sound but produced no measured benefit.
4. `hooks/useTrackAnimation.ts:22` — `currentFrame` lazy via `getState()`. Sliders' keyed/dirty status would not update on playhead movement. Probe-only regression.

If any of these (1 + 2 in particular) are wanted for code-hygiene reasons, they should be re-derived as proper full-coverage narrowings on `dev` rather than cherry-picked from this branch.

## Worktree cleanup status

- **Branch:** `probe/engine-fanout` exists in the local repo; not pushed.
- **Worktree path:** `h:/GMT/workspace-gmt/dev-probe-engine-fanout`, still mounted.
- **Retention recommendation:** keep until either the canvas GraphEditor work begins (the probe's four scratched-up files are a useful reference for how subscriptions cascade through the panel tree) or three months have passed without revisit. Then `git worktree remove ../dev-probe-engine-fanout && git branch -D probe/engine-fanout`.

The findings doc and the four `debug/probe-*.json` artefacts must land on `dev` (not on the probe branch) so future readers don't lose them when the throwaway branch is deleted.
