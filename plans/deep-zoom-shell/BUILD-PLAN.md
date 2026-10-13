# Deep Zoom gmt-shell - build plan

Target: `BLUEPRINT.md`; engine changes: `ENGINE-GAPS.md`; owner calls: `DECISIONS.md` (K1-K5: the
standalone page is frozen, the renderer is the module `deep-zoom/renderer`, GMT's navigation and
Light Studio are reworked generically and used here, the shell never waits for a rework). The
measurements behind a line below are in this file's history (`git log -p` on it).

### As built (branch `deep-zoom-tool`, unpushed)

| Stage | State |
|---|---|
| 1 | **Closed** (`c21c8034`, `c6929b7b`, `9182a5c0`, `4803d75e`, `560c1103`). |
| 2 | **Built** (`bf608a97`, `7ea27431`, `7819963c`, `43b77ff2`), except pause controls (S2-9, waits on a module pause), the Diagnostics tab (D7), the `actualPixels` row. Advanced mode has a Settings row and the backtick key; Step size is not advanced (`c6da5a1e`). |
| 3 | **Built** (`377010bc`, `0116e88a`), except Export all (JSON), the scene-file claims (S3-4), Session / autosave. Kept places are project data in `deep-zoom/data/places.ts`, and a location carries its march settings (`1763dbf0`). |
| 4 | **Keys built** (`a4714596`). Not built: help topics, the shortcuts page, What's New, the first-dive lesson (S4-2, S4-3). `C` is a fly key; "next colouring" is `V`. |
| N | **Built: the shell flies with GMT's navigation** (`9a6fa372`, `36bf72da`, `f6b3238f`, `9f12a60f`, `aa53ff7e`, `91f0ab07`; ADR-0133). N1 was dropped: the distance stays a plain argument. |
| N, again | **The speed follows rays, and Orbit mode on Tab** (`1cce82bc`, `68718c65`; ADR-0134). Open with the owner: the rise limit, the clearance share, roll (a third number through views, paths, locations, scenes and links: about a session). Known: the rays cost up to 10 ms a frame at the deepest starter, and the picture's GPU march will crawl beside the pole axis as the probe did. |
| 5 | **Built: gradients, My Gradients, the Gradient Studio, the Explorer trip** (`4379df82`, `2af0026d`, `6d3719a9`; DECISIONS K10). What differs from the plan: "Stage 5 as built" below. |
| Engine | S2-4 one overlay host (`375d8ab8`), S3-0 state-library options (`e6921dbf`). |
| Module | Opt-in and off by default, so the module equals the frozen page; ON in the shell unless noted: rebase to the origin (`3eb65f03`), far hand-off at 0.5 (`51e0273a`), far ground takes the palette (`341b26db`), Hit refine (`d46ad82a`, off in the shell), the true-gradient estimate (`073e1c3b`, off), the ray march (`540851de`, the shell's default since `ceb6064b`), Normal detail (`093882a3`, parked by the owner). Done inside other packages: `setIters`, `setAutoIters`, two read-backs (part of M1); `setView` snaps the distance (M8); fly keys ignore a key pressed with Ctrl / Alt / Meta (part of M6). |
| Tooling | `npm run bench:deep-zoom-march` (`4eb82f87`): for the kept places and the sample flight, the share of rays a march setting puts on another surface than a careful march, and the work it costs. |

Since stage 2 it is built in one session, depth-first, one commit per visible piece (a builder
agent per package cost about the same whatever the package's size).

**Corrections to this plan found by building** (each is in the code's JSDoc where it bites):
- **A fly guard cannot be a priority-10 binding with a condition**: the shortcut dispatcher picks
  the winning binding first and tests its `when` afterwards, with no fall-through. Gone at N5 with
  the pointer capture.
- **Navigation as built**: the turn is a turntable (the integrator's turn taken apart into yaw and
  pitch); the fly speed is a preference in localStorage (0.01 to 8, default 3.6), not a param; Q
  and E are down and up; the frame delta is clamped at 0.05 s.
- **f32 is no longer the shallow picture** (`2b341c27`): the shell starts the renderer with
  `mode: 'deep'`, f32 shows only while the deep shader compiles, and the renderer keeps the camera
  off the exact z axis (POLE GUARD), where the deep path's reference orbit is degenerate.
- **The step a view needs depends on the POWER far more than on depth** (power 8 is fine at 0.85
  down to 1e-30; the owner's power-2 place at 5e-20 needs 0.1), so a rule keyed to depth is wrong.
  A small step needs a step budget scaled with 1 / step.
- **Most "wrong" pixels along the flight were rays on the right surface** that landed up to a
  pixel cone off their level; Hit refine cures those. A wrong SURFACE is what the step cures.
- **The kernel lost precision where an orbit passes the origin and runs on** (the GPU's estimate
  off by up to 89 % in part of the 3.5e-16 view). Repaired by the rebase to the origin; the direct
  proof gates on off-centre grids for it.
- **The error around 1e-4 was the far hand-off** to a plain f32 march. With the hand-off at 0.5
  the deep march draws everything nearer; shallow views between 1e-3 and 0.2 march 1.6 to 1.8
  times longer.
- **Why some places need a small step**: the estimate's scalar running derivative under-counts
  the true gradient by 3 to 4.6 times there. The true-gradient estimate (grep `TRUE-GRADIENT
  ESTIMATE` in core.js; `api.setJacobian`) cures it at 1.3 to 2.4 times the picture time in
  ordinary views. The ray march replaced it as the default.
- **"Fat and blobby" is the hit tolerance and nothing else**: at Detail 1 a hit stands about 3 px
  in front of the Detail-32 surface at every depth, and each doubling of Detail halves it. Detail
  8 costs about 1.7 times Detail 1.
- **THE GOAL, in the owner's words (2026-10-09): "Clean, intricate deep zooms without artifacts and
  good performance, without the user having to fiddle with detail and step to keep a consistent
  image throughout."** Everything below this line in the block is judged against it, at Detail 8
  and up - Detail 1 numbers misled this work once already.
  - *What each part needs, as measured so far.* INTRICATE = the hit tolerance: Detail 1 leaves the
    surface about 3 px fat at every depth and the deep views are thin layers, so the same setting
    shows less the deeper one goes; only a finer tolerance brings them back (Detail 8 costs about
    1.7 times Detail 1). Jittered accumulation does not: finished 64-sample stills are as fat at
    Detail 1 with the gradient normal as with 4-tap (busyness 6.3 and 5.6; 10.2 and 11.9 at Detail
    8). CLEAN = the step: at Detail 8 the default step puts 1 to 12 % of an ordinary view's rays on
    a wrong surface; the true-gradient march (in the shell, off by default) leaves 0.3 to 2.2 %.
    PERFORMANCE = both of those cost: about 1.7 for Detail 8 and 1.1 to 2.0 for the march.
  - *Tried 2026-10-09 for performance, CPU simulation, not good enough alone:* dividing the
    estimate by its own slope, for the step and the hit test (it is then the first-order true
    distance; today's reads about half of it on ordinary ground). 35 to 40 % fewer steps for the
    same crispness, and Detail 4 with it is as crisp as today's Detail 4 to 8 - but 4 to 15 % wrong
    surfaces in ordinary views where today has 0 to 5, and no help at the power-2 and slicing
    places (the slope ahead is steeper than the slope here). The saving is real; it needs a check
    that catches the long step that went wrong before it can be used.
  - *Plan, in order.* (1) Measure how much detail survives against depth and Detail, and make
    Detail follow it - the piece that removes the Detail slider from flying. (2) With that on,
    the true-gradient march as the default below the depth where it pays; cost measured over the
    whole sample flight. (3) Win the time back: verified longer steps (above), the gradient normal
    where it is judged good enough, the plain shader where the two estimates agree. (4) The power-2
    place, which still has 8.8 % wrong at Detail 8 with the march on.
  - **THE PLAN ABOVE IS A WORKAROUND, AND THE OWNER SAID SO (2026-10-09):** "I think we will need
    to discover some new maths for this one, because a solution certainly exists, even though it
    may have not been discovered - one which is responsive to what's on screen, rather than based on
    attributes like depth and perceived difficulty ... your proposal is a workaround and we are
    looking for a true solution." Do not build "Detail follows depth" or any rule keyed to depth,
    power or a per-view probe as the answer. What the next session starts from instead:
    - *The problem, stated as maths.* The renderer stops a ray on a level of ONE number, an
      estimate of distance, compared with the pixel's cone radius. That number is not the distance
      (about 0.55 of it on ordinary ground, less in creases, two to three times too much where the
      scalar derivative under-counts), and one number cannot say what a pixel needs to know about a
      thin layer: how large the structure is ACROSS the screen and how far it is ALONG the ray are
      different questions. The orbit's 3x3 derivative, carried since the true-gradient variant,
      holds exactly that directional information; the march reduces it to a norm and throws the
      rest away.
    - *What any true solution has to reproduce,* all measured here: the fat surface (about 3 px at
      Detail 1) at every depth; the deep views being thin layers; wrong surfaces rising with Detail
      at a fixed step (1-12 % at Detail 8); the estimate's slope being about 0.5 and not 1; a
      first-order slope correction saving 35-40 % of the steps and overshooting.
    - *Two leads, untested, named so they are not lost - neither is a result.* (a) Use the gradient
      as a direction against the ray and the screen: the clearance across the pixel and the
      remaining distance along the ray become two estimates, and only the first is a reason to
      stop short. (b) Stop treating a hit as all-or-nothing: let a ray carry the share of its
      pixel a thin structure covers and go on behind it, so thin layers are kept as coverage
      instead of being swallowed or skipped.
    - *The tools for it exist:* `npm run bench:deep-zoom-march` (seconds a sweep), the f64 CPU
      kernel lifted into node with no browser (`debug/scratch/norm-march.mjs`, `fat-study.mjs`,
      git-ignored), the BigInt and finite-difference referees, and the J variant itself.
  - **RESEARCH RESULT, 2026-10-09 (the session after the one above): A CANDIDATE TRUE SOLUTION,
    PROVEN ON THE CPU IN f64, NOT YET ON THE GPU. Nothing in the renderer or the shell changed.**
    Tools (git-ignored, pure node, seconds a run): `debug/scratch/tm-kernel.js` (the f64 kernel
    with the orbit's derivatives carried analytically, and ray-coherent orbits), `tm-lib.mjs`,
    and the studies `tm-svd`, `tm-march`, `tm-ratio`, `tm-resume`, `tm-resume-err`, `tm-rules`,
    `tm-passed`, `tm-final`, `tm-picture` (`.mjs`, each with its `.log`).
    - *What is on screen, as maths.* A point p is in the bulb exactly when its k-th iterate
      z_k(p) lies in the filled Julia set of c = p; across a deep view c changes by less than the
      view's own size, so EVERY sample of EVERY ray, at its own escape iteration, is one point at
      unit scale just outside ONE fixed set, and the picture is that set pulled back through the
      smooth map p -> z_k(p). Today's estimate 0.5 r ln r / dr is two stand-ins: "0.5 r ln r" for
      the distance from the escaping iterate to that set (the set taken as a ball), and the scalar
      dr for how fast the iterate moves when the point moves. The second stand-in is the faulty one.
    - *The map is not even, and that is the cause.* The full 3x3 derivative J at hits (three
      analytic jets, checked against central differences to 2e-6): its largest stretch is 3 to 6
      times the next at the median (9 in 10 hits: up to 13 to 39) and that one 2 to 8 times the
      smallest, at EVERY depth from 2e-3 to 4e-36 - it does not pile up with depth. At the
      power-2 places it is 100 to 160 in one direction, the same direction across the whole view
      to about a degree: those views are stacks of parallel sheets. The scalar dr under-counts
      the largest stretch by 1.7 to 6 times at the median in ordinary views, 3.5 at the power-2
      place at 5e-20, 5.5 at the slicing place.
    - *(1) The step: the iterate's speed ALONG THE RAY.* Carry one vector with the orbit,
      zdot = J v (v = the ray's direction; zdot' = A zdot + v, three numbers where the J variant
      carries nine). The escaping iterate cannot reach the set before it has travelled its
      distance to it, and |zdot| is its speed as the point moves along this ray, so
      E = 0.5 r ln r / |J v| is a lower bound of the distance left ALONG THE RAY - not of the
      distance in every direction, which a ray does not need. Measured against a careful march
      on 9 views (214,000 samples): at the 99.5th percentile E is 0.41 to 0.90 of the distance
      left, today's estimate 0.42 to 3.1, the prototype's smaller-of-two 0.38 to 1.2. E's worst
      sample is under 0.93 in six views and 1.5 to 2.5 in three, where the careful ray itself
      stops at a graze. Stepping by E itself (factor 1, no step setting), 441 rays a view, iteration cap raised
      by 40: 0 rays of 5,292 went through a solid in 12 views (flight x 9, both power-2 places,
      slicing), 2 of 441 at the power-4 3e-76 view. Today at 0.85, Detail 8, ends behind the
      careful ray on 1.3 to 5.8 % of rays along the flight, 45 % at the slicing place, 98 % at
      the power-2 place.
    - *(2) The hit: a fixed fraction of a pixel in the same measure.* A hit when E is under 1/64
      of a pixel. Hits then stand 0.03 to 0.06 px from the true surface at the median (0.07 to
      0.27 at 9 in 10); along the flight today's Detail 8 is 0.14 to 0.25 (0.24 to 0.49) and
      Detail 32 is 0.03 to 0.06 (0.06 to 0.11). No Detail setting moves with depth, because nothing is keyed to depth.
    - *(3) The cost: ray-coherent orbits.* Today every march step runs the whole orbit again from
      iteration 0 (BLA shortens it by up to 2.4 times at depth). But the orbit of the next sample
      on the SAME ray is the orbit of this one plus S zdot_k at every iteration k early enough
      that the second-order term is small; only the last few iterations differ. So each sample
      resumes the previous sample's orbit from the latest checkpoint (state + zdot at iteration k)
      whose move keeps the evaluated point within 0.05 px of the true point. The error of a move
      by S is S^2 Q_k / 2 with Q_k = sum over earlier iterations of |zdot_i| (n-1) / (distance of
      z_i from the pole axis) - measured against true second-order errors: 0.5 to 0.9 of the
      model at the median, 2.5 at worst. Kernel passes per march step: 3.6 at 2e-3, then 4.6 to
      6.8 at EVERY depth from 2e-6 to 4e-36 (today: the escape iteration, 6 at 2e-3 rising to 45
      at 4e-36); 16 at power 2, 10 at power 4. One full orbit a ray (the first sample - and that
      one is the camera's own reference orbit).
    - *Together, per ray, 225 rays a view* (passes = kernel iterations, the GPU tool's `work` with
      BLA off; today at 0.85): flight 2e-3 today D8 188 / D32 236 / candidate 227; 7.7e-10
      496 / 606 / 309; 1e-16 1442 / 1621 / 637; 2.5e-22 1348 / 1555 / 405; 4.4e-36 1936 / 2271 /
      436; power-2 5e-20 1472 / 2112 / 614; slicing 950 / 1085 / 410; power-4 3e-76 24425 /
      25755 / 2484. Mean over 12 views: 1182 / 1464 / 460. The candidate takes MORE steps (59 to
      116 a ray against 34 to 70) and each costs a fraction. Pictures: `debug/scratch/tm-split-*.png`
      (CPU, f64, left today, right candidate, same shading).
    - *The iteration count stops being a quality setting.* The few rays that went through a
      solid at the power-2 places (1 of 242 in one run, 2 of 162 in another) did so because the
      saved cap of 86 iterations shapes the surface there; with the cap raised by 40, none. A resumed orbit runs until it escapes
      and pays only for the iterations it needs, so the cap can be a wide margin.
    - *What is NOT known - say it this way.* (a) Nothing ran on the GPU: f32 with exponents,
      checkpoint arrays in the shader, compile time, per-step overhead and the real time against
      today WITH BLA are all unmeasured; the pass counts above are against BLA off. (b) Shallower
      than about 1e-6 there is no saving (227 against 188 passes) - the candidate is safer and
      crisper there, not cheaper. (c) The four normal taps are sideways moves, which the ray's
      one vector does not cover: as full orbits they would become a quarter of the work. The plan
      is one full-J orbit at the hit and four resumed taps; unmeasured. (d) The resume's error
      model lets 1 % of samples stand 0.1 px off and the worst 0.55 px where 0.05 was asked; it
      needs tightening or one exact orbit at the hit. (e) 0.4 to 1.3 % of rays end more than 2 px
      of depth behind the same rule marched four times as carefully without going through
      anything: grazes that passed within 1/76 to 1/350 px. (f) The power-4 3e-76 view (2 of 441
      through a solid, 255 steps a ray) is a camera skimming a surface; not understood.
    - *Leads kept, untested.* The straight line z_(K-1) + s zdot_(K-1) against the sphere the
      next shell lies inside (an exact first-order answer to "will this ray enter the next
      shell, and when" - it is what would end the creeping past near-misses: the median sample's
      estimate covers only 3 to 8 % of the distance actually left); a 3D texture of the distance
      to the one Julia set, in place of "0.5 r ln r"; a larger bailout made the bound WORSE (6 of
      637 through at 16 against 1 at 2) - not understood.
    - *To build, if the owner says go - an opt-in variant like the J one, judged with
      `bench:deep-zoom-march`:* (1) `USE_JET` in the shader kernel (jacStep for one vector) with
      the ray rule for step and hit, full orbits: wrong % and work against today. (2) Checkpoints
      and resume in the kernel: work and milliseconds, BLA on and off. (3) Normal taps from the
      hit's checkpoints. (4) The cap as a margin. (5) Only then one shell switch for him to fly,
      and his verdict decides whether Step size, Hit refine, Detail and True-gradient march go.
  - **FOLLOW-UP, 2026-10-09 (a second chat, beside the research session): THE STEP'S SAFETY IS A
    SECOND-ORDER QUESTION, AND ITS BOUND IS NOW DERIVED. CPU, f64, pure node. Nothing in the renderer
    or the shell was changed by it.** Tools (git-ignored, `debug/scratch/`, each with its `.log`):
    `pb-leap.mjs` (the line-against-ball step on resumed orbits), `pb-math.mjs` (the lemmas, the
    theorem and its proof, written out in the header), `pb-check.mjs` (lemmas against the map),
    `pb-lib.mjs` (reads `tm-kernel.js` and `core.js` as text and adds `trace()` = every iterate and
    its jet), `pb-stray.mjs` (theorem against true strays), `pb-proven.mjs` (the march; rules
    `ray`, `model`, `proven`, `exactF`), `pb-diag.mjs` (where the bound is loose).
    - *A correction to the block above: E is measured safe, not proven.* It is a first-order
      number - it takes the iterate as heading straight at the set at the speed it has at the
      sample. Its own ratio table has worst samples at 1.5 to 2.5 of the distance left in three
      views, and it put 1 to 2 of 5,733 rays through a solid here (power 4, 3e-76). Say "measured
      safe on these views", not "a lower bound".
    - *The line-against-sphere lead, tested.* The longest step for which the straight line
      z_j + s zdot_j, thickened by an allowance for the path bending away from it, stays outside the
      ball that holds the whole Julia set of c (radius rho, rho^n - |c| = rho: 1.09 on the flight,
      1.10 slicing, 1.20 power 4, 1.56 power 2). Read at the last unescaped iterate when it stands
      outside that ball and at the escaping one; the longer step wins (the escaping one alone:
      132 steps a ray). Hit test unchanged (E under 1/64 px). Resumed orbits, 441 rays x 13 views,
      cap + 40, through a solid / steps a ray / passes a ray: E 2 of 5,733 / 85 / 614; allowance =
      the resume's measured Q (s^2 Q |zdot| / 2) 0 / 47 / 408; twice that 0 / 62 / 513. With Q as it
      stands: flight 38 to 59 % fewer steps, power 4 253 -> 125, slicing 56 -> 38, the power-2
      places no gain (38 -> 36, 37 -> 49: the set fills 1.56 of the bailout 2, one ball is a poor
      stand-in there).
    - *All of the safety is that allowance.* 1,053 rays, saved cap: with none 1,052 go through a
      solid; with half of Q 127; with Q one (none once the cap is raised by 40). So the straight
      line alone is useless, and the number that decides everything is how far the path can bend.
    - *The measured Q is not a bound of that.* Against true strays on real orbits (fresh orbits at
      displaced points, 39,512 samples): the true bend is up to 2.5 times Q |zdot| (model / true
      0.40 at worst), and above it on at least one sample in twenty in every view. So a safety
      factor of 2 on Q does not cover the worst case - this is the likely cause of unknown (d)
      above (resumed samples standing 0.1 to 0.55 px off where 0.05 was asked).
    - *What was derived (`pb-math.mjs`).* (1) The exact second derivative of the triplex power
      along a straight line, in closed form (frame: along the pole axis, away from it, around it).
      (2) Its size: r^(n-2) (n(n-1) m^2 + n h p^2 / sin th + 2 n g m p / sin th), m the speed in
      the plane through the axis, p the speed around it, h <= 1 + n |U|, g <= n + |U|,
      U = sin n th / sin th - motion around the axis bends far more, without limit near the axis.
      (3) A theorem: a forward recurrence along the orbit, b' = L b + A + X e + B e^2 with the
      worst case taken over the path each iterate travels during the step, such that iterate j
      strays from its straight line by at most s^2 b_j / 2 for every s of the step. b depends on
      the step length, so the step is solved for (30 trials a sample on the CPU).
    - *Checked.* The formulas equal the map to one part in a million on 160,000 points (powers 2,
      3, 4, 8, a third of them close to the axis); the bound was never exceeded on those points or
      on the 39,512 real-orbit samples; the exact second derivative carried with the orbit equals
      the true stray of a short step (ratio 1.00). Derived and checked numerically, NOT
      machine-checked; exact arithmetic is assumed (rounding is not covered); a path that reaches
      the pole axis has no bound (20 of 474,182 samples got a tiny step that way, none stalled).
    - *In the march, the proven allowance in place of Q.* Full orbits (the theorem needs every
      iterate of the sample point), so steps only; 441 rays x 13 views, cap + 40, through a solid /
      steps a ray: E 1 of 5,733 / 85; measured Q 0 / 47; PROVEN 0 / 83. Flight 12 to 26 % fewer
      steps than E; power 4 254 -> 234; slicing 57 -> 59; the power-2 places WORSE (39 -> 88,
      37 -> 103: long slow orbits, many terms, the carried norms pile up; finer pieces do not help).
    - *Why it is still twice too cautious, and the ceiling.* The certified step is about 0.5 to 0.6
      of what the exact second derivative would allow (the bound is 3.2 to 4.2 times it at the
      certified step, about 2 of that from carrying sizes where the exact vector could be carried).
      The ceiling, measured with the exact second derivative times a factor as the allowance (NOT a
      proof), 1,053 rays: x1 2 through / 39 steps; x1.5 1 / 47; x2 0 / 52; x3 0 / 62 (power 2 at
      x2: 46 to 48). So the bend really drifts over a step, a sound rule lands at 52 to 62 steps,
      and the unproven 47 ran closer to the edge than its 0 of 5,733 shows.
    - *Not done, and the order I would do it in.* (a) Nothing here ran on the GPU, and there is no
      single-pass form of the theorem for a shader (it would be a carried bound plus a validity
      radius, as BLA has). (b) The theorem is already tight for SHORT moves (1.1 to 2.6 times the
      true stray at a tenth of a typical step): that is the resumed orbits' regime, where it can
      replace Q and its safety factor - the first use worth building. (c) The next tightening for
      LONG steps: carry the exact second-derivative vector and bound only its drift, which needs a
      bound on the third derivative (terms worked out, 1 / a^2 at the axis, not proven or coded).
      Hold it until the GPU numbers say long steps pay there: passes a step rise with the step.
      (d) A tighter enclosure of the Julia set than one ball, for power 2.
    - *Tool traps.* A variant that sends many rays through solids makes the through-check crawl
      with the cap raised (minutes): run broken variants at the saved cap. `pb-lib.mjs` patches the
      kernel text at its last `return { orbit, makeRay`; it needs `pushJets`, `stable`, `O.Vf` and
      the `makeHP` .. `BLA table build` span of `core.js` to keep their names.
    - *ADDED AFTER "ON THE GPU" BELOW (same chat, later the same day): the proven bound in a
      shader's form, CPU, full orbits.* `pb-carried.mjs` (+ `pb-carried-*.log`), `carried` in
      `pb-math.mjs`. (1) The obvious single-pass form FAILS - do not build it: a carried bound whose
      suprema are taken on a ball of a FIXED fraction of each iterate's axis distance, with a
      validity radius. 466 to 20,000 steps a ray (`pb-carried-fixed-fraction.log`): a fixed
      fraction is a million times too large for the early iterates and inflates every pass, and
      too small for the last ones, so the validity radius cuts every step. (2) The form that
      works is a LADDER: the step length is fixed BEFORE the pass as a few multiples of the step
      the ray took last (1 and 4 times is enough), and the theorem's recurrence runs once a rung -
      one scalar recurrence each, its suprema on up to 12 pieces of the last iterates' paths. The
      certified step is the best over the rungs of min(rung, the line against the ball with that
      rung's bound). (3) Numbers, 1,053 rays, through a solid / steps a ray: E 0 / 85; the
      shell's rule (the longer of E and the line at 2 Q) 0 / 54; the longer of E and the proven
      ladder 1 / 66; the proven ladder alone 97 to 107 on 325 rays, with rays that STALL at the
      power-2 places and one at power 4 (no rung certifies where a path reaches the pole axis; a
      sound floor for those is not designed). (4) The one ray through a solid was an E step: at
      the power-4 3e-76 view, ray 19 of 81, E = 1.3e-55 where the proof allowed 1.7e-56, and the
      step crossed a solid 2e-57 past the careful hit. So "the longer of E and anything" is
      exactly as safe as E, and E is the part with no proof - this is unknown (f) of the research
      result. (5) Where that leaves it: the proof in a shader's form costs about a fifth more
      steps than the shell's rule today (66 against 54), and time follows steps. The third-
      derivative tightening has a measured ceiling of 52 to 62 steps for a rule that is proven
      throughout, against today's 54 with the unproven Q and E in it: it buys the guarantee at
      about today's speed, not more speed. An allowance of 1 Q (37 steps, 12.7 ms on the GPU) is
      NOT supported by the maths: the exact bend times 1.5 already put a ray through a solid.
  - **ON THE GPU, 2026-10-09 (the research session, continued): THE RAY MARCH IS IN THE RENDERER AS AN
    OPT-IN VARIANT, WITH THE FOLLOW-UP'S LINE-AGAINST-BALL STEP, AND THE SHELL HAS A SWITCH FOR IT.
    Off by default: the module still equals the frozen page (parity 52, direct proof 15 lines).**
    - *What is built* (grep `THE RAY ESTIMATE`, `THE LINE AGAINST THE BALL`, `THE CREEP FLOOR` in
      core.js): the variant `USE_JET` (keys PR and PTR; never with BLA or the J twins; 19 to 45 s
      to compile, in the background for a picture); `api.setRayMarch(bits, { factor, hit, tol,
      floor, line }, now)` - bits 1 = step by the ray estimate, 2 = hit test by it, 4 = orbits
      resumed along the ray - with `rayMarchState()`, `rayMarch()`, and `setRayDefs()` for
      experiments. The shell: Quality > Ray march (prototype) = bits 5, creep floor 1/256 px, line
      rule with twice the bend measure as allowance; while it is on Step size, True-gradient march
      and BLA are not used, Detail and Hit refine are. Smoke stage 2 has a step for it (seen red
      with the push made a no-op). The march tool takes `--ray bits:factor:hit:tol:floor:line` and
      prints, for those rows, `behind` (of wrong: deeper than today's careful ray) and `passed` /
      `early` against the same rule marched at a quarter of the estimate with whole orbits.
    - *Clean.* Detail 32, 17 views, 16,384 rays each as a 1080-row picture, rays more than 2 px of
      depth from today's careful march (step 0.1, refine 8): today at 0.85 10.2 % (flight 0.3 to
      4.5, slicing 44, power-2 5e-20 97.6); today at 0.42 2.0 % (power-2 26.8); the ray march
      1.0 % (0.5 to 2.3 in every view; 0.6 behind, the rest in front). Pictures, the renderer's
      own, left today, right the ray march: `debug/scratch/ray-split-*.png`.
    - *As fast as today's default.* One 640 x 640 picture with 4-tap normals, RTX 5070 Ti, BLA on
      for today's, mean of 11 views in one run: today at 0.85 21.8 ms, today at 0.42 34.3, the ray
      march 22.6 (a view: 0.70 to 1.32 of the default's speed - slowest at the 1e-33 flight view,
      28.7 against 20.0 ms; fastest at 8e-20, 19.9 against 26.2). It takes 42 to 80 steps a ray and
      223 to 794 kernel passes (mean 431) where today takes 1,636 with BLA off.
    - *What the GPU corrected in the CPU result above.* (1) Kernel passes are not the cost there.
      BLA already shortens today's orbits to 10 to 13 passes, and a march step carries a cost of
      its own worth 8 to 10 plain passes: a resumed step ran 4 to 5 passes and cost what a BLA step
      of 11 does. With the ray estimate alone the march was 1.4 times today's default in time
      (26.2 against 18.4 ms) at a third of the passes. (2) So time follows STEPS, and LONGER STEPS
      PAY - the follow-up's question: the line rule at allowance 2 Q took steps from 77 to 46,
      passes from 315 to 217 and the march from 28.2 to 18.4 ms (1.2e-12 flight view; the two
      deeper ones the same); at 1 Q 37 steps and 12.7 ms; at 3 Q 52 and 20.2. Wrong and behind did
      not move with it (1.05 / 1.05 / 1.04 / 1.04 % wrong at off / 1 / 2 / 3 Q). The third-
      derivative work for long steps is therefore worth doing. (3) A ray whose iterate moves far
      faster along it than the scalar derivative says creeps for hundreds of steps (4,095 = the
      budget) a small part of a pixel from something, and its 8 x 8 group waits for it: under 1/256
      of a pixel that is now a hit (33.7 -> 23.1 ms). (4) The ray estimate is the better STEP and
      today's estimate the better HIT TEST: as the hit level (bit 2, 1/64 px) the ray estimate is
      fat wherever the iterate moves fast along the ray (4.4 % wrong against 1.0). (5) The vector
      costs 20 to 25 % a kernel pass. (6) Checkpoints as arrays stay: named globals compiled for
      5 minutes and ran 1.4 times slower; writing them only now and then ran a third more passes
      and no faster. (7) A safety factor of 3 on the bend measure for the resumed orbits (the
      follow-up: it under-reads by up to 2.5 times) costs neither passes nor time.
    - *Not known.* The owner's verdict in flight. Where the per-step cost sits (unprofiled: the
      scan, the restore, the array traffic, the march loop's own exponent arithmetic). Detail 8
      and the power-4 3e-76 view in milliseconds. The proven bend bound in a shader's form. The
      normal taps are still whole orbits without BLA (about 1 ms of the picture). Far relax is not
      applied to the ray step and its step budget is four times the page's - neither tuned.
  - **THE RAY MARCH IS THE SHELL'S DEFAULT, 2026-10-09 (the owner flew it: "its amazing. its become much
    easier and in some cases more possible to navigate the deep mandelbulb reaches at numerous powers").**
    His calls that day: make it the default for now; keep Step size, True-gradient march and the rest "a
    little while longer for reference"; solve Detail ("it will be able to improve our instrumentation aswell
    to have a consistent measure of detail"); iterations as a margin and a profile of the step cost agreed;
    "the 20s switch on is fine except it needs some indication". He also found places where rays RAN OUT OF
    STEPS and offered to save them - OWED by him, none of the 17 test views shows it (most steps a ray there:
    180 to 368 of 2,048).
    - *On from the start.* The create option `rayMarch: true` (core.d.ts; `shellOptions` sets it, pinned by
      the module-host check - seen FAIL with the line removed) starts the renderer as the shell uses it;
      `dzQuality.rayMarch` defaults to true and the row is "Ray march". The module without the option is
      still the page (parity 52).
    - *CORRECTED THE SAME DAY - Detail applies again.* The owner, having flown the fixed level below:
      "detail 32 seems too much in many instances, where it just makes the surface very rough". The
      mechanism stays (`rayDetail`), its default is 0 = follow the Detail row. What went wrong in the
      reasoning: Detail says how close a ray stops (pixel / detail) AND, through the same number, how far
      apart the normal's taps stand (2 pixels / detail). The first is geometry and was cheap to make
      fine; the second is the look, and a 16th of a pixel between taps reads the surface's own grain.
      One fixed number cannot serve both.
    - *THE SPLIT, BUILT AS AN EXPERIMENT FOR HIM TO FLY: Quality > Normal detail* (0 = as Detail = the page;
      `api.setNormalDetail`, grep THE LOOK LEVEL in core.js). With 4-tap normals and a Normal detail below
      Detail, a ray still stops where Detail says, and its normal is taken on the coarser level the Normal
      detail names, at the place where the ray crossed that level on its way in - no extra orbits. Checked:
      with it set, 0 of 16,384 rays end at another depth, in three views, both marches. Pictures, one view
      five times (Detail 2, 8, 32, then Detail 32 shaded as 8 and as 2): `debug/scratch/look-strip-*.png` -
      the grain of Detail 32 goes, the thin layers it separates stay. Smoke stage 2 has a step (seen red
      with the push made a no-op): the shell smoke is 48. NOT decided: whether this is the right shape (two
      Detail numbers), what the defaults should be, and whether shadows and ambient shade from the depth
      buffer need the same treatment - his calls, after flying it. HIS FIRST IMPRESSION (same day): "something
      looks off about setting them to different values" - he needs more time with it and went on to the
      navigation interface; PARKED until he comes back to it. Suspects to look at then, none tested: the
      normal now belongs to a point up to several pixels before the hit along a grazing ray, while shadows,
      ambient shade and colour are read at the hit; a guided ray that starts inside the look level falls
      back to a point backed off along the ray, so a still mixes two kinds of normal; the four taps with
      some of them inside the surface. It sits in a commit of its own so that it can be taken out.
    - *Detail is no longer needed (WITHDRAWN, see above).* While the ray march is on the hit level is 1/32 of a display pixel
      whatever the Detail row says (`rayDetail`, grep it; `setRayMarch(.., { detail: 0 })` follows the row
      again). A fine level is cheap under it: one 640 x 640 picture, mean of 11 views, Detail 8 / 16 / 64 =
      15.9 / 18.2 / 20.7 ms, where the page's march goes 13.5 / 16.1 / 22.0.
    - *One measure of detail in the tool.* `npm run bench:deep-zoom-march` now runs at Detail 32, counts
      wrong in DISPLAY PIXELS (`--wrongpx`, default 2) and includes the ray march's row; `--detail 1
      --cones 4 --ray none` is the sweep of the earlier studies.
    - *Iterations as a margin* (grep ITERATIONS AS A MARGIN in core.js; with Auto iterations on, under the
      ray march only): the cap stands above the camera orbit's own escape by as many iterations as the map
      needs to stretch space by 1e9 at the rate that orbit has stretched it so far. No depth, no power in it.
      The page's rule (32 + 1.35 a decade) still raises the cap as before; this one only adds, which is what
      power 2 needed. NOT measured on the GPU beyond the smokes; the CPU's "cap + 40 and no ray goes through"
      is its only evidence.
    - *The indication.* The host's `compile` event now also speaks for the ray march's shader (`what:
      'variant'`: compiling, ready, failed), and the top bar shows "ray march: building" meanwhile. Seen with
      a fresh browser profile (`debug/scratch/ray-chip.mjs`): from 11.9 s to 39.4 s after the page opens -
      the two shaders build one after the other. NOT a telemetry field: the module's telemetry must keep the
      frozen page's 16 keys (parity checks it; that is how this was caught).
    - *No start cap.* The page's first-steps cap is not applied to the ray step: CPU 57 -> 51 steps a ray
      with no ray more through a solid; GPU, 17 views, wrong 1.04 -> 0.93 %, kernel passes 431 -> 410.
    - *Where it stands.* Detail 32, a 640 x 640 picture with 4-tap normals, mean of 11 views: the page's
      march 18.9 ms, at step 0.42 32.2, the ray march 19.9 (slowest view, the 1e-33 flight one: 26.3 against
      17.5). Parity 52, direct proof 15, the shell smoke 47, typecheck, the three node checks, build.
    - *The step's own cost is still unlocated.* Two suspects cleared by building the variant without them:
      the line rule's root search (3 or 4 rounds for 6: more steps, no time saved) and the assembly of the
      sample's offset from t (no change). Run-to-run noise is 3 to 5 %; compare only inside one run.
    - *Not done.* His ran-out places (above). The two shaders could build side by side and cut the first
      wait by about 12 s. Retiring Step size, True-gradient march, Detail and the J variant's shader code.
- **How the automatic step should probe a view - measured 2026-10-08, NOT built.**
  - *Against what:* no careful march is needed. Walk a ladder of steps 0.7 apart (0.85, 0.6, 0.42,
    0.3, 0.21, 0.15, 0.105) and compare each rung with the next finer one. On all 17 test views, at
    Detail 1 and 8, with BLA off and on, the share of rays a rung puts more than 4 cones from the
    next rung is 0.7 to 0.95 of its true wrong share against a 0.05 march. Take the first rung
    under the threshold. At 1 %: the flight stays at 0.85 or 0.6, the slicing place gets 0.42, the
    power-2 place at 5e-20 gets 0.21.
  - *How many rays:* 64 x 64, at the picture's own tolerance (its display rows and live Detail,
    not the grid's). 32 x 32 already reads within about a point of 128 x 128.
  - *When to stop:* an honest view cuts its share by half or more per rung. Where the kernel was
    noisy (the 3.5e-16 view, before the rebase to the origin) the share sat at 9 to 10 % on every
    rung: if a rung does not cut it by a quarter, stop and keep the step you had. With the repair
    on no test view does this any more; keep the rule as the safety it is.
  - *The budget goes with it:* steps = 512 x 0.85 / step.
  - *When:* as the camera comes to rest, with the still; per keyframe in a render. Not in flight.
  - *Cost:* the first two rungs take 4 to 10 ms of wall clock (about 1 % of a 1280 x 720 picture's
    work by count, 10 to 26 % of its march time: small draws are inefficient); all seven 17 to
    104 ms, needed only where 0.85 fails.
  - *In the renderer:* a march-only draw of the ordinary shader at a given picture height (its
    G-buffer already holds each ray's depth and kind). Not `api.marchProbe` as it is: its counter
    variant is a 9 s blocking compile.
  - *Not measured:* how the answer moves as the view turns at one place; any power between 2 and 8.
- **`restoreDocuments` runs after the preset fields** (`loadPreset` in `store/engineStore.ts`), so the
  document carrier for saved places works as planned. Places in a scene are MERGED into the
  device's list by id; a scene never deletes a place saved on this device.
- **`installModulation()` is the only registration of the engine's animation tick.** Without it the
  timeline does not play. It is called; the modulation UI is not installed.
- **A view loaded before the renderer is ready must outlive React's first, disposed mount** (dev
  StrictMode): it is kept until a mounted renderer is ready (`deep-zoom/presetFields.ts`).
- **The renderer's canvas reads blank between frames**, so Save PNG draws one frame and copies it
  in the same task (`sceneCanvas` in `deep-zoom/share.ts`). S3-6 (an engine snapshot option) is not needed.
- **The share encoder rounds numbers to four decimals**, so yaw and pitch are stored as text beside
  the camera strings.
- **A dive flies straight ahead and the renderer's distance reading falls in cliffs at depth**
  (2.3e-29 to 1.8e-34 across one 5 % step, traced), so a dive can end decades under its target, and
  from a view that grazes the surface it stops on its 45 s limit. The fix is a truer distance in the
  module (the ray's own hit distance); not planned as a package yet. Starter views need good aim:
  the first two starters dive into the grainy f32 picture and want replacing by the owner.
- **Colour** is `plain` + `mode` (GMT's numbers) + `scale` in the module's units (BLUEPRINT section 3,
  as built). A module adapter that makes `scale` mean what it means in GMT changes the picture and
  needs a scene-version migration; the stamp (`dzSceneVersion: 1`) is in every scene from the first.
- **The smokes run with no window** (`DZ_HEADLESS=1`): same Chrome, same GPU. A headed window takes
  the keyboard; keys typed elsewhere landed in the page under test and failed two parity lines.

**Open calls built on their recommended answer** (say if any should differ): D3 keys, D6 A (places in
scenes, plus a storage mirror), D8 (the engine changes rode along), D13 (11 ranged light rows only),
D14 A (no Fixed mode). D7 (Diagnostics) and D9 (tutorial card) are untouched.

In rows this pass did not rewrite, "the page" as the thing the shell talks to means the module,
and `__name` means `instance.api.name`. Reader-map tags in brackets as in the blueprint; `[gmt n]`
is `GMT-SYSTEMS.md` section n, whose file names I did not re-open.

## Rules for every package

- One agent, one package. A package **owns** the files listed; no other package in the same stage
  touches them. A file not listed under any package of the running stage is read-only for that stage.
- Each stage has one **integrator**. It owns the whole shared set, every stage, with no exceptions:
  `vite.config.ts`, `package.json`, `knip.json`, `launcher.html`, `deep-zoom.html`,
  `deep-zoom/main.tsx`, and with them `registerFeatures.ts`, `storeTypes.ts`, `panels.ts`,
  `setup.ts`, `DeepZoomApp.tsx`. It works twice: it **opens** the stage (about 15 minutes: lands the
  stage's new store-field types in `storeTypes.ts` and the widget ids the stage will register, so
  the other packages typecheck alone) and it **closes** the stage (wires everything, runs the gates).
- **Shell integrators land one at a time, in this order: 1, 2, 3, 4, N5, 5, 6a, 6b, 7.** L5 takes
  the first free slot after stage 5 once L0 to L4 are green. If N3 or N4 is not green when stage 4
  closes, stage 5 and then 6a open anyway on the module's own fly loop and N5 takes the next slot:
  the shell does not wait (DECISIONS K5). Packages of a later stage may be written early where
  "Needs" allows, but its integrator opens only after the previous one has closed.
- **One owner of `deep-zoom/renderer/core.js` at a time.** Module packages (M1 to M8, N4, L0) form
  one queue. Each says which kind it is. *Picture unchanged*: `npm run smoke:deep-zoom-parity`
  stays 47 of 47 and `npm run smoke:deep-zoom-direct` 11 of 11, and the package adds its own check
  for the new handle. *Picture changed on purpose*: it names the parity lines that move and the
  owner looks at the before and after. `core.d.ts` and the types in `index.ts` change in the same
  package. The frozen page (`mandelbulb_deepzoom`, 3b65946) is never edited.
- **The smoke is one file per stage**: `debug/deep-zoom-smoke/stageN.mts`, owned by that stage's
  smoke package. `debug/smoke-deep-zoom.mts` is the runner (written once in S1-3, after S1-A has
  moved the prototype's smoke off that name): it launches Chrome and runs every `stage*.mts` it
  finds in that folder, in name order. No later package edits the runner.
- The shell imports `DeepZoomHost` and the holder only. `deep-zoom/renderer`, `createDeepZoom`,
  `instance.api` and `api.dz` appear only under `deep-zoom/host/`. The stage-1 check greps for this.
- Custom widgets are registered (component registry, `hud.register`, `topbar.register`,
  `stepRenderers.register`), never mounted by hand. No `component: 'panel-X'` of our own.
- Labels: names and numbers. Stacking: `<Layer tier>` / `z('tier')`.

## Gates

`npm run typecheck` and `npm run build` before a commit. A flyable build goes to the owner first;
his first minutes using it are the gate.

## Stage 2 - every look control is an engine panel, with undo

| Id | Owns | Steps | Acceptance | Needs |
|---|---|---|---|---|
| **S2-9 Pause controls** | `deep-zoom/pause.ts` | An `AccumulationController` adapter over `host.pause`, the sample target and reset; the integrator calls `installPauseControls()` only when the host reports the three handles [gmt 7.3] | typecheck; the stage-2 smoke gains "pause, `accumN` stops rising" when M5 has landed | **M5**; without it the package is written and not installed |

## Stage 3 - locations, scene files, links

| Id | Owns | Steps | Acceptance | Needs |
|---|---|---|---|---|
| **S3-2 Scene state and session** | `deep-zoom/presetFields.ts`, `deep-zoom/documents.ts`, `deep-zoom/session.ts`, `debug/deep-zoom-checks/scene-roundtrip.mts` | Preset field `dzView` + the `dzInspect` reset + **the scene version stamp** (a number, 1 from the first saved file; L5's migration reads it - BLUEPRINT section 3, GMT-SYSTEMS 7.4); pending-view slot. Document providers `deep-zoom.path` and `deep-zoom.locations` (`registerDocumentProvider`, `store/documentRegistry.ts`). **First step: read where `restoreDocuments` is called relative to preset fields; if the order breaks a load, fall back to preset fields plus deleting the two keys before a share link.** Session adapter `{ view, flight }`, its own autosave settings store. | typecheck; `scene-roundtrip.mts`: a location row and a view go through serialize / restore with every `cam` string byte-identical, and the restored scene carries the version stamp | S1-0 |
| **S3-4 Claims** | `deep-zoom/claims.ts` | `deep-zoom.locations` claim (rows with `view.cam` of three strings), using `locationParse.ts`. Never throws after a side effect. | typecheck | S3-3 |

## Stage 4 - keys, help, the first dive

| Id | Owns | Steps | Acceptance | Needs |
|---|---|---|---|---|
| **S4-2 Help** | `help/topics.ts`, `help/installDeepZoomHelp.tsx` | Seven topics from last week's Help tabs; generated shortcuts page; What's New (the key changes of DECISIONS D3 are its first entry) with its own `seenKey`. | typecheck | S4-1 (reads the registry at open time, no import) |
| **S4-3 Tutorial** | `tutorial/firstDive.ts`, `tutorial/steps.tsx`, `tutorial/hostEvents.ts` | Lesson 1; step kinds `dz-dive`, `dz-record-dive`; `hostEvents.ts` turns host events and telemetry into `actionBus.fire(...)`. No step relies on `onExit`. | typecheck; manual: the card does not take focus from the picture (unverified today) | S3 for `jumpTo`; the recording step is added to the lesson in stage 6a |

## Stage 5 - gradients from the engine's editor and My Gradients

What the owner sees: a Gradient switch and the full stop editor in Colour; the My Gradients shelf
with "Deep Zoom - Gradient" as a destination; a gradient made in Gradient Explorer is one click away.

| Id | Owns | Steps | Acceptance | Needs |
|---|---|---|---|---|
| **S5-1 Gradient param and push** | `features/colour.ts`, `deep-zoom/colourSync.ts`, `host/gradientPush.ts` | `useGradient` + `gradient`; setting a gradient in Plain mode also sets Orbit trap; push ramp then mode; one push per animation frame with a sequence counter. A dropped image is claimed by the engine's drop zone and handed to `api.loadGradient(file)` (the module's own drop listener is off). No stage-3 or stage-4 package owns `features/colour.ts`, so writing this early collides with nothing | typecheck; `param-map.mts` still green; on a real GPU **check the colours against the editor swatch** - whether the module treats the strip as display or linear is unverified [palette G8] | stage 2. **M2**; interim: a 256 x 1 PNG through `api.loadGradient` [palette 2.3] |
| **S5-2 Integrator** | the shared set | `registerPaletteUI()`, send target with `editsParam`, `favientsPanelEntry`, `mountFavientsPanel` after the manifest with its own `storageKey`, the toggle button. Opens after stage 4's integrator has closed. | all gates; red if `mountFavientsPanel` runs before the manifest (the panel never opens) | S5-1 |

### Stage 5 as built, 2026-10-09

**What the owner gets.** Colour is Plain or Gradient. Under Gradient: the engine's stop editor, a
star that opens My Gradients, and a button that opens the Gradient Studio - the Explorer's Curves,
Adjust and Paint faces in a floating window, previewed on the picture and baked on Apply / leaving
the face / closing it (one undo step). My Gradients is in the top bar; its one Destination is
"Deep Zoom - Gradient"; its Explorer button opens the Gradient Explorer on the gradient in use and
the Explorer says "Back to Deep Zoom". A gradient file dropped on the app lands in My Gradients.
Scenes, share links, undo and saved places carry the gradient.

**Where it is.**
- Module: `api.setGradientTexels(rgba, width)` (grep `A HOST'S GRADIENT` in `renderer/core.js`):
  one row of texels at once, the colour mode left alone. The only change to the renderer.
- Host: `setGradientRamp` is there (`host/moduleHost.ts`). Its one caller is
  `deep-zoom/GradientSync.tsx`, which sends the gradient ON SHOW: a tool's published preview
  (`components/gradient/gradientParamPreview.ts`) when there is one, else the stored value. That
  read is what makes the Studio's faces live here - the Studio's own route to a picture is the
  param's uniform name, which this app's param does not have.
- The param: `dzColour.gradient` (`features/colour.ts`, THE GRADIENT in its header). LINEAR: the
  shading pass lights the texel, then tone maps (read in the shader, and measured on screen: a
  #808080 gradient draws a median of 135 of 255 as 'linear' and 175 as 'srgb'; plain white clay is
  202). The My Gradients target forces 'linear' and leaves Plain in the same write.
- The palette suite: `registerFeatures.ts` (registerPaletteUI, installGradientStudio, the send
  target, the Explorer action), `setup.ts` (the two panel entries and their mounts, after the
  manifest), `main.tsx` (the top-bar button, the gradient-file claim).
- The Explorer trip from a second app: `deep-zoom/explorerTrip.ts`; `EXPLORER_HOSTS` in
  `palette/core/explorerHandoff.ts`; the Explorer's end in `gradient-explorer/v2/fromGmt.ts`
  (`openedByHost`, `BACK_HREF`) and `shareUrl.ts` (`cameFromFor`). ADR-0126 has the update block.
- A pasted location's gradient goes through the gradient gate (`lookOf` in `locationParse.ts`).

**The default gradient is the old palette.** Two of the owner's kept places and one starter were
saved with the palette on and carry no gradient, so `DZ_DEFAULT_GRADIENT` is the renderer's cosine
palette fitted to 16 stops with the palette suite's own fitter (worst 9 of 255 on a channel, mean
1.6). They draw as they did until the gradient is changed.

**Tried once, by hand or by a throwaway script, on the real GPU (2026-10-09) - no smoke step:**
a tile in My Gradients lands as 'linear', leaves Plain, opens the Colour tab and recolours the
picture; the Studio's Adjust face changes the picture while the stored gradient does not change,
Apply writes it as one undo step, undo gives back the gradient and the dial; a place saved with a
gradient brings it back after another was set, and its copy in local storage holds it; a share
link opened after a reload has the gradient; a gradient PNG dropped on the window is added to My
Gradients, the panel opens and the surface's gradient is untouched; the Explorer button with Plain
on hands nothing over, with a gradient the Explorer works on it "From Deep Zoom", "Back to Deep
Zoom" closes the Explorer's tab while this tab is alive and goes to `deep-zoom.html` when it is
not. Why no step: none of these fails silently - each is seen the first time the control is used -
and the panel opening is already pressed by the top-bar smoke. Node checks added instead: the
host's gradient member (`module-host.mts`) and the pasted gradient's gate (`location-parse.mts`).

**Not built:** the favourite last applied is not shown selected in the Explorer (GMT's trip does
that); no stashed scene behind "Back to Deep Zoom" (GMT's trip has one); a gradient cannot be
keyframed (no gradient track exists in the engine; Scale can).

**THE MAPPING VALUE OVER A FRAME, measured 2026-10-09** (the owner's condition for settling GMT's
values or the renderer's). Pass G's own palette value, near hits, a 96-row picture, Detail 8,
scale 1 - so one unit is one run of the gradient. 14 views of the sample flight (6e-7 to 3e-37)
and the three kept places.
- *Orbit trap.* The middle half of the frame spans 0.00 to 0.75 of a run, under 0.1 in 6 of the
  17 views (0.00 at 3.3e-37 and at the power-2 place of 1.6e-19). The median sits between -0.19
  and -0.25 in 10 of the 14 flight views: the minimum is set in the early iterations, which every
  pixel of a deep frame shares. The 2nd to 98th percentile spans 0.2 to 3.1 - a tail of pixels,
  not the body. So under Orbit trap much of a deep frame is ONE colour of the gradient.
- *Iterations.* The middle half spans 0.16 to 1.03 and the 2nd to 98th 0.6 to 4.0: about one run
  of the gradient across the frame at every depth. The median climbs from 1.85 at 6e-7 to 8.41 at
  3e-37, 0.21 of a run for each decade of depth: flying in, the colours move through the gradient
  and wrap every 4.6 decades (a gradient whose ends differ shows a seam there; Adjust's "mirror
  tiles" removes it).
- *What follows.* Iterations is the mapping that stays rich at every depth; Orbit trap, the
  default, goes flat. GMT's values would not help: its orbit-trap value is this one divided by
  -7.5 (flatter still), and its iteration value is divided by the iteration count (about 1/80 of
  this spread at depth, and a jump each time auto-iterations raise the count) - GMT gets its
  contrast from the histogram's fit of scale and offset, which this app does not have.
  Put to the owner as: keep the renderer's values; make Iterations the default mapping.
  **DECIDED AND DONE the same day ("yes to all 3"):** the values stay the renderer's (DECISIONS
  K10; the adapter of GMT-SYSTEMS 2.3 is not to be built) and `dzColour.mode` defaults to
  Iterations (`DEFAULT_MODE_INDEX` in `features/colour.ts`). Saved scenes and places carry their
  `mode` and are not changed; his two palette places and his e20 scene were Iterations already.

---

## Stage L - GMT's Light Studio lights the deep zoomer (rework by route A)

What the owner sees at L5: the Light panel is GMT's - the light list, the orb strip, aim by drag -
with the attachment "Surface" (same behaviour, same name) and Camera. In GMT nothing changes: its
attachment control stays as it is and shows no Surface until GMT can fit a surface plane itself.
**Until L5 the shell lights with the plain `dzLight` sliders of stage 2.**

Placement [gmt 7.4]: L0 takes a slot in the module queue at any time. L-guard and L1 to L4 are GMT
files only and can start beside stage 2. L5 is a shell integrator slot after stage 5. Route A only:
the module keeps its own shading pass and takes N lights; assembling that pass from GMT's shading
chunks (route B) is after stage 7 and is its own decision (GMT-SYSTEMS 8.8). Sizes from [gmt 4.5]:
about 7 to 9.5 sessions in GMT, 1.5 in the module, 2 to 2.5 in the shell.

| Id | Where / owns | Steps | Acceptance | Size |
|---|---|---|---|---|
| **L0 Module: N lights** | `deep-zoom/renderer/core.js`, `core.d.ts`, `index.ts` | An N-light loop in the shading pass with three placement modes; `api.dz.setLights(packed)`; the default rig reproduces today's frame | parity 47 of 47 with the default rig (picture unchanged); a second light at a known direction changes the centre pixel | 1.5 |
| **L1 Light list split** | GMT's `LightingFeature` | The list split out, same feature id `lighting`, same key `lights`, same short ids | L-guard (1); `typecheck`; `smoke:engine-gmt` | 1 |
| **L2 Packing as a function** | GMT's light sync | `packLights(lights, viewFrame, modulations, targets)`; `syncFrame` calls it, writing in place (seam S6) | L-guard (2), bit-equal before and after | 0.75 to 1 |
| **L3 View frame** | the four light UI files | View-frame values (seam S3; the ADR "Lights resolve against a view frame" is drafted here and finished in L4); the UI stops importing `getProxy` / `ViewportRefs`; seven conversion sites onto one helper, each toggle keeping what it writes today | L-guard (3) for each toggle; `smoke:chrome` | 2.5 to 3 |
| **L4 Third frame and length scale** | GMT's light model and attachment control | `frame: 'surface'` with its two write rules, `lightFrame`, `lengthScale` declared on the view frame (seam S4), a control that lists the frames the renderer declares - in GMT that is today's two, so GMT shows no Surface (DECISIONS K4). ADR "Lights resolve against a view frame", drafted in L3, is finished here | L-guard (1) extended: a Surface light opened without Surface support reads as Camera; `{ fixed }` merged onto a Surface light clears `frame`; app-gmt's control renders the same two options (smoke step) | 1.5 to 2.5 |
| **L6 Orb strip lifted** - only if entangled | `CenterHUD.tsx` | The strip becomes its own component | `smoke:chrome` | 0.5 to 1 |
| **L5 Shell lighting (integrator)** | the shared set, `deep-zoom/lighting/**`, `deep-zoom/handoff.ts`, `features/light.ts`, `deep-zoom/presetFields.ts` (the migration), `debug/deep-zoom-smoke/stageL5.mts` | The shell's `lighting` feature (light list + its own shadow group); the deep view frame; mount the orb strip and the panel; pack with an empty modulation map (DECISIONS D12, open, recommended: no light modulation in v1; GMT-SYSTEMS 4.5 says "its modulation map" for the other answer) and upload through `setLights`; Cast Shadows cap; the default Surface rig; aim by drag. **One migration**: `keyElevation`, `keyTurn`, `lightTint`, `lightType`, `lampFalloff` leave `dzLight` and become the default Surface rig; saved places and flight paths made before L5 go through it too | `debug/deep-zoom-checks/light-migration.mts`: a pre-L5 scene's five values give the rig whose packed first light equals the module's old key light | 2 to 2.5 |

---


## Stage 6a - a dive on the timeline: replaced by `ROUTES.md`

**Replaced 2026-10-10.** The owner redesigned how a dive is recorded: the trail is the record button,
keyframes are dropped as you dive, and the camera rides an exponential track on the timeline with the
exact view on each key (DECISIONS K11 to K15). The plan is `ROUTES.md`, stages R0 to R5. What stood
here - one track `camera.u` along a path held beside the timeline, a Flight strip ported from the
prototype's record panel, a ZIP of PNGs from the module's own path render - is in this file's history
(`git log -p`).

Found by reading on 2026-10-10, and why the old packages would not have held: the module's recorder
keeps sparse waypoints, throws the timing away and drops the tail of a flight; its seek writes
iterations, power and phase behind the store; its path render skips the per-frame rules and blends the
light rig from frame to frame; and `Space` is a fly key, so "Space previews" stopped being true at N5.
`ROUTES.md` "Traps found by reading" has the full list with what to grep.

## Stage 6b - video: replaced by `ROUTES.md` R6

**Replaced 2026-10-10.** Rendering is `ROUTES.md` R6: a single-frame render in the module, a runner in
the shape of fluid-toy's, PNG frames to a folder and MP4 / WebM through the engine's dialog. The two
engine changes of the old S6b-2 stand (ENGINE-GAPS E22 and E23), and E24 (a folder-of-frames sink)
joins them.

---

## Stage 7 - the prototype is removed; docs; close-out

| Id | Owns | Steps | Acceptance | Needs |
|---|---|---|---|---|
| **S7-1 Remove the prototype (integrator)** | the shared set; `deep-zoom-prototype/**`, `deep-zoom-prototype.html`, `public/deep-zoom-prototype-core/`, `scripts/sync-deep-zoom-prototype-core.mjs`, `debug/smoke-deep-zoom-prototype.mts`; `debug/deep-zoom-smoke/stage7.mts` | First a table: every step of the prototype's smoke against the stage step that covers it. Only when no row is empty: delete the files and their `package.json` and `knip.json` rows (the `sync:deep-zoom-prototype-core` script line among them) and the `./deep-zoom-prototype/**` glob in `tailwind.config.js`. The parity smoke then reads the historical page from the pinned file | the stage-7 smoke row; `npm run orphans`; parity 47 of 47 with the folder gone; `npm run build` | stages 1 to 6b closed; the owner has said the new shell matches |
| **S7-2 Docs** | `deep-zoom/README.md`, `docs/modules/deep-zoom/index.md` | The map page with a "where to start" table; `npm run context:map` | `npm run context:check` | - |
| **S7-3 Remove interims** | `host/looseParams.ts`, `host/gradientPush.ts` (the PNG route), the polling in `host/moduleHost.ts` | Delete each interim whose module package landed; bump `api.dz.version` | the smoke | the M packages |

Stage L may still be open when stage 7 closes; neither waits for the other.

---

## M packages - changes to the module `deep-zoom/renderer/`

These were "small handles added to the page" in the first version. The page is frozen; every one
is now a change to `core.js`, `core.d.ts` and `index.ts`, additive inside `api.dz`, in the single
module queue (rules above). All are *picture unchanged*: parity 47 of 47 and direct 11 of 11 stay
green, and each adds a check of its own. The shell works on the interim until each lands, except
stage 6b.

| Id | Change | Its own check (goes red when the handle is wrong) | Unblocks | Shell runs on until then |
|---|---|---|---|---|
| M6 | The option seams proven: one test drives a key, a drop, a click, a resize and a context loss through `keyTarget`, `shortcuts`, `dropTarget`, `pointerLock`, `resetStillOnResize`, `onContextLost` - the `@assumption` in `renderer/index.ts` becomes an `@invariant`. Fly keys ignore events with Ctrl, Alt or Meta down. No `alert` and no download under `embed`, with one download left in place: the path render's ZIP parts (`dlBlob(makeZip(...))`), which S6a-3 is built on | each seam's line goes red with that option's branch removed | trust in stage 1 and S4-1 | the options as written, untested |
| M1 | `api.dz.params()`, `api.dz.set(patch)`, `api.dz.schema()` from the `CTLS` rows given ids; setters for iterations, auto iterations, actual pixels, fly speed [host 2.4] [params 5] | `set` then `params` round-trips every id; `schema` ranges equal BLUEPRINT section 3 | S2-3 fully; boot-time range check | `host/looseParams.ts`; two rows left out |
| M4 | **Replaced 2026-10-10 by `ROUTES.md`**: the seek half is gone (the route's evaluator calls `setView`), the render half is R6's `renderFrame`. Was: `api.dz.seekPath(path, u, ease)` with `ease` off-able; `api.dz.renderFrame(req)` -> pixels or blob; the render's frame waits ride `step`, not requestAnimationFrame | a frame rendered at `u` equals the still at the same view within the parity floor | S6a-1 exact scrub; **all of stage 6b** | scrub by time through `api.samplePath`; **none for render** |
| M2 | `api.dz.setGradientTexels(rgba, width)` without the colour-mode flip | the centre pixel follows a two-colour ramp; the colour mode is unchanged after the call | S5-1 | the PNG route, asynchronous |
| M8 | `setView` resets the depth smoothing | telemetry depth equals the new view's distance on the next `step` | S3-1 | the readout lags a jump by a few frames |
| M3 | `api.dz.on(fn)` events: param changed, recording, progress, compile, error | each event fires once for its cause | S6a-3 progress, S2-3 write-back | polling from the tick |
| M5 | `api.dz.pause(on)`, a sample-target setter, a public reset; compile state | paused: `accumN` and `frameCount`-driven work stop; reset: `accumN` returns to 0 | S2-9; a tab hidden or a GPU reset handled well | none |
| N4, L0 | see stages N and L | - | N5, L5 | the module's own fly loop; the `dzLight` sliders |

Order of value: M6, M1, M4, M2, M8, M3, M5; N4 and L0 enter the same queue when their stage
reaches them. Not planned: a field of view in views (GMT-SYSTEMS "Later").


## Dependencies at a glance

Since 2026-10-10 read `6a -> 6b` below as `ROUTES.md` R0 to R7, and `M4 -> Stage 6b` as gone.

```
S1-A (move the prototype aside, npm scripts) -> S1-0 -> (S1-1 | S1-2 | S1-3 written together) -> land S1-1 -> S1-2 -> run S1-3
Shell integrators:   1 -> 2 -> 3 -> 4 -> N5 -> 5 -> 6a -> 6b -> 7      L5: first free slot after 5, once L0..L4 are green
Module queue:        M6 -> M1 -> M4 -> M2 -> M8 -> M3 -> M5, with N4 and L0 inserted (one owner of core.js at a time)
Engine + GMT:        N0 -> N2 -> N0b -> N3        L-guard -> L1 -> L2 -> L3 -> L4 (-> L6)     both can start beside stage 2
N3 + N4 -> N5        L0 + L4 -> L5        M4 -> Stage 6b        M5 -> S2-9 installed
S5-1 may be written any time after stage 2; S6a-2 and S6a-3 any time after stage 3
Stage 7 removes the prototype; it does not wait for stage L
```

## What is not verified and could move a package

- Settled 2026-10-10 by reading, no longer open: the animation engine writes in `TICK_PHASE.ANIMATE`
  (tick `engine.animation`, `engine/animation/modulationTick.ts`) and `deepZoom.step` draws in
  `OVERLAY`, so a played frame is never a tick behind. A scrub from the UI writes outside any tick.
- Whether StrictMode's double mount restarts the 15 s deep compile in dev.
- Whether a Playwright click obtains pointer lock in headed Chrome - decides whether the captured
  steps prove anything before N5 (they report "not proven" if not).
- The six option seams of the module (`keyTarget`, `shortcuts`, `dropTarget`, `pointerLock`,
  `resetStillOnResize`, `onContextLost`): added by reading, no test drives them
  (`deep-zoom/renderer/index.ts`, the `@assumption` lines). Stage 1's smoke is their first test; M6
  is the lasting one.
- Signatures of the loose `api.*` handles beyond those typed in `index.ts` - S2-3's first job.
- Whether `api.dz.diveTo` still overshoots as the page's did - decides whether `host/dive.ts` stays.
- Where `restoreDocuments` runs relative to preset fields - decides S3-2's carrier for the flight
  and the locations (fallback written in its row).
- What app-gmt's overlay host carries beyond the other three copies (S2-4 reads all four first).
- Whether a non-GMT shell has a menu row for Advanced mode (S2-7 adds one if not).
- A saved PNG from the module's canvas being non-blank (`preserveDrawingBuffer`) - decides S3-6.
- The tutorial card taking focus from the picture - decides DECISIONS D9.
- Every GMT file name in stages N and L: taken from `GMT-SYSTEMS.md` 3.4 and 4.5, not re-opened
  here. Its own "unverified" list is its section 9.
- What a cancelled MP4 leaves on disk (stage 6b manual check).
- `deep-zoom/renderer/port/port.mjs` and what its `--check` does after a direct edit of core.js
  (not opened; the index.ts header says it reports a hand edit).
