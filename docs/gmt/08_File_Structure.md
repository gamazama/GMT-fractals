
# Project File Map
> Last updated: 2026-04-09 | GMT v0.9.1

## 1. Root Configuration
*   `index.html`: Application entry point. Sets up DOM and Tailwind.
*   `index.tsx`: React root. Mounts `App` and initializes registries.
*   `App.tsx`: Main Layout (Loading, TopBar, Viewport, Controls, Timeline).
*   `metadata.json`: Legacy stub — `requestFramePermissions` for the Claude.ai embed context. **Not** the active PWA manifest (that is generated at build time by `vite-plugin-pwa` as `dist/manifest.webmanifest`).
*   `types.ts`: Aggregates all type definitions.
*   `types/viewport.ts`: Viewport quality types — `SubsystemDefinition`, `ScalabilityPreset`, `ScalabilityState`, `HardwareProfile`. Contains subsystem definitions (tiers, overrides), master presets, and helper functions.
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
*   `codec/VideoExportTypes.ts`: Shared `VideoExportConfig` interface for export pipeline.
*   `codec/halton.ts`: Halton low-discrepancy sequence (TAA jitter, Monte Carlo sampling).
*   `BucketRenderer.ts`: Tiled high-res rendering logic.
*   `LoadingRenderer.ts`: Standalone raw WebGL renderer for the splash screen.
*   `LoadingRendererCPU.ts`: CPU-based fallback loading renderer.
*   `TickRegistry.ts`: Phase-based tick orchestrator (SNAPSHOT → ANIMATE → OVERLAY → UI).
*   `NodeRegistry.ts`: Database of Modular Graph nodes.
*   `BezierMath.ts`: Cubic Bezier curve solving for animation.
*   **`worker/`**: Web Worker rendering subsystem.
    *   `renderWorker.ts`: Worker entry point — boots FractalEngine on OffscreenCanvas.
    *   `WorkerProxy.ts`: Main-thread proxy for posting messages to the worker.
    *   `WorkerProtocol.ts`: Message type definitions and protocol constants.
    *   `WorkerExporter.ts`: Worker-side video export coordination.
    *   `ViewportRefs.ts`: Shared viewport dimension/canvas references.
*   `HardwareDetection.ts`: GPU capability probing — Float32 support, mobile detection, tier classification. Called once at boot from `useAppStartup`.
*   **`controllers/`**:
    *   `CameraController.ts`: Physics for Fly/Orbit movement.
    *   `PickingController.ts`: Handles depth-buffer reading for focus/interaction.
*   **`overlay/`**:
    *   `OverlayProjection.ts`: Shared 3D→2D projection for overlays (light gizmos, drawing tools).
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
*   **`fragmentarium_import/`**: Fragmentarium .frag file importer (AST-based)
    *   `FormulaWorkshop.tsx`: UI dialog for importing formulas; drives the full parse → map → transform pipeline.
    *   `index.ts`: Barrel export.
    *   `types.ts`: Shared type definitions.
    *   `TESTING_GUIDE.md`: Test suite documentation.
    *   `reference/`: Sample .frag files and expected GMF outputs for regression testing.
    *   **`parsers/`**: GLSL parsing subsystem.
        *   `ast-parser.ts`: AST-based parser via `@shaderfrog/glsl-parser`.
        *   `preprocessor.ts`: GLSL preprocessor (#define, #include handling).
        *   `dec-detector.ts`: DEC (Distance Estimated Coloring) pattern detection.
        *   `dec-preprocessor.ts`: DEC-specific preprocessing transforms.
        *   `uniform-parser.ts`: Uniform extraction from GLSL source.
        *   `builtins.ts`: Built-in GLSL function/type definitions.
    *   **`transform/`**: Code transformation pipeline.
        *   `code-generator.ts`: GLSL code generation from AST.
        *   `init-generator.ts`: Initialization code generation.
        *   `loop-extractor.ts`: Fractal iteration loop extraction.
        *   `pattern-detector.ts`: Formula pattern recognition.
        *   `variable-renamer.ts`: Safe variable renaming (avoids z.z→z_local.z_local bugs).
    *   **`workshop/`**: Formula workshop UI helpers.
        *   `detection.ts`: Formula type auto-detection.
        *   `param-builder.ts`: Parameter mapping builder.
        *   `preview.ts`: Live preview generation.
*   **`core_math`**: Iterations, Params A-F.
*   **`geometry/`**: Julia, Hybrid (Box), Pre-Rotation, and modular fold system.
    *   `index.ts`: Feature definition and fold registration.
    *   `types.ts`: Geometry type definitions.
    *   **`folds/`**: Modular fold implementations (tetra, standard, half, decoupled, mirror, octa, icosa, menger, kali).
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
*   **`reflections/`**: Raymarched reflections logic.
    *   `index.ts`: DDFS definition + all reflection evaluation GLSL (env map, raymarched modes).
    *   `shader.ts`: `traceReflectionRay()` — lightweight SDF marcher with hit refinement.
*   **`water_plane.ts`**: Infinite ocean plane logic.
*   **`volumetric/`**: Volumetric rendering effects (fog density, scatter).
    *   `index.ts`: DDFS definition, `panelConfig` for compilable section UI, volume tracing injection.
*   **`camera_manager`**: Camera position management — saved cameras with thumbnails, drag-to-reorder, duplicate, smooth transitions, Ctrl+1-9 shortcuts, export/import, composition overlays. Persists into presets/PNG snapshots.
*   **`engine`**: Master configuration profiles (legacy — superseded by viewport quality system).

## 4. State Management (`store/`)
*   `fractalStore.ts`: Main Zustand store.
*   `animationStore.ts`: Dedicated timeline store.
*   `createFeatureSlice.ts`: Generates state/actions from Feature definitions.
*   **`slices/`**:
    *   `rendererSlice.ts`: Resolution, Export flags.
    *   `cameraSlice.ts`: Position, Rotation, History.
    *   `uiSlice.ts`: Panel visibility, Layout.
    *   `historySlice.ts`: Parameter Undo/Redo stack.
    *   `scalabilitySlice.ts`: Viewport quality tiers, hardware profile. Writes tier overrides to store via feature setters; uses `bindGetShaderConfig()` pattern for circular dep with `fractalStore.ts`.
*   **`animation/`**:
    *   `playbackSlice.ts`: Play/Pause/Seek.
    *   `sequenceSlice.ts`: Track/Keyframe CRUD.
    *   `selectionSlice.ts`: Keyframe selection/manipulation.
    *   `types.ts`: Animation type definitions.

## 5. Components (`components/`)
*   **Core**: `ViewportArea`, `Controls`, `Timeline`, `TopBar`, `MobileControls`.
*   **Primitives**: `Slider`, `Knob`, `ToggleSwitch`, `Button`, `Dropdown`, `CollapsibleSection`, `PanelHeader`, `Popover`, `SectionLabel`, `StatusDot`, `TabBar`.
*   **`inputs/`**: Unified scalar/vector input primitives.
    *   `ScalarInput.tsx`: Core draggable-number primitive with fill bar and custom pointer-capture track (click-to-set, delta drag with Shift/Alt precision modifiers). Manages refs for direct DOM updates during drag (`fillBarRef`, `fullTrackFillRef`, `trackContainerRef`). Passes `onImmediateChange` to DraggableNumber.
    *   `VectorInput.tsx`: Thin wrapper that delegates to `vector-input/` components.
    *   `types.ts`, `index.ts`: Shared types and barrel export.
    *   `primitives/DraggableNumber.tsx`: Drag-to-adjust + click-to-edit number. Updates display text via direct DOM manipulation (`displayRef.textContent`) during drag for instant feedback.
    *   `primitives/FormatUtils.ts`: Value formatting, mapping (pi/degrees/log), and `computePercentage()` utility shared by ScalarInput and BaseVectorInput.
    *   `hooks/useDragValue.ts`: Core drag logic. Exposes `immediateValueRef` for synchronous value reads during drag.
*   **`vector-input/`**: Rich vector controls (replaces deleted `Vector2Pad.tsx` / `Vector3Input.tsx`).
    *   `BaseVectorInput.tsx`: Shared layout for Vec2, Vec3, and Vec4 modes. Uses `pushAxisToDOM()` for direct DOM updates when drag source is DualAxisPad, rotation heliotrope, or linked mode (queries axis cells by `data-axis-index` attribute).
    *   `VectorAxisCell.tsx`: Individual axis cell (label + draggable number + reset). Exposes `data-axis-index` attribute for parent DOM queries.
    *   `RotationHeliotrope.tsx`: Circular 3D-direction visualiser for rotation params.
    *   `DualAxisPad.tsx`: XY/WZ manipulation pad.
    *   `index.tsx`, `types.ts`: Public API and types.
*   **Pickers**: `SmallColorPicker`, `EmbeddedColorPicker`, `AdvancedGradientEditor`.
*   **Panels**: `FormulaPanel`, `ScenePanel`, `LightPanel`, `RenderPanel`, `QualityPanel`, `EnginePanel`, `HardwarePreferences` (modal for hardware caps — precision, buffer format, loop cap).
*   **Visuals**: `HudOverlay`, `CompilingIndicator`, `PerformanceMonitor`, `LoadingScreen`.
*   **Worker**: `WorkerDisplay`, `WorkerTickScene`, `StandaloneTickLoop`.
*   **Timeline**: `DopeSheet`, `GraphEditor`, `TimeNavigator`, `TimelineRuler`, `KeyframeInspector`, `TimelineToolbar`, `RenderPopup`, `KeyframeContextMenu`.
*   **Flow**: `FlowEditor`, `ShaderNode` (Modular Graph).
*   **Registry**: `ComponentRegistry` (Maps strings to React components for DDFS).
*   **Graph**: `GraphCanvas`, `GraphSidebar`, `GraphToolbar`.
*   **TopBar**: `SystemMenu` (hamburger — file I/O, feature toggles, hardware/workshop/advanced settings), `HelpMenu` (? button — help browser, tutorials, hints, donate, about), `CameraTools`, `RenderTools`, `FpsCounter`, `CenterHUD`, `BucketRenderControls`, `ViewportQuality` (viewport quality dropdown with subsystem tiers, PT controls, and batched apply).
*   **Viewport**: `FixedResolutionControls`.
*   **Layout**: `Dock`, `DropZones`.
*   **Gradient**: `GradientContextMenu`.
*   **Node Editor**: `NodeParams`.
*   **Tutorial**: `tutorial/HintDisplay.tsx` (fade-transition contextual hint display with help link).
*   **Other**: `AnimationSystem`, `CategoryPickerMenu`, `DraggableWindow`, `FeatureSection`, `GlobalContextMenu`, `HelpBrowser`, `Histogram`, `HistogramProbe`, `Icons`, `Icons2` (supplemental icons — `HelpMenuIcon`, `BookIcon`), `InteractionPicker`, `KeyframeButton`, `ParameterSelector`, `PopupSliderSystem`, `ShaderDebugger`, `StateDebugger`.

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
        *   `shared.ts`: Shared lighting utilities and constants.

## 7. Utils (`utils/`)
*   `CameraUtils.ts`: Unified coordinate math.
*   `CurveFitting.ts`: Animation curve simplification.
*   `ConstrainedSmoothing.ts`: Smoothing algorithms.
*   `GraphCompiler.ts`: Modular graph to GLSL transpiler.
*   `GraphRenderer.ts`: Graph rendering utilities.
*   `GraphUtils.ts`: Graph utility functions.
*   `graphAlg.ts`: Graph algorithms (cycle detection, topological sort).
*   `keyframeViewBounds.ts`: Keyframe dope sheet view bounds calculation.
*   `Sharing.ts` / `UrlStateEncoder.ts`: URL compression.
*   `fileUtils.ts`: Filename generation.
*   `pngMetadata.ts`: PNG iTXt chunk injection/extraction for embedding scene data in snapshots.
*   `histogramUtils.ts`: Auto-levels analysis.
*   `timelineUtils.ts`: Keyframe helpers.
*   `colorUtils.ts`: Color utilities.
*   `helpUtils.ts`: Help system utilities.
*   `FormulaFormat.ts`: GMF (GPU Mandelbulb Format) — primary save format. Contains `saveGMFScene()` (save), `loadGMFScene()` (load with format detection), `generateGMF()` / `parseGMF()` (formula-level), `isGMFFormat()` (format detection). See `docs/05_Data_and_Export.md` for full format spec.
*   `PresetLogic.ts`: State hydration/sanitization — `applyPresetState()` applies a Preset to the store (camera, features, lights, animations).

## 8. Vite Build Configuration
**File:** `vite.config.ts`
- Manages build optimization, chunking, and PWA generation
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

### PWA (`vite-plugin-pwa`)

GMT ships as a Progressive Web App via `vite-plugin-pwa` (Workbox). The manifest and service worker are generated at build time.

**Key settings:**
- `registerType: 'prompt'` — new SW waits for user approval before activating. Prevents silent stale-cache breakage on shader/formula deploys. The update prompt surfaces as an amber "Update available — reload" button at the top of the System Menu (`components/topbar/SystemMenu.tsx`).
- `devOptions: { enabled: false }` — SW is disabled in dev mode to avoid conflicts with the Express middleware server.
- `base: './'` — all asset paths are relative, making the build safe for both root and subdirectory deployments (e.g. GitHub Pages).

**Precache manifest (~9MB, 269 entries):**

| Pattern | Contents |
|---------|----------|
| `**/*.{js,css,html}` | All Vite-built and hashed assets |
| `blueNoise.png` | Engine noise texture |
| `formulas/**/*.{frag,json}` | 178 formula shaders + manifest/dec index |
| `thumbnails/**/*.jpg` | Formula picker thumbnails |
| `gmf/**/*.{gmf,json}` | Preset gallery scenes |

**Runtime cache:**
- CDN assets (`cdn.tailwindcss.com`, `cdn.jsdelivr.net`) — `NetworkFirst` with 7-day expiry. These are cached after the first online page load and served from cache when offline.

**Icons:** `public/icon-192.png` and `public/icon-512.png`. Replace with purpose-built exports from your icon source if adding maskable icon support.

**Screenshots:** `public/screenshots/desktop.png` (900×600). Replace with an actual app screenshot for the Richer Install UI in Chrome/Edge. Mobile screenshot omitted — landscape-only layout makes a portrait screenshot impractical.

**Browser support:**
- Chrome/Edge: full install prompt, standalone window, update flow ✓
- Safari macOS Sonoma+: installable via Share → Add to Dock; no address-bar prompt
- Firefox: no install support; SW caching still active

## 9. Mesh Export Tool (`public/mesh-export/`)
Standalone HTML + ES2020 tool for exporting fractal geometry as meshes/VDB. No React — runs independently.
*   `index.html`: Entry point.
*   `gpu-pipeline.js`: GPU SDF sampling, voxel grid generation.
*   `sdf-eval.js`: SDF evaluation utilities.
*   `dc-core.js`: Dual contouring mesh extraction.
*   `mesh-postprocess.js`: Newton projection, vertex welding, smoothing.
*   `mesh-writers.js`: OBJ/STL/VDB export writers (including `Vec3VDBTree` for color grids).
*   `mesh-preview.js`: WebGL wireframe preview renderer.
*   `preview-camera.js`: Orbit/pan camera for preview canvas.
*   `formula-system.js`: Formula shader integration (mirrors main app's `ShaderFactory` for SDF context).
*   `pipeline.js`: End-to-end pipeline orchestrator.

See [30_Mesh_Export_Prototype.md](30_Mesh_Export_Prototype.md) for architecture details.

## 10. Prototypes (`prototype/`)
Experimental work not integrated into the main app.
*   **`restir-gi/`**: WIP ReSTIR GI global illumination prototype.
*   **`deep-zoom/`**: Deep zoom precision experiments.

## 11. Data (`data/`)
*   `constants.ts`: Application constants.
*   `BlueNoiseData.ts`: Blue noise texture data.
*   `gradientPresets.ts`: Gradient presets.
*   `initialPipelines.ts`: Initial pipeline configurations.
*   `modularPresets.ts`: Modular graph presets.
*   `nodes/definitions.ts`: Node definitions for modular graph.
*   **`help/`**:
    *   `registry.ts`: Help topic registry.
    *   **`topics/`**: Help topic files (audio, coloring, effects, formulas, etc.).
