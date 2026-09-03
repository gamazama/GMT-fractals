# ADR-0111: One Working pipeline over an input slot (Gradient Explorer v2)

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
