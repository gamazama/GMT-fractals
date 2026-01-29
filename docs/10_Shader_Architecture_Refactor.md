
# Refactoring Report: Shader Factory Decomposition

## 1. The Current Problem
The `ShaderFactory.ts` has become a "God Object." It knows too much about the specific requirements of every feature.
*   **Dependency Hunting:** Shaders like `Physics` and `Histogram` need pieces of code (like `getMappingValue`) that live inside Features (like `Coloring`), but the Factory has to manually inject "dummy stubs" to satisfy the linker because it skips the Feature logic for those variants.
*   **Hardcoded Logic:** `getDefines` manually checks specific feature flags (`lighting.shadowsCompile`), coupling the Factory to specific state slices.
*   **Copy-Paste Variants:** `generatePhysicsShader` and `generateHistogramShader` are 80% duplicates of the main shader generator, leading to drift and bugs (like the missing function error).

## 2. Inventory of Logic to Migrate
The following logic currently lives in `ShaderFactory` and must be moved into the **Feature System**:

| Logic Block | Current Location | Proposed Location |
| :--- | :--- | :--- |
| **Formula Code** | `getActiveFormulaCode()` | `FormulaDefinition` (Registry) |
| **Defines** | `getDefines()` (e.g. `PT_ENABLED`) | `LightingFeature.inject()` |
| **Shadow Quality** | `getDefines()` (`SHADOW_QUALITY`) | `LightingFeature.inject()` |
| **Render Mode** | `generateFragmentShader` (Integrator switch) | `LightingFeature` (decides Integrator) |
| **Trace Loop** | `getTraceGLSL` (imports constant) | `RaymarchingFeature` (New Core Feature) |
| **Post Process** | `POST` chunk | `PostProcessFeature` (New Meta Feature) |
| **Uniforms** | `UNIFORMS` chunk | Aggregated automatically by Builder |
| **Stubs** | Manual strings in `generatePhysics...` | `ColoringFeature` (Variant aware) |

## 3. The New Architecture: `ShaderBuilder`

We will replace string concatenation with a structured **Builder Pattern**.

### 3.1 The Concept
Instead of the Factory deciding what string goes where, the **Features** decide.
The Factory simply creates a `ShaderBuilder` instance and passes it to every enabled Feature.

```typescript
// The new contract for Features
interface FeatureDefinition {
    // ... existing metadata ...
    inject?: (builder: ShaderBuilder, variant: 'Main' | 'Physics' | 'Histogram') => void;
}
```

### 3.2 The Builder Interface
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

## 4. Solving the "Dummy Stub" Issue

With this system, the `ColoringFeature` becomes variant-aware. It no longer relies on the Factory to clean up its mess.

**Old Way (Factory):**
```typescript
// ShaderFactory.ts
if (variant === 'Physics') {
   functions += "float getMappingValue(...) { return 0.0; }"; // Dummy
}
```

**New Way (Feature):**
```typescript
// ColoringFeature.ts
inject: (builder, variant) => {
    if (variant === 'Main') {
        builder.addFunction(generateMappingShader()); // Real code
    } else {
        // Feature explicitly provides its own safe stub for other modes
        builder.addFunction("float getMappingValue(...) { return 0.0; }"); 
    }
}
```

## 5. Implementation Roadmap

### Phase 1: Create the Builder Class
Implement `engine/ShaderBuilder.ts` to manage the collection of strings strings (`defines`, `uniforms`, `functions`, `mainBody`).

### Phase 2: Refactor Feature Interface
Update `FeatureSystem.ts` to include the `inject(builder, variant)` method.

### Phase 3: Migrate Core Features
1.  **Formula Registry:** Update `FractalDefinition` to use the builder.
2.  **Lighting:** Move `PT_ENABLED`, `DISABLE_SHADOWS` defines into `LightingFeature.inject`.
3.  **Coloring:** Move `getMappingValue` logic into `ColoringFeature.inject`.

### Phase 4: Rewrite ShaderFactory
The Factory becomes a dumb coordinator:
```typescript
const builder = new ShaderBuilder(config);
features.forEach(f => f.inject(builder, renderVariant));
return builder.buildFragment();
```

## 6. Immediate Benefit
This solves the `getMappingValue` error permanently. The `Physics` shader will request injection from the `Coloring` feature. The `Coloring` feature will see it's in `Physics` mode and inject a valid stub, instead of the Factory trying to guess what function signatures are missing.
