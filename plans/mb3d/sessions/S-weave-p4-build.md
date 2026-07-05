# Session prompt — Weave P4 build: native slots (P4.0–P4.3), then legacy absorption (P4.4+)

> **P4.7 delivery 2026-07-05 (Opus, `S-weave-p4-7-consolidation.md`) — consolidation + Seq↔Rhythm conversion
> DONE; import-modal dissolution (item 5) and NewSceneModal bridge drop (item 6) NOT done. NOT pushed.**
>
> **Editor → Formula-panel Weave section (items 1–3):** the editor moved into the Formula panel as a
> collapsible Weave section (`eb22445`, layout `3e39397`); Hybrid Box became a preset group (`329eae7`);
> the section auto-opens when the loaded formula is a weave (`b8c300e`) and MIRRORS the currently loaded
> formula (`616264e`). UX polish this session: Add/Restore-current/Clear moved into a slim footer card joined
> under the rows, Hybrid Box ▾ alone right-aligned, pre-Build rhythm fields got − + steppers, estimator hint
> now points "below" (`f3c1b1a`). CategoryPickerMenu single-column + click-to-pin + flip fixes (`371a046`,
> `6c8ff18`).
>
> **Fast path retired (item 4):** the Hybrid Box pre-loop fold engine physically deleted (`b529329`,
> ADR-0091 update block `b01600d`); load-migration routes a legacy fast-path scene to a COUNTS intro slot
> (`a3fbc16` → `3f616c0` — intro not modulo layer, the accepted non-pixel-exact look change). analytic-DE
> precedence + power-slot fix (`ddcfb0f`); loop dividers as schedule structure (`c7a86f5`); sequence "stop at"
> + rhythm compact/live controls (`7b32b29`).
>
> **Build/Rebuild look-preservation:** Build keeps slot param values (`50201a1`); Rebuild preserves the scene
> look and refreshes ONLY the DE estimator routing (owner call — `60c68d9`); slot params follow the formula
> across a reorder (`fed9005`); ADR-0090 notes `e560399`, `bc0a827`.
>
> **Sequence ↔ Rhythm LUT-preserving conversion (`engine-gmt/engine/weave/convert.ts`, spec
> `plans/mb3d/weave-seq-rhythm-conversion.md`):** the mode toggle now converts the current LUT EXACTLY or
> refuses with a one-line reason — a FIT (Seq→Rhythm) and SIMULATE-AND-COMPRESS (Rhythm→Seq), exactness
> proven by an equality certificate over `max(intros)+lcm(cycles)` iterations (`374b4d1`). The base is EXPLICIT
> by tail-dominance election (the row owning most of the repeating cycle), threaded as `weaveSource.schedule.
> baseRow` through `emitFusedHybrid` — absent baseRow stays byte-identical to baseRow=0 (`cdbbd04`, spec §7).
> Rhythm param model: Start/Interval/Beats order, live sliders full-bleed 0–8 (`af66de6`, `7f1d6e7`); Rhythm
> selectable from a single active slot; Hybrid Box preset enters at rhythm start 0 pushing others +1 (`411e317`,
> `30c6fdd`); Sequence-mode Hybrid Box lands in the FIRST slot with a loop divider after it (`7201796`).
> **Fresh rhythm-layer defaults fixed at the SOURCE** — the `weave` feature's per-index param defaults are now
> start=k / interval=1 / beats=2 (was 2/0/0; `2245034`) so a never-set layer reads sensibly without per-path writes.
>
> **Gates:** typecheck green every commit; `test:mb3d:weave` grown to **281**; MB3D emit byte-identity held
> (defaults are runtime uniforms, never baked). convert.ts JSDoc de-staled (elected base).
>
> **P4.7 items 5 + 6 DONE 2026-07-06 (`4c96ca4`, `f8bcfe1`):**
> - **Item 5 — MB3D import modal dissolved.** The modal's Weave-Editor tab is retired (the editor lives in the
>   Formula-panel Weave section); what's left is import-only, promoted to a GLOBAL dialog via a store flag
>   (`importMb3dOpen` + `openImportMb3d`/`closeImportMb3d`, mirrors newScene; both `types/store.ts` copies +
>   uiSlice). `ImportMandelbulb3DModalHost` mounts once at app root (AppGmt). Reachable from the File menu
>   ("Import Mandelbulb3D…") AND the FormulaPicker footer; the FormulaSelect hamburger routes to the same store
>   action (local `mb3dOpen` state + in-place mount removed). No external `initialTab` callers remained to repoint.
> - **Item 6 — New Scene authors a weave directly (bridge dropped).** Extracted `buildWeaveDef` from
>   `loadUserWeave` (build+register half, no rebuild-preserve load). `NewSceneModal.authorWeaveDef`: fold ⇒ a
>   COUNTS weave (fold intro + primary/secondary loop), interleave-only ⇒ a MODULO weave (primary base +
>   secondary rhythm layer); the built weave's id + defaultPreset become the target base, shading/lights/clean-
>   slate merge on top. Create + dice both use it. Scene-base composites (gallery scene + a layer) KEEP the
>   legacy shape and ride the still-present migration (a fresh weave would drop the scene's own params — rare,
>   documented in-code). Gates: typecheck; weave 281/0; boot clean; `debug/probe-newscene-weave.mts` 6/0.
>
> **Remaining before v1+weave push:** **P4.6** (animation transfer) — then push v1 + weave together.

> **Fable delivery 2026-07-04 — P4.4+P4.5 DONE (legacy absorption + one-way load migration; ADR-0091).**
> Commits: `96719a7` weaveEnabled master gate (opt-in via emitFusedHybrid opts; low-profile editor checkbox) ·
> `02248c3` P4.4 interlace load-migration + LEAD-slot getDist splice · `37b365e` re-save round-trip test ·
> `3c4c2b6` interlace feature RETIRED (uInterlace* deleted; mesh path reworked + verified; sweep repointed →
> `native-weave-sweep.mts`; "Edit weave…" affordance replaces the panel section) · `9bd8428` P4.5 Hybrid Box
> interleave absorbed (9 BoxFold formulas generated from FOLD_LIST; interleaved emission + hybridComplex/Skip/Swap
> retired; fast path untouched). **NOT pushed.**
>
> **The load-bearing gate came back exact: every migrated legacy scene renders PIXEL-IDENTICAL (0/691200
> differing subpixels, real GPU) to its pre-migration reference** — interlace on Mandelbulb, on two
> custom-getDist hosts (KleinianMobius, Apollonian — the getDist splice is what makes these exact), the
> disabled-but-configured case (→ `weaveEnabled:false`, renders base-only), Hybrid Box interleaved, and the
> fast-path control. References + loadable legacy scene files + probe: `debug/scratch/p44/` +
> `debug/probe-legacy-migration.mts [--migrated]` (synthesized presets — owner chose fallback over real files).
> Migration hook = app-gmt preset migration v3 (runs inside loadPreset on EVERY load path; mesh-export hooks the
> same fn). Combined interlace+hybrid scenes: fold layer first (legacy precedence); disagreeing enables migrate
> only the ENABLED system (owner policy). `hybridPermute` not carried (warned). Re-saved migrated scenes
> round-trip through the NEW format; re-migration is a no-op.
>
> **Owner calls this session:** (1) enable-gate design as recommended (both schedule kinds, editor always opts
> in); (2) lead-slot getDist splice approved after classifying all 18 custom getDist bodies (all weavable ones
> spliceable with the existing rewriter; none structurally incompatible); (3) full retirement scope incl.
> mesh-path deletion after verification; (4) BoxFold-as-formulas + agree-policy, noting "a few boxFold
> formulas" exist (→ one def per fold type) and that Hybrid Box could later be a PRESET GROUP in the
> consolidated weave UI (backlog).
>
> **Found + fixed en route:** the fused def now UNIONS `estimator:cutting-plane` from native slots — the
> repointed sweep caught 12/45 'cp_dmin: undeclared identifier' failures (the retired pairHasCapability leg's
> job); sweep now 45/45. Suite 189→**243**; typecheck/mb3d 24/refine 56/decompiler/boot green; MB3D emit probe
> byte-identical at every step. NewSceneModal still authors legacy-shaped interlace state on purpose (the v3
> migration converts it — one bridge). **Next: P4.6** (animation transfer — banks give stable per-slot targets,
> reorder = bank-index rename) **and P4.7** (panel promotion), as separate sessions per the split below.

> **BANKS delivery 2026-07-04 (Opus, `S-weave-p4-banks.md` / ADR-0090) — DONE + user-approved. Exit gate PASSED.**
> Per-slot param BANKS landed on `feat/weave-core` (commits `19a86db` bank decl · `c44cea6` resolver/emit · `9759e4a`
> panel+meter · `578073c` ADR · `b5fdcef` divider fix · `7ec8f9e` modulation+randomize · `0d7da9e` "Formula N:" naming ·
> `daa0557` MB3D/native unification). **NOT pushed** (v1 + weave ship together). Step-1 owner call: **banks-for-all-6**
> (native `uWs<k>*` and coreMath `uParam*` physically disjoint — zero reservation). A native formula woven as slot k binds
> its declared params VERBATIM onto its own bank (no vec decomposition; identity pairs on distinct banks), state on the DDFS
> `weave` feature (keyframes/undo/preset+GMF by construction), fidelity default with the dense pool surviving only for MB3D
> slots. Phoenix⊗Phoenix — which overflow-baked before — now exposes all 18 params live; GPU-certed coherent
> (identity/bulb⊗box/mixed/Phoenix). MB3D emit **shader byte-identical** throughout (probe diffs are group-label METADATA
> only — 354 lines, 0 GLSL). Suite 170→**189**; typecheck/mb3d 24/refine 56/decompiler/boot green.
>
> **Exit-gate follow-ups (user, in the same session):** (1) same-name slot dividers merged in the Formula panel — fixed by
> slot-numbering the group ("Formula 1: Phoenix" / "Formula 2: Phoenix"). (2) modulation-target picker + Randomize now route
> bank params to the `weave` feature; ONE group-keyed path gives every woven slot (native AND MB3D) a per-formula modulation
> category at the top of the list, hiding the empty standalone coreMath category. (3) unified MB3D-import and editor-built
> weaves onto the SAME group naming (the "different code path" the user flagged was two group-naming branches — collapsed).
>
> **coreMath-vs-banks (user-raised, recorded for future sessions):** coreMath is NOT redundant — it's the standalone-formula
> param home + the MB3D dense-pack pool + kernel state (iterations/4D seeds/uModularParams); banks are a per-slot vocabulary
> for WOVEN native slots. Collapsing coreMath into banks = "every scene is a 1-slot weave" (the ADR-0089 endgame): a large
> refactor with one-way save migration, and coreMath still survives for kernel state + MB3D dense-pack. Keep both for v1;
> it's a separate future initiative + ADR, not a banks cleanup. **Next: P4.4/P4.5** (interlace/Hybrid Box absorption onto
> banks — deletes `uInterlace*`), still owner-gated on the Appendix decisions.


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
