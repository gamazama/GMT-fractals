---
subsystem_id: e03-animation
audited_at: 2026-05-19T20:45:00Z
files:
  - path: engine/AnimationEngine.ts
    blob_sha: 5afdf9d91efcc61e47b9e69a77a2a54c675d81a9
    lines_read: [1, 404]
  - path: engine/BezierMath.ts
    blob_sha: f3e614da5a2a8b7e81fac7f78d9b8f4b97130f31
    lines_read: [1, 113]
  - path: engine/animation/AnimationSystem.tsx
    blob_sha: 820c017356c439b82562d71795abc7de1fcfe6bc
    lines_read: [1, 592]
  - path: engine/animation/binderRegistry.ts
    blob_sha: 8c69668a6eb4300ec173aea7f8a1ea725ec5c159
    lines_read: [1, 77]
  - path: engine/animation/trackBinding.ts
    blob_sha: f78d0b9a952bf6aee8efa6a0191c89b715f3fe0a
    lines_read: [1, 106]
  - path: engine/animation/cameraKeyRegistry.ts
    blob_sha: 5d99599bbd4f01caaaf30da51f663c426f72d94b
    lines_read: [1, 186]
  - path: engine/animation/cameraPairRegistry.ts
    blob_sha: 9d982a977a047addb165606bb76975f1588a56bf
    lines_read: [1, 351]
  - path: engine/animation/logTrackRegistry.ts
    blob_sha: 527faf584217e29ee443890966670fb8a3f823f4
    lines_read: [1, 41]
  - path: engine/animation/renderPopupRegistry.ts
    blob_sha: 3cfc95c97d3bb72eabdca7c768744766f6edfcb2
    lines_read: [1, 31]
  - path: engine/animation/modulationTick.ts
    blob_sha: 75ae0da62332cd663a7f20cbd1ea4a15cec64a16
    lines_read: [1, 53]
  - path: engine/animation/audioClipSync.ts
    blob_sha: 932a0cefb6f7a8a3ed1e15bac07b2562cda88f15
    lines_read: [1, 87]
  - path: engine/animation/audioExportMix.ts
    blob_sha: e2e11bd94a62a99e49da9d6650db939448388ac6
    lines_read: [1, 104]
  - path: engine/animation/audioFileCache.ts
    blob_sha: 0e59e8156ef55a8148c00871dd98009872073d1d
    lines_read: [1, 18]
---

## Public API surface

### `engine/AnimationEngine.ts`
- `interface ScrubContext { frame, isPlaying, isRecording, recordCamera, ignoreCamera }` — engine/AnimationEngine.ts:21
- `type ScrubHook = (ctx: ScrubContext) => void` — engine/AnimationEngine.ts:32
- `class AnimationEngine` — engine/AnimationEngine.ts:34
  - `connect(animStore, fractalStore)` — engine/AnimationEngine.ts:50
  - `setOverriddenTracks(ids: Set<string>)` — engine/AnimationEngine.ts:55
  - `registerScrubHook(phase: 'pre'|'post', fn): () => void` — engine/AnimationEngine.ts:65
  - `tick(dt: number)` — engine/AnimationEngine.ts:224
  - `scrub(frame: number)` — engine/AnimationEngine.ts:279
- `export const animationEngine = new AnimationEngine()` — engine/AnimationEngine.ts:404

### `engine/BezierMath.ts`
- `solveCubicBezierT(x, x0, x1, x2, x3): number` — engine/BezierMath.ts:32
- `splitCubicBezier(t, p0x..p3y): { sx, sy, leftP1x..rightP2y }` (de Casteljau) — engine/BezierMath.ts:61
- `solveBezierY(frame, k1Frame, k1Val, k1HandleX, k1HandleY, k2Frame, k2Val, k2HandleX, k2HandleY): number` — engine/BezierMath.ts:90

### `engine/animation/AnimationSystem.tsx`
- `export const tick = (delta: number) => void` — engine/animation/AnimationSystem.tsx:83
- `export const AnimationSystem: React.FC = () => null` (no-op back-compat shell) — engine/animation/AnimationSystem.tsx:592

### `engine/animation/binderRegistry.ts`
- `interface BinderEntry { id, write, category?, label? }` — engine/animation/binderRegistry.ts:27
- `binderRegistry.register(entry): () => void` — engine/animation/binderRegistry.ts:45
- `binderRegistry.lookup(id): BinderEntry | undefined` — engine/animation/binderRegistry.ts:57
- `binderRegistry.list(): BinderEntry[]` — engine/animation/binderRegistry.ts:63
- `binderRegistry.clear()` (tests/HMR only) — engine/animation/binderRegistry.ts:69
- `window.__binders` dev handle — engine/animation/binderRegistry.ts:76

### `engine/animation/trackBinding.ts`
- `interface TrackBindingInput { featureId, paramKey, label, axes, composeFrom? }` — engine/animation/trackBinding.ts:34
- `interface TrackBinding { trackKeys, trackLabels? }` — engine/animation/trackBinding.ts:52
- `deriveTrackBinding(input): TrackBinding` — engine/animation/trackBinding.ts:63
- `readLiveVec(liveModulations, binding): THREE.Vector2|3|4 | undefined` — engine/animation/trackBinding.ts:93

### `engine/animation/cameraKeyRegistry.ts`
- `type CameraKeyTrackEntry = string | { id, hidden? }` — engine/animation/cameraKeyRegistry.ts:27
- `interface CameraKeyCaptureOptions { skipSnapshot?, interpolation? }` — engine/animation/cameraKeyRegistry.ts:44
- `type CameraKeyCaptureFn = (frame, tracks, opts?) => void` — engine/animation/cameraKeyRegistry.ts:67
- `setCameraKeyCaptureFn(fn)` — engine/animation/cameraKeyRegistry.ts:74
- `captureCameraKeyFrame(frame, opts?)` — engine/animation/cameraKeyRegistry.ts:86
- `registerCameraKeyTracks(tracks)` — engine/animation/cameraKeyRegistry.ts:160
- `getCameraKeyTracks(): readonly string[]` — engine/animation/cameraKeyRegistry.ts:172
- `subscribeCameraKeyTracks(cb): () => void` — engine/animation/cameraKeyRegistry.ts:181

### `engine/animation/cameraPairRegistry.ts`
- `interface CameraPair { zoom, pan, panLow? }` — engine/animation/cameraPairRegistry.ts:92
- `registerCameraPair(pair)` — engine/animation/cameraPairRegistry.ts:113
- `evaluatePairedTrack(trackId, frame, sequence): number | undefined` — engine/animation/cameraPairRegistry.ts:331

### `engine/animation/logTrackRegistry.ts`
- `registerLogTrack(trackId)` — engine/animation/logTrackRegistry.ts:31
- `unregisterLogTrack(trackId)` — engine/animation/logTrackRegistry.ts:35
- `isLogTrack(trackId): boolean` — engine/animation/logTrackRegistry.ts:39

### `engine/animation/renderPopupRegistry.ts`
- `type RenderPopupComponent = React.ComponentType<{ onClose: () => void }>` — engine/animation/renderPopupRegistry.ts:12
- `registerRenderPopup(component)` — engine/animation/renderPopupRegistry.ts:17
- `getRenderPopup(): RenderPopupComponent | null` — engine/animation/renderPopupRegistry.ts:22
- `subscribeRenderPopup(cb): () => void` — engine/animation/renderPopupRegistry.ts:26

### `engine/animation/modulationTick.ts`
- `installModulation()` — engine/animation/modulationTick.ts:39
- `uninstallModulation()` — engine/animation/modulationTick.ts:51
- `window.__animEngine` dev handle — engine/animation/modulationTick.ts:32
- `window.__animTickCount` smoke-test counter — engine/animation/modulationTick.ts:47

### `engine/animation/audioClipSync.ts`
- `_resetAudioClipSync()` — engine/animation/audioClipSync.ts:16
- `syncAudioClips(clips, currentFrame, fps, isPlaying)` — engine/animation/audioClipSync.ts:36

### `engine/animation/audioExportMix.ts`
- `interface MixedAudio { pcm, sampleRate, numFrames, durationSec }` — engine/animation/audioExportMix.ts:4
- `mixAudioClipsForExport(clips, fps, startFrame, endFrame, sampleRate?): Promise<MixedAudio|null>` — engine/animation/audioExportMix.ts:15

### `engine/animation/audioFileCache.ts`
- `setAudioFile(deckIndex, file)` — engine/animation/audioFileCache.ts:8
- `getAudioFile(deckIndex): File | undefined` — engine/animation/audioFileCache.ts:12
- `clearAudioFile(deckIndex)` — engine/animation/audioFileCache.ts:16

## Architecture

- `installModulation()` registers `AnimationSystem.tick` into `TICK_PHASE.ANIMATE`; idempotent (no-op when already installed), tracks tick count for smokes via `window.__animTickCount` — engine/animation/modulationTick.ts:39-49.
- `AnimationEngine` holds **no React refs** and is fully store-injected via `connect(animStore, fractalStore)` — `tick`/`scrub` early-return when `animStore` is null — engine/AnimationEngine.ts:50, engine/AnimationEngine.ts:225, engine/AnimationEngine.ts:280.
- `tick(dt)` advances the timeline with either real `dt*fps` or a deterministic-playback path that accumulates wall-clock into integer frames at project fps and discards backlog when `dt > 0.25s` (tab focus return) — engine/AnimationEngine.ts:243-258.
- Loop modes: `Once` and `isRecordingModulation` both stop playback at duration (committing the final frame via `scrub(duration)`); other modes wrap nextFrame to 0; `stopModulationRecording()` is invoked when ending a recording-mode play — engine/AnimationEngine.ts:261-273.
- `scrub(frame)` reads from `recordingSnapshot` instead of the live sequence whenever `isRecordingModulation && recordingSnapshot` — prevents per-tick jitter when the user briefly returns to a zero modulation offset while the live sequence is being mutated — engine/AnimationEngine.ts:283-289.
- `ScrubHook` (pre/post) extension point lets host apps (GMT split-precision sceneOffset) snapshot live camera before binders write and emit `CAMERA_TELEPORT` after — engine/AnimationEngine.ts:65, engine/AnimationEngine.ts:296-325.
- Binder resolution order in `getBinder`: explicit `binderRegistry.lookup` first (always — never cached in `this.binders`), then per-id cache, then legacy `lights.<i>.*` redirect to `lighting.light<i>_*`, then DDFS via `featureRegistry.get(parent)` and `set${Parent}` setter, then root-prop `set${Id}` fallback — engine/AnimationEngine.ts:74-222.
- DDFS vec axis writer clones the current vec (THREE.Vector* `.clone()` or object spread) then overwrites the named axis; matches UNDERSCORE form `feature.param_axis` first, falls back to DOT form `feature.param.axis` for early-phase-5 saves — engine/AnimationEngine.ts:164-205.
- `interpolate(track, frame)` handles post-end behaviors `Hold | Continue | Loop | PingPong | OffsetLoop`; `Continue` derives slope from `lastKey.leftTangent` for Bezier keys, else uses prev/last differential — engine/AnimationEngine.ts:328-388.
- `evaluateCurveInternal` does linear segment-search across keys and delegates to `AnimationMath.interpolate(frame, k1, k2, isRotation, isLog)`; `isRotation` is heuristic on track id (`camera.rotation`, `rot`, `phase`, `twist`) — engine/AnimationEngine.ts:334, engine/AnimationEngine.ts:390-400.
- `scrub` skips tracks whose ids are in `overriddenTracks` (set by AnimationSystem during modulation recording to prevent self-fight), tracks ending in `camera.position`/`camera.offset` (legacy hardcoded skip), and all `camera.*` when `ignoreCamera` (record-camera mode) — engine/AnimationEngine.ts:302-309.
- `evaluatePairedTrack` is consulted per track inside `scrub` so camera-pair (linear-in-zoom) interpolation wins over standard track interpolation when registered, with explicit fallthrough when undefined — engine/AnimationEngine.ts:317-318.
- `BezierMath` provides a 4-iteration Newton–Raphson solve for `T(x)` plus a de Casteljau split helper used by curve-preserving keyframe insertion — engine/BezierMath.ts:5, engine/BezierMath.ts:61.
- `AnimationSystem.tick` is a single 500-line function that runs **after** `animationEngine.tick(delta)`, then drives audio analysis, audio clip sync, modulation engine oscillators + rules, and merges resolved offsets into per-target uniform writes / liveModulations — engine/animation/AnimationSystem.tsx:83-585.
- Recording-on/off transitions live inside the tick (not a React effect) so app-gmt — which never mounts the legacy `<ViewportArea>` shell — still clears `overriddenTracks` when recording stops — engine/animation/AnimationSystem.tsx:88-108.
- Modulation-record writes are buffered into `recordBuffer` and flushed every `RECORD_FLUSH_MS = 400` (or on recording-stop), each flush calling `batchAddKeyframesMultiRange` — reduces DopeSheet re-render rate to ~6/sec regardless of recording length — engine/animation/AnimationSystem.tsx:72-80, engine/animation/AnimationSystem.tsx:526-541.
- The tick uses `activeTargetsRef` to track previous-frame modulation targets so a deleted LFO still triggers one cleanup pass (baseline uniform write + clear liveModulations); the early-return guard refuses to skip while prev targets are non-empty — engine/animation/AnimationSystem.tsx:122-135.
- Uniforms flow via `FractalEvents.emit(FRACTAL_EVENTS.UNIFORM, ...)` rather than `engine.setUniform` because engine-core's WorkerProxy is a stub — only host apps that installed a real worker-proxy bridge (GMT) receive them — engine/animation/AnimationSystem.tsx:30-39.
- GMT-specific composite branches in `AnimationSystem` (coloring repeats/phase, julia composite, geometry pre/post/world rotation, lighting array) are **gated by slice existence** so engine-fork apps without those slices fall through cleanly — engine/animation/AnimationSystem.tsx:322-462.
- Generic vec match `^(\w+)\.(\w+)_([xyzw])$` follows the GMT branches and reads the per-feature slice; the live modulation entry is always written, the uniform write is conditional on the feature declaring a uniform — engine/animation/AnimationSystem.tsx:470-509.
- Deterministic-playback phase for LFO oscillators uses `currentFrame / fps` instead of `performance.now() / 1000`, so live LFO phase matches the exported video — engine/animation/AnimationSystem.tsx:162-170.
- `liveModulations` write to `useEngineStore.setLiveModulations` is gated on shallow-equality of keys + values, otherwise per-frame ref-replacement re-rendered every subscribing component every frame (tripping React's max-update-depth in fluid-toy pan) — engine/animation/AnimationSystem.tsx:559-582.
- `binderRegistry` is a plain `Map<string, BinderEntry>`; `register` returns an unregister fn that **only deletes if this exact entry is still the occupant** so a teardown doesn't tear down a later replacement — engine/animation/binderRegistry.ts:40-53.
- `deriveTrackBinding` produces canonical track keys: scalar → `feature.param`, vec → `feature.param_axis` per axis, `composeFrom` override emits one track per listed scalar key — engine/animation/trackBinding.ts:63-84.
- `readLiveVec` returns `undefined` when **all** axes are undefined in liveModulations, otherwise per-axis fallback to 0 — consumer can switch to base value from the slice on undefined — engine/animation/trackBinding.ts:93-105.
- `cameraKeyRegistry` keeps a stable `cameraKeyTrackIds` reference so `useSyncExternalStore` callers do not trip "snapshot changed without notify"; only mutated inside `registerCameraKeyTracks` — engine/animation/cameraKeyRegistry.ts:34-39, engine/animation/cameraKeyRegistry.ts:160-164.
- `captureCameraKeyFrame` routes through the host-registered `_captureFn` when set; otherwise the default DDFS walker path-resolves each track (supports scalar paths and trailing `base_axis` vec-component form), takes ONE undo snapshot for the whole batch (unless `skipSnapshot`), and inline-creates missing tracks bypassing `addTrack`'s per-track snapshot — engine/animation/cameraKeyRegistry.ts:86-150.
- `cameraPairRegistry` maintains a `Map<trackId, CameraPair>` index; on `registerCameraPair`, existing `panLow` tracks in the store get retroactively flagged `hidden:true` (handles app-boot ordering after loading an old scene) — engine/animation/cameraPairRegistry.ts:111-138.
- `evaluatePairedTrack` routes any pan or panLow track through `evaluateDDPairAxis`, which DD-lerps `(hi, lo)` as a single pair using Knuth two-sum + Veltkamp-split two-product; returns `hi` for pan tracks and `lo` for panLow — engine/animation/cameraPairRegistry.ts:331-351.
- Per-frame DD cache (`ddCache`) keyed by `(zoomTrackId, axis)` is validated by **both** frame equality and sequence reference equality; Zustand swaps the sequence ref on any keyframe edit, giving free invalidation when the user edits at the playhead — engine/animation/cameraPairRegistry.ts:224-244.
- `panProgress` re-normalizes pan-key Bezier tangent y-values into u-space (divides by `dc = k1.value - k0.value`) so graph-editor curve shape maps to `u(t)` re-shaping — engine/animation/cameraPairRegistry.ts:166-213.
- Linear-in-zoom math uses `log(z1)-log(z0)` distance to gate flat-zoom fallback (zRatio < 1e-9 → progress = u_eased), otherwise the standard `(zT_virt - z0) / (z1 - z0)` ratio — engine/animation/cameraPairRegistry.ts:286-299.
- `logTrackRegistry` is a tiny `Set<string>` — only `AnimationEngine.interpolate` and `cameraPairRegistry`'s zoom lookup consume it via `isLogTrack(trackId)` — engine/animation/logTrackRegistry.ts:29-41.
- `renderPopupRegistry` is the toolbar's escape hatch: stripped GMT's 1046-line export dialog out of the engine; apps register their own component or the Render button hides itself — engine/animation/renderPopupRegistry.ts:1-31.
- `syncAudioClips` enforces the "never seek during steady-state play" rule — only triggers `seek` on resume, scrub jumps > 0.5s timeline-time, or first frame; `ownedDecks` tracks which decks the timeline is currently driving so manual deck plays aren't auto-paused — engine/animation/audioClipSync.ts:8-86.
- `mixAudioClipsForExport` uses inclusive end (`(endFrame + 1) / fps`) so the export window covers the trailing frame's full slot — without `+1` there's ~40ms tail mismatch; per-clip linear-interpolation resample for source-rate mismatch, then hard-clip overlap to ±1 — engine/animation/audioExportMix.ts:27-101.
- `audioFileCache` is a module-singleton `Map<0|1, File>` keyed by the two-deck audio system; `AudioClip` metadata in the store is structured-cloneable, the raw `File` only lives transiently here for re-decode (export) and peak-recompute — engine/animation/audioFileCache.ts:1-18.

## Invariants and gotchas

- **Animation tick depends on store connection.** `installModulation()` registers the tick, but without `bindStoreToEngine()` (which calls `animationEngine.connect(...)`) every `tick`/`scrub` early-returns silently — engine/AnimationEngine.ts:225, engine/AnimationEngine.ts:280.
- **DDFS vec match order matters.** `getBinder` checks UNDERSCORE form (`param_axis`) BEFORE the DOT form path-segment. A literal scalar named `power_x` is interpreted as `power.x` only if `power` exists as a vec-shaped object in the slice; otherwise falls through to scalar — engine/AnimationEngine.ts:181-192.
- **`binderRegistry` always wins over the per-id cache.** Lookup happens before `this.binders.has(id)` so a binder registered after a previous DDFS-derived lookup takes effect immediately — engine/AnimationEngine.ts:82-86.
- **Camera position/offset hardcoded skip.** Tracks containing `camera.position` or `camera.offset` are unconditionally skipped in `scrub` — legacy hardcoding that the binderRegistry refactor hasn't replaced — engine/AnimationEngine.ts:307.
- **`ignoreCamera` is computed as `isPlaying && isRecording && recordCamera`.** Skips ALL `camera.*` tracks during record-camera mode — engine/AnimationEngine.ts:291.
- **`recordingSnapshot` doubles as scrub source AND clean-base source.** Scrub reads it instead of live sequence during recording (engine/AnimationEngine.ts:288); the modulation tick reads it for `cleanBase` in keys-to-record (engine/animation/AnimationSystem.tsx:298, 441, 485).
- **Recording flush is throttled.** Per-tick writes during recording are buffered; the flush interval is `RECORD_FLUSH_MS=400`; on recording-stop the buffer is force-flushed BEFORE `setOverriddenTracks(EMPTY_OVERRIDES)` — engine/animation/AnimationSystem.tsx:101-107, 526-541.
- **`activeTargetsRef.current.size > 0` blocks the early-return.** Even when all driving features (LFOs, rules, clips, audio, animations) are off, the tick still runs one more pass to clear the previous frame's stale uniforms — engine/animation/AnimationSystem.tsx:130-135.
- **Uniforms go through events, not `engine.setUniform`.** Engine-core WorkerProxy is a stub; emit via `FractalEvents.emit(FRACTAL_EVENTS.UNIFORM, ...)` — engine/animation/AnimationSystem.tsx:34-36.
- **Camera-pair lerp uses DD precision unconditionally** even when no `panLow` is registered (lo₀ = lo₁ = 0). Routes through `evaluateDDPairAxis` for both hi and lo to keep coherence — engine/animation/cameraPairRegistry.ts:338-350.
- **DD cache invalidates on `sequence` reference, not deep equality.** Editing a key during playback gets fresh values because Zustand swaps the sequence ref — engine/animation/cameraPairRegistry.ts:240-244.
- **Pan tangents are re-normalised into u-space.** Tangent y-values divided by `dc = k1.value - k0.value` so graph-editor handle shape applies as `u(t)` re-mapping; tangents stored in absolute value-space stay there for non-paired tracks — engine/animation/cameraPairRegistry.ts:194-209.
- **Log tracks ignore stored Bezier tangents.** Doc claims "Bezier on log tracks does the bezier solve in (frame, log-value) space" — implementation comment at engine/animation/logTrackRegistry.ts:22-26 says Bezier-on-log isn't supported and tangents are reinterpreted incorrectly under log; "log tracks evaluate as linear-in-log regardless of stored interpolation type." Delegates to `AnimationMath.interpolate` (not read in this audit) — engine/AnimationEngine.ts:396.
- **`recordPopupRegistry` is named `renderPopupRegistry`** (not a gotcha but spell-it-right): both `register/get/subscribeRenderPopup` exist — engine/animation/renderPopupRegistry.ts:17-31.
- **Audio clip sync uses a 0.5s timeline-time scrub threshold**, NOT a frame-count threshold — slow renders at low fps still won't trigger seeks (0.5s at 25fps ≈ 12 frames) — engine/animation/audioClipSync.ts:8.
- **Audio mix `+1` on `endFrame`** is load-bearing; comment explicitly calls out the ~40ms trailing mismatch otherwise — engine/animation/audioExportMix.ts:27-31.
- **`audioFileCache` typed `0 | 1` only.** Three or more decks would need a registry refactor — engine/animation/audioFileCache.ts:6.
- **`AnimationSystem` React component is a no-op shell** kept only for back-compat with sites that mount `<AnimationSystem />` — the modulation lifecycle is owned by the tick now — engine/animation/AnimationSystem.tsx:587-592.

## Drift from existing doc (dev/docs/engine/08_Animation.md)

| Doc claim | Current code | Severity |
|---|---|---|
| Import path `import { tick as animationSystemTick } from '../../components/AnimationSystem';` (doc line 19) | Actual import is `from './AnimationSystem'` — file lives at `engine/animation/AnimationSystem.tsx`, not `components/AnimationSystem` — engine/animation/modulationTick.ts:28 | warn |
| Binder resolution table includes "Case 0: `camera.active_index` → `selectCamera(savedCameras[round(v)].id)`" (doc line 50) | No such case in `getBinder` — `camera.active_index` is not handled by any built-in branch. Implemented (if at all) only via `binderRegistry` — engine/AnimationEngine.ts:74-222 | warn |
| Binder resolution table case 1 says `camera.unified.*` / `camera.rotation.*` are buffered into `pendingCam` + committed via CAMERA_TELEPORT (doc line 51) | `AnimationEngine.getBinder` has no `camera.unified.*` / `camera.rotation.*` branch — handled via `binderRegistry` from host app (per code comment engine/AnimationEngine.ts:93-97). Doc's "F5 partial" note acknowledges this drift but the resolution table still describes legacy behaviour as if built-in. | warn |
| Doc lists case 4 vec form supports `<feature>.<param>.<axis>` (DOT, doc line 53) | Both UNDERSCORE and DOT are supported, with UNDERSCORE preferred; doc's "F12 fixed" callout covers this but the case table only lists DOT — engine/AnimationEngine.ts:181-205 | info |
| Doc Sequence/Track types use `time: number` and `easingIn?/easingOut?` (doc lines 144-156) | Actual code uses `frame: number` (e.g. `lastKey.frame`, `firstKey.frame`) and `leftTangent`/`rightTangent`. The Keyframe type is imported from `../types` not redeclared locally — engine/AnimationEngine.ts:332-349 | warn |
| Doc `animation.subscribeTrack(id, cb)` API (doc line 293) | No `subscribeTrack` export found anywhere in audited files; not in `animationEngine` either. Either lives elsewhere or is aspirational. | warn |
| Doc `animation.play / pause / toggle / seek / setCurrentFrame` (doc line 218-223) | None of these exist on `animationEngine`. Playback control is via store actions (`isPlaying`, `currentFrame`) read by `tick` — engine/AnimationEngine.ts:227, 265. | warn |
| Doc Track-types table claims `bool`/`enum`/`string`/`image` step interpolation (doc lines 65-71) | `AnimationEngine.scrub` skips any track where `track.type !== 'float'` — non-float tracks are silently dropped at playback. Step semantics aren't implemented in the audited files — engine/AnimationEngine.ts:305 | break |
| Doc says "tracks evaluate in sorted id order for determinism" (doc line 235) | `scrub` iterates `Object.values(sequence.tracks)` in insertion order, not sorted — engine/AnimationEngine.ts:289, 299 | warn |
| Doc claims `interpolation` modes only need linear `lerpFloat` etc. via `engine/math/interpolators.ts` (doc line 242) | Interpolation delegates to `AnimationMath.interpolate(frame, k1, k2, isRotation, isLog)` (engine/AnimationEngine.ts:396), and rotation/log handling are intrinsic, not pluggable per-binder. Doc's `binder.interpolate = ...` extension point doesn't match the actual `BinderEntry` shape (`{ id, write, category?, label? }`) — engine/animation/binderRegistry.ts:27-38 | warn |
| Doc § "Recording modulation" describes API `animation.startRecording({ tracks, snapshotSource })` / `stopRecording()` / `cancelRecording()` (doc lines 188-199) | No such API found. Recording is driven by `animStore.isRecordingModulation` + `recordingSnapshot` flags read inside the tick — engine/animation/AnimationSystem.tsx:93-108, 198 | warn |
| Doc § "Bezier on log tracks does the bezier solve in (frame, log-value) space" (doc line 256) | logTrackRegistry comment explicitly states "Bezier-on-log isn't supported. Log tracks evaluate as linear-in-log regardless of stored interpolation type." — engine/animation/logTrackRegistry.ts:22-26 | break |
| Doc inline modulationTick example shows `(simplified)` snippet without `_debugTickCount` or `window.__animTickCount` (doc lines 18-28) | Real impl exposes `window.__animTickCount` for smoke tests; minor — engine/animation/modulationTick.ts:37-49 | info |
| Doc "Render Popup" — no doc section on it found | New escape-hatch registry shipped — engine/animation/renderPopupRegistry.ts:1-31 not covered in doc | info |
| Doc — no coverage of audio clip sync, audio export mix, audio file cache | Three new modules (audioClipSync, audioExportMix, audioFileCache) entirely absent from the doc; integration with `AnimationSystem.tick` is live — engine/animation/AnimationSystem.tsx:149-152 | warn |
| Doc — no coverage of `ScrubHook` extension point | `registerScrubHook('pre'|'post', fn)` is a public part of `AnimationEngine` used by GMT's split-precision camera; not mentioned — engine/AnimationEngine.ts:65-72 | warn |
| Doc fragility-audit row F5/F6/F7 — F5 still listed 🟡 partial (camera.unified hardcoded) | Code path is the OPPOSITE of what the doc claims: there are no hardcoded `camera.unified.*` / `camera.rotation.*` branches in `getBinder` anymore — comment at engine/AnimationEngine.ts:93-97 explicitly says these tracks live on host app via binderRegistry. F5 looks resolved-pending-doc-update. | warn |

Recommendation: minor-edits (most rows are info/warn pointing at specific corrections; one break — `track.type !== 'float'` silently drops non-float tracks while the doc promises step interpolation for bool/enum/string/image — and one break for log/Bezier interaction. The architecture sections of the doc are largely accurate; the type signatures, public-API examples, and the binder-resolution table need targeted updates rather than a rewrite.)

## Open questions

(none — all findings are code/doc drift recorded above)

## Report

PASS — all 13 files read top-to-bottom, blob SHAs recorded, public API enumerated with file:line citations, architecture bullets and invariants captured, drift table populated against `docs/engine/08_Animation.md`.
