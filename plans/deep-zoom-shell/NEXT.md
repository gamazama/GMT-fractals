# Deep zoom - what is left, session by session

Written 2026-10-10; sessions 1 to 3 rewritten the same day after the owner redesigned how a dive is
recorded (`ROUTES.md`). This is the order to work in; the detail of each stage stays where it is
(`ROUTES.md` for routes and rendering, `BUILD-PLAN.md` for the shell's other stages and the module
packages, `MANDELBOX.md`, `MANDELBOLIC.md`, `GMT-SYSTEMS.md` for the Light Studio, the ADRs for
decisions). Sizes are in sessions; a size marked "guess" has no measurement or earlier estimate
behind it.

## Where it stands

- Branch `deep-zoom-tool` in the worktree `.claude/worktrees/deep-zoom`: 112 commits ahead of
  `main` on 2026-10-11, 0 behind (`main` was merged in that day), never pushed. The owner holds
  push and merge ("not before stage 4 is green").
- Built and flown by the owner: the shell on the engine's plugins (stages 1 to 3, the keys of 4), GMT's
  navigation with speed by rays and Orbit mode (ADR-0133, ADR-0134), gradients (stage 5), the ray march
  as the default march, and since 2026-10-09 a second formula, the Mandelbox with negative scale
  (ADR-0135, `c2a84035`).
- `deep-zoom/renderer/core.js` is 5,573 lines in one file. The prototype that stage 7 deletes is about
  8,500 lines (`deep-zoom-prototype/` and its page copy under `public/`).
- Already in place for routes, though nothing uses it: the timeline is mounted, the animation tick
  runs, and the renderer draws after the timeline has written its values.

## The order, and why

His priority after gradients is dives on the timeline, and on 2026-10-10 he set the shape: the trail
is the record button, keyframes are dropped as you dive, the camera rides real tracks on the timeline,
roll comes first, and a place carries camera and formula only. So routes come first, then rendering,
then what lets it ship, then quality, then the large optional pieces.

| # | Session | What he gets | Needs first | Size |
|---|---|---|---|---|
| 1 | **Routes** (`ROUTES.md` R0 to R5) | Roll on Q / E; the trail; keyframes as you dive; a route on the timeline that plays and scrubs exactly and retimes by sliding; free look while a route plays | **built 2026-10-11** (R0 to R5): `ROUTES.md` "Where it stands" | done |
| 2 | **Rendering** (`ROUTES.md` R6, R7) | PNG frames to a folder, MP4 / WebM, and a question when frames are already there | **built 2026-10-11** (R6a to R6c, R7): frames, video, the question; GMT's half of the question waits for his calls (`ROUTES.md` R6c) | done |
| 3 | **Zoom-outs** | A route made from one place without flying it, his kept places first (`e20power2iters85.json`); a route played backwards | 1 | 1, guess |
| 4 | **Help and the first dive** (the rest of stage 4) | Help topics, the shortcuts page, What's New, lesson 1 | 1 for the route step of the lesson; the rest any time | 1 to 2 |
| 5 | **The prototype goes** (stage 7) | Nothing new on screen; about 8,500 lines leave the repo; the map page and README | 1 and 2 (the prototype's record panel is the last thing only it has) | 1 |
| 6 | **Ship** | The app on the site, at app.gmt-fractals.com beside GMT | **after every other session of this table** (his word, 2026-10-11) | his call |
| 7 | **The march, finished** | Fewer places that crawl or run out of steps; the older marches retired | his places where rays ran out of steps (owed by him) | 1 to 2 |
| 8 | **Mandelbox, the rest** | A math session first: can the box take the ray march's step, so the page's step rule leaves the shader. Then faster flying on the box, cheaper deep frames | `ROUTES.md` R7 (the page's program retired for the bulb) | 1 to 3, guess |
| 9 | **Navigation leftovers** | Cheaper rays at the deepest places; his numbers for the rise limit and the clearance | his calls | 1 |
| 10 | **Shell leftovers** | Pause controls, Diagnostics, autosave, Export all | module package M5 for pause | 1 to 2 |
| 11 | **Light Studio** (stage L) | GMT's light list, orb strip and aim-by-drag lighting the deep zoomer | nothing; the largest piece | 10 to 13 |
| 12 | **More formulas** | His choice of the next one | his choice | 1 to 4 each |

**His ranking, 2026-10-11 (the evening)**, asked whether the list still stands: "3-5,8-11 still
important"; "6-7 also waiting on me" (Ship, and the march's ran-out places); 8, the Mandelbox's
math session, "can run the research of this now (extra agents)" - started that evening, on the CPU
only (`debug/scratch/box-ray-study/`); 12, more formulas, "take cheapest definitely, and start
research on what else is cheap or easy" - so Julia mode is next among formulas, and its plan and a
ranked survey were started the same evening (`debug/scratch/formula-next/`).

**The kernel work he ordered, 2026-10-11 (the evening): "great lets do 1-4".** Four steps, one at a
time, each needing `core.js` to itself. His reason for the order: "if we need to do the kernel
rewrite (option2) and if the gains are so significant, then it would be best to get it out the way
before we start adding formulas."

1. **The ray program kept across browser restarts, and a plain picture that is a picture.**
   DONE 2026-10-11, `fecd8fec`. One extra one-pixel draw after a background build (`keepOnDisk` in
   `core.js`) puts the program on the browser's disk: in the production build, after a browser
   restart, ready at 0.38 s where it was 23.4 to 25.0 s; the Mandelbox's program 0.04 s where it
   was 4.7 to 4.8 s. A first visit is unchanged by it. The bulb's plain picture took the box's
   pixel-footprint hit level (two lines of the baseline's shader lost their `USE_BOX` guard): at
   the start view 5.9 % of its pixels are speckle where 61 % were, so the loading notice is the
   small line down to a depth of 1 and the card below. For him: a view that waits for ready (a
   link, a scene) now sits under the small line over the start view's picture, then jumps.
2. **Fewer copies of the kernel.** DONE 2026-10-12, `120023fc`, as THREE calls, not one. The
   single call site was built first and failed on frame time (bulb views 36 to 105 % slower:
   pixels taking taps at different loop passes make every pass cost its dearest pixel). Forms
   measured on the way: one loop 5.7 s and +71 %; two calls 5.8 s and +5.6 % (worst +10.1 %);
   three calls 7.62 s and -1.5 % (worst +0.8 %). The three-call form is in: the march in `main`,
   a loop for what the march owes (the bisection, hit refine, the two probes), a loop for both
   tap sets (grep `THREE CALLS OF THE KERNEL` in `core.js`). The production page is ready in
   8.5 s where it took 20.5; the Mandelbox's program builds in 2.08 s where it took 4.41. Proven
   the same: the bench's JSON byte for byte, the direct proof's lines, pass G read back to the
   bit on 19 views, 41 pictures within the floor in three shoots of four.
   - The fourth shoot's one off-picture (the shell frame at Power 2, 5e-20) was run down before
     the commit: that frame rendered every two seconds, three sessions a kernel, the same night:
     the usual picture (the same bytes as ever) in 215 of 228 renders with the kernel before
     and 210 of 228 with this one. The same within noise. The odd-render rate itself was about
     6 to 8 % that night where it was 2 % the afternoon before, for both kernels: it moves with
     the machine's state, which is one more fact for `NEXT.md` session 7.
   - Not explained, seen once: smoke stage 3's dive overshot in 1 of the builder's 7 runs.
   - For him, if a first visit should be shorter still: the two-call form (5.8 s) is kept as a
     file, `debug/scratch/load/step2/core.v-g2.js.txt`; it costs the bulb 5.6 % of frame time.
3. **The Mandelbox's ray step** (`BOX-RAY-STEP.md`). BUILT 2026-10-12, FAILED ITS FRAME-TIME GATE,
   NOT IN THE TREE: his decision. The step alone was built against `120023fc` on the terms
   recommended to him (today's hit surface kept, the whole estimate, no resumed orbits), after the
   study's one bad view was traced and the rule fixed for it (an inversion late in the orbit makes
   the iterate speed up during the step). On the GPU it is cleaner at every one of 92 view-settings
   (rays on another surface than the careful march: starters 0.51 -> 0.04 %, a 56-view sweep 2.70 ->
   0.41 %) and its pictures are nearer the careful march's, but frame time failed: Whole box
   +3.6 %, Arches +39.3 %, Block city -28.7 % (mean +4.7 % against a bound of 3, worst against a
   bound of 8); Lace +46 %. It is faster at scales 1.3, 2 and 3 and slower at the negative scales
   the starters use: a block of pixels waits for its slowest ray, that ray is held by the step's
   aim, and a pass with the jet costs about 1.35 of one without. The tree was put back; the build
   is kept as `debug/scratch/box-ray-study/build/core.stage-a.js`; the ADR is drafted as
   `ADR-DRAFT-box-ray-step.md` with the gate's tables and his four calls (take it as measured or
   leave the box; the aim; far relax, which needs no build and causes two thirds of today's wrong
   share off the starters; resumed orbits). Step size therefore stays in the app for the
   Mandelbox. Done regardless: the whole-box card saves 51 iterations, not 14.
   **His call, 2026-10-12 (later that morning): leave it.** The gate had timed the build against
   the rough default; timed at the same picture it is faster than Step size 0.5 and 21 to 30 %
   slower than Hit refine 4 at the scale -1.5 starters (the draft's last section has the table).
4. **Julia mode and the Kleinian card** (`JULIA.md`, `CHEAP-FORMULAS.md`). BUILT 2026-10-12,
   `136d867d`; the ADR is drafted, not filed (`ADR-DRAFT-julia-mode.md`, with his five calls). One
   uniform in both kernels, no new program and no new call of the kernel; the constant travels as
   strings with the view; a Julia switch and "Julia from this place" on the Formula tab; "Kleinian,
   scale 1.8" as a fifth Mandelbox card with no kernel line. Mandelbrot mode proven unmoved (the
   bench's JSON, the direct proof's lines, 41 pictures, frame time, build time).
   - **The Mandelbox's half is clean** (six direct-proof lines to 1e-30; a slatted cube from
     outside).
   - **The bulb's half is for him to look at**: from outside a grainy body with a halo of specks
     (cause not known), a clean folded relief at 1.8e-7, grooves from 1e-10, streaks from 1e-20;
     four of its direct-proof lines do not meet the bar and are printed ungated. The GPU says the
     second reference (the orbit of the constant) is what those lines need: the study had put its
     gain at a fifth, and `JULIA.md` still says so. Pictures: `debug/scratch/formula-next/`.
   - In the app the mode is scratch-proven only; no smoke step was added.

**After the four steps, the same night** (he: "proceed best you can with all the remaining items
that make sense to proceed with autonomously"): the shell leftovers of session 10 that need no
kernel work. See session 10 below for what landed.

Sessions 1 to 5 are one line of work and should run in that order. 7 to 12 are independent of each other
and of 1 to 5, except that only one session at a time may own `core.js`.

## Each session, to start from

### 1. Routes
- `ROUTES.md` is the whole brief: the words, his decisions, the shape, stages R0 to R5 and the open
  calls. Start with R0, a CPU study with no app change, unless he has changed the order.
- Roll (R1) was "offered, not asked for" under Navigation leftovers; it is now the first thing he
  can fly, because a keyframe has to hold a full orientation and the view format is about to be saved
  in scenes.
- R2 changes the engine and writes a decision record. With him in the session, write the ADR when it
  is due: the tool prompt is his approval.

### 2. Rendering
- `ROUTES.md` R6 and R7. Three engine changes ride along: the render dialog opened from anywhere
  (ENGINE-GAPS E22), the encoder taking any image source (E23), a folder-of-frames sink (E24).
- The module's single-frame render must give the same picture alone as in sequence; that is the
  check, and it is what makes a render resumable.
- Manual check owed: what a cancelled MP4 leaves on disk.

### 3. Zoom-outs
- A route played backwards is its key times mirrored: one button once routes exist.
- A zoom-out from a place nobody flew to (a pasted place has no trail): keyframes generated back along
  the view axis until the whole object is in frame, each leg tested against the rays the navigation
  already casts (`api.dz.freeDistance`); a straight line back can pass through the solid. Each
  keyframe needs its own iterations.
- His kept place `e20power2iters85.json` (copy in `debug/scratch/owner-e20/`) is the first target:
  "an incredible and beautiful zoomout from here".
- No design yet beyond this: one page and his yes before code.

### 4. Help and the first dive
- BUILT 2026-10-12 (the night), for his wording: seven help topics from the app as it is, a
  shortcuts page generated from the registry, `/` for Help, What's New (`0.1.0`), and lesson 1
  "The first dive" as a proposal of seven cards. `OPEN-CALLS.md` call 17 has what is his to cut.
  With it, three of the five empty rows of `PROTOTYPE-REMOVAL.md` are filled (the first-run
  guide, the Help panel, the `/` key).
- S4-2 and S4-3 in `BUILD-PLAN.md`. The Mandelbox, the navigation by rays and routes postdate the help
  text of the prototype: write the topics from the app as it is, not from last week's tabs.
- What's New entries: see the memory note on the in-app changelog for where they live.

### 5. The prototype goes
- S7-1 starts with a table: every step of the prototype's smoke against the shell step that covers
  it. Nothing is deleted until that table has no empty row.

### 6. Ship
- **Not before sessions 1 to 12 are done.** The owner, 2026-10-11: "we push after 1-12. deepzoom
  will release as a complete app". So nothing of this branch is pushed or merged into `main`
  until then, and the standalone page's repo (`mandelbulb_deepzoom`, branch `kernel-perf`) is not
  pushed either. The deep zoomer lives in GMT's repo and ships at app.gmt-fractals.com; GMT's
  System menu already has "Open Deep Zoom" on this branch (`2edc378b`).
- Before asking: `main` merged in if it has moved, every gate, `npm run build`, the smokes headless.
- A push deploys the whole site and can interrupt people mid-session: his word, his timing.
- ADR numbers 0131 and 0132 are taken on the unmerged `audio-perf-overnight` branch.

### 7. The march, finished
- Owed by him: the places where rays ran out of steps. Ask; add them to `deep-zoom/data/places.ts`,
  which is also the test set of `npm run bench:deep-zoom-march`.
- Known: power 2 gains nothing from the line-against-the-ball rule; the picture's march can crawl
  beside the pole axis under a theta phase (the navigation's probe was fixed for it in `68718c65`,
  the picture's march was not); where a step's fixed cost sits is unprofiled. (The two shaders
  building one after the other is gone: since `ROUTES.md` R7 the ray program is the only one and
  builds from page open; what its 21 to 26 s are made of is being measured, 2026-10-11.)
- Retiring the older marches is `ROUTES.md` R7 now, and it goes further than this line once said:
  the page's own program is retired for the bulb, with the J variant, the skip table and their
  controls (his answers of 2026-10-11 are in that section).
- **Why power 8 needs more iterations than the ray march's margin rule gives** (measured in
  `ROUTES.md` R7b-2; the owner, 2026-10-11: "i dont know why"). The page's depth rule
  (32 + 1.35 a decade) therefore still sets the count at power 8, against his rule of nothing
  keyed to depth: at the start view the margin rule alone settles at 13 where both give 32, and
  the picture moves; at power 2 and power 4 it settles no lower. Find what the margin measures
  that power 8 does not show it, before the depth rule can go.
- **The odd single render** (`ROUTES.md` R7c): one render in about sixty of a grainy frame comes
  out as another throw of its grain and the next is the usual picture again, most often the
  second render after ready. He had not seen one; the sheets are in `debug/scratch/r7c/`
  (`odd-render-*.png`).
- Parked by him, do not touch: Detail defaults and Normal detail.
- The standing rule for this session: a method that responds to what is on screen, never a rule keyed
  to depth or power.

### 8. Mandelbox, the rest
- **A math session first** (the owner, 2026-10-11: "add to the plan for a math session to incorporate
  the mandelbox if possible"). After `ROUTES.md` R7 the Mandelbox is the last thing that marches by
  the page's step rule (estimate x Step size), on a program of its own (ADR-0135, decision 3). The
  question, on paper and on the CPU before any shader: can the box take the ray march's step?
  - What ADR-0135 says against the need: "with equal stretch on every axis the ray estimate says
    what `dr` says". So the gain is not a better estimate; it is one march for both formulas, no
    Step size left in the app, and resumed orbits on the box.
  - What has to be worked out: a jet through the folds (the box fold and the sphere fold are
    piecewise: a ray that crosses a fold boundary between two samples breaks the linear carry, so
    a checkpoint's validity has to know the folds crossed); the line-against-the-ball rule's ball
    for a formula with no Julia-set bound of the bulb's kind; negative scale.
  - Done when there is a rule with its error bound, tested on rays through the box starters
    (`deep-zoom/data/boxStarters.ts`) against the careful march, or a written reason why not. If it
    holds, the build is its own stage and a new ADR over 0135's third decision.
- The navigation's rays step by half the scalar estimate on the box (`pertOrbitJetJS` returns it):
  with equal stretch on every axis the true ray estimate is close to the scalar one, so measure how
  much of the half can be given back.
- Not measured on the GPU: where orbits run past the reference turn to noise (the 24-bit CPU
  emulation says about 17 iterations at scale 2). No noise was seen in any picture.
- No kept GPU line for pre-rotation (the direct proof's five lines are unrotated).
- Time, only with numbers: resumed orbits, skipping runs that cross no fold (`MANDELBOX.md` stage 7).
- Detail depends on the place (6 of 24 searched directions were intricate at 2e-20). A dive aims
  straight ahead; steering a dive toward intricate ground is an idea, not a plan - the same wish he
  voiced for the bulb ("dives into the more defined areas").

### 9. Navigation leftovers
- Settled by him, 2026-10-11 ("yes on all 3"): the rise limit stays 4 decades a second, the
  clearance share stays 0.08, and the old speed rule's switch in Settings goes (grep `followView`
  in `deep-zoom/navigationState.ts`, `settings.ts`, `DeepZoomNavigation.tsx`): the speed follows
  the view, always.
- The rays cost up to 10.5 ms a frame at the deepest starter. Levers: a skip table in the CPU probe
  (the renderer's own went with the page's program in `ROUTES.md` R7; its build is in the history
  of `core.js` before `f9f01e1a`, grep `blaBuild`), or reading the picture's own depth. Routes lean on the same rays (the clip warning, the trail cut).
- Inside the solid: he wants GMT's overlay for it, "camera undo must be ready first". A flight is one
  undo step since ADR-0134; check whether that is the camera undo he meant before starting.
- Roll is no longer here: it is `ROUTES.md` R1.

### 10. Shell leftovers
- BUILT 2026-10-12 (the night; no renderer work), three commits:
  - `a85bd8bb` locations as a file: Export all and Import on the Locations tab; a pasted, opened
    or dropped LIST is added to My locations (`deep-zoom/claims.ts`), with a toast that counts
    added / skipped / unreadable; it reads the old prototype's file too.
  - `82475492` session autosave, OFF by default (`deep-zoom/session.ts`): the engine's session
    plugin with this app's own keys and the two standard rows under Settings > Files. On, a
    reload opens where the app was left (the view exact, the route, the look, the formula).
  - `52adc214` the Diagnostics tab, Advanced mode only (`components/Diagnostics.tsx`): readouts
    and the developer levers that still exist (accuracy gate, path, rebase, far hand-off, the ray
    march's bits and numbers). Host calls only.
  - Decided without him, his to change: a duplicate location is the same camera strings, Julia
    constant and formula; a pasted list is added and no longer jumps to its first entry; the File
    menu's Autosave switch and "Restore Last Session" were removed from this app (they were
    app-gmt's rows and wrote app-gmt's keys); a session does not hold My locations or My
    Gradients; Home after a restore is the restored place; the labels "Export all", "Import".
- STILL LEFT, both need a renderer handle that does not exist: pause controls (module package M5)
  and the `actualPixels` row (M1).
- Module packages left: M6 (the option seams driven by one test), M1 (params / set / schema), M3
  (events), M5 (pause). Each is additive. (Parity, which they were to keep, is retired: ADR-0137;
  the direct proof and the shader compare of `ROUTES.md` R7a stand in.) M4 is replaced by
  `ROUTES.md` R6.

### 11. Light Studio
- `BUILD-PLAN.md` "Stage L" and `GMT-SYSTEMS.md`. L0 (N lights in the module's shading pass) can go
  any time; L-guard and L1 to L4 are GMT files only; L5 is the shell.
- No test in the repo touches a light today: the guard comes first.
- It is as large as everything above it together. Worth asking him whether it still ranks where it
  did before routes and formulas existed.
- Since 2026-10-10 a place and a keyframe carry no light: lights are keyframed on their own tracks.
  The L5 migration of "saved places and flight paths made before L5" shrinks to scenes.

### 12. More formulas
- What a formula costs is now known: its fixed-point map, reference rows, kernel step and CPU orbit
  (ADR-0135); the Mandelbox took 631 lines in `core.js` and 486 in the shell.
- Measured on the CPU, in `debug/scratch/formula-study/` (git-ignored; do not delete):
  - **KaliBox, the Kleinian family, the generated fold formulas**: reuse the box's two fold pieces.
    Not measured; Kleinian sets are close to self-similar, so depth may show more of the same.
  - **Julia mode** of either formula: the cheapest addition (same kernel, a constant c). CHOSEN by
    him as the next formula work (2026-10-11); the plan and its CPU measurements are the study in
    `debug/scratch/formula-next/JULIA.md`, to be moved here as a plan page once he has read it.
  - **MandelBolic**: planned and parked. Depth is reached only toward its plane; its look is the level
    surface of an estimate and has Burning Mode on. `MANDELBOLIC.md` is complete.
  - **Radiolaria, Mandelorus**: exact delta steps, but they flatten at depth. Not recommended.
- GMT's own AmazingBox Scale row stays 1 to 4 (his call, 2026-10-10).

## For whoever opens the next session

- `git status` first, in the worktree; another chat may be working there. Name whose changes are whose.
- Two dev servers since 2026-10-11, both with hot reload off. The owner flies port 3420 (preview
  `dz-fly`): a detached checkout, `.claude/worktrees/deep-zoom-fly`, that a `post-commit` hook keeps
  on the last commit of this branch. Builders and every smoke use the working tree's server on port
  3410 (`dz-worktree-dev`). Tell him to reload the moment a stage is COMMITTED, not before.
- His rules for a build session (2026-10-11): a brief caps deliberate breaks at 3; a stage runs its
  own smoke stage file, plus the direct proof when `core.js` changes, and the full suite once
  before the commit; a fault in the renderer goes to him after the first measurement.
- Browser checks: `DZ_HEADLESS=1`. The direct proof reads `PORT=3410` (without it, it starts a
  server of its own on 3478); the shell smoke reads `ENGINE_URL=http://localhost:3410`. After any
  edit of `core.js`: the direct proof, and for a change meant to leave the picture alone the two
  scratch tools of `ROUTES.md` R7a (`debug/scratch/r7/shader-diff.mjs <commit>`, `pictures.mts`).
  Parity is retired (ADR-0137).
- No new smoke script or step unless he asks (he declined one for the formula switch, 2026-10-10).
- Rebuild the context map (`npm run context:map`) as the last thing before staging: a file added after
  it makes `context:check` fail.
- Agents: one builder at a time, continued with a message rather than replaced. The Mandelbox took one
  agent three runs and about 1.46 million tokens.
- His standing worry is the size of the codebase: report lines added, code against comment, when a
  stage closes.
