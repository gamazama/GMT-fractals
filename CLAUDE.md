# gmt-engine — Claude Code Instructions

## Project Overview
**gmt-engine** — a generic application engine extracted from GMT (stable at `h:/GMT/workspace-gmt/stable/`). Lives at `h:/GMT/workspace-gmt/dev/`. Provides DDFS (Data-Driven Feature System), animation, UI, save/load, shortcuts, undo, and plugin seams. Apps (GMT, toy-fluid, future prototypes) install features and core plugins on top of it.

Stack: React 18 + TypeScript + Zustand + Vite + optional GLSL | Forked from GMT 0.9.2 | Status: pre-1.0 architecture stabilisation

**Working directory.** Primary is `h:/GMT/workspace-gmt/dev/` (this tree). `h:/GMT/workspace-gmt/stable/` is the production checkout — investigate and edit there ONLY on explicit ask. Default investigations to `dev/`; if a memory file or env hint says otherwise, the user instruction wins.

Three companion docs at the repo root:
- `HANDOFF.md` — session-by-session progress log, stage history, resume instructions.
- `HEALTH.md` — code-health worklists (6 pools: cleanup, bugs, stale doc rewrites, coverage gap, fragility, refactors). Each pool has a paste-ready session-starter prompt. Run `npm run health` to refresh counts.
- `README.md` — project overview (if/when public).

This file (`CLAUDE.md`) is forward-looking rules. `docs/DOCS_INDEX.md` is the authoritative table of contents.

## Critical Rules

### Documentation Conventions (READ FIRST)

**Navigation policy.** When investigating or modifying code, default to reading source files top-to-bottom and grepping for the annotation markers below. External docs (`docs/adr/`, `docs/policy/`, the table below) are reference-of-last-resort for context the code doesn't carry. **If you find yourself reading a doc that restates code, stop and read the code.** Empirically: two real test tasks (debugging a splash timeout, auditing the state-library factory) both completed via grep + source reading; external markdown contributed zero. The docs are sized for human onboarding/archaeology, not agent navigation.

**Greppable annotation markers** — these are the canonical doc layer agents consume. Add them at the source site, not in external markdown.

- `@invariant <text>` — load-bearing contract on a file or export. Future readers must not break it without writing a superseding ADR.
- `@bug PRODUCTION: <text>` — known production issue at this site. Discoverable by `grep -r '@bug'`. Replace bugs.md for routine bug-finding; bugs.md is a generated convenience.
- `@see docs/adr/NNNN-*.md` — link from code to a decision rationale.
- `@stale <text>` — content known wrong, awaiting refresh. Greppable so cleanup passes can find them.
- `@deprecated <text>` — file or symbol on the way out, with replacement noted.

**Where to put what:**
- New invariants, contracts, or "watch out for X" notes → top-of-file or per-export JSDoc on the source file. Do NOT write a new external markdown file.
- New architectural decisions with rationale (chose A over B because Y) → new ADR in `docs/adr/`. Append-only.
- New cross-cutting policy that spans many files → consider adding to an existing policy doc in `docs/policy/`. Don't proliferate new files.
- Cross-cutting infrastructure (factories, registries, shared primitives) MUST carry top-of-file JSDoc covering: purpose, integration seams, and known pitfalls. Don't make callers rediscover the contract by reading three sibling files.

**Annotation maintenance (cleanup hygiene):**
- **`@stale` removal.** When you touch a file carrying a `@stale` annotation AND your work resolves what the annotation points at, REMOVE the `@stale`. Leaving them in place after the fix produces ghost worklist entries.
- **Verifying backlog / bug entries.** `docs/modules/backlog.md` and `docs/modules/bugs.md` are auto-generated from module docs' "Known Issues" sections at audit time. The archived audit docs under `docs/audit-2026-05-20/archive/**/*.md` are historical reference for *narrative content* — but their "Known Issues" sections are the **live tracking surface** for the regen, and MUST be updated when bugs are fixed or verified clean. Annotate the source entry with `(FIXED YYYY-MM-DD)` (after a fix this session) or `(VERIFIED CLEAN YYYY-MM-DD)` (already-resolved when encountered). Next `npm run health` drops them from the generated lists. Don't edit the surrounding narrative in those archive docs; only the Known Issues entries are live.
- **Known Issues entries MUST be bullet-list lines** (`- ...` or `* ...`), not headings. `extract-bugs.mjs` / `extract-backlog.mjs` only parse bullets — a `### PRODUCTION BUG: ...` heading with prose underneath is invisible to the regen and to any `(FIXED YYYY-MM-DD)` annotation on it. If you find a heading-style Known Issues entry, convert it to a bullet first.
- **No new self-annotation drift.** If you write `@stale`, `@bug PRODUCTION:`, or `@invariant`, that's a commitment to keep it current. Removing the annotation when the underlying issue resolves is part of the work.
- **ADR drift from renames / refactors.** ADRs are append-only — don't rewrite the body. When a rename, file move, or refactor invalidates a symbol name, file path, or line reference cited in an existing ADR (but the underlying decision still stands), prepend a `> **Update YYYY-MM-DD (...; decision unchanged):** ...` block under the heading that names the changed symbols and notes why the decision still applies. If the decision itself is superseded, write a new ADR and mark the old one `Status: Superseded by ADR-NNNN`.

### Read Docs Before Coding

The three doc layers, in order of authority:

1. **Source files with JSDoc + greppable markers** — freshest, most-trusted layer. Default consumption path for agents.
2. **ADRs at [`docs/adr/`](./docs/adr/)** — decisions with rationale. Dated, append-only. Cited from source via `@see docs/adr/NNNN-*.md`. Best for "why was this chosen" questions.
3. **Policy docs at [`docs/policy/`](./docs/policy/)** — cross-cutting rules (engine-fork-rules, ddfs-string-contract, etc.). Best for "what's the rule when X spans multiple files" questions.

Pre-audit narrative docs at `docs/engine/*` are pre-extraction reference. **Source JSDoc + ADRs take precedence** where they disagree — the audit on 2026-05-20 surfaced several drift cases (e.g. `runTicks(deltaMs)` in `01_Architecture.md` was wrong; correct is `runTicks(deltaSec)` per ADR-0002).

The table below covers **domain topics** (specific subsystems). If your task is about cross-cutting infrastructure — saved-state libraries, registries, factories, generic primitives, hotkey/toast/undo machinery — the table likely won't have a row. Look under `engine/store/` (factories), `engine/plugins/` (slot hosts), `components/` (primitives) and grep for the relevant export name; the in-source JSDoc on factories should orient you.

| Working on... | Read first | Decisions |
|---|---|---|
| **Render loop, TickRegistry, phase ordering, delta units** | JSDoc at top of `engine/TickRegistry.ts` | ADRs 0001-0004 |
| **DDFS feature system** — `defineFeature`, registry freeze, auto-setter contract | JSDoc at top of `engine/FeatureSystem.ts` + [`docs/policy/ddfs-string-contract.md`](./docs/policy/ddfs-string-contract.md) + [`docs/policy/ddfs-auto-wiring.md`](./docs/policy/ddfs-auto-wiring.md) | ADRs 0007-0014, 0036-0037 |
| **Shared UI primitives** — Knob, Slider, AutoFeaturePanel, CompilableFeatureSection | JSDoc on `components/AutoFeaturePanel.tsx` + [`docs/policy/shared-ui-coupling-rules.md`](./docs/policy/shared-ui-coupling-rules.md) | ADRs 0008-0010 |
| **Floating surfaces** — Modal / FloatingPanel / AnchoredMenu, `useDismiss`, the `Z` scale, `stopNavKeys`, capture-phase Escape dismissal | JSDoc on `components/ui/*` + `hooks/useDismiss.ts` | ADR-0060 |
| **Animation engine** — binders, recording, log/camera-pair tracks | JSDoc on `engine/AnimationEngine.ts` | ADRs 0015-0017 |
| **Render pipeline** — writeIndex semantics, bloom, accumulation | JSDoc on `engine/RenderPipeline.ts` + `engine/BloomPass.ts` | ADR-0018 |
| **Shader builder** — uniform schema, BASE vs feature merge, section escape hatch | JSDoc on `engine/ShaderBuilder.ts` + [`docs/policy/uniform-plugin-contract.md`](./docs/policy/uniform-plugin-contract.md) | ADRs 0019-0020 |
| **Plugin host slots** — TopBar / Hud / Menu / SceneIO / RenderDialog | JSDoc on `engine/plugins/*.tsx` | ADR-0021 |
| **Shortcuts + per-scope undo** | JSDoc on `engine/plugins/Shortcuts.ts` + `Undo.tsx` | ADRs 0022-0023 |
| **Adaptive resolution** — viewport plugin, FPS probe, render-scale | JSDoc on `engine/AdaptiveResolution.ts` + `engine/plugins/Viewport.tsx` | ADRs 0024-0026 |
| **Camera plugin / StateLibrary primitive** — savedCameras lifecycle, slot semantics | JSDoc on `engine/plugins/camera/*` + `engine/store/createStateLibrarySlice.ts` | ADRs 0027-0031 |
| **Worker contract** — proxy stub, ViewportRefs, EngineRenderState | JSDoc on `engine/worker/WorkerProxy.ts` | ADRs 0034-0035, 0041-0042 |
| **Mobile layout** — useMobileLayout, address-bar collapse, layout primitives | JSDoc on `hooks/useMobileLayout.ts` + `engine/components/{Landscape,Mobile}*` | ADRs 0038-0039 |
| **App boot (app-gmt)** — main.tsx, useAppStartup, splash lifecycle, frozen-splash debugging | JSDoc on `app-gmt/main.tsx` + `hooks/useAppStartup.ts` + `app-gmt/LoadingScreen.tsx` + `engine-gmt/renderer/GmtRendererTickDriver.tsx` + `store/CompileProgressStore.ts` | ADRs 0005-0006 |
| **Panel manifest + topbar slots** | JSDoc on `engine/PanelManifest.ts` + `app-gmt/panels.ts` | ADR-0011 |
| **Tutorial / lessons** | JSDoc on `engine/plugins/Tutorial.tsx` + `app-gmt/tutorial/*` | ADR-0012 |
| **Engine-gmt: GMT renderer** — FractalEngine + MaterialController + CompileScheduler | JSDoc on `engine-gmt/engine/FractalEngine.ts` + `engine-gmt/engine/CompileScheduler.ts` | ADRs 0036-0042 |
| **Engine-gmt: shader pipeline** — 17-position assembly, UniformManager.syncFrame, ConfigManager.update diff | JSDoc on `engine-gmt/engine/ShaderBuilder.ts` + `managers/UniformManager.ts` | ADRs 0043-0044 |
| **Engine-gmt: bucket render + export** | JSDoc on `engine-gmt/engine/GmtBucketHost.ts` + `worker/WorkerExporter.ts` | ADR-0045 |
| **Engine-gmt: navigation + cursor-anchored gestures** | JSDoc header `engine-gmt/navigation/Navigation.tsx:1-97` | ADRs 0046-0047 |
| **Engine-gmt: formula registry** — FractalDefinition, alias drift, FormulaType union | JSDoc on `engine-gmt/engine/FractalRegistry.ts` + `formulas/index.ts` | ADRs 0048-0049 |
| **Engine-gmt: modular graph** — GraphCompiler, DCE+topo-sort, uModularParams slots | JSDoc on `engine-gmt/utils/GraphCompiler.ts` | ADRs 0050-0051 |
| **GMF save/load + scene serialisation** | JSDoc on `engine-gmt/utils/FormulaFormat.ts` + `utils/SceneFormat.ts` | ADRs 0052-0053 |
| **DDFS feature catalog (engine-gmt)** — feature mounting, engine-core sharing | JSDoc on `engine-gmt/features/index.ts` + `features/core_math.ts` | ADRs 0054-0055 |
| **Camera Manager (engine-gmt)** — savedCameras, slot hotkeys, installStateLibrary consumer | JSDoc on `engine-gmt/store/cameraSlice.ts` + `features/camera_manager/*` | ADRs 0056-0057 |
| **Formula Workshop** — V3/V4 importer, importSource lifecycle | JSDoc on `engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx` | ADR-0058 |
| **Anything spanning engine/ + engine-gmt/** (fork rules — when to shim vs fork) | [`docs/policy/engine-fork-rules.md`](./docs/policy/engine-fork-rules.md) | — |
| **fluid-toy** — sibling app | `fluid-toy/README.md` + `docs/modules/fluid-toy/index.md` (overview) | — |
| **fractal-toy** — sibling app | `docs/modules/fractal-toy/index.md` (overview) | — |
| **mesh-export** — standalone tool | `docs/modules/mesh-export/index.md` (overview) | — |
| **demo** — adding a tiny plugin proof | `demo/README.md` | — |

**Auto-generated indexes** (no manual edits — regenerate via scripts):
- [`docs/modules/bugs.md`](./docs/modules/bugs.md) — production bugs surfaced by audit (regen: `node plans/doc-audit-state/scripts/extract-bugs.mjs`)
- [`docs/modules/backlog.md`](./docs/modules/backlog.md) — cleanup + orphan-sweep worklist (regen: `node plans/doc-audit-state/scripts/extract-backlog.mjs`)

**Legacy reference** (pre-extraction docs, may be stale where ADRs disagree):
- `docs/engine/*` — narrative architecture docs from the engine extraction. Some still accurate; check JSDoc + ADRs first.
- `docs/gmt/*` — GMT-era reference. NOT authoritative for the engine.

After making code changes, update the affected JSDoc. If you make a load-bearing decision, write an ADR. Pre-audit docs (`docs/engine/*`, `docs/gmt/*`) are append-only reference; don't edit them retroactively.

### Architecture Decision Records (ADRs)

Architectural decisions live in [`docs/adr/`](./docs/adr/) as dated, append-only files. Each ADR captures Context / Decision / Consequences for one specific choice. **ADRs are write-once historical records** — to overturn one, write a new ADR superseding it; do not rewrite the original.

When making a load-bearing architectural decision (a contract, a fork pattern, an invariant that affects multiple subsystems), write an ADR before or alongside the implementation. Subsystem JSDoc references the relevant ADRs via `@see docs/adr/NNNN-*.md`.

The audit on 2026-05-20 produced ADRs 0001-0058 covering the full engine + engine-gmt + app-gmt surface. The legacy `docs/modules/` tree from the same audit has been collapsed: 5 policy docs migrated to [`docs/policy/`](./docs/policy/), 28 subsystem state docs hoisted into source-file JSDoc + ADRs (originals archived at [`docs/audit-2026-05-20/archive/`](./docs/audit-2026-05-20/archive/) for traceability), and 3 sibling-app overviews kept at `docs/modules/{fluid-toy,fractal-toy,mesh-export}/index.md` as light entry points. The audit's harvest worksheets at `plans/doc-audit-state/harvest/` show what each archived doc contributed to which ADR.

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
