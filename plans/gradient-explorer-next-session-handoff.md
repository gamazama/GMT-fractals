# GMT Gradient Explorer — next-session handoff

**Context:** The standalone "Palette Studio" (Generator / Picker / Image tabs + the Favients
shelf) is built and working in `dev/` (run `npm run dev` → `/palette-studio.html`). The
Favients panel work is DONE. This session's remaining scope is the 6 items below.

**Read first:** memory `project_img2grad_gmt_integration` + `project_softology_palette_param`;
plan `dev/plans/palette-studio-port-plan.md`; picker `dev/plans/picker-seam-handoff.md`.

**Gates:** keep `npx tsc --noEmit` at 0 errors and `npm run test:palette` green. The user does
VISUAL testing — don't run screenshot smokes. Don't clobber the Picker bake/catalog files
unless the task is the Picker one (#2).

---

## 1. Rename "Palette Studio" → "GMT Gradient Explorer" (FULL rename, incl. route)

Rename the standalone app properly — file, dir, route, component, and display strings.

**Files / dirs:**
- `dev/palette-studio.html` → `dev/gradient-explorer.html` (update its `<title>` and the module
  `<script src>` that points at `./palette-studio/main.tsx` → `./gradient-explorer/main.tsx`).
- dir `dev/palette-studio/` → `dev/gradient-explorer/` (main.tsx, setup.ts, registerFeatures.ts,
  PickerStage.tsx, and `PaletteStudioApp.tsx` → `GradientExplorerApp.tsx`).
- Component `PaletteStudioApp` → `GradientExplorerApp` (default export + its import/usage in main.tsx).

**Update every reference to the old paths** (`grep -rn "palette-studio"`):
- `vite.config.ts` rollup input: `palette-studio.html` → `gradient-explorer.html`.
- `app-gmt/registerFeatures.ts` launcher: `window.open('palette-studio.html', …)` → `gradient-explorer.html`.
- `app-gmt/PalettePickerOverlay.tsx` import: `from '../palette-studio/PickerStage'` →
  `'../gradient-explorer/PickerStage'`.

**Display strings** (`grep -rn "Palette Studio"`): topbar app name / doc title, the Favients
studio-launch button title ("Open Palette Studio" → "Open GMT Gradient Explorer"), and comments in
`palette/registerPaletteUI.ts`, `palette/components/FavientsPanel.tsx`, `palette/core/favientTargets.ts`,
`app-gmt/registerFeatures.ts`.

**KEEP the shared `palette/` dir as-is** — it's the generic host-agnostic palette/gradient library
used by app-gmt too (not the studio app), so renaming it just churns cross-host imports for no gain.

**Verify:** `npm run dev` → `/gradient-explorer.html` loads; the app-gmt Favients studio-launch button
opens the renamed route; tsc + test:palette green.

## 2. Picker — finish the server-loaded long tail (was action point #3)

The parallel track already did the bundle-split bake (`core/catalogLoader.ts` `loadGroup(id, base)` +
`PALETTE_GROUPS`; core baked + softology/cptcity as separable `.bin.gz`+`.json.gz`). Remaining:
- **Wire the R2 base URL** so the licensed/long-tail bundles lazy-load from the CDN instead of `/palette/`.
  `loadGroup(id, base = '/palette/')` already accepts a base — thread an R2 base (see
  `project_gallery_r2` for the bucket/CDN) and a 404→graceful-warn path. Confirm `pickerStore`
  load/unload toggles fetch from R2.
- Label threading is NO LONGER needed (the old GradientLibrary was retired; Favients carries real
  names). Skip that part of `picker-seam-handoff`.

## 3. Trace mode — freehand path + Catmull-Rom smoothing (was action point #4)

Today Trace samples a STRAIGHT line between two draggable endpoints
(`core/img2grad/trace.ts` `sampleTrace` + `ImageStage` pane with 2 handles).
- **Freehand path:** let the user draw a multi-point path on the image (pointer-drag to lay down
  points), stored as `path.points: {x,y}[]` (normalised). Keep the 2-handle straight line as the
  default/fallback. `sampleTrace` walks the polyline by arc length instead of a single A→B lerp;
  the perpendicular band + arc smoothing stay.
- **Catmull-Rom toggle:** a smoothing toggle that fits a Catmull-Rom spline through the path points
  before sampling (smooth curve vs polyline). Add to the `paletteImage` DDFS feature (Trace-only via
  `dynamicVisible`) + render the spline in the pane.
- Keep extraction DETERMINISTIC (no Math.random) and extend `debug/test-palette-img2grad.mts`
  (freehand path determinism + the spline is stable).

## 4. Generator — smooth / optimize (detail) sliders update LIVE

In `components/GeneratorStage.tsx` the `detail` + `smooth` range sliders (lines ~163-170) drive the
curve fit. `detail` already affects the OUTPUT stopFit live (`useGeneratorDerived`), but `smooth`
(and the curve re-fit) only apply when the user clicks **"Fit from source"** (`generatorStore.fitFromSource`).
- Make changing `detail`/`smooth` **re-run `fitFromSource` live** (debounced, e.g. rAF or ~120ms)
  WHEN `curvesOn` — so the channel curves re-fit as you drag. Don't re-fit when curves are off
  (nothing to fit). Mind the stable-`updateKeyframes`-ref / mid-drag-teardown gotcha documented for
  the channel editor.

## 5. Keyframe diamonds in the CANVAS controls

The compact ScalarInputs on the canvas (`components/GeneratorSlotMods.tsx`, and the Mix controls once
moved in #6) currently drop the keyframe diamond (only the dock-panel `AutoFeaturePanel` auto-renders
it). These are real DDFS params (`paletteGenerator.aHueRotate`, `…mixL`, etc.) so the tracks already
exist — just render the diamond on the canvas.
- Pattern (see memory + `engine` usage): `import { KeyframeButton } from …; useTrackAnimation(trackId, value, label)` where `trackId = \`paletteGenerator.${param}\`` (vec2 params split `_x`/`_y`).
  Reuse exactly how `AutoFeaturePanel`/`Slider` derive `trackId` via `deriveTrackBinding` and render
  `<KeyframeButton>` when `trackId && !disabled`. Add a small diamond next to each compact slider.
- Verify keying + playback works (the studio already mounts `TimelineHost` + `installModulation` +
  `EngineBridge` + `RenderLoopDriver`).

## 6. Move the L/C/h blend BETWEEN slots A and B (vertical)

Currently `mixL`/`mixC`/`mixH` are DDFS params in the **Mix** group, rendered in the Generator dock
tab (`features/paletteGenerator.ts`). Move them onto the **canvas, vertically between Source A (top)
and Source B (bottom)** in `components/GeneratorStage.tsx`, so the blend reads visually as A↔B.
- Make `mixL/mixC/mixH` HIDDEN DDFS params (like the slot mods) and render them on the canvas via
  `useGenParam` between the two `SourceRow`s, WITH keyframe diamonds (ties into #5).
- Layout: the swap button currently sits between A and B; put the three blend sliders there (L/C/h),
  labelled so it's clear they blend the value-structure / vividness / hue from A toward B.
- Drop the now-empty **Mix** group from the dock panel (or leave a hint pointing to the canvas).

---

## Still open AFTER this session (not in scope now)
- `/polish` pass (Phase-5 finale, GMT design language).
- app-gmt lockstep Generator dock panel feeding the active coloring layer (plan decision-2; Favients
  partly serves this).
- 3D OKLab cloud → Three.js; Image cloud/pane redraw at device resolution on resize.
