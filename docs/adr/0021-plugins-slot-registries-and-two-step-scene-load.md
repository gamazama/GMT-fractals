# ADR-0021: Plugin slot registries and two-step scene load

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/plugins/TopBar.tsx`, `engine/plugins/Hud.tsx`, `engine/plugins/Menu.tsx`, `engine/plugins/SceneIO.tsx`

## Context

Three near-identical slot registries (TopBar, Hud, Menu) plus
several composed plugins; each plugin reinvented its own
state-capture shape (module-state singletons, queueMicrotask fanout,
`_insertCounter` for ordering, controller-interface params). A
one-step `loadSceneFile` that called `loadPreset` directly skipped
the compile gate, the post-boot full-config flush, the worker
`OFFSET_SET`, and the `CONFIG_DONE` debounce-skip — post-boot loads
rendered as a fallback sphere.

## Decision

- Accept slot-registry divergence: every plugin's `install*` is
  idempotent for the registration block, but capture-deps semantics
  vary by plugin. Re-registration is REPLACEMENT (`Map.set`), not
  append, across all three substrate registries.
- `loadSceneFile` is a pure decoder (File → Preset | null); callers
  MUST follow with `useEngineStore.getState().loadScene({ preset })`
  which orchestrates the full apply pipeline.

## Consequences

- No uniform plugin contract — the original "install* is idempotent"
  rule does NOT hold uniformly (SceneIO breaks it deliberately for
  captured deps).
- The two-call scene-load API is documented at the load-menu
  callsite and on the `loadSceneFile` JSDoc; future load entry points
  (e.g. drag-drop) must follow the same pattern.
