# Critic: the deep zoomer and zoom-video maker

2026-10-07. Read: `plans/deep-zoom/INTERFACE.md` (whole), `plans/deep-zoom-shell/BLUEPRINT.md`
lines 160-515 (sections 3 end to 12; sections 1-2 only by grep), `DECISIONS.md` D3, D4, D9, D10,
D11, `ENGINE-GAPS.md` (table rows, truncated at 260 chars each). Last week's code read by grep and
targeted ranges, not top to bottom: `deep-zoom/DeepZoomApp.tsx` (key switch), `ui/DepthGauge.tsx`,
`ui/LocationsPanel.tsx`, `ui/RecordPanel.tsx`, `store.ts`. Engine files opened:
`engine/store/installStateLibrary.ts` (`SlotShortcutOptions`), `components/StateLibraryPanel.tsx`
(`StateLibraryPanelProps`), `engine/plugins/RenderDialog/ConfigForm.tsx` (by grep),
`public/deep-zoom-core/index.html` (`pathArc`, `easeInOut`). Nothing was run.

Verdict: the blueprint keeps depth on screen and keeps locations exact. It makes three things
worse than last week: keys while flying, the record-to-frames path, and the locations list. All
three are fixable inside the plan without a hand-rolled parallel.

---

## 1. WRONG - digits, Space and T become dangerous while the mouse is captured

Last week (`deep-zoom/DeepZoomApp.tsx`, key switch): `case '1': toggle('locations')`,
`'2': toggle('record')`, `'3': toggle('look')`. A stray digit next to W / Q opened a panel. Harmless.

Blueprint section 9 and DECISIONS D3: `1`..`9` recall a location slot, `Space` plays the timeline,
`T` opens it. Section 9 also says keyboard capture is "not switched on while flying".

So at 1e-50, left hand on W A S D Q E, a slip onto `1`, `2` or `3` teleports the camera. If `M`
recording is on, the jump lands inside the recorded flight. `Space` (thumb rest) starts the
timeline, and the `camera.u` subscription then calls `host.seekPath`, pulling the camera off the
spot. "Jump is one undo step" (section 6) recovers the view but not the converged still or the take.

The engine has no gate to hang this on: `engine/store/installStateLibrary.ts`
`SlotShortcutOptions` has only `count, category, saveModifier, savePrefix, recallPrefix` - no
`when`, no recall modifier.

Must change:
- Engine (small, generic): `SlotShortcutOptions.when?: () => boolean` and `recallModifier?`.
  Shell passes `when: () => !host.isCaptured() && !recording`. Add to ENGINE-GAPS as a "Now" row.
- Until then: `slotShortcuts: false` (the option exists, same file) and register the nine recalls
  in `deep-zoom/hotkeys.ts` with that `when`.
- `Space` and `T`: same `when` (not captured). Whether TimelineHost's own registrations accept a
  `when` from the app is unverified - I did not find where they are registered.
- The smoke must press `1` and `Space` with the pointer captured and assert the view string is
  unchanged.

## 2. WRONG - look keys that only work while captured are dropped to "panel rows"

INTERFACE "Keys": the core keeps `C, F G, [ ], I, 9 0, L, - =` (and the page has `T`/`Y`, `N`, `P`,
`R`, `V`, `, . ; '`). Blueprint section 9: "Dropped as keys, kept as panel rows: N, P, R, V, T/Y,
`, . ; '`, 9/0".

A panel slider cannot be reached while the pointer is locked. Tuning colour scale (`9`/`0`) and
lamp falloff (`T`/`Y`) while moving is how a deep zoomer finds the look for a depth: colour scale
has to change as you go down. With the blueprint I press Esc, drag a slider, click back in, and
the framing has drifted.

Must change: keep `9`/`0` (colour scale) and the falloff pair as shortcuts that write the DDFS
param, active when captured. This resolves with finding 1: digits recall slots only when NOT
captured; `9`/`0` step colour scale only when captured. If `T` stays the timeline key, move falloff
to a free pair, but do not remove it. `H` to `O` for overlays is an acceptable change; say so in
What's New.

## 3. WRONG - record, preview, render go from one panel to three surfaces, and two clicks become five or more

Last week, one panel (`deep-zoom/ui/RecordPanel.tsx`) held all of it:
- the depth curve as the scrubber: `aria-label="Depth along the flight; drag to scrub"`, Left /
  Right keys, Shift = 1 s, and a playhead line
  `'t ' + playT.toFixed(1) + ' s / ' + ... + ' · frame ' + playFrame + '/' + frames + ' · ' + fmtDepth(depthAt(playhead))`;
- `Go to start`, `Go to deepest`;
- length typed as seconds or m:ss, fps 24 / 30 / 60, `frames = Math.max(2, Math.round(seconds * fps))`;
- `rate = decades / seconds` (decades per second of the whole flight);
- long edge 320..7680 and samples; an estimate BEFORE the render, scaled from the nearest finished
  render at the same detail; a detail >= 16 cost line;
- cancel with a confirm: "The finished frames are saved as a partial ZIP";
- the ffmpeg line with Copy.

Blueprint section 8: Record / Smooth / Preview and the depth curve in the Flight panel (left
dock); "scrubbing -> the timeline" (bottom); render in the RenderDialog, which ENGINE-GAPS E22
says "can only be opened from the timeline toolbar". The INTERFACE two-click flow ("Record a dive
to 1e-30", then Render) becomes: record, open timeline, Render, set size, start.

What the generic pieces do not carry (checked):
- The timeline ruler shows frames, not depth. Nothing in section 8 says the depth curve in
  `dz-flight-strip` is still draggable or still shows depth at the playhead.
- `engine/plugins/RenderDialog/ConfigForm.tsx` has `cfg.width` and `cfg.height` fields, `bitrate`,
  `samplesPerFrame`, and a `Duration` line. A grep of that file for `estimate` returns nothing;
  `RenderingView.tsx`'s header says ETA is shown in progress. So the before-you-commit estimate is
  gone unless the shell puts it back. (Full body of ConfigForm unread.)
- Long edge becomes width x height. For a renderer that draws at the window's aspect this invites
  a mismatched pair. Whether the dialog can be given one field is unverified; `resolutionPresets`
  is an option (`ConfigForm.tsx` line 44), so presets derived from the surface aspect are possible.

Must change:
- `dz-flight-strip` stays the cockpit, not a launcher. It keeps: the draggable depth curve bound
  two-way to `camera.u`; the playhead line with depth; Go to deepest; length in seconds (writes the
  timeline length and rescales the keys); decades per second; the pre-render estimate; and a
  Render button. E22 (`openRenderPopup()`) is therefore required at the stage the strip lands, not
  optional.
- RenderDialog configured with `resolutionPresets` computed from the surface aspect (720 / 1080 /
  1440 / 2160 long edge), defaults 10 s, 30 fps, 4 samples as INTERFACE's brief.
- The PNG ZIP entry (D11 option A) keeps the partial-ZIP-on-cancel wording and the ffmpeg line.
  Lossless frames are the master for a zoom video; MP4 from the dialog is the convenience.
  What a cancelled MP4 leaves on disk is unverified.
- The tutorial's last step ("Record a dive to 1e-30") must end with the Flight panel active and
  Render one click away.

## 4. WEAK - the default speed curve is unstated, and it is the number a zoom video is judged on

`public/deep-zoom-core/index.html` `pathArc`: segment length is
`(ks[i].move||0) + 0.6*(ks[i].rot||0)` with the comment "depth-relative distance + turn". So equal
steps of `u` are equal steps of zoom: a straight line in `camera.u` is a constant number of decades
per second. Good - that is what zoom videos want.

Last week's preview and render applied `easeInOut` (smootherstep); `RecordPanel.tsx`'s header says
"the middle runs at about 1.9x" the average. Blueprint section 8 says "two Bezier keys ... The ease
is the keys" without saying which shape, and the interim (`__samplePath` by time) is neither.

Must change: state the default (I want linear with a short ease at each end, so decades per second
is flat through the body); the strip shows decades per second read from the actual key curve at
the playhead, not `decades / seconds`; and the page's own `easeInOut` must be off when the timeline
drives `u`, or the ease is applied twice. That last point is unverified in the blueprint - section
8 does not mention it.

## 5. MISSING - the locations list loses depth ordering and the depth on each row

Last week (`ui/LocationsPanel.tsx`): `// Shallow to deep; locations with no recorded depth go last`
followed by a sort on `-Math.log10(b.depth)`; default name `'View ' + formatDepth(depth)` with a
two-decimal mantissa; `goTo(b, view, keepLook)` let a jump keep the current light and colour;
paste accepted "a location object, a bare view, a bookmark, or an array of any of them";
`Export all (JSON)` wrote a file "thumbnails left out".

Blueprint: `dz-locations` is the engine's `<StateLibraryPanel>`; default label `1e-41`.
`components/StateLibraryPanel.tsx` `StateLibraryPanelProps` (lines 47-92) has `onRename`,
`onReorder`, `presets`, `toolbarBefore/After`, `footer` - no sort and no per-row secondary text.
So order is by hand, and once I rename a row "seahorse arm" its depth is no longer shown anywhere.
The label also drops the mantissa (`1e-41` against `6.40e-53`).

Must change:
- Engine, on the master panel (generic): an optional `renderMeta?: (snap) => ReactNode` second
  line, and an optional `sortBy` comparator that disables drag-reorder while set. The shell passes
  depth for both. This is "improve the master", not a parallel list.
- Default label keeps the mantissa: `6.40e-53`.
- `jumpTo(loc, { keepLook })` stays; the blueprint's `jumpTo` always applies the look.
- The paste parser keeps accepting last week's shape (numeric `depth`, flat `iters / power / phase /
  light / falloff / color / cscale / surf` beside `cam`), since those texts have already been
  shared. The blueprint imports the old localStorage rows once but says nothing about pasted text.
- Export all without thumbnails stays in `dz-location-text`; a scene file carries the thumbnails
  and is the wrong size to post in a chat.

Note: INTERFACE names the storage key `deep-zoom.locations.v1`; the code (`deep-zoom/store.ts`
`BOOKMARKS_KEY`) is `gmt.deepzoom.bookmarks.v1`. The blueprint uses the code's key - correct.

## 6. MISSING - instrument lines that were always visible are now behind tabs or not listed

- `ui/DepthGauge.tsx` shows `{rate > 0 ? 'falling' : 'rising'} {absRate.toFixed(1)} decades/s`, a
  yardstick line, and `Diving · <from> to <target>`. Blueprint section 5's Depth readout row lists
  depth, decades to the floor, magnification and the dive field only. Decades per second is how I
  pace a manual dive for recording; keep it.
- INTERFACE top bar middle: "fps, frame size, iterations, and still progress". In the blueprint,
  iterations live in `dz-iteration-readout` (Formula tab) and frame size in `dz-frame-readout`
  (Quality tab) - visible only when that tab is the active one in its dock. Put live iterations
  and drawn size in the status chip or a HUD line. fps: section 1 says TopBar carries it (read by
  grep only).
- Depth milestone toasts (`DepthGauge.tsx` `MILESTONES`, `milestonesSeen`): a grep of the blueprint
  for "milestone" returns nothing. Small, but it is the tool telling me I crossed 1e-50.

What holds: depth is in the HUD, the top-bar chip and the scale, and the chip survives overlays
None (section 5). The 35 percent fade while captured is kept (section 10). Good.

---

## What the engine's pieces give me that last week's tool could not

1. Two panels at once. Last week was "one open at a time" (INTERFACE). Docked Light on the right
   and Flight on the left while I look at the picture is a real gain.
2. Look values on the timeline. Every DDFS param is keyable, so colour scale and light can change
   along a 77-decade dive. Last week a flight had one look from top to bottom.
3. The graph editor for the speed curve: slow down at a feature, speed through a dull stretch,
   with extra `camera.u` keys.
4. Undo for look and for jumps; one scene file (and a PNG) holding look, camera and flight.
5. A share link (INTERFACE item 11 listed it as not possible).
6. MP4 / WebM without ffmpeg, once the page has handle H4.
7. The gradient editor and My Gradients in place of "load a gradient from an image".
8. Typed number entry on every param through the engine's sliders (not opened in this pass -
   unverified).
