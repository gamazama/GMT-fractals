# Weave slot fidelity — uniform headroom verdict (A3, done) → native slot-config plan (A4, open)

**Prepared:** 2026-07-04 (P3b amendments session) · **For:** the weave orchestrator, to fold into the P4+ plan.
**Owner directive (2026-07-04):** "having enough uniforms negates the need for the user to do any packing and
allows formulas to come in with their chosen slots. still worth an option for performance."
**Sequencing:** HARD-GATED on the Opus P4.4+ sessions finishing (this work edits `nativeResolver.ts` /
`emitFusedHybrid.ts` / `uniformSlots.ts` — the same seam).

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
