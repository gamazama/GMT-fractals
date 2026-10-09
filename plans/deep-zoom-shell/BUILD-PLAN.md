# Deep Zoom gmt-shell - build plan

Architect pass, 2026-10-07, corrected the same day after three critics
(`research/critic-builder.md`, `critic-native-maximalist.md`, `critic-deep-zoomer.md`).
**Reconciled 2026-10-08** with the owner's five decisions (DECISIONS K1-K5): the standalone page is
frozen; the renderer is the module `deep-zoom/renderer`; the embedded prototype moves aside; GMT's
navigation and Light Studio are reworked generically and used here (stages N and L, from
`GMT-SYSTEMS.md` sections 3.4, 4.5 and 7); the shell never waits for a rework. Target is
`BLUEPRINT.md`; engine changes are `ENGINE-GAPS.md`; owner calls are `DECISIONS.md`.
**Building started 2026-10-08.** State and corrections follow; the stage tables below are the
original plan and are not rewritten.

### As built, 2026-10-08 (branch `deep-zoom-tool`, unpushed)

| Stage | State |
|---|---|
| 1 | **Closed.** S1-A, S1-0, S1-1, S1-2, S1-3. Smoke stage 1: 15 steps (19 before N5 took the pointer capture and the "hold W" steps). |
| 2 | **Built**, except: pause controls (S2-9, waits on a module pause), the Diagnostics tab (D7), the `actualPixels` row. Advanced mode has a Settings row and GMT's backtick key (it had no switch at all until the owner hit that on 2026-10-08); Step size is not advanced. Smoke stage 2: 10 steps (one for Hit refine, one for these). |
| 3 (added 2026-10-08) | **Kept places**: `deep-zoom/data/places.ts`, the owner's own places as project data - cards on the Locations tab and the hard cases for march-quality measurement. A location (saved, copied or kept) now carries its march settings (step size, hit refine, reach): his power-2 place needs step 0.1 and came back broken without them. |
| 3 | **Built**, except: Export all (JSON), the scene-file claims (S3-4), Session / autosave (the session half of S3-2). Smoke stage 3: 8 steps. |
| 4 | **Keys built** (S4-1; smoke stage 4: 3 steps). `C` is a fly key since N5; "next colouring" is `V`. Help topics, the shortcuts page, What's New and the first-dive lesson (S4-2, S4-3) are not built. |
| N | **Built: the shell flies with GMT's navigation.** N0 (replay guard), N2 (the integrator in the engine, ADR-0133), N0b (GMT's fly smoke covers the hook's wiring), N3 (the input hook in the engine, renderer-free), N4 (the module lets a host own the input), N5 (`deep-zoom/flyCamera.ts`, `DeepZoomNavigation.tsx`, `navigationState.ts`; smoke stage N5: 8 steps). N1 (a registered distance source) was dropped: the distance stays a plain argument. Not built: on-screen sticks for a phone, an orbit mode, roll. |
| N, again (2026-10-09, not in the plan; ADR-0134) | **The speed follows rays, and Orbit mode.** The owner asked why the speed "isn't latching on" in difficult places; measured (the study: `H:/tmp/dz-nav-study/`), the estimate at the camera is the nearest surface in ANY direction - at his power-4 place a wall behind the camera, 22 decades nearer than anything in the picture - and it reads the true fractal, not the drawn solid (at the power-2 place W flew the camera inside in 4 s). Built: a CPU ray probe in the module (`api.dz.sense` / `freeDistance`: seven rays about an axis, to the solid as drawn); the pace = a third of the nearer of what is looked at and what lies ahead of the move, falling at once and rising at most 4 decades a second (`deep-zoom/flyPace.ts`; a third because he flew the whole distance and found it "3x too fast overall"); one frame never more than half the nearest ray ahead; the depth the app shows is what is looked at ("we lead with the looked at readout"), with the nearest surface beside it when it differs; the dive closes on the rays; a flight is one undo step; the old rule is a switch in Settings > Camera. **Orbit mode on Tab** (`deep-zoom/orbitCamera.ts`): drag turns about the point under the pointer, the wheel flies along its ray, right drag moves it - displacements from the angles alone, GMT's orbit code untouched (the plan's "4 to 6 days, high GMT risk" was for reworking GMT's own). A turn or a drag keeps a clearance of 0.08 of the pivot's distance from every surface, by the renderer's estimate at the place the move ends (`api.dz.estimateAt`; the owner, having flown it: "really fantastic ... if we could prevent it from colliding with the surface, relatively to the orbit's axis point"); a held turn slides (yaw alone, then pitch alone) and the pivot's mark fills in. A middle drag is the wheel's flight by hand (GMT's rate and direction: 0.005 a pixel, up is towards; tried once in the app - 140 pixels up covered 50.3 % of the way to the point under the pointer, 140 down gave it back - and given no smoke step, the owner: "way over over kill"). The engine did not change. Guards: `check:deep-zoom-ray-probe`, `check:deep-zoom-orbit-camera`, the pace lines of `check:deep-zoom-fly-camera`, seven new steps of smoke stage N5 (15 now). NOT done: his verdict on the rise limit, the clearance share and Orbit's feel; ROLL (Q / E) - not a performance or a maths limit: the renderer's camera is a yaw and a pitch, and every stored view carries those two numbers, so roll is a third number through views, paths, locations, scenes and links, about a session; the right drag, the middle drag and invert-Y are not opened by a test. **THE PROBE'S COST IN THE APP**, measured 2026-10-09 on the owner's machine (headless Chrome on d3d11, 1280 x 800, 4 s a case; the tool is `H:/tmp/dz-nav-study/bundle-cost.mts`): under 3.2 ms a frame on average at the Surface, Grain of sand and Certified edge starters in every case (idle, W, a strafe, backing out, W while looking round, an Orbit turn; worst single frame 18 ms, an Orbit turn at 1e-50), with 60 frames a second held at the two deeper of them (at Surface the W flight itself dropped frames, 169 in the 4 s, with the probe at 0.2 ms a frame). At the deepest starter (3.4e-76, 148 iterations and rising) it is 1.7 ms a frame flying straight, but 10.5 ms looking round while flying (worst 30 ms) and 7.1 ms in an Orbit turn (worst 63 ms): a look or a turn marches a fresh bundle every frame, and every orbit in it runs all the iterations. That place drops frames in every moving case (137 to 214 frames in the 4 s against 241 idle) and the probe is only part of it: backing out fell to 137 frames with the probe at 0.8 ms a frame, so the renderer's own work for a moved camera is the larger part; the probe's share is biggest looking round (10.5 ms of a 24 ms frame). NOT fixed, and the old rule was not measured there for comparison. The lever that changes no reading is skipping iterations in the CPU probe the way the GPU march does (BLA); the other is the picture's own depth (ADR-0134, the last alternative). |
| Engine | S2-4 (one overlay host) and S3-0 (state-library options) landed. |
| Module (new, not in the plan) | **HIT REFINE**, opt-in, off by default (`api.setHitRefine`, the Quality tab's Hit refine, Inspect > Compare > Refine): halve each hit's last march step onto the level it was meant to land on. Built for the slicing the owner reported at 2.76e-39; numbers in the shader comment. Parity 52 and direct 11 green with it off. |
| Tooling (2026-10-08) | **`npm run bench:deep-zoom-march`** (`debug/deep-zoom-march-study.mts`, on the renderer's new `api.marchProbe`): for the kept places and the sample flight, what share of rays each march setting puts on another surface than a careful march, and the work it costs, counted by the shader. 17 views x 14 marches in 3 s where the first studies took 4 to 10 minutes. It is the measuring tool for the automatic step, which is NOT built. |
| Module (2026-10-08) | **REBASE TO THE ORIGIN**, a precision repair of the kernel, opt-in at the module (`rebaseOrigin`, default off = the frozen page) and ON in the shell: the grain where orbits pass the origin and run on is gone. What it is and what was measured: "That fault is REPAIRED" below. Parity 52 with it off; the direct proof gates on it. |
| Module (2026-10-08) | **FAR HAND-OFF** moved out, opt-in at the module (`farHandOff`, default 1e-3 = the frozen page), 0.5 in the shell: the deep march, not the plain f32 one, now draws everything nearer than 0.5 from the camera. What was wrong and what was measured: "The error around 1e-4" below. |
| Module | Done inside other packages: `setIters`, `setAutoIters`, two read-backs (part of M1); `setView` snaps the distance (M8); fly keys ignore a key pressed with Ctrl / Alt / Meta (part of M6). |

How it was built changed after the first evening: one builder agent per package cost about the
same whatever the package's size, and the usage cap was hit with stage 1 barely closed. From
stage 2 on it was built in one session, depth-first, one commit per visible piece.

**Corrections to this plan found by building** (each is in the code's JSDoc where it bites):
- **The fly guard cannot be a priority-10 binding with a condition** (S2-6, S4-1, BLUEPRINT section 9).
  The shortcut dispatcher picks the winning binding for a key first and tests its `when` afterwards,
  with no fall-through, so such a guard swallows the key with the pointer free too. It was a shortcut
  SCOPE pushed while the pointer was captured. **Gone at N5** with the capture itself: Space stays
  fly-up through the store's `cameraMode` (the predicate the timeline's own binding tests), and the
  captured-only keys (9 / 0, T / Y) left, since a slider is reachable with the pointer free.
- **Navigation (stage N) as built differs from the plan in four places.** (1) The turn is not
  "level the quaternion and write it back": the turn the integrator applied is taken apart and
  added to the pitch and the yaw (a turntable), because reading yaw off a turned object flips at
  the pole. (2) The fly speed has the owner's range, 0.01 to 8 (default 3.6). What keeps a fast,
  boosted, slow frame out of the surface is the adapter: the frame delta is clamped at 0.05 s (the
  standalone page's own number) and one frame's move is cut to 0.8 of the distance. (3) The fly speed is a preference in localStorage, not a feature param: a saved place
  must not change how fast you fly. (4) Q and E are down and up (the renderer has no roll), beside
  GMT's Space and C. With the surface distance at 0 (inside the solid) nothing moves; Backspace or
  Home is the way out. The depth readout no longer fades while flying and shows the fly speed.
- **f32 is no longer the shallow picture (2026-10-08, the owner: "can we do away with the fp32
  version" - yes).** The shell starts the renderer with `mode: 'deep'`; the deep path draws every
  depth and f32 shows only while the deep shader compiles. The renderer keeps the camera off the
  exact z axis (POLE GUARD). The shell's Precision control, its map row and the pusher's `repush`
  are gone; the notice on the Light and Colour tabs now says the renderer is still starting; the
  depth scale lost its "1e-4 perturbation" mark. Far ground (every hit of a shallow view) takes
  the palette and the near surface's albedo, by a renderer option the shell turns on (`farLook`),
  and Hit refine refines far hits as well.
- **Precision Deep at a shallow depth draws one flat colour** - WRONG AS WRITTEN, corrected the same
  day. It happens only with the camera exactly on the bulb's z axis, where the start view sits and
  where the deep path's reference orbit is degenerate. 1e-9 off the axis the deep path draws the
  whole bulb with the new look, better than f32. So f32 is needed only for the seconds the deep
  shader compiles at boot; dropping it as the shallow picture is an open call with the owner (it
  wants the on-axis case fixed, a palette colour for far ground, and refine for far hits). A smoke
  step about Light or Colour still uses a view that is deep by itself.
- **Measured 2026-10-08, not yet acted on: how small a march step a view needs.** Hit refine is
  needed at every depth (5 to 32 % of pixels on the wrong surface without it, one sample). The step
  size a view needs depends on the POWER far more than on depth: power 8 is fine at 0.85 with refine
  down to 1e-30 and wants 0.5 below 1e-33; the owner's power-2 place at 5e-20 is 85 % wrong at 0.85
  and needs 0.1. A rule keyed to depth is therefore wrong; an automatic step has to be measured per
  view. Open call with the owner.
- **The measurement above re-read with the march tool (2026-10-08, later the same day).** The first
  studies compared shaded pixels; the tool compares where each ray ends. Their numbers reproduce
  exactly with their own measure, but "on the wrong surface" was the wrong reading of most of them:
  - Along the flight, the 5 to 32 % are rays on the RIGHT surface that landed 0.25 to 1 pixel cone
    off the level (wherever the last step fell); shading from depth shows that as terraces. About
    half of all rays are that far off at step 0.85, at every depth, and Hit refine 3 leaves 0.1 to
    3 %. Rays on another surface (more than 4 cones away) are 0.1 to 1.4 % there at step 0.85.
  - The step is what a wrong surface needs. At a 1080-row picture's tolerance, step 0.85: the
    power-2 place at 5e-20 96 % wrong (1.8 % at 0.3, 0.8 % at 0.21), the slicing place at 2.8e-39
    36 % (2.8 % at 0.6, 0.6 % at 0.42), the flight 0.2 to 2.5 %.
  - A small step needs a larger step budget: at step 0.1 with the default 512 steps, 0.1 to 8 % of
    the flight's rays run out. An automatic step has to scale the budget with 1 / step.
  - The 1.1e-33 flight view at Detail 8 is NOT rays running out of steps (none do; 512, 2048 and
    16384 steps give the same rays). Its wrong share falls with the step like any other view's (7 %
    to 1.4 %, half of it the far relax). What stays, about 10 %, is rays landing a sixteenth to a
    half of a pixel apart in the finely ridged part of the picture, where two careful marches
    disagree with each other as well.
  - The 3.5e-16 flight view's floor is a FAULT IN THE KERNEL, not in the march: in the bottom tenth
    of that picture the GPU's distance estimate is off by up to 89 % against the BigInt direct
    referee, while the same kernel in f64 on the CPU is right to 2e-9. Single-precision rounding,
    growing steeply with how far the hit is from the camera in surface distances (1e-5 at 4, 1e-3
    at 10, 0.3 at 13). No step size has a say there. The direct proof (`smoke:deep-zoom-direct`)
    checked the centre ray only and did not see it.
  - **That fault is REPAIRED (same day): the kernel's REBASE TO THE ORIGIN**, a renderer option
    (`rebaseOrigin`, `api.setRebaseOrigin`), off by default so the module still equals the frozen
    page, ON in the shell. Cause: when the kernel restarts an orbit against the reference it took
    the difference from the reference's first point, which is c and not 0; an orbit that had come
    close to the origin and needed many more iterations (there: a pass at 0.19 on iteration 16,
    eight more to escape) was from then on plain single precision at full size. Now such an orbit
    is carried onto the origin with one direct iteration and its difference is small again.
    Measured on the GPU against the BigInt referee, 169 rays a view: 3.5e-16 view 23 rays over
    1e-3 and 14 over 1e-2 (worst 0.31) -> none over 1e-3 (worst 4.5e-4); 1.1e-33 view 37 over 1e-3
    -> none. The march tool on the 3.5e-16 view: unsettled 4.1 % -> 0.01 %, wrong at step 0.85
    5.2 % -> 0.5 %. It also explains most of what stayed at 1.1e-33, Detail 8: rough at step 0.5
    with refine 3 goes 13 % -> 3 %. March time 0.93 to 1.01 of before. Ordinary views move on 0.1
    to 0.2 % of pixels. Guard: the direct proof now ends with those two off-centre grids and gates
    on them (seen FAIL with the shader branch switched off); `ORIGIN=1` runs its 11 depths with
    the repair on, `BLA=1` passes too.
- **The error around 1e-4 was the far hand-off (2026-10-08).** The page hands a ray that has gone
  1e-3 from the camera without a hit to a plain f32 march from an f32 camera position. That march
  resolves about 1e-7, and just past the hand-off its hit level (tolerance x t) is about 1e-7, so
  its hits are noise: against the BigInt referee on a 1080-row picture, the share of far-march hits
  standing more than half off their level is 7 % at camera depth 8e-3, 21 % at 3e-3, 68 % at
  1.2e-3 and 79 % at 4.2e-4; deep-march hits, none. With the hand-off at 0.5 every hit in those
  views is a deep-march hit on its level. Cost: nothing deeper than 2e-4 (those pictures had no far
  hits); the shallow views between 1e-3 and 0.2 march 1.6 to 1.8 times longer, from a third of a
  deep view's time to about as much as a 1e-4 view. Guard: the direct proof's two "far hand-off"
  grids (seen FAIL with the threshold pinned back to 1e-3 in the shader).
- **The owner stepped back from the automatic step (2026-10-08): "perhaps we could improve the
  input or the DE or the algorithm in a way that wont require adjusting the step size". The cause
  was found, and a truer estimate is PROTOTYPED - opt-in, off everywhere, the shell does not use it.**
  - *Why some places need a small step.* An estimate is safe to step by only while it falls no
    faster than the distance travelled. Measured in f64: the renderer's estimate falls at about 0.5
    of that rate in ordinary flight views, 1.6 to 3 at the slicing place and 1.9 to 3.3 at the
    power-2 place at 5e-20. Its scalar running derivative under-counts the true gradient there by
    3 to 4.6 times (the triplex power stretches the azimuth by up to n times more than n r^(n-1)).
  - *What is built* (grep `TRUE-GRADIENT ESTIMATE` in core.js): a shader variant that carries the
    orbit's real 3x3 derivative, `api.setJacobian(bits, floor)` - 1 = step by the smaller of the
    two estimates (hit test unchanged: the same surface), 2 = the normal is the gradient instead
    of four more orbits, 4 = hit test by the smaller one (untested) - a referee (`api.jacCheck`,
    central differences through the f64 kernel) and `--jac` on the march tool.
  - *It is right:* GPU against the referee on 162 points a view, 5 views: median 2e-6 to 6e-6,
    worst 2e-3 (BLA on: 3e-5 to 6e-5, worst 8e-3); gradient direction within 0.04 degrees at 9 in
    10 points.
  - *It does what was hoped,* on the GPU, step 0.85, 16384 rays, 1080 rows, wrong surface: power-2
    5e-20 96.6 % -> 2.7 %; power-2 1.6e-19 4.4 -> 0.5; slicing 41.5 -> 0.3; flight 0.2-3.4 ->
    0.1-0.65.
  - *It costs more than guessed.* Picture time against today's default, BLA on as the shell has it
    (timed on an idle GPU): ordinary flight views 1.3 to 2.0; the power-2 place 1.0 (a hand-set
    0.21 is 1.13); the slicing place 2.4 (a hand-set 0.42 is 1.6). With the gradient normal as
    well: 1.2 to 2.0, 0.85, 2.2. BLA off: ordinary 1.07 to 1.47. Two causes: the matrix makes each
    kernel pass about 1.15 to 1.4 dearer, and step counts become uneven - the mean rises 3 to 18 %
    but the slowest ray of each 8 x 8 block, which is what the GPU waits for, 6 to 44 %.
  - *The gradient normal alone does not pay for the matrix:* 0.93 to 1.24 of today (BLA off),
    1.0 to 1.2 (BLA on).
  - *Tried, no gain:* normalising the matrix only when it drifts; a floor on how far a step may be
    shortened (0.25 saves a few per cent, 0.4 breaks the power-2 place: 7.9 % wrong).
  - *"Fat and blobby", the owner's reason for raising Detail (measured 2026-10-08, after the
    prototype).* It is the hit tolerance and nothing else. At Detail 1 a hit stands a median of
    about 3 px (a tenth of rays: 10 to 27 px) in front of the Detail-32 surface, at every depth
    from 2e-3 to 4e-36; each doubling of Detail halves it. The estimate reads about 0.55 of the
    true distance and rays meet the surface at an angle. Side-by-side pictures show Detail 1 fat
    and Detail 8 crisp at every depth; the deep views are made of thin layers that the 3 px
    swallow, which is why it reads as worse the further down one goes. The shell feeds the
    renderer the same tolerance (one display pixel) at every depth. The true-gradient estimate
    draws the same fat picture at Detail 1: it does not reduce the Detail a view needs. Detail 8
    costs about 1.7 times Detail 1 in picture time.
  - *At the Detail he actually flies, the estimate earns its cost.* Today's estimate at step 0.85,
    1080 rows, wrong surface along the ordinary flight: 0.2-3.4 % at Detail 1, 1-12 % at Detail 8,
    2.5-20 % at Detail 32. The true-gradient estimate at 0.85: 0.3-2.2 % at Detail 8 and 0.8-4.6 %
    at Detail 32 - what today's estimate needs step 0.42 for. Picture time at Detail 8, BLA on,
    against today at 0.85: today at 0.42 is 1.45 to 1.92; the true-gradient estimate with its
    gradient normal is 1.10 to 1.98, cheaper than the smaller step in five of seven flight views.
    The power-2 place at 5e-20 still has 8.8 % wrong at Detail 8 with it.
  - *In the shell since 2026-10-08, as TWO controls since 2026-10-09:* Quality > True-gradient
    march (off by default) only changes how the march steps; the gradient normal is the fifth
    option of Quality > Normals, "Gradient" (renderer normal mode 4). At first the march switch
    swapped the normal too while the Normals row still said 4-tap, and the owner could not tell
    which normal he was looking at ("there is no option for gradient map normals"). His verdict on
    high-quality renders: the gradient normal is smoother and less intricate than 4-tap. The owner on the pictures: "the gradient normal is
    producing a much higher quality image". The variant builds in the background - the picture
    keeps drawing and changes about 20 s after the first switch (30 s in a fresh browser).
    Smoke stage 2 has a step for it (seen red with the push made a no-op).
  - *Not done:* a guard for the estimate in the direct proof; pictures of the gradient normal for
    the owner to judge; whether the hit test by the smaller estimate changes how much Detail a
    view needs (his assumption, unmeasured); making ordinary views cheap - by drawing with the
    plain variant wherever a small probe shows the scalar does not over-read, or by trimming the
    per-pass work. The J variant compiles in 19 s (36 s with BLA).
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
- **Engine and GMT packages of stages N and L are guard-first**: the guard is written against
  today's code, falsified once, and only then is the code moved. Each one leaves GMT and this
  shell working, and they are strictly sequential inside their stage, so two packages never hold a file at
  the same time (N0 then N0b extend one test file; N2 then N3 both write `engine/plugins/navigation/`).
- **Every package has a gate it can run alone**: `npm run typecheck` plus the check script named in
  its row (`tsx debug/deep-zoom-checks/<name>.mts`, plain node, no browser). The end-of-stage smoke
  is the stage's gate, not a package's. Each smoke step's header names the package that owns the
  behaviour, so a red step has one owner.
- **The smoke is one file per stage**: `debug/deep-zoom-smoke/stageN.mts`, owned by that stage's
  smoke package. `debug/smoke-deep-zoom.mts` is the runner (written once in S1-3, after S1-A has
  moved the prototype's smoke off that name): it launches Chrome and runs every `stage*.mts` it
  finds in that folder, in name order. No later package edits the runner.
- The shell imports `DeepZoomHost` and the holder only. `deep-zoom/renderer`, `createDeepZoom`,
  `instance.api` and `api.dz` appear only under `deep-zoom/host/`. The stage-1 check greps for this.
- Custom widgets are registered (component registry, `hud.register`, `topbar.register`,
  `stepRenderers.register`), never mounted by hand. No `component: 'panel-X'` of our own.
- Labels: names and numbers. Stacking: `<Layer tier>` / `z('tier')`.
- New `@invariant` lines name the check or smoke step that proves them and are falsified first.
  Where nothing that already exists proves a line, it is an `@assumption`: no smoke step is
  written to earn the word (see "Smoke growth").

## Before stage 1

Nothing outside stage 1. No tag is needed any more: the prototype stays in the tree under its new
name until stage 7, so later stages port from files, not from `git show`. The first package of
stage 1 (S1-A) moves it aside. The prototype's name is settled: `deep-zoom-prototype`, dev-only
(DECISIONS K6, was O1).


## Gates - run by the integrator when it closes a stage, in this order

| Gate | Command | Goes red when |
|---|---|---|
| Types | `npm run typecheck` | a deleted `ui/*` import survives; a slice type is wrong |
| Package checks | every `tsx debug/deep-zoom-checks/*.mts` | see each package row |
| Stacking | `npm run check:zindex` | a ported widget brings a raw z-index of 100 or more |
| Bytes | `npm run check:text-bytes` | a NUL or control byte in a new file |
| Unused files | `npm run orphans` | a last-week file was left behind unreferenced |
| Rule guards | `npm run check:rule-guards` | the new `sibling-apps.md` row cites a guard that cannot reach `deep-zoom/**` (stage 1, then after any rule edit) |
| Build | `npm run build` | anything the deploy build rejects |
| Shell smoke | `npm run smoke:deep-zoom` | see "Smoke growth" |
| Renderer proofs | `npm run smoke:deep-zoom-parity`, `npm run smoke:deep-zoom-direct` | a module package changed the picture or a number it said it would not (47 and 11 lines today). Run when a stage contains a module package, and in stage 1 and stage 7 because the historical page's folder moves |
| Prototype smoke | `npm run smoke:deep-zoom-prototype` | the move in S1-A broke the prototype. Run in stage 1, then whenever a shared file it loads changes, until stage 7 removes it |
| Chrome smoke | `npm run smoke:chrome` | a top-bar control or menu item in any app throws |
| Sibling boot | `smoke:boot` for fluid-toy, fractal-toy **and app-gmt** | an engine package (E2, E36, E38, E22, E23) broke them |

`smoke:deep-zoom` runs **headed Chrome on ANGLE d3d11** (`--use-angle=d3d11`), never SwiftShader.
`smoke:chrome` may stay headless for this app: it only clicks chrome and fails on page errors. Note
its boot wait is 30 s (`debug/smoke-chrome.mts` `BOOT_TIMEOUT_MS`) and "booted" there means no layer
covers the viewport, so it clicks the top bar while the renderer may still be compiling. That is
intended. The renderer is a module in the shell's own document, so one `pageerror` listener sees
its errors too. One thing is unproven: "still compiling" holds only where the GPU has
`KHR_parallel_shader_compile`. Without it the deep shader compiles inside `createDeepZoom` on the
main thread (`deep-zoom/renderer/index.ts` header, BLOCKING COMPILES, about 15 s cold), and headless
Chromium runs SwiftShader. So S1-3's first step reads `gl.getExtension('KHR_parallel_shader_compile')`
under headless; if it is null, this app's `APPS` row runs headed on d3d11 like `smoke:deep-zoom`.
Also: `engine/TickRegistry.ts` `runTicks` catches a throwing tick and logs it once, so a `step` that
throws every frame raises no `pageerror`; the stage-1 smoke watches the console for that line.


## Smoke growth - `debug/deep-zoom-smoke/stageN.mts`

**A step has to earn its place.** The owner, 2026-10-09, on a step written for Orbit mode's middle
drag: "im pretty sure we dont need a smoke test for the middle mouse drag that seems way over over
kill". A step costs its real-GPU seconds on every run for good (55 steps took four minutes that
day), and a break-and-rerun when it is written. So the default for a change is NO new step. Add
one only when all three hold:

1. it crosses a seam nothing cheaper can see: the renderer on the real GPU, a panel that has to
   open, storage across a reload, the boot. What a node check under `debug/deep-zoom-checks/` can
   prove is proved there;
2. it is new ground: not a second way into code a step already opens (another gesture, button or
   row onto the same function), and not a default, a label or a rate;
3. broken, it would not be seen at once by whoever uses the app next: it fails silently, or in a
   place nobody visits daily, or it has shipped broken before.

Anything else is tried once (by hand, or a throwaway script outside the repo) and the report says
what was tried and what it showed. The table below is what the plan foresaw for each stage: a
ceiling, not a quota - a stage may close with fewer steps than its row lists. A step that proves
to guard nothing a user would miss may be taken out, with the reason in the commit.

Each step that is written records its owner and how it was falsified (one break, seen red; not a
matrix of them). A step whose behaviour is replaced (the captured-mouse steps, at N5) is rewritten
in the stage that replaces it. "Captured" below means the pointer is locked on the picture, which exists only before
N5. Whether Playwright's click obtains pointer lock in headed Chrome is unverified; each captured
step first asserts `document.pointerLockElement` is set and reports **not proven** (a failure, not
a pass) if it is not.


| Stage | Steps added | Red if broken |
|---|---|---|
| 1 | no pageerror and no console line starting `[TickRegistry] tick "deepZoom.step" threw`; `TopBarHost` header exists and no dock element is rendered (`components/layout/Dock.tsx` returns null for a dock with no panel, and stage 1 has none); the adaptive badge is absent; exactly one `canvas#dz-render-canvas`, a child of `#dz-frame`; `host.ready` resolves inside 120 s; telemetry depth is finite; `host.frameCount()` rises while the engine loop runs; focus the picture, hold W 1 s, `getView().cam` strings changed; **open the project-name field for editing (`ProjectName.tsx` renders its `<input>` only while `editing`), hold `w` down in it for 1 s (`keyboard.down`, wait, `keyboard.up`), the strings are unchanged**; **press `C` with the picture focused, `host.getParams().color` is unchanged**; set a deep view with `host.setView` (the f32 picture at boot never accumulates), wait for `accumN` above 32, resize the window, `accumN` drops back (the still restarts); the top-bar fps reads above 0; source grep: `deep-zoom/renderer` is imported only under `deep-zoom/host/` | falsify, one each: remove the `registerTick` call (frame count stays 0); drop `keyTarget` (the held-key step goes red; a typed character alone could not, because the module moves from keys still held when `step` runs); pass `shortcuts: true` (the `C` step); drop `resetStillOnResize`; import `deep-zoom/renderer` from `DeepZoomApp.tsx` (grep) |
| 2 | **open every dock tab that exists: Formula, Light, Colour, Quality** and assert at least one slider row rendered in each (a section label does not count); no `[PanelRouter] widget ... not in componentRegistry` in the console; **every feature default equals `host.bootParams()` (the module's settings read at ready)** (the snapshot taken at ready, before the first push); drag Detail, `host.getParams().detail` changed; Ctrl+Z, it is back; set Shading to Classic, Light type row appears; depth readout text matches `/^\d\.\d\de-?\d+$/`; the status chip shows an iteration count and a drawn size; **captured: press Space and T, `isPlaying` stays false and the timeline's shown state is unchanged** | falsify: mistype one widget id in `panels.ts`; change one feature default; drop one key from `paramMap.ts`; remove `flyGuard.ts`'s registrations |
| 3 | Locations tab opens with a row; Settings shows the Autosave rows; press B, a row with a thumbnail and a depth line appears; rename it, the depth line is still there; save a deeper one, it sorts below; fly; press 1 (not captured), `getView().cam` equals the saved strings exactly; Ctrl+Z, the pre-jump strings are back; **captured: press 1, the view strings are unchanged**; serialize the scene, reload, load it, strings equal; the scene JSON has `documents['deep-zoom.locations']`; the share string decodes to the same view strings and contains no location rows; reload, the location row is still there; drop a last-week bookmark JSON, rows import; paste last week's flat location text, it jumps | falsify: route one `cam` value through `Number()`; drop the slot `when` |
| 4 | each engine key pressed with focus in the picture and again with focus in a panel changes the store exactly once, and the module's own value changes once, not twice; **captured: 9 / 0 change `dzColour.scale` and the view strings are unchanged; T / Y change `dzLight.lampFalloff` and the timeline does not open**; Help > Keyboard Shortcuts shows a row sourced from the registry; the lesson runs start to end; hold Shift and press B, a location is saved | falsify: pass `shortcuts: true` (the module's copy of the key fires too, the value moves twice) |
| N5 | **hold W 1 s with host input: `getView().cam` changed and the module's own fly loop moved nothing** (its key table stays empty); left-drag turns the view with no pointer lock; the wheel changes the SPD readout by a proportional step; `Space` rises and the timeline does not play; hold W across a panel click, the camera stops when the picture loses focus; fly speed reads 3.6 on a fresh scene; GMT: `smoke:orbit` and the N0b fly smoke stay green. The stage-4 captured steps are rewritten here for a free pointer | falsify: leave the module on its own input (it moves twice as far); remove the sink |
| 5 | open Colour, switch Gradient on, the editor is there; open My Gradients, click a tile, `dzColour.gradient` changed; with mode Orbit trap the centre pixel of a `thumbnail(64)` differs before and after | falsify: skip the ramp push |
| 6a | Flight tab opens; record a dive to 1e-12, the flight has more than 1 frame and track `camera.u` has keys; drag the strip's depth curve to the middle, `camera.u` is near 0.5 and the depth lies between the ends; set `camera.u` from the timeline, the strip's playhead line shows a depth; the strip shows a decades-per-second number and an estimate; drop a `gmt-mbulb-path` JSON, it loads as the flight and is not treated as a scene | falsify: make `seekPath` a no-op |
| 6b | press Render in the Flight strip, the engine dialog opens with size presets at the surface's aspect; render 4 frames at 320 px long edge, the file is larger than 0 bytes | falsify: unregister the popup |
| L5 | the Light panel shows the light list and the orb strip; **turn the pad, the centre pixel of a `thumbnail(64)` changes**; the attachment control offers Surface and Camera; a scene saved before L5 (five `dzLight` slider values) loads as the default Surface rig with the same centre pixel within the parity floor; in app-gmt the attachment control is unchanged and shows no Surface | falsify: skip the upload; drop the migration |
| 7 | every step of `debug/smoke-deep-zoom-prototype.mts` has a named step in stages 1 to 6b or in the N5 file, where the captured-mouse steps of stages 2 to 4 are rewritten (the mapping table in S7-1 has no empty row); after the prototype is deleted every stage file still passes and the parity smoke is 47 of 47 from the pinned file | falsify: leave one prototype step unmapped |

---

## Stage 1 - the shell boots on the engine's own chrome with the renderer in the viewport, and flies

What the owner sees: `deep-zoom.html` opens with the engine top bar (project name, fps, undo/redo,
settings, Update pill), empty docks, the live picture in the viewport frame, a status chip with the
depth. Click the picture, W A S D flies - on the module, mounted directly, stepped by the engine's
tick. The prototype is still there at `deep-zoom-prototype.html` with every panel it had; the new
shell's panels arrive over stages 2 to 6.

Five packages, one working session. Order: **S1-A first (the move; nothing new exists until it is
green). Then S1-0 (about an hour). Then S1-1, S1-2 and S1-3 are written side by side against S1-0's
types and the DOM ids in its header, and land in sequence: S1-1, S1-2, then S1-3 runs the smoke.**

| Id | Owns | Steps | Acceptance (can go red) | Needs |
|---|---|---|---|---|
| **S1-A Move the prototype aside (integrator, opens)** | the shared set, here with `vite.config.ts` and `knip.json`; the moved files of BLUEPRINT section 11 (`deep-zoom-prototype/**`, `deep-zoom-prototype.html`, `public/deep-zoom-prototype-core/`, `scripts/sync-deep-zoom-prototype-core.mjs`, `debug/smoke-deep-zoom-prototype.mts`); the three places `historicalPath` in `debug/smoke-deep-zoom-parity.mts` names the folder (the `path.join(ROOT, 'public', 'deep-zoom-core', 'index.html')`, the returned URL `/deep-zoom-core/index.html?embed=1`, and the check line's text) | Plain file moves, no commit. Fix the paths the table in BLUEPRINT section 11 lists. `package.json`: rename `smoke:deep-zoom` -> `smoke:deep-zoom-prototype` and `sync:deep-zoom-core` -> `sync:deep-zoom-prototype-core`; **add `"smoke:deep-zoom-parity": "tsx debug/smoke-deep-zoom-parity.mts"` and `"smoke:deep-zoom-direct": "tsx debug/deep-zoom-direct-check.mts"`** (neither proof has an npm script today). `knip.json`: entry `deep-zoom-prototype/main.tsx` replaces `deep-zoom/main.tsx`, and two entries are added, `debug/deep-zoom-smoke/*.mts` and `debug/deep-zoom-checks/*.mts` (today's `debug/*.mts` entry is top level only; the runner finds its stage files at run time and the checks are run by path, so knip would report both folders as unused files and `rules.files` is `error`). `vite.config.ts`: the input `'deep-zoom'` is removed, since it resolves `deep-zoom.html`. `deep-zoom.html` and `deep-zoom/main.tsx` do not exist again until S1-2, which puts the vite input and the knip entry back | `npm run typecheck`; `npm run smoke:deep-zoom-prototype` passes with the same steps as before the move (falsify: leave `CORE_SRC` on the old folder name, its ready step goes red); parity 47 of 47 and direct 11 of 11 (falsify: leave `historicalPath` on the old folder with the frozen repo present - the run stays 47 of 47 but prints the `serving the pinned file` line instead of the `public/deep-zoom-prototype-core/index.html is` line, so the guard is a grep for that line; with `DZ_SOURCE_REPO` missing the script throws before `historicalPath` runs whatever the path, which proves nothing - corrected by S1-A, 2026-10-08), and the run must print `historical page: public/deep-zoom-prototype-core/index.html is ...`, not the `serving the pinned file` line - a stale path falls through to the pinned file and stays green, so the printed line is the proof; `npm run build`; `npm run orphans` | owner call O1 (the name) |
| **S1-0 Host contract** | `deep-zoom/host/DeepZoomHost.ts`, `host/current.ts`, `host/telemetry.ts`, `debug/deep-zoom-checks/host-contract.mts` | Types from [host 2.2] with the member list of BLUEPRINT section 7. The header fixes the two DOM ids (`#dz-render-canvas`, and `#dz-frame` for the div it sits in). The interface has `frameCount(): number`; in stage 1 `getParams()` returns `api.dz.settings()` unmapped, until `host/looseParams.ts` lands in stage 2. Holder = `defineAppHandles<DeepZoomHost | null>('deep-zoom.host', null)`. Telemetry store with a selector hook, 8 Hz | typecheck; `host-contract.mts`: `DeepZoomHost.ts` has 0 `import` lines, and a grep of it for `Window`, `Document`, `DeepZoomInstance` finds nothing. Falsify: add `instance: DeepZoomInstance` to the interface | S1-A |
| **S1-1 Module host** | `host/moduleHost.ts`, `host/dive.ts`, `debug/deep-zoom-checks/module-host.mts` | `createModuleHost(instance, canvas)` (pure adapter) and `mountDeepZoom(frame, hooks)` (`frame` is the shell's own `#dz-frame` div, not an engine element) with `shellOptions(frame, hooks)` - the option table in BLUEPRINT section 7, taken from the header of `deep-zoom/renderer/index.ts`. Canvas created imperatively, removed in `dispose`. `bootParams` = `api.dz.settings()` read at ready, before any push. Dive loop from the prototype's `bridge.ts` -> `dive.ts`. `isCaptured` from `document.pointerLockElement`. `frameCount` from `instance.frameCount`. Telemetry and progress polled from `step` | typecheck; `module-host.mts` with a fake instance: three 80-digit `cam` strings come back byte-identical from `getView` and reach the fake's `setView` byte-identical (falsify: wrap one in `Number()`); `shellOptions` returns `autoStart:false, shortcuts:false, dropTarget:null, pointerLock:false, resetStillOnResize:true, loseContextOnDispose:true` and `keyTarget === frame` (falsify: flip one); `dispose` calls the fake's `dispose` before the canvas is removed | S1-0 |
| **S1-2 Boot and layout (integrator, closes)** | the shared set, plus `DeepZoomSurface.tsx`, `components/BootCard.tsx`, `components/StatusChip.tsx` | New `deep-zoom.html` and `main.tsx` (the vite input `'deep-zoom'` and the knip entry `deep-zoom/main.tsx` go back in) in fluid-toy's order [boot 1.2, 2.1]: `registerUI`, `installViewport({enabled:false})`, `installTopBar` + `unregister('adaptive')`, `registerCoreSettings({ autosave: null })` + settings gear, `installPwaUpdate`, `installShortcuts`, `installUndo`, `installMenu`, `installHud`, a minimal `installHelp`. No Camera plugin. Install chain in try / catch -> `initialError`. `DeepZoomApp.tsx` = fluid-toy's tree with granular selectors, plus two things `fluid-toy/FluidToyApp.tsx` does not have: `engine/components/MobileViewportShell.tsx` as the root and `engine/components/ToastHost.tsx` mounted (`onNotice -> showToast` shows nothing without it), **`<RenderLoopDriver/>` + `<EngineBridge/>`**. `DeepZoomSurface.tsx`: renders `<div id="dz-frame" tabIndex={0} className="absolute inset-0">` inside `<ViewportFrame showModeControls={false}>` (the engine's frame forwards no ref and takes no `tabIndex`) and runs on it the effect of BLUEPRINT section 7 (mount, holder, one `registerTick`, cleanup in reverse); the tick phase is chosen after reading where the animation engine writes; a click on the picture focuses the frame and requests pointer lock. Telemetry -> `viewport.reportRenderFps`. Splash `#dz-boot-splash` removed on the first picture, 12 s fallback. Empty manifest + feedback entry. Nothing is deleted | typecheck, `check:zindex`, `npm run build`, `npm run orphans` | S1-0; lands after S1-1 |
| **S1-3 Smoke and wiring** | `debug/smoke-deep-zoom.mts` (the new runner), `debug/deep-zoom-smoke/stage1.mts`, `debug/smoke-chrome.mts` (the `APPS` row), `.claude/rules/sibling-apps.md` (path + table rows) | Runner for the engine store (`window.__store`, set unconditionally in `store/engineStore.ts`), headed d3d11. It reads the host from `globalThis.__appHandles['deep-zoom.host']`, which exists on the dev server only (`engine/appHandles.ts`, gated by `import.meta.env.DEV`), so this smoke runs against `ENGINE_URL`, never a build. First step of the package: read `gl.getExtension('KHR_parallel_shader_compile')` under headless Chromium; if null, this app's `APPS` row runs headed on d3d11 (Gates). Stage-1 steps. The app in the chrome smoke, desktop viewport only. The rule row, with the guard it cites falsified. The integrator adds the `smoke:deep-zoom` script line for the new runner | `npm run smoke:deep-zoom`, `npm run smoke:chrome`, `npm run check:rule-guards` - run last | S1-2 landed |

---


## Stage 2 - every look control is an engine panel, with undo

What the owner sees: four dock tabs - Formula, Light, Colour, Quality - made of engine sliders with
keyframe diamonds; Ctrl+Z undoes a slider; the depth readout (with decades per second) and the log
scale are on the picture; live iterations and drawn size in the top-bar chip; the timeline opens
with T when the mouse is free. No Locations tab (stage 3) and no Flight tab (stage 6a) yet: a tab
with nothing the core can honour is not shown.

**The contract for this stage is the id list in BLUEPRINT section 3.** S2-1, S2-2 and S2-3 all key
off it and never off each other's files; `param-map.mts` catches a mismatch.

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S2-1 Formula, quality, inspect features** | `features/formula.ts`, `features/quality.ts`, `features/inspect.ts` | The tables in BLUEPRINT section 3. `defineEnumParam` for every enum. `satisfies FeatureDefinition` only after one deliberate type error proves it types the slice [ddfs 4]. | typecheck | - |
| **S2-2 Light and colour features** | `features/light.ts`, `features/colour.ts` (mode and scale only; gradient is stage 5) | The 11 ranged light params; classic and new blocks by `condition`. The 17 unranged look fields are **not** added. `dzLight` is what lights the picture until L5. **Colour naming is decided (DECISIONS K8, was O3):** GMT's mode numbers (0, 1, 5, 7, 8, 13) and GMT's `scale` / `offset` / `bias` names, so a GMT colouring block reads across later with no migration [gmt 7.5] | typecheck | - |
| **S2-3 Param map and sync** | `host/paramMap.ts`, `host/looseParams.ts`, `deep-zoom/useHostSync.ts`, `debug/deep-zoom-checks/param-map.mts` | One table DDFS -> `DzParamId` with invalidation class. Per-key last-pushed cache; O-class keys debounced during a drag. On `ready`: push everything once (store wins). After `play` / a render resolves: re-push formula and quality. `looseParams.ts` is the id -> `api.set*` table (BLUEPRINT section 7); it never sends `setBla(true)` without the wait | typecheck; `param-map.mts`: every param id of every registered `dz*` feature has a map row and every map row names a real param. Falsify: delete one row | S1-1. **Module package M1** removes the interims: `iterations` through `setView({...getView(), iters})`; `flySpeed` writes `api.cam.baseSpeed = value / 60`; `normals` is followed by an empty `api.setLook({})` [params 1.3]; `autoIterations` and `actualPixels` have **no** interim and their rows stay out of the manifest until M1 |
| **S2-4 Engine: one overlay host (E2)** | `engine/plugins/viewport/FeatureOverlays.tsx` (new), and the four existing copies: `fluid-toy/components/DomOverlays.tsx` (deleted) with its one importer, `fractal-toy/FractalToyApp.tsx`, `app-gmt/AppGmt.tsx`, `components/ViewportArea.tsx` | Read all four first. Lift **one** host, starting from app-gmt's (per-overlay selectors; fluid-toy's header says a selector-less read "trips React's max-depth guard"). All four sites import it. If app-gmt's copy carries something the others lack (unverified), it becomes a prop, not a reason to keep a copy. Top-of-file JSDoc (purpose, seams, pitfalls). | typecheck; `smoke:boot` for fluid-toy, fractal-toy, app-gmt; `smoke:chrome`; `npm run orphans`; a grep for `getViewportOverlays().filter` finds 1 site, the new host (as built there were five loops, not four: `components/ViewportArea.tsx` also carried one for scene-type overlays, and the host takes `type` for it) | - |
| **S2-5 Depth instruments** | `components/DepthReadout.tsx`, `components/DepthScale.tsx`, `components/IterationReadout.tsx`, `components/FrameReadout.tsx`, `components/StatusChip.tsx`, `components/depthFormat.ts`, `deep-zoom/milestones.ts`, `features/camera.ts`, `debug/deep-zoom-checks/depth-format.mts` | Port from `ui/DepthGauge.tsx` (under `deep-zoom-prototype/`): depth, decades to the floor, magnification, the falling / rising decades-per-second line, the yardstick line, `Diving · from to target`, milestone toasts through `showToast`. Chip gains live iterations and drawn size. Readout sets React state only when the rounded value changes. `camera` feature: param `u`, `viewportConfig` for the scale. | typecheck; `depth-format.mts`: `6.4e-53` -> `6.40e-53`, `1.5` -> `1.50e0`, both match the smoke's regex | S1-0, S2-4 |
| **S2-6 Fly guard** | `deep-zoom/flyGuard.ts` | Shortcuts with `priority: 10` and `when: () => host.isCaptured()` on `t` and `Space` that consume the key and do nothing, so the timeline's own two (`engine.timeline.toggle`, `engine.timeline.toggle-play` in `components/TimelineHost.tsx`) do not fire while flying. Interim for gap E37. | typecheck | S1-0 |
| **S2-9 Pause controls** | `deep-zoom/pause.ts` | An `AccumulationController` adapter over `host.pause`, the sample target and reset; the integrator calls `installPauseControls()` only when the host reports the three handles [gmt 7.3] | typecheck; the stage-2 smoke gains "pause, `accumN` stops rising" when M5 has landed | **M5**; without it the package is written and not installed |
| **S2-7 Integrator** | the shared set | Open: nothing new in `storeTypes.ts` beyond the slices. Close: register the 6 features; manifest tabs Formula, Light, Colour, Quality; `hud.register` the readout; mount `<FeatureOverlays/>`, `<TimelineHost/>`; call the fly guard; a menu row for the engine's Advanced mode if no shared one exists (`setAdvancedMode`, `store/slices/uiSlice.ts`); `validateComponentRefs` in dev. | all gates | S2-1..6 |
| **S2-8 Smoke** | `debug/deep-zoom-smoke/stage2.mts` | The stage-2 steps. | `npm run smoke:deep-zoom` | S2-7 |

---

## Stage 3 - locations, scene files, links

What the owner sees: B saves a location with a thumbnail and its depth on the row; the list runs
shallow to deep; 1-9 recall when the mouse is free; Home and Back; starter dives; File > Save / Load
scene and Save PNG; Copy location / Paste location / Copy link / Export all; all still there after
a reload.

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S3-0 Engine: state library (E36, E38)** | `engine/store/installStateLibrary.ts`, `components/StateLibraryPanel.tsx` | `SlotShortcutOptions.when?: () => boolean` passed to the recall and save registrations. `StateLibraryPanelProps.renderMeta?: (snap) => ReactNode` (a second line per row) and `sortBy?: (a, b) => number` (drag-reorder off while set). JSDoc updated. All three optional; absent = today's behaviour. | typecheck; `smoke:chrome` (fluid-toy and app-gmt use the library); `smoke:boot` for both | owner call D8 |
| **S3-1 Locations** | `deep-zoom/locations.ts`, `components/LocationsPanel.tsx` | `installStateLibrary` as BLUEPRINT section 1, with `slotShortcuts.when` and the panel's `sortBy` / `renderMeta` by depth; `jumpTo(loc, { keepLook })`; history providers `dzView` (`changeOf: seq`) and `savedLocations`; default label with the mantissa; one-time import of `gmt.deepzoom.bookmarks.v1`; the storage mirror (interim for E10). | typecheck | S3-0. **M8**: until then the readout lags a jump by a few frames |
| **S3-2 Scene state and session** | `deep-zoom/presetFields.ts`, `deep-zoom/documents.ts`, `deep-zoom/session.ts`, `debug/deep-zoom-checks/scene-roundtrip.mts` | Preset field `dzView` + the `dzInspect` reset + **the scene version stamp** (a number, 1 from the first saved file; L5's migration reads it - BLUEPRINT section 3, GMT-SYSTEMS 7.4); pending-view slot. Document providers `deep-zoom.path` and `deep-zoom.locations` (`registerDocumentProvider`, `store/documentRegistry.ts`). **First step: read where `restoreDocuments` is called relative to preset fields; if the order breaks a load, fall back to preset fields plus deleting the two keys before a share link.** Session adapter `{ view, flight }`, its own autosave settings store. | typecheck; `scene-roundtrip.mts`: a location row and a view go through serialize / restore with every `cam` string byte-identical, and the restored scene carries the version stamp (falsify: drop the stamp) | S1-0 |
| **S3-3 Starters and text** | `components/StarterDives.tsx`, `data/starters.ts`, `components/LocationText.tsx`, `deep-zoom/share.ts`, `deep-zoom/locationParse.ts`, `debug/deep-zoom-checks/location-parse.mts` | Six cards; the claim line removed. Copy / Paste with a reason on failure. The parser accepts the new shape and last week's (flat `iters / power / phase / light / falloff / color / cscale / surf` beside `cam`, numeric `depth`; a bare view; an array). Export all (JSON), thumbnails left out. Link = `getShareString()`. | typecheck; `location-parse.mts`: five sample texts (new, last-week, bare view, array, garbage) parse or fail with a reason | S3-1 for `jumpTo` (import only) |
| **S3-4 Claims** | `deep-zoom/claims.ts` | `deep-zoom.locations` claim (rows with `view.cam` of three strings), using `locationParse.ts`. Never throws after a side effect. | typecheck | S3-3 |
| **S3-5 Integrator** | the shared set | Open: store fields `savedLocations`, `activeLocationId`, `dzPath`, the jump counter. Close: `installSceneIO({ getCanvas })`; `<SceneFileDropZone/>`; **replace** the stage-1 line `registerCoreSettings({ autosave: null })` with the one call `registerCoreSettings({ autosave: { store: settings, ...text } })` (the function runs once only - a second call does nothing); the Locations tab; the Dive menu. | all gates; **manual check on a real GPU: is the saved PNG blank?** If yes, do S3-6 | S3-1..4 |
| **S3-6 Engine: async snapshot (E8)** - only if the PNG is blank | `engine/plugins/SceneIO.tsx` | `getSnapshot` option. | `smoke:chrome` all apps; the PNG has non-black pixels | - |
| **S3-7 Smoke** | `debug/deep-zoom-smoke/stage3.mts` | The stage-3 steps. | `npm run smoke:deep-zoom` | S3-5 |

---

## Stage 4 - keys, help, the first dive

What the owner sees: every key works while flying, and no key moves the camera or starts the
timeline by accident while the mouse is captured; Help has the topics and a shortcuts page that
lists the real bindings; a first-run lesson starts with one "Dive to 1e-12" button.

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S4-1 Hotkeys** | `deep-zoom/hotkeys.ts`, `deep-zoom/flyGuard.ts` | The table in BLUEPRINT section 9; `B` and `M` twice (with Shift); `deep-zoom.cancel` with `when: busy`. Captured-only bindings at `priority: 10`: `9` / `0` palette scale, `T` / `Y` lamp falloff (the `t` do-nothing guard from stage 2 is replaced by the falloff binding). Nothing to switch off at ready: the module was created with `shortcuts: false` in stage 1. No letter the module still reads (W A S D Q E) is registered | typecheck | - . M6 turns the `shortcuts` / `keyTarget` assumptions in `renderer/index.ts` into tested claims |
| **S4-2 Help** | `help/topics.ts`, `help/installDeepZoomHelp.tsx` | Seven topics from last week's Help tabs; generated shortcuts page; What's New (the key changes of DECISIONS D3 are its first entry) with its own `seenKey`. | typecheck | S4-1 (reads the registry at open time, no import) |
| **S4-3 Tutorial** | `tutorial/firstDive.ts`, `tutorial/steps.tsx`, `tutorial/hostEvents.ts` | Lesson 1; step kinds `dz-dive`, `dz-record-dive`; `hostEvents.ts` turns host events and telemetry into `actionBus.fire(...)`. No step relies on `onExit`. | typecheck; manual: the card does not take focus from the picture (unverified today) | S3 for `jumpTo`; the recording step is added to the lesson in stage 6a |
| **S4-4 Integrator** | the shared set | `installHelp` full options, `installTutorial`, `registerLessons`, `help.registerHudHint`, mount `TutorialRunner` / `TutorialOverlay`. | all gates | S4-1..3 |
| **S4-6 Smoke** | `debug/deep-zoom-smoke/stage4.mts` | The stage-4 steps. | `npm run smoke:deep-zoom` | S4-4 |

---

## Stage N - GMT's navigation flies the deep zoomer (rework, guard first)

What the owner sees at N5: W/S, A/D, Space/C, Shift, left-drag look, the wheel for speed, a level
horizon - GMT's hands, on GMT's code. Fly speed 3.6 by default in a 0.01..8 range, shown as a
number. In GMT nothing changes at any step. **Until N5 the shell flies on the module's own loop**
(stage 1): W A S D Q E, Shift, captured-mouse look.

Placement [gmt 7.1]: N0, N2, N0b and N3 touch engine and GMT files only and can start beside
stage 2. N4 takes a slot in the module queue. N5 is a shell integrator slot after stage 4 (keys)
and, if N3 and N4 are green by then, before 6a, so flights are recorded with the final controls.
Sizes are sessions, from [gmt 3.4]; about 3 in the engine and GMT, 1 in the module, 1.75 in the shell.

| Id | Where / owns | Steps | Acceptance (can go red) | Size |
|---|---|---|---|---|
| **N0 Replay guard** | new node test under `debug/`; `.claude/rules/navigation.md` Guards block | Against **today's** code: a fixed input script through `CameraController.update`, the emitted displacements recorded. Includes held Shift at a tiny distance (the `1e-4` floor) and `autoSlow: false` | the test passes on today's code and goes red when `DIST_INCREASE_LERP_RATE` is changed (the falsification, done once before it is cited); `npm run check:rule-guards` | 0.5 |
| **N2 Integrator into the engine** | `engine/plugins/navigation/` (new), `modifiers.ts` moves with it, `engine-gmt` re-exports | The fly integrator with a displacement sink and the two floors as settings (seam S1). GMT passes today's values. ADR "Navigation emits displacements" written here | N0 gives the same numbers to the last bit; `typecheck`; `smoke:engine-gmt`, `smoke:orbit` | 0.75 |
| **N0b Input-hook guard** | N0's test extended; a fly step in `smoke:orbit` or a sibling | Against today's code: the replay drives the hook's output shape (key down and up, wheel, drag delta) through to displacements; a smoke that holds W for N frames and asserts `sceneOffset` moved along the view direction | both pass on today's code; both falsified once | 0.5 |
| **N3 Renderer-free input hook** | the hook in `engine/plugins/navigation/`; GMT's `useInputController` becomes the wrapper | The widened contract of [gmt 3.2 e]: a wheel-step function, a suppress predicate, three activity edges (seam S7) | N0b identical; `smoke:orbit` for drag; `typecheck`. Whether `test:interaction*` reaches the hook is unverified | 1.25 |
| **N4 Module: host input** | `deep-zoom/renderer/core.js`, `core.d.ts`, `index.ts`; `debug/deep-zoom-checks/input-owner.mts` | `api.dz.setInputOwner('module' or 'host')`, `api.dz.rawDistance()`, `api.dz.setYawPitch(yaw, pitch)` if roll stays off (GMT-SYSTEMS 8.3, open: with roll on this is a basis input instead, and the size is the upper figure); the module keeps computing `rawDist` / `smoothedDist` under host input; `moveAlong` typed as product API. Picture unchanged | parity 47 of 47, direct 11 of 11; the check: under `'host'`, a `keydown` for `KeyW` followed by 60 `step` calls leaves `getView().cam` unchanged, and `moveAlong` still moves it. Falsify: skip the owner test in the fly loop | 0.75 to 1.35 |
| **N5 Shell navigation (integrator)** | the shared set, `deep-zoom/navigation.ts`, `deep-zoom/hotkeys.ts`, `host/telemetry.ts`, `tutorial/hostEvents.ts`, `tutorial/firstDive.ts`; deletes `deep-zoom/flyGuard.ts`; `debug/deep-zoom-smoke/stageN5.mts` | Mount the hook on the viewport frame; run the integrator on a tick with `autoSlow: true` and the module's raw distance; level the quaternion and write yaw / pitch back each frame; sink -> `host.moveAlong([dx,dy,dz], 1)` with the 0.2 clamp; proportional wheel step; `isSuppressed` over the timeline; DST / SPD readouts; home / step back; switch the module to host input; the key changes of BLUEPRINT section 9; **what replaces capture**: the hook's activity edges set a `flying` flag in the telemetry store, the overlay fade reads it in place of `isCaptured()`, and the tutorial's first step waits on `dz.flying` in place of `dz.captured` (BLUEPRINT section 10) | the N5 smoke row; all shell gates; GMT's N0, N0b and `smoke:orbit` still green | 1.75 |

Later, not in this stage [gmt 3.4]: N6 (a distance source and HUD predicates so the shell mounts
GMT's HUD cluster, 1.5), the module's field-of-view variable, the camera-undo provider.

---


## Stage 5 - gradients from the engine's editor and My Gradients

What the owner sees: a Gradient switch and the full stop editor in Colour; the My Gradients shelf
with "Deep Zoom - Gradient" as a destination; a gradient made in Gradient Explorer is one click away.

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S5-1 Gradient param and push** | `features/colour.ts`, `deep-zoom/colourSync.ts`, `host/gradientPush.ts` | `useGradient` + `gradient`; setting a gradient in Plain mode also sets Orbit trap; push ramp then mode; one push per animation frame with a sequence counter. A dropped image is claimed by the engine's drop zone and handed to `api.loadGradient(file)` (the module's own drop listener is off). No stage-3 or stage-4 package owns `features/colour.ts`, so writing this early collides with nothing | typecheck; `param-map.mts` still green; on a real GPU **check the colours against the editor swatch** - whether the module treats the strip as display or linear is unverified [palette G8] | stage 2. **M2**; interim: a 256 x 1 PNG through `api.loadGradient` [palette 2.3] |
| **S5-2 Integrator** | the shared set | `registerPaletteUI()`, send target with `editsParam`, `favientsPanelEntry`, `mountFavientsPanel` after the manifest with its own `storageKey`, the toggle button. Opens after stage 4's integrator has closed. | all gates; red if `mountFavientsPanel` runs before the manifest (the panel never opens) | S5-1 |
| **S5-3 Smoke** | `debug/deep-zoom-smoke/stage5.mts` | The stage-5 steps that earn their place ("Smoke growth": the plan's row is a ceiling). | `npm run smoke:deep-zoom` | S5-2 |

---

## Stage L - GMT's Light Studio lights the deep zoomer (rework by route A, guard first)

What the owner sees at L5: the Light panel is GMT's - the light list, the orb strip, aim by drag -
with the attachment "Surface" (same behaviour, same name) and Camera. In GMT nothing changes: its
attachment control stays as it is and shows no Surface until GMT can fit a surface plane itself.
**Until L5 the shell lights with the plain `dzLight` sliders of stage 2.**

Placement [gmt 7.4]: L0 takes a slot in the module queue at any time. L-guard and L1 to L4 are GMT
files only and can start beside stage 2. L5 is a shell integrator slot after stage 5. Route A only:
the module keeps its own shading pass and takes N lights; assembling that pass from GMT's shading
chunks (route B) is after stage 7 and is its own decision (GMT-SYSTEMS 8.8). Sizes from [gmt 4.5]:
about 7 to 9.5 sessions in GMT, 1.5 in the module, 2 to 2.5 in the shell.

| Id | Where / owns | Steps | Acceptance (can go red) | Size |
|---|---|---|---|---|
| **L-guard** | three new guards under `debug/`, GMT side | Written first, against today's code: (1) a light round-trip node test with real scenes - one `fixed: true` preset, one flat-key preset, one partial merge; (2) a packing test with a non-zero modulation entry for each of the 8 `LIGHT_PROPS` and one `fixed: true` light; (3) a smoke that toggles attachment through each of the three toggles and asserts the light's screen position does not jump | each passes on today's code and each is falsified once before any light code moves | 1 |
| **L0 Module: N lights** | `deep-zoom/renderer/core.js`, `core.d.ts`, `index.ts` | An N-light loop in the shading pass with three placement modes; `api.dz.setLights(packed)`; the default rig reproduces today's frame | parity 47 of 47 with the default rig (picture unchanged); a second light at a known direction changes the centre pixel | 1.5 |
| **L1 Light list split** | GMT's `LightingFeature` | The list split out, same feature id `lighting`, same key `lights`, same short ids | L-guard (1); `typecheck`; `smoke:engine-gmt` | 1 |
| **L2 Packing as a function** | GMT's light sync | `packLights(lights, viewFrame, modulations, targets)`; `syncFrame` calls it, writing in place (seam S6) | L-guard (2), bit-equal before and after | 0.75 to 1 |
| **L3 View frame** | the four light UI files | View-frame values (seam S3; the ADR "Lights resolve against a view frame" is drafted here and finished in L4); the UI stops importing `getProxy` / `ViewportRefs`; seven conversion sites onto one helper, each toggle keeping what it writes today | L-guard (3) for each toggle; `smoke:chrome` | 2.5 to 3 |
| **L4 Third frame and length scale** | GMT's light model and attachment control | `frame: 'surface'` with its two write rules, `lightFrame`, `lengthScale` declared on the view frame (seam S4), a control that lists the frames the renderer declares - in GMT that is today's two, so GMT shows no Surface (DECISIONS K4). ADR "Lights resolve against a view frame", drafted in L3, is finished here | L-guard (1) extended: a Surface light opened without Surface support reads as Camera; `{ fixed }` merged onto a Surface light clears `frame`; app-gmt's control renders the same two options (smoke step) | 1.5 to 2.5 |
| **L6 Orb strip lifted** - only if entangled | `CenterHUD.tsx` | The strip becomes its own component | `smoke:chrome` | 0.5 to 1 |
| **L5 Shell lighting (integrator)** | the shared set, `deep-zoom/lighting/**`, `deep-zoom/handoff.ts`, `features/light.ts`, `deep-zoom/presetFields.ts` (the migration), `debug/deep-zoom-smoke/stageL5.mts` | The shell's `lighting` feature (light list + its own shadow group); the deep view frame; mount the orb strip and the panel; pack with an empty modulation map (DECISIONS D12, open, recommended: no light modulation in v1; GMT-SYSTEMS 4.5 says "its modulation map" for the other answer) and upload through `setLights`; Cast Shadows cap; the default Surface rig; aim by drag. **One migration**: `keyElevation`, `keyTurn`, `lightTint`, `lightType`, `lampFalloff` leave `dzLight` and become the default Surface rig; saved places and flight paths made before L5 go through it too | the L5 smoke row; `debug/deep-zoom-checks/light-migration.mts`: a pre-L5 scene's five values give the rig whose packed first light equals the module's old key light (falsify: drop one field) | 2 to 2.5 |

---


## Stage 6a - a dive on the timeline: record, scrub, lossless frames

What the owner sees: the Flight tab. Record a dive; it lands on the timeline as one track; the
strip's depth curve scrubs it and shows the depth at the playhead; Space previews (mouse free);
length in seconds, decades per second, an estimate; "Render PNG sequence (ZIP)" and still export.
No engine render dialog yet. **Does not wait for any module package.**

| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S6a-1 Flight state** | `deep-zoom/flight.ts`, `features/flight.ts` | `dzPath` history provider; record stop -> smooth -> track (one undo snapshot) with the default curve of BLUEPRINT section 8; the `camera.u` subscription -> `host.seekPath(path, u)` with the module's ease off; the `deep-zoom.path` claim; `registerCameraKeyTracks(['camera.u'])`. | typecheck | stage 3. **M4 seekPath**; interim: `__samplePath(p, u x lastT)` - by time, so a scrubbed frame does not match a rendered frame, and the strip says so |
| **S6a-2 Flight strip** | `components/FlightStrip.tsx`, `deep-zoom/flightMath.ts`, `debug/deep-zoom-checks/flight-math.mts` | Port the top half of `ui/RecordPanel.tsx` (under `deep-zoom-prototype/`): Record / Smooth / Preview; the depth curve as a scrubber bound both ways to `camera.u` (Left / Right, Shift = 1 s); the playhead line `t 4.2 s / 10.0 s · frame 126/300 · 6.40e-53`; Go to start, Go to deepest; length typed as seconds or m:ss (writes the timeline length and rescales the keys); fps 24 / 30 / 60; decades per second **read from the key curve at the playhead**; the estimate before a render. | typecheck; `flight-math.mts`: a straight 0 -> 1 curve over 10 s on a 30-decade flight gives 3.0 decades/s at every sample; rescaling 10 s to 20 s halves it | S6a-1 for the store field name only (frozen by the integrator's open step) |
| **S6a-3 Still and ZIP** | `components/StillExport.tsx`, `components/RenderProgress.tsx`, `deep-zoom/zipRender.ts` | Still export saves the blob with the scene embedded. ZIP = the module's own path render, which downloads the ZIP parts itself (`core.js` `dlBlob(makeZip(...))`; M6 leaves that one download in place, BLUEPRINT section 7): cancel with the "finished frames are saved as a partial ZIP" confirm, the ffmpeg line with Copy, and one line stating that this route uses the module's own smooth-step timing, not the timeline curve (the module applies `easeInOut` itself). | typecheck | S1-1 |
| **S6a-4 Integrator** | the shared set, `tutorial/firstDive.ts` (adds the recording step, ending with the Flight tab active) | The Flight tab; register the widgets; HUD progress. | all gates | S6a-1..3 |
| **S6a-5 Smoke** | `debug/deep-zoom-smoke/stage6a.mts` | The stage-6a steps. | `npm run smoke:deep-zoom` | S6a-4 |

## Stage 6b - video from the engine's render dialog

**Entry gate: module package M4 (`seekPath` by arc and `renderFrame` to memory) has landed, with
the parity and direct proofs green.** It is our own file now, not the owner's page, so the gate is
a dependency and not a wait on anyone. Until then the dialog is not installed - never a control
the renderer cannot honour.


| Id | Owns | Steps | Gate it runs alone | Needs |
|---|---|---|---|---|
| **S6b-1 Runner** | `deep-zoom/exportRunner.ts`, `deep-zoom/renderPresets.ts`, `components/RenderEstimateRows.tsx` | Copy fluid-toy's runner skeleton; per frame scrub -> `host.renderFrameBlob({ path, u, longEdge, samples })` -> encode; first frame and every resume pass a fresh light rig [timeline G12]. `renderPresets.ts`: 720 / 1080 / 1440 / 2160 long edge at the surface's aspect, for the dialog's `resolutionPresets` (function form). `RenderEstimateRows` = the dialog's `extraInfoRows`: the estimate. | typecheck | M4 |
| **S6b-2 Engine: open the dialog from anywhere, wider encoder input (E22, E23)** | `engine/animation/renderPopupRegistry.ts`, `engine/export/videoEncoder.ts` | `openRenderPopup()` beside today's three exports (`registerRenderPopup`, `getRenderPopup`, `subscribeRenderPopup`); `encodeCanvas(source: CanvasImageSource, ...)` (today `HTMLCanvasElement | OffscreenCanvas`). | typecheck; `smoke:chrome`; fluid-toy's and app-gmt's export still typecheck | - |
| **S6b-3 Integrator** | the shared set, `components/FlightStrip.tsx` (the Render button's one line) | `installRenderDialog` with `defaults` 10 s, 30 fps, 4 samples, `resolutionPresets`, `extraInfoRows`; the ZIP route also as `registerRenderAdjunct`; a File-menu "Render..." row; the strip's Render button calls `openRenderPopup()`. | all gates | S6b-1..2 |
| **S6b-4 Smoke** | `debug/deep-zoom-smoke/stage6b.mts` | The stage-6b steps. | `npm run smoke:deep-zoom` | S6b-3 |

---

## Stage 7 - the prototype is removed; docs; close-out

| Id | Owns | Steps | Acceptance (can go red) | Needs |
|---|---|---|---|---|
| **S7-1 Remove the prototype (integrator)** | the shared set; `deep-zoom-prototype/**`, `deep-zoom-prototype.html`, `public/deep-zoom-prototype-core/`, `scripts/sync-deep-zoom-prototype-core.mjs`, `debug/smoke-deep-zoom-prototype.mts`; `debug/deep-zoom-smoke/stage7.mts` | First a table: every step of the prototype's smoke against the stage step that covers it. Only when no row is empty: delete the files and their `package.json` and `knip.json` rows (the `sync:deep-zoom-prototype-core` script line among them) and the `./deep-zoom-prototype/**` glob in `tailwind.config.js`. The parity smoke then reads the historical page from the pinned file | the stage-7 smoke row; `npm run orphans`; parity 47 of 47 with the folder gone; `npm run build` | stages 1 to 6b closed; the owner has said the new shell matches |
| **S7-2 Docs** | `deep-zoom/README.md`, `docs/modules/deep-zoom/index.md`, `HANDOFF.md` entry | The map page with a "where to start" table; `npm run context:map` | `npm run context:check` | - |
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
| M4 | `api.dz.seekPath(path, u, ease)` with `ease` off-able; `api.dz.renderFrame(req)` -> pixels or blob; the render's frame waits ride `step`, not requestAnimationFrame | a frame rendered at `u` equals the still at the same view within the parity floor | S6a-1 exact scrub; **all of stage 6b** | scrub by time through `api.samplePath`; **none for render** |
| M2 | `api.dz.setGradientTexels(rgba, width)` without the colour-mode flip | the centre pixel follows a two-colour ramp; the colour mode is unchanged after the call | S5-1 | the PNG route, asynchronous |
| M8 | `setView` resets the depth smoothing | telemetry depth equals the new view's distance on the next `step` | S3-1 | the readout lags a jump by a few frames |
| M3 | `api.dz.on(fn)` events: param changed, recording, progress, compile, error | each event fires once for its cause | S6a-3 progress, S2-3 write-back | polling from the tick |
| M5 | `api.dz.pause(on)`, a sample-target setter, a public reset; compile state | paused: `accumN` and `frameCount`-driven work stop; reset: `accumN` returns to 0 | S2-9; a tab hidden or a GPU reset handled well | none |
| N4, L0 | see stages N and L | - | N5, L5 | the module's own fly loop; the `dzLight` sliders |

Order of value: M6, M1, M4, M2, M8, M3, M5; N4 and L0 enter the same queue when their stage
reaches them. Not planned: a field of view in views (GMT-SYSTEMS "Later").


## Dependencies at a glance

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

- Which tick phase the animation engine writes `camera.u` in - decides the phase of
  `deepZoom.step` (S1-2 reads it; the 6a smoke is the proof).
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
