# Fragmentarium Importer — Current Status

**Last Updated:** 2026-03-07
**Status:** Core pipeline working. Modular refactor complete. getDist generation analysis documented below. Shadow correctness not yet verified post-refactor.

---

## Architecture: Modular File Structure

```
features/fragmentarium_import/
├── FormulaWorkshop.tsx         # Main entry UI — split-screen workshop
├── types.ts                    # All shared types (FragDocumentV2, TransformedFormulaV2, WorkshopDetection, etc.)
├── index.ts                    # Public exports
├── TESTING_GUIDE.md            # 580-formula testing matrix
│
├── parsers/
│   ├── ast-parser.ts           # Core AST-based GLSL parser (parseFragmentariumSource, analyzeAsDE, etc.)
│   ├── preprocessor.ts         # Source preprocessing: strip annotations, extract computed globals
│   ├── uniform-parser.ts       # V1 GenericFragmentariumParser — uniform slider annotation extraction
│   └── builtins.ts             # GLSL helper strings: rotationMatrix3, frag_boxFold, sdBox, sdSphere
│
├── transform/
│   ├── code-generator.ts       # Orchestrates all transform steps → TransformedFormulaV2
│   ├── init-generator.ts       # generateInitCode (globalDecls + computedGlobals + init() body)
│   ├── loop-extractor.ts       # transformTrapMinWithAST — orbit trap min() → length()
│   ├── pattern-detector.ts     # detectAndApplyAccumulatorPattern (NewMenger-style d=max(d,d1))
│   └── variable-renamer.ts     # UNIFORM_MAP, buildDERenameMap, renameVariables (AST), applyRenameToExpression
│
├── workshop/
│   ├── detection.ts            # detectFormula() — pure analysis function for workshop Step 1-3
│   ├── preview.ts              # buildTransformResult() — builds TransformedFormulaV2 for preview/import
│   └── param-builder.ts        # buildWorkshopParams, slotOptionsForType, slotLabel
│
└── reference/
    └── Examples/               # 580 reference .frag files from Fragmentarium
```

---

## Full Pipeline

```
User pastes/loads GLSL source
    │
    ├── detectFormula(src, fileBaseName)         [workshop/detection.ts]
    │   ├── GenericFragmentariumParser.parse()   [parsers/uniform-parser.ts] V1 uniform extraction
    │   ├── parseFragmentariumSource()           [parsers/ast-parser.ts]
    │   │   ├── preprocessFragmentariumSource()  strip annotations, computed globals, includes
    │   │   ├── @shaderfrog/glsl-parser parse()
    │   │   ├── findDEFunction / findHelperFunctions / findInitFunction
    │   │   ├── extractLoopInfo (while/for, counterVar, counterInitDecl)
    │   │   ├── extractDistanceExpression (last return statement)
    │   │   └── extractComputedGlobals / extractGlobalDeclarations
    │   ├── getAllFunctionCandidates()
    │   ├── autoMapParams() — UNIFORM_MAP + V1 slot assignments
    │   └── buildWorkshopParams() — WorkshopParam[] with ui min/max/step/default
    │
    ├── FormulaWorkshop UI (user reviews/adjusts mappings)
    │
    ├── buildTransformResult()                   [workshop/preview.ts]
    │   └── generateFormulaCode()                [transform/code-generator.ts]
    │       ├── buildDERenameMap (param→f_z, uniforms→uXxx)
    │       ├── inject builtins (rotationMatrix3, frag_boxFold, etc.)
    │       ├── renameVariables on helper functions (AST)
    │       ├── extract + rename loop body (AST)
    │       ├── transformTrapMinWithAST (orbit trap normalization)
    │       ├── generateInitCode (globalDecls + computedGlobals + init())
    │       ├── extractPreLoopDeclarations (pre-loop variable decls from DE body)
    │       ├── detect vec4 tracker (Pattern A: vec4 p=vec4(f_z,...) / B/C split forms)
    │       ├── detectAndApplyAccumulatorPattern (d=max(d,d1) → dr accumulator)
    │       └── generate getDist code string (see below)
    │
    └── FractalDefinition registered in registry, setFormula → live preview
```

---

## Generated Formula Structure

```glsl
// ─── HELPERS ─── (builtins + renamed user helper functions)
mat3 rotationMatrix3(...) { ... }
void frag_boxFold(inout vec3 z, ...) { ... }

void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 f_z = z.xyz;

    // INIT_CODE (globalDecls + computedGlobals + inlined init() body):
    mat3 rot;                                // hoisted globalDecl
    vec4 scale = vec4(uParamA, ...);         // computedGlobal (local, renamed)
    rot = rotationMatrix3(...);              // inlined init() body

    // PRE-LOOP DECLARATIONS (vec4 tracker, for-loop counter):
    int i = 0;                               // for-loop counter
    vec4 p = vec4(f_z, 1.0);                // Pattern A tracker
    // — OR —
    vec4 p; p.xyz = f_z; p.w = dr;          // Pattern B/C tracker (1.0 patched to dr)

    // LOOP_BODY (one iteration, extracted from while/for body):
    p.xyz = abs(p.xyz) + uVec3A;
    trap = min(trap, length(abs(p.xyz)));    // orbit trap (transformTrapMinWithAST)
    dr = dr * abs(uParamA);                  // IFS dr accumulation

    // POST_LOOP_UPDATE (only if vec4 tracker):
    f_z = p.xyz;
    dr = p.w;

    z.xyz = f_z;
}
```

---

## getDist Generation (critical — read carefully)

`getDist` is injected into the shader as:
```typescript
// core_math.ts
getDistBody = `vec2 getDist(float r, float dr, float iter, vec4 z) { ${def.shader.getDist} }`;
```

The generator in `code-generator.ts` produces `getDist` via three separate paths:

### Path 1: Accumulator (NewMenger / d=max(d,d1))
Detected by `detectAndApplyAccumulatorPattern()`. The `dr` variable is repurposed to hold the accumulated distance:
```glsl
return vec2(dr, iter);
```

### Path 2: Expression (all other formulas)
Uses the **last `return` statement** extracted from the DE function body via `extractDistanceExpression()`.

Rename pipeline for the expression:
1. Parse expression as GLSL AST
2. Apply `getDistRenameMap` = `{ ...renameMap, 'f_z': 'z.xyz', 'f_i': 'int(iter)', counterVar: 'int(iter)', vec4Tracker: 'z' }`
   - Note: renameMap has `z → f_z`, so AST rename `z → f_z`. Post-rename regex: `f_z → z.xyz`
3. Post-AST regex substitutions:
   - `f_z` → `z.xyz`
   - `length(z.xyz)` → `r`
   - `length(z)` → `r`
   - `z.w` → `dr` (if vec4 tracker)
4. Inline computed globals (substituted by value)

**Example — Tutorial 11 (Menger IFS):**
- Original return: `abs(length(z)-0.0) * pow(Scale, float(-n))`
- After rename: `abs(length(z.xyz) - 0.0) * pow(uParamA, float(-int(iter)))`
- After `length(z.xyz)→r`: `abs(r - 0.0) * pow(uParamA, float(-int(iter)))`
- Final: `return vec2(abs(r - 0.0) * pow(uParamA, float(-int(iter))), iter);`

This is **correct** — Menger DE is `|z| * Scale^(-n)`, not `r/dr`.

**Important note on IFS formulas:**
The old docs described a broken `r/dr` path that was allegedly removed. In fact, `r/dr` was never correct for all IFS formulas:
- Menger/Tetrahedron: return `length(z) * pow(abs(Scale), -n)` → handled correctly by expression path
- Mandelbox: accumulates `dr *= abs(Scale)`, returns `length(z) / abs(dr)` → also handled by expression path (`r / abs(dr)`)
- **There is no separate IFS `r/dr` fallback path** — the expression path handles both correctly

**Potential issue: counterVar in getDist scope**
`counterVar` (e.g. `n`) maps to `int(iter)` in getDist rename. `iter` in getDist is the loop exit iteration count (float). This is correct for while loops that run to completion. However, for loops with `break` statements, `iter` would be the break-iteration count — this is also what we want.

### Path 3: No distanceExpression (fallback)
If no return statement is found (e.g. void functions, function only returns inside break), `getDist` is `undefined`. The engine falls back to the standard `core_math.ts` estimator (user-selectable: Analytic, Linear, Pseudo, etc.).

---

## What Works (as of 2026-03-07)

| Feature | Status |
|---------|--------|
| `#include` → builtin injection (rotationMatrix3, frag_boxFold, sdBox, sdSphere) | Working |
| Computed globals → local var hoisting | Working |
| `mat3 rot;` global mutable state → hoisted local | Working |
| `void init()` body inlined into formula function | Working |
| Vec4 tracker detection (Pattern A/B/C) | Working |
| Formula-specific uniforms included in shader | Working |
| orbit trap `min(trap, abs(vec4(...)))` → length() | Working |
| AST-based variable renaming (z→f_z, uniform names→uXxx) | Working |
| `boxFold` → `frag_boxFold` (conflict rename) | Working |
| `sphereFold` NOT re-injected (GMT already provides it) | Working |
| Julia bool mapping (`Julia → uJuliaMode > 0.5`) | Working |
| Preset extraction and default values | Working |
| Slider min/max/default from annotations | Working |
| File name used as formula name | Working |
| UNIFORM_MAP slot auto-mapping + V1 slot fallback | Working |
| Default param values shown in Workshop and applied on import | Working |
| Accumulator pattern (d=max(d,d1) NewMenger-style) | Working |
| getDist expression path (IFS and vec4-tracker formulas) | Working (analysis above) |
| Workshop split-screen UI with live preview | Working |
| Re-edit previously imported formula | Working |
| Shadows for IFS formulas | Not verified post-refactor |
| Orbit trap coloring | Not verified |

---

## Key Constants / Rename Map

```typescript
// transform/variable-renamer.ts
const UNIFORM_MAP = {
    'Scale':           'uParamA',
    'Offset':          'uVec3A',
    'OffsetV':         'uVec3A',
    'MinRad2':         'uParamB',
    'ColorIterations': 'uParamC',
    'Iterations':      'uIterations',
    'Julia':           '(uJuliaMode > 0.5)',
    'DoJulia':         '(uJuliaMode > 0.5)',
    'JuliaV':          '(uJuliaMode > 0.5)',
    'JuliaValues':     'uJulia',
    'JuliaC':          'uJulia',
};
// All other uniforms → u_NAME (formula-specific uniform) or mapped slot (user config)
```

Per-formula rename map built in `buildDERenameMap()`:
- DE parameter (pos/z/p) → `f_z`
- `z` (always) → `f_z`
- `orbitTrap` → `trap`
- `ColorIterations` → `int(uParamC)`
- `Iterations` → `int(uIterations)`
- All UNIFORM_MAP entries
- All document uniforms → `u_NAME` or user-selected slot

---

## Known Remaining Issues

### Shadow correctness post-refactor (unverified)
The refactored expression-path getDist should produce correct results for Menger/Tetrahedron/Mandelbox (see analysis above). However, actual rendering with shadows has not been verified since the refactor. Need to test Tutorial 11 and Tutorial 12 with shadows enabled.

### Orbit trap coloring
IFS formulas that don't update `trap` show flat color — expected. The `transformTrapMinWithAST` in `loop-extractor.ts` normalizes `orbitTrap = min(orbitTrap, vec4/vec3 expr)` to `trap = min(trap, length(...))`. Coloring mode interaction not verified.

### `p` variable conflict in Kalibox-variant formulas
Formulas where the DE parameter name matches the local vec4 tracker name (e.g. `float DE(vec3 p)` and `vec4 p;`). The DE param rename `p→f_z` also renames the tracker variable. Workaround: rename the local vec4 in source before importing, or pick a different tracker variable name.

### `loopMode: 'single'`
When the user selects "single iteration" mode in the Workshop, `loopInfo` is set to `null` — the formula body is run once per step instead of being wrapped in GMT's main iteration loop. getDist is typically absent in this case (falls back to engine estimator).

---

## Testing

See `TESTING_GUIDE.md` for the full formula test matrix (580 reference formulas).

Quick smoke test sequence:
1. `reference/Examples/Tutorials/11 - Simple Distance Estimated 3D fractal.frag` — Menger IFS, getDist expression path
2. `reference/Examples/Historical 3D Fractals/Mandelbox.frag` — vec4 tracker, dr accumulation
3. `reference/Examples/Kaleidoscopic IFS/Tetrahedron.frag` — IFS with rotation matrix in init()
4. `reference/Examples/Knighty Collection/NewMenger.frag` (if present) — accumulator pattern
