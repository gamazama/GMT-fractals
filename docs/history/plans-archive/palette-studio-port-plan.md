# Palette Studio — port plan (palette-lab → gmt-engine `dev/`)

**Status:** plan / pre-build. Decisions locked with user 2026-06-03.
**Targets:** `dev/` (NOT stable). Reference impl: `H:\GMT\stuff\palette-lab\` (repo `GMT_gradients`).
**Prereqs read:** `GMT_PORT_HANDOFF.md`, memory `project_softology_palette_param` (full algorithm log)
+ `project_img2grad_gmt_integration`. The standalone HTML + `harness/test_*.js` are the spec.

---

## Locked decisions (user, 2026-06-03)

1. **Feed it.** Generated / picked / extracted gradients hand off to GMT's existing
   stop-based system (`GradientConfig` → `generateGradientTextureBuffer` → DataTexture →
   the 4 shader consumers). We do **not** supersede `AdvancedGradientEditor` or touch the
   consumers. The bezier channel-curves are an *authoring* representation; **stops are the
   interchange.**
2. **Both in lockstep.** The generator core is a **host-agnostic** module/component from
   day one — wired simultaneously into (a) the standalone studio and (b) an app-gmt dock
   panel feeding the active coloring layer ("the generator minus the studio chrome").
3. **All three as one "Palette Studio."** The standalone deliverable is the full
   mode-tabbed app: **Generator + Picker + Image**. Integration into app-gmt rides on the
   host-agnostic generator (and optionally a compact picker browser).
4. **Catalog data = curated core baked + separable licensed bundles + server-loaded.**
   Bake a small, license-clean, deduped **core** as a static sprite+catalog. Keep the
   licensing-bound sources (softology — provenance-unverified; cpt-city — redistribution)
   as **separate bundles** (own sprite+catalog files) that can be toggled/removed
   independently. Host the larger/optional bundles on backend/R2 and **lazy-load** them.

---

## What GMT already gives us (reuse — do NOT re-port)

The handoff predates this audit; the big finding is GMT already has a mature gradient stack.

| GMT asset | Path | Use |
|---|---|---|
| `GradientStop[]` / `GradientConfig` (stops + blendSpace + colorSpace) | `dev/types/graphics.ts` | **canonical representation** (the "feed it" target) |
| `generateGradientTextureBuffer()` (256-step bake) | `dev/utils/colorUtils.ts` | stops → DataTexture buffer |
| `blendLerp` w/ OKLab/HSV/RGB; sRGB↔linear↔OKLab (TS) | `dev/utils/colorUtils.ts` | OKLab math base (extend w/ gamut-safe chroma-clip) |
| `AdvancedGradientEditor.tsx` (knot editor, already shared app-gmt+fluid-toy) | `dev/components/AdvancedGradientEditor.tsx` | the inline editor we **feed**, untouched |
| DataTexture upload + `setGradient(stops, uniformName)` | `dev/engine-gmt/engine/MaterialController.ts` | output path; unchanged |
| 4 shader consumers (`vec2(t,0.5)`) | coloring / material_eval L1&L2 / volumetric_scatter | unchanged |
| `createStateLibrarySlice.ts` (generic palette/view persistence) | `dev/engine/store/createStateLibrarySlice.ts` | home for the gradient **library** (save generated) |
| Toast, Dock, PanelRouter, TopBar, componentRegistry, DDFS | shell + plugin infra | studio chrome + app-gmt panel |

**Gap GMT does NOT have:** a faceted palette **catalog/picker** (only a flat 24-preset
dropdown in `data/gradientPresets.ts`). The Picker fills this.

## What we port (the genuinely-new IP — host-agnostic `dev/palette/`)

Crown jewels from palette-lab, as pure TS + vitest (harnesses are the executable spec):
- **Schneider bezier curve fitter** (the hardest, most valuable). 6-step pipeline, order is
  **load-bearing** (per-channel fit → corner-detect on RAW → edge-preserving in-span smooth
  → Schneider fit → handle polish → refine-to-target). Specs: `harness/test_bezier3.js`,
  `test_bezier2.js`, `test_curves.js`. Targets: detail-8 ≈ 19 L-anchors / dE ~0.003.
- **14-format export suite** + GRD v3 binary + Douglas-Peucker stop reduction (GRD_MAX=40).
- **Generator `buildResult` pipeline** (decompose→mix→modify→curve→noise→gamut→256 RGB).
- **img2grad extraction** (Distill k-means / Tone lightness-spine / Trace path) + deterministic
  farthest-point seeding (no `Math.random`) + gamut-safe OKLab→sRGB chroma-clip.

---

## Architecture

```
dev/palette/                       # host-agnostic shared tree
  core/                            # pure TS, no DOM/React, vitest-covered
    oklab.ts                       # reconcile w/ colorUtils + gamut-safe chroma-clip
    curveFit.ts                    # Schneider 6-step fitter  ← crown jewel
    generatorPipeline.ts           # buildResult (pure fn over slider state)
    export/                        # 14 formats + GRD v3 + DP reduce
    img2grad/                      # distill / tone / trace (deterministic)
    catalog.ts                     # source-agnostic catalog types + loader
    seam.ts                        # ramp256 → GradientConfig (DP→stops)  ← the "feed it" contract
  components/                      # host-agnostic React (canvas2d + refs)
    ChannelCurveEditor.tsx         # bezier editor (drag anchors/handles, split/remove)
    GeneratorPanel.tsx             # A/B slots, mix, modifiers, noise  ← reused in app-gmt
    GradientPreviewStrip.tsx
    ExportPanel.tsx
    PickerWall.tsx                 # faceted re-orderable wall
    Img2GradPanel.tsx              # image pane + 3D OKLab cloud + trace handles
  store/                           # DDFS feature `paletteStudio` (undo/preset/animation)

dev/palette-studio.html            # standalone entry (mode-tabbed Dock app)
dev/palette-studio/main.tsx        # boot (mirror fluid-toy/main.tsx order)
dev/palette-studio/PaletteStudioApp.tsx
```

**The output seam (`core/stopFit.ts`) — the heart of "feed it" + the curve-fit adaptation:**
generator/img2grad/picker all produce a **256-step RGB ramp**; `stopFit.fitRampToStops`
converts it to a GMT `GradientConfig` (unified stops, blendSpace 'oklab'). It is the
GMT-adapted version of the advanced fitter: GMT stops are a UNIFIED colour path (no separate
H/L/C curves, no bezier handles — OKLCh-polar interp between stops), so the fitter carries the
two load-bearing ideas, not the bezier output: (1) **corner pre-seed** with `step` edges for
crisp posterization; (2) **refine-to-worst-RENDERED-error** measured against GMT's *actual*
gradient pipeline (a pure byte-exact mirror, `core/gmtGradient.ts`). This beats Douglas-Peucker
(which is blind to OKLCh interp). Verified: byte-exact mirror, fidelity dial monotonic
(mean ΔE 0.076→0.018 as 8→64 stops), smooth palettes ~8 stops. A future `pushGradient(ramp, target)` wraps it where `target` is:
- studio mode → the studio's own preview/library state;
- app-gmt → the **active coloring layer's** `gradient` param (via `setGradient`/the coloring
  feature setter). This is the host-agnostic seam that makes decision **2** real.
*(Open: offer an optional "bake exact DataTexture" path for cases where DP-to-stops is too
lossy — decide in Phase 1 once we measure fidelity on banded palettes.)*

**Canvas-per-mode (user's question):** unlike fluid/fractal toys there's no single viewport —
each mode owns its surface (curve-editor canvas2d / sprite wall / image+cloud). So the
standalone app is a **mode-tabbed Dock layout**, not viewport+panels. In app-gmt only the
generator's curve editor + export dock (small) — that's the "minus the canvas" reuse.

---

## Phases

### Phase 0 — Scaffold + seam contract
- `dev/palette/` skeleton, `palette-studio.html` + vite entry (one line in
  `vite.config.ts` rollup input), minimal mode-tabbed `PaletteStudioApp` shell.
- `core/seam.ts` + `pushGradient` contract + vitest on ramp→GradientConfig round-trip.
- **Gate:** empty studio boots; seam converter green.

### Phase 1 — Port the pure IP (TS + vitest) — biggest phase
Order per handoff §2: `oklab` (reconcile + chroma-clip) → `export/` → `generatorPipeline`
→ **`curveFit`** (port `harness/test_bezier*.js` as vitest) → `img2grad/`.
- **Gate:** vitest matches harness measurements (curve dE, anchor counts, deterministic
  extraction); export round-trips; decide DP-to-stops fidelity / exact-bake fallback.

### Phase 2 — Generator UI + lockstep host wiring (proves decision 2 early)
- `ChannelCurveEditor` + `GeneratorPanel` + `GradientPreviewStrip` + `ExportPanel`.
  State in the `paletteStudio` DDFS feature (undo/preset/animation wired).
- Mount the **same** `GeneratorPanel` in (a) studio Generator tab and (b) an **app-gmt dock
  panel** feeding the active coloring layer via `seam.pushGradient`.
- **Gate:** generate a gradient in app-gmt → it colours a live fractal.

**STATUS — Generator stage BUILT (2026-06-03, typecheck clean, `npm run test:palette` green).**
Decision change carried through: the prototype's Schneider bezier editor is replaced by the
ENGINE'S animation-graph curve canvas (user: "controls curves quite well, looks much better").
Files:
- `palette/core/generatorPipeline.ts` — pure `buildGradientRamp` (decompose A/B → per-slot mods →
  per-channel mix → BASE snapshot → curve override → reverse → [repeats+phase → mirror → posterize
  → contrast·chroma·hue-rot → noise → gamut] → recombine). Ported VERBATIM from prototype
  `buildResult` EXCEPT one fidelity fix: the prototype's unconditional `t-floor(t)` wrapped the
  final texel (t=1.0→0) so an un-tiled gradient's last colour wrongly equalled its first; we now
  wrap only when actually tiling/phasing/mirroring (identity is exact). Noise is DETERMINISTIC
  (seeded mulberry32, no Math.random) — reseed = integer bump.
- `palette/components/useChannelGraphInteraction.ts` — structurally-faithful fork of
  `hooks/useGraphInteraction.ts` (same GraphUtils hit-test + drag/handle/box semantics + the
  scale/constrain handle math). Only substitution: store actions → injected local-state callbacks.
  Soft-selection + ruler-scrub dropped (additive, easy to fold back on unify). KEY: `updateKeyframes`
  must be a STABLE ref (reads tracks via a ref) or the window mousemove listener tears down mid-drag.
- `palette/core/channelCurve.ts` — added `rampToBezierTrack` (DP placement + AnimationMath
  auto-tangents → smooth, draggable Bezier keys). `rampToTrack` (Linear, harness-locked) untouched.
- `palette/components/ChannelGraphEditor.tsx` — controlled 3-track (L/C/h) editor via `GraphCanvas`;
  per-channel normalized ranges; tabs/add(dbl/ctrl-click)/delete/right-click-remove. Playhead hidden
  off-screen (currentFrame=-1e6) — leaves a tiny gutter arrow artifact (cosmetic, future cleanup).
- `palette/components/GradientStrip.tsx` + `GeneratorStage.tsx` — hero preview, A/B slots (preset
  picker + 🎲) with per-slot hue/chroma/contrast/reverse UNDER each strip, A↔B mix, global modifier
  chain, noise, the curve editor (Fit-from-source / detail / Reset), export (hex/map/css/json copy+dl).
  Reuses GMT `ScalarInput`. Wired into `PaletteStudioApp` Stage (`activeRightTab==='Generator'`).
- `debug/test-palette-generator.mts` (in `npm run test:palette`): identity, mix endpoints, chroma0=grey,
  reverse, noise determinism, posterize≤N, seam fit.
STILL OPEN for Phase 2: source slots use built-in presets (Picker feeds them later); per-channel
interpolation toggle / smooth-all button; DDFS-feature state for the scalar dials (currently a shared
zustand store, no keyframe/undo/preset on generator dials yet); the app-gmt lockstep panel +
`seam.pushGradient` (the actual decision-2 gate).

**FOLLOW-UP DONE (2026-06-03): full export suite + panel/canvas split.**
- `core/exportFormats.ts` — the complete shared exporter (pure): map/hex/css/svg/json/js/py/csv/
  gpl/ggr/cpt/pdn (verbatim from generator_template) + Photoshop **.grd v3 binary** (8BGR, 16-bit×257,
  Douglas-Peucker stop-reduce GRD_MAX=40, from img2grad_template). PNG is a canvas op in the panel.
  Copy disabled for binary; .grd reports its reduced stop count.
- Added the curve-fit **smooth** pre-smooth dial (`generatorPipeline.smoothChannel`).
- **Layout (user steer): controls belong in the dock tab, not the canvas.** All dials moved to
  `components/GeneratorControlsPanel.tsx` (registered `palette-generator-panel`, mounted by
  AutoFeaturePanel — `paletteGenerator` is now `params:{}` + one customUI entry). `GeneratorStage`
  is now canvas-visuals-only (result hero + A/B strips + curve editor). Shared state lives in
  `store/generatorStore.ts` (zustand) — chosen over a DDFS slice because the channel-curve `Track[]`
  don't fit scalar params and the panel + canvas are far apart in the tree; `useGeneratorDerived()`
  runs the pipeline once for both surfaces.

### Phase 3 — Catalog pipeline + Picker
- Python: curated-core bake + per-source **separable** bundles + manifest; R2 upload for the
  server-loaded long tail. `core/catalog.ts` loader is source-agnostic (local-baked vs
  fetched, paged).
- `PickerWall`: faceted wall, dual-axis quality pads, theme chips, bundle load/unload (now
  local-vs-server too). Pick → feeds a generator slot.
- App-gmt: optional compact palette browser (fills the catalog gap) sets a fractal gradient.
- **Gate:** picker renders core offline; server bundles lazy-load; pick→generator works.

### Phase 4 — Image mode + merge
- `Img2GradPanel`: drop/paste image, Distill/Tone/Trace, 3D OKLab cloud (port canvas2d
  projection as-is; Three.js later), gamut-safe export. Output feeds a generator slot (the merge).
- **Gate:** image → gradient → generator slot → fractal.

**STATUS — Image mode BUILT (2026-06-03, typecheck clean whole-project, `npm run test:palette`
green incl new img2grad harness). The third studio tab runs end-to-end.**
- `palette/core/img2grad/` — pure + DETERMINISTIC extraction (no Math.random), VERBATIM port of
  `img2grad_template.html`: `common.ts` (types + dist2/clamp/lerp), `ingest.ts` (5-bit bins +
  centre-prior + global-colour-contrast saliency + capped cloud; pure over RGBA — the DOM does the
  ≤160px downsample), `weights.ts` (frequency↔saliency↔golden-hour), `distill.ts` (weighted
  farthest-point k-means++ → Lloyd → medoid-snap), `order.ts` (NN + 2-opt open path, dark→light),
  `tone.ts` (chroma-weighted circular-mean hue per L-bucket), `trace.ts` (perpendicular-band sample +
  `autoPath` best-path scan), `resample.ts` (arc-length↔mass-dwell → 256), `index.ts` (`extract` +
  `Img2GradParams`/`Img2GradResult`). Gamut-safe OKLab→sRGB = `oklabToRgbSafe` added to `core/oklab.ts`
  (Ottosson chroma-clip at constant L,h — reuses the file's coeffs).
- `debug/test-palette-img2grad.mts` (wired into `test:palette`): same image+settings ⇒ byte-identical
  ramp (all 3 modes), 256-stop + in-gamut, reverse mirrors, distill colour-count + saliency/golden-hour
  actually move the result and stay deterministic.
- **The merge ("slot-custom-RGB" seam):** `presetCatalog.registerCustomRamp(ramp, name)` appends an
  ad-hoc `CatalogEntry` (ramp-only, no stops; same-name entries REPLACE in place so the catalog doesn't
  grow unbounded) and returns its index; `presetRamp()` now falls back to the baked `ramp` buffer when
  an entry has no stops; `generatorStore.sendRampToSlot(which, ramp, name)` registers + loads the slot.
  Today slots are catalog indices — this is the seam the memory called out for arbitrary 256-RGB ramps.
- UI: `store/imageStore.ts` (ImageModel + trace path + export fmt; `useImageDerived` runs the pipeline
  once for canvas + dock), `features/paletteImage.ts` (full DDFS: `mode` int+`options` → GMT Dropdown,
  per-mode params via `dynamicVisible`, golden-hour/spacing hidden in Trace; `palette-image-extras`
  customUI), `components/ImageStage.tsx` (whole-window drop+overlay+paste, mode tabs bound to the slice,
  result strip + Send-to-Generator A/B, rotatable canvas-2D OKLab cloud, source/trace pane with draggable
  endpoint handles + auto-path), `components/ImageExtrasPanel.tsx` (export suite, GenericDropdown). Wired
  into `PaletteStudioApp` Stage (`activeTab==='Image'`) + registered in `registerPaletteUI`.
- OPEN: 3D cloud is canvas-2D (Three later); app-gmt lockstep panel for Image not in scope; Trace
  freehand path / Catmull smoothing toggle are standalone-prototype follow-ups not ported.

### Phase 5 — Integration payoff + polish
- Save generated/picked/extracted gradients to the library (StateLibrary slice); attribution
  ships with redistributed data. `/polish` pass to GMT design language (drop prototype dark theme).

**STATUS — "FAVIENTS" SHELF BUILT (2026-06-03, typecheck clean, `test:palette` green). The
library-as-panel reframes the merge UX (user pivot): a persistent, always-on floating shelf of
favourite gradients instead of one-shot "Send to Generator" actions.**
- DESIGN: a beautiful floating (dockable) panel that persists across sessions AND across every GMT
  app (same-origin `localStorage['gmt.favients']`). A target dropdown ("Applying to ▾") decides where
  a click lands; favourites are also DRAG-AND-DROP onto a target. Minimal-but-full so the user leaves
  it on screen.
- Favourites store a GMT `GradientConfig` (stops = the interchange) — ramp-only img2grad output is
  `fitRampToStops`'d at favourite-time, so every favourite applies cleanly to any target.
- HOST-AGNOSTIC core (works in all apps; only Studio wired this session):
  - `palette/store/favientsStore.ts` — zustand + `gmt.favients` persistence; `add/remove/toggle/isFav`
    (toggle keyed by a content signature `favientSig` so the star is idempotent), selected-target id.
  - `palette/core/favientTargets.ts` — `registerFavientTarget({id,label,apply})` registry each host
    populates. Studio (`palette-studio/registerFeatures.ts`) registers **Generator · Slot A/B**
    (`sendRampToSlot`); app-gmt will register **Coloring Layer 1/2** (`gradientSeam.applyGradientConfig`).
  - `palette/core/favientDnd.ts` — DnD payload contract (`application/x-gmt-favient`).
  - `palette/components/FavientsPanel.tsx` — `panel-favients` (registered in `registerPaletteUI`):
    target dropdown (GenericDropdown) + draggable swatch grid (click=apply, ×=remove) + empty state.
  - `palette/components/FavStar.tsx` — reusable ☆/★ toggle with a click-in "pop"; on Generator result
    + Image result. Drop a favourite onto a Generator source slot to load it (drop target in
    `GeneratorStage` SourceRow, amber ring on dragover).
  - Manifest: `setup.ts` adds a `Favients` panel, floats it top-right, open by default.
- OPEN / next: **Picker favourite is the one wire left** — PickerStage/PickerWall are the parallel
  track's files (don't-clobber), so the click-to-favourite gesture there is a 1-line `FavStar`/`toggle`
  drop-in for that track (API is ready). app-gmt: register the panel in `GmtPanels` + Coloring targets.
  Panel open-state + float position aren't persisted yet (reopens at default each load).

---

## Risks / open items
- **Curve editor is the schedule risk** (Phase 1+2) — port the fitter verbatim, lean on harnesses.
- **DP-to-stops fidelity** on hard-banded palettes — measure in Phase 1; keep the exact-bake
  fallback in reserve.
- **OKLab in GLSL not needed** — blending is CPU at bake time (matches GMT today).
- **Licensing** — softology/cpt-city stay separable + attributed; default-off or removable.
- `isolatedModules` → `export type {}` for type-only re-exports (CLAUDE.md).
- Registry **freeze order** — feature/component registration before first store touch
  (mirror `fluid-toy/main.tsx`).
```
