# Camera systems vs the deep zoomer

Written 2026-10-07, read-only pass. Scope: everything in GMT / gmt-engine that holds or moves a
camera, other than navigation itself (another reader) and the Light Studio (another reader).

The question for each: the deep zoomer's exact view is **three decimal strings of up to about 80
digits (BigInt, value x 2^256) plus yaw and pitch** (two ordinary numbers). Can that live in the
system as it stands?

Verdict words: AS-IS, ADAPTER (code in `deep-zoom/` only), REWORK (the GMT / engine system changes),
NOT-NOW.

Short answer: nothing here blocks the shell. Every store that holds a camera *as a blob* already
takes strings. Every system that holds a camera *as numbers on a curve or in a fixed set of store
fields* cannot, and for those the right move is an adapter (one float on the timeline pointing into a
side table of exact views), not a rework. There are three genuine reworks, all small, all optional
for a first version: the camera undo scope, the FBX frame sampler, and (only when depth of field
arrives) the focus-distance source.

---

## 1. Facts, with file and symbol

### 1.1 Camera slot plugin - `engine/plugins/Camera.ts`

- `CameraAdapter` is three members: `featureId`, `captureState: () => Record<string, any>`,
  `applyState: (state: Record<string, any>) => void`.
- The header says why: "this plugin stores adapter-opaque JSON state and lets the adapter own
  interpretation", and "NOT in scope: animation. This plugin registers no binders and no keyframe
  tracks."
- `saveSlot` / `recallSlot` only copy the blob in and out of `cameraSlots` on the store
  (`setSlots` -> `(useEngineStore as any).setState({ cameraSlots: slots })`). Nothing reads a field.
- Persistence is `engine/plugins/camera/presetField.ts`: `serialize: (s) => s.cameraSlots`, and
  `deserialize` sets the array back. JSON in, JSON out.
- No label editing, no thumbnail, no panel, no undo (nothing in the file touches the history slice).
- fluid-toy and app-gmt both call `installCamera({ hideShortcuts: true })` and let the state library
  own the 1..9 keys (`fluid-toy/main.tsx` comment above the call; `app-gmt/main.tsx` line with
  `installCamera({ hideShortcuts: true })`).

So: strings fit, exactly. But the plugin is the weaker of two mechanisms and the blueprint already
chose not to use it (BLUEPRINT.md, row "Camera plugin: not used"). I agree.

### 1.2 Saved-state library - `engine/store/createStateLibrarySlice.ts`, `engine/store/installStateLibrary.ts`, `components/StateLibraryPanel.tsx`

- `StateSnapshot<T>` = `{ id, label, thumbnail?: string, state: T, createdAt }`. The comment on it:
  "The state payload `T` is opaque to the library - apps decide what to capture."
- `StateLibraryOptions<T>` hands every camera-specific job to the app: `capture: () => T`,
  `apply: (state: T, prev?: T) => void`, `isModified?: (snapshot: T) => boolean`,
  `captureThumbnail?: () => Promise<string | undefined>`, `suggestLabel?`, `onReset?`, `onApplied?`.
- The library never interpolates. A fly-to between saved views is the app's own code: fluid-toy's
  `fluid-toy/viewLibrary.ts` imports `lerp, easeInOutQuad` itself and its payload `JuliaViewState`
  is its own shape (`center`, `zoom`, `maxIter`, ...).
- `installStateLibrary` adds the 1..9 / Mod+1..9 shortcuts, an optional top-bar menu and the saved
  toast. The list panel is the generic `components/StateLibraryPanel.tsx`; GMT's
  `engine-gmt/features/camera_manager/CameraManagerPanel.tsx` is a thin shell round it
  (`<StateLibraryPanel<SavedCamera['state']> ...>`) plus GMT-only extras.

So a payload of `{ cam: [string, string, string], yaw, pitch, iters, power, phase, ... }` is legal
today. Thumbnails come from whatever `captureThumbnail` returns (the renderer's canvas).

### 1.3 GMT's Camera Manager - `engine-gmt/features/camera_manager/*`, `engine-gmt/store/cameraSlice.ts`, `engine-gmt/types/store.ts`

- `SavedCameraPayload extends CameraState { optics: OpticsState }`; `CameraState`
  (`engine-gmt/types/common.ts`) is `position {x,y,z}`, `rotation {x,y,z,w}`,
  `sceneOffset?: PreciseVector3`, `targetDistance?: number`. All numbers; position is a pair of
  doubles per axis at best.
- `cameraSlice.ts` calls `installStateLibrary<SavedCameraPayload>({ arrayKey: 'savedCameras', ...
  capture: captureCameraState, apply: applyCameraState, isModified: isCameraModified,
  suggestLabel: suggestCameraLabel, captureThumbnail: captureCameraThumbnail, onReset:
  resetToFormulaDefault, menu: null })`.
- `logic.ts` `calculateDirectionalView` (Front / Top / Isometric ...) builds a three.js quaternion,
  reads `engine.lastMeasuredDistance` from GMT's worker proxy, and switches optics to orthographic
  (`camType: 1.0`). `getDirectionName` names a view from its quaternion.
- `index.ts`: `params: {}` - the feature is only a tab registration.

GMT's Camera Manager is one *user* of the generic library, not the library. The deep zoomer becomes
a second user (fluid-toy is already one). Nothing of GMT's is copied.

### 1.4 Timeline camera handling

- `types/animation.ts` `Keyframe`: `value: number`. A keyframe cannot hold a string. This is the
  hard wall for the whole timeline.
- `engine/animation/cameraKeyRegistry.ts`:
  - `registerCameraKeyTracks(tracks)` - the list Key Cam captures; no list, no button.
  - `setCameraKeyCaptureFn(fn)` - "Apps register this when their camera values live outside the
    DDFS store". GMT does (`engine-gmt/animation/cameraBinders.ts`,
    `setCameraKeyCaptureFn(captureGmtCameraKeyFrame)`).
  - The default walker only takes numbers: `if (typeof v === 'number' && isFinite(v)) resolved.push(...)`.
- `app-gmt/main.tsx` registers `camera.unified.{x,y,z}` and `camera.rotation.{x,y,z}` - six float
  tracks. The binders (`cameraBinders.ts` header) buffer the six writes per frame and flush one
  `CAMERA_TELEPORT` with "split-precision math applied to the unified position". One double per
  axis on the curve, so about 1e-16.
- `engine/animation/cameraPairRegistry.ts`: `CameraPair { zoom, pan[], panLow?[] }`. Each pan axis
  is a hi track plus an optional hidden lo track, tweened as one double-double
  (`ddSub` / `ddMulD` / `ddAdd` in `evaluateDDPairAxis`), with progress taken from the zoom track:
  `progress = (zT_virt - z0) / (z1 - z0)`. Header: "gives ~1e-32 absolute precision, quiet motion
  past e-30". The axis count is not fixed at two (`pair.pan[axis]`), so three axes would work.
  Two words per axis is fixed (`panLow` is a single array). Only user today: fluid-toy
  (`registerCameraPair({ zoom: 'julia.zoom', pan: [...center_x, _y], panLow: [...centerLow_x, _y] })`).
- `engine/animation/logTrackRegistry.ts`: `registerLogTrack(id)` makes a track tween in log space,
  Bezier included. It carries an open `@bug PRODUCTION` - the graph editor's Bias handle and Pencil
  author tangents in linear units on a log track (up to 22x off on a 24-decade track).

So the engine's own deepest camera scheme stops at about 1e-32, 45 decades short of the deep
zoomer. The blueprint's answer (section 8): one float track `camera.u` (0..1 along the recorded
flight), exact views in a side table `dzFlight`, `registerCameraKeyTracks(['camera.u'])`, no pair,
no log track. That needs no engine change.

### 1.5 Optics - `engine-gmt/features/optics.ts`, `engine-gmt/components/panels/scene_widgets.tsx`

- `OpticsState`: `camType`, `camFov`, `orthoScale`, `dofStrength`, `dofFocus` - five floats.
- `camFov`: `default: 60, min: 10, max: 150`, `hidden: true` (drawn by the custom
  `optics-controls` widget). `camType` options: Perspective / Orthographic / 360 Skybox.
- `dofFocus`: `default: 10.0, min: 0.000001, max: 10000.0, scale: 'log'`, `uniform: 'uDOFFocus'`.
  An absolute world distance with a floor of 1e-6.
- Where focus depth comes from: `scene_widgets.tsx` reads GMT's worker proxy directly -
  `if (v && engine.lastMeasuredDistance > 0) { setOptics({ dofFocus: engine.lastMeasuredDistance }); }`
  (Focus Lock) - and picking goes through `WorkerProxy.startFocusPick(x, y)` ->
  `{ type: 'FOCUS_PICK_START', id, x, y }`, "captures depth snapshot from current frame", then
  `sampleFocusPick`. `lastMeasuredDistance` is written in
  `engine-gmt/engine/worker/WorkerDepthReadback.ts` (`if (hit) engine.lastMeasuredDistance = d;`).
- The deep zoomer has none of this: field of view fixed (`fovScale = Math.tan(0.5*1.1)`, 34.1
  degrees vertical - HANDOFF-MAPPING.md section 2), no orthographic, no depth of field.

### 1.6 Rotation gizmo - `engine-gmt/features/rotation_gizmo/*`

- It is not a camera control. `index.ts`: "host feature for the canvas rotation-gizmo overlay",
  `params: {}`. `RotationGizmoOverlay.tsx` draws rings for a *formula's rotation parameters*
  (`RotationDescriptor`, written back through `slotWriteValue` from
  `engine-gmt/utils/uniformSlots`), and only *reads* the camera to orient the rings:
  `getDisplayCamera()` from `engine-gmt/engine/worker/ViewportRefs`, then
  `handle.update({ cameraQuat: cam.quaternion, ... })`.
- The drawing primitive is generic and already in the engine: `engine/components/gizmo/RotationGizmo`
  takes a `cameraQuat`.
- During a drag the camera stands down through the `gizmo` interaction source
  (`selectMovementLock`), not a flag.

### 1.7 FBX camera export - `app-gmt/FbxRenderAdjunct.tsx` -> `engine-gmt/components/timeline/RenderPopup/{FbxExportDialog,fbxExport,sceneSampler,fbxScene,fbxBinary}`

- `FbxRenderAdjunct.tsx` is a `RenderAdjunct` `{ label, title, Dialog }` for
  `engine/animation/renderAdjunctRegistry`; it passes `fps` and `durationFrames` from the animation
  store. The registry is generic.
- `fbxExport.ts` calls `sampleScene` (from `sceneSampler.ts`) then `buildFbxScene`.
- `sceneSampler.ts` is GMT-shaped end to end: it reads `getViewportCamera() as
  THREE.PerspectiveCamera`, `useEngineStore.getState().sceneOffset`, `targetDistance`, and the
  tracks `camera.rotation.{x,y,z}` (`ROT_TRACK`). Its output `SceneFrame` is renderer-neutral:
  `relPos [3]`, `quat [4]`, `rotEuler [3]`, `lightsRel`, `trackValues`; `SceneSample` adds
  `dStart`, `fovDeg`, `lightMeta`.
- The precision trick (`fbxExport.ts` header): "Re-base everything to the START-frame look-at R ...
  so a deep-zoomed scene survives the trip in plain doubles"; `splitSub` cancels the shared
  magnitude. The start camera lands at a fixed nominal distance from the FBX origin.

### 1.8 Undo of camera moves - `store/slices/historySlice.ts`, `engine-gmt/store/cameraSlice.ts`, `app-gmt/main.tsx`

- A separate `'camera'` scope with its own stacks (`cameraUndoStack` / `cameraRedoStack`),
  debounced: `CAMERA_UNDO_DEBOUNCE_MS = 1500`.
- What an entry holds is written into the slice: the diff is
  `cameraRot: camState.rotation`, `sceneOffset`, `targetDistance`, and the current-state capture is
  `rotation: s.cameraRot, sceneOffset: s.sceneOffset, targetDistance: s.targetDistance`. Three named
  store fields, all numeric. An exact 256-bit view cannot go in.
- `cameraSlice.ts` wraps `undoCamera` / `redoCamera` "so the R3F camera warps". `app-gmt/main.tsx`
  binds `Ctrl+Shift+Z` / `Ctrl+Shift+Y` at `priority: 10` (load-bearing, see the comment there).
- The *param* scope is open: `registerHistoryProvider(key, { capture, restore, changeOf?, context? })`
  with snapshots typed `unknown` - strings are fine. `changeOf` decides whether a bracket makes an
  entry at all. The blueprint uses this for jumps (`registerHistoryProvider('dzView', ...)`).
- `store/engineStore.ts`: `CAMERA_DIRTY_KEYS = ['cameraRot', 'sceneOffset', 'targetDistance']` -
  framing is "view", not an edit. Same three fields again.

### 1.9 GMT <-> deep-zoom conversion - `plans/deep-zoom-in-gmt/HANDOFF-MAPPING.md`

Already complete and code-checked: identity transform between the two worlds; GMT -> page sums
`fromNum(x) + fromNum(xL) + fromNum(cameraPos.x)` as BigInt and takes `pitch = asin(f.y)`,
`yaw = atan2(f.z, f.x)` from the quaternion's forward; page -> GMT rounds to a double and builds
`q = qY(-(yaw + pi/2)) * qX(pitch)`. Lost going in: roll, field of view (60 vs 34.1, a 1.88x crop),
orthographic, depth of field. Lost coming out: everything below about 1e-16 of the position. It
ships a sketch (`gmtSceneToDzView`, `dzViewToGmtCamera`) and five test vectors.

---

## 2. Verdicts

| Sub-system | What it assumes today | Verdict | The rework, stated generically | Size | What GMT gains or risks |
|---|---|---|---|---|---|
| Camera slot plugin (`engine/plugins/Camera.ts`, `camera/presetField.ts`) | Nothing about shape: an opaque JSON blob per slot, never interpolated | **AS-IS** (strings fit) - but do not use it | none | 0 | none. The state library is the better home (labels, thumbnails, panel); fluid-toy and GMT both already hide this plugin's keys |
| Saved-state library (`createStateLibrarySlice`, `installStateLibrary`, `components/StateLibraryPanel.tsx`) | Payload `T` opaque; app supplies capture / apply / isModified / thumbnail | **ADAPTER** | none. Shell file `deep-zoom/locations.ts`: payload = the page's view object with string positions; `apply` = the renderer's own jump or dive; `captureThumbnail` = the renderer canvas; `isModified` = string compare | 0.5 session | none, untouched. Deep zoomer gets saved places with thumbnails, rename, reorder, 1..9 keys, top-bar menu, saved toast |
| GMT Camera Manager (`engine-gmt/features/camera_manager`, `cameraSlice.ts`) | `SavedCameraPayload` = quaternion + `sceneOffset` doubles + `optics`; directional views switch to orthographic and read GMT's worker | **NOT-NOW** as a component; its generic core is the row above | none. Would apply if the deep zoomer gains orthographic or axis-aligned views - at 1e-40 "Front View" has no meaning | 0 | none |
| Importing GMT saved cameras / scenes into the deep zoomer | Numeric `sceneOffset` + quaternion | **ADAPTER** | none. `deep-zoom/handoff.ts` per HANDOFF-MAPPING.md, with its refusals (Julia, hybrid, twist, non-integer power, orthographic) and its loss list (roll, field of view) | 1 session with the five test vectors | none. A GMT `.gmf`'s cameras open as deep-zoom locations |
| Key Cam + camera key tracks (`cameraKeyRegistry.ts`) | Keyframe `value: number`; default walker skips non-numbers; a host capture function may replace it | **ADAPTER** | none. One float track `camera.u` + side table of exact views (blueprint section 8). To make Key Cam mean "add this place to the flight" rather than "retime", the shell registers `setCameraKeyCaptureFn` and appends the live view to the side table | 0.5 session on top of the blueprint | none. Deep zoomer gets Key Cam, the dirty marker, the graph editor for pacing, record mode |
| A generic string-valued keyframe | Does not exist | **not recommended** (would be REWORK) | "a keyframe may carry an opaque payload that is stored and restored but never interpolated; the track's binder interpolates between payloads". Touches `Keyframe`, `AnimationMath`, the graph editor, the dope sheet, copy/paste, the curve tools | 4-6 days | risk to every app's timeline for a need the side table already meets. Leave it |
| Camera pair, two-word (`cameraPairRegistry.ts`) | Pan as hi + one lo track per axis; progress from a zoom track; about 1e-32 | **AS-IS to 1e-32, not beyond** | To go deeper it would be "a pan accumulator of N words": `panLow` becomes a list of word arrays, the three DD helpers become N-word. Five doubles per axis (265 bits) covers 256-bit, i.e. 15 hidden tracks per camera | 2-3 days + a node test | fluid-toy would get deeper than 1e-30 for free; risk is the one live user's flythroughs. Not needed if the side table is used - park it |
| Log tracks (`logTrackRegistry.ts`) | Positive values, tween in log space | **AS-IS** | none. Register any deep-zoom param that spans decades (the blueprint's `flySpeed`, `scale:'log'`). `camera.u` is not a log track | minutes | none. Note the open `@bug`: Bias and Pencil are wrong on log tracks today |
| Field of view (`optics.camFov`) | A float 10..150 on GMT's `optics` feature, default 60, drawn by a GMT widget | **ADAPTER** (plus one change in the ported renderer module, which is allowed) | none in GMT. Renderer module: `fovScale` becomes a uniform set from the shell (`2*tan(fov/2)`); shell declares its own `fov` param, default 34.1 so every existing flight looks the same. Do not register GMT's `OpticsFeature` in the shell - three of its five params (`camType`, `orthoScale`, DOF) would be dead rows | 0.5 session | none. Removes the 1.88x crop when a GMT scene is handed over; field of view becomes keyframable |
| Depth of field (`optics.dofStrength`, `dofFocus`) | A GMT shader pass driven by `uDOFStrength` / `uDOFFocus`; focus is an absolute distance, floor 1e-6 | **NOT-NOW** | Applies once the deep zoomer's shading pass has a blur (it already has a depth buffer, so it can). Then two things: (a) focus must be stored relative to the view scale, e.g. as a multiple of the surface distance, because an absolute floor of 1e-6 is 71 decades too shallow; (b) see next row | (deep zoomer blur: 1-2 days, not counted here) | none until then |
| Focus picking / Focus Lock (`scene_widgets.tsx`, `WorkerProxy.startFocusPick`, `lastMeasuredDistance`) | The widget imports GMT's worker proxy and asks it for depth | **REWORK, only when DOF arrives** | "the focus widgets take their depth from a registered depth probe (`probe()` for the centre, `pick(x, y)` for a point), default = today's worker calls" - a resolver, no app names. The deep zoomer registers one that reads its G-buffer depth | 1 session | GMT: no visible change; risk is Focus Lock and the pick tool, both exercised by hand only (no smoke known - unverified) |
| Rotation gizmo (`engine-gmt/features/rotation_gizmo`) | Edits a formula's rotation parameters; reads a three.js camera quaternion from GMT's viewport refs | **NOT-NOW** | Applies when a deep-zoom formula has a rotation parameter (the Mandelbulb's phase is two angles, not a rotation). Then ADAPTER: the generic `engine/components/gizmo/RotationGizmo` needs only `cameraQuat`, which the shell computes from yaw and pitch with the formula in HANDOFF-MAPPING.md | 1 session then | none |
| FBX export entry (`renderAdjunctRegistry`, `FbxRenderAdjunct.tsx`) | A `{ label, Dialog }` descriptor | **AS-IS** | none | minutes | none |
| FBX frame sampler (`sceneSampler.ts` `sampleScene`) | Reads GMT's three.js camera, `sceneOffset`, `targetDistance`, `camera.rotation.*` tracks | **REWORK (small)** | "the camera-path exporters take their frames from a frame source the app supplies; GMT's sampler is the default source". `fbxExport` and `afxExport` accept a `SceneSample` instead of always calling `sampleScene`. The deep zoomer's source walks the flight, subtracts the start look-at point in BigInt, and only then converts to doubles - exact | 1 session (GMT side) + 1 session (shell source) | GMT: none visible; risk is the C4D-validated FBX path, so re-export one known GMT shot and diff the bytes. Also finishes the "not yet factored" note in `fbxExport.ts`'s header |
| FBX for a full dive | Positions as plain doubles relative to one origin | **limit, not a rework** | A single re-base holds about 15 decades (far less in a DCC that stores floats). A 77-decade dive needs either one FBX per segment or a parent null whose scale is animated (camera stays near the origin, the world grows; 1e77 is inside a double). Decide before promising "FBX of a dive" | design call, then 1-2 days | none |
| Camera-move undo (`historySlice` `'camera'` scope) | An entry is exactly `cameraRot` / `sceneOffset` / `targetDistance` | **ADAPTER for v1; REWORK for a true Undo Move** | v1: jumps go on the param stack through `registerHistoryProvider` with `changeOf` (blueprint section 6) - works today. Rework: "the camera scope captures and restores through a registered camera-state provider; the default provider is today's three fields". Gives any app a separate navigation history that does not interleave with edits | 1 session | GMT: none visible. Risk: `cameraSlice`'s wrap of `undoCamera` and the `priority: 10` shortcut; guard is `npm run smoke:undo` |
| Scene save of the view (preset fields) | `cameraRot` / `sceneOffset` / `targetDistance` are canonical numeric fields | **AS-IS** | none. The shell registers its own preset field with opaque serialize / deserialize, exactly as `camera/presetField.ts` does | minutes | none. Rule to keep: the strings never pass through `Number()` |
| VirtualSpace as a real double-double (package F8 of last week's plan) | Position good to about 1e-16 | **not needed by the shell** | F8 would lift GMT's stored position to about 1e-32, which is still 45 decades short and GMT's marcher stops near 1e-6 anyway. It changes saved `sceneOffset` values. Keep it out of this job | - | avoids a saved-scene risk for no gain here |

---

## 3. What the deep zoomer gains, in order of value

1. **Saved places with thumbnails** (state library): the list panel, rename, reorder, duplicate,
   1..9 recall, the top-bar menu. Half a session, no engine change.
2. **Key Cam and the timeline** (one float + side table): pacing in the graph editor, record mode,
   the Render dialog. No engine change.
3. **Jump undo now; a separate Undo Move later** (one generic rework, one session).
4. **FBX camera path for compositing** (one small generic rework), with the honest limit that one
   file covers about 15 decades of a dive.
5. **Field of view as a parameter** (renderer module + shell), which also fixes the hand-over crop.
6. **Focus picking** only after the deep zoomer has depth of field at all.

## 4. The reworks that matter

1. **Camera undo scope takes a provider** - `store/slices/historySlice.ts`. Today the scope names
   three store fields; make it ask a registered provider, default unchanged. One session, guarded by
   `smoke:undo`.
2. **Camera-path exporters take a frame source** - `engine-gmt/components/timeline/RenderPopup/`.
   `SceneSample` is already neutral; only the sampler is GMT-shaped. One session each side.
3. **Focus widgets take a depth probe** - `engine-gmt/components/panels/scene_widgets.tsx`. Only
   when depth of field exists in the deep zoomer; with it, focus stored relative to view scale.

Deliberately not on the list: string keyframes, an N-word camera pair, F8. Each is real work on
shared code for something the side table already delivers.

## 5. Unverified

- `components/StateLibraryPanel.tsx` props (I read only that `CameraManagerPanel.tsx` wraps it and
  its header says it owns "the GMT-specific bits"); whether it needs anything the shell lacks.
- How `installStateLibrary` persists `arrayKey` into scenes (the preset field for `savedCameras`
  is in `utils/defaultPresetFields.ts` per a comment in `engine-gmt/types/fractal.ts`; whether the
  generic install registers one for any app, or fluid-toy does it by hand, not opened).
- `engine-gmt/store/cameraSlice.ts` bodies of `captureCameraState`, `applyCameraState`,
  `isCameraModified`, `captureCameraThumbnail` - names and wiring read, bodies not.
- `fbxScene.ts` / `fbxBinary.ts` / `afxExport.ts` / `FbxExportDialog.tsx` not opened. That
  `buildFbxScene` needs nothing beyond `SceneSample` is inferred from `fbxExport.ts`'s call
  (`frames, fovDeg: scene.fovDeg, times`). Whether `afxExport` already uses `sceneSampler` not
  checked (the header says the sampler was "cloned" and unification "deferred", yet `fbxExport.ts`
  imports `./sceneSampler`).
- How DCC applications store FBX transforms (double vs float) - the "15 decades" figure is the
  double limit; real headroom in C4D / Blender is likely smaller and untested.
- The timeline's rules keyed on the `camera.` prefix (Camera group, skipped during record) - taken
  from BLUEPRINT.md section 8, not re-read in source.
- Whether any smoke covers Focus Lock or the focus pick tool.
- The page's power range, pitch clamp on `setView`, and GMT's ray basis in `ray.ts` - inherited
  open items from HANDOFF-MAPPING.md section 6.
- `engine/plugins/navigation/core/VirtualSpace.ts` and package F8 - not opened by me; figures are
  from the brief and last week's plan.
