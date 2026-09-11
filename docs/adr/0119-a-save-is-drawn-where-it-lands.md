# ADR-0119: A save is drawn where it lands, and a shared set has to invite you

- **Status:** Accepted
- **Date:** 2026-09-11
- **Relates to:** ADR-0114 (the shell's visual language); `gradient-explorer/v2/setSaveFlash.ts`,
  `gradient-explorer/v2/contributeToGlobal.ts`, `palette/core/gradientCss.ts`,
  `index.css` (grep `set-save-out`), `gradient-explorer/v2/SetRail.tsx` (grep `flightCss`,
  `savedHere`), `gradient-explorer/v2/BrowseStage.tsx` (grep `onGlobalGround`);
  guard: `npm run smoke:ge-setsave`

## Context

Filing a gradient was a silent success. A drop on a set's chip moved a count up by one; the ♥
in the hero did the same thing at the other end of the screen and said so with a toast in a
corner nowhere near the chip that took it. Neither told you WHICH set had it, and neither was
any fun — the owner's word, and the right one for the gesture a person repeats most in this app.

The shared set had the sharper version of the same problem: the only way to contribute to
GX global was to drag a gradient onto its chip. A gesture you have to already know about, on
the one set whose entire premise is that strangers add to it.

And the export window asked which face of the gradient to export — Ramp or Swatches — with two
text pills, which is a question about pictures answered in words.

## Decision

### 1. The chip that takes a gradient shows the gradient

While one is in flight the chip under the pointer fills with it, so the drop is aimed at a
picture of what you are giving it. On the save the fill collapses to the chip's own centre line
and goes, and the label lights through it.

The hover half needs no state: what is in flight is already published by
`palette/store/dragVisual.ts` for the cursor avatar (the DataTransfer's data cannot be read
during a dragover, which is why that module exists). `setSaveFlash.ts` is only the announcement
of a completed save.

Two speeds, because the two gestures are not the same act. A DROP already carried the thing
there, so its flash is quick confirmation. The ♥ is one click a long way from the rail and its
flash is the ONLY thing naming where the gradient went, so it runs slower, with a white bloom,
and has time to be noticed at the other end of the screen.

### 2. The ♥'s target is OBSERVED, not computed

The ♥ does not name a set — it adds to Recent, which the rail renders as bins whose ids depend
on the day and on how the blocks fell. Reconstructing that id at the call site would be a second
implementation of `listGroundSets`'s binning: correct until the day the binning changes.

So `flashSaveWhereItLanded` snapshots every set's count, runs the write, and flashes the set
that grew. Nothing grew (a ♥ that un-kept, a no-op) means nothing to announce, which is also
right.

### 3. The shared set carries its own invitation

While GX global is the ground, the narrowing bar holds a "Share your gradient" button, and its
empty state offers the same thing in a sentence. Both routes — the drag and the button — go
through one `contributeToGlobal`, so they cannot come to promise different things; it lives in
the app rather than in `palette/core/globalSet.ts` because it is the GESTURE (confirm, toast,
refresh), not the transport.

### 4. The export subjects are the two pictures you are choosing between

Ramp and Swatches are full width and painted with what they export: the ramp continuous, the
hero's own palette in hard steps. A SET gets plain text instead — painting one gradient's
colours on a button that exports sixty would be a picture of the wrong thing.

The label sits in a pill rather than over a scrim across the whole segment. A full scrim was the
first cut and it ate the picture: over a near-white gradient both faces came out the same grey
and the choice was two words again. The unchosen face is dimmed instead.

`palette/core/gradientCss.ts` holds the ramp→CSS and swatches→CSS helpers, because the set-chip
fill was about to be a copy of the export window's. It is explicitly NOT byte-exact with the
texture renderer and says so: it is for showing a gradient, never for deriving a colour.

## Consequences

- `smoke:ge-setsave` watches the fill's transform MATRIX shrink between two samples. Its first
  cut asserted a resolved `animation-name` and stayed green when the `@keyframes` block was
  deleted — `getComputedStyle` reports the name a rule declares whether or not any keyframes of
  that name exist. That is the trap for the next animation guard written here.
- The keyframes live in `index.css` with the other shared utilities, and their DURATION is
  passed in from TS as `--save-ms` because `setSaveFlash` also has to know when to stop
  announcing the save. Two copies of one number would drift.
- A gradient in flight now paints on hover only over chips that could actually TAKE it (a group
  or the shared set). The catalogue and the dated bins are not drop targets, and offering them a
  fill would promise a save that will not happen.
- Not addressed: the drop path's flash is unguarded — `smoke:ge-setsave` drives the ♥, because
  HTML5 drag-and-drop is not scriptable through Playwright's mouse. The two paths share
  `flashSetSave`, so what is proven is the animation, not the drop's own call to it.
