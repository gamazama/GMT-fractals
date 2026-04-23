# 08 — Animation 🚧

Timeline + keyframes + modulation.

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

## BinderRegistry — explicit binders (designed, not yet built)

The full design is: for state that's NOT a feature param, apps register binders at boot so the animation engine has a uniform lookup rather than the current name-inference chain.

```ts
// Designed API — NOT YET IMPLEMENTED. Tracked as F5 + F6.
binderRegistry.register({
  id: 'camera.position',
  read:  () => store.getState().camera.position,
  write: (v) => store.getState().camera.setPosition(v),
  interpolate: lerpVec3,
  category?: 'Camera',
  label?: 'Camera Position',
});
```

**Current workaround — `cameraKeyRegistry`** (`engine/animation/cameraKeyRegistry.ts`):

Apps register the track-id list that makes up their camera pose. The shared `<TimelineToolbar>`'s Key Cam button reads this list and captures a keyframe on each track from the current store state.

```ts
// fluid-toy/main.tsx
import { registerCameraKeyTracks } from '../engine/animation/cameraKeyRegistry';

registerCameraKeyTracks([
  'sceneCamera.center.x',
  'sceneCamera.center.y',
  'sceneCamera.zoom',
]);
```

Default capture path-resolves each track id against the DDFS store. Apps with camera state outside the store (e.g. GMT reading from `engine.activeCamera`) override with `setCameraKeyCaptureFn(fn)`.

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
  fps: number;
}
```

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
