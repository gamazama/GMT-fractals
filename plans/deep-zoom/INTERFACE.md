# Deep Zoom - the interface as designed

Written 2026-10-07 on branch `deep-zoom-tool`, while the interface was being built by other
agents in the same tree. This file describes the design the build was briefed against. Where it
names a file, that file existed when this was written; whether each panel matches the brief line
for line was NOT checked here (UNVERIFIED as built). The core's behaviour quoted below is read
from `mandelbulb_deepzoom/index.html` (grep `HOST HANDLE`) and from `deep-zoom/bridge.ts`.

## Who it is for

1. **The newcomer** who has seen deep-zoom videos and wants to be inside one within a minute.
   Does not know W A S D flies, does not know what an iteration count is.
2. **The explorer** who already flies the standalone. Wants the picture, the depth, and nothing
   in the way. Runs detail high (up to 32).
3. **The video maker** who wants a path from the surface to a chosen depth, a preview, and a
   folder of frames with a known length and frame rate.
4. **The sharer** who finds a place at 1e-53 and wants someone else to stand in exactly that spot.

## Principles

1. **Depth is the one number.** Always on screen as mantissa-e-exponent (`6.40e-53`), with decades
   to the floor beside it. Never a bare bar, never the word "zoom".
2. **The picture is the hero.** One side panel at a time; overlays fade to 35% while the mouse is
   captured; H hides them.
3. **Moving within 10 seconds.** The f32 picture flies while the deep shader compiles, so loading
   is one slim line over the live picture, not a splash.
4. **Dive first, steer later.** The first action is one button that moves the camera for you.
   Nothing in the first run blocks input.
5. **Names and numbers only.** Labels are nouns, values carry units. No Low/High/Ultra. A cost is
   shown as a multiplier beside its control.
6. **Honest lines.** 1e-4 (f32 ends, perturbation begins), 1e-50 (certified to here), 1e-77
   (floor: the 256-bit reference ends). No target below 1e-77 is offered and nothing below 1e-50
   is called certified.
7. **A location is text.** Copy gives the exact view as JSON; paste restores it exactly; a failed
   paste changes nothing and says why.
8. **Nothing is lost.** Home and Back always work; the view is captured before every dive or jump.
9. **Seconds and fps in, frames out.** The frame count is derived and shown.
10. **Cheap before expensive.** Scrub, preview, small render, final render, in one panel.
11. **Measured, not guessed.** Time estimates come from frames this machine rendered.
12. **Never a control the core cannot honour.** If the bridge lacks the handle, the control is
    left out.

## The screen, part by part

The iframe fills the window. Everything else floats over it inside one shell root
(`deep-zoom/DeepZoomApp.tsx`) that is `relative isolate`, so stacking is local: gauge 10, top bar
20, side panel 30, onboarding and toasts 40. No raw z-index of 100 or more.

**Top bar** (`deep-zoom/ui/TopBar.tsx`) - one row, 36 px.
- Left: name, formula and live power; a state chip (FLY / DIVE / REC with a clock / PLAY /
  RENDER); an engine badge reading `f32` or `perturbation`.
  Why: the hand-over at about 1e-4 is the most interesting fact about the renderer and it is
  otherwise invisible.
- Middle: fps, frame size, iterations, and still progress (`still 23/64`) once the camera rests.
  During a render the middle becomes the render line with a Cancel button.
- Right: Home, Back, a Record button, and four text panel buttons.
  Why Home/Back sit here: at 1e-40 a wrong turn is easy and there is no landmark to fly back to.

**Depth gauge** (`deep-zoom/ui/DepthGauge.tsx`) - left edge, always visible.
- A readout block: depth in 20 px mono, decades to the floor (`77 + log10(depth)`), and
  magnification as `10^52.2`.
- A 56 px log scale from the surface to 1e-77 with a live marker. The stretch below 1e-50 is
  drawn fainter (flyable, not certified) and the last three decades are amber.
- A "Dive to 1e-" field (key J).
  Why: a deep zoomer's question is always "how far down am I and how far is left"; a log column
  answers both at a glance and makes the range itself the thing on show.

**Side panels** - right edge, 340 px, one open at a time, each with a Close button. They do not
close on a click outside (house rule in the owner's notes: no backdrop-click close).
- **Locations** (`deep-zoom/ui/LocationsPanel.tsx`, key 1): starter dives, My locations
  (bookmarks with thumbnails, stored in localStorage under `deep-zoom.locations.v1`), and
  Copy / Paste location.
- **Record** (`deep-zoom/ui/RecordPanel.tsx`, key 2): "Record a dive to ...", the loaded path
  with its depth curve, Preview, length and fps (frames derived), size and samples, Render, and
  the ffmpeg line with a Copy button. Brief defaults: 10 s, 30 fps, 1280 px, 4 samples = 300
  frames.
- **Look** (`deep-zoom/ui/LookPanel.tsx`, key 3): detail, reach, power, phase, colour mode and
  scale, gradient, light and falloff. These are the fields `__dz.settings()` reports.
- **Help** (`deep-zoom/ui/HelpPanel.tsx`, key /): the fly keys and the shell keys.

**Onboarding strip** (`deep-zoom/ui/Onboarding.tsx`) - one strip at the bottom centre, first run
only. It offers the one-click recorded dive and says the deep shader is compiling. It is not a
modal: clicking the picture and flying works at once.

**Toasts** - one line at the top centre for 3 s: depth milestones, "Location copied", "Saved".

**Keys.** The core keeps its own (W A S D Q E Shift fly, Esc, M record, X still, C colour, F G
detail, [ ] iterations, I, 9 0, L, - =). The shell adds 1 2 3 / for panels, B bookmark, J dive
field, H overlays, Home, Backspace. The shell listens on both the parent window and the iframe
window, because the iframe has focus while flying, and does not bind Esc.

## How the dive works (what the buttons actually do)

`__dz.diveTo(depth)` in the core flies straight ahead along the current look direction until the
surface distance is about `depth`. Read from the core:
- the target is clamped to no deeper than 1e-77;
- the pace is 0.4 s per decade, clamped to between 3 s and 16 s;
- each step moves at most 0.7 of the distance estimate, so the camera cannot pass through the
  surface;
- it gives up after 20 s (a ray that glances past the surface never arrives);
- any fly key or Esc cancels;
- it resolves with no value, so the shell reads the depth afterwards and reports "Arrived" or
  "Stopped at ...".

"Record a dive" is the same call wrapped in the core's recorder: start recording, dive, stop,
read the path back with `lastPath()` (embed mode suppresses the core's own JSON download).

## From never used it to frames rendering

1. Open the page. The picture is live; a slim line says the deep shader is compiling. The core's
   README gives about 5 s for that compile.
2. Click "Record a dive to 1e-30". The camera dives while recording (about 12 s by the 0.4 s per
   decade rule from a start near 1); the Record panel opens with the path loaded.
3. Click Render. The ZIP of PNG frames downloads.
4. Copy the ffmpeg line under the progress block.

Two clicks. UNVERIFIED end to end: this flow had not been run in a browser when this was written.

## The starter dives

Six cards in `deep-zoom/ui/starters.ts`. Each is a start view plus a straight-ahead target.

| Card | Target | Start view |
|---|---|---|
| Whole bulb | 1e-3 | first frame of the sample flight; works before the deep shader is ready |
| Surface | 1e-6 | same start; just past the f32 hand-over |
| Past f64 | 1e-15 | 10% into the sample flight |
| Grain of sand | 1e-30 | 50% into the sample flight |
| Certified edge | 1e-50 | 95% into the sample flight |
| Near the floor | 1e-75 | same start as the 1e-50 card |

The start views are frames copied from `mandelbulb_deepzoom/sample-flight.json` (1,291 frames).
Two things in that file are stated as `@assumption`, not fact:
- the "about how deep the start is" figures are estimates by position in the flight, not
  measured against the running renderer;
- each start view's forward ray is assumed to reach the surface. If one glances past, the card
  reads "Stopped at ..." after 20 s. The fix is data only: fly to a good view, copy the location,
  paste it into the file.

The "Past f64" card says it is deeper than Mandelbulber and Mandelbulb 3D reach. That claim is
not traced to a source in this worktree (UNVERIFIED) and should be checked or reworded before
the tool is public.

## Wanted, and not possible with today's core

Each of these was wanted by the design and left out because the core has no handle for it.

1. **Dive to where I click.** `diveTo` only flies straight ahead. There is no pick-a-pixel handle.
2. **A dive that reports why it stopped.** It resolves with no value; the shell infers arrival
   from the depth afterwards (within 3x of the target counts as arrived).
3. **Depth stored with each path frame.** Keyframes hold the camera, not the surface distance,
   so a depth curve for a loaded path must be measured or estimated. How `RecordPanel.tsx` draws
   it was not checked (UNVERIFIED).
4. **Scrub to frame N as a first-class call.** The core has play and render for a path; a cheap
   exact seek is the handle the engine timeline will also need (see `INTEGRATION.md`, `dzPath.u`).
5. **MP4 / WebM.** Path render is a ZIP of PNG frames; video needs ffmpeg afterwards.
6. **Undo for look changes**, and **scene files** that hold look + camera + path in one file.
   Bookmarks and paths are separate today (localStorage and JSON).
7. **GMT's gradient editor.** The core loads a gradient from an image; the engine's editor,
   Favients tray and "send to" target are level-2 work.
8. **Other formulas, non-integer power, Julia mode.** The kernel covers Mandelbulb at integer
   power 2-16 and phase. Julia mode in the standalone is UNVERIFIED.
9. **A certified badge below 1e-50.** The referees stop there; the gauge draws that stretch
   fainter and says so.
10. **Deeper than 1e-77.** The reference is 256-bit fixed point; a wider one is a core change.
11. **Shareable links.** A view is three ~77-digit integers plus about ten numbers, small enough
    for a URL, but nothing encodes one today; copy/paste JSON is the stand-in.
12. **Phone and touch flight.** The core's flight is pointer lock plus keys. Not designed here.
13. **Resume a cancelled render.** The design asks that a cancelled render keep its finished
    frames; whether the core's ZIP path does that was not checked (UNVERIFIED).

## What to check before calling it done

- Run the two-click flow in a real browser with a real GPU (the owner's notes say SwiftShader
  results are not to be trusted for render tests).
- Confirm each starter's forward ray arrives, and replace the estimated start depths with
  measured ones.
- Confirm shell keys work while the iframe has focus and the mouse is captured.
- Confirm nothing in the shell repaints while idle, so the still can converge (the owner's audio
  performance work found that a page repainting every frame stalls Chrome's GPU thread).
