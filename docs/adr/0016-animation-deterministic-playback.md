# ADR-0016: Animation deterministic playback

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/AnimationEngine.ts`, `engine/animation/modulationTick.ts`

## Context

Live preview must match exported frames frame-for-frame so artists
trust the WYSIWYG loop. Wall-time-driven RAF playback drifts
relative to integer frame timing, and a tab return / debugger pause
can lurch by hundreds of milliseconds at once.

## Decision

Deterministic mode accumulates wall time and emits integer frames at
exactly `1/fps`. Backlog `>0.25s` (tab return / debugger pause) is
discarded to prevent lurch. LFO `oscTime` is computed from
`currentFrame/fps` rather than wall time.

## Consequences

- dt-driven playback at any fps remains the default; deterministic
  adds a parallel path used during recording / export.
- Discarded backlog appears as a single frame skip rather than a
  multi-frame lurch — preferred trade.
