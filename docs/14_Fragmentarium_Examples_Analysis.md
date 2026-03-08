# Fragmentarium Examples Analysis

## Overview

This document catalogs the patterns found in over 100 Fragmentarium formulas from the `features/fragmentarium_import/reference/Examples/` directory. These patterns inform the implementation of the generic Fragmentarium parser.

## Formula Categories

### 1. Simple DE-Based Formulas (BEST SUPPORTED)

These formulas follow a standard pattern and are the easiest to import.

**Pattern:**
```glsl
float DE(vec3 z) {
    int n = 0;
    while (n < Iterations) {
        // Transform z
        z = transform(z);
        n++;
    }
    return length(z) * scale;
}
```

**Examples:**
- `Tutorials/11 - Simple Distance Estimated 3D fractal.frag` - Classic Menger cube
- `Kali's Creations/Kalibox.frag` - Kaliset box (with `powN1`/`powN2` helpers)
- `Kali's Creations/Amazing Surface.frag` - Amazing Surface formula

**Transformation Notes:**
- While loop body becomes the main formula body
- Remove `int n = 0;`, `while (...)`, and `n++` 
- Replace `z` parameter with `z_local` variable to avoid conflict
- `Iterations` uniform maps to built-in `i` uniform (iteration count)

---

### 2. Complex DE-Based Formulas (REQUIRES HELPER EXTRACTION)

These formulas define custom helper functions that the DE function calls.

**Pattern:**
```glsl
float RoundBox(vec3 p, vec3 csize, float offset) {
    vec3 di = abs(p) - csize;
    float k = max(di.x, max(di.y, di.z));
    return abs(k*float(k<0.) + length(max(di, 0.0)) - offset);
}

float Thing2(vec3 p) {
    // ... uses RoundBox or other helpers ...
    return value;
}

float DE(vec3 p) {
    return Thing2(p);  // Calls helper
}
```

**Examples:**
- `Knighty Collection/PseudoKleinian.frag` - Has `RoundBox`, `Thingy`, `Thing2`, `DE`
- `mclarekin/MandelbulbPow2.frag` - Has `powN1`, `powN2` helpers
- `Kali's Creations/Kalibox.frag` - Has `powN1`, `powN2` for Mandelbulb powers

**Implementation Notes:**
- Parse all function definitions from the file
- Build a call graph starting from `DE`
- Extract all functions reachable from `DE`
- Include them before the main formula code
- Handle recursive dependencies (function A calls B calls C)

**Code:**
```typescript
// In GenericFragmentariumParser
private static findCalledFunctions(source: string, functionName: string, visited: Set<string>): void {
    // Find function body
    const funcRegex = new RegExp(`\\b${functionName}\\s*\\([^)]*\\)\\s*\\{`, 'g');
    // ... extract body, find calls to other functions
    // Recursively visit each called function
}
```

---

### 3. Formulas with Break Statements (NEEDS SPECIAL HANDLING)

These formulas use `break` for early exit when orbit exceeds bailout.

**Pattern:**
```glsl
float Kaliset(vec3 pos) {
    vec3 p = pos;
    float ln = 0.;
    for (int i=0; i<KIterations; i++) {
        p = transform(p);
        ln = length(p);
        if (ln > KBailout && KBailout > 0.) break;  // EARLY EXIT
    }
    return ln;
}
```

**Examples:**
- `Include/Kaliset3D.frag` - Line 33: `if (ln>KBailout && KBailout>0.) break;`
- Formulas with `if (r2 > 100.0) break;` patterns

**Problem:** 
GMT's formula structure doesn't use loops inside the formula - the engine handles iteration externally. A `break` statement can't be directly converted.

**Solution Options:**
1. **Convert to conditional return (LIMITED SUPPORT)**:
   ```glsl
   if (condition) {
       dr = ...;  // Set derivative
       return;    // Early exit from formula
   }
   ```
   This only works if the formula is at the end. Most formulas have cleanup code after the loop.

2. **Flag as unsupported (CURRENT APPROACH)**:
   Detect `break` statements and warn the user that the formula requires manual adjustment.

3. **Inline bailout check (FUTURE)**:
   Transform the formula to always compute the bailout condition:
   ```glsl
   // Instead of: if (r2 > Bailout) break;
   // Use: active = active && (r2 <= Bailout);
   // Then wrap operations in: if (active) { ... }
   ```

---

### 4. Formulas with Conditional Orbit Updates (SUPPORTED)

These formulas update orbitTrap conditionally based on iteration count.

**Pattern:**
```glsl
float DE(vec3 z) {
    int n = 0;
    while (n < Iterations) {
        z = transform(z);
        if (n < ColorIterations) {
            orbitTrap = min(orbitTrap, vec4(abs(z), dot(z,z)));
        }
        n++;
    }
    return length(z) * scale;
}
```

**Examples:**
- `Tutorials/11 - Simple Distance Estimated 3D fractal.frag` - Line 22
- `Tutorials/12 - Faster raytracing of 3D fractals.frag` - Line 34
- Most formulas with `#group` and `ColorIterations` uniform

**Implementation:**
- `ColorIterations` is just another uniform
- The condition `n < ColorIterations` becomes `i < uColorIterations`
- The orbitTrap update is preserved as-is

---

### 5. Formulas with Complex While Conditions (NEEDS HANDLING)

These formulas have non-standard loop conditions.

**Pattern:**
```glsl
float Thing2(vec3 p) {
    vec3 ap = p + 1.;
    for(int i=0; i<MI && ap!=p; i++) {  // Complex condition
        ap = p;
        p = transform(p);
    }
    return value;
}
```

**Examples:**
- `Knighty Collection/PseudoKleinian.frag` - Line 51: `for(int i=0;i<MI && ap!=p;i++)`

**Problem:**
The parser expects simple `while (n < Iterations)` or `for(int i=0; i<Iterations; i++)` patterns.

**Solution:**
Detect and handle these patterns by extracting the iteration-based part:
- Recognize `i<MI` (where MI is the iteration uniform)
- The `ap!=p` part is a convergence check - we may need to warn about this

---

### 6. Formulas with Custom Iteration Variable Names (SUPPORTED)

Formulas may use different names for the iteration count uniform.

**Patterns:**
```glsl
uniform int Iterations;   // Standard
uniform int MI;           // Knighty formulas
uniform int KIterations;  // Kali formulas
uniform int ColorIterations;  // For orbit updates
```

**Implementation:**
- Detect the iteration uniform name during parsing
- Map it to GMT's built-in `i` uniform
- Other uniforms are preserved as-is

---

### 7. Formulas with Computed Uniforms (NEEDS HANDLING)

These formulas compute values from uniforms at the global scope.

**Pattern:**
```glsl
uniform float Bailout;
float bailout2 = pow(10.0, Bailout);  // Computed uniform

float DE(vec3 z) {
    // Uses bailout2
    if (length(z) > bailout2) ...
}
```

**Problem:**
GMT doesn't support global computed expressions. These need to be moved into the formula or converted to uniforms.

**Solution:**
1. Detect global variable declarations that reference uniforms
2. Move them inside the formula function as local variables
3. Or warn the user that these need manual conversion

---

### 8. Formulas with providesColor (NOT SUPPORTED)

These formulas define their own coloring instead of using DE + orbitTrap.

**Pattern:**
```glsl
#define providesColor

vec3 baseColor(vec3 p, vec3 n) {
    if (mod(length(p*10.0), 2.0) < 1.0) return vec3(1.0);
    return vec3(0.0);
}

float DE(vec3 z) {
    // Returns distance only
    return ...;
}
```

**Examples:**
- `Tutorials/10 - Simple Distance Estimated 3D system.frag`
- Many volumetric/2D formulas

**Problem:**
GMT's rendering system is built around distance estimation + orbitTrap coloring. `providesColor` formulas bypass this entirely.

**Solution:**
- Detect `#define providesColor` in the parser
- Warn the user that this pattern is not supported
- Suggest they may need to convert to orbitTrap-based coloring

---

### 9. Formulas with External Includes (WARN USER)

These formulas depend on external GLSL files.

**Pattern:**
```glsl
#include "MathUtils.frag"
#include "DE-KIFS.frag"
#include "Classic-Noise.frag"  // External dependency
```

**Examples:**
- Most formulas include `MathUtils.frag` and a raytracer
- Some include `Classic-Noise.frag`, `Complex.frag`, etc.

**Implementation:**
- Parse `#include` statements
- For known includes (`MathUtils.frag`, raytracers), we auto-inject standard helpers
- For unknown includes, warn the user that external dependencies aren't resolved

---

### 10. Formulas with init() Function (SUPPORTED)

These formulas have an initialization function for precomputing values.

**Pattern:**
```glsl
#define providesInit

mat3 rot;
float sc, sr;

void init() {
    rot = rotationMatrix3(normalize(RotVector), RotAngle);
    vec3 o = abs(Offset);
    sc = max(o.x, max(o.y, o.z));
    sr = sqrt(dot(o, o) + 1.);
}

float DE(vec3 p) {
    // Uses rot, sc, sr computed in init()
}
```

**Examples:**
- `Knighty Collection/Menger_Sphere.frag` - Lines 26-31

**Implementation:**
- Extract the body of `init()` function
- Inline it at the beginning of the formula
- Variables declared in `init()` scope become formula-level variables

**Code:**
```typescript
private static extractInitFunction(source: string): string {
    const initRegex = /void\s+init\s*\(\s*\)\s*\{/g;
    // ... extract body between braces
    // Returns the contents to be inlined
}
```

---

## Common Helper Functions Found

These are defined in `Include/MathUtils.frag` and commonly used:

```glsl
// Rotation matrix around vector v by angle (degrees)
mat3 rotationMatrix3(vec3 v, float angle)

// XYZ rotation (Euler angles)
mat3 rotationMatrixXYZ(vec3 v)

// 4x4 versions
mat4 rotationMatrix(vec3 v, float angle)
mat4 translate(vec3 v)
mat4 scale4(float s)
```

**Implementation:**
- These are auto-injected when formulas reference them
- See `HELPER_FUNCTIONS` in `GenericFragmentariumParser.ts`

---

## Uniform Type Mappings

### Scalar Uniforms
```glsl
uniform float Scale;              // -> "Scale" parameter
uniform int Iterations;           // -> "Iterations" (maps to `i`)
uniform bool Julia;               // -> checkbox
```

### Vector Uniforms (NATIVE SUPPORT)
```glsl
uniform vec3 Offset;              // -> "Offset" vec3 parameter
uniform vec3 RotVector;           // -> "RotVector" vec3 parameter  
uniform vec2 JuliaXY;             // -> "JuliaXY" vec2 parameter
uniform vec3 CSize;               // -> "CSize" vec3 parameter
```

**Implementation:**
GMT has native support for `vec3A`, `vec3B`, `vec3C`, `vec2A`, `vec2B` uniforms.
The parser detects these and creates proper slot mappings.

### Slider Ranges
```glsl
uniform float Scale; slider[0.00, 3.0, 4.00]   // min, default, max
uniform vec3 Offset; slider[(0,0,0),(1,1,1),(2,2,2)]
```

---

## Formula Detection Pattern Categories

The parser uses these categories to decide how to process a formula:

### 1. MANDELBOX Pattern
- Has `boxFold`, `sphereFold` operations
- Pattern: `dr *= ...; z = ... + c;`
- Uses `MinRadius`, `FixedRadius`, `Scale`, etc.

### 2. AMAZING_SURFACE Pattern
- Has `TriangleInequality` or `AmazingSurface` specific operations
- Uses `CSize`, `Size`, etc.

### 3. GENERIC Pattern (FALLBACK)
- Any formula that doesn't match the above
- Direct transformation without optimization
- Full helper extraction

---

## Unsupported Patterns Summary

| Pattern | Example File | Status | Notes |
|---------|-------------|--------|-------|
| providesColor | `Tutorials/10 - Simple Distance Estimated 3D system.frag` | WARN | Needs orbitTrap conversion |
| break in loops | `Include/Kaliset3D.frag` | WARN | Early exit not supported |
| Complex loop conditions | `Knighty Collection/PseudoKleinian.frag` | PARTIAL | Handles `i<MI`, warns on extra conditions |
| External includes | Various | WARN | Auto-inject known helpers |
| Global computed uniforms | Various | PENDING | Needs inline conversion |
| 2D formulas | `2D Systems/*.frag` | NOT SUPPORTED | Completely different structure |

---

## Implementation Status

- ✅ While loop extraction
- ✅ Variable renaming (z → z_local)
- ✅ Uniform mapping and slot assignment
- ✅ Native vector uniform support (vec3, vec2)
- ✅ Helper function auto-injection (rotationMatrix3, boxFold, sphereFold)
- ✅ Custom helper extraction
- ✅ init() function inlining
- ✅ providesColor detection
- ✅ DE function detection
- ✅ External include detection
- ⚠️ Break statement handling (detected, needs transformation)
- ⚠️ Computed uniform handling (detected, needs inline conversion)
- ⚠️ Complex while conditions (detected, partial handling)

---

## Testing Recommendations

To verify the generic parser works across formula categories:

1. **Simple Formulas:**
   - `Tutorials/11 - Simple Distance Estimated 3D fractal.frag`
   - `Kali's Creations/Kalibox.frag`

2. **Complex Formulas with Helpers:**
   - `Knighty Collection/PseudoKleinian.frag` (RoundBox, Thingy, Thing2)
   - `Kali's Creations/Amazing Surface.frag`

3. **Formulas with init():**
   - `Knighty Collection/Menger_Sphere.frag`

4. **Formulas with break:**
   - `Include/Kaliset3D.frag` (should warn)

5. **providesColor formulas:**
   - `Tutorials/10 - Simple Distance Estimated 3D system.frag` (should warn)

---

## Next Steps

1. Implement break statement transformation (convert to conditional early return)
2. Handle computed uniforms by inlining them into the formula
3. Better handling of complex loop conditions
4. UI improvements to show warnings clearly to users
5. Testing suite with formulas from each category
