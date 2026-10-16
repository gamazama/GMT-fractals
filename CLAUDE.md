# gmt-engine — Claude Code Instructions

## Project Overview
**gmt-engine** — a generic application engine providing DDFS (Data-Driven Feature System), animation, UI, save/load, shortcuts, undo, and plugin seams. Apps (`app-gmt`, `fluid-toy`, `fractal-toy`, future prototypes) install features and core plugins on top of it.

Stack: React 18 + TypeScript + Zustand + Vite + optional GLSL | Forked from GMT 0.9.2 | Status: pre-1.0 architecture stabilisation

**Working directory.** `h:/GMT/workspace-gmt/stable/` is THE working tree, on `main`, and the production checkout: Cloudflare Pages deploys app.gmt-fractals.com on push. The `dev` branch exists only for the `/dev` preview deploy.

`docs/DOCS_INDEX.md` is the table of contents.

## Critical Rules

### Documentation

**Authority.** Code beats docs about code. Where sources disagree, authority runs: source JSDoc + markers, then [`.claude/rules/`](./.claude/rules/) (path-scoped; each loads when you open a matching file and carries the entry point, ADRs and guard commands for its area), then ADRs in [`docs/adr/`](./docs/adr/) (why a choice was made), then [`docs/policy/`](./docs/policy/) (rules spanning many files). `docs/history/**` is the pre-extraction attic: possibly stale, never authoritative.

**Markers** — written at the source site, not in external markdown:

- `@invariant <text> — proven by: <command>` — load-bearing contract, with the command that fails if it breaks. Don't break one without a superseding ADR. No command to name → write `@assumption`.
- `@assumption <text>` — a contract believed but not proven.
- `@bug PRODUCTION: <text>` — known production issue; `grep -r '@bug'` is the only bug tracker.
- `@see docs/adr/NNNN-*.md` — link from code to a decision.
- `@stale <text>` — known wrong, awaiting refresh.
- `@deprecated <text>` — on the way out, replacement noted.

Remove a `@stale`, `@bug` or `@invariant` when your work resolves it.

**Where things go:**
- Contracts and "watch out" notes → JSDoc on the source file, never a new markdown file. Factories, registries and shared primitives carry top-of-file JSDoc: purpose, integration seams, pitfalls. Keep JSDoc true to the code you change.
- A decision with rationale → a new ADR in `docs/adr/`, linked from source with `@see`. ADRs are append-only (a hook asks before an edit deletes text): to overturn one, write a new ADR and mark the old one `Status: Superseded by ADR-NNNN`; when a rename invalidates a symbol or path one cites, prepend `> **Update YYYY-MM-DD (...; decision unchanged):** ...` under its heading.
- Policy spanning many files → an existing doc in `docs/policy/`.
- Cite grep targets (`grep DOUBLE_RUN_WINDOW_MS`), not line numbers, in ADRs and JSDoc.
- After editing a rule's `paths:` or Guards block, run `npm run check:rule-guards`.

### Architecture Rules
- **Features are isolated.** A feature's state lives at `store[featureId]`; reading another feature's state requires `dependsOn: ['otherId']` in the feature def. A convention, not a runtime guarantee: `dependsOn` drives registration order and a register-time existence check, and nothing intercepts an undeclared read.
- **Intra-feature coordination uses bridges or derived values.** No store reach-through; never reach from feature A's setter into feature B's state.
- **UI primitives are pure.** `components/ui/**` has zero store imports (a PreToolUse hook enforces it); capabilities arrive via props or opt-in React context. The rest of `components/` is store-aware by design.
- **The render loop is app-owned.** Engine provides `TickRegistry` phases; the app (or the `@engine/render-loop` core plugin) calls `runTicks(deltaSec)` each frame.
- **Feature registry is frozen at store construction.** All `featureRegistry.register()` calls happen before `createEngineStore()`; late registration throws in dev, no-ops in prod.
- **Duplicate feature IDs are forbidden.** Re-registering the same def object is a no-op; a different def under an existing id throws `DuplicateFeatureError` in a production build but only warns and replaces in dev.
- **Every DDFS param is animatable and undoable by construction.** Keyframes, undo and preset round-trip need no per-feature wiring.

### What NOT to Do
- Don't add manual Zustand slices for feature state — use `defineFeature`.
- Don't depend on `set${Feature}` by name-inference in animation — the engine auto-binds via the registry; a custom binder is `binderRegistry.register()`ed explicitly.

## Engine Principles

### Goals
1. **One engine, many apps.** GMT, fluid-toy, fractal-toy and any future visual-compute app share the engine without carrying a fork.
2. **GMT runs identically to its pre-extraction state**, composed entirely from engine pieces. GMT-specific divergence lives in `engine-gmt/` (a plugin library), not in escape hatches inside engine-core.
3. **Engine internals stay domain-agnostic.** No fractal language in `engine/**`, `components/**`, `store/**`.
4. **The manifest grows to express what GMT needs**, generically: every pattern GMT uses becomes a primitive other apps can pick up.

### Strategies
1. **Genericize, don't fork.** When GMT needs something the engine can't express, extend the engine in a way another app could use, then express GMT's case through it (the PanelManifest `items` model is the example).
2. **Plugin seams over hardcoded paths.** Resolvers, registries and event buses keep engine-core decoupled from any app's data sources.
3. **Manifest-composed UI.** Layout lives in the manifest, not in hand-written panel components. Don't `component: 'panel-X'` around a manifest gap — extend the manifest (a new item type or prop).
4. **Verbatim ports for self-contained widgets** (FormulaSelect, AudioSpectrum, FlowEditor, EnginePanel): path rewrites, register in `componentRegistry`, reference from the manifest. Don't rewrite the internals.
5. **One source of truth for shared resources** (component CSS, formula presets, scene fields, modulation events, panel registrations, plugin installs): one module registers, many consume; never copy-paste across entries.

### Anti-Patterns to Avoid
1, 6 and 7 are enforced by `check:steering` and its after-edit hook.

1. **No app-specific names in engine-core.** No `if (formula === 'Mandelbulb')`, no `state.geometry?.juliaX`, no GMT-specific Transaction shapes — use predicates, resolvers, declaration-merging.
2. **Don't bypass the event bus to talk to the worker.** `engine.setUniform` on the engine-core stub is a no-op; go through `FRACTAL_EVENTS`.
3. **Don't override engine-core actions in app slices.** Engine-core's `undoStack` is the one history; extend it or register a feature-level extension point.
4. **No flag for "the GMT case", and no bug fix by flag.** Scope via a registered handler, `interactionConfig` or `engineConfig.toggleParam`, or extend a predicate (`selectMovementLock`).
5. **Delete vestigial feature fields** (`tabConfig.dock`, `defaultActive`, `aggregatesFrom`) as you go.
6. **Don't ship `// TODO port from GMT`.** Port it, stub it with `console.info('[gmt] X pending port')`, or remove the entry point.
7. **No `as any` without a comment saying why** (type-grafts between the engine-core stub and engine-gmt are the legitimate case).

### Automated Checks
A SessionStart hook prints the checkout's live state; trust it over notes.

- `npm run typecheck` — tsc, exits 0; pre-commit runs it on staged TS. It also rejects a type re-export without `export type` (TS1205).
- `npm run build` — the production build the deploy runs; a type-clean tree can still fail here.
- `npm run check:rule-guards` — every guard a rule cites can reach the files that rule scopes (reports, does not gate).
- `npm run check:text-bytes` — no NUL or stray control byte in tracked text (one NUL hides a file from grep).
- `npm run check:zindex` — fails on a new raw z-index ≥ 100 outside the tier scale (`<Layer tier>` / `z('tier')`).
- `npm run check:steering` — ratchet on anti-patterns 1, 6, 7 and engine-core app-folder imports.
- `npm run orphans` — knip. Run before deleting "unused" code; grep gives false positives because engine-core and engine-gmt expose same-named siblings.
- `npm run smoke:boot` — headless Chromium boot, fails on pageerrors.
- `npm run smoke:interact` — state flow + preset round-trip (demo feature).
- `npm run smoke:chrome` — clicks every top-bar control and menu item in every app; the only smoke that opens panels.
- `npm run smoke:screenshot` — a capture with no assertion → `debug/scratch/engine-boot.png`.
- `npm run context:cost -- <subsystem|tier|path|app:name>` — if unsure which files matter for an area. The map is a git-ignored cache it rebuilds when stale; never commit it.

### How work is closed
- The default for a change is no new smoke, test or step: try it once and say what it showed. Write one only for a seam nothing cheaper sees (a real GPU, a panel opening, storage across a reload, the boot), on new ground, whose break nobody would notice at once.
- A change is recorded once, in its commit message. An ADR only when a decision was made.
- A flyable build goes to the owner first; his first minutes using it are the gate.
- A question left for the owner goes in `plans/OWNER-CALLS.md`, one line; delete the line when he answers.
- "Finish up" means stop, commit and report — no extra measurements or studies.

## Build & Run
```bash
npm run dev      # Vite on localhost:3400
npm run build    # Production build
```
