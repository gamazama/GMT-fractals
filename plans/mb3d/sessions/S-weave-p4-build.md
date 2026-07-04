# Session prompt — Weave P4 build: native slots (P4.0–P4.3), then legacy absorption (P4.4+)

> **Fable delivery 2026-07-04 — P4.0–P4.2 DONE, session stopped at the P4.2 gate per the split below.**
> Commits: `d3879d2` (P4.0 assembleWeave seams) · `4183a78` (P4.1 nativeResolver + canary) · `ac837fa`
> (P4.2 DE policy). ADR-0089 has an update block per step. User visual verdict on the P4.1 identity-pair
> canary: **approved** ("looks good"); P4.2 GPU shots (mixed native+MB3D, AmazingBox-led pair) at
> `debug/scratch/native-weave/` via `debug/probe-native-weave.mts` (4-shot canary, real GPU, dev server
> on :3400). MB3D emit probe byte-identical across all three steps (baseline = pre-P4.0). Suite 125→156.
>
> **Handover to the P4.3 session (Opus):** native slots enter a weave as addon slots with
> `formulaIndex: NATIVE_FORMULA_INDEX` (−1) + `name` = registered formula id (`engine/weave/
> nativeResolver.ts`); `weaveSource.slots[].kind` already accepts `'native'` (ref = formula id) and
> `WeaveEditorPane`'s `SlotRow.kind` is widened. P4.3 = picker sources (native + frag/DEC) + reject-cap
> greying via `disabledIds` (`shape:self-contained`/`shape:modular` — the resolver enforces the same
> rejects engine-side, with ledger reasons). Frag/DEC imports resolve through the SAME native resolver
> (registered defs; writesDeriv detection handles position-only imports → est7). Known limitation to
> surface in UI copy if desired: a native slot's `shader.getDist` is not spliced (interlace-secondary
> semantics) — the estimator dropdown is the escape hatch. Gates to keep: probe byte-identity
> (`debug/probe-weave-refactor.mts` vs a fresh pre-change dump), `test:mb3d:weave` (156), typecheck,
> smoke:boot, and the native canary probe for any resolver/emit touch.

> **Opus delivery 2026-07-04 — P4.3 DONE (picker sources); exit gate PASSED (user confirmed "working").**
> The Weave Editor's "+ Add formula" picker (lightweight `CategoryPickerMenu`) now lists REGISTERED native
> + imported (frag/DEC) formulas alongside the MB3D catalog, greying resolver-rejects
> (`shape:self-contained` / `shape:modular`) with a hover reason (never hidden). New engine module
> `engine-gmt/engine/weave/nativeSlotCatalog.ts` (`getNativeSlotCatalog` + `nativeSlotShell` +
> `nativeSlotReject`, the pure mirror of the resolver's rejects). Picking a formula appends a native
> addon-slot shell (`formulaIndex: -1`, `name` = id) — the P4.0–P4.2 build path consumes it unchanged, so
> **no emit-path file was touched** (byte-identity holds without a re-probe). Native rows repurpose the
> per-row expansion to a note (auto-expose params; estimator dropdown is the escape hatch since a native
> `getDist` isn't spliced); the lane-budget meter dry-runs native rows through `resolveNativeSlot`.
> **Owner calls (this session):** (1) extend the existing lightweight picker now, adopt the full thumbnail
> `FormulaPicker` in the weave editor LATER (noted TODO in the pane + ADR); (2) v1 surfaces REGISTERED
> formulas only — the raw 438-thumbnail catalog is deferred (import via Workshop → appears under
> "Imported"), no silent auto-register. Suite 156→**162** (P4.3: shell-emits-native, reject-greying parity
> over all registered defs, catalog groups + self-contained greyed). Gates green: typecheck · weave 162 ·
> mb3d 24 · refine 56 · decompiler corpus · smoke:boot. **Exit gate PASSED:** user confirmed the picker +
> woven render work ("can confirm it is working"). ADR-0089 has the P4.3 update block. Did NOT push. **Next:** P4.4+
> (interlace/Hybrid Box absorption — gated on owner Appendix decisions 1–3) per the split below.
>
> **Re-sequencing (owner, 2026-07-04): the slot-BANKS session (`S-weave-p4-banks.md`, per
> `weave-slot-fidelity-plan.md` §A4-decisions) runs BEFORE P4.4/P4.5** — absorption then maps interlace onto
> a bank and deletes the `uInterlace*` uniform set (one migration instead of two). P4.4+ sessions: do not
> start until the banks delivery note appears here.

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
