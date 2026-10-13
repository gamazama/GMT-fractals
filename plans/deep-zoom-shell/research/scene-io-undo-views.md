# Scene IO, undo and saved views — research for the deep-zoom gmt-shell

Reader: scene-io-undo-views. Read-only pass, 2026-10-07, worktree `deep-zoom` (branch `deep-zoom-tool`).
Every fact names the file and symbol read. Things not opened are in "Unverified" at the end.

## 1. Verified facts

### 1.1 An app CAN add its own top-level scene field holding strings

- Registry: `utils/PresetFieldRegistry.ts`, `presetFieldRegistry.register({ key, serialize, deserialize })`.
  ```ts
  export interface PresetField {
      key: string;
      serialize: (state: any) => any;              // undefined = omit the key
      deserialize: (preset, set, get) => void;     // called even when the key is absent
  }
  ```
  The value is `any` and is never inspected. Strings, arrays of objects with strings, all pass.
- Save hook: `store/engineStore.ts` `getPreset` does `Object.assign(p, presetFieldRegistry.serializeAll(s))`
  when `options?.includeScene !== false`. `serializeAll(state)` is handed the engine store state, but a
  `serialize` may ignore it and read anything (the host handle).
- Load hook: `utils/PresetLogic.ts` `applyPresetState` ends with
  `presetFieldRegistry.applyAll(p, set, get)` — AFTER every feature setter and after animations.
- FREEZE: `register` throws `PresetFieldFrozenError` in dev (warn + no-op in prod) once the registry is
  frozen, and the message says "must register before createEngineStore runs". So the field lives in a
  module that imports ONLY `presetFieldRegistry` and is imported as a side effect before any
  store-touching import. Pattern already used: `engine/plugins/camera/presetField.ts` (26 lines),
  imported at `fluid-toy/main.tsx` line 26, before `installSceneIO` (line 51 import).
- Type: `types/preset.ts` `interface Preset` has an index signature at line 47 (`[key: string]: any`)
  (the line was grepped, the enclosing block not read — see Unverified). Apps add typed fields by
  declaration merging (stated in `utils/SceneFormat.ts` header).
- The plain-JSON path is lossless for strings: `utils/SceneFormat.ts` `serializeScene` is
  `JSON.stringify(preset, null, 2)`, `parseSceneJson` is `JSON.parse`.
- Migrations: `store/engineStore.ts` `loadPreset` first line `p = applyMigrations(p)`
  (`engine/migrations.ts`: `registerMigration({ version, id, apply })`, runs migrations with
  `version > preset.version`, helpers `moveField`, `renameSlice`). App example: `fluid-toy/migrations.ts`.
  A deep-zoom shell starts with zero migrations; the seam is there when a field moves.

### 1.2 What a scene file / PNG contains and how the canvas is supplied

- `getPreset` (store/engineStore.ts) builds: `version`, `name`, `formula`, `features{}` (every registered
  DDFS feature slice through `sanitizeFeatureState`), all preset fields, `lights: []`, `animations`,
  `lfosEnabled`, `sequence` (animation store), optional `author`, optional `documents` (only when
  `includeDocuments`).
- Every save path is `engine/plugins/SceneIO.tsx`:
  `saveScene` (text), `saveScenePng`, `saveSceneJpg`, `serializeCurrentScene` (autosave). Each calls
  `_onBeforeSerialize?.()` then `getPreset({ includeScene: true, includeDocuments: true })`.
- `installSceneIO(options)`: `getCanvas`, `parseScene`, `serializeScene`, `fileExtension`,
  `snapshotAnchor`, `onBeforeSerialize`. It registers the File menu (`menu.register({ id:'file', order: 29.5 })`),
  rows Load (10) / Save Scene (20) / Save PNG (21) / Save JPG (22) / Restore Last Session (30) /
  Autosave (31), a topbar snapshot button, and `Alt+S`.
- PNG: `saveScenePng` → `snapshotSceneToPng(canvas, preset, serializer)` (utils/SceneFormat.ts) →
  `canvas.toBlob('image/png')` → `injectMetadata(png, 'SceneData', text)` (utils/pngMetadata.ts, an
  UNCOMPRESSED iTXt chunk, UTF-8). So a PNG embeds exactly the same text as the scene file. Load reads
  `SceneData`, then legacy `FractalData`.
- The canvas MUST be an `HTMLCanvasElement` returned synchronously by `getCanvas()`; the only pixel
  source is `canvas.toBlob`. The PNG/JPG rows and the snapshot button are gated on `getCanvas` AT
  INSTALL TIME (`@assumption` on `installSceneIO`: registering it later does not back-fill them).
  fluid-toy passes `getCanvas: () => document.getElementById('ft-render-canvas')` (fluid-toy/main.tsx line 182).
- `onBeforeSerialize` is the seam for "canonical state lives outside the store": a synchronous flush
  before every `getPreset` on a save path. It is NOT called by `getShareString` or the dirty hash.

### 1.3 Loading, drops, claims

- `loadSceneFile(file)` is a pure decoder (PNG → iTXt, else text → parser). Caller must follow with
  `useEngineStore.getState().loadScene({ preset })`, never `loadPreset` directly.
- `loadPreset` calls `get().resetParamHistory()` — a scene load WIPES param undo.
- Window drop: `engine/components/SceneFileDropZone.tsx` reads the dropped files, then
  `const rest = await claimSceneFiles(dropped)`, then `loadSceneFile` + `loadScene` on the rest. Scrim
  text: `'.png snapshot · .gmf · .json'` plus `sceneFileClaimHints()`.
- `engine/plugins/SceneFileClaims.ts`: `registerSceneFileClaim({ id, take, hint? })`, never frozen.
  `take(files)` resolves to the files it did NOT take and owns all messages and side effects. A claim
  that throws is treated as taking nothing, so it must not throw after a side effect. "The scene loader
  reads any JSON as a preset, so a claim that sniffs loosely will steal scene files. Decide by an
  unambiguous content marker."
- The standalone page's path JSON has such a marker: `deep-zoom/bridge.ts` `DzPath`
  `{ format: 'gmt-mbulb-path', P, fovScale, frames: Array<DzView & { t?, move?, rot? }> }`.

### 1.4 Session autosave — two different mechanisms, both opt-in

- A. SceneIO autosave (`AUTOSAVE_KEY = 'gmt-autosave'`, recovery slot `gmt-autosave-recovery`): stashes
  `serializeCurrentScene()` while dirty; restore is manual (File ▸ Restore Last Session). The writer is
  `<UnsavedWorkGuard/>` (not opened). Keys are hardcoded `gmt-*` in SceneIO.tsx — NOT per app.
- B. `engine/plugins/Session.ts`: `SessionAdapter<T> { format, version, capture({compact}), validate(body), apply(session, 'boot'|'file') }`.
  `restoreSessionOnBoot(adapter, { storageKey, settings, preempted })` before first render,
  `installSessionAutosave(adapter, { storageKey, settings })` (interval + `pagehide`, writes only when
  the body changed, one `compact` retry on quota), `registerSessionFileSettings` (Save/Load rows in
  Settings). The body is plain JSON, so strings are fine. `settings` is a REQUIRED per-app store from
  `createAutosaveSettingsStore(keys)` (engine/store/autosaveStore.ts). Autosave is OFF until the user
  turns it on, and "Switching autosave OFF removes the stored session: off means the app keeps nothing."
  It deliberately never touches `getPreset` / `loadPreset`.
- Consequence: neither mechanism gives "my saved locations are still there tomorrow" by default.

### 1.5 The state library (saved views)

- `engine/store/createStateLibrarySlice.ts` `installStateLibrarySlice<T>(opts)` patches onto the engine
  store: `[arrayKey]: StateSnapshot<T>[]`, `[activeIdKey]`, plus actions named by `opts.actions`
  (add, update, delete, duplicate, select, reorder, saveToSlot, reset).
  ```ts
  export interface StateSnapshot<T> { id: string; label: string; thumbnail?: string; state: T; createdAt: number; }
  ```
  `T` is opaque. The only transforms are `opts.capture()`, `opts.apply(state, prev)` and
  `JSON.parse(JSON.stringify(src))` in `duplicate` — strings survive all three.
- Thumbnail: the app passes `captureThumbnail?: () => Promise<string | undefined>` (a data URL). It is
  awaited after add / update / saveToSlot and patched into the snapshot. fluid-toy's
  `captureCanvasThumbnail` (fluid-toy/viewLibrary.ts) draws the render canvas into a 128 px 2D canvas
  and returns `toDataURL('image/jpeg', 0.7)`. Nothing requires a canvas: any async string works, so
  `host.thumbnail(size)` plugs straight in.
- `isModified?: (snapshot: T) => boolean` drives the `*label` marker; `suggestLabel`, `onReset`,
  `onApplied(state, prev, snapshot)`, `onSavedToSlot` are optional hooks.
- "Persistence and undo are deliberately app-side. ... Libraries are therefore session-only unless the
  app opts in." Confirmed for fluid-toy: `savedViews` appears only in `fluid-toy/viewLibrary.ts`,
  `fluid-toy/components/ViewLibraryPanel.tsx` and a comment in `main.tsx` — no preset field, no
  storage. fluid-toy's saved views are lost on reload and are not in its scene files.
- GMT does persist its library: preset field `savedCameras` in `utils/defaultPresetFields.ts`
  (serialises the array when non-empty; on load sets the rows and `activeCameraId: null`), and makes
  library edits undoable with `registerHistoryProvider('savedCameras', …)` in
  `engine-gmt/store/cameraSlice.ts`.
- `engine/store/installStateLibrary.ts` `installStateLibrary<T>({ ...sliceOpts, panelId, slotShortcuts, menu })`
  adds number-key slots (Mod+N save, N recall, default 9) and a topbar menu (Open / Reset / Slot rows).
  The app still mounts its own `<StateLibraryPanel>` shell (fluid-toy: `components/ViewLibraryPanel.tsx`).
- Pitfall on `saveToSlot`: slots fill in order; `slotIndex > arr.length` is refused with a warning toast.
- Pitfall: action names must be unique across libraries (throws in dev), and a second install of the
  same `arrayKey` is a warn + no-op.

### 1.6 The Camera plugin

- `engine/plugins/Camera.ts`: `camera.register({ featureId, captureState, applyState })`; slots are
  `CameraSlot { id, label, state: Record<string, any>, timestamp }` in store field `cameraSlots`
  (10 entries, index 0 unused). State is "adapter-opaque JSON", so string fields survive; the preset
  field `cameraSlots` (`engine/plugins/camera/presetField.ts`) round-trips them through scene files.
- It has NO thumbnail, NO label editing, NO panel, NO undo. fluid-toy installs it with
  `installCamera({ hideShortcuts: true })` and uses the state library for the user-facing feature
  (comment at fluid-toy/main.tsx line 255, viewLibrary.ts: "Same key bindings as the legacy
  @engine/plugins/Camera slot system — that plugin's shortcuts are disabled").
- Verdict: the deep-zoom shell does not need the Camera plugin. One mechanism (state library) for
  saved locations; do not run both.

### 1.7 Undo

- `store/slices/historySlice.ts`: two scopes, `UndoScope = 'param' | 'camera'`, each its own stack.
- Param entries are made by a bracket: `beginParamTransaction()` snapshots, `endParamTransaction()`
  diffs with `JSON.stringify` per key and pushes ONE `Transaction` holding only the changed keys.
  `handleInteractionStart/End` are shims onto the same pair.
- Non-store state rides the param stack through `registerHistoryProvider(key, { capture, restore, changeOf?, context? })`
  (stored in the diff under `__ext__<key>`). `changeOf` = the part of a capture that decides whether the
  bracket changed anything; the WHOLE capture is stored and restored. `context: true` = never makes an
  entry, rides every entry.
- Camera entries: `pushCameraTransaction(camState)` writes a diff of exactly
  `cameraRot`, `sceneOffset`, `targetDistance` (hardcoded), debounced. It cannot carry a BigInt-string
  view. Do not use the camera scope for the deep zoom.
- `engine/plugins/Undo.tsx`: `UndoButton` / `RedoButton` act on scope `'param'`; tooltip is
  `Undo: ${peek.label ?? peek.scope}`. A param transaction is built as
  `{ scope: 'param', diff, timestamp }` — no label, so the tooltip reads "Undo: param".
- A scene load clears param history (`resetParamHistory` in `loadPreset`).

### 1.8 Share URL

- `store/engineStore.ts` `getShareString` = `getPreset({ includeScene: true })` →
  `generateShareStringFromPreset` (utils/Sharing.ts) → `UrlStateEncoder.encode`: diff against
  `getFullDefaultPreset(preset.formula)`, quantize, dictionary-alias, `pako.deflate`, base64url.
- Strings are kept verbatim — `quantize`:
  ```ts
  if (typeof obj === 'string') {
      if (obj.startsWith('data:image')) return undefined;   // thumbnails are stripped
      return obj;
  }
  if (typeof obj === 'number') { ... return parseFloat(obj.toFixed(5)); }
  ```
  So an 80-digit decimal STRING survives exactly; the same value as a NUMBER would be cut to 5 decimals.
  There is no length cap in the encoder. `getDiff` returns the current value whole when the base has
  no such key ("`typeof base !== 'object'` bail").
- Two traps in `quantize`: object keys starting with `is` are dropped
  (`Object.keys(obj).filter(k => !k.startsWith('is'))`), and numbers below 1e-9 become 0. Any deep-zoom
  number that must survive a share link (a surface distance of 1e-77) has to travel as a string.
- Preset fields are included in share strings (the share path uses `includeScene: true`); only
  `documents` is left out. Thumbnails vanish by the `data:image` rule.
- Decode needs `formula`: `parseShareString` peeks `formula` with `ROOT_SKELETON` and returns null if
  it is empty, then merges onto `getFullDefaultPreset(peeked.formula)`.

### 1.9 The dirty flag

- `store/engineStore.ts` `_contentHashNoCamera`: hashes `getPreset({ includeScene: true })` minus
  `version`, `name` and `CAMERA_DIRTY_KEYS = ['cameraRot', 'sceneOffset', 'targetDistance']` (a
  hardcoded const). Any other preset field counts as content. A live `dzView` field would mark the
  scene unsaved on every frame of flight.

### 1.10 What last week's shell holds (to be replaced)

- `deep-zoom/store.ts`: `Bookmark { id, name, createdAt, depth, thumb, view: DzView, note? }` in
  localStorage `gmt.deepzoom.bookmarks.v1` (thumbs are PNG data URLs; quota fallback strips them),
  `path: DzPath | null`, `onboarded` in `gmt.deepzoom.onboarded.v1`, `panel`, `toast`, `telemetry`.
- `deep-zoom/bridge.ts` `DzView { cam: [string,string,string], yaw, pitch, iters, power, phase:[n,n], light, falloff, color, cscale, surf }`;
  `DzBridge` has `getView()`, `setView(v)`, `thumbnail(size?) : string`, `diveTo(depth)`.

## 2. Blueprint for the deep-zoom shell

### 2.1 Three kinds of state, three homes

| State | Home | Why |
|---|---|---|
| Look / quality / formula knobs (power, phase, iters, light, falloff, colour, detail, reach, mode) | DDFS features | panels, undo, presets, keyframes, share for free |
| The exact camera: `cam` (3 strings), `yaw`, `pitch`, `surf` | preset field `dzView`, read from the host | not a DDFS param: strings, changes every frame |
| A recorded flight (`DzPath`) | preset field `dzFlight` | array of views with strings |
| Saved locations | state library `savedLocations` + preset field of the same key | thumbnails, labels, reorder, slots, panel |

`DzView` today mixes camera and look (`iters`, `power`, `phase`, `light`, …). In the shell the look half
is feature state; `dzView` should carry only what features do not: `{ cam, yaw, pitch, surf }` plus a
schema number. A saved location stores the full picture (see 2.3).

### 2.2 The scene file

Plain JSON, extension `json` (default; no custom serializer or parser needed):

```jsonc
{
  "version": 3, "name": "seahorse-e40", "formula": "mandelbulb-deepzoom",
  "features": { "dzFormula": { "power": 8, "iters": 400 }, "dzLook": { } },
  "animations": [], "lfosEnabled": true, "sequence": { },
  "dzView":   { "v": 1, "cam": ["-0.7436…(80 digits)", "0.1318…", "0.0000…"], "yaw": 1.2, "pitch": -0.3, "surf": "3.1e-41" },
  "dzFlight": { "format": "gmt-mbulb-path", "P": 400, "fovScale": 1, "frames": [ ] },
  "savedLocations": [ { "id": "…", "label": "Location 1", "thumbnail": "data:image/jpeg…", "createdAt": 0, "state": { } } ]
}
```

`formula` must be a non-empty constant: share decoding returns null without it (1.8).
`surf` and any other tiny number is written as a string (1.8 quantize trap).

`deep-zoom-shell/presetFields.ts` — imports only the registry and the host accessor module (which must
itself not import the store); imported from `main.tsx` right after `registerFeatures`, before the App:

```ts
import { presetFieldRegistry } from '../utils/PresetFieldRegistry';
import { getHost } from './host';            // module-level handle; no store import

presetFieldRegistry.register({
    key: 'dzView',
    serialize: () => getHost()?.getCamera() ?? undefined,       // strings straight from the renderer
    deserialize: (p: any) => { if (p.dzView) getHost()?.setCamera(p.dzView); else queueViewForHost(p.dzView); },
});
presetFieldRegistry.register({
    key: 'dzFlight',
    serialize: (s: any) => s.dzFlight ?? undefined,
    deserialize: (p: any, set) => { set({ dzFlight: isDzPath(p.dzFlight) ? p.dzFlight : null }); },
});
presetFieldRegistry.register({
    key: 'savedLocations',
    serialize: (s: any) => (Array.isArray(s.savedLocations) && s.savedLocations.length ? s.savedLocations : undefined),
    deserialize: (p: any, set) => {
        if (Array.isArray(p.savedLocations) && p.savedLocations.length)
            set({ savedLocations: p.savedLocations.filter(isLocationRow), activeLocationId: null });
    },
});
```

Notes for the builder:
- `dzView.serialize` reads the host, not the store, so no per-frame store write is needed and
  `installSceneIO({ onBeforeSerialize })` is not required for it.
- Boot order: a scene can be applied before the renderer is ready (boot restore, share link). The host
  module needs a one-slot "pending view" that it applies on ready. This is the same shape as the
  early-listener stash the engine already needs for env textures.
- `deserialize` runs after the feature setters, so the look is set before the camera lands.
- Validate rows on load (`isLocationRow`: `cam` is three strings). GMT's `savedCameras` comment in
  `utils/defaultPresetFields.ts` records an unvalidated row shape unmounting the whole React root.
- Set `activeLocationId: null` on load, as GMT does ("force-selecting camera 1 on load marks the slot
  modified").

### 2.3 Saved locations on the state library

```ts
installStateLibrary<DzLocationState>({
    panelId: 'Locations',
    arrayKey: 'savedLocations',
    activeIdKey: 'activeLocationId',
    actions: { add: 'addLocation', update: 'updateLocation', delete: 'deleteLocation', duplicate: 'duplicateLocation',
               select: 'selectLocation', reorder: 'reorderLocations', saveToSlot: 'saveLocationToSlot', reset: 'resetLocation' },
    defaultLabelPrefix: 'Location',
    capture: () => ({ view: host.getCamera(), look: pickLookParams(useEngineStore.getState()), depth: host.telemetry().depth }),
    apply: (s) => jumpTo(s),                               // see 2.5: one undo step
    isModified: (s) => !sameCam(s.view, host.getCamera()),
    captureThumbnail: async () => host.thumbnail(128),     // data URL from the renderer
    suggestLabel: () => `1e${Math.round(host.telemetry().depth)}`,   // name + number only
    onReset: () => jumpTo(HOME),
    slotShortcuts: { count: 9, category: 'Locations' },
    menu: { menuId: 'locations', slot: 'right', order: 29, title: 'Locations', align: 'end', width: 'w-48',
            openItem: { label: 'Locations panel…' }, resetItem: { label: 'Home' }, slotLabelPrefix: 'Location' },
});
```

- Mapping from `Bookmark`: `name → label`, `thumb → thumbnail`, `view → state.view`, `depth → state.depth`,
  `createdAt` same, `note → state.note`.
- Panel: mount the engine's `<StateLibraryPanel>` in an app shell registered in the component registry
  and referenced from the manifest (as fluid-toy's `ViewLibraryPanel.tsx` does). No hand-rolled list.
- Thumbnails as JPEG 128 px (fluid-toy's size and quality) — last week's PNG data URLs are what hit the
  storage quota.
- One-time import of last week's data: at boot, if `savedLocations` is empty and
  `gmt.deepzoom.bookmarks.v1` exists, map the rows in with a direct `setState` (the way
  `seedDefaultViews` seeds without calling `capture`), then remove the key.
- Make library edits undoable the GMT way: `registerHistoryProvider('savedLocations', { capture, restore })`
  and bracket add / delete / reorder with `beginParamTransaction` / `endParamTransaction`.

### 2.4 Persistence across reloads

The library is in the scene file and in scene PNGs through the preset field. Across a reload it needs
one of:
- (recommended interim) a small subscriber in the shell that mirrors `savedLocations` to one
  localStorage key via `store/safeLocalStorage`, with the strip-thumbnails-on-quota fallback that
  `deep-zoom/store.ts` `saveBookmarks` already has, and reads it back before first render. This is the
  generic gap G1 below.
- `engine/plugins/Session.ts` with a `SessionAdapter` whose body is `{ view, look, flight, locations }`.
  Correct mechanism for "come back where I was", but it is opt-in and switching it off deletes the
  stored session, so it cannot be the only home of a library the user expects to keep.

Use Session for the working session (current view + look + flight, `compact` drops thumbnails), with
its own `createAutosaveSettingsStore` keys (e.g. `gmt.dz.autosave-*`) handed to both Session and
`registerCoreSettings({ autosave })`. Do NOT mount `<UnsavedWorkGuard/>`-style SceneIO autosave as well:
its keys are the hardcoded `gmt-autosave*` shared with app-gmt on the same origin.

### 2.5 "Jumped to another view" as one undo step

```ts
let jumpSeq = 0;
registerHistoryProvider('dzView', {
    capture: () => ({ seq: jumpSeq, view: host.getCamera() }),
    restore: (s: any) => { if (!s) return; jumpSeq = s.seq; host.setCamera(s.view); },
    changeOf: (s: any) => s?.seq,          // flying never makes an entry; a jump does
});

export const jumpTo = (loc: DzLocationState) => {
    const st = useEngineStore.getState();
    st.beginParamTransaction();
    jumpSeq++;
    applyLookParams(loc.look);             // feature setters, inside the same bracket
    host.setCamera(loc.view);
    st.endParamTransaction();
};
```

- Why `changeOf`: the view changes on every frame of flight. With a plain provider every slider drag
  made while moving would carry a view change and undoing the slider would also throw the camera
  back. With `changeOf: seq`, only a jump is a change; the entry stores the whole capture, so undo
  restores the exact strings.
- One entry covers camera + look because both happen inside one bracket.
- Use this same `jumpTo` for: selecting a saved location, Home, `diveTo` start, loading a dropped
  path's first frame, undoing a recorded-flight playback.
- `installUndo()` gives Ctrl+Z / Ctrl+Y and the two topbar buttons unchanged.
- Loading a scene file clears the stack (engine behaviour, 1.7) — not a jump.

### 2.6 PNG snapshots

`installSceneIO({ getCanvas })` with the renderer's canvas:
- iframe stage: `() => iframe.contentDocument?.querySelector('canvas') ?? null` (same origin).
- module stage: the canvas the shell hands `createDeepZoom(canvas, options)`.
Put this behind the host interface as `host.canvas(): HTMLCanvasElement | null` so SceneIO never knows
which. Pass it at the first `installSceneIO` call or the PNG rows never appear (1.2). If `toBlob` on
the live WebGL canvas comes back blank, see gap G3.

### 2.7 The standalone page's path JSON dropped on the window

Mount `<SceneFileDropZone/>` (engine component) and register one claim:

```ts
registerSceneFileClaim({
    id: 'deep-zoom.path',
    hint: 'flight paths open in the recorder',
    take: async (files) => {
        const rest: File[] = [];
        for (const f of files) {
            let path: DzPath | null = null;
            if (/\.json$/i.test(f.name) || f.type === 'application/json') {
                try { const j = JSON.parse(await f.text()); if (j?.format === 'gmt-mbulb-path' && Array.isArray(j.frames)) path = j; } catch { /* not ours */ }
            }
            if (!path) { rest.push(f); continue; }
            try { acceptFlight(path); } catch (e) { showToast('Flight path could not be read', 'error'); }  // never rethrow after a side effect
        }
        return rest;
    },
});
```

- Marker is `format === 'gmt-mbulb-path'` — unambiguous, as the seam requires. A real scene file has
  no top-level `format`, so the claim never steals one.
- `acceptFlight` = one `jumpTo`-style bracket: `set({ dzFlight: path })`, jump to frame 0, open the
  recorder panel, toast with the frame count.
- The same claim covers File ▸ Load Scene (SceneIO's `LoadSceneMenuItem` calls `claimSceneFiles` first).
- Last week's exported bookmark lists (an array of `Bookmark`) can get a second claim, id
  `deep-zoom.locations`, keyed on "array whose rows have `view.cam` of three strings".

### 2.8 Share links

`getShareString` works as is and carries `dzView` exactly (strings are not quantized). Before encoding,
the shell's share row should drop `savedLocations` and `dzFlight` from the preset (call
`generateShareStringFromPreset` on a `getPreset` copy with those keys deleted) — see gap G4. Rough
size: three 80-digit strings are about 240 characters and digits deflate to roughly 40 %, so the view
adds on the order of 150 base64 characters. A 100-frame flight would add on the order of 15 000
(estimate, not measured), which is why it stays out of links.

## 3. Gaps (generic statement, then the interim workaround)

- G1. A state library has no persistence option. "Persistence and undo are deliberately app-side"
  (`createStateLibrarySlice.ts`); fluid-toy's views vanish on reload. Generic extension:
  `installStateLibrary({ persist: { storageKey, compact?: (row) => row } })` — restore before first
  render, write on change, strip thumbnails on quota. fluid-toy would pick it up too. Interim: the
  shell-side mirror in 2.4.
- G2. The dirty hash's camera exclusion is a hardcoded list (`CAMERA_DIRTY_KEYS` in
  `store/engineStore.ts`). A camera kept in an app preset field marks the scene unsaved whenever the
  user moves. Generic extension: `PresetField.dirty?: false` (or `kind: 'camera'`) read by
  `_contentHashNoCamera`. Interim: do not mount the unsaved-work guard in this shell (Session is the
  autosave, 2.4), so the flag gates nothing.
- G3. SceneIO's only pixel source is a synchronous `HTMLCanvasElement` + `canvas.toBlob`. A renderer
  that can only hand back an image (a worker, a cross-realm or non-preserved WebGL buffer, a
  higher-quality still) cannot supply the PNG. Generic extension:
  `installSceneIO({ getSnapshot?: () => Promise<Blob | null> })`, preferred over `getCanvas` when
  present, feeding `embedScenePng`. Interim: `host.canvas()`; if blank, the host keeps a 2D canvas it
  redraws from the renderer's own capture and returns that.
- G4. A preset field cannot say "leave me out of share links" (only `documents` is excluded, by the
  `includeDocuments` flag). Generic extension: `PresetField.share?: false`, honoured when `getPreset`
  is called for the share path. Interim: delete the keys from the preset copy before encoding (2.8).
- G5. Param undo entries have no label (`{ scope: 'param', diff, timestamp }`), so the Undo tooltip
  cannot say "Undo: Jump to Location 3". Generic extension: `endParamTransaction(label?)`. Interim:
  accept "Undo: param".
- G6. SceneIO's autosave keys are global constants (`gmt-autosave*`), not per app, while autosave
  SETTINGS are per app. Two shells on one origin would share the recovery slot. Generic extension: an
  `autosaveKeyPrefix` option on `installSceneIO`. Interim: this shell uses Session only.
- G7. Share-link quantize drops object keys starting with `is` and zeroes numbers under 1e-9 with no
  opt-out. Interim: tiny values as strings, no `is*` keys inside `dzView` / location state.
- G8 (ordering, not a missing feature). Preset fields can be applied before the renderer exists.
  Interim: the pending-view slot in the host module (2.2).

## 4. Unverified

- `getParamSnapshot` in `store/slices/historySlice.ts` (lines about 150–245) was not read: which store
  keys a param bracket snapshots, and whether a plain store field such as `dzFlight` or
  `savedLocations` is captured without a provider. Assume NOT; register providers.
- Whether `undo('param')` / `redo('param')` call provider `restore` exactly as described (bodies at
  lines 372–410 only skimmed); the GMT `savedCameras` and GX providers rely on it.
- `types/preset.ts` line 47 `[key: string]: any` — the enclosing block was not read; it may belong to
  a nested object rather than `Preset` itself. If so, add fields by declaration merging.
- `sanitizeFeatureState`, `serializeDocuments` / `restoreDocuments` and the documents-provider
  registry (possibly a better home for a user-level library than G1's interim) — not opened.
- `<UnsavedWorkGuard/>`, `engine/store/autosaveStore.ts`, `store/sessionEnvelope.ts`,
  `registerSessionFileSettings` body, Session.ts lines 140–331 — not opened; described from the
  Session.ts header and the engine-plugins rule.
- `engine/components/StateLibraryPanel` props and `StateLibraryToast` — not opened.
- `utils/pngMetadata.ts` chunk-length handling for large payloads (a scene with 50 thumbnails could be
  several hundred KB of iTXt) — only the export list and the "uncompressed" flag were read.
- `UrlStateEncoder.getDiff` / `deepMerge` bodies and dictionary aliasing of unknown top-level keys —
  only `quantize` and `encode` were read in full; the "no base key returns current whole" claim comes
  from the JSDoc fragment at line 300.
- Whether `canvas.toBlob` on the deep-zoom page's WebGL canvas returns pixels outside its own frame
  callback (`preserveDrawingBuffer`), and whether `host.thumbnail` can return JPEG — the standalone
  page was not opened in this pass.
- The share-size numbers in 2.8 are arithmetic estimates, not measurements.
- `engine/migrations.ts` beyond line 60 and `fluid-toy/migrations.ts` beyond line 40.
