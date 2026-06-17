# Animation Document Refactor — design

**Status:** draft 1 (2026-05-10)
**Owner:** TBD
**Replaces:** the per-track Zustand subscription / canvas DopeSheet / patch-undo plans previously discussed in conversation. This doc supersedes them by treating them as symptoms of one underlying mismatch rather than separate optimisations.

## 1. Problem

GMT's animation system stores the entire timeline inside a Zustand slice (`sequenceSlice`), renders every keyframe as a React component (`KeyframeDiamond`, `GroupDiamond`), and snapshots the whole tree per undoable action. At ~hundreds of keyframes this is fine. At thousands the whole app lags — paused, playing, recording, scrolling, in DopeSheet *and* in GraphEditor. The phase that just shipped (commits `e3cb7b5..89e5f37`) added viewport virtualisation, write-throttling, and per-track ref clones to push the wall back; it didn't move it.

The lag is not one bottleneck. It's a family of costs that all scale with total keyframe count:

| Cost | Where | Triggered by |
|---|---|---|
| Snapshot serialisation | `sequenceSlice.snapshot` (`JSON.parse(JSON.stringify(seq))`) | every undoable action |
| Mount/unmount churn | `KeyframeDiamond` / `GroupDiamond` registering into module-level Maps | scroll, zoom, viewport change |
| Memo invalidation | `TrackRow.visibleSlice`, `TrackGroup.groupKeyframes` deps include viewport | scroll wheel |
| Prop fan-out | `sequence` passed as a prop into TrackGroup → TrackRow → KeyframeDiamond | any sequence write |
| Selector fan-out | `useTrackAnimation` (every animatable Slider) subs to `s.sequence` | any sequence write |
| Per-RAF dirty-check | `TrackRow.tick` walks every visible diamond + every `LiveValueDisplay` | every frame |
| Per-track RAF | `GraphSidebar.LiveValueDisplay` runs its own `requestAnimationFrame` per track | always |
| Polyline resampling | `GraphRenderer.drawGraph` walks visible tracks × pixels per redraw | playhead nudge, marquee, selection |
| Marquee hit-test | `useDopeSheetInteraction.onUp` iterates every key in every track | mouse-up after marquee |
| Recording write storm | `batchAddKeyframesMultiRange` flush re-renders DopeSheet tree | every 400ms while recording |

These are not nine separate problems. They are one problem (animation data lives in the wrong store and is rendered the wrong way) refracted through nine surfaces. Patching them individually has been the work of the past month and has not closed the gap.

## 2. Diagnosis

Animation data has the wrong access pattern for a fan-out subscription model:

- **Write-heavy in bursts**: every recording tick or batch edit fans out to every selector touching `sequence`.
- **Read-heavy at scrub**: AnimationEngine.scrub reads the same data the UI subscribes to; any read-during-write triggers a render cascade.
- **Frequent small mutations with undo**: snapshot-the-whole-tree per action is O(N) cloning of mostly-unchanged data.

Layered on top: every keyframe is a React component with a `useEffect`-registered DOM ref, observed by a parallel imperative `tick()` system that mutates DOM directly. We pay for *both* React reconciliation *and* an imperative side-channel on the same cells.

This is not how DCC tools (Maya, Blender, After Effects) or document-canvas tools (Figma, Tldraw, Excalidraw) handle their document data. They keep document data outside the framework's reactive store, render to canvas, and undo by reversing operations rather than restoring snapshots. GMT should do the same.

## 3. Target architecture

```
+-----------------------------+
|      AnimationDocument      |  plain class, owns tracks/keyframes/undo log
|  - tracks: Map<id, Track>   |  per-track + global version counters
|  - undo / redo (patch log)  |  atomic operation methods
|  - subscribe(listener)      |  one-line bump per write
+-----------------------------+
              ^   ^
              |   |
   reads      |   | reads
              |   |
+-------------+   +--------------+
| Canvas      |   | AnimationEngine (scrub, interpolate)
| Renderers   |   | ModulationRuntime
| (DopeSheet, |   | AudioRuntime
|  GraphEd)   |   +--------------+
+-------------+        ^
       ^               |
       |               | publishes liveModulations
       |               v
+-----------------------------+
|   React layer (thin)        |  subscribes to coarse signals only:
|  - currentFrame             |    docVersion, currentFrame, fps,
|  - selection                |    selectedTrackIds, selectedKeyframeIds,
|  - viewport transform       |    viewport
|  - playback state           |  Renders chrome + canvas hosts. NEVER iterates keyframes.
+-----------------------------+
```

**Inversion:** today React owns the data and the engine reads it. Tomorrow the document owns the data; the engine and the canvas read it; React only renders the chrome and hosts the canvas. The whole React tree below `Timeline` becomes a fixed handful of nodes, regardless of keyframe count.

## 4. AnimationDocument interface

```ts
// engine/animation/AnimationDocument.ts

type Patch =
  | { op: 'addKey',     trackId: string, key: Keyframe }
  | { op: 'removeKey',  trackId: string, keyId: string,    before: Keyframe }
  | { op: 'updateKey',  trackId: string, keyId: string,    before: Partial<Keyframe>, after: Partial<Keyframe> }
  | { op: 'batchAppend',trackId: string, keys: Keyframe[] }                       // recording hot path
  | { op: 'addTrack',   track: Track }
  | { op: 'removeTrack',trackId: string, before: Track }
  | { op: 'setTrackBehavior', trackId: string, before: TrackBehavior, after: TrackBehavior }
  | { op: 'remapFrames',before: Sequence, after: Sequence,                        // setFps('match') hot path
                        ratio: number, newFps: number, newDuration: number, newCurrentFrame: number }
  | { op: 'setSequence',before: Sequence, after: Sequence };                      // load-scene only

type DocSubscriber = (event: { docVersion: number, changedTracks: ReadonlySet<string> | null }) => void;
//                                                                  ^ null = "everything changed" (load-scene)

class AnimationDocument {
  private _tracks: Map<string, Track>;
  private _trackVersions: Map<string, number>;
  private _docVersion: number = 0;
  private _undoStack: Patch[][] = [];                                              // each entry = one user action
  private _redoStack: Patch[][] = [];
  private _subs: Set<DocSubscriber> = new Set();
  private _txn: Patch[] | null = null;                                             // open transaction buffer

  // --- Reads (synchronous, no allocation) ---
  getTrack(id: string): Track | undefined;
  getTrackKeys(id: string): readonly Keyframe[] | undefined;
  trackVersion(id: string): number;                                                // for memoisation
  docVersion(): number;
  trackIds(): readonly string[];
  keyAt(trackId: string, frame: number): Keyframe | undefined;                     // bsearch

  // --- Writes (each opens an implicit txn unless one is open) ---
  addKey(trackId: string, frame: number, value: number, opts?: { interpolation?: Interpolation }): string;
  removeKey(trackId: string, keyId: string): void;
  updateKey(trackId: string, keyId: string, patch: Partial<Keyframe>): void;
  updateKeys(updates: { trackId: string, keyId: string, patch: Partial<Keyframe> }[]): void;
  batchAppend(trackId: string, keys: Keyframe[]): void;                            // recording hot path; no tangent calc
  addTrack(track: Track): void;
  removeTrack(trackId: string): void;
  setTrackBehavior(trackId: string, b: TrackBehavior): void;
  setSequence(seq: Sequence): void;                                                // load-scene

  // --- Transactions (group multiple writes into one undo entry) ---
  beginTxn(): void;
  endTxn(): void;
  withTxn<T>(fn: () => T): T;

  // --- Undo/redo ---
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;

  // --- Subscriptions ---
  subscribe(fn: DocSubscriber): () => void;                                        // returns unsubscribe
}

export const animationDocument = new AnimationDocument();
```

**Invariants:**
- Every write bumps `_docVersion` by 1 and `_trackVersions.get(touchedId)` by 1.
- Every write within a transaction buffers patches into `_txn`. `endTxn` commits one entry to `_undoStack`, clears `_redoStack`, fires one `_subs` notification with the union of touched track ids.
- Implicit transactions (writes outside an open txn) commit immediately as a single-patch entry.
- `setSequence` notifies with `changedTracks: null` and clears undo/redo (load-scene is the only non-undoable op).
- Keyframe arrays are sorted by `frame` at all times. `batchAppend` requires `keys` to be already sorted and start after the last key on the track (cheap to enforce; recording naturally produces this).
- Each operation method records the inverse before applying. Undo replays the inverse; redo replays the forward.

**Why a class, not Zustand:** Zustand's `set` notifies all subscribers; we'd need a custom equality function on every selector to filter by track. A class with explicit subscribers + version counters lets the canvas renderer bail in O(1), and avoids a layer of selector-comparison overhead per RAF.

**No-op write gating:** every public write checks for actual change before applying (`if (track.keyframes[idx].value === newValue) return;` etc.). This mirrors the existing `setIsCameraInteracting` / `setIsScrubbing` equality gates in `playbackSlice.ts`, which were added after `debug/probe-anim-set-source.mts` showed 239 no-op `set()` calls / 4s idle from `Navigation.tsx`'s per-frame useFrame loop. The class enforces this at one location instead of relying on every caller to remember.

## 4a. What stays in Zustand

The document owns animation **data**. Other animation-adjacent state stays in the existing slices:

| Slice | What | Why it stays |
|---|---|---|
| `playbackSlice` | `isPlaying`, `currentFrame`, `fps`, `loopMode`, `isRecording`, `isRecordingModulation`, `recordingSnapshot`, `deterministicPlayback` | Playback state is genuine UI state; the engine reads it but doesn't *own* it. Already narrow-subscribed correctly. |
| `selectionSlice` | `selectedTrackIds`, `selectedKeyframeIds`, soft selection settings | Selection is per-user view state, not document data. (Future multi-cursor / per-pane selection would split this further.) |
| `uiSlice` | `collapsedGroups`, `timelineSidebarWidth` | Pure UI. Never persisted to GMF. |
| `audioClipsSlice` | `audioClips[]` (deck index, file name, trim, peaks) | Clip placement metadata is timeline-adjacent but not keyframes; small + bounded; staying in Zustand is fine. The document doesn't need it. |

`recordingSnapshot` (currently `JSON.parse(JSON.stringify(s.sequence))` per arm; ~5MB at 50k keys) becomes a **`docVersion` checkpoint** rather than a deep clone. The document exposes `getKeyframesAtVersion(trackId, frame, version)` which walks the patch log backward from `currentVersion` to `checkpointVersion` to evaluate the pre-recording value. For typical recording sessions (<10s) the patch log between arm and current is small, so this is cheap and avoids the upfront clone cost. Falls back to a structured-clone snapshot if the patch log is somehow truncated (unlikely but defensive).

When a track is removed (`document.removeTrack`), the document fires its notification with `changedTracks: { tid }`; the React layer's selection slice has a small subscriber that strips removed-track ids out of `selectedTrackIds` / `selectedKeyframeIds`. Today this happens inside the `removeTrack` action in `sequenceSlice` ([sequenceSlice.ts:104-114](dev/store/animation/sequenceSlice.ts#L104)); the contract just moves to a subscriber.

## 5. Patch-based undo

Every method records its inverse before mutation. Undo cost is O(touched), not O(all). Snapshot disappears from the hot path. Memory cost of the undo stack stays bounded because patches don't carry the surrounding sequence.

Edge cases:
- **Recording**: stop-recording (post-bake) commits one transaction with one `batchAppend` patch per modulation target. One undo entry covers the whole record. (The current `recordBuffer` / 400ms flush throttle disappears with bake.)
- **FPS change** (with `match` mode): one `remapFrames` patch carrying before/after sequence references. The before reference is shared with the prior version, so memory cost is the size of two extra object headers + one number — not 2× the keyframe data. Replays atomically. Matches the existing 400ms FPS-drag coalescing window in `playbackSlice.ts:11-12, 91-95`: rapid drags within `FPS_COALESCE_MS` collapse into a single patch the same way today's slice collapses them into one undo entry.
- **Drag** (key drag, transform-bar drag, marquee resize): `useDopeSheetInteraction.startDragKeys` and `startTransformSelection` already call `snapshot()` once at mousedown, then `updateKeyframes` per-mousemove. In document terms: open transaction at mousedown, write per-move with `updateKeys` (no nested txn), commit at mouseup. One undo entry per drag, unchanged from today's UX.
- **Load scene**: `setSequence` clears undo. There is no undo across loads. Matches DCC convention.
- **Scoped undo**: GMT routes Mod+Z over the timeline through the shortcut plugin's `timeline-hover` scope to `undo('animation')` (see `Timeline.tsx:55-59`), independent from scene/param undo. The document's `undo()` plugs into that same scope; no behaviour change for users.

## 6. Version-counter contract

Two counters. Both are integers; cheap to compare; no allocation.

- `docVersion`: bumps on any write. Renderers that draw the whole timeline (DopeSheet canvas, GraphEditor curves canvas) read this.
- `trackVersion(id)`: bumps when a single track's keyframes change. Per-track UI (a `useTrackAnimation` slider, a per-track polyline cache) reads this.

Subscribers receive `{ docVersion, changedTracks: Set<string> | null }`. A canvas redraw decides what to invalidate based on `changedTracks`. Per-track polyline caches in GraphRenderer keyed by `(trackId, trackVersion)` reuse across redraws automatically.

## 7. Canvas renderer read API

Two canvas hosts replace the existing DOM trees:

### `<DopeSheetCanvas />`

- One `<canvas>` per scrollable area, sized to scrollable content × visible height.
- Reads from `animationDocument` directly inside its `requestAnimationFrame` paint loop.
- Subscribes to: docVersion, currentFrame, viewport transform, selectedKeyframeIds, organizedTracks, collapsedGroups. Repaints when any change.
- Per-frame paint:
  - For each visible track row, binary-search the visible frame range, paint diamonds at `(frame * frameWidth, rowY)` with shape derived from `interpolation`.
  - Group summary rows: union of frames in the group's tracks, painted with the existing GroupDiamond style.
  - Playhead overlay: drawn last, on top.
- Hit-test: `pickKey(x, y) -> { trackId, keyId } | null` via JS binary search — same `lowerBound`/`upperBound` already in TrackRow.tsx today.
- Selection marquee, transform bar, keyframe context menu trigger, sidebar header rows: stay DOM. They are O(1) chrome.

### `<GraphCurvesCanvas />`

- Three layers (back / mid / front canvas), composited:
  - **Back**: per-track polyline cache. Key by `(trackId, trackVersion, viewport.scaleX, viewport.scaleY, normalized)`. Invalidate only when those change. Polylines are sampled once per cache entry, not per redraw.
  - **Mid**: soft-selection weight gradient overlay. Today `getSoftWeight` ([GraphRenderer.ts:64-86](dev/utils/GraphRenderer.ts#L64)) is called per polyline segment per visible track per redraw — O(selectedKeys × segments × visibleTracks) per repaint. The mid layer caches it, invalidating only when selection or soft-selection radius/type changes.
  - **Front**: playhead, selection box, hover highlight, drag affordances. Cheap; redraws on every interaction tick.
- Replaces the current `GraphCanvas.tsx` (already canvas, but resamples curves *and* re-evaluates soft-selection weights on every redraw via `GraphRenderer.drawGraph`).
- The `_limitPattern` module-level cache pattern in `GraphRenderer.ts:35-62` is the right idea applied to one thing; the polyline / soft-selection caches generalise it.

### `<GraphSidebar />`

- Stays DOM (it's a fixed list of N rows, where N = track count, not keyframe count).
- The per-track `LiveValueDisplay`'s individual `requestAnimationFrame` loops collapse into one shared tick that reads from a single `animationDocument.evaluateAll(currentFrame)` per RAF, writing innerText into refs the same way TrackRow.tick already does.

## 8. React contract narrowing

After the refactor, the React tree below `<Timeline>` looks like:

```
<Timeline>
  <TimelineToolbar />            (subs: isPlaying, isRecording, currentFrame, fps, loopMode)
  <TimelineRuler />              (subs: viewport, durationFrames)
  <DopeSheetCanvas />            (subs: docVersion, currentFrame, viewport, selectedKeys, organisedTracks, collapsed)
  <SelectionTransformBar />      (subs: selectedKeys → bounds; ~one per group + global)
  <KeyframeContextMenu />        (subs: openMenu state)
  <KeyframeInspector />          (subs: selectedKeys[0] only)
  <GraphSidebar />               (subs: trackIds, selectedTrackIds, visibleTrackIds, perTrackVersions for live values)
  <GraphCurvesCanvas />          (subs: docVersion, currentFrame, viewport, visibleTrackIds, selectedKeys)
  <BenchProfiler id="…">         (kept; the existing perf wrappers still measure paint cost the same way)
</Timeline>
```

No component below this level iterates keyframes. The total fiber count under Timeline becomes O(track count + chrome), independent of keyframe count.

`Timeline.tsx` itself currently subs to `s.sequence` ([Timeline.tsx:35](dev/components/Timeline.tsx#L35)) — used only by the "switch to Graph mode" effect and the GraphEditor right-click handler ([Timeline.tsx:95-112, 363-367](dev/components/Timeline.tsx#L95)). Both reads convert cleanly to `animationDocument.trackIds()` / `animationDocument.getTrack(tid)?.keyframes.find(...)`, gated by a `useDocVersion()` hook so the effect re-fires when the track set actually changes.

`useTrackAnimation` collapses to:

```ts
export const useTrackAnimation = (trackId, currentValue, label) => {
  const trackVersion = useSyncExternalStore(
    cb => animationDocument.subscribeTrack(trackId, cb),                   // fires only when this track changes
    () => animationDocument.trackVersion(trackId),
  );
  // status / toggleKey / autoKeyOnChange use animationDocument directly
};
```

Every animatable Slider in every panel now re-renders only when *its* track changes. The "no-op set() flood" pattern documented in `useTrackAnimation.ts` becomes a non-issue because there is no flood — writes are explicit and sub-targeted.

## 9. Modulation, audio, recording

Recording stops being a special path on the data side. Live preview already overlays modulation via `engineStore.liveModulations` (the modulation tick writes there). Recording becomes:

1. **Arm**: capture `recordingSnapshot` (still — for the `cleanBase` lookup that prevents feedback). Buffer isn't necessary; bake reads from the live document if no track existed.
2. **Play**: live overlay continues. No keyframe writes per tick. The "every frame of modulation" fidelity question goes away because there is no live capture to be lossy.
3. **Stop → Bake**: walk frames `[0..duration]`. For each frame:
   - LFOs: replay deterministically (`oscTime = frame / fps`).
   - Audio rules: pull file from `audioFileCache`, decode once, FFT a 2048-sample window centred at `frame/fps`, leaky-integrate magnitudes (matches AnalyserNode `smoothingTimeConstant=0.8`), apply rule pipeline.
   - Per target, accumulate `(frame, baseValue + offset)`.
4. **Commit**: one `animationDocument.withTxn(() => { for each rule target, batchAppend(...) })`. One undo entry. One paint.

Bake takes ~1-2s for a 30s recording. Show "Baking…" status in the toolbar.

What this kills:
- `recordBuffer` / `RECORD_FLUSH_MS` / `flushRecordBuffer` (AnimationSystem.tsx ~lines 72-80, 522-537).
- `lastFrameRecorded` gap-fill machinery (~lines 191-202).
- `setOverriddenTracks` / `EMPTY_OVERRIDES` (~lines 64, 105, 209).
- `batchAddKeyframesMultiRange` and `batchAddKeyframesRange` (AnimationDocument.batchAppend covers the same semantics).

## 10. Migration plan

Incremental. The document can ship behind the existing Zustand slice; consumers migrate one at a time; the slice deletes when the last consumer leaves.

**Phase 0 — Foundation (1-2 days)**
- `engine/animation/AnimationDocument.ts` + types + patches + tests.
- `engine/animation/animationDocumentBridge.ts`: temporary two-way mirror with `sequenceSlice`. Writes to either side propagate. Lets us migrate readers without breaking writers, and vice versa.
- Fluid-toy + app-gmt boot: instantiate document, install bridge.

**Phase 1 — Reader migration (3-5 days)**
- AnimationEngine.scrub: read tracks via document, not store. Subscribe to docVersion for binder cache invalidation. Keep `binders` / `overriddenTracks` as-is.
- AnimationSystem.tick: same. Modulation reads/writes unchanged in shape.
- useTrackAnimation: switch to `animationDocument.subscribeTrack`. (Single biggest UI win — every animatable Slider in the app benefits immediately.)
- GraphSidebar.LiveValueDisplay: switch to shared tick reading from document.
- KeyframeInspector: subscribe per-key (selectedKeys[0]'s track version).

**Phase 2 — Writer migration (2-3 days)**
- `sequenceSlice` write actions become wrappers that call the document. Bridge fires Zustand notifications until last reader migrates off `s.sequence`.
- Snapshot/undo/redo redirect to `animationDocument.undo()`. Existing `undoStack` Zustand state goes away.
- `batchAddKeyframes` family redirects to `document.batchAppend`.

**Phase 3 — DopeSheet canvas (4-6 days)**
- Implement `<DopeSheetCanvas />` + hit-test + paint loop.
- Replace `<TrackGroup>` / `<TrackRow>` / `<KeyframeDiamond>` / `<GroupDiamond>` with the canvas. Keep `SelectionTransformBar`, `TimelineRuler`, `AudioGroup` as-is.
- Port `useDopeSheetInteraction` to read from document and hit-test against the canvas; selection / drag semantics unchanged.
- Delete `diamondState`, `groupDiamondState`, `liveValueState`, `TrackRow.tick`, the module-level Maps.

**Phase 4 — Graph canvas polish (3-5 days, biggest single phase)**
- `<GraphCurvesCanvas />` with three-layer cache (polyline / soft-selection / overlay).
- Existing `GraphCanvas.tsx` swap; `GraphRenderer.drawGraph` becomes a polyline-into-cache builder + soft-selection mask builder.
- `useGraphInteraction.ts` (851 lines, 30 sequence references — the biggest single migration target) reads from document. Strong candidate to split into the long-flagged `useKeyDrag` / `useHandleDrag` / `useMarquee` / `usePanZoom` / `useScrub` hooks at the same time, since every call site is being touched anyway.

**Phase 5 — Recording/bake refactor (2-3 days)**
- New `engine/animation/modulationOfflineBake.ts`.
- AnimationSystem.tick's recording path collapses to "no-op while recording; on stop, run bake."
- Delete `recordBuffer`, `setOverriddenTracks` recording lifecycle, `lastFrameRecorded`.

**Phase 6 — Cleanup (1-2 days)**
- Delete bridge.
- Delete `sequenceSlice`. Animation store keeps only playback + selection + clipboard (the slices that *are* UI state).
- Delete `batchAddKeyframesMultiRange`, `batchAddKeyframesRange`, `batchAddKeyframes` from the store (replaced by `document.batchAppend`).
- Update docs: `docs/engine/08_Animation.md`, `docs/gmt/04_Animation_Engine.md`.

**Total: ~3 weeks.** Ships in pieces (each phase leaves the app working). No big-bang merge.

## 11. What survives, what dies

**Survives (the actual valuable work of the past year):**
- `BezierMath.ts`, `AnimationMath.ts` — interpolation math, tangent calculation, de Casteljau split, soft selection.
- `engine/animation/logTrackRegistry.ts`, `cameraPairRegistry.ts`, `binderRegistry.ts`, `cameraKeyRegistry.ts`, `trackBinding.ts` — pluggable extension points.
- `AnimationEngine` (the class) — keeps scrub/binder/interpolate. Just reads from document instead of store.
- `ModulationEngine`, `AudioAnalysisEngine`, `audioClipSync`, `audioExportMix`, `audioFileCache` — unchanged.
- `evaluateTrackValue`, `evaluatePairedTrack` — unchanged.
- All formula files, all binders, all features.

**Dies:**
- `sequenceSlice.ts` (entire file).
- `KeyframeDiamond`, `GroupDiamond`, the module-level `diamondState` / `groupDiamondState` / `liveValueState` Maps in `TrackRow.tsx`.
- `TrackRow.tsx`, `TrackGroup.tsx` (entire files; replaced by canvas).
- `getRootKeyframes`, `groupKeyframes` memos in DopeSheet (canvas replaces them).
- `recordBuffer`, `RECORD_FLUSH_MS`, `flushRecordBuffer`, `lastFrameRecorded`, `setOverriddenTracks` recording transitions in `AnimationSystem.tsx`.
- `useTrackAnimation`'s subscription to `s.sequence`.
- The GraphSidebar per-track RAF loops (collapse to shared tick).
- Per-key serialisation in undo (snapshot-the-tree).

## 12. Risks and open questions

- **Bridge correctness during migration**: the two-way mirror has to correctly fan-out writes both ways without loops. Mitigation: bridge has an `_inFlight` flag that breaks the cycle; every write from one side is marked, the other side's listener sees the mark and skips re-emitting. This is a known pattern.
- **Undo semantics regression risk**: patch-based undo must handle the existing edge cases — FPS change atomicity, load-scene clearing the stack, multi-action coalescing for rapid drags (the current `400ms` history coalesce window for FPS drags). All explicit, all testable.
- **Canvas accessibility**: DOM-per-key gave us free hit-targets for screen readers. We don't currently support screen reader navigation of the timeline, so this isn't a regression, but document the gap.
- **Hi-DPI / Retina**: canvas needs `devicePixelRatio` scaling. Mirror what GraphCanvas already does (it doesn't, currently — also worth fixing). Not blocking.
- **WebGL canvas vs 2D canvas**: 2D is fine for the diamond counts we're talking about (1k-100k diamonds painted as rotated rects). Don't over-engineer.
- **Test coverage**: existing animation tests are partial. The document's pure-function nature (deterministic patches in/out) makes it easier to test than the current React-and-Zustand-and-imperative-tick stack. Phase 0's tests should specify undo semantics first.
- **Mesh export interlace** uses formula data, not animation data — unaffected.
- **Scene save/load (GMF format)**: `setSequence` covers it. Existing GMF I/O calls into `useAnimationStore.setState({ sequence })`; rewires to `animationDocument.setSequence`.

## 13. Files-touched matrix

For migration estimation. Counts are direct references to `s.sequence` / `state.sequence` / `sequenceSlice` writers; not transitive cost.

| File | LOC | What it does | Migration phase |
|---|---:|---|---:|
| `engine/AnimationEngine.ts` | 404 | scrub, binders, interpolation | 1 |
| `engine/animation/AnimationSystem.tsx` | 588 | modulation tick, recording lifecycle | 1, 5 |
| `store/animation/sequenceSlice.ts` | 731 | keyframe data + writers | 2, 6 (deletes) |
| `store/animation/playbackSlice.ts` | 150 | playback state, fps remap | 2 (FPS) |
| `components/Timeline.tsx` | 382 | top-level container | 1 |
| `components/timeline/DopeSheet.tsx` | 499 | DOM tree | 3 (replaces) |
| `components/timeline/TrackRow.tsx` | 316 | per-track DOM + tick side-channel | 3 (deletes) |
| `components/timeline/TrackGroup.tsx` | 171 | per-group DOM | 3 (deletes) |
| `components/timeline/KeyframeInspector.tsx` | ~ | selected-key detail | 1 |
| `components/GraphEditor.tsx` | 471 | container | 4 |
| `components/graph/GraphCanvas.tsx` | 79 | thin canvas wrapper | 4 (replaces) |
| `components/graph/GraphSidebar.tsx` | 354 | track list | 1, 4 (LiveValueDisplay) |
| `utils/GraphRenderer.ts` | 575 | curve painting | 4 |
| `hooks/useGraphInteraction.ts` | 851 | god-hook for graph editor | 4 (split + port) |
| `hooks/useDopeSheetInteraction.ts` | 530 | drag / marquee / transform | 3 |
| `hooks/useTrackAnimation.ts` | 85 | per-Slider hook (called everywhere) | 1 (single biggest UI win) |
| `utils/timelineUtils.ts` | 435 | `getLiveValue`, `evaluateTrackValue` | reads-only, point at document |
| `engine-gmt/utils/FormulaFormat.ts` | ~ | GMF save/load | rewires `setSequence` |
| `engine/plugins/SceneIO.tsx` | ~ | Save/Load plugin slots | unchanged |
| `engine-gmt/gallery/{loadGalleryScene,submitGalleryItem}.ts` | ~ | gallery I/O | rewires `setSequence` / `toJSON` |
| `app-gmt/main.tsx` | ~ | boot — needs `installAnimationDocument()` | 0 |
| `engine-gmt/animation/cameraBinders.ts` | ~ | composite camera binder registration | unchanged |

**Bench harnesses to keep alive:** `debug/probe-anim-set-source.mts`, `debug/bench-perf-timeline.mts`, `debug/bench-perf.mts`. These already measure exactly the costs we're targeting; they'll be the regression gate.

## 14. Decision

Ship the document refactor over ~3 weeks. The alternative — continuing to optimise inside the existing fan-out + DOM-per-key model — was the work of the past month and the user's complaint stands. Each phase leaves the app working; rollback at any phase boundary is realistic.

**Next step:** the Phase 0 implementation skeleton + tests for the document interface and patch undo. Once `AnimationDocument` exists with passing tests, the bridge is small and the migration can proceed file-by-file under continuous bench measurement.
