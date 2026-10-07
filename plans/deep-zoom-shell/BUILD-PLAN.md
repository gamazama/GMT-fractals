# Deep Zoom gmt-shell - build plan

Architect pass, 2026-10-07, corrected the same day after three critics
(`research/critic-builder.md`, `critic-native-maximalist.md`, `critic-deep-zoomer.md`). Target is
`BLUEPRINT.md`; engine changes are `ENGINE-GAPS.md`; owner calls are `DECISIONS.md`. Nothing here
was run. Reader-map tags in brackets as in the blueprint.

## Rules for every package

- One agent, one package. A package **owns** the files listed; no other package in the same stage
  touches them. A file not listed under any package of the running stage is read-only for that stage.
- Each stage has one **integrator**. It owns the whole shared set, every stage, with no exceptions:
  `deep-zoom/main.tsx`, `registerFeatures.ts`, `storeTypes.ts`, `panels.ts`, `setup.ts`,
  `DeepZoomApp.tsx`. It works twice: it **opens** the stage (about 15 minutes: lands the stage's new
  store-field types in `storeTypes.ts` and the widget ids the stage will register, so the other
  packages typecheck alone) and it **closes** the stage (wires everything, runs the gates).
- **Integrators land one at a time, in this order: 1, 2, 3, 4, 5, 6a, 6b, 7.** Packages of a later
  stage may be written early where "Needs" allows, but its integrator opens only after the previous
  stage's integrator has closed. So two stages never write the shared set at once.
- **Every package has a gate it can run alone**: `npm run typecheck` plus the check script named in
  its row (`tsx debug/deep-zoom-checks/<name>.mts`, plain node, no browser). The end-of-stage smoke
  is the stage's gate, not a package's. Each smoke step's header names the package that owns the
  behaviour, so a red step has one owner.
- **The smoke is one file per stage**: `debug/deep-zoom-smoke/stageN.mts`, owned by that stage's
  smoke package. `debug/smoke-deep-zoom.mts` is the runner (written once in S1-3): it launches
  Chrome and runs every `stage*.mts` it finds in that folder, in name order. No later package edits
  the runner, so no two stages share a smoke file.
- The shell imports `DeepZoomHost` and the holder only. `contentWindow`, `__dz` and every `__set*`
  name live under `deep-zoom/host/`. The stage-1 smoke greps for this.
- Custom widgets are registered (component registry, `hud.register`, `topbar.register`,
  `stepRenderers.register`), never mounted by hand. No `component: 'panel-X'` of our own.
- Labels: names and numbers. Stacking: `<Layer tier>` / `z('tier')`.
- New `@invariant` lines name the check or smoke step that proves them and are falsified first.

## Before stage 1 (three lines, in this order)

1. **The tag exists.** Ask the owner to create `deep-zoom-lean-shell` on today's head (builders make
   no git writes without him). Stages 2, 3, 4 and 6a port from `git show deep-zoom-lean-shell:deep-zoom/ui/...`;
   stage 1 deletes those files. No tag, no stage 1.
2. `npm run sync:deep-zoom-core` (the vendored page differs from the master [host 1.4]; script body unread).
3. `deep-zoom/renderer/` (`core.js`, `core.d.ts`, `harness.ts`, `index.ts`, `port/`) **stays, untouched,
   until S7-1**, which owns it. Whether anything imports it today is unverified; `knip.json` lists only
   `deep-zoom/main.tsx` as an entry. If `npm run orphans` flags the folder in stage 1, S1-3 adds it to
   `knip.json` as ignored with a comment naming S7-1.

## Gates - run by the integrator when it closes a stage, in this order

| Gate | Command | Goes red when |
|---|---|---|
| Types | `npm run typecheck` | a deleted `ui/*` import survives; a slice type is wrong |
| Package checks | every `tsx debug/deep-zoom-checks/*.mts` | see each package row |
| Stacking | `npm run check:zindex` | a ported widget brings a raw z-index of 100 or more |
| Bytes | `npm run check:text-bytes` | a NUL or control byte in a new file |
| Unused files | `npm run orphans` | a last-week file was left behind unreferenced |
| Rule guards | `npm run check:rule-guards` | the new `sibling-apps.md` row cites a guard that cannot reach `deep-zoom/**` (stage 1, then after any rule edit) |
| Build | `npm run build` | anything the deploy build rejects |
| Shell smoke | `npm run smoke:deep-zoom` | see "Smoke growth" |
| Chrome smoke | `npm run smoke:chrome` | a top-bar control or menu item in any app throws |
| Sibling boot | `smoke:boot` for fluid-toy, fractal-toy **and app-gmt** | an engine package (E2, E36, E38, E22, E23) broke them |

`smoke:deep-zoom` runs **headed Chrome on ANGLE d3d11** (`--use-angle=d3d11`), never SwiftShader.
`smoke:chrome` may stay headless for this app: it only clicks chrome and fails on page errors. Note
its boot wait is 30 s (`debug/smoke-chrome.mts` `BOOT_TIMEOUT_MS`) and "booted" there means no layer
covers the viewport, so it clicks the top bar while the renderer may still be compiling. That is
intended. Whether a page error inside the iframe reaches Playwright's `pageerror` on the parent is
unverified; the shell smoke therefore also listens on the frame.

## Smoke growth - `debug/deep-zoom-smoke/stageN.mts`

Each step's header records its owner and how it was falsified. Steps are never removed.
"Captured" below means the pointer is locked on the surface. Whether Playwright's click obtains
pointer lock in headed Chrome is unverified; each captured step first asserts
`document.pointerLockElement` is set and reports **not proven** (a failure, not a pass) if it is not.

| Stage | Steps added | Red if broken |
|---|---|---|
| 1 | no pageerror on page or frame; `TopBarHost` header and both docks exist; the adaptive badge is absent; the surface is a child of the viewport frame; `host.ready` resolves inside 120 s; telemetry depth is finite; focus the surface, hold W 1 s, `getView().cam` strings changed; the top-bar fps reads above 0; source grep: `contentWindow` / `__dz` only under `deep-zoom/host/` | falsify: point the iframe `src` at a missing file (ready red); remove the key focus (fly red); add `iframe.contentWindow` to `DeepZoomApp.tsx` (grep red) |
| 2 | **open every dock tab that exists: Formula, Light, Colour, Quality** and assert at least one slider row rendered in each (a section label does not count); no `[PanelRouter] widget ... not in componentRegistry` in the console; **every feature default equals the page's `host.bootParams()`** (the snapshot taken at ready, before the first push); drag Detail, `host.getParams().detail` changed; Ctrl+Z, it is back; set Shading to Classic, Light type row appears; depth readout text matches `/^\d\.\d\de-?\d+$/`; the status chip shows an iteration count and a drawn size; **captured: press Space and T, `isPlaying` stays false and the timeline's shown state is unchanged** | falsify: mistype one widget id in `panels.ts`; change one feature default; drop one key from `paramMap.ts`; remove `flyGuard.ts`'s registrations |
| 3 | Locations tab opens with a row; Settings shows the Autosave rows; press B, a row with a thumbnail and a depth line appears; rename it, the depth line is still there; save a deeper one, it sorts below; fly; press 1 (not captured), `getView().cam` equals the saved strings exactly; Ctrl+Z, the pre-jump strings are back; **captured: press 1, the view strings are unchanged**; serialize the scene, reload, load it, strings equal; the scene JSON has `documents['deep-zoom.locations']`; the share string decodes to the same view strings and contains no location rows; reload, the location row is still there; drop a last-week bookmark JSON, rows import; paste last week's flat location text, it jumps | falsify: route one `cam` value through `Number()`; drop the slot `when` |
| 4 | each engine key pressed with focus in the surface and again with focus in the parent changes the store exactly once; **captured: 9 / 0 change `dzColour.scale` and the view strings are unchanged; T / Y change `dzLight.lampFalloff` and the timeline does not open**; Help > Keyboard Shortcuts shows a row sourced from the registry; the lesson runs start to end; hold Shift and press B, a location is saved | falsify: remove the key relay (surface-focus steps red) |
| 5 | open Colour, switch Gradient on, the editor is there; open My Gradients, click a tile, `dzColour.gradient` changed; with mode Orbit trap the centre pixel of a `thumbnail(64)` differs before and after | falsify: skip the ramp push |
| 6a | Flight tab opens; record a dive to 1e-12, the flight has more than 1 frame and track `camera.u` has keys; drag the strip's depth curve to the middle, `camera.u` is near 0.5 and the depth lies between the ends; set `camera.u` from the timeline, the strip's playhead line shows a depth; the strip shows a decades-per-second number and an estimate; drop a `gmt-mbulb-path` JSON, it loads as the flight and is not treated as a scene | falsify: make `seekPath` a no-op |
| 6b | press Render in the Flight strip, the engine dialog opens with size presets at the surface's aspect; render 4 frames at 320 px long edge, the file is larger than 0 bytes | falsify: unregister the popup |
| 7 | every stage file again with `?transport=module`; same results | - |

---

## Stage 1 - the shell boots on the engine's own chrome with the renderer in the viewport, and flies

What the owner sees: `deep-zoom.html` opens with the engine top bar (project name, fps, undo/redo,
settings, Update pill), empty docks, the live picture in the viewport frame, a status chip with the
depth. Click the picture, W A S D flies. Last week's panels are gone until stages 2-6 (DECISIONS D1).

Four packages, one working session. Order: **S1-0 first (about an hour). Then S1-1, S1-2 and S1-3
are written side by side against S1-0's types and the DOM ids in its header. They land in sequence:
S1-1, then S1-2, then S1-3 runs the smoke.** Nothing is deleted before S1-2 lands, so the tree
typechecks after every landing.

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S1-0 Host contract** | `deep-zoom/host/DeepZoomHost.ts`, `host/current.ts`, `host/telemetry.ts`, `debug/deep-zoom-checks/host-contract.mts` | Types from [host 2.2] plus `canvas()`, `isCaptured()`, `setPendingView()`, `bootParams()`. The header fixes the DOM ids (`#dz-render-surface`). Holder = `defineAppHandles<DeepZoomHost | null>('deep-zoom.host', null)` (`engine/appHandles.ts` imports only react, checked). Telemetry store with a selector hook, 8 Hz. | typecheck; `host-contract.mts`: `DeepZoomHost.ts` has 0 `import` lines, and a grep of it for `Window`, `Document`, `contentWindow` finds nothing (`HTMLCanvasElement` in `canvas()` and `Blob` are the listed exceptions). Falsify: add `win: Window` to the interface | - |
| **S1-1 Iframe transport** | `host/iframeHost.ts`, `host/adaptDz.ts`, `host/dive.ts`, `debug/deep-zoom-checks/adapt-dz.mts`; `public/deep-zoom-core/index.html` only through the sync script | Reshape `bridge.ts` (read, not deleted here): `connectCore` -> `createIframeHost(el)`, `win` removed. `bootParams` = the page's params read at ready, before any push. Dive loop -> `dive.ts`. Key relay: capture-phase `keydown` / `keyup` on the frame window re-dispatched on the parent; a consumed key is stopped [keys 2.2]. `focus()`. `on('captureChanged')` from `pointerlockchange`. Progress scrape lives here as the interim for `on('progress')`. | typecheck; `adapt-dz.mts`: a fake `__dz` object goes through `adaptDz`; a view with three 80-digit `cam` strings comes back byte-identical from `getView` and reaches the fake's `setView` byte-identical. Falsify: wrap one string in `Number()` | S1-0. Interim routes for everything; no page handle needed in stage 1 |
| **S1-2 Boot and layout (integrator)** | the shared set, plus `DeepZoomSurface.tsx`, `components/BootCard.tsx`, `components/StatusChip.tsx`, `deep-zoom.html`; **deletes** `deep-zoom/bridge.ts`, `deep-zoom/store.ts`, `deep-zoom/ui/*` | `main.tsx` in fluid-toy's order [boot 1.2, 2.1]: `registerUI`, `installViewport({enabled:false})`, `installTopBar` + `unregister('adaptive')`, `registerCoreSettings({ autosave: null })` + settings gear, `installPwaUpdate`, `installShortcuts`, `installUndo`, `installMenu`, `installHud`, a minimal `installHelp`. No Camera plugin. Install chain in try / catch -> `initialError`. `DeepZoomApp.tsx` = fluid-toy's tree with granular selectors, `MobileViewportShell` root, `ToastHost`. Telemetry -> `viewport.reportRenderFps`. Splash `#dz-boot-splash` removed on ready, 12 s fallback. Empty manifest + feedback entry. | typecheck, `check:zindex`, `npm run build`, `npm run orphans` | S1-0; lands after S1-1 |
| **S1-3 Smoke and wiring** | `debug/smoke-deep-zoom.mts` (the runner), `debug/deep-zoom-smoke/stage1.mts`, `debug/smoke-chrome.mts` (the `APPS` row), `.claude/rules/sibling-apps.md` (path + table rows), `knip.json` | Runner for the engine store (`window.__store`, set unconditionally in `store/engineStore.ts`), headed d3d11, listens for errors on page and frame. Stage-1 steps. The app in the chrome smoke, desktop viewport only. The rule row, with the guard it cites falsified. | `npm run smoke:deep-zoom`, `npm run smoke:chrome`, `npm run check:rule-guards` - run last | S1-2 landed |

---

## Stage 2 - every look control is an engine panel, with undo

What the owner sees: four dock tabs - Formula, Light, Colour, Quality - made of engine sliders with
keyframe diamonds; Ctrl+Z undoes a slider; the depth readout (with decades per second) and the log
scale are on the picture; live iterations and drawn size in the top-bar chip; the timeline opens
with T when the mouse is free. No Locations tab (stage 3) and no Flight tab (stage 6a) yet: a tab
with nothing the core can honour is not shown.

**The contract for this stage is the id list in BLUEPRINT section 3.** S2-1, S2-2 and S2-3 all key
off it and never off each other's files; `param-map.mts` catches a mismatch.

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S2-1 Formula, quality, inspect features** | `features/formula.ts`, `features/quality.ts`, `features/inspect.ts` | The tables in BLUEPRINT section 3. `defineEnumParam` for every enum. `satisfies FeatureDefinition` only after one deliberate type error proves it types the slice [ddfs 4]. | typecheck | - |
| **S2-2 Light and colour features** | `features/light.ts`, `features/colour.ts` (mode and scale only; gradient is stage 5) | The 11 ranged light params; classic and new blocks by `condition`. The 17 unranged look fields are **not** added. | typecheck | - |
| **S2-3 Param map and sync** | `host/paramMap.ts`, `host/iframeParams.ts`, `deep-zoom/useHostSync.ts`, `debug/deep-zoom-checks/param-map.mts` | One table DDFS -> `DzParamId` with invalidation class. Per-key last-pushed cache; O-class keys debounced during a drag. On `ready`: push everything once (store wins). After `play` / a render resolves: re-push formula and quality. `iframeParams.ts` is the id -> loose-handle table [host 1.3]. | typecheck; `param-map.mts`: every param id of every registered `dz*` feature has a map row and every map row names a real param. Falsify: delete one row | S1-1. **Page handle R-H1** removes the interims: `iterations` through `setView({...getView(), iters})`; `flySpeed` writes the live `__cam.baseSpeed`; `normals` is followed by an empty `__setLook({})` [params 1.3]; `autoIterations` and `actualPixels` have **no** interim and their rows stay out of the manifest until R-H1 |
| **S2-4 Engine: one overlay host (E2)** | `engine/plugins/viewport/FeatureOverlays.tsx` (new), and the four existing copies: `fluid-toy/components/DomOverlays.tsx` (deleted) with its one importer, `fractal-toy/FractalToyApp.tsx`, `app-gmt/AppGmt.tsx`, `components/ViewportArea.tsx` | Read all four first. Lift **one** host, starting from app-gmt's (per-overlay selectors; fluid-toy's header says a selector-less read "trips React's max-depth guard"). All four sites import it. If app-gmt's copy carries something the others lack (unverified), it becomes a prop, not a reason to keep a copy. Top-of-file JSDoc (purpose, seams, pitfalls). | typecheck; `smoke:boot` for fluid-toy, fractal-toy, app-gmt; `smoke:chrome`; `npm run orphans`; a grep for `getViewportOverlays().filter(o => o.type === 'dom')` finds 1 site | - |
| **S2-5 Depth instruments** | `components/DepthReadout.tsx`, `components/DepthScale.tsx`, `components/IterationReadout.tsx`, `components/FrameReadout.tsx`, `components/StatusChip.tsx`, `components/depthFormat.ts`, `deep-zoom/milestones.ts`, `features/camera.ts`, `debug/deep-zoom-checks/depth-format.mts` | Port from `ui/DepthGauge.tsx` (tag): depth, decades to the floor, magnification, the falling / rising decades-per-second line, the yardstick line, `Diving · from to target`, milestone toasts through `showToast`. Chip gains live iterations and drawn size. Readout sets React state only when the rounded value changes. `camera` feature: param `u`, `viewportConfig` for the scale. | typecheck; `depth-format.mts`: `6.4e-53` -> `6.40e-53`, `1.5` -> `1.50e0`, both match the smoke's regex | S1-0, S2-4 |
| **S2-6 Fly guard** | `deep-zoom/flyGuard.ts` | Shortcuts with `priority: 10` and `when: () => host.isCaptured()` on `t` and `Space` that consume the key and do nothing, so the timeline's own two (`engine.timeline.toggle`, `engine.timeline.toggle-play` in `components/TimelineHost.tsx`) do not fire while flying. Interim for gap E37. | typecheck | S1-0 |
| **S2-7 Integrator** | the shared set | Open: nothing new in `storeTypes.ts` beyond the slices. Close: register the 6 features; manifest tabs Formula, Light, Colour, Quality; `hud.register` the readout; mount `<FeatureOverlays/>`, `<TimelineHost/>`; call the fly guard; a menu row for the engine's Advanced mode if no shared one exists (`setAdvancedMode`, `store/slices/uiSlice.ts`); `validateComponentRefs` in dev. | all gates | S2-1..6 |
| **S2-8 Smoke** | `debug/deep-zoom-smoke/stage2.mts` | The stage-2 steps. | `npm run smoke:deep-zoom` | S2-7 |

---

## Stage 3 - locations, scene files, links

What the owner sees: B saves a location with a thumbnail and its depth on the row; the list runs
shallow to deep; 1-9 recall when the mouse is free; Home and Back; starter dives; File > Save / Load
scene and Save PNG; Copy location / Paste location / Copy link / Export all; all still there after
a reload.

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S3-0 Engine: state library (E36, E38)** | `engine/store/installStateLibrary.ts`, `components/StateLibraryPanel.tsx` | `SlotShortcutOptions.when?: () => boolean` passed to the recall and save registrations. `StateLibraryPanelProps.renderMeta?: (snap) => ReactNode` (a second line per row) and `sortBy?: (a, b) => number` (drag-reorder off while set). JSDoc updated. All three optional; absent = today's behaviour. | typecheck; `smoke:chrome` (fluid-toy and app-gmt use the library); `smoke:boot` for both | owner call D8 |
| **S3-1 Locations** | `deep-zoom/locations.ts`, `components/LocationsPanel.tsx` | `installStateLibrary` as BLUEPRINT section 1, with `slotShortcuts.when` and the panel's `sortBy` / `renderMeta` by depth; `jumpTo(loc, { keepLook })`; history providers `dzView` (`changeOf: seq`) and `savedLocations`; default label with the mantissa; one-time import of `gmt.deepzoom.bookmarks.v1`; the storage mirror (interim for E10). | typecheck | S3-0. **R-K2**: until then the readout lags a jump by a few frames |
| **S3-2 Scene state and session** | `deep-zoom/presetFields.ts`, `deep-zoom/documents.ts`, `deep-zoom/session.ts`, `debug/deep-zoom-checks/scene-roundtrip.mts` | Preset field `dzView` + the `dzInspect` reset; pending-view slot. Document providers `deep-zoom.path` and `deep-zoom.locations` (`registerDocumentProvider`, `store/documentRegistry.ts`). **First step: read where `restoreDocuments` is called relative to preset fields; if the order breaks a load, fall back to preset fields plus deleting the two keys before a share link.** Session adapter `{ view, flight }`, its own autosave settings store. | typecheck; `scene-roundtrip.mts`: a location row and a view go through serialize / restore with every `cam` string byte-identical | S1-0 |
| **S3-3 Starters and text** | `components/StarterDives.tsx`, `data/starters.ts`, `components/LocationText.tsx`, `deep-zoom/share.ts`, `deep-zoom/locationParse.ts`, `debug/deep-zoom-checks/location-parse.mts` | Six cards; the claim line removed. Copy / Paste with a reason on failure. The parser accepts the new shape and last week's (flat `iters / power / phase / light / falloff / color / cscale / surf` beside `cam`, numeric `depth`; a bare view; an array). Export all (JSON), thumbnails left out. Link = `getShareString()`. | typecheck; `location-parse.mts`: five sample texts (new, last-week, bare view, array, garbage) parse or fail with a reason | S3-1 for `jumpTo` (import only) |
| **S3-4 Claims** | `deep-zoom/claims.ts` | `deep-zoom.locations` claim (rows with `view.cam` of three strings), using `locationParse.ts`. Never throws after a side effect. | typecheck | S3-3 |
| **S3-5 Integrator** | the shared set | Open: store fields `savedLocations`, `activeLocationId`, `dzPath`, the jump counter. Close: `installSceneIO({ getCanvas })`; `<SceneFileDropZone/>`; **replace** the stage-1 line `registerCoreSettings({ autosave: null })` with the one call `registerCoreSettings({ autosave: { store: settings, ...text } })` (the function runs once only - a second call does nothing); the Locations tab; the Dive menu. | all gates; **manual check on a real GPU: is the saved PNG blank?** If yes, do S3-6 | S3-1..4 |
| **S3-6 Engine: async snapshot (E8)** - only if the PNG is blank | `engine/plugins/SceneIO.tsx` | `getSnapshot` option. | `smoke:chrome` all apps; the PNG has non-black pixels | - |
| **S3-7 Smoke** | `debug/deep-zoom-smoke/stage3.mts` | The stage-3 steps. | `npm run smoke:deep-zoom` | S3-5 |

---

## Stage 4 - keys, help, the first dive

What the owner sees: every key works while flying, and no key moves the camera or starts the
timeline by accident while the mouse is captured; Help has the topics and a shortcuts page that
lists the real bindings; a first-run lesson starts with one "Dive to 1e-12" button.

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S4-1 Hotkeys** | `deep-zoom/hotkeys.ts`, `deep-zoom/flyGuard.ts` | The table in BLUEPRINT section 9; `B` and `M` twice (with Shift); `deep-zoom.cancel` with `when: busy`. Captured-only bindings at `priority: 10`: `9` / `0` palette scale, `T` / `Y` lamp falloff (the `t` do-nothing guard from stage 2 is replaced by the falloff binding). `host.setHotkeys('fly')` at ready. | typecheck | **R-H6**; interim: the relay stops consumed keys, so the page's copy of each engine key never fires |
| **S4-2 Help** | `help/topics.ts`, `help/installDeepZoomHelp.tsx` | Seven topics from last week's Help tabs; generated shortcuts page; What's New (the key changes of DECISIONS D3 are its first entry) with its own `seenKey`. | typecheck | S4-1 (reads the registry at open time, no import) |
| **S4-3 Tutorial** | `tutorial/firstDive.ts`, `tutorial/steps.tsx`, `tutorial/hostEvents.ts` | Lesson 1; step kinds `dz-dive`, `dz-record-dive`; `hostEvents.ts` turns host events and telemetry into `actionBus.fire(...)`. No step relies on `onExit`. | typecheck; manual: the card does not take focus from the picture (unverified today) | S3 for `jumpTo`; the recording step is added to the lesson in stage 6a |
| **S4-4 Integrator** | the shared set | `installHelp` full options, `installTutorial`, `registerLessons`, `help.registerHudHint`, mount `TutorialRunner` / `TutorialOverlay`. | all gates | S4-1..3 |
| **S4-5 Engine: second key root (E5)** - optional | `engine/plugins/Shortcuts.ts`, `engine/plugins/tutorial/triggers.ts` | `shortcuts.attachRoot`. The transport then attaches the frame window and the relay is deleted. | `smoke:chrome` all apps | owner call D8 |
| **S4-6 Smoke** | `debug/deep-zoom-smoke/stage4.mts` | The stage-4 steps. | `npm run smoke:deep-zoom` | S4-4 |

---

## Stage 5 - gradients from the engine's editor and My Gradients

What the owner sees: a Gradient switch and the full stop editor in Colour; the My Gradients shelf
with "Deep Zoom - Gradient" as a destination; a gradient made in Gradient Explorer is one click away.

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S5-1 Gradient param and push** | `features/colour.ts`, `deep-zoom/colourSync.ts`, `host/iframeGradient.ts` | `useGradient` + `gradient`; setting a gradient in Plain mode also sets Orbit trap; push ramp then mode; one push per animation frame with a sequence counter. No stage-3 or stage-4 package owns `features/colour.ts`, so writing this early collides with nothing. | typecheck; `param-map.mts` still green; on a real GPU **check the colours against the editor swatch** - whether the page treats the strip as display or linear is unverified [palette G8] | stage 2. **R-H2**; interim: 256 x 1 PNG blob through `__loadGradient` [palette 2.3] |
| **S5-2 Integrator** | the shared set | `registerPaletteUI()`, send target with `editsParam`, `favientsPanelEntry`, `mountFavientsPanel` after the manifest with its own `storageKey`, the toggle button. Opens after stage 4's integrator has closed. | all gates; red if `mountFavientsPanel` runs before the manifest (the panel never opens) | S5-1 |
| **S5-3 Smoke** | `debug/deep-zoom-smoke/stage5.mts` | The stage-5 steps. | `npm run smoke:deep-zoom` | S5-2 |

---

## Stage 6a - a dive on the timeline: record, scrub, lossless frames

What the owner sees: the Flight tab. Record a dive; it lands on the timeline as one track; the
strip's depth curve scrubs it and shows the depth at the playhead; Space previews (mouse free);
length in seconds, decades per second, an estimate; "Render PNG sequence (ZIP)" and still export.
No engine render dialog yet. **Does not wait for any page handle.**

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S6a-1 Flight state** | `deep-zoom/flight.ts`, `features/flight.ts` | `dzPath` history provider; record stop -> smooth -> track (one undo snapshot) with the default curve of BLUEPRINT section 8; the `camera.u` subscription -> `host.seekPath(path, u)` with the page's ease off; the `deep-zoom.path` claim; `registerCameraKeyTracks(['camera.u'])`. | typecheck | stage 3. **R-H4 seekPath**; interim: `__samplePath(p, u x lastT)` - by time, so a scrubbed frame does not match a rendered frame, and the strip says so |
| **S6a-2 Flight strip** | `components/FlightStrip.tsx`, `deep-zoom/flightMath.ts`, `debug/deep-zoom-checks/flight-math.mts` | Port the top half of `ui/RecordPanel.tsx` (tag): Record / Smooth / Preview; the depth curve as a scrubber bound both ways to `camera.u` (Left / Right, Shift = 1 s); the playhead line `t 4.2 s / 10.0 s · frame 126/300 · 6.40e-53`; Go to start, Go to deepest; length typed as seconds or m:ss (writes the timeline length and rescales the keys); fps 24 / 30 / 60; decades per second **read from the key curve at the playhead**; the estimate before a render. | typecheck; `flight-math.mts`: a straight 0 -> 1 curve over 10 s on a 30-decade flight gives 3.0 decades/s at every sample; rescaling 10 s to 20 s halves it | S6a-1 for the store field name only (frozen by the integrator's open step) |
| **S6a-3 Still and ZIP** | `components/StillExport.tsx`, `components/RenderProgress.tsx`, `deep-zoom/zipRender.ts` | Still export saves the blob with the scene embedded. ZIP = the page's own path render: cancel with the "finished frames are saved as a partial ZIP" confirm, the ffmpeg line with Copy, and one line stating that this route uses the page's own smooth-step timing, not the timeline curve (the page applies `easeInOut` itself). | typecheck | S1-1 |
| **S6a-4 Integrator** | the shared set, `tutorial/firstDive.ts` (adds the recording step, ending with the Flight tab active) | The Flight tab; register the widgets; HUD progress. | all gates | S6a-1..3 |
| **S6a-5 Smoke** | `debug/deep-zoom-smoke/stage6a.mts` | The stage-6a steps. | `npm run smoke:deep-zoom` | S6a-4 |

## Stage 6b - video from the engine's render dialog

**Entry gate: R-H4 (`seekPath` by arc and `renderFrame` to memory) has landed in the master page and
been synced.** That is an edit to the owner's page (DECISIONS D2). Until then stage 6b does not
start and the dialog is not installed - never a control the core cannot honour.

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S6b-1 Runner** | `deep-zoom/exportRunner.ts`, `deep-zoom/renderPresets.ts`, `components/RenderEstimateRows.tsx` | Copy fluid-toy's runner skeleton; per frame scrub -> `host.renderFrameBlob({ path, u, longEdge, samples })` -> encode; first frame and every resume pass a fresh light rig [timeline G12]. `renderPresets.ts`: 720 / 1080 / 1440 / 2160 long edge at the surface's aspect, for the dialog's `resolutionPresets` (function form). `RenderEstimateRows` = the dialog's `extraInfoRows`: the estimate. | typecheck | R-H4 |
| **S6b-2 Engine: open the dialog from anywhere, wider encoder input (E22, E23)** | `engine/animation/renderPopupRegistry.ts`, `engine/export/videoEncoder.ts` | `openRenderPopup()` beside today's three exports (`registerRenderPopup`, `getRenderPopup`, `subscribeRenderPopup`); `encodeCanvas(source: CanvasImageSource, ...)` (today `HTMLCanvasElement | OffscreenCanvas`). | typecheck; `smoke:chrome`; fluid-toy's and app-gmt's export still typecheck | - |
| **S6b-3 Integrator** | the shared set, `components/FlightStrip.tsx` (the Render button's one line) | `installRenderDialog` with `defaults` 10 s, 30 fps, 4 samples, `resolutionPresets`, `extraInfoRows`; the ZIP route also as `registerRenderAdjunct`; a File-menu "Render..." row; the strip's Render button calls `openRenderPopup()`. | all gates | S6b-1..2 |
| **S6b-4 Smoke** | `debug/deep-zoom-smoke/stage6b.mts` | The stage-6b steps. | `npm run smoke:deep-zoom` | S6b-3 |

---

## Stage 7 - the module transport, docs, close-out

| Id | Owns | Steps | Gate | Needs |
|---|---|---|---|---|
| **S7-1 Module transport** | `host/moduleHost.ts`, `DeepZoomSurface.tsx`, `deep-zoom/renderer/**` | `createModuleHost(canvas)` over `adaptDz`; one `registerTick`; `?transport=` switch. | every stage smoke under both transports | the core extraction (`plans/deep-zoom-in-gmt/CORE-EXTRACTION.md`, not re-read in this pass) |
| **S7-2 Docs** | `deep-zoom/README.md`, `docs/modules/deep-zoom/index.md`, `HANDOFF.md` entry | The map page with a "where to start" table; `npm run context:map`. | `npm run context:check` | - |
| **S7-3 Remove interims** | `host/iframeParams.ts`, `host/iframeGradient.ts`, `host/iframeHost.ts` (the relay), `deep-zoom/flyGuard.ts` if E37 landed | Delete each interim whose handle landed; bump the accepted `__dz.version`. | the smoke | the R packages |

---

## R packages - small handles added to the renderer page

All in `H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html` (the master, branch `kernel-perf`),
additive inside `window.__dz`, `version` 2, then `npm run sync:deep-zoom-core`. They can run at any
time beside the stages; each shell package works on its interim until then, except stage 6b. Who
edits the master while the owner's kernel work is live there is DECISIONS D2.

| Id | Handle | Unblocks | Interim until then |
|---|---|---|---|
| R-H1 | `__dz.params()`, `__dz.set(patch)`, `__dz.schema()` from `CTLS` rows given ids; setters for iterations, auto iterations, actual pixels, fly speed [host 2.4] [params 5] | S2-3 fully; boot-time range check | the loose-handle table; two rows left out |
| R-H6 + R-H8 | `__dz.hotkeys('fly'|'all'|'none')`; no `alert`, no download under embed | S4-1 | relay stops consumed keys |
| R-K1, R-K2 | field of view in views; `setView` resets the depth smoothing | S3-1 | readout lags a jump |
| R-H2 | `__dz.setGradient(rgba, width)` without the colour-mode flip | S5-1 | PNG blob route, asynchronous |
| R-H3 | `__dz.on(fn)` events: param changed, recording, progress, compile, error | S6a-3 progress, S2-3 write-back | polling + the DOM scrape inside the transport |
| R-H4 | `__dz.seekPath(data, u, ease)` with `ease` off-able, `__dz.renderFrame(req)` -> blob or pixels | S6a-1 exact scrub; **all of stage 6b** | scrub by time; **none for render** |
| R-K3, R-H5 | `__dz.pause`; compile state; context-loss events | a well-behaved shell (tab hidden, GPU reset) | none |
| R-H7 | `__dz.moveAlong` as product API | survives the extraction's test / product split | `__moveAlong` |

Order of value: H1, H4, H6, H2, K2, H3, the rest.

## Dependencies at a glance

```
tag + sync -> S1-0 -> (S1-1 | S1-2 | S1-3 written together) -> land S1-1 -> S1-2 -> run S1-3
Stage 1 -> Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6a -> Stage 6b -> Stage 7   (integrator order)
S5-1 may be written any time after stage 2; S6a-2 and S6a-3 any time after stage 3
R-H4 landed and synced -> Stage 6b
core extraction -> S7-1
```

## What is not verified and could move a package

- Whether a Playwright click obtains pointer lock in headed Chrome - decides whether the captured
  steps prove anything (they report "not proven" if not).
- Where `restoreDocuments` runs relative to preset fields - decides S3-2's carrier for the flight
  and the locations (fallback written in its row).
- What app-gmt's overlay host carries beyond the other three copies (S2-4 reads all four first).
- Whether a non-GMT shell has a menu row for Advanced mode (S2-7 adds one if not).
- A saved PNG from the frame's canvas being non-blank (`preserveDrawingBuffer:false`) - decides S3-6.
- The tutorial card taking focus from the picture - decides DECISIONS D9.
- Whether `<RenderLoopDriver/>` + `<EngineBridge/>` alone drive timeline playback [boot 4]; copied
  from fluid-toy, where it works.
- `sync-deep-zoom-core.mjs` body; how far the vendored page has drifted; what imports `deep-zoom/renderer/`.
- What a cancelled MP4 leaves on disk (stage 6b manual check).
- The key relay and the capture-phase filter are designs, not run code.
