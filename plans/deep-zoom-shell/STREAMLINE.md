# Deep zoom - a streamlined interface: what three reviewers found, and the proposal

The owner, 2026-10-17: "send up to 3 agents serially to go through the interface, all the features,
playthrough it try different tasks and come back with recommendation on a streamlined and well thought
out" interface. Three reviewers drove the app one after another (Playwright, real Chrome on the GPU,
1600 x 1000, fresh profiles, file pickers stubbed; `main` at `eb094e1b`). Round 1: first use, the core
loop and an inventory. Round 2: everything round 1 did not reach, and its claims tested. Round 3: the
gaps closed, every bug reproduced again, and this proposal. Evidence (git-ignored, local only):
`debug/scratch/ux-review/round-1/` (`t*.jpg`), `round-2/` (`m-*.jpg`, `downloads/`), `round-3/`
(`r3-*.jpg`, `m3-*.jpg`). The picture of the proposal: `round-3/m3-first-screen-today-vs-proposed.jpg`
and `round-3/m3-light-today-vs-proposed.jpg` (made by restyling the live page; no source edited).

Nothing here is built.

## HIS ANSWERS (2026-10-17): "yes to all except 5 (GX should be cross-saving all gradients already)"

Every question in F is answered yes, as recommended, except F5: no "Use in Deep Zoom" button; a
gradient picked in the Explorer already reaches My Gradients (cross-saved), which is enough. Read for
the build:
- F4 (a quieter default gradient "of his choosing"): the builder shows him two or three quiet ramps
  as pictures at one deep place; he picks; nothing is changed before he does.
- F14 (the light rig's readback flood, his kernel) is read as "fix it": one change, the readback
  re-armed only after the previous one is collected (grep `requestRig` / `pollRig` in core.js),
  proven by the warning count while flying (256 and the cap today) and `smoke:deep-zoom-direct`.
  If that reading is wrong he says so before stage 3 runs.
- F16 (Hit landing): two stills, Hit landing on and off, at the same place and samples, in one split
  image for him BEFORE anything is removed.

**The stages, with his answers folded in** (G below is the reviewers' order; this replaces it):
1. Route and place bugs: A1 (Ctrl+Z over the Route tab), A2 (the previous trail carries its formula;
   F13: its toast once a session), A3 (Paste takes a link), A4 (Record disarms), A7 + F3 (a row click
   only selects, the row's play icon parks; the button reads "Replace keyframe N (K)" while parked).
2. Dive and arrival: A8 (a limit that grows with the decades asked, a reason when it stops, Dive goes
   on), A9 ("Arrived" after the settled frame), F7 (boot at Start view, 2.13e0).
3. Engine fixes GMT gains: A5 (the render dialog remembers its settings; Escape closes it), A6 (hints
   keep their value after the lesson), A11 (Escape closes Smooth; one dialog at a time), A12 (Space
   once in the shortcuts; fly up listed), A13 / F14 (the readback, in his kernel: see above).
4. The first screen: F1 (Frame size 640), F2 (the right dock folded on a first visit, remembered),
   the centre chip down to "still n / 64", the depth box to two lines and the Dive row, F15 (the
   Locations top-bar menu goes) and the picture icon goes, the words pass and F12 ("place" in the UI).
5. Tabs by the manifest: the Light order and its "More" fold (F8: Bounce in it), Quality's
   "Accuracy" fold (F16's stills first), "Iterations 56 · in use 70" as one row, A10 + F10 (Tab
   switches Fly / Orbit only while the picture has focus), F6 (every card jumps; Places groups).
6. The Route tab: one Timing row [As flown | Even | Smooth...] and Reverse visible (F9), the `⋯`
   menu, the Smoothing slider removed, Smooth's wording ("Even out by", the result as a share).
7. The render recipe (engine; GMT gains): F11 (MP4 at 1280 wide as the first default, the PNG folder
   one click away), Draft | Final with a way back, a shape (Window | 16:9 | 1:1), the range in
   seconds, an estimate before Start, files named after the route or place.
Plus F4 (the default gradient, his pick) wherever it fits.

## A. Bugs (each reproduced again in round 3)

| # | Bug and repro | File | Size | GMT shares it? |
|---|---|---|---|---|
| A1 | **Ctrl+Z over the Route tab does not undo route edits, and costs the place.** Clear route, then Ctrl+Z with the pointer over the Route tab: the route stays cleared; the camera jumps 1.80e-20 -> 1.08e-6 and the formula goes back to the bulb. Fix: `useShortcutScope('timeline-hover', hovered)` in the Route panel; the engine already sends that scope to the animation stack (`engine/plugins/Undo.tsx`). Per-scope undo is kept. | `deep-zoom/components/RoutePanel.tsx` | S | No |
| A2 | **Route from the previous trail ignores the formula.** Surface (bulb), then Arches (Mandelbox), then Route from the previous trail: 7 keyframes on the Mandelbox, 6 of 6 legs "passes through the solid", black playback. `routeFromTrail` takes cameras only. | `route.ts`, `trail.ts` | S | No |
| A3 | **Paste location refuses the app's own link** ("That text is not a location (it is not JSON)"). Copy location pastes fine. Fix: read a `#s=` link's camera and formula. | `share.ts`, `locationParse.ts` | S | No |
| A4 | **The timeline's Record stays armed after a free-look pass**; a later Fill drag became a `dzLight.fill` track. Disarm in Deep Zoom when Play stops after a recorded pass (GMT's auto-key is meant to stay armed). | `route.ts` | S | Fix in Deep Zoom only |
| A5 | **The render dialog forgets its settings on reopening** (back to PNG, 1920, End, 8 samples, Draft off), and Escape does not close it. `cfg` is `useState`, defaults asked once per open. | `engine/plugins/RenderDialog/index.tsx` | S-M | Yes |
| A6 | **Hints switch on after the lesson** (skip or complete): every right-dock row doubles; it survives a reload. `skipTutorial` / `completeTutorial` set `showHints: true`. Put back the value from before the lesson. | `store/slices/uiSlice.ts` | S | Yes |
| A7 | **A row click parks the playhead, and K then replaces with no warning before.** His rule stands (K replaces the keyframe parked on); the button keeps reading "Add keyframe". Fix: "Replace keyframe 2 (K)" and a mark on the parked row. | `RoutePanel.tsx` | S | No |
| A8 | **The Dive field fails from the boot view**: 4.6e-4 in a second, then stalls; "Stopped at 2.19e-4" after ~40 s in dark space. From Start view it reaches 1.2e-16 and stops on the fixed 45 s limit (`DZ_DIVE_TIME_LIMIT_MS` in `deep-zoom/host/dive.ts`; ~0.45 decades a second cannot fit 20 decades). Fix: a limit that grows with the decades asked, a reason when it stops, a second Dive that goes on; boot at Start view (F7). | `host/dive.ts`, `diveControl.ts` | S-M | No |
| A9 | **"Stopped at" when it arrived** (the Surface card, twice): `diveTo` reads `depthNow()` before the settled frame. Also leaves a 0 s leg in a cut route. | `diveControl.ts` | S | No |
| A10 | **Tab traps keyboard focus**: Tab is the global Fly/Orbit switch; after the Dive button every Tab switches mode and toasts. Tab should switch only while the picture has focus. | `hotkeys.ts` | S | No |
| A11 | Escape does not close Smooth; Smooth and Render can be open together. | `components/SmoothDialog.tsx` | S | No |
| A12 | The shortcuts page lists Space twice ("Play / pause animation") and not as fly up. | registry rows, `help/shortcutsPage.ts` | S | Engine rows shared |
| A13 | **A note for him (his kernel):** the light rig's asynchronous readback re-arms every live deep frame before the last read is collected: 256 "READ-usage buffer ... discarded the shadow copy" warnings within ~4 s of flying, then "WebGL: too many errors", after which every real WebGL error is hidden for the session. Grep `requestRig` / `pollRig` in `deep-zoom/renderer/core.js`. | his kernel | - | No |

Not a bug: "[TickRegistry] runTicks() called twice within 1ms" is a timing false positive (one driver, `<RenderLoopDriver/>`; grep `DOUBLE_RUN_WINDOW_MS`), dev only.

## B. The streamlined interface (picture: `round-3/m3-*-today-vs-proposed.jpg`)

**First screen**

| | Today | Proposed |
|---|---|---|
| Picture's share of 1600 x 1000 | 54 % (920 x 944) | 74 % (1248 x 944) |
| Frame drawn | 312 x 320 (Frame size 320) | Frame size 640 (F1) |
| Right dock | open on Light, 15 rows | folded to its icon strip on a first visit; remembered once opened (F2) |
| Left dock | 20 cards, Save this view, 5 buttons | the same cards, Save this view, 3 buttons ("Paste link or place", "Copy link", "File..." with Export, Import, Copy as text) |
| Depth box | 7 lines | the depth, "73.7 decades to the floor", then Dive to 1e-__, Dive, Start view; fly speed shows only while the wheel changes it; Fly / Orbit a small pill |
| Centre chip | `perturbation 1.58e0 it 32 312 x 320 64/64` | "still 37 / 64" while the picture gathers; the other four readings live in Diagnostics |
| Top bar | 10 controls | 8 (the Locations menu and the picture icon go) |
| Visible controls | 74 buttons, 13 sliders, 2 selects | about 40 buttons, no sliders |

**Tabs**, in order:
- **Places** (was Locations): Mandelbulb, Mandelbox, KaliBox, Kept places (his, starred), My places. Every card jumps (F6). A card's title is its depth or its name, once; a box card's "scale -1.5" in the subtitle.
- **Route**: [+ Add keyframe K] [Play] [Render], reading [Replace keyframe 2 K] while a row is parked; Trail 1.7 decades · 6 s [Route to here]; one Timing row [As flown | Even | Smooth...] then [Reverse]; the summary "4 keyframes · 5.0 s · 1e-6 -> 4e-6 · 0.69 decades a second"; the list; a `⋯` menu with Route from the previous trail, Delete selected, Clear route. The Smoothing slider goes.
- **Formula**: the formula's rows, Julia, then "Iterations 56 · in use 70" as one row, and Auto.
- **Light**: 11 rows in four groups, then a closed "More" fold. Lights: Light type, Key elevation, Key turn, Fill, Kicker. Ambient: Sky, Light tint. Shadow: Shadows, Occlusion. Surface and air: Roughness, Haze. More: Bounce, Occlusion radius, Occlusion samples, Shading. The Lamp rows still appear under Light type for Lamp or Both (already hidden under Direct).
- **Colour**: as today; the default gradient is F4.
- **Quality**: Frame size (subtitle "drawn 624 x 640"), Detail, Step size (box), Accumulate; a closed "Accuracy" fold with Normal detail, Reach, Normals, Depth normal radius, Hit landing, Hit refine; Inspect folded.
- **Diagnostics**: Advanced only, as today; it takes the chip's four readings.

**Menus**: File = Open scene..., Save scene..., Save picture (PNG with the scene; Alt+S), Render route...; Help as today with Space listed once; Settings' storage list behind Advanced.

**Render dialog** (engine; GMT shares it): What = Video MP4 | Frames (PNG folder); Size = a width and a shape (Window | 16:9 | 1:1); Quality = Draft | Final (Draft can be switched back; OPEN-CALLS B13); Range in seconds; an estimate before Start from the last frame time; it remembers its last settings and closes on Escape; files named after the route or the place.

**Ways to do one thing, today -> proposed**: still-export doors 3 -> 1; render doors 3 -> 2; start places 3 -> 2; timing controls 6 -> 3 plus a leg's seconds; places that show the depth 5 -> 2; iterations 4 -> 2; frame size 3 -> 1; meanings of "pace" 4 -> 1; undo stacks 2 -> 2 (by design; the Route tab joins the route's stack).

**Glossary, one word each**: place (camera + formula; replaces location, view, "Location 1"; the file format unchanged); link (a URL: a place plus the look; Paste takes either); depth (distance to the nearest surface; "magnification" goes, "scale" stays a formula setting); pace (how fast a route goes deeper, decades a second, its only meaning); motion (picture heights a second; Smooth's "Pace by" becomes "Even out by"); speed (fly speed); still (the gathered picture); detail (how close rays get); trail, route, keyframe, free look as today; deep / plain (replace "perturbation" and "Past f64").

## C. Quick wins (S), by what they save a user

1. A1, the Route-tab undo (one Ctrl+Z lost 19 decades and the formula). 2. A8 + F7, the Dive field reaches 1e-20. 3. A9, "Arrived" when it arrived. 4. A6, hints keep their value. 5. A5 + A11, dialogs remember and close on Escape. 6. A4, Record disarms. 7. A3, Paste takes a link. 8. A2, the previous trail carries its formula. 9. A7, the "Replace keyframe N" label. 10. A10, Tab. 11. A words pass (the glossary, "Undo: param", DISK, AVC, "Past f64"). 12. Smooth's result as a share ("frames off pace 43 % -> 5 %"), not a count that grows with a longer route. 13. A12.

## D. Restructuring (M / L)

1. The first screen (M): the right dock folded, the chip, the depth box, the top bar, Frame size 640.
2. Tab order and folds through the manifest (S-M): `panels.ts` already has `whitelistParams` sections and `collapsible`.
3. The Route tab's Timing row and `⋯` menu (M).
4. The render recipe (M-L, engine; GMT gains).
5. One start place (S-M), F7.
6. The trail starts at the first flight; Route to here offers the last dive (M).
7. Still export at a chosen size and samples through the render dialog (L; OPEN-CALLS D20, his call).

## E. Removals that shrink the code

The chip's four readings (`components/StatusChip.tsx`); the "Drawn" row (into Frame size); "In use now" (into Iterations); the Route tab's Smoothing slider and `setRouteSmoothing`; the top-bar picture icon; the Locations top-bar menu (F15); the Copy location button; the toast on every jump (once a session); Hit landing (F16, not tested). Shading moves into the fold, not removed.

## F. Questions for him, each with a recommendation

1. Frame size default: 640 (320 and 640 both settle in 0.50 s at Arches; fit-the-view 0.65 s at 95-147 fps against 160).
2. The right dock folded on a first visit: yes, remembered once opened.
3. Should a row click park the playhead? (touches the K rule) A click only selects; the row's play icon parks. The rule itself unchanged.
4. Default gradient: today a full rainbow; a quieter ramp of his choosing. Taste.
5. The Explorer trip bringing the gradient back ("Nothing comes back", `explorerTrip.ts`, ADR-0126): a "Use in Deep Zoom" button, shared with GMT's trip.
6. Starter cards: all jump (2-3 s) rather than some diving (13-16 s); the Dive field and the lesson teach diving.
7. Boot at Start view (2.13e0) instead of 1.58e0: yes (from there a dive reaches 1.2e-16; from the boot view it stalls at 2.2e-4).
8. Bounce into the fold once he has tuned it: yes; Fill and Kicker stay visible.
9. Reverse stays visible on the Timing row: yes.
10. Tab switches Fly / Orbit only while the picture has focus: yes.
11. Render defaults: remember the last settings; first default MP4 at 1280 wide, the PNG folder one click away (Continue works for frames only).
12. "Place" in the UI rather than "location": yes, his word.
13. The previous trail: keep it, carry the formula, toast once (or drop it).
14. A13, the readback warnings: his kernel.
15. Remove the Locations top-bar menu: yes.
16. Remove Hit landing (Hit refine replaces it): compare two stills first.

Where reviewers 1 and 2 disagreed, round 3 came down: with round 2 on K (keep his rule, fix the label) and on the undo fix (S, deep zoom only, the scope exists); Frame size 640 from round 2's numbers; "In use now" merged, not removed; "Arrived" is card-specific (round 1 was right; reproduced twice at Surface); the Light fold takes Bounce, the accuracy rows and Shading rather than the Lamp rows (already hidden under Direct); the right dock folded rather than opened on Quality (Quality's first rows are what THE GOAL says a user should not need).

## G. Build order (builder-sized; each at most 3 deliberate breaks; check by trying once)

1. **Route and place bugs** (A1-A4, A7): `RoutePanel.tsx`, `route.ts`, `trail.ts`, `share.ts`, `locationParse.ts`. Try: Clear route, Ctrl+Z over the Route tab brings 7 keyframes back and the camera stays; Copy link then Paste jumps; Surface, Arches, previous trail: no red legs.
2. **Dive and arrival** (A8, A9, F7 if yes): `host/dive.ts`, `diveControl.ts`, the boot view. Try: a fresh profile, Dive to 20 arrives; Surface toasts "Arrived at 1.07e-6".
3. **Engine fixes GMT gains** (A5, A6, A11, A12): `store/slices/uiSlice.ts`, `engine/plugins/RenderDialog/index.tsx`, `SmoothDialog.tsx`. Try in GMT and Deep Zoom: the render dialog reopened keeps its format.
4. **The first screen** (D1, the words pass): `StatusChip.tsx`, `DepthReadout.tsx`, the dock at boot, the top bar, `features/quality.ts`. Try: a fresh profile at 1600 x 1000 gives the picture 74 % or more.
5. **Tabs by manifest** (D2, A10): `panels.ts`, `features/light.ts` (order only), `Readouts.tsx`, `hotkeys.ts`. Try: the Light tab matches the mock; a saved scene loads the same values.
6. **Route Timing row and Smooth wording** (D3, the slider removed): `RoutePanel.tsx`, `SmoothDialog.tsx`, `smoothDialog.ts`.
7. **The render recipe** (D4, engine): `RenderDialog/ConfigForm.tsx`, `index.tsx`, `deep-zoom/routeRender.tsx`. Try: a Draft then a Final MP4 in both apps.
