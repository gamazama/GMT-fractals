---
source: engine-gmt/engine/FractalRegistry.ts
lines: 35
last_verified_sha: 84b024d55e23673ca337fef43dc70ece72469f70
additional_sources:
  - engine-gmt/engine/NodeRegistry.ts
  - engine-gmt/types/fractal.ts
  - engine-gmt/types/common.ts
  - engine-gmt/types/graph.ts
  - engine-gmt/types/index.ts
  - engine-gmt/formulas/index.ts
  - engine-gmt/formulas/categories.ts
  - engine-gmt/formulas/Mandelbulb.ts
  - engine-gmt/formulas/Modular.ts
  - engine-gmt/formulas/JuliaMorph.ts
  - engine-gmt/formulas/MandelTerrain.ts
  - engine-gmt/formulas/Claude.ts
  - engine-gmt/formulas/Apollonian.ts
  - engine-gmt/formulas/Coxeter.ts
  - docs/gmt/25_Formula_Dev_Reference.md
audited: 2026-05-20T09:29:49Z
audited_by: claude-opus-4-7
public_api:
  - registry
  - nodeRegistry
  - Formulas
  - FractalDefinition
  - FractalParameter
  - Preset
  - FormulaType
  - NodeType
  - NodeDefinition
  - NodeInput
  - GLSLContext
  - PipelineNode
  - GraphNode
  - GraphEdge
  - FractalGraph
  - PREDEFINED_CATEGORIES
depends_on:
  - g02-shader-pipeline
  - g09-modular-graph
  - e01-feature-system
---

# Formula registry (g03)

Whole-formula and modular-node registration substrate for the GMT engine fork. Holds 42 native fractal definitions + 5 legacy aliases, exposes a shared singleton (`registry`) consumed by the shader factory, the UI loading screen, the Workshop importer, and GMF save/load. A sibling `nodeRegistry` holds Modular-graph node definitions (registered from outside this subsystem at `engine-gmt/data/nodes/definitions.ts`, owned by g09-modular-graph).

This module captures the live API surface and runtime invariants. For the long-form authoring tutorial — execution-order diagram, GLSL built-in catalog, distance-estimator table, slot conventions, quirks (GLSL ES 3.0 const-initializer restriction, paramA/paramB double-wiring, Catalan-solid folds, self-contained-SDE coloring contract) — see `docs/gmt/25_Formula_Dev_Reference.md` (covered separately by the `minor-edits` disposition).

## Public API

### Fractal registry
- `FractalRegistry` class — singleton instance exported as `registry` (`engine-gmt/engine/FractalRegistry.ts:34`). Methods:
  - `register(def: FractalDefinition)` (`engine-gmt/engine/FractalRegistry.ts:7-9`) — stores by `def.id`. No membership check; replacement is silent.
  - `registerAlias(alias: string, targetId: string)` (`engine-gmt/engine/FractalRegistry.ts:11-18`) — points an alias at an already-registered definition. Logs `console.warn` and silently no-ops when the target is unknown.
  - `get(id: string): FractalDefinition | undefined` (`engine-gmt/engine/FractalRegistry.ts:20-22`).
  - `getAll(): FractalDefinition[]` (`engine-gmt/engine/FractalRegistry.ts:24-27`) — deduplicates aliases via `Array.from(new Set(this.definitions.values()))` so aliases sharing a target appear once.
  - `getIds(): FormulaType[]` (`engine-gmt/engine/FractalRegistry.ts:29-31`) — returns the underlying `Map` keys widened to `FormulaType[]` via cast (no runtime check; see drift note in Invariants).
- `Formulas` (`engine-gmt/formulas/index.ts:116`) — re-export of `registry` after side-effectful registration runs. Public consumers should import `Formulas` (or `registry`) only after `engine-gmt/formulas/index.ts` has been imported at least once.

### Modular-graph node registry
- `NodeRegistry` class — singleton instance exported as `nodeRegistry` (`engine-gmt/engine/NodeRegistry.ts:58`). Methods:
  - `register(def: NodeDefinition)` (`engine-gmt/engine/NodeRegistry.ts:36-38`).
  - `get(id: string): NodeDefinition | undefined` (`engine-gmt/engine/NodeRegistry.ts:40-42`).
  - `getAll(): NodeDefinition[]` (`engine-gmt/engine/NodeRegistry.ts:44-46`).
  - `getGrouped(): Record<string, string[]>` (`engine-gmt/engine/NodeRegistry.ts:48-55`) — categorizes node IDs by `def.category` for the Modular-tab palette.
- `NodeDefinition` (`engine-gmt/engine/NodeRegistry.ts:23-31`) — `{ id: NodeType; label; category; description; inputs: NodeInput[]; glsl: (ctx: GLSLContext) => string }`.
- `NodeInput` (`engine-gmt/engine/NodeRegistry.ts:4-13`) — UI slider spec for a node parameter (label / min / max / step / default / hardMin / hardMax).
- `GLSLContext` (`engine-gmt/engine/NodeRegistry.ts:15-21`) — `{ varName, in1, in2, getParam, indent }`, passed to each node's `glsl` builder during graph compilation.

### Formula contract types (`engine-gmt/types/fractal.ts`)
- `FractalDefinition` (`engine-gmt/types/fractal.ts:67-118`) — public contract for every formula. Required: `id: FormulaType`, `name`, `shader.{function, loopBody}`, `parameters`, `defaultPreset`. Optional: `thumbnail`, `shortDescription`, `description`, `juliaType` (`'julia' | 'offset' | 'none'`), `tags: string[]`, `shader.{loopInit, getDist, preamble, preambleVars, usesSharedRotation, selfContainedSDE, supportsCuttingPlane}`, `flags.coordinateMode` (`'Unified' | 'DataAware'`, currently unused — see Known issues), `importSource` (set at runtime by the Workshop importer; enables re-edit).
- `FractalParameter` (`engine-gmt/types/fractal.ts:53-65`) — slot-keyed UI parameter: `{ label, id, type?, min, max, step, default, scale?, options?, mode?, linkable? }`. `id` is constrained to the 15-slot enum `paramA-F | vec2A-C | vec3A-C | vec4A-C` (`engine-gmt/types/fractal.ts:55`). The `parameters` field can contain `null` to skip a slot in the UI (`engine-gmt/types/fractal.ts:96`).
- `Preset` (`engine-gmt/types/fractal.ts:6-51`) — full scene serialization shape. `features: Record<string, any>` (`engine-gmt/types/fractal.ts:50`) is intentionally untyped — the DDFS feature catalogue (owned by e01-feature-system) defines per-feature schemas. `defaultPreset: Partial<Preset>` (`engine-gmt/types/fractal.ts:98`) is the formula-scoped initial state.
- `FormulaType` (`engine-gmt/types/common.ts:4`) — hand-maintained literal union of 43 IDs (42 formula IDs + `'Modular'`). See Invariants for drift caveat.

### Modular-graph serialization types (`engine-gmt/types/graph.ts`)
- `NodeType` (`engine-gmt/types/graph.ts:2-8`) — literal union of 25 node-type IDs (Mandelbulb, BoxFold, SphereFold, Abs, Mod, Rotate, Scale, Translate, Twist, Bend, SineWave, Union, Subtract, Intersect, SmoothUnion, Mix, Sphere, Box, PlaneFold, MengerFold, SierpinskiFold, Custom, Note, IFSScale, AddConstant, AmazingFold).
- `PipelineNode` (`engine-gmt/types/graph.ts:10-26`) — serialization shape for a compiled-order node: `{ id, type, enabled, params, text?, bindings?, condition? }`. `condition.active` is structural (recompile-trigger); `condition.mod` and `condition.rem` are runtime uniforms.
- `GraphNode` (`engine-gmt/types/graph.ts:28-30`) — `PipelineNode` plus `position: { x, y }` for React Flow editor.
- `GraphEdge` (`engine-gmt/types/graph.ts:32-38`) — `{ id, source, target, sourceHandle?, targetHandle? }`.
- `FractalGraph` (`engine-gmt/types/graph.ts:40-43`) — `{ nodes: GraphNode[], edges: GraphEdge[] }`. Persisted alongside `pipeline` whenever `formula === 'Modular'`.

### Category data
- `PREDEFINED_CATEGORIES` (`engine-gmt/formulas/categories.ts:7-99`) — frozen `as const` array of `{ name, match: string[] }`. Eight categories: Featured Fractals, Platonic & Archimedean, Catalan & Coxeter, Stellations & Special, IFS & Folding, Power Fractals, Hybrids & Experiments, Systems. Formulas may appear in multiple categories.

## Architecture

### Two-registry model
The subsystem owns two independent singletons. `FractalRegistry` (`engine-gmt/engine/FractalRegistry.ts:4`) maps `string -> FractalDefinition` for whole-formula entries. `NodeRegistry` (`engine-gmt/engine/NodeRegistry.ts:33`) maps `string -> NodeDefinition` for Modular-graph operator nodes. The two never cross-reference at the type level — `FractalDefinition` does not know about `NodeDefinition`. The bridge between them is `Modular.ts`, which carries empty shader strings (`engine-gmt/formulas/Modular.ts:13-18`) so the shader factory recognises the `'Modular'` formula ID and dispatches to graph-compiled GLSL (owned by g02-shader-pipeline + g09-modular-graph).

### Registration is side-effectful, ordered by UI display priority
`engine-gmt/formulas/index.ts:2-46` imports all 42 formula objects, the array at lines 50-101 declares the loading-screen order (Featured / Others / Hybrids / System sections marked by comments), and `formulas.forEach(def => registry.register(def))` at line 104 performs batch registration at module-import time. Legacy aliases are added afterwards (`engine-gmt/formulas/index.ts:107-111`). The export `Formulas = registry` at line 116 is only valid once this file has been imported.

### Alias semantics
`registerAlias` stores the SAME `FractalDefinition` reference under a second key (`engine-gmt/engine/FractalRegistry.ts:14`). Identity comparison works, and `getAll()` (line 26) deduplicates via `Set`, so consumers iterating over `getAll()` see each definition once. The five active legacy aliases live at `engine-gmt/formulas/index.ts:107-111`:

| Alias | Target | Reason |
|---|---|---|
| `UberMenger` | `MengerAdvanced` | Renamed for clarity |
| `FoldingBrot` | `BoxBulb` | Renamed |
| `HyperTorus` | `Mandelorus` | Renamed |
| `HyperbolicMandelbrot` | `MandelBolic` | Renamed |
| `RhombicIcosahedron` | `Coxeter` | Mathematically misnamed |

### Formula file shape
Each `engine-gmt/formulas/*.ts` exports a single named `const` typed as `FractalDefinition`. The minimal canonical shape (see Mandelbulb at `engine-gmt/formulas/Mandelbulb.ts:4-128`) is:

1. **Metadata** — `id`, `name`, `shortDescription`, `description`, `juliaType` (`engine-gmt/formulas/Mandelbulb.ts:5-9`).
2. **`shader` block** (`engine-gmt/formulas/Mandelbulb.ts:11-69`) — GLSL `function` body + `loopBody` invocation. Larger formulas add `loopInit`, `preamble`, `preambleVars`, `getDist`, and the three boolean flags. `function` is dropped at GLSL top scope; `loopBody` is spliced inside the iteration loop; `loopInit` runs once before the loop; `preamble` declares globals/helpers above `function`. The exact assembly order is documented in `docs/gmt/25_Formula_Dev_Reference.md`.
3. **`parameters`** (`engine-gmt/formulas/Mandelbulb.ts:71-76`) — slot-keyed array. `null` entries skip a UI row; Modular uses `[null, null, null, null]` as a sentinel (`engine-gmt/formulas/Modular.ts:20-22`) since its parameters come from graph-node bindings.
4. **`defaultPreset`** (`engine-gmt/formulas/Mandelbulb.ts:78-127`) — `Partial<Preset>` holding `features.{coreMath, geometry, coloring, materials, lighting, quality, …}` plus camera pose and light array.
5. **Side-effect-free**: formula files contain no `registry.register` call. Registration happens once at `engine-gmt/formulas/index.ts:104`.

### Modular outlier
`Modular.ts` has empty `function`, `loopBody`, and `getDist` strings (`engine-gmt/formulas/Modular.ts:13-18`). The shader factory (g02) intercepts `id === 'Modular'` and injects graph-compiled GLSL from the `pipeline` field of the active preset. The default pipeline is `JULIA_REPEATER_PIPELINE` (`engine-gmt/formulas/Modular.ts:30`).

### Three optional shader flags
The `shader` object carries three engine-runtime contracts:
- `usesSharedRotation: true` (`engine-gmt/types/fractal.ts:87`) — formula reads/writes the shared `gmt_rotAxis / gmt_rotCos / gmt_rotSin` globals. Engine swaps their values between primary/secondary during interlace.
- `selfContainedSDE: true` (`engine-gmt/types/fractal.ts:88-90`) — formula owns its full SDE. `loopBody` calls the function once then breaks. Engine sets `SKIP_PRE_BAILOUT`, disables hybrid-box fold injection, disables interlacing.
- `supportsCuttingPlane: true` (`engine-gmt/types/fractal.ts:91-94`) — engine auto-declares `cp_dmin / cp_scale / cp_trap` globals plus initializes them in `loopInit`. When the user picks estimator `5` (Cutting Plane), engine's default `getDist` returns `vec2(abs(cp_dmin), cp_trap)`.

### `preambleVars` contract
Mutable globals declared in `preamble` MUST be listed in `preambleVars: string[]` (`engine-gmt/types/fractal.ts:86`). The interlace rewriter renames them when two formulas share GLSL state at compile time. 12 formulas currently use this (see Invariants for the full list, including `engine-gmt/formulas/Apollonian.ts:21`, `engine-gmt/formulas/Claude.ts:110`, `engine-gmt/formulas/Coxeter.ts:37`).

### Category-vs-UI-order split
Two parallel orderings exist:
- `engine-gmt/formulas/index.ts:50-101` — loading-screen array (Featured / Others / Hybrids / System sections marked by comments).
- `engine-gmt/formulas/categories.ts:7-99` — `PREDEFINED_CATEGORIES` for the gallery filter UI. Formulas may appear in multiple categories.

`categories.ts` uses string literals not imports — `engine-gmt/formulas/index.ts:113-114` comments explain this is deliberate so the categories module stays out of the formula dependency graph (bundle-splitting concern).

### Type re-export hub
`engine-gmt/types/index.ts:1-8` barrel-re-exports `animation | common | fractal | graph | graphics | help | store | viewport`. Formulas import from `'../types'` and pick up `FractalDefinition` (defined in `fractal.ts`) transitively.

## Invariants

- **Registration is side-effectful and one-shot per file load.** Importing `engine-gmt/formulas/index.ts` triggers 42 `register` calls + 5 `registerAlias` calls (`engine-gmt/formulas/index.ts:104-111`). Consumers must import this file (directly or transitively) before calling `registry.get` / `registry.getAll`.
- **`registerAlias` silently fails on unknown targets.** It logs `console.warn` and skips (`engine-gmt/engine/FractalRegistry.ts:13-17`). Order of alias declarations matters — all five active aliases are declared after `formulas.forEach(register)` so they always resolve.
- **`FormulaType` is the superset; registry is the truth.** The union at `engine-gmt/types/common.ts:4` is hand-maintained. Registered IDs not listed in the union are widened via the `as FormulaType[]` cast at `engine-gmt/engine/FractalRegistry.ts:30`. Conversely, the 5 alias IDs (`UberMenger`, `FoldingBrot`, `HyperTorus`, `HyperbolicMandelbrot`, `RhombicIcosahedron`) are NOT in `FormulaType` — any code holding a `FormulaType` cannot type-represent a legacy alias. See followup q-102 for the three single-source-of-truth options.
- **`parameters` slot order drives UI iteration, not uniform binding.** Uniforms map by slot `id` (e.g. `paramA -> uParamA`), so array order doesn't change shader binding — only UI display order. `null` entries skip a row.
- **`preambleVars` must list every mutable global declared in `preamble`.** Missing entries cause interlace rendering to corrupt cross-formula state silently. Currently 12 formulas use the field, listed in the catalog below.
- **`usesSharedRotation` is required for formulas calling `gmt_precalcRodrigues` in `loopInit`.** Without the flag, interlace mode reads stale rotation state.
- **`selfContainedSDE` is mutually exclusive with hybrid-box and interlace.** Engine guards via `SKIP_PRE_BAILOUT` (`engine-gmt/types/fractal.ts:88-90`). Only two formulas opt in: `engine-gmt/formulas/JuliaMorph.ts:155`, `engine-gmt/formulas/MandelTerrain.ts:272`.
- **`Modular` has empty shader strings.** Any direct shader-string consumer must guard against `id === 'Modular'` (`engine-gmt/formulas/Modular.ts:15-17`). The intercept lives in g02-shader-pipeline.
- **Filename vs ID drift in PseudoKleinian family.** The file `PseudoKleinianAdv.ts` exports a const named `PseudoKleinian06` (imported as such at `engine-gmt/formulas/index.ts:43`). The `FormulaType` union (`engine-gmt/types/common.ts:4`) lists `'PseudoKleinian06'`. Three independent names; renaming requires touching all three plus optionally an alias.
- **`flags.coordinateMode` is declared but unused.** Type field exists at `engine-gmt/types/fractal.ts:99-101`; no formula file sets it (grep across `engine-gmt/` returns only the type declaration). Either reserved for future use or dead.

## Interactions with other subsystems

- **g02-shader-pipeline** consumes `FractalDefinition.shader` fields and dispatches on `id === 'Modular'` to splice in graph-compiled GLSL. Reads `selfContainedSDE`, `supportsCuttingPlane`, `usesSharedRotation`, `preambleVars` to decide on `SKIP_PRE_BAILOUT`, cutting-plane global declaration, rotation-state swapping, and interlace renaming.
- **g09-modular-graph** registers the 25 `NodeType` entries into `nodeRegistry` from `engine-gmt/data/nodes/definitions.ts` (outside this subsystem). It also owns `PipelineNode.bindings` / `condition` semantics and graph compilation.
- **e01-feature-system** (DDFS) defines per-feature schemas. `FractalDefinition.defaultPreset.features` (`engine-gmt/types/fractal.ts:50`) holds DDFS state but its per-key shape is owned by the feature catalogue.
- **Workshop importer** (`engine-gmt/features/fragmentarium_import/*`) populates `FractalDefinition.importSource` (`engine-gmt/types/fractal.ts:103-118`) on runtime-imported formulas so the Workshop can re-edit them.
- **GMF load/save** (utils/FormulaFormat) reads the registry to detect already-registered formulas and skips re-registering known IDs; unknown formulas in a loaded GMF are registered from embedded metadata.

## Formula catalog

All 42 native formulas + Modular. Line counts measured 2026-05-20. "ssrot" = `usesSharedRotation: true`, "cp" = `supportsCuttingPlane: true`, "sde" = `selfContainedSDE: true`, "pv" = uses `preambleVars`, "gd" = ships a custom `getDist`, "tags" = has `tags` field.

| ID | Category | File | Lines | Flags |
|---|---|---|---|---|
| Mandelbulb | Power Fractals | `engine-gmt/formulas/Mandelbulb.ts` | 118 | (minimal example) |
| Mandelbar3D | Power Fractals | `engine-gmt/formulas/Mandelbar3D.ts` | 86 | ssrot |
| Quaternion | Power Fractals | `engine-gmt/formulas/Quaternion.ts` | 143 | |
| AmazingBox | IFS & Folding | `engine-gmt/formulas/AmazingBox.ts` | 174 | |
| AmazingSurf | IFS & Folding | `engine-gmt/formulas/AmazingSurf.ts` | 92 | |
| AmazingSurface | IFS & Folding | `engine-gmt/formulas/AmazingSurface.ts` | 293 | gd |
| MengerSponge | Platonic & Archimedean | `engine-gmt/formulas/MengerSponge.ts` | 121 | cp |
| MengerAdvanced | IFS & Folding | `engine-gmt/formulas/MengerAdvanced.ts` | 208 | cp |
| MixPinski | Featured / IFS | `engine-gmt/formulas/MixPinski.ts` | 154 | ssrot, gd |
| SierpinskiTetrahedron | Platonic & Archimedean | `engine-gmt/formulas/SierpinskiTetrahedron.ts` | 118 | ssrot, cp |
| Kleinian | IFS & Folding | `engine-gmt/formulas/Kleinian.ts` | 85 | |
| KleinianMobius | IFS & Folding | `engine-gmt/formulas/KleinianMobius.ts` | 228 | pv, gd, tags |
| KleinianJos | IFS & Folding | `engine-gmt/formulas/KleinianJos.ts` | 208 | pv, gd, tags |
| PseudoKleinian | IFS & Folding | `engine-gmt/formulas/PseudoKleinian.ts` | 104 | |
| PseudoKleinian06 (file `PseudoKleinianAdv.ts`) | IFS & Folding | `engine-gmt/formulas/PseudoKleinianAdv.ts` | 142 | pv, gd, tags |
| PseudoKleinianMod4 | IFS & Folding | `engine-gmt/formulas/PseudoKleinianMod4.ts` | 155 | pv, gd, tags |
| KaliBox | IFS & Folding | `engine-gmt/formulas/KaliBox.ts` | 133 | pv, gd |
| MarbleMarcher | IFS & Folding | `engine-gmt/formulas/MarbleMarcher.ts` | 126 | pv, gd |
| BoxBulb | Hybrids & Variants | `engine-gmt/formulas/BoxBulb.ts` | 105 | |
| Bristorbrot | Power Fractals | `engine-gmt/formulas/Bristorbrot.ts` | 111 | pv |
| MakinBrot | Power Fractals | `engine-gmt/formulas/MakinBrot.ts` | 86 | ssrot |
| Tetrabrot | Power Fractals | `engine-gmt/formulas/Tetrabrot.ts` | 90 | |
| Buffalo | Power Fractals | `engine-gmt/formulas/Buffalo.ts` | 112 | ssrot |
| Phoenix | Power Fractals | `engine-gmt/formulas/Phoenix.ts` | 182 | pv |
| MandelTerrain | Featured / Hybrids | `engine-gmt/formulas/MandelTerrain.ts` | 569 | sde, gd |
| JuliaMorph | Hybrids & Variants | `engine-gmt/formulas/JuliaMorph.ts` | 302 | sde, gd |
| Mandelorus | Featured (was HyperTorus) | `engine-gmt/formulas/Mandelorus.ts` | 582 | |
| Appell | Featured | `engine-gmt/formulas/Appell.ts` | 541 | |
| Borromean | Featured | `engine-gmt/formulas/Borromean.ts` | 547 | |
| MandelMap | Featured | `engine-gmt/formulas/MandelMap.ts` | 580 | |
| MandelBolic | Hybrids & Experiments | `engine-gmt/formulas/MandelBolic.ts` | 352 | |
| Claude | Featured | `engine-gmt/formulas/Claude.ts` | 174 | ssrot, pv |
| Apollonian | Stellations & Special | `engine-gmt/formulas/Apollonian.ts` | 288 | pv, gd, tags |
| Octahedron | Platonic & Archimedean | `engine-gmt/formulas/Octahedron.ts` | 240 | ssrot, cp |
| Icosahedron | Platonic & Archimedean | `engine-gmt/formulas/Icosahedron.ts` | 253 | ssrot, cp |
| Dodecahedron | Platonic & Archimedean | `engine-gmt/formulas/Dodecahedron.ts` | 133 | ssrot, cp |
| Cuboctahedron | Platonic & Archimedean | `engine-gmt/formulas/Cuboctahedron.ts` | 258 | ssrot, cp, tags |
| TruncatedIcosahedron | Platonic & Archimedean | `engine-gmt/formulas/TruncatedIcosahedron.ts` | 263 | ssrot, cp, tags |
| Coxeter | Catalan & Coxeter | `engine-gmt/formulas/Coxeter.ts` | 143 | ssrot, cp, pv |
| RhombicDodecahedron | Catalan & Coxeter | `engine-gmt/formulas/RhombicDodecahedron.ts` | 134 | ssrot, cp |
| RhombicTriacontahedron | Catalan & Coxeter | `engine-gmt/formulas/RhombicTriacontahedron.ts` | 133 | ssrot, cp |
| GreatStellatedDodecahedron | Stellations & Special | `engine-gmt/formulas/GreatStellatedDodecahedron.ts` | 154 | ssrot, cp, pv, tags |
| Modular | Systems | `engine-gmt/formulas/Modular.ts` | 31 | (placeholder, empty shader) |

Counts (verified 2026-05-20 via grep over `engine-gmt/formulas/`):
- `usesSharedRotation: true`: 15 formulas — all polyhedral IFS + Mandelbar3D, MakinBrot, Buffalo, MixPinski, Claude.
- `supportsCuttingPlane: true`: 12 formulas — all polyhedral IFS + MengerSponge + MengerAdvanced.
- `selfContainedSDE: true`: 2 formulas — `engine-gmt/formulas/JuliaMorph.ts:155`, `engine-gmt/formulas/MandelTerrain.ts:272`.
- `preambleVars`: 12 formulas — Bristorbrot, Coxeter, KleinianMobius, Claude, Apollonian, KleinianJos, KaliBox, GreatStellatedDodecahedron, PseudoKleinianMod4, MarbleMarcher, Phoenix, PseudoKleinianAdv.
- Custom `getDist`: 11 formulas + Modular (empty) — AmazingSurface, Apollonian, JuliaMorph, KaliBox, KleinianJos, KleinianMobius, MandelTerrain, MarbleMarcher, MixPinski, PseudoKleinianAdv, PseudoKleinianMod4.
- `tags` field: 8 formulas — Apollonian (`engine-gmt/formulas/Apollonian.ts:10`), Cuboctahedron, GreatStellatedDodecahedron, KleinianJos, KleinianMobius, PseudoKleinianAdv, PseudoKleinianMod4, TruncatedIcosahedron.

Outliers worth knowing:
- **Largest** (>500 lines): `Mandelorus.ts` (582), `MandelMap.ts` (580), `MandelTerrain.ts` (569), `Borromean.ts` (547), `Appell.ts` (541) — sprawling because of long GLSL helpers, multi-mode projection, or terrain noise / multi-octave shading.
- **Smallest** (<100 lines): `Modular.ts` (31, placeholder), `Kleinian.ts` (85), `MakinBrot.ts` (86), `Mandelbar3D.ts` (86), `Tetrabrot.ts` (90), `AmazingSurf.ts` (92).
- **Structural outliers**: `Modular` (empty shader, dynamic injection at runtime by g02), `JuliaMorph` + `MandelTerrain` (selfContainedSDE — own their full SDE).

## Known issues / Phase 2 carry-in

**Carry-in (from `plans/doc-audit-state/phase-2-carry-in.json` `g03-formula-registry`):**
- **q-102 (drift): `FormulaType` literal union vs registration.** The union at `engine-gmt/types/common.ts:4` is hand-maintained, but `registry.register` (`engine-gmt/engine/FractalRegistry.ts:7-9`) accepts any `FractalDefinition` and `getIds()` widens via `as FormulaType[]` cast (line 30). Drift directions: (a) the 5 alias IDs (`UberMenger | FoldingBrot | HyperTorus | HyperbolicMandelbrot | RhombicIcosahedron`) are registered but missing from the union — code holding a `FormulaType` cannot type-represent them; (b) `'PseudoKleinian06'` is in the union but the file is `PseudoKleinianAdv.ts`. Stable branch (parent project) has already adopted opaque-tag `FormulaType = string`. Three remediation options ranked in followup q-102. Investigation: `plans/doc-audit-state/survey/_followups/q-102.md`.

**Pending followups (q-103 / q-104 / q-105 / q-106):** the followups directory does not contain entries with these IDs as of 2026-05-20 09:29 UTC (`plans/doc-audit-state/survey/_followups/` listing shows only q-102 for this subsystem, plus unrelated q-107..q-119). Carry-in entry references only q-102. If new followups land later, they should be re-checked against this doc.

**Open from the survey (`plans/doc-audit-state/survey/g03-formula-registry.md`):**
- **`flags.coordinateMode` is dead code.** Declared at `engine-gmt/types/fractal.ts:99-101`, never set in any of the 42 formula files (verified by grep over `engine-gmt/`). Orphan-sweep candidate: remove the field or wire up an intended consumer.
- **`NodeRegistry` registration site is external.** Node definitions register from `engine-gmt/data/nodes/definitions.ts` — owned by g09-modular-graph. This subsystem owns the registry primitive only.
- **`Preset.features: Record<string, any>`** (`engine-gmt/types/fractal.ts:50`) is intentionally untyped. DDFS feature schemas are e01-feature-system's responsibility.
- **`importSource` lifecycle** (`engine-gmt/types/fractal.ts:103-118`) is mutated by the Workshop importer at runtime; built-in formulas never set it. Workshop survey (g05-equivalent) owns the lifecycle.
- **Legacy aliases (5)** — verify against wild-saved scenes before any future removal.

## Historical context

This module doc complements (does not supersede) `docs/gmt/25_Formula_Dev_Reference.md`, which the audit disposition (`plans/doc-audit-state/phase-2-disposition.json`) classifies as `minor-edits`: "Existing doc is comprehensive (898 lines) and accurate on the live fields. Drift is mostly gaps (newly added fields `supportsCuttingPlane`, `tags`, registry API surface) and one dead field (`flags.coordinateMode`)." That doc remains the canonical authoring tutorial — it carries the full execution-order diagram, the self-contained-SDE coloring contract (modes 0/1/6/7/9), the logTrap positive-trap caveat, the GLSL ES 3.0 const-initializer quirk, the preamble-assembly-order quirk and `loopInit` workaround, the paramA/paramB double-wiring quirk, the complete uniform / built-in / shared-transform reference, the parameter slot / type / mode tables, the DE tracking patterns table, the new-formula checklist, and the Catalan-solid fold techniques.

Three known gaps in the old doc that this module doc covers:
- **`supportsCuttingPlane`** — added 2026-05-05, used by 12 polyhedral formulas (see catalog).
- **Registry API surface (`getAll` dedupe semantics, `getIds` cast)** — `registry.register` / `registerAlias` are mentioned in §1 of the old doc but the dedupe + cast behaviour was undocumented.
- **`tags` field** — used by 8 formulas for search/filter; not in the old doc's field reference.

For interlace-system details (the runtime motivation for `preambleVars`, `usesSharedRotation`, and the 1600-pair test sweep), see `docs/gmt/24_Formula_Interlace_System.md`. For Fragmentarium-to-native formula porting, see `docs/gmt/22_Frag_to_Native_Formula_Conversion.md`. For the formula audit history (math fixes, parameter consolidations, status per formula), see `docs/gmt/23_Formula_Audit.md`.
