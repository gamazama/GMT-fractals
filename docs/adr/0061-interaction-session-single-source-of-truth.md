# ADR-0061: A single `InteractionSession` primitive as the source of truth for "is the user interacting?"

**Date:** 2026-05-30 _(revised same day to fold in a 5-angle review: architecture fit / correctness & failure-modes / migration risk / simpler-alternatives / performance)_
**Status:** Proposed _(direction chosen: full primitive, hardened — implementation not started)_
**Scope:** new `store/slices/createInteractionSlice.ts` (engine-core, generic) + a `useInteractionDrag` hook; consumers in `engine/AdaptiveResolution.ts`, `engine-gmt/engine/managers/UniformManager.ts`, `engine-gmt/engine/FractalEngine.ts` (hold), `engine-gmt/renderer/GmtRendererTickDriver.tsx`; producers across `engine-gmt/navigation/*`, `components/inputs/hooks/useDragValue.ts`, light gizmo, pickers, drawing, timeline scrub. **GMT only** for now — sibling apps (fluid-toy/fractal-toy via `store/slices/viewportSlice.ts`) keep their current adaptive inputs and opt in later.
**Related:** ADR-0024 (pure adaptive module — still holds), ADR-0025/0026 (viewport hooks / pluggable render-scale), ADR-0034/0041-0042 (worker contract / drift), ADR-0059 (capability protocol — the open-token pattern this borrows).

## Context

Investigating "accumulation resets while the picture stays the same" (the path tracer never converges, and adaptive resolution misbehaves) surfaced two **separate** root causes.

**Root cause A (convergence) — already FIXED** (commit f8fa698): the modulation tick flagged a visual change whenever an offset was merely non-zero (compared to *zero*, not the previous frame), so any active/constant LFO reset accumulation every frame. Now delta-based. A truly static scene already converged.

**Root cause C (this ADR) — interaction state is fragmented.** There is no single answer to "is the user interacting?" — ~6 subsystems infer it independently, with different timing and scope, and they don't share a source of truth:

| Source | Signal(s) | Visible to adaptive / accumulation-hold? |
|---|---|---|
| Camera (orbit/fly/drag/wheel) | `isCameraInteracting` ← `isInteracting()` ← `isDraggingRef`/… + 200ms buffer | ✅ but **lagged** — set in a buffered `useFrame` (`Navigation.tsx:1154`), not at pointerdown |
| Animation playback / timeline scrub | `isPlaying`, `isScrubbing` → OR'd into `cameraInUse` | ✅ |
| Light gizmo | `engine.isGizmoInteracting` **and** `isGizmoDragging` (dual, unsynchronized) | ✅ (fragile) |
| **Sliders / knobs / vectors** | `useDragValue` local `isDragging` only | ❌ **invisible** — never calls any interaction API |
| **Pickers (focus / julia)** | `isDraggingFocusRef`/`isDraggingJuliaRef` + `interactionMode` | ❌ invisible to adaptive (only blocks camera) |
| **Drawing / region select** | `interactionMode` | ❌ camera-locked only |

Symptoms this directly produces: **sliders never reach target FPS** (adaptive learns of a slider drag only via a racy accumulation-drop, so it neither sustains engagement nor keeps its cost estimate fresh); a **~1s engagement lag** on camera; and the system only disengaged at all because the racy accum-drop *accidentally* let it — it was balanced on a race condition. Five iterations of patching the adaptive proxies each fixed one and exposed another: the activity signal is broken **at the source**.

## Decision

Introduce a single engine-core **`InteractionSession`** primitive that every input source *declares into* and adaptive + accumulation-hold *subscribe to*, replacing the proxy inference.

### API (engine-core store slice, `createInteractionSlice`)
```ts
// Open token type — engine-core stays domain-agnostic (mirrors ADR-0059).
// Canonical GMT tokens are declared at the app level, not baked into core.
export type InteractionSource = string;

beginInteraction(source: InteractionSource): void;   // continuous gesture start
endInteraction(source: InteractionSource): void;     // gesture end (ref-counted per source)
pokeInteraction(source: InteractionSource): void;    // discrete event (wheel/key) — refresh, no end

isInteracting(filter?: { only?: InteractionSource[]; except?: InteractionSource[] }): boolean;
//   = activeSources(filtered).size > 0 || (now - lastActivity(filtered) < DEBOUNCE_MS)
interactionSources: ReadonlySet<InteractionSource>;
lastActivityTime: number;
```
- **Open `string` token** in core; GMT defines its canonical set (`camera|gizmo|slider|picker|drawing|scrub`) in `engine-gmt`. A new input type (touch, MIDI) adds a token, never edits core. (Review #1.)
- **`isInteracting` accepts a source filter** so a consumer can ignore sources it doesn't care about (e.g. a future sibling-app adaptive that ignores `slider`). (Review #1/#7 — sibling-app safety.)
- **Ref-counted per source**; an unbalanced `end` can't strand the set (dev-warns).
- **`playback` is NOT an interaction source** — it's autonomous scene animation, not a gesture. Adaptive consumes `isInteracting() || isSceneAnimating` where `isSceneAnimating` derives from existing `isPlaying`/active-LFO state. `scrub` (user dragging the timeline) IS a gesture source. (Reviews #1 + #4.)
- **`isInteracting` includes only a short fixed debounce** (`DEBOUNCE_MS`, candidate 150–200ms — TBD, aligned toward the existing 200ms input buffer to avoid a third constant) to bridge micro-gaps within a drag. The downscale→upscale *settle* stays the adaptive module's FPS-scaled `grace` (ADR-0024). Two windows, two jobs.

### Producer ergonomics — a hook, so sources can't be silently forgotten
Export `useInteractionDrag(source)` returning `{ onPointerDown, onPointerUp, onLostPointerCapture }` (and a `useEffect` cleanup). Drag components spread these instead of hand-calling store actions. The hook is **dispatch-only** — it reads nothing from the store, so mounting it in ~90 components costs zero renders (see Performance). Dev-mode warns if `beginInteraction` is called for a source never seen before. (Review #1/#2 + #3 silent-miss risk.)

### Stranded-session safety — BLOCKING (this is the regression class we already hit)
A missing `endInteraction` leaves `interacting=true` forever → never converges. Mitigations are **requirements**, not footnotes (Reviews #2 + #3):
1. **`lostpointercapture` release** on every drag source (the `useInteractionDrag` hook supplies the handler; the component must wire it).
2. **Unmount cleanup** — the hook's `useEffect` cleanup calls `endInteraction(source)` if a drag was active when the component unmounts (covers modal-open / Strict-Mode double-unmount mid-drag).
3. **Picker RAF guards** — the focus/julia pick loops (`useInteractionManager`) must `endInteraction('picker')` and exit when `canvasRef.current` goes null or the async pick rejects.
4. **Gizmo single-source** — drive `engine.isGizmoInteracting` from the same begin/end as the session (no parallel dual-state drift).
5. **Watchdog** — if `isInteracting` has been continuously true beyond `MAX_SESSION_MS` (~8s) with no `pokeInteraction`/accum activity, force-clear + dev-warn. Crude backstop, last line of defence.

### Worker bridge — and an honest take on the ~1s lag
`GmtRendererTickDriver` sends one derived `interacting` boolean in `renderState` each `RENDER_TICK`, and adaptive reads `isInteracting: renderState.interacting`. Declaring at the input event (not a buffered `useFrame`) removes the inference delay. **But** the boolean still crosses on the same transport, so this does not *prove* the 1s vanishes — we never definitively pinned the 1s. Therefore:
- Add **seed-the-downscale on session-start** (engagement frame) so the first downscaled frame doesn't wait on a measurement window.
- Phase 2 **measures** the real input→downscale latency before claiming victory. If a residual lag remains, it's main-thread `useFrame` starvation (a separate perf issue), and we say so rather than overclaiming. (Review #2.)

### What it replaces in the adaptive controller (GMT)
- DELETE the accumulation-drop activity inference + `selfResized` plumbing; the unused `mouseOverCanvas`; the `gateOnAccumOnly` branch *for GMT* (sibling apps keep it until they opt in).
- KEEP the scale-normalized full-res cost estimator (`fullResFrameMs`) and the FPS-scaled `grace`.
- KEEP the deep-accumulation quality protection **unchanged** — it is orthogonal (protect once N full-res samples earned); `isInteracting` is just one input to the decision. (Review #1 #7.)

## Performance

This primitive sits on the **hottest path in the app** (wheel 10–50/s on trackpads; pointer-move and slider `onChange` at 60–120Hz). The codebase has already tripped React's "Maximum update depth" from interaction-driven re-render storms — see the `liveModulations` delta-write guard (`engine/animation/AnimationSystem.tsx:587-610`). So interaction state is **transient-reactive**, not a plain reactive slice:

- **Non-reactive hot state.** `activeSources` + `lastActivityTime` live in module-level refs (the pattern `viewportSlice` already uses for `_adaptive`/`_holdUntilMs`/`_lastStateUpdateMs`). `pokeInteraction` (wheel/keys) updates only the timestamp ref — **no store write** — and is throttled (~50ms) to coalesce bursts.
- **Reactive only on edges.** `beginInteraction`/`endInteraction` write a coarse reactive `isInteracting` boolean **only on idle↔active transitions** (once per gesture), never per source-add. Matches the delta-before-write discipline the `liveModulations` and `viewportSlice` throttles established.
- **`useInteractionDrag` is dispatch-only** — handlers call `useEngineStore.getState().beginInteraction(...)`; the hook subscribes to nothing, so mounting it in ~90 components has zero render cost. **No per-pointermove writes** — slider `onChange` stays local; the session is signalled at drag start/end only (and wheel via throttled poke).
- **Render-loop reads `isInteracting()` via `getState()`** in `useFrame` (the pattern `GmtRendererTickDriver` already uses); it polls the computed value (so it sees the debounce tail) without a subscription. The boolean crosses to the worker in `renderState`, not through React. Low-frequency reactive UI (HUD fade) may subscribe to the coarse boolean via `subscribeWithSelector` — today only ONE such subscription exists (`Viewport.tsx`).
- Worker-bridge / seed-on-start / watchdog / debounce costs are negligible (one boolean per `RENDER_TICK`; constant-time checks).

**Net hot-path cost:** one reactive write per gesture edge + throttled ref updates → **zero per-frame re-renders.** Hard constraints for the implementation: hook is dispatch-only; no per-pointermove store writes; `pokeInteraction` throttled; gizmo single-source (no parallel `engine.isGizmoInteracting` write); render-loop reads via `getState()`. Phase 2 instruments input→downscale latency to confirm rather than assume.

## Consequences

**Benefits:** sliders/pickers/drawing become visible to adaptive + hold; adaptive becomes immune to reset noise (engages on the session, not on accumulation); one timing model replaces the 200ms buffer + grace + dual gizmo state + transaction-based `isUserInteracting`; generic (a new input type adds one token).

**Risks / costs:** broad blast radius (~100 producer call sites, many via `useDragValue` passthrough components that could be missed — the hook + dev-warn mitigate); the stranded-session class above (mitigations are blocking); behavioral change to a tuned system needs visual verification (user owns it); `isUserInteracting` has **other** consumers (HUD fade, undo coalescing, `selectIsGlobalInteraction`) that must be audited and migrated before removal, or kept (undo-coalescing is arguably a separate transaction concept). (Review #3.)

## Implementation phases (each independently shippable + revertible)
1. **A-fix** — delta-based modulation reset. **DONE (f8fa698).**
2. **Primitive + bridge (inert).** Add `createInteractionSlice` + `useInteractionDrag`; derive `interacting` + `isSceneAnimating`; send `interacting` in `renderState` **unused**. Add a test for the worker read-path (a typo → silent `false`). Measure input→downscale latency.
   - **2.5 — consumer audit.** Grep all readers of `isUserInteracting`, `isGizmoInteracting`, `cameraInUse`, `mouseOverCanvas`, the accum-drop; mark HUD-fade / undo-coalescing / `selectMovementLock` migration points with TODOs.
3. **Producers, split by blast radius.**
   - **3a (~10 sites):** camera/nav, light gizmo, pickers — clear begin/end, includes the safety wiring.
   - **3b (~90 sites):** sliders/knobs/vectors via `useInteractionDrag` (wire `useDragValue.onDragStart/End` + capture-loss + unmount cleanup), drawing, timeline scrub.
4. **Switch consumers (GMT)** — adaptive input + `FractalEngine` hold read `renderState.interacting`; **simultaneously** migrate HUD-fade + undo-coalescing readers; remove the GMT proxies (accum-drop, `mouseOverCanvas`, `gateOnAccumOnly`).
5. **Cleanup + safety hardening** — delete dead signals + dual gizmo state; finalize watchdog + dev warnings. Sibling-app migration is a **separate** follow-up.

## Considered alternatives (and why the full primitive)
- **Minimal slider wiring** — route `useDragValue.onDragStart/End` into the existing `isUserInteracting`. ~8 sites, low risk; fixes sliders only.
- **Camera-sync** — move `setIsCameraInteracting` to the pointerdown handler. ~10 sites; fixes the lag only.
- **Read-side selector** — OR the existing signals in one derived selector. ~2 sites; cosmetic, fixes nothing.

These get ~80–90% of the value at ~20% of the risk and were a serious option (review #4). We chose the **full primitive** because the fragmentation is a recurring root cause ("core of the core"), and the minimal fixes are effectively the *first phases* of the primitive anyway (wiring camera/slider into the session ≈ wiring them into `isUserInteracting`). The primitive additionally fixes pickers/drawing, kills the dual gizmo state, and gives one testable signal — at the cost of the blast radius and safety work above, which the phasing contains.

## Open questions (mostly resolved by the review)
1. **Placement** → engine-core store slice (generic), GMT wires + consumes; sibling apps opt in later. **Resolved.**
2. **`playback`/`scrub`** → `scrub` is a source; `playback` is separate `isSceneAnimating`. **Resolved.**
3. **`DEBOUNCE_MS`** → 150–200ms, lean to 200 to match the existing input buffer. **Tune in phase 2 against measured drag-commit / wheel-burst spacing.**
4. **Deep-accum protection** → orthogonal, unchanged. **Resolved.**
5. **First PR** → phase 2 (+2.5 audit), fully inert. **Resolved.**
6. **NEW — undo coalescing:** does `isUserInteracting` stay as a transaction concept, or fold into the session? Decide during 2.5.
