# Handoff — Perf Warning (#6, UNRESOLVED) + Bucket Preview Collapse (#4, refinements pending)

> Created 2026-06-01 at end of a long session. Two items from a testing-issues
> batch are not finished and are handed to a fresh session. **The rest of that
> batch is done + owner-verified — see "Done, don't redo" below.**

---

## #6 — Low-FPS performance warning NEVER appears (UNRESOLVED, needs the running app)

**Symptom (owner-tested):** loaded a heavy scene running at ~5 FPS, with adaptive
resolution **both off and on**, and tried hiding panels — the red low-FPS warning
banner never appears.

**Where it lives:** `components/PerformanceMonitor.tsx`
- `export const tick = ()` (~L30): the FPS probe. Polls every 500ms; on sustained
  low FPS it calls `performanceState.setShowWarning(true)`.
- The `PerformanceMonitor` component (~L107) renders the banner only when its local
  `showWarning` is true; it wires its `setShowWarning`/`setCurrentFps` into the
  module-level `performanceState` object (~L135). Returns null when `!showWarning`.
- Mounted at `components/ViewportArea.tsx:185` (`{!isCleanFeed && <PerformanceMonitor/>}`).

**What was already tried (still doesn't work):**
1. **Commit `8d6d11d`** — registered the tick: `tick()` was exported but **never
   registered** with the TickRegistry, so it never ran. Added
   `registerTick('performanceMonitorTick', TICK_PHASE.UI, performanceMonitorTick)`
   in `engine-gmt/features/ui.tsx` (`registerGmtUi()`). → still didn't appear.
2. **Current working-tree change (committed as wip below)** — switched the FPS
   source from the tick's own call-cadence (which measured the ~60fps main-thread
   loop, never the heavy worker render) to the engine's canonical
   **`state.fpsSmoothed`** (the value the FPS counter shows + adaptive res acts on).
   → still didn't appear at 5 FPS.

**This cannot be solved by static analysis — INSTRUMENT IT.** Add temporary logging
in `tick()` and run the 5 FPS scene. Log, each poll: (a) that the tick fired at all,
(b) `state.fpsSmoothed` (is it really ~5, or stuck ~60?), (c) every term of `isIdle`
(`isPaused`, `isScrubbing`, `document.hidden`, `engine.isCompiling`,
`performanceState.isExporting`, `isAccumulationComplete`), (d) `lowFpsBuffer`, (e)
whether `performanceState.setShowWarning` is non-null. The logs will pinpoint which
of these is the culprit:

- **Hypothesis A — the tick still isn't running.** Verify the **UI** tick phase
  actually executes: `engine-gmt/renderer/GmtRendererTickDriver.tsx` calls
  `runTicks()` at ~L224 and ~L229 (comment says SNAPSHOT→ANIMATE→OVERLAY→UI). Confirm
  `runTicks` iterates UI-phase ticks, and that `registerGmtUi()` runs at boot before
  the driver. If A is true → register in a phase that's known to run (e.g. OVERLAY).
- **Hypothesis B — `fpsSmoothed` doesn't reflect the real low FPS.** `reportFps` is
  fed `t.fps` from the tick driver (`viewport.reportFps(t.fps)` ~L219), which is the
  driver-LOOP rate. If that loop stays ~60 while only the worker is slow,
  `fpsSmoothed` ≈ 60 and the warning never fires. If so, the correct low-FPS signal
  is elsewhere — likely **adaptive state**: warn when `qualityFraction` is pinned at
  its floor (`adaptiveConfig.minQuality`, default 0.25) — i.e. adaptive downscaled as
  far as it can and still can't keep up. (`engine/plugins/Viewport.tsx` exposes
  `fps`/`fpsSmoothed`/`qualityFraction`; `engine/AdaptiveResolution.ts` is the loop.)
  NOTE owner said it also fails with adaptive OFF — with adaptive off, `qualityFraction`
  stays 1 and `fpsSmoothed` should equal the real loop fps, so check what `fpsSmoothed`
  actually reads at 5fps.
- **Hypothesis C — startup/gate.** `else if (now < 8000)` uses `now = performance.now()`
  (page-load-relative) — fine after 8s, but double-check. `isAccumulationComplete =
  sampleCap>0 && accumulationCount>=sampleCap`: during a *moving/accumulating* 5fps
  scene this is false (good), but if the scene is converged-but-slow it'd suppress.
- **Hypothesis D — mount/render.** Confirm `setShowWarning(true)` actually triggers a
  re-render (the component holds the setter via `performanceState`; verify it's the
  live setter, not a stale one), and that the banner isn't rendered off-screen/behind
  (it's `absolute top-2 right-4 z-50`).

**Likely answer:** B — the probe measures the main-thread loop, not real render load,
so neither the original nor `fpsSmoothed` ever reads low unless the *loop* is slow.
The robust fix is probably to key the warning off **adaptive being pinned at its
quality floor** (genuine "can't keep up") rather than a raw FPS number. Confirm with
the instrumentation first.

**Key files:** `components/PerformanceMonitor.tsx`,
`engine-gmt/features/ui.tsx`, `engine-gmt/renderer/GmtRendererTickDriver.tsx`,
`engine/plugins/Viewport.tsx`, `engine/AdaptiveResolution.ts`,
`components/ViewportArea.tsx`. (Minor: the `fpsSmoothed` switch left
`performanceState.frameTimestamps` unused — tidy when reworking.)

---

## #4 — Bucket-render preview collapse (improved; two refinements pending)

**Owner feedback on the current behaviour:**
1. **During preview & picking, the Refine/Preview/Export action line should NOT be
   visible.** (It's the `<div className="flex gap-1.5">` row, ~L595-634 in
   `engine/plugins/topbar/BucketRenderPanel.tsx`.) Hide it when `previewEngaged`.
   ⚠ Make sure the user can still EXIT picking when the action row is hidden — the
   header "Exit Preview" button only shows when `previewRegion` is set; during *active
   picking* (no region yet) the exit path is Esc or the Preview toggle. Confirm there's
   a visible way out, or keep a minimal exit affordance.
2. **During picking (`interactionMode === 'selecting_preview'`), show the purple
   "Picking preview" line.** Currently the purple status row (~L573-593) renders only
   when `state.previewRegion` is set — so during active picking (before a region
   exists) there's no purple indicator. Add one for the picking state.

**Current state (this is an improvement over the WRONG version committed in `dfff07e`,
which collapsed the *entire panel incl. the picking UI*):** only the SETTINGS block
(convergence / max samples / output size / tile grid / bucket size — the
`<div className="space-y-2.5">`) collapses behind a single centred toggle chevron
while `previewEngaged`; the header, status, and action row stay. State:
`previewExpanded` (local, default false), `previewEngaged = interactionMode ===
'selecting_preview' || !!previewRegion`, reset to collapsed when disengaged.

**File:** `engine/plugins/topbar/BucketRenderPanel.tsx`.

---

## Done + owner-verified — DO NOT redo
- **#5** accumulation now stops at the sample cap (`8d6d11d`, `app-gmt/renderDialogExtras.tsx`
  cleanup restored the cap instead of resetting to 0). ✅
- **#7** snapshots capture the render canvas via `id="gmt-render-canvas"` (`8d6d11d`). ✅
- **#3** Render-Sequence setup window taller (340×624) (`dfff07e`, `app-gmt/main.tsx`). ✅
- **Naming** Undo/Redo Camera Move · View Camera Manager · High-Res Render (`8d6d11d`). ✅
- **create→share polish rounds 1–3** — toast system, PNG drag-drop reopen, save/export
  feedback, unsaved-work guard (autosave/beforeunload/dirty), first-run hint, gallery
  discoverability, mobile menu dismiss, modal-close standardization, useDismiss unify
  (`3e5f122`, `386dcb2`, `3745970`). ✅ Review + findings in
  `plans/create-share-polish-review.md`.

## Toolchain note
`npm run typecheck` works (local TS 5.9.3). Earlier it was broken by a missing
`node_modules/.bin` + a stale global tsc; fixed via `npm install`. Global tsc is now
6.0.3. If `npm run typecheck` shows mass `import type` parse errors again, run
`npm install` (see memory `project_dev_toolchain_global_tsc`).
