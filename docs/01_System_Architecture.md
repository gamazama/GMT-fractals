
# System Architecture
> Last updated: 2026-03-27 | GMT v0.9.1

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

### 2.2b ShaderBuilder Injection Hooks

Features inject GLSL into the shader pipeline via `ShaderBuilder` hooks. Each hook targets a specific stage in the shader assembly order:

| Hook | Assembly Position | Scope / Available Variables | Example Usage |
|------|-------------------|---------------------------|---------------|
| `addDefine(name, val)` | 1. Top of shader | Preprocessor | `LIGHT_SPHERES`, `PT_ENABLED` |
| `addUniform(name, type)` | 2. After defines | Global | Feature-specific uniforms |
| `addHeader(code)` | 3. After uniforms | Global | Precision qualifiers, extensions |
| `addPreamble(code)` | 7. Before functions | Global scope | Pre-calculated constants |
| `addFunction(code)` | 8. Pre-DE | Global | Formula functions, utilities |
| `setDistOverride(opts)` | 9. DE loop | `init`, `inLoopFull/Geom`, `postFull/Geom` | Modular formula custom DE |
| `addHybridFold(init, preLoop, inLoop)` | 9. DE loop | Hybrid fractal injection | Multi-formula hybrid fractals |
| `addPostMapCode(code)` | 9. Inside `map()` | `p_fractal`, `finalD`, `outTrap` | Water plane, ground plane |
| `addPostDistCode(code)` | 9. Inside `mapDist()` | `p_fractal`, `finalD` | Shadow/AO distance override |
| `addPostDEFunction(code)` | 10. Post-DE | Can call `map()` | Shadows, AO, reflection trace |
| `addMaterialLogic(code)` | 11. Inside `getSurfaceMaterial()` | `albedo`, `n`, `emission`, `roughness`, `result` | Water material, emission modes |
| `addMissLogic(code)` | 12. Inside `sampleMiss()` | `ro`, `rd`, `roughness`, `env` (modifiable) | Light spheres, portals, custom sky |
| `addVolumeTracing(march, finalize)` | 14. Inside trace loop | Per-step + post-loop | Volumetric scatter, god rays |
| `addIntegrator(code)` | 15. After trace | Can call all above | Lighting PBR, path tracer |
| `requestShading()` | 15. Deferred | Generates `calculateShading()` at build time | Lighting feature (direct mode) |
| `addShadingLogic(code)` | 15. Inside `calculateShading()` | `p_ray`, `n`, `v`, `albedo`, `roughness`, `F`, `reflDir`, `reflectionLighting` | Reflection evaluation modes |
| `addPostProcessLogic(code)` | 16. Inside `applyPostProcessing()` | `col`, `d`, `glow`, `volumetric`, `fogScatter` | Fog, glow, volumetric scatter (fully feature-injected) |
| `addCompositeLogic(code)` | 17. Inside `renderPixel()` | `ro`, `rd`, `col`, `d`, `hit`, `stochasticSeed` | Light sphere compositing |

**Assembly order:** Defines → Uniforms → Headers → Math → BlueNoise → Coloring → Preambles → Functions → DE → PostDE → MaterialEval → MissHandler → Ray → Trace → Integrators(+Shading) → Post → Main

**Key patterns:**
- Features define GLSL functions via `addPostDEFunction`/`addIntegrator`, then inject call sites via logic hooks (`addMaterialLogic`, `addMissLogic`, `addCompositeLogic`). This keeps core shader files feature-agnostic.
- `requestShading()` + `addShadingLogic()` enable deferred generation: Lighting calls `requestShading()`, then Reflections (registered later) injects its evaluation code via `addShadingLogic()`. The shading GLSL is generated in `buildFragment()` after all features have injected.
- `addPostMapCode()` / `addPostDistCode()` are accumulative hooks that inject inside the DE functions, enabling features like water plane to modify the distance field without touching core `de.ts`.

### 2.2c Feature Dependencies

Features can declare `dependsOn: string[]` to specify other features that must be registered and injected before them. The `FeatureRegistry` enforces this via topological sort (Kahn's algorithm with stable ordering — features without dependencies preserve their registration order).

**Satellite feature pattern:** A feature that owns its own GLSL injection but depends on another feature's uniforms/UI. Example: `LightSpheresFeature` (`dependsOn: ['lighting']`) owns all sphere rendering GLSL but relies on Lighting's uniform arrays (`uLightPos`, `uLightColor`, etc.) and per-light UI controls.

### 2.2d Compilable Feature Sections

Features that require shader compilation can declare a `panelConfig` in their DDFS definition to get a standardized UI with compile/runtime split:

```typescript
panelConfig: {
    compileParam: 'ptVolumetric',        // compile gate (onUpdate: 'compile')
    runtimeToggleParam: 'volEnabled',    // runtime on/off (uniform, instant)
    compileSettingsParams?: ['foldType'], // compile-time params shown in settings sub-section
    label: 'Volumetric Scatter',
    compileMessage: 'Compiling Volumetric Shader...',
}
```

The `CompilableFeatureSection` component (`components/CompilableFeatureSection.tsx`) reads this config and renders:
- **Runtime toggle** — instant on/off via uniform (or falls back to compile toggle if no `runtimeToggleParam`)
- **Status dots** — active (green) when compiled and on, pending (amber) when needs compile
- **Compile settings sub-section** — only if `compileSettingsParams` is specified; shows compile-time params with local pending state until user clicks Compile
- **Compile bar** — amber bar with Compile button + engine icon button (opens Engine panel and queues compile flag + any pending settings via `engine_queue` event)
- **Runtime params** — shown only when compiled, excludes compile params

**Two-level control pattern:** Compile-time param gates shader code generation (`onUpdate: 'compile'`), runtime param controls a uniform for instant on/off. Examples:
- **Volumetric**: `ptVolumetric` (compile) + `volEnabled` (runtime `uVolEnabled`)
- **Area Lights**: `ptStochasticShadows` (compile) + `areaLights` (runtime `uAreaLights`)
- **Hybrid Box**: `hybridCompiled` (compile) + `hybridMode` (runtime)

The component can be used purely via `panelConfig` or with explicit props for sub-section cases (e.g., hybrid box is a sub-section of geometry, so it passes explicit props rather than using panelConfig).

### 2.2e Reference Features

These features demonstrate the full DDFS pattern and serve as templates for new development:

| Feature | Demonstrates |
|---------|-------------|
| **Water Plane** (`features/water_plane.ts`) | `addPostMapCode`/`addPostDistCode` (DE override), `addMaterialLogic` (sentinel-based material), `addDefine`, compile-time toggle |
| **Light Spheres** (`features/lighting/light_spheres.ts`) | Satellite feature (`dependsOn`), `addPostDEFunction`, `addMissLogic`, `addCompositeLogic`, stochastic AA |
| **Reflections** (`features/reflections/index.ts`) | `addShadingLogic` (deferred injection), `addPostDEFunction` (trace function), compile-time mode switching |
| **Volumetric** (`features/volumetric/index.ts`) | `panelConfig` (compilable section UI), two-level control, `addVolumeTracing`, `addPostProcessLogic` |

### 2.3 Viewport Quality System (Scalability)

The **Viewport Quality System** controls rendering quality via a per-subsystem tier model. It replaces the old flat ENGINE_PROFILES approach.

**Three-layer config pipeline:**
1. **Authored State** (Zustand store) — what the artist intended. Always preserved for saves/exports.
2. **Subsystem Tier Overrides** — written directly to the store via DDFS feature setters when a preset or tier is applied. The existing CONFIG pipeline handles recompilation automatically.
3. **Hardware Caps** — device physical limits applied as a ceiling in `getShaderConfigFromState()`.

**Key files:**
- `types/viewport.ts` — Subsystem definitions, preset data, helper functions
- `store/slices/scalabilitySlice.ts` — Zustand slice with `applyScalabilityPreset()`, `setSubsystemTier()`, `setHardwareProfile()`
- `engine/HardwareDetection.ts` — GPU capability probing (Float32, mobile detection)
- `components/topbar/ViewportQuality.tsx` — Top-bar dropdown UI
- `components/panels/HardwarePreferences.tsx` — Hardware settings modal

**Subsystems:** Shadows, Reflections (direct-render only), Lighting (advanced-mode only), Atmosphere. Each has ordered tiers with sparse override maps (`Record<featureId, Record<param, value>>`).

**Master Presets:** Preview, Fastest, Lite, Balanced (default), Full, Ultra. Presets set all subsystem tiers atomically. Users can override individual subsystems; the label reflects deviations (e.g., "Balanced (Shadows=Hard)").

**Design decision — direct store writes vs overlay:** The system writes tier overrides directly to the store via feature setters (not via an overlay in `getShaderConfigFromState()`). This is because DDFS UI components read the store to determine compiled state — an overlay would cause the store and the compiled shader to diverge, breaking compile-time toggle UI (e.g., volumetric controls wouldn't appear even though the shader was compiled with volumetric enabled).

**Hardware Detection:** On boot, `detectHardwareProfileMainThread()` probes device capabilities and calls `setHardwareProfile()`. Hardware caps (`precisionMode`, `bufferPrecision`, `compilerHardCap`) are applied as a ceiling in `getShaderConfigFromState()` Stage 3. These params are hidden from the Engine Panel and managed via the Hardware Preferences modal.

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
| Config | `CONFIG`, `CONFIG_DONE` | Shader config updates; `CONFIG_DONE` signals all CONFIGs sent (deterministic compile trigger) |
| Bucket | `BUCKET_START/STOP/STATUS/IMAGE` | Tiled high-res rendering |
| Video | `VIDEO_START/STOP/FRAME` | Offline video export |
| Focus Pick | `FOCUS_PICK_START/SAMPLE/END` | DoF focus distance from depth buffer |
| Histogram | `HISTOGRAM_REQUEST/RESULT` | Probe RPC for histogram data |
| Snapshot | `SNAPSHOT_REQUEST/RESULT` | Screenshot capture |

### 4.3 Boot Hydration Gate

Formulas are loaded via dynamic `import('../formulas')` (separate chunk). URL-shared scenes are parsed in the `.then()` callback. `useAppStartup` exposes an `isHydrated` flag that is set after formula import + URL parsing + `loadScene()` completes. `LoadingScreen` gates `bootEngine()` on this flag — without it, `bootEngine`'s 50ms `setTimeout` could read the store while it still has default Mandelbulb state, causing the wrong formula to compile on boot.

### 4.4 Worker-Mode Gotchas

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

## 6. Unified Camera Coordinate System

GMT uses a **split-float treadmill** for camera positioning: the fractal is moved (via `sceneOffset`) rather than the camera, avoiding floating-point precision loss at deep zooms.

### 6.1 Canonical State

Camera state is always stored in **canonical form**:

| Field | Value | Meaning |
|-------|-------|---------|
| `cameraPos` | `{0, 0, 0}` | Always zero — local displacement lives in offset |
| `cameraRot` | Quaternion | Camera orientation |
| `sceneOffset` | `PreciseVector3` | High-precision world position (split into `x/xL, y/yL, z/zL`) |
| `targetDistance` | `number` | Surface distance from physics probe — **never** orbit radius |

The world position the shader sees is: `sceneOffset + camera.position`. In canonical state this equals `sceneOffset` since `camera.position = (0,0,0)`.

### 6.2 Orbit Mode Internals

OrbitControls (drei/three-stdlib) requires a non-zero `camera.position` to define the orbit radius. During orbit interactions, `camera.position` is temporarily non-zero. This is handled transparently:

- **Invariant:** `camera.position = (0,0,0)` except during an active orbit drag (between `onStart` and `onEnd`). On `onEnd`, `absorbOrbitPosition(true)` absorbs camera.position into sceneOffset and zeroes it.
- **Atomic absorb:** The absorbed offset is sent to the worker atomically via `WorkerProxy.queueOffsetSync()`, which embeds it in the next `RENDER_TICK` with `syncOffset: true`. This avoids a 1-frame mismatch where camera=0 reaches the worker before the new offset.
- **OrbitControls target reset:** After absorb, the OrbitControls target is reset to a tiny offset along the current forward direction. This is critical because drei's OrbitControls runs `update()` at `useFrame` priority -1 (before all user code), which calls `lookAt(target)`. Without the target reset, `lookAt(target)` from `(0,0,0)` would produce a wrong quaternion.
- **Shadow unified offset:** Computed every frame as `sceneOffset + camera.position` regardless of mode, so canonical world position is always available for reads.
- **Orbit target (onStart):** Placed at `camera.position + forward * surfaceDistance`. Reconstructed fresh on each `onStart` callback — no persistent target state needed.
- **No OFFSET_SET during orbit:** `setSceneOffset()` is never called during orbit interactions (it would reset worker accumulation). Offset manipulation only happens on mode switch or teleport.

### 6.3 Mode Agnosticism

The engine, animation system, camera manager, and preset system are **completely mode-agnostic**:
- `VirtualSpace.updateSmoothing()` has no `isOrbit` parameter — unified lerp path for both modes
- `VirtualSpace.getUnifiedCameraState()` combines offset + position regardless of mode
- `cameraMode` is passed in `renderState` for HUD display only — zero engine-level branching
- `targetDistance` is always physics-based surface distance in both modes

Mode awareness only exists in:
- `Navigation.tsx` — renders OrbitControls vs fly controller
- UI/HUD components — display mode-specific controls and labels

### 6.4 Key Helpers (Navigation.tsx)

| Helper | Purpose |
|--------|---------|
| `initOrbitPivot()` | Sets orbit target, radius ref, and camera.up from current state. Used on init, mode switch, camera unlock, and teleport. |
| `absorbOrbitPosition()` | Folds non-zero `camera.position` into `sceneOffset` and zeros camera. Used on mode switch to Fly. |

## 7. State Management

*   **Zustand:** Used for global state.
*   **Slices:** State is divided into:
    *   `rendererSlice` (Resolution, Export logic)
    *   `cameraSlice` (Position, Rotation, Saved Cameras, Undo/Redo)
    *   `uiSlice` (Panel visibility)
    *   `historySlice` (Undo/Redo)
    *   `scalabilitySlice` (Viewport quality tiers, hardware profile — see §2.3)
    *   *Dynamic Slices* (Generated by DDFS for all shader parameters)
*   **Persistence:** `getPreset()` serializes the state tree into a Preset object. `saveGMFScene()` wraps it in GMF format (the primary save format — see `docs/05_Data_and_Export.md`). `loadPreset()` hydrates the store from a Preset object. GMF and legacy JSON are both supported on load via `loadGMFScene()`.
