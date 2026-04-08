# Fragmentarium Importer Formula Analysis

## Analysis of Testing Guide Formulas - V2 Parser Compatibility

This document reviews each formula from the TESTING_GUIDE.md and assesses V2 parser compatibility.

---

## ✅ HIGH PRIORITY - Expected to Work

### Simple DE Formulas

| File | Category | V2 Support | Notes |
|------|----------|------------|-------|
| `Tutorials/11 - Simple Distance Estimated 3D fractal.frag` | Menger Cube | ✅ **TESTED WORKING** | Uses `z = abs(z)` pattern with `.x/.y/.z` swizzles |
| `Tutorials/12 - Faster raytracing of 3D fractals.frag` | Menger Cube | ✅ Should work | Similar to #11 with `orbitTrap` coloring |
| `Kali's Creations/Kalibox.frag` | Kaliset | ⚠️ **BUG FOUND** | Uses `z.z` which was being renamed to `z_pos.z_pos` - **NOW FIXED** |
| `Kaleidoscopic IFS/Menger.frag` | Menger IFS | ✅ Should work | Standard IFS pattern |
| `Kaleidoscopic IFS/Dodecahedron.frag` | IFS | ✅ Should work | IFS with fold/rotate |
| `Kaleidoscopic IFS/Icosahedron.frag` | IFS | ✅ Should work | Similar IFS pattern |
| `Kaleidoscopic IFS/Tetrahedron.frag` | IFS | ✅ Should work | Tetrahedron folding |
| `Knighty Collection/Menger_iterated_20.frag` | Menger | ✅ Should work | Simple Menger |
| `kosalos/Mandelbulb.frag` | Mandelbulb | ✅ Should work | Classic Mandelbulb |
| `kosalos/KIFS.frag` | KIFS | ✅ Should work | KIFS style with scale |
| `Historical 3D Fractals/Mandelbox.frag` | Mandelbox | ⚠️ **NEEDS TESTING** | May detect MANDELBOX pattern |
| `Historical 3D Fractals/Mandelbulb.frag` | Mandelbulb | ⚠️ **NEEDS TESTING** | Generic transformation |

### Formulas with init() Function

These use `#define providesInit` - init() body needs to be inlined at the start of the formula.

| File | Category | V2 Support | Notes |
|------|----------|------------|-------|
| `Knighty Collection/Menger_Sphere.frag` | Menger/Sphere | ⚠️ **NEEDS IMPLEMENTATION** | Has init() with rotation matrix |
| `kosalos/KaliBox.frag` | Kaliset | ⚠️ **NEEDS IMPLEMENTATION** | init() with precomputations |
| `kosalos/Kleinian.frag` | Kleinian | ⚠️ **NEEDS IMPLEMENTATION** | init() for setup |

**Required V2 Enhancement:** Parse and inline init() function body before the main loop.

### Formulas with Custom Helpers

These define helper functions that need AST extraction and renaming.

| File | Category | Helpers | V2 Support | Notes |
|------|----------|---------|------------|-------|
| `Knighty Collection/PseudoKleinian.frag` | Kleinian | RoundBox, Thingy, Thing2 | ⚠️ **SHOULD WORK** | Multiple helpers - test extraction |
| `Kali's Creations/amazingsurface.frag` | Amazing Surface | Various | ⚠️ **TEST** | May need AMAZING_SURFACE pattern |
| `kosalos/PseudoKleinian-FirstSurface.frag` | Kleinian | Multiple | ⚠️ **SHOULD WORK** | Helper extraction |
| `kosalos/Monster.frag` | Complex | Multiple | ⚠️ **TEST** | Complex helpers |
| `kosalos/SpudsVille.frag` | Complex | Multiple | ⚠️ **TEST** | Multiple helpers |
| `kosalos/Tower.frag` | Complex | Multiple | ⚠️ **TEST** | Helper extraction |
| `kosalos/Vertebrae.frag` | Complex | Multiple | ⚠️ **TEST** | Helper extraction |

---

## ⚠️ MEDIUM PRIORITY - Edge Cases

### Formulas with Break Statements

| File | Category | V2 Support | Notes |
|------|----------|------------|-------|
| `Include/Kaliset3D.frag` | Kaliset | ⚠️ **WARNING** | `break` for early exit - warn but attempt |
| `Kali's Creations/KboxExpSmooth.frag` | Kaliset | ⚠️ **WARNING** | May have early exit |
| `kosalos/Apollonian.frag` | Apollonian | ⚠️ **WARNING** | Check break conditions |
| `kosalos/Apollonian2.frag` | Apollonian | ⚠️ **WARNING** | Check break conditions |

**V2 Behavior:** Should detect `break` statements and warn, but attempt conversion.

### Formulas with Complex Loop Conditions

| File | Category | V2 Support | Notes |
|------|----------|------------|-------|
| `Knighty Collection/PseudoKleinian.frag` | Kleinian | ⚠️ **WARNING** | `for(int i=0; i<MI && ap!=p; i++)` |
| `mclarekin/sym4_1.frag` | Complex | ⚠️ **WARNING** | Complex loop conditions |
| `neozhaoliang/Boyd-Maxwell-Ball-Packings/*.frag` | Ball Packings | ⚠️ **WARNING** | Complex loops |

**V2 Behavior:** Warn about ignored conditions, use iteration count only.

### Formulas with Computed Uniforms

Global expressions referencing uniforms need special handling.

| File | Category | V2 Support | Notes |
|------|----------|------------|-------|
| `Knighty Collection/Menger_Sphere.frag` | Menger | ⚠️ **MAY NEED FIX** | `sc, sr` computed from `Offset` |
| `Knighty Collection/MandalayBox.frag` | Mandelbox | ⚠️ **TEST** | May have computed values |
| `kosalos/Sponge.frag` | Sponge | ⚠️ **TEST** | Check computed uniforms |
| `kosalos/SierpinskTetra.frag` | Sierpinski | ⚠️ **TEST** | Check computed uniforms |

**Issue:** Computed uniforms like `vec3 sc = Offset * Scale;` need to be inlined as constants or extracted to uniforms.

---

## ❌ NOT SUPPORTED

### providesColor Formulas (Volumetric)

These define `baseColor()` instead of using `orbitTrap` for coloring.

| File | Category | V2 Support | Notes |
|------|----------|------------|-------|
| `Tutorials/10 - Simple Distance Estimated 3D system.frag` | DE System | ❌ **NOT SUPPORTED** | `providesColor` - completely different architecture |
| `Tutorials/26 - 3D fractals without a DE.frag` | Volumetric | ❌ **NOT SUPPORTED** | No DE function |
| `Kali's Creations/cosmos.frag` | Volumetric | ❌ **NOT SUPPORTED** | `providesColor` |
| `Knighty Collection/LiftedDomainColoring3D.frag` | Domain Coloring | ❌ **NOT SUPPORTED** | Likely `providesColor` |
| `Knighty Collection/hyperbolic-tesselation-2Din3D-colored-02.frag` | 2D/3D | ❌ **NOT SUPPORTED** | Check for `providesColor` |
| `Experimental/SkyboxTest.frag` | Skybox | ❌ **NOT SUPPORTED** | Not a DE fractal |
| `Experimental/Terrain.frag` | Terrain | ❌ **NOT SUPPORTED** | Not a DE fractal |

**Why Not Supported:** GMT uses orbitTrap-based coloring (float distance), not volumetric baseColor() returns. Completely different rendering architecture.

### 2D Formulas

| File | Category | V2 Support | Notes |
|------|----------|------------|-------|
| `Tutorials/00 - Simple 2D system.frag` | 2D System | ❌ **NOT SUPPORTED** | 2D architecture |
| `Tutorials/01 - Simple 2D Escape Time Fractal.frag` | 2D Escape Time | ❌ **NOT SUPPORTED** | 2D architecture |
| `Tutorials/20 - Progressive 2D.frag` | 2D Progressive | ❌ **NOT SUPPORTED** | 2D architecture |
| `Tutorials/21 - Progressive 2D Escape Time Fractal.frag` | 2D Escape | ❌ **NOT SUPPORTED** | 2D architecture |
| `Knighty Collection/my_2D.frag` | 2D | ❌ **NOT SUPPORTED** | 2D architecture |
| `Knighty Collection/poincare-disc30-circle_limit_6.frag` | 2D Hyperbolic | ❌ **NOT SUPPORTED** | 2D architecture |

**Why Not Supported:** GMT is a 3D raymarcher. 2D escape-time formulas need completely different rendering approach.

### Formulas with External Dependencies

| File | Category | V2 Support | Notes |
|------|----------|------------|-------|
| `Experimental/SphereSponge.frag` | Sponge | ⚠️ **EXTERNAL DEPS** | Needs `Classic-Noise.frag` |
| `Experimental/TextureTest.frag` | Texture | ⚠️ **EXTERNAL DEPS** | External dependencies |
| `Experimental/TriPlanarTexturing.frag` | Texturing | ⚠️ **EXTERNAL DEPS** | External dependencies |
| `Knighty Collection/Doyle-Spirals.frag` | Spirals | ⚠️ **EXTERNAL DEPS** | Check for includes |
| `gannjondal/*.frag` | Newton | ⚠️ **EXTERNAL DEPS** | Complex includes |
| `neozhaoliang/**/*.frag` | Various | ⚠️ **EXTERNAL DEPS** | Many dependencies |

**V2 Behavior:** Warn about missing includes but attempt to process. User may need to manually resolve dependencies.

---

## 🔧 V2 Parser Implementation Status

### ✅ Already Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| AST-based GLSL parsing | ✅ | Using @shaderfrog/glsl-parser |
| Variable renaming (`f_` prefix) | ✅ | Safe renaming via AST visitors |
| Loop body extraction | ✅ | Extract while/for loop content |
| Helper function extraction | ✅ | Extract and rename helpers |
| Uniform detection | ✅ | Parse uniform declarations |
| Parameter mapping to GMT slots | ✅ | uParamA-F, uVec3A-C |
| orbitTrap → trap transformation | ✅ | Type conversion via length() |
| getLength() for distance metrics | ✅ | GMT metric support |
| Distance expression extraction | ✅ | From return statements |
| getDist generation | ✅ | GMF Shader_Dist equivalent |
| dr estimation | ✅ | For KIFS/Menger formulas |
| iter parameter | ✅ | Formula receives iteration count |

### ⚠️ Needs Testing/Verification

| Feature | Status | Notes |
|---------|--------|-------|
| `init()` function inlining | ⚠️ | Test with Menger_Sphere.frag |
| Helper function AST transformation | ⚠️ | Test with PseudoKleinian.frag |
| Complex loop conditions | ⚠️ | Warn but proceed |
| Break statement handling | ⚠️ | Warn and convert |
| Computed uniform handling | ⚠️ | May need inlining |
| ColorIterations vs Iterations | ⚠️ | Test Tutorial 12 |

### ❌ Known Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| `providesColor` formulas | ❌ | Not supported - different architecture |
| 2D formulas | ❌ | Not supported |
| External includes | ❌ | Not auto-resolved |
| `baseColor()` rendering | ❌ | Requires volumetric rendering |

---

## 🧪 Recommended Test Order

### Phase 1: Basic Functionality (Start Here)

1. **✅ `Tutorials/11 - Simple Distance Estimated 3D fractal.frag`**
   - **Status:** TESTED WORKING
   - **Why:** Simplest formula, validates core loop extraction

2. **✅ `Kali's Creations/Kalibox.frag`**
   - **Status:** BUG FIXED (z.z → z_pos.z_pos)
   - **Why:** Tests simple DE with minimal complexity

3. **✅ `kosalos/Mandelbulb.frag`**
   - **Status:** SHOULD WORK
   - **Why:** Classic Mandelbulb, tests `length()` → `getLength()`

### Phase 2: Advanced Features

4. **⚠️ `Knighty Collection/PseudoKleinian.frag`**
   - **Status:** NEEDS TEST
   - **Why:** Multiple helper functions

5. **⚠️ `Knighty Collection/Menger_Sphere.frag`**
   - **Status:** NEEDS init() INLINING
   - **Why:** Has `#define providesInit`

6. **⚠️ `Tutorials/12 - Faster raytracing of 3D fractals.frag`**
   - **Status:** NEEDS TEST
   - **Why:** orbitTrap coloring with ColorIterations

### Phase 3: Edge Cases

7. **⚠️ `Include/Kaliset3D.frag`**
   - **Status:** NEEDS TEST
   - **Why:** Has `break` statement

8. **❌ `Tutorials/10 - Simple Distance Estimated 3D system.frag`**
   - **Status:** NOT SUPPORTED
   - **Why:** providesColor - verify warning shows

---

## 🐛 Issues Found & Fixed

| Issue | Formula | Root Cause | Fix |
|-------|---------|------------|-----|
| `z.z` → `z_pos.z_pos` | Kalibox.frag | Regex `\bz\b` matched `.z` | Protect `.z` with placeholder before rename |
| Distance metrics ignored | All | Used `length()` instead of `getLength()` | Add `length()` → `getLength()` transform |

---

## 📋 Action Items

1. **Test the 3 formulas in Phase 1** to confirm V2 parser works
2. **Implement init() inlining** for Menger_Sphere.frag
3. **Test helper extraction** with PseudoKleinian.frag
4. **Verify break statement warning** with Kaliset3D.frag
5. **Add providesColor detection** to show clear "not supported" message

---

*Last Updated: 2026-02-28*
