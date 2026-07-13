# Camera Manager Extraction — Research & Proposal

**Status:** Research. No code changes yet — this doc proposes the shape, the
next session implements it.

**Goal:** Reuse GMT's saved-camera library in fluid-toy (and future 2nd apps)
to save user-curated views — without porting GMT-specific assumptions
(orbit-around-origin, optics, split-precision sceneOffset) into the engine.

The user's reframing during the planning chat:
> "the camera manager at its core is a state manager, and in that form would
> be most useful for a variety of applications."

That framing drives the proposal below. "Camera" stays as the user-facing
label; the engine-level primitive is generic named-state-snapshot.

---

## 1. What's there today (engine-gmt)

### CameraManagerPanel.tsx — 519 lines

Splits cleanly into four blocks:

| Block | Lines | Generic? | Notes |
|------|------|---------|-------|
| Cardinal toolbar (FRONT/BACK/LEFT/…/ISO/RESET) | ~20 | **No** | Calls `calculateDirectionalView` → reaches into `engine.lastMeasuredDistance` (raymarching probe), `optics.camType/orthoScale/dofStrength`, GMT's quaternion + ortho/perspective semantics, formula default-preset for RESET. |
| New / list rendering / drag-reorder / rename / dup / delete | ~150 | **Yes** | Pure UI over an array of `{id, label, thumbnail}` items. The only GMT-specific bit is the dirty-check (`isModified`) which diffs sceneOffset+rotation+optics; trivially abstractable as a callback. |
| Active-settings footer (`<CameraPositionDisplay>` + `<AutoFeaturePanel optics />`) | ~25 | **No** | Both are GMT-specific. App should own this slot. |
| Composition guides (Rule of Thirds, Golden, Grid, Spiral, …) | ~140 | **Yes**, but separately | This is a 2D viewport overlay — orthogonal to "saved cameras". Worth extracting as its own engine plugin (probably `@engine/viewport` / `@engine/composition-overlays`), not bundled with the state library. |

### cameraSlice.ts — 302 lines

State:
- `savedCameras: SavedCamera[]`
- `activeCameraId: string | null`

Actions: `addCamera, deleteCamera, updateCamera, selectCamera,
duplicateCamera, reorderCameras, saveToSlot, resetCamera`. Plus
`_applyCameraTeleport` and undo/redo wrappers.

Every action that captures or applies state reaches into:
- `CameraUtils.getUnifiedFromEngine()` — reads R3F camera position
- `CameraUtils.getRotationFromEngine()` — reads quaternion
- `engine.lastMeasuredDistance` — raymarching surface probe
- `VirtualSpace.split()` — split-precision math (GMT-specific)
- `s.optics, s.sceneOffset, s.cameraRot, s.targetDistance` — GMT camera fields
- `FractalEvents.emit(CAMERA_TELEPORT, …)` — triggers R3F warp
- `engine.resetAccumulation()` — fractal-specific
- `registry.get(formula).defaultPreset` — formula metadata

In other words: every capture/apply path is GMT-specific. The slice layer
is the GMT-specific glue; the *shape* it manages (`SavedCamera[]` +
`activeId`) is what's generic.

### shortcuts.ts — 38 lines

Ctrl+1-9 save / 1-9 recall. Already generic — calls `saveToSlot` and
`selectCamera`. No GMT internals. Reuses cleanly.

### `SavedCamera` shape

```ts
SavedCamera extends CameraState {
  id: string;
  label: string;
  thumbnail?: string;
  optics: OpticsState;          // GMT-specific
}
CameraState {
  position: { x, y, z };          // always (0,0,0) in canonical state
  rotation: { x, y, z, w };       // quaternion
  sceneOffset?: PreciseVector3;   // split-precision world offset (GMT)
  targetDistance?: number;
}
```

The generic envelope is `{id, label, thumbnail?, state: <T>}`. Everything
else is `<T>`-specific.

---

## 2. What fluid-toy needs

fluid-toy already has a *curated immutable* preset grid (`PresetGrid` over
`PRESETS`) — that's authoring-side, not user-saved. The gap is a
**user-saved library** the camera-manager extraction would fill.

The "view" state in fluid-toy is a 2D camera + julia parameter, all on the
`julia` slice:

```ts
{
  zoom: number;        // log scale, 0.00001 deep-zoom floor
  center: { x, y };    // 2D pan
  juliaC: { x, y };    // fractal parameter — user wants this saved with the view
  kind: 0|1;           // julia | mandelbrot
  // optionally: maxIter, power
}
```

Notable: julia c is part of "the view" for fluid-toy (it shapes the
fractal that drives the fluid). So fluid-toy's snapshot shape is **not** a
camera — it's a fractal-config-plus-camera blob. The user already
flagged this:

> "fluid toy's camera state might need extra precision, or might need to
> include julia coordinates as part of the data"

The library doesn't care what `T` contains — it just stores, lists,
restores it.

There's no thumbnail capture today (PresetGrid uses author-supplied label
chips). For user-saved views, fluid-toy would call its renderer's
canvas.toDataURL.

---

## 3. Proposed abstraction

Three layers, bottom-up:

### 3.1 `createStateLibrarySlice<T>(opts)` — engine/store/

Generic factory, app calls once per library it wants. Multiple
libraries per app supported (e.g. fluid-toy could have "Views" + "Color
Palettes" + "Brush Presets" simultaneously).

```ts
interface StateLibraryOptions<T> {
  /** Unique key on the store, e.g. 'savedCameras', 'savedViews'. */
  storeKey: string;
  /** Default name when label not supplied to add(). */
  defaultLabelPrefix?: string;       // 'Camera' / 'View'
  /** App reads current state from its own store/engine. Called by
   *  add/saveToSlot/update. */
  capture: () => T;
  /** App applies a snapshot back. Called by select/duplicate. */
  apply: (state: T) => void;
  /** Optional dirty-check for the modified-marker UI. */
  isModified?: (snapshot: T) => boolean;
  /** Optional thumbnail capture. Returns data URL or undefined. */
  captureThumbnail?: () => Promise<string | undefined>;
  /** Optional name suggestion (GMT uses this for "Front View" etc.). */
  suggestLabel?: () => string | undefined;
  /** Optional reset hook — called by selectCamera(null). GMT uses this
   *  to fall back to formula default. */
  onReset?: () => void;
}

interface StateLibrarySlice<T> {
  snapshots: StateSnapshot<T>[];
  activeId: string | null;

  add: (label?: string) => void;
  update: (id: string, patch: Partial<StateSnapshot<T>>) => void;
  delete: (id: string) => void;
  duplicate: (id: string) => void;
  select: (id: string | null) => void;
  reorder: (from: number, to: number) => void;
  saveToSlot: (slot: number) => void;
  reset: () => void;
}

interface StateSnapshot<T> {
  id: string;
  label: string;
  thumbnail?: string;
  state: T;
  createdAt: number;
}
```

Install pattern mirrors `installGmtCameraSlice()` — patches actions
into the store under `storeKey`-prefixed keys.

### 3.2 `<StateLibraryPanel>` — engine/components/

Pure-UI primitive. Takes the slice's data + actions as props:

```tsx
<StateLibraryPanel
  snapshots={snapshots}
  activeId={activeId}
  onSelect={...}
  onAdd={...}
  onUpdate={...}
  onDelete={...}
  onDuplicate={...}
  onReorder={...}
  isModified={cam => ...}
  emptyState="No saved cameras"
  // optional slots
  toolbarBefore={<DirectionalToolbar />}    // GMT-specific
  toolbarAfter={<button>Reset</button>}
  footer={<ActiveSettingsFooter />}
/>
```

Owns: list rendering, drag-reorder, thumbnail rendering, rename, modified
marker, action buttons, slot-shortcut hint. Exactly the ~150 lines from
the middle of CameraManagerPanel.

### 3.3 App-specific shells

GMT keeps a thin `CameraManagerPanel` that:
- Renders the cardinal toolbar in `toolbarBefore`
- Wires `cameraStateLibrarySlice` (with capture: read sceneOffset+rot+optics, apply: emit CAMERA_TELEPORT)
- Renders `<CameraPositionDisplay>` + `<AutoFeaturePanel optics>` in `footer`

fluid-toy gets a new `ViewLibraryPanel` that:
- Wires `viewStateLibrarySlice<JuliaViewState>` (capture: snapshot julia.*, apply: setJulia)
- Optionally renders zoom/center sliders in `footer` for fine-tuning

Composition overlays move to a separate engine plugin (or stay GMT-only;
not blocking).

---

## 4. Open questions for the implementation session

1. **Persistence.** GMT cameras serialize via GMF; fluid-toy probably wants
   localStorage. Is that the slice factory's concern (`opts.serialize` /
   `deserialize` hooks) or the app's? Lean toward: app's. Library exposes
   `getSnapshots()` / `setSnapshots()` for whoever wants to persist.
2. **Thumbnail capture timing.** GMT awaits `engine.captureSnapshot()` after
   `add` resolves and patches the snapshot via a second update. Generic
   pattern works, but means the API needs add() to return the new id.
3. **Undo/redo.** GMT's selectCamera fires CAMERA_TELEPORT which goes
   through the unified Transaction stack. Should the library opt into
   engine-core's history slice, or leave undo to the app?  → app-side; the
   library just emits an `onApplied(state, prev)` event.
4. **Search/filter UI.** User flagged uncertainty. Skip for v1 — easy to
   add later as a `searchable?: boolean` prop on `<StateLibraryPanel>`.
5. **Multiple libraries on one panel.** A future fluid-toy panel might
   want "Views" + "Color Palettes" stacked. Either two `<StateLibraryPanel>`
   instances side-by-side, or a tabbed shell. Not blocking — both work.
6. **Type sharing.** Should `JuliaViewState` (capture target) live in
   fluid-toy/types, or auto-derive from feature param defaults? → app type.

---

## 5. Implementation sequence (next session)

1. Land `createStateLibrarySlice<T>` + `StateSnapshot<T>` types.
2. Land `<StateLibraryPanel>` with Storybook-style smoke (or just a debug
   route in fluid-toy that renders 3 fake snapshots).
3. Refactor GMT's `cameraSlice.ts` + `CameraManagerPanel.tsx` to compose
   the new primitives. Cardinal toolbar + footer move to slot props.
   Type-check + visual parity with the current Camera Manager.
4. Add fluid-toy's `viewStateLibrarySlice` + `ViewLibraryPanel`. Wire it
   into the manifest. Add a "Save View" button somewhere user-discoverable
   (top bar?).
5. Optional: extract composition overlays to their own plugin.

Estimated effort: 1–1.5 sessions for steps 1-3 (the GMT refactor is the
delicate part), 0.5 session for step 4.
