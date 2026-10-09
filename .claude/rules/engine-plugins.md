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

Also under this rule: the topbar's own widgets in `engine/plugins/topbar/`
(`ProjectName`, `FpsCounter`, `PauseControls`, `BucketRenderPanel` +
`BucketRenderController` + `installBucketRender`), `engine/plugins/PwaUpdate.tsx`, and
`engine/plugins/navigation/core/VirtualSpace.ts`. `engine/plugins/RenderLoop.tsx` is NOT
here — see `.claude/rules/tick-and-animation.md`.

- `engine/plugins/viewport/FeatureOverlays.tsx` is the ONE host for the viewport overlays
  features declare (`viewportConfig`): every app shell mounts it (`<FeatureOverlays />`
  inside its viewport frame, `type="scene"` inside an R3F canvas) and none carries its own
  loop. Nothing goes red if an app shell stops MOUNTING it.
- `engine/plugins/navigation/FlyIntegrator.ts` (+ `modifiers.ts`) is the fly integrator GMT
  and the deep-zoom shell both fly with (ADR-0133: it emits displacements to a sink and
  holds no position); `useNavigationInput.ts` beside it is the keys / wheel / look-drag
  hook. Every number in the integrator is pinned to the last bit — read its header before
  touching an expression. `check:deep-zoom-fly-camera` reaches it from the other app.

Decisions: ADR-0021 (slots), ADRs 0022-0023 (shortcuts + per-scope undo),
ADRs 0024-0026 (adaptive resolution), ADRs 0029-0032 (camera / StateLibrary),
ADRs 0009-0010 (tutorial — actionBus over store-monkeypatch, anchor registry
over `data-tut` attributes), ADR-0080 (the runtime UI colour-scheme system — CSS
variables behind Tailwind semantic tokens, `engine/store/colorSchemeStore.ts`).

## Invariants

- **Undo uses per-scope stacks.** Engine-core's unified `undoStack` is the history. App
  slices extend it or register a feature-level extension point; they don't get a parallel
  one and don't override engine-core actions.
- **Shortcut tiebreak is FIRST-registered wins.** `resolve()` in
  `engine/plugins/Shortcuts.ts` scores `scopeIndex*10000 + priority` and returns
  `matches[0]`, so registering later does NOT beat an existing binding — raise `priority`
  or use a deeper scope. `app-gmt/main.tsx`'s `priority: 10` on `gmt.undoCameraMove` is
  load-bearing for this reason. ADR-0022 states the inverse and is stale on this point.
- **Slot registries key by id GLOBALLY, not per slot.** `topbar` and `hud` both ride
  `store/createListRegistry.ts`, one `Map<id, item>`: registering the same id against a
  different slot silently replaces the first entry. Moving a registered item means
  `topbar.unregister(id)` first; `menu.register()` namespaces its topbar anchor as
  `` `menu:${def.id}` ``.
- No feature flag for "the GMT case": scope it via a registered handler,
  `interactionConfig` or `engineConfig.toggleParam`, or extend a predicate
  (`selectMovementLock`).

## Menus without a TopBarHost

A registered menu renders in THREE hosts through one row renderer (`MenuItemList` in
`Menu.tsx`): the topbar popover (`MenuAnchor`), `<MobileMenuHost />`, and an app's own
button via `useMenuItems(menuId)` + `MenuItemList` (`gradient-explorer/v2/ShellMenu.tsx`).
A host may prepend its own `MenuItem`s; it must not copy another plugin's items. Changing
a row's markup changes all three. The topbar path is guarded by `smoke:help-menu`
(fluid-toy); the host-button path only by `smoke:ge-phone` [2b] and [10].

## Per-app help

Four seams let an app have its own help without forking the Help plugin, all defaulting to
what GMT had: `setHelpTopicsLoader` in `data/help/registry.ts`, installHelp's
`shortcutsWhen`, `createWhatsNew` in `engine/plugins/WhatsNew.tsx` (its seen key MUST be
per app), and `gmtSupportConfig({ appName })` / `configureFeedback` on the engine-gmt side.
Also `installHelp({ hideHints })` for an app where `store.showHints` gates nothing.
Feedback attachments are app-declared (`configureFeedback({ attachments })`). The defaults
are guarded by `smoke:help-menu` step 6; the Explorer's use by `smoke:ge-phone` [11], [3c],
[12].

## Two autosaves, and each app has its own settings

Autosave preferences are PER APP (`engine/store/autosaveStore.ts`,
`createAutosaveSettingsStore(keys)`; opt-in everywhere). app-gmt's `useAutosaveSettings`
governs `<UnsavedWorkGuard/>` + SceneIO; the Gradient Explorer's `gxAutosaveSettings`
governs `engine/plugins/Session.ts` (restore at boot, flush on `pagehide`). Session never
goes near `getPreset` / `loadPreset` (ADR-0112, ADR-0121) and takes its store as a
REQUIRED option. The Files ▸ Autosave rows bind whatever store the app hands
`registerCoreSettings({ autosave })`: called bare, an app gets app-gmt's rows, so an app
with no autosave passes `{ autosave: null }`.

## A file offered to the scene loader can be claimed first

`engine/plugins/SceneFileClaims.ts`: an app registers a claim (`registerSceneFileClaim`),
and every scene entrance — `SceneFileDropZone`, SceneIO's stock Load row, any app row
replacing it (`engine-gmt/utils/loadFilter.ts`) — offers its files through
`claimSceneFiles` before reading them as a scene. A new scene entrance must call it too
(grep `claimSceneFiles(`). The scene loader reads ANY JSON as a preset, so a claim must
decide by an unambiguous content marker. The only claim today is the palette's
(`smoke:gmt-gradientdrop`, see `palette.md`).

## Guards

```
npm run test:shortcuts-teardown  # node-only: uninstallShortcuts is the inverse of install
npm run test:nav-replay          # engine/plugins/navigation/FlyIntegrator.ts: 834 scripted frames, bit-exact
npm run smoke:engine-demo        # engine/plugins/viewport/FeatureOverlays.tsx: a declared DOM overlay is drawn
npm run smoke:undo
npm run smoke:camera
npm run smoke:viewport
npm run smoke:viewport-fixed
npm run smoke:help-menu
npm run smoke:ge-phone           # the host-button menu path only: steps [2b] + [10]
npm run smoke:hud-hint
npm run smoke:pause-controls
npm run test:gx-session          # engine/plugins/Session.ts boot restore + autosave loop; per-app autosave stores + rows
npm run test:scene-file-claims   # engine/plugins/SceneFileClaims.ts only (node, sub-second)
npm run smoke:pwa-update         # engine/plugins/PwaUpdate.tsx: BUILDS the app and serves it (the SW is off in dev), ~60 s
```
