# ADR-0032: StateLibrary UI primitives are fully controlled, never own library state

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `components/StateLibraryPanel.tsx`, `engine/components/StateLibraryToast.tsx`, `components/ActiveSnapshotFeatures.tsx`

## Context

`createStateLibrarySlice` already owns the snapshot list, active id,
transient toast field, and notify-dot field. If the UI primitives
also managed local list state, the two would diverge under undo /
preset load / multi-pane scenarios.

## Decision

`StateLibraryPanel` is fully controlled — every piece of snapshot
data plus every handler comes from props; only transient UI
(editId, editName, in-flight drag) lives in `useState`.
`StateLibraryToast` and `ActiveSnapshotFeatures` each subscribe to
exactly one store field via `useEngineStore` and never write to the
store.

## Consequences

- Three primitives that work identically for cameras, views,
  palettes, and any future library.
- App-side shells (e.g. `CameraManagerPanel`) wire the slots
  (`toolbarBefore` / `toolbarAfter` / `footer` / `presets[]`).
- The dead-toast-on-typo silent failure (q-064-adjacent) is a
  contract risk worth a future mount-time validation.
