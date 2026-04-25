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

Three steps. Every engine add-on looks like this:

```typescript
// 1. Register feature definitions
featureRegistry.register(MyFeature);

// 2. Register UI components referenced by tabConfig / viewportConfig
componentRegistry.register('overlay-mything', MyOverlay);
componentRegistry.register('auto-feature-panel', AutoFeaturePanel); // engine already does this

// 3. Seed panel state so the tab shows up
store.movePanel('MyPanel', 'right', 0);
store.togglePanel('MyPanel', true);
```

Everything else — state slice, setter, auto-generated UI, persistence, URL encoding — is free.

## Removing the demo

Don't import `demo/setup` from `index.tsx`. The engine's core never references `demo/`, so removal is a single-line edit.
