# ADR-0023: Undo per-scope stacks

**Date:** 2026-05-20 _(retroactive — captured during doc audit)_
**Status:** Accepted
**Scope:** `engine/plugins/Undo.tsx`, `store/historySlice.ts`

## Context

A unified history stack with scope tags caused two user-visible
bugs:

1. Generic UI calling `undo()` with no scope popped the wrong lane
   (Ctrl+Z popped a camera move when the user meant to undo a
   slider tweak).
2. The pre-migration `handleInteractionStart(mode)` accepted either
   a string or a CameraState object, dispatching at runtime — two
   recording paths shared a function but not a contract.

## Decision

Per-scope stacks (`'param'`, `'camera'`, plus `animationStore`
separately) with typed entry points (`pushCameraTransaction(state:
CameraState)`). Topbar buttons hardwire to `'param'`; timeline-hover
routes to the separate `animationStore.undo()`. `MAX_STACK = 50`
per lane.

## Consequences

- Both bug classes are now structurally unrepresentable.
- Animation-store history-deferral (F2b) remains open — unifying
  would deduplicate stack code but require per-keyframe patch
  translation; deferred until a cross-scope undo flow needs it.
