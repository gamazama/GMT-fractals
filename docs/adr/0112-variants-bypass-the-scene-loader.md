# ADR-0112: Variants are studio snapshots that bypass `loadPreset`

- **Status:** Accepted
- **Date:** 2026-09-03
- **Relates to:** ADR-0111 (the Working pipeline), the document-provider registry (`store/documentRegistry.ts`, June P0d), `plans/ge-v2-design.md` §5.6

> **Update 2026-09-16 (status after the session restore, ADR-0121; decision unchanged for the part
> that is live):** the Variants FEATURE has no UI. The owner removed Snapshots on 2026-09-08
> (Phase D: tray states are baked after every action, and the gradient is already in Recent and
> Kept), and the old shell never mounted Variants. The code has split in two.
> - **Live.** `captureStudioSnapshot` / `applyStudioSnapshot` in `palette/store/variantsStore.ts`
>   were lifted out of the variant capture and restore for the Explorer session (ADR-0121 Decision
>   3) and are imported by `palette/store/workingSession.ts`, together with `deepClone`,
>   `stripFavients`, `isWellFormedStudioSnapshot` and the `StudioSnapshot` type from
>   `palette/core/variantsCore.ts` (and `featureSetterName`, which `applyStudioSnapshot` calls).
>   This ADR's decision governs them as written — never `loadPreset`, never `resetParamHistory`,
>   clone on capture and on apply, `favients` stripped both ways (still by name; there is still no
>   exclusion seam), one `paramEdit` around an apply the user can undo — with ADR-0121's one
>   exception: the boot restore applies bare, so a first Ctrl+Z has nothing to take away. A session
>   leaves `paletteFilters` out; `VARIANT_FEATURES` keeps it in. Because the session imports
>   `variantsStore`, loading it also constructs `useVariantsStore`, whose initial state reads
>   `gmt.ge.variants`. Guard for the live half: `npm run test:gx-session`.
> - **No product user.** `useVariantsStore` (capture / restore / update / rename / remove /
>   duplicate) and `getVariants`; the variant-only helpers in `variantsCore.ts` (`parseVariants`,
>   `serializeVariants`, `capVariants`, `nextVariantName`, `newVariantId`, `roundRamp`,
>   `rampFromInts`, `isWellFormedVariant`, `VARIANT_FEATURES`, `MAX_VARIANTS`,
>   `VARIANTS_STORAGE_KEY`); and `palette/core/rampTween.ts` (`tweenRamp`). Their only importers are
>   `debug/test-palette-variants.mts` (which covers both halves) and `debug/test-palette-tween.mts`,
>   both links of `npm run test:palette`; both green on 2026-09-16.
> - **Open.** Whether to delete the unused half is the owner's call and has not been made
>   (`plans/ge-v2-parity-checklist.md`, "Still open from (c)"; `plans/ge-v2-old-shell-migration-audit.md`
>   S14). A deletion has to keep everything listed under Live.

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
