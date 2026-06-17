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

Sibling app: minimal 2D fractal demo (Mandelbrot, Julia) using the engine. Smaller than fluid-toy; intended as a reference for new sibling apps. ~14 files total.

## Where to start

| If you're touching... | Read |
|---|---|
| Boot order / engine wiring | JSDoc on `fractal-toy/main.tsx` + `FractalToyApp.tsx` |
| The fractal renderer | `fractal-toy/renderer/*` |
| Panel composition | `fractal-toy/panels.ts` |
| Engine fork rules | [`docs/policy/engine-fork-rules.md`](../../policy/engine-fork-rules.md) |

## Architecture (1-line summary)

`main.tsx` registers fractal-toy features → `FractalToyApp.tsx` mounts the engine shell → `setup.ts` wires panels → engine's `RenderLoopDriver` drives per-frame ticks for the renderer.

## Historical context

The full file catalog is archived at [`docs/audit-2026-05-20/archive/sibling-apps/fractal-toy-catalog.md`](../../audit-2026-05-20/archive/sibling-apps/fractal-toy-catalog.md). fractal-toy has no `README.md` of its own — this overview IS the entry point for the sibling app.

Decisions affecting fractal-toy: the same DDFS contracts and engine plugin slots apply (ADRs 0007-0014, 0021).
