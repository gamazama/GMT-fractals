# GMT - Claude Code Instructions

## Project Overview
**GMT (Fractal Explorer)** - Real-time 3D fractal renderer in the browser.
Stack: React 18 + TypeScript + Zustand + Vite + Three.js + GLSL shaders | Version 0.9.1 | License GPL-3.0

## Critical Rules

### Read Docs Before Coding (MANDATORY)
Before making ANY code changes, you MUST read the relevant documentation using the table below. Do NOT skip this — the docs contain architecture decisions, patterns, and constraints that are not obvious from code alone. Start with `docs/DOCS_INDEX.md` for the full index.

| Working on... | Read first |
|---------------|-----------|
| Engine, render loop, state | `docs/01_System_Architecture.md` |
| Raymarching, SDF, path tracing, accumulation | `docs/02_Rendering_Internals.md` |
| Modular graph builder, node-to-GLSL | `docs/03_Modular_System.md` |
| Animation, keyframes, timeline | `docs/04_Animation_Engine.md` |
| Video export, presets, GMF format | `docs/05_Data_and_Export.md` |
| Debugging, WebGL issues | `docs/06_Troubleshooting_and_Quirks.md` |
| Technical debt, refactoring | `docs/07_Code_Health.md` |
| File locations, project structure | `docs/08_File_Structure.md` |
| Shader composition, injection | `docs/archive/10_Shader_Architecture_Refactor.md` |
| Frag importer | `docs/21_Frag_Importer_Current_Status.md` (start here) |
| Formula conversion | `docs/22_Frag_to_Native_Formula_Conversion.md` |
| **Writing formulas**: full API, shader fields, params, GLSL built-ins, quirks | `docs/25_Formula_Dev_Reference.md` |
| Formula interlace system, preambleVars, mesh export interlace | `docs/24_Formula_Interlace_System.md` |
| V4 importer plan, per-iter emitter status, pipeline catalog | `docs/26_Formula_Workshop_V4_Plan.md` |
| Hybrid formula architecture: GMT vs Mandelbulber2/Fragmentarium/Fraktaler | `docs/research/hybrid-formula-architecture-comparison.md` |
| Mesh export tool, VDB writer, preview canvas, pipeline | `docs/30_Mesh_Export_Prototype.md` |

After making changes, update the relevant docs if you discovered new patterns, quirks, or undocumented behavior. Check `docs/06_Troubleshooting_and_Quirks.md` for known issues when debugging.

### TypeScript
- `tsconfig` has `isolatedModules: true` — type-only cross-module re-exports MUST use `export type { X }` and `import type { X }`, otherwise Vite/esbuild leaves the export in JS output causing runtime SyntaxError.

### Architecture Patterns
- **Engine-Bridge pattern**: React state NEVER directly drives the render loop. `EngineBridge.tsx` mediates between React (Zustand) and `engine/FractalEngine.ts`.
- **DDFS (Data-Driven Feature System)**: Features define their own state, UI params, and shader injection. Adding a feature does NOT require touching engine or UI core. See `store/createFeatureSlice.ts`, `components/AutoFeaturePanel.tsx`, `features/`.
- **TickRegistry** (`engine/TickRegistry.ts`): Phase-based tick orchestrator. Phases: `SNAPSHOT -> ANIMATE -> OVERLAY -> UI`. Don't bypass this with ad-hoc useFrame hooks.
- **Worker architecture**: Rendering runs on a Web Worker with OffscreenCanvas. `WorkerProxy` is worker-only. State goes to worker via RENDER_TICK messages, not direct engine calls.

### Key Files
| File | Role |
|------|------|
| `engine/FractalEngine.ts` | Main render loop orchestrator |
| `engine/ShaderFactory.ts` | GLSL generation from DDFS config |
| `engine/ShaderBuilder.ts` | Builder pattern for shader composition |
| `engine/MaterialController.ts` | Two-stage shader compilation, preview/full swap |
| `store/fractalStore.ts` | Main Zustand store |
| `components/AutoFeaturePanel.tsx` | Auto-generated UI from feature defs |
| `components/CompilableFeatureSection.tsx` | Reusable compile/runtime split UI (reads DDFS `panelConfig`) |
| `components/EngineBridge.tsx` | React <-> Engine mediator |
| `components/WorkerTickScene.tsx` | Worker frame loop + TickRegistry runner |

### Shader Conventions
- `uLightDir[i]` stores direction TOWARD LIGHT (negated at boundary in UniformManager). Shaders use directly for NdotL/shadows — no per-consumer negation needed.
- Features with `engineConfig.toggleParam` are conditionally compiled; `mode: 'compile'` = full rebuild, `'runtime'` = uniform toggle
- Two-stage compilation: preview shader (<1s) renders while full shader compiles async. Generation counter cancels stale compiles.

### What NOT to Do
- Don't bind React state directly in render loops — use the bridge pattern
- Don't create manual Zustand slices for features — use DDFS
- Don't use `engine.renderer` or `engine.pipeline` checks in worker mode — they're null. Use `engine.isBooted` or shadow state.
- Test suite coverage is partial — be careful with refactors, test manually alongside the automated checks below

### Automated checks
- `npm run test:frag` — frag importer suite (64/64 passing)
- `npm run test:baseline` — every native formula compiles with all features off (~8s, 42/42 passing). Baseline compile regression check.
- `npm run test:hybrid` / `test:hybrid-adv` — every native formula + hybrid box (standard / interleaved) (~12s each, 42/42 passing). Run after hybrid-box or geometry-feature changes.
- `npm run test:interlace` — native-formula interlace sweep (1600 primary × secondary pairs, ~100s, 1600/1600 passing). Run after changes to the interlace rewriter, feature uniform declarations, or any formula's `preamble` / `loopInit` / `preambleVars`.
- `npm run test:shader` — all compile checks in sequence (~2.5 min). Use before pushing engine changes.
- `npm run test:render` — **full-engine render sweep**. Boots the real `FractalEngine` + Three.js in headless Chromium, renders each formula through the full pipeline, captures PNG thumbnails. Requires `npm run dev` running in another terminal (served at `/render-harness.html`). Baseline only for now (42 cases, ~3-5 min); hybrid/interlace modes wired but commented pending param-preset work.
- `npm run test:render:matrix` — regenerates an HTML grid view of the last render sweep at `debug/render-matrix-phase1.html`.
- `npm run catalog:build` — regenerates `public/formulas/v3-v4-catalog.json` from the latest V3/V4 harness snapshots (`debug/v3-honest-snapshot.jsonl`, `debug/v4-honest-snapshot.jsonl`). Run after adding formulas to the library or making V3/V4 pipeline changes that might flip a formula's pass/fail status. Workshop library UI uses this catalog to auto-pick the right pipeline per formula and filter unrenderable entries.
- See [docs/27_Shader_Testing_Suite.md](docs/27_Shader_Testing_Suite.md) for full details.

## Formulas & File I/O
- 42 formula files in `formulas/` (.ts with embedded GLSL)
- GMF format files in `public/gmf/` (formula library)
- **GMF is the primary save format** — all scenes save as `.gmf` (formula shader + full scene state). JSON is load-only for backward compat. PNG snapshots embed GMF in metadata. See `docs/05_Data_and_Export.md`.
- Key functions: `saveGMFScene()` / `loadGMFScene()` in `utils/FormulaFormat.ts`

## Build & Run
```bash
npm run dev      # Dev server
npm run build    # Production build
```
