# Fragmentarium to GMF Conversion Guide

> **⚠️ SUPERSEDED** — This document is from the early importer era. For current conversion guidance, see:
> - [21_Frag_Importer_Current_Status.md](../21_Frag_Importer_Current_Status.md) — current importer status (V3 pipeline, 64/64 passing)
> - [22_Frag_to_Native_Formula_Conversion.md](../22_Frag_to_Native_Formula_Conversion.md) — step-by-step native formula conversion
> - [25_Formula_Dev_Reference.md](../25_Formula_Dev_Reference.md) — full formula API reference
>
> Kept for historical context only.

This document explains how to convert Fragmentarium (`.frag`) shader files to GMT's GMF (GPU Mandelbulb Format) for use in the gallery.

## Overview

GMF is a hybrid format that combines XML-style metadata (JSON) with GLSL shader code. It allows sharing formulas as single portable files that include default parameters and presets.

## Key Differences: Fragmentarium vs GMT

### Parameters You Should NOT Duplicate

GMT already provides several parameters as built-in features. **Do NOT create custom parameters for these:**

| Fragmentarium Parameter | GMT Built-in Uniform | Notes |
|------------------------|---------------------|-------|
| `Bailout` | `uEscapeThresh` | Use quality settings, NOT shader params |
| Iteration count | `uIterations` | Handled by quality feature |
| Julia mode toggle | `uJuliaMode` | Handled by geometry feature |
| Julia coordinates | `uJulia` (vec3) | Use geometry.juliaX/Y/Z |
| Pre-rotation | `uPreRotEnabled` + preRotX/Y/Z | Use geometry transform feature |

### Available Custom Parameters

You have 6 parameter slots (`uParamA` through `uParamF`) for formula-specific controls:

- `uParamA` - First parameter (commonly power, scale, etc.)
- `uParamB` - Second parameter 
- `uParamC` - Third parameter
- `uParamD` - Fourth parameter
- `uParamE` - Fifth parameter
- `uParamF` - Sixth parameter

## Conversion Steps

### 1. Extract the Formula Function

Fragmentarium uses a distance estimator (DE) function. Convert it to GMF's formula function signature:

```glsl
// Fragmentarium DE function
float DE(vec3 pos) {
    vec3 z = pos;
    // ... iteration logic
    return 0.5*log(r)*r/dr;
}

// GMF Shader_Function
<Shader_Function>
void formula_YourFormula(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    vec3 p = z.xyz;
    // ... iteration logic
    z.xyz = p;
    trap = min(trap, length(p));
}
</Shader_Function>
```

### 2. Map Parameters

Map Fragmentarium uniforms to GMF params. Use all 6 params when possible:

| GMF param | Typical Use | Example |
|-----------|------------|---------|
| paramA | Power, Scale | Mandelbulb power |
| paramB | Secondary scale | MinRad2, fold values |
| paramC | Angle/Rotation | Rotation angle |
| paramD | Flags/Modes | Encoded boolean flags |
| paramE | Coordinates | Additional vector components |
| paramF | Fine tuning | Offset values |

### 3. Handle Boolean Flags

For multiple boolean options, encode as bit flags in a single parameter:

```glsl
// paramD encodes multiple options as bits
// bit 0 = option1, bit 1 = option2, bit 2 = option3, etc.
bool option1 = (mod(floor(paramD / 1.0), 2.0) > 0.5);
bool option2 = (mod(floor(paramD / 2.0), 2.0) > 0.5);
bool option3 = (mod(floor(paramD / 4.0), 2.0) > 0.5);
```

### 4. Set Up Preset Correctly

The preset JSON should reference GMT's built-in features:

```json
{
  "features": {
    "coreMath": {
      "iterations": 20,
      "paramA": 2.0,
      "paramB": 2.0,
      "paramC": 0.0,
      "paramD": 22
    },
    "geometry": {
      "juliaMode": true,
      "juliaX": 0.3695652,
      "juliaY": -0.3423913,
      "juliaZ": -0.423913
    },
    "quality": {
      "escape": 4.0
    }
  }
}
```

### 5. Use Julia Mode Correctly

In your shader function, check `uJuliaMode` to switch between Mandelbrot and Julia modes:

```glsl
vec3 cVal = uJuliaMode > 0.5 ? uJulia : c.xyz;
p += cVal;
```

The Julia coordinates come from `geometry.juliaX/Y/Z`, NOT from your custom parameters.

### 6. Distance Estimation

GMF provides the distance estimation. Use the standard formula:

```glsl
<Shader_Dist>
float m2 = r * r;
if (m2 < 1.0e-20) return vec2(0.0, iter);

// Standard DE formula
float d = 0.5 * log(m2) * r / max(abs(dr), 1e-20);

// Smooth iteration
float smoothIter = iter;
if (m2 > 1.0) {
    float threshLog = log2(max(uEscapeThresh, 1.1));
    smoothIter = iter + 1.0 - log2(log2(m2) / threshLog);
}
return vec2(d, smoothIter);
</Shader_Dist>
```

## GMF File Structure

```gmf
<!--
  GMF: GPU Mandelbulb Format v1.0
  A proprietary container for Fractal math definitions + default presets.
-->

<!-- API Reference -->
<Metadata>
{
  "id": "YourFormula",
  "name": "Your Formula Name",
  "shortDescription": "Brief description",
  "description": "Full description",
  "parameters": [
    { "label": "Power", "id": "paramA", "min": 0, "max": 16, "step": 0.1, "default": 2 }
    // ... up to 6 params
  ],
  "defaultPreset": {
    "name": "YourFormula",
    "formula": "YourFormula",
    "features": {
      "coreMath": { "iterations": 20, "paramA": 2, ... },
      "geometry": { "juliaMode": false, ... },
      // ... other features
    }
  }
}
</Metadata>

<!-- Main Formula Function -->
<Shader_Function>
void formula_YourFormula(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    // Your formula code here
}
</Shader_Function>

<!-- Iteration Loop -->
<Shader_Loop>
formula_YourFormula(z, dr, trap, c);
</Shader_Loop>

<!-- Optional: Custom Distance -->
<Shader_Dist>
// Custom DE if not using standard formula
</Shader_Dist>
```

## Available Helper Functions

GMT provides these built-in functions:

- `sphereFold(inout vec3 z, inout float dz, float minR, float fixedR)`
- `boxFold(inout vec3 z, inout float dz, float limit)`
- `dodecaFold(inout vec3 z)`
- `bulbPow(vec3 z, float power)` - Spherical power
- `quatPow(vec4 q, float p)` - Quaternion power
- `quatMult(vec4 q1, vec4 q2)` - Quaternion multiply
- `snoise(vec3 v)` - Simplex noise

## Using the Fragmentarium Importer Tool

GMT now includes a built-in **Fragmentarium Importer** that automates the conversion process:

### How to Access
1. Open the Formula dropdown in the UI
2. Click "Import from Fragmentarium (.FRAG)" button
3. Paste your Fragmentarium .frag file code
4. Click "Parse Parameters" to extract uniforms
5. Map parameters to GMT's 6 parameter slots (paramA-F)
6. Click "Import & Compile" to add the formula

### What the Importer Does
- **Extracts uniforms**: Automatically finds `uniform` declarations with slider/checkbox/color annotations
- **Parses presets**: Reads `#preset` blocks for default values
- **Maps parameters**: Assigns Fragmentarium uniforms to GMT's paramA-F slots
- **Handles Julia mode**: Detects `Julia` toggle and `JuliaValues` vec3
- **Generates GMT formula**: Creates a `formula_` function with proper GMT signature
- **Registers the formula**: Adds it to the registry for immediate use

### Importer Limitations
- Simple DE functions work best
- Complex multi-pass shaders may need manual adjustment
- Some Fragmentarium-specific functions (like `rotationMatrix3`) need to be defined
- The generated formula may need tweaking for optimal results

### Post-Import Tips
After importing, you can:
- Export the formula as GMF using the Export button
- Edit the generated code in the browser console (see logged output)
- Fine-tune parameter ranges in the Parameter Mapping table
- Save the final result as a .gmf file for the gallery

## Adding to Gallery

1. Place the `.gmf` file in `public/gmf/fragmentarium/`
2. Add entry to `public/gmf/gallery.json`:

```json
{
  "id": "YourFormula",
  "name": "Your Formula Name", 
  "path": "/gmf/fragmentarium/YourFormula.gmf"
}
```

## Common Issues

1. **Fractal not appearing**: Check Julia parameters in geometry section
2. **Wrong shape**: Verify parameter mapping matches Fragmentarium's original
3. **Bailout issues**: Don't use param for bailout - use quality.escape instead
4. **Redundant parameters**: Don't duplicate juliaX/Y/Z or pre-rotation - use geometry feature

## Example: Buffalo Bulb Conversion

See `public/gmf/fragmentarium/BuffaloBulb.gmf` for a complete example that:
- Uses 4 params (Power, Bailout→ignored, Rot, Flags)
- Relies on geometry.juliaX/Y/Z for Julia mode
- Encodes 6 boolean flags in a single parameter

## Technical Implementation Details

### Importer Files
| File | Purpose |
|------|---------|
| `features/fragmentarium_import/parsers/ast-parser.ts` | AST-based parser (V2, active) |
| `features/fragmentarium_import/parsers/uniform-parser.ts` | V1 uniform extraction (fallback) |
| `features/fragmentarium_import/parsers/dec-preprocessor.ts` | DEC format preprocessor |
| `features/fragmentarium_import/transform/` | Code generation, variable renaming, init generation |
| `features/fragmentarium_import/FormulaWorkshop.tsx` | UI workshop for import pipeline |

### Parser Phases
1. **Phase 1 - Skeleton**: Initialize empty document structure
2. **Phase 2 - Preprocessing**: Extract presets, strip comments and directives
3. **Phase 3 - Uniform Parsing**: Parse uniform declarations with annotations
4. **Phase 4 - Scope-Aware Parsing**: Extract global variables and functions
5. **Phase 5 - GLSL Generation**: Generate GMT-compatible formula code

### Generated Code Structure
```glsl
// --- Auto-generated by Formula Importer ---

// 1. Constant definitions for fixed parameters
const float paramName = value;

// 2. Uniform mappings for dynamic parameters
#define paramName uParamA

// 3. Global variable declarations
float globalVar;

// 4. Original Fragmentarium code (DE function, helpers)
float DE(vec3 pos) { ... }

// 5. Initialization function
void init_globals() { ... }

// 6. GMT Formula wrapper
void formula_ImportedName(inout vec4 z, inout float dr, inout float trap, vec4 c) {
    init_globals();
    // Call DE or getDist
}
```

## Current Implementation Status (February 2025)

### What Works Well

1. **Kalibox (Mandelbox) Import**
   - ✅ DE formula structure converts correctly
   - ✅ Scale, MinRad2, Trans parameters map properly
   - ✅ Julia mode detection (DoJulia uniform)
   - ✅ Rotation angle in radians (0-180 range)
   - ⚠️ Julia mode enablement from preset needs fixing

2. **Amazing Surface Import**
   - ✅ XY folding logic (3 fold types)
   - ✅ FoldType and FoldValues parameter mapping
   - ✅ Scale/clamp formula: `Scale / clamp(r2, MinRad2, 1.0)`
   - ✅ Derivative calculation: `dr *= abs(k)`
   - ✅ Julia mode detection (Julia bool + JuliaValues vec3)
   - ⚠️ Rotation matrix may have axis issues
   - ⚠️ PreTranslation line generation needs fixing

3. **General Features**
   - ✅ Uniform parsing with slider/checkbox annotations
   - ✅ Preset value extraction (#preset blocks)
   - ✅ Iteration count capture
   - ✅ Automatic parameter slot assignment (paramA-F)
   - ✅ Degree-to-radian conversion for rotation angles
   - ✅ vec2 and vec3 parameter support

### Known Issues

| Issue | Description | Priority |
|-------|-------------|----------|
| Julia Mode Not Enabled | Preset value `DoJulia = true` not setting `juliaMode: true` in output | High |
| PreTranslation Missing | When PreTranslation is mapped to slots, the `p += PreTranslation` line is not generated | High |
| vec3 UI Rendering | vec3 params (Trans, PreTranslation, etc.) split into 3 sliders instead of Vector3Input | High |
| Rotation Matrix | Amazing Surface rotation may have incorrect axis or matrix layout | Medium |
| RotVector Handling | Hardcoded to (1,1,1) but should potentially be editable | Low |

### vec3 UI Rendering Issue

**Current Behavior:**
- Fragmentarium vec3 params (e.g., `Trans`) are split into 3 param slots (paramA, paramB, paramC)
- AutoFeaturePanel renders 3 separate Slider components
- This is cluttered and doesn't match the Vector3Input used elsewhere in GMT

**Expected Behavior:**
- vec3 params should render as a single Vector3Input component
- Each axis (X, Y, Z) should be editable together with color-coded bars
- Should support keyframe animation for the whole vector

**Technical Analysis:**
The GMT system handles vec3 using `composeFrom`:
```typescript
julia: { 
    type: 'vec3', 
    default: new THREE.Vector3(0,0,0), 
    composeFrom: ['juliaX', 'juliaY', 'juliaZ'] 
}
```

The Fragmentarium importer should:
1. Register individual float params for each axis (e.g., `transX`, `transY`, `transZ`)
2. Register a vec3 param with `composeFrom` pointing to those floats
3. GLSL generates: `vec3 Trans = vec3(uParamA, uParamB, uParamC)`
4. AutoFeaturePanel will render Vector3Input for the vec3 param

**Implementation Plan:**
- Modify `FormulaWorkshop.tsx` to handle vec3 params specially
- Instead of creating 3 separate uiParams, create:
  - 3 float params with hidden=true (for GLSL uniform access)
  - 1 vec3 param with composeFrom (for UI rendering)
- Update preset generation to set all 3 component values
- Ensure GLSL generation still works with individual uniforms

### Technical Implementation Details

#### Parameter Mapping Priority
The importer uses this priority order for assigning paramA-F slots:
1. Julia/JuliaValues → uJulia (built-in)
2. DoJulia/Julia (bool) → uJuliaMode (built-in)
3. Scale → paramA
4. MinRad2 → paramB
5. FoldType → paramC
6. FoldValues → paramD+E (vec2)
7. RotAngle → paramF
8. Other params → remaining slots

#### Formula Generation Differences

**Mandelbox Style (Kalibox):**
```glsl
// Order: Rotation → Fold → Scale → Offset
p *= rot;                          // Before fold
p = abs(p) + Trans;               // Fold
float k = clamp(max(MinRad2/r2, MinRad2), 0.0, 1.0);
p *= k;
p = p * (Scale/MinRad2) + p0;     // Scale + offset
dr = dr * k * (abs(Scale)/MinRad2) + 1.0;
```

**Amazing Surface Style:**
```glsl
// Order: Fold → PreTranslation → Scale/Clamp → Add C → Rotation
// XY folding based on FoldType
p.xy = abs(p.xy + FoldValues) - abs(p.xy - FoldValues) - p.xy;
p += PreTranslation;              // Usually 0,0,0
float k = Scale / clamp(r2, MinRad2, 1.0);
p *= k;
dr *= abs(k);                     // Simpler derivative
p += cVal;                        // Add constant
p *= rot;                         // Rotation AFTER everything
```

#### Critical Code Paths

**Parser:** `features/fragmentarium_import/FragmentariumParser.ts`
- `parse()` - Extracts uniforms, presets, iterations
- `generateGLSL()` - Creates GMT-compatible formula function
- Slot assignment happens in the parse loop

**UI:** `features/fragmentarium_import/FormulaWorkshop.tsx`
- Displays parameter mapping table
- Applies preset values to default preset
- Handles Julia mode enablement

#### Rotation Matrix Generation

The importer generates rotation matrices inline:
```glsl
vec3 axis = normalize(vec3(1.0, 1.0, 1.0));  // Amazing Surface
vec3 axis = normalize(vec3(1.0, 1.0, 0.0));  // Mandelbox (Kalibox)
float s = sin(angle);
float c_rot = cos(angle);
float oc = 1.0 - c_rot;
mat3 rot = mat3(
    oc*axis.x*axis.x + c_rot, oc*axis.x*axis.y - axis.z*s, oc*axis.z*axis.x + axis.y*s,
    oc*axis.x*axis.y + axis.z*s, oc*axis.y*axis.y + c_rot, oc*axis.y*axis.z - axis.x*s,
    oc*axis.z*axis.x - axis.y*s, oc*axis.y*axis.z + axis.x*s, oc*axis.z*axis.z + c_rot
);
```

### Debugging Tips

1. **Check logged output**: The importer logs generated GLSL to console
2. **Verify paramMap**: Add console.log to see which params are detected
3. **Test preset values**: Check that preset values flow through to uiDefault
4. **Compare with reference**: Use reference .gmf files in `reference/` folder

### Roadmap for Universal 3D Formula Support

To make the importer work with ANY 3D Fragmentarium formula:

#### Phase 1: Fix Current Issues
- [ ] Fix Julia mode enablement from preset boolean values
- [ ] Fix PreTranslation line generation when mapped
- [ ] Verify rotation matrix correctness against reference renders
- [ ] Add validation for generated GLSL

#### Phase 2: Enhanced Flexibility
- [ ] Support arbitrary parameter names (not just hardcoded ones)
- [ ] Auto-detect formula type (Mandelbox vs Amazing Surface vs generic)
- [ ] Handle custom fold functions
- [ ] Support multiple rotation axes

#### Phase 3: Advanced Features
- [ ] Parse and inline helper functions from .frag
- [ ] Support conditional compilation (#ifdef)
- [ ] Handle orbit trap variations
- [ ] Auto-generate getDist from DE function analysis

#### Phase 4: Robustness
- [ ] Error recovery for malformed .frag files
- [ ] Parameter validation UI
- [ ] Preview mode before import
- [ ] Batch conversion tool

### File References

| Reference File | Purpose |
|---------------|---------|
| `reference/Kalibox.frag` | Mandelbox-style formula sample |
| `reference/AmazingSurface.frag` | Amazing Surface formula sample |
| `reference/KalisCreations-Kalibox.gmf` | Expected Mandelbox output |
| `reference/KalisCreations-AmazingSurface.gmf` | Expected Amazing Surface output |

### Future Enhancements
- [ ] Automatic rotation matrix generation for RotVector/RotAngle
- [ ] Better handling of complex init() functions
- [ ] Support for Fragmentarium's orbit trap patterns
- [ ] Batch import from multiple .frag files
- [ ] Visual parameter range validation
- [ ] Auto-detection of common parameter types (scale, power, fold)
