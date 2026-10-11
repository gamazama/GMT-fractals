# Can the Mandelbox take the ray march's step?

A math and CPU study, 2026-10-11. Paper and node only: no browser, no GPU, no tracked file touched.
Scripts and logs are beside this page (`debug/scratch/box-ray-study/`, git-ignored). Every number below is
tagged **[D]** derived on paper, **[M: script]** measured by that script here, or **[R: grep target]** read
from the notes.

## Verdict

**Yes. The box can take the ray march's step, and its orbits can be resumed along the ray - with four
pieces the bulb's march does not have (a fold-crossing test on resumed orbits, a guard for the early folds,
the set's ball in the estimate, a step aimed at the hit level), and without the bulb's longer step.**

| | today (x 0.85, start cap, 512 steps, far relax) | the candidate |
|---|---|---|
| rays on another surface than the careful march, mean of the 4 starters, Detail 32 / Detail 1 | 0.51 % / 0.31 % | 0.04 % / 0.05 % |
| the same over a dive of 40 views (scale -1.5 and 2, 9e-2 to 8e-31) | 1.09 % / 0.49 % | 0.32 % / 0.22 % (of it BEHIND the careful ray: 0.02 % / 0.04 %) |
| the same over 52 views at nine other parameter sets (scale 1.1 apart: 2.8) | 2.70 % | 0.42 % (behind 0.17 %, one view 2.44 %) |
| march steps a ray, against today | 1 | 0.58 (starters), 0.47 (dive), 0.67 (other scales) |
| kernel passes a ray, against today | 1 | 0.19 (starters), 0.21 (dive), 0.43 (other scales) |
| hits more than half a pixel cone off the careful surface ("rough": what draws terraces), starters, Detail 32 | 17 to 53 % | 0.1 to 0.5 % |

All [M: `02-bench.mts`, summed by `11-rules.mts`]. What it buys: no Step size, no far relax, a hit that
stands on the level it is tested against, 3 to 5 times fewer kernel passes at the two deep scale -1.5
starters and about 30 times fewer at the scale 2 one. What it does not buy: a longer step (the
line-against-the-ball rule gains nothing on the box), and anything for a ray that grazes a wall. **Nothing here ran on a GPU: steps and passes are counted,
milliseconds are not known.**

## 1. The question, and how it was measured

The Mandelbox is the last thing drawn by "distance estimate x Step size". Can it be drawn by the ray
march's step - one march rule for both formulas, no Step size, resumed orbits - and what would that buy?
(ADR-0135 decision 3 says the estimate would not be better: "with equal stretch on every axis the ray
estimate says what `dr` says".)

- **The code under test** is `boxOrbitJS` lifted from `deep-zoom/renderer/core.js` as text (as
  `debug/deep-zoom-checks/box-orbit.mts` lifts it), plus the study's own `jetOrbit` (`lib.mts`): the same
  step with a jet, a bend bound, a fold margin and checkpoints. `jetOrbit` = `boxOrbitJS` bit for bit on
  3,888 points [M: `01-jet.mts` A].
- **The referee** is a 2^-256 fixed-point orbit of GMT's shader text, sharing no code with either. At the
  end points of three marches on 256 rays a view, the twin and the referee never stand on different sides
  of the hit level (0 of 5,143 points; estimates within 3e-10) [M: `06-certify.mts`]. So a wrong ray below
  is the rule's, not the float's.
- **The measure** is the bulb bench's (`debug/deep-zoom-march-study.mts`), on the CPU: a picture of rays
  marched as a 1080-row picture; the careful march = the page's rule at a tenth of the estimate, 8 hit-refine
  halvings, 16,384 steps; a ray is *wrong* when it ends more than 2 display pixels of depth from the careful
  ray or hits where that misses; *behind* = the part that lies deeper (a surface stepped through);
  *rough* = right surface, more than half a pixel cone off; rays the careful march and one twice as careful
  disagree on are left out (0 to 0.1 % here).
- **Views**: the four box starters at the count the renderer's margin rule gives (128 x 128 rays; the
  whole-box card saves 14 iterations where the rule gives 51, see question 5); a *dive* - one ray into the box
  at scale -1.5 and at 2, a camera at ten depths from 9e-2 to 8e-31, looking ahead and 0.9 rad aside (40
  views, 40 x 40 rays); a *sweep* - scales 1.1, -1.1, 1.3, -1.3, -2, 3, -3, 4, GMT's default box with its
  pre-rotation, and a -1.7 variant, at three depths, two looks (56 views, 32 x 32 rays).
- **Not the GPU's**: f64 where the shader has f32 mantissas; no far hand-off (the same march runs to the edge
  of the box); no guided start.

## 2. The math

One iteration: `u = R z`, box fold `w_a = u_a` (|u_a| <= L) or `+-2L - u_a`, sphere fold `k = F^2/m^2`
(|w| < m), `F^2/|w|^2` (the shell, m <= |w| < F), `1` (outside), then `z' = S k w + c`.

**2.1 The jet through the folds [D].** For a ray `c = c0 + t v` (so `zdot_0 = v`):

    zdot' = S k H Sigma R zdot + v        Sigma = diag(+1 on an unfolded axis, -1 on a folded one)
                                          H = I - 2 w^ w^T in the shell (an inversion), I elsewhere

Three sign flips, in the shell one dot product and one subtraction of a vector, one scale: about a dozen
multiplies, no trigonometry. In the kernel's delta form the reference does not move with t, so `zdot` is the
derivative of the pixel's own delta and the flags are the pixel's own (`pr` in `boxFoldD`, the region `pr` of
the sphere fold; `w = W + E`). The carried vector equals a central difference of exact orbits to 2e-12 (688
points) [M: `01-jet.mts` C].

**2.2 What the ray estimate reads [D].** `S k H Sigma R` is `|S| k` times a rotation or reflection: it
stretches every direction alike. So `zdot_K = sum_j rho_j O_j v` (rho_j = the product of `|S| k` from
iteration j on, O_j orthogonal) while `dr_K = sum_j rho_j`: the scalar derivative is the sum of the SIZES of
the same terms. Hence, always,

    |zdot| <= dr        E = (r - 1) / |zdot|  >=  de = (r - 1) / dr        E = c(v) de,  c(v) >= 1

The terms fall off geometrically from j = 0, so c(v) is fixed by the first few iterations of the orbit: in a
deep view it is one number a ray. Measured: c changes by at most 7e-15 along a ray at the three deep
starters [M: `01-jet.mts` F]. Its size:

| | E / de |
|---|---|
| scale -1.5: Arches, Lace; the dive below 1e-2 | 1.02 to 1.13; 1.09 to 1.45 |
| scale 2: Block city; the dive below 1e-3 | 3.36 to 3.85; 3.2 to 5.65 |
| the whole-box view (shallow) | 1.00 to 2.73, and it changes along a ray by up to that much |

[M: `01-jet.mts` F, `04-ratio.mts`]. So ADR-0135's sentence holds at scale -1.5 and not at scale 2: **there
the scalar estimate is 3.4 to 5.6 times too short**, which is why today's march takes 100 to 200 steps a ray
at scale 2 and runs out of its 512 on 2 to 8 % of rays below 1e-8 at Detail 32 [M: `02-bench.mts`, rows a0]. As a share
of the distance actually left to the careful hit, on 28 views [M: `04-ratio.mts`, samples over 64 hit levels
out]: the scalar estimate reads at most 0.20 to 0.31 of it at scale 2 below 1e-4 (median 0.01 to 0.05) and 0.60
to 1.00 at -1.5; the ray estimate (as guarded in 2.3) reads 0.63 to 1.00 at the 99.5th percentile and **at most
0.76 to 1.12** - on a flat wall met head on it is exact. (The bulb's ray estimate: 0.41 to 0.90 at the
99.5th percentile, worst 1.5 to 2.5 in three views [R: BUILD-PLAN.md, "RESEARCH RESULT"].)

**2.3 The early folds [D].** The cancellation that makes |zdot| smaller than dr is good only while the folds
that produced it are not crossed. A box-fold plane crossed at pass i turns the terms before it and leaves
their sizes: it can change `|zdot_K|` by at most `2 rho_i / (|S| - 1)`, a share `2 / ((|S| - 1) |zdot_i|)` of
it - a pass where the jet is already long cannot matter. Carry VE, the least fold margin (2.6) over the
passes whose share is above 1/8. Past VE only the scalar bound holds:

    step <= de + VE (1 - de / E)          (= E while E <= VE)

In a deep view VE is astronomically larger than E and the guard is silent; from outside it is the whole
difference: at the whole-box view the bare ray estimate reads up to 4.95 times the distance left and puts
4.6 % (Detail 32) and 6.7 % (Detail 1) of rays behind; guarded, 0.01 % and 0.17 % [M: `04-ratio.mts`,
`02-bench.mts` rows b1, b3]. The share 1/8 is not delicate: 1/2 and 1/32 give the same shares to 0.01
[M: rows f2, f3]. What no guard covers, here or in today's rule: a SPHERE-fold surface crossed at a late
pass changes k, and with it |zdot| and dr alike. That is what makes the step a first-order number (section 3);
the scalar estimate, being c(v) times short, has that much room for it and the ray estimate has none.

**2.4 The ball in the estimate [D].** With `rho = (2 sqrt(3) L |S| + |c|) / (|S| - 1)`, every z outside the
ball |z| <= rho has `|f(z)| - rho >= |S| (|z| - rho)`: it can only leave. Both signs of scale, any
pre-rotation (checked on 400,000 random points for each of nine parameter sets: holds [M: `05-ball.mts` A]).
So an escaped iterate at radius r is `r - rho` from anything bounded, not `r - 1`, and the step's estimate
is `E (r - rho) / (r - 1)`. rho is 16 at the deep starters against an escape radius of 1000: 1.6 % of the
step. At scale 1.1 it is 630 and the estimate without it steps into the solid: 2.8 % of rays behind in one view,
0.0 % with it [M: sweep rows f8, f1].

**2.5 The hit level and the aimed step [D].** The hit test stays today's: the SCALAR estimate under a pixel
cone, `de < pa t`. That level stands c(v) cones above the surface itself - the box is drawn that fat today -
and a step of E, being right, lands at the BOTTOM of that shell: at Detail 1 at scale 2, 2 to 5.6 pixels
deeper than the careful hit (65 % of Block city's rays "wrong" by the 2-pixel measure, 24 to 74 % along the
scale-2 dive [M: rows b1 at Detail 1]). Since `de` falls by `de / E` a unit of ray, the step that ends q cones
under the level (the level taken where the step lands: it is a cone, `pa (t + s)`) is

    step = min( step,  ( E (1 - pa t / de) + q pa t ) / ( 1 + pa (E / de - q) ) )         q = 1/4

With it the hits stand on the careful surface: rough 0.1 to 0.5 % at the starters where today's rule has 17
to 53 %, for 5 to 15 % more steps than the un-aimed ray step at Detail 32 and 4 to 28 % at Detail 1. Aiming
at 0.9 of the level does the same (rows b5, b6); HIT LANDING, the free interpolation, does not (rough 7 % at
Detail 32, up to 2.2 % wrong at Detail 1: row b7) [M].

**2.6 Fold crossings and resumed orbits [D].** A resumed orbit takes a checkpoint (delta_k, zdot_k at the
top of pass k) of an earlier sample and adds `s zdot_k`. Two things can make that wrong.

*The bend.* Fold and scale are linear; only the shell's inversion bends. From
`D^2(F^2 w / |w|^2)[h, h]`, whose size is exactly `2 F^2 |h|^2 / |w|^3` in every direction:

    B' = |S| k B + [shell] 2 |S| F^2 |zdot|^2 / |w|^3         |d^2 z_k / dt^2| <= B_k,   Q_k = B_k / |zdot_k|

the same shape as the bulb's Q (its `(n-1)/rho` is `2/|w|`, shell iterations only), and here a true bound at
the point: the measured stray of an iterate is 0.49 to 0.71 of `s^2 B / 2` at the median and 0.94 at most
(308 points) [M: `01-jet.mts` D]. **Where no shell iteration lies before the checkpoint the resumed state is
exact**: at Block city (2 % of iterations in the shell; the path is straight to the last bit of the fixed
point) resumed orbits stand 7.6e-11 pixel from whole ones at worst; at scale -1.5 (55 % of iterations in
the shell) the tolerance is what limits the resume. Over a finite move the bound at the point is not enough: with no factor on it 8,364 of 157,997 resumed orbits
stood farther off than allowed (worst 0.06 px where 0.05 was asked); with 2, and with the bulb's 3, none of
157,936 and 157,774 [M: `03-resume.mts`].

*A crossing.* If between the two samples any iterate before pass k changes its branch of a fold, the linear
carry is wrong by the size of the move itself. The margin of one pass is the distance of the pixel's iterate
to the nearest fold surface over its speed,

    V_pass = min( |u_a - L|, |u_a + L| (a = x, y, z),  | |w| - m |,  | |w| - F | ) / |zdot|

all of which the kernel already forms (`ph`, `pl` in `boxFoldD`; `pm / (|w| + m)`, `pF / (|w| + F)`), and V_k
is the least of them over the passes before k: one square root, three divides and a few `min` a pass, one
float more a checkpoint. A checkpoint moved by s is good while

    |s| (1 + jerr + 3 |s| Q / 2) < V_k            and the resumed orbit goes on with V_k minus that

Exact when nothing bends; V never exceeded the true distance to the first change of branch, found by
bisection on exact orbits (688 points, 0 over; it is 0.35 to 0.74 of it at the median) [M: `01-jet.mts` E].
**In 136,626 resumed orbits of 28 views under the candidate's settings, none had an unseen crossing and none
stood farther off than the rule allowed (worst 0.0027 px).** Without the test 191,645 of 298,304 had one and
Block city is 100 % wrong. A cheaper-looking form - each fold plane's margin over the speed towards THAT
plane - is exact on straight paths (ratio 1.00) and unsound on bent ones: 10 unseen crossings in 158,399
[M: `03-resume.mts`, `02-bench.mts` rows c5, c6].

*What a crossing costs, by depth and scale* [M: `02-bench.mts`, `03-resume.mts`]:

| | whole orbit | passes a resumed orbit runs again: median / 95 % | what ends the search for a checkpoint |
|---|---|---|---|
| scale 2, every depth from 9e-2 to 9e-31 | 15 to 147 | 13 to 17 / 17 to 28 | a crossing (98 % of orbits; 11 passes an orbit more than the tolerance alone would run) |
| scale -1.5, every depth from 9e-2 to 8e-31 | 22 to 197 | 26 to 31 / 34 to 47 | the tolerance (94 %); a crossing 1 % (0.1 pass an orbit) |
| scales 3, -3, 4, GMT's default rotated (1e-3 to 1e-14) | 11 to 39 | 9 to 16 / 11 to 20 | |
| scales 1.3, -1.3 | 36 to 124 | 34 to 45 / 43 to 52 | the ring's reach (27 to 72 % of orbits resume at all) |
| scales 1.1, -1.1 | 80 to 100 | - | almost nothing resumes (0 to 4 % of orbits): a move needs more than 48 passes again |

It does not grow with depth. Shallower than about 1e-4 a third to a half of the orbits resume and there is
little to save (the orbits are short). The bulb's ring of 24 passes is too short at scale -1.5: 35 to 49 %
of orbits find no checkpoint in it (they run 23 again where 27 to 31 are needed). **A ring of 24 checkpoints
written every second pass reaches 48 passes and costs the same passes as a ring of 48** (rows c2, c3).
The tolerance has to follow the hit level: at Detail 32 the bulb's 0.05 px is more than the level itself
(0.031 px) and leaves 15 % rough at Arches; a quarter of the hit level leaves 0.35 % for one or two passes
more (rows f4, f1).

**2.7 The longer step [D, M].** The ball of 2.4 is the bound the bulb's line rule needs, and for the negative
scale it is tight: at the deep starters' own c the bounded set reaches 0.94 and 0.97 of rho [M: `05-ball.mts`
B]. The rule still gains nothing, for two reasons. (1) A straight line is only a straight line inside the
fold margin V, and V is far shorter than a step: held inside it, the line gave the longer step on **0 %** of
samples in all four starters (row d1). Read as the bulb reads it, with only the bend as allowance, it puts
25 to 100 % of rays through a solid (row d2): box folds kink the path, and no allowance for a bend covers a
kink. (2) Read soundly - at the first iterate outside the ball, against the ball - the estimate is 0.08 to
0.21 of E at the median: the ball is the whole set, and E treats the set as a point from 1000 away
[M: `05-ball.mts` C]. A longer step would need the set's own shape at unit scale, not its ball.

**2.8 Negative scale, and the dead band [D, M].** Nothing in 2.1 to 2.6 knows the sign of S: it sits in the
rotation part of the jet, and `|S|` in everything else. Scale -1.5 is three of the four starters; -2, -3,
-1.3, -1.1 and -1.7 are in the sweep. Toward `|S| = 1` three things degrade, none of them new with this
rule: the ball grows as `1 / (|S| - 1)` and passes the escape radius of 1000 (rho 68 at |S| = 1.1 and 327
at 1.02 for |c| = 3; 766 and 17,670 for a camera at the corner of the set) - past that an "escape" proves
nothing, in today's kernel too; the estimate is read before it has settled (rough stays 45 to 57 % at scale 1.1
whatever the step); and resumed orbits stop paying (table above). At scale 1.1 the candidate takes 16 to
201 steps where today takes 214, and in the two grazing views there today's march runs out of steps on 49
and 70 % of rays, the candidate on 28 and 31 %, and the careful march itself on 17 and 28 %
[M: `05-ball.mts` D, `02-bench.mts --set sweep`].

## 3. The rule

    kernel    carry zdot, B, V, VE with the orbit (2.1, 2.6, 2.3)
    estimate  E = (r - 1) / |zdot|                         the hit test stays  de = (r - 1) / dr < pa t
    step      s = E (r - rho) / (r - 1)                    the ball (2.4); where rho >= r: the scalar estimate, as today
              s = min(s, de (r - rho) / (r - 1) + VE (1 - de / E))            inside the early folds (2.3)
              s = min(s, (E (1 - pa t / de) + pa t / 4) / (1 + pa (E / de - 1/4)))   aimed a quarter cone under the level (2.5)
    resume    from the latest checkpoint of the ray with
                 err + 3 (s^2 Q / 2 + |s| jerr) <= a quarter of the hit level      the bend (the bulb's rule, its tolerance tied to the level)
                 |s| (1 + jerr + 3 |s| Q / 2) < V                                  no fold crossed (new)
              a ring of 24 checkpoints, one every second pass
    not used  the line against the ball; a start cap; far relax; Step size; a factor on the step

**Its error bound, and where there is none.** The resume has one: no crossing inside V and an error under
`3 (s^2 Q / 2 + |s| jerr)` - exact where no shell iteration lies before the checkpoint, measured never
exceeded elsewhere, not machine-checked (the factor 3 on Q is a measured one: 2 holds, 1 does not). The STEP
has none, as on the bulb: it is a first-order number. What it leans on, measured: the estimate reads at most
1.12 of the distance left on 28 views, and the rays it puts behind the careful ray are 0.01 % (starters),
0.02 to 0.04 % (dive), 0.17 % (other scales, worst view 2.44 %). The bulb's accepted figure is 1.0 % wrong,
0.6 % behind [R: BUILD-PLAN.md, "Clean."].

## 4. The tables

**Starters, 128 x 128 rays** [M: `02-bench-starters-d32.log`, `-d1.log`]. wrong % (behind %) · rough % ·
steps a ray · kernel passes a ray. *today* = x 0.85, start cap, 512 steps, far relax, as the shell marches;
*careful* = the referee; (b) = the ray estimate alone, whole orbits (the bulb's rule as it stands); (b+) = the
candidate's step (guard, ball, aim) with whole orbits; (c) = the candidate: (b+) with resumed orbits and the
crossing test; (d) = with the longer step.

| Detail 32 | Whole box (51 it.) | Arches 1.2e-20 | Lace 1.1e-50 | Block city 8.7e-42 |
|---|---|---|---|---|
| (a) careful (x 0.1) | 144 steps, 2,546 passes | 232, 17,810 | 301, 44,118 | 1,827, 269,839 |
| (a) today | 0.00 · 17 · 19.8 · 302 | 0.01 · 51 · 27.2 · 1,993 | 0.10 · 50 · 35.5 · 5,046 | 1.91 · 53 · 173 · 25,539 |
| (a) today at Step size 0.5 | 0.00 · 0.04 · 31.3 · 504 | 0.00 · 0.14 · 46.1 · 3,397 | 0.05 · 0.7 · 60.1 · 8,548 | 17.8 · 0.05 · 303 · 44,595 |
| (b) ray estimate alone | 4.62 · 24 · 9.2 · 161 | 0.02 · 66 · 17.5 · 1,299 | 0.16 · 66 · 23.4 · 3,347 | 0.50 · 92 · 45 · 6,608 |
| (b+) the candidate's step, whole orbits | 0.00 · 0.05 · 13.5 · 223 | 0.00 · 0.05 · 19.8 · 1,482 | 0.02 · 0.3 · 26.6 · 3,809 | 0.12 (0.01) · 0.09 · 52.6 · 7,763 |
| **(c) the candidate** | 0.01 (0.00) · 0.3 · 13.5 · 216 | 0.01 (0.00) · 0.35 · 19.8 · 594 | 0.04 (0.04) · 0.5 · 26.6 · 916 | 0.12 (0.01) · 0.09 · 52.6 · 825 |
| resumed orbits: share, passes run again | 13 %, 22 | 95 %, 28 of 74 | 96 %, 30 of 143 | 98 %, 13 of 147 |
| (d) + line / ball inside the fold margin | as without it: the line gives the longer step on 0 % of samples | 0 % | 0 % | 0 % |
| (d) + line / ball as the bulb reads it | 34.8 wrong | 24.9 | 29.4 | 100 |
| (c) without the crossing test | 35.6 wrong | 0.26 | 0.70 | 100 |

| Detail 1 | Whole box | Arches | Lace | Block city |
|---|---|---|---|---|
| (a) today | 0.10 · 18 · 16.5 · 217 | 0.22 · 51 · 18.9 · 1,350 | 0.67 · 49 · 22.5 · 3,134 | 0.24 · 52 · 101 · 14,699 |
| (b) ray estimate alone | 6.68 · 22 · 7.6 · 112 | 0.38 · 65 · 11.4 · 820 | 1.14 · 64 · 13.8 · 1,936 | 64.9 · 28 · 24.5 · 3,557 |
| **(c) the candidate** | 0.02 · 0.03 · 11.1 · 158 | 0.05 · 0.04 · 13.5 · 404 | 0.12 · 0.09 · 16.7 · 603 | 0.01 · 0.03 · 31.7 · 541 |

Block city's 0.12 % at Detail 32 are rays the candidate hits and the careful march does not reach in its
16,384 steps; 0.01 % (2 rays of 16,384) lie behind. Today's 1.91 % there are rays that ran out of 512 steps
(5.7 % without far relax, 17.8 % at Step size 0.5).

**Every rule, the mean of each set** (worst view) [M: `11-rules.log`]:

| | starters D32 | dive D32 (40) | dive D1 (40) | other scales D32 (52, without scale 1.1) |
|---|---|---|---|---|
| today: wrong % | 0.51 (1.91) | 1.09 (5.31) | 0.49 (3.44) | 2.70 (19.06) |
| today without far relax | 1.45 (5.70) | 2.72 (15.8) | 1.28 (7.82) | 1.69 (16.1) |
| scalar estimate x 1, no cap, 2048 steps | 0.07 (0.16) | 0.13 (1.13) | 0.15 (1.00) | 0.40 (1.76) |
| (b) ray estimate alone | 1.32 (4.62) | 0.56 (3.25) | 31.1 (73.7) | 0.82 (3.71) |
| candidate: wrong % | 0.04 (0.12) | 0.32 (2.56) | 0.22 (1.75) | 0.42 (3.42) |
| candidate: behind % | 0.01 (0.04) | 0.02 (0.19) | 0.04 (0.25) | 0.17 (2.44) |
| candidate: ran out % (today) | 0.00 (0.49) | 0.17 (1.56) | 0.11 (0.65) | 0.18 (1.71) |
| steps, candidate / today | 0.58 | 0.47 | 0.49 | 0.67 |
| passes, candidate / today | 0.19 | 0.21 | 0.24 | 0.43 |
| passes with whole orbits / today | 0.60 | 0.47 | 0.49 | 0.67 |

Most of the candidate's "wrong" in the dive is in FRONT of the careful ray: grazing views where the careful
march itself runs out of its 16,384 steps on up to 2.9 % of rays and the candidate goes on and hits.

**By depth** [M: `02-bench-dive-d32.log`]: passes, candidate / today, fall from 0.62 at 9e-2 to 0.12 at 8e-31
(scale -1.5, looking ahead) and from 0.31 to 0.05 (scale 2). Steps, candidate / today: 0.47 at scale -1.5
looking ahead at every depth below 1e-2; 0.24 to 0.41 at scale 2 below 1e-4 (0.34 to 0.81 shallower).
**The exception: scale -1.5 looking aside below 1e-7** - a view along a wall. There the candidate takes 1.03
to 1.38 times today's steps (76 to 109 against 74 to 79), because its budget is four times today's and
creeping rays use it: it runs out on 0.5 to 1.9 % of rays where today runs out on 2.1 to 4.6 %. Still 0.46
to 0.22 of the passes.

**Other findings of the same runs.**
- *Far relax is unsafe on the box above scale 2.5.* Today's shell default (the step factor rising to 1.7
  beyond 8 camera distances) puts 19 and 13 % of rays behind at scale 4 (9e-15), 14 and 7 % at scale -3
  (7e-9, 1e-14), 8 and 4 % at GMT's default box (9e-9, 7e-15) - 0.4 to 1.3 % with it off. At scale 2 it helps (1.9 against 5.7 % at Block
  city), because there the estimate is 3.7 times short. One fixed factor cannot serve both; c(v) is the
  number it was standing in for [M: sweep rows a0, a1].
- *A share of the estimate buys little.* The candidate at 0.7 and 0.5 of its step: behind 0.01 / 0.01 /
  0.00 % (starters), 0.01 / 0.01 / 0.06 % (dive), 0.17 / 0.07 / 0.09 % (other scales) for 1.0 / 1.4 / 2.0
  times the steps. 0.7 takes the worst view (scale 3, 9e-9, aside) from 2.44 to 0.00 % and the next worst
  to 0.49 %; at the starters and along the dive it changes nothing, and at scale 1.1 it makes more rays run
  out [M: `-margin.log`, rows g1, g2].
- *The navigation's ray* (NEXT.md section 8: "how much of the half can be given back"): stepping by the WHOLE
  scalar estimate instead of half puts 0 to 0.8 % of rays more than 5 % past the careful ray (12 views x 256
  rays; today's half: 0 to 0.4 %) at half the steps. The ray estimate cannot simply replace it there: with a
  hit test in the scalar measure it lands c(v) hit levels deep, as in 2.5 [M: `09-nav.mts`].

## 5. What could not be settled

- **Time.** Nothing ran on a GPU. On the bulb time followed STEPS, and a march step had a cost of its own
  worth 8 to 10 plain passes [R: BUILD-PLAN.md, "What the GPU corrected"]. The box has no skip table, so
  today each of its steps runs a whole orbit of 74 to 147 passes at the deep starters, and the candidate 13
  to 30: taking a step's own cost as 10 to 30 box passes and the jet as a third more a pass, the march would
  be 2 to 3.6 times faster at the scale -1.5 starters and 11 to 17 at Block city - an EXPECTATION from
  counted passes and two assumed numbers, not a result. Today's GPU figures: a
  256 x 256 draw in 7 to 27 ms [R: ADR-0135, Consequences].
- **The jet's cost a pass**, the ring in the box's 512-pass loop, the compile time (the box's variant builds
  in 4.4 s, the bulb's ray variant in 19 to 45 s [R: core.js `THE MANDELBOX KERNEL`; BUILD-PLAN.md "ON THE GPU"]).
- **f32.** Every number here is f64. The resume adds nothing the bulb's resume does not already do in f32
  (delta + s zdot on a shared exponent), and the fold distances are already carried as mantissa + exponent;
  but the box's own f32 limit (orbits about 17 iterations past the reference turn to noise at scale 2
  [R: ADR-0135, last line]) was not measured against orbits that run 13 to 30 passes again.
- **Normals.** The four taps stay whole orbits. With the march at 600 to 900 passes a ray they are 296 to
  588 more: a third to two fifths of the kernel work at the deep starters, and the next thing to resume.
- **Grazing rays** creep under every rule here (2.7): the box has no line rule to carry them.
- **The one bad view** (scale 3, 9e-9, looking aside: 2.4 % behind where today has 0.0 %; 4.1 % against 0.7 %
  at Detail 1) is the ray estimate itself - whole orbits give the same, the early-fold share does not move
  it. The likely cause is the last paragraph of 2.3 (the scalar estimate x 1 has 0.0 % there); not traced.
  0.7 of the step mends it.
- A pre-rotation was in one parameter set only (GMT's default box: 6 views, the candidate 0.1 to 0.5 % wrong,
  today 0.5 to 7.7 %).

## 6. The build it implies

Two stages, each judged by the bench. Stage A alone retires Step size.

**A. The step (no arrays in the shader).** Buys: Step size and far relax gone from the box, hits on the
careful surface, steps x 0.5 to 0.7, and the same share of the passes before the jet's own cost.
- `BOX_KERNEL` (core.js) under `USE_JET`: `jv / ev / jvs` as the bulb's `jetStep` keeps them; a box jet step
  (`boxFoldD` hands back the pixel's side of its two planes and the lesser of `|ph|`, `|pl|`); the two sphere
  margins from `pm`, `pF`; VE; `OrbitOut.rde` = the step of section 3's first two lines; `rls` = 0.
- `marchNear` (grep `THE RAY ESTIMATE as the step`): the aimed step, one `min`, under a uniform that is 0 for
  the bulb. The creep floor is inert on the box (E >= de, so it cannot fire before the hit test).
- grep `rayUse is what is in force - 0 while the box is drawn`, `ensureBoxVariant`, `setPowerUniforms`: the
  box's variant built with the jet, `uRayBall` = rho for the box, `uRayLine` = 0. The measuring mode (bit 8)
  stays: it is the bench's referee.
- CPU: `boxOrbitJS` gets the jet (or a sibling does) and `pertOrbitJetJS`'s box branch (grep `the box carries
  no jet`) returns it; the navigation's hit test needs its own look before it steps by it (section 4).
- Shell: the `stepSize` row (`deep-zoom/features/quality.ts`, `host/paramMap.ts` group `stepRelax`) goes.

**B. Resumed orbits.** Buys: passes x 0.2 to 0.4 overall.
- The bulb's checkpoint write and scan (grep `RAY-COHERENT ORBITS: resume from the latest checkpoint`) in the
  box's kernel, with V and VE in the two free `.w` slots (`gCkA`, `gCkC`), the crossing test in the scan, a
  write every second pass, and the tolerance uniform set to a quarter of the hit level.

**What proves it.**
- `npm run check:deep-zoom-box-orbit` (node): the jet against a central difference of exact orbits; V never
  over the exact distance to the first change of branch; a resumed orbit = the whole orbit; each seen red
  (a sign flip dropped; the Householder dropped; the crossing test off). `01-jet.mts` and `03-resume.mts`
  are those checks in study form.
- `npm run smoke:deep-zoom-direct`, the Mandelbox lines: the GPU's `rde` against the CPU's on the same grid
  of rays at the five places; the estimates unchanged with the jet variant on.
- `npm run bench:deep-zoom-march` taught the box (it marches `PLACES` with the bulb's maths today): the box
  starters, the measuring mode as referee, the rows of section 4.
- A pictures compare for the owner: each starter, the careful march against the ray march, one split image,
  same samples.

**Risks.** f32 (above); a second kernel with a ring to keep in step with the bulb's; the tolerance and the
ring's stride become two box-only numbers in a shared block; the picture is today's CAREFUL picture, not
today's default one - the terraces of the default go, and anyone used to them will see a change.

## 7. Questions for the owner

1. **The hit level.** The study kept today's surface (the scalar estimate under a pixel cone), which at scale
   2 stands 3.4 to 5.6 cones above the true one. The ray estimate could be the hit test too: a thinner, truer
   surface and a different picture. Keep today's?
2. **Far relax on the box, now.** Whatever happens to this, today's default puts 4 to 19 % of rays behind at
   scales 4, -3 and 2.566. Switch it off for the box above |scale| 2.5, or wait for the build?
3. **The whole estimate, or 0.7 of it?** 0.17 % against 0.07 % behind over 52 views (worst 2.4 against 0.5),
   for 1.4 times the steps. The bulb steps by the whole.
4. **Stage A alone first** (Step size gone, about today's speed, 3 times fewer passes at scale 2), or A and B
   together?
5. **The whole-box card saves 14 iterations** where the margin rule gives 51. At 14 every rule has rays wrong
   (today 0.78 %, the candidate 1.49 %): the count shapes the solid. Raise the card's count?

## Files

`lib.mts` (the lifted renderer, the kernel with the jet, the ring, the two marches, the referee) ·
`places.mts` (the dive and the sweep) · `01-jet.mts` (kernel, jet, bend, fold margin, E / de) ·
`02-bench.mts` (the bench; `--set starters|dive|sweep`, `--detail`, `--rows`) · `03-resume.mts` (resumed
against whole orbits) · `04-ratio.mts` (distance left) · `05-ball.mts` (the ball) · `06-certify.mts` (twin
against the fixed-point referee) · `07-tables.mts`, `08-short.mts`, `10-behind.mts`, `11-rules.mts` (tables
from the bench's JSON) · `09-nav.mts` (the navigation's ray). Each has its command in its header and its
`.log` beside it; the bench's nine runs are listed in the header of `02-bench.mts`. All of it runs as
`npx tsx debug/scratch/box-ray-study/<script>` from the worktree root; the whole study is about half an hour
of one desktop CPU.
