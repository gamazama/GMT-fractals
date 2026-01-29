
# Rendering Internals

GMT uses a Fullscreen Quad Raymarcher. There is no traditional geometry; the entire scene is a mathematical volume rendered on two triangles covering the screen.

## 1. Coordinate Precision (The Treadmill)

Standard 32-bit floats (`float32`) have 7 digits of precision. This limits zoom to about $10^5$. Fractals require $10^{15}$.

**Solution: Split-Float Emulation (Double-Double)**
*   **VirtualSpace:** We represent the "World Origin" using two floats: `High` (Integer) + `Low` (Fractional).
*   **The Treadmill:** The camera never moves far from $(0,0,0)$ in actual GLSL space. Instead, we move the *Fractal Formula* in the opposite direction using the high-precision offset.
*   **Math:** `shaders/chunks/math_double.ts` provides emulated `ds_add`, `ds_mul`, etc., for the fractal iteration.

## 2. Rendering Modes

### A. Direct Rendering (SDF)
*   **Technique:** Sphere Tracing.
*   **Lighting:** Phong/Blinn approximation with Soft Shadows (SDF-based).
*   **Performance:** 60 FPS.
*   **Use Case:** Exploration, Animation, Editing.

### B. Path Tracing (Monte Carlo)
*   **Technique:** Unidirectional Path Tracing with Next Event Estimation (NEE).
*   **Lighting:** Global Illumination, Area Lights, Emissive Geometry.
*   **Performance:** Iterative. Renders noisy frames that accumulate over time.
*   **Use Case:** High-quality stills, Photorealism.

## 3. The Pipeline (`RenderPipeline.ts`)

To achieve high quality in a real-time browser environment, we use **Temporal Super Sampling (TSS)**.

### 3.1 Ping-Pong Buffers
We maintain two floating-point textures: `TargetA` and `TargetB`.
*   Frame N: Read `TargetB`, Write `TargetA`.
*   Frame N+1: Read `TargetA`, Write `TargetB`.

### 3.2 Accumulation Logic
```glsl
// Inside Shader
vec3 current = renderScene();
vec3 history = texture(uHistory, uv).rgb;
float blend = uBlendFactor; // 1.0/FrameCount
vec3 final = mix(history, current, blend);
```
*   **Moving:** `blend = 1.0` (History discarded, instant feedback, noisy shadows).
*   **Still:** `blend` decreases ($1/2, 1/3, \dots$). Noise averages out to zero.

## 4. Bucket Renderer
For resolutions higher than the GPU limit (e.g., 8K), or to prevent TDR (Timeout Detection Recovery) crashes:
1.  **Tiling:** The screen is divided into small buckets (e.g., 128x128).
2.  **Scissor:** The projection matrix is skewed to render *only* that tiny window.
3.  **Accumulation:** The engine renders that bucket until it converges (noise-free).
4.  **Composite:** The result is copied to a final canvas. (may need more work to ensure it can handle large files)
5.  **Repeat:** Move to next bucket.
