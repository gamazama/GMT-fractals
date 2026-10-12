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
     NOT ANSWERED (asked twice, 2026-10-12).
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
     touched; the button stays. To build.
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
15. **Session autosave** is off by default; on, a reload opens where the app was left; the File
    menu's Autosave switch and "Restore Last Session" were removed from this app (they were
    app-gmt's and wrote app-gmt's keys); a session does not hold My locations or My Gradients;
    Home after a restore is the restored place. Confirm or change. Found beside it: fluid-toy and
    fractal-toy still show those two app-gmt rows in their File menus.
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
27. "also missing a way to reset the view". What he means by it is asked, not assumed.
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
    against 32 taps on one flying frame). What looks wrong to him: asked, not yet answered.
    Seen beside it and not explained: in that scratch capture the whole bulb's PICTURE from
    outside came out as specks with a halo while its occlusion channel was whole
    (`ao-radius-whole-bulb.png`), the look the bulb's Julia set has from outside (2a).

## G. The build queue as it stood when the calls of A and B were in (2026-10-12)

- Done: the formula rows follow a drag (`4e5b0016`).
- Shell, the formula: the Julia constant's rows (2f).
- Shell, routes: 26 to 31.
- Shell, the loading notice: the large card whenever a view is parked (4).
- The renderer's CPU ray: the navigation on the Mandelbox steps by the whole scalar estimate (6).
- GMT's export: 10, 11, 12 and the 0-byte file.
- Formulas (session 12): KaliBox's CPU still, then Burning on the bulb and KaliBox (5).
- The look: occlusion (32), once he has said what looks wrong.
- Running when this was written: a builder on the Julia constant's rows, and a CPU-only study
  that writes `BURNING-KALIBOX.md`.
