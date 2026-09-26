/**
 * GMT App — entry point.
 *
 * Mirrors fluid-toy/main.tsx: register features + install plugins +
 * mount the app. The only GMT-specific parts are:
 *   1. `registerGmtFeatures()` registers the 26 DDFS features
 *   2. `installGmtRenderer({...})` boots the worker + renderer plugin
 *   3. Boot flow calls `gmtRenderer.boot(config, camera)` after the
 *      store has a valid formula + default preset seeded
 */

// Side-effect registrations — MUST be imported FIRST. ES module imports
// hoist, so any top-level statement in this file runs AFTER every import
// below has resolved; registration therefore HAS to be a side-effect
// import, not a plain function call further down.
//
// The freeze trigger is store ACCESS, not module load: `store/engineStore`
// keeps `_store` lazy behind `ensureStore()`, and only the first hook call /
// getState / setState / subscribe runs `createFeatureSlice`, which calls
// `featureRegistry.freeze()`. Merely importing engineStore is safe (several
// modules below do exactly that) — but any module reached from these imports
// may make that first access during module eval, so every
// `featureRegistry.register()` has to have run by then.
// @see docs/adr/0006-registerfeatures-as-side-effect-import.md
import './registerFeatures';

// Global Tailwind styles (build-time; replaces the cdn.tailwindcss.com Play CDN).
import '../index.css';

// Slice migrations — translate pre-restructure presets at load time.
// Registered before any preset load; order vs registerFeatures is irrelevant
// (migrations run in engineStore.loadPreset, well after boot).
import './migrations';

// Plugin preset fields (cameraRot, etc.) register into presetFieldRegistry.
import '../engine/plugins/camera/presetField';
// GMT-specific preset fields (lights top-level array) — must precede store init.
import '../engine-gmt/store/gmtPresetFields';

import { setLiveModulationPublishInterval } from '../engine/animation/AnimationSystem';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppErrorBoundary } from '../engine/components/AppErrorBoundary';
import { openExplorerFromGmt } from './explorerTrip';
import { favientsPanelEntry, mountFavientsPanel } from '../palette/installFavients';
import { gradientStudioPanelEntry, mountGradientStudio } from '../palette/installGradientStudio';
import { isFavientsPanelShown, toggleFavientsPanel } from '../palette/store/favientsPanelPersist';
import { installGradientFileClaim } from '../palette/installGradientFileClaim';
import { isMobileSnapshot } from '../hooks/useMobileLayout';
import { AppGmt } from './AppGmt';
import { registerUI } from '../engine/features/ui';
import { registerGmtUi } from '../engine-gmt/features/ui';
import { installGmtCameraSlice, flushCameraToStore } from '../engine-gmt/store/cameraSlice';
import { installGmtModularSlice } from '../engine-gmt/store/modularSlice';
import { installViewport, setRenderScaleSource } from '../engine/plugins/Viewport';
import { installTopBar } from '../engine/plugins/TopBar';
// NOTE: `installPauseControls` is deliberately NOT imported — engine-gmt/topbar.tsx
// registers the pause button itself in the LEFT slot (see the installTopBar call below).
import { installPwaUpdate } from '../engine/plugins/PwaUpdate';
import { installSceneIO } from '../engine/plugins/SceneIO';
import { copyShareLink } from '../engine-gmt/topbar/ShareLinkButton';
import { installModulation } from '../engine/animation/modulationTick';
import { installAudioAnalysis } from '../engine/animation/audioTick';
import { installModulationUI, setLfoListConfig } from '../engine/components/modulation';
import { installShortcuts, shortcuts } from '../engine/plugins/Shortcuts';
import { installUndo } from '../engine/plugins/Undo';
import { installCamera } from '../engine/plugins/Camera';
import { installGmtCameraBinders } from '../engine-gmt/animation/cameraBinders';
import { installGmtColoringBinders } from '../engine-gmt/animation/coloringBinders';
import { registerCameraKeyTracks } from '../engine/animation/cameraKeyRegistry';
import { useAnimationStore } from '../store/animationStore';
import { installRenderDialog } from '../engine/plugins/RenderDialog';
import { registerRenderAdjunct } from '../engine/animation/renderAdjunctRegistry';
import { afxRenderAdjunct } from './AfxRenderAdjunct';
import { fbxRenderAdjunct } from './FbxRenderAdjunct';
import { runVideoExport, type AppGmtExtra } from '../engine-gmt/components/timeline/RenderPopup/exportRunner';
import {
    AppGmtExtraFormFields,
    AppGmtExtraWarning,
    APP_GMT_DEFAULT_EXTRA,
    appGmtResolutionPresets,
    appGmtStartLabel,
    appGmtIsStartDisabled,
    appGmtCanEncode,
} from './renderDialogExtras';
import { installMenu, menu } from '../engine/plugins/Menu';
import { installHelp } from '../engine/plugins/Help';
import { installGallery } from '../engine-gmt/gallery';
import { useGalleryStore } from '../engine-gmt/gallery/galleryStore';
import { installAuth } from '../engine-gmt/auth';
import { feedbackMenuItem } from '../engine-gmt/feedback';
import { AboutGmtBody, whatsNewMenuItem, isWhatsNewUnseen } from './HelpExtras';
import { gmtSupportConfig } from '../engine-gmt/support';
import { installTutorial, registerLessons } from '../engine/plugins/Tutorial';
import { GMT_LESSONS } from './tutorial/lessons';
import { registerGmtTriggers } from './tutorial/triggers';
import { registerGmtStepKinds } from './tutorial/stepKinds';
import { prefetchHelpTopics } from '../data/help/registry';
import { installHud } from '../engine/plugins/Hud';
import { applyPanelManifest } from '../engine/PanelManifest';
import { GmtPanels } from '../engine-gmt/panels';
import { loadGMFScene, saveGMFScene } from '../engine-gmt/utils/FormulaFormat';
import { pickAndLoadM3pFile } from '../engine-gmt/utils/mb3d/importM3pFile';
import { pickAndLoadFragFile } from '../engine-gmt/features/fragmentarium_import/pickFragFile';
import { registry as gmtRegistry } from '../engine-gmt/engine/FractalRegistry';
import { FractalEvents, FRACTAL_EVENTS } from '../engine/FractalEvents';
import { getSharedSceneById } from '../engine-gmt/gallery/sharedScene';
import { showToast } from '../engine/store/toastStore';
import { takeSceneStash, takeGxTripStash, GX_RETURN_QUERY } from '../engine-gmt/utils/sceneStash';
import type { Preset } from '../types';

import {
    installGmtRenderer,
    getProxy,
} from '../engine-gmt';
import { registry } from '../engine-gmt/engine/FractalRegistry';
import { registerGmtTopbar } from '../engine-gmt/topbar';
import { useEngineStore, getShaderConfigFromState, setFormulaPresetResolver, setCompileEstimator } from '../store/engineStore';
import { estimateCompileTime } from '../engine-gmt/features/engine/profiles';
import { parseShareString } from '../utils/Sharing';
import { setFormulaParamResolver } from '../components/ParameterSelector';
import { LoadSceneFilterMenuItem } from '../components/LoadFilterPanel';

// Dev-mode: unregister any stale service workers left by `npm run preview`.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
        if (regs.length === 0) return;
        regs.forEach((r) => r.unregister());
        if ('caches' in window) caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
        console.info('[dev] Cleared stale service worker + caches.');
    });
}

registerUI();

// GMT-specific widget + bespoke-panel registrations. Must come after
// the engine's registerUI() so it sees auto-feature-panel already
// registered, and before applyPanelManifest() (which references these
// componentIds for `component:` panels and `widgets:` slots).
registerGmtUi();

// The Gradient Explorer, in its own tab — the same trip as the My Gradients panel's Explorer
// button (./explorerTrip: it takes the gradient in use and stashes the scene for the way back).
// Until 2026-09-26 this item was "Gradient Library…", a full-screen overlay over the first
// Explorer's picker wall; the Explorer replaced it.
menu.registerItem('system', {
  id: 'gradient-explorer',
  type: 'button',
  label: 'Gradient Explorer…',
  title: 'Open the Gradient Explorer in a new tab, on the gradient you are using.',
  order: 21, // after Formula Workshop… (engine-gmt/topbar.tsx numbers the System menu)
  onSelect: openExplorerFromGmt,
});

// My Gradients — show / hide the shelf wherever it lives (floating or docked). Before
// 2026-09-26 the only way back to a closed shelf was the gradient editor's star.
menu.registerItem('system', {
  id: 'my-gradients',
  type: 'toggle',
  label: 'My Gradients',
  title: 'Show or hide your saved gradients.',
  order: 21.5,
  isActive: isFavientsPanelShown,
  onToggle: toggleFavientsPanel,
});

// Favients — the floating gradient-favourites shelf. No topbar toggle in app-gmt; the
// shelf floats by default and is reachable from the gradient editor's ★ + the picker.

// GMT camera slice — savedCameras / undo / redo / addCamera / resetCamera.
// Patches the store with actions engine-core doesn't provide. Must land
// before any component that reads `state.savedCameras.length` (e.g.
// CameraManagerPanel).
installGmtCameraSlice();

// Gradient favourites are now the cross-app "Favients" shelf (palette/store/favientsStore,
// localStorage 'gmt.favients'), shown in the Palette Picker overlay sidebar + applied to a
// coloring layer via the Favients targets registered in registerFeatures. The legacy
// per-app savedGradients library was retired; its data is migrated once on boot
// (migrateSavedGradientsToFavients).

// Stash pre-boot texture emits on the proxy so GmtRendererTickDriver can
// replay them once the worker is boot-ready. loadScene() (below) fires the
// `texture` event during module eval — before React mounts the tick driver
// that handles it, and image params aren't carried in the BOOT config. So a
// share-URL / OAuth-stashed scene with an env HDR would otherwise drop the
// texture and render a black sky. Mirrors the pendingTeleport pattern in
// installGmtCameraSlice. Registered here (pre-loadScene) so it never misses
// the boot-time emit; the live post-boot path stays in the tick driver.
FractalEvents.on(FRACTAL_EVENTS.TEXTURE, ({ textureType, dataUrl }) => {
    const proxy = getProxy();
    if (!proxy.isBooted) proxy.pendingTextures.set(textureType, dataUrl);
});

// Forward formula registrations to the worker from module-eval — so a scene
// hydrated BEFORE boot (share link / OAuth stash) delivers its custom formula's
// shader (MB3D-hybrid / Workshop). proxy.post() queues it in the pre-boot outbox
// and flushes it to the worker before the boot compile (WorkerProxy._outbox);
// post-boot it delivers immediately. Registered here (not in GmtRendererTickDriver,
// which mounts too late) so the boot-time REGISTER_FORMULA emit is never missed —
// without this the boot compile runs before the shader arrives and renders a
// fallback sphere until a manual recompile.
FractalEvents.on(FRACTAL_EVENTS.REGISTER_FORMULA, ({ id, shader }: any) => {
    getProxy().registerFormula(id, shader);
});

// GMT modular slice — Modular formula's pipeline + graph state.
// Without this, switching to the Modular formula crashes FlowEditor
// on `state.graph.nodes` (undefined).
installGmtModularSlice();

// Install GMT's formula-preset resolver so engineStore.setFormula can
// hydrate the store with each formula's defaultPreset on switch.
// Decoupled via setFormulaPresetResolver — the engine core has no
// direct coupling to engine-gmt's FractalRegistry.
setFormulaPresetResolver((f) => registry.get(f)?.defaultPreset as any ?? null);

// Same pattern for the compile-time estimator. engineStore actions
// (setFormula, loadScene) call this before each compileGate.queue so
// the unified CompileProgressStore projects the bar over a realistic
// duration instead of the 15s default.
setCompileEstimator((state) => estimateCompileTime(state));

// Same pattern for the ParameterSelector dropdown: the stub registry
// in components/ParameterSelector.tsx hands back per-formula param
// metadata (authored labels, id list) when a resolver is installed.
// Lets the LFO/modulation target dropdown show "P-A: Power" instead
// of "Param A" for coreMath items.
setFormulaParamResolver((f) => registry.get(f) as any);

// @engine/viewport — GMT is CPU/GPU-heavy on path tracing; adaptive is
// crucial. Target 30 fps; allow deeper quality drops under load since
// Mandelbulb raymarch can be expensive at 1:1 DPR.
installViewport({
    enabled: true,
    targetFps: 30,
    minQuality: 0.35,
    interactionDownsample: 0.55,
    activityGraceMs: 100,
    alwaysActive: false, // GMT-style — settle to full-res on idle
});

// Point the in-canvas render-scale pill at GMT's actual internal-pixel
// multiplier (Quality panel's "Internal Scale" slider). The default
// source — viewportSlice.renderScale — is consumed only by fluid-toy;
// in GMT the equivalent knob is the renderControlSlice's `aaLevel`,
// which `setAALevel` pipes to `dpr` for the viewport. Both the in-canvas
// pill and the Quality > Resolution > Internal Scale dropdown read/write
// the same field — single source of truth.
setRenderScaleSource({
    use: () => {
        const value = useEngineStore((s: any) => s.aaLevel ?? 1.0);
        const setAALevel = useEngineStore((s: any) => s.setAALevel);
        return [value, (v: number) => setAALevel(v)];
    },
    steps: [0.25, 0.5, 0.75, 1.0, 1.5, 2.0],
});

// hideDefaults: registerGmtTopbar registers fps/adaptive/pause itself in
// the LEFT slot to match gmt-0.8.5's RenderTools layout, and the project
// name lives inside GmtLogo. installPauseControls is intentionally not
// called for the same reason.
installTopBar({ hideDefaults: true });
installPwaUpdate();

installSceneIO({
    // Target the render canvas by its stable id (set in GmtRendererCanvas).
    // A loose querySelector('canvas') returns the FIRST canvas in the DOM,
    // which can be a feature panel's canvas (e.g. the audio-modulation
    // waveform) when open — sending the wrong image to snapshots/gallery.
    // SnapshotButton auto-registers in the topbar when getCanvas is set.
    getCanvas: () => document.getElementById('gmt-render-canvas') as HTMLCanvasElement | null,

    // GMT's primary save format is GMF (formula shader + scene preset).
    // The "Save Scene" menu item downloads as <project>.gmf — matches
    // the bytes the serializer below writes.
    fileExtension: 'gmf',

    // Tutorial anchor — Lesson 2 + 4 next-steps highlight the snapshot button.
    snapshotAnchor: 'snapshot-btn',

    // R3F camera state is debounced into the store every 100 ms by
    // Navigation.tsx. Without this flush, a save fired mid-movement (or
    // within 100 ms of stopping) would capture the previous pose. Mirror
    // of the saved-camera-slot capture path, which has always read the
    // engine directly via CameraUtils.
    onBeforeSerialize: flushCameraToStore,

    // GMT scene files are GMF: a wrapper carrying both the formula's
    // shader source AND the scene preset. The custom parser extracts
    // both, registers the embedded formula def if it isn't already in
    // the registry (so workshop saves and Fragmentarium imports load
    // cleanly even on a fresh runtime), then returns the preset for
    // engine-core's loadPreset to apply.
    parseScene: (content) => {
        const { def, preset } = loadGMFScene(content);
        if (def && !gmtRegistry.get(def.id)) {
            gmtRegistry.register(def);
            FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, {
                id: def.id,
                shader: def.shader,
            });
        }
        return preset;
    },

    // Saves go out as GMF so the round-trip preserves the formula's
    // shader. saveGMFScene falls back to plain JSON when the active
    // formula isn't in the registry (defensive — shouldn't happen for
    // GMT scenes, but matches gmt-0.8.5 behaviour).
    //
    // Cast: engine-core's Preset has `formula: string`; engine-gmt's
    // narrows to `FormulaType` (a known-formula union). The runtime
    // shapes are identical — saveGMFScene only reads `formula` to look
    // up the registry, which accepts any string.
    serializeScene: (preset: Preset) => saveGMFScene(preset as any),
});

// Override engine-core's generic Load row with GMT's partial-load variant
// (gear → "which parts?" panel, italic + `*` label when a filter is active).
// Same `'load'` id → menu.registerItem overwrites the engine-core entry.
// The LoadFilterPanel overlay itself is mounted in AppGmt.tsx.
menu.registerItem('file', {
    id: 'load',
    type: 'custom',
    order: 10, // engine/plugins/SceneIO.tsx numbers the File menu; keep the Load slot
    component: LoadSceneFilterMenuItem,
});

// New Scene wizard — first in the File menu (SceneIO numbers the rest: Load 10s, Save 20s,
// Autosave 30s; this app adds Share / Gallery in the 40s and Import in the 50s).
menu.registerItem('file', {
    id: 'new-scene',
    type: 'button',
    label: 'New Scene…',
    order: 0,
    onSelect: () => { useEngineStore.getState().openNewScene(); },
});

// Import section — external formula/scene files. The catalog browsers for
// these live in the FormulaPicker (MB3D scenes + Fragmentarium/DEC formulas);
// these menu items load an arbitrary file from disk.
menu.registerItem('file', { id: 'import-sep', type: 'separator', order: 49 });
menu.registerItem('file', { id: 'import-section', type: 'section', label: 'Import', order: 50 });
// Import a Mandelbulb3D `.m3p` scene file (the bundled sample scenes live in the
// FormulaPicker's "Mandelbulb3D" catalog group).
menu.registerItem('file', {
    id: 'import-mb3d',
    type: 'button',
    label: 'Mandelbulb3D scene (.m3p)…',
    order: 51,
    onSelect: () => pickAndLoadM3pFile(),
});
// Load a Fragmentarium `.frag` (or .glsl) file into the Formula Workshop.
menu.registerItem('file', {
    id: 'import-frag',
    type: 'button',
    label: 'Fragmentarium formula (.frag)…',
    order: 52,
    onSelect: () => pickAndLoadFragFile(),
});

// Mobile users get Share Link only via this menu entry; desktop also
// has the topbar icon (registered separately in registerGmtTopbar).
menu.registerItem('file', { id: 'share-sep', type: 'separator', order: 39 });
menu.registerItem('file', {
    id: 'share-link',
    type: 'button',
    label: 'Copy Share Link (URL)',
    order: 40,
    onSelect: () => { void copyShareLink(); },
});

// Online gallery — Phase 1 read-only curated catalog (Supabase + R2).
// Registers a "Browse Online Gallery" item in the File menu. The overlay
// component is mounted in AppGmt.tsx as <GalleryOverlay />.
installGallery({ order: 41 }); // Browse 41, Submit 41.5 — after Copy Share Link

// Supabase Auth — Phase 2B. Mounts the topbar profile chip (right slot) and
// gates the gallery's Submit menu item on signed-in status. Auth overlay +
// AccountPanel are mounted by AppGmt.tsx near the other full-screen UIs.
installAuth({ when: () => !isMobileSnapshot() });

installModulation();
// Audio analysis at SNAPSHOT, ahead of the modulation dispatch that reads it.
// @see docs/adr/0110-audio-analysis-in-a-worklet.md
installAudioAnalysis();
// GMT's LFO defaults: a fresh LFO targets coreMath.paramA (the first
// formula param) so the user gets a visible reaction immediately
// after clicking "Add LFO". The default seedBaseValue handler already
// reads state.coreMath.paramA correctly via the generic `<fid>.<pid>`
// path, so no resolver override needed.
setLfoListConfig({ defaultTarget: 'coreMath.paramA' });
// engine-gmt/features/ui.tsx already registers `'lfo-list'` directly
// (it does the same registry calls as installModulationUI); this call
// is harmless (idempotent) and documents intent for the GMT app.
installModulationUI();
// Capture phase: the dispatcher runs before content handlers, so Escape-based
// dismissal (useDismiss → shortcut registry) fires even when a surface stops
// key propagation in bubble phase (e.g. panels that block nav keys). The
// input-focus guard still protects typing in fields.
installShortcuts({ capture: true });
installUndo();
// hideShortcuts: GMT's camera state lives in the savedCameras state-library
// (installed by installGmtCameraSlice → installStateLibrary), which already
// owns Mod+1..9 / 1..9. Letting @engine/camera also register them creates
// a tie-break conflict that the dead-adapter handlers would silently win,
// since this install runs after the state-library's bindings.
installCamera({ hideShortcuts: true });
installMenu();
installTutorial();
registerGmtTriggers();
registerGmtStepKinds();
registerLessons(GMT_LESSONS);

installHelp({
    tutorials: { label: 'Tutorials' },
    extraItems: [feedbackMenuItem(), whatsNewMenuItem()],
    support: gmtSupportConfig(),
    about: {
        label: 'About GMT',
        body: AboutGmtBody,
    },
});
// Light the ? menu with a notification dot (and highlight the What's New item)
// until the user opens the changelog for this release. See HelpExtras.
menu.setBadge('help', isWhatsNewUnseen);
installHud();

// GMT camera animation binders — registers split-precision sceneOffset
// + Euler rotation track writers via the binderRegistry, plus pre/post
// scrub hooks that read the live camera and emit CAMERA_TELEPORT once
// per animated frame. Used to live inline inside AnimationEngine; moved
// out as part of F5 (see docs/history/engine/20_Fragility_Audit.md).
installGmtCameraBinders();

// GMT gradient (coloring) animation binders — keyframed phase/repeats are
// user knobs without uniforms; these binders write the derived
// offset/scale (which carry uColorOffset/uColorScale) so the gradient
// animates whether or not the gradient panel is mounted. Without them the
// phase→offset conversion only ran inside the open ColoringHistogram.
installGmtColoringBinders();

// Camera tracks the Key Cam button (in TimelineToolbar) captures into
// keyframes. Without this registration the button hides itself
// (tracks.length === 0 short-circuit). GMT's camera is split-precision
// sceneOffset (`camera.unified.{x,y,z}`) plus Euler rotation
// (`camera.rotation.{x,y,z}`) — same id strings the binders above own.
registerCameraKeyTracks([
    'camera.unified.x',
    'camera.unified.y',
    'camera.unified.z',
    'camera.rotation.x',
    'camera.rotation.y',
    'camera.rotation.z',
]);

// Register the GMT video-export popup. The shared TimelineToolbar's
// Install the generic render-dialog plugin with app-gmt's runner +
// extras. Plugin handles UI / form / progress / capability / disk-
// mode; the runner drives the GMT worker (multi-pass beauty / alpha /
// depth, image-sequence path, focus-lock) and the extras component
// adds the multi-pass selectors, depth-range, internal-scale, and
// the viewport-sample-time estimator.
installRenderDialog<AppGmtExtra>({
    runner:              runVideoExport,
    title:               'Render Sequence',
    showSamplesPerFrame: true,
    formatFilter:        () => true, // keep image-sequence formats in the dropdown
    canEncode:           appGmtCanEncode,
    resolutionPresets:   appGmtResolutionPresets,
    extraFormFields:     AppGmtExtraFormFields,
    extraWarning:        AppGmtExtraWarning,
    startLabel:          appGmtStartLabel,
    isStartDisabled:     appGmtIsStartDisabled,
    defaults:            { samplesPerFrame: 16, extra: APP_GMT_DEFAULT_EXTRA },
    // Taller setup window than the 320×460 default — GMT adds passes, depth
    // range, internal-scale and the sample estimator, which the short default
    // obscured. (expandedSize is the compact rendering view.)
    baseSize:            { width: 340, height: 644 },
    expandedSize:        { width: 400, height: 450 },
});

// "Export to After Effects" — a subordinate row in the timeline toolbar's
// "…" overflow menu, next to Render. Self-contained descriptor + dialog.
registerRenderAdjunct(afxRenderAdjunct);
registerRenderAdjunct(fbxRenderAdjunct);

// Warm the help-topics chunk on idle so the first ?-button click
// doesn't fall back to an empty topic map. Mirrors gmt-0.8.5's App.tsx.
prefetchHelpTopics();

// GMT topbar content (System + Camera menus, Path Tracing toggle,
// Playing badge). Must come AFTER installMenu/installCamera so the
// registries they own exist. See engine-gmt/topbar.tsx for scope.
registerGmtTopbar({
    openCameraManager: () => {
        useEngineStore.getState().togglePanel('Camera Manager', true);
    },
    openFormulaWorkshop: () => useEngineStore.getState().openWorkshop(),
});

// Dev-mode sanity check: every componentId referenced by a feature
// (viewportConfig, customUI[]) must resolve in the componentRegistry.
// Catches typos and missing registerUI / registerGmtUi entries at boot
// instead of "blank panel + silent fallback" at first render.
if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
    // Lazy import to avoid widening the prod bundle with the validator path.
    void import('../engine/FeatureSystem').then(({ validateComponentRefs }) => {
        void import('../components/registry/ComponentRegistry').then(({ componentRegistry }) => {
            validateComponentRefs(componentRegistry);
        });
    });
}

// @engine-gmt/renderer — wire GMT-specific callbacks.
installGmtRenderer({
    onBooted: () => console.log('[app-gmt] renderer BOOTED'),
    onCrash:  (r) => console.error('[app-gmt] renderer CRASHED:', r),
});

// Tab → camera-mode toggle. The navigation HUD / Navigation.tsx read
// state.cameraMode and switch between Orbit and Fly behaviours.
shortcuts.register({
    id: 'gmt.toggleCameraMode',
    key: 'Tab',
    description: 'Toggle Orbit / Fly camera mode',
    category: 'Navigation',
    handler: () => {
        const cur = (useEngineStore.getState() as any).cameraMode ?? 'Orbit';
        useEngineStore.setState({ cameraMode: cur === 'Fly' ? 'Orbit' : 'Fly' } as any);
    },
});

// ` (Backquote) → toggle advanced mode. Matches GMT's tilde binding
// from useKeyboardShortcuts.ts:115. The Light + advanced-only manifest
// items (e.g. Camera & Navigation section) flip visibility from this.
shortcuts.register({
    id: 'gmt.toggleAdvancedMode',
    key: '`',
    description: 'Toggle Advanced Mode',
    category: 'View',
    handler: () => {
        const s = useEngineStore.getState() as any;
        s.setAdvancedMode?.(!s.advancedMode);
    },
});

// B → toggle broadcast (clean-feed) mode — hides chrome for screenshots
// / screen recording. Mirrors GMT's KeyB binding.
shortcuts.register({
    id: 'gmt.toggleBroadcastMode',
    key: 'b',
    description: 'Toggle Broadcast / Clean-Feed mode',
    category: 'View',
    handler: () => {
        const s = useEngineStore.getState() as any;
        s.setIsBroadcastMode?.(!s.isBroadcastMode);
    },
});

// Escape → exit any active interaction mode (pick focus, draw, etc.)
// and clear timeline selection. Mirrors GMT's Escape handler.
shortcuts.register({
    id: 'gmt.escapeInteraction',
    key: 'Escape',
    description: 'Exit interaction mode / deselect',
    category: 'View',
    handler: () => {
        const s = useEngineStore.getState() as any;
        if (s.isBroadcastMode) s.setIsBroadcastMode?.(false);
        if (s.interactionMode && s.interactionMode !== 'none') {
            s.setInteractionMode?.('none');
        }
        // Animation deselect — direct import; no window-handle needed
        // (F7 cleanup landed: animationStore is just a regular module).
        (useAnimationStore.getState() as any).deselectAll?.();
    },
});

// Camera move undo/redo — Ctrl+Shift+Z / Ctrl+Shift+Y. Distinct from
// the engine's generic Ctrl+Z unified undo (which captures param
// changes); these specifically roll back sceneOffset + rotation moves
// recorded by the camera plugin.
//
// Priority override: engine-core's Undo plugin also binds `Mod+Shift+Z`
// as the Mac-redo alias (`redo.global.shift`), which expands to
// `Ctrl+Shift+Z` on Win/Linux. Both bind scope 'global'.
//
// `priority: 10` here is LOAD-BEARING, not defensive. The resolver tiebreak
// is FIRST-registered wins (stable sort over Map insertion order — see the
// @invariant on `resolve` in engine/plugins/Shortcuts.ts), and
// `installUndo()` above runs first. At equal priority `redo.global.shift`
// therefore takes `Ctrl+Shift+Z` and camera-undo never fires. Removing
// `priority: 10` silently turns camera-undo into param-redo.
// Guarded by `npm run smoke:undo` ("[shortcuts] resolver tiebreak").
// Mod+Y still does redo.
shortcuts.register({
    id: 'gmt.undoCameraMove',
    key: 'Ctrl+Shift+Z',
    priority: 10,
    description: 'Undo last camera movement',
    category: 'Navigation',
    handler: () => { (useEngineStore.getState() as any).undoCamera?.(); },
});
shortcuts.register({
    id: 'gmt.redoCameraMove',
    key: 'Ctrl+Shift+Y',
    priority: 10,
    description: 'Redo last camera movement',
    category: 'Navigation',
    handler: () => { (useEngineStore.getState() as any).redoCamera?.(); },
});

// Resolve the store's boot preset from (in priority order) a #s= share hash, a
// ?s=<id> backend share link, the Gradient Explorer trip's stash (`?from=gx` only), an
// OAuth-round-trip stash, or the default formula. `keepUnsaved`: the scene is a restored
// copy that had unsaved changes, so the caller marks it unsaved after the load.
// Mirrors GMT's useAppStartup — populates every DDFS slice so
// getShaderConfigFromState builds a complete BOOT config.
//
// CRITICAL: this must finish BEFORE the worker boots. The BOOT config
// (getShaderConfigFromState) and the pre-boot env-texture stash
// (WorkerProxy.pendingTextures) both read the store at boot time, so a scene
// hydrated AFTER boot boots the wrong shader (raster instead of Path Tracing) and
// drops its env map — needing a manual PT toggle + sky-visibility bump to activate.
// #s= is synchronous so it always wins that race; ?s= is a network fetch, so the
// caller AWAITS this and defers the React mount until the store is hydrated.
interface BootChoice { preset: any; keepUnsaved?: boolean }

/** A stashed GMF -> its preset, registering the embedded formula the way a share link does. */
const presetFromGmf = (gmf: string): any => {
    const { def, preset } = loadGMFScene(gmf);
    if (def && !gmtRegistry.get(def.id)) {
        gmtRegistry.register(def);
        FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });
    }
    return preset;
};

async function resolveBootPreset(): Promise<BootChoice> {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.startsWith('#s=')) {
        try {
            const p = parseShareString(hash.slice(3));
            if (p) { console.info('[app-gmt] Loaded scene from share URL'); return { preset: p }; }
        } catch (err) {
            console.error('[app-gmt] Share URL parse failed:', err);
        }
    }

    // ?s=<id> — backend-stored shared scene (share-scene / shared_scenes). Fetch +
    // hydrate here, BEFORE boot, so the worker boots directly into it. GMF carries
    // the full shader, so this opens ANY scene: weaves, MB3D imports, Workshop
    // formulas. The id is wiped from the URL so a refresh lands on a clean viewport.
    const shareId = new URLSearchParams(window.location.search).get('s');
    if (shareId) {
        const cleaned = new URL(window.location.href);
        cleaned.searchParams.delete('s');
        window.history.replaceState({}, '', cleaned.toString());
        try {
            const shared = await getSharedSceneById(shareId);
            if (shared?.gmf_text) {
                const { def, preset } = loadGMFScene(shared.gmf_text);
                if (def && !gmtRegistry.get(def.id)) {
                    gmtRegistry.register(def);
                    FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id: def.id, shader: def.shader });
                }
                return { preset };
            }
            showToast('That share link is invalid or has been removed.', 'warning', 5000);
        } catch (err) {
            console.error('[app-gmt] shared-scene load failed', err);
            showToast('Could not open that shared scene.', 'error', 5000);
        }
    }

    // ?from=gx — the Gradient Explorer's "Back to GMT", when it could not close its own tab
    // and land the user back in the GMT tab they came from (gradient-explorer/v2/fromGmt.ts).
    // The Explorer button stashed the scene (app-gmt/explorerTrip.ts); restore it ONLY with
    // this flag, so a reload or a crash never brings a trip's copy back — those stay on the
    // opt-in autosave. The flag is stripped so a refresh does not ask for the stash again.
    // A copy that had unsaved changes comes back UNSAVED (keepUnsaved), so the leave-page
    // prompt still guards it; the sign-in restore below keeps its old behaviour (counts as saved).
    const trip = takeGxTripStash(window.location.search);
    if (trip !== undefined) {
        const cleaned = new URL(window.location.href);
        cleaned.searchParams.delete(GX_RETURN_QUERY.param);
        window.history.replaceState({}, '', cleaned.toString());
        if (trip) {
            try {
                const preset = presetFromGmf(trip.gmf);
                console.info('[app-gmt] Restored the scene stashed for the Gradient Explorer trip');
                return { preset, keepUnsaved: trip.dirty };
            } catch (err) {
                console.error('[app-gmt] Failed to restore the Gradient Explorer trip stash:', err);
            }
        }
        // Deferred until the engine has booted: a toast's timer starts when it is shown, and this
        // runs before React mounts, so an 8 s toast would expire behind a slow loading screen.
        const toastWhenBooted = (): void => {
            if (getProxy().isBooted) showToast('Could not bring your scene back from the Gradient Explorer. If your first GMT tab is still open, the scene is there.', 'warning', 8000);
            else window.setTimeout(toastWhenBooted, 250);
        };
        toastWhenBooted();
    }

    // OAuth round-trips reload the page and lose the in-progress scene.
    // signInWithGoogle stashes it just before redirecting; restore it here.
    // takeSceneStash self-expires + clears, so a normal reload won't
    // resurrect a stale scene.
    const oauth = takeSceneStash('oauth');
    if (oauth) {
        try {
            const preset = presetFromGmf(oauth.gmf);
            console.info('[app-gmt] Restored scene stashed before OAuth redirect');
            return { preset };
        } catch (err) {
            console.error('[app-gmt] Failed to restore OAuth scene stash:', err);
        }
    }

    const mandelbulbDef = registry.get('Mandelbulb');
    return {
        preset: mandelbulbDef?.defaultPreset
            ? JSON.parse(JSON.stringify(mandelbulbDef.defaultPreset))
            : null,
    };
}

applyPanelManifest([
  ...GmtPanels,
  // Favients shelf — registered here so it can float; mountFavientsPanel() floats it.
  favientsPanelEntry({ dock: 'right', order: 90 }),
  // The Gradient Studio — floats, closed at boot; an editor's popout opens it.
  gradientStudioPanelEntry(),
]);

// Closing the Gradient Studio commits its open face (a live Curves / Adjust bakes, Paint applies).
mountGradientStudio();

// Float the Favients shelf at its remembered (or default middle-left) spot, open by
// default, persist later open/move/resize, and restore the picker filter prefs.
mountFavientsPanel();

// A gradient file (the Gradient Explorer's PNG, a set .zip, .ggr …) dropped on the scene drop zone
// or picked in File ▸ Load Scene imports into My Gradients instead of failing as a scene. Scenes are
// never taken — see palette/installGradientFileClaim.ts.
installGradientFileClaim();

// Boot is now driven by LoadingScreen → useAppStartup.bootEngine, which
// fires after the LoadingScreen's progress reaches 100% (gives
// GmtRendererCanvas time to mount + call initWorkerMode). bootEngine
// routes through compileGate.queue so the CompilingIndicator animates,
// and pre-emits compile_estimate.

// Live-modulation store publish at 20 Hz. Every open panel re-renders on
// each publish (PanelRouter subscribes to the whole store, and the modulated
// sliders' indicators read the map), and at 60 Hz that was a measurable
// main-thread + repaint cost alongside the render loop whenever audio
// modulated anything — even a plain audio file. The render path reads
// `getLiveModulationsNow()` per frame and is unaffected.
setLiveModulationPublishInterval(50);

// Expose for dev-tools probing.
if (typeof window !== 'undefined') {
    (window as any).__store = useEngineStore;
    (window as any).__gmtProxy = getProxy();
    (window as any).__fractalEvents = FractalEvents;
    (window as any).__fractalEventNames = FRACTAL_EVENTS;
    (window as any).__fractalRegistry = registry;
    // `?perf` — the frame-rate diagnostic (engine-gmt/renderer/perfProbe.ts).
    // Loaded on demand so it costs nothing otherwise.
    let perfMode: string | null = null;
    try { perfMode = new URLSearchParams(window.location.search).get('perf'); } catch { /* no URL */ }
    // `?perf` = quiet (10 s summaries); `?perf=live` = per-second line + overlay,
    // which has its own frame cost (see the @bug on the probe).
    if (perfMode !== null) void import('../engine-gmt/renderer/perfProbe').then((m) => m.installPerfProbe(getProxy(), { live: perfMode === 'live' }));
}

// Deep-link parse — if the page was opened with `?gallery=<slug>` (typically
// from the landing site or a shared link), queue the lightbox open before
// React mounts so the gallery overlay pops the right item on first paint.
// The slug is wiped from the URL after handoff so a manual refresh drops
// the user back to a clean viewport instead of re-opening the gallery.
try {
    const params = new URLSearchParams(window.location.search);
    const gallerySlug = params.get('gallery');
    if (gallerySlug) {
        useGalleryStore.getState().openGalleryAtSlug(gallerySlug);
        const url = new URL(window.location.href);
        url.searchParams.delete('gallery');
        window.history.replaceState({}, '', url.toString());
    }
} catch (err) {
    console.warn('[app-gmt] gallery deep-link parse failed', err);
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');

// Resolve the boot preset (awaiting a ?s= backend fetch when present), hydrate the
// store, THEN mount React — so the worker's first BOOT config carries the scene's
// renderMode + the pre-boot texture stash captures its env map (see
// resolveBootPreset). For everything except ?s= this resolves synchronously, so
// the mount is not delayed; a shared-link open pays a brief pre-loader blank in
// exchange for a correct first compile instead of a raster/no-sky boot.
void resolveBootPreset().then(({ preset: bootPreset, keepUnsaved }) => {
    // A throw here happens BEFORE React mounts, so the root AppErrorBoundary
    // cannot catch it (see its @assumption). Catch it ourselves and hand it in
    // as initialError so the same fallback page shows instead of a blank one.
    let bootError: unknown = null;
    if (bootPreset) {
        try {
            // loadScene fires CAMERA_TELEPORT — installGmtCameraSlice's listener stashes
            // it on proxy.pendingTeleport for GmtRendererTickDriver to replay at boot.
            useEngineStore.getState().loadScene({ preset: bootPreset });
            // After the load: pre-boot, loadScene runs loadPreset synchronously, and
            // loadPreset is what clears the flag (grep markSceneUnsaved in store/engineStore.ts).
            if (keepUnsaved) useEngineStore.getState().markSceneUnsaved();
        } catch (err) {
            console.error('[app-gmt] Boot preset failed to load (pre-mount):', err);
            bootError = err;
        }
    } else {
        console.warn('[app-gmt] No boot preset available — worker may boot un-hydrated');
    }
    ReactDOM.createRoot(rootElement).render(
        <AppErrorBoundary initialError={bootError}>
            <React.StrictMode>
                <AppGmt />
            </React.StrictMode>
        </AppErrorBoundary>,
    );
});
