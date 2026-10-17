# Deep Zoom gmt-shell - what the owner decided, and what is still open

Architect pass, 2026-10-07; split into **decided** and **open** on 2026-10-08; O1 to O3 moved to
decided (K6 to K8) the same day, before the first package was built. Only calls that
change what gets built. The first version's numbers D3 to D15 are kept so the other documents'
references still resolve; D1 and D2 are closed by K1 to K3.

# Decided

K1 to K3 and K5 are as relayed in this job's brief, not verbatim. K4 is the owner's answer to five
numbered questions: "yes to all 5 recommendations" (2026-10-08).

## K1. The standalone page is frozen

`H:/GMT/workspace-gmt/mandelbulb_deepzoom`, commit 3b65946, is the historical reference. Nobody
edits it. Every "small handle added to the page" in the first plan is now a change to the module.
*Closes D2 (who edits the renderer page): nobody does.*

## K2. The renderer is a module, and the new shell mounts it from stage 1

`deep-zoom/renderer` (`createDeepZoom(canvas, options)`, commit a087bbb8), a scripted port proven
against the page on the real GPU (`debug/smoke-deep-zoom-parity.mts` 47 of 47,
`debug/deep-zoom-direct-check.mts` 11 of 11). The new shell has one way to reach the renderer.
From now on `core.js` is edited directly, guarded by the parity smoke for anything meant to leave
the picture unchanged. *Also covers GMT-SYSTEMS 8.13 (who edits the module). The owner's words are that core.js is edited
directly; the rest is the architect's reading: the builders, one
package at a time. That item is not marked there because it was not asked by number.*

## K3. The new shell owns `deep-zoom/`; last week's prototype moves aside

It stays runnable under another name until the new shell matches it, then it is removed.
`deep-zoom/renderer` stays where it is. *Closes D1 (rebuild in place, or keep the old shell at a
second entry): it is kept at a second entry for the length of the build. The tag
`deep-zoom-lean-shell` is no longer needed.*

## K4. GMT's own navigation and Light Studio, reworked generically - no private copies

Answers to `GMT-SYSTEMS.md` section 8, all "yes to the recommendation":

| Item | Decided |
|---|---|
| 8.1 | GMT's navigation is the deep zoomer's flying (stage N) |
| 8.2 | GMT's drag-look, not captured-mouse look |
| 8.4 | Fly speed in this shell: range 0.01..8, default 3.6. GMT's own range and default stay |
| 8.7 | Option (a): GMT does not show Surface lights until GMT can fit a surface plane itself |
| 8.16 | The attachment keeps its behaviour and the name "Surface" |

## K5. The shell does not wait for a rework

Until stage N lands it flies on the module's own loop; until stage L lands it lights with plain
sliders. `GMT-SYSTEMS.md` section 7 says which stage each rework belongs to.

## K6. The prototype is `deep-zoom-prototype`, dev-only (was O1)

Decided 2026-10-08 ("yes to all 3"), restated by the owner at the start of the build session.
Last week's embedded prototype moves to `deep-zoom-prototype/` with `deep-zoom-prototype.html`,
`public/deep-zoom-prototype-core/` and `smoke:deep-zoom-prototype` (BLUEPRINT section 11 has the
full table). It is **not a production build input**: it runs on the dev server only and its shell
page is never built. *Closes O1; unblocks stage 1, package S1-A.*

## K7. No push and no merge to `main` until the owner says ship (was O2)

Decided 2026-10-08. Every commit of this build stays on the local branch `deep-zoom-tool`. A new
HTML entry joins the precache and a push can interrupt live users, so the first push and the merge
wait for the owner's word. *Closes O2.*

## K8. Colour uses GMT's own mode numbers and its `scale` / `offset` / `bias` names (was O3)

Decided 2026-10-08. From the first saved file the colour feature stores GMT's mode numbers
(0, 1, 5, 7, 8, 13) and GMT's `scale` / `offset` / `bias` names (GMT-SYSTEMS 7.5), so a GMT
colouring block reads across later with no migration. *Closes O3; unblocks stage 2, package S2-2.
Where BLUEPRINT section 3 still shows the module's own `mode` enum for `dzColour`, K8 wins.*

## K9. How the shell reaches the renderer, and how it is checked

Restated by the owner at the start of the build session, 2026-10-08: the standalone page in
`mandelbulb_deepzoom` is frozen and is not edited (K1); the shell mounts the module and there is
no embedded page (K2); real-GPU checks run headed Chrome on d3d11, never SwiftShader.

Building started 2026-10-08 on the owner's word (an overnight session, stage 1 first).

## K10. Gradients: what the surface wears, who carries it, and what stays in the Explorer

Decided 2026-10-09, before stage 5 was built ("yes to all, places and explorer carry the
gradient"):
- **The gradient replaces the renderer's built-in palette.** The Colour tab is Plain or Gradient;
  there is no "use gradient" switch (BUILD-PLAN S5-1's `useGradient` was not built). As in GMT.
- **A saved place carries its gradient**, and a jump to it brings the colours back. A place saved
  before stage 5 has none and leaves the gradient as it is.
- **The Explorer button carries the gradient there**, and the Explorer links back ("Back to Deep
  Zoom"). Nothing comes back, as with GMT (ADR-0126): the Explorer's gradient is in My Gradients.
- **No live offset, bias or repeats in this app.** "offset and bias can stay as baked/rasterized
  options in the gradient explorers adjust tab, they dont need a live counterpart." They are
  Adjust dials of the Gradient Studio (Phase, Scale, ...), baked into the gradient. K8's reserved
  names stand; nothing is built behind them.
- **The mapping values stay the renderer's, and Iterations is the default mapping.** Decided
  the same day, after the measurement he asked for (BUILD-PLAN, "Stage 5 as built": how much of
  the gradient a frame covers under each mapping): "yes to all 3". GMT's values would make a deep
  frame flatter; under Orbit trap, the old default, much of a deep frame is one colour. K8 still
  holds for the NUMBERS and NAMES; the module adapter of GMT-SYSTEMS 2.3 ("Module computes GMT's
  values") is not to be built.

## K11. A dive is a route on the timeline: the trail records, keyframes are dropped as you dive

Decided 2026-10-10, in a design conversation that set the current limits aside ("lets loose the
current inherant limitations, and instead think of what would be ideal"). Both ways of making a route
are wanted: "record the dive live and retime", and "set keyframes as you dive so you can look around
and choose where the next keyframe will be". The trail - the app keeping how you got here - is the
live recorder: "the trail is the record button, and it can be disabled ... you never really know where
you will end up." A jump to a saved place starts a new trail, "perhaps a warning if the trail is more
than a few decades deep." *Supersedes D4 and D15; the plan is `ROUTES.md`.*

## K12. The camera rides the engine's own tracks, widened generically

"gmt does support most of this, including exponential tracks, if not fully then at least conceptually
waiting for an opportunity like this to be intergrated into the engine." "camera and light will be
keyframed in their own tracks." So no private path player and no side table: the route is keys on an
exponential track, and where the engine falls short it is widened for any app. How the exact view
rides on a key is the architect's recommendation, not his words (`ROUTES.md` "The shape"; the ADR is
written in R2). *Supersedes D5 and the interim of ENGINE-GAPS E16.*

## K13. Route first, the camera second, and the second is optional

"route first - the camera second - but that part is optional. all it means is we can playback the
route and record/view a rotation offset ontop of it." (`ROUTES.md` R5.)

## K14. Roll comes before routes

"the lack of q/e roll seems like a major problem that would prevent users from being able to keyframe
rotation." Roll moves from "offered, not asked for" (GMT-SYSTEMS 8.3) to the first flyable stage
(`ROUTES.md` R1). *Closes the roll half of O4.*

## K15. A place is camera and formula only

"a place shouldnt store light and colour - this will make it hard to improve the lighting and color
system. currently it is relatvie to the camera in the default setting." and "saved places can also
keep camera and formula only." A dive keyframe likewise carries the camera alone. *As the architect
reads it this reverses K10's "a saved place carries its gradient"; whether the gradient and the march
settings go with light and colour was put back to him and answered yes the same day (K16).*

## K16. The route calls, answered

Decided 2026-10-10, to a numbered list: "1-3 yes / 4 returns to route / 5-7 yes / 8 - to use improve
gmt's rendering with this option would be ideal. / 9. yes good fixes. / all good to go ahead". In
`ROUTES.md`'s numbering: a place also loses its gradient, detail and march settings (reverses that
line of K10); `K` drops a keyframe after the last one, or replaces the one the playhead is parked on;
the default pace is 0.5 decades a second; a fly key stops a playing route and an unrecorded turn
returns to the route's aim; one route a scene; each keyframe keys the iterations in effect and the
automatic rule is off while a route plays; the timeline shows one Depth track and three Look tracks;
the frame rate is saved in a scene and the timeline's length becomes undoable. **Rendering**: the
folder of PNG frames, the resume and the preview video are built into the shared render dialog so
GMT's own rendering gains them, and the module's ZIP render is dropped. *Closes D11.* Building
started the same day on his word, with `ROUTES.md` R0.

# Open - in the order they block

| Order | Id | The call | Blocks | Recommended |
|---|---|---|---|---|
| - | O1, O2, O3 | **Decided**: see K6, K7, K8 above | - | - |
| 4 | D7, D13, D14 | Developer levers; the 17 look values with no range; fixed frame size and the scale pill | stage 2 | as written below |
| 5 | D6, D8 | Where saved locations live; which small engine changes ride along | stage 3 (E2 of D8 already in stage 2) | as written below |
| 6 | D3, D9 | Keys while the mouse is captured (holds until N5); the tutorial card | stage 4 | as written below |
| 7 | **O4** with GMT-SYSTEMS 8.3, 8.5, 8.15, 8.17 | Keys once nothing captures the mouse; roll; which distance; a slow key; up and down along whose axis | stage N: N4 (8.3 sizes it) and N5 | below, and the recommendations in GMT-SYSTEMS |
| 8 | D10 | Phone | N5 (the on-screen sticks arrive with GMT's navigation) | below |
| 9 | D4, D5, D15, D11 | **Replaced 2026-10-10**: D4, D5 and D15 are superseded by K11 and K12; D11 is closed by K16. The route calls were answered the same day: K16 and "Answered by the owner" in `ROUTES.md` | - | - |
| 10 | GMT-SYSTEMS 8.6, 8.9, 8.8 | Which attachments this shell offers; light count; route A only, or A then B | stage L: L0 (8.9), L4 and L5 (8.6); 8.8 only after stage 7 | Surface and Camera, World disabled below about 1e-6; 8 lights; A now |
| 11 | D12 | Modulation (LFOs) | nothing in v1; L5 packs with an empty modulation map until it is decided | leave out of v1 |
| 12 | GMT-SYSTEMS 8.10, 8.11, 8.12, 8.14 | Post stack; share-link schema; F8 stays out; shadow rows after route B | after stage 7 (8.11 after stage 3 shows the link's length) | as recommended there |

## O4. Keys once nothing captures the mouse (re-opens D3 for N5)

D3's rule leans on "while the mouse is captured". With GMT's drag-look (K4) nothing captures it.
Recommended for N5: `Space` and `C` are GMT's up and down, so the timeline's `Space` does not play
while the picture has focus and colour mode loses the `C` key (another key, or the panel row
only); `9` / `0` and `T` / `Y` lose their flying-only bindings, because the panels can be reached
with a free pointer; slot digits act only when no fly key is held and nothing is recording; `Q` /
`E` do nothing unless roll is switched on (GMT-SYSTEMS 8.3).


## D3. Three key meanings change

*Open. Holds from stage 4 until N5; after N5 see O4.*

One rule decides all of it: **while the mouse is captured, only the fly keys move the camera, and
the look keys you tune while moving keep their old meaning. The suite's key language applies when
the mouse is free.**

- Digits `1`-`9` recall location slots and `Ctrl+1`-`9` save them (the state library's standard,
  same as fluid-toy) - **only with the mouse free and not recording**. A slip from W onto `1` at
  1e-50 does nothing. While captured, `9` / `0` step the palette scale as on the page.
- `T` opens the timeline and `Space` plays it - mouse free only. While captured, `T` / `Y` step the
  lamp falloff as on the page, and `Space` does nothing.
- `H` toggles hints (the Help plugin's own). Overlays move to `O`. The other route frees `H` by
  switching the hint key off.
- Not coming back as keys unless you ask: `N`, `P`, `R`, `V`, `,` `.` `;` `'` (panel rows). Each is
  one registration under the same rule.

Recommend as stated. Lost for good: last week's `1` `2` `3` panel toggles (the docks replace them).

## D4. What the timeline number means

*Superseded 2026-10-10 by K11 and K12: there is no `camera.u`. A key's value is the depth at that
keyframe and the key carries the exact view. Kept for the record.*

`camera.u` is one float per frame.

- **A. Fraction of the flight's length, 0 to 1 (recommended).** Matches what the page's preview and
  render already do; two keys make a whole flight; extra keys retime it. Cost: adding a view to the
  middle of a flight later shifts where existing keys point unless they are renormalised in the
  same step.
- **B. View index, 0 to n-1.** A key means "exactly this recorded view at this frame"; inserting a
  view never moves other keys. Cost: speed between views is uneven unless the views are evenly
  spaced, and the module's renderer would need the same sampler.

Recommend A now. "Add the view I am looking at to the flight" is left out of v1 either way.

## D5. The feature that holds that number is called `camera`

*Superseded 2026-10-10 by K12: the track is `camera.depth`, which lands in the Camera group as it is.
The cost this entry did not name - with Record on, playback stops driving every `camera.` track - is
handled in `ROUTES.md` R2. Kept for the record.*

The timeline files tracks into groups by hardcoded prefix; `camera.` lands in Camera and is skipped
while the camera is being recorded. Any other id is filed under "Shading".

- **A. Use `camera` now (recommended).** Works today; fractal-toy already has a feature with that
  id (separate page, no clash). Cost: one feature without the `dz` prefix.
- **B. Add a track-group registry to the engine first (ENGINE-GAPS E18), then move the number into the `dzFlight` feature.**
  Right long-term shape; one more engine change before stage 6.

## D6. Where saved locations live

- **A. Device library, kept across reloads, and also written into every scene file and scene PNG
  (recommended; this is what GMT does with saved cameras).** Share links leave them out.
  Cost: a scene file with 50 locations carries 50 thumbnails.
- **B. Device library only.** Smaller scene files; a scene sent to someone has no locations in it.

Second half of the same call: the engine's state library does not persist. Either add a `persist`
option to it (S to M, a short ADR, fluid-toy's saved views would survive reloads too) or keep a
30-line mirror in the shell. Recommend the engine option, scheduled after stage 3 proves the shape.

## D7. The developer levers

About 14 test and measurement controls (accuracy gate, march internals, BLA tolerance, guide values,
caps, force rebuild).

- **A. A `Diagnostics` dock tab that only appears in the engine's Advanced mode, one registered
  widget, no saved state (recommended).** They stay reachable for kernel work without entering
  scenes or undo, and the gate is the engine's own switch, not a private `?dev` flag. The same
  switch shows the four advanced Quality rows.
- **B. Leave them out of the shell;** use the dev harness (`deep-zoom-harness.html`) for kernel work.
- **C. Make them advanced DDFS params.** They would then be saved, keyframable and undoable -
  wrong for measurement switches.

The BLA tolerance stays in Diagnostics until its own open call is settled.

## D8. Which small engine changes ride along with this build

Recommended to do during the stages (each under half a day, no ADR, other apps gain):
- the feature-overlay host (E2). Four copies exist today, one in app-gmt and one in the engine's own
  viewport shell; the package replaces all four with one. It touches `app-gmt/AppGmt.tsx`, so it
  runs app-gmt's boot and chrome smokes. Without it the depth scale is a fifth copy;
- the state library's slot-key condition and the list's sort and second line (E36, E38) - without
  them digits teleport the camera while flying, and a renamed location loses its depth;
- `openRenderPopup()` and the wider encoder input (E22, E23), in stage 6b;
- the async snapshot source (E8), only if the first real-GPU PNG is blank.

No longer a call: the second key root for Shortcuts (E5) is dropped. The renderer is a module in
the shell's own document, so there is no second document to listen in (ENGINE-GAPS section C).

New since 2026-10-08, following from K4 (the owner answered the five items, not the ADRs): two ADRs ride with the reworks - "Navigation emits
displacements" (package N2) and "Lights resolve against a view frame" (drafted in L3, finished in L4).


Queued, each needs an ADR: shared app-shell component (E1), state-library persistence (E10),
session-only params (E13), setter equality gate (E15), cross-app gradient hand-off (E28).

## D9. The first-run guide is the engine's tutorial card, not last week's slim strip

The Tutorial plugin has one look: a 360 px card. Last week's strip was one line at the bottom.

- **A. Use the card now (recommended), provided the stage-4 check shows it does not take keyboard
  focus from the picture.** Dive-first and "nothing blocks input" both hold.
- **B. Add a strip presentation and a per-step skip to the engine tutorial first (E26, about two
  days).** Closer to the design; GMT's tutorials could use it too.

If the focus check fails, B becomes required.

## D10. Phone

*Re-opened by K4.* Before N5, flight is a captured mouse plus keys and nothing handles touch.
After N5 GMT's navigation brings its two on-screen sticks, and its hook switches drag-look off on
phones, so phone flight rests on the sticks alone (GMT-SYSTEMS 3.1; the sender component is
unverified there).

- **A. Desktop only until N5, then the sticks, with a phone pass in the chrome smoke
  (recommended).** The root uses the phone-safe shell component from stage 1; before N5 a phone
  visitor sees the picture and a one-line notice.
- **B. Desktop only in v1,** sticks left off even after N5.


## D11. Video before lossless frames

*Closed 2026-10-10 by K16, as B and wider. The module's own path render has its own easing on top of
the timeline's, skips the per-frame rules and holds every PNG in memory until the end, so it is
dropped; lossless frames come from a folder-of-frames option of the shared render dialog, which GMT
gains too (`ROUTES.md` R6).*

The engine's render dialog makes MP4 / WebM; it has no image-sequence writer outside GMT's own.

- **A. The module's own ZIP of PNGs first (stage 6a, needs no module package: the module downloads the ZIP parts itself and M6 leaves that one download in place), video through the
  engine dialog second (stage 6b, needs M4) (recommended).** The ZIP keeps the cancel confirm and
  the ffmpeg line. Known limit until M4: the ZIP uses the module's own smooth-step timing, not the
  curve you shaped on the timeline, and the Flight strip says so.
- **B. Build an engine image-sequence writer first (E24, one to two days),** so the lossless master
  also comes from the dialog.

## D12. Modulation (LFOs) is left out of v1

An LFO on power, phase or iterations would rebuild the reference orbit every frame. Recommend:
do not install modulation now; revisit for the light and colour params once the shell is stable.
Say so if you want audio / LFO on the look from day one.

## D13. Seventeen look values have no range

The module gives defaults but no range for exposure, saturation, fill, kicker, metallic, reflectivity,
the fill and kicker colours and nine more. Recommend: ship the 11 ranged light controls in stage 2; add the rest as
advanced rows only after someone reads the shading pass and sets each range. If you already know
the safe ranges, give them and they go in with stage 2.

## D14. Fixed frame size and the scale pill in the viewport

> **Update 2026-10-17 (closed; the owner: "we still need to appropriate the resolution/canvas control
> from gmt"):** Fixed mode is in (`381e44c4`). The deep zoomer's surface draws at the Fixed box itself
> (`deep-zoom/DeepZoomSurface.tsx`), Frame size capped by it, so E4's size sink was not needed. The
> scale pill stays hidden there (ViewportModeControls `inline`).

The engine's viewport frame offers Fixed mode (a typed width and height, fit to the window) and a
scale pill. The pill can already be pointed at the tool's own frame size. Fixed mode cannot: the
renderer sizes itself and nothing tells it the numbers.

- **A. Leave both off for now; frame size is a slider in Quality with a drawn-against-asked readout
  (recommended for stages 1-6).** Honest, zero engine work.
- **B. Add a size sink to the viewport frame (ENGINE-GAPS E4, half a day to a day) after stage 2,
  then switch Fixed mode and the pill on and drop the readout widget.** More native; app-gmt and
  fluid-toy could use the same sink. Needs a module package for an exact width and height (today the
  module takes a long edge only: `api.setFrame(longEdgePx)`, `deep-zoom/renderer/index.ts`).

## D15. Default speed of a recorded dive

*Superseded 2026-10-10 by K11: a leg's default timing is a pace in decades per second, and a route cut
from the trail is timed as flown or at an even pace. The number is `ROUTES.md` open call 3. Kept for
the record.*

A new flight gets a straight line with a short ease at each end, so the body runs at a constant
number of decades per second. Last week's preview and render used a smooth step whose middle ran
at about 1.9 times the average. Say so if you want the smooth step as the default; either way the
curve is editable in the graph editor and the strip shows decades per second at the playhead.

## Applied without asking (standing rules)

- The recorded flight and the saved locations go into scene files through the engine's document
  registry, not through preset fields. Share links then leave them out with no code.
- Stage 6 is split: 6a (record, scrub, lossless frames) needs no module package; 6b (video)
  starts when M4 has landed.
- Every package has a check it can run alone, and the smoke is one file per stage.

- The starter card line "deeper than Mandelbulber and Mandelbulb 3D reach" is removed: a claim with
  no source in the tree, and labels carry names and numbers only.
- The Camera plugin is not installed; saved places use one mechanism, the state library.
- Pause controls are installed in stage 2 once the module can pause (package M5); the bucket
  renderer is not installed in v1. The pause half is taken from GMT-SYSTEMS 7.3, which corrected
  the first version. 7.3 also asks for a bucket controller in stage 6; that half is not taken - the
  module keeps its own tiled export (BLUEPRINT section 1). You were not asked this one; say so if a
  bucket controller belongs in v1.
- Every former page handle is a module package, one at a time, with the parity smoke green (K1, K2).
- The prototype is never edited to match the new shell; it is the porting source and then it goes.
- Location thumbnails become 128 px JPEG (last week's PNGs are what filled the storage quota).
