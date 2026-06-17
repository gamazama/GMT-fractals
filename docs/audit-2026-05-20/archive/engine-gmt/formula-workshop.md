---
source: engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx
lines: 1434
last_verified_sha: 05c4f82fd852a2e70bf80727dce2c3cf6a8ee230
additional_sources:
  - engine-gmt/features/fragmentarium_import/index.ts
  - engine-gmt/features/fragmentarium_import/types.ts
  - engine-gmt/features/fragmentarium_import/v3/compat.ts
  - engine-gmt/features/fragmentarium_import/v3/types.ts
  - engine-gmt/features/fragmentarium_import/v4/index.ts
  - engine-gmt/features/fragmentarium_import/v4/types.ts
  - engine-gmt/features/fragmentarium_import/formula-library.ts
  - engine-gmt/features/fragmentarium_import/workshop/param-builder.ts
  - engine-gmt/features/fragmentarium_import/workshop/variable-detector.ts
  - engine-gmt/features/fragmentarium_import/parsers/dec-preprocessor.ts
  - engine-gmt/types/fractal.ts
audited: 2026-05-20T15:00:42Z
audited_by: claude-opus-4-7
public_api:
  - FormulaWorkshop
  - detectFormulaV3
  - transformFormulaV3
  - analyzeSource
  - generateFormula
  - processFormula
  - ingest
  - preprocess
  - analyze
  - emit
  - buildWorkshopParams
  - buildFractalParams
  - filterDeadParams
  - loadLibrary
  - getRecommendedPipeline
  - getFormulaCompat
  - detectVariables
  - promoteVariable
  - preprocessDEC
depends_on:
  - g03-formula-registry
  - g02-shader-pipeline
  - g08-save-load-gmf
  - g05-engine-gmt-features
---

# Formula Workshop — Fragmentarium .frag/.dec importer (V3 + V4 pipelines)

The Formula Workshop is a guided, split-screen UI (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:408`) that ingests GLSL iteration formulas from any source — Fragmentarium `.frag` files, DEC (`.dec`) macros, Shadertoy DE snippets, hand-written GLSL — and registers them as runtime `FractalDefinition` entries (`engine-gmt/types/fractal.ts:103`). It owns two parallel transform pipelines: **V3** (legacy, V2-compat adapter, per-iteration extraction that composes with engine features like interlace / hybrid fold) and **V4** (canonical, self-contained-SDE emission, simpler shape but no engine-feature composition). The pipeline used per-formula is auto-picked from a bakeoff catalog (`engine-gmt/features/fragmentarium_import/formula-library.ts:255`), with manual override in the Workshop footer.

The subsystem also owns the **`importSource` lifecycle** (`engine-gmt/types/fractal.ts:103-118`) — a block stamped onto every imported `FractalDefinition` holding `glsl`, `selectedFunction`, `loopMode`, `mappings` so the formula can be re-opened in the Workshop later. q-105 confirmed this lifecycle was previously orphaned: `g05-engine-gmt-features` explicitly disclaims ownership of `fragmentarium_import` (it is not a registered DDFS feature), and no Workshop subsystem existed before this audit.

## Public API

| Symbol | File:Line | Role |
|---|---|---|
| `FormulaWorkshop` | `engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:408` | React component — split-screen Workshop UI |
| `detectFormulaV3` | `engine-gmt/features/fragmentarium_import/v3/compat.ts:44` | V3 detection → V2-shaped `WorkshopDetection` |
| `transformFormulaV3` | `engine-gmt/features/fragmentarium_import/v3/compat.ts:188` | V3 generation → V2-shaped `TransformedFormulaV2` |
| `analyzeSource` | `engine-gmt/features/fragmentarium_import/v3/analyze/index.ts:23` | V3 raw-text → `FormulaAnalysis` |
| `generateFormula` | `engine-gmt/features/fragmentarium_import/v3/generate/index.ts:186` | V3 analysis → `GeneratedFormula` |
| `processFormula` | `engine-gmt/features/fragmentarium_import/v4/index.ts:39` | V4 single-shot entry: ingest → preprocess → analyze → emit |
| `ingest` / `preprocess` / `analyze` / `emit` | `engine-gmt/features/fragmentarium_import/v4/ingest/index.ts:35`, `engine-gmt/features/fragmentarium_import/v4/preprocess/index.ts:22`, `engine-gmt/features/fragmentarium_import/v4/analyze/index.ts:232`, `engine-gmt/features/fragmentarium_import/v4/emit/index.ts:50` | V4 per-stage entry points |
| `buildWorkshopParams` / `buildFractalParams` / `filterDeadParams` | `engine-gmt/features/fragmentarium_import/workshop/param-builder.ts:209,320,527` | Shared param-table builders (used by both V3 + V4 emit) |
| `loadLibrary` / `getRecommendedPipeline` / `getFormulaCompat` | `engine-gmt/features/fragmentarium_import/formula-library.ts:82,255,249` | Manifest fetch + V3/V4 bakeoff lookup |
| `detectVariables` / `promoteVariable` | `engine-gmt/features/fragmentarium_import/workshop/variable-detector.ts:167,764` | "Detect Variables" mode — surface hardcoded constants as candidate uniforms |
| `preprocessDEC` | `engine-gmt/features/fragmentarium_import/parsers/dec-preprocessor.ts:665` | DEC (`.dec`) macro expansion → frag-shaped source |

The barrel re-exports the V3-facing subset only (`engine-gmt/features/fragmentarium_import/index.ts:15-23`); V4 internals are reached via the `v4/` subpath import as `v4ProcessFormula` (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:26`).

## Architecture

- **Split-screen UI.** The `FormulaWorkshop` panel renders as a fixed-width left rail (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:962-987`) while the live viewport remains visible on the right; the Workshop calls `setFormula(PREVIEW_ID)` (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:868,878`) so the viewport re-compiles the imported formula on every Preview, restored to the pre-Workshop selection on close (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:886-891`).
- **Two parallel pipelines.** Pipeline selector state is `'auto' | 'v3' | 'v4'` (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:437`); the effective pipeline is resolved via the catalog (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:461-470`), defaulting to V4 when the formula ID is unknown (custom paste).
- **V3 = compat adapter.** `detectFormulaV3` runs DEC preprocessing first (`engine-gmt/features/fragmentarium_import/v3/compat.ts:50-54`) then `analyzeSource` → `FormulaAnalysis` → V2-shaped `WorkshopDetection` so the existing Workshop UI fields (slot mapping table, function picker, loop-mode toggle) stay unchanged. `transformFormulaV3` then re-runs analysis and calls `generateFormula` to produce `TransformedFormulaV2` for shader emission (`engine-gmt/features/fragmentarium_import/v3/compat.ts:188-217`). The compat layer is marked "Temporary — will be removed when the Workshop reads V3 types directly" (`engine-gmt/features/fragmentarium_import/v3/compat.ts:8`).
- **V3 generate emits per-iteration shape.** Output is `{ function, uniforms, loopBody, getDist?, loopInit?, warnings }` (`engine-gmt/features/fragmentarium_import/v3/types.ts:116-124`), with `mode: 'per-iteration' | 'full-de'`. The per-iteration mode is what composes with engine features (interlace, hybrid fold, burning-ship rewrites).
- **V4 = unified types end-to-end.** Single `Result<T>` sum type (`engine-gmt/features/fragmentarium_import/v4/types.ts:18-21`), one `RawSource → PreprocessedSource → FormulaAnalysis → GeneratedFormula` chain (`engine-gmt/features/fragmentarium_import/v4/types.ts:43-150`). No V2 compat; emits a complete `FractalDefinition` with `selfContainedSDE: true` plus internal `slotAssignments` (`engine-gmt/features/fragmentarium_import/v4/types.ts:144-151`).
- **V4 ingest classifies render model.** `RawSource.renderModel` is `'de3d' | 'unsupported'` (`engine-gmt/features/fragmentarium_import/v4/types.ts:50-55`); unsupported includes (2D, progressive, brute-force-no-DE) short-circuit with a structured `Rejection` (`engine-gmt/features/fragmentarium_import/v4/types.ts:22-41`).
- **V4 preprocess inlines includes and extracts annotations.** `PreprocessedSource` carries resolved GLSL plus structured `ParamAnnotation[]` and a presets `Map` (`engine-gmt/features/fragmentarium_import/v4/types.ts:59-86`), populated by `v4/preprocess/annotations.ts`, `v4/preprocess/includes.ts`, `v4/preprocess/presets.ts`, `v4/preprocess/strip.ts`.
- **Shared parsers.** `parsers/builtins.ts`, `parsers/preprocessor.ts`, `parsers/dec-detector.ts`, `parsers/dec-preprocessor.ts` (`engine-gmt/features/fragmentarium_import/parsers/dec-preprocessor.ts:665`) — V3 invokes DEC preprocessing from `engine-gmt/features/fragmentarium_import/v3/compat.ts:50` (lines 50-54); V4 invokes its own variant from `engine-gmt/features/fragmentarium_import/v4/ingest/dec.ts`.
- **Workshop param-builder.** `param-builder.ts` defines the slot taxonomy (`SCALAR_SLOTS`, `VEC2_SLOTS`, `VEC3_SLOTS`, `VEC4_SLOTS` at `engine-gmt/features/fragmentarium_import/workshop/param-builder.ts:9-12`), the swizzle-component slots (`engine-gmt/features/fragmentarium_import/workshop/param-builder.ts:16-22`), occupancy/conflict checks (`engine-gmt/features/fragmentarium_import/workshop/param-builder.ts:61-101`), and the central `buildFractalParams` that produces the `FractalParameter[]` + `defaultPreset` consumed by the registry (`engine-gmt/features/fragmentarium_import/workshop/param-builder.ts:320`). Both V3 and V4 emit reuse it for preset-shape compatibility.
- **Variable detector.** `workshop/variable-detector.ts` scans the source for hardcoded numeric literals inside the selected DE function and surfaces them as candidate uniforms via `detectVariables` (`engine-gmt/features/fragmentarium_import/workshop/variable-detector.ts:167`); user-promoted constants become real `uniform` declarations via `promoteVariable` (`engine-gmt/features/fragmentarium_import/workshop/variable-detector.ts:764`).
- **Formula library.** Manifest-based browse: `loadLibrary` fetches `./formulas/manifest.json`, `./formulas/dec.json`, and (best-effort) `./formulas/v3-v4-catalog.json` (`engine-gmt/features/fragmentarium_import/formula-library.ts:82-131`). Synchronous query API once loaded — `getCategories`, `getFolders`, `getFormulasByCategory`, `getFormulasByFolder`, `pickRandom`, `searchFormulas` (`engine-gmt/features/fragmentarium_import/formula-library.ts:172-240`).
- **Catalog-driven auto-pick.** `getRecommendedPipeline(id)` returns `'v3' | 'v4' | 'none'` from the bakeoff JSON, defaulting to `'v4'` when the catalog is missing or unknown (`engine-gmt/features/fragmentarium_import/formula-library.ts:255-257`). The dice predicate filters out `recommended === 'none'` entries unless the user opts into "show broken" (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:569-573`).
- **Registration path.** Both pipelines converge on `registry.register(def)` + `FractalEvents.emit(FRACTAL_EVENTS.REGISTER_FORMULA, { id, shader })` (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:837-838,853-854`). The V3 path stamps `importSource` (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:835,943-948`); the V4 path lets `processFormula` produce a complete definition (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:850-855`).
- **Re-edit lifecycle.** When `editFormula` prop is set, the Workshop reads `registry.get(id)?.importSource` and rehydrates state from `glsl`, `selectedFunction`, `loopMode`, `mappings` (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:542-555`). This is the round-trip the q-105 followup identified as previously undocumented.

## Invariants

- **`importSource` is the V3 round-trip contract.** Imports through V3 set `importSource = { glsl, selectedFunction, loopMode, mappings }` (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:943-948`). V4 imports omit it — re-editing a V4 formula is not currently supported because V4 doesn't expose a per-param mapping UI (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:898-910`).
- **Preview ID is reserved.** `PREVIEW_ID = 'frag_workshop_preview'` (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:28`) is registered on every Preview and replaced (not orphaned) on close — the Workshop tracks the previous formula in `previousFormulaRef` and restores it (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:886-891`).
- **Pipeline default is V4.** When the catalog is absent or the formula ID is unknown, `getRecommendedPipeline` returns `'v4'` (`engine-gmt/features/fragmentarium_import/formula-library.ts:256`); the Workshop falls back to V4 for custom-pasted GLSL (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:463-468`).
- **V3 detect doesn't block on parse failure when V4 will handle it.** The detect step pre-populates the slot-mapping UI only; if V4 is the effective pipeline, detect failure is silently swallowed and the user can still Preview/Import via V4 (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:515-531`).
- **Slot uniqueness is enforced at Import (V3 only).** Per-component overlap checks run via `getSlotOccupancy` against `valOccupancy` before transform (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:912-933`). V4 skips this entirely — slot assignment is internal to `processFormula`.
- **Formula names are sanitized to valid GLSL identifiers.** `rawName.replace(/[^a-zA-Z0-9_]/g, '')` (`engine-gmt/features/fragmentarium_import/v3/compat.ts:125`) — the formula name doubles as the emitted function name.
- **Library load is idempotent.** `loadLibrary()` caches the promise; `isLibraryLoaded()` is the synchronous check (`engine-gmt/features/fragmentarium_import/formula-library.ts:82-86,135`).

## Interactions with other subsystems

| Subsystem | Direction | Nature |
|---|---|---|
| `g05-engine-gmt-features` | explicit disclaim | `fragmentarium_import` is NOT a registered DDFS feature; this subsystem owns the subtree per q-105. |
| `g03-formula-registry` | produces | Workshop calls `registry.register(def)` + emits `FRACTAL_EVENTS.REGISTER_FORMULA` for both Preview + Import (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:837-838,853-854`). |
| `g02-shader-pipeline` | produces | V3/V4 emit produce GLSL that flows through the standard MaterialController compile path; V4 sets `selfContainedSDE: true`. |
| `g08-save-load-gmf` | round-trip | GMF persistence serialises the `importSource` block (`engine-gmt/types/fractal.ts:103-118`) so imported formulas survive save/load. |
| engine-store / app components | consumes | `useEngineStore` + cross-tier UI primitives `CategoryPickerMenu`, `GlslEditor` from `../../../components/` (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:13,18,19`). |

## File catalog

### Workshop UI + barrel + library

| File | Lines | Purpose |
|---|---:|---|
| `engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx` | 1434 | Split-screen Workshop UI; orchestrates V3 + V4, owns `importSource` lifecycle. |
| `engine-gmt/features/fragmentarium_import/index.ts` | 24 | Barrel: re-exports V3 entry, types, Workshop component, shared param builders. |
| `engine-gmt/features/fragmentarium_import/types.ts` | 150 | V2-shape compat types (FragUniform, WorkshopDetection, WorkshopParam, TransformedFormulaV2). |
| `engine-gmt/features/fragmentarium_import/formula-library.ts` | 257 | Manifest fetch + browse API + V3/V4 bakeoff catalog lookup. |
| `engine-gmt/features/fragmentarium_import/passing-formulas.ts` | 538 | Static allow-list — formulas known to render under V3 (regression baseline). |
| `engine-gmt/features/fragmentarium_import/random-formulas.ts` | 1718 | Static curated set for the "dice" feature. |

### V3 pipeline

| File | Lines | Purpose |
|---|---:|---|
| `engine-gmt/features/fragmentarium_import/v3/compat.ts` | 255 | V3 ↔ V2 adapter: `detectFormulaV3`, `transformFormulaV3`, type converters. |
| `engine-gmt/features/fragmentarium_import/v3/types.ts` | 137 | V3 unified types: `ImportedParam`, `FormulaAnalysis`, `GeneratedFormula`, `Result<T>`. |
| `engine-gmt/features/fragmentarium_import/v3/analyze/index.ts` | 99 | V3 analyze stage entry — `analyzeSource()`. |
| `engine-gmt/features/fragmentarium_import/v3/analyze/preprocess.ts` | 199 | Strips frag directives, normalises whitespace before analysis. |
| `engine-gmt/features/fragmentarium_import/v3/analyze/functions.ts` | 263 | Function extraction + DE detection heuristics. |
| `engine-gmt/features/fragmentarium_import/v3/analyze/params.ts` | 232 | Parses `uniform … slider[…]` annotations into `ImportedParam`. |
| `engine-gmt/features/fragmentarium_import/v3/analyze/init.ts` | 145 | `void init()` body analysis — splits statements by `once` vs `per-pixel`. |
| `engine-gmt/features/fragmentarium_import/v3/analyze/globals.ts` | 84 | Classifies top-level globals (computed / uninitialised / literal-init). |
| `engine-gmt/features/fragmentarium_import/v3/generate/index.ts` | 602 | V3 emit entry — `generateFormula()`. |
| `engine-gmt/features/fragmentarium_import/v3/generate/full-de.ts` | 243 | Full-DE emission path (single-call mode). |
| `engine-gmt/features/fragmentarium_import/v3/generate/get-dist.ts` | 158 | `getDist` shader-block emitter. |
| `engine-gmt/features/fragmentarium_import/v3/generate/init.ts` | 188 | Emits init statements into preamble / loopInit. |
| `engine-gmt/features/fragmentarium_import/v3/generate/loop-body.ts` | 99 | Per-iteration loop-body emitter. |
| `engine-gmt/features/fragmentarium_import/v3/generate/patterns.ts` | 427 | Recognises canonical fractal patterns (Mandelbox-like, sphere fold, etc.) for cleaner emission. |
| `engine-gmt/features/fragmentarium_import/v3/generate/rename.ts` | 213 | Variable / parameter renaming for emitted GLSL. |
| `engine-gmt/features/fragmentarium_import/v3/generate/slots.ts` | 157 | `autoAssignSlots` — heuristic mapping of `ImportedParam` → engine slots. |
| `engine-gmt/features/fragmentarium_import/v3/generate/uniforms.ts` | 75 | Emits final uniform declaration block. |

### V4 pipeline

| File | Lines | Purpose |
|---|---:|---|
| `engine-gmt/features/fragmentarium_import/v4/index.ts` | 68 | V4 single-shot entry — `processFormula()`. |
| `engine-gmt/features/fragmentarium_import/v4/types.ts` | 151 | V4 unified types: `Result<T>`, `RawSource`, `PreprocessedSource`, `FormulaAnalysis`, `GeneratedFormula`. |
| `engine-gmt/features/fragmentarium_import/v4/ingest/index.ts` | 47 | Format dispatch + render-model classification. |
| `engine-gmt/features/fragmentarium_import/v4/ingest/frag.ts` | 146 | `.frag` ingest (includes inspection for unsupported render models). |
| `engine-gmt/features/fragmentarium_import/v4/ingest/dec.ts` | 61 | `.dec` ingest. |
| `engine-gmt/features/fragmentarium_import/v4/ingest/plain-glsl.ts` | 26 | Bare-GLSL ingest. |
| `engine-gmt/features/fragmentarium_import/v4/preprocess/index.ts` | 77 | Preprocess stage entry — `preprocess()`. |
| `engine-gmt/features/fragmentarium_import/v4/preprocess/annotations.ts` | 243 | Extracts `uniform … slider[…]` / `checkbox[…]` / `color[…]` annotations. |
| `engine-gmt/features/fragmentarium_import/v4/preprocess/includes.ts` | 80 | Resolves `#include` directives against bundled libs. |
| `engine-gmt/features/fragmentarium_import/v4/preprocess/presets.ts` | 89 | Parses `#preset Default … #endpreset` blocks. |
| `engine-gmt/features/fragmentarium_import/v4/preprocess/strip.ts` | 122 | Strips frag-specific directives (`#info`, `#group`, `#camera`, …). |
| `engine-gmt/features/fragmentarium_import/v4/analyze/index.ts` | 349 | Analyse stage — DE detection, helper catalog, globals classification. |
| `engine-gmt/features/fragmentarium_import/v4/emit/index.ts` | 353 | Emit stage entry — `emit()` + `emitSelfContained()`. |
| `engine-gmt/features/fragmentarium_import/v4/emit/parameters.ts` | 136 | Emits uniform declarations + default-preset values. |
| `engine-gmt/features/fragmentarium_import/v4/emit/per-iteration.ts` | 1049 | Per-iteration emission (largest single file in the subsystem; see V4 plan doc). |
| `engine-gmt/features/fragmentarium_import/v4/emit/rename.ts` | 148 | Identifier rewriting for emitted GLSL. |
| `engine-gmt/features/fragmentarium_import/v4/emit/slots.ts` | 127 | Slot-assignment policy (paramA..F, vec2A..C, vec3A..C, vec4A..C, builtin, ignore). |
| `engine-gmt/features/fragmentarium_import/v4/emit/wrapper.ts` | 96 | Wraps emitted DE in the engine's expected function signature. |

### Shared parsers + workshop utilities

| File | Lines | Purpose |
|---|---:|---|
| `engine-gmt/features/fragmentarium_import/parsers/builtins.ts` | 171 | Auto-injects `time`, `iGlobalTime`, `M_PI`, `Phi`, `TWO_PI`. |
| `engine-gmt/features/fragmentarium_import/parsers/preprocessor.ts` | 129 | Generic `#define` expansion. |
| `engine-gmt/features/fragmentarium_import/parsers/dec-detector.ts` | 190 | Heuristic DEC-format detection — `detectDECFormat`, `parseMacros`. |
| `engine-gmt/features/fragmentarium_import/parsers/dec-preprocessor.ts` | 750 | DEC macro expansion → frag-shaped source — `preprocessDEC`, `expandMacros`. |
| `engine-gmt/features/fragmentarium_import/transform/variable-renamer.ts` | 159 | Cross-pipeline variable renamer (collision avoidance). |
| `engine-gmt/features/fragmentarium_import/workshop/param-builder.ts` | 548 | Slot taxonomy, occupancy / conflict checks, `buildWorkshopParams`, `buildFractalParams`, `filterDeadParams`. |
| `engine-gmt/features/fragmentarium_import/workshop/variable-detector.ts` | 829 | "Detect Variables" — `detectVariables`, `promoteVariable` for hardcoded-constant promotion. |

## Known issues / Phase 2 carry-in

- **q-105 finding.** The `importSource` lifecycle (`engine-gmt/types/fractal.ts:103-118`) was previously orphaned. `g05-engine-gmt-features` survey explicitly disclaims `fragmentarium_import` at two distinct lines ("NOT a registered feature"; "entire subtree is the V3/V4 formula importer — separate doc-audit subsystem"). This module doc closes that gap.
- **V3 compat layer is marked temporary.** `engine-gmt/features/fragmentarium_import/v3/compat.ts:8` says "Temporary — will be removed when the Workshop reads V3 types directly." Until then, the Workshop UI is type-coupled to V2 shapes (`WorkshopDetection`, `WorkshopParam`, `TransformedFormulaV2`) even though analysis/generation runs through V3.
- **V4 import doesn't round-trip.** V4 path skips `importSource` (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:894-910`), so V4-imported formulas can't be re-opened in the Workshop. This is a known asymmetry — V4 also has no per-param mapping UI to round-trip into.
- **V4 plan is paused.** `docs/gmt/26_Formula_Workshop_V4_Plan.md:3-12` records the rewrite as paused pending architecture rethink (2026-04-17). V3 remains the practical default for formulas that need engine-feature composition (interlace, hybrid fold).
- **`per-iteration.ts` is 1049 lines.** The largest single file in the subsystem; the V4 plan flags it as the locus of further work (`docs/gmt/26_Formula_Workshop_V4_Plan.md:111`).

## Historical context

- [`docs/gmt/26_Formula_Workshop_V4_Plan.md`](../../gmt/26_Formula_Workshop_V4_Plan.md) — canonical design rationale for the V3 → V4 transition, the five-stage pipeline contract, and the honest bakeoff numbers (V3 216 passes / 46 with real GMT feature compat vs V4 360 passes / 0 per-iteration). Header notes "V3 status: Still active (default). V4 available behind `V4 pipeline (beta)` checkbox" (`docs/gmt/26_Formula_Workshop_V4_Plan.md:4`) — that checkbox is now the `pipelineMode` tri-state in the Workshop footer (`engine-gmt/features/fragmentarium_import/FormulaWorkshop.tsx:437`).
- [`docs/gmt/21_Frag_Importer_Current_Status.md`](../../gmt/21_Frag_Importer_Current_Status.md) — measured V3/V4 status matrix, harness reproduction commands, Workshop UI tour.
- [`docs/gmt/22_Frag_to_Native_Formula_Conversion.md`](../../gmt/22_Frag_to_Native_Formula_Conversion.md) — manual Fragmentarium → GMT-native conversion playbook (used when neither V3 nor V4 produces an acceptable import); cross-references the same `preambleVars` / `usesSharedRotation` contract used by V3 emit.
