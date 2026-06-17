# ADR-0027: Never seek during steady-state audio play

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/animation/audioClipSync.ts`

## Context

Each `audioAnalysisEngine.seek` on the underlying `<audio>` element
produces an audible click. The deck's native clock is already an
accurate real-time reference between timeline transitions.

## Decision

Only three edge cases touch a playing deck — `justResumed`
(paused→playing), `justScrubbed` (frame delta > 0.5s timeline time),
and out-of-range (pause-only). Steady-state play is a no-op even
though the timeline frame advances every tick.

## Consequences

- No clicking during normal playback.
- Brief render stalls (5-frame jumps ≈ 0.2s at 25fps) free-run rather
  than seek — the deck and timeline reconverge on the next tick.
- `SCRUB_JUMP_SEC = 0.5` is the load-bearing threshold; lowering it
  would re-introduce stall-clicks, raising it would let real scrubs
  feel sluggish.
