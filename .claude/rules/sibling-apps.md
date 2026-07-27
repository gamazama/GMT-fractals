---
paths:
  - "fluid-toy/**"
  - "fractal-toy/**"
  - "mesh-export/**"
  - "gradient-explorer/**"
  - "demo/**"
---

# Sibling apps

These install features and core plugins on top of the engine. They are also the
engine's smoke tests: if a change to `engine/**` breaks one of them, the change is
too GMT-specific.

| App | Entry doc |
|---|---|
| `fluid-toy/` | [`fluid-toy/README.md`](../../fluid-toy/README.md) + [`docs/modules/fluid-toy/index.md`](../../docs/modules/fluid-toy/index.md) |
| `fractal-toy/` | [`docs/modules/fractal-toy/index.md`](../../docs/modules/fractal-toy/index.md) |
| `mesh-export/` | [`docs/modules/mesh-export/index.md`](../../docs/modules/mesh-export/index.md) |
| `gradient-explorer/` | [`docs/modules/gradient-explorer/index.md`](../../docs/modules/gradient-explorer/index.md) |
| `demo/` | [`demo/README.md`](../../demo/README.md) — minimal three-file add-on contract |

## Guards

```
npm run smoke:fluid-toy
npm run smoke:fluid-brush
npm run smoke:fluid-presets
npm run smoke:fractal-toy
npm run smoke:engine-demo
npm run smoke:engine-demo-modulation
```
