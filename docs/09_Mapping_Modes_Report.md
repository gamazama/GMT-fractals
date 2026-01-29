
# Architecture Report: Modular Gradient Mapping

## 1. Executive Summary
We have successfully decoupled the **Color Mapping Logic** from the core shader chunks. Previously, `coloring.ts` contained a hardcoded `if/else` chain mapping integer IDs (0-8) to specific math. This created technical debt where adding a mode required editing core files and manually syncing UI dropdown indices.

The new system introduces a **Mapping Registry** within the Coloring Feature.

## 2. Viability Assessment
**Status:** 🟢 **High Viability**

### Advantages
1.  **Scalability:** New modes can be added by simply appending an object to `MappingModes.ts`. The UI and Shader update automatically.
2.  **Performance:** The shader generator creates an optimized `if/else` ladder. While a `switch` statement is cleaner, GLSL compiler support for switch varies across WebGL1/2/ANGLE. The ladder ensures 100% compatibility.
3.  **Isolation:** Formula-specific coloring logic (e.g., "Mandelbrot Potential") is now isolated from Geometric logic (e.g., "Normal Vector").

### Risks & Mitigations
*   **Risk:** Shader Bloat. Adding 50 modes would create a massive function.
*   **Mitigation:** The GLSL compiler's Dead Code Elimination (DCE) handles this well. Since `uColorMode` is a uniform, the GPU executes only one branch effectively.

## 3. Implementation Details

### The Registry (`MappingModes.ts`)
Each mode defines:
*   `id`: Internal string ID.
*   `value`: Fixed integer for the Uniform (e.g., 0, 1, 2).
*   `label`: UI Name.
*   `glsl`: The snippet of code. Context variables (`p`, `result`, `n`, `trap`) are provided.

### Integration
The `ColoringFeature` (`features/coloring/index.ts`) imports this registry.
1.  **UI:** Maps registry to `options: [{ label: '...', value: 1 }]`.
2.  **Shader:** Iterates registry to build:
    ```glsl
    float getMappingValue(...) {
        if (mode < 0.5) { /* Code for Mode 0 */ }
        else if (mode < 1.5) { /* Code for Mode 1 */ }
        ...
    }
    ```

## 4. MandelTerrain & Potential Fixes
The previous "Potential" implementation used `log(log(r))` which returns negative values (NaN in gradients) for $1 < r < e$.
We updated this to `log2(log2(r))` which stabilizes the bands for $r > 1.0$, common in Fractal Escape Time coloring.
