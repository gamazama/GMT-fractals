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

Guard coverage is **per app, and uneven** — this list is not interchangeable. Each
smoke boots exactly one entry point (see its `ENGINE_URL` default), so running a
fluid-toy smoke proves nothing about mesh-export.

| App | Guards |
|---|---|
| `fluid-toy/` | `npm run smoke:fluid-toy`, `npm run smoke:fluid-brush`, `npm run smoke:fluid-presets` |
| `fractal-toy/` | `npm run smoke:fractal-toy` |
| `demo/` | `npm run smoke:engine-demo`, `npm run smoke:engine-demo-modulation` |
| `gradient-explorer/` | `npm run smoke:liquify`, `npm run smoke:gx-handles`, `npm run smoke:gx-fractal-glitch` (all boot `gradient-explorer.html`) |
| `mesh-export/` | **none** — see below |

`mesh-export/` has no smoke, no unit test and no runtime guard of any kind. No
`debug/smoke-*.mts` loads `mesh-export.html`; `smoke:boot` defaults to `/`
(the engine demo) and `smoke:engine-gmt` to `/app-gmt.html`, neither of which
pulls `mesh-export/main.tsx` into its import graph. The only automated checks that
reach this tree at all are static:

- `npm run typecheck` — `tsconfig.json` `include` is `**/*.ts(x)`, so mesh-export is compiled.
- `npm run orphans` — `knip.json` lists `mesh-export/main.tsx` as an entry, so the
  import graph is walked (note `mesh-export/algorithms/sdf-eval.ts` is in knip's
  `ignore` list and is marked `@deprecated` in source).

Nothing exercises the SDF sampling, dual contouring, post-processing, or the
GLB/STL/VDB writers at runtime. Treat changes to `mesh-export/algorithms/**`,
`mesh-export/gpu/**` and `mesh-export/pipeline/**` as unguarded: verify by
generating a mesh in the running app and importing the result into a DCC tool.
`debug/dump-mesh-cp.mts` looks related but is not — it exercises
`engine-gmt/engine/SDFShaderBuilder.ts` only, and is not wired to an npm script.
