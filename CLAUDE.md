# gmt-engine — Claude Code Instructions

## Project Overview
**gmt-engine** — a generic application engine extracted from GMT (stable at `h:/GMT/workspace-gmt/stable/`). Lives at `h:/GMT/workspace-gmt/dev/`. Provides DDFS (Data-Driven Feature System), animation, UI, save/load, shortcuts, undo, and plugin seams. Apps (GMT, toy-fluid, future prototypes) install features and core plugins on top of it.

Stack: React 18 + TypeScript + Zustand + Vite + optional GLSL | Forked from GMT 0.9.2 | Status: pre-1.0 architecture stabilisation

Two companion docs at the repo root:
- `HANDOFF.md` — session-by-session progress log, stage history, resume instructions.
- `README.md` — project overview (if/when public).

This file (`CLAUDE.md`) is forward-looking rules. `docs/DOCS_INDEX.md` is the authoritative table of contents.

## Critical Rules

### Read Docs Before Coding (MANDATORY)
Before ANY code change, consult the doc for the area you're touching. The engine has architectural commitments not obvious from code alone.

| Working on... | Read first |
|---|---|
| **fluid-toy** — anything in `fluid-toy/` | `fluid-toy/README.md` |
| **demo** — adding a tiny plugin proof | `demo/README.md` |
| Overall architecture — engine vs core plugins vs apps | `docs/engine/01_Architecture.md` |
| Adding/modifying features, `defineFeature` API, isolation | `docs/engine/02_Feature_Registry.md` |
| The add-on registration contract (plugin boot order) | `docs/engine/03_Plugin_Contract.md` |
| Which core plugins ship, what each owns | `docs/engine/04_Core_Plugins.md` |
| UI primitives, AdvancedGradientEditor, opt-in context pattern | `docs/engine/05_Shared_UI.md` |
| Undo, redo, transaction scopes, debounce | `docs/engine/06_Undo_Transactions.md` |
| Keyboard shortcuts, scopes, priority resolution | `docs/engine/07_Shortcuts.md` |
| Animation, keyframes, auto-binding, BinderRegistry | `docs/engine/08_Animation.md` |
| Intra-feature coordination — bridges and derived values | `docs/engine/09_Bridges_and_Derived.md` |
| Viewport sizing, DPR, adaptive quality, FPS probe, fixed-res controls | `docs/engine/10_Viewport.md` |
| **Authoring a new core plugin** — the four-part shape + seven rules | `docs/engine/11_Plugin_Authoring.md` |
| **App handles** — typed cross-tree state (`defineAppHandles<T>`) | `docs/engine/12_App_Handles.md` |
| **Extracting a GMT feature as generic** — triage + worked example | `docs/engine/13_Extracting_From_GMT.md` |
| **Panel manifests** — how `panels.ts` composes features into panels | `docs/engine/14_Panel_Manifest.md` |
| **Type augmentation** — DDFS slices + state-library keys (the no-`as any` rule) | `docs/engine/16_Type_Augmentation.md` |
| Known fragilities + remediation status | `docs/engine/20_Fragility_Audit.md` |
| Save/load, SceneFormat, preset field registry | `docs/engine/04_Core_Plugins.md#scene-io` + `utils/SceneFormat.ts` |
| GMT-era reference (fractal, raymarching, formulas) | `docs/gmt/` — historical, NOT authoritative for the engine |

After making changes, update the affected doc. If you discover undocumented behaviour, add it. If a doc says something that's no longer true, fix it in the same commit.

### TypeScript
- `tsconfig` has `isolatedModules: true` — type-only cross-module re-exports MUST use `export type { X }` and `import type { X }`. Otherwise Vite/esbuild leaves the export in JS output → runtime SyntaxError.

### Architecture Rules
- **Features are isolated.** A feature's state lives at `store[featureId]`. Reading another feature's state requires declaring `dependsOn: ['otherId']` in the feature def. Undeclared access throws in dev, warns in prod. See `docs/engine/02_Feature_Registry.md`.
- **Intra-feature coordination uses bridges or derived values.** No ad-hoc store reach-through. See `docs/engine/09_Bridges_and_Derived.md`.
- **UI primitives are pure.** No primitive imports the store. Animation / undo / shortcuts / context-menu capabilities are opt-in via React context. See `docs/engine/05_Shared_UI.md`.
- **The render loop is app-owned.** Engine provides `TickRegistry` phases; the app (or `@engine/render-loop` core plugin) calls `runTicks(dt)` each frame. See `docs/engine/01_Architecture.md`.
- **Feature registry is frozen at store construction.** Late registration throws in dev, no-ops in prod. All `featureRegistry.register()` calls must happen before `createEngineStore()` runs. See `docs/engine/03_Plugin_Contract.md`.
- **Duplicate feature IDs are forbidden.** The second registration throws immediately.
- **Every DDFS param is animatable and undoable by construction.** No per-feature wiring. If you add a param, keyframes + undo + preset round-trip all work automatically. See `docs/engine/08_Animation.md`.

### Key Files
| File | Role |
|---|---|
| `engine/FeatureSystem.ts` | `featureRegistry`, `binderRegistry`, `bridgeRegistry`; isolation + freeze checks |
| `engine/ShaderBuilder.ts` | 5 generic primitives + `addSection` escape hatch (optional for non-shader apps) |
| `engine/TickRegistry.ts` | SNAPSHOT → ANIMATE → OVERLAY → UI phase orchestration |
| `engine/AnimationEngine.ts` | Auto-binds every DDFS param + any explicitly registered binder |
| `store/engineStore.ts` | Engine store (rename to `engineStore.ts` deferred — see `HANDOFF.md`) |
| `store/createFeatureSlice.ts` | Auto-derives state slice + setter from feature def |
| `utils/SceneFormat.ts` | Generic save/load (JSON + PNG iTXt + URL share) |
| `demo/` | Reference add-on. Three-file contract: `registerFeatures.ts` + feature def + `setup.ts` |

### What NOT to Do
- Don't add manual Zustand slices for feature state — use `defineFeature`.
- Don't import the store from a UI primitive — use React context.
- Don't reach from feature A's setter into feature B's state — use a bridge.
- Don't depend on `set${Feature}` by name-inference in animation — the engine auto-binds via the registry. If you need a custom binder, `binderRegistry.register()` it explicitly.
- Don't write architecture decisions in changelog form. Update the relevant doc's "Decisions" section and link commits from the doc, not the other way around.
- Don't modify anything under `docs/gmt/` — those are pre-extraction GMT reference. Engine-scope changes go in `docs/engine/`.

## Engine Principles (Goals · Strategies · Anti-Patterns)

### Goals
1. **One engine, many apps.** GMT, fluid-toy, fractal-toy, and any future visual-compute app share the engine without carrying a fork. The engine is a generic application framework — DDFS, manifest-driven panels, plugin slots, animation, save/load, worker contract.
2. **GMT runs identically to its pre-extraction state**, but composed entirely from engine pieces. Divergence between GMT and engine-gmt belongs in `engine-gmt/` (a plugin library), not in GMT-shaped escape hatches inside engine-core.
3. **Engine internals stay domain-agnostic.** No fractal language in `engine/**`, `components/**`, `store/**`. App-specific behavior comes via plugin seams, registries, store augmentations.
4. **The manifest grows to express what GMT needs**, generically. Section headers, conditional sub-blocks, collapsibles, widget props — every pattern GMT uses becomes a generic primitive other apps can pick up.

### Strategies
1. **Genericize, don't fork.** When GMT needs something the engine can't express, extend the engine *in a way that another app could also use* — then express GMT's case through it. The PanelManifest `items` model is the canonical example; `setFormulaParamResolver` and `selectMovementLock`'s feature-driven `interactionConfig.blockCamera` are smaller ones.
2. **Plugin seams over hardcoded paths.** Resolvers, registries, event buses (`setFormulaPresetResolver`, `setFormulaParamResolver`, `featureRegistry.getMenuFeatures()`, `FRACTAL_EVENTS.UNIFORM`) keep engine-core decoupled from any specific app's data sources.
3. **Manifest-composed UI.** Panels are declarative compositions of features, widgets, sections, separators, collapsibles. Layout decisions live in the manifest — not in hand-written panel components. See `docs/engine/14_Panel_Manifest.md`.
4. **Verbatim ports for self-contained widgets.** Where a piece of GMT (FormulaSelect, AudioSpectrum, FlowEditor, EnginePanel) is a coherent self-contained widget, port it verbatim with path rewrites, register it in `componentRegistry`, and let the manifest reference it. Don't rewrite the internals.
5. **One source of truth for shared resources.** Component-class CSS, formula presets, scene fields, modulation events — single module that injects/registers, multiple consumers. If you find yourself copy-pasting a config block across entries / modules / apps, lift it into the engine.
6. **Read code before reasoning.** After context compaction or for unfamiliar territory, trace the actual flow before proposing fixes (see `feedback_collaboration_patterns.md`).
7. **Confirm understanding before implementing.** Numbered plans, audit-then-fix, not implement-then-debug.

### Anti-Patterns to Avoid
1. **Don't `component: 'panel-X'` your way out of a manifest gap.** That's how five `panel-X` escape hatches turn into five forks. If a panel can't be expressed via `items`, extend the manifest (a new item type, a new prop on an existing one) so it can.
2. **Don't copy-paste shared resources across entries.** Component CSS, panel registrations, plugin installs — single module, mounted once, consumed everywhere.
3. **Don't hardcode app-specific names in engine-core.** No `if (formula === 'Mandelbulb')`, no `state.geometry?.juliaX`, no GMT-specific Transaction shapes. Use predicates / resolvers / declaration-merging.
4. **Don't bypass the event bus to talk to the worker.** `engine.setUniform` on the engine-core stub is a no-op; UI / animation code goes through `FRACTAL_EVENTS` so engine-gmt's bridge forwards it.
5. **Don't override engine-core actions in app-specific slices.** Engine-core's unified `undoStack` is the unified history; GMT's cameraSlice doesn't get a parallel one. Apps either extend engine-core's mechanism or register a feature-level extension point.
6. **Don't add a feature flag for "the GMT case".** If something is GMT-specific, scope it via a registered handler / `interactionConfig` / `engineConfig.toggleParam`, never via inline conditionals in shared code.
7. **Don't leave dead `tabConfig.dock` / `defaultActive` / `aggregatesFrom` (or equivalent vestigial fields) on features.** Confuses readers and rots. Delete or migrate as you go.
8. **Don't write `// TODO port from GMT` and ship.** Either port it (file-copy + sed pattern is fast), stub it cleanly with a `console.info('[gmt] X pending port')` and document the gap in `HANDOFF.md`, or remove the entry point. Half-implemented features are debt.
9. **Don't fix bugs by adding flags.** A "lock the camera during picking" flag added to Navigation is local; extending `selectMovementLock` is generic. Reach for the predicate.
10. **Don't widen TypeScript with `as any` casts unless documenting why.** Type-grafts (engine-core stub vs engine-gmt real) are real and sometimes need casts; adding `as any` because the type is annoying is debt.

### Automated Checks
- `npm run typecheck` — tsc, should exit 0.
- `npm run orphans` — knip; lists unused files (real import-graph walk, not grep). Run before deleting "looks unused" code — grep gives false positives because the engine-core / engine-gmt trees both expose siblings with the same name. Config: [knip.json](knip.json).
- `npm run smoke:boot` — headless Chromium boot, fails on pageerrors.
- `npm run smoke:interact` — state-flow + preset round-trip (demo feature).
- `npm run smoke:screenshot` — visual baseline → `debug/scratch/engine-boot.png`.

## Build & Run
```bash
npm run dev      # Vite on localhost:3400
npm run build    # Production build
```
