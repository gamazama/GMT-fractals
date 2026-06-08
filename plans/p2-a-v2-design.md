# P2-A v2 — "select → reveal → place" (corrected design)

**Supersedes** the bottom-center bin-dock in `p2-a-implementation-spec.md`, which collapsed the
user-verified prototype model into a single bottom dock. This restores the prototype's
tab-anchored, two-level targeting (validated in `exec/p2-a-prototype` + `p2-drag-interaction-scope.md`),
built cleanly (the prototype was a throwaway visual sketch — this is the production version).

## Interaction model
- **Select:** click a **swatch** (Picker/Favients) → it **enlarges in place** + is the in-hand gradient.
  Click a **hero** (Generator/Image/Stops result) → selects, **no enlarge**. Click-empty / Esc → deselect.
- **Two target kinds, one look:**
  - **Intermediate** (anchored at a **mode tab**): keeps the gradient in hand and **reveals** its mode.
    Generator tab, Stops tab, Favients tab *(only while the shelf is hidden)*.
  - **Final** (anchored at the real destination, or the bottom row): receives the gradient. Generator
    **Slot A/B**, the **Stops gradient** (in-mode, register on mount), the **Favients shelf** (when
    visible), and bottom wells **Fullscreen / Export** (no natural anchor).
- **Click path:** intermediate tab → reveals mode (still in hand) → click a final → places. Visible
  final → places directly.
- **Drag path:** same targets; **~400 ms dwell** over an intermediate tab navigates in, then drop on a final.
- **Avatar:** a visual-only layer over the HTML5 drag — native drag image suppressed, the dragged ramp
  follows the cursor (via `dragover` coords). No drop logic; HTML5 stays the mechanism.

## Layering (clean)
- **Engine-core (generic):**
  - `(c) sendTargetRegistry` + **optional `getRect?: () => DOMRect | null`** (user-ratified additive
    amendment, mirrors `(b)`'s `render?`). `getRect` present ⇒ anchored dropbox; absent ⇒ bottom row.
  - One shared **`DropTarget` tile** (the look bottom wells + tab dropboxes share).
  - One **`DropTargetLayer`**: renders every `(c)` final target (anchored/bottom), handles click +
    HTML5 drop (host injects a `readDragPayload(dt)` so engine-core stays gradient-agnostic), arming,
    and hosts the avatar. Shows while a gradient is selected OR a matching drag is in flight.
- **Host (`gradient-explorer`):**
  - registers the final targets with `getRect` (slots/stops register on mount; Fullscreen/Export bottom);
  - renders the **intermediate tab dropboxes** over `data-gmt-mode-tab` (same tile), reveal-on-dwell/click,
    keeping the selection alive;
  - the receive-path wiring (`setConfig` / `sendRampToSlot` / `fitColorBoxFromRamp` / `add` /
    `openFullscreen`) is unchanged — it just sits behind `(c).apply`.
- Tabs are **host navigation**, never engine targets — engine-core never learns about "modes".

## Frozen-interface note
`(c) getRect?` is the single frozen-interface change — additive/optional/back-compatible. **User-ratified**
in-session (the authority for this stream); record as the (c)-amendment from `p2-drag-interaction-scope.md` §4.
