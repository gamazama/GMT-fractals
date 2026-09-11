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
**DECIDED 2026-09-08 (owner: "build it to your recommendation") — ONE GROUND, MANY SETS.** The
research (`plans/ge-v2-research/gradient-browsers.md`) diagnosed the wall; the owner's scenario
diagnosed the shell: the quest is a FUNNEL (11,131 → filtered → a curated few → the ones picked
today → the one being worked on, plus one to mix) and the ground never changed shape with it,
while the shelf showed the picks as a second, smaller kind of tile. So: **the ground shows one
SET at a time; the bottom edge names the sets; tile size follows the count.** Sets are the
catalogue (with its narrowers), Recent's dated bins (Today · Yesterday · the date), Kept (the
default group), every named group, and Snapshots. Every set is drawn by the same `PickerWall`
fed a different list — so search, "More like this", zoom, drag and ★ work on your own gradients
for free (L7 becomes structural); Mine stays a PLACE because the chips never move (the Photos
revert); the lit chip says which set a ★ or a drop acts on (no write-target ambiguity); the
shelf strip goes, and the full My Gradients panel survives as the manage surface behind the
rail's pull-up. The research's P1 legibility items land on the All set (the arrange sentence,
tile size by count instead of a slider, the pad as the wall's map); P2 (fractal thumbnails) is
NOT taken — GE v2 is for colour enthusiasts generally, and the strip IS the honest preview;
P3's pinned-zone form is superseded by this. Held: a curated front door (changes L9's
first-load contract), folding near-duplicate tiles.
**Order:** D.0 the set ground (`palette/core/groundSets.ts` pure: set list, favient→entry
adapter with its own 256-wide sprite rows, `tileSizeFor`; `palette/store/groundSet.ts` the
persisted set id; `usePickerModel({ source })` — additive, app-gmt's overlay calls it bare and
is untouched; `PickerWall` gains only a `gutter` override) · D.1 the rail
(`gradient-explorer/v2/SetRail.tsx`: chips in a fixed order, counts, lit = accent, rename by
double-click, drop a gradient on a chip to file it, drop on the tail for a new group; "Keep
these N" on a narrowed All saves the carve as a group — Substance's saved search, UE's
collection) · D.2 the All set's legibility (sentence beside the count, pad-as-map) · D.3
Snapshots as a set (click restores, two selected → tween in the header, `VariantsMenu`
retired; L4 as written). Gates: `test:palette` gains `test-palette-groundsets`; a new
`smoke:ge-ground` walks pick → Today chip → the set alone on the ground → back to All.
**Known loss to weigh on the walk:** the picks are no longer visible while the wall is up —
the hero shows the current one and the chip shows the count. If that is not enough, the chips
grow a small stacked preview; the model holds either way.
**BUILT 2026-09-08 (D.0–D.3, commits dc74070f + b7ef9dd9; awaiting the owner's walk).**
D.0 the set ground: `palette/core/groundSets.ts` (the rail order, favourite → wall entry
with its own sprite rows, `tileSizeFor`), `palette/store/groundSet.ts` (the set id,
persisted), `usePickerModel({ source })`, `PickerWall.gutter`. D.1 the rail
(`gradient-explorer/v2/SetRail.tsx`): chips in a fixed order — click · double-click renames
a group · right-click Rename / Manage… · drop a gradient to file it · drop on the tail for a
new group; "Keep these N" in the wall's left cell files a narrowed All as a group and puts
it on the ground; the arrange sentence is back beside the count; the shelf strip is gone and
the full panel is the rail's pull-up. D.2 the pad as the wall's map: the wall reports its
bands as drawn and the pad draws the on-screen lightness range as a thumb at its left edge
plus two hairlines; the thumb scrolls the wall while the wall is ungrouped. D.3 Snapshots:
"+ Snapshot" on the rail, the set of tiles, click restores, shift-click a second tweens in
the header (Bake keeps it), right-click Update · Duplicate · Remove, the active one's name
editable in the header; `VariantsMenu.tsx` deleted. Gates: `test:palette` (+
`test-palette-groundsets`, six blocks) · `smoke:ge-ground` (ten steps) · `smoke:ge-tray` ·
`smoke:ge-hero` · knip — all green; every new claim falsified (the guards' headers say how).
**Not built:** arrow keys on the wall; a tile-size slider (superseded by size-by-count; the
wall's Padding stays under the zoom tool); an armed mark on the tween's second snapshot (the
header names it); a "source" on a snapshot (the §11f gap stands). The owner's walk decides
the peek question above.
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
- **The picker wears the owner's own icons (2026-09-08).** They arrived as one sheet
  (`H:\GMT\assets\GXN\someIcons.svg`): nine 8-unit glyphs in a row — copy, eyedropper, a
  rounded square (spectrum), a circle (wheel), the knot's own silhouette (stop), four
  overlapping circles (harmony), sliders (channels), a thermometer (kelvin) and loose chips
  (swatches), which is exactly the set the toolbar needed. `components/gradient/pickerIcons.tsx`
  carries them. **Transcribing them verbatim was wrong** and the owner caught it: framing each
  glyph at its exact bounding box CLIPS the stroke against the frame (a stroke straddles its
  path) and leaves no breathing room in the button, so they came out oversized and cut. They
  are now redrawn to the same designs on a 16-unit grid with the ink filling 2.1–13.9 — about
  three quarters of the box, the balance between clipped and lost. The harmony glyph is eased
  too: four heavily overlapping circles are lovely at 44 px and a flower at 14, so the overlap
  is reduced until the four discs survive at icon size, which is the whole point of the glyph.
  The eyedropper is the exception, kept verbatim: it is filled rather than stroked, so nothing
  clips, and it reads correctly as drawn. `currentColor` throughout so a glyph follows the
  theme and turns accent when its mode is on; the file carries the house rules for the next
  one. The unicode stand-ins on Copy and the eyedropper are gone.
- **`hsv-far` retired (owner, 2026-09-08).** Blending hue the LONG way round is gone from every
  chooser: the strip's cycle, the stops menu, the palette dock's dropdown and the editor-config
  cycle. The TYPE and the renderer keep it on purpose — gradients already saved in it must still
  render, and the two blend readouts still name it so such a document reads honestly. Do not put
  it back in a picker.
- **A channel slider means something different with SEVERAL knots selected (2026-09-08).** It
  used to paint every selected knot the picker's whole colour, so nudging red flattened the
  selection to one colour. Now: setting a colour outright — the hex, the spectrum, the wheel, a
  swatch — still paints them all the same (that is unambiguous), but moving a CHANNEL moves
  that channel by the same DELTA on each of them and leaves the rest of each colour alone. Drop
  everyone's red, lift everyone's value, and the differences that made you select them survive.
  `nudgeChannel` in colorUtils is the maths (RGB clamps per colour so one hitting the wall does
  not drag the others; hue wraps, being an angle); the picker sends a delta through
  `onChannelAdjust` only when the host says it is editing more than one thing. Guarded in
  `test:palette` colordrag [4], falsified by rebuilding each colour from the shared value.
- **One cursor scheme (owner's walk, 2026-09-08).** A cursor is a promise about the next
  click, so each shape now means exactly one thing across the hero and the editor, written at
  the top of AdvancedGradientEditor: **crosshair** place or draw on the track (add a knot, drag
  a marquee) · **grab / grabbing** pick a knot up · **move** move a whole selection ·
  **ew-resize** change a value along the axis (scale a selection, a bias handle, a slider, a
  palette swatch sliding the ramp) · **pointer** a click that DOES something (bake, cancel, a
  chip, a button) · **no-drop** let go and the knot leaves · **default** nothing happens here.
  Two things were lying: the ramp wore `pointer` at all times, including when a click did
  nothing (it now wears it only while `onStripClick` is live — verified `default` at rest,
  `pointer` on both halves once a face splits the bar), and a knot DRAG overrode the body
  cursor to `ew-resize`, contradicting the knot's own grab. Measured in the browser, state by
  state, including the preview chip correctly having no pointer since it has no action.
- **The knot says what it does (2026-09-08).** A knot whose segment HOLDS is drawn as a
  flat-topped square; one that travels keeps the pointed house. A stepped gradient is now
  readable straight off the track. Right-clicking a knot opens its own menu with INTERPOLATION
  at the top (the one property you reach for while looking at a knot), then whatever the host's
  trim leaves — built from the same shared `buildGradientMenu`, so its wording and checkmarks
  cannot drift from the inspector's. A right-click on an unselected knot selects it first, so
  the menu acts on what you clicked.
- **Small ones, same evening.** A colour can be dropped on the palette row's **+**: it makes
  the new swatch and lands there on the ramp (`addSwatch` now returns the position it chose, so
  the caller can act on that spot). The soft slider's number sits in a slightly darker WELL, so
  it reads as a field you can drag and type into without needing a border or a label. Decimals
  follow the slider's `step` (1 → none, 0.1 → one), which is why the channels had been printing
  a conversion's eight places; and the rows hug the bar — dense 26 → 22 px.
- **The picker's channels ARE the app's slider (2026-09-08).** The bespoke `GradientSlider`
  was missing most of what the real one does — right-click reset, the default tick, the live
  indicator, help ids, a properly typed value (owner: "this component is missing a lot of
  functionality that the real slider component has"). `ScalarInput` could already paint a
  gradient track; `Slider` simply never forwarded it, so it does now (`trackBackground`), and
  the soft dialect renders the real `Slider` for every channel. That also puts the bars back to
  the component's own 10 px. `GradientSlider` stays for `full` chrome, whose rows are half the
  height a full Slider needs, and is marked deprecated for v2. The trio is **HSV**, not HSB —
  the store always called it `v`, only the label was wrong — and the H/S/V readouts are rounded
  for display, since they come from a conversion and carry a colour's worth of decimals.
  The DEFAULT mode set is now the owner's own working one: stop · spectrum · channels · recent.
- **The owner's third walk of the picker (2026-09-08).** Spectrum and Wheel became ONE joined
  segmented control in the shell's button language (shift-click keeps both; either can still be
  off), and the independent switches beside it wear the same thin border when on. The knot's own
  fields — interpolation, position, bias — left their collapsing side column and became the
  'stop' MODE on the LEFT, with the interpolation chooser now the same dropdown as Harmony's.
  That dropdown SHRINKS its type to fit rather than clipping ("Complementary" lands at 11 px in
  a 113 px well), measuring the element's own padding rather than a guessed gutter. The
  spectrum's marker went neutral: `mix-blend-difference` inverts whatever is under it, so it
  turned cyan on a warm field and red on a cool one and read as a coloured thing rather than a
  pointer. A dropped colour no longer steals the SELECTION — you are colouring a knot, not
  choosing one. **Complementary, split complementary and tetrad folded into one rule** at the
  owner's suggestion: a complementary pair whose ends split by an angle, so the count says how
  many (2 the classic pair, 3 the old split at 30°, 4 the old tetrad at 60°) and the new
  Spread dial says how far; Analogous uses the same dial for its step, which used to be frozen.
  With Harmony switched off the wheel shows the one handle you are editing, the set kept
  underneath for when it comes back.
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

**BUILT 2026-09-08 (W.1–W.4; awaiting the owner's walk).** The goal's second clause decided
the shape of it: W.2 and W.3 are HANDLES, not sliders, because the geometry modes have no
slider panel at all — `paramFields` exists so the handle layer knows what to clamp to, and the
on-screen handles are the whole UI. So:
- **W.1** — the Wallpaper `Act` is the one button in the use cluster with a surface of its own,
  a brushed-silver sheen with a pinned dark glyph (the silver does not follow the theme).
- **W.2 · conic** — `conicTwist`, in TURNS, winding the sweep into a LOG spiral by the house's
  own law (`conicTwistTurns` = `twist · log(1 + r)`, the same rule as the fractal's "Angle:
  iteration log-spiral"). Its handle rides the seam itself at 0.78 half, so orbiting it drags
  the line it controls, with a spiral guide traced through the same law the pixels use. The
  "bias control" turned out to already exist and be HIDDEN: `conicBiasA` is what the sampler
  reads when the mirror is collapsed, but its handle only rendered when mirrored — so the plain
  conic had no bias at all. It now renders always.
- **W.3 · radial** — `radialSineAmp` + `radialSineFreq` swell and pinch the REACH around the
  circle (`radialSineReach`), so the falloff rings become petals and the centre stays exactly
  at position 0 whatever the amplitude. Amplitude rides a crest and reads straight off the
  pointer's distance (at a crest the ring IS `scale·(1+amp)`, so there is no gain to invent);
  the count orbits on the inner 50 % guide ring and emits whole lobes.
- **W.4 · gradient map** — `mapChannel` picks which of SEVEN properties drives the lookup: luma
  (unchanged default), R, G, B, and OKLCh hue / chroma / lightness. The maths is a new pure
  module, `palette/core/gradientMapChannels.ts`; the mode keeps only the pixels.
**Gates:** there is no `smoke:fullscreen` and none was added — `smoke:gx-handles` is the
fullscreen guard and it now covers the new handles ([2c]). Also `test:palette` (with a new link,
`test-palette-mapchannels`), `smoke:ge-hero`, `smoke:ge-next`, typecheck, knip, text-bytes,
rule-guards. Every new assertion falsified; details in §8.

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
- 2026-09-08 · Phase D (built, awaiting the owner's walk). **L1 amended in fact, not yet in
  words: the shelf is no longer the edge — the RAIL is**, and it names SETS rather than
  holding gradients; the ground is whichever set is lit. Proposed as **L10 · One ground,
  many sets: the ground shows one population at a time; the edge names the populations, in
  a fixed order; tile size follows the count.** Owner to decide. **L4 honoured as written**
  (Snapshots on the rail, Variants off the bar). **L7 became structural**: a set tile IS a
  shelf pick (the same store mode), so search, More like this, zoom, drag and ★ reach your
  own gradients through the same code rather than by convention. **L9 kept**: the rail
  appears with the second set, not before. **V3**: the lit chip is the accent; nothing else
  on the rail is. **V2 as amended**: a tile that has grown toward a box takes more rounding
  (8 → up to 20 px, capped by the wall at a third of the short side). **A candidate the
  walk should judge:** the count-driven tile steps on All (44 px under 1,500, 64 under 400,
  80 under 160, …) re-layout the wall at those thresholds while the pad is dragged —
  legibility bought with motion; if it reads as jitter, keep the steps for user sets only.
- 2026-09-08 · Phase D, the owner's second walk. **L4 amended:** "One memory" holds Recent,
  Kept and the named groups — Snapshots are removed (tray states are baked after every
  action; the gradient is already in Recent and Kept), so "Variants are Snapshots on the
  shelf" no longer applies. **The rail is the top of the ground, not its bottom edge**
  (hierarchy: which set · how it is narrowed · the tiles); L10 as proposed above should
  read "the ground is HEADED by the populations' names" if adopted. **V8 confirmed and
  applied to the wall:** selected = a 2 px accent stroke in place, no showcased copy.
  **V7/V8 extended in fact:** the gap between tiles scales with the tile as drawn (zoom or
  count), Padding being the floor.

- 2026-09-08 · Phase W (wallpaper; built, awaiting the owner's walk). **The goal's second
  clause is a principle, and it decides the UI: "its controls read without text, like the
  on-screen controls already there."** The geometry modes have no slider panel — `paramFields`
  exists only so the handle layer knows what to clamp to — so a new shape param is a HANDLE or
  it is nothing. Both new controls are handles, and both ride the thing they control: the conic
  twist handle sits ON the seam at the radius it winds, the radial waves handle ON a crest,
  where the pointer's own distance IS the amplitude with no gain to invent. **A handle must not
  move as the param it sets changes** — the petal COUNT first sat on the petals, so every lobe
  step threw the handle out from under the pointer and the gesture fought itself; it moved to
  the inner 50 % guide ring, whose radius no count can change. And the OUTER envelope is not a
  home for a handle either: at scale 1 it passes through the frame's corner, where `pin()`
  clamps it to the edge and an orbit has nowhere to travel. **A hidden control is a missing
  one:** the conic's `conicBiasA` has always been the bias the sampler reads with the mirror
  collapsed, but its handle rendered only when mirrored — the plain conic read as having no
  bias, which is why W.2 asked for one that already existed. **New laws are exported from the
  core, not copied into the layer** (`conicTwistTurns`, `radialSineReach`, joining `bias` and
  `archRadiusAt`), so the guide the user sees is drawn by the function that draws the pixels.
  **Twist follows the house's own log spiral** (`twist · log(1 + r)`, the fractal's "Angle:
  iteration log-spiral") rather than a new winding law — constant winding per radius decade, so
  the spiral looks the same at every scale. **W.4's channels are pure and live in `palette/core`**
  (`gradientMapChannels.ts`), not in the mode's `.tsx`, so seven colour-space definitions can be
  pinned on bare node without a canvas.

- 2026-09-08 · Phase W, the owner's perf + split pass (built same day). **The wallpaper follows
  the WORKING gradient now, through a seam rather than a branch.** The overlay resolved its live
  colour from `heroSelection` + `useGeneratorDerived` — the OLD shell's stores — so in v2 the
  split preview followed the wall PICK when there was one and otherwise froze on the snapshot
  `openFullscreen` was handed; editing the hero with the wallpaper open changed nothing.
  `setFullscreenLiveSource` (fullscreenStore) is now the host's hook and the overlay picks its
  resolver component by whether one is registered — two distinct component types, so the hook
  order stays stable and nothing is called conditionally. v2 registers `useWorkingDerived`,
  which also takes v2 off the Generator pipeline it was running on every overlay render and
  discarding (the migration audit's finding). **Measure before you optimise, and the measurement
  moved the target twice.** A full-res radial frame at 2560×1440 cost 341 ms: the field was 82 ms
  and the BLIT 259 — and of that blit only 73 ms was the error diffusion, the rest being a
  closure called three times per pixel that recomputed the clamp, the multiply and the floor for
  each channel and read colours through `.r/.g/.b` on an array of OBJECTS. Flattening the ramp
  into a typed array and hoisting the per-pixel work out of the channel loop: 259 → 171 ms,
  proven byte-identical against a verbatim copy of the old function across 48 cases. `Math.hypot`
  measured 23× the cost of `Math.sqrt(x*x+y*y)` for the same values (45 ms vs 2 ms of real work
  over 3.7 M pixels): radial 82 → 35 ms, arched 87 → 41. Conic is unchanged at ~71 ms and stays
  there — it is `Math.atan2`-bound by definition, and an approximation would change the picture.
  **A field that does not depend on the gradient must not be recomputed when the gradient
  changes.** W.4's OKLCh channels cost 420–500 ms a repaint against ~85 for luma, all of it
  `pow(x,2.4)` and `cbrt` re-derived per output pixel — and split mode changes the ramp on every
  edit. The channel field is now computed once per (image, channel) at the SOURCE's resolution
  and bilinearly resampled: 502 → 54 ms on the repaint that matters, and luma improved too
  (90 → 53) because a full-strength map no longer reads the source colour at all. One correctness
  consequence, taken deliberately: hue is an ANGLE, so its field is resampled wrap-aware — a
  plain bilinear between 0.99 and 0.01 lands on cyan, the colour furthest from both.

- 2026-09-08 · Phase W, the owner's mode-by-mode report ("linear, radial, conic, arched are
  quite slow · spline is performing well · even fractal is getting better fps · gradient map is
  fine"). **The report names the mode KIND exactly:** everything that renders on the GPU is
  fast (spline is `glQuad`, fractal is `ownCanvas`) and everything that does its BLIT on the
  CPU main thread is slow. Gradient map is CPU too but was never on the dithered path and had
  just been cached, so it reads fine. The four slow ones are precisely the `cpuField` kind —
  `presentField`'s only users. **The obvious fix is the wrong one, and the harness says so:**
  porting them to `glQuad` outright would trade serpentine error diffusion for the blue-noise
  tail, and `debug/test-dither.mts` measures that at WIGGLE 0.040 vs 0.238 — six times more
  banding on exactly the shallow gradients this tool exists to show. **The right one turns on a
  detail already in the code:** the overlay ALREADY drops the dither while anything is moving
  (`comp.dither = fs.dither && !fs.interacting`), so the expensive frames were the undithered
  ones. Those now render through a GLSL mirror (`modes/geometryFrag.ts`) and the still image
  still goes through `renderFieldDithered` — **no quality is traded anywhere**, and the moving
  frame is actually better than before because it gains the blue-noise tail it never had.
  Measured at 2560×1440: a live frame goes **120–151 ms → 0.8–2.3 ms**. A `settled` flag plus a
  180 ms idle timer decides which path runs, so a stream of edits coalesces into ONE expensive
  render at the end instead of one per change. **Two implementations of one law is the cost, and
  it is paid with a guard, not a promise:** `smoke:gx-geom-gpu` renders every geometry both ways
  at ten parameter sets and compares per pixel (clean tree: worst max 3 levels, worst mean
  0.750; flipping `BIAS_K` in the shader alone → max 115, three cases red). The repo's usual
  answer — export the law, call it from both — cannot cross the JS/GLSL boundary, so a
  comparison IS the seam.

- 2026-09-08 · Phase W, the owner's cull and three fixes. **Arched and Parallax are GONE**
  and Liquify is tagged unfinished rather than pretended finished — a `wip` flag on the mode
  seam, so the selector tags it and the stage banners it, and the next half-built mode gets the
  same treatment for free instead of a bespoke hack. Neither deletion needed a migration:
  `fullscreenStore` is session-only and the share URL does not encode the mode, so a retired id
  simply stops existing. **A geometry that leaves gaps is gone with Arched, and the coverage
  channel stayed** — `renderGeometry` still blends toward the background and the harness now
  proves that with a hand-built sample rather than leaning on a geometry that happened to mask
  pixels. A contract with no live consumer is exactly the kind that rots. **The radial count was
  wrong twice over** (owner: "its amount of symmetry / wave frequency selector feels weird, it
  should be on the same ring i think as the wave amp, and only softly notched, instead of
  integer gated"): it sat on a different ring from the amplitude it belongs with, and it was
  GATED to whole numbers. Both fixed — same ring, fixed bearing (a slot that tracked a crest
  would slide out from under the pointer as the count changed), and `softNotch`, which is exact
  at each whole petal, exact half-way between, and monotone throughout. **The first notch
  constant was too strong to be a notch:** 2.4 measured 211× slower at a whole petal than
  between two, which is a magnet; 1.8 gives 23×, a detent you can feel and leave. Numbers, not
  taste, because "softly" is measurable. **The spline's Extend took three attempts and the first
  two were wrong in an instructive way.** Letting the end segments project as rays INSIDE the
  Shepard sum did nothing: an inverse-square blend over ~50 tessellated segments washes toward
  their mean, so one extended segment is outvoted and the far field went the wrong way
  (measured). The extension had to be a separate answer computed OUTSIDE the diffusion — project
  onto the terminal tangent, then redistribute the whole span over the ramp. Straight path,
  Extend 1: the frame runs 0 → 255 rising the whole way. **And a slider that moves its own label
  and nothing else is not a slider** — the three spline knobs wrote to the mode's private store,
  which the overlay's `paint()` does not subscribe to, so the picture only caught up when
  something unrelated forced a repaint. They go through the `geomParams` gate now, which is what
  that gate is for.

- 2026-09-08 · Phase W, the spline sliders — two bugs stacked, and the second was mine.
  **The visible canvas is not always the canvas you are testing.** The spline editor portals its
  own live preview OVER the overlay's canvas inside the same stage, so the preview is what the
  user looks at — and it called `presentMode` with `params: {}`, an EMPTY bag, falling back to
  the mode's private store for Spread / Depth / Extend. That was harmless for as long as the
  sliders wrote to that store, and it became "the sliders do nothing" the moment they moved to
  the `geomParams` gate: the hidden canvas moved correctly and the visible one froze. Both
  canvases take the same params now. **The lesson for the guards, not just the code:** every
  measurement I took sampled `querySelector('… canvas')` — the FIRST match, the overlay's — so
  every one of them said the sliders worked while the owner was looking at a frozen picture.
  `smoke:gx-spline` [4] now asserts both canvases in the stage agree, and it is the only step
  that reds when the empty bag is restored. A stage with two canvases needs a guard that knows
  there are two. **And the wallpaper's sliders are the app's slider** (owner: "look at the hero
  gradient as an example of finished ui"): spline's three raw `<input type=range>` and Liquify's
  hand-rolled `Slider` are now `ScalarInput`, and the overlay wraps every mode's controls in
  `InputSkinProvider skin="soft"` — the same skin as the hero, the tray and the Browse filters.
  Fractal and Gradient map already used it, so one provider finished the set; the skin being a
  CONTEXT rather than a second component is what made that a three-line change.

- 2026-09-08 · Phase W, the spline's controls — and what the mapping's parameters SHOULD be.
  **A control on a gradient tool should change the MAPPING, not paint over it** (owner: "these
  are supposed to be gradient spline mapping controls"). Depth multiplied the colour toward
  black or white, which is lighting: it puts pixels on screen in colours the ramp does not
  contain. It moves the ramp COORDINATE with perpendicular distance now, so the field gains a
  second axis and every pixel stays a colour the gradient holds. **A slider whose top half all
  looks the same has the wrong range** — Spread's core reached 0.2 where 1.2 is where the wash
  actually happens. **Extend took three corrections, each of which taught something:** answering
  beyond-the-ends OUTSIDE the diffusion seams the field along the perpendicular through each
  endpoint and clamps into flat plates, so the extension has to be real polyline the blend can
  see; a blend that SUMS OVER SAMPLES changes when the sampling changes, so it must weight each
  segment by its LENGTH and be an integral instead; and extending must not restretch the ramp —
  the path keeps 0…1 and the extension repeats its END COLOUR, which is what a linear gradient
  does outside its stops and what "behave like a linear ramp" meant all along. **A guard written
  from a wrong premise is worse than none:** `smoke:gx-spline` [2] asserted the opposite
  behaviour (a ramp spanning the whole frame), measured it, and passed — it made the wrong
  design look verified.
  **The parameter set this mapping actually wants** (asked for, not yet built). The field is
  `t = Σ segT·len/(d² + core) / Σ len/(d² + core)`, so its natural degrees of freedom are:
  *(a)* the FALLOFF EXPONENT, hard-coded at 2 today — the single biggest look lever, taking the
  field from a soft wash (≈1) through today's diffusion to crisp nearest-point bands with
  medial-axis structure (≥4); *(b)* REPEAT and PHASE along the path (`t·repeats + phase`,
  wrapped), the classic ramp controls, which turn one gradient into stripes following the curve;
  *(c)* MIRROR / ping-pong on that wrap, so a repeat has no seam; *(d)* a WIDTH or falloff
  distance for Depth, so its second axis can be tuned independently of Spread's. Spread, Depth
  and Extend cover breadth, the perpendicular axis and the ends; (a) and (b) are what would make
  the mode capable of visibly different LOOKS rather than one look with three trims.

## 8b. Live-testing queue (from testers, 2026-09-09 — the first feedback on the deployed shell)

The v2 shell went online at **https://app.gmt-fractals.com/gradient-explorer-next** (0.9.8.3,
merge `690a3145`) and is NOT yet wired into GMT itself. These came back from real use. They are
ordered as written, not by priority — the owner decides the order and which of them belongs to
Phase F, Phase G or a phase of its own. File pointers were checked to exist on 2026-09-09; they
are where to START reading, not necessarily where the change lands.

> **Status 2026-09-09 (session 2; nothing above is rewritten).** All eight are DONE except
> where noted. Shipped on `main`, each with its own commit and, where the claim was pinnable,
> a falsified harness:
>
> | # | What shipped | Guard |
> |---|---|---|
> | 1 | Drop anywhere on the hero, projecting down onto the ramp, with a colour ghost. `t` is measured against the editor's knot track (`data-gx-knot-track`), not the ramp's outer box — an 8 px inset that made a drop above a knot miss it. Refused while the source is empty. | verified live: aimed 50.09 % → landed 50.09 %, one knot |
> | 2 | Minimap: lens spans the SELECTED region with the band's edges extended right to the bar; edges at 50 %; the band is now the SCROLL POSITION mapped into the reachable span, not a lightness range; field + strip chroma raised to sRGB's 0.32; empty-state text moved onto the map. | `npm run test:palette-lensband` |
> | 3 | First-run brightness dialogue, live-previewing behind a transparent backdrop. Also fixes the silent seed OVERRIDING an app-gmt user's brightness on first v2 boot. | `npm run test:ge-first-run` |
> | 4 | — not started (the migration audit's subject) | |
> | 5 | Shipped in session 4 (2026-09-09) — see the block under item 5 below | `npm run test:palette-exportsubjects`, `smoke:ge-hero` [5] |
> | 6 | `.gx-metal`: the Wallpaper sheen mixed from the scheme's ink + ground, so it inverts to a gunmetal on a light interface. Glyph measured 77 on dark, 236 on light. | — |
> | 7 | The out-of-bounds veil is a wash of ink, not `rgba(0,0,0,0.6)`. Fixed for every graph editor in the suite, not just Curves. | `npm run test:theme-scrim` |
> | 8 | The source image shows faithfully and large while the eyedropper is open — it samples what is painted. Transition skipped so a fast click cannot sample a half-grey pixel. | `npm run test:eyedropper` |
>
> **Three things worth carrying forward.**
>
> 1. **Item 2 was three separate bugs behind one symptom**, and the first two fixes each
>    revealed the next. "Not lining up" was the lens having no relationship to the selection
>    box at all; "not relating to the scroll" was the band being derived from which lightness
>    BANDS were on screen, which freezes outright when the wall is grouped (measured: still
>    at top 6 px through a 5,819 px scroll) and is coarse when it is not. The owner's call —
>    "just map it by scroll position and not by lightness" — is the one that holds.
>
> 2. **Verification that compares two suspects proves nothing.** The first minimap commit
>    reported the lens and the thumb aligned to 0 px across a scroll sweep. True, and useless:
>    both were frozen, and frozen things align. Assert that a thing MOVES before asserting
>    where it is.
>
> 3. **Three harness assertions passed under mutation and had to be rewritten** — one compared
>    a constant against itself, one claimed `"0"` catches a truthiness bug (it does not; it is
>    a non-empty string), one claimed to observe notifications it could not see. CLAUDE.md's
>    falsification rule earned its place three times in one session; a guard nobody has broken
>    on purpose is a guess about a guard.
>
> **Still open in this queue:** items 4 and 5, which are the migration audit's subject and
> want reading rather than re-deriving. (Both are closed as of session 4, 2026-09-09; this
> paragraph is left as written, per the append-only habit.) Item 8's visual half wants the owner's walk with an
> image loaded — a native EyeDropper needs a user gesture and cannot be driven headlessly.

> **Status 2026-09-09 (session 3): item 4 — the "more" panel's features belong in the wall.**
> The audit's M1-M4, M7 and M12 shipped, plus what the OWNER asked for on top of them once
> he had it in his hands, plus a defect that made the whole thing look broken. Guard:
> `npm run test:palette-shelf` (`debug/test-palette-shelf-manage.mts`, eight sections,
> falsified eleven ways — three of its assertions passed under mutation on the first attempt
> and were rewritten; the header names each).
>
> | What shipped | Where |
> |---|---|
> | **M2 Import a gradient file** — one shared path (`palette/core/importGradientFiles.ts`) that the panel's kebab, the rail's "Import into this set…" and a file dropped ANYWHERE on the shell all call. The drop shares the image importer's single window listener through a new `onOtherFiles` seam rather than racing a second one. | `importGradientFiles.ts`, `useImageDrop.ts`, `SetRail.tsx`, `GradientExplorerV2App.tsx` |
> | **M1 Export a SET** — the same `ExportMenu`, pointed at a set: a collection format bundles it, anything else is a .zip, the `.ai`/`.idml` lossy notice comes with it, and the contact sheet (OD2) takes the PNG strip's place. Deliberately ONE component, so §8b item 5's unified export grows from here. | `ExportMenu.tsx`, `exportActions.ts` |
> | **M7 Delete a group** — `removeGroup` re-homes its gradients to Kept as one run and says how many before you agree. Deleting a container must not delete what is in it. | `favientsStore.ts`, `SetRail.tsx` |
> | **M3 Per-item remove, rename and a keyboard path** in the panel — right-click a swatch (Rename · More like this · Remove), Delete on the focused one, a focus ring, and a tab stop on the list row. Grid-view rename works by switching to list and latching that row's editor, rather than growing a second rename affordance. | `FavientsPanel.tsx` |
> | **M4 The hero is a drag source** — its header is the handle (the ramp cannot be: it is the stops editor, and a drag there moves a knot). | `WorkingHero.tsx` |
> | **M12 More like this** on every wall tile, and a toast with an undo hint on tile-remove. | `BrowseStage.tsx` |
> | Audit §3.8a — **the clear-collection lockout**. The rail ROW is now always mounted (its chips still wait for a second set, L9), so the chevron — the only menu route to Import and Load & merge — cannot be cleared away. A dropped file is the other way back in. | `GradientExplorerV2App.tsx` |
> | Audit §3.8b — **the cross-host view-mode leak**. v2 claims its own panel key at boot. | `favientsPanelPersist.ts`, `main.tsx` |
>
> **What the owner added while testing, which is most of the value.**
>
> 1. **Sets are MULTI-SELECT** ("users should be able to select multiple user Groups at a
>    time — I suggest using the same ui but toggleable"). The chips toggle; the ground is
>    the UNION. Two rules keep it from being a mode, both in `palette/store/groundSet.ts`:
>    All is exclusive, and the selection is never empty. Ctrl/⌘-click is the inverse — only
>    this set — because with pure toggling, getting back to one of five would be four
>    clicks. The stored value is now a JSON array; a pre-2026-09-09 bare id still reads.
> 2. **A group can be CREATED empty** — the `+` at the end of the chips. It needed
>    `listGroundSets` to show a labelled group with no members, which also stops an emptied
>    group vanishing under the user.
> 3. **The ground is DIVIDED** ("when I select today + kept, there's no division between
>    them"). `GroundSource` gained `bands`, so the wall draws one labelled band per set. No
>    change in `PickerWall` was needed for the labels — it has always drawn a header for a
>    band that has one; a set simply never had one, because `SET_AXES` produces a single
>    band with an empty label.
> 4. **A tile can be dragged from one band to another** ("and I can't drag gradients from
>    one to the other"). The wall had NO drop target at all — it was a viewer with a
>    drag-out. Each band is now one, keyed by set id, filing through the same
>    `fileFavientInto` the rail's chips use.
> 5. **No hover-enlarge on large tiles** ("we don't need the huge mouseover previews when
>    the chips are so large"). It is a function of the tile width, not a setting: the
>    preview exists so a SMALL tile can be seen, and on a set the tile is already big — the
>    popover only covered the band you were reaching for.
> 6. **The drag avatar is back, simpler** ("it can be much simpler now"). New
>    `palette/components/GradientDragAvatar.tsx`: a 120×24 ramp at the cursor, no morph, no
>    spring, no landing — not a fork of the old shell's 442-line `GradientDropLayer`, the
>    part v2 needs. It reads a new drag-payload slot rather than the hero SELECTION, so a
>    drag never doubles as a pick.
>
> **Three things worth carrying forward.**
>
> 1. **THE BUG THAT MADE ALL OF IT LOOK BROKEN, and it was already shipped.**
>    `setFavientDrag` set `effectAllowed = 'copy'`; `SetRail`'s chip drop set
>    `dropEffect = 'move'`. A dropEffect the effectAllowed does not permit is reset to
>    'none' by the browser and **`drop` never fires** — silently, no error, no cursor
>    change. So dragging a wall tile onto a rail chip has never worked in v2, and the new
>    band drop inherited it. `effectAllowed` is now `'copyMove'`. Two things hid it: the
>    2026-09-08 audit traced the drag through the code and concluded it worked (the CODE is
>    right; the browser refuses it), and a synthetic-`DragEvent` harness never applies the
>    compatibility rule at all. **A synthetic drag proves the handlers; it cannot prove the
>    drop.** The owner found it in minutes with a mouse.
> 2. **A re-audit from a different question found what the first audit could not.** The
>    2026-09-08 audit asked "does v2 have this?" and counted the panel — which v2 mounts —
>    as the answer. Asked instead as "can you do this ON THE GROUND?", A13 (drag to reorder)
>    and A16 (trash) are panel-only, A14 is partial, and A9/A10's "genuine, improved" hid
>    exactly the missing division the owner hit within minutes. The classification was not
>    careless; the question was too weak. Both audits are on file.
> 3. **A literal NUL byte got into `useGroundSource.ts`** from a join key written through a
>    shell heredoc, which turned one source file binary to grep. `check:text-bytes` caught
>    it in about a second. Run it after any scripted edit.
>
> **Still open in this queue:** item 5 (one unified export — a design job, and the set leg
> of it now exists to build on). From the re-audit, still true and not built: drag to
> REORDER within a band to an exact position (the panel's `insertIndexFromPointer` +
> placeholder has no ground equivalent — the biggest remaining gap), rename a gradient from
> a wall tile, a trash target on the ground, multi-select of TILES on the wall (the carve
> machinery already computes an id-set — turning that into "move these to a group" is the
> cheapest batch-organise there is), and M14's arrow-key navigation.

> **Status 2026-09-09 (session 3, second pass): the ground becomes an ORGANISER.** The five
> gaps the re-audit named, all of them things the old My Gradients panel could do and the
> wall could not. Guard: `npm run test:palette-shelf`, now nine sections, falsified fifteen
> ways in total.
>
> | # | What shipped | Where |
> |---|---|---|
> | 1 | **Drag to REORDER inside a band, to an exact position**, with a live insertion caret — the panel's `insertIndexFromPointer` gesture, asked of a canvas. The anchor travels as an ID (`beforeId`), not an index, so a wall narrowed by search still means the gradient you can see; the panel disables reordering while filtered for exactly the reason this avoids. Offered with one set lit (reorder) or several (move between). | `PickerWall.tsx` (`insertIndexAt`, `caretBox`), `favientFiling.ts` (`fileFavientAt`) |
> | 2 | **Multi-select, and act on it.** A left-drag from the BACKGROUND is a rubber band — no tool, no mode (owner: "it should just be when dragging from the background"; the first cut put it behind the Box tool and that was wrong). Shift or Ctrl at press unions, so a selection can grow past the fold — a marquee can only ever reach mounted tiles. Dragging any selected tile carries the batch; the bar offers Move to… (any group, or a new one) and Remove. Esc or a background click clears. | `wallSelection.ts` (new), `usePickerModel.ts`, `PickerWall.tsx`, `BrowseStage.tsx`, `favientFiling.ts` (`fileFavientsAt`), `favientsStore.ts` (`replaceAll`) |
> | 3 | **Rename from a wall tile** — a small input over the tile. The panel's LIST view is where names have always lived; this stops the ground sending you there to find one. | `BrowseStage.tsx` |
> | 4 | **A trash on the ground** — it appears in the rail while an existing favourite is in flight, and only then: a catalogue tile is not yours to throw away. Needed a real `trash` icon, which closes the §10 Phase-A note about the panel's two 🗑 glyphs having no icon to use. | `SetRail.tsx`, `ui/Icon.tsx`, `dragVisual.ts` |
> | 5 | **Keyboard navigation** (M14) — Tab focuses the wall, arrows move a cursor ring that is deliberately NOT the pick, Home/End jump, Enter picks, Delete removes. Additive prop, so app-gmt opts in separately. Scroll-into-view works even onto a tile whose canvas is unmounted, because the virtualized chunks keep their wrapper and now carry their geometry as data attributes. | `PickerWall.tsx` |
>
> Plus, from the owner's walk: **the wall had no left margin on a set** ("the user areas are
> very tight against the edge") — the gutter was set to 0 because a set draws no row labels,
> so the tiles ran into the window edge, out of line with the rail chips and the header. It
> is 24 px now, the shell's own gutter, using the mechanism that was already there. And a
> **top** margin on both grounds, which had to go on the SCROLL BOX rather than the content:
> the content div carries the live zoom transform, so padding inside it is multiplied by the
> zoom — 12 px becomes ~190 px at 16× and the wall lurches mid-gesture.
>
> **And the marquee had to learn what it is not.** "When dragging around gradients they
> shouldn't become selected" — a press that missed a tile by a pixel landed in the 1 px gap
> between two of them, `entryHitAtPoint` said "no swatch here", and the rubber band started
> over the very gradients you were reaching for. The background test is now COARSER than the
> swatch test on purpose (`pointOverTiles`: anywhere inside a chunk's box is the tiles, only
> past their edges is the ground), and a native `dragstart` anywhere aborts a marquee already
> in progress — the two gestures begin identically and only the browser knows which it is.

> **Status 2026-09-09 (session 3, third pass): the list view, and the real cause of
> "gradients get selected whenever I drag".**
>
> **The bug was never the marquee.** Two guesses were spent hardening the rubber band — a
> coarser background test, an abort on `dragstart` — both reasonable, neither the cause. A
> PROBE settled it in one reading: four real drags, `pointerdown → dragstart → drop →
> dragend`, and the selection count stayed 0 the whole way. What the owner was seeing was
> the PICK: `usePickerModel.onEntryDragStart` ended with `setHeroDrag(...)`, "drag mirrors
> click", and in v2 **a pick is a Use** — so merely dragging a gradient to re-file it
> replaced the one you were working on and ringed it on the wall.
>
> That line had two reasons behind it, and neither survives in v2: the avatar used to take
> its ramp from the hero pick (it now reads its own payload slot, `setDragPayload`), and the
> old shell's `DropTargetLayer` reads the pick to route a dropbox drop (v2 mounts no such
> layer). So it is now `pickOnDrag`, defaulting TRUE on both `usePickerModel` and
> `FavientsPanel` — every host built before today keeps exactly what it had — and v2 passes
> false at both call sites. Measured after: picking one gradient and then dragging another
> leaves the hero's name unchanged.
>
> **The lesson, which cost two commits:** when a report says "X happens", find out WHICH X
> before hardening the thing you last touched. The marquee was the newest code and therefore
> the first suspect, and being new is not evidence. A ten-line probe on the real gesture beat
> two rounds of reasoning about the code — and both marquee fixes, while not the cause, are
> correct on their own terms and stay.
>
> **The GROUND now has a list view** (`gradient-explorer/v2/GroundList.tsx`), which the owner
> had asked for once already and had to ask for twice: "there is a list view option as well —
> that's how you'll find names that can be renamed". It was read as a pointer to where
> renaming lives rather than as a request, and it was neither. The wall draws bars, which is
> right for choosing by colour and wrong for finding one you NAMED; the shelf panel has had
> the toggle all along, so the only way to read your own names on the ground was to open a
> floating panel over the wall you were looking at.
>
> It is the panel's list ANATOMY, not its code — a 56 px strip, the name, a muted
> `source · group` caption — and a separate component on purpose: the wall is a canvas with
> one `drawImage` per tile out of a shared sprite, virtualized by chunk, and rows are DOM.
> Sharing one component across those would fork every hit-test. What IS shared is everything
> that matters: the same entries, pick, drag payload, selection store, context menu and
> filing rule. Set grounds only — 11,131 catalogue rows would want virtualizing, and the
> catalogue's entries carry no name of yours to look for. Rows being real elements, the
> keyboard comes free, and ctrl / shift-click select the file-manager way.
>
> **Still open, stated so nobody has to re-derive it:** §8b item 5 (one unified export);
> app-gmt has not opted into the wall's `keyboard` prop (additive, deliberate); the pull-up
> panel still shows the WHOLE shelf rather than the lit sets (re-audit §4.3); the old
> shell's landing / cancel morphs are still unmounted in v2 (`GradientLandingLayer`, ~143
> lines, the cheapest polish left); and `FavientsPanel layout="strip"` is still dead with
> zero callers (S13, ~115 lines to delete).

> **Status 2026-09-09 (session 3, fourth pass): three from the owner's walk.**
>
> 1. **Presets is a chip again.** It used to disappear the moment Recent had anything in it
>    — the deleted shelf strip's rule, inherited on the grounds that Presets is "a starter,
>    not a place the user made". On a one-row strip with no room that was a fair trade; on
>    the rail it means twenty-five gradients vanish on your first pick with no way back to
>    them. The rail has room. `test-palette-groundsets`' assertion was inverted with a note
>    saying why, rather than deleted.
> 2. **Delete acts on the SELECTION, from anywhere on the ground.** It was wired only to the
>    wall's keyboard cursor, and a marquee focuses nothing — so after choosing six tiles the
>    key did nothing at all. It is a window listener now, owned by the selection whenever
>    there is one (the wall's cursor keeps the no-selection case, and stands down otherwise
>    so the two cannot both fire); it skips inputs, so the rename boxes and the search field
>    are safe. One `replaceAll`, one undo entry, however many were chosen. Measured: 43 → 41
>    on a two-tile marquee, bar cleared.
> 3. **The marquee starts from the padding between gradients again.** Two passes ago the
>    background test was widened to "anywhere inside a band's box counts as tiles", to stop a
>    press that missed a swatch from rubber-banding. That was the wrong cure for a disease
>    that turned out to be `pickOnDrag` — and it cost the gaps and the padding, which are
>    exactly where you would start a selection. Back to the precise swatch test; the
>    `dragstart` abort is the guard that actually earns its place.
>
> The through-line for all three: **each was a rule that made sense on the surface it was
> written for and stopped making sense on this one.** Presets-hides was a strip rule; the
> Delete key was written for a keyboard cursor before there was a selection to act on; the
> coarse background test was written for a bug that was somewhere else entirely.

> **Status 2026-09-09 (session 3, closed): the "more" panel is retired.** Owner: "we can
> retire almost the whole 'more section' except for its dropdown menu."
>
> `FavientsSystemMenu` was lifted out of `FavientsPanel` unchanged, as
> `palette/components/FavientsCollectionMenu.tsx`, and now hangs off the right end of the
> set rail. v2 mounts no `FavientsPanel` at all. The panel keeps mounting the same component
> in its own toolbar for app-gmt, fluid-toy and the old shell — one component, two hosts,
> not a fork.
>
> **Why the menu is the only survivor.** It is the one surface that acts on the WHOLE SHELF
> rather than on a set or a gradient — import a file, save / merge / replace / clear the
> collection, export it, the contact sheet. Everything else the panel did now lives where
> the gradients are: grouping and dividers on the rail and in the wall's bands, search in
> the wall header, list view and rename in `GroundList`, drag-to-reorder on the bands,
> trash on the rail, per-item remove in the tile menu and on the Delete key. OD1 asked
> whether to trim the panel or keep it whole; the answer turned out to be neither — build
> its jobs into the ground, then there is nothing left to trim.
>
> **What went WITH it, deliberately.** `setV2FavientsPanelKey` and its harness section
> guarded a cross-host grid/list leak (the audit's §3.8b) that existed only because v2
> mounted the panel. With the panel gone the fix guards nothing, so it was removed rather
> than left as a vestigial export with a test behind it. **The leak is real and would return
> the moment anything re-mounts `FavientsPanel` in v2: it never calls `restoreFavientsPanel`,
> so `activeStorageKey` stays at app-gmt's key and the two hosts' shelf layouts write over
> each other.** Recorded here so it is not re-discovered from scratch.
>
> Two more removed for the same reason: `FAVIENT_MULTI_MIME` was written on every multi-drag
> and read by nobody, and `DragPayloadPeek.count` was set and never shown. The MIME is gone
> (three lines to re-add when a drop target actually needs to say "3 gradients" during
> `dragover`, where `getData` is blocked); `count` earned its place instead — the avatar
> carries a badge and the trash reads "Remove 3", so a six-gradient drag no longer looks
> exactly like a one-gradient drag. That was the same class of bug as having no avatar at
> all: the gesture doing more than it appears to.
>
> Also folded in: `favientDropName` in `favientFiling.ts` is now the single naming rule for
> every drop (the panel's private `addName` went with the extraction), so a gradient filed
> by a rail chip, a wall band or the panel reads identically.

> **Status 2026-09-09 (session 3, addendum): the hero's ramp is a drag-out zone.** Owner:
> "dragging from the main hero — if drawing a selection a bit past the knot area, we should
> start dragging the gradient, taking care that the selection is still available for part of
> the way in case they want to turn back."
>
> A ZONE rule, decided at press time, not a mid-gesture hand-off — and the owner chose it
> knowing the difference. **HTML5 cannot hand a running gesture over to a native drag:**
> `dragstart` only fires from a press on a `draggable` element, so once the knot marquee is
> under way on mouse events there is no way to convert it. A true "drag 40 px past the knots
> and the gradient lifts" would need a second, pointer-driven drop path with its own
> hit-testing and target highlighting, in parallel with the HTML5 one every rail chip, band
> and trash already speaks. Two mechanisms to keep in step, for one gesture.
>
> So: `AdvancedGradientEditor` gains `marqueeReach` (px past the knot track's box, default
> `Infinity` — every other host marquees anywhere in the editor exactly as before). Inside
> the reach a press starts the selection marquee and `startDrag` preventDefaults it, which
> suppresses the ancestor's native drag. Outside it the editor does not take the press AT
> ALL — no consume, no preventDefault — so the hero's ramp wrapper, now `draggable`, starts
> a drag of the whole gradient.
>
> **The margin IS the "part of the way back":** a press that misses the knots by a little
> still selects, and a marquee under way can be dragged toward them. 20 px on the hero,
> which leaves the top ~40 px of the 60 px ramp as the drag-out zone.
>
> Measured in the app at three heights over the track: inside it → consumed (knots), 10 px
> above → consumed (marquee), 45 px above → NOT consumed, and a `dragstart` from there
> carries `application/x-gmt-favient` with the avatar showing and the hero unchanged.

> **Amended, same day: the zone rule was wrong and was replaced.** Shipping it and watching
> it used took about a minute to falsify — "the gradient drag is swallowing drags that
> should be selecting knots". Deciding at PRESS time cannot work, because where you press to
> start a knot marquee is exactly where you press to pick the gradient up: the empty ramp
> above the knots. No margin makes those two different gestures.
>
> **So it is decided by TRAVEL, the long way.** `AdvancedGradientEditor` gains
> `marqueeEscape` (px past the knot track, default `Infinity` — every other host is
> untouched) and `onMarqueeEscape`. A marquee that crosses it SUSPENDS — stops drawing,
> stops selecting — and tells the host; come back inside and it resumes. Nothing commits
> until mouseup, and a mouseup while escaped commits nothing, so the whole gesture is
> reversible in both directions. 44 px on the hero.
>
> **The gradient drag it hands to is `palette/core/pointerGradientDrag.ts`, and it is NOT a
> second drop path.** It builds a real `DataTransfer`, fills it with `setFavientDrag` exactly
> as a native drag would, and then DISPATCHES the ordinary `dragenter` / `dragover` /
> `dragleave` / `drop` / `dragend` at whatever is under the pointer. Every existing target
> answers with the handlers it already has — the rail's chips, tail and trash, the wall's
> bands, `GroundList`'s rows — and acceptance follows the spec, a target claiming the drop by
> preventing the dragover's default. One drop implementation, reached a second way. The
> avatar comes free: it reads the same payload slot and tracks the same `dragover` events.
>
> **And a stale-closure bug worth remembering.** The avatar came up holding the PREVIOUS
> gradient. `handleMouseMove` in the editor is a `useCallback` memoised on `[emitChange]` and
> lives as a window listener for the whole gesture, so the host callback it closed over was
> several renders old — and that callback closes over `shown.config`. Read through a ref and
> it is current. Any prop a long-lived listener calls has this shape; the file's existing
> `knotsRef` / `dragPayloadRef` are the same defence.
>
> Measured in the app: press above the knots → marquee; travel 150 px down → marquee gone,
> avatar up carrying the CURRENT gradient (sampled: 42,5,147 → 162,31,152 → 236,116,85 →
> 249,228,0, which is Plasma, which is what the hero showed); come back → marquee returns;
> release on Kept → Presets 26→25, Kept 9→10, so it MOVED; release over the top bar → 0
> drops, shelf unchanged; exactly 1 drop per drag.

> **Four small ones, same day.** Band headers on a personal set get room to read as headings
> (`spaciousBands` — the catalogue's category bands stay tight, because there are hundreds
> of them and few of these). The map's line drops "click it again to keep and edit it": it
> taught the SECOND gesture before the first had been made, and reads "Click a gradient to
> start · or pick a colour range", which also says what the pad beside it is for. The arrange
> sentence no longer says "ungrouped" — it was naming the absence of a thing the reader had
> not been told about; with no grouping it now says nothing about grouping. And the Filters
> button wraps ONTO THE LINE ABOVE the search field when the row runs out of width, rather
> than squeezing the field: measured side-by-side at 1600 px, wrapped at 1021 px.

> **Status 2026-09-09 (session 3, addendum 2): the GX GLOBAL set — read-only, shipped.**
> Owner: "a 'GX global' group that is a shared resource between anyone that uses the app."
>
> **A chip on the rail, right after All, holding gradients everyone sees.** 20 to start,
> curated by name in `debug/bake-gx-global.mts` and shipped as `public/palette/gxglobal.json`.
> Fetched once per tab, CDN first with the shipped copy as the fallback — not optional, that
> one: `cdn.gmt-fractals.com` sends no CORS headers to `dev.gmt-fractals.com` or
> `localhost:3499`, and the licensed packs' missing local fallback is exactly why a /dev walk
> silently loses 11,131 gradients. A brand-new feature should not repeat that scar.
>
> **Read-only, and that is a scoping decision, not an oversight.** Making it writable is not
> a hookup. This project has a complete Supabase + auth stack — profiles, admins, RLS with
> no INSERT policy anywhere and every write behind a service-role Edge Function, a moderation
> queue — and **the Gradient Explorer's bundle contains none of it**: `grep supabase|authStore`
> across `gradient-explorer/` and `palette/` returns zero. Writes would mean porting sign-in
> into a page that has never had it, and answering four things the code cannot: moderation of
> the free-text NAME field (the one real abuse surface — a gradient is otherwise harmless),
> what a duplicate submission means (`favientSig` is the right key, the behaviour is not
> decided), who decides the ORDER when no user owns it, and a size cap (real ceiling:
> `groundSets`' body cache clears wholesale past 4,000, and `favientsToEntries` renders every
> ramp synchronously when the set is selected). All four are the owner's, not the compiler's.
> The transport is one module; swapping it for a Supabase query changes nothing above it.
>
> **THE SAFETY ARGUMENT IS ONE LINE, and it is the finding worth carrying.** A shared tile's
> `itemOf` omits `favId`. A tile without one already reads as "not yours" everywhere in this
> app — the rail's trash refuses it, a drop FILES A COPY instead of moving it, the drag
> payload carries no shelf identity, Delete finds nothing to remove. It is the catalogue's own
> contract, reused rather than re-guarded. Giving the set its own `kind: 'global'` does the
> rest for free, because every refusal in the shell was already written against
> `kind === 'group'`: drops, rename, delete, reorder. Calling it a `catalog` would have worked
> too and been a lie in the type.
>
> **A real bug fell out of the review, and it was live before any of this.**
> `BrowseStage.removeFavourites` built its id set from the selection and called `replaceAll`
> unconditionally. With a selection of tiles that are not on the shelf — a catalogue tile, or
> now a shared one — it deleted nothing but still wrote localStorage, notified the store,
> pushed an EMPTY undo entry and toasted "Removed 3". Fixed once, in that one function, since
> all four triggers (the bar's button, the Delete key, a list row, the tile menu) go through
> it. Measured after: 20 shared gradients selected, Delete pressed, `gmt.favients`
> **byte-identical**, no toast.
>
> Also measured: dragging a shared tile onto Kept COPIES it (11→12, GX global still 20, and
> the payload carries no `favId`).
>
> **Deliberate, so it is a decision and not an accident:** the shared set DOES export
> (`Export this set…` on its chip). It is a public resource and taking a copy of it is the
> point. And it survives *Clear collection*, being the one set that is not in the collection.
>
> **Still open for whoever makes it writable:** everything in the paragraph above, plus the
> Edge Functions' CORS allowlist has the same `dev.` hole as the palette CDN's, and
> `0001_security_baseline.sql` warns its policies were reconstructed from the live catalog
> and should be diffed before trusting.

> **Status 2026-09-09 (session 3, addendum 3): GX global goes OPEN — anonymous writes, no
> sign-in.** Owner: "read only doesn't work for this goal… we will need this to be totally
> open with no sign in for it to succeed… no names, no duplicates… otherwise best by the
> regular filters hue, lightness."
>
> Backend in the sibling repo (`workspace-gmt/backend`, commit `87c1a72`):
> `supabase/migrations/0005_gx_gradients.sql` and `supabase/functions/gx-gradients/`.
> **DEPLOYED and live, 2026-09-09.** `0005` applied (the dry run listed only it and the
> already-live `0004`, which replayed as a no-op — the payoff of writing migrations
> idempotently), `GXGLOBAL_IP_SALT` set, function deployed `--no-verify-jwt`. The owner made
> the first contributions and they round-tripped: two rows, 34 stops on the first, bias and
> interpolation preserved, colours canonicalised.
>
> Verified against the LIVE function before the app was pushed, by sending it bad input: one
> stop → `400 a gradient needs between 2 and 64 stops`; `"not a colour"` → `400 every stop
> needs a #RRGGBB colour`; position -5 → `400 every stop needs a position between 0 and 1`;
> no stops → `400 stops must be an array`; `DELETE` → blocked at the preflight, since
> `Allow-Methods` is `GET, POST, OPTIONS`. That proved reachability, the salt (a missing one
> 500s), CORS from a real browser origin, and the `{error}` contract — **without writing a
> public row**, which is the one branch that cannot be tested without meaning it.
>
> Two deploy notes for next time, both cost a round trip: the CLI is a devDependency of the
> backend repo, so it is `npx supabase` **run from that directory** — it finds the project
> ref by walking up for `supabase/config.toml`, and from `stable/` there is none, which
> reports as "Cannot find project ref. Have you run supabase link?". And the shell there is
> `cmd.exe`, where `$(...)` does not substitute and `<placeholder>` is read as redirection.
>
> **The shape, and why.** ONE anonymous endpoint serving both halves, the `ragrat-scores`
> pattern. Reads come through the function rather than a select policy, and that is the
> load-bearing decision: this bundle has no supabase-js and no auth, and the feature depends
> on keeping it that way — a select policy would put an anon-key PostgREST client in a page
> that has never had one. `engine-gmt/feedback` already POSTs anonymously from this same
> bundle with a bare `fetch`, which is the proof the shape works here. So the table keeps
> `ragrat_scores`' posture: RLS on, ZERO policies, service role the only door, and nothing
> granted to `anon` — including the `revoke` that `0003` and `0004` both omitted.
>
> **What stands in for a login.** No names: a row is stops and two colour spaces, so a
> gradient cannot say anything and there is nothing to moderate — the one problem this
> codebase has no answer for on an anonymous path. No duplicates, enforced by
> `unique (sig)` with the signature computed SERVER-side from a canonicalised copy (stops
> sorted, hex expanded and upper-cased, positions rounded), because a client-side dedupe
> check may be loose and a uniqueness constraint may not. Two different caps: per-IP per hour
> (6 — far below ragrat's 30 and share-scene's 40, because this set is permanent, global and
> small) and a cap on the SET itself, which a per-IP limit does not bound at all. And real
> schema validation rather than `share-scene`'s marker sniff, which exists only because GMF
> is a large opaque blob.
>
> **Two things the audit of the existing code changed in the design.**
>
> 1. **`share-scene`'s anonymous dedupe has a latent bug and it must not be copied.** It is a
>    read-then-insert with no unique index behind the anon rows, and its own migration
>    concedes "a rare concurrent-identical race just makes a harmless duplicate row". Harmless
>    there. Here every row is anonymous and no-duplicates is the requirement — and a second
>    identical row would make that gradient's `.maybeSingle()` dedupe query error **forever
>    after**, 500ing every future submission of it. So: a real unique index, and the `23505`
>    branch answers "already in the set" rather than failing.
> 2. **The set cap has no precedent in this schema** — the gallery's caps are per-user slots
>    — so it gets both a function check and a trigger. The ceiling is not arbitrary: the
>    client renders every ramp and computes every facet on the main thread when the set is
>    selected, and `groundSets`' body cache clears wholesale past 4,000.
>
> **Ordering: dedupe BEFORE the rate limit.** A repeat submission is answered, not charged.
>
> **The gesture is a drop on the chip** — the same one that files a gradient into a group of
> your own, because it means the same thing, except this shelf is everyone's. It asks first
> (public, no un-sending) and is deliberately NOT undoable: nothing local changed, so there
> is nothing for Ctrl+Z to put back, and your own copy stays where it was.
>
> **The client falls back three deep**: the endpoint, then the CDN copy, then the file
> shipped in `public/palette/`. Measured with the endpoint absent: one warning, chip still
> shows 20. That last copy is not decoration — `cdn.gmt-fractals.com` sends no CORS headers
> to `dev.gmt-fractals.com` or `localhost:3499`, and the Edge Function's allowlist is a
> config line that can be forgotten on a deploy.
>
> **Still open, and the owner's to decide:** `dev.gmt-fractals.com` is on this function's own
> allowlist but not on `_shared/cors.ts`' or the palette CDN's; whether "no duplicates" should
> also fold mirrored or near-identical gradients (today it is exact-after-canonicalisation);
> and `0001_security_baseline.sql` warns its GRANT lines were reconstructed from the live
> catalog and should be diffed before anything is pushed.
>
> **Three things worth carrying forward.**
>
> 1. **The multi-drag payload is ADDITIVE, and that is the whole design.** `favIds` rides
>    alongside the existing single-gradient fields, which still describe gradient one. Every
>    drop target that knows nothing about batches — the shelf panel, the send-target routing
>    layer, the hero — files exactly one, which is the old behaviour rather than a break.
>    Making the payload itself an array would have failed `readFavientDrag`'s validator and
>    broken all four consumers at once. Ids, not configs: on a set every dragged tile is
>    already a favourite, and fifty inlined stop lists is a large string on a DataTransfer.
> 2. **A batch move is ONE splice, not a loop.** `fileFavientAt` resolves its anchor against
>    the array it just mutated, so calling it six times interleaves or reverses them and
>    writes localStorage six times. `fileFavientsAt` computes the index once and hands the
>    whole run to a new `replaceAll`. The harness's "B stays ONE contiguous run" assertion
>    is what catches the loop version, and it went red on exactly that mutation.
> 3. **The selection's Set must be reference-stable.** The wall's tile paint is a per-swatch
>    `drawImage` loop with the Set in its dependency array and `React.memo` on every band, so
>    a fresh Set per render repaints every mounted chunk. `wallSelection` publishes a new
>    frozen Set only on a real change, and the harness pins it — a no-op write that publishes
>    is a performance bug that looks like nothing at all.
>
> **Still open:** item 5 of §8b (one unified export — a design job, with the set leg built).
> **Closed in session 4, 2026-09-09** — see the status block under item 5.
> From the re-audit and not built: the panel's own list view has no equivalent on the ground
> (deliberate — the wall draws bars, and the panel is where names live); the wall's
> `keptIds` carve remains catalogue-only; and app-gmt has not opted into `keyboard`.

1. **A dropped swatch should land anywhere on the gradient, not only on the bottom bar.**
   Colour drag-and-drop works today only over the ramp strip. The payload and its MIME type are
   `components/gradient/colorDrag.ts`; the editor's drop handling and `dropColourAt` are in
   `components/AdvancedGradientEditor.tsx`, and the hero's palette swatches are drop targets via
   `gradient-explorer/v2/PaletteRow.tsx`. The ask is to widen the target to the whole gradient
   area — which means deciding what "the gradient" is when the hero is showing source bands
   (Mix) or an image slot, since a drop there is ambiguous today.

2. **The minimap wants rework — its look and its focus.** `palette/components/HueLightnessPad.tsx`
   (the pad, which since Phase D paints whichever pair of colour axes the Arrange state selects)
   plus `gradient-explorer/v2/ui/MapScrollbar.tsx` (the lens + scrollbar beside it) and the
   `padAxes` table in `palette/core/padAxes.ts`. "Focus" is the owner's word and needs unpacking
   before code: whether it means the lens's precision, what the pad is FOR at a glance, or both.

3. **A first-run dialogue to set interface brightness.** The runtime theming this would drive is
   ADR-0080 (`docs/adr/0080-runtime-color-scheme-system.md`), `engine/store/colorSchemeStore.ts`
   and `components/ThemeControls.tsx`; v2 already seeds its light-grey scheme once behind
   `gmt.ge.themeSeeded` (grep it). New surface: a first-visit modal with one slider. Note the
   shell has no first-run modal today, so this sets the pattern for any that follow.

4. **The "more" panel's features belong in the wall.** This is the migration audit's subject —
   `plans/ge-v2-old-shell-migration-audit.md` names 15 MIGRATE items with sizes and hosts, and
   the top of its list (whole-SET export, importing a gradient file, per-item remove and a
   keyboard path, the hero as a drag source) is exactly this. Read that before starting; it is
   the one piece of planning already done for this queue.

5. **One unified export.** Today: `palette/core/exportFormats.ts` (the format registry and stop
   budgets), `gradient-explorer/v2/ExportMenu.tsx` + `exportActions.ts` (the gradient's export),
   and `palette/core/favientsExport.ts` (the shelf's, reached through the "more" panel's kebab
   and always whole-collection). The ask is ONE export that covers a gradient, a palette, and a
   SET — which is a design job first: three things with different natural formats behind one
   surface. The audit's OD2 (does the contact sheet stay) and its "whole-set export" item are
   part of this, and `membersOf` in `palette/core/groundSets.ts` is the one-line substitution
   that makes a set exportable.

   > **Shipped 2026-09-09 (session 4). ONE WINDOW, TWO AXES.** The design job resolved into
   > this: every export in the app is a cell in a 2×2. *What* is taken — the **RAMP** (the
   > continuous gradient) or the **SWATCHES** (the palette composed on the hero) — crossed
   > with *how many* — this one, or a whole set. That covers the three nouns this item names
   > and hands back the fourth, a set's palettes, for free.
   >
   > **The observation that unlocked it.** The suite had ONE subject shape — a 256-step ramp —
   > and every format was written against it. Which is why a GIMP *palette* export emitted 256
   > entries and Paint.NET 96: formats that are really about a set of colours were being handed
   > a continuous gradient and left to invent their own sampling. The palette face already
   > existed on the hero (`PaletteRow`, `workingStore.positions`) and is exactly the input
   > those formats want. So "a palette" was never a third noun needing a third window — it is
   > the second face of the noun already there.
   >
   > | What shipped | Where |
   > |---|---|
   > | **The subject axis.** `ExportFormatDef` gained `swatches?: (colors, stem)` beside `build`, and `formatsFor(subject)` is the one place the offer is decided: a format appears under Swatches iff it carries that builder. **The registry's shape IS the filter** — there is no second list in the window to fall out of step with it. | `exportFormats.ts` |
   > | **`build` stayed required, and stayed exactly what it was.** The old shell's Extras panels (`GeneratorExtrasPanel`, `ImageExtrasPanel` — still what GMT reaches) iterate the registry and call `.build` unconditionally, and `test:palette-importformats` re-parses .gpl / .map / .ggr / .cpt / .json from their 256-entry ramp form. Both would have broken under a "replace the builder per subject" design. `build` gained an optional `stem` so a Tailwind file downloaded as `ember.js` says `ember`, not `gradient`. | `exportFormats.ts` |
   > | **Four swatch-native formats**, closing Phase G's S5 line: **`.ase`** (Adobe Swatch Exchange — the interchange every Adobe app reads, and the reason a designer opens this window at all), **Tailwind**, **design tokens (W3C DTCG)** and **CSS variables**. Each has both faces: the swatches form is the honest one, the ramp form samples it. At exactly eleven colours the three scale formats emit the idiomatic 50…950 keys; at any other count, 1…N. | `exportFormats.ts` |
   > | **`.ase` is the only swatches format that BUNDLES** (`collectionSwatches`), because grouping is part of that format — a set of twenty palettes stays one file with twenty named folders in Illustrator's panel. Everything else zips, and the button says which. | `exportFormats.ts`, `favientsExport.ts` |
   > | **The set grew the same two faces**: `setSwatches` / `buildSwatchZip` / `buildSwatchCollectionFile`, plus `buildSwatchSheet` — the palette as labelled hex chips, one row per gradient, which is the artefact people paste into a brief. It takes `NamedSwatches[]`, so one gradient and a whole set are the same drawing rather than two functions that will drift. | `favientsExport.ts` |
   > | **OD2 answered: the contact sheet stays**, as the RAMP subject's image row. The swatch sheet is the SWATCHES subject's, not a replacement. | `ExportMenu.tsx` |
   > | **`.ase` now carries the lossy notice** `.ai` does. It reduces at the same 40-stop budget (`ASE_MAX` is defined as `AI_MAX` for exactly this reason) and was warning-free, which is the one thing that notice exists to prevent. | `favientsExport.ts` |
   >
   > **The one real asymmetry, stated so nobody re-derives it.** WHERE THE COUNT COMES FROM.
   > For the working gradient the swatch row IS the control and it lives on the hero (L2), so
   > the window exports it exactly as laid out and offers no count of its own — it says so in
   > a caption and points back at the hero. A set has no composed row (it is other people's
   > gradients), so it gets one stepper and the rule places them. Everything else about the
   > two "how many" cases was already the same and stayed that way.
   >
   > **Two layout defects found by measuring rather than by looking.**
   >
   > 1. **The window was squashing its own children.** `Floating` is a flex COLUMN that
   >    scrolls, and the default `flex-shrink: 1` means that once the content passes `max-h`
   >    every child is compressed instead of the box scrolling. Measured: the new subject
   >    segments came out **2 px tall** — their two borders — with the 28 px buttons clipped by
   >    their own `overflow-hidden` and the group headers below painting over where they
   >    should have been. `[&>*]:shrink-0`. It was latent before this change; taller content
   >    is what made it show.
   > 2. **`max-h-[70vh]` was a ceiling on the wrong number.** Both call sites position the
   >    window absolutely inside a container the page has already pushed down. Measured with
   >    the set window at y=345 in a 930 px viewport: 70vh ran it **66 px past the bottom
   >    edge**, with no way to reach the last rows. The ceiling is measured from the window's
   >    own top now.
   >
   > **Guards.** `npm run test:palette-exportsubjects` (`debug/test-palette-exportsubjects.mts`,
   > a link of `test:palette`) — seven sections, falsified seven ways. Its heart is an **.ase
   > READER written against the published block layout and independent of the writer**: it
   > walks by the declared lengths, so a name length that omits its null terminator (how
   > nearly every hand-rolled .ase writer gets it wrong) or a block length that counts its own
   > header desynchronises it and the round trip fails. Both were tried and both went red.
   > Plus `smoke:ge-hero` step [5] for the window itself, falsified two ways.
   >
   > **Two things worth carrying forward.**
   >
   > 1. **A refusal has to be a returned null, and a throw is a different failure.** [7]'s
   >    first cut asserted only "not null". Under the mutation it was written for, the
   >    fallback died indexing a three-colour "ramp" at 255, so the run exploded with a stack
   >    trace at whatever line came next instead of naming the defect. A harness that reports
   >    the right break in the wrong words is one rewrite away from being read as a flake.
   > 2. **A test keyed on a user-facing string breaks when the strings collide.** [5]'s first
   >    cut read the offered formats off each Download button's TITLE and reported a FALSE
   >    red: `.css` is now the extension of two formats (the linear-gradient and the variable
   >    set), so it read `cssvars` as `css`. It keys off the registry key via `data-gx-format`
   >    instead. The collision itself is fine — the files differ by name (`-swatches`).
   >
   > **Left undone, deliberately:** §5.8's "default is remembered" (neither the format nor the
   > subject persists across opens — the recents flyout is the existing answer to repetition,
   > and it now remembers the subject too; the second pass below added the ACCORDION's memory,
   > which is a different thing: which section opens, not which format is chosen); a set × swatches export applies `even` placement
   > rather than offering the hero's three rules; and `.ugr`'s silent reduction keeps its
   > standing `@assumption` in `collectionQualityWarnings` — its 64-stop budget still needs a
   > per-format threshold threaded through before it can warn honestly.

   > **Amended 2026-09-09 (session 4, second pass — the owner had it in his hands).** Two
   > asks, and the second turned up a third export surface nobody had counted.
   >
   > **1 · "Users will find the export overwhelming with the long list of options."** True,
   > and measurable: the Ramp subject showed twenty formats across four always-open sections
   > plus the profile block and the image block — about twenty-seven rows, nothing
   > recommended, no way to skip what you will never use. A format CATALOGUE presented as a
   > menu of actions. Three changes, none of which removes a format:
   >
   > - **AGAIN** — the last few exports at the top, one click each. The app had recorded them
   >   since Phase B (`exportActions.ts`, on the Export icon's hover flyout); they were simply
   >   not in the WINDOW, which is where someone who has done this before is looking.
   > - **The four group headers became the choice.** They already said what each group is
   >   FOR, so they are closed by default, one open at a time, and the one that opens is the
   >   one holding your last export — the window's only memory, and free, because the recents
   >   already carry it. Twenty visible rows become two to eight. The output profile is a
   >   section like the others with its value on the header; the image row stays open,
   >   because it is one row and it is what most people came for.
   >
   > - **One action per row.** The row IS the download — it carries the extension it will
   >   write and the download glyph — and Copy is a small icon beside it, only for the formats
   >   that have a text form. The glyph is the colour picker's `CopyGlyph`, not a new one
   >   (owner: "we have a copy icon in the main color picker that you can use"), so the set
   >   does not grow a near-duplicate of a drawing that already exists. The extension shows
   >   only where the LABEL does not already carry it — "Adobe swatches .ase" followed by
   >   ".ase" is the window saying the same thing twice, and half the design-app rows read
   >   that way. The Again rows and the image row take the same anatomy, so there is one row
   >   shape in the window rather than three.
   >
   > **Then: "there's a little column for the extension, we should make that a thing."** It
   > became one. `EXT_COL` is a fixed width on every row of the window, held open even where
   > there is nothing to put in it, and `COPY_SLOT` is held open the same way — a row that
   > drops its Copy button is 28 px wider, and everything to its left, the extension included,
   > shifts with it. Measured before the fix: the format rows' extensions started at x=1236
   > and the Again and image rows' at x=1268, which is invisible unless you measure it. With
   > the column carrying the extension, `labelWithoutExt` takes it back OUT of the label
   > ("Adobe swatches .ase" becomes "Adobe swatches"); the registry keeps its labels intact,
   > because the old shell's Extras `<select>` shows a bare list where "Fractint" alone would
   > be worse.
   >
   > **Two silent defects came out of measuring that column, and neither smoke had caught
   > either.**
   >
   > 1. **A section could never be CLOSED.** The effect that re-homes the accordion when the
   >    subject empties the open section also fired on `open === null`, so clicking the open
   >    header shut it and the effect immediately re-opened the first one. Both smokes missed
   >    it because the section they close first is the one it re-opened.
   > **Then, 2026-09-10: the lossy notice.** "2 of 12 use more than 40 color stops.........
   > -> 2 gradients reduced to 40 colour stops (only), and only appears on hover. extra space
   > in each category so it opens neatly without shifting the others." All three, and they are
   > one thought: the line was a paragraph that rendered inside the row and shoved everything
   > under it down the moment it existed. Now `lossyNote` says the count and stops
   > ("1 gradient reduced to 40 colour stops"), it shows only while the row is hovered, and
   > every open category ends in a RESERVED line (`NOTE_STRIP`) for it to appear in. That last
   > part is what makes the first two safe: the strip is a fixed height that cannot wrap and
   > clips what does not fit, so whatever lands in it, the rows above and the categories below
   > cannot move. Verified by measuring both, not by looking.
   >
   > 2. **`labelWithoutExt` matched nothing.** It was `new RegExp(...)` built from a TEMPLATE
   >    LITERAL, and the escape for whitespace collapses in the template before the RegExp
   >    ever sees it — so the pattern was `s*.aseb` and every design-app row kept saying its
   >    extension twice. It read correctly and did nothing. `indexOf` now, with a note saying
   >    why.
   >
   > **The owner then asked for "a lighter strip behind the category names"** — a resting
   > tint (`BAND` in `ExportMenu.tsx`) one step up from the floating surface, on every
   > category name in the window, not only the accordion heads: Again and As an image wear
   > it too, or they would read as a different kind of thing.
   >
   > **2 · The rail's own Export icon, and the surfaces it retires.** The hero's download
   > glyph now sits at the right end of the set rail, beside the collection kebab. It
   > exports **the GROUND** — the union of the lit chips — not one set: the rail is
   > multi-select, so a single button at its end cannot mean "this set", and "export what
   > you are looking at" is the reading that survives two chips being lit. Ctrl-click a chip
   > first for one set alone. `All` is the catalogue and holds no favourites, so
   > `membersOfMany` returns [] and the icon disables itself and says why.
   >
   > It replaces **two** surfaces, not one. The owner named the per-chip "Export this set…"
   > menu item; auditing for it turned up a fourth export surface in v2 — the Export block
   > inside `FavientsCollectionMenu`, an inch away from the new icon, and the weakest of all
   > of them: whole-collection only, no ramp/swatches subject, a bare `<select>` of every
   > format. It is gone from v2 and kept everywhere else through a `withExport` prop the HOST
   > declares, because `FavientsPanel` (app-gmt, fluid-toy, the old shell) still mounts that
   > menu and has no export icon of its own. A capability, not a name being checked against.
   > A dated bin's context menu is now empty and so opens nothing at all, rather than a box
   > with nothing in it.
   >
   > **Guards.** `smoke:ge-hero` [5] rewritten (it must now COLLECT the offer section by
   > section) and a new [6] for Again and the memory behind it, seeded through localStorage
   > rather than by exporting, because a real export downloads a file.
   >
   > **The assertion that passed under mutation, and why it is the interesting one.** [5]'s
   > first accordion check read the section headers' own `data-open` and asserted exactly one
   > was marked open. A build that marks one header open while RENDERING EVERY SECTION'S ROWS
   > passes that, and passes "the section opened non-empty", and passes the subject checks —
   > measured: the mutation sailed through with no output at all. What cannot survive it is
   > asserting that successive sections show DISJOINT rows: if everything is always rendered,
   > the second section shows the first one's formats again, and the failure names them
   > (`"css" is on screen under both "For the web" and "For design apps"`). The lesson is the
   > one CLAUDE.md keeps earning: an assertion about a STATE FLAG is not an assertion about
   > what is on screen.
   >
   > **Found while running the guards, NOT caused here and NOT fixed:** `smoke:ge-ground` [3]
   > was already red on a clean tree at `702dd3ec`, with two independent stale expectations,
   > the first masking the second. (a) `s.tools !== 1` counted `button[aria-label]` inside the
   > wall — session 3 put the ground's LIST VIEW toggle in the same corner, which carries one
   > too. Fixed here, by NAME rather than by count, so a carve tool leaking back onto a set is
   > still caught and is named when it happens. (b) The next assertion wants the set's canvas
   > flush with the wall's left edge and it starts at x=24: an empty 24 px ROW-LABEL COLUMN is
   > reserved on a set, where it draws nothing. That keeps the canvas from jumping sideways
   > when you cross between All and a set, which may well be why it is unconditional — so it
   > is left red rather than loosened, because which side is right is the owner's call, not a
   > guess. Also marked `@stale` in `BrowseStage.tsx`: the comment above the tool-reset effect
   > claims "the tools now stay" on a set and `TOOLS.filter` two hundred lines below still
   > offers `zoom` alone.



6. **The Wallpaper icon's silver must follow the theme.** Mine, from W.1: the sheen and its
   pinned-dark glyph are hard-coded hexes in `gradient-explorer/v2/WorkingHero.tsx` (grep
   `brushed-silver`), deliberately outside the theme so it read as a door out of the shell. On a
   light interface that reasoning fails. It needs to be a metal that takes the scheme's
   foreground/background rather than two literals.

7. **The Curves editor's out-of-bounds region must follow the theme.** The area outside the
   channel's valid range in `palette/components/ChannelGraphEditor.tsx` (and the sidebar,
   `ChannelTrackSidebar.tsx`) is painted with fixed values.

8. **The eyedropper should show the image faithfully and large.** With an image loaded, picking a
   colour should show it in full colour at the bigger size rather than the greyed, shrunk-to-84px
   state the hero adopts once the gradient stops being the image (`imageIsTheGradient` in
   `gradient-explorer/v2/WorkingHero.tsx`). The picker's eyedropper is
   `components/EmbeddedColorPicker.tsx` with `palette/store/armedTarget.ts` carrying the armed
   state; the image surface is `palette/components/ImageStage.tsx` inside
   `gradient-explorer/v2/ImageSlot.tsx`. The rule to write down here is that the image's
   presentation depends on what you are DOING, not only on whether the gradient still derives
   from it.

9. **Deselecting a knot should be easier — a click on the wall should do it.** Owner, while
   testing on 2026-09-09. Escape was the only way out of a stop selection: the stops editor's
   own click-away lives on the area of its container OUTSIDE the knot track
   (`AdvancedGradientEditor.tsx`, grep the container's `onMouseDown`), and the hero mounts it
   with `chrome='strip'` — the track IS the container, so that area is a few pixels of nothing,
   and a click on the ramp runs `handleTrackMouseDown`, which INSERTS a knot.

   > **Shipped 2026-09-09 (session 4).** The GROUND is the click-away target: a
   > `onPointerDownCapture` on the stage div in `GradientExplorerV2App` closes the inspector
   > face when one is open, and the hero's `tray !== 'inspector'` effect turns that into
   > `clearSelection()` — the same route Escape takes, so there is one way out, not two.
   > CAPTURE, because the wall's own pointer handlers stop propagation. It covers the wall,
   > the set rail and the shelf panel (all inside the stage); the top bar is deliberately NOT
   > a target, so Undo / Redo while inspecting a stop does not also drop your place.
   > Guard: `npm run smoke:ge-tray` step [13], falsified by removing the handler
   > ("the wall click did not close the inspector (inspector)").
   >
   > **Noticed, not fixed:** the editor's prop-sync effect (grep `justEmittedRef`) does not
   > clear `selectedIds` when the incoming stops are a DIFFERENT gradient, and
   > `selectionCount` is the raw `selectedIds.size` while `selectedNodes` is filtered against
   > the live knots — so a wholesale gradient swap while a stop is selected leaves the face
   > open over an empty inspector. The wall and shelf paths can no longer reach it (the
   > pointerdown clears first); a swap driven from inside the hero still could. Unverified as
   > a reachable user path, which is why it is a note and not a `@bug`.

> **Owner's second walk, 2026-09-10 (§8b item 5's third pass).** Four calls, one question
> answered, one confirmation.
>
> - **The rail's export icon lights like a chip.** Owner: "when enabled, should light up blue
>   like its heading button counterparts (Kept, Presets..) look when they are lit up." It now
>   carries the rail's own lit vocabulary verbatim — accent border, accent ink, accent wash —
>   measured identical to a lit chip (border `rgb(34,202,236)`, ink `rgb(109,221,243)`, wash
>   at 0.1, 26 px). Disabled (All on the ground) it falls back to a plain hairline.
> - **The accordion remembers between sessions** (`gx.v2.exportSection`). Owner: "this is one
>   area where a user is likely to only require a few paths." A remembered CLOSE is stored as
>   the empty string and honoured; the last-export rule is now only the first-use fallback.
>   Guard: `smoke:ge-hero` [6b], falsified both ways (never written, and written but never
>   read back); [6] gained an explicit `removeItem` so it still tests the fallback it names.
> - **Carve tools stay out of sets, and the render was right all along.** Owner: "we dont need
>   carve tools in small sets." The `@stale` raised on 2026-09-09 is resolved and removed: the
>   comment claimed the tools stayed, `TOOLS.filter` offered `zoom` alone, and the filter is
>   the correct half. Carving is for finding your way through eleven thousand; choosing several
>   on a set is the background rubber-band and never needed a tool button.
> - **Illustrator, InDesign and .ase are confirmed working** by the owner against the real
>   apps (2026-09-10). The §8b note that said the `.ase` writer was proven only against a
>   reader written from the same spec no longer applies to those three.
>
> **Answered: user gradients do NOT load into All.** `All` is the catalogue and nothing else —
> `useGroundSource` returns `null` for it (which means "show the catalogue"), `membersOf`
> returns `[]`, and the catalogue is built in `pickerStore` from the loaded packs, with no path
> by which a favourite enters it. Your own gradients live in Recent's dated bins, Kept and
> named groups. Worth knowing because it is why the rail's export icon disables on All: there
> is nothing of yours there to take.
>
> **Export options, decided the same day.** The question was which formats have a real option
> behind them rather than a number the format itself dictates. The answer came to four groups,
> and the owner took two:
>
> - **TAKEN — the stop budget**, folded into the profile category, which is renamed
>   **Settings** ("we can merge the stop budget into output profile and name it 'settings'").
>   Six formats reduce a 256-step ramp to a handful of stops because their own file format
>   says so, and each budget was a private constant nobody could see: `.ai` `.idml` `.ase`
>   `.grd` at 40, `.svg` at 32, `.ugr` at 64. `STOP_BUDGETS` is the table now and
>   `stopBudgetOf(key, override)` is the resolver; blank means each format's own. It reaches
>   the BYTES, not just the label — threaded through `build`, `collection`, the collection
>   zip, and both Adobe writers.
> - **TAKEN — the PNG strip's size** ("the 1024 x 64 comment turn into two textfields"). It
>   was a parenthesis in the row's label stating a number nobody could change. Only the strip
>   gets fields: a contact sheet lays itself out from the set's count, a swatch sheet from the
>   palette's.
> - **SKIPPED by the owner** — the CSS gradient's angle (hardcoded `90deg`) and the
>   identifier/prefix on Tailwind, design tokens and CSS variables (currently derived from the
>   gradient's name).
> - **NOT OFFERED, deliberately** — `.map`, `.ggr`, `.cpt` and Paint.NET have counts the
>   format itself fixes, and a colour COUNT under Ramp would duplicate the Swatches subject.
>
> **The budget closed a standing assumption on the way.** `collectionQualityWarnings` used to
> return nothing for anything but `.ai`/`.idml`/`.ase`, because the only measurement available
> ran at 40 and `.ugr` reduces at 64 — so `.ugr` lost detail silently and the doc block said
> so and could not fix it. With a per-format budget threaded, every reducing format is
> measured at its own, and the `@assumption` marker is gone. Guard: `test:palette-exportsubjects`
> [8], falsified three ways — an ignored override, `.ai` writing its own budget whatever it is
> told (caught by comparing an 8-stop file's SIZE against a 64-stop one, not by counting), and
> the warning reverting to its three-format list.
>
> **Also answered:** user gradients do NOT load into `All`. It is the catalogue and nothing
> else — `useGroundSource` returns `null` for it, `membersOf` returns `[]`, and `pickerStore`
> builds the catalogue from loaded packs with no path by which a favourite enters. Yours live
> in Recent's dated bins, Kept and named groups. It is also why the rail's export icon disables
> on All: there is nothing of yours there to take.
>
> **Still open from the 2026-09-09 pass:** `smoke:ge-ground` [3]'s second assertion (the set's
> canvas starts at x=24, an empty 24 px row-label column the wall reserves so the canvas does
> not jump sideways when you cross between All and a set). Not answered on this walk.

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
- 2026-09-08 · **The eyedropper stays native.** An in-app dropper (`components/gradient/useEyedropper.tsx`
  — its own loupe, sampling canvases through `getImageData`) had appeared in the working tree
  alongside the icon work; the owner: *"the eyedropper, scrap the custom and make it the native
  dropper as before."* Reverted — the button is back on the browser's `EyeDropper` API
  (`getEyeDropper` / `doEyedrop` in `EmbeddedColorPicker.tsx`), keeping the owner's own
  `EyedropperGlyph`. Chrome's red-grid magnifier is accepted; do not re-roll a custom one.
- 2026-09-08 · Phase D built (D.0–D.3, awaiting the owner's walk). **In scope, left
  undone:** arrow keys + Home/End on the wall (the research's P1e); the pad's seek is off
  while grouped by category (every lightness exists once per category — ambiguous); the
  tween's second snapshot has no mark on the canvas (the header names it); a group cannot be
  deleted from the rail (remove its gradients in the pull-up); `FavientsPanel
  layout="strip"` is now unused by v2 (kept — app-gmt does not use it either; delete, or
  keep for a peek variant, after the walk). **Noticed:** the tile-size steps re-layout All
  at 1,500 / 400 / 160 while the pad is dragged (see §8); on a fresh origin the catalogue
  is 3,076 until the licensed packs load, so a first-run rail is All · Presets 24; the
  Phase E block above carried a bell byte in a Windows path (a heredoc's `\a`), repaired
  today — write patch scripts with the Write tool; another session's dev server on :3400 was
  serving a stale `BrowseStage` all afternoon (its watcher had lost the file) — the smokes
  ran on a second server (`.claude/launch.json` `gmt-dev-3401`, local, gitignored): restart
  `npm run dev` before the walk. **The owner's walk now carries:** the peek question (are
  the picks wanted on the edge while foraging, or is Today · N enough); the tile steps on
  All; the marker's thumb (left edge, 7 px) against a translucent band; whether "Keep these
  N" belongs beside the sentence or on the rail; the empty-set line's wording. **Phase F
  carries:** the rail on a phone (a chip row suits it better than the strip did; the tail
  drop needs a "+ group" affordance on touch; the pad's thumb is 7 px, too thin for a
  finger).
- 2026-09-08 · Phase D, the owner's first walk. **Decided:** the peek question is CLOSED —
  "I like it like this": Today · N on the rail is enough while foraging, no stacked preview
  on the chips. The count-driven tile steps on All are ACCEPTED ("the tile re-layout
  works"). **Changed on the walk:** the wall's viewport indicator — a thumb inside the pad
  with hairlines "wasn't conveying the right language or reading smoothly as the visible
  area" — is now a LENS on the pad (a light translucent band, hairline edges, indicating
  only) plus a slim SCROLLBAR standing beside the pad (`gradient-explorer/v2/ui/MapScrollbar.tsx`)
  whose thumb is the same range and whose drag scrolls the wall; the range is computed
  continuously (a band half scrolled past contributes half its lightness), so both move with
  every pixel of scroll instead of band by band; 12 px of air above the pad (it sat against
  the hero). **Open, the owner's concept question:** "+ Snapshot" — what it is, whether the
  word is right, and how it differs from a kept gradient. It is the whole studio state (the
  working gradient plus the trays' live settings — Adjust dials, Curves, the Mix sources, the
  image — and the Filters slice), restored as one undo step, tweenable between two; a kept
  gradient is the gradient alone. Answered in the session; the decision (rename · fold into
  Kept with a tween between any two tiles · retire from v2) is the owner's and is not yet
  taken — nothing changed in code. L10 (§8) still awaits the owner's yes or no; it was
  explained on the walk.
- 2026-09-08 · Phase D, the owner's second walk (built the same evening). **Snapshots are
  GONE** — owner: "there's no need to save tray states, they're baked after every action; I
  think we can remove snapshots". The set, the rail's "+ Snapshot", the tween and the
  snapshot menu are removed; `groundSets` has three kinds again. **L4 amended:** "One
  memory" holds Recent, Kept and the named groups; Variants/Snapshots are no longer a zone
  of it — the design doc's §5.6 and the Phase D fallback's Snapshots line are superseded by
  this entry. `palette/store/variantsStore.ts`, `palette/core/variantsCore.ts` and
  `palette/core/rampTween.ts` now have no consumer but their two harnesses; kept for the
  moment (a tween between any two tiles may want `rampTween` back) — Phase G decides whether
  to delete them and mark ADR-0112 superseded. **The selected tile is a STROKE, not a
  popup** (V8 as written: a 2 px accent outline, drawn inside the tile's edge so it never
  overlaps a neighbour, with a dark hairline inside it; the 1.8× showcased copy with its
  shadow is gone — every host of `PickerWall` inherits this, app-gmt's overlay included).
  **The gap grows with the tile as drawn** — zoomed in, or grown because the set is small:
  `PickerWall` scales it (`gapAt`: the host's Padding is the floor; 32 px keeps 2, 96 px
  gets 7, 192 px gets 14), so the model's own 6 px rule went. **The rail moved to the TOP
  of the ground**, above the wall's header ("that makes more sense hierarchically": which
  set, then how it is narrowed, then the tiles); the manage panel opens UNDER the rail as a
  Floating over the wall (L6), Esc closes it first; the footer is gone. Consequence to
  know: the wall now drops 40 px the moment the first pick lands, when the rail appears
  (L9) — `smoke:ge-tray` had to re-measure the wall before its second wall click for
  exactly that reason. Gates green: `smoke:ge-ground` (eight steps), `smoke:ge-tray`,
  `smoke:ge-hero`, `test:palette`, knip.
- 2026-09-08 · Phase D, the owner's third pass (built): **the pad follows the Arrange
  state.** Of the Arrange axes, hue · lightness · vividness are colour coordinates, so the
  pad's Y is the ROWS axis and its X the SORT axis whenever those are colour axes, and the
  strip beside it is the third (`palette/core/padAxes.ts`, the table pinned by
  `test-palette-groundsets` [7]); the field is painted for any pair (`HueLightnessPad` takes
  `axes` + the third coordinate's value from the strip's window centre) and the strip is
  painted toward the pad window's average colour for whichever axis it carries
  (`stripTrackFor`). Rows by complexity / rainbow / warmth / none fall back to the default
  hue × lightness pad. **The scrollbar beside the pad is always there** (owner: "rather
  than no lens, default to the standard display"): the lens range when the bands are on the
  pad's Y, else the plain scroll position — a scrollbar, which is always true; the lens on
  the field is withheld only when it would lie. `smoke:ge-ground` [9] guards the switch both
  ways. **Noticed:** warmth is a hue projection (the Filters comment already says so) and
  could map onto the hue axis reversed if a walk wants it; `QualityRangePad.tsx` still
  mentions the pad by its old name in a comment.
  **Then (same pass):** the scrollbar's track dims to 50 % opacity outside the REACHABLE part
  of the axis — the bands that exist — so it also says where the wall can take you (owner:
  "it's so beautiful"). **Session closed here (owner); Phase D awaits nothing but use.** Next
  buildable: Phase W (wallpaper) or Phase F (phone); C.5 Mix UI parked; the §8 L10 wording;
  Phase G decides the variants modules and ADR-0112.
- 2026-09-08 · Phase W built (W.1–W.4, awaiting the owner's walk). **In scope, left undone:**
  nothing from W.1–W.4 — but the walk should judge three things the code cannot: whether the
  twist range (±3 turns) stays legible at its ends, whether the petal count's 12-per-orbit gain
  feels right, and whether the silver on the Wallpaper icon reads as inviting or as disabled in
  the LIGHT scheme (it was measured on dark). **Noticed, not fixed:** the gradient map's seven
  channels have no live check at all — the mode's `raster` reads the image from `imageStore`
  rather than from `ctx` (its own long-standing `@assumption`), so nothing outside a real
  Extract image exercises them; the pure maths is guarded 44 ways, the pixels are not. Hue as a
  driver WRAPS by nature, so a ramp whose two ends differ shows a seam on red — correct, and
  worth a word in the tooltip if the walk trips on it. The `radialSineFreq` range stops at 16
  because a finer flower stops reading at wallpaper scale; that is a taste call, not a limit.
  **A guard defect found and fixed on the way, worth carrying:** `smoke:gx-handles` selected
  handles by their INDEX in render order, so inserting a handle mid-list silently re-pointed
  every case — the radial case began dragging Waves while still asserting on `radialCx`, and it
  went red for the right reason only by luck. Handles now carry `data-gx-handle` (the first key
  they reset) and the smoke selects by name. A second, quieter hole in the same file's new
  step: asserting a param "changed from undefined" passes on a completely DEAD handle, because
  a drag that emits its grab value still writes the default over an unset key — measured, then
  tightened to assert the value moved off the default. **Checked and clean:** the per-mode
  `hint` strings are the only prose describing these handles and both were updated in place
  (`geometryModes.tsx`); `grep 'drag the centre\|rotation handle'` finds no second copy in the
  old shell or in app-gmt, so there is nothing stale to carry to Phase G from this phase.
- 2026-09-08 · Phase W, after the perf + split pass. **In scope, left undone:** conic is still
  ~71 ms a full-res frame and the blit ~171 ms, so a 2560-capped settle render is ~240 ms of
  blocked main thread — better than 341 but still a visible hitch on a mode switch or a big
  edit. The three real options are all bigger than this pass: move the field+dither to a worker,
  lower `CONTINUOUS_MAX_DIM`, or replace the CPU error diffusion with the GL blue-noise tail the
  compositor already has (a QUALITY decision — `debug/test-dither.mts` chose error diffusion at
  WIGGLE 0.04 vs 0.24, so that one is the owner's, not mine). **Not measured:** the three
  ownCanvas modes (fractal / liquify / parallax) drive their own RAF and were not profiled in
  this pass — if "some modes" meant those, say so and I will measure them next. **Noticed:** the
  gradient map's `raster` still reads the image from `imageStore` rather than from `ctx` (its own
  standing `@assumption`), so the channel-field cache is module state keyed on a store read —
  correct today because the overlay includes the thumb in its repaint key, but it is the second
  thing now relying on that. And `mapStrength < 1` re-enables the source-colour bilinear, so the
  strength slider is measurably more expensive than the rest of the mode; nothing to fix, but
  worth knowing before it is called a regression.
- 2026-09-08 · Phase W, after the GPU fast path. **Now genuinely fast, and the earlier
  "still ~240 ms of blocked main thread" note is superseded for anything MOVING** — it still
  describes the settled render, which is once per gesture and is the frame you keep. **In scope,
  left undone:** the settle threshold (180 ms) is a guess that felt right, not a measurement —
  the walk should say whether the hand-off is invisible or whether the picture visibly
  "sharpens" a beat after you stop. **Noticed:** `geometryFrag.ts` is the first place in this
  subsystem where one law lives in two languages; if a fifth geometry is added it must be added
  twice and `smoke:gx-geom-gpu`'s case list extended, which is a real tax on the next mode and
  should be weighed against just accepting the blue-noise tail for a new one. The three
  `ownCanvas` modes are still unprofiled — the owner reports fractal as fine, so that is
  consistent, but liquify and parallax were never measured either way.
- 2026-09-08 · Phase W, after the cull. **In scope, left undone:** Liquify is TAGGED, not
  fixed — the `wip` flag says so honestly but nothing says what is unfinished about it, and that
  belongs in the banner's wording once the owner says which part. **Noticed:** removing Arched
  left `GeometryId` with three members and `DEFAULT_BACKGROUND` with no live consumer, both kept
  deliberately (a masked geometry would want them) and both now guarded synthetically. The
  spline's `setSplinePoints` is a new exported seam whose only caller is a smoke — justified
  the way `fullscreenStore`'s is, but it is a seam, and a second caller should be a real feature
  rather than another test. **A trap that cost real time twice today, worth reading before the
  next session:** editing a module a smoke drives by bare-URL import (`fullscreenStore`,
  `splineMode`) HMR-invalidates it, the smoke then gets a SECOND instance, and the failure looks
  like a product regression — the spline smoke spent two runs "failing" on a picture that was
  simply the untouched default curve. Both smokes now name the hazard in the failure text.
  Restart the dev server after editing either.
- 2026-09-09 · session 4 (§8b item 9, then item 5). **In scope, left undone:** §5.8's "default
  is remembered" — neither the export format nor the subject persists across opens; the recents
  flyout is the standing answer to repetition and it now remembers the subject, so this may be
  the whole answer, but nobody has decided. A set × swatches export always uses `even`
  placement — the hero's three rules (Even / Perceptual / Stops) are not offered for a set, and
  Perceptual would arguably be the better default for a palette taken from a gradient nobody
  laid out. `.ugr` still reduces silently: its `@assumption` in `collectionQualityWarnings`
  stands, and it now sits beside three formats that DO warn, which makes the gap more visible
  rather than less. The swatch sheet's palette layout is one row per gradient with no wrapping,
  so a set of sixty at seven swatches is a very tall PNG — fine for the working gradient, worth
  looking at for a big set. **Noticed outside scope:** the editor's prop-sync effect (grep
  `justEmittedRef` in `AdvancedGradientEditor.tsx`) never clears `selectedIds` when the incoming
  stops are a DIFFERENT gradient, and `selectionCount` is the raw set size while `selectedNodes`
  is filtered against the live knots — so a wholesale swap with a stop selected leaves the
  inspector face open over an empty inspector. Item 9's ground click-away can no longer reach
  it; a swap driven from inside the hero still could, and nobody has found that path. The old
  shell's Extras panels tell you a binary format is binary by quoting `grdStopCount` whatever
  the format is — harmless, wrong for `.idml` before this session and now wrong for `.ase` too.
  Two formats share the `.css` extension now (the linear-gradient and the variable set); the
  downloads differ by name (`-swatches`) but the extension no longer identifies the format, and
  anything keying off it will be wrong — a test already was. **What the next session carries:**
  Phase F (phone) and Phase G (parity + the entry-point swap) are what is left of the plan.
  Phase F should measure the boot cost of the two licensed packs on a real phone (~8,000 extra
  entries, 11,131 total, carried since Phase A iteration 2) before anything else.
- 2026-09-09 · session 4, second pass (the export window's presentation + the rail's icon).
  **In scope, left undone:** the accordion remembers which SECTION was open only within one
  opening; §5.8's "default is remembered" still is not done for the format itself. The row's
  Copy gives no per-row confirmation — it toasts, where the colour picker's own copy button
  flips to a tick for a second; matching that wants the promise back out of
  `exportActions.copyFormat`, which is a change to a shared function for a small gain.
  **Noticed outside scope, and this is the one to read:** `smoke:ge-ground` [3]
  was ALREADY RED on a clean tree before this session touched anything, with two independent
  stale expectations and the first masking the second. The tools half is fixed here (it counted
  `button[aria-label]`, and session 3 put the list-view toggle in the same corner); the canvas
  half is deliberately left red — a set reserves an empty 24 px row-label column, which stops
  the canvas jumping sideways when you cross between All and a set, and whether that is wanted
  is a decision, not a guess. A `@stale` in `BrowseStage.tsx` names a second disagreement found
  on the way: the comment above the tool-reset effect says a set keeps its carve tools and
  `TOOLS.filter` still offers `zoom` alone. **Carried:** Phase F and Phase G, unchanged.
- 2026-09-10 · **Phase F BUILT — the shell on a phone.** Owner-confirmed plan of eight
  items, redrawn against the shell as it stands (the §4 text predated the tool column, the
  rail on top and the shelf's removal; see ADR-0115). **Measured before, 390×844 Pixel 5:**
  hero 285 with the use cluster clipped off the right and the Mix name overprinting its
  chip; the narrowing bar needed 422 px so the Filters button sat UNDER the saturation strip
  and could not be tapped; the rail clipped past its 4th chip; the tray 257 wide (Adjust's
  bins overlapping, Curves a 100 px plot, the Image face 888 by construction); both Export
  windows off both axes; the tool column over the first tile column; the stops editor
  mouse-only; nothing honouring the safe area. **After:** header 48 · hero **219** (236 with
  Curves, 235 with Mix) · rail 40, a scrolling chip run with + · export · menu pinned outside
  it · bar 126 (Filters + search on one row, the pad at a MEASURED 328 beside its scrollbar,
  the strip full width) · wall 411 with a 24 px gutter · tools a 252×48 row at bottom-left
  with − / + and Fit · tray 374 wide, capped at 55 % of the room below the card, scrolling
  inside · Export a 390×844 sheet · `scrollWidth` 390 everywhere. **Desktop:** seven 1280×800
  screenshots byte-identical before and after. Seam = `useIsPhone` (the engine's
  `isDeviceMobile`, structure only) + Tailwind `max-md:` for paint. **Touch:** the stops
  editor runs on pointer events (knots, bias, brackets, marquee; `touch-action: none` on the
  drag surfaces; the default cancelled on the compatibility `mousedown`, not the pointerdown
  — cancelling the latter starves the marquee-escape handoff of its mouse events, measured);
  on a coarse pointer a SELECTED knot stands in for hover so the bias handles are reachable;
  the wall declares `touch-action` from its tool props (`none` with a tool, `pan-y` without)
  and gained `zoomStep` (a serial + factor, anchored at the viewport centre through the
  drag-zoom's own commit maths). **No pinch, on purpose:** under `pan-y` the browser's
  vertical pan takes any pinch with a vertical component; buying it would cost the wall its
  native scroll. **Boot cost, as asked:** the packs load BEFORE first paint; at a 6× CPU
  throttle boot is 3.7 s without them and 4.3 s with, heap 51 → 73 MB — not a blocker, left
  as is. **Guards:** `smoke:ge-phone` (8 steps; falsified two ways, see its header),
  `smoke:ge-walltouch` (CDP touch, falsified three ways), `test:palette-wallzoom` (pure
  maths, falsified five ways, appended to the `test:palette` chain); rule rows added in
  `sibling-apps.md` and `palette.md`; `check:rule-guards` green. ADR-0115 written.
  **Still missing — the owner's phone walk carries:** (1) NOT verified on hardware —
  `env(safe-area-inset-*)` is 0 in emulation, so the notch / home-indicator padding is
  reasoned, not seen; (2) the name truncates hard in the hero header ("Snap…") — the chip's
  second clause was dropped for it, and "More like this" is the word "Similar", not a glyph
  (the set has none for "rank by likeness"; drawing one is the owner's call under ADR-0114
  rule 3); (3) the first tap after a touch SWIPE is swallowed by Chromium to stop the fling,
  so a tool button tapped straight after scrolling the wall does nothing once — real, worth
  a decision (a larger tool row? accept?); (4) native drags still do not exist on touch —
  keeping is the ♥, filing is brush-select + "Move to…", a new group is the rail's +; the
  colour-swatch → ramp drag and the marquee-escape → gradient-drag handoff
  (`pointerGradientDrag`, window `mousemove`) have no touch path; (5) the Curves plot's own
  point drags are still mouse-only — `ChannelGraphEditor` → `GraphCanvas` →
  `hooks/useGraphInteraction.ts` (873 lines, also the main app's animation curve editor), a
  shared-hook conversion, not a mechanical one; (6) the picture UNMOUNTS on phone when the
  Image face closes (state lives in `imageStore`, nothing lost); (7) the LOOK filter rows'
  number boxes wrap to two lines (`QualityRangePadConnected`'s own layout); the
  `FavientsCollectionMenu` kebab keeps its desktop hit box; the hover-only recent-exports
  flyout is simply absent on phone. **Carried:** Phase G (parity + the entry-point swap),
  unchanged. Landed on `main` and pushed — the preview URL IS the phone test bed.
- 2026-09-11 · Phase F, the owner's first real-phone test: FAILED on an iPhone (WebKit) and a
  Huawei P20 Pro, for two reasons outside the layout. iPhone: `roundRect` (Safari 16+) in the
  wall's tile drawing, present since the rounded tiles of Phase C — the error boundary took the
  app. P20 Pro: the viewport shell's `100dvh` (Chrome 108+) with no fallback, Phase F's own
  regression — the shell collapsed and the wall was 0 px tall under a header that drew. Both
  fixed (`utils/roundRectPath.ts`; `MobileViewportShell` = `h-screen` class + inline `100dvh`;
  the boundary's fallback now leads with the message, which a WebKit stack does not carry).
  New guard `smoke:ge-floor` boots the shell with `roundRect` deleted. **The phone walk is
  still owed** — nothing in the Phase F list above has been seen on hardware yet; the retest
  should name the iOS / Chrome versions, which decide what else is below the floor.
- 2026-09-11 · Phase F, second round. The P20 Pro works after the floor fix. The iPhone still
  dies (tab killed after the wall paints; not reproducible in Chromium or WebKit 26), so the
  shell carries a bisect: `?diag` (boot trace, `bootTrace.ts`) and `?lite` (licensed packs
  off). The owner's six layout notes are built: the hero as an edge-to-edge BAND on phone
  (no side padding, square sides - also the fix for the tab notch); every face but Mix takes
  the whole room and hides the ground (`FULL_FACES`); Even / Perceptual / Stops one cycling
  button; `blend` opens a dropdown on a coarse pointer; no Split in Wallpaper on phone.
  **Still owed:** the iPhone's verdict from `?diag` / `?lite`, and the hardware walk itself.
- 2026-09-11 · Phase F, third round. `?lite` runs the whole Explorer on the owner's iPhone 6,
  so the licensed packs were the killer (a 1 GB phone's ceiling at the 11,131-row rebuild).
  Core only is the phone default (`registerFeatures.ts`); `?lite` / `?packs` force either
  way. No carving tools on a phone; zoom buttons only when they act; 32 px top bar; less
  hero top padding. `smoke:ge-walltouch` boots a desktop layout with CDP touch emulation now.
  **Open:** a phone-centric Curves editor (owner: 'problematic'); the fullscreen phone pass.
- 2026-09-11 · Phase F, fourth round: the Wallpaper overlay on a phone. Root touch-action
  none + document lock while open (the page scrolled under the handles — WebKit ignores
  touch-action on SVG); safe-area padding; Export panel collapsible, collapsed on phone;
  scrolling mode selector, wrapping right cluster, 36 px buttons; PINCH zoom in Fractal
  (ratio prev/now — `zoomAt` multiplies the half-span). Guard: `smoke:ge-phone` [8].
  **Still missing:** pinch unguarded; handle hit size; the fractal toolbar's ~205 px on a
  phone wants a per-mode 'more'; Liquify / Spline have no touch gestures.
- 2026-09-11 · Phase F, fifth round: the document never scrolls on this page; the curves plot
  takes a finger through a touch→mouse translation in GraphCanvas (the shared hook is
  untouched); Settings is a sheet on a phone; the HERO FOLDS to header + strip (▴ in the use
  cluster, `smoke:ge-phone` [3b]) so the wall gets the screen back — phone and desktop; the
  stop fit is HELD while a slider drags (`holdFit` through the param-edit bracket depth);
  Curves on a phone: Detail / Smooth one row, no side padding, 320 px plot, inspector below.
  **Still owed:** the owner's phone walk; the fractal toolbar fold; Liquify / Spline touch.
- 2026-09-11 · Phase F, sixth round (owner's trims): no colour cloud on the phone's Image
  face; the state chip is a dot on phone (the fold's ▴ fits); Wallpaper's ✕ in the name row
  and no right cluster on phone; Fractal hides Iterations + Cycle on a coarse pointer.
