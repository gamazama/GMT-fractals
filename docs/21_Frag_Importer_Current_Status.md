# Fragmentarium Importer — Current Status

**Last Updated:** 2026-03-20
**Status:** V3 pipeline operational. 64/64 test formulas passing. Formula library with 494 verified formulas. Workshop UI with Browse, Random, Preview, and Import.

---

## Architecture

The importer has two pipelines: **V3** (primary, AST-based) and **V2** (fallback). The Workshop tries V3 first; if it fails (e.g. no DE function detected), V2 takes over automatically.

### File Structure

```
features/fragmentarium_import/
├── FormulaWorkshop.tsx         # Workshop UI — split-screen with toolbar, resizable source editor
├── types.ts                    # V2 shared types (FragDocumentV2, TransformedFormulaV2, WorkshopDetection, etc.)
├── formula-library.ts          # Categorized index of 494 verified formulas (Browse Library)
├── passing-formulas.ts         # Auto-generated lists of verified formula paths/IDs
├── random-formulas.ts          # DEC formula collection (code + metadata)
├── index.ts                    # Public exports
│
├── v3/                         # V3 pipeline (primary)
│   ├── types.ts                # Unified types: ImportedParam, FormulaAnalysis, GeneratedFormula
│   ├── compat.ts               # V3 ↔ V2 adapter (detectFormulaV3, transformFormulaV3)
│   ├── analyze/                # Source → FormulaAnalysis
│   │   ├── index.ts            # analyzeSource() orchestrator
│   │   ├── preprocess.ts       # Strip Frag syntax, resolve #include → inline builtins
│   │   ├── functions.ts        # Extract functions, detect DE, extract loops (AST)
│   │   ├── params.ts           # Extract uniforms + slider annotations → ImportedParam[]
│   │   ├── globals.ts          # Classify globals: computed, uninitialized, literal-init
│   │   └── init.ts             # Classify init() statements by frequency (once vs per-pixel)
│   └── generate/               # FormulaAnalysis → GeneratedFormula
│       ├── index.ts            # generateFormula() orchestrator
│       ├── slots.ts            # Auto-assign params to engine slots (paramA..F, vec3A..C, etc.)
│       ├── rename.ts           # Build rename map from ImportedParam[] + AST rename
│       ├── uniforms.ts         # Generate uniform/const declarations
│       ├── loop-body.ts        # Extract, rename, transform loop body
│       ├── get-dist.ts         # Generate getDist expression
│       ├── full-de.ts          # Full-DE fallback (entire DE in one call)
│       ├── patterns.ts         # Vec4 tracker, accumulator, swizzle write expansion
│       └── init.ts             # Emit init code with frequency classification
│
├── parsers/                    # V2 parsers (fallback)
│   ├── ast-parser.ts           # Core AST-based GLSL parser
│   ├── preprocessor.ts         # Source preprocessing
│   ├── uniform-parser.ts       # V1 GenericFragmentariumParser
│   ├── builtins.ts             # GLSL helper strings
│   ├── dec-detector.ts         # DEC format detection
│   └── dec-preprocessor.ts     # DEC → Fragmentarium conversion
│
├── transform/                  # V2 transforms (fallback)
│   ├── code-generator.ts       # Orchestrates V2 transform → TransformedFormulaV2
│   ├── init-generator.ts       # Init code generation
│   ├── loop-extractor.ts       # Orbit trap normalization
│   ├── pattern-detector.ts     # Accumulator pattern detection
│   └── variable-renamer.ts     # UNIFORM_MAP, rename maps, AST rename
│
├── workshop/                   # Workshop helpers (shared by V2 and V3)
│   ├── detection.ts            # V2 detectFormula()
│   ├── preview.ts              # V2 buildTransformResult()
│   └── param-builder.ts        # buildFractalParams, slot utilities, isDegrees conversion
│
└── reference/
    └── Examples/               # 580+ reference .frag files from Fragmentarium
```

---

## V3 Pipeline Flow

```
User pastes/loads GLSL source (or Browse Library / Random picks a formula)
    │
    ├── detectFormulaV3(src, fileBaseName)           [v3/compat.ts]
    │   ├── detectDECFormat() → preprocessDEC()      (if DEC source detected)
    │   ├── analyzeSource(src)                       [v3/analyze/index.ts]
    │   │   ├── preprocess() — strip annotations, resolve #include
    │   │   ├── extractFunctions() — AST parse, find DE, extract loops
    │   │   ├── extractParams() — uniforms + slider annotations → ImportedParam[]
    │   │   │   └── isDegrees detection (name + range heuristics)
    │   │   ├── extractGlobals() — computed/uninitialized/literal-init
    │   │   ├── classifyInit() — once vs per-pixel frequency
    │   │   └── extractPresets() — resolve preset default values
    │   ├── autoAssignSlots() — map params to engine slots
    │   └── analysisToDetection() — V3 FormulaAnalysis → V2 WorkshopDetection
    │
    ├── FormulaWorkshop UI (user reviews/adjusts mappings)
    │
    ├── transformFormulaV3(detection, func, loopMode, name, mappings)  [v3/compat.ts]
    │   ├── analyzeSource() — re-analyze from raw source
    │   ├── generateFormula()                        [v3/generate/index.ts]
    │   │   ├── buildRenameMap() from ImportedParam[]
    │   │   ├── generateUniforms() — uniform/const declarations
    │   │   ├── generateInit() — with frequency classification
    │   │   ├── extractLoopBody() + AST rename
    │   │   ├── strip g_orbitTrap shadow declarations
    │   │   ├── detect vec4 tracker patterns
    │   │   ├── detect accumulator pattern
    │   │   ├── generateGetDist() — expression rename + substitution
    │   │   └── OR generateFullDE() — fallback when per-iteration fails
    │   └── generatedToTransformed() — V3 GeneratedFormula → V2 TransformedFormulaV2
    │
    └── buildFractalParams() + register → live preview / import
```

---

## Formula Library

The formula library (`formula-library.ts`) provides a categorized index of all verified formulas:

- **494 formulas** total: 178 Fragmentarium + 316 DEC
- **Categorized** by fractal family/technique (Mandelbox, Mandelbulb, IFS, Kleinian, etc.)
- **Attributed** to artists/collectors (directory name = attribution for frag files)
- **Lazy-loaded** via Vite's `import.meta.glob()` with `?raw` query

### Passing Formula Lists

`passing-formulas.ts` contains auto-generated lists of formulas verified to compile:
- `PASSING_FRAG_PATHS` — 178 relative paths into `reference/Examples/`
- `PASSING_DEC_IDS` — 316 DEC formula IDs

**Regenerate with:** `npx tsx debug/build-passing-lists.mts`
**Validation:** GLSL syntax check + WebGL2 compilation (with GPU cache-busting via unique MAX_HARD_ITERATIONS per shader)

### Workshop Browse Library

The Browse Library button opens a `CategoryPickerMenu` with categories on the left and formulas on the right. Selecting a formula loads it into the source editor and auto-detects.

---

## Workshop UI

The Workshop is a split-screen panel (left ~50%, viewport right ~50%):

### Toolbar (always visible)
- **Browse Library** — categorized formula picker (494 formulas)
- **Random Frag** — load a random verified Fragmentarium formula
- **Random DEC** — load a random verified DEC formula
- **Load File** — load a .frag/.glsl/.txt from disk

### Sections
1. **Source Code** — collapsible, resizable (100–800px drag handle), GLSL editor with syntax highlighting
2. **Iteration Function** — function selector, loop mode toggle (Extract loop body / Whole function)
3. **Parameters** — formula name, slot mapping table with component packing and bool flag groups
4. **Transformed Output** — read-only annotated view of generated GLSL

### Footer
- **Cancel** — restore previous formula if preview was active
- **Preview** — register temporary formula and switch to it (non-destructive)
- **Import Formula** — register as permanent formula and close Workshop

---

## Key Fixes and Behaviors

### g_orbitTrap Shadow Fix
Fragmentarium formulas often declare `vec4 orbitTrap = vec4(10000.0);` inside their DE body. After rename, this becomes `vec4 g_orbitTrap = vec4(10000.0);` — a **local variable** that shadows the engine's global `g_orbitTrap`. Trap writes go to the local, engine reads the untouched global (1e10), coloring gets a constant value.

**Fix:** Both `v3/generate/index.ts` and `v3/generate/full-de.ts` strip the `vec4` prefix from `g_orbitTrap` declarations post-rename:
```typescript
code.replace(/\bvec4\s+g_orbitTrap\b/g, 'g_orbitTrap');
```
This converts the local declaration into an assignment to the engine global.

For formulas that don't use `orbitTrap` at all, a default trap fallback is injected:
```glsl
trap = min(trap, dot(f_z, f_z));
```

### Degree/Radian Handling (isDegrees)
Fragmentarium sliders use degrees (e.g., `slider[0, 0, 360]`). The V3 analyzer detects degree parameters via:
- **Name heuristics:** contains "angle", "rot", "theta", "phi", "yaw", "pitch", "roll"
- **Range heuristics:** range spans ±90, ±180, ±360

When `isDegrees=true`:
- `param-builder.ts` keeps the internal value in **degrees** (what the GLSL expects)
- Sets `scale: 'degrees'` on the UI param
- `FormulaPanel.tsx` renders with π notation display: 360° shows as "2.00π", 90° as "0.50π"
- The slider sends degrees to the shader — no conversion occurs

This is distinct from `scale: 'pi'` (used by DDFS features) where internal values are in radians.

### Full-DE Fallback Mode
When per-iteration loop extraction would break rendering (out-of-scope locals in getDist, unbounded vec4 inversions), the generator falls back to **full-DE mode**:
- The entire DE function runs inside a single `frag_DE(vec3 f_z)` call
- `formula_NAME()` calls `frag_DE()` once, caches the distance, and forces engine bailout
- Orbit trap tracking and iteration counting are injected into the main loop
- Hardcoded loop limits are replaced with `MAX_HARD_ITERATIONS` + `uIterations` break

---

## Generated Formula Structure

```glsl
// ─── HELPERS ─── (builtins + renamed user helper functions)
mat3 rotationMatrix3(...) { ... }
void frag_boxFold(inout vec3 z, ...) { ... }

void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 f_z = z.xyz;

    // INIT_CODE (globalDecls + computedGlobals + inlined init() body):
    mat3 rot;
    vec4 scale = vec4(uParamA, ...);
    rot = rotationMatrix3(...);

    // PRE-LOOP DECLARATIONS (vec4 tracker, for-loop counter):
    vec4 p = vec4(f_z, 1.0);

    // LOOP_BODY (one iteration, extracted from while/for body):
    p.xyz = abs(p.xyz) + uVec3A;
    trap = min(trap, length(abs(p.xyz)));
    dr = dr * abs(uParamA);

    // POST_LOOP_UPDATE (only if vec4 tracker):
    f_z = p.xyz;
    dr = p.w;

    z.xyz = f_z;
}
```

---

## getDist Generation

`getDist` is injected into the shader as:
```typescript
getDistBody = `vec2 getDist(float r, float dr, float iter, vec4 z) { ${def.shader.getDist} }`;
```

### Path 1: Accumulator (NewMenger / d=max(d,d1))
Detected by accumulator pattern detector. The `dr` variable holds accumulated distance:
```glsl
return vec2(dr, iter);
```

### Path 2: Expression (all other formulas)
Uses the last `return` statement from the DE function. Rename pipeline:
1. Parse expression as GLSL AST, apply rename map
2. Post-AST substitutions: `f_z → z.xyz`, `length(z.xyz) → r`, `z.w → dr`
3. Inline computed globals by value

### Path 3: Full-DE mode
Distance is cached from the single `frag_DE()` call:
```glsl
return vec2(frag_cachedDist, frag_iterCount);
```

### Path 4: No distanceExpression (fallback)
If no return statement found, `getDist` is `undefined` — engine uses its standard estimator.

---

## What Works (as of 2026-03-20)

| Feature | Status |
|---------|--------|
| V3 analysis pipeline (AST-based) | Working — 64/64 tests |
| V3 code generation (per-iteration + full-DE) | Working |
| V2 fallback for V3-incompatible formulas | Working |
| Formula library (494 formulas, categorized) | Working |
| Browse Library in Workshop | Working |
| Random Frag / Random DEC buttons | Working |
| `#include` → builtin injection | Working |
| Computed globals → local var hoisting | Working |
| `void init()` body inlined with frequency classification | Working |
| Vec4 tracker detection (Pattern A/B/C) | Working |
| Orbit trap coloring (g_orbitTrap shadow fix) | Working — fixed |
| AST-based variable renaming | Working |
| Julia bool mapping | Working |
| Preset extraction and default values | Working |
| isDegrees auto-detection + π display | Working |
| Accumulator pattern (d=max(d,d1)) | Working |
| getDist expression path | Working |
| Full-DE fallback mode | Working |
| Workshop Preview + Import | Working |
| Re-edit previously imported formula | Working |
| DEC format detection and preprocessing | Working |

---

## Known Remaining Issues

### Local vars in getDist scope
Some formulas use local variables in getDist that are out of scope after loop extraction:
- QuaternionJulia, LivingKIFS, BioCube, FoldcutToy, RecFold (`dp`, `de1` etc.)
- These fall back to full-DE mode which avoids the issue

### PseudoKleinian orbit trap
DE runs in a helper function; orbit trap writes from the helper don't propagate through the formula function. Coloring shows constant values. Full-DE mode partially mitigates this.

### `p` variable conflict
Formulas where DE parameter name matches the local vec4 tracker name (`float DE(vec3 p)` + `vec4 p;`). DE param rename `p→f_z` also renames the tracker. Usually handled by the V3 pipeline's scope-aware renaming.

---

## Testing

Run the full test suite:
```bash
npx tsx debug/test-frag-importer.mts        # 64/64 passing
npx tsx debug/test-deg.mts                  # isDegrees verification
npx tsx debug/build-passing-lists.mts       # Regenerate passing-formulas.ts
```

Quick smoke test sequence:
1. `Tutorials/11 - Simple Distance Estimated 3D fractal.frag` — Menger IFS, getDist expression
2. `Historical 3D Fractals/Mandelbox.frag` — vec4 tracker, dr accumulation
3. `Kaleidoscopic IFS/Tetrahedron.frag` — IFS with rotation in init()
4. `Kashaders/Fractals/KIFSandCO/CubeKoch01.frag` — isDegrees (RotAngle 0→360)
5. Random DEC formula — DEC preprocessing + code pattern classification
