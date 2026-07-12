# Weave slot fidelity — uniform headroom verdict (A3, done) → native slot-config plan (A4, DECIDED)

**Prepared:** 2026-07-04 (P3b amendments session) · **For:** the weave orchestrator, to fold into the P4+ plan.
**Owner directive (2026-07-04):** "having enough uniforms negates the need for the user to do any packing and
allows formulas to come in with their chosen slots. still worth an option for performance."

> **DECIDED 2026-07-04 (owner, via the review session) — see §A4-decisions below.** Per-slot BANKS (option 1);
> state lives on the DDFS `weave` feature; **banks run BEFORE P4.4/P4.5** (the original hard gate is lifted —
> it was blast-radius management, and absorption then maps interlace onto a bank and deletes the `uInterlace*`
> set instead of migrating twice); fidelity is the default with compact as an AUTOMATIC fallback only (no user
> toggle). Session prompt: `plans/mb3d/sessions/S-weave-p4-banks.md`.

## A3 — MEASURED: uniform-count headroom is ~free (done; decision input)

Full record: `docs/policy/shader-compile-optimization.md` §8.1 · probe: `debug/probe-uniform-headroom.mts`
(headed Chrome → ANGLE/D3D11, RTX 2070; the live 250-uniform production frag; interleaved cache-busted,
median of 7 full compile+link):

| variant | median compile+link | Δ vs base | ACTIVE_UNIFORMS |
|---|---|---|---|
| base | 2426 ms | — | 122 |
| +24 float +6 vec4 unread | 2473 ms | +1.9% | 122 |
| +96 float +24 vec4 unread | 2476 ms | +2.1% | 122 |

- Cold-compile cost ≈ **+2%, FLAT with count** (GLSL parse overhead, not per-uniform translation).
- **Zero runtime cost**: unread uniforms are INACTIVE after link (no D3D registers); three.js uploads
  active uniforms only → idle lanes never sync. FPS structurally unaffected.
- The real price of widening the slot vocabulary is **code surface**: the `FractalParameter` id union,
  `SCALAR_SLOTS`/`VEC*_SLOTS` tables, animation-target list, GMF round-trip compat — not performance.

## A4 — native formulas keep their declared slots in weaves (open)

**Problem.** `nativeResolver` re-packs a native formula's params through the dense shared `LaneAllocator`:
slot 0's scalars keep `paramA..` mostly by accident, vec2/vec4 params DECOMPOSE into component lanes, and
later slots land wherever is free. Slider layout, keyframe targets (`coreMath.paramA`), muscle memory and
saved GMF/preset expectations all break relative to the standalone formula.

**Goal.** A native formula woven as a slot presents its params on the SAME slots it declares standalone —
sliders, keyframes and presets transfer verbatim. Dense packing survives as an explicit option, not the default.

### Design options (the fidelity axis — orchestrator to pick with the owner)

1. **Per-slot slot banks (full fidelity).** Each weave slot k gets its own copy of the vocabulary
   (`uWs<k>ParamA` … mirroring `uParamA`…). Every slot keeps its declared ids verbatim — including the
   identity pair (Mandelbulb ⊗ Mandelbulb both declaring `paramA`), which NO flat-namespace scheme can
   satisfy. A3 says the uniform count is affordable (6 banks ≈ +200 uniforms ⇒ still ~+2% compile, 0 fps).
   **The real question is state, not uniforms:** `coreMath` holds one `paramA`; banks need per-slot state
   homes + animation targets (e.g. weave feature state `ws1.paramA`, or a coreMath extension) and a
   panel/GMF story. This is a DDFS/state-architecture decision → belongs with the P4.4+ absorption design,
   likely its own ADR.
2. **Affinity on the shared pool (first-declarer-wins).** `LaneAllocator` gains reservations: a native
   slot claims its DECLARED ids when unclaimed; conflicts (second slot declaring the same id) fall back to
   dense packing (or to a widened overflow bank, e.g. `paramG..L`). Keeps today's coreMath vocabulary,
   keyframes and GMF compat untouched; the lead formula — the one users tune most — is verbatim; identity
   pairs stay imperfect. Much smaller lift; the Task-2 directive→allocator seam is the natural entry.
3. **Hybrid staging (recommended sketch):** ship (2) first — cheap, no state migration, immediately fixes
   the lead-slot experience; treat (1) as the P4.4+-era end state if per-slot state lands anyway for the
   interlace/Hybrid Box absorption (their `interlace*` param mirror IS a per-slot bank precedent).

### Shared requirements, whichever option

- **Packing stays an option:** an "auto-compact lanes" toggle (weave-level; default = fidelity). The
  budget meter reads whichever allocator ran.
- **MB3D slots unchanged:** they have no declared ids (option lists) — dense packing + Task-2 expose/bake
  remain their path. Mixed weaves = fidelity for native slots, dense for MB3D slots, one shared budget.
- **No vec decomposition in fidelity mode:** a declared vec2/vec4 binds its own base uniform, never
  component lanes.
- **Persistence:** `weaveSource` must record the mode (and any explicit lane choices later — the manual
  lane picker stretch goal rides the same seam).

### Gates

Emit changes by definition → probe classification (shader-changed vs metadata) + GPU cert of affected
scenes/canaries (ADR-0087) + interlace sweep if `nativeSlot.ts` is touched; new ADR if the vocabulary
widens or banks land (load-bearing contract); suites (weave ≥170, mb3d, refine, decompiler) + boot smoke.

### Open questions for the owner (via orchestrator)

1. Fidelity depth: is first-declarer-wins (option 2) enough for v1, or is the identity-pair case
   (both slots verbatim) a requirement → banks (option 1)?
2. If banks: where does per-slot param STATE live (weave feature namespace vs coreMath extension), and do
   its animation targets appear as `ws1.paramA`-style tracks?
3. Default mode for NEW weaves: fidelity (recommended per the directive) with compact as opt-in?

## A4-decisions (owner, 2026-07-04) + design shape for the build session

1. **Per-slot banks** (option 1). Affinity rejected: it adds ZERO availability — the shared pool
   (24 scalar lanes + 6 vec3-shaped units) stays the ceiling and a Phoenix⊗Phoenix pair already
   overflows it into bake-everything. Banks make availability per-slot; identity pairs verbatim.
2. **State home = extend the DDFS `weave` feature** (the P3b loop-generated-params pattern, proven by
   the rhythm layer sets). Bank k = the full slot vocabulary (6 scalars + 3 vec2 + 3 vec3 + 3 vec4 =
   15 params), state keys `ws<k>ParamA`… / uniforms `uWs<k>ParamA`…. Keyframes/undo/preset+GMF
   persistence arrive BY CONSTRUCTION (generic dotted binder: `weave.ws1ParamA` tracks). DDFS labels
   are static/generic ("Slot 1 Param A") — the Formula panel shows the real labels via the fused def's
   `parameters` (label + group), which gain an additive `feature` routing field consumed by
   `FormulaParamsWidget` (today it hardcodes coreMath reads/`setCoreMath`/`coreMath.*` trackIds).
3. **Sequencing: banks BEFORE P4.4/P4.5.** The old hard gate is lifted. Absorption then maps
   `interlaceParamA..F`/vec sets onto a bank and DELETES the `uInterlace*` uniform set (one migration,
   not two), and P4.6's animation transfer gets stable per-slot targets (reorder = bank-index rename).
4. **Fidelity default; compact = automatic fallback only, NO user toggle.** Consequence: a native slot
   can never overflow in bank mode (its declared params fit its own bank by definition), so the dense
   path survives only for MB3D slots (option lists → shared pool + Task-2 expose/bake, unchanged) and
   as the loader-compat path for defs saved pre-banks. The budget meter meters ONLY the MB3D dense pool.

**Recommended bank↔slot shape (build session may simplify):** the BASE slot (first active) keeps the
PRIMARY coreMath vocabulary verbatim (`uParamA`… — a 1-slot native weave then behaves exactly like the
standalone formula, keyframes on `coreMath.paramA` as users expect; interlace precedent: primary =
coreMath, secondary = its own bank); slots 1..5 take banks `uWs1*`..`uWs5*`. This requires the MB3D
dense allocator to RESERVE the base slot's claimed coreMath ids in mixed weaves — if that reservation
interaction gets ugly, fall back to banks-for-all-six (base included), which costs 15 more params and
base-slot muscle memory but nothing else. Decide in-session, record in the ADR.

**Compat:** old saved scenes load their SAVED def (dense lanes baked in the GLSL) + coreMath state —
untouched, no migration. Only a REBUILD in the editor moves a weave onto banks; the existing
reorder-keyframe warning covers the retarget gap until P4.6.
