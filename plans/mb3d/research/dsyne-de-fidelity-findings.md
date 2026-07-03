# DsyneGrafix "dust" — DE-fidelity investigation findings

**Date:** 2026-06-27
**Context:** follow-up to ADR-0084 (surface refinement). The refinement canary
(`DsyneGrafix - Getting Loopy`) renders as scattered **dust**, not the coherent ringed
surface of the MB3D reference (`H:/GMT/refSoftware/MB3D/output/DsyneGrafix - Getting Loopy.jpg`).
Surface refinement could NOT fix it (an exhaustive fine march — fudge 0.05 / 5000 steps —
is still fragmented), so the dust is a **DE/formula-fidelity** gap, not an overshoot. This
doc is that investigation.

## TL;DR (ROOT CAUSE CONFIRMED)

The dust traces to one weave slot (`IdesFormula`), but the real cause is the **distance
estimator**, not the orbit. GMT's orbit iteration is provably identical to MB3D's (parse,
formula math, const-pack, weave, the fixed-Julia-seed c-add — all verified against MB3D
source). The divergence: IdesFormula is a `deOption=0` `[CODE]` slot, so **MB3D uses a
NUMERICAL 4-point finite-difference DE** (`CalcDEnoADE`, `Calc.pas:445-503`) that ignores the
analytic derivative entirely — it perturbs the ray seed and re-iterates to get the
escape-radius gradient. **GMT instead routes the scene to its analytic Linear estimator
(`r/dr`), but the `[CODE]` slot never updates `dr`, so the DE is garbage → dust.** GMT has no
numerical DE estimator. Fix: implement MB3D's 4-point numerical DE and route any hybrid with
a non-analytic slot to it (details + the fix plan below).

## The scene

`DsyneGrafix - Getting Loopy` — Julia (jx=−1.675, jy=0, jz=0), Linear estimator (1),
deBailout 1024. Weave (mode 0, sequential), 15-cycle:

```
[ AmazingBox ×12,  _Scaling ×1,  IdesFormula ×2 ]   (slots 0,1,2)
```

## Step 1 — localize: it's the IdesFormula slot

Rendering the scene with weave slots progressively dropped (`debug/_dsyne-isolate2.mts`):

| slots | nonBlack | result |
|---|---|---|
| AmazingBox + _Scaling + IdesFormula (full) | 0.675 | **dust** |
| AmazingBox + _Scaling (drop IdesFormula) | 0.967 | **coherent** bulbous surface w/ filigree |
| AmazingBox only | 0.992 | coherent |

→ IdesFormula is the dust source. Without it, Amazing Box alone gives a coherent surface.

## Step 2 — the IdesFormula map is degenerate as configured

MB3D `M3Formulas/IdesFormula.m3f` (authoritative source):
```
x' = X_mul·x²  − (y²+z²)·Xsub_mul + cx
y' = Y_mul·x·y·z                  + cy
z' = Z_mul·z²  − (x²+y²)·Zsub_mul + cz
```
Authored options in the scene: `X_mul=4, Y_mul=0, Z_mul=0, Xsub_mul=64, Zsub_mul=0`.
With `Y_mul=Z_mul=0` and Julia `cy=cz=0`:
```
y' = 0·xyz + 0 = 0
z' = 0     + 0 = 0
```
y and z collapse to 0. Amazing Box preserves zero components (fold/scale of 0 stays 0, and
the +c add is (−1.675,0,0)), so once IdesFormula fires the orbit is **pinned to the x-axis
forever** → a 1-D set → fragmented iso-surface → dust. (`X_mul=4, Xsub_mul=64` are also
huge, making the x-iteration unstable — even forcing `Y_mul=Z_mul=1` stays dust, nb 0.636.)

## Step 3 — every GMT step is FAITHFUL to MB3D

Verified, in order:

1. **Formula math** — the decompiled GLSL matches `IdesFormula.m3f` exactly (x'/y'/z' above).
2. **Option→term mapping** — decoded the x87 `[CODE]` operand offsets:
   `Cm16=X_mul→x²`, `Cm24=Y_mul→xyz`, `Cm32=Z_mul→z²`, `Cm40=Xsub→(y²+z²)`,
   `Cm48=Zsub→(x²+y²)`. Correct and consistent with the formula.
3. **Const packing** — `constPacker.packConstBuffer` is a port of MB3D
   `FillCustomVBufWithVars`; type-0 (.DOUBLE) writes the value straight, so MB3D fills the
   same `Cm16=4, Cm24=0, …`.
4. **Byte parse** — the slot-2 option block at `o+60` literally encodes the doubles
   `4.0, 0.0, 0.0, 64.0, 0.0` (raw hex confirmed). The original `.m3p` files
   (`mb3d-1.99src/M3Parameter/…`, sr33, sr37) **all** carry the identical bytes — not a
   sample-generation artifact.
5. **Julia c-mapping** — decompiler maps `c.x=[edi+0x18], c.y=[edi+0x20], c.z=[edi+0x28]`
   (the J1/J2/J3 constant); GMT sets `c=(jx,jy,jz)=(−1.675,0,0)` → `cy=cz=0`. Faithful.
6. **Weave** — mode 0 (`options1 & 3 == 0`), order `[0×12,1,2×2]`, endTo/repeatFrom from
   `hybOpt1`. Matches MB3D `doHybridPas`.

So MB3D, reading the same file, *should* also collapse y,z — yet its render is coherent
rings. That is the contradiction.

## Step 4 — what doesn't reproduce the ref

Sweeping IdesFormula's options (`debug/_dsyne-opts.mts`):

| options | nonBlack | look |
|---|---|---|
| authored `[4,0,0,64,0]` | 0.675 | dust |
| `.m3f` defaults `[1,2,1,0.5,0.5]` | 1.000 | flat featureless gray wall |
| `[4,1,1,64,0]` (Y/Z mul→1) | 0.636 | dust |
| `[1,1,1,1,1]` | 1.000 | flat gray |

**Neither the authored nor the default options reproduce the ref's ring structure.** So the
divergence is broader than a single option value — it involves MB3D's evaluation, not just
the inputs.

## ROOT CAUSE (confirmed against MB3D source, 2026-06-27)

Two MB3D-source audits settled it.

**The orbit is identical in both engines — and the c-add is NOT the divergence.** In Julia
mode MB3D sets the per-iteration add-constant `J1/J2/J3` to the **fixed seed** for every
pixel (`formulas.pas:3444`: `if DoJulia then mCopyVec(@J1, @JU1) else mCopyVec(@J1, @C1)`;
seed from header `HeaderTrafos.pas:561-562`). The per-pixel position lands in `C1/C2/C3` —
the iterate *start* (`mCopyVec(@x,@C1)`, `formulas.pas:3445`) — not the c-add. So `cy=cz=0`
for all pixels in MB3D too, exactly as GMT models. The orbit (and its y,z→0 collapse after
IdesFormula fires) is the same in both. `CopyTypeAndOptionFromCFtoHAddon`
(`CustomFormulas.pas:222`) keeps the stored `[4,0,0,64,0]` and packs identically. Everything
on the orbit path is faithful.

**The divergence is the DISTANCE ESTIMATOR.** Because IdesFormula carries `deOption=0`,
MB3D's *global* `DEoption` collapses to 0 (`HeaderTrafos.pas:438-463`), which selects
**`CalcDEnoADE`** — a **numerical 4-point finite-difference DE** (`Calc.pas:445-523`), NOT an
analytic one. It never reads the per-formula derivative `dr`/`w` at all. Instead it:
1. iterates the base seed through the whole hybrid → escape radius `Rout` (`Calc.pas:452`);
2. perturbs each seed axis by `mctDEoffset` (≈0.004, `HeaderTrafos.pas:890`) and **re-iterates
   the entire hybrid 3 more times**, measuring how `Rout` separates
   (`dt,wt,Rst = Sqr(bufRout−Rout)`, `Calc.pas:475-487`);
3. distance `= Rout·ln(Rout)·dDEscale / (√(Rst+wt+dt) + ε)` (`Calc.pas:503`).

This is a gradient of the escape-radius field w.r.t. the ray seed — robust to a slot that
never updates `dr`, and to the late y,z collapse (the perturbation propagates through the
first 12 Amazing-Box iterations, which carry the real 3-D structure → the rings).

**Why GMT shows dust:** the importer routes this hybrid to the **analytic Linear estimator**
(`quality.estimator = 1`, `DE = r/dr`). But IdesFormula's `[CODE]` does not update `dr`, so
`dr` reflects only Amazing Box while the orbit it's dividing has been mangled by IdesFormula
→ the analytic DE is garbage → dust. MB3D abandons the analytic `dr` the instant a
`deOption=0` slot is in the stack; GMT does not — GMT has no numerical/finite-difference DE
estimator at all (its estimators are Log/Linear/Pseudo/Dampened/Linear2/CuttingPlane/dIFS,
all analytic-`dr`).

This explains every earlier observation: pure Amazing-Box stacks render fine (analytic `dr`
is valid there); IdesFormula's `.m3f` defaults `[1,2,1,0.5,0.5]` give a *coherent-but-wrong*
flat wall (no collapse, but still the wrong analytic DE); fine marching (fudge 0.05) stays
fragmented (the DE field itself is wrong, not just overshot).

## The fix (recommended)

Implement MB3D's **numerical 4-point DE** as a GMT estimator and route `deOption=0` hybrids
to it instead of Linear:

1. **New estimator** (kernel): perturb the ray seed by a small `ε` on each axis, re-iterate
   the formula 3 extra times, and return `Rout·ln(Rout)·scale / (√(ΣΔRout²) + ε)`
   (port of `Calc.pas:503`). Cost ≈ 4× `map()` per sample — bounded, and only for scenes
   that need it. (Consider a cheaper 2-point / shared-`Rout` variant if perf demands.)
2. **Importer routing**: when ANY active weave slot lacks an analytic DE (`deOption ∉
   {2,5,6,11,20}` → MB3D's `IsCustomDE=False`, `HeaderTrafos.pas:648`), set the scene's
   estimator to the new numerical one instead of `1`. Mirror MB3D's global-DEoption collapse
   (`HeaderTrafos.pas:438-463`): one incompatible slot forces the whole stack numerical.

This is a real new capability (a finite-difference DE), not a parameter tweak — it would fix
the whole class of MB3D imports whose stacks mix analytic-`dr` formulas with `deOption=0`
`[CODE]` slots, not just DsyneGrafix.

## Evidence trail (MB3D source, `H:/GMT/refSoftware/MB3D/mb3d-1.99src/`)

- c-add = fixed Julia seed: `formulas.pas:3444`, `Calc.pas:1106` (per-pixel → C1/C2/C3),
  `Calc.pas:2725-2726` + `HeaderTrafos.pas:561-562` (seed from header),
  `TypeDefinitions.pas:87-97,125` (`TIteration3Dext`: C1@0, J1@0x18, PVar@0x30, Ju1@+320).
- numerical DE selection: `HeaderTrafos.pas:438-463` (global DEoption collapse),
  `:648,668-670` (`IsCustomDE` → `CalcDE` pointer); analytic vs numerical:
  `Calc.pas:291-317` (`CalcDEanalytic`, `Sqrt(Rout)/Abs(w)`) vs `Calc.pas:445-523`
  (`CalcDEnoADE`, the 4-point estimator). `[CODE]` default `deOption=0`:
  `CustomFormulas.pas:739,786`.

## Repro scripts (untracked scratch, `debug/_dsyne-*.mts`)

- `_dsyne-characterize.mts` — slots, weave, emitted DE GLSL.
- `_dsyne-bytes.mts` — raw option-byte audit (alignment check).
- `_dsyne-isolate2.mts` — drop-slots render matrix (localizes to IdesFormula).
- `_dsyne-opts.mts` — IdesFormula option sweep.
- Renders land in `h:/tmp/refine-cert/`.

@see docs/adr/0084, MB3D `M3Formulas/IdesFormula.m3f`, `engine-gmt/utils/mb3d/{constPacker,weaveSequencer,emitFusedHybrid}.ts`.
