# Which GMT formulas could get perturbation deep zoom

Written 2026-10-07, read-only pass, about 9 minutes. Paths are relative to the worktree root unless
they start with `mandelbulb_deepzoom/`.

**How much of this is tested: one case.** The standalone page has only ever proven the Mandelbulb
with integer powers. Everything below about other formulas is reasoning from the mathematics of
the iteration as written in the formula's GLSL. Nothing here was run. Where I classified a formula
from its one-line description without reading its GLSL body, the table says "desc only".

## 0. What the proven kernel actually needs (the yardstick)

From `mandelbulb_deepzoom/index.html` (comment block `THE δ KERNEL — shared exponent`, and
`atan2Acc`) and `mandelbulb_deepzoom/docs/scaled-kernel-and-accuracy.md` §1-2:

- Reference orbit Z_n: built on the CPU in BigInt fixed point, uploaded as a float texture.
- Per-pixel state: δ as one `vec3` of f32 mantissas plus ONE integer exponent (δ = D·2^e); the
  running derivative and the distance estimate as scalar mantissa+exponent pairs because they
  overflow f32.
- The step computes f(Z+δ) − f(Z) without ever forming Z+δ and subtracting: angle differences via
  an accurate atan2 (the built-in `atan` on ANGLE/D3D11 is off by 1.2e-5 rad, about 1800 f32
  epsilons), `sin` and `cos − 1` from polynomials that do not cancel, and a binomial expansion for
  the radius power.
- Rebase (Zhuoran), escape, and reference-exhaustion logic.

So the test for any other formula is: **can f(Z+δ) − f(Z) be written with no catastrophic
cancellation, using only Z (known to f32 relative precision from the reference) and δ?**

## 1. First, GMT's own Mandelbulb is wider than the proven case

`engine-gmt/formulas/Mandelbulb.ts`, `formula_Mandelbulb`:

- Power is a continuous float (`float power = uParamA`, used in `pow(r, power - 1.0)`). The page's
  kernel covers integer powers 2-16 (per the brief; the binomial expansion needs an integer).
  A non-integer power needs a different radius-difference form (a `log1p`/`expm1`-style series
  rather than a finite binomial). Not proven anywhere.
- Phase shifts `uVec2A.x / .y` are added to theta and phi. The page has phase.
- A Z-twist (`uParamD`): rotates xy by an angle of `z3.z * uParamD` after the power. This is a
  second non-linear stage. Its delta form is a rotation-angle difference (same sin / cos−1
  machinery), so possible in principle, but not in the page.
- Angle convention: `theta = acos(z/r)`, output `zr * (sin θ cos φ, sin φ sin θ, cos θ)`. Whether
  this matches the page's convention exactly is unverified; a mismatch means a different picture,
  not a failure.

Consequence: "deep zoom for the Mandelbulb in GMT" on day one means integer power, twist 0. The
UI has to say so, or the tool has to snap/disable those params while deep zoom is on.

## 2. The classes

Registered set: `engine-gmt/formulas/index.ts`, the `formulas` array (48 formula files plus the
generated box-fold formulas in `boxFolds.ts`; the array has three groups: "Featured / Cool",
"Others", "Hybrids & Variants", then `Modular`).

### (a) Power maps in spherical coordinates

| Formula | Read? | Notes |
|---|---|---|
| Mandelbulb | body read | see §1 |
| Buffalo | body read (`formula_Buffalo`) | bulb power, with optional per-axis `abs` before (`uVec3B`) and after (`uVec3A`), and `gmt_applyRodrigues` (a rotation; linear) |
| Phoenix | first half read (`phoenixBulbPow`, `formula_Phoenix`) | bulb power plus a term from the previous iterate (`z_prev`), plus stretch, pre-rotation and a z-twist |
| BoxBulb | body read (`formula_BoxBulb`, `DE_Bulb`) | box fold + sphere fold + scale, THEN bulb power. Class (a) and (c) together |
| Mandelorus | first third read | toroidal split: complex power on the cross-section `q = (length(p.xy) − R, z)`, optional twist. A complex power is the 2D case of the bulb kernel, so the fibre step is easier than the bulb; the `length(p.xy) − R` decomposition needs its own difference form (a sqrt difference, which is cancellation-free as (2P·δ + δ·δ)/(|P+δ| + |P|)) |

- **Possible in principle:** yes. Mandelbulb is proven. Buffalo is the bulb kernel plus the
  abs-difference primitive from class (c) (the same step from Mandelbrot to Burning Ship in 2D).
- **Reference orbit:** Z_n as now. Phoenix needs Z_n and Z_{n−1}, which the orbit texture already
  holds as adjacent rows.
- **Per-pixel state:** δ (vec3 + exponent). Phoenix adds δ_prev (second vec3, can share the
  exponent bookkeeping but is a second register).
- **Distance estimate:** the same scalar running derivative as now (`dr = rp1 * power * dr + 1.0`
  in every one of these), carried as mantissa+exponent.
- **Main obstacle:** the kernel is integer-power only. Second: any abs fold means the pixel and
  the reference can land on opposite sides of a fold plane; see (c).

### (b) Algebraic (polynomial) maps

| Formula | Read? | The map |
|---|---|---|
| Mandelbar3D | body read (`formula_Mandelbar3D`) | x' = x²−y²−z², y' = 2xy, z' = −2xz; then `* scale + c + uVec3A` |
| MakinBrot | body read (`formula_MakinBrot`) | x' = x²−y²−z², y' = 2xy, z' = 2z(x−y); same tail |
| Bristorbrot | body read (`formula_Bristorbrot`) | x' = x²−y²−z², y' = y(2x−z), z' = z(2x+y); same tail, plus a z-twist `uParamD` |
| Quaternion | first half read (`quatSquare`, `formula_Quaternion`) | 4D quaternion square + c, four fixed rotations, and an "iteration damping (Kosalos)" term using the previous z (not read to the end) |
| Tetrabrot | body read (`tetraSquare`, `formula_Tetrabrot`) | 4D bicomplex-style square + c, three fixed rotations |

- **Possible in principle:** yes, and this is the easiest class. Each map is a quadratic form
  Q(z). Then Q(Z+δ) − Q(Z) = 2·B(Z,δ) + Q(δ), where B is the matching bilinear form. That is an
  exact polynomial identity: no trig, no atan, no series, no accuracy floor from GPU built-ins.
  It is the direct 3D/4D analogue of the 2D Mandelbrot step 2Zδ + δ².
- The fixed rotations (`gmt_applyRodrigues`, the `mat2` blocks) are linear, so they apply to δ
  unchanged. `gmt_applyTwist` (Mandelbar3D, MakinBrot) and Bristorbrot's `uParamD` twist rotate by
  an angle that depends on z; with the twist param at 0 the map is a pure polynomial. I did not
  read `gmt_applyTwist`'s body (unverified).
- **Reference orbit:** Z_n in BigInt, 3 components (4 for Quaternion and Tetrabrot). The BigInt
  step is a handful of multiplies, cheaper than the bulb's.
- **Per-pixel state:** δ as vec3 (vec4 for the 4D ones) + one exponent.
- **Distance estimate:** all five use `dr = 2.0 * length(z) * dr + 1.0` (times `abs(scale)` where
  there is a scale). Same scalar derivative as the bulb, carried as mantissa+exponent. No change
  in kind.
- **Main obstacle:** not the maths. It is whether these are worth it: all five sit in the
  "Others" or "Hybrids & Variants" groups of the registry, not in "Featured". Quaternion's damping
  term makes it a two-register map like Phoenix. Whether these scalar-derivative estimates stay
  usable at depth for non-conformal maps is untested (they are bounds, not exact, already today).

### (c) Fold-and-scale maps (piecewise affine or conformal)

Read in full: `formula_AmazingBox` (rotation, `boxFold`, `sphereFold`, `* uParamA + c`),
`formula_Kleinian` (clamp fold, inversion `k = max(uParamC / r2, 1.0)`, scale + offset + c),
`formula_KaliBox` (`abs(p) + uVec3A`, clamped inversion, scale + c), and the first part of
`formula_MengerSponge` (abs, a three-way sort, scale and shift, plus a cutting-plane distance
`cp_dmin` / `cp_scale`). The shared helpers are `boxFold` and `sphereFold` in
`engine-gmt/shaders/chunks/math.ts`.

Classified from description only: AmazingSurf ("sinusoidal variation", so it may have a
non-affine stage), AmazingSurface, KleinianJos, KleinianMobius, PseudoKleinian, PseudoKleinian06
(`PseudoKleinianAdv.ts`), PseudoKleinianMod4, MengerAdvanced, MarbleMarcher, MixPinski (4D),
SierpinskiTetrahedron, Dodecahedron, Octahedron, Icosahedron, Cuboctahedron, TruncatedIcosahedron,
RhombicDodecahedron, RhombicTriacontahedron, GreatStellatedDodecahedron, Coxeter, Claude,
Apollonian, and the generated fold formulas in `boxFolds.ts`. About 25 formulas, half the catalog.

- **Possible in principle:** yes. Between folds the map is affine (δ' = scale · R · δ, exact) or
  a sphere inversion (conformal, with a cancellation-free difference). The pieces needed:
  1. **abs difference:** |Z+δ| − |Z|, evaluated by cases on the signs of Z and Z+δ so it never
     subtracts two nearly equal numbers. This is exactly the `diffabs` the 2D world uses for the
     Burning Ship.
  2. **clamp-fold difference** for `boxFold` (`clamp(z,−L,L)*2 − z`): piecewise linear with two
     breakpoints per axis; same case analysis with Z∓L taken from the reference at high precision
     before it is rounded to f32.
  3. **sort / max-min difference** for Menger-type folds: a permutation chosen by comparisons of
     Z+δ components; needs the differences Z_x − Z_y from the reference at high precision.
  4. **sphere-fold difference:** z·k(z) with k = clamp(R²/r², …). The change in r² is
     2Z·δ + δ·δ (no cancellation), so k(Z+δ) − k(Z) is too. Each clamp region is a case.
  5. Plane reflections for the polyhedral KIFS: the abs-difference along a fixed normal.
- **Reference orbit:** Z_n in BigInt as now. Extra per-iteration rows are needed: the signed
  distances of Z_n to each fold boundary (Z∓L, Z_x−Z_y, |Z|²−R²), computed in BigInt and then
  rounded, because those are the small numbers the case tests compare δ against.
- **Per-pixel state:** δ (vec3 + exponent). No angles.
- **Distance estimate:** the box family uses the scalar `dr = dr * abs(scale) + 1.0` (times k at
  inversions): trivially carried as mantissa+exponent. The Menger/polyhedral family uses a
  cutting-plane distance (`cp_dmin = max(cp_dmin, cp_scale * d_face)` in `formula_MengerSponge`):
  `d_face` is (Z + δ − offset), which must be formed as (Z − offset) from the reference plus δ,
  and `cp_scale` shrinks by `scale` each iteration so it needs an exponent.
- **Main obstacle:** fold crossings. When the pixel and the reference fall on different sides of
  a fold, δ jumps to about the size of Z and the "δ is small" premise is gone. The 2D answer is
  to rebase onto the reference; in 3D with many folds per iteration (three abs, a sort, an
  inversion clamp) crossings happen far more often than in the Burning Ship. How often the page's
  rebase logic would fire, and whether one reference still serves a whole frame, is unknown. This
  is the open research question of this class, not an implementation detail.
- **A caveat on value:** the pure IFS members with no `+ c` and fixed parameters (Menger,
  Sierpinski, the polyhedra) are exactly self-similar. A zoom to 1e-77 shows the same picture
  every factor of `scale`. A wrap-around zoom gives the same result without any perturbation.
  The box/Kleinian members with `+ c` are not self-similar and do gain.

### (d) Hybrids, special maps, and non-iterated geometry

| Formula | Why it is here |
|---|---|
| Modular | user-built node graph (`Modular.ts`, "custom fractal equations using a Node Graph"); a perturbed kernel would have to be generated per graph from per-node delta rules |
| Julia3D, Julia3DKucera, Julia3DLattes, Julia3DZorich | Kučera / Zorich / Lattès maps (desc only; not read). Not a polynomial in 3D and not a plain power map; each needs its own derivation |
| SineJulia3D | "3D extension of s·sin(z)+c" (desc only). A sine difference has a clean identity, sin(Z+δ)−sin(Z) = 2cos(Z+δ/2)·sin(δ/2), so plausible, but unexamined |
| MandelTerrain, MandelMap, JuliaMorph, MandelBolic | built on the 2D Mandelbrot/Julia or on a re-projection of the bulb (desc only). The 2D iteration is the textbook perturbation case; the 3D shape around it (height field, projection, stacking) is not an escape-time iteration and needs a separate argument for how depth enters |
| Borromean, Appell | "three interlocking complex planes", "Appell polynomial" (desc only). Probably polynomial, so may belong in (b); not read |
| BoxBulb | fold stage + bulb stage in one step: needs both (a) and (c) machinery |
| Anything using the weave / interlace / hybrid system, or surface noise and textures | not read in this pass (unverified). In principle a per-iteration switch between two formulas needs both delta kernels compiled in and a reference orbit built with the same schedule; noise and textures sampled at fractal-space position need the position, which at depth is only known as reference + δ |

- **Possible in principle:** case by case. No blanket answer.
- **Main obstacle:** each is its own derivation, and for Modular a generator.

## 3. First five after the Mandelbulb

Ranking is (demand the repo shows) × (ease). **The repo shows very little demand evidence**: the
gallery lives on the server, `public/scenes/` holds one bundled scene (a Mandelbulb), and the
tutorial (`app-gmt/tutorial/lessons.ts`) uses the Mandelbulb. The only ordering signal is the
`formulas` array in `engine-gmt/formulas/index.ts`, whose first group is labelled
"Featured / Cool". I used that as "demand"; treat it as weak. A query of the gallery table for
formula counts would replace my guess with a number.

1. **Mandelbar3D** (with MakinBrot and Bristorbrot coming almost free from the same template).
   Ease: highest of anything in the catalog; the delta step is an exact polynomial, no accuracy
   work. Demand: low ("Others"). Ranked first anyway because it is the cheapest way to prove the
   second-formula seam (formula-supplied BigInt step + formula-supplied GLSL delta step) before
   anything hard depends on it.
2. **AmazingBox** (the Mandelbox). Demand: in the featured group, and the best-known 3D fractal
   after the bulb. Ease: medium; needs the clamp-fold and sphere-fold differences and a first
   answer to the fold-crossing question. Those two primitives are shared by BoxBulb, Kleinian,
   the PseudoKleinians and the `boxFolds.ts` family.
3. **Buffalo**. The proven bulb kernel plus the abs-difference primitive. Demand: low-medium
   ("Hybrids & Variants"), but it is the smallest step that puts a fold into the tested kernel,
   so it is the cleanest test bed for crossings.
4. **KaliBox** or **Kleinian** (both featured). Reuse the primitives from 2 and 3: abs + clamped
   inversion + scale. Pick whichever the gallery shows more of.
5. **Quaternion**. Polynomial, 4-component δ, famous. Lower because of the damping term (a
   previous-iterate register) and because the quaternion Julia surface is known to be smoother at
   depth than the others, so the visual payoff is smaller (reasoned, not measured).

Deliberately not in the five: **MengerSponge** (featured and the maths is easy, but exact
self-similarity means deep zoom shows nothing a wrap-around zoom would not), **Phoenix** (two
registers plus twist plus stretch on top of the bulb), **Mandelorus** (featured, plausible, but
needs its own derivation and I read only a third of it), **Modular** and the **Julia3D** family.

## 4. What the engine needs so that this list is possible at all

From the first investigation (`debug/scratch/dz-wf1-result-1.txt`, section (b) item 1): the
formula declaration in `engine-gmt/types/fractal.ts` has no slot for a perturbed iteration or a
reference-orbit builder. Per formula, deep zoom needs three things the formula author supplies:

- a BigInt reference step (TypeScript, runs in the worker),
- a GLSL delta step with the signature of the page's kernel (δ mantissas + exponent in and out,
  reads the reference rows),
- the list of extra reference rows it wants (fold-boundary distances for class (c)),

plus a declared parameter envelope ("integer power, twist 0") that the UI can enforce. Item 1 in
the ranking exists to shake this contract out on the easiest possible maths.
