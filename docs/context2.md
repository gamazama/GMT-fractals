
# Context: Current State & Architecture

**Current Status:** DDFS Migration Complete. All core features migrated to Data-Driven Feature System.

---

## 1. DDFS Status: 🟢 Complete

The Data-Driven Feature System has successfully replaced the hardcoded `mathSlice` and `visualSlice` logic for all shader parameters.

### 1.1 Architecture Verification
*   **UI:** `FormulaPanel.tsx` uses `AutoFeaturePanel` to render Geometry controls, significantly reducing code duplication.
*   **Shader:** Uniforms are auto-generated. Manual uniform strings have been removed from feature definitions to prevent redefinition errors.
*   **Persistence:** `fractalStore.ts` -> `getPreset` now dynamically iterates the registry to save state, ensuring future-proof saves.

### 1.2 The Lighting Exception
Lights are now handled by the `LightingFeature` DDFS module (`features/lighting`).
*   **Reasoning:** Lights require spatial manipulation (Gizmos), drag-and-drop placement, and array management (add/remove lights). DDFS manages the parameter configs, but a custom component handles the complex interactions.

---

## 2. Active Features

All features are registered in `features/index.ts`:

### Core
*   `CoreMathFeature` - Iterations, Params A-F
*   `GeometryFeature` - Julia, Hybrid (Box), Pre-Rotation

### Rendering & Shading
*   `LightingFeature` - Light studio, Shadows, Falloff
*   `AOFeature` - Ambient Occlusion
*   `ReflectionsFeature` - Raymarched reflections
*   `AtmosphereFeature` - Fog, Volumetric Glow
*   `MaterialFeature` - PBR Surface, Emission, Environment
*   `WaterPlaneFeature` - Infinite ocean plane
*   `ColoringFeature` - Gradients, Mapping modes
*   `TexturingFeature` - Image mapping, UV logic
*   `QualityFeature` - Precision, Steps, Thresholds

### Post & Effects
*   `DrosteFeature` - Post-process spiral effects
*   `ColorGradingFeature` - Tone mapping levels

### Scene
*   `OpticsFeature` - FOV, Depth of Field, Projection
*   `NavigationFeature` - Fly speed settings
*   `CameraManagerFeature` - Camera position management

### Systems
*   `AudioFeature` - WebAudio analysis and linking
*   `SonificationFeature` - FHBT audio feedback from fractal data
*   `DrawingFeature` - On-screen measurement tools
*   `ModulationFeature` - LFOs and signal routing
*   `WebcamFeature` - Overlay logic
*   `DebugToolsFeature` - Shader/State debuggers
*   `EngineSettingsFeature` - Master configuration profiles (Lite/Balanced/Ultra)

---

## 3. Code Health Notes

### Completed
*   **visualSlice Removal:** Deleted. Lighting managed by `lighting` feature.
*   **Lite Render Unification:** Logic moved into `QualityFeature` state.
*   **Subscription Cleanup:** Manual `subscribe` calls replaced by DDFS auto-detection.
*   **Shader Builder:** `ShaderBuilder.ts` implemented with feature `inject()` contract.
*   **Legacy Properties:** `shader` and `shaderGenerator` properties still exist in `FeatureSystem.ts` (marked deprecated).

### Minor Issues
*   **Mobile UI:** Some auto-generated panels are cramped on vertical screens.
*   **Typing:** Animation Engine binders use `any` casting for dynamic DDFS paths.

### Optimization Opportunities
*   **Shader permutation:** Could optimize `ShaderFactory` to exclude unused feature chunks when features are disabled.
