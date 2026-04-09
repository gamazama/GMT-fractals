# Formula Developer Reference
> Last updated: 2026-04-08 | GMT v0.9.1

Unified reference for writing, debugging, and maintaining GMT native formula files (`formulas/*.ts`). Covers the full API surface, quirks, workarounds, and common patterns.

**Related docs:**
- [22_Frag_to_Native_Formula_Conversion.md](22_Frag_to_Native_Formula_Conversion.md) — Step-by-step conversion from Fragmentarium .frag
- [23_Formula_Audit.md](23_Formula_Audit.md) — Per-formula correctness audit
- [24_Formula_Interlace_System.md](24_Formula_Interlace_System.md) — Interlace architecture, preambleVars contract

---

## 1. Formula File Structure

Every formula is a single `.ts` file in `formulas/` that exports a `FractalDefinition` object:

```typescript
import { FractalDefinition } from '../types';

export const MyFormula: FractalDefinition = {
    id: 'MyFormula',              // Must match FormulaType union in types/common.ts
    name: 'My Formula',           // Display name in UI
    shortDescription: '...',      // One-line summary for gallery tooltips
    description: '...',           // Full description for help panel
    juliaType: 'julia',           // How Julia mode works (see §2.3)
    tags: ['geometric', 'ifs'],   // Optional search/filter tags

    shader: { /* ... */ },        // GLSL code (see §3)
    parameters: [ /* ... */ ],    // UI parameter definitions (see §4)
    defaultPreset: { /* ... */ }, // Initial scene state (see §5)
};
```

### Registration

After creating the file:
1. Add the formula ID to `FormulaType` union in `types/common.ts`
2. Import and add to `formulas/index.ts`:
   - Import statement
   - Add to the `formulas[]` array (determines UI gallery order)
   - Add to the appropriate `PREDEFINED_CATEGORIES` category
3. If renaming an existing formula, add `registry.registerAlias('OldName', 'NewName')`

---

## 2. FractalDefinition Fields

### 2.1 `id` (required)
Must exactly match the string added to the `FormulaType` union in `types/common.ts`.

### 2.2 `shortDescription` / `description`
- `shortDescription`: Shown in formula gallery tooltips. Keep to one sentence.
- `description`: Full text for the help panel. Describe the math, the original author, and what makes it unique.

### 2.3 `juliaType`
Controls how the Julia toggle and Julia C constant behave:

| Value | Behavior | Use when |
|-------|----------|----------|
| `'julia'` | True Julia set — `c` is the iteration constant, `z` starts from position | Power fractals (Mandelbulb, Quaternion) |
| `'offset'` | `c.xyz` adds a constant translation (same effect as a Shift parameter) | IFS/fold fractals (Mandelbox, Kleinian, Claude) |
| `'none'` | Formula doesn't use Julia/c at all — hides the Julia toggle | Non-standard formulas (Borromean, Appell) |

When omitted, defaults to `'julia'`.

### 2.4 `flags`
```typescript
flags?: {
    coordinateMode?: 'Unified' | 'DataAware';
}
```
- `'Unified'` (default): Standard coordinate handling.
- `'DataAware'`: Formula handles its own coordinate transforms. Currently unused by native formulas; reserved for the Modular builder.

---

## 3. The Shader Object

The `shader` field defines all GLSL code for the formula. Understanding the execution order is critical:

### 3.1 Execution Order

```
┌─ Preamble (global scope, once per shader compile)
│   Formula preamble code + shared transforms GLSL
│
├─ map() / mapDist() called per ray step
│   │
│   ├─ z = vec4(p_fractal, uParamB)         ← paramB wired as z.w!
│   ├─ c = mix(z, vec4(uJulia, uParamA), …) ← paramA wired as c.w!
│   ├─ loopInit runs once
│   │
│   └─ Iteration loop (MAX_HARD_ITERATIONS, capped by uIterations)
│       ├─ applyPreRotation(z.xyz)           ← engine pre-rotation
│       ├─ Early bailout check
│       ├─ ── loopBody ──                    ← YOUR FORMULA RUNS HERE
│       ├─ applyPostRotation(z.xyz)          ← engine post-rotation
│       ├─ iter += 1.0
│       └─ Escape/overflow check
│
├─ r = getLength(z.xyz)  (distance metric)
├─ getDist(r, dr, iter, z) → vec2(distance, smoothIter)
└─ return
```

### 3.2 `shader.function` (required)

The formula's GLSL function definition. Signature is always:

```glsl
void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c)
```

| Parameter | Description |
|-----------|-------------|
| `z` | Current position. `z.xyz` = 3D coords, `z.w` = 4th dimension (initialized from `uParamB`) |
| `dr` | Derivative accumulator for distance estimation. Starts at `1.0` |
| `trap` | Orbit trap distance for coloring. Starts at `1e10`. Update with `trap = min(trap, ...)` |
| `c` | Iteration constant. In Mandelbrot mode: `c = z_initial`. In Julia mode: `c = vec4(uJulia, uParamA)` |

**Rules:**
- Modify `z`, `dr`, and `trap` in-place. Do NOT return a value.
- The iteration loop is external — your function is called once per iteration.
- Bailout is handled externally — do NOT check escape conditions.
- Always update `dr` to maintain correct distance estimation.

### 3.3 `shader.loopBody` (required)

The single line that calls your function inside the iteration loop. Usually just:

```typescript
loopBody: `formula_MyFormula(z, dr, trap, c);`
```

Some formulas do more complex things here (e.g., MandelTerrain runs its own internal loop with `break`).

### 3.4 `shader.loopInit` (optional)

Code that runs once before the iteration loop starts, after preamble functions are available. Common uses:

```typescript
// Call shared rotation pre-calculation
loopInit: `gmt_precalcRodrigues(uVec3B);`

// Call formula-specific precalc + shared rotation
loopInit: `Claude_precalc(); gmt_precalcRodrigues(uVec3B);`

// One-time coordinate transform (Icosahedron prefold)
loopInit: `/* expensive fold sequence that runs once */`
```

**Timing:** `loopInit` runs after preamble globals are initialized but inside `map()`, so it has access to `z`, `c`, `dr`, `trap`, and `iter`.

### 3.5 `shader.preamble` (optional)

Global-scope GLSL code injected before `map()`. Used for:
- Pre-calculated constants and helper functions
- Mutable globals that persist across the `map()` call (updated in `loopInit`)

```glsl
// Constants (immutable) — no special handling needed
float claude_Phi;
vec3 claude_n1;

// Mutable globals — MUST be listed in preambleVars for interlace support
vec3 uCl_n4;
bool uCl_doHarmonic;

void Claude_precalc() {
    claude_Phi = (1.0 + sqrt(5.0)) * 0.5;
    // ...
}
```

**QUIRK: `const` restriction in GLSL ES 3.0.** You cannot use built-in functions (`sqrt`, `normalize`, `cos`, etc.) to initialize `const` declarations. This compiles on some drivers but fails on stricter ones (Error 1282 / VALIDATE_STATUS false). Always use non-const globals initialized in a precalc function instead:

**QUIRK: Do not redeclare global `#define` constants.** The shader preamble defines `PI`, `INV_PI`, and other constants as `#define` macros (see `shaders/chunks/math.ts`). Declaring `const float PI = ...` inside a formula function shadows the macro AND triggers the const restriction on strict drivers — same Error 1282. Just use `PI` directly without redeclaring it.

```glsl
// BAD — fails on strict GLSL ES 3.0 drivers:
const float Phi = (1.0 + sqrt(5.0)) * 0.5;
const vec3 n1 = normalize(vec3(-1.0, 0.618, 1.618));

// GOOD — initialize in precalc function:
float Phi;
vec3 n1;
void MyFormula_precalc() {
    Phi = (1.0 + sqrt(5.0)) * 0.5;
    n1 = normalize(vec3(-1.0, 0.618, 1.618));
}
```

**QUIRK: Preamble assembly order.** Preamble functions are assembled into the shader *before* `SHARED_TRANSFORMS_GLSL` (which provides `gmt_precalcRodrigues`, `gmt_applyRodrigues`, etc.). This means you **cannot** call shared transform functions from inside a preamble function. Call them from `loopInit` instead:

```typescript
// BAD — gmt_precalcRodrigues not yet declared when preamble compiles:
preamble: `void MyPrecalc() { gmt_precalcRodrigues(uVec3B); }`

// GOOD — call from loopInit where shared transforms are available:
loopInit: `MyPrecalc(); gmt_precalcRodrigues(uVec3B);`
```

### 3.6 `shader.preambleVars` (optional but critical for interlace)

Array of mutable global variable names declared in `preamble`. **Required** for any formula that declares mutable (non-const) globals that the interlace system needs to rename when the formula is used as the secondary formula.

```typescript
preambleVars: ['uCl_n4', 'uCl_doHarmonic']
```

**Rules:**
- Only list top-level mutable globals. Block-local variables (inside `if` blocks, etc.) are NOT included.
- Constants (values that never change after declaration) don't need listing.
- If you forget to list a variable, interlace will produce wrong shaders with no compile error — the secondary formula will read the primary's global state. A dev-mode `console.warn` catches this at runtime.
- The naming convention is `u[INITIALS]_[name]` (e.g., `uKB_rot` for KaliBox, `uCl_n4` for Claude).

### 3.7 `shader.usesSharedRotation` (optional)

Set to `true` if the formula's `loopInit` calls `gmt_precalcRodrigues()` (directly or via a precalc function). This tells the interlace system to save/restore the shared rotation globals (`gmt_rotAxis`, `gmt_rotCos`, `gmt_rotSin`) when swapping between primary and secondary formulas.

```typescript
usesSharedRotation: true
```

If this flag is missing on a formula that uses shared rotation, interlace will corrupt the primary formula's rotation state when the secondary runs.

### 3.8 `shader.getDist` (optional)

Custom distance estimator body. When provided, replaces the engine's built-in estimator entirely.

**Signature:** `vec2 getDist(float r, float dr, float iter, vec4 z)`

| Parameter | Description |
|-----------|-------------|
| `r` | `getLength(z.xyz)` — distance metric applied to final z |
| `dr` | Final derivative accumulator value |
| `iter` | Completed iteration count (float) |
| `z` | Full vec4 final state |

**Return:** `vec2(distance, smoothIteration)`

```typescript
getDist: `
    // 4D Chebyshev distance (MixPinski)
    float r4d = max(max(max(abs(z.x), abs(z.y)), abs(z.z)), abs(z.w));
    float d = (r4d - 1.0) / max(abs(dr), 1e-10);
    return vec2(d, iter);
`
```

When `getDist` is omitted, the engine uses the built-in estimator selected by the Quality panel's "Estimator" setting (see §6).

---

## 4. Parameters

The `parameters` array defines the UI controls for the formula. Each entry is a `FractalParameter` or `null` (for unused slots).

### 4.1 Parameter Slots

| Slot | GLSL Uniform | Type | Notes |
|------|-------------|------|-------|
| `paramA` | `uParamA` | float | **Also wired as `c.w`** in Julia mode |
| `paramB` | `uParamB` | float | **Also wired as `z.w`** (4th dimension init) |
| `paramC` | `uParamC` | float | |
| `paramD` | `uParamD` | float | |
| `paramE` | `uParamE` | float | |
| `paramF` | `uParamF` | float | |
| `vec2A` | `uVec2A` | vec2 | |
| `vec2B` | `uVec2B` | vec2 | |
| `vec2C` | `uVec2C` | vec2 | |
| `vec3A` | `uVec3A` | vec3 | |
| `vec3B` | `uVec3B` | vec3 | |
| `vec3C` | `uVec3C` | vec3 | |
| `vec4A` | `uVec4A` | vec4 | Available but currently unused by any formula |
| `vec4B` | `uVec4B` | vec4 | Available but currently unused by any formula |
| `vec4C` | `uVec4C` | vec4 | Available but currently unused by any formula |

**QUIRK: `paramB` double-wiring.** The DE_MASTER template initializes `z = vec4(p_fractal, uParamB)`. This means `paramB` sets the initial 4th-dimension coordinate. If your formula uses `z.w`, be aware that `paramB` controls its starting value. 4D formulas (MixPinski, Quaternion, Tetrabrot) intentionally use this for 4D slice control.

**QUIRK: `paramA` double-wiring.** In Julia mode, `c = vec4(uJulia, uParamA)`. This means `paramA` becomes the 4th component of the Julia constant. Only matters if your formula reads `c.w`.

### 4.2 FractalParameter Fields

```typescript
interface FractalParameter {
    label: string;           // Display name in UI
    id: string;              // Slot ID (paramA, vec3B, etc.)
    type?: 'float' | 'vec2' | 'vec3' | 'vec4';  // Inferred from id if omitted
    min: number;             // Minimum value (per-component for vectors)
    max: number;             // Maximum value
    step: number;            // Slider step size
    default: number | {x,y} | {x,y,z} | {x,y,z,w};
    scale?: 'linear' | 'log' | 'pi';
    options?: { label: string; value: number }[];
    mode?: 'rotation' | 'direction' | 'axes' | 'toggle' | 'mixed';
    linkable?: boolean;
}
```

### 4.3 `scale` — UI Scaling Mode

| Value | Behavior | Use for |
|-------|----------|---------|
| `'linear'` | Default. Direct mapping. | Most parameters |
| `'log'` | Logarithmic slider scaling | Parameters spanning orders of magnitude |
| `'pi'` | Displays values as multiples of π (e.g., "1.57" shows as "π/2") | Rotation angles in radians |

### 4.4 `mode` — Vector Display Mode

| Value | UI Behavior | Use for |
|-------|-------------|---------|
| `'rotation'` | Azimuth / Pitch / Angle controls with heliotrope direction visualizer | 3D rotation via Rodrigues formula |
| `'direction'` | Azimuth / Pitch controls | Directional vectors |
| `'axes'` | Per-axis angle sliders (X, Y, Z) | Per-plane 2D rotations |
| `'toggle'` | Boolean on/off checkboxes per component (step should be 1.0) | Per-axis abs folding (Buffalo) |
| `'mixed'` | First component = toggle (0/1), remaining = continuous slider | Toggle + amount (Mandelbulb Radiolaria) |

### 4.5 `options` — Dropdown Selection

Creates a dropdown selector instead of a slider:

```typescript
{ label: 'Projection', id: 'paramD', min: 0, max: 2, step: 1, default: 1, options: [
    { label: 'Spherical', value: 0 },
    { label: 'Cylindrical', value: 1 },
    { label: 'Toroidal', value: 2 }
]}
```

The value is still a float uniform — use `if (uParamD < 0.5)`, `else if (uParamD < 1.5)` etc. in GLSL.

### 4.6 `linkable` — Axis Linking

For vec3/vec2 parameters. When `true`, adds a link toggle that locks all axes to the same value for uniform scaling:

```typescript
{ label: 'Scale', id: 'vec3C', type: 'vec3', min: 0.5, max: 4.0, step: 0.001,
  default: { x: 2, y: 2, z: 2 }, linkable: true }
```

### 4.7 Recommended Slot Conventions

| Purpose | Recommended Slot |
|---------|-----------------|
| Scale (uniform) | `vec3C` with `linkable: true`, or `paramA` if scalar |
| Scale (per-axis) | `vec3C` without linkable |
| Rotation (Rodrigues) | `vec3B` or `vec3C` with `mode: 'rotation'` |
| Offset/Shift | `vec3A` or `vec3B` |
| 4D components | Split: xyz → `vec3A/B`, w → `vec2A/B` component |
| Power | `paramA` |
| Fold/Inversion | `paramB`, `paramC`, `paramD` |

---

## 5. Default Preset

The `defaultPreset` field defines the initial scene state when a user selects the formula. It's a `Partial<Preset>` object.

### 5.1 Key Fields

```typescript
defaultPreset: {
    formula: "MyFormula",       // Must match id
    features: {
        coreMath: {
            iterations: 12,
            paramA: 2.0,        // Formula params
            vec3A: { x: 1, y: 1, z: 1 },
            // ... all params with non-zero defaults
        },
        coloring: { /* gradient, mode, etc. */ },
        quality: {
            detail: 3,
            fudgeFactor: 0.7,   // Tune this for your formula
            estimator: 0,       // See §6 for estimator types
            maxSteps: 400,
            // ...
        },
        geometry: { juliaMode: false },
        lighting: { shadows: true },
        materials: { /* PBR settings */ },
        ao: { /* ambient occlusion */ },
        atmosphere: { /* fog, glow */ },
        optics: { camFov: 60 },
    },
    cameraPos: { x: 0, y: 0, z: 0 },
    cameraRot: { x: 0, y: 0, z: 0, w: 1 },
    sceneOffset: { x: 0, y: 0, z: 5, xL: 0, yL: 0, zL: 0 },
    targetDistance: 4.0,
    cameraMode: "Orbit",
    lights: [ /* at least one visible light */ ],
}
```

### 5.2 Tuning Tips

- **`fudgeFactor`**: Scale the DE result. Lower values (0.3–0.7) prevent surface artifacts at the cost of speed. Several formulas document specific fudge values: Bristorbrot uses 0.6 to fix slicing, Tetrabrot uses 0.8, Apollonian uses 0.18.
- **`estimator`**: Match to your DR tracking approach (see §6).
- **`iterations`**: Start with what the original reference uses. IFS formulas often need 8–15; power fractals 8–12.
- **Camera**: Frame the fractal well. The gallery thumbnail is rendered from this preset.

---

## 6. Distance Estimators

The engine provides 5 built-in estimator types. When `getDist` is omitted, the estimator is selected by the Quality panel:

| Type | Formula | Best for |
|------|---------|----------|
| **0: Analytic (Log)** | `0.5 * r * ln(r) / dr` | Power fractals (Mandelbulb, Quaternion) |
| **1: Linear (Fold 1.0)** | `(r - 1.0) / dr` | IFS / box-fold fractals (Menger, Sierpinski, Dodecahedron) |
| **2: Pseudo (Raw)** | `r / dr` | Artistic / artifact-heavy rendering |
| **3: Dampened** | `0.5 * r * ln(r) / (dr + 8.0)` | Fixes slicing on unstable formulas |
| **4: Linear (Fold 2.0)** | `(r - 2.0) / dr` | Classic Menger with offset 2 |

All built-in estimators include log-based iteration smoothing for coloring.

When you provide a custom `getDist`, the estimator setting is ignored entirely. Your function must return `vec2(distance, smoothIteration)`.

### DR Tracking Patterns

| Fractal Family | DR Update Pattern | Notes |
|----------------|------------------|-------|
| **Power (Mandelbulb)** | `dr = power * r^(power-1) * dr + 1.0` | Standard chain rule |
| **IFS/Fold** | `dr *= abs(scale)` per transform stage | Accumulates linear scaling |
| **Box+Sphere Fold** | `dr = dr * sphereK * abs(scale) + 1.0` | Combine sphere inversion + scale |
| **Custom Polynomial** | `dr = 2.0 * r * dr + 1.0` | Bristorbrot; uses pre-iteration radius |
| **Hybrid (BoxBulb)** | Chain: fold DR → power DR | Apply each stage's update sequentially |
| **Phoenix (Memory)** | Separate `dr_pow` + `dr_hist` branches | History term contributes independently |

---

## 7. Available GLSL Built-ins

### 7.1 Engine Uniforms (always available)

**Formula parameters:**
```glsl
uniform float uParamA, uParamB, uParamC, uParamD, uParamE, uParamF;
uniform vec2  uVec2A, uVec2B, uVec2C;
uniform vec3  uVec3A, uVec3B, uVec3C;
uniform vec4  uVec4A, uVec4B, uVec4C;
```

**Core engine state:**
```glsl
uniform float uIterations;      // Max iteration count
uniform float uJuliaMode;       // 0.0 = Mandelbrot, 1.0 = Julia
uniform vec3  uJulia;           // Julia C constant (xyz)
uniform float uEscapeThresh;    // Bailout threshold
uniform float uTime;            // Time in seconds
uniform float uFrameCount;      // Frame counter
uniform vec2  uResolution;      // Viewport resolution
```

**Note:** Most formulas should only use the parameter uniforms and `uJuliaMode`/`uJulia`. Accessing `uTime` or `uFrameCount` from a formula function would make it time-varying, which breaks accumulation rendering.

### 7.2 Variables Available in Formula Function

Inside the formula function, these are in scope:
```glsl
inout vec4 z;      // Current position (z.w = 4th dim)
inout float dr;    // Derivative accumulator
inout float trap;  // Orbit trap minimum distance
vec4 c;            // Iteration constant
```

### 7.3 Variables Available in loopInit

```glsl
vec4 z;             // Initialized to vec4(p_fractal, uParamB)
vec4 c;             // Mandelbrot: z, Julia: vec4(uJulia, uParamA)
float dr;           // 1.0
float trap;         // 1e10
float iter;         // 0.0
```

### 7.4 Variables Available in getDist

```glsl
float r;            // getLength(z.xyz) after all iterations
float dr;           // max(abs(dr), 1e-10) — safe, non-zero
float iter;         // Completed iteration count
vec4 z;             // Final z state
```

### 7.5 Shared Transform Functions

Provided by `features/geometry/transforms.ts`, available in formula functions and loopInit (but NOT in preamble functions):

```glsl
// Pre-calculate Rodrigues rotation from azimuth/pitch/angle vec3
void gmt_precalcRodrigues(vec3 params);
// params.x = azimuth, params.y = pitch, params.z = angle (halved internally)
// Writes to: gmt_rotAxis, gmt_rotCos, gmt_rotSin

// Apply the pre-calculated Rodrigues rotation to a point
void gmt_applyRodrigues(inout vec3 z);
// No-op if gmt_rotSin ≈ 0

// Apply Z-axis twist: rotates XY based on Z depth
void gmt_applyTwist(inout vec3 z, float amount);
// No-op if amount ≈ 0
```

**Shared rotation globals** (written by `gmt_precalcRodrigues`, read by `gmt_applyRodrigues`):
```glsl
vec3  gmt_rotAxis;  // Normalized rotation axis
float gmt_rotCos;   // cos(angle/2)
float gmt_rotSin;   // sin(angle/2)
```

### 7.6 Math Helpers

From `shaders/chunks/math.ts`, available in all shader code:

```glsl
// Constants
#define PI  3.14159265358979
#define TAU 6.28318530717959
#define INV_PI  0.31830988618
#define INV_TAU 0.15915494309
const float phi = 1.6180339887498949;  // Golden ratio

// Distance metric (controlled by Quality panel)
float getLength(vec3 p);  // Euclidean, Chebyshev, Manhattan, or Quartic

// Mandelbox building blocks
void sphereFold(inout vec3 z, inout float dz, float minR, float fixedR);
void boxFold(inout vec3 z, inout float dz, float foldLimit);

// Noise
float snoise(vec3 v);     // 3D Simplex noise

// Texture sampling (cross-version safe)
vec4 textureLod0(sampler2D tex, vec2 uv);

// Precision coordinate reconstruction
vec3 applyPrecisionOffset(vec3 p, vec3 low, vec3 high);
```

---

## 8. Quirks & Gotchas

### 8.1 GLSL ES 3.0 `const` Restriction

**Problem:** GLSL ES 3.0 requires that `const` initializers are constant expressions. Built-in functions like `sqrt()`, `normalize()`, `cos()` are NOT constant expressions. Some GPU drivers accept this (non-conformant), others reject it with Error 1282.

**Solution:** Use non-const globals initialized in a precalc function. See §3.5 for example.

### 8.2 Preamble Assembly Order

**Problem:** Formula preamble code is injected *before* `SHARED_TRANSFORMS_GLSL`. Calling `gmt_precalcRodrigues()` or `gmt_applyRodrigues()` from a preamble function causes "no matching overloaded function" errors.

**Solution:** Call shared transforms from `loopInit`, not from preamble functions. See §3.5 for example.

### 8.3 `paramB` / `paramA` Double-Wiring

**Problem:** `paramB` secretly initializes `z.w` (4th dimension), and `paramA` is wired as `c.w` in Julia mode. If you use these slots for unrelated parameters, the 4th dimension or Julia behavior may have unexpected side effects.

**Impact:** Low for most formulas — `z.w` is only read by formulas that explicitly use 4D math. But be aware that your "Scale" parameter in `paramB` is also setting the W coordinate.

### 8.4 Scale = 1.0 Degeneracy

Some IFS formulas guard against `scale = 1.0` which causes the DR to never grow, producing infinite surfaces:

```glsl
// Dyslexia: prevent scale collapse
scale = (abs(scale - 1.0) < 0.001) ? 1.001 : scale;
```

### 8.5 Epsilon Guards

Common patterns to prevent NaN/Inf:

```glsl
// Safe radius for power operations
pow(max(r, 1e-10), power - 1.0)

// Safe division
d / max(abs(dr), 1e-10)

// Safe sqrt for Coxeter normals
sqrt(max(0.75 - cospin * cospin, 0.0))

// Prevent overflow in derivative tracking (Phoenix, JuliaMorph)
if (dz > 1.0e10) break;  // or clamp
```

### 8.6 Trap Conventions

Most formulas use one of these patterns:

```glsl
// Standard orbit trap (distance to origin)
trap = min(trap, length(p));

// Squared distance (faster, used by Borromean, Bristorbrot)
trap = min(trap, dot(z.xyz, z.xyz));

// Single-axis trap (AmazingBox)
trap = min(trap, abs(z.x));

// Raw radius (Appell)
trap = min(trap, r);
```

The choice affects which coloring modes look good. `length(p)` works best with Trap coloring mode.

### 8.7 One-Time Transforms via DR Check

MandelMap uses `if (dr == 1.0)` to detect the first iteration and apply a coordinate transform only once:

```glsl
// Runs only on first iteration (dr starts at 1.0, changes after)
if (dr == 1.0) {
    // Apply projection mapping...
}
```

This is fragile — if the engine ever changes the initial DR value, it breaks. But it works because there's no other way to distinguish first-iteration vs later in the formula function.

### 8.8 State Across Iterations (Phoenix Pattern)

Phoenix formula maintains state from previous iterations using preamble globals:

```glsl
// Preamble:
vec3 z_prev = vec3(0.0);
vec3 z_prev2 = vec3(0.0);

// In formula function:
// ... use z_prev for feedback ...
z_prev2 = z_prev;  // Shift history
z_prev = z.xyz;    // Store current for next iteration
```

This pattern requires careful initialization (reset to zero at loop start via `loopInit`) and correct DR tracking for the history term.

### 8.9 Prefold Optimization

Icosahedral formulas (Icosahedron, TruncatedIcosahedron, GreatStellatedDodecahedron) run expensive fold sequences once in `loopInit` before the iteration loop, then use a simpler per-iteration fold. This is mathematically equivalent but faster because the full icosahedral fold (4+ reflections) only runs once instead of N times.

### 8.10 Stellation Level and Truncation Interpolation

Some polyhedral formulas interpolate between different geometric forms:
- **TruncatedIcosahedron**: `mix(icoDir, dodecDir, truncation)` morphs between icosahedron, truncated icosahedron, icosidodecahedron, and dodecahedron.
- **GreatStellatedDodecahedron**: `mix(pbc, sp, stellLevel)` controls stellation depth.

These use `clamp(param, 0.0, 1.0)` to prevent out-of-range geometry.

### 8.11 Catalan Solid Fold Techniques (RD, RT)

Catalan solids (duals of Archimedean solids) require special fold strategies. The standard Knighty fold tiles into Schwarz triangles which align with Archimedean face geometry but NOT Catalan face geometry. Two approaches were developed:

**RhombicDodecahedron — Face-Normal Fold:**
Uses the RD's own face normals `(1,±1,0)/√2` and `(0,1,±1)/√2` as fold planes (NOT the Knighty nc fold). Three rounds of 4 reflections converge to domain `x ≥ y ≥ |z|`, bounded entirely by RD faces. In this domain, the RD SDF simplifies to a single cutting plane: `dot(z3, (1,1,0)/√2) - size/√2`.

**RhombicTriacontahedron — Cutting Plane After Knighty Fold:**
The Knighty icosahedral fold planes (abs + nc) ARE RT face normals (icosidodecahedron vertices). After folding, the domain concentrates near the z-axis where the `(0,0,1)` RT face normal dominates. The cutting plane simplifies to `z3.z - size`. This gives correct RT geometry at all iteration levels.

**Why this matters:** The Knighty fold's Schwarz triangle boundaries don't align with Catalan dual faces. Computing the analytic SDF before the fold gives correct outer shape (iter 1) but primal-polyhedron inner structure. Computing a single cutting plane AFTER the fold produces correct Catalan geometry at all scales because the fold symmetry copies reconstruct the full polytope.

**Distance metric support:** Cutting-plane formulas multiply DE by `r / length(z.xyz)` where `r = getLength(z.xyz)` (metric-aware). This warps geometry when the distance metric changes, matching behavior of standard formulas.

### 8.12 DE Corrections for Deformations (JuliaMorph)


When applying non-conformal spatial deformations (bend, twist, taper), the distance estimate must be corrected:

```glsl
// Taper correction: divide by taper scale factor
d /= taperFactor;

// Twist correction: Jacobian of twist transform
d /= sqrt(1.0 + twistAmount * twistAmount * r_xy * r_xy);

// Bend correction: radius-dependent scaling
d *= bendR / (bendR + p.x * sign(bendAmount));
```

Missing these corrections causes the fractal to appear with wrong proportions or missing geometry.

### 8.13 Volumetric / Cloud Formulas (Appell)

Formulas designed for volumetric rendering artificially reduce DR growth:

```glsl
// Cloud density: reduce DR to soften the surface
dr *= (1.0 - uParamD * 0.1);
```

This makes the distance estimator "fuzzy," producing cloud/nebula appearance instead of hard surfaces. These formulas often set `juliaType: 'none'` since Julia mode doesn't apply meaningfully.

---

## 9. Quick Reference: Writing a New Formula

### Minimal Template

```typescript
import { FractalDefinition } from '../types';

export const MyFormula: FractalDefinition = {
    id: 'MyFormula',
    name: 'My Formula',
    shortDescription: 'Brief description of the fractal.',
    description: 'Full description with math, credits, and visual characteristics.',
    juliaType: 'julia',

    shader: {
        function: `
    void formula_MyFormula(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;

        // Your iteration math here
        // ...

        // Update derivative
        dr = /* your DR update */;

        // Julia mode: add constant
        if (uJuliaMode > 0.5) p += c.xyz;

        z.xyz = p;
        trap = min(trap, length(p));
    }`,
        loopBody: `formula_MyFormula(z, dr, trap, c);`,
    },

    parameters: [
        { label: 'Power', id: 'paramA', min: 1, max: 16, step: 0.1, default: 8.0 },
    ],

    defaultPreset: {
        formula: 'MyFormula',
        features: {
            coreMath: { iterations: 10, paramA: 8.0 },
            quality: { detail: 3, estimator: 0, fudgeFactor: 0.7, maxSteps: 400 },
        },
        sceneOffset: { x: 0, y: 0, z: 3, xL: 0, yL: 0, zL: 0 },
        targetDistance: 3.0,
        cameraMode: 'Orbit',
        lights: [
            { type: 'Directional', position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 0, z: 0 },
              color: '#ffffff', intensity: 1, falloff: 0, falloffType: 'Quadratic',
              fixed: false, visible: true, castShadow: true }
        ],
    }
};
```

### With Rotation

Add shared Rodrigues rotation:

```typescript
shader: {
    function: `
    void formula_MyFormula(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        vec3 p = z.xyz;
        gmt_applyRodrigues(p);  // Apply pre-calculated rotation
        // ... rest of formula ...
        z.xyz = p;
        trap = min(trap, length(p));
    }`,
    loopBody: `formula_MyFormula(z, dr, trap, c);`,
    loopInit: `gmt_precalcRodrigues(uVec3B);`,
    usesSharedRotation: true,
},
parameters: [
    // ...other params...
    { label: 'Rotation', id: 'vec3B', type: 'vec3', min: -6.28, max: 6.28,
      step: 0.01, default: { x: 0, y: 0, z: 0 }, mode: 'rotation' },
],
```

### With Custom Preamble

For formulas that need pre-calculated globals:

```typescript
shader: {
    preamble: `
    vec3 myGlobal;
    void MyFormula_precalc() {
        myGlobal = normalize(vec3(1.0, uParamB, uParamC));
    }`,
    preambleVars: ['myGlobal'],  // Required for interlace!
    function: `
    void formula_MyFormula(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        // Use myGlobal here...
    }`,
    loopBody: `formula_MyFormula(z, dr, trap, c);`,
    loopInit: `MyFormula_precalc();`,
},
```

### Checklist

- [ ] Formula function signature: `void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c)`
- [ ] DR tracking correct for your fractal family
- [ ] Orbit trap updated: `trap = min(trap, ...)`
- [ ] Julia mode handled: `if (uJuliaMode > 0.5) p += c.xyz;` (if applicable)
- [ ] No `const` with built-in functions in preamble
- [ ] `preambleVars` lists all mutable preamble globals
- [ ] `usesSharedRotation: true` if using `gmt_precalcRodrigues`
- [ ] Shared transforms called from `loopInit`, NOT from preamble functions
- [ ] Estimator type matches DR approach in default preset
- [ ] fudgeFactor tuned to avoid slicing artifacts
- [ ] Added to `FormulaType` union, `formulas/index.ts`, and category
- [ ] Compiles: `npx tsc --noEmit && npx vite build`
- [ ] Visual test in browser confirms correct rendering

---

## 10. The Modular Formula (Special Case)

The `Modular` formula is a factory/metacode entry — it has empty shader placeholders. `ShaderFactory` intercepts the `'Modular'` formula ID and injects dynamically compiled GLSL from the node graph editor instead. You cannot use it as a reference for writing normal formulas.

---

_Last updated: April 2026 (polyhedral formulas, interlace system, shared transforms)_
