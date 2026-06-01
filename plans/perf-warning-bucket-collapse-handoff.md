# Handoff — Perf Warning (#6) + Bucket Preview Collapse (#4)

> **RESOLVED 2026-06-01 (session 2). Both fixed; awaiting owner visual check.**
> **#6 root cause = a MISSING MOUNT, not the fps value.** `<PerformanceMonitor/>`
> was mounted only in `components/ViewportArea.tsx:185`, which **app-gmt never
> renders** (its root is `app-gmt/AppGmt.tsx` via `ViewportFrame`). So the
> correctly-registered tick read the correct low `fpsSmoothed` but had no mounted
> consumer to receive `setShowWarning` → banner never appeared. Both prior fixes
> (register tick / read fpsSmoothed) were already correct; they just had no
> consumer. FIX: mounted `{!isBroadcastMode && <PerformanceMonitor />}` beside
> `<CompilingIndicator/>` in `AppGmt.tsx` (~L398). #4 fully done. A TEMP `[perfMon]`
> console diagnostic remains in `PerformanceMonitor.tsx` tick() for the owner's
> verification run — remove after the banner is confirmed. Details inline + in the
> SESSION 2 section below (note: that section's A/B fork is now resolved to A(i),
> the missing mount).

---

## ⚠️ ORIGINAL (SESSION 1) ANALYSIS BELOW — superseded; kept for the file:line map only
# (was) Handoff — Perf Warning (#6, UNRESOLVED) + Bucket Preview Collapse (#4, refinements pending)

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

---

## SESSION 2 UPDATE (2026-06-01) — #4 done; #6 re-diagnosed, instrumented

### #4 — bucket preview collapse: COMPLETE (pending owner visual check)
Both refinements + one bonus bug-fix applied in
`engine/plugins/topbar/BucketRenderPanel.tsx` (typecheck clean):
1. **Action row hidden while preview engaged.** The Refine/Preview/Export
   `<div className="flex gap-1.5">` now renders only when `!previewEngaged`.
2. **Purple "Picking preview" line during active picking.** New fuchsia status
   row shown when `interactionMode === 'selecting_preview' && !previewRegion`
   (mirrors the held-region "Preview" row), with a "drag on canvas to select" hint.
3. **Exit path preserved (the handoff caveat).** The header pill now shows for
   the whole `previewEngaged` window: "Exit Preview" with a region, "Cancel Pick"
   during active picking. **Bonus fix:** the Esc handler was gated on
   `previewRegion`, so it never fired during active picking — re-gated on
   `previewEngaged` so Esc now cancels an in-progress pick too (required, since
   the Preview toggle is now hidden).
4. **Padding polish.** The collapse chevron gets `-mb-2.5` only when collapsed so
   it sits flush with the popover's bottom padding; normal spacing when expanded.

### #6 — perf warning: PRIOR DIAGNOSIS WAS WRONG; here's the corrected map
**The two prior fixes are BOTH correctly in place and wired.** Verified this
session by reading the real (CRLF/BOM) files directly:
- `registerGmtUi()` **is** called at boot — `app-gmt/main.tsx:33` (import) + `:111` (call).
- It **does** register the probe tick — `engine-gmt/features/ui.tsx:185`
  `registerTick('performanceMonitorTick', TICK_PHASE.UI, performanceMonitorTick)`.
- `runTicks()` runs **all** registered ticks regardless of phase
  (`engine/TickRegistry.ts:150-152` — phase only affects sort order, there is NO
  phase filter). So the UI-phase tick executes every frame.
- The probe reads `state.fpsSmoothed` (`components/PerformanceMonitor.tsx:47`).
- The topbar **FpsCounter reads the identical value** — `useViewportFps()`
  (`engine/plugins/topbar/FpsCounter.tsx:15` → `engine/plugins/Viewport.tsx:166-170`
  → `s.fpsSmoothed`).

⚠️ **Discard the earlier Explore finding that "registerGmtUi() is never reached."**
That was a false lead — the agent's grep tool returned empty on the CRLF/BOM-encoded
files and it wrongly concluded the call was missing. It is present and correct.

**So the value the widget shows and the value the warning reads are the SAME field.**
That reframes the bug: it is NOT a "wrong fps source" problem — it's downstream of
the value. Two mutually-exclusive root causes remain, separable by ONE instrumented run:

- **(A) The owner genuinely sees LOW fps in the topbar counter** → then `fpsSmoothed`
  IS low → the probe reads it low too → the failure is downstream of the value:
  - (i) `PerformanceMonitor` not actually mounted in app-gmt's viewport layout, so
    `performanceState.setShowWarning` stays null (tick computes correctly but has no
    setter to flip). Handoff says it mounts at `components/ViewportArea.tsx:185`, but
    app-gmt may use its own viewport shell — **verify the mount in the app-gmt tree**
    (the `feedback_audit_app_gmt_blind_spot` class of miss). Could not confirm
    statically this session (tooling intermittently blocked on the dev path).
  - (ii) a suppression gate stuck true (`isIdle`: paused/scrubbing/hidden/compiling/
    exporting/`isAccumulationComplete`), or the 8s startup gate, or
  - (iii) the `lowFpsBuffer` threshold math.
- **(B) The counter actually reads ~60 at a 5fps render** → `fpsSmoothed` measures the
  main-thread `useFrame` loop, not render load. The ONLY `reportFps` caller in GMT is
  `engine-gmt/renderer/GmtRendererTickDriver.tsx:219` with `t.fps` = main-thread
  loop rate (frames / 500ms), dispatched to the worker WITHOUT blocking on render
  completion. In that case the robust fix is the **already-existing worker-frame
  signal**: `WorkerProxy` fires `_onWorkerFrame()` per real `FRAME_READY`
  (`engine-gmt/engine/worker/WorkerProxy.ts:256`), exposed via
  `registerFrameCounter(cb)` — currently **no live consumer** in dev (single-slot
  setter, so it's free). `debug/bench-perf.mts` already derives `workerFps` from this
  exact cadence. Wire a consumer that computes worker fps and have the probe warn on
  `min(fpsSmoothed, workerFps)` (or just workerFps).

**INSTRUMENTATION ADDED — run the heavy scene and read the console.**
`components/PerformanceMonitor.tsx` `tick()` now logs `[perfMon]` once per 500ms poll
while `fps < 30` (quiet at normal framerate). It prints: `fps`, `lowFpsBuffer`,
`isIdle`, every individual gate, `sampleCap`, `accumCount`, `startupGate`, and
**`hasSetter`** (= is the warning component mounted/wired). One run of the ~5fps scene
resolves the fork immediately:
- `hasSetter:false` → cause **A(i)** (mount the component / fix app-gmt wiring).
- a gate `true` or `fps ~5` but `buffer` not climbing → cause **A(ii)/(iii)**.
- `fps ~60` at a visibly slow render → cause **B** (wire `registerFrameCounter`).

It is marked `TEMP(#6 diagnostic — remove once confirmed)`. Remove after the fix.
A blind fix was deliberately NOT applied: two prior blind attempts already failed,
and A vs B prescribe opposite fixes — picking wrong = a third failed attempt.
