---
paths:
  - "palette/**"
---

# The palette suite

`palette/**` is the gradient/palette authoring suite: the colour core, the
generator and img2grad pipelines, the Favients shelf, the picker wall, and the
four DDFS features that expose them. It is mounted by more than one host —
app-gmt and the Gradient Explorer today — through a single registration seam.

Written 2026-09-01, the last subsystem-sized area of the tree with no rule.
Three auditors drafted it during the overnight audit and none wrote it, to avoid
colliding; this is their merged material, re-verified rather than transcribed.

## Read first

In this order — each is the entry point to a layer:

- `palette/registerPaletteUI.ts` — the single boot seam. What gets registered,
  in what order, and why it must run **before** `createEngineStore()`.
- `palette/installFavients.ts` — the per-host mount and the `storageKey`
  contract.
- `palette/core/gradientSeam.ts` — the ramp → `GradientConfig` conversion. The
  suite's stated single conversion point, and unguarded.
- `palette/core/rampGeometry.ts` — `sampleGeometry` is a pure function of
  `(geom, params, w, h)` with no module state and no cache. The Gradient
  Explorer depends on a byte-identical double render, so keep it that way.
- `palette/core/exportFormats.ts` — the format registry and the stop budgets. Read
  the SWATCHES SUBJECT block in it before adding a format: an entry's `build` takes the
  256-step ramp and its optional `swatches` takes a colour list, and whether a format
  appears under the export window's Swatches subject is decided by whether it has the
  second one (grep `formatsFor`). `build` is required on every entry — the old shell's
  Extras panels call it unconditionally.
- `palette/core/img2grad/index.ts` — the `extract()` pipeline.
- `palette/core/oklab.ts` — **read its `@assumption` first.** It is a hand copy
  of engine colour code with a drift pin that does not actually pin anything.
  Its sibling `palette/core/gmtGradient.ts` is the opposite: a pure re-export of
  `utils/colorUtils.ts`, so an engine-core change to `renderStopsToRamp` lands
  here with no seam to notice it. Those two files are the whole engine/palette
  colour boundary and they fail in opposite directions.

## Decisions

Two, both from the Gradient Explorer v2 work (2026-09-03); before that there were
none (verified 2026-09-01, `grep -rl 'palette/core\|palette suite' docs/adr/
docs/policy/` returned nothing).

- `docs/adr/0111-working-pipeline-input-slot.md` — ONE pipeline over an input
  slot for every source (`palette/core/workingPipeline.ts`,
  `palette/store/workingStore.ts`); stops pass through verbatim under the identity
  pipeline; bake folds and resets rather than freezing.
- `docs/adr/0112-variants-bypass-the-scene-loader.md` — variants snapshot the
  authored slices + documents (minus `favients`) and restore through the feature
  setters inside one undo bracket, never `loadPreset` (it wipes undo, mutates the
  preset, clobbers project settings, and re-merges the shelf with a toast).

The cross-cutting write-up is still `docs/modules/palette/palette-suite.md`.

## What's load-bearing

- **`palette/components/**` are store-aware composed panels BY DESIGN.** They
  are *not* under the `components/ui/**` purity rule and a store import here is
  not a violation — do not "fix" one.
- **The boundary that IS real: `palette/` must never import an app.** It may use
  `engine/`, `engine-gmt/` and shared code freely, but never `app-gmt/`,
  `fluid-toy/` or `gradient-explorer/`. Currently zero violations; it is a cheap
  grep to keep that way.
- **The gradient wall has ONE model, and three hosts.** `palette/core/pickerModel.ts`
  (pure: search index, filter windows, group/rows/sort, carve, More like this) plus
  `palette/components/usePickerModel.ts` (the React/store binding) hold ALL of it.
  Since 2026-09-08 (GE v2 Phase D) the hook also takes an optional `{ source }` — a set
  of the user's own gradients (`palette/core/groundSets.ts`) shown INSTEAD of the
  catalogue by the same pipeline; called bare it is the catalogue, unchanged, which is how
  app-gmt's overlay and the old stage stay untouched by construction.
  `gradient-explorer/PickerStage.tsx` — mounted by the old shell AND by app-gmt's
  `PalettePickerOverlay` — and `gradient-explorer/v2/BrowseStage.tsx` are chrome over that
  hook and nothing else. A host that calls `catalog.filter(...)` itself is a fork; extend
  the model. Guard: `npx tsx debug/test-palette-pickermodel.mts`.
- **The catalogue's LICENSING is data with five seams, and none of them is a label you
  can edit in place** (owner decisions 2026-09-13; `plans/palette-catalogue-licensing.md`,
  "What was done"). (1) WHICH PACK a gradient lands in: `palette/core/catalogPacks.ts`
  (`PACK_PUBLISH` — the ONE publish switch — and `PACK_BUNDLES`), read by both the bake and
  `catalogLoader.PALETTE_GROUPS` (derived by `paletteGroupsFrom`, never hand-listed). A pack at
  `false` is never registered, never written under `public/` (the bake deletes its stale files)
  and never in `debug/palette-upload-manifest.json`; `optional` is uploaded but no host loads
  it at boot. The classifiers and licence tags are `debug/palette-packs.mts`. Labels and tags per source live in palette-lab's
  `bundles/manifest.json`; re-bake rather than hand-editing a `.json.gz`. (2) PROVENANCE IS
  SHOWN ONLY IN CATEGORY NAMES — `catalogOrigin.categoryName` for the Sources toggles, the
  source / collection bands (`arrangeRows`' `collectionLabel`, Group by = Collection, appended
  at enum index 3 — never insert before it) and the search index. No per-tile or hero
  provenance UI (owner). (3) AN EXPORT NAME carries the credit only while the gradient is
  unmodified: a pick STAMPS a `CatalogOrigin` whose `key` is the config's `originKey`, the
  origin rides `FavientDragPayload` → the working `gradient` input → `Favient.origin`
  untouched, and `exportNameFor` / `withExportName` (applied in
  `gradient-explorer/v2/exportActions.ts` only) honour it iff the key still matches. Never
  "clear the origin on edit" — the key comparison is the mechanism, and an origin is
  untrusted on the way in (`coerceOrigin`). (4) GX GLOBAL refuses unedited catalogue
  gradients twice: `catalogSigs.ts` on the client and the backend's
  `supabase/functions/gx-gradients/validate.ts`, two hand mirrors of one canonicaliser, held
  equal only by the harness. The bake writes BOTH signature lists; re-deploy the function
  after a re-bake. (5, second pass) A source that is not a baked pack — GX Global — joins the
  catalogue as a LIVE SOURCE (`catalogLoader.registerLiveSource`, registered in
  `registerPaletteUI`), loaded and unloaded by `pickerStore.setGroupLoaded` like a pack. Its
  entries must be COPIED before `row` is reassigned (the set ground draws the same cached
  bodies with its own rows), an empty load is `failedGroups` (the toggle disables), and
  `BundleInfo.userMade` keeps its gradients out of export credits.
- **Host-agnosticism goes through registries, never a branch on the host.**
  `componentRegistry` ids, `store/sendTargetRegistry`, the capability flags in
  `palette/core/favientTargets.ts` (select-mode / browse / studio), and the
  `gradientEditorEntrance` seam. A component must not ask which app it is in.
- **Undo rides the ENGINE param stack**, via `palette/store/paramUndoBracket`
  (aliased `genEdit` / `editorEdit` / `favEdit`). Discrete gestures self-bracket;
  drags open on pointerdown and close on window pointerup. Snapshots come from
  history providers registered in `registerPaletteUI.ts`.
- **Annotation markers arrived with v2 (2026-09-03); before that this tree had
  ZERO.** `palette/core/workingPipeline.ts`, `palette/core/paletteSample.ts` and
  `palette/store/favientsStore.ts` (`collectRecent`) carry `@invariant`s that
  name their harness and were falsified the day they were written;
  `palette/store/workingStore.ts` carries an `@assumption` and both new stores
  carry `@see` to ADR-0111 / ADR-0112. Everything older is still a prose header
  claim nothing can check — which is exactly why the audit found drift there.
  New load-bearing claims go in as annotations naming a proof command, not as
  prose.

## Guards

```
npm run smoke:boot           # the registration path, to throw-depth
npm run test:palette         # the chained harnesses over palette/core/**, the Favients store and the preset pack
npm run test:palette-favients  # favientsStore: the load/import gate, dedupe, __proto__ labels, undo write-through
npm run test:palette-gradientseam  # the GMT seam: linear/srgb forcing, layer routing, the 128-stop cap
npm run smoke:gx-handles     # REQUIRED for any palette/store/fullscreenStore.ts change
npm run test:gx-session      # the GE v2 session: workingSession + the studio snapshot variants share (node, ~5 s)
npm run test:palette-licensing  # the catalogue packs, category names, export credits and the GX Global catalogue check (node, ~2 s)
```

`smoke:boot` is the most useful citation for the store/feature layer: it boots
`app-gmt/main.tsx` and therefore covers `registerPaletteUI`, `installFavients`,
both persisters, `favientsStore.seedPresets` and all four feature registrations.
Falsified 2026-07-29 with a planted throw in `mountFavientsPanel`.

`test:palette` chains 32 harnesses as of 2026-09-13 (the licensing harness joined it that
evening) — count the `tsx` links in `package.json` rather than trusting this number; it said
28 while the chain was 30. `check:rule-guards` resolves the union of all
of them (the direct-file composite case was fixed 2026-07-29 — before that it saw only
member 1, and older notes claiming a `test:palette` citation "only reaches
stopfit" are stale). Cite the specific link anyway when you mean one, because it
tells the reader which harness covers what:

| file | harness |
|---|---|
| `core/stopFit.ts`, `core/gmtGradient.ts` | `debug/test-palette-stopfit.mts` |
| `core/oklab.ts`, `utils/stopOps.ts` | `debug/test-palette-stopops.mts` |
| `core/channelCurve.ts` | `debug/test-palette-channelcurve.mts` |
| `core/waveGen.ts` (the Curves editor's FUNCTION TOOL — the five shapes, the span envelope, bias/skew) and `utils/CurveFitting.ts` `spliceSpan` (the span-local commit the Pencil, the smoothing brush and the wave all share) | `debug/test-palette-wavegen.mts` (`npm run test:palette-wavegen`; falsified three ways — the span bound, the amplitude-as-a-fraction scaling and the splice's `kept` filter — plus section [9], added 2026-09-12, which pins that `spliceSpan` never hands back a segment whose Bezier doubles back in time (the loop sparse keys used to draw at the seam), falsified two ways — and two of its own assertions were wrong on the first cut and rewritten: a pointwise periodicity test that a DISCONTINUOUS pulse cannot pass, and two thresholds picked rather than derived. Read its header before tightening one) |
| `core/curveSpaces.ts` (WHICH three axes Curves draws — RGB / Oklab / OkLCh / CIE LCh / HSV, the round trips, the per-channel epsilon and the angular unwrap) | `debug/test-palette-curvespaces.mts` (`npm run test:palette-curvespaces`; falsified three ways. Note `rgbToHsv` reports S and V on **0..100** — dropping that scaling turns the whole gradient grey and the round-trip assertion is the only thing that catches it) |
| `core/facets.ts` / `core/facetName.ts` | `debug/test-palette-facets.mts` / `-facetname.mts` |
| `core/easings.ts` | `debug/test-palette-easings.mts` |
| `core/generatorPipeline.ts`, `core/colorBoxFit.ts` | `debug/test-palette-generator.mts` |
| `core/img2grad/**` | `debug/test-palette-img2grad.mts` **and** `-overshoot.mts` |
| `core/selectionGeometry.ts` | `debug/test-palette-selection.mts` |
| `core/wallLayout.ts` | `debug/test-palette-walllayout.mts` |
| `core/paletteSample.ts` (v2 palette face, More like this) | `debug/test-palette-sample.mts` |
| `core/workingPipeline.ts` (v2 Working pipeline) | `debug/test-palette-working.mts` |
| `core/gradientCss.ts` (a gradient as a CSS background — the export window's subjects, a set chip filling with what is being filed) and `components/PickerWall.tsx`'s `minGutter` / zoom-tool tap (ADR-0118) | `debug/smoke-ge-setsave.mts` (`npm run smoke:ge-setsave`) and `debug/smoke-ge-ground.mts` step [3] (`npm run smoke:ge-ground`; its `SET_GUTTER` pins the left margin the wall keeps clear of a floating toolbar — change `TOOLBAR_CLEAR` in BrowseStage and this goes red, which is the point) |
| `core/workingPipeline.ts` `recolourHeldFit` + `store/workingStore.ts`'s drag hold — the gradient must DRAW during a drag while only the knots wait for the release (owner, 2026-09-11; ADR-0117 §5) | `debug/smoke-ge-livedrag.mts` (`npm run smoke:ge-livedrag`; falsified by restoring the frozen `holdFit ??`, and again by sampling the wrong canvas — read its header, two of its four steps stay GREEN through the break it exists to catch) |
| `gradient-explorer/v2/uiHistory.ts` + `WorkingHero.tsx`'s ♥ (`onRevealGround`) — the v2 shell's INTERFACE state rides the param undo entry, so a gesture may close a surface to show you its result (ADR-0120, owner 2026-09-12) | `debug/smoke-ge-uiundo.mts` (`npm run smoke:ge-uiundo`; falsified three ways, one of them the `flushSync` that makes the bracket see the close at all — read its header before removing it) |
| `store/favientsStore.ts` `collectRecent` (v2 Recent zone) | `debug/test-palette-favients.mts` section [6] |
| `store/workingSession.ts` (the GE v2 SESSION — what survives a reload and what a `.gxsession.json` carries), `store/variantsStore.ts` `captureStudioSnapshot` / `applyStudioSnapshot` (the one capture + apply a variant and a session share), `core/variantsCore.ts` `isWellFormedStudioSnapshot`, and `store/workingStore.ts` `coerceInput`'s live-Mix seeds (dropped before 2026-09-13, so an undo across a Mix walked the stops) | `debug/test-gx-session.mts` (`npm run test:gx-session`; against a real engine store: a boot restore adds NO undo entry, a file load adds exactly one, the favients document is never applied by either strip, Mix's slot modifiers land at neutral, garbage / another version refused; falsified eighteen ways, see its header). The wiring — main.tsx restoring before the first render, the pagehide flush, the Settings rows, a phone — is `debug/smoke-ge-session.mts` (`npm run smoke:ge-session`) |
| `core/pickerModel.ts` (the wall: search, filter windows, arrange, carve, More like this) | `debug/test-palette-pickermodel.mts` |
| `components/PickerWall.tsx` `zoomStep` / `zoomStepPlan` / `pinnedContentPoint` (the − / + zoom step a phone host drives, Phase F 2026-09-10) | `debug/test-palette-wallzoom.mts` (`npm run test:palette-wallzoom`; falsified five ways, see its header) |
| `components/PickerWall.tsx` `touch-action` — who owns a finger's drag on the wall (a tool, or the browser's scroll), Phase F 2026-09-10 | `debug/smoke-ge-walltouch.mts` (`npm run smoke:ge-walltouch`; a browser smoke driving real CDP touch sequences on the v2 shell; falsified three ways, one of them behavioural — see its header). The v2 shell's own phone guard is `npm run smoke:ge-phone`, whose step [7] is also the only guard on `components/AdvancedGradientEditor.tsx`'s pointer-event conversion (a touch drag must move a knot) |
| `components/PickerWall.tsx` tile drawing through `utils/roundRectPath.ts` (`roundRect` is Safari 16 / Chrome 99; an iPhone on iOS 15 lost the whole Explorer to the error boundary, 2026-09-11) | `debug/smoke-ge-floor.mts` (`npm run smoke:ge-floor`; boots the v2 shell in a phone context with `roundRect` DELETED and asserts the wall paints; falsified two ways, see its header) |
| `core/globalSet.ts` + `store/globalSetStore.ts` (the GX global shared set), `core/importGradientFiles.ts`, `store/favientFiling.ts` (incl. `fileFavientAt` / `fileFavientsAt`), `store/wallSelection.ts`, `store/groundSet.ts`, `store/favientsStore.ts` `removeGroup` + `replaceAll`, `core/groundSets.ts` `membersOfMany` + the empty-group chip (the shelf's MANAGE surface, 2026-09-09 — §8b item 4) | `debug/test-palette-shelf-manage.mts` (`npm run test:palette-shelf`; falsified fifteen ways, three of them assertions that passed under mutation first and were rewritten — see its header) |
| `core/groundSets.ts` (GE v2 Phase D, 2026-09-08 — the rail's set order, favourite → wall entry, tile size by count), `core/padAxes.ts` (which colour axes the pad shows for an Arrange state) and `store/favientsStore.ts` `insertMany` | `debug/test-palette-groundsets.mts` (falsified four ways the day it was written — see its header) |
| `utils/colorUtils.ts` blend spaces (`blendLerp` and every `lerp*`, `BLEND_SPACE_ORDER`/`BLEND_SPACE_LABEL`) plus `core/editorConfig.ts`'s `BLEND_SPACES` whitelist — the spectral / CIE LCh / rectangular-Oklab modes and the OkLCh gamut + achromatic corrections, 2026-09-10 | `debug/test-palette-blendspaces.mts` (`npm run test:palette-blendspaces`; ten assertions, each falsified against a broken build — and FOUR of them passed under mutation on the first cut and were rewritten, so read its header before weakening one) |
| `core/catalogPacks.ts` (the publish switch), `store/pickerStore.ts` live sources + `store/globalSetStore.ts` `GX_GLOBAL_SOURCE`, `debug/palette-packs.mts` + `debug/bake-palette-catalog.mts` (which pack, which collection, which tag; the credits files; the signature lists), `core/catalogLoader.ts` `PALETTE_GROUPS` + `mergeManifest` (a v1 CDN file cannot overwrite a v2 manifest), `core/catalogOrigin.ts` (category names, export credits, the origin key), `core/catalogSigs.ts` (the client half of the GX Global catalogue check), `core/pickerModel.ts`'s collection axis, the `origin` carried by `store/favientsStore.ts` and `store/workingStore.ts` — all 2026-09-13 | `debug/test-palette-catalog-licensing.mts` (`npm run test:palette-licensing`; falsified ten ways in the first pass and six more in the second (ElvenSword, COLOURlovers, the publish switch, the live source) — read its header: the old core pack is caught by the COLLECTION check, not by the "no severance" one, which reads a field v1 files lack; and the client/server mirror only went red once the corpus held lower-case hex). It imports the backend's `validate.ts` by path, so it needs `H:/GMT/workspace-gmt/backend` beside this repo. The WIRING is the browser: `debug/smoke-ge-hero.mts` [8] (a real .json download named with the credit, plain after one Adjust dial, a set crediting only its unedited member) and [9] (the GX global share button refusing an unedited pick with the endpoint intercepted), `debug/smoke-ge-ground.mts` [12] (Sources names incl. "ElvenSword (free with credit)" and "GX Global (shared by users)", the optional pack behind its divider, source and collection band headers), [12b] (GX Global ticked adds exactly its gradients to All, endpoint intercepted) and [12c] (GX Global unreachable → row disabled), `debug/smoke-ge-phone.mts` [11] (About links the core credits file and it resolves) — each falsified, see their headers |
| `core/exportFormats.ts` (the registry, the two subjects, the .ase / Tailwind / design-token / CSS-variable writers) and `core/favientsExport.ts` swatch builders (GE v2 §8b item 5, 2026-09-09) | `debug/test-palette-exportsubjects.mts` (`npm run test:palette-exportsubjects`; falsified six ways, and its §[7] was rewritten after the first cut reported a break as a stack trace instead of naming it — see its header) |

**The Curves editor is no longer OkLCh-only, and the channel KEY is now the space's.**
`ChannelKey` widened from `'L' | 'C' | 'h'` to `string` on 2026-09-12: the live keys are
`curveSpaceKeys(space)` — `'R','G','B'` in RGB, `'L*','C*','h*'` in CIE LCh — and anything
that persists a `ChannelTracks` must persist the space beside it and validate against it
(`generatorDocument.sanitizeTracks`, `workingStore.coerceTracks`). A snapshot whose space
and tracks disagree is rejected as no-curves rather than sampled through the wrong axes,
which would silently recolour the gradient. The pipeline did NOT change: `Channels` is still
OkLCh and the one conversion seam is `generatorStore.sampleCurves`.

**The curve editor's LEFT GUTTER is a contract across four files, and it has already been
broken once.** `palette/components/ChannelGraphEditor.tsx` is the only caller that overrides it
(30 px on a phone, against the 62 px `GRAPH_LEFT_GUTTER_WIDTH` the animation editor uses), and
the number has to reach ALL of: the editor's own `frameToCanvasPixel` / `canvasPixelToFrame`,
the interaction hook it passes them to, `drawGraph` / `drawGraphOverlay` via `leftGutter`, AND
`GraphRendererBuilder`, which builds the cached polylines and key shapes — plus the polyline
and mask CACHE KEYS, since a bitmap built at one gutter and blitted at another is the same bug
in a different place. On 2026-09-12 the builder was the one that was missed: the ruler, the grid
and the hit test moved to 30 while the curve and every diamond stayed at 62, so each key sat
exactly 32 px right of where a click found it. There is no guard on this — it wants a browser
probe that finds a key's pixel and compares it with where a click selects, which is buildable
and not built. If you touch the gutter, check the four by hand.

The two img2grad harnesses are **not** redundant — the overshoot sweep is the
only thing that catches the `resample()` overshoot regression, proven by removing
the clamp and watching the main harness stay green. Their headers say so.

**Coverage hole, state it plainly: `test:palette` reaches `palette/core/**`
ONLY.** It touches no file under `palette/components/**` — 30 files, ~6,257
lines, zero coverage — proven 2026-07-29 by blanking `GradientStrip` and watching
the run stay green. A green `test:palette` is never evidence about a component.

## Watch out

- **`palette/store/fullscreenStore.ts` lives here but belongs to the Gradient
  Explorer.** Five of its exports are named by string in three browser smokes, so
  `tsc` cannot see the edge — do not rename or move them casually. And editing
  the file makes the *next* smoke run fail with a dual-instance message whatever
  you changed: **restart `npm run dev` first.**
- **The Favients COLLECTION is shared across apps (`gmt.favients`); the PANEL
  window state is split per host by `storageKey`.** A new host that does not
  supply its own key silently inherits app-gmt's. Since 2026-09-03 the collection
  also carries the v2 auto-managed **Recent** group (`RECENT_GROUP`), so a
  gradient used in the Explorer shows up under a read-only "Recent" divider in
  app-gmt's and fluid-toy's shelves too — by design, not a leak.
- **Mounting before `applyPanelManifest` fails silently** — `smoke:boot` stays
  green. Annotated `@assumption` at the call site, not `@invariant`, precisely
  because nothing catches it.
- **`palette/store/favientsPanelPersist.ts` re-implements the 768px mobile test
  inline** — one of eight such copies in the tree. It is now also scoped by
  [`mobile-layout.md`](./mobile-layout.md), which previously named it in prose
  while its `paths:` could not match it.
- **DDFS discipline here is currently clean** (the four features declare no
  cross-feature reads). Recorded as a negative result so nobody re-derives it.
