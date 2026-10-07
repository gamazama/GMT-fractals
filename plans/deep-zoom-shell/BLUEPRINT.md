# Deep Zoom as a gmt-shell - the target

Architect pass, 2026-10-07, worktree `deep-zoom` (branch `deep-zoom-tool`). Read-only on source.

**Where the facts come from.** I read the nine reader maps in `plans/deep-zoom-shell/research/` and
`plans/deep-zoom/INTERFACE.md` in full. Every statement about engine or page code below is taken
from the reader map named in brackets - `[boot]`, `[ddfs]`, `[params]`, `[scene]`, `[timeline]`,
`[keys]`, `[palette]`, `[host]`, `[conv]` - which carries the file path, the symbol and the quoted
lines. I did not re-open those source files. Four things I checked myself by grep: `package.json`
has `smoke:deep-zoom` and `sync:deep-zoom-core`; `debug/smoke-deep-zoom.mts` exists;
`registerRenderAdjunct(adjunct | null)` is exported from `engine/animation/renderAdjunctRegistry.ts`;
`fractal-toy/main.tsx` calls a `setCamera` feature setter (so a feature id `camera` is already in
use by a sibling shell). Anything the readers marked unverified stays unverified here and is
flagged where a design choice leans on it.

**Correction pass, same day, after three critics** (`research/critic-native-maximalist.md`,
`critic-builder.md`, `critic-deep-zoomer.md`). In this pass I opened the code myself for every
finding I acted on: `store/coreSettings.ts` (`CoreSettingsOptions.autosave`, the `if (registered)
return` guard); the four overlay sites (`app-gmt/AppGmt.tsx`, `components/ViewportArea.tsx`,
`fluid-toy/components/DomOverlays.tsx`, `fractal-toy/FractalToyApp.tsx`); `store/documentRegistry.ts`
exports and `getShareString` in `store/engineStore.ts`; `engine/features/index.ts` `registerFeatures`
and `engine/features/color_grading.ts`; `engine/plugins/Viewport.tsx` `setRenderScaleSource`;
`engine/store/installStateLibrary.ts` `SlotShortcutOptions`; `components/StateLibraryPanel.tsx`
props; `components/TimelineHost.tsx` shortcut registrations; `engine/plugins/Shortcuts.ts` priority
comment; `engine/plugins/RenderDialog/types.ts` (`resolutionPresets`, `extraInfoRows`);
`engine/animation/renderPopupRegistry.ts` exports; `public/deep-zoom-core/index.html` `easeInOut`
call sites; last week's `ui/DepthGauge.tsx` and `ui/LocationsPanel.tsx` by grep. Findings I did not
take are listed at the end with the reason.

**Reconciliation pass, 2026-10-08.** Five owner decisions since the text above (DECISIONS K1-K5):
the standalone page (`H:/GMT/workspace-gmt/mandelbulb_deepzoom`, commit 3b65946) is frozen as the
historical reference; the renderer is a module in this repo, `deep-zoom/renderer`
(`createDeepZoom(canvas, options)`, commit a087bbb8); last week's embedded prototype moves aside
and the new shell owns `deep-zoom/`; GMT's own navigation and Light Studio fly and light this tool
once they are reworked generically (`GMT-SYSTEMS.md`, stages N and L); until each rework lands the
shell flies on the module's own loop and lights with plain sliders. Rewritten in this pass: the
plugin rows for the tick, navigation, the Light Studio and pause; the key bullet in section 2; the
`flySpeed` row; sections 7, 9 (lead and tail) and 11. Nothing is built yet.

**How to read the sections this pass did not rewrite (3 to 6, 8, 10, 12).** Where they say "the
page" for the thing the shell talks to, read "the module" (`deep-zoom/renderer/core.js`).
`__name` is `instance.api.name`; `__dz` is `instance.api.dz`. "Page handle H1..H8, K1..K3" is the
module package with the matching number in BUILD-PLAN ("M packages"). "Last week's `ui/...`" is the
same file under `deep-zoom-prototype/ui/`.

Opened for this pass: `deep-zoom/renderer/index.ts` (the header and every exported type),
`deep-zoom/renderer/core.d.ts` (`DeepZoomCoreOptions`, `DeepZoomCoreInstance`),
`deep-zoom/renderer/core.js` by grep (`dzKeyTarget`, `dzShortcuts`, `isFlying`, the `mv(...)` fly
lines, `cam.baseSpeed`, the `pointerlockchange` and `mousemove` listeners, the list of `api.*`
assignments), `engine/TickRegistry.ts` (`TICK_PHASE`, `registerTick`),
`debug/smoke-deep-zoom-parity.mts` (`historicalPath`), `debug/smoke-deep-zoom.mts` (its `URL`),
and `package.json`, `vite.config.ts`, `knip.json`, `launcher.html` by grep for `deep-zoom`.
Statements about GMT's navigation and lighting files are taken from `GMT-SYSTEMS.md` and are
marked `[gmt n]` with its section number; I did not re-open those files.

Template: **fluid-toy's full shell** (TopBarHost + docks + ViewportFrame + TimelineHost), not
Gradient Explorer's streamlined one. Three of four apps use it and every plugin the owner listed is
one fluid-toy already installs [conv 1.1, 2.1].

---

## 1. Plugin adoption

One row per engine plugin or system. "Call" is what `deep-zoom/main.tsx` (or the file named) writes.

| Plugin / system | Used for | The call | Source |
|---|---|---|---|
| **DDFS features** | every look, quality, formula and colour value: panel rows, undo, presets, keyframes, share link | `featureRegistry.register(X)` x7 in `deep-zoom/registerFeatures.ts`, imported first in `main.tsx` | [ddfs 1.1, 1.9] |
| **Panel manifest** | all dock tabs | `applyPanelManifest([...DeepZoomPanels, favientsPanelEntry({dock:'right',order:90}), feedbackPanelEntry()])` in `deep-zoom/setup.ts`, then `setDockCollapsed('left', false)` | [ddfs 1.7, 1.8] |
| **Component registry** | the custom widgets in section 4 | `componentRegistry.register('dz-...', C)`; store-free ones in `registerFeatures.ts`, store-reading ones in `main.tsx` after the installs | [ddfs 1.6] [boot 1.1] |
| **Viewport** | the frame the renderer sits in; fps readout. **Declined until gap E4 closes (DECISIONS D14): Fixed mode, the in-canvas scale pill, the adaptive-resolution loop.** Fixed width / height have no sink a self-sizing surface can read, and the pill shows only in Fixed mode | `installViewport({ enabled: false })`; `<ViewportFrame className="flex-1" showModeControls={false}>`; `viewport.reportRenderFps(t.fps)` from the telemetry stream. When E4 lands: mode controls on, and `setRenderScaleSource({ use, steps: [320, 480, 640, 960, 1280, 1920, 2560], formatLabel: v => v + ' px' })` points the engine's pill at `dzQuality.frameSize` - that seam exists today (`engine/plugins/Viewport.tsx`, `RenderScaleSource { use, steps, formatLabel? }`) | [boot 1.4, 1.5] |
| **TopBar** | project name, fps, undo/redo, settings, status chip, My Gradients toggle | `installTopBar(); topbar.unregister('adaptive');` then `topbar.register({ id:'deep-zoom.status', slot:'center', order:0, component: StatusChip })`, `{ id:'settings', slot:'right', order:100, component: SettingsButton }`, `{ id:'favients-toggle', slot:'left', order:40, component: FavientsToggleButton }` | [boot 1.5, 1.6] [palette 1.4] |
| **Menu** | File (from SceneIO), Locations (from the state library), Help; one app menu "Dive" | `installMenu()`; `menu.register({ id:'dive', slot:'left', order:30, label:'Dive' })` + `menu.registerItem('dive', ...)` for Home, Back, Dive to..., Copy location, Paste location, Copy link | [boot 1.6] |
| **SceneIO** | Save / Load scene, Save PNG (scene embedded), `Alt+S` | `installSceneIO({ getCanvas: () => getHost()?.canvas() ?? null })` - the getter must be passed at this first call or the PNG rows never appear | [scene 1.2, 2.6] |
| **SceneFileClaims** | a dropped flight path (`format: 'gmt-mbulb-path'`) opens in the Flight panel; last week's bookmark list imports | `registerSceneFileClaim({ id:'deep-zoom.path', hint, take })`, `registerSceneFileClaim({ id:'deep-zoom.locations', ... })`; mount `<SceneFileDropZone/>` | [scene 1.3, 2.7] |
| **Session** | "come back where I was": current view + look + flight | `restoreSessionOnBoot(adapter, { storageKey:'gmt.deepZoom.session', settings })`, `installSessionAutosave(adapter, {...})`, `registerSessionFileSettings(...)`, with `settings = createAutosaveSettingsStore(keys)`; the same store goes into the one `registerCoreSettings` call (Settings row) | [scene 1.4, 2.4] [boot 1.6] |
| **Shortcuts** | every one-shot key (section 9) | `installShortcuts()` bare; `registerDeepZoomHotkeys()` in `deep-zoom/hotkeys.ts` | [keys 1.1, 2.4] |
| **Undo** | Ctrl+Z / Ctrl+Y and the two top-bar buttons; jumps as one step | `installUndo()`; `registerHistoryProvider('dzView', {capture, restore, changeOf})`, `('dzPath', ...)`, `('savedLocations', ...)` - `registerHistoryProvider` is exported by `store/slices/historySlice.ts`, not by the Undo plugin | [scene 1.7, 2.5] |
| **Camera plugin** | **not used.** It has no thumbnail, label, panel or undo, and the `'camera'` undo scope writes exactly `cameraRot / sceneOffset / targetDistance`, which cannot hold a 256-bit view. One mechanism for saved places: the state library. `engine/plugins/camera/presetField` is not imported either. | - | [scene 1.6, 1.7] |
| **Navigation** (GMT's, reworked generically - stage N) | flying. **Before N5:** the module's own fly loop. It reads `W A S D Q E`, `Shift` and `Escape` from the viewport frame element and looks with a captured mouse; the shell asks for the capture on a click (section 9). **After N5:** GMT's fly integrator and its renderer-free input hook, moved into `engine/plugins/navigation/` by packages N2 and N3; the shell's `deep-zoom/navigation.ts` mounts the hook on the viewport frame, runs the integrator on a tick with the module's raw distance, and hands each displacement to the module. The renderer still owns the position. Drag-look, no captured mouse (DECISIONS K4) | before: nothing to install. After: the hook + integrator from `engine/plugins/navigation/`, sink -> `host.moveAlong([dx, dy, dz], 1)`, `host.setInputOwner('host')`; fly speed passed with range 0.01..8 and default 3.6, GMT's own range and default unchanged | [gmt 3.2, 3.4]; `api.moveAlong` and `api.lockInput` exist in core.js today, `setInputOwner` is package N4 |
| **Light Studio** (GMT's, reworked generically - stage L, route A) | the lights. **Before L5:** the `dzLight` plain sliders of section 3 (stage 2). **After L5:** the shared light list as the feature `lighting` with key `lights`, GMT's orb strip and light panel mounted in this shell, the lights packed by `packLights(lights, viewFrame, modulations, targets)` and uploaded to the module's shading pass (N-light loop, package L0). `keyElevation`, `keyTurn`, `lightTint`, `lightType`, `lampFalloff` leave `dzLight` through one migration; shadows, occlusion, sky, roughness and haze stay there. The attachment "Surface" keeps its behaviour and its name, and only this shell offers it: GMT does not show Surface lights until GMT can fit a surface plane itself (DECISIONS K4) | before: nothing to install. After: the `lighting` feature registered in `deep-zoom/registerFeatures.ts`, the orb strip and panel through the manifest and `hud.register`, `deep-zoom/lighting/` for the deep view frame and the upload, `deep-zoom/handoff.ts` for lights crossing between the two apps | [gmt 4.2, 4.5, 6a] |
| **State library** | saved locations: thumbnails, labels, reorder, 9 slots, Locations menu | `installStateLibrary<DzLocationState>({ panelId:'Locations', arrayKey:'savedLocations', activeIdKey:'activeLocationId', actions:{...}, capture, apply: jumpTo, captureThumbnail: async () => getHost()?.thumbnail(128), slotShortcuts:{count:9, category:'Locations', when: () => !getHost()?.isCaptured() && !recording}, menu:{menuId:'locations', ...} })`. `when` is new (gap E36): `SlotShortcutOptions` today has only `count, category, saveModifier, savePrefix, recallPrefix`. The panel is the engine's `<StateLibraryPanel>` with two new optional props, `sortBy` and `renderMeta` (gap E38) | [scene 1.5, 2.3] |
| **Hud** | depth readout, render progress, key hints | `installHud()`; `hud.register({ id:'deep-zoom.depth', slot:'top-left', component, className:'pointer-events-auto' })`, `{ id:'deep-zoom.progress', slot:'top-center' }`; `<HudHost/>` inside the frame | [keys 1.3, 2.5] |
| **Help** | topics, Keyboard Shortcuts page, hint line, tutorial row | `setHelpTopicsLoader(() => import('./help/topics').then(m => m.dzHelpTopics()))`; `installHelp({ gettingStartedTopicId:'dz.getting-started', shortcutsTopicId:'dz.shortcuts', tutorials:{}, extraItems:[feedbackMenuItem(), whatsNew.menuItem()], support: gmtSupportConfig() })`; `help.registerHudHint({ id:'deep-zoom.keys', slot:'bottom-left', keys:[...] })`; `<HelpOverlay/>` | [keys 1.6, 2.6] |
| **Tutorial** | the first-run "First dive" lesson (dive-first onboarding) | `installTutorial({ storageKey:'gmt.deepZoom' }); registerLessons([firstDive]); stepRenderers.register({ kind:'dz-dive', render })`; `<TutorialRunner/> <TutorialOverlay/>`; start when `!tutorialCompleted.includes(1)` | [keys 1.8, 2.7] |
| **WhatsNew** | changelog dot on the Help menu | `createWhatsNew({ topicId:'dz.whats-new', version: __APP_VERSION__, seenKey:'gmt.deepZoom.whatsNew.seenVersion' })`; `menu.setBadge('help', whatsNew.isUnseen)` | [boot 1.6] |
| **RenderLoop / TickRegistry** | the renderer's frame, from stage 1, and animation playback. The module is created with `autoStart: false`, so it never schedules its own frame; `<RenderLoopDriver/>` + `<EngineBridge/>` are mounted in stage 1 because nothing else calls `runTicks` | exactly one tick, in `deep-zoom/DeepZoomSurface.tsx`: `registerTick('deepZoom.step', phase, () => host.step(performance.now()))` (`engine/TickRegistry.ts` `registerTick(name, phase, fn)` returns the unregister function; the tick's argument is seconds, `step` wants a millisecond timestamp, so it reads the clock itself). Phase: see section 7 | [boot 1.7] + `deep-zoom/renderer/core.d.ts` `autoStart`, `step` |
| **RenderDialog** | video render of a flight, opened from the Flight strip's Render button, File > Render... and the timeline toolbar (stage 6b, after module package M4) | `installRenderDialog({ runner: runDeepZoomExport, title:'Render', defaults:{ samplesPerFrame: 4 }, formatFilter: f => !f.imageSequence, resolutionPresets: () => presetsAtSurfaceAspect([720, 1080, 1440, 2160]), extraInfoRows: RenderEstimateRows })` - `resolutionPresets` (function form) and `extraInfoRows` ("an estimated total-render panel") are existing options in `engine/plugins/RenderDialog/types.ts`. Not installed before H4. The page's own ZIP render is a button in the Flight strip from stage 6a, and also `registerRenderAdjunct({ label:'PNG sequence (ZIP)', Dialog })` once the dialog exists | [timeline 1.9, 2.5, G2] |
| **PwaUpdate** | the Update pill | `installPwaUpdate()` early | [boot 1.2 row 6] |
| **Animation timeline** | one track, `camera.u`, moves the camera along the recorded flight; every DDFS param is keyframable for free | `<TimelineHost/>`; `registerCameraKeyTracks(['camera.u'])`; no `registerLogTrack`, no `registerCameraPair` | [timeline 1.2, 1.5, 2.1] |
| **Palette UI / Favients / send targets** | the engine's gradient editor on `dzColour.gradient`; My Gradients shelf; "Deep Zoom - Gradient" as a destination | `registerPaletteUI()`; `registerSendTarget({ id:'dz-gradient', label:'Deep Zoom - Gradient', group:'host', editsParam:{featureId:'dzColour', paramKey:'gradient'}, apply })`; `setFavientStudioAction(() => window.open('gradient-explorer.html','_blank','noopener'))`; after the manifest: `mountFavientsPanel({ storageKey:'deep-zoom.favients.panel', paletteFilters:false })` | [palette 1.4, 2.5] |
| **Toasts** | "Location saved", "Arrived at 1.0e-30", "Stopped at ...", errors | `showToast(msg, tone)`; `<ToastHost/>` mounted once | [keys 1.5] |
| **Settings** | theme, autosave rows | **one call, once**: `registerCoreSettings({ autosave: { store: settings, ...DZ_AUTOSAVE_TEXT } })` - the option is an object with a `store` key (`store/coreSettings.ts` `CoreSettingsOptions`; Gradient Explorer's `main.tsx` is the one caller that passes it), and the function returns early on any second call (`if (registered) return;`). Stage 1 writes `{ autosave: null }`; stage 3 replaces that line, it does not add one. `<SettingsHost/>` | [conv 1.8] |
| **Modulation (LFO)** | **not installed in v1.** Every push that changes power, phase or iterations rebuilds the reference orbit [params 1.1]; an LFO on those would rebuild it every frame. Revisit after the look params prove cheap. | - | [params 1.1] |
| **The engine's other generic features** (`engine/features/index.ts` `registerFeatures`: PostEffects, ColorGrading, Audio, Webcam, DebugTools) | **`registerFeatures()` is not called**, as in the sibling shells (a critic's grep found no import of it in fluid-toy, fractal-toy, gradient-explorer/v2 or mesh-export). ColorGrading and PostEffects: not used - their params are shader uniforms (`engine/features/color_grading.ts`: `uniform: 'uSaturation'`, `'uToneMapping'`, `'uLevelsMin'` ...), and the engine does not draw this picture, so they would be sliders the core cannot honour. Audio and Webcam: not used - they feed Modulation, which is declined. DebugTools (State Debugger): not installed in v1; file body unread, so whether it is free of app-specific wiring is unverified. What IS taken from that layer: the engine's **Advanced mode** switch (`advancedMode` in `store/slices/uiSlice.ts`) gates the `isAdvanced` params and the Diagnostics tab - no private dev flag | - | checked this pass |
| **Document registry** (`store/documentRegistry.ts`) | **used** for the two pieces of authoring state that are not DDFS and must not travel in a share link: the recorded flight and the saved locations. Scene files and PNGs carry them under `documents`; a share link does not, with no code, because `getShareString` (`store/engineStore.ts`) calls `getPreset({ includeScene: true })` without `includeDocuments`. The current view stays a preset field because a link must carry it | `registerDocumentProvider('deep-zoom.path', { serialize, restore })`, `registerDocumentProvider('deep-zoom.locations', { serialize, restore })` in `deep-zoom/documents.ts`. Where `restoreDocuments` runs relative to preset fields is unverified; the fallback is in BUILD-PLAN S3-2 | checked this pass |
| **PauseControls / BucketRender** | **PauseControls: used, once the module can pause.** Only the bucket runner is tied to three.js [gmt 7.3]; pause and the sample cap are an adapter away. Stage 2 installs `installPauseControls()` over an `AccumulationController` adapter when module package M5 (`pause`, a sample-target setter, a public reset) has landed; until then the controls are not shown. **BucketRender: not used in v1** - this renderer keeps its own tiled export | `installPauseControls()` in stage 2, gated on M5 | [boot 1.5] [timeline 1.11] [gmt 7.3] (not re-opened by me) |
| **AppErrorBoundary** | render failures; pre-mount failures passed in as `initialError` | `<AppErrorBoundary initialError={bootError}>` | [boot 1.2, gap 7] |
| **appHandles** | where the live host object is held | `defineAppHandles<DeepZoomHost | null>('deep-zoom.host', null)` in `deep-zoom/host/current.ts` (`engine/appHandles.ts` imports only `useSyncExternalStore` from react - two critics opened it - so `presetFields.ts` can import the holder without pulling the store in) | [conv 2.5 item 8] [scene 1.1] |

---

## 2. Who owns what

| State | Owner | Why |
|---|---|---|
| Look, quality, formula, colour values | the engine store (DDFS). The renderer is a sink. | panels, undo, presets, keyframes for free |
| The camera (three 256-bit numbers, yaw, pitch) | the renderer. Read through the host only when something is saved. | it moves every frame; the store's f64 cannot hold it [timeline 1.5] |
| The recorded flight | the store, as plain field `dzPath` (the page's own path object) | the page has no "current path"; every path handle takes it as an argument [host 2.1] |
| Saved locations | the state library (`savedLocations`) | thumbnails, labels, slots, menu |
| Telemetry (depth, fps, iterations, still progress) | a small read-only store beside the host, 8 Hz | 8 writes a second must not reach undo, presets or every selector [host 2.5] |

Values the renderer changes by itself, and the answer for each [params 4]:
- **Auto iterations** raise the count with depth and never lower it. The stored param is the user's
  floor; the live number comes from telemetry and is shown beside the slider. Never written back.
- **BLA auto** flips the effective flag. Store holds the 3-way choice; the effective flag is display only.
- **Loading a gradient** flips colour mode Plain -> Orbit trap in the page. The shell pushes ramp first,
  mode second, so the page's side effect is overwritten.
- **Playback and export** force precision to `deep` and never restore it. The host re-pushes the
  formula and quality slices when `play` / a render resolves.
- **The module's 21 parameter keys.** Off from the first frame: the module is created with
  `shortcuts: false` (`core.d.ts`: keys are still recorded for flying and for cancelling a dive,
  "but none of the page's single-key shortcuts acts"). The same keys are engine shortcuts that go
  through the DDFS setters. There is no runtime hotkey switch to call.
- **The light list (from L5).** Owned by the engine store as the feature `lighting`; the module is
  a sink for the packed lights, as it is for every other look value.
- **`setView`** also writes iterations, power, phase, light, falloff, colour, scale, detail. The shell
  never lets that be a second writer: a jump applies the look through the feature setters and hands
  the host a view whose look fields equal them, inside one undo bracket (section 6).

---

## 3. Features and every parameter

Seven features. Ids carry a `dz` prefix except `camera`, which is deliberate (section 8).
Enums are `defineEnumParam(values, label, {...})` - a float index plus options; the sync maps back
with `fromIndex` [ddfs 1.4]. No param has `uniform` or `onUpdate` [ddfs 2]. No key starts with `is`
(share links drop those) [scene 1.8]. **Naming trap:** a track id containing `rot`, `phase` or
`twist` gets 2-pi angle wrapping [timeline 1.8]. `phaseTheta` / `phasePhi` are radians, so that is
right for them. The key light's turn is in degrees, so it is named `keyTurn`, never `keyRotation`.

Ranges, steps and defaults are the page's `CTLS` rows [params 2.1]. "Inval" = what the page redoes:
O orbit rebuild (heavy at depth), A still restarts, C blocking compile.

### dzFormula (panel Formula) - all O
| key | label | type | range | step | default |
|---|---|---|---|---|---|
| `power` | Power | int | 2..16 | 1 | 8 |
| `phaseTheta` | Phase theta | float rad | 0..6.2832 | 0.02 | 0 |
| `phasePhi` | Phase phi | float rad | 0..6.2832 | 0.02 | 0 |
| `iterations` | Iterations | int | 4..160 | 1 | 14 |
| `autoIterations` | Auto iterations | boolean | - | - | true |

### dzQuality (panel Quality)
| key | label | type | range | step | default | inval | shown |
|---|---|---|---|---|---|---|---|
| `frameSize` | Frame size | int px | 240..2560 | 40 | 320 | A | always |
| `detail` | Detail | float, `scale:'log'` | 0.25..32 | 0.25 | 1 | A | always |
| `reach` | Reach | enum Short / Relaxed / Full | - | - | Relaxed | A | always |
| `normals` | Normals | enum Screen / 3-tap / 4-tap / Depth | - | - | 4-tap | A | always |
| `depthNormalRadius` | Depth normal radius | enum 1 / 2 / 3 px | - | - | 1 | A | `condition: { param:'normals', eq: 3 }` |
| `hitLanding` | Hit landing | boolean | - | - | false | A | always |
| `accumulate` | Accumulate | boolean | - | - | true | A | always |
| `actualPixels` | Actual pixels | boolean | - | - | false | A | needs module package M1; left out until then |
| `precision` | Precision | enum Auto / Deep / f32 | - | - | Auto | O | `isAdvanced` |
| `bla` | BLA | enum Off / Auto / On | - | - | Auto | O, C on "On" | `isAdvanced` |
| `stepSize` | Step size | float x | 0.85..2 | 0.05 | 0.85 | A | `isAdvanced` |
| `resolutionCap` | Resolution cap | int x | 1..8 | 1 | 1 | A | `isAdvanced` |

### dzLight (panel Light) - all A

**This is what lights the picture until stage L lands (L5).** At L5 `lightType`, `lampFalloff`,
`keyElevation`, `keyTurn` and `lightTint` move into the shared light list (section 1, Light Studio
row) through one migration; every other row stays. So the shell stamps a scene version from its
first saved file (stage 3).

| key | label | type | range | step | default | shown |
|---|---|---|---|---|---|---|
| `shading` | Shading | enum Classic / New | - | - | New | always |
| `lightType` | Light type | enum Direct / Lamp / Both | - | - | Direct | shading = Classic |
| `lampFalloff` | Lamp falloff | float | 0.5..32 | 0.5 | 4 | shading = Classic |
| `keyElevation` | Key elevation | float deg | 5..85 | 1 | 40 | shading = New |
| `keyTurn` | Key turn | float deg | -180..180 | 5 | 0 | shading = New |
| `lightTint` | Light tint | float | 0..1 | 0.05 | 0.5 | shading = New |
| `shadows` | Shadows | float | 0..1 | 0.05 | 1 | shading = New |
| `occlusion` | Occlusion | float | 0..2 | 0.05 | 1 | shading = New |
| `sky` | Sky | float | 0..2 | 0.05 | 0.3 | shading = New |
| `roughness` | Roughness | float | 0.1..1 | 0.05 | 0.75 | shading = New |
| `haze` | Haze | float | 0..1 | 0.05 | 0 | shading = New |

**"Shown" as built (S2-2, read from the shading shader; it wins over the column above):** the New
shading reads the light type too, so `lightType` is always shown, `lampFalloff` when the type is
Lamp or Both, and `keyElevation` / `keyTurn` / `lightTint` / `shadows` only when shading is New and
the type is not Lamp.

Eleven params. Seventeen more look fields exist with defaults but **no range anywhere in the page**
[params 2.2 rows 37-48, 51-53]: exposure 1, saturation 1, occlusion radius 0.12, shadow softness 0.05, shadow length 0.6, haze colour, key 3.0,
fill 0.5, kicker 0.25, fill colour, kicker colour, metallic 0.2, reflectivity 0.6, diffuse 1.0, key
azimuth 152, fill azimuth -40, fill elevation 21. They become `isAdvanced` params of `dzLight` only
after someone reads the shading pass and sets a safe range for each; shipping a slider with a
guessed range breaks "never a control the core cannot honour" (INTERFACE principle 12).

### dzColour (panel Colour) - all A
**As built (S2-2, 2026-10-08, under DECISIONS K8 - this table replaces the first version's index
enum Plain / Iteration / Orbit trap):**

| key | label | type | range | step | default | shown |
|---|---|---|---|---|---|---|
| `plain` | Colour: Plain / Palette | boolean | - | - | true (Plain) | always |
| `mode` | Mapping | float storing **GMT's mode number**, explicit option values as GMT's own `ColoringFeature.mode`: Orbit trap = 0, Iterations = 1 | - | - | 0 | see `features/colour.ts` |
| `scale` | Scale | float (GMT's name; the module's range and units) | 0.1..16 | 0.1 | 1 | see `features/colour.ts` |
| `useGradient` | Gradient | boolean | - | - | false | stage 5 |
| `gradient` | Gradient | gradient (`GradientConfig`, `colorSpace:'srgb'`) | - | - | a built-in ramp | stage 5, `useGradient` true |

Why `plain` is its own key: the module's Plain is a constant colour, not a mapping, and GMT's
number 0 is Orbit Trap (its default). Storing Plain as 0 would make GMT's most common number mean
"no colouring" here. Module mode 2 (orbit trap) is GMT 0 and module mode 1 (iteration) is GMT 1;
GMT's 5, 7, 8 and 13 are reserved until the module can draw them. `offset` and `bias` are reserved
names: the module has no input for them yet. **Known gap:** the module's orbit-trap value is -7.5
times GMT's (`1.5 * log(t)` against `-0.2 * log(t)`), so the same `scale` does not yet draw the
same picture as in GMT. The stage-5 module adapter closes it; scenes saved before it are migrated
by the scene version stamp (`ORBIT_TRAP_GMT_SCALE_RATIO` in `features/colour.ts`). The kernel
already returns the trap as a length (`sqrt(trap)`), not squared as GMT-SYSTEMS 2.3 says.

Setting a gradient while Plain also writes `plain: false`, in the same store write, so the
shell does openly what the page does behind its back [params 4.3].

**Light and Colour act in deep mode only.** The f32 path (precision Auto above 1e-4, or f32, or
while the deep shader compiles) has no light, look or colour input, so at boot both tabs change no
pixel. The tabs say so while `telemetry().mode` is `f32` (stage 2).

### dzInspect (collapsible in Quality) - session-only
| key | label | type | default |
|---|---|---|---|
| `channel` | Channel | enum Picture / Normals / Depth / Occlusion / Light (page values 0,2,3,4,5) | Picture |
| `compare` | Compare | enum Off / Normals / Landing | Off |
| `overlays` | Overlays | enum All / Depth only / None, `userScoped: true` | All |

`channel` and `compare` must not come back from a scene file. The engine has no "do not save" flag
(ENGINE-GAPS E13). Interim: a preset field with no `serialize` output whose `deserialize` sets both
back to default; preset fields run after every feature setter [scene 1.1].

### dzFlight (panel Flight)
| key | label | type | range | step | default | note |
|---|---|---|---|---|---|---|
| `flySpeed` | Fly speed | float, `scale:'log'`, shown as a number | 0.01..8 (DECISIONS K4) | - | 3.6 | times the surface distance per second. core.js: `speed = smoothedDist * cam.baseSpeed * boost * dt * 60` with `baseSpeed: 0.06`, so the module's own default is 3.6. Before N5 the host writes `api.cam.baseSpeed = flySpeed / 60` (replaced by a setter in M1); from N5 it is the speed the shell passes to the shared integrator. GMT's own range and default stay |
| `keyframeSpacing` | Keyframe spacing | float x | 0.3..5 | 0.1 | 1.5 | applies to the page's recorder |

### camera (no tab; one row in Flight)
| key | label | type | range | default |
|---|---|---|---|---|
| `u` | Flight position | float | 0..1 | 0 |

Total 38 params ready to build (formula 5, quality 12, light 11, colour 4, inspect 3, flight 2,
camera 1), 17 waiting on ranges.

**Not features** - test and measurement levers [params 3]: accuracy gate, march internals, BLA
tolerance, the four guide values, bisection caps, normal-tap cap, force rebuild, frame divisor, the
compare divider. They appear only in a `Diagnostics` panel with `showIf: 'advancedMode'` (the engine's
own switch; `engine/PanelManifest.ts` names that key in its `showIf` notes) whose one widget talks
to the host. See DECISIONS D7.

---

## 4. Panel manifest

```ts
// deep-zoom/panels.ts
export const DeepZoomPanels: PanelManifest = [
  { id: 'Locations', dock: 'left', order: 0, active: true, items: [
      { type: 'section', label: 'Starter dives' },
      { type: 'widget', id: 'dz-starters' },
      { type: 'section', label: 'My locations' },
      { type: 'widget', id: 'dz-locations' },          // wraps the engine's <StateLibraryPanel>
      { type: 'separator' },
      { type: 'widget', id: 'dz-location-text' },      // Copy location / Paste location / Copy link
  ] },
  { id: 'Formula', dock: 'left', order: 1, items: [
      { type: 'feature', id: 'dzFormula', whitelistParams: ['power', 'phaseTheta', 'phasePhi'] },
      { type: 'section', label: 'Iterations' },
      { type: 'widget', id: 'dz-iteration-readout' },  // live count from telemetry beside the floor
      { type: 'feature', id: 'dzFormula', whitelistParams: ['iterations', 'autoIterations'] },
  ] },
  { id: 'Flight', dock: 'left', order: 2, items: [
      { type: 'widget', id: 'dz-flight-strip' },       // the flight cockpit: section 8
      { type: 'feature', id: 'camera', whitelistParams: ['u'] },
      { type: 'feature', id: 'dzFlight' },
      { type: 'section', label: 'Still' },
      { type: 'widget', id: 'dz-still-export' },       // long edge, samples, Export
  ] },
  { id: 'Light', dock: 'right', order: 0, active: true, features: ['dzLight'] },
  { id: 'Colour', dock: 'right', order: 1, features: ['dzColour'] },
  { id: 'Quality', dock: 'right', order: 2, items: [
      { type: 'widget', id: 'dz-frame-readout' },      // drawn size and cap: "1280 x 720 of 2560 asked"
      { type: 'feature', id: 'dzQuality' },
      { type: 'collapsible', label: 'Inspect', defaultOpen: false, items: [
          { type: 'feature', id: 'dzInspect' } ] },
  ] },
  { id: 'Diagnostics', dock: 'right', order: 80, showIf: 'advancedMode', items: [
      { type: 'widget', id: 'dz-diagnostics' } ] },
];
```

Left dock = where am I and where am I going; right dock = how it looks. No `component: 'panel-X'`
of our own. `favientsPanelEntry` is the engine's shared My Gradients panel, used as fluid-toy uses
it [palette 1.4]; it returns `component: 'panel-favients'` itself - the engine's entry, not ours.
A tab appears in the stage that gives it a working row: Formula, Light, Colour, Quality in stage 2,
Locations in stage 3, Flight in stage 6a. Panels are dock tabs: they move between dock and float by drag and there is no
backdrop to click [conv 1.2].

---

## 5. Custom widgets that remain, and where each is registered

The engine has nothing for these. Each is a registered component; nothing is mounted by hand in
`DeepZoomApp.tsx` except the surface and the engine hosts.

| Widget | Registry and id | What it shows | From last week |
|---|---|---|---|
| Depth readout | `hud.register` `deep-zoom.depth`, top-left | `6.40e-53`, "24.2 decades to the 1e-77 floor", magnification `10^52.2`, `falling 1.4 decades/s` (or `rising`), the yardstick line, `Diving · 3.1e-12 to 1e-30` during a dive, the "Dive to 1e-" field - every line last week's gauge had | top block of `ui/DepthGauge.tsx` |
| Depth scale | `componentRegistry` `overlay-depth-scale`, mounted through `camera` feature's `viewportConfig: { componentId, type:'dom' }` | the 56 px log column 1e0..1e-77, live marker, fainter below 1e-50, amber for the last 3 decades, location marks, the flight's span; click = dive to that depth | the column of `ui/DepthGauge.tsx` |
| Status chip | `topbar.register` `deep-zoom.status`, center | state (FLY / DIVE / REC + clock / PLAY / RENDER), engine badge (`f32` or `perturbation`), compact depth, live iterations `it 136`, drawn size `1280 x 720`, still progress `23/64` - always visible, whichever dock tab is open | middle of `ui/TopBar.tsx` |
| Render progress | `hud.register` `deep-zoom.progress`, top-center | `frame 212/300` + Cancel | `DeepZoomApp.tsx` progress scrape |
| Starter dives | `componentRegistry` `dz-starters` | six cards: name + target depth | `ui/LocationsPanel.tsx`, data `ui/starters.ts` |
| Locations list | `componentRegistry` `dz-locations` | the engine's `<StateLibraryPanel>` in a thin shell, as fluid-toy's `ViewLibraryPanel.tsx`, passing `sortBy` (shallow to deep, rows with no depth last) and `renderMeta` (the depth, `6.40e-53`, under the name) - both new optional props on the master panel (E38), so a renamed row still shows its depth | replaces the hand-built list |
| Location text | `componentRegistry` `dz-location-text` | Copy location (JSON), Paste location (accepts the new shape, last week's flat shape, a bare view, or an array), Copy link, Export all (JSON, thumbnails left out) | bottom of `ui/LocationsPanel.tsx` |
| Flight strip | `componentRegistry` `dz-flight-strip` | the flight cockpit (section 8): Record, Smooth, Preview; the depth curve as a scrubber bound both ways to `camera.u`; the playhead line with time, frame and depth; Go to start, Go to deepest; length in seconds or m:ss; fps; decades per second at the playhead; the estimate; Render | top half of `ui/RecordPanel.tsx` |
| Still export | `componentRegistry` `dz-still-export` | long edge, samples, Export, measured time | part of `ui/RecordPanel.tsx` |
| Iteration readout | `componentRegistry` `dz-iteration-readout` | "live 136" from telemetry | new (the `iteration-readout` pattern in fluid-toy) |
| Frame readout | `componentRegistry` `dz-frame-readout` | drawn size against asked size | new |
| Diagnostics | `componentRegistry` `dz-diagnostics` | the developer levers, host calls only, no store state | the page's dev rows |
| Tutorial step bodies | `stepRenderers.register` kinds `dz-dive`, `dz-record-dive` | the "Dive to 1e-12" and "Record a dive to 1e-30" buttons | `ui/Onboarding.tsx` |
| Loading / failed-to-start card | one component inside `ViewportFrame`, `<Layer tier="shellLoading">` | slim line "deep shader compiling" over the live picture; readable error | `DeepZoomApp.tsx` cards |

Depth is on screen twice on purpose: the HUD readout is the instrument, the top-bar chip keeps the
number visible when overlays are set to None. That is how "depth always on screen" survives a
hide-overlays key.

Depth milestones (last week's `MILESTONES` in `ui/DepthGauge.tsx`: a line the first time a depth is
crossed) are kept as `showToast` calls from `deep-zoom/milestones.ts`, driven by the telemetry store.

Stacking: HUD is tier `shellHud` (10), the scale `shellViewportOverlay` (20), loading `shellLoading`
(100), toasts `shellToast` [keys 1.4]. No raw z-index in the shell.

---

## 6. What a scene file holds; locations

Plain JSON through SceneIO's default serializer, extension `json`; a saved PNG embeds the same text
in an iTXt chunk [scene 1.2].

```jsonc
{
  "version": 1, "name": "seahorse-e40", "formula": "mandelbulb-deepzoom",
  "features": { "dzFormula": {}, "dzQuality": {}, "dzLight": {}, "dzColour": {}, "dzFlight": {}, "camera": { "u": 0 } },
  "animations": [], "sequence": { },
  "dzView":   { "v": 1, "cam": ["<decimal string>", "<...>", "<...>"], "yaw": 1.2, "pitch": -0.3, "depth": "3.1e-41" },
  "documents": {
    "deep-zoom.path":      { "format": "gmt-mbulb-path", "P": 256, "fovScale": 1.1, "frames": [ ] },
    "deep-zoom.locations": [ { "id": "...", "label": "6.40e-53", "thumbnail": "data:image/jpeg...", "createdAt": 0, "state": { } } ],
    "favients": { }, "stops": { }, "generator": { }, "image": { }
  }
}
```

- `formula` is a fixed non-empty string: share decoding returns null without one [scene 1.8].
- Camera numbers are **decimal strings and never pass through `Number()`**. Depth is a string too:
  the share encoder zeroes numbers under 1e-9 [scene 1.8].
- `documents` is the engine's document registry (section 1). The last four keys are the palette
  UI's own providers (`palette/registerPaletteUI.ts`), which land in every save of any shell that
  calls `registerPaletteUI()` (ENGINE-GAPS E29).
- One preset field and two document providers. `deep-zoom/presetFields.ts` imports only
  `presetFieldRegistry` and the host holder and is imported right after `./registerFeatures` (the
  registry freezes when the store is built) [scene 1.1]; `deep-zoom/documents.ts` holds the providers:
  - `dzView` - `serialize` reads the host, so flight never writes the store; `deserialize` calls
    `host.setView`, or parks the view in a one-slot "pending view" that the host applies when ready.
  - document `deep-zoom.path` - serializes the store field `dzPath`, the recorded flight. (The field is not named `dzFlight`: that is the feature id, and a feature slice lives at `store[id]`.)
  - document `deep-zoom.locations` - serializes `savedLocations`; rows validated on restore (`cam` is three strings); `activeLocationId: null`.
- A scene load clears param undo (engine behaviour) [scene 1.7].

**A location** = `StateSnapshot<DzLocationState>` with
`state = { view: DzView, look: <the dzFormula/dzLight/dzColour/dzQuality.detail values>, depth: string, note? }`,
a 128 px JPEG thumbnail from `host.thumbnail(128)` (last week's PNG thumbs are what hit the storage
quota) [scene 2.3]. Default label is the depth with its mantissa, e.g. `6.40e-53` (last week:
`'View ' + formatDepth(depth)`), and the depth stays on the row after a rename (`renderMeta`).

**Jumping is one undo step.** `jumpTo(loc, { keepLook })` opens a param transaction, bumps a jump
counter, applies the look through the feature setters (skipped with `keepLook`, last week's
`goTo(b, view, keepLook)`: the current light and colour stay), calls `host.setView`, closes the
transaction. The `dzView`
history provider has `changeOf: seq`, so flying never makes an undo entry and a jump always does,
with the exact strings stored [scene 2.5]. Used by: pick a location, a slot key, Home, Back, a
starter dive's start, paste, a dropped path's first frame. This is "nothing is lost" from INTERFACE.

**Exact saved locations** survive in four carriers: the scene file, the PNG, Copy location (JSON
text), and a share link (`getShareString` keeps strings verbatim; the link carries the view and the
look, and never the locations or the flight, because documents are not part of a share string)
[scene 1.8, 2.8]. Pasted text in last week's shape still opens: those texts have already been shared. A share link is new -
INTERFACE listed it as not possible.

**Across reloads.** The library must still be there tomorrow. The state library has no persistence
of its own and Session is opt-in and deletes on off [scene 1.4, 1.5]. Target: the state library
gains a `persist` option (ENGINE-GAPS E10). Interim: a 30-line mirror of `savedLocations` to
`localStorage['gmt.deepZoom.locations']` with the strip-thumbnails-on-quota fallback. Last week's
`gmt.deepzoom.bookmarks.v1` rows are imported once at boot, then the key is removed.

---

## 7. Host interface - one implementation, over the module instance

The host interface keeps its one job: **the shell never touches the renderer's internals.** The
shell imports `DeepZoomHost` (types) and the holder and nothing else. `deep-zoom/renderer` is
imported only by files under `deep-zoom/host/`; `createDeepZoom`, `instance.api` and `api.dz`
appear only there. A check script greps for it. There is one implementation and no switch between
two.

`deep-zoom/host/DeepZoomHost.ts` is the interface in [host 2.2]: types only, **zero imports**, no
window or document type (`HTMLCanvasElement` in `canvas()` and `Blob` are the two DOM types it
names). Members in groups: `ready`; `setParam / setParams / getParams / bootParams`;
`telemetry / onTelemetry`; `getView / setView / setPendingView / moveAlong / diveTo / thumbnail`;
`setGradientRamp`; `setRecording / takePath / smoothPath / seekPath / play / stopPlay`;
`renderFramePixels / renderFrameBlob / exportStill / cancel`; `canvas / focus / isCaptured /
setInputEnabled / pause`; `step(now) / frameCount() / dispose`; `on(type, fn)` for `paramChanged`,
`recordingChanged`, `compile`, `progress`, `captureChanged`, `contextLost`, `error`.
Gone since the first version: `setHotkeys` and `onKey` (the module's shortcuts are off at create
and there is one document, so no key crosses a boundary). Added at N4: `setInputOwner('module' | 'host')`
and `rawDistance()`. `isCaptured()` and `captureChanged` go at N5.
The host never downloads and never opens a dialog; the shell saves blobs. One exception, kept on
purpose: the path render's ZIP parts are downloaded by the module itself (`core.js`
`dlBlob(makeZip(...))`, which has no `EMBED` test today), and M6 leaves that one call in place
because stage 6a's ZIP route is built on it (section 8, item 4).
`frameCount()` is `instance.frameCount`, there so the stage-1 smoke can see the tick drive the
module. Until `host/looseParams.ts` lands in stage 2, `getParams()` returns `api.dz.settings()` unmapped.

### The one implementation: `deep-zoom/host/moduleHost.ts`

Two exports, so the adapter can be checked in node with a fake instance:

- `createModuleHost(instance: DeepZoomInstance, canvas): DeepZoomHost` - pure adapter over
  `instance.api`, `instance.api.dz`, `instance.step`, `instance.dispose`. View `cam` strings pass
  through verbatim, never through `Number()` (index.ts header: "Never parse them to numbers").
- `mountDeepZoom(frame: HTMLElement, hooks): DeepZoomHost` - the DOM half:
  1. `const canvas = document.createElement('canvas')`, id `dz-render-canvas`, appended to `frame`.
     Never a JSX `<canvas ref>`: that node is the same across StrictMode's mount, unmount, mount,
     and the second create would get the same context holding two sets of programs (header,
     REMOUNTING).
  2. `createDeepZoom(canvas, shellOptions(frame, hooks))` - the table below.
  3. returns `createModuleHost(...)`; its `dispose()` calls `instance.dispose()` and then
     `canvas.remove()`.

| Option (`core.d.ts` `DeepZoomCoreOptions`) | The shell passes | Why (index.ts header, PITFALLS) |
|---|---|---|
| `embed` | `true` (the default) | the module's own panels never open; stopping a recording keeps the path in memory |
| `autoStart` | `false` | the engine tick calls `step`; the module never calls requestAnimationFrame for its frame |
| `keyTarget` | `frame`: the shell's own `<div id="dz-frame" tabIndex={0}>`, rendered by `DeepZoomSurface` inside `<ViewportFrame>` (see the paragraph on `frame` below the mount effect) | keys reach the module only while the picture has focus; held fly keys are released when it, or the window, loses focus. The default is `window`, where typing in a shell field flies the camera |
| `shortcuts` | `false` | the engine dispatcher owns every one-shot key |
| `dropTarget` | `null` | the engine's `<SceneFileDropZone/>` owns drops; a gradient image goes through `api.loadGradient(file)` (stage 5) |
| `pointerLock` | `false` | no click listener in the module. Before N5 the shell calls `canvas.requestPointerLock()` on a click on the picture; from N5 nothing does |
| `resetStillOnResize` | `true` | a dock resize restarts the still instead of leaving a half-converged picture of the old size |
| `loseContextOnDispose` | `true` | a remount frees every program and texture; each mount gets a fresh canvas |
| `sizeElement`, `scaffoldParent` | `frame` (also the default: the canvas's parent) | the frame must not shrink-wrap the canvas (the 1:1 view writes an inline width and height on it) and must not be 0 x 0 at mount (that renders 2 x 2) |
| `onNotice` | `showToast` | where the page's `alert(...)` texts go |
| `onContextLost` | host event `contextLost` | nothing is restored: the surface bumps a React key, disposes, mounts fresh |
| `publishOnWindow` | `false` (the default) | nothing on `window` |

### Boot

`deep-zoom/DeepZoomSurface.tsx` is the one component that calls `mountDeepZoom`. In one effect:
mount -> put the host in the holder -> `registerTick('deepZoom.step', phase, () => host.step(performance.now()))`.
Cleanup, in reverse: unregister the tick, clear the holder, `host.dispose()`.

**`frame` is a div the shell renders, not the engine's frame element.** `ViewportFrame`
(`engine/plugins/viewport/ViewportFrame.tsx`) keeps its outer div in a private `outerRef`, forwards
no ref and takes no `tabIndex` or `id` (`ViewportFrameProps`). So `DeepZoomSurface` returns
`<div id="dz-frame" tabIndex={0} className="absolute inset-0">` as a child of
`<ViewportFrame showModeControls={false}>`, and that div is `frame` everywhere in this plan: key
target, size element, scaffold parent and the canvas's parent. `showModeControls` is off because it
defaults to true, and in Fixed mode the inner div is a fixed width and height under a CSS scale,
which the module would read as its size; Fixed mode is declined until E4 (section 1, Viewport row).
Wherever this document says "the viewport frame element" for the key target, it means `#dz-frame`.

- `createDeepZoom` throws `Error('WebGL2 unavailable')` (index.ts): caught, shown by `BootCard`.
- The three small programs compile inside the create call; the deep shader compiles in the
  background, about 15 s cold, and `api.dz.telemetry().ready` turns true when it lands; without
  `KHR_parallel_shader_compile` the create call itself blocks for that long (header, BLOCKING
  COMPILES). So the splash is in the HTML, not in React, and comes off on the first picture.
- `api.setBla(true)` blocks on a compile. The host's BLA setter only ever sends `'auto'` or
  `false`; for "on" it sends `'auto'`, waits for `api.compileMs().PB`, then sends `true`.
- **Tick phase, not settled here.** `TICK_PHASE` is `SNAPSHOT 0, ANIMATE 1, OVERLAY 2, UI 3`
  (`engine/TickRegistry.ts`). The first version said SNAPSHOT [host 2.5]. The frame must be drawn
  after the timeline has written `camera.u` for that frame, or a scrubbed frame is one tick
  behind. Which phase the animation engine writes in was not opened in this pass; package S1-2
  reads it before choosing, and stage 6a's smoke step "the strip's playhead depth equals the drawn
  depth" is what goes red if it is wrong.
- With `autoStart: false` only the frame loop is host-driven. Path preview, the export's frame
  waits and `api.dz.diveTo` still tick on the browser's requestAnimationFrame (header). Module
  package M4 moves the render path onto `step`.
- StrictMode mounts twice in dev: two creates, the first disposed with its context lost. Whether
  that restarts the 15 s deep compile is not measured; it is a dev-only cost.

### What each host member rides on in stage 1, and the module package that replaces it

Every name in the middle column is an `api.*` assignment that exists in core.js today (grep
`api.<name> = `). Signatures beyond those typed in index.ts are unread and are the package's first job.

| Host member | Route in stage 1 | Replaced by |
|---|---|---|
| `telemetry`, `onTelemetry` | `api.dz.telemetry()` read from the tick at 8 Hz | events, M3 |
| `getView`, `setView`, `thumbnail` | `api.dz.getView / setView / thumbnail` | - |
| `moveAlong` | `api.moveAlong` | typed as product API in N4 |
| `diveTo` | `host/dive.ts`: last week's loop over `api.moveAlong` (the page's own dive overshot [host 1.1]; whether `api.dz.diveTo` still does is unverified) | - |
| `setParam(s)`, `getParams`, `bootParams` | `host/looseParams.ts`: one table, param id -> `api.setLook`, `setReach`, `setSurf`, `setColor`, `setAccum`, `setBla`, `setFrame`, `setPower`, `setPhase`, `setLand`, `setNormalMode`, `setLight`; read-back through `api.dz.settings()` and `api.look` | params by id, M1 |
| `setGradientRamp` | a 256 x 1 PNG through `api.loadGradient(file)` | texels in, M2 |
| recording and path | `api.recordToggle`, `api.lastPath`, `api.smoothPath`, `api.samplePath`, `api.playPath`, `api.stopPlay` | seek by arc, M4 |
| still and frames | `api.export`, `api.renderPath`, `api.cancelRender` | render one frame to memory, M4 |
| `isCaptured` | `document.pointerLockElement === canvas` | removed at N5 |
| `setInputEnabled` | `api.lockInput(...)` plus `document.exitPointerLock()` (the lock is not released by `lockInput`, header) | `setInputOwner`, N4 |
| `pause` | none | M5 |

One mapping table, `deep-zoom/host/paramMap.ts`: DDFS `feature.param` -> renderer `DzParamId`, with
the enum `fromIndex` and the invalidation class. `deep-zoom/useHostSync.ts` has one subscription per
feature; it pushes only keys that differ from the last push (the feature setter has no equality gate
[ddfs 1.5]) and debounces O-class keys while a slider is held.

### Editing the module

`core.js` is edited directly from now on (DECISIONS K2). Every edit meant to leave the picture
unchanged is guarded by the two proofs: `debug/smoke-deep-zoom-parity.mts` (47 lines, against the
page at 3b65946, real GPU) and `debug/deep-zoom-direct-check.mts` (11 lines). The frozen page is
never edited. `core.d.ts` and the types in `index.ts` change in the same package as `core.js`.

---

## 8. The timeline track for a dive, and the render path

- The exact views stay in `dzPath` (256-bit strings). The timeline carries **one float**:
  `camera.u`, 0..1 = fraction of the flight's arc length. The engine's two-word scheme stops near
  1e-32 [timeline 1.5]; a side table is the only shape that reaches 1e-77.
- Why the feature id is `camera`: the track lands in the timeline's Camera group and is skipped while
  recording the camera; both rules are keyed on the `camera.` prefix. Any other id is filed under
  "Shading" [timeline 1.3, 1.7]. See DECISIONS D5.
- A plain store subscription on `camera.u` (not a React effect) calls `host.seekPath(flight, u)`
  when `u` differs from the last value pushed. Slider, timeline and undo share that path [timeline 2.1].
- **Record -> smooth -> preview -> render, in one place: the Flight strip.** The timeline is a
  second view of the same number, not a required stop. Last week the two-click flow was "Record a
  dive", then Render; it stays two clicks.
  1. Record: `host.setRecording(true)`; flying or a dive records. Stop: `host.takePath()`,
     `host.smoothPath(p)` (returns a new path), store it as `dzPath`, set the timeline length to
     `round(seconds x fps)` and write two Bezier keys `camera.u` 0 -> 1, all in one undo snapshot
     [timeline 2.3]. **Default curve: a straight line with a short ease at each end** (flat handles
     one tenth of the span long). The page measures arc length as depth-relative distance plus turn
     (`pathArc`), so equal steps of `u` are equal steps of zoom: the body of the flight runs at a
     constant number of decades per second, which is what a zoom video is judged on. The user
     reshapes it in the graph editor. **The page's own `easeInOut` is off whenever the shell drives
     `u`** - the page applies it in its preview and its path render, and applying both would ease
     twice.
  2. Preview: play the timeline. Space plays. Scrubbing is exact once the module has `seekPath` (M4);
     until then `__samplePath` by time - fine to look at, not frame-matched to a render [host 2.3].
  3. Render (stage 6b): the strip's Render button opens the engine's RenderDialog through
     `openRenderPopup()` (gap E22, required for this, not optional). The runner per frame:
     `animationEngine.scrub(frame)` -> `host.renderFrameBlob({ path, u, longEdge, samples })` ->
     encode. MP4 / WebM come from the engine's encoder [timeline 1.10]. Needs M4.
  4. Lossless frames (stage 6a, no module package needed): the strip's `Render PNG sequence (ZIP)`
     runs the module's own path render (the module downloads the ZIP parts itself - `core.js`
     `dlBlob(makeZip(...))`, the one download M6 leaves in place), with last week's cancel confirm
     ("the finished frames are saved as a partial ZIP") and the ffmpeg line with Copy. PNG frames
     are the master for a zoom video; MP4 from the dialog is the convenience. Until M4 this route
     uses the module's own smooth-step timing, not the timeline curve, and the strip says so in one line.
- Seconds and fps in, frames out; the estimate comes from frames this machine rendered
  (`status.setLastFrameTime`) - INTERFACE principles 9 and 11. It is shown **before** the render, in
  the strip and again in the dialog (`extraInfoRows`).
- What the strip shows, all of it ported from the top half of last week's `ui/RecordPanel.tsx`:
  the depth curve as a scrubber bound both ways to `camera.u` (Left / Right step a frame, Shift =
  1 s); the playhead line `t 4.2 s / 10.0 s · frame 126/300 · 6.40e-53`; Go to start, Go to deepest;
  length typed as seconds or m:ss (writes the timeline length and rescales the keys); fps 24 / 30 /
  60; **decades per second read from the key curve at the playhead**, not total decades over total
  seconds; the estimate. In the dialog the size is a preset list at the surface's aspect (720 / 1080
  / 1440 / 2160 long edge), so a mismatched width and height cannot be typed by accident.
- Key Cam (`registerCameraKeyTracks(['camera.u'])`) keys the current `u`: a retiming key [timeline 2.4].

---

## 9. Keys

Rule: every one-shot key is an engine shortcut that writes a DDFS param or calls the host
[keys 2.1]. **The module's own shortcuts are off** (`shortcuts: false`); the engine dispatcher owns
the keys. core.js, the `keydown` listener on `dzKeyTarget`: `keys[e.code]=true; if (!dzShortcuts) return;`.

**Until stage N lands (N5), the module still reads these, from one key target: the viewport frame
element** (`keyTarget`), and only while that element has focus:

| Code | Does (core.js) |
|---|---|
| `KeyW` `KeyS` | forward / back along the view (`mv(fwd, ...)`) |
| `KeyD` `KeyA` | strafe (`mv(right, ...)`) |
| `KeyE` `KeyQ` | up / down along world Y (`mv([0,1,0], ...)`) |
| `ShiftLeft` `ShiftRight` | 4 times the speed (`boost`) |
| `Escape` | cancels a dive in flight (the `cancelled` test beside `isFlying()`) |

Mouse look before N5 needs the pointer captured (`mousemove` acts only when
`document.pointerLockElement === canvas`). The module is created with `pointerLock: false`, so the
shell asks for the capture on a click on the picture and the browser's own `Esc` gives it back.
The engine dispatcher on `window` sees the same key events, so before N5 none of the six letter
codes is an engine shortcut in this shell. `Escape` is both on purpose: the engine's
`deep-zoom.cancel` acts on it, and the module's own test only stops the module's own dive, which
the shell does not use (`host/dive.ts`). Known wart: the module checks no modifier, so `Alt+S`
(SceneIO's quick PNG) pressed with focus in the picture also flies backwards while held. Module
package M6 makes the fly keys ignore events with Ctrl, Alt or Meta down.

**From N5 the module reads no key and no mouse** (`setInputOwner('host')`). GMT's input hook
listens on the same frame element: `W/S`, `A/D`, `Space/C` up and down along the camera's own up,
`Shift` 4x, left-drag look, wheel = fly speed in proportional steps, `Q/E` unbound while roll is
off [gmt 3.1]. Nothing captures the mouse.

The table below is the engine's side and holds from stage 4. Rows that say "mouse captured" hold
until N5 and are re-decided there (end of this section).

| Key | id | Does |
|---|---|---|
| `B` (+ `Shift+B`) | `deep-zoom.save-location` | save this view to My locations |
| `1`..`9` / `Mod+1`..`9` | the state library's own, `when`: mouse free and not recording | recall / save location slot |
| `9` / `0` | `deep-zoom.scale-down/up`, `when`: mouse captured, `priority: 10` | palette scale /1.25, x1.25 |
| `T` / `Y` | `deep-zoom.falloff-down/up`, `when`: mouse captured, `priority: 10` | lamp falloff -0.5 / +0.5 |
| `Home` | `deep-zoom.home` | jump to the home view |
| `Backspace` | `deep-zoom.back` | undo the last jump |
| `J` | `deep-zoom.dive` | focus the "Dive to 1e-" field |
| `M` (+ `Shift+M`) | `deep-zoom.record` | record on / off |
| `X` | `deep-zoom.export-still` | export a still |
| `F` / `G` | `deep-zoom.detail-down/up` | detail /1.5, x1.5, inside 0.25..32 |
| `[` / `]` | `deep-zoom.iters-down/up` | iterations -1 / +1 |
| `I` | `deep-zoom.auto-iters` | auto iterations on / off |
| `-` / `=` | `deep-zoom.power-down/up` | power -1 / +1 |
| `C` | `deep-zoom.colour-mode` | next colour mode |
| `L` | `deep-zoom.light-type` | next light type |
| `O` | `deep-zoom.overlays` | overlays: All, Depth only, None |
| `/` and `?` | `deep-zoom.help` | open Help at Keyboard Shortcuts |
| `H` | Help's own | hints on / off |
| `Mod+Z`, `Mod+Y`, `Mod+Shift+Z` | Undo's own | undo / redo |
| `Alt+S` | SceneIO's own | quick PNG |
| `T`, `Space` | TimelineHost's own (`engine.timeline.toggle`, `engine.timeline.toggle-play`), mouse free only | timeline, play |
| `Escape` | `deep-zoom.cancel`, `when: busy` | cancel render / preview / dive |

`Shift` held for speed turns `B` into `Shift+B`, a different key to the dispatcher, so the two
flying-critical keys are registered twice [keys 2.3]. Keyboard capture is **not** switched on while
flying - it would silence `B` and `M` [keys 2.3].

**One rule while the mouse is captured: no key moves the camera except the fly keys, and the look
keys a deep zoomer tunes while moving keep working.** At 1e-50 the left hand sits on W A S D Q E;
a slip onto `1` must not teleport, and `Space` must not start the timeline and pull the camera
along the flight. So:
- Slot recall and save carry `when: mouse free and not recording` (gap E36).
- The timeline's `T` and `Space` are shadowed while captured. `components/TimelineHost.tsx` registers
  them itself; `Space` has `when: cameraMode !== 'Fly'` (one app's field) and `t` has no `when`.
  Interim, with engine means only: `deep-zoom/flyGuard.ts` registers the same keys at `priority: 10`
  with `when: captured` (the dispatcher's rule, `engine/plugins/Shortcuts.ts`: "Highest-index scope
  wins; priority breaks ties"). Engine fix: gap E37.
- `9` / `0` (palette scale) and `T` / `Y` (lamp falloff) keep their page meaning **while captured**
  and write the DDFS param. Colour scale has to change as you go down; a panel slider cannot be
  reached with the pointer locked.
- The smoke presses `1`, `Space` and `T` while captured and asserts the view strings are unchanged.

Dropped as keys, kept as panel rows: `N`, `P`, `R`, `V`, `,` `.` `;` `'`. Any of them can come back
under the same captured rule with one registration each (DECISIONS D3). `H` moving to `O` for
overlays is stated in What's New.

### What changes in this table at N5 (open: DECISIONS O4)

With GMT's drag-look there is no captured mouse, so every rule above that leans on it has to be
restated. Recommended, to be confirmed before N5 is written:

- `Space` and `C` become fly keys (GMT's up and down). The timeline's `Space` must not play while
  the picture has focus - gap E37's predicate, which stops being optional. `deep-zoom.colour-mode`
  loses `C`: another key, or the panel row only.
- `9` / `0` and `T` / `Y` lose their captured-only bindings and `deep-zoom/flyGuard.ts` is deleted:
  with the pointer free the Colour and Light panels can be reached while flying.
- Slot recall and save carry `when: no fly key is held and not recording`.
- `Q` / `E` do nothing (roll off, GMT-SYSTEMS decision 8.3, still open).
- The stage-4 smoke's captured steps are rewritten in the N5 smoke; none is removed without its
  replacement.

---

## 10. HUD, help, tutorial

- **HUD**: depth readout top-left; render progress top-center; key hint line bottom-left through
  `help.registerHudHint` (shown while hints are on). A HUD item that appears on a store flag
  subscribes inside its own component and returns null, because `HudHost` re-renders only on
  registry change [keys 4].
- **Overlay fade while flying**: widgets read `host.isCaptured()` through the telemetry store and
  drop to 35 percent opacity, as INTERFACE asks. That is the rule before N5. After N5 nothing
  captures the mouse and `isCaptured()` is gone, so "flying" is the input hook's activity edges
  (GMT-SYSTEMS 3.2 e, seam S7): N5 sets a `flying` flag in `host/telemetry.ts` from those edges and
  the widgets read that flag instead.
- **Help topics** (`deep-zoom/help/topics.ts`): `dz.getting-started`, `dz.shortcuts`, `dz.depth`
  (the number, the three honest lines 1e-4 / 1e-50 / 1e-77), `dz.locations`, `dz.video`,
  `dz.interop`, `dz.whats-new`. Categories must come from the closed list, so 'Getting Started',
  'General', 'Export', "What's New" [keys 1.6].
- **The shortcuts page is generated** from `shortcuts.list()` inside the topic loader, plus one
  hand-written table for the renderer-owned keys, so it cannot drift [keys 2.6].
- **Tutorial "First dive"** (lesson 1), dive-first: step 1 is one button, "Dive to 1e-12", or the
  visitor clicks the picture and flies; nothing blocks input. Steps and triggers as [keys 2.7]:
  start -> click -> look -> keys -> shift -> still -> tips -> "Record a dive to 1e-30" (added in
  stage 6a; it ends with the Flight tab active, so Render is one click away). The host
  fires `actionBus.fire('dz.captured' | 'dz.looked' | 'dz.dive.done' | 'dz.converged')`.
  At N5 `dz.captured` becomes `dz.flying`, fired on the hook's first activity edge, and the "click"
  step becomes "drag to look" (`tutorial/hostEvents.ts` and `tutorial/firstDive.ts`, owned by N5).
  The card is the engine's 360 px card, not last week's slim strip (ENGINE-GAPS E26, DECISIONS D9).
- **Honest numbers**: no dive target below 1e-77; nothing below 1e-50 is called certified; the
  starter card's "deeper than Mandelbulber and Mandelbulb 3D reach" line is removed - it is a claim
  with no source in the tree (INTERFACE says so) and labels carry names and numbers only.

---

## 11. File layout: the new shell, the module, the prototype moved aside

The new shell owns `deep-zoom/`, beside `fluid-toy/` and `gradient-explorer/` (DECISIONS K3).
`deep-zoom/renderer/` stays where it is.

```
deep-zoom.html                  NEW body under the same name: #dz-boot-splash, locked document, .mobile-scroll rules
deep-zoom/
  main.tsx                      NEW boot: registerFeatures -> presetFields -> installs -> setup -> render
  registerFeatures.ts           7 features, registerPaletteUI, send target, store-free widgets
  presetFields.ts               dzView, the dzInspect reset, the scene version stamp
  documents.ts                  document providers deep-zoom.path, deep-zoom.locations
  flyGuard.ts                   captured-mouse key guard (interim for E37; deleted at N5)
  locationParse.ts  share.ts  claims.ts  milestones.ts  flightMath.ts  zipRender.ts  renderPresets.ts
  storeTypes.ts                 SliceFromParams + the two declare-module blocks
  panels.ts   setup.ts
  DeepZoomApp.tsx               NEW: layout only, engine hosts + <DeepZoomSurface/>
  DeepZoomSurface.tsx           the one component that mounts the module and registers the tick
  useHostSync.ts                store -> host, one subscription per feature
  hotkeys.ts   locations.ts (installStateLibrary + jumpTo + history providers)
  flight.ts (record stop -> track, camera.u subscription, claims)   session.ts   exportRunner.ts
  navigation.ts                 N5: GMT's input hook + integrator on a tick, displacement sink
  lighting/  handoff.ts         L5: the deep view frame, pack + upload; lights crossing between the apps
  features/formula.ts quality.ts light.ts colour.ts inspect.ts flight.ts camera.ts
  host/DeepZoomHost.ts current.ts telemetry.ts paramMap.ts moduleHost.ts looseParams.ts dive.ts
  components/DepthReadout.tsx DepthScale.tsx StatusChip.tsx RenderProgress.tsx StarterDives.tsx
             LocationsPanel.tsx LocationText.tsx FlightStrip.tsx StillExport.tsx IterationReadout.tsx
             FrameReadout.tsx Diagnostics.tsx BootCard.tsx
  help/topics.ts installDeepZoomHelp.tsx
  tutorial/firstDive.ts steps.tsx
  data/starters.ts
  README.md
  renderer/                     STAYS: core.js (edited directly from now on), core.d.ts, index.ts, harness.ts, port/
deep-zoom-harness.html          STAYS: the dev harness the two renderer proofs load
docs/modules/deep-zoom/index.md
debug/smoke-deep-zoom.mts       NEW runner under the old name
debug/deep-zoom-smoke/stageN.mts   one file of steps per stage
debug/deep-zoom-checks/*.mts    per-package node checks (no browser)
```

### The prototype moves aside (package S1-A, before anything new is written)

Name: **`deep-zoom-prototype`**, dev-only (decided, DECISIONS K6, was O1). It stays
runnable, with its own smoke, until the new shell matches it; then stage 7 removes it.

| Today | Moves to | What else changes with it |
|---|---|---|
| `deep-zoom/main.tsx`, `DeepZoomApp.tsx`, `bridge.ts`, `store.ts`, `ui/*` (9 files) | `deep-zoom-prototype/`, same file names | relative imports only |
| `deep-zoom.html` | `deep-zoom-prototype.html` | its script `src` |
| `public/deep-zoom-core/` | `public/deep-zoom-prototype-core/` | `CORE_SRC` in the prototype's `DeepZoomApp.tsx` (`'./deep-zoom-core/index.html?embed=1'` today); the two messages in `bridge.ts` that name the folder; **`historicalPath()` in `debug/smoke-deep-zoom-parity.mts`**, which reads `public/deep-zoom-core/index.html` as the historical page and otherwise serves the pinned file from `debug/scratch/deep-zoom-pinned/` |
| `scripts/sync-deep-zoom-core.mjs` | `scripts/sync-deep-zoom-prototype-core.mjs` | npm script `sync:deep-zoom-core` -> `sync:deep-zoom-prototype-core`. Not run again: the page is frozen and the prototype keeps the copy it has |
| `debug/smoke-deep-zoom.mts` | `debug/smoke-deep-zoom-prototype.mts` | its `URL` (`ORIGIN + '/deep-zoom.html'` today); npm script `smoke:deep-zoom-prototype` |
| `knip.json` entry `deep-zoom/main.tsx` | one more entry, `deep-zoom-prototype/main.tsx` | - |
| `vite.config.ts` input `'deep-zoom'` | S1-A removes it, together with the `knip.json` entry `deep-zoom/main.tsx`, because both name files that do not exist between S1-A and S1-2 (the input resolves `deep-zoom.html`, so `npm run build` would have a missing input); S1-2 puts both back for the new shell. The prototype gets **no** build input: its smoke runs against the dev server (`ENGINE_URL`, default `http://localhost:3400`), which serves any root HTML file, so the prototype's shell page is never built. Its renderer copy is another matter: `public/deep-zoom-prototype-core/index.html` matches the workbox glob `**/*.{js,css,html}` (`vite.config.ts` `globPatterns`) exactly as `public/deep-zoom-core/index.html` does today, so it stays in the precache until stage 7 unless a size limit excludes it (not checked) | `public/deep-zoom-prototype-core/` is still copied into a build until stage 7 removes it |
| `tailwind.config.js` content glob `./deep-zoom/**` | one more glob, `./deep-zoom-prototype/**/*.{ts,tsx}` (found by S1-A, 2026-10-08: without it the moved prototype lost 63 selectors and its top bar could not be clicked). A running dev server does not pick up a changed Tailwind config: restart it | removed at stage 7 |
| `knip.json` | also gains the entry `deep-zoom/renderer/harness.ts` (only `deep-zoom-harness.html` loads it, and knip does not read that page). It stays | - |
| `launcher.html` link `deep-zoom.html` | stays, and now opens the new shell | - |
| `deep-zoom/renderer/index.ts` comment "Shapes copied from deep-zoom/bridge.ts" | points at the new path | comment only |

**Deleted at stage 7 (S7-1)**, when every step of the prototype's smoke has a matching step in the
new shell's smoke: `deep-zoom-prototype/**`, `deep-zoom-prototype.html`,
`public/deep-zoom-prototype-core/`, `scripts/sync-deep-zoom-prototype-core.mjs`,
`debug/smoke-deep-zoom-prototype.mts`, and their rows in `package.json` and `knip.json`. From then
on the parity smoke proves the module against the pinned file only, which needs the frozen repo on
disk (`DZ_SOURCE_REPO`, default `H:/GMT/workspace-gmt/mandelbulb_deepzoom`).

`deep-zoom/renderer/port/` (the script that made core.js): kept as the record of the port. The
index.ts header says `port.mjs --check` reports a hand edit; after the first direct edit of core.js
that check is red by design and is not a gate. `port.mjs` was not opened in this pass.

### What the new shell builds from each prototype file

Nothing is edited in place: each new file is written in `deep-zoom/` with the prototype file open
beside it.

| Prototype file (under `deep-zoom-prototype/`) | Becomes |
|---|---|
| `main.tsx` | the gmt-shell boot; `window.__dzStore` has no successor (the engine store's own smoke handle serves) |
| `DeepZoomApp.tsx` | the layout-only shell; its key switch -> Shortcuts, its progress scrape -> `host.on('progress')` (polling inside `moduleHost.ts` until M3), its cards -> `components/BootCard.tsx` |
| `bridge.ts` | its types -> `host/DeepZoomHost.ts` and `renderer/index.ts` (already copied there); its dive loop -> `host/dive.ts`; everything about the embedding frame has no successor |
| `store.ts` | nothing: bridge -> the holder; telemetry -> `host/telemetry.ts`; bookmarks -> state library; path -> `dzPath`; panel -> manifest + dock; onboarded -> Tutorial; toast -> `showToast` |
| `ui/kit.tsx` | nothing - the engine's controls |
| `ui/TopBar.tsx` | the registered `StatusChip`; Home / Back / Record -> menu items + shortcuts |
| `ui/LookPanel.tsx` | DDFS features + manifest; gradient row -> the engine's gradient editor |
| `ui/HelpPanel.tsx` | `help/topics.ts` |
| `ui/Onboarding.tsx` | the Tutorial lesson + two registered step renderers |
| `ui/LocationsPanel.tsx` | registered widgets `dz-starters`, `dz-locations` (engine panel inside), `dz-location-text` |
| `ui/starters.ts` | `data/starters.ts`, the unsourced claim line removed |
| `ui/DepthGauge.tsx` | `DepthReadout` (HUD) and `DepthScale` (viewport overlay); `useDzChrome` and `dzActions` have no successor |
| `ui/RecordPanel.tsx` | `dz-flight-strip` (scrubber, playhead line, length, rate, estimate, ZIP render with its cancel confirm and ffmpeg line) + `dz-still-export`; video render -> RenderDialog runner |

The `ui/*` rows rest on [host 2.7] and [keys 1.10]; the host reader opened only `kit.tsx`'s header
in that folder, the keys reader read `DepthGauge`, `Onboarding`, `HelpPanel` and the key effect.
`LookPanel.tsx` and `TopBar.tsx` bodies are unverified. `LocationsPanel.tsx` and `RecordPanel.tsx`
were read by the deep-zoomer critic; the first version of this document confirmed by grep the depth
sort, `goTo(b, view, keepLook)` and `Export all (JSON)` in the first.

---

## 12. Which INTERFACE wins survive, and how

| Win | Carrier in the gmt-shell |
|---|---|
| Depth always on screen, scientific notation, decades to the 1e-77 floor | HUD `deep-zoom.depth` + top-bar chip + the log scale overlay |
| Dive-first onboarding, nothing blocks input | Tutorial lesson 1, step 1 = one button |
| Starter dives | `dz-starters` widget, six cards, data file |
| Exact saved locations | state library + string views; scene file, PNG, JSON text, share link |
| Record - smooth - preview - render in one place | the Flight strip is the one place; the timeline and the RenderDialog open from it |
| Keys are safe while flying (new) | captured-mouse rule in section 9 |
| Honest numbers | three lines in help and on the scale; no target under 1e-77; measured time estimates; no claim lines |
| Moving within 10 seconds | boot splash in the HTML removed on `host.ready`'s first picture, slim compile line over the live f32 picture |
| Nothing is lost | `jumpTo` = one undo step; Home / Back |
| New, was "not possible" | undo for look, one scene file for look + camera + flight, the engine gradient editor, MP4 / WebM (after M4), share links, two panels at once, look values keyed along a dive |

---

## 13. Critic findings not taken, or taken only in part

Everything else in the three critic files was checked and is fixed in the text above, in
BUILD-PLAN, ENGINE-GAPS and DECISIONS.

| Finding | What I did | Reason |
|---|---|---|
| native 5: "so `frameSize` and `dz-frame-readout` are not written at all" | Half taken. The row now says in words what is declined; E4 is corrected (the scale seam exists, only the Fixed-size sink is missing) and is an owner call (D14). `frameSize` stays a DDFS param either way. | It is the page's own `CTLS` row; a scene, a location and a keyframe need it, and the pill would be a second control on the same param, not a replacement. The pill also shows only in Fixed mode (`engine/plugins/Viewport.tsx` header), so it cannot stand in before E4. |
| native 4: use `ColorGradingFeature` for saturation / exposure | Not used; the row says why. Exposure and saturation moved to the unranged list instead. | Its params are shader uniforms (`uniform: 'uSaturation'` ...). The engine does not draw this picture. |
| native 4: install the State Debugger | Not in v1. | `engine/features/debug_tools/index.ts` body unread by anyone in this job; installing an unread feature is a guess. Advanced mode replaces the private dev flag, which was the substance of the finding. |
| deep-zoomer 1: "until then `slotShortcuts: false` and register the nine recalls by hand" | Not the plan. E36 lands in stage 3 as S3-0. | `slotShortcuts: false` also removes the slot rows from the Locations menu (`engine/store/installStateLibrary.ts`, the `resolveSlotCount` JSDoc), and nine hand registrations are a parallel copy of the library's own. If the owner declines E36, the fallback is the same `priority: 10` shadow used for `T` and `Space`. |
| deep-zoomer 2: "if `T` stays the timeline key, move falloff to a free pair" | Not needed. | The captured rule gives `T` / `Y` back to falloff while flying and leaves `T` to the timeline when the mouse is free. |
| builder 4: "add a `tsx` script" for every package | Taken where a script can fail (9 scripts). Feature-definition and widget packages have typecheck only. | A script that renders nothing and asserts nothing about a React widget cannot go red; their proof is the stage smoke step that names them as owner. |
| builder 7, last bullet (errors inside the embedded page and Playwright) | No longer applies. | The renderer is a module in the shell's own document (DECISIONS K2); its errors are the page's errors. |

### Reconcile checkers, 2026-10-08: not taken, or taken only in part

Two checkers read the reconciled documents (`research/reconcile-consistency.md`, 11 findings;
`research/reconcile-stage-1-builder.md`, 9 findings). Each was checked against the code or the
text. All 20 hold and are fixed in place; these are the parts fixed a different way from the one
the checker offered, or left open with the reason.

| Finding | What I did | Reason |
|---|---|---|
| consistency 1, second option: hand the path render's ZIP to the shell as a blob through a new module package | Not taken. M6 leaves that one download in place and section 7 names it as the exception. | `core.js` `dlBlob(makeZip(...))` has no `EMBED` test today, so the module already downloads the parts itself; keeping it keeps stage 6a free of module packages (DECISIONS D11 A). |
| consistency 2: "the builders, one package at a time" is the architect's reading, not the owner's words | Kept, and labelled as a reading in DECISIONS K2. | The owner's words settle that `core.js` is edited directly; who holds the file at a time is a build rule, not an owner call. |
| consistency 4, first option: move the bucket controller to the owner's open table | Not taken. GMT-SYSTEMS 7.3's stage-6 half is marked not taken, and DECISIONS "Applied without asking" now says the owner was not asked. | No package of stages 1 to 7 waits on it, and the open table is kept to what blocks a stage. |
| consistency 7, second option: give N0b its own test file | Not taken; the rule is reworded instead. | N0b extends N0's replay on purpose, so one guard covers the integrator and the hook's output shape. |
| consistency 10: every remaining "the page" in rows this pass did not rewrite | Taken where a builder would be misled (H1 / H4 are now M1 / M4; DECISIONS D4, D11, D13; BUILD-PLAN's stage-2 smoke row, S6a-1, S6a-3). The rest is left under the reading rule at the top of this document. | Sections 3 to 6 and 12 quote the research files, which use the page's names. |
| builder 7: does headless Chromium have `KHR_parallel_shader_compile` | Not answered here; written as the first step of S1-3, with the fallback (this app's row runs headed on d3d11). | This job runs nothing, and the answer needs a browser. |
| builder 9, second bullet: does a size limit keep `public/deep-zoom-prototype-core/index.html` out of the precache | Not answered; section 11 now says it matches the glob and that the limit was not checked. | `vite.config.ts` was opened only at `globPatterns`. Stage 7 removes the folder either way, and the first push is held until the owner says ship. |
| builder, "Not checked" list (`installHelp`'s arguments, `topbar.unregister`, `EngineBridge`, `setup.ts` with no features, pointer lock from a Playwright click) | Left as the checker left them: unverified. | Each is read by the package that first calls it (S1-2, S1-3), under the rule that a claim carries a file and symbol somebody opened. |
