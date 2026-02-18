
# Rendering Internals

GMT uses a Fullscreen Quad Raymarcher. There is no traditional geometry; the entire scene is a mathematical volume rendered on two triangles covering the screen.

## 1. Coordinate Precision (The Treadmill)

Standard 32-bit floats (`float32`) have 7 digits of precision. This limits zoom to about $10^5$. Fractals require $10^{15}$.

**Solution: Split-Float Emulation (Double-Double)**
*   **VirtualSpace:** We represent the "World Origin" using two floats: `High` (Integer) + `Low` (Fractional).
*   **The Treadmill:** The camera never moves far from $(0,0,0)$ in actual GLSL space. Instead, we move the *Fractal Formula* in the opposite direction using the high-precision offset.
*   **Math:** `shaders/chunks/math.ts` provides `applyPrecisionOffset()` to reconstruct absolute fractal space position from split-precision context. The CPU-side `VirtualSpace` class in `engine/PrecisionMath.ts` handles coordinate splitting and normalization.

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

## 4. Physics Distance Probe

The physics probe is used to measure the distance to the fractal surface from the camera's perspective for orbit control and UI feedback.

### 4.1 Probe Modes

The physics probe supports three modes for distance measurement:

| Mode | Value | Description | Performance |
|------|-------|-------------|-------------|
| GPU Probe | 0 (default) | Renders to 1x1 texture, reads back to CPU | Causes 100-200ms GPU stall |
| CPU Calc | 1 | Runs raymarching on CPU using idle cycles | No GPU stall, uses CPU |
| Manual | 2 | Uses fixed manual distance value | Fastest, no calculation |

**Why CPU Calculation Works:**
- GPU readback causes 100-200ms pipeline stalls when GPU is under heavy load
- CPU is often 95% idle while GPU renders fractals  
- <50 iterations is sufficient for good distance estimation
- No GPU-CPU synchronization needed

### 4.2 Optimization
The physics probe was optimized to reduce performance impact:

- **Resolution Reduction:** Changed from 4x4 to 1x1 pixel probe
- **Update Frequency:** Reduced from every 6 frames to every 20 frames
- **Conditional Execution:** Only runs when accumulation count ≤ 1 (first frame of accumulation)
- **Manual Override:** Added option to disable probe and use manual distance
- **Compilation Check:** Skips probe during shader compilation
- **Context Check:** Skips probe if WebGL context is lost or invalid
- **Maximum Performance Mode:** When disabled, uses manual distance for orbit calculations

### 4.3 Quality Panel Controls
Added advanced quality panel options:

- **Distance Probe:** Mode selector (GPU Probe / CPU Calc / Manual)
- **Manual Distance:** Manual distance value when mode is set to Manual

### 4.3 Performance Impact
Disabling the physics probe can provide significant performance improvements on low-end GPUs or when rendering complex fractals, but may affect orbit control accuracy.

## 5. Bucket Renderer
For resolutions higher than the GPU limit (e.g., 8K), or to prevent TDR (Timeout Detection Recovery) crashes:
1.  **Tiling:** The screen is divided into small buckets (e.g., 128x128).
2.  **Scissor:** The projection matrix is skewed to render *only* that tiny window.
3.  **Accumulation:** The engine renders that bucket until it converges (noise-free).
4.  **Composite:** The result is copied to a final canvas. (may need more work to ensure it can handle large files)
5.  **Repeat:** Move to next bucket.

### 5.1 Bucket Renderer Architecture (Updated 2026-02)

The bucket renderer has been refactored to properly handle high-resolution output (4K-10K+):

#### Key Components:
- **Composite Buffer**: A separate Float32 render target stores the final accumulated image
- **Bucket Compositing**: Each completed bucket is copied to the composite buffer
- **Adaptive Convergence**: Each tile renders until converged (noise-free) or max samples reached

#### Adaptive Convergence Sampling:
The bucket renderer uses **adaptive convergence-based sampling**:
1. Each tile renders a minimum number of samples (16 or 1/4 of max)
2. After minimum samples, measures max pixel difference between frames
3. When delta < threshold, tile is considered converged and moves to next
4. Max samples acts as a safety limit for difficult tiles

**Convergence Threshold**:
- `0.1%` = Production quality (more samples, cleaner)
- `0.5%` = Balanced quality
- `1.0%` = Fast preview (fewer samples, some noise)

**Max Samples Per Bucket**:
- Safety limit for tiles that don't converge quickly
- Tiles that converge early use fewer samples
- Typical values: 64-1024

#### Memory Management:
- Bucket size controls memory usage (smaller = less VRAM)
- Composite buffer uses Float32 for HDR quality
- Supports up to 10K+ resolution with appropriate bucket sizes

#### Export Scale:
- `1x` = Viewport resolution
- `2x` = 4K from 1080p viewport
- `4x` = 8K from 1080p viewport
- `8x` = 10K+ from 1080p viewport
