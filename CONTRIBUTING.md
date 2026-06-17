# Contributing to gmt-engine

Thanks for your interest in contributing. This document covers the essentials: how the repo is structured, how to find something to work on, and how to get a PR merged.

## Quick start

```bash
git clone <repo>
cd gmt-engine
npm install
npm run dev          # Vite dev server at http://localhost:3400
npm run typecheck    # must exit 0 before any PR
npm run smoke:all    # headless browser smoke suite
```

Entry points while developing:

| URL | App |
|-----|-----|
| `http://localhost:3400/` | Engine demo (hello-world plugin) |
| `http://localhost:3400/app-gmt.html` | GMT fractal renderer (full app) |
| `http://localhost:3400/fluid-toy.html` | Fluid simulation toy |
| `http://localhost:3400/fractal-toy.html` | Minimal Mandelbulb playground |

## How the repo is structured

Three tiers. Keep them separate — this is the most important design constraint.

```
engine/          Generic, domain-agnostic engine core. No fractal language here.
engine-gmt/      GMT plugin layer (fractal-specific: renderer, formulas, camera).
app-gmt/         GMT app shell — wires engine + engine-gmt together.

fluid-toy/       Fluid sim app (another app on the same engine).
fractal-toy/     Minimal Mandelbulb playground (proof-of-concept app).
demo/            Hello-world add-on — read this first.

store/           Shared Zustand store composition (used by all apps).
components/      Shared UI primitives (no store imports — pure components).
```

Understand the three-tier model before writing code: [docs/engine/01_Architecture.md](docs/engine/01_Architecture.md).

## Read the docs first

Every subsystem has a doc. The `CLAUDE.md` table maps "what you're touching" to "what to read." The short list:

| Working on | Read first |
|-----------|-----------|
| Adding a feature (DDFS) | [docs/engine/02_Feature_Registry.md](docs/engine/02_Feature_Registry.md) |
| Writing a new plugin | [docs/engine/11_Plugin_Authoring.md](docs/engine/11_Plugin_Authoring.md) |
| Porting an app onto the engine | [docs/engine/03_Plugin_Contract.md](docs/engine/03_Plugin_Contract.md) |
| GMT fractal renderer | [app-gmt/README.md](app-gmt/README.md) |
| Fluid toy | [fluid-toy/README.md](fluid-toy/README.md) |
| Minimal plugin example | [demo/README.md](demo/README.md) |
| Animation / keyframes | [docs/engine/08_Animation.md](docs/engine/08_Animation.md) |
| Undo / redo | [docs/engine/06_Undo_Transactions.md](docs/engine/06_Undo_Transactions.md) |
| Keyboard shortcuts | [docs/engine/07_Shortcuts.md](docs/engine/07_Shortcuts.md) |
| Panel layout | [docs/engine/14_Panel_Manifest.md](docs/engine/14_Panel_Manifest.md) |
| TypeScript augmentation | [docs/engine/16_Type_Augmentation.md](docs/engine/16_Type_Augmentation.md) |
| Known fragilities | [docs/engine/20_Fragility_Audit.md](docs/engine/20_Fragility_Audit.md) |

Full index: [docs/DOCS_INDEX.md](docs/DOCS_INDEX.md).

## Finding something to work on

- Check open issues on GitHub for `good first issue` tags.
- [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md) tracks what's done, what's in-progress, and what's deferred.
- [docs/engine/20_Fragility_Audit.md](docs/engine/20_Fragility_Audit.md) lists known issues with remediation notes.

## Adding a DDFS feature (most common contribution)

A DDFS feature is a self-contained bundle of state + UI + optional shader injection. Adding one doesn't require touching engine or UI core.

1. Read [docs/engine/02_Feature_Registry.md](docs/engine/02_Feature_Registry.md).
2. Look at `demo/DemoFeature.ts` — the minimal three-field shape.
3. Look at `fluid-toy/features/julia.ts` — a real feature with sync and shader injection.
4. Create `<your-app>/features/<name>.ts` — export `FeatureDefinition` and a `sync<Name>ToEngine` function.
5. Register it in `<your-app>/registerFeatures.ts` — a single `featureRegistry.register(YourFeature)` call.
6. Add a `sync<Name>ToEngine` call in the app's `useEngineSync.ts` (or equivalent).
7. Declare your feature's state slice in `<your-app>/storeTypes.ts` (see [docs/engine/16_Type_Augmentation.md](docs/engine/16_Type_Augmentation.md)).
8. Run `npm run typecheck` — should exit 0.

Everything else (save/load, URL sharing, undo, animation keyframes, auto-generated UI) works automatically.

## Tests

```bash
npm run typecheck       # TypeScript — must pass before any PR
npm run smoke:all       # boot + interact + screenshot smoke tests
npm run smoke:boot      # headless Chromium boot, fails on page errors
npm run smoke:interact  # state-flow + preset round-trip
npm run smoke:screenshot # visual baseline → debug/scratch/engine-boot.png
```

For the stable GMT app (`../stable/`), the shader test suite is separate:
```bash
# run from stable/
npm run test:shader     # all compile checks (~2.5 min)
npm run test:baseline   # every formula compiles (~8s)
```

## PR checklist

- [ ] `npm run typecheck` exits 0
- [ ] `npm run smoke:all` passes
- [ ] Relevant docs updated (or a doc note added for new patterns)
- [ ] No manual Zustand slices for feature state — use `defineFeature`
- [ ] No store imports in UI primitives — use React context
- [ ] No fractal/GMT-specific language added to `engine/**`
- [ ] TypeScript `isolatedModules: true` — type-only imports use `import type { X }`

## Architecture rules (short form)

These are the most common review blockers:

- **Features are isolated.** Read another feature's state only via `dependsOn`.
- **Intra-feature coordination uses bridges.** No ad-hoc store reach-through.
- **UI primitives are pure.** No store imports; animation/undo/shortcuts are opt-in via React context.
- **No app-specific names in engine-core.** No `if (formula === 'Mandelbulb')` in `engine/**`.
- **No `as any` without a comment explaining why.**

Full rules: [CLAUDE.md](CLAUDE.md) and [docs/engine/01_Architecture.md](docs/engine/01_Architecture.md).

## Doc update policy

After making changes, update the affected doc. If you discover undocumented behaviour, add it. If a doc says something no longer true, fix it in the same PR. Docs live in `docs/engine/` (authoritative) and per-app READMEs (`fluid-toy/README.md`, `app-gmt/README.md`, `demo/README.md`).

Don't modify `docs/gmt/` — those are pre-extraction GMT reference docs, read-only.

## Code style

- **No comments** unless the *why* is non-obvious (a hidden constraint, a workaround for a specific bug, a subtle invariant).
- `isolatedModules: true` — type-only cross-module re-exports must use `export type { X }`.
- No half-implemented features. Either port it, stub it cleanly with a `console.info('[name] X pending')`, or remove the entry point. Dead code is debt.
