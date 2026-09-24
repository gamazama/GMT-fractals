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
| `gradient-explorer/` | **`npm run smoke:gx-spline`** (Phase W, 2026-09-08: Extend — a dead-straight path reads as a plain linear ramp across the frame with it up (0 → 255, rising all the way) and does NOT with it down (spans ~70, 17 dips), and omitting the key renders exactly what 0 renders. The only guard reaching `splineExtend` and `setSplinePoints`. Needs a FRESH dev server: it drives `splineMode` by bare-URL import, so any edit to that file since the server started leaves the app on its default S-curve and [1] fails saying so) · **`npm run smoke:gx-geom-gpu`** (Phase W perf, 2026-09-08: the four 2D geometries exist TWICE — `palette/core/rampGeometry.ts` renders the still image with CPU error diffusion, `gradient-explorer/fullscreen/modes/geometryFrag.ts` is a GLSL mirror used for live frames — and this renders every geometry both ways at ten parameter sets and compares per pixel. The ONLY thing standing between those two implementations and silent drift, since the repo's usual "export the law and call it from both" cannot cross the JS/GLSL boundary. Clean tree: worst max 3 levels, worst mean 0.750; falsified by flipping `BIAS_K` in the shader alone → max 115, three cases red) · **`npm run smoke:ge-wallpaper`** (Phase W, 2026-09-08: the v2 shell registers a live gradient source at boot, the wallpaper FOLLOWS the working gradient while it is open, and an empty input falls back to the snapshot instead of blanking — the only guard reaching `setFullscreenLiveSource` and the overlay's `RegisteredLiveSource` (its `HeroLiveSource` twin, the first shell's resolver, went with that shell on 2026-09-16); falsified two ways, see its header. Needs a FRESH dev server: it drives `fullscreenStore` by bare-URL import, so any edit to that file since the server started reds [1] with the dual-instance message) · **`npm run smoke:ge-ground`** (Phase D, 2026-09-08: ONE GROUND, MANY SETS — a pick fills Today on the set rail, the Today chip puts that bin alone on the ground at a large tile with zoom as the only tool, a set tile is a shelf pick, All comes back whole, "Group these N" (named "Keep these N" until 2026-09-24) files a narrowed wall as a group and shows it, the set id survives a reload; then the scrollbar beside the pad marks where the wall is and moves with it, and the pad follows the Arrange state (Rows by = Vividness puts chroma on its Y; Complexity falls back) — nine steps, falsified three ways, see its header — the only guard reaching `gradient-explorer/v2/SetRail.tsx` and `useGroundSource.ts`. Since 2026-09-23 also [13], NEW GRADIENT from nothing: the nothing-picked line's "start a new one", the hero ☰'s lead item through `AdvancedGradientEditor`'s `menuLead` seam, one undo step (a live Mix's face included), a Pixel 5 — the only guard on the shell's `startNewGradient`; falsified four ways. Since 2026-09-24 also [14], ESC TAKES THE NEAREST HELD THING — a wall tool's Esc (carve tools and the zoom tool, through `useDismiss`) and the Export window's Esc leave the tray face under them alone; and [15a]–[15f], FILTERS FOLDS THE HERO while open, undoes only a fold it made, and its open state rides undo as context (`useFiltersHistory` in `gradient-explorer/v2/uiHistory.ts`) — the only guards reaching those; [14a]/[14b]/[15] falsified, see the header) · **`npm run smoke:ge-phone`** (Phase F, 2026-09-10: the v2 shell on a PHONE — a Pixel 5 context asserts no horizontal overflow, the Filters button actually tappable, a hero under 240 px with its use cluster on screen, each tray face and the Export sheet inside the viewport, the tools at the bottom of the wall (no carving tools on a phone, zoom-in alone at 1:1), a TOUCH drag moving a knot, and step [8] the WALLPAPER overlay on a phone (root touch-action none, the document locked, the Export panel collapsed, the mode selector scrolling — 2026-09-11); then a desktop context [9] proves the phone branch is gated — the tools stay a column, the hero keeps its image column. The only guard reaching `gradient-explorer/v2/useIsPhone.ts` and the phone branches in the seven v2 files it gates; see ADR-0115. Falsified two ways, see its header. **Since 2026-09-13 also Help / Support / Feedback** (`gradient-explorer/v2/ShellMenu.tsx`, the only guard reaching it): [2b] the phone's ONE top-bar menu — no overflow, no separate gear, controls no wider than 108 px (100 until 2026-09-24, when the menu button grew from 24 to 32 px at the owner's call), Settings + Support + Send Feedback in it, Send Feedback opening a full-width sheet with no pageerror and no error-boundary fallback — and [10] the desktop `?` button opening the registered Help menu and the feedback window. Falsified eight ways, see its header. Step [11] (same day) is the only guard reaching `gradient-explorer/v2/help/` — GX's own topics, About with the catalogue's attribution, What's New and its dot on GX's own seen key, "Support Gradient Explorer", the gradient feedback attachment — plus the phone menu having no Keyboard Shortcuts and no hints, and H not toggling `showHints`; falsified nine more ways. Steps [3c] (phone) and [12] (desktop) cover the feedback attachment choice with the endpoint INTERCEPTED (`page.route`, nothing is sent): Screenshot shows a thumbnail and carries a non-blank `data:image/jpeg` under 200 KB with no gradient; Gradient carries the stops and no image; falsified eight ways. The topic WORDING is unguarded beyond the two headings the step reads) · **`npm run smoke:ge-session`** (S3, 2026-09-13: the v2 working SESSION — autosave is OPT-IN and the Explorer's own (`gmt.ge.autosave-*`): with app-gmt's `gmt-autosave-enabled` seeded on, an edit is neither restored nor written; the real Settings row turns it on without moving app-gmt's key; then an edited gradient comes back after a reload carried by the pagehide flush alone (interval seeded to 600 s), a first Ctrl+Z after the reload leaves it, a live Mix comes back with its face open, a share link wins and becomes the session, garbage storage boots clean, turning it off removes the stored session and a session put back by hand is not restored, and WITH AUTOSAVE OFF Settings ▸ Files ▸ Session saves a `.gxsession.json` and loads another as one undo step and refuses a garbage file with a toast, and on a Pixel 5 the menu reaches those rows and Load works. The only guard reaching `gradient-explorer/v2/session.ts` and `GradientExplorerV2App.tsx`'s initial tray face; falsified ten ways, see its header. Its logic twin is **`npm run test:gx-session`** (node, `debug/test-gx-session.mts` — the envelope, the boot decision, `shareUrl.ts` `shareOpensFrom`, the adapter against a real store, and the per-app autosave stores + Settings rows; falsified eighteen ways)) · **`npm run smoke:ge-gradientfile`** (ADR-0123 plan item 3, 2026-09-14: the GMT gradient file in the v2 shell — Export's For GMT band above every registry section (one .png row since 2026-09-14), a kept gradient with a Step stop and a moved bias exported as .png and picked back in as the same config and name with the ground switching to Kept, the metadata-stripped copy DROPPED on the wall importing with exact colours while a plain PNG still reaches image extraction, a CSS import on All revealed in Kept (the owner's "neither appeared"), a `.gxsession.json` drop opening as the session with one undo, Save collection (.png) → Clear → Replace from file restoring the shelf, and a Pixel 5 reaching Export ▸ GMT gradient. The only guard reaching `GradientExplorerV2App.tsx`'s `finishImport` / `preRoute` and `ExportMenu.tsx`'s For GMT band; falsified four ways, see its header. Since 2026-09-23 also [h1]–[h4]: the FILE DROP HINT (`components/ui/DropScrim.tsx` on the `osDrop` tier; a wall tile's own drag never raises it; `palette/components/useImageDrop.ts`'s drag timer) and "reading image…" in `ImageSlot.tsx` — slim slot, over a picture, and the phone's door — with the decode held by a stub; falsified six ways) · **`npm run smoke:ge-hero`** (Phase B, 2026-09-06: the hero never unmounts — L8; falsified by re-introducing the old hide) and **`npm run smoke:ge-tray`** (Phase C, 2026-09-07: ONE tray under the card, one face at a time, floating over the wall, Esc closes and clears the stop selection; falsified three ways, see its header) — the two guards that reach `gradient-explorer/v2/WorkingHero.tsx`, `Tray.tsx` and the shell's tray/source logic · `npm run smoke:ge-next` (boots `gradient-explorer.html` → `gradient-explorer/v2/`, added 2026-09-03 on `gradient-explorer-next.html`, which has been an alias of the same app since the entry-point swap of 2026-09-16; it is `smoke:boot` pointed at that page, so it proves the registration path + no pageerror, nothing about the hero) · `npm run smoke:liquify`, `npm run smoke:gx-handles`, `npm run smoke:gx-fractal-glitch` (all boot `gradient-explorer.html`, the v2 shell since the swap — they drive `fullscreenStore` directly, so the shell only hosts the overlay) · **`npm run test:gx-export`** (`debug/test-gx-export-size.mts`, added 2026-09-03 with the Wallpaper export-at-size panel) — a node harness over `gradient-explorer/fullscreen/exportSize.ts`: the size presets, the orientation swap, the 4K clamp (a ~2,600-shape sweep — the file's `@invariant`), the supersample gate by mode kind and its render-budget degrade, the filename, and `readPngSize`. Sub-second, no browser. It is the ONLY guard reaching that file, and it reaches nothing else in `fullscreen/`. **`npm run test:gx-share`** (`debug/test-gx-share.mts`, added 2026-09-06) is the node harness over `gradient-explorer/v2/shareUrl.ts` — round trip, elided defaults, garbage → null; the ONLY guard reaching that file — the offscreen render path (`exportRender.ts`), the `renderAt` implementations in the three ownCanvas modes, and the `gradientMap` raster are all UNGUARDED: verify those by exporting a wallpaper in the running app. Falsified 2026-09-03 three ways, each reverted (dropping the pixel-budget clamp term → 4 red; `round` for `floor` → 1 red; `canSupersample('ownCanvas')` → 1 red) — plus `npm run test:liquify` (`debug/test-liquify-mesh.mts`), which is not a browser smoke: it exercises `gradient-explorer/fullscreen/modes/liquify/{LiquifyMesh,catmullRom}.ts` on plain node in under a second, and is also the last link in the `test:palette` chain. Fastest real guard in this row; reach for it first when touching the liquify soft body. It was named here only by file path until 2026-07-29 — the npm script it is wired to was cited nowhere. (Until 2026-08-02 the direct citation was also the *only* one that resolved: `test:palette` is a sixteen-link `&&` chain of bare `tsx` calls, and `check:rule-guards` took a script's entry from its **first** command, so fifteen of the sixteen were invisible to it. That is fixed — grep `entriesForFile` in `debug/check-rule-guards.mjs` — and a direct-file chain now resolves to the union of its members. The direct citation stays: it is the narrower guard, and a rule wants the narrowest guard that can fail on its files.) Falsified 2026-07-29 four ways, each reverted: gutting `step()` reds the physics contract, and three breaks that used to pass green now red on the six assertions added that day — a dead `smoothAll`, a dead `smoothRegion` (the whole smooth brush), and Catmull-Rom downgraded to bilinear. See the guard's own header for the measured numbers. |
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
