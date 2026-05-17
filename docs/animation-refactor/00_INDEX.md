# Animation Refactor — Index

**One-line status (update on every commit to this directory):**
> 2026-05-17 — Canvas GraphEditor shipped + polyline-cache stale-render fix landed. Dope-sheet probe + canvas plan drafted; probe first (~1 day), then implementation (~1-2 weeks). Likely the biggest single perf win in the refactor.

## What this is

A multi-phase refactor of GMT's animation, modulation, recording, and timeline systems. Driven by the conclusion that the current architecture — Zustand-owned animation data, DOM-per-keyframe rendering, snapshot-clone undo, three uncoordinated recording modes — cannot scale to the user's actual use cases without being rebuilt around the right primitives.

Goal: **a future-proof working engine** that can absorb new animation features without retouching the data layer, the dispatch model, or the recording lifecycle. Not a perf optimisation pass.

## Docs in this directory

Read in numeric order on first pass. Reference docs are stable once shipped; phase docs accumulate.

| File | Purpose | Status |
|---|---|---|
| [`00_INDEX.md`](./00_INDEX.md) | This file. Roadmap + current state. | living |
| [`01_AUDIT.md`](./01_AUDIT.md) | 30-entry-point inventory of the current system; module decomposition proposal. | shipped |
| [`02_RATIONALE.md`](./02_RATIONALE.md) | Original refactor proposal + self-pushback. Sets the stakes and the "future-proof working engine" framing. | shipped |
| [`03_SPEC.md`](./03_SPEC.md) | Inter-module API spec. The contract Phase 0+ implements. Tests in §7 enforce it. | v2 |
| [`04_CORRECTIONS.md`](./04_CORRECTIONS.md) | Running log of spec amendments (post-shipping changes with date + rationale). | living |
| [`05_SPIKE_PROMPT.md`](./05_SPIKE_PROMPT.md) | Self-contained prompt for the diagnostic spike (validates the architectural diagnosis before Phase 0). | shipped |
| [`06_SPIKE_FINDINGS.md`](./06_SPIKE_FINDINGS.md) | Output of the spike. **Diagnosis invalidated for the named consumer.** Read this before Phase 0 work. | shipped |
| [`07_ENGINE_PROBE_PROMPT.md`](./07_ENGINE_PROBE_PROMPT.md) | Follow-up probe: locate the engineStore subscription that drives Slider re-renders at engine-tick rate. | shipped |
| [`08_ENGINE_PROBE_FINDINGS.md`](./08_ENGINE_PROBE_FINDINGS.md) | Output of the engine-fanout probe. **Hypothesis invalidated; cost is in `Timeline:Graph` polyline resampling.** | shipped |
| [`09_CANVAS_GRAPH_PROMPT.md`](./09_CANVAS_GRAPH_PROMPT.md) | Canvas GraphEditor implementation: three-layer cache (per-track polyline / soft-selection mask / overlay). Front-of-queue work. | shipped |
| [`10_BENCH_METRIC_PROMPT.md`](./10_BENCH_METRIC_PROMPT.md) | Add per-commit median ms column to bench output. Ship before canvas so the before/after comparison is unambiguous. | shipped |
| [`11_CANVAS_GRAPH_REPORT.md`](./11_CANVAS_GRAPH_REPORT.md) | Output of the canvas GraphEditor work. **User-visible graph-play lag resolved.** | shipped |
| `12_BENCH_METRIC_REPORT.md` | Output of the bench improvement (committed inline as `f331a96`; no separate report doc). | n/a |
| [`13_DOPESHEET_PROBE_PROMPT.md`](./13_DOPESHEET_PROBE_PROMPT.md) | DopeSheet load probe: weigh DOM-per-keyframe / TrackRow.tick / mount-churn / React fanout against each other at heavy seed. | shipped |
| [`14_CANVAS_DOPESHEET_PROMPT.md`](./14_CANVAS_DOPESHEET_PROMPT.md) | Canvas DopeSheet implementation: three-layer cache mirroring the GraphEditor work, sidebar stays DOM. **HELD until 13 returns "strong case."** | shipped (held) |
| `15_DOPESHEET_PROBE_FINDINGS.md` | Output of dope-sheet probe. | **pending fresh session** |
| `16_CANVAS_DOPESHEET_REPORT.md` | Output of canvas DopeSheet implementation. | pending (after 15) |
| `PHASE_N_PROMPT.md` / `PHASE_N_REPORT.md` | Original AnimationDocument-first plan. **Deferred** per probe results + canvas success. | held / deferred |

## Current state

```
[done]      Audit             01_AUDIT.md
[done]      Rationale         02_RATIONALE.md
[done]      Spec v2           03_SPEC.md          (9 open questions resolved)
[done]      Spike             05_SPIKE_PROMPT → 06_SPIKE_FINDINGS  → diagnosis INVALIDATED for animation-store
[done]      Engine probe      07_ENGINE_PROBE_PROMPT → 08_ENGINE_PROBE_FINDINGS  → hypothesis INVALIDATED; cost LOCATED in Timeline:Graph
[done]      Bench metric      10_BENCH_METRIC_PROMPT → shipped as f331a96  (per-commit median ms column)
[done]      Canvas GraphEd    09_CANVAS_GRAPH_PROMPT → 11_CANVAS_GRAPH_REPORT  → worker FPS 2×, main FPS 3×, main-thread blocking → 0
[done]      Cache stale-fix   sequenceSlice in-place mutation → polyline cache invalidation correct (b667cfe)
[NEXT]      DopeSheet probe   13_DOPESHEET_PROBE_PROMPT → 15_DOPESHEET_PROBE_FINDINGS  (~1 day)
[THEN-if]   Canvas DopeSheet  14_CANVAS_DOPESHEET_PROMPT → 16_CANVAS_DOPESHEET_REPORT  (~1-2 weeks; gated on probe)
[deferred]  AnimationDocument 03_SPEC.md / original Phase 0-9  (perf case retracted; hygiene case stands)
```

### Outcomes log

| Date | Event | Effect on plan |
|---|---|---|
| 2026-05-10 | Spec v2 shipped after Q-walkthrough | 9 open questions resolved; module boundaries locked |
| 2026-05-17 | Spike returned: per-track sub has no measurable effect on Slider re-renders or frame time | **Phase 0 held.** Diagnosis in `02_RATIONALE.md` is partly invalidated. `AnimationDocument` design itself remains sound; its perf-win case is much weaker than projected. Canvas-first reordering and engineStore narrowing become front-runners for solving the user-reported lag. |
| 2026-05-17 | Bench instrumentation patches landed on `dev` (`990f2e9`) | `animStoreNotifyCount` + fit-to-view seam available for all future probes |
| 2026-05-17 | Engine-fanout probe returned: every profiled boundary commits 480× in dope-play; narrowing zero of four broad subs moved the count | **Probe hypothesis invalidated.** React fanout is not the cost — commit-count is a notification-rate proxy, not a work proxy. Cost is per-commit work in `Timeline:Graph` (~7ms × 480 = 3.3s/scenario), which is `GraphRenderer.drawGraph`'s per-redraw polyline + soft-selection resampling. Architecture for the fix already exists in `02_RATIONALE.md` §7 and `03_SPEC.md` §3.7. |
| 2026-05-17 | AnimationDocument plan deferred | Two empirical probes show it solves no user-visible lag. Hygiene/correctness case unchanged but no longer justifies front-of-queue scheduling. Revisit after canvas ships and the load picture is re-measured. |
| 2026-05-17 | Canvas GraphEditor + bench metric prompts drafted | `09_CANVAS_GRAPH_PROMPT.md` (1-2 weeks) targets the empirically-located cost. `10_BENCH_METRIC_PROMPT.md` (<1 day) makes future perf probes unambiguous. Ship metric first so canvas validation is clean. |
| 2026-05-17 | Bench metric shipped (`f331a96`) | Per-commit median ms now visible in the React attribution table; canvas work's validation is unambiguous. |
| 2026-05-17 | Canvas GraphEditor shipped (`a9518c6` → `ad6b7a8`) | **User-visible graph-play lag resolved** with heavy (9000-key) seed: workerFps 22→43, mainFps 20→60 (vsync), longTasks 12→0, 1054ms→0 of main-thread blocking. As-written acceptance criterion (`Timeline:Graph` per-commit ms ≤1.5ms) NOT met — that metric measures React reconciliation, not canvas paint. Real fix lives in `workerFps`/`fpsP50`/longTasks. See `11_CANVAS_GRAPH_REPORT.md` "Surprises" §3 for why the metric framing was wrong. |
| 2026-05-17 | Polyline-cache stale-render fix shipped (`b667cfe`) | User testing immediately after canvas merge revealed bezier handles + tangent edits didn't update the curve. Root cause: 5 writers in `sequenceSlice` mutated keyframes in place, so the cache (keyed on keyframes-array ref) saw stale data. Audit §10 predicted 2/5 of these; logged corrections + lesson in `04_CORRECTIONS.md`. |
| 2026-05-17 | Dope-sheet probe + canvas implementation prompts drafted | `13_DOPESHEET_PROBE_PROMPT.md` (1 day) measures whether the dope-sheet load shape justifies a canvas rewrite. `14_CANVAS_DOPESHEET_PROMPT.md` (1-2 weeks) is held pending probe verdict. Probable: probe returns "strong case" — dope sheet has more cost layers than the graph editor (DOM mount/unmount + per-RAF imperative tick + React reconciliation + paint), and canvas collapses all four. |

## Implementation roadmap

**Revised after both probes (2026-05-17):**

The probes located the dominant user-visible cost precisely: `Timeline:Graph`'s per-redraw polyline + soft-selection resampling in `utils/GraphRenderer.drawGraph`. Neither the AnimationDocument refactor nor any narrow-subscription fix would touch this. The new front-of-queue work is the canvas GraphEditor implementation already sketched in [`02_RATIONALE.md`](./02_RATIONALE.md) §7 and [`03_SPEC.md`](./03_SPEC.md) §3.7.

| # | Scope | Est. | Source |
|---:|---|---:|---|
| 1 | Canvas GraphEditor: per-track polyline cache (back layer) + soft-selection mask cache (mid layer) + overlay layer (front); per-track version counter; replace `GraphRenderer.drawGraph` per-redraw path | 1-2w | `02_RATIONALE.md` §7, `03_SPEC.md` §3.7, this probe's recommendation #1 |
| 2 | Bench: add per-commit median ms derived column to React attribution table | <1d | `08_ENGINE_PROBE_FINDINGS.md` recommendation #3 |
| 3 | Canvas DopeSheet (if user lag remains after #1) | 1-2w | `02_RATIONALE.md` §7 |
| 4 | Re-measure lag picture after canvas work ships | 1d | post-canvas re-evaluation |

After #4, decide whether the AnimationDocument refactor (originally `03_SPEC.md` §10's full plan) is still justified — on hygiene/correctness grounds, since the perf grounds were retracted. The spec itself remains sound; what changes is the priority.

<details>
<summary>Deferred: original AnimationDocument-first phase plan (perf rationale retracted; preserved for reference)</summary>

| Phase | Scope | Est. | Spec ref |
|---:|---|---:|---|
| 0 | Type definitions + tests scaffolding | 2d | §10 step 1 |
| 1 | `AnimationDocument` body + tests | 5d | §10 step 2 |
| 2 | `AppHistory` body + tests (animation domain only) | 2d | §10 step 3 |
| 3 | `Player` body + tests | 2d | §10 step 4 |
| 4 | `AudioRuntime` body + tests | 3d | §10 step 5 |
| 5 | `ModulationRuntime` body + tests | 3d | §10 step 6 |
| 6 | `Engine` body + tests | 3d | §10 step 7 |
| 7 | `Recorder` body + tests | 4d | §10 step 8 |
| 8 | `TrackProvider` API + porting GMT/fluid-toy/fractal-toy providers | 4d | §10 step 9 |
| 9 | Bridge to existing Zustand slices | 5d | §10 step 10 |
| | **Foundation total** | ~33d (6-7 weeks at sustainable pace) | |

After Phase 9 the foundation is in place. Subsequent work (canvas DopeSheet, canvas GraphEditor, recording bake) is consumer-side and lands on top of stable APIs.

</details>

## Working protocol

One fresh Claude session per phase. Each phase:

1. **Pre-phase alignment.** Assistant drafts the next `PHASE_N_PROMPT.md`. User reviews scope and acceptance criteria before any code.
2. **Fresh session for implementation.** Assistant reads the prompt + spec + relevant prior reports. Executes the work. Pauses at explicit decision points for user input (don't accumulate them silently).
3. **Regression gate at end of phase.**
   - `npm run typecheck`
   - Existing test suites (`npm run test:shader`, `npm run test:frag`, `npm run test:render` as relevant)
   - Phase-specific tests added per `03_SPEC.md` §7
   - `bench-perf-timeline` against baseline shows no regression (or expected delta documented in report)
4. **Report + corrections.** Assistant writes `PHASE_N_REPORT.md`. User reviews. If the spec was amended during the phase, the change is logged in `04_CORRECTIONS.md` with date and rationale. Then merge.

## Trust boundaries

- **`03_SPEC.md` is source of truth.** When implementation diverges from spec, the spec is amended via `04_CORRECTIONS.md`, not silently reinterpreted.
- **Tests are non-negotiable.** A phase that ships without its required tests doesn't ship.
- **Patches > snapshots.** Every undoable mutation goes through a `Patch` op. Single-writer invariant (P6) enforced by lint + dev-mode assertion.
- **No code in `dev/store/animation/sequenceSlice.ts` writes** after Phase 9. The bridge phase ends with the slice as a read-only mirror, then it deletes.

## Cross-coordination with gmt-rs

The Rust port at `h:/GMT/workspace-gmt/gmt-rs/` is solving overlapping problems. Patterns flow both ways:

- **From gmt-rs to here:** `03_SPEC.md` already pulled in `auto_register` (P4), type-segregated dispatch (P3), free-functions-with-deps (P1). When gmt-rs ships a new phase that touches our scope, capture as an inbound entry in `04_CORRECTIONS.md`.
- **From here to gmt-rs:** the bridge pattern, the patch-coalescing model, the `HostAdapter` class shape, and the Recorder state machine are TS-first work that gmt-rs will face in its Phase 6 (timeline UI). Capture in a parallel doc on the gmt-rs side as we ship.

**No synchronous coupling.** Independent codebases, shared learnings via docs.

## Decision references quick-find

If you're touching code and need to know why a design choice was made, search `03_SPEC.md` for the relevant Q-number:

- **Q9 hybrid singletons** — class + default instance, both exported
- **Q2 branded `TimeSec`/`Frame`** — at module boundaries
- **Q6 hybrid `tick()` + `scrubAt(doc, time)`** — captured deps hot path; explicit doc for bake/tests
- **Q8 `HostAdapter` class** — provider extension point
- **Q7 whole-object patches + commit-time coalescing** — undo granularity
- **Q4 chunked bake + cancellable transaction** — recording bake UX
- **Q1 `setSequence` clears `AppHistory`** — load-scene is a hard break
- **Q5 folders are passive** — no folder-level animation
- **Q3 lazy cached derived properties** — `getTrackRange` etc. on Document

## Pre-flight before any session in this directory

- [ ] `git status` clean or known WIP
- [ ] On `main` (or the appropriate phase branch)
- [ ] `npm run typecheck` passes
- [ ] If working on a phase: read `03_SPEC.md` §3 for the module, §6 for invariants, §7 for tests, §8 for the resolved Q for that module
- [ ] If continuing a phase: read the previous phase's report

## Done criteria for the refactor as a whole

The refactor is "done" when:

- All ten phases shipped with passing tests and bench parity (or documented improvements).
- `dev/store/animation/sequenceSlice.ts` deleted.
- `dev/engine/animation/AnimationSystem.tsx` deleted (or reduced to a `// removed` marker).
- No production code calls `useAnimationStore.setState({ sequence: ... })` directly.
- `04_CORRECTIONS.md` reflects any deviations from `03_SPEC.md`.
- A `FINAL_REPORT.md` documents what shipped, what was deferred to v2, and what we'd do differently.
