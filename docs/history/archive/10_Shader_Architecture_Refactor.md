
# Refactoring Report: Shader Factory Decomposition

## 1. Status: 🟢 Implemented

The shader architecture refactoring has been completed. The codebase now uses a structured **Builder Pattern** to assemble shaders.

### What Was Done
- **ShaderBuilder (`engine/ShaderBuilder.ts`):** Collects defines, uniforms, functions and ordered code blocks.
- **Feature `inject()` Contract:** Features implement `inject(builder, config, variant)` to contribute to the final shader.
- **Factory Coordination:** `ShaderFactory` iterates `featureRegistry.getAll()` and calls `feat.inject(...)` or falls back to legacy `shaderLibrary` handling.

### Key Improvements
- **Dependency Hunting (solved):** Features provide their own functions/stubs via `inject()`; the Factory no longer guesses signatures.
- **Hardcoded Logic (reduced):** Define logic moved into features' injectors.
- **Variant Generators:** `generatePhysicsShader` and `generateHistogramShader` delegate to the shared Builder.

---

## 2. Current Architecture

### 2.1 The Builder Interface
The `ShaderBuilder` maintains structured lists of code blocks, handling deduplication and ordering. See `docs/01_System_Architecture.md` Section 2.2b for the full hook reference table.

```typescript
class ShaderBuilder {
    // --- Core ---
    addDefine(name: string, value: string = '1'): void;
    addUniform(name: string, type: string, arraySize?: number): void;
    addHeader(code: string): void;
    addPreamble(code: string): void;
    addFunction(code: string): void;          // Pre-DE (position 8)
    addPostDEFunction(code: string): void;    // Post-DE, can call map() (position 10)
    addIntegrator(code: string): void;        // After trace (position 15)

    // --- DE Configuration ---
    setFormula(loopBody, init, distFunc): void;
    setDistOverride(opts: { init?, inLoopFull?, inLoopGeom?, postFull?, postGeom? }): void;
    addHybridFold(init, preLoop, inLoop): void;
    addPostMapCode(code: string): void;       // Inside map(), accumulative (position 9)
    addPostDistCode(code: string): void;      // Inside mapDist(), accumulative (position 9)

    // --- Logic Injection ---
    addMaterialLogic(code: string): void;     // Inside getSurfaceMaterial() (position 11)
    addMissLogic(code: string): void;         // Inside sampleMiss() (position 12)
    addVolumeTracing(marchCode, finalizeCode): void;  // Inside trace loop (position 14)
    requestShading(): void;                   // Deferred calculateShading() generation
    addShadingLogic(code: string): void;      // Inside calculateShading() reflection block
    addPostProcessLogic(code: string): void;  // Inside applyPostProcessing() (position 16)
    addCompositeLogic(code: string): void;    // Inside renderPixel() (position 17)

    buildFragment(): string;
}
```

### 2.2 Feature Contract
```typescript
interface FeatureDefinition {
    // ... existing metadata ...
    inject?: (builder: ShaderBuilder, config: ShaderConfig, variant: 'Main' | 'Physics' | 'Histogram') => void;
}
```

### 2.3 Example: ColoringFeature Variant Awareness
The `ColoringFeature` is variant-aware and provides appropriate code for each shader type:

```typescript
// ColoringFeature.ts
inject: (builder, config, variant) => {
    if (variant === 'Main') {
        builder.addFunction(generateMappingShader()); // Real code
    } else {
        // Feature explicitly provides its own safe stub for other modes
        builder.addFunction("float getMappingValue(...) { return 0.0; }"); 
    }
}
```

---

## 3. Migration Status

| Logic Block | Status | Notes |
| :--- | :--- | :--- |
| **Formula Code** | ✅ Migrated | Handled via `FractalRegistry` |
| **Defines** | ✅ Migrated | Features inject via `addDefine()` |
| **Shadow Quality** | ✅ Migrated | `LightingFeature.inject()` |
| **Render Mode** | ✅ Migrated | Integrator switch in shader chunks |
| **Trace Loop** | ✅ Migrated | `shaders/chunks/trace.ts` |
| **Post Process** | ✅ Migrated | `shaders/chunks/post_process.ts` |
| **Uniforms** | ✅ Migrated | Aggregated automatically by Builder |
| **Stubs** | ✅ Migrated | Features provide variant-aware stubs |

---

## 4. DDFS Overhaul (Completed v0.8.9+)

The shader architecture was further refined via a comprehensive DDFS overhaul:

- **API cleanup:** `setDistOverride` uses named object params; `addVolumeTracing`/`addHybridFold` use named params.
- **Accumulative DE hooks:** `addPostMapCode()`/`addPostDistCode()` enable features to modify distance field inside `map()`/`mapDist()` without touching `de.ts`.
- **Deferred shading:** `requestShading()` + `addShadingLogic()` solve feature ordering — shading GLSL is generated in `buildFragment()` after all features have injected.
- **Post-processing hook:** `addPostProcessLogic()` injects into `applyPostProcessing()` after fog/glow.
- **Feature dependencies:** `dependsOn` field with topological sort in `FeatureRegistry`.
- **Core extraction:** Water plane, light spheres, and reflections fully extracted from core shader files into self-contained features.

### Remaining Optional Work
- **Dead Code Elimination:** Could exclude unused feature chunks when features are disabled.
- **Lighting monolith split:** Shadows and Path Tracer could be extracted as satellite features. High risk — shared uniforms/state. Defer until concrete pain point.
