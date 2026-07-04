# Session prompt — Weave P4 build: native slots (P4.0–P4.3), then legacy absorption (P4.4+)

> **Session split (orchestrator, 2026-07-04, budget plan):** the FABLE session runs **P4.0–P4.2 only**, then stops
> at the P4.2 gate with a handover note. Follow-up steps run as SEPARATE smaller sessions (Opus 4.8): P4.3 (picker
> sources); P4.4+P4.5 (absorption + migration — high effort; promote back to Fable if budget allows, it's the
> one-way door on user data); P4.6 and P4.7 (independent of P4.3–P4.5, default effort, may run in parallel).
> Each follow-up session reads THIS file + its design-doc section only; the probes/suites/GPU certs are the safety
> net, and the orchestrator session reviews each delivery with a blast-radius diff.

**Prepared:** 2026-07-04 · **Branch:** `feat/weave-core` (continue; do NOT push — v1 + weave ship together).
**Precondition:** the P3b session has landed and been reviewed. If `git log` shows unreviewed P3b commits, stop and ask.

**The design authority is `plans/mb3d/weave-p4-struct-state-design.md`** (reviewed + spot-check-verified 2026-07-04):
follow its §2.1 recommended design — native slots become dispatcher functions whose state channel is
**namespace-prefixed globals** (per-slot `createNativeSlotRewriter` bindings, `slot0_`/`slot1_`…), per-slot loopInit
hoisted into the weave loopInit, rotation swap via a new `preCall` on `ResolvedWeaveSlot`; MB3D slots keep their shared
`inout float` scratch. Execute its §6 staged plan **P4.0 → P4.3 in order**, one commit per step, each step's gate as
listed there plus the standing gates.

Also read first: `plans/mb3d/sessions/S-nformula-weave-unification.md` (design decisions),
`docs/adr/0089-weave-core-unification.md`, and `plans/mb3d/sessions/S-weave-p3b.md` §"Non-negotiable discipline"
(probes, gates, GPU-cert commands, gotchas — they all apply verbatim here).

Hard rules beyond the doc:
- **P4.0's byte-identity probe is the keystone**: capture `debug/probe-weave-refactor.mts` baseline BEFORE touching
  `assembleWeave`; with no native slots present the emission must stay byte-for-byte identical. Same discipline for
  any `emitFusedHybrid` touch (the P3b Rhythm opts path must also stay byte-identical when absent — re-run its probe).
- **P4.1's canary** (native identity-pair, formula A woven with itself) needs the GPU + the user's visual verdict —
  pause for it before proceeding to P4.2.
- Interlace + Hybrid Box remain UNTOUCHED in P4.0–P4.3 (their fold is P4.4/P4.5, gated on the owner confirming the
  design doc's Appendix decisions 1–3). If you reach P4.4 and the decisions aren't recorded in the session doc, stop
  and ask the orchestrator session.
- Native-slot capability gating in the weaver picker: reuse the interlace reject set (`shape:self-contained`,
  `shape:modular`) via `disabledIds` — greyed with a reason, never hidden.
- Update ADR-0089 with an update block per landed step; keep the weave test suite growing with each capability
  (native slot emit, identity pair, mixed native+MB3D, frag slot).
- **Layered-rhythm reconciliation (P3b postdates the design doc):** the doc's §3.2/§3.3 absorption mapping was
  written against the BINARY modulo schedule; P3b shipped `emitLayeredModuloGLSL` (N layers, first-beat-wins — the
  same precedence rule as `skipMainFormula`) with `weaveSource.schedule = {kind:'modulo', layers:[…]}` and live
  values on the DDFS `weave` feature. P4.4/P4.5 absorption converts interlace/Hybrid Box onto LAYERS (interlace =
  base + 1 layer, no beats; Hybrid Box interleaved = base + 1 layer with beats + start offset). The binary
  `emitModuloScheduleGLSL` stays for the legacy features until their fold, then becomes their layer binding. The
  doc's open decision 1 (`ModuloSchedule.active`) must be re-posed for the layered shape (master enable vs
  per-layer enable) — resolved by the owner before P4.4.
