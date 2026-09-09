# GE v2 — the old shell's "more" surface: migration audit

**Written 2026-09-08, on `ge-v2`. Research only — no source file was modified.**

Method: source read top-to-bottom plus `grep` for the annotation markers, per CLAUDE.md's
navigation policy. Reachability was measured with knip rather than guessed (§5.1). Two
sub-audits ran in parallel — the Generator/Build path and the Favients machinery — and their
findings are folded in. Where something could not be determined it says so rather than guessing;
those are collected in §6.

Scope: the owner's request — *"the old 'more' section, which has the same functions as the new
top shelf/wall combo, but also we need to look at which features of it we need to migrate and
which to scrap. it includes some important paths that are not yet integrated."*

---

## 0. What "the old 'more' section" is

**Primary identification (high confidence): the FULL My Gradients / Favients panel —
`palette/components/FavientsPanel.tsx` (1,300 lines) — as the old shell mounts it, plus the old
Picker stage chrome around it.**

Two pieces of direct evidence, not inference:

1. **`plans/ge-v2-design.md:237`** (the S3 decisions log), verbatim: *"My Gradients is the §4
   strip at last: `FavientsPanel layout=\"strip\"` … **\"more\" pulls up the full panel** with
   `hint` overridden."* — "more" is the project's own name for the full FavientsPanel behind the
   shelf strip's pull-up.
2. **`gradient-explorer/v2/SetRail.tsx:188`** still renders that control today:
   `{open ? 'less' : 'more'}` — the chevron at the right end of the set rail, which opens
   `<FavientsPanel hint={null} />` inside a `Floating`
   (`gradient-explorer/v2/GradientExplorerV2App.tsx:375-379`).

So the surface the owner means is the one v2 reaches *through* "more". Its old-shell form is the
same component mounted very differently: **docked LEFT, full height, always visible**, via
`palette/installFavients.ts` → `favientsPanelEntry({dock:'left', order:0})` +
`mountFavientsPanel({storageKey:'gmt.gradientExplorer.favients.panel', location:'left'})` in
`gradient-explorer/setup.ts`; toggled from the top bar by
`gradient-explorer/TopBarButtons.tsx` → `FavientsToggleButton`; and mounted a **second** time,
directly, for the phone branch at `gradient-explorer/GradientExplorerApp.tsx:349`.

**The owner's phrase "the same functions as the new top shelf/wall combo" is literally true of
that panel**, and it is why it needs auditing: it already does grouping, group rename,
drag-to-group, trash, search, tiles and per-item selection — everything `SetRail` (the top shelf)
and `PickerWall`/`BrowseStage` (the wall) now do — **plus** paths neither of them has (import,
collection export, contact sheet, list view, per-host destination routing).

**Secondary surface, included because it is the other half of the same claim:** the old **Picker
stage**, `gradient-explorer/PickerStage.tsx` + the `paletteFilters` dock panel + the two mobile
variants declared inline in `gradient-explorer/GradientExplorerApp.tsx` (`MobileModeTabs`,
`MobilePickerControls`). §1.B covers it.

**Alternatives I considered and why I ranked them lower** (flagging them, as asked):

| Alternative | Why probably not | Why it might be |
|---|---|---|
| The **Generator / Build** stage (`palette/components/GeneratorStage.tsx`) | No overlap with a *shelf/wall* combo — it is a maker, not a browser. | It is the biggest genuinely-unintegrated area and "important paths that are not yet integrated" fits it exactly. **It is fully covered in §3.1 regardless**, so the answer does not depend on the identification. |
| The old **right-dock mode tab strip** (Picker · Generator · Image) | Three tabs are not "a section", and v2 deleted them by design (L3). | "More places to go", loosely. |
| The v2 `ExportMenu`'s `More` ZoneLabel (`ExportMenu.tsx:113`) | A v2 label, not an old one — and it currently renders **nothing** (all 16 formats are in the four named groups, so `rest` is always empty). | It is the only literal "More" in the codebase. |

There is **no literal "More" label anywhere in the old shell** — grepped repo-wide over
`palette/`, `gradient-explorer/` and `app-gmt/`; every hit is "More like this", prose, or the two
v2 sites above. The name is the owner's, from the design doc.

---

## 1. Inventory

### 1.A — the "more" panel: `palette/components/FavientsPanel.tsx` + the favients machinery

**Layout / view**

| # | Function | Where |
|---|---|---|
| A1 | `layout: 'panel'` (default) — destination row · toolbar · search · hint · grouped grid/list · new-group tail · trash · toast · hover preview | `FavientsPanelProps`, FavientsPanel.tsx:686 |
| A2 | `layout: 'strip'` — one horizontal row, Recent first, Presets hidden while Recent is non-empty, fixed 56×30 swatches | FavientsPanel.tsx:928-1042. **Zero callers in the tree** — orphaned by Phase D. |
| A3 | Grid ⇄ list toggle, persisted | `getFavientsViewMode`/`setFavientsViewMode`, `palette/store/favientsPanelPersist.ts` |
| A4 | Grid swatch size + gap follow `paletteFilters.swatchSize` / `paddingSize` (fallback 32×18, gap 1) | FavientsPanel.tsx:~757 |
| A5 | List view: 56 px strip + name + `source · groupLabel` caption. **No hover-enlarge in list** (deliberate, line 520) | FavientsPanel.tsx:~520 |
| A6 | `hint` prop — the intro Hint chip; `null` hides it | FavientsPanelProps |
| A7 | Empty states: shelf-empty (star + three teaching lines), strip-empty, filtered-to-nothing | FavientsPanel.tsx:1165-1180 |
| A8 | Hover preview — 3× wide / 2× tall zoom + name + source | `GradientHoverPreview` (shared with `PickerWall` and `EasingPicker`) |
| A9 | Dated bins — Recent's run splits per local calendar day: Today / Yesterday / "3 Sep" / "3 Sep 2025" | `buildBlocks`, `dayKey`, `dayLabel` in `palette/components/favientBlocks.ts` |
| A10 | Group dividers with in-place rename; `uniqueGroupLabel` prevents two identical labels; Recent's divider is `fixed` (no input) | `GroupDivider`, FavientsPanel.tsx:613 |
| A11 | The seeded **Presets** group (`PRESETS_GROUP = 'g-presets'`, one-time, flag `gmt.favients.seeded`) | `seedPresets` in `registerPaletteUI.ts:167` |
| A12 | Cross-tab refresh on `focus` / `visibilitychange`, plus a module-scope `storage` listener | FavientsPanel.tsx:858; `favientsStore.ts:563` |

**Organising**

| # | Function | Where |
|---|---|---|
| A13 | Drag a swatch → live `Placeholder` → drop reorders (`insertIndexFromPointer`, reading-order hit test) | FavientsPanel.tsx:413 |
| A14 | Drag a gradient IN — from a wall tile (`usePickerModel:357`), a `CanonicalHero` (:209), a generator slot (`GeneratorSourceRow:96`) or another group | `readFavientDrag`, `palette/core/favientDnd.ts` (MIME `application/x-gmt-favient`) |
| A15 | Drop on the tail's lower half → NEW group, divider auto-focused for rename | `{kind:'newgroup'}` |
| A16 | **Trash zone**, visible only while dragging; removes only when `favId` is set (an external gradient dropped there is a silent no-op) | `{kind:'trash'}` |
| A17 | Rename a gradient — **list view only**; grid view has no rename at all | FavientsPanel.tsx:548-570 |
| A18 | Rename a group | `renameGroup` |
| A19 | Drag disabled while the search filter is active; the cue flashes on the drag *attempt* | `canDrag: !filterActive`, `onDragBlocked` |
| A20 | Drag lifecycle hardening: enter/leave depth counter, window `dragend`/`drop`, `useDragEndSafetyNet` (the source can unmount before `dragend`) | FavientsPanel.tsx |
| A21 | Every mutation is ONE undo entry via `favEdit` over the `favients` history provider; restore writes through to localStorage | `palette/store/paramUndoBracket.ts`; `registerPaletteUI.ts:118` |

**Finding**

| # | Function | Where |
|---|---|---|
| A22 | Collapsible transient search — matches name + source + the group's **display label**; never persisted; Escape clears | FavientsPanel.tsx:1131 |
| A23 | `filtered/total` count readout | the toolbar row |
| A24 | **There is no sort.** No sort control, menu or ordering option anywhere in the file; order is the array's, with Recent auto-ordered newest-first | (negative result, verified) |

**Selection / routing**

| # | Function | Where |
|---|---|---|
| A25 | Click = **select** (hero previews) in select-mode hosts; click = **apply** to the chosen destination otherwise | `getFavientSelectMode`, `palette/core/favientTargets.ts` |
| A26 | "Destination" dropdown over `group:'host'` send targets, + `reveal()` + toast; `"no targets in this app"` fallback | `getSendTargets`, `store/sendTargetRegistry.ts` |
| A27 | Header "Palettes" (browse) button — host-registered | `getFavientBrowseAction` (app-gmt, fluid-toy) |
| A28 | Header "Open GMT Gradient Explorer" button — host-registered | `getFavientStudioAction` (app-gmt, fluid-toy) |
| A29 | The body is the drop anchor `data-gx-target="favients"` | FavientsPanel.tsx:1164 |
| A30 | **No multi-select, no shift/ctrl-click, no context menu, no keyboard navigation, no focus ring, no `tabIndex`.** The only `onKeyDown`s in the file are the rename input and the search box. | (negative result, verified) |
| A31 | **Removal is drag-to-trash only** — no per-item ✕, no per-item menu, no Delete key | (negative result, verified) |
| A32 | `FavientsToggleButton` — top-bar show/hide (dock-aware) | `palette/components/FavientsToggleButton.tsx`; mounted by fluid-toy and the old GE shell only |
| A33 | `FavientsEditorEntrance` — the ★ in the stops editor's header (reveal the shelf, or add through the bridge) | `palette/components/FavientsEditorEntrance.tsx` via `setGradientEditorEntrance` |

**The kebab / collection menu — `FavientsSystemMenu` (FavientsPanel.tsx:133-385)**

| # | Function | Where |
|---|---|---|
| A34 | **Import gradient file…** — multi-file `.map .gpl .ggr .cpt .css .json`; parsed, fitted to ≤32 stops, content-deduped, named from the filename, provenance `Import · .<fmt>`, ONE undo entry for the batch | `parseGradientText` + `IMPORT_EXTENSIONS`, `palette/core/importFormats.ts` |
| A35 | Save collection (.json) | `exportCollection` |
| A36 | Load & merge… | `importCollection(text,'merge')` |
| A37 | Replace from file… (confirm) | `importCollection(text,'replace')` |
| A38 | Clear collection (confirm; undoable) | `clear` |
| A39 | **Whole-shelf export** in any of the 16 formats — one bundled file for collection formats (.ai, .idml, .ugr), else one file per gradient in a `.zip` (`NNN_name.ext`, fflate) | `buildCollectionFile` / `buildCollectionZip`, `palette/core/favientsExport.ts` |
| A40 | Lossy-export notice — **`.ai`/`.idml` only**; `.ugr` is silently exempt (that exemption is the file's `@assumption`) | `collectionQualityWarnings` |
| A41 | **Contact sheet (PNG)** — grid, ≤4 columns, 240×44 cells with labels | `buildContactSheet` |
| A42 | Popover viewport clamping | `clampToViewport`, `components/ui/viewportClamp.ts` |

**Caps and budgets:** `RECENT_CAP = 60` on the Recent run only; **no cap on the shelf, on named
groups, or on the collection file**. Parser bounds 16 MB / 300 000 lines / 100 000 anchors.
Export budgets `GRD_MAX` 40, `AI_STOP_LIMIT` 40 (reused for `.idml`), `SVG_MAX` 32,
`UGR_MAX_STOPS` 64.

**Persistence keys.** Collection, **shared origin-wide across all four hosts**: `gmt.favients`,
`gmt.favients.groups`, `gmt.favients.target`, `gmt.favients.seeded`, `gmt.favients.lastgroup`.
Panel window state, per host: `gmt.favients.panel` (app-gmt), `fluid-toy.favients.panel`,
`gmt.gradientExplorer.favients.panel` (old GE). Adjacent: `gmt.paletteFilters` (shared,
deliberately not per-host), `gx.hero.prefs`, `gx.picker.gestureHint`, `gx.v2.recentExports`,
`gmt.ge.groundSet`, `gmt.ge.working.prefs`, `gmt.ge.themeSeeded`.

**Migration code: essentially none.** `COLLECTION_VERSION = 1` is **written but never read** —
`importCollection` gates only on `Array.isArray(parsed?.favients)`, so there is no version gate
and no migration hook for a future revision. `isWellFormedFavient` is a deserialization gate, not
a migration: malformed entries are silently dropped on load and re-saved pruned.
`UNSAFE_KEYS` guards `__proto__`/`constructor`/`prototype` in group ids from untrusted scenes.
The only real back-compat handling is `viewMode?` being optional.

### 1.B — the old Picker stage and its dock panel

| # | Function | Where |
|---|---|---|
| B1 | `CanonicalHero` band — the picked entry's pixel-exact ramp, name + bundle chip | `palette/components/CanonicalHero.tsx` |
| B2 | The hero is a **drag source** onto any registered target, and a click-to-pick surface | CanonicalHero `onDragStart` / `pick()` |
| B3 | ★ save-to-Favients toggle (add with dedup; second click un-saves) | CanonicalHero `toggleSave` |
| B4 | ⬍ **hero enlarge** toggle, shared across every hero, persisted | `palette/store/heroPrefs.ts` (`gx.hero.prefs`) |
| B5 | `HeroSlot` portal — on mobile the hero portals into a fixed rail above the scrolling wall | `palette/components/HeroSlot.tsx` |
| B6 | Bundle provenance line (`selected.bundle`) | PickerStage.tsx:111 |
| B7 | One-time 3-phase gesture hint: middle-drag zoom → right-drag pan → middle-click reset | PickerStage.tsx:49-62 |
| B8 | "Favients" link button (hidden by `hideFavientsLink` for app-gmt) | `openFavientsPanel` |
| B9 | Collapsed→inline search (shared query, `palette/store/pickerSearch.ts`) | PickerStage.tsx:129 |
| B10 | "`N` of `M` — narrowers · clear" readout | PickerStage.tsx:161 |
| B11 | Select tools Rect / Lasso / Paint + instruction caption (Shift add · Ctrl erase · `[ ]` size · Esc) | `usePickerModel` |
| B12 | "▣ N kept · clear" carve chip | `m.clearCarve` |
| B13 | Zoom readout `x×y` + reset | `m.zoom` / `m.resetZoom` |
| B14 | The wall (all behaviour in `usePickerModel` + `PickerWall`) | shared with v2 |
| B15 | Three empty states | PickerStage.tsx:259-274 |
| B16 | Esc deselects; pointerdown outside `[data-gx-keepselect]`/`[data-gx-selectable]` closes the dock but keeps the pick | GradientExplorerApp.tsx:289-308 |
| B17 | Dock: **theme chips** — the semantic vocabulary (rainbow, fire, ocean…), counts, clear | `PickerThemeChips`, `palette/components/PickerControls.tsx` |
| B18 | Dock: source-bundle toggles (core = hide/show, licensed = load/unload on demand, attribution links) | `PickerBundleToggles` |
| B19 | Dock: six quality windows — `qHue qL qC qCov qRb` **and `qWarm`** | `QUALITY_AXES`, `palette/features/paletteFilters.ts` |
| B20 | Dock: **Swatch size** (vec2) + Padding | `swatchSize`, `paddingSize` |
| B21 | Dock: Group by / Rows by / Sort within / Reverse | the three enum params |
| B22 | Mobile: `MobileModeTabs` (Picker · Generator · Image · Favients) | GradientExplorerApp.tsx:159 |
| B23 | Mobile: `MobilePickerControls` — full-width search + three-section accordion via `groupFilter` | GradientExplorerApp.tsx:201 |
| B24 | Responsive dock compaction (shrink at 1120, collapse the shelf at 900) | `useResponsiveDocks` |

### 1.C — the routing layer they share (old shell only)

| # | Function | Where |
|---|---|---|
| C1 | **"select → reveal → place" drop dock** — anchored dropboxes over visible destinations + bottom wells | `gradient-explorer/GradientDropLayer.tsx` over `components/DropTargetLayer.tsx` |
| C2 | Derived intermediate steps — the first unmet `revealPath` step of any hidden target; click or ~400 ms drag-dwell advances; chains to any depth | `deriveIntermediates`, `gradient-explorer/gradientTargets.ts` |
| C3 | Eight registered targets: `gen-a`, `gen-b`, `colorbox`, `curves`, `stops`, `favients`, `fullscreen`, `export` | `registerGradientTargets()` |
| C4 | Drag avatar (cursor-following ramp, native drag image suppressed) | GradientDropLayer + `palette/store/dragVisual.ts` |
| C5 | Landing / cancel morphs | `gradient-explorer/GradientLandingLayer.tsx` |
| C6 | Export-as-PNG-strip well | `downloadGradientPng` |

### 1.D — shell machinery the old entry mounts and v2 does not

`installTopBar` · `installMenu` · `installHelp` (+ GMT Support / Send Feedback) ·
**`installSceneIO({fileExtension:'json'})`** · `installHud` · **`installPwaUpdate`** ·
`installModulation` + `installModulationUI` · `TimelineHost` · `EngineBridge` +
`RenderLoopDriver` · `DraggableWindow`/`PanelRouter` floating panels · `HelpBrowser` ·
FPS counter · `MobileViewportShell` · **`applyPanelManifest`** (so v2 has no dock tab for any
feature, which is why every dock-only customUI block is unreachable there).

---

## 2. Classification

Counts: **ALREADY IN V2 — 36** (11 of them partial) · **MIGRATE — 15** · **SCRAP — 17** ·
**OWNER DECIDES — 6**. Defects found along the way are in §3.8; they are not a bucket.

### 2.1 ALREADY IN V2

*"Partial" means the v2 route lost a capability. Those are called out rather than counted as
migrated.*

| Old | v2 route | Verdict |
|---|---|---|
| A1 panel layout | `GradientExplorerV2App.tsx:377` mounts `<FavientsPanel hint={null}/>` in a `Floating` under the rail; `layout` is not passed, so nothing is trimmed by the call site | **Partial** — fixed `h-[340px]`, not resizable, floatable or dockable; the old one was full-height or a draggable window |
| A3 grid/list toggle | same panel | **Partial** — the persisted value lands in the wrong host's blob (§3.8b) |
| A4 grid swatch size | reads `paletteFilters.swatchSize` | **Partial** — v2 has no control that writes it (B20 is gone), so the grid is fixed at 32×18 unless the user opens app-gmt's overlay |
| A5 list view | same panel | genuine — and it is the one view the rail/wall combo has no equivalent for |
| A6 hint | `hint={null}` | genuine (deliberate) |
| A7 empty states | same panel | **Partial** — the copy is stale ("…from the Picker, Generator, Image, or Stops") |
| A8 hover preview | panel and wall | genuine |
| A9 dated bins | promoted: bins are **sets on the rail** (`listGroundSets` → `bin:<YYYY-MM-DD>`), and the panel keeps its dividers | genuine, improved |
| A10/A11 groups + Presets | rail chips + panel dividers; Presets hides once Recent exists (`groundSets.ts:110` re-applies the strip's rule) | genuine |
| A12 cross-tab refresh | unchanged | genuine |
| A13-A15 drag reorder / into group / new group | in the panel **and** on the rail (`SetRail` drop; tail = new group) | genuine, improved |
| A16 trash zone | in the panel | genuine |
| A17 rename gradient | panel, list view only | genuine (inherits the grid-view gap) |
| A18 rename group | panel, **and** rail double-click / right-click Rename | genuine, improved |
| A19 drag-disabled-while-filtered | unchanged | genuine |
| A21 one undo entry per gesture | `paramEdit` everywhere, incl. `SetRail` and `keepThese` | genuine |
| A22 panel search | panel search **and** the wall's own search over a set | genuine, improved |
| A23 counts | rail chips carry counts; panel keeps `filtered/total` | genuine |
| A25 select-mode click | v2 sets `setFavientSelectMode(true)`; a set tile IS a shelf pick (`usePickerModel({source})` reports mode `'favients'`) | genuine |
| A34-A42 the whole kebab menu | **reachable** — the panel v2 mounts renders `FavientsSystemMenu` unchanged | **Partial** — reachable but buried (more → kebab), always whole-collection, and behind a gate that can lock itself out (§3.8a) |
| B1 hero band | `WorkingHero` — bigger, and it IS the stops editor | genuine, improved |
| B3 ★ save | the heart `Act` in the use cluster | genuine |
| B9 search | the 260 px search pill in the wall header | genuine, improved |
| B10 count readout | the arrange sentence + "N match" + "clear all" | genuine, improved |
| B11 carve tools | the floating tool palette (Zoom · Box · Lasso · Paint) + a caption while active | genuine |
| B12 kept chip | "N kept, undo" in the carve caption | genuine |
| B13 zoom readout | bottom-right `Floating` with `Fit` and a Padding slider under the zoom tool | genuine, improved |
| B14 the wall | same `usePickerModel` + `PickerWall` | genuine |
| B15 empty states | four v2 variants incl. an empty-set line | genuine |
| B16 Esc / click-away | the Esc chain (panel → tray → armed slot) + `data-gx-keepselect` | genuine |
| B18 bundle toggles | Filters ▸ SOURCES, `layout="row"` | genuine |
| B19 quality windows | `qHue`+`qL` on the pad, `qC` on the strip, `qCov`+`qRb` in Filters ▸ LOOK | **Partial** — `qWarm` not rendered (deliberate) |
| B21 arrange | Filters ▸ ARRANGE + the arrange sentence + the pad following the arrange axes | genuine, improved |
| Generator: `mixL/mixC/mixH` + Swap | `Tray.tsx` MixFace, plus a new **Link** toggle | **Partial** — no keyframe diamonds, and the old `MixBlend` allowed dragging/typing **past 0/1 to extrapolate beyond A or B**; the v2 `Slider` is clamped. Also `resetMix` has no v2 caller. |
| Generator: the whole **Modify** group (`hueRotate chroma contrast bands repeats phase`) | Adjust face, two bins | **Partial** — `keyframes={false}` by design; descriptions demoted to tooltips |
| Generator: `mirror` + `reverse` | reachable **transitively** — `ModifyTogglesControl` is a `parentId:'phase'` customUI child, and `AutoFeaturePanel.tsx:631-634` renders nested customUI without consulting `whitelistParams` | genuine **(static read only — see §6)** |
| Generator: **Noise** group + targets | Adjust's third bin via `groupFilter="Noise"`; `NoiseTargetsControl` arrives as the `noiseFreq` child | **Partial** — `reseedNoise` has no v2 caller, so the noise seed can never be changed |
| Generator: **Curves** | Curves face — fit on entry, on/off, Reset, Detail, Smooth, ghost, the pencil/smoothing-brush tools, step-aware fitting | **Partial** — fits from the *working base* (`fitFromChannels`), not `fitFromSource` (the A×B mix); Detail 1-10 → 2-10, Smooth 1-15 → 0-10; `bakeMainToCurve` and `fitCurvesFromRamp` have no caller |
| Export formats | `ExportMenu` + `exportActions.ts` — all 16 formats, Copy + Download, PNG strip, plus an output-profile switch the old panels never had, plus a hover flyout of the last three (`gx.v2.recentExports`) | **Partial** — no output **text preview**, and no `.ai`/`.idml` **lossy warning** on the single-gradient path (it survives only for collection export inside `FavientsPanel`) |
| C3 `favients` / `fullscreen` / `stops` / `export` targets | ★, the rail drop, the armed Mix slot; the Wallpaper icon; the hero IS the stops editor; ExportMenu ▸ PNG strip | genuine |
| C3 `gen-a`/`gen-b` | the armed Mix slot (`armedTarget.ts`) | **Partial** — only B is reachable; nothing in the Mix face arms A, and `SourceBands.MixSources`' click is repurposed to keep-source/cancel |
| C4/C5 drag avatar + landing | the avatar still fires from wall drags (`setDragOrigin` in `PickerWall`) | **Partial** — `GradientDropLayer`/`GradientLandingLayer` are not mounted in v2, so the landing and cancel morphs never play |

### 2.2 MIGRATE — 15 items, ranked by what would hurt most to lose

| # | Item | Why it earns its place | Where in v2 | Size | Files |
|---|---|---|---|---|---|
| M1 | **Whole-set export + contact sheet as a first-class action** (A39-A41) | `plans/ge-v2-design.md` §5.8 already specifies "Export (hero **+ My Gradients group**)" and puts the contact sheet in the Image group. Today it exists only in the panel's kebab and always operates on the WHOLE collection — never on the set you are looking at, which is the noun Phase D created. `buildCollectionZip(favients, fmt)` takes an array; `membersOf(setId, favients)` is a one-line substitution. | The **set rail**: a right-click item on a chip ("Export this set…") opening the existing `ExportMenu` in a collection mode. | Medium | `v2/SetRail.tsx`, `v2/ExportMenu.tsx`, `v2/exportActions.ts`; reuse `palette/core/favientsExport.ts` unchanged |
| M2 | **Import a gradient file** (A34) | The only way INTO the app from other software, and the counterweight to 16 export formats. Today it is three clicks deep in a panel most users will not open, and dropping a `.map` on the v2 window does nothing (the root `useImageDrop` takes images only). | Two places: a rail action ("Import…") **and** the root drop handler, so a palette file dropped anywhere lands in the lit set. | Medium | `v2/SetRail.tsx`, `v2/GradientExplorerV2App.tsx`; reuse `palette/core/importFormats.ts` (pure, guarded) |
| M3 | **Per-item remove, and a keyboard path, on the shelf** (A30, A31) | Removal is drag-to-trash **only**, in every host — no ✕, no menu, no Delete key — and there is no keyboard navigation, focus ring or `tabIndex` anywhere in the panel. On the v2 wall a set tile *does* have "Remove from My Gradients" on right-click, so the panel is now the worse of the two surfaces for the one job it exists to do. | The panel's swatch: a right-click menu (Remove · Rename · More like this), plus Delete on a selected item. | Medium | `palette/components/FavientsPanel.tsx` (**shared — §4**) |
| M4 | **The hero as a drag source** (B2) | In v2 you cannot drag the working gradient onto a rail chip to file it — you must ★ it (which files it in Kept) and then drag the tile. Every other gradient bar in the shell is draggable; **L7** says the gesture is the same on every bar. Three calls (`setFavientDrag`, `beginCustomAvatarDrag`, `setDragOrigin`) reproduce it. | `WorkingHero`'s ramp / name row. | Small | `v2/WorkingHero.tsx` only |
| M5 | **Theme chips / the theme vocabulary** (B17) | ~3,000 catalogue entries carry a theme; in v2 they are reachable only by typing the word into search. The plan's §10 flags this twice as still-missing. Grouping by Category shows themes as bands but gives no way to select one. | Filters ▸ SOURCES, or a fourth THEMES row; the component exists and is registered. | Small | `v2/BrowseStage.tsx` (mount `PickerThemeChips` as `PickerBundleToggles` is mounted) |
| M6 | **Per-slot source modifiers in Mix** | 14 live DDFS params (`aHueRotate`…`bMirror`) that ride undo, presets and animation, with **no UI in v2 at all**, plus `bakeSlot` and `resetSlot`. "Reverse the gradient I am mixing with" is a basic move. | The Mix face, as a ⚙ on the other gradient's bar — exactly what `GeneratorSlotMods` already is. | Medium | `v2/Tray.tsx`; re-host `palette/components/GeneratorSlotMods.tsx` (**shared — §4**) |
| M7 | **Delete a group from the rail** | Named in §10 as a known Phase-D gap: a group can be created by a drop or by "Keep these N", renamed and filled — but not removed except by emptying it item by item. Creating is one gesture; undoing that creation is not. | `SetRail` right-click menu, beside Rename. | Small | `v2/SetRail.tsx`, `palette/store/favientsStore.ts` (a `removeGroup` that re-homes or removes members) |
| M8 | **Save / Restore the studio** (1.D, `installSceneIO`) | Five document providers are registered in v2 (`favients`, `stops`, `generator`, `image`, `working`) and **nothing in v2 mounts a UI that calls them** — dead weight, and the working gradient does not survive a reload (only its Recent entry does). Design §5.8 asks for "autosaves to localStorage always; menu has Restore". | Settings panel, or a small Restore entry; autosave through the same registry. | Medium | `v2/main.tsx`, `v2/GradientExplorerV2App.tsx`; providers already exist |
| M9 | **The generator's reset / reseed actions** | Four actions with no v2 route: **Reseed** (`reseedNoise` — the noise seed can never be changed in v2, so Noise is effectively one fixed grain), **Reset mods** (`resetMainMods`), **Reset all** (`resetAll`), **Reset the blend** (`resetMix`). Each is one store call already written and undo-bracketed. | Reseed → the Adjust face's Noise bin. The three resets → a small ⋯ on the Adjust and Mix faces (or right-click-to-default on each slider, which the soft `Slider` already supports). | Small | `v2/Tray.tsx` only |
| M10 | **A resize on the pull-up** (A1) | The pull-up is a hard-coded 340 px `Floating` over the wall; the old shelf was full height and resizable. Managing 60 Recent entries plus groups in 340 px is the one place v2's panel is worse than the old one. | A drag handle on the `Floating`'s bottom edge, persisted. | Small | `v2/GradientExplorerV2App.tsx` |
| M11 | **`installPwaUpdate`** | v2 has no update prompt at all. When the entry point swaps in Phase G, installed-PWA users get no "new version" path. | One line. | Small | `v2/main.tsx` |
| M12 | **"More like this" from a shelf/set tile's menu** | The set tile's menu offers only "Remove from My Gradients". Ranking the catalogue by one of *your* gradients is the most useful thing you can do from a kept gradient, and `setSimilarityAnchor` is already there. | `BrowseStage`'s `onTileMenu` (and M3's panel menu). | Small | `v2/BrowseStage.tsx` |
| M13 | **The `.ai`/`.idml` lossy warning on the single-gradient export** | `aiReductionError`/`aiStopCount` exist and the collection path uses them; the hero's ExportMenu silently ships a simplified 40-stop swatch. A user exporting one complex gradient to Illustrator gets no notice. | An inline note on the `ai`/`idml` rows in `ExportMenu`. | Small | `v2/ExportMenu.tsx` |
| M14 | **Arrow-key / Home-End navigation on the wall** | Named in §10 as not built (the research's P1e). With M3 it would make the whole gradient surface keyboard-reachable; today it is pointer-only. | `PickerWall` behind an additive prop so app-gmt opts in separately. | Medium | `palette/components/PickerWall.tsx` (**shared — §4**) |
| M15 | **The phone layout** (B5, B22, B23) | Phase F is unbuilt, so `gradient-explorer-next.html` has no phone form at all while the old shell has a complete one. Listed so the parity checklist does not lose it. | Phase F. | Large | `v2/*`, `gradient-explorer-next.html` |

### 2.3 SCRAP — 17 items

| # | Item | Why |
|---|---|---|
| S1 | **The "select → reveal → place" dock** (C1, C2, C4) — `GradientDropLayer.tsx`, `gradientTargets.ts` | Superseded by a better v2 mechanism: the armed slot plus the hero's use cluster. The whole reveal-path machinery exists because the old shell hid destinations behind tabs and sub-modes; v2 has neither (**L3** — sources are reached into, not switched to), so there is nothing to reveal. Keeping it re-imports the tab model it was built to paper over. |
| S2 | The `gen-a`/`gen-b`/`colorbox`/`curves`/`stops` send targets (C3) | Their `revealPath`s name `tab:Generator`, `gen:mixed`, `gen:colorbox`, `gen:stops` — states v2 does not have. |
| S3 | **The gesture hint** (B7) and `gx.picker.gestureHint` | `PickerStage`'s own JSDoc says "Old-shell chrome; v2 drops it". Replaced by a tool palette plus a caption that appears only while a tool is active — **L9**. |
| S4 | **The "Favients" link button** (B8) | The rail is always on screen; a word-link to a panel one chevron away is the "+ more as a word where a chevron does" that **V6** forbids. |
| S5 | **The bundle provenance line** (B6) | The wall's hover tooltip already carries source and facets; a second grey line under the name is `fg-dim`-carrying-meaning, which the contrast pass removed (**V5**). |
| S6 | **The hero enlarge toggle** ⬍ (B4) in v2 | v2's hero is a fixed card whose ramp height is driven by the split state; a user-set height would fight it. Keep `heroPrefs` alive for app-gmt and the old shell; do not wire it into v2. |
| S7 | **Swatch size slider** (B20) in v2 | Superseded by `tileSizeFor` (size follows count) plus zoom; the plan records the decision. Note the side effect in §2.1 — the panel grid loses its only control; M10 or a larger default is the answer, not restoring the slider. |
| S8 | **`qWarm` cool↔warm** (B19) in v2 | Owner decision, Phase A iteration 2: redundant with hue. The param stays (app-gmt still shows it); v2 just does not render it. |
| S9 | **The three-tab mode strip, the docks, floating panels** (B22 desktop half, B24) | **L1/L3**: one ground, one hero, one rail. `useResponsiveDocks` exists only to stop two docks crushing the stage. |
| S10 | **`installMenu` / `installHelp` / `HelpBrowser` / `installHud` / FPS** | `plans/ge-v2-design.md` §5.9 lists these as "what leaves the standalone shell". Help content is GMT-studio-shaped. (Send Feedback is OD4.) |
| S11 | **`TimelineHost` / `installModulation` / `installModulationUI` / keyframe diamonds** | §5.9 again; v2 already passes `keyframes={false}` everywhere. Deliberate. |
| S12 | **The "Destination" dropdown** (A26) in the GE host | Select-mode hides it, and v2 registers no `group:'host'` targets for it to list. It stays alive for app-gmt and fluid-toy, where it is the real apply path. Do not re-add it to GE. |
| S13 | **`FavientsPanel layout="strip"`** (A2) | Built for the v2 bottom shelf, which Phase D deleted; **zero callers in any host**. §10 already asks. Deleting it also removes `STRIP_SWATCH_W/H`, the `strip` prop on `FavientSwatch`, and ~115 lines of branch. |
| S14 | **Variants / Snapshots** (`variantsStore.ts`, `variantsCore.ts`, `rampTween.ts`) | Owner, 2026-09-08: removed. Not an old-shell item (the old shell never mounted them) — listed because they now have no consumer but their two harnesses, and Phase G owes a decision plus ADR-0112's status. |
| S15 | **`GeneratorExtrasPanel` + `ImageExtrasPanel` export blocks** (`palette-generator-extras`, `palette-image-extras`) | Superseded, and strictly, by the hero's `ExportMenu` — same 16 formats, better grouping, recents flyout, an output-profile switch the old blocks never had. Only the text preview and the lossy warning are worth keeping, and the latter is M13. |
| S16 | **`ColorBox`'s supporting cast** — `GradientSourcePicker.tsx`, `EasingPicker.tsx`, `easingThumb.ts`, `colorBoxFit.ts`, `easings.ts` | Every use of an easing curve in this suite is ColorBox-only; `colorBoxFit` is already effectively harness-only. **Conditional on OD3** — if Sweep does not come back, these five go with it. |
| S17 | **The generator's Stops sub-mode** (`generatorMode === 2` + the `palette-editor-dock` block) | The stops editor IS the v2 hero; blend survived on the strip and the output profile moved into ExportMenu (C.15). The one orphan is `StopsDockPanel`'s **"Reset to default"**, which has no v2 equivalent — a one-line addition to the strip's menu if it is wanted. |

### 2.4 OWNER DECIDES — 6 questions

| # | Question | Recommendation |
|---|---|---|
| OD1 | The "more" panel duplicates the rail (groups, rename, drag-to-group) and the wall (tiles, search, hover). **Trim it to only what the rail and wall cannot do** — import/export, list view, rename-a-gradient, trash — or keep it whole as the manage-everything surface? | **Trim it.** Two surfaces doing the same job in two dialects is the fork anti-pattern 1 warns about, and a panel whose unique value is import/export should say so. It also makes M1/M2 natural: the unique parts get promoted, the duplicates go. |
| OD2 | Does the **contact sheet** stay? It is the only "print my palette library" output and has no v2 home. | **Keep it, moved** — one call (`buildContactSheet`), belongs in ExportMenu's "As an image" group beside the PNG strip, scoped to the lit set (M1). |
| OD3 | Should **Sweep / ColorBox** come back in any form? It is the only *from-nothing* generator — every other source needs an existing gradient or an image. | **Bring back the capability, not the mode:** a "New gradient" action seeding the hero with a two-stop ramp is most of the value for a tenth of the surface. The full recipe (9 `cb*` params, three easing choosers over 25 curves, the least-squares fitter, `GradientSourcePicker`) I would leave scrapped — S16 then applies. |
| OD4 | **Send Feedback** (`engine-gmt/feedback`) is mounted by the old shell, not by v2. Once GE is a standalone product, is feedback wanted in it? | **Yes** — it is the only in-app channel and it is a two-line install plus a panel entry. But it is a product call. |
| OD5 | The rail's control is labelled **"more" / "less"**. Now that the panel behind it is the *manage* surface rather than an overflow, should it be named for what it holds ("My Gradients", "Manage")? | **Rename it.** "more" made sense when it expanded a strip of the same things; it now opens a different kind of surface — and it is the last place the old shelf's vocabulary survives. |
| OD6 | The old Mix sliders could be dragged or typed **past 0 and 1 to extrapolate beyond A or B**; v2's `Slider` clamps to 0-1. Restore the soft bounds? | **Probably yes** — it is a real creative capability, not a rounding of the old UI. Honest caveat: I did not verify whether the shared `Slider`/`ScalarInput` supports soft bounds without a change, so the size is unknown. Check before committing to it. |

---

## 3. The important paths not yet integrated

### 3.1 · The Generator / Build path — what v2 has NO route to

`BuildStage.tsx` was deleted in Phase C and the Mix tray replaced part of it. Measured against
`palette/features/paletteGenerator.ts` and `registerPaletteUI.ts`:

**Still fully reachable in v2** (not a loss): the mixer's `mixL`/`mixC`/`mixH` and `swap`; the
whole **Modify** group; `mirror` + `reverse` (via the `parentId:'phase'` customUI child); the
whole **Noise** group incl. the L/C/h targets; **Curves** — and better than the old one (fits on
entry, understands step segments, has the elastic smoothing brush).

**Unreachable in v2 — the actual gap:**

| Lost capability | Old home | Stranded code |
|---|---|---|
| **ColorBox / Sweep mode** — per-channel L/C/h start→end sweep under an easing curve; the *only* way to author a gradient from nothing | `generatorMode === 1`; `ColorBoxControls.tsx` | **9** hidden DDFS params (`cbL/C/H` × Start/End/Easing); `palette/core/colorBoxFit.ts` (least-squares fit over the curve set); `palette/core/easings.ts` (**25** curves, order load-bearing); the colour-ramp slider tracks; `EasingPicker`'s portalled 25-curve grid with hover-enlarge. **`enterMix()` at `GradientExplorerV2App.tsx:89` actively forces `generatorMode` back to 0**, so a saved document in mode 1 or 2 is silently normalised. |
| **"Fit from gradient…"** — approximate an existing gradient as ColorBox sweeps | `ColorBoxControls` → `GradientSourcePicker` | `fitColorBoxFromCatalog`, `fitColorBoxFromRamp` |
| **Per-slot source modifiers** (7 dials × 2 slots) + per-slot **Bake** and **Reset** | `GeneratorSourceRow` ⚙ → `GeneratorSlotMods` | 14 live params on undo/preset/animation with no UI; `bakeSlot`, `resetSlot`. **M6.** |
| **Slot A as a pickable / armable / draggable object** | `SourceRow` for A | v2 arms only B; `SourceBands.MixSources`' click is repurposed to keep-source/cancel, so A cannot be picked up or dragged out |
| **Reseed the noise** | `GeneratorModifierActions` | `reseedNoise` — the seed can never change in v2, so Noise is one fixed grain. **M9.** |
| **Reset mods · Reset all · Reset the blend · Bake → curve** | `GeneratorModifierActions`, `GeneratorExtrasPanel`, `MixBlend` | `resetMainMods`, `resetAll`, `resetMix`, `bakeMainToCurve` — all four have zero v2 callers. **M9** (the first three). |
| **Fit curves from the A×B mix, and fit-by-drop** | the curves block; the `curves` send target | `fitFromSource` (with its overwrite-warning toast) and `fitCurvesFromRamp`. v2 fits from the *working base* instead. |
| **Searchable source picker** over 11k + favourites | `GradientSourcePicker.tsx` | orphaned with ColorBox; its only importers are `ColorBoxControls` and `EasingPicker` |
| **The generator's export block** | `GeneratorExtrasPanel` (+ `GeneratorModifierActions`) | still *registered* by `registerPaletteUI` in v2 but never rendered — superseded (S15), except the text preview and the lossy warning (M13) |
| **Stops sub-mode dock** | `generatorMode === 2` | blend survived on the strip, output moved to ExportMenu; **"Reset to default" has no v2 equivalent** (S17) |
| **Keyframe diamonds and soft bounds on Mix** | `MixBlend` (`DraggableNumber` + `KeyframeButton`) | diamonds are a deliberate scrap (S11); the soft bounds are OD6 |

**Honest verdict:** the *mixing* and *modifying* half is fully migrated and improved. What v2
genuinely cannot do is **(a) author a gradient from nothing**, **(b) modify one side of a mix
independently**, and **(c) reset or reseed anything**. (a) is OD3; (b) is M6; (c) is M9.

**Is it dead code?** `npm run orphans` is green today, which proves nothing — see §5.1.

### 3.2 · FavientsPanel's import / export paths

**Correction to the brief's premise, stated plainly: these paths ARE reachable in v2.** The
pull-up mounts `FavientsPanel` with the default `layout="panel"`, which renders
`FavientsSystemMenu` in its toolbar (FavientsPanel.tsx:1125), so import, collection
save/load/replace/clear, whole-shelf export in all 16 formats and the contact sheet all work
today. What is *not* integrated is how they are reached and scoped:

1. **Two levels deep, in the old dialect.** more → kebab → menu. Nothing in the v2 language points at them.
2. **Always whole-collection, never the lit set.** After Phase D the natural noun is "this set". One-line change. **M1.**
3. **No drop path for a palette FILE.** `useImageDrop` at the v2 root takes images only; a `.map`/`.ggr` dropped on the window is ignored. **M2.** (`.grd` import does not exist in any host — `importFormats.ts:9` defers it explicitly.)
4. **`.ase`, Tailwind and design-tokens do not exist.** 16 formats, none of them these three; the only occurrences in the tree are two comments. The plan's Phase-G "planned" status is accurate. Worth knowing before that work starts: `palette/core/indesignIdml.ts:3` explains that **ASE cannot carry gradients** — which is why `.idml` exists. An `.ase` export would be a *palette* export (the sampled swatches), not a gradient export, and should be labelled as such.
5. **Grouping, dated bins and selection are all reachable** — through the rail (better) and inside the panel. I found nothing in that code v2 cannot get at.
6. **List view is the one panel-only view.** The wall draws bars; only the panel shows name + source + group as rows. That is a genuine capability the rail/wall combo lacks and the strongest argument for keeping a trimmed panel (OD1).
7. **The collection file has no version gate.** `COLLECTION_VERSION = 1` is written and never read; `importCollection` checks only `Array.isArray(parsed?.favients)`. A future revision has no migration hook, and an old build would silently half-import a new file.
8. **Stale teaching text.** The empty state still says *"Drag a gradient here from the Picker, Generator, Image, or Stops to save it"* — three of those four do not exist in v2. Phase G's label sweep (S5 remainder) should catch it.
9. **Doc drift inside the panel**: the comment at FavientsPanel.tsx:536 says the name *double-clicks* to rename; the handler at :565 is `onClick` and the tooltip says "Click to rename".

### 3.3 · Whole-shelf operations have exactly one home

Every one of them — import, save, merge, replace, clear, per-format zip, collection file, contact
sheet — lives in `FavientsSystemMenu` and nowhere else. Grep confirms no other caller anywhere in
the tree. That is fine as an implementation, and fragile as a product: **one gate
(`sets.length > 1`) stands between the user and all of it**, and that gate can close on itself
(§3.8a).

### 3.4 · The routing layer (`gradientTargets` / `GradientDropLayer`)

Ranked here because I recommend **scrapping** it (S1) but the decision should be conscious: it is
873 lines of old-shell-only behaviour across three files. The one piece worth salvaging is the
**landing morph** (`GradientLandingLayer.tsx`, 143 lines): it is decoupled by design — always
mounted, reads the `dragVisual` transient — so mounting it in v2 would give the rail's
file-a-gradient drop the same "settles into the slot" feedback for one import and one JSX line.
Cheapest polish item in this audit.

### 3.5 · Scene save / load

Five document providers registered, no UI. **M8.** The quietest gap and the one most likely to
surprise: everything *looks* persistent (filters, set id, favourites all survive a reload) until
you notice the gradient you were editing does not.

### 3.6 · Orphaned paths in the files the brief named

- **`GradientSourcePicker.tsx`** — only importers are `ColorBoxControls` and `EasingPicker`; dies with ColorBox. Its `MAX_ROWS = 300` cap ("until the 11k catalog gets a virtualized list") is moot — the wall does this better.
- **`StopsDockPanel.tsx`** — registered as `palette-editor-dock`, rendered only through `paletteGenerator`'s `generatorMode === 2` condition (v2 forces 0) and app-gmt's Stops tab. In v2: registered but unrenderable. Only "Reset to default" has no v2 equivalent.
- **`CanonicalHero.tsx`** — alive (`PickerStage` → app-gmt, `GeneratorStage`, `ImageStage`). Everything it does that v2 wants is already in `WorkingHero` except B2 (M4).
- **`PickerControls.tsx`** — `PickerBundleToggles` is used by v2; `PickerThemeChips` is registered but rendered nowhere in v2 (M5). Its bundle rows still use `fg-dim`, flagged in §10 and still true.
- **`MobileModeTabs` / `MobilePickerControls`** — not exported; private components inside `GradientExplorerApp.tsx`, so they die with the file. Phase F rebuilds (M15).
- **`FavientsEditorEntrance`** — unreachable in v2: the hero passes `chrome="strip"`, and `AdvancedGradientEditor.tsx:92` states the host entrance is not rendered in that chrome.
- **Stops-editor "Send to Favients"** (`components/gradient/gradientActions.ts:63-74`) — unreachable in v2: with `inspectorHost` set, `onlySections` keeps only `Actions` and `View`, filtering the `Favients` section out. (★ on the hero covers the same job, so this is a correct scrap, not a loss — but it is worth knowing it is gone.)
- **`palette/core/rampCanvas.ts` and `palette/components/easingThumb.ts`** — reachable today only from old-shell files. If S1 and S16 both land, both files go.
- **The favients *scene document* provider** (`palette/store/favientsDocument.ts`) — registered for every host, fires only from SceneIO, which v2 does not install.

### 3.7 · Annotation and prose drift found on the way

Six prose claims that are now factually wrong, all naming code deleted in Phase C. None is
machine-checkable; none is `@stale`-tagged. **No source was changed by this audit.**

1. `palette/components/PickerWall.tsx:20` — the header still describes the selected swatch as *"drawn ENLARGED in place — oversized + centred on its cell, shadow-lifted… with a thin cyan ring"*. The code at :326-341 does the opposite and says so (*"the 1.8× showcased copy with a shadow is gone"*). Wrong for **every** host, app-gmt included.
2. `palette/components/GeneratorStage.tsx:29-30` — *"…so the v2 BuildStage can reuse them"*.
3. `palette/components/ColorBoxControls.tsx:3-4` — *"…so the v2 `BuildStage`'s Sweep recipe can reuse it"*.
4. `palette/components/GeneratorSourceRow.tsx:3,18-25` — the whole "v2 additions" block describing `onSlotClick`/`armed` as passed by `BuildStage`; **both props now have zero callers**.
5. `palette/store/armedTarget.ts` header — *"`BuildStage` passes `onSlotClick` to `SourceRow`…"*.
6. `gradient-explorer/v2/GradientExplorerV2App.tsx:26-27` and `:148`, and `v2/ui/bar.ts:6` — all three still describe `BuildStage`, `SourceRow`, `MixBlend` and `ColorBoxControls` as v2 consumers. v2 imports none of them.

### 3.8 · Defects found in v2 while auditing

Not a migration bucket — things that are wrong now.

**(a) "Clear collection" can lock the user out of the collection menu.** Both the rail and the
pull-up are gated on `sets.length > 1` (`GradientExplorerV2App.tsx:372,375`), and
`listGroundSets` returns `[All]` when the shelf is empty. `clear()` empties `favients` **and**
`groupLabels`. So using *Clear collection* from inside the pull-up makes the pull-up itself
unmountable — taking Import and Load & merge, the only ways back in, with it. The sole recovery
is to make a gradient (a `collectRecent` creates a bin, which restores the rail). The old shell
and app-gmt have no such gate. **Derived by reading the gate and `listGroundSets`; not executed.**

**(b) v2 writes its shelf view preference into app-gmt's blob.** v2 never calls
`mountFavientsPanel`, so `activeStorageKey` in `favientsPanelPersist.ts:73` stays at its module
default `gmt.favients.panel` — app-gmt's key. Toggling grid/list in the v2 pull-up changes
app-gmt's shelf layout and vice versa. The file's own JSDoc says the key is set "from the last
`restoreFavientsPanel` call (hosts pass it once at boot)"; v2 is a host that never does. A
cross-host leak, cheap to fix (call `restoreFavientsPanel` with a v2 key, or set the key
directly).

**(c) `FullscreenGradientOverlay` runs the whole generator pipeline per render in v2, and throws
the result away.** `gradient-explorer/FullscreenGradientOverlay.tsx:98` calls
`useGeneratorDerived().config` **unconditionally**, then uses it only at :101 behind
`if (hero?.mode === 'generator')`. v2 never sets that mode (it comes from
`CanonicalHero mode="generator"`, which v2 does not mount). So every render of the fullscreen
overlay runs the two-source mix pipeline plus a Douglas–Peucker `fitRampToStops` for nothing.
This is also **the one hard dependency that would keep `useGeneratorDerived` alive** after the
generator is retired — it must be removed before, or as part of, Phase G. *(Confirmed by reading;
not profiled.)*

**(d) `ExportMenu`'s `More` group is dead.** All 16 formats are covered by the four named groups,
so `rest` is always empty and the `More` `ZoneLabel` never renders. Harmless, but it is the only
literal "More" in the codebase and it confuses exactly this kind of search.

**(e) The kebab popover may clip inside the 340 px pull-up.** `FavientsSystemMenu` clamps against
the **viewport**, but it lives inside an `overflow-hidden` 340 px `Floating`. Measured from the
class list it fits with roughly 70 px to spare — less with the search row open and the lossy
notice rendered — and there is no scroll fallback. **Unverified at runtime; needs one look.**

---

## 4. Three-host safety

Four hosts, not three, and the fourth matters: **fluid-toy** mounts the palette suite too
(`fluid-toy/panels.ts:196`, `fluid-toy/main.tsx:374` with its own `fluid-toy.favients.panel` key,
plus the top-bar `FavientsToggleButton`).

| Host | Mount | Capability registration |
|---|---|---|
| **app-gmt** | `main.tsx:675` `favientsPanelEntry({dock:'right', order:90})`, `:680` `mountFavientsPanel()` (default key, floats) | `registerFeatures.ts:89` `setFavientBrowseAction` (opens the Picker overlay), `:95` `setFavientStudioAction` |
| **fluid-toy** | `panels.ts:196`, `main.tsx:374` (own key, `paletteFilters:false`), `:133` top-bar toggle | `registerFeatures.ts:125` browse `null`, `:126` studio → new tab |
| **Old GE shell** | `setup.ts:26,44` (dock left, own key) **plus a second direct mount** at `GradientExplorerApp.tsx:349` for the phone branch | `registerFeatures.ts:36` `setFavientSelectMode(true)`; browse deliberately unset |
| **v2 GE shell** | `GradientExplorerV2App.tsx:377` `<FavientsPanel hint={null}/>` — **no `mountFavientsPanel`** (see §3.8b) | `v2/registerFeatures.ts:34` `setFavientSelectMode(true)` |

**`app-gmt/PalettePickerOverlay.tsx` does NOT mount `FavientsPanel`.** Its coupling to this
surface is exactly: `openFavientsPanel`, `FavientsIcon`, `FAVIENTS_ACCENT`, and — transitively
through `PickerStage` → `usePickerModel` → `setFavientDrag` — the DnD payload contract. It
reaches **nothing** in the generator path (grepped `app-gmt/`, `fluid-toy/`, `fractal-toy/`,
`engine/`, `engine-gmt/`): app-gmt's only generator exposure is the boot-time registration inside
`registerPaletteUI`.

| Recommendation | Shared? | Note |
|---|---|---|
| M1 export the lit set | No — v2 files + a pure core read-only | `favientsExport.ts` has one caller; a second is additive |
| M2 import | No change needed to `importFormats.ts` (pure, guarded) | only the callers are new |
| **M3 per-item remove + keyboard** | **Yes — `FavientsPanel.tsx`, all four hosts** | Adding a context menu changes the panel everywhere. Do it additively (a menu is new, not a replacement) and keep `favEdit` bracketing so undo behaves in app-gmt too. |
| M4 hero drag source | No — `WorkingHero` is v2-only | |
| **M5 theme chips** | **Yes — `PickerControls.tsx` renders in app-gmt's sidebar** | Mount it in `BrowseStage`; do **not** restyle the component in place or app-gmt's panel changes with it (Phase A hit exactly this with `QualityRangePad`) |
| **M6 slot mods in Mix** | **Yes — `GeneratorSlotMods` + `GenParamSlider` render in `GeneratorStage`** | Re-host, do not rewrite. The `soft` skin arrives by context (`InputSkinProvider` in `Tray`), so the old shell is untouched by construction. |
| **M7 delete a group** | **Yes — `favientsStore` is the shared `gmt.favients` collection, live across all four hosts via the `storage` listener** | A destructive operation on shared data: needs `paramEdit` and a confirm |
| M8 save/restore | No — v2 entry only | |
| M9 reset/reseed | No — `v2/Tray.tsx` only | |
| M10 resize the pull-up | No | |
| M12 More-like-this on a tile | No — `BrowseStage`'s own `onTileMenu` | |
| M13 lossy warning | No — `v2/ExportMenu.tsx` | |
| **M14 wall arrow keys** | **Yes — `PickerWall.tsx` is app-gmt's overlay too** | Behind an additive prop defaulted off, like `tileRadius` / `gutter` / `onViewport` were |
| S1 scrap the drop dock | Old shell only — `gradientTargets.ts` registers only `group:'mode'` targets; app-gmt registers its own `group:'host'` set | Safe to delete **with the old entry point**, not before |
| S7 swatch-size slider | **Shared param** — `paletteFilters.swatchSize` drives app-gmt's overlay AND the FavientsPanel grid in every host | Do not remove the param; v2 simply does not render it (already the case) |
| S13 delete `layout="strip"` | Shared component, but no host sets that value | Safe. Removing the `layout` prop entirely is also safe today; removing **`hint`** is not (v2 passes `hint={null}`) |
| S15 scrap the extras panels | **Shared registration** — `registerPaletteUI.ts:29-32,69-72` imports and registers them for every host, and `smoke:boot` boots app-gmt through that file | Remove the *mounts* freely; removing the *registrations* reds `smoke:boot` unless `registerPaletteUI` is updated too |
| S16 scrap ColorBox's cast | `easings.ts` is also read by `paletteGenerator.ts` to build the `cb*Easing` dropdown options | Removing params from `paletteGenerator` is a scene/preset compatibility change, not a UI change — the file flags `generatorMode` ints and `EASING_NAMES` order as "STABLE — never renumber" |

**Hard constraints for Phase G, found while auditing:**

1. **`gradient-explorer/PickerStage.tsx` must survive the swap.** It lives in the `gradient-explorer/` tree but has **two** hosts — the old shell and app-gmt's overlay. Deleting that directory wholesale breaks app-gmt. `PickerStage` (and `PickerWall` / `usePickerModel` / `pickerModel.ts` under it) has to stay or move.
2. **`palette/core/generatorPipeline.ts` is load-bearing for v2**, not just for the generator: `workingPipeline.runWorkingPipeline` calls `buildGradientRamp` with A === B, and `applySlotMods` / `DEFAULT_SLOT_MODS` are read by `SourceBands.tsx:120` and `Tray.tsx:188`. Keep in full.
3. **`palette/store/heroPrefs.ts` and `CanonicalHero.tsx`** are shared between `PickerStage` (app-gmt) and the generator/image stages. Keep.
4. **Eight debug harnesses default to the old page** — `smoke:gx-handles`, `smoke:liquify`, `smoke:gx-fractal-glitch`, `smoke:mobile-layout`, plus `smoke-gx-fractal.mts`, `smoke-gx-fractal-cycle.mts`, `smoke-gx-fractal-deepzoom.mts`, `smoke-gx-nucleus-render.mts` (and six `repro-gx-*.mts`), all reading `ENGINE_URL || 'http://localhost:3400/gradient-explorer.html'`. Retiring the page reds four cited guards — including the only guard on the Wallpaper geometry handles and the only mobile-layout guard. Repointing them is a Phase-G task with a real dependency: **`smoke:mobile-layout` cannot pass until Phase F exists.**
5. **`knip.json` lists `gradient-explorer/main.tsx` as an entry.** Removing it is what makes the orphan report honest (§5.1).
6. **§3.8c must be fixed before the generator is retired** — it is the last live edge into `useGeneratorDerived`.

---

## 5. Appendix

### 5.1 Reachability measurement — the "is it dead" answer

`npm run orphans` on the tree as it stands: **clean, zero unused files.** That is not evidence:
both HTML entries are knip entries, and `debug/test-*.mts` are entries too, so anything reachable
from a harness is invisible as well. (Proof of the second half: `palette/store/variantsStore.ts`
has no production importer anywhere, and knip is silent about it.)

Re-run with `gradient-explorer/v2/main.tsx` kept and `gradient-explorer/main.tsx` removed
(scratch config outside the repo; the tracked `knip.json` untouched), scoped to
`gradient-explorer/**` and `palette/**`:

```
Unused files (18)
gradient-explorer/GradientDropLayer.tsx
gradient-explorer/GradientExplorerApp.tsx
gradient-explorer/GradientLandingLayer.tsx
gradient-explorer/TopBarButtons.tsx
gradient-explorer/gradientTargets.ts
gradient-explorer/main.tsx
gradient-explorer/registerFeatures.ts
gradient-explorer/setup.ts
palette/components/ColorBoxControls.tsx
palette/components/EasingPicker.tsx
palette/components/GenParamSlider.tsx
palette/components/GeneratorSlotMods.tsx
palette/components/GeneratorSourceRow.tsx
palette/components/GeneratorStage.tsx
palette/components/GradientSourcePicker.tsx
palette/components/MixBlend.tsx
palette/components/easingThumb.ts
palette/core/rampCanvas.ts
```

Read this as **the 18 files Phase G's entry-point swap orphans**. Note what is NOT in the list
and why: `PickerStage.tsx` (app-gmt mounts it), `ImageStage.tsx`, `GeneratorExtrasPanel`,
`ImageExtrasPanel`, `NoiseTargetsControl`, `ModifyTogglesControl`, `StopsDockPanel` — all
registered by `registerPaletteUI`, which v2 also calls. **Registration is an import edge; it is
not evidence that anything renders them.** That distinction is the one trap in this measurement,
and it is why S15 and S17 are judgement calls rather than knip results.

### 5.2 Annotation markers on this surface

`grep -rn "@invariant\|@assumption\|@bug\|@stale\|@deprecated"` over `palette/`,
`gradient-explorer/`, `app-gmt/PalettePickerOverlay.tsx`:

- **No `@bug` and no `@stale` anywhere in `palette/**` or `gradient-explorer/**`.**
- **`FavientsPanel.tsx` carries none at all** — nor do `favientBlocks.ts`, `FavientsToggleButton.tsx`, `FavientsEditorEntrance.tsx`, `FavientsIcon.tsx`, `favientsPanelPersist.ts`, `favientDnd.ts`, `favientTargets.ts`, `exportFormats.ts`, `storage.ts`, `SetRail.tsx` or `GradientExplorerV2App.tsx`. The newest and least-covered behaviour in the shell is the least annotated.
- **Every generator file carries zero markers** — all sixteen of them. Consistent with `.claude/rules/palette.md`: markers arrived only with the v2 work (2026-09-03).
- The load-bearing ones that do exist here: `palette/core/importFormats.ts:23` (every parser returns a 256-length ramp or null and never throws — with its own honest caveat that the no-throw half rests on one nonsense string per parser, not a fuzz sweep); `palette/store/favientsStore.ts:334` (Recent forms ONE contiguous run at index 0, falsified 2026-09-03); `palette/installFavients.ts:28` (`mountFavientsPanel` runs at app-gmt boot) and `:36` (the "call AFTER `applyPanelManifest`" ordering is real but **fails silently**); `palette/core/groundSets.ts:30,33`; `palette/core/pickerModel.ts:23,28,312`; `palette/core/workingPipeline.ts:31`.
- Worth reading before M1: `palette/core/favientsExport.ts:66` — *"@assumption a silent `.ugr` collection export is acceptable because 64 RDP nodes are near-lossless for the smooth ramps fractal palettes usually are. Nothing measures this."*
- `@deprecated`: `palette/store/workingStore.ts:151` (an alias kept for the S4 call sites) and `components/EmbeddedColorPicker.tsx:272` (`GradientSlider`, deprecated for the v2 dialect).
- Doc/code mismatch worth a line: `favientsStore.ts:197-199,260-261` describes `selectedTargetId` and `lastGroupId` as "transient per-app", but both are written to **unsuffixed origin-wide keys** (`gmt.favients.target`, `gmt.favients.lastgroup`). They do not sync live (`reloadFromStorage` skips them), but two apps do overwrite each other's on write.

### 5.3 Guards that cover anything recommended here

`npm run typecheck` · `npm run test:palette` (25 harnesses over `palette/core/**`) ·
`npm run test:palette-favients` · `debug/test-palette-importformats.mts` (inside `test:palette`;
the only guard on the import parsers) · `debug/test-palette-groundsets.mts` (rail order,
favourite→entry, tile size, the pad-axis table) · `npm run smoke:ge-ground` (nine steps; the only
guard reaching `SetRail.tsx` and `useGroundSource.ts`) · `npm run smoke:ge-tray` ·
`npm run smoke:ge-hero` · `npm run smoke:ge-next` · `npm run orphans`.

**Two coverage holes to know before trusting a green run:**

1. **No guard reaches `FavientsPanel.tsx`, or any other `palette/components/**` file.** `test:palette` reaches `palette/core/**` only — rule-documented and confirmed here. So nothing in §1.A, §3.2 or §3.8a/b/e is backed by a test; M1, M2, M3 and M10 will be verified by the owner's walk unless a new harness is written over `favientsExport.ts` (pure and cheap to cover).
2. **No browser smoke renders any generator UI.** `smoke:ge-tray` touches the slice only through `setPaletteGenerator({ phase })` to prove the Adjust bake/reset behaviour. Nothing renders `GeneratorStage`, `ColorBoxControls`, `MixBlend`, `SourceRow` or `EasingPicker` under test.

---

## 6. What could not be determined

Stated rather than guessed.

1. **Whether `ModifyTogglesControl` and `NoiseTargetsControl` actually appear in v2's Adjust face at runtime.** The static trace says yes (`AutoFeaturePanel.tsx:631-634` filters nested customUI by `groupFilter` but **not** by `whitelistParams`, and the root-level suppression at :761 does not apply to `parentId` children). This is a read of a 900-line component with several filter passes, and no test covers it. **One manual check in the running v2 app is worth doing before relying on it** — it decides whether Mirror / Reverse / the noise targets are in the ALREADY-IN-V2 bucket or the MIGRATE one.
2. **Whether the "Clear collection" dead end (§3.8a) is real in the browser.** It follows from `clear()`, `listGroundSets` and the two gates, but I did not execute it.
3. **Whether the kebab popover clips inside the 340 px pull-up (§3.8e).** Measured from the class list it fits; unverified.
4. **Whether the v2 pull-up behaves at all on a phone.** `left-6 right-6 top-10 h-[340px]` has no responsive branch, and the panel's mobile affordances live in the old shell's `MobileModeTabs` path. No guard covers it.
5. **Whether the shared `Slider` / `ScalarInput` supports soft bounds** (OD6), so the size of restoring Mix extrapolation is unknown.
6. **Whether §3.8c has a measurable cost.** Confirmed unconditional and unused in v2; not profiled.
7. **Whether the old shell is actually scheduled for retirement.** Both entries still build (`vite.config.ts:146,148`) and `gradient-explorer.html` is still a knip entry. This report says what *would* go dead, not what is planned.
