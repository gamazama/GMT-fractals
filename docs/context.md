
# GMT Project Context & Architecture

## 1. Project Identity
**Name:** GMT (GPU Mandelbulb Tracer)
**Goal:** Real-time, 60FPS, GPU-accelerated 3D Fractal Explorer in the browser.
**Stack:** React 18, TypeScript, Three.js (R3F), Zustand, Raw WebGL (GLSL), Vite.

## 2. Core Architecture: "The Hybrid Engine"
The app runs two distinct loops to handle the performance gap between React and WebGL.

### A. The React Layer (UI & State)
- **Store:** `store/fractalStore.ts` (Zustand). Holds the Source of Truth.
- **Slices:** State is split into `cameraSlice`, `uiSlice`, and **dynamic feature slices**.
-- **Legacy Slices:** `visualSlice` has been removed; lighting is now managed by the `lighting` feature (`features/lighting`).
- **Updates:** React only re-renders when UI needs to change. It does **not** drive the render loop.

### B. The Engine Layer (WebGL)
- **Singleton:** `engine/FractalEngine.ts`.
- **Loop:** Runs continuously via `useFrame`.
- **Independence:** Does NOT import the Store directly (avoids circular dependencies).
- **Runtime State:** Maintains a local cache (`runtimeState`) of critical data pushed from the store via the Bridge.

### C. The Bridge
- **Sync:** `bindStoreToEngine` (in `fractalStore.ts`) subscribes to store changes and pushes them to the Engine.
- **Events:** `FractalEvents.ts` is an event bus for ephemeral actions (e.g., `uniform` updates, `reset_accum`, `compiler_status`).

## 3. The Data-Driven Feature System (DDFS)
The DDFS is the backbone of the application's extensibility. It allows features to be defined once in a registry and automatically generate UI, State, and Shaders.

### 3.1 Two-Path Architecture
1.  **Simple Parameters (Float, Color, Bool, Vec3):**
    *   **Flow:** UI -> Slice -> EventBus -> `FractalEngine` -> `setUniform`.
    *   **Automation:** Fully automatic. `createFeatureSlice` emits `uniform` events based on the registry definition.
2.  **Complex Assets (Images, Gradients):**
    *   **Flow:** UI -> Slice -> **Generic Asset Handler** (in `createFeatureSlice`) -> Async Loader -> EventBus -> `setUniform`.
    *   **Mechanism:** `createFeatureSlice` detects `type: 'image'` or `'gradient'`. It automatically invokes `THREE.TextureLoader` or generates Data Textures, applies `textureSettings` (Wrap, Filter), and emits the result.

### 3.2 Feature Components
1.  **Registry (`engine/FeatureSystem.ts`):** Defines the shape, shader code, and UI config of a feature.
2.  **State Generation (`store/createFeatureSlice.ts`):** Dynamically creates Zustand slices and handles asset loading.
3.  **UI Generation (`components/AutoFeaturePanel.tsx`):** Renders UI based on `ParamConfig`.
4.  **Component Registry (`components/registry/ComponentRegistry.tsx`):** Allows features to inject complex custom React components (like Histograms) into the auto-generated panels.
5.  **Shader Injection:** `ShaderFactory` injects feature code and uniform definitions into the master shader.

### 3.3 Migrated Features (Complete)
*   **Core Math:** Parameters A-F, Iterations, Formula Selection.
*   **Geometry:** Julia Mode, Hybrid (Box) Mode, Domain warping.
*   **Atmosphere:** Fog, Glow, Volumetrics.
*   **Materials:** PBR, Emission, Environment Maps.
*   **Droste:** Post-process spiral distortion.
*   **Color Grading:** Levels, Saturation, Gamma.
*   **Coloring:** Gradients, Blending, Histogram Integration.
*   **Texturing:** Image mapping, UV logic.
*   **Quality:** Raymarching precision and thresholds.

## 4. Key Technical Implementations

### "Infinite" (extra) Zoom (Double-Double Precision)
Standard Float32 precision breaks at zoom levels > $10^6$. We use a "Split Float" technique.
- **Logic:** `engine/PrecisionMath.ts` (`VirtualSpace` class).
- **Implementation:** Coordinates are split into `High` (Integer) and `Low` (Fractional) parts.
- **Shader:** `shaders/chunks/de.ts`. The camera stays at $(0,0,0)$, and the Universe moves around it ("Treadmill" effect).

### Modular Graph Compiler (JIT)
Users can build custom formulas via a Node Graph.
- **Logic:** `utils/GraphCompiler.ts`.
- **Process:** Topological Sort -> Code Gen -> Uniform Flattening.
- **Optimization:** All node parameters map to a single `uniform float uModularParams[64]` array to allow instant slider updates without shader recompilation.

### Animation Engine
- **Logic:** `engine/AnimationEngine.ts`.
- **Interpolation:** Solves Cubic Bezier curves for keyframes.
- **Dynamic Binders:** The engine dynamically looks up setters for DDFS features (e.g., `coreMath.paramA` maps to `setCoreMath({ paramA: v })`).

## 5. UI Standards

1.  **UI Layout:**
    *   **AutoPanel:** Use `AutoFeaturePanel` for all standard feature UI.
    *   **Custom Panels:** Only use custom panels (like `Timeline` or `LightPanel`) for systems that require specialized interaction logic (Gizmos, Graphs).
    *   **Spacing:** Sub-settings inside panels sit tight (1px gap). Boolean toggles fill available width.

2.  **Shader Stability:**
    *   **Texture Bias:** Use `textureLod0` helper for all texture lookups inside raymarching loops.

3.  **Tone Mapping:**
    *   **Viewport:** Linear output (R3F handles sRGB).
    *   **Export:** We must manually bake sRGB gamma (`uEncodeOutput = 1.0`) in the Post-Process shader during video export.
