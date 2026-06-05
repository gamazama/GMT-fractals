---
source: palette/registerPaletteUI.ts
lines: 1-74
last_verified_sha: e4089cafc7527aa0efa746ff97be07c30373811e
additional_sources:
  - palette/core/generatorPipeline.ts
  - palette/core/img2grad/index.ts
  - palette/core/gmtGradient.ts
  - palette/core/gradientSeam.ts
  - palette/core/oklab.ts
  - palette/core/stopFit.ts
  - palette/core/exportFormats.ts
  - palette/store/pickerStore.ts
  - palette/store/generatorStore.ts
  - palette/store/imageStore.ts
  - palette/store/favientsStore.ts
audited: 2026-06-05T00:00:00Z
audited_by: claude-opus-4-8
public_api:
  - registerPaletteUI
  - entryToGradientConfig
  - applyGradientConfig
  - renderStopsToRamp
  - oklabToRgbSafe
  - fitRampToStops
  - extract
depends_on: []
---

# palette — the gradient/palette suite

`palette/` is a **host-agnostic** module tree (pure TS core + React components, no DOM
or store coupling in `core/`) that provides GMT's whole gradient-authoring domain:
browse a catalog (Picker), build gradients procedurally (Generator), extract them from
images (Image / img2grad), save favourites (Favients), and export to 15 formats. It is
mounted by the standalone [gradient-explorer](../gradient-explorer/app.md) shell **and**
by app-gmt (feeding the active coloring layer) — the same modules, two hosts.

The contract with GMT is **"feed it"**: every mode produces a **256-step RGB ramp**, and
the output **seam** converts that to a GMT `GradientConfig` (stops + blendSpace +
colorSpace) which GMT's existing stop-based pipeline bakes to a DataTexture. Stops are
the interchange; bezier channel-curves are only an *authoring* representation. Full
history + decisions:
[palette-studio-port-plan.md](../../../plans/palette-studio-port-plan.md),
[gradient-explorer-next-session-handoff.md](../../../plans/gradient-explorer-next-session-handoff.md).

~60 files. State rides the engine's **DDFS** ([02_Feature_Registry.md](../../engine/02_Feature_Registry.md))
where params are scalar/vec (so they get undo + keyframes + presets for free), and
local **Zustand** stores hold the non-scalar state (channel-curve `Track[]`, the loaded
catalog, the ingested image, the favourites collection) that doesn't fit DDFS params.

## Where to start

| If you're touching... | Read |
|---|---|
| Registration / boot integration | [`palette/registerPaletteUI.ts`](../../../palette/registerPaletteUI.ts) |
| The output "feed it" seam (ramp → GMT config) | [`palette/core/gradientSeam.ts`](../../../palette/core/gradientSeam.ts) + [`palette/core/stopFit.ts`](../../../palette/core/stopFit.ts) |
| Canonical gradient type + 256-step bake | [`palette/core/gmtGradient.ts`](../../../palette/core/gmtGradient.ts) |
| Colour math / gamut-safe conversion | [`palette/core/oklab.ts`](../../../palette/core/oklab.ts) |
| Picker (wall, filters, selection) | § Picker below |
| Generator (slots, pipeline, channel curves) | § Generator below |
| Favients (favourites shelf) | § Favients below |
| Image → gradient extraction | § Image tool below |
| Export formats / InDesign IDML | § Exporters below |

## Registration (`registerPaletteUI.ts`)

`registerPaletteUI()` is the single boot seam, called from a host's `registerFeatures.ts`
**before** the store exists (the registries freeze on first store access — see
[03_Plugin_Contract.md](../../engine/03_Plugin_Contract.md)). It registers:

- **3 DDFS features** (dock tabs): `paletteFilters` (Picker), `paletteGenerator`
  (Generator), `paletteImage` (Image).
- **Custom-UI components** (by componentId, mounted via AutoFeaturePanel `customUI` or
  the panel manifest): `palette-quality-pad`, `palette-theme-chips`,
  `palette-bundle-toggles`, `palette-generator-extras`, `palette-modifier-actions`,
  `palette-noise-targets`, `palette-modify-toggles`, `palette-image-extras`, and
  `panel-favients` (the Favients shelf panel).
- **A history provider** keyed `paletteGenerator` — bridges the generator's non-DDFS
  Zustand state (curves + slots) into engine undo ([06_Undo_Transactions.md](../../engine/06_Undo_Transactions.md)).
- **Seeds** the Favients shelf with built-in `GRADIENT_PRESETS` on first run.

---

## Shared core

The pure, host-agnostic foundation under `core/` (no DOM, no React, no store, no
`Math.random`) — vitest-covered (`npm run test:palette`).

### `gmtGradient.ts` — the canonical gradient type
Byte-exact mirror of GMT's `renderStopsToRamp(stops, blendSpace, colorSpace) →
RGB[256]`. A gradient is a `GradientStop[]` (`{ position 0–1, color hex, bias?,
interpolation? }`) plus a blend space (`'oklab'` polar / `'rgb'`) and colour space
(`'srgb'` / `'linear'` / `'aces_inverse'`). `renderStopsToBuffer()` returns the
Uint8Array (RGBA 256×1) with the same float→byte truncation GMT uses, so palette
previews match the fractal byte-for-byte.

### `oklab.ts` — colour math
Ported verbatim from GMT's `utils/colorUtils.ts` so there's no drift. Key export:
**`oklabToRgbSafe(Lab)`** — Ottosson **chroma-clip** (binary-search chroma down at
constant L + hue until in-gamut). Naïve per-channel clamping shifts hue toward grey;
this sacrifices only vividness and preserves hue. img2grad uses it for out-of-gamut
image pixels. Also: `rgbToOklab` / `oklabToRgb`, `lerpOklab` (polar, GMT's `'oklab'`
blend), `oklabDistance`.

### `stopFit.ts` + `gradientSeam.ts` — the output seam
`fitRampToStops(ramp)` converts a 256-step ramp to a compact GMT `GradientConfig`:
**corner pre-seed** (hard transitions → `step` edges, for crisp posterization) +
**refine-to-worst-RENDERED-error** measured against `gmtGradient.ts`'s actual pipeline
(beats Douglas-Peucker, which is blind to OKLCh interp). The fidelity dial is monotonic
(mean ΔE 0.076→0.018 as 8→64 stops); smooth palettes need ~8 stops.

`gradientSeam.ts` is the host-facing bridge:
- `entryToGradientConfig(entry)` — presets return their stops as-is (`colorSpace:
  'linear'`, what the fractal shader expects); ramp-only entries are fitted via
  `fitRampToStops` (capped `SEAM_MAX_STOPS = 128`).
- `applyGradientConfig(config, layer)` / `applyEntryToColoring(entry)` — call
  `setColoring({ gradient | gradient2 })` on the engine store (forces linear); return
  `false` when there's no coloring feature (e.g. the standalone Explorer).
- `applyEnvGradient()` — apply to the environment/sky gradient (forces `'srgb'` —
  displayed colour, not linear radiance).

### `storage.ts`
Thin localStorage wrappers (`lsGet/lsSet/lsRemove/lsGetJson/lsSetJson`) with
try/catch around quota + unavailability. Callers own their keys.

### `QualityRangePad.tsx` (+ `QualityRangePadConnected.tsx`)
A dual-bound range slider over a painted distribution track (looks like a GMT
`ScalarInput`): edge-grab to move a bound, body horizontal-drag to move the window,
vertical-drag to resize, Alt = fine mode. Ships track painters (lightness / chroma /
warmth / complexity / rainbow). The **Connected** variant (`palette-quality-pad`) is
the only store coupling — binds the pure pad to a `paletteFilters` vec2 slice param
(`{x: lo, y: hi}`), with one keyframe diamond keying both bounds together.

---

## Picker

Browse the baked ~11k-gradient catalog as a faceted, re-orderable wall.
**Entry:** `PickerStage` (in [gradient-explorer](../gradient-explorer/app.md)) composes
the controls + hero over **`PickerWall.tsx`** (the renderer). App-gmt mounts a compact
variant.

- **Wall layout** (`PickerWall` + `wallLayout.ts`): column-major within each group,
  grouped by category/source/none with left label gutters. Draws from a shared
  `256×N` sprite into **chunked canvases** (capped 2200 CSS px) that are
  **IntersectionObserver-virtualized** (only on-screen chunks mounted). `shouldSquare()`
  / `squareCols()` reflow only genuinely few-row, wide walls. Middle-drag zooms,
  right-drag pans.
- **Filters / facets** (`facets.ts`, `paletteFilters.ts` feature, `PickerControls.tsx`):
  every entry has 5 perceptual facets (lightness, chroma/vividness, complexity, rainbow,
  warmth, 0..1). Quality pads window each facet; theme chips
  (`palette-theme-chips`) and bundle toggles (`palette-bundle-toggles`) multi-select
  themes / show-hide bundles. Group / Rows / Sort are **independent** axes. Layout prefs
  (swatch size, padding, group/sort/rows, reverse) persist via `paletteFiltersPersist.ts`;
  quality windows + theme/bundle selections do **not** (so reloads don't silently hide gradients).
- **Selection / carve** (`selectionGeometry.ts` pure geometry + `SelectionOverlay.tsx`
  SVG): rect / lasso / paint a region, then click **inside** = isolate or **outside** =
  cut. Commits to `paletteFilters.keptIds` (a transient id-filter over the wall) — not
  a persistent selection.
- **Catalog** (`presetCatalog.ts` + `catalogLoader.ts`): `core` (uigradients,
  colorbrewer, matplotlib, pypalettes) ships locally; `softology` + `cptcity` are
  **lazy-loaded** licensed bundles from the CDN (`.bin.gz` Sub-filtered RGB ramps +
  `.json.gz` metadata + facets, pako-decompressed), with a local dev fallback.
  `presetCatalog.ts` also has a 24-preset fallback and `registerCustomRamp()` /
  `registerCustomChannels()` to append extracted/generated gradients on demand.
- **Store** (`pickerStore.ts`): holds merged `catalog`, `loaded`, derived
  `themes`/`bundles`/counts, `loadedGroups`, `loadingGroups`; `load()` fetches core,
  `setGroupLoaded(id, on)` lazy-loads/unloads a bundle and `rebuild()`s (remerge +
  reassign sprite rows). **Selection state lives in the `paletteFilters` DDFS slice, not
  here.**

---

## Generator

Build a gradient procedurally from two source slots + a per-channel curve editor.
**Entry:** **`GeneratorStage.tsx`** (canvas visuals: result hero, A/B source strips,
mix, the channel-graph editor); dock-tab dials live in the `paletteGenerator` feature.

- **Slots & params** (`paletteGenerator.ts`): `slotA`/`slotB` are catalog indices
  (default Turbo / Inferno). Each slot has hidden DDFS mods (`a/bHueRotate`, `…Chroma`,
  `…Contrast`, `…Reverse`, `…Repeats`, `…Phase`, `…Mirror`); global params are `mixL/C/H`,
  `hueRotate`, `chroma`, `contrast`, `bands`, `repeats`, `phase`, `mirror`, `reverse`,
  `noise`, `noiseFreq`, `noiseL/C/H`. All are real DDFS params → undo/preset/animation.
  `GenParamSlider` renders one with a keyframe diamond.
- **Pipeline** (`generatorPipeline.ts` → `buildGradientRamp`): decompose both slots to
  OKLCh → per-slot mods → per-channel mix (linear L/C, circular hue) → **BASE snapshot**
  → optional curve override → global reverse → per-texel [repeats+phase → mirror →
  posterize → contrast·chroma·hue → **deterministic noise** (seeded mulberry32, 3
  per-channel seeds) → gamut clamp] → recombine to 256 sRGB. Returns the ramp + both
  base (post-mix) and un-clipped final channels. Ported verbatim from the prototype
  except one fidelity fix (only wrap `t` when actually tiling).
- **Channel curve editor** (`channelCurve.ts` + `ChannelGraphEditor.tsx` +
  `ChannelTrackSidebar.tsx`): `rampToBezierTrack()` (Douglas-Peucker keyframe placement
  + auto-tangents) turns 256 channel values into a smooth, draggable engine `Track`;
  `trackToRamp()` samples it back. The editor **reuses the engine's animation-graph
  canvas** (GraphCanvas/Renderer/interaction) to edit 3 Tracks (L, C, h) with no
  timeline scrub. `CURVE_FRAMES = 255` (frame == sample index).
- **`stopFit`**: the result ramp is fit to GMT stops for export/seam (see Shared core).
- **Modifiers**: per-slot (`GeneratorSlotMods` ⚙ panel: bake / reset) and global
  (`GeneratorModifierActions`, `ModifyTogglesControl`, `NoiseTargetsControl`,
  `MixBlend`). `MixBlend` is 3 vertical L/C/h sliders bridging A (top) → B (bottom).
  Bake folds the mod chain into the un-clipped channels.
- **Store** (`generatorStore.ts`): non-DDFS state — `slotA/B`, `tracks`, `curvesOn`,
  `detail`, `smooth`, `noiseSeed`, `exportFmt`. **`useGeneratorDerived()`** is the
  memoized hub that reads the DDFS slice + store, runs the pipeline once, fits stops, and
  feeds both the canvas and the dock. Edits bracket via `genEditStart/End()`;
  `capture/restoreGeneratorHistory()` back the undo provider. `sendRampToSlot(which,
  ramp, name)` is the seam that loads an arbitrary 256-RGB ramp (from Image / Favients)
  into a slot via `registerCustomRamp`.

---

## Favients

A persistent, host-agnostic **favourites shelf** of saved gradients (left dock in the
Explorer, floating in app-gmt). **Entry:** `FavientsPanel.tsx` (`panel-favients`).

- A **Favient** (`favientsStore.ts`) wraps a `GradientConfig` (stops = interchange) +
  metadata (`id`, `name`, `source`, `createdAt`, `group`). `FavStar.tsx` is the
  reusable ☆/★ toggle on Generator + Image + Picker results, deduped by content
  signature `favientSig()`. `FavientsIcon.tsx` centralizes the glyph + `FAVIENTS_ACCENT`
  style tokens.
- **Store** (`favientsStore.ts`): `favients[]` (localStorage `gmt.favients`, shared
  across all GMT apps same-origin), `groupLabels`, `selectedTargetId`; actions
  `add/remove/toggle/moveFavient/insertFavient/seedPresets/export/importCollection`.
  Panel open-state + docking persist via `favientsPanelPersist.ts` under a **per-host
  key** (so Explorer ≠ app-gmt).
- **DnD** (`favientDnd.ts`): MIME `application/x-gmt-favient` carrying `{config, name,
  source, favId?}`; an internal marker MIME distinguishes reorder from external drop.
- **Targets** (`favientTargets.ts`): a host-agnostic registry — each host calls
  `registerFavientTarget({id, label, apply})`. The Explorer registers `Generator · Slot
  A/B` (→ `sendRampToSlot`); app-gmt registers coloring layers (→ `applyGradientConfig`).
  The panel's "Applying to ▾" dropdown + drop-targets read this list. **No engine coupling.**
- **Export** (`favientsExport.ts`): per-gradient zip (.map/.ggr/.gpl/.cpt/.grd/CSS),
  single-file collections (.ai/.idml hold all favourites as one swatch library), PNG
  contact sheet, and `collectionQualityWarnings()` for lossy .ai/.idml stop reduction.

---

## Image tool (img2grad)

Extract a 256-step gradient from an image. **Entry:** `ImageStage.tsx` (drop / paste /
click to load → downsampled to ≤160px work copy + ≤1920px display thumb; mode tabs;
result strip; rotatable OKLab colour cloud; Trace pane with draggable handles). Dials
live in the `paletteImage` feature; `ImageExtrasPanel.tsx` (`palette-image-extras`) is
the export block.

- **Pipeline** (`core/img2grad/`, pure + deterministic — same image+settings ⇒
  byte-identical ramp). `extract(model, path, params)` (`index.ts`):
  `applyWeights` (frequency ↔ saliency ↔ golden-hour) → **mode stage** → `order` (NN +
  2-opt open path, for Distill) → `resample` (arc-length ↔ mass-dwell → 256) → reverse?
  → `oklabToRgbSafe`. Returns `{ ramp: RGB[256], ribbon: Lab[256] }`.
- **Three modes**: **Distill** (`distill.ts` — weighted farthest-point k-means++ → Lloyd
  → medoid-snap → path-order: saliency-weighted dominant colours), **Tone** (`tone.ts` —
  the image's own colour at each lightness level, circular-mean hue per bucket), **Trace**
  (`trace.ts` — colours along a draggable line / freehand polyline with a perpendicular
  gaussian band; `autoPath()` scans 24 diametric lines for the best progression).
- **Ingest** (`ingest.ts`): RGBA → `ImageModel` (per-pixel Lab, 5-bit bins with
  centre-prior, global-contrast saliency, capped display cloud). The DOM does the ≤160px
  downsample; the math is pure. `common.ts` holds the shared types
  (`Bin`/`ColorNode`/`ImageModel`/`TracePath`); `weights.ts` the weighting.
- **Store** (`imageStore.ts`): `model`, `path` (`{x0,y0,x1,y1, points?}`), `thumb`,
  `loading`, `exportFmt`. `useImageDerived()` runs `extract()` once for canvas + panel.
  The `paletteImage` DDFS slice holds the dials (`mode`, plus per-mode `colours/saliency`,
  `tonalDetail/chromaBoost`, `bandWidth/smoothing/catmullRom`, shared `goldenHour/spacing/reverse`).
- **Out**: img2grad emits a *ramp*; favouriting / sending fits it to stops via
  `stopFit` (`fitRampToStops`) so it lands as an interchange config.

---

## Exporters

`exportFormats.ts` is the master **`EXPORT_FORMATS`** registry (15 formats): plain text
(map / hex / CSS / SVG / JSON / JS / Python / CSV / GIMP .gpl & .ggr / Paint.NET / GMT
.cpt / Adobe Illustrator **.ai**) and binary (Photoshop **.grd** v3 8BGR, InDesign
**.idml**). Both **.ai** and **.idml** are full registered formats that also implement
`collection(items)` to emit one combined file from many gradients. A descriptor is
`{ key, label, ext, binary?, build(ramp) => string|Uint8Array, collection?(items) }`.
"Pro" formats cap stops via `reduceStopIndices()` (Douglas-Peucker, ~40 stops);
`aiReductionError()` / `aiLossyGradients()` flag visibly-lossy gradients for UI warnings.

**InDesign IDML** (`indesignIdml.ts` + `indesignIdmlTemplate.ts`): an IDML is a ZIP of
XML parts; gradients import as real **gradient swatches**. `buildIdmlSwatchLibrary()`
reduces each ramp to ≤40 stops, regenerates `Resources/Graphic.xml` (`<Gradient>` +
`<GradientStop Location/Midpoint>`) and patches `designmap.xml`'s `<ColorGroup>`, then
re-zips in original part order over a base64 deflate(JSON) template. Limits: ≤40 stops,
**RGB only** (no CMYK), auto-suffixed duplicate swatch names.

---

## Non-obvious data flow (cross-subsystem)

- **Everything converges on a 256-step ramp.** Picker entries, generator output, and
  img2grad all produce a ramp; the **seam** (`fitRampToStops` → `GradientConfig`) is the
  single conversion point to GMT's stop-based system. Don't add a second ramp→stops path.
- **DDFS vs Zustand split is deliberate.** Scalar/vec dials are DDFS params (free undo +
  keyframes + presets); non-scalar state (channel `Track[]`, loaded catalog, image
  model, favourites) is in local Zustand stores. The generator bridges its Zustand state
  into undo via a registered history provider.
- **`sendRampToSlot` + `registerCustomRamp`** is the merge seam: Image / Favients output
  becomes a generator source slot by appending an ad-hoc ramp-only catalog entry
  (deduped by content signature — `rampSig` — so re-sending the same ramp refreshes its
  entry rather than growing the catalog unbounded).
- **Determinism is a contract** in `core/` (no `Math.random`, no DOM) so the vitest
  harnesses (`npm run test:palette`) can assert byte-identical output.
