# P2-A — Picker selection + swatch enlarge-in-place (handoff)

**Branch:** `exec/p2-a` (worktree `wt-p2a2`). Read `plans/p2-a-v2-design.md` first.

## The problem (user-flagged)
The Picker now has **two conceptual selection states that get confused**, and **swatch
enlarge-in-place is not done**. They must be solved together.

1. **The wall's own selection** — `PickerWall` draws a cyan `strokeRect` on the swatch whose
   id == `selectedId` (`PickerWall.tsx:196–199`). It's a canvas-drawn ring.
2. **The shared `heroSelection`** — `mode:'picker'`, `key:entry.id`, drives the hero preview
   strip + the drop-target dock. `PickerStage` derives `selected` from it
   (`catalog.find(e => e.id === heroSel.key)`) and feeds `selectedId={selected?.id}` to the wall.

They're wired from the same source today, so they don't *diverge* — but there are now **two
visual languages** for "this is selected" (the wall ring vs the hero preview + dock), and the
intended **enlarge-in-place** would be a third. The user wants the swatch itself to **enlarge
in place** on select (the hero "does not enlarge"; swatches do).

## What "done" looks like
- **One selection model** = `heroSelection` (`mode:'picker'`). The wall ring, the hero preview,
  the dock, and the new enlarge all read it.
- **Enlarge-in-place:** the selected swatch grows in the wall. The wall is a **canvas** drawing
  from a shared `256×N` sprite into chunked, virtualized canvases (`PickerWall.tsx` +
  `wallLayout.ts`), so "enlarge one swatch" means the wall's draw must render the selected cell
  larger (and reflow/oversize-draw it) — NOT a CSS transform. This is the real work.
- **Favients swatches** (DOM, not canvas) also enlarge on select — easier (CSS scale on the
  selected swatch). NOTE: Favients click is currently **apply** (S2), drag selects; converting
  Favients click→select is its own decision (see design §6) and pairs with this.
- Decide the **ring's fate**: does the cyan ring stay as the selection treatment, or does the
  enlarge replace it? (Probably: enlarge + a subtler ring.)

## Pointers
- `gradient-explorer/PickerStage.tsx` — `selected` derivation (L~72), `onPick` (sets
  heroSelection), hero canvas (the preview), `selectedId` fed to the wall, the wall is NOT
  `data-gx-selectable` (so empty-wall click deselects — keep that).
- `palette/components/PickerWall.tsx` — the canvas renderer, `selectedId`, `strokeRect`
  (L196–199), `onEntryDragStart`, the sprite/chunk virtualization, `wallLayout.ts`.
- `palette/store/heroSelection.ts` — the transient store (the one source of truth).
- Drag from the wall already sets `heroSelection` + the avatar (drag mirrors select).

## Watch
- Keep the wall NOT `data-gx-selectable` (empty-wall click must clear).
- Selection survives the desktop↔mobile remount because it's in `heroSelection` (don't regress
  back to local `useState`).
- `heroSelection.key` must fully determine the payload (design §6 contract note).
