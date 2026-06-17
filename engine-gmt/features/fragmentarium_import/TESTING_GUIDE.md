# Fragmentarium Importer Testing Guide

> **⚠️ IMPORTANT (2026-03-05):** Testing revealed 0% success rate on the three `.frag` files in `reference/` root. All three are complex Mandelbox variants with `init()` calling `rotationMatrix3` (from the stripped `MathUtils.frag` include) → GLSL compile error.
>
> **DO NOT use the three files in `reference/` root as your first tests.** Use `reference/Examples/` instead — **580 full Fragmentarium examples are available there.** Start with `Tutorials/11 - Simple Distance Estimated 3D fractal.frag` (Menger cube — should work with current parser).
>
> **Key rule:** Stripping `#include` directives is only a problem if the DE body or `init()` *calls* a function from those includes (e.g., `rotationMatrix3`, `boxFold`). Formulas whose DE body uses only built-in GLSL (`abs`, `length`, swizzles, arithmetic) should import successfully even with includes in the original file.
>
> See `docs/21_Frag_Importer_Current_Status.md` for full root cause analysis and fix plan.

This guide lists all the .frag files from the Examples directory that can be used for testing the importer, organized by expected outcome.

## ✅ HIGH PRIORITY - Should Work (Recommended for Testing)

### Simple DE Formulas (Best Starting Point)
These are the simplest formulas and should work with minimal issues.

| File | Category | Expected Result |
|------|----------|-----------------|
| `Tutorials/11 - Simple Distance Estimated 3D fractal.frag` | Menger Cube | ✅ Full support - classic Menger cube |
| `Tutorials/12 - Faster raytracing of 3D fractals.frag` | Menger Cube | ✅ Full support - with ColorIterations |
| `Kali's Creations/Kalibox.frag` | Kaliset | ✅ Full support - simple DE |
| `Kaleidoscopic IFS/Menger.frag` | Menger IFS | ✅ Full support - IFS style Menger |
| `Kaleidoscopic IFS/Dodecahedron.frag` | IFS | ✅ Full support - dodecahedron IFS |
| `Kaleidoscopic IFS/Icosahedron.frag` | IFS | ✅ Full support - icosahedron IFS |
| `Kaleidoscopic IFS/Tetrahedron.frag` | IFS | ✅ Full support - tetrahedron IFS |
| `Knighty Collection/Menger_iterated_20.frag` | Menger | ✅ Full support - basic Menger |
| `kosalos/Mandelbulb.frag` | Mandelbulb | ✅ Full support - simple Mandelbulb |
| `kosalos/KIFS.frag` | KIFS | ✅ Full support - basic KIFS |
| `Historical 3D Fractals/Mandelbox.frag` | Mandelbox | ✅ Pattern: MANDELBOX - should use optimized template |
| `Historical 3D Fractals/Mandelbulb.frag` | Mandelbulb | ✅ Pattern: GENERIC - direct transformation |

### Formulas with init() Function
These use `#define providesInit` - the init() body should be inlined.

| File | Category | Expected Result |
|------|----------|-----------------|
| `Knighty Collection/Menger_Sphere.frag` | Menger/Sphere | ✅ Should inline init() with rotation matrix |
| `kosalos/KaliBox.frag` | Kaliset | ✅ Should inline init() with precomputations |
| `kosalos/Kleinian.frag` | Kleinian | ✅ Should inline init() |

### Formulas with Custom Helpers
These define helper functions that need to be extracted.

| File | Category | Helpers | Expected Result |
|------|----------|---------|-----------------|
| `Knighty Collection/PseudoKleinian.frag` | Kleinian | RoundBox, Thingy, Thing2 | ✅ Extract all 3 helpers + DE |
| `Kali's Creations/amazingsurface.frag` | Amazing Surface | Various | ✅ Pattern: AMAZING_SURFACE or extract helpers |
| `kosalos/PseudoKleinian-FirstSurface.frag` | Kleinian | Multiple | ✅ Helper extraction |
| `kosalos/Monster.frag` | Complex | Multiple | ✅ Helper extraction |
| `kosalos/SpudsVille.frag` | Complex | Multiple | ✅ Helper extraction |
| `kosalos/Tower.frag` | Complex | Multiple | ✅ Helper extraction |
| `kosalos/Vertebrae.frag` | Complex | Multiple | ✅ Helper extraction |

## ⚠️ MEDIUM PRIORITY - Should Work with Warnings

### Formulas with Break Statements
These use `break` for early exit - will warn but attempt conversion.

| File | Category | Warning |
|------|----------|---------|
| `Include/Kaliset3D.frag` | Kaliset | ⚠️ "break statements converted to returns" |
| `Kali's Creations/KboxExpSmooth.frag` | Kaliset | ⚠️ May have early exit conditions |
| `kosalos/Apollonian.frag` | Apollonian | ⚠️ Check for break conditions |
| `kosalos/Apollonian2.frag` | Apollonian | ⚠️ Check for break conditions |

### Formulas with Complex Loop Conditions
These have conditions beyond simple iteration count.

| File | Category | Warning |
|------|----------|---------|
| `Knighty Collection/PseudoKleinian.frag` | Kleinian | ⚠️ "for(int i=0; i<MI && ap!=p; i++)" - extra condition ignored |
| `mclarekin/sym4_1.frag` | Complex | ⚠️ Complex loop conditions |
| `neozhaoliang/Boyd-Maxwell-Ball-Packings/*.frag` | Ball Packings | ⚠️ Complex loops |

### Formulas with Computed Uniforms
Global expressions that reference uniforms.

| File | Category | Warning |
|------|----------|---------|
| `Knighty Collection/Menger_Sphere.frag` | Menger | ⚠️ "sc, sr computed from Offset" |
| `Knighty Collection/MandalayBox.frag` | Mandelbox | ⚠️ May have computed values |
| `kosalos/Sponge.frag` | Sponge | ⚠️ Check for computed uniforms |
| `kosalos/SierpinskTetra.frag` | Sierpinski | ⚠️ Check for computed uniforms |

## ❌ NOT SUPPORTED - Will Show Error/Warning

### providesColor Formulas (Volumetric/Color-based)
These define `baseColor()` instead of using orbitTrap.

| File | Category | Warning |
|------|----------|---------|
| `Tutorials/10 - Simple Distance Estimated 3D system.frag` | DE System | ❌ "providesColor not supported" |
| `Tutorials/26 - 3D fractals without a DE.frag` | Volumetric | ❌ No DE function |
| `Kali's Creations/cosmos.frag` | Volumetric | ❌ "providesColor not supported" |
| `Knighty Collection/LiftedDomainColoring3D.frag` | Domain Coloring | ❌ Likely providesColor |
| `Knighty Collection/hyperbolic-tesselation-2Din3D-colored-02.frag` | 2D/3D | ❌ Check for providesColor |
| `Experimental/SkyboxTest.frag` | Skybox | ❌ Not a DE fractal |
| `Experimental/Terrain.frag` | Terrain | ❌ Not a DE fractal |

### 2D Formulas (Completely Different Architecture)

| File | Category | Warning |
|------|----------|---------|
| `Tutorials/00 - Simple 2D system.frag` | 2D System | ❌ "No DE(vec3) function found" |
| `Tutorials/01 - Simple 2D Escape Time Fractal.frag` | 2D Escape Time | ❌ 2D architecture not supported |
| `Tutorials/20 - Progressive 2D.frag` | 2D Progressive | ❌ 2D architecture not supported |
| `Tutorials/21 - Progressive 2D Escape Time Fractal.frag` | 2D Escape | ❌ 2D architecture not supported |
| `Knighty Collection/my_2D.frag` | 2D | ❌ 2D not supported |
| `Knighty Collection/poincare-disc30-circle_limit_6.frag` | 2D Hyperbolic | ❌ 2D not supported |

### Formulas with External Dependencies
These include files we don't auto-resolve.

| File | Category | Warning |
|------|----------|---------|
| `Experimental/SphereSponge.frag` | Sponge | ⚠️ "External dependencies: Classic-Noise.frag" |
| `Experimental/TextureTest.frag` | Texture | ⚠️ "External dependencies" |
| `Experimental/TriPlanarTexturing.frag` | Texturing | ⚠️ "External dependencies" |
| `Knighty Collection/Doyle-Spirals.frag` | Spirals | ⚠️ Check for includes |
| `gannjondal/*.frag` | Newton | ⚠️ Complex includes |
| `neozhaoliang/**/*.frag` | Various | ⚠️ Many dependencies |

## 📋 TESTING CHECKLIST

### Phase 1: Basic Functionality
Test these first to verify the importer works:

- [ ] `Tutorials/11 - Simple Distance Estimated 3D fractal.frag` (Menger)
- [ ] `Tutorials/12 - Faster raytracing of 3D fractals.frag` (Menger with colors)
- [ ] `Kali's Creations/Kalibox.frag` (Kaliset - very simple)
- [ ] `Historical 3D Fractals/Mandelbox.frag` (Should detect MANDELBOX pattern)
- [ ] `Historical 3D Fractals/Mandelbulb.frag` (Generic transformation)

### Phase 2: Advanced Features
Test helper extraction and init() inlining:

- [ ] `Knighty Collection/PseudoKleinian.frag` (Multiple helpers)
- [ ] `Knighty Collection/Menger_Sphere.frag` (init() function)
- [ ] `kosalos/Mandelbulb.frag` (Standard Mandelbulb)
- [ ] `kosalos/KIFS.frag` (KIFS style)
- [ ] `Kaleidoscopic IFS/Menger.frag` (IFS approach)

### Phase 3: Warning Handling
Verify warnings appear correctly:

- [ ] `Tutorials/10 - Simple Distance Estimated 3D system.frag` (providesColor warning)
- [ ] `Include/Kaliset3D.frag` (break statement warning)
- [ ] `Knighty Collection/PseudoKleinian.frag` (complex loop warning)
- [ ] Any formula with `#include "Classic-Noise.frag"` (external include warning)

### Phase 4: Edge Cases
Test formulas with unusual patterns:

- [ ] Formulas with vec2 uniforms (JuliaXY, etc.)
- [ ] Formulas with many parameters (>6)
- [ ] Formulas with bool uniforms (checkboxes)
- [ ] Formulas with ColorIterations separate from Iterations

## 🎯 QUICK START - Top 10 Formulas to Test

If you're short on time, test these 10 formulas (cover all categories):

1. **✅ Simple:** `Tutorials/11 - Simple Distance Estimated 3D fractal.frag`
2. **✅ Classic:** `Historical 3D Fractals/Mandelbox.frag`
3. **✅ IFS:** `Kaleidoscopic IFS/Menger.frag`
4. **✅ With Helpers:** `Knighty Collection/PseudoKleinian.frag`
5. **✅ With init():** `Knighty Collection/Menger_Sphere.frag`
6. **✅ Kaliset:** `Kali's Creations/Kalibox.frag`
7. **⚠️ Break:** `Include/Kaliset3D.frag` (check warning)
8. **❌ providesColor:** `Tutorials/10 - Simple Distance Estimated 3D system.frag` (check warning)
9. **❌ 2D:** `Tutorials/00 - Simple 2D system.frag` (check error)
10. **⚠️ External Include:** `Experimental/SphereSponge.frag` (check warning)

## 📊 EXPECTED OUTCOME SUMMARY

| Category | Count | Expected | Notes |
|----------|-------|----------|-------|
| ✅ Full Support | ~40 | Should import cleanly | Simple DE formulas |
| ⚠️ With Warnings | ~30 | Import with warnings | Breaks, complex loops, computed uniforms |
| ❌ Not Supported | ~20 | Warning + fail | providesColor, 2D, missing DE |
| 🔴 External deps | ~15 | Warning | Missing includes |

**Total testable formulas:** ~105 frag files in Examples directory

## 🐛 KNOWN ISSUES TO WATCH FOR

1. **Rotation Axis:** Formulas with `RotVector` should use `normalize(RotVector)` not hardcoded axis
2. **Variable Conflicts:** Ensure `z` is renamed to `z_local` properly
3. **Uniform Substitution:** Check that `Scale` becomes `uScale`, etc.
4. **Orbit Trap:** `orbitTrap` should become `trap`
5. **Return Values:** DE functions that return float should set `z.w` or use proper distance output

## 📝 REPORTING BUGS

When a formula fails, check:
1. Console for parsing errors
2. Warnings displayed in yellow box
3. GLSL compilation errors in browser console
4. Formula preview (if available)

Include in bug report:
- Formula file name
- Warnings shown
- Error message (if any)
- Expected vs actual behavior
