# 08 — Animation 🚧

Timeline + keyframes + modulation, **from the engine-fork / plugin perspective**: contracts, decisions, what features have to do (and not do) to animate.

> **Scope split**
> - **This doc** — engine fork: plugin contract, binder resolution, decisions log, fragility audit. Read this if you are wiring a feature into the animation system or evaluating an architectural change.
> - **[`gmt/04_Animation_Engine.md`](../gmt/04_Animation_Engine.md)** — GMT-app-specific implementation reference: data shapes, math (Bezier solver, tangent modes, de Casteljau split), camera unification, store slices, timeline UI components. Read this when touching the animation code itself.
>
> The engine fork **uses** GMT's production `AnimationSystem.tick` verbatim (see "Current implementation" below), so anything in the GMT doc that describes runtime behaviour applies here too.

**Rule:** if you declare a param in a feature, it's animatable — the binder is derived at animate-time from feature id + track id.

## Current implementation (as of phase 5)

`engine/animation/modulationTick.ts` registers GMT's `AnimationSystem.tick(delta)` into `TickRegistry.ANIMATE` phase. Zero reinvention — this is literally GMT's production animation pipeline, re-wired into the plugin TickRegistry so any app can drive it.

```ts
// engine/animation/modulationTick.ts (simplified)
import { registerTick, TICK_PHASE } from '../TickRegistry';
import { tick as animationSystemTick } from '../../components/AnimationSystem';

export const installModulation = () => {
    if (_unregister) return;
    _unregister = registerTick('engine.animation', TICK_PHASE.ANIMATE, (delta) => {
        animationSystemTick(delta);
    });
};
```

**What AnimationSystem.tick drives each frame:**
1. `animationEngine.tick(delta)` — advances `currentFrame`, evaluates every active track's interpolated value, calls the bound setter.
2. `modulationEngine.updateOscillators()` — LFO modulation.
3. Modulation rules (audio band, envelope-follower) — rule-based offsets.
4. Writes resolved offsets → `store.liveModulations`.

**Store connection:** apps call `bindStoreToEngine()` once at boot, which calls `animationEngine.connect(useAnimationStore, useFractalStore)`. Without this, the animation engine has no store handles and playback silently no-ops.

**Boot checklist (as demonstrated by `fluid-toy/main.tsx`):**
1. `installModulation()` — registers the tick.
2. Mount `<EngineBridge />` in the React tree — calls `bindStoreToEngine()`.
3. Mount `<RenderLoopDriver />` — drives RAF → `TickRegistry.runTicks(dt)`.

## Binder resolution (GMT's AnimationEngine.getBinder)

When `animationEngine.scrub(frame)` evaluates a track, it looks up a binder by track id. Resolution order in [engine/AnimationEngine.ts:66-226](../engine/AnimationEngine.ts#L66):

| Case | Track ID pattern | Example | Writer |
|---|---|---|---|
| 0 | `camera.active_index` | — | Calls `selectCamera(savedCameras[round(v)].id)` |
| 1 | `camera.unified.{x\|y\|z}` / `camera.rotation.{x\|y\|z}` | `camera.unified.x` | Buffers into `pendingCam`, committed via `CAMERA_TELEPORT` event |
| 2 | `lights.<i>.position.<axis>` / `lights.<i>.color` / `lights.<i>.intensity` | Legacy format — redirects to case 3 |
| 3 | `lighting.light<i>_<prop>` | `lighting.light0_intensity` | Calls `updateLight({ index, params: {…} })` |
| 4 | `<feature>.<param>` or `<feature>.<param>.<axis>` (DDFS) | `julia.power`, `julia.juliaC.x` | Scalar: `set${Feature}({ [param]: v })`. Vec axis: clones current vec, overwrites axis, writes whole vec back. |
| 5 | `<rootProp>` (scalar only) | `sampleCap` | Calls `set${RootProp}(v)` — GMT legacy fallback |

**Vec track-id format (F12 fixed 2026-04-23):** AutoFeaturePanel uses UNDERSCORE form (`feature.param_x`) for `trackKeys` and `liveModulations` lookup. `AnimationEngine.getBinder` case 4 now matches `/^(.+)_([xyzw])$/` on the child segment, validates the base name is a vec-shaped object in the slice, and routes to a shared `writeVecAxis` helper. DOT form kept as backward-compat for any early phase-5 saved scenes.

## Track types

A track is a sequence of keyframes with an interpolation strategy determined by its binder's `interpolate`.

| Param type | Interpolator | Per-keyframe data |
|---|---|---|
| `float` / `int` | linear lerp (with `int` → round) | value, easing in/out |
| `bool` | step (no lerp; value changes at keyframe time) | value |
| `vec2` / `vec3` / `vec4` | per-component lerp | value, easing |
| `color` | OKLab lerp (see [05_Shared_UI.md § color](05_Shared_UI.md#color-handling)) | value, easing |
| `gradient` | whole-gradient crossfade | value, easing |
| `enum` / `string` | step | value |
| `image` | step (ref swap) | value |

**Rule:** unknown param types throw at registration, not at first animate.
**Why:** GMT silently animated nothing when a param type had no interpolator. Throw early.

### Gradient tracks (v1 scope)

Animating a gradient param crossfades the two gradient configs linearly as LUTs. Per-stop motion (stop 2 keyframed independently of stop 1) is future work.

**Rule:** v1 gradient animation = whole-gradient crossfade. Don't block feature work on per-stop.

## trackBinding helper (canonical derivation)

`engine/animation/trackBinding.ts` is the single source of truth for the DDFS track-ID convention:

```ts
import { deriveTrackBinding, readLiveVec } from '../engine/animation/trackBinding';

const binding = deriveTrackBinding({
    featureId: 'julia',
    paramKey: 'juliaC',
    label: 'Julia c',
    axes: ['x', 'y'],                  // [] for scalar, ['x','y','z'] for vec3, etc.
    composeFrom: config.composeFrom,   // compound-widget override
});
// binding.trackKeys  = ['julia.juliaC_x', 'julia.juliaC_y']
// binding.trackLabels = ['Julia c X', 'Julia c Y']

const liveVec = readLiveVec(store.liveModulations, binding);
// → THREE.Vector2 | Vector3 | Vector4 | undefined
```

Used by `AutoFeaturePanel`'s scalar + vec2/3/4 branches (collapsed four inlined copies of the same derivation into one call), by `@engine/camera`'s keyframe registry, and by any DDFS input primitive that wants to participate in animation. The `composeFrom` escape hatch emits one track per listed param key (`featureId.composedKey`) — used when a feature bundles multiple scalar params into one vector widget (e.g. GMT's orbit camera with `orbitTheta`, `orbitPhi`, `distance`).

**Rule:** do NOT inline the `${featureId}.${key}_${axis}` format at call sites. Use `deriveTrackBinding`. Drift between AnimationEngine's binder resolution, AnimationSystem's modulation dispatch, and the UI's trackKeys is what F12 was — the helper keeps them aligned.

## BinderRegistry — explicit binders (shipped 2026-04-23)

`engine/animation/binderRegistry.ts` is the pluggable-animation escape hatch. AnimationEngine consults it *before* any convention-based fallback, so an explicit entry wins over the DDFS auto-resolver + the name-inference chain. Use it for:

- **Composite camera tracks** whose writer isn't a plain setter (GMT's `camera.unified.*` → split-precision scene-offset event).
- **Features whose slice setter doesn't follow `set${FeatureId}`** — the F6 silent-no-op case.
- **Non-feature globals** an app wants to animate (debug tints, overlay intensities).

```ts
import { binderRegistry } from '../engine/animation/binderRegistry';

const unregister = binderRegistry.register({
  id: 'camera.fov',
  write: (v) => cameraAdapter.setFov(v),
  category: 'Camera',  // optional, for ParameterSelector UI later
  label: 'Field of View',
});
// Teardown on plugin uninstall:
unregister();
```

Re-registering the same id replaces the previous entry (idempotent install). `binderRegistry.list()` introspects; `window.__binders` is exposed for dev-console + smoke tests, matching the `__store` / `__camera` / `__animEngine` / `__shortcuts` pattern.

**Rule:** the engine never reaches back to ask apps "what's the setter for feature X?". Apps push binders in. The existing DDFS case-4 resolver (see the table above) remains the default for conventionally-named features, so most apps don't need to touch the registry at all — it only exists for the cases where convention breaks.

### Key-Cam tracks — `cameraKeyRegistry` (complementary)

`engine/animation/cameraKeyRegistry.ts` is the *keyframe-capture* side: the list of tracks that together represent the camera pose, read by the TimelineToolbar's Key Cam button. Separate from `binderRegistry` — that's the *write* side. A typical camera plugin registers on both:

```ts
registerCameraKeyTracks(['sceneCamera.center_x', 'sceneCamera.center_y', 'sceneCamera.zoom']);
// The default capture walks the DDFS store — no writer plumbing needed
// unless the setter is non-conventional (then register via binderRegistry).
```

## Keyframe model

```ts
interface Keyframe<T> {
  time: number;                   // in frames or seconds (consistent within a sequence)
  value: T;
  easingIn?:  EasingCurve;        // Bezier control point
  easingOut?: EasingCurve;
}

interface Track {
  id: string;                     // matches a binder id
  enabled: boolean;
  keyframes: Keyframe<any>[];     // sorted by time
  loop?: 'none' | 'cycle' | 'ping-pong';
}

interface Sequence {
  name: string;
  duration: number;
  tracks: Record<string, Track>;
}
```

`fps` lives on the playback slice (`useAnimationStore.fps`), not on the sequence itself. Frames inside a sequence are unitless integer indices — multiplying by the project fps gives wall-clock time. An older `AnimationSequence.fps` field existed in the type but was never read by anything and was dropped 2026-04-30.

## Modulation

Continuous parameter offsets from external sources (audio, LFOs, webcam, MIDI).

```ts
modulation.attach({
  id: 'audio-kick-drives-dye-decay',
  source: 'audioMod.band1',       // a derived-value or another binder-readable id
  target: 'dye.dissipation',      // a binder id
  transform: (band) => band * 0.1,
  when?: () => store.getState().audioMod.enabled,
});

modulation.detach('audio-kick-drives-dye-decay');
```

**Rule:** modulation offsets are applied ON TOP of the current (possibly keyframed) base value. Recording a modulated slider during playback "bakes in" the current modulated value, not the pre-modulation base.
**Why:** GMT audit flagged this exact recording-feedback-loop issue and solved it with `recordingSnapshot`. The engine preserves that pattern but makes the snapshot lifecycle explicit — see § recording below.

## Recording modulation

```ts
animation.startRecording({
  tracks: ['dye.dissipation', 'dye.gradient'],
  snapshotSource: 'liveBase',     // 'liveBase' | 'currentSequence'
});

// User plays audio, fluids flow, values change.
// When done:
animation.stopRecording();        // commits keyframes
// or
animation.cancelRecording();      // discards
```

**Rule:** recording always uses a captured snapshot as the "clean base," never the live modulated value.
**Why:** prevents infinite-feedback loops where last frame's modulated value becomes next frame's base.

## Timeline UI

Provided by `@engine/animation`:
- `<Timeline>` — top-level timeline container
- `<DopeSheet>` — keyframe grid
- `<TrackRow>` — per-track row with mute/solo/expand
- `<KeyframeInspector>` — selected-keyframe detail
- `<GraphEditor>` — curve-based keyframe editor (value-vs-time)

Primitives consume `AnimationContext` (see [05_Shared_UI.md](05_Shared_UI.md)) — a `<Slider>` under `<AnimationProvider>` shows a keyframe dot.

## Play, pause, scrub

```ts
animation.play();
animation.pause();
animation.toggle();
animation.seek(frame: number);
animation.setCurrentFrame(frame: number);   // no playback
```

Play state + current frame live in the animation store; subscribers see updates per frame (driven by `tickRegistry.ANIMATE` phase).

## Render-time sync

Each frame, in phase order:
1. **SNAPSHOT** — freezes `currentFrame` for the frame.
2. **ANIMATE** — for each enabled track with keyframes, evaluate interpolated value; call binder `write`.
3. **OVERLAY** — DOM overlays re-render based on frame-updated state.
4. **UI** — HUDs, counters.

**Rule:** tracks evaluate in sorted id order for determinism. If two tracks write to the same binder (user error), the last one wins deterministically.

## Interpolators

Lives in `engine/math/interpolators.ts`:

```ts
export const lerpFloat  = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpVec2   = (a, b, t) => [lerpFloat(a[0], b[0], t), lerpFloat(a[1], b[1], t)];
export const lerpVec3   = (a, b, t) => [lerpFloat(a[0], b[0], t), lerpFloat(a[1], b[1], t), lerpFloat(a[2], b[2], t)];
export const lerpColor  = (a, b, t) => oklab_lerp(a, b, t);
export const stepValue  = <T>(a: T, _b: T, t: number): T => (t < 1 ? a : _b);
export const lerpGradient = (a: GradientConfig, b: GradientConfig, t: number) => crossfadeGradientLUTs(a, b, t);
```

Custom interpolators are allowed via `binder.interpolate = (a, b, t) => ...`. Good for app-specific types (quaternion slerp, bezier curves, etc.).

## Intra-feature coordination via tracks

A feature can subscribe to a binder's output (without registering a derived value) via:

```ts
animation.subscribeTrack('audioMod.band1', (value) => {
  // called each frame the track is active
});
```

Rarely needed — prefer `derive()` / `bridge()` in [09_Bridges_and_Derived.md](09_Bridges_and_Derived.md). This API exists for legacy compat.

## Decisions

### 2026-04-22 — Auto-bind every DDFS param
**Decision:** every feature param has a track binder at registration; no per-feature animation wiring.
**Alternative:** feature opts in per-param. Rejected — defeats the point; makes adding animation an afterthought.

### 2026-04-22 — Unknown interpolators throw
**Decision:** registering a param with an unsupported type throws.
**Alternative:** skip animation silently. Rejected — silent is the GMT fragility we're fixing.

### 2026-04-22 — OKLab default for color interpolation
**Decision:** color tracks use OKLab lerp.
**Rationale:** perceptual uniformity; see [05_Shared_UI.md](05_Shared_UI.md#color-handling).

### 2026-04-22 — Whole-gradient crossfade for gradient tracks (v1)
**Decision:** gradient animation = whole-gradient crossfade in v1.
**Future:** per-stop easing as a specialized `gradient-track` track type. Not v1 scope.

### 2026-04-22 — Recording always uses captured snapshot
**Decision:** recording snapshots the base at start, never uses live modulated value.
**Rationale:** GMT's pain point; documented fix that we're preserving structurally.

### 2026-04-30 — Scrub also reads from snapshot during modulation recording
**Decision:** while `isRecordingModulation`, `AnimationEngine.scrub()` evaluates the `recordingSnapshot` rather than the live sequence.
**Rationale:** the modulation overlay only fires when offset > ε. Brief returns to zero offset would let the freshly-mutated live curve show through, jittering the playhead. Reading the snapshot keeps the rendered value smooth across zero-offset moments. The modulation system already used the snapshot for `cleanBase` lookups; the `scrub()` path completes the symmetry.

### 2026-04-30 — Tangent modes follow Maya/Blender conventions
**Decision:** Bezier tangents have five modes (Auto / Ease / Aligned / Unified / Free). Aligned (direction-locked, per-side length preserved) is the default after a user touches a handle; Unified (direction + length locked) is opt-in via context menu.
**Rationale:** GMT was a single Unified mode that lost the user's per-side length intent on every drag. Aligned matches industry expectation and stops the surprising symmetric snap-back.
**Alternative considered:** full `tangentMode` enum migration replacing `autoTangent`/`brokenTangents` booleans. Deferred — the optional `tangentMode?: 'Aligned' | 'Unified'` field covers the new behaviour without forcing a GMF format / inspector rewrite.

### 2026-04-30 — Curve-preserving insert (de Casteljau split)
**Decision:** when `addKeyframe` inserts between two Bezier keys, perform a de Casteljau split at the insert frame. The new key adopts curve-derived tangents and the prev/next adjacent handles are rewritten so the visual segment is unchanged.
**Rationale:** previous behaviour computed Auto tangents for the new key and silently rescaled neighbours, producing visible kinks when the surrounding curve had been hand-shaped. Subdivide is what every DCC tool does for "insert key on curve."

### 2026-04-30 — FPS change has explicit Keep / Match modes
**Decision:** `setFps(newFps, mode)` takes a mode flag. `'keep'` (historic behaviour, default) leaves keyframe `frame` indices alone — wall-clock time of every key shifts. `'match'` rescales every keyframe's `frame` and Bezier handle x by `newFps / oldFps`, plus `durationFrames`, `sequence.durationFrames`, and `currentFrame`, preserving wall-clock time. UI exposes the toggle next to the FPS field in the timeline kebab menu.
**Rationale:** the old `setFps` only updated the playback fps and silently broke the timing of every existing key (key at frame 30 played 2× faster after 30→60). Two modes is what every DCC tool offers. Tangent x-deltas are also frame-unit-scaled to keep curve shapes intact.
**Edge cases:** at large ratios (e.g. 60→24), keys at adjacent source frames may collide on remap — last-writer-wins, matching `addKeyframe`'s same-frame semantics. FPS changes push a single combined `FPS` history entry (sequence + fps + duration + currentFrame) so undo restores everything atomically; rapid drags coalesce within a 400ms window so one drag = one undo entry.

### 2026-04-30 — Deterministic playback throttles to project fps
**Decision:** when `deterministicPlayback` is on, `AnimationEngine.tick` accumulates wall-clock dt and emits integer frames once `accum ≥ 1/fps`, rather than advancing one timeline frame per RAF tick.
**Rationale:** the previous behaviour (1 frame per tick) made the live preview run at `RAF Hz / fps` speed — at 60Hz RAF + fps=30, playback was 2× real-time. The new gate keeps the timeline at exactly project fps regardless of monitor refresh, so the preview matches the export frame-for-frame. If RAF stalls (`dt > 250ms`) the accumulator resets to avoid lurching forward; the accumulator also clears on pause.

### 2026-04-30 — Track-selection actions split by intent
**Decision:** replaced `selectTrack(id, multi)` and `selectTracks(ids, select)` (boolean polymorphism) with four named actions: `setTrackSelection(id)`, `toggleTrackSelection(id)`, `addTracksToSelection(ids)`, `removeTracksFromSelection(ids)`.
**Rationale:** old API conflated "replace" / "toggle" / "add" / "remove" behind two boolean flags whose meaning differed (`multi: boolean` vs `select: boolean`). Intent now reads at the call site.

## Known fragilities

See [20_Fragility_Audit.md](20_Fragility_Audit.md):
- **F5** (🟡 partial) — legacy `camera.unified.*` / `camera.rotation.*` binders still hardcoded in `AnimationEngine.getBinder`. `cameraKeyRegistry` lets apps register their own tracks; full `binderRegistry.register()` still pending.
- **F6** (🔴 open) — `set${Feature}` name inference in `AnimationEngine.getBinder`. Silent no-op when naming doesn't match.
- **F7** (🔴 open) — `animationStore ↔ fractalStore` circular import via `window.useAnimationStore`.
- **F12** (🟢 fixed 2026-04-23) — UNDERSCORE-form vec binder.
- **F13** (🟢 fixed 2026-04-23) — GMT-specific target hijacks in `AnimationSystem.tsx` gated; generic DDFS vec + scalar now populate `liveModulations` without requiring a uniform declaration.

## Cross-refs

- Feature param types: [02_Feature_Registry.md § param-types](02_Feature_Registry.md#param-types-and-interpolators)
- Primitive animation integration: [05_Shared_UI.md § AnimationContext](05_Shared_UI.md#animationcontext)
- Shortcut bindings: [07_Shortcuts.md § animation](07_Shortcuts.md)
- Derived-value alternative: [09_Bridges_and_Derived.md](09_Bridges_and_Derived.md)
