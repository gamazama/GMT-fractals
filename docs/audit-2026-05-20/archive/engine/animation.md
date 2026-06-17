---
source: engine/AnimationEngine.ts
lines: 404
last_verified_sha: 5afdf9d91efcc61e47b9e69a77a2a54c675d81a9
additional_sources:
  - engine/BezierMath.ts
  - engine/animation/AnimationSystem.tsx
  - engine/animation/binderRegistry.ts
  - engine/animation/trackBinding.ts
  - engine/animation/cameraKeyRegistry.ts
  - engine/animation/cameraPairRegistry.ts
  - engine/animation/logTrackRegistry.ts
  - engine/animation/renderPopupRegistry.ts
  - engine/animation/modulationTick.ts
  - engine/animation/audioClipSync.ts
  - engine/animation/audioExportMix.ts
  - engine/animation/audioFileCache.ts
audited: 2026-05-20T08:30:00Z
audited_by: claude-opus-4-7
public_api:
  - ScrubContext
  - ScrubHook
  - AnimationEngine
  - animationEngine
  - solveCubicBezierT
  - splitCubicBezier
  - solveBezierY
  - tick
  - AnimationSystem
  - BinderEntry
  - binderRegistry
  - TrackBindingInput
  - TrackBinding
  - deriveTrackBinding
  - readLiveVec
  - CameraKeyTrackEntry
  - CameraKeyCaptureOptions
  - CameraKeyCaptureFn
  - setCameraKeyCaptureFn
  - captureCameraKeyFrame
  - registerCameraKeyTracks
  - getCameraKeyTracks
  - subscribeCameraKeyTracks
  - CameraPair
  - registerCameraPair
  - evaluatePairedTrack
  - registerLogTrack
  - unregisterLogTrack
  - isLogTrack
  - RenderPopupComponent
  - registerRenderPopup
  - getRenderPopup
  - subscribeRenderPopup
  - installModulation
  - uninstallModulation
  - syncAudioClips
  - _resetAudioClipSync
  - MixedAudio
  - mixAudioClipsForExport
  - setAudioFile
  - getAudioFile
  - clearAudioFile
depends_on:
  - e02-tick-registry
  - e01-feature-system
---

# Animation engine

The animation subsystem owns timeline-driven keyframe playback (`AnimationEngine`), the modulation tick that fuses LFOs / rules / audio offsets into uniform writes (`AnimationSystem.tick`), and a small constellation of registries that let host apps push composite-track binders, camera-key capture, log-space tracks, camera-pair (linear-in-zoom) pan, render-popup escape hatches, and audio-deck sync into a generic, slice-injected engine. Every entry point is store-injected and tick-driven: no React refs, no engine-internal singletons beyond the registries themselves.

## Public API

### `engine/AnimationEngine.ts`

| Symbol | Purpose | Anchor |
|---|---|---|
| `interface ScrubContext` | Per-frame context passed to scrub hooks (frame, isPlaying, isRecording, recordCamera, ignoreCamera). | engine/AnimationEngine.ts:21 |
| `type ScrubHook` | `(ctx: ScrubContext) => void`. | engine/AnimationEngine.ts:32 |
| `class AnimationEngine` | Keyframe playback orchestrator: `connect(animStore, fractalStore)`, `setOverriddenTracks(ids)`, `registerScrubHook(phase, fn)`, `tick(dt)`, `scrub(frame)`. | engine/AnimationEngine.ts:34 |
| `const animationEngine` | Module-singleton instance. | engine/AnimationEngine.ts:404 |

### `engine/BezierMath.ts`

| Symbol | Purpose | Anchor |
|---|---|---|
| `solveCubicBezierT(x, x0, x1, x2, x3): number` | Newton–Raphson (4 iter) solve of `t` for a given `x` on a 2D cubic. | engine/BezierMath.ts:32 |
| `splitCubicBezier(t, p0x..p3y)` | De Casteljau split returning the six new control points for left/right subcurves. | engine/BezierMath.ts:61 |
| `solveBezierY(frame, k1Frame, k1Val, k1Hx, k1Hy, k2Frame, k2Val, k2Hx, k2Hy): number` | Per-segment Bezier evaluator: solves `t` from `x` (frame), then evaluates `y` (value). | engine/BezierMath.ts:90 |

### `engine/animation/AnimationSystem.tsx`

| Symbol | Purpose | Anchor |
|---|---|---|
| `tick(delta)` | The modulation tick — runs `animationEngine.tick`, audio sync, modulation rules/oscillators, resolves offsets into liveModulations + uniform emits. | engine/animation/AnimationSystem.tsx:83 |
| `AnimationSystem: React.FC` | No-op shell kept only for legacy `<AnimationSystem />` mounts. | engine/animation/AnimationSystem.tsx:592 |

### `engine/animation/binderRegistry.ts`

| Symbol | Purpose | Anchor |
|---|---|---|
| `interface BinderEntry` | `{ id, write, category?, label? }`. | engine/animation/binderRegistry.ts:27 |
| `binderRegistry` | `register(entry) -> unregister`, `lookup(id)`, `list()`, `clear()`. Plus `window.__binders` dev handle. | engine/animation/binderRegistry.ts:42 |

### `engine/animation/trackBinding.ts`

| Symbol | Purpose | Anchor |
|---|---|---|
| `interface TrackBindingInput` | `{ featureId, paramKey, label, axes, composeFrom? }`. | engine/animation/trackBinding.ts:34 |
| `interface TrackBinding` | `{ trackKeys, trackLabels? }`. | engine/animation/trackBinding.ts:52 |
| `deriveTrackBinding(input)` | Produces canonical track keys (scalar / vec UNDERSCORE / composeFrom). | engine/animation/trackBinding.ts:63 |
| `readLiveVec(liveModulations, binding)` | Builds a `THREE.Vector2/3/4` from `liveModulations` entries, `undefined` when no axis is live. | engine/animation/trackBinding.ts:93 |

### `engine/animation/cameraKeyRegistry.ts`

| Symbol | Purpose | Anchor |
|---|---|---|
| `type CameraKeyTrackEntry` | `string \| { id, hidden? }`. | engine/animation/cameraKeyRegistry.ts:27 |
| `interface CameraKeyCaptureOptions` | `{ skipSnapshot?, interpolation? }`. | engine/animation/cameraKeyRegistry.ts:44 |
| `type CameraKeyCaptureFn` | `(frame, tracks, opts?) => void`. | engine/animation/cameraKeyRegistry.ts:67 |
| `setCameraKeyCaptureFn(fn)` | Install the host-provided capture function. | engine/animation/cameraKeyRegistry.ts:74 |
| `captureCameraKeyFrame(frame, opts?)` | Single entry point: routes through `_captureFn` if set, else default DDFS walker. | engine/animation/cameraKeyRegistry.ts:86 |
| `registerCameraKeyTracks(tracks)` | Replaces the set of registered camera-key tracks. | engine/animation/cameraKeyRegistry.ts:160 |
| `getCameraKeyTracks()` | Stable-reference list of registered IDs (for `useSyncExternalStore`). | engine/animation/cameraKeyRegistry.ts:172 |
| `subscribeCameraKeyTracks(cb)` | Re-render subscription. | engine/animation/cameraKeyRegistry.ts:181 |

### `engine/animation/cameraPairRegistry.ts`

| Symbol | Purpose | Anchor |
|---|---|---|
| `interface CameraPair` | `{ zoom, pan, panLow? }` — pan tracks tweened linear-in-zoom against `zoom`. | engine/animation/cameraPairRegistry.ts:92 |
| `registerCameraPair(pair)` | Registers a pair; retroactively hides existing `panLow` tracks. | engine/animation/cameraPairRegistry.ts:113 |
| `evaluatePairedTrack(trackId, frame, sequence)` | Returns the DD-precision pan or panLow value at `frame`, or `undefined` to fall through. | engine/animation/cameraPairRegistry.ts:331 |

### `engine/animation/logTrackRegistry.ts`

| Symbol | Purpose | Anchor |
|---|---|---|
| `registerLogTrack(trackId)` | Mark a track as evaluated in log-value space. | engine/animation/logTrackRegistry.ts:31 |
| `unregisterLogTrack(trackId)` | Removal. | engine/animation/logTrackRegistry.ts:35 |
| `isLogTrack(trackId): boolean` | Consulted by `AnimationEngine.interpolate` + camera-pair zoom lookup. | engine/animation/logTrackRegistry.ts:39 |

### `engine/animation/renderPopupRegistry.ts`

| Symbol | Purpose | Anchor |
|---|---|---|
| `type RenderPopupComponent` | `React.ComponentType<{ onClose: () => void }>`. | engine/animation/renderPopupRegistry.ts:12 |
| `registerRenderPopup(component)` | Install the toolbar's Render-button component (null hides). | engine/animation/renderPopupRegistry.ts:17 |
| `getRenderPopup()` | Read current component. | engine/animation/renderPopupRegistry.ts:22 |
| `subscribeRenderPopup(cb)` | Re-render subscription. | engine/animation/renderPopupRegistry.ts:26 |

### `engine/animation/modulationTick.ts`

| Symbol | Purpose | Anchor |
|---|---|---|
| `installModulation()` | Registers `AnimationSystem.tick` into `TICK_PHASE.ANIMATE`; idempotent. | engine/animation/modulationTick.ts:39 |
| `uninstallModulation()` | Teardown. | engine/animation/modulationTick.ts:51 |

Side effects: assigns `window.__animEngine` for dev console access (engine/animation/modulationTick.ts:31) and defines a `window.__animTickCount` getter on first install (engine/animation/modulationTick.ts:46).

### `engine/animation/audioClipSync.ts`

| Symbol | Purpose | Anchor |
|---|---|---|
| `_resetAudioClipSync()` | Reset between sessions / tests. | engine/animation/audioClipSync.ts:16 |
| `syncAudioClips(clips, currentFrame, fps, isPlaying)` | Drive each deck's play/pause/seek to match the timeline. | engine/animation/audioClipSync.ts:36 |

### `engine/animation/audioExportMix.ts`

| Symbol | Purpose | Anchor |
|---|---|---|
| `interface MixedAudio` | `{ pcm, sampleRate, numFrames, durationSec }`. | engine/animation/audioExportMix.ts:4 |
| `mixAudioClipsForExport(clips, fps, startFrame, endFrame, sampleRate?)` | Decode + slice + sum to interleaved stereo PCM for muxer. | engine/animation/audioExportMix.ts:15 |

### `engine/animation/audioFileCache.ts`

| Symbol | Purpose | Anchor |
|---|---|---|
| `setAudioFile(deckIndex, file)` | Cache File for re-decode / peak re-compute. | engine/animation/audioFileCache.ts:8 |
| `getAudioFile(deckIndex)` | Lookup. | engine/animation/audioFileCache.ts:12 |
| `clearAudioFile(deckIndex)` | Removal. | engine/animation/audioFileCache.ts:16 |

## Architecture

- `installModulation()` is the single side-effecting entry: it registers `AnimationSystem.tick` into `TICK_PHASE.ANIMATE` under id `'engine.animation'`; idempotent (early-returns when `_unregister` is set) and exposes `window.__animTickCount` for smoke tests — engine/animation/modulationTick.ts:39-49.
- `AnimationEngine` is fully store-injected via `connect(animStore, fractalStore)`; both `tick` and `scrub` early-return silently when `animStore` is null, so an app that forgets to call `bindStoreToEngine` sees no playback rather than a crash — engine/AnimationEngine.ts:50, engine/AnimationEngine.ts:225, engine/AnimationEngine.ts:280.
- `tick(dt)` chooses between wall-clock `dt*fps` advancement and a **deterministic-playback** mode that accumulates wall time and emits integer frames at exactly `1/fps`. A backlog above `0.25s` (tab return / debugger pause) is discarded to prevent lurch — engine/AnimationEngine.ts:243-258.
- Loop modes: `Once` and `isRecordingModulation` both terminate at `duration` (committing the final frame via `scrub(duration)` first, then calling `stopModulationRecording()` if recording); other modes wrap `nextFrame` to `0` — engine/AnimationEngine.ts:261-273.
- `scrub(frame)` reads from `recordingSnapshot` instead of the live sequence whenever `isRecordingModulation && recordingSnapshot` — keeps the rendered value stable through brief zero-offset moments during recording — engine/AnimationEngine.ts:283-288.
- `ScrubHook` pre/post hooks let host apps (GMT's split-precision sceneOffset) snapshot the live camera before binders write and emit `CAMERA_TELEPORT` after; registration returns an unregister function — engine/AnimationEngine.ts:65-72, engine/AnimationEngine.ts:297, engine/AnimationEngine.ts:325.
- **Binder resolution order** in `getBinder` — explicit `binderRegistry` always wins (consulted before any cache, so a registered binder takes effect immediately even after a previous DDFS-derived lookup); then `this.binders` per-id cache; then legacy `lights.*` → `lighting.light<i>_*` redirect; then DDFS via `featureRegistry.get(parent)` + `set${Parent}` setter; then root-prop `set${Id}` fallback — engine/AnimationEngine.ts:74-218.

| Case | Match | Writer | Anchor |
|---|---|---|---|
| 0 | `binderRegistry.lookup(id)` returns entry | `entry.write` | engine/AnimationEngine.ts:82-83 |
| 1 | `id` in per-id cache (`this.binders`) | cached `ValueSetter` | engine/AnimationEngine.ts:85-87 |
| 2 | `id.startsWith('lights.')` | legacy remap → `lighting.light<i>_<prop>` then re-enter | engine/AnimationEngine.ts:99-111 |
| 3 | `id.startsWith('lighting.light')` (intensity/falloff/pos/rot) | `updateLight` action | engine/AnimationEngine.ts:113-144 |
| 4a | `id` matches `feature.param_axis` with vec base | clone vec + axis assign + `set${Feature}` | engine/AnimationEngine.ts:181-192 |
| 4b | `id` matches `feature.param.axis` (legacy DOT form) | same as 4a, third path segment | engine/AnimationEngine.ts:199-201 |
| 4c | `id` matches `feature.scalar` | `set${Feature}({ [child]: v })` | engine/AnimationEngine.ts:204 |
| 5 | bare id with matching root `set${Id}` action | `set${Id}(v)` | engine/AnimationEngine.ts:212-217 |

- DDFS vec-axis writer clones the current vec via `.clone()` (THREE.Vector2/3/4) or object spread (plain `{x,y[,z,w]}`), overwrites the named axis, then commits the whole vec through `set${Feature}` — engine/AnimationEngine.ts:164-174.
- `interpolate(track, frame)` handles post-end behaviors `Hold | Continue | Loop | PingPong | OffsetLoop`. `Continue` derives slope from `lastKey.leftTangent.y / .x` for Bezier keys (when |x|>0.001), otherwise from prev/last differential — engine/AnimationEngine.ts:328-388.
- `evaluateCurveInternal` does linear segment-search across keys and delegates each segment to `AnimationMath.interpolate(frame, k1, k2, isRotation, isLog)`; `isRotation` is a heuristic on track id (`camera.rotation`, `rot`, `phase`, `twist`) — engine/AnimationEngine.ts:334, engine/AnimationEngine.ts:390-400.
- `scrub` skips tracks whose ids are in `overriddenTracks` (set during modulation recording so the timeline doesn't fight LFOs), tracks containing `camera.position` or `camera.offset` (legacy hardcoded skip), all `camera.*` when `ignoreCamera = isPlaying && isRecording && recordCamera`, tracks with empty keyframes, and tracks whose `type !== 'float'` — engine/AnimationEngine.ts:299-309.
- `evaluatePairedTrack(track.id, frame, sequence)` is consulted per track inside `scrub`; when defined, the camera-pair (linear-in-zoom) value wins over standard per-track interpolation, otherwise scrub falls through to `interpolate` — engine/AnimationEngine.ts:317-320.
- `BezierMath` provides the curve primitives: a 4-iter Newton solve for `T(x)` clamped to `[0,1]`, a de Casteljau split helper for curve-preserving keyframe insertion, and the per-segment `solveBezierY` that the math layer uses — engine/BezierMath.ts:5, engine/BezierMath.ts:32, engine/BezierMath.ts:61, engine/BezierMath.ts:90.
- `AnimationSystem.tick` runs **after** `animationEngine.tick(delta)`. It self-owns recording-on/off transitions (formerly a `<ViewportArea>`-only `useEffect`) by comparing `prevIsRec.current` to `animStore.isRecordingModulation`; on stop it flushes the record buffer and clears `overriddenTracks` to `EMPTY_OVERRIDES` so playback drives the recorded tracks again — engine/animation/AnimationSystem.tsx:63-108.
- The tick has an `activeTargetsRef.current.size > 0` clause in its early-return guard so a deleted LFO still gets one cleanup pass (baseline uniform write + `liveModulations` clear) — engine/animation/AnimationSystem.tsx:122-135.
- Audio analysis is updated only when `audio.isEnabled`; `syncAudioClips` runs whenever any deck has a clip; LFO oscillators use `currentFrame/fps` for `oscTime` under deterministic playback so live preview matches export phase — engine/animation/AnimationSystem.tsx:144-170.
- Uniforms flow through `FractalEvents.emit(FRACTAL_EVENTS.UNIFORM, ...)` because the core `WorkerProxy` is a stub; only host apps that installed a real bridge (GMT's `GmtRendererTickDriver`) receive them — engine/animation/AnimationSystem.tsx:30-39.
- GMT-specific composite branches (coloring repeats/phase, julia composite, geometry pre/post/world rotation, lighting array) are each gated by slice existence (`storeState.coloring`, `storeState.geometry`, `storeState.lighting`) so engine-fork apps fall through to the generic vec-axis or scalar path — engine/animation/AnimationSystem.tsx:322-462.
- Recording writes are buffered into `recordBuffer` and flushed every `RECORD_FLUSH_MS = 400` (or on stop) via `batchAddKeyframesMultiRange` — cuts DopeSheet re-render rate to ~6/sec regardless of recorded length — engine/animation/AnimationSystem.tsx:66-80, engine/animation/AnimationSystem.tsx:526-541.
- `liveModulations` is written through a shallow-equality gate (keys + values) before calling `setLiveModulations`; without this gate every-frame ref replacement tripped React's max-update-depth guard inside fluid-toy's pan handler — engine/animation/AnimationSystem.tsx:559-582.
- `binderRegistry` is a plain `Map<string, BinderEntry>`; the unregister callback only deletes when the original entry is still the occupant, so a later replacement isn't accidentally torn down — engine/animation/binderRegistry.ts:40-53.
- `deriveTrackBinding` canonicalises: scalar → `feature.param`, vec → `feature.param_axis` per axis, `composeFrom` → one track per listed scalar key (no axis suffix). The same convention is read by `AnimationEngine.getBinder` (case 4a) and by `AnimationSystem.tick` modulation dispatch — engine/animation/trackBinding.ts:63-84.
- `readLiveVec` returns `undefined` only when **every** axis is undefined; otherwise per-axis fallback is `0` so a partly-modulated vec still produces a coherent THREE vector — engine/animation/trackBinding.ts:93-105.
- `cameraKeyRegistry` keeps a stable `cameraKeyTrackIds` array reference so `useSyncExternalStore` callers do not loop; the ids are recomputed only inside `registerCameraKeyTracks` — engine/animation/cameraKeyRegistry.ts:34-39, engine/animation/cameraKeyRegistry.ts:160-164.
- `captureCameraKeyFrame` routes through `_captureFn` when set (GMT host app); otherwise the default DDFS walker path-resolves each track (supports scalar paths and trailing `base_axis` vec-component form), takes ONE undo snapshot for the whole batch (unless `skipSnapshot`), and inline-creates missing tracks bypassing `addTrack`'s per-track snapshot — engine/animation/cameraKeyRegistry.ts:86-150.
- `cameraPairRegistry` indexes both pan and panLow track ids into a single `Map<trackId, CameraPair>`; on registration, existing panLow tracks in the store get retroactively flagged `hidden:true` (handles boot ordering after old-scene load) — engine/animation/cameraPairRegistry.ts:110-138.
- `evaluatePairedTrack` ALWAYS routes through `evaluateDDPairAxis` for both pan and panLow even when no `panLow` exists (lo defaults to 0) — keeps the (hi, lo) DD pair coherent through the tween via Knuth two-sum + Veltkamp-split two-product — engine/animation/cameraPairRegistry.ts:58-90, engine/animation/cameraPairRegistry.ts:331-351.
- Per-frame DD cache (`ddCache`) keyed by `(zoom track id, axis)` is validated by **both** frame equality and sequence reference equality; Zustand swaps the sequence ref on any keyframe edit, giving free invalidation — engine/animation/cameraPairRegistry.ts:224-244.
- `panProgress` re-normalises pan-key Bezier tangent y-values into u-space (divides by `dc = k1.value - k0.value`) so graph-editor curve shape maps to `u(t)` re-shaping — engine/animation/cameraPairRegistry.ts:166-213.
- Linear-in-zoom math uses `|log(z1) - log(z0)|` (when both > 0) to gate the flat-zoom fallback (zRatio < 1e-9 → `progress = u_eased`); otherwise `progress = (zT_virt - z0) / (z1 - z0)` — engine/animation/cameraPairRegistry.ts:286-299.
- `logTrackRegistry` is a tiny `Set<string>`; only `AnimationEngine.interpolate` and `cameraPairRegistry`'s zoom lookup consume it via `isLogTrack(trackId)` — engine/animation/logTrackRegistry.ts:29-41.
- `renderPopupRegistry` is the toolbar's escape hatch — GMT's 1046-line export dialog was stripped from the engine during extraction; apps register their own dialog or the Render button stays hidden — engine/animation/renderPopupRegistry.ts:1-31.
- `syncAudioClips` enforces "never seek during steady-state play": only triggers `seek` on resume, scrub jumps > 0.5s timeline-time, or first frame after a paused→playing edge. `ownedDecks` tracks which decks the timeline is currently driving so manual deck plays aren't auto-paused — engine/animation/audioClipSync.ts:8-86.
- `mixAudioClipsForExport` uses **inclusive end** `(endFrame + 1) / fps` so the export window covers the trailing frame's full `1/fps` slot — without `+1` the audio mix is one frame short (~40ms at 25fps) at the tail; per-clip linear-interpolation resample, then hard-clip overlap to ±1 — engine/animation/audioExportMix.ts:27-101.
- `audioFileCache` is a module-singleton `Map<0 | 1, File>` keyed by the two-deck audio system; the `AudioClip` in the store is structured-cloneable (metadata + peaks), the raw File only lives transiently here for re-decode (export) and peak recompute — engine/animation/audioFileCache.ts:1-18.

## Invariants

- **The tick depends on `connect()`.** `installModulation()` registers the tick; without a host call to `bindStoreToEngine` (which calls `animationEngine.connect(...)`) every `tick`/`scrub` early-returns silently — engine/AnimationEngine.ts:225, engine/AnimationEngine.ts:280.
- **`binderRegistry.lookup` ALWAYS wins over `this.binders`.** The lookup happens before the per-id cache check, so registering a binder after a DDFS fallback was cached still takes effect immediately and no stale cache leaks across register/unregister cycles — engine/AnimationEngine.ts:74-87.
- **UNDERSCORE vec form is checked BEFORE the DOT form path-segment.** A literal scalar named `power_x` only resolves to `power.x` when `power` exists as a vec-shaped object in the slice — otherwise falls through to the scalar branch (case 4c) — engine/AnimationEngine.ts:181-205.
- **`camera.position` / `camera.offset` are hardcoded-skipped in `scrub`.** Legacy carve-out the binderRegistry refactor has not yet replaced — engine/AnimationEngine.ts:307.
- **`ignoreCamera = isPlaying && isRecording && recordCamera`** — skips ALL `camera.*` tracks during record-camera mode so the user's manual camera move doesn't fight the timeline — engine/AnimationEngine.ts:291, engine/AnimationEngine.ts:309.
- **`recordingSnapshot` doubles as scrub source AND clean-base source.** During recording, `scrub` reads it instead of the live sequence (engine/AnimationEngine.ts:288); the modulation tick reads it for `cleanBase` (engine/animation/AnimationSystem.tsx:297-308, engine/animation/AnimationSystem.tsx:441-446, engine/animation/AnimationSystem.tsx:485-490).
- **Non-float tracks are silently dropped at scrub.** `if (track.type !== 'float') continue` — bool/enum/string/image tracks do not get any step or interpolation behaviour from the engine — engine/AnimationEngine.ts:305.
- **Bezier is not applied on log tracks.** Tangent y-values live in absolute value-space; reinterpreting them under a log transform would silently change the curve shape. Log tracks evaluate as linear-in-log regardless of stored interpolation type — engine/animation/logTrackRegistry.ts:22-26, engine/AnimationEngine.ts:335.
- **Recording flush is throttled.** Per-tick writes during recording are buffered; flush interval is `RECORD_FLUSH_MS = 400`; on recording-stop the buffer is force-flushed BEFORE `setOverriddenTracks(EMPTY_OVERRIDES)` so the final keyframes commit before the engine resumes driving — engine/animation/AnimationSystem.tsx:101-107, engine/animation/AnimationSystem.tsx:526-541.
- **The cleanup pass blocks the early-return.** Even when nothing is driving, the tick still runs one pass while `activeTargetsRef.current.size > 0` to clear the previous frame's stale uniforms and emit baselines — engine/animation/AnimationSystem.tsx:130-135.
- **Uniforms go through events, not `engine.setUniform`.** Engine-core's `WorkerProxy` is a stub; modulated values flow via `FractalEvents.emit(FRACTAL_EVENTS.UNIFORM, ...)` — engine/animation/AnimationSystem.tsx:34-36.
- **Camera-pair DD lerp is unconditional.** Even with no `panLow` registered (lo₀ = lo₁ = 0) the routing through `evaluateDDPairAxis` is what guarantees coherence between hi and lo channels at deep zoom — engine/animation/cameraPairRegistry.ts:338-350.
- **DD cache invalidates on sequence reference equality.** Editing a key during playback gets fresh values because Zustand swaps the sequence ref on every keyframe write — engine/animation/cameraPairRegistry.ts:240-244.
- **Pan tangents are re-normalised into u-space**: tangent y-values divided by `dc = k1.value - k0.value` so graph-editor handle shape applies as `u(t)` re-mapping; tangents on non-paired tracks stay in absolute value-space — engine/animation/cameraPairRegistry.ts:194-209.
- **Audio scrub threshold is 0.5s of timeline-time, not a frame count.** At 25fps that's ~12 frames; slow renders still don't trigger seeks because the per-tick advance is small in seconds — engine/animation/audioClipSync.ts:8.
- **Audio mix `+1` on `endFrame` is load-bearing.** Without it the mix is one frame short (~40ms trailing mismatch at 25fps) — engine/animation/audioExportMix.ts:27-31.
- **`audioFileCache` is typed `0 | 1` only.** Three or more decks would need the registry refactored — engine/animation/audioFileCache.ts:6.
- **`AnimationSystem` React component is a no-op shell.** Kept only so legacy `<ViewportArea>` mounts don't break; the modulation lifecycle is owned by the tick itself — engine/animation/AnimationSystem.tsx:587-592.

## Interactions with other subsystems

Outgoing:

- **e02-tick-registry** — `installModulation()` calls `registerTick('engine.animation', TICK_PHASE.ANIMATE, ...)` — engine/animation/modulationTick.ts:27, engine/animation/modulationTick.ts:41. The whole animation pipeline is one tick callback under one phase.
- **e01-feature-system** — `AnimationEngine.getBinder` calls `featureRegistry.get(parent)` to discover the slice setter (case 4) — engine/AnimationEngine.ts:151. `AnimationSystem.tick` reads `feature.params[paramName]` for uniform names + noReset flag — engine/animation/AnimationSystem.tsx:238, engine/animation/AnimationSystem.tsx:251.
- **store** — `connect(animStore, fractalStore)` injects two store accessors; `tick`/`scrub` only see them through `StoreAccessor` (getState/setState shape) — engine/AnimationEngine.ts:13-16, engine/AnimationEngine.ts:50.
- **FractalEvents** — uniform writes emit `FRACTAL_EVENTS.UNIFORM` and `RESET_ACCUM` — engine/animation/AnimationSystem.tsx:26, engine/animation/AnimationSystem.tsx:34-39, engine/animation/AnimationSystem.tsx:554-557.
- **math/AnimationMath** — `interpolate(frame, k1, k2, isRotation, isLog)` is delegated to from both `AnimationEngine.evaluateCurveInternal` and `cameraPairRegistry`'s zoom/lo lookups — engine/AnimationEngine.ts:396, engine/animation/cameraPairRegistry.ts:154, engine/animation/cameraPairRegistry.ts:210, engine/animation/cameraPairRegistry.ts:321.
- **features/modulation, features/audioMod** — `AnimationSystem.tick` drives `modulationEngine.updateOscillators(...)` / `.update(rules, ...)` and `audioAnalysisEngine.update()` — engine/animation/AnimationSystem.tsx:144-175.

Incoming (representative consumers):

- **engine-gmt** — registers `camera.unified.*` / `camera.rotation.*` binders via `binderRegistry`, registers a host `_captureFn` via `setCameraKeyCaptureFn`, and registers scrub hooks for split-precision sceneOffset (see e07-plugins-host coverage).
- **fluid-toy / fractal-toy** — register their own camera-pair (`registerCameraPair`), camera-key tracks (`registerCameraKeyTracks`), and log tracks (`registerLogTrack('julia.zoom')`).
- **AutoFeaturePanel + Slider** — consume `deriveTrackBinding` to wire per-axis keyframe buttons and `readLiveVec` to display modulated vec values.
- **`<TimelineToolbar>`** — reads `getCameraKeyTracks()` (hides Key Cam button when empty) and `getRenderPopup()` (hides Render button when no app registered a popup).
- **EngineBridge / bindStoreToEngine** — calls `animationEngine.connect(animStore, fractalStore)` at boot so the tick is no-longer a no-op.

## Known issues / Phase 2 carry-in

| Item | Kind | Notes | Origin |
|---|---|---|---|
| `AnimationParams` lives at `types/animation.ts:10-35`; `offsets` clearing is owned by TWO outside callers (`AnimationSystem.tick` line 155 live, `applyModulationsAt:23` export); base-value composition lives ENTIRELY in `AnimationSystem.tick` (5 branches + 1 camera-as-offset-only); `ModulationEngine` is intentionally base-agnostic; `anim.baseValue` is vestigial in the engine (slice value is truth). | doc-rewrite-target | engine/animation/AnimationSystem.tsx:155 (`modulationEngine.resetOffsets()`); covered by the per-feature base-value resolution loop engine/animation/AnimationSystem.tsx:223-289. The composite branches (A–F) are each their own base-source path; modulation is offset-only by design. | followup `q-070` (plans/doc-audit-state/survey/_followups/q-070.md) |
| `isCameraLocked` vs `ignoreCamera` are NOT duplicates — they are dual (opposite outputs of the same flag set). Three independent consumers: Navigation, AnimationEngine, PauseControls. Worth a one-line note + a shared selector proposal (`selectCameraLocked` / `selectIgnoreCamera`). | drift | `ignoreCamera = isPlaying && isRecording && recordCamera` is recomputed inline at engine/AnimationEngine.ts:291. A canonical selector would dedupe the inline expressions across the three consumer sites. | followup `q-111` (plans/doc-audit-state/survey/_followups/q-111.md) |

Additional drift surfaced by the survey (kept here for visibility; not blocking — the existing doc captures most of these via fragility-audit rows F5–F13):

- **Non-float track types are silently dropped** while `docs/engine/08_Animation.md` promises step interpolation for bool/enum/string/image. `track.type !== 'float'` continues at engine/AnimationEngine.ts:305 — production bug for any caller relying on doc-promised step behaviour.
- **Bezier-on-log is unsupported** while the legacy doc described "(frame, log-value)" Bezier solve — the registry comment at engine/animation/logTrackRegistry.ts:22-26 is explicit that tangents are reinterpreted incorrectly and log tracks evaluate as linear-in-log regardless of stored interpolation.

## Historical context

`docs/engine/08_Animation.md` (3rd-party READ-ONLY) is the prior canonical reference for this subsystem. Most of its architecture sections are accurate; its type signatures, public-API examples, and binder-resolution table need targeted updates rather than a rewrite (disposition: minor-edits — `plans/doc-audit-state/phase-2-disposition.json`). Cross-link to it for the design rationales that are not re-derived here:

Preserved rationale from the legacy doc (paraphrased from the `preservable_signal` in the Phase 2 disposition entry):

- **Log-value-space interpolation rationale.** Linear lerp on `julia.zoom` 1→1e-30 collapses 99.999% of the timeline to one extreme of the range; lerping in `log(v)` and `exp`-ing back delivers the constant rate-of-change in scale that the eye expects.
- **Camera-pair linear-in-zoom math justification.** Pan whips at deep zoom because world-units-per-frame stays constant while the visible world shrinks exponentially; the closed-form `pan = c0 + (c1 − c0) · (zT − z0) / (z1 − z0)` is the constant-screen-space-velocity integral against a log zoom curve.
- **DD-precision two-sum / Veltkamp-split rationale.** Below zoom ~1e-15 the visible world width drops under f64 mantissa precision; lerping (hi, lo) independently leaves ULP-level shake. DD lerp on the pair as a whole gives ~1e-32 quiet motion past e-30.
- **Maya/Blender tangent-mode convention adoption** (Auto / Ease / Aligned / Unified / Free, Aligned default) — replaces GMT's single Unified mode that lost per-side length intent.
- **De Casteljau split rationale** — Auto-tangents produce visible kinks on hand-shaped curves on insertion; the split preserves the curve through the new key.
- **FPS Keep/Match (DCC parity)** and **deterministic playback motivation** ("preview matched export frame-for-frame").
- **F5/F6/F7/F12/F13 fragility lineage** — many are resolved here (F12 vec UNDERSCORE form; binderRegistry escape hatch for F6 non-conventional setters; F5 composite camera tracks now live on host via binderRegistry per the comment at engine/AnimationEngine.ts:91-96).

For all symbol names, current line numbers, and current behaviour, this doc is the source of truth — the legacy doc may drift on those details (see the survey at `plans/doc-audit-state/survey/e03-animation.md` for the 17-row drift table).
