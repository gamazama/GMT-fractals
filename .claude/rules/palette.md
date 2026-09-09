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
- `palette/core/exportFormats.ts` — the format registry and the stop budgets.
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
npm run test:palette         # 25 chained harnesses over palette/core/** and the Favients store
npm run test:palette-favients  # favientsStore: the load/import gate, dedupe, __proto__ labels, undo write-through
npm run test:palette-gradientseam  # the GMT seam: linear/srgb forcing, layer routing, the 128-stop cap
npm run smoke:gx-handles     # REQUIRED for any palette/store/fullscreenStore.ts change
```

`smoke:boot` is the most useful citation for the store/feature layer: it boots
`app-gmt/main.tsx` and therefore covers `registerPaletteUI`, `installFavients`,
both persisters, `favientsStore.seedPresets` and all four feature registrations.
Falsified 2026-07-29 with a planted throw in `mountFavientsPanel`.

`test:palette` chains 25 harnesses. `check:rule-guards` resolves the union of all
of them (the direct-file composite case was fixed 2026-07-29 — before that it saw only
member 1, and older notes claiming a `test:palette` citation "only reaches
stopfit" are stale). Cite the specific link anyway when you mean one, because it
tells the reader which harness covers what:

| file | harness |
|---|---|
| `core/stopFit.ts`, `core/gmtGradient.ts` | `debug/test-palette-stopfit.mts` |
| `core/oklab.ts`, `utils/stopOps.ts` | `debug/test-palette-stopops.mts` |
| `core/channelCurve.ts` | `debug/test-palette-channelcurve.mts` |
| `core/facets.ts` / `core/facetName.ts` | `debug/test-palette-facets.mts` / `-facetname.mts` |
| `core/easings.ts` | `debug/test-palette-easings.mts` |
| `core/generatorPipeline.ts`, `core/colorBoxFit.ts` | `debug/test-palette-generator.mts` |
| `core/img2grad/**` | `debug/test-palette-img2grad.mts` **and** `-overshoot.mts` |
| `core/selectionGeometry.ts` | `debug/test-palette-selection.mts` |
| `core/wallLayout.ts` | `debug/test-palette-walllayout.mts` |
| `core/paletteSample.ts` (v2 palette face, More like this) | `debug/test-palette-sample.mts` |
| `core/workingPipeline.ts` (v2 Working pipeline) | `debug/test-palette-working.mts` |
| `store/favientsStore.ts` `collectRecent` (v2 Recent zone) | `debug/test-palette-favients.mts` section [6] |
| `core/pickerModel.ts` (the wall: search, filter windows, arrange, carve, More like this) | `debug/test-palette-pickermodel.mts` |
| `core/groundSets.ts` (GE v2 Phase D, 2026-09-08 — the rail's set order, favourite → wall entry, tile size by count), `core/padAxes.ts` (which colour axes the pad shows for an Arrange state) and `store/favientsStore.ts` `insertMany` | `debug/test-palette-groundsets.mts` (falsified four ways the day it was written — see its header) |

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
