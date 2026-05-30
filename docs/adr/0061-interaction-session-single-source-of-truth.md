# ADR-0061: A single `InteractionSession` primitive as the source of truth for "is the user interacting?"

**Date:** 2026-05-30
**Status:** Proposed _(for review — no code written yet)_
**Scope:** new `store/slices/createInteractionSlice.ts` (engine-core); consumers in `engine/AdaptiveResolution.ts`, `engine-gmt/engine/managers/UniformManager.ts`, `engine-gmt/engine/FractalEngine.ts` (hold), `engine-gmt/renderer/GmtRendererTickDriver.tsx`, `store/slices/viewportSlice.ts`; producers across `engine-gmt/navigation/*`, `components/inputs/hooks/useDragValue.ts`, light gizmo, pickers, drawing, timeline scrub, animation playback.
**Related:** ADR-0024 (pure adaptive module — still holds), ADR-0025/0026 (viewport hooks / pluggable render-scale), ADR-0042 (offset-guarded drift), ADR-0059 (feature capability protocol).

## Context

Investigating "accumulation resets while the picture stays the same" (the path tracer never converges, and adaptive resolution behaves erratically) surfaced two **separate** root causes. The second is architectural and is the subject of this ADR.

### Symptoms observed
- Adaptive resolution takes ~1s to engage on camera drag instead of the next frame.
- Dragging a **slider** never reaches the target framerate (camera navigation does).
- Making the adaptive activity signal *reliable* caused it to **never** return to full-res convergence — because something resets accumulation every frame.

### Diagnosis — interaction state is fragmented across ~6 independent inferrers
There is no single answer to "is the user interacting right now?" Each subsystem infers it separately, with different timing and scope:

| Source | Signal(s) | Visible to adaptive / accumulation-hold? |
|---|---|---|
| Camera (orbit / fly / drag / wheel) | `isCameraInteracting` ← `isInteracting()` ← `isDraggingRef`/`isOrbitDragging`/`isScrollingRef` + 200ms buffer | ✅ but **lagged** — set inside a buffered `useFrame` (`Navigation.tsx:1154`), not at pointerdown |
| Animation playback / timeline scrub | `isPlaying`, `isScrubbing` → OR'd into `cameraInUse` | ✅ |
| Light gizmo | `engine.isGizmoInteracting` **and** `isGizmoDragging` (dual, unsynchronized) | ✅ (fragile) |
| **Sliders / knobs / vectors** | `useDragValue` local `isDragging` only | ❌ **invisible** — never calls any interaction API |
| **Pickers (focus / julia)** | `isDraggingFocusRef` / `isDraggingJuliaRef` + `interactionMode` | ❌ invisible to adaptive (only blocks camera) |
| **Drawing / region select** | `interactionMode` | ❌ camera-locked only |

Adaptive resolution (`tickAdaptiveResolution`) therefore *infers* interaction from a soup of unreliable proxies: a **lagged** main-thread `isInteracting` flag, a **racy** accumulation-drop check (`accumCount < prevAccumCount` — the reset lands before the per-frame read, so it reads `0 < 0` and misses), `mouseOverCanvas` (removed — it kept adaptive on whenever the cursor sat over UI, blocking convergence), and a `gateOnAccumOnly` flag for the apps where the accumulator isn't the truth.

This explains every symptom directly:
- **Sliders never reach target** because adaptive doesn't *know* a slider drag is happening — it only learns via the racy accum-drop, so it never sustains engagement and its cost estimate goes stale.
- **~1s lag** because the camera signal is inferred late (buffered `useFrame`) rather than declared at the input event.
- The convergence noise is a separate bug (Root Cause A, below), but the fragile activity inference *masked* it: the racy accum-drop accidentally let adaptive disengage despite a per-frame reset. The system was balanced on a race condition.

Five iterations of patching the adaptive math (seed source, `mouseOverCanvas` removal, scale-normalized cost, a reliable reset timestamp) each fixed one proxy and exposed another. The activity signal is broken **at the source**, not in the controller.

### Root Cause A (separate, independent — noted for completeness)
`AnimationSystem.tsx:229` flags `hasVisualChange` whenever `Math.abs(offset) > 0.0001` — comparing the modulation output to **zero, not to the previous frame**. A single LFO/animation (even one whose output is *constant* and non-zero) emits `RESET_ACCUM` every frame, so the image never converges. A truly static scene (no animation/LFO/audio) converges fine. Fix: emit reset only when the modulated output **changed** frame-to-frame. This is small, independent of this ADR, and can land separately.

## Decision

Introduce a single engine-core **`InteractionSession`** primitive as the authoritative answer to "is the user interacting?", which all input sources *declare into* and all interested subsystems *subscribe to*. Adaptive resolution and accumulation-hold stop inferring interaction and instead read this one signal.

### API (engine-core store slice, `createInteractionSlice`)
```ts
type InteractionSource =
  'camera' | 'gizmo' | 'slider' | 'picker' | 'drawing' | 'scrub' | 'playback';

// Continuous gestures (drags): paired begin/end, ref-counted per source.
beginInteraction(source: InteractionSource): void;
endInteraction(source: InteractionSource): void;
// Discrete events (wheel tick, key nudge): refresh activity without a matching end.
pokeInteraction(source: InteractionSource): void;

// Derived, read by consumers:
isInteracting(): boolean;          // activeSources.size > 0 || (now - lastActivity < DEBOUNCE_MS)
interactionSources: Set<InteractionSource>;
lastActivityTime: number;
```

- **`isInteracting` includes a short fixed debounce only** (~150ms) to bridge micro-gaps between value commits within a drag. It does **not** own the downscale→upscale settle window — that remains the adaptive module's FPS-scaled `grace` (ADR-0024 logic). Two grace windows with two distinct jobs: "hand on a control (+debounce)" vs. "how long to keep downscaling after release."
- **Authoritative, not inferred.** Sources declare; nobody derives interaction from accumulation, camera deltas, or pointer position.
- **Ref-counted per source** so overlapping gestures (e.g. wheel during a drag) compose cleanly and an unbalanced `end` can't strand the session (with a dev-mode warning, mirroring the registry-freeze discipline).

### Worker bridge
`GmtRendererTickDriver` sends the single derived `interacting` boolean in `renderState` each `RENDER_TICK`, replacing `cameraInUse` + `isGizmoInteracting`. The worker's adaptive input becomes `isInteracting: renderState.interacting`. Because the session is declared **synchronously at the input event**, the next `RENDER_TICK` (~1 frame) carries it — eliminating the ~1s lag.

### What it replaces in the adaptive controller
- DELETE the accumulation-drop activity inference (`accumCount < prevAccumCount`) and its `selfResized` plumbing.
- DELETE the `mouseOverCanvas` input (already unused) and the `gateOnAccumOnly` branch (sibling apps declare sessions like everyone else; live sims keep `alwaysActive`).
- KEEP the scale-normalized full-res cost estimator (`fullResFrameMs = ema(frameMs * scale²)`) — the one piece that worked — for seeding the downscale.
- KEEP the FPS-scaled `grace` settle window and the deep-accum quality protection.

## Consequences

### Benefits
- **Sliders, pickers, drawing all "just work"** with adaptive + accumulation-hold, because they finally declare interaction.
- **~1s lag gone** — engagement is declared at the event, not inferred a frame-or-more late.
- **Adaptive becomes immune to reset noise** — it engages on the session, not on accumulation, so Root Cause A (or any future reset noise) can't pin it downscaled.
- **One timing model** replaces the 200ms input buffer + FPS-scaled grace + dual gizmo state + transaction-based `isUserInteracting`, all of which currently drift.
- **Generic** (engine principle "one engine, many apps") — a new interaction type (touch, MIDI, voice) adds one `beginInteraction('x')`, not a new flag in N consumers.

### Risks / costs
- Touches every input source — a broad but mechanical wiring change. Mitigated by phasing (below) and by the fact that `useDragValue` already exposes `onDragStart`/`onDragEnd` seams.
- A missing `endInteraction` would strand the session "always interacting" (→ never converge). Mitigated by ref-counting + pointer-capture-loss/`lostpointercapture` safety releases + a dev warning + a max-session watchdog.
- Behavioral change to a tuned system → requires visual verification (the user owns visual testing). Phased rollout keeps each step revertible.

### Sibling apps
- `viewportSlice` (fluid-toy / fractal-toy main-thread adaptive) migrates from `isUserInteracting` (historySlice transaction) to `interactionSlice.isInteracting()`. `alwaysActive` (live sims) is unaffected; `gateOnAccumOnly` is retired (sessions make it unnecessary).
- `historySlice`'s `isUserInteracting` may remain for undo-coalescing, but is no longer the adaptive input.

## Implementation phases (each independently shippable + revertible)
1. **A-fix (independent):** delta-based `hasVisualChange` in `AnimationSystem.tsx` — restores convergence for animated/modulated scenes. Land + verify first.
2. **Primitive:** add `createInteractionSlice`; derive `interacting`; send it in `renderState` **alongside** the existing signals (no consumer switch yet). Inert.
3. **Producers:** wire sources to declare — camera/gizmo first (parity with today), then the currently-invisible ones (slider via `useDragValue.onDragStart/End`, picker, drawing, scrub, playback).
4. **Consumers:** switch adaptive input + `FractalEngine` hold to `renderState.interacting`; migrate `viewportSlice`. Remove `mouseOverCanvas`/`gateOnAccumOnly`/accum-drop inference.
5. **Cleanup:** delete the now-dead proxies and dual gizmo state; collapse `isCameraInteracting`/`cameraInUse` derivations.

## Open questions (for review)
1. **Placement & ownership** — engine-core store slice (`store/slices/`) is the proposed home so both the worker bridge and main-thread `viewportSlice` read it. Agree, or should it be an engine plugin?
2. **Should `playback`/`scrub` be sources at all?** They aren't "user hand on a control," but they *do* want adaptive on and accumulation held. Treating them as sources keeps one signal; the alternative is a separate `sceneAnimating` flag.
3. **Debounce value** — 150ms proposed for the micro-gap bridge. Tune?
4. **Does the deep-accum quality protection survive as-is**, or fold into the session model (e.g. "protect once N full-res samples earned, regardless of session")?
5. **Scope of the first PR** — phases 1+2 only (safe, inert), or 1–4 (the full switch)?
