# Reconcile check - stage-1 builder

2026-10-08. Checker pass over BUILD-PLAN.md stage 1 (rows S1-A, S1-0, S1-1, S1-2, S1-3, the gates,
the stage-1 smoke row) and BLUEPRINT.md sections 7 and 11, against the source. Nothing was run.
Only what was opened is reported.

Files opened: `deep-zoom/renderer/index.ts` (whole), `deep-zoom/renderer/core.d.ts` (whole),
`deep-zoom/renderer/core.js` (lines 196-235 and greps for the option seams, the key listeners,
`step`), `fluid-toy/main.tsx` (whole), `fluid-toy/FluidToyApp.tsx` (the returned tree, lines
150-250), `engine/plugins/Viewport.tsx` (`installViewport`, `viewport`),
`engine/plugins/viewport/ViewportFrame.tsx` (whole), `engine/TickRegistry.ts` (whole),
`engine/plugins/RenderLoop.tsx` (whole), `engine/plugins/Shortcuts.ts` (`installShortcuts`),
`engine/appHandles.ts` (`defineAppHandles`), `engine/plugins/TopBar.tsx` (grep),
`engine/plugins/topbar/FpsCounter.tsx` and `ProjectName.tsx` (grep), `knip.json` (whole),
`vite.config.ts` (the workbox globs and the `deep-zoom` input), `package.json` (grep),
`debug/smoke-deep-zoom.mts` and `debug/smoke-deep-zoom-parity.mts` (grep), `debug/smoke-chrome.mts` (grep).

## Verdict

Stage 1 is buildable: every engine and module call it names exists with the signature it assumes,
one driver calls `step`, and the StrictMode plan matches the module's stated pitfall. Nine things
would stop a parallel build tomorrow or let a gate pass without proving anything. Three are wrong
as written (1, 2, 3), four are missing (4, 5, 6, 7), two are weak (8, 9).

## Calls that exist as the plan says (checked)

| Plan names | Found |
|---|---|
| `createDeepZoom(canvas, options)` -> `{ canvas, api, frameCount, disposed, contextLost, step(now?), dispose() }` | `deep-zoom/renderer/index.ts` `createDeepZoom`; `core.d.ts` `DeepZoomCoreInstance` |
| the ten options in BLUEPRINT section 7's table | all in `core.d.ts` `DeepZoomCoreOptions`, same names and defaults |
| `api.dz.telemetry / settings / getView / setView / thumbnail / diveTo` | `index.ts` `DzHostHandle` |
| `registerTick(name, phase, fn)` returns a disposer; `TICK_PHASE` 0..3 | `engine/TickRegistry.ts` |
| `<RenderLoopDriver/>` calls `runTicks(dtSec)` on requestAnimationFrame | `engine/plugins/RenderLoop.tsx` |
| `installViewport({ enabled: false })` | `engine/plugins/Viewport.tsx` `installViewport(options?: Partial<ViewportAdaptiveConfig>)`; fluid-toy passes `enabled` |
| `viewport.reportRenderFps(fps)`; the top-bar counter shows it | `Viewport.tsx` `viewport.reportRenderFps`; `FpsCounter.tsx` `primaryFps = renderFps >= 0 ? renderFps : fpsSmoothed` |
| `installTopBar()` then `topbar.unregister('adaptive')` | `TopBar.tsx` registers `id: 'adaptive'` (the `unregister` method itself was not opened) |
| `registerCoreSettings({ autosave: null })`, `installPwaUpdate`, `installShortcuts`, `installUndo`, `installMenu`, `installHud`, `installHelp` | all imported and called in `fluid-toy/main.tsx` |
| `defineAppHandles<T>(name, initial)` | `engine/appHandles.ts` |
| `window.__store` set unconditionally | `store/engineStore.ts` (`(window as any).__store = useEngineStore`) |
| `showToast`, `ToastHost`, `MobileViewportShell` | `engine/store/toastStore.ts`, `engine/components/ToastHost.tsx`, `engine/components/MobileViewportShell.tsx` |

## StrictMode and the canvas (checked)

- The plan (imperative canvas in the effect, `loseContextOnDispose: true`, `canvas.remove()` in
  cleanup) is exactly the REMOUNTING advice in the `index.ts` header. It survives mount, unmount,
  mount: each mount has its own canvas and context.
- `registerTick('deepZoom.step', ...)` under the double mount: the first cleanup removes the entry
  (`registerTick`'s disposer splices by reference), so the second registration is not dropped by
  the duplicate-name rule. Cleanup order in the plan (unregister, clear holder, dispose) is right.
- A late call is harmless: `core.js` `step(now) { if (!dzDisposed) frame(...) }`.
- Cost, already listed as unmeasured: in dev the create runs twice. Where the GPU has no
  `KHR_parallel_shader_compile` the deep shader compiles inside the create call ("about 15 s cold",
  `index.ts` BLOCKING COMPILES), so dev boot could block twice.

## Who calls step (checked)

One driver. `RenderLoopDriver` -> `runTicks` -> the `deepZoom.step` tick -> `host.step`. With
`autoStart: false`, `core.js` `dzScheduleFrame` returns before `requestAnimationFrame`
(`if (dzDisposed || !dzAutoStart) return`). A second driver can only appear if `autoStart` is left
at its default; S1-1's `shellOptions` check covers that. Path preview, export frame waits and
`api.dz.diveTo` still run on the browser's own requestAnimationFrame (header); stage 1 uses none of
them except `host/dive.ts`, which is the shell's own loop.

## Keys (checked)

- `core.js` listens for `keydown` / `keyup` on `dzKeyTarget` only, records `keys[e.code]`, and
  returns before any shortcut when `dzShortcuts` is false. No `preventDefault`. With `keyTarget`
  set it also clears held keys on the target's `blur` and the window's `blur`.
- The engine's listener is on `window`, bubble phase (`Shortcuts.ts` `installShortcuts`,
  `capture ?? false`), so the module's listener on the frame runs first and an engine shortcut
  cannot hide a key from it. Every key pressed on the picture also reaches the engine dispatcher.
  In stage 1 nothing the plan installs binds W A S D Q E.
- Mouse-look: `core.js` `dzListen(window, 'mousemove', ...)` returns unless
  `document.pointerLockElement === canvas`, so the shell's own `canvas.requestPointerLock()` on a
  click is enough with `pointerLock: false`.
- Modifiers are not checked until M6: Ctrl+S on the picture flies backward while held.

## Findings

### 1. WRONG - "the viewport frame element, given tabIndex = 0" cannot be reached
BLUEPRINT section 7 option table (`keyTarget`, `sizeElement`), BUILD-PLAN S1-1 `mountDeepZoom(frame, hooks)`.
`ViewportFrame` (`engine/plugins/viewport/ViewportFrame.tsx`) keeps its outer div in a private
`outerRef`, forwards no ref, and has no `tabIndex`, `id` or event props (`ViewportFrameProps`:
`children, showModeControls, shouldResize, className, innerClassName, fixedPadding, outerOverlay`).
Children land in the inner sized div, which also holds `CompositionOverlay`.
Fix: say that `DeepZoomSurface` renders its own `<div id="dz-frame" tabIndex={0} className="absolute inset-0">`
as a child of `<ViewportFrame>` and that div is `frame` (key target, size element, scaffold parent,
canvas parent). Put the id in S1-0's header beside `#dz-render-canvas`. Reword the smoke step to
"a child of `#dz-frame`". Also decide `showModeControls`: it defaults to true, and in Fixed mode
the inner div is `fw x fh` under a CSS scale, which the module would read as its size.

### 2. WRONG - S1-A leaves the tree unbuildable until S1-2
BUILD-PLAN S1-A: "`deep-zoom.html` and `deep-zoom/main.tsx` do not exist again until S1-2";
BLUEPRINT section 11: "`vite.config.ts` input `'deep-zoom'` stays".
`vite.config.ts` line 166 resolves `deep-zoom.html` as a build input and `knip.json` lists
`deep-zoom/main.tsx` as an entry. Between S1-A and S1-2 `npm run build` has a missing input, and
S1-A's own gate list includes `npm run orphans` with an entry that is not there.
Fix: S1-A removes the vite input and the knip entry (or leaves a three-line placeholder
`deep-zoom.html`), and S1-2 puts them back. Say which.

### 3. WRONG - the new smoke and check folders are orphans to knip
`knip.json` entries are `debug/smoke-*.mts`, `debug/test-*.mts`, `debug/*.mts` - top level only -
and `rules.files` is `error`. `debug/deep-zoom-smoke/stage1.mts` is found by the runner at run
time ("runs every `stage*.mts` it finds"), and `debug/deep-zoom-checks/*.mts` are run by path, so
knip sees no import of either and `npm run orphans` (a stage-1 gate) goes red.
Fix: S1-A adds `debug/deep-zoom-smoke/*.mts` and `debug/deep-zoom-checks/*.mts` to `knip.json`
`entry`.

### 4. MISSING - the stage-1 smoke reads things the host does not expose
Smoke row, stage 1: "the module's `frameCount` rises", "`settings().color` is unchanged",
"`host.ready` resolves", "the still's sample count restarts".
The member list in BLUEPRINT section 7 has no `frameCount` and no `settings`; `getParams` rides on
`host/looseParams.ts`, which no stage-1 package owns (S1-1 owns `moduleHost.ts` and `dive.ts`).
The plan also does not say how the smoke reaches the host: `publishOnWindow` is false, and
`defineAppHandles` puts the holder on `globalThis.__appHandles[name]` in dev builds only
(`engine/appHandles.ts`, the `@assumption`).
Fix: S1-0 adds `frameCount()` to the host (or a `frames` field on telemetry) and states that
stage-1 `getParams()` returns `api.dz.settings()` unmapped; S1-3's header says the smoke reads
`__appHandles['deep-zoom.host']` on the dev server. Sample count is `telemetry().accumN` (`DzTelemetry`).

### 5. MISSING - a throwing step is swallowed, so "no pageerror" cannot see it
`engine/TickRegistry.ts` `runTicks` catches every tick's throw and logs
`[TickRegistry] tick "<name>" threw` once. A `host.step` that throws every frame produces no
`pageerror`.
Fix: the stage-1 smoke fails on any console line starting `[TickRegistry] tick "deepZoom.step" threw`.

### 6. MISSING - the text-field step cannot go red as written
"type `w` into the project-name field, the strings are unchanged", falsified by dropping `keyTarget`.
The module moves the camera from held keys read inside `step` (`core.js` `if(keys['KeyW']) mv(...)`).
A typed character is a keydown and a keyup a few milliseconds apart, usually with no frame between,
so the camera would not move even with the listener on `window`. Also `ProjectName.tsx` only
renders its `<input>` while `editing`.
Fix: the step opens the field for editing, holds `w` down for 1 s (`keyboard.down`, wait, `up`),
then compares. Same for the falsification.

### 7. MISSING - `smoke:chrome` headless may sit in a blocking compile
Gates section: "`smoke:chrome` may stay headless ... it clicks the top bar while the renderer may
still be compiling."
That holds only with `KHR_parallel_shader_compile`. Without it the deep shader compiles inside
`createDeepZoom` on the main thread (`index.ts` BLOCKING COMPILES). Headless Chromium is
SwiftShader (the prototype smoke's header says so); whether SwiftShader has the extension was not
checked. If it does not, the page is frozen through the 30 s boot wait.
Fix: S1-3 checks the extension under headless first; if absent, the `APPS` row runs this app
headed on d3d11, or the shell defers the create by one frame so the chrome paints first.

### 8. WEAK - S1-A's parity gate does not prove the path was fixed
`debug/smoke-deep-zoom-parity.mts` `historicalPath()` has three things naming the folder, not one:
`path.join(ROOT, 'public', 'deep-zoom-core', 'index.html')`, the returned URL
`'/deep-zoom-core/index.html?embed=1'`, and the check line's text. If the path is left stale the
function falls through to the pinned file in `debug/scratch/deep-zoom-pinned/` and parity is still
green. The plan's falsification (also take the frozen repo away) covers it, but only if run.
Fix: S1-A's row lists all three edits and asserts the "historical page: public/deep-zoom-prototype-core/..."
line is the one printed.

### 9. WEAK - two statements about the tree the builder will trip on
- BUILD-PLAN S1-2: "`DeepZoomApp.tsx` = fluid-toy's tree with ... `MobileViewportShell` root,
  `ToastHost`". Neither is in `fluid-toy/FluidToyApp.tsx` (its root is a `fixed inset-0` div and it
  mounts no toast host). Both exist under `engine/components/`. Name those files instead, and note
  `onNotice -> showToast` needs the `ToastHost` mounted.
- BLUEPRINT section 11: "the prototype never joins the deployed precache". Its page does not, but
  `public/deep-zoom-prototype-core/index.html` matches the workbox glob `'**/*.{js,css,html}'`
  (`vite.config.ts`) exactly as `public/deep-zoom-core/index.html` does today. Whether a size
  limit excludes it was not checked.

## Scheduled later but touched by stage 1 (checked)

- M6 (the option seams proven) comes after stage 1; the plan says so and makes the stage-1 smoke
  their first test. Acceptable once findings 4 and 6 are fixed, since those two steps are the test.
- `host/looseParams.ts` (stage 2) - see finding 4.
- The tick phase: no animation plugin is installed in stage 1, so any phase works until stage 6a.

## Not checked

`installHelp`'s minimal argument list; `topbar.unregister`; `EngineBridge`; `setup.ts` with an
empty manifest and zero features; `debug/smoke-chrome.mts` `AppSpec` fields; whether a Playwright
click obtains pointer lock; `.claude/rules/deep-zoom.md` `paths:`; `npm run context:check` after
the file moves (not in the stage-1 gate list).
