---
source: engine/plugins/TopBar.tsx
lines: 152
last_verified_sha: f1f1b11e4f08499b58a7fbeea92f5bd83b97cf79
additional_sources:
  - engine/plugins/Hud.tsx
  - engine/plugins/Menu.tsx
  - engine/plugins/Help.tsx
  - engine/plugins/SceneIO.tsx
  - engine/plugins/PwaUpdate.tsx
  - engine/plugins/topbar/FpsCounter.tsx
  - engine/plugins/topbar/ProjectName.tsx
  - engine/plugins/topbar/PauseControls.tsx
  - engine/plugins/topbar/BucketRenderController.ts
  - engine/plugins/topbar/BucketRenderPanel.tsx
  - engine/plugins/topbar/installBucketRender.tsx
  - engine/plugins/RenderDialog/index.tsx
  - engine/plugins/RenderDialog/types.ts
  - engine/plugins/RenderDialog/ConfigForm.tsx
  - engine/plugins/RenderDialog/RenderingView.tsx
audited: 2026-05-20T15:30:00Z
audited_by: claude-opus-4-7
public_api:
  - topbar
  - installTopBar
  - uninstallTopBar
  - TopBarHost
  - type TopBarSlot
  - type TopBarItem
  - type InstallTopBarOptions
  - hud
  - installHud
  - uninstallHud
  - HudHost
  - type HudSlot
  - type HudItem
  - menu
  - mobileMenu
  - installMenu
  - uninstallMenu
  - MobileMenuHost
  - type MenuItemType
  - type MenuButtonItem
  - type MenuToggleItem
  - type MenuSeparatorItem
  - type MenuSectionItem
  - type MenuCustomItem
  - type MenuItem
  - type MenuDef
  - installHelp
  - uninstallHelp
  - help
  - HelpOverlay
  - type InstallHelpOptions
  - type TutorialsConfig
  - type SupportConfig
  - type AboutConfig
  - type HudHintKey
  - type HudHintConfig
  - installSceneIO
  - uninstallSceneIO
  - loadSceneFile
  - saveScene
  - saveSceneJpg
  - saveScenePng
  - SnapshotButton
  - type InstallSceneIOOptions
  - installPwaUpdate
  - uninstallPwaUpdate
  - type InstallPwaUpdateOptions
  - FpsCounter
  - ProjectName
  - PauseControls
  - installPauseControls
  - type BucketRenderController
  - type BucketPreviewRegion
  - installBucketRender
  - type InstallBucketRenderOptions
  - installRenderDialog
  - type RenderDialogConfig
  - type RenderDialogFlags
  - type RenderDialogStatus
  - type RenderDialogDeps
  - type RenderDialogRunner
  - type RenderDialogExtraFieldsProps
  - type RenderDialogStartContext
  - type RenderDialogResolutionPreset
  - type InstallRenderDialogOptions
  - ConfigForm
  - RenderingView
depends_on:
  - e02-tick-registry
  - e03-animation
  - e06-adaptive-resolution
  - e08-shortcuts-undo
  - a03-tutorial
---

# Engine plugins host

The plugins-host subsystem is the family of chrome plugins that apps install to get a consistent topbar, hover/click menus, in-canvas HUD overlays, save/load wiring, an updater pill, a pause widget, a video-export dialog, and a bucket-render dialog — without each app re-implementing the layout shell. Three near-identical slot registries (`topbar`, `hud`, `menu`) form the substrate; the remaining plugins (`Help`, `SceneIO`, `PwaUpdate`, `PauseControls`, `BucketRender`, `RenderDialog`) compose on top of those registries plus the engine store, shortcuts, and tutorial anchors. Each plugin exposes its own `install*` / `uninstall*` pair; only the registry triplet auto-registers default items.

## Public API

### Slot registries

| Symbol | Kind | Cite |
|---|---|---|
| `topbar` | object with `register`/`unregister`/`list`/`clear` | engine/plugins/TopBar.tsx:54-69 |
| `installTopBar({ hideDefaults? })` / `uninstallTopBar()` | install pair; auto-registers `project-name`, `fps`, `adaptive` unless `hideDefaults` | engine/plugins/TopBar.tsx:79-94 |
| `TopBarHost: React.FC<{hidden?, className?}>` | horizontal header with left/center/right slot rows | engine/plugins/TopBar.tsx:105-147 |
| `TopBarSlot` = `'left' \| 'center' \| 'right'` | type | engine/plugins/TopBar.tsx:37 |
| `TopBarItem`, `InstallTopBarOptions` | types | engine/plugins/TopBar.tsx:39-77 |
| `hud` | object with `register`/`unregister`/`list`/`clear` | engine/plugins/Hud.tsx:57-78 |
| `installHud()` / `uninstallHud()` | pure-API install pair (no auto-registered widgets) | engine/plugins/Hud.tsx:80-89 |
| `HudHost: React.FC<{hidden?, className?, region?}>` | absolutely-positioned in-canvas overlay; `region` ∈ `'top'\|'bottom'\|'all'` | engine/plugins/Hud.tsx:128-173 |
| `HudSlot` (7 named slots), `HudItem` | types | engine/plugins/Hud.tsx:31-44 |
| `menu` | object with `register`/`unregister`/`registerItem`/`unregisterItem`/`listMenus`/`listItems`/`clear` | engine/plugins/Menu.tsx:187-239 |
| `mobileMenu` | object with `open`/`close`/`toggle`/`getActive` (backed by `useEngineStore.mobileActiveMenu`) | engine/plugins/Menu.tsx:177-185 |
| `installMenu()` / `uninstallMenu()` | install pair; subscribes a `queueMicrotask(_notify)` to the engine store so toggle items' `isActive()` re-render | engine/plugins/Menu.tsx:243-271 |
| `MobileMenuHost: React.FC<{width?, className?}>` | side-panel route; bumps `_hostMounts` so MenuAnchors switch from popover to side-panel | engine/plugins/Menu.tsx:492-544 |
| `MenuItemType`, `MenuButtonItem`, `MenuToggleItem`, `MenuSeparatorItem`, `MenuSectionItem`, `MenuCustomItem`, `MenuItem`, `MenuDef` | types | engine/plugins/Menu.tsx:59-138 |

### Composed plugins

| Symbol | Cite |
|---|---|
| `installHelp(options)` / `uninstallHelp()` | engine/plugins/Help.tsx:290-409 |
| `help` (`registerHudHint` / `unregisterHudHint`) | engine/plugins/Help.tsx:471-501 |
| `HelpOverlay: React.FC` (lazy `HelpBrowser` + `SupportModalHost` portal) | engine/plugins/Help.tsx:511-531 |
| `InstallHelpOptions`, `TutorialsConfig`, `SupportConfig`, `AboutConfig`, `HudHintKey`, `HudHintConfig` types | engine/plugins/Help.tsx:231-451 |
| `installSceneIO(options)` / `uninstallSceneIO()` | engine/plugins/SceneIO.tsx:86-172 |
| `loadSceneFile(file)` → `Promise<Preset \| null>` (the **single** public file-loader) | engine/plugins/SceneIO.tsx:191-197 |
| `saveScene(filename?)` (text via registered serializer) | engine/plugins/SceneIO.tsx:207-212 |
| `saveSceneJpg(filename?, quality=0.92)` (no scene metadata) | engine/plugins/SceneIO.tsx:224-238 |
| `saveScenePng(filename?)` (embeds scene via registered serializer) | engine/plugins/SceneIO.tsx:250-259 |
| `SnapshotButton: React.FC` | engine/plugins/SceneIO.tsx:338-352 |
| `InstallSceneIOOptions` type | engine/plugins/SceneIO.tsx:38-67 |
| `installPwaUpdate({slot?, order?})` / `uninstallPwaUpdate()` / `InstallPwaUpdateOptions` | engine/plugins/PwaUpdate.tsx:66-89 |
| `FpsCounter: React.FC` | engine/plugins/topbar/FpsCounter.tsx:14-28 |
| `ProjectName: React.FC` | engine/plugins/topbar/ProjectName.tsx:14-69 |
| `PauseControls: React.FC` + `installPauseControls({order?})` | engine/plugins/topbar/PauseControls.tsx:30-137 |
| `BucketRenderController`, `BucketPreviewRegion` interfaces | engine/plugins/topbar/BucketRenderController.ts:17-52 |
| `installBucketRender(options)` + `InstallBucketRenderOptions` | engine/plugins/topbar/installBucketRender.tsx:21-116 |
| `installRenderDialog<TExtra>(options)` (registers via `registerRenderPopup`) | engine/plugins/RenderDialog/index.tsx:53-60 |
| `RenderDialogConfig`, `RenderDialogFlags`, `RenderDialogStatus`, `RenderDialogDeps`, `RenderDialogRunner`, `RenderDialogExtraFieldsProps`, `RenderDialogStartContext`, `RenderDialogResolutionPreset`, `InstallRenderDialogOptions` | engine/plugins/RenderDialog/types.ts:9-158 |
| `ConfigForm<TExtra>` | engine/plugins/RenderDialog/ConfigForm.tsx:58-254 |
| `RenderingView: React.FC<RenderingViewProps>` | engine/plugins/RenderDialog/RenderingView.tsx:28-110 |

## Architecture

### The slot-registry triplet

- **`TopBar`, `Hud`, and `Menu` all share the same shape**: a module-scope `Map<id, Item>`, a `Set<() => void>` of subscribers, a monotonic `_rev` counter bumped on mutation, and a `useSyncExternalStore` subscription that returns `_rev` (engine/plugins/TopBar.tsx:49-69; engine/plugins/Hud.tsx:46-78; engine/plugins/Menu.tsx:142-151).
- **Re-registration is replacement.** `topbar.register({id,…})` overwrites the existing Map entry; the same applies for `hud.register` and `menu.registerItem`. There is no append-only mode (engine/plugins/TopBar.tsx:55-57; engine/plugins/Hud.tsx:58-66; engine/plugins/Menu.tsx:210-220).
- **TopBar auto-registers three defaults** under `installTopBar` unless `hideDefaults` is passed: `project-name` left:0, `fps` right:-10, `adaptive` right:0 (engine/plugins/TopBar.tsx:85-87). The "adaptive" badge component lives at `engine/plugins/viewport/AdaptiveResolutionBadge.tsx` and is imported by the host (engine/plugins/TopBar.tsx:34); see followup q-051 for the "should it live under topbar/?" placement question.
- **Hud is a pure-API plugin**: `installHud()` registers nothing on its own; apps and other plugins (notably `help.registerHudHint`) call `hud.register` for each widget (engine/plugins/Hud.tsx:80-89).
- **Hud has a fixed 7-slot grid** with a hardcoded `bottom-16` (~52px) bottom-left offset that reserves room for the GMT TimelineHost's toggle button so the two never overlap (engine/plugins/Hud.tsx:105-120).
- **Hud `region` prop** allows mounting two hosts (one canvas-relative, one viewport-area-relative) and partitioning which slot rows each renders — `'top'` shows top-* + center, `'bottom'` shows bottom-*, `'all'` shows everything (engine/plugins/Hud.tsx:147-151).
- **Menu sits on top of TopBar.** `menu.register(def)` calls `topbar.register({id: 'menu:'+def.id, slot: def.slot, order: def.order, when: def.when, component: () => <MenuAnchor menuId={def.id}/>})`; `menu.unregister` cleans up the corresponding topbar entry (engine/plugins/Menu.tsx:193-208, 232-234). There is no separate menu host — the topbar host is where menu anchors render.
- **Menu fan-out is deferred via `queueMicrotask(_notify)`** inside `installMenu`'s `useEngineStore.subscribe` callback. Zustand's subscriber fires synchronously during `setState`; immediate `_notify` would call `setState` on subscribers' `useSyncExternalStore` mid-render and trigger React's "Cannot update a component while rendering" warning. The microtask defers the bump to after the current render commit (engine/plugins/Menu.tsx:243-265).
- **Menu has a dual-route render strategy.** Desktop uses a local `useState` popover; mobile (when a `MobileMenuHost` is mounted) uses the engine-store-backed `mobileActiveMenu`. The mobile route activates only when `_hostMounts > 0`, tracked through a module-local counter so StrictMode's dev double-mount is safe (engine/plugins/Menu.tsx:165-175, 492-504).
- **Menu items support live label and disabled.** `label: string | (() => string)` is re-evaluated each render (e.g. "Slot 3 ✓" once filled); `disabled: boolean | (() => boolean)` likewise (engine/plugins/Menu.tsx:71-99).
- **TopBarHost subscribes to two extra engine-store fields**, `uiModePreference` and `isDeviceMobile`, purely so `when:` predicates that read mobile snapshot re-evaluate on toggle/rotate (engine/plugins/TopBar.tsx:118-119).

### Help

- **Help builds entirely on Menu + Hud + Shortcuts.** `installHelp` registers a `help` menu (right slot, order 40), optional Getting Started / Shortcuts items, the mandatory Show Hints toggle, optional Tutorials / Support / About entries, and a global `H` hotkey via `shortcuts.register` (engine/plugins/Help.tsx:294-403).
- **The Support modal is a module singleton.** It lives outside the menu popover (which unmounts on click) and is rendered by `<HelpOverlay>` via a portal to `document.body` (engine/plugins/Help.tsx:95-103, 511-531).
- **Tutorials are rendered as a single `'custom'` menu item**, not N buttons; this avoids re-registration churn whenever `subscribeLessons` fires or completion state changes (engine/plugins/Help.tsx:349-358).
- **`help.registerHudHint`** wraps `hud.register` with a `when: () => !!showHints` predicate so the same H toggle controls both inline param hints and HUD pill hints (engine/plugins/Help.tsx:477-495).
- **All engine-store access goes through `useEngineStore.getState() as any`.** Help expects apps to have merged `showHints`, `openHelp`, `closeHelp`, `helpWindow`, `setShowHints`, `tutorialCompleted`, `startTutorial` into the engine store; there is no typed selector contract (engine/plugins/Help.tsx:311-340, 392-401, 512-515).

### SceneIO

- **Module-singleton state.** `_getCanvas`, `_parseScene`, `_serializeScene`, `_fileExtension`, `_snapshotAnchor` are module-local. `installSceneIO` captures option values into these BEFORE the `_installed` short-circuit, so reinstall updates the captured deps even though it skips the registration block (engine/plugins/SceneIO.tsx:69-93).
- **File menu registers via `menu` (not `topbar` directly).** It lands in the right slot at order 29.5 to slot between the GMT camera menu (29) and System (30). The menu plugin then handles desktop popover vs `MobileMenuHost` side-panel rendering uniformly (engine/plugins/SceneIO.tsx:102-110).
- **PNG/JPG menu items and the topbar SnapshotButton are gated on `_getCanvas`** at install time; an app that registers `getCanvas` AFTER install will miss them (engine/plugins/SceneIO.tsx:122-148).
- **`Alt+S` is the screenshot shortcut**, registered through the shortcuts plugin. `Ctrl+S` / `Ctrl+Shift+S` are browser-reserved and never reach JS; the inline comment calls this out explicitly (engine/plugins/SceneIO.tsx:150-159).
- **The Load entry is a `'custom'` menu item, not `'button'`**, because a hidden `<input type="file">` must live next to its click target and `'button'` items can't carry it (engine/plugins/SceneIO.tsx:280-334).
- **`loadSceneFile` is pure (decoder only).** `File → Preset | null`: format-detects PNG vs raw text, routes through the registered parser, returns. It does not touch the engine store, does not flush the worker, does not start a compile (engine/plugins/SceneIO.tsx:191-197). See "Two-step load contract" below.
- **PNG snapshot routes through `activeSerializer()`** so the iTXt payload matches `saveScene`'s text output byte-for-byte; a saved PNG round-trips through `loadSceneFile` cleanly (engine/plugins/SceneIO.tsx:250-259).

### Bucket-render and pause widgets

- **`PauseControls` derives `isEffectivePaused` from four orthogonal store fields**: `renderControlSlice.isPaused`, `selectIsGlobalInteraction`, `animationStore.isCameraInteracting`, `animationStore.isScrubbing`. The button has three visual tones — paused (amber), done (green), active/accumulating (cyan) — driven by the same lookup (engine/plugins/topbar/PauseControls.tsx:30-62).
- **`installPauseControls` puts the button at right:-20 by default**, just left of the FPS counter at -10 (engine/plugins/topbar/PauseControls.tsx:128-137).
- **`BucketRenderPanel` is a 676-line, app-agnostic ported component** parameterised on `BucketRenderController`. Optional `setPreviewRegion`/`clearPreviewRegion` degrade gracefully when the controller omits them (e.g. fluid-toy v1) (engine/plugins/topbar/BucketRenderPanel.tsx:1-13, 79).
- **The panel owns several host-app side effects on mount/unmount.** It suppresses adaptive resolution, swaps to Fixed mode to match output aspect, manages preview-region lifecycle, and polls `controller.accumulationCount` every 100ms (engine/plugins/topbar/BucketRenderPanel.tsx:112-187).
- **Resolution-swap snapshots the PRE-SWAP viewport pixel size** at mount and uses that snapshot for all subsequent fit calcs — without this, repeated output-dim edits would drift against the progressively-shrinking Fixed canvas (engine/plugins/topbar/BucketRenderPanel.tsx:139-148, 156-164).
- **Fixed-mode revert is guarded by `didSwapResolutionRef`** so toggling the popover at defaults does not bounce the resolution mode and reset accumulation (engine/plugins/topbar/BucketRenderPanel.tsx:153-154, 179-184).
- **`installBucketRender` measures the button rect on open** and picks `'center' | 'start' | 'end'` alignment so the w-72 panel never clips the viewport edge (engine/plugins/topbar/installBucketRender.tsx:55-67).
- **Outside-click dismissal is blocked** during active render, an active preview region, or preview-pick interaction mode (engine/plugins/topbar/installBucketRender.tsx:69-89).

### RenderDialog

- **Generic in `TExtra`.** Each app supplies a typed extras bag for app-specific knobs (multi-pass, internal-scale, depth-range in app-gmt); the plugin owns the standard form, capability check, disk-mode detection, flags/status (engine/plugins/RenderDialog/index.tsx:53-60; engine/plugins/RenderDialog/types.ts:41-50, 77-158).
- **Installs via `registerRenderPopup`, not `topbar`/`menu`.** The Timeline toolbar's Render button reads `getRenderPopup()` and hides itself when nothing is registered — RenderDialog is the producer side of that registry (engine/plugins/RenderDialog/index.tsx:27, 59).
- **Runners speak 0..1; the UI shows 0..100.** `setProgress` adapts via `n => Math.max(0, Math.min(100, n * 100))` so runners can write `done/total` naturally (engine/plugins/RenderDialog/index.tsx:200-203; engine/plugins/RenderDialog/types.ts:30-32).
- **Bitrate auto-recommend on resolution change**: `Math.round(40 * (cfg.width * cfg.height) / (1920 * 1080))` Mbps, overwrites whatever the user typed (engine/plugins/RenderDialog/index.tsx:114-118).
- **FPS auto-tracks the animation store** unless `defaults.fps` is supplied at install (engine/plugins/RenderDialog/index.tsx:105-108).
- **Window position defaults to right-anchored** with a 320px right margin and y:80 (engine/plugins/RenderDialog/index.tsx:156-160).
- **`RenderingView` has no width transition on the progress bar** — the inline comment notes runners push `setProgress` faster than the 300ms transition and the bar visibly stalls otherwise (engine/plugins/RenderDialog/RenderingView.tsx:43-54).
- **`DEFAULT_RES_PRESETS` is a 7-item social-media-flavoured list** (720p, 1080p, 1440p, 4K, Square 1:1, Portrait 4:5, Vertical 9:16). Apps replace via `resolutionPresets` — an array OR a function that the form calls every render for reactive presets (engine/plugins/RenderDialog/ConfigForm.tsx:18-26, 77-79).

## Invariants

- **Module-level state across all five hosts.** `topbar`, `hud`, `menu`, plus the install singletons in `SceneIO`, `Help`, `PwaUpdate`, `PauseControls`, `BucketRender`, `RenderDialog` are module-scope. Multiple engine instances in one JS realm share the registries — testing-only `clear()` exists on the registry triplet for hot-reload, but the install-state booleans (`_installed`) do not reset on reinstall, only on the corresponding `uninstall*` (engine/plugins/TopBar.tsx:49-94; engine/plugins/Hud.tsx:46-89; engine/plugins/Menu.tsx:142-271).
- **Two-step scene load is mandatory.** `loadSceneFile` returns a parsed preset but never applies it; callers must follow with `useEngineStore.getState().loadScene({ preset })`. Calling `loadPreset` directly skips the compile gate, the post-boot full-config flush, the worker `OFFSET_SET`, and the `CONFIG_DONE` debounce-skip — post-boot scenes will then render as a fallback sphere. The Load menu item itself documents this in a load-bearing inline comment (engine/plugins/SceneIO.tsx:288-306). See followup q-054 for the full pipeline diagram.
- **Menu's `queueMicrotask` defer is load-bearing.** Without it, `setState`-during-render of toggle items' `isActive()` triggers React's render-phase update warning. The comment explicitly names the failure mode (engine/plugins/Menu.tsx:253-264).
- **`_hostMounts` is a counter, not a bool.** Two `MobileMenuHost` mounts in the same render tree (StrictMode in dev) increment and decrement symmetrically; one bool would false-clear on the second mount's cleanup (engine/plugins/Menu.tsx:165-175, 501-504).
- **`installSceneIO` captures options BEFORE `_installed` short-circuits.** Reinstall updates `_getCanvas` / `_parseScene` / `_serializeScene` / `_fileExtension` / `_snapshotAnchor` even though registration is skipped. This deliberately breaks the "install\* is idempotent" rule for the captured-deps half of state (engine/plugins/SceneIO.tsx:86-93).
- **`installSceneIO` gates PNG/JPG export on `_getCanvas` AT install time.** Registering `getCanvas` after install will not back-fill the menu items or the SnapshotButton; the app must call `uninstallSceneIO` and reinstall, or pass `getCanvas` up-front (engine/plugins/SceneIO.tsx:122-148).
- **TopBar/Hud/Menu mutate maps in place with monotonic rev.** `useSyncExternalStore` snapshots return `_rev`, not the items; consumers iterate `_items` fresh each render (engine/plugins/TopBar.tsx:108-120; engine/plugins/Hud.tsx:129-145; engine/plugins/Menu.tsx:496).
- **`Hud.clear()` resets `_insertCounter` but not `_subscribers`.** Re-registration after clear restarts insertion ordering at 0; subscribers persist (engine/plugins/Hud.tsx:73-77).
- **`RenderDialog.onMount` runs unconditionally on first mount** with a cleanup wired to component unmount; nothing checks `_installed`-style guards (engine/plugins/RenderDialog/index.tsx:171-174).
- **RenderDialog's bitrate auto-recommend overwrites user input** on every `cfg.width`/`cfg.height` change. A user edit to the bitrate field survives only until the next resolution edit (engine/plugins/RenderDialog/index.tsx:114-118).
- **PwaUpdate requires `vite-plugin-pwa`.** The `virtual:pwa-register/react` import is supplied by VitePWA; apps that don't ship as a PWA must not install this plugin or the build fails (engine/plugins/PwaUpdate.tsx:22).
- **`uninstallHelp` does not clear the support-modal singleton.** This is an across-reinstall state leak, not a DOM leak: the portal is rendered through React reconciliation via `SupportModalHost` inside `<HelpOverlay>`, which `uninstallHelp` does not touch, and `uninstallHelp` is never called anywhere in the current codebase (engine/plugins/Help.tsx:405-409; followup q-053 contains the full analysis).
- **Help expects an app-merged engine store.** Every store access in Help is cast `as any` — `showHints`, `setShowHints`, `openHelp`, `closeHelp`, `helpWindow`, `tutorialCompleted`, `startTutorial` are not part of engine-core typings (engine/plugins/Help.tsx:311-340, 392-401, 512-515).

## Interactions with other subsystems

- **`engine/plugins/Tutorial`** (a03-tutorial): `SceneIO`'s SnapshotButton and `installBucketRender`'s toggle both call `useTutorAnchor` to expose anchor refs; `Menu` does not, but `Help` subscribes to `subscribeLessons` and reads lesson state to render the tutorials sub-list (engine/plugins/SceneIO.tsx:339; engine/plugins/topbar/installBucketRender.tsx:19, 48; engine/plugins/Help.tsx:29).
- **`engine/plugins/Shortcuts`** (e08-shortcuts-undo): `SceneIO` registers `scene-io.quick-png` for Alt+S; `Help` registers `help.toggle-hints` for H. `uninstallSceneIO`/`uninstallHelp` unregister their entries (engine/plugins/SceneIO.tsx:153-165; engine/plugins/Help.tsx:393-407).
- **`engine/plugins/Viewport`** (e06-adaptive-resolution): `FpsCounter` reads `useViewportFps()` from the viewport plugin; `TopBar`'s default registration imports `AdaptiveResolutionBadge` from `engine/plugins/viewport/` (engine/plugins/topbar/FpsCounter.tsx:12-15; engine/plugins/TopBar.tsx:34, 87).
- **`engine/animation/renderPopupRegistry`** (e03-animation): `RenderDialog` calls `registerRenderPopup(RenderDialog)` at install time so the Timeline toolbar's Render button surfaces this dialog. Followup q-050 documents the registry side; this subsystem owns only the producer (engine/plugins/RenderDialog/index.tsx:27, 59).
- **`engine/plugins/RenderLoop`** (e02-tick-registry): plugins-host has no direct call into the render loop, but `PauseControls`/`BucketRenderPanel`/`FpsCounter` read render-loop-adjacent store fields (`isPaused`, `accumulationCount`, `fpsSmoothed`) populated by viewport+RAF; listed as a depends_on for completeness because the topbar layer is meaningless without a driving loop.

## Known issues / Phase 2 carry-in

| Question | Severity | Summary |
|---|---|---|
| review-#2 | high | Existing `docs/engine/04_Core_Plugins.md` has 13 break-severity drift rows; specifically calls out a CLOSED architectural decision (2026-04-22 nine-plugin lineup) that has been silently reversed by shipping `@engine/menu`, `@engine/help`, `@engine/hud`, `@engine/pwa-update`, `@engine/render-dialog` plus topbar widgets. See `plans/doc-audit-state/reviews/review-2026-05-19-2.md`. |
| q-052 | drift | The surveyor flagged a non-existent `../../export/BucketRenderTypes` import in `BucketRenderPanel.tsx`. The only `engine-gmt` token in the file is an attribution comment at line 4; the real imports all resolve to engine-core paths (engine/plugins/topbar/BucketRenderPanel.tsx:4, 20). |
| q-053 | drift (overstated) | Surveyor framed `uninstallHelp` as a DOM leak; the real residual is a STATE leak across reinstall cycles (one-line fix: `_setSupportModal(null)` inside `uninstallHelp`). The function is also never called anywhere in the codebase, so the bug is doubly theoretical (engine/plugins/Help.tsx:405-409). |
| q-054 | doc-rewrite (HIGH VALUE) | The `loadSceneFile → loadScene → loadPreset` two-step is real, load-bearing, and undocumented outside an inline comment. New text under "Invariants" above captures it; the `loadSceneFile` JSDoc should also be updated to point at `loadScene` (engine/plugins/SceneIO.tsx:174-197, 288-306). |
| no uniform plugin contract | medium | The surveyor's closing note: each plugin invented its own state-capture shape. SceneIO uses module-state singletons with pre-`_installed` capture; Menu uses `queueMicrotask`-deferred fanout; Hud uses an `_insertCounter` map for ordering; RenderDialog uses generics on `TExtra`; BucketRender uses a controller interface. The "install* is idempotent" rule from `docs/engine/03_Plugin_Contract.md` does not actually hold uniformly — SceneIO breaks it deliberately. |
| q-051 organisational | medium-low | `AdaptiveResolutionBadge` lives under `engine/plugins/viewport/` despite being a topbar widget; recommended move to `engine/plugins/topbar/` to match `FpsCounter`/`ProjectName` siblings and the file's own docstring anticipation (engine/plugins/TopBar.tsx:32-34). |
| q-049 orphan | low | `engine/plugins/navigation/core/VirtualSpace.ts` is the only engine-plugin file not claimed by any survey `files:` block; lives outside this subsystem (precision math helper). |

## Historical context

This module doc supersedes `docs/engine/04_Core_Plugins.md` for the current API and invariants. The legacy doc was written for the original 8-plugin lineup (2026-04-23) and was never updated as five additional plugins (`@engine/menu`, `@engine/help`, `@engine/hud`, `@engine/pwa-update`, `@engine/render-dialog`) and two topbar widgets (`PauseControls`, `BucketRender`) shipped. Sub-A's drift table flagged 13 rows; many describe APIs that never existed in code (e.g. `installTopBar({ slots? })`, `sceneIO.registerField`, `<SaveMenu />`/`<LoadDropZone />` components, `Ctrl+S` / `Ctrl+O` hotkeys, "HelpMenu in right slot:0" as a topbar default).

Preserve from the legacy doc as design rationale and aspirational direction:

- **The camera-adapter rationale.** Camera state has three irreconcilable shapes (2D `{center, zoom}`, 3D orbit, 6-DOF) which is why `@engine/camera` is adapter-based with opaque JSON and an app-provided `captureState`/`applyState` pair. Out of scope for this subsystem (`engine/plugins/Camera.ts` belongs to e09-camera-plugin per followup q-048) but a load-bearing decision that explains why no plugin in this host attempts a unified camera abstraction.
- **The screenshot-folding story** as the canonical example of the "no duplicate UX" rule — the original `@engine/screenshot` plugin was folded into `@engine/scene-io`'s `SnapshotButton` to avoid two visually-similar topbar buttons. The image-icon-vs-camera-icon disambiguation comment at engine/plugins/SceneIO.tsx:269-278 preserves this rationale.
- **Rejected alternatives:** auto-install everything (rejected: opt-in lets apps stay minimal); append-only slot registration (rejected: re-registration is the idempotency surface).
- **Hotkey-choice rationale:** `Alt+S` was chosen for the quick-PNG screenshot because `Ctrl+S` / `Ctrl+Shift+S` are browser-reserved Save / Save As and never reach JS. The inline comment at engine/plugins/SceneIO.tsx:150-152 captures this; the legacy doc held the longer rationale.
- **`installModulation` → `installAnimation` as historical naming debt** — flagged in d01's preservable signal; not blocking.

The 2026-04-22 "nine core plugins, not fewer or more" architectural decision is documented in the legacy doc as closed; current code clearly reverses it. Apps that need to understand the original constraint set (and why help-browser / PWA-update were initially declared out of scope) should still read the legacy doc for that decision's framing — just treat its API surface as design fiction.
