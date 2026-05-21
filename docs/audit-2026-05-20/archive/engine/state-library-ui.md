---
source: components/StateLibraryPanel.tsx
lines: 311
last_verified_sha: 3105613bf938deef4d5988690b46366ec0bd7ca4
additional_sources:
  - engine/components/StateLibraryToast.tsx
  - components/ActiveSnapshotFeatures.tsx
audited: 2026-05-20T09:38:19Z
audited_by: claude-opus-4-7
public_api:
  - StateLibraryPanel
  - StateLibraryPanelProps
  - StateLibraryPreset
  - StateLibraryToast
  - StateLibraryToastProps
  - ActiveSnapshotFeatures
  - ActiveSnapshotFeaturesProps
  - default
depends_on:
  - e09-camera-plugin
  - e01-feature-system
  - e13-shared-ui
---

# StateLibrary UI primitives

Three generic, app-agnostic React components that form the rendering layer for any "saved snapshots" library (cameras, views, palettes, brush presets, …). They consume the contract published by `engine/store/createStateLibrarySlice.ts` (the slice installed by `installStateLibrary`) but are otherwise fully controlled — they read only the transient/active-id fields the slice writes, and never call into the slice's action surface directly.

- **`StateLibraryPanel<T>`** — pure-UI list + thumbnail + drag-reorder + inline-rename + per-row Save/Duplicate/Delete shell (components/StateLibraryPanel.tsx:1-23, components/StateLibraryPanel.tsx:95-113).
- **`StateLibraryToast`** — floating pill notification that mirrors the slice's transient `${arrayKey}_savedToast` field (engine/components/StateLibraryToast.tsx:1-19, engine/components/StateLibraryToast.tsx:31-52).
- **`ActiveSnapshotFeatures`** — footer helper that renders DDFS feature panels for whatever fields the snapshot captures (components/ActiveSnapshotFeatures.tsx:1-26, components/ActiveSnapshotFeatures.tsx:54-95).

Together they form the **e09b** rendering counterpart to the **e09** factory; the camera plugin is one consumer of the same contract, not the owner.

## Public API

### `components/StateLibraryPanel.tsx` — list shell

| Symbol | Kind | Where | Notes |
|---|---|---|---|
| `StateLibraryPreset` | interface | components/StateLibraryPanel.tsx:40-45 | `{ id; label; title?; onSelect }` — one button in the optional preset grid. |
| `StateLibraryPanelProps<T>` | interface | components/StateLibraryPanel.tsx:47-93 | Generic over snapshot payload `T`. |
| `StateLibraryPanel<T>` | function | components/StateLibraryPanel.tsx:95-309 | Default export at components/StateLibraryPanel.tsx:311. |

Required props (components/StateLibraryPanel.tsx:48-62):

| Prop | Type | Purpose |
|---|---|---|
| `snapshots` | `StateSnapshot<T>[]` | List source — `id`, `label`, `thumbnail?` are the only fields touched. |
| `activeId` | `string \| null` | Drives the cyan highlight and the active-only Save button. |
| `onSelect` | `(id \| null) => void` | Row click; pass `null` to deselect. |
| `onRename` | `(id, label) => void` | Inline rename on Enter / blur. |
| `onUpdate` | `(id) => void` | Save-button fires this; only visible on active row. |
| `onDuplicate` | `(id) => void` | Hover-revealed copy icon. |
| `onDelete` | `(id) => void` | Hover-revealed trash icon — fires immediately, no confirmation (components/StateLibraryPanel.tsx:59). |
| `onReorder` | `(from, to) => void` | Drag-drop reorder. |

Optional props (components/StateLibraryPanel.tsx:64-92):

| Prop | Default | Purpose |
|---|---|---|
| `isModified?` | — | When true on the **active** row, label renders italic amber with `*` prefix (components/StateLibraryPanel.tsx:194, components/StateLibraryPanel.tsx:246-258). |
| `emptyState?` | `'No saved snapshots'` | components/StateLibraryPanel.tsx:105, components/StateLibraryPanel.tsx:186-190. |
| `slotHintPrefix?` | `'Ctrl+'` | components/StateLibraryPanel.tsx:106; `null` hides the hint. |
| `presets?` | — | Quick-action button grid above the list (components/StateLibraryPanel.tsx:161-182). |
| `presetGridCols?` | `4` | Inline-style column count (components/StateLibraryPanel.tsx:108, components/StateLibraryPanel.tsx:168). |
| `toolbarBefore?` | — | Render slot above the list (components/StateLibraryPanel.tsx:183). |
| `toolbarAfter?` | — | Render slot below the list (components/StateLibraryPanel.tsx:305). |
| `footer?` | — | Render slot after the list — typical home for `<ActiveSnapshotFeatures>` (components/StateLibraryPanel.tsx:306). |
| `className?` | `'flex flex-col bg-[#080808]'` | Wrapper class; pass `''` to drop the default. |

### `engine/components/StateLibraryToast.tsx` — saved-toast pill

| Symbol | Kind | Where |
|---|---|---|
| `StateLibraryToastProps` | interface | engine/components/StateLibraryToast.tsx:25-29 |
| `StateLibraryToast` | `React.FC<StateLibraryToastProps>` | engine/components/StateLibraryToast.tsx:31-52 |

Single prop: `arrayKey: string` — same value passed to `installStateLibrary`'s `arrayKey`. The component computes the transient store field via `toastFieldKey(arrayKey)` (engine/components/StateLibraryToast.tsx:23, engine/components/StateLibraryToast.tsx:32) and renders `null` when no toast is pending (engine/components/StateLibraryToast.tsx:34).

### `components/ActiveSnapshotFeatures.tsx` — DDFS-panel footer

| Symbol | Kind | Where |
|---|---|---|
| `ActiveSnapshotFeaturesProps` | interface | components/ActiveSnapshotFeatures.tsx:33-52 |
| `ActiveSnapshotFeatures` | `React.FC<ActiveSnapshotFeaturesProps>` | components/ActiveSnapshotFeatures.tsx:54-95 |

| Prop | Type / default | Purpose |
|---|---|---|
| `activeIdKey` | `string` | Store field name holding the active snapshot id (e.g. `'activeViewId'`) — read via `useEngineStore` (components/ActiveSnapshotFeatures.tsx:64). |
| `featureIds` | `string[]` | DDFS feature ids; one `<AutoFeaturePanel>` rendered per id (components/ActiveSnapshotFeatures.tsx:83-92). |
| `label?` | default `'Active'` | Header label when a snapshot is active (components/ActiveSnapshotFeatures.tsx:57). |
| `groupFilter?` / `excludeParams?` / `whitelistParams?` | — | Forwarded verbatim to every `<AutoFeaturePanel>` (components/ActiveSnapshotFeatures.tsx:86-90). |
| `onDeselect?` | — | If provided, a Deselect button is rendered next to the header (components/ActiveSnapshotFeatures.tsx:72-80). |
| `inactiveLabel?` | default `null` | When no snapshot is active: `null` returns `null`; otherwise renders the header with this label and no feature panels (components/ActiveSnapshotFeatures.tsx:62, components/ActiveSnapshotFeatures.tsx:66, components/ActiveSnapshotFeatures.tsx:71). |

Both `StateLibraryPanel` and `ActiveSnapshotFeatures` re-export their component as the module `default` (components/StateLibraryPanel.tsx:311, components/ActiveSnapshotFeatures.tsx:97).

## Architecture

**Pure rendering layer over `createStateLibrarySlice`.** None of the three components owns library state. `StateLibraryPanel` is fully controlled — every piece of snapshot data plus every handler comes from props (components/StateLibraryPanel.tsx:48-62). Its only internal `useState` is for transient UI: `editId`, `editName`, and a `DragState` for the in-flight reorder (components/StateLibraryPanel.tsx:29-32, components/StateLibraryPanel.tsx:114-116). `StateLibraryToast` and `ActiveSnapshotFeatures` each subscribe to exactly one store field via `useEngineStore` — the transient toast field and the active-id field respectively (engine/components/StateLibraryToast.tsx:32, components/ActiveSnapshotFeatures.tsx:64). Neither writes to the store.

**Slot-driven composition.** The panel exposes three composition seams — `toolbarBefore`, `toolbarAfter`, `footer` — plus an inline `presets[]` grid (components/StateLibraryPanel.tsx:80-88, components/StateLibraryPanel.tsx:161-182). App-side shells (e.g. GMT's `CameraManagerPanel`, fluid-toy's view manager) wire these slots to their own widgets: cardinal-direction toolbars, "New" buttons, `<ActiveSnapshotFeatures>` footers, composition-overlay sub-panels. The header comment explicitly enumerates the owned vs not-owned responsibilities (components/StateLibraryPanel.tsx:7-22).

**Drag-handle isolation.** Only the drag-handle child is `draggable`; the row itself is not (components/StateLibraryPanel.tsx:197-217). This is the key invariant that lets `onClick={() => onSelect(snap.id)}` on the row coexist with the reorder gesture without a click being swallowed by the drag system.

**Toast wiring via `toastFieldKey(arrayKey)`.** The slice publishes its transient saved-toast under a computed key (`${arrayKey}_savedToast`); both the slice's `fireToast` and the toast component go through the exported `toastFieldKey` helper (engine/components/StateLibraryToast.tsx:23). The toast tone branches on `'warning'` vs anything else: amber border + dot + text for warnings (rejected over-range saves), cyan otherwise (engine/components/StateLibraryToast.tsx:36-39). The pill is `pointer-events-none` and absolutely positioned `top-full mt-2`, assuming a topbar slot supplies the anchor (engine/components/StateLibraryToast.tsx:42-43). Format: `<dot> <toast.message> <kbd>{toast.slot}</kbd>` (engine/components/StateLibraryToast.tsx:44-48).

**`ActiveSnapshotFeatures` reuses DDFS for inline editing.** When a saved snapshot is active, the same DDFS feature(s) whose fields the snapshot captured are rendered inline in the library footer via `<AutoFeaturePanel>` — so the user can tune live state without opening another menu (components/ActiveSnapshotFeatures.tsx:1-26, components/ActiveSnapshotFeatures.tsx:83-92). The same `groupFilter` / `excludeParams` / `whitelistParams` apply to every featureId — no per-feature override (components/ActiveSnapshotFeatures.tsx:86-90). The Deselect button only renders when both `activeId` is truthy AND `onDeselect` was provided (components/ActiveSnapshotFeatures.tsx:72-80).

**Dynamic Tailwind grid.** `presetGridCols` is interpolated into a `gridTemplateColumns` inline style because Tailwind's JIT can't statically extract a class built from a prop (components/StateLibraryPanel.tsx:164-168). The eslint-disable on the next line is intentional.

## Invariants

- **Only the drag-handle child is `draggable`.** The row itself is not — without this split, clicking a row would race against the HTML5 drag-start and frequently swallow the click (components/StateLibraryPanel.tsx:197-217). Drag handlers also `stopPropagation` on `dragStart` to avoid bubbling to row click handlers (components/StateLibraryPanel.tsx:211).
- **Slot-shortcut hint is hardcoded to the first 9 rows.** Rows at index ≥ 9 render no `Ctrl+N` hint regardless of how many snapshots exist (components/StateLibraryPanel.tsx:260-264). Matches the slice's `count: 9` default.
- **`isModified?` is consulted only for the active row.** Non-active rows never render the modified marker even if dirty (components/StateLibraryPanel.tsx:194). This is by design — the cyan highlight already identifies which row is "live" and the asterisk only adds value there.
- **Save (`onUpdate`) is active-only; Duplicate/Delete are universal.** The Save button is rendered conditionally on `isActive` (components/StateLibraryPanel.tsx:269-282); Duplicate and Delete render on every row, hover-revealed via group-hover opacity (components/StateLibraryPanel.tsx:283-298).
- **Delete fires immediately — no confirmation dialog.** The header comment flags this explicitly (components/StateLibraryPanel.tsx:59); UX safety is offloaded to undo (handled by the slice's `onApplied`-style hooks, not by this primitive).
- **Thumbnail fallback is the row index + 1.** When `snap.thumbnail` is absent, the index number (1-based) is rendered in the thumbnail slot rather than a placeholder image (components/StateLibraryPanel.tsx:221-227).
- **Rename submits on Enter or blur, cancels on Escape.** `Escape` clears `editId` without firing `onRename` (components/StateLibraryPanel.tsx:130-133, components/StateLibraryPanel.tsx:239-240).
- **Drop with `fromIndex === toIndex` is a no-op.** The reorder callback only fires when the indices differ (components/StateLibraryPanel.tsx:149-155). `handleDragEnd` always clears the drag state to prevent ghost highlights on cancelled drags (components/StateLibraryPanel.tsx:157).
- **Toast component returns `null` when no toast is pending.** No internal timer — the slice owns the toast lifetime; this component is a pure render of slice state (engine/components/StateLibraryToast.tsx:34).
- **`toastFieldKey(arrayKey)` is the only contract between toast and slice.** A typo in `arrayKey` between the two will silently produce a dead toast — there is no runtime validation that the field actually exists on the store (engine/components/StateLibraryToast.tsx:23, engine/components/StateLibraryToast.tsx:32).
- **`<StateLibraryToast>` lives in `engine/components/` while the other two live in `components/`.** The toast is engine-distributed (imports from `../store/createStateLibrarySlice` are intra-engine — engine/components/StateLibraryToast.tsx:23); the panel and features are app-side primitives that import the engine's `StateSnapshot` type via `../engine/store/createStateLibrarySlice` (components/StateLibraryPanel.tsx:27).
- **`ActiveSnapshotFeatures` collapses to `null` when both `!activeId` AND `inactiveLabel === null`.** Default behaviour hides the footer entirely when no snapshot is active; supply an `inactiveLabel` string to keep the header visible as a "free camera" / "no view" hint (components/ActiveSnapshotFeatures.tsx:62, components/ActiveSnapshotFeatures.tsx:66).

## Interactions with other subsystems

- **e09-camera-plugin** — owns the slice these primitives render: `createStateLibrarySlice` publishes `StateSnapshot<T>`, `toastFieldKey`, `StateLibrarySavedToast`, and the `activeIdKey` convention. `StateLibraryPanel` imports `StateSnapshot` from there (components/StateLibraryPanel.tsx:27); `StateLibraryToast` imports `toastFieldKey` and `StateLibrarySavedToast` (engine/components/StateLibraryToast.tsx:23). `installStateLibrary` auto-mounts `<StateLibraryToast>` as a topbar slot when its `menu` option is provided; apps with `menu: null` (GMT) must mount the toast by hand — the suggested registration pattern is documented inline (engine/components/StateLibraryToast.tsx:8-15).
- **e01-feature-system** — `ActiveSnapshotFeatures` composes `<AutoFeaturePanel>` instances to surface DDFS feature params in the library footer (components/ActiveSnapshotFeatures.tsx:30, components/ActiveSnapshotFeatures.tsx:85). The `featureIds` prop is exactly the DDFS feature id namespace; `groupFilter` / `excludeParams` / `whitelistParams` are forwarded verbatim to each panel.
- **e13-shared-ui** — `StateLibraryPanel` imports `TrashIcon`, `DragHandleIcon`, `SaveIcon`, `CopyIcon` from `./Icons` (components/StateLibraryPanel.tsx:26); `ActiveSnapshotFeatures` imports `SectionLabel` from `./SectionLabel` (components/ActiveSnapshotFeatures.tsx:31). Both depend on the shared-UI icon + label primitives but on nothing more interactive (no Slider/Knob — those come from app-side composition above the panel).
- **GMT consumers** — `engine-gmt/features/camera_manager/CameraManagerPanel.tsx` is the canonical consumer: it supplies cardinal-direction `presets`, an `<ActiveSnapshotFeatures>` footer wired to the `activeCameraId` field, and a hand-rolled topbar mount for `<StateLibraryToast arrayKey="savedCameras" />` because `installGmtCameraSlice` passes `menu: null`. fluid-toy's view library follows the same template against `savedViews` / `activeViewId`.

## Known issues / Phase 2 carry-in

- **Slice-level collision-guard gap (q-064) — surfaces here as a silent UX bug risk.** `installStateLibrarySlice`'s install-time guard only fires when BOTH the array key AND the `actions.add` name already exist on the store; two libraries that share `arrayKey` but differ in `actions.add` will silently wipe each other's saved snapshots on the second install, and two libraries that share action names but differ in `arrayKey` will silently rebind the action closures so the wrong library is mutated (q-064 §"Scenario 1", §"Scenario 2"). The UI primitives themselves are correct, but they will render confusing state in either failure mode — `StateLibraryPanel` would show the wrong list, `StateLibraryToast` would fire from the wrong slice, and `ActiveSnapshotFeatures` would read an id from a slice that no longer matches the displayed list. **Mitigation today:** GMT and fluid-toy use distinct `arrayKey`s and distinct `actions.*` names; no second library currently collides. Fix recommended at the slice layer (module-scope `Set<string>` of installed arrayKeys + action names).
- **`StateLibraryToast` dead-toast silently on `arrayKey` typo.** Because the toast computes its store field via `toastFieldKey(arrayKey)` and the slice does the same, a typo in either call site produces zero runtime errors — just a toast that never appears. Worth a TODO to validate at mount time (e.g. warn when the field doesn't exist on the store after the slice has had a chance to install).
- **Dynamic Tailwind grid eslint-disable.** `presetGridCols` is inlined via `style={{ gridTemplateColumns: ... }}` with an eslint-disable comment (components/StateLibraryPanel.tsx:164-168). Acceptable today; if a future Tailwind safelist covers `grid-cols-{2..8}` this can be reverted to a class lookup.
- **Async-save race not surfaced here, but visible.** The slice's `update` action awaits `captureThumbnail` inline; a rapid double-click on the Save button (Phase 2 follow-up at e09) would queue two captures. `StateLibraryPanel` does no debouncing on the Save button (components/StateLibraryPanel.tsx:269-282). If the slice gains an in-flight guard, no change is required here.

## Historical context

There is no prior module doc for this subsystem (q-061 §"Verdict" — the camera-plugin audit explicitly excluded these three files as belonging to a separate sibling audit). Rationale for each component is captured in-file as a header docblock:

- `StateLibraryPanel` header (components/StateLibraryPanel.tsx:1-23) enumerates owned vs not-owned concerns and names typical consumers (GMT's `CameraManagerPanel`, fluid-toy's view manager).
- `StateLibraryToast` header (engine/components/StateLibraryToast.tsx:1-19) records the topbar-slot registration template and references `installStateLibrarySlice` as the writer of the transient field.
- `ActiveSnapshotFeatures` header (components/ActiveSnapshotFeatures.tsx:1-26) records the inline-editing pattern with a copy-pasteable usage example.

These three components are the **rendering layer** for the contract published by `createStateLibrarySlice` (q-061 §"Shared contract"). The factory itself ships in **e09-camera-plugin**'s audit because that's where the snapshot abstraction landed first; spinning these primitives out as **e09b** matches the actual code ownership (no camera coupling — they work just as well for views, palettes, and any future library) and was the recommendation in q-061 §"Verdict".
