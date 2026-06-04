# Picker — Selection Filtering (handoff prompt for next session)

> Paste this whole file as the opening prompt. It contains the feature spec, the current
> architecture, the proposed plan, the exact integration points, gotchas, and how to test.
> App: **GMT Gradient Explorer** (`dev/` workspace). The Picker wall = the big scrolling
> grid of gradient swatches.

---

## 1. The feature (what the user asked for)

Add **spatial selection filtering** to the Picker wall:

- The Picker's **hero header** gets a small row of **selection tools: Lasso · Rect · Paint**.
- With a tool active, the user **draws a selection on the wall** (the swatch grid):
  - **Rect** — drag a rectangle.
  - **Lasso** — freehand polygon (drag a path, auto-closed on release).
  - **Paint** — a brush; swatches the cursor passes over get marked.
- Once a selection exists, the user **clicks inside or outside** it to choose which half to **keep**; the rest is **deleted** (filtered out of the wall):
  - Click **inside** → keep the swatches inside the selection, drop the rest.
  - Click **outside** → keep the outside, drop the inside.
  - **Dimming makes it obvious**: while hovering inside vs outside (before the click), the
    half that would be **deleted is dimmed** so the user sees the outcome live.
- **Cancel** the in-progress selection via: **right-click**, **Esc**, or **clicking any
  non-canvas UI** (dock, hero, topbar). Cancel discards the selection, changes nothing.

This is a *carve* tool: repeatedly selecting narrows the visible set. There must be a way
to **clear** the selection filter and get the full (quality/theme/bundle-filtered) wall back.

---

## 2. Where things live (verified file map)

| Concern | File |
|---|---|
| Hero header + groups/filtering pipeline + sprite build | `gradient-explorer/PickerStage.tsx` |
| The wall: layout, swatch canvases, hit-testing, zoom/pan, hover | `palette/components/PickerWall.tsx` |
| Catalog data + entry shape (`CatalogEntry`) | `palette/core/presetCatalog.ts` |
| Loaded catalog store (`catalog`, `load`) | `palette/store/pickerStore.ts` |
| Facet filter windows (`passesFilters`, `FilterWindows`) | `palette/core/facets.ts` |
| Picker DDFS slice — where per-control SELECTION state belongs | `palette/features/paletteFilters.ts` |
| Dock controls (theme chips, source toggles) | `palette/components/PickerControls.tsx` |

### Key data shapes / flow you must know

- **`CatalogEntry`** (`presetCatalog.ts`): `{ id: string; name; bundle?; theme?; facets; ramp: Uint8Array(256×4); row: number; ... }`.
  - `id` is the **stable identity** — use it for the kept-set (survives zoom/scroll/sort/regroup).
  - `row` = the entry's row in the shared 256×N sprite (rebuilt by pickerStore on catalog change).
- **PickerStage filtering** (the load-bearing `useMemo` in `PickerStage.tsx`, ~lines 98–156):
  ```ts
  const list = catalog.filter(e =>
    (!hiddenSet.size || !e.bundle || !hiddenSet.has(e.bundle)) &&
    (!themeSet || (e.theme != null && themeSet.has(e.theme))) &&
    passesFilters(e.facets, windows)
  );
  // …then grouped (Category/Source), bucketed into sub-rows, sorted → PickerGroup[]
  ```
  **This is the single choke point** the selection filter hooks into: add
  `&& kept.has(e.id)` when a selection filter is active. `kept` = `Set<string>` of entry ids.
- **PickerWall → PickerGroup[]** (`PickerWall.tsx`): groups render as chunked `<canvas>`
  sheets. **Hit-test** is per `SwatchCanvas`: `col = floor((x−rect.left)/cellW)`,
  `row = floor((y−rect.top)/cellH)`, entry index `k = col*nrows + row`
  (column-major). `cellW = swatchW+gap`, `cellH = swatchH+gap`. Screen→entry mapping uses
  `getBoundingClientRect` so it's correct at any zoom/scroll.

### The existing wall pointer interaction (DON'T break it)

`PickerWall.tsx` already owns pointer gestures on the scroll container:
- **Left button** → currently falls through to each `SwatchCanvas`'s `onClick` (pick a
  gradient) / `onMouseMove` (hover preview) / `draggable` (drag into Favients).
- **Middle-drag** → **zoom** (live GPU transform on `contentRef`, commit on release).
- **Right-drag** → **pan**; **middle-click** → reset zoom.
- Hover is suppressed mid-drag via `dragging.current`. Off-screen chunks unmount (windowing).

Selection must **co-exist**: when a tool is active, **left-drag draws the selection**
(instead of pick/Favients-drag), and **right-click (no drag) cancels** while **right-drag
still pans**. Middle = zoom unchanged.

---

## 3. Proposed implementation

### 3a. State — where the kept-set lives
Put the selection-filter state in the **`paletteFilters` DDFS slice** (it already holds
`activeThemes` / `hiddenBundles`; the file's own comment says per-control selection state
lives there). Add:
```ts
state: {
  activeThemes: [] as string[],
  hiddenBundles: [] as string[],
  keptIds: null as string[] | null,   // null = no selection filter; else the surviving ids
}
```
- `keptIds === null` → wall shows the full quality/theme/bundle-filtered set.
- After a carve, `keptIds` = the surviving ids (intersected with the previously-kept set →
  progressive carving).
- Provide a **clear** affordance (hero "×N kept · clear", or a button) that sets `keptIds = null`.
- The DDFS setter is `set{Feature}` i.e. `setPaletteFilters({ keptIds })` (see how
  `PickerControls.tsx` calls `setPaletteFilters`). Persist? The other filter state isn't a
  hard requirement to persist; **recommend NOT persisting keptIds** (it's a transient carve;
  a stale id-set after a catalog reload is confusing). Confirm with user.

PickerStage reads `pf.keptIds` and applies it in the `list` filter:
```ts
const kept = pf?.keptIds ? new Set(pf.keptIds) : null;
const list = catalog.filter(e => /* existing */ && (!kept || kept.has(e.id)));
```

### 3b. Tool mode + selection geometry (in PickerWall)
Add props to `PickerWall`:
```ts
selectionTool?: 'lasso' | 'rect' | 'paint' | null;
onSelectionCommit?: (keptIds: string[]) => void;   // the ids to KEEP after a carve
onSelectionCancel?: () => void;                     // user cancelled / tool should clear
```
Internal selection state machine (refs + a little React state for the overlay):
1. **idle** (tool active, nothing drawn).
2. **drawing** — left-pointerdown starts; pointermove builds the shape:
   - rect: track start + current corner.
   - lasso: push points (throttle ~every few px).
   - paint: accumulate the set of swatch ids the brush (a radius around the cursor) covered;
     paint can commit-on-release directly OR also use the keep-inside/outside step. The user
     described keep-inside/outside generically — apply it to all three for consistency:
     paint produces a region (the painted swatches) → that's the "inside" set.
3. **chosen** — on pointerup, the shape is fixed. Compute the **inside set** = entry ids whose
   swatch center is inside the shape (rect contains / point-in-polygon for lasso / the painted
   set for paint). Now show the **dim preview** and wait for the keep click.
4. **keep click** — next left-click: if the cursor is **inside** the shape → keep inside set;
   if **outside** → keep the complement (visible ids − inside set). Call
   `onSelectionCommit(keptIds)`. For paint, "inside/outside" = over a painted swatch or not.
5. **cancel** — right-click (no drag) / Esc / pointerdown outside the wall → `onSelectionCancel()`
   and reset to idle.

**Computing the inside set** (the important bit): you need every *currently-rendered*
swatch's screen rect + its entry id. Build this at "chosen" time by walking the mounted
`SwatchCanvas`es. Two options:
- (Simpler) Give each `SwatchCanvas` the slice of entries it drew + its `getBoundingClientRect`,
  and a method to map a screen point → entry, reusing the existing `hit()` logic. To test a
  whole shape, iterate the shape's bounding box in `cellW/cellH` steps and hit-test centers, or
  iterate each canvas's entries and compute each swatch center `(rect.left+col*cellW+cellW/2,
  rect.top+row*cellH+cellH/2)` then test against the shape.
- Expose a `selectionApiRef` (imperative handle) from PickerWall that, given a shape, returns
  the inside ids by iterating visible chunks. Keep the geometry math (point-in-rect,
  point-in-polygon) in a small pure helper (`palette/core/selectionGeometry.ts`) so it's unit-testable.

**Only visible swatches can be selected** (off-screen chunks are unmounted by the windowing).
That's acceptable for v1 — you carve what you can see. Note it in the UI/docs. (A future
version could pause windowing during a selection, or compute purely from the layout model.)

### 3c. The dim overlay
- Render a selection overlay **inside the scroll container** (sibling to the content wrapper,
  above the swatches): an SVG/canvas/div drawing the rect outline / lasso path / paint marks.
- For the **dim**: overlay a semi-opaque scrim (`bg-black/55`) over the half that will be
  **deleted**. While in "chosen" state, hovering inside vs outside flips which half is scrimmed.
  - Easiest: two scrim layers using CSS `clip-path` (the shape) — scrim-the-outside vs
    scrim-the-inside, toggled by where the cursor is. Or draw the scrim on a canvas with the
    shape punched out (`globalCompositeOperation`).
- The overlay must track scroll (it's inside the scroller) and not intercept the keep-click
  incorrectly (use `pointer-events: none` on the scrim; the keep-click is handled by the
  scroll container's pointer handler, which checks inside/outside).

### 3d. Hero header tools (PickerStage)
- Add a small tool row to the hero (`PickerStage.tsx`, the hero `div` with the gradient bar +
  name/Favients/count). Three toggle buttons (Lasso / Rect / Paint) — only one active at a
  time; clicking the active one turns selection mode off. Use existing GMT button styling
  (`text-[11px]`, cyan-active like the mode tabs). Desktop-first; the gesture is pointer-based
  so it can also work with touch-drag, but design for mouse.
- Show **kept state**: when `keptIds` is set, show e.g. `▣ 142 kept · clear` (clear → `keptIds=null`).
- Pass `selectionTool` + `onSelectionCommit` (→ `setPaletteFilters({ keptIds: intersect(prev, kept) })`)
  + `onSelectionCancel` (→ deselect the tool) to `<PickerWall>`.
- Provide an **Esc / outside-click cancel**: a `useEffect` keydown listener for Esc, and the
  "click any non-canvas UI cancels" can be done by having the tool deactivate on blur / on a
  pointerdown that lands outside the wall (a document-level listener while a selection is mid-flight).

### 3e. Reconcile right-click and pan
In `PickerWall`'s `onPointerDown`/`endDrag`: right button still starts a pan; on `endDrag`,
if it was a right-button gesture **with < 5px movement** (a right *click*) **and** a selection
is in progress, treat it as **cancel** instead of pan. (Right-drag pans as before.)
Also `onContextMenu` is already `preventDefault`'d so no browser menu appears.

---

## 4. Decisions to confirm with the user before/while building
1. **Progressive vs replace**: does each carve **intersect** the prior kept-set (narrowing), or
   **replace** it? (Recommend intersect — "keep refining"; clear resets.) 
2. **Paint commit**: does Paint still require the inside/outside keep-click, or does releasing
   the brush immediately keep the painted swatches? (Recommend: consistent keep-click for all
   three, but Paint could reasonably commit on release — ask.)
3. **Persist `keptIds`?** (Recommend no.)
4. **Selection limited to visible swatches** acceptable for v1? (Recommend yes; note it.)
5. Should a carve also drive anything downstream (e.g., a "select all kept → Favients" action)? Out of scope for v1 unless wanted.

---

## 5. Gotchas (learned this session — heed these)
- **Zoom is a live CSS transform on `contentRef`** during a middle-drag, committed on release.
  Selection drawing should be disabled while a zoom/pan drag is active (`dragging.current`),
  and selection coordinates are in **screen space** mapped via `getBoundingClientRect` (works
  at any committed zoom). Don't try to mix selection with an in-flight zoom transform.
- **Windowing**: off-screen `SwatchCanvas` chunks are unmounted (`IntersectionObserver` toggles
  `visible`). The selection can only see mounted chunks → only on-screen swatches are selectable.
- **`row` is reassigned** whenever the catalog (re)loads/merges (pickerStore `rebuild`), but
  **`id` is stable** — key the kept-set on `id`, never `row`.
- **DPR-capped canvases** (1.5×) and **memoised `GroupRow`** — keep selection overlay work out
  of the per-swatch draw path; draw the overlay separately so you don't trigger swatch redraws.
- **`scrollbar-gutter: stable`** is set on the dock content via `gradient-explorer.html` only —
  unrelated, but don't reintroduce a shared `Dock.tsx` change (we deliberately scoped it).
- **Shared-engine caution**: keep this feature inside `gradient-explorer/` + `palette/`. The
  Picker wall is Explorer-only — no need to touch `components/` or `engine*/` shared code.
- **Mobile**: the wall on a phone is the single-column stacked layout; selection tools are a
  desktop affordance. Hide the tool row on mobile (`hidden md:flex`) like the zoom hint.

---

## 6. Suggested file-by-file changes
- `palette/core/selectionGeometry.ts` *(new)* — pure helpers: `pointInRect`, `pointInPolygon`,
  `rectFromDrag`, plus a `swatchesInShape(shape, swatchRects)` that returns the inside ids.
  Unit-test it (see §7).
- `palette/features/paletteFilters.ts` — add `keptIds` to `state`; (optional) a clear helper.
- `gradient-explorer/PickerStage.tsx` — apply `keptIds` in the `list` filter; add the hero
  tool row + kept/clear UI; own the `selectionTool` state + Esc/outside-cancel; pass props down.
- `palette/components/PickerWall.tsx` — accept `selectionTool` / `onSelectionCommit` /
  `onSelectionCancel`; add the left-button selection state machine + the dim overlay; reconcile
  right-click→cancel; expose swatch-rect iteration for hit-testing.
- (maybe) `palette/components/SelectionOverlay.tsx` *(new)* — the SVG/canvas overlay + dim scrim.

---

## 7. How to test (this repo's pattern)
- **Typecheck**: `cd dev && npm run typecheck` (cwd matters — npm scripts are in `dev/`).
- **Unit-test the geometry**: add `debug/test-palette-selection.mts` (mirror
  `debug/test-palette-*.mts`) and wire it into the `test:palette` chain in `package.json`.
  Test point-in-polygon, rect, and `swatchesInShape` against known swatch rects.
- **Visual / interaction (Playwright)**: dev server runs on an auto-picked port (check the
  `npm run dev` log; recent runs used `3404`/`3400`). Pattern used all session:
  ```js
  import { chromium } from 'playwright';            // run the script from inside dev/
  const p = await b.newPage({ viewport:{width:1280,height:800} });
  await p.goto('http://localhost:<port>/gradient-explorer.html', { waitUntil:'networkidle' });
  await p.locator('text="Picker"').first().click();
  // drive p.mouse.down/move/up with {button:'left'} to draw, then click inside/outside;
  // read window state or the wall's swatch count to assert the carve.
  ```
  Assert: after keep-inside, the wall's entry count drops to the inside set; after
  keep-outside, to the complement; Esc/right-click/outside-click leaves the count unchanged.
- The wall's filtered `count` is shown in the hero (`{count} of {catalog.length}`) — easy to assert.

---

## 8. Context the next session should re-read first
- `dev/CLAUDE.md` (project rules) and the docs table; this is the **Gradient Explorer** under `dev/`.
- `palette/components/PickerWall.tsx` end-to-end (layout + the pointer/zoom/pan/hover machine).
- `gradient-explorer/PickerStage.tsx` (the filter `useMemo` + hero).
- This session shipped, on branch `dev`: smooth transform-zoom + pan + gesture hints on the
  wall (commits around `0f62b92`…`ccec273`). Build on that interaction model.

**Start by confirming the §4 decisions, then build the pure geometry + the kept-set filter
(smallest end-to-end slice: Rect tool → keep-inside → wall re-filters), and grow Lasso/Paint
+ the dim preview from there.**
