---
paths:
  - "fluid-toy/**"
  - "fractal-toy/**"
  - "mesh-export/**"
  - "gradient-explorer/**"
  - "demo/**"
  - "deep-zoom/**"
---

# Sibling apps

These install features and core plugins on top of the engine. If a change to `engine/**`
breaks one of them, the change is too GMT-specific.

| App | Entry doc |
|---|---|
| `fluid-toy/` | [`fluid-toy/README.md`](../../fluid-toy/README.md) + [`docs/modules/fluid-toy/index.md`](../../docs/modules/fluid-toy/index.md) |
| `fractal-toy/` | [`docs/modules/fractal-toy/index.md`](../../docs/modules/fractal-toy/index.md) |
| `mesh-export/` | [`docs/modules/mesh-export/index.md`](../../docs/modules/mesh-export/index.md) |
| `gradient-explorer/` | [`docs/modules/gradient-explorer/app.md`](../../docs/modules/gradient-explorer/app.md) |
| `demo/` | [`demo/README.md`](../../demo/README.md) — minimal three-file add-on contract |
| `deep-zoom/` | JSDoc of `deep-zoom/host/DeepZoomHost.ts` (the one interface to the renderer), `deep-zoom/renderer/index.ts` (the module's options and pitfalls) and `deep-zoom/main.tsx` (boot order); the plan is `plans/deep-zoom-shell/`. `deep-zoom-prototype/` is the dev-only embedded-page prototype, removed when the shell matches it — never edit it to match. |

`deep-zoom/`:

- The renderer is a module (`deep-zoom/renderer`) and ONLY files under `deep-zoom/host/` import
  it. The store owns every look value and `useHostSync.ts` sends them. The camera is three
  256-bit decimal STRINGS that never pass through `Number()`.
- `deep-zoom/data/places.ts` holds the owner's kept places: cards in the app AND the hard cases
  for any march-quality measurement.
- It flies with GMT's navigation (ADR-0133) through `deep-zoom/flyCamera.ts` and
  `DeepZoomNavigation.tsx`, which hand the host displacements and a yaw / pitch and never read
  a position. The fly keys (W A S D, Q E, Space, C, Shift, Alt) are heard on the window and
  must not be registered as shortcuts.
- The speed follows rays (ADR-0134): `host.sense` marches seven CPU rays to the solid AS DRAWN
  and the pace is `deep-zoom/flyPace.ts`. "Depth" everywhere is what is looked at
  (`deep-zoom/depthNow.ts`). Tab is Orbit mode (`deep-zoom/orbitCamera.ts`; its clearance: grep
  `DZ_ORBIT_CLEARANCE`). A flight or an orbit gesture is one undo step (`flightEnded` in
  `deep-zoom/locations.ts`).
- The gradient is the param `dzColour.gradient` and reaches the renderer as texels through ONE
  component, `deep-zoom/GradientSync.tsx`. Read THE GRADIENT in `deep-zoom/features/colour.ts`
  before adding a colour control: offset, bias and repeats are deliberately NOT params here.

Decisions for `gradient-explorer/`: ADR-0114 (the v2 shell), ADR-0115 (the shell on a phone),
ADR-0119 (a save is drawn where it lands — grep `flashSetSave`), ADR-0125
(`gradient-explorer-next.html` is a permanent alias — grep `ALIAS_PAGE` in `v2/shareUrl.ts`),
ADR-0126 (the trip from GMT — `v2/fromGmt.ts`), ADR-0129 (the Paint face; the Explorer's half
is `v2/paint/workingPaintSink.ts`). Palette-side decisions: [`palette.md`](./palette.md).

## Guards

Coverage is per app and uneven: each smoke boots exactly one entry point (its `ENGINE_URL`
default), so a fluid-toy smoke proves nothing about mesh-export. `check:rule-guards` cannot
police the rows — it matches a guard against this rule's whole `paths:` set.

| App | Guards |
|---|---|
| `fluid-toy/` | `npm run smoke:fluid-toy`, `npm run smoke:fluid-brush`, `npm run smoke:fluid-presets`, `npm run smoke:migrations` (`fluid-toy/migrations.ts`), `npm run smoke:canvas-menu` (the only guard reaching `fluid-toy/pointer/contextMenu.ts`), `npm run smoke:fractal-kind` (the `julia.kind` enum), `npm run smoke:bc-drag`, `npm run smoke:canvas-pan-zoom`, `npm run smoke:particle-bounce` (the only guard reaching `fluid-toy/brush/particles.ts`). Boot canaries only: `npm run smoke:pause-controls` (asserts on `@engine/topbar/PauseControls`; rewrites the tracked `debug/fluid-pause-hover.png`) and `npm run smoke:tsaa` (a screenshot capture, not a TSAA guard; rewrites `debug/fluid-tsaa-on.png` and `-off.png`). Not `smoke:orbit`: it boots `app-gmt.html`. |
| `fractal-toy/` | `npm run smoke:fractal-toy`, `npm run smoke:formula-switch` (the only guard reaching `fractal-toy/renderer/`) |
| `demo/` | `npm run smoke:engine-demo`, `npm run smoke:engine-demo-modulation`, `npm run smoke:interact` |
| `gradient-explorer/` | `npm run smoke:ge-next` (boot and registration only) · `npm run smoke:ge-hero`, `npm run smoke:ge-tray` (`v2/WorkingHero.tsx`, `Tray.tsx`, the tray / source logic) · `npm run smoke:ge-ground` (`v2/SetRail.tsx`, `useGroundSource.ts`, `startNewGradient`, Esc and Filters through `v2/uiHistory.ts`) · `npm run smoke:ge-phone` (`v2/useIsPhone.ts` and the phone branches, ADR-0115; `v2/ShellMenu.tsx`; `v2/help/`; the feedback attachment with the endpoint intercepted) · `npm run smoke:ge-session` (`v2/session.ts`, the initial tray face) and its node twin `npm run test:gx-session` · `npm run smoke:ge-gradientfile` (`finishImport` / `preRoute`, `ExportMenu.tsx`'s For GMT band, the file drop hint) · `npm run smoke:ge-paint` (`v2/paint/workingPaintSink.ts` and the shell's Paint branches; the brush maths is `test:palette-paint`, in the palette rule) · `npm run smoke:ge-wall` (the shell's `wallIdle`, BrowseStage's `wall` / `onTuckWall` / `trayBox`) · `npm run smoke:ge-wallpaper` (`setFullscreenLiveSource`, `RegisteredLiveSource`) · `npm run smoke:gx-spline` (`splineExtend`, `setSplinePoints`) · `npm run smoke:gx-geom-gpu` (the four 2D geometries exist twice — `palette/core/rampGeometry.ts` on the CPU, `fullscreen/modes/geometryFrag.ts` in GLSL — and this alone compares them) · `npm run smoke:liquify`, `npm run smoke:gx-handles`, `npm run smoke:gx-fractal-glitch` (they drive `fullscreenStore` directly) · node: `npm run test:gx-export` (`fullscreen/exportSize.ts` only), `npm run test:gx-share` (`v2/shareUrl.ts` only), `npm run test:liquify` (`fullscreen/modes/liquify/{LiquifyMesh,catmullRom}.ts`; the fastest guard here). Unguarded: `exportRender.ts`, the `renderAt` implementations, the `gradientMap` raster — verify by exporting a wallpaper. `smoke:gx-spline` and `smoke:ge-wallpaper` import a store module by bare URL and need a FRESH dev server. |
| `mesh-export/` | `npm run test:mesh-grid` only (node-level, no browser smoke) — see below |
| `deep-zoom/` | **`npm run smoke:deep-zoom`** — the shell on the REAL GPU, one file of steps per stage under `debug/deep-zoom-smoke/`; it wants the dev server (`ENGINE_URL`) and refuses a software renderer. Run it with `DZ_HEADLESS=1`: a headed window takes the keyboard. Node checks: `npm run check:deep-zoom-host` (the contract has zero imports; only `host/` imports the renderer), `npm run check:deep-zoom-module-host` (the adapter against a fake renderer), `npm run check:deep-zoom-param-map`, `npm run check:deep-zoom-depth-format`, `npm run check:deep-zoom-location-parse`, `npm run check:deep-zoom-fly-camera` (the fly integrator against the renderer's basis; the pace), `npm run check:deep-zoom-ray-probe` (the CPU ray probe, lifted out of `core.js` as text), `npm run check:deep-zoom-orbit-camera`. After ANY edit of `deep-zoom/renderer/core.js`: `npm run smoke:deep-zoom-parity` and `npm run smoke:deep-zoom-direct`. To MEASURE a march setting: the package script `bench:deep-zoom-march`. `smoke:chrome` has a `deep-zoom` row, desktop only. |

If `smoke:liquify` goes red while something else is editing the tree, restart `npm run dev`
first (HMR leaves the store module dual-instanced; the symptom is `[1] liquify canvas
missing`). Red on a quiet tree is a real liquify regression.

⚠ **fluid-toy boots as a PURE FRACTAL — any pixel assertion must undo that first.**
`fluidSim.paused` defaults `true` and `composite.show` defaults to `'julia'` (grep
`defaultIndex` in `fluid-toy/features/composite.ts` and `paused` in `features/fluidSim.ts`), so
nothing the brush or the sim writes changes a pixel. A pixel smoke must do what
`<FluidToggleButton/>` does (unfreeze + switch to Mixed) before it drags.

`mesh-export/` has no browser smoke. `test:mesh-grid` (`debug/test-mesh-grid-convention.mts`)
pins the CELL-CENTRED voxel convention, `min + (i + 0.5) * range / N`, across `dc-core.ts`'s
`gridToWorld` / `worldToGrid` and `vdb-writer.ts`'s translation row, and reaches nothing else.
`npm run typecheck` and `npm run orphans` cover the tree statically. The SDF sampling, dual
contouring, post-processing, `gpu/`, the pipeline and the GLB/STL writers are unguarded:
verify by generating a mesh in the running app and importing it into a DCC tool.
