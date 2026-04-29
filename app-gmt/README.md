# app-gmt

The GMT fractal renderer running on the engine. This is the full production app — 42 formulas, 26 DDFS features, 10 panels, worker-backed raymarcher, camera animation, video export, GMF save/load, URL sharing.

**Live at:** `http://localhost:3400/app-gmt.html` (`npm run dev` from the repo root).

The GMT-specific domain logic lives in [engine-gmt/](../engine-gmt/). This folder (`app-gmt/`) is only the shell — it wires engine-core plugins + engine-gmt plugins together in the right order.

---

## File map

```
app-gmt/
├── main.tsx             Boot entry — installs plugins, seeds boot preset,
│                        boots the worker renderer. Read this first.
├── registerFeatures.ts  Side-effect import — registers 26 DDFS features
│                        before the store freezes. Must be the very first
│                        import in main.tsx (ES module hoisting means it
│                        can't be a function call).
├── AppGmt.tsx           React root — mounts the engine shell + GMT
│                        navigation + renderer canvas.
└── LoadingScreen.tsx    GMT-branded splash shown while the worker shader
                         compiles on first boot.
```

No more files belong here. GMT-specific logic goes in `engine-gmt/`.

---

## Where GMT logic actually lives

```
engine-gmt/
├── features/            26 DDFS feature definitions (AO, atmosphere,
│                        coloring, lighting, optics, quality, etc.)
├── formulas/            42 formula presets + FractalRegistry
│   ├── built-in/        One .ts per formula (Mandelbulb, MandelboxTwist, …)
│   └── registry.ts      FractalRegistry — get(id), register(def)
├── renderer/            Worker-backed GPU renderer
│   ├── install.ts       installGmtRenderer() — boots the worker plugin
│   ├── GmtRendererCanvas.ts  OffscreenCanvas + worker bridge
│   └── GmtRendererTickDriver.ts  FPS gating + shader compile state
├── navigation/          Camera controllers (Orbit / Fly), HUD overlay
├── panels.ts            GmtPanels — 10-panel manifest (Formula, Scene,
│                        Quality, Lighting, Coloring, …)
├── topbar.tsx           GMT topbar chrome (System menu, Camera menu,
│                        Path Tracing toggle, Playing badge)
├── components/          GMT-specific UI (FormulaSelect, Workshop,
│                        CameraManager, timeline, gizmos, …)
├── engine/              Worker-side bridge (WorkerProxy, FractalEngine,
│                        uniform management, shader pipeline)
├── store/               GMT-specific store additions (cameraSlice,
│                        modularSlice, gmtPresetFields)
└── utils/               FormulaFormat.ts — GMF save/load
```

---

## Boot order

The boot sequence in `main.tsx` is strict. Wrong order → black screen or crash.

1. `import './registerFeatures'` — first import, no exceptions.
2. `registerGmtUi()` — registers GMT widget componentIds before manifest runs.
3. `installGmtCameraSlice()` + `installGmtModularSlice()` — store patches before any component reads them.
4. `installViewport()` / `installTopBar()` / `installSceneIO()` / … — engine-core plugins.
5. `applyPanelManifest(GmtPanels)` — declares panel layout.
6. `installGmtRenderer()` — boots worker plugin.
7. `setTimeout(() => gmtRenderer.boot(config, cam), 100)` — starts the worker after React mounts the canvas.

The 100 ms delay in step 7 is intentional: `GmtRendererCanvas` (mounted by React) calls `proxy.initWorkerMode()` to hand the OffscreenCanvas to the worker. The renderer can't boot until that happens.

---

## Adding a GMT feature

1. Read [docs/engine/02_Feature_Registry.md](../docs/engine/02_Feature_Registry.md) — the `defineFeature` shape.
2. Look at an existing feature: `engine-gmt/features/ao/` or `engine-gmt/features/coloring/`.
3. Create `engine-gmt/features/<name>/index.ts` — export `FeatureDefinition`.
4. Register it in `app-gmt/registerFeatures.ts`.
5. Add a `sync<Name>ToEngine` call in `engine-gmt/features/ui.tsx` (or the app's `useEngineSync.ts`).
6. Declare the slice in `engine-gmt/storeTypes.ts` — see [docs/engine/16_Type_Augmentation.md](../docs/engine/16_Type_Augmentation.md).
7. Add the feature to the relevant panel in `engine-gmt/panels.ts` — see [docs/engine/14_Panel_Manifest.md](../docs/engine/14_Panel_Manifest.md).

Run `npm run typecheck` — exits 0 means the plumbing is correct.

---

## Adding a formula

1. Create `engine-gmt/formulas/built-in/<FormulaName>.ts` — export a `FormulaDef` with `id`, `shader` (GLSL), and `defaultPreset`.
2. Register it in `engine-gmt/formulas/index.ts`.
3. Run `npm run test:baseline` (from `../stable/`) to confirm the shader compiles.

GMT-era formula docs (from `stable/`): [stable/docs/gmt/25_Formula_Dev_Reference.md](../../stable/docs/25_Formula_Dev_Reference.md).

---

## Tests

Run from the repo root:

```bash
npm run typecheck       # TypeScript — must pass before any change lands
npm run smoke:all       # boot + interact + screenshot smokes
```

For shader / formula compile checks, run from `../stable/`:

```bash
npm run test:baseline   # 42 formulas, all features off (~8s)
npm run test:shader     # full compile matrix (~2.5 min)
```

---

## Key shortcuts (runtime)

| Key | Action |
|-----|--------|
| `Tab` | Toggle Orbit / Fly camera mode |
| `` ` `` | Toggle Advanced Mode (shows extra params) |
| `B` | Toggle Broadcast / Clean-Feed mode (hide chrome) |
| `Ctrl+Shift+Z` | Undo last camera move |
| `Ctrl+Shift+Y` | Redo last camera move |
| `Escape` | Exit interaction mode / deselect |

---

## GMF file format

GMT scenes save as `.gmf` — a JSON envelope carrying both the formula's GLSL shader source and the full scene preset. This lets workshop saves and Fragmentarium imports load cleanly on any runtime. See `engine-gmt/utils/FormulaFormat.ts` for `saveGMFScene` / `loadGMFScene`.

PNG snapshots embed GMF in iTXt metadata — drag a screenshot back into GMT to restore the exact scene.

---

## See also

- [engine-gmt/](../engine-gmt/) — GMT plugin layer (start here for rendering / formula work)
- [docs/DOCS_INDEX.md](../docs/DOCS_INDEX.md) — full docs table of contents
- [docs/engine/01_Architecture.md](../docs/engine/01_Architecture.md) — three-tier model
- [HANDOFF.md](../HANDOFF.md) — session progress log, deferred work, known issues
