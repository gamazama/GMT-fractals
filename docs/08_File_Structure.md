
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
*   `ShaderBuilder.ts`: Builder pattern for composing shaders from feature injections.
*   `ShaderConfig.ts`: Extracted `ShaderConfig` type — shared between `ShaderFactory`, `ShaderBuilder`, and feature `inject()` contracts.
*   `FeatureSystem.ts`: **Core DDFS Architecture**. Defines interfaces for features.
*   `FractalRegistry.ts`: Database of available Fractal Formulas.
*   `FractalEvents.ts`: Event bus for UI-to-Engine communication.
*   `UniformSchema.ts`: Definitions for all base GLSL uniforms.
*   `UniformNames.ts`: String constants for uniform keys.
*   `PrecisionMath.ts`: Handles "Double-Double" precision (`VirtualSpace`).
*   `MaterialController.ts`: Manages Three.js materials (Direct, PT, Physics).
*   `SceneController.ts`: Manages Three.js scenes/cameras.
*   `AnimationEngine.ts`: Handles timeline playback and value interpolation.
*   `VideoExporter.ts`: Offline rendering pipeline (Seek -> Accumulate -> Encode). Uses `mediabunny` library.
*   `BucketRenderer.ts`: Tiled high-res rendering logic.
*   `LoadingRenderer.ts`: Standalone raw WebGL renderer for the splash screen.
*   `NodeRegistry.ts`: Database of Modular Graph nodes.
*   `BezierMath.ts`: Cubic Bezier curve solving for animation.
*   **`controllers/`**:
    *   `CameraController.ts`: Physics for Fly/Orbit movement.
    *   `PickingController.ts`: Handles depth-buffer reading for focus/interaction.
*   **`managers/`**:
    *   `UniformManager.ts`: Syncs CPU state to GPU uniforms per frame.
    *   `ConfigManager.ts`: Diffing logic for shader recompilation.
*   **`math/`**:
    *   `AnimationMath.ts`: Stateless Bezier/Tangent math.
*   **`algorithms/`**:
    *   `TrackUtils.ts`: Logic for keyframe insertion/updates.

## 3. Features (DDFS Modules)
Self-contained modules defining State, UI, and Shaders.
*   `features/index.ts`: Registration entry point.
*   `features/types.ts`: Aggregate state types.
*   **`fragmentarium_import/`**: Fragmentarium .frag file importer (AST-based V2)
    *   `FragmentariumParser.ts`: Original V1 parser — single-file regex-based; kept for reference.
    *   `GenericFragmentariumParser.ts`: V1 generic parser — regex extraction, auto-param mapping.
    *   `GenericFragmentariumParserV2.ts`: **Active parser** — AST-based via `@shaderfrog/glsl-parser`. Fixes `z.z→z_local.z_local` variable renaming bug. Precise loop/helper extraction. `FormulaImporter.tsx` uses V2 as primary, V1 as fallback for pre-parsing context.
    *   `FormulaImporter.tsx`: UI dialog for importing formulas; drives the full parse → map → transform pipeline.
    *   `index.ts`: Barrel export (V1 and V2).
    *   `reference/`: Sample .frag files and expected GMF outputs for regression testing.
    *   `test-v2-parser.ts`: V2 test suite (Menger, Mandelbox, pattern detection, auto-mapping).
    *   `test-glsl-parser.ts`: Proof-of-concept for `@shaderfrog/glsl-parser` integration.
*   **`core_math`**: Iterations, Params A-F.
*   **`geometry`**: Julia, Hybrid (Box), Pre-Rotation.
*   **`lighting`**: Light studio, Shadows, Falloff. Includes `LightGizmo.tsx`, `LightPanel.tsx` (in `features/lighting/`).
*   **`materials`**: PBR Surface, Emission, Environment.
*   **`atmosphere`**: Fog, Volumetric Glow.
*   **`coloring`**: Gradients, Mapping modes, Texturing. Includes `MappingModes.ts` registry.
*   **`texturing`**: Image mapping, UV logic.
*   **`quality`**: Precision, Steps, Thresholds.
*   **`optics`**: FOV, Depth of Field, Projection type.
*   **`navigation`**: Fly speed settings.
*   **`audioMod`**: WebAudio analysis and linking. Includes `AudioAnalysisEngine.ts`, `AudioSpectrum.tsx`.
*   **`modulation`**: LFOs and signal routing. Includes `ModulationEngine.ts`.
*   **`drawing`**: On-screen measurement tools. Includes `DrawingOverlay.tsx`, `DrawingPanel.tsx`.
*   **`droste`**: Post-process spiral effects.
*   **`color_grading`**: Tone mapping levels.
*   **`webcam`**: Overlay logic. Includes `WebcamOverlay.tsx`.
*   **`debug_tools`**: Shader/State debuggers. Includes `DebugToolsOverlay.tsx`.
*   **`ao`**: Ambient Occlusion logic.
*   **`reflections`**: Raymarched reflections logic.
*   **`water_plane`**: Infinite ocean plane logic.
*   **`sonification`**: FHBT audio feedback from fractal data. Includes `SonificationEngine.ts`, `FHBTProbe.tsx`.
*   **`camera_manager`**: Camera position management and keyframing.
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
    *   `types.ts`: Animation type definitions.

## 5. Components (`components/`)
*   **Core**: `ViewportArea`, `Controls`, `Timeline`, `TopBar`, `MobileControls`, `App`.
*   **Primitives**: `Slider`, `Knob`, `ToggleSwitch`, `Button`, `Dropdown`.
*   **`inputs/`**: Unified scalar/vector input primitives.
    *   `ScalarInput.tsx`: Core draggable-number primitive (replaces inline `RawDraggableNumber` in `Slider.tsx`).
    *   `VectorInput.tsx`: Thin wrapper that delegates to `vector-input/` components.
    *   `types.ts`, `index.ts`: Shared types and barrel export.
    *   `primitives/`, `hooks/`: Internal sub-components and drag hooks.
*   **`vector-input/`**: Rich vector controls (replaces deleted `Vector2Pad.tsx` / `Vector3Input.tsx`).
    *   `BaseVectorInput.tsx`: Shared layout for both Vec2 and Vec3 modes.
    *   `VectorAxisCell.tsx`: Individual axis cell (label + draggable number + reset).
    *   `RotationHeliotrope.tsx`: Circular 3D-direction visualiser for rotation params.
    *   `DualAxisPad.tsx`: XY manipulation pad.
    *   `index.tsx`, `types.ts`: Public API and types.
*   **Pickers**: `SmallColorPicker`, `EmbeddedColorPicker`, `AdvancedGradientEditor`.
*   **Panels**: `FormulaPanel`, `ScenePanel`, `LightPanel`, `RenderPanel`, `QualityPanel`, `EnginePanel`.
*   **Visuals**: `MandelbulbScene`, `HudOverlay`, `CompilingIndicator`, `PerformanceMonitor`, `LoadingScreen`.
*   **Timeline**: `DopeSheet`, `GraphEditor`, `TimeNavigator`, `TimelineRuler`, `KeyframeInspector`, `TimelineToolbar`, `RenderPopup`, `KeyframeContextMenu`.
*   **Flow**: `FlowEditor`, `ShaderNode` (Modular Graph).
*   **Registry**: `ComponentRegistry` (Maps strings to React components for DDFS).
*   **Graph**: `GraphCanvas`, `GraphSidebar`, `GraphToolbar`.
*   **TopBar**: `SystemMenu`, `CameraTools`, `RenderTools`, `FpsCounter`, `CenterHUD`, `BucketRenderControls`.
*   **Viewport**: `FixedResolutionControls`.
*   **Layout**: `Dock`, `DropZones`.
*   **Gradient**: `GradientContextMenu`.
*   **Node Editor**: `NodeParams`.
*   **Other**: `AnimationSystem`, `DraggableWindow`, `FeatureSection`, `GlobalContextMenu`, `HelpBrowser`, `Histogram`, `HistogramProbe`, `Icons`, `InteractionPicker`, `KeyframeButton`, `ParameterSelector`, `PopupSliderSystem`, `ShaderDebugger`, `StateDebugger`.

## 6. Shaders (`shaders/`)
*   `chunks/`: Reusable GLSL snippets (Math, SDFs, Lighting, Raymarching).
    *   `main.ts`: Entry point.
    *   `de.ts`: Distance Estimator master loop.
    *   `trace.ts`: Raymarching loop.
    *   `pathtracer.ts`: Monte Carlo integrator.
    *   `math.ts`: Precision helpers, noise functions, fractal operations.
    *   `coloring.ts`: Color mapping logic.
    *   `material_eval.ts`: Material evaluation.
    *   `post_process.ts`: Post-processing effects.
    *   `post.ts`: Post shader utilities.
    *   `ray.ts`: Ray operations.
    *   `uniforms.ts`: Uniform definitions.
    *   `vertex.ts`: Vertex shader.
    *   `blue_noise.ts`: Blue noise functions.
    *   **`lighting/`**:
        *   `env.ts`: Environment mapping.
        *   `pbr.ts`: PBR lighting.
        *   `shading.ts`: Shading calculations.
        *   `shadows.ts`: Shadow computation.
        *   `volumetric_scatter.ts`: Henyey-Greenstein single-scatter GLSL body, injected into the march loop when `PT_VOLUMETRIC` is defined.

## 7. Utils (`utils/`)
*   `CameraUtils.ts`: Unified coordinate math.
*   `CurveFitting.ts`: Animation curve simplification.
*   `ConstrainedSmoothing.ts`: Smoothing algorithms.
*   `GraphCompiler.ts`: Modular graph to GLSL transpiler.
*   `GraphRenderer.ts`: Graph rendering utilities.
*   `GraphUtils.ts`: Graph utility functions.
*   `graphAlg.ts`: Graph algorithms.
*   `GraphAlgorithms.ts`: Additional graph algorithms.
*   `PresetLogic.ts`: State hydration/sanitization.
*   `Sharing.ts` / `UrlStateEncoder.ts`: URL compression.
*   `fileUtils.ts`: Filename generation.
*   `pngMetadata.ts`: Steganography (Data in PNG).
*   `histogramUtils.ts`: Auto-levels analysis.
*   `timelineUtils.ts`: Keyframe helpers.
*   `colorUtils.ts`: Color utilities.
*   `helpUtils.ts`: Help system utilities.
*   `FormulaFormat.ts`: GMF (GPU Mandelbulb Format) parser/generator.

## 8. Vite Build Configuration
**File:** `vite.config.ts`
- Manages build optimization and chunking
- Key Chunks:
  - `three`: Three.js library (3D rendering core)
  - `react`: React and React DOM
  - `three-drei`: React Three Fiber utilities
  - `three-fiber`: React Three Fiber core
  - `reactflow`: Graph visualization library
  - `mediabunny`: Media encoding library (video export)
  - `pako`: Compression library (URL encoding)

**Optimization Notes:**
- The `webm-muxer` dependency was removed as it was not actually used in the codebase
- Chunking strategy focuses on vendor libraries for better browser caching

## 8. Data (`data/`)
*   `constants.ts`: Application constants.
*   `BlueNoiseData.ts`: Blue noise texture data.
*   `gradientPresets.ts`: Gradient presets.
*   `initialPipelines.ts`: Initial pipeline configurations.
*   `modularPresets.ts`: Modular graph presets.
*   `nodes/definitions.ts`: Node definitions for modular graph.
*   **`help/`**:
    *   `registry.ts`: Help topic registry.
    *   **`topics/`**: Help topic files (audio, coloring, effects, formulas, etc.).
