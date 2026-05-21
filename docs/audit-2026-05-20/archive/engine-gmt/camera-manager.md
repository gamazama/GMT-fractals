---
source: engine-gmt/store/cameraSlice.ts
lines: 310
last_verified_sha: daf23caa86cc20a0aa40ca05f642e6db250bf1c5
additional_sources:
  - engine-gmt/features/camera_manager/CameraManagerPanel.tsx
  - engine-gmt/features/camera_manager/logic.ts
  - engine-gmt/features/camera_manager/index.ts
audited: 2026-05-20T09:38:43Z
audited_by: claude-opus-4-7
public_api:
  - installGmtCameraSlice
  - isCameraModified
  - SavedCameraPayload
  - SavedCamera
  - CameraManagerPanel
  - getDirectionName
  - calculateDirectionalView
  - DirectionalViewResult
  - CameraManagerFeature
depends_on:
  - e09-camera-plugin
  - g05-engine-gmt-features
  - g04-navigation
---

# GMT Camera Manager

GMT's consumer of the engine-core `installStateLibrary<T>` factory for saved cameras: capture/apply of split-precision `sceneOffset` + rotation quaternion + `targetDistance` + `OpticsState`, cardinal-axis label suggestion, worker-snapshot thumbnails, modified-marker dirty-check, formula-default reset, and the bespoke `CameraManagerPanel` shell that wraps the generic `StateLibraryPanel` primitive with GMT-specific directional-view presets and footer widgets.

## Public API

| Symbol | File:line | Kind | Notes |
|---|---|---|---|
| `installGmtCameraSlice` | engine-gmt/store/cameraSlice.ts:198 | function | One-shot installer; patches store + calls `installStateLibrary<SavedCameraPayload>` + wraps `undoCamera`/`redoCamera`. |
| `isCameraModified` | engine-gmt/store/cameraSlice.ts:93 | function | Exported so the panel can re-render the dirty marker on every live-camera change. |
| `SavedCameraPayload` | engine-gmt/store/cameraSlice.ts:41 | interface | `CameraState & { optics: OpticsState }` — the `T` for `installStateLibrary<T>`. |
| `SavedCamera` | engine-gmt/store/cameraSlice.ts:47 | type alias | `StateSnapshot<SavedCameraPayload>`. |
| `CameraManagerPanel` | engine-gmt/features/camera_manager/CameraManagerPanel.tsx:38 | React component | GMT shell around `<StateLibraryPanel>`; registered as `panel-cameramanager`. |
| `getDirectionName` | engine-gmt/features/camera_manager/logic.ts:8 | function | Cardinal-axis label suggestion ("Front View"/"Top View"/...). Threshold 0.98. |
| `calculateDirectionalView` | engine-gmt/features/camera_manager/logic.ts:37 | function | Pose + optics computation for FRONT/BACK/LEFT/RIGHT/TOP/BOTTOM/ISO presets. |
| `DirectionalViewResult` | engine-gmt/features/camera_manager/logic.ts:25 | interface | Return shape of `calculateDirectionalView`. |
| `CameraManagerFeature` | engine-gmt/features/camera_manager/index.ts:7 | DDFS FeatureDefinition | Tab-only stub, `params: {}` — real state lives in `cameraSlice`. |

## Architecture

The subsystem is a four-file composition over the engine-core state-library factory (see `e09-camera-plugin`):

| File | Role |
|---|---|
| engine-gmt/store/cameraSlice.ts | Composes `installStateLibrary<SavedCameraPayload>` with GMT capture/apply/isModified/suggestLabel/captureThumbnail/onReset; patches GMT-only helpers (`setSceneOffset`, `setCameraMode`, `_applyCameraTeleport`); wraps `undoCamera`/`redoCamera` to re-fire teleport. |
| engine-gmt/features/camera_manager/CameraManagerPanel.tsx | GMT panel shell — drops `<StateLibraryPanel>` plus a directional-view preset grid (FRONT/BACK/.../ISO/RESET), a New Camera toolbar, and a footer with `CameraPositionDisplay` + the `optics` `AutoFeaturePanel` + `CompositionOverlayControls`. |
| engine-gmt/features/camera_manager/logic.ts | Pure helpers — `getDirectionName` (quaternion → cardinal label, used by `suggestCameraLabel` at engine-gmt/store/cameraSlice.ts:129) and `calculateDirectionalView` (preset poses + optics for the toolbar buttons). |
| engine-gmt/features/camera_manager/index.ts | Empty-params DDFS `FeatureDefinition` whose only job is to register the "Camera Manager" tab. |

### `installGmtCameraSlice` flow (engine-gmt/store/cameraSlice.ts:198-310)

1. Subscribes to `FRACTAL_EVENTS.CAMERA_TELEPORT` and stashes the latest payload into `engine.pendingTeleport` so the GMT renderer-tick driver can replay it once the worker boots (engine-gmt/store/cameraSlice.ts:207-209).
2. Patches Zustand with three GMT-only helpers: `setSceneOffset` (split-precision-aware; emits `OFFSET_SET`), `setCameraMode`, and `_applyCameraTeleport` (private; used by the undo/redo wrappers — engine-gmt/store/cameraSlice.ts:213-245).
3. Calls `installStateLibrary<SavedCameraPayload>` with `panelId: 'Camera Manager'`, `arrayKey: 'savedCameras'`, `activeIdKey: 'activeCameraId'`, all eight action names (`addCamera`/`updateCamera`/`deleteCamera`/`duplicateCamera`/`selectCamera`/`reorderCameras`/`saveToSlot`/`resetCamera`), slot-shortcut category `'Camera'`, and explicit `menu: null` (engine-gmt/store/cameraSlice.ts:254-291).
4. Wraps the engine-core history-slice's `undoCamera`/`redoCamera` so each call also fires `CAMERA_TELEPORT` to warp the R3F camera to the restored pose synchronously after the diff applies (engine-gmt/store/cameraSlice.ts:296-308).

### Capture / apply payload

`SavedCameraPayload extends CameraState` (engine-gmt/store/cameraSlice.ts:41-43) with an extra `optics: OpticsState` field. Captured fields:

| Field | Source | Notes |
|---|---|---|
| `position` | hardcoded `{x:0,y:0,z:0}` | engine-gmt/store/cameraSlice.ts:68 — GMT keeps the world position in `sceneOffset`, not `position`. |
| `rotation` | `CameraUtils.getRotationFromEngine()` | engine-gmt/store/cameraSlice.ts:56 |
| `sceneOffset` | `VirtualSpace.split(unifiedPos.{x,y,z})` | engine-gmt/store/cameraSlice.ts:63-70 — split-precision `{high, low}` packed into `{x..z, xL..zL}`. |
| `targetDistance` | `engine.lastMeasuredDistance` (if in `(0, 1000)`) else `live.targetDistance` | engine-gmt/store/cameraSlice.ts:60-62 — raymarching surface probe with a sky-sentinel guard. |
| `optics` | shallow copy of `live.optics` | engine-gmt/store/cameraSlice.ts:72 |

Apply (`applyCameraState`, engine-gmt/store/cameraSlice.ts:77-87) emits `FRACTAL_EVENTS.CAMERA_TRANSITION` first, then `setState`s the three camera fields, then calls a probed `setOptics` (engine-gmt/store/cameraSlice.ts:49-51), then `engine.resetAccumulation()` — order matters because event listeners may pre-warm shaders before the store flip.

### `isCameraModified` tolerances (engine-gmt/store/cameraSlice.ts:93-119)

- Combined position L1 delta: `0.0001` (sums high+low parts; engine-gmt/store/cameraSlice.ts:105).
- Rotation quaternion L1 delta: `0.001` (engine-gmt/store/cameraSlice.ts:108-111).
- Optics: `camType` `±0.1`, `orthoScale` `±0.01`, `camFov` `±0.1` (engine-gmt/store/cameraSlice.ts:114-116).

### Directional-view preset semantics (engine-gmt/features/camera_manager/logic.ts:37-128)

`calculateDirectionalView(dir, currentOptics)`:

| Step | Behaviour |
|---|---|
| 1. Distance to centre | `CameraUtils.getUnifiedFromEngine().length()`, fallback `3.5` if `< 0.001` (engine-gmt/features/camera_manager/logic.ts:46-50). |
| 2. Surface distance | `engine.lastMeasuredDistance`; fallback to `distToCenter` if `>= 1000` or `<= 0` (engine-gmt/features/camera_manager/logic.ts:53-57). |
| 3. Quaternion | Hardcoded Euler per case — `Front=identity`, `Back=π y`, `Left=−π/2 y`, `Right=π/2 y`, `Top=−π/2 x`, `Bottom=π/2 x` (engine-gmt/features/camera_manager/logic.ts:65-89). |
| 4. Isometric | `pitch = −35.264°`, `yaw = 45°`, Euler order `YXZ` (engine-gmt/features/camera_manager/logic.ts:90-96). |
| 5. New position | `-forward * distToCenter`, where `forward = (0,0,-1) ⊗ q` (engine-gmt/features/camera_manager/logic.ts:100-101). |
| 6. Optics override | Axial views force `camType = 1.0` (ortho) and `dofStrength = 0.0`; `Isometric` returns no optics override and keeps perspective (engine-gmt/features/camera_manager/logic.ts:104-119). |

## Invariants

- **Load-order invariant (load-bearing).** `installGmtCameraSlice()` must run before any component reads `state.savedCameras.length`. Header at engine-gmt/store/cameraSlice.ts:20-22 documents this; the panel at engine-gmt/features/camera_manager/CameraManagerPanel.tsx:39 reads `s.savedCameras` directly and would crash on `undefined.length` otherwise. App boot satisfies this by calling `installGmtCameraSlice()` immediately after `registerGmtUi()` (app-gmt/main.tsx:101-107).
- **Menu wired by hand.** The `installStateLibrary` call sets `menu: null` (engine-gmt/store/cameraSlice.ts:280) — the bundle's auto-generated topbar menu is opted out so that GMT's hand-rolled Camera menu in engine-gmt/topbar.tsx:271-348 (Undo Move, Redo Move, Reset Position, View Manager, Camera Slots 1-9) owns the menu surface. The menu's Slot 1-9 click handlers (engine-gmt/topbar.tsx:331-347) route to `savedCameras[slotIndex]` + `selectCamera` / `saveToSlot` — the same library actions the `Mod+1..9` / `1..9` slot shortcuts hit, so menu clicks and hotkeys agree by construction.
- **Single source of truth for the saved-cameras array.** State lives in the engine-core state-library slice under `arrayKey: 'savedCameras'` (engine-gmt/store/cameraSlice.ts:256). `CameraManagerFeature` (DDFS) intentionally has `params: {}` (engine-gmt/features/camera_manager/index.ts:15) so DDFS does not declare a duplicate copy.
- **Dirty-marker re-render trigger.** `CameraManagerPanel` subscribes to `s.sceneOffset` and `s.cameraRot` purely as a render trigger (engine-gmt/features/camera_manager/CameraManagerPanel.tsx:55-56); `isCameraModified` reads live values from the store at call time. Dropping those subscriptions would freeze the dirty marker on the active row.
- **Reset semantics.** The library's `onReset` callback walks the active formula's `defaultPreset` (engine-gmt/store/cameraSlice.ts:159-196): collapses `sceneOffset + cameraPos` into a single split-precision offset, emits `RESET_ACCUM` then `CAMERA_TELEPORT`. The panel's RESET preset button additionally sets `camType:0, camFov:60, orthoScale:2` on optics (engine-gmt/features/camera_manager/CameraManagerPanel.tsx:68-71) — i.e. the panel's reset is a superset of the library's `resetCamera` action.
- **Undo/redo synchronicity.** Engine-core's history slice's `undoCamera`/`redoCamera` are synchronous; the wrapper (engine-gmt/store/cameraSlice.ts:300-307) fires `_applyCameraTeleport` immediately after, on the assumption the diff has already been applied to the store.

## Interactions with other subsystems

Four cross-subsystem boundaries:

| # | Boundary | Direction | Contract |
|---|---|---|---|
| 1 | e09-camera-plugin (engine-core `installStateLibrary` factory) | This subsystem CONSUMES the factory. | Provides `T = SavedCameraPayload` and the six lifecycle callbacks (`capture`, `apply`, `isModified`, `suggestLabel`, `captureThumbnail`, `onReset`). The factory owns the array + active id + bookkeeping actions. See engine-gmt/store/cameraSlice.ts:254-291. |
| 2 | g05-engine-gmt-features (DDFS `CameraManagerFeature`) | Dual-claimed `index.ts` per orchestrator decision. | The DDFS feature is a tab-only stub: `params: {}`, `tabConfig.label: 'Camera Manager'` matches the `panelId` (engine-gmt/features/camera_manager/index.ts:7-16). Real state lives in `cameraSlice` — no duplicate fields. |
| 3 | g04-navigation (engine-gmt/navigation/*) | Sibling input layer, NOT this saved-camera library. | g04 owns flight-stick / orbit / fly-cam input; this subsystem owns the persisted snapshots. Both write through `CameraUtils.teleportPosition` / `setSceneOffset` / `CAMERA_TELEPORT` (engine-gmt/features/camera_manager/CameraManagerPanel.tsx:63), so they share the same camera-state shape but never call each other directly. |
| 4 | engine-gmt/topbar.tsx (Camera menu) | This subsystem opts OUT; topbar wires it by hand. | `menu: null` at engine-gmt/store/cameraSlice.ts:280 disables auto-menu. Topbar at engine-gmt/topbar.tsx:271-348 registers the Camera menu (Undo/Redo Move, Reset Position, View Manager, Camera Slots 1-9) and routes each slot to the same `savedCameras`/`selectCamera`/`saveToSlot` actions the library hotkeys hit. |

Additional incidental couplings (not boundaries):

- `engine-gmt/features/ui.tsx:175` registers `CameraManagerPanel` as `panel-cameramanager`; `engine-gmt/panels.ts:469` references that componentId in the panel manifest.
- The bundle writes `savedCameras_savedToast` and `savedCameras_notifyDot` on the engine store; `engine-gmt/topbar.tsx:268` mounts the `<StateLibraryToast arrayKey="savedCameras" />` floating pill, and the menu's "View Manager" label reads the notify-dot via `dotFieldKey('savedCameras')` (engine-gmt/topbar.tsx:315).
- `onSavedToSlot` re-broadcasts the bundle's save as `FRACTAL_EVENTS.CAMERA_SLOT_SAVED` for legacy listeners or animation hooks (engine-gmt/store/cameraSlice.ts:285-290).

## Known issues / Phase 2 carry-in

- **Load-order fragility.** The `CameraManagerPanel` will crash on `s.savedCameras.length` if anything renders it before `installGmtCameraSlice()` runs (header at engine-gmt/store/cameraSlice.ts:20-22). Currently safe because `app-gmt/main.tsx:107` calls the installer right after `registerGmtUi()`, but there is no runtime guard or assertion — a future split-bundle or hot-reload reorder could regress this silently.
- **Stringly-typed action lookups.** Every store action accessed by the panel is read via `(s as any).addCamera` etc. (engine-gmt/features/camera_manager/CameraManagerPanel.tsx:41-47). Renaming an action in `installStateLibrary` config (engine-gmt/store/cameraSlice.ts:258-267) without grepping for the string name would break the panel at runtime with no type-check warning.
- **Survey q-062 disposition.** Coverage gap identified by `plans/doc-audit-state/survey/_followups/q-062.md` — `g04-navigation` did not touch these files; `g05-engine-gmt-features` only audited `index.ts`; `e09-camera-plugin` audited the factory but not the consumer. This module doc closes that gap.

## Historical context

No prior `dev/docs/` page covers this subsystem; the existing-doc-ref is **null**. The substantive in-source rationale lives in the header at engine-gmt/store/cameraSlice.ts:1-22, which:

- Splits ownership between "what this file owns" (GMT-specific capture/apply, label suggestion, thumbnail capture, modified-marker dirty-check, reset hook, undo/redo wrappers) and "what the factory owns" (the savedCameras array + activeCameraId + bookkeeping actions).
- Documents the load-order invariant explicitly (engine-gmt/store/cameraSlice.ts:20-22).

The panel-level rationale lives in the header at engine-gmt/features/camera_manager/CameraManagerPanel.tsx:1-16, which positions the panel as a "GMT shell around the engine-level `<StateLibraryPanel>` primitive" with toolbarBefore + footer slots owning the GMT-specific bits, and references an earlier design doc (`docs/engine/15_Camera_Manager_Extraction.md`) noted only by name.
