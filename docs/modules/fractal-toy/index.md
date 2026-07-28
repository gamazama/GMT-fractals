---
source: fractal-toy/main.tsx
lines: 162
last_verified_sha: b83080db98e45d1c1d8b92e87f1b94fbabe2472a
additional_sources:
  - fractal-toy/FractalToyApp.tsx
  - fractal-toy/setup.ts
  - fractal-toy/panels.ts
audited: 2026-05-20T16:00:00Z
audited_by: claude-opus-4-7
public_api: []
depends_on:
  - e01-feature-system
  - e02-tick-registry
---

# fractal-toy — overview

Sibling app: minimal **3D raymarched** fractal demo using the engine — Mandelbulb and Mandelbox, an orbit camera (`orbitTheta` / `orbitPhi` / `distance` / `fov` / `target`) and a directional light + ambient + AO. There is no 2D Mandelbrot or Julia path anywhere in the tree. Smaller than fluid-toy; intended as a reference for new sibling apps. 14 files total.

Unlike fluid-toy, its per-fractal params do **not** come from `featureRegistry.register()` directly: `fractal-toy/registerFeatures.ts` registers only `CameraFeature` and `LightingFeature`, and each formula goes through `registerFormula` (`fractal-toy/renderer/formulaRegistry.ts`), which auto-lifts that formula's params into the DDFS registry. One formula is active at a time.

## Where to start

| If you're touching... | Read |
|---|---|
| Boot order / engine wiring | JSDoc on `fractal-toy/main.tsx` + `FractalToyApp.tsx` |
| The fractal renderer | `fractal-toy/renderer/*` |
| Panel composition | `fractal-toy/panels.ts` |
| Engine fork rules | [`docs/policy/engine-fork-rules.md`](../../policy/engine-fork-rules.md) |

## Architecture (1-line summary)

`main.tsx` registers fractal-toy features + formulas → installs the engine core plugins → `installFractalRenderer` (`fractal-toy/renderer/install.tsx`) → `setup.ts` seeds panel state → `FractalToyApp.tsx` mounts.

The render loop is **not** the engine's: `fractal-toy/` contains zero references to `RenderLoopDriver`. `FractalEngine` (`fractal-toy/renderer/FractalEngine.ts`) owns its own `requestAnimationFrame` loop and calls `viewport.frameTick()` via the `onFrameEnd` hook wired in `main.tsx`.

## Historical context

The full file catalog is archived at [`docs/history/audit-2026-05-20/archive/sibling-apps/fractal-toy-catalog.md`](../../history/audit-2026-05-20/archive/sibling-apps/fractal-toy-catalog.md). fractal-toy has no `README.md` of its own — this overview IS the entry point for the sibling app.

Decisions affecting fractal-toy: the same DDFS contracts and engine plugin slots apply (ADRs 0007-0014, 0021).
