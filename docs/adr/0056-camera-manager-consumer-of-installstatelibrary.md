# ADR-0056: Camera Manager as a consumer of engine-core's `installStateLibrary` factory

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/store/cameraSlice.ts`, `engine-gmt/features/camera_manager/*`

## Context

GMT needed a saved-cameras UI: capture / apply / list / select / slot
hotkeys (`1-9`, `Mod+1-9`) / undo-redo, with a payload of split-precision
`sceneOffset` + rotation quaternion + `targetDistance` + `OpticsState`.

Other engine-core panels (Material library, Effect library, etc.) have the
same shape with different payloads. Implementing each as a bespoke Zustand
slice duplicated the array + active-id + bookkeeping logic (add / update /
delete / duplicate / select / reorder / saveToSlot / reset).

Alternatives considered:

- **Bespoke `cameraSlice` end to end.** Duplicates ~300 lines of array
  bookkeeping per library. Rejected.
- **Subclass / mixin pattern.** Doesn't compose cleanly with Zustand's
  functional API.
- **Build state-library as a feature** (DDFS). Mixes data-management with
  shader-feature injection — wrong layer.

## Decision

Engine-core ships an `installStateLibrary<T>` factory at
`engine/store/installStateLibrary.ts` that owns the `savedX` array,
`activeXId`, and the eight bookkeeping actions (`addX` / `updateX` /
`deleteX` / `duplicateX` / `selectX` / `reorderX` / `saveToSlot` / `resetX`).
The factory takes:

- `T` — the payload type (`SavedCameraPayload extends CameraState` for
  Camera Manager).
- Eight action name strings (`addCamera` / `updateCamera` / …).
- A `panelId` matching the UI panel's id.
- An `arrayKey` for the store field (`'savedCameras'`).
- An `activeIdKey` (`'activeCameraId'`).
- Six lifecycle callbacks: `capture`, `apply`, `isModified`, `suggestLabel`,
  `captureThumbnail`, `onReset`.
- A slot-shortcut category for the hotkey binder (`'Camera'`).
- A `menu` config OR `menu: null` to opt out of the auto-generated menu.

GMT's `installGmtCameraSlice()` at `engine-gmt/store/cameraSlice.ts:198`
composes the factory with GMT-specific lifecycle callbacks. The GMT-only
helpers (`setSceneOffset`, `setCameraMode`, `_applyCameraTeleport`) are
patched onto the store separately (cameraSlice.ts:213-245).

`CameraManagerFeature` (DDFS) is intentionally a tab-only stub with
`params: {}` (`engine-gmt/features/camera_manager/index.ts:7-16`) —
duplicating fields in the DDFS feature slice would create a shadow store.

The bespoke `CameraManagerPanel` (`engine-gmt/features/camera_manager/CameraManagerPanel.tsx`)
is a SHELL around the generic `<StateLibraryPanel>` primitive, adding GMT-
specific directional-view presets and footer widgets in `toolbarBefore` and
`footer` slots.

## Consequences

- **Load-order is load-bearing.** `installGmtCameraSlice()` must run BEFORE
  any component reads `s.savedCameras.length` — the panel reads `s.savedCameras`
  directly and would crash on `undefined.length` otherwise. `app-gmt/main.tsx:107`
  calls it right after `registerGmtUi()`. No runtime guard.
- **`as any` action lookups** in the panel (`(s as any).addCamera` etc. at
  `engine-gmt/features/camera_manager/CameraManagerPanel.tsx:41-47`) are
  the cost of the string-keyed action surface. Renaming an action in
  `installStateLibrary` config without grepping for the string name breaks
  the panel at runtime with no type-check warning. Typing them would
  require generic propagation through the factory's eight-action surface.
- **`undoCamera` / `redoCamera`** come from engine-core's history slice.
  The GMT wrapper at `cameraSlice.ts:296-308` re-fires `CAMERA_TELEPORT`
  after each call to warp the R3F camera to the restored pose. Engine-core's
  history slice is synchronous; the wrapper relies on the diff having
  applied before the teleport event fires.
- **Reset semantics.** The library's `onReset` callback walks the active
  formula's `defaultPreset` and emits `CAMERA_TELEPORT`. The panel's RESET
  preset button is a SUPERSET — additionally sets `camType:0, camFov:60,
  orthoScale:2` on optics. Both paths coexist.
- **Other library consumers** (Material library, Effect library, etc.)
  benefit from the same factory with their own payload types and lifecycle
  callbacks.
