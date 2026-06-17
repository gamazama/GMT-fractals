# Palette Picker + Apply-Seam — handoff

**Status (2026-06-03):** Picker + apply seam built+user-verified. **All 4 open action points
below now DONE** (bundle-split licensing bake, commit-vs-generate decision, full-width overlay,
save-to-library) — `tsc --noEmit` = 0, `npm run test:palette` green; pending the user's VISUAL
verify of the overlay + lazy source load + save/recall. This doc covers the picker/seam track
only — Generator + Image tabs are a separate (parallel) track; see memory
`project_img2grad_gmt_integration` for that and the full algorithm log.

---

## What's done (verified)

**Picker** — a faceted catalog browser over the full library, in the studio's Picker tab
and as an app-gmt dock panel.
- Library: **11,131 gradients** (deduped) in 2 compressed static assets, ~2.25 MB.
- Quality filters (5 dual-range pads) + **Group by** (None/Category/Source) + **Rows by**
  (None / facets incl Hue — buckets *within* each group) + **Sort within** (facets incl
  Hue + Name — column order) + Reverse + Swatch size (vec2 W×H) + Padding + theme chips
  (colour-tinted) + source toggles (with attribution).
- Wall: grouped sections (category label down the left), column-major fill, **chunked**
  canvases + **IntersectionObserver virtualization** (draws only what's near the viewport).
- Crisp hi-res hero + prototype-style in-place hover zoom (3×w·2×h) + stats tooltip.

**Apply seam** — pick → colour a fractal.
- `palette/core/gradientSeam.ts`: `entryToGradientConfig` (preset = stops; loaded = `stopFit`
  the 256-ramp → stops) emits `colorSpace: 'linear'`; `applyGradientConfig` → `setColoring`;
  `applyEntryToColoring`. `SEAM_MAX_STOPS = 128` (banded palettes need ~per-band stops).
- Wired into app-gmt (additive): `registerPaletteUI()` in `app-gmt/registerFeatures.ts`,
  `componentRegistry.register('palette-picker', …)` after `registerGmtUi`, and two panels
  appended in `app-gmt/main.tsx`'s `applyPanelManifest([...GmtPanels, Palette, Palette Picker])`.

## File map (picker/seam)
```
palette/core/facets.ts          computeFacets (5 axes + raw incl meanHue) + passesFilters
palette/core/catalogLoader.ts   loadCatalog (pako gunzip + un-Sub-filter) + rampToCssGradient
palette/core/presetCatalog.ts   CatalogEntry{…,ramp,row}; buildPresetCatalog (fallback)
palette/core/gradientSeam.ts    entryToGradientConfig + applyGradientConfig (the seam)
palette/store/pickerStore.ts    loaded catalog + themes/themeColors/bundles/counts
palette/components/PickerWall.tsx       grouped + chunked + virtualized canvas wall
palette/components/PickerControls.tsx   theme chips + source toggles (custom-UI)
palette/features/paletteFilters.ts      all Picker controls as DDFS params
palette-studio/PickerStage.tsx          builds sprite + groups + hero; onPick → seam
debug/bake-palette-catalog.mts          npm run bake:palette → public/palette/{core,softology,cptcity}.{bin,json}.gz
app-gmt/PalettePickerOverlay.tsx        topbar "Palettes" button → full-width modal (filters + library sidebar + wall)
app-gmt/gradientLibrary.ts              installGradientLibrary() — savedGradients state-library + localStorage
app-gmt/GradientLibraryPanel.tsx        StateLibraryPanel shell + "+ Save current" (overlay sidebar)
```

## Test
- Studio: `npm run dev` → `/palette-studio.html`, Picker tab.
- app-gmt: `/app-gmt.html` → right dock **Palette** (controls) + **Palette Picker** (wall);
  pick → fractal recolours (Layer-1 `gradient`, in linear).

## Hard-won gotchas (don't relearn)
- **Canvas max ≈ 16k–32k px.** A single ungrouped group in a narrow container made a
  ~42,000px-tall canvas → multi-minute freeze. Fix = chunk (`MAX_CANVAS_CSS_H = 8000`) +
  virtualize. Never make one canvas taller than ~16384px.
- **`offsetX/offsetY` is wrong under a CSS-transformed ancestor** (floating DraggableWindow
  uses `transform: translate`) → picks land offset by the translate. Use
  `getBoundingClientRect()` + `clientX/clientY`.
- **StrictMode rAF leak:** cancel-without-nulling the ref blocks all future frames.
- **`h-full` collapses** under a flex-grown (indefinite-height) parent → use `absolute inset-0`
  of a `relative` slot (DraggableWindow body is `relative flex-1`, so absolute-fill works).
- **Apply in `colorSpace: 'linear'`**, not sRGB (the shader wants linear).

---

## OPEN ACTION POINTS — ALL DONE (2026-06-03, tsc 0, test:palette green)

### 1. Bundle-split bake (licensing) — ✅ DONE
`bake-palette-catalog.mts` now writes THREE separable `.bin.gz`+`.json.gz` pairs by group
(`GROUP_OF`/`GROUPS`): **core** (uigradients/colorbrewer/matplotlib/pypalettes, 3076, ~0.5MB,
redistributable), **softology** (3354, ~1.2MB), **cptcity** (4701, ~0.5MB). Dedup stays GLOBAL
and runs BEFORE the split; source priority bumped so core OUTRANKS licensed (colorbrewer 0 …
pypalettes 3, cptcity 4, softology 5) → a duplicate resolves to the core copy, maximising the
core-only build. Each file's json carries the FULL manifest + per-bundle `counts` so the toggle
UI knows about un-loaded bundles. `catalogLoader.ts`: `loadGroup(id)` (cached per group) +
`PALETTE_GROUPS` registry + `groupOfBundle()` + `getBundleCounts()`; `loadCatalog` removed.
`pickerStore.ts`: `load()` loads `core:true` groups on start; `setGroupLoaded(id,on)` lazy
fetch/unloads a licensed group; `rebuild()` concatenates loaded groups in registry order,
**repacks every `row` to its merged index**, re-derives theme chips (PickerStage's sprite
useMemo rebuilds on `catalog` change). `PickerControls.tsx` source toggles: **core = hide/show**
(paletteFilters.hiddenBundles, unchanged), **licensed = load/unload + fetch on demand** (amber
• marker + "loaded on demand, omittable from a public build" note + … spinner while loading).

### 2. `public/palette/*.gz` — ✅ DECIDED: commit core, gitignore licensed
The bake reads from `H:/GMT/stuff/palette-lab` (NOT in repo) → a clean checkout/CI can't
regenerate, so generate-in-build is out. `.gitignore`: **core.*** = TRACKED (clean, ~0.5MB,
ships always); **softology.*** / **cptcity.*** = ignored (lazy-loaded; serve from R2 or omit in
a public build). All 6 files exist locally for dev serve. `loadGroup(id, base='/palette/')` —
point licensed bundles at an R2 base in prod (not wired; graceful 404 → warn + clear loading).

### 3. app-gmt panel presentation — ✅ DONE: full-width overlay
`app-gmt/PalettePickerOverlay.tsx` = topbar "Palettes" button (left slot, order 22) → fixed
full-screen portal modal: header (✕/Esc close, **no backdrop-click** per feedback_ui_surface_design),
body = [300px sidebar: `<AutoFeaturePanel featureId="paletteFilters"/>` + `<GradientLibraryPanel/>`]
+ [`<PickerStage/>` flex-1]. Replaces the two cramped right-dock panels (removed from the
manifest in `main.tsx`; the `palette-picker` componentRegistry entry is gone). Hover/picks
transform-safe (PickerWall uses getBoundingClientRect), so the portal doesn't offset.

### 4. Save to gradient library (Phase 5) — ✅ DONE
`app-gmt/gradientLibrary.ts` `installGradientLibrary()` wires `installStateLibrary<GradientConfig>`
(arrayKey `savedGradients`, activeId `activeGradientId`, actions add/update/…/`saveGradientToSlot`).
The single "active slot" = coloring layer 1's gradient: `capture()` reads `coloring.gradient`
(normalised to a `{stops,colorSpace:'linear',blendSpace:'oklab'}` config), `apply()` → seam
`applyGradientConfig(cfg,1)`, `isGradientModified` diffs stops, thumbnail = 64×16 sRGB strip via
`renderStopsToBuffer`. NO slot hotkeys (cameras own 1..9), `menu:null`. **Persisted to
localStorage** (`gmt.savedGradients.v1`) — hydrate on install + mirror on every change, so
favourites survive reload (separate from GMF). UI: `app-gmt/GradientLibraryPanel.tsx` (shell over
`StateLibraryPanel` + "+ Save current" button) in the overlay sidebar.

### Remaining follow-ups (small)
- Wire an R2 `base` for licensed `loadGroup` in prod (today they 404 gracefully if absent).
- Save-to-library uses an auto "Gradient N" label; could thread the picked entry's name.

### Cross-track (parallel Generator session — not picker/seam)
Generator stage (ChannelGraphEditor + pipeline) + the graph-editor unification roadmap
(`dev/plans/graph-editor-unification.md`). Leave to that track.
