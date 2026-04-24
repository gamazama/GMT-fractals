# Formula System & Interlace — Architecture Notes

_Covers work done in session starting 2026-04-03. See also `docs/03_Modular_System.md` for DDFS context._

---

## What Was Done This Session

### 1. Shared Geometry Transforms (`features/geometry/transforms.ts`)
Rodrigues rotation helpers (`gmt_precalcRodrigues`, `gmt_applyRodrigues`) and `gmt_applyTwist` were extracted into a shared GLSL string exported from `features/geometry/transforms.ts`. Formulas that previously inlined these (e.g. MixPinski, Dodecahedron, SierpinskiTetrahedron, Mandelbar3D, MakinBrot) were refactored to use the shared versions via `loopInit`. This also required injecting `SHARED_TRANSFORMS_GLSL` into `MESH_GLSL_HELPERS` (in `shaders/chunks/math.ts`) so mesh export shaders have access to the same functions.

### 2. Mesh Export Interlace Support
The mesh export pipeline (`mesh-export/`) was extended to support GMF files containing interlaced formulas:
- `engine/SDFShaderBuilder.ts` — new `MeshInterlaceConfig` type, `buildInterlaceGLSL()`, `buildInterlaceUniforms()`, modified `buildIterationLoop()`, all 5 shader builders updated
- `mesh-export/gpu/gpu-pipeline.ts` — new `setInterlaceUniforms()`, all pipeline functions updated to accept and bind interlace config
- `mesh-export/pipeline/types.ts` / `mesh-pipeline.ts` — threaded `interlace?` through the full pipeline
- `mesh-export/store/meshExportStore.ts` — added `interlaceState` + `setInterlaceState`
- `mesh-export/components/FormulaSelector.tsx` — GMF loading now extracts interlace state from `preset.features.interlace`
- `mesh-export/components/ExportPanel.tsx` / `PreviewCanvas.tsx` — pass interlace config into pipeline and shader builds

### 3. Formula Preamble Vars (`shader.preambleVars`)
Added `preambleVars?: string[]` to `FractalDefinition.shader`. Formulas with mutable preamble globals must declare them explicitly. The 4 affected formulas:
- `KaliBox`: `['uKB_rot', 'uKB_doRot']`
- `Claude`: `['uCl_n4', 'uCl_doHarmonic']`
- `MarbleMarcher`: `['uMM_sZ', 'uMM_cZ', 'uMM_sX', 'uMM_cX', 'uMM_sY', 'uMM_cY']`
- `Coxeter`: `['uCox_nc', 'uCox_nor', 'uCox_pca', 'cox_dmin', 'cox_scale', 'cox_trap']`

### 4. GLSL Rewriter Refactor (`features/interlace/glslRewriter.ts`)
Replaced regex-based preamble variable discovery with explicit `preambleVars` lists:
- Old: regex scanned for `u[A-Z][A-Za-z]*_\w+` patterns — missed `bool` type, missed `c_rot`-style names
- New: `rewritePreamble(preamble, formulaId, preambleVars?)` and `rewriteFormulaFunction(glsl, formulaId, preambleVars?)` use the explicit list directly
- Sorted longest-first to prevent partial matches (e.g. `uMM_cZ` before `uMM_c`)

### 5. Bug Fixes
- **Wrong loopBody in mesh shader**: `rewriteLoopBody` was called with the primary formula's `loopBody` instead of the secondary's — the interlace never actually ran the secondary formula's function
- **GMF formula params not loading**: `FormulaSelector` was reading `preset.features.formula.params` (which doesn't exist); corrected to `preset.features.coreMath[p.id]` (flat, no nesting)
- **`c_rot` shader error**: KaliBox preamble declares `float c_rot` inside an `if` block (block-local). The old regex-based rewriter renamed the declaration to `interlace_c_rot` but the usages (which happened to be on the same lines) were also renamed correctly — however, the initial regex matched the declaration but the tracked-vars pass ran a second time with a different set, causing a split rename. Fixed by the `preambleVars` explicit approach (which doesn't touch block-local temps at all).
- **`uKB_doRot` not renamed**: `bool` was not matched by the old `vec|float|int|mat` type pattern. Fixed by switching to explicit `preambleVars`.
- **Claude formula Error 1282 (VALIDATE_STATUS false)**: `Claude.ts` preamble used `const float claude_Phi = (1.0 + sqrt(5.0)) * 0.5` and `const vec3 claude_n1 = normalize(...)`. In GLSL ES 3.0, built-in functions (`sqrt`, `normalize`) are not constant expressions, so `const` declarations initialized with them fail to compile on stricter drivers. Fixed by removing `const` from all five declarations (`claude_Phi`, `claude_n1/n2/n3`, `claude_goldenAxis`) and moving their initialization into `Claude_precalc()`. Also added `usesSharedRotation: true` since `Claude_precalc()` calls `gmt_precalcRodrigues(uVec3B)`.

---

## Architecture: How Interlace Works

### Main Renderer Path (`features/interlace/index.ts`)
The interlace feature is a DDFS feature with `mode: 'compile'` for the formula choice and `mode: 'runtime'` for the interval/enable toggle. Its `inject()` hook:

1. Gets the secondary `FractalDefinition` from the registry
2. Rewrites its GLSL:
   - `rewritePreamble` → renames globals and precalc functions, remaps uniforms
   - `rewriteFormulaFunction` → renames the function itself to `formula_Interlace`, remaps uniforms and preamble var references
   - `rewriteLoopBody` → renames the function call in the loop body
   - `rewriteLoopInit` → renames precalc calls and remaps uniforms
3. Calls `builder.addPreamble()`, `builder.addFunction()`, `builder.addHybridFold()`
4. The hybrid fold injects `hybridPreLoop` (rotation state save/restore) and `hybridInLoop` (the alternation logic with `skipMainFormula = true`)

### Mesh Export Path (`engine/SDFShaderBuilder.ts`)
Parallel implementation — does not use the DDFS builder. Directly assembles GLSL strings:
1. `buildInterlaceGLSL()` rewrites preamble + function + loopInit
2. `buildIterationLoop()` generates the same pre-loop/in-loop logic as the main renderer
3. All 5 shader builders include interlace uniforms and blocks

**The two implementations are separate but should be kept in sync.**

### Rotation State Problem
Formulas like KaliBox and MarbleMarcher precompute rotation into three global GLSL variables (`gmt_rotAxis`, `gmt_rotCos`, `gmt_rotSin`) in their `loopInit`. When KaliBox is the secondary formula in an interlace:
- Before the loop: run `interlace_KaliBox_precalcRotation()`, save result into `_il_interlace*` locals, then restore primary's globals
- In loop (when secondary iteration fires): swap in `_il_interlace*`, run `formula_Interlace()`, swap back

**Explicit flag**: `shader.usesSharedRotation` is set on all formulas whose `loopInit` calls `gmt_precalcRodrigues` (directly or indirectly). The rotation swap now triggers only when this flag is `true`, not on any `loopInit` presence. See "Improvements Applied" section.

### Uniform Naming Convention
```
Primary formula:    uParamA, uParamB ... uVec3A, uVec3B ...
Secondary formula:  uInterlaceParamA ... uInterlaceVec3A ...
Control:            uInterlaceEnabled, uInterlaceInterval, uInterlaceStartIter
```

The rewriter does word-boundary (`\b`) replacement. All 12 scalar/vec uniform names are mapped at once via a prebuilt `UNIFORM_MAP` array.

---

## Known Fragilities

### Critical
**`preambleVars` is not enforced at compile time.** If a formula author adds a mutable global to `preamble` without listing it in `preambleVars`, interlace will produce the wrong shader. A dev-mode `console.warn` in `rewritePreamble` catches this at runtime in development builds (see Improvements Applied), but there is no static TypeScript check.

### `skipMainFormula` ownership — important invariant
`de.ts` (the main renderer DE template) declares `bool skipMainFormula = false;` once per iteration if any `hybridInLoop` content references `skipMainFormula`. It detects this by scanning the joined `hybridInLoop` string. **Do not declare `skipMainFormula` inside `buildInterlaceLoopGLSL`'s `inLoop`** — that would double-declare it when geometry's burning mode is also active (which always runs even when hybrid fold is disabled).

`SDFShaderBuilder.buildIterationLoop` (mesh export) has no `de.ts` template so it declares `bool skipMainFormula = false;` directly in the loop body when interlace is active.

### Remaining structural issue
**`addHybridFold` is semantically wrong for interlace.** Interlace uses `builder.addHybridFold('', hybridPreLoop, hybridInLoop)` — repurposing the geometry feature's hybrid fold mechanism. Interlace is not a fold. A dedicated builder method (`builder.setInterlaceLoop`) would be cleaner, but requires ShaderBuilder changes.

---

## Improvements Applied (2026-04-03)

### 1. Shared `buildInterlaceLoopGLSL` — eliminates duplicated templates
`buildInterlaceLoopGLSL(rewrittenBody, interlaceInit, needsRotSwap)` added to `glslRewriter.ts`. Returns `{ preLoop, inLoop }`. Both `interlace/index.ts` and `SDFShaderBuilder.buildIterationLoop` import and call it. The ~40-line duplicated save/restore template is gone.

### 2. `shader.usesSharedRotation` flag
Added to `FractalDefinition.shader` in `types/fractal.ts`. Set to `true` on all 15 formulas whose `loopInit` calls `gmt_precalcRodrigues` (directly or via a precalc function). The `needsRotSwap` variable in both callers now reads `!!def.shader.usesSharedRotation` instead of `!!def.shader.loopInit`. This means:
- KaliBox and MarbleMarcher (which have loopInit but don't use `gmt_*` globals) no longer trigger unnecessary rotation swaps
- The intent is now explicit and self-documenting

Formulas with `usesSharedRotation: true`: Buffalo, Claude, Cuboctahedron, Dodecahedron, GreatStellatedDodecahedron, Icosahedron, MakinBrot, Mandelbar3D, MixPinski, Octahedron, RhombicDodecahedron, Coxeter, RhombicTriacontahedron, SierpinskiTetrahedron, TruncatedIcosahedron.

### 3. Dev-mode `preambleVars` validation
`rewritePreamble` now scans for top-level non-const type declarations and `console.warn`s if any variable name is missing from `preambleVars`. Only active in dev builds (`import.meta.env.DEV`). Catches the bug class where a formula declares a preamble var but forgets to list it.

### 4. Mesh exporter interlace UI
`ExportPanel.tsx` now shows an interlace controls panel when a GMF with interlace is loaded:
- Secondary formula name (read-only label)
- Enable/disable checkbox
- Interval number input (1–16)
- Start iter number input (0–64)
Changes update the store immediately; the next Generate/Preview picks them up.

### 5. Removed redundant `gmt_precalcRodrigues` special-cases
Deleted the two hardcoded string replacements from `rewriteLoopInit`. The `applyUniformMap` pass that follows already remaps `uVec3B` → `uInterlaceVec3B` inside any argument, so the explicit patterns were redundant and added maintenance surface.

### 6. `skipMainFormula` redefinition fix
`buildInterlaceLoopGLSL`'s `inLoop` no longer declares `bool skipMainFormula`. `de.ts` (main renderer) detects the reference and emits the declaration once before all `hybridInLoop` blocks. `SDFShaderBuilder.buildIterationLoop` (mesh export) declares it per-iteration at the top of the loop when interlace is active. This prevents the redefinition that occurred when burning mode (geometry feature) was also active.

### 7. Secondary formula parameter defaults (`onSet` hook)
When a user changes the secondary formula via the interlace dropdown, the new formula's parameter defaults now automatically load into the interlace param slots. Implementation:
- Added `onSet?: (newValue, currentSliceState) => Record<string, any>` to `ParamConfig` in `FeatureSystem.ts`
- Wired it in `createFeatureSlice` before building `next` — extra updates from `onSet` merge into the same setter call, included in the CONFIG event and compile trigger
- `interlaceFormula` param uses `onSet: (id) => buildInterlaceDefaults(id)` — reads the new formula's `.parameters` and maps them to `interlaceParamA`, `interlaceVec3A`, etc.
- Added `INTERLACE_PARAM_MAP_INVERSE` (reverse of `INTERLACE_PARAM_MAP`) to do the formula param ID → interlace key mapping

### 8. Preview shader during interlace compile
When the secondary formula changes (`interlaceCompiled` is true), the engine now shows the fast preview shader while the full interlaced shader compiles. Previously `_lastCompiledFormula` only tracked `config.formula` (the primary), so changing the secondary looked like "same formula" → `keepCurrent = true` → no preview. Fix: `compiledFormulaKey = config.formula + '+' + interlaceFormulaId` when interlace is compiled. Both `_lastCompiledFormula` assignment sites use this compound key.

---

## Remaining Suggestions

### Medium-term

**Move interlace loop injection into the builder**
Currently `addHybridFold('', hybridPreLoop, hybridInLoop)` is used for interlace — it hijacks the geometry feature's hybrid fold mechanism. Interlace is not a fold. A dedicated builder method (`builder.setInterlaceLoop`) would be cleaner, but requires ShaderBuilder changes.

**7. Replace runtime `uInterlaceEnabled` check with compile-time branch**
Currently `uInterlaceEnabled` is evaluated every iteration in every pixel. Since interlace is a compile-time toggle (`interlaceCompiled`), the enable/disable could be a compile-time `#define` too. This would avoid the branch overhead in the loop. The interval and startIter can remain as uniforms since they're cheap integer ops.

### Structural (longer term)

**8. Generalize to N-formula hybrid (not just 2)**
The current design hardcodes exactly two formulas. Mandelbulber supports N-formula hybrids (sequence of formulas). A more general approach:
- `hybridSequence: Array<{ formulaId, params, iterations }>`
- Loop unrolls the sequence with a position counter
- GLSL rewriter generates `formula_Hybrid_0`, `formula_Hybrid_1`, etc.
This is a significant rewrite but would make the system much more powerful without growing the uniform count proportionally.

**Elevated to primary feature-investment target** per [research/hybrid-formula-architecture-comparison.md](research/hybrid-formula-architecture-comparison.md). Mandelbulber2's scheduler is `seq[i] → formula_idx` with per-formula `start_iter` / `stop_iter` / `formula_iterations` / `weight`. That's the concrete target shape.

**9. Uniform buffer objects (UBOs) for secondary params**
The current 12+ interlace uniforms are each individually queried. UBOs would bundle them and reduce the per-draw overhead. Low priority since mesh export is not real-time.

---

## Data Flow: GMF → Mesh Export

```
GMF file
  ↓ loadGMFScene()
  ↓ returns { def: FractalDefinition, preset: Preset }
  ↓
FormulaSelector.handleFileLoad
  ├─ store.setLoadedDefinition(def)
  ├─ store.setFormulaParams(coreMath params)   ← reads preset.features.coreMath[p.id]
  └─ store.setInterlaceState({                 ← reads preset.features.interlace
       definition: ilDef,                         interlaceCompiled + interlaceFormula gate
       params: {paramA: ..., ...},                maps interlace{ParamA} → paramA
       enabled, interval, startIter
     })
  ↓
ExportPanel.buildParams()
  └─ builds MeshInterlaceConfig from store.interlaceState
  ↓
All pipeline functions receive interlace?: MeshInterlaceConfig
  ├─ setInterlaceUniforms() binds all uniforms to each GL program
  └─ buildMesh*Shader({ ..., interlace }) generates GLSL with interlace blocks
```

**Key preset key paths:**
- Primary formula params: `preset.features.coreMath.paramA` (flat, not nested)
- Interlace formula: `preset.features.interlace.interlaceFormula`
- Interlace params: `preset.features.interlace.interlaceParamA` (prefixed)
- Interlace enabled: `preset.features.interlace.interlaceEnabled`

---

## New Formula Files Added (Platonic / Polyhedral)

New formulas added to the registry (`formulas/index.ts`):
- `Apollonian` — Apollonian gasket
- `Cuboctahedron`, `Icosahedron`, `Octahedron`, `Dodecahedron` (refactored)
- `RhombicDodecahedron`, `Coxeter`, `RhombicTriacontahedron`
- `TruncatedIcosahedron`, `GreatStellatedDodecahedron`

Most of these only have `const` preamble declarations (no `preambleVars` needed). `Coxeter` has `uRI_nc` mutable — included in `preambleVars`.

**Rodrigues refactor**: Several formulas that previously inlined the Rodrigues rotation code now call `gmt_precalcRodrigues` / `gmt_applyRodrigues` from `features/geometry/transforms.ts` via `loopInit`. This means they all share one implementation and automatically work with the rotation-swap in interlace.

---

## Files Changed This Session

| File | Change |
|------|--------|
| `types/fractal.ts` | Added `preambleVars?: string[]` to shader definition |
| `features/geometry/transforms.ts` | New file: shared GLSL transforms |
| `features/geometry/index.ts` | Export `SHARED_TRANSFORMS_GLSL` |
| `features/interlace/glslRewriter.ts` | Replaced regex discovery with explicit `preambleVars` |
| `features/interlace/index.ts` | Pass `preambleVars` to rewrite functions |
| `engine/SDFShaderBuilder.ts` | Full interlace support for mesh export shaders |
| `shaders/chunks/math.ts` | Include `SHARED_TRANSFORMS_GLSL` in mesh helpers |
| `formulas/KaliBox.ts` | Added `preambleVars` |
| `formulas/Claude.ts` | Added `preambleVars` |
| `formulas/MarbleMarcher.ts` | Added `preambleVars` |
| `formulas/Coxeter.ts` | Added `preambleVars` |
| `formulas/*.ts` (many) | Rodrigues refactor: use shared transforms via loopInit |
| `mesh-export/**` | Full interlace pipeline: store, GPU, UI components |
