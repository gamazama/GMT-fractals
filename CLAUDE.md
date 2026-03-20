# GMT - Claude Code Instructions

## Project Overview
**GMT (Fractal Explorer)** - Real-time 3D fractal renderer in the browser.
Stack: React 18 + TypeScript + Zustand + Vite + Three.js + GLSL shaders | Version 0.9.0 | License GPL-3.0

## Critical Rules

### Read Docs Before Coding (MANDATORY)
Before making ANY code changes, you MUST read the relevant documentation using the table below. Do NOT skip this — the docs contain architecture decisions, patterns, and constraints that are not obvious from code alone. Start with `docs/DOCS_INDEX.md` for the full index.

| Working on... | Read first |
|---------------|-----------|
| Engine, render loop, state | `docs/01_System_Architecture.md` |
| Raymarching, SDF, path tracing, accumulation | `docs/02_Rendering_Internals.md` |
| Feature system (DDFS), adding features | `docs/03_Modular_System.md` |
| Animation, keyframes, timeline | `docs/04_Animation_Engine.md` |
| Video export, presets, GMF format | `docs/05_Data_and_Export.md` |
| Debugging, WebGL issues | `docs/06_Troubleshooting_and_Quirks.md` |
| Technical debt, refactoring | `docs/07_Code_Health.md` |
| File locations, project structure | `docs/08_File_Structure.md` |
| Shader composition, injection | `docs/archive/10_Shader_Architecture_Refactor.md` |
| Frag importer | `docs/21_Frag_Importer_Current_Status.md` (start here) |
| Formula conversion | `docs/22_Frag_to_Native_Formula_Conversion.md` |

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
- No test suite exists yet — be careful with refactors, test manually

## Formulas & File I/O
- 30 formula files in `formulas/` (.ts with embedded GLSL)
- GMF format files in `public/gmf/` (formula library)
- Frag importer test suite: `npx tsx debug/test-frag-importer.mts` (40/40 passing)
- **GMF is the primary save format** — all scenes save as `.gmf` (formula shader + full scene state). JSON is load-only for backward compat. PNG snapshots embed GMF in metadata. See `docs/05_Data_and_Export.md`.
- Key functions: `saveGMFScene()` / `loadGMFScene()` in `utils/FormulaFormat.ts`

## Build & Run
```bash
npm run dev      # Dev server
npm run build    # Production build
```
