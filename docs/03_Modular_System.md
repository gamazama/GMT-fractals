
# Modular Graph System

The **Modular Builder** allows users to construct fractal equations visually using a node graph.

## 1. The Compiler (`GraphCompiler.ts`)

WebGL shaders must be compiled strings. We cannot iterate a JavaScript object graph on the GPU. We use a **Just-In-Time (JIT)** transpilation approach.

### Process:
1.  **Topological Sort:** The graph is sorted to ensure inputs calculate before outputs.
2.  **Dead Code Elimination:** Disconnected nodes are pruned.
3.  **String Generation:** We iterate the nodes and inject their specific GLSL snippet (defined in `NodeRegistry.ts`).
    *   Variables are named via SSA (Static Single Assignment): `v_{NodeID}_val`.
4.  **Injection:** The resulting string is injected into the `formula_Modular` function in the master shader.

## 2. Uniform Flattening (Optimization)

Recompiling a shader takes time (100ms - 500ms). We cannot recompile when a user drags a slider.

**Solution:**
We allocate a large static array in the shader:
```glsl
uniform float uModularParams[64];
```

*   **Compile Time:** The compiler assigns an index (e.g., `[5]`) to a node's parameter and hardcodes that index into the generated GLSL string (`uModularParams[5]`).
*   **Runtime:** When the slider moves, we simply update index `5` in the `Float32Array` and upload it to the GPU. This is instant.

## 3. Bindings
A node parameter can be "Bound" to a global slider (Param A-F).
*   **Compiler:** Instead of `uModularParams[i]`, it injects `uParamA`.
*   **Effect:** This links the graph into the main animation/keyframe system of the engine.

## 4. Node Types
*   **Fractals:** Mandelbulb, Menger (Core loops).
*   **Transforms:** Rotate, Scale, Translate, Twist (Coordinate modifiers).
*   **Folds:** BoxFold, SphereFold, Abs (Space folding).
*   **Combiners:** Union, Subtract, Intersect (CSG operations).
