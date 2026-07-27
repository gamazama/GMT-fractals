---
paths:
  - "engine/plugins/**"
  - "engine/store/**"
  - "engine/AdaptiveResolution.ts"
  - "app-gmt/tutorial/**"
---

# Engine plugin slots, stores, viewport, shortcuts, undo

Read first: JSDoc on `engine/plugins/*.tsx` (TopBar / Hud / Menu / SceneIO /
RenderDialog slot hosts), `engine/plugins/Shortcuts.ts` + `Undo.tsx`,
`engine/AdaptiveResolution.ts` + `engine/plugins/Viewport.tsx`,
`engine/plugins/camera/*` + `engine/store/createStateLibrarySlice.ts`,
`engine/plugins/Tutorial.tsx`.

Decisions: ADR-0021 (slots), ADRs 0022-0023 (shortcuts + per-scope undo),
ADRs 0024-0026 (adaptive resolution), ADRs 0027-0031 (camera / StateLibrary),
ADR-0012 (tutorial).

## Invariants

- **Undo uses per-scope stacks.** Engine-core's unified `undoStack` is the history.
  App slices don't get a parallel one — they either extend engine-core's mechanism
  or register a feature-level extension point.
- **Don't override engine-core actions in app-specific slices.**
- Cross-cutting infrastructure here (factories, registries, shared primitives)
  MUST carry top-of-file JSDoc covering purpose, integration seams and known
  pitfalls. Don't make callers rediscover the contract from three sibling files.

## Scope app-specific behaviour properly

No feature flag for "the GMT case". Scope it via a registered handler,
`interactionConfig`, or `engineConfig.toggleParam` — never an inline conditional
in shared code. Extending a predicate (`selectMovementLock`) beats adding a local
flag to Navigation.

## Guards

```
npm run smoke:undo
npm run smoke:camera
npm run smoke:viewport
npm run smoke:viewport-fixed
npm run smoke:help-menu
```