# Bench: add per-commit median ms — implementation prompt

**Purpose:** the React attribution table in `bench-perf-timeline.mts` currently reports `totalActualMs` and `count` per profiler. Both probes ran into diagnostic confusion because commit count tracks notification rate (not work) and the cost-per-commit was only visible after manual division. Add a `medianMs` (or `meanMs`) per-commit derived column so the dominant cost jumps to the top of the table without arithmetic.

**Estimated effort:** <1 day. **Status:** ready for fresh session. Should ship before [`09_CANVAS_GRAPH_PROMPT.md`](./09_CANVAS_GRAPH_PROMPT.md) so the canvas work's validation is unambiguous.

## Why this matters

From [`08_ENGINE_PROBE_FINDINGS.md`](./08_ENGINE_PROBE_FINDINGS.md):

> Commit count is a near-useless metric in isolation. It correlates with notification rate, not with per-subtree work. Multiplying commit count by per-commit ms gives the actual cost; the count alone is a scheduler-passes proxy. Both this probe and the first spike's earlier confusion came from reading commit count without that division.

In the probe's React attribution table, `Item:widget:formula-params` (0.78 ms/commit) and `Timeline:Graph` (6.95 ms/commit) both show ~480 commits during graph-play. Without the per-commit number, both look equally "hot." With it, `Timeline:Graph` immediately jumps out as 9× the cost of any other boundary. That single piece of context is what redirected the entire refactor plan.

Future perf probes need this metric to avoid the same trap.

## Read first

1. **`debug/bench-perf-timeline.mts`** — the bench. Focus on:
   - `ProfilerBucket` interface (line ~62) — the per-profiler shape stored per run.
   - `snapshotToMetrics` and `summarise()` — where buckets are aggregated across runs.
   - Console output formatting around the React attribution table.
2. **`debug/spike-pre.json`** + **`debug/probe-pre.json`** — sample bench JSON outputs to see the existing shape.
3. **[`08_ENGINE_PROBE_FINDINGS.md`](./08_ENGINE_PROBE_FINDINGS.md)** §"The smoking gun" table — the format we want to make the bench produce automatically.

## Implementation

### Step 1 — Add per-commit aggregation

`ProfilerBucket` currently has:

```ts
interface ProfilerBucket {
  count: number;
  totalActualMs: number;
  totalBaseMs: number;
  maxActualMs: number;
}
```

Add:

```ts
interface ProfilerBucket {
  count: number;
  totalActualMs: number;
  totalBaseMs: number;
  maxActualMs: number;
  /** Per-commit actualMs samples, kept across the scenario so the median / p50 / p95
   *  can be computed in summarise(). Truncate at a reasonable cap (e.g. 1000) to
   *  bound memory; truncation is fine for medians since the distribution shape
   *  matters more than every sample. */
  actualMsSamples: number[];
}
```

Update wherever the bucket is mutated (the React Profiler `onRender` callback hooks). Push each commit's `actualDuration` into `actualMsSamples`.

### Step 2 — Compute median in `summarise()`

Where the per-profiler row is constructed for the console output, derive:

```ts
const sorted = bucket.actualMsSamples.slice().sort((a, b) => a - b);
const medianMs = sorted.length === 0 ? 0
  : sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[(sorted.length - 1) / 2];
```

Mean is the cheap fallback if memory cost of samples becomes a concern (`mean = totalActualMs / count`); median is preferred since per-commit cost is often skewed by a few outliers.

### Step 3 — Console output format

Current table (illustrative):

```
React Profilers (dope-play):
  Dock:right                       1.50 ms total / 480 commits
  Item:widget:formula-params       372.0 ms total / 480 commits
  Timeline:Graph                   3343 ms total / 480 commits
  ...
```

Updated:

```
React Profilers (dope-play, sorted by ms/commit):
  Profiler                        commits  total ms  ms/commit  max ms
  Timeline:Graph                      480    3343.0      6.96     12.4
  Item:widget:formula-params          480     372.0      0.78      1.5
  Dock:right                          480     720.0      1.50      2.8
  ...
```

Sort descending by `ms/commit` — that puts the dominant per-commit cost at the top, where the diagnostic instinct expects it. Include `max ms` since the tail matters too (one slow commit during scrub is a felt frame drop).

### Step 4 — JSON output

Extend `ScenarioMetrics.profilers` (the persisted per-scenario shape) to include `medianMs` and `maxActualMs` per profiler. Don't include the raw `actualMsSamples` array in the JSON — too large, defeats the truncation. Median + max + total + count is enough for downstream analysis.

Verify a `bench-perf-timeline.mts` run produces the expanded shape and the diff script (`debug/spike-diff.mts`) or any equivalent can consume it.

### Step 5 — Validation

- Run bench once. Confirm console output shows the new columns in the expected sort order.
- Open `debug/bench-perf-timeline-latest.json`, confirm new fields present in the persisted shape.
- Re-run the diff script against the new file to confirm backward compatibility.
- Optional: re-run against the spike + probe baselines (`spike-pre.json`, `probe-pre.json`) to confirm those still parse — they shouldn't have `medianMs`, just `undefined`, and the diff script should handle absent fields gracefully.

## Acceptance criteria

- [ ] `ProfilerBucket` has `actualMsSamples` field (or equivalent aggregation).
- [ ] Console output sorted by ms/commit descending, with new columns.
- [ ] `ScenarioMetrics.profilers` JSON shape includes `medianMs` + `maxActualMs`.
- [ ] Diff script handles both old (no `medianMs`) and new (with `medianMs`) inputs.
- [ ] `bench-perf-timeline` runs end-to-end without errors.
- [ ] A run on current `dev` produces the expected output: `Timeline:Graph` rises to the top of `graph-play`'s table; `Item:widget:formula-params` falls below `Dock:right` in the sort.

## Out of scope

- Adding new scenarios.
- Adding new instrumentation beyond per-commit timings (e.g., re-render reason attribution).
- Refactoring the bench structure or its run loop.
- Histograms, percentiles beyond median, or any statistical analysis beyond what's listed.

## Report

Tiny doc — `12_BENCH_METRIC_REPORT.md`:

1. "Shipped." (or issue list).
2. Console output diff: before/after for the `graph-play` scenario's React attribution table.
3. Anything surprising about the implementation.

## Pre-flight

- [ ] On branch `feature/bench-per-commit-ms` (off `dev`).
- [ ] `npm run typecheck` passes.
- [ ] Confirm the bench seed cache exists at `debug/bench-perf-timeline-seed.json` so the run is fast.
