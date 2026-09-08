# Gradient Explorer v2 — the unified shell (layout + visual language) — plan

**Status:** written 2026-09-06 after the owner's walk of the v2 shell ("not quite there yet"), the
relationship map, the five runs, and mock C. Mock C (`plans/ge-v2-mock-c.html`) is the layout
reference and **supersedes mock B's §6b source tabs**; everything else in `plans/ge-v2-design.md`
stands (the pipeline, the roles and gestures, the frozen interfaces in §11, the one-stream-at-a-time
rule). The relationship map, the Gestalt reading, the runs, the inventory placement and the
visual-language audit live on the design artifact published from this session; the parts a builder
needs are restated here so this file stands alone.

**Owner intent (unchanged):** a streamlined standalone app for every colour enthusiast. One gradient
on top of one wall, everything you can do to it hanging off the gradient, everything you have done
lying on the shelf below.

---

## 1. Principles we are adhering to

Numbered so a phase can cite one ("P3") and so an amendment can be logged in §8 without rewriting
the rest. **Layout principles (L)** come from the relationship map read through the Gestalt
principles; **language principles (V)** from the visual-language audit of the live shell.

### Layout

- **L1 · One figure.** The hero is the only figure; the wall is the ground; the shelf is the edge.
  Never two things at full weight. (figure–ground)
- **L2 · The hero is the object.** Everything that acts on the working gradient lives on the hero:
  its transforms hang beneath it, its outputs sit at its right edge. The top bar is for the app
  (brand, undo, settings, Back to GMT), never for the gradient. (proximity, common region)
- **L3 · Sources are reached into, not switched to.** Browse is the ground, always mounted. Mix and
  Extract are trays under the ramp, not tabs. The image is a fixed slot on the hero's left. Nothing
  on screen changes places when the user looks at a different source. (continuity, Prägnanz)
- **L4 · One memory.** The shelf holds Recent, Starred, named groups and Snapshots. Variants are
  Snapshots on the shelf, not a popover. (common region)
- **L5 · Anything wired live to the hero visibly moves with it**, in the same region: the source
  band above the ramp, the green dot on the live tray tab. (common fate)
- **L6 · One tray at a time, and a tray that arms a target leaves the ground visible.** Mix is one
  row. Extract is the only tray that grows to a pane. Trays overlay the wall; they never push the
  shelf. (figure–ground, closure)
- **L7 · Same gesture on every gradient bar.** Click picks, the same click again keeps, drag moves,
  ★ files. Wall tile, shelf item, slot, source band, ramp. (similarity)
- **L8 · The hero never unmounts once it exists.** An empty source is an empty source band, not an
  empty hero. The previous working gradient is one undo away; Recent catches what was moved on from.
- **L9 · The screen grows with the user.** First load: the wall, search, Filters, one pill. The hero
  appears on the first pick; the shelf when Recent has one item. ~~While the pointer lives in the
  wall the hero quiets to the ramp and a row of small use buttons.~~ **Quiet removed 2026-09-07
  (owner): the hero is the same whatever the pointer does — the trays overlay the wall (L6), so
  the hero never needed to give height back.**

### Visual language

- **V1 · Three surfaces, and the third always floats.** Ground = `surface-viewport`. Band (top
  bar, hero, shelf) = `surface-dock`, hairline `line/10`, no shadow, never moves. Floating (tray,
  popover, tool palette, toast, dialog) = `surface-section`, hairline `line/20`, radius 12, one
  shadow, opens and closes.
- **V2 · Radius encodes role.** 4 px = a sample (swatch, tile, slider track). 8 px = something you
  press (button, segmented control, input). 12 px = something that floats. Pill = a state, never
  an action.
  **As amended 2026-09-07/08 (the owner, twice, and this is the settled form): LARGE rounding —
  10 px on a bar, 20 px on a box — belongs to GRADIENTS and to CONTAINERS. Nothing else.** The one
  exception is a gradient's own PALETTE SWATCHES, which are round "because of [their] relation to
  gradients". A control is not a gradient even when it paints one: the colour picker's channel
  bars, pads, strips and colour chips take control radii (6 px on a track or pad, 4 px on a chip,
  8 px on a pressable) and none of them may become a pill. Measured against the first cut of the
  Phase E picker, which wore the gradient language throughout and read wrong for it.
- **V3 · Accent means "this one".** Selected tab or segment, selected swatch outline, slider fill,
  focus. Nothing else is accent. Meaning colours are three and each is a *filled* chip with white
  text: live = green, edited = amber, armed = violet. The thing the chip refers to carries the
  same colour as an outline (dashed violet on slot B, a green dot on the live tray tab).
  Filters' hue chips keep their hue because they are colour; counts move to dim text.
- **V4 · One slider.** The engine's standard slider (label · track · value) everywhere: Filters'
  look axes, Mix crossfade and split, Extract dials, Adjust. Filters' gradient strips survive as
  the track background. No per-slider description boxes; descriptions are tooltips.
- **V5 · Four text sizes, two cases.** 11 px uppercase tracked = zone label (RECENT, THEMES, the
  hero's SOURCE / USE). 13 px = every control and caption. 15 px = tabs and floating titles.
  18 px = the gradient's name, the only large type. Mono only for hex and numbers. Nothing that
  carries meaning in `fg-dim`; captions are `fg-muted`.
- **V6 · One icon set, one weight.** 16 px stroke glyphs in `currentColor`: search, zoom, box,
  lasso, brush, undo, redo, chevron, settings, close. ★ is the single filled glyph and means
  kept. No emoji, no "+ more" as a word where a chevron does.
- **V7 · One gutter.** 24 px left edge for the hero, the search pill, the tray, the shelf; the
  wall's row labels get a 72 px column inside it. A 4 px grid for everything else.
- **V8 · The gradient bar is one spec at every size.** Radius 4, hairline `line/20`, hover = 2 px
  `fg` outline, selected = 2 px accent outline, armed target = 2 px dashed violet, kept = ★ in the
  corner. Wall tile 44×24, shelf item 56×30, palette swatch 22, Mix slot, source band, ramp.

### Process

- **P1 · Read the code before the plan.** Every phase brief names the files and the seams it will
  touch after reading them, not from this doc alone.
- **P2 · One phase at a time, in this tree, on `ge-v2`.** Each phase lands uncommitted, the gates
  run, the owner walks it visually, then it is committed. (Owner decision 2026-09-03, unchanged.)
- **P3 · Move hosts, not behaviour.** The stores, the pure core, the stage bodies and the harnesses
  survive; the shell files and WorkingHero are what change. New maths goes in `palette/core` with
  `test:palette` coverage.
- **P4 · Every phase ends with a principles check** (§8). A principle a phase found wanting is
  proposed there, decided by the owner, then propagated.
- **P5 · The owner does the visual testing.** No screenshot smokes. Guards are typecheck, the
  harnesses, and the interaction smokes.
- **P6 · Every phase reports what is still missing.** A phase ends with a "Still missing" entry in
  §10: what it left undone in its own scope and why, what it noticed outside its scope, and what
  the next phase now has to carry. That entry is the critique list for the owner's walk and the
  brief for what lies ahead. A phase without one is not done.

---

## 2. The target, in one screen

Four regions instead of seven (desktop 1280×800 from mock C: top bar 48 · hero ~200 with the tray
tabs, ~120 quiet · wall the rest · shelf 50):

    ┌ top bar: brand · undo redo · settings · Back to GMT ─────────────────────────┐
    ├ hero: [image slot] [name · state chip · return · more like this]  [★ Keep]  ┤
    │       [source band when live]                                     [Share]   │
    │       [palette row on top of the ramp]                            [Export]  │
    │       [ramp = the stops editor]                                   [Wallpaper]│
    │       [Mix ▾  Extract ▾  Curves ▾  Adjust ▾]          SOURCE · WORK · USE   │
    │  ┌ tray (floating, one at a time, overlays the wall) ───────────────────┐   │
    ├ ground: the wall · floating search + Filters · arrange sentence · tools    ┤
    │         armed pill at the bottom edge of the ground                         │
    ├ shelf: RECENT | STARRED | groups… | SNAPSHOTS · tween | + Snapshot · groups ▴┤
    └──────────────────────────────────────────────────────────────────────────────┘

Phone: hero as a top sheet, tray as a bottom sheet over the wall, shelf as a bottom sheet with a
peek row. No tab bar.

## 3. What each inventory line becomes (short form)

Same surface and gesture: the wall and its tools, search + Filters, the arrange sentence, the stops
editor, the palette row, Curves, Adjust, source-over-result and bake, Recent / Starred / groups and
the full panel, the Export dialog, the Wallpaper overlay, keyboard, settings.
Moved (same code, new host): Mix → tray; Extract + image drop → slot + tray; Variants → Snapshots on
the shelf; Share · Export · Wallpaper → the hero's use cluster; More like this → the hero name row.
New: Back to GMT carries the working stops (the `?g=` share code, read by app-gmt on arrival).
Removed: the three source tabs. Out (owner, S3): Sweep.

---

## 4. Phases

Serial. Each phase: brief → build → gates → owner visual walk → commit → §8 principles check.
"Gates" always includes `npm run typecheck`, `npm run test:palette`, `npm run smoke:ge-next`; extra
gates are listed per phase. Sizes are honest estimates of one focused session each.

### Phase A — the language primitives (foundation for everything after)
**Goal:** the vocabulary exists as code so later phases compose it instead of restyling.
- `gradient-explorer/v2/ui/`: `Act` (8 px action button, V2), `StateChip` (filled pill: live /
  edited / armed / picked / snapshot, V3), `Floating` (V1 surface wrapper used by trays, popovers,
  the tool palette, toasts), `ZoneLabel` (V5), `Icon` (one inline-SVG set, V6), and the gradient-bar
  classes (V8) as one shared className helper used by `PickerWall` tiles, `FavientsPanel` items,
  `PaletteRow`, `GeneratorSourceRow` slots and `SourceBands`.
- `components/AutoFeaturePanel.tsx`: an additive prop to render descriptions as tooltips instead of
  the per-slider box (V4). Every existing host keeps its current look; only the v2 shell opts in.
- `BrowseStage.tsx` Filters popover: the look axes become the standard slider with the gradient
  strip as the track background (V4); hue chip counts to dim text (V3).
- Contrast pass on the light-grey scheme: every `fg-dim` that carries meaning → `fg-muted` (V5).
- Gutter pass: 24 px everywhere, 72 px row-label column (V7).
**Gates:** + `smoke:ui-primitives` (components/ui untouched, but run it), owner walk on light grey
AND dark to confirm the filled chips read on both.
**Files:** v2/*, components/AutoFeaturePanel.tsx (additive), palette/components/PickerWall.tsx,
palette/components/FavientsPanel.tsx (class swap only).

### Phase B — the hero band: source · work · use
**Goal:** L2, L8, the use cluster, the image slot, Back to GMT carrying the gradient.
- `WorkingHero.tsx` becomes the three-column band from mock C: image slot (empty / filled / active),
  the work column (name row with `StateChip`, source band, palette row, ramp in strip chrome, the
  tray tab row), the use cluster (★ · Share · Export · Wallpaper) — moved out of the top bar.
- Top bar reduced to brand · undo · redo · settings · Back to GMT.
- L8: `GradientExplorerV2App` no longer hides the hero when the input is empty; an empty Extract
  shows as an empty source band. `workingStore` unchanged.
- Back to GMT: the link is built with `shareUrl.ts` (`?g=` on `app-gmt.html`); app-gmt reads it at
  boot through the same module and applies the stops to its palette. Shown only when arrived from
  GMT (`?from=gmt` / referrer, as designed).
- Quiet hero (L9): a pointer-in-wall timer collapses to ramp + small use row; any hero hover expands.
**Gates:** + `test:gx-share` (extend: the GMT-bound URL round-trips), a new `smoke:ge-hero`
(pick → hero appears; switch source with nothing there → hero stays; Esc chain).
**Files:** v2/WorkingHero.tsx, v2/GradientExplorerV2App.tsx, v2/shareUrl.ts, app-gmt boot (the
one place that parses `?g=`), v2/ExportMenu.tsx (anchor moves).

### Phase C — the trays and the ground
**Goal:** L3, L6; the source tabs go.
- `BrowseStage` becomes the ground: always mounted, full height under the hero, search + Filters +
  arrange sentence + tools as `Floating` elements over it; the armed pill at the ground's bottom edge.
- Trays as a `Floating` accordion anchored to the hero's bottom edge, one open at a time:
  **Mix** (one row: A = working with its name · crossfade + L·C·h split + Swap · B slot; opening arms
  B; wall or shelf click fills B; `armedTarget.ts` unchanged) · **Extract** (`ExtractStage` body in
  bare chrome; grows to a pane; the image slot on the hero opens it) · **Curves** · **Adjust**
  (the existing expanders, re-hosted).
- Esc order: disarm → close tray → close popover/dialog.
- `BuildStage.tsx` and the source-tab row are deleted; `GeneratorSourceRow`, `ColorBoxControls`
  (unused now; leave for app-gmt), `useImageDrop` (mounted at the root, routes to the slot + tray).
- Source band label = "A · <name>" for Mix, "image · <method>" for Extract (L5).
**Gates:** + extend `smoke:ge-next`: open Mix → armed → wall click fills B → hero is the blend;
open Extract with an image → live; Esc chain; only one tray open. `smoke:gx-handles` (Path handles
inside the tray). Owner walk on a short window (≤ 720 px tall) — L6 is the thing to check.
**Files:** v2/BrowseStage.tsx, v2/GradientExplorerV2App.tsx, v2/WorkingHero.tsx (tray host), new
v2/Trays.tsx (or one file per tray), v2/ExtractStage.tsx, v2/SourceBands.tsx.

### Phase C follow-ups (owner's walk, 2026-09-07) — folded in before Phase D
The tray works; the walk produced these. Two are done in the same session, the rest are the
order of work from here, each folded into the phase that owns the surface.
- **C.1 · Tray inline with the panel** (DONE 2026-09-07): its left edge follows the gradient
  panel's, never the image column. `smoke:ge-tray` [2] measures it.
- **C.2 · Image asks for an image first** (DONE 2026-09-07): with nothing loaded, the Image tab
  and the slot open the file dialog and the source switches only when one arrives; cancel =
  nothing changes. `smoke:ge-hero` [3] guards it (the old "empty Image source" band is now
  reachable only by a drop that fails to decode).
- **C.3 · Bake and cancel, one rule for every face** (DONE 2026-09-07 evening): leaving Curves
  or Adjust with something applied folds it into the stops (`beginEdit`, before any source
  switch, so Mix is handed the baked gradient); Mix and Image bake as before. The chip is the
  cancel for both: "editing · return to source" undoes a bake, "live from Mix · cancel" leaves
  a live face without baking (`liveFrom` / `goLive` / `cancelLive` in workingStore).
  `smoke:ge-tray` [7] and [8] guard it, both falsified. The original note: a face (Mix · Image
  · Curves · Adjust) is a LIVE edit shown as the split ramp; leaving it BAKES by default (owner)
  — was true for Mix and Image (`use(…, { bakes: true })`), Curves and Adjust persisted as
  live dials after the tray closed. Bake = the stops are the result and the dials reset; CANCEL =
  return to the source, which the state chip already offers for an edited bake ("editing ·
  return to source") and must also offer for a live face (the chip reads "live from Mix";
  clicking it cancels). No separate Bake button in a face — the header is the place. Owner:
  "either mix needs a bake button or the hero needs a bake/cancel mechanism that works with
  the half split render" — the second, so it is one mechanism for all four.
- **C.4 · Curves fits on entry and understands steps** (DONE 2026-09-07 evening): the face
  fits on mount (a bake on leaving resets the tracks, so the next entry fits the baked
  gradient); `flatRuns` + `rampToSteppedTrack` (channelCurve.ts) give a banded source one
  Step key per band and Linear keys over the slopes between, Smooth off for banded sources.
  `test:palette` channelcurve guards it (falsified twice). Library caveat: the bundle's own
  "Steps" palettes are smooth (the re-bake defect, §10), so the face only shows holds for a
  gradient that is banded on screen.
- **C.9 · The bake gesture on the split ramp** (DONE 2026-09-07 evening; `smoke:ge-tray` [9]
  and [10], both falsified. The Mix top half no longer arms a replacement pick — replace =
  cancel, then pick. Owner's spec, superseding the chip as the primary control, the chip
  stays as the readout): with a face open the hero ramp is
  split — clicking the BOTTOM half (the result) bakes it; clicking the TOP half (the source)
  keeps the source instead — cancel. Either way the face's transformations reset and the
  face closes. Instant tooltips on hover ("Keep this result" / "Keep the source instead").
- **C.10 · The wall's header** (DONE 2026-09-07 evening — a 1fr·auto·1fr grid, the pad 360 px
  centred, the right column = similarity chip · clear all · Filters · Search): the main gradient wider and centre
  aligned; search on the right with Filters to its left; with Filters closed, "Clear all" sits
  right-aligned on the Filters row.
- **C.11 · Zoom tool status** (DONE 2026-09-07 evening — a soft-skin Padding slider in the
  zoom readout, `data-gx-zoom-padding`): while the zoom tool is active, the status chip in the
  bottom-right corner also carries the wall's padding.
- **C.12 · A smoothing brush for Curves** (DONE 2026-09-07 evening — `smoothSpan` in
  utils/CurveFitting.ts, a brush stroke in the shared usePencilTool, a tool button in the
  channel editor; the channelcurve harness guards it, falsified twice. Second cut, owner:
  "soften incrementally … local keyframe baking before applying our elastic smooth" — the
  span is BAKED to a key every 2 frames, run through calculateConstrainedSmoothing (the
  graph tools' elastic smooth, strength 0.25 per stroke, so strokes accumulate) and DP-fitted
  at eps/3 into Bezier keys; the harness checks a second stroke softens further): a brush over the
  channel graph that acts as a LOCALISED bake + smooth + simplify — the fit recipe we already
  have (`smoothChannel`, `dpIndices`, `fitChannelsToTracks`) applied to the samples under
  the brush only, re-keyed there, the rest of the track untouched. Sits with the editor's
  Pencil tool (grep `pencilMode` in ChannelGraphEditor).
- **C.5 · Mix UI** — the owner is still thinking; not blocking. Parked until there is a design.
- **C.6 · The Image face is one picture** (owner's walk, 2026-09-07; BUILT the same day —
  trays-spec §14). Today it is the old Image
  tab's body in a box: a source pane, a big preview and the hero's slot — three views of one
  image, Replace image far from it, the colour cloud small on a black 640×340 canvas, and a
  Dominant swatch row the hero palette has superseded. The redesign: the tray's PREVIEW is the
  working surface — wide, full aspect, letter-boxed to a fixed height; the Path handles and the
  Draw / Auto / Straight tools sit on it (a re-host of the image pane, same behaviour); the
  source pane goes. This face alone takes the tray's FULL width (the plan's "grows to a pane").
  Under the image: the method chips (Dominant · Tones · Path) with the active method's dials in
  one row; the Dominant swatch row goes. The colour cloud is the only other thing: a square
  beside the image on the panel's ground, zoomed to fill (a change to the cloud canvas, not a
  style). Replace image = a small icon button on the preview, shown when the draw tool is not
  active (drop-anywhere still works). The hero's slot keeps its thumbnail: it says "from an
  image" and opens the face; it is no longer somewhere to look. Design it as a frame first.
- **C.7 · Bias handles only over the gradient** (DONE 2026-09-07 evening — `showBias` in
  the editor's strip chrome, hover-gated): the hero's bias
  handles (the mid-segment knots) show only while the pointer is over the ramp; at rest the
  ramp carries its stops alone ("the less on screen, the better").
- **C.8 · A slider skin for the shell** (DONE 2026-09-07 evening — `InputSkinProvider skin="soft"`
  in components/inputs/skin.tsx, read by ScalarInput's full variant; the Tray provides it, so
  every face's slider wears it and app-gmt keeps the default. Second cut the same evening, the
  owner's pick from the Opus study `plans/ge-v2-figma/slider-skin.md`: option B, THUMBLESS —
  the fill's edge is the value with a 2 px accent cap — and option C as `dense`, one 26 px row
  for full-width rows (Mix's channels, Curves' Detail / Smooth). The value stays a
  DraggableNumber: click to type, wherever a user expects a text entry): the shared slider component
  gets a second skin matching v2's visual language (the rounded, quiet controls of the tray)
  — the Mix sliders and Adjust bins wear it; app-gmt keeps the default. Genericize, don't fork:
  a skin prop on the master component (grep `Slider` under `components/`), never a parallel.
- **C.13 · The tray tabs as one segmented control** (DONE 2026-09-07 evening — a 9 px tongue
  in the tray's colour from the open segment to the tray's borderless top; no chevrons): Mix · Image ·
  Curves · Adjust in the same style as Even / Perceptual / Stops, and the open one drawn as a
  TAB — joined to its face below (the face's top edge meets the tab, no gap).
- **C.14 · Title and state spacing** (DONE 2026-09-07 evening): the state chip sits a touch
  further from the name (8 px).
- **C.15 · The strip's blend · output · menu cluster** (right-aligned 2026-09-07 evening; the
  owner agreed output → Export, DONE the same evening: an Output profile row in the Export
  window, the strip keeps blend + the menu trimmed to its Actions and View sections — owner,
  same evening): blend = the interpolation space (RGB · HSV · HSV Far ·
  Oklab) — it changes the ramp, keep; output = the export colour profile (sRGB · Linear ·
  ACES) — an export concern, candidate for the Export window; the menu = copy / paste /
  reverse / distribute / interpolation — the stop inspector's context menu already has most
  of it, candidate to go.
- **C.16 · The fit ghost is a layer** (DONE 2026-09-07 evening — `ghostDefault` / `ghostActive`
  on ChannelGraphEditor; the ghost canvas was already pointer-events-none): off at rest, shown
  while Detail or Smooth is being dragged, the eye forces it on.
- **D.1 · My Gradients as DATED bins** (DONE 2026-09-07 evening — `buildBlocks` in
  palette/components/favientBlocks.ts splits Recent's run per local day, labelled Today /
  Yesterday / the date; `test:palette-favients` guards it, falsified): entries file into a bin
  per day by default; the session keeps refreshing the SAME entry until the gradient is
  favourited or a new one is selected (the Recent-session rule, kept) — a re-pick refreshes
  `createdAt`, so it moves into today's bin. Starred / named groups sit beside the days.

### Phase D — the shelf as the only memory
**OPEN QUESTION, owner 2026-09-08 (settle this BEFORE building the shelf):** the owner is "still
not happy with the browser canvas" and wants to consider **unifying the shelf and the browser** —
one surface of gradients rather than a wall above and a shelf below. That decides the phase's whole
shape, so it comes first: what is wrong with the wall as it stands, and does My Gradients become a
ZONE of the wall (its filters, zoom, carve and similarity applying to your own gradients too)
instead of a separate strip. The list below is the separate-shelf design as it stood; keep it as
the fallback.
**Goal:** L4; Variants become Snapshots.
- Footer: zones RECENT · STARRED · named groups · SNAPSHOTS with `ZoneLabel`s; `+ Snapshot` and
  `groups ▴` at the tail; the full panel (`FavientsPanel`) unchanged beneath.
- Snapshots zone reads `variantsStore` (capture / restore / rename / duplicate / remove via the item's
  context menu); items carry the corner glyph; select two → tween slider in the shelf header →
  Bake = `use`. `VariantsMenu.tsx` retired.
- Known gap carried from §11f: a snapshot should also carry the open tray (the shell's "source");
  add it to the snapshot's `features` here.
**Gates:** + `npx tsx debug/test-palette-variants.mts`, `test:palette-favients`; extend
`smoke:ge-next` with capture → switch → tween → bake.
**Files:** v2/GradientExplorerV2App.tsx (footer), new v2/Shelf.tsx, palette/store/variantsStore.ts
(source field), v2/VariantsMenu.tsx (delete).

### Phase E — the picker dialect (shared with app-gmt)
**Goal:** the last foreign vocabulary: the stop inspector's colour picker.
- **DONE 2026-09-08 (first pass).** The picker reads the INPUT SKIN context
  (`components/inputs/skin.tsx`) rather than taking new props, so one provider around the editor in
  `WorkingHero` puts the whole stop inspector into the v2 dialect and app-gmt's `full` chrome is
  untouched by construction. What changed under `soft`: every channel bar is a 10 px rounded pill
  painting its own gradient with a hairline marker (the track carries the meaning, so unlike the
  thumbless v2 slider it keeps a mark); the harmony / recent / palette swatches are 10 px bars;
  the 9 px uppercase bold labels become one quiet 12 px line; the value fields lose their boxes but
  stay text entries (the owner's rule); the hex keeps mono type and nothing else does (V5); the
  pads take the large radius; and the picker drops its own bordered box, since the tray is the
  surface. The skin travels through the React tree, NOT the DOM — the inspector is a portal, so the
  provider sits on the editor. `smoke:ge-tray` [6] asserts the dialect (`data-gx-picker-skin`),
  falsified by flipping the provider to `default`.
- **SELECTION MODES (third pass, 2026-09-08 — the owner's correction).** The reference spec's
  real move is not any one control: it is that you CHOOSE which controls are on, several at
  once, from a toolbar under the swatch, and the combination is remembered (owner: "the colour
  wheel is not even enabled by default, the default is the regular square picker — part of its
  cleverness is its configurability"). So the picker now carries `PickerMode` toggles — field
  · wheel · channels · kelvin · swatches — as glyph buttons at the end of the always-visible
  swatch/hex line, persisted under `gmt.colorpicker.modes`, defaulting to field + channels +
  swatches (the square picker, as it was). The last mode on cannot be switched off. Kelvin is
  new and one-way by nature (a rendered colour has no single temperature): the slider and the
  eight presets propose, the colour takes. `data-gx-picker-mode` marks each toggle.
- **Dragging a COLOUR onto the gradient (2026-09-08).** Any chip in the picker — Recent,
  Harmony, this gradient's own row — can be dragged onto the ramp: over a knot it recolours
  that knot, over bare track it inserts one there. The affordance is the point, so while a
  colour is in flight EVERY knot draws a dashed ring and an insertion mark shows where a new
  one would go; the hero's palette swatches are drop targets too, landing the colour at that
  swatch's position through the editor's `dropColourAt`. `components/gradient/colorDrag.ts`
  owns the payload and carries its own MIME type on purpose: the shelf already drags whole
  GRADIENTS, and during `dragover` a browser exposes the drag's TYPES but not its values, so
  the type is the only discriminator a drop target has. Guarded twice, both falsified:
  `test:palette` colordrag (a favient drag is not a colour drag) and `smoke:ge-tray` [12] (the
  knots light up and the colour lands).
- **Recent colours and Kelvin, same day.** Recent moved out of the flowing blocks onto the top
  line after the mode switches, as SQUARE chips — a colour you used is a thing in itself, not
  a band of a gradient (owner). Kelvin lost its presets and gained a **tint**, the green-to-
  magenta axis a temperature cannot express on its own (`applyTint` in colorUtils, the pairing
  a camera's white balance uses).
- **The owner's second walk of the picker (2026-09-08).** Spectrum and Wheel are two views of
  one job, so they TOGGLE in a single slot rather than stacking, both at 150 px, and a stored
  set holding both is sanitised on load. Harmony is its own switch now, independent of the
  wheel, and it carries this gradient's own colours — the row previously labelled "Palette",
  which is the working gradient's palette and is now called **Gradient**. The wheel draws a
  dashed spoke from the centre to each handle, so a set reads as one arrangement rather than
  loose dots. **The handles became STATE rather than a derivation**: deriving them from the
  live colour meant merely SELECTING another handle re-derived the set around it, walking every
  other colour — now the rule, the count, or the active handle's own colour recompute the
  followers, and selecting only changes which handle is live (`onPickIndex` on the swatch row
  carries that through to the Harmony chips). Channel bars went 20 → 16 px to sit with the
  16 px vertical strips, and RGB and HSB are separated by a hairline again.
- **Bug sweep of the picker (2026-09-08, the owner asked for one).** Three real defects, each
  fixed and two of them guarded. (1) A picker canvas that REMOUNTS comes back with a blank
  backing store, and a draw effect keyed on colour alone will not repaint it — Spectrum toggled
  off and on stayed empty until the next colour edit. The canvases now report their own mount
  through a callback ref that bumps `canvasGen`, which the draw effects key on, so any future
  branch that remounts one repaints it for free; `smoke:ge-tray` [11] guards it, falsified.
  (2) Leaving Free mode and coming back re-seeded the handles from the current harmony, throwing
  away hand-placed ones — Free now seeds only when it has none. (3) `preventDefault` on the
  wheel's pointer-down stopped the box taking focus, so the arrow keys and Delete were dead
  after a click; it focuses explicitly now, and Delete removes the active handle in Free (the
  reference spec's Del / Backspace, and a handle you can add should be one you can remove).
  The mode is called **Spectrum**, as the spec calls it, with stored sets migrated from 'field'.
- **The COLOUR WHEEL (second pass, 2026-09-08) — now one MODE among those, off by default.** The owner supplied Cinema 4D's Color Chooser
  spec as "what a robust and comfortable colour picker looks like". The move taken from it: a
  wheel carrying draggable HANDLES, which answers the open question about the four harmony rows
  by replacing them — and it replaces the saturation/value field too, so the face has ONE 2D
  control instead of two plus a printed list. `components/ColorWheel.tsx` is a pure, store-free
  primitive (hue = angle, saturation = radius, value on the strip beside it; drag the disc, click
  a handle to make it the colour, Ctrl/Cmd + click adds one in Free, Escape mid-drag cancels back
  to where the gesture started). `utils/colorUtils.ts` gains `harmonyHandles` + `HARMONY_COUNT`:
  free · monochromatic · complementary · analogous · split · tetrad · equiangular, with a count
  where the rule takes one. Index 0 is always the colour being edited, so every other mode DERIVES
  from the live colour and cannot fall out of sync; only Free stores handles. Under the wheel:
  the handle palette, then Recent and Palette.
- **Not taken from the spec (candidates, cheapest first):** the split old/new swatch while
  dragging; arrow-key nudge on the wheel (1 % / 10 % / jump-to-edge); right-click the colour box
  for copy / paste / swap; Kelvin temperature (`kelvinToRgb` already exists in colorUtils);
  colour-from-picture handles (our Image face already does the picking); saved swatch GROUPS with
  drag between them, sort-by-hue and remove-duplicates — that one wants Phase D's shelf question
  settled first, since it is the same "where does my saved stuff live" problem.
- **Worth its own thought:** the wheel's handles are a palette of harmonious colours sitting one
  gesture away from a gradient that wants stops. "Send these handles to the ramp as stops" would
  make the picker a gradient-authoring tool rather than a colour-authoring one.
- Decide (owner) whether the harmony rows stay in strip chrome at all; §12 item 2 leaned to hiding
  them.
**Gates:** + `smoke:interact`, `smoke:undo` (the editor's undo bracket), owner walk in BOTH the v2
shell and app-gmt's palette overlay.
**Files:** components/AdvancedGradientEditor.tsx, components/EmbeddedColorPicker (wherever it lives —
read first, P1).

### Phase F — phone (S6, redrawn)
**Goal:** the three sheets; no tab bar.
- Hero as a top sheet (image slot collapses into the name row; use cluster becomes a row), tray as a
  bottom sheet over the wall (max 60 %, scrolls), shelf as a bottom sheet with a peek row; safe-area
  insets; the tools palette bottom-right; arrange sentence and zoom readout hidden.
**Gates:** + `smoke:mobile-layout`; push `ge-v2` to `dev` for the /dev preview; owner tests on the
phone.
**Files:** v2/* (CSS + a `useIsPhone` seam), gradient-explorer-next.html viewport meta.

### Phase W — Wallpaper (scheduled 2026-09-07 evening, owner: "I don't want them lost")
**Goal:** the fullscreen is "a whole other world inside the app"; its controls read without
text, like the on-screen controls already there. Order of work, after Phase C's follow-ups and
before Phase D unless the owner reorders:
- **W.1 · The Wallpaper icon** carries a silvery gradient background (the hero's use cluster).
- **W.2 · Conic:** a twist amount and a bias control.
- **W.3 · Radial:** a sine strength / frequency around the circle.
- **W.4 · Gradient map:** besides simple lightness, map individual RGB and HCL channels to
  the gradient.
**Gates:** the fullscreen smoke (grep `smoke:fullscreen` in package.json; add one if none) +
an owner walk in the wallpaper. **Files:** palette/store/fullscreenStore.ts and the fullscreen
mode renderers (grep `ownCanvas`), gradient-explorer/v2/WorkingHero.tsx (the icon).

### Phase G — parity, polish, swap
- Parity checklist vs the old shell (`gradient-explorer.html`), item by item from
  `plans/ge-v2-functionality.md`; `/polish` on the v2 shell; label sweep across the three hosts
  (S5 remainder) and the S5 export formats (.ase, Tailwind, design tokens) into `exportFormats.ts`.
- ADRs: pipeline input slot, Recent auto-collect, variants (already owed) **plus one for the unified
  shell and its visual language** (the §1 principles, as decided, with what each phase amended).
- Swap the entry point, retire the old shell, `npm run context:map`, merge `ge-v2` → `main`
  (auto-deploys — merge only after the owner's final walk on /dev).

---

## 5. Rollout path, start to finish

1. **Now (main session).** Commit `plans/ge-v2-mock-c.html` + this plan on `ge-v2`. Append a pointer
   to `plans/ge-v2-design.md` §13 (additive; the design doc is not rewritten).
2. **Phase A** in the main session (it touches shared components and sets the vocabulary every
   later brief cites). Owner walk. Commit. §8 check.
3. **Phase B, C, D** each in its own interactive session, one after the other, each opened with the
   phase brief (§4 text + the principles + the files it may touch) and this plan as the source of
   truth. The main session reviews the diff before the owner's walk. Commit after the walk.
4. **Phase E** in the main session (shared editor, app-gmt regression risk; the orchestrator holds
   the context of both hosts).
5. **Phase F** in its own session; push to `dev`; owner phone test.
6. **Phase G** in the main session; final owner walk on /dev; merge to `main`.

Every phase boundary: gates green, owner walk done, commit, §8 updated, `HANDOFF.md` entry.

## 6. Models and sessions

| Work | Where | Model | Why |
|---|---|---|---|
| Orchestration: briefs, diff review, gates, plan + principles upkeep, HANDOFF | main session | Fable 5.1 | holds the whole map; decides what a phase found |
| Phase A primitives + AutoFeaturePanel prop + Filters sliders | main session, delegated to 1–2 subagents | Fable orchestrates · Sonnet 5 executes | mechanical once the spec is fixed; shared-component edits need the orchestrator's review |
| Phase B hero band | separate interactive session | Opus 5 | one component family, a clear brief, one new seam (app-gmt `?g=`) |
| Phase C trays + ground | separate interactive session | Opus 5 | the largest layout change; needs a full session's attention |
| Phase D shelf + snapshots | separate interactive session | Opus 5 | store-backed UI with an existing harness |
| Phase E picker dialect | main session | Fable 5.1 | shared with app-gmt; the riskiest regression surface |
| Phase F phone | separate interactive session | Opus 5 | CSS-heavy, device-tested by the owner |
| Phase G parity + polish + ADRs | main session, `/polish` + 2 subagents for the parity sweep and the label sweep | Fable orchestrates · Sonnet 5 sweeps | breadth work with a checklist |

Pacing (from the standing feedback): at most 2 agents at once — the 5-hour cap is shared; check in
at about 2 hours; open a new session at about 85 % of budget; batch a phase's related work rather
than splitting it thin. Phases are serial by owner decision, so parallelism only appears inside a
phase (A and G).

A separate session's brief must contain: the phase text from §4, the §1 principles, the list of
files it may touch and the ones it must not (`palette/core` except through tests; `components/ui/**`
never), the gates, and "land uncommitted; the main session reviews; the owner walks; then commit".

## 7. Risks, said plainly

- **The wall gives up height to the hero permanently.** Mitigated by the quiet hero (L9) and trays
  that overlay (L6). Check on a 720 px-tall window in Phase C; if it still bites, the hero's palette
  row becomes part of the quiet collapse too.
- **`AutoFeaturePanel` is shared by every host.** The V4 change is an opt-in prop; the default
  variant is untouched. Run `smoke:engine-demo` after Phase A.
- **`gmt.favients` is shared**, so Snapshots must never land in it (§11f `stripFavients` holds).
- **app-gmt's palette overlay mounts `PickerStage`.** Phase C's ground furniture must stay inside
  `BrowseStage` (v2-only) or behind a prop on `PickerStage`; the overlay keeps its current look.
- **Keyframe diamonds** still render on AutoFeaturePanel sliders in the trays (carried from §11);
  Phase A's prop is the place to hide them for the v2 host.
- **Reversal on record:** mock B's "sources are three tabs" (§6b) is superseded by mock C. Its
  reason — one thing at a time — is kept by L6 and L9.

## 8. Principles log (append per phase)

Each phase ends with: what it confirmed, what it found wanting, what the owner decided. A principle
that changes is edited in §1 with a dated note; nothing is silently rewritten.

- 2026-09-06 · Phase 0 (this plan): L1–L9, V1–V8, P1–P5 as written. Found during mock C: a tray that
  arms a target must leave the ground visible (folded into L6); the armed pill must not sit where
  a tray can cover it (bottom edge of the ground, folded into L6).
- 2026-09-06 · Phase A (built, awaiting the owner's walk). Confirmed: V1–V3, V5, V6 compose cleanly
  as six primitives in `gradient-explorer/v2/ui/` (Act, StateChip, Floating, ZoneLabel, Icon,
  bar.ts). Found wanting: **V3 needs a fourth, neutral state** — "picked" / "preview" / "snapshot"
  are states but carry no meaning colour; StateChip gives them a neutral fill (added to V3 in
  spirit; owner to confirm the wording). **V6's icon list was short by two**: rename and update
  (VariantsMenu) have no glyph and fell back to words; add `pencil` and `refresh` to the set when
  Phase D re-hosts Variants. **V8 on a canvas-drawn wall is a draw-call, not a className**:
  PickerWall tiles are Canvas 2D, so the tile spec (hairline, hover, selected) has to be applied in
  its draw code — carried to Phase C. Meaning colours: live = the engine's `ok` token, edited =
  `warn`, armed = a new fixed `--gx-armed` (violet) in `index.css` + Tailwind `gx-armed`; kept (★)
  reuses `warn` for now — a gold token is a Phase E question.
- 2026-09-06 · Phase A, owner iteration 1. **V3 amended:** a state reads INLINE (coloured dot +
  coloured text) inside the hero's heading bar, which is the name's home; the filled pill is kept
  only for a state that floats over the ground (the armed pill), because a pill with no bar to
  belong to "doesn't seem visually related to anything" (owner). `StateChip` has `variant`
  'fill' | 'inline'. **L2 sharpened:** the hero's name row is a HEADING BAR — one object with the
  ramp beneath it. **Filters:** the theme chips are gone from v2; the first LOOK row is a hue
  window on a colour-wheel track (the "colour picker": `qHue` on `paletteFilters`, a sixth
  `FilterWindows` entry tested against `raw.meanHue`, achromatic ramps fail an active window);
  each look row reads pole · track · pole with the two amounts stacked on a subtle raised box
  that does not change while typing; the arrange controls are a "more ›" button opening three
  13 px dropdowns (`GenericDropdown` gained an additive `size: 'md'`); Group by defaults to None.
  Undo / redo icons are 24 px.
- 2026-09-06 · Phase A, owner iteration 2. **L1/L6 extended to narrowing:** a narrower must not
  cover the wall it narrows, because the wall updates live — so the main narrower sits ON the bar
  above the wall, and the popover keeps only what is used rarely. **The main picking mode is the
  colour picker, not search** (few people know a gradient's name): `HueLightnessPad`
  (`palette/components/`) is a 2-D OKLab field, hue × lightness, with a RANGED box (draw, move,
  resize an edge, a plain click clears, or on a clear pad drops a 15 %-wide full-height hue band — a click used to leave an unusable zero-size box) writing the same `qHue` / `qL` windows. Cool/warm is
  redundant with hue and is not rendered in v2 (`POPOVER_AXES` in BrowseStage: muted/vivid,
  simple/complex, single-hue/rainbow remain). Softology and cpt-city load at boot in the v2
  shell (`registerFeatures.ts`); app-gmt keeps them on demand. `GenericDropdown` inherits the
  page font and, at `size: 'md'`, drops the medium weight so it matches the rest of the popover.
- 2026-09-06 · Phase A, owner iteration 3. **Filters is not a popover at all** on the wide screen:
  three inline rows under the bar (LOOK · SOURCES · ARRANGE), no "more" sub-section — these are
  already the rare items. The saturation strip (muted ↔ vivid) sits UNDER the hue/lightness
  picker as a picker's own language (`QualityRangePad` `variant: 'strip'`, 12 px). **V8 extended
  to ranged selections:** every v2 range window is drawn the picker's way (white hairline + dark
  halo, dim outside), so a selection on a slider and a selection on the pad read as one thing;
  the engine's default chrome keeps its edge thumbs. `PickerBundleToggles` gained `layout: 'row'`.
  The saturation strip is painted from grey toward the picker window's AVERAGE colour (mean
  hue at mean lightness, `satTrackFor` in HueLightnessPad.tsx); with no window it falls back
  to the generic chroma track, since a full wheel averages to grey.
- 2026-09-06 · Phase A, owner iteration 4 (last): rows ordered LOOK · ARRANGE · SOURCES; the
  look sliders' pole labels left-align with the dropdowns beneath them and every row runs to the
  same right edge, so the three rows read as one block. **Phase A accepted by the owner and
  committed.**

- 2026-09-07 · Phase B (hero band; built in the Phase B session, then redesigned in Figma with the
  owner the same day — `plans/ge-v2-figma/hero-spec.md` §7–7f is the record; the file is "GE v2
  Hero", frame `Hero v3 (agreed)`). **Confirmed:** L2 (sharper: the hero is a CARD, its outputs
  are four icons at the header's right edge, no use column), L5, L7, L8 (`smoke:ge-hero`), V3
  inline states, V7 (the 24 px gutter survived being moved inside the card). **Amended, owner's
  call:** **V1** — the hero is not a band on `surface-dock`; it is a card (`surface-section`,
  radius 20) on a band (`surface-raised`) holding a panel (`surface-viewport`, radius 20) with a
  `surface-raised` header — ground · band · card · floating is the ladder now. **V2** — samples
  are 10 px, not 4; pressables stay 8; containers (card, panel) are 20; pill = state still holds.
  **V5** — the hero carries no zone labels; "the less text on screen, the better" (owner) is the
  stronger form and zone labels now belong to the shelf and Filters only. **V6** — the hero uses
  FILLED Material glyphs (heart · share · download · photo · fullscreen) the owner picked; two
  sets is not an end state — decision: adopt Material across v2, Phase G sweeps. **V8** — radius
  10 on every bar; the ramp has NO hairline and no hover outline, and its 8 px knot gutters are
  painted with the two end colours (strip chrome only; GMT main's `full` chrome untouched); small
  bars keep the hairline. **L9** — quiet no longer hides the palette or shrinks the ramp; it only
  folds the source band (200 ms) after 600 ms; decision: delete it in Phase C unless the short
  window still bites. **New:** the stop inspector (colour picker) is a TRAY like Mix / Extract /
  Curves / Adjust — one thing open under the card at a time, floating from its bottom edge, never
  pushing the shelf (folds into L6; Phase C hosts it, Phase E restyles its insides).

- 2026-09-07 · Phase C (the trays), built the same day from the "GE v2 Tray" canvas
  (plans/ge-v2-figma/trays-spec.md §8–9). **Confirmed:** L3 (the wall is always the ground;
  Mix and Image are reached into through the tray, the source tabs are gone), L6 (one tray,
  floating, the wall never moves — `smoke:ge-tray` [2] and [5] measure it), the Esc order.
  **Amended:** the stop inspector is the tray's fifth face (folded into L6 as decided on
  Phase B's close); the tab row is the ramp's control row, not a row of the tray's own
  (trays-spec §5 item 1, decided by the build: the tabs must be visible when no tray is open);
  Adjust is three containers (owner). **Not done here, carried:** the Curves face still uses
  the engine's bare range inputs for Detail / Smooth (V4 wants the standard slider); the
  Image face is a fixed 380 px box with ExtractStage as it was (its max height / scroll is
  trays-spec §5 item 4, undecided); L9 quiet is still in (deletion deferred until the short
  window walk); the picker's insides are Phase E.

- 2026-09-07 · Phase C, owner's Mix pass (built): no A / B language — your gradient and the
  one you mix with; the hero ramp splits cleanly 30 / 30 with no divider or label (L5 kept, the
  labelled band is now only for Image / Curves / Adjust); the Mix face is the other gradient's
  bar + three plain L / C / h sliders + Link (off) + Swap; leaving Mix bakes. `smoke:ge-tray`
  [4] was found clicking the hero instead of the wall (pre-hero coordinates) and now asserts the
  pick landed. trays-spec §10.

- 2026-09-07 · Phase C, owner's second Mix pass (built): **L9's quiet hero deleted** (no source
  hiding when the pointer is over the wall; the fold, its timers and the `quiet` prop are gone);
  the source half of the split ramp carries the strip's bar language (end-colour gutters, rounded
  top; the result half rounds only its bottom — `stripCorners` on the editor); and a real bug:
  every Mix bake re-fitted the ramp from scratch and the interior stops WALKED (measured 16.9 →
  18.8 → 19.2 → 19.6 % over three bakes) — the fit now seeds the positions the two gradients
  already have (`seedPositions` in stopFit, carried on the `build` input as `seeds`), and three
  bakes reproduce the stops exactly. trays-spec §11.

- 2026-09-07 · Phase C, the stops-walk bug closed for real (three causes: Adjust applied twice
  on a bake, the fit re-finding its stops, and a step edge walking one texel per render on GMT's
  inclusive step boundary). trays-spec §12. `use()` gained `bakes`; stopFit gained `seedStops`
  and the half-texel edge stop; `smoke:ge-tray` [5] and stopfit [5] guard it.

- 2026-09-07 · the stop fitter (owner: "make use of stepped and bias interpolation"): bias +
  smooth are tried on the worst segment before a stop is added (opt-in `fitBias`, the working
  pipeline uses it; 12.3 → 6.3 stops on biased gradients); a step edge must be an ISOLATED jump
  (a steep run is no longer chained into step stops — real palettes' worst error 0.105 → 0.068).
  trays-spec §13; stopfit [6] guards it.

- 2026-09-07 · stepped palettes get step knots: the fitter seeds one STEP stop per flat run
  (exact-equality plateaus; banded-ramp mode for small-edged bands, an edge gate for smooth
  ramps' quantisation runs). Surveyed on the real bundles: banded cpt-city palettes with step
  stops 57 → 105 of 120. trays-spec §13a; stopfit [7] guards it.

## 9. Definition of done, per phase

Gates green · owner visual walk done on light grey (and on dark for Phase A) · no new `fg-dim` on
meaningful text · no pill that is an action · no emoji glyph · one tray open at a time · the hero
present in every state after the first pick · §8 entry written · **§10 "still missing" entry
written** · commit on `ge-v2` · HANDOFF line.

## 10. Still missing (append per phase — the critique list and what lies ahead)

Format per phase: **In scope, left undone** (with why) · **Noticed outside scope** · **What the next
phase now carries**. Items move out of this list only when a later phase's entry says it closed them.

- 2026-09-06 · Phase 0 (plan): in scope, nothing built yet. Noticed: the stop inspector's colour
  picker is a foreign dialect (Phase E); send-to-GMT has no v2 edge (Phase B); keyframe diamonds on
  tray sliders (Phase A); the Dominant swatch row samples the final ramp, not the cluster centres
  (S3 note, still open); the three teaching texts, Recent expiry by age, the hero height on short
  windows, the long B-band name (carried from design §13). Next: Phase A carries the diamonds and
  the contrast pass.
- 2026-09-06 · Phase A. **In scope, left undone:** PickerWall tile hover / selected / hairline per
  V8 (canvas draw code, not a className — deliberately not touched; Phase C owns the ground).
  FavientsPanel's two 🗑 trash-zone glyphs and VariantsMenu's rename/update glyphs (no matching
  icon; words for now). The toast host (`engine/components/ToastHost`) is not a `Floating` surface.
  BrowseStage still inlines the Act / Floating classes instead of importing the primitives (they
  were built concurrently) — a five-line swap for Phase C. The Filters look-range row anatomy is
  keyed off `keyframes={false}` rather than its own prop because `paletteFilters.ts` was out of
  scope; app-gmt's overlay keeps the old boxed look. **Noticed outside scope:** the hero ramp's V8
  hairline reads heavier than mock C's (check on the walk); `PickerControls.tsx` bundle-toggle rows
  still use fg-dim; undo / redo icons in the top bar render small and faint at 16 px on the 48 px
  bar; the row-label column on the wall is still at x≈6, not inside the 24 px gutter (V7, Phase C);
  the Image tab still empties the hero (L8, Phase B). **Phase B now carries:** L8, the use cluster,
  the image slot, Back to GMT with `?g=`, and the `pencil` / `refresh` icons if it touches
  VariantsMenu before D.
- 2026-09-06 · Phase A, after iteration 1. **Still missing:** the hue window ignores achromatic
  ramps by dropping them (a grey ramp never matches a hue window — acceptable, but a "greys"
  chip may be wanted); the theme vocabulary (kaleidoscope, meadow…) is no longer reachable in v2
  except through search; the heading bar's right-hand actions (More like this · ★) are still
  `Act` buttons inside the bar — Phase B decides whether they move to the use cluster; the
  Filters hue track is HSV-painted, not OKLab, so the strip is brighter in the yellows than the
  wall's meanHue statistic is.
- 2026-09-06 · Phase A, after iteration 2. **Still missing:** the pad has no readout (the hue /
  lightness numbers live nowhere now that the two rows left the popover — decide whether a small
  readout under the pad is wanted); the pad's box has no keyboard nudge; the pad is 220×56 and
  the wall's row labels still bucket by lightness while the pad's y axis is the same quantity —
  a duplicated cue, which Phase C's ground work should resolve (rows by none by default, or the
  pad's window drawn as a band on the wall); the "N match" count moved into the search pill and
  only shows while narrowed; search is now the SECOND control on the bar, which is the intent;
  loading the licensed packs at boot costs ~8,000 extra entries (11,131 total) before the first
  paint — measure on the phone in Phase F; the theme vocabulary is reachable only via search.
- 2026-09-06 · Phase A, after iteration 3. **Still missing:** the three Filters rows are
  desktop-only in shape (three dropdowns + toggles in one row wrap badly under ~900 px — Phase F
  decides the phone form); the saturation strip has no readout and no pole labels (tooltip
  only); the ARRANGE row's Reverse is a bare checkbox, not the engine toggle; the LOOK rows keep
  their amounts column while the pad and strip have none — one readout policy is still to be
  chosen; `arrangeText` (the sentence) is no longer shown anywhere.
- 2026-09-06 · Phase A closed. Everything above in the Phase A entries still stands as the
  carry-over list; Phase B starts with L8 (the hero never unmounts), the use cluster, the image
  slot and Back to GMT, and picks up the `pencil` / `refresh` icons and the BrowseStage
  primitive swap (Act / Floating) if it touches those files.
- 2026-09-07 · Phase B closed. **In scope, left undone:** Back to GMT carrying `?g=` (the Phase B
  brief's fourth item) was not walked today — check `app-gmt/main.tsx` reads it before calling it
  done. The empty-source band and the quiet fold have not been designed for the card (they render,
  nobody has looked). **Noticed outside scope:** the wall's canvas tiles and the shelf's items are
  still on the 4 px spec (V8 as amended wants 10) — PickerWall draw code and FavientsPanel
  (shared with GMT main; needs a v2-scoped prop); the `kept` heart uses `warn`, the gold token is
  still owed; the Figma tokens `surface/base` = #f5 and `surface/raised` = #e9 are lighter than
  any surface the runtime scheme generates — if that look is wanted it is a `SURFACE_NORMAL` pole
  change in `colorSchemeStore`, not a hero change; keyframe diamonds on tray sliders (carried
  since §11). **Phase C now carries:** the trays (Mix · Extract · Curves · Adjust · the stop
  inspector) as ONE floating surface hanging from the card, one open at a time, designed first
  as a frame in the GE v2 Hero Figma file and walked before code; Curves as a split-hero mode
  (design §13 item 4) lands inside it; L9's deletion; the Act / Floating swap in BrowseStage.
- 2026-09-07 · Phase B, after the walk. **Closed:** the wall's tiles and the shelf's items carry
  the large rounding — `PickerWall` gained an additive `tileRadius` (BrowseStage passes 8; the
  paint pass clips each tile, capped at a THIRD of the short side so an 18 px tile is a rounded
  bar, not a pill — 8 px uncapped read as pills), the enlarged pick and the hover preview follow
  it, `FavientSwatch` takes `strip` for 10 px corners; GMT main's overlay and panel are at 0 / 4 as
  before. **Decided (owner):** Back to GMT is a PLAIN link — the working gradient is already in
  GMT's My Gradients through the shared Recent group, so the `?g=` hand-back and app-gmt's boot
  reader are removed; `shareUrl.ts` keeps the Share link only, `test:gx-share` [4] now round-trips
  that. Plan §3's "Back to GMT carries the working stops" line is superseded by this entry.
- 2026-09-07 · Phase C built (awaiting the owner's walk). **In scope, left undone:** the ground
  furniture (search + Filters + tools as Floating elements over the wall, the armed pill at the
  ground's bottom edge, the 72 px row-label column) — BrowseStage is untouched; the tray
  accordion's Extract "grows to a pane" rule is a fixed box; `smoke:gx-handles` not re-run
  (Path handles now live inside the tray's Image face — check on the walk). **Noticed:**
  `ExtractStage`'s method chips are a hand-rolled segmented control, not `Act`s; the Mix face's
  sentence is the only teaching text left under the card. **Phase D now carries:** the shelf.
- 2026-09-07 · Phase C follow-ups, end of day (C.1, C.2, C.6 done; the fitter rebuilt). **In scope,
  left undone:** C.3 (bake/cancel for Curves/Adjust + the chip cancelling a live face), C.4
  (Curves fit-on-entry, step segments), C.5 (Mix UI, parked). **Noticed:** the cloud's zoom is
  fixed — scale to its extent if a monochrome image reads small; `ExtractStage`'s dial column
  is a fixed 560 px; the Image face never opens without an image now, so L8's empty-source band
  is only reachable by a drop that fails to decode (keep the code, it is the L8 guarantee).
  **Phase D now carries:** D.1 dated bins on top of its own list.
- 2026-09-07 · late evening, the owner's walk of the new surfaces. **Fixed with guards:** the soft
  slider's default tick swallowing a drag; the hero bar showing the document while the palette
  showed the output (one rule now — the bar is the output); the elastic Smooth tool not baking
  first; "More like this" ranking against the anchor's output profile. **Rebuilt:** the
  similarity metric itself (`similarityProbe`) and the ranked band's fill order (`rowMajor`).
  **In scope, left undone:** C.5 (Mix UI, parked on the owner's design).   **Noticed:** the similarity weights
  (0.5 shape / 0.4 palette / 0.1 structure) are three constants at the top of the probe if a walk
  wants them tuned; `rampDistance` is now a texel-identity check only, not a ranking metric.
  **CANCELLED by the owner (2026-09-08):** arranging the whole wall by similarity (descriptors,
  UMAP, snapped to the grid) as a third Arrange option — do not re-propose it.
  **Phase W is unblocked** and is the next buildable block if the owner wants one.
