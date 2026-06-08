# P2-A v2 — "select → reveal → place" drop-target system

The Gradient Explorer's gradient routing: select a gradient (swatch / hero), then send it
to a destination by **click** or **drag** through the same lit dropboxes. Supersedes the
bottom-center bin dock in `p2-a-implementation-spec.md` (which collapsed the user-verified
prototype model). Built clean — the prototype on `exec/p2-a-prototype` was a throwaway sketch.

Branch `exec/p2-a` (worktree `wt-p2a2`), off integration `90206c6`. Gates: `tsc 0` +
`test:palette` green.

---

## 1. Interaction model

- **Select:** click a **swatch** (Picker/Favients) or a result **hero** (Generator/Image/
  Stops) → it becomes the in-hand gradient. Click empty / Esc → deselect. A drag also
  selects (so the avatar has a ramp; released over nothing, it stays selected).
- **Targets, two kinds, one tile:**
  - **Final** — receives the gradient. Anchored over its element (Generator A/B slots,
    ColorBox, the Stops strip, the Favients shelf) or, with no anchor, a **bottom-row well**
    (Fullscreen, Export).
  - **Intermediate** — *reveals* a surface and keeps the gradient in hand. Derived, not
    hardcoded (§3): a mode tab, or the Generator's Mixed/ColorBox sub-mode switch.
- **Click path:** click an intermediate → it reveals → click the next intermediate or the
  final. **Drag path:** ~400 ms **dwell** over an intermediate reveals it mid-drag; drop on
  the final. **Chains to any depth** (ColorBox = Generator tab → ColorBox sub-mode → final).
- **Avatar:** a cursor-following ramp painted while dragging (native drag image suppressed
  at the source). Visual only — HTML5 is the mechanism.

## 2. Architecture (layering)

**Engine-core (generic):**
- `(c) sendTargetRegistry` — the single target list, additively amended (all optional,
  user-ratified this session):
  - `getRect?(): DOMRect | null` — anchor; resolves ⇒ anchored dropbox, absent ⇒ bottom
    well, returns null ⇒ hidden (host shows an intermediate).
  - `revealPath?: string[]` — ordered opaque reveal-step ids to bring the anchor on screen.
  - `acceptsTypes?(types): boolean` — drag-time visibility (twin of `accepts(payload)`,
    usable while `getData` is blocked).
- `components/DropTarget.tsx` — the ONE shared dropbox tile (look + states; opaque/translucent,
  label/no-label, armed, dwell ring).
- `components/DropTargetLayer.tsx` — renders the FINAL targets (anchored via `getRect`,
  else bottom row); click applies the selection, drop applies the dragged payload (host
  injects `readDragPayload` so engine-core stays gradient-agnostic). The `(b)` HTML5 kernel
  + `DragWellsOverlay` are untouched (file-drop / other hosts).

**Host (`gradient-explorer`):**
- `gradientTargets.ts` — registers the finals declaratively at boot with the real receive
  paths (`sendRampToSlot` / `fitColorBoxFromRamp` / `setConfig` / `add` / `openFullscreen`
  / PNG export). Owns the **`REVEAL_STEPS`** graph (tab + Generator sub-mode steps) and
  `deriveIntermediates()`.
- `GradientDropLayer.tsx` — composes `DropTargetLayer` + the derived intermediate dropboxes
  (dwell/click) + the avatar. Mounted once in `GradientExplorerApp`.

## 3. Data-driven topology (NON-HARDCODED — load-bearing invariant)

There is **no tab→targets map**. A target declares `getRect` (a `data-gx-target` DOM query)
+ an ordered `revealPath` of step ids. `deriveIntermediates()` walks each *hidden* target's
path and surfaces the **first unsatisfied step**, deduped by id. A reveal step
(`REVEAL_STEPS[id] = { getRect, isActive, activate }`) is a host nav primitive (a tab; a
Generator sub-mode). So **adding a target anywhere — even several steps deep — auto-populates
its final dropbox and its whole intermediate chain with no further wiring.**

Examples: ColorBox = `['tab:Generator','gen:colorbox']` (two reveals). The A/B slots =
`['tab:Generator','gen:mixed']` (so they're reachable again from ColorBox mode, where they
unmount). Fullscreen/Export = no `revealPath` (always-available bottom wells).

**Anchor tags:** dock tabs `data-gx-mode-tab="<PanelId>"` (engine `Dock`); destinations
`data-gx-target="<id>"` (slots, Stops strip, Favients shelf, ColorBox controls); sub-mode
switches `data-gx-step="<id>"`.

## 4. Visual spec
- **Cyan dashed outline** on every dropbox; armed brightens + glows.
- **Only bottom wells are opaque** (no element under them). Anchored/intermediate tiles are
  **translucent** so the tab / slot / strip underneath reads through (and `hideLabel`, so no
  text-on-text).

## 5. Behaviour notes
- **Session end:** a drop does not `stopPropagation` (so `useDragInFlight` resets), and the
  host clears the selection on `drop`/`dragend` — dropboxes hide once the gradient lands
  (incl. the cross-tab source-unmount case).
- **Click-away cancel:** a window `pointerdown` clears the selection unless it lands on a
  dropbox (`data-gx-keepselect`) or a selectable hero (`data-gx-selectable`). The Picker
  wall is intentionally NOT selectable, so empty-wall clicks cancel.
- **Perf:** a 60fps rAF runs only during a DRAG (dwell + moving rects); SELECT-mode refreshes
  on scroll/resize only (a select-mode rAF was fighting the dropbox hover).
- **Favients coexistence:** the `favients` save-target stands down for an already-favourite
  (`accepts: !favId`) and during the shelf's internal reorder (`acceptsTypes`: no
  `FAVIENT_INTERNAL_MIME`), so the panel's own reorder / grouping / trash DnD keeps working.

## 6. Open / deferred
- **Picker has two selection concepts now** (the wall's own selected-swatch + the shared
  `heroSelection`) and they get confused. **To be resolved together with swatch enlarge-in-
  place** — see the Picker handoff (end-of-session protocol).
- **Swatch enlarge-in-place** (Picker canvas wall + Favients DOM swatches) — not yet done.
- **Favients click = select** — currently click = apply (S2 intact), drag selects.
- **Mobile** — anchors are on the desktop dock tabs; the mobile tab bar isn't wired.

## 7. End-of-session protocol (user-set)
Once visual verification/iteration is complete: **code review → simplify → document →
commit → discuss Picker → hand off Picker.**
