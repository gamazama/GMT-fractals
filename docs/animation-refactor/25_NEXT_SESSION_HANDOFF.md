# Next-session handoff (2026-05-18)

This is the opening prompt for the next orchestration session. The prior session ran out of context at the point where the pre-push work was complete and the push itself is the next concrete action.

## Single-line state

**Push-ready.** `dev` is 44 commits ahead of `github/dev`. Working tree clean. `npm run typecheck` green. The canvas refactor track + audio fps-sync + modulation off-switches are all shipped and merged to `dev`.

## Read first (in this order)

1. **[`00_INDEX.md`](./00_INDEX.md)** — living roadmap. Outcomes log captures every decision and shipping moment. Your one-stop briefing.
2. **[`24_MODULATION_OFF_SWITCH_REPORT.md`](./24_MODULATION_OFF_SWITCH_REPORT.md)** — most recent shipping report. The 2×2 test matrix at §"Test matrix" is the ship-quality gate; that's the last thing that landed.
3. **Skim the doc table in `00_INDEX.md`** — every shipped piece has a report doc; deferred / queued work is flagged. Don't read every report; the index summarises them.

## Immediate next move

**Push.** No further work before `git push origin dev`. Hold smoke for a quick manual pass first (the off-switch toggles + the existing canvas interactions), but the bar is "nothing visibly broken," not "comprehensive regression suite" — the bench is at vsync across every dope-* and graph-* scenario at the heavy seed, and the off-switch matrix was tested live.

```bash
git -C h:/GMT/workspace-gmt/dev push origin dev
```

After push lands, the dev branch is current on origin and the entire refactor track is preserved + reproducible from clone.

## What comes next (post-push, in order)

Per `00_INDEX.md` "Current state":

1. **`19_OFFLINE_MODULATION_BAKE_PROMPT.md`** — reserved slot. Offline modulation bake is the deferred "every frame of modulation" feature from `02_RATIONALE.md` §9. Architecture sketched in `03_SPEC.md` §3.6 (Recorder.bakeModulation). Estimated 3-5 days standalone. Unblocks the audio feature pass below.
2. **Audio feature pass** — sync-across-timeline, waveform render quality, audio cuts/trim, modulation-recording fidelity, audio export rendering. User confirmed sequence: must come after `19` ships because the bake's audio decode + FFT pipeline becomes the shared foundation these features hang off.

Both items need their own draft prompt before execution. Pattern reference: `09_CANVAS_GRAPH_PROMPT.md` for implementation prompts; `07_ENGINE_PROBE_PROMPT.md` for diagnostic spikes.

## Working protocol (carry-over from this session)

One fresh Claude session per phase. Each phase:

1. **Pre-phase alignment** — assistant drafts the next `PROMPT.md`, user reviews scope before any code.
2. **Fresh session for implementation** — assistant reads the prompt + spec + relevant prior reports, executes, pauses at explicit decision points.
3. **Regression gate** — `npm run typecheck`, `npm run test:shader`, `bench-perf-timeline --seed=heavy` shows parity (or expected delta documented).
4. **Report + corrections** — assistant writes `REPORT.md`. User reviews. Spec amendments logged in `04_CORRECTIONS.md`. Then merge.

## Trust boundaries (don't violate)

- **`03_SPEC.md` is source of truth.** When implementation diverges from spec, amend the spec via `04_CORRECTIONS.md`, don't silently reinterpret.
- **Tests are non-negotiable.** A phase that ships without its required tests doesn't ship.
- **"Future-proof working engine" framing applies per phase.** Slower-and-right beats faster-and-brittle.
- **Empirical discipline.** Three diagnostic probes (`06_`, `08_`, `15_`) invalidated their hypotheses; the lesson is to measure before committing. If a new piece of work asserts where a cost lives, the first move is a probe, not an implementation.

## Architectural debt still on the table (not blocking push)

From `04_CORRECTIONS.md` + `01_AUDIT.md` §10:

- **In-place keyframe mutation grep** — 5 writers fixed; the pattern `track.keyframes[` / `track.keyframes =` should be a review-checklist item for any new mutator.
- **"For selected of N: keys.find()" antipattern** — bitten twice; codified as a footgun.
- **Recording lifecycle coordination** — three uncoordinated booleans remain; Recorder state machine designed in `03_SPEC.md §3.6`, unimplemented. Will land if/when `19` (offline bake) is built, since they share the lifecycle surface.
- **HiDPI / DPR rendering across both canvas editors** — diamonds blurry on Retina. Mechanical fix. Coupled across `GraphCanvas` + `DopeSheetCanvas` + soft-mask cache.
- **`AnimationSystem.tick` instrumentation** — only remaining unknown in the bench picture. If a future heavy-seed scenario shows main-thread blocking the canvas work didn't address, look there first.
- **Re-bench app-gmt** — the 2× tick-rate bug (`22_AUDIO_TIMELINE_SYNC_REPORT.md` Bug 4) invalidates every app-gmt animation/perf bench taken before commit `0814749`. Anything in `project_appgmt_perf_bench.md` or `project_animation_refactor_spike.md` needs re-running post-fix.

## Goals from `02_RATIONALE.md` still unmet (no longer urgent)

- Data layer still Zustand-owned (`AnimationDocument` designed, not built).
- Modulation live/export pipeline duplication still present (`exportModulations.ts` orphan + duplicated LFO/rule eval).
- Type unification at track boundaries not done.
- Boot order implicit, not type-enforced.

Perf case for these was retracted by the canvas wins; hygiene case stands. Revisit if a user reports lag in a place the canvas work didn't touch, or if the orphan duplication actively bites during the audio feature pass.

## How to open the new session

Paste any of these into a fresh Claude:

**Minimal (push first):**
> *"Read `dev/docs/animation-refactor/25_NEXT_SESSION_HANDOFF.md` and execute the immediate next move."*

**With a phase to start after the push:**
> *"Read `dev/docs/animation-refactor/25_NEXT_SESSION_HANDOFF.md`. Push first, then draft `19_OFFLINE_MODULATION_BAKE_PROMPT.md` per the architecture in `03_SPEC.md` §3.6 and `02_RATIONALE.md` §9."*

**For continued canvas-pattern work (e.g. HiDPI):**
> *"Read `dev/docs/animation-refactor/25_NEXT_SESSION_HANDOFF.md` then `11_CANVAS_GRAPH_REPORT.md` + `16_CANVAS_DOPESHEET_REPORT.md`. Draft a HiDPI/DPR pass prompt that touches both canvas editors and the soft-mask cache."*

## What this session accomplished (for posterity)

This session — the orchestration session that started with "let's research [the audio+timeline+modulation phase] thoroughly, first the docs, then the code, then possibly online if we have any questions" — produced:

- The full `dev/docs/animation-refactor/` documentation set (24 docs).
- The architectural diagnosis + design (`01_AUDIT.md`, `02_RATIONALE.md`, `03_SPEC.md`).
- The Q-walkthrough that resolved 9 open architectural questions.
- Two diagnostic probes that invalidated the original perf diagnosis (saving ~13-17 weeks of misdirected refactor effort).
- Three canvas implementations + cleanup + audio sync + modulation off-switches.
- The "future-proof working engine" framing.
- The working protocol (one fresh session per phase, prompt → report → corrections).

The user-felt animation lag that motivated the whole exercise is resolved. The codebase is push-ready. The architectural foundation for future work is documented even if the AnimationDocument refactor itself is deferred.

Hand off cleanly.
