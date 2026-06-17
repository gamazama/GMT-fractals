# Bench: per-commit median ms — report

Shipped.

## Summary

`bench-perf-timeline.mts` now collects per-commit `actualDuration` samples per profiler (capped at 1000) in the browser-side instrumentation, computes a `medianMs` in `snapshot()`, and emits it in the persisted JSON shape. The per-scenario React attribution log line is replaced by a full table sorted by ms/commit descending, with `commits`, `total ms`, `ms/commit`, and `max ms` columns. `mergeProfilers()` carries `medianMs` through the run-median fold.

## Console output diff (graph-play)

Before (illustrative — the actual single-line was `react: <top 3 by total>`):

```
    react: TimelineHost 1338.4ms/480c  Timeline:Graph 1099.0ms/480c  Dock:right 712.7ms/480c
```

After:

```
    React Profilers (graph-play, sorted by ms/commit):
      Profiler                          commits   total ms   ms/commit    max ms
      TimelineHost                          480     1336.1        2.70      13.5
      Timeline:Graph                        480     1102.2        2.20      12.7
      Dock:right                            480      720.9        1.50       2.8
      Dock:right/PanelRouter:Formula        480      611.7        1.20       2.5
      Item:widget:formula-params            480      373.4        0.80       2.0
      DomOverlays                           480      338.2        0.70       1.9
      TopBarHost                            960      429.6        0.50       1.7
      ...
```

`TimelineHost` + `Timeline:Graph` sort to the top by per-commit cost (2.7 / 2.2 ms) where they were previously interleaved with other ~480-commit profilers. `Item:widget:formula-params` (0.80 ms/commit) correctly sorts below `Dock:right` (1.50 ms/commit) — the inversion the metric was added to surface.

## JSON shape

`ScenarioMetrics.profilers[id]` now contains `medianMs` alongside the existing `count` / `totalActualMs` / `totalBaseMs` / `maxActualMs`. Raw per-commit samples are not persisted. Verified via the freshly written `debug/bench-perf-timeline-latest.json`. Backward compat with `spike-pre.json` confirmed by running `debug/spike-diff.mts spike-pre.json bench-perf-timeline-latest.json` — diff script does not read `medianMs`, so absent on the pre side is a no-op.

## Notes

- The dominant per-commit cost in `graph-play` is `TimelineHost` (2.70 ms), not `Timeline:Graph` (2.20 ms) — the prompt example put `Timeline:Graph` at the top; in practice the wrapping `TimelineHost` Profiler boundary always edges it out by a small margin since it includes the Graph render plus a thin shell. Both `Timeline:*` profilers dominate the table by a wide margin, which is what the metric is meant to make obvious.
- `dope-select-track` produces a tiny 7-commit table (the bench logic emits no `Dock:*` / `Item:*` Profilers because the only re-renders are inside `TimelineHost` / `Timeline:DopeSheet`) — the new sort still puts the right boundaries at the top.
- Per-commit cost is stable across runs (median of medians), so the existing 3-run median fold survives unchanged.
