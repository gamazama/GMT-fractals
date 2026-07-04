# Session prompt — Weave slot BANKS: per-slot param vocabulary for native slots (A4)

**Prepared:** 2026-07-04 · **Branch:** `feat/weave-core` (continue; do NOT push — v1 + weave ship together).
**Model/scope:** Fable 5, high effort — this edits the emit seam (`nativeResolver.ts` / `emitFusedHybrid.ts` /
`uniformSlots.ts` / `features/weave.ts`) with full probe + GPU-cert discipline. **Runs BEFORE P4.4/P4.5** (owner
re-sequencing 2026-07-04): absorption will map interlace onto a bank and delete the `uInterlace*` set, so banks
must exist first. Do NOT start absorption in this session.

## Read first (in this order)

1. `plans/mb3d/weave-slot-fidelity-plan.md` — §A3 (measured: uniform headroom ~free) and **§A4-decisions**
   (the owner-confirmed design shape — it is the authority for this session).
2. `plans/mb3d/sessions/S-weave-p4-build.md` — top delivery notes (P4.0–P4.3 state) + the split note.
3. `docs/adr/0089-weave-core-unification.md` — all update blocks (P4.0–P4.3).
4. `plans/mb3d/sessions/S-weave-p3b.md` §"Non-negotiable discipline" — probes, gates, GPU-cert commands.

## What exists (don't rebuild)

- `engine/weave/nativeResolver.ts` packs a native slot's declared params through the shared dense
  `LaneAllocator` (`buildParamBindings`), decomposing vec2/vec4 into scalar lanes, and bakes undeclared
  uniforms to preset defaults. Its `uniformMap` (single-pass, `nativeSlot.ts`) is the remap seam — banks
  mostly REPLACE the lane walk with verbatim `uParamA → uWs<k>ParamA` mappings.
- `features/weave.ts` loop-generates the 5 rhythm layer param sets — the exact pattern banks scale up
  (registry freezes at store construction: static declaration, like the layer sets).
- `FormulaParamsWidget.tsx` hardcodes coreMath in three places (state read, `setCoreMath`, trackId
  `coreMath.${id}`) — the additive per-param `feature` routing field goes here. `FractalParameter` already
  gained an additive `group` field (A2) — same pattern.
- The DDFS generic binder routes `weave.<param>` animation tracks already (rhythm params prove it).
- Probes: `debug/probe-weave-refactor.mts` (38-scene emit dump; MB3D-only scenes must stay byte-identical —
  banks touch native paths only), `debug/probe-native-weave.mts` (4-shot GPU canary, headed Chrome :3400),
  `debug/probe-uniform-headroom.mts` (the A3 measurement, re-run if you want to re-verify with real banks).

## The work (staged, one commit per step, gates per step)

1. **`[engine]` Bank declaration.** Extend the `weave` feature with banks: per bank k, the full slot
   vocabulary (paramA..F, vec2A..C, vec3A..C, vec4A..C → `ws<k>ParamA`… / `uWs<k>ParamA`…). Decide
   in-session (record in the ADR): base slot keeps PRIMARY coreMath verbatim + banks 1..5 (recommended —
   needs the MB3D dense allocator to reserve the base's claimed ids in mixed weaves), vs banks-for-all-6
   (simpler, no reservation). Gate: typecheck; store boots; no emit change yet (probe byte-identical).
2. **`[engine]` Resolver fidelity mode.** `resolveNativeSlot` maps declared params verbatim onto the slot's
   bank (no vec decomposition — vec2 binds a real vec2 uniform); undeclared uniforms still bake to preset
   defaults; c.w isolation reads the bank's ParamA. Stamp defaults into `preset.features.weave.ws<k>*`
   instead of coreMath; emit `parameters` entries with `feature: 'weave'` + state-key ids + real labels +
   `group`. MB3D slots: UNTOUCHED dense path (now with the pool to themselves in mixed weaves). Gate:
   MB3D-only probe byte-identical; weave suite grows (bank mapping, identity pair on distinct banks,
   vec2 NOT decomposed, undeclared-uniform bake, mixed weave reservation if chosen).
3. **`[ui]` Panel routing.** `FormulaParamsWidget` honors the per-param `feature` field (read/write/trackId
   → `weave.*`); budget meter simplifies to the MB3D dense pool only (native rows no longer consume it).
   Gate: sliders drive a woven native's params live; keyframing a bank param works (track `weave.ws1ParamA`).
4. **`[docs]` ADR** (new — the vocabulary widening + banks are a load-bearing contract; supersede/annotate
   nothing in 0089, add its own number) + update blocks + delivery note in `S-weave-p4-build.md`.

**Exit gate:** the P4.1 canary pairs re-rendered on GPU (identity pair now on distinct banks — visually
unchanged vs the P4.1 shots), PLUS a param-rich native pair that TODAY overflows-and-bakes (e.g.
Phoenix ⊗ Phoenix) rendering with LIVE sliders; user visual + interaction verdict.

## Standing gates (every commit)

`npm run typecheck` · `test:mb3d` (24) · `test:mb3d:weave` (170+) · `test:refine` (56) ·
`check:mb3d-decompiler` · `smoke:boot` (dev server :3400). Emit changes ⇒ probe classification (MB3D-only
scenes byte-identical; native-path diffs classified + justified) + `probe-native-weave.mts` re-render (real
GPU, headed). Interlace sweep (`--primary=Mandelbulb --fresh --show`) ONLY if `nativeSlot.ts` is touched.
ADR update block per landed step. Commit per logical step; do NOT push.

## Repo gotchas

- **LOCAL-ONLY uncommitted files — keep their hunks out of commits:** `engine-gmt/components/FormulaPicker/
  pickerCategories.ts`, `engine-gmt/formulas/index.ts`, `engine-gmt/types/common.ts` (git-excluded Julia3D
  formula wiring). Path-scope with `git add -p` if you must touch them.
- Windows: multiline commit messages via bash heredoc (`git commit -F -`); `sed -i` fails onto C: (python).
- Old saved scenes load their SAVED def + coreMath state — no migration in this session; rebuilds move onto
  banks under the existing reorder-keyframe warning (P4.6 later turns it into a transfer).

## Prompt

Read this file in full, then the four docs above. Implement the bank design per
`weave-slot-fidelity-plan.md` §A4-decisions on `feat/weave-core`, staged as the four steps here. Confirm the
base-slot-verbatim vs banks-for-all-6 call with the user at step 1 (present the reservation interaction
concretely before deciding). Stop after the exit gate with a delivery note; P4.4/P4.5 (absorption onto banks)
is the next separate session.
