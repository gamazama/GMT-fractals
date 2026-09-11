# ADR-0116: The colour picker on a phone, and without a screen pipette

- **Status:** Accepted
- **Date:** 2026-09-11
- **Relates to:** ADR-0115 (the shell on a phone — Phase F stopped at the tray's faces and
  did not reach the picker inside the inspector face); ADR-0114 (the shell's visual
  language); `components/EmbeddedColorPicker.tsx` (grep `narrow`, `surfacePx`, `ctrlBox`,
  `roomy`, `detailsChosen`), `components/gradient/pagePick.ts`;
  guards: `npm run smoke:ge-pagepick`, `npm run smoke:ge-tray`;
  measuring tool: `npm run shot:ge-picker`

## Context

Two defects, found on the same surface on the same day, with the same root: the picker was
drawn for one host and then mounted in three.

**It did not fit a phone.** The picker is container-responsive by design (a ResizeObserver on
its own root, not a media query) and that part worked — 390 px reads as the `stack` layout.
But GE v2's `soft` dialect, added later, laid its controls out in ONE non-wrapping row plus a
row of fixed-width blocks, and neither respected the layout branch. Measured in the phone
tray at 390 px (358 px inside): the top row ran off the right edge taking the MODE BAR with
it — the toggles that choose which controls you get were simply unreachable, so on a phone
you had whichever modes you had last chosen on a desktop and no way to change them. Below it,
a 210 px block and a 174 px block left a ragged gap, and the 150 px spectrum surface used
under half the width available while presenting a sub-fingertip target.

**Its pipette did nothing in Firefox.** "Pick from screen" is `window.EyeDropper`, which is
Chromium-only: Firefox has never shipped it, Safari has not either, and no mobile browser has
it at all. On those the button flashed amber and said "Eyedropper unsupported" — true, and
useless, since the colours a user wants are on the page in front of them.

## Decision

### 1. Narrow means "lay it out in a column", not "hide most of it"

At `stack` the soft dialect re-flows rather than shrinking: the hex line and the mode bar take
a row each and both wrap, every block goes full width in one column, the spectrum / wheel
surface grows into that width (capped, so the pads cannot push the channels out of the tray on
their own), the hue strip widens to a fingertip, and the chrome goes from 28 px boxes to 36.

Nothing a wide screen shows is hidden. It is the same picker, folded — which is the property
that makes it testable: `shot:ge-picker` reports anything laid out past the picker's own right
edge, and that list must be empty at every width.

### 2. "Am I cramped?" is the HOST's answer, not a measurement

The MINI fold — narrow opens on a 36 px hue×lightness pad, everything else behind a chevron —
was written for the dense dock, where narrow really does mean short. The phone tray is also
390 px wide and hands the picker ~600 px of height, where the fold spent 170 px and left the
rest black.

The picker cannot measure its way out of this, and the attempt is instructive: it sizes to its
content, and the tray's scroller sizes to the picker, so asked from the inside a folded picker
in a 609 px tray reports 104 px of room and correctly concludes it is cramped. Every fix from
the inside is a guess dressed as a measurement — walk up looking for a `max-height`, measure to
the viewport bottom, sniff the viewport width.

So the host declares it. `EmbeddedColorPicker` takes `roomy`, `AdvancedGradientEditor` passes
it through as `pickerRoomy`, and `WorkingHero` sets it from `useIsPhone()`. A roomy narrow
mount opens ONCE, and only if the user has never folded or unfolded the picker themselves — a
stored `'0'` is a choice and outranks any default, which is why the stored value is read as
"absent vs present" and not just as a boolean.

The name is deliberately about ROOM and not about phones: `components/**` should not carry
device language for one app's sake, and the next host with a tall narrow slot gets the same
behaviour by saying the same true thing.

### 3. Without a screen pipette, pick from the PAGE

`components/gradient/pagePick.ts` is the fallback: an overlay takes the pointer, the colour
under the cursor is read live into a follower chip, a click commits and Esc cancels. The
picker uses it only when `window.EyeDropper` is absent, so a browser that has the real one
keeps it.

It reads the topmost thing under the cursor: a 2D canvas via `getImageData` in backing-store
pixels, an `<img>` / `<video>` through a 1×1 scratch canvas, and otherwise the nearest
ancestor's computed `background-color`. In Gradient Explorer that is everything that matters —
the ramp, the wall, the curve plot, the source photo, the swatches.

The hit-test does NOT trust `elementsFromPoint` alone, and this is the part worth remembering:
it honours `pointer-events`, so every decorative canvas is invisible to it — and in this app
the decorative canvases are the whole point. The hero's ramp is `pointer-events-none` because
the knots below it need the clicks, so a straight hit-test walked past the gradient and
returned the page background (measured: #050505 off a ramp showing #EAEDF3). Each element of
the hit stack is therefore asked twice, top-down: does it CONTAIN a canvas or image covering
this point, and failing that does it paint a background of its own.

**The limit is stated in the UI, not hidden.** The native pipette reaches the whole screen;
this reaches the page. The button's title says which one you have, so the gesture never
promises more than it can do. A WebGL canvas without `preserveDrawingBuffer` reads back empty
and falls through to the background rule rather than returning a false black — GMT's own
render canvas is in that category, and in Chrome it has the native pipette anyway.

## Consequences

- The picker now has a fourth thing it responds to (`roomy`) beside its measured width. It is
  optional and defaults to the old behaviour, so every existing mount is unchanged — verified
  at 1280 px, where the layout is byte-for-byte what it was.
- `sampleStops`-style "just call the simple one in a loop" is not the only trap of its kind in
  this file; see ADR-0117 for the sampler one found the same day.
- The page-pick overlay is plain DOM with no React and no store, so it can be reused by any
  other surface that wants a colour off the page. Nothing does yet.
- Not addressed: the picker inside app-gmt's narrow dock still starts folded, because that
  host has not been asked whether it is roomy. That is the correct default, not an oversight —
  but it means the phone behaviour lives at exactly one call site, and a second phone host
  would have to opt in too.
