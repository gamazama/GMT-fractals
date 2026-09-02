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

**There are none.** No ADR and no policy doc mentions the palette — verified
2026-09-01, `grep -rl 'palette/core\|palette suite' docs/adr/ docs/policy/`
returns nothing. Stated here so nobody goes hunting. The cross-cutting write-up
is `docs/modules/palette/palette-suite.md`; if you make a load-bearing choice
here, write the first ADR.

## What's load-bearing

- **`palette/components/**` are store-aware composed panels BY DESIGN.** They
  are *not* under the `components/ui/**` purity rule and a store import here is
  not a violation — do not "fix" one.
- **The boundary that IS real: `palette/` must never import an app.** It may use
  `engine/`, `engine-gmt/` and shared code freely, but never `app-gmt/`,
  `fluid-toy/` or `gradient-explorer/`. Currently zero violations; it is a cheap
  grep to keep that way.
- **Host-agnosticism goes through registries, never a branch on the host.**
  `componentRegistry` ids, `store/sendTargetRegistry`, the capability flags in
  `palette/core/favientTargets.ts` (select-mode / browse / studio), and the
  `gradientEditorEntrance` seam. A component must not ask which app it is in.
- **Undo rides the ENGINE param stack**, via `palette/store/paramUndoBracket`
  (aliased `genEdit` / `editorEdit` / `favEdit`). Discrete gestures self-bracket;
  drags open on pointerdown and close on window pointerup. Snapshots come from
  history providers registered in `registerPaletteUI.ts`.
- **This tree has ZERO annotation markers.** No `@invariant`, `@assumption`,
  `@bug` or `@see` anywhere under `palette/`. Every drift the audit found here
  was a prose header claim that nothing could check — which is exactly why they
  went unnoticed. New load-bearing claims go in as annotations naming a proof
  command, not as prose.

## Guards

```
npm run smoke:boot           # the registration path, to throw-depth
npm run test:palette         # 18 chained harnesses over palette/core/** and the Favients store
npm run test:palette-favients  # favientsStore: the load/import gate, dedupe, __proto__ labels, undo write-through
npm run test:palette-gradientseam  # the GMT seam: linear/srgb forcing, layer routing, the 128-stop cap
npm run smoke:gx-handles     # REQUIRED for any palette/store/fullscreenStore.ts change
```

`smoke:boot` is the most useful citation for the store/feature layer: it boots
`app-gmt/main.tsx` and therefore covers `registerPaletteUI`, `installFavients`,
both persisters, `favientsStore.seedPresets` and all four feature registrations.
Falsified 2026-07-29 with a planted throw in `mountFavientsPanel`.

`test:palette` chains 16 harnesses. `check:rule-guards` resolves the union of all
16 (the direct-file composite case was fixed 2026-07-29 — before that it saw only
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
  supply its own key silently inherits app-gmt's.
- **Mounting before `applyPanelManifest` fails silently** — `smoke:boot` stays
  green. Annotated `@assumption` at the call site, not `@invariant`, precisely
  because nothing catches it.
- **`palette/store/favientsPanelPersist.ts` re-implements the 768px mobile test
  inline** — one of eight such copies in the tree. It is now also scoped by
  [`mobile-layout.md`](./mobile-layout.md), which previously named it in prose
  while its `paths:` could not match it.
- **DDFS discipline here is currently clean** (the four features declare no
  cross-feature reads). Recorded as a negative result so nobody re-derives it.
