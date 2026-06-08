# P2-A — Canonical "Select → Act" via the lower-centre bin dock — IMPLEMENTATION SPEC

> **⛔ SUPERSEDED (2026-06-08).** The bottom-centre bin-dock model below was WRONG — it contradicted the
> user's verified prototype + `p2-drag-interaction-scope.md`. P2-A shipped the **tab-anchored
> "select → reveal → place"** model instead. **Use [`plans/p2-a-v2-design.md`](p2-a-v2-design.md)** as the
> source of truth. The §3 receive-paths + §6 frozen-interface notes here are still accurate; the §1–§2
> spatial model is not. Kept for the record.

**Date:** 2026-06-08  **Status:** ready for a fresh dev implementation session (read this in full first).
**Supersedes** the throwaway prototype on `exec/p2-a-prototype` (reference only — see §7).

This spec is grounded in the *actual* code (file:symbol pinned below). The prior prototype failed because it
invented a parallel component and didn't use the real receive paths. **Do not repeat that.** Read every file named
here before writing code.

---

## 1. The interaction model (user-verified)

Selecting **or** dragging a gradient reveals the **same set of available targets**, shown as **bins in the existing
lower-centre dock**. Click a bin (click path) or drop on a bin (drag path) to send the gradient there.

- **Click path:** click a gradient → it becomes the expanded selected card **and** the lower-centre bin dock appears
  showing all available target bins → click a bin → the gradient is sent to that target.
- **Drag path:** press-drag a gradient → the same bin dock appears → drop on a bin → sent there. (The drag avatar +
  the existing dwell mechanics are validated in the prototype and may be reused, but the **bins are the primary
  affordance**, not tab-lighting.)
- Click and drag are two inputs over **one** target set + **one** dock component.

> **Design note (flag if wrong):** this bin-dock model *replaces* the prototype's "tab-lighting + 3-click
> gradient→tab→result + dwell-to-cross-tabs." Each target is now a direct bin in the dock. If a specific in-mode
> sub-destination (e.g. choosing Generator Slot A vs B) needs the mode visible, confirm the desired behaviour with the
> user rather than guessing (default proposal: a single "Generator" bin sends to the next free / last-used slot, or the
> dock shows Slot A and Slot B as two bins — pick one and state it).

---

## 2. Reuse THIS component — do not invent a new one

**`components/DragWellsOverlay.tsx`** is the lower-centre bin dock (the "fullscreen dock" the user means). It renders,
while a drag is in flight, the registered drop-wells whose `accepts(types)` is true, as a row of `DefaultWellTile`
bins (`fixed inset-x-0 bottom-8 justify-center`, dashed rounded tiles, sky highlight on hover). Mounted once at
`gradient-explorer/GradientExplorerApp.tsx:364`. Backed by the **frozen (b)** kernel
`store/dropWellRegistry.ts` (+ `hooks/useDragInFlight.ts`).

**What must change (additively — do not break the frozen (b) signature or the existing Fullscreen well):**
1. **Show on SELECT, not only on HTML5 drag.** Add a transient "selected gradient" signal; the dock renders its bins
   when a gradient is selected OR a drag is in flight. (Mirror the transient `pickerSearch` store pattern for the
   selection state — it must survive the Picker desktop↔mobile remount, closing the known hero-blank-on-resize bug.)
2. **Bins must be CLICKABLE, not only droppable.** A click on a bin sends the *selected* gradient to that target
   (same code path as its `onDrop`). Today `DefaultWellTile` is drop-only.
3. **Register every real target as a bin** (§3), not just Fullscreen.
4. Keep the existing `DefaultWellTile` styling as the shared bin look (this is the "same style/ui component" the user
   asked for). If a richer bin is needed, extend `DefaultWellTile` / the `render?` hook — one component, styled in one
   place.
5. **The dock must not disappear** — verify the Fullscreen drag-open path still works after these changes.

> The frozen **(c)** send-target registry (`store/sendTargetRegistry.ts`, with the ratified optional `getRect?`) is the
> "proper" home for a unified target list and is the natural backing for both click + drag hit-testing. Decide during
> implementation whether to (a) register targets as **(b) drop-wells** (simplest reuse of `DragWellsOverlay` as-is) or
> (b) drive the dock from the **(c)** registry and have the wells wrap it. **Constraint:** ONE component renders every
> bin; ONE list defines the targets; do not fork. Record the choice in your summary.

---

## 3. The targets + their REAL receive paths (all already exist)

Register exactly these (Image is intentionally excluded — no destination). Each bin's action = call the receive fn:

| Bin | Receive path (file:symbol) | Notes |
|-----|----------------------------|-------|
| **Fullscreen** | existing well `gradient-explorer/FullscreenGradientOverlay.tsx:103` → `openFullscreen(config, name)` | keep as-is; it's the precedent |
| **Stops** | `palette/store/paletteEditorStore.ts` → `usePaletteEditorStore.getState().setConfig(config)` | loads the gradient into the Stops editor; bracket with `editorEdit*` for undo |
| **Generator slot** | `palette/store/generatorStore.ts:247` → `sendRampToSlot('A'\|'B', ramp, name)` (ramp = `renderStopsToRamp(stops,…)`) | Slot A/B are **drop targets**, not pre-filled previews — the prototype wrongly showed gradients in them |
| **ColorBox** | `palette/core/colorBoxFit.ts:79` → `fitColorBoxToRamp(ramp)` → feed into the generator (mirror `generatorStore.ts:309 fitColorBoxFromCatalog`) | ColorBox is a Generator sub-mode; "already prepared to receive" via this fit path |
| **Favients** | `palette/store/favientsStore.ts` → `useFavientsStore().add(config, name, source)` (mint name via `palette/core/facetName.ts rampToName` when anonymous) | save to shelf |

A gradient payload is `GradientConfig` (`{stops, blendSpace, colorSpace, …}`); `ramp = renderStopsToRamp(...)` where a
target needs an `RGB[256]`. The existing drag MIME is `FAVIENT_DND_MIME` (see `readFavientDrag` / `FullscreenGradientOverlay.tsx:106-108`).

---

## 4. Drag sources — every swatch/hero, not just the Picker

"Swatches from Favients and other heroes must carry the drag power too." Make **every** gradient surface a drag source
that emits the gradient payload (the `FAVIENT_DND_MIME` / `(b)` payload): the Picker wall swatches, the Favients shelf
swatches (already a source today), and each mode's result hero (Generator / Image / Stops / ColorBox results). Selecting
any of them also drives the same selected-gradient signal that opens the dock for the click path.

---

## 5. Rename + card

- Rename lives **only in Favients** (saved items). Heroes and swatches have **no** inline rename.
- On select, the source expands into the canonical hero card (enlarged preview, read-only name, the selection ring).
  This card is the single canonical hero reused across modes (the P2-A "canonical hero" deliverable).

---

## 6. Frozen interfaces — consume read-only

(b) `dropWellRegistry` + `DragWellsOverlay` + `useDragInFlight`; (c) `sendTargetRegistry` + `SendToMenu` (+ `getRect?`);
(a) document registry; (d) editor undo contract; (e)/(f) gradient+colour core. **Additive only.** If you believe a
frozen signature must change, STOP and raise INTERFACE-CHANGE-REQUEST — do not fork it.

---

## 7. The prototype — reference only, then retire

`exec/p2-a-prototype` (@ `7a1c061`, worktree `wt-p2a`) is a **throwaway**. **Validated there (reuse the ideas):** the
unified click/drag-reveal-same-targets model; dragging from a swatch; drag → dwell → Generator slot; narrowing to real
targets; removing rename from heroes; hiding Image. **Wrong there (discard):** a new `TargetDropbox` instead of
`DragWellsOverlay`; a dead click path; targets that lit up but didn't load (Stops/ColorBox); Slot A/B showing gradients;
the lower dock vanishing. Read its files only to mine the working drag/dwell mechanics, then the prototype branch is
retired.

---

## 8. Gates + working agreement

- Read first (in full): this spec; `components/DragWellsOverlay.tsx`, `store/dropWellRegistry.ts`, `store/sendTargetRegistry.ts`,
  `hooks/useDragInFlight.ts`; the 5 receive-path files in §3; the 5 source surfaces in §4; `plans/p2-scope.md` (P2-A/P2-C)
  + `plans/p2-drag-interaction-scope.md`; the FROZEN INTERFACES block in `plans/execution/execution-progress.md`.
- Gates: `npx tsc --noEmit` = 0; `npm run test:palette` green. The user does the visual verification — provide a precise
  click + drag walkthrough per target.
- Quality pass: `/code-review` + `/simplify` on your diff.
- Own a feature branch in its own worktree off current integration. Do NOT merge — the orchestrator merges on the user's
  visual confirm.
