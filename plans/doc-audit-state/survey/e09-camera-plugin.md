---
subsystem_id: e09-camera-plugin
audited_at: 2026-05-19T00:00:00Z
files:
  - path: engine/plugins/Camera.ts
    blob_sha: aad00f324a682b05fe8a2158e05513ac1f86cc4f
    lines: 1-164
  - path: engine/plugins/camera/presetField.ts
    blob_sha: 3028674d06d5923d2b72e1ac79540737eba32410
    lines: 1-26
  - path: engine/appHandles.ts
    blob_sha: 270950a5562e533d3848372054d385750db9d060
    lines: 1-118
  - path: engine/migrations.ts
    blob_sha: a035384f7e988dbe3fe4b6176d45ff9ba951b5f6
    lines: 1-149
  - path: engine/store/createStateLibrarySlice.ts
    blob_sha: 1552a37f76769f844ae830dbe9c2190cb3bf85c1
    lines: 1-363
  - path: engine/store/installStateLibrary.ts
    blob_sha: 7fc1cceef5e70f76ee5f486a36bb9efa3c9a6378
    lines: 1-255
---

## Public API surface

**`engine/plugins/Camera.ts`** (adapter-based slot plugin)
- `interface CameraAdapter { featureId; captureState(); applyState(state) }` — `Camera.ts:37-44`.
- `interface CameraSlot { id; label; state; timestamp }` — `Camera.ts:46-51`.
- `camera.register(adapter)` — `Camera.ts:72-74`.
- `camera.saveSlot(n, label?)` / `recallSlot(n)` / `clearSlot(n)` / `getAllSlots()` / `setAllSlots(slots)` — `Camera.ts:77-116`. Slot range 1..9 (`Camera.ts:58`).
- `interface InstallCameraOptions { hideShortcuts? }` — `Camera.ts:119-122`.
- `installCamera(options?)` — `Camera.ts:124-155`; `uninstallCamera()` — `Camera.ts:157-164`.

**`engine/plugins/camera/presetField.ts`** (side-effect submodule)
- No exports. Side-effect-only: registers `cameraSlots` with `presetFieldRegistry` at module-eval time — `presetField.ts:20-26`.

**`engine/appHandles.ts`** (typed singletons, NOT camera-specific)
- `interface AppHandles<T> { name; ref; useSnapshot(); subscribe(fn); notify(); reset() }` — `appHandles.ts:46-68`.
- `defineAppHandles<T>(name, initial): AppHandles<T>` — `appHandles.ts:77-118`.

**`engine/migrations.ts`** (preset migration layer, NOT camera-specific)
- `registerMigration({ version, id, apply })` — `migrations.ts:55-60`.
- `listMigrations()` — `migrations.ts:63-66`.
- `applyMigrations(preset)` — `migrations.ts:76-92`.
- Helpers: `moveField(preset, from, to)` — `migrations.ts:115-125`; `renameSlice(preset, from, to)` — `migrations.ts:132-141`; `renameField(preset, slice, from, to)` — `migrations.ts:144-149`.

**`engine/store/createStateLibrarySlice.ts`** (generic snapshot library)
- Constants/helpers: `TOAST_FIELD_SUFFIX` / `DOT_FIELD_SUFFIX`, `toastFieldKey(arrayKey)`, `dotFieldKey(arrayKey)` — `createStateLibrarySlice.ts:37-43`.
- `interface StateLibrarySavedToast { slot; label; tone: 'success'|'warning'; message }` — `createStateLibrarySlice.ts:48-58`.
- `interface StateSnapshot<T> { id; label; thumbnail?; state: T; createdAt }` — `createStateLibrarySlice.ts:62-72`.
- `interface StateLibraryActionNames { add; update; delete; duplicate; select; reorder; saveToSlot; reset }` — `createStateLibrarySlice.ts:76-85`.
- `interface StateLibraryOptions<T>` — `createStateLibrarySlice.ts:87-139` (arrayKey, activeIdKey, actions, defaultLabelPrefix, capture, apply, isModified?, captureThumbnail?, suggestLabel?, onReset?, onApplied?, onSavedToSlot?, toastDurationMs?, dotDurationMs?).
- `installStateLibrarySlice<T>(opts)` — `createStateLibrarySlice.ts:143-363`.

**`engine/store/installStateLibrary.ts`** (slice + shortcuts + menu bundle)
- `interface SlotShortcutOptions { count?; category?; saveModifier?; savePrefix?; recallPrefix? }` — `installStateLibrary.ts:30-41`.
- `interface StateLibraryMenuOptions { menuId; slot; order; icon?; title?; label?; align?; width?; openItem?; resetItem?; slotItems?; slotLabelPrefix? }` — `installStateLibrary.ts:45-74`.
- `interface InstallStateLibraryOptions<T> extends StateLibraryOptions<T> { panelId; slotShortcuts?; menu? }` — `installStateLibrary.ts:76-85`.
- `installStateLibrary<T>(opts)` — `installStateLibrary.ts:100-110`.

## Architecture (file:line citations)

- `@engine/camera` is an **adapter-based slot recorder**, NOT a camera model — it stores adapter-opaque JSON keyed by 1..9 (`Camera.ts:1-25`). Apps register a `CameraAdapter` describing how to capture/apply their own camera shape (2D, 3D orbit, 6-DOF, …) (`Camera.ts:37-44`).
- Slot storage lives directly on `useEngineStore` under `cameraSlots: (CameraSlot|null)[]` (index 0 unused, 1..9 used) via raw `setState`, bypassing DDFS because slot state is "UI meta" (`Camera.ts:56-68`).
- Persistence is via the preset-field registry — registered in a **separate submodule** `camera/presetField.ts` (`presetField.ts:20-26`) imported as an **early side effect** before any store-touching import, because importing `Camera.ts` pulls in `useEngineStore` which freezes the preset-field registry (`Camera.ts:29-35`, `presetField.ts:1-15`).
- Singleton state (`_adapter`, `_installed`) is module-scoped (`Camera.ts:53-54`); `installCamera` is idempotent (`Camera.ts:125-126`) and dev-exposes `window.__camera` (`Camera.ts:132-134`).
- Hotkeys: `Mod+1..9` save, `1..9` recall — registered through the `Shortcuts` plugin (`Camera.ts:139-154`); `hideShortcuts: true` skips registration (`Camera.ts:136`). `uninstallCamera` tears down all 18 shortcut entries (`Camera.ts:157-164`).
- Capture/apply are unguarded against adapter throws — `_adapter.captureState()` and `_adapter.applyState(slot.state)` run inline (`Camera.ts:79`, `Camera.ts:97`).
- `appHandles.ts` is a general typed-singleton primitive co-located with the engine but **not** camera-specific. Solves the React-context gap between `customUI` panels and the canvas subtree (`appHandles.ts:1-42`). Pairs `ref.current` with a `rev` counter so `useSyncExternalStore` value-equality re-runs only on explicit `notify()` (`appHandles.ts:88-97`).
- `appHandles` dev-publishes each handle to `globalThis.__appHandles[name]` only when `import.meta.env.DEV` is true (`appHandles.ts:113-115`).
- `migrations.ts` is the preset-load migration layer (`migrations.ts:1-37`). Lazy-sorts on first use (`migrations.ts:64-65`, `migrations.ts:78-79`); re-registering the same `id` replaces the entry (HMR-safe) (`migrations.ts:56-58`).
- Migration version tag lives at `preset._migrationVersion`; only migrations with `version > before` run, and `afterVersion` is tagged back onto the preset (`migrations.ts:79-90`). Errors are caught and logged, not thrown — the migration chain continues (`migrations.ts:82-87`).
- `moveField` deletes the source key after copying, preventing stale round-trips (`migrations.ts:115-125`); `renameSlice` keeps destination on conflict (`migrations.ts:136-140`).
- `createStateLibrarySlice` is the **second-generation** camera library — generic snapshot factory (cameras, views, palettes, …). Library is shape-agnostic; app supplies `capture()` / `apply()` (`createStateLibrarySlice.ts:1-28`).
- Slice install is **idempotent with a warn** — detected by both the array key and the `add` action being present (`createStateLibrarySlice.ts:150-154`).
- Action names are configurable per-install via `StateLibraryActionNames` so multiple libraries (`addCamera` vs `addView`) coexist (`createStateLibrarySlice.ts:75-97`).
- Two transient store fields per library: `${arrayKey}_savedToast` and `${arrayKey}_notifyDot`, with self-clearing timers (default 2s/5s) (`createStateLibrarySlice.ts:165-183`). Warning toasts don't light the notify-dot (`createStateLibrarySlice.ts:178-182`).
- `add` returns the new snapshot id (`createStateLibrarySlice.ts:227`) so callers can await thumbnail patch; `captureThumbnail` is awaited and patched in a second array write (`createStateLibrarySlice.ts:215-226`).
- `update` with no patch means "overwrite snapshot with current live state" — drives the floppy-disk save button (`createStateLibrarySlice.ts:236-246`).
- `select(null)` clears active only (no apply) (`createStateLibrarySlice.ts:276-279`); `select(id)` captures prev → applies → calls `onApplied(state, prev, snap)` (`createStateLibrarySlice.ts:193-198`, `createStateLibrarySlice.ts:281-285`).
- `duplicate` deep-clones via `JSON.parse(JSON.stringify(src))`, nanoid + "(copy)" label, inserts adjacent, and applies — driving an active-snapshot side-effect (`createStateLibrarySlice.ts:258-274`).
- `saveToSlot` enforces sequential fill: `slotIndex > arr.length` rejects with a warning toast rather than silently appending out-of-order (`createStateLibrarySlice.ts:297-313`). `slotIndex < arr.length` overwrites, `slotIndex === arr.length` appends (`createStateLibrarySlice.ts:315-348`).
- `reset` clears `activeIdKey` and calls `onReset?.()` — apps use this to fall back to formula default presets (`createStateLibrarySlice.ts:358-361`).
- `installStateLibrary` bundles three concerns: slice install, slot shortcuts, topbar menu — each opt-out (`installStateLibrary.ts:1-19`, `installStateLibrary.ts:100-110`).
- Toast component is auto-mounted as a topbar slot at `order + 0.5` next to the menu (`installStateLibrary.ts:112-126`); apps with `menu: null` (GMT) mount `<StateLibraryToast arrayKey>` manually.
- Slot shortcut handlers read the action functions off the store at fire time (`installStateLibrary.ts:147-150`, `installStateLibrary.ts:157-163`) — robust against install order.
- Menu's "Open" item gets a dynamic label that appends `  ●` while the notify-dot is lit (`installStateLibrary.ts:191-204`); slot items use `✓` when filled, fall back to save when empty (`installStateLibrary.ts:222-253`).

## Invariants and gotchas

- **`@engine/camera` is a small adapter-based recorder, separate from `installStateLibrary`.** Two snapshot systems coexist. `Camera.ts:53-67` writes `cameraSlots` directly via raw `setState`; `installStateLibrary` writes app-named keys (`savedCameras`, `savedViews`) via configured action names. They do not share storage or actions — `app-gmt` calls `installCamera({ hideShortcuts: true })` (`app-gmt/main.tsx:245`) **specifically to disable the adapter-based shortcuts** so they don't tie-break against `installGmtCameraSlice`'s state-library shortcuts (`docs/CHANGELOG_DEV.md:384`).
- **Submodule side-effect import is mandatory and ordering-sensitive.** `presetField.ts` must be imported as an early side effect before any store-touching import — otherwise the preset-field registry freezes and `cameraSlots` will silently not round-trip (`Camera.ts:29-35`, `presetField.ts:1-15`). Apps follow the pattern at `fluid-toy/main.tsx` / `fractal-toy/main.tsx`.
- **`cameraSlots` index 0 is unused.** `SLOT_COUNT = 10` but valid slots are 1..9 (`Camera.ts:58`, `Camera.ts:78`).
- **`camera.register` does NOT trigger `installCamera`** (or vice-versa). Without `register`, all save/recall ops silently return false (`Camera.ts:78`, `Camera.ts:94`). The plugin allows installing before adapter registration.
- **Slot save with no adapter is silent.** `saveSlot` returns `false` but produces no console warning, making a missing-adapter bug hard to detect.
- **`uninstallCamera` does not clear `cameraSlots` from the store** — only nukes shortcuts and the adapter (`Camera.ts:157-164`). Data persists; subsequent re-install re-uses it.
- **`appHandles` global is dev-only.** Production smoke tests can't read `globalThis.__appHandles` — gated by `import.meta.env.DEV` (`appHandles.ts:113-115`).
- **`migrations` re-sort is lazy and shared.** The `_sorted` flag is module-global; first `applyMigrations` after any new `registerMigration` re-sorts (`migrations.ts:64-65`, `migrations.ts:78-79`).
- **Migration `apply` returning falsy keeps the input preset.** `preset = m.apply(preset) ?? preset` (`migrations.ts:84`) — explicit `return null` is treated as "no change" rather than "void output".
- **`saveToSlot` rejection with a warning toast is intentional.** `slotIndex > arr.length` (e.g. Mod+5 with 2 saved entries) used to silently append as the 3rd entry labelled "Camera 5" — now rejected with a warning (`createStateLibrarySlice.ts:299-313`).
- **`duplicate` triggers `applySnap` immediately** (`createStateLibrarySlice.ts:273`) — duplicating an inactive snapshot makes it active and re-applies its state. Surprising if the user expected a pure copy.
- **`update` with no patch awaits thumbnail capture inline** (`createStateLibrarySlice.ts:241-245`) — the "Save" button is async; rapid double-click could race two captures into the array (no de-dup).
- **`installStateLibrary` mounts the toast topbar slot ONLY when `menu` is provided.** Apps with `menu: null` must mount `<StateLibraryToast arrayKey>` themselves (`installStateLibrary.ts:96-99`, `installStateLibrary.ts:106-109`).
- **Slot-shortcut count vs menu slot count divergence.** Menu derives count from `opts.slotShortcuts.count` when slotShortcuts is an object, else hard-codes 9 (`installStateLibrary.ts:228`). If an app passes `slotShortcuts: false` and uses default menu, slot items still render 1..9 even though no shortcuts exist.
- **`activeIdKey` only updates on add/select/delete-of-active/duplicate.** A direct `update` does NOT change `activeIdKey` (`createStateLibrarySlice.ts:230-250`); selection is preserved across overwrites.

## Drift from existing doc (`dev/docs/engine/15_Camera_Manager_Extraction.md`)

The doc is explicitly marked **Status: Research. No code changes yet** (line 3) — it's the design proposal that drove the StateLibrary implementation. It does not document the shipped code; substantial drift is expected.

| Doc claim | Code reality | Severity |
|---|---|---|
| "Research. No code changes yet" (`15:3`) | `createStateLibrarySlice.ts`, `installStateLibrary.ts`, `installGmtCameraSlice`, `<StateLibraryPanel>`, `<StateLibraryToast>`, and a fluid-toy `viewLibrary.ts` all ship today. Implementation sequence at `15:243-257` is complete (steps 1-4); composition overlays (step 5) status not surveyed here. | **High** — entire doc status is stale. |
| Proposed `storeKey: string` option (`15:131`) | Shipped API uses **two** keys: `arrayKey` + `activeIdKey` (`createStateLibrarySlice.ts:90-93`), not a single `storeKey`. | High |
| Action names "patches actions into the store under `storeKey`-prefixed keys" (`15:174-175`) | Shipped uses an explicit `StateLibraryActionNames` map (`createStateLibrarySlice.ts:76-85`) so GMT keeps `addCamera`/`selectCamera` literal names. No `storeKey` prefixing. | High |
| Slice interface `{ add, update, delete, duplicate, select, reorder, saveToSlot, reset }` returns void (`15:151-163`) | `add` returns `Promise<string>` (the new id) (`createStateLibrarySlice.ts:227`); `update`, `saveToSlot` are async to await `captureThumbnail`. | Medium |
| `add` is sync, label-only (`15:155`) | Async, label-optional, returns new id (`createStateLibrarySlice.ts:206-228`). | Medium |
| Open Q "thumbnail capture timing… means the API needs add() to return the new id" (`15:227-230`) | Resolved — `add` returns `Promise<string>` (`createStateLibrarySlice.ts:227`). | Resolved |
| Open Q "Undo/redo… library just emits an `onApplied(state, prev)` event" (`15:231-234`) | Implemented as `onApplied(state, prev, snapshot)` (`createStateLibrarySlice.ts:128-129`). | Resolved |
| Open Q "Persistence… library exposes getSnapshots / setSnapshots" (`15:222-226`) | Library does NOT expose getter/setter helpers; apps read `useEngineStore.getState()[arrayKey]` directly. Persistence is app-side as proposed. | Medium |
| Proposed `<StateLibraryPanel>` props shape (`15:181-198`) | Panel exists at `components/StateLibraryPanel.tsx` (not audited here). Shape divergence not assessed in this audit. | Open question |
| `installGmtCameraSlice` "Install pattern mirrors" (`15:174`) | Real `installGmtCameraSlice` lives at `engine-gmt/store/cameraSlice.ts:198+` and calls `installStateLibrary<SavedCameraPayload>` (full bundle, not just the slice) — see `engine-gmt/store/cameraSlice.ts:254`. | Medium |
| `@engine/camera` adapter plugin (`Camera.ts`) — entirely absent from doc | Doc only discusses the StateLibrary extraction. The shipped adapter-based slot recorder is a separate, parallel snapshot system the doc never mentions. `app-gmt` runs both (`installCamera({hideShortcuts:true})` + `installGmtCameraSlice`) for shortcut-conflict reasons (`docs/CHANGELOG_DEV.md:384`). | **High** — major undocumented surface. |
| No mention of `_savedToast` / `_notifyDot` transient fields, `<StateLibraryToast>`, or auto-mounted topbar slot | Shipped (`createStateLibrarySlice.ts:37-43`, `:165-183`; `installStateLibrary.ts:112-126`). Cross-referenced from `docs/CHANGELOG_DEV.md:385`. | High |
| No mention of `saveToSlot` rejection / sequential-fill invariant | Important behavioural invariant (`createStateLibrarySlice.ts:299-313`). | Medium |
| No mention of `appHandles.ts` or `migrations.ts` | These ship as adjacent engine primitives. `04_Core_Plugins.md` mentions camera but not these. | Medium (out of scope for doc 15) |

**Recommendation:** Mark doc 15 explicitly as a **historical research/proposal note** in its status header, and create a new shipped-reference doc that covers:
1. The dual snapshot architecture: `@engine/camera` adapter plugin vs `installStateLibrary` factory, and when to use each (Camera plugin = simple anonymous slots; StateLibrary = full library with thumbnails / drag-reorder / rename / per-app action names).
2. The real `StateLibraryOptions` API (arrayKey/activeIdKey/actions, async semantics, return types).
3. Transient store fields + toast/dot wiring (`_savedToast`, `_notifyDot`, `<StateLibraryToast>` auto-mount).
4. Install ordering rules (`presetField` submodule before store, `installGmtCameraSlice` after `installStateLibrary` calls, shortcut-tie-break rationale for `hideShortcuts: true`).
5. Cross-link to `appHandles.ts` (different concern) and `migrations.ts` (different concern) so they don't get rediscovered.

`docs/engine/04_Core_Plugins.md` and `docs/engine/16_Type_Augmentation.md` already cover slices of this; an integration doc would consolidate.

## Open questions

- **`<StateLibraryPanel>` and `<StateLibraryToast>` not audited here.** `components/StateLibraryPanel.tsx`, `components/ActiveSnapshotFeatures.tsx`, `engine/components/StateLibraryToast.tsx` are referenced by `installStateLibrary` but were not in the audit file list. These belong with the StateLibrary subsystem and likely need their own audit slice.
- **`engine-gmt/store/cameraSlice.ts` and `engine-gmt/features/camera_manager/CameraManagerPanel.tsx`** — GMT-specific composition over `installStateLibrary` (calls `installStateLibrary<SavedCameraPayload>` at `engine-gmt/store/cameraSlice.ts:254`). The audit prompt notes `engine-gmt/navigation/*` is `g04`; the camera_manager feature appears to land in a different gmt-app slot. Verify which subsystem covers it.
- **`docs/engine/16_Type_Augmentation.md`** documents how apps declare-merge their `installStateLibrary` keys into `engine/store/types.d.ts`. Not in this audit's file list, but tightly coupled to the StateLibrary surface — recommend cross-citing from any new doc.
- **`StateLibraryActionNames` collision detection** — `installStateLibrarySlice` checks `arrayKey + actions.add` only (`createStateLibrarySlice.ts:150-154`). Two libraries that share `arrayKey` but differ in action names would not collide; two that share action names but differ in arrayKey wouldn't collide either. Is the current narrow check intentional?
- **`@engine/camera` adapter plugin's future:** is it deprecated in favour of `installStateLibrary`, kept for the simpler "anonymous slot" use case, or maintained for backward compat with saved presets that contain `cameraSlots[]`? `app-gmt` actively suppresses its shortcuts; `fractal-toy` and `fluid-toy` still call `installCamera()` — what's the intended split?
- **Two `cameraSlots` writers risk.** The Camera plugin writes `cameraSlots` (`Camera.ts:67`). Nothing else in dev/ writes that key today (grep clean), but a future feature shadowing it would silently corrupt the slot array — should the plugin use a more-namespaced key (e.g. `__cameraSlots`)?
