# Deep Zoom gmt-shell - what the owner decides

Architect pass, 2026-10-07. Only calls that change what gets built. Each has options, the cost of
each, and a recommendation. Everything else in `BLUEPRINT.md` follows from the standing rules.

## D1. Rebuild in place - the old panels disappear after stage 1 and return over stages 2 to 6

Stage 1 replaces last week's shell with the engine chrome and an empty dock. The look panels come
back in stage 2, locations in stage 3, the first-run guide in stage 4, record and lossless frames in
stage 6a, video in stage 6b. Before stage 1 you create the tag `deep-zoom-lean-shell` on today's
head: later stages port from it, and stage 1 deletes the files.

- **A. In place (recommended).** One `deep-zoom/`, no parallel copy. Cost: for the length of the
  build the branch has fewer features than last week. Last week's shell stays reachable as a git tag.
- **B. Keep the old shell at a second entry page until stage 6.** Cost: a parallel copy, two sets
  of files knip and the smokes must carry - the thing the "improve the master" rule forbids.

Recommend A, and do not merge `deep-zoom-tool` to `main` before stage 4 is green (a push to main
deploys and can interrupt live users).

## D2. Who edits the renderer page, and when

The plan needs about ten small additive handles in `mandelbulb_deepzoom/index.html` (R packages).
That file is the master on `kernel-perf`, where the kernel work is live and unpushed.

- **A. The shell builders add them on `kernel-perf` as they go.** Fastest; risk of colliding with
  the open look / landing / colour work there.
- **B. One R package per sitting, done by whoever holds `kernel-perf` that day, then synced
  (recommended).** The shell never waits: every package has an interim except render-to-memory
  (R-H4) and pause (R-K3). Cost: stage 6b (the render dialog and MP4) cannot start until R-H4 lands. Stage 6a (record, scrub, ZIP of PNGs, still) does not wait.
- **C. Skip the handles; go straight to the module extraction.** Cleanest end state, but stages
  2 to 6 would run on interims for longer and the extraction is the largest single item.

Recommend B, with R-H1 (parameters by id) and R-H4 (seek and render one frame) first.

## D3. Three key meanings change

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

`camera.u` is one float per frame.

- **A. Fraction of the flight's length, 0 to 1 (recommended).** Matches what the page's preview and
  render already do; two keys make a whole flight; extra keys retime it. Cost: adding a view to the
  middle of a flight later shifts where existing keys point unless they are renormalised in the
  same step.
- **B. View index, 0 to n-1.** A key means "exactly this recorded view at this frame"; inserting a
  view never moves other keys. Cost: speed between views is uneven unless the views are evenly
  spaced, and the page's renderer would need the same sampler.

Recommend A now. "Add the view I am looking at to the flight" is left out of v1 either way.

## D5. The feature that holds that number is called `camera`

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
- **B. Leave them out of the shell;** use the standalone page for kernel work.
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

Your call:
- the second key root for Shortcuts (E5). The interim relay is about 15 lines inside the transport
  and disappears with the module transport. Recommend: keep the relay, skip E5 unless a popout
  window needs it.

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

Flight is pointer lock plus keys; nothing in the page handles touch.

- **A. Desktop only in v1 (recommended):** the root still uses the phone-safe shell component, the
  chrome smoke runs the desktop viewport only, and a phone visitor sees the picture and a one-line
  notice.
- **B. Design touch flight now.** A renderer feature first, then a shell layout; not small.

## D11. Video before lossless frames

The engine's render dialog makes MP4 / WebM; it has no image-sequence writer outside GMT's own.

- **A. The page's ZIP of PNGs first (stage 6a, needs nothing from the page), video through the
  engine dialog second (stage 6b, needs R-H4) (recommended).** The ZIP keeps the cancel confirm and
  the ffmpeg line. Known limit until R-H4: the ZIP uses the page's own smooth-step timing, not the
  curve you shaped on the timeline, and the Flight strip says so.
- **B. Build an engine image-sequence writer first (E24, one to two days),** so the lossless master
  also comes from the dialog.

## D12. Modulation (LFOs) is left out of v1

An LFO on power, phase or iterations would rebuild the reference orbit every frame. Recommend:
do not install modulation now; revisit for the light and colour params once the shell is stable.
Say so if you want audio / LFO on the look from day one.

## D13. Seventeen look values have no range

The page gives defaults but no range for exposure, saturation, fill, kicker, metallic, reflectivity,
the fill and kicker colours and nine more. Recommend: ship the 11 ranged light controls in stage 2; add the rest as
advanced rows only after someone reads the shading pass and sets each range. If you already know
the safe ranges, give them and they go in with stage 2.

## D14. Fixed frame size and the scale pill in the viewport

The engine's viewport frame offers Fixed mode (a typed width and height, fit to the window) and a
scale pill. The pill can already be pointed at the tool's own frame size. Fixed mode cannot: the
renderer sizes itself and nothing tells it the numbers.

- **A. Leave both off for now; frame size is a slider in Quality with a drawn-against-asked readout
  (recommended for stages 1-6).** Honest, zero engine work.
- **B. Add a size sink to the viewport frame (ENGINE-GAPS E4, half a day to a day) after stage 2,
  then switch Fixed mode and the pill on and drop the readout widget.** More native; app-gmt and
  fluid-toy could use the same sink. Needs a page handle for an exact width and height (today the
  page takes a long edge only).

## D15. Default speed of a recorded dive

A new flight gets a straight line with a short ease at each end, so the body runs at a constant
number of decades per second. Last week's preview and render used a smooth step whose middle ran
at about 1.9 times the average. Say so if you want the smooth step as the default; either way the
curve is editable in the graph editor and the strip shows decades per second at the playhead.

## Applied without asking (standing rules)

- The recorded flight and the saved locations go into scene files through the engine's document
  registry, not through preset fields. Share links then leave them out with no code.
- Stage 6 is split: 6a (record, scrub, lossless frames) needs nothing from the page; 6b (video)
  starts when R-H4 has landed.
- Every package has a check it can run alone, and the smoke is one file per stage.

- The starter card line "deeper than Mandelbulber and Mandelbulb 3D reach" is removed: a claim with
  no source in the tree, and labels carry names and numbers only.
- The Camera plugin is not installed; saved places use one mechanism, the state library.
- Pause controls and the bucket renderer are not installed; the renderer keeps its own.
- Location thumbnails become 128 px JPEG (last week's PNGs are what filled the storage quota).
