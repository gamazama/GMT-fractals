# Deep zoom - every call that is open with the owner (2026-10-12, morning)

Written at the end of the session that built `ROUTES.md` R5 to R7 and the kernel work of
`NEXT.md`, for a fresh session in which he answers them. Each call says what it is, where its
numbers are, and what the orchestrator recommends. Nothing here was decided when it was written;
his answers are marked **ANSWERED** under each call as he gives them (from 2026-10-12, later the
same morning). Branch `deep-zoom-tool`, local, 140 commits ahead of `main`, never pushed (his rule:
"we push after 1-12").

**State of the tree.** Clean: the help work that was unfinished when this page was first written
is verified and committed (see call 17). The two dev servers (3410 the working tree, 3420 the fly tree) belong to that session and stop
with it: a new session starts `dz-worktree-dev` and `dz-fly` itself.

## A. The kernel

1. **The Mandelbox's ray step** was built and is NOT in the tree: cleaner at all 92 view-settings
   (rays on the wrong surface at the starters 0.51 -> 0.04 %), but Arches +39 % and Lace +46 % in
   frame time, Block city -29 %. `ADR-DRAFT-box-ray-step.md` has the tables.
   - a. Take it as measured, or leave the box as it is? *Recommended: leave it for now; see b.*
     **ANSWERED 2026-10-12: leave it.** He asked first whether the build was timed "against a
     step size that matches the clean view", or whether it was "just a test that says low quality
     is faster". It was the second: the gate timed it against the rough default. It was then
     timed at the same picture (`ADR-DRAFT-box-ray-step.md`, the last section): faster than Step
     size 0.5 at every starter, 21 to 30 % slower than Hit refine 4 at Arches and Lace. He looked
     at three split pictures and said: "it seems from the evidence that we made the right choice
     here. to leave it."
   - b. Far relax, today's default, causes two thirds of the box's wrong share off the starters
     (a 56-view sweep: 2.70 % with it, 0.84 % without) and needs no build: one default, at about
     1.37 times the march's work. Switch it off for the box? *Recommended: yes, after one
     frame-time table on the starters.*
     NOT ANSWERED. The table is in (the same run, 2026-10-12): Reach "Full" (far relax off, 1024
     steps) changes nothing at Arches or Lace; at Block city it costs 24 % at Detail 1 and 38 % at
     Detail 32, for 0.24 -> 0.16 % and 1.91 -> 0.78 % of rays on the wrong surface. On the
     starters it is a cost; the gain is at scales above 2.5.
     **NO CHANGE** (put to him 2026-10-12 as "far relax stays the default unless you say
     otherwise", with c, 2b, 2d, 2e and 7; he answered other calls twice after it and did not
     object).
   - c. Resumed orbits for the box (stage B) could bring the time back, but only pass counts say
     so, and pass counts are what misled the study. Spike it? *Recommended: only if he wants Step
     size gone from the app; otherwise park.*
     **NO CHANGE: parked** (follows from a; see b).
2. **Julia mode is in the tree** (`136d867d`); `ADR-DRAFT-julia-mode.md` has the pictures' names.
   The Mandelbox's half is clean. The bulb's is a grainy body with a halo from outside (cause not
   known), a clean relief at 1.8e-7, grooves from 1e-10, streaks from 1e-20.
   - a. Does the bulb's Julia mode stay reachable as it looks? *Recommended: look at
     `debug/scratch/formula-next/julia-bulb-*.png` first; if the outside view is not acceptable,
     hide the bulb's switch until b and a look at the outside grain.*
     **ANSWERED 2026-10-12: it stays.** He flew it: "flying through it seems good and reachable."
     With it he raised f: "I dont see how to set the julia constant's coordinate."
   - b. Build the second reference (the orbit of the constant)? The GPU says it is what the
     bulb's four ungated proof lines need. *Recommended: yes.*
     **NO CHANGE: parked** (see 1b). The recommendation was turned round when it was put to him:
     he found the mode flies well, and the second reference would not cure the grain from
     outside or the streaks at depth.
   - c. The row's switch takes the point looked at, as the button does. Or should the switch
     re-enter with the last constant? *Recommended: the switch re-enters with the last constant
     when there is one; the button takes the point.*
     **ANSWERED 2026-10-12: "2c - yes".** **DONE, `a20c5405`**: the switch comes back to the
     last constant when there is one (the rows not all 0, or the renderer still holding one);
     with none it takes the point looked at. The button always takes the point.
   - d. Switching Julia on puts the iteration floor back to 14. *Recommended: keep.*
     **NO CHANGE: kept** (see 1b).
   - e. The Kleinian card, whose whole-view proof line is a little over the bar. *Recommended:
     keep.*
     **NO CHANGE: kept** (see 1b).
   - f. Number rows for the constant, so it can be keyframed (a morph). *Recommended: a later
     stage, after he has flown the mode.*
     **ANSWERED 2026-10-12: "2f yes"**, to this concept: three rows (X, Y, Z) under the Julia
     switch, shown while it is on; typed or dragged they change the set live, and they can be
     keyframed; a constant taken from a deep place keeps its full precision until a row is
     touched; the button stays. **DONE, `a20c5405`**: one row "Constant" (X, Y, Z) under the
     Julia switch (`dzFormula.juliaX / Y / Z`), -4 to 4 on the slider and wider when typed; undo
     of a drag brings the exact strings back. Seen in the app as committed
     (`debug/scratch/julia-rows/see-row.png`). Found beside it by the builder and left: a scene
     saved while Julia mode is OFF carries the constant only as the three doubles; and, reasoned
     and not measured, after a render of a route with a KEYED constant the rows and the renderer
     may disagree until the next scrub (`routeRender.tsx` puts the saved view back).
     With it: "if possible changing the formula paramters to update live during interaction pls
     instead of on release". **DONE, `4e5b0016`**: the formula rows follow a drag (the sync's
     hold was 90 ms after the last change; it is one frame from the first).
3. **The kernel has three call sites** (ready in 8.5 s on a first visit, frame time unchanged). A
   two-call form builds in 5.8 s and costs the bulb 5.6 % of frame time
   (`debug/scratch/load/step2/core.v-g2.js.txt`). *Recommended: stay at three.*
   **ANSWERED 2026-10-12: stay at three.**
4. **A view that waits for ready** (a link, a scene) now sits under the small loading line over
   the START view's picture, then jumps. Show the large card whenever a view is parked?
   *Recommended: yes.*
   **ANSWERED 2026-10-12: yes.** To build.
5. **What comes after Julia among formulas** (`CHEAP-FORMULAS.md`): Burning on the bulb (it needs
   the fold-crossing test the box's ray step built), KaliBox (a CPU still first). *Recommended:
   nothing more until 1 and 2 are settled.*
   **ANSWERED 2026-10-12: "5 yes burning and kalibox".** Both, for session 12. KaliBox wants its
   CPU still first; Burning leaned on the fold-crossing test of the box's ray step, which is not
   in the tree (1a).
   The CPU study came back the same day (`BURNING-KALIBOX.md`): both worth building. Its seven
   calls, **ANSWERED 2026-10-12: "1-7 yes accepted"**: GMT's preset KaliBox ships as a card in
   Julia mode, saying it holds at Detail 1 only, with no Detail cap tied to the formula; the
   KaliBox that opens first is Scale 1.8 with the point added; Burning is built with whole
   orbits first, then the crossing test, and milliseconds at the same picture decide; a mix row
   in the first build; the longer step off in the first build; Burning before KaliBox; KaliBox
   with the point added has no whole-object view, its cards are places near the tip.
6. **The navigation on the Mandelbox** could step its CPU ray by the whole scalar estimate
   instead of half: half the steps, 0 to 0.8 % of rays more than 5 % past the careful ray.
   *Recommended: yes, as a small measured change.*
   **ANSWERED 2026-10-12: yes.** To build.
7. Left open by him, recorded in `NEXT.md` session 7: why power 8 needs the depth rule for
   iterations; the odd single render (about 2 to 8 % of renders of a grainy frame, by the
   machine's state; he could not see a difference in the sheets).
   **NO CHANGE: both stay parked in session 7** (see 1b).

## B. Routes, free look, rendering

8. **Free look**: his to fly ("will have to fly and see what you mean"). A pass that ends turned
   leaves the rest of the route turned; an unrecorded turn snaps back. Ease back, or leave?
   **ANSWERED 2026-10-12: "8 is cool!"** Left as it is. What he found while flying it is section F.
9. **fluid-toy now holds frames back for the codec** (a builder's addition: without it nothing
   reached the file before the end). *Recommended: keep.*
   **ANSWERED 2026-10-12: "9 fine".** Kept.
10. **GMT's Continue is offered only while the export version holds still**, and in a keyed scene
    moving the playhead between two runs changes it. Leave what the timeline drives out of the
    version? It changes versioning for videos and bucket renders too. *Recommended: yes, through
    the registry that already keeps the locked focus out.*
    **ANSWERED 2026-10-12: yes.** To build.
11. **A continued GMT render has another grain** because the worker's sample counter restarts
    with a run. Seeding it from the frame's own number would make a continued plain render exact
    and leave single runs as they are. *Recommended: yes; it is small.*
    **ANSWERED 2026-10-12: yes.** To build.
12. **GMT's video path raises the version before the file picker**: backing out of the picker
    leaves a version number with no file. *Recommended: fix with 10.*
    **ANSWERED 2026-10-12: yes.** To build, with 10.
13. Small, recorded: Draft has no way back; an Overwrite stopped halfway leaves a mixed folder;
    GMT's Discard leaves a 0-byte file; keyframes cut from a trail show a number and no picture.
    **ANSWERED 2026-10-12, two of the four:** "0-byte file goes" (with 10 to 12), and "route
    markers still missing thumbnails" (section F). Draft's way back and the mixed folder: not
    answered, left recorded.

## C. The shell (built the night of 2026-10-12; each was decided without him)

14. **Locations as a file**: a duplicate is the same camera strings, Julia constant and formula
    (the same spot looking another way counts as the same place); a pasted LIST is added and no
    longer jumps to its first entry; an import is not an undo step. Confirm or change.
    **ANSWERED 2026-10-12: confirmed.**
15. **Session autosave** is off by default; on, a reload opens where the app was left; the File
    menu's Autosave switch and "Restore Last Session" were removed from this app (they were
    app-gmt's and wrote app-gmt's keys); a session does not hold My locations or My Gradients;
    Home after a restore is the restored place. Confirm or change. Found beside it: fluid-toy and
    fractal-toy still show those two app-gmt rows in their File menus.
    **ANSWERED 2026-10-12: confirmed.** (The two rows in fluid-toy and fractal-toy: not answered.)
16. **The Diagnostics tab**: the renderer's accuracy gate has been on all along (a one-pixel
    readback twice a second while a still gathers). Should the shell start with it off?
17. **Help, the shortcuts page, What's New and the first-dive lesson are built** (the commit after
    `df202f04`; `deep-zoom/help/`, `deep-zoom/tutorial/`, `check:deep-zoom-help`). All of it is
    wording for him to cut:
    - Seven help topics written from the app as it is, and a Keyboard Shortcuts page generated
      from the registry each time it is read; `/` opens and closes Help.
    - What's New, version `0.1.0`, name "Deep Zoom": five bullets on what the app does and three
      for people who used the prototype (`deep-zoom/help/topics.ts`).
    - **The lesson is a PROPOSAL**: neither D9 nor the plan row lists its steps. "The first dive",
      seven cards, each advancing on the real deed: a dive to 1e-6; fly with W and a drag; B saves
      the view; K drops a keyframe; fly on and K again; Play on the Route tab; a closing card.
      A first visit shows it once the renderer is ready (not on a share-link visit); "Show the
      intro again" is in the "?" menu. With the card up W still flies and a drag still looks
      (verified in the app).
    - Found beside it: the starter "Surface" toasts "Stopped at 2.11e-5" although the dive
      arrives; the engine's tutorial switches hints ON when a lesson ends, whatever they were;
      the app still says "perturbation" in a toast and the top-bar badge, and one card is named
      "Past f64".
18. Found, not fixed: after File > Load Scene the project is named "mandelbulb-deepzoom"; the
    engine's dock does not notice a `showIf` flip by itself (worked round in `DeepZoomApp.tsx`);
    smoke stage 3's dive overshot once in 7 runs of one night.

## D. Plans that wait for his yes

19. **Zoom-outs** (`ZOOM-OUTS.md`, session 3): the plan says no code before his yes. Nine calls
    at its foot; the main ones: "Reverse" replaces the route as one undo step; the buttons "Zoom
    out from here" / "Zoom in to here"; least turn before most room; the place stays centred on
    the way out. *Recommended: yes to stages Z1 to Z3 as written.*
20. **The prototype's removal** (`PROTOTYPE-REMOVAL.md`, session 5): five empty rows block it.
    Three close with the help work (17). The other two are "a real render finishes" and "its
    progress can be read", which have no standing test: he declined new smoke steps twice. Rule:
    a smoke step for a real render after all, or accept the scratch proofs and delete? And three
    things a prototype user would miss with no drop recorded: still export at a chosen size and
    samples, a path file's import, a length typed as seconds.
21. **Sessions still ahead** (`NEXT.md`): 3 zoom-outs, 5 the prototype, 7 the march (his ran-out
    places are owed), 8 the Mandelbox (the math session is done: `BOX-RAY-STEP.md`), 9 navigation
    leftovers, 10 pause controls and the 1:1 row (both need a renderer handle), 11 Light Studio,
    12 more formulas. 6, Ship, comes last.

## E. Paperwork (each raises an approval prompt)

22. File the ADR for Julia mode (`ADR-DRAFT-julia-mode.md`), once 2 is answered. The box's
    (`ADR-DRAFT-box-ray-step.md`) is filed only if 1a is "take it".
23. Decisions from the export work that have no ADR yet: a video into a picked file is written as
    it goes with a keyframe a second (`b6f717dc`); the registry of state a render writes by
    itself, left out of the export version, with the question asked before a version is taken
    (`f86273db`); one naming rule for a frame's files. *Recommended: one ADR for the three.*
24. `.claude/rules/sibling-apps.md` does not yet know Julia mode, the session, the Diagnostics
    tab, the locations file or the help; and its `deep-zoom/` row still names the prototype.
25. What's New: GMT's entry for the export fixes is drafted on `main` (`915bebd6`, not pushed);
    the deep zoomer's own comes with 17.

## F. Found by him while flying routes, 2026-10-12 (his words; each is to build or to look at)

26. "the route is missing a reset (delete all keys/restart route)".
27. "also missing a way to reset the view". Asked what he means: "reset view = back to formula
    start view".
28. "missing a way to select/delete multiple route markers".
29. "after deleting route markers, the interpolation goes off and through objects". A fault:
    reproduce and measure before any fix.
30. "sometimes the timing for a route marker is too long and no way to adjust it".
31. "route markers still missing thumbnails" (13's keyframes cut from a trail).
32. Not a route matter, the same morning: "another pressing matter we havent discussed is ambient
    occlusion-we need options or defaults that inmprove its quality". Today it is read from the
    depth buffer: 10 taps a pixel out to 0.12 of the picture's height, no smoothing pass (a
    still's 64 samples average it; one flying frame is grainy), and Strength is its only row
    (grep `OCCLUSION FROM DEPTH` in `renderer/core.js`). Put to him, cheapest first: rows for
    the radius and the tap count; a depth-aware smoothing pass; a better estimator in the same
    taps; marched occlusion as GMT's (kernel work). Recommended: the rows first. Sheets for his
    eye: `debug/scratch/ao-sheet/` (`ao-radius-*.png`: 0.04 / 0.12 / 0.30; `ao-taps-*.png`: 10
    against 32 taps on one flying frame).
    **ANSWERED 2026-10-12: "AO: 1 and 3, maybe 4"**, and what looks wrong: "GMT's occlusion just
    looks much nicer and more realistic." GMT's is the fourth option exactly (grep `GetAO` in
    `engine-gmt/features/ao/shader.ts`: up to 32 samples of the distance field at growing
    heights along the normal, or along a cosine-weighted direction that changes every sample of
    a still; each sample counts by how much nearer the surface is than its height). Put to him:
    the rows now, then the cost of 4 measured before a new estimator is designed for 3.
33. THE SPECKS FROM FAR. Seen in the occlusion capture (`ao-radius-whole-bulb.png`: the whole
    bulb's picture as specks with a halo). He: "the specks with a halo when viewing from far
    (~ >1) - its a bug, we need to fix." ONE measurement, then to him (his rule for his kernel):
    `debug/scratch/far-specks/specks.log` (the whole bulb, power 8, 128 x 128 rays, the last
    commit's renderer). By distance off the surface, the share of rays on which a careful march
    and one twice as careful end more than two pixels of depth apart: 0.3: 0.02 %, 0.6: 0.04 %,
    1.0: 0.08 %, 1.5: 3.95 %, 2.0: 89.6 %, 3.0: 95.0 %, 4.0: 95.4 %. From 2.0 on the careful
    march "hits" on 99 % of rays (66 % at 4.0, where the bulb fills about an eighth of the
    view): rays stop in empty space. It is NOT the far hand-off (never handing off: as bad) and
    NOT the iteration count (14 and 32 give the same table). It begins with the camera between
    2.7 and 3.2 from the centre. The bulb's Julia set from outside is drawn from that far too
    (2a's grain). Cause: not looked for; his.
    **He: "The specks from far -send agent to find the cause." FOUND the same day, with a
    counter-test** (`debug/scratch/far-specks/`: `trace.log`, `counter-head.log`, `counter-B.log`,
    `pic-head.png`, `pic-B.png`, `julia-head.png`, `julia-B.png`; nothing in the tree changed).
    - The cause: the deep kernel holds a pixel's orbit as "the camera's orbit plus a difference".
      With the camera outside the escape radius its own orbit goes to |c|^8 on the first
      iteration (12,000 at 2.0 off the surface, 103,000 at 3.0, 564,000 at 4.0), and a point by
      the bulb, whose iterate is 5 to 30, is then the difference of two such numbers in single
      precision: rubbish. The estimate made from it comes out zero or negative in a shell of
      empty space round the bulb, and a non-positive estimate reads as a hit. The same
      arithmetic in f64 is right everywhere; the plain f32 program is clean at every distance.
      Grep `function buildRefOrbit` (the break at 100), `if (!applied) {` in `pertOrbit`,
      `float r2f = sqrt(max(cT0.w * cT0.w + sE * QE`, and `if (!esc || de.x <= 0.0)` in LOOP A
      (it stands before the `FAR_SWITCH` test, so the hand-off never protects).
    - The counter-test (one change in a scratch copy: where the reference's point is outside
      radius 2 the pixel iterates directly): two careful marches apart on 89.6 / 95.0 / 95.3 % of
      rays at 2.0 / 3.0 / 4.0 before, 0.00 % after; stray hits beside the bulb 10.2 / 43.9 /
      64.4 % before, 0 after; the picture is a bulb; the Julia set from outside clears too.
    - A second, smaller fault it uncovers: from about 3.7 off, the ray step's first stride is
      longer than the free distance (4.33 against 4.19 at 4.0 off) and lands in the solid: a
      patch of specks at the centre. Grep `The page's START CAP`.
    - Reached by the same cause: the Julia set from outside, the "Whole bulb" card (3.23 from the
      centre, just past the cliff), normal taps in far views. NOT reached: the Mandelbox from far
      (clean to 200 from the centre), the plain picture before ready, the navigation's CPU rays.
    - Two routes to a fix, neither taken: in the kernel (never ride a reference point far past
      escape: iterate directly there; Julia mode needs its own form) or in the march (hand the
      ray to the f32 far field at once when the camera's reference is useless). The gate must be
      the size of the reference's next point, not "camera outside radius 2": by arithmetic the
      cliff is 2.95 from the centre at power 8, 2.06 at power 12, 1.72 at power 16. The direct
      proof and the deep pictures must not move. His call which route.
    - **ANSWERED 2026-10-12: "speckle fix - in the march pls".** Handed to the builder that has
      the kernel file (after the occlusion rows and call 6), with the first-stride fault: a ray
      is given to the f32 far field at once when the reference's next point is too large to
      carry a difference, and the first stride is held to the set's ball while the camera
      stands outside it.

**26 to 31 BUILT, `e28fa8d8`** (one builder; smoke 54 of 54, `smoke:chrome`, the build):
- 26: "Clear route" on the Route tab, one undo step; the trail is left alone.
- 27: "Start view" in the readout box, beside Dive: the camera goes to the formula's whole
  view (`formulaHome`, or the Julia set's), the formula's numbers stay. NOTE: for the bulb that
  view stands 3.23 from the centre, just past the cliff of 33, so until 33 is fixed it shows
  specks; the app itself boots 2.60 from the centre, which is clean. Home was reworded to "the
  view the app started with".
- 28: click, Ctrl / Cmd-click, Shift-click in the list; "Delete selected (n)" or the Delete key,
  one undo step.
- 29, measured (`debug/scratch/route-fixes/app-delete.mts`): a Route-tab delete leaves exactly
  the route a fresh keying of the remaining keyframes gives (0 of 251 half frames differ). Five
  keyframes half way round the bulb, the three middle ones deleted: the one leg left passes
  0.61 from the bulb's centre where the four legs kept 3.03 to 3.17 off; it keeps the summed
  time (125 frames where K would give 81), so it plays slower; the row turns red, "Leg passes
  through the solid". That part is the in-between rule joining two views straight: HIS CALL.
  A real bug was found beside it and fixed: keys deleted ON THE TIMELINE left the neighbours'
  handles pointing at the deleted key (the depth curve up to 0.048 decades off).
- 30: a seconds field on every keyframe but the first: the leg that ends on it; later keyframes
  move by the difference; one undo step.
- 31: a cut from the trail gets its pictures in one pass (about 1.0 s for 10 keyframes; the
  camera returns exactly, the still restarts). Keyframes of a LOADED SCENE still show a number.
- Found beside it, left: a recorded free look is not moved by any retime (Even pace, As flown,
  the seconds field); the renderer's iteration rule reads the previous place's depth on the
  first frame after a jump (42 where 32 belongs); `thumbnail()` straight after `setView` draws
  the old reference orbit; the bulb has two "start views" (the boot's 2.60, `formulaHome`'s
  3.23).

## G. The build queue as it stood when the calls of A and B were in (2026-10-12)

- Done: the formula rows follow a drag (`4e5b0016`).
- Shell, the formula: the Julia constant's rows (2f).
- Shell, routes: 26 to 31.
- Shell, the loading notice: the large card whenever a view is parked (4).
- The renderer's CPU ray: the navigation on the Mandelbox steps by the whole scalar estimate (6).
- GMT's export: 10, 11, 12 and the 0-byte file.
- Formulas (session 12): KaliBox's CPU still, then Burning on the bulb and KaliBox (5).
- The look: occlusion (32), once he has said what looks wrong.
- Done since: the Julia constant's row and the switch (2f, 2c: `a20c5405`); the CPU study
  (`BURNING-KALIBOX.md`, `f9d5bf97`, seven calls at its foot, not yet answered).
- Running when this was last written: a builder on the routes (26 to 31), and an agent sent by
  him to find the cause of the specks from far (33; it edits nothing in the tree).
