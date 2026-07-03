# MB3D Render Pipeline — Definitive Spec

> **Provenance correction (2026-06-28):** re-anchored from the dead `Calc.pas` `RayMarch`
> to the live `TMandCalcThread.Execute` marcher — see `render-pipeline-CORRECTIONS.md`.
> `RayMarch`/`RayMarchVV` (`Calc.pas:1815`/`:1944`) have **zero call sites** and are a
> stale/abandoned refactor target; the live per-pixel marcher is the inlined loop in
> `CalcThread.pas:128-258`. The camera/ray-setup functions (`RMCalculateVgradsFOV`,
> `RMCalculateStartPos`, the three optic-mode builders) and the DE-dispatch /
> iteration-weave / numeric-DE / normals *targets* are all still live and unchanged; only
> the marcher body (§3, parts of §1/§2.6) and a handful of constant anchors (§3/§4/§10)
> moved. The dead `RayMarch` is mechanically near-identical to the live loop, so it remains
> a useful **reference twin** for cross-reading, but it is NOT the executed code.

> Line-grounded, adversarially-verified reference for how Mandelbulb3D turns a scene
> (`.m3p`/`TMandHeader10`) into pixels. Every fact carries an inline citation in the
> form `[VERIFIED file:line]` (skeptic-confirmed against source) or
> `[INFER …: <what runtime data would settle it>]` (best static read, needs an
> instrumented harness to close). The closing **Falsified hypotheses** section records
> every plausible-but-wrong theory and the counter-evidence that killed it — this
> importer's history is a graveyard of such theories, and the record is load-bearing.
>
> Source roots: MB3D at `/h/tmp/mb3d-src/`, GMT at `h:/GMT/workspace-gmt/stable/`.

---

## 1. Executive summary — how MB3D renders one pixel

`TMandCalcThread.Execute` walks the image rect per thread, and for each `(x, y)` it
(1) turns the pixel into a **camera Y-angle** `CAFY = (y/iMandHeight − 0.5)·FOVy`
[VERIFIED CalcThread.pas:780] and an **X-angle** `CAFX = (FOVXoff − x)·FOVXmul`
[VERIFIED Calc.pas:1227-1229]; (2) builds a **view direction** via one of three
optic-mode functions (perspective `BuildViewVectorDFOV`, planar/ortho
`CalculateVgradsFOVRect`, or panoramic `BuildViewVectorDSphereFOV`) and rotates it into
world space by the camera matrix `Vgrads` [VERIFIED Calc.pas:1205-1260]; (3) seeds the
**ray origin** `C1 = Ystart + Vgrads[0]·ix + Vgrads[1]·iy`
[VERIFIED CalcThread.pas:134]; (4) marches the ray in the **inlined loop body of
`TMandCalcThread.Execute`** (CalcThread.pas:186-253), which advances `C1` along the march
vector `mVgradsFOV` in distance-estimated steps
`step = MaxCS(s011, (DE − msDEsub·msDEstop) · sZstepDiv · RSFmul)`, clamped from above by
`MaxCS(msDEstop, 0.4) · mctMH04ZSD`, until the ray either crosses the surface
(`DE < msDEstop`) or runs the formula to its iteration cap
(`ItResultI ≥ MaxItsResult`) — with **no step-count cap**; the loop only bails on
`mZZ > Zend` or a user stop flag [VERIFIED CalcThread.pas:253]. Each step's DE
comes from a per-scene `CalcDE` function pointer — analytic `CalcDEanalytic`, numeric
finite-difference `CalcDEnoADE`, or combined `CalcDEfull` — whose target is resolved
once at scene load from the active formulas' `iDEoption` values
[VERIFIED HeaderTrafos.pas:649-671]. The DE itself is produced by walking the
**hybrid weave**: a stateful cursor cycling formula slots, each slot running
`nHybrid[n]` consecutive iterations, escaping on `Rout > RStop`, capped by the header's
`Iterations` (NOT a sum of per-slot counts) [VERIFIED formulas.pas:3454-3471]. Once the
march reports a hit, **post-hit refinement** (`RMdoBinSearch` / `RMdoBinSearchIt`,
gated by `iDEAddSteps <> 0`) bisects backward to the surface [VERIFIED CalcThread.pas:235-239],
the **normal** is taken by an indirect function-pointer dispatch
(`TCalculateNormalsFunc(pCalcNormals)`) to a central-difference of the DE field with a
depth-scaled probe offset [VERIFIED CalcThread.pas:243; Calc.pas:794, 819-831], and shading
proceeds from there.

---

## 2. Camera → ray setup

### 2.1 Per-pixel entry point

The marcher is driven by `TMandCalcThread.Execute`, which iterates `y` from
`CalcRect.Top` to `CalcRect.Bottom` (with a per-thread offset `iThreadId`) and `x`
across `CalcRect.Left..Right` [VERIFIED CalcThread.pas:759-781]:

```pascal
y := CalcRect.Top + iThreadId - 1;
while y <= CalcRect.Bottom do
begin
  pCTR.iActualYpos := y;
  CAFY := (y / iMandHeight - s05) * FOVy;          // s05 = 0.5
  for x := CalcRect.Left to CalcRect.Right do
```

Per pixel it calls `RMCalculateVgradsFOV(@MCTparas, x + 1)` (builds direction)
[VERIFIED CalcThread.pas:786] then `RMCalculateStartPos(@MCTparas, x, y)` (builds origin)
[VERIFIED CalcThread.pas:787].

### 2.2 Pixel → camera angles

- **Y-angle:** `CAFY = (y / iMandHeight − 0.5) · FOVy` [VERIFIED CalcThread.pas:780].
- **X-angle:** `CAFX = (FOVXoff − ix) · FOVXmul` [VERIFIED Calc.pas:1227-1229].

`FOVy` is a `Double` field of `TMCTparameter` [VERIFIED TypeDefinitions.pas:597],
derived from the header `dFOVy` at file offset `#108`
[VERIFIED TypeDefinitions.pas:745]. `FOVXoff` and `FOVXmul` are pre-computed `Single`
constants replacing the per-pixel `0.5·iMandWidth` term
[VERIFIED TypeDefinitions.pas:645-646].

### 2.3 View-direction construction (three optic modes)

`RMCalculateVgradsFOV` computes `CAFX`, branches on `MCTCameraOptic`
[VERIFIED TypeDefinitions.pas:652], builds the raw view vector, then rotates it by the
camera matrix [VERIFIED Calc.pas:1205-1260]. Mode selection
[VERIFIED Calc.pas:1231-1240, 1252]:

| `MCTCameraOptic` | Mode | Builder |
|---|---|---|
| 0 | perspective | `BuildViewVectorDFOV` |
| 1 | planar / orthographic (rectangular) | inline in `CalculateVgradsFOVRect` |
| 2 | panoramic spherical | `BuildViewVectorDSphereFOV` |

**Perspective (mode 0)** — `BuildViewVectorDFOV` returns the *normalized* Euclidean
direction [VERIFIED Math3D.pas:2716-2741]:

```
norm = 1 / sqrt( sinY² + sinX² + (cosX·cosY)² )
v = ( −sinY·norm, sinX·norm, cosX·cosY·norm )
```
where the Y-angle is `CAFY` and the X-angle is `CAFX`.

**Planar / orthographic (mode 1)** — built directly and normalized before rotation
[VERIFIED Calc.pas:1187-1195]:

```pascal
MCTparas.mVgradsFOV[0] := -MCTparas.CAFX;
MCTparas.mVgradsFOV[1] :=  MCTparas.CAFY;
MCTparas.mVgradsFOV[2] :=  MCTparas.mctPlOpticZ;
NormaliseVectorVar(MCTparas.mVgradsFOV);
RotateVectorReverse(@MCTparas.mVgradsFOV, @MCTparas.VGrads);
```

**Panoramic (mode 2)** — `BuildViewVectorDSphereFOV`, *unnormalized* spherical coords.
NOTE the corrected component layout (see Falsified §11): the middle component is
`sin(CAFX)`, **not** `sin(CAFY)` [VERIFIED Math3D.pas:2754-2765]:

```
v[0] = −sin(CAFY)·cos(CAFX)
v[1] =  sin(CAFX)
v[2] =  cos(CAFY)·cos(CAFX)
```

### 2.4 Camera rotation

All three view vectors are transformed by `RotateVectorReverse`, the transpose
multiply `v' = Vgradsᵀ · v` [VERIFIED Math3D.pas:1573-1579]:

```pascal
V[0] := VT[0]*M[0,0] + VT[1]*M[1,0] + VT[2]*M[2,0];
V[1] := VT[0]*M[0,1] + VT[1]*M[1,1] + VT[2]*M[2,1];
V[2] := VT[0]*M[0,2] + VT[1]*M[1,2] + VT[2]*M[2,2];
```

`Vgrads` is a `TMatrix3` (`array[0..2,0..2] of Double`)
[VERIFIED TypeDefinitions.pas:619, Math3D.pas:9]. It does double duty: rows 0 and 1 are
the per-pixel ray-origin basis vectors, and the whole matrix is the camera orientation
used in the transpose multiply [VERIFIED Calc.pas:1106-1108, 1254-1256].

### 2.5 Ray origin

`RMCalculateStartPos` seeds the iteration point `C1` (the ray origin / `ActPos`)
[VERIFIED Calc.pas:1101-1109]:

```pascal
pIt3Dext.C1 := Ystart[0] + Vgrads[0,0]*ix + Vgrads[1,0]*iy;
pIt3Dext.C2 := Ystart[1] + Vgrads[0,1]*ix + Vgrads[1,1]*iy;
pIt3Dext.C3 := Ystart[2] + Vgrads[0,2]*ix + Vgrads[1,2]*iy;
```

`Ystart` is the camera position (`//->Campos`), a `TVec3D`
[VERIFIED TypeDefinitions.pas:624].

### 2.6 Per-ray state (live marcher locals on `MCTparas` / `pIt3Dext`)

The live marcher is **inlined** in `TMandCalcThread.Execute`; it has no `RMrec` record. It
reads/writes its per-ray state directly through `pIt3Dext^`, `MCTparas^`, and thread-local
loop variables [VERIFIED CalcThread.pas:128-258]. The set the loop uses:

| State | Meaning |
|---|---|
| `pIt3Dext.C1` (and C2/C3) | ray origin → current march point in world space, seeded by `RMCalculateStartPos` [VERIFIED CalcThread.pas:134; Calc.pas:1101-1109] |
| `mVgradsFOV` (on `MCTparas`) | normalized march direction (the rotated view vector), built by `RMCalculateVgradsFOV` [VERIFIED CalcThread.pas:133; Calc.pas:1205-1260] |
| `mZZ` | accumulated marched ray distance; reset to 0 per pixel [VERIFIED CalcThread.pas:140], advanced `mZZ += dTmp` each step [VERIFIED CalcThread.pas:219] |
| `DEstop` (on `MCTparas`) | the base hit threshold; `msDEstop := DEstop` at entry [VERIFIED CalcThread.pas:141] |
| `msDEstop` | dynamic hit threshold; rescaled `DEstop·(1 + mZZ·mctDEstopFactor)` each step [VERIFIED CalcThread.pas:221] |
| `Zend` | depth bound; loop ends when `mZZ > Zend` [VERIFIED CalcThread.pas:253] (derived `HeaderTrafos.pas:779`, see §3.5/§10) |
| `msDEsub` | per-step DE safety-subtraction (gated by `iOptions` bit 2) [VERIFIED CalcThread.pas:200; HeaderTrafos.pas:961-964] |
| `seed` | LCG state for the first-step random jitter [VERIFIED CalcThread.pas:214] |
| `bFirstStep` / `bMCTFirstStepRandom` | enables first-step jitter; `bMCTFirstStepRandom := (iOptions and 1) <> 0` [VERIFIED CalcThread.pas:142; HeaderTrafos.pas:859] |

> **Provenance note (the dead `RayMarch` is a reference twin, not the executed code).**
> `RayMarch` (`Calc.pas:1815`) and `RayMarchVV` (`Calc.pas:1944`) have **zero call sites**
> anywhere in the tree — no call, no procedure-pointer assignment, no asm `call`. They are
> a stale/abandoned refactor target. The **live** per-pixel marcher is the inlined loop in
> `TMandCalcThread.Execute` (`CalcThread.pas:128-258`, terminating `:253`), spawned at
> `Calc.pas:209`. The two are mechanically near-identical — so the dead `RayMarch` body is
> still useful to cross-read against — but every march fact in §3 below is anchored to the
> **live** loop. (Earlier sessions mistook a commented-out `TRaymarchRec` sketch at
> `Calc.pas:1808-1815` for evidence the marcher was disabled; both halves of that debate
> were wrong — `RayMarch` is real code, just never reached.) [VERIFIED CalcThread.pas:128-258]

---

## 3. The march loop (live, `TMandCalcThread.Execute`, CalcThread.pas:128-258)

Per-pixel setup [VERIFIED CalcThread.pas:137-160]: `pIt3Dext.CalcSIT := False`,
`StepCount := 0`, `mZZ := 0`, `msDEstop := DEstop`, `bFirstStep := bMCTFirstStepRandom`;
then (no cut planes) the first DE eval at `label1: dTmp := CalcDE(pIt3Dext, MCTparas)`
[VERIFIED CalcThread.pas:159-160]. (With cut planes, `RMmaxLengthToCutPlane` advances
`mZZ` to the first plane before the DE eval [VERIFIED CalcThread.pas:143-157].) The march
loop proper is a `repeat … until` beginning at `:186` after `RSFmul := 1` and
`RLastStepWidth := dTmp · sZstepDiv` [VERIFIED CalcThread.pas:184-186].

### 3.1 The step size

Each *next-step* branch computes [VERIFIED CalcThread.pas:199-209]:

```pascal
RLastDE := dTmp;
dTmp := MaxCS(s011, (dTmp - msDEsub * msDEstop) * sZstepDiv * RSFmul);   // {200}
dT1  := MaxCS(msDEstop, 0.4) * mctMH04ZSD;                               // {201}
if dT1 < dTmp then
begin
  if DFogOnIt = 0 then StepCount := StepCount + dT1 / dTmp else
  if pIt3Dext.ItResultI = DFogOnIt then StepCount := StepCount + dT1 / dTmp;
  dTmp := dT1;                                          // max-step clamp
end
else if DFogOnIt = 0 then StepCount := StepCount + 1 else
  if pIt3Dext.ItResultI = DFogOnIt then StepCount := StepCount + 1;
```

- The base step is `MaxCS(s011, (DE − msDEsub·msDEstop) · sZstepDiv · RSFmul)`
  [VERIFIED CalcThread.pas:200]. Two terms the dead `RayMarch` lacked:
  **(a)** an `s011` (= 0.11, [VERIFIED TypeDefinitions.pas:1078]) floor via `MaxCS`, and
  **(b)** a per-step safety-subtraction `(DE − msDEsub·msDEstop)` *before* scaling.
  `msDEsub` is gated by `iOptions` bit 2: `0` when clear, else
  `MinCS(0.9, Sqrt(remapped sZstepDiv))` [VERIFIED HeaderTrafos.pas:961-964] (see §3.10).
- `sZstepDiv` is the artist-authored step-size divisor (`Single` on `TMCTparameter`)
  [VERIFIED TypeDefinitions.pas:603]. Lower → finer/more steps; higher → coarser.
  **GMT port is 1:1: `fudgeFactor = sZstepDiv`**
  [VERIFIED emitFusedHybrid.ts:348-380].
- `RSFmul` is the adaptive damper, initially 1.0 [VERIFIED CalcThread.pas:184].
- **Max-step clamp — UNCHANGED from the dead path** (byte-identical):
  `dT1 = MaxCS(msDEstop, 0.4) · mctMH04ZSD` [VERIFIED CalcThread.pas:201]. `MaxCS` is a
  Single-precision FPU `max` [VERIFIED Math3D.pas:3795-3810]. The **0.4 floor** keeps
  the cap above `msDEstop` when `msDEstop` is tiny, so the marcher can still take large
  steps in empty space. `mctMH04ZSD` scales by image size and step-divisor (see §10). The
  previously-landed importer fudge-floor-0.4 fix (commit `0179051`) maps to this identical
  live clamp — no change required.
- **`StepCount` is fog/shadow accounting only.** It accumulates fractional steps and never
  appears in any conditional inside the loop (see §3.5); the `DFogOnIt` gates here just
  scope which iteration's steps get counted for dynamic fog.

### 3.2 The RSFmul damper

After the new DE is computed, the damper shrinks the *next* step when DE contracted
rapidly [VERIFIED CalcThread.pas:224-230]:

```pascal
if RLastDE > dTmp + s1em30 then          // s1em30 = 1e-30
begin
  dT1 := RLastStepWidth / (RLastDE - dTmp);
  if dT1 < 1 then RSFmul := maxCS(s05, dT1)   // s05 = 0.5 floor
             else RSFmul := 1;
end
else RSFmul := 1;
```

The `0.5` floor (`s05`) prevents runaway slow-down
[VERIFIED TypeDefinitions.pas:1068, 1082]. Identical to the dead path.

### 3.3 The overstep clamp

Immediately after each in-loop DE eval [VERIFIED CalcThread.pas:223]:

```pascal
if dTmp > RLastDE + RLastStepWidth then dTmp := RLastDE + RLastStepWidth;
```

This caps the new DE at the linear extrapolation from the previous step, preventing a
single over-optimistic DE from launching the ray past geometry. Identical to the dead path.

### 3.4 First-step random

If `bFirstStep` (from `bMCTFirstStepRandom`), the first step is jittered by a seeded LCG
fraction. The live form uses the **full 31-bit mantissa** `(seed and $7FFFFFFF)` scaled by
`dSeedMul = 1/$7FFFFFFF`, **not** the dead path's `(seed shr 16) and $7FFF` ×1/32768
[VERIFIED CalcThread.pas:210-217; const dSeedMul TypeDefinitions.pas:1107]:

```pascal
if bFirstStep then
begin
  bFirstStep := False;
  seed := 214013 * seed + 2531011;
  dTmp := (seed and $7FFFFFFF) * dSeedMul * dTmp;   // dSeedMul = 1/$7FFFFFFF
end;
```

(The jitter is applied to the step *after* the max-step clamp, inside the same next-step
branch [VERIFIED CalcThread.pas:210].)

### 3.5 Termination — NO step-count cap

The loop is a `repeat … until` with exactly two exit conditions
[VERIFIED CalcThread.pas:253]:

```pascal
until (mZZ > Zend) or PCalcThreadStats.pLBcalcStop^;
```

`Zend` is the real march bound — **source-settled, no harness needed**. It is a normalized
camera depth range over step width: `Zend := MaxCD(1e-10, (dZend − dZstart) / StepWidth)`
where `StepWidth := dStepWidth` [VERIFIED HeaderTrafos.pas:778-779]. This retires the prior
"MaxRayLength needs harness" open item (the dead `RayMarch` bound `Zstepped > MaxRayLength`
was the wrong anchor; the live loop bounds `mZZ > Zend`, fully derivable from header fields
— see §10).

`StepCount` is initialized at CalcThread.pas:139 and incremented at :204-209 (and at
:254-257 for the post-loop shadow/fog total), but it is **never read in any conditional
inside the loop** — it is a pure accounting variable consumed *after* the march for
fog/shadow length: `Inc(pCTR.i64DEsteps, Round(StepCount))` and the
`Min0MaxCS(StepCount, 1023)` shadow encoding [VERIFIED CalcThread.pas:254-257]. This is
definitive: there is no iteration/step-count gate on march reach. (This is the central
GMT-divergence finding — GMT imposes a fixed ≈2000 step cap that MB3D's live marcher does
not; if anything the live loop *reinforces* the divergence, since it caps only on distance
`Zend`, never on step count.)

`StepCount` accumulates *fractional* steps: `dT1/dTmp` when a step is max-clamped, `1.0`
otherwise [VERIFIED CalcThread.pas:204-209].

### 3.6 The `MaxItsResult` early-exit and back-step

Before the loop, after the first DE eval, an **already-in-the-set** early exit fires if
the start (or post-cut) position is already converged or maxed; it shades in place rather
than entering the march [VERIFIED CalcThread.pas:161-181]:

```pascal
if (pIt3Dext.ItResultI >= MaxItsResult) or (dTmp < msDEstop) then   // already in the set
begin
  if bInAndOutside and (bCalcInside = bInsideTmp) then …goto label1;  // re-eval other side
  RMdoColor(MCTparas);                                                // shade in place
  …
end
else
begin
  RSFmul := 1;
  RLastStepWidth := dTmp * sZstepDiv;
  repeat … (the march loop) …
```

Inside the loop, if the iteration count crosses `MaxItsResult` mid-march, the ray
**back-steps by −0.5·RLastStepWidth**, rescales `msDEstop`, and re-evaluates DE
[VERIFIED CalcThread.pas:187-195]:

```pascal
if pIt3Dext.ItResultI >= MaxItsResult then    // inside, while stepping
begin
  dT1 := -0.5 * RLastStepWidth;
  mZZ := mZZ + dT1;
  mAddVecWeight(@pIt3Dext.C1, @mVgradsFOV, dT1);
  msDEstop := DEstop * (1 + mZZ * mctDEstopFactor);
  dTmp := CalcDE(pIt3Dext, MCTparas);
  RLastStepWidth := -dT1;
end;
```

### 3.7 The set-found branch

When `(ItResultI < iMinIt)` is false AND not `(ItResultI < MaxItsResult and dTmp ≥
msDEstop)` — i.e. the surface is reached — the else-branch fires
[VERIFIED CalcThread.pas:232-251]:

```pascal
else     // ##### set found #####
begin
  DElimited := (pIt3Dext.ItResultI < MaxItsResult) or (dTmp < msDEstop);
  if iDEAddSteps <> 0 then   // binary search
  begin
    if DElimited then RMdoBinSearch(MCTparas, dTmp, RLastStepWidth)
                 else RMdoBinSearchIt(MCTparas, mZZ);
  end;
  …
  TCalculateNormalsFunc(pCalcNormals)(MCTparas, RSFmul);   // indirect normals dispatch
  RMdoColor(MCTparas);
  CalcZposAndRough(mPsiLight, MCTparas, mZZ);
  Break;
end;
```

`DElimited := (ItResultI < MaxItsResult) or (dTmp < msDEstop)` distinguishes the hit
cause:
- **DE-limited** → the DE field crossed `msDEstop` first → `RMdoBinSearch`.
- **iteration-limited** → the formula hit its iteration cap → `RMdoBinSearchIt`.

The continue-condition that keeps the loop marching is
[VERIFIED CalcThread.pas:196-197]:

```pascal
if (pIt3Dext.ItResultI < iMinIt) or
   ((pIt3Dext.ItResultI < MaxItsResult) and (dTmp >= msDEstop)) then
```

i.e. force more marching while below `iMinIt`, OR while not-yet-maxed and DE still above
threshold.

### 3.8 Per-step `msDEstop` rescaling (zoom / Zpos)

The live marcher rescales `msDEstop` **directly on `mZZ`** (the accumulated marched ray
distance), at three sites — after cut-plane advance (:155), after back-step (:192), and
after each forward step (:221) [VERIFIED CalcThread.pas:155, 192, 221]:

```pascal
msDEstop := DEstop * (1 + mZZ * mctDEstopFactor);
```

This is **simpler than the dead `RayMarch`**, which scaled on a *projected* position
`Clamp0D(ActZpos + Zstepped·ZZposMul)` via a dot-product multiplier; the live path drops
the projection and uses raw `mZZ`. The effect is unchanged in spirit: the hit threshold
grows with distance from camera, so detail is fine near-camera and coarse far away.
`mctDEstopFactor` derivation is in §10.

### 3.9 The `RayMarchVV` view-vector twin (dead)

`RayMarchVV` (`Calc.pas:1944`) is a sibling of the dead `RayMarch` and is likewise
**uncalled**. It tracks `ZZ` (distance along the view vector) with the simpler
`StartDEstop·(1 + ZZ·mctDEstopFactor)` rescale — which is in fact closer to the live loop's
`DEstop·(1 + mZZ·mctDEstopFactor)` than the dead `RayMarch` was. It is retained here only as
an additional reference twin; it is not the executed code [VERIFIED Calc.pas:1944 — zero
call sites].

### 3.10 `iOptions` bit 2 → `msDEsub` / `sZstepDiv` remap

The step formula's safety-subtraction `msDEsub` (§3.1) and the *effective* `sZstepDiv` are
both gated by `iOptions` bit 2 [VERIFIED HeaderTrafos.pas:961-964]:

```pascal
if (iOptions and 4) = 0 then msDEsub := 0
else begin
  sZstepDiv := sZstepDiv * sZstepDiv + (1.2 * sZstepDiv) * (1 - sZstepDiv);  // quadratic remap
  msDEsub   := MinCS(0.9, Sqrt(sZstepDiv));
end;
```

When the bit is **clear**, `msDEsub = 0` and the step reduces to
`MaxCS(s011, DE·sZstepDiv·RSFmul)` (only the `s011` floor differs from the dead path).
When **set**, `sZstepDiv` is remapped through `s² + 1.2·s·(1−s)` *and* a per-step DE safety
subtraction `msDEsub = MinCS(0.9, √(remapped sZstepDiv))` applies — both materially affect
how aggressively the march under-steps near the surface. **Importer gap:** the importer does
not currently read `iOptions` bit 2, so it silently drops to the bit-clear path (neither the
`sZstepDiv` remap nor the `msDEsub` subtraction is reproduced). This is a per-scene render
lever worth surfacing.

---

## 4. Hit threshold `msDEstop` and its scaling

`msDEstop` is the dynamic surface-convergence threshold. At march entry it is the base
`DEstop` [VERIFIED CalcThread.pas:141], then rescaled each step (§3.8) by
`(1 + mZZ·mctDEstopFactor)` [VERIFIED CalcThread.pas:155, 192, 221]. The base chain is
`header.sDEstop → msDEstop → DEstop`:

- `msDEstop := MaxCS(s0001, sDEstop)` (clamp to ≥ 0.001)
  [VERIFIED HeaderTrafos.pas:535; const s0001 TypeDefinitions.pas:1071].
- `DEstop := msDEstop` [VERIFIED HeaderTrafos.pas:536]; this `DEstop` (on `MCTparas`) is
  the constant base the live loop reads at entry and uses on every per-step rescale
  [VERIFIED CalcThread.pas:141, 221].
- The dead `RayMarch` introduced a separate `StartDEstop` RMrec field as the rescale base;
  the live loop has **no `StartDEstop`** — it rescales off `DEstop` directly. (Resolves the
  prior `INFER CalcSR.pas` open item: there is no per-pixel `StartDEstop` seed to trace.)

---

## 5. DE dispatch (`CalcDE` per DEoption)

`CalcDE` is a function pointer on `TMCTparameter`, type `TCaldDEfunction =
function(It3Dex: TPIteration3Dext; mctp: Pointer): Double`
[VERIFIED TypeDefinitions.pas:592, 607]. The target is resolved **once at scene load**
inside `GetMCTparasFromHeader`, defaulting to `CalcDEfull`
[VERIFIED HeaderTrafos.pas:533] and then specialized:

**Non-DEcomb path** [VERIFIED HeaderTrafos.pas:649-671]:

```pascal
Result.IsCustomDE := Result.DEoption in [2,5,6,11,20];
if bIsDEcomb then Result.CalcDE := CalcDEfull else
if Result.isCustomDE then Result.CalcDE := CalcDEanalytic
                     else Result.CalcDE := CalcDEnoADE;
```

**DEcomb path** (`bIsDEcomb := (PCFA.bOptions1 and 3) = 2`): always `CalcDEfull`,
regardless of `IsCustomDE`; `FormulaType := Min(6, Max(1, bOptions3 + 1))`
[VERIFIED HeaderTrafos.pas:595-596, 669-671].

**Interpolation-hybrid path**: `IsCustomDE := DEoption in [2,5,6,11]` (note: **20
excluded**), then `CalcDEanalytic` if custom else `CalcDEnoADE`
[VERIFIED HeaderTrafos.pas:618-621].

### DEoption value map [VERIFIED HeaderTrafos.pas:507-511]

```
[0,1]    : 3D numeric
[2,11]   : 3D analytic (ADE)  — [11] = ABox
[4]      : 4D numeric
[5,6]    : 4D analytic (ADE)  — [6]  = ABox
[20..22] : dIFS               — [20] = dIFS shapes
```

`DEoption` is **not stored in the header**; it is resolved at runtime by
`CheckFormulaOptions`/`CheckDEoption`, which walk each active formula's
`TCustomFormula.iDEoption` and merge to a compatible value (or `-1` if incompatible)
[VERIFIED HeaderTrafos.pas:403-430, 432-506]. `iDEoption` is either hardcoded for
built-ins (0 numeric default, 4 Quaternion, 11 ABox, 20 dIFS) or parsed from a formula
file's `[OPTIONS] DEoption` tag [VERIFIED CustomFormulas.pas:329, 343, 348, 786].
`bOptions2` bit 0 (`bDisableADE`) forces numeric DE even where analytic is available:
`2,11 → 0` and `5,6 → 4` [VERIFIED HeaderTrafos.pas:598, 465-469, 645-646].

### Exact returned quantities

**`CalcDEanalytic`** [VERIFIED Calc.pas:291-317]:

```pascal
if It3Dex.DEoption = 20 then begin               // dIFS seed
  It3Dex.Rold := msDEstop * sStepWm103;
  It3Dex.RStopD := It3Dex.Rold;
  It3Dex.bIsInsideRender := bInsideRendering;
end;
Result := mMandFunctionDE(@It3Dex.C1) * dDEscale;
MaxItsResult := It3Dex.MaxIt;
if It3Dex.DEoption = 20 then Inc(MaxItsResult)
else if Result < msDEstop * s025 then Result := msDEstop * s025;  // 0.25 floor
// bCalcInside: dIFS → msDEstop*2 − Result ; else → msDEstop*4 − Result*3
```

`mMandFunctionDE` is the analytic per-formula DE; `doHybridPasDE` (§6) supplies it.

**`CalcDEnoADE`** — numeric finite-difference (§7) [VERIFIED Calc.pas:445-523]:

```pascal
Result := bufRout * Ln(bufRout) * dDEscale / (Sqrt(Rst + wt + dt) + mctDEoffset006);
```

**`CalcDEfull`** — picks analytic vs numeric per `IsCustomDE`, then optionally combines
a second formula's DE by `FormulaType` (1=min, 2=max, 3=maxInv, 4=miS1, 5=miS2)
[VERIFIED Calc.pas:525-604].

**dIFS analytic kernel `doHybridIFS3D`** (DEoption 20) — orbit-trap minimum: seeds
`OTrap := 65535`, per iteration computes `DEout / VaryScale`, keeps the running minimum,
exits early when it drops below `RStopD` [VERIFIED formulas.pas:3210-3298].

---

## 6. Iteration / hybrid-weave model

> This is the historically most-misread part. The settled model: **per-pixel iteration
> count is the header `Iterations` cap, NOT the sum of per-slot counts.** See Falsified
> §11 for the "sum is the real count" theory that was killed on MengerTrees.

The weave loop in `doHybridPas` (formulas.pas:3439, "new ext version") and its DE twin
`doHybridPasDE` (formulas.pas:3690) is a stateful cursor over up to 6 formula slots
[VERIFIED formulas.pas:3454-3471]:

```pascal
repeat
  Rold := Rout;
  while bTmp <= 0 do            // advance cursor to next non-empty slot
  begin
    Inc(n);
    if n > EndTo then n := iRepeatFrom;       // wrap
    bTmp := nHybrid[n] and $7FFFFFFF;          // per-slot count (mask off sign)
    if bTmp > 0 then PVar := fHPVar[n];
  end;
  fHybrid[n](x, y, z, w, PIteration3D);        // run the slot's formula (incl folds)
  Dec(bTmp);
  if nHybrid[n] < 0 then Continue else         // SILENT slot: transform only
  begin
    Inc(ItResultI);                            // counted slot
    Rout := x * x + y * y + z * z;
    if Rout < OTrap then OTrap := Rout;
  end;
until (ItResultI >= maxIt) or (Rout > RStop);  // cap OR escape
```

Key facts:

- **`nHybrid[n]`** (`array[0..5] of Integer`, offset +76) holds each slot's consecutive
  iteration count; the **sign bit** marks a *silent* slot
  [VERIFIED TypeDefinitions.pas:103; formulas.pas:3450, 3465-3470]. The count is masked
  with `$7FFFFFFF`.
- **Silent slots** (`nHybrid[n] < 0`) run their formula (folds/transforms applied to
  `x,y,z` in place) but **skip both `Inc(ItResultI)` and the `Rout` recompute** via
  `Continue` — they are pure transforms invisible to escape detection
  [VERIFIED formulas.pas:3463-3470].
- **`ItResultI`** (offset +64) is the integer iteration count the live marcher reads
  (`CalcThread.pas:161, 187, 196, 234`); it increments only on counted slots
  [VERIFIED TypeDefinitions.pas:100-101; formulas.pas:3467].
- **Cap is `maxIt` (= header `Iterations`), not a per-slot sum.** `MaxItsResult` is set
  from `It3Dex.MaxIt` (`+1` only if `DEoption = 20`) [VERIFIED Calc.pas:302-303,
  605-606; TypeDefinitions.pas:640]. `It3Dex.MaxIt ← header.Iterations`
  [VERIFIED HeaderTrafos.pas:551; TypeDefinitions.pas:735].
- **Escape test:** `Rout > RStop`, where `Rout = x²+y²+z²` (squared magnitude) is
  recomputed only on counted slots [VERIFIED formulas.pas:3468-3471]. `RStop` is a
  `Single` at offset +72 [VERIFIED TypeDefinitions.pas:102].
- **Folds/transforms are NOT separate from the weave** — each slot is a single function
  pointer `fHybrid[n]` (offset +124) with its own param block `fHPVar[n]` (offset +100);
  the formula applies its complete operation, then `Rout` is recomputed for counted
  slots [VERIFIED formulas.pas:3463-3470; TypeDefinitions.pas:104-105].

**Weave order (GMT side).** `buildWeaveSequence` (weaveSequencer.ts) replays the MB3D
cursor state machine from `iStartFrom = 0` until `(n, bTmp)` repeats, recording the slot
that runs at each iteration index; silent slots are marked `~n` (bitwise NOT); the result
is emitted as a GLSL iteration→slot lookup table
[VERIFIED engine-gmt/utils/mb3d/weaveSequencer.ts:33-99].

`doHybridPasDE` analytic return (chosen by `DEoption` bitfields)
[VERIFIED formulas.pas:3729-3736]:

```pascal
if (DEoption and $38) = 32 then
  Result := Sqrt(Rout) * 0.5 * Ln(Rout) / Deriv1          // bulb-style log-DE
else case DEoption and 7 of
  4: Result := Abs(y) * Ln(Abs(y)) / w;                   // Julia
  7: Result := Sqrt(Rout / RStop) * Power(scale, -ItResultI);  // bulb
else Result := Sqrt(Rout) / Abs(w);                        // ABox/IFS default
end;
```

---

## 7. Numeric DE (`CalcDEnoADE`, Calc.pas:445-523)

Used when no analytic derivative is available (`IsCustomDE` false, non-DEcomb)
[VERIFIED HeaderTrafos.pas:649-671; 618-621]. Mechanism:

1. **Guards:** return 0 if `bInsideRendering and ItResultI = MaxIt`
   [VERIFIED Calc.pas:453-454]; return 0 if `It3Dex.Rout < d1em200` (1e-200) to avoid
   `Ln` of a vanishing radius [VERIFIED Calc.pas:455].
2. **Save state**, cap iterations with `It3Dex.RStop := Rstop3D` for the probe evals
   [VERIFIED Calc.pas:468-474], then **3 orthogonal probes** at `+mctDEoffset` along
   `C1`, `C2`, `C3` one axis at a time; each yields a squared radius difference
   `dt`, `wt`, `Rst = Sqr(bufRout − It3Dex.Rout)` [VERIFIED Calc.pas:475-487].
3. **Estimate** [VERIFIED Calc.pas:503]:
   ```pascal
   Result := bufRout * Ln(bufRout) * dDEscale / (Sqrt(Rst + wt + dt) + mctDEoffset006);
   ```
   This is the log-gradient distance estimate: `bufRout` is the unperturbed orbit
   radius, the denominator is the finite-difference gradient magnitude plus a stability
   offset.
4. **Clamp** to a minimum of `msDEstop * 0.25` [VERIFIED Calc.pas:515]; if
   `bCalcInside`, invert to `msDEstop*4 − Result*3` [VERIFIED Calc.pas:517-520].
5. **Restore** the saved iteration state (incl. `It3Dex.RStop := dRStop`)
   [VERIFIED Calc.pas:505-510].

`Rstop3D` caps the probe iterations (not the final estimate): `Rstop3D = Sqr(dRStop) *
64 = Sqr(Sqr(RStop)) * 64 = RStop⁴·64` [VERIFIED HeaderTrafos.pas:558-559]. (The old
"numeric DE caps at `Sqr(dRstop)·64`" wording is correct in *value* but the underlying
chain is two squarings of the header `RStop` — see Falsified §11.)

The returned distance feeds the march step exactly like the analytic path: the live loop
calls `CalcDE(pIt3Dext, MCTparas)` and uses the return as `dTmp` for the next
`MaxCS(s011, (dTmp − msDEsub·msDEstop)·sZstepDiv·RSFmul)` step
[VERIFIED CalcThread.pas:160, 193, 222; 200].

---

## 8. Normals (indirect via `pCalcNormals`)

The live marcher calls normals through a **function pointer**, not a direct call:
`TCalculateNormalsFunc(pCalcNormals)(MCTparas, RSFmul)` inside the set-found branch
[VERIFIED CalcThread.pas:243]. `pCalcNormals` is assigned **once** at scene load
[VERIFIED HeaderTrafos.pas:959-960]:

```pascal
if NormalsOnDE then TCalculateNormalsFunc(pCalcNormals) := RMCalculateNormals
               else TCalculateNormalsFunc(pCalcNormals) := RMCalculateNormalsOnSmoothIt;
```

where `NormalsOnDE := (bNormalsOnDE > 0) or IsCustomDE` [VERIFIED HeaderTrafos.pas:864].
`RMCalculateNormals` (`Calc.pas:776`) is the DE-field target; `RMCalculateNormalsOnSmoothIt`
(`Calc.pas:904`) is the iteration-field twin (it reads `pIt3Dext.SmoothItD` via
`mMandFunction` instead of `CalcDE`). `RMCalculateNormals` **is** a live target — but it is
reached through the pointer, not by the call the dead `RayMarch` made. The rest of this
section describes `RMCalculateNormals` (the `NormalsOnDE` target).

**Probe offset** (depth/zoom-scaled) [VERIFIED Calc.pas:794]:

```pascal
Noffset := MinCS(1, DEstop) * (1 + mZZ * mctDEstopFactor) * 0.15;
```

`mZZ` is the accumulated march depth (set by the live loop, §3) [VERIFIED CalcThread.pas:219];
so the normal probe **does scale with depth/zoom** through the same `mctDEstopFactor` the
marcher uses. `MinCS(1, DEstop)` caps the base at 1. Both normal targets use this identical
`Noffset` expression [VERIFIED Calc.pas:794, 912].

**Default scheme — central difference** (`iSmNormals < 8`): 6 DE evals (forward+backward
per axis × 3), averaged by `s05 = 0.5` [VERIFIED Calc.pas:819-831, TypeDefinitions.pas:1082]:

```pascal
mAddVecWeight(@pIt3Dext.C1, @Vgrads[2], Noffset);
N[2] := CalcDE(pIt3Dext, pMCTparas);              // Zgradient
mAddVecWeight(@pIt3Dext.C1, @Vgrads[2], -2 * Noffset);
N[2] := (N[2] - CalcDE(pIt3Dext, pMCTparas)) * s05;   // (f(x+h)-f(x-h))/2
// …same for N[0] (X), N[1] (Y)…
```

**High-quality scheme — 5×5×5 sparse stencil** (`iSmNormals = 8`): 124 probes (`5³−1`)
at `StepSNorm = Noffset·1.3333` along the `Vgrads` basis, accumulating divided
differences, then `ScaleVectorV(@N, 0.0075)` [VERIFIED Calc.pas:799-816].

**Normalization / packing** — `MakeWNormalsFromDVec`: `mag = sqrt(x²+y²+z²+1e-100)`,
scale each component by `32767/mag`, store as int16
[VERIFIED Calc.pas:893; Math3D.pas:557-586; consts d1em100/d32767
TypeDefinitions.pas:1096, 1103].

**Roughness (smoothing, `iSmNormals > 0`):** doubles `Noffset`, samples DE along two
orthonormal in-plane directions (`Vx`, `Vy` from `CreateXYVecsFromNormals`), accumulates
variance `dSG`, and feeds `RMCalcRoughness` —
`sRough = Clamp01D(sqrt(1e-100 + dSG·7·dt2² / (1e-100 + |N|²)) − 0.05)`
[VERIFIED Calc.pas:833-890, 700-701].

---

## 9. Post-hit refinement (`RMdoBinSearch` / `RMdoBinSearchIt`)

**POST-HIT ONLY.** Both refiners run inside the live set-found branch
(CalcThread.pas:232-251), *after* the march already crossed the surface; they do **not**
extend march reach [VERIFIED CalcThread.pas:232-251]. Gating
[VERIFIED CalcThread.pas:234-239]:

```pascal
DElimited := (pIt3Dext.ItResultI < MaxItsResult) or (dTmp < msDEstop);
if iDEAddSteps <> 0 then
begin
  if DElimited then RMdoBinSearch(MCTparas, dTmp, RLastStepWidth)
               else RMdoBinSearchIt(MCTparas, mZZ);
end;
```

`RMdoBinSearch` / `RMdoBinSearchIt` are **live targets** (`Calc.pas:1641` / `:1041`),
called per the gate above; only their *caller* moved from the dead `RayMarch` to the live
loop.

- **`RMdoBinSearch`** (Calc.pas:1641) bisects the **DE-crossing**: iterates
  `iDEAddSteps >> 1` times, stepping along the ray and adjusting `C1`, exiting on
  iteration exhaustion OR `|DE − msDEstop| ≤ 0.001`
  [VERIFIED Calc.pas:1641, 1724, 1725-1726, 1757-1759, 1787-1793].
- **`RMdoBinSearchIt`** (Calc.pas:1041) bisects the **iteration-count crossing**:
  searches for `SmoothItD = maxIt − 0.99` with a secant-like adaptive step, running
  exactly `iDEAddSteps` iterations with no tolerance early-exit
  [VERIFIED Calc.pas:1041, 1049, 1082-1086, 1055, 1093-1094].

**`iDEAddSteps`** comes from header `bStepsafterDEStop` (byte #134)
[VERIFIED HeaderTrafos.pas:538; TypeDefinitions.pas:755]; when 0 (the default) the live
gate `if iDEAddSteps <> 0` at CalcThread.pas:235 fails and **all refinement is skipped**
[VERIFIED CalcThread.pas:235; TypeDefinitions.pas:755]. For dIFS
(`DEoption = 20` OR `DEoption2 = 20`) it is raised to at least
`Round(MinCS(1, sZstepDiv)·2) + 2`, so refinement always runs there
[VERIFIED HeaderTrafos.pas:897-899].

> **Refutes "binary search reaches the back geometry."** Both refiners run only after a
> hit and converge *backward* from the crossing; the march loop `Break`s immediately
> after (CalcThread.pas:251). They reduce step size to localize an already-found surface —
> they never discover new geometry [VERIFIED CalcThread.pas:232-251].

---

## 10. Constant derivation table (`HeaderTrafos.pas`)

All derived in `GetMCTparasFromHeader` (HeaderTrafos.pas:513-978) unless noted.

| Constant | Header field(s) | Transform (quoted) | Default / floor | Role in march |
|---|---|---|---|---|
| **`msDEstop`** | `sDEstop` (#177) | `MaxCS(s0001, sDEstop)` [VERIFIED HeaderTrafos.pas:535] | ≥ 0.001 | base hit threshold (then per-step rescaled, §3.8) |
| **`DEstop`** | ← `msDEstop` | `Result.DEstop := Result.msDEstop` [VERIFIED HeaderTrafos.pas:536] | — | initial marcher threshold AND the constant base for every per-step `msDEstop` rescale (read at CalcThread.pas:141, 221) |
| **`msDEsub`** | `iOptions` bit 2, `sZstepDiv` | `0` if `(iOptions and 4)=0`; else (after `sZstepDiv` remap) `MinCS(0.9, Sqrt(sZstepDiv))` [VERIFIED HeaderTrafos.pas:961-964] | 0 | per-step DE safety-subtraction in the step formula: `step = MaxCS(s011, (DE − msDEsub·msDEstop)·sZstepDiv·RSFmul)` (CalcThread.pas:200) |
| **`sZstepDiv`** | `mZstepDiv` (#182) | `MaxCS(0.0001, mZstepDiv)` [VERIFIED HeaderTrafos.pas:537]; if `iOptions and 4`: `sZstepDiv := sZstepDiv² + 1.2·sZstepDiv·(1−sZstepDiv)` [VERIFIED HeaderTrafos.pas:961-964] | ≥ 0.0001 | step-size divisor: `step = MaxCS(s011, (DE − msDEsub·msDEstop)·sZstepDiv·RSFmul)` (CalcThread.pas:200). GMT `fudgeFactor` 1:1 |
| **`mctMH04ZSD`** | `iMandWidth`,`iMandHeight`,`sZstepDiv`,`sRaystepLimiter` | `Max(iMandWidth,iMandHeight)·0.5·Sqrt(sZstepDiv+0.001)·MaxCS(0.01,sRaystepLimiter)` [VERIFIED HeaderTrafos.pas:860]; dIFS override → `Max(iMandWidth,iMandHeight)` when `DEoption=20 and (not bIsDEcomb or DEoption2=20)` [VERIFIED HeaderTrafos.pas:906-909] | — | max-step scaler: `dT1 = MaxCS(msDEstop,0.4)·mctMH04ZSD` (CalcThread.pas:201) |
| **`Zend`** | `dZend`,`dZstart`,`StepWidth` | `MaxCD(1e-10, (dZend − dZstart) / StepWidth)`; `StepWidth := dStepWidth` [VERIFIED HeaderTrafos.pas:778-779] | ≥ 1e-10 | depth bound; live loop ends when `mZZ > Zend` (CalcThread.pas:253). **Source-settled — replaces the dead path's `MaxRayLength`/`Zstepped`** |
| **`RStop`** | `RStop` (#84, Double) | direct header field [VERIFIED TypeDefinitions.pas:742] | — | escape-radius parameter |
| **`dRStop`** | `RStop` | `Sqr(RStop)` [VERIFIED HeaderTrafos.pas:558] | — | squared escape radius |
| **`Rstop3D`** | `RStop` | `Sqr(dRStop)·64` = `RStop⁴·64` [VERIFIED HeaderTrafos.pas:559] | — | iteration cap for numeric-DE probes (§7) |
| **`mctDEoffset`** | `msDEstop`,`StepWidth` | `Min(msDEstop·0.1, 0.004)` [VERIFIED HeaderTrafos.pas:891]; then `·StepWidth` [VERIFIED HeaderTrafos.pas:957] | ≤ 0.004 | finite-difference probe offset for numeric DE |
| **`mctDEoffset006`** | `mctDEoffset` | `mctDEoffset·s006` (`s006=0.06`) [VERIFIED HeaderTrafos.pas:956; TypeDefinitions.pas:1077] | — | stability term in numeric-DE denominator |
| **`mctDEstopFactor`** | FOV/depth via `GetDEstopFactor` | `if bVaryDEstop then GetDEstopFactor(@Header) else 0` [VERIFIED HeaderTrafos.pas:861-862] | 0 | per-step `msDEstop` depth scaling on raw `mZZ` (§3.8); also normal probe scaling (§8) |
| **`iDEAddSteps`** | `bStepsafterDEStop` (#134) | `Result.iDEAddSteps := bStepsafterDEStop` [VERIFIED HeaderTrafos.pas:538]; dIFS (`DEoption=20 or DEoption2=20`): `Max(iDEAddSteps, Round(MinCS(1,sZstepDiv)·2)+2)` [VERIFIED HeaderTrafos.pas:897-899] | 0 (→ no refinement) | gates + sizes post-hit binary search (§9) |
| **`MaxItsResult`** | `Iterations` (#12) | `iMaxIt := Iterations` [VERIFIED HeaderTrafos.pas:551]; at iteration start `MaxItsResult := iMaxIt`, `+1` if `DEoption=20` [VERIFIED Calc.pas:302-303, 605-606] | — | hard iteration cap; `ItResultI ≥ MaxItsResult` ⇒ "in set" |
| **`iMinIt`** | `Iterations`,`MinimumIterations` (#135) | `Min(Iterations, MinimumIterations)` [VERIFIED HeaderTrafos.pas:552]; dIFS+(`not bIsDEcomb or FormulaType<5`) ⇒ `iMinIt := 1` [VERIFIED HeaderTrafos.pas:900] | — | forces minimum marching before a hit can register (CalcThread.pas:196) |
| **`StepWidth`** | `dStepWidth` | `StepWidth := dStepWidth` [VERIFIED HeaderTrafos.pas:778] | — | step-width unit; feeds `Zend` (the live depth bound), `mctDEoffset`, and the DEstop colour-variance term (CalcThread.pas:244) |

> **Dropped vs the dead `RayMarch`.** The live loop has **no** `StartForward`/`StepForward`
> pre-DE advance (it goes straight to `label1: dTmp := CalcDE(...)` at CalcThread.pas:160;
> the only pre-DE advance is the cut-plane path, CalcThread.pas:143-157) and **no**
> `ZZposMul`/`ActZpos` view-axis projection (the dead path's `Clamp0D(ActZpos + Zstepped·ZZposMul)`
> is replaced by raw `mZZ` — §3.8). Those constants existed only in the dead `RayMarch` and
> are removed from this table.

**`mctDEstopFactor` derivation (`GetDEstopFactor`)** [VERIFIED HeaderTrafos.pas:58-72]:

```pascal
CalcStepWidth(Header);
ze := MaxCD(1e-16, (dZend - dZstart) / dStepWidth);
if bPlanarOptic = 2 then x1 := s001 * Height / (Sin(s001) * Pi)
else                     x1 := s001 * Height / (Sin(s001) * MaxCD(d1d65535, dFOVy * Pid180));
x2 := dStepWidth * (x1 + ze) / x1;
Result := (x2 - dStepWidth) / (dStepWidth * MaxCD(d1d6, ze));   // floor d1d6 = 1/6
```

Models depth-dependent step scaling: `x1` ≈ relative camera distance from viewport,
`ze` ≈ step-widths spanning the z-range, `x2` ≈ step width at the far plane. Floor is
`d1d6 = 1/6 ≈ 0.1667` (see Falsified §11 — NOT 0.001667).

---

## 11. Falsified hypotheses

Each entry: the wrong claim, why it's wrong, and the counter-evidence.

1. **"Panoramic ray middle component is `sin(CAFY)`"** (`v = (−sinY·cosX, sinY,
   cosX·cosY)`). **REFUTED.** `BuildViewVectorDSphereFOV` stores `sin(CAFX)` at offset
   +8 (= `v[1]`), not `sin(CAFY)`. The fld order is `ya`(CAFY) first → `cosY,sinY`, then
   `xa`(CAFX) → `cosX,sinX,…`; the `fstp [ecx+8]` that writes `v[1]` follows the
   `sinX`-producing `fsincos`. Correct: `v = (−sin(CAFY)·cos(CAFX), sin(CAFX),
   cos(CAFY)·cos(CAFX))` [VERIFIED Math3D.pas:2754-2765].

2. **"`RStop` (the weave escape radius) = `Sqr(Header.RStop)·64`."** **REFUTED.** The
   derivation is **two** squarings: `dRstop := Sqr(RStop)` then `Rstop3D := Sqr(dRstop)
   ·64`, i.e. `Sqr(Sqr(RStop))·64 = RStop⁴·64`. The single-squaring form understates the
   bailout radius by a factor of `RStop²` [VERIFIED HeaderTrafos.pas:558-559].

3. **"`GetDEstopFactor` denominator floor is 0.001666… (≈1/600)."** **REFUTED.** The
   constant is `d1d6 = 1/6 ≈ 0.16667` — two orders of magnitude larger. The line is
   `Result := (x2 - dStepWidth) / (dStepWidth * MaxCD(d1d6, ze))`
   [VERIFIED HeaderTrafos.pas:70; const d1d6 TypeDefinitions.pas:1106].

4. **"`RayMarch` is the live per-pixel marcher."** **REFUTED — and this spec was built on
   it (the provenance error this whole ledger pass corrects).** `RayMarch` (`Calc.pas:1815`)
   and `RayMarchVV` (`:1944`) are real, compilable procedures with active-looking bodies —
   but they have **zero call sites** anywhere in the tree (no call, no procedure-pointer
   assignment, no asm `call`; a bareword grep returns only the three definition sites). They
   are a stale/abandoned refactor target. The **live** per-pixel marcher is the inlined loop
   in `TMandCalcThread.Execute` (`CalcThread.pas:128-258`, terminating `:253`), spawned at
   `Calc.pas:209`. Note the history of *over-correction* here: an earlier skeptic correctly
   smelled "dead code" (from the commented-out `TRaymarchRec` sketch at `Calc.pas:1808-1815`),
   the spec then *over-corrected* to "RayMarch is live," and the truth is the third option —
   `RayMarch`'s **body** is live-looking code that is **never reached**. The dead body remains
   a useful reference twin (mechanically near-identical to the live loop), but every march
   fact in §3 is now anchored to `CalcThread.pas` [VERIFIED CalcThread.pas:128-258;
   Calc.pas:209; `RayMarch`/`RayMarchVV` zero call sites].

5. **"The per-pixel iteration count is the per-slot sum"** (the "sum is the real count"
   model, falsified on MengerTrees). **REFUTED.** `ItResultI` increments only on counted
   (non-silent) slots and the weave loop caps on `ItResultI >= maxIt` where `maxIt =
   header.Iterations`. Silent slots (`nHybrid[n] < 0`) run via `Continue` without
   incrementing. So the cap is the header `Iterations`, not the sum of `nHybrid[]`
   [VERIFIED formulas.pas:3454-3471, 3465-3470; Calc.pas:302-303;
   HeaderTrafos.pas:551].

6. **"Post-hit binary search reaches the back geometry / extends march reach."**
   **REFUTED.** `RMdoBinSearch`/`RMdoBinSearchIt` execute only inside the set-found
   branch, after a hit, and the live loop `Break`s immediately after. They converge backward
   to localize an already-detected surface; they never march forward into new geometry
   [VERIFIED CalcThread.pas:232-251].

### Amended (survived with corrections folded in)

- **`mctMH04ZSD` dIFS override condition.** Original said "both formulas are dIFS";
  actual condition is `DEoption=20 and (not bIsDEcomb or DEoption2=20)` — it fires
  whenever the first formula is dIFS and the scene is *not* DEcomb, regardless of the
  second formula [VERIFIED HeaderTrafos.pas:906-909]. §10 uses the corrected condition.
- **`iDEAddSteps` / `iMinIt` dIFS override trigger.** Original cited `DEoption=20`;
  actual trigger is `(DEoption=20) or (DEoption2=20)`
  [VERIFIED HeaderTrafos.pas:897-900]. §9/§10 use the corrected trigger.
- **"Numeric DE feeds the march step."** Statically confirmed that `CalcDE` (any target)
  is the DE source for each march step; the exact step-advance dynamics are closed by the
  direct read of the **live** loop (`dTmp := CalcDE(pIt3Dext, MCTparas)` then
  `MaxCS(s011, (dTmp − msDEsub·msDEstop)·sZstepDiv·RSFmul)`)
  [VERIFIED CalcThread.pas:160, 193, 222; 200].
- **Step formula (substantive change from the dead path).** The dead `RayMarch` step was
  `dTmp := dTmp·sZstepDiv·RSFmul` (no safety term, no floor). The live step adds **(a)** an
  `s011` (= 0.11) `MaxCS` floor and **(b)** a per-step safety-subtraction
  `(DE − msDEsub·msDEstop)` before scaling, where `msDEsub` is gated by `iOptions` bit 2
  (§3.10). This is the one place the re-anchoring changed a formula, not just a citation
  [VERIFIED CalcThread.pas:200; HeaderTrafos.pas:961-964].
- **Termination bound (`Zend`, was `MaxRayLength`).** The dead path bounded
  `Zstepped > MaxRayLength` (a runtime-traced local — flagged INFER). The live loop bounds
  `mZZ > Zend` where `Zend := MaxCD(1e-10, (dZend − dZstart) / StepWidth)` — **fully
  source-settled from header fields**, retiring the "MaxRayLength needs harness" open item
  [VERIFIED CalcThread.pas:253; HeaderTrafos.pas:778-779].
- **`msDEstop` rescale base (`DEstop`, was `StartDEstop`).** The dead path rescaled off an
  RMrec `StartDEstop` seed (INFER `CalcSR.pas`) using a projected position
  `Clamp0D(ActZpos + Zstepped·ZZposMul)`. The live loop rescales off `DEstop` directly with
  raw `mZZ`: `msDEstop := DEstop·(1 + mZZ·mctDEstopFactor)` — no `StartDEstop`, no `ActZpos`,
  no `ZZposMul`. Retires the `INFER CalcSR.pas` open item [VERIFIED CalcThread.pas:141, 221].
- **Normals dispatch (indirect, was direct).** The spec described a direct call to
  `RMCalculateNormals`; the live marcher calls through a function pointer
  `TCalculateNormalsFunc(pCalcNormals)`, assigned once to `RMCalculateNormals`
  (`NormalsOnDE`) or `RMCalculateNormalsOnSmoothIt` (else). `RMCalculateNormals` is a live
  target, but reached through the pointer (§8) [VERIFIED CalcThread.pas:243;
  HeaderTrafos.pas:959-960].
- **First-step jitter mantissa (full 31-bit, was 15-bit).** The dead path used
  `(seed shr 16) and $7FFF` ×1/32768; the live path uses the full `(seed and $7FFFFFFF)` ×
  `dSeedMul = 1/$7FFFFFFF` (§3.4) [VERIFIED CalcThread.pas:214-216; TypeDefinitions.pas:1107].
