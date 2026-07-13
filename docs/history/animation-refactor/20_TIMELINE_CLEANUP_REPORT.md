# Timeline canvas cleanup — report

**Result line:** Cleanup shipped. Net LOC delta: **-27** (across 7 files: +90 / -117). Bench parity confirmed at heavy seed (10/10 scenarios within ±1 fps of `canvas-cleanup-baseline`, `longTaskMs = 0` everywhere). `tsc --noEmit` clean; `knip` introduces no new orphans; cache tests pass (41/41 dopesheet, 28/28 graph).

## Bench delta

Heavy seed (`--seed=heavy`, 1500 frames × 6 tracks = 9000 keyframes), median worker FPS across 3 runs / scenario. Baseline: [`debug/canvas-cleanup-baseline.json`](../../debug/canvas-cleanup-baseline.json). Post-cleanup: [`debug/canvas-cleanup-after.json`](../../debug/canvas-cleanup-after.json).

| scenario               | wkrFps before | wkrFps after | Δ      | longTaskMs |
|------------------------|--------------:|-------------:|-------:|-----------:|
| dope-idle              |          60.0 |         60.0 |  +0.0  |          0 |
| dope-scrub             |          59.9 |         59.9 |  +0.0  |          0 |
| dope-play              |          59.0 |         59.8 |  +0.8  |          0 |
| dope-zoom              |          60.0 |         60.0 |  +0.0  |          0 |
| dope-select-track      |          59.7 |         60.1 |  +0.4  |          0 |
| graph-idle             |          60.0 |         60.0 |  +0.0  |          0 |
| graph-scrub            |          59.3 |         59.9 |  +0.6  |          0 |
| graph-play             |          40.1 |         40.4 |  +0.3  |          0 |
| graph-zoom             |          59.9 |         60.0 |  +0.1  |          0 |
| graph-select-track     |          59.3 |         60.2 |  +0.9  |          0 |

Every scenario within the inter-run noise floor (±1 fps observed range: -0.0 to +0.9). The slight uptick on `graph-*` is likely the reduced GraphSidebar import depth (`isFlatTrack` no longer transits through `TrackRow`'s module → fewer dep edges in the module graph), but it's well inside noise — the bench is at vsync and not load-bearing.

## What was removed

| file | change |
|------|--------|
| [`components/timeline/DopeSheet.tsx`](../../components/timeline/DopeSheet.tsx) | DOM Global Summary block (33 lines: cyan diamonds, sticky wrapper, sidebar label + selection-transform-bar wrapper) → replaced by a synthetic `kind:'group'` row at `y=0` in `rowsLayout` (cyan colour overrides via the new `fillColor`/`strokeColor` row fields) plus a slim in-flow chrome row inside `rowsContainerRef` carrying only the sidebar label + transform-bar wrapper. `getRootKeyframes()` helper and its `visibleMinPx`/`visibleMaxPx` viewport-cull state deleted. Unused `Track` type-import dropped. Net: -45 lines. |
| [`components/timeline/TrackRow.tsx`](../../components/timeline/TrackRow.tsx) | `liveValueState` registry + its populating `useEffect` deleted; `LiveValueDisplay` collapsed to a static `--` span (no ref, no `tid` prop). Now-unused `useRef` + `useEffect` imports dropped. The `export { isFlatTrack } from '../../utils/dopeSheetTrackFlags'` re-export deleted (sole external caller redirected to import from the canonical source). Net: -22 lines. |
| [`components/graph/GraphSidebar.tsx`](../../components/graph/GraphSidebar.tsx) | Import of `isFlatTrack` rewired from `../timeline/TrackRow` to `../../utils/dopeSheetTrackFlags`. 1 line moved. |
| [`utils/DopeSheetRenderer.ts`](../../utils/DopeSheetRenderer.ts) | `DopeSheetRowLayout` gained optional `fillColor` / `strokeColor` for group-row colour overrides; `drawDopeSheetBack` threads them into `buildGroupDiamonds`. Net: +9 lines (additive: the only growth in the diff). |
| [`utils/DopeSheetRendererCache.ts`](../../utils/DopeSheetRendererCache.ts) | `export type CachedDiamondCanvas` deleted (zero callers anywhere in repo). |
| [`utils/GraphRendererCache.ts`](../../utils/GraphRendererCache.ts) | `export type CachedPolyline` deleted (zero callers anywhere in repo). |
| [`hooks/useDopeSheetInteraction.ts`](../../hooks/useDopeSheetInteraction.ts) | Marquee `yOffset` now starts at `globalBottom` (Root Summary lives inside `rowsContainerRef` as the leading row, so the first regular group/track row's y-origin is the Root Summary chrome's bottom edge). Removed the now-unused `rowsTop` calculation. |

**Net:** -27 LOC across 7 files (+90 / -117). Cleanup is itself a small architectural payment.

## Behaviour changes (worth eyeballing)

1. **Sticky lost on Root Summary** (per the user's explicit "Simple fix — drop sticky" decision at the Part 1 pause point). The chrome row scrolls with the rest of the row stack instead of pinning below the ruler. If the user vertically scrolls a long track list, the cyan summary diamonds + transform bar scroll off. Preserving sticky was technically possible (Option A: a dedicated sticky canvas inside a sticky wrapper, ~80 extra LOC) and is captured as a follow-on item below.
2. **Hidden-track click semantics** changed. The old DOM cyan diamonds fanned `Object.keys(sequence.tracks)` (every track, including `hidden`) into `handleGroupKeyMouseDown` while the display only painted frames from visible tracks. The canvas pick now uses the row's `trackIds`, which is the visible-only set — click is now consistent with display. Strictly an improvement; flagged so nobody is surprised by `hidden` tracks no longer being touched by Root Summary clicks.

## What survived (would-look-dead-but-isn't)

- All `*Args` interfaces in the renderer + builder modules (`BuildTrackDiamondsArgs`, `BuildGroupDiamondsArgs`, `BuildTrackPolylineArgs`, `BuildSoftMaskArgs`, `DrawDopeSheetBackArgs`, `DrawDopeSheetSelectionArgs`, `DrawDopeSheetHoverArgs`, `PickKeyframeArgs`, `GraphOverlayProps`). Two references each (export + function signature). Pattern convention is to keep them exported as the documented public surface of each pure module — even though no caller currently names them, downgrading would force a future caller to re-derive the shape. Left alone.
- `DIAMOND_THEME` in [`utils/DopeSheetRendererBuilder.ts`](../../utils/DopeSheetRendererBuilder.ts). 7 references inside the file as the default-colour fallback for `fillColor`/`strokeColor`. Live.
- Every export in [`utils/timelineUtils.ts`](../../utils/timelineUtils.ts) — each has 2+ external callers (`isRotationTrack`: 5, `getLiveValue`: 9 incl. AppGmt comment + 1 BaseVectorInput local-name collision, `evaluateTrackValue`: 23, etc.). Nothing dead in there.
- `getLiveValue` confirmed serving exactly the three legitimate post-refactor callers (`DopeSheet.wrapAddKey`, `GraphSidebar.LiveValueDisplay`, `TimelineToolbar` "fill from current value" affordance).
- `__trackRowTickStats` confirmed not undefined-but-leaking — it was already gone from source per the 16_ report's Step-6 deletion. Verified zero hits.

## Top-region structural — Option A taken

The prompt offered two paths for the marquee y-offset / `globalSummaryRef` cleanup:

- **Option A (minimal):** verify the `globalSummaryRef` / `rowsContainerRef` references still resolve correctly post-Part-1.
- **Option B (cleaner):** introduce a `TimelineRegions` wrapper that owns the y-coordinates of (audio | global-summary | rows) in one place.

**Chose A.** Part 1 already had to update `useDopeSheetInteraction.ts:onUp`'s marquee logic because Root Summary moved *inside* `rowsContainerRef`. The fix was a 2-line change: `yOffset` now starts at `globalBottom` (the Root Summary chrome's bottom edge, resolved at mouseup via `globalSummaryRef.getBoundingClientRect()`). With this, the marquee remains correct regardless of audio strip height or any future top-region additions.

Option B's `TimelineRegions` wrapper would centralise the (audio | summary | rows) y-origin computation, but with only one consumer (the marquee `onUp`) and a working ref-based resolution already in place, the wrapper would be premature abstraction. Deferred to the future "audio strip grows multi-row" or "regions toggle" branch where it'd pay rent.

The prompt's escape hatch ("If Part 3 starts looking like more than half a day, defer it — the bench is already at vsync and this is polish") is the principle applied. Push-ready without B.

## Spec amendments

None. The change is internal — the public surface of `DopeSheetRowLayout` grew two optional fields (`fillColor`, `strokeColor`) that are backwards-compatible, and the public surface of `liveValueState` was dropped entirely (caller count was zero).

## Follow-on items

Captured for future passes:

- **`19_OFFLINE_MODULATION_BAKE_PROMPT.md`** — the originally-planned next piece of work, scoped against the new "all dope-* + graph-* at vsync" baseline. Still next.
- **`21_AUDIO_TIMELINE_SYNC_PROMPT.md`** — audio waveform and clip-cut positions don't track the timeline's fps; surfaced by the user during the Part-1 review. Explicitly out of scope per `18_`'s "Out of scope" list, captured as a separate prompt so the next session has a starting point. See sibling doc.
- **Option B `TimelineRegions` wrapper** — deferred; revisit when a third top-region element (regions-visibility toggle, multi-row audio, etc.) appears and a single ref-based y-origin resolution stops being enough.
- **Sticky Root Summary** — declined this pass per user decision ("Simple fix — drop sticky"). Re-revisitable as a dedicated sticky canvas inside a sticky wrapper (~80 LOC) if the lost behaviour bites.
- **HiDPI / DPR** — still flagged from 16_ + 17_; unchanged.
- **Viewport-clamped canvas width** — still flagged from 16_; unchanged.

## Push readiness

- [x] `npm run typecheck` clean.
- [x] `npm run orphans` clean (no new orphans; the pre-existing `debug/helpers/image-diff.mts` is unrelated).
- [x] `npx tsx debug/test-dopesheet-renderer-cache.mts` — 41/41 passing.
- [x] `npx tsx debug/test-graph-renderer-cache.mts` — 28/28 passing.
- [x] `bench-perf:timeline --seed=heavy` — parity confirmed (table above).
- [ ] Full UI interaction smoke — Part 1's click-fix is verified by the user (header diamonds now respond); marquee + drag + audio + transform-bar interactions in-app still need a final manual pass before push. The bench's `dope-select-track` scenario exercises one specific path; the full interaction matrix is the user's call.

Ready to `git push origin dev` after the manual interaction smoke confirms. 33 commits queued before this branch; `feature/canvas-cleanup` adds one more (or one squashed merge — caller's choice).
