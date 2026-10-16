# ADR-0140: The Mandelbox jumps the linear prefix of its orbit

> **Update 2026-10-16 (later the same day; the jump also in the navigation's CPU rays, the Mandelbulb's
> included, on the owner's yes; the GPU decisions below unchanged):** On the bulb the picture gains little
> from a jump, since its ray march resumes orbits along each ray. The navigation's rays did not: each of their
> steps ran a whole orbit on the CPU, every frame of a flight or a dive. The seven-ray bundle cost 2.9 to
> 3.9 ms at deep places and 42 ms at the power-4 starter's floor (3.4e-76). `rayFreeJS` now passes `jump` (grep
> `THE NAVIGATION'S JUMP` in `deep-zoom/renderer/core.js`): the box takes its GPU rows' numbers in f64, and the
> bulb builds its own table once per orbit and power. That table is M_k from the triplex Jacobian, the delta of
> dr as a row, and the old skip table's radius rule, kept off the pole axis. The jet starts as M_k·rd, and the
> gradient's pass back over the jumped iterates is M_kᵀ·w. The bundle now costs 0.4 to 1.1 ms at the deep
> places and 4.0 ms at the floor. Over 1,584 rays at 11 views no ray changes between hit and open, and 3 end
> more than 5 % apart: two hits that read shorter, one open ray's lower bound that reads longer. The referees
> (the gate, the direct proof's twin, the harness dive, `estimateAt`) still run whole orbits. Guard:
> `npm run check:deep-zoom-ray-probe` (two breaks red; its header has them). The study's tools:
> `debug/scratch/box-depth/nav-ab.mts`, `bulb-*.mts`.

- **Status:** Accepted
- **Date:** 2026-10-16
- **Supersedes:** in ADR-0135's decision 3, "the skip table" among what the Mandelbox does not use. The box
  now has a skip of its own: one jump over the part of the orbit where a pixel's delta is linear. The rest of
  ADR-0135, and its decision 3's march (the page's step rule, by Step size), stand.
- **Code:** `deep-zoom/renderer/core.js` (grep `THE PREFIX JUMP`, `boxJumpRows`, `BOX_JUMP_TAU`, `uBoxJump`,
  `api.setBoxJump`). Guards: `npm run smoke:deep-zoom-direct` (the Mandelbox, KaliBox and Julia-mode box
  lines), `npm run check:deep-zoom-box-orbit`, `npm run bench:deep-zoom-march` (the bulb: its JSON unchanged).
  The study and every tool behind the numbers: `debug/scratch/box-depth/` (git-ignored; `REPORT.md`).
- **Numbering:** 0131 and 0132 are taken on the unmerged `audio-perf-overnight` branch.

## Context

The owner, 2026-10-16: "the mandelbox slows down as we get deeper in. surely there's a way to optimize/cache
this during a zoom and get some better performance at depth?" Measured on the GPU before anything was built
(RTX 5070 Ti, the shell's defaults, a 1080p window):

- The live frame grew with depth: Lace's dive 3.3 ms at 2e-4 to 10.5 ms at 1.1e-50, Block city's 7.4 ms at
  4e-6 to 41 ms at 8.7e-42. In the shell's own dive to Block city frames went from 6 to 30 ms, the dive slowed
  from about 1.1 to 0.3 decades a second, and it ran out its 45 s at 7e-31.
- All of the growth was iterations per orbit. Every march step ran its pixel's orbit from iteration 0, and
  nearly every orbit ran to where the camera's own orbit escapes: 2.6 more iterations a decade at scale -1.5,
  3.1 at scale 2 (from about 20 an orbit to 138 and 144). March steps per pixel stayed level with depth, and
  kernel passes were 86 to 97 % of the deep draws (draw time against passes and orbits, 31 views, R² 0.98).
- The other ideas put to him measured small or nothing. Rebuilding the reference orbit costs 0.13 to 0.61 ms
  of CPU a frame and nothing of the GPU's. The iteration cap does nothing for speed: orbits escape long before
  it. A march started from the last frame's depth is at best 1.3 to 2 times faster (camera still), and it
  works on the steps, which do not grow.

## Decision

1. **For most of a deep orbit the box's step is linear in the pixel's delta, and the kernel jumps over that
   part in one step.** While the delta stays under the reference's distance to every fold surface, every
   piece of the map is linear or nearly so: the box fold is the identity or a reflection on each axis (KaliBox's
   abs fold: the coordinate's sign), the sphere fold a constant factor inside minR and outside fixedR, and an
   inversion between them, linear to first order. So δ_k = M_k·δc with one 3×3 matrix per orbit index, built
   with the orbit in f64. The prefix up to k holds for every |δc| under a radius R_k (the nearest fold distance
   over the stretch so far; in the inversion shell also `BOX_JUMP_TAU` = 1e-5 of |W|; half |V| against a
   rebase). The shader finds the largest such k by a binary search and runs the kernel's own loop from there,
   with the reference's dr and trap.
2. **One jump, not a skip table.** On the starters' orbits a full binary table (the bulb's BLA, removed in
   ADR-0137) gets within 1 to 4 passes of a single jump: the first iteration where a delta outgrows its radius
   lies near the end of the orbit, not scattered through it. The jump needs four more rows in the orbit texture
   and no table texture.
3. **On by default, for the Mandelbox and KaliBox, in every mode.** No control in the shell. `api.setBoxJump`
   turns it off for measurement only.

## Consequences

- Measured against the kernel before it, same views, same settings (`ab.mts`): the live frame at Arches
  4.2 -> 2.6 ms, Lace 10.6 -> 4.0, Block city 43.9 -> 7.5; at Frame size 640, Block city 95 -> 16 ms. Frame
  time is now about level with depth along the three dives. Views shallower than about 1e-5 are within 5 %.
  In the shell's dive the frame stays at the browser's frame floor (6.2 ms) at every depth on both dives,
  and Block city's dive reaches 6e-39 in the 45 s where it reached 7e-31.
- An orbit is now its tail: 27 to 33 passes at scale -1.5 and 14 to 17 at scale 2, whatever the depth.
- The picture: 0.09 to 0.18 % of pixels more than 8 levels apart (scattered single pixels), where two renders
  of the old kernel at Step size 1 % apart differ on 8 to 11 %. Rays ending more than 2 pixels of depth apart
  0.00 to 0.04 %, none changing between hit and miss. Split pictures: `debug/scratch/box-depth/split-*.png`.
- The direct proof's box, KaliBox and Julia-mode box lines all pass; the worst moved at scale -1.5, 5.7e-59
  (1.5e-4 -> 4.9e-4, against a bar of 1e-3). A pre-rotation, which the proof has no line for, passed the
  proof's own procedure at scale -1.5 and 2.566, from outside and at 1e-20 (`rot-check.mts`).
- The bulb is untouched: its program has no token of this, and the march bench's JSON is the same byte for
  byte.
- The rows cost 0.04 to 0.09 ms a frame on the CPU.
- Not settled: other GPUs. Next, if scale 2 still feels slow: start the march from the last frame's depth,
  which works on the steps (50 to 65 a pixel at Block city).
