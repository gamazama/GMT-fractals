# Session prompt — Weave P4 research: struct-state framework + legacy absorption design

**Prepared:** 2026-07-04 · **Branch:** `feat/weave-core` · **READ-ONLY session** — the only file you create/commit is
the deliverable design doc `plans/mb3d/weave-p4-struct-state-design.md`. No source edits. Safe to run in parallel
with the P3b build session.

**Context:** the weave unification (ADR-0089; session doc `plans/mb3d/sessions/S-nformula-weave-unification.md` — read
both in full). P4's goal: **native + frag/DEC formulas as weave slots** (the 500+ ingredient pool), panel promotion,
and absorbing the interlace + Hybrid Box UIs into the weaver with a save-migration layer. The blocker is per-iteration
state: MB3D slots thread flat `inout float` scratch through dispatcher functions (`engine/weave/emitWeave.ts`), but
NATIVE formulas declare loop-carried state as `loopInit` locals at map()-function scope (+ mutable preamble globals),
which can't cross a dispatcher-function boundary. Interlace dodges this by splicing the secondary's body INLINE
(`engine/weave/nativeSlot.ts` — read its header). P4 needs the real framework.

## Deliverable: `plans/mb3d/weave-p4-struct-state-design.md` with

1. **State inventory** — for ALL registered formulas (formulas/index.ts registers ~48; also sample V3/V4 frag imports):
   what loop-carried state exists? Categorize: loopInit locals referenced in loopBody (name, GLSL type — float/vec/mat3),
   mutable preamble globals (`shader.preambleVars`), shared-rotation state (`usesSharedRotation` → gmt_rot*), extra
   loopBody args (Phoenix/Bristorbrot trailing args). Produce the actual table (grep + read; `npm run context:cost`
   can scope). This decides whether flat-float threading generalizes or a struct/interface block is required.
2. **Framework options, compared** — at least: (a) generalize `assembleWeave` scratch to typed inout params
   (float/vec3/mat3); (b) a per-slot state struct (`WeaveSlotState_N`) declared at function scope, passed inout;
   (c) keep inline-splice and generalize it to N slots (what breaks?); (d) hybrid: dispatcher for stateless slots,
   inline for stateful. Weigh: GLSL cost, identity-pair safety, animation/undo neutrality, how frag/DEC imports fit,
   and what the P3 weaver UI needs. Recommend ONE with a migration path.
3. **Interlace + Hybrid Box absorption plan** — what the weaver must express to replace their UIs (2-slot modulo
   weave w/ enable toggle; Hybrid Box = fold slot + cap + swap-offset + fast pre-loop path which is NOT weaving),
   and the **save-migration layer**: old `interlace*`/`hybrid*` feature state in saved scenes/presets → weave-native
   state (a superset — user requirement 2026-07-04). Enumerate every persisted field and its target; define the
   round-trip gate (old scene loads pixel-equivalent).
4. **Animation-transfer tool sketch** — on slot reorder, keyframed tracks targeting packed lanes retarget; design the
   prompt-to-transfer flow (user decision: warn now, tool later). Where do track targets live; what mapping data the
   editor must retain across rebuilds to remap them.
5. **Panel promotion checklist** — what `WeaveEditorPane` needs to mount as a dockable panel (panel manifest entry,
   Layer/z rules per ADR-0082, state ownership, compile-progress interaction).

Method: source-first (CLAUDE.md navigation policy). Key files: `engine/weave/*`, `features/interlace/*`,
`features/geometry/index.ts` (Hybrid Box), `features/core_math.ts` (loopInit/loopBody splice), `shaders/chunks/de.ts`
(map() structure), `components/WeaveEditor/*`, `utils/FormulaFormat.ts` + `utils/SceneFormat.ts` (persistence).
Cite file:line for every load-bearing claim. End with a staged P4 execution plan (revertible steps + gates).
