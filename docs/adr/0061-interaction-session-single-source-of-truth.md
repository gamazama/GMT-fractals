# ADR-0061: A single `InteractionSession` primitive as the source of truth for gesture activity ("is the user mid-gesture?")

**Date:** 2026-05-30 _(revised same day: a 5-angle review — architecture fit / correctness & failure-modes / migration risk / simpler-alternatives / performance — then edge investigations E1–E5, then a scope-boundary + additive-cutover hardening pass)_
**Status:** Proposed _(direction chosen: full primitive, hardened; edges E1–E5 closed; ready to implement P2)_
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

### Scope boundary — gesture activity ONLY (not a render-intent god-object)
The session is the single source of truth for **one** question: *is a continuous user gesture in flight?* It is deliberately **not** the answer to "should the engine be doing work right now" — that is a composition of orthogonal axes the session must not absorb:
- **Gesture activity** — the session's job (this primitive).
- **Render invalidation / dirtiness** — "did something change the image?" (camera moved, param/preset changed, texture swap). This already lives in the accumulation-reset / `dirty` system and **stays there**. It overlaps gesture activity but is *not* the same: a discrete preset-load invalidates with no gesture; a held-but-motionless drag is a gesture that doesn't invalidate.
- **Camera-blocking / permission** — `selectMovementLock` (orthogonal; E3 keeps it outside).
- **Scene animation** — `isSceneAnimating` (orthogonal; playback is not a gesture).

The recurring-bug trap — the one that produced the five-iteration patch cycle — is letting "is the user interacting?" silently widen into "should we work?". Consumers that need the broader question **compose** session-activity with the other axes (see the idle-pause migration in E3) rather than reading the session alone. Keep the session narrow; that narrowness is what makes it correct *and* testable.

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
isIdle(ms?: number): boolean;   // !isInteracting && (now - lastActivityTime) >= (ms ?? DEBOUNCE_MS).
//   Convenience for the render idle-pause + defer-expensive-work consumers (E4) so they
//   don't each re-derive `now - lastActivityTime`.
interactionSources: ReadonlySet<InteractionSource>;
lastActivityTime: number;
```
A thin reactive hook `useIsInteracting(filter?)` subscribes to the coarse edge boolean (via `subscribeWithSelector`) for the few low-frequency UI consumers (HUD-fade, defer-work UI) — see Downstream consumers (E4). Hot-path consumers never subscribe; they read via `getState()` (Performance).
- **Open `string` token** in core; GMT defines its canonical set (`camera|gizmo|slider|picker|drawing|scrub`) in `engine-gmt`. A new input type (touch, MIDI) adds a token, never edits core. (Review #1.)
- **`isInteracting` accepts a source filter** so a consumer can ignore sources it doesn't care about (e.g. a future sibling-app adaptive that ignores `slider`). (Review #1/#7 — sibling-app safety.)
- **Ref-counted per source**; an unbalanced `end` can't strand the set (dev-warns).
- **`playback` is NOT an interaction source** — it's autonomous scene animation, not a gesture. Adaptive consumes `isInteracting() || isSceneAnimating` where `isSceneAnimating` derives from existing `isPlaying`/active-LFO state. `scrub` (user dragging the timeline) IS a gesture source. (Reviews #1 + #4.)
- **`isInteracting` includes only a short fixed debounce** (`DEBOUNCE_MS`, candidate 150–200ms — TBD, aligned toward the existing 200ms input buffer to avoid a third constant) to bridge micro-gaps within a drag. The downscale→upscale *settle* stays the adaptive module's FPS-scaled `grace` (ADR-0024). Two windows, two jobs.

### Producer ergonomics — a hook, so sources can't be silently forgotten
Export `useInteractionDrag(source)` returning `{ onPointerDown, onPointerUp, onLostPointerCapture, onPointerCancel }` (and a `useEffect` cleanup). `onPointerCancel` is not optional — touch interruption fires `pointercancel`, not `pointerup` (see Touch / multi-pointer below). Drag components spread these instead of hand-calling store actions. The hook is **dispatch-only** — it reads nothing from the store, so mounting it in ~90 components costs zero renders (see Performance). Dev-mode warns if `beginInteraction` is called for a source never seen before. (Review #1/#2 + #3 silent-miss risk.)

**Reuse the proven lifecycle for param/slider drags.** The highest-volume producer — `useDragValue` param drags — already has a *balanced* begin/end with cleanup: `beginParamTransaction`/`endParamTransaction` (historySlice). Anchor the `slider` session begin/end to those existing boundaries rather than a parallel hand-rolled lifecycle, so it inherits a battle-tested end + cleanup instead of adding new stranding surface. The session *adds* the sources the transaction system doesn't cover (camera/gizmo/picker/drawing) + source-tagging; the watchdog (#5) stays a backstop, not load-bearing.

### Stranded-session safety — BLOCKING (this is the regression class we already hit)
A missing `endInteraction` leaves `interacting=true` forever → never converges. Mitigations are **requirements**, not footnotes (Reviews #2 + #3):
1. **`lostpointercapture` *and* `pointercancel` release** on every custom drag source (the `useInteractionDrag` hook supplies both handlers; the component must wire them). `pointercancel` is the touch-specific stranding path — an OS gesture / incoming call / app-switch fires it instead of `pointerup`. E1 found the custom drag handlers (`Navigation` custom orbit + middle-drag, `useInteractionManager` pickers, `DrawingOverlay`) listen for `pointerup` only, so a touch-cancel would strand them. The drei-`<OrbitControls>`-driven `camera` session is exempt — drei dispatches `onEnd` on its own internal pointercancel.
2. **Unmount cleanup** — the hook's `useEffect` cleanup calls `endInteraction(source)` if a drag was active when the component unmounts (covers modal-open / Strict-Mode double-unmount mid-drag).
3. **Picker RAF guards** — the focus/julia pick loops (`useInteractionManager`) must `endInteraction('picker')` and exit when `canvasRef.current` goes null or the async pick rejects.
4. **Gizmo single-source** — drive `engine.isGizmoInteracting` from the same begin/end as the session (no parallel dual-state drift).
5. **Watchdog** — if `isInteracting` has been continuously true beyond `MAX_SESSION_MS` (~8s) with no `pokeInteraction`/accum activity, force-clear + dev-warn. Crude backstop, last line of defence.

### Touch / multi-pointer / pinch (E1 — resolved: no new token, touch is free)
Grounded in `engine-gmt/navigation/*` + `components/inputs/hooks/useDragValue.ts`. **Touch needs no separate producer and no new source token** — it reuses the canonical set.
- **Camera (touch):** one-finger rotate, two-finger pinch-zoom, and two-finger pan all flow through drei's `<OrbitControls>` (`Navigation.tsx:1353`, `touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}` at `:1372`), which exposes a single `onStart`/`onEnd` pair (`:1373`/`:1395`). Wiring `beginInteraction('camera')`/`endInteraction('camera')` into those two callbacks — a **P3a site already in scope** — covers every touch camera gesture. drei collapses the 1→2→1-finger transition into ONE `onStart…onEnd`, so there is **no multi-pointer double-begin**: the `camera` token is one session per gesture. (Naive per-finger `pointerdown` ref-counting *would* misbehave on multi-touch, but the OrbitControls wiring sidesteps it.) This is already the de-facto signal today — touch camera activity reaches adaptive via `isOrbitDragging` (set in the same `onStart`/`onEnd`, `:1382`/`:1396`), folded into `isCurrentlyActive` at `Navigation.tsx:1096`. The `camera` token additionally has the desktop-only custom left-drag orbit `onDown/onUp` (`:680`/`:808`) + middle-drag + wheel `poke`; ref-counting under one token makes the overlaps safe.
- **Pinch ≠ wheel:** mouse-wheel zoom is a discrete `poke` (`useInputController.ts:183` `markActivity`); touch pinch-zoom is part of the *continuous* `camera` session (OrbitControls onStart/onEnd). Model them as distinct — **do not** treat pinch as a poke.
- **Everything else rides PointerEvents:** pickers (`useInteractionManager`), drawing (`DrawingOverlay`, `setPointerCapture`), light gizmo, sliders/knobs/vectors (`useDragValue`), timeline scrub all use `onPointerDown/Move/Up` — so the P3a/P3b pointer wiring covers touch automatically; there is no touch-specific code path to wire.
- **Mouse-only (no touch concern):** custom cursor-anchored wheel zoom (a poke) and Fly-mode mouse-look (explicitly blocked on touch — `useInputController.ts:237`).
- **Safety delta:** touch adds the `pointercancel` stranding path → mitigation #1 above is widened accordingly.

### Worker bridge — and an honest take on the ~1s lag
`GmtRendererTickDriver` sends one derived `interacting` boolean in `renderState` each `RENDER_TICK`, and adaptive reads `isInteracting: renderState.interacting`. Declaring at the input event (not a buffered `useFrame`) removes the inference delay. **But** the boolean still crosses on the same transport, so this does not *prove* the 1s vanishes — we never definitively pinned the 1s. Therefore:
- Add **seed-the-downscale on session-start** (engagement frame) so the first downscaled frame doesn't wait on a measurement window.
- Phase 2 **measures** the real input→downscale latency before claiming victory. If a residual lag remains, it's main-thread `useFrame` starvation (a separate perf issue), and we say so rather than overclaiming. (Review #2.)

### What it replaces in the adaptive controller (GMT)
- In **P5** (only after the P4 parallel run confirms the session — see phases), DELETE the accumulation-drop activity inference for GMT + the unused `mouseOverCanvas`; the `gateOnAccumOnly` branch stays for sibling apps. (`selfResized` stays — it's adaptive-internal, per E3.)
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

**Benefits:** sliders/pickers/drawing become visible to adaptive + hold; adaptive becomes immune to reset noise (engages on the session, not on accumulation); one timing model (the session debounce) replaces the lagged 200ms camera buffer + the dual gizmo state — the adaptive `grace` and the undo transaction flag stay (separate jobs, per E3); generic (a new input type adds one token).

**Risks / costs:** broad blast radius (~100 producer call sites, many via `useDragValue` passthrough components that could be missed — the hook + dev-warn mitigate); the stranded-session class above (mitigations are blocking); behavioral change to a tuned system needs visual verification (user owns it); `isUserInteracting` has **other** consumers (HUD fade, undo coalescing, `selectIsGlobalInteraction`) that must be audited and migrated before removal, or kept (undo-coalescing is arguably a separate transaction concept). (Review #3.)

## Edge investigation outcomes (E1–E5)

The five edge investigations close before/with phase 2 (each may revise this ADR). **E1 (touch)** is folded into the producer + safety sections above. E2–E5 below.

### E2 — Export / bucket suppression (resolved)
Sessions are **export-safe by construction** — no new mechanism needed:
- **Write-side is invisible to export.** begin/end/poke write only module refs + one coarse boolean on idle↔active edges (see Performance); nothing new crosses to the worker, and deterministic export frames never consume an interaction signal.
- **Adaptive is already doubly gated:** the whole resize block is skipped while `isExporting || isBucketRendering` (`UniformManager.ts:97`), and independently `adaptiveSuppressed` hard-forces scale 1.0 (`UniformManager.ts:127` → `AdaptiveResolution.ts:221-228`).
- **Hold is already gated:** `FractalEngine.compute()` / `update()` early-return on `isExporting` (`:553` / `:493`); bucket never holds (`:563`); camera is locked via `selectMovementLock` (`engineStore.ts:464`, which already includes both flags).
- **Rule P4 must preserve:** any consumer of `isInteracting()` that affects frame determinism stays gated by `!isExporting && !isBucketRendering`, kept at the **GMT consumer / derivation site** (`GmtRendererTickDriver.tsx:256`, beside `adaptiveSuppressed`) — **do not** bake export-awareness into the generic core slice. When P4 swaps the proxy for `session.isInteracting()`, the existing UniformManager:97 + compute() guards already cover adaptive + hold; the gate only needs re-adding if a NEW determinism-affecting consumer is wired.

### E3 — Consumer audit (migrate / keep / remove)
This is the expanded "phase 2.5". Full cited reader table lives in `plans/interaction-session-rollout.md` (E3 notes); decisions:
- **MIGRATE → `session.isInteracting()`** (P4): the adaptive input (`UniformManager.ts:118`, today `isGizmoInteracting || cameraInUse`); the GMT `cameraInUse` / `isGizmoInteracting` derivation (`GmtRendererTickDriver.tsx:256-257` — unify the dual gizmo state here); `selectIsGlobalInteraction` (`engineStore.ts:444`) → `session.isInteracting() || interactionMode !== 'none'`; PauseControls (downstream of that selector).
- **MIGRATE by COMPOSITION, not replacement** (P4): the render idle-pause early-return (`FractalEngine.ts:557`, `isPaused && now - lastInteractionTime > 1000`) wakes on `!session.isIdle(1000) || recentlyDirty` — session-activity **OR** a recent accumulation-reset. `markInteraction`/`lastInteractionTime` is a *wake/invalidation* signal, **not** a gesture signal: it fires on discrete param/preset/config changes (`resetAccumulation`, `updateConfigInternal`) that produce no gesture. Reading `session.isIdle` *alone* would stop a paused/idle render from waking on a non-drag change (click a preset, type a value) — re-introducing a convergence/visibility bug. Keep the discrete invalidations on the existing dirty/accum-reset path; the idle-pause reads the composition. (See Scope boundary.)
- **MIGRATE w/ source-filter** (P4): HUD auto-fade (`HudOverlay.tsx:63`, today keys on camera-only `isCameraInteracting`) → `session.isInteracting({ only: ['camera','scrub'] })`. This is the concrete justification for the API's `filter` (Review #1) — it reproduces today's camera-only fade with no behavior change.
- **KEEP SEPARATE — undo coalescing (resolves open-Q #6):** `isUserInteracting` in `historySlice` (`beginParamTransaction`/`endParamTransaction`/`pushCameraTransaction`, `:161`/`:166`/`:206`) is a **transaction-boundary** marker (snapshot params at start, diff+push at end, restore DPR, 1500ms camera-undo debounce) — *not* activity inference. It stays. The session is wired at the **same producer sites** (a slider/camera gesture fires both `beginInteraction` and `beginParamTransaction`), but does **not** replace the flag. After P4, `isUserInteracting` is read only by undo.
- **KEEP OUTSIDE — camera-blocking is an orthogonal axis:** `selectMovementLock` / `interactionConfig.blockCamera` (`engineStore.ts:463`; the drawing feature sets `blockCamera`) is a *permission* gate — a source can be active AND block camera. The session reports activity; the caller composes activity + lock. **Caveat:** `selectMovementLock` reads `isGizmoDragging` / `interactionMode`; when P5 removes the dual gizmo state, repoint that check at the unified source — don't drop it.
- **REMOVE (P4/P5):** `mouseOverCanvas` — dead in the decision path (`AdaptiveResolution.ts:275-281`), still computed at `GmtRendererTickDriver.tsx:258` as a no-op; the GMT accum-drop activity branch (`AdaptiveResolution.ts:240`) — the session replaces it for GMT.
- **KEEP (not session consumers):** `gateOnAccumOnly` (sibling-app config), `selfResized` (adaptive internal), deep-accum protection (orthogonal, unchanged).

### E4 — Downstream consumers + final API
The API serves more than adaptive + hold, so it's built once. Each consumer → one call:

| Consumer | API call |
|---|---|
| Adaptive input | `isInteracting()` |
| Accumulation hold / render idle-pause | `isIdle(1000)` |
| HUD auto-fade | `isInteracting({ only: ['camera','scrub'] })` |
| Defer expensive work during a gesture — shader compiles (`CompileScheduler.ts` coalesces CONFIG bursts but does **not** yet defer on interaction), autosave, gallery sync, heavy panel re-renders | `isInteracting()` / `isIdle(ms)` |
| Tutorial / first-interaction detection | `lastActivityTime` / `interactionSources` |
| Interaction telemetry | `interactionSources` + edge subscription |
| Future "performance mode" | `isInteracting()` |

This drives the API additions above: **`isIdle(ms?)`** (centralizes the idle check) and the **`useIsInteracting(filter?)`** reactive hook (generalizes the single existing interaction-ish subscription in `Viewport.tsx` for the few low-frequency UI consumers). The source-`filter` is now load-bearing (HUD-fade) — keep it.

### E5 — Testing & observability (built in P2)
- **Pure state machine, `now` injected.** Extract the ref-count / debounce / watchdog logic into a pure `InteractionSessionMachine` that mirrors `engine/AdaptiveResolution.ts` (a `createState()` factory + a `tick`-style reducer; no DOM / React / Three). **It must take `now` as a parameter** (exactly as `tickAdaptiveResolution` does), never call `performance.now()` internally — otherwise the debounce-tail and watchdog cases aren't deterministically testable. `createInteractionSlice` is then a thin Zustand wrapper that owns the module refs and gates the edge-boolean write (the `viewportSlice` `_adaptive` pattern).
- **Test file:** `debug/test-interaction-session.mts`, a `tsx` script mirroring `debug/test-compat.mts` — the repo has **no vitest/jest**; tests are tsx scripts with inline asserts + snapshot diffing. Add it to `package.json` scripts. Cases: ref-count balance (double-`begin` needs double-`end`); unbalanced `end` → dev-warn, no strand; debounce tail (`isInteracting` true for `DEBOUNCE_MS` after the last `end`, then false — advance injected `now`); watchdog force-clear at `MAX_SESSION_MS` with no poke; unmount-mid-drag → cleanup `end`; `lostpointercapture` + `pointercancel` → `end`; poke throttle (~50ms coalesce, timestamp-only, no store write).
- **Dev overlay:** add an `interactionSessionOpen` toggle to the existing `debug_tools` feature (`engine/features/debug_tools/`), rendering a small badge (mirror `engine/plugins/viewport/AdaptiveResolutionBadge.tsx`) showing live `interactionSources` (read via `getState()`), the `isInteracting` boolean, and adaptive scale (`1 / qualityFraction`); gated by the advanced menu, mounted via the existing ComponentRegistry overlay slot — no new framework.

## Implementation phases (each independently shippable + revertible)
1. **A-fix** — delta-based modulation reset. **DONE (f8fa698).**
2. **Primitive + bridge (inert).** Add the pure `InteractionSessionMachine` (`now`-injected, per E5) + its `createInteractionSlice` wrapper + `useInteractionDrag`; derive `interacting` + `isSceneAnimating`; send `interacting` in `renderState` **unused**. Add the `debug/test-interaction-session.mts` state-machine tests + a test for the worker read-path (a typo → silent `false`). Build the E5 dev overlay. Add **per-consumer kill-switch flags** (adaptive / hold / HUD-fade / idle-pause flip independently, so a P4 regression bisects to one consumer instead of reverting wholesale). Measure input→downscale latency — **this baseline is a gate: P4 must beat it.**
   - **2.5 — consumer audit.** Grep all readers of `isUserInteracting`, `isGizmoInteracting`, `cameraInUse`, `mouseOverCanvas`, the accum-drop; mark HUD-fade / undo-coalescing / `selectMovementLock` migration points with TODOs.
3. **Producers, split by blast radius.**
   - **3a (~10 sites):** camera/nav, light gizmo, pickers — clear begin/end, includes the safety wiring. Camera begin/end at OrbitControls `onStart`/`onEnd` covers touch rotate/pinch/pan for free (E1); custom drag sources here also wire `pointercancel`.
   - **3b (~90 sites):** sliders/knobs/vectors via `useInteractionDrag` (wire `useDragValue.onDragStart/End` + capture-loss + unmount cleanup), drawing, timeline scrub. Anchor the `slider` begin/end to the existing `beginParamTransaction`/`endParamTransaction` boundaries (already balanced + cleaned up) rather than a parallel lifecycle. A **mechanical coverage check** (grep/lint that every `useDragValue` consumer is wired) catches missed sites — don't rely on eyeballing 90 of them.
   - **Go/no-go checkpoint (after 3a + the start of 3b's parallel run):** does the overlay show correct sessions, and does the latency baseline justify the remaining blast radius? This is the deliberate decision gate before committing the expensive 90-site phase — the "build the primitive" bet is *contingent* on this passing.
4. **Switch consumers (GMT) — ADDITIVE, not rip-and-replace.** Point adaptive input + `FractalEngine` hold + HUD-fade + the idle-pause at the session (each behind its per-consumer flag from P2), **but leave the accum-drop proxy running in parallel.** The dev overlay shows session vs. accum-drop side by side; confirm they agree across real use (sliders reach target, idle converges, no mid-gesture pops) before trusting the session. Undo-coalescing readers stay (kept, per E3). **Behavior-changing — visual verification + a latency re-measure that must beat the P2 baseline; if it doesn't, the root cause was elsewhere (likely main-thread `useFrame` starvation) — stop and reassess, don't ship.**
5. **Cleanup + safety hardening** — once the parallel run confirms the session: remove the GMT proxies (accum-drop activity inference, `mouseOverCanvas`, `gateOnAccumOnly` for GMT), delete the dual gizmo state (repoint `selectMovementLock`'s gizmo check at the unified source — don't drop it), finalize the watchdog + dev warnings, remove the per-consumer flags. Sibling-app migration is a **separate** follow-up.

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
6. **Undo coalescing** → **KEEP SEPARATE** — `isUserInteracting` is a transaction-boundary marker, not activity; wired at the same producer sites but not replaced by the session. **Resolved (E3).**
7. **Touch / multi-pointer / pinch** → no new token; touch camera rides drei OrbitControls' single `onStart`/`onEnd` (one session per gesture, no double-begin), everything else rides shared PointerEvents; `pointercancel` added to the stranded-session mitigations. **Resolved (E1).**
8. **Export / bucket** → sessions are export-safe by construction; keep the `!isExporting && !isBucketRendering` gate at the GMT consumer site, not in core. **Resolved (E2).**
9. **Camera-blocking axis** → `selectMovementLock` / `blockCamera` stays OUTSIDE the session (orthogonal permission axis); caller composes activity + lock. **Resolved (E3).**
10. **Downstream API scope** → `isInteracting(filter)` + `isIdle(ms)` + `useIsInteracting` hook serve adaptive, hold/idle-pause, HUD-fade, defer-work, tutorial, telemetry. **Resolved (E4).**
