
# Animation Engine
> Last updated: 2026-04-30 | GMT v0.9.2

The Animation Engine handles the sequencing, interpolation, and application of keyframe data. It is a pure logic layer — it reads keyframe data from the animation store, interpolates values, and pushes them to the fractal store via dynamically resolved binder functions.

> **Scope split**
> - **This doc** — implementation reference for GMT's animation pipeline: data shapes, Bezier math, tangent modes, camera unification, store slices, timeline UI components, recording snapshot. Read this when touching the animation code itself.
> - **[`engine/08_Animation.md`](../engine/08_Animation.md)** — engine fork plugin contract: how features auto-bind, binder resolution decisions, fragility audit. Read this when wiring a new feature into the animation system or evaluating an architectural change.
>
> The engine fork uses this exact `AnimationSystem.tick` pipeline verbatim, so behaviour described here applies to both GMT and engine-fork apps.

## 1. Architecture

### 1.1 Separation of Concerns

| Component | File | Role |
|-----------|------|------|
| **AnimationEngine** | `engine/AnimationEngine.ts` | Pure logic: interpolation, binding resolution, camera commit. Singleton `animationEngine`. |
| **AnimationStore** | `store/animationStore.ts` | Zustand store: playback state, sequence data, selection state. Three sub-slices. |
| **AnimationMath** | `engine/math/AnimationMath.ts` | Stateless math: curve interpolation, tangent calculation, handle constraints, soft selection falloff. |
| **BezierMath** | `engine/BezierMath.ts` | Newton-Raphson cubic Bezier solver. |
| **AnimationSystem** | `components/AnimationSystem.tsx` | React tick orchestrator: drives `animationEngine.tick()`, LFO oscillators, modulation, audio reactivity. |
| **Timeline UI** | `components/timeline/` | DopeSheet, TrackRow, KeyframeInspector, RenderPopup, etc. |

### 1.2 Data Flow

```
AnimationStore (sequence/tracks/keyframes)
    ↓ read by
AnimationEngine.scrub(frame)
    ↓ for each track: interpolate value
    ↓ resolve binder (track ID → setter function)
    ↓ call binder(value) → writes to fractalStore
    ↓ camera tracks → pendingCam buffer → commitState()
        ↓ VirtualSpace.split() → CAMERA_TELEPORT event → GPU
```

### 1.3 Store Connection

The engine doesn't import stores directly (to avoid circular deps in the worker architecture). Instead, store accessors are injected at boot:

```typescript
// In store/fractalStore.ts, after stores are initialized:
animationEngine.connect(useAnimationStore, useFractalStore);
```

The `connect()` method receives `StoreAccessor` objects (with `getState()` / `setState()`), which the engine uses to read sequence data and write parameter values.

## 2. Data Model

### 2.1 Core Types (`types/animation.ts`)

```typescript
interface Track {
    id: string;           // e.g., "coreMath.paramA", "camera.unified.x"
    type: 'float';        // Only float tracks currently supported
    label: string;        // Display name in UI
    keyframes: Keyframe[];
    color?: string;       // Track color in dope sheet / graph editor
    hidden?: boolean;     // Collapsed in UI
    locked?: boolean;     // Prevents editing
    postBehavior?: TrackBehavior;  // What happens after the last keyframe
}

interface Keyframe {
    id: string;
    frame: number;        // Frame position (float — sub-frame precision allowed)
    value: number;
    interpolation: 'Step' | 'Linear' | 'Bezier';
    leftTangent?: BezierHandle;   // Incoming handle {x, y} relative to keyframe
    rightTangent?: BezierHandle;  // Outgoing handle {x, y} relative to keyframe
    brokenTangents?: boolean;     // True = handles move independently (Free)
    autoTangent?: boolean;        // True = auto-calculate tangents from neighbors
    tangentMode?: 'Aligned' | 'Unified';  // see §4.3 — Aligned is the default
                                          // when neither autoTangent nor brokenTangents is set
}

type TrackBehavior = 'Hold' | 'Loop' | 'PingPong' | 'Continue' | 'OffsetLoop';
type LoopMode = 'Loop' | 'Once' | 'PingPong';  // Global playback loop mode
```

### 2.2 Track ID Format

Track IDs follow a dot-separated convention that the binder system parses:

| Pattern | Example | Resolves To |
|---------|---------|-------------|
| `feature.param` | `coreMath.paramA` | `setCoreMath({ paramA: v })` |
| `feature.vecN_axis` | `coreMath.vec3A_x` | Read current vec3A, update `.x`, write back |
| `camera.unified.axis` | `camera.unified.x` | Pending camera buffer → split-float commit |
| `camera.rotation.axis` | `camera.rotation.y` | Pending camera buffer → quaternion commit |
| `camera.active_index` | `camera.active_index` | Switches saved camera slot (rounded to int) |
| `lighting.lightN_prop` | `lighting.light0_posX` | `updateLight({ index: 0, params: { position: {..., x: v} } })` |
| `lights.N.prop.axis` | `lights.0.position.x` | Legacy format — remapped to `lighting.light0_posX` |

### 2.3 Post-Keyframe Behaviors

What happens when the playhead is past the last keyframe on a track:

| Behavior | Effect |
|----------|--------|
| **Hold** | Stays at last keyframe value (default) |
| **Loop** | Wraps to first keyframe, repeats cycle |
| **PingPong** | Alternates forward/backward through the keyframe range |
| **Continue** | Extrapolates using the slope at the last keyframe |
| **OffsetLoop** | Like Loop, but each cycle adds the total value change (for continuous rotation etc.) |

## 3. Binder System

The binder system maps track IDs to setter functions. Binders are created lazily on first use and cached in a `Map<string, ValueSetter>`.

### 3.1 Resolution Order

The `getBinder(id)` method resolves in this priority:

1. **`camera.active_index`** — Camera slot switcher (rounds to int, deduplicates)
2. **`camera.*`** — Camera properties write to `pendingCam` buffer (not directly to store)
3. **`lights.*`** — Legacy format, remapped to DDFS `lighting.lightN_*` format
4. **`lighting.lightN_*`** — Array-indexed light property updates
5. **`feature.param`** — Universal DDFS resolver: looks up feature in `FeatureRegistry`, constructs `set{Feature}({ param: v })` setter
6. **Root-level fallback** — Direct store property setter (e.g., `setZoom(v)`)

### 3.2 Vector Component Tracks

Vector parameters (vec2/vec3) are animated per-axis. Each axis gets its own track:

```
Track: "coreMath.vec3A_x" → reads current vec3A from store, clones it, updates .x, writes back
Track: "coreMath.vec3A_y" → same pattern for .y
Track: "coreMath.vec3A_z" → same pattern for .z
```

The `ParameterSelector` component automatically expands vec2/vec3 params into per-axis entries in the track picker UI.

## 4. Interpolation

### 4.1 Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Step** | Instant jump to k1's value. No transition. | On/off toggles, discrete switches |
| **Linear** | Constant rate: `v1 + (v2 - v1) * t` | Simple motion, linear ramps |
| **Bezier** | Cubic Bezier F-curve with tangent handles | Smooth eases, complex motion |

### 4.2 Bezier Solver (`BezierMath.ts`)

The solver finds the Y value on a 2D cubic Bezier curve for a given X (time):

1. **Control points**: Four points `(P0, P1, P2, P3)` where:
   - P0 = `(k1.frame, k1.value)` — start keyframe
   - P1 = P0 + `k1.rightTangent` — outgoing handle
   - P2 = P3 + `k2.leftTangent` — incoming handle (leftTangent.x is negative)
   - P3 = `(k2.frame, k2.value)` — end keyframe

2. **Step 1** — Solve for parameter `t` given X (frame) using Newton-Raphson:
   - Initial guess: linear `t = (x - x0) / (x3 - x0)`
   - 4 iterations of: `t -= (bezier(t) - x) / bezier'(t)`
   - Clamped to `[0, 1]`
   - Exits early if slope < 1e-9 (flat region)

3. **Step 2** — Evaluate Y at the solved `t` using standard cubic Bezier formula.

### 4.3 Tangent Calculation (`AnimationMath.ts`)

User-shaped Bezier tangents are first-class — once a user touches a handle, GMT will not silently rewrite it. Five tangent modes are exposed via the keyframe context menu:

| Mode | Stored as | Behaviour |
|------|-----------|-----------|
| **Auto** | `autoTangent: true` | Weighted Catmull-Rom with overshoot protection. Slope = `(next.value - prev.value) / (next.frame - prev.frame)`, clamped to 3× min adjacent slope. Flattens at peaks/valleys (monotonicity check). Recomputed whenever neighbours change. |
| **Ease** | `autoTangent: false`, flat handles | Flat tangents (y=0). Smooth ease-in/ease-out at every keyframe. Doesn't recompute. |
| **Aligned** *(default)* | `autoTangent: false`, `tangentMode: undefined` | Direction locked across the key, each handle keeps its own length. Maya/Blender default. Drag-mirror preserves the *other* side's magnitude. |
| **Unified** | `autoTangent: false`, `tangentMode: 'Unified'` | Direction AND length locked. Dragging one handle mirrors the other to the same length. Symmetric easing. |
| **Free (Broken)** | `brokenTangents: true` | Fully independent left/right handles. Sharp corners. |

`setTangents('Unified' \| 'Aligned')` averages both handles' direction (order-independent — the side you drag last doesn't "win") then writes back. Shared length for Unified, per-side length for Aligned.

#### Handle constraints
- **Sign-only by default**: left handle cannot cross into the future (x > 0 → clamped to 0); right handle cannot cross into the past (x < 0 → clamped to 0). Magnitude is preserved — handles may extend past the next/prev key (weighted Bezier, matching Maya).
- The 1/3-of-interval cap is **opt-in** via `constrainHandles(key, prev, next, { clampToOneThird: true })`. Used for newly-computed Auto tangents (which start at `dt * 0.333`); not applied to user-shaped handles during drag.
- When a keyframe moves in time, `scaleHandles` proportionally scales handle x AND y to preserve angle.

#### Insert-on-curve (de Casteljau split)
When `addKeyframe` inserts between two Bezier keys, it performs a proper de Casteljau split (`engine/BezierMath.ts → splitCubicBezier`) at parameter `t = solveCubicBezierT(insertFrame, ...)`. The new key adopts curve-derived tangents and the prev/next adjacent handles are rewritten so the visual segment is unchanged. All three keys are flagged `autoTangent: false`. Falls back to Auto tangents at endpoints / Linear neighbours.

#### Neighbour updates on insert/edit (`TrackUtils.updateNeighbors`)
Only Bezier neighbours with `autoTangent === true` get their tangents recomputed. User-shaped neighbours are left alone — inserting or moving a key never silently rescales a hand-shaped tangent.

### 4.4 Rotation Wrapping

Rotation tracks (`camera.rotation.*`, tracks containing "rot", "phase", or "twist") use shortest-path wrapping:
```typescript
if (diff > Math.PI) v2 -= 2π;
else if (diff < -Math.PI) v2 += 2π;
```
This prevents the camera from spinning the long way around when interpolating between angles.

## 5. Camera Animation

### 5.1 The Problem

GMT uses split-float coordinates for infinite zoom (see doc 02). The camera's "real" position is split across:
- `sceneOffset` (integer part — `{x, y, z, xL, yL, zL}`)
- `camera.position` (fractional part — Three.js camera local position)

Interpolating these independently would cause jumps at integer boundaries.

### 5.2 The Solution: Unified Coordinates

**Recording** (capturing a keyframe):
```
unified.x = sceneOffset.x + sceneOffset.xL + camera.position.x
```
This merges both parts into a single 64-bit-precision value stored in the keyframe.

**Playback** (`commitState()`):
1. Interpolate the unified value normally
2. Split back: `VirtualSpace.split(unified.x)` → `{ high: integer, low: fraction }`
3. Emit `CAMERA_TELEPORT` event with:
   - `position: (0, 0, 0)` — camera stays at origin
   - `sceneOffset: { x: high, xL: low, ... }` — universe moves around it
4. Set `engine.shouldSnapCamera = true` to bypass camera smoothing

**Rotation**: Camera quaternion is decomposed to Euler for per-axis animation, then recomposed to quaternion for the teleport event. (Note: this is Euler interpolation, not SLERP — acceptable for small angle changes per frame.)

### 5.3 Pending Camera Buffer

Camera properties aren't written to the store immediately. Instead, they accumulate in `pendingCam`:

```typescript
interface PendingCameraState {
    rot: THREE.Euler;
    unified: THREE.Vector3;
    rotDirty: boolean;
    unifiedDirty: boolean;
}
```

At the start of each `scrub()`, `syncBuffersFromEngine()` reads the current camera state into the buffer. Tracks then overwrite individual components. At the end, `commitState()` pushes the complete state if anything changed. This prevents partial updates (e.g., X updated but Y still at old value).

## 6. Playback Modes

### 6.1 Real-Time (`tick`)

Called every frame by `AnimationSystem.tsx` via the TickRegistry (ANIMATE phase):

```
tick(deltaTime):
    nextFrame = currentFrame + (dt * fps)
    if nextFrame >= duration:
        if loopMode == 'Once': stop
        if loopMode == 'Loop': nextFrame = 0
        if loopMode == 'PingPong': [handled by track post-behavior]
    scrub(nextFrame)
```

Frame advances are based on wall-clock delta, so animation stays in sync with real time even if rendering is slow (frames are skipped, not delayed).

### 6.2 Offline / Video Export (`scrub`)

The `RenderPopup` component drives offline rendering. The outer shape is the same for video and image-sequence exports — scrub → render → encode/write — but multi-pass output adds a second dimension:

```
for each pass in selectedPasses:            // outer for VIDEO (one file per pass)
    for each frame in [startFrame..endFrame]:
        animationEngine.scrub(timelineFrame)   // Sets all params for this exact frame
        // Wait for shader to render + accumulate N samples (worker-side)
        // Capture frame to video encoder OR to per-frame image file(s)
animationEngine.scrub(savedFrame)                // Restore original position
```

For image sequences (PNG / JPG) the nesting inverts: a single worker session iterates passes *inside* each frame so beauty + alpha can be merged into one RGBA PNG, while JPG writes one file per pass per frame. See [05_Data_and_Export.md](05_Data_and_Export.md) §1 for the full pass/format matrix.

Key differences from real-time:
- Exact frame positions (no delta-time drift)
- No camera smoothing (`shouldSnapCamera = true`)
- Full accumulation per frame (waits for convergence)
- Focus-lock only adjusts DOF on the beauty pass — prevents the lens offset from drifting between passes of a multi-pass video run.

### 6.3 Modulation Recording

A special mode where LFO/audio modulation values are baked into keyframes:

1. **Arm**: User clicks arm button → stores a clean snapshot of the sequence (`recordingSnapshot`)
2. **Play**: Playback starts from frame 0, `isRecordingModulation = true`
3. During playback, modulation offsets are captured as keyframes on each frame via `batchAddKeyframes`
4. **Stop**: At end of timeline, recording stops. The sequence now contains baked modulation data.

**Important**: while `isRecordingModulation`, `AnimationEngine.scrub()` evaluates `recordingSnapshot` instead of the live sequence. This prevents jitter at the playhead — the live track is being mutated each tick, and the modulation overlay only fires when offset > 0.000001, so brief returns to zero offset would otherwise expose the freshly-mutated live curve. Reading the snapshot keeps the rendered value smooth across zero-offset moments. The modulation system itself uses the same snapshot for `cleanBase` lookups.

## 7. Animation Store Structure

The store is split into three Zustand slices:

### 7.1 PlaybackSlice (`store/animation/playbackSlice.ts`)

State: `isPlaying`, `isRecording`, `currentFrame`, `fps` (default 30), `durationFrames` (default 300 = 10s), `loopMode`, `zoomLevel`, modulation recording state.

Actions: `play()`, `pause()`, `stop()`, `seek(frame)`, `setDuration()`, `setFps()`.

Auto-reset: If at end of timeline when play is pressed, jumps to frame 0.

### 7.2 SelectionSlice (`store/animation/selectionSlice.ts`)

State: `selectedTrackIds`, `selectedKeyframeIds`, soft selection settings (radius, type, enabled).

Track-selection actions are split by intent (no boolean polymorphism):
- `setTrackSelection(id)` — replace selection with a single id
- `toggleTrackSelection(id)` — toggle one id in/out
- `addTracksToSelection(ids[])` — add many (idempotent)
- `removeTracksFromSelection(ids[])` — remove many

Keyframe-selection actions: `selectKeyframe(tid, kid, multi)`, `selectKeyframes(ids, multi)`, `deselectAll()`, `deselectAllKeys()`.

Soft selection types: Linear, Dome, Pinpoint, S-Curve — affect how nearby keyframes are influenced during drags.

### 7.3 SequenceSlice (`store/animation/sequenceSlice.ts`)

State: `sequence` (all tracks/keyframes), `clipboard`, undo/redo stacks.

Key actions:
- `addTrack(id, label)` / `removeTrack(id)`
- `addKeyframe(trackId, frame, value, interpolation?)` — uses de Casteljau split when inserting between two Bezier keys (preserves curve shape; see §4.3); falls back to Auto tangents otherwise
- `batchAddKeyframes(frame, updates[])` — optimised forward-append path for modulation recording. **Intentionally diverges** from `addKeyframe`: defaults to Linear, skips tangent calculation and neighbour updates because dense recorded keys don't want smart tangents. Don't merge these two without preserving both behaviours.
- `captureCameraFrame(frame)` — records all 6 camera tracks (unified x/y/z + rotation x/y/z)
- `setTangents(mode)` — applies tangent mode to selected keyframes
- `setGlobalInterpolation(type)` — changes all selected keyframes' interpolation
- `copySelectedKeyframes()` / `pasteKeyframes()` / `duplicateSelection()` / `loopSelection(times)`
- `simplifySelectedKeys(tolerance?)` — reduces keyframe count while preserving curve shape
- `undo()` / `redo()` with `snapshot()` for history capture

## 8. Timeline UI Components

| Component | File | Purpose |
|-----------|------|---------|
| **DopeSheet** | `timeline/DopeSheet.tsx` | Main timeline view with track rows and keyframe diamonds |
| **TrackRow** | `timeline/TrackRow.tsx` | Single track: name, eye toggle, select-all-keys icon, keyframe dots, drag |
| **TrackGroup** | `timeline/TrackGroup.tsx` | Collapsible group of related tracks. Renders a per-group `SelectionTransformBar` when ≥2 selected keys live in this group. |
| **SelectionTransformBar** | `timeline/SelectionTransformBar.tsx` | Shared orange move/scale bar. Used by the Global Summary row AND each TrackGroup. |
| **TimelineRuler** | `timeline/TimelineRuler.tsx` | Frame number ruler with playhead |
| **TimeNavigator** | `timeline/TimeNavigator.tsx` | Zoom/pan controls for timeline |
| **TimelineToolbar** | `timeline/TimelineToolbar.tsx` | Play/record/loop buttons, frame counter |
| **KeyframeInspector** | `timeline/KeyframeInspector.tsx` | Detail panel for selected keyframe (value, tangents, interpolation) |
| **KeyframeContextMenu** | `timeline/KeyframeContextMenu.tsx` | Right-click menu for keyframe operations |
| **RenderPopup** | `timeline/RenderPopup.tsx` | Video export dialog with offline render loop |

Track grouping is centralised in `utils/groupTracks.ts` (single source of truth for the Camera/Formula/Optics/Lighting/Shading buckets) — used by both DopeSheet and GraphSidebar.

### Selection / visibility model

- **Track-header click in DopeSheet** selects the track only — does NOT auto-select every key on the track. Keys are picked via marquee, per-key click, or the row's "select all keys" icon. (Stops a casual click from arming Delete to wipe the whole track.)
- **GraphSidebar click** selects the track AND additively turns it visible in the graph (so the user gets visual feedback). The eye column is the only path that *removes* visibility — selection never hides.
- DopeSheet TrackRows expose the same eye + select-all icons as the GraphSidebar so the user doesn't have to bounce between views.

### Graph Editor (`components/GraphEditor.tsx`, `hooks/useGraphInteraction.ts`)

Drag/scroll/zoom/scrub/box-select all live in `useGraphInteraction.ts` (a 765-line god-hook flagged for future split into `useKeyDrag` / `useHandleDrag` / `useMarquee` / `usePanZoom` / `useScrub`).

Toolbar (`graph/GraphToolbar.tsx`) extras:
- **Show Selected Only** — hides any track in the canvas that has no selected key. Sidebar list is unaffected (only the canvas filters).

Keyboard shortcuts (graph editor focused):
- **A** — select all keys on currently displayed tracks
- **Alt+A** — deselect all keys
- **Delete / Backspace** — delete selected keys
- **F** — fit view to selection
- **Ctrl+C / Ctrl+V** — copy / paste keys

## 9. Integration Points

### 9.1 TickRegistry Phase

Animation runs in the **ANIMATE** phase (after SNAPSHOT, before OVERLAY):
```
SNAPSHOT → ANIMATE → OVERLAY → UI
              ↑
    AnimationSystem.tick()
    ├── animationEngine.tick(dt)     // keyframe timeline
    ├── audioAnalysisEngine.tick()   // audio FFT
    ├── modulationEngine.tick()      // LFO + modulation rules
    └── oscillator updates           // legacy LFO system
```

### 9.2 Overridden Tracks

When modulation or audio is actively driving a parameter, the AnimationEngine skips that track to avoid fighting:

```typescript
animationEngine.setOverriddenTracks(activeModulationTargets);
// During scrub: if (this.overriddenTracks.has(track.id)) continue;
```

### 9.3 Legacy Track Migration

Old presets may contain `lights.0.position.x` format tracks. The binder system automatically remaps these to the DDFS format `lighting.light0_posX` via the legacy handler in `getBinder()`.
