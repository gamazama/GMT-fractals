# DRAFT, not filed and NOT IN THE TREE: ADR-0138 - The Mandelbox steps by its own ray estimate

Drafted 2026-10-12 while the owner was asleep. Step 3 of the kernel work he ordered ("great lets do
1-4") was BUILT against `120023fc`, measured on the GPU, and FAILED ITS FRAME-TIME GATE; the tree was
put back. So ADR-0135's decision 3 still describes the tree and nothing is to be filed unless he
takes the build with its frame time. The builder wrote this text; the build itself is kept as a
file, `debug/scratch/box-ray-study/build/core.stage-a.js` (git-ignored; 190 lines added and 20
removed against `120023fc`, all in `core.js`; the shell edits were never started).

What he has to decide is at the foot.

---

# ADR-0138: The Mandelbox steps by its own ray estimate

- **Status:** Proposed. Built 2026-10-12, failed its frame-time gate, not in the tree.
- **Date:** 2026-10-12
- **Supersedes:** ADR-0135's decision 3 ("The Mandelbox is drawn by the page's march on its own
  scalar estimate ... It does not use the ray march ...") and ADR-0137's decision 7 and the Step
  size half of its decision 5. The rest of both stands.
- **Code:** `deep-zoom/renderer/core.js` (grep `THE MANDELBOX'S RAY STEP`, `boxRayStepJS`,
  `rayInForce`, `boxBall`), `deep-zoom/features/quality.ts`, `deep-zoom/host/looseParams.ts`,
  `deep-zoom/host/paramMap.ts`. Guards: `npm run smoke:deep-zoom-direct`, `npm run smoke:deep-zoom`
  (stage 2), `npm run check:deep-zoom-param-map`, `npm run check:deep-zoom-box-orbit`.

## Context

ADR-0135 drew the Mandelbox by the page's step rule, 0.85 of the scalar estimate `(r - 1) / dr`, on
the reasoning that with equal stretch on every axis the ray estimate says what `dr` says. A study
(`plans/deep-zoom-shell/BOX-RAY-STEP.md`) found that it does not: the estimate along the ray is 1.02
to 1.45 times the scalar one at scale -1.5 and 3.2 to 5.65 times at scale 2. The owner, on reading
it: "great lets do 1-4", step 3 being "The Mandelbox's ray step, with a new ADR over 0135's third
decision". The terms recommended to him and built: today's hit surface is kept; far relax does not
act on a ray step; the step is the whole estimate; no resumed orbits in this stage.

## Decision

1. The Mandelbox's program carries a jet of its own: the derivative of the iterate along the ray
   through the folds (a sign an axis from the box fold, a mirror in the inversion shell, the factor
   scale times k, the ray's direction added), and that jet's own derivative. `USE_BOX` brings the
   ray branch of the march with it, without the checkpoint ring.
2. The march steps by the ray estimate `(|z| - 1) / |zdot|`, whole, with four pieces, each from a
   measurement: the set's ball `rho = (2 sqrt(3) L |S| + |c|) / (|S| - 1)` in place of 1; the
   speed's own change (the iterate speeds up through a late inversion: one view had 2.44 % of rays
   behind without it); the early folds (past the nearest fold of a pass that still shapes the jet
   only the scalar bound holds); the aim (the step ends a quarter of a cone under the hit level).
3. The hit test, the bisection, hit refine and the normal taps read the scalar estimate as before:
   today's hit surface.
4. No resumed orbits for the box. Far relax does not act on its step.
5. Step size leaves the shell. A saved scene, link or place that carries one loads and ignores it.
   `api.setStepRelax` and ray bits 0 stay as tools' handles: the careful march of the proofs.

## Consequences

- Cleaner at every view measured on the GPU (RTX 5070 Ti, 128 x 128 rays as a 1080-row picture,
  Detail 32, 88 views): rays on another surface than the careful march 2.07 % -> 0.36 %, behind it
  2.07 % -> 0.05 %; no view worse by more than 0.11 points. Pixels more than 8 levels from the
  careful picture: starters 14.6 % -> 2.9 %, the sweep 23.2 % -> 5.9 %.
- Slower where the ray estimate is little longer than the scalar one. A 512 x 512 draw: Arches
  8.07 -> 11.23 ms (+39 %), Lace 17.4 -> 25.4 (+46 %), Block city 71.1 -> 50.7 (-29 %). A block of
  pixels waits for its slowest ray, and that ray is held by the aim on 74 to 95 % of its steps; a
  pass with the jet costs 1.34 to 1.46 times one without.
- The aim cannot simply go: without it Block city at Detail 1 puts 64 % of rays behind.
- The box's program builds in 3.36 s cold where it took 2.07; three calls of the kernel as before.
- Near scale 1.1 the ball leaves no room and the step is the scalar estimate's: both rules are
  poor there (5.2 % -> 2.5 % wrong).
- Not done: resumed orbits (on the pass counts, a frame's passes would fall to 0.2 to 0.6 of
  these; unmeasured on the GPU); the navigation still steps by half the scalar estimate.

---

## What the gate said (2026-10-12, GPU)

| Gate | Result |
|---|---|
| The bulb untouched | program text the same (only the box's programs differ); the bulb's pictures were not shot before the build was taken out |
| The direct proof | not run on the build; today's march inside the build's program equals the tree's (0 of 524,288 numbers differ) |
| The box cleaner | HOLDS: starters 0.51 -> 0.04 % of rays wrong, a dive of 28 views 1.04 -> 0.31 %, a sweep of 56 views 2.70 -> 0.41 % |
| Pictures against the careful march | HOLDS: starters 14.6 -> 2.9 % of pixels more than 8 levels off |
| Frame time | FAILS: mean +4.7 % (the bound was 3 %), worst +39.3 % (the bound was 8 %) |
| Build time | 2.07 -> 3.36 s |

By scale, the build's "block wait" (what a frame's time follows) as a share of today's: 1.3: 0.34;
2: 0.49; 3: 0.73; -1.7: 0.84; -2: 0.85; -1.5: 0.91; -3: 0.97; -1.1: 0.99; 4: 1.03; -1.3: 1.15;
1.1: 1.16. With the jet at about 1.35 a pass, only the first three come out faster.

The study's one bad view (scale 3, 9e-9, aside: 2.44 % of rays behind) was traced before the build:
a sphere-fold inversion 8 iterations before the escape makes the iterate speed up DURING the step,
and the rule had taken its speed as constant. Fixed in the rule (the jet's own derivative is
carried): 0.00 % behind at the whole step. No 0.7 fallback was needed.

## For the owner

1. **Take the build as measured, or leave the box as it is.** It is cleaner at every one of 92
   view-settings and retires Step size; it is faster at scales 1.3, 2 and 3 and slower at the
   negative scales the starters use (Arches +39 %, Lace +46 %).
2. **The aim** is where the time goes at negative scale and what makes the whole step safe: a
   design question (hits landed on the level, against time). No second design was tried.
3. **No build needed: far relax.** Today's far relax causes two thirds of today's wrong share off
   the starters (the sweep: 2.70 % with it, 0.84 % without; at scale 4, 6.56 -> 0.31 %), for 1.37
   times the block-wait passes. Switching it off for the box is one default.
4. **Resumed orbits** (stage B): on the pass counts a frame's passes would fall to about 0.58 /
   0.39 / 0.20 of the build's (Arches / Lace / Block city). Not measured on the GPU, and a mean pass
   count is exactly what misled the study about the step alone.
