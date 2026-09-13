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
ADRs 0024-0026 (adaptive resolution), ADRs 0029-0032 (camera / StateLibrary),
ADRs 0009-0010 (tutorial — actionBus over store-monkeypatch, anchor registry
over `data-tut` attributes).

## Two autosaves, and each app has its own settings

Autosave preferences are PER APP (`engine/store/autosaveStore.ts`,
`createAutosaveSettingsStore(keys)`, memoised by key; opt-in everywhere). app-gmt's
`useAutosaveSettings` (`gmt-autosave-enabled` / `gmt-autosave-interval-sec`) governs its
`<UnsavedWorkGuard/>` + SceneIO (stash a dirty scene, restore by hand from File ▸ Restore Last
Session). The Gradient Explorer v2's `gxAutosaveSettings` (`gmt.ge.autosave-*`) governs
`engine/plugins/Session.ts` (restore at boot, flush on `pagehide`). They are not
interchangeable: Session never goes near `getPreset` / `loadPreset`, whose undo wipe and
favourites merge are wrong for it (ADR-0112, ADR-0121). Two things keep the scopes apart and
are easy to undo: Session takes its store as a REQUIRED option (no default to fall back on),
and the Files ▸ Autosave rows bind whatever store the app hands `registerCoreSettings({ autosave })`
— an app that calls it bare gets app-gmt's rows, so an app with no autosave passes
`{ autosave: null }` (fluid-toy and the old Explorer shell do, since 2026-09-13; fractal-toy
registers no core settings at all). Session's node guard is
`test:gx-session` [4]–[7]; its wiring guard is `smoke:ge-session` (see `sibling-apps.md`).

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
npm run test:shortcuts-teardown  # node-only: uninstallShortcuts is the inverse of install
npm run smoke:undo
npm run smoke:camera
npm run smoke:viewport
npm run smoke:viewport-fixed
npm run smoke:help-menu
npm run smoke:hud-hint
npm run smoke:pause-controls
npm run test:gx-session          # engine/plugins/Session.ts boot restore + autosave loop; per-app autosave stores + rows
```