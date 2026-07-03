# MB3D Render-Pipeline Spec — Canonical Corrections Ledger

**Status:** authoritative correction layer over the four render-geometry research docs
(`render-divergence.md`, `render-conversion-plan.md`, the brief, and the relevant ADR-0083
render claims). Where this ledger and an older doc disagree, **this ledger wins**.

**Source tree:** `H:\tmp\mb3d-src` (MB3D Delphi/Pascal source). All NEW facts below are
grounded in lines re-read against source during this pass; OLD facts cite the dead
`Calc.pas` `RayMarch` procedure that the spec was mistakenly built on.

---

## The discovery

The entire render spec was anchored to **dead code**.

`RayMarch` (forward-declared `Calc.pas:21`, implemented `Calc.pas:1815`) and its sibling
`RayMarchVV` (`Calc.pas:1944`) are **never called anywhere**. A comprehensive grep for the
bareword `RayMarch` across every `.pas / .inc / .dpr / .dfm` in the tree returns **only the
three definition sites** — no call sites, no procedure-pointer assignment, no asm `call`:

```
Calc.pas:21:   procedure RayMarch(RMrec: TPRaymarchRec);          { forward decl }
Calc.pas:1815: procedure RayMarch(RMrec: TPRaymarchRec);          { impl — dead }
Calc.pas:1944: procedure RayMarchVV(RMrec: TPRaymarchRec);        { impl — dead }
```

The **live** primary geometry marcher is **`TMandCalcThread.Execute`** in `CalcThread.pas`.
Its march loop is **inlined** in the worker thread's `Execute` — the first loop body runs
`CalcThread.pas:128-258`, terminating at `:253`. The thread is spawned at:

```
Calc.pas:209:  MandCalcThread[x - 1] := TMandCalcThread.Create(True);
```

`TMandCalcThread.Create(True)` (suspended) → `Start` → `Execute`, which inlines the full
march loop. `RayMarch` is a stale/abandoned refactor target that was never wired in.

**Provenance of the error.** The brief, ADR-0083, and prior importer sessions all assumed
`RayMarch` was the live marcher and read the step formula, the termination bound, the
msDEstop scaling, and the normals call out of `Calc.pas:1815-2000`. This is the **same class
of error the importer's own history repeatedly warns about** — building on a plausible-looking
but unreachable procedure (cf. the converter memory's record of dead-path anchoring, e.g. the
DEopt-11 red herring and the `_updateC2` dead-modulation findings). The mechanics are *similar*
enough between dead `RayMarch` and live `Execute` that the spec's conclusions mostly survive —
but several specific claims were anchored to the wrong file:line and one (the step formula) is
substantively different and must change.

---

## Old → New fact table

Every spec claim that must be re-anchored. OLD = dead `RayMarch` (`Calc.pas`) file:line +
statement. NEW = live `TMandCalcThread.Execute` (`CalcThread.pas`) / `HeaderTrafos.pas`
file:line + corrected statement.

### 1. Marcher identity

| | |
|---|---|
| **OLD** | `Calc.pas:1815` `procedure RayMarch(...)` — "the primary ray-marcher; the spec's step/termination/normals are read from here." |
| **NEW** | `CalcThread.pas:128-258` `TMandCalcThread.Execute` (inlined loop), spawned `Calc.pas:209`. `RayMarch`/`RayMarchVV` are **dead** (zero call sites). Read all marcher mechanics from `Execute`. |

### 2. Step-advance formula (the substantive change)

| | |
|---|---|
| **OLD** | `Calc.pas:1878` — `dTmp := dTmp * sZstepDiv * RSFmul;`  (plain DE × stepdiv × damper, no safety term, no floor). |
| **NEW** | `CalcThread.pas:200` — `dTmp := MaxCS(s011, (dTmp - msDEsub * msDEstop) * sZstepDiv * RSFmul);`  Two differences the dead path lacks: **(a)** a safety-subtraction `(DE − msDEsub·msDEstop)` *before* scaling, and **(b)** an `s011` (= 0.11, `TypeDefinitions.pas`) floor via `MaxCS`. `msDEsub` is gated/derived per scene (see §6 of this table + "New importer consideration"). |

### 3. Termination bound

| | |
|---|---|
| **OLD** | spec phrased termination against a conceptual "`MaxRayLength`" and flagged it as needing a runtime harness to pin down ("MaxRayLength needs harness" INFER). |
| **NEW** | **Source-settled, no harness needed.** Live loop terminates `CalcThread.pas:253` — `until (mZZ > Zend) or PCalcThreadStats.pLBcalcStop^;` where `Zend := MaxCD(1e-10, (dZend - dZstart) / StepWidth)` (`HeaderTrafos.pas:779`; `StepWidth := dStepWidth`, `:778`). `Zend` is the real march bound — a normalized camera depth range over step width, **fully derivable from header fields**. This retires the "MaxRayLength needs harness" open item. |

### 4. msDEstop scaling

| | |
|---|---|
| **OLD** | `Calc.pas:1868` — `msDEstop := StartDEstop * (1 + Clamp0D(ActZpos + Zstepped*ZZposMul) * mctDEstopFactor);`  (scales on a **projected** Z position via a dot-product multiplier). |
| **NEW** | `CalcThread.pas:221` — `msDEstop := DEstop * (1 + mZZ * mctDEstopFactor);`  scales **directly on `mZZ`** (the accumulated marched ray distance). Re-evaluated every step. `mctDEstopFactor := GetDEstopFactor(@Header)` when `bVaryDEstop`, else `0` (`HeaderTrafos.pas:861-862`). Initial `DEstop := MaxCS(s0001, sDEstop)`. |

### 5. Normals

| | |
|---|---|
| **OLD** | spec described a direct call to `RMCalculateNormals` (`Calc.pas:776`) inside the marcher. |
| **NEW** | `CalcThread.pas:243` — `TCalculateNormalsFunc(pCalcNormals)(MCTparas, RSFmul);` — an **indirect function-pointer** dispatch. `pCalcNormals` is assigned **once** at `HeaderTrafos.pas:959-960`: `RMCalculateNormals` when `NormalsOnDE`, else `RMCalculateNormalsOnSmoothIt`. Both targets use probe offset `Noffset := MinCS(1, DEstop) * (1 + mZZ * mctDEstopFactor) * 0.15` and central differences; the SmoothIt target reads `pIt3Dext.SmoothItD` (via `mMandFunction`) instead of `CalcDE`. `RMCalculateNormals` *is* a live target (it is one of the two funcptr candidates) — but it is reached **through the pointer**, not the call the dead `RayMarch` made. |

### 6. Max-step clamp — **UNCHANGED** (holds)

| | |
|---|---|
| **OLD** | `Calc.pas:1879` — `dT1 := MaxCS(msDEstop, 0.4) * mctMH04ZSD;` |
| **NEW** | `CalcThread.pas:201` — `dT1 := MaxCS(msDEstop, 0.4) * mctMH04ZSD;` — **byte-identical** to the dead path. `mctMH04ZSD := Max(iMandWidth, iMandHeight) * s05 * Sqrt(sZstepDiv + s0001) * MaxCS(s001, sRaystepLimiter)` (`HeaderTrafos.pas:860`; alt for dIFS `DEoption=20` at `:908` collapses to `Max(iMandWidth, iMandHeight)` only). The clamp survives the re-anchoring verbatim. |

### 7. Prior importer fudge-floor-0.4 fix — **REMAINS VALID**

The previously-landed importer fix (fudge floor 0.4, commit `0179051`) maps to the **identical
live clamp** at `CalcThread.pas:201` (`MaxCS(msDEstop, 0.4)`). Because the live and dead clamps
are byte-identical, the fix targets the right behavior — it was never anchored to the dead path's
mechanics, only to this `0.4` floor, which is live. **No change required.**

---

## What HOLDS unchanged

These findings were *not* anchored to the dead `RayMarch` body and survive the re-anchoring.
Verified each against the live source.

- **The no-step-cap thesis HOLDS** — re-anchored to `CalcThread.pas:253`. The live loop's only
  exit conditions are `(mZZ > Zend)` (distance) and `PCalcThreadStats.pLBcalcStop^` (user stop).
  `StepCount` accumulates at `:204-209` (and `:254-257` for the post-loop shadow/fog total) **for
  fog/shadow length reporting only** — it never appears in the `until` and never gates the loop.
  There is no iteration-count or step-count ceiling on the march. (This was the central
  divergence finding; it stands, now cited to the correct line.)

- **The central GMT 2000-cap divergence HOLDS.** GMT's marcher imposes a fixed step cap (≈2000)
  that MB3D's live marcher does not have. The divergence is real and unchanged by this
  re-anchoring — if anything it is *reinforced*, because the live loop confirms MB3D caps only on
  distance (`Zend`), never on step count.

- **DE dispatch / iteration-weave / numeric-DE / hit-threshold findings HOLD.** These were read
  from `CalcDE` (`formulas.pas` / the formula dispatch) and `HeaderTrafos.pas` — **not** from
  `RayMarch`. Verified none of them cited a `RayMarch` line:
  - The numeric-DE formula site is `de.ts` (GMT) ↔ MB3D `Calc.pas:503` `CalcDE` body — not
    `RayMarch`. (See A-1 below for the substantive correction to the "byte-for-byte" claim.)
  - The hit-detection / set-found gate is `CalcThread.pas:234` `DElimited := (ItResultI <
    MaxItsResult) or (dTmp < msDEstop)` — live, not `RayMarch`. Post-hit refine gated `if
    iDEAddSteps <> 0` (`:235`) → `RMdoBinSearch` (DElimited) / `RMdoBinSearchIt` (else).
  - The iteration-weave / hybrid findings are anchored to the formula registry + weave code,
    untouched by the marcher identity.

---

## Critic punch-list resolutions

(Verbatim adjudications carried into this ledger; apply during patching of the four docs.)

- **A-1 [BLOCKING]:** "byte-for-byte" numeric-DE is **FALSE**. MB3D `Calc.pas:503` =
  `bufRout*Ln(bufRout)*dDEscale/(Sqrt(Rst+wt+dt)+mctDEoffset006)`; GMT `de.ts:200` =
  `R0*log(...)*uNumDEeps*e/(g+e*0.06)`. GMT adds a `*e` numerator factor + an `e*0.06` denom term
  (probe-invariance). Replace every "byte-for-byte" (`render-divergence.md` DE-3 + §6;
  `render-conversion-plan.md` "Fully settled") with **"faithful but probe-invariant-adapted (adds
  an `e` factor; see gmt-spec amendment)"**. Keep the conclusion: **the divergence is routing, not
  the formula.**

- **A-2:** the `numericDistance` formula site is **`de.ts:190-202` (esp. `:200`)**, NOT `de.ts:38`
  (`:38` is the rationale comment). Fix the stale anchors.

- **C-7 / D-1:** `render-divergence.md` DE-3 lists **Melting** among "dust/black", but the ledger
  says Melting is **FIXED** (`34033d4`, residual = colour tint). Reconcile (remove Melting from the
  dust/black list; note residual is colour). Soften the **MR-3 / HT-4** absolutes ("silently
  unreachable regardless of authored value") to **"pending the Zend/MaxRayLength relationship"** —
  now that `Zend` is source-settled (§3 above), revisit whether these were truly unreachable. Add
  **positive parser anchors** next to the grep-negatives (the `parseMB3D` field list), so a reader
  sees what *is* parsed alongside what isn't.

- **E [coverage gap]:** post/shading/colour has **no divergence pass** — see the stub below.

---

## Shading & colour — known gap

The four render-geometry docs cover **geometry** (marcher, step, termination, DE, normals,
hit-detection). They do **not** cover the render-side colour/shading divergence.

- **Shading / material / colour IMPORT** is covered by
  `h:/GMT/workspace-gmt/stable/plans/mb3d/research/lighting-import-spec.md`.
- The **render-side colour/shading DIVERGENCE** — how the orbit-trap → palette mapping, tone-map,
  and fog/glow are *applied* in the marcher vs GMT — is a **named follow-up**, explicitly **not**
  in these four render-geometry docs. (The live marcher touches this at, e.g., `RMdoColor`
  `CalcThread.pas:247`, `CalcZposAndRough` `:248`, and the `StepCount`-derived shadow at `:256-257`,
  but a full divergence pass over orbit-trap→palette / tone-map / fog-glow has not been done.)

This is a coverage gap, not a resolved item. Reference `lighting-import-spec.md` for the import
side; the render-side colour divergence remains open.

---

## New importer consideration

**`iOptions` bit 2 → `msDEsub` step-safety is a per-scene render lever the importer currently
ignores.**

The live step formula's safety-subtraction term `msDEsub` (`CalcThread.pas:200`) is gated by
`iOptions` bit 2 (`HeaderTrafos.pas:961-964`):

```
if (iOptions and 4) = 0 then msDEsub := 0
else begin
  sZstepDiv := sZstepDiv * sZstepDiv + (1.2 * sZstepDiv) * (1 - sZstepDiv);  { remap }
  msDEsub   := MinCS(0.9, Sqrt(sZstepDiv));
end;
```

When the bit is **clear**, `msDEsub = 0` → the step formula reduces to `MaxCS(s011, DE *
sZstepDiv * RSFmul)` (the safety term vanishes; only the `s011` floor differs from the dead path).
When the bit is **set**, `sZstepDiv` is remapped through the quadratic blend `s² + 1.2·s·(1−s)`
**and** `msDEsub = MinCS(0.9, Sqrt(remapped sZstepDiv))` — both the *effective step division* and a
*per-step DE safety subtraction* change. This materially affects surface convergence and how
aggressively the march under-steps near the surface.

The importer does **not** currently read `iOptions` bit 2, so it cannot reproduce either the
`sZstepDiv` remap or the `msDEsub` safety subtraction — both are silently dropped to the
bit-clear path. This is a per-scene render lever worth surfacing in the importer (read `iOptions`,
branch on bit 2, carry `msDEsub` + the remapped `sZstepDiv` into the GMT step parameters).
