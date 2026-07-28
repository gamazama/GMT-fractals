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
| `gradient-explorer/` | [`docs/modules/gradient-explorer/app.md`](../../docs/modules/gradient-explorer/app.md) |
| `demo/` | [`demo/README.md`](../../demo/README.md) — minimal three-file add-on contract |

## Guards

Guard coverage is **per app, and uneven** — this list is not interchangeable. Each
smoke boots exactly one entry point (see its `ENGINE_URL` default), so running a
fluid-toy smoke proves nothing about mesh-export.

**`check:rule-guards` cannot police this table.** It matches guards
against the rule's whole `paths:` set, and this rule scopes five apps — so a
fluid-toy smoke listed in the mesh-export row still "reaches scoped files" and
passes. Falsified 2026-07-29 by moving `smoke:fluid-toy` into the
`gradient-explorer/` row: the checker's output did not change. Per-row
citations here are only as good as the last person who checked one by hand.

| App | Guards |
|---|---|
| `fluid-toy/` | `npm run smoke:fluid-toy`, `npm run smoke:fluid-brush`, `npm run smoke:fluid-presets`, `npm run smoke:migrations` (the last one covers `fluid-toy/migrations.ts` — falsified 2026-07-29 by dropping one `moveField`, went red). All four falsified green→red→green that day. **Not** `npm run smoke:orbit`: it defaults to `app-gmt.html`. `npm run smoke:pause-controls` does default here, but it asserts on `@engine/topbar/PauseControls`, so treat it as a fluid-toy **boot canary**, not a fluid-toy guard — and note it rewrites the tracked `debug/fluid-pause-hover.png` as a side effect. |
| `fractal-toy/` | `npm run smoke:fractal-toy` (falsified 2026-07-29 by no-op'ing `featureRegistry.register(LightingFeature)`, went red) |
| `demo/` | `npm run smoke:engine-demo`, `npm run smoke:engine-demo-modulation` |
| `gradient-explorer/` | `npm run smoke:liquify`, `npm run smoke:gx-handles`, `npm run smoke:gx-fractal-glitch` (all boot `gradient-explorer.html`) — plus `npx tsx debug/test-liquify-mesh.mts`, which is not a browser smoke: it exercises `gradient-explorer/fullscreen/modes/liquify/{LiquifyMesh,catmullRom}.ts` on plain node, and is also the last link in the `test:palette` chain. Fastest real guard in this row; reach for it first when touching the liquify soft body. |
| `mesh-export/` | **none** — see below |

⚠ **`npm run smoke:liquify` is flaky.** Measured 2026-07-29 on an unmodified
tree: **3 failures in 13 consecutive runs (~23%)**, at three *different*
assertions — `[1] liquify canvas missing`, `[3] grab handle did not change the
render`, `[4] physics frame went blank`. A red run is therefore not evidence of
a regression on its own; re-run before believing it. The sibling
`smoke:gx-handles` (13/13 green, and it goes red on a real break — verified)
carries the retry loop and dual-instance detection that this one lacks.

⚠ **fluid-toy boots as a PURE FRACTAL — any pixel assertion must undo that
first.** `fluidSim.paused` defaults `true` and `composite.show` defaults to
index 1 (`'julia'`, fractal-only); grep `defaultIndex` in
`fluid-toy/features/composite.ts` and `paused` in `features/fluidSim.ts`. In
that state the dye buffer is never composited, so nothing the brush or the sim
writes can change a single pixel. `smoke:fluid-brush` was **red for exactly
this reason** and had been mislabelled "FLAKY — Chromium GPU watchdog" in the
README; it now does what `<FluidToggleButton/>` does (unfreeze + switch to
Mixed) before it drags. A new pixel smoke here must do the same, and a red one
should be checked against these two defaults before it is called flake.

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
