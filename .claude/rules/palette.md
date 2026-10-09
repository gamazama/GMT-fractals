---
paths:
  - "palette/**"
---

# The palette suite

`palette/**` is the gradient/palette authoring suite: the colour core, the generator and
img2grad pipelines, the Favients shelf, the picker wall, and the four DDFS features that
expose them. Its hosts — app-gmt, fluid-toy, the Gradient Explorer, Deep Zoom — mount it
through one registration seam.

## Read first

- `palette/registerPaletteUI.ts` — the single boot seam; must run **before** `createEngineStore()`.
- `palette/installFavients.ts` — the per-host mount and the `storageKey` contract.
- `palette/core/gradientSeam.ts` — the ramp → `GradientConfig` conversion, the one conversion point.
- `palette/core/rampGeometry.ts` — `sampleGeometry` is pure (no module state, no cache); the
  Explorer depends on a byte-identical double render.
- `palette/core/exportFormats.ts` — the format registry and the stop budgets. Read its SWATCHES
  SUBJECT block before adding a format: `build` (required on every entry) takes the 256-step
  ramp; the optional `swatches` takes a colour list and decides whether the format shows under
  the Swatches subject (grep `formatsFor`).
- `palette/core/img2grad/index.ts` — the `extract()` pipeline.
- `palette/core/oklab.ts` — read its `@assumption` first: a hand copy of engine colour code
  whose drift pin pins nothing. Its sibling `palette/core/gmtGradient.ts` is a pure re-export of
  `utils/colorUtils.ts`, so an engine-core change to `renderStopsToRamp` lands here unnoticed.

## Decisions

- ADR-0111 — ONE pipeline over an input slot for every source (`core/workingPipeline.ts`,
  `store/workingStore.ts`); stops pass verbatim under the identity pipeline; bake folds and resets.
- ADR-0112 — variants snapshot the authored slices + documents (minus `favients`) and restore
  through the feature setters inside one undo bracket, never `loadPreset`.
- ADR-0113 — six blend spaces from pigment to tint (`BLEND_SPACE_ORDER` in `utils/colorUtils.ts`;
  the editor's whitelist is `core/editorConfig.ts` `BLEND_SPACES`). Polar modes gamut-map by
  walking chroma down. The stored key `oklab` is the polar OkLCh mode and rectangular Oklab is
  `oklab-rect` — renaming `oklab` resets every saved gradient, share link and preset.
- ADR-0119 — a save is drawn on the chip that takes it (`core/gradientCss.ts`; the shell half
  is in `gradient-explorer/v2/`).
- ADR-0122 — a `GradientConfig` is a STOP gradient or a RAMP gradient (`stops: []` + `ramp`,
  256 texels as base64). Read a whole config through `renderGradientToRamp` /
  `gradientDisplayRamp`, never `renderStopsToRamp(config.stops, …)`. Producers go through
  `rampToGradientConfig` (stops only when ≤ `STOP_LAYER_CAP` AND faithful); a gradient that
  already has stops keeps them.
- ADR-0124 — Recent collects the working gradient, one entry per working session, in dated
  bins (grep `updateRecent`, `syncRecent`, `sessionPinned`).
- ADR-0126 — GMT's Explorer button carries the gradient to the Explorer and nothing back
  (`core/explorerHandoff.ts`, grep `EXPLORER_INCOMING_KEY`); any app in `EXPLORER_HOSTS` can
  make the trip (`?from=<id>`).
- ADR-0127 / ADR-0128 — "Reduce stops…" is a stop-count slider over a lazy plan
  (`core/reduceStops.ts` `reduceStopsPlan`); the named tolerances are quick picks on it. The
  editor reads it through `components/gradient/gradientStopReducer.ts`.
- ADR-0129 — the Paint face's brushes paint the 256-texel RAMP (`core/paintRamp.ts`); Apply is
  one undo entry.
- ADR-0130 — GMT's Gradient Studio hosts the Explorer's Curves / Adjust / Paint faces
  (`components/faces/`, `components/paint/`).
- ADR-0117, ADR-0118, ADR-0120 and ADR-0123 are cited beside their guards below. The
  cross-cutting write-up is `docs/modules/palette/palette-suite.md`.

## What's load-bearing

- **`palette/components/**` are store-aware composed panels BY DESIGN** — not under the
  `components/ui/**` purity rule.
- **`palette/` must never import an app** (`app-gmt/`, `fluid-toy/`, `gradient-explorer/`).
  `engine/`, `engine-gmt/` and shared code are fine.
- **The gradient wall has ONE model.** `palette/core/pickerModel.ts` (pure) plus
  `palette/components/usePickerModel.ts` (the React/store binding; an optional `{ source }`
  shows a set of the user's own gradients instead of the catalogue). A host that calls
  `catalog.filter(...)` itself is a fork; extend the model.
- **The catalogue's LICENSING is data with five seams** (`plans/palette-catalogue-licensing.md`):
  1. Which pack a gradient lands in: `core/catalogPacks.ts` (`PACK_PUBLISH`, the ONE publish
     switch, and `PACK_BUNDLES`), read by the bake and by `catalogLoader.PALETTE_GROUPS`
     (derived by `paletteGroupsFrom`, never hand-listed). Re-bake rather than hand-editing a
     `.json.gz`.
  2. Provenance is shown only in category names (`catalogOrigin.categoryName`, the collection
     bands, the search index). Group by = Collection sits at enum index 3 — never insert
     before it. No per-tile or hero provenance UI.
  3. An export name carries the credit only while the gradient is unmodified: a pick stamps
     a `CatalogOrigin` whose `key` is the config's `originKey`, and `exportNameFor` /
     `withExportName` honour it iff the key still matches. Never "clear the origin on edit";
     an origin is untrusted on the way in (`coerceOrigin`).
  4. GX Global refuses unedited catalogue gradients twice: `catalogSigs.ts` on the client and
     the backend's `supabase/functions/gx-gradients/validate.ts`, two hand mirrors. The bake
     writes both signature lists; re-deploy the function after a re-bake.
  5. GX Global joins the catalogue as a LIVE SOURCE (`catalogLoader.registerLiveSource`).
     Its entries must be COPIED before `row` is reassigned, an empty load is `failedGroups`,
     and `BundleInfo.userMade` keeps its gradients out of export credits.
- **Host-agnosticism goes through registries, never a branch on the host**: `componentRegistry`
  ids, `store/sendTargetRegistry`, the capability flags in `palette/core/favientTargets.ts`,
  the `gradientEditorEntrance` seam.
- **The Curves / Adjust / Paint faces are SHARED** between the Explorer's tray and GMT's
  Gradient Studio (`store/gradientStudio.ts`, `components/GradientStudioPanel.tsx`,
  `installGradientStudio.ts`). What differs goes through a seam: Adjust's `onApply`, Curves'
  `CurvesFaceDerived`, Paint's `setPaintSink`. In the Studio a live face PREVIEWS through the
  param's own uniform (`previewGradient`) and writes the param only when it bakes (one
  `paramGroup` on Apply, on leaving the face, on closing the window). A host whose renderer
  takes no uniform events reads the published preview instead
  (`components/gradient/gradientParamPreview.ts`, as `deep-zoom/GradientSync.tsx` does). The
  window is a `chrome: 'bare'` panel, float-only.
- **Undo rides the ENGINE param stack** via `palette/store/paramUndoBracket` (`genEdit` /
  `editorEdit` / `favEdit`). Discrete gestures self-bracket; drags open on pointerdown and
  close on window pointerup.
- **The Curves channel KEY is the space's**: `curveSpaceKeys(space)`. Anything that persists
  a `ChannelTracks` persists the space beside it and validates against it
  (`generatorDocument.sanitizeTracks`, `workingStore.coerceTracks`). `Channels` is still
  OkLCh; the one conversion seam is `generatorStore.sampleCurves`.
- **The curve editor's LEFT GUTTER is a contract across four places, unguarded.**
  `palette/components/ChannelGraphEditor.tsx` overrides it (30 px on a phone, 62 px
  `GRAPH_LEFT_GUTTER_WIDTH` elsewhere) and the number must reach its own `frameToCanvasPixel` /
  `canvasPixelToFrame`, the interaction hook, `drawGraph` / `drawGraphOverlay` via
  `leftGutter`, and `GraphRendererBuilder` with the polyline and mask cache keys.

## Guards

```
npm run smoke:boot           # boots app-gmt: registerPaletteUI, installFavients, both persisters, the four features
npm run test:palette         # the chained node harnesses over palette/core/** and the stores
npm run test:palette-favients
npm run test:palette-gradientseam
npm run test:palette-gradientramp
npm run test:gradient-rampmode
npm run smoke:gx-handles     # for any palette/store/fullscreenStore.ts change
npm run test:gx-session
npm run test:palette-licensing
npm run test:gradient-file
npm run smoke:ge-gradientfile
npm run test:palette-reducestops   # node, ~2 min, not in the chain
npm run smoke:ge-reduce
npm run smoke:gmt-gradientdrop
npm run smoke:gradient-studio
npm run smoke:ge-wallzoom    # for any change to the wall's layout or zoom (~70 s)
```

Browser smokes want the dev server on 3400. `test:palette` reaches no file under
`palette/components/**`: a green run says nothing about a component. Cite the specific link
when you mean one:

| files | guard |
|---|---|
| `core/reduceStops.ts`, `components/gradient/gradientStopReducer.ts`, `ReduceStopsPopup.tsx` | `npm run test:palette-reducestops`; wired `npm run smoke:ge-reduce` |
| `core/stopFit.ts`, `core/gmtGradient.ts` | `debug/test-palette-stopfit.mts` |
| the RAMP form: `utils/gradientRamp.ts`, the ramp readers in `utils/colorUtils.ts`, `core/stopFit.ts` `rampToGradientConfig`, `core/gradientSeam.ts` | `npm run test:palette-gradientramp`, `debug/test-palette-gradientseam.mts` |
| the editor's ramp mode: `components/gradient/rampMode.ts`, `gradientStopFitter.ts`, `gradientActions.ts`, `components/AdvancedGradientEditor.tsx` | `npm run test:gradient-rampmode` (also fails if a UI file passes `.stops` to a stop renderer) |
| `core/oklab.ts`, `utils/stopOps.ts` | `debug/test-palette-stopops.mts` |
| `core/channelCurve.ts` | `debug/test-palette-channelcurve.mts` |
| the Gradient Studio: `store/gradientStudio.ts`, `components/GradientStudioPanel.tsx`, `GradientStudioEntrance.tsx`, `installGradientStudio.ts` | `npm run smoke:gradient-studio` (app-gmt) |
| `core/paintRamp.ts` (the Paint brushes) | `npm run test:palette-paint`; wired `npm run smoke:ge-paint` |
| `core/waveGen.ts`, `utils/CurveFitting.ts` `spliceSpan` | `npm run test:palette-wavegen` |
| `components/WaveOverlay.tsx`, `ChannelGraphEditor.tsx`'s armed wave | `npm run smoke:ge-wave` |
| `core/curveSpaces.ts` (which axes Curves draws) | `npm run test:palette-curvespaces` (`rgbToHsv` reports S and V on 0..100) |
| `core/facets.ts`, `core/facetName.ts` | `debug/test-palette-facets.mts`, `-facetname.mts` |
| `core/easings.ts` | `debug/test-palette-easings.mts` |
| `core/generatorPipeline.ts`, `core/colorBoxFit.ts` | `debug/test-palette-generator.mts` |
| `core/img2grad/**` | `debug/test-palette-img2grad.mts` and `-overshoot.mts` (only the second catches the `resample()` overshoot) |
| `core/selectionGeometry.ts` | `debug/test-palette-selection.mts` |
| `core/wallLayout.ts` | `debug/test-palette-walllayout.mts` |
| `core/paletteSample.ts` | `debug/test-palette-sample.mts` |
| `core/workingPipeline.ts`; `store/workingStore.ts` `syncRecentOutsideUndo` + `paramUndoBracket.ts` `outsideParamTransaction` | `debug/test-palette-working.mts` ([12] is the Recent sync); wired `debug/smoke-ge-wave.mts` [7]–[7c] |
| `core/gradientCss.ts`, `components/PickerWall.tsx` `minGutter` / zoom-tool tap (ADR-0118) | `npm run smoke:ge-setsave`, `npm run smoke:ge-ground` [3] |
| `core/workingPipeline.ts` `recolourHeldFit` + the working store's drag hold (ADR-0117 §5) | `npm run smoke:ge-livedrag` |
| the v2 shell's interface state on the undo stack (ADR-0120): `gradient-explorer/v2/uiHistory.ts`, `store/paramUndoBracket.ts` `paramGroup` | `npm run smoke:ge-uiundo` |
| `store/favientsStore.ts` `collectRecent` | `debug/test-palette-favients.mts` [6] |
| the session: `store/workingSession.ts`, `store/variantsStore.ts` studio snapshot, `core/variantsCore.ts` | `npm run test:gx-session`; wired `npm run smoke:ge-session` |
| `core/pickerModel.ts` | `debug/test-palette-pickermodel.mts` |
| `components/PickerWall.tsx` zoom arithmetic (`zoomStep`, `zoomStepPlan`, `pinnedContentPoint`, `wallGeometry`) | `npm run test:palette-wallzoom` (arithmetic; it cannot see the wall) |
| `components/PickerWall.tsx` the wall as drawn under a zoom, the chunk / canvas split, `revealIndex` | `npm run smoke:ge-wallzoom` (the wall is a BOUNDED scroller: a zoom that brings an edge into the box stops there) |
| `components/PickerWall.tsx` `touch-action` | `npm run smoke:ge-walltouch`; `npm run smoke:ge-phone` [7] is the only guard on `AdvancedGradientEditor.tsx`'s pointer-event conversion |
| `components/PickerWall.tsx` tile drawing through `utils/roundRectPath.ts` (no `roundRect` before Safari 16) | `npm run smoke:ge-floor` |
| the shelf's manage surface: `core/globalSet.ts`, `store/globalSetStore.ts`, `store/favientFiling.ts`, `store/wallSelection.ts`, `store/groundSet.ts`, `store/favientsStore.ts` `removeGroup` + `replaceAll` | `npm run test:palette-shelf` |
| `core/groundSets.ts`, `core/padAxes.ts`, `store/favientsStore.ts` `insertMany` | `debug/test-palette-groundsets.mts` |
| blend spaces: `utils/colorUtils.ts` `blendLerp` and every `lerp*`, `core/editorConfig.ts` `BLEND_SPACES` | `npm run test:palette-blendspaces` |
| licensing: `core/catalogPacks.ts`, `core/catalogLoader.ts`, `core/catalogOrigin.ts`, `core/catalogSigs.ts`, `debug/palette-packs.mts`, `debug/bake-palette-catalog.mts` | `npm run test:palette-licensing` (imports the backend's `validate.ts`: needs `H:/GMT/workspace-gmt/backend` beside this repo); wired `debug/smoke-ge-hero.mts` [8] [9], `debug/smoke-ge-ground.mts` [12]–[12c], `debug/smoke-ge-phone.mts` [11] |
| `core/exportFormats.ts`, `core/favientsExport.ts` swatch builders | `npm run test:palette-exportsubjects` |
| the gradient file (ADR-0123): `core/gradientDocument.ts`, `core/gradientPng.ts`, `core/gradientFile.ts`, `core/importGradientFiles.ts`, `utils/pngCodec.ts`, `store/favientsStore.ts` `favientSig` and the collection import / export | `npm run test:gradient-file`; the fidelity matrix across export formats is `npm run test:gradient-roundtrip` (a new export format with no class is red) |
| the gradient file's entrances: `components/FavientsCollectionMenu.tsx`, `components/useImageDrop.ts` `preRoute`, `gradient-explorer/v2/ExportMenu.tsx`, `exportActions.ts`, `GradientExplorerV2App.tsx` `finishImport` | `npm run smoke:ge-gradientfile` |

## Watch out

- **`palette/store/fullscreenStore.ts` belongs to the Gradient Explorer.** Five of its exports
  are named by string in three browser smokes, so `tsc` cannot see the edge. Editing the file
  makes the next smoke run fail with a dual-instance message: restart `npm run dev` first.
- **The Favients COLLECTION is shared across apps (`gmt.favients`); the PANEL window state is
  split per host by `storageKey`.** A host without its own key inherits app-gmt's. The
  collection carries the auto-managed Recent group (`RECENT_GROUP`), so a gradient used in the
  Explorer shows under "Recent" in app-gmt's and fluid-toy's shelves — by design.
- **Mounting before `applyPanelManifest` fails silently**; `smoke:boot` stays green.
- **`palette/store/favientsPanelPersist.ts` re-implements the 768px mobile test inline** (see
  [`mobile-layout.md`](./mobile-layout.md)).
