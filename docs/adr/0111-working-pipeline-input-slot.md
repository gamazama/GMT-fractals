# ADR-0111: One Working pipeline over an input slot (Gradient Explorer v2)

> **Update 2026-09-24 (the edited flag rides undo; decision unchanged):** the 2026-09-23 block's
> "Known gap" is closed. The generator's undo snapshot now carries `tracksEdited`, so undo and redo
> put curves back with the edited flag they had, and leaving Curves after an undo bakes them. The
> engine's `HistoryProvider` (`store/slices/historySlice.ts`) gained an optional `changeOf`: the
> part of a snapshot that decides whether a step is RECORDED, while undo/redo still restore the
> whole snapshot. The generator uses it (`generatorChangeOf`, one shared registration
> `generatorHistoryProvider`) so the flag never records a step on its own — a cancelled wave
> writes the curves back unchanged but sets the flag, and must still leave nothing to undo.
> Providers that don't declare `changeOf` behave as before. Commit `095cdfef`. Guards:
> `npx tsx debug/test-palette-working.mts` [15], `npm run smoke:ge-tray` [18d]. Still not carrying
> the flag: a scene or session load (`restoreGeneratorDocument`) and `returnToSource` /
> `cancelLive`.

> **Update 2026-09-23 (a pick starts fresh, and an untouched face changes nothing; decision
> extended, not superseded):**
> - **`use` always starts fresh.** A pick (wall, shelf, GX Global, a share link, the hand-off
>   from GMT, New Gradient) discards pending Adjust dials (`ADJUST_FACE_DEFAULTS`, including the
>   noise settings — what Cancel resets) and the curves, inside `use`'s one `paramEdit` bracket,
>   so one Ctrl+Z brings back the previous gradient WITH its dials. Pending dials are thrown away,
>   never baked into the gradient being replaced (owner, 2026-09-23). `bakes` now resets only
>   `MAIN_DEFAULTS` (leaving Mix or Image); `fitCurves` refits when the Curves face is open, and the
>   face stays open. Session restore does not go through `use` (`applyStudioSnapshot`), so a
>   restored session keeps its dials. Commit `5af86e75`.
> - **An untouched Curves fit leaves the gradient as it is.** While the Curves face was open and
>   untouched, the pipeline re-fitted the curves' output into new stops, and that re-fit is lossy
>   (0 of 5 catalogue gradients measured came back identical), so a stop selected with Curves open
>   vanished on leaving it, a knot edit saved the re-fit, and opening Curves rewrote the Recent
>   copy. `runWorkingPipeline` takes `curvesUntouched`: with the fit untouched and Adjust at its
>   defaults, the output config IS the input's config (the bar still draws the curves). Commit
>   `215722bd`.
> - **Known gap:** `tracksEdited` is not in the undo snapshot, so an undo that brings back edited
>   curves reads them as untouched, and leaving Curves then drops those edits.
> - Guards: `npx tsx debug/test-palette-working.mts` [13] (use) and [14] (untouched Curves);
>   `npm run smoke:ge-tray` [14] (pinned to a gradient whose live fit really re-fits) and [18]
>   (picks with Adjust / Curves open). Each falsified.

> **Update 2026-09-14 (ADR-0122, the ramp is the gradient; decision refined, not superseded):**
> Decision 4's "verbatim" now covers both config forms — a RAMP gradient (`stops: []` + `ramp`)
> under the identity pipeline comes back by identity exactly as a stop config does. Its "only a
> real transform fits the output ramp to stops" is narrowed: an input that carried stops (or a
> Mix with seeds) is still re-fitted to stops at the Detail budget, but an input without stops is
> an AUTOMATIC fit (`rampToGradientConfig`, `STOP_LAYER_CAP`) and a dense output stays a ramp.
> Decision 5's fold may therefore put a ramp gradient into the stops document; the explicit
> conversion is `workingStore.addStopsToWorking`. The pipeline's base is read through
> `gradientDisplayRamp` (grep `channelsOfConfig`). Guard unchanged:
> `npx tsx debug/test-palette-working.mts`, sections [5]–[9] added.

- **Status:** Accepted
- **Date:** 2026-09-03
- **Relates to:** the June 2026 Gradient Explorer amendment plan (`plans/gradient-explorer-amendments-plan.md`, locked decision 3: detail/smooth = non-destructive bake-to-commit; polish finding T5: pass stops verbatim), `plans/ge-v2-design.md` §2–§3 (the design this ADR implements), ADR-0112 (variants)

## Context

The June Gradient Explorer has three modes and three result heroes. Each mode owns a
different slice of post-processing: only the Generator applies the global modifier chain
(hue / chroma / contrast / posterize / repeats / phase / mirror / reverse / noise) and the
channel curves, and it applies them only to its own two-source mix. A gradient picked in
the Picker or extracted from an image cannot be shaped or adjusted until it has been sent
into a Generator slot — the "three competing where-does-this-gradient-go models" the June
polish pass flagged (H2). The v2 brief ("streamlined, one flow, useful to every colour
enthusiast") needs one place a gradient lives and one set of tools that act on it,
whichever source produced it.

`palette/core/generatorPipeline.ts` already contains the whole transform:
`buildGradientRamp(srcA, srcB, modsA, modsB, params, curves, seed)` does per-slot mods →
per-channel mix → `base` → curve override → the global chain → recombine. With the same
channels in both slots and no slot modifiers, the mix is the identity and only the curve
override and the global chain act.

## Decision

1. **v2 has ONE working gradient**, produced by one pipeline over an **input slot**:
   `input (base channels) → Shape (curve override) → Adjust (global chain) → ramp / stops`.
   The pipeline is `runWorkingPipeline` in `palette/core/workingPipeline.ts`, which calls
   `buildGradientRamp(base, base, DEFAULT_SLOT_MODS, DEFAULT_SLOT_MODS, params, curves, seed)`.
   `buildGradientRamp` stays the only ramp path; no second pipeline is introduced.
2. **The input slot is a tagged union** (`WorkingInput`): `empty` · `build` (live: the Build
   recipe's post-mix base, or the ColorBox base) · `extract` (live: the Extract result
   ramp) · `gradient` (a fixed config handed in by "Use") · `stops` (the editable stops
   document in `paletteEditorStore`). Sources *produce into* the slot; they own no
   post-processing of their own any more.
3. **The dials stay where they are.** Adjust is the `paletteGenerator` DDFS slice's global
   chain; Shape is `generatorStore`'s curve tracks + fit recipe; the stops document is
   `paletteEditorStore`. `workingStore` holds only the slot, the name, the fold memory and
   the palette-row prefs. No new DDFS feature, no duplicated dial.
4. **Verbatim stops (June T5).** When the input already carries stops (`gradient` or
   `stops`) and the pipeline is the identity (no curves, Adjust at defaults), the config
   is returned **by identity** and the ramp is rendered straight from those stops. Only a
   real transform fits the output ramp to stops, with the detail-scaled budget the
   Generator uses. Guard: `npx tsx debug/test-palette-working.mts` — falsified 2026-09-03
   by returning a clone instead of the verbatim object ("passthrough: config is the
   verbatim object" went red).
5. **Bake folds, it does not freeze.** The first stop edit on a live or gradient input
   folds the current output into stops, **resets Adjust to defaults and turns the curves
   off**, and switches the input to `stops`. The pipeline therefore stays live over the
   new input without double-applying, and a second Adjust pass folds again. `bakedFrom`
   remembers the pre-fold input, dials and curves so "return to source" is structural;
   every action is one `paramEdit` bracket so Ctrl+Z covers it as well.
6. **Feeding rules.** Build and Extract feed the slot live while they are the active
   source; leaving one commits its result as a `gradient` input (and so collects it into
   Recent). Browse never touches the slot: a wall click is a *candidate* the hero
   previews, unless Follow is on, in which case the candidate flows in through a plain
   `setState` — neither undoable nor collected.

## Consequences

- Every source is shapeable and adjustable with zero per-source wiring; a future source
  (a share link, a file import, a camera) only has to produce a `WorkingInput`.
- The old shell is untouched: `useGeneratorDerived` and the three per-mode heroes keep
  working, so app-gmt's palette overlay and the June Explorer behave as before until
  the v2 shell reaches parity and the old one retires.
- `generatorStore` grew a small seam for this (`useBuildBase`, `useAdjustParams`,
  `useSampledCurves`, `fitFromChannels`, `readGeneratorSlice`/`setGeneratorSlice`,
  `MAIN_DEFAULTS`); `imageStore` grew `imageDerivedNow`. These are additive.
- The `Modify` / `Noise` groups still carry `dynamicVisible: isMixed`, a Generator-era
  assumption that Adjust only makes sense in mixer mode. Under this ADR Adjust is
  source-independent, so that predicate is now wrong for the v2 drawer (it hides Adjust
  while the Build recipe is ColorBox). Owned by stream S3; not fixed here because the
  feature definition is shared with app-gmt.
- The palette-row prefs (rule / count / follow) are per-viewer localStorage state and
  deliberately outside undo and the scene document.
- `palette/` gains its first ADR citations (`@see docs/adr/0111-*`) — until now the suite
  had none (see `.claude/rules/palette.md`, "Decisions: there are none").
