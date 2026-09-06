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
  appears on the first pick; the shelf when Recent has one item. While the pointer lives in the
  wall the hero quiets to the ramp and a row of small use buttons.

### Visual language

- **V1 · Three surfaces, and the third always floats.** Ground = `surface-viewport`. Band (top
  bar, hero, shelf) = `surface-dock`, hairline `line/10`, no shadow, never moves. Floating (tray,
  popover, tool palette, toast, dialog) = `surface-section`, hairline `line/20`, radius 12, one
  shadow, opens and closes.
- **V2 · Radius encodes role.** 4 px = a sample (swatch, tile, slider track). 8 px = something you
  press (button, segmented control, input). 12 px = something that floats. Pill = a state, never
  an action.
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

### Phase D — the shelf as the only memory
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
- `AdvancedGradientEditor` strip chrome + `EmbeddedColorPicker`: radii (V2), the channel bars as the
  standard slider or a clearly-a-sample 4 px track (V4/V8), harmony rows and the working palette row
  styled as V8 bars, mono only for hex (V5). Additive props or a `chrome`-scoped stylesheet so
  app-gmt's `full` chrome is untouched.
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
