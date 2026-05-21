---
source: engine/plugins/Camera.ts
lines: 1-164
last_verified_sha: 65f474d1ba7508b7b0f73234c7ab788fa37f5734
additional_sources:
  - engine/plugins/camera/presetField.ts
  - engine/appHandles.ts
  - engine/migrations.ts
  - engine/store/createStateLibrarySlice.ts
  - engine/store/installStateLibrary.ts
audited: 2026-05-20T12:00:00Z
audited_by: claude-opus-4-7
public_api:
  - CameraAdapter
  - CameraSlot
  - camera
  - InstallCameraOptions
  - installCamera
  - uninstallCamera
  - AppHandles
  - defineAppHandles
  - registerMigration
  - listMigrations
  - applyMigrations
  - moveField
  - renameSlice
  - renameField
  - TOAST_FIELD_SUFFIX
  - DOT_FIELD_SUFFIX
  - toastFieldKey
  - dotFieldKey
  - StateLibrarySavedToast
  - StateSnapshot
  - StateLibraryActionNames
  - StateLibraryOptions
  - installStateLibrarySlice
  - SlotShortcutOptions
  - StateLibraryMenuOptions
  - InstallStateLibraryOptions
  - installStateLibrary
depends_on:
  - e08-shortcuts-undo
  - e07-plugins-host
---

# Camera plugin + StateLibrary primitive

`@engine/camera` is an **adapter-based slot recorder**: apps register a `CameraAdapter` describing how to capture / apply their own camera shape (2D pan-zoom, 3D orbit, 6-DOF, …) and the plugin stores up to 9 opaque JSON snapshots in `cameraSlots[]` with `Ctrl+1..9` / `1..9` keybindings (engine/plugins/Camera.ts:1-25, engine/plugins/Camera.ts:37-44, engine/plugins/Camera.ts:138-154).

`installStateLibrary` is a **separate, parallel** primitive shipped beside the camera plugin: a generic snapshot-library factory (cameras, views, palettes, brush presets, …) with thumbnails, drag-reorder, inline-rename, transient saved-toast / notify-dot fields, an optional auto-mounted topbar menu, and per-install action-name overrides (engine/store/createStateLibrarySlice.ts:1-28, engine/store/installStateLibrary.ts:1-19). The two systems coexist — fluid-toy and app-gmt install both: the camera plugin (often with `hideShortcuts: true`) for the `cameraSlots[]` preset round-trip and `window.__camera` dev handle, and `installStateLibrary` for the managed library UX (followup q-065).

This subsystem also exposes two co-located engine primitives that are **not camera-specific** but live alongside the plugin: `engine/appHandles.ts` (typed singletons that bridge React subtrees and imperative code) and `engine/migrations.ts` (preset-load migration layer).

## Public API

### `engine/plugins/Camera.ts` — adapter-based slot recorder

- **`interface CameraAdapter`** — `{ featureId: string; captureState: () => Record<string, any>; applyState: (state: Record<string, any>) => void }`. The adapter is the app's bridge between the plugin's opaque-JSON slots and its own camera state shape (engine/plugins/Camera.ts:37-44).
- **`interface CameraSlot`** — `{ id: string; label: string; state: Record<string, any>; timestamp: number }`. The serialised record persisted in the store as `cameraSlots[n]` (engine/plugins/Camera.ts:46-51).
- **`camera`** — module-scope singleton object:

| Method | Signature | Notes |
|---|---|---|
| `register` | `(adapter: CameraAdapter) => void` | Apps call once at boot. Replaces any prior adapter (engine/plugins/Camera.ts:72-74). |
| `saveSlot` | `(n: number, label?: string) => boolean` | Slot `n` is 1..9; returns `false` if no adapter or out-of-range. Silent (no console warning) on missing adapter (engine/plugins/Camera.ts:77-90). |
| `recallSlot` | `(n: number) => boolean` | Returns `false` if no adapter, out-of-range, or empty slot (engine/plugins/Camera.ts:93-99). |
| `clearSlot` | `(n: number) => void` | Out-of-range is a silent no-op (engine/plugins/Camera.ts:102-107). |
| `getAllSlots` | `() => (CameraSlot \| null)[]` | Full array including unused index 0 (engine/plugins/Camera.ts:110-112). |
| `setAllSlots` | `(slots: (CameraSlot \| null)[]) => void` | Used by the preset-field deserialiser (engine/plugins/Camera.ts:114-116). |

- **`interface InstallCameraOptions`** — `{ hideShortcuts?: boolean }` (engine/plugins/Camera.ts:119-122).
- **`installCamera(options?: InstallCameraOptions): void`** — Idempotent (`_installed` guard at engine/plugins/Camera.ts:125). Exposes `window.__camera` in any environment with `window`; registers `Mod+1..9` save / `1..9` recall shortcuts unless `hideShortcuts: true` (engine/plugins/Camera.ts:124-155).
- **`uninstallCamera(): void`** — Unregisters all 18 shortcut ids, drops the adapter, clears `_installed`. Does **not** clear `cameraSlots` from the store (engine/plugins/Camera.ts:157-164).

### `engine/plugins/camera/presetField.ts` — side-effect submodule

No exports. Module evaluation registers a `cameraSlots` preset field with `presetFieldRegistry` (engine/plugins/camera/presetField.ts:20-26). Apps import it as an early side effect before any store-touching import — see Invariants below (engine/plugins/camera/presetField.ts:1-15).

### `engine/appHandles.ts` — typed-singleton primitive (not camera-specific)

- **`interface AppHandles<T>`** — `{ readonly name: string; readonly ref: { current: T }; useSnapshot(): T; subscribe(fn: () => void): () => void; notify(): void; reset(): void }` (engine/appHandles.ts:46-68).
- **`defineAppHandles<T>(name: string, initial: T): AppHandles<T>`** — Each call returns an independent singleton. Pairs `ref.current` with an internal `rev` counter so `useSyncExternalStore` re-runs subscribers only when `notify()` bumps the rev (engine/appHandles.ts:77-118).

### `engine/migrations.ts` — preset migration layer (not camera-specific)

- **`registerMigration(m: { version: number; id: string; apply: (preset: any) => any }): void`** — Re-registering the same `id` replaces the earlier entry (HMR-safe). Order between calls doesn't matter — sort happens at apply time (engine/migrations.ts:55-60).
- **`listMigrations(): ReadonlyArray<Migration>`** — Returns a sorted snapshot (lazy-sorted on first use) (engine/migrations.ts:63-66).
- **`applyMigrations(preset: any): any`** — Runs every migration whose `version > preset._migrationVersion`, retags the preset with the highest applied version. Catches migration throws and logs them; the chain continues (engine/migrations.ts:76-92).
- **`moveField(preset, fromPath, toPath): void`** — Moves a single `slice.field` value between slices; deletes the source key so stale copies don't round-trip (engine/migrations.ts:115-125).
- **`renameSlice(preset, fromSlice, toSlice): void`** — Merges fields into the destination on conflict (destination wins) (engine/migrations.ts:132-141).
- **`renameField(preset, slice, fromKey, toKey): void`** — Within a single slice (engine/migrations.ts:144-149).

### `engine/store/createStateLibrarySlice.ts` — generic snapshot factory

- **`TOAST_FIELD_SUFFIX` / `DOT_FIELD_SUFFIX`** — Suffixes the slice appends to `arrayKey` for the transient toast / notify-dot store fields (engine/store/createStateLibrarySlice.ts:37-40).
- **`toastFieldKey(arrayKey: string): string`** / **`dotFieldKey(arrayKey: string): string`** — Helpers consumers must use to derive the same store-field names the slice writes (engine/store/createStateLibrarySlice.ts:42-43).
- **`interface StateLibrarySavedToast`** — `{ slot: number; label: string; tone: 'success' | 'warning'; message: string }` (engine/store/createStateLibrarySlice.ts:48-58).
- **`interface StateSnapshot<T>`** — `{ id: string; label: string; thumbnail?: string; state: T; createdAt: number }`. The state payload `T` is opaque to the library (engine/store/createStateLibrarySlice.ts:62-72).
- **`interface StateLibraryActionNames`** — Maps each of the 8 internal action names (`add` / `update` / `delete` / `duplicate` / `select` / `reorder` / `saveToSlot` / `reset`) to a store-field name (engine/store/createStateLibrarySlice.ts:76-85).
- **`interface StateLibraryOptions<T>`** — Full configuration surface: `arrayKey`, `activeIdKey`, `actions`, optional `defaultLabelPrefix`, required `capture` / `apply`, optional `isModified`, `captureThumbnail`, `suggestLabel`, `onReset`, `onApplied`, `onSavedToSlot`, `toastDurationMs` (default 2000), `dotDurationMs` (default 5000) (engine/store/createStateLibrarySlice.ts:87-139).
- **`installStateLibrarySlice<T>(opts: StateLibraryOptions<T>): void`** — Patches the slice onto the store. Idempotent with dev warn — detected by `arrayKey + actions.add` both being present (engine/store/createStateLibrarySlice.ts:143-363).

### `engine/store/installStateLibrary.ts` — slice + shortcuts + menu bundle

- **`interface SlotShortcutOptions`** — `{ count?: number; category?: string; saveModifier?: string; savePrefix?: string; recallPrefix?: string }`. Defaults: `count: 9`, `category: 'Camera'`, `saveModifier: 'Mod'` (engine/store/installStateLibrary.ts:30-41).
- **`interface StateLibraryMenuOptions`** — `{ menuId; slot; order; icon?; title?; label?; align?; width?; openItem?; resetItem?; slotItems?; slotLabelPrefix? }` (engine/store/installStateLibrary.ts:45-74).
- **`interface InstallStateLibraryOptions<T>`** — Extends `StateLibraryOptions<T>` with `panelId: string`, `slotShortcuts?: boolean | SlotShortcutOptions` (default true), `menu?: StateLibraryMenuOptions | null` (engine/store/installStateLibrary.ts:76-85).
- **`installStateLibrary<T>(opts: InstallStateLibraryOptions<T>): void`** — Bundles the slice install, optional slot shortcuts (`Mod+N` save / `N` recall), an optional topbar menu, and (when `menu` is provided) an auto-mounted `<StateLibraryToast arrayKey>` slot at `order + 0.5` adjacent to the menu button (engine/store/installStateLibrary.ts:100-110, engine/store/installStateLibrary.ts:112-126).

## Architecture

### Two parallel snapshot systems, by design

- The **`@engine/camera` adapter plugin** stores up to 9 opaque-JSON snapshots in `cameraSlots[]` and registers `Ctrl+1..9` / `1..9` keybindings (engine/plugins/Camera.ts:1-25). No panel UI, no thumbnails, no list management. Fractal-toy uses this as its sole snapshot system; app-gmt and fluid-toy install it with `hideShortcuts: true` for the preset round-trip + `window.__camera` dev handle while delegating the list-management UX to `installStateLibrary` (followup q-065).
- The **`installStateLibrary` factory** is the upgrade path for a managed library: `StateSnapshot<T>` envelopes with labels / thumbnails / drag-reorder / inline rename, configurable per-install action names so multiple libraries (`addCamera` + `addView`) coexist, and optional auto-wired slot shortcuts + topbar menu (engine/store/createStateLibrarySlice.ts:1-28, engine/store/installStateLibrary.ts:1-19). Neither system is deprecated — they cover different UX surfaces (followup q-065).

### Camera-plugin internals

- **Module-scope singletons** — `_adapter: CameraAdapter | null` and `_installed: boolean` are module-level (engine/plugins/Camera.ts:53-54). `installCamera` short-circuits on the `_installed` flag (engine/plugins/Camera.ts:125-126).
- **Slot storage in the engine store** — `cameraSlots` is written directly via `(useEngineStore as any).setState({ cameraSlots: slots })`. The cast bypasses DDFS because slot state is "UI meta", not a feature slice (engine/plugins/Camera.ts:56-67). `SLOT_COUNT = 10` but index 0 is unused; valid slots are 1..9 (engine/plugins/Camera.ts:58, engine/plugins/Camera.ts:78).
- **Preset-field side-effect submodule** — `engine/plugins/camera/presetField.ts` imports only `presetFieldRegistry` (never the store), so importing it does not trigger store construction. Apps must import it as an early side effect before any store-touching import; otherwise the preset-field registry is already frozen by store construction and the registration silently drops (engine/plugins/Camera.ts:29-35, engine/plugins/camera/presetField.ts:1-15, engine/plugins/camera/presetField.ts:20-26).
- **Capture / apply are unguarded against adapter throws** — `_adapter.captureState()` and `_adapter.applyState(slot.state)` run inline with no try/catch wrapper (engine/plugins/Camera.ts:79, engine/plugins/Camera.ts:97).
- **Hotkey lineup** — `installCamera` registers two shortcuts per slot (`camera.save-slot-${n}` at `Mod+${n}`, `camera.recall-slot-${n}` at `${n}`) under category `'Camera'`. `uninstallCamera` tears down all 18 ids (engine/plugins/Camera.ts:139-154, engine/plugins/Camera.ts:157-164).
- **Dev exposure** — `window.__camera` is set in any environment with `window`, not gated by `import.meta.env.DEV` (engine/plugins/Camera.ts:132-134).

### `appHandles` primitive

- **Per-purpose typed singletons** — each `defineAppHandles<T>(name, initial)` call returns an independent container. Apps typically create 2-3 grouped by purpose (brush, camera, input) rather than one flat container (engine/appHandles.ts:1-42).
- **Snapshot identity uses an internal `rev` counter** — `useSnapshot` pairs the ref read with a monotonic `rev` integer fed to `useSyncExternalStore`, so React's value-equality check only re-runs subscribers when `notify()` bumps the rev (engine/appHandles.ts:88-97). Purely-imperative writes that the next RAF frame will read anyway can skip `notify()`.
- **Dev-only global** — handles register into `globalThis.__appHandles[name]` only when `import.meta.env.DEV` is true (engine/appHandles.ts:113-115). Production smoke tests cannot probe it.

### `migrations` primitive

- **Lazy sort, module-scope state** — `_migrations` and `_sorted` are module-global; the first `listMigrations` or `applyMigrations` after a `registerMigration` re-sorts in place (engine/migrations.ts:49-50, engine/migrations.ts:64-65, engine/migrations.ts:78-79).
- **HMR-safe registration** — re-registering the same `id` replaces the earlier entry in place rather than appending (engine/migrations.ts:55-60).
- **Version tagging on the preset itself** — `preset._migrationVersion` records the highest applied version. Only migrations with `version > before` run; `afterVersion` is tagged back onto the preset on the way out (engine/migrations.ts:79-90).
- **`m.apply` throws are caught and logged** — the migration chain continues with the unchanged preset (engine/migrations.ts:82-87). `m.apply` returning falsy is treated as "no change" rather than "void output": `preset = m.apply(preset) ?? preset` (engine/migrations.ts:84).
- **Helpers operate on the `preset.features.<slice>.<key>` shape.** `moveField` deletes the source after copy to avoid stale round-trips (engine/migrations.ts:115-125). `renameSlice` is destination-wins on per-field conflict (engine/migrations.ts:132-141).

### `createStateLibrarySlice` factory internals

- **Idempotency guard at engine/store/createStateLibrarySlice.ts:150-154** — fires only when both `Array.isArray(existing[arrayKey])` AND `typeof existing[actions.add] === 'function'`. Shaped for HMR / StrictMode re-entry where the entire opts object is the same. The narrow check is a pragmatic "same install twice" guard, not a general anti-collision system (followup q-064).
- **Transient fields per library** — `toastFieldKey(arrayKey)` and `dotFieldKey(arrayKey)` are self-clearing via `setTimeout` (default 2s / 5s). Warning toasts skip the notify-dot — nothing was saved to call attention to (engine/store/createStateLibrarySlice.ts:167-183).
- **`add` returns `Promise<string>`** — the new snapshot id, so callers can await thumbnail patching (engine/store/createStateLibrarySlice.ts:206-228). Thumbnail capture is awaited and the array is then patched in a second write.
- **`update` with no patch overwrites snapshot state with current live state** — drives the floppy-disk Save button on the panel. Captures a new thumbnail inline if `captureThumbnail` is provided (engine/store/createStateLibrarySlice.ts:230-250).
- **`select(null)` clears active only, no apply** (engine/store/createStateLibrarySlice.ts:276-279). `select(id)` captures prev → applies → fires `onApplied(state, prev, snapshot)` (engine/store/createStateLibrarySlice.ts:193-198, engine/store/createStateLibrarySlice.ts:281-285).
- **`duplicate` deep-clones via `JSON.parse(JSON.stringify(src))`, inserts adjacent, and re-applies** — duplicating an inactive snapshot makes it active and re-applies its state (engine/store/createStateLibrarySlice.ts:258-274).
- **`saveToSlot` enforces sequential fill** — `slotIndex > arr.length` rejects with a warning toast rather than appending out-of-order (engine/store/createStateLibrarySlice.ts:297-313). `slotIndex < arr.length` overwrites, `slotIndex === arr.length` appends (engine/store/createStateLibrarySlice.ts:315-348).
- **`reset` clears `activeIdKey` and calls `onReset?.()`** — apps use this to fall back to formula default presets (engine/store/createStateLibrarySlice.ts:358-361).

### `installStateLibrary` bundle internals

- **Three opt-out concerns** — slice install, slot shortcuts, topbar menu. Each can be disabled independently (engine/store/installStateLibrary.ts:100-110).
- **Toast topbar mount is gated on `menu`** — when `opts.menu` is provided, `<StateLibraryToast arrayKey>` is auto-mounted as a topbar slot at `order + 0.5`. Apps that pass `menu: null` (e.g. app-gmt's hand-wired Camera menu) must mount the toast component themselves (engine/store/installStateLibrary.ts:106-109, engine/store/installStateLibrary.ts:112-126).
- **Slot shortcut handlers read action functions at fire time**, not install time — robust against ordering between `installStateLibrary` and the slice install (engine/store/installStateLibrary.ts:147-150, engine/store/installStateLibrary.ts:157-163).
- **Menu's Open item has a dynamic label** that appends `  ●` while the notify-dot field is truthy (engine/store/installStateLibrary.ts:191-204).
- **Slot menu items use `✓` when filled, fall back to save when empty** (engine/store/installStateLibrary.ts:222-253).

## Invariants

- **`@engine/camera` and `installStateLibrary` are two separate snapshot systems**, with different storage (`cameraSlots[]` vs configured array keys), different action surfaces (the `camera` singleton vs configured action names), and different shortcut bindings. They do not share state. Apps that install both pass `hideShortcuts: true` to `installCamera` to prevent `Ctrl+1..9` from binding twice. Originating: survey e09-camera-plugin (line 92), followup q-065.
- **`presetField.ts` must be imported as an early side effect** — before any store-touching import. Importing `Camera.ts` (or anything that transitively constructs `useEngineStore`) freezes the preset-field registry, after which `cameraSlots` will silently not round-trip. Apps follow the pattern in `fluid-toy/main.tsx` / `fractal-toy/main.tsx` (engine/plugins/Camera.ts:29-35, engine/plugins/camera/presetField.ts:1-15).
- **`cameraSlots` index 0 is unused.** `SLOT_COUNT = 10` but valid slots are 1..9; both `saveSlot` and `recallSlot` reject `n < 1 || n >= SLOT_COUNT` (engine/plugins/Camera.ts:58, engine/plugins/Camera.ts:78, engine/plugins/Camera.ts:94).
- **`camera.register` does NOT trigger `installCamera`** (or vice-versa). Without `register`, every save / recall returns `false` silently — no console warning makes a missing-adapter bug hard to spot (engine/plugins/Camera.ts:78, engine/plugins/Camera.ts:94).
- **`uninstallCamera` does not clear `cameraSlots` from the store** — it only nukes shortcuts and the adapter (engine/plugins/Camera.ts:157-164). Data persists; a subsequent re-install re-uses it. This is intentional: saved presets continue to carry `cameraSlots[]`, and future re-installs (or preset loads) recover the data unchanged (followup q-065).
- **`cameraSlots` is written via `(useEngineStore as any).setState`** — the `as any` cast bypasses TypeScript collision detection, so a future DDFS feature named `cameraSlots` would silently overwrite. Keeping the unprefixed key is intentional (matches sibling plugins' unprefixed pattern; the wire-format key is load-bearing for `.gmf` preset round-trip). A typed `EngineState` declaration merge would compile-warn at the collision site without changing wire format. Originating: followup q-066.
- **`appHandles` global is dev-only.** `globalThis.__appHandles` is gated by `import.meta.env.DEV` — production smoke tests cannot enumerate handles (engine/appHandles.ts:113-115).
- **`migrations._sorted` is shared module state.** The first apply or list after any `registerMigration` re-sorts the array in place (engine/migrations.ts:64-65, engine/migrations.ts:78-79).
- **`migrations.apply` returning falsy keeps the input preset.** `preset = m.apply(preset) ?? preset` — an explicit `return null` is treated as "no change" rather than "void output" (engine/migrations.ts:84).
- **`installStateLibrarySlice` idempotency guard is narrow** — only the conjunction `arrayKey + actions.add` is checked. Two unchecked silent-failure scenarios: (a) same `arrayKey`, different `actions.add` — re-install silently clobbers `arrayKey: []` and wipes saved snapshots; (b) different `arrayKey`, same `actions.add` — second install's `addSnapshot` overwrites the first's, so the cameras library's action silently redirects to the views library's storage. GMT does not trip either today because both `arrayKey` and action names differ per install; both scenarios would bite a future palettes / brush-presets library that reuses an action name. Originating: followup q-064 (engine/store/createStateLibrarySlice.ts:150-154).
- **`saveToSlot` rejection on `slotIndex > arr.length` is intentional.** Pressing Mod+5 with two saved entries used to append silently as the 3rd entry labelled "Camera 5" — now produces a warning toast instead (engine/store/createStateLibrarySlice.ts:299-313).
- **`duplicate` re-applies the duplicated state immediately** — duplicating an inactive snapshot makes it active and triggers a side-effect via `apply` (engine/store/createStateLibrarySlice.ts:258-274).
- **`update` with no patch awaits thumbnail capture inline** — rapid double-click of the Save button could race two captures into the array; no de-dup guard (engine/store/createStateLibrarySlice.ts:241-245).
- **`activeIdKey` only updates on add / select / delete-of-active / duplicate.** A direct `update` does NOT change `activeIdKey`; selection survives overwrites (engine/store/createStateLibrarySlice.ts:230-250).
- **Toast topbar slot is auto-mounted only when `menu` is non-null.** Apps with `menu: null` (e.g. app-gmt) must mount `<StateLibraryToast arrayKey>` manually (engine/store/installStateLibrary.ts:106-109, engine/store/installStateLibrary.ts:112-126).
- **Menu slot count diverges from shortcut count when `slotShortcuts: false`.** Menu derives count from `opts.slotShortcuts.count` when slotShortcuts is an object, otherwise hard-codes 9. With `slotShortcuts: false` and the default menu, slot items still render 1..9 even though no shortcuts exist (engine/store/installStateLibrary.ts:228).

## Interactions with other subsystems

Outgoing (real edges):

- **`engine/store/engineStore`** — `camera` writes `cameraSlots` directly via `(useEngineStore as any).setState` (engine/plugins/Camera.ts:60-68). `createStateLibrarySlice` writes the configured `arrayKey`, `activeIdKey`, `toastFieldKey(arrayKey)`, and `dotFieldKey(arrayKey)` (engine/store/createStateLibrarySlice.ts:200-204). `installStateLibrary` additionally reads `togglePanel` from the store for its menu Open item (engine/store/installStateLibrary.ts:201-203).
- **`utils/PresetFieldRegistry`** — `presetField.ts` registers `cameraSlots` with `presetFieldRegistry` (engine/plugins/camera/presetField.ts:18-26). The registration freezes once the engine store constructs (see Invariants).
- **`e08-shortcuts-undo`** — `installCamera` registers 18 shortcuts via the shared `shortcuts` plugin (engine/plugins/Camera.ts:139-154); `installStateLibrary` registers `count * 2` slot shortcuts under category `'Camera'` (engine/store/installStateLibrary.ts:128-166).
- **`e07-plugins-host`** — `installStateLibrary` registers a menu via `@engine/menu` and a topbar slot via `@engine/topbar` (engine/store/installStateLibrary.ts:120-125, engine/store/installStateLibrary.ts:168-181).
- **`engine/components/StateLibraryToast`** — Auto-imported and mounted by `installStateLibrary` when `menu` is non-null (engine/store/installStateLibrary.ts:120-125). Surface not owned by this subsystem — see Phase 2 carry-in.

Incoming (representative consumers, not exhaustive):

- **`app-gmt`** — installs both: `installCamera({ hideShortcuts: true })` plus `installGmtCameraSlice` (which wraps `installStateLibrary<SavedCameraPayload>` at `engine-gmt/store/cameraSlice.ts:254`). The `hideShortcuts: true` exists to keep `Ctrl+1..9` from binding twice; the camera plugin's adapter is intentionally never registered, so its save/recall would no-op anyway (followup q-065).
- **`fluid-toy`** — installs `installCamera({ hideShortcuts: true })` plus a per-app `installFluidToyViewLibrary()` that calls `installStateLibrary` with `arrayKey: 'savedViews'` (followup q-065).
- **`fractal-toy`** — installs `installCamera()` with shortcuts enabled. The `@engine/camera` plugin is its sole snapshot system; no `installStateLibrary` consumer (followup q-065).

`depends_on: [e08-shortcuts-undo, e07-plugins-host]` — both are runtime registry dependencies (slots / menus / topbar / keybindings).

## Known issues / Phase 2 carry-in

- **subsystem-gap** — The StateLibrary UI primitives that consume this factory live in adjacent files not claimed by any subsystem: `components/StateLibraryPanel.tsx`, `engine/components/StateLibraryToast.tsx`, `components/ActiveSnapshotFeatures.tsx`. They are keyed on this slice's public contract (`StateSnapshot<T>`, `toastFieldKey`, `activeIdKey` convention). Recommend a sibling slice `e09b-state-library-ui` rather than folding them into e09. Originating: followup q-061 (proposed in phase-2-carry-in.json).
- **subsystem-gap** — The GMT-side consumer of `installStateLibrary` is 592 uncovered lines (`engine-gmt/store/cameraSlice.ts` 310, `CameraManagerPanel.tsx` 154, `logic.ts` 128) covered by no g* slice end-to-end. The new slice would document the GMT-specific load-order invariant (`installGmtCameraSlice()` must run before `CameraManagerPanel` first render, per `engine-gmt/store/cameraSlice.ts:20-22`) and the boundary handoff at the `installStateLibrary<SavedCameraPayload>` call site. Recommend new slice `g11-gmt-camera-manager`. Originating: followup q-062 (proposed in phase-2-carry-in.json).
- **bug** — `installStateLibrarySlice` collision guard at engine/store/createStateLibrarySlice.ts:150-154 AND-checks `arrayKey + actions.add` only. Two unchecked scenarios cause silent data loss / silent action mis-routing (see Invariants). Fix is ~6 lines: module-scope `Set<string>` registries for `arrayKey` and action names. Originating: followup q-064.
- **bug (latent)** — `cameraSlots` is written via an `as any` setState; a future DDFS feature shadowing the key would silently overwrite. Tiny one-line improvement: declare-merge `cameraSlots?: (CameraSlot|null)[]` into `EngineState` so a collision compile-warns. Wire format must stay the literal `cameraSlots` for preset round-trip. Originating: followup q-066.
- **drift / cleanup** — Adapter throw safety. `_adapter.captureState()` and `_adapter.applyState(slot.state)` run inline without try/catch (engine/plugins/Camera.ts:79, engine/plugins/Camera.ts:97). A thrown adapter would propagate out of `saveSlot` / `recallSlot` and out of the shortcut handler. Originating: survey e09-camera-plugin.md drift table.
- **drift / cleanup** — `saveSlot` returns `false` silently when no adapter is registered. A `console.warn` would make the missing-adapter bug discoverable. Originating: survey e09-camera-plugin (line 96).
- **doc-rewrite-target** — `docs/engine/16_Type_Augmentation.md:92-165` is the canonical declaration-merging reference for `installStateLibrary` consumers (it covers `savedViews` / `activeViewId` / `<arrayKey>_savedToast` augmentation against `EngineStoreState` and `EngineActions`). Outbound link from doc 16 to this surface exists (docs/engine/16_Type_Augmentation.md:194); the missing direction is inbound. This module doc cross-cites it here. Originating: followup q-063.
- **cross-cutting carry-in** — Several engine-side plugins (this one included) write to the store via untyped `setState` casts using unprefixed keys (`cameraSlots`, `tutorialCompleted`, `lights`, `pipeline`, `cameraRot`, `targetDistance`, `sceneOffset`, `cameraMode`, `savedCameras`). The convention is intentional and consistent across plugins; the safety belt should be at the registry layer (`presetFieldRegistry.register` warning on a key that matches a registered DDFS feature id) rather than per-plugin string mangling. Originating: followup q-066 related findings.

## Historical context

`docs/engine/15_Camera_Manager_Extraction.md` is the design proposal that drove this subsystem; the implementation has shipped but the doc still opens with "Status: Research. No code changes yet" (docs/engine/15_Camera_Manager_Extraction.md:3). **See it for design rationale and aspirations** — preserved with pointer, not superseded. Concretely it captures (per d02 docs-existing summary):

> "Four-block split of CameraManagerPanel.tsx as analysis template; capture/apply callback shape; split of GMT-specific bits from generic bits; multiple-libraries-per-app design ('Views' + 'Color Palettes' + 'Brush Presets'); 'fluid-toy's snapshot is a fractal-config-plus-camera blob, NOT a camera' insight that drove StateLibrary naming; composition overlays separation as a design rule; shortcuts already generic"

The user-quoted reframing on docs/engine/15_Camera_Manager_Extraction.md:11-12 — *"the camera manager at its core is a state manager, and in that form would be most useful for a variety of applications"* — is the design provenance for the **generic** `installStateLibrary` shape this module documents. The three-layer plan (factory + UI primitive + per-app shells with capture/apply callbacks) on docs/engine/15_Camera_Manager_Extraction.md:151-163 matches the shipped surface (the UI primitive piece is the still-unowned `<StateLibraryPanel>` / `<StateLibraryToast>` / `<ActiveSnapshotFeatures>` bundle — see Phase 2 carry-in).

Drift from the proposal that this module doc supersedes:

- The proposal's `storeKey: string` option (docs/engine/15_Camera_Manager_Extraction.md:131) shipped as **two** keys: `arrayKey` + `activeIdKey` (engine/store/createStateLibrarySlice.ts:90-93).
- The proposal's action-prefixing model (docs/engine/15_Camera_Manager_Extraction.md:174) shipped as the explicit `StateLibraryActionNames` map (engine/store/createStateLibrarySlice.ts:76-85), so GMT keeps literal `addCamera` / `selectCamera` names.
- The proposal's open question on add returning the new id (docs/engine/15_Camera_Manager_Extraction.md:227-230) resolved: `add` returns `Promise<string>` (engine/store/createStateLibrarySlice.ts:227).
- The `@engine/camera` adapter plugin (engine/plugins/Camera.ts) is **entirely absent from the proposal** — doc 15 only discusses the StateLibrary extraction. The adapter-based slot recorder is a separate, parallel system that ships as the lightweight default; the proposal predates the dual-system shape.

`docs/engine/04_Core_Plugins.md` documents `installCamera()` as a current first-class plugin (referenced from the d02 summary and followup q-065); `docs/engine/16_Type_Augmentation.md:92-165` is the canonical declaration-merging reference for `installStateLibrary` consumers and should be cross-cited from any new doc on the panel / toast UI primitives.
