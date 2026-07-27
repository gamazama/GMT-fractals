# gmt-engine — Claude Code Instructions

## Project Overview
**gmt-engine** — a generic application engine providing DDFS (Data-Driven Feature System), animation, UI, save/load, shortcuts, undo, and plugin seams. Apps (`app-gmt`, `fluid-toy`, `fractal-toy`, future prototypes) install features and core plugins on top of it.

Stack: React 18 + TypeScript + Zustand + Vite + optional GLSL | Forked from GMT 0.9.2 | Status: pre-1.0 architecture stabilisation

**Working directory.** This tree (`h:/GMT/workspace-gmt/stable/`) is THE working tree, on `main`. It is also the production checkout — it serves app.gmt-fractals.com via Cloudflare Pages, which auto-deploys on push. Work here directly. The old `h:/GMT/workspace-gmt/dev/` split was retired on 2026-06-17 and that directory no longer exists; the `dev` branch survives on GitHub for the `/dev` preview deploy only.

Two companion docs at the repo root:
- `HANDOFF.md` — session-by-session progress log, stage history, resume instructions.
- `README.md` — project overview (if/when public).

This file (`CLAUDE.md`) is forward-looking rules. `docs/DOCS_INDEX.md` is the authoritative table of contents.

## Critical Rules

### Documentation Conventions (READ FIRST)

**Navigation policy.** When investigating or modifying code, default to reading source files top-to-bottom and grepping for the annotation markers below. External docs (`docs/adr/`, `docs/policy/`) are reference-of-last-resort for context the code doesn't carry. **If you find yourself reading a doc that restates code, stop and read the code.** Empirically: two real test tasks (debugging a splash timeout, auditing the state-library factory) both completed via grep + source reading; external markdown contributed zero. The docs are sized for human onboarding/archaeology, not agent navigation.

**Greppable annotation markers** — these are the canonical doc layer agents consume. Add them at the source site, not in external markdown.

- `@invariant <text>` — load-bearing contract on a file or export. Future readers must not break it without writing a superseding ADR.
- `@bug PRODUCTION: <text>` — known production issue at this site. Discoverable by `grep -r '@bug'` — the canonical (and only) bug-tracking surface.
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
- **No new self-annotation drift.** If you write `@stale`, `@bug PRODUCTION:`, or `@invariant`, that's a commitment to keep it current. Removing the annotation when the underlying issue resolves is part of the work.
- **ADR drift from renames / refactors.** ADRs are append-only — don't rewrite the body. When a rename, file move, or refactor invalidates a symbol name, file path, or line reference cited in an existing ADR (but the underlying decision still stands), prepend a `> **Update YYYY-MM-DD (...; decision unchanged):** ...` block under the heading that names the changed symbols and notes why the decision still applies. If the decision itself is superseded, write a new ADR and mark the old one `Status: Superseded by ADR-NNNN`.

### Read Docs Before Coding

The doc layers, in order of authority:

1. **Source files with JSDoc + greppable markers** — freshest, most-trusted layer. Default consumption path for agents.
2. **Path-scoped rules at [`.claude/rules/`](./.claude/rules/)** — load automatically when you open a matching source file. Entry point, ADRs and guard script for that subsystem. See below.
3. **ADRs at [`docs/adr/`](./docs/adr/)** — decisions with rationale. Dated, append-only. Cited from source via `@see docs/adr/NNNN-*.md`. Best for "why was this chosen" questions.
4. **Policy docs at [`docs/policy/`](./docs/policy/)** — cross-cutting rules (engine-fork-rules, ddfs-string-contract, etc.). Best for "what's the rule when X spans multiple files" questions.

Pre-audit narrative docs at `docs/history/engine/*` are pre-extraction reference. **Source JSDoc + ADRs take precedence** where they disagree — the audit on 2026-05-20 surfaced several drift cases (e.g. `runTicks(deltaMs)` in `01_Architecture.md` was wrong; correct is `runTicks(deltaSec)` per ADR-0002).

Per-subsystem guidance lives in **[`.claude/rules/`](./.claude/rules/)** — path-scoped rule files that load automatically when you open a matching source file. Each carries the JSDoc entry point, the governing ADRs, and the guard script (`npm run test:*` / `smoke:*`) for that area. You do not need to look them up: opening `engine/features/modulation/*` loads the modulation rule, opening `components/ui/*` loads the layers rule. To see the full set, `ls .claude/rules/`.

If your task is cross-cutting infrastructure — saved-state libraries, registries, factories, generic primitives, hotkey/toast/undo machinery — there may be no rule for it. Look under `engine/store/` (factories), `engine/plugins/` (slot hosts), `components/` (primitives) and grep for the relevant export name; the in-source JSDoc on factories should orient you.

**Legacy reference** (pre-extraction docs, may be stale where ADRs disagree):
- `docs/history/engine/*` — narrative architecture docs from the engine extraction. Some still accurate; check JSDoc + ADRs first.
- `docs/history/gmt/*` — GMT-era reference. NOT authoritative for the engine.

After making code changes, update the affected JSDoc. If you make a load-bearing decision, write an ADR. Pre-audit docs (`docs/history/engine/*`, `docs/history/gmt/*`) are append-only reference; don't edit them retroactively.

### Architecture Decision Records (ADRs)

Architectural decisions live in [`docs/adr/`](./docs/adr/) as dated, append-only files. Each ADR captures Context / Decision / Consequences for one specific choice. **ADRs are write-once historical records** — to overturn one, write a new ADR superseding it; do not rewrite the original.

When making a load-bearing architectural decision (a contract, a fork pattern, an invariant that affects multiple subsystems), write an ADR before or alongside the implementation. Subsystem JSDoc references the relevant ADRs via `@see docs/adr/NNNN-*.md`.

The audit on 2026-05-20 produced ADRs 0001-0058 covering the full engine + engine-gmt + app-gmt surface. The legacy `docs/modules/` tree from the same audit has been collapsed: 5 policy docs migrated to [`docs/policy/`](./docs/policy/), 28 subsystem state docs hoisted into source-file JSDoc + ADRs (originals archived at [`docs/history/audit-2026-05-20/archive/`](./docs/history/audit-2026-05-20/archive/) for traceability), and sibling-app overviews kept at `docs/modules/{fluid-toy,fractal-toy,gradient-explorer,mesh-export,palette}/index.md` as light entry points. The audit's harvest worksheets at `docs/history/doc-audit-state/harvest/` show what each archived doc contributed to which ADR.

### TypeScript
- `tsconfig` has `isolatedModules: true` — type-only cross-module re-exports MUST use `export type { X }` and `import type { X }`. Otherwise Vite/esbuild leaves the export in JS output → runtime SyntaxError.

### Architecture Rules
- **Features are isolated.** A feature's state lives at `store[featureId]`. Reading another feature's state requires declaring `dependsOn: ['otherId']` in the feature def. Undeclared access throws in dev, warns in prod. See `docs/history/engine/02_Feature_Registry.md`.
- **Intra-feature coordination uses bridges or derived values.** No ad-hoc store reach-through. See `docs/history/engine/09_Bridges_and_Derived.md`.
- **UI primitives are pure.** `components/ui/**` (Layer, Modal, FloatingPanel, AnchoredMenu and the stacking machinery) has zero store imports and a PreToolUse hook keeps it that way. Capabilities arrive via props or opt-in React context. Note this holds for `components/ui/**` specifically — the wider `components/` directory contains store-aware composed panels (AutoFeaturePanel, CompilableFeatureSection, and ~47 others) and that is not a violation. See `docs/history/engine/05_Shared_UI.md`.
- **The render loop is app-owned.** Engine provides `TickRegistry` phases; the app (or `@engine/render-loop` core plugin) calls `runTicks(dt)` each frame. See `docs/history/engine/01_Architecture.md`.
- **Feature registry is frozen at store construction.** Late registration throws in dev, no-ops in prod. All `featureRegistry.register()` calls must happen before `createEngineStore()` runs. See `docs/history/engine/03_Plugin_Contract.md`.
- **Duplicate feature IDs are forbidden.** The second registration throws immediately.
- **Every DDFS param is animatable and undoable by construction.** No per-feature wiring. If you add a param, keyframes + undo + preset round-trip all work automatically. See `docs/history/engine/08_Animation.md`.

### What NOT to Do
- Don't add manual Zustand slices for feature state — use `defineFeature`.
- Don't import the store from a UI primitive — use React context.
- Don't reach from feature A's setter into feature B's state — use a bridge.
- Don't depend on `set${Feature}` by name-inference in animation — the engine auto-binds via the registry. If you need a custom binder, `binderRegistry.register()` it explicitly.
- Don't write architecture decisions in changelog form. Update the relevant doc's "Decisions" section and link commits from the doc, not the other way around.
- Don't rewrite anything under `docs/history/**` — it is the pre-extraction attic. Appending is fine; a PreToolUse hook enforces this (`.claude/hooks/guard.mjs`) and will explain itself if you trip it.

## Engine Principles (Goals · Strategies · Anti-Patterns)

### Goals
1. **One engine, many apps.** GMT, fluid-toy, fractal-toy, and any future visual-compute app share the engine without carrying a fork. The engine is a generic application framework — DDFS, manifest-driven panels, plugin slots, animation, save/load, worker contract.
2. **GMT runs identically to its pre-extraction state**, but composed entirely from engine pieces. Divergence between GMT and engine-gmt belongs in `engine-gmt/` (a plugin library), not in GMT-shaped escape hatches inside engine-core.
3. **Engine internals stay domain-agnostic.** No fractal language in `engine/**`, `components/**`, `store/**`. App-specific behavior comes via plugin seams, registries, store augmentations.
4. **The manifest grows to express what GMT needs**, generically. Section headers, conditional sub-blocks, collapsibles, widget props — every pattern GMT uses becomes a generic primitive other apps can pick up.

### Strategies
1. **Genericize, don't fork.** When GMT needs something the engine can't express, extend the engine *in a way that another app could also use* — then express GMT's case through it. The PanelManifest `items` model is the canonical example; `setFormulaParamResolver` and `selectMovementLock`'s feature-driven `interactionConfig.blockCamera` are smaller ones.
2. **Plugin seams over hardcoded paths.** Resolvers, registries, event buses (`setFormulaPresetResolver`, `setFormulaParamResolver`, `featureRegistry.getMenuFeatures()`, `FRACTAL_EVENTS.UNIFORM`) keep engine-core decoupled from any specific app's data sources.
3. **Manifest-composed UI.** Panels are declarative compositions of features, widgets, sections, separators, collapsibles. Layout decisions live in the manifest — not in hand-written panel components. See `docs/history/engine/14_Panel_Manifest.md`.
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
- `npm run context:cost -- <subsystem|tier|path|app:name>` — **scope your source reading before you start.** Prints which files matter for an area, ordered cheapest-first, with token costs and heavy-file (read-in-sections) flags. Aligns with the navigation policy above: it tells you *which* source to grep/read, not docs to read instead. `npm run context:map` rebuilds the cost map; `npm run context:check` gates staleness. See [docs/policy/context-loading-protocol.md](docs/policy/context-loading-protocol.md).

## Build & Run
```bash
npm run dev      # Vite on localhost:3400
npm run build    # Production build
```
