# ADR-0112: Variants are studio snapshots that bypass `loadPreset`

- **Status:** Accepted
- **Date:** 2026-09-03
- **Relates to:** ADR-0111 (the Working pipeline), the document-provider registry (`store/documentRegistry.ts`, June P0d), `plans/ge-v2-design.md` §5.6

## Context

The v2 design replaces the animation timeline with **Variants**: global named snapshots
(A, B, C…) of the studio the user switches between, plus a tween between two of them.
The obvious implementation is `getPreset({ includeDocuments: true })` on capture and
`loadPreset(p)` on switch — the engine's own Save/Load path, which already serialises every
DDFS slice and every registered document (generator, image, stops, favients, working).

A read of `store/engineStore.ts` on 2026-09-03 showed why `loadPreset` is the wrong
tool for a switch that happens many times a minute:

1. It calls `resetParamHistory()` → `clearHistory()`, wiping BOTH undo scopes. A variant
   switch would destroy the user's entire undo stack.
2. `applyMigrations(p)` mutates the preset **in place**; restoring a stored snapshot twice
   mutates the snapshot.
3. It rewrites `projectSettings` (`name`, `version → 0`, `lastSavedHash → null`), so a
   switch renames the project and resets its version.
4. A 50 ms `setTimeout` recomputes the dirty baseline; two switches inside 50 ms race.
5. `restoreDocuments` on the `favients` document **merges into the shared shelf and
   fires a toast** whenever the snapshot carries a gradient the shelf does not have.
   Variant switching would spam both.
6. It emits `FRACTAL_EVENTS.CONFIG` / `CAMERA_TELEPORT` / `OFFSET_SET` — harmless in the
   Explorer (no worker), but not free.

## Decision

- **Variants never call `loadPreset` and never call `resetParamHistory`.**
- **Capture** = a deep clone of the feature slices the studio actually authors
  (`paletteGenerator`, `paletteImage`, `paletteFilters`) plus `serializeDocuments()` with
  the **`favients` key removed**, plus the working output ramp at capture time (for the
  tween and thumbnails). My Gradients is shared, cross-variant state and is never part
  of a variant.
- **Restore** = inside ONE `paramEdit` bracket: each feature slice through its own engine
  setter (`setPaletteGenerator` etc.) with a deep clone, then `restoreDocuments` with a
  deep clone of the stored documents. A switch is therefore **one undo entry**, not a
  history wipe; project settings, the dirty baseline and the shelf are untouched.
- Deep-clone on capture AND on restore (hazard 2). Persist to localStorage
  (`gmt.ge.variants`), capped, validated on load. Pure helpers (validation, clone, naming,
  cap, ramp rounding) live in `palette/core/variantsCore.ts` so they have a node harness;
  the store stays thin.
- The tween is `tweenRamp(a, b, t)` in `palette/core/rampTween.ts`: a per-texel OKLab
  lerp of the two variants' stored output ramps. Baking a tween goes through the Working
  pipeline's `use` like any other gradient.

## Consequences

- The document registry does double duty (scene files AND variants) with no change to
  its contract; a document provider that wants to be excluded from variants has no seam
  yet — today only `favients` is excluded, by name, in the variants store.
- `restoreImageDocument` re-decodes the source image asynchronously, so the Extract
  stage lags a variant switch by one decode; rapid switches may land out of order.
  Accepted for now; a version counter in `imageDocument` would fix it if it bites.
- Animation state is not part of a variant. The timeline leaves the standalone shell
  under the v2 design, so nothing is lost; if animation ever returns, a variant will
  need an explicit decision about it.
- The known-unsafe `loadPreset` path is documented here so nobody "simplifies" the
  variants store back onto it.
