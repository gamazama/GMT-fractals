# Deep Zoom gmt-shell - build plan

Architect pass, 2026-10-07, corrected the same day after three critics
(`research/critic-builder.md`, `critic-native-maximalist.md`, `critic-deep-zoomer.md`).
**Reconciled 2026-10-08** with the owner's five decisions (DECISIONS K1-K5): the standalone page is
frozen; the renderer is the module `deep-zoom/renderer`; the embedded prototype moves aside; GMT's
navigation and Light Studio are reworked generically and used here (stages N and L, from
`GMT-SYSTEMS.md` sections 3.4, 4.5 and 7); the shell never waits for a rework. Target is
`BLUEPRINT.md`; engine changes are `ENGINE-GAPS.md`; owner calls are `DECISIONS.md`.
**Building started 2026-10-08.** State and corrections follow; the stage tables below are the
original plan and are not rewritten.

### As built, 2026-10-08 (branch `deep-zoom-tool`, unpushed)

| Stage | State |
|---|---|
| 1 | **Closed.** S1-A, S1-0, S1-1, S1-2, S1-3. Smoke stage 1: 19 steps. |
| 2 | **Built**, except: pause controls (S2-9, waits on a module pause), the Diagnostics tab (D7), the `actualPixels` row, a menu row for Advanced mode. Smoke stage 2: 9 steps. |
| 3 | **Built**, except: Export all (JSON), the scene-file claims (S3-4), Session / autosave (the session half of S3-2). Smoke stage 3: 9 steps. |
| 4 | **Keys built** (S4-1; smoke stage 4: 4 steps). Help topics, the shortcuts page, What's New and the first-dive lesson (S4-2, S4-3) are not built. |
| N | N0 only (the replay guard, `npm run test:nav-replay`). |
| Engine | S2-4 (one overlay host) and S3-0 (state-library options) landed. |
| Module | Done inside other packages: `setIters`, `setAutoIters`, two read-backs (part of M1); `setView` snaps the distance (M8); fly keys ignore a key pressed with Ctrl / Alt / Meta (part of M6). |

How it was built changed after the first evening: one builder agent per package cost about the
same whatever the package's size, and the usage cap was hit with stage 1 barely closed. From
stage 2 on it was built in one session, depth-first, one commit per visible piece.

**Corrections to this plan found by building** (each is in the code's JSDoc where it bites):
- **The fly guard cannot be a priority-10 binding with a condition** (S2-6, S4-1, BLUEPRINT section 9).
  The shortcut dispatcher picks the winning binding for a key first and tests its `when` afterwards,
  with no fall-through, so such a guard swallows the key with the pointer free too. It is a shortcut
  SCOPE pushed while the pointer is captured (`deep-zoom/flyGuard.ts`).
- **Precision Deep at a shallow depth draws one flat colour.** A smoke step about Light or Colour
  uses a view that is deep by itself; the tabs say they act below 1e-4 and offer no switch.
- **`restoreDocuments` runs after the preset fields** (`loadPreset` in `store/engineStore.ts`), so the
  document carrier for saved places works as planned. Places in a scene are MERGED into the
  device's list by id; a scene never deletes a place saved on this device.
- **`installModulation()` is the only registration of the engine's animation tick.** Without it the
  timeline does not play. It is called; the modulation UI is not installed.
- **A view loaded before the renderer is ready must outlive React's first, disposed mount** (dev
  StrictMode): it is kept until a mounted renderer is ready (`deep-zoom/presetFields.ts`).
- **The renderer's canvas reads blank between frames**, so Save PNG draws one frame and copies it
  in the same task (`sceneCanvas` in `deep-zoom/share.ts`). S3-6 (an engine snapshot option) is not needed.
- **The share encoder rounds numbers to four decimals**, so yaw and pitch are stored as text beside
  the camera strings.
- **A dive flies straight ahead and the renderer's distance reading falls in cliffs at depth**
  (2.3e-29 to 1.8e-34 across one 5 % step, traced), so a dive can end decades under its target, and
  from a view that grazes the surface it stops on its 45 s limit. The fix is a truer distance in the
  module (the ray's own hit distance); not planned as a package yet. Starter views need good aim:
  the first two starters dive into the grainy f32 picture and want replacing by the owner.
- **Colour** is `plain` + `mode` (GMT's numbers) + `scale` in the module's units (BLUEPRINT section 3,
  as built). A module adapter that makes `scale` mean what it means in GMT changes the picture and
  needs a scene-version migration; the stamp (`dzSceneVersion: 1`) is in every scene from the first.
- **The smokes run with no window** (`DZ_HEADLESS=1`): same Chrome, same GPU. A headed window takes
  the keyboard; keys typed elsewhere landed in the page under test and failed two parity lines.

**Open calls built on their recommended answer** (say if any should differ): D3 keys, D6 A (places in
scenes, plus a storage mirror), D8 (the engine changes rode along), D13 (11 ranged light rows only),
D14 A (no Fixed mode). D7 (Diagnostics) and D9 (tutorial card) are untouched.

In rows this pass did not rewrite, "the page" as the thing the shell talks to means the module,
and `__name` means `instance.api.name`. Reader-map tags in brackets as in the blueprint; `[gmt n]`
is `GMT-SYSTEMS.md` section n, whose file names I did not re-open.

## Rules for every package

- One agent, one package. A package **owns** the files listed; no other package in the same stage
  touches them. A file not listed under any package of the running stage is read-only for that stage.
- Each stage has one **integrator**. It owns the whole shared set, every stage, with no exceptions:
  `vite.config.ts`, `package.json`, `knip.json`, `launcher.html`, `deep-zoom.html`,
  `deep-zoom/main.tsx`, and with them `registerFeatures.ts`, `storeTypes.ts`, `panels.ts`,
  `setup.ts`, `DeepZoomApp.tsx`. It works twice: it **opens** the stage (about 15 minutes: lands the
  stage's new store-field types in `storeTypes.ts` and the widget ids the stage will register, so
  the other packages typecheck alone) and it **closes** the stage (wires everything, runs the gates).
- **Shell integrators land one at a time, in this order: 1, 2, 3, 4, N5, 5, 6a, 6b, 7.** L5 takes
  the first free slot after stage 5 once L0 to L4 are green. If N3 or N4 is not green when stage 4
  closes, stage 5 and then 6a open anyway on the module's own fly loop and N5 takes the next slot:
  the shell does not wait (DECISIONS K5). Packages of a later stage may be written early where
  "Needs" allows, but its integrator opens only after the previous one has closed.
- **One owner of `deep-zoom/renderer/core.js` at a time.** Module packages (M1 to M8, N4, L0) form
  one queue. Each says which kind it is. *Picture unchanged*: `npm run smoke:deep-zoom-parity`
  stays 47 of 47 and `npm run smoke:deep-zoom-direct` 11 of 11, and the package adds its own check
  for the new handle. *Picture changed on purpose*: it names the parity lines that move and the
  owner looks at the before and after. `core.d.ts` and the types in `index.ts` change in the same
  package. The frozen page (`mandelbulb_deepzoom`, 3b65946) is never edited.
- **Engine and GMT packages of stages N and L are guard-first**: the guard is written against
  today's code, falsified once, and only then is the code moved. Each one leaves GMT and this
  shell working, and they are strictly sequential inside their stage, so two packages never hold a file at
  the same time (N0 then N0b extend one test file; N2 then N3 both write `engine/plugins/navigation/`).
- **Every package has a gate it can run alone**: `npm run typecheck` plus the check script named in
  its row (`tsx debug/deep-zoom-checks/<name>.mts`, plain node, no browser). The end-of-stage smoke
  is the stage's gate, not a package's. Each smoke step's header names the package that owns the
  behaviour, so a red step has one owner.
- **The smoke is one file per stage**: `debug/deep-zoom-smoke/stageN.mts`, owned by that stage's
  smoke package. `debug/smoke-deep-zoom.mts` is the runner (written once in S1-3, after S1-A has
  moved the prototype's smoke off that name): it launches Chrome and runs every `stage*.mts` it
  finds in that folder, in name order. No later package edits the runner.
- The shell imports `DeepZoomHost` and the holder only. `deep-zoom/renderer`, `createDeepZoom`,
  `instance.api` and `api.dz` appear only under `deep-zoom/host/`. The stage-1 check greps for this.
- Custom widgets are registered (component registry, `hud.register`, `topbar.register`,
  `stepRenderers.register`), never mounted by hand. No `component: 'panel-X'` of our own.
- Labels: names and numbers. Stacking: `<Layer tier>` / `z('tier')`.
- New `@invariant` lines name the check or smoke step that proves them and are falsified first.

## Before stage 1

Nothing outside stage 1. No tag is needed any more: the prototype stays in the tree under its new
name until stage 7, so later stages port from files, not from `git show`. The first package of
stage 1 (S1-A) moves it aside. The prototype's name is settled: `deep-zoom-prototype`, dev-only
(DECISIONS K6, was O1).


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
| Renderer proofs | `npm run smoke:deep-zoom-parity`, `npm run smoke:deep-zoom-direct` | a module package changed the picture or a number it said it would not (47 and 11 lines today). Run when a stage contains a module package, and in stage 1 and stage 7 because the historical page's folder moves |
| Prototype smoke | `npm run smoke:deep-zoom-prototype` | the move in S1-A broke the prototype. Run in stage 1, then whenever a shared file it loads changes, until stage 7 removes it |
| Chrome smoke | `npm run smoke:chrome` | a top-bar control or menu item in any app throws |
| Sibling boot | `smoke:boot` for fluid-toy, fractal-toy **and app-gmt** | an engine package (E2, E36, E38, E22, E23) broke them |

`smoke:deep-zoom` runs **headed Chrome on ANGLE d3d11** (`--use-angle=d3d11`), never SwiftShader.
`smoke:chrome` may stay headless for this app: it only clicks chrome and fails on page errors. Note
its boot wait is 30 s (`debug/smoke-chrome.mts` `BOOT_TIMEOUT_MS`) and "booted" there means no layer
covers the viewport, so it clicks the top bar while the renderer may still be compiling. That is
intended. The renderer is a module in the shell's own document, so one `pageerror` listener sees
its errors too. One thing is unproven: "still compiling" holds only where the GPU has
`KHR_parallel_shader_compile`. Without it the deep shader compiles inside `createDeepZoom` on the
main thread (`deep-zoom/renderer/index.ts` header, BLOCKING COMPILES, about 15 s cold), and headless
Chromium runs SwiftShader. So S1-3's first step reads `gl.getExtension('KHR_parallel_shader_compile')`
under headless; if it is null, this app's `APPS` row runs headed on d3d11 like `smoke:deep-zoom`.
Also: `engine/TickRegistry.ts` `runTicks` catches a throwing tick and logs it once, so a `step` that
throws every frame raises no `pageerror`; the stage-1 smoke watches the console for that line.


## Smoke growth - `debug/deep-zoom-smoke/stageN.mts`

Each step's header records its owner and how it was falsified. Steps are never removed; a step
whose behaviour is replaced (the captured-mouse steps, at N5) is rewritten in the stage that
replaces it. "Captured" below means the pointer is locked on the picture, which exists only before
N5. Whether Playwright's click obtains pointer lock in headed Chrome is unverified; each captured
step first asserts `document.pointerLockElement` is set and reports **not proven** (a failure, not
a pass) if it is not.


| Stage | Steps added | Red if broken |
|---|---|---|
| 1 | no pageerror and no console line starting `[TickRegistry] tick "deepZoom.step" threw`; `TopBarHost` header exists and no dock element is rendered (`components/layout/Dock.tsx` returns null for a dock with no panel, and stage 1 has none); the adaptive badge is absent; exactly one `canvas#dz-render-canvas`, a child of `#dz-frame`; `host.ready` resolves inside 120 s; telemetry depth is finite; `host.frameCount()` rises while the engine loop runs; focus the picture, hold W 1 s, `getView().cam` strings changed; **open the project-name field for editing (`ProjectName.tsx` renders its `<input>` only while `editing`), hold `w` down in it for 1 s (`keyboard.down`, wait, `keyboard.up`), the strings are unchanged**; **press `C` with the picture focused, `host.getParams().color` is unchanged**; set a deep view with `host.setView` (the f32 picture at boot never accumulates), wait for `accumN` above 32, resize the window, `accumN` drops back (the still restarts); the top-bar fps reads above 0; source grep: `deep-zoom/renderer` is imported only under `deep-zoom/host/` | falsify, one each: remove the `registerTick` call (frame count stays 0); drop `keyTarget` (the held-key step goes red; a typed character alone could not, because the module moves from keys still held when `step` runs); pass `shortcuts: true` (the `C` step); drop `resetStillOnResize`; import `deep-zoom/renderer` from `DeepZoomApp.tsx` (grep) |
| 2 | **open every dock tab that exists: Formula, Light, Colour, Quality** and assert at least one slider row rendered in each (a section label does not count); no `[PanelRouter] widget ... not in componentRegistry` in the console; **every feature default equals `host.bootParams()` (the module's settings read at ready)** (the snapshot taken at ready, before the first push); drag Detail, `host.getParams().detail` changed; Ctrl+Z, it is back; set Shading to Classic, Light type row appears; depth readout text matches `/^\d\.\d\de-?\d+$/`; the status chip shows an iteration count and a drawn size; **captured: press Space and T, `isPlaying` stays false and the timeline's shown state is unchanged** | falsify: mistype one widget id in `panels.ts`; change one feature default; drop one key from `paramMap.ts`; remove `flyGuard.ts`'s registrations |
| 3 | Locations tab opens with a row; Settings shows the Autosave rows; press B, a row with a thumbnail and a depth line appears; rename it, the depth line is still there; save a deeper one, it sorts below; fly; press 1 (not captured), `getView().cam` equals the saved strings exactly; Ctrl+Z, the pre-jump strings are back; **captured: press 1, the view strings are unchanged**; serialize the scene, reload, load it, strings equal; the scene JSON has `documents['deep-zoom.locations']`; the share string decodes to the same view strings and contains no location rows; reload, the location row is still there; drop a last-week bookmark JSON, rows import; paste last week's flat location text, it jumps | falsify: route one `cam` value through `Number()`; drop the slot `when` |
| 4 | each engine key pressed with focus in the picture and again with focus in a panel changes the store exactly once, and the module's own value changes once, not twice; **captured: 9 / 0 change `dzColour.scale` and the view strings are unchanged; T / Y change `dzLight.lampFalloff` and the timeline does not open**; Help > Keyboard Shortcuts shows a row sourced from the registry; the lesson runs start to end; hold Shift and press B, a location is saved | falsify: pass `shortcuts: true` (the module's copy of the key fires too, the value moves twice) |
| N5 | **hold W 1 s with host input: `getView().cam` changed and the module's own fly loop moved nothing** (its key table stays empty); left-drag turns the view with no pointer lock; the wheel changes the SPD readout by a proportional step; `Space` rises and the timeline does not play; hold W across a panel click, the camera stops when the picture loses focus; fly speed reads 3.6 on a fresh scene; GMT: `smoke:orbit` and the N0b fly smoke stay green. The stage-4 captured steps are rewritten here for a free pointer | falsify: leave the module on its own input (it moves twice as far); remove the sink |
| 5 | open Colour, switch Gradient on, the editor is there; open My Gradients, click a tile, `dzColour.gradient` changed; with mode Orbit trap the centre pixel of a `thumbnail(64)` differs before and after | falsify: skip the ramp push |
| 6a | Flight tab opens; record a dive to 1e-12, the flight has more than 1 frame and track `camera.u` has keys; drag the strip's depth curve to the middle, `camera.u` is near 0.5 and the depth lies between the ends; set `camera.u` from the timeline, the strip's playhead line shows a depth; the strip shows a decades-per-second number and an estimate; drop a `gmt-mbulb-path` JSON, it loads as the flight and is not treated as a scene | falsify: make `seekPath` a no-op |
| 6b | press Render in the Flight strip, the engine dialog opens with size presets at the surface's aspect; render 4 frames at 320 px long edge, the file is larger than 0 bytes | falsify: unregister the popup |
| L5 | the Light panel shows the light list and the orb strip; **turn the pad, the centre pixel of a `thumbnail(64)` changes**; the attachment control offers Surface and Camera; a scene saved before L5 (five `dzLight` slider values) loads as the default Surface rig with the same centre pixel within the parity floor; in app-gmt the attachment control is unchanged and shows no Surface | falsify: skip the upload; drop the migration |
| 7 | every step of `debug/smoke-deep-zoom-prototype.mts` has a named step in stages 1 to 6b or in the N5 file, where the captured-mouse steps of stages 2 to 4 are rewritten (the mapping table in S7-1 has no empty row); after the prototype is deleted every stage file still passes and the parity smoke is 47 of 47 from the pinned file | falsify: leave one prototype step unmapped |

---

## Stage 1 - the shell boots on the engine's own chrome with the renderer in the viewport, and flies

What the owner sees: `deep-zoom.html` opens with the engine top bar (project name, fps, undo/redo,
settings, Update pill), empty docks, the live picture in the viewport frame, a status chip with the
depth. Click the picture, W A S D flies - on the module, mounted directly, stepped by the engine's
tick. The prototype is still there at `deep-zoom-prototype.html` with every panel it had; the new
shell's panels arrive over stages 2 to 6.

Five packages, one working session. Order: **S1-A first (the move; nothing new exists until it is
green). Then S1-0 (about an hour). Then S1-1, S1-2 and S1-3 are written side by side against S1-0's
types and the DOM ids in its header, and land in sequence: S1-1, S1-2, then S1-3 runs the smoke.**

| Id | Owns | Steps | Acceptance (can go red) | Needs |
|---|---|---|---|---|
| **S1-A Move the prototype aside (integrator, opens)** | the shared set, here with `vite.config.ts` and `knip.json`; the moved files of BLUEPRINT section 11 (`deep-zoom-prototype/**`, `deep-zoom-prototype.html`, `public/deep-zoom-prototype-core/`, `scripts/sync-deep-zoom-prototype-core.mjs`, `debug/smoke-deep-zoom-prototype.mts`); the three places `historicalPath` in `debug/smoke-deep-zoom-parity.mts` names the folder (the `path.join(ROOT, 'public', 'deep-zoom-core', 'index.html')`, the returned URL `/deep-zoom-core/index.html?embed=1`, and the check line's text) | Plain file moves, no commit. Fix the paths the table in BLUEPRINT section 11 lists. `package.json`: rename `smoke:deep-zoom` -> `smoke:deep-zoom-prototype` and `sync:deep-zoom-core` -> `sync:deep-zoom-prototype-core`; **add `"smoke:deep-zoom-parity": "tsx debug/smoke-deep-zoom-parity.mts"` and `"smoke:deep-zoom-direct": "tsx debug/deep-zoom-direct-check.mts"`** (neither proof has an npm script today). `knip.json`: entry `deep-zoom-prototype/main.tsx` replaces `deep-zoom/main.tsx`, and two entries are added, `debug/deep-zoom-smoke/*.mts` and `debug/deep-zoom-checks/*.mts` (today's `debug/*.mts` entry is top level only; the runner finds its stage files at run time and the checks are run by path, so knip would report both folders as unused files and `rules.files` is `error`). `vite.config.ts`: the input `'deep-zoom'` is removed, since it resolves `deep-zoom.html`. `deep-zoom.html` and `deep-zoom/main.tsx` do not exist again until S1-2, which puts the vite input and the knip entry back | `npm run typecheck`; `npm run smoke:deep-zoom-prototype` passes with the same steps as before the move (falsify: leave `CORE_SRC` on the old folder name, its ready step goes red); parity 47 of 47 and direct 11 of 11 (falsify: leave `historicalPath` on the old folder with the frozen repo present - the run stays 47 of 47 but prints the `serving the pinned file` line instead of the `public/deep-zoom-prototype-core/index.html is` line, so the guard is a grep for that line; with `DZ_SOURCE_REPO` missing the script throws before `historicalPath` runs whatever the path, which proves nothing - corrected by S1-A, 2026-10-08), and the run must print `historical page: public/deep-zoom-prototype-core/index.html is ...`, not the `serving the pinned file` line - a stale path falls through to the pinned file and stays green, so the printed line is the proof; `npm run build`; `npm run orphans` | owner call O1 (the name) |
| **S1-0 Host contract** | `deep-zoom/host/DeepZoomHost.ts`, `host/current.ts`, `host/telemetry.ts`, `debug/deep-zoom-checks/host-contract.mts` | Types from [host 2.2] with the member list of BLUEPRINT section 7. The header fixes the two DOM ids (`#dz-render-canvas`, and `#dz-frame` for the div it sits in). The interface has `frameCount(): number`; in stage 1 `getParams()` returns `api.dz.settings()` unmapped, until `host/looseParams.ts` lands in stage 2. Holder = `defineAppHandles<DeepZoomHost | null>('deep-zoom.host', null)`. Telemetry store with a selector hook, 8 Hz | typecheck; `host-contract.mts`: `DeepZoomHost.ts` has 0 `import` lines, and a grep of it for `Window`, `Document`, `DeepZoomInstance` finds nothing. Falsify: add `instance: DeepZoomInstance` to the interface | S1-A |
| **S1-1 Module host** | `host/moduleHost.ts`, `host/dive.ts`, `debug/deep-zoom-checks/module-host.mts` | `createModuleHost(instance, canvas)` (pure adapter) and `mountDeepZoom(frame, hooks)` (`frame` is the shell's own `#dz-frame` div, not an engine element) with `shellOptions(frame, hooks)` - the option table in BLUEPRINT section 7, taken from the header of `deep-zoom/renderer/index.ts`. Canvas created imperatively, removed in `dispose`. `bootParams` = `api.dz.settings()` read at ready, before any push. Dive loop from the prototype's `bridge.ts` -> `dive.ts`. `isCaptured` from `document.pointerLockElement`. `frameCount` from `instance.frameCount`. Telemetry and progress polled from `step` | typecheck; `module-host.mts` with a fake instance: three 80-digit `cam` strings come back byte-identical from `getView` and reach the fake's `setView` byte-identical (falsify: wrap one in `Number()`); `shellOptions` returns `autoStart:false, shortcuts:false, dropTarget:null, pointerLock:false, resetStillOnResize:true, loseContextOnDispose:true` and `keyTarget === frame` (falsify: flip one); `dispose` calls the fake's `dispose` before the canvas is removed | S1-0 |
| **S1-2 Boot and layout (integrator, closes)** | the shared set, plus `DeepZoomSurface.tsx`, `components/BootCard.tsx`, `components/StatusChip.tsx` | New `deep-zoom.html` and `main.tsx` (the vite input `'deep-zoom'` and the knip entry `deep-zoom/main.tsx` go back in) in fluid-toy's order [boot 1.2, 2.1]: `registerUI`, `installViewport({enabled:false})`, `installTopBar` + `unregister('adaptive')`, `registerCoreSettings({ autosave: null })` + settings gear, `installPwaUpdate`, `installShortcuts`, `installUndo`, `installMenu`, `installHud`, a minimal `installHelp`. No Camera plugin. Install chain in try / catch -> `initialError`. `DeepZoomApp.tsx` = fluid-toy's tree with granular selectors, plus two things `fluid-toy/FluidToyApp.tsx` does not have: `engine/components/MobileViewportShell.tsx` as the root and `engine/components/ToastHost.tsx` mounted (`onNotice -> showToast` shows nothing without it), **`<RenderLoopDriver/>` + `<EngineBridge/>`**. `DeepZoomSurface.tsx`: renders `<div id="dz-frame" tabIndex={0} className="absolute inset-0">` inside `<ViewportFrame showModeControls={false}>` (the engine's frame forwards no ref and takes no `tabIndex`) and runs on it the effect of BLUEPRINT section 7 (mount, holder, one `registerTick`, cleanup in reverse); the tick phase is chosen after reading where the animation engine writes; a click on the picture focuses the frame and requests pointer lock. Telemetry -> `viewport.reportRenderFps`. Splash `#dz-boot-splash` removed on the first picture, 12 s fallback. Empty manifest + feedback entry. Nothing is deleted | typecheck, `check:zindex`, `npm run build`, `npm run orphans` | S1-0; lands after S1-1 |
| **S1-3 Smoke and wiring** | `debug/smoke-deep-zoom.mts` (the new runner), `debug/deep-zoom-smoke/stage1.mts`, `debug/smoke-chrome.mts` (the `APPS` row), `.claude/rules/sibling-apps.md` (path + table rows) | Runner for the engine store (`window.__store`, set unconditionally in `store/engineStore.ts`), headed d3d11. It reads the host from `globalThis.__appHandles['deep-zoom.host']`, which exists on the dev server only (`engine/appHandles.ts`, gated by `import.meta.env.DEV`), so this smoke runs against `ENGINE_URL`, never a build. First step of the package: read `gl.getExtension('KHR_parallel_shader_compile')` under headless Chromium; if null, this app's `APPS` row runs headed on d3d11 (Gates). Stage-1 steps. The app in the chrome smoke, desktop viewport only. The rule row, with the guard it cites falsified. The integrator adds the `smoke:deep-zoom` script line for the new runner | `npm run smoke:deep-zoom`, `npm run smoke:chrome`, `npm run check:rule-guards` - run last | S1-2 landed |

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
| **S2-2 Light and colour features** | `features/light.ts`, `features/colour.ts` (mode and scale only; gradient is stage 5) | The 11 ranged light params; classic and new blocks by `condition`. The 17 unranged look fields are **not** added. `dzLight` is what lights the picture until L5. **Colour naming is decided (DECISIONS K8, was O3):** GMT's mode numbers (0, 1, 5, 7, 8, 13) and GMT's `scale` / `offset` / `bias` names, so a GMT colouring block reads across later with no migration [gmt 7.5] | typecheck | - |
| **S2-3 Param map and sync** | `host/paramMap.ts`, `host/looseParams.ts`, `deep-zoom/useHostSync.ts`, `debug/deep-zoom-checks/param-map.mts` | One table DDFS -> `DzParamId` with invalidation class. Per-key last-pushed cache; O-class keys debounced during a drag. On `ready`: push everything once (store wins). After `play` / a render resolves: re-push formula and quality. `looseParams.ts` is the id -> `api.set*` table (BLUEPRINT section 7); it never sends `setBla(true)` without the wait | typecheck; `param-map.mts`: every param id of every registered `dz*` feature has a map row and every map row names a real param. Falsify: delete one row | S1-1. **Module package M1** removes the interims: `iterations` through `setView({...getView(), iters})`; `flySpeed` writes `api.cam.baseSpeed = value / 60`; `normals` is followed by an empty `api.setLook({})` [params 1.3]; `autoIterations` and `actualPixels` have **no** interim and their rows stay out of the manifest until M1 |
| **S2-4 Engine: one overlay host (E2)** | `engine/plugins/viewport/FeatureOverlays.tsx` (new), and the four existing copies: `fluid-toy/components/DomOverlays.tsx` (deleted) with its one importer, `fractal-toy/FractalToyApp.tsx`, `app-gmt/AppGmt.tsx`, `components/ViewportArea.tsx` | Read all four first. Lift **one** host, starting from app-gmt's (per-overlay selectors; fluid-toy's header says a selector-less read "trips React's max-depth guard"). All four sites import it. If app-gmt's copy carries something the others lack (unverified), it becomes a prop, not a reason to keep a copy. Top-of-file JSDoc (purpose, seams, pitfalls). | typecheck; `smoke:boot` for fluid-toy, fractal-toy, app-gmt; `smoke:chrome`; `npm run orphans`; a grep for `getViewportOverlays().filter` finds 1 site, the new host (as built there were five loops, not four: `components/ViewportArea.tsx` also carried one for scene-type overlays, and the host takes `type` for it) | - |
| **S2-5 Depth instruments** | `components/DepthReadout.tsx`, `components/DepthScale.tsx`, `components/IterationReadout.tsx`, `components/FrameReadout.tsx`, `components/StatusChip.tsx`, `components/depthFormat.ts`, `deep-zoom/milestones.ts`, `features/camera.ts`, `debug/deep-zoom-checks/depth-format.mts` | Port from `ui/DepthGauge.tsx` (under `deep-zoom-prototype/`): depth, decades to the floor, magnification, the falling / rising decades-per-second line, the yardstick line, `Diving · from to target`, milestone toasts through `showToast`. Chip gains live iterations and drawn size. Readout sets React state only when the rounded value changes. `camera` feature: param `u`, `viewportConfig` for the scale. | typecheck; `depth-format.mts`: `6.4e-53` -> `6.40e-53`, `1.5` -> `1.50e0`, both match the smoke's regex | S1-0, S2-4 |
| **S2-6 Fly guard** | `deep-zoom/flyGuard.ts` | Shortcuts with `priority: 10` and `when: () => host.isCaptured()` on `t` and `Space` that consume the key and do nothing, so the timeline's own two (`engine.timeline.toggle`, `engine.timeline.toggle-play` in `components/TimelineHost.tsx`) do not fire while flying. Interim for gap E37. | typecheck | S1-0 |
| **S2-9 Pause controls** | `deep-zoom/pause.ts` | An `AccumulationController` adapter over `host.pause`, the sample target and reset; the integrator calls `installPauseControls()` only when the host reports the three handles [gmt 7.3] | typecheck; the stage-2 smoke gains "pause, `accumN` stops rising" when M5 has landed | **M5**; without it the package is written and not installed |
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
| **S3-1 Locations** | `deep-zoom/locations.ts`, `components/LocationsPanel.tsx` | `installStateLibrary` as BLUEPRINT section 1, with `slotShortcuts.when` and the panel's `sortBy` / `renderMeta` by depth; `jumpTo(loc, { keepLook })`; history providers `dzView` (`changeOf: seq`) and `savedLocations`; default label with the mantissa; one-time import of `gmt.deepzoom.bookmarks.v1`; the storage mirror (interim for E10). | typecheck | S3-0. **M8**: until then the readout lags a jump by a few frames |
| **S3-2 Scene state and session** | `deep-zoom/presetFields.ts`, `deep-zoom/documents.ts`, `deep-zoom/session.ts`, `debug/deep-zoom-checks/scene-roundtrip.mts` | Preset field `dzView` + the `dzInspect` reset + **the scene version stamp** (a number, 1 from the first saved file; L5's migration reads it - BLUEPRINT section 3, GMT-SYSTEMS 7.4); pending-view slot. Document providers `deep-zoom.path` and `deep-zoom.locations` (`registerDocumentProvider`, `store/documentRegistry.ts`). **First step: read where `restoreDocuments` is called relative to preset fields; if the order breaks a load, fall back to preset fields plus deleting the two keys before a share link.** Session adapter `{ view, flight }`, its own autosave settings store. | typecheck; `scene-roundtrip.mts`: a location row and a view go through serialize / restore with every `cam` string byte-identical, and the restored scene carries the version stamp (falsify: drop the stamp) | S1-0 |
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
| **S4-1 Hotkeys** | `deep-zoom/hotkeys.ts`, `deep-zoom/flyGuard.ts` | The table in BLUEPRINT section 9; `B` and `M` twice (with Shift); `deep-zoom.cancel` with `when: busy`. Captured-only bindings at `priority: 10`: `9` / `0` palette scale, `T` / `Y` lamp falloff (the `t` do-nothing guard from stage 2 is replaced by the falloff binding). Nothing to switch off at ready: the module was created with `shortcuts: false` in stage 1. No letter the module still reads (W A S D Q E) is registered | typecheck | - . M6 turns the `shortcuts` / `keyTarget` assumptions in `renderer/index.ts` into tested claims |
| **S4-2 Help** | `help/topics.ts`, `help/installDeepZoomHelp.tsx` | Seven topics from last week's Help tabs; generated shortcuts page; What's New (the key changes of DECISIONS D3 are its first entry) with its own `seenKey`. | typecheck | S4-1 (reads the registry at open time, no import) |
| **S4-3 Tutorial** | `tutorial/firstDive.ts`, `tutorial/steps.tsx`, `tutorial/hostEvents.ts` | Lesson 1; step kinds `dz-dive`, `dz-record-dive`; `hostEvents.ts` turns host events and telemetry into `actionBus.fire(...)`. No step relies on `onExit`. | typecheck; manual: the card does not take focus from the picture (unverified today) | S3 for `jumpTo`; the recording step is added to the lesson in stage 6a |
| **S4-4 Integrator** | the shared set | `installHelp` full options, `installTutorial`, `registerLessons`, `help.registerHudHint`, mount `TutorialRunner` / `TutorialOverlay`. | all gates | S4-1..3 |
| **S4-6 Smoke** | `debug/deep-zoom-smoke/stage4.mts` | The stage-4 steps. | `npm run smoke:deep-zoom` | S4-4 |

---

## Stage N - GMT's navigation flies the deep zoomer (rework, guard first)

What the owner sees at N5: W/S, A/D, Space/C, Shift, left-drag look, the wheel for speed, a level
horizon - GMT's hands, on GMT's code. Fly speed 3.6 by default in a 0.01..8 range, shown as a
number. In GMT nothing changes at any step. **Until N5 the shell flies on the module's own loop**
(stage 1): W A S D Q E, Shift, captured-mouse look.

Placement [gmt 7.1]: N0, N2, N0b and N3 touch engine and GMT files only and can start beside
stage 2. N4 takes a slot in the module queue. N5 is a shell integrator slot after stage 4 (keys)
and, if N3 and N4 are green by then, before 6a, so flights are recorded with the final controls.
Sizes are sessions, from [gmt 3.4]; about 3 in the engine and GMT, 1 in the module, 1.75 in the shell.

| Id | Where / owns | Steps | Acceptance (can go red) | Size |
|---|---|---|---|---|
| **N0 Replay guard** | new node test under `debug/`; `.claude/rules/navigation.md` Guards block | Against **today's** code: a fixed input script through `CameraController.update`, the emitted displacements recorded. Includes held Shift at a tiny distance (the `1e-4` floor) and `autoSlow: false` | the test passes on today's code and goes red when `DIST_INCREASE_LERP_RATE` is changed (the falsification, done once before it is cited); `npm run check:rule-guards` | 0.5 |
| **N2 Integrator into the engine** | `engine/plugins/navigation/` (new), `modifiers.ts` moves with it, `engine-gmt` re-exports | The fly integrator with a displacement sink and the two floors as settings (seam S1). GMT passes today's values. ADR "Navigation emits displacements" written here | N0 gives the same numbers to the last bit; `typecheck`; `smoke:engine-gmt`, `smoke:orbit` | 0.75 |
| **N0b Input-hook guard** | N0's test extended; a fly step in `smoke:orbit` or a sibling | Against today's code: the replay drives the hook's output shape (key down and up, wheel, drag delta) through to displacements; a smoke that holds W for N frames and asserts `sceneOffset` moved along the view direction | both pass on today's code; both falsified once | 0.5 |
| **N3 Renderer-free input hook** | the hook in `engine/plugins/navigation/`; GMT's `useInputController` becomes the wrapper | The widened contract of [gmt 3.2 e]: a wheel-step function, a suppress predicate, three activity edges (seam S7) | N0b identical; `smoke:orbit` for drag; `typecheck`. Whether `test:interaction*` reaches the hook is unverified | 1.25 |
| **N4 Module: host input** | `deep-zoom/renderer/core.js`, `core.d.ts`, `index.ts`; `debug/deep-zoom-checks/input-owner.mts` | `api.dz.setInputOwner('module' or 'host')`, `api.dz.rawDistance()`, `api.dz.setYawPitch(yaw, pitch)` if roll stays off (GMT-SYSTEMS 8.3, open: with roll on this is a basis input instead, and the size is the upper figure); the module keeps computing `rawDist` / `smoothedDist` under host input; `moveAlong` typed as product API. Picture unchanged | parity 47 of 47, direct 11 of 11; the check: under `'host'`, a `keydown` for `KeyW` followed by 60 `step` calls leaves `getView().cam` unchanged, and `moveAlong` still moves it. Falsify: skip the owner test in the fly loop | 0.75 to 1.35 |
| **N5 Shell navigation (integrator)** | the shared set, `deep-zoom/navigation.ts`, `deep-zoom/hotkeys.ts`, `host/telemetry.ts`, `tutorial/hostEvents.ts`, `tutorial/firstDive.ts`; deletes `deep-zoom/flyGuard.ts`; `debug/deep-zoom-smoke/stageN5.mts` | Mount the hook on the viewport frame; run the integrator on a tick with `autoSlow: true` and the module's raw distance; level the quaternion and write yaw / pitch back each frame; sink -> `host.moveAlong([dx,dy,dz], 1)` with the 0.2 clamp; proportional wheel step; `isSuppressed` over the timeline; DST / SPD readouts; home / step back; switch the module to host input; the key changes of BLUEPRINT section 9; **what replaces capture**: the hook's activity edges set a `flying` flag in the telemetry store, the overlay fade reads it in place of `isCaptured()`, and the tutorial's first step waits on `dz.flying` in place of `dz.captured` (BLUEPRINT section 10) | the N5 smoke row; all shell gates; GMT's N0, N0b and `smoke:orbit` still green | 1.75 |

Later, not in this stage [gmt 3.4]: N6 (a distance source and HUD predicates so the shell mounts
GMT's HUD cluster, 1.5), the module's field-of-view variable, the camera-undo provider.

---


## Stage 5 - gradients from the engine's editor and My Gradients

What the owner sees: a Gradient switch and the full stop editor in Colour; the My Gradients shelf
with "Deep Zoom - Gradient" as a destination; a gradient made in Gradient Explorer is one click away.

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S5-1 Gradient param and push** | `features/colour.ts`, `deep-zoom/colourSync.ts`, `host/gradientPush.ts` | `useGradient` + `gradient`; setting a gradient in Plain mode also sets Orbit trap; push ramp then mode; one push per animation frame with a sequence counter. A dropped image is claimed by the engine's drop zone and handed to `api.loadGradient(file)` (the module's own drop listener is off). No stage-3 or stage-4 package owns `features/colour.ts`, so writing this early collides with nothing | typecheck; `param-map.mts` still green; on a real GPU **check the colours against the editor swatch** - whether the module treats the strip as display or linear is unverified [palette G8] | stage 2. **M2**; interim: a 256 x 1 PNG through `api.loadGradient` [palette 2.3] |
| **S5-2 Integrator** | the shared set | `registerPaletteUI()`, send target with `editsParam`, `favientsPanelEntry`, `mountFavientsPanel` after the manifest with its own `storageKey`, the toggle button. Opens after stage 4's integrator has closed. | all gates; red if `mountFavientsPanel` runs before the manifest (the panel never opens) | S5-1 |
| **S5-3 Smoke** | `debug/deep-zoom-smoke/stage5.mts` | The stage-5 steps. | `npm run smoke:deep-zoom` | S5-2 |

---

## Stage L - GMT's Light Studio lights the deep zoomer (rework by route A, guard first)

What the owner sees at L5: the Light panel is GMT's - the light list, the orb strip, aim by drag -
with the attachment "Surface" (same behaviour, same name) and Camera. In GMT nothing changes: its
attachment control stays as it is and shows no Surface until GMT can fit a surface plane itself.
**Until L5 the shell lights with the plain `dzLight` sliders of stage 2.**

Placement [gmt 7.4]: L0 takes a slot in the module queue at any time. L-guard and L1 to L4 are GMT
files only and can start beside stage 2. L5 is a shell integrator slot after stage 5. Route A only:
the module keeps its own shading pass and takes N lights; assembling that pass from GMT's shading
chunks (route B) is after stage 7 and is its own decision (GMT-SYSTEMS 8.8). Sizes from [gmt 4.5]:
about 7 to 9.5 sessions in GMT, 1.5 in the module, 2 to 2.5 in the shell.

| Id | Where / owns | Steps | Acceptance (can go red) | Size |
|---|---|---|---|---|
| **L-guard** | three new guards under `debug/`, GMT side | Written first, against today's code: (1) a light round-trip node test with real scenes - one `fixed: true` preset, one flat-key preset, one partial merge; (2) a packing test with a non-zero modulation entry for each of the 8 `LIGHT_PROPS` and one `fixed: true` light; (3) a smoke that toggles attachment through each of the three toggles and asserts the light's screen position does not jump | each passes on today's code and each is falsified once before any light code moves | 1 |
| **L0 Module: N lights** | `deep-zoom/renderer/core.js`, `core.d.ts`, `index.ts` | An N-light loop in the shading pass with three placement modes; `api.dz.setLights(packed)`; the default rig reproduces today's frame | parity 47 of 47 with the default rig (picture unchanged); a second light at a known direction changes the centre pixel | 1.5 |
| **L1 Light list split** | GMT's `LightingFeature` | The list split out, same feature id `lighting`, same key `lights`, same short ids | L-guard (1); `typecheck`; `smoke:engine-gmt` | 1 |
| **L2 Packing as a function** | GMT's light sync | `packLights(lights, viewFrame, modulations, targets)`; `syncFrame` calls it, writing in place (seam S6) | L-guard (2), bit-equal before and after | 0.75 to 1 |
| **L3 View frame** | the four light UI files | View-frame values (seam S3; the ADR "Lights resolve against a view frame" is drafted here and finished in L4); the UI stops importing `getProxy` / `ViewportRefs`; seven conversion sites onto one helper, each toggle keeping what it writes today | L-guard (3) for each toggle; `smoke:chrome` | 2.5 to 3 |
| **L4 Third frame and length scale** | GMT's light model and attachment control | `frame: 'surface'` with its two write rules, `lightFrame`, `lengthScale` declared on the view frame (seam S4), a control that lists the frames the renderer declares - in GMT that is today's two, so GMT shows no Surface (DECISIONS K4). ADR "Lights resolve against a view frame", drafted in L3, is finished here | L-guard (1) extended: a Surface light opened without Surface support reads as Camera; `{ fixed }` merged onto a Surface light clears `frame`; app-gmt's control renders the same two options (smoke step) | 1.5 to 2.5 |
| **L6 Orb strip lifted** - only if entangled | `CenterHUD.tsx` | The strip becomes its own component | `smoke:chrome` | 0.5 to 1 |
| **L5 Shell lighting (integrator)** | the shared set, `deep-zoom/lighting/**`, `deep-zoom/handoff.ts`, `features/light.ts`, `deep-zoom/presetFields.ts` (the migration), `debug/deep-zoom-smoke/stageL5.mts` | The shell's `lighting` feature (light list + its own shadow group); the deep view frame; mount the orb strip and the panel; pack with an empty modulation map (DECISIONS D12, open, recommended: no light modulation in v1; GMT-SYSTEMS 4.5 says "its modulation map" for the other answer) and upload through `setLights`; Cast Shadows cap; the default Surface rig; aim by drag. **One migration**: `keyElevation`, `keyTurn`, `lightTint`, `lightType`, `lampFalloff` leave `dzLight` and become the default Surface rig; saved places and flight paths made before L5 go through it too | the L5 smoke row; `debug/deep-zoom-checks/light-migration.mts`: a pre-L5 scene's five values give the rig whose packed first light equals the module's old key light (falsify: drop one field) | 2 to 2.5 |

---


## Stage 6a - a dive on the timeline: record, scrub, lossless frames

What the owner sees: the Flight tab. Record a dive; it lands on the timeline as one track; the
strip's depth curve scrubs it and shows the depth at the playhead; Space previews (mouse free);
length in seconds, decades per second, an estimate; "Render PNG sequence (ZIP)" and still export.
No engine render dialog yet. **Does not wait for any module package.**

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S6a-1 Flight state** | `deep-zoom/flight.ts`, `features/flight.ts` | `dzPath` history provider; record stop -> smooth -> track (one undo snapshot) with the default curve of BLUEPRINT section 8; the `camera.u` subscription -> `host.seekPath(path, u)` with the module's ease off; the `deep-zoom.path` claim; `registerCameraKeyTracks(['camera.u'])`. | typecheck | stage 3. **M4 seekPath**; interim: `__samplePath(p, u x lastT)` - by time, so a scrubbed frame does not match a rendered frame, and the strip says so |
| **S6a-2 Flight strip** | `components/FlightStrip.tsx`, `deep-zoom/flightMath.ts`, `debug/deep-zoom-checks/flight-math.mts` | Port the top half of `ui/RecordPanel.tsx` (under `deep-zoom-prototype/`): Record / Smooth / Preview; the depth curve as a scrubber bound both ways to `camera.u` (Left / Right, Shift = 1 s); the playhead line `t 4.2 s / 10.0 s · frame 126/300 · 6.40e-53`; Go to start, Go to deepest; length typed as seconds or m:ss (writes the timeline length and rescales the keys); fps 24 / 30 / 60; decades per second **read from the key curve at the playhead**; the estimate before a render. | typecheck; `flight-math.mts`: a straight 0 -> 1 curve over 10 s on a 30-decade flight gives 3.0 decades/s at every sample; rescaling 10 s to 20 s halves it | S6a-1 for the store field name only (frozen by the integrator's open step) |
| **S6a-3 Still and ZIP** | `components/StillExport.tsx`, `components/RenderProgress.tsx`, `deep-zoom/zipRender.ts` | Still export saves the blob with the scene embedded. ZIP = the module's own path render, which downloads the ZIP parts itself (`core.js` `dlBlob(makeZip(...))`; M6 leaves that one download in place, BLUEPRINT section 7): cancel with the "finished frames are saved as a partial ZIP" confirm, the ffmpeg line with Copy, and one line stating that this route uses the module's own smooth-step timing, not the timeline curve (the module applies `easeInOut` itself). | typecheck | S1-1 |
| **S6a-4 Integrator** | the shared set, `tutorial/firstDive.ts` (adds the recording step, ending with the Flight tab active) | The Flight tab; register the widgets; HUD progress. | all gates | S6a-1..3 |
| **S6a-5 Smoke** | `debug/deep-zoom-smoke/stage6a.mts` | The stage-6a steps. | `npm run smoke:deep-zoom` | S6a-4 |

## Stage 6b - video from the engine's render dialog

**Entry gate: module package M4 (`seekPath` by arc and `renderFrame` to memory) has landed, with
the parity and direct proofs green.** It is our own file now, not the owner's page, so the gate is
a dependency and not a wait on anyone. Until then the dialog is not installed - never a control
the renderer cannot honour.


| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S6b-1 Runner** | `deep-zoom/exportRunner.ts`, `deep-zoom/renderPresets.ts`, `components/RenderEstimateRows.tsx` | Copy fluid-toy's runner skeleton; per frame scrub -> `host.renderFrameBlob({ path, u, longEdge, samples })` -> encode; first frame and every resume pass a fresh light rig [timeline G12]. `renderPresets.ts`: 720 / 1080 / 1440 / 2160 long edge at the surface's aspect, for the dialog's `resolutionPresets` (function form). `RenderEstimateRows` = the dialog's `extraInfoRows`: the estimate. | typecheck | M4 |
| **S6b-2 Engine: open the dialog from anywhere, wider encoder input (E22, E23)** | `engine/animation/renderPopupRegistry.ts`, `engine/export/videoEncoder.ts` | `openRenderPopup()` beside today's three exports (`registerRenderPopup`, `getRenderPopup`, `subscribeRenderPopup`); `encodeCanvas(source: CanvasImageSource, ...)` (today `HTMLCanvasElement | OffscreenCanvas`). | typecheck; `smoke:chrome`; fluid-toy's and app-gmt's export still typecheck | - |
| **S6b-3 Integrator** | the shared set, `components/FlightStrip.tsx` (the Render button's one line) | `installRenderDialog` with `defaults` 10 s, 30 fps, 4 samples, `resolutionPresets`, `extraInfoRows`; the ZIP route also as `registerRenderAdjunct`; a File-menu "Render..." row; the strip's Render button calls `openRenderPopup()`. | all gates | S6b-1..2 |
| **S6b-4 Smoke** | `debug/deep-zoom-smoke/stage6b.mts` | The stage-6b steps. | `npm run smoke:deep-zoom` | S6b-3 |

---

## Stage 7 - the prototype is removed; docs; close-out

| Id | Owns | Steps | Acceptance (can go red) | Needs |
|---|---|---|---|---|
| **S7-1 Remove the prototype (integrator)** | the shared set; `deep-zoom-prototype/**`, `deep-zoom-prototype.html`, `public/deep-zoom-prototype-core/`, `scripts/sync-deep-zoom-prototype-core.mjs`, `debug/smoke-deep-zoom-prototype.mts`; `debug/deep-zoom-smoke/stage7.mts` | First a table: every step of the prototype's smoke against the stage step that covers it. Only when no row is empty: delete the files and their `package.json` and `knip.json` rows (the `sync:deep-zoom-prototype-core` script line among them) and the `./deep-zoom-prototype/**` glob in `tailwind.config.js`. The parity smoke then reads the historical page from the pinned file | the stage-7 smoke row; `npm run orphans`; parity 47 of 47 with the folder gone; `npm run build` | stages 1 to 6b closed; the owner has said the new shell matches |
| **S7-2 Docs** | `deep-zoom/README.md`, `docs/modules/deep-zoom/index.md`, `HANDOFF.md` entry | The map page with a "where to start" table; `npm run context:map` | `npm run context:check` | - |
| **S7-3 Remove interims** | `host/looseParams.ts`, `host/gradientPush.ts` (the PNG route), the polling in `host/moduleHost.ts` | Delete each interim whose module package landed; bump `api.dz.version` | the smoke | the M packages |

Stage L may still be open when stage 7 closes; neither waits for the other.

---

## M packages - changes to the module `deep-zoom/renderer/`

These were "small handles added to the page" in the first version. The page is frozen; every one
is now a change to `core.js`, `core.d.ts` and `index.ts`, additive inside `api.dz`, in the single
module queue (rules above). All are *picture unchanged*: parity 47 of 47 and direct 11 of 11 stay
green, and each adds a check of its own. The shell works on the interim until each lands, except
stage 6b.

| Id | Change | Its own check (goes red when the handle is wrong) | Unblocks | Shell runs on until then |
|---|---|---|---|---|
| M6 | The option seams proven: one test drives a key, a drop, a click, a resize and a context loss through `keyTarget`, `shortcuts`, `dropTarget`, `pointerLock`, `resetStillOnResize`, `onContextLost` - the `@assumption` in `renderer/index.ts` becomes an `@invariant`. Fly keys ignore events with Ctrl, Alt or Meta down. No `alert` and no download under `embed`, with one download left in place: the path render's ZIP parts (`dlBlob(makeZip(...))`), which S6a-3 is built on | each seam's line goes red with that option's branch removed | trust in stage 1 and S4-1 | the options as written, untested |
| M1 | `api.dz.params()`, `api.dz.set(patch)`, `api.dz.schema()` from the `CTLS` rows given ids; setters for iterations, auto iterations, actual pixels, fly speed [host 2.4] [params 5] | `set` then `params` round-trips every id; `schema` ranges equal BLUEPRINT section 3 | S2-3 fully; boot-time range check | `host/looseParams.ts`; two rows left out |
| M4 | `api.dz.seekPath(path, u, ease)` with `ease` off-able; `api.dz.renderFrame(req)` -> pixels or blob; the render's frame waits ride `step`, not requestAnimationFrame | a frame rendered at `u` equals the still at the same view within the parity floor | S6a-1 exact scrub; **all of stage 6b** | scrub by time through `api.samplePath`; **none for render** |
| M2 | `api.dz.setGradientTexels(rgba, width)` without the colour-mode flip | the centre pixel follows a two-colour ramp; the colour mode is unchanged after the call | S5-1 | the PNG route, asynchronous |
| M8 | `setView` resets the depth smoothing | telemetry depth equals the new view's distance on the next `step` | S3-1 | the readout lags a jump by a few frames |
| M3 | `api.dz.on(fn)` events: param changed, recording, progress, compile, error | each event fires once for its cause | S6a-3 progress, S2-3 write-back | polling from the tick |
| M5 | `api.dz.pause(on)`, a sample-target setter, a public reset; compile state | paused: `accumN` and `frameCount`-driven work stop; reset: `accumN` returns to 0 | S2-9; a tab hidden or a GPU reset handled well | none |
| N4, L0 | see stages N and L | - | N5, L5 | the module's own fly loop; the `dzLight` sliders |

Order of value: M6, M1, M4, M2, M8, M3, M5; N4 and L0 enter the same queue when their stage
reaches them. Not planned: a field of view in views (GMT-SYSTEMS "Later").


## Dependencies at a glance

```
S1-A (move the prototype aside, npm scripts) -> S1-0 -> (S1-1 | S1-2 | S1-3 written together) -> land S1-1 -> S1-2 -> run S1-3
Shell integrators:   1 -> 2 -> 3 -> 4 -> N5 -> 5 -> 6a -> 6b -> 7      L5: first free slot after 5, once L0..L4 are green
Module queue:        M6 -> M1 -> M4 -> M2 -> M8 -> M3 -> M5, with N4 and L0 inserted (one owner of core.js at a time)
Engine + GMT:        N0 -> N2 -> N0b -> N3        L-guard -> L1 -> L2 -> L3 -> L4 (-> L6)     both can start beside stage 2
N3 + N4 -> N5        L0 + L4 -> L5        M4 -> Stage 6b        M5 -> S2-9 installed
S5-1 may be written any time after stage 2; S6a-2 and S6a-3 any time after stage 3
Stage 7 removes the prototype; it does not wait for stage L
```

## What is not verified and could move a package

- Which tick phase the animation engine writes `camera.u` in - decides the phase of
  `deepZoom.step` (S1-2 reads it; the 6a smoke is the proof).
- Whether StrictMode's double mount restarts the 15 s deep compile in dev.
- Whether a Playwright click obtains pointer lock in headed Chrome - decides whether the captured
  steps prove anything before N5 (they report "not proven" if not).
- The six option seams of the module (`keyTarget`, `shortcuts`, `dropTarget`, `pointerLock`,
  `resetStillOnResize`, `onContextLost`): added by reading, no test drives them
  (`deep-zoom/renderer/index.ts`, the `@assumption` lines). Stage 1's smoke is their first test; M6
  is the lasting one.
- Signatures of the loose `api.*` handles beyond those typed in `index.ts` - S2-3's first job.
- Whether `api.dz.diveTo` still overshoots as the page's did - decides whether `host/dive.ts` stays.
- Where `restoreDocuments` runs relative to preset fields - decides S3-2's carrier for the flight
  and the locations (fallback written in its row).
- What app-gmt's overlay host carries beyond the other three copies (S2-4 reads all four first).
- Whether a non-GMT shell has a menu row for Advanced mode (S2-7 adds one if not).
- A saved PNG from the module's canvas being non-blank (`preserveDrawingBuffer`) - decides S3-6.
- The tutorial card taking focus from the picture - decides DECISIONS D9.
- Every GMT file name in stages N and L: taken from `GMT-SYSTEMS.md` 3.4 and 4.5, not re-opened
  here. Its own "unverified" list is its section 9.
- What a cancelled MP4 leaves on disk (stage 6b manual check).
- `deep-zoom/renderer/port/port.mjs` and what its `--check` does after a direct edit of core.js
  (not opened; the index.ts header says it reports a hand edit).
