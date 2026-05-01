# gmt-engine — Session Handoff

**Location:** `h:/GMT/workspace-gmt/dev/` (was `h:/GMT/gmt-engine/`)
**Origin:** Forked from stable at `h:/GMT/workspace-gmt/stable/` (was `h:/GMT/gmt-0.8.5/`, kept as `upstream` remote)
**Status:** ✅ **GMT fully ported to the engine (2026-04-26).** All three apps boot. `app-gmt.html` is functionally equivalent to gmt-0.8.5: full worker renderer, path tracing, Orbit/Fly navigation, all 26 DDFS features, 42 formulas, all 10 manifest-driven panels, light gizmos, drawing tools, webcam overlay, state debugger, Formula Workshop, GMT loading screen, Share Link, save/load (PNG + GMF + JSON), Camera Manager, formula gallery. `npx tsc --noEmit` → 0 errors. **Mobile mode shipped 2026-05-01** — see entry below.

**📋 2026-05-01 — Mobile mode for app-gmt (Phase A–C iter, D6, E1, F1):**

Plan: [plans/mobile-mode-app-gmt.md](plans/mobile-mode-app-gmt.md). Reference doc: [docs/engine/17_Mobile_Layout.md](docs/engine/17_Mobile_Layout.md).

User report: stable's mobile rendering path works but its UI is "not mobile-friendly"; same true of app-gmt after the port. Goal: make app-gmt usable on phone + tablet (landscape-only) without resorting to desktop tooling, with primitives reusable by sibling apps (`fluid-toy`, `fractal-toy`, `demo`).

**Layering (load-bearing).** Stable's mobile bits live inline in `App.tsx`. The engine fork doesn't have one app — it has four. Mobile primitives must land at the layer where they're reusable:

- `engine/` — `useMobileLayout` (hook + non-React `isMobileSnapshot`), `uiModePreference` slice, `<LandscapeGate>`, `<MobileViewportShell>`, `mobileMenu` API + `<MobileMenuHost>`. New components live in `engine/components/`.
- `engine-gmt/` — drei touch orbit gate (`Navigation.tsx:666`, one-line `pointerType === 'touch'` early-return), `mobileHidden` HOC, `pillClass` helper, mobile-only System menu surrogates.
- `app-gmt/` — composition only: mount the engine primitives, gate `<Dock side="left">`, `<TimelineHost>`, the right Dock-vs-MobileMenuHost swap, and Fly-mode right-dock hide.

**Phase A — foundation.**
- New engine components: `engine/components/LandscapeGate.tsx`, `engine/components/MobileViewportShell.tsx`. Address-bar collapse trick (`sticky top-0 h-[100vh] overflow-hidden`) ported from stable; on desktop it's `fixed inset-0 w-full h-full`. Safe-area insets applied in same component (D6).
- `<GmtNavigationHud isMobile={false}>` hardcodes in `AppGmt.tsx:206, 253` replaced with real `useMobileLayout()` flow.
- Touch orbit fix: drei's native `THREE.TOUCH.ROTATE / DOLLY_PAN` was already declared in `Navigation.tsx:1326` but was being intercepted by the custom cursor-anchored orbit handler at line 666. The handler's only gate was `e.button !== 0`, which passes for touch pointerdown (button is always 0 on touch). One-line fix: `if (e.pointerType === 'touch') return;` early-return — cursor-anchor doesn't translate to multi-touch, so ceding to drei is correct. Mouse path untouched.
- `<MobileControls />` mounted in `AppGmt.tsx` — was missing entirely from app-gmt (legacy `App.tsx` had it, port didn't carry it over).

**Phase B — UI mode preference.**
- `debugMobileLayout: boolean` (debug toggle) graduated to `uiModePreference: 'auto' | 'mobile' | 'desktop'`. Type added to `types/store.ts` and `engine-gmt/types/store.ts`. Slice rewrite in `store/slices/uiSlice.ts` with localStorage read/write helpers under key `gmt.uiModePreference`.
- `useMobileLayout()` rewritten to resolve `auto` via media query / viewport, return forced value otherwise. Keeps `isPortrait` (always actual orientation, used by `<LandscapeGate>`).
- All `debugMobileLayout` call sites migrated: `App.tsx:59`, `components/MobileControls.tsx`, `engine-gmt/topbar.tsx`, `engine-gmt/navigation/useInputController.ts:15, 199, 239`.
- System menu's binary `Force Mobile UI` toggle replaced with a custom 'custom'-type menu item: `UiModePreferenceMenuItem`, a 3-button pill row (Auto / Force Mobile / Force Desktop). Removed `when: advancedMode` gate — this is now a real user setting, visible to everyone.

**Phase C — topbar cull and mobile menu architecture.** Iterative with the user; final state:
- New `mobileHidden(Component): React.FC` HOC in `engine-gmt/topbar.tsx` — wraps a component to return null on mobile, reactive via `useMobileLayout`. Used for: `AdaptiveResolution`, `RenderRegionToggle`, `ShareLinkButton`, `ViewportQuality`, `gmt-div-1`, `gmt-div-2`. Bucket-render install gated by `isMobileSnapshot()` at boot (the installer doesn't accept a component handle — non-reactive limitation acknowledged).
- `CenterHUD` (Light Studio): `isMobileMode={false}` hardcode in the topbar wrapper replaced with real `useMobileLayout` flow + real `navigator.vibrate` callback (was a noop). Tap-to-enable / tap-to-open-menu / tap-to-disable mobile interaction logic in `CenterHUD.tsx:135-162` was already there but had been dormant. Expand-to-8-lights chevron hidden on mobile (the 3x3 grid doesn't fit and the first 3 lights cover the common case).
- New System menu surrogates for mobile-hidden topbar items: `MobileQualityMenuItem` (3x2 grid of all 6 SCALABILITY_PRESETS), `Adaptive Resolution` toggle. Both gated by `when: () => isMobileSnapshot()`. Section header "Quality" + separator scoped the same way.
- **Mobile menu replaces right dock (architectural change in `engine/plugins/Menu.tsx`).** New `mobileMenu` API: module-level `_mobileActiveMenu: string | null` + `open / close / toggle / getActive / subscribe`. `MenuAnchor` branches on `useMobileLayout().isMobile`: desktop path unchanged (local state + popover); mobile path writes to `mobileMenu` global state, no popover. New `<MobileMenuHost>` renders the active menu's items in a scrollable side panel sized like the right dock; the host is mounted by the app shell, which gates the right-Dock vs MobileMenuHost swap. `MenuItemView` is reused identically for both rendering paths so toggles, custom items, separators all match.
- File menu (`engine/plugins/SceneIO.tsx`) migrated from a bespoke 90-line `FileMenu` component to `menu.register('file', …)` + `menu.registerItem('file', …)` calls. Inherits desktop popover + mobile MobileMenuHost rendering for free. Icon-only (no "File" label) — matches Camera/System icon-only pattern. `LoadSceneMenuItem` is the only `'custom'` item — the hidden `<input type="file">` has to live with its trigger button to be `.click()`-able. `extraItems` API added then dropped during cleanup; apps register file-menu items directly.
- `copyShareLink()` extracted from `ShareLinkButton.tsx` as a callable helper. Original button uses it internally; app-gmt registers a "Copy Share Link (URL)" entry in the File menu via `menu.registerItem('file', …)` from `main.tsx`. Desktop also has the topbar share-link icon (mobileHidden); mobile users only see the menu entry.

**Phase D6 — safe-area insets.** `<MobileViewportShell>` applies `padding: env(safe-area-inset-*)` on all four edges when mobile. Hoisted as module-level `MOBILE_STYLE` / `DESKTOP_STYLE` consts to avoid per-render allocation.

**Phase E1 — auto-pick scalability preset on mobile boot.** `hooks/useAppStartup.ts`: after `detectHardwareProfileMainThread()`, if `hwProfile.isMobile && scalability.activePreset === 'balanced'` (engine default, untouched), calls `applyScalabilityPreset('fastest')`. Compile time drops from ~10 s to ~5 s with PT still on. User-chosen presets respected.

**Phase F1 — timeline hidden on mobile.** `<TimelineHost>` wrapped in `{!isMobile && …}` in `AppGmt.tsx`. Animation editing is desktop-only — see `plans/mobile-animation-research.md` for the deferred design (option B + C-lite, ~64px scrubber strip + half-sheet, deferred for scope).

**Cleanup pass (multi-agent code review).** Three review agents (reuse / quality / efficiency) in parallel; their findings triaged. Taken: drop `extraItems` API from SceneIO (redundant once File is a real menu), replace inline X SVG with `CloseIcon`, drop redundant `useState`/`useEffect` mirror in `MobileControls`, convert inline `import('...')` types to top-level `import type`, hoist `MobileViewportShell` style consts, extract `pillClass(active, extra)` helper for the cyan active-button pattern, flatten right-dock conditional in `AppGmt.tsx`, drop redundant `isMobile &&` from `isMobileMenuOpen` derivation, combine consecutive `!loadingVisible &&` guards, defensive `useEffect` to close stale `MenuAnchor` `open` state when toggling into Force Mobile, trim narration / "ported from stable" comments. Skipped: hoisting mobile-detection helper across pre-existing files (out of scope), replacing `mobileHidden` HOC with `when:` predicate (HOC reactivity is by design), folding `mobileMenu` pubsub into engine store (works correctly, bigger refactor), `localStoragePersist` factory (needs a third use site).

**Known limitations (documented in 17_Mobile_Layout.md):**
- Mobile menu outside-tap dismissal not implemented — only the X button in `MobileMenuHost`'s header dismisses.
- `installBucketRender` install-time gate is non-reactive — toggling Force Mobile after boot won't dynamically remove the installed item; reload required.
- ~15 resize listeners across an active session (every `useMobileLayout` consumer registers its own). Works fine, but a single global listener writing to the store would be cleaner.

**Files touched.** New: `engine/components/LandscapeGate.tsx`, `engine/components/MobileViewportShell.tsx`, `docs/engine/17_Mobile_Layout.md`. Modified: `App.tsx`, `app-gmt/AppGmt.tsx`, `app-gmt/main.tsx`, `components/MobileControls.tsx`, `engine-gmt/navigation/Navigation.tsx`, `engine-gmt/navigation/useInputController.ts`, `engine-gmt/topbar.tsx`, `engine-gmt/topbar/CenterHUD.tsx`, `engine-gmt/topbar/ShareLinkButton.tsx`, `engine-gmt/types/store.ts`, `engine/plugins/Menu.tsx`, `engine/plugins/SceneIO.tsx`, `hooks/useAppStartup.ts`, `hooks/useMobileLayout.ts`, `store/slices/uiSlice.ts`, `types/store.ts`, `CLAUDE.md`, `docs/DOCS_INDEX.md`, `docs/engine/04_Core_Plugins.md`. `npx tsc --noEmit` → 0 errors. Pending real-device validation by user.

**📋 2026-04-30 — Undo system: per-scope stacks (refactor of the 2026-04-26 fix):**

User report: Ctrl+Z occasionally undid a camera move when intending to undo a parameter edit. The 2026-04-26 audit (logged below) had concluded the unified-stack-with-scope-tags design was clean; this turned out to be wrong in one specific way — any consumer that called `undo()` without a scope (the global hotkey, the topbar UndoButton) popped the newest entry of any kind, so a camera gesture sitting on top of the unified stack would get rolled back by a parameter-undo keystroke. Same bug class affected `engine-gmt/topbar.tsx`'s Camera menu disabled-checks, which read `undoStack.length` rather than `canUndo('camera')`.

**Refactor:**
- `store/slices/historySlice.ts`: state shape split from `undoStack` / `redoStack` (with `scope` tags) into four independent stacks — `paramUndoStack` / `paramRedoStack` / `cameraUndoStack` / `cameraRedoStack`. Each lane caps independently at `MAX_STACK = 50`.
- API surface: `scope` is now required on every history method (`undo` / `redo` / `canUndo` / `canRedo` / `peekUndo` / `peekRedo`). The unscoped fallback is gone — the type signature makes the bug class unrepresentable.
- New typed entry points: `beginParamTransaction()`, `endParamTransaction()`, `pushCameraTransaction(state: CameraState)`. Replaces the runtime-overloaded `handleInteractionStart(mode | CameraState)` that conflated the two paths via `typeof mode === 'object' && mode.position`. Old name kept as a back-compat shim that routes by argument shape so the ~30 widget call sites stay unchanged.
- `engine/plugins/Undo.tsx`: global Ctrl+Z / Mod+Y / Mod+Shift+Z hotkeys plus topbar UndoButton/RedoButton all pass `'param'` explicitly. Camera Ctrl+Shift+Z still owned by app-gmt's priority-10 `gmt.undoCameraMove`.
- `engine-gmt/topbar.tsx`: camera menu Undo/Redo disabled-checks now use `canUndo('camera')` / `canRedo('camera')`.
- `app-gmt/AppGmt.tsx`: `GmtNavigation.onStart` calls `pushCameraTransaction(s)` directly. The `as any` cast on the camera-state argument is gone — the entry point is properly typed.
- `types/store.ts` + `engine-gmt/types/store.ts`: declarations updated to per-scope stacks + required scope on the methods.

`npx tsc --noEmit` → 0 errors. Documented in [docs/engine/06_Undo_Transactions.md](docs/engine/06_Undo_Transactions.md) (rewritten), [F2b](docs/engine/20_Fragility_Audit.md#f2b--undo-lane-conflation) (updated with the regression-then-fix history), and [07_Shortcuts.md](docs/engine/07_Shortcuts.md) (keybinding table).

**📋 2026-04-27 — Workspace tidy + camera-manager shortcut wiring + state-library notification system:**

- **Workspace reorg.** Moved all four GMT repos under `h:/GMT/workspace-gmt/`: `stable/` (was `gmt-0.8.5/`, 0.9.2), `dev/` (was `gmt-engine/`, bumped to 0.9.3), `landing/`, `backend/`. Folder names are now role-based; folder ↔ repo ↔ deploy map at `h:/GMT/workspace-gmt/README.md`. Renamed Claude Code memory dir to follow. Updated `dev/.git/config` upstream URL, fixed 4 stable test-frag ROOT paths, refreshed HANDOFF/CLAUDE location headers. Stable's repo + Cloudflare Pages + GitHub Pages deploys unaffected (folder names don't reach git).
- **Camera Manager keyboard shortcuts wired.** Three broken paths discovered: (1) `installGmtCameraSlice` called only `installStateLibrarySlice`, missing the `installStateLibrary` bundle that registers `Mod+1..9` / `1..9` against `saveToSlot`/`selectCamera`. (2) `installCamera()` in app-gmt was also registering Mod+1..9 against an adapter-less `@engine/camera` plugin — dead no-ops that won the tie-break against any later library bindings. (3) `engine-gmt/topbar.tsx` Camera menu's slot items called the same dead `camera.recallSlot/saveSlot`. Fix: switched cameraSlice to bundled `installStateLibrary({menu: null, slotShortcuts, onSavedToSlot})`, added `installCamera({hideShortcuts: true})` in app-gmt, rewired the topbar slot items onto the real `savedCameras` actions. fluid-toy already used the bundle correctly — unaffected.
- **State-library notification system (engine-wide).** Promoted the saved-toast pattern out of GMT into `installStateLibrarySlice`. Two transient store fields per library (`${arrayKey}_savedToast`, `${arrayKey}_notifyDot`) with timer cleanup. New `<StateLibraryToast arrayKey={...}/>` component (engine/components) renders a tone-aware floating pill (cyan success, amber warning). `installStateLibrary` auto-mounts it next to the menu when `menu` opt is set; apps with hand-rolled menus (GMT) mount it manually. Field names exported as `toastFieldKey()` / `dotFieldKey()` helpers — no stringly-typed drift.
- **Slot-overflow rejection.** `saveToSlot(n)` with `n > arr.length` previously appended as the next slot but labelled it `${n+1}` — a silent lie that also broke recall. Now rejects with a warning toast (`"Slot N unavailable — only K slots are filled"`). Stable still has the original bug; left untouched.
- **Dynamic menu labels.** `MenuButtonItem.label` and `MenuToggleItem.label` accept `string | (() => string)`. Same shape as the existing `disabled: boolean | (() => boolean)`. Used by GMT's Slot N items (`Slot 3 ✓` when filled), View Manager item (`View Manager ●` when notify dot is lit), and the bundle's auto-generated open + slot items. Available for the System menu and any future menu.
- **fluid-toy smooth view tween.** `applyView` now routes through a 500ms ease-in-out rAF tween (`tweenView`). Snaps `kind`+`maxIter` at start, lerps `center`/`juliaC`/`power` linearly, lerps `zoom` in log-space for perceptually-uniform pacing. Cancels prior in-flight tween. Lifted `lerp` and `easeInOutQuad` to a new `engine/math/Easing.ts` (no scalar lerp existed before — color-specific lerps only).

**📋 2026-04-26 (late) — Camera-undo fix + undo-system audit:**

User report: parameter undo (Ctrl+Z) and timeline undo (Ctrl+Z over timeline) work, but camera undo (Ctrl+Shift+Z) does nothing.

**Root cause** (NOT the agent's first hypothesis of "no camera transactions in stack" — those ARE pushed via `GmtNavigation.onStart` → `handleInteractionStart(camState)` at `app-gmt/AppGmt.tsx:203`):

- `engine/plugins/Undo.tsx:108-114` registers `Mod+Shift+Z` as the Mac-redo alias (`redo.global.shift`).
- `app-gmt/main.tsx:291-297` registers `Ctrl+Shift+Z` for camera-undo (`gmt.undoCameraMove`).
- After `normalizeKey`, both keys are identical. Both at scope `'global'`, priority `0` → resolver tie-breaks on insertion order, and `installUndo()` runs first → **the redo handler wins**, camera-undo never fires.

**Fix:** added `priority: 10` to `gmt.undoCameraMove` and `gmt.redoCameraMove` so they win the conflict resolution. GMT's UX contract is "Ctrl+Shift+Z is camera-undo, full stop"; the Mac-redo alias is intentionally suppressed for app-gmt. Mod+Y still does redo for parameters.

**Audit results — undo system is unified and clean:**
- 2 stacks total: `historySlice.undoStack` (engine-core, holds both 'param' and 'camera' scoped txs) + `animationStore.undoStack` (timeline edits, separate by design — F2b's planned unification deferred and not currently blocking).
- 1 dead-code finding: `engineStore.setFormula` had a redundant manual `set({ undoStack: [], redoStack: [] })` after `resetParamHistory()` (which already calls `clearHistory()`). Removed.
- Backward-compat shims (`undoParam`, `redoParam`, `undoCamera`, `redoCamera`) all delegate to `undo(scope)` / `redo(scope)` cleanly — single mechanism.
- GMT's cameraSlice wraps `undoCamera` / `redoCamera` to fire `CAMERA_TELEPORT` after the diff applies → R3F camera warps correctly.
- No orphan undo paths or duplicate stacks found.

**📋 2026-04-26 (late) — F9 + F15 deferred-cleanup (F10/F11 reassessed):**

- **F9 closed** — Dev-mode `componentId` validator. Added `validateComponentRefs(componentRegistry)` in `engine/FeatureSystem.ts` that walks every feature's `viewportConfig.componentId` and `customUI[].componentId`, asserts each resolves in the supplied registry. Console-errors each missing reference with the feature id + site (e.g. `customUI[2]`) so typos surface at boot instead of "blank panel + silent fallback" at first render. `componentRegistry` gained `has(id)` and `ids()` helpers. App-gmt invokes the validator after `registerGmtTopbar()` (lazy-imported so prod bundle doesn't include the validator code). Dev-only via `import.meta.env.DEV` gate.
- **F15 closed** — Removed the 2s `_offsetGuardTimer` auto-clear in `engine-gmt/engine/worker/WorkerProxy.ts`. The drift-converged check in the FRAME_READY handler is the deterministic guard; the timeout was defensive paranoia that, in slow-boot worst case, could fire BEFORE the worker rendered its first post-set frame and let stale FRAME_READY data overwrite `_localOffset`. Removed `_offsetGuardTimer` field, the timer setup in `setShadowOffset`, the timer-clear in the drift check, and the entry in `_clearAllTimers`. If the worker hangs entirely, the gizmo overlay staying at the user's last-set offset is the correct behaviour (was the timeout's only "edge case" justification).
- **F10 + F11 reassessed and deferred** — Original audit estimated both as "30-min cosmetic". Re-audit shows:
  - **F10** (`formula` → `mode`): 54 hits across 30 files, including on-disk GMF / preset format. Naive rename breaks every existing GMT save unless paired with a migration layer in `applyMigrations` that maps `formula` → `mode` on load. That's mid-size refactor, not a paper-cut.
  - **F11** (`FractalEvents` → `EngineEvents`): 236 references across 53 files. Mechanical but voluminous; risk-reward of 200+ atomic edits in a multi-purpose session is poor.
  - Both deserve dedicated commits when the user wants to invest the time. Documented this scope correction in the deferred table below.

**📋 2026-04-26 (late) — GMF custom-formula loading + save round-trip:**

The 2026-04-25 entry claimed "all GMT PNG and .gmf saves now load correctly" — verified false in audit. Built-in formulas worked; **GMFs containing workshop / Fragmentarium / custom shaders did NOT round-trip**: parseSceneJson only extracted the `<Scene>` block; the `<Metadata>` + shader blocks containing the FractalDefinition were ignored. Saves wrote plain JSON, dropping shader content entirely.

**First fix attempt** (parser plumbing + def registration):
- **`utils/SceneFormat.ts`** — load/save helpers (`loadSceneFromFile`, `extractScenePng`, `embedScenePng`, `snapshotSceneToPng`, `downloadSceneJson`, `downloadScenePng`) all accept optional `parser` / `serialize` parameters. Defaults preserve existing behavior; apps inject richer formats via the SceneIO plugin.
- **`engine/plugins/SceneIO.tsx`** — `InstallSceneIOOptions` gains `parseScene` + `serializeScene` overrides. Threaded through every load + save path (JSON, PNG, dropdown items, quick-PNG button).
- **`app-gmt/main.tsx`** — installs SceneIO with `parseScene` that calls `loadGMFScene`, registers the def in both registries (local `FractalRegistry` + worker via `REGISTER_FORMULA` event), and returns the preset; `serializeScene: saveGMFScene` for round-trip.
- **`engine-gmt/components/panels/formula/FormulaSelect.tsx`** — Import-Formula button had the same registration gap; fixed to register the def explicitly before delegating to `loadScene`.

**Second fix — compile gating** (loadScene vs loadPreset):
SceneIO's LoadButton called `loadPreset(preset)` directly. `loadPreset` only emits `CONFIG: { formula }`, never `CONFIG_DONE`. The worker waited on the 200ms scheduleCompile debounce, and the REGISTER_FORMULA + CONFIG ordering was racy. Switched to `loadScene({preset})` so CONFIG_DONE fires.

**Third fix — the ACTUAL root cause** (full config flush):
After the first two fixes, custom formulas still rendered as a fallback sphere. Side-by-side read of gmt-0.8.5's `loadScene` revealed engine-core's `loadScene` was a stripped-down stub missing **three critical steps** that 0.8.5 does between `loadPreset` and `CONFIG_DONE`:

1. **Full config flush** — `getShaderConfigFromState(get())` builds a complete `ShaderConfig` snapshot (formula + every feature slice) and emits it as ONE CONFIG event. Without this, the worker only knows the formula changed, but its config still has stale values for every other field. The recompile produces a broken shader (rendered as a sphere — the fallback DE).
2. **Offset push** — `engine.setShadowOffset(precise)` + `engine.post({type:'OFFSET_SET', offset})` ensures the first frame after recompile uses the loaded viewpoint, not a stale pre-load offset.
3. **CONFIG_DONE** to skip the debounce (was already added in the second fix).

Fix: ported all three steps from `gmt-0.8.5/store/fractalStore.ts:206-253` into [`store/engineStore.ts`](store/engineStore.ts) `loadScene`. Engine-core stays generic — `getShaderConfigFromState` already existed for this exact use case; it walks `featureRegistry.getAll()` for the slice payload, no GMT coupling.

**Why this fixes the sphere bug:** the worker's recompile now sees the full feature state for the loaded scene (lighting, optics, geometry, coloring, quality, …), not just the formula change. The shader compiles correctly with the right uniforms and structure.

**What this unlocks:** workshop saves load on a fresh runtime; Fragmentarium GMFs in `public/gmf/fragmentarium/` work via the file picker; PNG round-trip preserves the active formula's shader; custom-formula loads compile on the first frame after the user picks the file (no 200ms delay, no missing-formula races).

**All four load paths now use `loadScene({preset})` + CONFIG_DONE**: app-gmt boot (line 282), FormulaSelect Import button, SceneIO file picker, LoadingScreen "Load From File".

**Fourth fix — LoadingScreen bypass + API consolidation:**
LoadingScreen's "Load From File" called `loadSceneFromFile(file)` with no parser argument, fell back to engine-core's plain-JSON parser, skipped formula-def registration → sphere bug at boot even after fix #3.

Fix: removed `loadSceneFromFile` from `utils/SceneFormat.ts` entirely (was a footgun — easy to call without a parser and silently downgrade GMF to JSON). Replaced with single `loadSceneFile(file)` exported from `engine/plugins/SceneIO.tsx` that always routes through the registered `parseScene`. **One public file-loader, no opt-in argument, no way to bypass.** LoadingScreen + SceneIO LoadButton both use it; future file-pick affordances (drag-drop, deep links) inherit GMF parsing automatically.

**Fifth fix — symmetric save-side consolidation:**
Same footgun on the save side: `downloadSceneJson` / `downloadScenePng` accepted an optional serialize argument that defaulted to plain JSON. Only SceneIO called them (correctly with `_serializeScene`), but a future caller could bypass the GMT GMF serializer.

Fix: removed `downloadSceneJson` and `downloadScenePng` from `utils/SceneFormat.ts`. Replaced with `saveSceneJson(filename?)` and `saveScenePng(filename?)` exported from `engine/plugins/SceneIO.tsx`. Both:
- Read the current preset from the store (no `preset` arg — single source of truth)
- Use the registered canvas accessor (no `canvas` arg for PNG)
- Bake in `_serializeScene ?? serializeScene` (registered serializer, plain-JSON fallback)
- Default filename derives from `projectSettings.name`

Public Scene I/O surface is now symmetric and bypass-proof:
- `loadSceneFile(file)` — read with registered parser
- `saveSceneJson(filename?)` — write with registered serializer
- `saveScenePng(filename?)` — snapshot + write with registered serializer

Lower-level building blocks (`extractScenePng`, `parseSceneJson`, `embedScenePng`, `snapshotSceneToPng`, `serializeScene`, `downloadBlob`, `canvasToPngBlob`) stay exported from `utils/SceneFormat.ts` for advanced format authors.

**PNG load path verified through GMF parser:** PNG path is `LoadButton.handleFile` → `loadSceneFromFile(file, _parseScene)` → `extractScenePng(file, parser)` → reads iTXt under `SceneData` (new) or `FractalData` (legacy 0.8.5) → `parser(content)` = app-gmt's GMF-aware `parseScene`. Same parser, same registration, same `loadScene({preset})` sequence as `.gmf` files. PNG bucket-render saves already use `saveGMFScene` so the round-trip preserves formulas.

**📋 2026-04-26 (evening) — Backlog audit + quick-win cleanup:**

Spawned 4 parallel research agents to verify status of every "active backlog" / "deferred" item against current source. Findings + applied fixes:

- **Backlog drift corrected.** Several items listed as outstanding were already done; the doc was stale. See [Remaining work](#remaining-work) below for the corrected list.
- **F14 shim cleanup — closed.** `BezierMath.ts`, `BloomPass.ts`, `UniformNames.ts` were already one-line re-exports. `RenderPipeline.ts` had a 19-line diff (engine-gmt imported `QualityState` from features/quality vs engine-core's inline loose record). Dropped the index-signature mismatch in engine-core's local `QualityState` shape so engine-gmt's narrower type is structurally assignable; collapsed engine-gmt's RenderPipeline.ts to a re-export.
- **`showQuickPng` typecheck error — fixed.** Stale option in `app-gmt/main.tsx`; QuickPngButton already auto-registers when `getCanvas` is supplied. Removed.
- **`express` + `@types/express` — removed from devDependencies.** Old `server/server.js` was deleted in stage 16; no remaining imports.
- **README + demo/README + smoke-script wiring — verified up-to-date** (HANDOFF claims were stale: README correctly describes gmt-engine + port 3400, demo/README lists registerFeatures.ts, all 29 `debug/smoke-*.mts` files wired into `package.json`).
- **EnginePanel visibility toggle — already wired** ([`engine-gmt/topbar.tsx:539-559`](engine-gmt/topbar.tsx#L539-L559)). HANDOFF was stale.
- **Orbit-trap gradient port — non-issue.** Agent C found fluid-toy has identical orbit-trap modes to GMT; "richer multi-stop / radial / angular" claim in prior HANDOFF was aspirational/wrong. Removed.

**📋 2026-04-26 (afternoon) — TSAA unification + bucket-dialog black-frame fix:**

- **AccumulationController protocol** ([`engine/AccumulationController.ts`](engine/AccumulationController.ts)) — generic interface (accumulationCount, convergenceValue, isPaused, setPreviewSampleCap, resetAccumulation). Both WorkerProxy classes (engine-core stub + engine-gmt full) `implements AccumulationController`.
- **`installAccumulationBindings`** ([`store/slices/installAccumulationBindings.ts`](store/slices/installAccumulationBindings.ts)) — one-call helper: subscribes `isPaused` / `sampleCap` from `renderControlSlice` to any controller. Replaces ad-hoc per-app subscriptions. Pairs with `reportAccumulationToStore` for the reverse direction.
- **AdaptiveResolution module** ([`engine/AdaptiveResolution.ts`](engine/AdaptiveResolution.ts)) — pure decision module with the full TSAA algorithm (still-FPS seeding, first-window jump-to-ideal, 0.7/0.3 EMA, FPS-scaled grace, deep-accumulation protection, hold/suppress/alwaysActive options). Used by both GMT's worker `UniformManager.syncFrame` and engine-core's `viewportSlice.reportFps`. Net delta: −94 lines after dedup.
- **Bucket-render black-frame fix** — `adaptiveSuppressed` was set by the bucket popup but never reached GMT's worker. Each user interaction → adaptive scale change → `pipeline.resize()` → `resetAccumulation()` → cleared (black) FBO briefly visible. Fix: plumbed through `EngineRenderState` → `renderState` payload → UniformManager → `tickAdaptiveResolution(suppressed)`.
- **Initial `sampleCap` past max** — known race (initial SET_SAMPLE_CAP arrives at worker pre-engine-creation, silent no-op). Ported gmt-0.8.5's onBooted re-push pattern: [`engine-gmt/renderer/install.ts`](engine-gmt/renderer/install.ts) wraps the app's onBooted callback with a re-push of isPaused / sampleCap.
- **Bucket popup stay-open conditions** — gmt-0.8.5's `RenderTools.tsx:50-69` suppresses click-outside-dismissal during isBucketRendering / previewRegion / `interactionMode === 'selecting_preview'`. Ported to `BucketRenderToggle` in `engine-gmt/topbar.tsx`.
- **Dead code removed** — `bindStoreToEngine`'s isPaused/sampleCap subscriptions were wiring the engine-core stub proxy (different singleton from the real GMT worker proxy) — silently inert in GMT. Removed.
- **Architecture doc**: [11_TSAA.md](docs/engine/11_TSAA.md) — full protocol + algorithm + per-app integration patterns + plumbing-pitfalls audit checklist.

**📋 2026-04-26 — GMT port complete. Final wiring pass:**
- **Loading screen** — GMT-branded splash with CPU Julia spinner, formula picker dropdown, Load From File, Lite Render toggle ported to `app-gmt/LoadingScreen.tsx`. Replaces the minimal engine stub.
- **Share Link** — `ShareLinkButton` topbar component with Copied!/N/A/Long URL feedback. Workshop formula detection. URL length guard strips animations if >4096 chars.
- **Adaptive warmup** — first sample window after interaction seed uses 200ms (not 500ms) and jumps directly to `idealScale` (no EMA). Subsequent windows revert to normal 500ms + 0.7/0.3 smoothing.
- **Drawing tools** — `DrawingPanel` registered as `'panel-drawing'`; manifest switched from `features:` to `component:`. Drawing overlay and tick registered.
- **Formula Workshop** — wired from stub to `openWorkshop()`; mounted as left-dock replacement (same as gmt-0.8.5 layout).
- **Webcam overlay + State Debugger** — registered in componentRegistry; State Debugger appears under System → Advanced.
- **`getExtraMenuItems()`** — was never called in topbar.tsx; added loop so features using `menuItems[]` (not `menuConfig`) get system-menu entries.
- **Mesh Export** — saves scene to localStorage + opens `public/mesh-export/index.html` in new tab.
- **Public assets** — `public/formulas/` (manifest.json + dec.json + frag library), `public/gmf/` (gallery.json + fragmentarium GMFs), `public/mesh-export/` (full pipeline) all committed.
- **Scene loading fixed** — PNG (`FractalData` key) + GMF (`<Scene>` block) both parse correctly.
- **FPS counter unified** — `GmtRendererTickDriver` feeds real FPS to `viewport.reportFps()`.
- **Formula panel migration** — last bespoke panel converted to manifest `items:`. `FormulaPanel.tsx` deleted. All 10 GMT panels now manifest-driven.
- **Light gizmos** — `SinglePositionGizmo` + `OverlayProjection` promoted to `engine/`. `DomOverlays` in all three app layouts.
- **F16/F17/F18** — TopBar snapshot, GLSLToJS dead require, dual singleton — all fixed/closed.

**📋 2026-04-25 (continued) — Formula panel migration, scene loading, FPS, light gizmos:**
- **Formula panel migration** — last bespoke panel converted to manifest-driven `items:` array. `FormulaPanel.tsx` deleted. Per-formula params (iterations + `FractalRegistry`-driven scalar/vec controls) extracted to `FormulaParamsWidget` registered as `'formula-params'`. `LfoList` registered as `'lfo-list'`. `geometry` feature gained `panelConfig` for Hybrid Box Fold compilable section. Julia group uses `showIf` predicate (hidden when `formulaDef.juliaType === 'none'`). All 10 GMT panels are now manifest-driven — no bespoke panel components remain except the genuinely domain-specific ones (LightPanelControls, EnginePanel, CameraManagerPanel). `PanelRouter` separator updated to match `SectionDivider` visual treatment (raised block + gradient, not a thin white line).
- **Scene loading** — all GMT PNG and `.gmf` saves now load correctly. Two root causes: (1) wrong iTXt key — gmt-0.8.5 saves under `'FractalData'`, engine looked for `'SceneData'`; added fallback. (2) GMF format unhandled — `parseSceneJson` now detects `<!--` prefix, extracts `<Scene>` block, parses its JSON. `.gmf` added to SceneIO file-input accept list.

**📋 2026-04-25 (continued) — light gizmos, FPS unification, engine-core promotion:**
- **Light gizmos** — `SinglePositionGizmo` + `OverlayProjection` promoted to `engine/` (were in `engine-gmt/`). Re-export shims keep existing consumers working. `DomOverlays` component (renders `featureRegistry.getViewportOverlays().filter(type==='dom')`) added to all three app layouts. `overlay-lighting` + `lightGizmoTick` wired in `registerGmtUi()`. Gizmos tested and working.
- **FPS counter** — `GmtRendererTickDriver` was tracking FPS privately in `throttleRef` but never calling `viewport.reportFps()`, so `useViewportFps()` / `FpsCounter` always showed the default 60. Fixed: `viewport.reportFps(t.fps)` on each 500ms sample window. `fluid-toy` was already correct (called `viewport.frameTick()` via `onFrameEnd`).
- **F16/F17/F18** — all fixed/closed (commit `f2b119d`). TopBar snapshot now returns `_rev`; GLSLToJS dead require path corrected; dual AnimationEngine confirmed non-issue (no local copy exists).

**📋 2026-04-25 sweep (see `docs/engine/20_Fragility_Audit.md` F5–F15 entries):**
- **F5 closed** — AnimationEngine camera tracks moved to GMT-side binder module; engine pipeline is camera-shape-agnostic.
- **F7 closed** — `window.useAnimationStore` was leftover scaffolding (no real cycle). Direct imports everywhere.
- **F14 fixed** — Duplicate `ViewportRefs.ts` in `engine/worker/` and `engine-gmt/engine/worker/` had separate module-level `_camera`. Capture path used one copy, dirty-check used the other. Collapsed to a re-export shim. The whole class of "engine-gmt overlay duplicates an engine-core module" is now an audit target.
- **F15 deferred** — Worker `_localOffset` reads zeros for ~20ms at boot before preset values arrive; flagged via Key Cam logging, no visible symptoms.
- **Verbatim ports** — Adaptive resolution badge, Key Cam keyframe body, RenderPopup (video render), GMT logo all ported from `gmt-0.8.5/` rather than reinvented. Lesson saved: when fixing GMT-specific behaviour, the working code is upstream; copy + rewrite imports beats bending engine-core generics.
- **Lifecycle-in-unmounted-components** — Modulation-record overrides cleanup, timeline-hover scope push, `setMouseOverCanvas` for adaptive's settle-on-canvas all moved off legacy `<ViewportArea>` useEffects to plugin-tick or `ViewportFrame` DOM handlers.
- **Panel-manifest** gained `compilable` item type so `<CompilableFeatureSection>` can drive volume scatter / hybrid box / interlace from items lists, not bespoke JSX.
- **State-library plugin** validated by 2nd-app reuse: fluid-toy's "Views" + GMT's "Camera Manager" share `StateLibraryPanel` + `installStateLibrary` (slice + slot shortcuts + topbar menu in one call). View Manager dock-left default, GMT-style preset button grid, ActiveSnapshotFeatures footer helper.
- **Help system** — `helpId` on PanelDefinition / ParamConfig / GroupConfig / PanelItem; `?` button next to hint copy; right-click context-menu DOM walk.

**📐 Architecture baseline committed (2026-04-22).** 12 engine-scope docs written under `docs/01_*` through `docs/20_*`. Start any session with `docs/DOCS_INDEX.md`; the table in `CLAUDE.md` maps "working on X" → "read Y". All design decisions (core+plugins model, feature isolation, unified undo, auto-binding animation, bridges/derived) live in those docs. Any architectural change goes in a doc before it goes in code.

## What this is

An experiment in extracting a reusable application engine (DDFS + animation + UI framework + save/load + worker stub + shader assembly) from GMT. The first goal is to port toy-fluid onto this engine as a proof, then eventually rebuild GMT's raymarching pipeline on top as a plugin.

**Core principle:** strip fractal/raymarching content, preserve every generic pattern with plugin seams so the stripped capabilities can be re-introduced cleanly later.

## Current tree

```
engine/           FeatureSystem, FractalEvents, TickRegistry, AnimationEngine,
                  BezierMath, UniformSchema, UniformNames, HardwareDetection,
                  ShaderBuilder (generic 5-primitive + addSection),
                  ShaderFactory (generic, iterates features), ConfigManager
                  (generic DDFS diffing), ConfigDefaults (generic),
                  RenderPipeline (ping-pong + accumulation), BloomPass,
                  worker/ (WorkerProxy STUB + ViewportRefs), codec/,
                  algorithms/, math/, utils/

store/            fractalStore (generic composition shell, 260 lines),
                  createFeatureSlice, CompileGate, animationStore,
                  animation/, slices/ (ui, renderer, history — generic)

utils/            colorUtils, pngMetadata, fileUtils, helpUtils, CurveFitting,
                  ConstrainedSmoothing, GraphUtils + GraphRenderer (animation
                  keyframe curve editor), keyframeViewBounds, timelineUtils
                  (generic), PresetLogic (generic), Sharing, UrlStateEncoder,
                  histogramUtils

features/         index, types, ui, audioMod, modulation, webcam, debug_tools,
                  color_grading, post_effects
                  — all generic. Fractal-leaning features (camera_manager,
                  coloring, navigation, optics, droste, drawing) deleted.

components/       App shell (App.tsx, LoadingScreen, ViewportArea generic),
                  primitives (Slider, Knob, Dropdown, ToggleSwitch, TabBar,
                  Popover, CollapsibleSection, PanelHeader, StatusDot, etc.),
                  inputs/, vector-input/, pickers, gradient/, timeline/
                  (DopeSheet, KeyframeInspector, TrackRow, minimal
                  TimelineToolbar stub), graph/ (animation keyframe curve
                  editor), layout/ (Dock, DropZones), viewport/ (Composition
                  Overlay, FixedResolutionControls), AutoFeaturePanel,
                  CompilableFeatureSection, PanelRouter, AnimationSystem,
                  KeyframeButton, Histogram, ParameterSelector,
                  PopupSliderSystem, DraggableWindow, ComponentRegistry,
                  GlobalContextMenu, HelpBrowser, CompilingIndicator,
                  MobileControls, PerformanceMonitor,
                  contexts/StoreCallbacksContext

toy-fluid/        Kept as reference; first port target

docs/             Preserved as reference (all fractal-documented — read-only
                  for patterns, don't treat as engine truth)

HANDOFF.md        This doc
```

## What's done

**Git history on top of GMT (15 commits):**

1–11. Delete-by-domain stages (formulas, mesh export, Fragmentarium, raymarching shader chunks, fractal DDFS features, fractal engine internals, modular graph, prototypes/test harnesses, misc ephemera, fractal UI, 4 truly fractal files).

12. Genericize stage — ShaderBuilder rewritten to 5 generic primitives + `addSection`, ShaderFactory/ConfigManager/historySlice/engineStore/PresetLogic all stripped to their generic kernel. FractalEngine, MaterialController, SceneController, UniformManager, controllers/, overlay/, FormulaFormat, remaining shader chunks deleted.

13. **Fix pass to zero tsc errors** — deleted remaining fractal-leaning features (camera_manager, coloring, navigation, optics, droste, drawing), stubbed the worker subsystem (WorkerProxy as in-memory stub; internals deleted), rewrote App/LoadingScreen/ViewportArea/useAppStartup as minimal generic shells, property-access-cast all downstream feature consumers, fixed type mismatches (QualityState typed numerics, WorkerProxy overloads, Timeline onZoom, registry stub shape).

**Verified:** `npx tsc --noEmit` exits 0.

## Plugin seams designed in

Where a future fractal plugin (or any other app) re-installs its capabilities:

| Capability | Re-entry via |
|-----------|--------------|
| Named shader pipeline stages (post-map, miss-handler, integrator, …) | `ShaderBuilder.addSection(name, code)` + `getSections(name)` — plugin registers its pipeline DSL, its own assembler reads sections back |
| Feature state (any shape) | `FeatureRegistry.register(def)` + generic `createFeatureSlice` auto-generates Zustand slice + `AutoFeaturePanel` auto-generates UI |
| Render engine / render loop | Not supplied by engine. App instantiates its own, consuming the store + the shader built by ShaderFactory |
| Worker offload | `WorkerProxy` is an in-memory stub + registry. Apps install a real Worker-backed proxy via `setProxy(realProxy)` so generic dev/ code and the renderer share one singleton (engine-gmt does this in `installGmtRenderer`). |
| Compile scheduling | `CompileGate.queue(msg, fn)` returns `Promise<void>`; opens a cycle on `CompileProgressStore` (single source of truth for spinner state); 500 ms safety net flushes if `pingRef` never paints. |
| Compile progress UI | `store/CompileProgressStore.ts` — both `LoadingScreen` and `CompilingIndicator` subscribe; rAF loops poll `selectProgress(state, now)`. Bar fill via `transform: scaleX` (compositor thread) survives Firefox's main-thread paint stalls. |
| Config diffing | `ConfigManager.update(newConfig, runtimeState)` → `{rebuildNeeded, uniformUpdate, modeChanged, needsAccumReset}` |
| Preset save/load | `PresetLogic.applyPresetState` iterates feature registry + invokes feature setters. `utils/pngMetadata` for PNG embed. `utils/Sharing` + `UrlStateEncoder` for URL state |
| Undo/redo | `historySlice` — snapshots ALL feature state via registry iteration, automatic for any future plugin |
| Animation engine | `engine/AnimationEngine.ts` with `connect(animStore, hostStore)` injection; no direct store coupling |
| TickRegistry phases | SNAPSHOT → ANIMATE → OVERLAY → UI |
| UI componentRegistry | Apps register panel + overlay components by string ID; DDFS feature defs reference them |
| Custom camera controller | Not supplied. Apps install their own Navigation component |
| FormulaType | `type FormulaType = string` — apps narrow via declaration merging |
| ShaderConfig | `Record<string, any>` with engine-level scalar fields — apps widen via declaration merging |

## Phase progress

### ✅ Phase 0 — Architecture baseline (2026-04-22, stages 14-15)
- Feature-residuals cleaned, SceneFormat.ts generic, default panel config genericized.
- Runtime boot verified; `debug/smoke-boot.mts` passes.
- `PanelId: string` + `AutoFeaturePanel` registered as `'auto-feature-panel'`.
- Demo add-on in `demo/` proves the three-step plugin contract end-to-end.
- Fragilities F1 (96a4b5f), F2 (96a4b5f), F3 (a4e7d6b), F4 (c6ee640) — all 🟢 Fixed.

### ✅ Phase 1 — Fractal-toy (2026-04-22, commits `4830a2c` … `b9d13f9`)
- `fractal-toy/` — minimal Mandelbulb playground: one formula, orbit+fly camera, directional light. Used `ShaderBuilder.addSection` as the escape hatch's first real load.

### ✅ Phase 2 — Viewport plugin (2026-04-22, `610b4e0` … `2f73612`)
- `@engine/viewport` (`engine/plugins/Viewport.tsx`) with GMT's production adaptive-quality loop ported and genericized.
- `<ViewportFrame>`, `<ViewportModeControls>`, `<FixedResolutionControls>`, `<AdaptiveResolutionBadge>` — shared plugin components.
- Immediate quality drop on interaction; `smoke:viewport` passes.

### ✅ Phase 3 — Toy-fluid port (2026-04-22, `4830a2c` … `205745a`)
- `fluid-toy/` — engine-native port of the reference `toy-fluid/`. FluidEngine mounts via `<ViewportFrame>` + `qualityFraction`; pointer→splat interaction layer; julia-c auto-orbit via modulation-style tick.
- `@engine/topbar` (`engine/plugins/TopBar.tsx`) — slot-based host + default items (ProjectName, FpsCounter).
- `@engine/scene-io` (`engine/plugins/SceneIO.tsx`) — Save + Load via topbar slot registration, delegates to `utils/SceneFormat.ts`.
- `<TimelineHost>` — shared animation-timeline chrome with GMT's 317-line TimelineToolbar ported as reusable engine chrome.

### ✅ Phase 4 — Input + undo + camera (2026-04-23, `8662447` … `2b8b6f9`)
- **4a** `engine/animation/modulationTick.ts` — canonical modulation tick; orbit refactored to register LFO animations via `setAnimations` instead of its own per-frame tick.
- **4b** `@engine/shortcuts` (`engine/plugins/Shortcuts.ts`) — scope-based keyboard dispatcher with priority resolution, text-input guard, rebinding hook.
- **4c** `@engine/undo` (`engine/plugins/Undo.tsx`) — unified transaction stack with scoped shortcuts (`Mod+Z` global, `Mod+Z` in `timeline-hover` scope routes to animation undo). Topbar Undo/Redo buttons. (F2b — 🟢 Fixed.)
- **4d** `@engine/camera` (`engine/plugins/Camera.ts`) — adapter-based slot plugin. Apps register a `CameraAdapter` with `captureState`/`applyState`; slots 1-9 save/recall via Ctrl+1..9 / 1..9. Preset round-trip via `camera/presetField.ts` side-effect module (F3 registry).

### ✅ Phase 5 — Animation plumbing (2026-04-23, commit `b82dc18`)
- `engine/animation/modulationTick.ts` now **delegates to GMT's AnimationSystem.tick** via `TickRegistry.ANIMATE`. No reinvention — same code path GMT uses, so keyframe playback, LFO modulation, audio-reactive rules, and resolved liveModulations all work identically.
- `engine/animation/cameraKeyRegistry.ts` — generic Key Cam track list. Default capture path-resolves scalar paths in DDFS store; apps override via `setCameraKeyCaptureFn`.
- `engine/AnimationEngine.ts` extended binder resolution: generic 3-part vec paths (`feature.param.x/y/z/w`) alongside GMT's legacy `vec[23][ABC]_axis` convention.
- `store/engineStore.ts` eagerly imports `animationStore` so `window.useAnimationStore` is set before `bindStoreToEngine()` runs → `animationEngine.connect(animStore, hostStore)` always succeeds.
- Both toys now mount `<EngineBridge />`, `<RenderLoopDriver />`, `<GlobalContextMenu />` from the GMT chrome — not reinvented, just mounted.

**Verified via `debug/smoke-anim-play.mts`:** playback advances frame 0 → 73.5 in 700ms; a 2-keyframe track on `julia.power` (2 → 6 over 30 frames) drives the bound param correctly.

### ✅ Phase 6 — GMT vertical slice (2026-04-24)

The "real confidence anchor" previously flagged in Remaining Work has landed: GMT runs end-to-end on the engine. **app-gmt/** boots the full worker renderer, compiles the Mandelbulb shader, renders with path tracing, and responds to Orbit/Fly navigation. All 26 GMT DDFS features + 42 formulas are registered. Key landmarks:

- **Renderer plugin** (`engine-gmt/renderer/`) — `installGmtRenderer` + `GmtRendererCanvas` (OffscreenCanvas + worker) + `GmtRendererTickDriver`.
- **Navigation ported verbatim** (`engine-gmt/navigation/`) — `GmtNavigation`, `useInputController`, `usePhysicsProbe`, `HudOverlay`. No logic edits, only path rewrites.
- **Store hydration via preset** — app-gmt's boot loads `registry.get('Mandelbulb').defaultPreset` through `loadScene()` so every DDFS slice is populated before the worker compiles. Without this the worker booted with a half-formed config and rendered black. Mirrors GMT's `useAppStartup` exactly.
- **Declaration-merged DDFS slices** (`engine-gmt/storeTypes.ts`) — `FeatureStateMap` augmented so the 18 GMT slices (coloring, lighting, geometry, …) typecheck on the root store without local copy-type drift.

### ✅ Panel manifest migration (2026-04-24)

Dock panels moved from "each feature declares its own tab" to "apps declare a PanelManifest". The old tabConfig path suited fluid-toy (9 features, 1:1 panels) but blocked the GMT port (26 features → 10 curated panels composing 2-9 features each). New model:

- **`engine/PanelManifest.ts`** — `PanelDefinition` type with `features[]` stacking, `component` path for bespoke panels (Graph/FlowEditor), `widgets.before/after/between` slotting, and `showIf` predicates (string path or function). See `docs/engine/14_Panel_Manifest.md`.
- **`applyPanelManifest(m)` + `addPanel(def)`** — merge-seed `state.panels`; dynamic additions (fractal-toy formulas) survive regardless of call order.
- **`PanelRouter` rewritten** — three render paths (bespoke component / feature stack with widgets / empty). No hardcoded Graph/CameraManager/Engine special-cases.
- **`Dock.tsx` filters via `evalShowIf`** — hardcoded `Graph if Modular` / `Light if advanced` / `Audio if enabled` / `Drawing if enabled` conditionals pulled out, now declared in each app's manifest.
- **Both docks now mount unconditionally** in AppGmt + FluidToyApp. Fixes the "julia disappears on left-dock drop" bug (panels moved to left had nowhere to render).
- **`FeatureTabConfig` reduced to `{label, iconId?, condition?}`** — `dock / order / componentId / defaultActive / aggregatesFrom` removed from 22 feature files and the type.
- **`applyDefaultPanelLayout.ts` + `featureRegistry.getTabs()` deleted** — no consumers.

App manifests:
- `engine-gmt/panels.ts` — 10 panels (Formula / Scene / Shader / Gradient / Quality / Light / Audio / Drawing / Graph / Engine).
- `fluid-toy/panels.ts` — 9 panels, 1:1 with features.
- `fractal-toy/panels.ts` — 2 static + formulas via `addPanel`.

### Known gaps after panel migration

(Most of these closed in the subsequent topbar / compile / camera / formula-picker passes — see below.)

### ✅ Topbar port — Passes 1-3 (2026-04-24)

- **Pass 1 (inline items + menus)**: Playing badge (left, pulsing green when animating), PT toggle (left, flips `renderMode` between Direct + PathTracing), **Camera menu** (Reset Position, Camera Manager stub, 9 slots with click-to-recall / save-on-empty), **System menu** (Advanced Mode, Invert Look Y, Hide Interface, Force Mobile UI, Formula Workshop stub), extended Menu plugin with `disabled?` on button/toggle items.
- **Pass 2 — Light Studio**: Ported `CenterHUD` verbatim — 3-orb collapsed / 8-light 3×3 expanded, shadow toggle + popup, light-gizmo toggle. Registered into the TopBar's `'center'` slot. LightControls / LightDirectionControl / ShadowControls / SingleLightGizmo were already in `engine-gmt/features/lighting/components/`.
- **Pass 3 — Viewport Quality**: Ported `ViewportQuality.tsx` verbatim (PT-aware per-subsystem tier controls + master preset + compile-time batching).
- **Scalability slice** — Ported `scalabilitySlice.ts` from gmt-0.8.5 to `store/slices/`. Root types already declared `scalability` + `hardwareProfile` but nothing initialised them, so ViewportQuality crashed until this landed.

### ✅ Compile pipeline + formula switching (2026-04-24)

- **`engineStore.setFormula` rewritten** to mirror GMT's full flow: clone defaultPreset → preserve compile-time engine params marked `onUpdate:'compile'` → honour `lockSceneOnSwitch` → `loadPreset` → `CONFIG_DONE` event → worker immediate compile.
- **`setFormulaPresetResolver(fn)`** — engine-core stays decoupled from any specific formula registry; apps register their own resolver (engine-gmt-based apps pull from `engine-gmt/engine/FractalRegistry`).
- **`FRACTAL_EVENTS.CONFIG_DONE`** — new generic event; `engine-gmt/renderer/GmtRendererTickDriver` bridges it to `proxy.post({type:'CONFIG_DONE'})` so the worker fires immediate compile without the 200ms scheduleCompile debounce.
- **CompilingIndicator** mounted in AppGmt — IS_COMPILING events (forwarded by WorkerProxy from the worker's FractalEngine) now drive a visible spinner.
- **PT toggle** flips `state.renderMode` (not `ptEnabled`) — the bindings.ts subscription forwards to `setLighting({ renderMode })`, which is the compile-triggering DDFS write GMT expects. `ptEnabled` stays always-on to avoid a second compile hop.

### ✅ Formula picker (2026-04-24)

- Ported GMT's `FormulaSelect` + `FormulaGallery` (full thumbnail-grid dropdown with category sections + type-to-filter + preview) + `FormulaContextMenu` into `engine-gmt/components/panels/formula/`. Registered as `'formula-select'` componentId and slotted via `widgets.before: ['formula-select']` on the Formula panel — matches GMT's layout exactly (picker at the top of the Formula panel, not in the topbar).
- Copied 42 formula thumbnails into `public/thumbnails/` so the gallery preview works.

### ✅ Camera round-trip (2026-04-24)

All three broken flows fixed:

- **Initial load**: after bootWithConfig, `proxy.setShadowOffset(precise)` + `proxy.post({type:'OFFSET_SET'})` so the worker's sceneOffset matches the hydrated preset from frame 1 (mirrors GMT's `useAppStartup`).
- **Formula switch / preset load**: `engineStore.loadPreset` emits both `CAMERA_TELEPORT` AND `OFFSET_SET` directly — Navigation warps the R3F camera, the OFFSET_SET bridge pushes sceneOffset to the worker.
- **Navigation movement**: app-gmt's `setSceneOffset` prop emits `OFFSET_SET` so orbit-absorb and fly-controller keep the worker offset in sync.
- **Reset Position** (Camera menu): restores the current formula's `defaultPreset.{cameraRot, sceneOffset, targetDistance}` via CAMERA_TELEPORT.
- **Preset fields**: `sceneOffset` and `cameraMode` added to `presetFieldRegistry` — save/load now preserves them.

### ✅ Widget registrations (2026-04-24)

- **ColoringHistogram** (per-layer, driven by HistogramProbe readbacks)
- **scene_widgets**: `OpticsControls`, `OpticsDofControls`, `NavigationControls`, `ColorGradingHistogram`
- **HybridAdvancedLock**, **JuliaRandomize**, **InteractionPicker** (Julia c / Mandelbrot c-param picker)
- **EnginePanel** (bespoke, registered as `'panel-engine'`) — surfaces compile-time feature toggles in its own layout. Visibility gated on `engineSettings.showEngineTab`; toggle wired in `engine-gmt/topbar.tsx:539-559` under System → Advanced.
- **CameraManagerPanel** (bespoke, `'panel-cameramanager'`) — fully wired. Slice at `engine-gmt/store/cameraSlice.ts` (composes engine-core's `installStateLibrarySlice` factory), panel at `engine-gmt/features/camera_manager/CameraManagerPanel.tsx`, slot active in `engine-gmt/panels.ts:374-380`. Includes thumbnail capture, drag-reorder, slot shortcuts (Ctrl+1..9 / 1..9), and `undoCamera` / `redoCamera` wrappers that fire `CAMERA_TELEPORT` after engine-core's history slice restores the diff.

### ✅ Interaction picker (2026-04-24)

- Ported `useInteractionManager` hook (focus picking + Julia picking with drag + lerp + record-keyframes) verbatim.
- Mounted in AppGmt with a `viewportRef` on the ViewportFrame's inner wrapper.
- Added `'picking_julia'` to root `InteractionMode` type (extraction drop).

### ✅ Menu plugin — live store subscription (2026-04-24)

- Menu plugin now subscribes to `useEngineStore` and bumps its notify rev on every store change, so toggle items' `isActive()` re-evaluates on each render. Previously the badge stayed stale until a menu-item re-registration. Advanced Mode badge flips correctly now.

### ✅ Post-phase-5 cleanup (2026-04-23 afternoon)

Everything flagged as "known gaps after Phase 5" has landed:

- **F12** 🟢 — UNDERSCORE vec binder in `AnimationEngine.getBinder` via shared `writeVecAxis` helper. Camera Key Cam + AutoFeaturePanel vec2/3/4 all line up on one convention. (commit `be62d7d`)
- **F13** 🟢 — GMT-specific target hijacks (`julia.*` / `coloring.*` / `geometry.*Rot`) in `AnimationSystem.tsx` gated on their slices. Generic DDFS vec + scalar fallback populates `liveModulations` without requiring a `uniform` declaration. (commit `be62d7d`)
- **trackBinding helper** extracted to `engine/animation/trackBinding.ts`. `deriveTrackBinding()` + `readLiveVec()` are the canonical track-ID derivation — AutoFeaturePanel's four branches all route through it. (commit `252060a`)
- **Canvas right-click menu** wired on fluid-toy (Copy Julia c / Pause / Orbit / Recenter / Reset). (commit `ae13ce2`)
- **Canvas pan + wheel + middle-drag zoom** in `FluidPointerLayer.tsx`. Right-drag pans, wheel zooms cursor-anchored, middle-drag zooms click-point-anchored. (commits `e518f47`, `bf1ba8d`)
- **Julia/Mandelbrot kind switch** as a DDFS enum param. (commit `3549d4e`)
- **Vec2 keyframe buttons** in AutoFeaturePanel (the missing `trackKeys` prop on Vector2Input). (commit `acb530c` — immediately superseded by the trackBinding refactor.)
- **Screenshot folded into scene-io** — standalone camera button + `Alt+S` hotkey + dropdown "Save PNG…" all route through one `saveCurrentPng` helper. `Ctrl+Shift+S` is browser-reserved, never reaches JS. (commit `a6795da`)

## Remaining work

> Audited 2026-04-26 evening. Quick wins applied; this list is the post-audit truth.

### Active backlog — real work

**GMT port — finish-the-job items:**
*(none currently outstanding — cameraSlice was at `engine-gmt/store/cameraSlice.ts` all along; the audit that flagged it as missing only searched `store/slices/`.)*

**Fluid-toy polish:**
- **Gesture-mode switcher** — brush / emitter / pick-c / pan-zoom UI. Today's `FluidPointerLayer.tsx` hardcodes left-drag splats / right-drag pan / middle-zoom / wheel-zoom. No mode switcher.
- **MandelbrotPicker as viewport overlay** — component exists at `fluid-toy/components/MandelbrotPicker.tsx` registered as `'julia-c-picker'`. Currently surfaced only via the Julia panel's customUI slot; reference toy-fluid has it as a persistent bottom-right canvas overlay.
- **DDFS-param parity audit** — 53 params currently ported across 9 features (brush/collision/composite/coupling/fluidSim/julia/palette/postFx/presets). Tone-mapping, bloom, orbit-trap coloring all DONE. No comprehensive audit of which of the original ~87 reference toy-fluid params remain unported.

### Deferred — no visible symptoms, cosmetic / architectural

| ID | What | Where | Realistic effort |
|----|------|-------|------------------|
| **F6** | Auto-register DDFS feature setters via `binderRegistry` (escape hatch shipped; full auto-reg deferred) | `engine/AnimationEngine.ts` + `engine/FeatureSystem.ts` | 30 min for scalar/vec params; camera + light tracks must stay explicit |
| **F8** | UI-state undo (panel collapse, timeline scroll, dock layout) — `historySlice` snapshots only registered features today | `store/slices/historySlice.ts:83-94` | 5 min naive (add to snapshot loop); 2 h with scoped 'ui' undo separation |
| **F10** | Rename `formula: string` → `mode` in store types | `types/store.ts:81` + 30 files + on-disk GMF / preset format | **2-3 h** — needs a migration in `applyMigrations` mapping `formula → mode` on load to avoid breaking existing saves. **Not a paper-cut.** |
| **F11** | Rename `FractalEvents` → `EngineEvents` | `engine/FractalEvents.ts` + 53 consumer files (236 references) | **1-2 h** — mechanical but voluminous. Better as a focused commit, not bundled. |

### Closed in 2026-04-26 audit (was listed as outstanding)

- ✅ **F9** — dev-mode `componentId` validator (`validateComponentRefs`)
- ✅ **F14** shim cleanup — all 4 files now re-exports
- ✅ **F15** — worker `_localOffset` 2s timeout removed; drift check is the deterministic guard
- ✅ **GMF custom-formula loading + save round-trip** — `parseScene` / `serializeScene` plugin hooks; app-gmt wires `loadGMFScene` + `saveGMFScene`; FormulaSelect import button now registers def
- ✅ `showQuickPng` typecheck error
- ✅ `express` / `@types/express` removal
- ✅ README + demo/README + smoke-script wiring (verified up-to-date, claims were stale)
- ✅ EnginePanel "Show Engine Tab" toggle wiring (already shipped in topbar.tsx)
- ✅ Orbit-trap gradient port (non-issue — no richer modes exist in fluid-toy reference)

## How to resume

```bash
cd h:/GMT/gmt-engine
git log --oneline -30          # full stage progression
npm run typecheck              # should exit 0
npm run dev                    # plain vite on localhost:3400

# Entry points:
#   http://localhost:3400/               — engine shell (demo add-on)
#   http://localhost:3400/fractal-toy.html — minimal Mandelbulb playground (phase 1)
#   http://localhost:3400/fluid-toy.html   — engine-native fluid toy port (phases 3-5)

# In another shell — smoke checks:
npm run smoke:boot             # headless boot, fail on pageerrors
npm run smoke:interact         # state-flow + save round-trip
npm run smoke:screenshot       # visual baseline → debug/scratch/engine-boot.png
npm run smoke:viewport         # adaptive-quality viewport plugin
# Direct:
npx tsx debug/smoke-anim-play.mts  # timeline playback (phase 5)
```

Note: the `dev` script is now plain `vite`. GMT's custom Express
`server/server.js` was removed in stage 16 — it ran Vite in
middleware mode without attaching HMR to the HTTP server, which
caused full-page reloads every 1-2s. Plain `vite` works out of
the box.

The `upstream` remote points at GMT. Pull updates with `git fetch upstream`. There is no `origin` — nothing pushes anywhere until you add one.

If the experiment turns out not to work: `rm -rf h:/GMT/gmt-engine`. GMT is untouched.

## Key memory references

- `memory/feedback_refactor_approach_selection.md` — why clone-and-strip beat in-place workspace refactor
- `memory/feedback_strip_vs_delete.md` — when to genericize vs delete (generic patterns worth preserving even when fractal-coupled)
- `memory/project_gmt_engine_extraction.md` — pointer to this repo + HANDOFF.md

## Code review

`docs/engine/21_Code_Review_2026-04-25.md` — independent multi-agent source survey (2026-04-25). Records what matches the architecture docs, where docs overstate, three live bugs (F16–F18), and the full dual-tree inventory. Read before touching `engine/plugins/`, the dual-tree (`engine-gmt/engine/`), or the onboarding surfaces (README, demo, package.json).
