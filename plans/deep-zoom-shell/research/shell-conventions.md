# Shell conventions — what a gmt-shell is, read from Gradient Explorer v2 and fluid-toy

Reader: shell-conventions. Date 2026-10-07. Worktree `deep-zoom` (branch `deep-zoom-tool`).
Everything under "Verified facts" was read in the file named; quoted lines are verbatim.
Paths are relative to the worktree root.

Files opened in full: `fluid-toy/FluidToyApp.tsx`, `fluid-toy/setup.ts`, `fluid-toy/panels.ts`,
`fluid-toy/main.tsx`, `fluid-toy/registerFeatures.ts`, `fluid-toy.html`,
`gradient-explorer/v2/main.tsx`, `gradient-explorer/v2/registerFeatures.ts`,
`gradient-explorer/v2/useIsPhone.ts`, `deep-zoom/main.tsx`,
`.claude/rules/sibling-apps.md`, `.claude/rules/mobile-layout.md`.
Opened in part (the lines cited): `gradient-explorer/v2/GradientExplorerV2App.tsx` (header 1-100 +
grep of mounts), `gradient-explorer.html`, `components/layout/Dock.tsx` (1-82),
`engine/components/MobileViewportShell.tsx` (1-90), `components/DraggableWindow.tsx` (1-60),
`engine/store/colorSchemeStore.ts` (1-60), `demo/README.md` (1-120), `fluid-toy/README.md`
(157-270), `fluid-toy/engineHandles.ts`, `fluid-toy/storeTypes.ts` (1-40),
`docs/modules/fluid-toy/index.md`, `docs/modules/gradient-explorer/app.md` (1-50),
`fractal-toy/FractalToyApp.tsx` (imports + JSX tags only), `debug/smoke-chrome.mts` (APPS table),
`vite.config.ts` (input block), `knip.json`, `launcher.html` (links only).

---

## 1. Verified facts

### 1.1 There are two shell shapes in the repo, not one

| | "Full" shell (fluid-toy, fractal-toy, demo) | "Streamlined" shell (Gradient Explorer v2) |
|---|---|---|
| Root | plain `div.fixed.inset-0 … flex flex-col` | `<MobileViewportShell>` |
| Top bar | `<TopBarHost/>` from `engine/plugins/TopBar` | hand-laid buttons in the app file; Help menu opened from `v2/ShellMenu.tsx` |
| Panels | `<Dock side="left"/>`, `<Dock side="right"/>`, `<DropZones/>`, `DraggableWindow` + `PanelRouter` | none — "No Dock, no side panel, no drawer, no timeline" |
| Centre | `<ViewportFrame>` with a `<canvas>` | the hero + the wall (its own surfaces) |
| Timeline | `<TimelineHost/>` | none |
| Plugins installed | 16 install calls (list in 1.3) | 3 (`installShortcuts`, `installUndo`, `installMenu`) + Help via its own `installGxHelp` |
| State | DDFS features in the engine store | `palette/` stores; engine store used for panels/undo/context menu only |

GX v2 says so itself, `gradient-explorer/v2/main.tsx` header:

```
 * The streamlined shell (plans/ge-v2-design.md §6b): no Dock, no TopBarHost, no Hud /
 * SceneIO / timeline. What is installed is exactly what the pieces the shell
 * mounts need
```

`fractal-toy/FractalToyApp.tsx` mounts the same set as fluid-toy (`EngineBridge`, `DropZones`,
`DraggableWindow`+`PanelRouter`, `TopBarHost`, `ViewportFrame`, `Dock side="right"`,
`TimelineHost`, `GlobalContextMenu`) — so the full shape is the repo's majority pattern, three
apps to one.

### 1.2 The full shell's anatomy — `fluid-toy/FluidToyApp.tsx` (`FluidToyApp`, the JSX at the end)

Regions top to bottom, with the component that provides each:

```tsx
<StoreCallbacksProvider value={storeCallbacks}>               // components/contexts/StoreCallbacksContext
<div className="fixed inset-0 w-full h-full bg-black text-fg select-none overflow-hidden flex flex-col">
    <EngineBridge />                                          // components/EngineBridge  (animation engine <-> store)
    <RenderLoopDriver />                                      // engine/plugins/RenderLoop (RAF -> runTicks)
    <DropZones />                                             // components/layout/DropZones (dock drop targets)

    {floatingPanels.map((p) => (
        <DraggableWindow key={p.id} id={p.id} title={panelLabel(p.id)}>   // components/DraggableWindow
            <PanelRouter activeTab={p.id as PanelId}                      // components/PanelRouter
                state={useEngineStore.getState()} actions={useEngineStore.getState()}
                onSwitchTab={(t) => togglePanel(t, true)} />
        </DraggableWindow>
    ))}

    <TopBarHost />                                            // engine/plugins/TopBar

    <div className="flex-1 flex overflow-hidden relative">
        <Dock side="left" />                                  // components/layout/Dock
        <ViewportFrame className="flex-1">                    // engine/plugins/viewport/ViewportFrame
            <canvas ref={canvasRef} id="ft-render-canvas"
                    className="absolute inset-0 w-full h-full block touch-none" />
            <FluidPointerLayer canvasRef={canvasRef} engineRef={engineRef} />   // app-local gestures
            <HudHost />                                       // engine/plugins/Hud
            <DomOverlays />                                   // app-local: feature viewport overlays
        </ViewportFrame>
        <Dock side="right" />
    </div>

    <TimelineHost />                                          // components/TimelineHost
    <HelpOverlay />                                           // engine/plugins/Help
    <SettingsHost />                                          // components/SettingsAccess
    {contextMenu.visible && <GlobalContextMenu … />}          // components/GlobalContextMenu
</div>
</StoreCallbacksProvider>
```

- **Floating panels** are computed in the app, not by a host component:
  `const floatingPanels = (Object.values(panels) as PanelState[]).filter((p) => p.location === 'float' && p.isOpen);`
  Each is a managed `DraggableWindow` (given `id`), whose JSDoc says the header "carries a
  dock-drag handle (`startPanelDrag`) so the window can be dragged back into the dock". So
  dock <-> float is one mechanism: `panels[id].location` in the engine store, `DropZones` as the
  targets. No backdrop exists to click.
- **The picture** is a plain `<canvas>` child of `ViewportFrame`, with a stable DOM id that other
  plugins use — `installSceneIO({ getCanvas: () => document.getElementById('ft-render-canvas') … })`
  in `fluid-toy/main.tsx`. The comment there records why: "A loose querySelector('canvas') returns
  the FIRST canvas in the DOM, which can be a Favients gradient swatch".
- **Render size** is derived in the app from the Viewport plugin, not owned by the renderer:
  `canvasPixelSize` (ViewportFrame's ResizeObserver, physical px) / DPR x `renderScale` x
  `useQualityFraction()` -> `engine.setRenderSize(finalW, finalH)`.
- **Renderer sync** is one hook per concern outside the JSX: `useFluidEngine` (boot + own RAF),
  `useEngineSync` (every DDFS slice -> renderer), `useDeepZoomOrbit`. The app file's header calls
  itself a "Thin shell".
- **Selectors are granular on purpose.** Comment in `FluidToyApp`: "DO NOT use `useEngineStore()`
  with no selector here … trips React's max-depth guard."
- **Boot splash** lives in the HTML (`#ft-boot-splash` in `fluid-toy.html`, outside `#root`) and
  the app removes it on the renderer's first frame (`dismissSplash`), with a 12 000 ms safety
  timeout.

### 1.3 The full shell's boot — `fluid-toy/main.tsx`, in file order

1. `import './registerFeatures';` first, then `./migrations`, `../engine/plugins/camera/presetField`, `../index.css`.
2. `registerUI()` (`engine/features/ui`).
3. `installViewport({ enabled, targetFps: 45, minQuality: 0.4, interactionDownsample: 0.5, activityGraceMs: 100, engageOnAccumOnly: true })`.
4. `installTopBar()`, then `topbar.register({ id, slot: 'left'|'right', order, component })` for app buttons.
5. `registerCoreSettings({ autosave: null })` + `topbar.register({ id: 'settings', slot: 'right', order: 100, component: SettingsButton })`.
6. `installPwaUpdate()`, `installPauseControls()`, `installBucketRender({ controller, slot, order, id })`.
7. `installSceneIO({ getCanvas })`.
8. `registerCameraKeyTracks([...])`, `registerLogTrack('julia.zoom')`, `registerCameraPair({ zoom, pan, panLow })`.
9. `installModulation()`, `installModulationUI()`.
10. `installShortcuts()`, `installUndo()`.
11. `installCamera({ hideShortcuts: true })` + `camera.register({ featureId: 'julia', captureState, applyState })`.
12. `installMenu()`; `registerFeedbackUI()`; `installHelp({ support: gmtSupportConfig(), extraItems: [feedbackMenuItem()] })`.
13. `installHud()`; `help.registerHudHint({...})`; `hud.register({ id, slot: 'bottom-left', order, component })`.
14. `installFluidToyViewLibrary(...)` (the state library — saved views, slot shortcuts, Camera menu).
15. `componentRegistry.register('panel-views', ViewLibraryPanel)` etc. — store-importing widgets, registered **after** the store exists.
16. `installRenderDialog({ runner: runVideoExport, defaults: { samplesPerFrame: 32 } })`.
17. `setupFluidToy()` -> `applyPanelManifest([...FluidToyPanels, feedbackPanelEntry()])` + `setDockCollapsed('left', false)`.
18. `mountFavientsPanel({ storageKey: 'fluid-toy.favients.panel', paletteFilters: false })`.
19. `ReactDOM.createRoot(root).render(<AppErrorBoundary><React.StrictMode><FluidToyApp/></React.StrictMode></AppErrorBoundary>)`.

Ordering constraints stated in the file: `installMenu` before `installHelp`; the view library
"Must run AFTER installMenu / installShortcuts … and BEFORE setupFluidToy"; `mountFavientsPanel`
"Must run AFTER setupFluidToy()'s applyPanelManifest".

Not installed by fluid-toy (grep of its `main.tsx` imports): Tutorial, WhatsNew, Session,
SceneFileClaims. GX v2 has What's New and a session, but through its own `help/installGxHelp` and
`v2/session.ts` (`installGxSession`) — unverified whether those wrap `engine/plugins/WhatsNew` /
`Session` or stand alone.

### 1.4 The freeze-order trap (both apps, same rule)

`fluid-toy/registerFeatures.ts`: features and store-free widgets register here, before the store
exists. A widget that imports `useEngineStore` at module scope must NOT be imported here:

```
// Note: DeepZoomStatus imports useEngineStore — registering it via
// componentRegistry would freeze the registry pre-feature-registration
// (see README "boot-order trap").
```

and when a registration-time module needs the store it reaches it late through the global handle:
`(globalThis as { __engineStore?: … }).__engineStore` (the `registerSendTarget` block).
GX's `v2/registerFeatures.ts` header states the same rule: "BEFORE anything touches the engine
store (the feature + component registries freeze on first store access)".

### 1.5 Panels are a manifest, widgets are registered ids — `fluid-toy/panels.ts` (`FluidToyPanels`)

- One `PanelDefinition` per dock tab: `{ id, dock: 'left'|'right', order, active?, showIf?, items | features }`.
- Sectioning is `items`: `{ type: 'feature', id, whitelistParams: [...] }`, `{ type: 'section', label }`,
  `{ type: 'widget', id, showIf? }`. `engine/PanelManifest.ts` (`PanelItem`) also has `separator`,
  `collapsible`, `accordion`, `compilable`, `compile-dropdown`, `runtime-section` (names read from a
  grep of the union; bodies unverified).
- **No `component: 'panel-X'` anywhere in fluid-toy's manifest.** Custom UI is
  `{ type: 'widget', id: 'panel-views' }` + `componentRegistry.register('panel-views', ViewLibraryPanel)`.
  (A stale comment in `main.tsx` still says "referenced from the manifest by `component:`"; the
  manifest uses `type: 'widget'`.)
- Layout convention: "Left dock -> authoring … Right dock -> sim / look". 6 tabs left, 6 right.
- A panel that only makes sense in one mode hides with a `showIf` predicate on the panel
  (`showIf: fluidOn`), and one section inside a visible panel hides with `showIf` on the item.
- A shared panel comes from its owner as an entry factory, spread in: `favientsPanelEntry({ dock: 'right', order: 90 })`,
  `feedbackPanelEntry()`. `setup.ts` spreads the feedback one "so panels.ts stays free of
  engine-gmt imports".
- `PanelDefinition.chrome?: 'window' | 'bare'` exists for a floating panel with no window chrome.

### 1.6 Gradient Explorer v2 — what it does differently and why

- Root is `<MobileViewportShell className="bg-surface text-fg select-none">`
  (`GradientExplorerV2App.tsx`, the `THE FRAME (Phase F)` comment). Fluid-toy's root is a
  hard-coded `fixed inset-0 … bg-black`.
- It mounts, from the engine: `StoreCallbacksProvider`, `GlobalContextMenu`, `ToastHost`
  (`engine/components/ToastHost`), `SettingsHost storage={false}`, `HelpOverlay`,
  `DropScrim` (`components/ui/DropScrim`), `MobileViewportShell`. Brand is
  `GmtWordmark` from `engine-gmt/topbar/GmtWordmark`.
- Its top bar is hand-laid: "brand · undo · redo · Back to GMT · help (?) · settings — on a phone
  brand · undo · redo · ONE menu holding the rest". It still uses the engine's Menu and Help
  registries — only the host is its own: "No TopBarHost renders the menu here: the shell opens it
  from its own top-bar buttons (./ShellMenu)". `installUndo({ hideTopBarButtons: true })`.
- It still calls `applyPanelManifest([feedbackPanelEntry()])` with no dock, to give
  `openFeedback()` "an open state to flip; there is no panel router, so ShellMenu's FeedbackWindow
  draws it".
- Why: it is not a renderer app. Its centre is a document (one working gradient) and a catalogue
  wall, and its state lives in `palette/` stores, not DDFS features. ADR-0114 (the v2 shell and
  its visual language) and ADR-0115 (the shell on a phone) carry the reasoning — both unverified
  (not opened).
- Phone: one predicate, `v2/useIsPhone.ts` = `useMobileLayout().isDeviceMobile`, and a stated
  split: "USE IT FOR STRUCTURE ONLY — what is mounted, and where. Pure CSS differences go through
  Tailwind's `md:` / `max-md:` variants, which are the same 768 px number".
- The page's HTML locks the document: `html, body { height: 100vh; overflow: hidden; }` on every
  pointer type, `overscroll-behavior: none`. Fluid-toy's HTML only locks on
  `(hover: hover) and (pointer: fine)`.
- Per-app feel knobs go through engine seams, not forks:
  `<NumberDragFeelProvider feel={{ minSlowdown: 2, maxSlowdown: 2.5 }}>` (`components/inputs/dragFeel`).

### 1.7 Phone behaviour of the shared pieces

- `engine/components/MobileViewportShell.tsx`: mobile = `sticky top-0 h-screen overflow-hidden`
  + inline `height: '100dvh'` + `env(safe-area-inset-*)` padding; desktop = `fixed inset-0 w-full h-full`.
  Branches on raw `isDeviceMobile`.
- `components/layout/Dock.tsx` (`checkIsMobile`): `(pointer: coarse)` OR `innerWidth < 768`. On
  mobile, a left-docked panel is re-routed to the right dock — but only if it has a `showIf` or is
  already open: `if (!mdef?.showIf && !p.isOpen) return false; location = 'right';`. The comment
  says "On mobile the left dock isn't mounted (see AppGmt)".
- `app-gmt/AppGmt.tsx` is the only full shell that handles a phone: root is
  `<MobileViewportShell className="bg-black text-fg select-none overflow-hidden flex flex-col">`,
  left dock is `!isMobile && <Dock side="left" />`, timeline is `{!isMobile && <TimelineHost … />}`.
- **Fluid-toy does none of that**: `fixed inset-0` root, both docks and the timeline always
  mounted. `debug/smoke-chrome.mts` `APPS` gives it `viewports: ['desktop']` only. So fluid-toy on
  a phone is unguarded and, by the Dock rule above, its 6 left tabs (none has a `showIf` except
  the hidden `Fractal`) would be dropped from the right dock unless opened — behaviour unverified
  in a browser.
- The 768 px test is re-implemented in 8 places (`.claude/rules/mobile-layout.md`), `Dock.tsx`
  among them.

### 1.8 Theming

- `engine/store/colorSchemeStore.ts` (`useColorScheme`, `THEME_PRESETS`): six axes (brightness,
  surfaceTint, highContrast, accentHue, secondaryHue, surfaceHue) applied as inline CSS custom
  properties on `<html>`, cached in `localStorage['gmt.themeVars']`. "Persistence keys are shared
  across same-origin apps, so a choice in one app themes the whole suite." ADR-0080.
- Every app page carries the same pre-React line (`fluid-toy.html`, `gradient-explorer.html`,
  and already `deep-zoom.html` line 19):

```html
<script>try{var s=localStorage.getItem('gmt.themeVars');if(s)document.documentElement.style.cssText+=s;}catch(e){}</script>
```

- The Settings panel is the user's door: `registerCoreSettings(opts)` (`store/coreSettings`) +
  `SettingsButton` in the top bar + `<SettingsHost/>` mounted in the app (`components/SettingsAccess`).
  `registerCoreSettings({ autosave: null })` when the app runs no autosave — "autosave is per app
  (owner, 2026-09-13)".
- Chrome colours are tokens (`text-fg`, `bg-surface`, `rgb(var(--app-bg))`, `rgb(var(--accent-400))`
  in the splash CSS). Fluid-toy's root uses `bg-black` because the picture fills it.

### 1.9 Page, build and listing wiring

- One HTML file per app at the repo root, script `type="module" src="/<app>/main.tsx"`.
- `vite.config.ts` `build.rollupOptions.input` has one line per page; `'deep-zoom': path.resolve(__dirname, 'deep-zoom.html')` is already there.
- `knip.json` lists each app's `main.tsx` as an entry; `deep-zoom/main.tsx` is already there.
- `launcher.html` links every app; `deep-zoom.html` is already linked (line 184).
- `debug/smoke-chrome.mts` `APPS` has 5 rows (app-gmt, fluid-toy, fractal-toy, gradient-explorer,
  gradient-explorer-next). **deep-zoom is not in it.**
- `.claude/rules/sibling-apps.md` `paths:` lists fluid-toy, fractal-toy, mesh-export,
  gradient-explorer, demo. **`deep-zoom/**` is not scoped by any rule** (`.claude/rules/deep-zoom.md`
  scopes `engine/fractal/deepZoom/**`, the 2D reference-orbit code — a different thing with the
  same name).
- `docs/modules/` has a folder for fluid-toy, fractal-toy, gradient-explorer, mesh-export, palette.
  **None for deep-zoom.**
- Today's `deep-zoom/main.tsx` says of itself: "Deliberately the lean boot (the mesh-export
  pattern): no engine store, no plugins."

---

## 2. Blueprint for the deep-zoom shell (this area only)

### 2.1 Template choice

**Template: fluid-toy.** Deep zoom is a renderer app — one canvas, a camera, tens of numeric
params, keyframes worth having, image export. Every one of those is a plugin fluid-toy already
installs. The owner's instruction ("as much of gmt-engine's native plugins as possible") rules
out GX's hand-laid top bar and absent dock.

**Take from Gradient Explorer v2, five things:**
1. `MobileViewportShell` as the root instead of `fixed inset-0` (and from app-gmt, the two
   `!isMobile &&` gates on the left dock and the timeline).
2. One phone predicate file, structure in JS / paint in Tailwind `md:` variants (`useIsPhone.ts`).
3. The locked-document HTML (`html, body { height: 100vh; overflow: hidden; }`, `overscroll-behavior: none`)
   — a deep-zoom canvas eats every touch.
4. `ToastHost` mounted (fluid-toy does not mount one).
5. A session via the engine seam rather than hand-rolled localStorage (GX's `installGxSession`
   is the worked example; the generic plugin is `engine/plugins/Session.ts` — another reader owns it).

### 2.2 File layout (mirrors fluid-toy name for name)

```
deep-zoom.html                 entry page (exists; add splash + locked document)
deep-zoom/
  main.tsx                     boot: registerFeatures first, installs in the 1.3 order, render
  registerFeatures.ts          featureRegistry.register(...) + store-free widgets only
  setup.ts                     setupDeepZoom(): applyPanelManifest([...DeepZoomPanels, feedbackPanelEntry()])
  panels.ts                    DeepZoomPanels: PanelManifest
  DeepZoomApp.tsx              thin shell: the 1.2 JSX, nothing else
  storeTypes.ts                AppFeatureSlices + FeatureStateMap augmentation (SliceFromParams)
  engineHandles.ts             defineAppHandles<DeepZoomHost | null>('deep-zoom.host', null)
  features/<name>.ts           FeatureDefinition + sync<Name>ToHost(host, slice)
  useDeepZoomHost.ts           boots the host (iframe today, module later), dismisses the splash
  useHostSync.ts               one useSlice + one useEffect per feature
  DeepZoomPointerLayer.tsx     canvas gestures
  components/                  registered widgets, HUD badges, top-bar buttons
  hotkeys.ts  migrations.ts  viewLibrary.ts   as the need arrives
  README.md  CODE_MAP.md       same two docs fluid-toy has
docs/modules/deep-zoom/index.md   the light entry page
```

The existing `deep-zoom/store.ts`, `ui/*` and the bookmark code are what this replaces; do it in
place in `deep-zoom/` (improve the master, no `deep-zoom-v2/` beside it).

### 2.3 The app component

```tsx
export const DeepZoomApp: React.FC = () => {
    const panels = useEngineStore((s) => s.panels);            // granular selectors only
    const contextMenu = useEngineStore((s) => s.contextMenu);
    const togglePanel = useEngineStore((s) => s.togglePanel);
    const { isMobile } = useMobileLayout();
    const hostRef = useDeepZoomHost(dismissSplash);            // the ONE renderer seam
    useHostSync(hostRef);
    const floatingPanels = (Object.values(panels) as PanelState[])
        .filter((p) => p.location === 'float' && p.isOpen);

    return (
      <StoreCallbacksProvider value={storeCallbacks}>
      <MobileViewportShell className="bg-black text-fg select-none overflow-hidden flex flex-col">
        <EngineBridge />
        <RenderLoopDriver />
        <DropZones />
        {floatingPanels.map((p) => (
          <DraggableWindow key={p.id} id={p.id} title={panelLabel(p.id)}>
            <PanelRouter activeTab={p.id as PanelId}
              state={useEngineStore.getState()} actions={useEngineStore.getState()}
              onSwitchTab={(t) => togglePanel(t, true)} />
          </DraggableWindow>
        ))}
        <TopBarHost />
        <div className="flex-1 flex overflow-hidden relative">
          {!isMobile && <Dock side="left" />}
          <ViewportFrame className="flex-1">
            {/* today: the iframe; later: <canvas id="dz-render-canvas"> — the host decides */}
            <DeepZoomSurface hostRef={hostRef} />
            <DeepZoomPointerLayer hostRef={hostRef} />
            <HudHost />
          </ViewportFrame>
          <Dock side="right" />
        </div>
        {!isMobile && <TimelineHost />}
        <HelpOverlay />
        <SettingsHost />
        <ToastHost />
        {contextMenu.visible && <GlobalContextMenu … />}
      </MobileViewportShell>
      </StoreCallbacksProvider>
    );
};
```

### 2.4 Rules the builder holds to

- Depth/telemetry readouts go in `hud.register({ id: 'deep-zoom.<x>', slot, order, component })`,
  not an absolutely-positioned div in the app (fluid-toy's inline `DeepZoomStatus` block with
  `zIndex: 5` is the thing not to copy).
- App buttons go in `topbar.register({ id, slot, order, component })`. No app-local top bar.
- Every panel is a manifest entry; every custom widget is `{ type: 'widget', id }` +
  `componentRegistry.register(id, C)`. Store-importing widgets register in `main.tsx` after the
  installs; store-free ones in `registerFeatures.ts`.
- Left dock = authoring/navigation (View, Formula, Colour, Modulation); right dock = look/quality
  (Lighting, Quality, Post). Developer-only CTLS rows go in a panel gated by `showIf`, not a
  separate dev UI.
- Give the picture a stable id and hand it to plugins by getter (`installSceneIO({ getCanvas })`).
- Ids are namespaced `deep-zoom.<thing>` (handles, HUD ids, storage keys), as `fluid-toy.engine`,
  `fluid-toy.quality`, `fluid-toy.favients.panel`.
- Splash in the HTML with an app prefix (`#dz-boot-splash`), removed on the host's first frame,
  with a timeout fallback.
- Labels: names and numbers only.

### 2.5 Conventions visible in both apps and not written in CLAUDE.md

1. `import './registerFeatures'` is the first line of `main.tsx`; nothing before it may touch the store.
2. `main.tsx` is one long commented script of `installX()` calls — each call carries a paragraph
   saying why and what it depends on. No wrapper "installEverything()".
3. `main.tsx`, `registerFeatures.ts` and the app component each open with a JSDoc header that
   states what is and is not installed, and why. GX's header lists its omissions by name.
4. The four-step add-on contract (`demo/README.md`, "The add-on contract"): register feature ->
   register components -> `applyPanelManifest` -> open the panel. The demo README calls the files
   `registerFeatures.ts` / `setup.ts` / the app component; fluid-toy and fractal-toy add `panels.ts`.
5. `setup.ts` holds exactly: `applyPanelManifest(...)` + per-app dock defaults.
6. Shared GMT-brand pieces are pulled in, never copied: `gmtSupportConfig()`, `feedbackMenuItem()`,
   `registerFeedbackUI()`, `feedbackPanelEntry()`, `GmtWordmark`, `SettingsButton`/`SettingsHost`.
7. Render tree is always `<AppErrorBoundary><React.StrictMode><App/></React.StrictMode></AppErrorBoundary>`.
8. Cross-tree imperative state uses `defineAppHandles<T>('<app>.<name>', initial)`
   (`engine/appHandles.ts`), not module globals or `window.__x`.
9. Slice types come from `SliceFromParams<typeof Feature['params']>` in `storeTypes.ts`,
   augmenting both `AppFeatureSlices` and `FeatureStateMap`.
10. Each feature file exports its definition and its `sync<Name>ToEngine`; the app has one sync hook.
11. Per-app storage keys are prefixed with the app; suite-wide ones are `gmt.*`
    (`gmt.themeVars`, `gmt.brightness`, `gmt.favients`). GX's are `gmt.ge.*`.
12. Smokes: `debug/smoke-<app>[-<topic>].mts`, npm script `smoke:<app>[-<topic>]`, default
    `ENGINE_URL=http://localhost:3400/<app>.html`, each with a header recording how it was
    falsified. A boot smoke is `cross-env ENGINE_URL=…/<app>.html tsx debug/smoke-boot.mts`
    (the `smoke:ge-next` line in `package.json`).
13. A new app gets: a row in `debug/smoke-chrome.mts` `APPS`, a path in
    `.claude/rules/sibling-apps.md` `paths:` + a row in both its tables, a `vite.config.ts` input,
    a `knip.json` entry, a `launcher.html` link, `docs/modules/<app>/index.md`.
14. `docs/modules/<app>/index.md` is "a map, not a description" with a "Where to start" table
    pointing at source JSDoc; front matter carries `source:` and `last_verified_sha:`.
15. Dev-only service-worker unregister block at the top of `main.tsx` (fluid-toy has it; GX v2 does not).

---

## 3. Gaps (generic statement, interim workaround)

1. **No shared app-shell component.** The ~40 lines of shell JSX (provider, bridge, drop zones,
   floating-panel map, top bar, dock/viewport/dock row, timeline, help, settings, context menu)
   are copied in fluid-toy, fractal-toy and app-gmt. Interim: copy fluid-toy's block as 2.3 does.
   Generic fix: an engine `<AppShell>` with a `children` slot for the viewport content and flags
   for left dock / timeline — worth an ADR, not part of this job.
2. **The full shell has no phone layout outside app-gmt.** Fluid-toy and fractal-toy use
   `fixed inset-0` and mount everything; only `AppGmt.tsx` applies `MobileViewportShell` and the
   `!isMobile` gates, by hand. Interim: apply the same three lines in `DeepZoomApp` (2.3).
3. **Left-dock panels vanish on a phone unless they carry `showIf` or are open**
   (`Dock.tsx`, `if (!mdef?.showIf && !p.isOpen) return false`). The rule was written for
   app-gmt's panel set. Interim: on a phone, put the panels a user must reach on the right dock,
   or give left panels a `showIf: () => true`. Generic fix: a manifest field for the phone dock.
4. **The phone breakpoint is not single-sourced** — 8 inline copies, `Dock.tsx` included
   (`.claude/rules/mobile-layout.md`). Interim: use `useMobileLayout()` only; never add a ninth.
5. **`ViewportFrame` assumes its child is a canvas the app sizes.** Fluid-toy drives
   `engine.setRenderSize` from `canvasPixelSize x renderScale x quality`. With the renderer in an
   iframe the shell cannot size the drawing buffer directly, and `installSceneIO({ getCanvas })`
   / RenderDialog need a canvas element in the parent document. Interim: the host interface
   exposes `setRenderSize(w, h)` and `getCanvas()` (same-origin iframe: `iframe.contentDocument`
   canvas) so the plugins see one seam; unverified whether SceneIO's PNG path works on a canvas
   from another document.
6. **Floating panels are mapped by each app.** There is no `<FloatingPanelsHost/>`; the
   `floatingPanels.map(...)` block is repeated per app. Interim: copy it.
7. **No rule, no chrome-smoke row and no docs page cover `deep-zoom/`.** `smoke:deep-zoom`
   exists (`debug/smoke-deep-zoom.mts`, contents unverified) but is cited by no rule, and
   `smoke:chrome` — "the only smoke that opens panels" per CLAUDE.md — does not boot the page.
   Interim: add the `APPS` row and the `sibling-apps.md` row with the shell.
8. **`check:rule-guards` cannot tell which app a guard covers** inside `sibling-apps.md`
   (the rule says so itself: five apps share one `paths:` set). Interim: falsify each deep-zoom
   guard by hand and record it in the smoke's header.
9. **No engine-level real-GPU smoke convention for a sibling app's own canvas** was found in the
   files read; fluid-toy's pixel smokes are headless. Interim: the owner's standing rule (headed
   Chrome, ANGLE d3d11) applied per smoke. Unverified beyond the rule text.

---

## 4. Unverified

- ADR-0114, ADR-0115, ADR-0080, ADR-0038/0039 — cited from rules and JSDoc, not opened.
- Bodies of `engine/plugins/TopBar.tsx`, `Hud.tsx`, `viewport/ViewportFrame.tsx`,
  `components/PanelRouter.tsx`, `components/layout/DropZones.tsx`, `components/TimelineHost.tsx`,
  `components/ui/FloatingPanel` — only their import paths and call sites were read. Whether
  `TopBarHost` has its own phone layout is unverified (a grep showed only `isMobileSnapshot`
  re-evaluation of `when:` predicates).
- `gradient-explorer/v2/help/installGxHelp.ts`, `v2/session.ts`, `v2/ShellMenu.tsx`, `v2/Tray.tsx`,
  `BrowseStage.tsx`, `WorkingHero.tsx` — not opened; statements about them come from
  `main.tsx` / the app header comments.
- `fluid-toy/README.md` lines 1-156 and `CODE_MAP.md` body — only headings and the two sections
  quoted were read.
- `fractal-toy` beyond its app component's imports/JSX; `mesh-export` not opened.
- `debug/smoke-deep-zoom.mts`, existing `deep-zoom/DeepZoomApp.tsx`, `bridge.ts`, `store.ts`,
  `ui/*` — not opened (another reader's area).
- Fluid-toy's actual behaviour on a phone — inferred from source, not run.
- Whether `check:zindex` scans root `.html` files (the splash uses `z-index: 99999` in
  `fluid-toy.html`).
