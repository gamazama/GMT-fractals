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
| `fluid-toy/` | `npm run smoke:fluid-toy`, `npm run smoke:fluid-brush`, `npm run smoke:fluid-presets`, `npm run smoke:migrations` (the last one covers `fluid-toy/migrations.ts` — falsified 2026-07-29 by dropping one `moveField`, went red). All four falsified green→red→green that day. Plus `npm run smoke:canvas-menu`, added to this row 2026-07-29: it is the only guard that reaches `fluid-toy/pointer/contextMenu.ts`, and it was cited nowhere until then. Falsified three ways that day, each reverted — dropping `e.preventDefault()` reds "canvas did not preventDefault the native context menu"; renaming one item label reds `menu missing "Recenter"`; skipping the `openContextMenu` call reds "context menu did not open". **Not** `smoke:orbit`: it defaults to `app-gmt.html` (written without the `npm run` prefix on purpose — `check:rule-guards` reads every `npm run` citation in a row as a guard, and this one is a warning, not a guard). `npm run smoke:pause-controls` does default here, but it asserts on `@engine/topbar/PauseControls`, so treat it as a fluid-toy **boot canary**, not a fluid-toy guard — and note it rewrites the tracked `debug/fluid-pause-hover.png` as a side effect. **Four more joined this row on 2026-07-29**, none of them cited anywhere before that: `npm run smoke:fractal-kind` (the `julia.kind` enum — the DDFS default, the KIND_MODES index→string contract, and `FluidEngine.params.kind`), `npm run smoke:bc-drag` (B+drag resize, C+drag pick-c, and the `brush.size` / `fluidSim.dyeInject` defaults), `npm run smoke:canvas-pan-zoom` (wheel zoom + cursor anchoring, right-drag pan on **both** axes, context-menu suppression) and `npm run smoke:particle-bounce` (particle/wall collision — the only guard reaching `fluid-toy/brush/particles.ts`). All four were found defective that day and repaired; each carries its own measurement in its header, and each was falsified two to five ways after the repair. `npm run smoke:tsaa` also defaults to this app but is a **boot canary plus a screenshot capture for a human A/B**, not a TSAA guard — a dead `runTsaaBlend()` and a null blue-noise texture both pass it (measured) — and it rewrites the tracked `debug/fluid-tsaa-on.png` and `-off.png`. |
| `fractal-toy/` | `npm run smoke:fractal-toy` (falsified 2026-07-29 by no-op'ing `featureRegistry.register(LightingFeature)`, went red). Plus `npm run smoke:formula-switch`, added to this row 2026-07-29 — it is the only guard reaching `fractal-toy/renderer/` (the formula registry, the shader assembler, and both formula definitions), and it was cited nowhere. Falsified five ways that day: dropping `registerFormula(MandelboxFormula)` reds "mandelbox slice missing"; renaming `uFoldLimit` through `mandelbox.ts` reds "uFoldLimit uniform missing"; forcing `fragColor` black in `shaderAssembler.ts` reds "centre pixel too dark (0)"; and the two absence checks added that day red when either formula's uniform leaks into the other's program. |
| `demo/` | `npm run smoke:engine-demo`, `npm run smoke:engine-demo-modulation`, `npm run smoke:interact` (also boots `demo.html`; it drives the Demo feature's setter and preset round-trip — see the ddfs.md Guards block, which is its primary home) |
| `gradient-explorer/` | `npm run smoke:liquify`, `npm run smoke:gx-handles`, `npm run smoke:gx-fractal-glitch` (all boot `gradient-explorer.html`) — plus `npm run test:liquify` (`debug/test-liquify-mesh.mts`), which is not a browser smoke: it exercises `gradient-explorer/fullscreen/modes/liquify/{LiquifyMesh,catmullRom}.ts` on plain node in under a second, and is also the last link in the `test:palette` chain. Fastest real guard in this row; reach for it first when touching the liquify soft body. It was named here only by file path until 2026-07-29 — the npm script it is wired to was cited nowhere. (Until 2026-08-02 the direct citation was also the *only* one that resolved: `test:palette` is a sixteen-link `&&` chain of bare `tsx` calls, and `check:rule-guards` took a script's entry from its **first** command, so fifteen of the sixteen were invisible to it. That is fixed — grep `entriesForFile` in `debug/check-rule-guards.mjs` — and a direct-file chain now resolves to the union of its members. The direct citation stays: it is the narrower guard, and a rule wants the narrowest guard that can fail on its files.) Falsified 2026-07-29 four ways, each reverted: gutting `step()` reds the physics contract, and three breaks that used to pass green now red on the six assertions added that day — a dead `smoothAll`, a dead `smoothRegion` (the whole smooth brush), and Catmull-Rom downgraded to bilinear. See the guard's own header for the measured numbers. |
| `mesh-export/` | `npm run test:mesh-grid` only (node-level, no browser smoke) — see below |

**`npm run smoke:liquify` was flaky and was hardened on 2026-07-29.** It had
measured **3 failures in 13 consecutive runs (~23%)** at three *different*
assertions — `[1] liquify canvas missing`, `[3] grab handle did not change the
render`, `[4] physics frame went blank`. It now carries the same two mechanisms
as its healthy sibling `smoke:gx-handles` (a dep-optimize retry loop and a
dual-instance detector that names the cause and the fix), and its one-shot fixed
waits are replaced by polling — wait for the render to change, then for it to
settle, then assert. **10/10 consecutive clean runs after the change**, all
reporting the same 3.77 / 21.03 / 51. Falsified with three breaks in
`gradient-explorer/fullscreen/modes/liquify/`, one per assertion, all red.

One caveat, stated because it changes how you should read a future red: the
flake was **not reproduced on a quiet tree** beforehand (3/3 green before any
change), and the original measurement ran while other auditors were editing
tracked source — which is exactly what HMR-invalidates the store module into the
dual-instance state whose symptom is `[1] liquify canvas missing`. So **if this
goes red on a quiet tree now, treat it as a real liquify regression**, not as
noise. If it goes red while something else is editing the tree, restart
`npm run dev` first.

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

`mesh-export/` has no browser smoke. No `debug/smoke-*.mts` loads
`mesh-export.html`; `smoke:boot` defaults to `/` (the engine demo) and
`smoke:engine-gmt` to `/app-gmt.html`, neither of which pulls
`mesh-export/main.tsx` into its import graph.

It does have **one** node-level runtime guard, and this row said "none" until
2026-07-29 — the guard was written in the overnight audit's cycle 8 and never
cited anywhere, so a reader changing `dc-core.ts` had no reason to run it:

- `test:mesh-grid` (`debug/test-mesh-grid-convention.mts`) — pins the CELL-CENTRED
  voxel convention, `min + (i + 0.5) * range / N`, across `dc-core.ts`'s
  `gridToWorld`/`worldToGrid` and `vdb-writer.ts`'s AffineMap translation row. It
  imports `mesh-export/algorithms/dc-core` directly and reads `vdb-writer.ts` as
  text, so it reaches exactly those two files and nothing else in the tree.
  Falsified 2026-07-29 three ways, each reverted: reverting `gridToWorld` to the
  corner-sampled `gx / (N - 1)` → exit 1 with 9 failures naming "the N/(N-1)
  oversize bug is back"; dropping the `- 0.5` from `worldToGrid` alone → exit 1
  with 3 failures, block 2 only; reverting the VDB translation row to bare
  `boundsMin` → exit 1 with 1 failure, block 4 only. Runs in under a second.

Everything else that reaches this tree is static:

- `npm run typecheck` — `tsconfig.json` `include` is `**/*.ts(x)`, so mesh-export is compiled.
- `npm run orphans` — `knip.json` lists `mesh-export/main.tsx` as an entry, so the
  import graph is walked (note `mesh-export/algorithms/sdf-eval.ts` is in knip's
  `ignore` list and is marked `@deprecated` in source).

Beyond `test:mesh-grid`'s two files, nothing exercises the SDF sampling, dual
contouring, post-processing, or the GLB/STL/VDB writers at runtime — in
particular the `gpu/` tree, the pipeline, and the GLB/STL writers are still
completely unguarded. Treat changes to `mesh-export/algorithms/**`,
`mesh-export/gpu/**` and `mesh-export/pipeline/**` as unguarded: verify by
generating a mesh in the running app and importing the result into a DCC tool.
`debug/dump-mesh-cp.mts` looks related but is not — it exercises
`engine-gmt/engine/SDFShaderBuilder.ts` only, and is not wired to an npm script.
