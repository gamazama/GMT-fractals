# Interaction Session — multi-session rollout plan

Operational tracking for implementing **ADR-0061** (a single `InteractionSession` primitive as the source of truth for "is the user interacting?"). This fixes the remaining accumulation/adaptive issues (sliders never reach target FPS, ~1s engagement lag) by replacing ~6 fragmented interaction inferrers with one declared signal.

- **Design / spec:** `docs/adr/0061-interaction-session-single-source-of-truth.md` (5 review angles folded in: architecture / correctness / migration / alternatives / performance).
- **Background + current state:** memory `project_accumulation_reset_overhaul`.
- **Already done:** RC A (delta-based modulation reset) + interim adaptive fixes — commit `f8fa698`. ADR hardened — `9c6c301`, `7efd0c9`.

## How to run this across sessions
1. **One task per session.** Read ADR-0061 + this doc + the memory file first.
2. Do the task; **update its Status + Notes here**; commit docs + code together; phased + revertible per the ADR.
3. Respect order: **edges E1–E5 close first** (they may revise the ADR), then phases **P2 → P3a → P3b → P4 → P5**.
4. Visual verification is the user's (the renderer can't be observed headlessly); land behavior changes behind the P2 kill-switch.

---

## Edge investigations — close before/with P2 (may revise the ADR)

### E1 — Touch / multi-pointer / pinch  · Status: TODO
Do touch drags already flow through the same pointer handlers (→ free session wiring), or are **pinch-zoom / two-finger pan** separate gestures needing their own begin/end? Read `engine-gmt/navigation/*` (pointer vs touch/gesture handling), `hooks/useMobileLayout.ts`, any pinch/gesture handler. **Output:** which mobile gestures need explicit session wiring → fold into ADR producers + P3.

### E2 — Export / bucket / video-export suppression  · Status: TODO
What should a session do during a bucket render / video export? Confirm `adaptiveSuppressed` already neutralizes adaptive; ensure sessions don't perturb deterministic export frames. Read `engine-gmt/engine/GmtBucketHost.ts`, `worker/WorkerExporter.ts`, the `adaptiveSuppressed` path. **Output:** a suppression rule (ignore sessions while `isExporting`/`isBucketRendering`) → add to ADR.

### E3 — Interaction-state consumer audit (the expanded phase 2.5)  · Status: TODO
Map ALL readers of interaction-ish state and decide migrate-vs-keep for each:
- `isUserInteracting` (historySlice → undo coalescing + `selectIsGlobalInteraction`)
- HUD auto-fade
- `FractalEngine.markInteraction` / `lastInteractionTime` / `isPaused` (the "stop rendering after 1s idle" early-return)
- `selectMovementLock` / `interactionConfig.blockCamera` (note: camera-blocking is an **orthogonal axis** to activity — a source can be active AND block camera)
- `cameraInUse` / `isGizmoInteracting`

**Output:** per-consumer decision → drives P4. Resolves ADR open-Q #6 (does undo coalescing fold in or stay separate).

### E4 — Downstream consumers / final API scope  · Status: TODO
Decide the consumer set the API must serve **beyond adaptive + hold**, so we build it once: HUD auto-fade, **defer-expensive-work-during-interaction** (shader compiles, autosave, gallery sync, heavy panel re-renders), tutorial detection, interaction telemetry, a "performance mode." Shape `isInteracting()` (+ source filter, + `isSceneAnimating`) to be a general capability. **Output:** finalized API + a "downstream consumers" section in the ADR.

### E5 — Testing + observability design  · Status: TODO
Design (a) a **unit-testable session state machine** — ref-count / debounce / watchdog, pure, no render — with cases incl. stranded-session / unmount-mid-drag / lostpointercapture; and (b) a **dev overlay** showing live active sources + `isInteracting` + adaptive scale (extend `AdaptiveResolutionBadge` or a HUD). **Output:** test-file plan + overlay spec → both built in P2.

---

## Implementation phases (from ADR-0061)

### P2 — Inert primitive + bridge  · Status: TODO
`createInteractionSlice` (transient-reactive per ADR Performance: refs for hot state, reactive boolean only on idle↔active edges), `useInteractionDrag` hook (dispatch-only), derive `interacting` + `isSceneAnimating`, send `interacting` in `renderState` **UNUSED**, worker-read-path test (guard silent-`false`-on-typo), input→downscale **latency instrumentation**, **kill-switch flag** for the eventual switch, the E5 unit tests + dev overlay. **Acceptance:** zero behavior change; latency baseline captured; typecheck + smoke clean.

### P3a — Producers: camera / gizmo / picker (~10 sites)  · Status: TODO
Wire begin/end + the BLOCKING safety (lostpointercapture, unmount cleanup, picker RAF guards, gizmo single-source). Still inert (consumers not switched). **Acceptance:** overlay shows correct sessions for these gestures; no regressions.

### P3b — Producers: sliders / knobs / vectors + drawing + scrub (~90 sites)  · Status: TODO
Wire `useDragValue.onDragStart/End` via `useInteractionDrag` across all input components; drawing tools; timeline scrub. **No per-pointermove store writes.** **Acceptance:** overlay shows sessions for every input type.

### P4 — Switch consumers (GMT) + migrate other readers  · Status: TODO
Adaptive input + `FractalEngine` hold read `renderState.interacting`; **simultaneously** migrate the E3 consumers (HUD-fade, undo-coalescing, `isPaused`); remove GMT proxies (accum-drop activity, `mouseOverCanvas`, `gateOnAccumOnly`). **Behavior-changing — visual verification + flip the kill-switch to test both paths.** **Acceptance:** sliders reach target FPS; engagement lag fixed (per the P2 latency instrument); idle converges; HUD/undo/pause unbroken.

### P5 — Cleanup + hardening  · Status: TODO
Remove dead signals + the dual gizmo state; finalize watchdog + dev warnings; remove the kill-switch once stable. **Sibling-app (fluid-toy/fractal-toy) migration is a separate follow-up** (they keep `gateOnAccumOnly` until then).

---

## Open questions (carry from ADR)
- `DEBOUNCE_MS` final value — tune in P2 from measured drag-commit / wheel-burst spacing (candidate 150–200ms).
- Undo coalescing: fold `isUserInteracting` into the session or keep it as a transaction concept — decide in E3.
- (append anything the edge investigations surface)

## Status log
- **2026-05-30:** ADR-0061 finalized (5 review angles); RC A + interim adaptive fixes committed (`f8fa698`); ADR hardening (`9c6c301`, `7efd0c9`); this plan created. **Next session: start E1** (then E2–E5, then P2).
