---
source: gradient-explorer/main.tsx
lines: 1-84
last_verified_sha: e4089cafc7527aa0efa746ff97be07c30373811e
additional_sources:
  - gradient-explorer/GradientExplorerApp.tsx
  - gradient-explorer/setup.ts
  - gradient-explorer/registerFeatures.ts
  - gradient-explorer/PickerStage.tsx
  - gradient-explorer/TopBarButtons.tsx
audited: 2026-06-05T00:00:00Z
audited_by: claude-opus-4-8
public_api: []
depends_on:
  - p01-palette-suite
---

# gradient-explorer — overview

Standalone sibling app: the **GMT Gradient Explorer** (formerly "Palette Studio"). A
palette / gradient authoring tool built on `gmt-engine`, mounted as its own page
(`gradient-explorer.html`). It reuses the engine's UI chrome (TopBar, Dock,
AutoFeaturePanel, context menu, floating panels, timeline, toasts) but has **no
raymarcher / fractal viewport** — the `bootEngine` / `RenderLoop` / `EngineBridge`
heavy path is intentionally absent. The whole domain (gradient picking, generating,
image-extraction, favourites) lives in the host-agnostic [`palette/`](../palette/palette-suite.md)
suite; this folder is just the *shell* that wires that suite onto the engine and lays
it out as a mode-tabbed studio.

Six files: boot (`main.tsx`), registration (`registerFeatures.ts`), panel manifest
(`setup.ts`), the app frame (`GradientExplorerApp.tsx`), the Picker centre stage
(`PickerStage.tsx`), and two top-bar buttons (`TopBarButtons.tsx`). The Generator and
Image stages are imported straight from `palette/components/`.

## Where to start

| If you're touching... | Read |
|---|---|
| Boot order / which plugins load | JSDoc + body of [`gradient-explorer/main.tsx`](../../../gradient-explorer/main.tsx) |
| Feature/UI registration (pre-store-freeze) | [`gradient-explorer/registerFeatures.ts`](../../../gradient-explorer/registerFeatures.ts) |
| Panel/dock manifest (the three mode tabs + Favients shelf) | [`gradient-explorer/setup.ts`](../../../gradient-explorer/setup.ts) |
| App frame, mode → stage routing, responsive/mobile layout | [`gradient-explorer/GradientExplorerApp.tsx`](../../../gradient-explorer/GradientExplorerApp.tsx) |
| The Picker mode's centre stage (wall + carve + hero preview) | [`gradient-explorer/PickerStage.tsx`](../../../gradient-explorer/PickerStage.tsx) |
| The palette domain itself (picker/generator/image/favients/export) | [palette-suite.md](../palette/palette-suite.md) |
| Engine concepts these reference | [Architecture](../../engine/01_Architecture.md), [Feature Registry](../../engine/02_Feature_Registry.md), [Plugin Contract](../../engine/03_Plugin_Contract.md), [Core Plugins](../../engine/04_Core_Plugins.md) |

## What the app is

Unlike `fluid-toy` / `fractal-toy` (a single canvas + parameter panels), each palette
**mode owns its own surface**, so the centre is a **mode-tabbed stage**, not one
viewport. The three right-dock tabs (Picker / Generator / Image) *are* the mode
selector — there is no bespoke tab bar. A `Favients` shelf (saved gradients) docks
into the left tab strip. The app feeds GMT's existing stop-based gradient system
rather than rendering anything itself (the "feed it" decision, see
[palette-studio-port-plan.md](../../../plans/palette-studio-port-plan.md)); in
app-gmt the same `palette/` modules colour a live fractal, here they just preview +
export.

## Boot sequence (`main.tsx`)

The boot mirrors the `demo` app's three-step plugin contract
([03_Plugin_Contract.md](../../engine/03_Plugin_Contract.md)): **registration →
store-touch → setup**, in this exact order (the feature/component registries freeze on
first store access).

1. **`import './registerFeatures'`** (side-effect, first line) — runs
   [`registerPaletteUI()`](../palette/palette-suite.md) which registers the three DDFS
   features (`paletteFilters`, `paletteGenerator`, `paletteImage`), all the palette
   custom-UI components, the Favients panel, and the generator undo/history provider —
   all **before** the store is constructed. It also registers the two studio-specific
   **Favient apply targets** (`gen-a` / `gen-b` → `sendRampToSlot`) and the Favients
   "Palettes" browse action (→ toggle the Picker tab). None of these import
   `useEngineStore` at module scope, so registering pre-freeze is safe.
2. **`registerUI()`** — boots the engine UI registry (AutoFeaturePanel + built-in
   widgets).
3. **UI plugins installed** (order matters — see below):
   `installTopBar()` → `installShortcuts()` → `installUndo()` → `installMenu()` →
   `installSceneIO({ fileExtension: 'json' })` → `registerFeedbackUI()` +
   `installHelp(...)` → `installHud()`.
4. **Top-bar slot tweaks** — register `BackToGmtButton` (slot left, order −10) and
   `FavientsTopBarButton` (left, order 21); unregister the `adaptive` badge (no
   viewport here) and replace the default `fps` widget with `FpsCounterDesktopOnly`.
5. **Animation + PWA** — `installModulation()` + `installModulationUI()` →
   `installPwaUpdate()` (these run *after* the top-bar tweaks).
6. **`wireGradientExplorer()`** (from `setup.ts`) — applies the panel manifest +
   docks the panels. This is the first thing that touches the store, so it runs **last**
   (after every registration).
7. **Mount** `<GradientExplorerApp />` into `#root` under `React.StrictMode`.

### Which engine tools it loads, and why

| Plugin / tool | Install call | Why this app needs it | Engine doc |
|---|---|---|---|
| TopBar | `installTopBar()` | Slot host for the app name, Back-to-GMT link, Favients toggle, FPS readout | [04_Core_Plugins.md § topbar](../../engine/04_Core_Plugins.md) |
| Menu | `installMenu()` | Dropdown host; installed **before** Help/SceneIO since both register into it | [04_Core_Plugins.md](../../engine/04_Core_Plugins.md) |
| Shortcuts | `installShortcuts()` | Ctrl+Z/Y undo, Ctrl+S/O save-load hotkeys, Esc handling | [07_Shortcuts.md](../../engine/07_Shortcuts.md) |
| Undo | `installUndo()` | Param-scope undo for every DDFS dial + the generator curve/slot history provider | [06_Undo_Transactions.md](../../engine/06_Undo_Transactions.md) |
| SceneIO | `installSceneIO({ fileExtension: 'json' })` | Save/Load the palette config. Generator/picker/image dials are DDFS feature slices, so the engine-standard preset round-trips them. **No canvas → JSON download only, no PNG export.** | [04_Core_Plugins.md § scene-io](../../engine/04_Core_Plugins.md) |
| Help + Feedback | `installHelp(...)` + `registerFeedbackUI()` | Help menu + shared GMT Support / Send-Feedback entries (same as every engine app) | [05_Shared_UI.md](../../engine/05_Shared_UI.md) |
| Hud | `installHud()` | HUD host (toasts/badges surface) | [04_Core_Plugins.md](../../engine/04_Core_Plugins.md) |
| Animation (modulation) | `installModulation()` + `installModulationUI()` | Param sliders show the keyframe diamond and key onto the timeline; LFO widget. `TimelineHost` is mounted in the app frame. | [08_Animation.md](../../engine/08_Animation.md) |
| PwaUpdate | `installPwaUpdate()` | Service-worker update prompt (shared affordance) | [04_Core_Plugins.md](../../engine/04_Core_Plugins.md) |
| Feature system / AutoFeaturePanel | `registerUI()` + the panel manifest | Renders the three palette features' dock panels from their `params` metadata | [02_Feature_Registry.md](../../engine/02_Feature_Registry.md) |

**Deliberately NOT installed:** `installViewport()`, `installCamera()`, a real render
loop driving a raymarcher — there's no fractal surface. `EngineBridge` +
`RenderLoopDriver` *are* mounted in the app frame, but only to drive the animation
TickRegistry (timeline playback + keyframe application), not a GPU render.

## Panel manifest (`setup.ts` → `wireGradientExplorer`)

`applyPanelManifest([...])` declares four panels (see [14_Panel_Manifest.md](../../engine/14_Panel_Manifest.md)):

- **Picker** — right dock, order 0, `active: true` (default mode), feature `paletteFilters`.
- **Generator** — right dock, order 1, feature `paletteGenerator`.
- **Image** — right dock, order 2, feature `paletteImage`.
- **Favients** — **left** dock, order 0, component `panel-favients`, `isCore: false`.
- plus the shared `feedbackPanelEntry()`.

After the manifest, it force-orders the right tabs, opens Picker as the active tab, and
**restores persisted UI state**: `restoreFavientsPanel(...)` /
`watchFavientsPanel(...)` under an Explorer-specific localStorage key
(`gmt.gradientExplorer.favients.panel`, so app-gmt and the Explorer don't inherit each
other's docking state via same-origin storage), and `restorePaletteFilters()` /
`watchPaletteFilters()` for the picker's swatch-size / padding / arrangement prefs.

## Shell components

### `GradientExplorerApp.tsx`
The app frame. Lays out `TopBarHost` over a two-dock + centre-stage flex
(`<Dock side="left" />` = Favients shelf, `<Stage />`, `<Dock side="right" />` = mode
panel), plus `HudHost`, `HelpOverlay`, `GlobalContextMenu`, `TimelineHost`,
`ToastHost`, floating `DraggableWindow`s, and `DropZones`. It mounts `EngineBridge` +
`RenderLoopDriver` purely for animation playback.

- **`<Stage>`** is the mode router: it reads `activeRightTab` and returns `<PickerStage />`,
  `<GeneratorStage />` (from `palette/components/`), or `<ImageStage />` (from
  `palette/components/`). The dock tab strip is the mode selector; the centre mirrors it.
- **`useResponsiveDocks()`** shrinks both docks toward compact widths as the window
  narrows (and collapses the left shelf to its rail below 900px) so the centre stage
  stays usable — always writing through the **non-persisting** setState so responsive
  compaction never overwrites the user's saved dock-size prefs.
- **Mobile** (`< 768px`, `useIsMobile`): a single-column layout with a full-width
  `MobileModeTabs` bar (the three modes + Favients), the active stage stacked above its
  controls, and an accordion `MobilePickerControls` that splits the Picker's long
  control scroll into Sources / Arrange / Quality sections (tagged via `groupFilter` on
  the `paletteFilters` feature; desktop dock is unaffected). See
  [17_Mobile_Layout.md](../../engine/17_Mobile_Layout.md).

### `PickerStage.tsx`
The Picker mode's centre stage (the other two stages live in `palette/`). It:
- loads the baked ~11k gradient library via `usePickerStore().load()` (presets
  fallback), reads the dock controls from the `paletteFilters` DDFS slice, and builds
  the **grouped + bucketed rows** fed to `PickerWall` (Group axis partitions, Sort axis
  orders within — independent; Rows axis buckets into facet sub-rows).
- builds the shared `256×N` sprite once per catalog (each entry's `row` = sprite row).
- **carve / spatial selection**: rect / lasso / paint tools commit an `isolate` or
  `cut` op into `paletteFilters.keptIds` (a transient filter over the wall).
- on pick: previews in the hero bar and calls `applyEntryToColoring(e)` (a no-op here
  with no fractal, the real apply in app-gmt) via the
  [gradient seam](../palette/palette-suite.md); a `FavStar` favourites the selection
  (presets carry stops; loaded entries are ramp-only → fitted via `entryToGradientConfig`).
- dragging a swatch out sets a Favient DnD payload so it can be dropped into the shelf.

### `TopBarButtons.tsx`
Two left-slot affordances plus a desktop-only FPS readout:
- **`BackToGmtButton`** — an `<a href="app-gmt.html">` (anchor, so middle-click / open-in-new-tab
  work; relative href resolves to the sibling page) wrapping the GMT wordmark as the "home" gesture.
- **`FavientsTopBarButton`** — toggles the Favients shelf. Because the shelf is **docked
  left** here (it floats in app-gmt), the toggle drives the left dock's collapsed state
  (`setDockCollapsed('left', …)` / `togglePanel('Favients', true)`), not the panel's open flag.
- **`FpsCounterDesktopOnly`** — wraps the engine `FpsCounter`, hidden below the mobile breakpoint.

## How it consumes the palette suite

Everything domain-specific is the [`palette/`](../palette/palette-suite.md) tree — this
shell only:
1. calls `registerPaletteUI()` (features + custom UI + Favients panel),
2. registers studio-specific **Favient targets** (`Generator · Slot A/B`) and the browse
   action in `registerFeatures.ts`,
3. imports `GeneratorStage` / `ImageStage` / `FavientsPanel` directly for the centre
   stage and left shelf,
4. owns only `PickerStage` (the Picker's centre-stage composition over `PickerWall`).

The same `palette/` modules mount into **app-gmt** (feeding the active coloring layer)
— the host-agnostic split is why the Explorer is a thin shell. See
[palette-suite.md](../palette/palette-suite.md) for the suite's internals and
[palette-studio-port-plan.md](../../../plans/palette-studio-port-plan.md) /
[gradient-explorer-next-session-handoff.md](../../../plans/gradient-explorer-next-session-handoff.md)
for the port history and open items.
