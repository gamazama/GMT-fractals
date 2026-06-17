# ADR-0002: TickRegistry delta is seconds, not milliseconds

**Date:** 2026-05-20 _(retroactive — captures the convention established
during pre-extraction Phase 5/6 work to match React Three Fiber's `useFrame`
contract.)_
**Status:** Accepted
**Scope:** `engine/TickRegistry.ts`, `engine/plugins/RenderLoop.tsx`, every tick consumer

## Context

The native browser timing source (`requestAnimationFrame`, `performance.now()`)
gives time in milliseconds. The React Three Fiber `useFrame` convention,
which several engine consumers use, gives delta in seconds. The TickRegistry
sits in the middle and must pick one.

Mixing units silently is catastrophic: a tick that expects seconds but
receives milliseconds advances 1000× faster than wall-clock; the inverse is
imperceptibly slow.

## Decision

`runTicks(delta)` is documented and implemented to take seconds. Every caller
must convert at the boundary:

- `RenderLoopDriver` (engine/plugins/RenderLoop.tsx:36-44) divides `dtMs / 1000`
  and forwards seconds explicitly with a comment.
- `GmtRendererTickDriver` (engine-gmt/renderer/GmtRendererTickDriver.tsx)
  uses R3F `useFrame` delta (already seconds) and clamps to 0.1 before
  forwarding.

The TickRegistry itself never inspects or rescales `delta` — it forwards
opaquely.

## Consequences

- Any future driver that forgets the conversion (or copies code from a
  millisecond context) silently breaks every time-dependent tick.
- The unit choice matches R3F's convention, which most engine consumers
  already follow.
- No type-level enforcement; the contract lives in code comments and this ADR.
  A typed `Seconds` brand could be added but hasn't been deemed worth the
  ergonomic cost.
- See followup q-022 (`plans/doc-audit-state/survey/_followups/q-022.md`) for
  the audit-time investigation that surfaced this drift in `docs/engine/01_Architecture.md:83`
  (the existing doc said `runTicks(deltaMs)`).
