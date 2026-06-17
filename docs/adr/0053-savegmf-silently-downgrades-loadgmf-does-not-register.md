# ADR-0053: `saveGMFScene` silently downgrades to JSON for unknown formulas; `loadGMFScene` does NOT register

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/utils/FormulaFormat.ts`

## Context

Two edge cases at the GMF save/load boundary need explicit handling:

1. **Save with unknown formula.** The user clicks Save while the active
   formula isn't in the registry — typical for in-progress Workshop edits
   before Import is confirmed, or for scenes loaded from a different fork
   where the formula doesn't exist locally. Throwing would lose the user's
   work; silently producing an empty GMF would corrupt the file.

2. **Load with embedded formula vs. registry-resident formula.** A GMF
   embeds the formula GLSL plus metadata. The registry MAY already hold a
   formula with the same id (e.g. a built-in formula). Auto-registering the
   embedded one would clobber any runtime patches the user made to the
   resident one. Auto-skipping would silently load a different formula than
   what the GMF describes.

Alternatives considered:

- **Throw on unknown-formula save.** Loses user work. Rejected.
- **Auto-register on load.** Clobbers runtime state silently. Rejected.
- **Prompt the user on every load.** Too noisy; most loads should "just work".

## Decision

`saveGMFScene` (engine-gmt/utils/FormulaFormat.ts:221) calls
`registry.get(preset.formula)` and silently downgrades to plain
`JSON.stringify(preset, null, 2)` if absent — no log, no telemetry. The
returned string is still loadable (`loadGMFScene` dispatches on `isGMFFormat`
and falls through to JSON parse for non-GMF strings).

`loadGMFScene` returns `{ def?, preset }` and does NOT touch the registry.
The caller (System Menu / drag-drop handler) is responsible for:

1. Calling `registry.get(def.id)`.
2. If absent, calling `registry.register(def)`.
3. If present, deciding whether to overwrite (typically NO, but the System
   Menu may offer an explicit "replace formula" option).
4. Applying the `preset` to the engine.

## Consequences

- **Forks that need telemetry on unknown formulas at save-time must wrap
  `saveGMFScene` themselves.** The current path is intentionally quiet.
- **Forks MUST consistently route loads through their registry-check-and-
  register handler.** Calling `loadGMFScene` and then applying the returned
  `preset` without first ensuring the formula is registered will fail at
  compile (no formula → empty shader → black screen). The fork's System
  Menu handler is the canonical site for this glue.
- **The dual-stage load lets the System Menu offer "load formula only" vs
  "load full scene" without ambiguity** — the caller decides whether to
  apply the preset based on the user's choice.
- **`loadGMFScene` doesn't throw for unknown formulas** — v1 formula-only
  GMF (no `<Scene>` block) synthesises a preset from `def.defaultPreset`
  falling back to `{ formula: def.id }`. Legacy JSON path returns
  `{ preset }` with no `def`.
- **PNG embed/extract is parameterised by `SceneSerializer` /
  `SceneParser` callbacks** in `utils/SceneFormat.ts`, so apps inject
  GMF-aware behaviour through `installSceneIO` without monkey-patching the
  module. The downgrade-to-JSON path inherits transparently.
