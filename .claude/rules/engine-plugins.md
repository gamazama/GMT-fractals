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
  than adding a second. That is why `engine-gmt/topbar.tsx` registers its own
  left-slot `fps` only after `installTopBar({ hideDefaults: true })` has skipped the
  default right-slot one (moving an item that is already registered means
  `topbar.unregister(id)` first — the retired first Explorer shell did exactly that),
  and why `menu.register()` namespaces its topbar anchor as `` `menu:${def.id}` ``.
- Cross-cutting infrastructure here (factories, registries, shared primitives)
  MUST carry top-of-file JSDoc covering purpose, integration seams and known
  pitfalls. Don't make callers rediscover the contract from three sibling files.

## Menus without a TopBarHost

A registered menu renders in THREE hosts, all through one row renderer
(`MenuItemList` in `Menu.tsx`): the topbar popover (`MenuAnchor`),
`<MobileMenuHost />`, and an app's own button via `useMenuItems(menuId)` +
`MenuItemList` inside a surface it owns (added 2026-09-13 for the Gradient Explorer
v2 shell, which has no TopBarHost — `gradient-explorer/v2/ShellMenu.tsx`). A host may
prepend its own `MenuItem`s; it must not copy another plugin's items. Changing a row's
markup changes all three. The topbar path is guarded by `smoke:help-menu`
(fluid-toy); the host-button path only by `smoke:ge-phone` steps [2b] and [10], which
also cover Feedback hosted outside a panel router (`useFeedbackOpen`).

## Per-app help (2026-09-13)

Four seams let an app have its own help without forking the Help plugin, all defaulting
to exactly what GMT had: `setHelpTopicsLoader` in `data/help/registry.ts` (the topic map
HelpBrowser, the context menu and installHelp's links read), installHelp's
`shortcutsWhen`, `createWhatsNew` in `engine/plugins/WhatsNew.tsx` (hoisted from
`app-gmt/HelpExtras.tsx`, which now passes GMT's values — its seen key MUST be per app,
see the file's pitfall), and `gmtSupportConfig({ appName })` / `configureFeedback` on the
engine-gmt side. That the defaults held is guarded by `smoke:help-menu` step 6 (fluid-toy:
"Support GMT", "Welcome to GMT"); the Gradient Explorer's use of all four by `smoke:ge-phone`
[11]. Also `installHelp({ hideHints })` — no Show Hints row and no `H` shortcut, for an app
where `store.showHints` gates nothing (GX; guarded by `smoke:ge-phone` [2b]/[11]). Feedback
attachments are app-declared (`configureFeedback({ attachments })`, one-of in the form;
`engine-gmt/feedback/feedbackScreenshot.ts` puts a viewport JPEG inside the one JSON file the
endpoint takes, lazily importing the `modern-screenshot` dependency) — guarded by
`smoke:ge-phone` [3c]/[12] with the endpoint intercepted.

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
`{ autosave: null }` (fluid-toy does, since 2026-09-13; fractal-toy
registers no core settings at all). Session's node guard is
`test:gx-session` [4]–[7]; its wiring guard is `smoke:ge-session` (see `sibling-apps.md`).

## A file offered to the scene loader can be claimed first (2026-09-16)

`engine/plugins/SceneFileClaims.ts`: an app registers a claim (`registerSceneFileClaim`), and every
scene entrance — `SceneFileDropZone`, SceneIO's stock Load row, and any app row replacing it (GMT's
`engine-gmt/utils/loadFilter.ts`) — offers its files through `claimSceneFiles` before reading them
as a scene; a claim resolves to the files it did NOT take. A new scene entrance must call it too, or
it silently skips every claim (grep `claimSceneFiles(`). The scene loader reads ANY JSON as a
preset, so a claim must decide by an unambiguous content marker. The seam's node guard is
`test:scene-file-claims`; the only claim today is the palette's, wired and guarded in a browser by
`smoke:gmt-gradientdrop` (see `palette.md`).

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
npm run smoke:ge-phone           # the host-button menu path only: steps [2b] + [10]
npm run smoke:hud-hint
npm run smoke:pause-controls
npm run test:gx-session          # engine/plugins/Session.ts boot restore + autosave loop; per-app autosave stores + rows
npm run test:scene-file-claims   # engine/plugins/SceneFileClaims.ts only: claim order, removal-only, a throwing claim (node, sub-second)
```