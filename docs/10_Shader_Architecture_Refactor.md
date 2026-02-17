
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
The `ShaderBuilder` maintains structured lists of code blocks, handling deduplication and ordering.

```typescript
class ShaderBuilder {
    addDefine(name: string, value: string = '1'): void;
    addUniform(name: string, type: string, precision?: string): void;
    addFunction(code: string): void;
    
    // Hooks into specific parts of the Raymarch Loop
    addPreDELogic(code: string): void;  // Before map() calls
    addPostDELogic(code: string): void; // After map(), for coloring/lighting
    
    buildVertex(): string;
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

## 4. Remaining Work

### Optional Optimizations
- **Dead Code Elimination:** Could optimize to exclude unused feature chunks when features are disabled (currently all chunks are included).
- **Legacy `shaderLibrary` Removal:** Some features still use the legacy `shader` property; these could be migrated to `inject()` for consistency.

### Backward Compatibility
The Factory maintains backward-compatible fallbacks for legacy `shaderLibrary` entries. This is safe but could be cleaned up in a future refactor.
