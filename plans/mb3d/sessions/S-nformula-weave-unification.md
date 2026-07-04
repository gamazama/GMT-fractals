# Session prompt — N-formula weave unification + the user-facing weaver

**Prepared:** 2026-07-03 · **Branch base:** `main` @ `70eaf51` (MB3D importer **v1**, merged locally, **NOT pushed** —
we push v1 + the weave UI together once this initiative ships). Work on a fresh branch off `main`.

**This is a collaborative, interactive design+build session — it needs the user's insights to get right.** Do NOT
autonomously lock the core contract; confirm the `WeaveSpec` shape and each phase's design *with the user* before
implementing, especially P1 (the contract) and P4 (per-iteration struct state).

## Where we are (established by research + a v1 code review, 2026-07-03)

GMT has **two parallel implementations of "schedule N formulas across the iteration loop"** plus a coupled param
layer — the fork the engine's own rules forbid ("genericize, don't fork"; "one source of truth"):
- **Interlace** (`engine-gmt/features/interlace/`) — 2 formulas, alternation-by-modulo (`interval`/`startIter`, no
  weight blend), inline GLSL rewrite, dynamic picker. *Production.* (`index.ts:17-43` state; `glslRewriter.ts:296-357`
  schedule; `InterlaceSecondaryPicker.tsx` UI. Structurally 2-only: hardcoded `uParamA→uInterlaceParamA`,
  `formula_X→formula_Interlace`.)
- **MB3D weave** (`engine-gmt/utils/mb3d/weaveSequencer.ts` + `emitFusedHybrid.ts`) — N fixed slots, precomputed
  `const int[]` order LUT, **bakes literals for multi-slot** (`constPacker.ts`), mode-0 only (ADR-0083).
- **Param-surfacing** lives only in the Formula Workshop (`FormulaWorkshop.tsx:299-441` ParamTable + `:57-123`
  SlotPicker + `workshop/param-builder.ts`), single-formula-coupled.

The **v1 code review** independently confirmed the debt (it's the unification's backlog, correctly deferred from v1):
- `uniformSlots.ts` `ScalarParamPacker` **duplicates** the Workshop's `buildFractalParams` component-packing (JSDoc
  admits it "mirrors" it) → **one packer**.
- `param-builder.ts:15` re-declares `SCALAR_SLOTS/VEC2/3/4` that `uniformSlots.ts` owns → **re-export** (trivial).
- `ShaderBuilder` threads **3 parallel compile-gate booleans** (`enableRefine`/`numericDE`/`mb3dFaithful`)
  positionally through `getTraceGLSL`/`DE_MASTER` (8→10 args) → **one kernel-feature seam**.
- `core_math.ts` estimator dispatch is a **fragile float-threshold chain** (dIFS must precede the `>4.5` check) →
  **estimator registry**.
- `FormulaParamsWidget.tsx:25` hardcodes the vec4→vec3 `w:0` contract a second time → **slot-metadata-driven widget**.

`docs/24 §8` + `docs/research/hybrid-formula-architecture-comparison.md` already sketch the target (`hybridSequence:
Array<{formulaId, params, iterations}>`, the Mandelbulber `seq[i]→formula_idx` model) and flag it as the primary
feature investment.

## The core insight

**GMT already compiles weaves** (importer: `parseMB3D → weaveSequencer → emitFusedHybrid → fused def`). A user weaver
= a UI that **authors the same weave-spec** + runs the same pipeline. So unify onto one engine-level weave core; the
importer, interlace, and the new weaver become thin front-ends.

## The unified architecture (confirm with the user, then build)

- **`WeaveSpec`** — the single contract: ordered slots `{ source: native|intern|decompiled, ref, iterWindow (count
  *or* start/stop), params, scratch }` + loop points + mode. Everything produces it (importer, interlace, weaver).
- **One scheduler** — generalize `buildWeaveSequence` to cover iteration *counts* (MB3D) and *interval/start* windows
  (interlace).
- **One emitter** — `emitFusedHybrid` takes `WeaveSpec`, supports **native** slots, uses **one parametric packing
  path** (cross-slot `LaneAllocator` — 24 scalar lanes + 6 vec3 units, never stressed) instead of all-or-nothing bake,
  and a **generic kernel-feature seam** (retiring the 3 parallel booleans).
- **One param primitive** — extract `ParamTable`/`SlotPicker`/`param-builder` into a reusable `ParamMapper`
  (multi-owner slot occupancy), consumed by the Workshop **and** the weaver.
- The core is an **engine primitive** (`engine-gmt`); MB3D-specific parse/decompile/slotTranspiler stay *consumers*.

## Load-bearing engine facts (from the substrate reader — verify before coding)

- **Weave *structure* edits recompile, unavoidably** (slot order / iter count / add-remove-reorder bake into the
  `const int[]` LUT + dispatcher). So the weaver is **edit → rebuild → preview** (fits the compile-progress UI + the
  modal). *Param-value* edits can be live uniforms **only** once multi-slot is parametric (P1's packing fix).
- **Per-iteration state is flat named floats** (`mb3dVary`/`mb3dRout`/`mb3dDr1`/`mb3dIter`), threaded `inout`; there's
  **no struct framework**. "Per-iteration struct state" (the user's flagged prerequisite for user-authored/native
  weaves) is a real P4 gap — machinery exists (`inout` params, loopInit/loopBody in `core_math.ts`), the abstraction
  doesn't.
- **Mode 0 (ALTERNATE ordering) only** (ADR-0083); modes 1-3 (interpolate/CSG/KIFS) change DE semantics — out of MVP.

## Constraints (already decided with the user — do not relitigate)

1. **Generalize the Workshop's uniform→slider param-surfacing into a shared primitive** — extract, don't fork; upgrade
   it to multi-formula/multi-slot. (User's explicit ask.)
2. **The weaver lives in the Import MB3D modal first**, promoted to a dockable panel later — so keep components +
   `WeaveSpec` **host-agnostic** (promotion = re-mount, not rewrite); weaver state must not entangle with modal lifecycle.
3. **MVP = mode-0 ordered stacking** (run formula A for n iters, then B for m, loop) over the **MB3D formula library**
   (intern + decompiled — pipeline-ready). Native-formula slots + blending come later.
4. **Edit → rebuild → preview** is acceptable UX for the MVP (live param sliders arrive with P1's parametric packing).

## Staged, cert-gated plan (design each phase with the user first)

| Phase | Tag | What | Gate |
|---|---|---|---|
| **P0** | `[engine][ui]` | Unify the two param packers into one; re-export the slot constants; extract `ParamMapper` (multi-owner). Workshop unchanged. | typecheck; Workshop still works |
| **P1** | `[engine]` | `WeaveSpec` + generalized scheduler + generalized emitter (native slots, one parametric packing, kernel-feature seam). Migrate the **importer** to it. **Riskiest — do first, revertible.** | **GPU re-cert all 38 scenes (ADR-0087)**; corpus 333/0; weave/refine tests |
| **P2** | `[engine][ui]` | Fold **interlace** into the core (2-slot WeaveSpec). Land the core on `main`. | GPU re-verify interlace scenes; native-canary byte-identical |
| **P3** | `[importer][ui]` | The **weaver in the MB3D modal**: slot-list editor (FormulaPicker + `ParamMapper` + hand-rolled reorder), author WeaveSpec → compile → preview, persist `weaveSource` (ADR-0058). | user visual verdict on woven scenes |
| **P4** | `[engine][ui]` | Per-iteration **struct-state framework** + native-formula slots + **promote** the weaver to a dockable panel. | GPU cert; native weaves render |

Then **push v1 + the weave UI together** → deploy.

## Rules

- **GPU-cert every weave/emit/DE change** (ADR-0087 blind spot: identical const seeding → wrong-but-consistent decode
  reads 0-mismatch yet renders wrong). Real ANGLE/D3D11 (`cert-render.mts`), never headless SwiftShader. The visual
  verdict is the user's.
- **Don't destabilize the merged v1 importer** — build the core alongside, migrate behind a revertible seam, re-cert
  before proceeding. The importer just reached 333/0 · 38 scenes.
- **Genericize, don't fork; extract, don't copy** — the param primitive and the weave core are *shared* by design.
- Gates for every commit: `typecheck`, `test:mb3d` (24), `test:mb3d:weave` (58), `test:refine`, `check:mb3d-decompiler`
  (corpus 333/0), + GPU `cert-render.mts` for any weave/emit/DE change.

---

## Amendments (2026-07-03 — anchors verified against source, design confirmed with the user)

**Corrections to the research above:**
- "Bakes literals for multi-slot" is the **fallback, not the rule** — `emitFusedHybrid.ts:107-120` already tries a
  cross-slot parametric path (shared `LaneAllocator`) and bakes only on bind-failure, pool overflow, or 4D
  (paramA/B reserved for kernel w-seeds). P1 packing work = kill the duplicate packer, per-slot fallback instead of
  all-or-nothing, decide the 4D reservation.
- The 3 booleans are split, not co-located: `enableRefine`+`mb3dFaithful` = `getTraceGLSL` args 9-10;
  `numericDE` = `DE_MASTER` arg **14 of 14** positional args. A generic `addDefine()` seam already exists (~24 defines)
  but the booleans are deliberately TS-level gates (byte-identical-when-off, ADR-0084/0088) — so the seam is an
  **options object**, not #defines.
- Slot constants are re-declared in **4** places (uniformSlots owner + param-builder + v3/generate/slots + v4/emit/slots).
- Occupancy machinery (`buildOccupancyMap`/`getSlotOccupancy`/`isSlotConflict`) already lives in `uniformSlots.ts` —
  ParamMapper extraction is mostly a UI lift.

**New facts:**
- **Interlace's schedule is runtime + keyframable** (`uInterlaceInterval`/`uInterlaceStartIter` are live DDFS uniforms).
  Normalizing onto the baked LUT would kill live editing *and animation* → WeaveSpec keeps two schedule kinds.
- **Hybrid Box (geometry feature) is a third scheduling system** — interleaved mode is an interlace twin
  (modulo + start offset + invocation cap, `geometry/index.ts:491-505`); pre-loop fast path is a prep pass (stays put).
  **Latent bug:** Hybrid Box + interlace both write `skipMainFormula` with no arbitration — unification fixes it.
- **Mesh export** (`SDFShaderBuilder.ts:179-265`) has a parallel interlace path (migrates in P2) and **no** Hybrid Box
  path (gains it free in P2.5).
- **Modular builder verdict (user asked):** composes *within* an iteration — orthogonal to the weave, NOT a core
  candidate. But it's slot-shaped (`formula_Modular` signature matches) → backlog `source: {kind:'modular'}` post-P4,
  which would also lift the interlace 'shape:modular' exclusion. Its `uModularParams` is a 4th param-packing system
  with a load-bearing parity contract (ADR-0050) — explicitly out of scope.

**Confirmed decisions (Q1-Q5):**
1. Keep both schedule kinds — `counts` (baked LUT) **and** `modulo {interval, startIter, maxCount?}` (runtime,
   keyframable; `maxCount` covers Hybrid Box). Emission is per-spec so costs never stack; no-weave = byte-identical.
   Note perf in the weaver UI; make optional if measurement demands.
2. Good code over minimal diff: one `KernelFeatures` options object **and** full DE_MASTER options-bag conversion.
3. Estimator registry → P1; slot-metadata-driven `FormulaParamsWidget` → P0.
4. Mesh export migrates in P2 (no surviving fork).
5. Native-slot transpiler (generalized from interlace's `glslRewriter` — c.w isolation, rotation swap, preamble
   prefixing) lands in P2 where interlace is its test case; **P2.5 (new phase): fold Hybrid Box interleaved mode**
   (2-slot modulo weave; gate: GPU verify hybrid scenes + schedule keyframability preserved).
6. **Save migration (user, 2026-07-04):** formulas may run slightly differently post-fold, and the save/preset
   migration layer MUST convert old-style interlace (`interlace*`) and Hybrid Box (`hybrid*`) feature state into the
   weave-native form (a superset — more options than either legacy system). P2/P2.5 design must decide the persistent
   format (keep legacy DDFS state + derive WeaveSpec, vs. migrate to weave-native state at load) with old-scene
   round-trip as a gate. *(P2/P2.5 outcome: persisted state kept unchanged — conversion lands with the P4 UI absorption.)*

**P3 design decisions (user, 2026-07-04):**
1. **Model:** a weave is a formula whose source is a WeaveSpec (`weaveSource`, ADR-0058 pattern) — re-editable,
   appears as ONE formula everywhere else. Scenes stay presets; differentiation is picker badging ("⧉ N"), not ontology.
   Slot picker lists single formulas only; scenes get "Edit weave" / unpack-into-slots affordances.
2. **Skip the throwaway prototype:** build the real host-agnostic `WeaveEditor` once, mount in the MB3D modal first;
   panel promotion (P4) = re-mount. Slot-source staging is engine-driven: MB3D slots now, native/frag/DEC (500+) +
   fold slots after P4 struct-state.
3. **Animation stability:** WARN when reordering slots while keyframed tracks target packed lanes; future = an
   animation-transfer tool prompted on reorder.
4. **No weave library/shelf yet** (UI-overwhelm risk); weaves persist inside scenes only.
5. **Schedule kinds are a user choice** — counts ("baked sequence", default) vs modulo ("live rhythm", keyframable,
   costs perf → opt-in). Loop-strip visualization designed to render both.
6. **Structure-edit undo** = editor-local (Workshop pattern), separate from DDFS param undo.
7. **DE policy:** importer-style auto-resolution; numerical DE (est7) is the last resort when nothing supplies a
   usable dr. Estimator dropdown stays the manual escape hatch.
8. **Fun layer:** loop-strip schedule visualization (live from `buildCountsPlan`), drag/reorder rows, dice
   (`pickRandom`), live-param budget meter (LaneAllocator lanes used; overflow bakes).

## Prompt

Unify GMT's weaving system and build the user-facing weaver — a **collaborative, interactive** design+build session
(it needs my insights; confirm the design with me before implementing each phase). Work on a fresh branch off `main`
(@ `70eaf51`, MB3D importer v1 — merged locally, unpushed; we push v1 + the weave UI together when this ships).

Read this file (`plans/mb3d/sessions/S-nformula-weave-unification.md`) in full, then verify its file:line anchors
against the actual source before proposing anything. GMT has two parallel formula-scheduling systems (interlace =
2-formula alternation; the MB3D weave = N fixed slots) + a single-formula-coupled param layer + an all-or-nothing
packing path. **Unify into one engine-level weave core** — `WeaveSpec` (the single contract) + one scheduler + one
emitter (native slots + unified parametric packing + a generic kernel-feature seam) + one extracted `ParamMapper`
param primitive — with interlace, the importer, and a **new user-facing weaver** as thin front-ends.

Start by confirming the **`WeaveSpec` contract + the P0/P1 design with me**. Then implement the staged, cert-gated
plan above (P0 param primitive → P1 weave core + migrate importer + GPU re-cert 38 scenes → P2 fold interlace → P3
weaver in the MB3D modal, mode-0 ordered stacking over the MB3D library → P4 per-iteration struct-state + native slots
+ promote to a panel). Honor the constraints (extract the Workshop param-surfacing, weaver in the modal first +
host-agnostic, mode-0 MVP, edit→rebuild→preview). GPU-cert every weave/emit/DE change (ADR-0087 blind spot); the
visual verdict is mine. Don't destabilize the merged v1 importer (build alongside, migrate revertibly, re-cert before
proceeding). Commit per logical step; don't push.
