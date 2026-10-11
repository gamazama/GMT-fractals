# ADR-0134: The deep zoomer flies by rays - the speed follows what is looked at and what lies ahead of the move

- **Status:** Accepted
- **Date:** 2026-10-09
- **Relates to:** ADR-0133 (navigation emits displacements - unchanged, and what made this small).
  Code: `deep-zoom/renderer/core.js` (grep `THE FREE DISTANCE ALONG A RAY`, `senseBundle`,
  `rayFreeJS`, `pertOrbitJetJS`), `deep-zoom/flyPace.ts` (the rule), `deep-zoom/flyCamera.ts`
  (grep `frame.sense`), `deep-zoom/DeepZoomNavigation.tsx` (the wiring), `deep-zoom/depthNow.ts`
  (the depth the app shows), `deep-zoom/host/moduleHost.ts` (grep `aheadOf`: the dive),
  `deep-zoom/locations.ts` (grep `flightEnded`: a flight's undo step).
  Guards: `npm run check:deep-zoom-ray-probe`, `npm run check:deep-zoom-fly-camera`,
  `npm run check:deep-zoom-module-host`, and stage N5 of `npm run smoke:deep-zoom`.
  The study behind it (pure node, its logs and tools): `H:/tmp/dz-nav-study/`.
- **Numbering:** 0131 and 0132 are taken on the unmerged `audio-perf-overnight` branch.

> **Update 2026-10-11 (the skip table is gone; decision unchanged):** where this record speaks of
> "skipping iterations in the CPU probe the way the GPU march does (BLA)", the GPU march no longer
> does: the skip table left the renderer with the page's program (ADR-0137), and the ray march
> resumes orbits from checkpoints instead. As a lever for the CPU probe's cost the idea stands on
> its own; the table's build is in the history of `deep-zoom/renderer/core.js` before `f9f01e1a`
> (grep `blaBuild` there).

> **Update 2026-10-09 (the owner flew it; decision unchanged, one number added):** "fly mode is
> working pretty great ... i think maybe its 3x too fast overall". A pace is now A THIRD of the
> distance a bundle reads (`DZ_PACE_SHARE` in `deep-zoom/flyPace.ts`), which is also what the
> measurement says: the estimate the speed used to follow read 0.24 to 0.51 of the distance to the
> middle of the picture along his recorded flight. So the second consequence below ("the same speed
> setting flies faster in a dive") no longer holds: the same setting flies an ordinary dive as it
> did, and the two rules can be compared in flight at one setting. The one-frame limit is unchanged.

> **Update 2026-10-09 (Orbit mode; the same seam):** Tab switches to Orbit mode
> (`deep-zoom/orbitCamera.ts`, wired in `deep-zoom/DeepZoomNavigation.tsx`): a drag turns the camera
> about the point under the pointer, the wheel flies along the pointer's ray, a right drag moves the
> point - GMT's Orbit mode by its behaviour, not its code. A pivot is a point of the picture and a
> distance along its ray (one ray of the same probe, `host.freeDistance`); each move is a
> displacement worked out from the angles alone (a turn is `distance x (ray before - ray after)`), so
> no absolute position is needed and ADR-0133's seam carries it at any depth. Every orbit move is cut
> to half the nearest ray ahead of it, like a fly move. Guards: `npm run check:deep-zoom-orbit-camera`
> and two steps of smoke stage N5. GMT's own orbit (drei's controls, local positions) is untouched.

> **Update 2026-10-09 (Orbit's clearance; the owner flew Orbit mode):** "the orbit is also really
> fantastic! though i wonder if we still have nearest surface data on each frame, if we could prevent
> it from colliding with the surface, relatively to the orbit's axis point". The rays alone let a turn
> bring the camera onto the pivot's own surface asymptotically (half the way each frame). A turn or a
> drag is now also held to a CLEARANCE: the camera is not carried to where the renderer's estimate of
> the nearest surface - the same number the speed used to follow, read at the place the move would end
> (`host.estimateAt`) - is under 0.08 of the pivot's distance, unless it is no nearer there than where
> the camera stands. So the estimate at the camera keeps a job it is good at (how near is anything,
> roughly, in any direction) and loses the one it was bad at (how fast to fly). It is a comfort
> distance: the rays are still what stop a move. The wheel is not held by it. Guard: the step "in
> Orbit mode a turn keeps its clearance" of smoke stage N5.

> **Update 2026-10-09 (the middle drag, and what the rays cost in the app; decision unchanged):**
> Orbit mode gained GMT's middle drag: the wheel's flight along the pivot's ray, by hand (0.005 a
> pixel, up is towards; grep `DZ_MIDDLE_ZOOM`). Tried once in the app, no smoke step - the owner:
> "way over over kill". And the bundle's cost was measured in the app on the owner's machine (4 s
> a case, 1280 x 800, the real GPU): under 3.2 ms a frame on average at the starters down to
> 1e-50 (60 frames a second held at 1e-30 and 1e-50). At the deepest one (3.4e-76; 148 iterations
> and rising) it is 1.7 ms a frame flying straight, but 10.5 ms looking round while flying and
> 7.1 ms in an Orbit turn: a look or a turn marches a fresh bundle every frame, and every orbit in
> it runs all the iterations. That place drops frames in every moving case and the probe is only
> part of it: backing out fell to 34 frames a second with the probe at 0.8 ms a frame, so the
> renderer's own work for a moved camera is the larger part. Not fixed, and the old rule was not
> measured there for comparison. So "if the bundle's cost shows in flight" (the last alternative
> below) has its first numbers. Two levers for the probe's share: the picture's own depth, as that
> alternative says, or skipping iterations in the CPU probe the way the GPU march does (BLA),
> which changes no reading.

> **Update 2026-10-09 (what a ray steps by; the rule above unchanged):** the owner, at a power-9
> place with a theta phase of -1.552 and the camera 3e-5 from the pole axis: "going extremely
> slowly". A ray stepped by the ray estimate alone, 0.5 r ln r / |J rd| - the escaping iterate's
> speed along the ray. Under a theta phase the triplex power is discontinuous on the pole axis: a
> point beside it swings a full turn round it within its own distance from it, and the estimate
> counted that swing as speed. It read 7.9e-5 ahead where the solid is 2.3e-4 away, and 5.7e-7
> sideways where it is 0.53 away, in 165 to 340 steps a ray. A ray now steps by the LARGER of that
> and the true-gradient estimate, 0.5 r ln r / |grad| (how fast the escaping radius changes with
> the point; one pass back over the orbit, grep `pullGradJS`). Both are at most the distance to the
> level's tangent plane along the ray, so the larger is as safe to first order as either; they fail
> apart (the gradient's creeps along a wall, the ray's at the axis). At that place: 1.9e-4 ahead in
> 12 steps; at the starter views the readings agree with the old rule within 3 %, in fewer steps.
> Guard: the three "gradient:" lines of `npm run check:deep-zoom-ray-probe`. NOT changed: the
> picture's own ray march on the GPU steps by the same ray estimate (grep THE RAY ESTIMATE) and
> can be expected to crawl at the same axis.

## Context

Flying covers `speed x distance` a second, so the hands work the same at 1e-3 and at 1e-70. Which
distance was never decided; it was inherited twice.

- **The deep zoomer used the estimate at the camera** (grep `distance probe` in core.js): one
  number from the reference orbit, eased by the engine's fly integrator, one frame cut to 0.8 of it.
- **GMT uses the depth of one pixel at the centre of the previous frame** (grep
  `lastMeasuredDistance` in `engine-gmt/engine/worker/WorkerDepthReadback.ts` and
  `engine-gmt/navigation/usePhysicsProbe.ts`), eased 8 % a frame when it rises, with no limit on
  one frame's move.

The owner asked (2026-10-09) why the deep zoomer's speed "isn't latching on correctly" in difficult
places, mostly beyond 1e-33, and whether GMT's way - which lets you point at something far and fly
to it - would be "catastrophic to the dive if it catches an incorrect distance". Both were measured
on his recorded flight and kept places, on the CPU in f64 against a referee ray:

1. **The estimate at the camera is the nearest surface in ANY direction.** At his power-4 place it
   is 3.4e-76 away and about 150 degrees off the view axis - behind the camera. Nothing in the
   picture is nearer than 5e-58; the centre of it is 3.8e-54 away. Holding W there, the old rule
   was still a million times too slow for the scene after 30 s (400 times after 16 s with Shift):
   the distance can only grow as fast as the camera crawls away from that wall. Mildly, the same
   everywhere: along the recorded flight the centre of the picture is 2 to 4 times farther than
   the estimate.
2. **The estimate reads the true fractal, not the solid that is drawn** (limited iterations). Next
   to the drawn surface it can read 20 times the free distance: at the power-2 5e-20 place, W at
   the default speed and 60 frames a second put the camera inside the solid after 4.0 s.
3. **GMT's rule as it is goes through surfaces at depth** (simulated): a dive with Shift moved 10.8
   times the free distance in one frame; backing out with S, 661 times (the speed follows what is
   looked at while the camera moves the other way); strafing at the power-4 place, 4e20 times.
4. **Both eases work on the distance, not its logarithm.** A reading 1000 times too far raises the
   speed about 20 times in one frame.

Published work has both families and neither fix: McCrae et al. (2009, "Multiscale 3D Navigation")
scale speed by the minimum of a distance cube map - the nearest surface in any direction, case 1
above - and found robust averages "less predictable"; Ware and Fleet (1997, "Context Sensitive
Flying Interface") scale by sampled screen depth and warn that fine features sampled sparsely give
"rapid changes in the depth scaling factor".

## Decision

1. **Navigation asks the renderer how far it is free along rays.** `host.sense(axis)` marches seven
   rays about an axis (the axis and six at 4.2 degrees) on the CPU, in f64, on the frame's own
   reference orbit, from the camera as it is now to the solid as it is DRAWN: a sample inside the
   solid is halved back onto its boundary, so the answer cannot be past what the picture shows. It
   returns `near` (the nearest ray) and `second` (the second nearest), with how many rays met a
   surface and how many are unfinished. Rays step by half the ray estimate (the escaping iterate's
   speed along the ray, one vector carried with the orbit).
2. **The pace - the distance the speed is multiplied by - is the nearer of what is looked at and
   what lies ahead of the move.** Each is the `second` of a bundle: about the view axis, and about
   the move's own direction when that differs (S, A, D, up, down, a diagonal). For W alone they are
   one bundle, which is GMT's centre probe made of seven rays instead of one pixel. The estimate at
   the camera stands in only when nothing lies that way at all.
3. **The pace falls at once and rises by a limited number of decades a second** (default 4, four
   times that with Shift; the owner's to set in flight). The ease is in the logarithm: three wrong
   far frames raise the speed 1.6 times.
4. **One frame never moves more than half the nearest ray ahead of the move**, read that frame.
   This, not the pace, is what keeps the camera out of the solid; the approach is asymptotic by
   construction.
5. **The depth the app shows is what is looked at** (the owner: "we lead with the looked at
   readout"): the readout, the depth scale, the status chip, the milestones, a saved location's
   depth and the dive's target all mean the distance to what is in the middle of the picture. The
   nearest surface is shown beside it when it differs by more than half a decade, and stands in
   when nothing is ahead.
6. **A dive closes on the nearest ray ahead**, and asks unfinished rays on before it reads a
   distance.
7. **A flight is one undo step** when it moved the camera, opened and closed at its landing;
   flights within 1.5 s of one another are one. (The owner: camera undo comes first - it is what
   makes a navigation experiment recoverable.)
8. **The old rule stays selectable** (Settings > Interface > Camera > "Speed follows the view") until
   the owner has flown both. Each rule has an integrator of its own in `flyCamera.ts`, so switching
   in flight cannot hand one rule the other's eased distance.

The engine did not change. The integrator is run for a distance of 1, which gives the move's
direction and its length per unit of pace; its own ease then never acts.

## Consequences

- **Measured in simulation, 30 runs of the rule with a bundle** (W, S, D, with and without Shift, at
  15 to 60 frames a second, at the hard places): the camera was never at or past a surface and
  never inside; at the power-4 place the speed matched the scene after 5.4 s (1.3 s with Shift),
  where the old rule had not after 30 s. **On the real GPU** (stage N5 of the shell smoke): the
  readout at that place reads through to 2.6e-54 within a second, three seconds of W move the
  camera 5e-57 where the old rule moves about 1e-74, and a dive from there to 1e-60 arrives at
  9.8e-61.
- **The same speed setting flies faster in a dive**, 1.3 to 20 times in the simulations, because
  the old distance under-read. The default (3.6) and the rise limit are the owner's to revisit
  after flying it.
- **A bundle costs main-thread time when it is marched**: 0.5 to 5 ms a frame in node on the
  development machine, unmeasured in the app. The renderer keeps each bundle - asked again with
  the camera moved less than a twentieth of its nearest ray it marches nothing - and a ray has a
  budget of 64 steps a call, going on from where it stopped while the camera stands still (the
  power-4 place needs about 300 steps a ray, read through in five asks).
- **`near` and `second` can be lower bounds** while rays are unfinished (`open > 0`). The pace may
  follow a lower bound (it is conservative); a readout and a dive may not, which is the fault the
  smoke found in the first version of the dive (a lower bound of 5.6e-71 read as "already that
  deep").
- **Things still keyed to the estimate at the camera**, by reading and not measured: auto
  iterations, the far relax ("beyond 8 camera distances"), the lamp's falloff. At a view like the
  power-4 place they are scaled to the wall behind, not to the picture.
- **The ray estimate is measured safe, not proven** (the 2026-10-09 march research says the same).
  The check's referee is an independent march at a tenth of the older estimate.

## Alternatives not taken

- **GMT's centre pixel as it is.** Simulated; see Context 3.
- **The nearest surface in every direction, measured properly** (a distance cube map, as McCrae et
  al.). It is what the old rule approximated; it cannot fly towards something far past a near wall.
- **The picture's own depth as what is looked at.** The renderer already reads a 32 x 32 depth map
  back each frame for the light rig (grep `rigBlit`), free of CPU cost. Not taken now: it is one or
  two frames late, exists only under the new look, and carries the picture's own march errors; the
  CPU rays are synchronous and testable in node. It remains the obvious next step if the bundle's
  cost shows in flight.
- **An option on the engine's integrator to switch its ease off.** Written and removed the same
  day: handing the integrator a distance of 1 makes its ease inert, and a second integrator for the
  old rule keeps the two apart. The engine stays untouched.
