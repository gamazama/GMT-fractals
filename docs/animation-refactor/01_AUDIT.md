# Animation & modulation — entry-point audit

**Status:** v1 (2026-05-10)
**Companion to:** [02_RATIONALE.md](./02_RATIONALE.md)
**Purpose:** before committing to a refactor, map every existing entry point so we can see the actual surface, identify duplication, and design the unified module boundaries deliberately rather than by accident.

## TL;DR

There are **~30 distinct entry points** that read or write animation/modulation state. They were added incrementally and are smeared across 8 files with no common API. The same pipeline (LFOs + rules → offsets → uniforms) is implemented twice (live vs. export) and drifts. Three independent recording modes share one boolean each but no shared coordinator. Two camera-key capture paths bypass slice methods entirely with direct `setState`. Every call site that mutates animation data hand-rolls its own snapshot/transaction pattern.

The right module decomposition isn't six phases of optimisation — it's **six concerns** (Document, Player, Engine, Modulation, Audio, Recorder) currently entangled in one place. The audit below makes the entanglement legible. Section 9 proposes the clean cut.

## 1. Data writers

Every piece of code that mutates `sequence` (or pushes to the undo stack).

### 1a. Inside `sequenceSlice.ts` — the official API
- `setSequence(seq)` — load-scene replacement. Calls `snapshot()`.
- `addTrack(id, label)` — calls `snapshot()`.
- `removeTrack(id)` — calls `snapshot()`. Also strips `selectedTrackIds` of the removed id.
- `setTrackBehavior(tid, b)` — calls `snapshot()`.
- `addKeyframe(tid, frame, value, interp?)` — **does NOT call snapshot()**. Caller's responsibility.
- `removeKeyframe(tid, kid)` — calls `snapshot()`.
- `updateKeyframe(tid, kid, patch)` — **does NOT call snapshot()**. Mutates `track.keyframes[idx]` IN PLACE then re-sorts (line 393-394). Caller responsible for snapshot.
- `updateKeyframes(updates[])` — **does NOT call snapshot()**. Bulk edit; mutates in place. Caller responsible.
- `batchAddKeyframes(frame, updates[], interp?)` — **does NOT call snapshot()**. Recording hot path.
- `batchAddKeyframesRange(start, end, updates[], interp?)` — **does NOT call snapshot()**. Recording gap-fill.
- `batchAddKeyframesMultiRange(entries[], interp?)` — **does NOT call snapshot()**. Recording flush-throttle.
- `deleteSelectedKeyframes()` / `deleteAllKeys()` / `deleteAllTracks()` — all call `snapshot()`.
- `setTangents(mode)` — calls `snapshot()`.
- `setGlobalInterpolation(type, mode?)` — calls `snapshot()`.
- `copySelectedKeyframes()` — write to `clipboard`, no snapshot (clipboard isn't undoable).
- `pasteKeyframes(at?)` — calls `snapshot()`.
- `duplicateSelection()` — copy + paste; copy doesn't snapshot, paste does.
- `loopSelection(times)` — calls `snapshot()`.
- `simplifySelectedKeys(tol?)` — calls `snapshot()`.
- `snapshot()` — the undo capture itself; serialises the whole sequence via `JSON.parse(JSON.stringify(...))`.
- `undo()` / `redo()` — patch stack manipulation.

**Pattern observation:** which methods call `snapshot()` themselves vs. expect the caller to is inconsistent and undocumented. The split correlates with "is this a hot path?" but not reliably.

### 1b. Inside `playbackSlice.ts` — also pushes to the undo stack
- `play()` (when `isArmingModulation`): calls `s.snapshot()` and ALSO snapshots the sequence into `recordingSnapshot` via `JSON.parse(JSON.stringify(s.sequence))`.
- `setFps(newFps, mode)`: manually constructs an `FPS` HistoryItem and pushes to `state.undoStack` directly — bypasses `snapshot()`. Has its own 400ms coalesce window for drag-during-FPS-change.

### 1c. Outside the slice — direct `setState` mutations
- **`engine/animation/cameraKeyRegistry.captureCameraKeyFrame`** ([line 142](dev/engine/animation/cameraKeyRegistry.ts#L142)): direct `useAnimationStore.setState((s) => ({ sequence: { ...s.sequence, tracks: { ...s.sequence.tracks, [tid]: newTrack } } }))` to inline-create a track. Then calls `addKeyframe` through the slice. **Bypasses `addTrack`** to avoid the double-snapshot.
- **`engine-gmt/animation/cameraBinders.captureGmtCameraKeyFrame`** ([line 168](dev/engine-gmt/animation/cameraBinders.ts#L168)): full direct `setState` that creates tracks AND keyframes for all six camera tracks in one call, including inline `AnimationMath.calculateTangents` + `TrackUtils.updateNeighbors`. **Never touches slice methods.** Snapshot is taken explicitly via `animActions.snapshot()` before the setState.

These two are the highest-risk sites for any patch-based undo refactor. Both intentionally bypass slice methods to control snapshot batching, and any rewrite has to preserve "one Key Cam press → one undo entry" semantics.

### 1d. External `snapshot()` callers (caller-owned transactions)
- `cameraKeyRegistry.captureCameraKeyFrame` — once per Key Cam press.
- `cameraBinders.captureGmtCameraKeyFrame` — once per GMT Key Cam press.
- `vector-input/index.tsx` keyframe button — before add/remove (lines 121, 192, 274, 343, 415).
- `vector-input/index.tsx` onDragStart — before recording-mode track adds.
- `hooks/useTrackAnimation.ts` toggleKey + autoKeyOnDragStart.
- `hooks/useDopeSheetInteraction.ts` `startDragKeys` (via DopeSheet's handler) and `startTransformSelection`.
- `hooks/useGraphInteraction.ts` (851-line god-hook; multiple sites).
- `Timeline.tsx` keyframe context menu — before `updateInterp`.
- `engine-gmt/components/panels/scene_widgets.tsx` — in scene widgets.
- `engine-gmt/features/lighting/components/LightDirectionControl.tsx` — light position.

That's **~15 sites** that drive the undo stack from outside the slice. Every one had to remember the convention. None of them check it.

## 2. Data readers

Every place that reads the keyframe data (not just `currentFrame`).

### 2a. Engine-side
- `engine/AnimationEngine.scrub` — iterates every track every scrub.
- `engine/AnimationEngine.tick` — drives playback; calls scrub.
- `engine/AnimationEngine.evaluateCurveInternal` — linear segment scan (called per scrub-evaluate, per track).
- `engine/animation/cameraPairRegistry.evaluatePairedTrack` — paired pan/zoom math.
- `utils/timelineUtils.evaluateTrackValue` — used by modulation, dirty checks, vector-input status.
- `utils/timelineUtils.getLiveValue` — used by every TrackRow / GraphSidebar / vector-input live readout.
- `utils/timelineUtils.calculateEulerUpdates` — euler unwrapping for rotation tracks.
- `utils/timelineUtils.calculateSmoothingUpdates` — bulk smoothing/bounce on selected keys.
- `utils/timelineUtils.calculateResampleUpdates` — resampling.
- `utils/CurveFitting.simplifyTrack` — curve simplification.

### 2b. UI-side (subscribes to `s.sequence`)
- `components/Timeline.tsx` — used for "switch to Graph mode populates visible tracks" effect + GraphEditor right-click handler.
- `components/timeline/DopeSheet.tsx` — passes to TrackGroup/TrackRow; root keyframe collection.
- `components/timeline/TrackRow.tsx` — receives via prop, reads `tracks[tid].keyframes`.
- `components/timeline/TrackGroup.tsx` — receives via prop, computes `groupKeyframes`.
- `components/timeline/KeyframeInspector.tsx` — selected-key detail.
- `components/GraphEditor.tsx` — passes to GraphCanvas + GraphSidebar.
- `components/graph/GraphCanvas.tsx` — passes to `drawGraph`.
- `components/graph/GraphSidebar.tsx` — per-row LiveValueDisplay.
- `utils/GraphRenderer.drawGraph` — walks visible tracks × keyframes per redraw.
- `hooks/useTrackAnimation.ts` — every animatable Slider in the app.
- `hooks/useDopeSheetInteraction.ts` — dragKeys/marquee/transform; reads via `propsRef`.
- `hooks/useGraphInteraction.ts` — 30 sequence references inside.
- `components/vector-input/index.tsx` — Vector2/3/4Input keyframe status.
- `engine-gmt/navigation/Navigation.tsx` — camera lock check (`isCameraLocked` reads `sequence.tracks`).
- `engine-gmt/components/panels/scene_widgets.tsx` — scene capture widgets.

### 2c. Recording-time read of the snapshot (not live sequence)
- `AnimationEngine.scrub` — when `isRecordingModulation`, reads `recordingSnapshot` instead of `state.sequence`.
- `AnimationSystem.tick` — `cleanBase` resolution reads from `recordingSnapshot`.

## 3. Animation-engine interaction

`animationEngine` is a class instance (singleton) with methods called from many places.

### 3a. `animationEngine.scrub(frame)` callers
- `AnimationEngine.tick` (internal — playback advance).
- `hooks/useDopeSheetInteraction.ts` (drag/transform — 2 sites).
- `hooks/useGraphInteraction.ts` (drag/scrub/marquee — 4 sites).
- `components/timeline/TimelineToolbar.tsx` — frame counter input.
- `components/timeline/TimelineRuler.tsx` — drag-scrub.
- `components/timeline/KeyframeInspector.tsx` — frame field (3 sites).
- `components/graph/GraphSelectionBBox.tsx` — bbox transform.
- `demo/demoRenderRunner.ts` — offline demo render (2 sites).
- `engine-gmt/components/timeline/RenderPopup/exportRunner.ts` — video export (3 sites).
- `fluid-toy/components/RenderDialog/exportRunner.ts` — fluid-toy export (2 sites).

**~16 distinct scrub call sites.** Three of them are offline-export contexts that need their own pipeline (already exists as `exportModulations.ts` — see §4).

### 3b. `animationEngine.tick(delta)` — single caller
- `engine/animation/AnimationSystem.tick` — wrapped by the modulation pipeline.

### 3c. `animationEngine.connect(animStore, fractalStore)` — single caller
- `store/engineStore.bindStoreToEngine` — invoked once at boot via `<EngineBridge />` mount. Without this, `animationEngine.tick` early-returns (see [AnimationEngine.ts:225](dev/engine/AnimationEngine.ts#L225)).

### 3d. `animationEngine.setOverriddenTracks(set)` — single caller
- `engine/animation/AnimationSystem.tick` — on recording start (set to active modulation targets) and stop (set to empty). Tells scrub to skip those tracks while modulation owns them.

### 3e. `animationEngine.registerScrubHook(phase, fn)` — pre/post hooks
- `engine-gmt/animation/cameraBinders.installGmtCameraBinders` — registers pre and post hooks for the GMT split-precision camera commit.

## 4. Modulation runtime

Two parallel implementations of the same pipeline.

### 4a. Live (per-tick)
- `engine/animation/AnimationSystem.tick` (588 lines) — orchestrates:
  1. Recording on/off transitions.
  2. `animationEngine.tick(delta)` — keyframe playback.
  3. `audioAnalysisEngine.update()` — FFT sample.
  4. `syncAudioClips(...)` — deck playback alignment.
  5. `modulationEngine.resetOffsets()` + clear `engine.modulations`.
  6. `modulationEngine.updateOscillators(animations, oscTime, oscDt)` — LFO eval.
  7. `modulationEngine.update(rules, delta)` — audio rule eval.
  8. For each modulation target: resolve base (DDFS or special case), apply offset, write uniform via `FRACTAL_EVENTS.UNIFORM`, accumulate live recording captures, write to `liveModulations`.

### 4b. Offline export (per-frame)
- `engine-gmt/components/timeline/exportModulations.applyExportModulations(time, dt)` — duplicates much of step 6's logic for video export. Calls `applyModulationsAt(time, dt)` (which itself extracts steps 5-7) then re-implements steps 8a-g inline for uniform mapping.
- `components/timeline/exportModulations.ts` — older variant of the same.

**The duplication is the source of "live and export disagree" bug class.** Each new modulation feature has to be added in both places. The Julia composite, color repeats, geometry rotation, lighting array, and DDFS vec branches all exist twice.

### 4c. Modulation source state (lives in `engineStore`, not `animationStore`)
- `engineStore.animations: AnimationParams[]` — LFO definitions. Mutated by `LfoList.tsx` via `addAnimation` / `removeAnimation` / `updateAnimation`. NOT undoable.
- `engineStore.modulation.rules: ModulationRule[]` — audio rule definitions. Mutated by `AudioLinkControls.tsx`, `AudioSpectrum.tsx`, `AudioPanel.tsx`. NOT undoable.
- `engineStore.audio.{ isEnabled, ... }` — audio system state. Mutated by `AudioPanel.tsx`.
- `engineStore.liveModulations: Record<string, number>` — published per-tick by `AnimationSystem`. Read by sliders to show modulated value.
- `engine.modulations` (worker proxy global) — published per-tick. Read by worker for uniform updates.

### 4d. Audio
- `audioAnalysisEngine` (singleton class) — owns AudioContext + AnalyserNode + two `Deck` instances. Methods: `loadTrack`, `play`, `pause`, `seek`, `connectMicrophone`, `connectSystemAudio`, `update`, `getRawData`.
- `engine/animation/audioFileCache.ts` — module-level Map keeping the source `File` per deck (for export re-decode).
- `engine/animation/audioClipSync.ts` — per-tick deck⇄timeline sync; called from AnimationSystem.tick.
- `engine/animation/audioExportMix.ts` — decode + resample for video export.
- `animationStore.audioClips: (AudioClip | null)[]` — per-deck timeline placement. Mutated by `AudioStrip.tsx` via `setAudioClip` / `updateAudioClip`. NOT in sequenceSlice; in `audioClipsSlice`.

## 5. Recording — three independent modes

Each mode has its own boolean and its own writers. There is no central recording coordinator.

### 5a. Manual key recording (`isRecording`)
- Toggled via `playbackSlice.toggleRecording()`. UI: red record button in TimelineToolbar.
- Writers when `isRecording === true`:
  - `useTrackAnimation.autoKeyOnChange(newValue)` — every Slider with a `trackId` calls this on change.
  - `useTrackAnimation.autoKeyOnDragStart()` — same, on drag start.
  - `vector-input/Vector2Input/Vector3Input.onDragEnd` — writes a key for each component.
  - `Navigation.tsx` line 1180-1181 — when also `recordCamera`, calls `captureCameraKeyFrame` per tick.

### 5b. Camera-only recording (`recordCamera`)
- Toggled via `playbackSlice.toggleRecordCamera()`. UI: separate camera-record toggle.
- Combines with `isRecording`: only fires when `isPlaying && isRecording && recordCamera`.
- Single writer: `Navigation.tsx` per-frame loop → `captureCameraKeyFrame(currentFrame, { skipSnapshot: true })`.
- Read by: `AnimationEngine.scrub`'s `ignoreCamera` flag — skip camera tracks while user is driving them.

### 5c. Modulation recording (`isArmingModulation` → `isRecordingModulation`)
- Two-step: `toggleArmModulation()` arms; `play()` transitions arm → record. UI: "Arm Mod" + Play.
- Writer: `AnimationSystem.tick` per-tick gap-fill via `batchAddKeyframesMultiRange`.
- Special read: `AnimationEngine.scrub` reads `recordingSnapshot` instead of live sequence (prevents jitter when modulation crosses zero).
- Auto-stops at end of timeline via `playbackSlice.stopModulationRecording()`.

The three modes have overlapping UI, overlapping triggers, but no shared state machine. A user can have all three flags on simultaneously; the result is undefined behaviour shaped by which mode's writer fires first per tick.

## 6. Registries (extension points — already clean)

These are the parts of the system that are designed correctly today.

- **`binderRegistry`** ([engine/animation/binderRegistry.ts](dev/engine/animation/binderRegistry.ts)) — explicit value writers for non-conventional tracks. Used by `engine-gmt/animation/cameraBinders.ts` for split-precision camera (7 binders). Lookup wins over DDFS auto-resolver. Idempotent register.
- **`cameraKeyRegistry`** ([cameraKeyRegistry.ts](dev/engine/animation/cameraKeyRegistry.ts)) — declares which tracks form a camera pose AND holds an app-provided `_captureFn`. Apps call `registerCameraKeyTracks([...])` and optionally `setCameraKeyCaptureFn(fn)`.
- **`cameraPairRegistry`** ([cameraPairRegistry.ts](dev/engine/animation/cameraPairRegistry.ts)) — pan/zoom pair binding for visually-coherent deep zoom.
- **`logTrackRegistry`** ([logTrackRegistry.ts](dev/engine/animation/logTrackRegistry.ts)) — track IDs that interpolate in log space.
- **`featureRegistry`** ([engine/FeatureSystem.ts](dev/engine/FeatureSystem.ts)) — DDFS features; binders auto-derived from feature definitions.

These don't need to change. They are the model for what "good" looks like in this codebase: clear single responsibility, idempotent registration, app-provided callbacks for app-specific behaviour.

## 7. Boot order (per-app)

Every app has its own `main.tsx` that calls some subset of installs. The order matters but is implicit.

| Step | Call | Required by | Consequence if missing |
|---|---|---|---|
| 1 | (app-defined) | All | — |
| 2 | `installModulation()` | Modulation tick | Animation never advances |
| 3 | `installModulationUI()` | LFO panel | LfoList not in panel manifest |
| 4 | `<EngineBridge />` mount → `bindStoreToEngine()` | `animationEngine.connect` | `animationEngine.tick` early-returns silently |
| 5 | `registerCameraKeyTracks([...])` | Key Cam button | Button hidden |
| 6 | `setCameraKeyCaptureFn(fn)` (optional) | Apps with off-store camera | Default DDFS walker runs (may capture zeros) |
| 7 | `binderRegistry.register({...})` (multiple) | Composite tracks | Track writes are no-op (silent) |
| 8 | `registerLogTrack(id)` (per track) | Log-space interp | Linear interp on a log track collapses the timeline |
| 9 | `registerCameraPair({...})` | Coherent zoom-pan | Pan whips at deep zoom |
| 10 | `installGmtCameraBinders()` (GMT only) | Split-precision camera | Camera animation jitters at integer boundaries |

**No documented contract for ordering.** The current apps work because their `main.tsx` files are the ground truth. A new app cargo-cults from one of them.

## 8. External I/O (scene save/load)

- **`utils/PresetLogic.ts:110`** — calls `useAnimationStore.getState().setSequence(p.sequence)` on preset load.
- **`engine/plugins/SceneIO.tsx`** — Save/Load slot plugin. Uses pluggable `parseScene` / `serializeScene` from `utils/SceneFormat.ts`. Apps inject custom parsers.
- **`engine-gmt/utils/FormulaFormat.ts`** — GMT's GMF format implementation: `saveGMFScene` / `loadGMFScene`. Embeds shader source so saved scenes load on a fresh runtime.
- **`engine-gmt/gallery/loadGalleryScene.ts`** + **`submitGalleryItem.ts`** — Supabase gallery I/O.
- **`engine-gmt/topbar.tsx`** — Save/Load buttons.
- **`engine-gmt/components/panels/formula/FormulaSelect.tsx`** + **`FormulaGallery.tsx`** — workshop formula loading.
- **`mesh-export/components/MeshExportApp.tsx`** + **`FormulaSelector.tsx`** — mesh export tool.

All of these eventually funnel through `setSequence` (the only entry that replaces the whole sequence wholesale).

## 9. The proposed module decomposition

Six concerns. Today they are smeared across ~10 files; tomorrow they are owned by six modules with explicit boundaries.

```
+----------------------------+   +-----------------------------+
|  AnimationDocument         |   |  Registries (unchanged)     |
|  - tracks, keyframes, undo |   |  binder / cameraKey /       |
|  - patches, transactions   |   |  cameraPair / logTrack /    |
|  - subscribe(per-track)    |   |  feature                    |
+----------------------------+   +-----------------------------+
        ^      ^      ^                       ^
        |      |      |                       |
  reads |      |reads | reads/writes          | consults
+-------+   +--+---+   +------------+   +-----+--------+
| Player |  | Eng. |   | Recorder   |   | ModRuntime    |
| play   |  | scrub|   | one mode   |   | LFO + audio   |
| pause  |  | bind |   | machine    |   | rule eval     |
| seek   |  | tick |   | ARM/REC/   |   | offsets out   |
| fps    |  +------+   | CAM modes  |   +---------------+
+--------+              +------------+        ^
                             ^                |
                             |                | reads buf, decks
                             |        +-------+--------+
                             +------->| AudioRuntime   |
                                      | analyser+decks |
                                      | clip sync      |
                                      +----------------+
```

### 9.1 `AnimationDocument` (data layer)
- Owns tracks, keyframes, undo log.
- Single API for all writes — no direct `setState` on `sequence` allowed anywhere else.
- The two camera-key-capture sites (§1c) become document methods (`addTrackAndKeys` or one transaction containing both).
- Replaces `sequenceSlice` entirely.

### 9.2 `Player` (playback state)
- `isPlaying`, `currentFrame`, `fps`, `loopMode`, `deterministicPlayback`.
- `play()`, `pause()`, `stop()`, `seek(frame)`, `setFps(fps, mode)`.
- Drives the master clock; `Engine.tick(dt)` is its only consumer.
- Stays in Zustand (it IS UI state).
- Equality gates on every write (the [`setIsCameraInteracting` pattern](dev/store/animation/playbackSlice.ts#L80) becomes the rule, not the exception).

### 9.3 `Engine` (interpolation + binder dispatch)
- Pure: reads from Document, writes via binders.
- `scrub(frame)` is the single entry point for "evaluate the timeline at frame N".
- The 16 scrub callers (§3a) collapse where reasonable: UI scrubbers all become "set Player.currentFrame; Engine.scrub fires from the Player's clock", removing the manual scrub calls from drag handlers.
- Pre/post scrub hooks remain (used by GMT's split-precision camera).
- `setOverriddenTracks` becomes private to the Recorder (§9.5).

### 9.4 `ModulationRuntime` (LFO + rule eval)
- `evaluateOffsetsAt(time, dt) → Map<targetKey, offset>` — the single pipeline.
- Live tick AND export both call this. **Eliminates the duplicated `exportModulations.ts` pipeline.**
- Reads from `engineStore.animations` + `engineStore.modulation.rules` + `audioAnalysisEngine`.
- Returns offsets; doesn't know about uniforms or stores.
- A separate `applyOffsetsToEngine(offsets)` step (lives in the host app — GMT vs. fluid-toy have different uniform mapping) consumes the result. The GMT-specific branches in AnimationSystem.tsx (Julia composite, color repeats, etc.) move into a GMT host file.

### 9.5 `Recorder` (one state machine for all three modes)
- States: `Idle`, `RecordingManual`, `RecordingCamera`, `RecordingModulation` (or composite states for the legitimate combinations).
- Transitions are explicit; illegal combinations rejected at the boundary.
- Owns `recordingSnapshot` (or its replacement — see refactor doc §4a).
- Owns the `Engine.setOverriddenTracks` call (private).
- Consumes ModulationRuntime offsets during ModRecord; calls `Document.batchAppend` to commit.
- Bake (offline modulation rendering) lives here.

### 9.6 `AudioRuntime` (audio analyser + decks + clip sync)
- Wraps `audioAnalysisEngine` + `audioFileCache` + `audioClipSync` + `audioExportMix`.
- Single entry: `getMagnitudesAtTime(t)` for both live and offline.
- Eliminates the live/export FFT divergence concern from the refactor doc §H.

## 10. Boundary cleanups this audit surfaces

Things the audit revealed that we should fix regardless of when the document refactor lands:

1. **`updateKeyframe` mutates in place** ([sequenceSlice.ts:393-394](dev/store/animation/sequenceSlice.ts#L393)). Should clone like its siblings. Latent footgun for any future memoisation.
2. **`updateKeyframes` mutates in place** ([sequenceSlice.ts:415](dev/store/animation/sequenceSlice.ts#L415)). Same.
3. **Two `exportModulations.ts` files** — `components/timeline/exportModulations.ts` AND `engine-gmt/components/timeline/exportModulations.ts`. The dev/ tree has the duplicate; the engine-gmt one is the live one. Delete the orphan.
4. **`captureCameraFrame` removed comment** ([sequenceSlice.ts:676-681](dev/store/animation/sequenceSlice.ts#L676)) — the slice action is gone but the doc reference might be stale.
5. **`isFlatTrack` is exported from TrackRow** ([TrackRow.tsx](dev/components/timeline/TrackRow.tsx)) and imported by GraphSidebar. Lives in the wrong module. Move to `utils/timelineUtils.ts`.
6. **No documented boot order.** §7 above is the first time it's been written down; add it to `docs/engine/08_Animation.md`.
7. **`addKeyframe` does NOT call snapshot but `removeKeyframe` does.** Asymmetric and surprising. Document or fix.

## 11. What this means for the refactor plan

The companion design doc proposes "AnimationDocument" as the central data layer. This audit confirms that diagnosis but expands the scope: the *whole module decomposition* is wrong, not just the data layer. A clean cut means six modules, not one.

That changes the refactor plan in two ways:

- **The "files-touched matrix" in the design doc is incomplete.** It misses `exportModulations.ts`, `applyAt.ts`, `audioClipSync.ts`, the cameraKeyRegistry direct-`setState` paths, and the recording-mode entanglement across `vector-input` / `useTrackAnimation` / `Navigation`. The realistic surface is ~25 files, not ~20.

- **The phasing should follow the module boundaries, not the optimisation surfaces.** Concretely:
  - Phase 0 — `AnimationDocument` (data) + tests.
  - Phase 1 — extract `ModulationRuntime` (collapses the live/export pipeline duplication; biggest correctness win, low UI risk).
  - Phase 2 — extract `Recorder` (collapses three recording modes into one state machine; high UX value).
  - Phase 3 — extract `AudioRuntime` (cleanest module, isolates audio for the offline-bake work).
  - Phase 4 — extract `Player` (playback state stays in Zustand; just narrows responsibility).
  - Phase 5 — narrow `Engine` to scrub+binders, document its read API.
  - Phase 6 — canvas DopeSheet (UI layer — only sensible after the data layer is stable).
  - Phase 7 — canvas GraphEditor.
  - Phase 8 — cleanup, delete orphans (§10).

Each phase ships independently. The design doc's three-week estimate was already optimistic; this expanded scope is realistically 8-12 weeks. The trade-off is that we'd ship a system that is actually maintainable, not one that's been re-shaped to meet today's perf complaint.

## 12. Recommendation

Before starting any phase, do the **spike from the refactor doc §recommendation**: a 2-3 day proof-of-concept on one specific cost (per-track polyline cache for GraphEditor, or `useTrackAnimation` per-track sub) to validate the architectural diagnosis empirically. If the prototype's measurement matches our model, commit to the full module decomposition above. If it doesn't, we learn something important before spending eight weeks on a wrong premise.

The pre-spike question to answer for each module is: *"What would this module's API look like if we were designing the system today, given everything we've learned?"* The audit gives the inputs. The answer becomes Phase 0's design.
