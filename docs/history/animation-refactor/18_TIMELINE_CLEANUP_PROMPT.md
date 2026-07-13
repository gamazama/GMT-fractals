# Timeline canvas cleanup pass — Root Summary → canvas + pre-canvas dead-code sweep + top-region structural

**Purpose:** finish the canvas track. Three coupled pieces of work that together remove the last DOM-diamond holdout in the DopeSheet, sweep dead code that the GraphEditor and DopeSheet canvas refactors orphaned, and reorganise the timeline-top region so the layout is coherent (no more "what y-offset is the rows container at, exactly?" bugs like the one fixed under `472444d`).

**Status:** ready for fresh session. Pre-push cleanup; the user wants this landed before pushing 33+ commits to `github/dev`. Then `19_OFFLINE_MODULATION_BAKE_PROMPT.md` (the deferred (3) item) becomes the next piece of work.

**Estimated effort:** 1-2 days. Bounded by file count, not new design.

## Read first

1. **[`16_CANVAS_DOPESHEET_REPORT.md`](./16_CANVAS_DOPESHEET_REPORT.md)** §"Follow-on items" — the `Root Summary row port to canvas` bullet is the exact scope of part 1.
2. **[`17_SHARED_CANVAS_UTILS.md`](./17_SHARED_CANVAS_UTILS.md)** — pattern reference for the kind of "tiny PR, removes more LOC than it adds" cleanup this aims to be.
3. **The code under test:**
   - `dev/components/timeline/DopeSheet.tsx` — the Global Summary DOM block lives at roughly lines 418-449 (`{/* ROOT SUMMARY ROW */}`); `getRootKeyframes()` is the helper that feeds it. `selectionRange` useMemo at line 200 walks `selectedKeyframeIds` for the SelectionTransformBar inside the Global Summary; that walk stays useful but the surrounding DOM block goes.
   - `dev/components/timeline/TrackRow.tsx` — should be sidebar-only after Step 6 of the canvas DopeSheet work. Verify and remove any remaining pre-canvas residue (especially the `liveValueState` map flagged in `16_REPORT` follow-ons as "still populated but read by nothing").
   - `dev/components/timeline/TrackGroup.tsx` — same as TrackRow, header + sidebar only.
   - `dev/components/timeline/DopeSheetCanvas.tsx` — adds one row to `rowsLayout` for the synthetic Root Summary; uses `buildGroupDiamonds` with the union of all visible tracks' keyframes.
   - `dev/utils/DopeSheetRenderer.ts` + `DopeSheetRendererBuilder.ts` — `buildGroupDiamonds` already aggregates child keyframes; the Root Summary case is the same shape with "all visible tracks" as the children.
   - `dev/components/GraphEditor.tsx` + `dev/utils/GraphRenderer.ts` + `dev/utils/GraphRendererBuilder.ts` — the shared-utils cleanup commit (`ad6d62b`) already removed `currentFrame` / `selectionBox` / `POLYLINE_THEME`. Sweep for anything else: unused imports, dead exports, leftover helpers that no longer have callers.
   - `dev/utils/timelineUtils.ts` — may contain helpers that lost their callers when the canvas refactors landed; check.

## Three parts

### Part 1 — Root Summary row port to canvas (~0.5 day)

Currently the DopeSheet renders a `Global Summary` DOM row at the top of the rows container (above the regular `TrackGroup` / `TrackRow` blocks). It shows one cyan-bordered diamond per unique frame across all visible tracks. After this pass it becomes a synthetic row in `rowsLayout` rendered by the canvas.

- Add a synthetic row entry to `rowsLayout` at `y = 0` (or wherever it currently lives in the DOM stack — keep the visual position identical).
- The "children" of this row are `Object.values(sequence.tracks).filter(!hidden).map(t => t.keyframes)` — same logic as the old `getRootKeyframes()`.
- Reuse `buildGroupDiamonds` (it already takes a `childKeyframesList` and unions the frames). The cache key includes a stable child-token list, so it invalidates when any visible track's keyframes ref changes — same correctness contract as the existing GroupDiamondCache use.
- Delete the entire DOM Global Summary block in `DopeSheet.tsx`: the JSX (`{/* ROOT SUMMARY ROW */}` through its closing `</div>`), the `getRootKeyframes()` helper, the `cyan-600 border-cyan-300` diamond styling.
- The Global Summary's `SelectionTransformBar` overlay stays (it's a real interaction handle, not a diamond). Move it onto the canvas's row at the same y-coordinate via the existing `selectionRange` useMemo.
- `globalSummaryRef` (added in the canvas DopeSheet work for marquee bounds resolution) can stay or move to the canvas's row container — whichever keeps the marquee y-offset logic clean.

The hit-test continues to work because `pickKeyframe` already walks `rowsLayout` rows top-to-bottom; the synthetic row is one more entry.

### Part 2 — Pre-canvas dead-code sweep (~0.5-1 day)

Grep + delete pass. Don't be precious; if a symbol is unreferenced anywhere, it goes.

**DopeSheet residue to check:**
- `liveValueState` map in `TrackRow.tsx` — `16_REPORT` follow-ons confirm it's populated by mount/unmount effects but read by nothing (the old `tick()` was its only consumer; that was deleted in Step 6). Remove the map, the populating effects, the unused import.
- Any `KeyframeDiamond` / `GroupDiamond` import that's still present after the canvas refactor.
- `setDirtyState` helper if any vestige remains.
- The `groupDiamondState` export from `TrackRow.tsx` if anything still references it (should be deleted but verify).
- Unused imports in `DopeSheet.tsx` / `TrackRow.tsx` / `TrackGroup.tsx` (whatever IDE/linter flags).
- `getLiveValue` calls — confirm they're still serving the sidebar `LiveValueDisplay` (which is the only legitimate caller post-refactor). Anywhere else: dead.

**GraphEditor residue to check:**
- The shared-utils cleanup commit (`ad6d62b`) already dropped a few obvious ones. Sweep for anything missed: dead exports in `GraphRenderer.ts`, helpers in `GraphRendererBuilder.ts` that lost callers when the cache infrastructure unified them, etc.
- `utils/timelineUtils.ts` helpers — many of these were written for the DOM-diamond era. `evaluateTrackValue` and `getLiveValue` still have legitimate consumers; others may not. Grep each export for callers, delete the unreferenced.

**Grep patterns to run from `dev/`:**
- `grep -rn "Diamond\|diamondState\|liveValueState\|getRootKeyframes\|setDirtyState\|groupDiamondState" --include="*.ts" --include="*.tsx"` — find every leftover reference.
- `grep -rn "TrackRow\.tick\|tick.*TrackRow" --include="*.ts" --include="*.tsx"` — verify the `tick()` deletion stuck.
- For each exported function in `timelineUtils.ts`, `grep -rn "<name>"` to find live callers. Anything with zero hits is dead.
- For each module-level constant or theme color tied to diamond styling, find callers.

Each deletion should be small and obvious. If a deletion turns out non-trivial (e.g., a helper is referenced from a file you weren't expecting), flag it in the report rather than getting clever about preserving it.

### Part 3 — Top-region structural pass (~0.5 day, optional polish)

Currently the DopeSheet's top region is a stack of independent DOM blocks: `TimelineRuler` → `PlayheadCursor` → `selectionBox` overlay → `AudioGroup` → (after Part 1: removed Global Summary block) → row stack. The marquee y-offset bug (`16_REPORT` Surprise #3) was caused by hardcoded assumptions about what sits between the ruler and the rows; the canvas DopeSheet pass replaced the hardcode with `getBoundingClientRect()` at mouseup, which works but is a workaround.

Tighten it. Two options, pick the one that fits cleaner:

**Option A (minimal):** leave the layout as-is; just verify the `globalSummaryRef` / `rowsContainerRef` references in `useDopeSheetInteraction.ts:439` no longer reference the (now-deleted) Global Summary block. Update them to point at whatever's actually there post-Part-1.

**Option B (cleaner):** introduce a `TimelineRegions` lightweight wrapper that owns the y-coordinates of (audio | global-summary | rows) in one place. Marquee logic asks the wrapper for "the y of the first track row" rather than reading boundingClientRects scattered across refs. Slightly more work; bigger payoff if the audio strip ever grows multi-row or if a future "regions" toggle (hide audio, hide summary, etc.) appears.

If Part 3 starts looking like more than half a day, defer it to a future pass — the bench numbers are already at vsync and this is polish.

## Acceptance criteria

- [ ] Root Summary DOM block removed from `DopeSheet.tsx`; equivalent renders as a synthetic canvas row.
- [ ] `getRootKeyframes()` helper deleted.
- [ ] `liveValueState` map + its populating effects deleted from `TrackRow.tsx`.
- [ ] `grep -rn "Diamond\|diamondState\|liveValueState\|getRootKeyframes\|setDirtyState\|groupDiamondState"` returns only comment hits (or the canvas-builder `*DiamondCache` references which are legitimate post-refactor names).
- [ ] No unused exports in `utils/GraphRenderer.ts`, `utils/GraphRendererBuilder.ts`, `utils/GraphRendererCache.ts`, `utils/DopeSheetRenderer.ts`, `utils/DopeSheetRendererBuilder.ts`, `utils/DopeSheetRendererCache.ts`, `utils/timelineUtils.ts`.
- [ ] `typecheck` clean; existing tests pass; `bench-perf:timeline --seed=heavy` shows all scenarios within ±1 fps of `canvas-dopesheet-cleanup` baseline.
- [ ] Net LOC delta is negative (cleanup should remove more than it adds).
- [ ] Marquee selection, drag, keyframe edit, audio strip, all dope-sheet interactions still work — full smoke including: clicking the Global Summary row's keyframes opens the same context menu as before; clicking deselects the same way; the transform bar still appears when ≥2 keys are selected.
- [ ] No visible rendering regression. Global Summary cyan-bordered diamond style preserved (the canvas builder should render the same colours — verify visually).

## Out of scope

- AnimationDocument refactor.
- Per-track Zustand subscription work.
- Audio interaction features (volume, scrubbing preview, etc.). The "audio cleanup" intent of this pass is structural (top-region layout), not feature work — audio behaviour is unchanged.
- Offline modulation bake (next prompt: `19_OFFLINE_MODULATION_BAKE_PROMPT.md`).
- HiDPI/DPR pass (separate follow-on noted in `16_REPORT` + `17_REPORT`).
- Viewport-clamped canvas width (separate follow-on).
- Anything that requires new design — this is a cleanup pass, not a redesign.

## Pause points (surface for review)

- **After Part 1 (Root Summary on canvas).** Visual diff: open the dope sheet at the heavy seed, scroll/zoom around, confirm the cyan summary diamonds appear in the same positions and visual style as before. Bench checkpoint: dope-* scenarios still at vsync.
- **After Part 2 grep sweep (before deletion).** Show the user the list of "would delete" symbols before actually deleting, so anything load-bearing-in-a-non-obvious-way gets flagged. Some `timelineUtils.ts` exports might have callers in fluid-toy / fractal-toy / app-gmt's main paths that the obvious grep misses.
- **After full deletion.** Re-run typecheck + bench + full interaction smoke before considering done.

## Pre-flight

- [ ] On a fresh branch: `feature/canvas-cleanup`.
- [ ] On `dev` HEAD (currently `a544db3` — index + corrections after both canvas merges).
- [ ] `npm run typecheck` passes.
- [ ] `bench-perf:timeline --seed=heavy` captured as the comparison baseline at `debug/canvas-cleanup-baseline.json`.

## Report doc structure

Write `20_TIMELINE_CLEANUP_REPORT.md` adjacent. (Number 19 is reserved for `19_OFFLINE_MODULATION_BAKE_PROMPT.md`, the next planned piece of work.)

Sections:
1. **Result line:** "Cleanup shipped. Net LOC delta: -N. Bench parity confirmed."
2. **Bench delta** — should be flat within noise. Anything that moves > ±1 fps deserves a "why."
3. **What was removed** — file-by-file list of deletions.
4. **What survived** — anything that looked like dead code but turned out to have a non-obvious caller; document the caller so the next cleanup pass doesn't fall into the same trap.
5. **Top-region structural** — Option A or Option B taken, with rationale.
6. **Spec amendments** — none expected.
7. **Push readiness** — the original goal. Confirm `npm run typecheck` + `npm run test:shader` + bench all clean. Ready to `git push origin dev`.

## Why this is the right pre-push checkpoint

The canvas work shipped fast across two consecutive sessions. Both reports flagged follow-on cleanup; both correctly chose to defer it to keep momentum on the user-visible win. Now that the wins are landed and the user is ready to push, doing the cleanup as a coherent pass — rather than letting it accumulate as drift over the next year — keeps the codebase legible. Net negative LOC + bench parity means the cleanup is itself a small architectural payment, not just bookkeeping.

Push after this lands. Then `19_OFFLINE_MODULATION_BAKE_PROMPT.md` becomes the next piece of work, scoped against the new "all dope-* + graph-* at vsync" baseline.
