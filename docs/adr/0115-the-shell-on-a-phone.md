# ADR-0115: The Gradient Explorer v2 shell on a phone

- **Status:** Accepted
- **Date:** 2026-09-10
- **Relates to:** ADR-0114 (the shell's visual language — this answers the open question its
  Consequences left for Phase F); `gradient-explorer/v2/**` (grep `useIsPhone`,
  `PHONE_INSET`, `PHONE_TOOL`, `PHONE_GUTTER`, `stepZoom`); guard: `npm run smoke:ge-phone`

## Context

Phase F fitted the shell to a 390 px screen. The layout it started from was not merely
cramped — it was unusable in specific, measured ways: the hero's use cluster (♥ Share
Export Wallpaper) was clipped off the right; in Mix the name input painted over the state
chip; the set rail clipped past its 4th chip with no way to reach a 5th; the narrowing bar
needed 422 px in 390, which put the Filters button *underneath* the saturation strip where
it could not be tapped at all; the tray was 257 px wide with faces needing 888; and both
Export windows overflowed on both axes.

Everything below is the shape of the answers, not the answers themselves — those live at
their sites with their reasons beside them, per the navigation policy.

## Decision

### 1. The phone seam is the engine store's flag, and it is for STRUCTURE only

`gradient-explorer/v2/useIsPhone.ts` returns `useMobileLayout().isDeviceMobile` — the same
flag the old shell used, kept live by a module-level resize listener, and true for a coarse
pointer wider than 768 px as well as for a narrow window. Pure CSS differences use
Tailwind's `md:` / `max-md:` variants, which are the same 768.

Two mechanisms for one breakpoint is a cost, and it is paid because the store flag is not
readable from CSS and a media query cannot decide what to MOUNT. The rule that keeps them
from drifting into a third answer: structure on the hook, paint on the variant. The hook's
own JSDoc carries the reasoning; it is the single place to change the definition.

### 2. Tools go to a row along the bottom, and a control's place still says what it is

ADR-0114 rule 4 put the tools in a column down the wall's left edge and left Phase F to
decide the phone's form. The column's *reading* — "pick what your pointer does" — is not
phone-specific and survives. Its *position* does not: a phone's left edge is where the
thumb already is, so a column there covers the first column of tiles for the whole session.
The cluster becomes a row of 40 px buttons at the bottom-left, covering one row's end and
sitting where the thumb reaches.

Rule 4's corollary holds and was honoured: it stays ONE element carrying `data-gx-tools`,
so the click-away exemption that stops a stray pointerdown cancelling an active tool moves
with it.

The zoom TOOL is not offered on a phone — drag-to-zoom competes with the wall's own touch
panning — and is replaced by a − / + pair plus Fit. That needed a new instruction from host
to wall: `stepZoom(factor)` on `usePickerModel` → `zoomStep` on `PickerWall`, a rising
serial and a factor, shaped exactly like the existing reset signal because the reason is the
same: the wall owns the transform, so a host asks rather than sets.

### 3. Where there is no room for a surface, it moves — it does not shrink

Three surfaces changed place rather than scale:

- The **picture** leaves the hero. The card has no image column at 390, so `ImageSlot`
  splits: a 26 px DOOR in the header row (a thumbnail once an image is loaded) and the
  PICTURE inside the tray's Image face, full width. This breaks the slot's "never moves,
  never unmounts" rule, deliberately: that rule was about a card wide enough to hold it, and
  the model, the thumbnail and the path all live in `imageStore`, so nothing is lost.
- The **set rail's chips** become a horizontally scrolling run with the tools pinned outside
  it. A control you can scroll away from is a control you cannot find.
- The **Export window** becomes a full-screen sheet, and the `positionClass` its two hosts
  pass is ignored. Both hosts anchored a 360 px window in a corner and both ran off the
  screen; where it came from does not change the answer, so the branch lives in `ExportMenu`
  rather than as two `phone ?` strings at the call sites.

### 4. A cap is measured from the room below it, never as a `vh`

The tray and the Filters rows both cap and scroll. Both caps are measured from the element's
own top — `(innerHeight - top) * fraction` — the rule `ExportMenu`'s `maxH` already records.
Falsified again here: the Filters block's first cut was `max-h-[60vh]`, and at 844 px that
made header + hero + rail + bar + block = 939, leaving the wall **1 px tall**. Filters is
inline rows precisely so you can watch the wall answer them; a cap that hides the wall is
the popover it replaced, with extra steps.

### 5. On a phone the chip STATES and the title EXPLAINS

The state chip's second clause is an affordance hint — "live from Mix · cancel", "editing ·
return to source". At 390 px those ~60–110 px are the difference between a readable gradient
name and none at all (measured: with the full "editing · return to source" the name
collapsed to zero). The hint drops on a phone; the tap still does it and the title still
says so. Same rule behind "More like this" → "Similar" in that row.

### 6. Depth still means what a surface floats over

The hero panel's left shadow exists because the image column is the one side it has anything
under it. With no image column there is nothing for it to fall on, so on a phone it goes.
This is ADR-0114 rule 1 applied, not amended.

## Consequences

- **Desktop is pixel-identical**, and that was verified rather than assumed: seven
  1280×800 screenshots (boot, hero, three tray faces, Filters, Export) are byte-for-byte
  the same before and after, and every measured rect matches.
- **`npm run smoke:ge-phone`** pins the phone layout — no horizontal overflow, the Filters
  button actually tappable, a compact hero with its use cluster on screen, each tray face
  inside the viewport, the Export sheet, the tool row — and its last assertion boots a
  desktop context to prove the phone branch is gated and not global.
- **Two engine-shared files changed, both additively.** `ToastHost` adds
  `env(safe-area-inset-bottom)` to its bottom offset (it is `fixed`, so it sits outside any
  `MobileViewportShell` padding; `env()` is 0 everywhere else). `usePickerModel` gains
  `zoomStep` / `stepZoom`, which no other host bumps. `index.css` gains `.gx-rail-scroll`.
- **One thing the phase asked for was not done.** "More like this" was to become an icon;
  this icon set has no glyph meaning "rank the wall by likeness", and drawing one is the
  owner's call under ADR-0114 rule 3. It is the word "Similar" instead, ~46 px against a
  glyph's 26.
- **Not covered here:** the touch gestures inside the wall and the stops editor
  (`PickerWall`, `AdvancedGradientEditor`), which landed alongside this in their own pass.
