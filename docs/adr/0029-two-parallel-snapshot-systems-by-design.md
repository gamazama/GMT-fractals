# ADR-0029: Two parallel snapshot systems by design (camera plugin + StateLibrary)

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/plugins/Camera.ts`, `engine/store/installStateLibrary.ts`

## Context

The lightweight `@engine/camera` adapter plugin stores up to 9
opaque-JSON snapshots in `cameraSlots[]` with no list UI. The richer
`installStateLibrary` factory adds `StateSnapshot<T>` envelopes with
labels / thumbnails / drag-reorder / inline-rename / multi-library
support. Apps' needs split — fractal-toy is happy with the
lightweight slots; GMT and fluid-toy need the managed library UX.

## Decision

Neither system is deprecated. Apps that want both install
`installCamera({ hideShortcuts: true })` for the preset round-trip +
`window.__camera` dev handle AND `installStateLibrary` for the
managed library. The camera plugin's adapter is intentionally never
registered in dual-install apps; save/recall via the camera plugin
would no-op anyway.

## Consequences

- `Ctrl+1..9` binds in exactly one system per app (controlled by
  `hideShortcuts`).
- Two storage keys, two action surfaces, two shortcut registries.
- A future palettes / brush-presets library follows the
  `installStateLibrary` template (not the camera plugin)
  (followup q-065).
