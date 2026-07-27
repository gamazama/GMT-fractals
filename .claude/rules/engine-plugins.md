---
paths:
  - "engine/plugins/**"
  - "engine/store/**"
  - "engine/AdaptiveResolution.ts"
  - "app-gmt/tutorial/**"
---

# Engine plugin slots, stores, viewport, shortcuts, undo

Read first: JSDoc on the slot hosts — `engine/plugins/TopBar.tsx`, `Hud.tsx`,
`Menu.tsx`, `Help.tsx`, `SceneIO.tsx`, `RenderDialog/index.tsx` — then
`engine/plugins/Shortcuts.ts` + `Undo.tsx`, `engine/AdaptiveResolution.ts` +
`engine/plugins/Viewport.tsx`, `engine/plugins/Camera.ts` (the slot machinery;
`camera/presetField.ts` is only its preset field) +
`engine/store/createStateLibrarySlice.ts`, `engine/plugins/Tutorial.tsx`.

Also under this rule, and not named above: the topbar's own widgets one level
down in `engine/plugins/topbar/` (`ProjectName`, `FpsCounter`, `PauseControls`,
`BucketRenderPanel` + `BucketRenderController` + `installBucketRender`),
`engine/plugins/PwaUpdate.tsx`, and `engine/plugins/navigation/core/VirtualSpace.ts`
(`.claude/rules/navigation.md` is scoped to `engine-gmt/navigation/**`, not this one).
`engine/plugins/RenderLoop.tsx` is deliberately NOT here — see
`.claude/rules/tick-and-animation.md`.

Decisions: ADR-0021 (slots), ADRs 0022-0023 (shortcuts + per-scope undo),
ADRs 0024-0026 (adaptive resolution), ADRs 0027-0031 (camera / StateLibrary),
ADR-0012 (tutorial).

## Invariants

- **Undo uses per-scope stacks.** Engine-core's unified `undoStack` is the history.
  App slices don't get a parallel one — they either extend engine-core's mechanism
  or register a feature-level extension point.
- **Don't override engine-core actions in app-specific slices.**
- **Shortcut tiebreak is FIRST-registered wins.** `resolve()` in
  `engine/plugins/Shortcuts.ts` scores `scopeIndex*10000 + priority` and returns
  `matches[0]`; the sort is stable over Map insertion order, so registering later
  does NOT beat an existing binding — raise `priority` or use a deeper scope.
  `app-gmt/main.tsx`'s `priority: 10` on `gmt.undoCameraMove` is load-bearing for
  exactly this reason (`installUndo()` claims `Ctrl+Shift+Z` first via
  `redo.global.shift`). ADR-0022 states the inverse and is stale on this point.
- **Slot registries key by id GLOBALLY, not per slot.** `topbar` and `hud` both
  ride `store/createListRegistry.ts`, which is one `Map<id, item>` — registering
  the same id against a *different* slot silently replaces the first entry rather
  than adding a second. That is why `gradient-explorer/main.tsx` must
  `topbar.unregister('fps')` before re-registering its own, and why
  `menu.register()` namespaces its topbar anchor as `` `menu:${def.id}` ``.
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
npm run smoke:hud-hint
npm run smoke:pause-controls
```