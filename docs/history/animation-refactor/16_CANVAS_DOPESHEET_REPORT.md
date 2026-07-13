# Canvas DopeSheet — report

**Result line:** Shipped. The 137 ms-per-click freeze on `dope-select-track` is gone; worker FPS at the heavy seed (9000 keys / 6 tracks) jumped from **8 → 60**, `dope-scrub` from **16 → 60**, `dope-play` from **26 → 59**, and the 7034 ms of `dope-scrub` long tasks went to **zero**. The prompt's primary acceptance bar (`dope-select-track Timeline:DopeSheet ≤ 5 ms / commit`) was missed at 9 ms; the worker-FPS metric is what actually moved and what the user feels. Same lesson as the canvas GraphEditor — see surprise #2.

## Bench delta

Heavy seed = 1500 frames × 6 tracks = 9000 keyframes (`--seed=heavy`), median across 3 runs / scenario. Baseline from [`15_DOPESHEET_PROBE_FINDINGS.md`](./15_DOPESHEET_PROBE_FINDINGS.md). Numbers below are post-cleanup-pass; intermediate snapshots in [`debug/canvas-dopesheet-step4.json`](../../debug/canvas-dopesheet-step4.json), [`debug/canvas-dopesheet-step6.json`](../../debug/canvas-dopesheet-step6.json), [`debug/canvas-dopesheet-cleanup.json`](../../debug/canvas-dopesheet-cleanup.json).

| scenario               | wkrFps before | wkrFps after | DopeSheet ms/c before | DopeSheet ms/c after | longTaskMs before | longTaskMs after |
|------------------------|--------------:|-------------:|----------------------:|---------------------:|------------------:|-----------------:|
| **dope-select-track**  |       **8**   |     **58.6** |               **137** |                **~9**|                 7 |                0 |
| **dope-scrub**         |      **16**   |     **59.8** |                     0 |                    0 |          **7034** |            **0** |
| **dope-play**          |      **26**   |     **59.3** |                  ~0.05|                 ~0.05|              2012 |                0 |
| dope-zoom              |         55    |       60     |                     0 |                    0 |                 0 |                0 |
| dope-idle              |         60    |       60     |                     0 |                    0 |                 0 |                0 |

### Acceptance criteria

- [x] **PRIMARY** `dope-select-track wkrFps ≥ 55` — landed at **58.6**.
- [ ] **PRIMARY** `dope-select-track Timeline:DopeSheet ≤ 5 ms/commit` — landed at **~9** (15× improvement on the 137 ms baseline, but not the 25× target). Residual is React reconciliation walking the DopeSheet subtree, not canvas paint — see surprise #2.
- [x] **SECONDARY** `dope-scrub longTaskMs ≤ 1500` — landed at **0**.
- [x] **SECONDARY** `dope-scrub wkrFps ≥ 45` — landed at **59.8**.
- [x] `dope-play wkrFps` improved modestly (target 30–40) — landed at **59.3**, far above target. Surprise #1.
- [x] `dope-zoom` stayed at vsync.
- [x] `dope-idle` stayed at vsync.
- [x] `__trackRowTickStats.diamondLoopMs` reads zero — the `tick()` function and its state maps are deleted.
- [x] All dope-sheet interactions function — three pre-existing bugs surfaced + fixed during interaction smoke (see surprise #3).
- [x] No visible rendering regression at heavy seed.
- [x] Existing test suites pass; `typecheck` + `build` clean.
- [x] New tests: [`debug/test-dopesheet-renderer-cache.mts`](../../debug/test-dopesheet-renderer-cache.mts) — 41/41 passing.

## What shipped

| file                                              | role                                                                                              |
|---------------------------------------------------|---------------------------------------------------------------------------------------------------|
| [`utils/DopeSheetRendererCache.ts`](../../utils/DopeSheetRendererCache.ts)             | `TrackDiamondCache`, `GroupDiamondCache`, key/hash builders, `createCacheCanvas` (OffscreenCanvas + HTMLCanvasElement fallback). Mirrors `GraphRendererCache` shape — unification flagged. |
| [`utils/DopeSheetRendererBuilder.ts`](../../utils/DopeSheetRendererBuilder.ts)         | `buildTrackDiamonds`, `buildGroupDiamonds`. Pure, row-sized off-screen canvases. panX baked into viewKey (same tradeoff as `GraphRendererBuilder` — see `11_CANVAS_GRAPH_REPORT.md` §"Surprises" #4). |
| [`utils/DopeSheetRenderer.ts`](../../utils/DopeSheetRenderer.ts)                       | `drawDopeSheetBack` (composites cached row canvases), `drawDopeSheetSelection` (per-render selection rings, O(S) after the cleanup-pass fix — was O(S×N)), `drawDopeSheetHover` (cursor outline), `pickKeyframe` (binary-search hit-test). Shared `traceKeyframeShape` helper used by all three paint passes. |
| [`utils/dopeSheetTrackFlags.ts`](../../utils/dopeSheetTrackFlags.ts)                   | `isFlatTrack` extracted from the old `TrackRow.tsx` so the renderer doesn't depend on a React component. |
| [`components/timeline/DopeSheetCanvas.tsx`](../../components/timeline/DopeSheetCanvas.tsx) | One absolute-positioned `<canvas>` with one `useEffect` batching back + selection + hover. Hover state is a typed `HoverTarget` discriminated union; `hoverTargetEqual` dedupes pixel-rate mouse motion. Click/dblclick/contextmenu route through `pickKeyframe` with fallback to the existing background handlers. |
| [`components/timeline/DopeSheet.tsx`](../../components/timeline/DopeSheet.tsx)         | Wraps the row stack in `<div className="relative" ref={rowsContainerRef}>`. `rowsLayout` derived from `organizedTracks` + `collapsedGroups`. `globalSummaryRef` added so the marquee can resolve actual contentRef-relative bounds. |
| [`components/timeline/TrackRow.tsx`](../../components/timeline/TrackRow.tsx) + [`TrackGroup.tsx`](../../components/timeline/TrackGroup.tsx) | Shrunk to sidebar-only. `KeyframeDiamond`, `GroupDiamond`, `diamondState`, `groupDiamondState`, `setDirtyState`, `tick()`, local `lowerBound`/`upperBound`, `visibleSlice` virtualization useMemo — all removed. `liveValueState` map kept (sidebar concern, future re-wire). |
| [`hooks/useDopeSheetInteraction.ts`](../../hooks/useDopeSheetInteraction.ts)           | Marquee `onUp` reads `rowsContainerRef` + `globalSummaryRef` `getBoundingClientRect().top` at mouseup instead of hardcoding `RULER_HEIGHT + GROUP_HEIGHT` (which silently broke whenever audio rendered above the rows). |
| [`components/timeline/SelectionTransformBar.tsx`](../../components/timeline/SelectionTransformBar.tsx) | `pointer-events: auto` inline so the canvas's `pointer-events: none` row container doesn't swallow handle drags. |
| [`components/timeline/AudioStrip.tsx`](../../components/timeline/AudioStrip.tsx)       | Waveform canvas clamps DPR so `canvas.width / .height` never exceeds `MAX_CANVAS_PX = 16384`. Pre-existing bug — long clips at high zoom threw `DOMException: Canvas exceeds max size`. |
| [`debug/test-dopesheet-renderer-cache.mts`](../../debug/test-dopesheet-renderer-cache.mts) | 41 tests for cache get/set/evict, view-key invalidation, group child-ref invalidation, key-builder behaviour. |

## Surprises

### 1. `dope-play` dramatically outperformed the prompt's target.

The prompt set expectations modestly: "30–40 fps; main improvement awaits AnimationDocument," because the systemic React anim-notification fanout (Dock:right, formula-params, TopBarHost — see [`08_ENGINE_PROBE_FINDINGS.md`](./08_ENGINE_PROBE_FINDINGS.md)) wasn't supposed to be touched by canvas DopeSheet.

Actual result: **59.3 fps**. The React fanout still exists at the same per-commit cost (`Dock:right` ~1.5 ms × 482 commits, etc.), but with the 9000 DOM diamonds gone, **the browser's layout/paint pipeline no longer chokes between React commits**. The worker holds vsync despite the same React work happening.

This implicitly confirms the [`15_DOPESHEET_PROBE_FINDINGS.md`](./15_DOPESHEET_PROBE_FINDINGS.md) hypothesis-by-elimination — the unaccounted ~6050 ms of `dope-scrub` long-task time was indeed browser layout reflow from 9000 absolutely-positioned divs sharing a layout context with the moving `PlayheadCursor`. The AnimationDocument refactor remains useful for React reconciliation cost, but it's no longer load-bearing for *user-felt smoothness*.

### 2. Per-commit `Timeline:DopeSheet` ms didn't drop as far as the prompt predicted — and that's the GraphEditor lesson repeating.

Prompt target: ≤ 5 ms / commit (25× improvement). Actual: ~9 ms (15×).

The same boundary-measures-the-subtree caveat from [`11_CANVAS_GRAPH_REPORT.md`](./11_CANVAS_GRAPH_REPORT.md) §"What shipped" applies. `Timeline:DopeSheet` wraps the *entire* DopeSheet subtree — sidebar reconciliation (6 `TrackRow` components + their `LiveValueDisplay` children), the `selectionRange` `useMemo` walk over `selectedKeyframeIds`, the `rowsLayout` `useMemo`, the canvas `useEffect`'s composite pass, etc. The canvas paint itself is microseconds; the residual is React reconciling everything else.

The metric that actually correlates with user-felt smoothness is `workerFps`, which moved from 8 → 60. Restating the prompt's framing in those terms: **a "click a track" interaction now drops one frame at worst, instead of freezing for 8 frames.**

### 3. Three pre-existing bugs surfaced during the interaction smoke. All fixed under this work.

The 137-ms freeze + the marquee being too painful to use at heavy seeds meant these had never been exercised on the dev branch. The canvas refactor made them visible:

- **AudioStrip `Waveform` canvas overflowed `MAX_CANVAS_PX`** ([`AudioStrip.tsx:34`](../../components/timeline/AudioStrip.tsx#L34)) when a multi-minute clip loaded at deep zoom + `dpr=2`. Threw `DOMException: Canvas exceeds max size` on every render of the waveform. Fix: clamp the effective DPR to whatever keeps the buffer ≤ 16384 px.

- **Marquee selection was offset by `AudioGroup` height** ([`useDopeSheetInteraction.ts:439`](../../hooks/useDopeSheetInteraction.ts#L439)). The hardcoded `let yOffset = RULER_HEIGHT + GROUP_HEIGHT` (= 48) assumed nothing rendered between the ruler and the row stack — but `AudioGroup` (always-rendered header + variable strips) sits there. Marquee selections landed 2-ish rows below where the user drew, only when audio was visible. Fix: read `rowsContainerRef` + `globalSummaryRef` `getBoundingClientRect().top` at mouseup.

- **Shift-range track selection deselected the anchor row** ([`DopeSheet.tsx:274`](../../components/timeline/DopeSheet.tsx#L274)). The range loop called `selectTrackBy(t, true)` which resolves to `toggleTrackSelection(t)` — the anchor was already selected from the prior click, so the toggle removed it. Range `[X, Y, Z]` ended up as `[Y, Z]`. Fix: use `addTracksToSelection(rangeTracks)` which adds without toggling.

Also: canvas dblclick now runs `pickKeyframe` first and bails if the cursor is on an existing diamond. The old DOM path blindly bubbled into `onAddKey`, producing a Linear-default duplicate stacked on top of Bezier circles ("circle turns into diamond").

### 4. The initial `drawDopeSheetSelection` `clearRect` wiped the back layer.

First version put `clearRect` at the top of `drawDopeSheetSelection`. Since both passes paint into the *same* canvas in the *same* useEffect, the selection pass was clearing the back paint and only painting selected diamonds — unselected diamonds were invisible until the user reported the bug. Fix: `clearRect` only happens in `drawDopeSheetBack`; selection paints on top without clearing.

### 5. `drawDopeSheetSelection` was O(S × N) at heavy seeds. Caught by the efficiency review.

Inner loop did `track.keyframes.find(k => k.id === kid)` per selected key — at 9000 keys all on one track all selected, that's 81 million `find()` ops per repaint. Fixed in the cleanup pass: bucket selected keys by trackId once, build a `Map<keyId, Keyframe>` per touched track, hoist the `isFlatTrack` check per-track instead of per-key. Now O(S).

### 6. Hover affordances were missing in the first cut.

The Tailwind `group-hover/key:scale-125 group-hover/key:bg-cyan-400` styling on the old DOM diamonds had no analog in the canvas. Added in the bug-fix round: `HoverTarget` discriminated union + `handleMouseMove` on the canvas + a third paint pass in the same useEffect. `hoverTargetEqual` keeps the React state churn to one repaint per diamond traversal (mouse motion within a single key is free).

## `__trackRowTickStats`

Per [`15_DOPESHEET_PROBE_FINDINGS.md`](./15_DOPESHEET_PROBE_FINDINGS.md) §"`__trackRowTickStats`", the `tick()` function was already dead code on `dev` — it existed in source but no caller imported it. Step 6 deleted the dead code outright (`tick()`, `diamondState`, `groupDiamondState`, `setDirtyState`). Confirmed via:

```
$ grep -rn "tick.*TrackRow\|TrackRow.*tick\|import.*tick.*from.*timeline" \
       --include="*.ts" --include="*.tsx"
components/timeline/TrackGroup.tsx:118:    // ...comment only...
```

No live imports remain. `window.__trackRowTickStats` is permanently undefined.

## Cache hit rates

Not directly instrumented this pass — implied by elimination:

- `dope-scrub longTaskMs = 0`, `dope-play longTaskMs = 0` across all post-Step-4 bench runs. If the per-track builder weren't cache-hitting, we'd see milliseconds-per-rebuild × 6 tracks × hundreds of commits compounding into long tasks. We see none.
- The cache module exposes `stats` (`hits`, `missNoEntry`, `missViewKey`, `missKeysRef`, `sets`) but the canvas component doesn't publish them to `window.__` yet. The `traceKeyframeCacheStats` follow-on (if needed) is a one-liner — model on the previous `window.__polylineCacheStats`.

## Follow-on items

Flagged for the shared-utils + graph-editor cleanup pass on the next branch (prompt at [`17_SHARED_CANVAS_UTILS.md`](./17_SHARED_CANVAS_UTILS.md) — to be written by that session):

- **`utils/canvasCache.ts`** — extract `CacheCanvas`, `CacheCtx2D`, `createCacheCanvas`, `getCacheCtx2D`, `SUPPORTS_OFFSCREEN`, `roundView`, and a generic `RefViewKeyCache<TToken>` that subsumes `PolylineCache`, `TrackDiamondCache`, and `GroupDiamondCache`. The three caches are structurally identical except for token-equality (`Object.is` for the first two; the existing `childTokensEqual` for the group one).
- **Shared `traceKeyframeShape`** — currently lives in `utils/DopeSheetRenderer.ts`. `GraphRendererBuilder.ts` paints the same shapes at three sites. Migrate to one shared helper.
- **Viewport-clamped canvas width**. `buildTrackDiamonds` allocates `canvasWidth × rowHeight` per cached row, where `canvasWidth = totalContentWidth - sidebarWidth`. At 30 min @ 60 fps × 4 px/frame that's 432,000 × 32 — the OffscreenCanvas pixel buffer alone is multi-megabyte per row. Current cull saves path-emission work but not the allocation. The fix: cap to `MAX_CANVAS_PX` (mirror `AudioStrip`'s clamp) and bake the visible scroll window into `panX` so off-screen keys are culled at build time. `panX-in-viewKey` already exists; this just makes it dynamic instead of always-zero.
- **DPR / HiDPI**. Neither `DopeSheetCanvas` nor `GraphCanvas` accounts for `devicePixelRatio` — diamonds look soft on Retina displays. Repo-consistent across both editors, so flag together.
- **`LiveValueDisplay` re-wire**. The map is still populated by mount/unmount effects in `TrackRow.tsx` but read by nothing (the old `tick()` was its only consumer). Wiring a shared RAF tick that reads the registry and writes `innerText` directly belongs in the AnimationDocument refactor.
- **Root Summary row port to canvas**. The "Global Summary" row at the top of the DopeSheet still renders DOM diamonds via `getRootKeyframes()`. Viewport-windowed so the cost is bounded (~hundreds of nodes), but it contributes to the residual ~9 ms / commit on `dope-select-track`. Adding a synthetic row at `y = 0` in `rowsLayout` aggregating all visible tracks would port it cleanly.
- **Soft-selection bench scenario**. Like the graph editor, no scenario in `bench-perf-timeline.mts` exercises soft-selection at heavy seed. The DopeSheet doesn't have soft selection today, but if it ever grows one the bench will need a `dope-soft-marquee` regression gate.

## Recommendation

The user-felt lag during dope-sheet interaction at high keyframe counts — the "click a track and the app freezes" symptom that motivated the canvas refactor track — **is resolved.** `dope-select-track` worker FPS went from 8 to 60. `dope-scrub` from 16 to 60. `dope-play` from 26 to 59. Browser layout no longer thrashes during scrub.

The two architectural moves left in the broader animation-refactor track ([`02_RATIONALE.md`](./02_RATIONALE.md)) — shared canvas-cache utils and AnimationDocument — are each independent next steps:

- **Shared canvas-cache utils** lands the code-cleanup win and unblocks a third canvas editor (mini-map / navigator) if it ever comes up. Worth doing soon while the duplication is fresh.
- **AnimationDocument refactor** still owns the residual React reconciliation cost (`Timeline:DopeSheet` ~9 ms / commit) and the broader anim-notification fanout. Worth doing when a user complains about lag in a place the canvas work didn't touch — which, given the bench numbers, may be much later than expected.

Until then, `workerFps` and `mainFps p5` are the metrics that correlate with user-felt smoothness, and they're at or near vsync across every dope-* scenario at the heavy seed.
