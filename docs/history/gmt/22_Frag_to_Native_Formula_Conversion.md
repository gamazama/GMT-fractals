# Fragmentarium → GMT Native Formula Conversion Guide
> Last updated: 2026-04-09 | GMT v0.9.1

This document describes the process of converting a Fragmentarium `.frag` formula into a native GMT formula `.ts` file. The process was developed during the MixPinski conversion (2026-03-08) and serves as a repeatable template.

## Overview

GMT's auto-importer (`FormulaWorkshop`) can compile `.frag` files at runtime, but native formulas are preferred because they:
- Load instantly (no compile step)
- Have hand-tuned parameter labels, ranges, and defaults
- Can use optimized GLSL (pre-calculated preambles, no unused branches)
- Include curated default presets with camera, lighting, and coloring

## Step-by-Step Process

### 1. Identify the Source

Find the original `.frag` file. Verify authenticity:
- Check `features/fragmentarium_import/reference/` for local copies
- Note the original author and any M3D/Fragmentarium credits
- Read the formula to understand its mathematical structure

### 2. Analyze the Formula Structure

Map the original's components to GMT concepts:

| Frag Concept | GMT Equivalent |
|---|---|
| `#group` name | Formula `name` / `description` |
| `uniform float X; slider[min,default,max]` | `parameters[]` entry |
| `uniform vec3/vec4 X; slider[...]` | `vec3A/B/C` or split across `vec3` + `vec2` params |
| `uniform int MI` (iterations) | Built-in `uIterations` |
| `uniform bool X; checkbox[...]` | Conditional in shader or dedicated param |
| `orbitTrap = min(orbitTrap, ...)` | `trap = min(trap, ...)` in formula function |
| `float DE(vec3 p) { ... }` | `shader.function` + optional `shader.getDist` |
| Rotation matrices | Pre-calculate in `shader.preamble`, use Rodrigues formula |

### 3. Map Parameters

GMT has these parameter slots available per formula:

**Scalar (6):** `paramA` through `paramF`
- Mapped to GLSL uniforms `uParamA` through `uParamF`
- **Note:** `paramB` is wired as `z.w` (4th dimension init) by `DE_MASTER`
- **Note:** `paramA` is wired as `c.w` (Julia 4th dim) — only matters in Julia mode

**Vector2 (3):** `vec2A`, `vec2B`, `vec2C`
- Mapped to GLSL uniforms `uVec2A`, `uVec2B`, `uVec2C`

**Vector3 (3):** `vec3A`, `vec3B`, `vec3C`
- Mapped to GLSL uniforms `uVec3A`, `uVec3B`, `uVec3C`
- Support `mode: 'rotation'` for azimuth/pitch/angle UI
- Support `linkable: true` for uniform scaling

**Tips:**
- Group related parameters (e.g., scale + offset for same transform stage)
- Use `vec3` with `linkable: true` for per-axis scale
- Use `vec3` with `mode: 'rotation'` for rotation controls
- For 4D offsets, split: xyz → `vec3A/B/C`, w → `vec2A/B/C` component
- Prefer descriptive labels ("Sierpinski Scale" not "paramA")

### 4. Write the Shader

The formula function signature is always:
```glsl
void formula_NAME(inout vec4 z, inout float dr, inout float trap, vec4 c)
```

**Key differences from Fragmentarium:**

| Frag | GMT |
|---|---|
| `DE(vec3 p)` returns distance | Formula function modifies `z`, `dr`, `trap` in-place |
| `for(int i=0; i<MI; i++)` | Loop is external — formula is called per iteration |
| `Dd` (derivative accumulator) | `dr` parameter |
| `orbitTrap` (global vec4) | `trap` parameter (float — use `min(trap, length(...))`) |
| `bailout` check | Handled by GMT's DE loop externally |
| `return distance;` | Use `shader.getDist` for custom DE |

**Shader object fields:**
- `function`: The iteration function body (called per iteration)
- `loopBody`: Usually just `formula_NAME(z, dr, trap, c);`
- `loopInit`: Code run once before the loop (e.g., call preamble functions)
- `preamble`: Global scope code (pre-calculated constants, helper functions)
- `getDist`: Custom distance estimator body (optional). Signature: `vec2 getDist(float r, float dr, float iter, vec4 z)`. Returns `vec2(distance, smoothIteration)`. Available vars: `r` (length of z.xyz), `dr`, `iter`, `z` (full vec4).

### 5. Handle Rotation

Fragmentarium formulas often compute trig functions (`sin`/`cos`) inside the iteration loop. This is expensive on GPU. Optimization:

1. Pre-calculate rotation axis and sin/cos in `preamble` (runs once per frame)
2. Use Rodrigues' rotation formula in the loop body with pre-calculated values
3. Guard with `if (abs(angle) > 0.001)` to skip when rotation is zero

Example:
```glsl
// Preamble (global scope, runs once):
vec3 rotAxis = vec3(0,1,0);
float rotCos = 1.0, rotSin = 0.0;
void precalcRotation() {
    float angle = uVec3C.z * 0.5;
    rotCos = cos(angle); rotSin = sin(angle);
    // ... compute axis from uVec3C.xy
}

// In formula function (runs per iteration):
if (abs(uVec3C.z) > 0.001) {
    z.xyz = z.xyz * rotCos + cross(rotAxis, z.xyz) * rotSin
          + rotAxis * dot(rotAxis, z.xyz) * (1.0 - rotCos);
}
```

### 6. Custom Distance Estimator

If the original uses a non-standard DE (not `0.5 * r * log(r) / dr` or `r / dr`), provide a `getDist` override:

```typescript
getDist: `
    // Your custom DE. Available: r, dr, iter, z (vec4)
    float myDist = (r - uParamD) / max(abs(dr), 1e-10);
    return vec2(myDist, iter);
`
```

Set the `estimator` in the default preset's quality settings to match the closest built-in type:
- `0`: Analytic (log) — power fractals (Mandelbulb)
- `1`: Linear (r-1)/dr — box/Menger IFS
- `2`: Pseudo r/dr — raw
- `3`: Dampened — fixes slicing artifacts
- `4`: Linear (r-2)/dr — classic Menger offset

When using `getDist`, the estimator setting is ignored (your custom function takes priority).

### 7. Default Preset

Create a tuned default preset that shows the formula at its best:
- Set `iterations` to match the original's default
- Camera position that frames the fractal well
- Coloring gradient that highlights the geometry
- Appropriate quality settings (estimator type, detail level)
- At least one visible light with shadows

### 8. Register the Formula

1. Add the formula's ID to `FormulaType` union in `types/common.ts`
2. Import and add to `formulas/index.ts`:
   - Import statement
   - Add to the `formulas[]` array (determines UI order)
   - Add to appropriate `PREDEFINED_CATEGORIES` category
3. If renaming an existing formula, add `registry.registerAlias('OldName', 'NewName')`

### 9. Build & Test

```bash
npx tsc --noEmit          # Type check
npx vite build            # Production build
npm run dev               # Visual test in browser
```

## Conversion Checklist

- [ ] Source .frag identified and read
- [ ] Mathematical structure understood (IFS folds, transforms, DE type)
- [ ] Parameters mapped to GMT slots with descriptive labels
- [ ] Shader function written (formula body, no loop)
- [ ] DR tracking correct (dr *= scale at each transform stage)
- [ ] Orbit trap coloring preserved
- [ ] Rotation optimized (preamble pre-calc if needed)
- [ ] Custom getDist if non-standard DE
- [ ] `preambleVars` declared if preamble has mutable variables
- [ ] `usesSharedRotation: true` if using shared Rodrigues rotation
- [ ] Default preset with tuned camera, colors, quality
- [ ] Registered in FormulaType union, index.ts, and categories
- [ ] TypeScript compiles clean
- [ ] Vite build succeeds
- [ ] Visual test in browser confirms fractal renders correctly

## Example: MixPinski Conversion

**Source:** `features/fragmentarium_import/reference/Examples/mclarekin/darkbeam_MixPinski.frag`

**Key decisions:**
- 4D formula → uses `z.w` (= `paramB`) for 4th dimension
- `vec4 offsetS` → split to `vec3A` (xyz) + `vec2A.x` (w)
- `vec4 offsetM` → split to `vec3B` (xyz) + `vec2A.y` (w)
- Two scales (`scaleS`, `scaleM`) → `paramA`, `paramC`
- Chebyshev 4D DE → custom `getDist` with `max(abs(z.xyzw))`
- 4D rotation (6 planes) → simplified to 3D Rodrigues via `vec3C` (mode: 'rotation')
- Old formula renamed to `SierpinskiTetrahedron` (what it actually was)

## Important: Interlace & Shared Rotation Support

Since 2026-04-03, formulas that participate in the interlace (two-formula hybrid) system need additional declarations:

### `preambleVars`

If your formula's `shader.preamble` declares mutable variables (anything that's not `const`), you **must** list them in `shader.preambleVars`. The interlace system uses this list to scope variables correctly when combining two formulas in a single shader.

```ts
shader: {
  preamble: `
    float myScale = uParamA;
    vec3 myOffset = uVec3A;
  `,
  preambleVars: ['myScale', 'myOffset'],
  // ...
}
```

Without `preambleVars`, the interlace system may produce shader compilation errors from variable redefinition. A dev-mode `console.warn` fires when mutable preamble variables are detected without a matching declaration.

### `usesSharedRotation`

If your formula uses Rodrigues rotation via the shared `gmt_precalcRodrigues()` transform (from `features/geometry/transforms.ts`), set:

```ts
shader: {
  usesSharedRotation: true,
  // ...
}
```

This tells the interlace system to save/restore rotation state between the primary and secondary formula.

### Cross-references

- Full interlace architecture: [`docs/24_Formula_Interlace_System.md`](24_Formula_Interlace_System.md)
- Complete formula API surface: [`docs/25_Formula_Dev_Reference.md`](25_Formula_Dev_Reference.md)
- GLSL quirks (const restriction, preamble assembly order): [`docs/25_Formula_Dev_Reference.md` §8](25_Formula_Dev_Reference.md)
