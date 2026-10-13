# Critic: native-maximalist

2026-10-07. Read-only pass against BLUEPRINT.md, BUILD-PLAN.md, ENGINE-GAPS.md, DECISIONS.md.
The line held: "use as much of gmt-engine's native plugins as possible".
Everything below was checked by opening the file named. Things I did not open are marked unverified.

## Verdict

The blueprint is mostly native and most of its seams are real. I checked about 30 named calls and
28 exist with the shape the blueprint gives (list at the end). Two calls are wrong as written, one
engine gap is under-counted so the "fix" would leave two more copies behind, and three engine
systems are never named: the document registry, the engine's own six generic features, and the
render-scale source seam. None of these blocks the plan; all are cheap to fix on paper now.

## Findings

### 1. WRONG - `registerCoreSettings({ autosave: settings })` has the wrong shape, and the second call does nothing

Where: BLUEPRINT section 1 rows "Session" and "Settings"; BUILD-PLAN S1-2 and S3-5.

`store/coreSettings.ts`, `CoreSettingsOptions`:

```ts
autosave?: ({ store: AutosaveSettingsStore } & AutosaveSettingsText) | null;
```

The option is an object with a `store` key, not the store. The only caller that passes one,
`gradient-explorer/v2/main.tsx`, writes `autosave: { store: gxAutosaveSettings, ...GX_AUTOSAVE_TEXT }`.

Worse, the function is once-only (`store/coreSettings.ts`, `registerCoreSettings`):

```ts
if (registered) return;
registered = true;
```

BUILD-PLAN S1-2 calls `registerCoreSettings({autosave:null})` in stage 1 and S3-5 calls
`registerCoreSettings({ autosave: settings })` in stage 3. If both lines live in the boot file, the
stage-3 call is a silent no-op and the Files > Autosave rows never appear, while Session autosave
runs with nobody able to switch it off.

Fix: one call, `registerCoreSettings({ autosave: { store: settings, ...text } })`. In stage 1 either
create the settings store already or keep `autosave: null` and REPLACE that line in stage 3 (say so
in S3-5). Add a smoke step: open Settings, assert the Autosave row is there.

### 2. WEAK - gap E2 counts two copies of the overlay renderer; there are four, one of them already in engine-core

Where: ENGINE-GAPS E2 ("Two apps carry the same 12-line renderer"); BUILD-PLAN S2-4 (new file
`engine/plugins/viewport/FeatureOverlays.tsx`, switches fluid-toy and fractal-toy).

`featureRegistry.getViewportOverlays().filter(o => o.type === 'dom')` is at four sites:
- `fluid-toy/components/DomOverlays.tsx` line 18
- `fractal-toy/FractalToyApp.tsx` line 37
- `app-gmt/AppGmt.tsx` line 97 (`DomOverlays` / `OverlayHost`, the version with per-overlay selectors)
- `components/ViewportArea.tsx` line 49 (`const DomOverlays`, inside the engine's own generic
  viewport shell, imported by `App.tsx`)

S2-4 as written adds a fifth implementation and retires two. That is a parallel copy, which is the
owner's "improve the master" rule broken inside the engine. The claim itself (no shared host) is
right; the scope is wrong.

Fix: S2-4 lifts ONE host (start from app-gmt's `OverlayHost`, the only one that does not subscribe
to the whole store - `components/ViewportArea.tsx` does `const state = useEngineStore()` twice) and
switches all four sites, or states in the plan why app-gmt and `ViewportArea` stay as they are.
Gates need `smoke:boot` and `smoke:chrome` for app-gmt too.

### 3. MISSING - the document registry is never mentioned

Where: BLUEPRINT section 6 (scene file); no hit for `documentRegistry` or `registerDocument` in any
of the four plan files.

`store/documentRegistry.ts` (top-of-file JSDoc) is the engine's seam for exactly the state the
blueprint is placing: "Real authoring state that lives in non-DDFS stores ... A provider is a
`{ serialize, restore }` pair keyed by a stable id. On save, SceneIO collects every provider's
`serialize()` into the scene under a `documents: { [id]: snap }` key". SceneIO uses it on every save:
`engine/plugins/SceneIO.tsx`, `saveScene`: `getPreset({ includeScene: true, includeDocuments: true })`.
Five providers exist already (`palette/registerPaletteUI.ts`: `favients`, `stops`, `generator`,
`image`; `palette/installWorking.ts`: `working`).

Two consequences the blueprint does not state:
- The scene JSON sketch in section 6 is incomplete. Because the shell calls `registerPaletteUI()`,
  every deep-zoom scene file and PNG will also carry `documents: { favients, stops, generator, image }`.
  (ENGINE-GAPS E29 notes the providers land in saves; BLUEPRINT's file shape does not show it.)
- `dzPath` (the recorded flight) and `savedLocations` are non-DDFS authoring state. The blueprint
  routes them through `presetFieldRegistry` without comparing the two seams. Preset fields may well
  be the right pick (they are what share links and Session read - whether share links include
  `documents` is unverified, I did not open the share encoder), but the choice has to be written
  down, because a second reader will find the document registry and ask.

Fix: add a row to the section 1 table, "Document registry - used / declined, because ...", and add
the `documents` key to the scene sketch. If the flight path should NOT travel in share links, the
document registry may give that for free instead of "delete the keys from the preset copy"
(check `getShareString` before deciding).

### 4. MISSING - the engine's six generic features are never named; only Modulation is declined

Where: BLUEPRINT section 1 (rows end at Modulation) and section 3 (dzLight `exposure`, `saturation`
"range not in the page"; the hand-built `Diagnostics` panel).

`engine/features/index.ts`, `registerFeatures`, registers `PostEffectsFeature`, `ColorGradingFeature`,
`AudioFeature`, `ModulationFeature`, `WebcamFeature`, `DebugToolsFeature`. The blueprint declines
Modulation with a reason and is silent on the other five. Two overlap with things it hand-builds:
- `engine/features/color_grading.ts`, `ColorGradingFeature` (id `colorGrading`): `toneMapping`,
  `saturation`, `levelsMin/Max/Gamma`, plus a registered `scene-histogram` widget. The blueprint
  proposes its own `saturation` and `exposure` on `dzLight` with no range known.
- `engine/features/debug_tools/index.ts`, `DebugToolsFeature` (id `debugTools`): a State Debugger
  and an Interaction Session overlay, surfaced through `menuItems` with `advancedOnly: true`. The
  blueprint builds a `dz-diagnostics` widget behind a private `devFlag`.

What I did not verify: whether colour grading can act on a picture the engine did not render (I
read only the feature header; if it is uniform-driven it cannot reach the page's shader), and
whether the sibling shells register this set (a grep of fluid-toy, fractal-toy, gradient-explorer/v2
and mesh-export for an import of `engine/features` found none, so probably not).

Fix: five more rows in the section 1 table, each "not used, because ..." or "used". For Diagnostics:
gate the panel on the engine's existing advanced-mode switch rather than a new `devFlag`, and state
whether the State Debugger is installed.

### 5. WEAK - frame size and resolution are hand-rolled params while the viewport's own seam is switched off

Where: BLUEPRINT section 1 row "Viewport" (`installViewport({ enabled: false })`,
`showModeControls={false}`, `topbar.unregister('adaptive')`), section 3 `dzQuality.frameSize`,
`resolutionCap`, the `dz-frame-readout` widget; ENGINE-GAPS E4 (interim: "frame size is a normal param").

The engine already has more here than E4 says. `engine/plugins/Viewport.tsx` exports
`setRenderScaleSource(source)` with `RenderScaleSource { use: () => [number, (v) => void]; steps; formatLabel? }`,
and its JSDoc says why: "GMT's actual internal-pixel multiplier lives at `quality.aaLevel` instead,
so the app injects a custom source". That is exactly "the surface owns its numbers" for the scale
pill, today, with no engine change. `engine/plugins/viewport/ViewportFrame.tsx` has Fixed mode with
`FixedResolutionControls` and fit-scaling. The blueprint turns all three off (mode controls, adaptive
loop, badge) and rebuilds the same three things as a slider, an int and a readout widget.

E4 is real for the Fixed-size half (no sink for width/height - I did not find one). It is not real
for the scale half.

Fix: keep `showModeControls` on, point the scale pill at `dzQuality` through
`setRenderScaleSource`, and move E4 (a resolution sink for Fixed mode) from "backlog" to the build,
so `frameSize` and `dz-frame-readout` are not written at all. If the owner prefers the interim, the
table row must say "Fixed mode, scale pill and adaptive resolution: declined until E4" instead of
only showing the switches.

## Seams I checked that DO exist as the blueprint says

So nobody re-checks them:

- `installViewport(options?: Partial<ViewportAdaptiveConfig>)`, `enabled: boolean` (`types/viewport.ts`);
  `viewport.reportRenderFps(fps)` (`engine/plugins/Viewport.tsx`); `ViewportFrameProps.showModeControls`.
- `installTopBar` registers `project-name`, `fps`, `adaptive`; slots `'left' | 'center' | 'right'`
  (`engine/plugins/TopBar.tsx`), so `topbar.unregister('adaptive')` targets a real id.
- `menu.register` with `MenuDef { id, slot, order, label }`, `menu.registerItem`, `menu.setBadge`
  (`engine/plugins/Menu.tsx`).
- `installSceneIO({ getCanvas })` and the install-time gate: "PNG/JPG export menu items + SnapshotButton
  are gated on `_getCanvas` AT install time" (`engine/plugins/SceneIO.tsx`).
- `registerSceneFileClaim` (`engine/plugins/SceneFileClaims.ts`).
- `restoreSessionOnBoot(adapter, { storageKey, settings, preempted? })`, `installSessionAutosave`,
  `registerSessionFileSettings` (`engine/plugins/Session.ts`); `createAutosaveSettingsStore(keys)`
  (`engine/store/autosaveStore.ts`).
- `registerHistoryProvider(key, provider)` with `changeOf?: (snapshot) => unknown`
  (`store/slices/historySlice.ts` - note it is NOT in `engine/plugins/Undo.tsx`; the table row
  reads as if `installUndo` owned it).
- `installStateLibrary` options `panelId`, `arrayKey`, `slotShortcuts`, `menu`
  (`engine/store/installStateLibrary.ts`); `captureThumbnail?: () => Promise<string | undefined>`
  (`engine/store/createStateLibrarySlice.ts`). No `persist` option - E10 is right.
- `hud.register` with slots `top-left ... bottom-right` and `className` (`engine/plugins/Hud.tsx`).
- `installHelp` options `gettingStartedTopicId`, `shortcutsTopicId`, `tutorials`, `extraItems`,
  `support`; `help.registerHudHint` (`engine/plugins/Help.tsx`); `setHelpTopicsLoader`
  (`data/help/registry.ts`).
- `installTutorial({ storageKey })`, `registerLessons`, `stepRenderers.register({ kind, render })`,
  `actionBus` (`engine/plugins/Tutorial.tsx`, `tutorial/stepRenderers.ts`); `tutorialCompleted` is a
  `number[]` in the store (`engine/plugins/Help.tsx` reads it).
- `createWhatsNew({ topicId, version, seenKey })` returning `isUnseen`, `menuItem` (`engine/plugins/WhatsNew.tsx`).
- `installRenderDialog` options `runner`, `title`, `defaults.samplesPerFrame`, `formatFilter`
  (`engine/plugins/RenderDialog/types.ts`, `index.tsx`).
- `registerCameraKeyTracks`, `registerRenderAdjunct(adjunct | null)`, `registerLogTrack`
  (`engine/animation/*`).
- `registerSendTarget` with `group: 'host' | 'mode'` and `editsParam` (`store/sendTargetRegistry.ts`);
  `setFavientStudioAction` (`palette/core/favientTargets.ts`); `favientsPanelEntry({ dock, order })`
  and `mountFavientsPanel({ storageKey, paletteFilters })` (`palette/installFavients.ts`).
  Note `favientsPanelEntry` itself returns `component: 'panel-favients'` - the engine's own
  panel-X entry, not ours, but the blueprint's "No component: 'panel-X' of our own" should say so.
- `defineAppHandles<T>(name, initial)` (`engine/appHandles.ts`). Its only import is
  `useSyncExternalStore` from react - it does NOT import the store, so the blueprint's "unverified"
  fallback (a 20-line holder) is not needed. Close that open question.
- `FeatureViewportConfig { componentId, renderOrder?, type?: 'scene' | 'dom' }`, `condition` with
  `eq`, `isAdvanced`, `userScoped` (`engine/FeatureSystem.ts`); manifest `showIf`, `whitelistParams`,
  `section`, `separator`, `collapsible` with `label` / `defaultOpen` (`engine/PanelManifest.ts`);
  `defineEnumParam` (`engine/defineEnumParam.ts`).
- Layer tiers `shellHud` 10, `shellViewportOverlay` 20, `shellLoading` 100, `shellToast` 900
  (`components/ui/zIndex.ts`).

## Not checked (out of time)

`engine/plugins/Camera.ts` and `camera/presetField.ts` (the decline reasons), whether a feature id
`camera` collides with anything in the store, `engine/plugins/navigation/core`, `engine/components/`
`LandscapeGate` / `MobileScrollIntro` / `UnsavedWorkGuard` (the last is declined in E9/E11), the
`PauseControls` / `BucketRender` decline reasons, the share-link encoder.
