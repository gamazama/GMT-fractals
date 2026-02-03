
# Project File Map

## 1. Root Configuration
*   `index.html`: Application entry point. Sets up DOM and Tailwind.
*   `index.tsx`: React root. Mounts `App` and initializes registries.
*   `App.tsx`: Main Layout (Loading, TopBar, Viewport, Controls, Timeline).
*   `metadata.json`: PWA manifest and permissions.
*   `types.ts`: Aggregates all type definitions.
*   `vite.config.ts`: Build configuration.
*   `server/server.js`: Custom Express server for dev/prod serving.

## 2. Engine Core (`engine/`)
The imperative WebGL system.
*   `FractalEngine.ts`: **Singleton**. Orchestrates the render loop and compilation.
*   `RenderPipeline.ts`: Manages resolution, ping-pong buffers, and TSS accumulation.
*   `ShaderFactory.ts`: Generates GLSL strings from Config + DDFS Features.
*   `FeatureSystem.ts`: **Core DDFS Architecture**. Defines interfaces for features.
*   `FractalRegistry.ts`: Database of available Fractal Formulas.
*   `FractalEvents.ts`: Event bus for UI-to-Engine communication.
*   `UniformSchema.ts`: Definitions for all base GLSL uniforms.
*   `UniformNames.ts`: String constants for uniform keys.
*   `PrecisionMath.ts`: Handles "Double-Double" precision (`VirtualSpace`).
*   `MaterialController.ts`: Manages Three.js materials (Direct, PT, Physics).
*   `SceneController.ts`: Manages Three.js scenes/cameras.
*   `AnimationEngine.ts`: Handles timeline playback and value interpolation.
*   `VideoExporter.ts`: Offline rendering pipeline (Seek -> Accumulate -> Encode).
*   `BucketRenderer.ts`: Tiled high-res rendering logic.
*   `LoadingRenderer.ts`: Standalone raw WebGL renderer for the splash screen.
*   `NodeRegistry.ts`: Database of Modular Graph nodes.
*   **`controllers/`**:
    *   `CameraController.ts`: Physics for Fly/Orbit movement.
    *   `PickingController.ts`: Handles depth-buffer reading for focus/interaction.
*   **`managers/`**:
    *   `UniformManager.ts`: Syncs CPU state to GPU uniforms per frame.
    *   `ConfigManager.ts`: Diffing logic for shader recompilation.
*   **`math/`**:
    *   `AnimationMath.ts`: Stateless Bezier/Tangent math.
*   **`export/`**:
    *   `RecorderStrategy.ts`: Strategies for saving video (RAM vs Disk).
*   **`algorithms/`**:
    *   `TrackUtils.ts`: Logic for keyframe insertion/updates.

## 3. Features (DDFS Modules)
Self-contained modules defining State, UI, and Shaders.
*   `features/index.ts`: Registration entry point.
*   `features/types.ts`: Aggregate state types.
*   **`core_math`**: Iterations, Params A-F.
*   **`geometry`**: Julia, Hybrid (Box), Pre-Rotation.
*   **`lighting`**: Light studio, Shadows, Falloff.
*   **`materials`**: PBR Surface, Emission, Environment.
*   **`atmosphere`**: Fog, Volumetric Glow.
*   **`coloring`**: Gradients, Mapping modes, Texturing.
*   **`quality`**: Precision, Steps, Thresholds.
*   **`optics`**: FOV, Depth of Field, Projection type.
*   **`navigation`**: Fly speed settings.
*   **`audioMod`**: WebAudio analysis and linking.
*   **`modulation`**: LFOs and signal routing.
*   **`drawing`**: On-screen measurement tools.
*   **`droste`**: Post-process spiral effects.
*   **`color_grading`**: Tone mapping levels.
*   **`webcam`**: Overlay logic.
*   **`debug_tools`**: Shader/State debuggers.
*   **`ao`**: Ambient Occlusion logic.
*   **`reflections`**: Raymarched reflections logic.
*   **`water_plane`**: Infinite ocean plane logic.
*   **`stress_test`**: Holographic scanlines effect.
*   **`engine`**: Master configuration profiles (Lite/Balanced/Ultra).

## 4. State Management (`store/`)
*   `fractalStore.ts`: Main Zustand store.
*   `animationStore.ts`: Dedicated timeline store.
*   `createFeatureSlice.ts`: Generates state/actions from Feature definitions.
*   **`slices/`**:
    *   `rendererSlice.ts`: Resolution, Export flags.
    *   `cameraSlice.ts`: Position, Rotation, History.
    *   `uiSlice.ts`: Panel visibility, Layout.
    *   `historySlice.ts`: Parameter Undo/Redo stack.
*   **`animation/`**:
    *   `playbackSlice.ts`: Play/Pause/Seek.
    *   `sequenceSlice.ts`: Track/Keyframe CRUD.
    *   `selectionSlice.ts`: Keyframe selection/manipulation.

## 5. Components (`components/`)
*   **Core**: `ViewportArea`, `Controls`, `Timeline`, `TopBar`, `MobileControls`.
*   **Primitives**: `Slider`, `Knob`, `Vector3Input`, `ToggleSwitch`, `Button`, `Dropdown`.
*   **Pickers**: `SmallColorPicker`, `EmbeddedColorPicker`, `AdvancedGradientEditor`.
*   **Panels**: `FormulaPanel`, `ScenePanel`, `LightPanel`, `RenderPanel`, `QualityPanel`, `EnginePanel`.
*   **Visuals**: `MandelbulbScene`, `HudOverlay`, `CompilingIndicator`, `PerformanceMonitor`.
*   **Timeline**: `DopeSheet`, `GraphEditor`, `TimeNavigator`, `TimelineRuler`, `KeyframeInspector`.
*   **Flow**: `FlowEditor`, `ShaderNode` (Modular Graph).
*   **Registry**: `ComponentRegistry` (Maps strings to React components for DDFS).

## 6. Shaders (`shaders/`)
*   `chunks/`: Reusable GLSL snippets (Math, SDFs, Lighting, Raymarching).
    *   `main.ts`: Entry point.
    *   `de.ts`: Distance Estimator master loop.
    *   `trace.ts`: Raymarching loop.
    *   `pathtracer.ts`: Monte Carlo integrator.

## 7. Utils (`utils/`)
*   `CameraUtils.ts`: Unified coordinate math.
*   `CurveFitting.ts`: Animation curve simplification.
*   `GraphCompiler.ts`: Modular graph to GLSL transpiler.
*   `PresetLogic.ts`: State hydration/sanitization.
*   `Sharing.ts` / `UrlStateEncoder.ts`: URL compression.
*   `fileUtils.ts`: Filename generation.
*   `pngMetadata.ts`: Steganography (Data in PNG).
*   `histogramUtils.ts`: Auto-levels analysis.
*   `timelineUtils.ts`: Keyframe helpers.
