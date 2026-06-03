# Demo Add-on

The engine's verification / hello-world add-on. Demonstrates the pattern any other add-on (toy-fluid, GMT's fractal pipeline, a future particle toy, etc.) follows to plug into the engine.

## What it shows

- A single `demo` feature with a color, a 2D position, a size, and an opacity
- The feature's state auto-drives an `AutoFeaturePanel` (no hand-written UI)
- A `DemoOverlay` component visualises the state as a coloured square inside the viewport
- All state flows through DDFS — so it's automatically captured by:
  - Save/load (`utils/SceneFormat`)
  - URL sharing (`utils/Sharing`)
  - Undo/redo (`historySlice`)
  - Animation keyframes (`engine/AnimationEngine` when you add tracks)

## Files

| File | Purpose |
|------|---------|
| `registerFeatures.ts` | **Must be the first import** — registers feature definitions before any store or React code runs |
| `DemoFeature.ts` | DDFS feature definition (params + tabConfig + viewportConfig) |
| `DemoOverlay.tsx` | React component rendered inside ViewportArea |
| `setup.ts` | Side-effect registration — call once before React mounts |
| `README.md` | This file |

## The add-on contract

Four steps. Every engine add-on looks like this:

```typescript
// 1. Register feature definitions (BEFORE the store is constructed —
//    the registry freezes on first store touch).
featureRegistry.register(MyFeature);

// 2. Register UI components referenced by tabConfig / viewportConfig.
//    The id MUST match the `componentId` your FeatureDefinition
//    references — typos here render as a black viewport (no overlay
//    resolves). Convention: 'overlay-<name>'. The dev-only
//    `validateComponentRefs` (wired in index.tsx) catches mismatches
//    at boot.
componentRegistry.register('overlay-mything', MyOverlay);

// 3. Declare the panel layout — PanelRouter needs a manifest entry
//    to know HOW to render the panel. Without this, opening the panel
//    produces an empty body.
applyPanelManifest([
    { id: 'MyPanel', dock: 'right', order: 0, features: ['mything'] },
]);

// 4. Open the panel (movePanel + togglePanel).
store.movePanel('MyPanel', 'right', 0);
store.togglePanel('MyPanel', true);
```

Everything else — state slice, setter, auto-generated UI, persistence, URL encoding — is free.

## Removing the demo

Don't import `demo/setup` from `index.tsx`. The engine's core never references `demo/`, so removal is a single-line edit.

---

## Starting a NEW standalone shell app (no fractal viewport)

This demo IS the simplest shell — it boots the engine UI chrome (TopBar + Dock +
AutoFeaturePanel + timeline) without the heavy raymarcher boot that fluid-toy /
fractal-toy carry. If your app's centre is its own surface (a tool, an editor, a
catalog) rather than a single fractal canvas, copy THIS, not the toys.

**Worked example:** `palette-studio/` (a 3-mode gradient tool). Mirror its files.

### Files + entry
1. `myapp.html` — copy `fluid-toy.html`, point the script at `/myapp/main.tsx`.
2. Register the entry in `vite.config.ts` → `build.rollupOptions.input` (one line).
3. `myapp/{main.tsx, MyApp.tsx, registerFeatures.ts, setup.ts}`.

### Boot order in `main.tsx` (the freeze-order trap is real)
```typescript
import './registerFeatures';          // 1. side-effect: featureRegistry.register +
                                       //    componentRegistry.register for any custom-UI
                                       //    component that does NOT import the store at
                                       //    module scope. MUST be first — registries
                                       //    freeze on the first store access.
registerUI();                          // 2. engine UI registry (AutoFeaturePanel widgets)
installTopBar(); installShortcuts();   // 3. UI plugins. installMenu() BEFORE installHelp().
installUndo(); installMenu();
installHelp(); installHud();
installModulation();                   // 4. animation tick (keyframe playback + LFO) +
installModulationUI();                 //    the LFO widget. Needed for keyframes/timeline.
wireMyApp();                           // 5. applyPanelManifest (TOUCHES the store → freeze)
ReactDOM.createRoot(root).render(<MyApp/>);
```

### Shell in `MyApp.tsx` — reuse, don't rebuild
Mount: `<TopBarHost/>`, `<Dock side="left"/>` / `"right"`, `<DropZones/>`,
`<GlobalContextMenu/>`, `<HelpOverlay/>`, `<TimelineHost/>`, wrapped in
`<StoreCallbacksProvider>`. Your own content goes where ViewportArea would be.
**For the timeline to PLAY you need BOTH** `<EngineBridge/>` (connects the animation
engine to the store) **and** `<RenderLoopDriver/>` (the standalone RAF → `runTicks`).
Without both, keyframes store but never tween. Neither needs a fractal engine.

### Tabs drive the centre
Each dock panel is a tab; the Dock renders them as a tab strip. Read the active tab
reactively with `useEngineStore(s => s.activeRightTab)` (or `activeLeftTab`) and switch
your centre content off it — the tab strip IS your mode selector, don't build your own.
`togglePanel(id, true)` switches tabs.

### Features, hints, keyframes — all free via DDFS
- A `FeatureDefinition`'s float/int/vec params auto-render as GMT sliders **with the
  keyframe diamond already wired** (AutoFeaturePanel derives the track id).
- Hints: set `description` (+ optional `helpId`) on a param → AutoFeaturePanel renders
  `<Hint>` when the user toggles hints. **Custom-UI components must render `<Hint text>`
  themselves** (it self-gates on `showHints`).
- Custom controls that need a diamond: use `useTrackAnimation(trackId, value, label)` +
  `<KeyframeButton>`. Vec params use `featureId.param_x` / `_y` track ids.
- **Don't hand-roll inputs** — reuse `ScalarInput` / `Slider` / `DraggableNumber` so the
  feel (scrub, type-to-edit, Alt/Shift precision) matches. A GMT slider's value area is
  `w-1/2` of its header — match that for visual parity.
