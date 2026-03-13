
# System Architecture

## 1. The "Engine-Bridge" Pattern

GMT is a hybrid application. It bridges two distinct execution contexts:
1.  **The Reactive UI (React/Zustand):** Event-driven, updates on user interaction.
2.  **The Render Loop (WebGL/Three.js):** Continuous, runs at 60Hz via `requestAnimationFrame`.

### The Problem
Directly binding React state to a Shader Uniform inside `useFrame` causes massive Garbage Collection (GC) pressure and React overhead, killing performance.

### The Solution
We use a **Unidirectional Push Architecture**.

1.  **State Change:** User moves a slider. Zustand updates the store.
2.  **Subscription:** The `EngineBridge` (or `createFeatureSlice` logic) subscribes to specific slice changes.
3.  **Event Bus:** Updates are emitted via `FractalEvents` (e.g., `uniform`, `config`).
4.  **Engine Update:** The Singleton `FractalEngine` receives the event and updates the `Three.js` Uniform or Internal State directly (bypassing React entirely for the frame loop).

## 2. Data-Driven Feature System (DDFS)

The application is built on a modular architecture called **DDFS**. Instead of hardcoding UI panels and state slices for every new feature, we define features in a Registry.

### 2.1 Feature Definition (`engine/FeatureSystem.ts`)
A feature (e.g., `Fog`, `Quality`) is defined as a static object containing:
*   **ID/Name:** Unique identifiers.
*   **Params:** A schema defining parameters (float, color, boolean), their defaults, and UI constraints (min/max).
*   **Shader Chunks:** GLSL code fragments to be injected into the main shader.
*   **UI Config:** Where to render the controls (which tab, order).

### 2.2 Dynamic Generation
At runtime:
1.  **State:** `createFeatureSlice.ts` iterates the registry and generates the Zustand state slice automatically.
2.  **UI:** `AutoFeaturePanel.tsx` iterates the params and renders the appropriate inputs (Sliders, Color Pickers) automatically.
3.  **Shader:** `ShaderFactory.ts` injects the uniforms and code chunks defined in the feature.

**Benefit:** Adding a new feature usually requires editing **only one file** (the feature definition file), and the rest of the engine adapts automatically.

### 2.3 Meta-Features (Orchestration)
Some features, like **Engine Settings**, do not own shader code directly but orchestrate other features.
*   **Example:** `EngineSettingsFeature` defines the "Lite Mode" vs "Ultra Mode" presets.
*   **Action:** Its `applyPreset` action batch-updates `lighting`, `quality`, `reflections`, and `atmosphere` slices simultaneously.
*   **Hardware Detection:** On boot, the `FractalEngine` constructor detects device capabilities (mobile/desktop) and initializes `quality` defaults (`precisionMode`, `bufferPrecision`). The engine also sets a runtime `isMobile` hint that flows into `ShaderConfig`/`ConfigManager` and is used by some shader chunks; prefer using the `quality` feature for precision decisions while treating `isMobile` as a runtime capability hint.

## 3. The Render Loop (`FractalEngine.ts`)

The `FractalEngine` class acts as the conductor.

1.  **Input Handling:** `components/Navigation.tsx` drives the camera math.
2.  **Update (`update()`):**
    *   Calculates "Virtual Space" coordinates (Double Precision emulation).
    *   Updates smoothers and interpolators.
3.  **Render (`render()`):**
    *   Checks the `RenderPipeline` state.
    *   If **Accumulating** (TSS): Blends the new frame with the previous frame buffer to remove noise/grain.
    *   If **Moving**: Renders a single fast frame.
4.  **Post-Process:** Passes the result through Tone Mapping (ACES) and Gamma Correction.

## 4. Web Worker Render Architecture

GMT renders entirely on a Web Worker using OffscreenCanvas. The main thread handles React UI and R3F overlay (light gizmos); the worker owns the GPU.

### 4.1 Architecture Overview

```
Main Thread                          Worker Thread
┌──────────────────┐                ┌──────────────────────┐
│ React UI (Zustand)│                │ FractalEngine         │
│ EngineBridge      │──RENDER_TICK──▶│ MaterialController    │
│ WorkerTickScene   │                │ RenderPipeline        │
│ Navigation (cam)  │                │ OffscreenCanvas (GPU) │
│ R3F (gizmos)      │◀──BOOTED,etc──│ BucketRenderer        │
│ WorkerProxy       │                │ WorkerExporter        │
└──────────────────┘                └──────────────────────┘
```

- **WorkerProxy** (`engine/worker/WorkerProxy.ts`): Worker-only proxy. Main thread calls `proxy.post(msg)` to send messages. No direct engine access from main thread.
- **State flow**: Zustand → EngineBridge → RENDER_TICK message → worker's `FractalEngine`. No `setRenderState` calls; all state goes via messages.
- **OffscreenCanvas**: Auto-presenting — the browser composites directly from the worker's canvas. No `transferToImageBitmap()` (which caused 26ms GPU stalls).
- **Depth readback**: PBO async readback avoids `glFinish()`. Frame order: compute → blit+flush → PBO work.

### 4.2 Worker Protocols

| Protocol | Messages | Purpose |
|----------|----------|---------|
| Boot | `BOOTED` | Worker reports GPU info, ready state |
| Render | `RENDER_TICK` | Per-frame state snapshot (camera, params) |
| Bucket | `BUCKET_START/STOP/STATUS/IMAGE` | Tiled high-res rendering |
| Video | `VIDEO_START/STOP/FRAME` | Offline video export |
| Focus Pick | `FOCUS_PICK_START/SAMPLE/END` | DoF focus distance from depth buffer |
| Histogram | `HISTOGRAM_REQUEST/RESULT` | Probe RPC for histogram data |
| Snapshot | `SNAPSHOT_REQUEST/RESULT` | Screenshot capture |

### 4.3 Worker-Mode Gotchas

- `engine.renderer` is always `null` on main thread — use `engine.isBooted` for guards
- `engine.pipeline` is not accessible — use `engine.accumulationCount` (shadow state)
- Store offset is stale during fly mode (offset shifts go directly to worker) — prefer worker shadow state for gizmos
- Vite config requires `worker: { format: 'es' }` for prod builds with code-splitting
- `FileSystemWritableFileStream` is not transferable via `postMessage` — wrap in plain `WritableStream` proxy for disk-mode video export
- `Matrix3`/`Matrix4` from worker arrive as plain `{elements: [...]}` objects (structured clone) — `MaterialController.setUniform` handles this

## 5. TickRegistry (`engine/TickRegistry.ts`)

The **TickRegistry** is a phase-based tick orchestrator that runs on the main thread (inside `WorkerTickScene`). It replaces ad-hoc `useFrame` hooks with a structured, deterministic update order.

### Phases (executed in order each frame)
1. **SNAPSHOT** — Capture current Zustand state for the worker's `RENDER_TICK` message
2. **ANIMATE** — Run animation engine interpolation
3. **OVERLAY** — Update R3F overlay elements (light gizmos, drawing tools)
4. **UI** — Update UI-only concerns (FPS counter, histogram refresh)

Systems register callbacks at a specific phase and priority. This ensures deterministic ordering — e.g., state snapshot always happens before animation updates are applied.

## 6. State Management

*   **Zustand:** Used for global state.
*   **Slices:** State is divided into:
    *   `rendererSlice` (Resolution, Export logic)
    *   `cameraSlice` (Position, Rotation)
    *   `uiSlice` (Panel visibility)
    *   `historySlice` (Undo/Redo)
    *   *Dynamic Slices* (Generated by DDFS for all shader parameters)
*   **Persistence:** The `getPreset()` and `loadPreset()` functions serialize this entire state tree into JSON.
