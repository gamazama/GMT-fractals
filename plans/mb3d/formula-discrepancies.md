# MB3D ↔ GMT formula discrepancy ledger

Tracks where GMT's formulas diverge from Mandelbulb3D's, so the MB3D importer can
transpile MB3D's **real** math (not assume name-equality) and so we know which of
**our** formulas to fix later.

Derived 2026-06-25 by reading MB3D Pascal/x87 source (`CustomFormulas.pas`,
`formulas.pas`) against GMT's GLSL (`engine-gmt/formulas/*.ts`,
`engine-gmt/shaders/chunks/math.ts`). The MB3D importer transpiles directly from
the MB3D math below; this table is the audit trail + a GMT-fix worklist.

> **Key finding:** of MB3D's 7 built-in formulas, **only Amazing Box matches our
> same-named formula** — and only at `paramD (Fixed Radius) = 1`. Every other GMT
> formula computes something *different* from the MB3D formula it shares a name
> (or vibe) with. Do **not** route an MB3D import through a GMT formula by name.

## Section A — intern formulas (MB3D source is readable; we transpile it)

| MB3D # | MB3D formula | Nearest GMT | Verdict | Divergence (→ GMT fix candidate) |
|---|---|---|---|---|
| 0 | Integer Power (p2 sine bulb) | `Mandelbulb` | **DIFFERS** | MB3D is a trig-free **latitude** triplex (`a=(R−z²)/R`); GMT uses `acos` **colatitude**. Numerically different even at p2 (at (1,0,1): GMT z′=0, MB3D z′=2). Different pole axis. MB3D also has a Z-multiplier GMT lacks. **GMT's Mandelbulb is NOT MB3D's default bulb.** |
| 1 | Real Power (arbitrary float power) | `Mandelbulb` | **DIFFERS (closest twin)** | Same base spherical bulb, but MB3D uses latitude `asin(z/r)` vs GMT colatitude `acos(z/r)`, MB3D has a **Z-multiplier** (no GMT lever), GMT adds phase (`vec2A`) + Z-twist (`paramD`) + Radiolaria that MB3D lacks. Equal only at Zmul=1, phase=0, twist=0, radiolaria off. |
| 2 | Quaternion | `Quaternion` | **DIFFERS** | MB3D adds non-cancelling Hamilton cross-terms (`z·w` in y′, `y·w` in z′ scaled by YWmul, `y·z` in w′) **plus a `Wadd` constant**. GMT `quatSquare` is the pure scalar·vector square (cross terms cancel). Structurally different even at YWmul=0/Wadd=0. Param meanings also differ. |
| 3 | Tricorn (triplex Mandelbar) | `Mandelbar3D` | **DIFFERS** | x′,y′ match (`2xy`). z′ differs: GMT `z′=−2xz`; MB3D `z′=+Zmul·xz` (default **+1**, no factor 2). MB3D adds a CZ-multiplier on the z-constant. (`Buffalo.ts`, named the closest-by-vibe, is unrelated — a Mandelbulber abs-fold bulb.) |
| 4 | Amazing Box (HybridCube) | `AmazingBox` | **MATCH @ paramD=1** | Box-fold identical; sphere-fold+scale identical **iff GMT FixedRadius=1** (MB3D hardwires fixed radius=1). ⚠ GMT's shipped default preset sets `paramD=1.637` → diverges at the default. GMT exposes a FixedRadius MB3D #4 has no equivalent for. |
| 5 | Bulbox (HybridSuperCube2) | `BoxBulb` | **DIFFERS** | MB3D is a **radius-gated blend** between a sine bulb and amazing box (two R² thresholds, linear interpolate between); GMT BoxBulb is a fixed **sequential** boxFold→sphereFold→scale→bulb. Different composition AND different bulb sub-formula. No faithful equivalence. |
| 6 | Folding Int Pow (HybridFolding) | none | **NO GMT EQUIV** | Per-axis box-fold then call the inner integer-power sine bulb (#0 family). GMT BoxBulb is the nearest but uses sphereFold+scale+acos-bulb, not bare box-fold + latitude sine bulb. |

**GMT-fix worklist** (our formulas that don't do what their name implies vs the
field-standard MB3D math): `Mandelbulb` (colatitude vs latitude; no Z-mult),
`Quaternion` (missing MB3D's cross-terms — though GMT's is the "purer" square),
`Mandelbar3D` (z′ sign/coefficient), `AmazingBox` default `paramD≠1`. None are
*bugs* per se — they're convention choices — but worth documenting so a future
"MB3D-compatible" pass knows what to reconcile.

## Section B — external `.m3f` formulas (MB3D source is compiled `[CODE]`)

The popular add-on formulas ship as **compiled x87 machine code** in `M3Formulas/`
— their exact math is **not readable**, so we cannot transpile or even verify
them against GMT. Status today: **unsupported** in the importer (flagged, not
silently substituted). A future "best-effort" tier could substitute GMT's
same-named body, but every such substitution is unverifiable against MB3D and
must be flagged here.

| MB3D external | In repo as | GMT same-name | Status |
|---|---|---|---|
| Menger3 | `M3Formulas/Menger3.m3f` `[CODE]` | `MengerSponge`/`MengerAdvanced` | unverifiable — unsupported |
| Amazing Surf | `M3Formulas/Amazing Surf.m3f` `[CODE]` | `AmazingSurf`/`AmazingSurface` | unverifiable — unsupported |
| _Rotate | `M3Formulas/_Rotate.m3f` `[CODE]` | (a rotation transform) | unverifiable — unsupported |
| _SinY | `M3Formulas/_SinY.m3f` `[CODE]` | — | unverifiable — unsupported |
| AmazingBox2, ABoxPlatinum, … | `M3Formulas/*.m3f` `[CODE]` | partial | unverifiable — unsupported |

**Readable externals:** the `EM_JIT_M3Formulas/` pack (~497 files) ships JIT
`[SOURCE]` Pascal and **is** transpilable — a future expansion target. None of our
current real fixtures happen to use it.

## Coverage today

- **Faithful:** any scene whose every active slot is an intern #0–#4 formula AND
  weave mode 0 (ALTERNATE). Transpiled from MB3D's real math; verified to compile
  and render (see `debug/probe-mb3d-fused-shot.mts`).
- **Unsupported (flagged):** scenes with any external `[CODE]` slot (most classic
  art), intern #5/#6, or weave modes 1–3 (interpolate / CSG / KIFS).
