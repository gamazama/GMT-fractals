---
subsystem_id: e07-plugins-host
audited_at: 2026-05-19T00:00:00Z
files:
  - path: engine/plugins/Hud.tsx
    blob_sha: 4473fc75bd024cce164378b0c2e0dab290693cf4
    lines_read: [1, 173]
  - path: engine/plugins/TopBar.tsx
    blob_sha: f1f1b11e4f08499b58a7fbeea92f5bd83b97cf79
    lines_read: [1, 152]
  - path: engine/plugins/Menu.tsx
    blob_sha: f16ff708292676c5f3d9e95d9123fe6875ffb45f
    lines_read: [1, 544]
  - path: engine/plugins/Help.tsx
    blob_sha: 6a76a5695b1754a5cf8513d9bb02817ffb65bc1e
    lines_read: [1, 531]
  - path: engine/plugins/SceneIO.tsx
    blob_sha: a0bc5b4c011c02d1d5e9ccf4b68745686beba8f0
    lines_read: [1, 352]
  - path: engine/plugins/PwaUpdate.tsx
    blob_sha: a7a3bca0abddcebbed707c6ce6215f3849a4824f
    lines_read: [1, 89]
  - path: engine/plugins/topbar/FpsCounter.tsx
    blob_sha: 4627395b725542bd23b9f5b62d5cb45d49072e62
    lines_read: [1, 28]
  - path: engine/plugins/topbar/ProjectName.tsx
    blob_sha: b9484ac15f2a8623f7c3133db5d0cb5262b4569c
    lines_read: [1, 69]
  - path: engine/plugins/topbar/PauseControls.tsx
    blob_sha: 854d03661ec7d6b1065825af80fc2bec69118533
    lines_read: [1, 137]
  - path: engine/plugins/topbar/BucketRenderController.ts
    blob_sha: 0c8ed702cd48826d8aa8b1ee9d79305aa8f092a4
    lines_read: [1, 52]
  - path: engine/plugins/topbar/BucketRenderPanel.tsx
    blob_sha: 0c73b60a26f4451658381cb0ae6920d6b86b2ccb
    lines_read: [1, 676]
  - path: engine/plugins/topbar/installBucketRender.tsx
    blob_sha: e214e662175d8e6d914715fd1e1225288fcb5562
    lines_read: [1, 116]
  - path: engine/plugins/RenderDialog/ConfigForm.tsx
    blob_sha: 2cbbc41630a41f2a5ceb4641018f4bfa6a716e96
    lines_read: [1, 254]
  - path: engine/plugins/RenderDialog/RenderingView.tsx
    blob_sha: 1ece96589c065f22720e990fdb5ab0e1b82e5168
    lines_read: [1, 110]
  - path: engine/plugins/RenderDialog/types.ts
    blob_sha: a901f28352c90094dae7cb3f6187d83c0b864bf6
    lines_read: [1, 158]
  - path: engine/plugins/RenderDialog/index.tsx
    blob_sha: 2bd301edb7e6b0d20452da0862f0175f260822a9
    lines_read: [1, 268]
---

## Public API surface

### Hud (`engine/plugins/Hud.tsx`)
- `hud` registry: `register`, `unregister`, `list`, `clear` (Hud.tsx:57-78).
- `installHud()` / `uninstallHud()` — pure-API plugin, no auto-registered widgets (Hud.tsx:80-89).
- `HudHost: React.FC<{hidden?, className?, region?: 'top'|'bottom'|'all'}>` (Hud.tsx:128-173).
- Types: `HudSlot` (7 named slots), `HudItem` (Hud.tsx:31-44).

### TopBar (`engine/plugins/TopBar.tsx`)
- `topbar` registry: `register`, `unregister`, `list`, `clear` (TopBar.tsx:54-69).
- `installTopBar({ hideDefaults? })` / `uninstallTopBar()` — auto-registers `project-name`, `fps`, `adaptive` unless `hideDefaults` (TopBar.tsx:73-94).
- `TopBarHost: React.FC<{hidden?, className?}>` (TopBar.tsx:105-147).
- Re-exports `ProjectName`, `FpsCounter` (TopBar.tsx:151-152).
- Types: `TopBarSlot` = `'left'|'center'|'right'`, `TopBarItem`, `InstallTopBarOptions` (TopBar.tsx:37-77).

### Menu (`engine/plugins/Menu.tsx`)
- `menu` registry: `register`, `unregister`, `registerItem`, `unregisterItem`, `listMenus`, `listItems`, `clear` (Menu.tsx:187-239).
- `mobileMenu` API: `open`, `close`, `toggle`, `getActive` — backed by `useEngineStore.mobileActiveMenu` (Menu.tsx:177-185).
- `installMenu()` / `uninstallMenu()` — subscribes a queueMicrotask `_notify` to the engine store so toggle items' `isActive()` re-renders (Menu.tsx:241-271).
- `MobileMenuHost: React.FC<{width?, className?}>` — registers a host-mount counter so MenuAnchors switch to side-panel route (Menu.tsx:492-544).
- Types: `MenuItemType` (5 variants), `MenuButtonItem`, `MenuToggleItem`, `MenuSeparatorItem`, `MenuSectionItem`, `MenuCustomItem`, `MenuItem`, `MenuDef` (Menu.tsx:59-138).
- Internal: `MenuAnchor`, `MenuItemView`, `OnOffBadge`, `renderIcon` (Menu.tsx:275-473).

### Help (`engine/plugins/Help.tsx`)
- `installHelp(options: InstallHelpOptions)` / `uninstallHelp()` (Help.tsx:288-409).
- `help` object with `registerHudHint` / `unregisterHudHint` (Help.tsx:471-501).
- `HelpOverlay: React.FC` — renders lazy `HelpBrowser` + `SupportModalHost` (Help.tsx:511-531).
- Types: `InstallHelpOptions`, `TutorialsConfig`, `SupportConfig`, `AboutConfig`, `HudHintKey`, `HudHintConfig` (Help.tsx:231-451).
- Helper FCs: `TutorialsList`, `SupportItem`, `SupportModalHost`, `AboutItem`, `DefaultHudHint` (Help.tsx:125-227, 453-469).

### SceneIO (`engine/plugins/SceneIO.tsx`)
- `installSceneIO(options: InstallSceneIOOptions)` / `uninstallSceneIO()` (SceneIO.tsx:86-172).
- `loadSceneFile(file: File): Promise<Preset|null>` — single public file-loader (SceneIO.tsx:191-197).
- `saveScene(filename?)` — text-format download via registered serializer (SceneIO.tsx:207-212).
- `saveSceneJpg(filename?, quality=0.92)` — no scene metadata (SceneIO.tsx:224-238).
- `saveScenePng(filename?)` — embeds scene via registered serializer (SceneIO.tsx:250-259).
- `SnapshotButton: React.FC` (SceneIO.tsx:338-352).
- Types: `InstallSceneIOOptions` (SceneIO.tsx:38-67).

### PwaUpdate (`engine/plugins/PwaUpdate.tsx`)
- `installPwaUpdate({slot?, order?})` / `uninstallPwaUpdate()` (PwaUpdate.tsx:66-89).
- Internal: `PwaUpdateButton` (PwaUpdate.tsx:27-64).

### topbar/* widgets
- `FpsCounter: React.FC` (FpsCounter.tsx:14-28).
- `ProjectName: React.FC` (ProjectName.tsx:14-69).
- `PauseControls: React.FC` + `installPauseControls({order?})` (PauseControls.tsx:30-138). Registers `pause-controls` into right slot at order -20 by default.
- `BucketRenderController` interface (BucketRenderController.ts:24-52).
- `installBucketRender(options)` — wraps `BucketRenderPanel` in a topbar toggle button (installBucketRender.tsx:38-116). Slot default `'left'`, order `30`, id `'bucket-render'`.
- `BucketRenderPanel: React.FC<{controller, align?}>` — generic 676-line settings popover (BucketRenderPanel.tsx:69-674).

### RenderDialog/*
- `installRenderDialog<TExtra>(options)` — registers via `registerRenderPopup` (index.tsx:53-60).
- Types: `RenderDialogConfig`, `RenderDialogFlags`, `RenderDialogStatus`, `RenderDialogDeps`, `RenderDialogRunner`, `RenderDialogExtraFieldsProps`, `RenderDialogStartContext`, `RenderDialogResolutionPreset`, `InstallRenderDialogOptions` (types.ts:9-158).
- `ConfigForm<TExtra>` (ConfigForm.tsx:58-254).
- `RenderingView: React.FC<RenderingViewProps>` (RenderingView.tsx:28-110).
- Internal: `RenderDialogShell<TExtra>` (index.tsx:69-268).

## Architecture (bullets, each cites file:line)

- **Three near-identical slot-based hosts.** TopBar, Hud, and Menu each maintain a `Map<id,Item>` plus a `Set<()=>void>` subscriber pool, increment a `_rev` counter on mutation, and feed `useSyncExternalStore` to drive re-renders. TopBar.tsx:49-69; Hud.tsx:46-78; Menu.tsx:142-151.
- **Topbar idempotency via id replacement.** `topbar.register({id,…})` just overwrites the existing Map entry — re-install is a no-op (TopBar.tsx:55-57).
- **Topbar default items** are auto-registered by `installTopBar`: `project-name` (left,0), `fps` (right,-10), `adaptive` (right,0). `hideDefaults` opts out (TopBar.tsx:79-88).
- **TopBarHost subscribes to two engine-store fields** (`uiModePreference`, `isDeviceMobile`) explicitly so `when:` predicates that read `isMobileSnapshot()` re-evaluate on toggle/rotate (TopBar.tsx:118-119).
- **Hud has 7 fixed slots and an unusual bottom-left reservation** of ~52px to clear the `TimelineHost` toggle button (Hud.tsx:105-120).
- **Hud `region` prop** allows mounting two hosts (one canvas-relative, one viewport-area-relative) and partitioning slot rendering — `'top'` (top-* + center) vs `'bottom'` vs `'all'` (Hud.tsx:147-151).
- **Menu re-uses TopBar slots transparently.** `menu.register` calls `topbar.register({id: 'menu:'+id, component: () => <MenuAnchor …/>})`; unregister cleans the topbar entry (Menu.tsx:193-208, 232-234).
- **Menu fans out store changes to its own subscribers via `queueMicrotask(_notify)`** — defers the bump so it doesn't fire during another component's render (Menu.tsx:243-265).
- **Menu has a dual-route render strategy**: desktop popover (local `useState`) vs mobile side-panel (driven by engine-store `mobileActiveMenu`). The side-panel route activates only when a `MobileMenuHost` is mounted — tracked via a module-local `_hostMounts` counter so dev-StrictMode double-mount is safe (Menu.tsx:165-175, 296-345, 492-504).
- **Menu has a separate `_notifyRev` counter** appended to `_subscribers` purely to give `useSyncExternalStore` a stable snapshot (Menu.tsx:384-386).
- **Help builds entirely on Menu + Hud + Shortcuts.** Registers a `help` menu, optional Getting Started / Shortcuts / Show Hints / Tutorials / Support / About items, plus a global `H` hotkey (Help.tsx:294-403).
- **Help support modal is a module singleton.** Lives outside the menu popover (which unmounts on click) and is rendered by `<HelpOverlay>` via a portal to `document.body` (Help.tsx:103-158).
- **Help "About" item is local state per-item** — collapsible inline content using `useState` inside `AboutItem` (Help.tsx:165-183).
- **Help tutorials list** subscribes to `subscribeLessons` and reads `tutorialCompleted` from the engine store; one custom slot renders N buttons so re-registration isn't needed (Help.tsx:193-227, 345-359).
- **Help.registerHudHint** wraps `hud.register` with a `when: () => showHints` predicate so the same toggle controls inline hints and HUD pills (Help.tsx:477-495).
- **SceneIO is module-singleton state with module-local vars** (`_getCanvas`, `_parseScene`, `_serializeScene`, `_fileExtension`, `_snapshotAnchor`) updated on every install call even when already installed (SceneIO.tsx:69-91). Note the order: option captures happen BEFORE the `_installed` check.
- **SceneIO `loadSceneFile` is the sole public file loader** by design — comment calls out it must be the only entry point so a missing parser arg can't silently downgrade a GMF load (SceneIO.tsx:182-197).
- **SceneIO's LoadSceneMenuItem is a 'custom' menu item** because a hidden `<input type="file">` must live next to its click target — `'button'` item type can't carry it (SceneIO.tsx:281-334).
- **SceneIO routes `loadScene` (not `loadPreset`)** so the worker gets a synchronous `CONFIG_DONE` flush instead of the 200ms debounce (SceneIO.tsx:298-306).
- **PwaUpdate is a TopBar-only plugin** consuming `virtual:pwa-register/react`; build will fail without `vite-plugin-pwa` (PwaUpdate.tsx:13, 22).
- **FpsCounter sources from `useViewportFps`**, not directly from the engine — generic across render engines (FpsCounter.tsx:6-7, 14-15).
- **PauseControls computes `isEffectivePaused` from three orthogonal stores** (`renderControlSlice.isPaused`, `selectIsGlobalInteraction`, `animationStore.isCameraInteracting`, `animationStore.isScrubbing`) and a hover Popover for the sample cap slider (PauseControls.tsx:31-49).
- **BucketRenderPanel is a 676-line, app-agnostic ported component** parameterised on a `BucketRenderController`. Optional `setPreviewRegion`/`clearPreviewRegion`/picking degrade gracefully (BucketRenderPanel.tsx:1-13, 79).
- **BucketRenderPanel owns major host-app side-effects**: suppresses adaptive resolution, swaps to Fixed resolution mode to match aspect, manages preview region lifecycle, polls accumulationCount every 100ms (BucketRenderPanel.tsx:135-187, 224-270).
- **installBucketRender measures button rect on open** and picks `'center'|'start'|'end'` alignment so the panel doesn't clip the viewport (installBucketRender.tsx:54-67).
- **installBucketRender blocks outside-click dismissal** during active render / preview region / preview-picking mode (installBucketRender.tsx:69-89).
- **RenderDialog uses generic `<TExtra>`** so each app supplies a typed extras bag for app-specific knobs (multi-pass, internal-scale, depth-range in app-gmt) (RenderDialog/index.tsx:53-60, types.ts:41-50).
- **RenderDialog installs via `registerRenderPopup`** — not topbar / menu directly (RenderDialog/index.tsx:27, 59).
- **RenderDialog runners speak 0..1 progress**; `setProgress` adapter scales to 0..100 percent for UI (RenderDialog/index.tsx:201-203, types.ts:31-32).
- **RenderDialog auto-recommends bitrate** as `40 * (w*h)/(1920*1080)` Mbps on resolution change — overwrites user value (RenderDialog/index.tsx:114-118).
- **RenderDialog auto-tracks `animStore.fps`** unless `defaults.fps` is supplied (RenderDialog/index.tsx:104-108).
- **RenderDialog window position defaults to right-anchored** with a 320px right margin (RenderDialog/index.tsx:156-160).
- **RenderingView has no width transition** on the progress bar — comment explains runners push faster than 300ms so transitions stall visibly (RenderingView.tsx:43-54).
- **ConfigForm DEFAULT_RES_PRESETS** is a hardcoded 7-item social-media-flavoured list; apps can pass `resolutionPresets` (array or function) to replace it (ConfigForm.tsx:18-26, 77-79).

## Invariants and gotchas

- **TopBar/Hud/Menu all use module-level state.** Multiple engine instances in one tab will share registries — testing-only `clear()` exists for hot-reload (TopBar.tsx:65-68; Hud.tsx:73-77; Menu.tsx:232-238).
- **Menu's queueMicrotask defer is load-bearing.** Comment explicitly notes that immediate `_notify` triggers React's "Cannot update component while rendering another" warning (Menu.tsx:253-264).
- **Hud subscriber leak on re-register-after-clear** — `_insertCounter` is reset by `clear()` so re-registration restarts at 0 (Hud.tsx:73-77); but `_subscribers` are intentionally NOT cleared.
- **TopBar/Hud/Menu registries are mutated in place** with monotonic rev. `useSyncExternalStore` snapshot returns the rev, not the items; consumers iterate `_items` fresh each render (Hud.tsx:139-145; Menu.tsx:289-296; TopBar.tsx:120).
- **SceneIO `_installed` short-circuits AFTER capturing options** so re-install can update `_getCanvas` / `_parseScene` / `_serializeScene` etc. without re-running registrations (SceneIO.tsx:87-93). This breaks the "install\* is idempotent" rule for state-capture purposes.
- **SceneIO PNG/JPG are hidden when no `getCanvas` is registered** at install time — apps that supply `getCanvas` AFTER install miss the menu items (SceneIO.tsx:122-148).
- **PauseControls progress bar tone**: `paused|done|active` mapped to amber/green/cyan; `progress > 0` controls the fill (PauseControls.tsx:51-86).
- **Menu items support live label**: `label: string | (() => string)` re-evaluated each render so e.g. "Slot 3 ✓" can update (Menu.tsx:71-89, 420, 448).
- **Menu items support `disabled` as bool OR predicate** for live state (Undo/Redo enable/disable) (Menu.tsx:82-99, 419, 447).
- **BucketRenderPanel's resolution swap on mount** snapshots PRE-SWAP viewport size and uses that snapshot for all subsequent fit calcs — avoids drift from the progressively-shrinking Fixed canvas (BucketRenderPanel.tsx:139-148).
- **BucketRenderPanel guards Fixed-mode revert with `didSwapResolutionRef`** so toggling the popover at defaults doesn't reset accumulation (BucketRenderPanel.tsx:152-187).
- **RenderDialog's bitrate auto-recommend overwrites user input** on every `cfg.width`/`cfg.height` change — even mid-form (RenderDialog/index.tsx:114-118). User edits to bitrate survive only until next resolution edit.
- **RenderDialog `onMount` runs unconditionally**; cleanup runs on unmount (RenderDialog/index.tsx:171-174).
- **Help `(useEngineStore.getState() as any)` casts**: showHints, openHelp, closeHelp, helpWindow, setShowHints, tutorialCompleted, startTutorial are accessed without typed selectors — assumes app has merged these into engineStore (Help.tsx:196-198, 311-340, 392-399, 492, 512-515).
- **MobileMenuHost _hostMounts is a counter not a bool** — explicit comment notes StrictMode double-mount safety (Menu.tsx:498-504).
- **TopBar registers `pwa-update` at order -100**, well before fps/adaptive's -10/0 — leftmost in right slot (PwaUpdate.tsx:79-82).

## Drift from existing doc (`dev/docs/engine/04_Core_Plugins.md`)

| Doc claim | Current code | Severity |
|---|---|---|
| "Eight shipped plugins as of 2026-04-23" (line 19); table lists viewport, topbar, scene-io, render-loop, shortcuts, undo, camera, animation, environment | Code also ships `@engine/menu`, `@engine/help`, `@engine/hud`, `@engine/pwa-update`, `@engine/render-dialog`, plus topbar widgets (PauseControls, BucketRender). Not in doc at all. | **High — doc is significantly out of date** |
| `installSceneIO({ fields?: SceneFieldDescriptor[] })` with `sceneIO.registerField({...})` API (lines 33-52) | No such API. Actual signature: `installSceneIO({ getCanvas?, parseScene?, serializeScene?, fileExtension?, snapshotAnchor? })` (SceneIO.tsx:38-67). No `fields`/`registerField`. | **High — fictional API documented** |
| "scene-io provides `<SaveMenu />`, `<LoadDropZone />`" (lines 58-60) | No such components exported. Save/load are menu items registered on `@engine/menu`'s `file` menu, plus a `SnapshotButton` (SceneIO.tsx:102-148, 338-352). | **High** |
| "Hotkey bindings (via @engine/shortcuts): Ctrl+S save, Ctrl+O load" (line 61) | Only `Alt+S` registered for quick PNG (SceneIO.tsx:153-159). No Ctrl+S, no Ctrl+O. | **High** |
| "TopBar slot registration: save/load menu in the right slot" (line 62) | Correct: `file` menu registers in `right` slot at order 29.5 (SceneIO.tsx:102-110). | OK |
| `installTopBar({ slots?: string[] })` — configurable slots (line 79) | Actual signature: `installTopBar({ hideDefaults? })` (TopBar.tsx:73-77). Slots are hardcoded `'left'|'center'|'right'`. | **High** |
| `topbar.register({ when: (state) => state.canSave })` — `when` receives state arg (line 87) | Actual: `when?: () => boolean` (no args; predicate closes over its own state) (TopBar.tsx:39-45). | **Medium** |
| "Default registrations when installed: 'left':0 ProjectName, 'right':0 HelpMenu" (lines 97-99) | Actual defaults: `project-name` left:0, `fps` right:-10, `adaptive` right:0 (TopBar.tsx:85-87). No HelpMenu among topbar defaults — Help is its own opt-in plugin. | **High** |
| "@engine/screenshot registers camera button" (line 104) | No `@engine/screenshot` plugin; folded into SceneIO as `SnapshotButton` with image icon (not camera) — actually doc line 271-278 in SceneIO calls out the icon distinction. | **Medium** |
| "@engine/undo registers undo/redo buttons" (line 105) | Out of scope for this audit (Undo subsystem). Not verified here. | Skip — out of scope |
| Screenshot folded into scene-io with Alt+S, identical byte output (lines 66-71) | Correct (SceneIO.tsx:147, 153-159, 250-259). | OK |
| No mention of `@engine/menu`, `@engine/help`, `@engine/hud`, `@engine/pwa-update`, `@engine/render-dialog`, `BucketRenderPanel`/`installBucketRender`, `PauseControls` | All five plugins + two topbar widgets exist and have full APIs as documented in this survey. | **High — entire subsystem undocumented** |
| Decision "2026-04-22 — Nine core plugins, not fewer or more. Other candidates (help-browser, PWA-update-prompt, hardware-prefs) stay app-specific" (lines 211-214) | Reality: help-browser is now `@engine/help` plugin (Help.tsx); PWA-update is now `@engine/pwa-update` (PwaUpdate.tsx). Decision was reversed without doc update. | **High — closed decision contradicts current code** |

**Recommendation: rewrite.** 13 rows, most break. The doc was written for the original 8-plugin lineup and never updated as Menu/Help/Hud/PwaUpdate/RenderDialog + BucketRender + PauseControls shipped. The `21_Code_Review_2026-04-25.md` "plugin pattern not uniform" note also lands here: SceneIO uses module-state singletons, Menu uses queueMicrotask-deferred fanout, Hud uses insertion-counter ordering, RenderDialog uses generics, BucketRender uses a controller interface. Each plugin invented its own contract.

## Open questions

- `engine/plugins/RenderLoop.tsx`, `engine/plugins/Camera.ts`, `engine/plugins/Undo.tsx`, `engine/plugins/Viewport.tsx`, `engine/plugins/Shortcuts.ts`, `engine/plugins/Tutorial.tsx` — out of scope for this iteration; live in adjacent subsystems.
- `engine/plugins/camera/`, `engine/plugins/navigation/`, `engine/plugins/tutorial/`, `engine/plugins/viewport/` subdirs — not audited; presumably covered by their dedicated subsystem audits.
- `engine/animation/renderPopupRegistry` — RenderDialog calls `registerRenderPopup(RenderDialog)`. Out of scope; this is the registry side of animation.
- `engine/plugins/topbar/AdaptiveResolutionBadge` — imported by TopBar.tsx:34 but lives under `viewport/` (TopBar.tsx imports from `./viewport/AdaptiveResolutionBadge`). Should it be under topbar/ or viewport/?
- `installBucketRender` is reachable but `BucketRenderPanel.tsx` imports from `engine-gmt` (`../../FractalEvents`, `../../export/BucketRenderTypes`, `../../store/engineStore`) — confirm these are real `engine/` paths and not the legacy `engine-gmt/` fork the comment at BucketRenderPanel.tsx:4-5 alludes to.
- `_supportModal` in Help.tsx is a true module singleton without a `clear()` analogue — if `uninstallHelp()` is called while a support modal is open, the portal stays in the DOM.
- SceneIO's `loadSceneFile` is exported as the "single public file-loader" (SceneIO.tsx:182-197), but `loadScene` (engine-store) is the actual side-effect entry. Worth documenting the layering for app authors.
