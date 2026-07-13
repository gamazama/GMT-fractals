# Engine-fanout probe — diagnostic

**Purpose:** identify what causes `Item:widget:formula-params` (and similar panel widgets) to re-render ~480 times during `dope-play` — once per worker frame. The first spike ([`06_SPIKE_FINDINGS.md`](./06_SPIKE_FINDINGS.md)) ruled out the animation-store as the cause; the remaining suspect is a broad subscription somewhere in the panel/widget tree to a fast-changing engineStore field (`liveModulations`, `cameraRot`, `sceneOffset`, or similar). This probe locates the specific subscription, measures the impact of narrowing it, and decides between a small targeted fix vs. a broader refactor.

**Estimated effort:** 1 day. **Status:** ready to run in a fresh session after the first spike's cleanup lands.

**Scope guarantee:** investigative only. No animation-refactor changes. No `AnimationDocument`. No canvas work. The output is a findings doc + a *recommended* targeted fix, not the fix itself.

## Read first (in order)

1. **[`06_SPIKE_FINDINGS.md`](./06_SPIKE_FINDINGS.md)** — the result that motivated this probe. Especially "Observed surprises" #1, #2, and #5.
2. **[`00_INDEX.md`](./00_INDEX.md)** — context on where this probe sits in the bigger plan.
3. **`dev/debug/bench-perf-timeline.mts`** — the bench, post-instrumentation patches from the first spike. Specifically the per-scenario commit/profiler tables in `summarise()`.
4. **`dev/debug/spike-post.json`** + **`dev/debug/spike-probe2.json`** — the actual numbers. `Item:widget:formula-params` is the load-bearing widget; its commit counts are what this probe attacks.
5. **`dev/store/engineStore.ts`** — the store under suspicion. Note which fields update at engine-tick rate.
6. **`dev/engine/animation/AnimationSystem.tsx`** — the writer side: which `useEngineStore.setState` calls fire per tick.

## The hypothesis

`Item:widget:formula-params` re-renders ~480 times during dope-play because **some component in its render chain holds a broad `useEngineStore` subscription that fires every engine tick**. The most likely candidates:

- The widget itself subscribes to a frequently-updating engineStore field directly.
- Its panel container (a `Dock`, `PanelRouter`, or `formula-params` panel host) subscribes broadly and passes derived props down.
- A `Slider` primitive inside the widget reads `liveModulations[targetKey]` per render.

If true, the fix is one of: split the subscription into narrower per-field reads, hoist live readouts into a sibling that re-renders alone, or move the read inline at the leaf via a self-managing primitive.

If false, the probe redirects to: (a) prop cascade from the panel container's parent, or (b) the React tree itself (context provider, theme provider, etc.) re-rendering at tick rate.

## Protocol

### Step 1 — Worktree

```
git worktree add ../dev-probe-engine-fanout probe/engine-fanout
cd ../dev-probe-engine-fanout
```

All work happens in the new worktree. `dev` stays clean.

### Step 2 — Locate `Item:widget:formula-params`

It's a `BenchProfiler` id, set somewhere in the panel rendering. Grep for the literal string and trace upward to find:

- The component being wrapped.
- The immediate parent that mounts it.
- Two-three levels of ancestry above that, until you reach a stable dock/router boundary.

Write the chain down. Example shape (illustrative — the actual chain may differ):

```
Item:widget:formula-params  →  <FormulaParamsPanel>
                             →  <PanelRouter route="formula">
                             →  <Dock side="right">
                             →  <App>
```

### Step 3 — Inventory engineStore subscriptions in the chain

For each component in Step 2's chain, find every `useEngineStore` / `useFractalStore` call. For each call, record:

- The selector function (`s => s.X` or `s => s.X.Y` or `s => ({ a: s.a, b: s.b })` — note the shape).
- Whether it returns a primitive (cheap to bail) or a reference (needs shallow or stable identity).
- An estimate of how often the selected slice changes during dope-play (10/sec? 60/sec? 480/sec?). Cross-reference `dev/store/engineStore.ts` for which actions write to that slice and how often.

Output: a table per component, sorted by estimated tick-rate change frequency. Top of each table = most suspect.

### Step 4 — Add render-attribution instrumentation

For each candidate in the top-3 list across all components in the chain, wrap the subscription in a counter:

```ts
// Instrumentation pattern — temporary, throws away with the probe branch:
const liveModulations = useEngineStore(s => {
  (window as any).__probeCounts = (window as any).__probeCounts || {};
  (window as any).__probeCounts.liveModulations = ((window as any).__probeCounts.liveModulations || 0) + 1;
  return s.liveModulations;
});
```

Alternative if there are many candidates: monkey-patch `useEngineStore` itself in dev mode to track every selector call by stringified selector. Costs more in CPU but covers everything at once.

Re-run the bench (just `dope-play` to keep iterations fast). Read `__probeCounts` at the end of the scenario. The selector with the highest count during dope-play is the prime suspect.

### Step 5 — Test the hypothesis

For the top suspect, apply the smallest possible narrowing edit:

- If it subscribes to a full object (`s => s.liveModulations`), can it use a single field (`s => s.liveModulations[someKey]`) with default Object.is bail?
- If multiple fields are needed, split into multiple `useEngineStore` calls (each bails independently) — Zustand's `subscribeWithSelector` middleware makes this cheap.
- If the value is only needed for a live-readout DOM update (not React state), can it move to an imperative subscribe-and-mutate-ref pattern like `TrackRow.tick` already does for keyframe diamonds?

Re-run the bench. Capture before/after `Item:widget:formula-params` commit count and `totalActualMs`.

### Step 6 — Decide

**Pass criteria — small targeted fix is viable:**

- `Item:widget:formula-params` commit count drops by ≥50% in `dope-play`.
- The change is localised to ≤5 files.
- No visible regressions in the widget's behaviour (live values still update, keyframe button still works, slider drag still records).

**Partial pass — fix works but is broader:**

- Commit count drops by 20-50%, OR
- The fix requires changes across many components (every Slider, every panel) → it becomes a refactor in itself.

**Fail — engineStore narrowing is not the cause:**

- Commit count doesn't move. Re-run Step 3 for other components in the chain not yet covered (Dock, App, parent providers). If still nothing, the React-tree itself is re-rendering at tick rate — investigate React context providers or theme/help context.

### Step 7 — Findings doc

Write `08_ENGINE_PROBE_FINDINGS.md` adjacent to this prompt. Sections:

1. **Result line:** "Suspect identified + targeted fix viable" / "Suspect identified, fix is broader than expected" / "Suspect not engineStore — investigate X next".
2. **The chain.** The component chain found in Step 2.
3. **Subscription inventory.** Per-component table from Step 3 — what each subscribes to and at what rate.
4. **The smoking gun.** Which subscription accounted for the bulk of re-renders. Counter numbers from Step 4.
5. **Narrowing experiment.** What was tried in Step 5; before/after commit + ms.
6. **Recommendation.** Either: (a) ship the narrowing as a small PR (~5 files, ~1 week), or (b) escalate to the canvas-DopeSheet-first reordering in `06_SPIKE_FINDINGS.md` recommendation #2, or (c) further probe of a non-engineStore suspect.
7. **Worktree cleanup status.** Branch + worktree path; same retention rules as the first spike.

### Step 8 — Cleanup

Same as the first spike — the probe branch is a throwaway. The findings doc and the bench artefacts land on `dev`; the experimental code edits do not. If Step 6 hits the pass criteria, the actual fix is a separate small PR on `dev`, not a merge of the probe branch.

## Out of scope

- AnimationDocument, Player, Engine, ModulationRuntime, Recorder, AudioRuntime, AppHistory — none of these from `03_SPEC.md`.
- Canvas DopeSheet / GraphEditor work.
- Any change to the animation-store side.
- Migrating consumers off the existing slice.
- Building the suspect-narrowing fix into a PR. The probe identifies the fix; landing it is a separate piece of work.

## Pause points (surface for review)

- **After Step 2 (chain identified).** Confirm the chain matches what's expected before sinking effort into the subscription inventory.
- **After Step 4 (counters collected).** If no single subscription dominates, raise it before applying narrowing — the hypothesis is wrong somewhere and the next move is investigation, not edits.
- **Before Step 7.** Confirm the recommendation framing with the user before writing it as a binding output — the findings doc is what drives the next plan revision.

## Pre-flight before starting

- [ ] First spike's cleanup has landed (or is in flight in a parallel session): `06_SPIKE_FINDINGS.md` + `spike-*.json` artefacts committed to `dev`, bench instrumentation patches cherry-picked.
- [ ] Working from `dev` branch HEAD with no local WIP.
- [ ] Bench seed cache exists at `debug/bench-perf-timeline-seed.json` (saves ~25s per run).
- [ ] Worktree path `../dev-probe-engine-fanout` is free.

## Why this probe is sized right

The first spike took 2-3 days because it included a full bench setup + instrumentation discovery. This probe inherits all of that and changes one variable at a time. The investigation is bounded: there are only so many components in the panel chain, only so many engineStore subscriptions in each. A single day is enough to walk the chain, measure, narrow the top suspect, and produce a recommendation. If the day's not enough, the fail criteria fire and the recommendation is "investigate harder" rather than "guess."
