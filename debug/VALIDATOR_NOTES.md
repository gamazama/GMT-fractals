# Shader Validator — Testing & Improvement Notes

## Pipeline
```
Run validator → Analyze JSONL → Fix highest-impact issue → Re-run → Update notes → Repeat
```

## Progress Summary
| Round | Pass | Fail | Skip | Delta | Fix |
|-------|------|------|------|-------|-----|
| 0 | 195 | 77 | 309 | — | Baseline |
| 1 | 200 | 72 | 309 | +5 | Math constants (Phi, TWO_PI) in scaffold |
| 2 | 200 | 72 | 309 | +0 | Windows CRLF + comment stripping in extractGlobals |
| 3 | 212 | 60 | 309 | +12 | literalInit globals emitted at file scope |
| 4 | 227 | 45 | 309 | +15 | HLSL aliases (float3/4), block comments, `const` qualifier, `varying`/`attribute` qualifiers, extended matrix types (mat3x4, ivec) |
| 5 | 239 | 33 | 309 | +8 | Raytracer variable stubs in scaffold |

**Total improvement: 195 → 239 pass (+44), 77 → 33 fail (-44)**

| 6 | 235 | 37 | 309 | -4 | extractGlobals moved after preprocessing (Phi expansion), scaffold dedup fixes |
| 7 | 237 | 35 | 309 | +2 | ENGINE_DEFINES expanded (scaffold uniforms/globals) |
| 8 | 239 | 33 | 309 | +2 | CRLF #define regex fix (flag defines ate next line), engine function signature-aware rename |
| WebGL | 178 | 96 | — | — | GPU compile validation (Firefox, cache-busted) |
| DEC | 316 | 17 | 5 | — | DEC formula validation added |
| WebGL2 | 181 | 93 | — | — | Clean WebGL run (status contamination fixed, MAX_ITER cache-bust) |

**Total improvement: 195 → 238 pass (GLSL), 181 WebGL-verified, 316 DEC**

## Current State (Round 9 — Clean WebGL)
- **V3 Frags (GLSL)**: 238 pass / 33 fail / 309 skip (580 total, ~220 unique names)
- **V3 Frags (WebGL)**: 181 pass / 93 fail (274 tested — all 238 GLSL-pass tested)
- **Both GLSL+WebGL pass**: 176 (true GPU-verified count)
- **DEC (GLSL)**: 316 pass / 17 fail / 5 skip (338 total)
- **Passing-formulas.ts**: 178 frag paths + 316 DEC IDs (GLSL pass + no WebGL fail, exports `PASSING_FRAG_PATHS` + `PASSING_DEC_IDS`)
- **Existing tests**: 64/64 passing
- **Tool**: `npx tsx debug/shader-validator.mts [--quick|--dec|--frags|--webgl] [--no-server|--resume] [filter]`
- **Results**: `debug/shader-validator-results.jsonl`
- **Build list**: `npx tsx debug/build-passing-lists.mts [--webgl-only] [--dry-run]`

## V2 ↔ V3 Gap (Resolved)

**The Workshop now uses V3 as primary** with V2 fallback via `compat.ts`.

| | V2 (Workshop) | V3 (Validator) |
|---|---|---|
| Frag pass count | 147 | 238 |
| Global extraction | Regex, limited types | +HLSL aliases, +qualifiers, +CRLF |
| Globals emission | Inside DE body | File scope (helpers can reference) |
| Validation | GLSL parse only | GLSL parse (no GPU) |

**87 formulas pass V3 but fail V2** — primarily due to:
- Missing global variables (`sr23`, `pi2`, `power`, etc.) — V3 extracts these, V2 doesn't
- Globals emitted inside DE body in V2 → invisible to helper functions at file scope

**4 formulas passed V2 but fail V3** (removed from passing list):
- `AexionnSphereBoxRot4D`, `Aexions_TetraBox2` — parse errors in V3
- `Mandelbulb` (Historical) — VEC macro not expanded
- `VolumeOnly` — 2D formula (`density()` → `vec2 z`), not a 3D DE

## Live Testing Issues (User-Reported, 2026-03-20)

| Formula | Issue | Root Cause |
|---------|-------|-----------|
| Default Mandelbox | GPU compile: `float - int` mismatch | `fixIntFloatArithmetic` added `.` inside `float()` cast — **FIXED** |
| NewtonVarPowerWithRotatedFold | GPU compile error | Same `fixIntFloatArithmetic` issue — **FIXED** |
| VolumeOnly | GPU compile: vec2→vec3 mismatch | 2D formula forced into 3D template — removed from list |
| hyperbolic-tesselation (multiple) | Renders as sphere, params non-functional | Code gen produces valid GLSL but incorrect math (V4 concern) |
| sym4_1 | Formula appears corrupted | Likely code gen issue with complex formulas |
| hyperbolic-tesselation-bifurcating | Slider z-value affects other sliders | **Slot collision** — multiple params sharing uniform |

### Key Insight: Parse ≠ Compile ≠ Correct
Three levels of "working":
1. **GLSL parse** — syntax valid (what both V2 and V3 check)
2. **GPU compile** — type-safe, dimensions match (not checked anywhere yet)
3. **Render correctly** — formula produces expected fractal with working params

Our passing list validates level 1 only. User testing found failures at all three levels.

## WebGL Failures — 93 formulas (GPU compile errors)

Formulas that pass GLSL parse but fail WebGL GPU compilation (clean run with MAX_ITER cache-bust):

| Count | Category | Examples | Notes |
|-------|---------|---------|-------|
| 11 | Type mismatch (int/float) | Various | `float - int`, `int * float` — GLSL ES strict typing |
| 9 | No overload: DE signature | Various | Function signature doesn't match call site |
| 6 | Cannot convert (dimension) | Various | vec2→vec3, float→vec4 mismatches |
| 6 | Undeclared: `mc` (quadray) | quadray* | Multi-line `const mat3x4` not parsed |
| 4 | Syntax error | Dual numbers, reserved words | Exotic GLSL extensions |
| 3 | `frag_boxFold` signature | Various | Formula-side vec3 overload vs engine scalar |
| 3 | `C` redefinition | Kleinian* | Varying/global collision |
| 3 | Missing library funcs | cnoise, cSqr, udRoundBox | Unresolved includes |
| ~51 | Misc (1-2 each) | Various | Scope, rename, exotic patterns |

### Key fixes during WebGL round
- **extractGlobals ordering**: Moved after preprocessing so `#define Phi` is expanded before globals are extracted. Fixed 9 formulas.
- **frag_boxFold scaffold collision**: Removed from scaffold — per-formula injection via `FRAG_BUILTIN_FOLDS` only. Fixed 189 formulas in one run.
- **Scaffold variable dedup**: Auto-strips `iGlobalTime`, `pixelSize`, `iResolution`, `escape` from scaffold when formula provides its own.
- **Cache busting**: Chrome GPU shader caching prevented re-validation. Added nonce + no-cache headers. Firefox used for accurate results.
- **Engine function collision rename** (Round 7): Formula-defined functions that collide with engine builtins (e.g. `mod289(vec3)` vs engine's `mod289(vec3)`, `float map(vec3)` vs engine's `vec4 map(vec3)`) are renamed to `frag_<name>`. Uses signature matching — only renames when param types match, allowing GLSL overloads to coexist (e.g. formula's `vec3 permute(vec3)` doesn't collide with engine's `vec4 permute(vec4)`). Also added engine noise stubs to test scaffold.
- **Builtin filter fix**: When formula functions are renamed (e.g. `mod289→frag_mod289`), the include builtin filter no longer strips the builtin overloads — they're needed since the formula's version has a different name now.
- **WebGL status contamination fix** (Round 9): The validator was overwriting `status: 'pass'` to `status: 'fail'` when WebGL failed, contaminating GLSL results in the JSONL. Fixed by keeping `status` (GLSL) and `webglStatus` (GPU) as separate fields.
- **MAX_ITER cache-bust** (Round 9): GPU shader caching caused false passes. Each formula now gets a unique `MAX_HARD_ITERATIONS` value (500, 499, 498...) to force genuine recompilation — the loop count change can't be optimized away like a const float nonce.

## DEC Failures — 17 formulas (GLSL parse errors)

| Count | Category | Examples |
|-------|---------|---------|
| ~8 | GLSL parser limitations | Syntax not supported by @shaderfrog/glsl-parser |
| ~5 | Preprocessor directives | `#define` inside DE body |
| ~4 | Exotic constructs | Ternary chains, unusual casts |

## Remaining GLSL Failures — 37 frag formulas

(Renamed from "33 Failures" — count increased slightly due to re-run variance)

## Remaining 33 Failures — Breakdown

| Count | Category | Examples | Fixable? |
|-------|---------|---------|----------|
| 6 | Multi-line const (mat3x4) | quadray* `mc` | Needs multi-line global parsing |
| 5 | GLSL parser limitations | Doyle*, Newton*, Aexion* | Won't fix |
| 2 | Dual number types | 00-Mandelbox, 00-Mandelbulb | Won't fix (exotic extension) |
| 2 | `splititer1` — int uniform overflow | Funball* | Investigate slot assignment for int params |
| 2 | `sinpin` | hyperbolic-tesselation* | Investigate — likely scope/rename |
| 2 | `material` | iqPath4frag* | Investigate — likely computed global |
| 2 | `bColoring` | testSoC* | Investigate |
| 12 | Misc singletons | Various | Mix of scope, rename, exotic |

## Fixes Applied (Code Changes)

### `v3/analyze/globals.ts`
- Strip `\r` before processing (Windows CRLF)
- Strip block comments (`/* */`) and line comments (`//`)
- Support `const`, `varying`, `attribute` qualifiers
- Extended type regex: HLSL aliases (`float2/3/4`, `double`), `ivec2/3/4`, `mat2x3/3x4` etc.

### `v3/generate/index.ts`
- Emit `literalInit` globals at file scope (before helpers), not just inside DE body
- Engine function collision rename: signature-aware detection of formula functions that collide with engine builtins (`mod289`, `permute`, `taylorInvSqrt`, `snoise`, `map`, `mapDist`). Renames to `frag_<name>` only when param types match.
- Builtin filter updated: renamed formula functions no longer trigger stripping of include builtins

### `v3/generate/full-de.ts`
- Changed literalInit from declaration to assignment (global now declared at file scope)

### `v3/generate/init.ts`
- Same: assignment instead of re-declaration for literalInit globals

### `v3/analyze/preprocess.ts`
- Normalize CRLF → LF at the start of preprocessing
- Fix `#define` regex: use `[^\S\n]` instead of `\s` to prevent matching across lines (flag-only `#define` like `#define providesInit` was eating the next line as its value)

### `debug/shader-validator.mts`
- Added Phi, TWO_PI, M_PI to scaffold defines and ENGINE_DEFINES
- Added raytracer variable stubs (BackgroundColor, SpotLightPos, etc.)
- Added engine noise function stubs (mod289, permute, taylorInvSqrt, snoise) to scaffold for accurate WebGL collision detection
- Expanded ENGINE_DEFINES with scaffold uniforms/globals (subframe, rCoC, iResolution, etc.)
- JSONL streaming output, `fragPath` in results
- `--quick` flag (skip DEC), `--no-server` flag (CLI only), `--resume` flag
- Per-test timeout (5s) to catch hangs
- Cache-busting nonce, no-cache headers for WebGL mode
- WebGL status contamination fix: `status` (GLSL) and `webglStatus` (GPU) kept as separate JSONL fields
- MAX_ITER cache-bust: each WebGL shader gets unique `MAX_HARD_ITERATIONS` (500, 499, 498...) to defeat GPU shader cache

### `debug/build-passing-lists.mts`
- Rewritten to output `PASSING_FRAG_PATHS` (relative paths) and `PASSING_DEC_IDS` instead of bare formula names
- Discovers paths from filesystem by matching formula names to actual .frag files
- Supports both frag and DEC results from JSONL

## Architecture Notes (V4 Considerations)

### 1. Normalize line endings first
Windows CRLF broke multiple regexes silently. `\r` prevents `$` from matching in `/pattern$/` and `.` doesn't match `\r` either.
**V4**: Normalize `\r\n` → `\n` as the very first pipeline step.

### 2. Dependency tracing > declaration-pattern-matching for globals
V3 scans for global declarations by regex pattern. This misses:
- Lines with trailing comments (fixed, but fragile)
- `const`, `varying`, `attribute` qualified types (fixed, but extensible)
- Multi-line declarations (e.g. `const mat3x4 mc = mat3x4(...)` spanning 3 lines)
- HLSL-style types (fixed for simple cases)

**V4**: Do **dependency tracing from the DE function**. Walk all identifiers used by DE and its callees, collect the transitive closure of globals they reference. This naturally handles any declaration style because you're tracing usage, not parsing declarations.

### 3. Raytracer variables are noise, not signal
~12 failures came from variables defined in `DE-Raytracer.frag` (`BackgroundColor`, `SpotLightPos`, etc.). GMT provides its own raytracer, so these are irrelevant. We stubbed them in the test scaffold, but they can also appear in generated code.

**V4**: During preprocessing, identify and discard code from raytracer includes. Only keep the DE function, its helpers, and their dependencies. The include system should know which files are "scaffolding" (raytracer, color mapping) vs "formula" (math helpers, DE utilities).

### 4. Include resolution needs a file registry
The preprocessor resolves ~15 known includes from builtins. But the reference library has many more include files. Formulas that `#include "BenesiPine.frag"` or `#include "quadray-base.frag"` fail silently.

**V4**: Build a registry of ALL .frag files available for include. Resolve them transitively. Track which includes succeed/fail explicitly.

### 5. Multi-line declarations need accumulation
6 failures are from `const mat3x4 mc = mat3x4(vec4(...), vec4(...), vec4(...));` spanning multiple lines. Line-by-line parsing can't handle this.

**V4**: Either:
- Accumulate lines until balanced parentheses (simple)
- Run extractGlobals on the AST instead of raw text (robust but requires successful parse)
- Join continuation lines before scanning (detect by trailing `,` or unbalanced parens)

### 6. Int uniforms may overflow available slots
`splititer1` is a `uniform int` that passed analysis but didn't get a uniform slot. The slot allocator may not support enough int params, or int params may need special handling.

**V4**: Audit slot allocation for all param types. Consider baking int params as constants when slots are exhausted.

### 7. Slot collision detection and prevention
Live testing revealed params sharing the same uniform slot, causing "slider X affects slider Y" behavior. The V2 `build-passing-lists.mts` has `validateSlotMappings()` that catches some collisions, but it only blocks formulas from the passing list — it doesn't fix them.

**V4**: Slot assignment should be deterministic with overflow handling. When all typed slots (6 scalar, 3 vec2, 3 vec3, 3 vec4) are exhausted, remaining params should be baked as constants at their preset-resolved defaults, with a warning. Never silently double-assign a slot.

### 8. Formulas that compile but render incorrectly (sphere + dead params)
Multiple hyperbolic-tesselation formulas compile and pass GLSL parse, but render as a sphere with non-functional parameters. This suggests the code generation produces _syntactically valid_ but _semantically wrong_ GLSL — the math doesn't implement the original formula.

Likely causes:
- Rename map misses some variable references (original names survive, but uniforms use new names)
- Computed globals that depend on uniforms get wrong values (init code ordering)
- Full-DE mode wrapping changes the control flow in ways that break the algorithm

**V4**: Add a "smoke test" mode that renders a low-res frame and checks it's not a trivial sphere (e.g., distance field should vary across the image). This catches the "compiles but doesn't work" category.

### 9. Workshop must migrate to V3 pipeline
The Workshop currently uses V2 (`detectFormula` + `buildTransformResult`). The V3 pipeline fixes 87 additional formulas. Until the Workshop switches to V3, users only benefit from the weaker V2 code generation.

**V4**: Complete the V3→Workshop integration (Phase 4 of the V3 plan). The V3 `compat.ts` adapter exists but isn't wired into the Workshop UI yet.
