# Boot, viewport frame, top bar — research for the deep-zoom gmt-shell

Reader: boot-viewport-topbar. Read-only pass, 2026-10-07. Every claim names the file and symbol
read. Anything not opened is listed under "Unverified" at the end. Paths are relative to the
worktree root (`H:/GMT/workspace-gmt/stable/.claude/worktrees/deep-zoom`).

---

## 1. Verified facts

### 1.1 A gmt-shell is three things, in this order

Read in `fractal-toy/main.tsx` (177 lines, the minimal shell) and `fluid-toy/main.tsx` (394 lines,
the full one). Both follow the same shape:

1. **Side-effect imports that register DDFS features** — `import './registerFeatures'` is the
   FIRST import in both files. `fractal-toy/main.tsx` header: "Imported FIRST so registrations land
   before createEngineStore". The feature registry freezes when the store is first constructed
   (CLAUDE.md "Feature registry is frozen at store construction").
2. **Module-level `install*()` calls** — plain function calls at module scope, before React exists.
3. **`setupX()`** (applies the panel manifest), then `ReactDOM.createRoot(...).render(...)` with
   `<AppErrorBoundary>` outermost.

There is no "engine boot" function. The store is created by the first module that imports
`store/engineStore.ts`. That is why `fluid-toy/main.tsx` registers `panel-views` in `main.tsx` and
not in `registerFeatures.ts`:

```ts
// fluid-toy/main.tsx
// ... registered here (after the store + slice install) rather than in
// registerFeatures.ts because importing the panel pulls useEngineStore
// into the module graph, which would freeze the registry before
// feature registrations complete.
componentRegistry.register('panel-views', ViewLibraryPanel);
```

**Rule for the builder:** `deep-zoom/registerFeatures.ts` must import nothing that imports
`store/engineStore`. Custom widgets that read the store register in `main.tsx`, after the installs.

### 1.2 The install order, and why each position matters

Order as written in `fluid-toy/main.tsx` (fractal-toy is the same minus the starred lines):

| # | Call | Takes | Gives | Why here |
|---|---|---|---|---|
| 0 | `import './registerFeatures'`, `import './migrations'`*, `import '../engine/plugins/camera/presetField'`, `import '../index.css'` | — | DDFS features in the registry; Tailwind + component CSS | Must precede anything that touches the store (registry freeze). |
| 1 | dev-only stale service-worker cleanup block (`if (import.meta.env.DEV && 'serviceWorker' in navigator)`) | — | unregisters SWs left by `npm run preview` | Copy verbatim; both shells carry it. |
| 2 | `registerUI()` — `engine/features/ui.tsx` | nothing | registers `auto-feature-panel`, `panel-audio`, `overlay-webcam`, `overlay-debug-tools`, `audio-spectrum`, `audio-link-controls` in `componentRegistry` | Before any panel renders. Injects no CSS (the comment says CSS lives in `index.css`). |
| 3 | `installViewport(cfg)` — `engine/plugins/Viewport.tsx` | `Partial<ViewportAdaptiveConfig>` | writes `adaptiveConfig` to the store; one subscription on `isUserInteracting` | First store touch among the installs. Idempotent on the subscription; the config is re-applied on every call. |
| 4 | `installTopBar(opts)` — `engine/plugins/TopBar.tsx` | `{ hideDefaults?: boolean }` | registers `project-name` (left, 0), `fps` (right, -10), `adaptive` (right, 0) | Must run before plugins that `topbar.register` only if you care about `hideDefaults`; the registry itself is module-level and accepts registrations at any time. |
| 5 | app `topbar.register(...)` calls, `registerCoreSettings({ autosave: null })`*, settings gear* | see 1.6 | app buttons | Any time after the import. |
| 6 | `installPwaUpdate()` — `engine/plugins/PwaUpdate.tsx` | `{ slot?, order? }` (default right, -100) | the amber Update pill; starts the `controllerchange` watch | "The watch starts at INSTALL time, not at mount: a takeover that lands before React has rendered must still count." So: early. |
| 7 | `installPauseControls()`*, `installBucketRender({...})`* | — | pause button + sample-cap popover; tiled export | Read `renderControlSlice` (`isPaused`, `sampleCap`). Only for a renderer that obeys those. |
| 8 | `installSceneIO({ getCanvas })` | a canvas getter | Save/Load buttons, Alt+S screenshot | — |
| 9 | `registerCameraKeyTracks`, `registerLogTrack`*, `registerCameraPair`* | track ids | Key Cam button, log-space zoom tween, pan paired to zoom | Animation registries; order-free. |
| 10 | `installModulation()`*, `installModulationUI()`* | — | LFO tick + `lfo-list` widget | — |
| 11 | `installShortcuts()` | — | window-level keyboard dispatcher | Before anything that registers a shortcut at install (Undo, Camera, Help, the view library). |
| 12 | `installUndo()` | — | unified transaction stack, Ctrl+Z/Y, Undo/Redo buttons | After Shortcuts. It claims `Ctrl+Shift+Z` first; first-registered wins (`.claude/rules/engine-plugins.md`). |
| 13 | `installCamera({ hideShortcuts })` + `camera.register({ featureId, captureState, applyState })` | adapter | camera slots, preset round-trip | `hideShortcuts: true` when the state library owns 1..9. |
| 14 | `installMenu()` — `engine/plugins/Menu.tsx` | nothing | subscribes the menu registry to the store so toggle rows re-render | Before `installHelp` and before any `menu.register`. fractal-toy puts it right after SceneIO; position among the plain installs is free. |
| 15 | `installHelp({ support, extraItems })`* | — | the `?` menu, H shortcut, `<HelpOverlay/>` | After Menu + Shortcuts. |
| 16 | `installHud()`* + `hud.register` / `help.registerHudHint` | — | slot overlay inside the viewport | — |
| 17 | `installFluidToyViewLibrary(...)`* | — | saved views, slot shortcuts, Camera menu | "Must run AFTER installMenu / installShortcuts so their registries exist, and BEFORE setupFluidToy so the Views panel finds the slice." |
| 18 | `componentRegistry.register('...', Widget)` | — | custom widgets the manifest names | After the store exists (see 1.1). |
| 19 | `installRenderDialog({ runner, defaults })`* | — | timeline Render button | — |
| 20 | `setupX()` → `applyPanelManifest(Panels)` (`fractal-toy/setup.ts`) | manifest | panels seeded into the dock | After every registration the manifest refers to. |
| 21 | post-setup store writes (`useEngineStore.setState({ formula })`, `mountFavientsPanel`, incoming-scene `loadPreset`) | — | — | After the panels exist. |
| 22 | `root.render(<AppErrorBoundary><React.StrictMode><App/></React.StrictMode></AppErrorBoundary>)` | — | — | Boundary outermost, per `engine/components/AppErrorBoundary.tsx` header. |

`AppErrorBoundary` does **not** cover steps 0–21: "Pre-mount throws are NOT covered by React …
the module-level `install*()` chain … is still a blank page if it throws." It accepts an
`initialError` prop for a caller that catches a pre-mount throw itself.

### 1.3 What provides the page layout

There is no layout component. Each app's root component composes the same pieces by hand.
`fluid-toy/FluidToyApp.tsx` (the JSX at the bottom) is the reference:

```tsx
<StoreCallbacksProvider value={storeCallbacks}>
<div className="fixed inset-0 w-full h-full bg-black text-fg select-none overflow-hidden flex flex-col">
    <EngineBridge />          {/* components/EngineBridge.tsx — animationEngine.connect(stores) */}
    <RenderLoopDriver />      {/* engine/plugins/RenderLoop.tsx — RAF → runTicks(dtSec) */}
    <DropZones />             {/* components/layout/DropZones.tsx — drag-out / drag-back targets */}
    {floatingPanels.map(p => <DraggableWindow ...><PanelRouter .../></DraggableWindow>)}
    <TopBarHost />            {/* engine/plugins/TopBar.tsx — h-14 header */}
    <div className="flex-1 flex overflow-hidden relative">
        <Dock side="left" />
        <ViewportFrame className="flex-1"> ...surface + overlays... </ViewportFrame>
        <Dock side="right" />
    </div>
    <TimelineHost />          {/* components/TimelineHost.tsx — lazy timeline + toggle */}
    <HelpOverlay />           {/* engine/plugins/Help.tsx */}
    <SettingsHost />          {/* components/SettingsAccess.tsx */}
    {contextMenu.visible && <GlobalContextMenu .../>}
</div>
</StoreCallbacksProvider>
```

Two things in that file are load-bearing:

- **Use granular selectors.** `FluidToyApp.tsx`: "DO NOT use `useEngineStore()` with no selector
  here … the cascade of subscriber re-renders during a drag trips React's max-depth guard."
  `FractalToyApp.tsx` still uses the bare `useEngineStore()`; copy fluid-toy, not fractal-toy.
- **`PanelRouter` gets a snapshot**, `state={useEngineStore.getState()}`, not a subscription.

`fractal-toy/FractalToyApp.tsx` mounts no `RenderLoopDriver` and no `HudHost` / `HelpOverlay` /
`SettingsHost`; its renderer plugin calls `viewport.frameTick()` from `onFrameEnd` instead.

### 1.4 `ViewportFrame` — how an app puts its own surface inside

`engine/plugins/viewport/ViewportFrame.tsx`. The frame "doesn't know what it's wrapping — apps
compose". Children go inside a `position: relative` inner box; the documented pattern is:

```tsx
<ViewportFrame>
  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
</ViewportFrame>
```

Nothing in the component is canvas-specific, so an `<iframe className="absolute inset-0 w-full h-full">`
is an equally valid child. What the frame does:

1. **One ResizeObserver on the outer box**, writing `canvasPixelSize` = CSS size × `devicePixelRatio`
   (floored, min 1) through `setCanvasPixelSize`. "This is the ONE authoritative writer — apps
   should not observe their canvas separately."
2. **Full vs Fixed.** Full: inner box is `100% × 100%`. Fixed: inner box is exactly
   `fixedResolution` CSS pixels with `transform: scale(fitScale)`, `boxSizing: 'content-box'`, a
   1px border, letterboxed on a grid background.
3. **`<ViewportModeControls>`** overlay (the Fixed button; in Fixed mode the resolution controls
   and a render-scale pill). Off with `showModeControls={false}`.
4. **`<CompositionOverlay>`** rendered after the children inside the inner box.
5. `onMouseEnter/Leave` → `setMouseOverCanvas` (only feeds a GMT badge label today).

Props: `children`, `showModeControls` (default true), `shouldResize?: () => boolean` (gate on the
`canvasPixelSize` write), `className`, `innerClassName`, `fixedPadding` (40), `outerOverlay`
(a sibling of the inner box that stays viewport-sized in Fixed mode — for HUD anchored to the
viewport edge rather than the picture).

The outer box carries `touch-none` and `bg-surface-viewport`.

### 1.5 Sizing, device pixel ratio, adaptive resolution — and how to opt out

**The engine never resizes an app's surface.** It publishes four numbers to the store and the app
decides what to do. `fluid-toy/FluidToyApp.tsx` is the whole consumer:

```ts
const dpr = window.devicePixelRatio || 1;
const [baseW, baseH] = resolutionMode === 'Fixed'
    ? fixedResolution
    : [canvasPixelSize[0] / dpr, canvasPixelSize[1] / dpr];
const finalW = Math.max(1, Math.round(baseW * renderScale * quality));
engine.setRenderSize(finalW, finalH);
```

So: `canvasPixelSize` (physical px), `resolutionMode` + `fixedResolution`, `renderScale` (the
user multiplier), and `qualityFraction` (adaptive, via `useQualityFraction()`).

**Adaptive is a feedback loop the app must feed.** `engine/plugins/Viewport.tsx`: "An app's render
engine calls `viewport.frameTick()` … each frame; the plugin tracks fps/fpsSmoothed, ramps
qualityFraction". `store/slices/viewportSlice.ts` `reportFps`:

```ts
const suppressed = state.adaptiveSuppressed || !cfg.enabled;
```

and `types/viewport.ts`: "`enabled` — Master adaptive toggle. When false, qualityFraction stays at 1."

**Opting out is therefore three independent switches, and the deep renderer wants all three:**

1. **Do not read** `qualityFraction`, `renderScale` or `canvasPixelSize` in the app. Nothing else
   applies them. This alone keeps the renderer's own frame-size policy intact.
2. `installViewport({ enabled: false })` so `qualityFraction` is pinned at 1 and no HUD reads a
   scale the renderer is not using.
3. **Remove the default `adaptive` top-bar badge.** `engine/plugins/viewport/AdaptiveResolutionBadge.tsx`
   `handleToggle` does `setAdaptiveConfig({ enabled: true, targetFps: 30 })` when clicked while
   off — a button that would claim to turn on something the deep renderer ignores. Either
   `topbar.unregister('adaptive')` after `installTopBar()`, or `installTopBar({ hideDefaults: true })`
   and register `ProjectName` + `FpsCounter` yourself (both are re-exported from `TopBar.tsx`).

**Accumulation is the same story.** `accumulation`, `isPaused`, `sampleCap` live in the generic
render-control slice and reach the renderer only through an app effect
(`FluidToyApp.tsx`: `engine.setParams({ tsaaSampleCap: cap, paused: isPaused || fluidPaused })`).
An app that does not install `installPauseControls()` and does not write that effect keeps its
own accumulation untouched.

**The FPS readout.** `engine/plugins/topbar/FpsCounter.tsx`:

```ts
// renderFps < 0 ⇒ this app doesn't report a worker render-rate ... fall back to UI fps
const primaryFps = renderFps >= 0 ? renderFps : fpsSmoothed;
```

`renderFps` starts at `-1` (`viewportSlice.ts`). `viewport.reportRenderFps(fps)` is "Display-only —
does not drive adaptive resolution". `fpsSmoothed` only moves if something calls
`viewport.frameTick()` / `reportFps`. So a renderer with its own clock reports its real frame rate
through `reportRenderFps` and the default counter shows it.

**The render-scale pill.** `ViewportModeControls` reads `getRenderScaleSource()`; without one it
binds `viewportSlice.renderScale`, and "the pill is a no-op for apps that don't read renderScale".
`setRenderScaleSource({ use, steps, formatLabel })` points it at the app's own knob (GMT points it
at `quality.aaLevel`).

### 1.6 Adding top-bar items and menu entries

`engine/plugins/TopBar.tsx`:

```ts
topbar.register({ id, slot: 'left' | 'center' | 'right', order, component: React.FC, when?: () => boolean });
topbar.unregister(id);
```

- The registry is ONE `Map<id, item>` across all slots (`createListRegistry`): re-using an id
  against another slot replaces the first entry. To move a default, `unregister` first.
- `TopBarHost` re-renders on registry change and on `uiModePreference` / `isDeviceMobile`, so
  `when:` predicates that read mobile state stay live. It takes `hidden` and `className`.
- The header is `h-14` with `z-[500]` written raw in the class string (an existing literal in the
  engine; a new shell must not add another).

`engine/plugins/Menu.tsx`:

```ts
menu.register({ id, slot, order, icon?, label?, title?, align?, width?, when?, badge? });
menu.registerItem(menuId, { id, order?, type: 'button' | 'toggle' | 'separator' | 'section' | 'custom', ... });
menu.setBadge(menuId, getter | null);   menu.refresh();
```

- `menu.register` slots its anchor into the top bar as `` `menu:${def.id}` `` — a menu IS a top-bar item.
- Button rows run `onSelect` (usage read at `engine-gmt/topbar.tsx`, the `fluid-toy` row:
  `onSelect: () => window.open('fluid-toy.html', '_blank', 'noopener')`). Toggle rows take
  `isActive` + `onToggle` and keep the menu open. `custom` renders an FC given `{ close }`.
- `installMenu()` "has no side effects beyond subscribing"; toggle rows only refresh on store
  changes once it has run.
- A plugin's menu is extended by registering items into its id — `installHelp({ extraItems })`,
  or `menu.registerItem('help', ...)`. Do not copy another plugin's items into a local list.

`engine/plugins/WhatsNew.tsx`: `createWhatsNew({ topicId, version, seenKey, title? })` returns
`{ isUnseen, markSeen, open, menuItem }`. "THE KEY IS PER APP" — a shared `seenKey` makes two apps
relight each other's dot forever.

`engine/plugins/Session.ts`: three loops over one app-supplied `SessionAdapter` (capture / validate /
apply): `restoreSessionOnBoot` (before first render, no undo entry), `installSessionAutosave`
(interval + `pagehide`), `registerSessionFileSettings` (Save/Load rows in Settings). The `settings`
option is REQUIRED and must be the app's own `createAutosaveSettingsStore(keys)` — the same store
handed to `registerCoreSettings({ autosave })`. An app with no autosave passes
`registerCoreSettings({ autosave: null })` (fluid-toy does), otherwise it gets app-gmt's rows.

### 1.7 Registering a per-frame tick

`engine/TickRegistry.ts`:

```ts
export const TICK_PHASE = { SNAPSHOT: 0, ANIMATE: 1, OVERLAY: 2, UI: 3 } as const;
export function registerTick(name: string, phase: TickPhase, fn: (delta: number) => void): () => void;
export function runTicks(delta: number): void;   // SECONDS (ADR-0002)
```

- Duplicate names are silently ignored and return a no-op disposer ("safe for HMR re-execution").
  Register at module scope with a unique name; do not rely on the disposer of a duplicate.
- Phases run in numeric order; registration order is kept within a phase.
- Nothing calls `runTicks` unless the app mounts `<RenderLoopDriver paused? />`
  (`engine/plugins/RenderLoop.tsx`) or calls it itself. In dev, 3 s after the first `registerTick`
  with no `runTicks`, the registry warns.
- Two drivers in one app = the double-run bug; `DOUBLE_RUN_WINDOW_MS = 1` suppresses the second
  call. Mount exactly one. fluid-toy mounts `RenderLoopDriver`; fractal-toy mounts none.

### 1.8 PWA, launcher, vite inputs — what already exists for deep-zoom

All four are already in place in this worktree:

- `vite.config.ts` `rollupOptions.input`: `'deep-zoom': path.resolve(__dirname, 'deep-zoom.html')`.
- `launcher.html` line 184: `<a class="app" href="deep-zoom.html">`.
- `knip.json` line 10: `"deep-zoom/main.tsx"` is an entry.
- `deep-zoom.html` already loads `/deep-zoom/main.tsx`, has the theme pre-paint script
  (`gmt.themeVars`) and the same base CSS as `fractal-toy.html`.

PWA facts (`vite.config.ts`, the `VitePWA` block): ONE service worker and ONE manifest serve the
whole suite (`name: 'GMT — Fractal Explorer'`, `start_url: './'`). `workbox.globPatterns` includes
`'**/*.{js,css,html}'`, and `navigateFallbackDenylist: [/\.html(\?|$)/]` keeps real `.html` entries
out of the launcher fallback. `devOptions: { enabled: false }` — the SW never runs under `npm run dev`.
`installPwaUpdate()` imports `virtual:pwa-register/react`, which only resolves because that plugin
is configured.

`public/deep-zoom-core/` holds one file, `index.html`. It is copied to `dist/deep-zoom-core/index.html`
and matches the `**/*.html` precache glob.

**What must change in `deep-zoom.html`:** nothing is required to boot the new shell — the script
tag keeps pointing at `/deep-zoom/main.tsx`. Two optional additions, both copied from siblings:

1. The two `.mobile-scroll` scrollbar rules that `fractal-toy.html` has and `deep-zoom.html` lacks
   (needed once engine dock panels render on a phone).
2. A pre-React boot splash in the fluid-toy style (`#ft-boot-splash` in `fluid-toy.html`, removed
   by `FluidToyApp.tsx` `dismissSplash` on the renderer's ready signal, with a 12 s safety timer).
   The deep renderer has a real warm-up, so this is worth having; use a `dz-` id.

`deep-zoom/main.tsx` today is the lean boot — its own header says "no engine store, no plugins" and
it exposes `window.__dzStore`. All of that file is replaced; `store/engineStore.ts` already sets
`window.__store` for smokes.

---

## 2. Blueprint for the deep-zoom shell (this area only)

1. **Shape.** Three-file contract: `deep-zoom/registerFeatures.ts` (DDFS features, no store
   imports), `deep-zoom/main.tsx` (installs), `deep-zoom/setup.ts` (`applyPanelManifest`). Plus
   `deep-zoom/host.ts` — the single renderer-facing interface the brief demands (iframe handles
   today, `createDeepZoom(canvas, options)` later). The shell's React tree only ever sees the host.
2. **Viewport.** `<ViewportFrame className="flex-1">` with one child component,
   `<DeepZoomSurface />`, that renders whatever element the host needs (today an
   `<iframe className="absolute inset-0 w-full h-full border-0 block">`, later a `<canvas>` with
   the same classes) and hands the element to the host. HUD goes in `<HudHost />` as a sibling
   inside the frame, exactly as fluid-toy does.
3. **Sizing opt-out.** `installViewport({ enabled: false })`; never subscribe to
   `qualityFraction` / `renderScale` / `canvasPixelSize` for sizing; `topbar.unregister('adaptive')`.
   Fixed mode still works without any code: the frame gives the surface a `fixedResolution`-sized
   CSS box, and the renderer sizes itself from its own element (expected from reading
   `ViewportFrame`; not run).
4. **Render-scale pill.** If the renderer has its own resolution multiplier, register it with
   `setRenderScaleSource(...)` so the Fixed-mode pill drives the real knob. Otherwise the pill
   writes a field nothing reads — in that case pass `showModeControls={false}` rather than ship a
   dead control.
5. **Frame rate.** One tick, registered once at module scope, polls host telemetry and calls
   `viewport.reportRenderFps(t.fps)`. Mount one `<RenderLoopDriver />`. The default `FpsCounter`
   then shows the renderer's real rate with no custom widget.
6. **No `installPauseControls`** until the host maps `isPaused` / `sampleCap` onto the renderer's
   own accumulation; the deep renderer keeps its own.
7. **Top bar.** `installTopBar()` defaults, minus `adaptive`. App buttons via `topbar.register`
   (depth gauge = a `center` item; settings gear = `SettingsButton`, right, 100). Dive / view
   commands go in a `menu.register({ id: 'view', ... })` menu, not a hand-built dropdown.
8. **Help / What's New.** `installHelp(...)` with `createWhatsNew({ seenKey: 'gmt.deepZoom.whatsNew.seenVersion', ... })`.
9. **Settings.** `registerCoreSettings({ autosave: null })` until a Session adapter exists; when
   bookmarks/session move off raw localStorage, give the app its own `createAutosaveSettingsStore`.
10. **Delete with the rebuild:** `deep-zoom/store.ts`, `deep-zoom/ui/TopBar.tsx`, `deep-zoom/ui/kit.tsx`
    and `window.__dzStore` — each has an engine equivalent listed above.

### 2.1 `deep-zoom/main.tsx` skeleton

Every engine import path below was checked against the tree. Files marked NEW do not exist yet.

```tsx
/**
 * Deep Zoom — entry point (Vite entry: deep-zoom.html).
 * Three-file add-on contract: registerFeatures → installs → setup.
 */

// 1. Side-effect registrations. MUST precede anything that touches the store.
import './registerFeatures';                              // NEW — DDFS features only, no store imports
import '../engine/plugins/camera/presetField';

import '../index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppErrorBoundary } from '../engine/components/AppErrorBoundary';
import { registerUI } from '../engine/features/ui';
import { installViewport, viewport } from '../engine/plugins/Viewport';
import { installTopBar, topbar } from '../engine/plugins/TopBar';
import { installPwaUpdate } from '../engine/plugins/PwaUpdate';
import { installSceneIO } from '../engine/plugins/SceneIO';
import { installShortcuts } from '../engine/plugins/Shortcuts';
import { installUndo } from '../engine/plugins/Undo';
import { installCamera, camera } from '../engine/plugins/Camera';
import { installMenu, menu } from '../engine/plugins/Menu';
import { installHelp } from '../engine/plugins/Help';
import { installHud, hud } from '../engine/plugins/Hud';
import { createWhatsNew } from '../engine/plugins/WhatsNew';
import { registerTick, TICK_PHASE } from '../engine/TickRegistry';
import { registerCoreSettings } from '../store/coreSettings';
import { SettingsButton } from '../components/SettingsAccess';
import { componentRegistry } from '../components/registry/ComponentRegistry';
import { useEngineStore } from '../store/engineStore';

import { DeepZoomApp } from './DeepZoomApp';
import { setupDeepZoom } from './setup';                  // NEW — applyPanelManifest(DeepZoomPanels)
import { deepZoomHost } from './host';                    // NEW — the ONE renderer-facing interface
import { DepthGauge } from './components/DepthGauge';     // NEW location (today deep-zoom/ui/DepthGauge.tsx)

// 2. Dev: clear service workers left behind by `npm run preview` (verbatim from fluid-toy/main.tsx).
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length === 0) return;
    regs.forEach((r) => r.unregister());
    if ('caches' in window) caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    console.info('[dev] Cleared stale service worker + caches. Reload to see fresh code.');
  });
}

// 3. Engine UI registry (AutoFeaturePanel etc.).
registerUI();

// 4. Viewport. The deep renderer owns its frame size and its accumulation:
//    adaptive is OFF and the shell never reads qualityFraction / renderScale.
installViewport({ enabled: false });

// 5. Top bar defaults, minus the adaptive badge (its click would switch on a loop
//    this renderer does not obey).
installTopBar();
topbar.unregister('adaptive');

registerCoreSettings({ autosave: null });                 // no autosave rows until a Session adapter exists
topbar.register({ id: 'settings', slot: 'right', order: 100, component: SettingsButton });
topbar.register({ id: 'dz-depth', slot: 'center', order: 0, component: DepthGauge });

// 6. PWA update pill — early, so a takeover before first render still counts.
installPwaUpdate();

// 7. Scene save/load + screenshot. The canvas comes from the host, whichever
//    document it lives in.
installSceneIO({ getCanvas: () => deepZoomHost.getCanvas() });

// 8. Keyboard, undo, camera slots.
installShortcuts();
installUndo();
installCamera();
camera.register({
    featureId: 'view',                                     // the DDFS feature that holds the view
    captureState: () => deepZoomHost.getView(),
    applyState: (state) => deepZoomHost.setView(state),
});

// 9. Menus + help.
installMenu();
const whatsNew = createWhatsNew({
    topicId: 'deepzoom.changelog',                         // NEW help topic id
    version: __APP_VERSION__,
    seenKey: 'gmt.deepZoom.whatsNew.seenVersion',          // per app — never share
});
installHelp({ extraItems: [whatsNew.menuItem()] });
menu.setBadge('help', whatsNew.isUnseen);

// 10. HUD host (mounted inside ViewportFrame by DeepZoomApp).
installHud();
// hud.register({ id: 'deep-zoom.status', slot: 'bottom-left', order: 0, component: ... });

// 11. Custom widgets the manifest names. Here, not in registerFeatures: they read the store.
// componentRegistry.register('dz-locations', LocationsWidget);

// 12. Per-frame tick: pull telemetry from the host, publish the renderer's real frame rate.
//     One registration, module scope, unique name (duplicates are silently ignored).
registerTick('deepZoom.telemetry', TICK_PHASE.SNAPSHOT, () => {
    const t = deepZoomHost.telemetry();
    if (t) viewport.reportRenderFps(t.fps);
});

// 13. Panels.
setupDeepZoom();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

ReactDOM.createRoot(rootElement).render(
  <AppErrorBoundary>
    <React.StrictMode>
      <DeepZoomApp />
    </React.StrictMode>
  </AppErrorBoundary>,
);
```

Notes on the skeleton: `__APP_VERSION__` is the `define` in `vite.config.ts`. `hud`,
`componentRegistry` and `useEngineStore` are imported for the commented lines a builder will fill;
drop the ones that stay unused. The `installHelp` option names beyond `extraItems` / `support` were
not read.

### 2.2 `deep-zoom/DeepZoomApp.tsx` skeleton

```tsx
/**
 * DeepZoomApp — root component. Layout only: the engine's standard
 * TopBarHost + Dock + ViewportFrame + floating windows. The renderer is
 * reached through ./host and nothing else.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useEngineStore } from '../store/engineStore';
import { ViewportFrame } from '../engine/plugins/viewport/ViewportFrame';
import { TopBarHost } from '../engine/plugins/TopBar';
import { HudHost } from '../engine/plugins/Hud';
import { HelpOverlay } from '../engine/plugins/Help';
import { RenderLoopDriver } from '../engine/plugins/RenderLoop';
import { Dock } from '../components/layout/Dock';
import { DropZones } from '../components/layout/DropZones';
import DraggableWindow from '../components/DraggableWindow';
import { PanelRouter } from '../components/PanelRouter';
import { panelLabel } from '../engine/PanelManifest';
import { PanelId, PanelState } from '../types';
import { StoreCallbacksProvider } from '../components/contexts/StoreCallbacksContext';
import type { StoreCallbacks } from '../components/contexts/StoreCallbacksContext';
import { TimelineHost } from '../components/TimelineHost';
import { EngineBridge } from '../components/EngineBridge';
import GlobalContextMenu from '../components/GlobalContextMenu';
import { SettingsHost } from '../components/SettingsAccess';
import { deepZoomHost } from './host';                    // NEW

/** The one place that knows what element the renderer lives in.
 *  Today: a same-origin iframe. Later: a <canvas> handed to createDeepZoom(). */
const DeepZoomSurface: React.FC = () => {
    const ref = useRef<HTMLIFrameElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        return deepZoomHost.attach(el);                   // returns a detach function
    }, []);
    return (
        <iframe
            ref={ref}
            id="dz-render-surface"
            title="Deep Zoom renderer"
            src="deep-zoom-core/index.html?embed=1"
            className="absolute inset-0 w-full h-full block border-0"
        />
    );
};

export const DeepZoomApp: React.FC = () => {
    // Granular selectors only — a bare useEngineStore() here re-renders the
    // whole tree on every setter (see the note in fluid-toy/FluidToyApp.tsx).
    const panels = useEngineStore((s) => s.panels);
    const contextMenu = useEngineStore((s) => s.contextMenu);
    const handleInteractionStart = useEngineStore((s) => s.handleInteractionStart);
    const handleInteractionEnd = useEngineStore((s) => s.handleInteractionEnd);
    const openContextMenu = useEngineStore((s) => s.openContextMenu);
    const closeContextMenu = useEngineStore((s) => s.closeContextMenu);
    const togglePanel = useEngineStore((s) => s.togglePanel);
    const openHelp = useEngineStore((s) => s.openHelp);

    const storeCallbacks = useMemo<StoreCallbacks>(() => ({
        handleInteractionStart,
        handleInteractionEnd,
        openContextMenu,
    }), [handleInteractionStart, handleInteractionEnd, openContextMenu]);

    const floatingPanels = (Object.values(panels) as PanelState[])
        .filter((p) => p.location === 'float' && p.isOpen);

    return (
        <StoreCallbacksProvider value={storeCallbacks}>
        <div className="fixed inset-0 w-full h-full bg-black text-fg select-none overflow-hidden flex flex-col">
            <EngineBridge />
            <RenderLoopDriver />
            <DropZones />

            {floatingPanels.map((p) => (
                <DraggableWindow key={p.id} id={p.id} title={panelLabel(p.id)}>
                    <PanelRouter
                        activeTab={p.id as PanelId}
                        state={useEngineStore.getState()}
                        actions={useEngineStore.getState()}
                        onSwitchTab={(t) => togglePanel(t, true)}
                    />
                </DraggableWindow>
            ))}

            <TopBarHost />

            <div className="flex-1 flex overflow-hidden relative">
                <Dock side="left" />

                <ViewportFrame className="flex-1">
                    <DeepZoomSurface />
                    <HudHost />
                </ViewportFrame>

                <Dock side="right" />
            </div>

            <TimelineHost />
            <HelpOverlay />
            <SettingsHost />

            {contextMenu.visible && (
                <GlobalContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenu.items}
                    targetHelpIds={contextMenu.targetHelpIds}
                    onClose={closeContextMenu}
                    onOpenHelp={openHelp}
                />
            )}
        </div>
        </StoreCallbacksProvider>
    );
};
```

The iframe `src` is relative (`deep-zoom-core/index.html`), matching `base: './'` in
`vite.config.ts` and the existing `public/deep-zoom-core/index.html`.

### 2.3 The minimum the host interface must offer for this area

Derived from what the plugins above call. The full interface is another reader's file.

```ts
export interface DeepZoomHost {
    attach(el: HTMLIFrameElement | HTMLCanvasElement): () => void;   // DeepZoomSurface
    getCanvas(): HTMLCanvasElement | null;                           // installSceneIO({ getCanvas })
    telemetry(): { fps: number } | null;                             // the telemetry tick
    getView(): unknown;  setView(v: unknown): void;                  // camera.register adapter
    onReady(cb: () => void): () => void;                             // boot splash dismissal
}
```

---

## 3. Gaps — what the engine cannot do yet (stated generically), with the interim workaround

1. **No shared shell-layout component.** Every app hand-copies ~40 lines of the same JSX
   (provider, `EngineBridge`, `DropZones`, floating-window map, `TopBarHost`, docks,
   `TimelineHost`, context menu). fractal-toy and fluid-toy have already drifted (bare store
   subscription vs granular selectors; one mounts `RenderLoopDriver`, one does not).
   *Interim:* copy fluid-toy's tree as in 2.2. *Generic fix:* an `<EngineShell viewport={...}>`
   in `components/layout/`, adopted by all three shells.
2. **The default top bar hard-wires the adaptive badge.** `installTopBar()` registers `adaptive`
   whether or not the app runs the adaptive loop, and the badge can switch `adaptiveConfig.enabled`
   back on. *Interim:* `topbar.unregister('adaptive')`. *Generic fix:* have the default item carry
   `when: () => <the app opted in>` or let `installTopBar` take a per-default opt-out.
3. **A renderer that lives in another document is outside the keyboard and pointer plumbing.**
   The Shortcuts dispatcher is described as a "window-level keyboard listener" (comment in
   `fluid-toy/main.tsx`); key events fired while an iframe has focus go to the iframe's window.
   Likewise a drag that crosses an iframe stops delivering pointer moves to the parent, which
   matters for `DraggableWindow` and dock resizing. *Interim (iframe era only):* the host forwards
   `keydown`/`keyup` from the same-origin `contentWindow` to the parent window, and the surface
   gets `pointer-events: none` while the store's interaction flag is up. Both vanish when the
   renderer becomes a module drawing into a canvas in this document — which is the real fix.
4. **Viewport sizing is opt-in by convention, with no declared "renderer owns its size" mode.**
   The frame always writes `canvasPixelSize`, always offers Fixed mode and a render-scale pill,
   and nothing tells those controls the renderer ignores `renderScale`. *Interim:* 
   `setRenderScaleSource` onto the renderer's own multiplier, or `showModeControls={false}`.
5. **Screenshot source is a canvas getter.** `installSceneIO({ getCanvas })` is the only shape
   seen in both shells. A renderer whose picture is produced asynchronously (the deep page has a
   `thumbnail` handle) or lives in another document needs a "capture" callback instead.
   *Interim:* return the iframe's canvas via `contentDocument` (same origin); whether it reads back
   non-blank depends on the renderer's drawing-buffer settings — unverified. *Generic fix:* an
   optional `capture(): Promise<Blob>` on the SceneIO options.
6. **One PWA identity for the whole suite.** A single manifest (`GMT — Fractal Explorer`,
   `start_url: './'`) and a single service worker cover every entry; a shell cannot be installed
   under its own name or icon. *Interim:* none needed — deep-zoom is precached and updated like
   the others. Per-app manifests would be a suite-wide decision.
7. **Pre-mount failures are a blank page.** `AppErrorBoundary` covers render only; the whole
   install chain and `setupX()` run before it. A renderer that fails to start (no WebGL2, lost
   context) is also outside React. *Interim:* wrap the post-install block in try/catch and pass
   `initialError` to the boundary (the pattern its header describes for app-gmt), and surface host
   start-up failure through the host's ready/error signal into a visible in-viewport notice.
8. **The samples-per-second readout needs a store field the renderer must feed.** `FpsCounter`
   reads `accumulationCount`; an app with its own accumulator only gets that metric if it reports
   the count. *Interim:* report `renderFps` only; add the accumulation report when the host exposes
   a sample count (the action name is unverified).

---

## 4. Unverified (not opened, or inferred)

- `engine/plugins/SceneIO.tsx`, `Undo.tsx`, `Camera.ts`, `Shortcuts.ts` bodies, `Help.tsx` body,
  `Hud.tsx` body — only export lists and call sites in the two `main.tsx` files were read. Option
  names shown are the ones those call sites use.
- `store/coreSettings.ts`, `components/SettingsAccess.tsx`, `components/layout/Dock.tsx`,
  `DropZones.tsx`, `DraggableWindow.tsx`, `PanelRouter.tsx` — existence checked, contents not read.
- `engine/PanelManifest.ts` — only `applyPanelManifest` / `panelLabel` usage seen.
- Who registers the ANIMATE-phase tick that advances the animation engine (so whether
  `<RenderLoopDriver />` alone is enough for timeline playback) — not traced. fluid-toy mounts
  `EngineBridge` + `RenderLoopDriver` and has a working timeline, so the pair is copied.
- The store action that reports an accumulation count (`reportAccumulation` is named in a
  `viewportSlice.ts` comment; its definition was not read).
- Whether `vite-plugin-pwa` injects the manifest link into every HTML entry.
- How the standalone page sizes its canvas when embedded (`?embed=1`), and whether its canvas can
  be read back for a screenshot — `public/deep-zoom-core/index.html` was not opened.
- Fixed mode with an iframe child (CSS-transformed fixed-size box) is expected to work from
  reading `ViewportFrame`; it was not run.
- The keyboard/pointer behaviour in gap 3 is standard browser behaviour for iframes, not something
  measured in this app; the existing `deep-zoom/bridge.ts` may already forward keys — not read.
- `.mobile-scroll` — which components use the class was not checked.
- `engine/plugins/viewport/FixedResolutionControls.tsx`, `InteractionSessionBadge.tsx`,
  `engine/plugins/topbar/PauseControls.tsx`, `installBucketRender.tsx` — not opened.
- No typecheck was run on either skeleton (job rule). Import paths were checked by listing the
  files; export names were checked by grep for the engine plugins, and taken from the two existing
  shells for `components/*`.
