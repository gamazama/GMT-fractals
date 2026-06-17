# ADR-0054: Engine-core feature sharing by module identity, not duplication

**Date:** 2026-05-20 (retroactive — captured during doc audit)
**Status:** Accepted
**Scope:** `engine-gmt/features/index.ts`

## Context

GMT is layered on top of engine-core's feature system. Engine-core ships six
general-purpose features that GMT consumes verbatim:

- `PostEffectsFeature` (`engine/features/post_effects`)
- `ColorGradingFeature` (`engine/features/color_grading`)
- `AudioFeature` (`engine/features/audioMod`)
- `ModulationFeature` (`engine/features/modulation`)
- `WebcamFeature` (`engine/features/webcam`)
- `DebugToolsFeature` (`engine/features/debug_tools`)

Earlier, GMT carried local copies of all six under
`engine-gmt/features/{post_effects, color_grading, audioMod, modulation,
webcam, debug_tools}/`. Those copies were diff-identical to engine-core's
but caused two bugs:

1. **"Replacing definition for X" warnings × 6 at boot.** `featureRegistry.register`
   detects when a definition with the same id is registered twice and logs
   a warning. After engine-core's `registerFeatures()` ran, GMT's
   `registerFeatures` registered six diff-identical features under the same
   IDs, producing six warnings on every page load.
2. **Map insertion order shifted.** The GMT copies registered FIRST, then
   engine-core's `registerFeatures()` re-registered the same names —
   silently swapping the Map order. The compile-time iteration over
   `featureRegistry.getAll()` then iterated in a different order, and
   `uToneMapping` (declared by `PostEffectsFeature`) ended up at a different
   position in the uniform-declaration block during post-pass compile.
   Downstream features that referenced `uToneMapping` by name still
   compiled, but a subtle change in the declaration-order-dependent block
   layout affected the post-pass compile sequence.

Alternatives considered:

- **Keep carrying GMT copies and suppress the warning.** Doesn't fix the
  Map-order bug; suppressing warnings is a smell.
- **Have engine-core skip registration when GMT is the host.** Forces
  engine-core to know about its host — backwards.
- **Use a new feature id with the same shape.** Loses module identity entirely;
  state types and uniforms diverge over time.

## Decision

Import the six engine-core features directly from `engine/features/*` into
`engine-gmt/features/index.ts:35-40`:

```ts
import { PostEffectsFeature }  from '../../engine/features/post_effects';
import { ColorGradingFeature } from '../../engine/features/color_grading';
import { AudioFeature }        from '../../engine/features/audioMod';
import { ModulationFeature }   from '../../engine/features/modulation';
import { WebcamFeature }       from '../../engine/features/webcam';
import { DebugToolsFeature }   from '../../engine/features/debug_tools';
```

`featureRegistry.register` short-circuits on identical refs (`existing === def`),
so engine-core's later registration is a no-op — same module identity =
same `def` ref.

State types are re-exported via `export type { … } from '../../engine/features/*'`
at `engine-gmt/features/index.ts:85-109`. `isolatedModules` enforces the
type-only re-export keyword.

## Consequences

- **Count of "GMT-local feature definitions" is honest (20, not 26).** Forks
  reading the file see clearly what GMT adds vs. what it consumes.
- **Engine-core can upgrade the shared six without GMT changes.** Bump
  engine-core, GMT picks up new behaviour transparently.
- **A fork that needs to OVERRIDE one of the six** must either (a) re-implement
  locally and accept the "Replacing definition" warning, OR (b) fork the
  entire feature catalogue. Acceptable trade-off because override is rare.
- **The 26-34 line comment block in `engine-gmt/features/index.ts:26-34`
  is the canonical historical record** and MUST be preserved verbatim. It
  documents both the "Replacing definition" warning AND the Map-order
  regression that motivated the change.
- **State-slice typing reaches across packages.** `FeatureStateMap` at
  `engine-gmt/features/types.ts:26-46` imports from
  `../../engine/features/*` for the shared six and from `./...` for the
  20 GMT-local features.
