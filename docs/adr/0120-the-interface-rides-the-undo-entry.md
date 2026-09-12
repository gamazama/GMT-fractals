# ADR-0120: The interface rides the undo entry (Gradient Explorer v2 only)

- **Status:** Accepted
- **Date:** 2026-09-12
- **Relates to:** ADR-0119 (a save is drawn where it lands — the flash this unblocks);
  ADR-0114 (the shell's visual language); `store/slices/historySlice.ts` (grep
  `registerHistoryProvider`), `gradient-explorer/v2/uiHistory.ts`,
  `palette/store/paramUndoBracket.ts` (grep `paramEdit`),
  `gradient-explorer/v2/WorkingHero.tsx` (grep `onRevealGround`);
  guard: `npm run smoke:ge-uiundo`

> **Update 2026-09-12 (same day, the owner's test; decision unchanged, one rule added):** the
> first build of this stranded him. Every entry on the stack had been made while the Adjust face
> was open, so every undo restored that face while the working store's own provider kept walking
> the document back to nothing — ending on a face with nothing under it, over a wall the phone
> hides for a full-height face (`groundHidden`), with no older entry that remembered a closed
> tray to undo further into. **A face edits a document, so it may not be open when there is
> none** — see §5 below. The decision above is unchanged; this is the missing half of it.

## Context

ADR-0119 made a save visible by drawing it on the set chip that took the gradient. The open
item it left, raised with the owner the same day: **the rail can be covered.** A tray face
hangs over it, an Export window sits on it, and on a phone the chip run scrolls. When any of
those is true the ♥ files silently — the one thing that names the destination plays behind
something else.

Every obvious fix is worse than the problem. Moving the flash somewhere always-visible makes
it a toast, which is the thing the flash was written to replace. Refusing to file while
covered is absurd. Drawing a second announcement duplicates the first.

The owner's answer (2026-09-12) was to close the covering surface — and, in the same
sentence, the reason it is allowed: *"undo must save interface state … the current panel can
disappear, as it can be returned during undo."* A gesture may move the furniture if the
furniture comes back with one Ctrl+Z.

Two further facts shaped the scope. A ♥ was **not undoable at all** in the v2 hero: the
favients shelf rides Ctrl+Z through a registered history provider, but only inside a bracket,
and `toggleStar` never opened one. And app-gmt was ruled out by the owner — *"app-gmt is not
built in a way that UI undo would make sense"* — so this is a GE v2 decision, not an engine
one.

## Decision

### 1. Interface state is a history PROVIDER, not a new kind of undo entry

`historySlice` already carries non-engine-store state through `registerHistoryProvider`: a
provider's snapshot is captured when some other gesture opens a param transaction and restored
when that entry is undone. The v2 shell registers one (`gx-v2-ui`) for which face is open,
whether the hero is folded, and the two Export windows.

The consequence is deliberate and is the owner's own choice of the two readings: **opening a
face never pushes an entry of its own.** Navigation stays off the stack; Ctrl+Z does not become
a back button. What changes is that a gesture which edits something *and* moves the furniture
is undone as one act, furniture included.

### 2. A gesture may close a surface only inside its own bracket

`onRevealGround` (the shell) closes the tray face and both Export windows. It is called by the
♥ *inside* `paramEdit`, so the entry that carries the save also carries the surfaces. Outside a
bracket the same call would be a surface that vanishes and does not come back, which is why the
seam is a prop on the hero rather than something any component may reach for.

### 3. The close must be COMMITTED inside the bracket — `flushSync`, not a plain setState

This is the part that is not obvious and was wrong in the first cut. `paramEdit` closes its
bracket synchronously, and the bracket DIFFS the provider's snapshot when it closes. A plain
`setState` inside it is still pending at that moment, so before and after both read "the face
is open", the key is absent from the diff, and the entry carries the save without the surfaces.
Measured on the broken build: the ♥ undid the save and left the tray shut.

`flushSync(onRevealGround)` commits the close while the bracket is still open. It is load-bearing,
not defensive.

**The general rule, for the next caller:** a history provider reading React state can only
record a change the bracket can see. Either commit it synchronously, or keep that state
somewhere synchronous.

### 4. The scrolled-out chip is the rail's own problem

The third way a save could go unseen — the chip scrolled off the end of the phone's chip run —
is not a covering surface and does not want an undo entry. `SetRail` scrolls the flashing chip
into view, keyed on the flash's serial.

### 5. A face may not be open when there is no document (added the same day)

`input.kind === 'empty'` — the working pipeline's "nothing in hand" — closes the tray face.

Two things about the shape of this rule. It is a **render-time invariant in the shell, not a
clamp inside the restore**: the providers are applied in map order, so reading "is there a
document" from inside one of them is a race with the one that restores the document. Stated as
an invariant it holds however the state was reached, including routes that have nothing to do
with undo.

And the discriminator is `input.kind`, **not** `derived.empty`. The latter is also true for the
Image face with no image and a Mix with nothing in it — faces that must stay open and say what
is missing (L8). `kind: 'empty'` is set at boot and never again at runtime, so the invariant
bites in exactly one place: undone back past the first pick.

## Consequences

- The ♥ is undoable in v2 for the first time. Undo both un-files the gradient and reopens
  whatever the ♥ closed; redo re-files it and closes it again.
- A slider drag in the Adjust face, undone later, now also restores the face it was dragged in.
  That is the decision working as intended, and the first thing to look at if an undo ever
  feels like it moved more than it should.
- `registerHistoryProvider` is global but the registration is not: `useShellUiHistory` registers
  on mount and unregisters on unmount, so no other host carries the key. app-gmt is untouched.
- The provider's `capture` runs on EVERY `beginParamTransaction` while the shell is mounted. It
  copies four fields, so this is free — but a future author adding heavy state to that snapshot
  is adding it to every slider drag.
- The shell's UI state stays in `useState`. Moving it into a store would have removed the need
  for `flushSync`; that is a refactor in service of the mechanism and was not taken. If the
  captured set grows much beyond four fields, take it then.
- `smoke:ge-uiundo` guards the pairing, and each half separately: a build that restores the
  data and forgets the furniture fails [3] while passing everything else. Falsified four ways
  (see its header), including against the `flushSync` defect above and against §5 disabled —
  which fails [5] alone, with [1]–[4] green, the exact shape of the stuck state.
- §5 is the price of §1: putting the interface on the undo entry means undo can restore a
  surface into a world that no longer supports it. Any future state added to the snapshot needs
  the same question asked of it — what does this look like restored into a document that is not
  there any more?
