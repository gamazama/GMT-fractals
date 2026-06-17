# ADR-0057: Topbar Camera menu wired by hand (`menu: null` opts out of auto-generated menu)

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/store/cameraSlice.ts`, `engine-gmt/topbar.tsx`

## Context

Engine-core's `installStateLibrary` factory can auto-generate a topbar menu
listing slots 1-9 plus add/delete/select. The generated menu's shape is a
flat list of actions appropriate for utility libraries.

GMT's Camera menu predates the factory and has a richer organisation:

1. Undo Move / Redo Move (pair at top — distinct from generic undo because
   this is the camera-specific history slice).
2. Reset Position (a one-shot, not a library action).
3. View Manager (opens the panel).
4. ── separator ──
5. Camera Slots 1-9 (numbered hotkeys).

The auto-generated menu's flat list doesn't capture (1)+(3) and would force
the user to discover them in a different menu structure.

Alternatives considered:

- **Drop the bespoke menu structure and accept the auto-generated one.**
  Breaks user expectations from prior GMT releases. Rejected.
- **Extend the factory to support custom menu shapes.** Adds API surface
  for one consumer.
- **Have the factory generate the menu AND have the topbar hand-add the
  extras.** Duplicates slot-1-9 entries.

## Decision

The `installStateLibrary` call sets `menu: null` at
`engine-gmt/store/cameraSlice.ts:280`, disabling the auto-generated menu.

The Camera menu is hand-wired in `engine-gmt/topbar.tsx:271-348`. Slot 1-9
click handlers route to the SAME `savedCameras[slotIndex]` + `selectCamera`
/ `saveToSlot` actions the `Mod+1..9` (save) / `1..9` (select) slot
shortcuts hit — so menu clicks and hotkeys agree by construction.

The "View Manager" label reads the notify-dot via `dotFieldKey('savedCameras')`
(`engine-gmt/topbar.tsx:315`), and the floating-pill toast is
`<StateLibraryToast arrayKey="savedCameras" />` at `engine-gmt/topbar.tsx:268`.

## Consequences

- **Menu reorganisation is a topbar edit, not a factory config change.**
  Moving "Reset Position" or adding "Export Cameras" is a single-file edit.
- **Slot 1-9 click handlers MUST route to the same actions as the slot
  hotkeys.** Drift between menu clicks and hotkeys would confuse users —
  the convention is enforced by both paths calling the same library actions
  (which is what `installStateLibrary` exposes anyway).
- **Other library consumers** (Material library, Effect library) that want
  the auto-generated menu set `menu: { … }` instead of `null`. The factory
  supports both modes.
- **The `onSavedToSlot` callback** re-broadcasts the bundle's save as
  `FRACTAL_EVENTS.CAMERA_SLOT_SAVED` for legacy listeners and animation
  hooks (`engine-gmt/store/cameraSlice.ts:285-290`). This is GMT-specific
  glue that the factory doesn't know about; opting out of the menu doesn't
  affect this.
- The 'View Manager' menu entry opens the panel via the standard panel-
  routing infra (`engine-gmt/panels.ts:469` references
  `'panel-cameramanager'`); the menu is purely a navigation hop.
