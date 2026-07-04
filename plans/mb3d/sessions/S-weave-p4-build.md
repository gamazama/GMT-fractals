# Session prompt — Weave P4 build: native slots (P4.0–P4.3), then legacy absorption (P4.4+)

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
