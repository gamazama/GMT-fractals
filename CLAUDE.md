# gmt-engine — Claude Code Instructions

## Project Overview
**gmt-engine** — a generic application engine extracted from GMT (at `h:/GMT/gmt-0.8.5/`). Provides DDFS (Data-Driven Feature System), animation, UI, save/load, shortcuts, undo, and plugin seams. Apps (GMT, toy-fluid, future prototypes) install features and core plugins on top of it.

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

### Automated Checks
- `npm run typecheck` — tsc, should exit 0.
- `npm run smoke:boot` — headless Chromium boot, fails on pageerrors.
- `npm run smoke:interact` — state-flow + preset round-trip (demo feature).
- `npm run smoke:screenshot` — visual baseline → `debug/scratch/engine-boot.png`.

## Build & Run
```bash
npm run dev      # Vite on localhost:3400
npm run build    # Production build
```
