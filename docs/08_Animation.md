# 08 — Animation 🚧

Timeline + keyframes + modulation, with **auto-binding** for every feature param and explicit `BinderRegistry` for everything else.

**Rule:** if you declare a param in a feature, it's animatable. No separate wiring.

## What replaces GMT's setter-name inference

GMT's `AnimationEngine.ts` built binders by doing:
```ts
const setterName = 'set' + featureName.charAt(0).toUpperCase() + featureName.slice(1);
const setter = (storeActions as any)[setterName];
```
Worked until a feature didn't follow the convention. Silent no-op when it broke.

**New approach:** binders are derived from the feature registry at store-construction time.

```ts
// At freeze:
for (const [featureId, def] of featureRegistry.entries()) {
  for (const [paramId, paramDef] of Object.entries(def.params)) {
    const trackId = `${featureId}.${paramId}`;
    binderRegistry.auto(trackId, {
      read:  () => store.getState()[featureId][paramId],
      write: (v) => store.getState()[`set${capitalize(featureId)}`]({ [paramId]: v }),
      interpolate: interpolatorFor(paramDef.type),
    });
  }
}
```

Every DDFS param ⇒ one track ⇒ zero manual wiring.

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

## BinderRegistry — explicit binders

For state that's NOT a feature param (camera pose, app globals, derived values), register binders manually:

```ts
binderRegistry.register({
  id: 'camera.position',
  read:  () => store.getState().camera.position,
  write: (v) => store.getState().camera.setPosition(v),
  interpolate: lerpVec3,
  category?: 'Camera',            // for ParameterSelector grouping
  label?: 'Camera Position',
});
```

**Canonical non-feature binders** (registered by `@engine/camera` when installed):
- `camera.position`, `camera.rotation`, `camera.targetDistance`, `camera.fov`, `camera.active_index`

App-specific binders: the app registers them at boot, in the same module pattern as `registerFeatures.ts`.

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
- **F5** — hardcoded camera tracks. Fixed by `@engine/camera` registering its own binders, not engine-bundled.
- **F6** — `set${Feature}` name inference. Fixed by `binderRegistry.auto()` at freeze.

## Cross-refs

- Feature param types: [02_Feature_Registry.md § param-types](02_Feature_Registry.md#param-types-and-interpolators)
- Primitive animation integration: [05_Shared_UI.md § AnimationContext](05_Shared_UI.md#animationcontext)
- Shortcut bindings: [07_Shortcuts.md § animation](07_Shortcuts.md)
- Derived-value alternative: [09_Bridges_and_Derived.md](09_Bridges_and_Derived.md)
