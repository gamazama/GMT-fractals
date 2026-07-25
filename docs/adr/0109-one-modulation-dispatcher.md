# ADR-0109 — One modulation dispatcher for live and export

**Date:** 2026-07-25
**Status:** Accepted
**Related:** ADR-0107 (live modulation transport), ADR-0108 (slider-space compose)

## Context

The branch chain that turns `(target, offset)` into shader writes existed
**three times**:

1. `engine/animation/AnimationSystem.tick` — the live path
2. `engine-gmt/components/timeline/exportModulations.ts` — render export
3. `components/timeline/exportModulations.ts` — an engine-core sibling

ADR-0107 flagged the duplication as a follow-up. It was not theoretical: the
copies had already drifted, and every divergence was a render that silently
disagreed with what the artist had been watching.

| Divergence | Effect on export |
|---|---|
| Vec regex `^(coreMath\|geometry)\.(vec[23][ABC])_(x\|y\|z)$` | **186 of 201** vec-axis targets dropped — any other feature, every vec4, every `_w` |
| Emitted each vec axis separately | Modulating X and Y of one vec: the second emit reset the first to base |
| Only `geometry.preRot` handled | `postRot` / `worldRot` modulation ignored |
| Julia fallback `if (!juliaX)` | An axis modulated to exactly **0** was overwritten by its base |
| Uniform names string-munged from the param id | Wrong or missing uniform for anything not matching the pattern |

The vec-axis fix in row 2 was made in the tick and carries a comment explaining
it — it was never carried across. That is the failure mode of duplication: the
fix lands where the bug was noticed, and the copies keep the bug.

Copy 3 had **zero importers** and was listed in `knip.json`'s `ignore` array, so
`npm run orphans` never reported it. It had rotted into a pre-`applyAt` version.
The suppression is what let it sit there.

## Decision

**One dispatcher, returning a PLAN rather than performing writes.**
`engine/features/modulation/applyTarget.ts` exports `planModulationTarget`,
which takes `(targetKey, offset, storeState, routing, composites, opts)` and
returns the uniforms, `engine.modulations` entries, live value and keyframe
captures that target produces. Callers execute the plan their own way:

- the tick emits through `FRACTAL_EVENTS.UNIFORM` (so the worker bridge sees
  them), tracks uniform ownership, publishes `liveModulations`, and captures
  keyframes while recording;
- the export calls `engine.setUniform` directly — no bridge hop, no ownership
  tracking (nothing else writes during an export), no recording.

Returning a plan rather than taking a sink keeps the dispatcher **pure**, which
is what lets a test run it and inspect the result without a store, a worker or
an event bus.

Recording is expressed as an injected `cleanBase(trackId, naturalBase)` callback
rather than baked in. The tick supplies the snapshot / initial-static lookup;
export passes nothing. This is the only behavioural difference the dispatcher
knows about, and it is a parameter rather than a branch.

**Copy 3 is deleted** and its `knip.json` ignore entry removed, so a future
unreferenced file in that position gets reported instead of suppressed.

## Consequences

- Export now applies what the preview showed: all vec axes on all features,
  post/world rotation, and julia axes driven to zero.
- `AnimationSystem.tsx` drops from 662 to 387 lines; the tick reads as
  "resolve → plan → execute" instead of a 280-line branch chain.
- The composites (`vecEmits`, julia) moved into a `CompositeAccumulator` the
  caller threads through and flushes once. Both callers now get the
  emit-once-after-the-loop behaviour that only the tick had.
- Adding a branch means one edit, and `classifyModulationTarget` must learn it
  first (ADR-0107's invariant), so the coverage gate sees it too.
- `debug/test-modulation-parity.mts` guards the property directly: multi-axis
  vec composition, vec coverage beyond the old regex, all three rotation stages,
  a julia axis at exactly zero, dispatcher purity, and that only the expected
  files read the offsets buffer with both appliers delegating.
- **Not addressed:** the tick still owns recording, ownership tracking and the
  removed-target cleanup pass. Those are genuinely live-only, so they stay —
  the shared piece is the dispatch, not the whole tick.
- The julia branch still records against the STORE base rather than the
  recording clean base, and the top-level record fires in addition to the
  branch-level one for julia / lighting / vec. Both are pre-existing quirks,
  preserved deliberately so this change stays a refactor; flagged here because
  they looked like bugs while extracting and a future reader will wonder.
