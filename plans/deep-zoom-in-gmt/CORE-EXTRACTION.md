# Core extraction: sizing the job of turning the deep-zoom page into a module

Source read: `H:/GMT/workspace-gmt/mandelbulb_deepzoom/index.html` (branch `kernel-perf`), 3,976 lines.
One inline classic `<script>` runs from line 267 to line 3974: **3,707 lines of script in one scope**.
All line numbers below come from grep on 2026-10-07 and will drift; the symbol name is the locator.
Counts are of lines at column 0 (a `let a, b, c` line counts once), so the number of names is higher.

Read-only survey. Nothing was run. Anything marked *unverified* was not read or not measured.

## 1. What is in the script, by region

| Lines (approx) | Size | Contents | Key symbols |
|---|---|---|---|
| 296-312 | 17 | boot: embed flag, canvas, GL context, power/binomials | `EMBED`, `canvas`, `gl`, `floatBlend`, `nPower`, `binomPad` |
| 314-1402 | ~1,090 | **shader strings** | `KERNEL_CORE`, `VERT`, `FRAG`, `DEEP_FRAG`, `SHADE_FRAG`, `GUIDE_FRAG` |
| 1403-1505 | ~100 | compile, variants, uniform tables | `sh`, `mkProg`, `mkProgAsync`, `ensureVariant`, `vKey`, `vSrc`, `makeUD`, `u`, `ud` |
| 1506-1665 | ~160 | shading pass, look, light rig | `shadeProg`, `us`, `look`, `rig`, `measureRig`, `requestRig`, `pollRig`, `rigDir` |
| 1665-1710 | ~45 | guided start | `guideProg`, `guideOn`, `makeGuideSet`, `bindGuide`, `guideIsFull` |
| 1711-1842 | ~130 | G-buffer and the deep draw | `ensureGbuf`, `drawDeep`, `deepCtx`, `loadTimer` |
| 1843-1939 | ~100 | **BigInt fixed point + reference orbit** | `makeHP`, `hp`, `hdrSplit`, `buildRefOrbit` |
| 1940-2127 | ~190 | BLA tables, orbit texture upload | `blaBuild`, `packBlaTexture`, `kickBlaAsync`, `updateBlaAuto`, `setBlaMode`, `uploadOrbit` |
| 2128-2190 | ~60 | gradient texture, drag-and-drop | `uploadStrip`, `gradientFromImage`, `gradientFromText` |
| 2192-2313 | ~120 | CPU mirror of the kernel, ground-truth gate probe | `stableDeltaJS`, `pertOrbitJS`, `pertMarchJS`, `gateProbeAt` |
| 2314-2360 | ~45 | camera + march + lever state | `cam`, `camHP`, `smoothedDist`, `frameLong`, `march`, `REACH`, `keys` |
| 2361-2560 | ~200 | **page UI**: keyboard, About, Controls panel, Render panel, pointer lock | `CTLS`, `syncControls`, `openPanel`, `closePanels`, `rstat` |
| 2562-2617 | ~55 | camera basis, f32 CPU distance | `basis`, `keyLightDir`, `deCPU`, `deCPUesc` |
| 2618-2887 | ~270 | **test studies** | `__directCheck`, `__directCheckHP`, `__popStudy`, `__marchPop`, `__trapStudy`, `hpDirectDE`, `hpDirectTrap` |
| 2888-3145 | ~260 | gate, thumbnails, square renders, stats | `gate`, `drawThumb`, `drawSquare`, `accumSquare`, `__stats`, `__readGbuf`, `__timeThumb` |
| 3146-3180 | ~35 | one-line setters | `__setCamHP`, `__setMode`, `__setPower`, ... |
| 3181-3320 | ~140 | tiled PNG export | `renderFrameToBlob`, `__export`, `__exportTimed`, `showProg`, `dlBlob` |
| 3322-3486 | ~165 | camera-path recorder, sampler, playback | `capturePathFrame`, `pathSampleAt`, `pathArc`, `sampleArc`, `smoothPath`, `__playPath` |
| 3488-3571 | ~85 | ZIP writer, path render to ZIP | `crc32`, `makeZip`, `packAndDownloadZips`, `__renderPath` |
| 3573-3631 | ~60 | canvas sizing, accumulation state | `setCanvasSize`, `updateCanvasDisplay`, `ensureAccum`, `halton` |
| 3632-3810 | ~180 | **the frame loop** | `frame` |
| 3811-3900 | ~90 | HUD, loading box, scripted dive | `hud`, `loading`, `diveHopJS`, `__dive` |
| 3901-3972 | ~70 | the product handle | `window.__dz` |

Rough split of the 3,707 lines: shaders 1,090 (29%), renderer 1,500 (40%), test harness 550 (15%),
page UI and file plumbing 450 (12%), the product handle and boot 120 (3%).

## 2. Top-level state

49 `let` lines, 74 `const` lines and 82 function declarations at column 0. Grouped by purpose:

- **Camera (7 lines):** `cam` (2314), `camHP` (2315, the authoritative position, BigInt), `smoothedDist`
  (2316), `modeOverride` (2317), `autoIters` (2320), `keys` (2356), `inputLocked` (2359).
- **Formula (3):** `nPower` (307), `phaseTheta`/`phasePhi` (308), `binomN`/`binomN1` (311).
- **Orbit and BLA (9):** `hp` (1889), `curOrbit` and `orbitDirty` (3598-3599), `orbitTex` (2097),
  `blaTau` (1940), `blaEnabled`, `blaMode`, `BLA_AUTO_ON/OFF`, `blaPending` (2031-2034),
  `blaTex`/`curBla` (2066), `forceRebuild` (3168).
- **GL objects (~20):** `gl`, `floatBlend`, `parallelExt`, `prog`, `deepProg`/`deepCompileErr`/`deepReady`
  (1415), `variants`/`variantErr`/`compileMs` (1449), `quad`, `u`, `ud`, `shadeProg`, `us`, `shadeLoc`,
  `guideProg`, `ug`, `guideLoc`, `gbufFbo`/`gbufTex`/`gbufW`/`gbufH` (1711), `probeTex`/`probeFbo`
  (2271-2275), `thumbFbo`/`thumbTex`/`thumbN` (2895), `gradientTex` (2128).
- **Look (6):** `look` (1560), `rig`, `rigPx`, `rigFbo`/`rigTex`, `rigPbo`/`rigSync`/`rigAsk` (1567-1627),
  `lightMode`/`falloffMul` (2355), `colorMode`/`colorScale` (2351).
- **March and levers (11):** `march`, `REACH` (2336-2337), `frameLong`, `view1to1`, `normalMode`,
  `landMode`, `bisectMax`, `normalIters`, `bisectIters`, `stepRelax`, `capRelax`, `surfMul`, `gateOn`.
- **Accumulation and guide (8):** `accumReset` (3600), `accumEnabled`/`idleFrames`/`accumN` (3608),
  `IDLE_HOLD`/`ACCUM_MAX`, `accumFbo`/`accumTex`/`accumW`/`accumH`/`accumGuide` (3610), `guideOn`/`guideK`/
  `guideR`/`guideFirst` (1674), `GUIDE_FULL_EVERY`, `GUIDE_MAX_PX`, `WHOLE_MAX_PX`.
- **Recording and export (9):** `recording`/`recPath`/`recStart` (3322), `kfLastHP...` (3327), `KF_MOVE`/
  `KF_ROT`, `kfSpacing`, `SEG_*`, `SW_CR` (3391, a BigInt literal), `playingPath` (3456), `exporting`/
  `cancelRender` (3178), `crcTable`, `ZIP_SPLIT_BYTES`.
- **Frame bookkeeping (3):** `last`/`fps`/`frameN`/`deepActive` (3598), `gate` (2888), `dispCss` (3583).
- **Page UI (8):** `EMBED`, `aboutEl`, `$id`, `CTLS` (2397), `ctlEl`/`renderEl`, `PANEL_W`, `uiPath`,
  `hud`, `loading`, `dzDive`, `dzThumbCv`.

Every one of these is a free variable shared by closure across the whole script. That is the real cost
of the job: there is no object to lift out, the state is the scope.

## 3. DOM lookups and listeners

9 `getElementById` lines, 1 `querySelector`, 14 `addEventListener` lines, ~20 `createElement` lines.

**Belongs to the renderer (must become options or injected callbacks):**
- `canvas = document.getElementById('gl')` (298) and `canvas.getContext('webgl2', ...)` (299).
- `canvas.addEventListener('click', ...requestPointerLock)` (2544), both `mousemove` listeners on `window`
  (2545 compare divider, 2557 mouse look), `keydown` (2361) and `keyup` (2543) on `window`,
  `pointerlockchange` on `document` (2551).
- `frame()` reads `window.innerWidth/innerHeight` and `document.body.classList.contains('panel-open')`
  with `PANEL_W` (3690-3691) to pick the aspect and the native cap. `updateCanvasDisplay` reads
  `devicePixelRatio` (3586) and writes the canvas CSS. `__setDiv` reads `window.innerWidth` (3151).
- Offscreen canvases made on the fly: gradient resample (2143), export encode (3280, 3298), thumbnail
  (`dzThumbCv`, 3902). These are fine in a module.

**Belongs to the page (stays in the page):**
- `EMBED` and `document.body.classList.add('embed')` (296-297); the WebGL-missing message that replaces
  `document.body.innerHTML` and then does `throw 0` (300).
- About / Controls / Render panels: `aboutEl`, `ctlEl`, `renderEl`, `CTLS` and the row builder
  (2390-2530), their three buttons and click listeners (2392, 2505, 2515).
- `hud` and `loading` (3811-3812), `showProg` (3181), the `lockcue` element (2552), the load timer
  that shows `#loading` (`loadTimer`, 1820-1825).
- File pickers and downloads: `__loadGradientFile` (2172), `__loadPath` (3473), `__renderPathFile` (3563),
  `dlBlob` (3285), `downloadJSON` (3364); window-level `dragover`/`drop` for gradients (2181-2182).

The awkward ones are the three that sit inside renderer code but talk to page elements: the `loading`
box written from the deep-program compile callback (1821-1829), `showProg` called from the export code,
and the `panel-open` read inside `frame()`. Each becomes a callback or an option.

## 4. The `window.__` handles

About 100 assignments (109 lines mention `window.__`). They are not declared in one place; they are
spread from line 1565 to line 3903.

**Product API (what an embedding app should call):**
- `window.__dz` (3903): `version: 1`, `telemetry()`, `settings()`, `getView()`, `setView(v)`,
  `thumbnail(size)`, `diveTo(depth)`. This is already the shape of a module interface.
- Used by the level-1 app in this worktree (grep of `deep-zoom/**`): `__dz`, `__deepReady`, `__deepErr`,
  `__renderPath`, `__setReach`, `__setSurf` (plus the app's own `__dzStore`).
- Product-grade but not yet in `__dz`: `__setLook`, `__setMarch`, `__setReach`, `__setPower`, `__setPhase`,
  `__setColor`, `__setSurf`, `__setLight`, `__setFrame`, `__setAccum`, `__setBla`, `__setGuide`,
  `__loadGradient`, `__clearGradient`, `__lockInput`, `__export`, `__cancelRender`, `__exporting`,
  `__recordToggle`, `__recording`, `__lastPath`, `__smoothPath`, `__samplePath`, `__playPath`, `__stopPlay`,
  `__savePath`, `__renderPath`, `__setKfSpacing`. About 28.

**Test harness only (should not be in the module's public face):**
- Studies: `__directCheck`, `__directCheckHP`, `__popStudy`, `__marchPop`, `__trapStudy`, `__guideStudy`,
  `__stats`, `__readGbuf`, `__renderThumb`, `__timeThumb`, `__exportTimed`, `__dive`.
- Probes: `__gate`, `__cam`, `__look`, `__march`, `__rig`, `__smoothedDist`, `__compileMs`, `__blaErr`,
  `__blaMode`, `__getBlaTau`, `__getGuide`, `__power`, `__deepReady`, `__deepErr`.
- Levers: `__setMode`, `__setCamHP`, `__moveAlong`, `__setDiv`, `__forceRebuild`, `__setGate`,
  `__setNormalMode`, `__setLand`, `__setBisect`, `__setNormalIters`, `__setBisectIters`, `__setStepRelax`,
  `__setCapRelax`, `__setBlaTau`, `__setGuideK`, `__setGuideR`, `__setGuideFirst`. About 43 in all.

How hard the suites lean on them (mentions across the `*.mjs` files in the page's folder):
`__setMode` 36, `__deepReady` 34, `__setBla` 32, `__cam` 32, `__setAccum` 22, `__samplePath` 20,
`__smoothedDist` 19, `__dz` 19, `__lockInput` 18, `__setGate` 13, `__setNormalMode` 11, `__setDiv` 11.
**Consequence: every one of the ~100 names must keep existing on `window` in the standalone page**, or
the suites go red. The module needs a `debug` object carrying the harness handles, and the page keeps a
thin shim that copies them onto `window`.

Four handles hand out the live mutable object, not a copy: `__cam = cam` (2890), `__look = look` (1565),
`__march = march` (2339), `__gate = gate` (2889). The suites reach into `__cam` directly (32 mentions).
`gate` is declared with `let` (2888); whether it is ever reassigned (which would leave `window.__gate`
stale) is *unverified*.

## 5. The frame loop

`frame(now)` (3632-3809, ~180 lines), self-scheduled with `requestAnimationFrame(frame)` at 3809 and
started unconditionally at 3973. It has no stop, no pause and no dispose. While `exporting` is true it
skips the frame and re-schedules (3633).

Per frame it reads, in order: `basis()`; `deepProg`, `modeOverride`, `smoothedDist` to set `deepActive`;
`updateBlaAuto()`; `autoIters` and `cam.iters`; `orbitDirty` / `forceRebuild` / `curOrbit` to decide on
`buildRefOrbit(camHP, cam.iters + 2)` + `uploadOrbit`; `curOrbit.Rk` / `DRk` or `deCPU` for the distance
probe; `keys[...]` for movement (writes `camHP`, sets `orbitDirty`); `recording`; the window size and
the `panel-open` class; `capRelax`. Lines 3700-3809 were sized by grep and not read line by line: from
the surrounding symbols they cover the frame size, accumulation, the guide set, the G-buffer,
`drawDeep`, the shade pass, the rig poll, the gate probe and the HUD text - *that list is unverified*.

It is the only place that advances the camera, so input, simulation and drawing are one function.

## 6. Shader strings and how variants are compiled

Six template strings, ~1,090 lines: `KERNEL_CORE` (314, ~320 lines, the shared kernel), `VERT` (635),
`FRAG` (638, the f32 baseline, ~65 lines), `DEEP_FRAG` (702, ~345 lines), `SHADE_FRAG` (1048, ~330
lines), `GUIDE_FRAG` (1379, ~25 lines).

- `prog = mkProg(FRAG)` (1413), `shadeProg = mkProg(SHADE_FRAG)` (1507) and `guideProg = mkProg(GUIDE_FRAG)`
  (1665) compile **synchronously at script load**.
- The deep program compiles asynchronously through `mkProgAsync` (1420) using
  `KHR_parallel_shader_compile` (`parallelExt`, 1414); the result sets `deepCompileErr` and
  `window.__deepReady` / `window.__deepErr` (1826-1829).
- Variants are made by text substitution: `vSrc(b, t)` (1451) does a `DEEP_FRAG.replace('#version 300 es',
  ...)` to inject defines. Keys come from `vKey(b, t)` = `'P' + 'B'? + 'T'?` (1450), so four variants at
  most: plain, BLA, trap, BLA+trap. `ensureVariant` (1453) builds one on demand; `kickBlaAsync` (2035)
  builds the BLA variant in the background and `updateBlaAuto` (2048) switches to it only when ready
  (its comment: "never triggers a blocking compile").
- Compile times are recorded per key in `compileMs`.

The strings have no dependency on the DOM and move to their own file unchanged.

## 7. What touches BigInt

51 lines mention `BigInt` or an `n` literal. Four users:

1. `makeHP(P)` (1843) - 256-bit fixed point: `mul`, `fdiv`, `isqrt`, `fsqrt`, `P8`, `addV`, `fromNum`,
   `toNum`. One instance, `hp = makeHP(256)` (1889).
2. `buildRefOrbit(CHP, lenMax)` (1900) - one `hp.P8` evaluation per iteration. Called from `frame()`
   only when `orbitDirty`, `forceRebuild` or there is no orbit yet. `orbitDirty` is set on every
   movement key, so **while flying it runs every frame; idle frames do none**.
3. Camera movement in `frame()`: `camHP[j] += hp.fromNum(v[j]*s)` - three BigInt adds per pressed key.
4. Path code: `SW_CR` (3391), `pathApplyCR`, `pathSampleAt` (spline in fixed point); `__setCamHP`,
   `__moveAlong`; `hpDirectDE` / `hpDirectTrap` (test studies); `__dz.getView` / `setView` (BigInt as
   strings).

**How long per frame: not measured in anything I read.** The page's own comment in `frame()` says
"iters~86 -> 86 BigInt P8 evals/frame" and calls the rebuild "heavy at depth". The iteration budget is
`min(160, 32 + ceil(1.35 * decades))` (in `frame()`), so 32 near the surface, 86 at 1e-40, 136 at 1e-77,
capped at 160. My estimate from the operation count is well under 1 ms shallow and a low single-digit
number of ms at 1e-77 - *an estimate, unverified*. `blaBuild` (1945) is float64 matrix work per step,
not BigInt.

Verdict for planning: **it can stay on the main thread for the first cut**, because that is where it runs
today. Do not design a worker into step one. But keep the boundary worker-ready: `buildRefOrbit` takes
plain inputs (`CHP`, `lenMax`) and returns arrays (`Rk`, `DRk`, ...), so it can move later without
touching callers. GMT's main thread is busier than this page's (React, panels, audio), so measure before
deciding: one `performance.now()` pair around the `buildRefOrbit` + `uploadOrbit` call at 1e-10, 1e-40
and 1e-77, with `__forceRebuild(true)`. A ten-minute job for whoever next has the GPU.

## 8. What assumes a single instance

1. The script runs at load: gets the canvas by id `gl`, creates the context, compiles three programs,
   starts the loop at 3973. No factory, no `dispose`.
2. All state is module-level (section 2). Two renderers cannot coexist in one realm.
3. ~100 fixed global names on `window`; a second instance would overwrite the first's.
4. Listeners on `window` and `document` (keys, mouse, drop, pointer lock) are never removed.
5. Size comes from the window, not from the canvas's parent (`window.innerWidth`, 3691).
6. `document.body` class reads and writes (`embed`, `panel-open`).
7. `throw 0` and `document.body.innerHTML = ...` on a missing WebGL2 (300).
8. GL resources (programs, FBOs, textures, PBO) are created at load or lazily; I saw deletes only in
   `freeGuideSet` (1701). Context-loss handling: *unverified* (not searched for by name).
9. `location.search` read at load for `EMBED`.
10. No `localStorage` use (0 hits), so no cross-instance storage clash.

One instance per page is fine for GMT's first use. The blocking items for a module are 1, 4, 5 and
the missing `dispose`; 2 and 3 only matter if two views are ever wanted at once.

## 9. Proposed module boundary

Target layout, kept inside the standalone repo so the page stays the master:

```
mandelbulb_deepzoom/
  index.html              page: markup, CSS, panel UI, HUD, file pickers, window.__ shim (~700 lines of script)
  core/
    shaders.js            KERNEL_CORE, VERT, FRAG, DEEP_FRAG, SHADE_FRAG, GUIDE_FRAG      verbatim   (~1,090)
    hp.js                 makeHP, hdrSplit, buildRefOrbit                                  verbatim   (~100)
    bla.js                mat3mul, rowMat3, frob, chebUf, blaBuild, packBlaTexture          verbatim   (~110)
    cpu-kernel.js         binom, powm1N, stableDeltaJS, pertOrbitJS, pertMarchJS, deCPU,
                          deCPUesc, diveHopJS, hpDirectDE, hpDirectTrap, vec helpers        verbatim   (~330)
    path.js               pathApplyCR, pathSampleAt, pathArc, sampleArc, smoothPath,
                          assignCinematicTime, easeInOut  (camera state passed in)          light edit (~130)
    zip.js                crc32, makeZip                                                    verbatim   (~40)
    deep-zoom.js          createDeepZoom: GL, variants, G-buffer, shade, rig, guide,
                          accumulation, frame step, export, recorder, state                 the hard file (~1,500)
    debug.js              the studies and probes, attached as dz.debug                      moved      (~550)
```

The first six files are pure (no `gl`, no DOM; the only shared state they read is power / phase, which
become arguments - which functions read them as globals today is *unverified* per function). Together
they are about 1,800 of the 3,707 lines and move without behaviour change.

Public interface:

```js
createDeepZoom(canvas, options) -> dz
// options: { autoStart = true, input = 'window' | 'canvas' | 'none',
//            getViewport = () => ({ width, height }),      // replaces window.innerWidth / panel-open
//            onStatus(s), onProgress(html), onError(err) } // replaces #loading, showProg, throw 0

dz.ready            // Promise; resolves when the deep program has compiled (today: __deepReady)
dz.telemetry()  dz.settings()  dz.getView()  dz.setView(v)  dz.thumbnail(n)  dz.diveTo(depth)   // = __dz v1
dz.set({ look, march, reach, power, phase, color, detail, light, frame, accum, bla, guide })
dz.loadGradient(file)   dz.clearGradient()
dz.record.toggle() / .recording() / .lastPath()     dz.path.sample() / .smooth() / .play() / .stop()
dz.exportStill(longEdge, samples, tile) -> Blob     dz.renderPath(data, opts) -> Blob[]     dz.cancel()
dz.lockInput(b)     dz.start()  dz.stop()     dz.step(now)   // host-driven frame
dz.dispose()        // remove listeners, delete GL objects, cancel rAF
dz.debug            // every test-only handle; the page copies these onto window
```

`dz.step(now)` matters for GMT: CLAUDE.md says the render loop is app-owned (`TickRegistry` phases,
`runTicks(dt)`), so inside GMT the host calls `step`, and only the standalone page uses `autoStart`.
Exports return Blobs; the download click stays in the page.

What stays verbatim: all six shader strings, `makeHP`, `buildRefOrbit`, `blaBuild`, the CPU kernel
mirror, the path maths, `crc32` / `makeZip`, and the bodies of `drawDeep`, `ensureGbuf`, `makeGuideSet`,
`measureRig`, `renderFrameToBlob`. The numerics are not touched at any step.

## 10. Order of extraction (the page works after every step)

Run after each step: `npm run verify` (direct-check, harness-dive, power-cert, gpu-funcs - from
`package.json`), `npm run panel` (panel-smoke), `node accum-check.mjs`, `node export-smoke.mjs`,
`node embed-smoke.mjs`.

0. **Baseline.** Record the suites green and one `__timeThumb` number on the current commit. Check how
   the suites load the page (`file://` or a local server) - *unverified*. ES modules do not load over
   `file://`, so this decides how step 1 goes.
1. **Make the script a module, change nothing else.** `<script type="module">`. Top-level `let` /
   `const` are already not on `window`, so behaviour is the same; but function declarations stop being
   globals, so any inline `onclick=` in the markup (*unverified* whether there are any) would break, and
   every suite must serve over http. This step flushes out the tooling problems on their own.
2. **Shaders out** to `core/shaders.js`. Largest move, zero logic: 1,090 lines.
3. **Pure maths out**: `hp.js`, `bla.js`, `cpu-kernel.js`, `zip.js`. Pass power / phase as arguments
   where the functions read the globals today.
4. **Path maths out** to `path.js`. `pathSampleAt` ("set the camera/state at absolute time tau", 3407)
   and `sampleArc` write the camera directly; change them to return a view and let the caller apply it,
   the way `__dz.setView` does.
5. **Collect the handles.** Move all ~100 `window.__x = ...` lines into one block at the end that builds
   an `api` object and a `debug` object and then does `Object.assign(window, ...)`. Names unchanged,
   suites unchanged.
6. **Split the page UI from the renderer in place**: panels, `CTLS`, HUD, loading box, file pickers and
   drag-drop go below a marker line and talk to the renderer only through the `api` object from step 5.
   The three cross-calls (`loading` box, `showProg`, `panel-open`) become callbacks. panel-smoke guards it.
7. **Wrap the renderer in `createDeepZoom(canvas, options)`** and move it to `core/deep-zoom.js`. The
   page becomes `const dz = createDeepZoom(document.getElementById('gl'), {...})` plus the UI plus the
   shim. This is the one step with real risk: every free variable becomes a closure variable of the
   factory. Do it as a single mechanical wrap (indent only), then fix what breaks.
8. **Add what a host needs**: `getViewport`, `input` scoping, `step(now)`, `start` / `stop`, `dispose`,
   context-loss handling. New code, covered by one new small suite (create, dispose, create again).
9. **Move the studies** to `core/debug.js`, loaded by the page always and by GMT never.
10. **Optional, only if step 0's measurement says so**: `buildRefOrbit` + `blaBuild` behind a worker.

Level 1's iframe keeps working through all of this, because it loads the page and uses `__dz`,
`__deepReady`, `__deepErr`, `__renderPath`, `__setReach`, `__setSurf` - all preserved by the shim.
The copy at `public/deep-zoom-core/index.html` in the GMT worktree becomes a folder (page + `core/`)
after step 2; whatever syncs that copy must copy the folder.

## 11. Honest size

- Steps 1-5: mechanical. About 1,900 lines moved, under 100 edited. One focused session, provided the
  suites can serve over http.
- Step 6: ~450 lines regrouped, 3 callbacks introduced. Half a session.
- Step 7: ~1,500 lines wrapped. Small diff in logic, large diff in text. One session, most of it spent
  running the suites and chasing the names that were relied on as globals.
- Step 8: 150-250 new lines plus a new suite. One session.
- Step 9: ~550 lines moved. About an hour.

Total: **about 3 to 4 working sessions**, no new numerics, no shader changes. The result is a module a
GMT panel can mount on its own canvas instead of an iframe. It is *not* deep zoom inside GMT's
renderer: the module still owns its own WebGL2 context, its own Mandelbulb-only kernel and its own copy
of the lighting. Sharing GMT's formulas, worker and materials is the separate, larger job covered in
`debug/scratch/dz-wf1-result-1.txt`.

Biggest risks, in order:
1. The suites rely on live mutable globals (`__cam`, `__look`, `__march` handed out by reference) - keep
   handing out the same objects.
2. The classic-to-module conversion can break how the suites load the page.
3. Three programs compile synchronously at load and would block GMT's main thread when the module is
   created - how long is *unverified*; `compileMs.S` already records the shade pass, so read it before
   choosing where in GMT's boot to create the module.
