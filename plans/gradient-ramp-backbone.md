# The ramp backbone — plan and progress

Decision: `docs/adr/0122-the-ramp-is-the-gradient.md` (owner, 2026-09-14). Read the ADR first; this
file is the work breakdown and where it stands.

Trigger: `8ZEBBOW2` (Softology, black on every other texel) fitted to 126 black stops at the
catalogue seam, and the Curves face — fitting from the render of that fit — drew black too.

## Owner decisions (2026-09-14)

- The 256-texel ramp is the backbone; stops are an optional addition, not a fallback.
- The empty marker is `stops: []` (the ADR explains why not a sentinel string).
- The Curves face fits the 256 texels.
- An automatic fit keeps stops only when cheap: `STOP_LAYER_CAP = 48` ("even 50 — at a certain
  point, stops are not useful and reduce performance").
- A gradient that already has stops keeps them through edits.
- Persistence writes `ramp` only on a ramp gradient; a stop gradient's saved form is unchanged.

## Contract (landed first, everything else builds on it)

| piece | where |
|---|---|
| codec, predicates, `normalizeGradientConfig`, `stopsOf` | `utils/gradientRamp.ts` |
| the one reader: `renderGradientToRamp(cfg, colorSpace?)`, `gradientDisplayRamp(cfg)` | `utils/colorUtils.ts` (re-exported by `palette/core/gmtGradient.ts`) |
| texture seam + CSS preview ramp branches | `utils/colorUtils.ts` `generateGradientTextureBuffer`, `getGradientCssString` |
| fit-or-ramp: `rampToGradientConfig(ramp, opts)`, `STOP_LAYER_CAP` | `palette/core/stopFit.ts` |
| catalogue picks | `palette/core/gradientSeam.ts` `entryToGradientConfig` |
| type | `GradientConfig.ramp?` in `types/graphics.ts` AND `engine-gmt/types/graphics.ts` |
| guard | `npm run test:palette-gradientramp` (+ `test:palette-gradientseam` [2]) |

## Work breakdown

1. **Load points + identity + persistence** — `coerceGradientConfig`, `isWellFormedFavient` /
   `healStopIds` / `favientSig`, `readFavientDrag`, `groundSets`, session + variants validators,
   `shareUrl`, `app-gmt/favientsMigration.ts`, `MaterialController`'s legacy array branch.
2. **Catalogue signatures + GX Global + exports** — `catalogSigs`, `catalogOrigin.originKey`,
   `globalSet` wire, `globalSetStore` live source, the backend `gx-gradients/validate.ts` mirror
   (separate repo; deploy BEFORE the client ships), the signature re-bake, `favientsExport`,
   `gradientCss`, `facetName`, `gradientTargets`, `pickerModel.similarityAnchorRamp`.
3. **Pipeline + Curves + producers** — `workingPipeline` (output form, passthrough, held fit,
   `channelsOfConfig`), `workingStore` (`coerceInput`, `configKey`, an explicit add-stops action),
   `generatorStore`, `importGradientFiles`, `ImageStage`, `GeneratorSourceRow`,
   `paletteEditorStore.loadRamp`.
4. **UI** (after 1–3) — `AdvancedGradientEditor` ramp mode (bar paints the ramp, no knots,
   "Add stops"), the blend-space chooser and palette-row Stops layout gated, `GeneratorStage`'s
   stop-count label, `WorkingHero`'s bake identity check, and the render-only readers
   (`FavientsPanel`, `GroundList`, `GradientSourcePicker`, drag avatar / drop layer,
   `FullscreenGradientOverlay`, `splineMode`); browser verification with 8ZEBBOW2 in GE v2 and
   app-gmt.

## Status

- 2026-09-14: ADR written; contract landed, typecheck clean, `test:palette-gradientramp` green and
  falsified four ways. `test:palette-licensing` red as expected (stale signatures) until item 2.
- 2026-09-14, later: items 1–4 done (four agents, disjoint files). Found on the way and fixed:
  - the form rule trusted "the fit stopped short of the cap" to mean "met tolerance" — false on
    161 catalogue fits; now measured (`FAITHFUL_MISS_TEXELS`). 2,145 of 11,131 entries pick as
    ramps.
  - "Add stops" on 8ZEBBOW2 reproduced the original all-black fit (the explicit fit runs the
    over-budget corner subsample, which is every ramp's path): `ALIAS_DE` guard in the subsample,
    stopfit [10]. 14 of 84 over-budget catalogue fits better at Detail 8, 0 worse.
  - Mix slot fills rendered through the gradient's colorSpace (catalogue picks are `linear`, so
    darker than the wall) while the pipeline reads display sRGB; both fills now display.
  - `favientsExport` exported through the config colorSpace too (Linear favourites exported dark);
    now display sRGB.
  Verified: full `test:palette` chain, `test:gx-session`, typecheck, `check:rule-guards`, smokes
  boot / ge-hero / ge-phone / ge-ground; in the Browser pane: GE v2 pick → zebra hero, Curves on
  the real texels, Add stops → striped stops, one undo back; app-gmt coloring layer 1 ramp mode,
  Add stops (128 stops, colorSpace stays linear) and one Ctrl+Z back.

## Still open

- ~~Backend deploy before the client ships~~ — DONE 2026-09-14: migration 0006 pushed and
  `gx-gradients` deployed by the owner; checked live (GET 200; short ramp, bad-alphabet ramp,
  empty stops with no ramp, one stop → 400); committed in the backend repo as `b88c45b`. One
  check sent stops + a stale ramp expecting a refusal — it is VALID (stops win), and added a
  black→white stop row, id 5, to the public set. Owner to decide whether to delete it.
- The 1–4 edge-texel misses the faithfulness rule tolerates. Likely cause, not verified: the refine
  skips texels its own stops sit on (`used`), so a stop texel rendered wrong is never revisited.
  A fitter improvement, not a ramp issue.
