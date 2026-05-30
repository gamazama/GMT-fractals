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

### E1 — Touch / multi-pointer / pinch  · Status: DONE (2026-05-30)
Do touch drags already flow through the same pointer handlers (→ free session wiring), or are **pinch-zoom / two-finger pan** separate gestures needing their own begin/end? Read `engine-gmt/navigation/*` (pointer vs touch/gesture handling), `hooks/useMobileLayout.ts`, any pinch/gesture handler. **Output:** which mobile gestures need explicit session wiring → fold into ADR producers + P3.

**Notes (resolved → ADR "Touch / multi-pointer / pinch" subsection):**
- **No new source token, no separate touch producer.** Touch is covered by the producers P3a/P3b already wire.
- **Camera touch (1-finger rotate, 2-finger pinch-zoom, 2-finger pan)** all flow through drei `<OrbitControls>` (`Navigation.tsx:1353`, `touches` at `:1372`), which fires ONE `onStart`/`onEnd` pair (`:1373`/`:1395`) for the whole gesture. Wiring `begin/endInteraction('camera')` there — a P3a site already in scope — covers all of touch. The 1→2→1-finger transition does **not** re-fire onStart, so there's no multi-pointer double-begin. Already the de-facto signal today via `isOrbitDragging` → `isCurrentlyActive` (`Navigation.tsx:1096`).
- **Pinch ≠ wheel:** mouse wheel = discrete `poke` (`useInputController.ts:183`); touch pinch = part of the continuous `camera` session. Don't model pinch as a poke.
- **Pickers / drawing / gizmo / sliders / scrub** all ride shared PointerEvents (`onPointerDown/Move/Up`) → touch is free once those are wired. Mouse-only: custom wheel zoom (poke) + Fly-mode mouse-look (blocked on touch, `useInputController.ts:237`).
- **Safety delta → ADR mitigation #1 widened:** touch interruption fires `pointercancel` (not `pointerup`); custom drag handlers (`Navigation` custom orbit/middle-drag, `useInteractionManager`, `DrawingOverlay`) listen for `pointerup` only and would strand a session — `useInteractionDrag` must supply `onPointerCancel` + `onLostPointerCapture`. drei-driven `camera` is exempt (drei fires `onEnd` on its own pointercancel).
- **`hooks/useMobileLayout.ts` is layout-only** (no input handling) — not a producer.

### E2 — Export / bucket / video-export suppression  · Status: DONE (2026-05-30)
What should a session do during a bucket render / video export? Confirm `adaptiveSuppressed` already neutralizes adaptive; ensure sessions don't perturb deterministic export frames. Read `engine-gmt/engine/GmtBucketHost.ts`, `worker/WorkerExporter.ts`, the `adaptiveSuppressed` path. **Output:** a suppression rule (ignore sessions while `isExporting`/`isBucketRendering`) → add to ADR.

**Notes (resolved → ADR "E2 — Export / bucket suppression"):** Sessions are export-safe by construction.
- **Write-side invisible to export:** begin/end/poke = refs + one edge boolean, nothing new crosses to the worker; export frames consume no interaction signal.
- **Adaptive already doubly gated:** resize block skipped while `isExporting||isBucketRendering` (`UniformManager.ts:97`) AND `adaptiveSuppressed`→scale 1.0 (`:127`→`AdaptiveResolution.ts:221-228`). `adaptiveSuppressed` set by BucketRenderPanel + render-dialog while mounted.
- **Hold already gated:** `compute()`/`update()` early-return on `isExporting` (`FractalEngine.ts:553`/`:493`); bucket never holds (`:563`); `selectMovementLock` locks camera (`engineStore.ts:464`).
- **Rule:** keep the `!isExporting && !isBucketRendering` gate at the GMT derivation site (`GmtRendererTickDriver.tsx:256`), NOT in the core slice (stays domain-agnostic). P4 must preserve it if wiring a new determinism-affecting consumer; existing adaptive+hold guards already cover it.

### E3 — Interaction-state consumer audit (the expanded phase 2.5)  · Status: DONE (2026-05-30)
Map ALL readers of interaction-ish state and decide migrate-vs-keep for each. **Output:** per-consumer decision → drives P4; resolves ADR open-Q #6.

**Full cited reader table** (decisions summarized in ADR "E3"):

| Reader | file:line | Does | Decision |
|---|---|---|---|
| Adaptive input | `UniformManager.ts:118` | passes `isGizmoInteracting\|\|cameraInUse` → `tickAdaptiveResolution` | **MIGRATE** → `session.isInteracting()` |
| GMT cameraInUse derivation | `GmtRendererTickDriver.tsx:256` | ORs `isCameraInteracting\|\|isPlaying\|\|isScrubbing` into renderState | **MIGRATE** (+ keep `isSceneAnimating` for playback) |
| Gizmo (dual state) | engine `isGizmoInteracting` (`GmtRendererTickDriver.tsx:257`) + `uiSlice` `isGizmoDragging` | unsynchronized dual flag | **MIGRATE** → unify under `gizmo` source |
| Render idle-pause | `FractalEngine.ts:557` | `isPaused && now-lastInteractionTime>1000` → early-return | **MIGRATE** → `session.isIdle(1000)` |
| `selectIsGlobalInteraction` | `engineStore.ts:444` | `isUserInteracting \|\| interactionMode!=='none'` | **MIGRATE** → `session.isInteracting() \|\| mode!=='none'` |
| PauseControls | `engine/plugins/topbar/PauseControls.tsx` | reads the selector for button tone | **MIGRATE** (follows selector) |
| HUD auto-fade | `HudOverlay.tsx:63` | fades crosshair/pill on `isCameraInteracting` | **MIGRATE w/ filter** → `isInteracting({only:['camera','scrub']})` |
| Undo coalescing | `historySlice.ts:161/166/206` | transaction snapshot/diff/DPR-restore/1500ms camera debounce | **KEEP SEPARATE** (transaction concept; wired at same producer sites) |
| Camera-block | `selectMovementLock` `engineStore.ts:463` (+ drawing `blockCamera`) | permission gate (incl. `isExporting`/`isBucketRendering`/`isGizmoDragging`/`interactionMode`) | **KEEP OUTSIDE** (orthogonal axis; repoint gizmo check in P5, don't drop) |
| `mouseOverCanvas` | `AdaptiveResolution.ts:275-281`, computed `GmtRendererTickDriver.tsx:258` | dead in decision path | **REMOVE** (P4/P5) |
| accum-drop activity | `AdaptiveResolution.ts:240` | `accumCount<prev` infers activity | **REMOVE for GMT** (keep for sibling via `gateOnAccumOnly`) |
| `gateOnAccumOnly` | `AdaptiveResolution.ts:284`, `viewportSlice.ts:180` | sibling-app config | **KEEP** |
| `selfResized` | `AdaptiveResolution.ts:244` | adaptive-internal | **KEEP** |

**Open-Q #6 RESOLVED — undo coalescing stays separate.** It's a transaction-boundary marker (verified: `endParamTransaction` snapshots+diffs params, restores DPR, pushes one undo entry), not "is active". The session is wired at the same begin/end producer sites but doesn't replace `isUserInteracting`; after P4, only undo reads it.

### E4 — Downstream consumers / final API scope  · Status: DONE (2026-05-30)

### E4 — Downstream consumers / final API scope  · Status: TODO
Decide the consumer set the API must serve **beyond adaptive + hold**, so we build it once: HUD auto-fade, **defer-expensive-work-during-interaction** (shader compiles, autosave, gallery sync, heavy panel re-renders), tutorial detection, interaction telemetry, a "performance mode." Shape `isInteracting()` (+ source filter, + `isSceneAnimating`) to be a general capability. **Output:** finalized API + a "downstream consumers" section in the ADR.

**Notes (resolved → ADR "E4" + API block):** Final API = `beginInteraction`/`endInteraction`/`pokeInteraction`, `isInteracting(filter?)`, **`isIdle(ms?)`** (new — centralizes the idle check for render-pause + defer-work), `interactionSources`, `lastActivityTime`, plus a reactive **`useIsInteracting(filter?)`** hook (coarse edge boolean, for the few low-freq UI consumers — generalizes the lone existing subscription in `Viewport.tsx`). `isSceneAnimating` stays separate (playback ≠ gesture). Consumer→call map: adaptive=`isInteracting()`; hold/idle-pause=`isIdle(1000)`; HUD-fade=`isInteracting({only:['camera','scrub']})`; defer-work (`CompileScheduler.ts` coalesces bursts but doesn't yet defer on interaction; autosave; gallery sync)=`isInteracting()`/`isIdle`; tutorial/telemetry=`interactionSources`+`lastActivityTime`. Source-filter is load-bearing (HUD-fade) → keep it. Hot-path consumers read via `getState()`, never subscribe.

### E5 — Testing + observability design  · Status: DONE (2026-05-30)
Design (a) a **unit-testable session state machine** — ref-count / debounce / watchdog, pure, no render — with cases incl. stranded-session / unmount-mid-drag / lostpointercapture; and (b) a **dev overlay** showing live active sources + `isInteracting` + adaptive scale (extend `AdaptiveResolutionBadge` or a HUD). **Output:** test-file plan + overlay spec → both built in P2.

**Notes (resolved → ADR "E5"):**
- **Pure machine, `now` injected.** Extract `InteractionSessionMachine` mirroring `engine/AdaptiveResolution.ts` (`createState()` + `tick`-style reducer, no DOM/React/Three). MUST take `now` as a param (never call `performance.now()` internally) or debounce/watchdog aren't deterministically testable. `createInteractionSlice` = thin wrapper owning refs + gating the edge boolean (`viewportSlice._adaptive` pattern).
- **No vitest/jest in repo** — tests are `tsx` scripts in `debug/*.mts` with inline asserts + snapshot diffing. Test file: `debug/test-interaction-session.mts` (mirror `debug/test-compat.mts`); add to `package.json`. Cases: ref-count balance, unbalanced-end dev-warn, debounce tail, watchdog force-clear at `MAX_SESSION_MS`, unmount-mid-drag cleanup, `lostpointercapture`+`pointercancel` release, poke throttle (~50ms, no store write).
- **Overlay:** add `interactionSessionOpen` toggle to the existing `debug_tools` feature (`engine/features/debug_tools/`); badge mirrors `engine/plugins/viewport/AdaptiveResolutionBadge.tsx`; reads `interactionSources` via `getState()`, `isInteracting`, `1/qualityFraction`; advanced-menu gated; mounts via ComponentRegistry overlay slot. No new framework.

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
- **2026-05-30:** ADR-0061 finalized (5 review angles); RC A + interim adaptive fixes committed (`f8fa698`); ADR hardening (`9c6c301`, `7efd0c9`); this plan created.
- **2026-05-30:** **E1 done** — touch/multi-pointer/pinch investigated; no new token, touch rides drei OrbitControls (camera) + shared PointerEvents (everything else); `pointercancel` added to stranded-session mitigations. ADR "Touch / multi-pointer / pinch" subsection + mitigation #1 + open-Q #7 updated.
- **2026-05-30:** **E2–E5 done** (all edges closed). E2 export-safe by construction; E3 consumer audit (migrate/keep/remove table) + open-Q #6 resolved (undo stays separate) + camera-block orthogonal; E4 final API (`isIdle` + `useIsInteracting` + source-filter); E5 pure `now`-injected machine + tsx test plan + `debug_tools` overlay. ADR gained an "Edge investigation outcomes (E1–E5)" section + API additions; open-Qs #6–#10 resolved. Commits `3d13d73` (E2), `ee455cf` (E3+E4), + this (E5). **Next session: P2** (inert primitive + bridge — first behavior-touching code, lands behind the kill-switch).
